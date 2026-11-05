// The lab's energy ladder, which is also the light control.
//
// Rungs are the levels −13.6 eV/n² (reduced mass), with the axis broken between
// n = 1 and n = 2 so the upper rungs have room (the break is drawn). With a magnetic
// field each rung splits into its m sub-levels (magnified, labelled elsewhere).
// The arrow from the electron's rung is the light you're about to fire: its length is
// the total photon energy. Tap a rung to aim at it, or drag the arrow's tip; it snaps
// onto reachable rungs. Two photons show as two stacked half-length arrows.

import { levelEV } from "../spectroscopy.js";
import { stateEV } from "../rules.js";
import { L_LETTERS } from "../physics.js";

const NS = "http://www.w3.org/2000/svg";
const W = 260, H = 340, X0 = 46, X1 = 238, XDOT = 128, SNAP_PX = 9;
// lower zone: just n = 1; upper zone: n = 2 … free
const LO = { e0: -14.3, e1: -12.9, y0: 334, y1: 304 };
const BREAK = { y0: 298, y1: 284, e0: -12.9, e1: -3.8 };
const UP = { e0: -3.8, e1: 0.75, y0: 278, y1: 18 };
const lerp = (a, b, t) => a + (b - a) * t;

export function yOf(e) {
  if (e <= LO.e1) return lerp(LO.y0, LO.y1, (e - LO.e0) / (LO.e1 - LO.e0));
  if (e <= BREAK.e1) return lerp(BREAK.y0, BREAK.y1, (e - BREAK.e0) / (BREAK.e1 - BREAK.e0));
  return lerp(UP.y0, UP.y1, (e - UP.e0) / (UP.e1 - UP.e0));
}
export function eOf(y) {
  if (y >= LO.y1) return lerp(LO.e0, LO.e1, (LO.y0 - y) / (LO.y0 - LO.y1));
  if (y >= BREAK.y1) return lerp(BREAK.e0, BREAK.e1, (BREAK.y0 - y) / (BREAK.y0 - BREAK.y1));
  return lerp(UP.e0, UP.e1, (UP.y0 - y) / (UP.y0 - UP.y1));
}

const el = (tag, attrs = {}, text) => {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
};
const nameOf = (s) => (s.ionized ? "free" : `${s.n}${L_LETTERS[s.l]}`);

export class LabLadder {
  /** onPick(n): a rung was tapped (n = 0 for "free"); onDrag(totalEV, final): the arrow tip moved. */
  constructor(root, { onPick, onDrag }) {
    this.root = root;
    this.onPick = onPick;
    this.onDrag = onDrag;
    this.svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "lab-ladder-svg", role: "img", "aria-label": "Energy ladder. Tap a level to aim the light at it." });
    root.append(this.svg);
    this.state = { n: 1, l: 0, m: 0 };
    this.B = 0;
    this.targets = [];
    this.aim = { total: 0, count: 1, color: "#fff", onRung: false };
    this.dotY = yOf(levelEV(1)); this.dotVy = 0; this.dotX = XDOT;

    this.layers = { rungs: el("g"), emissions: el("g"), arrow: el("g", { class: "aim" }), dot: el("g") };
    // free (ionized) zone and break marks
    this.svg.append(
      el("rect", { x: X0, y: UP.y1 - 8, width: X1 - X0, height: yOf(0) - UP.y1 + 8, class: "free-zone" }),
      el("text", { x: X1, y: yOf(0) - 18, class: "lbl end" }, "electron escapes"),
      el("path", { d: `M ${X0} ${BREAK.y0 - 2} l 8 -5 l 8 5 l 8 -5 M ${X0} ${BREAK.y1 + 6} l 8 -5 l 8 5 l 8 -5`, class: "break" }),
      el("text", { x: X0 + 32, y: (BREAK.y0 + BREAK.y1) / 2 + 3, class: "lbl small" }, "axis broken"),
    );
    this.svg.append(this.layers.rungs, this.layers.emissions, this.layers.arrow, this.layers.dot);
    this.dot = el("circle", { r: 7, class: "dot" });
    this.dotLabel = el("text", { class: "lbl dot-lbl" });
    this.layers.dot.append(this.dot, this.dotLabel);
    this.#bindDrag();
    this.#drawRungs();
  }

  /** The atom's state and field (redraws the rungs). */
  setState(state, B = 0) {
    this.state = state;
    if (B !== this.B) { this.B = B; this.#drawRungs(); }
    this.dotLabel.textContent = nameOf(state);
    this.dotTargetY = state.ionized ? yOf(0.4) : yOf(stateEV(state, B));
    this.dotX = state.ionized || !B || state.n > 4 ? XDOT : XDOT + state.m * 14;
    this.#drawArrow();
  }

  /** Energies (total, eV above the current state) the arrow snaps to: [{ n, total }]. */
  setTargets(targets) { this.targets = targets; }

  /** The light being aimed: total energy (eV), photon count, colour, and whether it hits a rung. */
  setAim(aim) { this.aim = { ...this.aim, ...aim }; this.#drawArrow(); }

  #baseE() { return this.state.ionized ? 0 : stateEV(this.state, this.B); }

  #drawRungs() {
    const g = this.layers.rungs;
    g.replaceChildren();
    const free = el("line", { x1: X0, x2: X1, y1: yOf(0), y2: yOf(0), class: "rung free" });
    g.append(free);
    for (let n = 1; n <= 7; n++) {
      const y = yOf(levelEV(n));
      const hit = el("rect", { x: 0, y: y - 6, width: W, height: 12, class: "rung-hit", "data-n": n });
      const row = el("g", { class: "rung-g", "data-n": n });
      if (this.B && n > 1 && n <= 4) { // sub-levels drawn for n ≤ 4 (higher ones would overlap; the physics includes them)
        row.append(el("line", { x1: X0, x2: X1, y1: y, y2: y, class: "rung ghost" }));
        for (let m = -(n - 1); m <= n - 1; m++) {
          const ym = yOf(stateEV({ n, m }, this.B)), x = XDOT + m * 14;
          row.append(el("line", { x1: x - 5, x2: x + 5, y1: ym, y2: ym, class: "rung sub" }));
        }
      } else {
        row.append(el("line", { x1: X0, x2: X1, y1: y, y2: y, class: "rung" }));
      }
      if (n <= 4) row.append(el("text", { x: X0 - 8, y: y + 4, class: "lbl n end" }, `n = ${n}`));
      else row.append(el("text", { x: X0 - 8, y: y + 3, class: "lbl small end" }, `${n}`));
      if (n <= 3) row.append(el("text", { x: X1, y: y + 13, class: "lbl end" }, `${levelEV(n).toFixed(2)} eV`));
      g.append(row, hit);
      hit.addEventListener("click", () => this.onPick?.(n));
    }
    const freeHit = el("rect", { x: 0, y: UP.y1 - 8, width: W, height: yOf(0) - UP.y1 + 4, class: "rung-hit" });
    freeHit.addEventListener("click", () => this.onPick?.(0));
    g.append(freeHit);
  }

  #drawArrow() {
    const g = this.layers.arrow;
    g.replaceChildren();
    const { total, count, color, onRung } = this.aim;
    if (!(total > 0)) return;
    const e0 = this.#baseE(), y0 = this.dotTargetY ?? yOf(e0), y1 = yOf(e0 + total);
    const x = 84;
    const seg = (ya, yb) => {
      g.append(el("line", { x1: x, x2: x, y1: ya, y2: yb + 5, class: "aim-line", stroke: color }));
      g.append(el("path", { d: `M ${x - 5} ${yb + 8} L ${x} ${yb} L ${x + 5} ${yb + 8}`, class: "aim-line", stroke: color }));
    };
    if (count === 2) {
      const ym = yOf(e0 + total / 2);
      seg(y0, ym + 2); seg(ym - 2, y1);
    } else seg(y0, y1);
    g.append(el("line", { x1: X0, x2: X1, y1: y1, y2: y1, class: `aim-tip-line${onRung ? " on" : ""}`, stroke: color }));
    this.handle = el("circle", { cx: x, cy: y1, r: 9, class: `aim-handle${onRung ? " on" : ""}`, fill: color });
    g.append(this.handle);
    g.classList.toggle("on", onRung);
  }

  #bindDrag() {
    let dragging = false;
    const toSvgY = (e) => {
      const r = this.svg.getBoundingClientRect();
      return ((e.clientY - r.top) / r.height) * H;
    };
    const move = (e, final) => {
      let y = Math.max(UP.y1, Math.min(LO.y0, toSvgY(e)));
      let total = eOf(y) - this.#baseE();
      // snap onto a reachable rung
      for (const t of this.targets) if (Math.abs(yOf(this.#baseE() + t.total) - y) < SNAP_PX) { total = t.total; break; }
      this.onDrag?.(Math.max(0.01, total), final);
    };
    this.svg.addEventListener("pointerdown", (e) => {
      if (!e.target.classList?.contains("aim-handle") && !e.target.classList?.contains("aim-line")) return;
      dragging = true;
      this.svg.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    this.svg.addEventListener("pointermove", (e) => { if (dragging) move(e, false); });
    const end = (e) => { if (dragging) { dragging = false; move(e, true); } };
    this.svg.addEventListener("pointerup", end);
    this.svg.addEventListener("pointercancel", () => { dragging = false; });
  }

  /** An emission arrow (wavy, downward) from energy eFrom to eTo, fading away. */
  emit(eFrom, eTo, color, label) {
    const y1 = yOf(eFrom), y2 = yOf(eTo), x = 186 + (this.layers.emissions.childNodes.length % 3) * 12;
    let d = `M ${x} ${y1}`;
    for (let i = 1; i <= 24; i++) d += ` L ${x + 4 * Math.sin((i / 24) * Math.PI * 6)} ${y1 + (y2 - y1) * (i / 24)}`;
    const g = el("g", { class: "emission" });
    g.append(el("path", { d, class: "aim-line", stroke: color }), el("path", { d: `M ${x - 4} ${y2 - 6} L ${x} ${y2} L ${x + 4} ${y2 - 6}`, class: "aim-line", stroke: color }));
    if (label) g.append(el("text", { x: x - 6, y: (y1 + y2) / 2, class: "lbl end", fill: color }, label));
    this.layers.emissions.append(g);
    setTimeout(() => g.classList.add("old"), 4000);
    setTimeout(() => g.remove(), 6000);
  }

  update(dt) {
    const k = 160, c = 2 * Math.sqrt(k) * 0.45;
    const target = this.dotTargetY ?? this.dotY;
    this.dotVy += (-k * (this.dotY - target) - c * this.dotVy) * dt;
    this.dotY += this.dotVy * dt;
    const stretch = Math.min(0.5, Math.abs(this.dotVy) / 400);
    this.dot.setAttribute("cx", this.dotX);
    this.dot.setAttribute("cy", this.dotY.toFixed(2));
    this.dot.setAttribute("r", (7 * (1 + stretch * 0.3)).toFixed(2));
    this.dotLabel.setAttribute("x", this.dotX + 11);
    this.dotLabel.setAttribute("y", (this.dotY - 9).toFixed(2));
  }
}
