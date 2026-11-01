// Spectrum "barcode": every photon the atom emits adds to its wavelength's line.
// Log wavelength axis from the far ultraviolet to the infrared, with the visible
// band drawn as a faint rainbow.

import { wavelengthRGB, rgbCss, regionOf } from "../spectroscopy.js";

const LO = 90, HI = 2000;
const fx = (nm) => Math.log(nm / LO) / Math.log(HI / LO);
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export class Spectrum {
  constructor() {
    this.root = document.getElementById("spectrum");
    this.canvas = this.root.querySelector("canvas");
    this.lines = new Map(); // nm (rounded to 0.1) → { nm, count, flash }
  }

  get visible() { return !this.root.hidden; }
  show() {
    if (!this.visible) { this.root.hidden = false; this.root.classList.remove("on"); void this.root.offsetWidth; this.root.classList.add("on"); }
  }
  hide() { this.root.hidden = true; }
  reset() { this.lines.clear(); }

  add(nm) {
    const key = Math.round(nm * 10) / 10;
    const line = this.lines.get(key) ?? { nm, count: 0, flash: 0 };
    line.count++;
    line.flash = 1;
    this.lines.set(key, line);
  }

  update(dt) {
    if (!this.visible) return;
    for (const l of this.lines.values()) l.flash *= Math.exp(-dt * 2.5);
    this.#draw();
  }

  #draw() {
    const cv = this.canvas, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const top = 16, bot = h - 16, x = (nm) => 6 + fx(nm) * (w - 12);

    // visible band as a faint rainbow
    for (let nm = 380; nm <= 750; nm += 2) {
      g.fillStyle = rgbCss(wavelengthRGB(nm));
      g.globalAlpha = 0.16;
      g.fillRect(x(nm), top, Math.max(1, x(nm + 2) - x(nm)), bot - top);
    }
    g.globalAlpha = 1;
    g.strokeStyle = "rgba(170,179,195,.25)";
    g.strokeRect(6.5, top + 0.5, w - 13, bot - top);

    // region labels
    g.font = "11px Inter, system-ui, sans-serif";
    g.fillStyle = css("--muted");
    g.textAlign = "center";
    g.fillText("ultraviolet (invisible)", (x(LO) + x(380)) / 2, h - 3);
    g.fillText("visible", (x(380) + x(750)) / 2, h - 3);
    g.fillText("infrared", (x(750) + x(HI)) / 2, h - 3);

    // lines (labels alternate height where neighbours would collide)
    let lastLabelX = -Infinity, raised = true;
    for (const l of [...this.lines.values()].sort((p, q) => p.nm - q.nm)) {
      const xx = x(l.nm), color = rgbCss(wavelengthRGB(l.nm));
      const strength = Math.min(1, 0.45 + 0.12 * l.count);
      g.strokeStyle = color;
      g.globalAlpha = strength;
      g.lineWidth = 2 + 4 * l.flash;
      g.shadowColor = color;
      g.shadowBlur = 6 + 18 * l.flash;
      g.beginPath(); g.moveTo(xx, top + 1); g.lineTo(xx, bot - 1); g.stroke();
      g.shadowBlur = 0;
      g.globalAlpha = 1;
      g.fillStyle = regionOf(l.nm) === "visible" ? color : css("--ink-2");
      g.font = "600 11px Inter, system-ui, sans-serif";
      raised = xx - lastLabelX < 34 ? !raised : true;
      g.fillText(`${l.nm.toFixed(1)}`, xx, raised ? top - 4 : top + 12);
      lastLabelX = xx;
    }
  }
}
