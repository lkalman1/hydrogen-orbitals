// Pure helpers for Chapter 1's measurements (no DOM, no three.js), unit-tested.

/** Exact radial probability density of 1s: P(r) = 4 r² e^(−2r)  (r in a₀). */
export const radial1s = (r) => 4 * r * r * Math.exp(-2 * r);

/**
 * Measurements per second while Measure is held for t seconds: starts at a few per
 * second (each dot visible), grows exponentially, and is capped.
 */
export const RAMP = { start: 2, growth: 1.7, max: 15000 };
export const rampRate = (t) => Math.min(RAMP.max, RAMP.start * Math.exp(RAMP.growth * Math.max(0, t)));

/** Total measurements after holding for t seconds (integral of rampRate). */
export function rampTotal(t) {
  const { start, growth, max } = RAMP;
  const tCap = Math.log(max / start) / growth;
  if (t <= tCap) return (start / growth) * (Math.exp(growth * t) - 1);
  return (start / growth) * (Math.exp(growth * tCap) - 1) + max * (t - tCap);
}

/**
 * How much to enlarge/brighten dots while there are only a few (1 → ~0.9, 100 → ~0.5,
 * 20,000 → 0), so single measurements are easy to see and the full cloud isn't blown out.
 */
export const sparseness = (count) => Math.min(1, Math.max(0, 1 - Math.log10(1 + count) / 4.3));

/** Running histogram of distances, normalised to a probability density. */
export class RadialHistogram {
  constructor({ bins = 40, rMax = 6 } = {}) {
    this.bins = bins;
    this.rMax = rMax;
    this.width = rMax / bins;
    this.counts = new Float64Array(bins);
    this.total = 0;
    this.sum = 0;
  }
  reset() { this.counts.fill(0); this.total = 0; this.sum = 0; }

  /** Change the distance range (clears the histogram). */
  setRange(rMax) {
    this.rMax = rMax;
    this.width = rMax / this.bins;
    this.reset();
  }
  add(r) {
    this.total++;
    this.sum += r;
    const i = Math.floor(r / this.width);
    if (i < this.bins) this.counts[i]++;
  }
  /** Density in bin i: counts / (N · Δr), comparable to P(r). */
  density(i) { return this.total ? this.counts[i] / (this.total * this.width) : 0; }
  get mean() { return this.total ? this.sum / this.total : 0; }
  /** Centre (a₀) of the fullest bin. */
  get mode() {
    let best = 0;
    for (let i = 1; i < this.bins; i++) if (this.counts[i] > this.counts[best]) best = i;
    return (best + 0.5) * this.width;
  }
}
