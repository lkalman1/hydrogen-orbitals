// Renders Ψ(t) = c·ψa·e^(−iEa t) + s·ψb·e^(−iEb t) with importance-weighted
// particles (see ../mixture.js): positions are fixed exact samples of ½(|ψa|² + |ψb|²),
// and each particle's brightness is its weight |Ψ(t)|²/q, computed in the shader from
// each state's amplitude and phase at that point.

import * as THREE from "three";

export class SuperpositionCloud {
  constructor({ pixelRatio = 1, colorPos, colorNeg }) {
    this.uniforms = {
      uC2: { value: 1 }, uS2: { value: 0 }, uCS: { value: 0 }, uPhase: { value: 0 },
      uRealA: { value: 1 }, uRealB: { value: 1 },
      uPointSize: { value: 2.2 }, uPixelRatio: { value: pixelRatio },
      uAlpha: { value: 0.5 }, uFade: { value: 0 }, uFlash: { value: 0 },
      uColorPos: { value: colorPos }, uColorNeg: { value: colorNeg },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aAmpA, aPhA, aAmpB, aPhB, aQ, aSize;
        uniform float uC2, uS2, uCS, uPhase, uRealA, uRealB, uPointSize, uPixelRatio, uFlash;
        uniform vec3 uColorPos, uColorNeg;
        varying vec3 vColor;
        varying float vW;
        void main() {
          float a2 = uC2 * aAmpA * aAmpA, b2 = uS2 * aAmpB * aAmpB;
          float w = aQ > 0.0 ? (a2 + b2 + uCS * aAmpA * aAmpB * cos(aPhB - aPhA - uPhase)) / aQ : 0.0;
          vW = max(w, 0.0);
          if (vW < 0.003) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vColor = vec3(0.0); return; }
          // colour: sign of ψ (real orbitals) in whichever state dominates here; swirling states are positive
          float sA = mix(1.0, sign(cos(aPhA)), uRealA), sB = mix(1.0, sign(cos(aPhB)), uRealB);
          float sgn = (a2 * sA + b2 * sB) / max(a2 + b2, 1e-12);
          vColor = mix(uColorNeg, uColorPos, 0.5 + 0.5 * sgn);
          vColor = mix(vColor, vec3(1.0, 0.96, 0.9), 0.35 * uFlash);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uPointSize * uPixelRatio * (0.7 + 0.6 * aSize) * (1.0 + 0.35 * uFlash);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uAlpha, uFade;
        varying vec3 vColor;
        varying float vW;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float a = exp(-dot(d, d) * 14.0);
          gl_FragColor = vec4(vColor * a * min(1.0, uAlpha * vW) * uFade, 1.0);
        }`,
    });
    this.points = new THREE.Points(new THREE.BufferGeometry(), this.material);
    this.points.visible = false;
    this.object = this.points;
  }

  /** Load particles from buildMixture(). */
  load({ pos, ampA, phA, ampB, phB, q, size }, { realA = true, realB = true } = {}) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aAmpA", new THREE.BufferAttribute(ampA, 1));
    geo.setAttribute("aPhA", new THREE.BufferAttribute(phA, 1));
    geo.setAttribute("aAmpB", new THREE.BufferAttribute(ampB, 1));
    geo.setAttribute("aPhB", new THREE.BufferAttribute(phB, 1));
    this.uniforms.uRealA.value = realA ? 1 : 0;
    this.uniforms.uRealB.value = realB ? 1 : 0;
    geo.setAttribute("aQ", new THREE.BufferAttribute(q, 1));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    this.points.geometry.dispose();
    this.points.geometry = geo;
  }

  /**
   * Set the state: amplitudes c, s (c² + s² = 1), beat phase ΔE·t, and coherence
   * (1 = superposition, 0 = statistical mixture).
   */
  set(c, s, phase = 0, coherence = 1) {
    this.uniforms.uC2.value = c * c;
    this.uniforms.uS2.value = s * s;
    this.uniforms.uCS.value = 2 * c * s * coherence;
    this.uniforms.uPhase.value = phase;
  }

  setFade(f) {
    this.uniforms.uFade.value = f;
    this.points.visible = f > 0.002;
  }
}
