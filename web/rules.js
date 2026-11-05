// How light and hydrogen interact, from any state: the rules the lab plays by.
//
// States are { n, l, m } in the m-basis (m = how the cloud swirls about the z-axis),
// or { ionized: true }. Light comes as 1 or 2 photons, each with energy eV, and a
// twist (circular polarization about z): for one photon +1, 0 (linear, along z) or
// −1; for two photons the net twist is 0 (cancelling), +2 or −2.
//
//   one photon  : Δl = ±1, Δm = twist            (electric dipole)
//   two photons : Δl = 0 or ±2, Δm = net twist    (two dipole steps)
// and the energy must match a gap between levels. Enough energy frees the electron.
//
// Relative odds between allowed final shapes use the dipole matrix elements: the
// radial integral times the angular (Clebsch–Gordan) factor. A magnetic field shifts
// each state by μ_B·B·m (the normal Zeeman effect; spin is not modelled), magnified
// so it can be seen.

import { levelEV, radialDipole, pickDecay, lineNm, nmFromEV } from "./spectroscopy.js";
import { MAX_N } from "./physics.js";

export const MU_B_EV_PER_T = 5.7883818060e-5;
export const ZEEMAN_MAGNIFY = 1000;   // the demo's field effect is shown this many times larger
export const B_MAX_T = 2;             // slider range, real tesla
export const ENERGY_TOLERANCE_EV = 0.03;

const fact = (n) => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; };

/** Clebsch–Gordan coefficient ⟨j1 m1; j2 m2 | J M⟩ (integer arguments), by Racah's formula. */
export function clebsch(j1, m1, j2, m2, J, M) {
  if (m1 + m2 !== M || Math.abs(m1) > j1 || Math.abs(m2) > j2 || Math.abs(M) > J) return 0;
  if (J < Math.abs(j1 - j2) || J > j1 + j2) return 0;
  const pre = Math.sqrt((2 * J + 1) * fact(J + j1 - j2) * fact(J - j1 + j2) * fact(j1 + j2 - J) / fact(j1 + j2 + J + 1))
    * Math.sqrt(fact(J + M) * fact(J - M) * fact(j1 - m1) * fact(j1 + m1) * fact(j2 - m2) * fact(j2 + m2));
  let sum = 0;
  for (let k = 0; k <= j1 + j2 + J; k++) {
    const d = [k, j1 + j2 - J - k, j1 - m1 - k, j2 + m2 - k, J - j2 + m1 + k, J - j1 - m2 + k];
    if (d.some((x) => x < 0)) continue;
    sum += (k % 2 ? -1 : 1) / d.reduce((p, x) => p * fact(x), 1);
  }
  return pre * sum;
}

/** |⟨l' m'| C¹_q |l m⟩|²: angular strength of a one-photon step l,m → l',m' (q = m' − m). */
export function angularStrength(l, m, l2, m2) {
  const q = m2 - m;
  if (Math.abs(q) > 1 || Math.abs(l2 - l) !== 1) return 0;
  return ((2 * l + 1) / (2 * l2 + 1)) * clebsch(l, 0, 1, 0, l2, 0) ** 2 * clebsch(l, m, 1, q, l2, m2) ** 2;
}

/** Energy (eV) of state (n, m) in field B (tesla), with the demo's magnification. */
export const stateEV = ({ n, m }, B = 0) => levelEV(n) + MU_B_EV_PER_T * ZEEMAN_MAGNIFY * B * m;

/** The real (unmagnified) Zeeman shift per unit of m, in eV. */
export const realZeemanEV = (B) => MU_B_EV_PER_T * B;

export const isValidState = ({ n, l, m }) => n >= 1 && n <= MAX_N && l >= 0 && l < n && Math.abs(m) <= l;

function pick(options, u) {
  const total = options.reduce((s, o) => s + o.weight, 0);
  let acc = 0;
  for (const o of options) { acc += o.weight / total; if (u < acc) return o; }
  return options[options.length - 1];
}

/**
 * What happens when light hits the atom.
 *   light: { count: 1 | 2, twist, eV }  (eV per photon)
 * Returns one of
 *   { type: "absorb", to, options }        options: every allowed final state with its odds
 *   { type: "ionize" }                     enough energy to free the electron
 *   { type: "blocked", n, reason }         the energy matches level n, but no shape there is allowed
 *   { type: "miss" }                       the energy matches no step
 */
export function absorb(state, { count, twist, eV }, { B = 0, u = Math.random(), tol = ENERGY_TOLERANCE_EV } = {}) {
  if (state.ionized) return { type: "miss" };
  const total = count * eV;
  if (total >= -stateEV(state, B) - 1e-9) return { type: "ionize" };
  const m2 = state.m + twist;
  for (let n2 = state.n + 1; n2 <= MAX_N; n2++) {
    const needed = stateEV({ n: n2, m: m2 }, B) - stateEV(state, B);
    if (Math.abs(total - needed) > tol) continue;
    const ls = count === 1 ? [state.l - 1, state.l + 1] : [state.l - 2, state.l, state.l + 2];
    const options = [];
    for (const l2 of ls) {
      if (l2 < 0 || l2 >= n2 || Math.abs(m2) > l2) continue;
      // one photon: dipole strength; two photons: equal odds between allowed shapes (see "the physics")
      const weight = count === 1
        ? angularStrength(state.l, state.m, l2, m2) * radialDipole(state.n, state.l, n2, l2) ** 2
        : 1;
      if (weight > 0) options.push({ to: { n: n2, l: l2, m: m2 }, weight });
    }
    if (!options.length) {
      const reason = Math.abs(m2) >= n2 ? "no shape at that level can swirl that much (|m| ≤ l < n)"
        : count === 1 ? "one photon must change l by exactly 1" : "two photons change l by 0 or 2";
      return { type: "blocked", n: n2, reason };
    }
    const sum = options.reduce((acc, o) => acc + o.weight, 0);
    for (const o of options) o.odds = o.weight / sum;
    return { type: "absorb", to: pick(options, u).to, options };
  }
  return { type: "miss" };
}

/**
 * Spontaneous decay of state: the true branching ratios between lower levels and,
 * within the chosen (n', l'), the m' odds from the angular factor.
 * Returns { to, eV, nm, twist (the photon's, = m − m'), twoPhoton } or null for 1s.
 */
export function decay(state, { B = 0, u1 = Math.random(), u2 = Math.random() } = {}) {
  if (state.ionized || state.n === 1) return null;
  const ch = pickDecay(state.n, state.l, u1);
  if (!ch) return null;
  if (ch.twoPhoton) {
    const to = { n: ch.n, l: ch.l, m: 0 };
    return { to, eV: stateEV(state, B) - stateEV(to, B), nm: null, twist: 0, twoPhoton: true };
  }
  const options = [];
  for (let m2 = state.m - 1; m2 <= state.m + 1; m2++) {
    if (Math.abs(m2) > ch.l) continue;
    const weight = clebsch(state.l, state.m, 1, m2 - state.m, ch.l, m2) ** 2;
    if (weight > 0) options.push({ m2, weight });
  }
  const { m2 } = pick(options, u2);
  const to = { n: ch.n, l: ch.l, m: m2 };
  const eV = stateEV(state, B) - stateEV(to, B);
  return { to, eV, nm: B ? nmFromEV(eV) : lineNm(ch.n, state.n), twist: state.m - m2, twoPhoton: false };
}

/** Energy (eV per photon) that lifts `state` to level n2 with the given light, or null if impossible. */
export function photonEVFor(state, n2, { count = 1, twist = 0, B = 0 } = {}) {
  const needed = stateEV({ n: n2, m: state.m + twist }, B) - stateEV(state, B);
  return needed > 0 ? needed / count : null;
}

/** Binding energy (eV) of a state: what it takes to free the electron. */
export const bindingEV = (state, B = 0) => -stateEV(state, B);
