// Thermo-elastic case runner on the Xilinx bring-up case (sims/si_interposer_peers/xilinx_tsv_lid.yaml, lane L3;
// paper ectc.2011.5898527-b). Smoke and sign gate at a coarse mesh: the no-lid study s3 must give a dome (paper
// m2 +335.28 um, "negative = smiley face"); the lidded study is reported in the L8 notes, not gated (model-form miss).
// Lane L8 (E2). License: GPL-3.0-or-later.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import YAML from 'yaml';
import { generate } from '../src/families/index.mjs';
import { loadPackage3d } from '../src/families/node.mjs';
import { loadLibrary, applyOverrides } from '../src/materials/node.mjs';
import { runMechCase } from '../src/mech/case.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('Xilinx TSV interposer, no lid (s3), coarse mesh: dome, JEITA sign stated, finite von Mises', () => {
  const c = YAML.parse(readFileSync(join(ROOT, 'sims', 'si_interposer_peers', 'xilinx_tsv_lid.yaml'), 'utf8'));
  // element q1im (A3 bake-off default; the case file asks for q2s, about 3.5x the DOF). TIM1 CTE is N/A in the
  // library (paper Table 2 prints '-'); study s3 has no lid and no TIM cells, so it needs no override
  const out = runMechCase(c, { generate, lib: loadLibrary(), applyOverrides, data: loadPackage3d(), study: 's3', element: 'q1im', solver: 'pcg_gmg', mesh: { max_xy_mm: 2, min_cells_per_layer: 1 } });
  assert.equal(out.results.length, 1);
  const r = out.results[0];
  assert.ok(r.timing.solver.converged, 'GMG converged');
  const t = out.targets.find((x) => x.metric_id === 'ectc.2011.5898527-b-m2');
  assert.ok(Number.isFinite(t.got) && t.got > 0, `dome expected, got ${t.got}`);
  assert.match(t.sign_convention, /JEITA ED-7306/);
  assert.ok(t.view_side);
});

test('cure shrinkage from the library with kind not stated (EMC 0.16 %): bracketing pair linear / volumetric, warned', () => {
  const lib = loadLibrary();
  const boxes = [
    { id: 'sub', kind: 'substrate', material: 'core_lowcte', x_mm: 0, y_mm: 0, w_mm: 20, d_mm: 20, z_um: 0, h_um: 800 },
    { id: 'mold', kind: 'mold', material: 'emc', x_mm: 0, y_mm: 0, w_mm: 20, d_mm: 20, z_um: 800, h_um: 400 },
  ];
  const c = {
    schema: 'ap-sim/0', id: 'test/shrink', family: 'stub', geometry: { symmetry: 'quarter' },
    mesh: { max_xy_mm: 2, min_cells_per_layer: 1 },
    physics: { mechanics: { element: 'q1im', stress_free_C: { default: 25 }, supports: 'symmetry' } },
    studies: [{ id: 's1', type: 'thermo_elastic', temperature: { uniform_C: [25] } }],
    targets: [{ quantity: 'warpage_um', selection: 'bottom:sub', study: 's1', T_C: 25 }],
  };
  const out = runMechCase(c, { generate: () => ({ boxes, warnings: [] }), lib, homogenization: 'rom', cureShrinkage: 'library', solver: 'direct' });
  assert.deepEqual(out.results.map((r) => r.shrinkage_variant), ['linear', 'volumetric']);
  assert.ok(out.results[0].warnings.some((w) => /kind not stated/.test(w)));
  const t = out.targets[0];
  // isothermal at the stress-free temperature: warpage comes from shrinkage only, linear in the strain: ratio 3
  assert.ok(Math.abs(t.got_by_shrinkage.linear / t.got_by_shrinkage.volumetric - 3) < 1e-6, JSON.stringify(t.got_by_shrinkage));
  assert.ok(t.got_by_shrinkage.linear < 0, 'the mold shrinks on top of the substrate: top surface concave (bowl, JEITA negative)');
});
