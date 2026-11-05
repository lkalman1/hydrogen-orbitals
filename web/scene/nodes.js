// Node surfaces drawn in 3D: radial nodes as glowing spheres, angular nodes as cones
// (a flat disc when θ = 90°) and planes through the z-axis. Surfaces glow at their
// rims so they read as shapes, and grow outward from the nucleus when they appear.

import * as THREE from "three";
import { nodeSet } from "../nodes.js";

export const RADIAL_COLOR = new THREE.Color("#ffd9b8");
export const ANGULAR_COLOR = new THREE.Color("#b9a2ff");

function surfaceMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: color }, uOpacity: { value: 0 }, uReveal: { value: 0 }, uR: { value: 1 }, uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec3 vNormal, vView, vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity, uReveal, uR, uTime;
      varying vec3 vNormal, vView, vWorld;
      void main() {
        float r = length(vWorld) / uR;
        if (r > uReveal) discard;                                  // grows outward when shown
        float rim = 1.0 - abs(dot(normalize(vNormal), vView));
        float edge = smoothstep(1.0, 0.75, r);                      // fade out toward the cloud's edge
        float front = smoothstep(uReveal - 0.08, uReveal, r) * 1.5; // bright leading edge while growing
        float shimmer = 0.85 + 0.15 * sin(r * 30.0 - uTime * 3.0);
        float a = uOpacity * (0.18 + 0.82 * rim * rim) * edge * shimmer + front * uOpacity;
        gl_FragColor = vec4(uColor * a, 1.0);
      }`,
  });
}

/** A cone of half-angle θ around the physics z-axis (world y), apex at the origin, out to radius R. */
function coneGeometry(theta, R) {
  const seg = 96, rings = 24, pos = [], idx = [];
  for (let i = 0; i <= rings; i++) {
    const s = (i / rings) * R;
    for (let j = 0; j <= seg; j++) {
      const p = (j / seg) * Math.PI * 2;
      pos.push(s * Math.sin(theta) * Math.cos(p), s * Math.cos(theta), -s * Math.sin(theta) * Math.sin(p));
    }
  }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j, b = a + seg + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** A disc of radius R containing the z-axis, at azimuth φ. */
function planeGeometry(phi, R) {
  const geo = new THREE.CircleGeometry(R, 96);
  // CircleGeometry lies in x–y with normal +z; rotate so it contains world y (physics z)
  // and the horizontal direction (cos φ, 0, −sin φ).
  geo.rotateY(-phi);
  return geo;
}

export class NodeSurfaces {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.opacity = 0;
    this.target = 0;
    this.reveal = 0;
    this.revealStart = 0;
    this.key = "";
    this.R = 1;
  }

  /** Build the surfaces for orbital (n, l, m), sized to radius R (a₀). */
  set(n, l, m, R, { complex = false } = {}) {
    const key = `${n},${l},${m},${complex}`;
    if (key === this.key && Math.abs(R - this.R) < 1e-6) return;
    this.key = key;
    this.R = R;
    for (const child of [...this.group.children]) { child.geometry.dispose(); child.material.dispose(); this.group.remove(child); }
    const { radii, cones, planes } = nodeSet(n, l, m, { complex });
    for (const r of radii) this.group.add(new THREE.Mesh(new THREE.SphereGeometry(r, 64, 40), surfaceMaterial(RADIAL_COLOR)));
    for (const t of cones) this.group.add(new THREE.Mesh(coneGeometry(t, R), surfaceMaterial(ANGULAR_COLOR)));
    for (const p of planes) this.group.add(new THREE.Mesh(planeGeometry(p, R), surfaceMaterial(ANGULAR_COLOR)));
    this.revealStart = performance.now() / 1000; // grow the new set in
  }

  show(on) {
    this.target = on ? 1 : 0;
    if (on && this.opacity < 0.05) this.revealStart = performance.now() / 1000;
  }

  update(now, dt) {
    this.opacity += (this.target - this.opacity) * (1 - Math.exp(-dt * 4));
    this.reveal = Math.min(1.05, (now - this.revealStart) * 0.7); // wall-clock, so slow frames don't stall it
    this.group.visible = this.opacity > 0.01;
    if (!this.group.visible) return;
    for (const child of this.group.children) {
      const u = child.material.uniforms;
      u.uOpacity.value = 0.55 * this.opacity;
      u.uReveal.value = this.reveal;
      u.uR.value = this.R;
      u.uTime.value = now;
    }
  }
}
