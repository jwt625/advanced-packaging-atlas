// Preconditioned conjugate gradients on padded stencil vectors (DevLog-012 lane L1).
// The operator has identity rows on fixed nodes; with x0 equal to b on those rows the residual there stays zero.
// License: GPL-3.0-or-later.

import { padded, applyStencil, S_CENTER } from './stencil.mjs';
import { paddedBlock, applyBlock, projectOut, orthonormalize } from './block.mjs';

function dot(a, b, lo, hi) {
  let s = 0;
  for (let q = lo; q < hi; q++) s += a[q] * b[q];
  return s;
}

/**
 * Solve A x = b for a scalar (stencil.mjs) or 3-DOF block (block.mjs, op.bs = 3) operator. b, x padded; x is the
 * initial guess (its fixed rows are set to b).
 * @param {object} op stencil or block operator
 * @param {(r: Float64Array, z: Float64Array) => void} precond z = M^-1 r
 * @param {Float64Array} b
 * @param {Float64Array} x
 * @param {{rtol?: number, maxIter?: number, nullspace?: Float64Array[], ref?: 'r0' | 'b'}} [opt] stop when ||r||_2 <= rtol ||b - A x0||_2
 *   (ref 'b': rtol ||b||_2);
 *   nullspace (padded vectors, e.g. block.mjs rigidBodyModes of a floating body): b, the preconditioned residuals
 *   and x are kept orthogonal to it (singular consistent systems)
 * @returns {{iterations: number, relres: number, converged: boolean, history: number[], inconsistency: number}}
 */
export function pcg(op, precond, b, x, { rtol = 1e-10, maxIter = 500, nullspace = null, ref = 'r0' } = {}) {
  const bs = op.bs ?? 1;
  const { N, pad, fixed } = op;
  const lo = bs * pad, hi = bs * (pad + N);
  const apply = bs === 1 ? applyStencil : applyBlock;
  const vec = () => (bs === 1 ? padded(op) : paddedBlock(op));
  for (let d = 0; d < bs * N; d++) if (fixed[d]) x[lo + d] = b[lo + d];
  const U = nullspace ? orthonormalize(nullspace) : null;
  let inconsistency = 0;
  if (U) {
    const bb = b.slice();
    projectOut(U, bb);
    let dn = 0, bn = 0;
    for (let i = lo; i < hi; i++) { dn += (bb[i] - b[i]) ** 2; bn += b[i] ** 2; }
    inconsistency = bn > 0 ? Math.sqrt(dn / bn) : 0;
    b = bb;
    projectOut(U, x);
  }
  // WASM arena (wasm/accel.mjs): work in the reserved pool vectors, copy b in and x out
  const pool = op._wk?.pool;
  const xOut = x;
  let r, z, p, q;
  if (pool) {
    [r, z, p, q] = pool;
    pool[4].set(b);
    pool[5].set(x);
    b = pool[4];
    x = pool[5];
  } else [r, z, p, q] = [vec(), vec(), vec(), vec()];
  apply(op, x, q);
  for (let i = lo; i < hi; i++) r[i] = b[i] - q[i];
  if (U) projectOut(U, r);
  // ref 'r0': ||r|| / ||r0|| (default); 'b': ||r|| / ||b|| (warm starts, e.g. Picard, then stop early)
  const r0 = ref === 'b' ? Math.sqrt(dot(b, b, lo, hi)) || Math.sqrt(dot(r, r, lo, hi)) : Math.sqrt(dot(r, r, lo, hi));
  const history = [Math.sqrt(dot(r, r, lo, hi)) / (r0 || 1)];
  if (r0 === 0 || history[0] <= rtol) {
    if (pool) xOut.set(x);
    return { iterations: 0, relres: history[0] || 0, converged: true, history, inconsistency };
  }
  precond(r, z);
  if (U) projectOut(U, z);
  p.set(z);
  let rz = dot(r, z, lo, hi);
  let it = 0, rel = 1;
  for (it = 1; it <= maxIter; it++) {
    apply(op, p, q);
    const pq = dot(p, q, lo, hi);
    if (!(pq > 0)) throw new Error(`pcg: p^T A p = ${pq} at iteration ${it} (operator or preconditioner not SPD)`);
    const alpha = rz / pq;
    for (let i = lo; i < hi; i++) {
      x[i] += alpha * p[i];
      r[i] -= alpha * q[i];
    }
    rel = Math.sqrt(dot(r, r, lo, hi)) / r0;
    history.push(rel);
    if (rel <= rtol) break;
    precond(r, z);
    if (U) projectOut(U, z);
    const rzNew = dot(r, z, lo, hi);
    const beta = rzNew / rz;
    rz = rzNew;
    for (let i = lo; i < hi; i++) p[i] = z[i] + beta * p[i];
  }
  if (U) projectOut(U, x);
  if (pool) xOut.set(x);
  return { iterations: Math.min(it, maxIter), relres: rel, converged: rel <= rtol, history, inconsistency };
}

/** Jacobi preconditioner of a stencil operator. */
export function jacobiPrecond(op) {
  const { N, A, pad } = op;
  const dinv = new Float64Array(N);
  for (let n = 0; n < N; n++) dinv[n] = 1 / A[27 * n + S_CENTER];
  return (r, z) => {
    for (let n = 0; n < N; n++) z[pad + n] = r[pad + n] * dinv[n];
  };
}
