// Live histogram of measured distances with the exact P(r) curve on top.
// Bars spring toward their values; hovering a bar shows its range and count.

import { radial1s } from "./stats.js";
import { radial } from "../physics.js";

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export class RadialChart {
  constructor(histogram, root = document.getElementById("rchart")) {
    this.hist = histogram;
    this.root = root;
    this.theory = radial1s;
    this.yMax = 0.65; // P(r) for 1s peaks at 0.541 (r = 1 a₀)
    this.peakR = 1;
    this.exactMean = 1.5;
    this.canvas = this.root.querySelector("canvas");
    this.footer = this.root.querySelector(".rchart-foot");
    this.readout = this.root.querySelector(".rchart-readout");
    this.heights = new Float32Array(histogram.bins);
    this.vel = new Float32Array(histogram.bins);
    this.peak = 0;          // 0–1 fade for the "most likely distance" marker
    this.showPeak = false;
    this.hover = -1;
    this.canvas.addEventListener("pointermove", (e) => {
      const r = this.canvas.getBoundingClientRect();
      const x = (e.clientX - r.left - this.pad.l) / (r.width - this.pad.l - this.pad.r);
      this.hover = x >= 0 && x <= 1 ? Math.floor(x * this.hist.bins) : -1;
    });
    this.canvas.addEventListener("pointerleave", () => { this.hover = -1; });
    this.pad = { l: 8, r: 8, t: 10, b: 22 };
  }

  get visible() { return !this.root.hidden; }

  /** Compare against the exact P(r) = r²R_nl(r)² of state (n, l). */
  setTheory(n, l) {
    this.theory = (r) => (r * radial(n, l, r)) ** 2;
    let best = 0, bestR = 0;
    for (let i = 1; i <= 600; i++) {
      const r = (i / 600) * this.hist.rMax, p = this.theory(r);
      if (p > best) { best = p; bestR = r; }
    }
    this.yMax = best * 1.2;
    this.peakR = bestR;
    this.exactMean = 0.5 * (3 * n * n - l * (l + 1));
  }

  show() {
    if (this.visible) return;
    this.root.hidden = false;
    this.root.classList.remove("on");
    void this.root.offsetWidth;
    this.root.classList.add("on");
  }
  hide() { this.root.hidden = true; }

  reset() { this.heights.fill(0); this.vel.fill(0); }

  highlightPeak(on) { this.showPeak = on; }

  update(dt) {
    if (!this.visible) return;
    // springy bars
    const k = 90, c = 2 * Math.sqrt(k) * 0.55;
    for (let i = 0; i < this.hist.bins; i++) {
      const target = this.hist.density(i);
      this.vel[i] += (-k * (this.heights[i] - target) - c * this.vel[i]) * dt;
      this.heights[i] += this.vel[i] * dt;
    }
    this.peak += ((this.showPeak ? 1 : 0) - this.peak) * (1 - Math.exp(-dt * 4));
    this.#draw();
    const { total, mean } = this.hist;
    this.footer.textContent = total
      ? `${total.toLocaleString()} measured · average ${mean.toFixed(2)} a₀ (exact: ${this.exactMean.toFixed(2)})`
      : "No measurements yet";
    if (this.hover >= 0 && total) {
      const w = this.hist.width, n = this.hist.counts[this.hover];
      this.readout.textContent = `${(this.hover * w).toFixed(2)}–${((this.hover + 1) * w).toFixed(2)} a₀: ${n.toLocaleString()}`;
      this.readout.hidden = false;
    } else {
      this.readout.hidden = true;
    }
  }

  #draw() {
    const cv = this.canvas, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const { l, r, t, b } = this.pad;
    const pw = w - l - r, ph = h - t - b;
    const { bins, rMax } = this.hist;
    const xOf = (rr) => l + (rr / rMax) * pw;
    const yMax = this.yMax;
    const yOf = (p) => t + ph * (1 - Math.min(p, yMax) / yMax);

    // baseline + ticks
    g.strokeStyle = "rgba(170,179,195,.25)";
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(l, t + ph + 0.5); g.lineTo(l + pw, t + ph + 0.5); g.stroke();
    g.fillStyle = css("--muted");
    g.font = "11px Inter, system-ui, sans-serif";
    g.textAlign = "center";
    const tick = rMax <= 8 ? 1 : rMax <= 30 ? 5 : rMax <= 80 ? 10 : 20;
    for (let x = 0; x <= rMax + 1e-9; x += tick) g.fillText(`${x}`, xOf(x), h - 6);

    // bars (2px gaps, rounded tops)
    const bw = pw / bins;
    const accent = css("--accent");
    for (let i = 0; i < bins; i++) {
      const hgt = Math.max(0, t + ph - yOf(this.heights[i]));
      if (hgt < 0.5) continue;
      g.fillStyle = i === this.hover ? "#8cc8ff" : accent;
      g.globalAlpha = i === this.hover ? 1 : 0.85;
      const x = l + i * bw + 1, wd = Math.max(1, bw - 2), y = t + ph - hgt;
      g.beginPath();
      g.roundRect ? g.roundRect(x, y, wd, hgt, [2, 2, 0, 0]) : g.rect(x, y, wd, hgt);
      g.fill();
    }
    g.globalAlpha = 1;

    // exact curve
    g.strokeStyle = css("--warm");
    g.lineWidth = 2;
    g.setLineDash([5, 4]);
    g.beginPath();
    for (let px = 0; px <= pw; px += 2) {
      const rr = (px / pw) * rMax;
      const y = yOf(this.theory(rr));
      px ? g.lineTo(l + px, y) : g.moveTo(l + px, y);
    }
    g.stroke();
    g.setLineDash([]);

    // most-likely-distance marker at 1 a₀
    if (this.peak > 0.01) {
      g.globalAlpha = this.peak;
      g.strokeStyle = css("--ink");
      g.lineWidth = 1;
      g.setLineDash([2, 3]);
      const xp = xOf(this.peakR);
      g.beginPath(); g.moveTo(xp + 0.5, t); g.lineTo(xp + 0.5, t + ph); g.stroke();
      g.setLineDash([]);
      g.fillStyle = css("--ink");
      g.textAlign = "left";
      g.font = "600 11px Inter, system-ui, sans-serif";
      g.fillText(`most likely: ${this.peakR.toFixed(1)} a₀`, xp + 5, t + 10);
      g.globalAlpha = 1;
    }
  }
}
