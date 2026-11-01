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
await rm(OUT, { recursive: true, force: true });
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
{
  const page = await open();
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
  const measured = await page.evaluate(() => window.__hydrogen.measure.count);
  if (measured < 20000) errors.push(`hold: only ${measured} measurements`);
  await page.waitForTimeout(2600);
  await shot(page, "11-ch1-pattern");
  const stats = await page.evaluate(() => ({ mean: window.__hydrogen.measure.hist.mean, n: window.__hydrogen.measure.hist.total }));
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
  await expectBeat(page, "2/coming-soon");

  await page.locator("#menu-btn").click();
  await page.waitForTimeout(400);
  await shot(page, "14-menu");
  const locked = await page.locator(".menu-item:disabled").count();
  if (locked !== 3) errors.push(`menu: expected 3 locked chapters, got ${locked}`);
  await page.locator("#menu-sandbox").click();
  await page.waitForTimeout(1500);
  await shot(page, "15-sandbox-from-menu");
  if (await page.evaluate(() => document.getElementById("sandbox-ui").hidden)) errors.push("menu → sandbox did not open the sandbox");

  // back to the journey resumes where we were
  await page.locator("#journey-btn").click();
  await page.waitForTimeout(800);
  await expectBeat(page, "2/coming-soon");
  await page.close();
}

// ---------------------------------------------------------------- resume + deep links
{
  const page = await open();
  await page.evaluate(() => localStorage.setItem("hydrogen-journey-v1", JSON.stringify({ chapter: 2, beat: 0, unlocked: 2 })));
  await page.reload();
  await page.waitForFunction(() => window.__hydrogen?.ready);
  await page.locator("#resume-btn").waitFor({ state: "visible" });
  await page.locator("#resume-btn").click();
  await page.waitForTimeout(1500);
  await expectBeat(page, "2/coming-soon");
  await page.close();
}
{
  const page = await open("#n3l2m0");
  await page.waitForTimeout(1500);
  if (await page.evaluate(() => document.getElementById("sandbox-ui").hidden)) errors.push("#n3l2m0 should open the sandbox directly");
  await shot(page, "16-sandbox-deeplink");
  await page.close();
}

// ---------------------------------------------------------------- phone
{
  const page = await open("", PHONE);
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
{
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

await browser.close();
server.close();
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("ok: prologue, chapter 1 measuring, drawer, glossary, menu, resume, deep links and phone layout checked; screenshots in tests/screenshots/");
