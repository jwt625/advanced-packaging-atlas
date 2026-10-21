// License: GPL-3.0-or-later.
// FCBGA organic baseline generator spec. Structure transcribed from config/package3d/fcbga_organic.yaml (2026-10-20).
// Sim knobs: die array (die_cols_n x die_rows_n), stiffener ring (adhesive + Cu frame) or none, homogenized PTH field.

import { lidTypeParam } from './common.mjs';
import { BOUNDS } from './bounds.mjs';
import { multipleOf } from './rules.mjs';
import { editor, mapSolderResist } from './generic.mjs';
import { SIM_MAT } from './common.mjs';
import base from './specs/fcbga_organic.mjs';

export const ext = {
  bounds: BOUNDS.fcbga_organic,
  add: {
    sr_mat: SIM_MAT.sr_mat,
    adhesive_mat: { value: 'silicone_adhesive', status: 'template', note: 'stiffener adhesive = silicone adhesive with glass beads (template material_label, ectc51529.2024.00265-a-c4); library silicone entry (L2) stands for the unnamed product' },
    die_cols_n: { value: 1, status: 'template', note: 'die columns (die array nx); backbone: one die' },
    die_rows_n: { value: 1, status: 'template', note: 'die rows (die array ny); backbone: one die' },
    die_gap_um: { value: 150, status: 'template', refs: ['ectc51529.2024.00049-a-c1.gap_um'], note: 'die-to-die gap of a multi-die variant not reported; analog = TSMC CoWoS-R SoC D2D gap (only used when the die array has > 1 die)' },
    die_px_mm: { formula: 'die_w_mm + die_gap_um / 1000', status: 'template', note: 'die column pitch' },
    die_py_mm: { formula: 'die_d_mm + die_gap_um / 1000', status: 'template', note: 'die row pitch' },
    lid_type: { ...lidTypeParam('ring', 'Cu stiffener on a silicone adhesive frame (backbone ectc51529.2024.00265-a-c3/-c4); none offered as a sim option'), options: ['ring', 'none'] },
    bump_region_w_mm: { alias: 'die_w_mm' },
    bump_region_d_mm: { alias: 'die_d_mm' },
  },
  formulas: {},
};

export const preChecks = [
  (P) => (Number.isInteger(P.v('die_cols_n')) && P.v('die_cols_n') >= 1 && Number.isInteger(P.v('die_rows_n')) && P.v('die_rows_n') >= 1 ? null
    : { code: 'bad_count', level: 'error', message: 'die_cols_n and die_rows_n must be positive integers' }),
  (P) => (Number.isInteger(P.v('bu_pair_n')) && P.v('bu_pair_n') >= 0 ? null
    : { code: 'not_multiple', level: 'error', param: 'bu_inner_n', message: `bu_inner_n = ${P.v('bu_inner_n')} must be odd (L1 pad level + signal/plane pairs + L8 signal level per side)` }),
];

// Structure: specs/fcbga_organic.mjs (transcribed from config/package3d/fcbga_organic.yaml); edits re-apply the knobs.
export function build(P) {
  const E = editor(JSON.parse(JSON.stringify({ parts: base.parts, layers: base.layers, arrays: base.arrays })));
  E.part('die').repeat = { nx: 'die_cols_n', ny: 'die_rows_n', px: 'die_px_mm', py: 'die_py_mm' };
  E.part('adhesive').material_sim = 'adhesive_mat';
  if (P.v('lid_type') !== 'ring') E.removeParts('adhesive', 'stiffener');
  E.array('bump').region = { part: 'die', size: { w: 'bump_region_w_mm', d: 'bump_region_d_mm' } };
  E.addArrays({ id: 'pth', name: 'PTH field', kind: 'pth', inLayer: 'core_lam', pitch: 'pth_pitch_um', diameter: 'pth_d_um', wall: 'pth_wall_um', fillKind: 'plugged', simOnly: true, via: 'pth' });
  return mapSolderResist(E.spec);
}

export const layout = { logic: ['die'], hbm: [], interposers: [], bridges: [], substrate: ['sbt_bu_top'], fillUnderInterposer: 'uf' };
