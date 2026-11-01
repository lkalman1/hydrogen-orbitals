# Project Tracker — The Hydrogen Atom: A Guided Journey

## Goal

A **10–15 minute guided, interactive experience** that walks through the quantum
physics of hydrogen and builds intuition one step at a time. The three quantum
numbers are introduced **one at a time, each through the physical process that
changes it**:

1. **n**: the atom absorbs light and climbs in energy and size.
2. **l**: a photon's own angular momentum reshapes the cloud.
3. **m**: a magnetic field gives space a direction, and the orientations split apart.

It ends in a free-play sandbox (the M1 viewer).

**Principles**
- **Physically exact.** Every cloud, energy, wavelength and splitting is computed from the equations. Every simplification is shown on screen.
- **Juicy.** Spring physics, anticipation and follow-through, particle bursts, light, and camera moves that direct attention.
- **Immersive sound.** An original adaptive score plus sound effects tied to the physics, all of which can be muted.
- **Learn by doing.** Each idea is earned through one interaction, not just read.
- **Two depths.** The main path is engaging for **middle school**. An optional **"Go deeper"** layer adds undergraduate and early-graduate detail. Nobody is forced into the maths, and nothing is dumbed down for those who want it.

Status legend: ✅ done · 🟡 in progress · ⬜ not started · 🧪 needs verification · ❓ open decision

---

## Milestones

| #   | Milestone | Status | Done when |
|-----|-----------|--------|-----------|
| M0  | JS physics core + tests vs Python | ✅ 2026-10-31 | Tests pass for every state n ≤ 7 |
| M1  | Particle-cloud viewer (becomes the engine and the finale sandbox) | ✅ 2026-10-31 | Any orbital up to n = 7 can be rotated |
| M2  | Story engine + caption system + audio engine + Ch 0 cold open | ✅ 2026-10-31 | Chapters and beats play, skip and resume; captions + Go-deeper drawer work; the audio engine plays placeholder cues |
| M3  | Ch 1 — "The electron is a cloud" | ✅ 2026-11-01 | Measure mode builds up 1s; the P(r) peak at 1 a₀ is shown |
| M4  | Ch 2 — n: climbing the ladder | ✅ 2026-11-01 | Two-photon 1s→2s→3s works; a spectrum barcode builds from emissions |
| M5  | Ch 3 — l: light carries a twist | ⬜ | Lyman-α 1s→2p; Δl = ±1 is enforced; the n = 3 ladder climbs s→p→d |
| M6  | Ch 4 — m: a magnetic field gives space a direction | ⬜ | Zeeman fan-out; current swirl; σ± photons select Δm |
| M7  | Ch 5 — Finale + sandbox | ⬜ | The circular Rydberg state becomes the Bohr orbit; free play opens |
| M8  | Score & sound integration | ⬜ | All cues in the cue sheet are final and mixed |
| M9  | Polish, playtest & timing | ⬜ | 3+ playtesters finish in 10–15 min at 60 fps; accessibility pass |
| M10 | Publish | ⬜ | Public link (GitHub Pages) |
| ★   | Stretch: particles flow along the time-dependent probability current during transitions | ⬜ | Cloud stays ∝ \|ψ(t)\|² throughout |

**Audio track (runs in parallel; owner: you as composer)**

| #  | Step | Status | Done when |
|----|------|--------|-----------|
| A0 | Audio concept + cue sheet (below) | 🟡 draft | You approve the cue list and the musical mapping |
| A1 | Placeholder sounds in the engine | 🟡 cold open + UI done | Every cue has a temporary sound; timing works |
| A2 | Composer sketches per chapter | ⬜ | Rough stems for Ch 0–5 |
| A3 | Final stems + SFX | ⬜ | Delivered to the spec below |
| A4 | Mix, loudness & integration | ⬜ | −16 LUFS integrated; narration ducking tuned |

---

## The journey — chapter design

Target running time is about **13½ min**, with ±2 min depending on how much the user plays.

| Ch | Title | Time | Quantum number | Core intuition |
|----|-------|------|----------------|----------------|
| 0 | Cold open | 0:45 | — | Hydrogen is the simplest atom: one proton, one electron |
| 1 | The electron is a cloud | 1:30 | (1s) | An orbital is a probability map; measurements give single dots |
| 2 | Climbing the ladder | 3:30 | **n** | Only exact colours are absorbed → quantized energy; bigger n = bigger, looser atom |
| 3 | Light carries a twist | 3:30 | **l** | Photons carry angular momentum; l is the cloud's angular momentum, which sets its shape |
| 4 | Space gets a direction | 3:00 | **m** | m is orientation relative to a real axis; it only changes the energy when a field is present |
| 5 | Finale & sandbox | 1:30 + | all | All three together; the classical orbit emerges at large n |

### Ch 0 — Cold open (0:45)
- **Beats:** black screen → "Begin" (this click also unlocks audio) → a single proton glows → the electron cloud condenses into 1s (particles fall inward and settle) → title card.
- **Physics:** the proton is drawn about 10⁴× too large to be visible (labelled). 1s is the ground state.
- **Juice:** slow camera dolly-in; the particles' arrival is staggered by radius; a soft bloom swell.
- **Audio:** opening drone builds on the "Balmer chord" (see Audio); the title sting arrives as the cloud settles.

### Ch 1 — The electron is a cloud (1:30)
- **Beats:**
  1. The cloud fades away. "Measure where the electron is": each tap gives one dot (Born rule).
  2. Hold to measure faster; the dots build into the 1s cloud.
  3. A P(r) mini-chart fills in alongside: most likely distance = 1 a₀ (Bohr's radius).
  4. A "Stationary state" caption: nothing in the cloud moves; only the camera does.
- **Interaction:** tap or hold to measure (required to advance).
- **Physics:** samples come from the exact sampler; the P(r) histogram converges to r²R².
- **Juice:** each measurement pops a dot with a tiny flash and a ring; the rate ramps up as you hold, so the dots build up like a Geiger counter; the histogram bars spring.
- **Audio:** each measurement is a soft click whose pitch varies with r; clicks blend into a texture at high rates; the music layer opens up once the cloud is complete.

### Ch 2 — Climbing the ladder: n (3:30)
- **Beats:**
  1. The energy ladder appears (−13.6/n² eV, with gaps that shrink).
  2. **Tune the laser:** a wavelength slider. Photons at the wrong colour pass straight through, with a Doppler whoosh, and the atom ignores them.
  3. At **243 nm** two photons arrive together, and **1s → 2s** (two-photon absorption). The cloud swells (~4× ⟨r⟩) and a radial-node shell opens.
  4. "Why two photons? Hold that thought." (This sets up Ch 3.)
  5. Climb again to **3s** (two photons at 205 nm). Another node shell appears. The size grows like n².
  6. Let go: the atom decays, emitting photons in their true colours (3s → 2p gives red 656 nm, then 2p → 1s gives UV 121.6 nm). A **spectrum barcode** starts to fill in. An optional "pump higher" (n = 4–6) completes the visible Balmer set: 656, 486, 434, 410 nm.
  7. Optional: a "True scale" toggle shows how much bigger n = 3 really is than 1s.
- **Interaction:** wavelength slider + fire (required); decays are automatic.
- **Physics (accurate):**
  - 1s→2s by two-photon absorption is real: it's the famous precision measurement of hydrogen's 1S–2S transition.
  - 2s is metastable (it can't decay by one photon to 1s), so the decay path for the demo goes through p states. That is acceptable because Ch 3 explains it.
  - The transition animation is a **real superposition**, ψ = cos(s)ψ_a e^{−iE_a t} + sin(s)ψ_b e^{−iE_b t}, slowed by about 10¹⁵ and labelled.
  - The decay photons' colours come from λ = 1239.84/ΔE nm. UV and IR photons are shown as labelled "invisible" flashes.
- **Juice:** the slider "breathes" near resonance (the cloud shivers, the hum gets louder); absorption is an impact pause, then a bloom flash, then the cloud expanding with overshoot; the ladder dot jumps with squash-and-stretch.
- **Audio:**
  - Each n level has a pitch taken from the actual energy ratios (scaled into the audible range), so climbing the ladder is literally climbing a scale.
  - Absorption has a rising sweep and a resolved chord.
  - Each emission line plays its "Balmer note".

### Ch 3 — Light carries a twist: l (3:30)
- **Beats:**
  1. Back to 1s. Fire one photon at Lyman-α (121.6 nm): **1s → 2p**, and lobes appear. Answer to Ch 2's question: **a photon carries one unit of angular momentum (it is spin-1)**, so absorbing one must change l by exactly 1.
  2. Try to reach 2s with a single photon: nothing happens. A rules card reads "Δl = ±1".
  3. l is the cloud's angular momentum. The centrifugal barrier pushes the cloud off the nucleus (s touches the centre; p, d and f don't). A P(r) comparison shows this.
  4. **The trade:** at n = 3, climb **3s → 3p → 3d** with low-energy microwave photons. The node counter shows radial nodes turning into angular nodes while the total stays n − 1 = 2. This is why l ≤ n − 1.
  5. Node surfaces appear: spheres (radial) and planes or cones (angular).
- **Interaction:** fire single photons (required); toggle node surfaces.
- **Physics (accurate, with stated caveats):**
  - Electric-dipole selection rules are Δl = ±1 and Δm ∈ {0, ±1}.
  - In this model (no spin, no QED), states with the same n but different l have exactly the same energy. In real hydrogen they differ very slightly: the 2s–2p gap is the Lamb shift, about 1 GHz, first measured with microwaves by Lamb and Retherford in 1947. Climbing in l with microwave photons is a real technique for preparing high-l (Rydberg) states. The caption says so.
  - "Scattering" was considered as the l-changer. Collisions and electric fields do mix l, but a photon makes angular-momentum conservation visible and teachable, so it was chosen instead.
- **Juice:** the photon is drawn as a corkscrew (its spin made visible); on absorption the cloud receives a visible "twist" impulse, then the lobes bloom out; nodal planes slice through with a shimmer.
- **Audio:** the timbre gains overtones with l (spherical harmonics ↔ musical harmonics, a genuine analogy): s is a pure tone, p adds the 2nd harmonic, d the 3rd. Microwave photons sound like a low, soft pulse.

### Ch 4 — Space gets a direction: m (3:00)
- **Beats:**
  1. In 2p, toggle to the **m-basis**. The three p orbitals become m = −1, 0, +1. The m = ±1 states are doughnuts with **probability current circulating** around z (particles swirl in opposite directions); m = 0 is still.
  2. "Until now z was an arbitrary choice." Turn on a **magnetic field**: field lines sweep in and the z-axis snaps to them.
  3. A circulating current is a tiny magnet. The **Zeeman fan-out:** a field-strength slider splits the one 2p level into three, ΔE = m·μ_B·B. The m = +1 state's magnet points against the field, so its energy goes up.
  4. Spectroscopy: the single Lyman-α line splits into three. **Circularly polarized photons** (σ+ / σ−) select Δm = +1 / −1, and linear polarization (π) selects Δm = 0. The photon's twist direction picks the m state.
  5. Back to the real-basis view: p_x and p_y are mixtures of m = ±1, so they don't have definite m. This explains why the field only "cares" about m states.
- **Interaction:** field-strength slider (required); polarization picker + fire.
- **Physics (accurate, with stated caveats):**
  - μ_B = 5.788×10⁻⁵ eV/T, so the splitting at 1 T is about 58 µeV (about 14 GHz). It is drawn hugely magnified, labelled with the true value.
  - This is the *normal* Zeeman effect (spin ignored). Real hydrogen shows the anomalous Zeeman effect because of electron spin. This is stated, and teased as "the fourth quantum number".
  - The swirl speed comes from the probability current, v_φ = m/(r sinθ) in atomic units, and is described as a flow of probability, not as an electron trajectory.
- **Juice:** field lines draw in like iron filings snapping into place; the energy levels fan out on springs; swirl speed builds smoothly as the field turns on; the σ± corkscrews are mirror images.
- **Audio:**
  - m maps to **stereo position and rotation**: m = +1 circles one way and m = −1 the other.
  - The field turning on is a deep magnetic hum.
  - The Zeeman splitting is heard as one note detuning into three (a beating chord).

### Ch 5 — Finale & sandbox (1:30 + free play)
- **Beats:**
  1. A montage of n, l and m together: a short guided flight through a few striking orbitals.
  2. **Correspondence principle:** circular states (l = m = n − 1) from n = 1 to 30 tighten into a thin ring, which is Bohr's orbit.
  3. Credits, a "What we simplified" card (spin, fine structure, Lamb shift, the fixed proton), and the sandbox opens (the M1 viewer plus the new tools).
- **Audio:** full theme with every layer playing; the score resolves; the sandbox gets a quiet ambient loop.

---

## Audio concept (A0 draft — adaptive stems confirmed; mapping awaiting your approval)

**Musical mapping (sound tied to the physics):**

| Physics | Sound |
|---|---|
| Energy level n | **Pitch.** Level frequencies are proportional to 1/n², so they make a real "hydrogen scale" |
| Transition n₁→n₂ | An interval/chord built from the actual line frequency ratios |
| l (angular shape) | **Timbre / overtones** (more angular nodes → richer harmonics) |
| m (orientation) | **Stereo position & rotation** |
| Measurement | Granular clicks (dot rate → texture) |
| Magnetic field | Low hum; Zeeman splitting = one note detuning into three |

**A seed from nature: the "Balmer chord."** The visible hydrogen lines' frequencies form
near-musical ratios relative to Hα:
- Hβ/Hα = 1.350 (close to a perfect fourth, 1.333)
- Hγ/Hα = 1.512 (close to a perfect fifth, 1.5)
- Hδ/Hα = 1.600 (exactly a minor sixth, 8/5)

The chord can anchor the main theme's harmony.

**Adaptive score structure:**
- One stem set per chapter, all at the same tempo and key. Layers fade in as beats are completed.
- Transitions land on bar lines (a stinger, then the next chapter's loop).
- No voice-over, so the music only ducks (about 3–4 dB) under key sound effects and caption reveals.

**Cue sheet (first pass):**

| ID | Chapter | Type | Length | Trigger |
|----|---------|------|--------|---------|
| MUS-00 | Ch 0 | Intro drone → title | ~45 s, one-shot | Begin click |
| MUS-01 | Ch 1 | Loop, 2–3 layers | 16–32 bars | Layer added at each beat |
| MUS-02 | Ch 2 | Loop, 3–4 layers | 16–32 bars | A layer for each n reached |
| MUS-03 | Ch 3 | Loop, 3–4 layers | 16–32 bars | A layer for each l reached |
| MUS-04 | Ch 4 | Loop, 3 layers + field drone | 16–32 bars | Field slider controls the drone |
| MUS-05 | Ch 5 | Full theme → resolve | ~90 s | Finale |
| MUS-SBX | Sandbox | Ambient loop | 2–3 min | Free play |
| STG-xx | All | Chapter-transition stingers | 2–4 s | Chapter end |
| SFX-measure | Ch 1+ | Click, 4–6 variants | < 100 ms | Each measurement |
| SFX-photon-fire / miss / absorb | Ch 2+ | One-shots | 0.3–1.5 s | Laser |
| SFX-emit-[line] | Ch 2+ | Tuned pings | ~1 s | Emission (pitch = line) |
| SFX-twist | Ch 3 | Absorption with rotation | ~1 s | l change |
| SFX-field-on / hum | Ch 4 | One-shot + loop | — | Field slider |
| SFX-ui-tick / snap / whoosh | All | UI | < 200 ms | Sliders, buttons, camera moves |

**Delivery spec:**
- **Your deliverables:** 48 kHz/24-bit WAV, with loops cut sample-accurately on bar lines.
- **Encoding:** the build encodes these to Ogg Opus plus an AAC fallback for Safari.
- **Size budget:** under 15 MB of audio in total.

**Engine:**
- Built on the Web Audio API, with separate volume channels for music, effects and UI.
- Loops are scheduled sample-accurately; a bar-quantized transition scheduler handles chapter changes; narration ducking is automatic.
- There is a single mute and volume control, and everything works with sound off.

---

## Cross-cutting features (built as the chapters need them)

| Feature | First used | Status |
|---|---|---|
| Story engine: chapters → beats state machine, captions, progress bar, chapter menu, skip/back, resume, per-chapter deep links (`#ch2`) | Ch 0 | ✅ |
| Audio engine (above) | Ch 0 | ✅ |
| Camera director: scripted shots with springs, user can still orbit | Ch 0 | ✅ |
| Bloom / glow post-processing | Ch 0 | ✅ |
| Measure mode + live P(r) histogram | Ch 1 | ✅ |
| Superposition transitions (replace the visual morph) | Ch 2 | ✅ |
| Photons as objects: fire, miss, absorb, emit; colour from wavelength; two-photon | Ch 2 | ✅ |
| Energy ladder + spectrum barcode | Ch 2 | ✅ |
| True-scale toggle | Ch 2 | ⬜ |
| Selection-rule engine (Δl = ±1, Δm ∈ {0, ±1}, polarization) | Ch 3 | ⬜ |
| Node surfaces (radial spheres, angular planes/cones) + node counter | Ch 3 | ⬜ |
| Complex m-basis, phase colouring, probability-current swirl | Ch 4 | ⬜ |
| Magnetic field lines + Zeeman energy fan | Ch 4 | ⬜ |
| Circular-state preset to n = 30 (needs a sampler check at large n) | Ch 5 | ⬜ |
| Web Worker sampling (no hitches during transitions) | Ch 2 | ✅ |
| Caption system: two-layer captions, "Go deeper" drawer (KaTeX), glossary chips, idle nudges | Ch 0 | ✅ |
| Accessibility: captions always on, reduced-motion mode, keyboard path, works muted | M9 | ⬜ |
| Phone compatibility pass: layout, touch, particle budget (~100k), drawer as bottom sheet | M9 | ⬜ |
| Volumetric ray-marched render mode | sandbox (optional) | ⬜ backlog |

---

## Decisions (resolved 2026-10-31)

| # | Question | Decision | What it changes |
|---|---|---|---|
| D1 | Audience | **Middle school main path + optional undergrad/early-grad detail** | Two-layer captions plus a "Go deeper" drawer (see the caption system below) |
| D2 | Narration | **Captions only** | No voice-over; captions drive pacing; music ducking is keyed to caption reveals |
| D3 | Score | **Adaptive layered stems** | Cue sheet and stem spec below stand; the bar-quantized scheduler is required |
| D4 | Spin | **Teaser only** | One card in the Ch 5 epilogue ("the fourth quantum number"), shown with the anomalous-Zeeman caveat in Ch 4 |
| D5 | Platform | **Desktop-first, phone-compatible** | Designed and tuned for a 1280–1920 px desktop; phones get a working layout, fewer particles, and touch controls; no phone-only features |
| D6 | Pacing | **Guided** | Each beat waits for its required interaction; a nudge hint appears after ~8 s idle; a chapter menu unlocks chapters already seen; the sandbox unlocks at the end (or via "skip to sandbox") |

### Caption system (from D1 + D2)

**Main captions (middle school).** These are the default.
- At most ~20 words per caption and 1–2 captions per beat.
- Plain words, with every term defined the first time it appears. Analogies are allowed but must be marked as analogies.
- No equations. Numbers are fine when they mean something ("1 nm is about 10 atoms wide").
- Reading pace is about 150 wpm; the next action only unlocks after the caption has finished revealing.

**"Go deeper" drawer (undergrad → early grad).** This is optional and opens from a ⓘ button on any beat.
- It holds equations (KaTeX), derivations in brief, the selection-rule origin (dipole matrix elements, Wigner–Eckart in one line), real numbers with units, and the simplifications made.
- It links back to the exact code and formulas (`physics.js`, `hydrogen.py`).

**Glossary chips.** Tap a highlighted term (orbital, photon, node, angular momentum…) to see a one-line definition.

**Per-chapter "Go deeper" content (first pass):**

| Ch | Topics |
|---|---|
| 1 | Born rule, \|ψ\|², normalization; r²R² vs \|ψ\|²; stationary states and e^{−iEt} |
| 2 | Radial equation and the finite-difference eigenproblem (from `hydrogen.py`); E_n = −1/2n² from series termination; two-photon selection rules (Δl = 0, ±2); 2s metastability (lifetime ≈ 0.12 s) |
| 3 | L², spherical harmonics, the centrifugal term l(l+1)/2r²; dipole selection rules from ⟨l′m′\|r\|lm⟩; accidental degeneracy (the Runge–Lenz / SO(4) symmetry); the Lamb shift |
| 4 | L_z = mħ; the probability current j = Im(ψ*∇ψ); magnetic moment μ = −μ_B·m; H′ = μ_B B L_z/ħ; normal vs anomalous Zeeman; σ±/π polarization |
| 5 | The correspondence principle; circular-state width ∝ 1/√n; Rydberg atoms; preview of spin and fine structure |

---

## Done so far

### M4 — Chapter 2: "Climbing the ladder" (n) ✅

| Beat | What happens | Interaction |
|---|---|---|
| ladder | Energy ladder slides in (to scale, reduced mass) | Continue |
| tune | Tunable UV laser (185–300 nm), resonance meter, snapping. Misses pass straight through; 243.13 nm → two counter-propagating photons → coherent 1s→2s transition | Tune + Fire (fallback: "Tune it for me") |
| level-2 | 2s cloud with its node ring at exactly 2 a₀ | Continue |
| why-two | Sets up Ch 3 (one photon can't do Δl = 0) | Continue |
| relax | 2s → 1s by two-photon emission (two dim photons sharing 10.2 eV) | Automatic |
| tune-3 | 205.14 nm → 3s. Other ns lines are real resonances too: the atom absorbs, falls back, and the prompt hints | Tune + Fire |
| size | 3s with a "level 1 size" ring: 9× wider on average | Continue |
| cascade | 3s → 2p (656.47 nm, red) → 1s (121.57 nm, UV) by quantum jumps; the spectrum barcode fills | Let go |
| spectrum | Hydrogen's fingerprint; optional free play (4s–7s cascades fill in the Balmer set by the true branching ratios) | Continue |

| Feature | File | Notes |
|---|---|---|
| Spectroscopy: reduced-mass levels, line and two-photon wavelengths, dipole integrals, Einstein A, branching, lifetimes, colours | `web/spectroscopy.js` | Matches measured values: Hα 656.47, Lyα 121.57, 1S–2S 243.13 nm; τ(2p) 1.596 ns, τ(3s) 158 ns, τ(3p) 5.27 ns, τ(3d) 15.5 ns |
| Exact superposition rendering by importance weights (w = \|Ψ(t)\|²/q, q = ½(ψa² + ψb²), w ≤ 4) | `web/mixture.js`, `web/scene/superposition.js` | Tested: normalisation, breathing ⟨r⟩(t) with interference, dipole ⟨z⟩(t) sloshing, no sloshing when incoherent |
| Transitions: coherent (laser, Rabi half-cycle + quantum beat, slowed ~10¹⁵×) vs incoherent quantum jumps (spontaneous emission) | `web/scene/transition.js` | |
| Background sampling worker with main-thread fallback | `web/sample-worker.js`, `web/scene/sampling.js` | No hitch on transitions |
| Photons as wave packets with labels, a laser beam, flashes | `web/scene/photons.js` | Two beams from both sides (Doppler-free geometry) |
| Lab: tuning, resonance meter + snapping, firing, decay cascades | `web/story/lab.js` | Resonance tolerance ±0.25 nm (unit-tested) |
| Energy ladder (SVG): springy dot, two-photon and emission arrows, lifetime readout | `web/story/ladder.js` | |
| Spectrum barcode (log λ, UV → IR, visible rainbow) | `web/story/spectrum.js` | |
| Sounds: laser hum (pitch tracks λ, opens near resonance), coherent "beat" tone, absorb, emit (pitch = scaled line frequency), snap, miss whoosh, jump | `web/audio/cues.js` | Engine gained `loop()` for continuous sounds |
| Go deeper: energy levels, two-photon physics (Doppler-free, 15-digit 1S–2S), decay and quantum jumps, size ∝ n², Rydberg formula and series | `web/story/deeper.js` | |
| Framework: beats declare `uses: [...]` tools (others auto-release), `setPrompt()`, async fallbacks, caption-height tracking | `web/story/ui.js` | |
| Tests: 8 new (wavelengths, dipole integral, A coefficients and lifetimes, branching, colours, superposition ×2, resonance); end-to-end Ch 2 run on desktop + phone | `tests/` | 30 unit tests total |

**M4 follow-ups**
- 🧪 Real-device check of the transition "breathing" speed (beat ≈ 0.28 Hz per eV of gap) and of how the laser hum and beat tone sound.
- The 3s/4s nodes beyond 2s aren't marked with rings (only the 2s node is); consider adding for 3s.
- The 1S–2S line shows 243.14 nm because the model omits the Lamb shift and fine structure (0.005 nm); the drawer quotes the measured 243.13 nm.

### M3 — Chapter 1: "The electron is a cloud" ✅

| Beat | What happens | Interaction | Status |
|---|---|---|---|
| question | Empty atom (proton only). "Where exactly is the electron right now?" | Tap Measure (or the atom) 5 times; each dot flashes with a ring and a distance tag | ✅ |
| random | "A different spot every time. The result is random." | Continue (tapping still works) | ✅ |
| hold | Histogram slides in | **Hold** Measure: the rate ramps 2/s → 15,000/s (Geiger-style), and the beat completes at 20,000 | ✅ |
| pattern | The remaining samples sweep in with a swell; full music | Continue | ✅ |
| distance | Ring at 1 a₀ around the cloud + "most likely: 1 a₀" on the chart; Bohr radius in nm | Continue | ✅ |
| stationary | Auto-rotate off: "Drag to look around: the cloud never changes" | Drag the atom (≥ ~50°) | ✅ |

| Feature | File | Notes |
|---|---|---|
| Measurement mode in the cloud shader: per-particle "born" time, flash on reveal, sparse-dot boost | `web/scene/cloud.js` | Particles are independent samples, so revealing in index order is a fair measurement sequence |
| Measuring tool: tap/hold button (mouse, touch, keyboard), canvas taps, rings, distance tags, granular clicks | `web/story/measure.js` | |
| Live histogram: springy bars, exact P(r) dashed, peak marker, hover readout, running average vs exact 1.5 | `web/story/radial-chart.js` | Compact strip on phones |
| Ring + label marking 1 a₀ | `web/scene/markers.js` | |
| Pure stats (exact 1s P(r), rate ramp, sparseness, histogram) | `web/story/stats.js` | Unit-tested |
| Sounds: measurement click with pitch falling with distance, snapped to the Balmer chord; reveal swell | `web/audio/cues.js` | |
| Go-deeper entries: measurement and ensembles (incl. 2013 photoionization microscopy), randomness (Bell tests), radial distribution (mode / mean / median, 1/√N), orbital, Bohr radius (why atoms don't collapse), stationary states | `web/story/deeper.js` | |
| Glossary: measurement, Bohr radius, stationary state | `web/story/glossary.js` | |
| Framework: beat `usesMeasure` (other beats auto-release the tool), `onFallback` for accessible scene actions, layout aware of the button and chart | `web/story/ui.js` | |
| Tests: 4 new unit tests (P(r) normalisation and peak; ramp timing; sparseness; 100k exact samples converge to P(r) and ⟨r⟩); end-to-end run of the whole chapter on desktop + phone, asserting the measured average is within 0.02 of 1.5 a₀ | `tests/` | 22 unit tests total |

**M3 follow-ups**
- 🧪 Feel and timing of the hold ramp (about 6 s to 20,000) and click density need a real-device playtest.
- 🧪 The single-measurement dot size and brightness need checking on a real GPU and display.

### M2 — Story engine, captions, audio, cold open ✅

| Feature | File | Status | Notes |
|---|---|---|---|
| Story state machine: next/back across chapters, unlocks, progress, persistence, deep links | `web/story/engine.js` | ✅ | Pure logic; unit-tested |
| Chapter content format (caption, wait, prompt, nudge, deeper, music, enter/cleanup) | `web/story/chapters.js` | ✅ | `enter()` fully sets the scene, so back and deep links work |
| Ch 0 cold open: dark → proton appears → click proton → cloud condenses → "cloud of possibilities" → title card | `web/story/chapters.js` | ✅ | Scene interaction (click the proton) with a keyboard/button fallback |
| Ch 1–5 placeholders (preview orbital + "coming soon") ending in the sandbox | `web/story/chapters.js` | ✅ | Replaced chapter by chapter in M3–M7 |
| Captions: word-by-word reveal; action unlocks after the reveal; glossary chips | `web/story/ui.js` | ✅ | |
| "Go deeper" drawer, maths rendered to MathML by KaTeX (lazy-loaded; no CSS or fonts needed) | `web/story/ui.js`, `deeper.js` | ✅ | Caption slides aside on desktop; bottom sheet on phones |
| Progress bar (segments sized by chapter length), chapter menu with locks, restart, skip to sandbox | `web/story/ui.js` | ✅ | |
| Chapter banner + stinger when a new chapter starts | `web/story/ui.js` | ✅ | |
| Idle nudge after 8 s (pulsing prompt, glowing button, fallback button for scene actions) | `web/story/ui.js` | ✅ | |
| Keyboard: Enter / → / space continue, ← back, D drawer, Esc close | `web/story/ui.js` | ✅ | |
| Start screen (Begin / Resume / Skip to sandbox) that also unlocks audio | `web/story/ui.js`, `main.js` | ✅ | |
| Routing: `#ch0`–`#ch5`, `#sandbox`, `#n3l2m0` | `web/main.js` | ✅ | |
| Audio engine: music/sfx/ui buses, shared reverb, compressor, bar-quantized cue changes and stingers, layer fades, ducking, persistent mute | `web/audio/engine.js` | ✅ | Composed loops drop in as `{ url }` layers |
| Placeholder cues built on the Balmer chord: 4-layer theme (drone, pad, shimmer, pulse), title and chapter stingers, UI tick/whoosh, proton appear/tap, condense, caption | `web/audio/cues.js` | ✅ | |
| Stage refactor: cloud (fade, condense mode), spring rig with scripted fly-to and tap detection, proton glow with kick/breathing, fade-able axes, layout-aware framing | `web/scene/*.js` | ✅ | |
| Bloom post-processing | `web/scene/stage.js` | ✅ | Tuned to avoid washing out the cloud |
| Sandbox (M1 viewer) on the shared stage, with "← The journey" | `web/sandbox.js` | ✅ | |
| Reduced-motion support (no camera flights or word animation) | several | ✅ | |
| Tests: 11 story/content/audio unit tests; end-to-end browser run of the prologue, drawer, glossary, menu, resume, deep links, phone | `tests/story.test.mjs`, `tests/screenshot.mjs` | ✅ | Content rules: captions ≤ 22 words; every glossary and drawer key resolves |

**M2 known issues / follow-ups**
- 🧪 **Sound not yet heard by a person.** In headless Chromium the audio graph runs without errors (checked by the end-to-end test), but the mix, levels and the placeholder timbres need a listen on real speakers.
- 🧪 Not yet tested on a real GPU. Faint square bloom halos around the proton may be banding in the software renderer; check on real hardware.
- The cold open runs about 45–60 s, depending on reading speed. Playtest timing in M9.
- Sampling still runs on the main thread (a hitch of up to ~150 ms on state changes). It needs moving to a Web Worker before Ch 2.


### M0 — Physics core ✅

| Feature | File | Status | Verification |
|---|---|---|---|
| Generalized Laguerre L_k^α (recurrence) | `web/physics.js` | ✅ | ψ vs SciPy |
| Associated Legendre P_l^m with Condon–Shortley phase | `web/physics.js` | ✅ | ψ vs SciPy |
| Radial R_nl with log-factorial normalization | `web/physics.js` | ✅ | ψ vs SciPy |
| Real spherical harmonics (p_x, d_xy, …) matching `hydrogen.py` | `web/physics.js` | ✅ | ψ vs SciPy, sign test |
| Energies, ⟨r⟩, ⟨r²⟩ closed forms, node counts, names | `web/physics.js` | ✅ | numerical integration |
| Exact inverse-CDF sampler (r, cosθ, φ tables) | `web/sampler.js` | ✅ | Monte Carlo moments |
| Fixed per-particle ranks (enables rank-matching morphs) | `web/sampler.js` | ✅ | — |
| Python reference exporter | `tests/export_reference.py` | ✅ | — |
| Node test suite (7 tests) | `tests/physics.test.mjs` | ✅ | `npm test` |

**Results (2026-10-31):**
- ψ matches SciPy at 1,680 random points over all 140 states up to n = 7, with a worst relative error of **7×10⁻¹³**.
- Sampled clouds (40k points each) reproduce ⟨r⟩, ⟨r²⟩, ⟨z²⟩ and ⟨x²⟩ within 5 standard errors for every state.
- Every sampler table normalizes to 1 within 10⁻⁴.

### M1 — Interactive particle viewer ✅ (becomes the sandbox)

| Feature | Status | Notes |
|---|---|---|
| Three.js points renderer, additive soft-glow sprites | ✅ | Custom shader; positions computed on the GPU from (r, cosθ, φ) |
| Sign-of-ψ colouring (blue +, orange −) | ✅ | |
| Orbital picker grid (n × l), forbidden cells disabled with reason | ✅ | |
| m chips with real-orbital names (x, y, z, xy, z², …) | ✅ | |
| Rank-matching morph between states | ✅ | To be replaced by superposition transitions in Ch 2 |
| Spring orbit camera: drag inertia, pinch and wheel zoom, idle auto-rotate | ✅ | |
| Auto-zoom spring to each orbital's size | ✅ | Fits the 95% radius |
| Axes (z up) and nucleus marker | ✅ | |
| Info panel, keyboard shortcuts, URL deep links (`#n3l2m0`), sample-count selector | ✅ | |
| "What am I seeing?" panel with honest caveats | ✅ | |
| Phone layout | ✅ | Checked at 390×844 |
| Headless screenshot smoke test | ✅ | `npm run screenshot` |

**Known issues / follow-ups**
- 🧪 Not yet tested on a real GPU or phone; only in headless Chromium with a software renderer.
- Sampling runs on the main thread (~50–150 ms at 200k), so it needs moving to a Web Worker before Ch 2.
- The mid-morph colour blends blue and orange into pink. This goes away once the morph is replaced by superposition transitions.

---

## Changelog
- **2026-11-01:** **M4 complete** (branch `m4-chapter2`). Chapter 2: tunable laser, two-photon absorption with exact superposition rendering, energy ladder, quantum-jump cascades with true branching ratios, emission spectrum. Added the spectroscopy module, background sampling worker, photon system, and new sounds and content. 30 unit tests.
- **2026-11-01:** Project moved into git and pushed to GitHub: https://github.com/lkalman1/hydrogen-orbitals (`main`).
- **2026-11-01:** **M3 complete.** Chapter 1 (six beats): tap and hold to measure, a live histogram converging to the exact P(r), the Bohr-radius ring, and drag-to-confirm stationarity. Added the measurement shader mode, measuring tool, chart, marker, stats module, new sounds, deeper and glossary content, and tests.
- **2026-10-31:** **M2 complete.** Story engine, two-layer caption system with the Go-deeper drawer and glossary, audio engine with Balmer-chord placeholder cues, bloom, scripted camera, the Ch 0 cold open, placeholder Ch 1–5, and the sandbox on a shared stage. `app.js` was split into `main.js`, `scene/`, `story/`, `audio/` and `sandbox.js`. Tests: 18 unit tests plus an end-to-end browser run.
- **2026-10-31:** Resolved decisions D1–D6: middle-school main path with an optional undergrad/grad "Go deeper" layer; captions only; adaptive score; spin teaser only; desktop-first and phone-compatible; guided pacing. Added the caption system and per-chapter deeper-content plan.
- **2026-10-31:** **Scope change.** The project becomes a 10–15 min guided journey that introduces n, l and m through the processes that change them: two-photon absorption, photon angular momentum, and the Zeeman effect. Added the chapter design, physics corrections to the original storyline, the audio concept and cue sheet, and open decisions. Milestones M2–M10 and A0–A4 were redefined, and the volumetric mode moved to the backlog.
- **2026-10-31:** M1 published as a private preview: https://claude.ai/artifact/JKgT7rKpr2B48FFvnT7pi8. Deep-link format changed to `#n3l2m0`.
- **2026-10-31:** M0 and M1 complete. Added tracker, file tree, `.gitignore`, README.
- **2026-10-30:** `hydrogen.py`: finite-difference radial solver, analytic orbitals, five static figures.
