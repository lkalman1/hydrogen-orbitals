// Background worker: the heavy sampling, off the main thread so animations never hitch.
//   { kind: "state", n, l, m, count, seed }      → { sph, sign }   (as sampler.sampleState)
//   { kind: "mixture", a, b, count, seed }       → { pos, psiA, psiB, q, size } (mixture.js)

import { buildTables, makeRanks, sampleState } from "./sampler.js";
import { buildMixture } from "./mixture.js";

self.onmessage = ({ data }) => {
  const { id, kind } = data;
  try {
    let result;
    if (kind === "state") {
      result = sampleState(buildTables(data.n, data.l, data.m, { complex: data.complex }), makeRanks(data.count, data.seed));
    } else if (kind === "mixture") {
      result = buildMixture(data.a, data.b, data.count, data.seed);
    } else {
      throw new Error(`unknown request ${kind}`);
    }
    const transfer = Object.values(result).map((arr) => arr.buffer);
    self.postMessage({ id, result }, transfer);
  } catch (err) {
    self.postMessage({ id, error: String(err?.message ?? err) });
  }
};
