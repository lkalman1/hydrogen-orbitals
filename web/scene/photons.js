// Photons drawn as glowing wave packets with a label, plus a laser beam.
//
// Sizes are proportional to the camera distance, so they look the same on screen
// whatever orbital is in view. Directions are given in screen terms (left, right,
// random) and converted using the camera, so the laser always comes from the left.

import * as THREE from "three";
import { wavelengthRGB, describeNm } from "../spectroscopy.js";

const POINTS = 90;
const tmp = new THREE.Vector3();

function textSprite(text, css) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 64;
  const g = c.getContext("2d");
  g.font = "600 30px Inter, system-ui, sans-serif";
  g.fillStyle = css; g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = "rgba(0,0,0,.9)"; g.shadowBlur = 8;
  g.fillText(text, 256, 34);
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
}

function glowSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.3, "rgba(255,255,255,.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
}

export class Photons {
  constructor(scene, rig, camera) {
    this.scene = scene;
    this.rig = rig;
    this.camera = camera;
    this.list = [];
    this.flashes = [];
    // laser beam across the screen through the atom
    this.beamMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    this.beam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), this.beamMat);
    this.beam.frustumCulled = false;
    scene.add(this.beam);
    this.beamLevel = 0;
    this.beamTarget = 0;
    this.beamPulse = 0;
  }

  /** Camera-aligned unit vectors: right, up, toward-camera. */
  axes() {
    const m = this.camera.matrixWorld.elements;
    return {
      right: new THREE.Vector3(m[0], m[1], m[2]).normalize(),
      up: new THREE.Vector3(m[4], m[5], m[6]).normalize(),
      back: new THREE.Vector3(m[8], m[9], m[10]).normalize(),
    };
  }

  /** A point `scale` view-widths away along a screen direction (radians, 0 = right). */
  offscreen(angle, scale = 0.75) {
    const { right, up } = this.axes();
    return right.multiplyScalar(Math.cos(angle)).add(up.multiplyScalar(Math.sin(angle))).multiplyScalar(this.rig.dist * scale);
  }

  setBeam({ nm, on }) {
    if (nm) this.beamMat.color.setRGB(...wavelengthRGB(nm));
    this.beamTarget = on ? 1 : 0;
  }
  pulseBeam() { this.beamPulse = 1; }

  /**
   * Launch a photon. from/to: THREE.Vector3 in world space (or functions returning one,
   * re-evaluated each frame so they follow the camera). Resolves when it arrives.
   */
  spawn({ nm, from, to, duration = 0.9, label = true, dim = false, passThrough = false }) {
    const [r, g, b] = wavelengthRGB(nm);
    const color = new THREE.Color(r, g, b);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(POINTS * 3), 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    line.frustumCulled = false;
    const head = glowSprite();
    head.material.color = color;
    const tag = label ? textSprite(describeNm(nm), `rgb(${r * 255 | 0},${g * 255 | 0},${b * 255 | 0})`) : null;
    this.scene.add(line, head);
    if (tag) this.scene.add(tag);
    // visual wave: more wiggles for shorter wavelengths
    const cycles = THREE.MathUtils.clamp(3 + 1800 / nm, 4, 12);
    return new Promise((resolve) => {
      this.list.push({
        line, head, tag, from, to, duration, cycles, dim, passThrough, resolve,
        start: performance.now() / 1000, arrived: false,
      });
    });
  }

  /** A burst of light at the nucleus (absorption / emission). */
  flash(nm, strength = 1) {
    const s = glowSprite();
    s.material.color = new THREE.Color(...wavelengthRGB(nm));
    this.scene.add(s);
    this.flashes.push({ s, start: performance.now() / 1000, strength });
  }

  update(now, dt) {
    const dist = this.rig.dist;
    const { right, up, back } = this.axes();
    // beam
    this.beamLevel += (this.beamTarget - this.beamLevel) * (1 - Math.exp(-dt * 5));
    this.beamPulse *= Math.exp(-dt * 5);
    const pos = this.beam.geometry.attributes.position.array;
    tmp.copy(right).multiplyScalar(dist * 2);
    pos[0] = -tmp.x; pos[1] = -tmp.y; pos[2] = -tmp.z; pos[3] = tmp.x; pos[4] = tmp.y; pos[5] = tmp.z;
    this.beam.geometry.attributes.position.needsUpdate = true;
    this.beamMat.opacity = this.beamLevel * (0.12 + 0.5 * this.beamPulse);
    this.beam.visible = this.beamMat.opacity > 0.003;

    for (const p of [...this.list]) {
      const from = typeof p.from === "function" ? p.from() : p.from;
      const to = typeof p.to === "function" ? p.to() : p.to;
      let t = (now - p.start) / p.duration;
      if (!p.arrived && t >= 1) { p.arrived = true; p.resolve(); }
      const tEnd = p.passThrough ? 2 : 1;
      if (t >= tEnd) {
        this.scene.remove(p.line, p.head);
        if (p.tag) this.scene.remove(p.tag);
        p.line.geometry.dispose();
        this.list.splice(this.list.indexOf(p), 1);
        continue;
      }
      // centre position; pass-through photons keep going beyond the target
      const centre = from.clone().lerp(to, t);
      const dir = to.clone().sub(from).normalize();
      let perp = dir.clone().cross(back);
      if (perp.lengthSq() < 1e-6) perp = up.clone();
      perp.normalize();
      const L = dist * 0.11, A = dist * 0.008;
      const arr = p.line.geometry.attributes.position.array;
      for (let i = 0; i < POINTS; i++) {
        const u = i / (POINTS - 1) - 0.5;                       // −½ … ½ along the packet
        const env = Math.exp(-(u * u) / 0.05);
        const disp = A * env * Math.sin(2 * Math.PI * (p.cycles * u - (now - p.start) * 2.2));
        arr[3 * i] = centre.x + dir.x * u * L + perp.x * disp;
        arr[3 * i + 1] = centre.y + dir.y * u * L + perp.y * disp;
        arr[3 * i + 2] = centre.z + dir.z * u * L + perp.z * disp;
      }
      p.line.geometry.attributes.position.needsUpdate = true;
      const fade = Math.min(1, t * 6, (tEnd - t) * 6) * (p.dim ? 0.45 : 1);
      p.line.material.opacity = fade;
      p.head.position.copy(centre);
      p.head.scale.setScalar(dist * 0.03);
      p.head.material.opacity = 0.9 * fade;
      if (p.tag) {
        p.tag.position.copy(centre).addScaledVector(up, dist * 0.035);
        p.tag.scale.set(dist * 0.16, dist * 0.02, 1);
        p.tag.material.opacity = fade;
      }
    }

    for (const f of [...this.flashes]) {
      const age = (now - f.start) / 0.7;
      if (age >= 1) { this.scene.remove(f.s); this.flashes.splice(this.flashes.indexOf(f), 1); continue; }
      f.s.scale.setScalar(dist * (0.05 + 0.25 * Math.sqrt(age)) * f.strength);
      f.s.material.opacity = (1 - age) ** 2;
    }
  }
}
