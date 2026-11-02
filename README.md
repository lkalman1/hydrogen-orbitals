# Hydrogen: A Journey

A guided, interactive journey (about 13 minutes) through the quantum physics of the
hydrogen atom. It introduces the quantum numbers n, l and m one at a time, through
the physical processes that change them. Every electron cloud is computed live from
the exact solutions of the Schrödinger equation. Captions are written for middle
school, with an optional "Go deeper" layer for undergraduates. There is an adaptive
score, and a free-play sandbox at the end.

**Play it:** https://lkalman1.github.io/hydrogen-orbitals/

## Run it locally (`web/`)

```bash
npm run serve          # or: python3 -m http.server 8000 -d web
# open http://localhost:8000/            the journey
#      http://localhost:8000/#ch1        a chapter
#      http://localhost:8000/#n3l2m0     the sandbox at 3d z²
```

**In the journey:** Enter or → continues, ← goes back, D opens Go deeper.
**In the sandbox:** ↑↓ n, ←→ l, `,` `.` m, space toggles auto-rotate.

## Python reference model

```bash
pip install numpy scipy matplotlib
python hydrogen.py     # solves the radial equation numerically and writes figures/
```

## Tests

```bash
npm install            # three.js, for the offline screenshot test
npm test               # physics vs SciPy reference; story engine and content rules
npm run screenshot     # end-to-end browser run of the journey (needs Playwright + Chromium)
npm run reference      # regenerate tests/reference.json (needs SciPy)
```

See `TRACKER.md` for progress and `FILETREE.md` for the project layout.
