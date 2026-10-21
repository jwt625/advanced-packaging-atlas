// Global assembly of the thermo-elastic system on the SPEC grid (tranche E2).
// Node-level CSR pattern (la/sparse.mjs buildElementPattern) expanded to 3 x 3 blocks; DOF-level CSR layout:
// row 3 r + i holds, for every node column c_t of node row r (t = 0..m_r - 1), the entries (3 c_t + j), j = 0..2, at
// value index 9 rp[r] + 3 i m_r + 3 t + j (rows stay sorted). Constrained DOFs become identity rows / columns with
// the prescribed value on the right-hand side (lifting applied to the free rows), so the matrix stays SPD.
// License: GPL-3.0-or-later.

import { buildElementPattern, entryIndex } from '../la/sparse.mjs';
import { elementOperator, elementThermalLoad, reference } from './elements.mjs';

/** Expand a node-level pattern to a 3 DOF per node pattern (layout in the module header). */
export function expandPattern(patN) {
  const nn = patN.n, rp = patN.rowptr, ci = patN.colidx;
  const n = 3 * nn, nnz = 9 * patN.nnz;
  if (nnz > 2 ** 31 - 1) throw new Error('mech: pattern too large for Int32 indices');
  const rowptr = new Int32Array(n + 1), colidx = new Int32Array(nnz);
  let q = 0;
  for (let r = 0; r < nn; r++) {
    const m = rp[r + 1] - rp[r];
    for (let i = 0; i < 3; i++) {
      for (let t = 0; t < m; t++) {
        const c = ci[rp[r] + t];
        colidx[q++] = 3 * c; colidx[q++] = 3 * c + 1; colidx[q++] = 3 * c + 2;
      }
      rowptr[3 * r + i + 1] = q;
    }
  }
  return { n, rowptr, colidx, nnz };
}

/**
 * Element-operator provider with a bounded cache keyed by (cell size, mechanical material, temperature for D).
 * Returns {op(c, Tmean) , tKey(T)}.
 */
export function operatorProvider(grid, type, mats, { cacheMB = null } = {}) {
  // cache budget: 256 MB, 64 MB above 2e5 active cells (memory pass 2026-10-20: the cache is an arrayBuffer cost)
  if (cacheMB == null) { let nc = 0; for (let c = 0; c < grid.cellPart.length; c++) if (grid.cellPart[c] >= 0) nc++; cacheMB = nc > 200000 ? 64 : 256; }
  const cache = new Map();
  const n = type === 'q2s' ? 60 : 24;
  const perEntry = 8 * (n * n + (type === 'q1im' ? 9 * 9 + 9 * n : 0)) + 200;
  const cap = Math.max(64, Math.floor((cacheMB * 2 ** 20) / perEntry));
  const { xs, ys, zs, nx, ny } = grid;
  let hits = 0, misses = 0;
  const get = (c, T) => {
    const i = c % nx, j = Math.floor(c / nx) % ny, k = Math.floor(c / (nx * ny));
    const hx = xs[i + 1] - xs[i], hy = ys[j + 1] - ys[j], hz = zs[k + 1] - zs[k];
    const m = mats.cellMM[c];
    const key = `${hx}|${hy}|${hz}|${m}|${T}`;
    let op = cache.get(key);
    if (op) { hits++; return op; }
    misses++;
    op = elementOperator(type, hx, hy, hz, mats.list[m].D(T));
    op.mm = m;
    op.T = T;
    if (cache.size >= cap) cache.clear();
    cache.set(key, op);
    return op;
  };
  return { get, stats: () => ({ hits, misses, size: cache.size, cap }) };
}

/** Corner temperatures (K) of cell c: uniform value or the SPEC corner-node field. */
export function cellCornerT(grid, temp, c, out = new Float64Array(8)) {
  if (temp.uniform_K != null) { out.fill(temp.uniform_K); return out; }
  const { nx, ny } = grid, NX = nx + 1, NY = ny + 1, P = NX * NY;
  const i = c % nx, j = Math.floor(c / nx) % ny, k = Math.floor(c / (nx * ny));
  const n0 = i + NX * (j + NY * k), f = temp.nodal_K;
  out[0] = f[n0]; out[1] = f[n0 + 1]; out[2] = f[n0 + NX]; out[3] = f[n0 + NX + 1];
  out[4] = f[n0 + P]; out[5] = f[n0 + P + 1]; out[6] = f[n0 + P + NX]; out[7] = f[n0 + P + NX + 1];
  return out;
}

/** Temperature used for D of a cell: uniform value, else the corner mean rounded to 0.01 K (cache key). */
export function cellDT(temp, Tc) {
  if (temp.uniform_K != null) return temp.uniform_K;
  let s = 0;
  for (let a = 0; a < 8; a++) s += Tc[a];
  return Math.round(s * 12.5) / 100;
}

/** True when the 8 corner temperatures are equal. */
const flatT = (Tc) => Tc.every((t) => t === Tc[0]);

/**
 * Element thermal load with the Gauss-point thermal strain (Q1 temperature interpolation).
 * Returns {f, fi} (elements.mjs elementThermalLoad).
 */
export function cellThermalLoad(op, mat, Tc, scratch) {
  const ref = reference(op.type);
  if (flatT(Tc)) return elementThermalLoad(op, null, mat.epsTh(Tc[0], scratch.e));
  const { NT } = ref;
  const eps = scratch.eg ?? (scratch.eg = new Float64Array(6 * 27));
  for (let q = 0; q < ref.ng; q++) {
    let T = 0;
    for (let a = 0; a < 8; a++) T += NT[8 * q + a] * Tc[a];
    mat.epsTh(T, eps.subarray(6 * q, 6 * q + 6));
  }
  return elementThermalLoad(op, (q) => eps.subarray(6 * q, 6 * q + 6), null);
}

/**
 * Element operator and condensed thermal load of active cell q (cell id c); uniform temperatures reuse the load of
 * an identical operator.
 */
export function makeLoadOf(grid, num, mats, temp, provider) {
  const Tc = new Float64Array(8), scratch = { e: new Float64Array(6) };
  const uniformLoad = new Map();
  return (q, c) => {
    cellCornerT(grid, temp, c, Tc);
    const op = provider.get(c, cellDT(temp, Tc));
    const mat = mats.list[op.mm];
    let f;
    if (temp.uniform_K != null) {
      f = uniformLoad.get(op);
      if (!f) {
        f = cellThermalLoad(op, mat, Tc, scratch).f;
        if (uniformLoad.size > 20000) uniformLoad.clear();
        uniformLoad.set(op, f);
      }
    } else f = cellThermalLoad(op, mat, Tc, scratch).f;
    return { op, f };
  };
}

/**
 * Assemble K (CSR over all active DOFs, identity rows on constrained DOFs) and the right-hand side.
 * @param {object} grid
 * @param {object} num numbering.mjs buildNumbering
 * @param {object} mats materials.mjs createMechMaterials
 * @param {{uniform_K?: number, nodal_K?: Float64Array}} temp
 * @param {{fixed: Uint8Array, value: Float64Array}} cons
 */
export function assembleSystem(grid, num, mats, temp, cons, provider, { patternOnly = false } = {}) {
  const t0 = performance.now();
  const { nen, conn, cells, nn } = num;
  const patN = buildElementPattern(nn, conn, nen);
  const pat = expandPattern(patN);
  const t1 = performance.now();
  if (patternOnly) return { pat, patN, timing: { pattern_ms: t1 - t0 } };
  const val = new Float64Array(pat.nnz);
  const rhs = new Float64Array(pat.n);
  const { fixed, value } = cons;
  const rp = patN.rowptr;
  const gl = new Int32Array(nen), tpos = new Int32Array(nen * nen);
  const nloc = 3 * nen;
  const loadOf = makeLoadOf(grid, num, mats, temp, provider);
  for (let q = 0; q < cells.length; q++) {
    const { op, f } = loadOf(q, cells[q]);
    for (let a = 0; a < nen; a++) gl[a] = conn[q * nen + a];
    for (let a = 0; a < nen; a++) {
      const r = gl[a];
      for (let b = 0; b < nen; b++) tpos[a * nen + b] = entryIndex(patN, r, gl[b]) - rp[r];
    }
    const K = op.K;
    for (let a = 0; a < nen; a++) {
      const r = gl[a], m = rp[r + 1] - rp[r], base = 9 * rp[r];
      for (let i = 0; i < 3; i++) {
        const row = 3 * r + i, li = 3 * a + i;
        if (fixed[row]) continue;
        rhs[row] += f[li];
        const rb = base + 3 * i * m, krow = li * nloc;
        for (let b = 0; b < nen; b++) {
          const cb = rb + 3 * tpos[a * nen + b], cnode = gl[b];
          for (let j = 0; j < 3; j++) {
            const kv = K[krow + 3 * b + j];
            if (fixed[3 * cnode + j]) {
              const v = value[3 * cnode + j];
              if (v !== 0) rhs[row] -= kv * v;
            } else val[cb + j] += kv;
          }
        }
      }
    }
  }
  // identity rows of constrained DOFs
  for (let r = 0; r < nn; r++) {
    const m = rp[r + 1] - rp[r], t = entryIndex(patN, r, r) - rp[r];
    for (let i = 0; i < 3; i++) {
      const row = 3 * r + i;
      if (!fixed[row]) continue;
      val[9 * rp[r] + 3 * i * m + 3 * t + i] = 1;
      rhs[row] = value[row];
    }
  }
  return { pat, patN, val, rhs, fixedDof: fixed, timing: { pattern_ms: t1 - t0, assemble_ms: performance.now() - t1 } };
}
