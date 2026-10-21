// Post-processing of the thermo-elastic solution (tranche E2; SPEC section 5; R1 2.4; DevLog-010 Decisions 2026-10-20).
// - Stress at Gauss points, at cell corners (nodal-averaged within each part, never across parts), at cell centres;
//   von Mises and principal stresses.
// - Max von Mises per part with a singular-corner flag: the corner node of the maximum is classified from the owners
//   of its 8 surrounding cells: `reentrant` when a material occupies a non-box subset of the 2 x 2 x 2 neighbourhood,
//   `bimaterial_edge` when two or more parts meet and one of them occupies at most 2 of the 8 cells (an edge or
//   corner of its box, incl. an interface line on a free surface). Owners are materials (cellMat), so joints between
//   parts of one material are not flagged. Values there are mesh dependent (singular).
// - Warpage per JEITA ED-7306 on a named surface (z up, heights = u_z, viewed from +z): raw max - min of u_z;
//   coplanarity = max - min after removing the best-fit plane (area-weighted least squares; the slopes forbidden by a
//   symmetry crop are not fitted); sign = sign(AB_max + AB_min + CD_max + CD_min) of the deviation of u_z from the
//   chord along both diagonals of the surface's bounding rectangle (full model, mirrored through the crop planes);
//   + = top (non-interconnect) surface convex = dome (centre up). Signed warpage = sign x coplanarity.
// - Curvature fit for plate cases: u_z = a + b x + c y + (w_xx x^2 + 2 w_xy x y + w_yy y^2) / 2 on a node plane over
//   the central fraction of the extent; kappa_clt = -w_xx (CLT sign, > 0 = dome).
// License: GPL-3.0-or-later.

import { groupDir } from '../grid/index.mjs';
import { reference, strainAt, stressFrom, internalModes, interpT } from './elements.mjs';
import { vonMises, principal } from './constitutive.mjs';
import { cellCornerT, cellDT, cellThermalLoad } from './assemble.mjs';
import { lookupSelection } from './supports.mjs';

export const JEITA_SIGN_CONVENTION =
  'JEITA ED-7306: + = top (non-interconnect, +z) surface convex (dome, centre up); sign = sign(AB_max + AB_min + CD_max + CD_min) of the deviation of u_z from the chord along both diagonals';

/** Gather element displacement vector. */
function gather(num, q, u, ue) {
  const nen = num.nen;
  for (let a = 0; a < nen; a++) {
    const n = num.conn[q * nen + a];
    ue[3 * a] = u[3 * n]; ue[3 * a + 1] = u[3 * n + 1]; ue[3 * a + 2] = u[3 * n + 2];
  }
  return ue;
}

/** Classify a corner node (i, j, k) by the owners of its 8 surrounding cells. */
export function classifyCorner(grid, i, j, k) {
  const { nx, ny, nz, cellPart } = grid;
  const owners = new Map();
  for (let dk = 0; dk < 2; dk++)
    for (let dj = 0; dj < 2; dj++)
      for (let di = 0; di < 2; di++) {
        const ci = i - 1 + di, cj = j - 1 + dj, ck = k - 1 + dk;
        let p = -1;
        // keyed on the material (stiffness jump), not the part id: joints between parts of one material are not
        // singular (audit A2 M9)
        if (ci >= 0 && cj >= 0 && ck >= 0 && ci < nx && cj < ny && ck < nz && cellPart[ci + nx * (cj + ny * ck)] >= 0) p = grid.cellMat[ci + nx * (cj + ny * ck)];
        // symmetry planes mirror the neighbourhood: a node on a crop plane sees its own mirror image
        if (p < 0) continue;
        if (!owners.has(p)) owners.set(p, []);
        owners.get(p).push([di, dj, dk]);
      }
  const symX = grid.symmetry === 'half_x' || grid.symmetry === 'quarter', symY = grid.symmetry === 'half_y' || grid.symmetry === 'quarter';
  const mirror = (set) => {
    let s = set;
    if (symX && i === 0) s = s.concat(s.map(([a, b, c]) => [1 - a, b, c]));
    if (symY && j === 0) s = s.concat(s.map(([a, b, c]) => [a, 1 - b, c]));
    const u = new Map(s.map((t) => [t.join(','), t]));
    return [...u.values()];
  };
  let flag = null;
  const sets = [...owners.values()].map(mirror);
  const isBox = (s) => {
    const X = new Set(s.map((t) => t[0])), Y = new Set(s.map((t) => t[1])), Z = new Set(s.map((t) => t[2]));
    return X.size * Y.size * Z.size === s.length;
  };
  for (const s of sets) if (!isBox(s)) flag = 'reentrant';
  if (!flag && sets.length >= 2 && sets.some((s) => s.length <= 2)) flag = 'bimaterial_edge';
  return flag;
}

/**
 * Stress recovery. Returns fields {sigma_cellnode_Pa (48 per active cell: 8 corners x Voigt 6, averaged within the
 * part), vm_cellnode_Pa (8), sigma_cell_Pa (6, Gauss-weighted cell mean), eps_cell (6, total strain, engineering
 * shear, cell mean), sigma_gp_Pa (optional)} and per-part maxima. Active-cell order = num.cells.
 */
export function recoverStress(grid, num, mats, temp, provider, u, { keepGauss = false, fieldPrecision = 'auto' } = {}) {
  const t0 = performance.now();
  const { cells, nen } = num;
  const nca = cells.length;
  const ref = reference(num.type);
  const ue = new Float64Array(3 * nen), Tc = new Float64Array(8), eps = new Float64Array(6), eth = new Float64Array(6), sg = new Float64Array(6);
  const scratch = { e: new Float64Array(6) };
  // output fields: f64, or f32 for large models (memory; derived maxima are always computed in f64)
  const F = fieldPrecision === 'f32' || (fieldPrecision === 'auto' && nca > 200000) ? Float32Array : Float64Array;
  const centre = new F(6 * nca), centreEps = new F(6 * nca);
  const gp = keepGauss ? new Float64Array(6 * ref.ng * nca) : null;
  const np = grid.parts.length;
  const gpMax = Array.from({ length: np }, () => ({ value: -1, cell: -1, xyz_m: null }));
  const { xs, ys, zs, nx, ny } = grid;
  const NX = nx + 1, NY = ny + 1;
  const cornerNode = (c, a) => {
    const i = c % nx, j = Math.floor(c / nx) % ny, k = Math.floor(c / (nx * ny));
    return i + (a & 1) + NX * (j + ((a >> 1) & 1) + NY * (k + ((a >> 2) & 1)));
  };
  // (node, part) accumulation slots: sorted unique keys, one slot index per cell corner (typed arrays, no Map)
  const keys = new Float64Array(8 * nca);
  for (let q = 0; q < nca; q++) { const c = cells[q], p = grid.cellPart[c]; for (let a = 0; a < 8; a++) keys[8 * q + a] = cornerNode(c, a) * np + p; }
  const sorted = Float64Array.from(keys).sort();
  let nu = 0;
  for (let t = 0; t < sorted.length; t++) if (t === 0 || sorted[t] !== sorted[t - 1]) sorted[nu++] = sorted[t];
  const uniq = sorted.subarray(0, nu);
  const slot = new Int32Array(8 * nca);
  for (let t = 0; t < keys.length; t++) {
    let lo = 0, hi = nu - 1;
    const v = keys[t];
    while (lo < hi) { const m = (lo + hi) >> 1; if (uniq[m] < v) lo = m + 1; else hi = m; }
    slot[t] = lo;
  }
  const sums = new Float64Array(7 * nu);
  for (let q = 0; q < nca; q++) {
    const c = cells[q];
    cellCornerT(grid, temp, c, Tc);
    const op = provider.get(c, cellDT(temp, Tc));
    const mat = mats.list[op.mm];
    gather(num, q, u, ue);
    let al = null;
    if (op.type === 'q1im') {
      const { fi } = temp.uniform_K != null || Tc.every((t) => t === Tc[0]) ? { fi: null } : cellThermalLoad(op, mat, Tc, scratch);
      al = internalModes(op, ue, fi);
    }
    const p = grid.cellPart[c];
    const i = c % nx, j = Math.floor(c / nx) % ny, k = Math.floor(c / (nx * ny));
    // Gauss points
    let cx = 0;
    const cs = [0, 0, 0, 0, 0, 0], ce = [0, 0, 0, 0, 0, 0];
    for (let g = 0; g < ref.ng; g++) {
      const x = ref.gpX[3 * g], y = ref.gpX[3 * g + 1], z = ref.gpX[3 * g + 2];
      strainAt(op, x, y, z, ue, al, eps);
      mat.epsTh(interpT(Tc, x, y, z), eth);
      stressFrom(op.D, eps, eth, sg);
      for (let s2 = 0; s2 < 6; s2++) { cs[s2] += ref.gpW[g] * sg[s2]; ce[s2] += ref.gpW[g] * eps[s2]; }
      cx += ref.gpW[g];
      if (gp) gp.set(sg, 6 * (ref.ng * q + g));
      const vm = vonMises(sg);
      if (vm > gpMax[p].value) {
        gpMax[p] = { value: vm, cell: c, xyz_m: [xs[i] + 0.5 * (x + 1) * (xs[i + 1] - xs[i]), ys[j] + 0.5 * (y + 1) * (ys[j + 1] - ys[j]), zs[k] + 0.5 * (z + 1) * (zs[k + 1] - zs[k])] };
      }
    }
    for (let s2 = 0; s2 < 6; s2++) { centre[6 * q + s2] = cs[s2] / cx; centreEps[6 * q + s2] = ce[s2] / cx; }
    // corners: accumulate into the (node, part) slots
    for (let a = 0; a < 8; a++) {
      const x = 2 * (a & 1) - 1, y = 2 * ((a >> 1) & 1) - 1, z = 2 * ((a >> 2) & 1) - 1;
      strainAt(op, x, y, z, ue, al, eps);
      mat.epsTh(Tc[a], eth);
      stressFrom(op.D, eps, eth, sg);
      const o = 7 * slot[8 * q + a];
      for (let s2 = 0; s2 < 6; s2++) sums[o + s2] += sg[s2];
      sums[o + 6]++;
    }
  }
  const avg = new F(48 * nca), vmNode = new F(8 * nca);
  const nodeMax = Array.from({ length: np }, () => ({ value: -1, node: -1 }));
  const tmp6 = new Float64Array(6);
  for (let q = 0; q < nca; q++) {
    const c = cells[q], p = grid.cellPart[c];
    for (let a = 0; a < 8; a++) {
      const o = 7 * slot[8 * q + a];
      for (let s2 = 0; s2 < 6; s2++) { tmp6[s2] = sums[o + s2] / sums[o + 6]; avg[48 * q + 6 * a + s2] = tmp6[s2]; }
      const vm = vonMises(tmp6);
      vmNode[8 * q + a] = vm;
      if (vm > nodeMax[p].value) nodeMax[p] = { value: vm, node: cornerNode(c, a) };
    }
  }
  const perPart = {};
  for (let p = 0; p < np; p++) {
    if (gpMax[p].cell < 0) continue;
    const n = nodeMax[p].node, i = n % NX, j = Math.floor(n / NX) % NY, k = Math.floor(n / (NX * NY));
    const flag = classifyCorner(grid, i, j, k);
    const ng = gpMax[p].cell;
    const gi = ng % nx, gj = Math.floor(ng / nx) % ny, gk = Math.floor(ng / (nx * ny));
    // flag of the GP maximum: any corner of its cell that is singular
    let gflag = null;
    for (let a = 0; a < 8 && !gflag; a++) gflag = classifyCorner(grid, gi + (a & 1), gj + ((a >> 1) & 1), gk + ((a >> 2) & 1));
    perPart[grid.parts[p].id] = {
      vm_max_gp_Pa: gpMax[p].value, vm_max_gp_xyz_m: gpMax[p].xyz_m, vm_max_gp_flag: gflag,
      vm_max_node_Pa: nodeMax[p].value, vm_max_node_xyz_m: [xs[i], ys[j], zs[k]], vm_max_node_flag: flag,
    };
  }
  return {
    fields: { sigma_cellnode_Pa: avg, vm_cellnode_Pa: vmNode, sigma_cell_Pa: centre, eps_cell: centreEps, ...(gp ? { sigma_gp_Pa: gp } : {}) },
    perPart,
    timing_ms: performance.now() - t0,
  };
}

/** Reactions at constrained DOFs: R = K u - f, summed element by element. */
export function reactions(grid, num, mats, temp, provider, u, cons) {
  const { cells, nen } = num;
  const R = new Float64Array(num.ndof);
  const ue = new Float64Array(3 * nen), Tc = new Float64Array(8), scratch = { e: new Float64Array(6) };
  const n3 = 3 * nen;
  for (let q = 0; q < cells.length; q++) {
    const c = cells[q];
    let any = false;
    for (let a = 0; a < nen && !any; a++) { const n = num.conn[q * nen + a]; any = cons.fixed[3 * n] || cons.fixed[3 * n + 1] || cons.fixed[3 * n + 2]; }
    if (!any) continue;
    cellCornerT(grid, temp, c, Tc);
    const op = provider.get(c, cellDT(temp, Tc));
    const { f } = cellThermalLoad(op, mats.list[op.mm], Tc, scratch);
    gather(num, q, u, ue);
    for (let r = 0; r < n3; r++) {
      const dof = 3 * num.conn[q * nen + (r / 3 | 0)] + (r % 3);
      if (!cons.fixed[dof]) continue;
      let s = -f[r];
      for (let k = 0; k < n3; k++) s += op.K[r * n3 + k] * ue[k];
      R[dof] += s;
    }
  }
  let maxAbs = 0;
  const sum = [0, 0, 0];
  for (let d = 0; d < num.ndof; d++) if (cons.fixed[d]) { maxAbs = Math.max(maxAbs, Math.abs(R[d])); sum[d % 3] += R[d]; }
  return { R, max_abs_N: maxAbs, sum_N: sum };
}

/** Corner-node u_z map of a selection: {nodes: [{i, j, x, y, uz, w}], ...}. */
function surfaceNodes(grid, num, u, sel) {
  const { nx, ny, xs, ys } = grid, NX = nx + 1, NY = ny + 1;
  const map = new Map();
  let zset = new Set();
  for (const g of sel.groups) {
    const d = groupDir(g);
    if (d !== 4 && d !== 5) throw new Error('mech: warpage surface must be a top: or bottom: (z-normal) selection');
    for (const c of g.cells) {
      const i = c % nx, j = Math.floor(c / nx) % ny, k = Math.floor(c / (nx * ny)) + (d === 5 ? 1 : 0);
      zset.add(k);
      const area = (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]);
      for (let a = 0; a < 4; a++) {
        const ii = i + (a & 1), jj = j + (a >> 1);
        const n = ii + NX * (jj + NY * k);
        const cn = num.compact[n];
        const key = ii + NX * jj;
        let e = map.get(key);
        if (!e) { e = { i: ii, j: jj, x: xs[ii], y: ys[jj], uz: 0, cnt: 0, w: 0 }; map.set(key, e); }
        e.uz += u[3 * cn + 2]; e.cnt++; e.w += area / 4;
      }
    }
  }
  const nodes = [...map.values()];
  for (const e of nodes) e.uz /= e.cnt;
  return { nodes, map, planes: [...zset] };
}

function solveSmall(A, b, n) {
  // Gaussian elimination with partial pivoting (n <= 6)
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-300) throw new Error('mech: singular least-squares system');
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

/** Weighted least squares with basis functions phi(x, y) -> number[]. */
function lsq(points, basis) {
  const m = basis(0, 0).length;
  const A = Array.from({ length: m }, () => new Array(m).fill(0)), b = new Array(m).fill(0);
  for (const p of points) {
    const f = basis(p.x, p.y), w = p.w ?? 1;
    for (let r = 0; r < m; r++) {
      b[r] += w * f[r] * p.v;
      for (let c = 0; c < m; c++) A[r][c] += w * f[r] * f[c];
    }
  }
  return solveSmall(A, b, m);
}

function bsearch(a, v) {
  let lo = 0, hi = a.length - 2;
  if (v <= a[0]) return 0;
  if (v >= a[a.length - 1]) return a.length - 2;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (a[m] <= v) lo = m;
    else hi = m - 1;
  }
  return lo;
}

/**
 * Warpage per JEITA ED-7306 on a z-normal selection (module header). Returns lengths in um.
 */
export function warpage(grid, num, u, surface, opts = {}) {
  const { samples = 401, sel: sel0 = null } = opts;
  const sel = sel0 ?? lookupSelection(grid, surface);
  const { nodes, map } = surfaceNodes(grid, num, u, sel);
  const symX = grid.symmetry === 'half_x' || grid.symmetry === 'quarter', symY = grid.symmetry === 'half_y' || grid.symmetry === 'quarter';
  let zmin = Infinity, zmax = -Infinity;
  for (const e of nodes) { zmin = Math.min(zmin, e.uz); zmax = Math.max(zmax, e.uz); }
  const basis = (x, y) => [1, ...(symX ? [] : [x]), ...(symY ? [] : [y])];
  const coef = lsq(nodes.map((e) => ({ x: e.x, y: e.y, v: e.uz, w: e.w })), basis);
  let rmin = Infinity, rmax = -Infinity;
  for (const e of nodes) {
    const f = basis(e.x, e.y);
    let s = 0;
    for (let r = 0; r < f.length; r++) s += coef[r] * f[r];
    const r = e.uz - s;
    rmin = Math.min(rmin, r); rmax = Math.max(rmax, r);
  }
  // bounding rectangle of the full (mirrored) surface
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const e of nodes) { x0 = Math.min(x0, e.x); x1 = Math.max(x1, e.x); y0 = Math.min(y0, e.y); y1 = Math.max(y1, e.y); }
  if (symX) x0 = -x1;
  if (symY) y0 = -y1;
  const { xs, ys, nx } = grid, NX = nx + 1;
  const at = (x, y) => {
    const X = symX ? Math.abs(x) : x, Y = symY ? Math.abs(y) : y;
    const i = bsearch(xs, X), j = bsearch(ys, Y);
    const e00 = map.get(i + NX * j), e10 = map.get(i + 1 + NX * j), e01 = map.get(i + NX * (j + 1)), e11 = map.get(i + 1 + NX * (j + 1));
    if (!e00 || !e10 || !e01 || !e11) return null;
    const tx = (X - xs[i]) / (xs[i + 1] - xs[i]), ty = (Y - ys[j]) / (ys[j + 1] - ys[j]);
    return (1 - tx) * (1 - ty) * e00.uz + tx * (1 - ty) * e10.uz + (1 - tx) * ty * e01.uz + tx * ty * e11.uz;
  };
  const diag = (xa, ya, xb, yb) => {
    const za = at(xa, ya), zb = at(xb, yb);
    if (za == null || zb == null) return null;
    let mx = -Infinity, mn = Infinity;
    const prof = [];
    for (let s = 0; s < samples; s++) {
      const t = s / (samples - 1);
      const z = at(xa + t * (xb - xa), ya + t * (yb - ya));
      if (z == null) continue;
      const d = z - (za + t * (zb - za));
      prof.push([t, d]);
      mx = Math.max(mx, d); mn = Math.min(mn, d);
    }
    return { max: mx, min: mn, prof };
  };
  const AB = diag(x0, y0, x1, y1), CD = diag(x0, y1, x1, y0);
  const sum = AB && CD ? AB.max + AB.min + CD.max + CD.min : null;
  const sign = sum == null ? null : sum > 0 ? 1 : sum < 0 ? -1 : 0;
  const cop = rmax - rmin;
  const cz = at(0.5 * (x0 + x1), 0.5 * (y0 + y1));
  const corners = [at(x0, y0), at(x1, y0), at(x0, y1), at(x1, y1)];
  const cmean = corners.every((v) => v != null) ? corners.reduce((a, b) => a + b, 0) / 4 : null;
  const um = 1e6;
  const shape = shapeClass(nodes, coef, basis, AB, CD, cop, { symX, symY, flat_um: opts.flat_um ?? 1 });
  return {
    surface,
    definition: 'jeita_ed7306',
    shape_class: shape.cls,
    shape_criterion: SHAPE_CRITERION,
    shape_detail: shape.detail,
    sign_convention: JEITA_SIGN_CONVENTION,
    view_side: 'top (+z); heights are u_z with z up',
    warpage_um: sign == null ? null : sign * cop * um,
    coplanarity_um: cop * um,
    raw_um: (zmax - zmin) * um,
    centre_minus_corner_um: cz != null && cmean != null ? (cz - cmean) * um : null,
    diagonals_um: AB && CD ? { AB_max: AB.max * um, AB_min: AB.min * um, CD_max: CD.max * um, CD_min: CD.min * um } : null,
    best_fit_plane: { terms: ['1', ...(symX ? [] : ['x'])].concat(symY ? [] : ['y']), coef },
    nodes: nodes.length,
  };
}

export const SHAPE_CRITERION =
  'flat: coplanarity < flat_um (1 um); saddle: principal curvatures of the quadratic fit of u_z over the surface (best-fit plane removed) have opposite signs and the smaller magnitude is >= 10 % of the larger; dome / bowl: the deviation from the chord along both diagonals is single-signed (positive: dome, centre up; negative: bowl) and unimodal (one interior extremum, tolerance 2 % of its range); W: otherwise (multi-modal profile, e.g. W or M shapes)';

/** Shape class of a warpage surface (SHAPE_CRITERION). */
function shapeClass(nodes, plane, planeBasis, AB, CD, cop, { symX, symY, flat_um }) {
  if (cop * 1e6 < flat_um) return { cls: 'flat', detail: { coplanarity_um: cop * 1e6 } };
  // quadratic fit of the residual over the whole surface (odd terms dropped on crops)
  const res = nodes.map((e) => { const f = planeBasis(e.x, e.y); let p = 0; for (let r = 0; r < f.length; r++) p += plane[r] * f[r]; return { x: e.x, y: e.y, v: e.uz - p, w: e.w }; });
  const terms = [(x, y) => 1, ...(symX ? [] : [(x) => x]), ...(symY ? [] : [(x, y) => y]), (x) => (x * x) / 2, ...(symX || symY ? [] : [(x, y) => x * y]), (x, y) => (y * y) / 2];
  const c = lsq(res, (x, y) => terms.map((t) => t(x, y)));
  const wxx = c[terms.length - (symX || symY ? 2 : 3)], wyy = c[terms.length - 1], wxy = symX || symY ? 0 : c[terms.length - 2];
  const tr = wxx + wyy, dt = Math.sqrt(((wxx - wyy) / 2) ** 2 + wxy * wxy);
  const k1 = tr / 2 + dt, k2 = tr / 2 - dt;
  const detail = { w_xx_1_m: wxx, w_yy_1_m: wyy, w_xy_1_m: wxy, principal_1_m: [k1, k2] };
  if (k1 * k2 < 0 && Math.min(Math.abs(k1), Math.abs(k2)) >= 0.1 * Math.max(Math.abs(k1), Math.abs(k2))) return { cls: 'saddle', detail };
  const uni = (d) => {
    if (!d || d.prof.length < 5) return null;
    const v = d.prof.map((p) => p[1]), rng = d.max - d.min, tol = 0.02 * rng;
    const sgn = Math.abs(d.max) >= Math.abs(d.min) ? 1 : -1;
    // single-signed and one interior extremum: rises then falls (dome) / falls then rises (bowl)
    if (sgn > 0 ? d.min < -tol : d.max > tol) return { ok: false, sgn };
    let turns = 0, dir = 0;
    for (let i = 1; i < v.length; i++) {
      const dv = sgn * (v[i] - v[i - 1]);
      const nd = dv > tol / 10 ? 1 : dv < -tol / 10 ? -1 : 0;
      if (nd && dir && nd !== dir) turns++;
      if (nd) dir = nd;
    }
    return { ok: turns <= 1, sgn, turns };
  };
  const a = uni(AB), b = uni(CD);
  detail.diagonal_turns = [a?.turns ?? null, b?.turns ?? null];
  if (a?.ok && b?.ok && a.sgn === b.sgn) return { cls: a.sgn > 0 ? 'dome' : 'bowl', detail };
  return { cls: 'W', detail };
}

/**
 * Quadratic curvature fit of u_z on the node plane nearest to z_m, over the central `frac` of the (full, mirrored)
 * extent in x and y. Optional `region` {x: [lo, hi], y: [lo, hi]} (m) replaces the central-fraction window.
 */
export function curvatureFit(grid, num, u, { z_m, frac = 0.5, region = null } = {}) {
  const { xs, ys, zs, nx, ny } = grid, NX = nx + 1, NY = ny + 1;
  let k = 0;
  for (let kk = 0; kk < zs.length; kk++) if (Math.abs(zs[kk] - z_m) < Math.abs(zs[k] - z_m)) k = kk;
  const symX = grid.symmetry === 'half_x' || grid.symmetry === 'quarter', symY = grid.symmetry === 'half_y' || grid.symmetry === 'quarter';
  const pts = [];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let j = 0; j < NY; j++)
    for (let i = 0; i < NX; i++) {
      const cn = num.compact[i + NX * (j + NY * k)];
      if (cn < 0) continue;
      x0 = Math.min(x0, xs[i]); x1 = Math.max(x1, xs[i]); y0 = Math.min(y0, ys[j]); y1 = Math.max(y1, ys[j]);
      // symmetry crops: nodes on a mirror plane stand for one node of the full model, the others for two (x) / four
      pts.push({ x: xs[i], y: ys[j], v: u[3 * cn + 2], w: (symX && i === 0 ? 0.5 : 1) * (symY && j === 0 ? 0.5 : 1) });
    }
  if (symX) x0 = -x1;
  if (symY) y0 = -y1;
  const xc = 0.5 * (x0 + x1), yc = 0.5 * (y0 + y1), hx = 0.5 * frac * (x1 - x0), hy = 0.5 * frac * (y1 - y0);
  const inside = region
    ? (p) => p.x >= region.x[0] && p.x <= region.x[1] && p.y >= region.y[0] && p.y <= region.y[1]
    : (p) => Math.abs(p.x - xc) <= hx * (1 + 1e-9) && Math.abs(p.y - yc) <= hy * (1 + 1e-9);
  const sel = pts.filter(inside).map((p) => ({ ...p, x: p.x - xc, y: p.y - yc }));
  // terms: odd terms vanish by symmetry and are not fitted on a crop (the crop fit then equals the full-model fit);
  // a term is fitted only when the window spans enough distinct coordinates (strips, coarse cubes: L5 report)
  const distinct = (vals) => new Set(vals.map((v) => Math.round(v * 1e12))).size;
  const nX = distinct(sel.map((p) => p.x)), nY = distinct(sel.map((p) => p.y));
  const want = {
    x: !symX && nX >= 2, y: !symY && nY >= 2,
    xx: symX ? nX >= 2 : nX >= 3, yy: symY ? nY >= 2 : nY >= 3,
    xy: !symX && !symY && nX >= 2 && nY >= 2,
  };
  const all = [['1', () => 1], ['x', (x) => x], ['y', (x, y) => y], ['xx', (x) => (x * x) / 2], ['xy', (x, y) => x * y], ['yy', (x, y) => (y * y) / 2]];
  const used = all.filter(([nm]) => nm === '1' || want[nm]);
  if (!want.xx && !want.yy) throw new Error(`mech: curvature fit window spans ${nX} x and ${nY} y node lines: no quadratic term can be fitted`);
  if (sel.length < used.length) throw new Error(`mech: curvature fit has ${sel.length} nodes for ${used.length} terms`);
  const cf = lsq(sel, (x, y) => used.map(([, t]) => t(x, y)));
  const names = used.map(([nm]) => nm);
  const get = (nm) => (names.includes(nm) ? cf[names.indexOf(nm)] : null);
  const zeroBySym = (nm) => (nm === 'x' && symX) || (nm === 'y' && symY) || (nm === 'xy' && (symX || symY));
  const c = ['1', 'x', 'y', 'xx', 'xy', 'yy'].map((nm) => get(nm) ?? (zeroBySym(nm) ? 0 : null));
  return {
    z_m: zs[k], nodes: sel.length, terms: names, distinct_x: nX, distinct_y: nY,
    w_xx_1_m: c[3], w_yy_1_m: c[5], w_xy_1_m: c[4],
    kappa_clt_x_1_m: c[3] == null ? null : -c[3], kappa_clt_y_1_m: c[5] == null ? null : -c[5], coef: c,
  };
}

/**
 * Part-averaged stress (Voigt, Pa) at the corner node nearest to xyz_m, from the cells of part `partId` touching it.
 */
export function probeStress(res, partId, xyz_m) {
  const grid = res.grid, num = res._num, f = res.fields.sigma_cellnode_Pa;
  const p = grid.parts.findIndex((q) => q.id === partId);
  if (p < 0) throw new Error(`mech: probe: unknown part ${partId}`);
  const near = (a, v) => { let b = 0; for (let i = 1; i < a.length; i++) if (Math.abs(a[i] - v) < Math.abs(a[b] - v)) b = i; return b; };
  const i = near(grid.xs, xyz_m[0]), j = near(grid.ys, xyz_m[1]), k = near(grid.zs, xyz_m[2]);
  const { nx, ny } = grid;
  if (!res._cellPos) {
    const pos = new Int32Array(grid.cellPart.length).fill(-1);
    num.cells.forEach((c, q) => { pos[c] = q; });
    Object.defineProperty(res, '_cellPos', { value: pos, enumerable: false });
  }
  for (let a = 0; a < 8; a++) {
    const ci = i - (a & 1), cj = j - ((a >> 1) & 1), ck = k - ((a >> 2) & 1);
    if (ci < 0 || cj < 0 || ck < 0 || ci >= nx || cj >= ny || ck >= grid.nz) continue;
    const c = ci + nx * (cj + ny * ck);
    if (grid.cellPart[c] !== p) continue;
    const q = res._cellPos[c];
    return Array.from(f.subarray(48 * q + 6 * a, 48 * q + 6 * a + 6));
  }
  throw new Error(`mech: probe: part ${partId} does not touch the node at ${xyz_m.join(', ')}`);
}

/** u (3) at the corner node nearest to xyz_m. */
export function probeU(res, xyz_m) {
  const grid = res.grid;
  const near = (a, v) => { let b = 0; for (let i = 1; i < a.length; i++) if (Math.abs(a[i] - v) < Math.abs(a[b] - v)) b = i; return b; };
  const n = near(grid.xs, xyz_m[0]) + (grid.nx + 1) * (near(grid.ys, xyz_m[1]) + (grid.ny + 1) * near(grid.zs, xyz_m[2]));
  if (!res.fields.node_active[n]) throw new Error(`mech: probe: inactive node near ${xyz_m.join(', ')}`);
  return Array.from(res.fields.u_m.subarray(3 * n, 3 * n + 3));
}
