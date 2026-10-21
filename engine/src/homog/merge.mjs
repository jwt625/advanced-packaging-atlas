// Thin-layer rule for the structured grid (wave-1 open issue 5; R1 1.6). Lane L8.
// Measured (L8 notes 2026-10-20, MA5 1 um film on 775 um Si, q1im): the f64 round-off floor is set by the number of
// stacked very thin cells, not by the in-plane aspect alone: 1 cell through the film is accurate up to aspect 2e4
// (kappa error 5e-5 .. 2e-4), 4 cells through it (aspect 2e4 per cell) give 4e-3. Rule:
//   1. a layer is thin when cell_xy / h > max_aspect (default 500);
//   2. runs of >= 2 contiguous thin layers with the same footprint are merged into one exact-laminate block
//      (`homog:stack:<id>`, laminate.mjs via the RVE resolver registry; membrane stiffness and thermal force exact,
//      the force acts at the block mid-plane instead of its stiffness-weighted centroid: moment-arm error at most
//      t_run / 2 over the bending lever arm);
//   3. thin layers and merged blocks get exactly one cell through their thickness; thicker parts get
//      min_cells_per_layer cells through extra z grid planes (buildGrid `planes`, run with min_cells_per_layer 1);
//      a plane that would fall strictly inside a thin layer elsewhere, or closer than t_thin to any part face (sliver),
//      is skipped (reported).
// License: GPL-3.0-or-later.

const close = (a, b, t = 1e-6) => Math.abs(a - b) <= t * Math.max(1, Math.abs(a), Math.abs(b));
const fpKey = (p) => [p.x_mm, p.y_mm, p.w_mm, p.d_mm].map((v) => Math.round(v * 1e6)).join('|');
const overlaps = (a, b) =>
  Math.abs(a.x_mm - b.x_mm) * 2 < a.w_mm + b.w_mm - 1e-9 && Math.abs(a.y_mm - b.y_mm) * 2 < a.d_mm + b.d_mm - 1e-9 &&
  a.z_um < b.z_um + b.h_um - 1e-9 && b.z_um < a.z_um + a.h_um - 1e-9;

/**
 * @param {object[]} parts SPEC section 2 boxes
 * @param {{cell_xy_mm: number, max_aspect?: number, min_cells_per_layer?: number, materialOf?: (p) => string,
 *   registerStack?: (id: string, layers: object[]) => string, tsfOf?: (p) => number}} o
 * @returns {{parts, grid: {min_cells_per_layer: 1, planes: {z_um: number[]}}, report}}
 */
export function mergeThinLayers(parts, o) {
  const { cell_xy_mm, max_aspect = 500, min_cells_per_layer = 1, materialOf = (p) => p.material, registerStack, tsfOf = null } = o;
  if (!(cell_xy_mm > 0)) throw new Error('homog merge: cell_xy_mm > 0 required');
  const tThin = (cell_xy_mm * 1e3) / max_aspect; // um
  const thin = (p) => p.h_um < tThin;
  const groups = new Map();
  parts.forEach((p, i) => {
    const k = fpKey(p);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  });
  const remove = new Set(), added = [], merged = [], skipped = [];
  for (const idx of groups.values()) {
    const sorted = idx.slice().sort((a, b) => parts[a].z_um - parts[b].z_um);
    let run = [];
    const flush = () => {
      if (run.length >= 2) {
        const mem = run.map((i) => parts[i]);
        const z0 = mem[0].z_um, z1 = mem[mem.length - 1].z_um + mem[mem.length - 1].h_um;
        const box = { ...mem[0], z_um: z0, h_um: z1 - z0 };
        // another part covering the run region with cells of its own would be overridden: skip
        const blocker = parts.find((q, qi) => !run.includes(qi) && overlaps(q, box) && (q.priority ?? 0) >= Math.min(...mem.map((m) => m.priority ?? 0)));
        const tsf = tsfOf ? mem.map(tsfOf) : null;
        if (blocker) skipped.push({ members: mem.map((m) => m.id), reason: `overlapped by ${blocker.id}` });
        else if (tsf && tsf.some((t) => t !== tsf[0])) skipped.push({ members: mem.map((m) => m.id), reason: 'members have different stress-free temperatures' });
        else {
          const id = `merged_${mem[0].id}_${mem[mem.length - 1].id}`;
          const layers = mem.map((m) => ({ material: materialOf(m), t: m.h_um }));
          if (!registerStack) throw new Error('homog merge: registerStack (RVE resolver) is required');
          // the stack key is named by its content, so mirror-image runs share one material (symmetry crops compare
          // material keys) and the RVE cache serves them once
          const sig = layers.map((l) => `${l.material}@${l.t}`).join(';');
          let h = 2166136261;
          for (let q = 0; q < sig.length; q++) h = Math.imul(h ^ sig.charCodeAt(q), 16777619);
          const key = registerStack(`s${(h >>> 0).toString(36)}_${layers.length}`, layers);
          added.push({ ...box, id, kind: 'layer_stack', material: key, priority: Math.max(...mem.map((m) => m.priority ?? 0)), merged_from: mem.map((m) => m.id) });
          merged.push({ id, members: mem.map((m) => m.id), t_um: z1 - z0, aspect: (cell_xy_mm * 1e3) / (z1 - z0) });
          for (const i of run) remove.add(i);
        }
      }
      run = [];
    };
    for (let q = 0; q < sorted.length; q++) {
      const i = sorted[q], p = parts[i];
      const prev = run.length ? parts[run[run.length - 1]] : null;
      if (thin(p) && (!prev || close(prev.z_um + prev.h_um, p.z_um))) run.push(i);
      else {
        flush();
        if (thin(p)) run.push(i);
      }
    }
    flush();
  }
  const out = parts.filter((_, i) => !remove.has(i)).concat(added);
  // z planes: thick parts get min_cells_per_layer cells; never inside a thin layer / merged block
  const thinBoxes = out.filter((p) => thin(p) || p.kind === 'layer_stack');
  const planes = [], planesSkipped = [];
  // a plane closer than t_thin to any part face would create a sliver cell (a new thin layer): skipped
  const faces = out.flatMap((p) => [p.z_um, p.z_um + p.h_um]);
  if (min_cells_per_layer > 1)
    for (const p of out) {
      if (thin(p) || p.kind === 'layer_stack') continue;
      for (let c = 1; c < min_cells_per_layer; c++) {
        const z = p.z_um + (p.h_um * c) / min_cells_per_layer;
        if (thinBoxes.some((t) => z > t.z_um + 1e-9 && z < t.z_um + t.h_um - 1e-9)) planesSkipped.push({ part: p.id, z_um: z, reason: 'inside a thin layer' });
        else if (faces.some((f) => Math.abs(f - z) < tThin)) planesSkipped.push({ part: p.id, z_um: z, reason: 'sliver: closer than t_thin to a part face' });
        else planes.push(z);
      }
    }
  return {
    parts: out,
    grid: { min_cells_per_layer: 1, planes: { z_um: [...new Set(planes.map((z) => Math.round(z * 1e6) / 1e6))].sort((a, b) => a - b) } },
    report: { t_thin_um: tThin, max_aspect, merged, skipped, single_cell_thin: out.filter((p) => thin(p)).map((p) => p.id), planes_skipped: planesSkipped },
  };
}
