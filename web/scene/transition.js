// Physically honest transitions between states, shared by every chapter.
//
//   coherent (driven by a laser): a real superposition whose amplitude moves from a
//     to b (a Rabi half-cycle) while the density beats at the energy difference,
//     slowed down ~10¹⁵ times so it can be seen.
//   incoherent (spontaneous emission): a quantum jump. The ensemble is a statistical
//     mixture with no beat, and the switch is quick.
//
// Heavy sampling runs in the worker; at the end the main cloud takes over with exact
// samples of the final state, so nothing hitches.

import { buildTables } from "../sampler.js";
import { energyEV } from "../physics.js";

const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

export class Transitions {
  constructor(stage, sampling) {
    this.stage = stage;
    this.sampling = sampling;
    this.active = null;
    stage.onFrame((now) => this.#update(now));
  }

  /** Start sampling for a → b now; await the result later with run(). */
  prepare(a, b) {
    const count = this.stage.cloud.count;
    return {
      a, b,
      mixture: this.sampling.mixture(a, b, count),
      final: this.sampling.state(b.n, b.l, b.m, count, 1, !!b.complex),
      rA: buildTables(a.n, a.l, a.m).radiusQuantile(0.95),
      rB: buildTables(b.n, b.l, b.m).radiusQuantile(0.95),
    };
  }

  /**
   * Run a prepared transition. Resolves when the main cloud shows b.
   * Options: coherent, duration (s), beatHz (visible beat rate), onProgress(s²).
   */
  async run(prep, { coherent = true, duration = 2.4, beatHz, onProgress } = {}) {
    const { stage } = this;
    const [mix, final] = await Promise.all([prep.mixture, prep.final]);
    const sup = stage.superposition;
    sup.load(mix, { realA: !(prep.a.complex && prep.a.m), realB: !(prep.b.complex && prep.b.m) });
    sup.set(1, 0);
    const dE = Math.abs(energyEV(prep.b.n) - energyEV(prep.a.n));
    const t0 = performance.now() / 1000;
    this.active = {
      prep, coherent, duration, t0, onProgress,
      beatHz: beatHz ?? Math.max(0.6, 0.28 * dE), // bigger energy gaps beat faster
    };
    stage.cloud.fadeTo(0, 0.2);
    stage.frameRadius(prep.rA);
    await sleep(duration);
    // hand over to exact samples of b
    stage.cloud.setState(prep.b.n, prep.b.l, prep.b.m, { mode: "instant", sample: final, complex: !!prep.b.complex });
    stage.cloud.fadeTo(1, 0.3);
    this.active.ending = performance.now() / 1000;
    await sleep(0.3);
    this.active = null;
    sup.setFade(0);
    stage.frameCloud(0.95);
  }

  #update(now) {
    const job = this.active;
    if (!job) return;
    const { stage } = this;
    const sup = stage.superposition;
    const t = Math.min(1, (now - job.t0) / job.duration);
    const theta = (Math.PI / 2) * easeInOutSine(t);
    const c = Math.cos(theta), s = Math.sin(theta);
    sup.set(c, s, 2 * Math.PI * job.beatHz * (now - job.t0), job.coherent ? 1 : 0);
    const fadeIn = Math.min(1, (now - job.t0) / 0.2);
    const fadeOut = job.ending ? Math.max(0, 1 - (now - job.ending) / 0.3) : 1;
    sup.setFade(fadeIn * fadeOut);
    sup.uniforms.uFlash.value = job.coherent ? 0 : Math.max(0, 1 - Math.abs(t - 0.5) * 4);
    sup.uniforms.uAlpha.value = stage.cloud.uniforms.uAlpha.value;
    stage.frameRadius(c * c * job.prep.rA + s * s * job.prep.rB);
    job.onProgress?.(s * s);
  }

  get busy() { return !!this.active; }
}
