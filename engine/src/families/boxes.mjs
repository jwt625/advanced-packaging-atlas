// License: GPL-3.0-or-later.
// Flattened sim box list (parts + layer boxes + homogenized array boxes) with explicit priorities, homogenized
// material keys (SPEC section 2: `homog:<kind>:<base materials>:<area fraction>`) and mirror-symmetry detection.
// L2 (engine/src/materials) owns homogenize(); this module only emits the key, constituents and fraction.

import { combineStatus, rnd } from './params.mjs';
import { depthOf, rectOf } from './resolve.mjs';

// Inclusion material per array kind (template keys of config/package3d/TEMPLATE_FORMAT.md).
// Rationale: the Cu-pillar micro-bumps and C4 of the templates' analog rows are Cu-dominant by height
// (e.g. 30 um Cu + 25 um SnAg, ectc51909.2023.00155-a-i3; 15 + 7 um, -a-i2), so the joint inclusion is copper;
// BGA balls are solder. The split Cu/solder by height is a later refinement (E3 RVE).
export const INCLUSION = {
  microbump: 'copper', c4: 'copper', cu_pillar: 'copper', hybrid_bond: 'copper', bga: 'solder',
  tsv: 'copper', tgv: 'copper', tmv: 'copper', pth: 'copper', rdl_via: 'copper',
};
// homogenize() kinds of engine/src/materials (L2); array kinds without their own entry map to a generic one
export const HOMOG_KIND = { tmv: 'via_field' };
export const INCLUSION_NOTE = 'inclusion by array kind: Cu-pillar joints (micro-bump, C4) and vias copper, BGA solder (generator rule; Cu/solder split by height not modelled)';

/**
 * Priority (higher wins where boxes overlap): parts 10 * containment depth; underfill-kind parts + 4 (an underfill
 * outranks the mold it sits in); layers of a host 10 * depth(host) + 2; arrays 10 * depth(host) + 6 (mounted in
 * a host or a host layer) or 6 (between parts, inside the underfill).
 */
export function priorities(S) {
  const pr = new Map();
  for (const [tid, p] of S.pdecl) {
    const d = depthOf(S.pdecl, tid);
    pr.set(tid, 10 * d + (p.kind === 'underfill' ? 4 : 0));
  }
  return pr;
}

export function areaFraction(a) {
  const p = a.pitch_um;
  const d = a.diameter_um;
  if (a.fill_kind === 'plugged' && a.wall_um !== undefined) {
    const di = Math.max(d - 2 * a.wall_um, 0);
    return { value: (Math.PI * (d * d - di * di)) / (4 * p * p), formula: 'pi * (d^2 - (d - 2 wall)^2) / (4 pitch^2)', inputs: ['diameter_um', 'wall_um', 'pitch_um'] };
  }
  return { value: (Math.PI * d * d) / (4 * p * p), formula: 'pi * d^2 / (4 pitch^2)', inputs: ['diameter_um', 'pitch_um'] };
}

const fmtFrac = (f) => String(rnd(f));

export function buildBoxes(S) {
  const pr = priorities(S);
  const boxes = [];
  for (const p of S.parts) {
    p.priority = pr.get(p.template_id);
    boxes.push({ id: p.id, source: 'part', kind: p.kind, material: p.material_sim || p.material, ...(p.material_sim ? { material_template: p.material } : {}), x_mm: p.x_mm, y_mm: p.y_mm, w_mm: p.w_mm, d_mm: p.d_mm,
      z_um: p.z_um, h_um: p.h_um, priority: p.priority });
  }
  for (const l of S.layers) {
    const hostTid = S.parts.find((p) => p.id === l._hostInsts[0].id)?.template_id ?? l._hostInsts[0].tid;
    const pri = 10 * depthOf(S.pdecl, hostTid) + 2;
    l.priority = pri;
    let material = l.material_sim || l.material;
    if (l.route) {
      const f = l.route.fill;
      const metal = l.material_sim || l.material;
      const matrix = l.route.matrix_sim || l.route.matrix;
      // lines along x or y (signal / mixed levels, direction resolved per repeat, `alt` alternates x / y) homogenize
      // as columns along that axis; planes and pad levels as an isotropic sheet (`plane`; L2 suffixes x | y | xy | plane). Audit A1 S3.
      const axis = (l.route.use === 'signal' || l.route.use === 'mixed') && (l.route.dir === 'x' || l.route.dir === 'y') ? l.route.dir : 'plane';
      l.homog = { kind: 'rdl_layer', use: l.route.use, constituents: [metal, matrix], fraction: rnd(f), axis, dir: l.route.dir,
        fraction_dim: l.route.dims.fill, key: `homog:rdl_layer:${metal}+${matrix}:${fmtFrac(f)}:${axis}`,
        note: 'routed conductor level: metal area fraction = route fill (TEMPLATE_FORMAT.md layer route)' };
      material = l.homog.key;
    }
    for (const inst of l._hostInsts) {
      const part = S.parts.find((p) => p.id === inst.id);
      const bid = l._hostInsts.length > 1 ? `${l.id}@${inst.id}` : l.id;
      boxes.push({ id: bid, source: 'layer', kind: 'layer', role: l.role, layer: l.id,
        host: inst.id, material, x_mm: part.x_mm, y_mm: part.y_mm, w_mm: part.w_mm, d_mm: part.d_mm, z_um: l.z_um, h_um: l.h_um, priority: pri });
      // per-region level properties (route.regions, L19 2026-10-21): the region part of the level as its own homogenized
      // box one priority step above the level (below every nested part, e.g. a cavity, and below arrays)
      (l.route?.regions || []).forEach((rg, ri) => {
        const metal = l.material_sim || l.material, matrix = l.route.matrix_sim || l.route.matrix;
        const axis = (rg.use === 'signal' || rg.use === 'mixed') && (rg.dir === 'x' || rg.dir === 'y') ? rg.dir : 'plane';
        const key = `homog:rdl_layer:${metal}+${matrix}:${fmtFrac(rg.fill)}:${axis}`;
        const host = [part.x_mm - part.w_mm / 2, part.y_mm - part.d_mm / 2, part.x_mm + part.w_mm / 2, part.y_mm + part.d_mm / 2];
        rg.rects.forEach((r, k) => {
          const a = [Math.max(r[0], host[0]), Math.max(r[1], host[1]), Math.min(r[2], host[2]), Math.min(r[3], host[3])];
          if (!(a[2] - a[0] > 1e-9 && a[3] - a[1] > 1e-9)) return;
          boxes.push({ id: `${bid}~r${ri + 1}${rg.rects.length > 1 ? `_${k + 1}` : ''}`, source: 'layer_region', kind: 'layer', role: l.role, layer: l.id, host: inst.id,
            material: key, homog: { kind: 'rdl_layer', use: rg.use, constituents: [metal, matrix], fraction: rnd(rg.fill), axis, fraction_dim: rg.dims.fill },
            x_mm: rnd((a[0] + a[2]) / 2), y_mm: rnd((a[1] + a[3]) / 2), w_mm: rnd(a[2] - a[0]), d_mm: rnd(a[3] - a[1]), z_um: l.z_um, h_um: l.h_um, priority: pri + 1 });
        });
      });
    }
  }
  const solid = boxes.slice();
  const containing = (x, y, zc) => {
    let best = null;
    for (const b of solid) {
      if (Math.abs(x - b.x_mm) <= b.w_mm / 2 + 1e-9 && Math.abs(y - b.y_mm) <= b.d_mm / 2 + 1e-9 && zc >= b.z_um - 1e-9 && zc <= b.z_um + b.h_um + 1e-9) {
        if (!best || b.priority > best.priority) best = b;
      }
    }
    return best;
  };
  for (const a of S.arrays) {
    const host = a._host ? S.parts.find((p) => p.template_id === a._host) : null;
    const pri = a.mount === 'between' || a.mount === 'under' ? 6 : 10 * depthOf(S.pdecl, a._host) + 6;
    a.priority = pri;
    const zc = a.z_um + a.h_um / 2;
    const m = containing(a.region.x_mm, a.region.y_mm, zc);
    const matrix = m ? m.material : 'void';
    const incl = a.inclusion || INCLUSION[a.kind] || 'copper';
    const fr = areaFraction(a);
    const st = combineStatus('derived', fr.inputs.map((k) => a.dims[k]?.status).filter(Boolean));
    const hk = HOMOG_KIND[a.kind] || a.kind;
    a.homog = { kind: hk, array_kind: a.kind, constituents: [incl, matrix], fraction: rnd(fr.value), axis: 'z',
      fraction_dim: { status: st, value: rnd(fr.value), formula: fr.formula, inputs: fr.inputs, note: 'area fraction on a square grid; derived quantity whose status follows its inputs (DevLog-008)' },
      key: `homog:${hk}:${incl}+${matrix}:${fmtFrac(fr.value)}`, matrix_from: m ? m.id : null, inclusion_note: INCLUSION_NOTE };
    boxes.push({ id: a.id, source: 'array', kind: a.kind, material: a.homog.key, x_mm: a.region.x_mm, y_mm: a.region.y_mm,
      w_mm: a.region.w_mm, d_mm: a.region.d_mm, z_um: a.z_um, h_um: a.h_um, priority: pri, array: a.template_id, host: host?.id ?? null });
  }
  return boxes;
}

/** Mirror symmetry of the box list about x = 0 (mirror_x: x -> -x) and y = 0 (mirror_y: y -> -y). */
export function symmetry(boxes, tol = 1e-4) {
  const q = (v) => Math.round(v / tol);
  const key = (b, sx, sy) => [b.kind, b.material, q(sx * b.x_mm), q(sy * b.y_mm), q(b.w_mm), q(b.d_mm), q(b.z_um), q(b.h_um), b.priority].join('|');
  const count = (sx, sy) => {
    const m = new Map();
    for (const b of boxes) { const k = key(b, sx, sy); m.set(k, (m.get(k) || 0) + 1); }
    return m;
  };
  const base = count(1, 1);
  const same = (m) => m.size === base.size && [...m].every(([k, n]) => base.get(k) === n);
  const mirror_x = same(count(-1, 1));
  const mirror_y = same(count(1, -1));
  const allowed = ['none'];
  if (mirror_x) allowed.push('half_x');
  if (mirror_y) allowed.push('half_y');
  if (mirror_x && mirror_y) allowed.push('quarter');
  return { mirror_x, mirror_y, allowed,
    note: 'mirror_x: layout invariant under x -> -x (plane x = 0); half_x keeps x >= 0 with sym:x on x = 0. Geometry and materials only; loads (power maps) must be checked by the case.' };
}

export { rectOf };
