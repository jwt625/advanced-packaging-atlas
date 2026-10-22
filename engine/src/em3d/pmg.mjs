// p-multigrid preconditioner for the order-2 Nedelec system (lane L22, DevLog-014 D3 / D4).
// Adapted from awslabs/palace at 29ad351f (Apache-2.0): palace/linalg/gmg.cpp (V-cycle structure: pre-smooth,
// restrict, coarse solve, prolong, transpose post-smooth), palace/linalg/distrelaxation.cpp (Hiptmair distributive
// relaxation: smoother on A, then G B_G G^T on the residual with A_G = G^T A G on the H1 auxiliary space, transpose
// order for post-smoothing), palace/models/spaceoperator.cpp (preconditioner from the complex system matrix, coarse
// level = sparse direct solve of the order-1 operator). Changes: JavaScript; two levels (order 2 -> order 1 on the
// same mesh); with the hierarchical basis of hcurl.mjs the prolongation is injection of the Whitney DOFs and the
// coarse operator is the Whitney block of the fine matrix (exact Galerkin); Gauss-Seidel smoothing (forward before,
// backward after) instead of Chebyshev; the port low-rank (Woodbury) terms are kept in the residuals and solved
// exactly on the coarse level. License of this file: GPL-3.0-or-later; see engine/src/em3d/NOTICE.

import { analyze } from '../la/sparse.mjs';
import { amdOrder } from '../la/sparse.mjs';
import { nd3Order } from './order.mjs';
import { makeFactor } from '../em2d/ldlt-select.mjs';
import { CMat, cmatInv } from '../em2d/dense.mjs';

const fail = (m) => {
  throw new Error(`em3d pmg: ${m}`);
};

/** Frequency-independent setup: coarse (Whitney) block, auxiliary H1-P2 space and discrete gradient, symbolic data. */
export function preparePMG(P, { ordering = 'auto' } = {}) {
  if (P.order !== 2) fail('the p-multigrid preconditioner needs order 2');
  const t0 = performance.now();
  const { R, space, mesh } = P;
  const nE = space.nEdges;
  const nf = R.nf;
  // coarse DOFs = free Whitney DOFs = the first nc free indices (R.map numbers free DOFs by increasing DOF id)
  let nc = 0;
  for (let id = 0; id < nE; id++) if (R.map[id] >= 0) nc++;
  for (let id = 0; id < nE; id++) if (R.map[id] >= nc) fail('free Whitney DOFs are not a prefix');
  const fp = R.pat;
  const crow = new Int32Array(nc + 1);
  const ccol = [],
    csrc = [];
  for (let i = 0; i < nc; i++) {
    for (let q = fp.rowptr[i]; q < fp.rowptr[i + 1]; q++) {
      const j = fp.colidx[q];
      if (j < nc) {
        ccol.push(j);
        csrc.push(q);
      }
    }
    crow[i + 1] = ccol.length;
  }
  const cpat = { n: nc, rowptr: crow, colidx: Int32Array.from(ccol), nnz: ccol.length };
  const cSrc = Int32Array.from(csrc);
  let csym;
  if (ordering === 'amd') csym = analyze(cpat);
  else {
    const cx = new Float64Array(nc),
      cy = new Float64Array(nc),
      cz = new Float64Array(nc);
    const { nodes, edges } = mesh;
    for (let id = 0; id < nE; id++) {
      const q = R.map[id];
      if (q < 0) continue;
      const a = edges[2 * id],
        b = edges[2 * id + 1];
      cx[q] = 0.5 * (nodes[3 * a] + nodes[3 * b]);
      cy[q] = 0.5 * (nodes[3 * a + 1] + nodes[3 * b + 1]);
      cz[q] = 0.5 * (nodes[3 * a + 2] + nodes[3 * b + 2]);
    }
    csym = analyze(cpat, { perm: nd3Order(cpat, cx, cy, cz, { leaf: 8000 }) });
    if (ordering === 'auto') {
      const amd = analyze(cpat);
      if (amd.flops < csym.flops) csym = amd;
    }
  }
  // auxiliary H1-P2 space: vertices [0, nV), edge bubbles [nV, nV + nE); free vertex: on a free Whitney edge and not
  // on a PEC (node of a PEC tet or on a pec box side; its gradient would have tangential PEC components)
  const nV = mesh.nNodes;
  const pecNode = new Uint8Array(nV);
  for (let e = 0; e < mesh.nTets; e++) {
    const s = mesh.tetSolid[e];
    if (s >= 0 && P.solidProps[s].kind === 'conductor' && P.solidProps[s].model === 'pec') for (let i = 0; i < 4; i++) pecNode[mesh.tets[4 * e + i]] = 1;
  }
  for (let id = 0; id < nE; id++) {
    // a Dirichlet Whitney edge whose DOF is in the domain lies on a PEC surface (conductor or pec side)
    if (P.inDomain[id] && P.dirichlet[id]) {
      pecNode[mesh.edges[2 * id]] = 1;
      pecNode[mesh.edges[2 * id + 1]] = 1;
    }
  }
  const auxMap = new Int32Array(nV + nE).fill(-1);
  let na = 0;
  const touch = new Uint8Array(nV);
  for (let id = 0; id < nE; id++)
    if (R.map[id] >= 0) {
      touch[mesh.edges[2 * id]] = 1;
      touch[mesh.edges[2 * id + 1]] = 1;
    }
  for (let v = 0; v < nV; v++) if (touch[v] && !pecNode[v]) auxMap[v] = na++;
  for (let e = 0; e < nE; e++) if (R.map[nE + e] >= 0) auxMap[nV + e] = na++;
  // G (nf x na): Whitney row e = (a, b): -1 at a, +1 at b; gradient row nE + e: +1 at bubble e
  const grow = new Int32Array(nf + 1);
  const gcol = [],
    gval = [];
  const rowEntries = new Array(nf);
  for (let id = 0; id < 2 * nE; id++) {
    const q = R.map[id];
    if (q < 0) continue;
    const list = [];
    if (id < nE) {
      const a = auxMap[mesh.edges[2 * id]],
        b = auxMap[mesh.edges[2 * id + 1]];
      if (a >= 0) list.push([a, -1]);
      if (b >= 0) list.push([b, 1]);
    } else list.push([auxMap[nV + id - nE], 1]);
    rowEntries[q] = list.sort((x, y) => x[0] - y[0]);
  }
  for (let q = 0; q < nf; q++) {
    for (const [c, v] of rowEntries[q] ?? []) {
      gcol.push(c);
      gval.push(v);
    }
    grow[q + 1] = gcol.length;
  }
  const G = { rowptr: grow, colidx: Int32Array.from(gcol), val: Float64Array.from(gval), n: nf, m: na };
  // G^T (na x nf)
  const tcnt = new Int32Array(na + 1);
  for (const c of G.colidx) tcnt[c + 1]++;
  for (let i = 0; i < na; i++) tcnt[i + 1] += tcnt[i];
  const tcol = new Int32Array(G.colidx.length),
    tval = new Float64Array(G.colidx.length);
  const fill = tcnt.slice(0, na);
  for (let q = 0; q < nf; q++)
    for (let p = G.rowptr[q]; p < G.rowptr[q + 1]; p++) {
      const c = G.colidx[p];
      tcol[fill[c]] = q;
      tval[fill[c]++] = G.val[p];
    }
  const GT = { rowptr: tcnt, colidx: tcol, val: tval };
  // symbolic A_G = G^T A G pattern (rows sorted)
  const arow = new Int32Array(na + 1);
  const acols = [];
  const mark = new Int32Array(na).fill(-1);
  for (let i = 0; i < na; i++) {
    const row = [];
    for (let p = GT.rowptr[i]; p < GT.rowptr[i + 1]; p++) {
      const fq = GT.colidx[p];
      for (let s = fp.rowptr[fq]; s < fp.rowptr[fq + 1]; s++) {
        const fj = fp.colidx[s];
        for (let t = G.rowptr[fj]; t < G.rowptr[fj + 1]; t++) {
          const j = G.colidx[t];
          if (mark[j] !== i) {
            mark[j] = i;
            row.push(j);
          }
        }
      }
    }
    row.sort((x, y) => x - y);
    for (const j of row) acols.push(j);
    arow[i + 1] = acols.length;
  }
  const apat = { n: na, rowptr: arow, colidx: Int32Array.from(acols), nnz: acols.length };
  const diagOf = (pat) => {
    const d = new Int32Array(pat.n).fill(-1);
    for (let i = 0; i < pat.n; i++)
      for (let q = pat.rowptr[i]; q < pat.rowptr[i + 1]; q++)
        if (pat.colidx[q] === i) {
          d[i] = q;
          break;
        }
    return d;
  };
  const fdiag = diagOf(fp),
    adiag = diagOf(apat);
  for (let i = 0; i < nf; i++) if (fdiag[i] < 0) fail('fine diagonal missing');
  return { nf, nc, cpat, cSrc, csym, G, GT, apat, adiag, fdiag, na, stats: { fine: nf, coarse: nc, aux: na, coarse_nnzL: csym.nnzL, aux_nnz: apat.nnz, setup_ms: performance.now() - t0 } };
}

/** y = A x on a CSR pattern with complex values (A0 only). */
export function spmv(pat, re, im, xr, xi, yr, yi) {
  const { rowptr, colidx } = pat;
  for (let i = 0; i < pat.n; i++) {
    let sr = 0,
      si = 0;
    for (let q = rowptr[i]; q < rowptr[i + 1]; q++) {
      const j = colidx[q];
      const ar = re[q],
        ai = im[q];
      sr += ar * xr[j] - ai * xi[j];
      si += ar * xi[j] + ai * xr[j];
    }
    yr[i] = sr;
    yi[i] = si;
  }
}

/** Gauss-Seidel sweep(s) on A y = b, in place on y; dir +1 forward, -1 backward. */
function gaussSeidel(pat, re, im, diag, br, bi, yr, yi, dir, sweeps) {
  const { rowptr, colidx } = pat;
  const n = pat.n;
  for (let s = 0; s < sweeps; s++)
    for (let k = 0; k < n; k++) {
      const i = dir > 0 ? k : n - 1 - k;
      let sr = br[i],
        si = bi[i];
      const dq = diag[i];
      for (let q = rowptr[i]; q < rowptr[i + 1]; q++) {
        if (q === dq) continue;
        const j = colidx[q];
        const ar = re[q],
          ai = im[q];
        sr -= ar * yr[j] - ai * yi[j];
        si -= ar * yi[j] + ai * yr[j];
      }
      const dr = re[dq],
        di = im[dq];
      const d = dr * dr + di * di;
      yr[i] = (sr * dr + si * di) / d;
      yi[i] = (si * dr - sr * di) / d;
    }
}

/**
 * Per-frequency preconditioner. re / im: fine matrix values on P.R.pat (A0, sparse part). lowRank: {cols: [[ur, ui]]
 * (length nf), blocks: [{off, Cinv: CMat, Cc: CMat}]} (A = A0 + sum_b U_b Cc_b U_b^T). Returns {apply(rr, ri, zr, zi),
 * applyA(xr, xi, yr, yi), stats}.
 */
export function buildPMG(PM, re, im, lowRank, { factor = null, smooth = 1, auxSmooth = 1 } = {}) {
  const t0 = performance.now();
  const { nf, nc, cpat, cSrc, csym, G, GT, apat, adiag, fdiag, na } = PM;
  const fpat = PM.fpat;
  // coarse factor
  const cre = new Float64Array(cpat.nnz),
    cim = new Float64Array(cpat.nnz);
  for (let q = 0; q < cpat.nnz; q++) {
    cre[q] = re[cSrc[q]];
    cim[q] = im[cSrc[q]];
  }
  const fac = PM._fac ?? (PM._fac = makeFactor(factor, csym));
  fac.factor(cre, cim);
  const tF = performance.now();
  // low-rank columns: sparse lists, and the coarse Woodbury data
  const cols = lowRank.cols.map(([ur, ui]) => {
    const idx = [],
      vr = [],
      vi = [];
    for (let q = 0; q < ur.length; q++)
      if (ur[q] !== 0 || ui[q] !== 0) {
        idx.push(q);
        vr.push(ur[q]);
        vi.push(ui[q]);
      }
    return { idx: Int32Array.from(idx), re: Float64Array.from(vr), im: Float64Array.from(vi) };
  });
  const nU = cols.length;
  const dotCol = (c, xr, xi, lim) => {
    let sr = 0,
      si = 0;
    for (let k = 0; k < c.idx.length; k++) {
      const q = c.idx[k];
      if (q >= lim) continue;
      sr += c.re[k] * xr[q] - c.im[k] * xi[q];
      si += c.re[k] * xi[q] + c.im[k] * xr[q];
    }
    return [sr, si];
  };
  // block-diagonal Cc (U Cc U^T) for the fine operator
  const Cc = new CMat(nU);
  for (const bl of lowRank.blocks) {
    const inv = bl.Cc ?? cmatInv(bl.Cinv);
    const r = inv.r;
    for (let a = 0; a < r; a++)
      for (let b = 0; b < r; b++) {
        Cc.re[(bl.off + a) * nU + bl.off + b] = inv.re[a * r + b];
        Cc.im[(bl.off + a) * nU + bl.off + b] = inv.im[a * r + b];
      }
  }
  // coarse Woodbury: Y = A0c^-1 Uc, Kc = Cinv + Uc^T Y
  const Yc = cols.map((c) => {
    const br = new Float64Array(nc),
      bi = new Float64Array(nc);
    for (let k = 0; k < c.idx.length; k++)
      if (c.idx[k] < nc) {
        br[c.idx[k]] = c.re[k];
        bi[c.idx[k]] = c.im[k];
      }
    return fac.solve(br, bi);
  });
  let KcInv = null;
  if (nU) {
    const Kc = new CMat(nU);
    for (let a = 0; a < nU; a++)
      for (let b = 0; b < nU; b++) {
        const d = dotCol(cols[a], Yc[b].re, Yc[b].im, nc);
        Kc.re[a * nU + b] = d[0];
        Kc.im[a * nU + b] = d[1];
      }
    for (const bl of lowRank.blocks)
      for (let a = 0; a < bl.Cinv.r; a++)
        for (let b = 0; b < bl.Cinv.r; b++) {
          Kc.re[(bl.off + a) * nU + bl.off + b] += bl.Cinv.re[a * bl.Cinv.r + b];
          Kc.im[(bl.off + a) * nU + bl.off + b] += bl.Cinv.im[a * bl.Cinv.r + b];
        }
    KcInv = cmatInv(Kc);
  }
  const coarseSolve = (br, bi) => {
    const y = fac.solve(br, bi);
    if (!nU) return y;
    const t = cols.map((c) => dotCol(c, y.re, y.im, nc));
    for (let a = 0; a < nU; a++) {
      let cr = 0,
        ci = 0;
      for (let b = 0; b < nU; b++) {
        const kr = KcInv.re[a * nU + b],
          ki = KcInv.im[a * nU + b];
        cr += kr * t[b][0] - ki * t[b][1];
        ci += kr * t[b][1] + ki * t[b][0];
      }
      const Y = Yc[a];
      for (let q = 0; q < nc; q++) {
        y.re[q] -= Y.re[q] * cr - Y.im[q] * ci;
        y.im[q] -= Y.re[q] * ci + Y.im[q] * cr;
      }
    }
    return y;
  };
  // A_G = G^T A0 G numeric (pattern apat)
  const are = new Float64Array(apat.nnz),
    aim = new Float64Array(apat.nnz);
  {
    const accR = new Float64Array(na),
      accI = new Float64Array(na);
    const { rowptr: frp, colidx: fci } = fpat;
    for (let i = 0; i < na; i++) {
      for (let p = GT.rowptr[i]; p < GT.rowptr[i + 1]; p++) {
        const fq = GT.colidx[p],
          gv = GT.val[p];
        for (let s = frp[fq]; s < frp[fq + 1]; s++) {
          const fj = fci[s];
          const ar = gv * re[s],
            ai = gv * im[s];
          for (let t = G.rowptr[fj]; t < G.rowptr[fj + 1]; t++) {
            const j = G.colidx[t];
            accR[j] += ar * G.val[t];
            accI[j] += ai * G.val[t];
          }
        }
      }
      for (let q = apat.rowptr[i]; q < apat.rowptr[i + 1]; q++) {
        const j = apat.colidx[q];
        are[q] = accR[j];
        aim[q] = accI[j];
        accR[j] = 0;
        accI[j] = 0;
      }
    }
  }
  for (let i = 0; i < na; i++) if (Math.hypot(are[adiag[i]], aim[adiag[i]]) === 0) fail('zero auxiliary diagonal');
  // full fine operator y = (A0 + U Cc U^T) x
  const applyA = (xr, xi, yr, yi) => {
    spmv(fpat, re, im, xr, xi, yr, yi);
    if (!nU) return;
    const t = cols.map((c) => dotCol(c, xr, xi, Infinity));
    for (let a = 0; a < nU; a++) {
      let cr = 0,
        ci = 0;
      for (let b = 0; b < nU; b++) {
        const kr = Cc.re[a * nU + b],
          ki = Cc.im[a * nU + b];
        cr += kr * t[b][0] - ki * t[b][1];
        ci += kr * t[b][1] + ki * t[b][0];
      }
      const c = cols[a];
      for (let k = 0; k < c.idx.length; k++) {
        const q = c.idx[k];
        yr[q] += c.re[k] * cr - c.im[k] * ci;
        yi[q] += c.re[k] * ci + c.im[k] * cr;
      }
    }
  };
  const rr = new Float64Array(nf),
    ri = new Float64Array(nf),
    xgr = new Float64Array(na),
    xgi = new Float64Array(na),
    ygr = new Float64Array(na),
    ygi = new Float64Array(na);
  const residual = (br, bi, yr, yi) => {
    applyA(yr, yi, rr, ri);
    for (let q = 0; q < nf; q++) {
      rr[q] = br[q] - rr[q];
      ri[q] = bi[q] - ri[q];
    }
  };
  const auxCorrect = (br, bi, yr, yi, dir) => {
    residual(br, bi, yr, yi);
    for (let i = 0; i < na; i++) {
      let sr = 0,
        si = 0;
      for (let p = GT.rowptr[i]; p < GT.rowptr[i + 1]; p++) {
        sr += GT.val[p] * rr[GT.colidx[p]];
        si += GT.val[p] * ri[GT.colidx[p]];
      }
      xgr[i] = sr;
      xgi[i] = si;
    }
    ygr.fill(0);
    ygi.fill(0);
    gaussSeidel(apat, are, aim, adiag, xgr, xgi, ygr, ygi, dir, auxSmooth);
    for (let q = 0; q < nf; q++)
      for (let p = G.rowptr[q]; p < G.rowptr[q + 1]; p++) {
        yr[q] += G.val[p] * ygr[G.colidx[p]];
        yi[q] += G.val[p] * ygi[G.colidx[p]];
      }
  };
  let nApply = 0;
  const smoothStep = (br, bi, zr, zi, dir) => gaussSeidel(fpat, re, im, fdiag, br, bi, zr, zi, dir, smooth);
  // V-cycle (two levels): z = M^-1 r
  const apply = (br, bi, zr, zi) => {
    nApply++;
    zr.fill(0);
    zi.fill(0);
    // pre-smooth: GS forward on A0, then auxiliary correction
    smoothStep(br, bi, zr, zi, 1);
    if (auxSmooth > 0) auxCorrect(br, bi, zr, zi, 1);
    // coarse correction
    residual(br, bi, zr, zi);
    const e = coarseSolve(rr.slice(0, nc), ri.slice(0, nc));
    for (let q = 0; q < nc; q++) {
      zr[q] += e.re[q];
      zi[q] += e.im[q];
    }
    // post-smooth (transpose order): auxiliary correction, then GS backward on A0
    if (auxSmooth > 0) auxCorrect(br, bi, zr, zi, -1);
    smoothStep(br, bi, zr, zi, -1);
  };
  return { apply, applyA, stats: { coarse_factor_ms: tF - t0, setup_ms: performance.now() - t0, nU, get applications() { return nApply; } } };
}

