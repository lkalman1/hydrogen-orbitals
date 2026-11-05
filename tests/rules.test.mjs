// The lab's light–atom rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { clebsch, angularStrength, absorb, decay, stateEV, photonEVFor, ZEEMAN_MAGNIFY, MU_B_EV_PER_T } from "../web/rules.js";
import { levelEV } from "../web/spectroscopy.js";

const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: ${a} vs ${b}`);
const s = (n, l, m) => ({ n, l, m });

test("Clebsch–Gordan coefficients: known values and orthonormality", () => {
  near(clebsch(1, 1, 1, -1, 0, 0), 1 / Math.sqrt(3), 1e-12, "⟨11;1−1|00⟩");
  near(clebsch(1, 0, 1, 0, 0, 0), -1 / Math.sqrt(3), 1e-12, "⟨10;10|00⟩");
  near(clebsch(1, 1, 1, 0, 2, 1), Math.SQRT1_2, 1e-12, "⟨11;10|21⟩");
  near(clebsch(0, 0, 1, 1, 1, 1), 1, 1e-12, "⟨00;11|11⟩");
  near(clebsch(2, 1, 1, -1, 1, 0), Math.sqrt(3 / 10), 1e-12, "⟨21;1−1|10⟩");
  for (const [j1, j2] of [[1, 1], [2, 1], [3, 1]])
    for (let J = Math.abs(j1 - j2); J <= j1 + j2; J++)
      for (let M = -J; M <= J; M++) {
        let sum = 0;
        for (let m1 = -j1; m1 <= j1; m1++) sum += clebsch(j1, m1, j2, M - m1, J, M) ** 2;
        near(sum, 1, 1e-12, `Σ CG² (${j1},${j2},${J},${M})`);
      }
});

test("angular strengths: from s, every polarization reaches p with strength 1/3", () => {
  for (const q of [-1, 0, 1]) near(angularStrength(0, 0, 1, q), 1 / 3, 1e-12, `q=${q}`);
  assert.equal(angularStrength(0, 0, 0, 0), 0); // Δl = 0 forbidden
  assert.equal(angularStrength(0, 0, 2, 0), 0); // Δl = 2 forbidden
});

test("one photon from 1s: twist sets m, energy sets n, l always becomes 1", () => {
  const e2 = levelEV(2) - levelEV(1);
  assert.deepEqual(absorb(s(1, 0, 0), { count: 1, twist: +1, eV: e2 }).to, s(2, 1, 1));
  assert.deepEqual(absorb(s(1, 0, 0), { count: 1, twist: 0, eV: e2 }).to, s(2, 1, 0));
  assert.deepEqual(absorb(s(1, 0, 0), { count: 1, twist: -1, eV: e2 }).to, s(2, 1, -1));
  assert.equal(absorb(s(1, 0, 0), { count: 1, twist: 0, eV: e2 * 0.97 }).type, "miss");
});

test("two photons from 1s: cancelling twists keep it round; same twists give d with m = ±2", () => {
  const half2 = (levelEV(2) - levelEV(1)) / 2, half3 = (levelEV(3) - levelEV(1)) / 2;
  assert.deepEqual(absorb(s(1, 0, 0), { count: 2, twist: 0, eV: half2 }).to, s(2, 0, 0));
  const r3 = absorb(s(1, 0, 0), { count: 2, twist: 0, eV: half3 });
  assert.deepEqual(r3.options.map((o) => o.to.l).sort(), [0, 2]); // 3s or 3d (m = 0)
  assert.deepEqual(absorb(s(1, 0, 0), { count: 2, twist: 2, eV: half3 }).to, s(3, 2, 2));
  // at level 2 there is no d: two same-twist photons are blocked
  assert.equal(absorb(s(1, 0, 0), { count: 2, twist: 2, eV: half2 }).type, "blocked");
});

test("from excited states: 2p(m=+1) + one photon down-twist → 3s or 3d(m=0), with dipole odds", () => {
  const e = levelEV(3) - levelEV(2);
  const r = absorb(s(2, 1, 1), { count: 1, twist: -1, eV: e });
  assert.equal(r.type, "absorb");
  const odds = Object.fromEntries(r.options.map((o) => [o.to.l, o.odds]));
  assert.ok(odds[0] > 0 && odds[2] > 0);
  near(odds[0] + odds[2], 1, 1e-12, "odds sum");
  assert.equal(r.to.m, 0);
  // 2s + one photon at the Hα energy goes to 3p (2s → 3s is forbidden)
  assert.deepEqual(absorb(s(2, 0, 0), { count: 1, twist: 0, eV: e }).to, s(3, 1, 0));
});

test("enough energy frees the electron; ionized atoms absorb nothing", () => {
  assert.equal(absorb(s(1, 0, 0), { count: 1, twist: 0, eV: 13.7 }).type, "ionize");
  assert.equal(absorb(s(1, 0, 0), { count: 2, twist: 0, eV: 6.9 }).type, "ionize");
  assert.equal(absorb(s(2, 1, 1), { count: 1, twist: 0, eV: 3.5 }).type, "ionize");
  assert.equal(absorb({ ionized: true }, { count: 1, twist: 0, eV: 10.2 }).type, "miss");
});

test("magnetic field: energies split by m, so the twist changes the photon energy needed", () => {
  const B = 1;
  near(stateEV(s(2, 1, 1), B) - stateEV(s(2, 1, -1), B), 2 * MU_B_EV_PER_T * ZEEMAN_MAGNIFY * B, 1e-12, "splitting");
  const up = photonEVFor(s(1, 0, 0), 2, { twist: 1, B }), down = photonEVFor(s(1, 0, 0), 2, { twist: -1, B });
  assert.ok(up > down);
  assert.deepEqual(absorb(s(1, 0, 0), { count: 1, twist: 1, eV: up }, { B }).to, s(2, 1, 1));
  assert.equal(absorb(s(1, 0, 0), { count: 1, twist: -1, eV: up }, { B }).type, "miss");
});

test("decay: m changes by at most 1, photon twist conserves angular momentum, odds follow CG²", () => {
  for (let i = 0; i < 200; i++) {
    const d = decay(s(3, 2, 2));
    assert.ok(Math.abs(d.to.m - 2) <= 1 && Math.abs(d.to.m) <= d.to.l);
    assert.equal(d.twist, 2 - d.to.m);
  }
  // 2p(m=+1) → 1s always emits a +1 twist photon at Lyman-α
  const d = decay(s(2, 1, 1));
  assert.deepEqual(d.to, s(1, 0, 0));
  assert.equal(d.twist, 1);
  near(d.nm, 121.57, 0.01, "Lyα");
  // 2p(m=0) → 3d? no: decays only go down; and 1s doesn't decay
  assert.equal(decay(s(1, 0, 0)), null);
  // 3p(m=0) → 2s or 1s keeps m = 0
  for (let i = 0; i < 50; i++) assert.equal(decay(s(3, 1, 0)).to.m, 0);
});
