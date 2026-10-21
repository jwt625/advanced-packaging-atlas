// P1 / P2 Lagrange finite elements on triangles for the EM 2D cross-section solver: DOF spaces, per-material
// stiffness and mass matrices on one CSR pattern, restriction to free DOFs.
// p2Space, p2Grad and restrictMatrix are ported from eo-modulator-atlas engine/src/fem.mjs at eb97f96
// (GPL-3.0-or-later). Local changes: p2Space returns `kind` and works for any extracted mesh; added P1 space, element
// mass matrices (P1: A/12 (1 + delta_ij); P2: the standard A/180 matrix), element load vectors and per-tag assembly.
// Coordinates in the mesh are micrometres; this module returns areas in m^2 (scale 1e-12) for mass and load terms;
// stiffness forms are scale free in 2D. License: GPL-3.0-or-later.

import { buildPattern, buildElementPattern, elementSlots, triangleSlots } from '../la/sparse.mjs';

export const UM2 = 1e-12;

export function triangleGeometry(mesh) {
  const nt = mesh.nTris;
  const area = new Float64Array(nt);
  const gx = new Float64Array(3 * nt),
    gy = new Float64Array(3 * nt);
  for (let t = 0; t < nt; t++) {
    const i = mesh.tri[3 * t],
      j = mesh.tri[3 * t + 1],
      k = mesh.tri[3 * t + 2];
    const x1 = mesh.x[i],
      y1 = mesh.y[i],
      x2 = mesh.x[j],
      y2 = mesh.y[j],
      x3 = mesh.x[k],
      y3 = mesh.y[k];
    const a2 = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
    area[t] = 0.5 * a2;
    gx[3 * t] = (y2 - y3) / a2;
    gx[3 * t + 1] = (y3 - y1) / a2;
    gx[3 * t + 2] = (y1 - y2) / a2;
    gy[3 * t] = (x3 - x2) / a2;
    gy[3 * t + 1] = (x1 - x3) / a2;
    gy[3 * t + 2] = (x2 - x1) / a2;
  }
  return { area, gx, gy };
}

/** P1 space: DOFs = mesh vertices. */
export function p1Space(mesh) {
  return {
    kind: 'P1',
    k: 3,
    nV: mesh.nNodes,
    nDof: mesh.nNodes,
    elem: mesh.tri,
    x: mesh.x,
    y: mesh.y,
    pat: buildElementPattern(mesh.nNodes, mesh.tri, 3),
  };
}

/** P2 space (EO fem.mjs p2Space): vertices then one DOF per unique edge; elem order v0, v1, v2, m01, m12, m20. */
export function p2Space(mesh) {
  const nV = mesh.nNodes,
    nt = mesh.nTris;
  const pat1 = buildPattern(nV, mesh.tri);
  const edgeOfSlot = new Int32Array(pat1.nnz).fill(-1);
  let nE = 0;
  for (let a = 0; a < nV; a++) for (let p = pat1.rowptr[a]; p < pat1.rowptr[a + 1]; p++) if (pat1.colidx[p] > a) edgeOfSlot[p] = nE++;
  const edgeA = new Int32Array(nE),
    edgeB = new Int32Array(nE);
  for (let a = 0; a < nV; a++)
    for (let p = pat1.rowptr[a]; p < pat1.rowptr[a + 1]; p++)
      if (edgeOfSlot[p] >= 0) {
        edgeA[edgeOfSlot[p]] = a;
        edgeB[edgeOfSlot[p]] = pat1.colidx[p];
      }
  const slots1 = triangleSlots(pat1, mesh.tri);
  const elem = new Int32Array(6 * nt);
  const local = [
    [0, 1],
    [1, 2],
    [2, 0],
  ];
  for (let t = 0; t < nt; t++) {
    for (let a = 0; a < 3; a++) elem[6 * t + a] = mesh.tri[3 * t + a];
    for (let e = 0; e < 3; e++) {
      const [i, j] = local[e];
      const vi = mesh.tri[3 * t + i],
        vj = mesh.tri[3 * t + j];
      const slot = vi < vj ? slots1[9 * t + 3 * i + j] : slots1[9 * t + 3 * j + i];
      elem[6 * t + 3 + e] = nV + edgeOfSlot[slot];
    }
  }
  const nDof = nV + nE;
  const x = new Float64Array(nDof),
    y = new Float64Array(nDof);
  x.set(mesh.x);
  y.set(mesh.y);
  for (let e = 0; e < nE; e++) {
    x[nV + e] = 0.5 * (mesh.x[edgeA[e]] + mesh.x[edgeB[e]]);
    y[nV + e] = 0.5 * (mesh.y[edgeA[e]] + mesh.y[edgeB[e]]);
  }
  return { kind: 'P2', k: 6, nV, nDof, nEdges: nE, elem, edgeA, edgeB, x, y, pat: buildElementPattern(nDof, elem, 6) };
}

export const makeSpace = (mesh, order) => (order === 2 ? p2Space(mesh) : p1Space(mesh));

const P2Q = [
  [2 / 3, 1 / 6, 1 / 6],
  [1 / 6, 2 / 3, 1 / 6],
  [1 / 6, 1 / 6, 2 / 3],
];
const P2E = [
  [0, 1],
  [1, 2],
  [2, 0],
];

/** Gradients of the 6 P2 shape functions at barycentric point L of triangle t (EO fem.mjs). */
export function p2Grad(geo, t, L, gxN, gyN) {
  for (let i = 0; i < 3; i++) {
    const f = 4 * L[i] - 1;
    gxN[i] = f * geo.gx[3 * t + i];
    gyN[i] = f * geo.gy[3 * t + i];
  }
  for (let e = 0; e < 3; e++) {
    const [i, j] = P2E[e];
    gxN[3 + e] = 4 * (L[i] * geo.gx[3 * t + j] + L[j] * geo.gx[3 * t + i]);
    gyN[3 + e] = 4 * (L[i] * geo.gy[3 * t + j] + L[j] * geo.gy[3 * t + i]);
  }
}

// P2 mass matrix / (A / 180), order v0 v1 v2 m01 m12 m20 (vertex i couples -4 to the opposite edge midpoint)
const M2 = [
  [6, -1, -1, 0, -4, 0],
  [-1, 6, -1, 0, 0, -4],
  [-1, -1, 6, -4, 0, 0],
  [0, 0, -4, 32, 16, 16],
  [-4, 0, 0, 16, 32, 16],
  [0, -4, 0, 16, 16, 32],
];

/** Element stiffness (isotropic, unit coefficient) into Ke (k x k row-major). */
export function elementStiffness(space, geo, t, Ke, buf) {
  const k = space.k;
  Ke.fill(0);
  if (k === 3) {
    const A = Math.abs(geo.area[t]);
    for (let a = 0; a < 3; a++)
      for (let b = 0; b < 3; b++) Ke[3 * a + b] = A * (geo.gx[3 * t + a] * geo.gx[3 * t + b] + geo.gy[3 * t + a] * geo.gy[3 * t + b]);
    return Ke;
  }
  const w = Math.abs(geo.area[t]) / 3;
  const { gxN, gyN } = buf;
  for (const L of P2Q) {
    p2Grad(geo, t, L, gxN, gyN);
    for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) Ke[6 * a + b] += w * (gxN[a] * gxN[b] + gyN[a] * gyN[b]);
  }
  return Ke;
}

/** Element mass matrix (unit coefficient, area in m^2). */
export function elementMass(space, geo, t, Me) {
  const A = Math.abs(geo.area[t]) * UM2;
  if (space.k === 3) {
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) Me[3 * a + b] = (A / 12) * (a === b ? 2 : 1);
    return Me;
  }
  for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) Me[6 * a + b] = (A / 180) * M2[a][b];
  return Me;
}

/** Element load vector integral N_a dA (m^2). */
export function elementLoad(space, geo, t, fe) {
  const A = Math.abs(geo.area[t]) * UM2;
  if (space.k === 3) fe.fill(A / 3);
  else {
    fe[0] = fe[1] = fe[2] = 0;
    fe[3] = fe[4] = fe[5] = A / 3;
  }
  return fe;
}

/**
 * Assemble one stiffness and/or mass matrix per tag on the space pattern. triTag[t] = tag index (>= 0) or -1 (skip).
 * coefK[tag] / coefM[tag] scale the element matrices (null = do not assemble that kind).
 * @returns {{K: Float64Array[], M: Float64Array[]}} one value array per tag (pattern slots)
 */
export function assembleByTag(space, geo, triTag, nTags, { stiffness = true, mass = false, coefM = null } = {}) {
  const k = space.k,
    kk = k * k;
  const slots = elementSlots(space.pat, space.elem, k);
  const K = stiffness ? Array.from({ length: nTags }, () => new Float64Array(space.pat.nnz)) : null;
  const M = mass ? Array.from({ length: nTags }, () => new Float64Array(space.pat.nnz)) : null;
  const Ke = new Float64Array(kk),
    Me = new Float64Array(kk);
  const buf = { gxN: new Float64Array(6), gyN: new Float64Array(6) };
  const nt = triTag.length;
  for (let t = 0; t < nt; t++) {
    const g = triTag[t];
    if (g < 0) continue;
    if (K) {
      elementStiffness(space, geo, t, Ke, buf);
      const v = K[g];
      for (let q = 0; q < kk; q++) v[slots[kk * t + q]] += Ke[q];
    }
    if (M) {
      elementMass(space, geo, t, Me);
      const c = coefM ? coefM[g] : 1;
      const v = M[g];
      for (let q = 0; q < kk; q++) v[slots[kk * t + q]] += c * Me[q];
    }
  }
  return { K, M };
}

/** Restrict a full CSR matrix to the rows/cols with isFree[i] (EO fem.mjs restrictMatrix). */
export function restrictPattern(pat, isFree) {
  const n = pat.n;
  const map = new Int32Array(n).fill(-1);
  let nf = 0;
  for (let i = 0; i < n; i++) if (isFree[i]) map[i] = nf++;
  const rowptr = new Int32Array(nf + 1);
  let nnz = 0;
  for (let i = 0; i < n; i++) {
    if (map[i] < 0) continue;
    for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) if (map[pat.colidx[p]] >= 0) nnz++;
    rowptr[map[i] + 1] = nnz;
  }
  const colidx = new Int32Array(nnz);
  const src = new Int32Array(nnz);
  let q = 0;
  for (let i = 0; i < n; i++) {
    if (map[i] < 0) continue;
    for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) {
      const c = map[pat.colidx[p]];
      if (c >= 0) {
        colidx[q] = c;
        src[q] = p;
        q++;
      }
    }
  }
  return { pat: { n: nf, rowptr, colidx, nnz }, src, map, nf };
}

/** y = A x for a CSR matrix with complex values (re, im) and complex x. */
export function cmatvec(pat, re, im, xr, xi, yr, yi) {
  for (let i = 0; i < pat.n; i++) {
    let sr = 0,
      si = 0;
    for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) {
      const j = pat.colidx[p];
      const ar = re[p],
        ai = im ? im[p] : 0;
      sr += ar * xr[j] - ai * xi[j];
      si += ar * xi[j] + ai * xr[j];
    }
    yr[i] = sr;
    yi[i] = si;
  }
}
