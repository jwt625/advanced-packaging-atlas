// License: GPL-3.0-or-later.
// CoWoS-R family generator spec. Structure transcribed from config/package3d/cowos_r.yaml (template + module sbt_828,
// 2026-10-20). Sim knobs: HBM generation, lid / ring / none (lid with TIM for thermal cases), homogenized PTH field.
// SoC array: soc_rows_n x soc_cols_n (template params); HBM in rows along the interposer +y / -y edges.

import { hbmGenFormulas, HBM_GEN_PARAM, lidRingParts, lidTypeParam } from './common.mjs';
import { LID_ATTACH, SIM_MAT } from './common.mjs';
import { BOUNDS } from './bounds.mjs';
import { multipleOf } from './rules.mjs';
import { editor, mapSolderResist } from './generic.mjs';
import base from './specs/cowos_r.mjs';

export const ext = {
  bounds: BOUNDS.cowos_r,
  add: {
    sr_mat: SIM_MAT.sr_mat,
    c4_uf_mat: SIM_MAT.c4_uf_mat,
    ...LID_ATTACH,
    lid_mat: SIM_MAT.lid_mat,
    hbm_gen: HBM_GEN_PARAM,
    lid_type: lidTypeParam('ring', 'SUS430 stiffener ring (backbone ectc51529.2024.00049-a-c6); lid offered for thermal cases (the 3.3x thermal TV ectc51687.2025.00085 has a lid)'),
    lid_h_um: { value: 2000, status: 'template', refs: ['ectc51909.2023.00091-a-c8.thickness_um'], note: 'lid thickness not reported for CoWoS-R; analog = 2 mm lid of a TSMC CoWoS-L TV' },
    lid_foot_w_mm: { value: 5, status: 'template', note: 'lid foot (sidewall) width not reported; illustrative (as cowos_l)' },
    tim_h_um: { value: 60, status: 'template', refs: ['itherm45881.2020.9190542-a-c5.thickness_um'], note: 'TIM1 thickness not reported for the backbone; analog = TIM1 of a TSMC InFO_oS lid TV' },
    lid_gap_um: { formula: 'c4_h_um + ip_h_um + mold_h_um + tim_h_um', status: 'template', note: 'lid plate on the TIM: substrate top to TIM top' },
    socblk_d_mm: { formula: 'soc_rows_n * soc_d_mm + (soc_rows_n - 1) * soc_gap_um / 1000', status: 'derived', note: 'SoC block length' },
    socblk_w_mm: { formula: 'soc_cols_n * soc_w_mm + (soc_cols_n - 1) * soc_gap_um / 1000', status: 'derived', note: 'SoC block width' },
    ubump_soc_region_w_mm: { alias: 'soc_w_mm' },
    ubump_soc_region_d_mm: { alias: 'soc_d_mm' },
    ubump_hbm_region_w_mm: { alias: 'hbm_w_mm' },
    ubump_hbm_region_d_mm: { alias: 'hbm_d_mm' },
    c4_region_w_mm: { alias: 'ip_w_mm' },
    c4_region_d_mm: { alias: 'ip_d_mm' },
  },
  formulas: { ...hbmGenFormulas('x') },
};

export const preChecks = [
  multipleOf('soc_n', 'soc_rows_n', 'SoC array of soc_rows_n rows'),
  multipleOf('hbm_n', 'hbm_rows_n', 'HBM rows along the interposer +y / -y edges'),
  (P) => {
    const need = P.v('socblk_d_mm') + 2 * P.v('hbm_d_mm');
    return need > P.v('ip_d_mm') + 1e-6 ? { code: 'die_block_fit', level: 'error',
      message: `SoC block (${P.v('socblk_d_mm').toFixed(2)} mm) + 2 HBM rows (${P.v('hbm_d_mm')} mm) exceed the interposer length ${P.v('ip_d_mm')} mm` } : null;
  },
  (P) => (P.v('hbm_cols_n') * P.v('hbm_w_mm') > P.v('ip_w_mm') + 1e-6 ? { code: 'hbm_row_fit', level: 'error',
    message: `HBM row of ${P.v('hbm_cols_n')} x ${P.v('hbm_w_mm')} mm exceeds the interposer width ${P.v('ip_w_mm')} mm` } : null),
];

// Structure: specs/cowos_r.mjs (transcribed from config/package3d/cowos_r.yaml, module sbt_828 merged); edits
// re-apply the sim knobs by id.
export function build(P) {
  const E = editor(JSON.parse(JSON.stringify({ parts: base.parts, layers: base.layers, arrays: base.arrays })));
  const lidType = P.v('lid_type');
  // dies sit on their micro-bumps (template: `in: mold`; identical z while soc_h_um = hbm_h_um)
  for (const id of ['soc', 'hbm']) { const d = E.part(id); delete d.in; delete d.standoff; Object.assign(d, { on: 'interposer', gap: 'ubump_h_um', host: 'mold' }); }
  if (lidType !== 'ring') {
    E.replacePart('ring', lidRingParts(P, { lidType,
      tim: { id: 'tim', name: 'TIM1', kind: 'tim', material: 'tim', w: 'ip_w_mm', d: 'ip_d_mm', h: 'tim_h_um', on: 'mold' } }));
  }
  E.array('ubump_soc').region = { size: { w: 'ubump_soc_region_w_mm', d: 'ubump_soc_region_d_mm' } };
  E.array('ubump_hbm').region = { size: { w: 'ubump_hbm_region_w_mm', d: 'ubump_hbm_region_d_mm' } };
  E.array('c4').region = { part: 'interposer', size: { w: 'c4_region_w_mm', d: 'c4_region_d_mm' } };
  E.addArrays({ id: 'pth', name: 'PTH field', kind: 'pth', inLayer: 'sbt_core', pitch: 'pth_pitch_um', diameter: 'pth_d_um', wall: 'pth_wall_um', fillKind: 'plugged', simOnly: true, via: 'pth' });
  if (E.hasPart('osuf')) E.part('osuf').material_sim = 'c4_uf_mat';
  return mapSolderResist(E.spec);
}

export const layout = {
  logic: ['soc'], hbm: ['hbm'], interposers: ['interposer'], bridges: [], hbmReach: 'hbm_line_mm',
  fillUnderInterposer: 'osuf',
};
