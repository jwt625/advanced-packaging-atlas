// License: GPL-3.0-or-later.
// hbm_stack family generator (microbump_3d): structure from specs/hbm_stack.mjs (config/package3d/hbm_stack.yaml).
// Knobs: core_n (stacked core dies; gap_n follows), die sizes, total_h_um (stack height), gap_um, bump field.
import { SIM_MAT } from './common.mjs';
import { templateFamily } from './generic.mjs';
import spec from './specs/hbm_stack.mjs';

const fam = templateFamily(spec, {
  ext: {
    add: { beol_diel_mat: SIM_MAT.beol_diel_mat },
    formulas: { gap_n: { formula: 'core_n + 1', note: 'one gap under each core die and under the top die (generalized; reported 8 for 7 core dies)' } },
    bounds: { core_n: { min: 1, integer: true, hard: true, basis: 'layout rule: at least one core die' } },
  },
  simMaterials: { layers: { cd_box: 'beol_diel_mat', cd_v1: 'beol_diel_mat', bs_box: 'beol_diel_mat', bs_v1: 'beol_diel_mat', tp_v1: 'beol_diel_mat' }, matrix: 'beol_diel_mat' },
  preChecks: [(P) => (P.v('top_h_um') > 0 ? null : { code: 'stack_height', level: 'error', message: `stack does not fit total_h_um = ${P.v('total_h_um')} um: top die height ${P.v('top_h_um').toFixed(1)} um <= 0 (reduce core_n or core_h_um)` })],
  layout: { logic: [], hbm: [], interposers: [], bridges: [], substrate: ['base'] },
});
export const { ext, layout, preChecks, build, source } = fam;
