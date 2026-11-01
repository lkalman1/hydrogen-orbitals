// Audio engine (Web Audio API).
//
//   master ── compressor ── speakers
//     ├── music bus  (duckable)   ┐
//     ├── sfx bus                 ├── each also sends to a shared reverb
//     └── ui bus                  ┘
//
// Music is adaptive: a cue is a stack of layers that all start together on a bar
// line and are faded in and out individually. Changing cue crossfades at the next
// bar; stingers land on the next bar. A layer is either a synth function (the
// placeholders in cues.js) or { url } of a composed loop, so final stems drop in
// without code changes.

/** Time of the first bar line at least `lead` seconds after `now`. */
export function nextBarTime(origin, barSeconds, now, lead = 0.05) {
  const bars = Math.ceil((now + lead - origin) / barSeconds);
  return origin + Math.max(0, bars) * barSeconds;
}

const STORAGE_KEY = "hydrogen-audio-muted";
const dbToGain = (db) => 10 ** (db / 20);

function readMuted() {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
}
function writeMuted(m) {
  try { localStorage.setItem(STORAGE_KEY, m ? "1" : "0"); } catch { /* storage unavailable */ }
}

function impulseResponse(ctx, seconds = 3.2, decay = 3) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
  }
  return buf;
}

export class AudioEngine {
  constructor(cues, { tempo = 72, beatsPerBar = 4 } = {}) {
    this.cues = cues;
    this.barSeconds = (60 / tempo) * beatsPerBar;
    this.beatSeconds = 60 / tempo;
    this.ctx = null;
    this.muted = readMuted();
    this.music = null;      // { id, layers: [{ gain, stop }], active }
    this.pending = null;    // music requested before unlock
    this.buffers = new Map();
    this.listeners = new Set();
  }

  get ready() { return !!this.ctx; }

  /** Must be called from a user gesture (browsers block audio until then). */
  unlock() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = this.ctx = new Ctx();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(comp).connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = impulseResponse(ctx);
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.5;
    this.reverb.connect(reverbReturn).connect(this.master);

    const bus = (level, send) => {
      const g = ctx.createGain();
      g.gain.value = level;
      g.connect(this.master);
      const s = ctx.createGain();
      s.gain.value = send;
      g.connect(s).connect(this.reverb);
      return g;
    };
    this.duckNode = ctx.createGain();
    this.musicBus = bus(0.8, 0.45);
    this.duckNode.connect(this.musicBus);
    this.sfxBus = bus(0.9, 0.3);
    this.uiBus = bus(0.5, 0.1);
    this.origin = ctx.currentTime + 0.1; // bar grid origin
    if (ctx.state === "suspended") ctx.resume();
    if (this.pending) {
      const { id, layers } = this.pending;
      this.pending = null;
      this.playMusic(id, { layers });
    }
  }

  setMuted(muted) {
    this.muted = muted;
    writeMuted(muted);
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.08);
    for (const fn of this.listeners) fn(muted);
  }
  onMuteChange(fn) { this.listeners.add(fn); }

  nextBar(lead = 0.05) { return nextBarTime(this.origin, this.barSeconds, this.ctx.currentTime, lead); }

  #conductor() {
    return { barSeconds: this.barSeconds, beatSeconds: this.beatSeconds, origin: this.origin };
  }

  async #buffer(url) {
    if (!this.buffers.has(url)) {
      this.buffers.set(url, fetch(url).then((r) => r.arrayBuffer()).then((b) => this.ctx.decodeAudioData(b)));
    }
    return this.buffers.get(url);
  }

  #startLayer(layer, out, at) {
    if (typeof layer === "function") return layer(this.ctx, out, at, this.#conductor());
    // composed loop: { url, loopBars }
    const src = this.ctx.createBufferSource();
    src.loop = true;
    this.#buffer(layer.url).then((buf) => { src.buffer = buf; src.connect(out); src.start(at); }).catch(() => {});
    return { stop: (t) => { try { src.stop(t); } catch { /* not started */ } } };
  }

  /**
   * Play music cue `id` with its first `layers` layers audible. Same cue: just
   * re-balance layers. New cue: crossfade at the next bar line.
   */
  playMusic(id, { layers = 1, fade = 2.5 } = {}) {
    if (!this.ctx) { this.pending = { id, layers }; return; }
    if (this.music?.id === id) { this.setLayers(layers, fade); return; }
    const cue = this.cues.music[id];
    if (!cue) return;
    const ctx = this.ctx;
    const at = this.music ? this.nextBar(0.1) : ctx.currentTime + 0.05;
    this.stopMusic(fade, at);
    const music = { id, active: 0, layers: [] };
    for (const layer of cue.layers) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(this.duckNode);
      music.layers.push({ gain, voice: this.#startLayer(layer, gain, at) });
    }
    this.music = music;
    this.setLayers(layers, fade, at);
  }

  /** Fade layers [0, count) in and the rest out. */
  setLayers(count, fade = 2.5, at = this.ctx?.currentTime ?? 0) {
    if (!this.music) return;
    this.music.active = count;
    this.music.layers.forEach(({ gain }, i) => {
      gain.gain.cancelScheduledValues(at);
      gain.gain.setTargetAtTime(i < count ? 1 : 0, at, fade / 3);
    });
  }

  stopMusic(fade = 2.5, at = this.ctx?.currentTime ?? 0) {
    if (!this.music || !this.ctx) return;
    for (const { gain, voice } of this.music.layers) {
      gain.gain.cancelScheduledValues(at);
      gain.gain.setTargetAtTime(0, at, fade / 3);
      voice?.stop(at + fade * 2);
    }
    this.music = null;
  }

  /** One-shot sound effect. bus: "sfx" | "ui". */
  sfx(id, opts = {}) {
    if (!this.ctx) return;
    const fn = this.cues.sfx[id];
    if (!fn) return;
    const out = opts.bus === "ui" ? this.uiBus : this.sfxBus;
    fn(this.ctx, out, this.ctx.currentTime + (opts.delay ?? 0), opts);
  }

  /** Stinger on the next bar line, with the music ducked under it. */
  stinger(id, { duck = -6, seconds = 3 } = {}) {
    if (!this.ctx) return;
    const fn = this.cues.stingers[id];
    if (!fn) return;
    const at = this.nextBar(0.15);
    fn(this.ctx, this.sfxBus, at, this.#conductor());
    this.duck(duck, seconds, at);
  }

  /** Lower the music by `db` for `seconds`, starting at `at`. */
  duck(db = -4, seconds = 1.5, at = this.ctx?.currentTime ?? 0) {
    if (!this.ctx) return;
    const g = this.duckNode.gain;
    g.cancelScheduledValues(at);
    g.setTargetAtTime(dbToGain(db), at, 0.08);
    g.setTargetAtTime(1, at + seconds, 0.6);
  }
}
