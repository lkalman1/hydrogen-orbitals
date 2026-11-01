"""
Export reference values from the SciPy implementation in hydrogen.py so the
JavaScript physics core (web/physics.js, web/sampler.js) can be tested against it.

    python tests/export_reference.py   ->  tests/reference.json
"""

import json
import sys
from pathlib import Path

import numpy as np
from scipy.integrate import quad

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from hydrogen import R_nl, real_Y, psi  # noqa: E402

MAX_N = 7
rng = np.random.default_rng(42)

states = [(n, l, m) for n in range(1, MAX_N + 1) for l in range(n) for m in range(-l, l + 1)]

# ψ at random points spread over each orbital's extent.
psi_points = []
for n, l, m in states:
    pts = rng.normal(scale=n * n, size=(12, 3))
    vals = psi(n, l, m, pts[:, 0], pts[:, 1], pts[:, 2])
    psi_points += [{"n": n, "l": l, "m": m, "xyz": p.tolist(), "psi": float(v)} for p, v in zip(pts, vals)]

# Radial moments ⟨r⟩, ⟨r²⟩ by direct numerical integration (checks the closed forms too).
radial_moments = []
for n in range(1, MAX_N + 1):
    for l in range(n):
        norm = quad(lambda r: (r * R_nl(n, l, r)) ** 2, 0, np.inf, limit=200)[0]
        r1 = quad(lambda r: r**3 * R_nl(n, l, r) ** 2, 0, np.inf, limit=200)[0]
        r2 = quad(lambda r: r**4 * R_nl(n, l, r) ** 2, 0, np.inf, limit=200)[0]
        radial_moments.append({"n": n, "l": l, "norm": norm, "r": r1, "r2": r2})

# Angular moments of |Y|²: ⟨cos²θ⟩ and ⟨sin²θ cos²φ⟩ (= ⟨z²⟩/⟨r²⟩, ⟨x²⟩/⟨r²⟩).
# Gauss–Legendre in cosθ and a uniform φ grid are exact for these polynomials.
c, w = np.polynomial.legendre.leggauss(64)
phi = np.linspace(0, 2 * np.pi, 256, endpoint=False)
C, P = np.meshgrid(c, phi, indexing="ij")
W = w[:, None] * (2 * np.pi / len(phi))
angular_moments = []
for l in range(MAX_N):
    for m in range(-l, l + 1):
        Y2 = real_Y(l, m, np.arccos(C), P) ** 2
        angular_moments.append({
            "l": l, "m": m,
            "norm": float((Y2 * W).sum()),
            "cos2": float((Y2 * C**2 * W).sum()),
            "x2": float((Y2 * (1 - C**2) * np.cos(P) ** 2 * W).sum()),
        })

out = ROOT / "tests" / "reference.json"
out.write_text(json.dumps({
    "psi_points": psi_points,
    "radial_moments": radial_moments,
    "angular_moments": angular_moments,
}, indent=1))
print(f"wrote {len(psi_points)} ψ points, {len(radial_moments)} radial and "
      f"{len(angular_moments)} angular moments -> {out.relative_to(ROOT)}")
