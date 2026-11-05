// The Hydrogen Lab: one atom, five tools, and an explanation for everything.
//
// Nothing is scripted. Every action changes the atom according to the physics
// (rules.js), the feed says in plain words what just happened, every control and
// readout has an ⓘ, and "Things to try" ticks off discoveries as you make them.

import { Atom, GROUND } from "./atom.js";
import { LabLadder } from "./ladder.js";
import { ScaleView, OBJECTS, formatLength } from "./scale.js";
import { INFO, physicsEntry } from "./info.js";
import { narrate, stateName, mText } from "./narrator.js";
import { Discoveries, DISCOVERIES } from "./discoveries.js";
import { renderRich, renderTex, showTerm } from "./text.js";
import { Measurement } from "../story/measure.js";
import { Spectrum } from "../story/spectrum.js";
import { NodeSurfaces } from "../scene/nodes.js";
import { photonEVFor, bindingEV, stateEV, realZeemanEV, ZEEMAN_MAGNIFY } from "../rules.js";
import { nmFromEV, describeNm, wavelengthRGB, rgbCss, decays } from "../spectroscopy.js";
import { MAX_N, L_LETTERS, meanR } from "../physics.js";

const $ = (id) => document.getElementById(id);
const phone = () => window.innerWidth <= 720;
const SHAPES = ["round", "p shape: one unit of turning", "d shape: two units of turning", "f shape: three units", "g shape: four units", "h shape: five units", "i shape: six units"];
const IONIZE_MARGIN_EV = 0.4;
const MEASURE_MILESTONES = new Set([1, 2, 10, 100, 1000, 20000]);
const formatTime = (s) => (s >= 1e-3 ? `${(s * 1e3).toFixed(0)} ms` : s >= 1e-6 ? `${(s * 1e6).toFixed(1)} µs` : `${(s * 1e9).toFixed(1)} ns`);
const swirlText = (m) => (m === 0 ? "doesn't swirl" : m > 0 ? `swirls ⟲ about the vertical axis (m = ${mText(m)})` : `swirls ⟳ about the vertical axis (m = ${mText(m)})`);

const TWISTS = {
  1: [{ v: 1, label: "⟲", small: "twist" }, { v: 0, label: "none", small: "" }, { v: -1, label: "⟳", small: "twist" }],
  2: [{ v: 0, label: "⟲ ⟳", small: "cancel" }, { v: 2, label: "⟲ ⟲", small: "add up" }, { v: -2, label: "⟳ ⟳", small: "add up" }],
};

export class LabApp {
  constructor({ stage, audio, transitions, onTour }) {
    this.stage = stage;
    this.audio = audio;
    this.onTour = onTour;
    this.root = $("lab-ui");
    this.spectrum = new Spectrum($("lab-spectrum"));
    this.atom = new Atom({ stage, audio, transitions, spectrum: this.spectrum });
    this.measure = new Measurement({
      stage, audio,
      els: { button: $("lab-measure-btn"), tag: $("lab-measure-tag"), chart: $("lab-rchart"), labelHold: "Tap or hold to measure", labelTap: "Tap or hold to measure" },
    });
    this.nodes = new NodeSurfaces(stage.scene);
    this.scale = new ScaleView(stage, $("lab-scale"));
    this.discoveries = new Discoveries({ onFound: (d) => this.#found(d) });
    this.ladder = new LabLadder($("lab-ladder"), { onPick: (n) => this.#pick(n), onDrag: (t, final) => this.#drag(t, final) });
    this.light = { count: 1, twist: 0, total: null, target: 2 };
    this.tool = null;
    this.firstShow = true;
    this.narration = null;
    this.#buildTwist();
    this.#buildPicker();
    this.#buildTry();
    this.#bind();
    this.atom.on((e) => this.#onAtom(e));
    this.measure.onCount((n) => this.#onMeasured(n));
    stage.onFrame((now, dt) => this.#frame(now, dt));
    new ResizeObserver(() => this.#sheetResized()).observe($("lab-panel"));
  }

  get visible() { return !this.root.hidden; }

  // ------------------------------------------------------------ show / hide

  show(state) {
    this.root.hidden = false;
    const { stage } = this;
    stage.setLayout(() => this.#layout());
    stage.showProton(true);
    stage.showAxes(false);
    stage.rig.autoRotate = $("view-rotate").checked && !stage.rig.reducedMotion;
    stage.rig.flyTo({ zoom: 1, pitch: 0.3 }, 1);
    this.atom.setField(this.atom.B, false);
    this.atom.set(state ?? (this.atom.ionized ? GROUND : this.atom.state), { rain: !this.firstShow });
    this.measure.retarget();
    if (this.firstShow) {
      this.measure.startOver(); // the very first cloud is built by you, one measurement at a time
      this.#say({ text: "Welcome to the hydrogen lab: one proton, one electron. Tap the atom to find the electron. Every ⓘ explains what you see.", info: "measure" });
    }
    this.firstShow = false;
    this.#selectTool(this.tool ?? "measure", { open: true });
    this.audio.playMusic("MUS-LAB", { layers: this.#musicLayers() });
    this.#refresh();
    history.replaceState(null, "", location.pathname + location.search);
  }

  hide() {
    this.root.hidden = true;
    this.measure.release();
    this.nodes.show(false);
    this.stage.field.set(0);
    this.scale.set(0);
    this.stage.photons.setBeam({ on: false });
    this.#closeInfo();
  }

  #layout() {
    const h = window.innerHeight;
    if (!phone()) return { top: 0, bottom: h };
    const top = $("lab-state").getBoundingClientRect().bottom + 40;
    const panel = $("lab-panel"), tabs = $("lab-tabs");
    const bottom = panel.classList.contains("collapsed") ? tabs.getBoundingClientRect().top : panel.getBoundingClientRect().top;
    return { top, bottom: Math.max(top + 140, bottom - 60) };
  }

  #sheetResized() {
    const panel = $("lab-panel");
    const hSheet = phone() && !panel.classList.contains("collapsed") ? panel.offsetHeight : 0;
    document.documentElement.style.setProperty("--sheet-h", `${hSheet}px`);
    if (this.visible) this.stage.resize();
  }

  // ------------------------------------------------------------ tools

  #selectTool(tool, { open = false } = {}) {
    const panel = $("lab-panel");
    if (phone() && tool === this.tool && !open) {
      panel.classList.toggle("collapsed");            // tap the active tab to see the atom
    } else {
      panel.classList.remove("collapsed");
    }
    this.tool = tool;
    for (const t of panel.querySelectorAll(".tool")) t.hidden = t.dataset.tool !== tool;
    for (const b of document.querySelectorAll("#lab-tabs button")) b.classList.toggle("on", b.dataset.tool === tool);
    if (tool === "measure") { this.measure.enable({ hold: true }); this.measure.chart.show(); }
    else this.measure.disable();
    this.stage.photons.setBeam({ on: false });
    this.audio.sfx("ui-tick", { bus: "ui" });
    this.#sheetResized();
  }

  // ------------------------------------------------------------ light

  #targets() {
    const s = this.atom.state;
    if (s.ionized) return [];
    const out = [];
    for (let n = s.n + 1; n <= MAX_N; n++) {
      const total = photonEVFor(s, n, { count: 1, twist: this.light.twist, B: this.atom.B });
      if (total) out.push({ n, total });
    }
    return out;
  }

  #binding() { return bindingEV(this.atom.state, this.atom.B); }

  #pick(n) {
    const s = this.atom.state;
    if (s.ionized) return;
    if (n === 0) { this.light.target = 0; this.light.total = this.#binding() + IONIZE_MARGIN_EV; }
    else if (n <= s.n) {
      this.#say({ text: "Light can only lift the electron up the ladder. To come back down, press Let go.", info: "letgo" });
      return;
    } else {
      this.light.target = n;
      this.light.total = photonEVFor(s, n, { count: 1, twist: this.light.twist, B: this.atom.B });
    }
    this.audio.sfx("snap", { bus: "ui" });
    this.#updateAim();
  }

  #drag(total, final) {
    this.light.total = total;
    const hit = this.#targets().find((t) => Math.abs(t.total - total) < 1e-6);
    this.light.target = hit ? hit.n : total >= this.#binding() ? 0 : null;
    this.#updateAim();
    if (final && hit) this.audio.sfx("snap", { bus: "ui" });
  }

  /** After the state, twist or count changes: keep aiming at the same level if we can. */
  #reaim() {
    const s = this.atom.state;
    if (s.ionized) { this.light.total = null; this.#updateAim(); return; }
    const targets = this.#targets();
    let t = targets.find((x) => x.n === this.light.target) ?? targets[0];
    if (this.light.target === 0) this.light.total = this.#binding() + IONIZE_MARGIN_EV;
    else if (t) { this.light.target = t.n; this.light.total = t.total; }
    else { this.light.target = 0; this.light.total = this.#binding() + IONIZE_MARGIN_EV; }
    this.#updateAim();
  }

  #updateAim() {
    const { count, total } = this.light;
    const s = this.atom.state;
    const targets = this.#targets();
    this.ladder.setTargets(targets);
    const fire = $("lab-fire");
    if (s.ionized || !(total > 0)) {
      this.ladder.setAim({ total: 0 });
      $("light-readout").innerHTML = s.ionized ? "There's no electron to lift. Bring one back first." : "Tap a rung on the ladder to aim.";
      fire.disabled = true;
      fire.classList.remove("ready");
      return;
    }
    const per = total / count, nm = nmFromEV(per), color = rgbCss(wavelengthRGB(nm));
    const frees = total >= this.#binding() - 1e-9;
    const onRung = frees || targets.some((t) => Math.abs(t.total - total) < 1e-6);
    this.ladder.setAim({ total, count, color, onRung });
    const status = frees ? "enough to free the electron"
      : onRung ? `exactly matches the step to level ${this.light.target}`
        : "between rungs: it will pass straight through";
    $("light-readout").innerHTML = `<b>${count === 2 ? "2 photons × " : ""}${per.toFixed(2)} eV</b> <span class="muted">· ${describeNm(nm)}</span><br><span class="${onRung ? "on" : "off"}">${status}</span>`;
    fire.disabled = false;
    fire.classList.toggle("ready", onRung);
  }

  #buildTwist() {
    const seg = $("photon-twist");
    seg.replaceChildren();
    for (const t of TWISTS[this.light.count]) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.v = t.v;
      b.innerHTML = `${t.label}${t.small ? `<small>${t.small}</small>` : ""}`;
      b.classList.toggle("on", t.v === this.light.twist);
      b.addEventListener("click", () => {
        this.light.twist = t.v;
        for (const x of seg.children) x.classList.toggle("on", +x.dataset.v === t.v);
        this.audio.sfx("ui-tick", { bus: "ui" });
        this.#reaim();
      });
      seg.append(b);
    }
  }

  // ------------------------------------------------------------ atom events

  #onAtom(e) {
    if (e.type === "field" && !e.final) { this.#refresh(); return; }
    if (e.type === "absorbing" || e.type === "letgo") { this.#refresh(); return; }
    const said = narrate(e);
    if (said && e.type !== "state") this.#say(said);
    this.discoveries.observe(e);
    if (e.type === "emit" && !e.decay.twoPhoton) {
      this.spectrum.show();
      this.ladder.emit(stateEV(e.from, e.B), stateEV(e.decay.to, e.B), rgbCss(wavelengthRGB(e.decay.nm)), `${e.decay.nm.toFixed(1)} nm`);
    }
    if (["absorb", "emit", "recapture", "state"].includes(e.type)) {
      this.measure.retarget();
      $("lab-state").classList.remove("bump"); void $("lab-state").offsetWidth; $("lab-state").classList.add("bump");
    }
    if (["absorb", "emit", "recapture", "state", "ionize", "field"].includes(e.type)) this.#reaim();
    this.#refresh();
  }

  #onMeasured(count) {
    if (MEASURE_MILESTONES.has(count)) this.#say(narrate({ type: "measured", count }));
    this.discoveries.observe({ type: "measured", count });
    $("lab-measure-count").textContent = `${count.toLocaleString()} measured`;
  }

  #musicLayers() {
    const s = this.atom.state;
    if (s.ionized) return 2;
    return Math.min(4, 1 + (s.n > 1 ? 1 : 0) + (s.m !== 0 ? 1 : 0) + (this.atom.B > 0 ? 1 : 0));
  }

  #refresh() {
    const s = this.atom.state, B = this.atom.B;
    $("ls-name").textContent = s.ionized ? "H⁺" : stateName(s);
    $("ls-n").textContent = s.ionized ? "–" : s.n;
    $("ls-l").textContent = s.ionized ? "–" : s.l;
    $("ls-letter").textContent = s.ionized ? "" : L_LETTERS[s.l];
    $("ls-m").textContent = s.ionized ? "–" : mText(s.m);
    if (s.ionized) {
      $("ls-desc").textContent = "No electron: it escaped. The proton is on its own.";
      $("ls-energy").textContent = "0 eV (free)";
      $("ls-size").textContent = "–";
      $("ls-life").textContent = "–";
    } else {
      $("ls-desc").textContent = `${SHAPES[s.l][0].toUpperCase()}${SHAPES[s.l].slice(1)}; ${swirlText(s.m)}.`;
      $("ls-energy").textContent = `${stateEV(s, B).toFixed(2)} eV`;
      $("ls-size").textContent = `average distance ${(meanR(s.n, s.l) * 0.0529).toFixed(2)} nm`;
      $("ls-life").textContent = s.n === 1 ? "forever (the lowest rung)" : `${formatTime(decays(s.n, s.l).lifetime)} in reality · paused here`;
    }
    this.ladder.setState(s, B);
    const busy = this.atom.busy;
    $("lab-fire").disabled = busy || s.ionized || !(this.light.total > 0);
    $("letgo-btn").disabled = busy || s.ionized || s.n === 1;
    $("recapture-btn").hidden = !s.ionized;
    $("field-readout").textContent = B > 0
      ? `${B.toFixed(2)} T: each unit of m shifts the energy by ${(realZeemanEV(B) * 1e6).toFixed(0)} µeV (shown ${ZEEMAN_MAGNIFY.toLocaleString()}× larger).`
      : "Off. Slide to switch on a field pointing up the screen.";
    for (const c of document.querySelectorAll("#view-picker .cell")) c.classList.toggle("active", !s.ionized && +c.dataset.n === s.n && +c.dataset.l === s.l);
    this.#renderM();
    if ($("view-nodes").checked && !s.ionized) this.nodes.set(s.n, s.l, s.m, this.stage.cloud.radius(0.95), { complex: s.m !== 0 });
    this.nodes.show($("view-nodes").checked && !s.ionized);
    this.audio.playMusic("MUS-LAB", { layers: this.#musicLayers() });
  }

  // ------------------------------------------------------------ feed, info, discoveries

  #say(said) {
    if (!said) return;
    this.narration = said;
    renderRich($("feed-text"), said.text);
    const feed = $("lab-feed");
    feed.classList.remove("new"); void feed.offsetWidth; feed.classList.add("new");
  }

  async openInfo(key, { now = false } = {}) {
    const info = INFO[key];
    if (!info) return;
    const drawer = $("info-drawer");
    $("info-title").textContent = info.title;
    $("info-short").textContent = info.short;
    renderRich($("info-what"), info.what);
    const nowBox = $("info-now");
    nowBox.hidden = !(now && this.narration);
    if (now && this.narration) renderRich($("info-now-text"), this.narration.text);
    const keys = [...(info.physics ?? []), ...(now && this.narration?.physics ? [this.narration.physics] : [])];
    const physics = $("info-physics");
    physics.replaceChildren();
    for (const k of [...new Set(keys)]) {
      const entry = physicsEntry(k);
      if (!entry) continue;
      const h = document.createElement("h4");
      h.textContent = entry.title;
      const body = document.createElement("div");
      body.innerHTML = entry.html;
      physics.append(h, body);
    }
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add("open"));
    this.audio.sfx("ui-whoosh", { bus: "ui" });
    await renderTex(physics);
  }

  #closeInfo() {
    const drawer = $("info-drawer");
    drawer.classList.remove("open");
    setTimeout(() => { if (!drawer.classList.contains("open")) drawer.hidden = true; }, 300);
  }

  #buildTry() {
    const list = $("try-list");
    list.replaceChildren();
    for (const d of DISCOVERIES) {
      const li = document.createElement("li");
      li.dataset.id = d.id;
      const done = this.discoveries.has(d.id);
      li.classList.toggle("done", done);
      li.innerHTML = `<span>${d.goal}${done ? `<small>${d.found}</small>` : ""}</span>`;
      list.append(li);
    }
    $("try-count").textContent = `${this.discoveries.count}/${this.discoveries.total}`;
  }

  #found(d) {
    this.#buildTry();
    const toast = $("lab-found");
    toast.innerHTML = `<p class="eyebrow">You found it ✓</p><p>${d.found}</p><p class="goal">${d.goal} <button class="info-btn" type="button" data-info="${d.info}" aria-label="Explain">ⓘ</button></p>`;
    toast.hidden = false;
    toast.style.animation = "none"; void toast.offsetWidth; toast.style.animation = "";
    this.audio.sfx("begin");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { toast.hidden = true; }, 6500);
  }

  // ------------------------------------------------------------ view: state picker

  #buildPicker() {
    const grid = $("view-picker");
    grid.style.setProperty("--cols", MAX_N);
    grid.append(Object.assign(document.createElement("span"), { className: "corner", textContent: "n\\l" }));
    for (let l = 0; l < MAX_N; l++) grid.append(Object.assign(document.createElement("span"), { className: "col-head", textContent: L_LETTERS[l] }));
    for (let n = 1; n <= MAX_N; n++) {
      grid.append(Object.assign(document.createElement("span"), { className: "row-head", textContent: n }));
      for (let l = 0; l < MAX_N; l++) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "cell";
        b.dataset.n = n; b.dataset.l = l;
        if (l < n) {
          b.textContent = `${n}${L_LETTERS[l]}`;
          b.title = `n = ${n}, l = ${l}`;
          b.addEventListener("click", () => {
            const s = this.atom.state;
            const m = s.ionized ? 0 : Math.max(-l, Math.min(l, s.m));
            this.#jump({ n, l, m });
          });
        } else {
          b.disabled = true;
          b.title = `Not allowed: l must be less than n (l ≤ ${n - 1})`;
        }
        grid.append(b);
      }
    }
  }

  #renderM() {
    const row = $("view-m");
    const s = this.atom.state;
    row.replaceChildren();
    if (s.ionized) return;
    for (let m = -s.l; m <= s.l; m++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (m === s.m ? " active" : "");
      b.innerHTML = `<span>${mText(m)}</span><small>${m === 0 ? "still" : m > 0 ? "⟲" : "⟳"}</small>`;
      b.addEventListener("click", () => this.#jump({ n: s.n, l: s.l, m }));
      row.append(b);
    }
  }

  #jump(state) {
    if (this.atom.busy) return;
    this.atom.set(state);
    this.#say(narrate({ type: "jump", state }));
    this.discoveries.observe({ type: "jump", state });
  }

  // ------------------------------------------------------------ input

  #bind() {
    for (const b of document.querySelectorAll("#lab-tabs button")) b.addEventListener("click", () => this.#selectTool(b.dataset.tool));
    // ⓘ anywhere in the lab or the drawer
    for (const root of [this.root, $("info-drawer")]) {
      root.addEventListener("click", (e) => {
        const info = e.target.closest("[data-info]");
        if (info) { this.openInfo(info.dataset.info); return; }
        const chip = e.target.closest(".term");
        if (chip) { e.stopPropagation(); showTerm(chip, $("glossary-pop")); this.audio.sfx("ui-tick", { bus: "ui" }); }
      });
    }
    $("feed-info").addEventListener("click", () => this.openInfo(this.narration?.info ?? "measure", { now: true }));
    $("info-close").addEventListener("click", () => this.#closeInfo());
    $("try-toggle").addEventListener("click", () => {
      const list = $("try-list"), open = list.hidden;
      list.hidden = !open;
      $("try-toggle").setAttribute("aria-expanded", String(open));
      this.audio.sfx("ui-tick", { bus: "ui" });
    });
    $("tour-btn").addEventListener("click", () => this.onTour?.());

    // measure
    $("lab-measure-reset").addEventListener("click", () => {
      this.measure.startOver();
      $("lab-measure-count").textContent = "";
      this.#say({ text: "Cleared. Each tap finds the electron once; hold to look thousands of times.", info: "measure" });
    });

    // light
    for (const b of $("photon-count").querySelectorAll("button")) {
      b.addEventListener("click", () => {
        const count = +b.dataset.v;
        if (count === this.light.count) return;
        this.light.count = count;
        this.light.twist = 0;
        for (const x of $("photon-count").children) x.classList.toggle("on", +x.dataset.v === count);
        this.#buildTwist();
        this.audio.sfx("ui-tick", { bus: "ui" });
        this.#reaim();
      });
    }
    $("lab-fire").addEventListener("click", () => this.#fire());
    $("letgo-btn").addEventListener("click", () => this.atom.letGo());
    $("recapture-btn").addEventListener("click", () => this.atom.recapture());

    // magnet
    $("field-b").addEventListener("input", (e) => this.atom.setField(+e.target.value, false));
    $("field-b").addEventListener("change", (e) => this.atom.setField(+e.target.value, true));

    // view
    $("view-swirl").addEventListener("change", (e) => { this.stage.cloud.swirlRate = e.target.checked ? 1 : 0; });
    $("view-nodes").addEventListener("change", () => this.#refresh());
    $("view-rotate").addEventListener("change", (e) => { this.stage.rig.autoRotate = e.target.checked; });
    $("view-samples").addEventListener("change", (e) => {
      this.stage.cloud.setCount(+e.target.value);
      this.stage.resize();
      this.measure.retarget();
    });

    // scale
    $("scale-k").addEventListener("input", (e) => this.#setScale(+e.target.value, false));
    $("scale-k").addEventListener("change", (e) => this.#setScale(+e.target.value, true));

    window.addEventListener("keydown", (e) => {
      if (!this.visible || e.target.closest?.("input, select, textarea")) return;
      if (e.key === "Escape") { this.#closeInfo(); $("glossary-pop").hidden = true; return; }
      const k = e.key.toLowerCase();
      if (k === "f") this.#fire();
      else if (k === "g") this.atom.letGo();
      else if (["1", "2", "3", "4", "5"].includes(k)) this.#selectTool(["measure", "light", "magnet", "view", "scale"][+k - 1], { open: true });
    });
  }

  #fire() {
    const { count, twist, total } = this.light;
    if (!(total > 0) || this.atom.busy || this.atom.ionized) return;
    this.atom.fire({ count, twist, eV: total / count });
    this.#refresh();
  }

  #setScale(k, final) {
    this.scale.set(k);
    const W = this.scale.viewWidth();
    const near = OBJECTS.reduce((best, o) => (Math.abs(Math.log10(o.size / W)) < Math.abs(Math.log10(best.size / W)) ? o : best));
    $("scale-readout").textContent = k < 0.02
      ? "Normal view: the atom fills the screen."
      : `Zoomed out ${Math.round(10 ** k).toLocaleString()}×. The screen is ${formatLength(W)} wide, about the size of ${near.name}.`;
    if (final) {
      this.discoveries.observe({ type: "scale", k });
      if (k > 0.02) this.#say(narrate({ type: "scale", text: `Zoomed out ${Math.round(10 ** k).toLocaleString()} times: the screen now spans ${formatLength(W)}, about the size of ${near.name}. The atom is ${k > 3 ? "far smaller than a pixel" : "a tiny speck"}.` }));
    }
  }

  #frame(now, dt) {
    if (!this.visible) return;
    this.ladder.update(dt);
    this.nodes.update(now, dt);
    this.spectrum.update(dt);
  }
}
