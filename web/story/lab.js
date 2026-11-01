// Chapter 2's laboratory: a tunable UV laser, the energy ladder and the spectrum.
//
// Firing sends two counter-propagating photons at the atom (the Doppler-free way the
// real 1S–2S measurement is done). If 2 × photon energy matches the gap from 1s to an
// ns level (within a forgiving tolerance), the atom absorbs both and makes a coherent
// transition; otherwise the photons pass straight through. Excited states decay by
// random quantum jumps chosen with the true branching ratios, emitting photons whose
// wavelengths are added to the spectrum.

import * as THREE from "three";
import { twoPhotonNm, pickDecay, decays, describeNm, wavelengthRGB, rgbCss, nmFromEV, levelEV } from "../spectroscopy.js";
import { L_LETTERS } from "../physics.js";
import { RadiusMarker } from "../scene/markers.js";
import { EnergyLadder } from "./ladder.js";
import { Spectrum } from "./spectrum.js";

export const LEVELS = [2, 3, 4, 5, 6, 7];  // ns levels reachable by two photons from 1s
export const TOLERANCE_NM = 0.25;          // counts as on resonance (the real line is ~10⁻¹⁵ narrower!)
const SNAP_NM = 0.8;                       // releasing the slider this close snaps onto the line
const ORIGIN = new THREE.Vector3();
const $ = (id) => document.getElementById(id);
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

/** The ns level a laser of wavelength nm would excite (within tol), or null. */
export function resonantLevel(nm, tol = TOLERANCE_NM) {
  let best = null, bestD = Infinity;
  for (const n of LEVELS) {
    const d = Math.abs(nm - twoPhotonNm(n));
    if (d < bestD) { bestD = d; best = n; }
  }
  return { n: bestD <= tol ? best : null, nearest: best, distance: bestD };
}

const formatTime = (s) => (s >= 1e-3 ? `${(s * 1e3).toFixed(0)} ms` : s >= 1e-6 ? `${(s * 1e6).toFixed(1)} µs` : `${(s * 1e9).toFixed(1)} ns`);

export class Lab {
  constructor({ stage, audio, transitions }) {
    this.stage = stage;
    this.audio = audio;
    this.transitions = transitions;
    this.ladder = new EnergyLadder();
    this.spectrum = new Spectrum();
    this.nodeMarker = new RadiusMarker(stage.scene, { radius: 2, label: "node at 2 a₀: never found here" });
    this.sizeMarker = new RadiusMarker(stage.scene, { radius: 1.5, label: "average size of level 1" });
    this.atom = { n: 1, l: 0, m: 0 };
    this.busy = false;
    this.autoCascade = false;
    this.hum = null;
    this.rho = 0;
    this.listeners = new Set();
    this.token = 0; // bumps on reset so stale async work stops

    this.panel = $("laser");
    this.slider = $("laser-nm");
    this.fireBtn = $("fire-btn");
    this.releaseBtn = $("release-btn");
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
    this.atom = { ...state };
    const { cloud } = this.stage;
    cloud.showAll();
    cloud.setState(state.n, state.l, state.m, { mode: "instant" });
    cloud.fadeTo(1, 0.3);
    this.stage.superposition.setFade(0);
    this.stage.frameCloud(0.95);
    this.ladder.setState(state, { instant: true });
    this.#lifetime();
  }

  enableLaser({ start = 270, autoCascade = false } = {}) {
    this.autoCascade = autoCascade;
    if (this.panel.hidden) {
      this.panel.hidden = false;
      this.panel.classList.remove("on"); void this.panel.offsetWidth; this.panel.classList.add("on");
      this.nm = start;
    }
    this.fireBtn.hidden = false;
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

  /** Leave the lab: hide everything. */
  release() {
    this.token++;
    this.busy = false;
    this.disableLaser();
    this.showRelease(false);
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
    const { nearest, distance } = resonantLevel(nm);
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

  /** Set the laser exactly onto level n's two-photon line and fire (accessible fallback). */
  autoTune(n) {
    this.nm = twoPhotonNm(n);
    this.audio.sfx("snap", { bus: "ui" });
    return this.fire();
  }

  // ------------------------------------------------------------ firing

  async fire() {
    if (this.busy) return;
    if (this.atom.n !== 1) { this.#shake(); return; }
    const token = this.token;
    this.busy = true;
    const nm = this.nm;
    const { n } = resonantLevel(nm);
    const { photons } = this.stage;
    photons.pulseBeam();
    this.audio.sfx("photon-fire", { nm });
    const left = () => photons.offscreen(Math.PI), right = () => photons.offscreen(0);

    if (!n) {
      photons.spawn({ nm, from: left, to: ORIGIN, duration: 0.8, passThrough: true });
      photons.spawn({ nm, from: right, to: ORIGIN, duration: 0.8, passThrough: true, label: false });
      setTimeout(() => this.audio.sfx("photon-miss"), 500);
      this.#emit({ type: "miss", nm });
      await sleep(0.5);
      if (token === this.token) this.busy = false;
      return;
    }

    const to = { n, l: 0, m: 0 };
    const prep = this.transitions.prepare(this.atom, to);
    await Promise.all([
      photons.spawn({ nm, from: left, to: ORIGIN, duration: 0.8 }),
      photons.spawn({ nm, from: right, to: ORIGIN, duration: 0.8, label: false }),
    ]);
    if (token !== this.token) return;
    photons.flash(nm, 1.3);
    this.stage.proton.kick(0.7);
    this.audio.sfx("absorb", { n });
    this.ladder.absorbTwo(1, n, nm);
    this.#emit({ type: "absorbing", n });
    const beat = this.audio.loop("beat", { fromN: 1, toN: n, seconds: 2.6, beatHz: Math.max(0.6, 0.28 * (levelEV(n) - levelEV(1))) });
    await this.transitions.run(prep, { coherent: true, duration: 2.6 });
    beat?.stop();
    if (token !== this.token) return;
    this.atom = to;
    this.ladder.setState(to);
    this.#lifetime();
    this.busy = false;
    this.#emit({ type: "absorbed", n });
    if (this.autoCascade) { await sleep(1.2); if (token === this.token) await this.cascade(); }
  }

  #shake() {
    this.panel.classList.remove("shake"); void this.panel.offsetWidth; this.panel.classList.add("shake");
    this.audio.sfx("ui-tick", { bus: "ui" });
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
    this.atom = to;
    this.ladder.setState(to);
    this.#lifetime();
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
      const { nearest, distance } = resonantLevel(this.nm);
      if (distance < SNAP_NM && distance > 1e-3) {
        this.nm = twoPhotonNm(nearest);
        this.audio.sfx("snap", { bus: "ui" });
        this.panel.classList.remove("snapped"); void this.panel.offsetWidth; this.panel.classList.add("snapped");
      }
    });
    for (const [id, step] of [["laser-down", -0.05], ["laser-up", 0.05]]) {
      $(id).addEventListener("click", () => { this.nm = Math.min(300, Math.max(185, this.nm + step)); this.slider.dispatchEvent(new Event("change")); });
    }
    this.fireBtn.addEventListener("click", () => this.fire());
    this.releaseBtn.addEventListener("click", () => { this.showRelease(false); this.cascade(); });
  }

  #update(now, dt) {
    this.ladder.update(dt);
    this.spectrum.update(dt);
    this.nodeMarker.update(dt, this.stage.camera, this.stage.rig.dist);
    this.sizeMarker.update(dt, this.stage.camera, this.stage.rig.dist);
    // near resonance the cloud shivers
    if (!this.panel.hidden && !this.busy && this.rho > 0.05) {
      this.stage.cloud.uniforms.uPulse.value = Math.max(this.stage.cloud.uniforms.uPulse.value, 0.18 * this.rho * (0.5 + 0.5 * Math.sin(now * 38)));
    }
  }
}
