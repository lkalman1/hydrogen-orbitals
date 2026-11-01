"""
Hydrogen atom from the Schrödinger equation.

Everything is in atomic units (hbar = m_e = e = 4*pi*eps0 = 1), so lengths are in
Bohr radii (a0 = 0.529 Å) and energies in Hartree (1 Ha = 27.211 eV).

The time-independent Schrödinger equation for the electron in the proton's
Coulomb field,

    [-1/2 ∇² - 1/r] ψ = E ψ,

separates in spherical coordinates as ψ(r,θ,φ) = R_nl(r) Y_lm(θ,φ). With
u(r) = r R(r) the radial part becomes a 1D problem:

    -1/2 u''(r) + [ l(l+1)/(2r²) - 1/r ] u(r) = E u(r),   u(0) = u(∞) = 0.

This script does two things:
  1. Solves that radial equation *numerically* (finite differences -> matrix
     eigenvalue problem) and checks it against the exact answer E_n = -1/(2n²).
  2. Builds the full 3D wavefunctions from the analytic solution and visualizes
     them: radial probability, 2D density slices, and a 3D "electron cloud".

Run:  python hydrogen.py                 # all figures
      python hydrogen.py --orbital 3 2 0 # also a 3D cloud for a chosen (n, l, m)
"""

import argparse
import math
from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt
from scipy.linalg import eigh_tridiagonal
from scipy.special import genlaguerre

try:  # SciPy >= 1.15
    from scipy.special import sph_harm_y

    def Y_lm(l, m, theta, phi):
        return sph_harm_y(l, m, theta, phi)
except ImportError:  # older SciPy: sph_harm(m, l, azimuth, polar)
    from scipy.special import sph_harm

    def Y_lm(l, m, theta, phi):
        return sph_harm(m, l, phi, theta)


HARTREE_EV = 27.211386
L_LETTERS = "spdfghik"

# Colors: a sequential single-hue map for probability density, and a
# diverging blue/red pair for the sign (phase) of the wavefunction.
DENSITY_CMAP = "Blues"
PHASE_POS, PHASE_NEG = "#2166ac", "#b2182b"
INK, MUTED = "#1f2328", "#6e7781"


# --------------------------------------------------------------------------
# 1. Numerical solution of the radial equation
# --------------------------------------------------------------------------
def solve_radial(l, r_max=80.0, n_points=6000, n_states=4):
    """Finite-difference solution of the radial equation for angular momentum l.

    Discretizing u'' with the 3-point stencil turns the ODE into a symmetric
    tridiagonal matrix H; its eigenvalues are the energies and its eigenvectors
    are u(r) sampled on the grid.
    """
    r = np.linspace(r_max / n_points, r_max, n_points)
    dr = r[1] - r[0]
    V_eff = l * (l + 1) / (2 * r**2) - 1 / r
    diag = 1 / dr**2 + V_eff
    off = np.full(n_points - 1, -0.5 / dr**2)
    E, U = eigh_tridiagonal(diag, off, select="i", select_range=(0, n_states - 1))
    U /= np.sqrt(dr)  # normalize so ∫ u² dr = 1
    return r, E, U


# --------------------------------------------------------------------------
# 2. Analytic solution
# --------------------------------------------------------------------------
def R_nl(n, l, r):
    """Normalized radial wavefunction R_nl(r)."""
    rho = 2 * r / n
    norm = math.sqrt((2 / n) ** 3 * math.factorial(n - l - 1) / (2 * n * math.factorial(n + l)))
    return norm * np.exp(-rho / 2) * rho**l * genlaguerre(n - l - 1, 2 * l + 1)(rho)


def real_Y(l, m, theta, phi):
    """Real spherical harmonics (the familiar p_x, d_xy, ... chemistry shapes)."""
    if m == 0:
        return Y_lm(l, 0, theta, phi).real
    Y = Y_lm(l, abs(m), theta, phi)
    return math.sqrt(2) * (-1) ** m * (Y.real if m > 0 else Y.imag)


def psi(n, l, m, x, y, z):
    """Real hydrogen orbital ψ_nlm evaluated at Cartesian points."""
    r = np.sqrt(x**2 + y**2 + z**2)
    theta = np.arccos(np.divide(z, r, out=np.zeros_like(r), where=r > 0))
    phi = np.arctan2(y, x)
    return R_nl(n, l, r) * real_Y(l, m, theta, phi)


def orbital_name(n, l, m):
    names = {(1, 1): "x", (1, -1): "y", (1, 0): "z",
             (2, 0): "z²", (2, 1): "xz", (2, -1): "yz", (2, 2): "x²−y²", (2, -2): "xy"}
    return f"{n}{L_LETTERS[l]}{names.get((l, m), '' if l == 0 else f' m={m}')}"


def validate(n, l, m):
    if not (n >= 1 and 0 <= l < n and -l <= m <= l):
        raise SystemExit(f"Invalid quantum numbers (n={n}, l={l}, m={m}): need n≥1, 0≤l<n, |m|≤l")


# --------------------------------------------------------------------------
# Figures
# --------------------------------------------------------------------------
def style_axes(ax):
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(MUTED)
    ax.tick_params(colors=MUTED, labelsize=9)
    ax.grid(alpha=0.25, linewidth=0.6)


def fig_energy_levels(out):
    """Numerical eigenvalues vs. the exact Bohr levels -13.6 eV / n²."""
    fig, ax = plt.subplots(figsize=(7, 5.5))
    print("\nEnergy levels (eV)      numerical     exact     error")
    for l in range(3):
        _, E, _ = solve_radial(l, n_states=4 - l)
        for k, e in enumerate(E):
            n = l + 1 + k
            exact = -0.5 / n**2 * HARTREE_EV
            e_ev = e * HARTREE_EV
            print(f"  {n}{L_LETTERS[l]:<20} {e_ev:10.5f} {exact:10.5f} {e_ev - exact:+.1e}")
            ax.hlines(e_ev, l - 0.32, l + 0.32, color=PHASE_POS, linewidth=2)
            ax.text(l + 0.38, e_ev, f"{n}{L_LETTERS[l]}", va="center", fontsize=9, color=INK)
    for n in range(1, 5):
        exact = -0.5 / n**2 * HARTREE_EV
        ax.axhline(exact, color=MUTED, linestyle=":", linewidth=1, zorder=0)
        ax.text(-1.25, exact, f"n={n}: {exact:.2f} eV", va="bottom", ha="left", fontsize=8, color=MUTED)
    ax.set_xticks(range(3), [f"l = {l} ({L_LETTERS[l]})" for l in range(3)])
    ax.set_xlim(-1.3, 2.7)
    ax.set_ylabel("Energy (eV)", color=INK)
    ax.set_title("Energy levels: numerical eigenvalues (bars) vs exact −13.6 eV/n² (dotted)",
                 fontsize=11, color=INK, loc="left")
    style_axes(ax)
    ax.grid(False)
    fig.tight_layout()
    fig.savefig(out, dpi=150)
    plt.close(fig)


def fig_radial(out):
    """Radial probability P(r) = r²|R|² — numerical points on analytic curves."""
    states = [(1, 0), (2, 0), (2, 1), (3, 0), (3, 1), (3, 2)]
    fig, axes = plt.subplots(2, 3, figsize=(12, 6.5), sharex=True)
    for ax, (n, l) in zip(axes.flat, states):
        r, _, U = solve_radial(l, r_max=40, n_points=3000, n_states=n - l)
        P_num = U[:, n - l - 1] ** 2
        P_exact = r**2 * R_nl(n, l, r) ** 2
        ax.plot(r, P_exact, color=PHASE_POS, linewidth=2, label="analytic")
        ax.plot(r[::60], P_num[::60], "o", markersize=4, color=INK,
                markerfacecolor="white", markeredgewidth=1, label="numerical")
        r_peak = r[np.argmax(P_exact)]
        ax.axvline(r_peak, color=MUTED, linestyle=":", linewidth=1)
        ax.set_title(f"{n}{L_LETTERS[l]}   (most likely r ≈ {r_peak:.1f} a₀)",
                     fontsize=10, color=INK, loc="left")
        ax.set_xlim(0, 30)
        style_axes(ax)
    axes[0, 0].legend(frameon=False, fontsize=9)
    for ax in axes[1]:
        ax.set_xlabel("r (Bohr radii)", color=INK)
    for ax in axes[:, 0]:
        ax.set_ylabel("P(r) = r²|R(r)|²", color=INK)
    fig.suptitle("Radial probability density", fontsize=13, color=INK, x=0.01, ha="left")
    fig.tight_layout()
    fig.savefig(out, dpi=150)
    plt.close(fig)


def fig_slices(out):
    """|ψ|² in the x–z plane for a gallery of orbitals."""
    orbitals = [(1, 0, 0), (2, 0, 0), (2, 1, 0), (2, 1, 1),
                (3, 0, 0), (3, 1, 0), (3, 2, 0), (3, 2, 2),
                (4, 1, 0), (4, 2, 0), (4, 3, 0), (4, 3, 1)]
    fig, axes = plt.subplots(3, 4, figsize=(13, 10))
    for ax, (n, l, m) in zip(axes.flat, orbitals):
        extent = 5 * n**2 / 2 + 4  # box scales roughly with orbital size ~ n²
        g = np.linspace(-extent, extent, 400)
        X, Z = np.meshgrid(g, g)
        density = psi(n, l, m, X, np.zeros_like(X), Z) ** 2
        ax.imshow(np.sqrt(density / density.max()),  # sqrt boosts faint outer lobes
                  extent=(-extent, extent, -extent, extent), origin="lower", cmap=DENSITY_CMAP)
        ax.set_title(orbital_name(n, l, m), fontsize=11, color=INK)
        ax.set_xticks([]); ax.set_yticks([])
        ax.text(0.03, 0.03, f"±{extent:.0f} a₀", transform=ax.transAxes, fontsize=8, color=MUTED)
    fig.suptitle("Probability density |ψ|² in the x–z plane (darker = more likely)",
                 fontsize=13, color=INK, x=0.01, ha="left")
    fig.tight_layout()
    fig.savefig(out, dpi=150)
    plt.close(fig)


def sample_cloud(n, l, m, n_points=20000, seed=0):
    """Draw electron positions from |ψ|² by rejection sampling."""
    rng = np.random.default_rng(seed)
    extent = 3 * n**2 + 6
    g = np.linspace(-extent, extent, 60)
    X, Y, Z = np.meshgrid(g, g, g)
    p_max = 1.2 * (psi(n, l, m, X, Y, Z) ** 2).max()
    pts, signs = [], []
    while sum(len(p) for p in pts) < n_points:
        xyz = rng.uniform(-extent, extent, size=(200_000, 3))
        val = psi(n, l, m, *xyz.T)
        keep = rng.uniform(0, p_max, len(val)) < val**2
        pts.append(xyz[keep]); signs.append(np.sign(val[keep]))
    return np.concatenate(pts)[:n_points], np.concatenate(signs)[:n_points], extent


def fig_cloud(n, l, m, out):
    validate(n, l, m)
    xyz, sign, extent = sample_cloud(n, l, m)
    fig = plt.figure(figsize=(7, 7))
    ax = fig.add_subplot(projection="3d")
    for s, color, label in ((1, PHASE_POS, "ψ > 0"), (-1, PHASE_NEG, "ψ < 0")):
        sel = sign == s
        if sel.any():
            ax.scatter(*xyz[sel].T, s=1, alpha=0.25, color=color, label=label, depthshade=False)
    lim = extent * 0.8
    ax.set(xlim=(-lim, lim), ylim=(-lim, lim), zlim=(-lim, lim),
           xlabel="x (a₀)", ylabel="y (a₀)", zlabel="z (a₀)")
    ax.set_box_aspect((1, 1, 1))
    ax.set_title(f"{orbital_name(n, l, m)} electron cloud — {len(xyz):,} samples of |ψ|²",
                 fontsize=11, color=INK)
    if l > 0:
        ax.legend(markerscale=8, frameon=False, loc="upper left")
    fig.tight_layout()
    fig.savefig(out, dpi=150)
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--orbital", nargs=3, type=int, metavar=("N", "L", "M"),
                        help="extra 3D electron cloud for this orbital (real-orbital m)")
    parser.add_argument("--out", default="figures", help="output directory")
    parser.add_argument("--show", action="store_true", help="open the 3D cloud interactively")
    args = parser.parse_args()

    out = Path(args.out)
    out.mkdir(exist_ok=True)
    fig_energy_levels(out / "1_energy_levels.png")
    fig_radial(out / "2_radial_probability.png")
    fig_slices(out / "3_orbital_slices.png")
    fig_cloud(2, 1, 0, out / "4_cloud_2pz.png")
    fig_cloud(3, 2, 0, out / "5_cloud_3dz2.png")
    if args.orbital:
        n, l, m = args.orbital
        fig_cloud(n, l, m, out / f"cloud_{n}{l}{m}.png")
        if args.show:
            plt.switch_backend("TkAgg")
            xyz, sign, _ = sample_cloud(n, l, m)
            ax = plt.figure().add_subplot(projection="3d")
            ax.scatter(*xyz.T, s=1, alpha=0.3, c=np.where(sign > 0, PHASE_POS, PHASE_NEG))
            plt.show()
    print(f"\nFigures written to {out.resolve()}/")


if __name__ == "__main__":
    main()
