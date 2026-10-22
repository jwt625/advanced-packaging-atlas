// License: GPL-3.0-or-later.
// CoWoS-L family generator spec. Structure transcribed from config/package3d/cowos_l.yaml (template + module
// bridge_in_mold, 2026-10-20). Defaults and provenance come from package3d.json; this file adds sim knobs:
// SoC array (soc_cols_n x soc_rows_n), HBM generation, interposer sizing rule, lid / ring / none, bridge-count rule,
// per-array bump regions, and homogenized via fields from the template's routing via classes (TIV, LSI TSV, PTH).

import { hbmGenFormulas, HBM_GEN_PARAM, lidRingParts, lidTypeParam, RETICLE_830 } from './common.mjs';
import { LID_ATTACH, SIM_MAT } from './common.mjs';
import { BOUNDS } from './bounds.mjs';
import { multipleOf } from './rules.mjs';
import { editor, mapSolderResist } from './generic.mjs';
import base from './specs/cowos_l.mjs';

const GAP = 'die_gap_um / 1000';

export const ext = {
  bounds: BOUNDS.cowos_l,
  add: {
    sr_mat: SIM_MAT.sr_mat,
    c4_uf_mat: SIM_MAT.c4_uf_mat,
    ...LID_ATTACH,
    hbm_reach_mm: { value: 0.65, status: 'template', note: 'max HBM-to-logic edge distance for the HBM placement rule = template die gap 150 um + 0.5 mm (fixed, so a larger die gap is caught)' },
    lid_mat: SIM_MAT.lid_mat,
    hbm_gen: HBM_GEN_PARAM,
    soc_cols_n: { value: 1, status: 'template', note: 'SoC columns of the die array (nx); the backbone is drawn as one SoC column (package photo ectc51909.2023.00174 Fig. 3(a))' },
    soc_rows_n: { formula: 'soc_n / soc_cols_n', status: 'template', note: 'SoC rows of the die array (ny) = SoC count / columns' },
    soc_px_mm: { formula: `soc_w_mm + ${GAP}`, status: 'template', note: 'SoC column pitch = SoC width + D2D gap' },
    socblk_d_mm: { formula: `soc_rows_n * soc_d_mm + (soc_rows_n - 1) * ${GAP}`, status: 'template', note: 'SoC block length (rows + gaps)' },
    hbmblk_d_mm: { formula: `max(socblk_d_mm, hbm_rows_n * hbm_d_mm + (hbm_rows_n - 1) * ${GAP})`, status: 'template', note: 'HBM column length: spread along the SoC block, or packed at the D2D gap when longer' },
    socblk_w_mm: { formula: `soc_cols_n * soc_w_mm + (soc_cols_n - 1) * ${GAP}`, status: 'template', note: 'SoC block width (columns + gaps)' },
    lsi_ss_rows_n: { formula: 'soc_rows_n - 1', status: 'template', note: 'one LSI under each SoC-SoC edge along y (per SoC column)' },
    lsi_sx_cols_n: { formula: 'soc_cols_n - 1', status: 'template', note: 'one LSI under each SoC-SoC edge along x (between SoC columns); none for one column' },
    lsi_sx_n: { formula: '(soc_cols_n - 1) * soc_rows_n', status: 'template', note: 'LSI count under SoC-SoC edges along x' },
    lsi_edge_n: { formula: 'lsi_cols_n * lsi_rows_n + lsi_ss_n + lsi_sx_n', status: 'template', note: 'edge rule: one LSI per HBM-SoC edge + one per adjacent SoC pair (template layout)' },
    bridge_rule: { value: 'r5_fit', status: 'template', options: ['r5_fit', 'edge'],
      note: 'bridge-count rule: r5_fit n_lsi = n_hbm + n_soc (fits the 3 TSMC CoWoS-L TVs in the DB: ectc51909.2023.00091-a 4 + 2 = 6, -b 12 + 6 = 18, ectc51909.2023.00174-a 8 + 3 = 11 vs > 10; a fit, not a stated rule; R5 sec. 1.2) or edge (= drawn layout)' },
    lsi_target_n: { formula: 'hbm_n + soc_n', status: 'derived', refs: ['ectc51909.2023.00091-a-c4.count', 'ectc51909.2023.00091-b-c3.count', 'ectc51909.2023.00174-a-c4.count'],
      note: 'R5 fit n_lsi = n_hbm + n_soc (derived fit over 3 TSMC TVs; not a stated rule)' },
    ip_size_rule: { value: 'given', status: 'template', options: ['given', 'fit_dies', 'reticle'],
      note: "RI sizing: given (ri_w_mm x ri_d_mm, dies fill the block), fit_dies (RI = die block + ip_edge_mm per side, as the 6x TV defines its interposer, ectc51909.2023.00091-a notes), reticle (ri_d_mm = reticle_x * reticle_area_mm2 / ri_w_mm)" },
    reticle_area_mm2: RETICLE_830.reported,
    ri_reticle_mult: { formula: 'ri_w_mm * ri_d_mm / reticle_area_mm2', status: 'derived', note: 'RI area in reticles of reticle_area_mm2' },
    lid_type: lidTypeParam('lid', 'lid (template draws the lid-type TV option of ectc51909.2023.00174-a; ring type also offered, -b/-c TVs; 00091-a lid, 00091-b ring)'),
    ring_w_mm: { value: 7, status: 'template', note: 'stiffener ring width not reported for CoWoS-L (ectc51909.2023.00091-b label "Ring: 18mm-12mm-2mm" undefined); 7 mm as the CoWoS-S template (illustrative)' },
    ring_h_um: { value: 2000, status: 'template', refs: ['ectc51909.2023.00155-a-c11.thickness_um'], note: 'ring thickness not reported for CoWoS-L; analog = 2 mm Cu stiffener of a 2.5D Si-interposer TV' },
    ring_wy_mm: { alias: 'ring_w_mm', note: 'ring width of the north / south bars (along y); equals ring_w_mm unless set (L19 2026-10-21, for the ectc51909.2023.00091-b label "Ring: 18mm-12mm-2mm")' },
    // ---- 6x SC-RDL TV knobs (ectc51909.2023.00091-a): dummy Si in the top-die layer, substrate-sized SC-RDL + side mold
    dummy_n: { value: 0, status: 'template', note: 'dummy Si dies in the top-die layer; the backbone TV has none (the 1.6x 6x TV has 8, ectc51909.2023.00091-a-c3.count)' },
    dummy_rule: { value: 'rows_y', status: 'template', options: ['rows_y'],
      note: 'dummy dies in two rows of dummy_n / 2 along the +y / -y package edges, spread evenly in x (Fig. 6(b) top view, ectc51909.2023.00091-f02; not dimensioned)' },
    dummy_w_mm: { formula: '(3.8 * reticle_area_mm2 / 8) ** 0.5', status: 'template', refs: ['ectc51909.2023.00091-a-c3.notes', 'ectc51909.2023.00091-a-c3.count'],
      note: '8 dummy dies = equivalent 3.8x reticle of Si (-a-c3 notes); drawn square (Fig. 6(b) shows near-square dies); size not reported' },
    dummy_d_mm: { alias: 'dummy_w_mm' },
    dummy_h_um: { alias: 'soc_h_um' },
    dummy_edge_mm: { value: 3, status: 'template', note: 'dummy-die margin to the package edge not reported; 3 mm illustrative (Fig. 6(b) proportions)' },
    dummy_row_n: { formula: 'dummy_n / 2', status: 'template', note: 'dummy dies per row (two rows)' },
    dummy_px_mm: { formula: '(sbt_w_mm - 2 * dummy_edge_mm - dummy_w_mm) / max(dummy_row_n - 1, 1)', status: 'template', note: 'dummy dies spread evenly along the package edge' },
    dummy_y_mm: { formula: 'sbt_d_mm / 2 - dummy_edge_mm - dummy_d_mm / 2', status: 'template', note: 'dummy row center: package edge - margin - half die' },
    sc_rdl: { value: 'none', status: 'template', options: ['none', 'substrate'],
      note: "none = template (RDL interposer and mold sized ri_w x ri_d); substrate = 6x TV: SC-RDL (F/S RDL, LSI / TIV layer, B/S RDL) and side mold extended to the substrate edge, lid plate on the TIM (ectc51909.2023.00091 p.2-3, Fig. 4 / 6(a)); the 'interposer' area (ri_w x ri_d) keeps its definition (top-die rectangle + 1 mm)" },
    ubump_soc_region_w_mm: { alias: 'soc_w_mm' },
    ubump_soc_region_d_mm: { alias: 'soc_d_mm' },
    ubump_hbm_region_w_mm: { alias: 'hbm_w_mm' },
    ubump_hbm_region_d_mm: { alias: 'hbm_d_mm' },
    c4_region_w_mm: { alias: 'ri_w_mm' },
    c4_region_d_mm: { alias: 'ri_d_mm' },
  },
  formulas: {
    ...hbmGenFormulas('x'),
    soc_w_mm: [
      { when: { ip_size_rule: 'fit_dies' }, formula: null, note: 'free under ip_size_rule = fit_dies' },
      { formula: `(ri_w_mm - 2 * ip_edge_mm - min(hbm_n, 1) * 2 * (hbm_w_mm + ${GAP}) - (soc_cols_n - 1) * ${GAP}) / soc_cols_n`,
        note: 'generalized to soc_cols_n columns and hbm_n = 0 (no HBM columns)' },
    ],
    soc_d_mm: [
      { when: { ip_size_rule: 'fit_dies' }, formula: null, note: 'free under ip_size_rule = fit_dies' },
      { formula: `(ri_d_mm - 2 * ip_edge_mm - (soc_rows_n - 1) * ${GAP}) / soc_rows_n`, note: 'generalized to soc_rows_n rows' },
    ],
    ri_w_mm: [{ when: { ip_size_rule: 'fit_dies' }, formula: `socblk_w_mm + min(hbm_n, 1) * 2 * (hbm_w_mm + ${GAP}) + 2 * ip_edge_mm`, status: 'template',
      note: 'RI = die block + ip_edge_mm per side (rule of ectc51909.2023.00091-a notes)' }],
    ri_d_mm: [
      { when: { ip_size_rule: 'fit_dies' }, formula: 'hbmblk_d_mm + 2 * ip_edge_mm',
        status: 'template', note: 'RI = die block + ip_edge_mm per side (rule of ectc51909.2023.00091-a notes)' },
      { when: { ip_size_rule: 'reticle' }, formula: 'reticle_x * reticle_area_mm2 / ri_w_mm', status: 'template', note: 'RI length from the reticle multiple (R5 sec. 4.1)' },
    ],
    hbm_px_mm: { formula: `socblk_w_mm + 2 * ${GAP} + hbm_w_mm`, note: 'generalized to the SoC block width' },
    hbm_py_mm: { formula: '(hbmblk_d_mm - hbm_d_mm) / max(hbm_rows_n - 1, 1)', note: 'generalized: HBM spread along the SoC block (equals the template while the SoCs fill the RI); guarded for one row' },
    lsi_px_mm: { formula: `socblk_w_mm + ${GAP}`, note: 'generalized to the SoC block width' },
    lsi_py_mm: { formula: 'hbm_py_mm', note: 'LSI rows follow the (generalized) HBM rows' },
    lsi_rows_n: { formula: 'hbm_rows_n', note: 'one LSI per HBM row' },
    lsi_ss_n: { formula: 'soc_cols_n * (soc_rows_n - 1)', note: 'generalized to soc_cols_n columns' },
    lsi_target_n: [{ when: { bridge_rule: 'edge' }, formula: 'lsi_edge_n', status: 'template', note: 'edge rule: equals the drawn layout' }],
  },
};

// Structure: specs/cowos_l.mjs (transcribed from config/package3d/cowos_l.yaml, module bridge_in_mold merged); the
// edits below re-apply the sim knobs by element id and throw if the template drops an id they patch.
export function build(P) {
  const E = editor(JSON.parse(JSON.stringify({ parts: base.parts, layers: base.layers, arrays: base.arrays })));
  const lidType = P.v('lid_type');
  const sc = P.v('sc_rdl') === 'substrate';
  const MW = sc ? 'sbt_w_mm' : 'ri_w_mm';
  const MD = sc ? 'sbt_d_mm' : 'ri_d_mm';
  // SoC array and SoC-SoC bridges (generalized repeats; identical to the template for one SoC column)
  E.part('lsi_ss').repeat = { nx: 'soc_cols_n', ny: 'lsi_ss_rows_n', px: 'soc_px_mm', py: 'soc_py_mm' };
  const lsi = E.part('lsi');
  E.insertPartsAfter('lsi_ss', [{ ...JSON.parse(JSON.stringify(lsi)), id: 'lsi_sx', name: 'LSI bridge, SoC-SoC along x (Si, TSV)',
    repeat: { nx: 'lsi_sx_cols_n', ny: 'soc_rows_n', px: 'soc_px_mm', py: 'soc_py_mm' }, note: 'sim knob: LSI under the SoC-SoC edges between SoC columns (soc_cols_n > 1)' }]);
  // dies sit on their micro-bumps (template: `in: mold`, top flush; identical z while soc_h_um = hbm_h_um)
  for (const id of ['soc', 'hbm']) { const d = E.part(id); delete d.in; Object.assign(d, { on: 'ri_front', gap: 'ubump_h_um', host: 'mold' }); }
  E.part('soc').repeat = { nx: 'soc_cols_n', ny: 'soc_rows_n', px: 'soc_px_mm', py: 'soc_py_mm' };
  // SC-RDL / side mold to the substrate edge (6x TV option)
  for (const id of ['mold', 'ri_back', 'ri_core', 'ri_front']) { const d = E.part(id); d.w = MW; d.d = MD; }
  // lid / ring / none
  for (const id of ['lid_foot', 'lid']) E.part(id).material_sim = 'lid_mat';
  if (lidType === 'lid' && !sc && P.v('lid_attach') === 'adhesive') {
    const foot = E.part('lid_foot');
    E.insertPartsAfter('tim', [{ id: 'lid_adh', name: 'Lid attach adhesive', kind: 'other', material: 'other', material_sim: 'lid_adh_mat', material_label: 'lid-attach adhesive (not reported)',
      w: foot.w, d: foot.d, h: 'lid_adh_h_um', shape: 'frame', frame_w: foot.frame_w, on: foot.on }]);
    Object.assign(foot, { on: 'lid_adh', h: 'lid_gap_um - lid_adh_h_um' });
  }
  if (sc && lidType === 'lid') {
    const tim = E.part('tim');
    tim.w = MW; tim.d = MD;
    E.removeParts('lid_foot');
    Object.assign(E.part('lid'), { on: 'tim', note: 'lid plate on the TIM over the substrate-sized side mold (no sidewall: the module covers the substrate)' });
    delete E.part('lid').gap;
  } else if (lidType !== 'lid') {
    E.removeParts('lid_foot', 'lid');
    // SC-RDL TV with a ring (ectc51909.2023.00091-b, Fig. 7(a) cross-section): the SC-RDL and side mold cover the
    // substrate, so the ring sits on the side-mold top beside the top dies (L19 2026-10-21); otherwise on the substrate
    E.replacePart('tim', lidRingParts(P, { lidType, base: sc && lidType === 'ring' ? 'mold' : 'substrate', ringLabel: 'ring (material not reported)' }));
  }
  // dummy Si in the top-die layer (6x TV)
  const nD = P.v('dummy_n');
  if (nD > 0) {
    const nR = P.v('dummy_row_n');
    const px = P.v('dummy_px_mm');
    const dy = P.v('dummy_y_mm');
    const xs = Array.from({ length: nR }, (_, i) => (i - (nR - 1) / 2) * px);
    const st = ['dummy_px_mm', 'dummy_y_mm'].map((k) => P.entries[k].status).includes('user') ? 'user' : 'template';
    E.addParts({ id: 'dummy', name: 'Dummy Si', kind: 'die', material: 'silicon', w: 'dummy_w_mm', d: 'dummy_d_mm', h: 'dummy_h_um', on: 'ri_front', gap: 'ubump_h_um', host: 'mold',
      centers: { list: [...xs.map((x) => [x, dy]), ...xs.map((x) => [x, -dy])], x_mm: { status: st, formula: '(i - (dummy_row_n - 1) / 2) * dummy_px_mm', inputs: ['dummy_px_mm'] },
        y_mm: { status: st, formula: '+/- dummy_y_mm', inputs: ['dummy_y_mm'] } },
      note: 'dummy Si in the top-die layer (no bump field drawn; mold / underfill below it assumed)' });
  }
  // layers of the new SoC-SoC (x) bridges: copy of the LSI stack
  E.cloneLayers('lsi', 'lsi_sx', 'lsi_', 'lsi_sx_');
  // per-array bump regions and sim-only via fields
  E.array('ubump_soc').region = { size: { w: 'ubump_soc_region_w_mm', d: 'ubump_soc_region_d_mm' } };
  E.array('ubump_hbm').region = { size: { w: 'ubump_hbm_region_w_mm', d: 'ubump_hbm_region_d_mm' } };
  E.array('c4').region = { ...E.array('c4').region, size: { w: 'c4_region_w_mm', d: 'c4_region_d_mm' } };
  E.addArrays(
    { id: 'tiv', name: 'TIV field (Cu in mold)', kind: 'tmv', in: 'ri_core',
      region: sc ? { xywd: { x: { value: 0, status: 'template', note: 'interposer area centered' }, y: { value: 0, status: 'template', note: 'interposer area centered' }, w: 'ri_w_mm', d: 'ri_d_mm' }, subtract: ['lsi', 'lsi_ss', 'lsi_sx'] }
        : { part: 'ri_core', subtract: ['lsi', 'lsi_ss', 'lsi_sx'] }, pitch: 'tiv_pitch_um', diameter: 'tiv_d_um',
      simOnly: true, via: 'tiv', note: 'routing via class tiv homogenized over the RI core outside the LSIs (placement not reported)' },
    { id: 'lsi_tsv', name: 'LSI TSV field', kind: 'tsv', inLayer: 'lsi_si', optional: true, pitch: 'lsi_tsv_pitch_um', diameter: 'lsi_tsv_d_um', simOnly: true, via: 'lsi_tsv' },
    { id: 'lsi_ss_tsv', name: 'LSI TSV field (SoC-SoC)', kind: 'tsv', inLayer: 'lsi_ss_si', optional: true, pitch: 'lsi_tsv_pitch_um', diameter: 'lsi_tsv_d_um', simOnly: true, via: 'lsi_ss_tsv' },
    { id: 'lsi_sx_tsv', name: 'LSI TSV field (SoC-SoC along x)', kind: 'tsv', inLayer: 'lsi_sx_si', optional: true, pitch: 'lsi_tsv_pitch_um', diameter: 'lsi_tsv_d_um', simOnly: true, via: 'lsi_ss_tsv' },
    { id: 'pth', name: 'PTH field (plugged)', kind: 'pth', inLayer: 'sbt_core', pitch: 'pth_pitch_um', diameter: 'pth_d_um', wall: 'pth_wall_um', fillKind: 'plugged', simOnly: true, via: 'pth',
      note: 'plated wall only (resin plug left in the matrix)' },
  );
  if (E.hasPart('c4uf')) E.part('c4uf').material_sim = 'c4_uf_mat';
  return mapSolderResist(E.spec);
}

/** Layout facts for the rules module. */
export const layout = {
  hbmReach: 'hbm_reach_mm',
  logic: ['soc'], hbm: ['hbm'], others: ['dummy'], interposers: ['ri_core'], bridges: ['lsi', 'lsi_ss', 'lsi_sx'],
  hbmBridges: 'lsi', topDieHost: 'mold', reticleArea: { w: 'ri_w_mm', d: 'ri_d_mm', mult: 'reticle_x', per: 'reticle_area_mm2' },
  fillUnderInterposer: 'c4uf', bridgeRule: { target: 'lsi_target_n', edge: 'lsi_edge_n', rule: 'bridge_rule', reported: 'lsi_n' },
};

export const preChecks = [
  multipleOf('soc_n', 'soc_cols_n', 'SoC array of soc_cols_n columns'),
  multipleOf('hbm_n', 'hbm_cols_n', 'HBM in hbm_cols_n columns flanking the SoC block'),
  (P) => {
    const rows = P.v('hbm_rows_n');
    if (!(rows > 1)) return null;
    const need = P.v('hbmblk_d_mm');
    const have = P.v('ri_d_mm') - 2 * P.v('ip_edge_mm');
    return need > have + 1e-6 ? { code: 'hbm_column_fit', level: 'error',
      message: `HBM column of ${rows} x ${P.v('hbm_d_mm')} mm + gaps needs ${need.toFixed(2)} mm, the RI die block has ${have.toFixed(2)} mm (ri_d_mm - 2 ip_edge_mm); enlarge ri_d_mm or set ip_size_rule: fit_dies` } : null;
  },
];

preChecks.push((P) => (P.v('dummy_n') > 0 && P.v('dummy_n') % 2 !== 0 ? { code: 'not_multiple', level: 'error', param: 'dummy_n', message: `dummy_n = ${P.v('dummy_n')} must be even (two rows)` } : null));
preChecks.push((P) => (P.v('dummy_n') > 0 && P.v('sc_rdl') !== 'substrate' ? { code: 'dummy_needs_sc_rdl', level: 'error', param: 'dummy_n', message: 'dummy dies sit outside the RI: set sc_rdl: substrate (mold and SC-RDL to the substrate edge) to carry them' } : null));
