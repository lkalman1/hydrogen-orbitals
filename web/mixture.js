// Drawing a time-dependent superposition with particles, exactly.
//
// During a transition between states a and b the electron is in
//   Ψ(t) = c·ψa·e^(−iEa·t) + s·ψb·e^(−iEb·t),   c² + s² = 1,
// so the density is
//   |Ψ|² = c²ψa² + s²ψb² + 2cs·ψa·ψb·cos(ΔE·t)        (real orbitals).
//
// Resampling every frame would be expensive, so we use importance weights instead:
// half the particles are exact samples of |ψa|², half of |ψb|², i.e. samples of
//   q = ½ψa² + ½ψb²,
// and each particle is drawn with brightness w = |Ψ|²/q. A weighted sample has
// exactly the density |Ψ(t)|² at every instant (and w ≤ 4, so it stays smooth).
//
// For spontaneous emission there is no coherent beat: the atom is in a statistical
// mixture, which is the same formula with the cross term switched off (coherence 0).

import { buildTables, makeRanks, sampleState } from "./sampler.js";
import { psi } from "./physics.js";

/**
 * Particles for a transition a → b. a, b = { n, l, m }.
 * Returns typed arrays: pos (three.js world xyz, z up), psiA, psiB, q, size (0–1 jitter).
 */
export function buildMixture(a, b, count, seed = 5) {
  const half = Math.floor(count / 2);
  const parts = [
    sampleState(buildTables(a.n, a.l, a.m), makeRanks(half, seed)),
    sampleState(buildTables(b.n, b.l, b.m), makeRanks(count - half, seed + 1)),
  ];
  const pos = new Float32Array(count * 3);
  const psiA = new Float32Array(count), psiB = new Float32Array(count), q = new Float32Array(count);
  const size = new Float32Array(count);
  let k = 0;
  for (const { sph } of parts) {
    for (let i = 0; i < sph.length / 3; i++, k++) {
      const r = sph[3 * i], c = sph[3 * i + 1], p = sph[3 * i + 2];
      const st = Math.sqrt(Math.max(0, 1 - c * c));
      const x = r * st * Math.cos(p), y = r * st * Math.sin(p), z = r * c;
      pos[3 * k] = x; pos[3 * k + 1] = z; pos[3 * k + 2] = -y; // physics → world (z up)
      const va = psi(a.n, a.l, a.m, x, y, z), vb = psi(b.n, b.l, b.m, x, y, z);
      psiA[k] = va; psiB[k] = vb;
      q[k] = 0.5 * (va * va + vb * vb);
      size[k] = (k * 0.6180339887) % 1;
    }
  }
  return { pos, psiA, psiB, q, size };
}

/**
 * Weight of one particle. c2 = c², s2 = s², cross = 2cs·cos(phase)·coherence.
 */
export const mixtureWeight = (psiA, psiB, q, c2, s2, cross) =>
  q > 0 ? (c2 * psiA * psiA + s2 * psiB * psiB + cross * psiA * psiB) / q : 0;
