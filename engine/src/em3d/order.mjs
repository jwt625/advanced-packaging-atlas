// Fill-reducing ordering for 3D edge-element systems (lane L7, E6 wave 4): nested dissection by recursive coordinate
// bisection in 3D (DOF coordinates = edge midpoints), separator = vertices of the first half adjacent to the second
// half, both halves ordered before the separator; leaves ordered by AMD on their induced subgraph.
// Same idea as la/sparse.mjs ndOrder (2D coordinates), extended to three coordinates and AMD leaves.
// License: GPL-3.0-or-later.

import { amdOrder } from '../la/sparse.mjs';

function subPattern(pat, nodes, loc) {
  const m = nodes.length;
  const rowptr = new Int32Array(m + 1);
  const cols = [];
  for (let i = 0; i < m; i++) {
    const v = nodes[i];
    for (let p = pat.rowptr[v]; p < pat.rowptr[v + 1]; p++) {
      const w = loc[pat.colidx[p]];
      if (w >= 0) cols.push(w);
    }
    rowptr[i + 1] = cols.length;
  }
  return { n: m, rowptr, colidx: Int32Array.from(cols), nnz: cols.length };
}

/** perm (new -> old) for the CSR pattern `pat` with DOF coordinates x, y, z. */
export function nd3Order(pat, x, y, z, { leaf = 2000 } = {}) {
  const n = pat.n;
  const side = new Int8Array(n);
  const loc = new Int32Array(n).fill(-1);
  const order = [];
  const leafOrder = (nodes) => {
    nodes.forEach((v, i) => (loc[v] = i));
    const sp = subPattern(pat, nodes, loc);
    const p = amdOrder(sp);
    for (const i of p) order.push(nodes[i]);
    for (const v of nodes) loc[v] = -1;
  };
  const rec = (nodes) => {
    if (nodes.length <= leaf) return leafOrder(nodes);
    const lo = [Infinity, Infinity, Infinity],
      hi = [-Infinity, -Infinity, -Infinity];
    const C = [x, y, z];
    for (const v of nodes)
      for (let d = 0; d < 3; d++) {
        if (C[d][v] < lo[d]) lo[d] = C[d][v];
        if (C[d][v] > hi[d]) hi[d] = C[d][v];
      }
    let ax = 0;
    for (let d = 1; d < 3; d++) if (hi[d] - lo[d] > hi[ax] - lo[ax]) ax = d;
    const key = C[ax];
    const sorted = nodes.slice().sort((p, q) => key[p] - key[q]);
    const half = sorted.length >> 1;
    for (let i = 0; i < sorted.length; i++) side[sorted[i]] = i < half ? 1 : 2;
    const A = [],
      S = [],
      B = [];
    for (let i = 0; i < sorted.length; i++) {
      const v = sorted[i];
      if (i < half) {
        let sep = false;
        for (let p = pat.rowptr[v]; p < pat.rowptr[v + 1]; p++)
          if (side[pat.colidx[p]] === 2) {
            sep = true;
            break;
          }
        (sep ? S : A).push(v);
      } else B.push(v);
    }
    for (const v of sorted) side[v] = 0;
    rec(A);
    rec(B);
    leafOrder(S);
  };
  rec(Array.from({ length: n }, (_, i) => i));
  return Int32Array.from(order);
}
