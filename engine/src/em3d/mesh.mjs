// Layered ("2.5D") tetrahedral mesh for 3D EM blocks (lane L7, tranche E6): the em2d conforming Delaunay mesher
// triangulates the xy plane with every solid footprint as a constraint, the triangles are extruded through the z
// planes of every solid, and each prism is split into 3 tetrahedra with the minimum-global-index diagonal rule
// (Dompierre, Labbe, Vallet, Camarero 1999), which keeps the quad faces of neighbouring prisms conforming.
// Spike that chose this over a structured hex grid: DevLog/lanes/L7-em2d.md (wave 2). License: GPL-3.0-or-later.
//
// Spec (lengths um):
//   box:    {x: [x0, x1], y: [y0, y1], z: [z0, z1]}
//   axis:   extrusion axis 'z' (default; layered stacks, vertical bumps / vias) | 'x' | 'y' (lines along x / y: the
//           cross-section is triangulated and extruded along the line). Frame (u, v, w): z -> (x, y, z),
//           x -> (y, z, x), y -> (z, x, y).
//   background: material key
//   solids: [{name, kind: 'dielectric' | 'conductor', material?, h_um?, dz_um?, and one of
//             box_um: {x, y, z} | rect | poly | circle (footprint in the (u, v) plane) with w: [w0, w1]
//             (for axis z also z: [z0, z1])}]  painter order: later solids win
//   mesh:   {max_edge_um, max_dz_um (cell size along the axis), dz_min_um, dz_growth (axial grading at every
//           interval end), grade, max_vertices}
//   cuts:   [{axis: physical x | y | z, at_um}] (lane L13): reference planes the mesh must conform to. An in-plane
//           cut (axis is a cross-section direction) adds a box-spanning constraint line to the 2D triangulation; an
//           axial cut adds a z-plane. subMesh() then cuts a region out of the mesh along such a plane (line-run
//           de-embedding companions are cut from the device mesh, so they share its triangulation and z-planes).

import { meshDomain, extractMesh } from '../em2d/mesh.mjs';
import { pointInPolygon, polygonBBox } from '../em2d/geometry.mjs';
import { shapePolygon } from '../em2d/section.mjs';

const fail = (m) => {
  throw new Error(`em3d mesh: ${m}`);
};

/**
 * Sorted unique z planes: box, every solid's z0 / z1 (clipped), each interval subdivided to <= max dz. With
 * dz_min (> 0) the cells grow geometrically by `growth` from dz_min at both ends of every interval (interfaces and
 * conductor faces), capped by the interval's max dz: a z-graded layered mesh (wave 6: thin lines over thick layers).
 */
function zPlanes(box, solids, maxDz, dzMin = 0, growth = 1.5, extra = []) {
  const zs = new Set([box.z[0], box.z[1]]);
  for (const s of solids) for (const z of s.z) if (z > box.z[0] && z < box.z[1]) zs.add(z);
  for (const z of extra) if (z > box.z[0] && z < box.z[1]) zs.add(z);
  const base = [...zs].sort((a, b) => a - b);
  const out = [base[0]];
  for (let i = 0; i + 1 < base.length; i++) {
    const a = base[i],
      b = base[i + 1],
      mid = 0.5 * (a + b);
    let dz = maxDz;
    for (const s of solids) if (s.dz_um && mid > s.z[0] && mid < s.z[1]) dz = Math.min(dz, s.dz_um);
    const L = b - a;
    if (dzMin > 0 && dzMin < dz && L > 2 * dzMin) {
      // half-interval sizes dzMin, dzMin g, ... (capped at dz) until they cover L / 2, mirrored, scaled to fit L
      const half = [];
      let acc = 0,
        h = dzMin;
      while (acc < L / 2 - 1e-12) {
        const hh = Math.min(h, dz);
        half.push(hh);
        acc += hh;
        h *= growth;
      }
      const sizes = [...half, ...half.slice().reverse()];
      const tot = sizes.reduce((x, y) => x + y, 0);
      let z = a;
      for (let k = 0; k < sizes.length - 1; k++) {
        z += (sizes[k] * L) / tot;
        out.push(z);
      }
      out.push(b);
      continue;
    }
    const n = Math.max(1, Math.ceil(L / dz - 1e-9));
    for (let k = 1; k <= n; k++) out.push(k === n ? b : a + (L * k) / n);
  }
  return Float64Array.from(out);
}

/**
 * Build the tet mesh. Returns {nodes: Float64Array (3 per node, metres), nNodes, tets: Int32Array (4 per tet, vertex
 * indices sorted ascending), nTets, tetSolid: Int32Array (-1 = background), edges: Int32Array (2 per edge, a < b),
 * nEdges, tetEdges: Int32Array (6 per tet: local pairs 01 02 03 12 13 23), zs, mesh2d, stats}.
 */
export const FRAMES = { z: ['x', 'y', 'z'], x: ['y', 'z', 'x'], y: ['z', 'x', 'y'] };

export function buildLayeredMesh(spec) {
  const t0 = performance.now();
  const box0 = spec.box ?? fail('box required');
  const axis = spec.axis ?? 'z';
  const fr = FRAMES[axis] ?? fail(`axis must be x, y or z (got ${axis})`);
  const box = { x: box0[fr[0]], y: box0[fr[1]], z: box0[fr[2]] }; // frame (u, v, w) stored as x, y, z below
  const m = spec.mesh ?? {};
  const solids = (spec.solids ?? []).map((s0, i) => {
    let s = s0;
    if (s0.box_um) s = { ...s0, rect: { x: s0.box_um[fr[0]], y: s0.box_um[fr[1]] }, z: s0.box_um[fr[2]] };
    else if (s0.w) s = { ...s0, z: s0.w };
    const poly = shapePolygon(s, `solids[${i}]`);
    if (!Array.isArray(s.z) || !(s.z[1] > s.z[0])) fail(`solids[${i}]: axial range (z or w) [a, b] with b > a required`);
    return { ...s, name: s.name ?? `s${i}`, index: i, poly, bbox: polygonBBox(poly) };
  });
  const rect = { x0: box.x[0], x1: box.x[1], y0: box.y[0], y1: box.y[1] };
  const span = Math.max(rect.x1 - rect.x0, rect.y1 - rect.y0);
  const maxEdge = m.max_edge_um ?? span / 10;
  const grade = m.grade ?? 0.4;
  const sources = solids.filter((s) => s.h_um).map((s) => ({ poly: s.poly, filled: false, h0: s.h_um }));
  // reference-plane cuts (lane L13): in-plane cuts become box-spanning constraint lines, axial cuts extra z-planes
  const cutLoops = [],
    cutZ = [];
  for (const [ci, ct] of (spec.cuts ?? []).entries()) {
    const k = fr.indexOf(ct.axis);
    if (k < 0 || !Number.isFinite(ct.at_um)) fail(`cuts[${ci}]: {axis: x | y | z, at_um} required`);
    const lim = [box.x, box.y, box.z][k];
    if (!(ct.at_um > lim[0] && ct.at_um < lim[1])) fail(`cuts[${ci}]: ${ct.axis} = ${ct.at_um} um is not inside the box`);
    if (k === 2) cutZ.push(ct.at_um);
    else if (k === 0) cutLoops.push([[rect.x0, rect.y0], [ct.at_um, rect.y0], [ct.at_um, rect.y1], [rect.x0, rect.y1]]);
    else cutLoops.push([[rect.x0, rect.y0], [rect.x1, rect.y0], [rect.x1, ct.at_um], [rect.x0, ct.at_um]]);
  }
  const raw = meshDomain({
    rect,
    loops: [...solids.map((s, i) => ({ poly: s.poly, kind: 1, id: i })), ...cutLoops.map((poly) => ({ poly, kind: 1, id: -1 }))],
    classify: () => ({ region: 0, electrode: -1 }),
    maxEdge,
    sources,
    grade,
    minEdge: m.min_edge_um ?? maxEdge * 1e-3,
    maxVertices: m.max_vertices ?? 200000,
  });
  const m2 = extractMesh(raw, { keepConductors: true });
  const zs = zPlanes(box, solids, m.max_dz_um ?? (box.z[1] - box.z[0]) / 4, m.dz_min_um ?? 0, m.dz_growth ?? 1.5, cutZ);
  const nV2 = m2.nNodes,
    nT2 = m2.nTris,
    nL = zs.length - 1;
  const nNodes = nV2 * zs.length;
  const nodes = new Float64Array(3 * nNodes);
  const dst = fr.map((c) => ({ x: 0, y: 1, z: 2 })[c]); // frame component -> physical index
  for (let k = 0; k < zs.length; k++)
    for (let v = 0; v < nV2; v++) {
      const g = v + nV2 * k;
      nodes[3 * g + dst[0]] = m2.x[v] * 1e-6;
      nodes[3 * g + dst[1]] = m2.y[v] * 1e-6;
      nodes[3 * g + dst[2]] = zs[k] * 1e-6;
    }
  // per xy triangle: solids whose footprint contains the centroid
  const triSolids = [];
  for (let t = 0; t < nT2; t++) {
    const a = m2.tri[3 * t],
      b = m2.tri[3 * t + 1],
      c = m2.tri[3 * t + 2];
    const cx = (m2.x[a] + m2.x[b] + m2.x[c]) / 3,
      cy = (m2.y[a] + m2.y[b] + m2.y[c]) / 3;
    const list = [];
    for (const s of solids) if (cx >= s.bbox.x0 && cx <= s.bbox.x1 && cy >= s.bbox.y0 && cy <= s.bbox.y1 && pointInPolygon(cx, cy, s.poly)) list.push(s.index);
    triSolids.push(list);
  }
  const nTets = 3 * nT2 * nL;
  const tets = new Int32Array(4 * nTets);
  const tetSolid = new Int32Array(nTets);
  const tetTri = new Int32Array(nTets);
  const tetLayer = new Int32Array(nTets);
  let q = 0;
  const P = new Int32Array(6);
  const put = (i, j, k, l, solid, t, lay) => {
    const v = [P[i], P[j], P[k], P[l]].sort((x, y) => x - y);
    tets.set(v, 4 * q);
    tetSolid[q] = solid;
    tetTri[q] = t;
    tetLayer[q] = lay;
    q++;
  };
  // rotations of the prism (bottom 0 1 2, top 3 4 5 above 0 1 2) bringing local vertex r to position 0
  const ROT = [
    [0, 1, 2, 3, 4, 5],
    [1, 2, 0, 4, 5, 3],
    [2, 0, 1, 5, 3, 4],
    [3, 5, 4, 0, 2, 1],
    [4, 3, 5, 1, 0, 2],
    [5, 4, 3, 2, 1, 0],
  ];
  for (let k = 0; k < nL; k++) {
    const zc = 0.5 * (zs[k] + zs[k + 1]);
    for (let t = 0; t < nT2; t++) {
      let solid = -1;
      const list = triSolids[t];
      for (let i = list.length - 1; i >= 0; i--) {
        const s = solids[list[i]];
        if (zc > s.z[0] && zc < s.z[1]) {
          solid = s.index;
          break;
        }
      }
      const g = [m2.tri[3 * t], m2.tri[3 * t + 1], m2.tri[3 * t + 2]].map((v) => v + nV2 * k);
      const G = [g[0], g[1], g[2], g[0] + nV2, g[1] + nV2, g[2] + nV2];
      let r = 0;
      for (let i = 1; i < 6; i++) if (G[i] < G[r]) r = i;
      const R = ROT[r];
      for (let i = 0; i < 6; i++) P[i] = G[R[i]];
      // P[0] = min; quad face (1, 2, 5, 4) not touching 0: diagonal through its smallest vertex
      if (Math.min(P[1], P[5]) < Math.min(P[2], P[4])) {
        put(0, 1, 2, 5, solid, t, k);
        put(0, 1, 5, 4, solid, t, k);
        put(0, 4, 5, 3, solid, t, k);
      } else {
        put(0, 1, 2, 4, solid, t, k);
        put(0, 4, 2, 5, solid, t, k);
        put(0, 4, 5, 3, solid, t, k);
      }
    }
  }
  const E = buildEdges(tets, nTets, nNodes);
  return {
    nodes,
    nNodes,
    tets,
    nTets,
    tetSolid,
    tetTri,
    tetLayer,
    ...E,
    zs,
    nV2,
    axis,
    axisIndex: dst[2],
    frame: fr,
    mesh2d: m2,
    solids,
    box: box0,
    stats: { nodes: nNodes, tets: nTets, edges: E.nEdges, tris2d: nT2, layers: nL, ms: performance.now() - t0 },
  };
}

/** Edge numbering of a tet list (local pairs 01 02 03 12 13 23; vertex indices sorted ascending per tet). */
function buildEdges(tets, nTets, nNodes) {
  const emap = new Map();
  const edgeList = [];
  const tetEdges = new Int32Array(6 * nTets);
  for (let e = 0; e < nTets; e++)
    for (let l = 0; l < 6; l++) {
      const a = tets[4 * e + LOCAL_EDGES[l][0]],
        b = tets[4 * e + LOCAL_EDGES[l][1]];
      const key = a * nNodes + b;
      let id = emap.get(key);
      if (id === undefined) {
        id = edgeList.length / 2;
        emap.set(key, id);
        edgeList.push(a, b);
      }
      tetEdges[6 * e + l] = id;
    }
  const edges = Int32Array.from(edgeList);
  return { edges, nEdges: edges.length / 2, tetEdges, edgeIndex: (a, b) => emap.get(Math.min(a, b) * nNodes + Math.max(a, b)) };
}

/**
 * Region of a layered mesh between two planes normal to the physical axis `ax` (lane L13): the same prisms, the same
 * tet split, the same z-planes; nodes renumbered monotonically (sorted tets and the layered numbering v + nV2 k are
 * kept). The planes must be conforming: an axial plane must be one of the mesh z-planes; an in-plane plane must be
 * a union of 2D edges (buildLayeredMesh `cuts`, or a box side). Returns a mesh object with `box` clipped along ax.
 */
export function subMesh(mesh, ax, lo, hi) {
  const t0 = performance.now();
  const fr = mesh.frame ?? FRAMES[mesh.axis];
  const k = fr.indexOf(ax);
  if (k < 0) fail(`subMesh: axis ${ax}`);
  const scale = Math.max(...['x', 'y', 'z'].map((a) => mesh.box[a][1] - mesh.box[a][0]));
  const tol = 1e-9 * scale;
  const { nV2, zs } = mesh;
  const m2 = mesh.mesh2d;
  let nV2s, nodeMap, keepTet, zsS, tris2d;
  let k0 = 0;
  if (k === 2) {
    const ka = zs.findIndex((z) => Math.abs(z - lo) <= tol),
      kb = zs.findIndex((z) => Math.abs(z - hi) <= tol);
    if (ka < 0 || kb < 0 || kb <= ka) fail(`subMesh: ${ax} = ${lo} / ${hi} um are not z-planes of the mesh (add them as cuts)`);
    nV2s = nV2;
    k0 = ka;
    nodeMap = (g) => g - nV2 * ka;
    keepTet = (e) => mesh.tetLayer[e] >= ka && mesh.tetLayer[e] < kb;
    zsS = zs.slice(ka, kb + 1);
    tris2d = m2.nTris;
  } else {
    const c = k === 0 ? m2.x : m2.y;
    const keepTri = new Uint8Array(m2.nTris);
    const used = new Uint8Array(nV2);
    for (let t = 0; t < m2.nTris; t++) {
      const v = [m2.tri[3 * t], m2.tri[3 * t + 1], m2.tri[3 * t + 2]];
      const cc = (c[v[0]] + c[v[1]] + c[v[2]]) / 3;
      if (!(cc > lo && cc < hi)) continue;
      for (const q of v) if (c[q] < lo - tol || c[q] > hi + tol) fail(`subMesh: the 2D triangulation does not conform to ${ax} = ${lo} / ${hi} um (add the plane as a cut)`);
      keepTri[t] = 1;
      for (const q of v) used[q] = 1;
    }
    const vmap = new Int32Array(nV2).fill(-1);
    nV2s = 0;
    for (let v = 0; v < nV2; v++) if (used[v]) vmap[v] = nV2s++;
    nodeMap = (g) => vmap[g % nV2] + nV2s * Math.floor(g / nV2);
    keepTet = (e) => keepTri[mesh.tetTri[e]] === 1;
    zsS = zs;
    tris2d = keepTri.reduce((a, b) => a + b, 0);
  }
  const sel = [];
  for (let e = 0; e < mesh.nTets; e++) if (keepTet(e)) sel.push(e);
  if (!sel.length) fail(`subMesh: no tets between ${ax} = ${lo} and ${hi} um`);
  const nNodes = nV2s * zsS.length;
  const nodes = new Float64Array(3 * nNodes);
  const tets = new Int32Array(4 * sel.length);
  const tetSolid = new Int32Array(sel.length),
    tetTri = new Int32Array(sel.length),
    tetLayer = new Int32Array(sel.length);
  sel.forEach((e, q) => {
    for (let i = 0; i < 4; i++) {
      const g = mesh.tets[4 * e + i];
      const n = nodeMap(g);
      if (n < 0 || n >= nNodes) fail('subMesh: node map out of range');
      tets[4 * q + i] = n;
      nodes[3 * n] = mesh.nodes[3 * g];
      nodes[3 * n + 1] = mesh.nodes[3 * g + 1];
      nodes[3 * n + 2] = mesh.nodes[3 * g + 2];
    }
    tetSolid[q] = mesh.tetSolid[e];
    tetTri[q] = mesh.tetTri[e];
    tetLayer[q] = mesh.tetLayer[e] - k0;
  });
  const E = buildEdges(tets, sel.length, nNodes);
  const box = JSON.parse(JSON.stringify(mesh.box));
  box[ax] = [lo, hi];
  return {
    ...mesh,
    nodes,
    nNodes,
    tets,
    nTets: sel.length,
    tetSolid,
    tetTri,
    tetLayer,
    ...E,
    zs: zsS,
    nV2: nV2s,
    mesh2d: null,
    box,
    parent: { tets: sel.length, of: mesh.nTets },
    stats: { nodes: nNodes, tets: sel.length, edges: E.nEdges, tris2d, layers: zsS.length - 1, ms: performance.now() - t0 },
  };
}

export const LOCAL_EDGES = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];
