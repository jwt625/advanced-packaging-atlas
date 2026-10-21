// License: GPL-3.0-or-later.
// EMIB-T family generator spec. Structure transcribed from config/package3d/emib_t.yaml (2026-10-20). Sim knobs:
// logic die array (die_n = die_cols_n x die_rows_n), one bridge per adjacent logic pair (edge rule), HBM rows along
// the outer y edges of the die array with one bridge per HBM-logic edge, HBM generation, lid / ring / none,
// homogenized bridge TSV and substrate PTH fields.

import { hbmGenFormulas, HBM_GEN_PARAM, HBM_TABLE, lidRingParts, lidTypeParam } from './common.mjs';
import { LID_ATTACH, SIM_MAT } from './common.mjs';
import { BOUNDS } from './bounds.mjs';
import { multipleOf } from './rules.mjs';
import { editor, mapSolderResist } from './generic.mjs';
import base from './specs/emib_t.mjs';

const GAP = 'die_gap_um / 1000';
const H4 = HBM_TABLE.HBM4;

export const ext = {
  bounds: BOUNDS.emib_t,
  add: {
    sr_mat: SIM_MAT.sr_mat,
    ...LID_ATTACH,
    hbm_reach_mm: { value: 0.6, status: 'template', note: 'max HBM-to-logic edge distance for the HBM placement rule = template die gap 100 um + 0.5 mm (fixed, so a larger die gap is caught)' },
    lid_mat: SIM_MAT.lid_mat,
    mim_mat: SIM_MAT.mim_mat,
    hbm_gen: HBM_GEN_PARAM,
    die_rows_n: { value: 1, status: 'template', note: 'logic die rows (die array ny); the EMIB25T TV places its two dies in one row' },
    die_cols_n: { formula: 'die_n / die_rows_n', status: 'template', note: 'logic die columns (die array nx) = die count / rows' },
    die_py_mm: { formula: `die_d_mm + ${GAP}`, status: 'template', note: 'die row pitch = die length + D2D gap' },
    dieblk_w_mm: { formula: `die_cols_n * die_w_mm + (die_cols_n - 1) * ${GAP}`, status: 'template', note: 'logic die block width' },
    dieblk_d_mm: { formula: `die_rows_n * die_d_mm + (die_rows_n - 1) * ${GAP}`, status: 'template', note: 'logic die block length' },
    bridge_cols_n: { formula: 'die_cols_n - 1', status: 'template', note: 'edge rule: one bridge per adjacent logic pair along x (R5 sec. 4.6; 2 dies 1 bridge reported, ectc51846.2026.00051-b-c1)' },
    bridge_y_rows_n: { formula: 'die_rows_n - 1', status: 'template', note: 'edge rule: one bridge per adjacent logic pair along y (rotated)' },
    hbm_n: { value: 0, status: 'template', note: 'backbone EMIB25T TV has no HBM; EMIB-T targets HBM4/4e (ectc51687.2025.00051 p.2); sim knob' },
    hbm_w_mm: { value: H4.long_mm, status: 'template', refs: H4.refs, note: `HBM not in the backbone; ${H4.note}` },
    hbm_d_mm: { value: H4.short_mm, status: 'template', refs: H4.refs, note: `HBM not in the backbone; ${H4.note}` },
    hbm_h_um: { value: H4.h_um, status: 'template', source: H4.source, alternatives: H4.alternatives, note: `HBM not in the backbone; ${H4.note}` },
    hbm_per_row_n: { formula: 'hbm_n / 2', status: 'template', note: 'HBM in two rows along the outer +y / -y edges of the die array (template layout, no EMIB-T HBM floor plan read)' },
    hbm_px_mm: { formula: 'max(dieblk_w_mm - hbm_w_mm, 0) / max(hbm_per_row_n - 1, 1)', status: 'template', note: 'HBM spread evenly along the die-array edge' },
    hbm_row_y_mm: { formula: `dieblk_d_mm / 2 + ${GAP} + hbm_d_mm / 2`, status: 'template', note: 'HBM row center: die-array edge + D2D gap' },
    hbm_bridge_w_mm: { value: 7, status: 'template', refs: ['ectc51909.2023.00175-a-c3.x_mm'], note: 'HBM-logic bridge size not reported for EMIB-T; analog = Amkor S-Connect connect die (Si bridge), along the HBM edge' },
    hbm_bridge_d_mm: { value: 6, status: 'template', refs: ['ectc51909.2023.00175-a-c3.y_mm'], note: 'HBM-logic bridge size not reported for EMIB-T; analog = Amkor S-Connect connect die, across the edge' },
    hbm_bridge_y_mm: { formula: `dieblk_d_mm / 2 + ${GAP} / 2`, status: 'template', note: 'HBM bridge centered on the HBM-logic gap' },
    tdblk_w_mm: { formula: 'dieblk_w_mm', status: 'template', note: 'top-die block width (HBM rows lie within the logic block width)' },
    tdblk_d_mm: { formula: `dieblk_d_mm + min(hbm_n, 1) * 2 * (${GAP} + hbm_d_mm)`, status: 'template', note: 'top-die block length incl. HBM rows' },
    lid_type: lidTypeParam('none', 'no EMIB-T row states a stiffener or lid (R5 sec. 4.3); ring and lid offered as sim options'),
    ring_w_mm: { value: 7, status: 'template', note: 'ring width not reported for EMIB-T; 7 mm as the CoWoS-S template (illustrative)' },
    ring_h_um: { value: 2000, status: 'template', refs: ['ectc51909.2023.00155-a-c11.thickness_um'], note: 'ring thickness not reported for EMIB-T; analog = 2 mm Cu stiffener of a 2.5D TV' },
    lid_h_um: { value: 2000, status: 'template', refs: ['ectc51909.2023.00091-a-c8.thickness_um'], note: 'lid thickness not reported for EMIB-T; analog = 2 mm lid of a TSMC CoWoS-L TV' },
    lid_foot_w_mm: { value: 5, status: 'template', note: 'lid foot (sidewall) width not reported; illustrative (as cowos_l)' },
    tim_h_um: { value: 60, status: 'template', refs: ['itherm45881.2020.9190542-a-c5.thickness_um'], note: 'TIM1 thickness not reported for EMIB-T; analog = TIM1 of a TSMC InFO_oS lid TV' },
    lid_gap_um: { formula: 'fli_h_um + die_h_um + tim_h_um', status: 'template', note: 'lid plate on the TIM over the logic dies' },
    fli_core_region_w_mm: { alias: 'die_w_mm' },
    fli_core_region_d_mm: { alias: 'die_d_mm' },
  },
  formulas: { ...hbmGenFormulas('x') },
};

export const preChecks = [
  multipleOf('die_n', 'die_rows_n', 'logic die array of die_rows_n rows'),
  (P) => (P.v('hbm_n') % 2 === 0 ? null : { code: 'not_multiple', level: 'error', param: 'hbm_n', message: `hbm_n = ${P.v('hbm_n')} must be even (two HBM rows along the outer die-array edges)` }),
  (P) => {
    const n = P.v('hbm_per_row_n');
    if (!(n > 0)) return null;
    const need = n * P.v('hbm_w_mm') + (n - 1) * P.v('die_gap_um') / 1000;
    return need > P.v('dieblk_w_mm') + 1e-6 ? { code: 'hbm_row_fit', level: 'error',
      message: `HBM row of ${n} x ${P.v('hbm_w_mm')} mm + gaps needs ${need.toFixed(2)} mm along the die-array edge of ${P.v('dieblk_w_mm').toFixed(2)} mm` } : null;
  },
  (P) => (P.v('hbm_n') > 0 && P.v('hbm_h_um') > P.v('die_h_um') ? { code: 'hbm_taller', level: 'warn', message: 'HBM taller than the logic dies: the TIM / lid plane follows the logic dies' } : null),
];

// Structure: specs/emib_t.mjs (transcribed from config/package3d/emib_t.yaml); edits re-apply the sim knobs by id.
export function build(P) {
  const E = editor(JSON.parse(JSON.stringify({ parts: base.parts, layers: base.layers, arrays: base.arrays })));
  const lidType = P.v('lid_type');
  const nH = P.v('hbm_per_row_n');
  const hpx = P.v('hbm_px_mm');
  const hy = P.v('hbm_row_y_mm');
  const by = P.v('hbm_bridge_y_mm');
  const hx = Array.from({ length: nH }, (_, i) => (i - (nH - 1) / 2) * hpx);
  const st = (ks) => ({ status: ks.map((k) => P.entries[k].status).includes('user') ? 'user' : 'template' });
  const hbmCenters = { list: [...hx.map((x) => [x, hy]), ...hx.map((x) => [x, -hy])],
    x_mm: { ...st(['hbm_px_mm']), formula: '(i - (hbm_per_row_n - 1) / 2) * hbm_px_mm', inputs: ['hbm_px_mm'] },
    y_mm: { ...st(['hbm_row_y_mm']), formula: '+/- hbm_row_y_mm', inputs: ['hbm_row_y_mm'] } };
  const hbCenters = { list: [...hx.map((x) => [x, by]), ...hx.map((x) => [x, -by])],
    x_mm: { ...st(['hbm_px_mm']), formula: 'HBM column x', inputs: ['hbm_px_mm'] },
    y_mm: { ...st(['hbm_bridge_y_mm']), formula: '+/- hbm_bridge_y_mm', inputs: ['hbm_bridge_y_mm'] } };
  // logic die array and one bridge per adjacent logic pair (identical to the template for one die row)
  const bridge = E.part('bridge');
  const cav = E.part('cavity_fill');
  bridge.repeat = { nx: 'bridge_cols_n', ny: 'die_rows_n', px: 'die_px_mm', py: 'die_py_mm' };
  cav.repeat = { nx: 'bridge_cols_n', ny: 'die_rows_n', px: 'die_px_mm', py: 'die_py_mm' };
  E.part('die').repeat = { nx: 'die_cols_n', ny: 'die_rows_n', px: 'die_px_mm', py: 'die_py_mm' };
  E.part('die_uf').fill.parts = ['die', 'hbm'];
  const clone = (d, patch) => ({ ...JSON.parse(JSON.stringify(d)), ...patch });
  E.addParts(
    clone(bridge, { id: 'bridge_y', name: 'EMIB-T bridge, logic rows (Si, TSV)', w: 'bridge_d_mm', d: 'bridge_w_mm',
      repeat: { nx: 'die_cols_n', ny: 'bridge_y_rows_n', px: 'die_px_mm', py: 'die_py_mm' }, note: 'sim knob: bridge rotated under the logic-logic edges along y (die_rows_n > 1)' }),
    clone(cav, { id: 'cavity_fill_y', name: 'Cavity joints + underfill (row bridges)', w: 'bridge_d_mm + 2 * cav_margin_mm', d: 'bridge_w_mm + 2 * cav_margin_mm',
      repeat: { nx: 'die_cols_n', ny: 'bridge_y_rows_n', px: 'die_px_mm', py: 'die_py_mm' } }),
    { id: 'hbm', name: 'HBM', kind: 'hbm', material: 'silicon', w: 'hbm_w_mm', d: 'hbm_d_mm', h: 'hbm_h_um', on: 'substrate', standoff: 'fli_core', centers: hbmCenters },
    clone(bridge, { id: 'hbm_bridge', name: 'EMIB-T bridge, HBM-logic (Si, TSV)', w: 'hbm_bridge_w_mm', d: 'hbm_bridge_d_mm', repeat: undefined, centers: hbCenters,
      note: 'sim knob: one bridge per HBM-logic edge (edge rule)' }),
    clone(cav, { id: 'hbm_cavity_fill', name: 'Cavity joints + underfill (HBM bridges)', w: 'hbm_bridge_w_mm + 2 * cav_margin_mm', d: 'hbm_bridge_d_mm + 2 * cav_margin_mm',
      repeat: undefined, centers: hbCenters }),
    ...lidRingParts(P, { lidType, ringLabel: 'ring (material not reported)',
      tim: { id: 'tim', name: 'TIM1', kind: 'tim', material: 'tim', w: 'tdblk_w_mm', d: 'tdblk_d_mm', h: 'tim_h_um', on: 'die' } }),
  );
  E.layerEl('br_mim').material_sim = 'mim_mat';
  E.cloneLayers('bridge', 'bridge_y', 'br_', 'bry_');
  E.cloneLayers('bridge', 'hbm_bridge', 'br_', 'hbr_');
  const allBridges = ['bridge', 'bridge_y', 'hbm_bridge'];
  E.array('fli_bridge').region = { intersectAny: allBridges };
  E.array('fli_core').region = { subtract: allBridges };
  const cb = E.array('cavity_bumps');
  const fb = E.array('fli_bridge');
  const fc = E.array('fli_core');
  E.addArrays(
    clone(cb, { id: 'cavity_bumps_y', name: 'Cavity-side bumps (row bridges)', in: 'cavity_fill_y', between: ['bridge_y', 'substrate'], region: { part: 'bridge_y' } }),
    clone(cb, { id: 'hbm_cavity_bumps', name: 'Cavity-side bumps (HBM bridges)', in: 'hbm_cavity_fill', between: ['hbm_bridge', 'substrate'], region: { part: 'hbm_bridge' } }),
    clone(fb, { id: 'fli_hbm_bridge', name: 'HBM FLI over bridge', per: 'hbm' }),
    clone(fc, { id: 'fli_hbm_core', name: 'HBM FLI (coarse)', per: 'hbm', note: undefined }),
    { id: 'br_tsv', name: 'Bridge TSV field', kind: 'tsv', inLayer: 'br_si', optional: true, pitch: 'tsv_pitch_um', diameter: 'tsv_d_um', simOnly: true, via: 'tsv' },
    { id: 'bry_tsv', name: 'Bridge TSV field (row bridges)', kind: 'tsv', inLayer: 'bry_si', optional: true, pitch: 'tsv_pitch_um', diameter: 'tsv_d_um', simOnly: true, via: 'tsv' },
    { id: 'hbr_tsv', name: 'Bridge TSV field (HBM bridges)', kind: 'tsv', inLayer: 'hbr_si', optional: true, pitch: 'tsv_pitch_um', diameter: 'tsv_d_um', simOnly: true, via: 'tsv' },
    { id: 'pth', name: 'PTH field', kind: 'pth', inLayer: 'sbt_core', pitch: 'pth_pitch_um', diameter: 'pth_d_um', wall: 'pth_wall_um', fillKind: 'plugged', simOnly: true, via: 'pth',
      note: 'core through holes homogenized over the whole core (the cavity sits in the build-up above the core)' },
  );
  return mapSolderResist(E.spec);
}

export const layout = {
  hbmReach: 'hbm_reach_mm',
  logic: ['die'], hbm: ['hbm'], interposers: [], bridges: ['bridge', 'bridge_y', 'hbm_bridge'], hbmBridges: 'hbm_bridge',
  fillUnderInterposer: null, keepOut: ['die_uf'],
};
