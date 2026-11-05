// Powers-of-ten zoom: shrink the atom by 10^k and draw outlines of real things at
// the size you're now looking at, with a scale bar.

const A0_M = 5.29177e-11;
export const SCALE_MAX = 10;

// diameter / width in metres
export const OBJECTS = [
  { name: "a hydrogen atom", size: 1.06e-10 },
  { name: "a water molecule", size: 2.8e-10 },
  { name: "DNA's width", size: 2e-9 },
  { name: "a protein", size: 5e-9 },
  { name: "a virus", size: 1e-7 },
  { name: "a bacterium", size: 1e-6 },
  { name: "a red blood cell", size: 8e-6 },
  { name: "a human hair's width", size: 8e-5 },
  { name: "a grain of salt", size: 3e-4 },
  { name: "an ant", size: 3e-3 },
  { name: "a coin", size: 2.4e-2 },
  { name: "your hand", size: 1.9e-1 },
];

/** "120 nm", "3 µm", … */
export function formatLength(m) {
  const units = [["m", 1], ["cm", 1e-2], ["mm", 1e-3], ["µm", 1e-6], ["nm", 1e-9], ["pm", 1e-12]];
  for (const [u, f] of units) if (m >= f * 0.999) return `${+(m / f).toPrecision(3)} ${u}`;
  return `${m.toExponential(1)} m`;
}

/** A round scale-bar length (1, 2 or 5 × 10^p metres) about `target` metres long. */
export function niceLength(target) {
  const p = Math.floor(Math.log10(target)), base = target / 10 ** p;
  return (base < 1.5 ? 1 : base < 3.5 ? 2 : 5) * 10 ** p;
}

const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}, text) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text !== undefined) n.textContent = text;
  return n;
};

export class ScaleView {
  constructor(stage, svg) {
    this.stage = stage;
    this.svg = svg;
    this.k = 0;
    stage.onFrame(() => this.#update());
  }

  set(k) { this.k = Math.max(0, Math.min(SCALE_MAX, k)); }

  /** Width of the view in metres at the current zoom. */
  viewWidth() {
    const { camera, rig } = this.stage;
    const worldWidth = 2 * rig.dist * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
    return worldWidth * A0_M * 10 ** this.k;
  }

  #update() {
    const { cloud, superposition, field } = this.stage;
    const f = 10 ** -this.k;
    cloud.object.scale.setScalar(f);
    superposition.object.scale.setScalar(f);
    field.group.scale.multiplyScalar(f);
    cloud.uniforms.uFade.value *= Math.min(1, f ** 0.6); // a whole cloud squeezed into a dot shouldn't blaze
    const on = this.k > 0.02;
    this.svg.toggleAttribute("hidden", !on); // SVG elements have no .hidden property
    if (!on) return;
    const w = window.innerWidth, h = window.innerHeight, W = this.viewWidth();
    this.svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    this.svg.replaceChildren();
    const cx = w / 2, cy = h / 2;
    for (const o of OBJECTS) {
      const px = (o.size / W) * w;
      if (px < 24 || px > 1.6 * Math.max(w, h)) continue;
      const fade = Math.min(1, (px - 24) / 40, (1.6 * Math.max(w, h) - px) / 200);
      const g = el("g", { opacity: fade.toFixed(2) });
      g.append(el("circle", { cx, cy, r: px / 2, class: "scale-ring" }));
      g.append(el("text", { x: cx, y: cy - px / 2 - 8, class: "scale-label" }, `${o.name} · ${formatLength(o.size)}`));
      this.svg.append(g);
    }
    // the atom itself, once it's too small to see
    const atomPx = (OBJECTS[0].size / W) * w;
    if (atomPx < 12) this.svg.append(el("text", { x: cx + 14, y: cy + 4, class: "scale-label atom" }, "← the atom is here (smaller than a pixel)"));
    // scale bar
    const L = niceLength(W / 5), barPx = (L / W) * w, y = h - 150;
    this.svg.append(el("line", { x1: cx - barPx / 2, x2: cx + barPx / 2, y1: y, y2: y, class: "scale-bar" }));
    this.svg.append(el("text", { x: cx, y: y - 10, class: "scale-label" }, formatLength(L)));
  }
}
