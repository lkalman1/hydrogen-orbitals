// ⓘ content for every lab feature, in three layers:
//   short   one line (tooltip, and the top of the card)
//   what    a plain-words explanation of what the feature does
//   physics the details with equations (an entry in story/deeper.js, or HTML here)

import { DEEPER } from "../story/deeper.js";

const html = (title, body) => ({ title, html: body });

export const INFO = {
  measure: {
    title: "Measure",
    short: "Find out where the electron is. Each measurement gives one dot.",
    what: "Tap to look for the electron once; hold to look thousands of times. Every dot is one result. No two land in the same place, and they never trace a path. The cloud you see everywhere in this lab is simply where measurements land: bright where the electron is likely to be found. The histogram compares how far from the proton your dots landed with the exact prediction.",
    physics: ["measurement", "radial-probability", "randomness"],
  },
  light: {
    title: "Light",
    short: "Fire photons at the atom. Only exact energy steps are absorbed.",
    what: "The ladder shows the energies the atom is allowed to have. Tap a rung to aim at it (or drag the arrow's tip): the arrow's length is the energy you'll send. If it lands exactly on a rung, the atom swallows the light and jumps up; otherwise the light passes straight through. Choose one photon or two, and whether they twist. Too much energy knocks the electron out completely.",
    physics: ["energy-levels", "two-photon", "selection-rules"],
  },
  photons: {
    title: "One photon or two",
    short: "Two photons share the energy, and their twists can cancel.",
    what: "With two photons, each carries half the energy and they arrive from opposite sides. Their twists can cancel, so the atom can change level without changing shape (s stays s). A single photon always brings one unit of twist, so the shape must change by one step (s → p, p → s or d).",
    physics: ["two-photon", "photon-spin"],
  },
  twist: {
    title: "Twist",
    short: "Light can spin. Absorbing that spin makes the cloud swirl.",
    what: "Twisted (circularly polarized) light spins as it travels, one way or the other. It comes in along the vertical axis, and its spin goes into the electron: the cloud becomes a ring that swirls around that axis (m changes by ±1). Untwisted light comes from the side and leaves m alone. Two photons can twist the same way (m changes by 2) or opposite ways (they cancel).",
    physics: ["swirl", "photon-spin"],
  },
  letgo: {
    title: "Let go",
    short: "An excited atom falls back down, giving off light.",
    what: "Left alone, an excited atom drops down the ladder in random jumps, giving off one photon per step. The photon's colour is set by the size of the step, so every atom of hydrogen gives off the same set of colours: its spectrum. In reality this happens within nanoseconds; here time waits until you let go.",
    physics: ["decay", "spectrum"],
  },
  spectrum: {
    title: "Spectrum",
    short: "Every colour of light your atom has given off.",
    what: "Each line is a wavelength the atom emitted when it dropped down the ladder. The pattern is hydrogen's fingerprint: astronomers recognise it in stars and glowing gas clouds. Most lines are ultraviolet or infrared, invisible to us; the visible ones (red 656 nm, blue-green 486 nm, violet 434 and 410 nm) come from drops to level 2.",
    physics: ["spectrum"],
  },
  magnet: {
    title: "Magnet",
    short: "A swirling electron is a tiny magnet, so a field changes its energy.",
    what: "Turn on a magnetic field along the vertical axis. A cloud swirling one way now has slightly more energy than one swirling the other way, so each rung splits into sub-levels, one per value of m. The light you need depends on the twist you choose, and emitted lines split too. The real effect is tiny (micro-electronvolts); here it's magnified so you can see it.",
    physics: ["zeeman"],
  },
  view: {
    title: "View",
    short: "Change how the atom is drawn, or jump to any state.",
    what: "Jump straight to any state, freeze or show the swirl, show the surfaces where the electron is never found (nodes), and choose how many dots to draw. None of these change the physics, only what you see.",
    physics: ["quantum-numbers", "node-trade"],
  },
  scale: {
    title: "Scale",
    short: "Zoom out to see how small an atom really is.",
    what: "Drag to zoom out by powers of ten. The atom quickly becomes smaller than a pixel. Outlines show things of the size you're looking at: a molecule, a virus, a cell, a hair, your hand.",
    physics: ["scale"],
  },
  state: {
    title: "The state",
    short: "Three whole numbers describe every state of the electron.",
    what: "n is the rung: it sets the energy and the size. l is how much the electron's cloud turns (its angular momentum): it sets the shape, written s, p, d, f for l = 0, 1, 2, 3. m is which way it turns about the vertical axis: + and − swirl in opposite directions, 0 doesn't swirl. Always l < n and −l ≤ m ≤ l.",
    physics: ["quantum-numbers", "three-numbers"],
  },
  n: { title: "n: the level", short: "Which rung of the energy ladder: sets energy and size.", what: "n = 1, 2, 3… Higher n means more energy (closer to escaping) and a bigger cloud: about n² times wider.", physics: ["energy-levels", "size"] },
  l: { title: "l: the shape", short: "How much the cloud turns: s, p, d, f for l = 0, 1, 2, 3.", what: "l is the electron's angular momentum. Each photon changes it by exactly one. l can be at most n − 1.", physics: ["p-orbital", "selection-rules", "centrifugal"] },
  m: { title: "m: the swirl direction", short: "Which way the cloud swirls about the vertical axis.", what: "m runs from −l to +l. Positive and negative m swirl in opposite directions; m = 0 doesn't swirl. A twisted photon changes m by ±1. In a magnetic field, different m have different energies.", physics: ["swirl", "zeeman"] },
  tour: { title: "Guided tour", short: "A step-by-step walk through measurement and energy levels.", what: "Prefer to be guided? The tour walks through measuring the electron and climbing the energy ladder, one step at a time. You can come back to the lab whenever you like.", physics: [] },
};

// Extra "the physics" entries for the lab, alongside story/deeper.js.
export const LAB_DEEPER = {
  "quantum-numbers": html("The quantum numbers n, l, m", `
    <tex display>\\psi_{nlm}(r,\\theta,\\varphi) = R_{nl}(r)\\,Y_{lm}(\\theta,\\varphi), \\qquad E_n = -\\frac{13.6\\,\\mathrm{eV}}{n^2}</tex>
    <ul>
      <li><tex>n \\ge 1</tex>: energy and size (<tex>\\langle r\\rangle = \\tfrac12[3n^2 - l(l+1)]a_0</tex>).</li>
      <li><tex>0 \\le l \\le n-1</tex>: <tex>|\\mathbf L|^2 = l(l+1)\\hbar^2</tex>. Letters s, p, d, f, g… for l = 0, 1, 2, 3, 4…</li>
      <li><tex>-l \\le m \\le l</tex>: <tex>L_z = m\\hbar</tex>.</li>
    </ul>
    <p>This lab uses the <em>m basis</em>: <tex>Y_{lm} \\propto P_l^{|m|}(\\cos\\theta)\\,e^{im\\varphi}</tex>. Its density
    doesn't depend on <tex>\\varphi</tex>, so m ≠ 0 clouds are rings around z. Chemistry's dumbbells
    (<tex>p_x</tex>, <tex>p_y</tex>) are equal mixtures of <tex>m = +1</tex> and <tex>m = -1</tex>, standing waves that
    don't swirl. The guided tour draws those.</p>`),
  swirl: html("Why m ≠ 0 clouds swirl", `
    <p>The probability current of a state is <tex>\\mathbf j = \\frac{\\hbar}{m_e}\\,\\mathrm{Im}(\\psi^*\\nabla\\psi)</tex>. For
    <tex>\\psi \\propto e^{im\\varphi}</tex> it circulates about z:</p>
    <tex display>\\mathbf j = \\frac{\\hbar\\, m}{m_e\\,\\rho}\\,|\\psi|^2\\,\\hat{\\boldsymbol\\varphi}, \\qquad \\rho = r\\sin\\theta .</tex>
    <p>The dots move around the axis with angular speed <tex>\\propto m/\\rho^2</tex> (slowed down to be watchable, and capped
    near the axis). Because <tex>|\\psi|^2</tex> doesn't depend on <tex>\\varphi</tex>, this flow leaves the cloud's shape unchanged.
    It is the flow of probability, not a path the electron follows.</p>
    <p>A circulating charge is a current loop, a magnet with moment <tex>\\mu_z = -\\mu_B m</tex>. That's why the magnet
    tool cares about m.</p>
    <p>During absorption of twisted light the electron is in a superposition like <tex>1s + 2p_{+1}</tex>; its charge
    density is a lump that circles the axis at the beat frequency. That rotating dipole is what couples to the
    rotating field of circularly polarized light.</p>`),
  zeeman: html("The Zeeman effect", `
    <p>In a field <tex>\\mathbf B = B\\hat z</tex>, the orbital magnetic moment adds an energy</p>
    <tex display>\\Delta E = \\mu_B B\\, m, \\qquad \\mu_B = 5.788\\times10^{-5}\\ \\mathrm{eV/T}.</tex>
    <p>At 1 T that's 58 µeV per unit of m, tens of thousands of times smaller than the gaps between levels
    (Hα's is 1.89 eV). The lab magnifies it 1000× so it can be seen and aimed at; the readout always shows the
    real value.</p>
    <ul>
      <li>Absorption from 1s: σ⁺ (twist +1) needs <tex>\\mu_B B</tex> more energy than untwisted light, σ⁻ needs <tex>\\mu_B B</tex> less.
      One line becomes three.</li>
      <li>This is the <em>normal</em> Zeeman effect: electron spin is left out. Real hydrogen's spin adds its own moment
      (g ≈ 2), giving the "anomalous" pattern with more lines.</li>
      <li>Pieter Zeeman saw the splitting in 1896; explaining its full pattern needed electron spin (1925).</li>
    </ul>`),
  ionization: html("Ionization", `
    <p>Any photon (or pair) with total energy above the binding energy <tex>|E_n| = 13.6\\,\\mathrm{eV}/n^2</tex> frees the
    electron: 13.6 eV (91.2 nm) from 1s, 3.4 eV (365 nm) from level 2. No exact match is needed, because a free
    electron can have any energy. The leftover energy becomes its motion.</p>
    <p>Most of the hydrogen in the universe is ionized. When a free electron is recaptured it cascades down the ladder,
    emitting the same spectral lines: that's why nebulae glow in Hα.</p>`),
  scale: html("How small is an atom?", `
    <ul>
      <li>Hydrogen atom: about 0.1 nm across (<tex>2a_0 \\approx 0.106</tex> nm).</li>
      <li>A water molecule: 0.28 nm. DNA's width: 2 nm. A virus: ~100 nm. A bacterium: ~1 µm.</li>
      <li>A human hair (80 µm) is about 800,000 hydrogen atoms wide.</li>
      <li>The proton is 100,000 times smaller again (0.84 fm): if the atom were a football stadium, the proton
      would be a pea at its centre.</li>
    </ul>`),
};

/** Look up a physics entry by key in either table. */
export const physicsEntry = (key) => LAB_DEEPER[key] ?? DEEPER[key] ?? null;
