// Cross-section description -> conforming triangle mesh with skin-depth grading (EM 2D lane L7).
// Geometry in micrometres (mesher convention, EO engine). License: GPL-3.0-or-later.
//
// Section spec (all lengths um):
//   box:         {x: [x0, x1], y: [y0, y1], bc: {left, right, bottom, top}}  bc = 'pec' (phi = 0, A_z = 0, tied to the
//                reference) | 'pmc' (natural: zero normal D, zero tangential H)
//   background:  material key of everything not covered by a dielectric or conductor (e.g. 'air')
//   dielectrics: [{name, material, rect: {x: [a, b], y: [c, d]} | poly: [[x, y], ...]}]  painter order (later wins)
//   conductors:  [{name, role: 'signal' | 'ground', sigma_S_m, rect | poly | circle: {c: [x, y], r, n} |
//                 half_annulus: {c, r_in, r_out, n, upper}}]
//                conductors win over dielectrics; distinct conductors must not touch
//   mesh:        {order: 1 | 2, max_edge_um, grade, skin_cells, f_max_Hz, layer_cells, conductor_cells,
//                 window_um, far_factor, max_vertices, min_edge_um}

import { meshDomain, extractMesh, meshQuality } from './mesh.mjs';
import { rectToPolygon, ensureCcw, pointInPolygon, polygonBBox, polygonArea } from './geometry.mjs';
import { skinDepth } from './closed-forms.mjs';

const fail = (m) => {
  throw new Error(`em2d section: ${m}`);
};

/** Shape -> ccw polygon (um). */
export function shapePolygon(s, where) {
  if (s.rect) {
    const { x, y } = s.rect;
    if (!(x[1] > x[0] && y[1] > y[0])) fail(`${where}: rect must have x[1] > x[0] and y[1] > y[0]`);
    return rectToPolygon(x, y);
  }
  if (s.poly) {
    if (s.poly.length < 3) fail(`${where}: poly needs >= 3 vertices`);
    return ensureCcw(s.poly);
  }
  if (s.circle) {
    const { c, r } = s.circle;
    const n = s.circle.n ?? 96;
    if (!(r > 0) || n < 8) fail(`${where}: circle needs r > 0 and n >= 8`);
    const p = [];
    for (let i = 0; i < n; i++) p.push([c[0] + r * Math.cos((2 * Math.PI * i) / n), c[1] + r * Math.sin((2 * Math.PI * i) / n)]);
    return p;
  }
  if (s.half_annulus) {
    // {c, r_in, r_out, n, upper: true|false}: half ring above (upper) or below the horizontal diameter
    const { c, r_in: ri, r_out: ro } = s.half_annulus;
    const n = s.half_annulus.n ?? 96;
    const sgn = s.half_annulus.upper === false ? -1 : 1;
    const p = [];
    for (let i = 0; i <= n; i++) {
      const a = (Math.PI * i) / n;
      p.push([c[0] + ro * Math.cos(a), c[1] + sgn * ro * Math.sin(a)]);
    }
    for (let i = n; i >= 0; i--) {
      const a = (Math.PI * i) / n;
      p.push([c[0] + ri * Math.cos(a), c[1] + sgn * ri * Math.sin(a)]);
    }
    return ensureCcw(p);
  }
  return fail(`${where}: shape needs rect, poly or circle`);
}

const minDim = (poly) => {
  const b = polygonBBox(poly);
  return Math.min(b.x1 - b.x0, b.y1 - b.y0);
};

/**
 * Build the region table and mesh. Returns {mesh, regions, conductors, dielectricRegions, box, stats}.
 * regions[r] = {kind: 'dielectric', material, name} | {kind: 'conductor', cond, name}; mesh.triRegion indexes it.
 */
export function buildSection(spec) {
  const box = spec.box ?? fail('box is required');
  const rect = { x0: box.x[0], x1: box.x[1], y0: box.y[0], y1: box.y[1] };
  if (!(rect.x1 > rect.x0 && rect.y1 > rect.y0)) fail('box extents invalid');
  const bc = { left: 'pmc', right: 'pmc', bottom: 'pmc', top: 'pmc', ...(box.bc ?? {}) };
  for (const [k, v] of Object.entries(bc)) if (v !== 'pec' && v !== 'pmc') fail(`box.bc.${k} must be 'pec' or 'pmc' (got ${v})`);
  const m = spec.mesh ?? {};
  const order = m.order ?? 2;
  if (order !== 1 && order !== 2) fail('mesh.order must be 1 or 2');
  const grade = m.grade ?? 0.45;
  const skinCells = m.skin_cells ?? 1;
  const layerCells = m.layer_cells ?? 3;
  const conductorCells = m.conductor_cells ?? 4;
  const farFactor = m.far_factor ?? 6;
  const boxSpan = Math.max(rect.x1 - rect.x0, rect.y1 - rect.y0);
  const maxEdge = m.max_edge_um ?? boxSpan / 12;

  const regions = [{ kind: 'dielectric', material: spec.background ?? fail('background material is required'), name: 'background' }];
  const dielectrics = (spec.dielectrics ?? []).map((d, i) => {
    const poly = shapePolygon(d, `dielectrics[${i}]`);
    if (!d.material) fail(`dielectrics[${i}].material is required`);
    const region = regions.length;
    regions.push({ kind: 'dielectric', material: d.material, name: d.name ?? `diel${i}` });
    return { ...d, poly, region, bbox: polygonBBox(poly) };
  });
  const conductors = (spec.conductors ?? []).map((c, i) => {
    const poly = shapePolygon(c, `conductors[${i}]`);
    if (c.role !== 'signal' && c.role !== 'ground') fail(`conductors[${i}].role must be 'signal' or 'ground'`);
    const region = regions.length;
    regions.push({ kind: 'conductor', cond: i, name: c.name ?? `c${i}` });
    return { ...c, name: c.name ?? `c${i}`, index: i, poly, region, bbox: polygonBBox(poly), areaUm2: Math.abs(polygonArea(poly)) };
  });
  if (!conductors.some((c) => c.role === 'signal')) fail('at least one signal conductor is required');
  // distinct conductors must not overlap or touch (separate potentials / voltage drops); ground conductors are one
  // tied group and may touch each other (e.g. a coax shell built from two half annuli)
  for (let i = 0; i < conductors.length; i++)
    for (let j = i + 1; j < conductors.length; j++) {
      if (conductors[i].role === 'ground' && conductors[j].role === 'ground') continue;
      const a = conductors[i].bbox,
        b = conductors[j].bbox;
      const sep = Math.max(b.x0 - a.x1, a.x0 - b.x1, b.y0 - a.y1, a.y0 - b.y1);
      if (sep <= 0) {
        // bboxes overlap: check vertices inside each other (enough for convex shapes used here)
        const hit = conductors[i].poly.some(([x, y]) => pointInPolygon(x, y, conductors[j].poly)) || conductors[j].poly.some(([x, y]) => pointInPolygon(x, y, conductors[i].poly));
        if (hit || sep === 0) fail(`conductors ${conductors[i].name} and ${conductors[j].name} overlap or touch`);
      }
    }

  // ---- size field ----
  const fMax = m.f_max_Hz ?? null;
  const sources = [];
  const regionMaxEdge = new Array(regions.length).fill(Infinity);
  const sig = conductors.filter((c) => c.role === 'signal');
  const sb = sig.reduce((b, c) => ({ x0: Math.min(b.x0, c.bbox.x0), x1: Math.max(b.x1, c.bbox.x1), y0: Math.min(b.y0, c.bbox.y0), y1: Math.max(b.y1, c.bbox.y1) }), { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity });
  const condEdge = conductors.map((c) => {
    const geo = minDim(c.poly) / conductorCells;
    if (!fMax || !(c.sigma_S_m > 0)) return geo;
    const d = skinDepth(fMax, c.sigma_S_m) * 1e6;
    return Math.min(geo, d / skinCells);
  });
  // distance from the signal bbox to the nearest ground (bbox gap) sets the default fine window on wide grounds
  let gapG = Infinity;
  for (const c of conductors)
    if (c.role === 'ground') {
      const g = Math.max(c.bbox.x0 - sb.x1, sb.x0 - c.bbox.x1, c.bbox.y0 - sb.y1, sb.y0 - c.bbox.y1, 0);
      gapG = Math.min(gapG, g);
    }
  const windowUm = m.window_um ?? (Number.isFinite(gapG) ? Math.max(1.5 * gapG, 0.5 * (sb.x1 - sb.x0)) : Infinity);
  const win = { x0: sb.x0 - windowUm, x1: sb.x1 + windowUm, y0: sb.y0 - windowUm, y1: sb.y1 + windowUm };
  for (const c of conductors) {
    const h0 = condEdge[c.index];
    const b = c.bbox;
    const wide = c.role === 'ground' && c.rect && Number.isFinite(windowUm) && (b.x0 < win.x0 || b.x1 > win.x1 || b.y0 < win.y0 || b.y1 > win.y1);
    if (wide) {
      // fine boundary layer only on the faces of a wide ground that face the signals (within windowUm), clipped to the
      // window along the face; the rest of the ground boundary gets h0 * far_factor
      const faces = [
        [[b.x0, b.y1], [b.x1, b.y1], sb.y1 > b.y1], // top (outward +y): signals above it
        [[b.x0, b.y0], [b.x1, b.y0], sb.y0 < b.y0], // bottom
        [[b.x0, b.y0], [b.x0, b.y1], sb.x0 < b.x0], // left
        [[b.x1, b.y0], [b.x1, b.y1], sb.x1 > b.x1], // right
      ];
      for (const [p0, p1, facing] of faces) {
        if (!facing) continue;
        const horiz = p0[1] === p1[1];
        const dPerp = horiz ? Math.max(sb.y0 - p0[1], p0[1] - sb.y1, 0) : Math.max(sb.x0 - p0[0], p0[0] - sb.x1, 0);
        if (dPerp > windowUm) continue;
        if (horiz) {
          const a0 = Math.max(p0[0], win.x0),
            a1 = Math.min(p1[0], win.x1);
          if (a1 > a0) sources.push({ poly: [[a0, p0[1]], [a1, p0[1]]], filled: false, h0 });
        } else {
          const a0 = Math.max(p0[1], win.y0),
            a1 = Math.min(p1[1], win.y1);
          if (a1 > a0) sources.push({ poly: [[p0[0], a0], [p0[0], a1]], filled: false, h0 });
        }
      }
      sources.push({ poly: c.poly, filled: false, h0: h0 * farFactor });
    } else sources.push({ poly: c.poly, filled: false, h0 });
  }
  for (const d of dielectrics) {
    const t = Math.min(d.bbox.x1 - d.bbox.x0, d.bbox.y1 - d.bbox.y0);
    regionMaxEdge[d.region] = Math.min(maxEdge, t / layerCells);
  }
  for (const c of conductors) regionMaxEdge[c.region] = Math.min(maxEdge, minDim(c.poly) / 2);

  const classify = (x, y) => {
    for (const c of conductors) if (x >= c.bbox.x0 && x <= c.bbox.x1 && y >= c.bbox.y0 && y <= c.bbox.y1 && pointInPolygon(x, y, c.poly)) return { region: c.region, electrode: -1 };
    for (let i = dielectrics.length - 1; i >= 0; i--) {
      const d = dielectrics[i];
      if (x >= d.bbox.x0 && x <= d.bbox.x1 && y >= d.bbox.y0 && y <= d.bbox.y1 && pointInPolygon(x, y, d.poly)) return { region: d.region, electrode: -1 };
    }
    return { region: 0, electrode: -1 };
  };
  const loops = [...dielectrics.map((d, i) => ({ poly: d.poly, kind: 1, id: i })), ...conductors.map((c, i) => ({ poly: c.poly, kind: 1, id: i }))];
  const minEdgeAll = Math.min(...condEdge);
  const raw = meshDomain({
    rect,
    loops,
    classify,
    maxEdge,
    sources,
    regionMaxEdge,
    grade,
    minEdge: m.min_edge_um ?? Math.min(minEdgeAll / 8, maxEdge * 1e-4),
    maxVertices: m.max_vertices ?? 400000,
  });
  const mesh = extractMesh(raw, { keepConductors: true });
  const q = meshQuality(mesh);
  const nCondTris = Array.from(mesh.triRegion).filter((r) => regions[r].kind === 'conductor').length;
  return {
    mesh,
    order,
    regions,
    conductors,
    dielectrics,
    rect,
    bc,
    sizing: { maxEdge, condEdge, windowUm, grade, skinCells, fMax },
    stats: { nodes: mesh.nNodes, tris: mesh.nTris, condTris: nCondTris, minAngleDeg: q.minAngleDeg, mesh_ms: mesh.stats.ms + (mesh.stats.extract_ms ?? 0) },
  };
}

/** Per-DOF flags: on which box side (bit 1 left, 2 right, 4 bottom, 8 top). */
export function boundaryFlags(space, rect) {
  const tol = 1e-9 * Math.max(rect.x1 - rect.x0, rect.y1 - rect.y0);
  const f = new Uint8Array(space.nDof);
  for (let d = 0; d < space.nDof; d++) {
    const x = space.x[d],
      y = space.y[d];
    if (Math.abs(x - rect.x0) <= tol) f[d] |= 1;
    if (Math.abs(x - rect.x1) <= tol) f[d] |= 2;
    if (Math.abs(y - rect.y0) <= tol) f[d] |= 4;
    if (Math.abs(y - rect.y1) <= tol) f[d] |= 8;
  }
  return f;
}

export const pecMask = (bc) => (bc.left === 'pec' ? 1 : 0) | (bc.right === 'pec' ? 2 : 0) | (bc.bottom === 'pec' ? 4 : 0) | (bc.top === 'pec' ? 8 : 0);
