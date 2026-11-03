// The energy ladder: hydrogen's levels drawn to scale (−13.6 eV/n², reduced mass),
// the electron as a dot that jumps between rungs, and arrows for absorbed (two
// stacked arrows for two-photon) and emitted light, coloured by wavelength.

import { levelEV, wavelengthRGB, rgbCss } from "../spectroscopy.js";
import { L_LETTERS } from "../physics.js";

const NS = "http://www.w3.org/2000/svg";
const W = 220, H = 300, TOP = 26, BOTTOM = 276, X0 = 46, X1 = 196;
const yOf = (ev) => TOP + (ev / levelEV(1)) * (BOTTOM - TOP);
const svg = (tag, attrs = {}) => {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

export class EnergyLadder {
  constructor() {
    this.root = document.getElementById("ladder");
    this.svg = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Energy levels of hydrogen" });
    this.root.querySelector(".ladder-body").append(this.svg);
    this.arrows = svg("g");
    this.rungs = new Map();

    // ionization limit
    this.svg.append(svg("line", { x1: X0, x2: X1, y1: yOf(0), y2: yOf(0), class: "rung free" }));
    const free = svg("text", { x: X1, y: yOf(0) - 6, class: "lbl end" });
    free.textContent = "0 eV · electron escapes";
    this.svg.append(free);

    for (let n = 1; n <= 7; n++) {
      const y = yOf(levelEV(n));
      const g = svg("g", { class: "rung-g" });
      g.append(svg("line", { x1: X0, x2: X1, y1: y, y2: y, class: "rung" }));
      if (n <= 3) {
        const lbl = svg("text", { x: X0 - 8, y: y + 4, class: "lbl n end-anchor" });
        lbl.textContent = `n = ${n}`;
        const ev = svg("text", { x: X1, y: y + 14, class: "lbl end" });
        ev.textContent = `${levelEV(n).toFixed(2)} eV`;
        g.append(lbl, ev);
      } else if (n === 4) {
        const lbl = svg("text", { x: X0 - 8, y: y + 3, class: "lbl n small end-anchor" });
        lbl.textContent = "4…";
        g.append(lbl);
      }
      this.svg.append(g);
      this.rungs.set(n, g);
    }
    this.svg.append(this.arrows);
    this.dot = svg("ellipse", { cx: 120, cy: yOf(levelEV(1)), rx: 7, ry: 7, class: "dot" });
    this.dotLabel = svg("text", { x: 132, y: yOf(levelEV(1)) - 8, class: "lbl dot-lbl" });
    this.svg.append(this.dot, this.dotLabel);
    this.y = yOf(levelEV(1)); this.vy = 0; this.targetY = this.y;
    this.squash = 0;
    this.setState({ n: 1, l: 0 }, { instant: true });
  }

  get visible() { return !this.root.hidden; }
  show() {
    if (!this.visible) { this.root.hidden = false; this.root.classList.remove("on"); void this.root.offsetWidth; this.root.classList.add("on"); }
  }
  hide() { this.root.hidden = true; }

  setState({ n, l }, { instant = false } = {}) {
    this.targetY = yOf(levelEV(n));
    if (instant) { this.y = this.targetY; this.vy = 0; }
    this.dotLabel.textContent = `${n}${L_LETTERS[l]}`;
    this.squash = instant ? 0 : 1;
  }

  /** Glow the rung a tuned laser is close to (strength 0–1), or none. */
  highlight(n, strength = 0) {
    for (const [k, g] of this.rungs) {
      g.classList.toggle("near", k === n && strength > 0.15);
      g.style.setProperty("--near", k === n ? strength.toFixed(2) : "0");
    }
  }

  #arrow(x, y1, y2, color, { wavy = false, dashed = false } = {}) {
    let d;
    if (wavy) {
      d = `M ${x} ${y1}`;
      const steps = 24;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        d += ` L ${x + 4 * Math.sin(t * Math.PI * 6)} ${y1 + (y2 - y1) * t}`;
      }
    } else d = `M ${x} ${y1} L ${x} ${y2}`;
    const path = svg("path", { d, class: "arrow", stroke: color, "stroke-dasharray": dashed ? "3 3" : "none" });
    const dir = Math.sign(y2 - y1);
    const head = svg("path", { d: `M ${x - 4} ${y2 - 6 * dir} L ${x} ${y2} L ${x + 4} ${y2 - 6 * dir}`, class: "arrow", stroke: color });
    const g = svg("g", { class: "arrow-g" });
    g.append(path, head);
    return g;
  }

  #add(g, label, x, y, color) {
    if (label) {
      const t = svg("text", { x: x + 8, y, class: "lbl arrow-lbl", fill: color });
      t.textContent = label;
      g.append(t);
    }
    this.arrows.append(g);
    setTimeout(() => g.classList.add("old"), 5000);
    setTimeout(() => g.remove(), 7000);
    if (this.arrows.childNodes.length > 8) this.arrows.firstChild.remove();
  }

  /** Two-photon absorption n1 → n2: two stacked arrows, each half the gap. */
  absorbTwo(n1, n2, nm) {
    const color = rgbCss(wavelengthRGB(nm));
    const y1 = yOf(levelEV(n1)), y2 = yOf(levelEV(n2)), ym = (y1 + y2) / 2;
    const g = svg("g");
    g.append(this.#arrow(84, y1, ym + 2, color), this.#arrow(84, ym - 2, y2, color));
    this.#add(g, `2 × ${nm.toFixed(1)} nm`, 84, ym, color);
  }

  /** Single-photon absorption n1 → n2: one arrow. */
  absorbOne(n1, n2, nm) {
    const color = rgbCss(wavelengthRGB(nm));
    const y1 = yOf(levelEV(n1)), y2 = yOf(levelEV(n2));
    const g = svg("g");
    g.append(this.#arrow(84, y1, y2, color));
    this.#add(g, `1 × ${nm.toFixed(1)} nm`, 84, (y1 + y2) / 2, color);
  }

  /** Emission n1 → n2 (wavy arrow). twoPhoton: dashed, no single wavelength. */
  emit(n1, n2, nm, { twoPhoton = false } = {}) {
    const color = twoPhoton ? "#9aa4b5" : rgbCss(wavelengthRGB(nm));
    const y1 = yOf(levelEV(n1)), y2 = yOf(levelEV(n2));
    const x = 150 + (this.arrows.childNodes.length % 3) * 12;
    const g = svg("g");
    g.append(this.#arrow(x, y1, y2, color, { wavy: !twoPhoton, dashed: twoPhoton }));
    this.#add(g, twoPhoton ? "2 photons" : `${nm.toFixed(1)} nm`, x, (y1 + y2) / 2 + 4, color);
  }

  update(dt) {
    if (!this.visible) return;
    const k = 160, c = 2 * Math.sqrt(k) * 0.45;
    this.vy += (-k * (this.y - this.targetY) - c * this.vy) * dt;
    this.y += this.vy * dt;
    this.squash *= Math.exp(-dt * 6);
    const stretch = Math.min(0.5, Math.abs(this.vy) / 400);
    this.dot.setAttribute("cy", this.y.toFixed(2));
    this.dot.setAttribute("rx", (7 * (1 - stretch * 0.5)).toFixed(2));
    this.dot.setAttribute("ry", (7 * (1 + stretch)).toFixed(2));
    this.dotLabel.setAttribute("y", (this.y - 9).toFixed(2));
  }
}
