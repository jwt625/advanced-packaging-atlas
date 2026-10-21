// Node numbering for the mechanics elements on the SPEC section 3 grid (tranche E2).
// Corner nodes keep the SPEC node index n = i + (nx + 1) (j + (ny + 1) k), 0 <= n < Nc = (nx + 1)(ny + 1)(nz + 1).
// Extended numbering for q2s mid-edge nodes (proposed SPEC section 3 addition, DevLog/lanes/L8-mech.md):
//   x-edge (i..i+1, j, k):  Nc + i + nx (j + (ny + 1) k),                 count Ex = nx (ny + 1)(nz + 1)
//   y-edge (i, j..j+1, k):  Nc + Ex + i + (nx + 1)(j + ny k),             count Ey = (nx + 1) ny (nz + 1)
//   z-edge (i, j, k..k+1):  Nc + Ex + Ey + i + (nx + 1)(j + (ny + 1) k),  count Ez = (nx + 1)(ny + 1) nz
// Mid-edge node coordinates are the edge midpoints. Only nodes of non-void cells are active; active nodes are
// compacted in increasing extended index (compact id = rank). DOFs are interleaved: dof = 3 compact + component.
// License: GPL-3.0-or-later.

/** Extended node counts of a grid. */
export function nodeCounts(grid) {
  const { nx, ny, nz } = grid;
  const Nc = (nx + 1) * (ny + 1) * (nz + 1);
  const Ex = nx * (ny + 1) * (nz + 1), Ey = (nx + 1) * ny * (nz + 1), Ez = (nx + 1) * (ny + 1) * nz;
  return { Nc, Ex, Ey, Ez, N: Nc + Ex + Ey + Ez };
}

/** Extended node ids of cell (i, j, k) in local order (elements.mjs header): 8 corners, then 12 mid-edges for q2s. */
export function cellNodes(grid, i, j, k, nen, out = new Int32Array(nen)) {
  const { nx, ny } = grid;
  const NX = nx + 1, NY = ny + 1;
  const n0 = i + NX * (j + NY * k), P = NX * NY;
  out[0] = n0; out[1] = n0 + 1; out[2] = n0 + NX; out[3] = n0 + NX + 1;
  out[4] = n0 + P; out[5] = n0 + P + 1; out[6] = n0 + P + NX; out[7] = n0 + P + NX + 1;
  if (nen === 8) return out;
  const { Nc, Ex, Ey } = nodeCounts(grid);
  for (let e = 0; e < 4; e++) {
    const ja = e & 1, ka = e >> 1;
    out[8 + e] = Nc + i + nx * (j + ja + NY * (k + ka));
  }
  for (let e = 0; e < 4; e++) {
    const ia = e & 1, ka = e >> 1;
    out[12 + e] = Nc + Ex + i + ia + NX * (j + ny * (k + ka));
  }
  for (let e = 0; e < 4; e++) {
    const ia = e & 1, ja = e >> 1;
    out[16 + e] = Nc + Ex + Ey + i + ia + NX * (j + ja + NY * k);
  }
  return out;
}

/** Coordinates (m) of an extended node id. */
export function nodeXYZ(grid, id) {
  const { nx, ny, xs, ys, zs } = grid;
  const NX = nx + 1, NY = ny + 1;
  const { Nc, Ex, Ey } = nodeCounts(grid);
  if (id < Nc) {
    const i = id % NX, j = Math.floor(id / NX) % NY, k = Math.floor(id / (NX * NY));
    return [xs[i], ys[j], zs[k]];
  }
  let r = id - Nc;
  if (r < Ex) {
    const i = r % nx, j = Math.floor(r / nx) % NY, k = Math.floor(r / (nx * NY));
    return [0.5 * (xs[i] + xs[i + 1]), ys[j], zs[k]];
  }
  r -= Ex;
  if (r < Ey) {
    const i = r % NX, j = Math.floor(r / NX) % ny, k = Math.floor(r / (NX * ny));
    return [xs[i], 0.5 * (ys[j] + ys[j + 1]), zs[k]];
  }
  r -= Ey;
  const i = r % NX, j = Math.floor(r / NX) % NY, k = Math.floor(r / (NX * NY));
  return [xs[i], ys[j], 0.5 * (zs[k] + zs[k + 1])];
}

/**
 * Active-node compaction and element connectivity.
 * Returns {nen, cells (Int32Array of active cell ids), conn (compact node ids, nen per active cell),
 *   compact (Int32Array over extended ids, -1 inactive), ext (Int32Array compact -> extended id), nn}.
 */
export function buildNumbering(grid, type) {
  const nen = type === 'q2s' ? 20 : 8;
  const { nx, ny, nz, cellPart } = grid;
  const { N } = nodeCounts(grid);
  const used = new Uint8Array(type === 'q2s' ? N : (nx + 1) * (ny + 1) * (nz + 1));
  let nca = 0;
  for (let c = 0; c < cellPart.length; c++) if (cellPart[c] >= 0) nca++;
  const cells = new Int32Array(nca);
  const tmp = new Int32Array(nen);
  for (let k = 0, c = 0, q = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++, c++) {
        if (cellPart[c] < 0) continue;
        cells[q++] = c;
        cellNodes(grid, i, j, k, nen, tmp);
        for (let a = 0; a < nen; a++) used[tmp[a]] = 1;
      }
  const compact = new Int32Array(used.length).fill(-1);
  let nn = 0;
  for (let id = 0; id < used.length; id++) if (used[id]) compact[id] = nn++;
  const ext = new Int32Array(nn);
  for (let id = 0; id < used.length; id++) if (used[id]) ext[compact[id]] = id;
  const conn = new Int32Array(nca * nen);
  for (let q = 0; q < nca; q++) {
    const c = cells[q], i = c % nx, j = Math.floor(c / nx) % ny, k = Math.floor(c / (nx * ny));
    cellNodes(grid, i, j, k, nen, tmp);
    for (let a = 0; a < nen; a++) conn[q * nen + a] = compact[tmp[a]];
  }
  return { type, nen, cells, conn, compact, ext, nn, ndof: 3 * nn };
}

/** Cell (i, j, k) of a cell id. */
export const cellIJK = (grid, c) => [c % grid.nx, Math.floor(c / grid.nx) % grid.ny, Math.floor(c / (grid.nx * grid.ny))];
