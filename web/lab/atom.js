// The lab's atom: its state, the magnetic field, and what light does to it.
//
// States are m-basis { n, l, m } (m ≠ 0 swirls about z) or { ionized: true }.
// Photon geometry follows the physics: twisted (circularly polarized) light travels
// along the field axis z; untwisted light comes from the side, polarized along z.
// Two photons arrive from opposite sides (the Doppler-free arrangement).

import * as THREE from "three";
import { absorb, decay, stateEV, B_MAX_T } from "../rules.js";
import { nmFromEV, describeNm } from "../spectroscopy.js";
import { energyEV } from "../physics.js";

const ORIGIN = new THREE.Vector3();
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
export const GROUND = { n: 1, l: 0, m: 0 };
const asCloud = (s) => ({ ...s, complex: s.m !== 0 });

export class Atom {
  constructor({ stage, audio, transitions, spectrum }) {
    this.stage = stage;
    this.audio = audio;
    this.transitions = transitions;
    this.spectrum = spectrum;
    this.state = { ...GROUND };
    this.B = 0;
    this.busy = false;
    this.token = 0;
    this.listeners = new Set();
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  #emit(e) { for (const fn of this.listeners) fn({ ...e, state: this.state, B: this.B }); }

  get ionized() { return !!this.state.ionized; }

  /** Jump straight to a state. rain: the cloud builds up from quick measurements. */
  set(state, { rain = true } = {}) {
    this.token++;
    this.busy = false;
    this.state = { ...state };
    const { cloud } = this.stage;
    this.stage.superposition.setFade(0);
    if (state.ionized) { cloud.fadeTo(0, 0.6); this.#emit({ type: "state" }); return; }
    cloud.showAll();
    cloud.setState(state.n, state.l, state.m, { mode: "instant", complex: state.m !== 0 });
    cloud.fadeTo(1, 0.3);
    if (rain) { cloud.hideAll(); cloud.revealRest(1.1); }
    this.stage.frameCloud(0.95);
    this.#emit({ type: "state" });
  }

  /** final: the slider was released (worth narrating). */
  setField(B, final = true) {
    this.B = Math.max(0, Math.min(B_MAX_T, B));
    this.stage.field.set(this.B / B_MAX_T);
    this.#emit({ type: "field", final });
  }

  /** Energy of the current state (eV), including the field. */
  get energy() { return this.state.ionized ? 0 : stateEV(this.state, this.B); }

  // ------------------------------------------------------------ light

  /**
   * Fire light: { count: 1 | 2, twist (1 photon: −1/0/+1, 2 photons: net 0/±2), eV per photon }.
   * Resolves with the outcome (see rules.absorb).
   */
  async fire(light) {
    if (this.busy) return null;
    const token = ++this.token;
    this.busy = true;
    const from = this.state;
    const fromEnergy = this.energy;
    const result = absorb(from, light, { B: this.B });
    this.stage.cloud.showAll(); // a half-measured cloud is completed before it changes
    const { photons } = this.stage;
    const nm = nmFromEV(light.eV);
    const text = `${light.eV.toFixed(2)} eV · ${describeNm(nm)}`;
    // geometry: twisted light along z; plain light from the side
    const along = light.twist !== 0;
    const sources = light.count === 2
      ? (along ? [() => photons.alongZ(-1), () => photons.alongZ(1)] : [() => photons.offscreen(Math.PI), () => photons.offscreen(0)])
      : [along ? () => photons.alongZ(-1) : () => photons.offscreen(Math.PI)];
    // each photon's twist about z; for two photons, net 0 means opposite twists
    const each = light.count === 2 ? (light.twist === 0 ? [1, -1] : [Math.sign(light.twist), Math.sign(light.twist)]) : [light.twist];
    photons.pulseBeam();
    this.audio.sfx("photon-fire", { nm });

    if (result.type === "miss" || result.type === "blocked") {
      sources.forEach((src, i) => photons.spawn({ nm, from: src, to: ORIGIN, duration: 0.8, passThrough: true, label: i === 0, text, twist: each[i] }));
      setTimeout(() => this.audio.sfx("photon-miss"), 500);
      await sleep(0.6);
      if (token === this.token) this.busy = false;
      this.#emit({ type: result.type, light, result, from });
      return result;
    }

    const prep = result.type === "absorb" ? this.transitions.prepare(asCloud(from), asCloud(result.to)) : null;
    await Promise.all(sources.map((src, i) => photons.spawn({ nm, from: src, to: ORIGIN, duration: 0.8, label: i === 0, text, twist: each[i] })));
    if (token !== this.token) return null;
    photons.flash(nm, 1.3);
    this.stage.proton.kick(0.7);

    if (result.type === "ionize") {
      this.audio.sfx("absorb", { n: 7 });
      this.audio.sfx("ui-whoosh");
      // the electron flies off: the cloud swells and fades away
      const { cloud } = this.stage;
      cloud.setState(Math.min(7, from.n + 3), 0, 0, { duration: 1.4 });
      cloud.fadeTo(0, 1.4);
      this.state = { ionized: true };
      await sleep(1.4);
      if (token === this.token) this.busy = false;
      this.#emit({ type: "ionize", light, result, from, fromEnergy });
      return result;
    }

    this.audio.sfx("absorb", { n: result.to.n });
    const beatHz = Math.max(0.6, 0.28 * Math.abs(energyEV(result.to.n) - energyEV(from.n)));
    const beat = this.audio.loop("beat", { fromN: from.n, toN: result.to.n, seconds: 2.6, beatHz });
    this.#emit({ type: "absorbing", light, result, from });
    await this.transitions.run(prep, { coherent: true, duration: 2.6, beatHz });
    beat?.stop();
    if (token !== this.token) return null;
    this.state = { ...result.to };
    this.audio.sfx("shape", { l: result.to.l });
    this.busy = false;
    this.#emit({ type: "absorb", light, result, from });
    return result;
  }

  // ------------------------------------------------------------ decay

  /** Let the atom fall back to 1s by random quantum jumps, emitting light. */
  async letGo() {
    if (this.busy || this.state.ionized || this.state.n === 1) return;
    const token = ++this.token;
    this.busy = true;
    this.stage.cloud.showAll();
    this.#emit({ type: "letgo" });
    while (this.state.n !== 1) {
      await sleep(Math.min(1.8, Math.max(0.4, -Math.log(1 - Math.random()) * 0.8)));
      if (token !== this.token) return;
      const d = decay(this.state, { B: this.B });
      if (!d) break;
      await this.#emitPhoton(d, token);
      if (token !== this.token) return;
    }
    this.busy = false;
    this.#emit({ type: "ground" });
  }

  async #emitPhoton(d, token) {
    const from = this.state;
    const prep = this.transitions.prepare(asCloud(from), asCloud(d.to));
    const { photons } = this.stage;
    if (d.twoPhoton) {
      const f = 0.25 + 0.5 * Math.random(), angle = Math.random() * Math.PI * 2;
      photons.spawn({ nm: nmFromEV(f * d.eV), from: ORIGIN, to: () => photons.offscreen(angle, 0.8), duration: 1.1, dim: true, label: false });
      photons.spawn({ nm: nmFromEV((1 - f) * d.eV), from: ORIGIN, to: () => photons.offscreen(angle + Math.PI, 0.8), duration: 1.1, dim: true, label: false });
      this.audio.sfx("jump");
    } else {
      // a twisted photon leaves along the axis; an untwisted one sideways
      const to = d.twist ? () => photons.alongZ(Math.random() < 0.5 ? 1 : -1, 0.8) : () => photons.offscreen(Math.random() < 0.5 ? 0 : Math.PI, 0.8);
      photons.spawn({ nm: d.nm, from: ORIGIN, to, duration: 1.1, twist: d.twist, text: `${d.eV.toFixed(2)} eV · ${describeNm(d.nm)}` });
      photons.flash(d.nm, 0.8);
      this.spectrum?.add(d.nm);
      this.audio.sfx("emit", { nm: d.nm });
    }
    await this.transitions.run(prep, { coherent: false, duration: 0.45 });
    if (token !== this.token) return;
    this.state = { ...d.to };
    this.#emit({ type: "emit", decay: d, from });
  }

  /** After ionization: an electron is captured again and the cloud condenses into 1s. */
  recapture() {
    if (!this.state.ionized || this.busy) return;
    this.token++;
    const { cloud } = this.stage;
    this.state = { ...GROUND };
    cloud.showAll();
    cloud.setState(1, 0, 0, { mode: "condense" });
    cloud.fadeTo(1, 1.2);
    this.stage.frameCloud(0.95);
    this.audio.sfx("condense", { seconds: 3.2 });
    this.#emit({ type: "recapture" });
  }
}

