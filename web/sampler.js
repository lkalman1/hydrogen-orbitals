// Exact sampling of electron positions from |ψ_nlm|².
//
// |ψ|² dV separates into three independent 1D densities:
//
//   r²R_nl(r)² dr  ·  Θ_l|m|(cosθ)² d(cosθ)  ·  Φ_m(φ)² dφ
//
// so each coordinate is drawn by inverse-CDF lookup from its own table — no
// rejection, no wasted samples, same cost for any n. Each particle keeps a fixed
// triple of uniform "ranks" (u_r, u_θ, u_φ); mapping the same ranks through the
// tables of a new state gives the smooth rank-matching morph between states.

import { radial, thetaPart, phiPartReal } from "./physics.js";

const R_BINS = 4096;
const ANGLE_BINS = 2048;

/** Radius beyond which r²R² is negligible (< e^-20 of its peak for n ≤ 7). */
export const radialCutoff = (n) => 2 * n * n + 15 * n + 10;

/** Cumulative table of a density f sampled on [lo, hi], normalized to end at 1. */
function cdfTable(f, lo, hi, bins) {
  const xs = new Float64Array(bins + 1);
  const cdf = new Float64Array(bins + 1);
  const dx = (hi - lo) / bins;
  let prev = f(lo);
  xs[0] = lo;
  for (let i = 1; i <= bins; i++) {
    xs[i] = lo + i * dx;
    const cur = f(xs[i]);
    cdf[i] = cdf[i - 1] + 0.5 * (prev + cur) * dx; // trapezoid rule
    prev = cur;
  }
  const total = cdf[bins];
  for (let i = 0; i <= bins; i++) cdf[i] /= total;
  return { xs, cdf, total };
}

/** Invert a CDF table at u ∈ [0, 1) with binary search + linear interpolation. */
function invert({ xs, cdf }, u) {
  let lo = 0, hi = cdf.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cdf[mid] <= u) lo = mid; else hi = mid;
  }
  const span = cdf[hi] - cdf[lo];
  const t = span > 0 ? (u - cdf[lo]) / span : 0;
  return xs[lo] + t * (xs[hi] - xs[lo]);
}

/** Build the three inverse-CDF tables for a (real) orbital. */
export function buildTables(n, l, m) {
  const absM = Math.abs(m);
  const rTable = cdfTable((r) => (r * radial(n, l, r)) ** 2, 0, radialCutoff(n), R_BINS);
  const cTable = cdfTable((c) => thetaPart(l, absM, c) ** 2, -1, 1, ANGLE_BINS);
  const pTable = cdfTable((p) => phiPartReal(m, p) ** 2, 0, 2 * Math.PI, ANGLE_BINS);
  return {
    n, l, m, rTable, cTable, pTable,
    // Normalization checks: each 1D integral must be 1 for a normalized ψ.
    norms: [rTable.total, cTable.total * pTable.total],
    radiusQuantile: (q) => invert(rTable, q),
  };
}

/** Seeded PRNG (mulberry32) so a given seed always gives the same cloud. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Per-particle uniform ranks, 3 per particle. */
export function makeRanks(count, seed = 1) {
  const rand = rng(seed);
  const ranks = new Float32Array(count * 3);
  for (let i = 0; i < ranks.length; i++) ranks[i] = rand();
  return ranks;
}

/**
 * Map ranks through a state's tables.
 * Returns spherical coordinates (r, cosθ, φ) per particle and the sign of ψ there.
 */
export function sampleState(tables, ranks) {
  const { n, l, m, rTable, cTable, pTable } = tables;
  const count = ranks.length / 3;
  const sph = new Float32Array(count * 3);
  const sign = new Float32Array(count);
  const absM = Math.abs(m);
  for (let i = 0; i < count; i++) {
    const r = invert(rTable, ranks[3 * i]);
    const c = invert(cTable, ranks[3 * i + 1]);
    const p = invert(pTable, ranks[3 * i + 2]);
    sph[3 * i] = r; sph[3 * i + 1] = c; sph[3 * i + 2] = p;
    sign[i] = Math.sign(radial(n, l, r) * thetaPart(l, absM, c) * phiPartReal(m, p)) || 1;
  }
  return { sph, sign };
}

/** Spherical (r, cosθ, φ) → Cartesian, for tests and CPU-side use. */
export function toCartesian(sph) {
  const out = new Float32Array(sph.length);
  for (let i = 0; i < sph.length; i += 3) {
    const r = sph[i], c = sph[i + 1], p = sph[i + 2];
    const s = Math.sqrt(Math.max(0, 1 - c * c));
    out[i] = r * s * Math.cos(p); out[i + 1] = r * s * Math.sin(p); out[i + 2] = r * c;
  }
  return out;
}
