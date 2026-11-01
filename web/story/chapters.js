// The journey's content: chapters → beats.
//
// A beat is one caption plus one thing to do. Fields:
//   caption   main text (middle-school level, ≤ ~20 words). [[term]] or [[term|shown text]]
//             marks a glossary chip.
//   wait      { type: "continue", label, minSeconds }  → a button advances
//             { type: "scene", label }                 → the scene calls ctx.complete();
//                                                         label is the accessible fallback button
//   prompt    instruction shown once the caption has appeared (scene waits)
//   nudge     stronger hint after ~8 s of inactivity
//   deeper    key into deeper.js for the "Go deeper" drawer
//   music     { layers } for the chapter's music cue
//   enter(ctx, { direction })  set up the scene; may return a cleanup function
//
// enter() must fully set the scene for its beat, so "back" and deep links work.

const preview = (n, l, m) => (ctx, { direction }) => {
  const { stage } = ctx;
  stage.showProton(false);
  stage.showAxes(true);
  stage.cloud.setState(n, l, m, { mode: direction === "forward" ? "morph" : "instant" });
  stage.cloud.fadeTo(1, 0.8);
  stage.frameCloud(0.95);
  stage.rig.storyZoom = 1;
};

// A tuning beat: laser on, complete when level `target` is reached; other levels
// are real resonances too, so the atom absorbs, then falls back, and we hint.
const tuneFor = (target) => (ctx, { direction }) => {
  const { stage, lab, ui } = ctx;
  stage.showProton(true);
  stage.showAxes(false);
  if (lab.atom.n !== 1 || lab.busy || direction !== "forward") lab.reset();
  lab.ladder.show();
  lab.enableLaser({ start: target === 2 ? 270 : lab.nm });
  let misses = 0;
  return lab.on((e) => {
    if (e.type === "absorbed" && e.n === target) ctx.complete();
    else if (e.type === "absorbed") {
      ui.setPrompt(`That was level ${e.n}! It will fall back down; then try ${e.n > target ? "a longer" : "a shorter"} wavelength.`);
      setTimeout(() => lab.cascade(), 900);
    } else if (e.type === "miss" && ++misses === 3) {
      ui.setPrompt("Missed: the atom ignores the wrong colours. Watch the meter as you slide.");
    }
  });
};

const comingSoon = (text) => ({
  id: "coming-soon",
  caption: `This chapter is still being built. ${text}`,
  wait: { type: "continue", label: "Next chapter" },
  deeper: "coming-soon",
  music: { layers: 2 },
});

export const CHAPTERS = [
  {
    id: "ch0",
    title: "Prologue",
    minutes: 0.75,
    music: "MUS-00",
    beats: [
      {
        id: "dark",
        caption: "Everything around you is made of [[atom|atoms]]. Let's build the simplest one there is.",
        wait: { type: "continue", label: "Let's build it" },
        deeper: "journey",
        music: { layers: 1 },
        enter({ stage }) {
          stage.showProton(false);
          stage.showAxes(false);
          stage.cloud.fadeTo(0, 0.6);
          stage.frameRadius(4);
          stage.rig.flyTo({ pitch: 0.25, zoom: 1 }, 1.5);
        },
      },
      {
        id: "proton",
        caption: "This is a [[proton]]: a tiny particle with a positive electric charge. It's the heart of every hydrogen atom.",
        prompt: "Click the proton to give it an electron.",
        nudge: "Click the glowing dot in the middle.",
        wait: { type: "scene", label: "Add an electron" },
        deeper: "proton",
        music: { layers: 2 },
        enter(ctx, { direction }) {
          const { stage, audio } = ctx;
          stage.showAxes(false);
          stage.cloud.fadeTo(0, 0.6);
          stage.frameRadius(4);
          stage.showProton(true);
          if (direction === "forward") {
            audio.sfx("proton-appear");
            setTimeout(() => stage.proton.kick(0.5), 850);
          }
          const offTap = stage.rig.onTap((x, y) => {
            if (!stage.hitsProton(x, y)) return;
            ctx.complete();
          });
          return () => { offTap(); stage.proton.attention = false; };
        },
        onPrompt({ stage }) { stage.proton.attention = true; },
      },
      {
        id: "electron",
        caption: "Hydrogen has one [[electron]]. But the electron isn't a tiny ball circling the proton…",
        wait: { type: "continue", label: "So what is it?", minSeconds: 3.4 },
        deeper: "electron",
        music: { layers: 3 },
        enter({ stage, audio }, { direction }) {
          stage.showProton(true);
          stage.showAxes(false);
          if (direction === "forward") {
            audio.sfx("proton-tap");
            audio.sfx("condense", { seconds: 3.2 });
            stage.proton.kick(1);
            stage.cloud.setState(1, 0, 0, { mode: "condense" });
            stage.cloud.fadeTo(1, 1.2);
            stage.rig.flyTo({ yaw: stage.rig.yaw + 0.9, pitch: 0.4, zoom: 1 }, 4);
          } else {
            stage.cloud.setState(1, 0, 0, { mode: "instant" });
            stage.cloud.fadeTo(1, 0.6);
          }
          stage.frameCloud(0.95);
        },
      },
      {
        id: "cloud",
        caption: "It's a cloud of possibilities. The electron is most likely to be found where the cloud is brightest.",
        wait: { type: "continue", label: "Continue" },
        deeper: "orbital",
        music: { layers: 3 },
        enter({ stage }) {
          stage.showProton(true);
          stage.cloud.setState(1, 0, 0, { mode: "instant" });
          stage.cloud.fadeTo(1, 0.6);
          stage.frameCloud(0.95);
          stage.rig.flyTo({ zoom: 0.85 }, 2.5);
        },
      },
      {
        id: "title",
        caption: "Three numbers describe every shape this cloud can take. Let's discover them, one at a time.",
        wait: { type: "continue", label: "Start chapter 1" },
        deeper: "three-numbers",
        music: { layers: 4 },
        enter({ stage, audio, ui }, { direction }) {
          stage.showProton(true);
          stage.cloud.setState(1, 0, 0, { mode: "instant" });
          stage.cloud.fadeTo(1, 0.6);
          stage.frameCloud(0.95);
          stage.rig.flyTo({ zoom: 1.15, pitch: 0.3 }, 3);
          ui.titleCard(true);
          if (direction === "forward") audio.stinger("STG-title");
          return () => ui.titleCard(false);
        },
      },
    ],
  },
  {
    id: "ch1",
    title: "The electron is a cloud",
    minutes: 1.5,
    music: "MUS-01",
    beats: [
      {
        id: "question",
        uses: ["measure"],
        caption: "Where exactly is the electron right now? Let's find out by making a [[measurement]].",
        prompt: "Tap Measure a few times (or tap the atom).",
        nudge: "Press the Measure button above this box.",
        wait: { type: "scene", label: "Measure 5 times" },
        deeper: "measurement",
        music: { layers: 1 },
        enter(ctx) {
          const { stage, measure } = ctx;
          stage.showProton(true);
          stage.showAxes(false);
          measure.release();
          measure.reset();
          measure.enable();
          stage.frameCloud(0.95);
          stage.rig.flyTo({ zoom: 0.9, pitch: 0.3 }, 1.5);
          const off = measure.onCount((n) => { if (n >= 5) ctx.complete(); });
          return off;
        },
        onFallback({ measure }) { measure.measure(Math.max(0, 5 - measure.count)); },
      },
      {
        id: "random",
        uses: ["measure"],
        caption: "Each measurement finds the electron in one spot, but a different spot every time. The result is random.",
        wait: { type: "continue", label: "Then where is it?" },
        deeper: "randomness",
        music: { layers: 1 },
        enter({ stage, measure }) {
          stage.showProton(true);
          if (stage.cloud.revealed === Infinity) measure.reset();
          if (measure.count < 5) measure.measure(5 - measure.count);
          measure.enable();
          measure.chart.hide();
        },
      },
      {
        id: "hold",
        uses: ["measure"],
        caption: "Hold Measure down to make thousands of measurements, and watch where they land.",
        prompt: "Press and hold Measure.",
        nudge: "Keep holding: it speeds up the longer you hold.",
        wait: { type: "scene", label: "Measure 20,000 times" },
        deeper: "radial-probability",
        music: { layers: 2 },
        enter(ctx) {
          const { stage, measure } = ctx;
          stage.showProton(true);
          if (stage.cloud.revealed === Infinity) measure.reset();
          measure.enable({ hold: true });
          measure.chart.show();
          measure.chart.highlightPeak(false);
          const off = measure.onCount((n) => { if (n >= 20000) ctx.complete(); });
          return () => { off(); measure.disable(); };
        },
        onFallback({ measure }) { measure.measure(Math.max(0, 20000 - measure.count)); },
      },
      {
        id: "pattern",
        uses: ["measure"],
        caption: "A pattern appears! This cloud is the electron's [[orbital]]: a map of where it's likely to be found.",
        wait: { type: "continue", label: "Continue", minSeconds: 1.8 },
        deeper: "orbital",
        music: { layers: 4 },
        enter({ stage, measure }, { direction }) {
          stage.showProton(true);
          if (stage.cloud.revealed === Infinity) measure.reset();
          measure.disable();
          measure.chart.show();
          measure.revealRest(direction === "forward" ? 1.6 : 0.3);
          stage.rig.flyTo({ zoom: 1, yaw: stage.rig.yaw + 0.6 }, 3);
        },
      },
      {
        id: "distance",
        uses: ["measure"],
        caption: "The most common distance is about 0.05 nanometres: the [[bohr radius|Bohr radius]]. A metre is 19 billion of them!",
        wait: { type: "continue", label: "Continue" },
        deeper: "bohr-radius",
        music: { layers: 3 },
        enter({ stage, measure }) {
          stage.showProton(true);
          if (stage.cloud.revealed === Infinity) { measure.reset(); measure.revealRest(0.3); }
          measure.disable();
          measure.chart.show();
          measure.chart.highlightPeak(true);
          measure.marker.show(true);
          stage.rig.flyTo({ pitch: 0.05, zoom: 0.8 }, 2);
          return () => { measure.marker.show(false); measure.chart.highlightPeak(false); };
        },
      },
      {
        id: "stationary",
        caption: "Drag to look around. The cloud never changes: only your view moves. It's a [[stationary state]].",
        prompt: "Drag the atom to turn it.",
        nudge: "Click and drag anywhere on the cloud.",
        wait: { type: "scene", label: "Continue" },
        deeper: "stationary",
        music: { layers: 4 },
        enter(ctx) {
          const { stage } = ctx;
          stage.showProton(true);
          stage.cloud.setState(1, 0, 0, { mode: "instant" });
          stage.cloud.fadeTo(1, 0.4);
          stage.frameCloud(0.95);
          stage.rig.storyZoom = 0.9;
          stage.rig.autoRotate = false;
          const start = { yaw: stage.rig.yaw, pitch: stage.rig.pitch };
          const off = stage.onFrame(() => {
            const turned = Math.abs(stage.rig.yaw - start.yaw) + Math.abs(stage.rig.pitch - start.pitch);
            if (stage.rig.dragging && turned > 0.9) ctx.complete();
          });
          return () => { off(); stage.rig.autoRotate = !stage.rig.reducedMotion; };
        },
      },
    ],
  },
  {
    id: "ch2",
    title: "Climbing the ladder",
    minutes: 3.5,
    music: "MUS-02",
    beats: [
      {
        id: "ladder",
        uses: ["lab"],
        caption: "An atom can only hold certain amounts of energy, like the rungs of a ladder. These are its [[energy level|energy levels]].",
        wait: { type: "continue", label: "Let's climb" },
        deeper: "energy-levels",
        music: { layers: 1 },
        enter({ stage, lab }) {
          stage.showProton(true);
          stage.showAxes(false);
          lab.reset();
          lab.disableLaser();
          lab.ladder.show();
          stage.rig.flyTo({ zoom: 1.1, pitch: 0.3 }, 1.5);
        },
      },
      {
        id: "tune",
        uses: ["lab"],
        caption: "Light can lift the electron up the ladder, but only light of exactly the right colour. Tune the laser and fire!",
        prompt: "Drag the slider, then press Fire. The meter glows near the right colour.",
        nudge: "Hint: try around 243 nm.",
        wait: { type: "scene", label: "Tune it for me" },
        deeper: "two-photon",
        music: { layers: 2 },
        enter: tuneFor(2),
        onFallback({ lab }) { lab.autoTune(2); return "wait"; },
      },
      {
        id: "level-2",
        uses: ["lab"],
        caption: "Two photons lifted the electron to level 2. The cloud grew, and an empty shell, a [[node]], opened inside it.",
        wait: { type: "continue", label: "Continue" },
        deeper: "two-photon",
        music: { layers: 2 },
        enter({ stage, lab }) {
          stage.showProton(true);
          if (lab.atom.n !== 2 || lab.busy) lab.reset({ n: 2, l: 0, m: 0 });
          lab.disableLaser();
          lab.ladder.show();
          lab.nodeMarker.show(true);
          return () => lab.nodeMarker.show(false);
        },
      },
      {
        id: "why-two",
        uses: ["lab"],
        caption: "Why two photons, not one? A single photon can't make this particular jump. Chapter 3 reveals why.",
        wait: { type: "continue", label: "Continue" },
        deeper: "two-photon",
        music: { layers: 2 },
        enter({ lab }) {
          if (lab.atom.n !== 2 || lab.busy) lab.reset({ n: 2, l: 0, m: 0 });
          lab.disableLaser();
          lab.ladder.show();
        },
      },
      {
        id: "relax",
        uses: ["lab"],
        caption: "Left alone, the atom falls back down to level 1, giving its energy away as light.",
        wait: { type: "scene", label: "Continue" },
        deeper: "decay",
        music: { layers: 2 },
        enter(ctx) {
          const { lab } = ctx;
          if (lab.atom.n !== 2 || lab.busy) lab.reset({ n: 2, l: 0, m: 0 });
          lab.disableLaser();
          lab.ladder.show();
          const off = lab.on((e) => { if (e.type === "ground") ctx.complete(); });
          setTimeout(() => lab.cascade(), 600);
          return off;
        },
        onFallback({ lab }) { lab.reset(); },
      },
      {
        id: "tune-3",
        uses: ["lab"],
        caption: "Now find the colour that lifts the electron straight from level 1 to level 3.",
        prompt: "Level 3 is higher, so each photon needs more energy: a shorter wavelength.",
        nudge: "Hint: try around 205 nm.",
        wait: { type: "scene", label: "Tune it for me" },
        deeper: "two-photon",
        music: { layers: 3 },
        enter: tuneFor(3),
        onFallback({ lab }) { lab.autoTune(3); return "wait"; },
      },
      {
        id: "size",
        uses: ["lab"],
        caption: "Level 3 is bigger again, with two empty shells. On average it's nine times wider than level 1!",
        wait: { type: "continue", label: "Continue" },
        deeper: "size",
        music: { layers: 3 },
        enter({ stage, lab }) {
          stage.showProton(true);
          if (lab.atom.n !== 3 || lab.busy) lab.reset({ n: 3, l: 0, m: 0 });
          lab.disableLaser();
          lab.ladder.show();
          lab.sizeMarker.show(true);
          stage.rig.flyTo({ zoom: 1, pitch: 0.2 }, 2);
          return () => lab.sizeMarker.show(false);
        },
      },
      {
        id: "cascade",
        uses: ["lab"],
        caption: "Now let go, and watch the light the atom gives off on its way back down.",
        prompt: "Press Let go.",
        nudge: "The Let go button is just above this box.",
        wait: { type: "scene", label: "Let it go" },
        deeper: "decay",
        music: { layers: 3 },
        enter(ctx) {
          const { lab } = ctx;
          if (lab.atom.n !== 3 || lab.busy) lab.reset({ n: 3, l: 0, m: 0 });
          lab.disableLaser();
          lab.ladder.show();
          lab.spectrum.reset();
          lab.spectrum.show();
          lab.showRelease(true);
          const off = lab.on((e) => { if (e.type === "ground") ctx.complete(); });
          return () => { off(); lab.showRelease(false); };
        },
        onFallback({ lab }) { lab.showRelease(false); lab.cascade(); return "wait"; },
      },
      {
        id: "spectrum",
        uses: ["lab"],
        caption: "That red line is hydrogen's fingerprint. Astronomers see it glowing in gas clouds all across our galaxy.",
        prompt: "Optional: fire other colours to collect more lines.",
        wait: { type: "continue", label: "Next chapter", minSeconds: 1 },
        deeper: "spectrum",
        music: { layers: 4 },
        enter({ stage, lab }) {
          stage.showProton(true);
          if (lab.atom.n !== 1 || lab.busy) lab.reset();
          lab.ladder.show();
          lab.spectrum.show();
          lab.enableLaser({ autoCascade: true });
        },
      },
    ],
  },
  {
    id: "ch3",
    title: "Light carries a twist",
    minutes: 3.5,
    music: "MUS-03",
    beats: [{ ...comingSoon("Here a single photon's twist will reshape the cloud into lobes."), enter: preview(3, 2, 0) }],
  },
  {
    id: "ch4",
    title: "Space gets a direction",
    minutes: 3,
    music: "MUS-04",
    beats: [{ ...comingSoon("Here a magnetic field will split the orientations apart."), enter: preview(2, 1, 1) }],
  },
  {
    id: "ch5",
    title: "The whole picture",
    minutes: 1.5,
    music: "MUS-05",
    beats: [{
      ...comingSoon("For now, explore every orbital yourself in the sandbox."),
      wait: { type: "continue", label: "Open the sandbox" },
      enter: preview(4, 3, 1),
    }],
  },
];
