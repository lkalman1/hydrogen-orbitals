// Cue sheet with placeholder sounds. IDs match the cue sheet in TRACKER.md.
//
// Every placeholder is synthesized from the "Balmer chord": the visible hydrogen
// lines' frequencies relative to Hα (Hβ/Hα = 1.350, Hγ/Hα = 1.512, Hδ/Hα = 1.600).
// To drop in a composed stem, replace a layer function with { url: "audio/xyz.ogg" }.

export const TEMPO = 72;
export const BEATS_PER_BAR = 4;
export const BALMER = [1, 1.35, 1.512, 1.6];
const ROOT = 110; // A2: the theme's Hα

// ------------------------------------------------------------ building blocks

function voiceEnv(ctx, out, t, { attack = 2, level = 1 } = {}) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + attack);
  g.connect(out);
  return g;
}

/** Stops a set of oscillators/intervals after a fade. */
function voice(oscs, timers = []) {
  return {
    stop(t) {
      for (const o of oscs) { try { o.stop(t); } catch { /* already stopped */ } }
      for (const id of timers) clearInterval(id);
    },
  };
}

function lfo(ctx, rate, depth, target, t) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.value = rate; g.gain.value = depth;
  o.connect(g).connect(target);
  o.start(t);
  return o;
}

/** A bell-like FM tone. */
function bell(ctx, out, t, freq, { dur = 2.5, level = 0.15, ratio = 3.5, index = 2.2 } = {}) {
  const car = ctx.createOscillator(), mod = ctx.createOscillator(), modGain = ctx.createGain(), env = ctx.createGain();
  car.frequency.value = freq;
  mod.frequency.value = freq * ratio;
  modGain.gain.setValueAtTime(freq * index, t);
  modGain.gain.exponentialRampToValueAtTime(freq * 0.05, t + dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(level, t + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  mod.connect(modGain).connect(car.frequency);
  car.connect(env).connect(out);
  car.start(t); mod.start(t);
  car.stop(t + dur + 0.1); mod.stop(t + dur + 0.1);
}

function noiseBuffer(ctx, seconds = 2) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

let CLICK = null;
function clickBuffer(ctx) {
  if (CLICK?.sampleRate === ctx.sampleRate) return CLICK;
  CLICK = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.006), ctx.sampleRate);
  const d = CLICK.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  return CLICK;
}

/** Nearest pitch to f among the Balmer-chord notes in every octave. */
export function snapToChord(f) {
  let best = ROOT, bestDist = Infinity;
  for (let oct = -2; oct <= 5; oct++) {
    for (const r of BALMER) {
      const cand = ROOT * r * 2 ** oct;
      const d = Math.abs(Math.log2(cand / f));
      if (d < bestDist) { bestDist = d; best = cand; }
    }
  }
  return best;
}

// ------------------------------------------------------------ music layers

/** Deep drone on the root. */
const drone = (root) => (ctx, out, t) => {
  const g = voiceEnv(ctx, out, t, { attack: 4, level: 0.16 });
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 400;
  lp.connect(g);
  const oscs = [root / 2, root].map((f, i) => {
    const o = ctx.createOscillator();
    o.type = i ? "triangle" : "sine";
    o.frequency.value = f;
    o.connect(lp); o.start(t);
    return o;
  });
  oscs.push(lfo(ctx, 0.07, 3, oscs[1].frequency, t));
  return voice(oscs);
};

/** Slow pad on the Balmer chord: detuned saws through a breathing low-pass. */
const pad = (root, level = 0.035) => (ctx, out, t) => {
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 900; lp.Q.value = 0.7;
  const g = voiceEnv(ctx, out, t, { attack: 5, level });
  lp.connect(g);
  const oscs = [lfo(ctx, 0.05, 500, lp.frequency, t)];
  for (const r of BALMER) {
    for (const cents of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = root * 2 * r;
      o.detune.value = cents;
      o.connect(lp); o.start(t);
      oscs.push(o);
    }
  }
  return voice(oscs);
};

/** High, glassy partials with slow tremolo. */
const shimmer = (root) => (ctx, out, t) => {
  const oscs = [];
  BALMER.forEach((r, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = root * 8 * r;
    g.gain.value = 0.006;
    oscs.push(lfo(ctx, 0.11 + i * 0.07, 0.006, g.gain, t));
    o.connect(g).connect(voiceEnv(ctx, out, t, { attack: 6 }));
    o.start(t);
    oscs.push(o);
  });
  return voice(oscs);
};

/** Soft plucks on every beat, walking up the Balmer chord. Scheduled ahead in small windows. */
const pulse = (root) => (ctx, out, t, { beatSeconds }) => {
  let next = t, step = 0;
  const schedule = () => {
    while (next < ctx.currentTime + 0.4) {
      const r = BALMER[step % 4] * (step % 8 < 4 ? 2 : 4);
      bell(ctx, out, next, root * r, { dur: 1.6, level: 0.05, ratio: 2, index: 0.8 });
      next += beatSeconds;
      step++;
    }
  };
  schedule();
  return voice([], [setInterval(schedule, 100)]);
};

const theme = (root) => [drone(root), pad(root), shimmer(root), pulse(root)];

// ------------------------------------------------------------ cue sheet

export const CUES = {
  music: {
    "MUS-00": { layers: theme(ROOT) },                  // cold open
    "MUS-01": { layers: theme(ROOT) },                  // Ch 1 (placeholder)
    "MUS-02": { layers: theme(ROOT * BALMER[1] / 2) },  // Ch 2 (placeholder)
    "MUS-03": { layers: theme(ROOT * BALMER[2] / 2) },  // Ch 3 (placeholder)
    "MUS-04": { layers: theme(ROOT * BALMER[3] / 2) },  // Ch 4 (placeholder)
    "MUS-05": { layers: theme(ROOT) },                  // finale (placeholder)
    "MUS-SBX": { layers: [drone(ROOT), pad(ROOT, 0.02)] },
  },
  stingers: {
    // title: the Balmer chord rung as an arpeggio of bells
    "STG-title": (ctx, out, t, { beatSeconds }) => {
      BALMER.forEach((r, i) => bell(ctx, out, t + i * beatSeconds / 4, ROOT * 4 * r, { dur: 4, level: 0.12 }));
      bell(ctx, out, t, ROOT, { dur: 5, level: 0.15, ratio: 1.5, index: 1 });
    },
    "STG-chapter": (ctx, out, t, { beatSeconds }) => {
      [0, 2].forEach((i, k) => bell(ctx, out, t + k * beatSeconds / 2, ROOT * 4 * BALMER[i], { dur: 2.5, level: 0.1 }));
    },
  },
  sfx: {
    "ui-tick": (ctx, out, t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(1800, t);
      o.frequency.exponentialRampToValueAtTime(1200, t + 0.04);
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.connect(g).connect(out);
      o.start(t); o.stop(t + 0.06);
    },
    "ui-whoosh": (ctx, out, t) => {
      const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noiseBuffer(ctx, 0.6);
      bp.type = "bandpass"; bp.Q.value = 1.5;
      bp.frequency.setValueAtTime(400, t);
      bp.frequency.exponentialRampToValueAtTime(2400, t + 0.45);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      src.connect(bp).connect(g).connect(out);
      src.start(t);
    },
    "begin": (ctx, out, t) => {
      BALMER.forEach((r, i) => bell(ctx, out, t + i * 0.06, ROOT * 2 * r, { dur: 3, level: 0.06, ratio: 2, index: 1 }));
    },
    // proton appears: low swell into a single warm bell
    "proton-appear": (ctx, out, t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(ROOT / 2, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.9);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
      o.connect(g).connect(out);
      o.start(t); o.stop(t + 3.1);
      bell(ctx, out, t + 0.85, ROOT * 4, { dur: 3.5, level: 0.14 });
    },
    // proton clicked / tapped
    "proton-tap": (ctx, out, t) => bell(ctx, out, t, ROOT * 8 * BALMER[2], { dur: 1.2, level: 0.08 }),
    // cloud condenses: a rising filtered-noise swirl that resolves on the chord
    "condense": (ctx, out, t, { seconds = 3.2 } = {}) => {
      const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noiseBuffer(ctx, seconds + 0.5);
      bp.type = "bandpass"; bp.Q.value = 4;
      bp.frequency.setValueAtTime(3000, t);
      bp.frequency.exponentialRampToValueAtTime(300, t + seconds);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.14, t + seconds * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + seconds + 0.4);
      src.connect(bp).connect(g).connect(out);
      src.start(t);
      BALMER.forEach((r) => bell(ctx, out, t + seconds * 0.85, ROOT * 2 * r, { dur: 4, level: 0.05, ratio: 1.01, index: 0.3 }));
    },
    // one measurement: a tick plus a short tone whose pitch falls with distance r,
    // snapped to the Balmer chord so rapid clicking stays in harmony with the score
    "measure": (ctx, out, t, { r = 1, level = 1 } = {}) => {
      const f = snapToChord(1760 * 2 ** -r);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09 * level, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(out);
      o.start(t); o.stop(t + 0.2);
      const src = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), ng = ctx.createGain();
      src.buffer = clickBuffer(ctx);
      hp.type = "highpass"; hp.frequency.value = 3000;
      ng.gain.value = 0.25 * level;
      src.connect(hp).connect(ng).connect(out);
      src.start(t);
    },
    // the full cloud appears: a soft swell into the chord
    "reveal-swell": (ctx, out, t, { seconds = 1.6 } = {}) => {
      BALMER.forEach((r, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = ROOT * 4 * r;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.035, t + seconds);
        g.gain.exponentialRampToValueAtTime(0.0001, t + seconds + 3);
        o.connect(g).connect(out);
        o.start(t + i * 0.05); o.stop(t + seconds + 3.1);
      });
      bell(ctx, out, t + seconds, ROOT * 8, { dur: 4, level: 0.08 });
    },
    // a word or caption appears: barely-there tick
    "caption": (ctx, out, t) => bell(ctx, out, t, ROOT * 16, { dur: 0.4, level: 0.012, ratio: 2, index: 0.5 }),
  },
};
