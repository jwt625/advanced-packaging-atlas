// STATUS (2026-10-22): in progress, not imported by the solver (pmg.mjs still uses the direct order-1 coarse solve).
// Auxiliary-space Maxwell preconditioner (AMS) for the order-1 Nedelec level (lane L22, DevLog-014 P7): an
// approximate coarse solve for the p-multigrid when the order-1 problem exceeds the direct-solver budget.
// Structure follows Palace's AMS path (palace/linalg/ams.cpp at 29ad351f, Apache-2.0, which wraps hypre AMS):
// Hiptmair-Xu decomposition with the discrete gradient G (scalar nodal space) and the nodal interpolation Pi (vector
// nodal space, component-wise Pi_x, Pi_y, Pi_z), auxiliary operators G^T A G and Pi_d^T A Pi_d from a real positive
// ("shifted", Palace pc_mat_shifted) matrix, one AMG V-cycle per auxiliary solve, cycle "01210" (smooth, G, Pi, G,
// smooth). Changes: JavaScript; smoothed-aggregation AMG of amg.mjs instead of BoomerAMG; the residuals and the
// Gauss-Seidel smoothing use the true complex operator (with the port low-rank terms), the auxiliary corrections are
// real and act on the real and imaginary parts. License of this file: GPL-3.0-or-later; see engine/src/em3d/NOTICE.

import { buildAMG, csrTranspose, csrMatMat } from './amg.mjs';

/**
 * cpat: coarse pattern (full symmetric CSR), cre / cim: complex sparse values, apc: real SPD values on cpat, cdiag:
 * diagonal positions, G1: {n, m, rowptr, colidx, val} (nc x nVg), Pis: [Pi_x, Pi_y, Pi_z] (nc x nVp each),
 * applyLowRank(xr, xi, yr, yi): y += U Cc U^T x on the coarse DOFs (or null).
 * Returns {apply(br, bi, xr, xi), stats}.
 */
export function buildAMS({ cpat, cre, cim, apc, cdiag, G1, Pis, applyLowRank = null, smooth = 1 }) {
  const t0 = performance.now();
  const n = cpat.n;
  const Ap = { n, m: n, rowptr: cpat.rowptr, colidx: cpat.colidx, val: apc };
  const aux = [G1, ...Pis].map((T) => {
    const TT = csrTranspose(T);
    const AT = csrMatMat(Ap, T);
    const A = csrMatMat(TT, AT);
    // drop exact zeros (rows of auxiliary DOFs with no coupling cannot occur: every column touches a free edge)
    const amg = buildAMG({ n: A.n, rowptr: A.rowptr, colidx: A.colidx, val: A.val });
    return { T, TT, amg, m: A.n, br: new Float64Array(A.n), bi: new Float64Array(A.n), xr: new Float64Array(A.n), xi: new Float64Array(A.n) };
  });
  const rr = new Float64Array(n),
    ri = new Float64Array(n);
  const applyA = (xr, xi, yr, yi) => {
    const { rowptr, colidx } = cpat;
    for (let i = 0; i < n; i++) {
      let sr = 0,
        si = 0;
      for (let q = rowptr[i]; q < rowptr[i + 1]; q++) {
        const j = colidx[q];
        sr += cre[q] * xr[j] - cim[q] * xi[j];
        si += cre[q] * xi[j] + cim[q] * xr[j];
      }
      yr[i] = sr;
      yi[i] = si;
    }
    applyLowRank?.(xr, xi, yr, yi);
  };
  const residual = (br, bi, xr, xi) => {
    applyA(xr, xi, rr, ri);
    for (let i = 0; i < n; i++) {
      rr[i] = br[i] - rr[i];
      ri[i] = bi[i] - ri[i];
    }
  };
  const gs = (br, bi, xr, xi, dir) => {
    const { rowptr, colidx } = cpat;
    for (let s = 0; s < smooth; s++)
      for (let k = 0; k < n; k++) {
        const i = dir > 0 ? k : n - 1 - k;
        let sr = br[i],
          si = bi[i];
        const dq = cdiag[i];
        for (let q = rowptr[i]; q < rowptr[i + 1]; q++) {
          if (q === dq) continue;
          const j = colidx[q];
          sr -= cre[q] * xr[j] - cim[q] * xi[j];
          si -= cre[q] * xi[j] + cim[q] * xr[j];
        }
        const dr = cre[dq],
          di = cim[dq],
          d = dr * dr + di * di;
        xr[i] = (sr * dr + si * di) / d;
        xi[i] = (si * dr - sr * di) / d;
      }
  };
  // x += T AMG(T^T r) for one auxiliary space (real hierarchy on the real and imaginary parts)
  const auxStep = (a, xr, xi) => {
    const { TT, T } = a;
    for (let i = 0; i < a.m; i++) {
      let sr = 0,
        si = 0;
      for (let q = TT.rowptr[i]; q < TT.rowptr[i + 1]; q++) {
        sr += TT.val[q] * rr[TT.colidx[q]];
        si += TT.val[q] * ri[TT.colidx[q]];
      }
      a.br[i] = sr;
      a.bi[i] = si;
    }
    a.amg.cycle(a.br, a.xr);
    a.amg.cycle(a.bi, a.xi);
    for (let i = 0; i < n; i++)
      for (let q = T.rowptr[i]; q < T.rowptr[i + 1]; q++) {
        xr[i] += T.val[q] * a.xr[T.colidx[q]];
        xi[i] += T.val[q] * a.xi[T.colidx[q]];
      }
  };
  const apply = (br, bi, xr, xi) => {
    xr.fill(0);
    xi.fill(0);
    gs(br, bi, xr, xi, 1);
    residual(br, bi, xr, xi);
    auxStep(aux[0], xr, xi);
    residual(br, bi, xr, xi);
    for (let d = 1; d <= 3; d++) auxStep(aux[d], xr, xi);
    residual(br, bi, xr, xi);
    auxStep(aux[0], xr, xi);
    gs(br, bi, xr, xi, -1);
  };
  return { apply, stats: { setup_ms: performance.now() - t0, aux: aux.map((a) => a.amg.levels) } };
}
