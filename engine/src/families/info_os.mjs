// License: GPL-3.0-or-later.
// info_os family generator (InFO_oS, fan_out_wafer): structure from specs/info_os.mjs (config/package3d/info_os.yaml).
// Knobs: logic_n, io_n, io_cols_n, InFO size (info_w_mm x info_d_mm), substrate, core, build-up, TIM, ring.
import { LID_ATTACH, lidRingParts, lidTypeParam, SIM_MAT } from './common.mjs';
import { templateFamily } from './generic.mjs';
import spec from './specs/info_os.mjs';

const fam = templateFamily(spec, {
  ext: {
    add: {
    ...LID_ATTACH,
      ring_mat: { ...SIM_MAT.lid_mat, note: 'ring heat spreader material not given (template material_label); Cu assumed (L2 maps lid / stiffener copper to cu_lid)' },
      lid_mat: SIM_MAT.lid_mat,
      lid_type: lidTypeParam('ring', 'ring heat spreader (backbone ectc32696.2021.00033-a-c5); lid-type heat spreader (TV-1 / TV-2 of the same paper, InFO_oS thermal TV) as a sim option'),
      lid_h_um: { alias: 'lid1_h_um' },
      lid_foot_w_mm: { value: 5, status: 'template', note: 'lid foot (sidewall) width not reported; illustrative (as cowos_l)' },
      lid_gap_um: { formula: 'c4_h_um + rdl_h_um + mold_h_um + tim_h_um', status: 'template', note: 'lid plate on the TIM: substrate top to TIM top' },
    },
    formulas: {
      io_d_mm: { formula: '(info_d_mm - 2 * edge_mm - (max(io_rows_n, 1) - 1) * gap_um / 1000) / max(io_rows_n, 1)', note: 'guarded for io_n = 0' },
    },
    bounds: {
      logic_n: { min: 1, integer: true, hard: true, basis: 'layout rule: at least one logic die' },
      io_n: { min: 0, integer: true, hard: true, basis: 'layout rule: non-negative count' },
    },
  },
  simMaterials: { parts: { ring: 'ring_mat' } },
  edit(spec, P) {
    const t = P.v('lid_type');
    if (t === 'ring') return spec;
    spec.parts = spec.parts.filter((p) => p.id !== 'ring');
    if (t === 'lid') {
      spec.parts.push(...lidRingParts(P, { lidType: 'lid',
        tim: { id: 'tim', name: 'TIM1', kind: 'tim', material: 'tim', w: 'info_w_mm', d: 'info_d_mm', h: 'tim_h_um', on: 'mold' } }));
    }
    return spec;
  },
  layout: { logic: ['logic', 'io'], hbm: [], interposers: ['rdl'], bridges: [], fillUnderInterposer: 'c4uf' },
});
export const { ext, layout, preChecks, build, source } = fam;
