// The electron cloud: exact samples of |ψ|² drawn as glowing points.
//
// Changing state moves each particle from where it is now to the same rank in the
// new state (sampler.js), interpolating in spherical coordinates. The "condense"
// mode starts particles far out on a spiral so the cloud falls into place.
//
// Measurement mode (Ch 1): every particle has a "born" time. Hidden particles are
// born in the far future; measuring one sets its born time to now, so it appears
// with a brief flash. Particles are independent samples, so revealing them in index
// order is a fair sequence of measurements.
//
// Axes: physics z (the quantization axis) is drawn pointing up the screen.

import * as THREE from "three";
import { isValid } from "../physics.js";
import { buildTables, makeRanks, sampleState } from "../sampler.js";

const COLOR_POS = new THREE.Color("#4ea8ff");
const COLOR_NEG = new THREE.Color("#ff6b4a");

const fract = (x) => x - Math.floor(x);
const HIDDEN = 1e9, ALWAYS = -1e9;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Start order: mostly by radius rank (inner first), jittered so no sharp shell forms.
const delayRank = (ranks, i) => 0.65 * ranks[3 * i] + 0.35 * fract(ranks[3 * i + 1] * 97.31 + ranks[3 * i + 2] * 13.7);

export class OrbitalCloud {
  constructor({ count = 200000, pixelRatio = 1 } = {}) {
    this.state = { n: 1, l: 0, m: 0 };
    this.tables = null;
    this.target = null;
    this.morph = { start: -Infinity, duration: 1.3, spread: 0.45 };
    this.fade = { value: 1, from: 1, to: 1, start: 0, duration: 0 };
    this.revealed = Infinity; // number of measured (visible) particles; Infinity = all shown
    this.uniforms = {
      uMix: { value: 1 },
      uSpread: { value: 0.45 },
      uPointSize: { value: 2.2 },
      uPixelRatio: { value: pixelRatio },
      uAlpha: { value: 0.5 },
      uFade: { value: 1 },
      uPulse: { value: 0 },
      uTime: { value: 0 },
      uFlash: { value: 1 },   // brightness of the flash when a particle is measured
      uSparse: { value: 0 },  // 0–1: enlarge/brighten dots while there are only a few
      uColorPos: { value: COLOR_POS },
      uColorNeg: { value: COLOR_NEG },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute vec3 aFrom;      // (r, cosθ, φ) at morph start
        attribute vec3 aTo;        // (r, cosθ, φ) in the target state
        attribute vec2 aSign;      // sign of ψ at start / target
        attribute vec3 aRank;      // the particle's fixed uniform ranks
        attribute float aBorn;     // time the particle was measured (future = hidden)
        uniform float uMix, uSpread, uPointSize, uPixelRatio, uPulse, uTime, uFlash, uSparse;
        uniform vec3 uColorPos, uColorNeg;
        varying vec3 vColor;
        varying float vBoost;

        vec3 toWorld(vec3 s) {     // physics (x, y, z) -> three.js (x, z, -y): z points up
          float sinT = sqrt(max(0.0, 1.0 - s.y * s.y));
          return s.x * vec3(sinT * cos(s.z), s.y, -sinT * sin(s.z));
        }
        float delayRank(vec3 r) { return 0.65 * r.x + 0.35 * fract(r.y * 97.31 + r.z * 13.7); }

        void main() {
          float age = uTime - aBorn;
          if (age < 0.0) {                                       // not measured yet
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            gl_PointSize = 0.0;
            vColor = vec3(0.0); vBoost = 0.0;
            return;
          }
          float flash = uFlash * exp(-age * 4.0);
          float t = clamp(uMix * (1.0 + uSpread) - delayRank(aRank) * uSpread, 0.0, 1.0);
          t = t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0; // ease in-out cubic
          float thetaFrom = acos(aFrom.y), thetaTo = acos(aTo.y);
          vec3 s = vec3(mix(aFrom.x, aTo.x, t), cos(mix(thetaFrom, thetaTo, t)), mix(aFrom.z, aTo.z, t));
          vec4 mv = modelViewMatrix * vec4(toWorld(s), 1.0);
          gl_Position = projectionMatrix * mv;

          float sgn = mix(aSign.x, aSign.y, t);
          vColor = mix(uColorNeg, uColorPos, 0.5 + 0.5 * sgn);
          vColor = mix(vColor, vec3(1.0, 0.96, 0.88), clamp(flash, 0.0, 1.0) * 0.8);
          vBoost = 1.0 + 3.0 * uSparse + 2.0 * flash;
          float moving = sin(3.14159 * t);                     // particles in flight glow a little bigger
          gl_PointSize = uPointSize * uPixelRatio * (0.7 + 0.6 * aRank.z) * (1.0 + 0.25 * moving + 0.5 * uPulse)
                       * (1.0 + 2.0 * uSparse) * (1.0 + 4.0 * flash);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uAlpha, uFade;
        varying vec3 vColor;
        varying float vBoost;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float a = exp(-dot(d, d) * 14.0);                   // soft gaussian dot
          gl_FragColor = vec4(vColor * a * min(1.0, uAlpha * vBoost) * uFade, 1.0);
        }`,
    });
    this.object = new THREE.Group();
    this.setCount(count);
  }

  get count() { return this.ranks.length / 3; }

  setCount(count) {
    if (this.points) { this.object.remove(this.points); this.points.geometry.dispose(); }
    this.ranks = makeRanks(count, 1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("aFrom", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute("aTo", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute("aSign", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    geo.setAttribute("aRank", new THREE.BufferAttribute(this.ranks, 3));
    geo.setAttribute("aBorn", new THREE.BufferAttribute(new Float32Array(count).fill(ALWAYS), 1));
    this.revealed = Infinity;
    // three.js needs a position attribute for draw-range bookkeeping; the shader ignores it.
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    this.points = new THREE.Points(geo, this.material);
    this.object.add(this.points);
    if (this.target) {
      const { n, l, m } = this.state;
      this.target = null;
      this.setState(n, l, m, { mode: "instant" });
    }
  }

  /** Radius containing a fraction q of the probability, for framing. */
  radius(q = 0.95) { return this.tables ? this.tables.radiusQuantile(q) : 1; }

  /** Additive brightness ∝ particles per pixel: scale alpha by framed side length and count. */
  setFramedSide(sidePx) {
    const density = (this.count / 150000) * (860 * 860) / (sidePx * sidePx);
    this.uniforms.uAlpha.value = THREE.MathUtils.clamp(0.5 * density ** -0.75, 0.04, 0.9);
  }

  // Where each particle is right now (replicates the shader), so an interrupted morph
  // continues from the current positions instead of jumping.
  currentSpherical(now) {
    const { start, duration, spread } = this.morph;
    const mix = Math.min(1, (now - start) / duration);
    const { aFrom, aTo, aSign } = this.points.geometry.attributes;
    const from = aFrom.array, to = aTo.array, sign = aSign.array, ranks = this.ranks;
    const sph = new Float32Array(from.length);
    const outSign = new Float32Array(sign.length / 2);
    for (let i = 0; i < outSign.length; i++) {
      const t = easeInOutCubic(Math.min(1, Math.max(0, mix * (1 + spread) - delayRank(ranks, i) * spread)));
      const thF = Math.acos(from[3 * i + 1]), thT = Math.acos(to[3 * i + 1]);
      sph[3 * i] = from[3 * i] + (to[3 * i] - from[3 * i]) * t;
      sph[3 * i + 1] = Math.cos(thF + (thT - thF) * t);
      sph[3 * i + 2] = from[3 * i + 2] + (to[3 * i + 2] - from[3 * i + 2]) * t;
      outSign[i] = sign[2 * i] + (sign[2 * i + 1] - sign[2 * i]) * t;
    }
    return { sph, sign: outSign };
  }

  /**
   * Move to state (n, l, m).
   * mode: "morph" (from current positions), "instant", or "condense" (fall in from a wide spiral).
   * sample: precomputed { sph, sign } for this cloud's ranks (e.g. from the worker).
   */
  setState(n, l, m, { mode = "morph", duration, spread, sample } = {}) {
    if (!isValid(n, l, m)) return false;
    const now = performance.now() / 1000;
    const start = this.target && mode === "morph" ? this.currentSpherical(now) : null;

    this.state = { n, l, m };
    this.tables = buildTables(n, l, m);
    this.target = sample ?? sampleState(this.tables, this.ranks);

    const { aFrom, aTo, aSign } = this.points.geometry.attributes;
    aTo.array.set(this.target.sph);
    if (mode === "condense") {
      // spiral in: start 2.5–6.5× farther out, swung back in azimuth
      const ranks = this.ranks, src = this.target.sph, dst = aFrom.array;
      for (let i = 0; i < src.length / 3; i++) {
        dst[3 * i] = src[3 * i] * (2.5 + 4 * fract(ranks[3 * i + 1] * 7.13));
        dst[3 * i + 1] = src[3 * i + 1];
        dst[3 * i + 2] = src[3 * i + 2] - (1.2 + 2 * ranks[3 * i + 2]);
      }
    } else {
      aFrom.array.set(start ? start.sph : this.target.sph);
    }
    const signs = aSign.array;
    for (let i = 0; i < this.target.sign.length; i++) {
      signs[2 * i] = start ? start.sign[i] : this.target.sign[i];
      signs[2 * i + 1] = this.target.sign[i];
    }
    aFrom.needsUpdate = aTo.needsUpdate = aSign.needsUpdate = true;

    const defaults = mode === "condense" ? { duration: 3.2, spread: 0.8 } : { duration: 1.3, spread: 0.45 };
    this.morph = {
      start: mode === "instant" ? -Infinity : now,
      duration: duration ?? defaults.duration,
      spread: spread ?? defaults.spread,
    };
    this.uniforms.uSpread.value = this.morph.spread;
    this.uniforms.uPulse.value = mode === "morph" ? 0.8 : 0;
    return true;
  }

  // ------------------------------------------------------------ measurement mode

  #markBorn(start, count) {
    const attr = this.points.geometry.attributes.aBorn;
    if (attr.addUpdateRange) {
      attr.clearUpdateRanges();
      attr.addUpdateRange(start, count);
    }
    attr.needsUpdate = true;
  }

  /** Hide every particle (nothing measured yet). */
  hideAll() {
    this.points.geometry.attributes.aBorn.array.fill(HIDDEN);
    this.#markBorn(0, this.count);
    this.revealed = 0;
    this.uniforms.uSparse.value = 1;
  }

  /** Show every particle with no flash (normal display). */
  showAll() {
    if (this.revealed === Infinity) return;
    this.points.geometry.attributes.aBorn.array.fill(ALWAYS);
    this.#markBorn(0, this.count);
    this.revealed = Infinity;
    this.uniforms.uSparse.value = 0;
    this.uniforms.uFlash.value = 1;
  }

  /** Measure the next `k` particles now. Returns the index of the first one (or -1). */
  reveal(k, now = performance.now() / 1000) {
    const start = this.revealed === Infinity ? this.count : this.revealed;
    const n = Math.min(k, this.count - start);
    if (n <= 0) return -1;
    this.points.geometry.attributes.aBorn.array.fill(now, start, start + n);
    this.#markBorn(start, n);
    this.revealed = start + n;
    return start;
  }

  /** Measure all remaining particles, spread over `seconds`. Returns the first index revealed. */
  revealRest(seconds = 1.5, now = performance.now() / 1000) {
    if (this.revealed === Infinity) return -1;
    const start = this.revealed, n = this.count - start;
    const born = this.points.geometry.attributes.aBorn.array;
    for (let j = 0; j < n; j++) born[start + j] = now + seconds * (j / n) ** 2;
    this.#markBorn(start, n);
    this.revealed = this.count;
    return start;
  }

  /** Radius (a₀) of particle i in the target state. */
  radiusOf(i) { return this.target.sph[3 * i]; }

  /** World position of particle i in the target state (physics z → three.js y). */
  worldPosition(i, out = new THREE.Vector3()) {
    const r = this.target.sph[3 * i], c = this.target.sph[3 * i + 1], p = this.target.sph[3 * i + 2];
    const s = Math.sqrt(Math.max(0, 1 - c * c));
    return out.set(r * s * Math.cos(p), r * c, -r * s * Math.sin(p));
  }

  /** Fade the whole cloud to opacity `to` (0–1) over `seconds`. */
  fadeTo(to, seconds = 0.8) {
    this.fade = { value: this.fade.value, from: this.fade.value, to, start: performance.now() / 1000, duration: seconds };
  }

  update(now, dt) {
    this.uniforms.uTime.value = now;
    this.uniforms.uMix.value = Math.min(1, (now - this.morph.start) / this.morph.duration);
    this.uniforms.uPulse.value *= Math.exp(-dt * 4);
    const f = this.fade;
    const t = f.duration > 0 ? Math.min(1, (now - f.start) / f.duration) : 1;
    f.value = f.from + (f.to - f.from) * easeInOutCubic(t);
    this.uniforms.uFade.value = f.value;
    this.points.visible = f.value > 0.001;
  }
}
