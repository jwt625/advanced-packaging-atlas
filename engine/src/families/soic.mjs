// License: GPL-3.0-or-later.
// soic family generator (hybrid_bonded_3d): structure from specs/soic.mjs (config/package3d/soic.yaml).
// Knobs: top / bottom die sizes and thicknesses, bond pitch, TSV field.
import { SIM_MAT } from './common.mjs';
import { templateFamily } from './generic.mjs';
import spec from './specs/soic.mjs';

const fam = templateFamily(spec, {
  ext: {
    add: {
      beol_diel_mat: SIM_MAT.beol_diel_mat,
      bond_tier_mat: { value: 'sio2_film', status: 'template', note: 'bond-pad tier = Cu pads in a bond dielectric (not specified); SiO2 film assumed for the tier (pads not resolved)' },
      gap_fill_mat: { value: 'sio2_film', status: 'template', note: 'gap fill material not stated in the sources; SiO2 film assumed' },
    },
  },
  simMaterials: { parts: { bond_bot: 'bond_tier_mat', bond_top: 'bond_tier_mat', gap_fill: 'gap_fill_mat' }, layers: { dt_ild: 'beol_diel_mat', db_ild: 'beol_diel_mat', db_box: 'beol_diel_mat' }, matrix: 'beol_diel_mat' },
  layout: { logic: [], hbm: [], interposers: [], bridges: [], substrate: ['die_bot'] },
});
export const { ext, layout, preChecks, build, source } = fam;
