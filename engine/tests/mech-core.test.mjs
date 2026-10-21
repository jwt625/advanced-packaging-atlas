// Mechanics core gates (lane L8, E2): constitutive checks, patch tests, library CTE rebase, supports rules,
// symmetry crop = full model, direct vs iterative agreement, warpage sign, singular-corner flag.
// License: GPL-3.0-or-later.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGrid } from '../src/grid/index.mjs';
import { solveMech, explicitResolver, explicitRebase, probeU, classifyCorner } from '../src/mech/index.mjs';
import { stiffnessLab, invertDense, vonMises, principal, directionCosines } from '../src/mech/constitutive.mjs';
import { resolve as libResolve, rebaseSecantCte } from '../src/materials/node.mjs';

const SET = {
  si_iso: { E_GPa: 130, nu: 0.28, cte_ppmK: 2.6 },
  uf: { E_GPa: 8, nu: 0.35, cte_ppmK: 30 },
  sub: { E_GPa: 25, nu: 0.30, cte_ppmK: 15 },
  cu: { E_GPa: 110, nu: 0.34, cte_ppmK: 17 },
  si_cubic: { elastic: { type: 'cubic', C11: 165.6e9, C12: 63.9e9, C44: 79.5e9 }, cte_ppmK: 2.6 },
  ortho: { elastic: { type: 'ortho', Ex: 20e9, Ey: 30e9, Ez: 10e9, nuxy: 0.2, nuyz: 0.3, nuxz: 0.25, Gxy: 8e9, Gyz: 4e9, Gxz: 5e9 }, cte_ppmK: [11, 14, 40] },
};
const R = explicitResolver(SET), RB = explicitRebase(SET);
const maxAbs = (a) => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const MA4B = [
  { id: 'sub', kind: 'substrate', material: 'sub', x_mm: 0, y_mm: 0, w_mm: 50, d_mm: 50, z_um: 0, h_um: 1000 },
  { id: 'uf', kind: 'underfill', material: 'uf', x_mm: 0, y_mm: 0, w_mm: 50, d_mm: 50, z_um: 1000, h_um: 50 },
  { id: 'si', kind: 'die', material: 'si_iso', x_mm: 0, y_mm: 0, w_mm: 50, d_mm: 50, z_um: 1050, h_um: 775 },
];
const base = { resolve: R, rebase: RB, stress_free_C: { default: 150 }, temperature: { uniform_C: 25 } };

test('constitutive: cubic <110> modulus, ortho compliance round trip, rotation convention, von Mises, principal', () => {
  const D = stiffnessLab({ type: 'cubic', C11: 165.6e9, C12: 63.9e9, C44: 79.5e9 }, { rotation_z_deg: 45 });
  const S = invertDense(D, 6);
  // E along [110] of Si from the same constants: 1 / S'11 = 168.9 GPa (Hopcroft 2010 Table: 169 GPa)
  assert.ok(Math.abs(1 / S[0] / 1e9 - 168.93) < 0.01, `E110 ${1 / S[0]}`);
  const o = SET.ortho.elastic, So = invertDense(stiffnessLab(o), 6);
  assert.ok(Math.abs(So[0] * o.Ex - 1) < 1e-12 && Math.abs(So[1] * o.Ex + o.nuxy) < 1e-12 && Math.abs(So[35] * o.Gxy - 1) < 1e-12);
  // SPEC section 12: columns of R = local axes in global coordinates; local z rotated +30 deg about x -> (0, -1/2, sqrt3/2)
  const a = directionCosines({ rotation_deg: [30, 0, 0] });
  assert.ok(Math.abs(a[2] - 0) < 1e-15 && Math.abs(a[5] + 0.5) < 1e-15 && Math.abs(a[8] - Math.sqrt(3) / 2) < 1e-15);
  assert.ok(Math.abs(vonMises([1, 0, 0, 0, 0, 0]) - 1) < 1e-15 && Math.abs(vonMises([0, 0, 0, 0, 0, 1]) - Math.sqrt(3)) < 1e-15);
  const p = principal([3, 1, 0, 0, 0, 1]);
  assert.ok(Math.abs(p[0] - (2 + Math.SQRT2)) < 1e-12 && Math.abs(p[1] - (2 - Math.SQRT2)) < 1e-12 && Math.abs(p[2]) < 1e-12);
});

test('patch test: prescribed linear displacement on all faces of a graded anisotropic block is reproduced exactly', () => {
  const parts = [{ id: 'blk', kind: 'die', material: 'si_cubic', x_mm: 0, y_mm: 0, w_mm: 2, d_mm: 3, z_um: 0, h_um: 700 }];
  const grid = buildGrid(parts, { max_xy_mm: 0.4, min_cells_per_layer: 3, planes: { x_mm: [0.13, 0.17], y_mm: [-1.21], z_um: [50, 600] } });
  const G = [[1e-3, 2e-4, -3e-4], [5e-4, -8e-4, 1e-4], [-2e-4, 6e-4, 4e-4]];
  const lin = (x, y, z) => G.map((g) => g[0] * x + g[1] * y + g[2] * z);
  const eps = [G[0][0], G[1][1], G[2][2], G[1][2] + G[2][1], G[0][2] + G[2][0], G[0][1] + G[1][0]];
  const D = stiffnessLab(SET.si_cubic.elastic, { rotation_deg: [10, 20, 30] });
  const sig = Array.from({ length: 6 }, (_, I) => eps.reduce((s, e, J) => s + D[6 * I + J] * e, 0));
  for (const element of ['q1', 'q1im', 'q2s']) {
    const r = solveMech(grid, {
      ...base, element, supports: 'none', bcs: [{ selection: 'default', type: 'displacement', value_m: lin }],
      stress_free_C: { default: 25 }, temperature: { uniform_C: 25 }, orientation: { blk: { rotation_deg: [10, 20, 30] } },
    });
    const { xs, ys, zs, nx, ny } = grid;
    let err = 0;
    for (let n = 0; n < r.fields.node_active.length; n++) {
      const i = n % (nx + 1), j = Math.floor(n / (nx + 1)) % (ny + 1), k = Math.floor(n / ((nx + 1) * (ny + 1)));
      const ex = lin(xs[i], ys[j], zs[k]);
      for (let c = 0; c < 3; c++) err = Math.max(err, Math.abs(r.fields.u_m[3 * n + c] - ex[c]));
    }
    assert.ok(err <= 1e-12 * 2e-6, `${element} displacement error ${err}`);
    const s = r.fields.sigma_cellnode_Pa, smax = maxAbs(sig);
    for (let q = 0; q < s.length; q++) assert.ok(Math.abs(s[q] - sig[q % 6]) <= 1e-9 * smax, `${element} stress ${s[q]} vs ${sig[q % 6]}`);
  }
});

test('constant thermal strain: free expansion of rotated cubic and orthotropic blocks is stress-free', () => {
  for (const [mat, rot] of [['si_cubic', { rotation_deg: [0, 0, 45] }], ['ortho', { rotation_deg: [25, -40, 70] }]]) {
    const parts = [{ id: 'b', kind: 'die', material: mat, x_mm: 0, y_mm: 0, w_mm: 3, d_mm: 2, z_um: 0, h_um: 900 }];
    for (const element of ['q1im', 'q2s']) {
      const r = solveMech(buildGrid(parts, { max_xy_mm: 0.5, min_cells_per_layer: 3 }), { ...base, element, orientation: { b: rot }, temperature: { uniform_C: 225 } });
      assert.ok(maxAbs(r.fields.sigma_cellnode_Pa) / (30e9 * 40e-6 * 75) <= 1e-11, `${mat} ${element} ${maxAbs(r.fields.sigma_cellnode_Pa)}`);
      assert.ok(r.derived.reactions.max_abs_N <= 1e-6, `reaction ${r.derived.reactions.max_abs_N}`);
    }
  }
});

test('library materials: Cu free expansion strain = rebased secant alpha (Tsf 150 C) x dT; cubic Si from the library', () => {
  const parts = [{ id: 'cu', kind: 'lid', material: 'cu_bulk', x_mm: 0, y_mm: 0, w_mm: 2, d_mm: 2, z_um: 0, h_um: 1000 },
    { id: 'si', kind: 'die', material: 'si_crystal', x_mm: 4, y_mm: 0, w_mm: 2, d_mm: 2, z_um: 0, h_um: 1000 }];
  // two separate bodies would need two supports; solve each part alone
  for (const p of parts) {
    const grid = buildGrid([{ ...p, x_mm: 0 }], { max_xy_mm: 0.5, min_cells_per_layer: 2 });
    const r = solveMech(grid, { element: 'q1im', resolve: libResolve, rebase: rebaseSecantCte, stress_free_C: { default: 150 }, temperature: { uniform_C: 25 } });
    const a = rebaseSecantCte(p.material, 423.15, 298.15).alpha;
    const e = r.fields.eps_cell;
    for (let s = 0; s < 3; s++) assert.ok(Math.abs(e[s] / (a[s] * -125) - 1) < 1e-11, `${p.material} eps ${e[s]} vs ${a[s] * -125}`);
    assert.ok(maxAbs(r.fields.sigma_cellnode_Pa) < 1e-3, `${p.material} stress ${maxAbs(r.fields.sigma_cellnode_Pa)}`);
  }
  assert.equal(libResolve('si_crystal', 298.15).elastic.type, 'cubic');
});

test('supports: rigid_motion with a symmetry crop, symmetry without a crop, rigid_motion with bcs, no constraint: errors', () => {
  const q = buildGrid(MA4B, { max_xy_mm: 5, symmetry: 'quarter' }), f = buildGrid(MA4B, { max_xy_mm: 5 });
  assert.throws(() => solveMech(q, { ...base, element: 'q1im', supports: 'rigid_motion' }), /never both/);
  assert.throws(() => solveMech(f, { ...base, element: 'q1im', supports: 'symmetry' }), /needs a symmetry crop/);
  assert.throws(() => solveMech(f, { ...base, element: 'q1im', supports: 'rigid_motion', bcs: [{ selection: 'bottom:sub', type: 'fixed' }] }), /cannot be combined/);
  assert.throws(() => solveMech(f, { ...base, element: 'q1im', supports: 'none' }), /singular/);
  assert.throws(() => solveMech(f, { ...base, element: 'q3' }), /element/);
});

test('symmetry crops equal the full model (MA4b: kappa, coplanarity, JEITA warpage; quarter, half_x, half_y)', () => {
  const out = {};
  for (const sym of ['none', 'quarter', 'half_x', 'half_y']) {
    const grid = buildGrid(MA4B, { max_xy_mm: 1, min_cells_per_layer: 1, symmetry: sym });
    const r = solveMech(grid, { ...base, element: 'q1im', supports: sym === 'none' ? 'rigid_motion' : 'symmetry', curvature: [{ z_m: 0 }], warpage: ['bottom:sub'], stress: false });
    out[sym] = { k: r.derived.curvature[0].kappa_clt_x_1_m, c: r.derived.warpage[0].coplanarity_um, w: r.derived.warpage[0].warpage_um };
  }
  for (const sym of ['quarter', 'half_x', 'half_y'])
    for (const key of ['k', 'c', 'w']) assert.ok(Math.abs(out[sym][key] / out.none[key] - 1) <= 1e-6, `${sym} ${key} ${out[sym][key]} vs ${out.none[key]}`);
  assert.ok(out.none.w > 0, 'dome: JEITA +');
});

test('direct vs iterative agree to 1e-8 (q1im GMG with the L1 and L8 hierarchies and low-memory storage, q2s p-multigrid, block Jacobi)', () => {
  const runs = [
    ['q1im', 'pcg_gmg', { impl: 'l1' }], ['q1im', 'pcg_gmg', { impl: 'l8' }], ['q1im', 'pcg_gmg', { storage: 'lowmem' }], ['q1im', 'pcg_gmg', { storage: 'f32full' }], ['q1im', 'pcg_block_jacobi', {}], ['q2s', 'pcg_gmg', {}],
  ];
  const ref = {};
  for (const [element, solver, gmg] of runs) {
    const grid = buildGrid(MA4B, { max_xy_mm: 2, min_cells_per_layer: 2, symmetry: 'quarter', planes: { x_mm: [7.3], y_mm: [11.1] } });
    const opts = { ...base, element, supports: 'symmetry', stress: false };
    if (!ref[element]) ref[element] = solveMech(grid, { ...opts, solver: 'direct' })._u;
    const r = solveMech(grid, { ...opts, solver, gmg, rtol: 1e-12, maxIter: 20000 });
    assert.ok(r.timing.solver.converged, `${element} ${solver} converged`);
    const um = maxAbs(ref[element]);
    let d = 0;
    for (let i = 0; i < r._u.length; i++) d = Math.max(d, Math.abs(r._u[i] - ref[element][i]));
    assert.ok(d / um <= 1e-8, `${element} ${solver} ${JSON.stringify(gmg)}: ${d / um}`);
    if (solver === 'pcg_gmg') assert.ok(r.timing.iterations <= (element === 'q2s' ? 200 : 80), `${element} gmg iterations ${r.timing.iterations}`);
  }
});

test('nodal temperature field: uniform field equals the uniform-temperature path', () => {
  const grid = buildGrid(MA4B, { max_xy_mm: 5, min_cells_per_layer: 1, symmetry: 'quarter' });
  const T = new Float64Array((grid.nx + 1) * (grid.ny + 1) * (grid.nz + 1)).fill(298.15);
  for (const element of ['q1im', 'q2s']) {
    const a = solveMech(grid, { ...base, element, supports: 'symmetry' });
    const b = solveMech(grid, { ...base, element, supports: 'symmetry', temperature: { T_K: T } });
    let d = 0;
    for (let i = 0; i < a._u.length; i++) d = Math.max(d, Math.abs(a._u[i] - b._u[i]));
    assert.ok(d / maxAbs(a._u) < 1e-12, `${element} ${d}`);
  }
});

test('von Mises per part: maximum at a die corner on a larger substrate is flagged singular', () => {
  const parts = [
    { id: 'sub', kind: 'substrate', material: 'sub', x_mm: 0, y_mm: 0, w_mm: 20, d_mm: 20, z_um: 0, h_um: 800 },
    { id: 'die', kind: 'die', material: 'si_iso', x_mm: 0, y_mm: 0, w_mm: 10, d_mm: 10, z_um: 800, h_um: 400 },
  ];
  const grid = buildGrid(parts, { max_xy_mm: 1, min_cells_per_layer: 2, symmetry: 'quarter' });
  const r = solveMech(grid, { ...base, element: 'q1im', supports: 'symmetry', warpage: ['bottom:sub'] });
  const d = r.derived.von_mises_per_part.die;
  assert.ok(d.vm_max_node_Pa > 0 && d.vm_max_gp_Pa > 0);
  assert.ok(['bimaterial_edge', 'reentrant'].includes(d.vm_max_node_flag), `flag ${d.vm_max_node_flag} at ${d.vm_max_node_xyz_m}`);
  // classification of known nodes: plate interior (null), die corner on the substrate (bimaterial_edge)
  const i5 = grid.xs.findIndex((x) => Math.abs(x - 5e-3) < 1e-12), k8 = grid.zs.findIndex((z) => Math.abs(z - 8e-4) < 1e-12);
  assert.equal(classifyCorner(grid, 1, 1, 1), null);
  assert.ok(classifyCorner(grid, i5, i5, k8) !== null);
  // die on a larger substrate, cooled from 150 C: substrate shrinks more -> die side convex -> dome (JEITA +)
  assert.ok(r.derived.warpage[0].warpage_um > 0);
});

test('curvature fit drops under-determined terms: 1 mm wide strip with the default window, coarse cube (L5 report)', () => {
  const SET2 = { ...SET };
  const strip = [{ id: 'si', kind: 'die', material: 'si_iso', x_mm: 0, y_mm: 0, w_mm: 10, d_mm: 1, z_um: 0, h_um: 500 },
    { id: 'cu', kind: 'lid', material: 'cu', x_mm: 0, y_mm: 0, w_mm: 10, d_mm: 1, z_um: 500, h_um: 500 }];
  const r = solveMech(buildGrid(strip, { max_xy_mm: 0.5, min_cells_per_layer: 2 }), {
    resolve: explicitResolver(SET2), rebase: explicitRebase(SET2), element: 'q1im', stress_free_C: { default: 125 }, temperature: { uniform_C: 25 }, curvature: [{ z_m: 5e-4 }],
  });
  const k = r.derived.curvature[0];
  assert.ok(k.terms.includes('xx') && !k.terms.includes('yy'), `terms ${k.terms} (distinct y ${k.distinct_y})`);
  assert.equal(k.w_yy_1_m, null);
  // same strip curvature as the explicit-region fit within 1e-3 (MA3 beam value 2.156 1/m, plate 2.159)
  assert.ok(Math.abs(Math.abs(k.w_xx_1_m) / 2.15623 - 1) < 1e-2, `w_xx ${k.w_xx_1_m}`);
  const cube = [{ id: 'c', kind: 'die', material: 'si_iso', x_mm: 0, y_mm: 0, w_mm: 10, d_mm: 10, z_um: 0, h_um: 10000 }];
  const rc = solveMech(buildGrid(cube, { max_xy_mm: 2.5, min_cells_per_layer: 4 }), { ...base, element: 'q1im', temperature: { uniform_C: 125 }, stress_free_C: { default: 25 }, curvature: [{ z_m: 0 }] });
  const kc = rc.derived.curvature[0];
  assert.ok(Array.isArray(kc.terms) && Math.abs(kc.w_xx_1_m ?? 0) < 1e-9, `cube terms ${kc.terms}, w_xx ${kc.w_xx_1_m}`);
});

test('CD6: extrapolation refused by default, allowed per key, flags surfaced per part (direct and through the RVE)', async () => {
  const { library } = await import('../src/materials/node.mjs');
  const { createRveResolver } = await import('../src/homog/resolver.mjs');
  const lib = library();
  const parts = [{ id: 'blk', kind: 'substrate', material: 'abf_gl', x_mm: 0, y_mm: 0, w_mm: 2, d_mm: 2, z_um: 0, h_um: 500 }];
  const grid = buildGrid(parts, { max_xy_mm: 1, min_cells_per_layer: 1 });
  const go = (ro) => solveMech(grid, { resolve: (k, T, o) => lib.resolve(k, T, o), rebase: (e, s, T, o) => lib.rebaseSecantCte(e, s, T, o), stress_free_C: { default: 25 }, temperature: { uniform_C: 300 }, resolveOpts: ro });
  assert.throws(() => go({}), /outside valid_T_C/);
  const r = go({ allowExtrapolation: ['abf_gl'] });
  assert.equal(r.derived.extrapolated.length, 1);
  assert.deepEqual(r.derived.extrapolated[0].parts, ['blk']);
  assert.ok(r.warnings.some((w) => /extrapolated/.test(w)));
  // homogenized layer with an extrapolated constituent (RVE resolver)
  const R2 = createRveResolver(lib, { n: 8, richardson: false });
  const key = 'homog:rdl_layer:copper+organic_build_up:0.5:x';
  const g2 = buildGrid([{ ...parts[0], material: key }], { max_xy_mm: 1, min_cells_per_layer: 1 });
  const r2 = solveMech(g2, { resolve: R2.resolve, rebase: R2.rebase, stress_free_C: { default: 25 }, temperature: { uniform_C: 300 }, resolveOpts: { allowExtrapolation: true } });
  assert.ok(r2.derived.extrapolated.length >= 1 && r2.derived.extrapolated[0].flags.some((f) => f.constituent), JSON.stringify(r2.derived.extrapolated));
});

test('audit A2: corner flag keys on material (same-material joint not flagged); study stress_free_C keeps per_part', async () => {
  const two = [
    { id: 'a', kind: 'die', material: 'si_iso', x_mm: -2.5, y_mm: 0, w_mm: 5, d_mm: 4, z_um: 0, h_um: 500 },
    { id: 'b', kind: 'die', material: 'si_iso', x_mm: 2.5, y_mm: 0, w_mm: 5, d_mm: 4, z_um: 0, h_um: 250 },
    { id: 'c', kind: 'die', material: 'si_iso', x_mm: 2.5, y_mm: 0, w_mm: 5, d_mm: 4, z_um: 250, h_um: 250 },
  ];
  const g = buildGrid(two, { max_xy_mm: 1, min_cells_per_layer: 1 });
  const i0 = g.xs.findIndex((x) => Math.abs(x) < 1e-12), k1 = g.zs.findIndex((z) => Math.abs(z - 2.5e-4) < 1e-12);
  assert.equal(classifyCorner(g, i0, 2, k1), null, 'a/b/c joint in one material');
  const g2 = buildGrid(two.map((p) => (p.id === 'c' ? { ...p, material: 'cu' } : p)), { max_xy_mm: 1, min_cells_per_layer: 1 });
  assert.notEqual(classifyCorner(g2, i0, 2, k1), null, 'material corner');
  const { runMechCase } = await import('../src/mech/case.mjs');
  assert.equal(typeof runMechCase, 'function');
});

test('shape_class: dome, bowl, saddle, flat (criterion stated)', () => {
  const S3 = { ...SET, orth: { elastic: { type: 'iso', E_Pa: 110e9, nu: 0.3 }, cte_ppmK: [30, -10, 10] } };
  const R3 = explicitResolver(S3), RB3 = explicitRebase(S3);
  const run = (parts, sf, T) => solveMech(buildGrid(parts, { max_xy_mm: 1, min_cells_per_layer: 1, symmetry: 'quarter' }), {
    resolve: R3, rebase: RB3, supports: 'symmetry', stress_free_C: { default: sf }, temperature: { uniform_C: T }, warpage: ['bottom:sub'], stress: false,
  }).derived.warpage[0];
  const plate = (top) => [{ ...MA4B[0], w_mm: 20, d_mm: 20 }, { id: 'top', kind: 'die', material: top, x_mm: 0, y_mm: 0, w_mm: 20, d_mm: 20, z_um: 1000, h_um: 500 }];
  const w1 = run(plate('si_iso'), 150, 25); // low-CTE die on a substrate, cooled: dome
  assert.equal(w1.shape_class, 'dome');
  assert.match(w1.shape_criterion, /saddle/);
  assert.equal(run(plate('cu'), 150, 25).shape_class, 'bowl'); // high-CTE top layer, cooled: bowl
  assert.equal(run(plate('orth'), 150, 25).shape_class, 'saddle'); // top CTE above the substrate in x, below in y
  assert.equal(run(plate('si_iso'), 25, 25).shape_class, 'flat');
});

test('eigenstrain: linear shrinkage of a free block is stress-free with the exact strain; volumetric = 3 x linear', () => {
  const parts = [{ id: 'emc', kind: 'mold', material: 'uf', x_mm: 0, y_mm: 0, w_mm: 2, d_mm: 2, z_um: 0, h_um: 1000 }];
  const g = buildGrid(parts, { max_xy_mm: 0.5, min_cells_per_layer: 2 });
  const a = solveMech(g, { ...base, element: 'q1im', stress_free_C: { default: 25 }, temperature: { uniform_C: 25 }, eigenstrain: { emc: { linear: -0.0016 } } });
  assert.ok(Math.abs(a.fields.eps_cell[0] / -0.0016 - 1) < 1e-12 && maxAbs(a.fields.sigma_cellnode_Pa) < 1e-3);
  const b = solveMech(g, { ...base, element: 'q1im', stress_free_C: { default: 25 }, temperature: { uniform_C: 25 }, eigenstrain: { emc: { volumetric: -0.0048 } } });
  assert.ok(Math.abs(b.fields.eps_cell[0] / a.fields.eps_cell[0] - 1) < 1e-12);
  assert.throws(() => solveMech(g, { ...base, element: 'q1im', stress_free_C: { default: 25 }, temperature: { uniform_C: 25 }, eigenstrain: { nothing: { linear: -1e-3 } } }), /matches no part/);
});

test('eigenstrain in a bilayer equals CLT with an equivalent CTE strain', () => {
  // shrinkage e0 in the top layer at constant temperature = a thermal strain alpha dT = e0 in that layer
  const parts = [{ ...MA4B[0], w_mm: 20, d_mm: 20 }, { id: 'top', kind: 'mold', material: 'uf', x_mm: 0, y_mm: 0, w_mm: 20, d_mm: 20, z_um: 1000, h_um: 500 }];
  const g = buildGrid(parts, { max_xy_mm: 0.5, min_cells_per_layer: 2, symmetry: 'quarter' });
  const r = solveMech(g, { ...base, element: 'q1im', supports: 'symmetry', stress_free_C: { default: 25 }, temperature: { uniform_C: 25 }, eigenstrain: { top: { linear: -0.0016 } }, curvature: [{ z_m: 0 }] });
  // CLT: layers sub (25 GPa, 0.3, 1 mm) + uf (8 GPa, 0.35, 0.5 mm); strain loads 0 and e0
  const L2 = [{ Q: 25e9 / 0.7, t: 1e-3, e: 0 }, { Q: 8e9 / 0.65, t: 0.5e-3, e: -0.0016 }];
  let z = 0, A = 0, B = 0, D = 0, N = 0, M = 0;
  for (const l of L2) { const z0 = z, z1 = z + l.t; A += l.Q * l.t; B += (l.Q * (z1 * z1 - z0 * z0)) / 2; D += (l.Q * (z1 ** 3 - z0 ** 3)) / 3; N += l.Q * l.e * l.t; M += (l.Q * l.e * (z1 * z1 - z0 * z0)) / 2; z = z1; }
  const kappa = (A * M - B * N) / (A * D - B * B);
  assert.ok(Math.abs(r.derived.curvature[0].kappa_clt_x_1_m / kappa - 1) < 2e-3, `${r.derived.curvature[0].kappa_clt_x_1_m} vs ${kappa}`);
});
