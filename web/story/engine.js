// Story engine: a pure state machine over chapters → beats.
//
// It knows nothing about the DOM or the 3D scene. It tracks the current position,
// which chapters are unlocked, persists progress, parses deep links, and tells
// listeners when a beat is entered (and in which direction).

import { isValid } from "../physics.js";

export const PROGRESS_KEY = "hydrogen-journey-v1";

/**
 * Parse a location hash.
 *   #tour            → { mode: "story", chapter: null }   (the guided tour's start screen)
 *   #ch2             → { mode: "story", chapter: 2 }
 *   #lab, #sandbox   → { mode: "lab" }
 *   #n3l2m0          → { mode: "lab", orbital: { n: 3, l: 2, m: 0 } }  (also "#3,2,0")
 */
export function parseHash(hash, chapterCount) {
  const ch = hash.match(/^#ch(\d+)$/);
  if (ch && +ch[1] < chapterCount) return { mode: "story", chapter: +ch[1] };
  if (hash === "#tour") return { mode: "story", chapter: null };
  if (hash === "#lab" || hash === "#sandbox") return { mode: "lab" };
  const orb = hash.match(/^#n(\d+)l(\d+)m(-?\d+)$/) ?? hash.match(/^#(\d+),(\d+),(-?\d+)$/);
  if (orb) {
    const [n, l, m] = orb.slice(1).map(Number);
    if (isValid(n, l, m)) return { mode: "lab", orbital: { n, l, m } };
  }
  return null;
}

export class Story {
  /**
   * @param chapters [{ id, title, minutes, beats: [{ id, ... }] }]
   * @param storage  object with getItem/setItem (localStorage) or null
   */
  constructor(chapters, { storage = null } = {}) {
    this.chapters = chapters;
    this.storage = storage;
    this.chapter = 0;
    this.beat = 0;
    this.unlocked = 0;       // highest chapter index the user may jump to
    this.finished = false;   // reached the end at least once
    this.listeners = new Set();
    this.#load();
  }

  get current() { return this.chapters[this.chapter].beats[this.beat]; }
  get currentChapter() { return this.chapters[this.chapter]; }
  get totalBeats() { return this.chapters.reduce((s, c) => s + c.beats.length, 0); }
  get isFirst() { return this.chapter === 0 && this.beat === 0; }
  get isLast() { return this.chapter === this.chapters.length - 1 && this.beat === this.currentChapter.beats.length - 1; }

  /** Overall progress through the journey, 0–1, counted in beats. */
  get progress() {
    let done = 0;
    for (let c = 0; c < this.chapter; c++) done += this.chapters[c].beats.length;
    return (done + this.beat) / Math.max(1, this.totalBeats - 1);
  }

  /** Has the user saved progress beyond the very start? */
  get hasProgress() { return this.chapter > 0 || this.beat > 0 || this.unlocked > 0; }

  onEnter(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  #emit(direction) {
    this.#save();
    const info = { chapter: this.chapter, beat: this.beat, def: this.current, chapterDef: this.currentChapter, direction };
    for (const fn of this.listeners) fn(info);
  }

  /** Jump to a chapter (only if unlocked, unless force). Returns true if it moved. */
  goto(chapter, beat = 0, { force = false } = {}) {
    if (chapter < 0 || chapter >= this.chapters.length) return false;
    if (!force && chapter > this.unlocked) return false;
    const direction = chapter < this.chapter || (chapter === this.chapter && beat < this.beat) ? "back" : "jump";
    this.chapter = chapter;
    this.beat = Math.min(beat, this.chapters[chapter].beats.length - 1);
    this.unlocked = Math.max(this.unlocked, chapter);
    this.#emit(direction);
    return true;
  }

  /** Advance one beat. At the end of the journey, marks it finished and returns "end". */
  next() {
    if (this.beat < this.currentChapter.beats.length - 1) {
      this.beat++;
    } else if (this.chapter < this.chapters.length - 1) {
      this.chapter++;
      this.beat = 0;
      this.unlocked = Math.max(this.unlocked, this.chapter);
    } else {
      this.finished = true;
      this.#save();
      return "end";
    }
    this.#emit("forward");
    return "moved";
  }

  /** Step back one beat (crossing into the previous chapter's last beat). */
  back() {
    if (this.beat > 0) this.beat--;
    else if (this.chapter > 0) { this.chapter--; this.beat = this.currentChapter.beats.length - 1; }
    else return false;
    this.#emit("back");
    return true;
  }

  /** Re-emit the current beat (e.g. on start-up). */
  replay(direction = "jump") { this.#emit(direction); }

  reset() {
    this.chapter = 0; this.beat = 0; this.unlocked = 0; this.finished = false;
    this.#save();
  }

  #save() {
    if (!this.storage) return;
    try {
      this.storage.setItem(PROGRESS_KEY, JSON.stringify({
        chapter: this.chapter, beat: this.beat, unlocked: this.unlocked, finished: this.finished,
      }));
    } catch { /* storage unavailable: progress just isn't remembered */ }
  }

  #load() {
    if (!this.storage) return;
    try {
      const saved = JSON.parse(this.storage.getItem(PROGRESS_KEY) ?? "null");
      if (!saved) return;
      const last = this.chapters.length - 1;
      this.chapter = Math.min(Math.max(0, saved.chapter | 0), last);
      this.beat = Math.min(Math.max(0, saved.beat | 0), this.currentChapter.beats.length - 1);
      this.unlocked = Math.min(Math.max(this.chapter, saved.unlocked | 0), last);
      this.finished = !!saved.finished;
    } catch { /* corrupt or unavailable: start fresh */ }
  }
}
