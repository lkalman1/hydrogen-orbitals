// "Go deeper" drawer content (undergraduate → early graduate level).
// <tex>…</tex> is inline maths, <tex display>…</tex> is display maths; both are
// rendered to MathML by KaTeX when the drawer opens.

export const DEEPER = {
  journey: {
    title: "What this journey covers",
    html: `
      <p>We follow the non-relativistic Schrödinger equation for one electron bound to a proton,</p>
      <tex display>\\left[-\\frac{\\hbar^2}{2m_e}\\nabla^2 - \\frac{e^2}{4\\pi\\varepsilon_0 r}\\right]\\psi = E\\psi ,</tex>
      <p>whose bound states are labelled by three integers <tex>n \\ge 1</tex>, <tex>0 \\le l \\le n-1</tex>,
      <tex>-l \\le m \\le l</tex>. Each chapter introduces one of them through a physical process that changes it.</p>
      <p>Everything you see is computed live from the exact solutions; the code is tested against an
      independent SciPy implementation to about 10<sup>−12</sup>.</p>`,
  },
  proton: {
    title: "The proton",
    html: `
      <ul>
        <li>Charge <tex>+e = 1.602\\times10^{-19}\\,\\mathrm{C}</tex>; mass <tex>m_p = 1836.15\\,m_e</tex>.</li>
        <li>Charge radius ≈ 0.84 fm, about <tex>1.6\\times10^{-5}\\,a_0</tex>. On screen it is drawn thousands of times too large so you can see it.</li>
        <li>We treat it as a fixed point charge. Its finite mass (the reduced-mass correction, 0.054%) and its size shift energies only slightly.</li>
        <li>The proton is itself made of quarks and gluons, but at atomic scales only its charge, mass, spin and magnetic moment matter.</li>
      </ul>`,
  },
  electron: {
    title: "The electron, and why it doesn't orbit",
    html: `
      <p>A classical electron circling the proton would radiate (Larmor) and spiral in within about
      <tex>10^{-11}</tex> s. Quantum mechanically there is a lowest-energy state, and it is
      <em>stationary</em>: its probability density does not change in time.</p>
      <p>The attraction is the Coulomb potential <tex>V(r) = -\\dfrac{e^2}{4\\pi\\varepsilon_0 r}</tex>.
      In atomic units (<tex>\\hbar = m_e = e = 4\\pi\\varepsilon_0 = 1</tex>) this is simply <tex>V = -1/r</tex>,
      lengths are in Bohr radii <tex>a_0 = 0.0529\\,\\mathrm{nm}</tex>, and energies in Hartree (27.211 eV).</p>`,
  },
  orbital: {
    title: "The ground state, 1s",
    html: `
      <tex display>\\psi_{100}(r) = \\frac{1}{\\sqrt{\\pi a_0^3}}\\,e^{-r/a_0}, \\qquad E_1 = -13.6\\,\\mathrm{eV}</tex>
      <p><b>Born rule:</b> the probability of finding the electron in a small volume <tex>dV</tex> is
      <tex>|\\psi|^2\\,dV</tex>. Each dot on screen is an exact random sample from this distribution.</p>
      <p>The density <tex>|\\psi|^2</tex> is largest <em>at</em> the nucleus, yet the most likely <em>distance</em>
      is <tex>a_0</tex>: the radial probability <tex>P(r) = 4\\pi r^2|\\psi|^2</tex> includes the growing area of each shell.</p>
      <p>Stationary: <tex>\\Psi(\\mathbf r,t) = \\psi(\\mathbf r)\\,e^{-iE_1 t/\\hbar}</tex>, so <tex>|\\Psi|^2</tex>
      never changes. The camera rotates; the atom does not.</p>`,
  },
  "three-numbers": {
    title: "The three quantum numbers",
    html: `
      <tex display>\\psi_{nlm}(r,\\theta,\\varphi) = R_{nl}(r)\\,Y_{lm}(\\theta,\\varphi)</tex>
      <ul>
        <li><b>n</b> (principal) fixes the energy <tex>E_n = -13.6\\,\\mathrm{eV}/n^2</tex> and the size, <tex>\\langle r\\rangle = \\tfrac12[3n^2 - l(l+1)]\\,a_0</tex>.</li>
        <li><b>l</b> (orbital angular momentum) fixes <tex>|\\mathbf L|^2 = l(l+1)\\hbar^2</tex> and the number of angular nodes.</li>
        <li><b>m</b> (magnetic) fixes <tex>L_z = m\\hbar</tex>, the orientation relative to a chosen axis.</li>
      </ul>
      <p>Total nodes: <tex>(n-l-1)</tex> radial + <tex>l</tex> angular = <tex>n-1</tex>.</p>
      <p><b>Simplified here:</b> no electron spin, no relativity (fine structure, ~10<sup>−5</sup> eV),
      no QED (Lamb shift), no hyperfine structure (the 21 cm line), and a fixed point proton.
      These shift energies by tiny amounts and are introduced where they matter.</p>`,
  },
  measurement: {
    title: "What a measurement means here",
    html: `
      <p>A position measurement gives one point, drawn at random with probability density
      <tex>|\psi(\mathbf r)|^2</tex> (the Born rule). Measuring also changes the state ("collapse"),
      so a second measurement on the <em>same</em> atom wouldn't come from 1s any more.</p>
      <p>So each dot here stands for <b>a fresh hydrogen atom, prepared in 1s and measured once</b>:
      an ensemble, which is exactly how probabilities are tested in the lab.</p>
      <p>Real experiments come remarkably close to this picture. In 2013, photoionization microscopy
      imaged the nodal structure of hydrogen's electron cloud (in an applied electric field) directly
      on a detector, one electron at a time.</p>`,
  },
  randomness: {
    title: "Is it really random?",
    html: `
      <p>Quantum mechanics predicts only the <em>distribution</em> <tex>|\psi|^2</tex>, not individual outcomes.
      Could hidden details secretly fix each result? Bell's theorem (1964) shows that no <em>local</em>
      hidden-variable theory can reproduce all quantum predictions, and Bell-test experiments
      (Nobel Prize 2022: Aspect, Clauser, Zeilinger) agree with quantum mechanics.</p>
      <p>The randomness on screen comes from a seeded pseudo-random generator mapped through the exact
      cumulative distributions of <tex>r</tex>, <tex>\cos\theta</tex> and <tex>\varphi</tex>,
      so every dot is an exact sample of <tex>|\psi_{100}|^2</tex>.</p>`,
  },
  "radial-probability": {
    title: "The radial distribution",
    html: `
      <p>Integrating <tex>|\psi_{100}|^2</tex> over a thin shell of radius <tex>r</tex> gives</p>
      <tex display>P(r) = 4\pi r^2 |\psi_{100}|^2 = \frac{4r^2}{a_0^3}\,e^{-2r/a_0}.</tex>
      <ul>
        <li>Most likely distance (peak): <tex>r = a_0 = 0.0529\,\mathrm{nm}</tex>.</li>
        <li>Average distance: <tex>\langle r\rangle = \tfrac32 a_0</tex>; median ≈ <tex>1.34\,a_0</tex>. Average, median and most likely are all different, because the distribution has a long tail.</li>
        <li>Spread: <tex>\sigma_r = \sqrt{\langle r^2\rangle - \langle r\rangle^2} = \tfrac{\sqrt3}{2}a_0</tex>, so the measured average converges like <tex>0.87\,a_0/\sqrt N</tex>. Watch it settle at 1.5 in the chart.</li>
      </ul>
      <p>The histogram shows counts divided by <tex>N\,\Delta r</tex>, so it converges to <tex>P(r)</tex> (dashed).</p>`,
  },
  orbital: {
    title: "The orbital as a probability map",
    html: `
      <p>An orbital is the wavefunction <tex>\psi_{nlm}(\mathbf r)</tex>; the cloud you see is its
      probability density <tex>|\psi|^2</tex>, normalised so that</p>
      <tex display>\int |\psi|^2\,dV = 1 .</tex>
      <p>The density of 1s is largest <em>at</em> the nucleus, <tex>|\psi_{100}(0)|^2 = 1/(\pi a_0^3)</tex>,
      even though the most likely <em>distance</em> is <tex>a_0</tex>: there is very little volume close to a point.</p>
      <p>Is the electron "really" spread out, or just unknown until measured? Interpretations differ;
      the predictions, which are all that's tested, are the same.</p>`,
  },
  "bohr-radius": {
    title: "The Bohr radius",
    html: `
      <tex display>a_0 = \frac{4\pi\varepsilon_0\hbar^2}{m_e e^2} = 5.29177\times10^{-11}\,\mathrm{m}</tex>
      <p>It is the length where the electron's kinetic energy (confinement, <tex>\sim\hbar^2/m_e r^2</tex>)
      balances its Coulomb energy (<tex>\sim e^2/4\pi\varepsilon_0 r</tex>): squeeze the electron closer
      and its kinetic energy rises faster than its potential energy falls. That balance, the uncertainty
      principle in action, is why atoms don't collapse.</p>
      <p>Bohr's 1913 model put the electron on a circle of exactly this radius. Quantum mechanics keeps the
      number but replaces the circle with the cloud: <tex>a_0</tex> becomes the most likely distance.</p>
      <p>With the proton's finite mass, the effective radius is 0.054% larger.</p>`,
  },
  stationary: {
    title: "Stationary states",
    html: `
      <p>The full time-dependent wavefunction of an energy eigenstate is</p>
      <tex display>\Psi(\mathbf r,t) = \psi(\mathbf r)\,e^{-iEt/\hbar},</tex>
      <p>so <tex>|\Psi|^2 = |\psi|^2</tex> at all times: the density, and every expectation value, is constant.
      A classical orbiting charge would radiate; a stationary state has no oscillating charge, so 1s
      is perfectly stable.</p>
      <p>Change only comes from superpositions of different energies, which beat at
      <tex>(E_2-E_1)/\hbar</tex>. That is how atoms absorb and emit light, which is the next chapter.</p>`,
  },
  "energy-levels": {
    title: "Hydrogen's energy levels",
    html: `
      <tex display>E_n = -\frac{\mu}{m_e}\,\frac{13.6057\,\mathrm{eV}}{n^2} = -\frac{13.598\,\mathrm{eV}}{n^2}</tex>
      <p>Energies are negative because the electron is <em>bound</em>: zero means it has just escaped.
      The levels crowd together toward zero, and above it the electron is free (a continuum).</p>
      <p><tex>\mu = m_e m_p/(m_e + m_p)</tex> is the reduced mass: the proton recoils slightly,
      lowering every energy by 0.054%. All energies and wavelengths in this chapter include it;
      without it, Hα would be predicted at 656.11 nm instead of the measured 656.47 nm.</p>
      <p>The ladder on the left is drawn to scale. Only the energy depends on <tex>n</tex> in this
      model, so 3s, 3p and 3d sit on the same rung.</p>`,
  },
  "two-photon": {
    title: "Two-photon absorption: the 1S–2S line",
    html: `
      <p>Energy conservation: <tex>2\hbar\omega = E_2 - E_1 = 10.199\,\mathrm{eV}</tex>, so each photon has
      <tex>\lambda = 243.13\,\mathrm{nm}</tex> (ultraviolet). For 1s → 3s: 205.14 nm.</p>
      <ul>
        <li><b>Selection rules.</b> One photon changes <tex>l</tex> by ±1, so 1s → 2s is forbidden for a single photon. Two photons can give <tex>\Delta l = 0</tex> or ±2.</li>
        <li><b>Counter-propagating beams.</b> A moving atom sees one beam blue-shifted and the other red-shifted by the same amount; absorbing one photon from each cancels the first-order Doppler shift. That is why the photons arrive from both sides.</li>
        <li><b>Precision.</b> The 2s state lives 0.12 s, so the line is only ~1.3 Hz wide. It has been measured as 2,466,061,413,187,035 Hz (±10 Hz), one of the most precise measurements in physics. Here the tolerance is ~0.25 nm, about 10<sup>13</sup> times more forgiving.</li>
        <li><b>Detection.</b> In the lab, a third 243 nm photon ionizes the 2s atom, and the freed electron is counted.</li>
      </ul>
      <p><b>The animation.</b> While the laser drives the transition, the electron is in a genuine superposition
      <tex>\Psi = c\,\psi_{1s}e^{-iE_1t/\hbar} + s\,\psi_{2s}e^{-iE_2t/\hbar}</tex>, whose density
      <tex>c^2\psi_{1s}^2 + s^2\psi_{2s}^2 + 2cs\,\psi_{1s}\psi_{2s}\cos(\Delta E\,t/\hbar)</tex> "breathes"
      in and out. Each particle is an exact sample of <tex>\tfrac12(\psi_{1s}^2 + \psi_{2s}^2)</tex>, drawn with
      brightness <tex>|\Psi|^2/q</tex>, so the picture is exact at every instant. The real beat period is 0.4 fs:
      it is slowed about 10<sup>15</sup> times.</p>`,
  },
  decay: {
    title: "Spontaneous emission and quantum jumps",
    html: `
      <p>An excited state isn't truly stationary once the electromagnetic field is quantized: it decays,
      emitting a photon, at the Einstein rate</p>
      <tex display>A_{nl\to n'l'} = \frac{4\,\omega^3}{3c^3}\,\frac{\max(l,l')}{2l+1}\,\Big|\!\int R_{nl}R_{n'l'}\,r^3\,dr\Big|^2 \quad(\text{a.u.}).</tex>
      <p>Computed here from the exact radial functions (and checked against tabulated values):</p>
      <ul>
        <li>2p: 1.60 ns · 3s: 158 ns · 3p: 5.27 ns · 3d: 15.5 ns</li>
        <li>3p decays to 1s 88% of the time and to 2s 12% of the time; the path is chosen at random with these odds.</li>
        <li>2s can't decay by one photon. It emits <em>two</em> photons sharing 10.2 eV (a continuous spectrum), with a lifetime of 0.12 s.</li>
      </ul>
      <p><b>The animation.</b> The moment of decay is random (exponential waiting times, slowed to about a second).
      An undriven atom that decays doesn't oscillate coherently: averaged over the unknown emission time it is a
      statistical <em>mixture</em> of the two states, so these jumps are drawn without the beat seen during
      laser absorption.</p>`,
  },
  size: {
    title: "How big is level n?",
    html: `
      <tex display>\langle r\rangle_{nl} = \tfrac12\left[3n^2 - l(l+1)\right] a_0</tex>
      <p>For s states: 1.5, 6 and 13.5 <tex>a_0</tex> for n = 1, 2, 3, a ratio of 1 : 4 : 9. The cloud's size grows
      like <tex>n^2</tex> while its binding energy shrinks like <tex>1/n^2</tex>.</p>
      <p>Radial nodes are zeros of the Laguerre polynomial in <tex>R_{n0}</tex>: 2s at <tex>r = 2a_0</tex>; 3s at
      <tex>r = (9 \mp 3\sqrt3)/2\,a_0</tex> = 1.90 and 7.10 <tex>a_0</tex>.</p>
      <p>Highly excited "Rydberg atoms" with n ≈ 100 are about a micrometre across and are used today as
      sensitive detectors and quantum-computing qubits.</p>`,
  },
  spectrum: {
    title: "Hydrogen's spectrum",
    html: `
      <p>Every emitted wavelength satisfies the Rydberg formula</p>
      <tex display>\frac1\lambda = R_\mathrm{H}\left(\frac1{n_1^2} - \frac1{n_2^2}\right), \qquad R_\mathrm{H} = 1.09678\times10^{7}\,\mathrm{m^{-1}}.</tex>
      <ul>
        <li><b>Lyman series</b> (down to n = 1): ultraviolet, from 121.6 nm.</li>
        <li><b>Balmer series</b> (down to n = 2): visible, with Hα 656.5 (red), Hβ 486.3 (cyan), Hγ 434.2, Hδ 410.3 nm (violet). Johann Balmer found the pattern empirically in 1885; Bohr explained it in 1913.</li>
        <li><b>Paschen series</b> (down to n = 3): infrared, from 1875 nm.</li>
      </ul>
      <p>Hot hydrogen clouds (H II regions, like the Orion Nebula) glow red from Hα. Comparing the lines of distant
      galaxies with these lab values gives their redshifts, which is how cosmic expansion was measured.</p>
      <p>Try the 4s, 5s and 6s lines (around 194.5, 189.9 and 187.6 nm): their cascades complete the Balmer set.</p>`,
  },
  "photon-spin": {
    title: "A photon's angular momentum",
    html: `
      <p>A photon is a spin-1 particle: it carries angular momentum of magnitude <tex>\hbar</tex> along its
      direction of travel (helicity ±1). Circularly polarized light is made of photons with one definite
      helicity; linearly polarized light is a superposition of both.</p>
      <p>Absorbing a photon, the atom must take up that angular momentum. In the dipole approximation the
      transition amplitude is <tex>\langle n'l'm'|\,\boldsymbol\epsilon\cdot\mathbf r\,|nlm\rangle</tex>, and
      <tex>\mathbf r</tex> is a rank-1 tensor (it behaves like <tex>Y_{1q}</tex>), so</p>
      <tex display>\Delta l = \pm 1, \qquad \Delta m = 0, \pm1 .</tex>
      <p>Here the laser comes from the left polarized vertically (along z), giving <tex>\Delta m = 0</tex>: the
      electron lands in <tex>2p_z</tex>, and during the transition the superposition <tex>1s + 2p_z</tex> sloshes
      up and down at the beat frequency. That oscillating charge is exactly the "antenna" that absorbs
      (or emits) the light.</p>
      <p>Single-photon lines from 1s (the Lyman series): 121.57 nm (2p), 102.57 nm (3p), 97.25 nm (4p)…
      Air absorbs these wavelengths, so real experiments run in vacuum, hence "vacuum ultraviolet".</p>`,
  },
  "p-orbital": {
    title: "The 2p orbital",
    html: `
      <tex display>\psi_{210} = \frac{1}{4\sqrt{2\pi}\,a_0^{3/2}}\,\frac{r}{a_0}\,e^{-r/2a_0}\cos\theta</tex>
      <p>The <tex>\cos\theta</tex> factor is positive above the x–y plane and negative below (blue and orange):
      the plane <tex>\theta = 90^\circ</tex> is an <em>angular node</em>. There is no radial node
      (<tex>n - l - 1 = 0</tex>).</p>
      <p><tex>|\mathbf L|^2 = l(l+1)\hbar^2 = 2\hbar^2</tex>. This <tex>2p_z</tex> state has <tex>L_z = 0</tex>: its
      angular momentum points somewhere in the x–y plane, but not in any definite direction.</p>
      <p>Same energy as 2s in this model (−3.40 eV). In real hydrogen 2s₁/₂ sits 1.06 GHz (4.4 µeV) above
      2p₁/₂: the Lamb shift.</p>`,
  },
  "selection-rules": {
    title: "Selection rules",
    html: `
      <p>For one photon (electric dipole):</p>
      <tex display>\Delta l = \pm1, \quad \Delta m \in \{0, \pm1\}, \quad \text{parity flips}.</tex>
      <p>So from 1s, one photon can only reach np states. Tuning to the energy of level 2 gives 2p and never 2s;
      the energy of level 3 gives 3p, never 3s or 3d. (In this model 2s and 2p have exactly the same energy;
      in reality the Lamb shift separates them, and the 2s lies off the photon's path anyway.)</p>
      <ul>
        <li>Two photons: <tex>\Delta l = 0, \pm2</tex>, which is why Chapter 2 needed two to reach 2s.</li>
        <li>Rules can be broken weakly by higher-order processes (magnetic dipole, electric quadrupole), with rates
        millions of times smaller.</li>
      </ul>`,
  },
  centrifugal: {
    title: "The centrifugal barrier",
    html: `
      <p>With <tex>u = rR</tex>, the radial equation contains an effective potential</p>
      <tex display>V_\text{eff}(r) = \frac{l(l+1)\hbar^2}{2m_e r^2} - \frac{e^2}{4\pi\varepsilon_0 r}.</tex>
      <p>The first term is the energy of rotation. It blows up as <tex>r \to 0</tex> for <tex>l > 0</tex>, so the
      wavefunction is pushed out: near the nucleus <tex>R_{nl} \propto r^l</tex>, and the density goes like
      <tex>r^{2l}</tex>. Only s states (<tex>l = 0</tex>) have <tex>|\psi(0)|^2 \ne 0</tex>.</p>
      <p>That matters: effects that need the electron <em>at</em> the nucleus (the Darwin term, hyperfine contact
      interaction, the proton-size shift) act only on s states.</p>`,
  },
  "node-trade": {
    title: "Trading radial nodes for angular ones",
    html: `
      <p>Every orbital has <tex>n-1</tex> nodes: <tex>n-l-1</tex> radial spheres and <tex>l</tex> angular
      planes or cones. At <tex>n = 3</tex>:</p>
      <ul>
        <li>3s: spheres at 1.90 and 7.10 <tex>a_0</tex>.</li>
        <li>3p<sub>z</sub>: a sphere at 6 <tex>a_0</tex> and the plane <tex>z = 0</tex>.</li>
        <li>3d<sub>z²</sub>: two cones at <tex>\cos^2\theta = 1/3</tex> (54.7° and 125.3°), no spheres.</li>
      </ul>
      <p>Since <tex>n - l - 1 \ge 0</tex>, <tex>l \le n-1</tex>: there are no 3f states. More nodes mean more
      "wiggles" and more kinetic energy; in hydrogen the angular and radial wiggles happen to cost exactly the
      same, so all shapes at level <tex>n</tex> share one energy.</p>`,
  },
  degeneracy: {
    title: "Why s, p and d share an energy (almost)",
    html: `
      <p>In a general central potential, energy depends on both <tex>n</tex> and <tex>l</tex>. The pure
      <tex>1/r</tex> potential has an extra, hidden symmetry (SO(4), from the conserved Runge–Lenz vector, the
      same reason classical Kepler orbits don't precess), which makes all <tex>l</tex> at a given <tex>n</tex>
      degenerate: <tex>n^2</tex> states per level.</p>
      <p>Real hydrogen breaks this slightly. Fine structure (relativity + spin) splits levels by
      <tex>\sim\alpha^2</tex> ≈ 10⁻⁵ relative; the Lamb shift (QED) splits 2s from 2p by 1.06 GHz. Those GHz
      gaps are why <em>microwave</em> photons can step <tex>l</tex>, a real technique for preparing high-<tex>l</tex>
      Rydberg states. The microwave transitions here are drawn without a beat, since in this model the energies
      are exactly equal.</p>`,
  },
  "coming-soon": {
    title: "Under construction",
    html: `<p>This chapter's interactive content arrives in a later milestone. The full design
      (beats, physics, and caveats) is in the project tracker.</p>`,
  },
};
