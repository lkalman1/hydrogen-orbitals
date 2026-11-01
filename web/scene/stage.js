// The 3D stage: renderer + bloom, the electron cloud, the proton, axes, the camera
// rig, layout-aware framing, and the frame loop.

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { OrbitalCloud } from "./cloud.js";
import { CameraRig } from "./rig.js";
import { SuperpositionCloud } from "./superposition.js";
import { Photons } from "./photons.js";

const ORIGIN = new THREE.Vector3();

/** A value that eases toward a target; used for fades. */
class Fader {
  constructor(value = 0, rate = 3) { this.value = value; this.target = value; this.rate = rate; }
  update(dt) { this.value += (this.target - this.value) * (1 - Math.exp(-dt * this.rate)); }
}

function glowTexture() {
  const size = 128, c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.12, "rgba(255,240,220,0.95)");
  grad.addColorStop(0.35, "rgba(255,190,140,0.35)");
  grad.addColorStop(1, "rgba(255,160,120,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function label(text, color) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  g.font = "500 40px system-ui, sans-serif";
  g.fillStyle = color; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 32, 34);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  sprite.scale.setScalar(0.09);
  return sprite;
}

export function createStage(canvas, { reducedMotion = false, particles = 200000 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 5000);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.32, 0.2);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const rig = new CameraRig(camera, canvas, { reducedMotion });
  const cloud = new OrbitalCloud({ count: particles, pixelRatio: renderer.getPixelRatio() });
  scene.add(cloud.object);
  const superposition = new SuperpositionCloud({
    pixelRatio: renderer.getPixelRatio(),
    colorPos: cloud.uniforms.uColorPos.value,
    colorNeg: cloud.uniforms.uColorNeg.value,
  });
  scene.add(superposition.object);
  const photons = new Photons(scene, rig, camera);

  // ---- proton: a glow sprite, kept a constant size on screen (it is drawn far too big: labelled in the story)
  const proton = {
    sprite: new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    })),
    fade: new Fader(1, 2.5),
    pulse: 0, pulseVel: 0,       // spring for "kick" animations
    attention: false,            // gentle breathing while waiting for a click
    kick(amount = 1) { this.pulseVel += 9 * amount; },
  };
  scene.add(proton.sprite);

  // ---- axes (physics z up): fade in and out as the story needs them
  const axes = new THREE.Group();
  const axesFade = new Fader(1, 2.5);
  const axisMaterials = [];
  for (const [name, dir] of [["x", [1, 0, 0]], ["y", [0, 0, -1]], ["z", [0, 1, 0]]]) {
    const v = new THREE.Vector3(...dir);
    const mat = new THREE.LineBasicMaterial({ color: 0x8a94a6, transparent: true, opacity: 0.22 });
    axes.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([v.clone().multiplyScalar(-1), v]), mat));
    const s = label(name, "#9aa4b5");
    s.position.copy(v.multiplyScalar(1.08));
    axes.add(s);
    axisMaterials.push([mat, 0.22], [s.material, 1]);
  }
  scene.add(axes);
  const axesScale = { value: 1, vel: 0 };

  // ---- layout: the free screen strip the subject is framed into
  let layout = () => ({ top: 0, bottom: canvas.clientHeight });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    camera.aspect = w / h;
    const { top, bottom } = layout();
    rig.view = { top, bottom };
    const centerY = (top + bottom) / 2;
    if (Math.abs(centerY - h / 2) > 1) camera.setViewOffset(w, h, 0, h / 2 - centerY, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    cloud.setFramedSide(Math.min(Math.max(120, bottom - top), w));
  }
  window.addEventListener("resize", resize);

  const frameHandlers = new Set();
  let last = performance.now();
  let fitTarget = null; // if set, framing follows the cloud's size
  function frame(nowMs) {
    const dt = Math.min(0.05, (nowMs - last) / 1000);
    last = nowMs;
    const now = nowMs / 1000;
    if (fitTarget !== null) rig.fitRadius = cloud.radius(fitTarget);
    cloud.update(now, dt);
    rig.update(dt);

    // proton: spring pulse + optional breathing; constant on-screen size
    proton.pulseVel += (-120 * proton.pulse - 10 * proton.pulseVel) * dt;
    proton.pulse += proton.pulseVel * dt;
    proton.fade.update(dt);
    const breathe = proton.attention ? 0.25 * (0.5 + 0.5 * Math.sin(now * 3.2)) : 0;
    proton.sprite.scale.setScalar(rig.dist * 0.036 * (1 + proton.pulse + breathe));
    proton.sprite.material.opacity = proton.fade.value;
    proton.sprite.visible = proton.fade.value > 0.002;

    axesFade.update(dt);
    for (const [mat, base] of axisMaterials) mat.opacity = base * axesFade.value;
    axes.visible = axesFade.value > 0.002;
    const k = 40, c = 2 * Math.sqrt(k) * 0.75;
    axesScale.vel += (-k * (axesScale.value - cloud.radius(0.9)) - c * axesScale.vel) * dt;
    axesScale.value += axesScale.vel * dt;
    axes.scale.setScalar(Math.max(1e-3, axesScale.value));

    photons.update(now, dt);
    for (const fn of frameHandlers) fn(now, dt);
    composer.render(dt);
    requestAnimationFrame(frame);
  }

  return {
    renderer, scene, camera, rig, cloud, superposition, photons, proton, bloom,
    /** Provide a function returning the free {top, bottom} strip in CSS px. */
    setLayout(fn) { layout = fn; resize(); },
    resize,
    /** Keep the camera framed on the cloud (q = probability quantile), or null to frame manually. */
    frameCloud(q = 0.95) { fitTarget = q; },
    frameRadius(r) { fitTarget = null; rig.fitRadius = r; },
    showAxes(visible, { instant = false } = {}) {
      axesFade.target = visible ? 1 : 0;
      if (instant) axesFade.value = axesFade.target;
    },
    showProton(visible, { instant = false } = {}) {
      proton.fade.target = visible ? 1 : 0;
      if (instant) proton.fade.value = proton.fade.target;
    },
    /** True if a screen point (CSS px) is on the proton. */
    hitsProton(x, y) {
      const p = rig.project(ORIGIN);
      return proton.fade.value > 0.5 && Math.hypot(x - p.x, y - p.y) < 44;
    },
    onFrame(fn) { frameHandlers.add(fn); return () => frameHandlers.delete(fn); },
    start() {
      resize();
      rig.fitRadius = fitTarget !== null ? cloud.radius(fitTarget) : rig.fitRadius;
      rig.settle();
      axesScale.value = cloud.radius(0.9);
      requestAnimationFrame(frame);
    },
  };
}
