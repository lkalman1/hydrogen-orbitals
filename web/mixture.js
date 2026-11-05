// Drawing a time-dependent superposition with particles, exactly.
//
// During a transition between states a and b the electron is in
//   Ψ(t) = c·ψa·e^(−iEa·t) + s·ψb·e^(−iEb·t),   c² + s² = 1.
// Writing ψ = A·e^(iα) (amplitude and phase), the density is
//   |Ψ|² = c²A² + s²B² + 2cs·A·B·cos(β − α − ΔE·t).
// For real orbitals the phases are 0 or π. For a swirling m-state the phase winds
// around the z-axis (mφ), so a superposition like 1s + 2p(m = +1) is a lump of charge
// that circles the axis at the beat frequency.
//
// Resampling every frame would be expensive, so we use importance weights instead:
// half the particles are exact samples of |ψa|², half of |ψb|², i.e. samples of
//   q = ½A² + ½B²,
// and each particle is drawn with brightness w = |Ψ|²/q. A weighted sample has
// exactly the density |Ψ(t)|² at every instant (and w ≤ 4, so it stays smooth).
//
// For spontaneous emission there is no coherent beat: the atom is in a statistical
// mixture, which is the same formula with the cross term switched off (coherence 0).
//
// States are { n, l, m, complex } (complex: m-basis; default real orbitals).

import { buildTables, makeRanks, sampleState } from "./sampler.js";
import { psiAmpPhase } from "./physics.js";

/**
 * Particles for a transition a → b.
 * Returns typed arrays: pos (three.js world xyz, z up), ampA, phA, ampB, phB, q, size.
 */
export function buildMixture(a, b, count, seed = 5) {
  const half = Math.floor(count / 2);
  const parts = [
    sampleState(buildTables(a.n, a.l, a.m, { complex: a.complex }), makeRanks(half, seed)),
    sampleState(buildTables(b.n, b.l, b.m, { complex: b.complex }), makeRanks(count - half, seed + 1)),
  ];
  const pos = new Float32Array(count * 3);
  const ampA = new Float32Array(count), phA = new Float32Array(count);
  const ampB = new Float32Array(count), phB = new Float32Array(count);
  const q = new Float32Array(count), size = new Float32Array(count);
  let k = 0;
  for (const { sph } of parts) {
    for (let i = 0; i < sph.length / 3; i++, k++) {
      const r = sph[3 * i], c = sph[3 * i + 1], p = sph[3 * i + 2];
      const st = Math.sqrt(Math.max(0, 1 - c * c));
      const x = r * st * Math.cos(p), y = r * st * Math.sin(p), z = r * c;
      pos[3 * k] = x; pos[3 * k + 1] = z; pos[3 * k + 2] = -y; // physics → world (z up)
      const [aa, pa] = psiAmpPhase(a.n, a.l, a.m, a.complex, x, y, z);
      const [ab, pb] = psiAmpPhase(b.n, b.l, b.m, b.complex, x, y, z);
      ampA[k] = aa; phA[k] = pa; ampB[k] = ab; phB[k] = pb;
      q[k] = 0.5 * (aa * aa + ab * ab);
      size[k] = (k * 0.6180339887) % 1;
    }
  }
  return { pos, ampA, phA, ampB, phB, q, size };
}

/** Weight of one particle. c2 = c², s2 = s², cs = 2cs·coherence, phase = ΔE·t. */
export const mixtureWeight = (ampA, phA, ampB, phB, q, c2, s2, cs, phase) =>
  q > 0 ? (c2 * ampA * ampA + s2 * ampB * ampB + cs * ampA * ampB * Math.cos(phB - phA - phase)) / q : 0;
