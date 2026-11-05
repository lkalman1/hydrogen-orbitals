// Hydrogen wavefunctions in atomic units (lengths in Bohr radii, energies in Hartree).
//
//   ψ_nlm(r, θ, φ) = R_nl(r) · Y_lm(θ, φ)
//
// Mirrors R_nl / real_Y / psi in ../hydrogen.py, which is the reference these
// functions are tested against (tests/physics.test.mjs).

export const HARTREE_EV = 27.211386;
export const L_LETTERS = "spdfghik";
export const MAX_N = 7;

// log(k!) via a cached table: factorials overflow quickly, logs don't.
const LOG_FACT = [0];
export function logFactorial(k) {
  for (let i = LOG_FACT.length; i <= k; i++) LOG_FACT[i] = LOG_FACT[i - 1] + Math.log(i);
  return LOG_FACT[k];
}

export function isValid(n, l, m) {
  return Number.isInteger(n) && Number.isInteger(l) && Number.isInteger(m) &&
    n >= 1 && l >= 0 && l < n && Math.abs(m) <= l;
}

/** Energy E_n = -1/(2n²) Hartree. */
export const energyHartree = (n) => -0.5 / (n * n);
export const energyEV = (n) => energyHartree(n) * HARTREE_EV;

/** Exact expectation values ⟨r⟩ and ⟨r²⟩ (used for auto-zoom and tests). */
export const meanR = (n, l) => 0.5 * (3 * n * n - l * (l + 1));
export const meanR2 = (n, l) => 0.5 * n * n * (5 * n * n + 1 - 3 * l * (l + 1));

/** Generalized Laguerre polynomial L_k^α(x), by the three-term recurrence. */
export function laguerre(k, alpha, x) {
  if (k === 0) return 1;
  let prev = 1, cur = 1 + alpha - x;
  for (let j = 1; j < k; j++) {
    const next = ((2 * j + 1 + alpha - x) * cur - (j + alpha) * prev) / (j + 1);
    prev = cur; cur = next;
  }
  return cur;
}

/** Associated Legendre P_l^m(x) for m ≥ 0, with the Condon–Shortley phase (as SciPy). */
export function legendre(l, m, x) {
  const s = Math.sqrt(Math.max(0, 1 - x * x));
  let pmm = 1;
  for (let i = 1; i <= m; i++) pmm *= -(2 * i - 1) * s;
  if (l === m) return pmm;
  let pm1 = x * (2 * m + 1) * pmm;
  for (let ll = m + 2; ll <= l; ll++) {
    const next = (x * (2 * ll - 1) * pm1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pm1; pm1 = next;
  }
  return pm1;
}

/** Normalized radial function R_nl(r). */
export function radial(n, l, r) {
  const rho = (2 * r) / n;
  const logNorm = 0.5 * (3 * Math.log(2 / n) + logFactorial(n - l - 1) - Math.log(2 * n) - logFactorial(n + l));
  return Math.exp(logNorm - rho / 2) * rho ** l * laguerre(n - l - 1, 2 * l + 1, rho);
}

/** Θ part of the complex harmonic: Y_lm = theta(l, |m|, cosθ) · e^{i|m|φ}. */
export function thetaPart(l, absM, cosTheta) {
  const logN = 0.5 * (Math.log((2 * l + 1) / (4 * Math.PI)) + logFactorial(l - absM) - logFactorial(l + absM));
  return Math.exp(logN) * legendre(l, absM, cosTheta);
}

/**
 * Φ part of the *real* harmonics (p_x, d_xy, ...), matching hydrogen.py's real_Y:
 *   m > 0: √2 (−1)^m cos(mφ),  m < 0: √2 (−1)^m sin(|m|φ),  m = 0: 1.
 */
export function phiPartReal(m, phi) {
  if (m === 0) return 1;
  const sign = m % 2 === 0 ? 1 : -1;
  return Math.SQRT2 * sign * (m > 0 ? Math.cos(m * phi) : Math.sin(-m * phi));
}

/** Real hydrogen orbital ψ_nlm at a Cartesian point. */
export function psi(n, l, m, x, y, z) {
  const r = Math.hypot(x, y, z);
  const cosT = r > 0 ? z / r : 1;
  return radial(n, l, r) * thetaPart(l, Math.abs(m), cosT) * phiPartReal(m, Math.atan2(y, x));
}

/**
 * ψ_nlm at a Cartesian point as [amplitude ≥ 0, phase]. complex: the m-basis state
 * R·Y_lm (Y_lm ∝ P_l^m e^{imφ}, a cloud that swirls about z); otherwise the real
 * orbital (phase 0 or π).
 */
export function psiAmpPhase(n, l, m, complex, x, y, z) {
  if (!complex || m === 0) {
    const v = psi(n, l, m, x, y, z);
    return [Math.abs(v), v < 0 ? Math.PI : 0];
  }
  const r = Math.hypot(x, y, z);
  const cosT = r > 0 ? z / r : 1;
  const am = Math.abs(m);
  let v = radial(n, l, r) * thetaPart(l, am, cosT);
  if (m < 0 && am % 2) v = -v; // Y_l^{-m} = (−1)^m conj(Y_l^m)
  return [Math.abs(v), m * Math.atan2(y, x) + (v < 0 ? Math.PI : 0)];
}

/** Node counts: radial (spheres) + angular (planes/cones) = n − 1. */
export const nodes = (n, l) => ({ radial: n - l - 1, angular: l });

const REAL_NAMES = {
  "1,1": "x", "1,-1": "y", "1,0": "z",
  "2,0": "z²", "2,1": "xz", "2,-1": "yz", "2,2": "x²−y²", "2,-2": "xy",
};
export function orbitalName(n, l, m) {
  const suffix = REAL_NAMES[`${l},${m}`] ?? (l === 0 ? "" : ` m=${m}`);
  return `${n}${L_LETTERS[l]}${suffix}`;
}
