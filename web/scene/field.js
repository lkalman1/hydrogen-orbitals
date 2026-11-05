// Magnetic field lines along the physics z-axis (world y): a ring of vertical lines
// around the atom with glowing arrows flowing up them. Brightness follows the field.

import * as THREE from "three";

const LINES = 10;
const ARROWS_PER_LINE = 2;

function arrowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#9fe6ff";
  g.beginPath(); g.moveTo(32, 8); g.lineTo(54, 50); g.lineTo(32, 40); g.lineTo(10, 50); g.closePath(); g.fill();
  return new THREE.CanvasTexture(c);
}

export class FieldLines {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.visible = false;
    this.material = new THREE.LineBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const tex = arrowTexture();
    this.arrows = [];
    for (let i = 0; i < LINES; i++) {
      const a = (i / LINES) * Math.PI * 2, r = 0.85 + 0.15 * ((i * 7) % 3);
      const x = r * Math.cos(a), z = r * Math.sin(a);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, -1.6, z), new THREE.Vector3(x, 1.6, z)]), this.material);
      this.group.add(line);
      for (let k = 0; k < ARROWS_PER_LINE; k++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending }));
        s.userData = { x, z, offset: k / ARROWS_PER_LINE + (i % 5) * 0.07 };
        this.group.add(s);
        this.arrows.push(s);
      }
    }
    this.level = 0; this.target = 0;
    scene.add(this.group);
  }

  /** strength 0–1 */
  set(strength) { this.target = strength; }

  update(now, dt, radius) {
    this.level += (this.target - this.level) * (1 - Math.exp(-dt * 4));
    this.group.visible = this.level > 0.01;
    if (!this.group.visible) return;
    this.group.scale.setScalar(radius);
    this.material.opacity = 0.14 * Math.min(1, this.level * 1.5);
    const speed = 0.12 + 0.35 * this.level;
    for (const s of this.arrows) {
      const { x, z, offset } = s.userData;
      const t = (now * speed + offset) % 1;
      s.position.set(x, -1.6 + 3.2 * t, z);
      s.scale.setScalar(0.045);
      s.material.opacity = 0.55 * Math.min(1, this.level * 1.5) * Math.sin(Math.PI * t);
    }
  }
}
