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
  "coming-soon": {
    title: "Under construction",
    html: `<p>This chapter's interactive content arrives in a later milestone. The full design
      (beats, physics, and caveats) is in the project tracker.</p>`,
  },
};
