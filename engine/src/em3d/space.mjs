// Global DOF map of the H(curl) space of order 1 or 2 on a tet mesh (lane L22, DevLog-014 D1). License:
// GPL-3.0-or-later.
//
// Numbering: [0, nE) Whitney DOFs (= edge ids, so the order-1 space is the prefix and its numbering is the one used by
// lanes L7 / L13), [nE, 2 nE) edge-gradient DOFs, [2 nE, 2 nE + 2 nF) face DOFs (two per face). Local order per tet:
// 6 Whitney (TET_EDGES), 6 gradients (same edges), 2 per face (TET_FACES); per triangle: 3 Whitney (TRI_EDGES),
// 3 gradients, 2 face (hcurl.mjs). Tets store vertices sorted ascending, so local and global orientations agree.

import { TET_FACES, TRI_EDGES } from './hcurl.mjs';

const fail = (m) => {
  throw new Error(`em3d space: ${m}`);
};

/** Faces of a tet mesh: faces (3 sorted vertices each), tetFaces (4 per tet, TET_FACES order), faceIndex(a, b, c). */
export function buildFaces(mesh) {
  const { tets, nTets, nNodes } = mesh;
  const map = new Map();
  const list = [];
  const tetFaces = new Int32Array(4 * nTets);
  const key = (a, b, c) => {
    const e = mesh.edgeIndex(a, b);
    if (e === undefined) fail('face edge not found');
    return e * nNodes + c;
  };
  for (let t = 0; t < nTets; t++)
    for (let f = 0; f < 4; f++) {
      const [i, j, k] = TET_FACES[f];
      const a = tets[4 * t + i],
        b = tets[4 * t + j],
        c = tets[4 * t + k];
      const kk = key(a, b, c);
      let id = map.get(kk);
      if (id === undefined) {
        id = list.length / 3;
        map.set(kk, id);
        list.push(a, b, c);
      }
      tetFaces[4 * t + f] = id;
    }
  return { faces: Int32Array.from(list), nFaces: list.length / 3, tetFaces, faceIndex: (a, b, c) => map.get(key(a, b, c)) };
}

/**
 * Space of order 1 or 2: {order, nDof, ndt (DOFs per tet), nfl (per face), tetDofs (ndt per tet), faceDofs(v sorted)
 * -> Int32Array(nfl), nEdges, nFaces, faces?, dofPoint(id, out) (edge midpoint or face centroid, metres), dofEdge(id)
 * (edge id of a Whitney / gradient DOF, -1 for face DOFs)}.
 */
export function buildSpace(mesh, order = 1) {
  const { nEdges, edges, nodes, tetEdges, nTets } = mesh;
  const edgeOf = (a, b) => {
    const id = mesh.edgeIndex(a, b);
    if (id === undefined) fail('face edge not found');
    return id;
  };
  const mid = (id, out) => {
    const a = edges[2 * id],
      b = edges[2 * id + 1];
    for (let d = 0; d < 3; d++) out[d] = 0.5 * (nodes[3 * a + d] + nodes[3 * b + d]);
    return out;
  };
  if (order === 1)
    return {
      order,
      nDof: nEdges,
      ndt: 6,
      nfl: 3,
      nEdges,
      nFaces: 0,
      tetDofs: tetEdges,
      faceDofs: (v) => Int32Array.from(TRI_EDGES, ([i, j]) => edgeOf(v[i], v[j])),
      dofPoint: mid,
      dofEdge: (id) => id,
    };
  if (order !== 2) fail(`order ${order} (1 | 2)`);
  const F = buildFaces(mesh);
  const nE = nEdges;
  const tetDofs = new Int32Array(20 * nTets);
  for (let t = 0; t < nTets; t++) {
    for (let l = 0; l < 6; l++) {
      tetDofs[20 * t + l] = tetEdges[6 * t + l];
      tetDofs[20 * t + 6 + l] = nE + tetEdges[6 * t + l];
    }
    for (let f = 0; f < 4; f++) {
      tetDofs[20 * t + 12 + 2 * f] = 2 * nE + 2 * F.tetFaces[4 * t + f];
      tetDofs[20 * t + 13 + 2 * f] = 2 * nE + 2 * F.tetFaces[4 * t + f] + 1;
    }
  }
  return {
    order,
    nDof: 2 * nE + 2 * F.nFaces,
    ndt: 20,
    nfl: 8,
    nEdges: nE,
    nFaces: F.nFaces,
    faces: F.faces,
    tetFaces: F.tetFaces,
    faceIndex: F.faceIndex,
    tetDofs,
    faceDofs: (v) => {
      const e = TRI_EDGES.map(([i, j]) => edgeOf(v[i], v[j]));
      const f = F.faceIndex(v[0], v[1], v[2]);
      if (f === undefined) fail('face not found');
      return Int32Array.from([e[0], e[1], e[2], nE + e[0], nE + e[1], nE + e[2], 2 * nE + 2 * f, 2 * nE + 2 * f + 1]);
    },
    dofPoint: (id, out) => {
      if (id < 2 * nE) return mid(id < nE ? id : id - nE, out);
      const f = (id - 2 * nE) >> 1;
      out.fill(0);
      for (let i = 0; i < 3; i++) for (let d = 0; d < 3; d++) out[d] += nodes[3 * F.faces[3 * f + i] + d] / 3;
      return out;
    },
    dofEdge: (id) => (id < nE ? id : id < 2 * nE ? id - nE : -1),
  };
}
