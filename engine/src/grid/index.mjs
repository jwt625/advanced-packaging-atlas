// Rectilinear grid from a box part list (SPEC sections 2 and 3; DevLog-010 A2; DevLog-012 lane L1).
// Every box face lies on a grid plane; in-plane graded spacing (spacing.mjs); per-part minimum through-thickness
// cells; cell owner = highest-priority part containing the cell centre; quarter / half symmetry crops with a mirror
// check of the part list; named exterior-face selections. Physics-agnostic: the thermal (E1) and mechanics (E2)
// operators read xs/ys/zs, cellPart/cellMat and the selections only.
// Index conventions (SPEC 3): cell c = i + nx (j + ny k); node n = i + (nx + 1)(j + (ny + 1) k).
// Face directions d: 0 -x, 1 +x, 2 -y, 3 +y, 4 -z, 5 +z.
// License: GPL-3.0-or-later.

import { snapClusters, gradedNodes, layeredNodes } from './spacing.mjs';

export const SYMMETRIES = Object.freeze(['none', 'half_x', 'half_y', 'quarter']);
export const FACE_DIRS = Object.freeze([
  { axis: 'x', side: '-' }, { axis: 'x', side: '+' }, { axis: 'y', side: '-' }, { axis: 'y', side: '+' },
  { axis: 'z', side: '-' }, { axis: 'z', side: '+' },
]);
const MM = 1e-3, UM = 1e-6;

/** Glob (`*`, `?`) to an anchored RegExp. */
export function globRegExp(glob) {
  const esc = String(glob).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${esc}$`);
}

/** Box of a part in m: [x0, x1, y0, y1, z0, z1]. */
export function partBox(p) {
  for (const k of ['x_mm', 'y_mm', 'w_mm', 'd_mm', 'z_um', 'h_um'])
    if (!Number.isFinite(p[k])) throw new Error(`grid: part ${p.id}: ${k} must be a finite number (got ${p[k]})`);
  for (const k of ['w_mm', 'd_mm', 'h_um']) if (!(p[k] > 0)) throw new Error(`grid: part ${p.id}: ${k} must be > 0 (got ${p[k]})`);
  return [
    (p.x_mm - p.w_mm / 2) * MM, (p.x_mm + p.w_mm / 2) * MM,
    (p.y_mm - p.d_mm / 2) * MM, (p.y_mm + p.d_mm / 2) * MM,
    p.z_um * UM, (p.z_um + p.h_um) * UM,
  ];
}

/** Effective priorities: explicit `priority`, else containment depth through `in` (host chain). */
export function partPriorities(parts) {
  const byId = new Map(parts.map((p, i) => [p.id, i]));
  if (byId.size !== parts.length) {
    const seen = new Set();
    for (const p of parts) {
      if (seen.has(p.id)) throw new Error(`grid: duplicate part id ${p.id}`);
      seen.add(p.id);
    }
  }
  const depth = new Array(parts.length).fill(null);
  const depthOf = (i, stack) => {
    if (depth[i] != null) return depth[i];
    const host = parts[i].in;
    if (host == null) return (depth[i] = 0);
    if (!byId.has(host)) return (depth[i] = 1); // host dropped or absent: still a contained part
    if (stack.has(i)) throw new Error(`grid: containment cycle through part ${parts[i].id}`);
    stack.add(i);
    const d = depthOf(byId.get(host), stack) + 1;
    stack.delete(i);
    return (depth[i] = d);
  };
  return parts.map((p, i) => (Number.isFinite(p.priority) ? p.priority : depthOf(i, new Set())));
}

/**
 * Mirror partner of every part for the plane axis = 0 ('x' or 'y'); throws naming the first part without one.
 * Partner: centre mirrored, equal size, z, h, kind, material and priority (tolerance tolMM in mm).
 */
export function mirrorPartners(parts, prio, axis, tolMM = 1e-6) {
  const c = axis === 'x' ? 'x_mm' : 'y_mm', o = axis === 'x' ? 'y_mm' : 'x_mm';
  const partner = new Int32Array(parts.length).fill(-1);
  const key = (p, i) => [p.kind, p.material, prio[i]].join('|');
  const near = (a, b, t = tolMM) => Math.abs(a - b) <= t * Math.max(1, Math.abs(a), Math.abs(b));
  for (let i = 0; i < parts.length; i++) {
    if (partner[i] >= 0) continue;
    const p = parts[i];
    let found = -1;
    for (let j = 0; j < parts.length && found < 0; j++) {
      if (j !== i && partner[j] >= 0) continue;
      const q = parts[j];
      if (key(p, i) !== key(q, j)) continue;
      if (near(p[c], -q[c]) && near(p[o], q[o]) && near(p.w_mm, q.w_mm) && near(p.d_mm, q.d_mm) && near(p.z_um, q.z_um) && near(p.h_um, q.h_um)) found = j;
    }
    if (found < 0)
      throw new Error(`grid: symmetry about ${axis} = 0 rejected: part ${p.id} (${p.kind}, ${c} ${p[c]}) has no mirror partner`);
    partner[i] = found;
    partner[found] = i;
  }
  return partner;
}

/** Index of coordinate v in sorted nodes (exact breakpoint match within tol). */
function nodeIndex(nodes, v, tol) {
  let lo = 0, hi = nodes.length - 1;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (nodes[m] < v - tol) lo = m + 1;
    else hi = m;
  }
  if (Math.abs(nodes[lo] - v) > tol) throw new Error(`grid: internal: coordinate ${v} is not on a grid plane`);
  return lo;
}

/**
 * Build the rectilinear grid.
 * @param {Array<object>} partsIn box parts (SPEC section 2)
 * @param {object} [opt]
 * @param {number} [opt.max_xy_mm=1] in-plane target cell size
 * @param {number|null} [opt.max_z_mm=null] through-thickness cell size cap (null: one cell per z interval; L1 addition)
 * @param {number} [opt.min_cells_per_layer=1] cells through the thickness of every part
 * @param {number} [opt.grading=1.3] max neighbour size ratio in x and y
 * @param {number} [opt.max_nodes=300000] budget on the tensor node count; exceeding it throws
 * @param {string} [opt.symmetry='none'] none | half_x | half_y | quarter (keep x >= 0 and/or y >= 0)
 * @param {string[]} [opt.drop_kinds=[]] part kinds left out
 * @param {(p: object) => string} [opt.materialOf] material key of a part (default p.material)
 * @param {number} [opt.snap_xy_um=1] in-plane face coordinates closer than this are snapped to one grid plane
 *   (generator rounding slivers; every shift is reported in warnings and stats; L1 addition)
 * @param {number} [opt.snap_z_um=0.01] the same through the thickness (thin films are real in z)
 * @param {Array<[string, string]>} [opt.interfaces] part pairs that touch across a z plane and get a contact layer
 *   (L4-1): a sliver node plane at z0 + delta (delta = 1e-3 of the first cell above z0, not a breakpoint) on the upper
 *   side; its cells inside the a/b footprint form selection `interface:<a>|<b>` (also `<b>|<a>`, `/` separator)
 * @param {{x_mm?: number[], y_mm?: number[], z_um?: number[]}} [opt.planes] extra grid planes inside the model
 *   (probes, matching meshes between a full and a cropped model; L1 addition)
 */
export function buildGrid(partsIn, opt = {}) {
  const t0 = performance.now();
  const {
    max_xy_mm = 1, max_z_mm = null, min_cells_per_layer = 1, grading = 1.3, max_nodes = 300000, symmetry = 'none',
    drop_kinds = [], materialOf = (p) => p.material, snap_xy_um = 1, snap_z_um = 0.01, planes = {}, interfaces = [],
  } = opt;
  const tol_m = 1e-12, tolXY = snap_xy_um * UM, tolZ = snap_z_um * UM;
  if (!(tolXY >= 0 && tolZ >= 0)) throw new Error('grid: snap_xy_um and snap_z_um must be >= 0');
  if (!SYMMETRIES.includes(symmetry)) throw new Error(`grid: unknown symmetry ${symmetry} (expected ${SYMMETRIES.join(' | ')})`);
  if (!(Number.isInteger(min_cells_per_layer) && min_cells_per_layer >= 1)) throw new Error(`grid: min_cells_per_layer must be an integer >= 1`);
  if (max_z_mm != null && !(max_z_mm > 0)) throw new Error('grid: max_z_mm must be > 0 when given');
  const drop = new Set(drop_kinds);
  const parts = partsIn.filter((p) => !drop.has(p.kind));
  if (!parts.length) throw new Error('grid: no parts left after drop_kinds');
  const prio = partPriorities(parts);
  const boxes = parts.map(partBox);
  const symX = symmetry === 'half_x' || symmetry === 'quarter';
  const symY = symmetry === 'half_y' || symmetry === 'quarter';
  const mirror = { x: symX ? mirrorPartners(parts, prio, 'x') : null, y: symY ? mirrorPartners(parts, prio, 'y') : null };
  // model extent (cropped)
  let X0 = Infinity, X1 = -Infinity, Y0 = Infinity, Y1 = -Infinity, Z0 = Infinity, Z1 = -Infinity;
  for (const b of boxes) {
    X0 = Math.min(X0, b[0]); X1 = Math.max(X1, b[1]); Y0 = Math.min(Y0, b[2]); Y1 = Math.max(Y1, b[3]);
    Z0 = Math.min(Z0, b[4]); Z1 = Math.max(Z1, b[5]);
  }
  if (symX) X0 = 0;
  if (symY) Y0 = 0;
  // clipped boxes; parts entirely outside the crop keep a null box (no cells, still listed for mirror bookkeeping)
  const clip0 = boxes.map((b) => {
    const c = [Math.max(b[0], X0), b[1], Math.max(b[2], Y0), b[3], b[4], b[5]];
    return c[1] - c[0] > tol_m && c[3] - c[2] > tol_m ? c : null;
  });
  const bx = [X0, X1], by = [Y0, Y1], bz = [];
  for (const c of clip0) if (c) { bx.push(c[0], c[1]); by.push(c[2], c[3]); bz.push(c[4], c[5]); }
  for (const v of planes.x_mm ?? []) if (v * MM > X0 && v * MM < X1) bx.push(v * MM);
  for (const v of planes.y_mm ?? []) if (v * MM > Y0 && v * MM < Y1) by.push(v * MM);
  for (const v of planes.z_um ?? []) if (v * UM > Z0 && v * UM < Z1) bz.push(v * UM);
  const SX = snapClusters(bx, tolXY, [X0, X1]), SY = snapClusters(by, tolXY, [Y0, Y1]), SZ = snapClusters(bz, tolZ, [Z0, Z1]);
  const BX = SX.values, BY = SY.values, BZ = SZ.values;
  const snapped = [];
  for (const [ax, S, u] of [['x', SX, 'um'], ['y', SY, 'um'], ['z', SZ, 'um']])
    if (S.nSnapped) snapped.push(`${ax}: ${S.nSnapped} face coordinates moved by <= ${(S.maxShift / UM).toPrecision(3)} ${u}`);
  // boxes on the snapped planes; a box collapsed by snapping (thinner than the tolerance) is dropped with a warning
  const collapsed = [];
  const clip = clip0.map((c, p) => {
    if (!c) return null;
    const s = [SX.snap(c[0]), SX.snap(c[1]), SY.snap(c[2]), SY.snap(c[3]), SZ.snap(c[4]), SZ.snap(c[5])];
    if (s[1] <= s[0] || s[3] <= s[2] || s[5] <= s[4]) {
      collapsed.push(parts[p].id);
      return null;
    }
    return s;
  });
  const H = max_xy_mm * MM;
  const gx = gradedNodes(BX, H, grading), gy = gradedNodes(BY, H, grading);
  // z: minimum cells per part through its own thickness
  const zRanges = [];
  for (const c of clip) if (c) zRanges.push([nodeIndex(BZ, c[4], tol_m), nodeIndex(BZ, c[5], tol_m)]);
  const gz = layeredNodes(BZ, max_z_mm != null ? max_z_mm * MM : null, min_cells_per_layer, zRanges);
  // contact interfaces: a sliver node plane on the + side of the shared plane (z, x or y normal; wave 3 adds x / y)
  const iface = [];
  const lists = [Array.from(gx.nodes), Array.from(gy.nodes), Array.from(gz.nodes)];
  const sliverAt = [new Set(), new Set(), new Set()];
  for (const pair of interfaces) {
    const [ida, idb] = pair;
    const pa = parts.findIndex((p) => p.id === ida), pb = parts.findIndex((p) => p.id === idb);
    if (pa < 0 || pb < 0) throw new Error(`grid: interface ${ida}|${idb}: part ${pa < 0 ? ida : idb} not in the model`);
    const ca = clip[pa], cb = clip[pb];
    if (!ca || !cb) throw new Error(`grid: interface ${ida}|${idb}: a part is outside the modelled region`);
    let found = null;
    for (const ax of [2, 0, 1]) {
      const lo = 2 * ax, hi = 2 * ax + 1;
      const others = [0, 1, 2].filter((q) => q !== ax);
      const overlap = others.every((q) => Math.min(ca[2 * q + 1], cb[2 * q + 1]) - Math.max(ca[2 * q], cb[2 * q]) > 0);
      if (!overlap) continue;
      if (Math.abs(ca[hi] - cb[lo]) <= tol_m) found = { ax, lower: pa, upper: pb, p0: ca[hi] };
      else if (Math.abs(cb[hi] - ca[lo]) <= tol_m) found = { ax, lower: pb, upper: pa, p0: cb[hi] };
      if (found) break;
    }
    if (!found) throw new Error(`grid: interface ${ida}|${idb}: the parts do not touch across a shared plane with overlapping faces`);
    const L = lists[found.ax];
    const k0 = L.findIndex((z) => Math.abs(z - found.p0) <= tol_m);
    if (k0 < 0 || k0 >= L.length - 1) throw new Error(`grid: internal: interface plane ${found.p0} not found`);
    if (symX && found.ax === 0 && Math.abs(found.p0) <= tol_m) throw new Error(`grid: interface ${ida}|${idb} lies on the sym:x plane`);
    if (symY && found.ax === 1 && Math.abs(found.p0) <= tol_m) throw new Error(`grid: interface ${ida}|${idb} lies on the sym:y plane`);
    iface.push({ name: `${ida}|${idb}`, a: ida, b: idb, ...found });
    if (!sliverAt[found.ax].has(k0)) {
      sliverAt[found.ax].add(k0);
      L.splice(k0 + 1, 0, found.p0 + 1e-3 * (L[k0 + 1] - found.p0));
    }
  }
  const xs = Float64Array.from(lists[0]), ys = Float64Array.from(lists[1]), zs = Float64Array.from(lists[2]);
  const nx = xs.length - 1, ny = ys.length - 1, nz = zs.length - 1;
  const nodes = (nx + 1) * (ny + 1) * (nz + 1);
  if (nodes > max_nodes)
    throw new Error(`grid: ${nodes} nodes (${nx + 1} x ${ny + 1} x ${nz + 1}) exceed mesh.max_nodes ${max_nodes}; ` +
      `raise max_nodes or max_xy_mm (${max_xy_mm}), lower min_cells_per_layer (${min_cells_per_layer}) or use a symmetry crop`);
  // part index ranges and cell ownership
  const ncell = nx * ny * nz;
  const cellPart = new Int32Array(ncell).fill(-1);
  const cellPrio = new Float64Array(ncell).fill(-Infinity);
  const partRange = new Int32Array(6 * parts.length).fill(-1);
  const ties = new Map();
  for (let p = 0; p < parts.length; p++) {
    const c = clip[p];
    if (!c) continue;
    const i0 = nodeIndex(xs, c[0], tol_m), i1 = nodeIndex(xs, c[1], tol_m);
    const j0 = nodeIndex(ys, c[2], tol_m), j1 = nodeIndex(ys, c[3], tol_m);
    const k0 = nodeIndex(zs, c[4], tol_m), k1 = nodeIndex(zs, c[5], tol_m);
    if (i1 <= i0 || j1 <= j0 || k1 <= k0) continue; // thinner than the merge tolerance
    partRange.set([i0, i1, j0, j1, k0, k1], 6 * p);
    const pr = prio[p];
    for (let k = k0; k < k1; k++)
      for (let j = j0; j < j1; j++) {
        const row = nx * (j + ny * k);
        for (let i = i0; i < i1; i++) {
          const q = row + i;
          const cur = cellPrio[q];
          if (pr > cur) {
            cellPrio[q] = pr;
            cellPart[q] = p;
          } else if (pr === cur) {
            const key = `${parts[cellPart[q]].id} / ${parts[p].id}`;
            ties.set(key, (ties.get(key) ?? 0) + 1);
            cellPart[q] = p;
          }
        }
      }
  }
  const warnings = snapped.map((t) => `grid: snapped ${t}`);
  if (collapsed.length) warnings.push(`grid: parts thinner than the snap tolerance dropped: ${collapsed.join(', ')}`);
  for (const [k, n] of ties) warnings.push(`grid: equal-priority overlap ${k} (${n} cells; the later part owns them)`);
  // materials of the parts that own cells
  const partCells = new Int32Array(parts.length);
  for (let q = 0; q < ncell; q++) if (cellPart[q] >= 0) partCells[cellPart[q]]++;
  const materials = [];
  const matIndex = new Map();
  const partMat = new Int32Array(parts.length).fill(-1);
  for (let p = 0; p < parts.length; p++) {
    if (!partCells[p]) continue;
    const key = materialOf(parts[p]);
    if (typeof key !== 'string' || !key) throw new Error(`grid: part ${parts[p].id} has no material key`);
    if (!matIndex.has(key)) { matIndex.set(key, materials.length); materials.push(key); }
    partMat[p] = matIndex.get(key);
  }
  // parts that own no cells: name the owners of their box; benign when every owner is contained in the part
  // (through `in` or a layer box `host`), e.g. a substrate host fully covered by its layer boxes
  const byIdx = new Map(parts.map((p, i) => [p.id, i]));
  const containedIn = (q, p) => {
    for (let r = q, guard = 0; r != null && guard < 64; guard++) {
      const h = parts[r].in ?? parts[r].host;
      if (h == null) return false;
      const hi = byIdx.get(h);
      if (hi === p) return true;
      r = hi;
    }
    return false;
  };
  for (let p = 0; p < parts.length; p++) {
    if (!clip[p] || partCells[p] || partRange[6 * p] < 0) continue;
    const [i0, i1, j0, j1, k0, k1] = partRange.subarray(6 * p, 6 * p + 6);
    const owners = new Set();
    for (let k = k0; k < k1; k++) for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) owners.add(cellPart[i + nx * (j + ny * k)]);
    const isArray = (q) => parts[q].array != null || parts[q].role === 'array';
    const arrays = [...owners].filter((q) => q >= 0 && !containedIn(q, p) && isArray(q)).map((q) => parts[q].id);
    const foreign = [...owners].filter((q) => q >= 0 && !containedIn(q, p) && !isArray(q)).map((q) => parts[q].id);
    if (!foreign.length)
      warnings.push(`grid: part ${parts[p].id} owns no cells: its box is fully covered by ${owners.size} parts contained in it${arrays.length ? ` or homogenized array fields (${arrays.join(', ')})` : ''} (benign; selections use the box faces)`);
    else warnings.push(`grid: part ${parts[p].id} owns no cells: its box is covered by non-contained parts ${foreign.slice(0, 6).join(', ')}${foreign.length > 6 ? ', ...' : ''} (check priorities)`);
  }
  const cellMat = new Int32Array(ncell).fill(-1);
  for (let q = 0; q < ncell; q++) if (cellPart[q] >= 0) cellMat[q] = partMat[cellPart[q]];
  const grid = {
    xs, ys, zs, nx, ny, nz, cellPart, cellMat, parts, materials, partMat, partRange, partCells, priority: prio,
    symmetry, symFactor: (symX ? 2 : 1) * (symY ? 2 : 1), mirror, selections: {}, warnings,
  };
  buildSelections(grid, symX, symY);
  // contact cells: sliver layer cells owned by the + side part with the - side part directly before them
  grid.interfaces = [];
  grid.sliverLayers = new Set(); // z layers (stats); x / y slivers in grid.sliverPlanes
  grid.sliverPlanes = { x: new Set(), y: new Set(), z: new Set() };
  const AX = ['x', 'y', 'z'];
  for (const f of iface) {
    const arr = [xs, ys, zs][f.ax];
    const k = nodeIndex(arr, f.p0, tol_m);
    grid.sliverPlanes[AX[f.ax]].add(k);
    if (f.ax === 2) grid.sliverLayers.add(k);
    const stride = f.ax === 0 ? 1 : f.ax === 1 ? nx : nx * ny;
    const cells = [];
    let area = 0;
    for (let kk = 0; kk < nz; kk++)
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          if ([i, j, kk][f.ax] !== k || k === 0) continue;
          const c = i + nx * (j + ny * kk);
          if (cellPart[c] === f.upper && cellPart[c - stride] === f.lower) {
            cells.push(c);
            const h = [xs[i + 1] - xs[i], ys[j + 1] - ys[j], zs[kk + 1] - zs[kk]];
            area += f.ax === 0 ? h[1] * h[2] : f.ax === 1 ? h[0] * h[2] : h[0] * h[1];
          }
        }
    if (!cells.length) throw new Error(`grid: interface ${f.name}: no contact cells (parts overridden by others at the interface)`);
    const sel = { kind: 'interface', axis: AX[f.ax], groups: [], cells: Int32Array.from(cells), faces: cells.length, area_m2: area, lower: parts[f.lower].id, upper: parts[f.upper].id };
    grid.interfaces.push({ name: f.name, ...sel });
    for (const nm of [`${f.a}|${f.b}`, `${f.b}|${f.a}`, `${f.a}/${f.b}`, `${f.b}/${f.a}`]) grid.selections[`interface:${nm}`] = sel;
  }
  grid.stats = gridStats(grid, { gradingX: gx.ratio, gradingY: gy.ratio });
  grid.stats.snap_max_shift_um = { x: SX.maxShift / UM, y: SY.maxShift / UM, z: SZ.maxShift / UM };
  grid.stats.grid_ms = performance.now() - t0;
  return grid;
}

/** Exterior faces per part and direction, `default`, `sym:x`, `sym:y` (see the module header). */
function buildSelections(grid, symX, symY) {
  const { nx, ny, nz, cellPart, parts } = grid;
  const np = parts.length;
  const count = new Int32Array(6 * np + 12); // per (part, dir); then 6 default, then sym:x, sym:y (indices 6np+6, +7)
  const DEF = 6 * np, SX = 6 * np + 6, SY = 6 * np + 7;
  const classify = (i, j, k, d) => {
    // returns 0 interior, 1 exterior, 2 symmetry plane
    let ii = i, jj = j, kk = k;
    if (d === 0) ii--; else if (d === 1) ii++; else if (d === 2) jj--; else if (d === 3) jj++; else if (d === 4) kk--; else kk++;
    if (ii < 0) return symX ? 2 : 1;
    if (jj < 0) return symY ? 2 : 1;
    if (ii >= nx || jj >= ny || kk < 0 || kk >= nz) return 1;
    return cellPart[ii + nx * (jj + ny * kk)] < 0 ? 1 : 0;
  };
  for (let pass = 0; pass < 2; pass++) {
    const off = pass ? new Int32Array(count.length) : null;
    let lists = null;
    if (pass) {
      lists = Array.from(count, (n) => new Int32Array(n));
    }
    for (let k = 0, c = 0; k < nz; k++)
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++, c++) {
          const p = cellPart[c];
          if (p < 0) continue;
          for (let d = 0; d < 6; d++) {
            const t = classify(i, j, k, d);
            if (t === 0) continue;
            const slots = t === 1 ? [DEF + d] : [d === 0 ? SX : SY];
            for (const s of slots) {
              if (pass) lists[s][off[s]++] = c;
              else count[s]++;
            }
          }
        }
    if (pass) grid._faceLists = lists;
  }
  const L = grid._faceLists;
  const mk = (slots) => selectionOf(grid, slots.filter((s) => L[s].length).map((s) => ({ ...FACE_DIRS[s < DEF ? s % 6 : s === SX ? 0 : s === SY ? 2 : s - DEF], cells: L[s] })));
  // per-part selections from the part's box faces (audit A1 B1): exterior faces of the cells inside the box on its
  // boundary layer in each direction, whichever part owns them (a host fully covered by its layer boxes still has
  // top / bottom / side faces)
  for (let p = 0; p < np; p++) {
    const r = grid.partRange.subarray(6 * p, 6 * p + 6);
    if (r[0] < 0) continue;
    const [i0, i1, j0, j1, k0, k1] = r;
    for (let d = 0; d < 6; d++) {
      const out = [];
      const [ia, ib] = d === 0 ? [i0, i0 + 1] : d === 1 ? [i1 - 1, i1] : [i0, i1];
      const [ja, jb] = d === 2 ? [j0, j0 + 1] : d === 3 ? [j1 - 1, j1] : [j0, j1];
      const [ka, kb] = d === 4 ? [k0, k0 + 1] : d === 5 ? [k1 - 1, k1] : [k0, k1];
      for (let k = ka; k < kb; k++)
        for (let j = ja; j < jb; j++)
          for (let i = ia; i < ib; i++) {
            const c = i + nx * (j + ny * k);
            if (cellPart[c] >= 0 && classify(i, j, k, d) === 1) out.push(c);
          }
      L[6 * p + d] = Int32Array.from(out);
    }
  }
  for (let p = 0; p < np; p++) {
    if (grid.partRange[6 * p] < 0) continue;
    const id = parts[p].id;
    grid.selections[`top:${id}`] = mk([6 * p + 5]);
    grid.selections[`bottom:${id}`] = mk([6 * p + 4]);
    grid.selections[`side:${id}`] = mk([6 * p, 6 * p + 1, 6 * p + 2, 6 * p + 3]);
    grid.selections[`xmin:${id}`] = mk([6 * p]);
    grid.selections[`xmax:${id}`] = mk([6 * p + 1]);
    grid.selections[`ymin:${id}`] = mk([6 * p + 2]);
    grid.selections[`ymax:${id}`] = mk([6 * p + 3]);
  }
  grid.selections.default = mk([DEF, DEF + 1, DEF + 2, DEF + 3, DEF + 4, DEF + 5]);
  if (symX) grid.selections['sym:x'] = mk([SX]);
  if (symY) grid.selections['sym:y'] = mk([SY]);
  Object.defineProperty(grid, '_faceLists', { enumerable: false });
}

/** Area of the face of cell c in direction d (m^2). */
export function faceArea(grid, c, d) {
  const { nx, ny, xs, ys, zs } = grid;
  const i = c % nx, j = Math.floor(c / nx) % ny, k = Math.floor(c / (nx * ny));
  const hx = xs[i + 1] - xs[i], hy = ys[j + 1] - ys[j], hz = zs[k + 1] - zs[k];
  return d < 2 ? hy * hz : d < 4 ? hx * hz : hx * hy;
}

/** Per-part selection kinds: top / bottom (+z / -z), side (+-x, +-y), xmin / xmax / ymin / ymax (one side; L1 addition). */
export const SEL_RE = /^(top|bottom|side|xmin|xmax|ymin|ymax):(.+)$/;
const DIR_OF = { 'x-': 0, 'x+': 1, 'y-': 2, 'y+': 3, 'z-': 4, 'z+': 5 };
/** Face direction index of a selection group. */
export const groupDir = (g) => DIR_OF[g.axis + g.side];

function selectionOf(grid, groups) {
  let area = 0, nf = 0;
  for (const g of groups) {
    const d = groupDir(g);
    for (const c of g.cells) area += faceArea(grid, c, d);
    nf += g.cells.length;
  }
  const s = { groups, area_m2: area, faces: nf };
  if (groups.length === 1) Object.assign(s, { axis: groups[0].axis, side: groups[0].side, cells: groups[0].cells });
  return s;
}

/**
 * Resolve a selection name, with globs on the part id (`top:hbm_*`) merged per direction; null when nothing matches.
 * Plain names come from grid.selections.
 */
export function resolveSelection(grid, name) {
  if (Object.hasOwn(grid.selections, name)) return grid.selections[name];
  const m = SEL_RE.exec(name);
  if (!m || !/[*?]/.test(m[2])) return null;
  const re = globRegExp(m[2]);
  const byDir = new Map();
  for (const p of grid.parts) {
    if (!re.test(p.id)) continue;
    const s = grid.selections[`${m[1]}:${p.id}`];
    if (!s) continue;
    for (const g of s.groups) {
      const d = groupDir(g);
      if (!byDir.has(d)) byDir.set(d, []);
      byDir.get(d).push(g.cells);
    }
  }
  if (!byDir.size) return null;
  const groups = [...byDir.entries()].sort((a, b) => a[0] - b[0]).map(([d, arrs]) => {
    const cells = new Int32Array(arrs.reduce((a, x) => a + x.length, 0));
    let o = 0;
    for (const a of arrs) { cells.set(a, o); o += a.length; }
    return { ...FACE_DIRS[d], cells };
  });
  return selectionOf(grid, groups);
}

/** Indices of the parts whose id matches a glob (or exact id). */
export function matchParts(grid, glob) {
  const re = globRegExp(glob);
  const out = [];
  grid.parts.forEach((p, i) => { if (re.test(p.id)) out.push(i); });
  return out;
}

/** Node activity: 1 for nodes touching at least one non-void cell. */
export function activeNodes(grid) {
  const { nx, ny, nz, cellPart } = grid;
  const NX = nx + 1, NY = ny + 1;
  const act = new Uint8Array(NX * NY * (nz + 1));
  for (let k = 0, c = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++, c++) {
        if (cellPart[c] < 0) continue;
        const n = i + NX * (j + NY * k);
        act[n] = act[n + 1] = act[n + NX] = act[n + NX + 1] = 1;
        const m = n + NX * NY;
        act[m] = act[m + 1] = act[m + NX] = act[m + NX + 1] = 1;
      }
  return act;
}

function gridStats(grid, extra) {
  const { xs, ys, zs, nx, ny, nz, cellPart } = grid;
  let activeCells = 0, maxAspect = 1, hmin = Infinity, hmax = 0;
  for (let k = 0, c = 0; k < nz; k++) {
    const hz = zs[k + 1] - zs[k];
    const sliver = grid.sliverLayers?.has(k);
    for (let j = 0; j < ny; j++) {
      const hy = ys[j + 1] - ys[j];
      for (let i = 0; i < nx; i++, c++) {
        if (cellPart[c] < 0) continue;
        activeCells++;
        if (sliver || grid.sliverPlanes?.x.has(i) || grid.sliverPlanes?.y.has(j)) continue; // contact sliver cells: not geometry
        const hx = xs[i + 1] - xs[i];
        const lo = Math.min(hx, hy, hz), hi = Math.max(hx, hy, hz);
        if (hi / lo > maxAspect) maxAspect = hi / lo;
        if (lo < hmin) hmin = lo;
        if (hi > hmax) hmax = hi;
      }
    }
  }
  const act = activeNodes(grid);
  let an = 0;
  for (let q = 0; q < act.length; q++) an += act[q];
  return {
    nodes: (nx + 1) * (ny + 1) * (nz + 1), activeNodes: an, cells: nx * ny * nz, activeCells, nx, ny, nz, maxAspect,
    hmin_m: hmin, hmax_m: hmax, grading_x: extra.gradingX, grading_y: extra.gradingY,
  };
}
