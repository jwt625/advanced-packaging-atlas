// Ported from eo-modulator-atlas engine/src/sparse.mjs at eb97f96 (GPL-3.0-or-later).
// Local changes: none (verbatim copy).
// Sparse symmetric linear algebra (DevLog-024): CSR patterns from triangle / element meshes, fill-reducing orderings
// (own approximate minimum degree, default; coordinate-bisection nested dissection kept), symbolic analysis
// (elimination tree, Gilbert-Ng-Peyton column counts, relaxed supernodes), supernodal multifrontal Cholesky with dense
// column-major fronts, and supernodal triangular solves. The pre-2026-10-14 up-looking Cholesky (after CSparse
// cs_chol) is kept as UpLookingCholesky (test oracle). Algorithms re-implemented from T. Davis, "Direct Methods for
// Sparse Linear Systems", SIAM 2006, and the cited papers.
// License: GPL-3.0-or-later.

/**
 * Opt-in timing sink. Set `timingSink.records = []` to collect one record per solver call
 * ({kind, ...timing}); null (default) collects nothing. Used by engine/bench; results never depend on it.
 */
export const timingSink = { records: null };

/** Push a timing record to the sink when collecting. */
export function recordTiming(kind, timing) {
  if (timingSink.records) timingSink.records.push({ kind, ...timing });
}

/**
 * Build symmetric CSR pattern (full storage, including diagonal) from triangle connectivity.
 * Counting sort into typed arrays; each row sorted ascending and unique.
 * @param {number} n
 * @param {Int32Array} tri
 */
export function buildPattern(n, tri) {
  const nt = tri.length / 3;
  // candidate entries per row: the diagonal plus 2 per incident triangle (duplicates removed below)
  const cap = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) cap[i + 1] = 1;
  for (let k = 0; k < 3 * nt; k++) cap[tri[k] + 1] += 2;
  for (let i = 0; i < n; i++) cap[i + 1] += cap[i];
  const buf = new Int32Array(cap[n]);
  const fill = cap.slice(0, n);
  for (let i = 0; i < n; i++) buf[fill[i]++] = i;
  for (let t = 0; t < nt; t++) {
    const a = tri[3 * t],
      b = tri[3 * t + 1],
      c = tri[3 * t + 2];
    buf[fill[a]++] = b;
    buf[fill[a]++] = c;
    buf[fill[b]++] = a;
    buf[fill[b]++] = c;
    buf[fill[c]++] = a;
    buf[fill[c]++] = b;
  }
  // sort each row (insertion sort, rows are short) and compact unique entries in place
  const rowptr = new Int32Array(n + 1);
  let nnz = 0;
  for (let i = 0; i < n; i++) {
    const p0 = cap[i],
      p1 = cap[i + 1];
    for (let p = p0 + 1; p < p1; p++) {
      const v = buf[p];
      let q = p - 1;
      while (q >= p0 && buf[q] > v) {
        buf[q + 1] = buf[q];
        q--;
      }
      buf[q + 1] = v;
    }
    for (let p = p0; p < p1; p++) if (p === p0 || buf[p] !== buf[p - 1]) buf[nnz++] = buf[p];
    rowptr[i + 1] = nnz;
  }
  const colidx = buf.slice(0, nnz);
  return { n, rowptr, colidx, nnz };
}

/**
 * Symmetric CSR pattern (full storage, sorted rows) of elements with k nodes each (counting sort, as buildPattern).
 * @param {number} n number of DOFs
 * @param {Int32Array} elem k DOF indices per element
 * @param {number} k nodes per element
 */
export function buildElementPattern(n, elem, k) {
  const ne = elem.length / k;
  const cap = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) cap[i + 1] = 1;
  for (let q = 0; q < elem.length; q++) cap[elem[q] + 1] += k - 1;
  for (let i = 0; i < n; i++) cap[i + 1] += cap[i];
  const buf = new Int32Array(cap[n]);
  const fill = cap.slice(0, n);
  for (let i = 0; i < n; i++) buf[fill[i]++] = i;
  for (let e = 0; e < ne; e++)
    for (let a = 0; a < k; a++) {
      const r = elem[k * e + a];
      for (let b = 0; b < k; b++) if (b !== a) buf[fill[r]++] = elem[k * e + b];
    }
  const rowptr = new Int32Array(n + 1);
  let nnz = 0;
  for (let i = 0; i < n; i++) {
    const p0 = cap[i],
      p1 = cap[i + 1];
    buf.subarray(p0, p1).sort();
    for (let p = p0; p < p1; p++) if (p === p0 || buf[p] !== buf[p - 1]) buf[nnz++] = buf[p];
    rowptr[i + 1] = nnz;
  }
  return { n, rowptr, colidx: buf.slice(0, nnz), nnz };
}

/** CSR slots of the k x k local entries of every element (row-major), cached on the pattern for that element array. */
export function elementSlots(pat, elem, k) {
  if (pat._elemSlots && pat._elemSlotsElem === elem) return pat._elemSlots;
  const ne = elem.length / k;
  const slots = new Int32Array(k * k * ne);
  for (let e = 0; e < ne; e++)
    for (let a = 0; a < k; a++) {
      const r = elem[k * e + a];
      for (let b = 0; b < k; b++) slots[k * k * e + k * a + b] = entryIndex(pat, r, elem[k * e + b]);
    }
  Object.defineProperty(pat, '_elemSlots', { value: slots, writable: true, configurable: true, enumerable: false });
  Object.defineProperty(pat, '_elemSlotsElem', { value: elem, writable: true, configurable: true, enumerable: false });
  return slots;
}

/**
 * CSR slot of every local (a, b) entry of every triangle (9 per triangle, row-major a, b), cached on the pattern for
 * the triangle array it was requested with.
 */
export function triangleSlots(pat, tri) {
  if (pat._triSlots && pat._triSlotsTri === tri) return pat._triSlots;
  const nt = tri.length / 3;
  const slots = new Int32Array(9 * nt);
  for (let t = 0; t < nt; t++)
    for (let a = 0; a < 3; a++) {
      const r = tri[3 * t + a];
      for (let b = 0; b < 3; b++) slots[9 * t + 3 * a + b] = entryIndex(pat, r, tri[3 * t + b]);
    }
  Object.defineProperty(pat, '_triSlots', { value: slots, writable: true, configurable: true, enumerable: false });
  Object.defineProperty(pat, '_triSlotsTri', { value: tri, writable: true, configurable: true, enumerable: false });
  return slots;
}

/** Index of entry (i,j) in CSR pattern (binary search). */
export function entryIndex(pat, i, j) {
  let lo = pat.rowptr[i],
    hi = pat.rowptr[i + 1] - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    const c = pat.colidx[m];
    if (c === j) return m;
    if (c < j) lo = m + 1;
    else hi = m - 1;
  }
  return -1;
}

export function matVec(pat, val, x, out) {
  const n = pat.n;
  out = out ?? new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) s += val[p] * x[pat.colidx[p]];
    out[i] = s;
  }
  return out;
}

/** Nested dissection ordering by recursive coordinate bisection. Returns perm (new index -> old index). */
export function ndOrder(pat, x, y, leaf = 48) {
  const n = pat.n;
  const side = new Int8Array(n); // 0 unassigned, 1 A, 2 B
  const order = [];
  const stackTop = [];
  const rec = (nodes) => {
    if (nodes.length <= leaf) {
      for (const v of nodes) order.push(v);
      return;
    }
    let x0 = Infinity,
      x1 = -Infinity,
      y0 = Infinity,
      y1 = -Infinity;
    for (const v of nodes) {
      if (x[v] < x0) x0 = x[v];
      if (x[v] > x1) x1 = x[v];
      if (y[v] < y0) y0 = y[v];
      if (y[v] > y1) y1 = y[v];
    }
    const key = x1 - x0 >= y1 - y0 ? x : y;
    const sorted = nodes.slice().sort((p, q) => key[p] - key[q]);
    const half = sorted.length >> 1;
    for (let i = 0; i < sorted.length; i++) side[sorted[i]] = i < half ? 1 : 2;
    const A = [],
      S = [],
      Bn = [];
    for (let i = 0; i < sorted.length; i++) {
      const v = sorted[i];
      if (i < half) {
        let sep = false;
        for (let p = pat.rowptr[v]; p < pat.rowptr[v + 1]; p++) {
          const w = pat.colidx[p];
          if (w !== v && side[w] === 2) {
            sep = true;
            break;
          }
        }
        if (sep) S.push(v);
        else A.push(v);
      } else Bn.push(v);
    }
    for (const v of sorted) side[v] = 0;
    rec(A);
    rec(Bn);
    for (const v of S) order.push(v);
  };
  const all = new Array(n);
  for (let i = 0; i < n; i++) all[i] = i;
  void stackTop;
  rec(all);
  return Int32Array.from(order);
}

// ---- approximate minimum degree ordering ----------------------------------------------------------------------------

const FLIP = (i) => -i - 2;

/**
 * Approximate minimum degree ordering (Amestoy, Davis and Duff, SIAM J. Matrix Anal. Appl. 17, 886 (1996)): quotient
 * graph with element absorption, approximate external degrees, aggressive absorption, supervariable detection by
 * hashing, dense-row removal and a postorder of the assembly tree. Re-implemented from the published description in
 * T. Davis, Direct Methods for Sparse Linear Systems (SIAM 2006), ch. 7.
 * @param {{n:number,rowptr:Int32Array,colidx:Int32Array}} pat symmetric pattern (full storage; the diagonal is ignored)
 * @returns {Int32Array} perm (new index -> old index)
 */
export function amdOrder(pat, { denseFactor = 10 } = {}) {
  const n = pat.n;
  if (n === 0) return new Int32Array(0);
  let cnz = 0;
  for (let i = 0; i < n; i++) for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) if (pat.colidx[p] !== i) cnz++;
  const nzmax = cnz + Math.floor(cnz / 5) + 2 * n;
  const Cp = new Int32Array(n + 1),
    Ci = new Int32Array(nzmax);
  let q0 = 0;
  for (let i = 0; i < n; i++) {
    Cp[i] = q0;
    for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) if (pat.colidx[p] !== i) Ci[q0++] = pat.colidx[p];
  }
  Cp[n] = q0;
  const len = new Int32Array(n + 1),
    nv = new Int32Array(n + 1),
    next = new Int32Array(n + 1),
    head = new Int32Array(n + 1),
    elen = new Int32Array(n + 1),
    degree = new Int32Array(n + 1),
    w = new Int32Array(n + 1),
    hhead = new Int32Array(n + 1),
    last = new Int32Array(n + 1);
  for (let k = 0; k < n; k++) len[k] = Cp[k + 1] - Cp[k];
  const dense = Math.min(n - 2, Math.max(16, denseFactor * Math.sqrt(n)));
  for (let i = 0; i <= n; i++) {
    head[i] = -1;
    last[i] = -1;
    next[i] = -1;
    hhead[i] = -1;
    nv[i] = 1;
    w[i] = 1;
    elen[i] = 0;
    degree[i] = len[i];
  }
  const wclear = (mark, lemax) => {
    if (mark < 2 || mark + lemax > 2e9) {
      for (let k = 0; k < n; k++) if (w[k] !== 0) w[k] = 1;
      return 2;
    }
    return mark;
  };
  let mark = wclear(0, 0);
  elen[n] = -2;
  Cp[n] = -1;
  w[n] = 0;
  nv[n] = 0;
  let nel = 0;
  for (let i = 0; i < n; i++) {
    const d = degree[i];
    if (d === 0) {
      elen[i] = -2;
      nel++;
      Cp[i] = -1;
      w[i] = 0;
    } else if (d > dense) {
      nv[i] = 0;
      elen[i] = -1;
      nel++;
      Cp[i] = FLIP(n);
      nv[n]++;
    } else {
      if (head[d] !== -1) last[head[d]] = i;
      next[i] = head[d];
      head[d] = i;
    }
  }
  let mindeg = 0,
    lemax = 0;
  while (nel < n) {
    // pivot of minimum approximate degree
    let k = -1;
    for (; mindeg < n && (k = head[mindeg]) === -1; mindeg++);
    if (next[k] !== -1) last[next[k]] = -1;
    head[mindeg] = next[k];
    const elenk = elen[k];
    let nvk = nv[k];
    nel += nvk;
    // garbage collection of the quotient-graph storage
    if (elenk > 0 && cnz + mindeg >= nzmax) {
      for (let j = 0; j < n; j++) {
        const p = Cp[j];
        if (p >= 0) {
          Cp[j] = Ci[p];
          Ci[p] = FLIP(j);
        }
      }
      let q = 0;
      for (let p = 0; p < cnz; ) {
        const j = FLIP(Ci[p++]);
        if (j >= 0) {
          Ci[q] = Cp[j];
          Cp[j] = q++;
          for (let k3 = 0; k3 < len[j] - 1; k3++) Ci[q++] = Ci[p++];
        }
      }
      cnz = q;
    }
    // new element Lk
    let dk = 0;
    nv[k] = -nvk;
    let p = Cp[k];
    const pk1 = elenk === 0 ? p : cnz;
    let pk2 = pk1;
    for (let k1 = 1; k1 <= elenk + 1; k1++) {
      let e, pj, ln;
      if (k1 > elenk) {
        e = k;
        pj = p;
        ln = len[k] - elenk;
      } else {
        e = Ci[p++];
        pj = Cp[e];
        ln = len[e];
      }
      for (let k2 = 1; k2 <= ln; k2++) {
        const i = Ci[pj++];
        const nvi = nv[i];
        if (nvi <= 0) continue;
        dk += nvi;
        nv[i] = -nvi;
        Ci[pk2++] = i;
        if (next[i] !== -1) last[next[i]] = last[i];
        if (last[i] !== -1) next[last[i]] = next[i];
        else head[degree[i]] = next[i];
      }
      if (e !== k) {
        Cp[e] = FLIP(k);
        w[e] = 0;
      }
    }
    if (elenk !== 0) cnz = pk2;
    degree[k] = dk;
    Cp[k] = pk1;
    len[k] = pk2 - pk1;
    elen[k] = -2;
    // set differences |Le \ Lk|
    mark = wclear(mark, lemax);
    for (let pk = pk1; pk < pk2; pk++) {
      const i = Ci[pk];
      const eln = elen[i];
      if (eln <= 0) continue;
      const nvi = -nv[i];
      const wnvi = mark - nvi;
      for (let q = Cp[i]; q <= Cp[i] + eln - 1; q++) {
        const e = Ci[q];
        if (w[e] >= mark) w[e] -= nvi;
        else if (w[e] !== 0) w[e] = degree[e] + wnvi;
      }
    }
    // approximate degree update, element absorption, hashing
    for (let pk = pk1; pk < pk2; pk++) {
      const i = Ci[pk];
      const p1 = Cp[i],
        p2 = p1 + elen[i] - 1;
      let pn = p1,
        h = 0,
        d = 0;
      for (let q = p1; q <= p2; q++) {
        const e = Ci[q];
        if (w[e] !== 0) {
          const dext = w[e] - mark;
          if (dext > 0) {
            d += dext;
            Ci[pn++] = e;
            h += e;
          } else {
            Cp[e] = FLIP(k); // aggressive absorption
            w[e] = 0;
          }
        }
      }
      elen[i] = pn - p1 + 1;
      const p3 = pn,
        p4 = p1 + len[i];
      for (let q = p2 + 1; q < p4; q++) {
        const j = Ci[q];
        const nvj = nv[j];
        if (nvj <= 0) continue;
        d += nvj;
        Ci[pn++] = j;
        h += j;
      }
      if (d === 0) {
        // mass elimination
        Cp[i] = FLIP(k);
        const nvi = -nv[i];
        dk -= nvi;
        nvk += nvi;
        nel += nvi;
        nv[i] = 0;
        elen[i] = -1;
      } else {
        degree[i] = Math.min(degree[i], d);
        Ci[pn] = Ci[p3];
        Ci[p3] = Ci[p1];
        Ci[p1] = k;
        len[i] = pn - p1 + 1;
        h = (h < 0 ? -h : h) % n;
        next[i] = hhead[h];
        hhead[h] = i;
        last[i] = h;
      }
    }
    degree[k] = dk;
    lemax = Math.max(lemax, dk);
    mark = wclear(mark + lemax, lemax);
    // supervariable detection
    for (let pk = pk1; pk < pk2; pk++) {
      let i = Ci[pk];
      if (nv[i] >= 0) continue;
      const h = last[i];
      i = hhead[h];
      hhead[h] = -1;
      for (; i !== -1 && next[i] !== -1; i = next[i], mark++) {
        const ln = len[i],
          eln = elen[i];
        for (let q = Cp[i] + 1; q <= Cp[i] + ln - 1; q++) w[Ci[q]] = mark;
        let jlast = i;
        for (let j = next[i]; j !== -1; ) {
          let ok = len[j] === ln && elen[j] === eln;
          for (let q = Cp[j] + 1; ok && q <= Cp[j] + ln - 1; q++) if (w[Ci[q]] !== mark) ok = false;
          if (ok) {
            Cp[j] = FLIP(i);
            nv[i] += nv[j];
            nv[j] = 0;
            elen[j] = -1;
            j = next[j];
            next[jlast] = j;
          } else {
            jlast = j;
            j = next[j];
          }
        }
      }
    }
    // finalize Lk
    let q = pk1;
    for (let pk = pk1; pk < pk2; pk++) {
      const i = Ci[pk];
      const nvi = -nv[i];
      if (nvi <= 0) continue;
      nv[i] = nvi;
      let d = degree[i] + dk - nvi;
      d = Math.min(d, n - nel - nvi);
      if (head[d] !== -1) last[head[d]] = i;
      next[i] = head[d];
      last[i] = -1;
      head[d] = i;
      mindeg = Math.min(mindeg, d);
      degree[i] = d;
      Ci[q++] = i;
    }
    nv[k] = nvk;
    if ((len[k] = q - pk1) === 0) {
      Cp[k] = -1;
      w[k] = 0;
    }
    if (elenk !== 0) cnz = q;
  }
  // postorder of the assembly tree
  for (let i = 0; i < n; i++) Cp[i] = FLIP(Cp[i]);
  for (let j = 0; j <= n; j++) head[j] = -1;
  for (let j = n; j >= 0; j--) {
    if (nv[j] > 0) continue;
    next[j] = head[Cp[j]];
    head[Cp[j]] = j;
  }
  for (let e = n; e >= 0; e--) {
    if (nv[e] <= 0) continue;
    if (Cp[e] !== -1) {
      next[e] = head[Cp[e]];
      head[Cp[e]] = e;
    }
  }
  const out = new Int32Array(n);
  let o = 0;
  for (let i = 0; i <= n; i++) {
    if (Cp[i] !== -1) continue;
    let top = 0;
    w[0] = i;
    while (top >= 0) {
      const pp = w[top];
      const ii = head[pp];
      if (ii === -1) {
        top--;
        if (pp < n) out[o++] = pp;
      } else {
        head[pp] = next[ii];
        w[++top] = ii;
      }
    }
  }
  if (o !== n) throw new Error(`amdOrder: internal error (ordered ${o} of ${n})`);
  return out;
}

// ---- symbolic analysis (shared by every numeric factorization on one pattern) -------------------------------------

/** Postorder of a forest given by parent[] (children visited in increasing index). */
function postorder(parent, n) {
  const head = new Int32Array(n).fill(-1),
    next = new Int32Array(n),
    stack = new Int32Array(n),
    post = new Int32Array(n);
  for (let j = n - 1; j >= 0; j--) {
    if (parent[j] === -1) continue;
    next[j] = head[parent[j]];
    head[parent[j]] = j;
  }
  let k = 0;
  for (let j = 0; j < n; j++) {
    if (parent[j] !== -1) continue;
    let top = 0;
    stack[0] = j;
    while (top >= 0) {
      const p = stack[top];
      const i = head[p];
      if (i === -1) {
        top--;
        post[k++] = p;
      } else {
        head[p] = next[i];
        stack[++top] = i;
      }
    }
  }
  return post;
}

/** Elimination tree of P A P^T from the full CSR pattern (Liu's algorithm with path compression). */
function etreeOf(pat, perm, pinv) {
  const n = pat.n;
  const parent = new Int32Array(n).fill(-1),
    anc = new Int32Array(n).fill(-1);
  for (let k = 0; k < n; k++) {
    const v = perm[k];
    for (let p = pat.rowptr[v]; p < pat.rowptr[v + 1]; p++) {
      let i = pinv[pat.colidx[p]];
      while (i !== -1 && i < k) {
        const inext = anc[i];
        anc[i] = k;
        if (inext === -1) parent[i] = k;
        i = inext;
      }
    }
  }
  return parent;
}

/**
 * Symbolic analysis of a symmetric pattern for supernodal Cholesky (and for L-VEC's LDL^T numeric phase).
 *
 * @param {{n:number,rowptr:Int32Array,colidx:Int32Array}} pat full symmetric CSR pattern (diagonal present)
 * @param {{perm?:Int32Array, ordering?:'amd'|'nd', x?:Float64Array, y?:Float64Array, relax?:boolean}} [opts]
 *   perm: fill-reducing order (new -> old) to start from; else `ordering` ('amd', default; 'nd' needs x, y).
 *   The returned `perm` is that order followed by a postorder of the elimination tree (same fill).
 *   relax: relaxed supernode amalgamation (explicit zeros for larger dense blocks; default true).
 * @returns {Object} sym with fields
 *   n, perm (new -> old), pinv (old -> new), parent (etree, new indices), colCount (nnz of each column of L, true
 *   structure), nnzL (true), nnzA (lower triangle incl. diagonal), fill (= nnzL / nnzA), flops (sum colCount^2),
 *   lowerP / lowerI / lowerSrc (lower CSC of P A P^T: column j lists rows i >= j and the CSR slot of the entry),
 *   nsuper, superStart (Int32Array nsuper+1, first column of each supernode), colSuper (column -> supernode),
 *   superParent, Sp / Si (sorted row structure of each supernode; its first ncols rows are its own columns),
 *   Lxp (Float64 offsets of the dense m x ncols column-major block of each supernode), nnzLStored (incl. explicit
 *   zeros and the unused upper part of diagonal blocks), maxFront, patternKey (patternFingerprint of `pat`; checked when
 *   the analysis is reused), timing {ordering_ms, symbolic_ms}. n = 0 gives an empty analysis; ordering 'nd' requires
 *   x and y of length n.
 */
export function analyze(pat, opts = {}) {
  const t0 = performance.now();
  const n = pat.n;
  const patternKey = patternFingerprint(pat);
  if (n === 0) {
    const z = new Int32Array(0);
    return { n: 0, perm: z, pinv: z, parent: z, colCount: z, nnzL: 0, nnzA: 0, fill: 1, flops: 0, lowerP: new Int32Array(1), lowerI: z, lowerSrc: z,
      nsuper: 0, superStart: new Int32Array(1), colSuper: z, superParent: z, childHead: z, childNext: z, Sp: new Int32Array(1), Si: z,
      Lxp: new Float64Array(1), nnzLStored: 0, maxFront: 0, patternKey, timing: { ordering_ms: 0, symbolic_ms: performance.now() - t0 } };
  }
  let perm0 = opts.perm ?? null;
  if (perm0 && perm0.length !== n) throw new Error(`analyze: perm has length ${perm0.length}, pattern has ${n} rows`);
  if (!perm0 && opts.ordering === 'nd' && !(opts.x?.length === n && opts.y?.length === n)) throw new Error('analyze: ordering nd needs node coordinates x and y of length n');
  if (!perm0) perm0 = opts.ordering === 'nd' ? ndOrder(pat, opts.x, opts.y) : amdOrder(pat);
  const t1 = performance.now();
  // etree and postorder
  let pinv = new Int32Array(n);
  for (let i = 0; i < n; i++) pinv[perm0[i]] = i;
  const parent0 = etreeOf(pat, perm0, pinv);
  const post = postorder(parent0, n);
  const perm = new Int32Array(n);
  for (let k = 0; k < n; k++) perm[k] = perm0[post[k]];
  const postInv = new Int32Array(n);
  for (let k = 0; k < n; k++) postInv[post[k]] = k;
  const parent = new Int32Array(n);
  for (let k = 0; k < n; k++) {
    const p = parent0[post[k]];
    parent[k] = p === -1 ? -1 : postInv[p];
  }
  pinv = new Int32Array(n);
  for (let i = 0; i < n; i++) pinv[perm[i]] = i;
  // lower CSC of P A P^T with source slots
  const lowerP = new Int32Array(n + 1);
  for (let v = 0; v < n; v++) {
    const pv = pinv[v];
    for (let p = pat.rowptr[v]; p < pat.rowptr[v + 1]; p++) if (pinv[pat.colidx[p]] >= pv) lowerP[pv + 1]++;
  }
  for (let j = 0; j < n; j++) lowerP[j + 1] += lowerP[j];
  const nnzA = lowerP[n];
  const lowerI = new Int32Array(nnzA),
    lowerSrc = new Int32Array(nnzA);
  const nxt = lowerP.slice(0, n);
  for (let v = 0; v < n; v++) {
    const pv = pinv[v];
    for (let p = pat.rowptr[v]; p < pat.rowptr[v + 1]; p++) {
      const pi = pinv[pat.colidx[p]];
      if (pi >= pv) {
        const q = nxt[pv]++;
        lowerI[q] = pi;
        lowerSrc[q] = p;
      }
    }
  }
  // column counts (Gilbert, Ng and Peyton skeleton-graph algorithm; tree is postordered, so post = identity)
  const colCount = new Int32Array(n);
  {
    const first = new Int32Array(n).fill(-1),
      maxfirst = new Int32Array(n).fill(-1),
      prevleaf = new Int32Array(n).fill(-1),
      ancestor = new Int32Array(n);
    for (let k = 0; k < n; k++) {
      colCount[k] = first[k] === -1 ? 1 : 0;
      for (let j = k; j !== -1 && first[j] === -1; j = parent[j]) first[j] = k;
    }
    for (let i = 0; i < n; i++) ancestor[i] = i;
    for (let j = 0; j < n; j++) {
      if (parent[j] !== -1) colCount[parent[j]]--;
      for (let p = lowerP[j]; p < lowerP[j + 1]; p++) {
        const i = lowerI[p];
        // leaf test of j in the row subtree of i
        if (i <= j || first[j] <= maxfirst[i]) continue;
        maxfirst[i] = first[j];
        const jprev = prevleaf[i];
        prevleaf[i] = j;
        colCount[j]++;
        if (jprev === -1) continue;
        let q = jprev;
        while (q !== ancestor[q]) q = ancestor[q];
        for (let s = jprev, sp; s !== q; s = sp) {
          sp = ancestor[s];
          ancestor[s] = q;
        }
        colCount[q]--;
      }
      if (parent[j] !== -1) ancestor[j] = parent[j];
    }
    for (let j = 0; j < n; j++) if (parent[j] !== -1) colCount[parent[j]] += colCount[j];
  }
  let nnzL = 0,
    flops = 0;
  for (let j = 0; j < n; j++) {
    nnzL += colCount[j];
    flops += colCount[j] * colCount[j];
  }
  // fundamental supernodes
  const nchild = new Int32Array(n);
  for (let j = 0; j < n; j++) if (parent[j] !== -1) nchild[parent[j]]++;
  const fStart = [0];
  for (let j = 1; j < n; j++) if (!(parent[j - 1] === j && colCount[j - 1] === colCount[j] + 1 && nchild[j] === 1)) fStart.push(j);
  fStart.push(n);
  let nsf = fStart.length - 1;
  // supernodal tree of the fundamental supernodes
  const colSuperF = new Int32Array(n);
  for (let s = 0; s < nsf; s++) for (let j = fStart[s]; j < fStart[s + 1]; j++) colSuperF[j] = s;
  // relaxed amalgamation: merge a supernode into its parent when it is the parent's last child (contiguous columns)
  // and the explicit zeros stay small (column/zero thresholds after CHOLMOD's defaults: 4 / any, 16 / 0.8, 48 / 0.1,
  // otherwise 0.05)
  const relax = opts.relax ?? true;
  let superStart;
  if (relax && nsf > 1) {
    const sf = new Int32Array(nsf),
      sl = new Int32Array(nsf),
      sm = new Float64Array(nsf),
      sz = new Float64Array(nsf),
      snnz = new Float64Array(nsf),
      alive = new Uint8Array(nsf).fill(1),
      sparent = new Int32Array(nsf);
    for (let s = 0; s < nsf; s++) {
      sf[s] = fStart[s];
      sl[s] = fStart[s + 1] - 1;
      sm[s] = colCount[fStart[s]];
      const nc = fStart[s + 1] - fStart[s];
      snnz[s] = nc * sm[s] - (nc * (nc - 1)) / 2;
      const pl = parent[sl[s]];
      sparent[s] = pl === -1 ? -1 : colSuperF[pl];
    }
    for (let s = 0; s < nsf; s++) {
      const P = sparent[s];
      if (P === -1 || sf[P] !== sl[s] + 1) continue;
      const ncC = sl[s] - sf[s] + 1,
        ncP = sl[P] - sf[P] + 1;
      const nc = ncC + ncP;
      const m = ncC + sm[P];
      const stored = nc * m - (nc * (nc - 1)) / 2;
      const zeros = stored - snnz[s] - snnz[P] + sz[s] + sz[P];
      const zf = zeros / stored;
      const merge = nc <= 4 || (nc <= 16 && zf < 0.8) || (nc <= 48 && zf < 0.1) || zf < 0.05;
      if (!merge) continue;
      sf[P] = sf[s];
      sm[P] = m;
      sz[P] = zeros;
      snnz[P] += snnz[s];
      alive[s] = 0;
    }
    const st = [];
    for (let s = 0; s < nsf; s++) if (alive[s]) st.push(sf[s]);
    st.push(n);
    superStart = Int32Array.from(st);
  } else superStart = Int32Array.from(fStart);
  const nsuper = superStart.length - 1;
  const colSuper = new Int32Array(n);
  for (let s = 0; s < nsuper; s++) for (let j = superStart[s]; j < superStart[s + 1]; j++) colSuper[j] = s;
  const superParent = new Int32Array(nsuper);
  for (let s = 0; s < nsuper; s++) {
    const pl = parent[superStart[s + 1] - 1];
    superParent[s] = pl === -1 ? -1 : colSuper[pl];
  }
  // row structures: own columns, then rows below from A's columns and the children (postorder: children first)
  const childHead = new Int32Array(nsuper).fill(-1),
    childNext = new Int32Array(nsuper).fill(-1);
  // children linked in decreasing order: the multifrontal stack pops the last child first
  for (let s = 0; s < nsuper; s++) {
    const P = superParent[s];
    if (P === -1) continue;
    childNext[s] = childHead[P];
    childHead[P] = s;
  }
  const Sp = new Int32Array(nsuper + 1);
  const rowsOf = new Array(nsuper);
  const marker = new Int32Array(n).fill(-1);
  let maxFront = 0;
  for (let s = 0; s < nsuper; s++) {
    const f = superStart[s],
      l = superStart[s + 1] - 1;
    const below = [];
    for (let j = f; j <= l; j++)
      for (let p = lowerP[j]; p < lowerP[j + 1]; p++) {
        const i = lowerI[p];
        if (i > l && marker[i] !== s) {
          marker[i] = s;
          below.push(i);
        }
      }
    for (let c = childHead[s]; c !== -1; c = childNext[c]) {
      const rc = rowsOf[c];
      const ncc = superStart[c + 1] - superStart[c];
      for (let r = ncc; r < rc.length; r++) {
        const i = rc[r];
        if (i > l && marker[i] !== s) {
          marker[i] = s;
          below.push(i);
        }
      }
    }
    const rows = new Int32Array(l - f + 1 + below.length);
    for (let j = f; j <= l; j++) rows[j - f] = j;
    rows.set(below, l - f + 1);
    rows.subarray(l - f + 1).sort(); // typed-array sort is numeric
    rowsOf[s] = rows;
    Sp[s + 1] = Sp[s] + rows.length;
    if (rows.length > maxFront) maxFront = rows.length;
  }
  const Si = new Int32Array(Sp[nsuper]);
  const Lxp = new Float64Array(nsuper + 1);
  for (let s = 0; s < nsuper; s++) {
    Si.set(rowsOf[s], Sp[s]);
    Lxp[s + 1] = Lxp[s] + rowsOf[s].length * (superStart[s + 1] - superStart[s]);
  }
  const t2 = performance.now();
  return {
    n,
    perm,
    pinv,
    parent,
    colCount,
    nnzL,
    nnzA,
    fill: nnzL / nnzA,
    flops,
    lowerP,
    lowerI,
    lowerSrc,
    nsuper,
    superStart,
    colSuper,
    superParent,
    childHead,
    childNext,
    Sp,
    Si,
    Lxp,
    nnzLStored: Lxp[nsuper],
    maxFront,
    patternKey,
    timing: { ordering_ms: opts.perm ? 0 : t1 - t0, symbolic_ms: t2 - t1 },
  };
}

/**
 * Fingerprint of a CSR pattern: "n:nnz:hash" with a 32-bit FNV-1a hash over rowptr and colidx. A symbolic analysis is
 * valid only for the pattern it was made from (audit P1): SparseCholesky and factorNumeric compare fingerprints.
 */
export function patternFingerprint(pat) {
  let h = 0x811c9dc5;
  const mix = (v) => {
    h ^= v & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= (v >>> 8) & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= (v >>> 16) & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= v >>> 24;
    h = Math.imul(h, 0x01000193);
  };
  const { n, rowptr, colidx } = pat;
  for (let i = 0; i <= n; i++) mix(rowptr[i]);
  const nnz = rowptr[n];
  for (let p = 0; p < nnz; p++) mix(colidx[p]);
  return `${n}:${nnz}:${(h >>> 0).toString(16)}`;
}

/** Throw unless `sym` was analysed from `pat` (same fingerprint). */
export function checkSymbolic(sym, pat) {
  if (!sym || sym.n !== pat.n || sym.patternKey !== patternFingerprint(pat)) throw new Error('symbolic analysis is for a different sparsity pattern');
}

// ---- numeric supernodal multifrontal Cholesky ---------------------------------------------------------------------

/**
 * Numeric LL^T of the SPD matrix `values` (aligned with the CSR pattern given to `analyze`), multifrontal over the
 * supernodal tree with dense column-major fronts. Reuses `num` storage when given (same `sym`).
 * `pat` (optional): the CSR pattern; when given, the symbolic analysis must have been made from it (fingerprint check).
 * The number of values must always match the analysed pattern.
 * @returns {{sym:any, Lx:Float64Array, ok:boolean, work:any}} ok false when not positive definite
 */
export function factorNumeric(sym, values, num = null, pat = null) {
  const { nsuper, superStart, Sp, Si, Lxp, lowerP, lowerI, lowerSrc, childHead, childNext, maxFront, n } = sym;
  if (pat) checkSymbolic(sym, pat);
  const nnzPat = Number(sym.patternKey?.split(':')[1]);
  if (Number.isFinite(nnzPat) && values.length !== nnzPat) throw new Error(`factorNumeric: ${values.length} values for a pattern with ${nnzPat} entries`);
  if (!num || num.sym !== sym) {
    num = { sym, Lx: new Float64Array(Lxp[nsuper]), ok: false, work: { F: new Float64Array(maxFront * maxFront), rel: new Int32Array(n), stack: new Float64Array(1024), stackDim: new Int32Array(nsuper) } };
  }
  const { Lx, work } = num;
  const F = work.F,
    rel = work.rel;
  let stack = work.stack;
  let top = 0; // stack top (doubles)
  const stackDim = work.stackDim;
  const stackPos = []; // offsets of pending update matrices
  for (let s = 0; s < nsuper; s++) {
    const f = superStart[s];
    const nc = superStart[s + 1] - f;
    const r0 = Sp[s],
      m = Sp[s + 1] - r0;
    for (let r = 0; r < m; r++) rel[Si[r0 + r]] = r;
    // zero the lower part of the front
    for (let b = 0; b < m; b++) F.fill(0, b * m + b, (b + 1) * m);
    // assemble A's own columns
    for (let c = 0; c < nc; c++) {
      const j = f + c,
        cb = c * m;
      for (let p = lowerP[j]; p < lowerP[j + 1]; p++) F[rel[lowerI[p]] + cb] += values[lowerSrc[p]];
    }
    // extend-add the children's update matrices (on top of the stack in reverse child order)
    for (let ch = childHead[s]; ch !== -1; ch = childNext[ch]) {
      const off = stackPos.pop();
      const mu = stackDim[ch];
      const cr0 = Sp[ch] + (superStart[ch + 1] - superStart[ch]);
      for (let b = 0; b < mu; b++) {
        const cb = rel[Si[cr0 + b]] * m;
        const ub = off + b * mu;
        for (let a = b; a < mu; a++) F[rel[Si[cr0 + a]] + cb] += stack[ub + a];
      }
      top = off;
    }
    // dense partial factorization: panel (left-looking within the panel)
    // Columns are processed in pairs (k, k + 1): the 4-column groups both columns need are applied in one pass;
    // per entry the operation sequence equals the one-column left-looking loop (panelUpdate).
    let k = 0;
    for (; k + 1 < nc; k += 2) {
      const ka = k * m,
        kb1 = ka + m;
      let c = 0;
      for (; c + 3 < k; c += 4) {
        const b0 = c * m,
          b1 = b0 + m,
          b2 = b1 + m,
          b3 = b2 + m;
        const l0 = F[k + b0],
          l1 = F[k + b1],
          l2 = F[k + b2],
          l3 = F[k + b3];
        const e0 = F[k + 1 + b0],
          e1 = F[k + 1 + b1],
          e2 = F[k + 1 + b2],
          e3 = F[k + 1 + b3];
        F[k + ka] -= F[k + b0] * l0 + F[k + b1] * l1 + F[k + b2] * l2 + F[k + b3] * l3;
        for (let i = k + 1; i < m; i++) {
          const f0 = F[i + b0],
            f1 = F[i + b1],
            f2 = F[i + b2],
            f3 = F[i + b3];
          F[i + ka] -= f0 * l0 + f1 * l1 + f2 * l2 + f3 * l3;
          F[i + kb1] -= f0 * e0 + f1 * e1 + f2 * e2 + f3 * e3;
        }
      }
      if (!panelUpdate(F, m, k, c) || !panelUpdate(F, m, k + 1, c)) {
        num.ok = false;
        return num;
      }
    }
    if (k < nc && !panelUpdate(F, m, k, 0)) {
      num.ok = false;
      return num;
    }
    // Schur complement update of the trailing (m - nc) block: U -= L21 L21^T (lower part). Two target columns per
    // pass over the panel (j, j + 1) reuse each loaded panel value; per entry the operations are those of the
    // one-column loop below.
    let j0 = nc;
    for (; j0 + 1 < m; j0 += 2) {
      const ja = j0,
        jbb = j0 + 1;
      const ab = ja * m,
        bb = jbb * m;
      let c = 0;
      for (; c + 3 < nc; c += 4) {
        const b0 = c * m,
          b1 = b0 + m,
          b2 = b1 + m,
          b3 = b2 + m;
        const a0 = F[ja + b0],
          a1 = F[ja + b1],
          a2 = F[ja + b2],
          a3 = F[ja + b3];
        const e0 = F[jbb + b0],
          e1 = F[jbb + b1],
          e2 = F[jbb + b2],
          e3 = F[jbb + b3];
        F[ja + ab] -= F[ja + b0] * a0 + F[ja + b1] * a1 + F[ja + b2] * a2 + F[ja + b3] * a3;
        for (let i = jbb; i < m; i++) {
          const f0 = F[i + b0],
            f1 = F[i + b1],
            f2 = F[i + b2],
            f3 = F[i + b3];
          F[i + ab] -= f0 * a0 + f1 * a1 + f2 * a2 + f3 * a3;
          F[i + bb] -= f0 * e0 + f1 * e1 + f2 * e2 + f3 * e3;
        }
      }
      for (; c < nc; c++) {
        const b0 = c * m;
        const a0 = F[ja + b0],
          e0 = F[jbb + b0];
        if (a0 !== 0) F[ja + ab] -= F[ja + b0] * a0;
        if (a0 === 0 && e0 === 0) continue;
        for (let i = jbb; i < m; i++) {
          const f0 = F[i + b0];
          if (a0 !== 0) F[i + ab] -= f0 * a0;
          if (e0 !== 0) F[i + bb] -= f0 * e0;
        }
      }
    }
    for (let j = j0; j < m; j++) {
      const jb = j * m;
      let c = 0;
      for (; c + 3 < nc; c += 4) {
        const b0 = c * m,
          b1 = b0 + m,
          b2 = b1 + m,
          b3 = b2 + m;
        const l0 = F[j + b0],
          l1 = F[j + b1],
          l2 = F[j + b2],
          l3 = F[j + b3];
        for (let i = j; i < m; i++) F[i + jb] -= F[i + b0] * l0 + F[i + b1] * l1 + F[i + b2] * l2 + F[i + b3] * l3;
      }
      for (; c < nc; c++) {
        const b0 = c * m;
        const l0 = F[j + b0];
        if (l0 === 0) continue;
        for (let i = j; i < m; i++) F[i + jb] -= F[i + b0] * l0;
      }
    }
    // store the factor block (m x nc, column-major)
    const lo = Lxp[s];
    Lx.set(F.subarray(0, m * nc), lo);
    // push the update matrix
    const mu = m - nc;
    stackDim[s] = mu;
    if (mu > 0) {
      const need = top + mu * mu;
      if (need > stack.length) {
        const bigger = new Float64Array(Math.max(need, 2 * stack.length));
        bigger.set(stack.subarray(0, top));
        stack = bigger;
        work.stack = stack;
      }
      for (let b = 0; b < mu; b++) {
        const src = (nc + b) * m + nc;
        const dst = top + b * mu;
        for (let a = b; a < mu; a++) stack[dst + a] = F[src + a];
      }
      stackPos.push(top);
      top = need;
    } else stackPos.push(top);
  }
  num.ok = true;
  return num;
}

/**
 * Left-looking update of front column k from panel columns c0 .. k-1 (4-column groups, then single columns), then
 * its pivot and scaling. Returns false when the pivot is not positive.
 */
function panelUpdate(F, m, k, c0) {
  const kb = k * m;
  let c = c0;
  for (; c + 3 < k; c += 4) {
    const b0 = c * m,
      b1 = b0 + m,
      b2 = b1 + m,
      b3 = b2 + m;
    const l0 = F[k + b0],
      l1 = F[k + b1],
      l2 = F[k + b2],
      l3 = F[k + b3];
    for (let i = k; i < m; i++) F[i + kb] -= F[i + b0] * l0 + F[i + b1] * l1 + F[i + b2] * l2 + F[i + b3] * l3;
  }
  for (; c < k; c++) {
    const b0 = c * m;
    const l0 = F[k + b0];
    if (l0 === 0) continue;
    for (let i = k; i < m; i++) F[i + kb] -= F[i + b0] * l0;
  }
  const d = F[k + kb];
  if (!(d > 0)) return false;
  const dk = Math.sqrt(d);
  F[k + kb] = dk;
  const inv = 1 / dk;
  for (let i = k + 1; i < m; i++) F[i + kb] *= inv;
  return true;
}

/** t[r] = sum over the supernode's columns c of L[nc + r, c] y[f + c] (two columns per pass). */
function belowAccumulate(Lx, lo, m, nc, mu, y, f, t) {
  t.fill(0, 0, mu);
  let c = 0;
  for (; c + 1 < nc; c += 2) {
    const ca = lo + c * m + nc,
      cb = ca + m;
    const ya = y[f + c],
      yb = y[f + c + 1];
    for (let r = 0; r < mu; r++) t[r] += Lx[ca + r] * ya + Lx[cb + r] * yb;
  }
  if (c < nc) {
    const ca = lo + c * m + nc;
    const ya = y[f + c];
    for (let r = 0; r < mu; r++) t[r] += Lx[ca + r] * ya;
  }
}

/** sum_r Lx[o + r] t[r], r < mu (four partial sums). */
function dotBelow(Lx, o, t, mu) {
  let s0 = 0,
    s1 = 0,
    s2 = 0,
    s3 = 0,
    r = 0;
  for (; r + 3 < mu; r += 4) {
    s0 += Lx[o + r] * t[r];
    s1 += Lx[o + r + 1] * t[r + 1];
    s2 += Lx[o + r + 2] * t[r + 2];
    s3 += Lx[o + r + 3] * t[r + 3];
  }
  for (; r < mu; r++) s0 += Lx[o + r] * t[r];
  return s0 + s1 + (s2 + s3);
}

/**
 * Solve A X = B with a numeric factor for q right-hand sides; b and the results in the original ordering. Same
 * per-vector arithmetic as solveNumeric; the vectors are swept supernode by supernode so each dense block of L is
 * reused from cache by all q vectors.
 */
function supernodalSolve(num, bs, outs) {
  if (!num?.ok) throw new Error('solveNumericMulti: no successful numeric factorization');
  const { sym, Lx } = num;
  const { n, perm, nsuper, superStart, Sp, Si, Lxp, maxFront } = sym;
  const q = bs.length;
  if (q === 1) return [solveNumeric(num, bs[0], outs?.[0] ?? null)];
  const ys = bs.map((b) => {
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) y[i] = b[perm[i]];
    return y;
  });
  const t = new Float64Array(maxFront);
  for (let s = 0; s < nsuper; s++) {
    const f = superStart[s],
      nc = superStart[s + 1] - f,
      r0 = Sp[s],
      m = Sp[s + 1] - r0,
      mu = m - nc,
      lo = Lxp[s],
      rb = r0 + nc;
    for (let k = 0; k < q; k++) {
      const y = ys[k];
      for (let c = 0; c < nc; c++) {
        const cb = lo + c * m;
        const yj = (y[f + c] /= Lx[cb + c]);
        for (let r = c + 1; r < nc; r++) y[f + r] -= Lx[cb + r] * yj;
      }
      if (mu === 0) continue;
      belowAccumulate(Lx, lo, m, nc, mu, y, f, t);
      for (let r = 0; r < mu; r++) y[Si[rb + r]] -= t[r];
    }
  }
  for (let s = nsuper - 1; s >= 0; s--) {
    const f = superStart[s],
      nc = superStart[s + 1] - f,
      r0 = Sp[s],
      m = Sp[s + 1] - r0,
      mu = m - nc,
      lo = Lxp[s],
      rb = r0 + nc;
    for (let k = 0; k < q; k++) {
      const y = ys[k];
      for (let r = 0; r < mu; r++) t[r] = y[Si[rb + r]];
      for (let c = nc - 1; c >= 0; c--) {
        const cb = lo + c * m;
        let w = y[f + c];
        for (let r = c + 1; r < nc; r++) w -= Lx[cb + r] * y[f + r];
        y[f + c] = (w - dotBelow(Lx, cb + nc, t, mu)) / Lx[cb + c];
      }
    }
  }
  return ys.map((y, k) => {
    const o = outs?.[k] ?? new Float64Array(n);
    for (let i = 0; i < n; i++) o[perm[i]] = y[i];
    return o;
  });
}

/** Solve A x = b with a numeric factor; b and the result in the original ordering (single-vector supernodalSolve). */
export function solveNumeric(num, b, out = null) {
  if (!num?.ok) throw new Error('solveNumeric: no successful numeric factorization');
  const { sym, Lx } = num;
  const { n, perm, nsuper, superStart, Sp, Si, Lxp, maxFront } = sym;
  const y = new Float64Array(n);
  const t = new Float64Array(maxFront);
  for (let i = 0; i < n; i++) y[i] = b[perm[i]];
  for (let s = 0; s < nsuper; s++) {
    const f = superStart[s],
      nc = superStart[s + 1] - f,
      r0 = Sp[s],
      m = Sp[s + 1] - r0,
      mu = m - nc,
      lo = Lxp[s];
    for (let c = 0; c < nc; c++) {
      const cb = lo + c * m;
      const yj = (y[f + c] /= Lx[cb + c]);
      for (let r = c + 1; r < nc; r++) y[f + r] -= Lx[cb + r] * yj;
    }
    if (mu === 0) continue;
    belowAccumulate(Lx, lo, m, nc, mu, y, f, t);
    const rb = r0 + nc;
    for (let r = 0; r < mu; r++) y[Si[rb + r]] -= t[r];
  }
  for (let s = nsuper - 1; s >= 0; s--) {
    const f = superStart[s],
      nc = superStart[s + 1] - f,
      r0 = Sp[s],
      m = Sp[s + 1] - r0,
      mu = m - nc,
      lo = Lxp[s];
    const rb = r0 + nc;
    for (let r = 0; r < mu; r++) t[r] = y[Si[rb + r]];
    for (let c = nc - 1; c >= 0; c--) {
      const cb = lo + c * m;
      let w = y[f + c];
      for (let r = c + 1; r < nc; r++) w -= Lx[cb + r] * y[f + r];
      y[f + c] = (w - dotBelow(Lx, cb + nc, t, mu)) / Lx[cb + c];
    }
  }
  out = out ?? new Float64Array(n);
  for (let i = 0; i < n; i++) out[perm[i]] = y[i];
  return out;
}

/** Solve A X = B for several right-hand sides in one pass over the factor. */
export function solveNumericMulti(num, bs, outs = null) {
  return supernodalSolve(num, bs, outs);
}

/**
 * Sparse Cholesky for a fixed symmetric pattern (supernodal multifrontal; DevLog-024). API of the former up-looking
 * class: `new SparseCholesky(pat, perm?)`, `factor(values) -> boolean`, `solve(b, out?)`, `nnzL`, `timing`.
 * `perm` (new -> old) seeds the order; without it the order is AMD. `sym` may be passed instead of a perm to reuse
 * a symbolic analysis of the same pattern: `new SparseCholesky(pat, null, {sym})`.
 */
export class SparseCholesky {
  constructor(pat, perm = null, { sym = null, ordering = 'amd', x = null, y = null } = {}) {
    const tStart = performance.now();
    this.sym = sym ?? analyze(pat, perm ? { perm } : { ordering, x, y });
    if (sym) checkSymbolic(sym, pat); // a reused analysis must come from the same pattern (audit P1)
    this.n = pat.n;
    this.perm = this.sym.perm;
    this.nnzL = this.sym.nnzL;
    this.num = null;
    this.ok = false;
    const reused = !!sym;
    this.timing = {
      n: this.n,
      nnzA: this.sym.nnzA,
      nnzL: this.nnzL,
      fill: this.sym.fill,
      flops: this.sym.flops,
      nsuper: this.sym.nsuper,
      symbolicReused: reused,
      ordering_ms: reused ? 0 : this.sym.timing.ordering_ms,
      symbolic_ms: reused ? 0 : performance.now() - tStart - this.sym.timing.ordering_ms,
      factor_ms: 0,
      nFactor: 0,
      solve_ms: 0,
      nSolve: 0,
    };
  }
  factor(values) {
    const tStart = performance.now();
    this.num = factorNumeric(this.sym, values, this.num);
    this.ok = this.num.ok;
    this.timing.factor_ms += performance.now() - tStart;
    this.timing.nFactor++;
    return this.ok;
  }
  solve(b, out) {
    const tStart = performance.now();
    if (!this.ok) throw new Error('SparseCholesky: solve without a successful factorization');
    const r = solveNumeric(this.num, b, out);
    this.timing.solve_ms += performance.now() - tStart;
    this.timing.nSolve++;
    return r;
  }
  /** Several right-hand sides at once (one pass over the factor). */
  solveMany(bs, outs = null) {
    const tStart = performance.now();
    if (!this.ok) throw new Error('SparseCholesky: solve without a successful factorization');
    const r = solveNumericMulti(this.num, bs, outs);
    this.timing.solve_ms += performance.now() - tStart;
    this.timing.nSolve += bs.length;
    return r;
  }
}

/**
 * Up-looking (row by row) sparse Cholesky for a fixed symmetric pattern with fill-reducing permutation; the engine's
 * factorization before 2026-10-14. Kept as a test oracle and for the DevLog-024 kernel comparison; the engine uses the
 * supernodal multifrontal `SparseCholesky` below. factor(values) may be called repeatedly.
 */
export class UpLookingCholesky {
  /**
   * @param {{n:number,rowptr:Int32Array,colidx:Int32Array}} pat full symmetric CSR pattern
   * @param {Int32Array} perm new->old
   */
  constructor(pat, perm) {
    const tStart = performance.now();
    const n = pat.n;
    this.n = n;
    this.perm = perm;
    const pinv = new Int32Array(n);
    for (let i = 0; i < n; i++) pinv[perm[i]] = i;
    this.pinv = pinv;
    // permuted upper-triangular CSC: entries (r,c) r<=c ; column c lists rows
    const cnt = new Int32Array(n + 1);
    for (let i = 0; i < n; i++)
      for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) {
        const j = pat.colidx[p];
        const pi = pinv[i],
          pj = pinv[j];
        if (pi <= pj) cnt[pj + 1]++;
      }
    for (let i = 0; i < n; i++) cnt[i + 1] += cnt[i];
    const Cp = cnt;
    const nnzC = Cp[n];
    const Ci = new Int32Array(nnzC);
    this.srcIndex = new Int32Array(nnzC);
    const next = Cp.slice(0, n);
    for (let i = 0; i < n; i++)
      for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) {
        const j = pat.colidx[p];
        const pi = pinv[i],
          pj = pinv[j];
        if (pi <= pj) {
          const q = next[pj]++;
          Ci[q] = pi;
          this.srcIndex[q] = p;
        }
      }
    this.Cp = Cp;
    this.Ci = Ci;
    // etree
    const parent = new Int32Array(n).fill(-1);
    const anc = new Int32Array(n).fill(-1);
    for (let k = 0; k < n; k++) {
      for (let p = Cp[k]; p < Cp[k + 1]; p++) {
        let i = Ci[p];
        while (i !== -1 && i < k) {
          const inext = anc[i];
          anc[i] = k;
          if (inext === -1) parent[i] = k;
          i = inext;
        }
      }
    }
    this.parent = parent;
    // column counts via ereach
    const mark = new Int32Array(n);
    const s = new Int32Array(n);
    const colCount = new Int32Array(n);
    for (let k = 0; k < n; k++) {
      const top = this._ereach(k, mark, s, k + 1);
      for (let q = top; q < n; q++) colCount[s[q]]++;
      colCount[k]++;
    }
    const Lp = new Int32Array(n + 1);
    for (let k = 0; k < n; k++) Lp[k + 1] = Lp[k] + colCount[k];
    this.Lp = Lp;
    this.Li = new Int32Array(Lp[n]);
    this.Lx = new Float64Array(Lp[n]);
    this._mark = mark;
    this._s = s;
    this._x = new Float64Array(n);
    this._c = new Int32Array(n);
    this.nnzL = Lp[n];
    this.markStamp = n + 2;
    const nnzA = nnzC;
    this.timing = { n, nnzA, nnzL: this.nnzL, fill: this.nnzL / nnzA, symbolic_ms: performance.now() - tStart, factor_ms: 0, nFactor: 0, solve_ms: 0, nSolve: 0 };
  }
  _ereach(k, mark, s, stamp) {
    const { Cp, Ci, parent, n } = this;
    let top = n;
    mark[k] = stamp;
    for (let p = Cp[k]; p < Cp[k + 1]; p++) {
      let i = Ci[p];
      if (i > k) continue;
      let len = 0;
      for (; mark[i] !== stamp; i = parent[i]) {
        s[len++] = i;
        mark[i] = stamp;
      }
      while (len > 0) s[--top] = s[--len];
    }
    return top;
  }
  /**
   * Numeric factorization of A = values (aligned with the CSR pattern).
   * Returns true on success; false if matrix is not positive definite.
   */
  factor(values) {
    const tStart = performance.now();
    const ok = this._factor(values);
    this.timing.factor_ms += performance.now() - tStart;
    this.timing.nFactor++;
    return ok;
  }
  _factor(values) {
    const { n, Cp, Ci, Lp, Li, Lx, srcIndex } = this;
    const mark = this._mark,
      s = this._s,
      x = this._x,
      c = this._c;
    mark.fill(0);
    let stamp = 1;
    for (let k = 0; k < n; k++) c[k] = Lp[k];
    for (let k = 0; k < n; k++) {
      stamp++;
      const top = this._ereach(k, mark, s, stamp);
      for (let p = Cp[k]; p < Cp[k + 1]; p++) x[Ci[p]] = values[srcIndex[p]];
      let d = x[k];
      x[k] = 0;
      for (let q = top; q < n; q++) {
        const i = s[q];
        const lki = x[i] / Lx[Lp[i]];
        x[i] = 0;
        const ci = c[i];
        for (let p = Lp[i] + 1; p < ci; p++) x[Li[p]] -= Lx[p] * lki;
        d -= lki * lki;
        Li[ci] = k;
        Lx[ci] = lki;
        c[i] = ci + 1;
      }
      if (!(d > 0)) {
        this.ok = false;
        return false;
      }
      Li[c[k]] = k;
      Lx[c[k]] = Math.sqrt(d);
      c[k]++;
    }
    this.ok = true;
    return true;
  }
  /** Solve A x = b. b and result in original ordering. */
  solve(b, out) {
    const tStart = performance.now();
    const { n, Lp, Li, Lx, perm } = this;
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) y[i] = b[perm[i]];
    for (let j = 0; j < n; j++) {
      y[j] /= Lx[Lp[j]];
      const yj = y[j];
      for (let p = Lp[j] + 1; p < Lp[j + 1]; p++) y[Li[p]] -= Lx[p] * yj;
    }
    for (let j = n - 1; j >= 0; j--) {
      let v = y[j];
      for (let p = Lp[j] + 1; p < Lp[j + 1]; p++) v -= Lx[p] * y[Li[p]];
      y[j] = v / Lx[Lp[j]];
    }
    out = out ?? new Float64Array(n);
    for (let i = 0; i < n; i++) out[perm[i]] = y[i];
    this.timing.solve_ms += performance.now() - tStart;
    this.timing.nSolve++;
    return out;
  }
}

/** Convenience: Cholesky of a SPD CSR matrix (AMD ordering; x, y unused, kept for the old signature). */
export function cholesky(pat, val, x, y) {
  void x;
  void y;
  const ch = new SparseCholesky(pat);
  if (!ch.factor(val)) throw new Error('cholesky: matrix not positive definite');
  return ch;
}

// ---- small dense helpers ----

/** Jacobi eigenvalue iteration for a symmetric dense matrix (row-major p x p). Returns {values, vectors(columns)}. */
export function jacobiEigen(A, p) {
  const a = Float64Array.from(A);
  const v = new Float64Array(p * p);
  for (let i = 0; i < p; i++) v[i * p + i] = 1;
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) off += a[i * p + j] * a[i * p + j];
    if (off < 1e-30) break;
    for (let i = 0; i < p; i++)
      for (let j = i + 1; j < p; j++) {
        const aij = a[i * p + j];
        if (Math.abs(aij) < 1e-300) continue;
        const theta = (a[j * p + j] - a[i * p + i]) / (2 * aij);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const cc = 1 / Math.sqrt(t * t + 1),
          ss = t * cc;
        for (let k = 0; k < p; k++) {
          const aik = a[i * p + k],
            ajk = a[j * p + k];
          a[i * p + k] = cc * aik - ss * ajk;
          a[j * p + k] = ss * aik + cc * ajk;
        }
        for (let k = 0; k < p; k++) {
          const aki = a[k * p + i],
            akj = a[k * p + j];
          a[k * p + i] = cc * aki - ss * akj;
          a[k * p + j] = ss * aki + cc * akj;
        }
        for (let k = 0; k < p; k++) {
          const vki = v[k * p + i],
            vkj = v[k * p + j];
          v[k * p + i] = cc * vki - ss * vkj;
          v[k * p + j] = ss * vki + cc * vkj;
        }
      }
  }
  const idx = Array.from({ length: p }, (_, i) => i).sort((i, j) => a[i * p + i] - a[j * p + j]);
  const values = idx.map((i) => a[i * p + i]);
  const vectors = new Float64Array(p * p);
  idx.forEach((src, dst) => {
    for (let k = 0; k < p; k++) vectors[k * p + dst] = v[k * p + src];
  });
  return { values, vectors };
}
