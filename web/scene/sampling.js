// Promise-based client for sample-worker.js, with a main-thread fallback when
// workers are unavailable.

import { buildTables, makeRanks, sampleState } from "../sampler.js";
import { buildMixture } from "../mixture.js";

export class Sampling {
  constructor() {
    this.pending = new Map();
    this.nextId = 1;
    try {
      this.worker = new Worker(new URL("../sample-worker.js", import.meta.url), { type: "module" });
      this.worker.onmessage = ({ data }) => {
        const job = this.pending.get(data.id);
        if (!job) return;
        this.pending.delete(data.id);
        data.error ? job.reject(new Error(data.error)) : job.resolve(data.result);
      };
      this.worker.onerror = () => { this.worker = null; this.#flushToMainThread(); };
    } catch {
      this.worker = null;
    }
  }

  #run(msg) {
    if (msg.kind === "state") return sampleState(buildTables(msg.n, msg.l, msg.m, { complex: msg.complex }), makeRanks(msg.count, msg.seed));
    return buildMixture(msg.a, msg.b, msg.count, msg.seed);
  }

  #flushToMainThread() {
    for (const [id, job] of this.pending) {
      this.pending.delete(id);
      try { job.resolve(this.#run(job.msg)); } catch (e) { job.reject(e); }
    }
  }

  request(msg) {
    if (!this.worker) return Promise.resolve().then(() => this.#run(msg));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, msg });
      this.worker.postMessage({ ...msg, id });
    });
  }

  /** Exact samples of state (n, l, m) for `count` particles with the cloud's ranks. */
  state(n, l, m, count, seed = 1, complex = false) { return this.request({ kind: "state", n, l, m, count, seed, complex }); }

  /** Importance-sampled particles for a transition a → b. */
  mixture(a, b, count, seed = 5) { return this.request({ kind: "mixture", a, b, count, seed }); }
}
