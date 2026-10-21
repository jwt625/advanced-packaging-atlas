// Periodic RVE solves for effective thermo-elastic and conduction properties (tranche E3; R1 implications C:
// "6 load cases + 1 thermal case, periodic BCs"). Lane L8.
// Mechanics: u = E x + w, w periodic (nodes on opposite faces share DOFs), one node pinned (w translation); element
// operators from ../mech/elements.mjs (q1im default or q1; on box cells), D(T) and thermal strain (re-based to Tsf)
// from ../mech/materials.mjs. Load of a macro strain E: f = -K_e (E x_e) per element (exact for elements that pass the
// patch test); thermal load f_th from the Gauss-point thermal strain. Volume-averaged stress over the Gauss points
// gives C_eff (columns = unit engineering strains, Voigt [xx, yy, zz, yz, xz, xy]) and sigma_th; the effective
// thermal strain is eps_th,eff = -S_eff sigma_th (relative to Tsf at T), alpha_eff (secant) = eps_th,eff / (T - Tsf).
// Conduction: T = G x + t, t periodic, Q1 scalar elements with diagonal k per cell; k_eff_ij = (1/V) sum_e k_e,i
// (delta_ij V_e + int_e d_i t^(j)).
// License: GPL-3.0-or-later.

import { buildElementPattern, entryIndex, SparseCholesky, amdOrder } from '../la/sparse.mjs';
import { reference, strainAt, stressFrom, internalModes, interpT } from '../mech/elements.mjs';
import { createMechMaterials, C_TO_K } from '../mech/materials.mjs';
import { operatorProvider, cellThermalLoad } from '../mech/assemble.mjs';
import { invertDense } from '../mech/constitutive.mjs';
import { expandPerm } from '../mech/solve.mjs';

/** Periodic representative of corner node (i, j, k). */
function periodicConn(grid) {
  const { nx, ny, nz } = grid;
  const ncell = nx * ny * nz;
  const rep = (i, j, k) => (i % nx) + nx * ((j % ny) + ny * (k % nz));
  const conn = new Int32Array(8 * ncell);
  for (let k = 0, c = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++, c++)
        for (let a = 0; a < 8; a++) conn[8 * c + a] = rep(i + (a & 1), j + ((a >> 1) & 1), k + ((a >> 2) & 1));
  return { conn, nn: nx * ny * nz };
}

const cellIJK = (grid, c) => [c % grid.nx, Math.floor(c / grid.nx) % grid.ny, Math.floor(c / (grid.nx * grid.ny))];

/** Node coordinates (8 x 3) of cell c in local order. */
function cellCoords(grid, c, out = new Float64Array(24)) {
  const [i, j, k] = cellIJK(grid, c);
  for (let a = 0; a < 8; a++) {
    out[3 * a] = grid.xs[i + (a & 1)];
    out[3 * a + 1] = grid.ys[j + ((a >> 1) & 1)];
    out[3 * a + 2] = grid.zs[k + ((a >> 2) & 1)];
  }
  return out;
}

/** Symmetric CSR (node pattern expanded x b) assembly helper with one pinned node (identity rows). */
function assemblePeriodic(conn, nn, b, ncell, elementMatrix, pinned = 0) {
  const patN = buildElementPattern(nn, conn, 8);
  const n = b * nn, rp = patN.rowptr, ci = patN.colidx;
  const rowptr = new Int32Array(n + 1), colidx = new Int32Array(b * b * patN.nnz);
  let q = 0;
  for (let r = 0; r < nn; r++) {
    const m = rp[r + 1] - rp[r];
    for (let i = 0; i < b; i++) {
      for (let t = 0; t < m; t++) for (let j = 0; j < b; j++) colidx[q++] = b * ci[rp[r] + t] + j;
      rowptr[b * r + i + 1] = q;
    }
  }
  const pat = { n, rowptr, colidx, nnz: q };
  const val = new Float64Array(q);
  const nl = 8 * b;
  for (let e = 0; e < ncell; e++) {
    const K = elementMatrix(e);
    for (let a = 0; a < 8; a++) {
      const r = conn[8 * e + a], m = rp[r + 1] - rp[r];
      if (r === pinned) continue;
      for (let bb = 0; bb < 8; bb++) {
        const cnode = conn[8 * e + bb];
        if (cnode === pinned) continue;
        const t = entryIndex(patN, r, cnode) - rp[r];
        for (let i = 0; i < b; i++) for (let j = 0; j < b; j++) val[b * b * rp[r] + b * i * m + b * t + j] += K[(b * a + i) * nl + b * bb + j];
      }
    }
  }
  const m0 = rp[pinned + 1] - rp[pinned], t0 = entryIndex(patN, pinned, pinned) - rp[pinned];
  for (let i = 0; i < b; i++) val[b * b * rp[pinned] + b * i * m0 + b * t0 + i] = 1;
  return { pat, patN, val };
}

/**
 * Effective elastic stiffness and thermal strain of a cell.
 * @param {object} grid cell grid (cells.mjs)
 * @param {{resolve, rebase?, T_K, Tsf_K, element?: 'q1im' | 'q1', orientation?: object}} o
 * @returns {{C: Float64Array(36), S, sigma_th: number[], eps_th: number[], alpha: number[], asym: number, dof, ms}}
 */
export function rveElastic(grid, o) {
  const t0 = performance.now();
  const { resolve, rebase = null, T_K, Tsf_K, element = 'q1im', orientation = {}, resolveOpts = {} } = o;
  if (element === 'q2s') throw new Error('homog: periodic RVE supports q1im and q1 (corner-node elements)');
  const mats = createMechMaterials(grid, { resolve, rebase, stressFreeC: { default: Tsf_K - C_TO_K }, orientation, resolveOpts });
  const prov = operatorProvider(grid, element, mats);
  const ncell = grid.nx * grid.ny * grid.nz;
  const { conn, nn } = periodicConn(grid);
  const ops = new Array(ncell);
  for (let c = 0; c < ncell; c++) ops[c] = prov.get(c, T_K);
  const sys = assemblePeriodic(conn, nn, 3, ncell, (e) => ops[e].K);
  const permN = amdOrder(sys.patN);
  const chol = new SparseCholesky(sys.pat, expandPerm(permN));
  if (!chol.factor(sys.val)) throw new Error('homog: RVE stiffness not positive definite');
  // right-hand sides: 6 unit macro strains + thermal
  const Tc = new Float64Array(8).fill(T_K), scratch = { e: new Float64Array(6) }, X = new Float64Array(24);
  const rhs = Array.from({ length: 7 }, () => new Float64Array(3 * nn));
  const uE = new Float64Array(24);
  const macro = (j, x, y, z, out) => {
    // u = E x with engineering shear split symmetrically
    const E = [0, 0, 0, 0, 0, 0];
    E[j] = 1;
    out[0] = E[0] * x + 0.5 * E[5] * y + 0.5 * E[4] * z;
    out[1] = 0.5 * E[5] * x + E[1] * y + 0.5 * E[3] * z;
    out[2] = 0.5 * E[4] * x + 0.5 * E[3] * y + E[2] * z;
  };
  const fth = new Array(ncell);
  const tmp = [0, 0, 0];
  for (let c = 0; c < ncell; c++) {
    const op = ops[c];
    cellCoords(grid, c, X);
    for (let j = 0; j < 6; j++) {
      for (let a = 0; a < 8; a++) { macro(j, X[3 * a], X[3 * a + 1], X[3 * a + 2], tmp); uE[3 * a] = tmp[0]; uE[3 * a + 1] = tmp[1]; uE[3 * a + 2] = tmp[2]; }
      for (let r = 0; r < 24; r++) {
        const node = conn[8 * c + (r / 3 | 0)];
        if (node === 0) continue;
        let s = 0;
        for (let k = 0; k < 24; k++) s += op.K[r * 24 + k] * uE[k];
        rhs[j][3 * node + (r % 3)] -= s;
      }
    }
    const { f } = cellThermalLoad(op, mats.list[op.mm], Tc, scratch);
    fth[c] = f;
    for (let r = 0; r < 24; r++) {
      const node = conn[8 * c + (r / 3 | 0)];
      if (node !== 0) rhs[6][3 * node + (r % 3)] += f[r];
    }
  }
  const sol = chol.solveMany(rhs);
  // volume-averaged stress per case
  const ref = reference(element);
  const V = grid.V;
  const avg = Array.from({ length: 7 }, () => new Float64Array(6));
  const ue = new Float64Array(24), eps = new Float64Array(6), eth = new Float64Array(6), sg = new Float64Array(6);
  for (let c = 0; c < ncell; c++) {
    const op = ops[c], mat = mats.list[op.mm];
    cellCoords(grid, c, X);
    const vol = op.h[0] * op.h[1] * op.h[2];
    for (let j = 0; j < 7; j++) {
      for (let a = 0; a < 8; a++) {
        const node = conn[8 * c + a];
        if (j < 6) macro(j, X[3 * a], X[3 * a + 1], X[3 * a + 2], tmp);
        else tmp[0] = tmp[1] = tmp[2] = 0;
        for (let d = 0; d < 3; d++) ue[3 * a + d] = tmp[d] + sol[j][3 * node + d];
      }
      const al = op.type === 'q1im' ? internalModes(op, ue, null) : null;
      for (let g = 0; g < ref.ng; g++) {
        const x = ref.gpX[3 * g], y = ref.gpX[3 * g + 1], z = ref.gpX[3 * g + 2];
        strainAt(op, x, y, z, ue, al, eps);
        if (j === 6) mat.epsTh(interpT(Tc, x, y, z), eth);
        stressFrom(op.D, eps, j === 6 ? eth : null, sg);
        const w = (ref.gpW[g] * vol) / 8 / V;
        for (let s = 0; s < 6; s++) avg[j][s] += w * sg[s];
      }
    }
  }
  const C = new Float64Array(36);
  for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) C[6 * i + j] = avg[j][i];
  let asym = 0, cmax = 0;
  for (let i = 0; i < 36; i++) cmax = Math.max(cmax, Math.abs(C[i]));
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
    asym = Math.max(asym, Math.abs(C[6 * i + j] - C[6 * j + i]) / cmax);
    const m = 0.5 * (C[6 * i + j] + C[6 * j + i]);
    C[6 * i + j] = C[6 * j + i] = m;
  }
  const S = invertDense(C, 6);
  const sth = Array.from(avg[6]);
  const epsTh = [0, 1, 2, 3, 4, 5].map((i) => -sth.reduce((s, v, k) => s + S[6 * i + k] * v, 0));
  const dT = T_K - Tsf_K;
  return {
    C, S, sigma_th: sth, eps_th: epsTh, alpha: Math.abs(dT) > 0 ? epsTh.map((e) => e / dT) : null, asym,
    dof: 3 * nn, nnzL: chol.nnzL, ms: performance.now() - t0, mats,
  };
}

/** Effective conductivity tensor (3 x 3, row-major) of a cell. kOf(materialKey) -> [kx, ky, kz] (W/m/K). */
export function rveConduction(grid, kOf) {
  const t0 = performance.now();
  const ncell = grid.nx * grid.ny * grid.nz;
  const { conn, nn } = periodicConn(grid);
  const ref = reference('q1');
  const Ip = ref.Ipq, Jp = ref.Jp, ns = ref.ns;
  const kc = new Float64Array(3 * ncell), hh = new Float64Array(3 * ncell);
  const kcache = new Map();
  for (let c = 0; c < ncell; c++) {
    const key = grid.materials[grid.cellMat[c]];
    let k = kcache.get(key);
    if (!k) { k = kOf(key); kcache.set(key, k); }
    const [i, j, kk] = cellIJK(grid, c);
    kc.set(k, 3 * c);
    hh.set([grid.xs[i + 1] - grid.xs[i], grid.ys[j + 1] - grid.ys[j], grid.zs[kk + 1] - grid.zs[kk]], 3 * c);
  }
  const Ke = (c) => {
    const V = hh[3 * c] * hh[3 * c + 1] * hh[3 * c + 2];
    const K = new Float64Array(64);
    for (let p = 0; p < 3; p++) {
      const s = kc[3 * c + p] * (V / 8) * (2 / hh[3 * c + p]) ** 2, o = (3 * p + p) * ns * ns;
      for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) K[8 * a + b] += s * Ip[o + a * ns + b];
    }
    return K;
  };
  const sys = assemblePeriodic(conn, nn, 1, ncell, Ke);
  const chol = new SparseCholesky(sys.pat, amdOrder(sys.patN));
  if (!chol.factor(sys.val)) throw new Error('homog: RVE conduction matrix not positive definite');
  const X = new Float64Array(24), rhs = [0, 1, 2].map(() => new Float64Array(nn)), tE = new Float64Array(8);
  for (let c = 0; c < ncell; c++) {
    const K = Ke(c);
    cellCoords(grid, c, X);
    for (let j = 0; j < 3; j++) {
      for (let a = 0; a < 8; a++) tE[a] = X[3 * a + j];
      for (let a = 0; a < 8; a++) {
        const node = conn[8 * c + a];
        if (node === 0) continue;
        let s = 0;
        for (let b = 0; b < 8; b++) s += K[8 * a + b] * tE[b];
        rhs[j][node] -= s;
      }
    }
  }
  const sol = chol.solveMany(rhs);
  const V = grid.V, k = new Float64Array(9);
  for (let c = 0; c < ncell; c++) {
    const Ve = hh[3 * c] * hh[3 * c + 1] * hh[3 * c + 2];
    for (let j = 0; j < 3; j++)
      for (let i = 0; i < 3; i++) {
        let g = 0;
        for (let a = 0; a < 8; a++) g += sol[j][conn[8 * c + a]] * (Ve / 8) * (2 / hh[3 * c + i]) * Jp[3 * a + i];
        k[3 * i + j] += (kc[3 * c + i] * ((i === j ? Ve : 0) + g)) / V;
      }
  }
  return { k, ms: performance.now() - t0, dof: nn };
}

/** Orthotropic engineering constants from a compliance (Voigt, engineering shear); nu_ij = -S_ij / S_ii. */
export function orthoFromS(S) {
  return {
    Ex: 1 / S[0], Ey: 1 / S[7], Ez: 1 / S[14],
    nuxy: -S[1] / S[0], nuyz: -S[8] / S[7], nuxz: -S[2] / S[0],
    Gyz: 1 / S[21], Gxz: 1 / S[28], Gxy: 1 / S[35],
  };
}

/** Largest non-orthotropic coupling |C_ij| / max |C| (normal-shear and shear-shear off-diagonal terms). */
export function nonOrthotropic(C) {
  let m = 0, cmax = 0;
  for (let i = 0; i < 36; i++) cmax = Math.max(cmax, Math.abs(C[i]));
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
    const coupled = (i < 3 && j >= 3) || (i >= 3 && j < 3) || (i >= 3 && j >= 3 && i !== j);
    if (coupled) m = Math.max(m, Math.abs(C[6 * i + j]));
  }
  return m / cmax;
}
