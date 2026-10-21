// Steady heat conduction on the rectilinear package grid (tranche E1; DevLog-010 A2-A4; SPEC sections 1, 5).
// -div(k grad T) = q with k per cell (diagonal or full symmetric tensor), Q1 hex elements (assemble.mjs), BCs on named
// exterior-face selections, uniform volumetric sources on parts, flux patches, zero-thickness contact resistances on
// z-normal part interfaces, Picard iteration when k depends on T. The unknown is theta = T - T0 (T0 = first fixed-T,
// ambient or initial value) so solver tolerances act on the rise. Shared core (prepareThermal, assembleThermal,
// makeSolver) is reused by the transient solver (transient.mjs).
// Solvers: 'direct' (ported supernodal Cholesky, grid nested dissection), 'pcg_mg' (PCG + z-line GMG), 'pcg_jacobi',
// 'auto' (direct up to AUTO_DIRECT_MAX free nodes).
// License: GPL-3.0-or-later.

import { createStencil, padded, StencilCholesky } from '../la/stencil.mjs';
import { buildMG, mgPrecond } from '../la/mg.mjs';
import { accelerateMG } from '../la/wasm/accel.mjs';
import { pcg, jacobiPrecond } from '../la/pcg.mjs';
import { activeNodes, resolveSelection, matchParts, groupDir, SEL_RE } from '../grid/index.mjs';
import { parseExpression, evaluateAst } from '../params/params.mjs';
import { assembleConduction, addRobinFace, addFluxFace, addCellSources, addFieldSource, applyConstraints, cellNode } from './assemble.mjs';

export const C_TO_K = 273.15;
// bench 2026-10-20 (L1 notes): at 1.3e4 free nodes PCG + MG (93 ms) already beats direct ND (154 ms); direct stays the
// default below 1e4 free nodes, where it is fast and needs no convergence check
export const AUTO_DIRECT_MAX = 10000;
export const SOLVERS = Object.freeze(['auto', 'direct', 'pcg_mg', 'pcg_jacobi']);
export const THERMAL_KEYS = Object.freeze(['sources', 'bcs', 'source_patch', 'initial_C', 'solver']);

const BC_KEYS = {
  temperature: ['T_C', 'T_K'],
  temperature_field: ['T_C', 'T_K', 'origin'],
  htc: ['h_W_m2K', 'T_inf_C', 'T_inf_K'],
  heat_flux: ['q_W_m2', 'flux_W_m2', 'power_W'],
  adiabatic: [],
  symmetry: [],
  contact_resistance: ['R_m2K_W'],
};
const SOURCE_KEYS = ['parts', 'power_W', 'density_W_m3', 'distribution', 'note'];
const PATCH_KEYS = ['selection', 'x_mm', 'y_mm', 'w_mm', 'd_mm', 'total_W', 'q_W_m2', 'note'];

function checkKeys(obj, allowed, where) {
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) throw new Error(`${where}: unknown key ${k} (allowed: ${allowed.join(', ')})`);
}

const tempK = (o, cKey, kKey, where) => {
  if (o[kKey] != null && o[cKey] != null) throw new Error(`${where}: give ${cKey} or ${kKey}, not both`);
  const v = o[kKey] != null ? o[kKey] : o[cKey] != null ? o[cKey] + C_TO_K : null;
  if (v == null || !Number.isFinite(v)) throw new Error(`${where}: ${cKey} is required`);
  return v;
};

/**
 * Parse SPEC physics.thermal.bcs into normalized objects (K, W/m^2). `temperature_field` becomes type temperature with
 * `T_fn(x, y, z)` (expression in x, y, z in m; origin `model` = engine coordinates, `min_corner` = full-model min
 * corner); internal `T_K_fn` (tests) likewise. `flux_W_m2` is an alias of `q_W_m2`.
 */
export function parseBCs(bcs = []) {
  return bcs.map((bc, q) => {
    const where = `thermal.bcs[${q}]`;
    if (!bc || typeof bc.selection !== 'string') throw new Error(`${where}: selection (string) is required`);
    if (!Object.hasOwn(BC_KEYS, bc.type)) throw new Error(`${where}: unknown type ${bc.type} (expected ${Object.keys(BC_KEYS).join(' | ')})`);
    const { selection, type, T_K_fn, T_inf_K_fn, ...rest } = bc;
    checkKeys(rest, [...BC_KEYS[type], 'note'], where);
    const out = { selection, type, where };
    if (type === 'temperature') {
      if (T_K_fn) out.T_K_fn = T_K_fn;
      else out.T_K = tempK(bc, 'T_C', 'T_K', where);
    } else if (type === 'temperature_field') {
      if ((bc.T_C == null) === (bc.T_K == null)) throw new Error(`${where}: give exactly one of T_C, T_K (expression in x, y, z in m)`);
      const src = String(bc.T_C ?? bc.T_K);
      let ast;
      try {
        ast = parseExpression(src.startsWith('=') ? src.slice(1) : src);
      } catch (e) {
        throw new Error(`${where}: ${e.message}`);
      }
      const off = bc.T_C != null ? C_TO_K : 0;
      out.type = 'temperature';
      out.kind = 'temperature_field';
      out.origin = bc.origin ?? 'model';
      if (!['model', 'min_corner'].includes(out.origin)) throw new Error(`${where}: origin must be model or min_corner`);
      out.T_fn = (x, y, z) => evaluateAst(ast, { x, y, z }, src) + off;
    } else if (type === 'htc') {
      if (!(bc.h_W_m2K >= 0)) throw new Error(`${where}: h_W_m2K >= 0 is required`);
      out.h = bc.h_W_m2K;
      if (T_inf_K_fn) {
        out.T_inf_K_fn = T_inf_K_fn; // internal (verification tests): ambient temperature field T_inf(x, y, z) in K
        out.T_inf_K = bc.T_inf_K ?? (bc.T_inf_C != null ? bc.T_inf_C + C_TO_K : 298.15);
      } else out.T_inf_K = tempK(bc, 'T_inf_C', 'T_inf_K', where);
    } else if (type === 'heat_flux') {
      const qq = bc.q_W_m2 ?? bc.flux_W_m2;
      if (bc.q_W_m2 != null && bc.flux_W_m2 != null) throw new Error(`${where}: give q_W_m2 or flux_W_m2, not both`);
      if ((qq == null) === (bc.power_W == null)) throw new Error(`${where}: give exactly one of q_W_m2, power_W`);
      if (qq != null) out.q = qq;
      else out.power_W = bc.power_W;
    } else if (type === 'contact_resistance') {
      if (!(bc.R_m2K_W > 0)) throw new Error(`${where}: R_m2K_W > 0 is required`);
      if (!selection.startsWith('interface:')) throw new Error(`${where}: contact_resistance needs an interface:<a>|<b> selection`);
      out.R = bc.R_m2K_W;
    }
    if (type !== 'contact_resistance' && selection.startsWith('interface:')) throw new Error(`${where}: interface selections take type contact_resistance only`);
    if (type === 'symmetry' && !selection.startsWith('sym:')) throw new Error(`${where}: type symmetry needs a sym:x or sym:y selection`);
    if (type !== 'symmetry' && selection.startsWith('sym:')) throw new Error(`${where}: ${selection} is a symmetry plane; only type symmetry applies there`);
    return out;
  });
}

/** Interface part pair of `interface:<a>|<b>` (or `<a>/<b>`). */
export function interfacePair(sel) {
  const body = sel.slice('interface:'.length);
  const sep = body.includes('|') ? '|' : '/';
  const pr = body.split(sep);
  if (pr.length !== 2 || !pr[0] || !pr[1]) throw new Error(`selection ${sel}: expected interface:<a>|<b>`);
  return pr;
}

/** Flux patches (L4-2) as a list. */
function patchList(thermal) {
  const sp = thermal?.source_patch;
  return sp == null ? [] : Array.isArray(sp) ? sp : [sp];
}

/**
 * Grid options a thermal block needs (pass them to buildGrid): planes at flux-patch edges, contact interfaces.
 * @returns {{planes: {x_mm: number[], y_mm: number[]}, interfaces: Array<[string, string]>}}
 */
export function thermalGridOptions(thermal) {
  const x = [], y = [];
  for (const p of patchList(thermal)) {
    x.push(p.x_mm - p.w_mm / 2, p.x_mm + p.w_mm / 2);
    y.push(p.y_mm - p.d_mm / 2, p.y_mm + p.d_mm / 2);
  }
  const interfaces = [];
  for (const b of thermal?.bcs ?? []) if (b?.type === 'contact_resistance' && typeof b.selection === 'string' && b.selection.startsWith('interface:')) interfaces.push(interfacePair(b.selection));
  return { planes: { x_mm: x, y_mm: y }, interfaces };
}

/** Part indices named by a selection (top|bottom|side|xmin..:<glob>), or null for default / sym. */
function selectionParts(grid, name) {
  const m = SEL_RE.exec(name);
  return m ? matchParts(grid, m[2]) : null;
}

/** Throw unless the part set is closed under the active mirror maps. */
function checkMirrorClosed(grid, idx, where) {
  const set = new Set(idx);
  for (const ax of ['x', 'y']) {
    const mp = grid.mirror?.[ax];
    if (!mp) continue;
    for (const p of idx)
      if (!set.has(mp[p])) throw new Error(`${where}: not symmetric under the ${grid.symmetry} crop (part ${grid.parts[p].id} is included, its mirror ${grid.parts[mp[p]].id} is not)`);
  }
}

/** Normalize a resolver k into 6 components (kxx, kyy, kzz, kxy, kxz, kyz); checks positive definiteness. */
export function kComponents(kk, key) {
  let v;
  if (typeof kk === 'number') v = [kk, kk, kk, 0, 0, 0];
  else if (Array.isArray(kk) && kk.length === 1 && typeof kk[0] === 'number') v = [kk[0], kk[0], kk[0], 0, 0, 0];
  else if (Array.isArray(kk) && kk.length === 3 && kk.every((x) => typeof x === 'number')) v = [kk[0], kk[1], kk[2], 0, 0, 0];
  else if (Array.isArray(kk) && kk.length === 3 && kk.every((r) => Array.isArray(r) && r.length === 3)) {
    const sym = Math.abs(kk[0][1] - kk[1][0]) + Math.abs(kk[0][2] - kk[2][0]) + Math.abs(kk[1][2] - kk[2][1]);
    if (sym > 1e-9 * Math.max(...kk.flat().map(Math.abs))) throw new Error(`thermal: material ${key}: k tensor is not symmetric`);
    v = [kk[0][0], kk[1][1], kk[2][2], kk[0][1], kk[0][2], kk[1][2]];
  } else throw new Error(`thermal: material ${key}: k_W_mK must be a positive number, [kx, ky, kz] or a 3 x 3 tensor (got ${JSON.stringify(kk)})`);
  if (!v.every(Number.isFinite)) throw new Error(`thermal: material ${key}: k_W_mK has non-finite entries`);
  const [a, b, c, d, e, f] = v;
  const m2 = a * b - d * d, m3 = a * (b * c - f * f) - d * (d * c - f * e) + e * (d * f - b * e);
  if (!(a > 0 && m2 > 0 && m3 > 0)) throw new Error(`thermal: material ${key}: k_W_mK must be positive definite (got ${JSON.stringify(kk)})`);
  return v;
}

/** Spacing (K) of the k(T) sample grid; k is linear between samples (smooth in T, so Picard has no rounding floor). */
export const K_SAMPLE_DK = 0.5;

/**
 * Per-cell conductivity, 6 per cell, from the resolver at per-cell temperatures (K). Constant-k runs (all cells at T0)
 * call the resolver at T0 exactly; otherwise k is interpolated linearly between resolver samples on a 0.5 K grid
 * (cached per material), which keeps the map T -> k continuous for the Picard iteration.
 */
function cellK(grid, resolve, Tcell, cache, exactT = null) {
  const { cellMat, materials } = grid;
  const n = cellMat.length;
  const k = new Float64Array(6 * n);
  let tensor = false;
  const sample = (m, T) => {
    const key = `${m}|${T}`;
    let v = cache.get(key);
    if (!v) {
      let r;
      try {
        r = resolve(materials[m], T, { need: ['k'] });
      } catch (e) {
        throw new Error(`thermal: material ${materials[m]}: ${e.message}`);
      }
      v = kComponents(r?.k_W_mK, materials[m]);
      cache.set(key, v);
    }
    return v;
  };
  const tmp = new Float64Array(6);
  for (let c = 0; c < n; c++) {
    const m = cellMat[c];
    if (m < 0) continue;
    const T = Tcell[c];
    let v;
    if (exactT != null) v = sample(m, exactT);
    else {
      const T0 = Math.floor(T / K_SAMPLE_DK) * K_SAMPLE_DK, w = (T - T0) / K_SAMPLE_DK;
      const a = sample(m, +T0.toFixed(6));
      if (w < 1e-12) v = a;
      else {
        const b = sample(m, +(T0 + K_SAMPLE_DK).toFixed(6));
        for (let q = 0; q < 6; q++) tmp[q] = (1 - w) * a[q] + w * b[q];
        v = tmp;
      }
    }
    if (v[3] || v[4] || v[5]) tensor = true;
    k.set(v, 6 * c);
  }
  return { k, tensor };
}

/** Probe offsets (K) of the k(T) dependence check (audit A1 M1: +-10 K alone missed tables flat near T0). */
export const K_PROBES_DT = Object.freeze([10, -10, 50, -50, 100, -100, 200, -200]);

/**
 * Does any used material change k over T0 + K_PROBES_DT (probes outside a material's valid range are skipped; when
 * every probe is outside, assume T dependent so Picard runs)?
 */
function tDependent(grid, resolve, T0) {
  for (const key of grid.materials) {
    const a = JSON.stringify(resolve(key, T0, { need: ['k'] })?.k_W_mK);
    let probed = 0;
    for (const dT of K_PROBES_DT) {
      if (T0 + dT <= 0) continue;
      let b;
      try {
        b = JSON.stringify(resolve(key, T0 + dT, { need: ['k'] })?.k_W_mK);
      } catch {
        continue;
      }
      probed++;
      if (a !== b) return true;
    }
    if (!probed) return true;
  }
  return false;
}

const cellIjk = (grid, c) => [c % grid.nx, Math.floor(c / grid.nx) % grid.ny, Math.floor(c / (grid.nx * grid.ny))];

/**
 * Parse and map the thermal block onto the grid: BC face claims, sources, patches, Dirichlet values, contacts.
 * @param {object} grid
 * @param {object} thermal SPEC physics.thermal
 * @param {{T0?: number, sourceFn?: Function, requireAnchor?: boolean}} [opt]
 */
export function prepareThermal(grid, thermal, { T0: T0opt = null, sourceFn = null, requireAnchor = true } = {}) {
  checkKeys(thermal ?? {}, THERMAL_KEYS, 'physics.thermal');
  const warnings = [];
  const { nx, ny, nz, xs, ys, zs, cellPart, parts, symFactor } = grid;
  const NX = nx + 1, NY = ny + 1, NZ = nz + 1, N = NX * NY * NZ, ncell = nx * ny * nz;
  const bcs = parseBCs(thermal?.bcs ?? []);
  const firstT = bcs.find((b) => b.type === 'temperature' && b.T_K != null)?.T_K ?? bcs.find((b) => b.type === 'htc')?.T_inf_K;
  const T0 = T0opt ?? firstT ?? 298.15;
  // face claims: later explicit BCs override earlier ones; default only takes unclaimed faces
  const faceBC = new Int32Array(6 * ncell).fill(-1);
  const defaults = bcs.map((b, q) => [b, q]).filter(([b]) => b.selection === 'default');
  if (defaults.length > 1) throw new Error('thermal: more than one BC on the default selection');
  const selArea = new Float64Array(bcs.length);
  const contacts = [];
  bcs.forEach((b, q) => {
    if (b.selection === 'default') return;
    if (b.type === 'contact_resistance') {
      const sel = grid.selections[b.selection];
      if (!sel) throw new Error(`${b.where}: ${b.selection} is not in the grid; build it with buildGrid(..., {interfaces: thermalGridOptions(thermal).interfaces})`);
      contacts.push({ cells: sel.cells, R: b.R, axis: sel.axis ?? 'z' });
      return;
    }
    const sel = resolveSelection(grid, b.selection);
    if (!sel || !sel.faces) throw new Error(`${b.where}: selection ${b.selection} has no exterior faces in this model`);
    if (b.power_W != null) {
      const ps = selectionParts(grid, b.selection);
      if (ps) checkMirrorClosed(grid, ps, b.where);
      else if (symFactor > 1) throw new Error(`${b.where}: power_W on ${b.selection} cannot be mapped through the symmetry crop; use q_W_m2`);
    }
    for (const g of sel.groups) {
      const d = groupDir(g);
      for (const c of g.cells) faceBC[6 * c + d] = q;
    }
  });
  if (defaults.length) {
    const [b, q] = defaults[0];
    if (b.type === 'contact_resistance') throw new Error(`${b.where}: contact_resistance needs an interface selection`);
    for (const g of grid.selections.default.groups) {
      const d = groupDir(g);
      for (const c of g.cells) if (faceBC[6 * c + d] < 0) faceBC[6 * c + d] = q;
    }
    if (b.power_W != null && symFactor > 1) throw new Error(`${b.where}: power_W on default cannot be mapped through the symmetry crop; use q_W_m2`);
  }
  const fArea = (c, d) => {
    const [i, j, k] = cellIjk(grid, c);
    const h = [xs[i + 1] - xs[i], ys[j + 1] - ys[j], zs[k + 1] - zs[k]];
    return d < 2 ? h[1] * h[2] : d < 4 ? h[0] * h[2] : h[0] * h[1];
  };
  for (let c = 0; c < ncell; c++) for (let d = 0; d < 6; d++) if (faceBC[6 * c + d] >= 0) selArea[faceBC[6 * c + d]] += fArea(c, d);
  for (let q = 0; q < bcs.length; q++)
    if (!['symmetry', 'adiabatic', 'contact_resistance'].includes(bcs[q].type) && selArea[q] === 0) warnings.push(`${bcs[q].where}: no faces left after later BCs claimed them`);
  // sources (full-model power -> density over the full-model meshed volume of the matched parts)
  const qCell = new Float64Array(ncell);
  const cellVol = (c) => {
    const [i, j, k] = cellIjk(grid, c);
    return (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]) * (zs[k + 1] - zs[k]);
  };
  (thermal?.sources ?? []).forEach((s, q) => {
    const where = `thermal.sources[${q}]`;
    checkKeys(s, SOURCE_KEYS, where);
    if (s.distribution != null && s.distribution !== 'uniform_volume') throw new Error(`${where}: distribution ${s.distribution} not supported (uniform_volume)`);
    if ((s.power_W == null) === (s.density_W_m3 == null)) throw new Error(`${where}: give exactly one of power_W, density_W_m3`);
    const globs = Array.isArray(s.parts) ? s.parts : [s.parts];
    const idx = [...new Set(globs.flatMap((g) => matchParts(grid, g)))];
    if (!idx.length) throw new Error(`${where}: parts ${globs.join(', ')} match no part`);
    const mask = new Uint8Array(parts.length);
    for (const p of idx) mask[p] = 1;
    let V = 0;
    for (let c = 0; c < ncell; c++) if (cellPart[c] >= 0 && mask[cellPart[c]]) V += cellVol(c);
    if (s.power_W != null) {
      checkMirrorClosed(grid, idx, where);
      if (!(V > 0)) throw new Error(`${where}: matched parts own no cells`);
    }
    const dens = s.density_W_m3 != null ? s.density_W_m3 : s.power_W / (V * symFactor);
    for (let c = 0; c < ncell; c++) if (cellPart[c] >= 0 && mask[cellPart[c]]) qCell[c] += dens;
  });
  // flux patches on z faces of a selection (L4-2): faces whose centre lies inside the rectangle
  const patches = [];
  const symX = grid.symmetry === 'half_x' || grid.symmetry === 'quarter', symY = grid.symmetry === 'half_y' || grid.symmetry === 'quarter';
  patchList(thermal).forEach((p, q) => {
    const where = `thermal.source_patch[${q}]`;
    checkKeys(p, PATCH_KEYS, where);
    for (const k of ['x_mm', 'y_mm', 'w_mm', 'd_mm']) if (!Number.isFinite(p[k])) throw new Error(`${where}: ${k} is required`);
    if ((p.total_W == null) === (p.q_W_m2 == null)) throw new Error(`${where}: give exactly one of total_W, q_W_m2`);
    if ((symX && Math.abs(p.x_mm) > 1e-9) || (symY && Math.abs(p.y_mm) > 1e-9)) throw new Error(`${where}: patch not centred on the ${grid.symmetry} symmetry plane(s)`);
    const sel = resolveSelection(grid, p.selection);
    if (!sel || !sel.faces) throw new Error(`${where}: selection ${p.selection} has no exterior faces`);
    const x0 = (p.x_mm - p.w_mm / 2) * 1e-3, x1 = (p.x_mm + p.w_mm / 2) * 1e-3, y0 = (p.y_mm - p.d_mm / 2) * 1e-3, y1 = (p.y_mm + p.d_mm / 2) * 1e-3;
    const qf = p.q_W_m2 ?? p.total_W / ((x1 - x0) * (y1 - y0));
    const faces = [];
    let area = 0;
    for (const g of sel.groups) {
      if (g.axis !== 'z') continue;
      const d = groupDir(g);
      for (const c of g.cells) {
        const [i, j] = cellIjk(grid, c);
        const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
        if (cx > x0 && cx < x1 && cy > y0 && cy < y1) {
          faces.push(c, d);
          area += fArea(c, d);
        }
      }
    }
    const want = (Math.min(x1, xs[nx]) - Math.max(x0, xs[0])) * (Math.min(y1, ys[ny]) - Math.max(y0, ys[0]));
    if (!(Math.abs(area - want) <= 1e-9 * want))
      throw new Error(`${where}: faces of ${p.selection} cover ${(area * 1e6).toPrecision(6)} mm^2 of the ${(want * 1e6).toPrecision(6)} mm^2 patch (patch edges must be grid planes: buildGrid planes from thermalGridOptions, and the patch must lie on the selection)`);
    patches.push({ faces, q: qf });
  });
  // Dirichlet values (theta) per node
  const active = activeNodes(grid);
  const Td = new Float64Array(N).fill(NaN);
  const x0m = symX ? -xs[nx] : xs[0], y0m = symY ? -ys[ny] : ys[0], z0m = zs[0];
  bcs.forEach((b, q) => {
    if (b.type !== 'temperature') return;
    const fn = b.T_K_fn ?? (b.T_fn ? (b.origin === 'min_corner' ? (x, y, z) => b.T_fn(x - x0m, y - y0m, z - z0m) : b.T_fn) : null);
    for (let c = 0; c < ncell; c++)
      for (let d = 0; d < 6; d++) {
        if (faceBC[6 * c + d] !== q) continue;
        const [i, j, k] = cellIjk(grid, c);
        const ax = d >> 1, sb = d & 1;
        for (let a = 0; a < 8; a++) {
          if (((a >> ax) & 1) !== sb) continue;
          const n = cellNode(NX, NY, i, j, k, a);
          Td[n] = (fn ? fn(xs[i + (a & 1)], ys[j + ((a >> 1) & 1)], zs[k + (a >> 2)]) : b.T_K) - T0;
        }
      }
  });
  if (requireAnchor) {
    const floating = unanchoredBodies(grid, faceBC, bcs);
    if (floating.length) {
      const B = floating[0];
      throw new Error(`thermal: no temperature or htc boundary on ${floating.length > 1 ? `${floating.length} bodies, e.g. ` : ''}the body with parts ${B.parts.slice(0, 6).join(', ')}${B.parts.length > 6 ? ', ...' : ''} (${B.cells} cells): the steady problem is singular; add a fixed-T or HTC boundary that this body touches`);
    }
  }
  return { grid, bcs, faceBC, selArea, qCell, patches, contacts, Td, active, T0, sourceFn, warnings, N, NX, NY, NZ };
}

/**
 * Apply contact resistances to the sliver cells: normal k = delta / (R + delta / k_n,upper), tangential and cross
 * terms 0 (exact 1D; the normal is z, x or y per the interface).
 */
function applyContacts(prep, kc) {
  const { grid } = prep;
  for (const { cells, R, axis } of prep.contacts) {
    const ax = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    for (const c of cells) {
      const ijk = cellIjk(grid, c);
      const arr = [grid.xs, grid.ys, grid.zs][ax];
      const d = arr[ijk[ax] + 1] - arr[ijk[ax]];
      const kn = kc[6 * c + ax];
      const v = [0, 0, 0, 0, 0, 0];
      v[ax] = d / (R + d / kn);
      kc.set(v, 6 * c);
    }
  }
}

/**
 * Assemble the unconstrained conduction operator (with Robin terms) and loads for per-cell k.
 * @returns {{op, F: Float64Array, robinFaces: number[], Qsrc: number, Qflux: number}}
 */
export function assembleThermal(prep, kCell) {
  const { grid, bcs, faceBC, selArea, qCell, patches, T0, sourceFn, N, NX, NY, NZ } = prep;
  applyContacts(prep, kCell.k);
  const op = createStencil(NX, NY, NZ);
  const F = new Float64Array(N);
  assembleConduction(grid, kCell.k, op, 6);
  let Qsrc = addCellSources(grid, F, qCell);
  if (sourceFn) Qsrc += addFieldSource(grid, F, sourceFn);
  let Qflux = 0;
  const robinFaces = [];
  const ncell = grid.nx * grid.ny * grid.nz;
  for (let c = 0; c < ncell; c++)
    for (let d = 0; d < 6; d++) {
      const q = faceBC[6 * c + d];
      if (q < 0) continue;
      const b = bcs[q];
      if (b.type === 'htc') {
        const fn = b.T_inf_K_fn ? (x, y, z) => b.T_inf_K_fn(x, y, z) - T0 : null;
        const hTi = addRobinFace(grid, op, F, c, d, b.h, b.T_inf_K - T0, fn);
        robinFaces.push(c, d, q, hTi);
      } else if (b.type === 'heat_flux') {
        const qf = b.q != null ? b.q : b.power_W / (selArea[q] * grid.symFactor);
        Qflux += addFluxFace(grid, F, c, d, qf) * qf;
      }
    }
  for (const p of patches) for (let t = 0; t < p.faces.length; t += 2) Qflux += addFluxFace(grid, F, p.faces[t], p.faces[t + 1], p.q) * p.q;
  return { op, F, robinFaces, Qsrc, Qflux };
}

/** Robin outflow sum h (theta - theta_inf) over the HTC faces (modelled part, W). */
export function robinOut(prep, robinFaces, theta) {
  const { grid, bcs, T0, NX, NY } = prep;
  const { xs, ys, zs } = grid;
  let Q = 0;
  for (let q = 0; q < robinFaces.length; q += 4) {
    const c = robinFaces[q], d = robinFaces[q + 1], b = bcs[robinFaces[q + 2]], hTi = robinFaces[q + 3];
    const [i, j, k] = cellIjk(grid, c);
    const ax = d >> 1, sb = d & 1;
    const h = [xs[i + 1] - xs[i], ys[j + 1] - ys[j], zs[k + 1] - zs[k]];
    const area = ax === 0 ? h[1] * h[2] : ax === 1 ? h[0] * h[2] : h[0] * h[1];
    let s = 0;
    for (let a = 0; a < 8; a++) if (((a >> ax) & 1) === sb) s += theta[cellNode(NX, NY, i, j, k, a)];
    Q += (b.h * area * s) / 4 - hTi;
  }
  return Q;
}

/** sum over constrained nodes of (original row . theta) (padded-free arrays; rows from applyConstraints). */
export function constrainedRowSums(prep, cons, op, theta) {
  const { NX, NY, NZ } = prep;
  const { dir, rows } = cons;
  const out = new Float64Array(dir.length);
  for (let q = 0; q < dir.length; q++) {
    const n = dir[q];
    const i = n % NX, j = Math.floor(n / NX) % NY, k = Math.floor(n / (NX * NY));
    let s = 0;
    for (let t = 0; t < 27; t++) {
      const a = rows[27 * q + t];
      if (a === 0) continue;
      const di = (t % 3) - 1, dj = (Math.floor(t / 3) % 3) - 1, dk = Math.floor(t / 9) - 1;
      if (i + di < 0 || i + di >= NX || j + dj < 0 || j + dj >= NY || k + dk < 0 || k + dk >= NZ) continue;
      s += a * theta[n + op.off[t]];
    }
    out[q] = s;
  }
  return out;
}

/**
 * Linear solver for a constrained stencil operator, built once and reused (transient steps).
 * @returns {{solve: (b: Float64Array, x: Float64Array) => number, kind: string, setup_ms: number, nnzL: number, mg: object|null}}
 */
export function makeSolver(op, grid, { solver = 'auto', rtol = 1e-10, maxIter = 1000, ordering = 'nd', coarseMax = 6000, freeNodes = null, accel = 'js' } = {}) {
  const t0 = performance.now();
  let nf = freeNodes;
  if (nf == null) { nf = 0; for (let n = 0; n < op.N; n++) if (!op.fixed[n]) nf++; }
  const kind = solver === 'auto' ? (nf <= AUTO_DIRECT_MAX ? 'direct' : 'pcg_mg') : solver;
  if (kind === 'direct') {
    const ch = new StencilCholesky(op, { ordering });
    return { kind, setup_ms: performance.now() - t0, nnzL: ch.timing.nnzL, mg: null, solve: (b, x) => { ch.solvePadded(b, x); return { iterations: 0, relres: 0 }; } };
  }
  let pre, mgStats = null;
  if (kind === 'pcg_mg') {
    const mg = buildMG(op, grid.xs, grid.ys, { coarseMax, ordering });
    if (accel === 'wasm') accelerateMG(mg); // gate G1: false (JS kept) when WebAssembly SIMD is unavailable
    pre = (r, z) => mgPrecond(mg, r, z);
    mgStats = { ...mg.stats, accel: mg.accel?.kind ?? 'js' };
  } else pre = jacobiPrecond(op);
  return {
    kind, setup_ms: performance.now() - t0, nnzL: mgStats ? mgStats.coarse_nnzL : 0, mg: mgStats,
    solve: (b, x) => {
      const res = pcg(op, pre, b, x, { rtol, maxIter, ref: 'b' });
      if (!res.converged) throw new Error(`thermal: ${kind} did not converge in ${maxIter} iterations (relres ${res.relres.toExponential(2)})`);
      return res;
    },
  };
}

/**
 * Discrete maximum-principle check: with volumetric sources only (no flux inputs) the continuum maximum lies in a
 * heated part or on a boundary at fixed / ambient temperature. When the hottest node belongs to unheated parts only
 * and exceeds both, Q1 on high-aspect cells (not an M-matrix) has overshot; returns a warning text or null.
 */
function maxPrincipleCheck(prep, partStats, hot) {
  const { grid, qCell, patches, bcs } = prep;
  if (patches.length || bcs.some((b) => b.type === 'heat_flux')) return null;
  const heated = new Set();
  for (let c = 0; c < qCell.length; c++) if (qCell[c] > 0) heated.add(grid.parts[grid.cellPart[c]].id);
  if (!heated.size || heated.has(hot.part)) return null;
  const Theat = Math.max(...[...heated].map((id) => partStats[id]?.Tmax_C ?? -Infinity));
  const Tbc = Math.max(-Infinity, ...bcs.filter((b) => b.type === 'temperature' && b.T_K != null).map((b) => b.T_K - C_TO_K), ...bcs.filter((b) => b.type === 'htc').map((b) => b.T_inf_K - C_TO_K));
  const tol = Math.max(1e-6, 1e-3 * Math.abs(hot.value - Math.min(...Object.values(partStats).map((p) => p.Tmin_C)))); // ignore float-level ties
  if (hot.value <= Theat + tol || hot.value <= Tbc + tol) return null;
  return `thermal: Tmax ${hot.value.toFixed(3)} C is in unheated part ${hot.part}, ${(hot.value - Theat).toFixed(3)} K above the hottest heated part: discrete maximum-principle overshoot of Q1 on high-aspect cells; refine through the thickness (mesh.max_z_mm or min_cells_per_layer) or the narrow gap`;
}

/** Tmax with the tie rule (shared interface node: the part with the higher Tavg). */
export function hottestPart(partStats) {
  let tmax = { value: -Infinity, part: null };
  for (const [id, s] of Object.entries(partStats))
    if (s.Tmax_C > tmax.value || (s.Tmax_C === tmax.value && s.Tavg_C > partStats[tmax.part].Tavg_C)) tmax = { value: s.Tmax_C, part: id };
  return tmax;
}

/**
 * Solve one stationary thermal study.
 * @param {object} grid from buildGrid (with planes / interfaces from thermalGridOptions when the block uses them)
 * @param {object} thermal SPEC physics.thermal
 * @param {(key: string, T_K: number, opts?: object) => object} resolve material resolver (SPEC section 4)
 * @param {object} [opt] solver ('auto' | 'direct' | 'pcg_mg' | 'pcg_jacobi'), rtol (1e-10), maxIter (1000), ordering
 *   ('nd' | 'amd'), coarseMax (6000), nonlinear {max_iter, tol_K} (Picard on k(T)), sourceFn (tests), study ('s1')
 */
export function solveThermal(grid, thermal, resolve, opt = {}) {
  const { solver = 'auto', rtol = 1e-10, maxIter = 1000, ordering = 'nd', coarseMax = 6000, nonlinear = {}, sourceFn = null, study = 's1', accel = 'js' } = opt;
  if (!SOLVERS.includes(solver)) throw new Error(`thermal: unknown solver ${solver} (expected ${SOLVERS.join(' | ')})`);
  const tA0 = performance.now();
  const prep = prepareThermal(grid, thermal, { sourceFn });
  const { T0, active, Td, N } = prep;
  const warnings = [...prep.warnings];
  const ncell = grid.nx * grid.ny * grid.nz;
  const Tdep = tDependent(grid, resolve, T0);
  const maxPicard = Tdep ? (nonlinear.max_iter ?? 30) : 1;
  const tolK = nonlinear.tol_K ?? 1e-6;
  const cache = new Map();
  let Tcell = new Float64Array(ncell).fill(T0);
  let theta = null, info = null, A = null, cons = null;
  let assembleMs = 0, solveMs = 0, setupMs = 0, picardIt = 0, picardDelta = 0, totalIter = 0;
  for (let it = 0; it < maxPicard; it++) {
    const ta = performance.now();
    const kc = cellK(grid, resolve, Tcell, cache, it === 0 ? T0 : null);
    A = assembleThermal(prep, kc);
    cons = applyConstraints(A.op, A.F, Td, active);
    assembleMs += performance.now() - ta;
    const b = padded(A.op), x = padded(A.op);
    b.set(A.F, A.op.pad);
    if (theta) x.set(theta, A.op.pad);
    let nf = 0;
    for (let n = 0; n < N; n++) if (!A.op.fixed[n]) nf++;
    const S = makeSolver(A.op, grid, { solver, rtol, maxIter, ordering, coarseMax, freeNodes: nf, accel });
    setupMs += S.setup_ms;
    const tf = performance.now();
    const res = S.solve(b, x);
    solveMs += performance.now() - tf;
    totalIter += res.iterations;
    info = { solver: S.kind, nnzL: S.nnzL, mg: S.mg, relres: res.relres, free: nf, tensor: kc.tensor };
    const thNew = x.slice(A.op.pad, A.op.pad + N);
    picardIt = it + 1;
    if (!Tdep) {
      theta = thNew;
      break;
    }
    let dmax = 0;
    if (theta) for (let n = 0; n < N; n++) if (active[n]) dmax = Math.max(dmax, Math.abs(thNew[n] - theta[n]));
    theta = thNew;
    Tcell = cellMeanT(grid, theta, T0);
    picardDelta = it ? dmax : Infinity;
    if (it > 0 && dmax <= tolK) break;
    if (it === maxPicard - 1) warnings.push(`thermal: Picard on k(T) stopped after ${maxPicard} iterations (last change ${dmax.toExponential(2)} K)`);
  }
  const T = new Float64Array(N);
  for (let n = 0; n < N; n++) T[n] = active[n] ? theta[n] + T0 : NaN;
  const Qrobin = robinOut(prep, A.robinFaces, theta);
  const rs = constrainedRowSums(prep, cons, A.op, theta);
  let Qdir = 0;
  for (let q = 0; q < rs.length; q++) Qdir += cons.loads[q] - rs[q];
  const heatIn = A.Qsrc + A.Qflux, heatOut = Qrobin + Qdir;
  const scale = Math.max(Math.abs(heatIn), Math.abs(heatOut), Math.abs(A.Qsrc) + Math.abs(A.Qflux) + Math.abs(Qrobin) + Math.abs(Qdir));
  const balance = scale > 0 ? Math.abs(heatIn - heatOut) / scale : 0;
  const partStats = partTemperatures(grid, theta, T0);
  const sf = grid.symFactor;
  const hot = hottestPart(partStats);
  const mp = maxPrincipleCheck(prep, partStats, hot);
  if (mp) warnings.push(mp);
  return {
    study,
    type: 'thermal_stationary',
    grid,
    fields: { T_K: T },
    derived: {
      Tmax_C: hot,
      heat_in_W: heatIn * sf,
      heat_out_W: heatOut * sf,
      balance_rel: balance,
      components_W: { sources: A.Qsrc * sf, flux_in: A.Qflux * sf, htc_out: Qrobin * sf, fixed_T_out: Qdir * sf },
      symmetry_factor: sf,
      parts: partStats,
      T0_K: T0,
    },
    timing: {
      grid_ms: grid.stats?.grid_ms ?? 0,
      assemble_ms: assembleMs,
      setup_ms: setupMs,
      solve_ms: solveMs,
      total_ms: performance.now() - tA0,
      iterations: totalIter,
      picard_iterations: picardIt,
      picard_change_K: Tdep ? picardDelta : 0,
      nnzL: info.nnzL,
      solver: info.solver,
      relres: info.relres ?? 0,
      mg: info.mg ?? null,
      free_nodes: info.free,
      k_tensor: info.tensor,
    },
    warnings: [...grid.warnings, ...warnings],
  };
}

/**
 * Connected bodies of active cells (cells sharing a node conduct to each other) without any fixed-T face or HTC face
 * with h > 0: the steady problem is singular on them. Returns [{cells, parts}] of the unanchored bodies.
 */
export function unanchoredBodies(grid, faceBC, bcs) {
  const { nx, ny, nz, cellPart, parts } = grid;
  const nc = nx * ny * nz;
  const par = new Int32Array(nc);
  for (let c = 0; c < nc; c++) par[c] = c;
  const find = (a) => {
    while (par[a] !== a) a = par[a] = par[par[a]];
    return a;
  };
  for (let k = 0, c = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++, c++) {
        if (cellPart[c] < 0) continue;
        for (let dk = 0; dk <= 1; dk++)
          for (let dj = -1; dj <= 1; dj++)
            for (let di = -1; di <= 1; di++) {
              if (dk === 0 && (dj < 0 || (dj === 0 && di <= 0))) continue;
              const ii = i + di, jj = j + dj, kk = k + dk;
              if (ii < 0 || jj < 0 || ii >= nx || jj >= ny || kk >= nz) continue;
              const m = ii + nx * (jj + ny * kk);
              if (cellPart[m] < 0) continue;
              const a = find(c), b = find(m);
              if (a !== b) par[a] = b;
            }
      }
  const anchored = new Uint8Array(nc);
  for (let c = 0; c < nc; c++)
    for (let d = 0; d < 6; d++) {
      const q = faceBC[6 * c + d];
      if (q < 0) continue;
      const b = bcs[q];
      if (b.type === 'temperature' || (b.type === 'htc' && b.h > 0)) anchored[find(c)] = 1;
    }
  const bodies = new Map();
  for (let c = 0; c < nc; c++) {
    if (cellPart[c] < 0) continue;
    const r = find(c);
    if (anchored[r]) continue;
    if (!bodies.has(r)) bodies.set(r, { cells: 0, parts: new Set() });
    const B = bodies.get(r);
    B.cells++;
    B.parts.add(parts[cellPart[c]].id);
  }
  return [...bodies.values()].map((B) => ({ cells: B.cells, parts: [...B.parts] }));
}

/** Cell-mean temperature (K; mean of the 8 nodes, exact for trilinear fields). */
export function cellMeanT(grid, theta, T0) {
  const { nx, ny, nz, cellPart } = grid;
  const NX = nx + 1, NY = ny + 1;
  const out = new Float64Array(nx * ny * nz).fill(T0);
  for (let k = 0, c = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++, c++) {
        if (cellPart[c] < 0) continue;
        let s = 0;
        for (let a = 0; a < 8; a++) s += theta[cellNode(NX, NY, i, j, k, a)];
        out[c] = T0 + s / 8;
      }
  return out;
}

/** Tmax / Tmin over each part's nodes, the volume-weighted Tavg (C) and the meshed volume (modelled part, m^3). */
export function partTemperatures(grid, theta, T0) {
  const { nx, ny, nz, xs, ys, zs, cellPart, parts } = grid;
  const NX = nx + 1, NY = ny + 1;
  const np = parts.length;
  const mx = new Float64Array(np).fill(-Infinity), mn = new Float64Array(np).fill(Infinity), sum = new Float64Array(np), vol = new Float64Array(np);
  for (let k = 0, c = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++, c++) {
        const p = cellPart[c];
        if (p < 0) continue;
        let s = 0;
        for (let a = 0; a < 8; a++) {
          const v = theta[cellNode(NX, NY, i, j, k, a)];
          s += v;
          if (v > mx[p]) mx[p] = v;
          if (v < mn[p]) mn[p] = v;
        }
        const V = (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]) * (zs[k + 1] - zs[k]);
        sum[p] += (V * s) / 8;
        vol[p] += V;
      }
  const out = {};
  for (let p = 0; p < np; p++) {
    if (!(vol[p] > 0)) continue;
    out[parts[p].id] = { Tmax_C: mx[p] + T0 - C_TO_K, Tmin_C: mn[p] + T0 - C_TO_K, Tavg_C: sum[p] / vol[p] + T0 - C_TO_K, volume_m3: vol[p] };
  }
  return out;
}
