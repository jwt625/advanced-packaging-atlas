// License: GPL-3.0-or-later.
// glass_core_substrate family generator: structure from specs/glass_core_substrate.mjs
// (config/package3d/glass_core_substrate.yaml). Knobs: core_h_um, bu_n, die sizes, d2_n, bridge size, TGV field.
import { SIM_MAT } from './common.mjs';
import { templateFamily } from './generic.mjs';
import spec from './specs/glass_core_substrate.mjs';

const fam = templateFamily(spec, {
  ext: { add: {
    adhesive_mat: SIM_MAT.adhesive_mat,
    die_layout: { value: 'template', status: 'template', options: ['template', 'pair'],
      note: 'template = DIE 1 with d2_n side dies over EMIB bridges; pair = d2_n equal dies in a row at the D2D gap (DIE 1 removed; set bridge_n 0 for a bridge-less 2-chip assembly)' },
    pair_px_mm: { formula: 'd2_w_mm + die_gap_um / 1000', status: 'template', note: 'pair layout: die pitch = die width + D2D gap' },
  } },
  edit(spec, P) {
    if (P.v('die_layout') !== 'pair') return spec;
    spec.parts = spec.parts.filter((p) => p.id !== 'die1');
    spec.arrays = spec.arrays.filter((a) => a.per !== 'die1');
    const d2 = spec.parts.find((p) => p.id === 'die2');
    d2.standoff = 'coarse_d2';
    d2.repeat = { nx: 'd2_n', px: 'pair_px_mm' };
    spec.parts.find((p) => p.id === 'uf').fill.parts = ['die2'];
    return spec;
  },
  simMaterials: { parts: { br_adh: 'adhesive_mat' } },
  layout: { logic: ['die1', 'die2'], hbm: [], interposers: [], bridges: ['bridge'], substrate: ['sbt_bu_top'], fillUnderInterposer: 'uf' },
});
export const { ext, layout, preChecks, build, source } = fam;
