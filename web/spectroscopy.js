// Spectroscopy of hydrogen: energies of the levels the story shows, the wavelengths
// of the light that connects them, and how fast excited states decay.
//
// Displayed energies and wavelengths include the reduced-mass correction (the proton
// is not infinitely heavy), so they match measured values: Hα = 656.47 nm (vacuum),
// Lyman-α = 121.57 nm, the 1S–2S two-photon line = 243.13 nm. The clouds themselves
// use a₀ (a 0.05% difference in size, far below anything visible).

import { HARTREE_EV, energyHartree, radial } from "./physics.js";
import { radialCutoff } from "./sampler.js";

export const PROTON_ELECTRON_MASS_RATIO = 1836.15267;
export const REDUCED_MASS = 1 / (1 + 1 / PROTON_ELECTRON_MASS_RATIO);
export const HC_EV_NM = 1239.841984;      // h·c in eV·nm
export const C_AU = 137.035999;           // speed of light in atomic units (1/α)
export const AU_TIME_S = 2.4188843265857e-17;
export const TWO_PHOTON_2S_RATE = 8.2290; // s⁻¹, 2s → 1s two-photon decay (lifetime 0.1215 s)

/** Energy of level n in eV, with the reduced-mass correction. */
export const levelEV = (n) => energyHartree(n) * HARTREE_EV * REDUCED_MASS;

/** Vacuum wavelength (nm) of a photon carrying energy E (eV). */
export const nmFromEV = (ev) => HC_EV_NM / Math.abs(ev);

/** Wavelength (nm) of the line between levels n1 and n2. */
export const lineNm = (n1, n2) => nmFromEV(levelEV(n2) - levelEV(n1));

/** Wavelength (nm) of each of two equal photons that together lift 1s to level n. */
export const twoPhotonNm = (n) => 2 * lineNm(1, n);

/** ∫ R_nl R_n'l' r³ dr (atomic units), by Simpson's rule. */
export function radialDipole(n, l, n2, l2) {
  const rMax = radialCutoff(Math.max(n, n2)), steps = 4000, h = rMax / steps;
  let sum = 0;
  for (let i = 0; i <= steps; i++) {
    const r = i * h;
    const f = radial(n, l, r) * radial(n2, l2, r) * r ** 3;
    sum += f * (i === 0 || i === steps ? 1 : i % 2 ? 4 : 2);
  }
  return (sum * h) / 3;
}

/**
 * Spontaneous-emission rate (s⁻¹) for nl → n'l' (electric dipole, l' = l ± 1),
 * summed over final m and averaged over initial m:
 *   A = (4 ω³ / 3c³) · max(l, l')/(2l + 1) · |∫ R R r³ dr|²   (atomic units)
 * times the reduced-mass factor μ/mₑ (ω³ scales as μ³ and |r|² as μ⁻²).
 */
export function einsteinA(n, l, n2, l2) {
  if (Math.abs(l - l2) !== 1 || levelEV(n2) >= levelEV(n)) return 0;
  const omega = energyHartree(n) - energyHartree(n2);
  const I = radialDipole(n, l, n2, l2);
  const rateAU = (4 * omega ** 3 / (3 * C_AU ** 3)) * (Math.max(l, l2) / (2 * l + 1)) * I * I;
  return (rateAU * REDUCED_MASS) / AU_TIME_S;
}

/**
 * All decay channels of state (n, l), with branching ratios. 2s has no one-photon
 * decay and is given its two-photon channel to 1s.
 * Returns { lifetime (s), channels: [{ n, l, rate, branch, nm, twoPhoton? }] }.
 */
export function decays(n, l) {
  const channels = [];
  if (n === 2 && l === 0) {
    channels.push({ n: 1, l: 0, rate: TWO_PHOTON_2S_RATE, nm: null, twoPhoton: true });
  } else {
    for (let n2 = 1; n2 < n; n2++) {
      for (const l2 of [l - 1, l + 1]) {
        if (l2 < 0 || l2 >= n2) continue;
        const rate = einsteinA(n, l, n2, l2);
        if (rate > 0) channels.push({ n: n2, l: l2, rate, nm: lineNm(n2, n) });
      }
    }
  }
  const total = channels.reduce((s, c) => s + c.rate, 0);
  for (const c of channels) c.branch = c.rate / total;
  return { lifetime: total ? 1 / total : Infinity, channels };
}

/** Pick a decay channel at random according to the branching ratios (u ∈ [0, 1)). */
export function pickDecay(n, l, u = Math.random()) {
  const { channels } = decays(n, l);
  let acc = 0;
  for (const c of channels) { acc += c.branch; if (u < acc) return c; }
  return channels[channels.length - 1] ?? null;
}

export function regionOf(nm) {
  if (nm < 380) return "ultraviolet";
  if (nm > 750) return "infrared";
  return "visible";
}

/**
 * Approximate display colour of light of wavelength nm, as [r, g, b] in 0–1.
 * Invisible light gets a muted stand-in: violet-grey for UV, deep red-grey for IR.
 */
export function wavelengthRGB(nm) {
  if (nm < 380) return [0.62, 0.52, 1.0];
  if (nm > 750) return [0.75, 0.32, 0.3];
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = (440 - nm) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
  else r = 1;
  // fall-off at the edges of vision
  const f = nm < 420 ? 0.3 + 0.7 * (nm - 380) / 40 : nm > 700 ? 0.3 + 0.7 * (750 - nm) / 50 : 1;
  return [r, g, b].map((v) => Math.max(0.12, (v * f) ** 0.8));
}

export const rgbCss = ([r, g, b]) => `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;

/** A short human label: "656.5 nm · red", "121.6 nm · ultraviolet". */
export function describeNm(nm) {
  const region = regionOf(nm);
  if (region !== "visible") return `${nm.toFixed(1)} nm · ${region}`;
  const name = nm < 450 ? "violet" : nm < 495 ? "blue" : nm < 570 ? "green" : nm < 590 ? "yellow" : nm < 620 ? "orange" : "red";
  return `${nm.toFixed(1)} nm · ${name}`;
}
