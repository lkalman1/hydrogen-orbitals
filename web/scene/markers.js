// A glowing ring of a given radius that always faces the camera, with a label:
// used to mark the Bohr radius (1 a₀) around the 1s cloud.

import * as THREE from "three";

function labelSprite(text) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 64;
  const g = c.getContext("2d");
  g.font = "600 34px Inter, system-ui, sans-serif";
  g.fillStyle = "#ffd9b8"; g.textAlign = "left"; g.textBaseline = "middle";
  g.fillText(text, 8, 34);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  s.center.set(0, 0.5);
  return s;
}

export class RadiusMarker {
  constructor(scene, { radius = 1, label = "1 a₀ (Bohr radius)" } = {}) {
    this.group = new THREE.Group();
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
    }
    this.material = new THREE.LineBasicMaterial({ color: 0xffd9b8, transparent: true, opacity: 0, depthWrite: false });
    this.ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), this.material);
    this.label = labelSprite(label);
    this.label.material.opacity = 0;
    this.group.add(this.ring, this.label);
    this.group.visible = false;
    this.radius = radius;
    this.opacity = 0;
    this.target = 0;
    this.grow = 0;
    scene.add(this.group);
  }

  show(on = true) {
    this.target = on ? 1 : 0;
    if (on && this.opacity < 0.05) this.grow = 0;
  }

  update(dt, camera, dist) {
    this.opacity += (this.target - this.opacity) * (1 - Math.exp(-dt * 4));
    this.grow += (1 - this.grow) * (1 - Math.exp(-dt * 3));
    this.group.visible = this.opacity > 0.01;
    if (!this.group.visible) return;
    this.group.quaternion.copy(camera.quaternion);
    const r = this.radius * (0.6 + 0.4 * this.grow);
    this.ring.scale.setScalar(r);
    this.material.opacity = 0.8 * this.opacity;
    this.label.material.opacity = this.opacity;
    this.label.position.set(r * 0.72 + dist * 0.004, r * 0.72, 0);
    this.label.scale.set(dist * 0.24, dist * 0.03, 1);
  }
}
