// Headless end-to-end check: plays through the prologue (Ch 0), opens the drawer,
// glossary and chapter menu, steps back, visits the sandbox, and writes
// screenshots to tests/screenshots/. Fails on any page error.
//   node tests/screenshot.mjs
// CDN imports (three.js, KaTeX) are served from node_modules so this works offline.

import { createServer } from "node:http";
import { readFile, mkdir, rm } from "node:fs/promises";
import { extname, join } from "node:path";
import { createRequire } from "node:module";

// Playwright is preinstalled globally in dev containers; fall back to a local install.
const { chromium } = createRequire(import.meta.url)("playwright");

const ROOT = new URL("..", import.meta.url).pathname;
const WEB = join(ROOT, "web");
const OUT = join(ROOT, "tests", "screenshots");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const DESKTOP = { width: 1400, height: 860 };
// optional filter: `node tests/screenshot.mjs lab` or `… tour` runs just that part
const only = process.argv[2];
const want = (section) => !only || only === section;
const PHONE = { width: 390, height: 844 };

const server = createServer(async (req, res) => {
  try {
    const path = join(WEB, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html"));
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
    res.end(await readFile(path));
  } catch { res.writeHead(404).end(); }
}).listen(0);
const url = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
});
const errors = [];
if (!only) await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

async function open(hash = "", viewport = DESKTOP) {
  const page = await browser.newPage({ viewport });
  const tag = `${hash || "/"} @${viewport.width}`;
  page.on("pageerror", (e) => errors.push(`${tag}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${tag}: ${m.text()}`));
  await page.route("https://cdn.jsdelivr.net/npm/three@0.160.0/**", (route) => {
    const rel = new URL(route.request().url()).pathname.replace("/npm/three@0.160.0/", "");
    return route.fulfill({ path: join(ROOT, "node_modules/three", rel), contentType: "text/javascript" });
  });
  await page.route("https://cdn.jsdelivr.net/npm/katex@0.16.9/**", (route) =>
    route.fulfill({ path: join(ROOT, "node_modules/katex/dist/katex.mjs"), contentType: "text/javascript" }));
  await page.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ body: "", contentType: "text/css" }));
  await page.goto(url + hash);
  await page.waitForFunction(() => window.__hydrogen?.ready, null, { timeout: 30000 });
  return page;
}
const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`) });
const beat = (page) => page.evaluate(() => `${window.__hydrogen.story.chapter}/${window.__hydrogen.story.current.id}`);
const expectBeat = async (page, want) => {
  const got = await beat(page);
  if (got !== want) errors.push(`expected beat ${want}, got ${got}`);
};
const clickContinue = async (page) => {
  await page.locator("#continue-btn").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("#continue-btn").click();
};

// ---------------------------------------------------------------- desktop journey
if (want("tour")) {
  const page = await open("#tour");
  await page.locator("#begin-btn").waitFor({ state: "visible" });
  await page.waitForTimeout(800);
  await shot(page, "01-start");
  await page.locator("#begin-btn").click();
  await page.waitForTimeout(1600);
  await expectBeat(page, "0/dark");
  const sound = await page.evaluate(() => {
    const { audio } = window.__hydrogen;
    return { ready: audio.ready, state: audio.ctx?.state, cue: audio.music?.id, layers: audio.music?.active };
  });
  if (!sound.ready || sound.cue !== "MUS-00" || sound.layers !== 1) errors.push(`audio after Begin: ${JSON.stringify(sound)}`);
  await shot(page, "02-dark");
  await clickContinue(page);

  // proton: wait for the prompt, then click the proton itself
  await page.locator("#prompt").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(900);
  await shot(page, "03-proton");
  const p = await page.evaluate(() => {
    const { stage } = window.__hydrogen;
    return stage.rig.project(new stage.camera.position.constructor(0, 0, 0));
  });
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(1500);
  await expectBeat(page, "0/electron");
  await shot(page, "04-condensing");
  await clickContinue(page);
  await page.waitForTimeout(1200);
  await expectBeat(page, "0/cloud");

  // glossary chip is in the previous beat; go back to test it, then return
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(1200);
  await expectBeat(page, "0/electron");
  await page.locator(".term").first().click();
  await page.waitForTimeout(400);
  await shot(page, "05-glossary");
  await page.keyboard.press("Escape");
  await clickContinue(page);
  await page.waitForTimeout(1000);

  // Go deeper drawer with MathML
  await page.locator("#deeper-btn").click();
  await page.waitForFunction(() => document.querySelector("#drawer-body math"), null, { timeout: 15000 });
  await page.waitForTimeout(500);
  await shot(page, "06-deeper");
  await page.locator("#drawer-close").click();
  await clickContinue(page);

  await page.waitForTimeout(3500);
  await expectBeat(page, "0/title");
  await shot(page, "07-title");
  await clickContinue(page);
  await page.waitForTimeout(900);
  await expectBeat(page, "1/question");
  await shot(page, "08-chapter1-banner");

  // ---- Chapter 1: tap to measure
  await page.locator("#prompt").waitFor({ state: "visible", timeout: 15000 });
  const mbtn = page.locator("#measure-btn");
  for (let i = 0; i < 3; i++) { await mbtn.click(); await page.waitForTimeout(250); }
  await page.waitForTimeout(150);
  await shot(page, "09-ch1-three-measurements");
  for (let i = 0; i < 2; i++) { await mbtn.click(); await page.waitForTimeout(250); }
  await page.waitForTimeout(800);
  await expectBeat(page, "1/random");
  await clickContinue(page);

  // hold to measure until the beat completes (≥ 20,000)
  await page.locator("#prompt").waitFor({ state: "visible", timeout: 15000 });
  const box = await mbtn.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(3800);
  await shot(page, "10-ch1-holding");
  await page.waitForFunction(() => window.__hydrogen.story.current.id === "pattern", null, { timeout: 30000 });
  await page.mouse.up();
  const measured = await page.evaluate(() => window.__hydrogen.tools.measure.count);
  if (measured < 20000) errors.push(`hold: only ${measured} measurements`);
  await page.waitForTimeout(2600);
  await shot(page, "11-ch1-pattern");
  const stats = await page.evaluate(() => ({ mean: window.__hydrogen.tools.measure.hist.mean, n: window.__hydrogen.tools.measure.hist.total }));
  if (Math.abs(stats.mean - 1.5) > 0.02) errors.push(`measured mean ${stats.mean} over ${stats.n} (expected 1.5)`);
  await clickContinue(page);
  await page.waitForTimeout(2200);
  await expectBeat(page, "1/distance");
  await shot(page, "12-ch1-bohr-radius");
  await clickContinue(page);

  // stationary: drag to complete
  await page.locator("#prompt").waitFor({ state: "visible", timeout: 15000 });
  await shot(page, "13-ch1-stationary");
  await page.mouse.move(500, 400);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) { await page.mouse.move(500 + i * 18, 400 + i * 3); await page.waitForTimeout(30); }
  await page.waitForTimeout(400);
  await page.mouse.up();
  await page.waitForTimeout(1000);
  await expectBeat(page, "2/ladder");

  await page.locator("#menu-btn").click();
  await page.waitForTimeout(400);
  await shot(page, "14-menu");
  const locked = await page.locator(".menu-item:disabled").count();
  if (locked !== 3) errors.push(`menu: expected 3 locked chapters, got ${locked}`);
  await page.locator("#menu-sandbox").click();
  await page.waitForTimeout(1500);
  await shot(page, "15-lab-from-menu");
  if (await page.evaluate(() => document.getElementById("lab-ui").hidden)) errors.push("menu → lab did not open the lab");

  // the lab's Guided tour button offers to resume where we were
  await page.locator("#tour-btn").click();
  await page.locator("#resume-btn").waitFor({ state: "visible" });
  await page.locator("#resume-btn").click();
  await page.waitForTimeout(800);
  await expectBeat(page, "2/ladder");
  await page.close();
}

// ---------------------------------------------------------------- chapter 2 (deep link)
if (want("tour")) {
  const page = await open("#ch2");
  await page.locator("#begin-btn").click();
  await page.waitForTimeout(1400);
  await expectBeat(page, "2/ladder");
  await shot(page, "20-ch2-ladder");
  await clickContinue(page);
  await page.locator("#prompt").waitFor({ state: "visible", timeout: 15000 });
  // a miss: the photons pass straight through
  await page.locator("#laser-nm").fill("252");
  await page.locator("#fire-btn").click();
  await page.waitForTimeout(450);
  await shot(page, "21-ch2-miss");
  await page.waitForTimeout(700);
  // tune near the 1S–2S line; releasing the slider snaps onto it
  await page.locator("#laser-nm").fill("243.5");
  await page.locator("#laser-nm").dispatchEvent("change");
  await page.waitForTimeout(300);
  const tuned = await page.evaluate(() => window.__hydrogen.tools.lab.nm);
  if (Math.abs(tuned - 243.14) > 0.02) errors.push(`snap: laser at ${tuned}`);
  await shot(page, "22-ch2-resonant");
  await page.locator("#fire-btn").click();
  await page.waitForTimeout(2000); // photons arrive at 0.8 s; the superposition is running
  await shot(page, "23-ch2-superposition");
  await page.waitForFunction(() => window.__hydrogen.story.current.id === "level-2", null, { timeout: 20000 });
  const st2 = await page.evaluate(() => ({ ...window.__hydrogen.stage.cloud.state }));
  if (st2.n !== 2 || st2.l !== 0) errors.push(`after 243 nm: cloud is ${JSON.stringify(st2)}`);
  await page.waitForTimeout(1500);
  await shot(page, "24-ch2-level2");
  await clickContinue(page); // → why-two
  await clickContinue(page); // → relax (completes by itself)
  await page.waitForFunction(() => window.__hydrogen.story.current.id === "tune-3", null, { timeout: 20000 });
  await page.locator("#prompt").waitFor({ state: "visible", timeout: 15000 });
  await page.keyboard.press("Enter"); // fallback: tunes to 205 nm and fires
  await page.waitForFunction(() => window.__hydrogen.story.current.id === "size", null, { timeout: 20000 });
  await page.waitForTimeout(2200);
  await shot(page, "25-ch2-level3-size");
  await clickContinue(page);
  await page.locator("#release-btn").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("#release-btn").click();
  await page.waitForTimeout(1700);
  await shot(page, "26-ch2-cascade");
  await page.waitForFunction(() => window.__hydrogen.story.current.id === "spectrum", null, { timeout: 30000 });
  const lines = await page.evaluate(() => [...window.__hydrogen.tools.lab.spectrum.lines.values()].map((l) => +l.nm.toFixed(1)));
  if (!lines.includes(656.5) || !lines.includes(121.6)) errors.push(`spectrum lines after the 3s cascade: ${lines}`);
  await page.waitForTimeout(1500);
  await shot(page, "27-ch2-spectrum");
  await clickContinue(page);
  await page.waitForTimeout(800);
  await expectBeat(page, "3/one-photon");
  await page.close();
}

// ---------------------------------------------------------------- chapter 3 (deep link)
if (want("tour")) {
  const page = await open("#ch3");
  await page.locator("#begin-btn").click();
  await page.locator("#prompt").waitFor({ state: "visible", timeout: 15000 });
  await expectBeat(page, "3/one-photon");
  await page.locator("#laser-nm").fill("121.9");
  await page.locator("#laser-nm").dispatchEvent("change");
  await page.waitForTimeout(300);
  const tuned = await page.evaluate(() => window.__hydrogen.tools.lab.nm);
  if (Math.abs(tuned - 121.57) > 0.02) errors.push(`snap (one photon): laser at ${tuned}`);
  await page.locator("#fire-btn").click();
  await page.waitForTimeout(2100);
  await shot(page, "30-ch3-sloshing");
  await page.waitForFunction(() => window.__hydrogen.story.current.id === "lobes", null, { timeout: 20000 });
  const s2p = await page.evaluate(() => ({ ...window.__hydrogen.stage.cloud.state }));
  if (s2p.n !== 2 || s2p.l !== 1) errors.push(`one photon at 121.57 nm should give 2p, got ${JSON.stringify(s2p)}`);
  await page.waitForTimeout(2200);
  await shot(page, "31-ch3-2p-node-plane");
  await clickContinue(page); // → twist
  await clickContinue(page); // → aim
  await page.locator("#prompt").waitFor({ state: "visible", timeout: 15000 });
  await page.locator('#aim .aim-row[data-l="0"] button').click();
  await page.waitForFunction(() => document.querySelector('#aim .aim-row[data-l="0"]').classList.contains("done"), null, { timeout: 15000 });
  const landed = await page.locator('#aim .aim-row[data-l="0"] .aim-result').textContent();
  if (!landed.includes("2p")) errors.push(`aiming at 2s should land in 2p: "${landed}"`);
  await page.waitForTimeout(400);
  await shot(page, "32-ch3-aim-2s");
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press("Enter"); // fallback: try the remaining targets
  await page.waitForFunction(() => window.__hydrogen.story.current.id === "rule", null, { timeout: 45000 });
  const results = await page.locator("#aim .aim-result").allTextContents();
  if (!results[2].includes("3p")) errors.push(`aiming at 3d should land in 3p: ${results}`);
  await page.waitForTimeout(800);
  await shot(page, "33-ch3-rule");
  await clickContinue(page); // → centre
  await page.waitForTimeout(3300);
  await shot(page, "34-ch3-centre");
  await clickContinue(page); // → climb
  await page.locator("#microwave-btn").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("#microwave-btn").click();
  await page.waitForFunction(() => window.__hydrogen.tools.lab.atom.l === 1 && !window.__hydrogen.tools.lab.busy, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  await shot(page, "35-ch3-3p-nodes");
  await page.locator("#microwave-btn").click();
  await page.waitForFunction(() => window.__hydrogen.story.current.id === "limit", null, { timeout: 20000 });
  await page.waitForTimeout(1800);
  await shot(page, "36-ch3-3d-cones");
  await page.locator("#microwave-btn").click();
  await page.waitForTimeout(1000);
  await shot(page, "37-ch3-limit");
  await page.waitForFunction(() => window.__hydrogen.story.current.id === "summary", null, { timeout: 20000 });
  const s3d = await page.evaluate(() => ({ ...window.__hydrogen.stage.cloud.state }));
  if (s3d.n !== 3 || s3d.l !== 2) errors.push(`microwaves should end in 3d, got ${JSON.stringify(s3d)}`);
  await clickContinue(page);
  await page.waitForTimeout(800);
  await expectBeat(page, "4/coming-soon");
  await page.close();
}

// ---------------------------------------------------------------- resume + deep links
if (want("tour")) {
  const page = await open("#tour");
  await page.evaluate(() => localStorage.setItem("hydrogen-journey-v1", JSON.stringify({ chapter: 2, beat: 0, unlocked: 2 })));
  await page.reload();
  await page.waitForFunction(() => window.__hydrogen?.ready);
  await page.locator("#resume-btn").waitFor({ state: "visible" });
  await page.locator("#resume-btn").click();
  await page.waitForTimeout(1500);
  await expectBeat(page, "2/ladder");
  await page.close();
}
if (want("tour")) {
  const page = await open("#n3l2m0");
  await page.waitForTimeout(1500);
  if (await page.evaluate(() => document.getElementById("lab-ui").hidden)) errors.push("#n3l2m0 should open the lab");
  const at = await page.evaluate(() => ({ ...window.__hydrogen.lab.atom.state }));
  if (at.n !== 3 || at.l !== 2 || at.m !== 0) errors.push(`#n3l2m0 should put the lab atom in 3d m=0, got ${JSON.stringify(at)}`);
  await shot(page, "16-lab-deeplink");
  await page.close();
}

// ---------------------------------------------------------------- phone
if (want("tour")) {
  const page = await open("#tour", PHONE);
  await page.locator("#begin-btn").click();
  await clickContinue(page);
  await page.locator("#fallback-btn").waitFor({ state: "attached" });
  await page.waitForTimeout(1200);
  await shot(page, "17-phone-proton");
  await page.locator("#prompt").waitFor({ state: "visible", timeout: 15000 });
  await page.keyboard.press("Enter"); // keyboard path completes scene beats
  await page.waitForTimeout(3600);
  await expectBeat(page, "0/electron");
  await page.locator("#deeper-btn").click();
  await page.waitForTimeout(800);
  await shot(page, "18-phone-deeper");
  await page.close();
}
if (want("tour")) {
  // Chapter 1 on a phone via deep link: taps, then the accessible fallback for the hold
  const page = await open("#ch1", PHONE);
  await page.locator("#begin-btn").click();
  await page.locator("#prompt").waitFor({ state: "visible", timeout: 15000 });
  for (let i = 0; i < 5; i++) { await page.locator("#measure-btn").click(); await page.waitForTimeout(200); }
  await page.waitForTimeout(600);
  await expectBeat(page, "1/random");
  await clickContinue(page);
  await page.locator("#prompt").waitFor({ state: "visible", timeout: 15000 });
  await page.keyboard.press("Enter"); // fallback: measures 20,000 for the user
  await page.waitForTimeout(2600);
  await expectBeat(page, "1/pattern");
  await shot(page, "19-phone-pattern");
  await page.close();
}

if (want("tour")) {
  const page = await open("#ch2", PHONE);
  await page.locator("#begin-btn").click();
  await clickContinue(page);
  await page.locator("#prompt").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(600);
  await shot(page, "28-phone-ch2-tune");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.__hydrogen.story.current.id === "level-2", null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  await shot(page, "29-phone-ch2-level2");
  await page.close();
}

if (want("tour")) {
  const page = await open("#ch3", PHONE);
  await page.locator("#begin-btn").click();
  await page.locator("#prompt").waitFor({ state: "visible", timeout: 15000 });
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.__hydrogen.story.current.id === "lobes", null, { timeout: 20000 });
  await page.waitForTimeout(2000);
  await shot(page, "38-phone-ch3-lobes");
  await clickContinue(page);
  await clickContinue(page);
  await page.locator("#prompt").waitFor({ state: "visible", timeout: 15000 });
  await shot(page, "39-phone-ch3-aim");
  await page.close();
}

// ---------------------------------------------------------------- the lab (the default page)
if (want("lab")) {
  const page = await open("");
  await page.waitForTimeout(1200);
  if (await page.evaluate(() => document.getElementById("lab-ui").hidden)) errors.push("/ should open the lab");
  const st = () => page.evaluate(() => ({ ...window.__hydrogen.lab.atom.state }));
  const idle = () => page.waitForFunction(() => !window.__hydrogen.lab.atom.busy, null, { timeout: 30000 });
  const tab = (t) => page.locator(`#lab-tabs button[data-tool="${t}"]`).click();
  const rung = (n) => page.locator(n ? `#lab-ladder .rung-hit[data-n="${n}"]` : "#lab-ladder rect.rung-hit:not([data-n])").click();
  const feed = () => page.locator("#feed-text").textContent();
  const expectState = async (want, label) => {
    const got = await st();
    if (JSON.stringify(got) !== JSON.stringify(want)) errors.push(`${label}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
  };

  // measure: the first cloud is built by tapping
  for (let i = 0; i < 10; i++) { await page.locator("#lab-measure-btn").click(); await page.waitForTimeout(60); }
  await page.waitForTimeout(400);
  await shot(page, "40-lab-measure");

  // one twisted photon at the level-2 rung → 2p, m = +1 (a swirling ring)
  await tab("light");
  await page.locator('#photon-twist button[data-v="1"]').click();
  await rung(2);
  await page.locator("#lab-fire").click();
  await page.waitForTimeout(1900);
  await shot(page, "41-lab-twisted-absorption");
  await idle();
  await expectState({ n: 2, l: 1, m: 1 }, "1s + ⟲ photon at 10.2 eV");
  await page.waitForTimeout(1200);
  await shot(page, "42-lab-2p-swirl");

  // let go: Lyman-α, carrying the twist away
  await page.locator("#letgo-btn").click();
  await page.waitForFunction(() => window.__hydrogen.lab.atom.state.n === 1 && !window.__hydrogen.lab.atom.busy, null, { timeout: 30000 });
  const lines = await page.evaluate(() => [...window.__hydrogen.lab.spectrum.lines.values()].map((l) => +l.nm.toFixed(1)));
  if (!lines.includes(121.6)) errors.push(`2p → 1s should emit 121.6 nm: ${lines}`);

  // two photons with cancelling twists at the level-2 rung → 2s (still round)
  await page.locator('#photon-count button[data-v="2"]').click();
  await rung(2);
  await page.locator("#lab-fire").click();
  await idle();
  await expectState({ n: 2, l: 0, m: 0 }, "two cancelling photons at 2 × 5.1 eV");
  await page.waitForTimeout(800);
  await shot(page, "43-lab-2s");
  await page.locator("#letgo-btn").click();
  await page.waitForFunction(() => window.__hydrogen.lab.atom.state.n === 1 && !window.__hydrogen.lab.atom.busy, null, { timeout: 30000 });

  // two photons twisting the same way can't reach level 2 (no d there): blocked
  await page.locator('#photon-twist button[data-v="2"]').click();
  await rung(2);
  await page.locator("#lab-fire").click();
  await idle();
  await expectState({ n: 1, l: 0, m: 0 }, "blocked two-photon");
  if (!(await feed()).includes("nothing was absorbed")) errors.push(`blocked: feed says "${await feed()}"`);

  // the wrong energy passes straight through
  await page.evaluate(() => window.__hydrogen.lab.atom.fire({ count: 1, twist: 0, eV: 9.5 }));
  await idle();
  if (!(await feed()).includes("passed straight through")) errors.push(`miss: feed says "${await feed()}"`);

  // enough energy frees the electron; then bring one back
  await page.locator('#photon-count button[data-v="1"]').click();
  await rung(0);
  await page.locator("#lab-fire").click();
  await idle();
  if (!(await st()).ionized) errors.push("aiming above 0 eV should ionize");
  await shot(page, "44-lab-ionized");
  await page.locator("#recapture-btn").click();
  await page.waitForTimeout(1500);
  await expectState({ n: 1, l: 0, m: 0 }, "recapture");

  // with a magnetic field, the ⟲ photon needs a little more energy: aim, fire, land in m = +1
  await tab("magnet");
  await page.locator("#field-b").fill("1.5");
  await page.locator("#field-b").dispatchEvent("change");
  await tab("light");
  await page.locator('#photon-twist button[data-v="1"]').click();
  await rung(2);
  await page.waitForTimeout(400);
  await shot(page, "45-lab-zeeman-ladder");
  await page.locator("#lab-fire").click();
  await idle();
  await expectState({ n: 2, l: 1, m: 1 }, "Zeeman-shifted ⟲ absorption");

  // the feed's ⓘ explains it, with maths
  await page.locator("#feed-info").click();
  await page.waitForFunction(() => document.querySelector("#info-physics math"), null, { timeout: 15000 });
  await page.waitForTimeout(500);
  await shot(page, "46-lab-info");
  await page.locator("#info-close").click();

  // view: jump to 3d, show nodes
  await tab("view");
  await page.locator('#view-picker .cell[data-n="3"][data-l="2"]').click();
  await page.locator("#view-nodes").check();
  await page.waitForTimeout(1800);
  await shot(page, "47-lab-view-3d");

  // scale: zoom out a million times
  await tab("scale");
  await page.locator("#scale-k").fill("6");
  await page.locator("#scale-k").dispatchEvent("change");
  await page.waitForTimeout(600);
  await shot(page, "48-lab-scale");

  const found = await page.evaluate(() => [...window.__hydrogen.lab.discoveries.done]);
  for (const id of ["measure-10", "absorb", "swirl", "round", "blocked", "miss", "emit", "ionize", "zeeman", "scale"])
    if (!found.includes(id)) errors.push(`discovery "${id}" was not ticked (have: ${found})`);
  await page.locator("#try-toggle").click();
  await page.waitForTimeout(300);
  await shot(page, "49-lab-things-to-try");
  await page.close();
}
if (want("lab")) {
  const page = await open("", PHONE);
  await page.waitForTimeout(1200);
  for (let i = 0; i < 6; i++) { await page.locator("#lab-measure-btn").click(); await page.waitForTimeout(60); }
  await shot(page, "50-phone-lab-measure");
  await page.locator('#lab-tabs button[data-tool="light"]').click();
  await page.locator('#photon-twist button[data-v="-1"]').click();
  await page.locator("#lab-fire").click();
  await page.waitForFunction(() => !window.__hydrogen.lab.atom.busy, null, { timeout: 30000 });
  const s = await page.evaluate(() => ({ ...window.__hydrogen.lab.atom.state }));
  if (s.m !== -1) errors.push(`phone: ⟳ photon should give m = −1, got ${JSON.stringify(s)}`);
  await page.waitForTimeout(800);
  await shot(page, "51-phone-lab-light");
  await page.locator('#lab-tabs button[data-tool="light"]').click(); // tap the active tab: collapse the sheet
  await page.waitForTimeout(800);
  await shot(page, "52-phone-lab-collapsed");
  await page.close();
}

await browser.close();
server.close();
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("ok: lab (measure, light, twist, two photons, blocked, miss, ionize, magnet, info, view, scale, discoveries), tour (prologue, chapters 1–3), drawer, glossary, menu, resume, deep links and phone layout checked; screenshots in tests/screenshots/");
