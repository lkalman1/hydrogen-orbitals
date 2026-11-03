// The laboratory used by Chapters 2 and 3: tunable lasers, microwaves, the energy
// ladder, the spectrum, and node surfaces.
//
// Laser modes:
//   "two" (Ch 2): two counter-propagating photons (the Doppler-free way the real 1S–2S
//     measurement is done). 2 × photon energy = gap from 1s to an ns level.
//   "one" (Ch 3): a single photon. Its energy must match a gap from 1s, and because a
//     photon carries one unit of angular momentum it always lands in an np state.
// Microwaves (Ch 3): at n = 3 the shapes s, p, d have (in this model) the same energy;
//   a low-energy photon steps l up by one, until l = n − 1 and there is nowhere to go.
//
// Absorption is a coherent transition; excited states decay by random quantum jumps
// with the true branching ratios, emitting photons that are added to the spectrum.

import * as THREE from "three";
import { twoPhotonNm, lineNm, pickDecay, decays, describeNm, wavelengthRGB, rgbCss, nmFromEV, levelEV } from "../spectroscopy.js";
import { L_LETTERS } from "../physics.js";
import { nodeSet } from "../nodes.js";
import { RadiusMarker } from "../scene/markers.js";
import { NodeSurfaces } from "../scene/nodes.js";
import { EnergyLadder } from "./ladder.js";
import { Spectrum } from "./spectrum.js";

export const LEVELS = [2, 3, 4, 5, 6, 7];  // upper levels reachable from 1s
export const TOLERANCE_NM = 0.25;          // counts as on resonance (the real lines are far narrower!)
const SNAP_NM = 0.8;                       // releasing the slider this close snaps onto the line

export const MODES = {
  two: {
    l: 0, beams: 2, min: 185, max: 300, start: 270,
    nmOf: twoPhotonNm,
    title: "Tunable UV laser", sub: "two beams, from both sides",
  },
  one: {
    l: 1, beams: 1, min: 90, max: 130, start: 112,
    nmOf: (n) => lineNm(1, n),
    title: "Vacuum-UV laser", sub: "one photon at a time",
  },
};

const MICROWAVE_RGB = [0.95, 0.55, 0.45];
const ORIGIN = new THREE.Vector3();
const $ = (id) => document.getElementById(id);
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

/** The level a laser of wavelength nm would excite in a mode (within tol), or null. */
export function resonantLevel(nm, mode = "two", tol = TOLERANCE_NM) {
  const { nmOf } = MODES[mode];
  let best = null, bestD = Infinity;
  for (const n of LEVELS) {
    const d = Math.abs(nm - nmOf(n));
    if (d < bestD) { bestD = d; best = n; }
  }
  return { n: bestD <= tol ? best : null, nearest: best, distance: bestD };
}

const formatTime = (s) => (s >= 1e-3 ? `${(s * 1e3).toFixed(0)} ms` : s >= 1e-6 ? `${(s * 1e6).toFixed(1)} µs` : `${(s * 1e9).toFixed(1)} ns`);
const nameOf = ({ n, l }) => `${n}${L_LETTERS[l]}`;

export class Lab {
  constructor({ stage, audio, transitions }) {
    this.stage = stage;
    this.audio = audio;
    this.transitions = transitions;
    this.ladder = new EnergyLadder();
    this.spectrum = new Spectrum();
    this.nodes = new NodeSurfaces(stage.scene);
    this.nodeMarker = new RadiusMarker(stage.scene, { radius: 2, label: "node at 2 a₀: never found here" });
    this.sizeMarker = new RadiusMarker(stage.scene, { radius: 1.5, label: "average size of level 1" });
    this.atom = { n: 1, l: 0, m: 0 };
    this.mode = "two";
    this.busy = false;
    this.autoCascade = false;
    this.showingNodes = false;
    this.hum = null;
    this.rho = 0;
    this.listeners = new Set();
    this.token = 0; // bumps on reset so stale async work stops

    this.panel = $("laser");
    this.slider = $("laser-nm");
    this.fireBtn = $("fire-btn");
    this.releaseBtn = $("release-btn");
    this.mwBtn = $("microwave-btn");
    this.aimPanel = $("aim");
    this.counter = $("node-counter");
    this.#bind();
    stage.onFrame((now, dt) => this.#update(now, dt));
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  #emit(e) { for (const fn of this.listeners) fn(e); }

  get nm() { return +this.slider.value; }
  set nm(v) { this.slider.value = String(v); this.#tuned(); }

  // ------------------------------------------------------------ setup

  /** Put the atom in a state instantly (for entering a beat). */
  reset(state = { n: 1, l: 0, m: 0 }) {
    this.token++;
    this.busy = false;
    const { cloud } = this.stage;
    cloud.showAll();
    cloud.setState(state.n, state.l, state.m, { mode: "instant" });
    cloud.fadeTo(1, 0.3);
    this.stage.superposition.setFade(0);
    this.stage.frameCloud(0.95);
    this.#setAtom(state, { instant: true });
  }

  #setAtom(state, { instant = false } = {}) {
    this.atom = { ...state };
    this.ladder.setState(state, { instant });
    this.#lifetime();
    if (this.showingNodes) this.#updateNodes();
  }

  enableLaser({ mode = "two", start, autoCascade = false } = {}) {
    this.autoCascade = autoCascade;
    const def = MODES[mode];
    const modeChanged = mode !== this.mode;
    this.mode = mode;
    this.slider.min = def.min; this.slider.max = def.max;
    $("laser-title").textContent = def.title;
    $("laser-sub").textContent = def.sub;
    if (this.panel.hidden || modeChanged) {
      this.panel.hidden = false;
      this.panel.classList.remove("on"); void this.panel.offsetWidth; this.panel.classList.add("on");
      this.nm = start ?? def.start;
    } else if (start !== undefined) {
      this.nm = start;
    }
    this.#startHum();
    this.stage.photons.setBeam({ nm: this.nm, on: true });
  }

  disableLaser() {
    this.panel.hidden = true;
    this.hum?.stop(); this.hum = null;
    this.stage.photons.setBeam({ on: false });
    this.ladder.highlight(null);
  }

  showRelease(on) { this.releaseBtn.hidden = !on; }
  showMicrowave(on) { this.mwBtn.hidden = !on; }

  /** Node surfaces and the node counter. */
  showNodes(on) {
    this.showingNodes = on;
    this.nodes.show(on);
    this.counter.hidden = !on;
    if (on) this.#updateNodes();
  }

  #updateNodes() {
    const { n, l, m } = this.atom;
    this.nodes.set(n, l, m, this.stage.cloud.radius(0.95));
    const { radial, angular } = nodeSet(n, l, m);
    const chips = $("node-chips");
    chips.replaceChildren();
    for (let i = 0; i < radial; i++) chips.append(Object.assign(document.createElement("span"), { className: "chip-node radial", title: "radial node: a sphere" }));
    for (let i = 0; i < angular; i++) chips.append(Object.assign(document.createElement("span"), { className: "chip-node angular", title: "angular node: a plane or cone" }));
    $("node-title").textContent = `${nameOf(this.atom)}: ${n - 1} node${n - 1 === 1 ? "" : "s"} in all (n − 1)`;
    $("node-text").textContent = `${radial} sphere${radial === 1 ? "" : "s"} (radial) + ${angular} plane${angular === 1 ? "" : "s"}/cone${angular === 1 ? "" : "s"} (angular, = l)`;
    this.counter.classList.remove("bump"); void this.counter.offsetWidth; this.counter.classList.add("bump");
  }

  /** Start of a beat that uses the lab: clear the per-beat extras (laser, ladder and spectrum persist). */
  beforeBeat() {
    this.showNodes(false);
    this.showAim(false);
    this.showMicrowave(false);
    this.showRelease(false);
    this.nodeMarker.show(false);
    this.sizeMarker.show(false);
  }

  /** Leave the lab: hide everything. */
  release() {
    this.token++;
    this.busy = false;
    this.disableLaser();
    this.showRelease(false);
    this.showMicrowave(false);
    this.showAim(false);
    this.showNodes(false);
    this.ladder.hide();
    this.spectrum.hide();
    this.nodeMarker.show(false);
    this.sizeMarker.show(false);
    $("ladder-foot").textContent = "";
  }

  #startHum() {
    if (this.hum || !this.audio.ready) return;
    this.hum = this.audio.loop("laser-hum");
    this.hum?.set({ nm: this.nm, rho: this.rho });
  }

  // ------------------------------------------------------------ tuning

  #tuned() {
    const nm = this.nm;
    const { nearest, distance } = resonantLevel(nm, this.mode);
    this.rho = 1 / (1 + (distance / 0.6) ** 2);
    const color = rgbCss(wavelengthRGB(nm));
    $("laser-readout").textContent = `${nm.toFixed(2)} nm`;
    $("laser-region").textContent = describeNm(nm).split(" · ")[1] + (nm < 380 ? " (invisible to us)" : "");
    $("laser-swatch").style.background = color;
    this.panel.style.setProperty("--laser", color);
    this.ladder.root.style.setProperty("--laser", color);
    $("laser-meter").style.transform = `scaleX(${this.rho.toFixed(3)})`;
    this.panel.classList.toggle("resonant", distance <= TOLERANCE_NM);
    this.ladder.highlight(nearest, this.rho);
    this.hum?.set({ nm, rho: this.rho });
    this.stage.photons.setBeam({ nm, on: !this.panel.hidden });
  }

  /** Set the laser exactly onto level n's line in the current mode and fire (accessible fallback). */
  autoTune(n) {
    this.nm = MODES[this.mode].nmOf(n);
    this.audio.sfx("snap", { bus: "ui" });
    return this.fire();
  }

  // ------------------------------------------------------------ firing

  async fire() {
    if (this.busy) return;
    if (this.atom.n !== 1) { this.#shake(this.panel); return; }
    const token = this.token;
    this.busy = true;
    const nm = this.nm, mode = MODES[this.mode];
    const { n } = resonantLevel(nm, this.mode);
    const { photons } = this.stage;
    photons.pulseBeam();
    this.audio.sfx("photon-fire", { nm });
    const left = () => photons.offscreen(Math.PI), right = () => photons.offscreen(0);
    const beams = mode.beams === 2 ? [left, right] : [left];

    if (!n) {
      beams.forEach((from, i) => photons.spawn({ nm, from, to: ORIGIN, duration: 0.8, passThrough: true, label: i === 0 }));
      setTimeout(() => this.audio.sfx("photon-miss"), 500);
      this.#emit({ type: "miss", nm });
      await sleep(0.5);
      if (token === this.token) this.busy = false;
      return;
    }

    const to = { n, l: mode.l, m: 0 };
    const prep = this.transitions.prepare(this.atom, to);
    await Promise.all(beams.map((from, i) => photons.spawn({ nm, from, to: ORIGIN, duration: 0.8, label: i === 0 })));
    if (token !== this.token) return;
    photons.flash(nm, 1.3);
    this.stage.proton.kick(0.7);
    this.audio.sfx("absorb", { n });
    if (mode.beams === 2) this.ladder.absorbTwo(1, n, nm); else this.ladder.absorbOne(1, n, nm);
    this.#emit({ type: "absorbing", n, l: mode.l });
    const beatHz = Math.max(0.6, 0.28 * (levelEV(n) - levelEV(1)));
    const beat = this.audio.loop("beat", { fromN: 1, toN: n, seconds: 2.6, beatHz });
    await this.transitions.run(prep, { coherent: true, duration: 2.6, beatHz });
    beat?.stop();
    if (token !== this.token) return;
    this.#setAtom(to);
    this.audio.sfx("shape", { l: to.l });
    this.busy = false;
    this.#emit({ type: "absorbed", n, l: to.l });
    if (this.autoCascade) { await sleep(1.2); if (token === this.token) await this.cascade(); }
  }

  /** Fire a single photon tuned to the 1s → level-n energy (used by the "aim" game). */
  fireAt(n) {
    this.mode = "one";
    this.slider.min = MODES.one.min; this.slider.max = MODES.one.max;
    this.nm = MODES.one.nmOf(n);
    return this.fire();
  }

  /**
   * A microwave photon: steps l up by one within the same n (Δl = +1), or passes
   * straight through when l is already n − 1.
   */
  async microwave() {
    if (this.busy) return;
    const token = this.token;
    const { photons } = this.stage;
    const from = () => photons.offscreen(Math.PI);
    const look = { nm: 1e8, color: MICROWAVE_RGB, text: "microwave photon · a few GHz", duration: 1.2 };
    this.audio.sfx("microwave");
    if (this.atom.l >= this.atom.n - 1) {
      this.busy = true;
      photons.spawn({ ...look, from, to: ORIGIN, passThrough: true });
      setTimeout(() => this.audio.sfx("photon-miss"), 900);
      this.#shake(this.counter);
      this.#emit({ type: "mw-pass", atom: this.atom });
      await sleep(1.2);
      if (token === this.token) this.busy = false;
      return;
    }
    this.busy = true;
    const to = { n: this.atom.n, l: this.atom.l + 1, m: 0 };
    const prep = this.transitions.prepare(this.atom, to);
    await photons.spawn({ ...look, from, to: ORIGIN });
    if (token !== this.token) return;
    photons.flash(1e8, 0.9);
    this.stage.proton.kick(0.4);
    // same energy in this model, so no beat: the shape simply morphs as amplitude moves over
    await this.transitions.run(prep, { coherent: true, duration: 2.2, beatHz: 0 });
    if (token !== this.token) return;
    this.#setAtom(to);
    this.audio.sfx("shape", { l: to.l });
    this.busy = false;
    this.#emit({ type: "mw-absorbed", atom: to });
  }

  /** Send microwave photons until l reaches `target` (accessible fallback). */
  async microwaveTo(target) {
    const token = this.token;
    for (let i = 0; i < 8 && this.atom.l < target && token === this.token; i++) {
      if (this.busy) await sleep(0.3);
      else await this.microwave();
    }
  }

  #shake(el) {
    el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake");
    this.audio.sfx("ui-tick", { bus: "ui" });
  }

  // ------------------------------------------------------------ the "aim" game (Ch 3)

  /** Show three targets; each fires one photon at that level's energy and reports where it landed. */
  showAim(on, { keep = false } = {}) {
    this.aimPanel.hidden = !on;
    this.stage.photons.setBeam({ nm: MODES.one.nmOf(2), on });
    if (!on || keep) return;
    this.aimPanel.classList.remove("on"); void this.aimPanel.offsetWidth; this.aimPanel.classList.add("on");
    for (const row of this.aimPanel.querySelectorAll(".aim-row")) {
      row.classList.remove("done");
      row.querySelector(".aim-result").textContent = "";
    }
  }

  /** Try every target not yet tried, one after another (accessible fallback). */
  async aimAll() {
    for (const row of this.aimPanel.querySelectorAll(".aim-row:not(.done)")) {
      const token = this.token;
      await new Promise((resolve) => {
        const off = this.on((e) => { if (e.type === "ground") { off(); resolve(); } });
        this.#aim(row);
      });
      if (token !== this.token) return;
    }
  }

  async #aim(row) {
    if (this.busy || this.atom.n !== 1) { this.#shake(this.aimPanel); return; }
    const n = +row.dataset.n, l = +row.dataset.l;
    const off = this.on((e) => {
      if (e.type !== "absorbed") return;
      off();
      const dl = e.l - 0;
      const hit = e.l === l;
      row.classList.add("done");
      row.classList.toggle("hit", hit);
      row.querySelector(".aim-result").textContent = hit
        ? `landed in ${e.n}${L_LETTERS[e.l]} ✓ (Δl = +${dl})`
        : `landed in ${e.n}${L_LETTERS[e.l]} instead (Δl = +${dl})`;
      this.#emit({ type: "aim", target: { n, l }, landed: { n: e.n, l: e.l } });
      setTimeout(() => this.cascade(), 1400);
    });
    await this.fireAt(n);
  }

  // ------------------------------------------------------------ decay

  /** Let the atom fall back to 1s by random quantum jumps. */
  async cascade() {
    const token = this.token;
    this.busy = true;
    while (this.atom.n !== 1) {
      const ch = pickDecay(this.atom.n, this.atom.l);
      if (!ch) break;
      // waiting time: random (exponential), slowed to a watchable ~1 s on average
      await sleep(Math.min(2, Math.max(0.35, -Math.log(1 - Math.random()) * 0.9)));
      if (token !== this.token) return;
      await this.#jump(ch);
      if (token !== this.token) return;
    }
    this.busy = false;
    this.#emit({ type: "ground" });
  }

  async #jump(ch) {
    const from = this.atom, to = { n: ch.n, l: ch.l, m: 0 };
    const prep = this.transitions.prepare(from, to);
    const { photons } = this.stage;
    const angle = Math.random() * Math.PI * 2;
    if (ch.twoPhoton) {
      // 2s → 1s: two photons sharing 10.2 eV between them (a continuous spectrum)
      const total = levelEV(from.n) - levelEV(to.n), f = 0.25 + 0.5 * Math.random();
      photons.spawn({ nm: nmFromEV(f * total), from: ORIGIN, to: () => photons.offscreen(angle, 0.8), duration: 1.1, dim: true, label: false });
      photons.spawn({ nm: nmFromEV((1 - f) * total), from: ORIGIN, to: () => photons.offscreen(angle + Math.PI, 0.8), duration: 1.1, dim: true, label: false });
      this.ladder.emit(from.n, to.n, null, { twoPhoton: true });
      this.audio.sfx("jump");
    } else {
      photons.spawn({ nm: ch.nm, from: ORIGIN, to: () => photons.offscreen(angle, 0.8), duration: 1.1 });
      photons.flash(ch.nm, 0.8);
      this.spectrum.add(ch.nm);
      this.ladder.emit(from.n, to.n, ch.nm);
      this.audio.sfx("emit", { nm: ch.nm });
    }
    await this.transitions.run(prep, { coherent: false, duration: 0.45 });
    this.#setAtom(to);
    this.#emit({ type: "decayed", from, to, nm: ch.nm });
  }

  #lifetime() {
    const { n, l } = this.atom;
    $("ladder-foot").textContent = n === 1
      ? "1s: the ground state. It lasts forever."
      : `${n}${L_LETTERS[l]}: lasts ${formatTime(decays(n, l).lifetime)} on average (slowed down here)`;
  }

  // ------------------------------------------------------------ input + frame

  #bind() {
    this.slider.addEventListener("input", () => this.#tuned());
    this.slider.addEventListener("change", () => {
      const { nearest, distance } = resonantLevel(this.nm, this.mode);
      if (distance < SNAP_NM && distance > 1e-3) {
        this.nm = MODES[this.mode].nmOf(nearest);
        this.audio.sfx("snap", { bus: "ui" });
        this.panel.classList.remove("snapped"); void this.panel.offsetWidth; this.panel.classList.add("snapped");
      }
    });
    for (const [id, step] of [["laser-down", -0.05], ["laser-up", 0.05]]) {
      $(id).addEventListener("click", () => {
        const { min, max } = MODES[this.mode];
        this.nm = Math.min(max, Math.max(min, this.nm + step));
        this.slider.dispatchEvent(new Event("change"));
      });
    }
    this.fireBtn.addEventListener("click", () => this.fire());
    this.releaseBtn.addEventListener("click", () => { this.showRelease(false); this.cascade(); });
    this.mwBtn.addEventListener("click", () => this.microwave());
    for (const row of this.aimPanel.querySelectorAll(".aim-row")) {
      row.querySelector("button").addEventListener("click", () => this.#aim(row));
    }
  }

  #update(now, dt) {
    this.ladder.update(dt);
    this.spectrum.update(dt);
    this.nodes.update(now, dt);
    this.nodeMarker.update(dt, this.stage.camera, this.stage.rig.dist);
    this.sizeMarker.update(dt, this.stage.camera, this.stage.rig.dist);
    // near resonance the cloud shivers
    if (!this.panel.hidden && !this.busy && this.rho > 0.05) {
      this.stage.cloud.uniforms.uPulse.value = Math.max(this.stage.cloud.uniforms.uPulse.value, 0.18 * this.rho * (0.5 + 0.5 * Math.sin(now * 38)));
    }
  }
}
