// Supports and displacement constraints (tranche E2; R1 1.5, implications B; SPEC section 1 physics.mechanics.supports).
//   rigid_motion: 3-2-1 point constraints on three active corner nodes of the lowest node plane (P1: ux, uy, uz;
//                 P2 along x from P1: uy, uz; P3 off the P1-P2 line: uz). Statically determinate, so the reactions
//                 vanish (to round-off) for self-equilibrated loads such as thermal strain. Only with symmetry none.
//   symmetry:     zero normal displacement on the mirror planes sym:x (ux) / sym:y (uy), plus the minimal
//                 statically determinate point constraints for the rigid modes the planes leave: quarter -> uz at the
//                 lowest node on the x = y = 0 axis; half_x -> P1 (uy, uz) and P2 (uz) on the x = 0 plane;
//                 half_y -> P1 (ux, uz) and P2 (uz) on the y = 0 plane. Only with a symmetry crop.
//   none:         explicit bcs only.
// Never both rigid_motion and a symmetry crop (R1 1.5: rigid-motion suppression must not be combined with symmetry,
// roller or prescribed displacement): error.
// Explicit bcs (tier-A cases): {selection, type: fixed | roller | symmetry | displacement, value_m?: [ux, uy, uz] |
// (x, y, z) => [ux, uy, uz]} on grid face selections, or {type: point, at_m: [x, y, z], dofs: 'xyz' | 'yz' | ...}
// (nearest active node). Roller / symmetry = zero normal displacement of the face.
// License: GPL-3.0-or-later.

import { resolveSelection, groupDir } from '../grid/index.mjs';
import { localNodeCoords } from './elements.mjs';
import { cellNodes, nodeXYZ } from './numbering.mjs';

export const SUPPORTS = Object.freeze(['rigid_motion', 'symmetry', 'none']);
export const BC_TYPES = Object.freeze(['fixed', 'roller', 'symmetry', 'displacement', 'point']);

const FACE_LOCAL = new Map();
/** Local node indices on face direction d (0 -x, 1 +x, 2 -y, 3 +y, 4 -z, 5 +z). */
export function faceLocalNodes(type, d) {
  const key = `${type}|${d}`;
  if (FACE_LOCAL.has(key)) return FACE_LOCAL.get(key);
  const ax = d >> 1, side = d & 1 ? 1 : -1;
  const out = localNodeCoords(type).map((p, a) => [p, a]).filter(([p]) => p[ax] === side).map(([, a]) => a);
  FACE_LOCAL.set(key, out);
  return out;
}

/** Compact node ids on a selection (Set), from its face groups. */
export function selectionNodes(grid, num, sel) {
  const out = new Set();
  const tmp = new Int32Array(num.nen);
  for (const g of sel.groups) {
    const d = groupDir(g);
    const loc = faceLocalNodes(num.type, d);
    for (const c of g.cells) {
      const i = c % grid.nx, j = Math.floor(c / grid.nx) % grid.ny, k = Math.floor(c / (grid.nx * grid.ny));
      cellNodes(grid, i, j, k, num.nen, tmp);
      for (const a of loc) {
        const n = num.compact[tmp[a]];
        if (n >= 0) out.add(n);
      }
    }
  }
  return out;
}

/** Selection lookup with the L4 per-face aliases `side:<part>:x-` etc. mapped to the grid names `xmin:<part>`. */
export function lookupSelection(grid, name) {
  const m = /^side:(.+):([xyz])([+-])$/.exec(name);
  let nm = name;
  if (m) {
    const [, part, ax, sd] = m;
    nm = ax === 'z' ? `${sd === '-' ? 'bottom' : 'top'}:${part}` : `${ax}${sd === '-' ? 'min' : 'max'}:${part}`;
  }
  const s = resolveSelection(grid, nm);
  if (!s) throw new Error(`mech: selection ${name} matches no faces`);
  return s;
}

function nearestNode(grid, num, at, filter = null) {
  let best = -1, bd = Infinity;
  for (let n = 0; n < num.nn; n++) {
    const id = num.ext[n];
    if (filter && !filter(id)) continue;
    const p = nodeXYZ(grid, id);
    const d = (p[0] - at[0]) ** 2 + (p[1] - at[1]) ** 2 + (p[2] - at[2]) ** 2;
    if (d < bd) { bd = d; best = n; }
  }
  if (best < 0) throw new Error('mech: no active node for a point constraint');
  return best;
}

const DOF_OF = { x: 0, y: 1, z: 2 };

/**
 * Build the constraint list.
 * @returns {{fixed: Uint8Array (ndof), value: Float64Array (ndof), points: object[], description: string[]}}
 */
export function buildConstraints(grid, num, { supports = 'rigid_motion', bcs = [] } = {}) {
  if (!SUPPORTS.includes(supports)) throw new Error(`mech: supports ${supports} not in ${SUPPORTS.join(' | ')}`);
  const sym = grid.symmetry ?? 'none';
  if (supports === 'rigid_motion' && sym !== 'none')
    throw new Error(`mech: supports rigid_motion cannot be combined with the symmetry crop ${sym} (R1 1.5: never both); use supports: symmetry`);
  if (supports === 'symmetry' && sym === 'none') throw new Error('mech: supports symmetry needs a symmetry crop (geometry.symmetry half_x | half_y | quarter)');
  if (supports === 'rigid_motion' && bcs.length)
    throw new Error('mech: supports rigid_motion cannot be combined with explicit displacement bcs (R1 1.5); use supports: none');
  const ndof = num.ndof;
  const fixed = new Uint8Array(ndof), value = new Float64Array(ndof);
  const points = [], description = [];
  const fix = (n, comp, v = 0) => { fixed[3 * n + comp] = 1; value[3 * n + comp] = v; };
  const NX = grid.nx + 1, NY = grid.ny + 1, Nc = NX * NY * (grid.nz + 1);
  const ijk = (id) => [id % NX, Math.floor(id / NX) % NY, Math.floor(id / (NX * NY))];
  const cornerActive = (pred) => {
    const out = [];
    for (let n = 0; n < num.nn; n++) {
      const id = num.ext[n];
      if (id >= Nc) continue;
      const [i, j, k] = ijk(id);
      if (pred(i, j, k)) out.push([n, i, j, k]);
    }
    return out;
  };
  const point = (n, dofs, why) => {
    for (const ch of dofs) fix(n, DOF_OF[ch]);
    points.push({ node: n, xyz_m: nodeXYZ(grid, num.ext[n]), dofs, why });
  };
  if (supports === 'rigid_motion') {
    let kmin = Infinity;
    for (let n = 0; n < num.nn; n++) if (num.ext[n] < Nc) kmin = Math.min(kmin, ijk(num.ext[n])[2]);
    const plane = cornerActive((i, j, k) => k === kmin);
    // P1: min (i + j); P2: same j, max i; P3: max j (closest i to P1)
    let p1 = plane[0];
    for (const p of plane) if (p[1] + p[2] < p1[1] + p1[2]) p1 = p;
    let p2 = null;
    for (const p of plane) if (p[2] === p1[2] && p[1] > p1[1] && (!p2 || p[1] > p2[1])) p2 = p;
    let p3 = null;
    for (const p of plane) if (p[2] > p1[2] && (!p3 || p[2] > p3[2] || (p[2] === p3[2] && Math.abs(p[1] - p1[1]) < Math.abs(p3[1] - p1[1])))) p3 = p;
    if (!p2 || !p3) throw new Error('mech: rigid_motion: the lowest node plane needs nodes spread in x and y for the 3-2-1 points');
    point(p1[0], 'xyz', 'rigid_motion P1');
    point(p2[0], 'yz', 'rigid_motion P2');
    point(p3[0], 'z', 'rigid_motion P3');
    description.push('rigid_motion: 3-2-1 point constraints (statically determinate, zero reactions for self-equilibrated loads)');
  }
  if (supports === 'symmetry') {
    const symX = sym === 'half_x' || sym === 'quarter', symY = sym === 'half_y' || sym === 'quarter';
    for (const [ax, on] of [['x', symX], ['y', symY]]) {
      if (!on) continue;
      const s = grid.selections[`sym:${ax}`];
      if (!s) throw new Error(`mech: selection sym:${ax} missing on a ${sym} grid`);
      for (const n of selectionNodes(grid, num, s)) fix(n, DOF_OF[ax]);
      description.push(`symmetry: u${ax} = 0 on sym:${ax}`);
    }
    if (sym === 'quarter') {
      const axis = cornerActive((i, j) => i === 0 && j === 0).sort((a, b) => a[3] - b[3]);
      if (!axis.length) throw new Error('mech: symmetry quarter: no active node on the x = y = 0 axis');
      point(axis[0][0], 'z', 'symmetry z point (lowest node on the symmetry axis)');
    } else {
      // half crops: the plane x = 0 (half_x) or y = 0 (half_y)
      const onPlane = sym === 'half_x' ? (i) => i === 0 : (i, j) => j === 0;
      const plane = cornerActive((i, j, k) => onPlane(i, j, k));
      let kmin = Infinity;
      for (const p of plane) kmin = Math.min(kmin, p[3]);
      const low = plane.filter((p) => p[3] === kmin);
      const t = sym === 'half_x' ? 2 : 1; // varying in-plane index (j for half_x, i for half_y)
      low.sort((a, b) => a[t] - b[t]);
      if (low.length < 2) throw new Error(`mech: symmetry ${sym}: the lowest node row on the mirror plane needs two nodes`);
      point(low[0][0], sym === 'half_x' ? 'yz' : 'xz', `symmetry ${sym} P1`);
      point(low[low.length - 1][0], 'z', `symmetry ${sym} P2`);
    }
  }
  bcs.forEach((bc, q) => {
    const where = `mechanics.bcs[${q}]`;
    if (!BC_TYPES.includes(bc.type)) throw new Error(`${where}: type ${bc.type} not in ${BC_TYPES.join(' | ')}`);
    if (bc.type === 'point') {
      if (!Array.isArray(bc.at_m) || bc.at_m.length !== 3) throw new Error(`${where}: point needs at_m [x, y, z] (m)`);
      if (typeof bc.dofs !== 'string' || !/^[xyz]+$/.test(bc.dofs)) throw new Error(`${where}: point needs dofs, e.g. 'xyz' or 'z'`);
      point(nearestNode(grid, num, bc.at_m, (id) => id < Nc), bc.dofs, where);
      return;
    }
    const sel = lookupSelection(grid, bc.selection);
    for (const g of sel.groups) {
      const d = groupDir(g), ax = d >> 1;
      const sub = { groups: [g] };
      for (const n of selectionNodes(grid, num, sub)) {
        if (bc.type === 'fixed') for (let c = 0; c < 3; c++) fix(n, c);
        else if (bc.type === 'roller' || bc.type === 'symmetry') fix(n, ax);
        else {
          const v = typeof bc.value_m === 'function' ? bc.value_m(...nodeXYZ(grid, num.ext[n])) : bc.value_m;
          if (!Array.isArray(v) || v.length !== 3) throw new Error(`${where}: displacement needs value_m [ux, uy, uz] or a function`);
          for (let c = 0; c < 3; c++) if (v[c] != null) fix(n, c, v[c]);
        }
      }
    }
    description.push(`${bc.type} on ${bc.selection}`);
  });
  let nfix = 0;
  for (let i = 0; i < ndof; i++) nfix += fixed[i];
  if (!nfix) throw new Error('mech: no displacement constraints (supports none and no bcs): the stiffness is singular');
  return { fixed, value, points, description, nfixed: nfix };
}
