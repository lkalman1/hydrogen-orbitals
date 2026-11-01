// Tests for the story engine, content rules, and audio timing helpers.
//   node --test tests/        (or: npm test)

import { test } from "node:test";
import assert from "node:assert/strict";

import { Story, parseHash, PROGRESS_KEY } from "../web/story/engine.js";
import { CHAPTERS } from "../web/story/chapters.js";
import { DEEPER } from "../web/story/deeper.js";
import { GLOSSARY } from "../web/story/glossary.js";
import { parseCaption } from "../web/story/ui.js";
import { nextBarTime } from "../web/audio/engine.js";
import { CUES } from "../web/audio/cues.js";

const memoryStorage = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), data };
};

const mini = [
  { id: "a", title: "A", minutes: 1, beats: [{ id: "a0" }, { id: "a1" }] },
  { id: "b", title: "B", minutes: 1, beats: [{ id: "b0" }] },
  { id: "c", title: "C", minutes: 1, beats: [{ id: "c0" }, { id: "c1" }] },
];

test("next/back walk beats across chapter boundaries", () => {
  const s = new Story(mini);
  const seen = [];
  s.onEnter(({ def, direction }) => seen.push(`${def.id}:${direction}`));
  assert.equal(s.next(), "moved");
  assert.equal(s.next(), "moved");
  assert.equal(s.current.id, "b0");
  assert.equal(s.unlocked, 1);
  assert.ok(s.back());
  assert.equal(s.current.id, "a1");
  assert.deepEqual(seen, ["a1:forward", "b0:forward", "a1:back"]);
});

test("the end of the journey reports 'end' and marks it finished", () => {
  const s = new Story(mini);
  s.goto(2, 1, { force: true });
  assert.ok(s.isLast);
  assert.equal(s.next(), "end");
  assert.ok(s.finished);
});

test("locked chapters can't be jumped to; forced deep links unlock them", () => {
  const s = new Story(mini);
  assert.equal(s.goto(2), false);
  assert.equal(s.goto(2, 0, { force: true }), true);
  assert.equal(s.unlocked, 2);
  assert.equal(s.goto(1), true);
  assert.equal(s.back(), true);       // b0 → a1
  assert.equal(s.isFirst, false);
});

test("progress is saved and restored, and survives bad data", () => {
  const storage = memoryStorage();
  const s = new Story(mini, { storage });
  s.next(); s.next();
  const t = new Story(mini, { storage });
  assert.equal(t.chapter, 1);
  assert.equal(t.unlocked, 1);
  assert.ok(t.hasProgress);

  storage.setItem(PROGRESS_KEY, JSON.stringify({ chapter: 99, beat: 99, unlocked: -4 }));
  const u = new Story(mini, { storage });
  assert.equal(u.chapter, 2);
  assert.equal(u.beat, 1);
  assert.equal(u.unlocked, 2);

  storage.setItem(PROGRESS_KEY, "{not json");
  assert.equal(new Story(mini, { storage }).chapter, 0);

  const throwing = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  const v = new Story(mini, { storage: throwing });
  assert.equal(v.next(), "moved");
});

test("progress fraction runs 0 → 1", () => {
  const s = new Story(mini);
  assert.equal(s.progress, 0);
  s.goto(2, 1, { force: true });
  assert.equal(s.progress, 1);
});

test("deep links", () => {
  assert.deepEqual(parseHash("#ch2", 6), { mode: "story", chapter: 2 });
  assert.equal(parseHash("#ch9", 6), null);
  assert.deepEqual(parseHash("#sandbox", 6), { mode: "sandbox" });
  assert.deepEqual(parseHash("#n3l2m-1", 6), { mode: "sandbox", orbital: { n: 3, l: 2, m: -1 } });
  assert.deepEqual(parseHash("#3,1,0", 6), { mode: "sandbox", orbital: { n: 3, l: 1, m: 0 } });
  assert.equal(parseHash("#n2l2m0", 6), null); // l < n violated
  assert.equal(parseHash("", 6), null);
});

test("caption markup parses glossary chips", () => {
  assert.deepEqual(parseCaption("made of [[atom|atoms]]. A [[proton]]!"), [
    { text: "made of " }, { text: "atoms", term: "atom" }, { text: ". A " }, { text: "proton", term: "proton" }, { text: "!" },
  ]);
});

// ---- content rules (keep the main path middle-school friendly and every link valid)
const allBeats = CHAPTERS.flatMap((c) => c.beats.map((b) => ({ chapter: c, beat: b })));

test("main captions stay short (≤ 22 words)", () => {
  for (const { chapter, beat } of allBeats) {
    const words = parseCaption(beat.caption).map((t) => t.text).join("").trim().split(/\s+/).length;
    assert.ok(words <= 22, `${chapter.id}/${beat.id}: ${words} words`);
  }
});

test("every glossary chip and Go-deeper key resolves", () => {
  for (const { chapter, beat } of allBeats) {
    for (const tok of parseCaption(beat.caption)) if (tok.term) assert.ok(GLOSSARY[tok.term], `${chapter.id}/${beat.id}: no glossary entry "${tok.term}"`);
    if (beat.deeper) assert.ok(DEEPER[beat.deeper], `${chapter.id}/${beat.id}: no deeper entry "${beat.deeper}"`);
  }
});

test("every chapter has a music cue and beats have scene waits with fallbacks", () => {
  for (const c of CHAPTERS) {
    assert.ok(CUES.music[c.music], `${c.id}: missing music cue ${c.music}`);
    for (const b of c.beats) if (b.wait?.type === "scene") assert.ok(b.wait.label, `${c.id}/${b.id}: scene wait needs a fallback label`);
  }
});

test("bar-quantized scheduling lands on the next bar line", () => {
  const bar = (60 / 72) * 4;              // 3.333 s
  assert.equal(nextBarTime(0, bar, 0), bar); // lead time pushes past t = 0
  assert.ok(Math.abs(nextBarTime(1, bar, 5) - (1 + 2 * bar)) < 1e-9);
  assert.ok(Math.abs(nextBarTime(1, bar, 1 + bar - 0.01) - (1 + 2 * bar)) < 1e-9); // too close: skip a bar
});

// ---- Chapter 1 measurement statistics
import { radial1s, rampRate, rampTotal, sparseness, RadialHistogram, RAMP } from "../web/story/stats.js";
import { buildTables, makeRanks, sampleState } from "../web/sampler.js";
import { meanR, meanR2 } from "../web/physics.js";

test("exact 1s radial density is normalised, peaks at 1 a₀, mean 1.5 a₀", () => {
  let norm = 0, mean = 0, best = 0, bestR = 0;
  const dr = 1e-4;
  for (let r = dr / 2; r < 30; r += dr) {
    const p = radial1s(r);
    norm += p * dr; mean += r * p * dr;
    if (p > best) { best = p; bestR = r; }
  }
  assert.ok(Math.abs(norm - 1) < 1e-6);
  assert.ok(Math.abs(mean - meanR(1, 0)) < 1e-6);
  assert.ok(Math.abs(bestR - 1) < 1e-3);
});

test("holding Measure: rate ramps up, is capped, and 20,000 measurements take about 6 s", () => {
  assert.equal(rampRate(0), RAMP.start);
  assert.ok(rampRate(2) > rampRate(1));
  assert.equal(rampRate(100), RAMP.max);
  // closed-form total matches numerical integration of the rate
  let sum = 0;
  for (let t = 0; t < 8; t += 1e-4) sum += rampRate(t + 5e-5) * 1e-4;
  assert.ok(Math.abs(sum - rampTotal(8)) / rampTotal(8) < 1e-3);
  let t = 0;
  while (rampTotal(t) < 20000) t += 0.01;
  assert.ok(t > 4 && t < 7.5, `20,000 measurements after ${t.toFixed(2)} s`);
});

test("dots start large and bright and settle as measurements accumulate", () => {
  assert.ok(sparseness(1) > 0.9);
  assert.ok(sparseness(100) > 0.4 && sparseness(100) < 0.6);
  assert.equal(sparseness(50000), 0);
});

test("histogram of exact 1s samples converges to P(r) and ⟨r⟩", () => {
  const N = 100000;
  const { sph } = sampleState(buildTables(1, 0, 0), makeRanks(N, 11));
  const h = new RadialHistogram();
  for (let i = 0; i < N; i++) h.add(sph[3 * i]);
  const sigma = Math.sqrt(meanR2(1, 0) - meanR(1, 0) ** 2);
  assert.ok(Math.abs(h.mean - 1.5) < 5 * sigma / Math.sqrt(N), `mean ${h.mean}`);
  assert.ok(Math.abs(h.mode - 1) < 0.15, `mode ${h.mode}`);
  for (let i = 0; i < h.bins; i++) {
    const rMid = (i + 0.5) * h.width;
    assert.ok(Math.abs(h.density(i) - radial1s(rMid)) < 0.03, `bin ${i}: ${h.density(i)} vs ${radial1s(rMid)}`);
  }
});
