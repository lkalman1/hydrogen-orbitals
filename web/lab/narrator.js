// "What just happened": a plain-words sentence for every lab event, with glossary
// terms marked [[like this]] and an ⓘ key pointing at the explanation.

import { L_LETTERS } from "../physics.js";
import { describeNm, regionOf } from "../spectroscopy.js";

export const stateName = (s) => (s.ionized ? "a free electron" : `${s.n}${L_LETTERS[s.l]}`);
export const mText = (m) => (m > 0 ? `+${m}` : `${m}`);
const swirlWord = (m) => (m === 0 ? "doesn't swirl" : m > 0 ? "swirls ⟲" : "swirls ⟳");
const photons = (light) => (light.count === 2 ? `two photons (${light.eV.toFixed(2)} eV each)` : `a [[photon]] of ${light.eV.toFixed(2)} eV`);

export function narrate(e) {
  const { type } = e;
  if (type === "miss") {
    return { text: `${cap(photons(e.light))} passed straight through: ${(e.light.count * e.light.eV).toFixed(2)} eV doesn't match any step up from ${stateName(e.from)}.`, info: "light" };
  }
  if (type === "blocked") {
    return { text: `The energy matched level ${e.result.n}, but nothing was absorbed: ${e.result.reason}.`, info: e.light.count === 2 ? "photons" : "twist" };
  }
  if (type === "ionize") {
    return { text: `${cap(photons(e.light))} carried more than the ${(-e.fromEnergy).toFixed(2)} eV holding the electron: it escaped. The atom is ionized.`, info: "light", physics: "ionization" };
  }
  if (type === "absorb") {
    const { from, light } = e, to = e.result.to;
    let why;
    if (light.count === 2 && to.l === from.l) why = "Their twists cancelled, so the shape stayed the same.";
    else if (light.count === 2) why = `Their twists added up, so l changed by 2 and m by ${mText(to.m - from.m)}.`;
    else if (light.twist !== 0) why = `The photon's twist went into the electron: l ${from.l} → ${to.l}, and now m = ${mText(to.m)}, so it ${swirlWord(to.m)}.`;
    else why = `One photon always changes the shape by one step (l ${from.l} → ${to.l}). Untwisted light leaves m = ${mText(to.m)}.`;
    const alt = e.result.options.length > 1 ? ` (It could also have become ${e.result.options.filter((o) => o.to.l !== to.l).map((o) => `${stateName(o.to)}, ${(o.odds * 100).toFixed(0)}% chance`).join(" or ")}.)` : "";
    return { text: `Absorbed ${photons(light)}: the electron jumped from ${stateName(from)} up to ${stateName(to)}. ${why}${alt}`, info: light.count === 2 ? "photons" : light.twist ? "twist" : "light" };
  }
  if (type === "emit") {
    const d = e.decay;
    if (d.twoPhoton) return { text: `${stateName(e.from)} can't drop with one photon, so it gave off two at once (sharing ${d.eV.toFixed(2)} eV) and fell to ${stateName(d.to)}.`, info: "letgo" };
    const region = regionOf(d.nm);
    const seen = region === "visible" ? "light you could see" : `${region} light (invisible to us)`;
    return { text: `Dropped from ${stateName(e.from)} to ${stateName(d.to)}, giving off ${seen}: ${describeNm(d.nm)}.${d.twist ? ` The photon carried away a twist of ${mText(d.twist)}.` : ""}`, info: "letgo" };
  }
  if (type === "ground") return { text: "Back in 1s, the lowest rung. From here the atom can only go up.", info: "letgo" };
  if (type === "recapture") return { text: "A new electron was captured and settled into 1s.", info: "light", physics: "ionization" };
  if (type === "field") return e.B > 0
    ? { text: `Magnetic field ${e.B.toFixed(2)} T: clouds swirling ⟲ and ⟳ now have different energies, so the rungs split.`, info: "magnet" }
    : { text: "Magnetic field off: all swirl directions have the same energy again.", info: "magnet" };
  if (type === "jump") return { text: `Jumped to ${stateName(e.state)}: n = ${e.state.n}, l = ${e.state.l} (${L_LETTERS[e.state.l]}), m = ${mText(e.state.m)}.`, info: "state" };
  if (type === "measured") return { text: e.count === 1 ? "Found the electron! Measure again: it won't be in the same place." : `${e.count.toLocaleString()} measurements so far. The cloud is where they land.`, info: "measure" };
  if (type === "scale") return { text: e.text, info: "scale" };
  return null;
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);
