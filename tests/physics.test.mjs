// Tests the JavaScript physics core against the SciPy reference (tests/reference.json).
//   node --test tests/        (or: npm test)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { psi, meanR, meanR2, energyEV, isValid, MAX_N } from "../web/physics.js";
import { buildTables, makeRanks, sampleState, toCartesian } from "../web/sampler.js";

const ref = JSON.parse(readFileSync(new URL("./reference.json", import.meta.url)));

const STATES = [];
for (let n = 1; n <= MAX_N; n++)
  for (let l = 0; l < n; l++)
    for (let m = -l; m <= l; m++) STATES.push([n, l, m]);

test("ψ matches SciPy at random points for every state n ≤ 7", () => {
  let worst = 0;
  for (const { n, l, m, xyz, psi: expected } of ref.psi_points) {
    const got = psi(n, l, m, ...xyz);
    const scale = Math.max(Math.abs(expected), 1e-12);
    worst = Math.max(worst, Math.abs(got - expected) / scale);
    assert.ok(Math.abs(got - expected) <= 1e-9 + 1e-7 * Math.abs(expected),
      `ψ(${n},${l},${m}) at ${xyz}: got ${got}, expected ${expected}`);
  }
  console.log(`    worst relative error ${worst.toExponential(2)} over ${ref.psi_points.length} points`);
});

test("closed-form ⟨r⟩ and ⟨r²⟩ match numerical integration", () => {
  for (const { n, l, norm, r, r2 } of ref.radial_moments) {
    assert.ok(Math.abs(norm - 1) < 1e-8, `R_${n}${l} not normalized: ${norm}`);
    assert.ok(Math.abs(meanR(n, l) - r) < 1e-6 * r, `⟨r⟩ ${n}${l}`);
    assert.ok(Math.abs(meanR2(n, l) - r2) < 1e-6 * r2, `⟨r²⟩ ${n}${l}`);
  }
});

test("energies are −13.6 eV / n²", () => {
  assert.ok(Math.abs(energyEV(1) + 13.6057) < 1e-3);
  assert.ok(Math.abs(energyEV(2) - energyEV(3) + 1.8896) < 1e-3); // Balmer-α, 656 nm
});

test("quantum number rules", () => {
  assert.ok(isValid(3, 2, -2));
  assert.ok(!isValid(2, 2, 0));  // l < n
  assert.ok(!isValid(3, 1, 2));  // |m| ≤ l
  assert.ok(!isValid(0, 0, 0));  // n ≥ 1
});

test("sampler tables are normalized for every state", () => {
  for (const [n, l, m] of STATES) {
    const { norms } = buildTables(n, l, m);
    for (const v of norms) assert.ok(Math.abs(v - 1) < 1e-4, `(${n},${l},${m}) norm ${v}`);
  }
});

// Monte Carlo moments of sampled clouds vs exact values. With N samples the
// statistical error is ~σ/√N; we allow 5 standard errors.
test("sampled clouds reproduce ⟨r⟩, ⟨r²⟩, ⟨z²⟩ and ⟨x²⟩ for every state", () => {
  const N = 40000;
  const ranks = makeRanks(N, 7);
  const angRef = new Map(ref.angular_moments.map((a) => [`${a.l},${a.m}`, a]));
  for (const [n, l, m] of STATES) {
    const xyz = toCartesian(sampleState(buildTables(n, l, m), ranks).sph);
    let s1 = 0, s2 = 0, s4 = 0, sz = 0, sx = 0;
    for (let i = 0; i < N; i++) {
      const x = xyz[3 * i], y = xyz[3 * i + 1], z = xyz[3 * i + 2];
      const rr = x * x + y * y + z * z;
      s1 += Math.sqrt(rr); s2 += rr; s4 += rr * rr; sz += z * z; sx += x * x;
    }
    const r2 = meanR2(n, l);
    const sigmaR = Math.sqrt(r2 - meanR(n, l) ** 2);
    const sigmaR2 = Math.sqrt(s4 / N - r2 * r2);
    const tol = (sigma) => 5 * sigma / Math.sqrt(N) + 1e-3 * r2;
    const { cos2, x2 } = angRef.get(`${l},${m}`);
    const label = `(${n},${l},${m})`;
    assert.ok(Math.abs(s1 / N - meanR(n, l)) < tol(sigmaR), `${label} ⟨r⟩ ${s1 / N} vs ${meanR(n, l)}`);
    assert.ok(Math.abs(s2 / N - r2) < tol(sigmaR2), `${label} ⟨r²⟩ ${s2 / N} vs ${r2}`);
    assert.ok(Math.abs(sz / N - cos2 * r2) < tol(sigmaR2), `${label} ⟨z²⟩ ${sz / N} vs ${cos2 * r2}`);
    assert.ok(Math.abs(sx / N - x2 * r2) < tol(sigmaR2), `${label} ⟨x²⟩ ${sx / N} vs ${x2 * r2}`);
  }
});

test("sampled signs agree with ψ evaluated at the sampled points", () => {
  const ranks = makeRanks(2000, 3);
  for (const [n, l, m] of [[2, 1, 0], [3, 2, 1], [4, 3, -2], [5, 0, 0]]) {
    const { sph, sign } = sampleState(buildTables(n, l, m), ranks);
    const xyz = toCartesian(sph);
    for (let i = 0; i < sign.length; i++) {
      const v = psi(n, l, m, xyz[3 * i], xyz[3 * i + 1], xyz[3 * i + 2]);
      if (Math.abs(v) > 1e-6) assert.equal(Math.sign(v), sign[i], `(${n},${l},${m}) sample ${i}`);
    }
  }
});
