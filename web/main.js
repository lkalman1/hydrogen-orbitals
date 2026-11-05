// Boot: build the stage, audio, the lab and the guided tour, then route.
//   (no hash), #lab   → the lab (the default: you're dropped straight in)
//   #n3l2m0           → the lab, at that state
//   #tour             → the guided tour's start screen
//   #ch2              → the guided tour at chapter 2

import { createStage } from "./scene/stage.js";
import { AudioEngine } from "./audio/engine.js";
import { CUES, TEMPO, BEATS_PER_BAR } from "./audio/cues.js";
import { Story, parseHash } from "./story/engine.js";
import { CHAPTERS } from "./story/chapters.js";
import { StoryUI } from "./story/ui.js";
import { Measurement } from "./story/measure.js";
import { Sampling } from "./scene/sampling.js";
import { Transitions } from "./scene/transition.js";
import { Lab } from "./story/lab.js";
import { LabApp } from "./lab/app.js";

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const phone = window.innerWidth <= 720;

function safeStorage() {
  try { localStorage.setItem("hydrogen-probe", "1"); localStorage.removeItem("hydrogen-probe"); return localStorage; }
  catch { return null; }
}

const stage = createStage($("scene"), { reducedMotion, particles: phone ? 100000 : 200000 });
const audio = new AudioEngine(CUES, { tempo: TEMPO, beatsPerBar: BEATS_PER_BAR });
const story = new Story(CHAPTERS, { storage: safeStorage() });
const transitions = new Transitions(stage, new Sampling());

// the guided tour and its tools
const tools = { measure: new Measurement({ stage, audio }), lab: new Lab({ stage, audio, transitions }) };
const ui = new StoryUI(story, { stage, audio, tools, reducedMotion, onSandbox: () => enterLab() });

// the lab
const lab = new LabApp({ stage, audio, transitions, onTour: () => enterTour() });

function leaveTour() {
  ui.hide();
  for (const tool of Object.values(tools)) tool.release();
}

function enterLab(state) {
  leaveTour();
  lab.show(state);
}

async function enterTour(chapter = null) {
  lab.hide();
  const choice = await ui.start({
    beginLabel: chapter !== null ? `Begin chapter ${chapter}` : story.hasProgress ? "Start from the beginning" : "Begin",
    resumeLabel: chapter === null && story.hasProgress
      ? `Resume: ${story.chapter === 0 ? CHAPTERS[0].title : `Chapter ${story.chapter}`}`
      : null,
  });
  if (choice === "sandbox") { enterLab(); return; }
  ui.show();
  if (choice === "resume") story.replay("jump");
  else story.goto(chapter ?? 0, 0, { force: true });
}

// ---- mute toggle (works everywhere; the first click anywhere also unlocks audio)
const muteBtn = $("mute-btn");
const renderMute = (m) => {
  muteBtn.textContent = m ? "🔇" : "🔊";
  muteBtn.setAttribute("aria-label", m ? "Unmute sound" : "Mute sound");
  muteBtn.setAttribute("aria-pressed", String(m));
};
renderMute(audio.muted);
audio.onMuteChange(renderMute);
muteBtn.addEventListener("click", () => { audio.unlock(); audio.setMuted(!audio.muted); });
window.addEventListener("pointerdown", () => audio.unlock(), { once: true });
window.addEventListener("keydown", () => audio.unlock(), { once: true });
document.addEventListener("click", (e) => {
  if (!e.target.closest(".term") && !e.target.closest("#glossary-pop")) $("glossary-pop").hidden = true;
});

stage.onFrame(() => ui.tick());

stage.cloud.setState(1, 0, 0, { mode: "instant" });
stage.showProton(true, { instant: true });
stage.showAxes(false, { instant: true });
stage.frameCloud(0.95);
stage.setLayout(() => ({ top: 0, bottom: window.innerHeight }));
stage.start();

function route(hash) {
  const target = parseHash(hash, CHAPTERS.length);
  if (target?.mode === "story") enterTour(target.chapter);
  else enterLab(target?.orbital);
}

window.addEventListener("hashchange", () => {
  const target = parseHash(location.hash, CHAPTERS.length);
  if (!target || !$("start").hidden) return;
  if (target.mode === "lab") enterLab(target.orbital);
  else if (target.chapter === null) enterTour();
  else if (target.chapter !== story.chapter || !ui.visible) { leaveTour(); lab.hide(); ui.show(); story.goto(target.chapter, 0, { force: true }); }
});

route(location.hash);

// Hook for automated checks (tests/screenshot.mjs).
window.__hydrogen = { stage, audio, story, ui, lab, tools, transitions, ready: true };
