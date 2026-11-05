// Spectroscopy checks against measured hydrogen values.
//   node --test tests/        (or: npm test)

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lineNm, twoPhotonNm, radialDipole, einsteinA, decays, pickDecay, levelEV, wavelengthRGB, regionOf,
} from "../web/spectroscopy.js";

const near = (got, want, tol, label) => assert.ok(Math.abs(got - want) <= tol, `${label}: ${got} vs ${want}`);

test("line wavelengths match measured vacuum values (reduced mass included)", () => {
  near(lineNm(2, 3), 656.47, 0.03, "Hα");
  near(lineNm(2, 4), 486.27, 0.03, "Hβ");
  near(lineNm(2, 5), 434.17, 0.03, "Hγ");
  near(lineNm(2, 6), 410.29, 0.03, "Hδ");
  near(lineNm(1, 2), 121.57, 0.01, "Lyman-α");
  near(lineNm(3, 4), 1875.6, 0.5, "Paschen-α");
  near(twoPhotonNm(2), 243.13, 0.01, "1S–2S two-photon");
  near(twoPhotonNm(3), 205.14, 0.02, "1S–3S two-photon");
  near(levelEV(1), -13.598, 0.001, "ground state");
});

test("dipole radial integral ⟨1s|r|2p⟩ = 128√6/243", () => {
  near(radialDipole(2, 1, 1, 0), 128 * Math.sqrt(6) / 243, 1e-6, "⟨10|r|21⟩");
});

test("Einstein A coefficients and lifetimes match tabulated values", () => {
  near(einsteinA(2, 1, 1, 0), 6.2649e8, 0.003e8, "A(2p→1s)");
  near(einsteinA(3, 0, 2, 1), 6.313e6, 0.01e6, "A(3s→2p)");
  near(einsteinA(3, 2, 2, 1), 6.465e7, 0.01e7, "A(3d→2p)");
  near(decays(2, 1).lifetime * 1e9, 1.596, 0.005, "τ(2p) ns");
  near(decays(3, 0).lifetime * 1e9, 158.4, 0.5, "τ(3s) ns");
  near(decays(3, 1).lifetime * 1e9, 5.27, 0.02, "τ(3p) ns");
  near(decays(3, 2).lifetime * 1e9, 15.47, 0.05, "τ(3d) ns");
  near(decays(2, 0).lifetime, 0.1215, 0.0005, "τ(2s) s (two-photon)");
});

test("branching ratios: 3s only to 2p; 3p mostly to 1s (~88%); 4s splits between 2p and 3p", () => {
  assert.deepEqual(decays(3, 0).channels.map((c) => `${c.n}${c.l}`), ["21"]);
  const b3p = Object.fromEntries(decays(3, 1).channels.map((c) => [`${c.n}${c.l}`, c.branch]));
  near(b3p["10"], 0.882, 0.003, "3p→1s branch");
  const b4s = Object.fromEntries(decays(4, 0).channels.map((c) => [`${c.n}${c.l}`, c.branch]));
  near(b4s["21"] + b4s["31"], 1, 1e-12, "4s branches sum");
  near(b4s["21"], 0.58, 0.02, "4s→2p branch");
  assert.equal(pickDecay(3, 0, 0.999).n, 2);
});

test("colours: visible light is coloured, UV/IR get stand-ins", () => {
  const [r, g, b] = wavelengthRGB(656.47);
  assert.ok(r > 0.9 && g < 0.3 && b < 0.3);
  assert.equal(regionOf(121.6), "ultraviolet");
  assert.equal(regionOf(1875), "infrared");
  assert.equal(regionOf(486), "visible");
});

// ---- superposition rendering (mixture.js): weighted particles have exactly |Ψ(t)|²
import { buildMixture, mixtureWeight } from "../web/mixture.js";
import { meanR } from "../web/physics.js";

function weightedMoments(mix, c, s, phase, coherence = 1) {
  const c2 = c * c, s2 = s * s, cs = 2 * c * s * coherence;
  let W = 0, R = 0, X = 0, Y = 0, Z = 0, wMax = 0;
  for (let i = 0; i < mix.q.length; i++) {
    const w = mixtureWeight(mix.ampA[i], mix.phA[i], mix.ampB[i], mix.phB[i], mix.q[i], c2, s2, cs, phase);
    const x = mix.pos[3 * i], y = mix.pos[3 * i + 1], z = mix.pos[3 * i + 2];
    W += w; R += w * Math.hypot(x, y, z);
    X += w * x; Y += w * -z; Z += w * y; // world (x, y, z) = physics (x, z, −y)
    wMax = Math.max(wMax, w);
  }
  const N = mix.q.length;
  return { norm: W / N, r: R / W, x: X / W, y: Y / W, z: Z / W, wMax };
}

test("1s+2s superposition: normalised weights and the breathing ⟨r⟩(t)", () => {
  const mix = buildMixture({ n: 1, l: 0, m: 0 }, { n: 2, l: 0, m: 0 }, 200000, 21);
  const overlap = radialDipole(1, 0, 2, 0); // ⟨1s|r|2s⟩
  for (const [theta, phase] of [[0, 0], [Math.PI / 4, 0], [Math.PI / 4, Math.PI], [Math.PI / 2, 0], [0.3, 1]]) {
    const c = Math.cos(theta), s = Math.sin(theta);
    const m = weightedMoments(mix, c, s, phase);
    const exact = c * c * meanR(1, 0) + s * s * meanR(2, 0) + 2 * c * s * Math.cos(phase) * overlap;
    near(m.norm, 1, 0.02, `norm θ=${theta}`);
    near(m.r, exact, 0.06, `⟨r⟩ θ=${theta.toFixed(2)} φ=${phase.toFixed(2)}`);
    assert.ok(m.wMax <= 4 + 1e-6, `weights bounded (max ${m.wMax})`);
  }
});

test("3s+2p superposition: the electron sloshes along z, ⟨z⟩ = 2cs·cosφ·⟨3s|r|2p⟩/√3", () => {
  const mix = buildMixture({ n: 3, l: 0, m: 0 }, { n: 2, l: 1, m: 0 }, 200000, 31);
  const dip = radialDipole(3, 0, 2, 1) / Math.sqrt(3);
  const c = Math.SQRT1_2, s = Math.SQRT1_2;
  for (const phase of [0, Math.PI / 2, Math.PI]) {
    near(weightedMoments(mix, c, s, phase).z, Math.cos(phase) * dip, 0.08, `⟨z⟩ φ=${phase.toFixed(2)}`);
  }
  // a statistical mixture (spontaneous emission) has no sloshing
  near(weightedMoments(mix, c, s, 0, 0).z, 0, 0.08, "⟨z⟩ incoherent");
});

test("1s + 2p(m=+1), the twisted superposition: a lump of charge circling the z-axis", () => {
  const mix = buildMixture({ n: 1, l: 0, m: 0 }, { n: 2, l: 1, m: 1, complex: true }, 200000, 41);
  const c = Math.SQRT1_2, s = Math.SQRT1_2;
  const a = weightedMoments(mix, c, s, 0), b = weightedMoments(mix, c, s, Math.PI / 2);
  const ra = Math.hypot(a.x, a.y), rb = Math.hypot(b.x, b.y);
  // |⟨1s|x|2p±1⟩| = |⟨1s|y|2p±1⟩| = I/√6 with I = ∫R10 R21 r³ dr, so for c = s = 1/√2 the
  // centre of charge circles the axis at radius I/√6 ≈ 0.527 a₀
  const expected = radialDipole(1, 0, 2, 1) / Math.sqrt(6);
  near(ra, rb, 0.06, "the lump keeps its distance from the axis");
  near(ra, expected, 0.08, "lump radius");
  const turn = Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x);
  near(Math.abs(Math.atan2(Math.sin(turn), Math.cos(turn))), Math.PI / 2, 0.15, "a quarter beat turns it 90°");
  near(a.z, 0, 0.05, "no motion along z");
  near(Math.hypot(weightedMoments(mix, c, s, 0, 0).x, weightedMoments(mix, c, s, 0, 0).y), 0, 0.06, "incoherent: no lump");
});

test("laser resonance detection picks the right ns level, with a forgiving tolerance", async () => {
  const { resonantLevel, TOLERANCE_NM } = await import("../web/story/lab.js");
  assert.equal(resonantLevel(243.13).n, 2);
  assert.equal(resonantLevel(243.13 + TOLERANCE_NM * 0.9).n, 2);
  assert.equal(resonantLevel(243.13 + TOLERANCE_NM * 1.5).n, null);
  assert.equal(resonantLevel(205.15).n, 3);
  assert.equal(resonantLevel(189.95).n, 5);
  assert.equal(resonantLevel(260).n, null);
  assert.equal(resonantLevel(250).nearest, 2);
  // neighbouring lines never both count: tolerance is below half the closest spacing (6s–7s)
  assert.ok(TOLERANCE_NM < (twoPhotonNm(6) - twoPhotonNm(7)) / 2);
});

test("single-photon laser mode: Lyman lines reach np levels", async () => {
  const { resonantLevel, MODES } = await import("../web/story/lab.js");
  assert.equal(resonantLevel(121.57, "one").n, 2);
  assert.equal(resonantLevel(102.57, "one").n, 3);
  assert.equal(resonantLevel(97.25, "one").n, 4);
  assert.equal(resonantLevel(112, "one").n, null);
  assert.equal(MODES.one.l, 1); // one photon from s always lands in p
  assert.equal(MODES.two.l, 0);
  // the neighbouring Lyman lines near the series limit stay distinguishable
  assert.ok(0.25 < (lineNm(1, 6) - lineNm(1, 7)) / 2);
});
