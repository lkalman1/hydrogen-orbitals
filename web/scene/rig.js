// Spring orbit camera with drag inertia, pinch/wheel zoom, idle auto-rotate, and
// scripted "fly-to" moves for the story. Any user drag cancels a scripted move.

import * as THREE from "three";

const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class CameraRig {
  constructor(camera, canvas, { reducedMotion = false } = {}) {
    this.camera = camera;
    this.canvas = canvas;
    this.reducedMotion = reducedMotion;
    this.yaw = 0.6; this.pitch = 0.35; this.yawVel = 0; this.pitchVel = 0;
    this.dist = 60; this.distVel = 0;
    this.userZoom = 1;      // wheel / pinch
    this.storyZoom = 1;     // scripted framing multiplier
    this.fitRadius = 1;     // radius (a₀) the view should fit
    this.autoRotate = !reducedMotion;
    this.autoRotateSpeed = 0.25;
    this.interactive = true;
    this.dragging = false;
    this.lastInput = -Infinity;
    this.flight = null;
    // free screen region the subject should fill (set by the layout)
    this.view = { top: 0, bottom: 1 };
    this.tapHandlers = new Set();
    this.#bindInput();
  }

  get distTarget() { return this.userZoom * this.storyZoom * this.fitDistance(); }

  fitDistance() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const availH = Math.max(120, this.view.bottom - this.view.top);
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    return 1.1 * this.fitRadius * h / (tan * Math.min(availH, w));
  }

  /** Scripted move. Angles in radians; zoom multiplies the fitted distance. */
  flyTo({ yaw = this.yaw, pitch = this.pitch, zoom = this.storyZoom } = {}, seconds = 2) {
    if (this.reducedMotion || seconds <= 0) {
      Object.assign(this, { yaw, pitch, storyZoom: zoom });
      this.flight = null;
      return;
    }
    this.flight = {
      from: { yaw: this.yaw, pitch: this.pitch, zoom: this.storyZoom },
      to: { yaw: this.yaw + wrapAngle(yaw - this.yaw), pitch, zoom },
      start: performance.now() / 1000,
      duration: seconds,
    };
  }

  /** Screen position (CSS px) of a world point. */
  project(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x + 1) / 2 * this.canvas.clientWidth, y: (1 - p.y) / 2 * this.canvas.clientHeight };
  }

  onTap(fn) { this.tapHandlers.add(fn); return () => this.tapHandlers.delete(fn); }

  #bindInput() {
    const canvas = this.canvas;
    const pointers = new Map();
    let downAt = null;
    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.timeStamp });
      downAt = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      this.dragging = true;
      this.yawVel = this.pitchVel = 0;
    });
    canvas.addEventListener("pointermove", (e) => {
      const p = pointers.get(e.pointerId);
      if (!p || !this.interactive) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (pointers.size === 1 && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 4) {
        this.flight = null;
        const dYaw = -dx * 0.006, dPitch = dy * 0.006;
        const dtEvent = Math.max(1 / 120, (e.timeStamp - p.t) / 1000);
        this.yaw += dYaw; this.pitch += dPitch;
        // smoothed angular velocity (rad/s), carried as inertia after release
        this.yawVel = 0.6 * this.yawVel + 0.4 * dYaw / dtEvent;
        this.pitchVel = 0.6 * this.pitchVel + 0.4 * dPitch / dtEvent;
        this.lastInput = performance.now();
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const other = a === p ? b : a;
        const before = Math.hypot(p.x - other.x, p.y - other.y);
        const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        if (before > 0) this.zoomBy(before / after);
      }
      p.x = e.clientX; p.y = e.clientY; p.t = e.timeStamp;
    });
    const end = (e) => {
      pointers.delete(e.pointerId);
      this.dragging = pointers.size > 0;
      if (e.type === "pointerup" && downAt && pointers.size === 0 &&
          Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 6 && e.timeStamp - downAt.t < 500) {
        for (const fn of this.tapHandlers) fn(e.clientX, e.clientY);
      }
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("wheel", (e) => {
      if (!this.interactive) return;
      e.preventDefault();
      this.zoomBy(Math.exp(e.deltaY * 0.0012));
    }, { passive: false });
  }

  zoomBy(f) {
    this.userZoom = THREE.MathUtils.clamp(this.userZoom * f, 0.15, 6);
    this.lastInput = performance.now();
  }

  /** Jump the spring to its target (e.g. on first frame). */
  settle() { this.dist = this.distTarget; this.distVel = 0; }

  update(dt) {
    const now = performance.now() / 1000;
    if (this.flight) {
      const f = this.flight;
      const t = Math.min(1, (now - f.start) / f.duration), e = easeInOutSine(t);
      this.yaw = f.from.yaw + (f.to.yaw - f.from.yaw) * e;
      this.pitch = f.from.pitch + (f.to.pitch - f.from.pitch) * e;
      this.storyZoom = f.from.zoom + (f.to.zoom - f.from.zoom) * e;
      if (t >= 1) this.flight = null;
    } else if (!this.dragging) {
      const decay = Math.exp(-dt * 3.5); // inertia after release
      this.yaw += this.yawVel * dt; this.pitch += this.pitchVel * dt;
      this.yawVel *= decay; this.pitchVel *= decay;
      const idle = performance.now() - this.lastInput > 2500;
      if (this.autoRotate && idle) this.yaw += dt * this.autoRotateSpeed;
    }
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.45, 1.45);
    // slightly underdamped spring: zooms overshoot a touch and settle
    const k = 40, c = 2 * Math.sqrt(k) * 0.75;
    this.distVel += (-k * (this.dist - this.distTarget) - c * this.distVel) * dt;
    this.dist += this.distVel * dt;

    const { camera, dist } = this;
    camera.position.set(
      dist * Math.cos(this.pitch) * Math.sin(this.yaw),
      dist * Math.sin(this.pitch),
      dist * Math.cos(this.pitch) * Math.cos(this.yaw),
    );
    camera.lookAt(0, 0, 0);
  }
}
