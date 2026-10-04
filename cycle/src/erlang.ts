/**
 * Erlang C and Erlang A (M/M/n+M) for one interval. Daily figures are built by spreading the day
 * over an intraday profile and aggregating hour by hour (the cycle itself stays daily; IEX
 * normalizes intervals in real life — this is only how the synthetic outcomes are produced).
 */
/** Erlang B by the standard recursion B(n) = a·B(n−1) / (n + a·B(n−1)); exact and O(n). */
export function erlangB(a: number, n: number): number { let b = 1; for (let k = 1; k <= n; k++) b = (a * b) / (k + a * b); return b; }
const cFromB = (a: number, n: number, b: number) => (n <= a ? 1 : (n * b) / (n - a * (1 - b)));

/** Erlang C probability of waiting. a = offered load in Erlangs, n = agents. */
export function erlangCWait(a: number, n: number): number { return n <= a ? 1 : cFromB(a, n, erlangB(a, n)); }

/** Erlang C service level: share answered within t seconds. */
export function erlangCSL(a: number, n: number, ahtSec: number, tSec: number): number {
  if (n <= a) return 0;
  return 1 - erlangCWait(a, n) * Math.exp(-(n - a) * (tSec / ahtSec));
}
export function erlangCASA(a: number, n: number, ahtSec: number): number {
  if (n <= a) return Infinity;
  return (erlangCWait(a, n) * ahtSec) / (n - a);
}

/** Agents needed (Erlang C) to reach target SL; fractional by interpolation for smooth daily FTE. Single pass over n. */
export function agentsFor(a: number, ahtSec: number, target: number, tSec: number): number {
  if (a <= 0) return 0;
  let b = 1, prevSL = 0;
  for (let n = 1; n < 5000; n++) {
    b = (a * b) / (n + a * b);
    if (n <= a) continue;
    const sl = 1 - cFromB(a, n, b) * Math.exp(-(n - a) * (tSec / ahtSec));
    if (sl >= target) return n - 1 + Math.min(1, Math.max(0, (target - prevSL) / Math.max(sl - prevSL, 1e-9)));
    prevSL = sl;
  }
  return 5000;
}

/**
 * Erlang A (abandonment), by birth-death balance on a truncated state space. Returns SL within t,
 * abandon share and ASA (of answered). patienceSec = mean patience. Fractional agents rounded.
 */
export function erlangA(lambdaPerSec: number, ahtSec: number, nAgents: number, patienceSec: number, tSec: number) {
  const n = Math.max(0, Math.round(nAgents)); const mu = 1 / ahtSec, th = 1 / patienceSec;
  if (lambdaPerSec <= 0) return { sl: 1, abandon: 0, asa: 0 };
  if (n === 0) return { sl: 0, abandon: 1, asa: Infinity };
  const K = n + Math.ceil(lambdaPerSec / th) * 4 + 200;
  const logp: number[] = [0];
  for (let k = 1; k <= K; k++) { const death = Math.min(k, n) * mu + Math.max(0, k - n) * th; logp[k] = logp[k - 1]! + Math.log(lambdaPerSec) - Math.log(death); }
  const m = Math.max(...logp); const p = logp.map((x) => Math.exp(x - m)); const Z = p.reduce((s, x) => s + x, 0);
  for (let k = 0; k <= K; k++) p[k]! /= Z;
  let served = 0, slNum = 0, waitNum = 0;
  // an arrival that finds k ≥ n waits for k−n+1 departures at rate n·mu + j·theta; approximate its wait as exponential with that rate
  for (let k = 0; k <= K; k++) {
    const pk = p[k]!;
    if (k < n) { served += pk; slNum += pk; continue; }
    const j = k - n; // people ahead in queue
    // probability of being served before abandoning, and wait to service, in the M/M/n+M approximation
    const rate = n * mu + (j + 1) * th; // combined exit rate while waiting, coarse
    const pServe = (n * mu) / rate;
    const meanWait = (j + 1) / (n * mu + j * th);
    const pWithin = 1 - Math.exp(-tSec / meanWait);
    served += pk * pServe; slNum += pk * pServe * pWithin; waitNum += pk * pServe * meanWait;
  }
  return { sl: Math.min(1, slNum), abandon: Math.max(0, 1 - served), asa: served > 0 ? waitNum / served : 0 };
}
