/** Seeded PRNG (mulberry32) and the few distributions the world needs. Same seed → same world. */
export class Rng {
  private s: number;
  constructor(seed: number) { this.s = seed >>> 0; }
  next(): number { let t = (this.s += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  normal(mu = 0, sd = 1): number { const u = Math.max(this.next(), 1e-12), v = this.next(); return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  /** multiplicative noise with mean 1 and coefficient of variation cv */
  lognormal1(cv: number): number { const s2 = Math.log(1 + cv * cv); return Math.exp(this.normal(-s2 / 2, Math.sqrt(s2))); }
  /** Poisson count; normal approximation above 50 */
  poisson(lambda: number): number {
    if (lambda <= 0) return 0;
    if (lambda > 50) return Math.max(0, Math.round(this.normal(lambda, Math.sqrt(lambda))));
    let k = 0, p = 1; const L = Math.exp(-lambda); do { k++; p *= this.next(); } while (p > L); return k - 1;
  }
  /** Binomial count; exact below 30 trials, normal approximation above (clamped). */
  binomial(n: number, p: number): number {
    if (n <= 0 || p <= 0) return 0; if (p >= 1) return n;
    if (n < 30) { let k = 0; for (let i = 0; i < n; i++) if (this.next() < p) k++; return k; }
    return Math.min(n, Math.max(0, Math.round(this.normal(n * p, Math.sqrt(n * p * (1 - p))))));
  }
  pick<T>(xs: T[]): T { return xs[Math.floor(this.next() * xs.length)]!; }
  chance(p: number): boolean { return this.next() < p; }
}

/** A seed per stream (FNV-1a over the parts): each gate, channel and purpose draws from its own sequence,
 *  so extending the world in time never changes the past, and no two gates share a noise sequence. */
export function streamSeed(seed: number, ...parts: string[]): number {
  let h = 0x811c9dc5 ^ seed;
  for (const ch of parts.join("|")) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
