// Grid builder (SPEC section 3; lane L1): box faces on grid planes, grading, size caps, per-part through-thickness
// cells, node budget, priority and containment, selections, symmetry crops and the mirror check. Fixtures are
// hand-made part lists (a 3-layer stack and a die-on-substrate), independent of the family generators (L3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGrid, resolveSelection, partBox, activeNodes } from '../src/grid/index.mjs';
import { gradedNodes, mergeBreakpoints } from '../src/grid/spacing.mjs';

export const stack3 = () => [
  { id: 'sub', kind: 'substrate', material: 'sub', x_mm: 0, y_mm: 0, w_mm: 50, d_mm: 50, z_um: 0, h_um: 1000 },
  { id: 'uf', kind: 'underfill', material: 'uf', x_mm: 0, y_mm: 0, w_mm: 50, d_mm: 50, z_um: 1000, h_um: 50 },
  { id: 'die', kind: 'die', material: 'si', x_mm: 0, y_mm: 0, w_mm: 50, d_mm: 50, z_um: 1050, h_um: 775 },
];
export const dieOnSub = () => [
  { id: 'substrate', kind: 'substrate', material: 'sub', x_mm: 0, y_mm: 0, w_mm: 40, d_mm: 30, z_um: 0, h_um: 1200 },
  { id: 'uf', kind: 'underfill', material: 'uf', x_mm: 0, y_mm: 0, w_mm: 18, d_mm: 14, z_um: 1200, h_um: 60 },
  { id: 'die', kind: 'die', material: 'si', x_mm: 0, y_mm: 0, w_mm: 16, d_mm: 12, z_um: 1260, h_um: 775 },
  { id: 'core', kind: 'die', material: 'si_hot', x_mm: 0, y_mm: 0, w_mm: 6, d_mm: 4, z_um: 1260, h_um: 30, in: 'die' },
];

const eqTol = (a, b, t = 1e-12) => Math.abs(a - b) <= t * Math.max(1, Math.abs(a), Math.abs(b));
const onPlane = (arr, v) => arr.some((x) => Math.abs(x - v) < 1e-12);

test('graded spacing: breakpoints kept, ratio <= g, cells <= H, on random breakpoint sets', () => {
  let seed = 11;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let t = 0; t < 300; t++) {
    const b = [0];
    for (let i = 0; i < 1 + Math.floor(rnd() * 10); i++) b.push(b[b.length - 1] + 10 ** (-3 + 4 * rnd()));
    const H = 0.3 + 3 * rnd(), g = 1.05 + 0.6 * rnd();
    const r = gradedNodes(b, H, g);
    for (let j = 0; j < b.length; j++) assert.equal(r.nodes[r.bpIndex[j]], b[j]);
    for (let q = 1; q < r.nodes.length; q++) {
      const h = r.nodes[q] - r.nodes[q - 1];
      assert.ok(h > 0 && h <= H * (1 + 1e-9));
      if (q > 1) {
        const h0 = r.nodes[q - 1] - r.nodes[q - 2];
        assert.ok(Math.max(h, h0) / Math.min(h, h0) <= g * (1 + 1e-9), `ratio ${Math.max(h, h0) / Math.min(h, h0)} > ${g}`);
      }
    }
  }
  assert.deepEqual(mergeBreakpoints([1, 0, 1 + 1e-12, 2], 1e-9), [0, 1, 2]);
  assert.throws(() => gradedNodes([0, 1], 1, 1), /grading must be > 1/);
});

test('3-layer stack: planes at every face, min cells per layer, size cap, stats', () => {
  const g = buildGrid(stack3(), { max_xy_mm: 2.5, min_cells_per_layer: 3, grading: 1.3 });
  assert.equal(g.nx, 20);
  assert.equal(g.ny, 20);
  assert.equal(g.nz, 9);
  for (const p of g.parts) {
    const b = partBox(p);
    assert.ok(onPlane(g.xs, b[0]) && onPlane(g.xs, b[1]) && onPlane(g.ys, b[2]) && onPlane(g.ys, b[3]) && onPlane(g.zs, b[4]) && onPlane(g.zs, b[5]));
  }
  assert.equal(g.stats.nodes, 21 * 21 * 10);
  assert.equal(g.stats.activeCells, g.stats.cells);
  assert.ok(eqTol(g.stats.maxAspect, 2.5e-3 / (50e-6 / 3)));
  assert.deepEqual(g.materials, ['sub', 'uf', 'si']);
  const top = g.selections['top:die'], bot = g.selections['bottom:sub'];
  assert.ok(eqTol(top.area_m2, 2.5e-3) && eqTol(bot.area_m2, 2.5e-3));
  assert.equal(top.axis, 'z');
  assert.equal(top.side, '+');
  assert.equal(g.selections['top:sub'].faces, 0);
  assert.ok(eqTol(g.selections['side:uf'].area_m2, 4 * 50e-3 * 50e-6));
  const total = 2 * 2.5e-3 + 4 * 50e-3 * 1825e-6;
  assert.ok(eqTol(g.selections.default.area_m2, total));
  // max_z_mm splits thick layers
  const g2 = buildGrid(stack3(), { max_xy_mm: 5, max_z_mm: 0.2 });
  assert.equal(g2.nz, 5 + 1 + 4);
});

test('node budget is a hard error, never a silent coarsening', () => {
  assert.throws(() => buildGrid(stack3(), { max_xy_mm: 0.5, max_nodes: 1000 }), /exceed mesh.max_nodes 1000/);
});

test('die on substrate: containment priority, voids, graded in-plane spacing, selections', () => {
  const g = buildGrid(dieOnSub(), { max_xy_mm: 2, grading: 1.25, min_cells_per_layer: 2 });
  assert.ok(g.stats.grading_x <= 1.25 + 1e-9 && g.stats.grading_y <= 1.25 + 1e-9);
  const { nx, ny, xs, ys, zs } = g;
  const idx = (id) => g.parts.findIndex((p) => p.id === id);
  // cell centre ownership
  const owner = (x, y, z) => {
    const i = xs.findIndex((v, q) => q < nx && xs[q + 1] > x), j = ys.findIndex((v, q) => q < ny && ys[q + 1] > y), k = zs.findIndex((v, q) => q < g.nz && zs[q + 1] > z);
    return g.cellPart[i + nx * (j + ny * k)];
  };
  assert.equal(owner(0.1e-3, 0.1e-3, 1270e-6), idx('core')); // contained part outranks its host
  assert.equal(owner(5e-3, 0.1e-3, 1270e-6), idx('die'));
  assert.equal(owner(15e-3, 0.1e-3, 1270e-6), -1); // void beside the die
  assert.equal(owner(15e-3, 0.1e-3, 600e-6), idx('substrate'));
  // top:substrate excludes the area under the underfill; side:die is exposed (void around)
  const sub = g.selections['top:substrate'];
  assert.ok(eqTol(sub.area_m2, 40e-3 * 30e-3 - 18e-3 * 14e-3, 1e-10));
  assert.ok(eqTol(g.selections['side:die'].area_m2, 2 * (16e-3 + 12e-3) * 775e-6, 1e-10));
  assert.ok(eqTol(g.selections['top:uf'].area_m2, 18e-3 * 14e-3 - 16e-3 * 12e-3, 1e-10));
  assert.equal(g.selections['bottom:core'].faces, 0); // core sits on the underfill: no exterior face
  // globs merge per direction
  const both = resolveSelection(g, 'top:*');
  assert.ok(eqTol(both.area_m2, 40e-3 * 30e-3, 1e-10));
  // void nodes are inactive
  const act = activeNodes(g);
  assert.ok(act.reduce((a, v) => a + v, 0) === g.stats.activeNodes && g.stats.activeNodes < g.stats.nodes);
  // explicit priority overrides containment; equal priorities warn
  const parts = dieOnSub();
  parts[3].priority = 0;
  const g3 = buildGrid(parts, { max_xy_mm: 2 });
  assert.ok(g3.warnings.some((w) => /equal-priority overlap die \/ core \(\d+ cells/.test(w)), g3.warnings.join('; '));
  assert.equal(g3.warnings.length, 1);
});

test('symmetry: mirror check, quarter crop, sym planes, rejection of asymmetric layouts', () => {
  const g = buildGrid(dieOnSub(), { max_xy_mm: 2, symmetry: 'quarter' });
  assert.equal(g.xs[0], 0);
  assert.equal(g.ys[0], 0);
  assert.equal(g.symFactor, 4);
  assert.ok(eqTol(g.selections['sym:x'].area_m2, 15e-3 * 1200e-6 + 7e-3 * 60e-6 + 6e-3 * 775e-6, 1e-10));
  assert.ok(eqTol(g.selections['sym:y'].area_m2, 20e-3 * 1200e-6 + 9e-3 * 60e-6 + 8e-3 * 775e-6, 1e-10));
  assert.ok(eqTol(g.selections['bottom:substrate'].area_m2, 20e-3 * 15e-3, 1e-10));
  // sym planes are not exterior faces
  for (const gr of g.selections.default.groups) if (gr.axis !== 'z') assert.ok(!(gr.side === '-' && gr.cells.some((c) => (gr.axis === 'x' ? c % g.nx === 0 : Math.floor(c / g.nx) % g.ny === 0))));
  const asym = dieOnSub();
  asym.push({ id: 'cap', kind: 'ipd', material: 'si', x_mm: 6, y_mm: 4, w_mm: 1, d_mm: 1, z_um: 1200, h_um: 50 });
  assert.throws(() => buildGrid(asym, { symmetry: 'half_x' }), /part cap .* has no mirror partner/);
  // drop_kinds removes it again
  assert.equal(buildGrid(asym, { symmetry: 'quarter', drop_kinds: ['ipd'] }).symFactor, 4);
  // a mirrored pair passes half_x and the partner map is an involution
  asym.push({ ...asym[4], id: 'cap2', x_mm: -6 });
  const gx = buildGrid(asym, { symmetry: 'half_x', max_xy_mm: 2 });
  const p = gx.mirror.x;
  for (let i = 0; i < p.length; i++) assert.equal(p[p[i]], i);
  assert.throws(() => buildGrid(asym, { symmetry: 'quarter' }), /about y = 0 rejected/);
});

test('full model with the symmetry planes added has the cropped mesh as its x, y >= 0 part', () => {
  const full = buildGrid(dieOnSub(), { max_xy_mm: 1.5, grading: 1.2, planes: { x_mm: [0], y_mm: [0] } });
  const q = buildGrid(dieOnSub(), { max_xy_mm: 1.5, grading: 1.2, symmetry: 'quarter' });
  const i0 = full.xs.findIndex((v) => Math.abs(v) < 1e-15), j0 = full.ys.findIndex((v) => Math.abs(v) < 1e-15);
  assert.equal(full.xs.length - i0, q.xs.length);
  for (let i = 0; i < q.xs.length; i++) assert.ok(Math.abs(full.xs[i0 + i] - q.xs[i]) < 1e-15);
  for (let j = 0; j < q.ys.length; j++) assert.ok(Math.abs(full.ys[j0 + j] - q.ys[j]) < 1e-15);
  // mirrored spacing in the full model
  for (let i = 0; i < full.xs.length; i++) assert.ok(Math.abs(full.xs[i] + full.xs[full.xs.length - 1 - i]) < 1e-15);
});

test('input errors name the part and the key', () => {
  assert.throws(() => buildGrid([{ id: 'a', kind: 'x', material: 'm', x_mm: 0, y_mm: 0, w_mm: 0, d_mm: 1, z_um: 0, h_um: 1 }]), /part a: w_mm must be > 0/);
  assert.throws(() => buildGrid([...stack3(), stack3()[0]]), /duplicate part id sub/);
  assert.throws(() => buildGrid(stack3(), { symmetry: 'octant' }), /unknown symmetry octant/);
  const cyc = stack3();
  cyc[0].in = 'die';
  cyc[2].in = 'sub';
  assert.throws(() => buildGrid(cyc), /containment cycle/);
});

test('snapping: generator rounding slivers merge onto one plane, symmetric, reported; z films are kept', () => {
  const parts = [
    { id: 'base', kind: 'substrate', material: 'm', x_mm: 0, y_mm: 0, w_mm: 30, d_mm: 30, z_um: 0, h_um: 500 },
    { id: 'a', kind: 'die', material: 'm', x_mm: 0, y_mm: 0, w_mm: 21.3334, d_mm: 10, z_um: 500, h_um: 100 },
    { id: 'b', kind: 'die', material: 'm', x_mm: 0, y_mm: 0, w_mm: 21.3333, d_mm: 4, z_um: 600, h_um: 2 },
  ];
  const g = buildGrid(parts, { max_xy_mm: 2, grading: 1.3 });
  // half widths 10.6667 and 10.66665 mm: a 1:1 tie snaps both to the mean (0.025 um shift each, 4 coordinates)
  assert.ok(Math.abs(g.stats.snap_max_shift_um.x - 0.025) < 1e-6);
  assert.ok(g.warnings.some((w) => /snapped x: 4 face coordinates moved by <= 0.0250 um/.test(w)), g.warnings.join('; '));
  const g0 = buildGrid(parts, { max_xy_mm: 2, grading: 1.3, snap_xy_um: 0 });
  assert.ok(g0.nx > g.nx + 20, `${g0.nx} vs ${g.nx}`);
  for (let i = 0; i < g.xs.length; i++) assert.ok(Math.abs(g.xs[i] + g.xs[g.xs.length - 1 - i]) < 1e-15);
  assert.ok(g.zs.some((z) => Math.abs(z - 602e-6) < 1e-15)); // 2 um film kept in z
  assert.equal(buildGrid(parts, { symmetry: 'half_x' }).xs[0], 0);
});

test('snapping is complete-linkage: a chain of 0.9 um gaps is not collapsed beyond the tolerance (audit A1 S6)', async () => {
  const { snapClusters } = await import('../src/grid/spacing.mjs');
  const um = 1e-6;
  const r = snapClusters([0, 0.9, 1.8, 2.7, 3.6].map((v) => v * um), 1 * um);
  assert.ok(r.maxShift <= 1 * um + 1e-18, `${r.maxShift}`);
  assert.equal(r.values.length, 3);
  // parts 1.8 um wide (wider than the tolerance) whose faces chain at 0.9 um spacing are kept (single linkage collapsed
  // the whole chain onto one plane and dropped them)
  const strips = [0, 1, 2].map((s) => ({ id: `s${s}`, kind: 'trace', material: 'm', x_mm: (s * 0.9 + 0.9) * 1e-3, y_mm: 0, w_mm: 1.8e-3, d_mm: 1, z_um: 10 + 5 * s, h_um: 5 }));
  const g = buildGrid([{ id: 'base', kind: 'layer', material: 'm', x_mm: 0, y_mm: 0, w_mm: 2, d_mm: 2, z_um: 0, h_um: 10 }, ...strips], { max_xy_mm: 0.5 });
  assert.ok(!g.warnings.some((w) => /thinner than the snap tolerance/.test(w)), g.warnings.join('; '));
  assert.ok(g.stats.snap_max_shift_um.x <= 1 + 1e-9);
});
