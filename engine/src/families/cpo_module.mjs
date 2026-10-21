// License: GPL-3.0-or-later.
// cpo_module family generator: structure from specs/cpo_module.mjs (config/package3d/cpo_module.yaml).
// Knobs: XPU / OIO / FAU sizes, die gap, bridge size, substrate stack, heat spreader.
import { SIM_MAT } from './common.mjs';
import { templateFamily } from './generic.mjs';
import spec from './specs/cpo_module.mjs';

const fam = templateFamily(spec, {
  ext: { add: { adhesive_mat: SIM_MAT.adhesive_mat, hs_mat: { ...SIM_MAT.lid_mat, note: 'heat spreader material not reported; Cu assumed (L2 maps lid copper to cu_lid)' } } },
  simMaterials: { parts: { adhesive: 'adhesive_mat', hs: 'hs_mat' } },
  layout: { logic: ['xpu', 'oio'], hbm: [], interposers: [], bridges: ['bridge'], substrate: ['substrate'], keepOut: ['uf'], overhang: ['oio'], overhangNote: 'OIO chiplets overhang the substrate edge so the FAU can attach under them (cpo_module.yaml overhang_mm)' },
});
export const { ext, layout, preChecks, build, source } = fam;
