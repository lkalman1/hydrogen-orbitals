# Hydrogen Lab

An interactive hydrogen atom you explore for yourself, computed live from the Schrödinger
equation.

- **Measure** the electron and watch the cloud build up, one dot at a time.
- **Fire light** at it: aim on the energy ladder, choose one or two photons and their twist.
- **Add a magnet**, **zoom out** to see how small an atom is, or **jump** to any state.

Every control has an ⓘ that explains it, from one line to the full physics, and "Things to
try" suggests discoveries. A step-by-step **guided tour** is available too.

**Play it:** https://lkalman1.github.io/hydrogen-orbitals/

## Run it locally (`web/`)

```bash
npm run serve          # or: python3 -m http.server 8000 -d web
# open http://localhost:8000/            the lab
#      http://localhost:8000/#n3l2m1     the lab at 3d, m = +1
#      http://localhost:8000/#tour       the guided tour
```

**In the lab:** 1–5 switch tools, F fires, G lets go, Esc closes explanations. Drag to rotate, scroll to zoom.

## Python reference model

```bash
pip install numpy scipy matplotlib
python hydrogen.py     # solves the radial equation numerically and writes figures/
```

## Tests

```bash
npm install            # three.js, for the offline screenshot test
npm test               # physics vs SciPy reference; story engine and content rules
npm run screenshot     # end-to-end browser run (needs Playwright + Chromium); or screenshot:lab / screenshot:tour
npm run reference      # regenerate tests/reference.json (needs SciPy)
```

See `TRACKER.md` for progress and `FILETREE.md` for the project layout.
