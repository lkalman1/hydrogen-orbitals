// Rich text for the lab: glossary chips ([[term]]) and TeX maths (rendered to MathML
// by KaTeX, loaded on first use).

import { parseCaption } from "../story/ui.js";
import { GLOSSARY } from "../story/glossary.js";

const KATEX_URL = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.mjs";
let katexPromise = null;
const loadKatex = () => (katexPromise ??= import(KATEX_URL).then((m) => m.default).catch(() => null));

/** Fill el with text, turning [[term]] / [[term|shown]] into glossary chips. */
export function renderRich(el, text) {
  el.replaceChildren();
  for (const tok of parseCaption(text ?? "")) {
    if (!tok.term) { el.append(tok.text); continue; }
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "term";
    chip.dataset.term = tok.term;
    chip.textContent = tok.text;
    el.append(chip);
  }
}

/** Render every <tex> element inside root. */
export async function renderTex(root) {
  const nodes = [...root.querySelectorAll("tex")];
  if (!nodes.length) return;
  const katex = await loadKatex();
  for (const node of nodes) {
    const display = node.hasAttribute("display");
    const span = document.createElement("span");
    span.className = display ? "math display" : "math";
    if (katex) katex.render(node.textContent, span, { output: "mathml", displayMode: display, throwOnError: false });
    else span.append(Object.assign(document.createElement("code"), { textContent: node.textContent }));
    node.replaceWith(span);
  }
}

/** Show a glossary popover for a chip (one shared popover element). */
export function showTerm(chip, pop) {
  const term = chip.dataset.term;
  pop.replaceChildren(
    Object.assign(document.createElement("b"), { textContent: term[0].toUpperCase() + term.slice(1) }),
    Object.assign(document.createElement("p"), { textContent: GLOSSARY[term] ?? "" }),
  );
  pop.hidden = false;
  const r = chip.getBoundingClientRect();
  const w = Math.min(300, window.innerWidth - 24);
  pop.style.width = `${w}px`;
  pop.style.left = `${Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2))}px`;
  pop.style.top = `${r.top - 10}px`;
}
