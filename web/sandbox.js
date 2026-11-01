// Sandbox: free exploration of every orbital up to n = 7 (the M1 viewer),
// running on the shared stage. Shown after the journey or via #sandbox / #n3l2m0.

import { MAX_N, L_LETTERS, energyEV, meanR, nodes, orbitalName } from "./physics.js";

const $ = (id) => document.getElementById(id);
const REAL_M_LABELS = { 1: { 1: "x", "-1": "y", 0: "z" }, 2: { 0: "z²", 1: "xz", "-1": "yz", 2: "x²−y²", "-2": "xy" } };
const L_INFO = [
  "sphere — no angular nodes",
  "dumbbell — 1 nodal plane",
  "clover — 2 nodal surfaces",
  "3 nodal surfaces",
  "4 nodal surfaces",
  "5 nodal surfaces",
  "6 nodal surfaces",
];
const clampM = (m, l) => Math.max(-l, Math.min(l, m));

export class Sandbox {
  constructor({ stage, audio, onJourney }) {
    this.stage = stage;
    this.audio = audio;
    this.root = $("sandbox-ui");
    this.state = { n: 3, l: 2, m: 0 };
    this.#buildPicker();
    this.#bind(onJourney);
  }

  get visible() { return !this.root.hidden; }

  show(orbital = this.state, { instant = false } = {}) {
    this.root.hidden = false;
    const { stage } = this;
    stage.setLayout(() => {
      if (window.innerWidth > 720) return { top: 0, bottom: window.innerHeight };
      return { top: $("info").getBoundingClientRect().bottom, bottom: $("controls").getBoundingClientRect().top };
    });
    stage.showProton(true);
    stage.showAxes(true);
    stage.frameCloud(0.95);
    stage.rig.flyTo({ zoom: 1 }, instant ? 0 : 1.2);
    stage.cloud.fadeTo(1, 0.6);
    this.audio.playMusic("MUS-SBX", { layers: 2 });
    this.setState(orbital.n, orbital.l, orbital.m, { mode: instant ? "instant" : "morph" });
  }

  hide() { this.root.hidden = true; }

  setState(n, l, m, { mode = "morph" } = {}) {
    if (!this.stage.cloud.setState(n, l, m, { mode })) return;
    if (mode === "morph") this.audio.sfx("ui-whoosh", { bus: "ui" });
    this.state = { n, l, m };
    this.#updateUI();
    history.replaceState(null, "", `#n${n}l${l}m${m}`);
  }

  #buildPicker() {
    const grid = $("picker");
    grid.style.setProperty("--cols", MAX_N);
    grid.append(Object.assign(document.createElement("span"), { className: "corner", textContent: "n \\ l" }));
    for (let l = 0; l < MAX_N; l++)
      grid.append(Object.assign(document.createElement("span"), { className: "col-head", textContent: L_LETTERS[l] }));
    for (let n = 1; n <= MAX_N; n++) {
      grid.append(Object.assign(document.createElement("span"), { className: "row-head", textContent: n }));
      for (let l = 0; l < MAX_N; l++) {
        const b = document.createElement("button");
        b.className = "cell";
        b.dataset.n = n; b.dataset.l = l;
        if (l < n) {
          b.textContent = `${n}${L_LETTERS[l]}`;
          b.title = `n=${n}, l=${l}`;
          b.addEventListener("click", () => this.setState(n, l, clampM(this.state.m, l)));
        } else {
          b.disabled = true;
          b.title = `Not allowed: l must be less than n (l ≤ ${n - 1})`;
        }
        grid.append(b);
      }
    }
  }

  #updateUI() {
    const { n, l, m } = this.state;
    for (const b of document.querySelectorAll(".cell"))
      b.classList.toggle("active", +b.dataset.n === n && +b.dataset.l === l);

    const row = $("m-row");
    row.replaceChildren();
    for (let mm = -l; mm <= l; mm++) {
      const b = document.createElement("button");
      b.className = "chip" + (mm === m ? " active" : "");
      const real = REAL_M_LABELS[l]?.[mm];
      b.innerHTML = real ? `<span>${real}</span><small>m=${mm}</small>` : `<span>${mm > 0 ? "+" : ""}${mm}</span>`;
      b.addEventListener("click", () => this.setState(n, l, mm));
      row.append(b);
    }

    const nd = nodes(n, l);
    $("name").textContent = orbitalName(n, l, m);
    $("qn").textContent = `n = ${n}   l = ${l}   m = ${m}`;
    $("energy").textContent = `${energyEV(n).toFixed(3)} eV`;
    $("meanr").textContent = `${meanR(n, l).toFixed(1)} a₀`;
    $("nodes").textContent = `${nd.radial} radial + ${nd.angular} angular = ${n - 1}`;
    $("shape").textContent = `${L_LETTERS[l]}: ${L_INFO[l]}`;
    $("count").textContent = this.stage.cloud.count.toLocaleString();
  }

  #bind(onJourney) {
    window.addEventListener("keydown", (e) => {
      if (!this.visible || e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      let { n, l, m } = this.state;
      if (e.key === "ArrowUp") n = Math.max(1, n - 1);
      else if (e.key === "ArrowDown") n = Math.min(MAX_N, n + 1);
      else if (e.key === "ArrowLeft") l = Math.max(0, l - 1);
      else if (e.key === "ArrowRight") l = Math.min(n - 1, l + 1);
      else if (e.key === ",") m -= 1;
      else if (e.key === ".") m += 1;
      else if (e.key === " ") { this.#toggleRotate(); e.preventDefault(); return; }
      else return;
      e.preventDefault();
      l = Math.min(l, n - 1);
      m = clampM(m, l);
      if (n !== this.state.n || l !== this.state.l || m !== this.state.m) this.setState(n, l, m);
    });
    $("autorotate").addEventListener("change", (e) => { this.stage.rig.autoRotate = e.target.checked; });
    $("particles").addEventListener("change", (e) => {
      this.stage.cloud.setCount(+e.target.value);
      this.stage.resize();
      this.#updateUI();
    });
    $("about-toggle").addEventListener("click", () => $("about").toggleAttribute("hidden"));
    $("journey-btn").addEventListener("click", () => onJourney?.());
  }

  #toggleRotate() {
    this.stage.rig.autoRotate = !this.stage.rig.autoRotate;
    $("autorotate").checked = this.stage.rig.autoRotate;
  }
}
