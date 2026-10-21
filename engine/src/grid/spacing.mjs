// 1D node spacing for the rectilinear package grid (SPEC section 3, DevLog-012 lane L1).
// In-plane: graded spacing between fixed breakpoints (every box face lies on a node). Size field
// h(x) = min(H, min_j (c_j + s |x - b_j|)) with s = ln(g) (consecutive cells of one interval then differ by at most
// g), caps c_j = shortest interval adjacent to breakpoint j, Lipschitz-closed so that only the two end cones of an
// interval matter; each interval gets n = ceil(integral dx / h) cells placed by equidistribution of the integral
// (closed form, no sampling). Breakpoints where the achieved neighbour ratio still exceeds g get their cap lowered
// and the spacing is rebuilt (caps only decrease, so the loop terminates).
// License: GPL-3.0-or-later.

/**
 * Sort and merge coordinates closer than tol (the first of a cluster is kept).
 * @param {number[]} vals
 * @param {number} tol
 * @returns {number[]}
 */
export function mergeBreakpoints(vals, tol) {
  const s = [...vals].sort((a, b) => a - b);
  const out = [];
  for (const v of s) if (!out.length || v - out[out.length - 1] > tol) out.push(v);
  return out;
}

/**
 * Cluster sorted coordinates into groups spanning <= tol (complete linkage) and pick one representative per cluster: a value from
 * `keep` (domain bounds, crop planes) when the cluster contains one, else the most frequent value, else the mean.
 * @param {number[]} vals face coordinates (any order, duplicates allowed)
 * @param {number} tol
 * @param {number[]} [keep]
 * @returns {{values: number[], snap: (v: number) => number, maxShift: number, nSnapped: number}}
 */
export function snapClusters(vals, tol, keep = []) {
  const s = [...vals].sort((a, b) => a - b);
  const clusters = [];
  for (const v of s) {
    const c = clusters[clusters.length - 1];
    // complete linkage (audit A1 S6): a cluster spans at most tol, so no face moves by more than tol
    if (c && v - c.lo <= tol) {
      c.hi = v;
      c.members.push(v);
    } else clusters.push({ lo: v, hi: v, members: [v] });
  }
  let maxShift = 0, nSnapped = 0;
  for (const c of clusters) {
    const k = keep.find((x) => x >= c.lo - tol * 1e-6 && x <= c.hi + tol * 1e-6);
    if (k !== undefined) c.rep = k;
    else {
      const cnt = new Map();
      for (const m of c.members) cnt.set(m, (cnt.get(m) ?? 0) + 1);
      let best = null, bn = 0, tie = false;
      for (const [m, n] of cnt) {
        if (n > bn) { best = m; bn = n; tie = false; } else if (n === bn) tie = true;
      }
      c.rep = tie ? c.members.reduce((a, b) => a + b, 0) / c.members.length : best;
    }
    for (const m of c.members) {
      const d = Math.abs(m - c.rep);
      if (d <= 1e-12) continue; // unit-conversion round-off
      nSnapped++;
      if (d > maxShift) maxShift = d;
    }
  }
  const snap = (v) => {
    let lo = 0, hi = clusters.length - 1;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (clusters[m].lo <= v + tol * 1e-6) lo = m;
      else hi = m - 1;
    }
    const c = clusters[lo];
    if (v < c.lo - tol * 1e-6 || v > c.hi + tol * 1e-6) throw new Error(`grid: internal: coordinate ${v} is not a breakpoint`);
    return c.rep;
  };
  return { values: clusters.map((c) => c.rep), snap, maxShift, nSnapped };
}

/** Nodes of one interval [0, L] for the size field min(H, ca + s t, cb + s (L - t)); returns interior offsets. */
function intervalNodes(L, ca, cb, H, s) {
  // pieces: rising [0, t1], constant [t1, t2], falling [t2, L]
  let t1 = (H - ca) / s, t2 = L - (H - cb) / s;
  if (!(t1 < t2)) {
    const ts = Math.min(L, Math.max(0, (cb - ca + s * L) / (2 * s)));
    t1 = ts;
    t2 = ts;
  }
  t1 = Math.min(Math.max(t1, 0), L);
  t2 = Math.min(Math.max(t2, t1), L);
  const I1 = Math.log((ca + s * t1) / ca) / s;
  const I2 = I1 + (t2 - t1) / H;
  const hb2 = cb + s * (L - t2);
  const I3 = I2 + Math.log(hb2 / cb) / s;
  const n = Math.max(1, Math.ceil(I3 - 1e-9));
  const out = [];
  for (let q = 1; q < n; q++) {
    const I = (q * I3) / n;
    let t;
    if (I <= I1) t = (ca * Math.exp(s * I) - ca) / s;
    else if (I <= I2) t = t1 + (I - I1) * H;
    else t = L - (hb2 * Math.exp(-s * (I - I2)) - cb) / s;
    out.push(t);
  }
  return out;
}

/**
 * Graded node coordinates through sorted breakpoints.
 * @param {number[]} bps sorted, merged breakpoints (at least 2)
 * @param {number} H maximum cell size
 * @param {number} g maximum neighbour size ratio (> 1)
 * @param {{maxIter?: number}} [opt]
 * @returns {{nodes: Float64Array, bpIndex: Int32Array, ratio: number, iterations: number}}
 *   bpIndex[j] = node index of breakpoint j; ratio = achieved max neighbour ratio.
 */
export function gradedNodes(bps, H, g, { maxIter = 60 } = {}) {
  if (!(bps.length >= 2)) throw new Error('grid: need at least two breakpoints per axis');
  if (!(g > 1)) throw new Error(`grid: mesh.grading must be > 1 (got ${g})`);
  if (!(H > 0)) throw new Error(`grid: mesh.max_xy_mm must be > 0 (got ${H})`);
  const s = Math.log(g);
  const m = bps.length - 1;
  const L = new Float64Array(m);
  for (let i = 0; i < m; i++) L[i] = bps[i + 1] - bps[i];
  const cap = new Float64Array(m + 1);
  for (let j = 0; j <= m; j++) cap[j] = Math.min(H, j > 0 ? L[j - 1] : Infinity, j < m ? L[j] : Infinity);
  let result = null;
  for (let it = 0; it < maxIter; it++) {
    // Lipschitz closure of the caps (forward and backward pass)
    for (let j = 1; j <= m; j++) cap[j] = Math.min(cap[j], cap[j - 1] + s * L[j - 1]);
    for (let j = m - 1; j >= 0; j--) cap[j] = Math.min(cap[j], cap[j + 1] + s * L[j]);
    const nodes = [bps[0]];
    const bpIndex = new Int32Array(m + 1);
    for (let i = 0; i < m; i++) {
      for (const t of intervalNodes(L[i], cap[i], cap[i + 1], H, s)) nodes.push(bps[i] + t);
      nodes.push(bps[i + 1]);
      bpIndex[i + 1] = nodes.length - 1;
    }
    const xs = Float64Array.from(nodes);
    // achieved ratio, and breakpoints that violate it
    let ratio = 1, bad = 0;
    for (let q = 1; q + 1 < xs.length; q++) {
      const a = xs[q] - xs[q - 1], b = xs[q + 1] - xs[q];
      const r = a > b ? a / b : b / a;
      if (r > ratio) ratio = r;
    }
    for (let j = 1; j < m; j++) {
      const q = bpIndex[j];
      const a = xs[q] - xs[q - 1], b = xs[q + 1] - xs[q];
      if (Math.max(a, b) > g * Math.min(a, b) * (1 + 1e-12)) {
        cap[j] = Math.min(cap[j], 0.999 * Math.min(a, b));
        bad++;
      }
    }
    result = { nodes: xs, bpIndex, ratio, iterations: it + 1 };
    if (!bad) break;
  }
  return result;
}

/**
 * z nodes: each interval gets ceil(L / maxZ) uniform cells (1 when maxZ is null), then every [k0, k1) range in
 * `minRanges` (breakpoint indices of one part) gets at least `minCells` cells by splitting its coarsest intervals.
 * @param {number[]} bps sorted, merged breakpoints
 * @param {number|null} maxZ
 * @param {number} minCells
 * @param {Array<[number, number]>} minRanges
 * @returns {{nodes: Float64Array, bpIndex: Int32Array}}
 */
export function layeredNodes(bps, maxZ, minCells, minRanges) {
  const m = bps.length - 1;
  const L = new Float64Array(m);
  const n = new Int32Array(m);
  for (let i = 0; i < m; i++) {
    L[i] = bps[i + 1] - bps[i];
    n[i] = maxZ ? Math.max(1, Math.ceil(L[i] / maxZ - 1e-9)) : 1;
  }
  for (const [b0, b1] of minRanges) {
    let count = 0;
    for (let i = b0; i < b1; i++) count += n[i];
    while (count < minCells) {
      let best = b0;
      for (let i = b0; i < b1; i++) if (L[i] / n[i] > L[best] / n[best]) best = i;
      n[best]++;
      count++;
    }
  }
  const nodes = [bps[0]];
  const bpIndex = new Int32Array(m + 1);
  for (let i = 0; i < m; i++) {
    for (let q = 1; q < n[i]; q++) nodes.push(bps[i] + (q * L[i]) / n[i]);
    nodes.push(bps[i + 1]);
    bpIndex[i + 1] = nodes.length - 1;
  }
  return { nodes: Float64Array.from(nodes), bpIndex };
}
