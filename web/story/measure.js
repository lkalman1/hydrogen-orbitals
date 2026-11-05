// Chapter 1's measuring tool.
//
// Each measurement reveals the next exact sample of |ψ|² (see cloud.reveal) with a
// flash; single measurements also get an expanding ring, a distance tag and a click
// whose pitch falls with distance. Holding Measure ramps the rate exponentially
// (stats.rampRate) so dots become a texture and then a cloud, while the radial
// histogram converges to the exact P(r).

import * as THREE from "three";
import { rampRate, sparseness, RadialHistogram } from "./stats.js";
import { RadialChart } from "./radial-chart.js";
import { RadiusMarker } from "../scene/markers.js";

const MAX_CLICKS_PER_SECOND = 28;
const RING_SECONDS = 0.9;
const TAG_SECONDS = 1.6;
const $ = (id) => document.getElementById(id);

function ringTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.strokeStyle = "rgba(255,230,200,1)";
  g.lineWidth = 6;
  g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.stroke();
  return new THREE.CanvasTexture(c);
}

export class Measurement {
  /** els: { button, tag, chart } (defaults: the guided tour's elements). */
  constructor({ stage, audio, els = {} }) {
    this.stage = stage;
    this.audio = audio;
    this.hist = new RadialHistogram();
    this.chart = new RadialChart(this.hist, els.chart ?? $("rchart"));
    this.marker = new RadiusMarker(stage.scene);
    this.button = els.button ?? $("measure-btn");
    this.rateEl = this.button.querySelector(".rate");
    this.tag = els.tag ?? $("measure-tag");
    this.labelHold = els.labelHold ?? "Hold to measure";
    this.labelTap = els.labelTap ?? "Measure";
    this.active = false;
    this.allowHold = false;
    this.holding = false;
    this.holdStart = 0;
    this.carry = 0;
    this.lastClick = 0;
    this.listeners = new Set();
    this.tagUntil = 0;
    this.tagIndex = -1;

    const tex = ringTexture();
    this.rings = Array.from({ length: 10 }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.visible = false;
      s.born = -Infinity;
      stage.scene.add(s);
      return s;
    });
    this.nextRing = 0;

    this.#bindButton();
    stage.rig.onTap(() => { if (this.active) this.measure(1); });
    stage.onFrame((now, dt) => this.#update(now, dt));
  }

  get count() { return this.hist.total; }

  /** Called with the running total after each batch of measurements. */
  onCount(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  /** Start from an empty atom: 1s state, nothing measured. */
  reset() {
    const { cloud } = this.stage;
    if (cloud.state.n !== 1 || cloud.state.l !== 0) cloud.setState(1, 0, 0, { mode: "instant" });
    cloud.fadeTo(1, 0.4);
    cloud.hideAll();
    if (this.hist.rMax !== 6) this.hist.setRange(6);
    this.chart.setTheory(1, 0);
    this.hist.reset();
    this.chart.reset();
    this.#stopHold();
  }

  /** Show the Measure button. hold: allow press-and-hold for rapid measurements. */
  enable({ hold = false } = {}) {
    this.active = true;
    this.allowHold = hold;
    this.button.hidden = false;
    this.button.classList.toggle("can-hold", hold);
    this.button.querySelector(".label").textContent = hold ? this.labelHold : this.labelTap;
  }

  disable() {
    this.active = false;
    this.button.hidden = true;
    this.#stopHold();
  }

  /** Point the histogram at the cloud's current state (clears it; the cloud is untouched). */
  retarget() {
    const { cloud } = this.stage;
    const { n, l } = cloud.state;
    this.hist.setRange(Math.ceil(cloud.radius(0.995)));
    this.chart.setTheory(n, l);
    this.chart.reset();
  }

  /** Start measuring the cloud's current state from scratch (nothing shown yet). */
  startOver() {
    this.retarget();
    this.stage.cloud.hideAll();
    this.#stopHold();
  }

  /** Leave measuring entirely: hide the tools and show the whole cloud normally. */
  release() {
    this.disable();
    this.chart.hide();
    this.chart.highlightPeak(false);
    this.marker.show(false);
    this.tag.hidden = true;
    this.stage.cloud.showAll();
  }

  /** Make n measurements now. */
  measure(n = 1) {
    const { cloud } = this.stage;
    if (cloud.revealed === Infinity) return 0;
    const now = performance.now() / 1000;
    const start = cloud.reveal(n, now);
    if (start < 0) return 0;
    const k = cloud.revealed - start;
    for (let i = start; i < start + k; i++) this.hist.add(cloud.radiusOf(i));

    const single = k === 1 && (!this.holding || rampRate(now - this.holdStart) < 6);
    if (single) {
      this.#ring(start, now);
      if (this.hist.total <= 40) { this.tagIndex = start; this.tagUntil = now + TAG_SECONDS; }
    }
    // clicks: every single measurement, then a rate-limited granular texture
    if (single || now - this.lastClick > 1 / MAX_CLICKS_PER_SECOND) {
      this.lastClick = now;
      const r = cloud.radiusOf(start + Math.floor(Math.random() * k));
      this.audio.sfx("measure", { r, level: single ? 1 : 0.5 });
    }
    for (const fn of this.listeners) fn(this.hist.total);
    return k;
  }

  /** Measure everything left, spread over `seconds` (a swelling reveal). */
  revealRest(seconds = 1.6) {
    const { cloud } = this.stage;
    if (cloud.revealed === Infinity) return;
    const start = cloud.revealRest(seconds);
    if (start < 0) return;
    for (let i = start; i < cloud.count; i++) this.hist.add(cloud.radiusOf(i));
    this.audio.sfx("reveal-swell", { seconds });
    for (const fn of this.listeners) fn(this.hist.total);
  }

  #ring(i, now) {
    const s = this.rings[this.nextRing++ % this.rings.length];
    this.stage.cloud.worldPosition(i, s.position);
    s.born = now;
    s.visible = true;
  }

  #bindButton() {
    const b = this.button;
    b.addEventListener("pointerdown", (e) => {
      if (!this.active) return;
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      this.measure(1);
      if (this.allowHold) this.#startHold();
      b.classList.add("pressed");
    });
    const up = () => { this.#stopHold(); b.classList.remove("pressed"); };
    b.addEventListener("pointerup", up);
    b.addEventListener("pointercancel", up);
    b.addEventListener("lostpointercapture", up);
    // keyboard: Enter/space taps; holding space on the focused button holds
    b.addEventListener("keydown", (e) => {
      if (!this.active || (e.key !== " " && e.key !== "Enter")) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      this.measure(1);
      if (this.allowHold) this.#startHold();
      b.classList.add("pressed");
    });
    b.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") up(); });
  }

  #startHold() {
    this.holding = true;
    this.holdStart = performance.now() / 1000;
    this.carry = 0;
  }

  #stopHold() {
    this.holding = false;
    this.button.classList.remove("holding");
    this.rateEl.textContent = "";
  }

  #update(now, dt) {
    const { cloud, rig, camera } = this.stage;
    if (this.holding && this.active) {
      const rate = rampRate(now - this.holdStart);
      this.carry += rate * dt;
      const n = Math.floor(this.carry);
      this.carry -= n;
      if (n > 0) this.measure(n);
      this.button.classList.toggle("holding", rate > 6);
      this.rateEl.textContent = rate > 6 ? `${Math.round(rate).toLocaleString()} / s` : "";
      cloud.uniforms.uFlash.value = 1 / (1 + rate / 300);
    } else if (cloud.revealed !== Infinity) {
      cloud.uniforms.uFlash.value += (1 - cloud.uniforms.uFlash.value) * (1 - Math.exp(-dt * 2));
    }
    if (cloud.revealed !== Infinity) {
      const target = sparseness(cloud.revealed);
      cloud.uniforms.uSparse.value += (target - cloud.uniforms.uSparse.value) * (1 - Math.exp(-dt * 3));
    }

    for (const s of this.rings) {
      if (!s.visible) continue;
      const age = (now - s.born) / RING_SECONDS;
      if (age >= 1) { s.visible = false; continue; }
      s.scale.setScalar(rig.dist * (0.015 + 0.06 * Math.sqrt(age)));
      s.material.opacity = 0.9 * (1 - age) ** 2;
    }

    // distance tag next to the latest single measurement
    if (now < this.tagUntil && this.tagIndex >= 0 && cloud.revealed !== Infinity) {
      const p = rig.project(cloud.worldPosition(this.tagIndex));
      this.tag.hidden = false;
      this.tag.style.transform = `translate(${p.x + 14}px, ${p.y - 12}px)`;
      this.tag.style.opacity = String(Math.min(1, (this.tagUntil - now) / 0.4));
      this.tag.textContent = `${cloud.radiusOf(this.tagIndex).toFixed(2)} a₀ from the proton`;
    } else {
      this.tag.hidden = true;
    }

    this.chart.update(dt);
    this.marker.update(dt, camera, rig.dist);
  }
}
