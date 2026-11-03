// Node surfaces of real hydrogen orbitals.
import { test } from "node:test";
import assert from "node:assert/strict";
import { nodeSet } from "../web/nodes.js";
import { MAX_N } from "../web/physics.js";

const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: ${a} vs ${b}`);
const deg = (rad) => (rad * 180) / Math.PI;

test("radial nodes sit at the analytic zeros", () => {
  assert.deepEqual(nodeSet(1, 0, 0).radii, []);
  near(nodeSet(2, 0, 0).radii[0], 2, 1e-9, "2s");
  const [a, b] = nodeSet(3, 0, 0).radii;
  near(a, (9 - 3 * Math.sqrt(3)) / 2, 1e-9, "3s inner");
  near(b, (9 + 3 * Math.sqrt(3)) / 2, 1e-9, "3s outer");
  near(nodeSet(3, 1, 0).radii[0], 6, 1e-9, "3p");
  assert.deepEqual(nodeSet(3, 2, 0).radii, []);
});

test("angular nodes: planes and cones", () => {
  const p = nodeSet(2, 1, 0);
  assert.equal(p.cones.length, 1); near(deg(p.cones[0]), 90, 1e-6, "pz plane z=0");
  const px = nodeSet(2, 1, 1);
  assert.deepEqual(px.cones, []); near(deg(px.planes[0]), 90, 1e-9, "px: plane x=0 (φ=90°)");
  near(deg(nodeSet(2, 1, -1).planes[0]), 0, 1e-9, "py: plane y=0 (φ=0)");
  const dz2 = nodeSet(3, 2, 0);
  near(deg(dz2.cones[0]), deg(Math.acos(1 / Math.sqrt(3))), 1e-6, "dz² cone 54.7°");
  near(deg(dz2.cones[1]), 180 - deg(Math.acos(1 / Math.sqrt(3))), 1e-6, "dz² cone 125.3°");
  const dxy = nodeSet(3, 2, -2);
  assert.deepEqual(dxy.planes.map((p) => +deg(p).toFixed(6)), [0, 90]);
});

test("every orbital up to n = 7 has n − 1 nodes: (n − l − 1) radial + l angular", () => {
  for (let n = 1; n <= MAX_N; n++)
    for (let l = 0; l < n; l++)
      for (let m = -l; m <= l; m++) {
        const s = nodeSet(n, l, m);
        assert.equal(s.radial, n - l - 1, `radial ${n}${l}${m}`);
        assert.equal(s.angular, l, `angular ${n}${l}${m}`);
      }
});
