// Story UI: connects the Story state machine to the DOM, the 3D stage and audio.
//
// On each beat it cleans up the previous beat, runs enter(), reveals the caption
// word by word, and only then offers the beat's action (a button, or a scene
// interaction with an accessible fallback). Idle users get a nudge after ~8 s.

import { DEEPER } from "./deeper.js";
import { GLOSSARY } from "./glossary.js";

const WORD_MS = 55;            // caption reveal: delay between words
const NUDGE_SECONDS = 8;
const KATEX_URL = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.mjs";

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

let katexPromise = null;
const loadKatex = () => (katexPromise ??= import(KATEX_URL).then((m) => m.default).catch(() => null));

/** "[[term]]" / "[[term|shown]]" → tokens of { text, term? } */
export function parseCaption(text) {
  const tokens = [];
  const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let last = 0, match;
  while ((match = re.exec(text))) {
    if (match.index > last) tokens.push({ text: text.slice(last, match.index) });
    tokens.push({ text: match[2] ?? match[1], term: match[1].toLowerCase() });
    last = re.lastIndex;
  }
  if (last < text.length) tokens.push({ text: text.slice(last) });
  return tokens;
}

export class StoryUI {
  constructor(story, { stage, audio, tools = {}, reducedMotion = false, onSandbox }) {
    this.story = story;
    this.tools = tools;   // extra objects exposed to beats (e.g. measure)
    this.stage = stage;
    this.audio = audio;
    this.reducedMotion = reducedMotion;
    this.onSandbox = onSandbox;
    this.root = $("story-ui");
    this.cleanup = null;
    this.timers = [];
    this.beatToken = 0;
    this.actionReady = false;
    this.completed = false;
    this.lastActivity = performance.now();

    this.#buildProgress();
    this.#bindControls();
    story.onEnter((info) => this.#enter(info));
  }

  // ------------------------------------------------------------ visibility
  show() {
    this.root.hidden = false;
    this.stage.setLayout(() => this.#freeStrip());
  }
  hide() {
    this.#clearBeat();
    this.closeDrawer();
    this.#closeMenu();
    this.root.hidden = true;
  }
  get visible() { return !this.root.hidden; }

  #freeStrip() {
    let top = $("topbar").getBoundingClientRect().bottom;
    let bottom = $("caption-box").getBoundingClientRect().top;
    const measureBtn = $("measure-btn"), chart = $("rchart");
    if (!measureBtn.hidden) bottom = Math.min(bottom, measureBtn.getBoundingClientRect().top - 8);
    if (!chart.hidden && window.innerWidth <= 720) top = Math.max(top, chart.getBoundingClientRect().bottom);
    return { top, bottom: bottom > top + 120 ? bottom : window.innerHeight };
  }

  titleCard(show) {
    const card = $("title-card");
    if (show) { card.hidden = false; requestAnimationFrame(() => card.classList.add("on")); }
    else { card.classList.remove("on"); this.#later(() => { if (!card.classList.contains("on")) card.hidden = true; }, 700); }
  }

  // ------------------------------------------------------------ beats
  #later(fn, ms) { this.timers.push(setTimeout(fn, ms)); }

  #clearBeat() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.cleanup?.();
    this.cleanup = null;
    this.beatToken++;
  }

  #enter({ def, chapterDef, chapter, direction }) {
    if (!this.visible) return;
    const prevChapter = this.currentChapter;
    this.#clearBeat();
    this.currentChapter = chapter;
    this.actionReady = false;
    this.completed = false;
    const token = this.beatToken;

    history.replaceState(null, "", `#${chapterDef.id}`);
    this.#updateProgress();

    // audio: chapter music, layers per beat; a stinger when a new chapter starts
    this.audio.playMusic(chapterDef.music, { layers: def.music?.layers ?? 1 });
    if (direction === "forward" && prevChapter !== undefined && prevChapter !== chapter) {
      this.audio.stinger("STG-chapter");
      this.#chapterBanner(chapter, chapterDef.title);
    }

    const ctx = {
      ...this.tools,
      stage: this.stage,
      audio: this.audio,
      ui: this,
      complete: () => {
        if (token !== this.beatToken || this.completed || def.wait?.type !== "scene") return;
        this.completed = true;
        this.#later(() => this.advance(), 250);
      },
    };
    this.ctx = ctx;
    if (!def.usesMeasure) this.tools.measure?.release();
    this.cleanup = def.enter?.(ctx, { direction }) ?? null;
    this.stage.resize(); // the beat may have shown or hidden layout elements

    const revealMs = this.#renderCaption(def.caption);
    $("deeper-btn").hidden = !DEEPER[def.deeper];
    if (!$("drawer").hidden) this.openDrawer(def.deeper);
    $("back-btn").disabled = this.story.isFirst;

    const wait = def.wait ?? { type: "continue", label: "Continue" };
    const cont = $("continue-btn"), prompt = $("prompt"), fallback = $("fallback-btn");
    cont.hidden = true; prompt.hidden = true; fallback.hidden = true;
    prompt.classList.remove("nudge");
    cont.classList.remove("nudge");
    const readyAt = Math.max(revealMs + 200, (wait.minSeconds ?? 0) * 1000);
    this.#later(() => {
      if (token !== this.beatToken) return;
      this.actionReady = true;
      this.lastActivity = performance.now();
      if (wait.type === "scene") {
        prompt.textContent = def.prompt ?? "";
        prompt.hidden = !def.prompt;
        fallback.textContent = wait.label ?? "Continue";
        def.onPrompt?.(ctx);
      } else {
        cont.textContent = wait.label ?? "Continue";
        cont.hidden = false;
        cont.classList.remove("pop");
        void cont.offsetWidth; // restart the pop animation
        cont.classList.add("pop");
      }
    }, readyAt);
  }

  /** Called when the beat's action is done. */
  advance() {
    this.audio.sfx("ui-tick", { bus: "ui" });
    if (this.story.next() === "end") this.onSandbox?.();
  }

  /** Accessible alternative to a scene interaction: do it for the user, then continue. */
  #fallback() {
    if (!this.ctx || this.completed) return;
    this.story.current.onFallback?.(this.ctx);
    this.ctx.complete();
  }

  back() {
    if (this.story.isFirst) return;
    this.audio.sfx("ui-tick", { bus: "ui" });
    this.story.back();
  }

  #renderCaption(text) {
    const p = $("caption");
    p.replaceChildren();
    let i = 0;
    const word = (w) => el("span", { className: "w", textContent: w, style: `--i:${i++}` });
    for (const tok of parseCaption(text ?? "")) {
      if (tok.term) {
        const chip = el("button", { className: "term", type: "button" });
        chip.dataset.term = tok.term;
        tok.text.split(/(\s+)/).forEach((part) => chip.append(/\s+/.test(part) ? part : word(part)));
        p.append(chip);
      } else {
        tok.text.split(/(\s+)/).forEach((part) => { if (part) p.append(/\s+/.test(part) ? part : word(part)); });
      }
    }
    p.style.setProperty("--word-ms", `${this.reducedMotion ? 0 : WORD_MS}ms`);
    p.classList.remove("reveal");
    void p.offsetWidth;
    p.classList.add("reveal");
    this.audio.sfx("caption", { bus: "ui" });
    this.audio.duck(-3, 1.2);
    return this.reducedMotion ? 0 : i * WORD_MS + 350;
  }

  // ------------------------------------------------------------ nudges
  tick() {
    if (!this.visible || !this.actionReady || this.completed) return;
    if (performance.now() - this.lastActivity < NUDGE_SECONDS * 1000) return;
    const def = this.story.current;
    const prompt = $("prompt");
    if (def.wait?.type === "scene") {
      if (def.nudge) { prompt.textContent = def.nudge; prompt.hidden = false; }
      $("fallback-btn").hidden = false;
    }
    prompt.classList.add("nudge");
    $("continue-btn").classList.add("nudge");
    this.lastActivity = performance.now(); // don't re-trigger every frame
  }

  #activity() {
    this.lastActivity = performance.now();
  }

  // ------------------------------------------------------------ drawer
  async openDrawer(key) {
    const content = DEEPER[key];
    if (!content) return;
    const drawer = $("drawer");
    $("drawer-title").textContent = content.title;
    const body = $("drawer-body");
    body.innerHTML = content.html;
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add("open"));
    document.body.classList.add("drawer-open");
    $("deeper-btn").setAttribute("aria-expanded", "true");
    const nodes = [...body.querySelectorAll("tex")];
    if (!nodes.length) return;
    const katex = await loadKatex();
    for (const node of nodes) {
      const tex = node.textContent;
      const span = el("span", { className: node.hasAttribute("display") ? "math display" : "math" });
      if (katex) katex.render(tex, span, { output: "mathml", displayMode: node.hasAttribute("display"), throwOnError: false });
      else span.append(el("code", { textContent: tex }));
      node.replaceWith(span);
    }
  }

  closeDrawer() {
    const drawer = $("drawer");
    drawer.classList.remove("open");
    document.body.classList.remove("drawer-open");
    $("deeper-btn").setAttribute("aria-expanded", "false");
    setTimeout(() => { if (!drawer.classList.contains("open")) drawer.hidden = true; }, 300);
  }

  // ------------------------------------------------------------ glossary
  #showTerm(chip) {
    const pop = $("glossary-pop");
    const term = chip.dataset.term;
    pop.replaceChildren(el("b", { textContent: term[0].toUpperCase() + term.slice(1) }), el("p", { textContent: GLOSSARY[term] ?? "" }));
    pop.hidden = false;
    const r = chip.getBoundingClientRect();
    const w = Math.min(300, window.innerWidth - 24);
    pop.style.width = `${w}px`;
    pop.style.left = `${Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2))}px`;
    pop.style.top = `${r.top - 10}px`;
    this.audio.sfx("ui-tick", { bus: "ui" });
  }

  // ------------------------------------------------------------ progress + menu
  #buildProgress() {
    const bar = $("progress");
    this.segments = this.story.chapters.map((c, i) => {
      const seg = el("li", { title: `${i}. ${c.title}` }, el("span", { className: "fill" }));
      seg.style.flexGrow = c.minutes;
      bar.append(seg);
      return seg;
    });
  }

  #updateProgress() {
    const { chapter, beat, chapters } = this.story;
    this.segments.forEach((seg, i) => {
      const frac = i < chapter ? 1 : i > chapter ? 0 : (beat + 1) / chapters[i].beats.length;
      seg.firstChild.style.transform = `scaleX(${frac})`;
      seg.classList.toggle("current", i === chapter);
    });
    $("chapter-label").textContent = chapter === 0 ? chapters[0].title : `Chapter ${chapter} · ${chapters[chapter].title}`;
  }

  #chapterBanner(i, title) {
    const banner = $("chapter-banner");
    banner.replaceChildren(el("small", { textContent: `Chapter ${i}` }), el("span", { textContent: title }));
    banner.hidden = false;
    banner.classList.remove("on");
    void banner.offsetWidth;
    banner.classList.add("on");
    this.audio.sfx("ui-whoosh");
    this.#later(() => { banner.hidden = true; }, 2600);
  }

  #openMenu() {
    const list = $("menu-list");
    list.replaceChildren();
    this.story.chapters.forEach((c, i) => {
      const locked = i > this.story.unlocked;
      const b = el("button", { className: "menu-item", disabled: locked, type: "button" },
        el("span", { className: "num", textContent: locked ? "🔒" : i === 0 ? "◆" : i }),
        el("span", { className: "t", textContent: c.title }),
        el("span", { className: "min", textContent: `${Math.round(c.minutes * 60 / 30) / 2} min` }));
      if (i === this.story.chapter) b.classList.add("current");
      b.addEventListener("click", () => { this.#closeMenu(); this.story.goto(i); });
      list.append(b);
    });
    $("menu").hidden = false;
    this.audio.sfx("ui-whoosh", { bus: "ui" });
  }

  #closeMenu() { $("menu").hidden = true; }

  // ------------------------------------------------------------ start screen
  /** Show the start screen; resolves with "begin" | "resume" | "sandbox". */
  start({ resumeLabel = null, beginLabel = "Begin" } = {}) {
    const screen = $("start");
    $("begin-btn").textContent = beginLabel;
    $("resume-btn").hidden = !resumeLabel;
    if (resumeLabel) $("resume-btn").textContent = resumeLabel;
    screen.hidden = false;
    return new Promise((resolve) => {
      const done = (choice) => {
        this.audio.unlock();
        screen.classList.add("leaving");
        setTimeout(() => { screen.hidden = true; screen.classList.remove("leaving"); }, 900);
        resolve(choice);
      };
      $("begin-btn").onclick = () => { done("begin"); this.audio.sfx("begin"); };
      $("resume-btn").onclick = () => { done("resume"); this.audio.sfx("begin"); };
      $("start-sandbox").onclick = () => done("sandbox");
    });
  }

  // ------------------------------------------------------------ controls
  #bindControls() {
    $("continue-btn").addEventListener("click", () => this.advance());
    $("fallback-btn").addEventListener("click", () => this.#fallback());
    $("back-btn").addEventListener("click", () => this.back());
    $("deeper-btn").addEventListener("click", () => ($("drawer").hidden ? this.openDrawer(this.story.current.deeper) : this.closeDrawer()));
    $("drawer-close").addEventListener("click", () => this.closeDrawer());
    $("menu-btn").addEventListener("click", () => this.#openMenu());
    $("progress").addEventListener("click", () => this.#openMenu());
    $("menu-close").addEventListener("click", () => this.#closeMenu());
    $("menu").addEventListener("click", (e) => { if (e.target.id === "menu") this.#closeMenu(); });
    $("menu-sandbox").addEventListener("click", () => { this.#closeMenu(); this.onSandbox?.(); });
    $("menu-restart").addEventListener("click", () => { this.#closeMenu(); this.story.reset(); this.story.goto(0, 0, { force: true }); });
    $("caption").addEventListener("click", (e) => {
      const chip = e.target.closest(".term");
      if (chip) { e.stopPropagation(); this.#showTerm(chip); }
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".term") && !e.target.closest("#glossary-pop")) $("glossary-pop").hidden = true;
    });
    for (const type of ["pointerdown", "keydown", "wheel"]) window.addEventListener(type, () => this.#activity(), { passive: true });

    window.addEventListener("keydown", (e) => {
      if (!this.visible || !$("start").hidden) return;
      if (e.key === "Escape") { $("glossary-pop").hidden = true; this.#closeMenu(); this.closeDrawer(); return; }
      if (!$("menu").hidden || e.target.closest?.("button, input, select") && e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.key === "Enter" || e.key === "ArrowRight" || e.key === " ") {
        if (!this.actionReady) return;
        e.preventDefault();
        if (this.story.current.wait?.type === "scene") this.#fallback();
        else this.advance();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        this.back();
      } else if (e.key.toLowerCase() === "d") {
        $("deeper-btn").click();
      }
    });
  }
}
