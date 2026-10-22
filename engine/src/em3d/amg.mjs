// STATUS (2026-10-22): used only by ams.mjs (not wired); standalone 3D Laplacian check: PCG 10-19 iterations.
// Smoothed-aggregation algebraic multigrid for real symmetric positive definite CSR matrices (lane L22, DevLog-014
// P7), used on the nodal auxiliary problems of the AMS preconditioner (ams.mjs). Standard construction (Vanek, Mandel,
// Brezina 1996): strength of connection |a_ij| > theta sqrt(a_ii a_jj); greedy aggregation (root aggregates, then
// attachment to a strongly connected aggregate, then leftovers); tentative prolongator from the constant vector;
// prolongator smoothing P = (I - omega D^-1 A) T with omega = 4 / (3 rho(D^-1 A)); Galerkin A_c = P^T A P; symmetric
// Gauss-Seidel V-cycle; dense Cholesky on the coarsest level. License: GPL-3.0-or-later.

const fail = (m) => {
  throw new Error(`em3d amg: ${m}`);
};

/** Transpose of a CSR matrix {n (rows), m (cols), rowptr, colidx, val}. */
export function csrTranspose(A) {
  const m = A.m ?? A.n;
  const cnt = new Int32Array(m + 1);
  for (let q = 0; q < A.rowptr[A.n]; q++) cnt[A.colidx[q] + 1]++;
  for (let i = 0; i < m; i++) cnt[i + 1] += cnt[i];
  const col = new Int32Array(A.rowptr[A.n]),
    val = new Float64Array(A.rowptr[A.n]);
  const fill = cnt.slice(0, m);
  for (let i = 0; i < A.n; i++)
    for (let q = A.rowptr[i]; q < A.rowptr[i + 1]; q++) {
      const j = A.colidx[q];
      col[fill[j]] = i;
      val[fill[j]++] = A.val[q];
    }
  return { n: m, m: A.n, rowptr: cnt, colidx: col, val };
}

/** C = A B (CSR, real), rows sorted. */
export function csrMatMat(A, B) {
  const m = B.m ?? B.n;
  const acc = new Float64Array(m);
  const mark = new Int32Array(m).fill(-1);
  const rowptr = new Int32Array(A.n + 1);
  const cols = [],
    vals = [];
  const row = [];
  for (let i = 0; i < A.n; i++) {
    row.length = 0;
    for (let p = A.rowptr[i]; p < A.rowptr[i + 1]; p++) {
      const k = A.colidx[p],
        a = A.val[p];
      for (let q = B.rowptr[k]; q < B.rowptr[k + 1]; q++) {
        const j = B.colidx[q];
        if (mark[j] !== i) {
          mark[j] = i;
          acc[j] = 0;
          row.push(j);
        }
        acc[j] += a * B.val[q];
      }
    }
    row.sort((x, y) => x - y);
    for (const j of row) {
      cols.push(j);
      vals.push(acc[j]);
    }
    rowptr[i + 1] = cols.length;
  }
  return { n: A.n, m, rowptr, colidx: Int32Array.from(cols), val: Float64Array.from(vals) };
}

function diagOf(A) {
  const d = new Float64Array(A.n);
  for (let i = 0; i < A.n; i++)
    for (let q = A.rowptr[i]; q < A.rowptr[i + 1]; q++)
      if (A.colidx[q] === i) {
        d[i] = A.val[q];
        break;
      }
  return d;
}

function spmv(A, x, y) {
  for (let i = 0; i < A.n; i++) {
    let s = 0;
    for (let q = A.rowptr[i]; q < A.rowptr[i + 1]; q++) s += A.val[q] * x[A.colidx[q]];
    y[i] = s;
  }
}

/** Aggregates of the strength graph: returns {agg (Int32Array, aggregate id per node), nAgg}. */
function aggregate(A, d, theta) {
  const n = A.n;
  const agg = new Int32Array(n).fill(-1);
  const strong = (i, q) => {
    const j = A.colidx[q];
    return j !== i && Math.abs(A.val[q]) > theta * Math.sqrt(Math.abs(d[i] * d[j]));
  };
  let nAgg = 0;
  // phase 1: roots whose strong neighbourhood is free
  for (let i = 0; i < n; i++) {
    if (agg[i] >= 0) continue;
    let ok = true,
      has = false;
    for (let q = A.rowptr[i]; q < A.rowptr[i + 1]; q++)
      if (strong(i, q)) {
        has = true;
        if (agg[A.colidx[q]] >= 0) {
          ok = false;
          break;
        }
      }
    if (!ok) continue;
    agg[i] = nAgg;
    if (has) for (let q = A.rowptr[i]; q < A.rowptr[i + 1]; q++) if (strong(i, q)) agg[A.colidx[q]] = nAgg;
    nAgg++;
  }
  // phase 2: attach to the strongest connected aggregate
  const agg2 = agg.slice();
  for (let i = 0; i < n; i++) {
    if (agg[i] >= 0) continue;
    let best = -1,
      bv = 0;
    for (let q = A.rowptr[i]; q < A.rowptr[i + 1]; q++)
      if (strong(i, q) && agg[A.colidx[q]] >= 0 && Math.abs(A.val[q]) > bv) {
        bv = Math.abs(A.val[q]);
        best = agg[A.colidx[q]];
      }
    if (best >= 0) agg2[i] = best;
  }
  // phase 3: leftovers form aggregates with their free strong neighbours
  for (let i = 0; i < n; i++) {
    if (agg2[i] >= 0) continue;
    agg2[i] = nAgg;
    for (let q = A.rowptr[i]; q < A.rowptr[i + 1]; q++) if (strong(i, q) && agg2[A.colidx[q]] < 0) agg2[A.colidx[q]] = nAgg;
    nAgg++;
  }
  return { agg: agg2, nAgg };
}

/** Dense Cholesky of a small SPD CSR matrix; returns solve(b, x). */
function denseCholesky(A) {
  const n = A.n;
  const L = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let q = A.rowptr[i]; q < A.rowptr[i + 1]; q++) L[i * n + A.colidx[q]] = A.val[q];
  for (let j = 0; j < n; j++) {
    let s = L[j * n + j];
    for (let k = 0; k < j; k++) s -= L[j * n + k] * L[j * n + k];
    if (!(s > 0)) s = Math.max(Math.abs(L[j * n + j]) * 1e-12, 1e-300); // semidefinite guard
    const r = Math.sqrt(s);
    L[j * n + j] = r;
    for (let i = j + 1; i < n; i++) {
      let t = L[i * n + j];
      for (let k = 0; k < j; k++) t -= L[i * n + k] * L[j * n + k];
      L[i * n + j] = t / r;
    }
  }
  return (b, x) => {
    for (let i = 0; i < n; i++) {
      let s = b[i];
      for (let k = 0; k < i; k++) s -= L[i * n + k] * x[k];
      x[i] = s / L[i * n + i];
    }
    for (let i = n - 1; i >= 0; i--) {
      let s = x[i];
      for (let k = i + 1; k < n; k++) s -= L[k * n + i] * x[k];
      x[i] = s / L[i * n + i];
    }
  };
}

/**
 * Build the hierarchy. A: real SPD CSR {n, rowptr, colidx, val}. Returns {levels, cycle(b, x)} where cycle applies one
 * V-cycle (x = M^-1 b, x overwritten).
 */
export function buildAMG(A, { theta = 0.08, coarseMax = 400, maxLevels = 20, sweeps = 1 } = {}) {
  const levels = [];
  let cur = { ...A, m: A.n };
  for (let l = 0; l < maxLevels; l++) {
    const d = diagOf(cur);
    for (let i = 0; i < cur.n; i++) if (!(d[i] > 0)) fail(`non-positive diagonal at level ${l}`);
    const lev = { A: cur, d };
    levels.push(lev);
    if (cur.n <= coarseMax) break;
    // strength threshold on the finest level only: Galerkin coarse operators are wide stencils whose entries all fall
    // below theta sqrt(a_ii a_jj) (3D Laplacian level 1: off-diagonal / diagonal ~ 1/27), which would stall aggregation
    const { agg, nAgg } = aggregate(cur, d, l === 0 ? theta : 0);
    if (nAgg >= cur.n * 0.9 || nAgg === 0) break; // aggregation stalled
    // tentative prolongator T (n x nAgg), unit columns
    const size = new Int32Array(nAgg);
    for (let i = 0; i < cur.n; i++) size[agg[i]]++;
    const T = { n: cur.n, m: nAgg, rowptr: Int32Array.from({ length: cur.n + 1 }, (_, i) => i), colidx: agg, val: Float64Array.from(agg, (a) => 1 / Math.sqrt(size[a])) };
    // rho(D^-1 A) by power iteration
    let v = Float64Array.from({ length: cur.n }, (_, i) => 1 + ((i * 7919) % 13) / 13);
    const w = new Float64Array(cur.n);
    let rho = 1;
    for (let it = 0; it < 12; it++) {
      spmv(cur, v, w);
      let nr = 0;
      for (let i = 0; i < cur.n; i++) {
        w[i] /= d[i];
        nr += w[i] * w[i];
      }
      nr = Math.sqrt(nr);
      let nv = 0;
      for (let i = 0; i < cur.n; i++) nv += v[i] * v[i];
      rho = nr / Math.sqrt(nv);
      for (let i = 0; i < cur.n; i++) v[i] = w[i] / nr;
    }
    const omega = 4 / (3 * rho);
    // P = T - omega D^-1 A T
    const AT = csrMatMat(cur, T);
    const rowptr = new Int32Array(cur.n + 1);
    const cols = [],
      vals = [];
    for (let i = 0; i < cur.n; i++) {
      const mp = new Map();
      for (let q = AT.rowptr[i]; q < AT.rowptr[i + 1]; q++) mp.set(AT.colidx[q], (-omega * AT.val[q]) / d[i]);
      mp.set(agg[i], (mp.get(agg[i]) ?? 0) + T.val[i]);
      const ks = [...mp.keys()].sort((x, y) => x - y);
      for (const k of ks) {
        cols.push(k);
        vals.push(mp.get(k));
      }
      rowptr[i + 1] = cols.length;
    }
    const P = { n: cur.n, m: nAgg, rowptr, colidx: Int32Array.from(cols), val: Float64Array.from(vals) };
    const PT = csrTranspose(P);
    lev.P = P;
    lev.PT = PT;
    const Ac = csrMatMat(PT, csrMatMat(cur, P));
    cur = { n: nAgg, m: nAgg, rowptr: Ac.rowptr, colidx: Ac.colidx, val: Ac.val };
  }
  const last = levels[levels.length - 1];
  // coarsest level: dense Cholesky up to 2000 unknowns, else (stalled coarsening) symmetric Gauss-Seidel sweeps
  if (last.A.n <= 2000) last.solve = denseCholesky(last.A);
  for (const lev of levels) {
    lev.r = new Float64Array(lev.A.n);
    lev.x = new Float64Array(lev.A.n);
    lev.b = new Float64Array(lev.A.n);
  }
  const gs = (lev, b, x, dir) => {
    const { A, d } = lev;
    const n = A.n;
    for (let s = 0; s < sweeps; s++)
      for (let k = 0; k < n; k++) {
        const i = dir > 0 ? k : n - 1 - k;
        let t = b[i];
        for (let q = A.rowptr[i]; q < A.rowptr[i + 1]; q++) {
          const j = A.colidx[q];
          if (j !== i) t -= A.val[q] * x[j];
        }
        x[i] = t / d[i];
      }
  };
  const vcycle = (l, b, x) => {
    const lev = levels[l];
    if (l === levels.length - 1) {
      if (lev.solve) return lev.solve(b, x);
      x.fill(0);
      for (let s = 0; s < 4; s++) {
        gs(lev, b, x, 1);
        gs(lev, b, x, -1);
      }
      return;
    }
    x.fill(0);
    gs(lev, b, x, 1);
    spmv(lev.A, x, lev.r);
    for (let i = 0; i < lev.A.n; i++) lev.r[i] = b[i] - lev.r[i];
    const nxt = levels[l + 1];
    spmv(lev.PT, lev.r, nxt.b);
    vcycle(l + 1, nxt.b, nxt.x);
    const P = lev.P;
    for (let i = 0; i < P.n; i++) {
      let s = 0;
      for (let q = P.rowptr[i]; q < P.rowptr[i + 1]; q++) s += P.val[q] * nxt.x[P.colidx[q]];
      x[i] += s;
    }
    gs(lev, b, x, -1);
  };
  return {
    levels: levels.map((l) => ({ n: l.A.n, nnz: l.A.rowptr[l.A.n] })),
    cycle: (b, x) => vcycle(0, b, x),
  };
}
