// Where an orbital's nodes are: the surfaces on which ψ_nlm = 0 (real orbitals).
//
//   radial nodes  : spheres r = rₖ, the zeros of R_nl(r)            (n − l − 1 of them)
//   angular nodes : cones θ = θₖ, the zeros of P_l^|m|(cos θ) in (0, π)
//                   (θ = 90° is the flat x–y plane)                 (l − |m| of them)
//                 + planes through the z-axis at φ = φₖ, the zeros of
//                   cos(mφ) or sin(|m|φ) in [0, π)                  (|m| of them)
// Total: radial + angular = n − 1.

import { radial, legendre } from "./physics.js";
import { radialCutoff } from "./sampler.js";

/** Refine a sign change of f between a and b by bisection. */
function bisect(f, a, b, fa = f(a)) {
  for (let i = 0; i < 60; i++) {
    const mid = (a + b) / 2, fm = f(mid);
    if (Math.sign(fm) === Math.sign(fa)) { a = mid; fa = fm; } else b = mid;
  }
  return (a + b) / 2;
}

function zeros(f, lo, hi, steps) {
  const out = [];
  let prevX = lo, prev = f(lo);
  for (let i = 1; i <= steps; i++) {
    const x = lo + ((hi - lo) * i) / steps, v = f(x);
    if (prev !== 0 && v !== 0 && Math.sign(v) !== Math.sign(prev)) out.push(bisect(f, prevX, x, prev));
    prevX = x; prev = v;
  }
  return out;
}

export function nodeSet(n, l, m) {
  const am = Math.abs(m);
  const radii = zeros((r) => radial(n, l, r), 1e-6, radialCutoff(n), 4000);
  const cones = zeros((t) => legendre(l, am, Math.cos(t)), 1e-6, Math.PI - 1e-6, 2000);
  const planes = [];
  for (let k = 0; k < am; k++) planes.push(m > 0 ? ((2 * k + 1) * Math.PI) / (2 * am) : (k * Math.PI) / am);
  return { radii, cones, planes, radial: radii.length, angular: cones.length + planes.length };
}
