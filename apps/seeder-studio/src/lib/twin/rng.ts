// Mulberry32 — fast, good quality, single 32-bit state, easy to seed.
export function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller: two uniform draws → one standard normal.
function normalDraw(rng: () => number): number {
  const u1 = Math.max(Number.EPSILON, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Draw a Poisson-distributed integer with mean `lambda`.
 * - lambda <= 30: Knuth algorithm (exact).
 * - lambda > 30: normal approximation Poisson(λ) ≈ Normal(λ, √λ) (fast, accurate).
 */
export function poissonDraw(lambda: number, rng: () => number): number {
  if (lambda <= 0) return 0;
  if (lambda > 30) {
    return Math.max(
      0,
      Math.round(lambda + Math.sqrt(lambda) * normalDraw(rng)),
    );
  }
  // Knuth algorithm
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}
