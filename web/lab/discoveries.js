// "Things to try": optional goals that tick off when you happen to do them, each
// with a short "you found it" card. Progress is remembered in this browser.

const KEY = "hydrogen-lab-discoveries-v1";

export const DISCOVERIES = [
  { id: "measure-10", goal: "Find the electron 10 times", found: "There's no orbit. Each measurement lands somewhere new.", info: "measure" },
  { id: "cloud", goal: "Build a cloud from 20,000 measurements", found: "The cloud is a map of where the electron is likely to be found.", info: "measure" },
  { id: "miss", goal: "Fire light the atom ignores", found: "Wrong energy? The light passes straight through.", info: "light" },
  { id: "absorb", goal: "Lift the electron with light", found: "Energy comes in steps: only exact amounts are absorbed.", info: "light" },
  { id: "round", goal: "Reach level 2 with the cloud still round (2s)", found: "Two photons with opposite twists cancel, so the shape can stay the same.", info: "photons" },
  { id: "swirl", goal: "Make the cloud swirl", found: "A twisted photon's spin becomes the electron's swirl.", info: "twist" },
  { id: "reverse", goal: "Make it swirl the other way", found: "m tells you which way it swirls: + one way, − the other.", info: "m" },
  { id: "d", goal: "Make a d cloud (l = 2)", found: "Each photon changes l by one, so it takes two steps (or two photons) to reach d.", info: "l" },
  { id: "blocked", goal: "Find light with the right energy that still isn't absorbed", found: "Energy isn't everything: the twist has to fit the shape too.", info: "twist" },
  { id: "emit", goal: "Let the atom give off light", found: "Every drop down the ladder gives off one exact colour.", info: "letgo" },
  { id: "red", goal: "Make the atom glow red", found: "656 nm (Hα), from 3 → 2: the red glow of hydrogen across the galaxy.", info: "spectrum" },
  { id: "ionize", goal: "Knock the electron out", found: "13.6 eV frees the electron from 1s: the atom is ionized.", info: "light" },
  { id: "zeeman", goal: "Use the magnet to change the energy a photon needs", found: "In a field, ⟲ and ⟳ swirls have different energies: the Zeeman effect.", info: "magnet" },
  { id: "scale", goal: "Zoom out until the atom vanishes", found: "A hair is nearly a million atoms wide.", info: "scale" },
];

export class Discoveries {
  constructor({ onFound } = {}) {
    this.onFound = onFound;
    this.done = new Set();
    try { for (const id of JSON.parse(localStorage.getItem(KEY) ?? "[]")) this.done.add(id); } catch { /* unavailable */ }
  }

  get count() { return this.done.size; }
  get total() { return DISCOVERIES.length; }
  has(id) { return this.done.has(id); }

  mark(id) {
    if (this.done.has(id)) return;
    const d = DISCOVERIES.find((x) => x.id === id);
    if (!d) return;
    this.done.add(id);
    try { localStorage.setItem(KEY, JSON.stringify([...this.done])); } catch { /* unavailable */ }
    this.onFound?.(d);
  }

  reset() {
    this.done.clear();
    try { localStorage.removeItem(KEY); } catch { /* unavailable */ }
  }

  /** Check a lab event against the goals. */
  observe(e) {
    const s = e.state;
    if (e.type === "measured" && e.count >= 10) this.mark("measure-10");
    if (e.type === "measured" && e.count >= 20000) this.mark("cloud");
    if (e.type === "miss") this.mark("miss");
    if (e.type === "blocked") this.mark("blocked");
    if (e.type === "absorb") {
      this.mark("absorb");
      if (e.B > 0 && e.result.to.m !== e.from.m) this.mark("zeeman");
    }
    if (e.type === "ionize") this.mark("ionize");
    if (e.type === "emit") {
      this.mark("emit");
      if (e.decay.nm && Math.abs(e.decay.nm - 656.5) < 3) this.mark("red");
    }
    if (s && !s.ionized && (e.type === "absorb" || e.type === "emit" || e.type === "jump")) {
      if (e.type === "absorb" && s.n === 2 && s.l === 0) this.mark("round");
      if (s.m !== 0) this.mark("swirl");
      if (this.lastSwirl && s.m && Math.sign(s.m) !== Math.sign(this.lastSwirl)) this.mark("reverse");
      if (s.m) this.lastSwirl = s.m;
      if (s.l === 2 && e.type === "absorb") this.mark("d");
    }
    if (e.type === "scale" && e.k >= 6) this.mark("scale");
  }
}
