// Linear solvers for the thermo-elastic system (tranche E2; DevLog-010 A4).
//   direct: ported supernodal Cholesky (la/sparse.mjs SparseCholesky) with a node-level fill-reducing order (AMD on the
//           node graph, or grid nested dissection for corner-node elements) expanded to the 3 DOFs of each node.
//   pcg:    preconditioned CG on the CSR matrix; preconditioners jacobi, block_jacobi (3 x 3 node blocks) and gmg
//           (gmg.mjs, corner-node elements) / pmg (q2s).
// License: GPL-3.0-or-later.

import { SparseCholesky, amdOrder, ndOrder, matVec } from '../la/sparse.mjs';
import { nodeXYZ } from './numbering.mjs';
import { gridNDOrder } from '../la/stencil.mjs';

/** Expand a node order (new -> old) to DOFs. */
export function expandPerm(permN) {
  const p = new Int32Array(3 * permN.length);
  for (let k = 0; k < permN.length; k++) { p[3 * k] = 3 * permN[k]; p[3 * k + 1] = 3 * permN[k] + 1; p[3 * k + 2] = 3 * permN[k] + 2; }
  return p;
}

/**
 * Node order: 'amd' (AMD on the node pattern), 'nd' (grid nested dissection; corner-node elements only) or 'nd_xy'
 * (la/sparse.mjs coordinate-bisection nested dissection on the node graph with node x, y: plate-like models).
 */
export function nodeOrder(sys, num, grid, ordering = 'amd') {
  if (ordering === 'nd_xy') {
    const x = new Float64Array(num.nn), y = new Float64Array(num.nn);
    for (let n = 0; n < num.nn; n++) { const p = nodeXYZ(grid, num.ext[n]); x[n] = p[0]; y[n] = p[1]; }
    return ndOrder(sys.patN, x, y, 64);
  }
  if (ordering === 'nd') {
    if (num.type === 'q2s') throw new Error('mech: ordering nd is for corner-node elements (q1, q1im); use amd for q2s');
    const NX = grid.nx + 1, NY = grid.ny + 1, NZ = grid.nz + 1;
    return gridNDOrder(NX, NY, NZ, num.compact);
  }
  return amdOrder(sys.patN);
}

/** Direct solve; returns {x, timing}. */
export function solveDirect(sys, num, grid, { ordering = 'amd' } = {}) {
  const t0 = performance.now();
  const permN = nodeOrder(sys, num, grid, ordering);
  const t1 = performance.now();
  const chol = new SparseCholesky(sys.pat, expandPerm(permN));
  const t2 = performance.now();
  if (!chol.factor(sys.val)) throw new Error('mech: stiffness not positive definite (unconstrained rigid-body mode or a disconnected body without supports)');
  const t3 = performance.now();
  const x = chol.solve(sys.rhs);
  const t4 = performance.now();
  return {
    x,
    chol,
    timing: { ordering_ms: t1 - t0, symbolic_ms: t2 - t1, factor_ms: t3 - t2, solve_ms: t4 - t3, nnzL: chol.nnzL, flops: chol.timing.flops, iterations: 0 },
  };
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** CSR y = A x with a preallocated output (3x unrolled is not needed: la matVec is used). */
export const csrApply = (sys) => (x, y) => matVec(sys.pat, sys.val, x, y);

/**
 * Preconditioned CG. apply(x, y) computes y = A x; precond(r, z) computes z = M^-1 r.
 * Stops when ||r|| <= rtol ||b - A x0|| (relativeTo 'r0') or rtol ||b|| ('b'). Returns {x, iterations, relres,
 * converged, history}.
 */
export function pcg(apply, precond, b, x0, { rtol = 1e-10, maxIter = 2000, relativeTo = 'r0' } = {}) {
  const n = b.length;
  const x = x0 ? Float64Array.from(x0) : new Float64Array(n);
  const r = new Float64Array(n), z = new Float64Array(n), p = new Float64Array(n), q = new Float64Array(n);
  apply(x, q);
  for (let i = 0; i < n; i++) r[i] = b[i] - q[i];
  // relativeTo 'b': stop on ||r|| <= rtol ||b|| (warm starts: the same absolute accuracy as a cold start)
  const r0 = relativeTo === 'b' ? Math.sqrt(dot(b, b)) : Math.sqrt(dot(r, r));
  const history = [1];
  if (r0 === 0 || Math.sqrt(dot(r, r)) <= rtol * r0) return { x, iterations: 0, relres: r0 ? Math.sqrt(dot(r, r)) / r0 : 0, converged: true, history };
  precond(r, z);
  p.set(z);
  let rz = dot(r, z), it = 0, rel = 1;
  for (it = 1; it <= maxIter; it++) {
    apply(p, q);
    const pq = dot(p, q);
    if (!(pq > 0)) throw new Error(`mech pcg: p^T A p = ${pq} at iteration ${it} (operator or preconditioner not SPD)`);
    const alpha = rz / pq;
    for (let i = 0; i < n; i++) { x[i] += alpha * p[i]; r[i] -= alpha * q[i]; }
    rel = Math.sqrt(dot(r, r)) / r0;
    history.push(rel);
    if (rel <= rtol) break;
    precond(r, z);
    const rzn = dot(r, z);
    const beta = rzn / rz;
    rz = rzn;
    for (let i = 0; i < n; i++) p[i] = z[i] + beta * p[i];
  }
  return { x, iterations: Math.min(it, maxIter), relres: rel, converged: rel <= rtol, history };
}

/** Point Jacobi preconditioner of a CSR matrix. */
export function jacobi(sys) {
  const { pat, val } = sys, n = pat.n, dinv = new Float64Array(n);
  for (let i = 0; i < n; i++)
    for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) if (pat.colidx[p] === i) dinv[i] = 1 / val[p];
  return (r, z) => { for (let i = 0; i < n; i++) z[i] = r[i] * dinv[i]; };
}

/** Inverse of a 3x3 SPD block (row-major) into out at offset o. */
export function inv3(a, out, o) {
  const [a0, a1, a2, a3, a4, a5, a6, a7, a8] = a;
  const c0 = a4 * a8 - a5 * a7, c1 = a5 * a6 - a3 * a8, c2 = a3 * a7 - a4 * a6;
  const det = a0 * c0 + a1 * c1 + a2 * c2;
  if (!(Math.abs(det) > 0)) throw new Error('mech: singular 3x3 node block');
  const id = 1 / det;
  out[o] = c0 * id; out[o + 1] = (a2 * a7 - a1 * a8) * id; out[o + 2] = (a1 * a5 - a2 * a4) * id;
  out[o + 3] = c1 * id; out[o + 4] = (a0 * a8 - a2 * a6) * id; out[o + 5] = (a2 * a3 - a0 * a5) * id;
  out[o + 6] = c2 * id; out[o + 7] = (a1 * a6 - a0 * a7) * id; out[o + 8] = (a0 * a4 - a1 * a3) * id;
}

/** 3x3 node-block Jacobi preconditioner (DOF layout of assemble.mjs: node r rows 3r..3r+2). */
export function blockJacobi(sys) {
  const { pat, val } = sys, nn = pat.n / 3;
  const B = new Float64Array(9 * nn), a = new Array(9);
  for (let r = 0; r < nn; r++) {
    for (let i = 0; i < 3; i++) {
      const row = 3 * r + i;
      for (let p = pat.rowptr[row]; p < pat.rowptr[row + 1]; p++) {
        const c = pat.colidx[p];
        if (c >= 3 * r && c < 3 * r + 3) a[3 * i + (c - 3 * r)] = val[p];
      }
    }
    inv3(a, B, 9 * r);
  }
  return (rv, z) => {
    for (let r = 0; r < nn; r++) {
      const o = 9 * r, x0 = rv[3 * r], x1 = rv[3 * r + 1], x2 = rv[3 * r + 2];
      z[3 * r] = B[o] * x0 + B[o + 1] * x1 + B[o + 2] * x2;
      z[3 * r + 1] = B[o + 3] * x0 + B[o + 4] * x1 + B[o + 5] * x2;
      z[3 * r + 2] = B[o + 6] * x0 + B[o + 7] * x1 + B[o + 8] * x2;
    }
  };
}
