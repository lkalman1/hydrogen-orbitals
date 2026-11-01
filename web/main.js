// Boot: build the stage, audio and story, then route.
//   (no hash) → start screen → journey (or resume)
//   #ch2      → start screen → chapter 2 (if unlocked; deep links unlock it)
//   #sandbox, #n3l2m0 → straight into the sandbox

import { createStage } from "./scene/stage.js";
import { AudioEngine } from "./audio/engine.js";
import { CUES, TEMPO, BEATS_PER_BAR } from "./audio/cues.js";
import { Story, parseHash } from "./story/engine.js";
import { CHAPTERS } from "./story/chapters.js";
import { StoryUI } from "./story/ui.js";
import { Sandbox } from "./sandbox.js";
import { Measurement } from "./story/measure.js";

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

const measure = new Measurement({ stage, audio });
const ui = new StoryUI(story, { stage, audio, tools: { measure }, reducedMotion, onSandbox: () => enterSandbox() });
const sandbox = new Sandbox({ stage, audio, onJourney: () => enterJourney() });

function enterSandbox(orbital, opts) {
  ui.hide();
  measure.release();
  sandbox.show(orbital, opts);
}

function enterJourney(chapter = null) {
  sandbox.hide();
  ui.show();
  if (chapter !== null) story.goto(chapter, 0, { force: true });
  else story.replay("jump");
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

stage.onFrame(() => ui.tick());

// ---- backdrop behind the start screen: a faint ground state
stage.cloud.setState(1, 0, 0, { mode: "instant" });
stage.cloud.fadeTo(0.35, 0);
stage.showProton(false, { instant: true });
stage.showAxes(false, { instant: true });
stage.frameCloud(0.95);
stage.setLayout(() => ({ top: 0, bottom: window.innerHeight }));
stage.start();

async function route(hash) {
  const target = parseHash(hash, CHAPTERS.length);
  if (target?.mode === "sandbox") { enterSandbox(target.orbital ?? undefined, { instant: true }); return; }

  const choice = await ui.start({
    beginLabel: target ? `Begin chapter ${target.chapter}` : "Begin",
    resumeLabel: !target && story.hasProgress
      ? `Resume: ${story.chapter === 0 ? CHAPTERS[0].title : `Chapter ${story.chapter}`}`
      : null,
  });
  if (choice === "sandbox") enterSandbox();
  else if (choice === "resume") enterJourney();
  else enterJourney(target ? target.chapter : 0);
}

window.addEventListener("hashchange", () => {
  const target = parseHash(location.hash, CHAPTERS.length);
  if (!target || !$("start").hidden) return;
  if (target.mode === "sandbox") enterSandbox(target.orbital ?? sandbox.state);
  else if (target.chapter !== story.chapter || !ui.visible) enterJourney(target.chapter);
});

route(location.hash);

// Hook for automated checks (tests/screenshot.mjs).
window.__hydrogen = { stage, audio, story, ui, sandbox, measure, ready: true };
