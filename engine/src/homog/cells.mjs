// Unit-cell geometries for RVE homogenization (tranche E3; DevLog-010 E3; R1 2.1 and implications C).
// Every cell is a box grid in the SPEC section 3 layout (xs, ys, zs, nx, ny, nz, cellPart, cellMat, parts, materials)
// so the mechanics kernels and material adaptor (../mech/) run on it unchanged. Phases are parts: index 0 = matrix,
// 1 = inclusion (stack: one part per layer). The pitch p is arbitrary (effective properties are scale free); p = 1 mm.
// Topologies:
//   column (axis x | y | z): circular inclusion of area fraction f, staircased on the cross-section grid by
//     area-matched selection of whole cells in order of centre distance (ties kept together, so the cell stays mirror
//     symmetric); 2 cells along the column axis (prismatic, periodic).
//   strip  (lines along x | y): strip of width f p through the full cell thickness; exact on the box grid.
//   plane  (metal sheet with antipads): metal matrix with a circular dielectric hole of area 1 - f.
//   xy     (orthogonal line levels): two equal sublevels, x-lines (bottom) and y-lines (top), each of fraction f;
//     layer thickness / pitch = opts.h_over_p (default 1, assumption).
//   stack  (z laminate): layers of given thickness fractions, uniform in-plane.
// License: GPL-3.0-or-later.

const P = 1e-3;

/** Symmetric graded 1D nodes on [0, p] with a uniform inner band [c - w, c + w] of m cells. */
function gradedNodes1D(p, w, m, { ratio = 1.25, hmax = p / 8 } = {}) {
  const c = p / 2;
  if (w >= c) {
    const n = Math.max(2, 2 * Math.ceil(m * c / (2 * w)));
    return Float64Array.from({ length: n + 1 }, (_, i) => (i * p) / n);
  }
  const hin = (2 * w) / m;
  const right = [];
  for (let i = 0; i <= m / 2; i++) right.push(c + i * hin);
  let x = right[right.length - 1], h = hin;
  const outer = [];
  while (x < p - 1e-15) {
    h = Math.min(h * ratio, hmax);
    x += h;
    outer.push(x);
  }
  // rescale the outer band so the last node lands on p
  const x0 = right[right.length - 1], span = outer[outer.length - 1] - x0;
  const nodes = right.concat(outer.map((v) => x0 + ((v - x0) * (p - x0)) / span));
  const left = nodes.slice(1).map((v) => p - v).reverse();
  return Float64Array.from(left.concat(nodes));
}

/** Uniform nodes on [0, p] with n cells. */
const uniform = (p, n) => Float64Array.from({ length: n + 1 }, (_, i) => (i * p) / n);

/** Merge sorted breakpoints and subdivide each interval into cells of at most h. */
function nodesFrom(breaks, h) {
  const out = [breaks[0]];
  for (let q = 0; q + 1 < breaks.length; q++) {
    const a = breaks[q], b = breaks[q + 1], n = Math.max(1, Math.ceil((b - a) / h - 1e-9));
    for (let i = 1; i <= n; i++) out.push(a + ((b - a) * i) / n);
  }
  return Float64Array.from(out);
}

function makeGrid(xs, ys, zs, phaseOf, materials) {
  const nx = xs.length - 1, ny = ys.length - 1, nz = zs.length - 1;
  const cellPart = new Int32Array(nx * ny * nz), cellMat = new Int32Array(nx * ny * nz);
  for (let k = 0, c = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++, c++) {
        const p = phaseOf(i, j, k);
        cellPart[c] = p;
        cellMat[c] = p;
      }
  const parts = materials.map((m, q) => ({ id: `phase_${q}`, kind: 'rve_phase', material: m }));
  const vol = new Float64Array(materials.length);
  for (let k = 0, c = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++, c++) vol[cellPart[c]] += (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]) * (zs[k + 1] - zs[k]);
  const V = (xs[nx] - xs[0]) * (ys[ny] - ys[0]) * (zs[nz] - zs[0]);
  return {
    xs, ys, zs, nx, ny, nz, cellPart, cellMat, parts, materials, symmetry: 'none', selections: {},
    stats: { nodes: (nx + 1) * (ny + 1) * (nz + 1), cells: nx * ny * nz }, phaseFractions: Array.from(vol, (v) => v / V), V,
  };
}

/**
 * Area-matched staircase disk on a cross-section grid (a: nodes along the first cross-section axis, b: second).
 * Returns Uint8Array (na x nb) with 1 = inside, and the achieved area fraction.
 */
export function staircaseDisk(a, b, f, side = 'nearest') {
  const na = a.length - 1, nb = b.length - 1, pa = a[na] - a[0], pb = b[nb] - b[0];
  const ca = (a[0] + a[na]) / 2, cb = (b[0] + b[nb]) / 2;
  const cells = [];
  for (let j = 0; j < nb; j++)
    for (let i = 0; i < na; i++) {
      const x = 0.5 * (a[i] + a[i + 1]) - ca, y = 0.5 * (b[j] + b[j + 1]) - cb;
      cells.push({ i, j, d: Math.hypot(x, y), A: (a[i + 1] - a[i]) * (b[j + 1] - b[j]) });
    }
  cells.sort((p, q) => p.d - q.d);
  const target = f * pa * pb;
  const mask = new Uint8Array(na * nb);
  let area = 0, q = 0;
  while (q < cells.length) {
    let r = q, gA = 0;
    while (r < cells.length && Math.abs(cells[r].d - cells[q].d) <= 1e-9 * (cells[q].d + pa)) gA += cells[r++].A;
    // nearest: stop when adding the tie group moves away from the target; below / above: bracket the target
    if (side === 'nearest' && Math.abs(area + gA - target) > Math.abs(area - target)) break;
    if (side === 'below' && area + gA > target * (1 + 1e-12)) break;
    if (side === 'above' && area >= target * (1 - 1e-12)) break;
    for (let s = q; s < r; s++) mask[cells[s].i + na * cells[s].j] = 1;
    area += gA;
    q = r;
  }
  return { mask, fraction: area / (pa * pb) };
}

/** Cross-section node arrays for a disk of area fraction f with about n cells across the pitch. */
function diskNodes(f, n) {
  const r = Math.sqrt(f / Math.PI) * P;
  if (r < 0.2 * P) {
    // small inclusion: uniform band of width 2.6 r with ~n/2 cells, graded outside
    const m = Math.max(8, 2 * Math.round(n / 4));
    return gradedNodes1D(P, 1.3 * r, m, { hmax: P / Math.max(4, n / 4) });
  }
  return uniform(P, n);
}

/**
 * Two staircase cells whose inclusion fractions bracket the target (column / plane; same grid), for linear
 * interpolation of the effective properties to the exact fraction; a single cell for exact topologies.
 */
export function buildCellPair(spec) {
  if (spec.topology !== 'column' && spec.topology !== 'plane') return [buildCell(spec)];
  const lo = buildCell({ ...spec, side: 'below' }), hi = buildCell({ ...spec, side: 'above' });
  const fl = lo.achieved.inclusion_fraction, fh = hi.achieved.inclusion_fraction;
  if (Math.abs(fh - fl) < 1e-14) return [lo];
  return [lo, hi];
}

/**
 * Build a unit cell.
 * @param {object} spec {topology: column | strip | plane | xy | stack, axis, f, inclusion, matrix, layers, n, h_over_p}
 */
export function buildCell(spec) {
  const { topology, n = 32 } = spec;
  if (topology === 'column' || topology === 'plane') {
    const axis = spec.axis ?? 'z';
    // plane: metal (inclusion key) is the matrix, the dielectric hole has area 1 - f
    const fi = topology === 'plane' ? 1 - spec.f : spec.f;
    const mats = topology === 'plane' ? [spec.inclusion, spec.matrix] : [spec.matrix, spec.inclusion];
    if (topology === 'plane' && Math.sqrt(fi / Math.PI) > 0.5) throw new Error(`homog: plane with metal fraction ${spec.f}: the antipad (area ${fi.toFixed(3)}) does not fit the cell (needs f >= 0.2146)`);
    const c = diskNodes(fi, n);
    const { mask, fraction } = staircaseDisk(c, c, fi, spec.side ?? 'nearest');
    const along = uniform(P, 2);
    let xs, ys, zs, phase;
    const na = c.length - 1;
    if (axis === 'z') { xs = c; ys = c; zs = along; phase = (i, j) => mask[i + na * j]; }
    else if (axis === 'x') { xs = along; ys = c; zs = c; phase = (i, j, k) => mask[j + na * k]; }
    else if (axis === 'y') { xs = c; ys = along; zs = c; phase = (i, j, k) => mask[i + na * k]; }
    else throw new Error(`homog: column axis ${axis}`);
    const g = makeGrid(xs, ys, zs, phase, mats);
    g.achieved = { inclusion_fraction: topology === 'plane' ? 1 - fraction : fraction, target: spec.f };
    return g;
  }
  if (topology === 'strip') {
    const axis = spec.axis ?? 'x';
    const w = spec.f * P, br = [0, (P - w) / 2, (P + w) / 2, P].filter((v, q, a) => q === 0 || v > a[q - 1] + 1e-15);
    const across = nodesFrom(br, P / Math.max(2, n / 4));
    const along = uniform(P, 2), thick = uniform(P, 2);
    const inside = (v) => v > (P - w) / 2 && v < (P + w) / 2;
    let g;
    if (axis === 'x') g = makeGrid(along, across, thick, (i, j) => (inside(0.5 * (across[j] + across[j + 1])) ? 1 : 0), [spec.matrix, spec.inclusion]);
    else if (axis === 'y') g = makeGrid(across, along, thick, (i) => (inside(0.5 * (across[i] + across[i + 1])) ? 1 : 0), [spec.matrix, spec.inclusion]);
    else throw new Error(`homog: strip axis must be x or y (got ${axis})`);
    g.achieved = { inclusion_fraction: g.phaseFractions[1], target: spec.f };
    return g;
  }
  if (topology === 'xy') {
    const w = spec.f * P, br = [0, (P - w) / 2, (P + w) / 2, P];
    const across = nodesFrom(br, P / Math.max(2, n / 4));
    const h = (spec.h_over_p ?? 1) * P;
    const zs = Float64Array.from([0, h / 4, h / 2, (3 * h) / 4, h]);
    const inside = (v) => v > (P - w) / 2 && v < (P + w) / 2;
    const g = makeGrid(across, across, zs, (i, j, k) => {
      const lower = k < 2;
      return (lower ? inside(0.5 * (across[j] + across[j + 1])) : inside(0.5 * (across[i] + across[i + 1]))) ? 1 : 0;
    }, [spec.matrix, spec.inclusion]);
    g.achieved = { inclusion_fraction: g.phaseFractions[1], target: spec.f, h_over_p: spec.h_over_p ?? 1 };
    return g;
  }
  if (topology === 'stack') {
    const L = spec.layers;
    if (!Array.isArray(L) || L.length < 1) throw new Error('homog: stack needs layers [{material, t}]');
    const T = L.reduce((a, l) => a + l.t, 0);
    const zb = [0];
    for (const l of L) zb.push(zb[zb.length - 1] + (l.t / T) * P);
    const zs = Float64Array.from(zb);
    const g = makeGrid(uniform(P, 1), uniform(P, 1), zs, (i, j, k) => k, L.map((l) => l.material));
    g.achieved = { thickness_fractions: L.map((l) => l.t / T) };
    return g;
  }
  throw new Error(`homog: unknown topology ${topology}`);
}
