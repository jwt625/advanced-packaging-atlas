// License: GPL-3.0-or-later.
// CoWoS-S family generator spec. Structure transcribed from config/package3d/cowos_s.yaml (2026-10-20). Sim knobs:
// SoC array per interposer (soc_cols_n x soc_rows_n), HBM generation, interposer sizing rule (reticle | fit_dies |
// given), lid / ring / none, scope (package | module = interposer module only, as in a module-level FEM),
// per-array bump regions, homogenized TSV and PTH fields.

import { hbmGenFormulas, HBM_GEN_PARAM, lidRingParts, lidTypeParam } from './common.mjs';
import { LID_ATTACH, SIM_MAT } from './common.mjs';
import { BOUNDS } from './bounds.mjs';
import { multipleOf } from './rules.mjs';
import { editor, mapSolderResist } from './generic.mjs';
import base from './specs/cowos_s.mjs';

const GAP = 'die_gap_um / 1000';

export const ext = {
  bounds: BOUNDS.cowos_s,
  add: {
    sr_mat: SIM_MAT.sr_mat,
    c4_uf_mat: SIM_MAT.c4_uf_mat,
    ...LID_ATTACH,
    hbm_reach_mm: { value: 0.65, status: 'template', note: 'max HBM-to-logic edge distance for the HBM placement rule = template die gap 150 um + 0.5 mm (fixed, so a larger die gap is caught)' },
    lid_mat: SIM_MAT.lid_mat,
    al_mat: SIM_MAT.al_mat,
    hbm_gen: HBM_GEN_PARAM,
    scope: { value: 'package', status: 'template', options: ['package', 'module'],
      note: 'package = full template stack; module = interposer module only (interposer, dies, mold, underfill, C4 hanging free; no substrate, UF2, ring, lid, BGA)' },
    soc_cols_n: { value: 1, status: 'template', note: 'SoC columns per interposer (die array nx); backbone: one SoC per interposer (Fig. 3 TV1 floor plan)' },
    soc_rows_n: { formula: 'soc_n / ip_n / soc_cols_n', status: 'template', note: 'SoC rows per interposer (die array ny) = SoC count / interposers / columns' },
    soc_px_mm: { formula: `soc_w_mm + ${GAP}`, status: 'template', note: 'SoC column pitch = SoC width + D2D gap' },
    soc_py_mm: { formula: `soc_d_mm + ${GAP}`, status: 'template', note: 'SoC row pitch = SoC length + D2D gap' },
    socblk_w_mm: { formula: `soc_cols_n * soc_w_mm + (soc_cols_n - 1) * ${GAP}`, status: 'template', note: 'SoC block width per interposer' },
    socblk_d_mm: { formula: `soc_rows_n * soc_d_mm + (soc_rows_n - 1) * ${GAP}`, status: 'template', note: 'SoC block length per interposer' },
    hbm_a_y_mm: { formula: '(ip_n - 1) * ip_py_mm / 2', status: 'template', note: 'HBM group of module 1 centered on its interposer (0 for one interposer)' },
    ip_size_rule: { value: 'reticle', status: 'template', options: ['reticle', 'fit_dies', 'given'],
      note: 'interposer sizing: reticle (template: ip_w from the die block, ip_d = reticle_x * reticle_area / ip_w), fit_dies (ip = die block + ip_edge_mm per side), given (ip_w_mm, ip_d_mm as set)' },
    ip_reticle_mult: { formula: 'ip_w_mm * ip_d_mm / reticle_area_mm2', status: 'derived', note: 'interposer area in reticles of reticle_area_mm2' },
    lid_type: lidTypeParam('ring', 'Cu stiffener ring (backbone ectc51909.2023.00135-a-c5); lid and none offered as sim options'),
    lid_h_um: { value: 2000, status: 'template', refs: ['ectc51909.2023.00091-a-c8.thickness_um'], note: 'lid thickness not reported for CoWoS-S; analog = 2 mm lid of a TSMC CoWoS-L TV' },
    lid_foot_w_mm: { value: 5, status: 'template', note: 'lid foot (sidewall) width not reported; illustrative (as cowos_l)' },
    tim_h_um: { value: 60, status: 'template', refs: ['itherm45881.2020.9190542-a-c5.thickness_um'], note: 'TIM1 thickness not reported for CoWoS-S; analog = TIM1 of a TSMC InFO_oS lid TV' },
    lid_gap_um: { formula: 'c4_h_um + ip_tot_um + mold_h_um + tim_h_um', status: 'template', note: 'lid plate on the TIM: substrate top to TIM top' },
    top_encap: { value: 'mold', status: 'template', options: ['mold', 'none'], note: 'mold between the top dies (template) or none (underfill only, e.g. early TSV-interposer TVs)' },
    ring_wy_mm: { alias: 'ring_w_mm' },
    ring_attach: { value: 'none', status: 'template', options: ['none', 'adhesive'],
      note: 'none = stiffener bonded directly to the substrate (template); adhesive = stiffener on an adhesive frame of ring_adh_h_um (e.g. silicone glue, needed for an attach step in a process_sequence study)' },
    ring_adh_h_um: { value: 100, status: 'template', refs: ['ectc51906.2022.00108-a-L05.thickness_um', 'tcpmt.2026.3672227-a-L05.thickness_min_um', 'ectc51529.2024.00265-a-c4.thickness_um'],
      note: 'stiffener adhesive thickness not reported; analog 100 um (ectc51906.2022.00108 stiffener adhesive); corpus range 50 um (tcpmt.2026.3672227 min) to 300 um (ectc51529.2024.00265 bead study) for sensitivity bounds' },
    ring_adh_mat: { value: 'silicone_adhesive', status: 'template', note: 'stiffener adhesive product not named; library silicone_adhesive' },
    ring_part_mat: { formula: null, value: 'copper', status: 'template', options: ['copper', 'stainless_steel'],
      note: 'ring part material key; template Cu ring (ectc51909.2023.00135-a-c5.material = copper)' },
    ubump_hbm_pitch_um: { alias: 'ubump_pitch_um' },
    ubump_hbm_d_um: { alias: 'ubump_d_um' },
    c4_inclusion: { value: 'copper', status: 'template', options: ['copper', 'solder'], note: 'C4 joint inclusion for homogenization: Cu pillar (template) or solder bump' },
    ubump_soc_region_w_mm: { alias: 'soc_w_mm' },
    ubump_soc_region_d_mm: { alias: 'soc_d_mm' },
    ubump_hbm_region_w_mm: { alias: 'hbm_w_mm' },
    ubump_hbm_region_d_mm: { alias: 'hbm_d_mm' },
    c4_region_w_mm: { alias: 'ip_w_mm' },
    c4_region_d_mm: { alias: 'ip_d_mm' },
  },
  formulas: {
    ...hbmGenFormulas('y'),
    hbm_rows_n: { formula: 'hbm_n / ip_n / hbm_cols_n', note: 'unchanged' },
    hbm_px_mm: { formula: `socblk_w_mm + 2 * ${GAP} + hbm_w_mm`, note: 'generalized to the SoC block width' },
    hbm_py_mm: { formula: '(socblk_d_mm - hbm_d_mm) / max(hbm_rows_n - 1, 1)', note: 'generalized: HBM column spans the SoC block, end HBM flush with its edges' },
    block_w_mm: { formula: `socblk_w_mm + min(hbm_n, 1) * 2 * (hbm_w_mm + ${GAP})`, note: 'generalized to the SoC block and hbm_n = 0' },
    ip_w_mm: [{ when: { ip_size_rule: 'given' }, formula: null, note: 'given (ip_size_rule = given)' }],
    ip_d_mm: [
      { when: { ip_size_rule: 'given' }, formula: null, note: 'given (ip_size_rule = given)' },
      { when: { ip_size_rule: 'fit_dies' }, formula: `max(socblk_d_mm, hbm_rows_n * hbm_d_mm + (hbm_rows_n - 1) * ${GAP}) + 2 * ip_edge_mm`, status: 'template',
        note: 'interposer = die block + ip_edge_mm per side' },
    ],
  },
};

export const preChecks = [
  (P) => ([1, 2].includes(P.v('ip_n')) ? null : { code: 'bad_count', level: 'error', param: 'ip_n', message: `ip_n = ${P.v('ip_n')}: the CoWoS-S template stacks 1 or 2 interposer modules along y` }),
  (P) => multipleOf('soc_n', 'ip_n', 'SoC dies per interposer')(P),
  (P) => (Number.isInteger(P.v('soc_rows_n')) ? null : { code: 'not_multiple', level: 'error', param: 'soc_n', message: `soc_n = ${P.v('soc_n')} is not a multiple of ip_n x soc_cols_n = ${P.v('ip_n') * P.v('soc_cols_n')}` }),
  (P) => (P.v('hbm_n') === 0 || Number.isInteger(P.v('hbm_rows_n')) ? null
    : { code: 'not_multiple', level: 'error', param: 'hbm_n', message: `hbm_n = ${P.v('hbm_n')} is not a multiple of ip_n x hbm_cols_n = ${P.v('ip_n') * P.v('hbm_cols_n')} (HBM columns flank the SoC block on each interposer)` }),
  (P) => {
    const rows = P.v('hbm_rows_n');
    if (!(rows > 1)) return null;
    const need = rows * P.v('hbm_d_mm') + (rows - 1) * P.v('die_gap_um') / 1000;
    const have = P.v('socblk_d_mm');
    return need > have + 1e-6 ? { code: 'hbm_column_fit', level: 'error',
      message: `HBM column of ${rows} x ${P.v('hbm_d_mm')} mm + gaps needs ${need.toFixed(2)} mm along the SoC block of ${have.toFixed(2)} mm (HBM must face the SoC long edges)` } : null;
  },
];

// Structure: specs/cowos_s.mjs (transcribed from config/package3d/cowos_s.yaml); edits re-apply the sim knobs by id.
export function build(P) {
  const E = editor(JSON.parse(JSON.stringify({ parts: base.parts, layers: base.layers, arrays: base.arrays })));
  const pkg = P.v('scope') === 'package';
  const lidType = pkg ? P.v('lid_type') : 'none';
  const ipN = P.v('ip_n');
  const mold = P.v('top_encap') === 'mold' ? 'mold' : undefined;
  // SoC centers: module by module from +y, row-major inside the module (builder ordering for one SoC per module)
  const cols = P.v('soc_cols_n');
  const rows = P.v('soc_rows_n');
  const px = P.v('soc_px_mm');
  const py = P.v('soc_py_mm');
  const ipy = P.v('ip_py_mm');
  const list = [];
  for (let m = 0; m < ipN; m++) {
    const ym = ((ipN - 1) / 2 - m) * ipy;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) list.push([(i - (cols - 1) / 2) * px, ym + ((rows - 1) / 2 - j) * py]);
  }
  const st = ['ip_py_mm', 'soc_px_mm', 'soc_py_mm'].map((k) => P.entries[k].status);
  const soc = E.part('soc');
  delete soc.in; delete soc.repeat;
  Object.assign(soc, { on: 'interposer', gap: 'ubump_h_um', host: mold,
    centers: { list, x_mm: { status: cols > 1 ? dominantOf(st) : 'template', formula: '(i - (soc_cols_n - 1) / 2) * soc_px_mm', inputs: ['soc_px_mm'], note: cols > 1 ? undefined : 'centered on the interposer (layout convention)' },
      y_mm: { status: dominantOf(st), formula: 'module center ((ip_n - 1) / 2 - m) * ip_py_mm + ((soc_rows_n - 1) / 2 - j) * soc_py_mm', inputs: ['ip_py_mm', 'soc_py_mm'] } } });
  for (const id of ['hbm_a', 'hbm_b']) { const h = E.part(id); delete h.in; Object.assign(h, { on: 'interposer', gap: 'ubump_h_um', host: mold }); }
  E.part('hbm_a').y = 'hbm_a_y_mm';
  if (ipN !== 2) { E.removeParts('hbm_b'); E.removeArrays('ubump_hbm_b'); }
  E.part('uf1').d = 'socblk_d_mm + 2 * uf1_margin_mm';
  if (!mold) E.removeParts('mold');
  E.layerEl('ip_al').material_sim = 'al_mat';
  if (pkg) {
    const ring = E.part('ring');
    ring.material = P.v('ring_part_mat');
    ring.material_label = P.v('ring_part_mat');
    ring.frame_wy = 'ring_wy_mm';
    if (lidType === 'ring' && P.v('ring_attach') === 'adhesive') {
      ring.on = 'ring_adh';
      E.replacePart('ring', [{ id: 'ring_adh', name: 'Stiffener adhesive', kind: 'other', material: 'other', material_sim: 'ring_adh_mat', material_label: 'stiffener adhesive',
        w: 'sbt_w_mm', d: 'sbt_d_mm', h: 'ring_adh_h_um', shape: 'frame', frame_w: 'ring_w_mm', frame_wy: 'ring_wy_mm', on: 'substrate' }, ring]);
    }
    if (lidType !== 'ring') {
      E.replacePart('ring', lidRingParts(P, { lidType,
        tim: mold ? { id: 'tim', name: 'TIM1', kind: 'tim', material: 'tim', w: 'ip_w_mm', d: 'ip_d_mm', h: 'tim_h_um', on: 'mold', repeat: { ny: 'ip_n', py: 'ip_py_mm' } }
          : { id: 'tim', name: 'TIM1 (over the die block)', kind: 'tim', material: 'tim', w: 'block_w_mm', d: 'socblk_d_mm', h: 'tim_h_um', on: 'soc', repeat: { ny: 'ip_n', py: 'ip_py_mm' } } }));
    }
  } else {
    // module scope: interposer module only (no substrate, UF2, ring / lid, BGA); C4 hangs under the interposer
    E.removeParts('substrate', 'uf2', 'ring');
    E.removeLayerHost('substrate');
    const ip = E.part('interposer');
    delete ip.on; delete ip.standoff;
    ip.base = true;
    const c4 = E.array('c4');
    delete c4.per; delete c4.lower;
    c4.under = 'interposer';
    c4.name = 'Cu-pillar C4 (free)';
    E.removeArrays('bga');
  }
  // per-array bump regions, pitches, C4 inclusion; sim-only via fields
  E.array('ubump_soc').region = { size: { w: 'ubump_soc_region_w_mm', d: 'ubump_soc_region_d_mm' } };
  for (const id of ipN === 2 ? ['ubump_hbm_a', 'ubump_hbm_b'] : ['ubump_hbm_a']) {
    Object.assign(E.array(id), { pitch: 'ubump_hbm_pitch_um', diameter: 'ubump_hbm_d_um', region: { size: { w: 'ubump_hbm_region_w_mm', d: 'ubump_hbm_region_d_mm' } } });
  }
  Object.assign(E.array('c4'), { region: { size: { w: 'c4_region_w_mm', d: 'c4_region_d_mm' } }, inclusion: 'c4_inclusion' });
  E.addArrays({ id: 'tsv', name: 'TSV field', kind: 'tsv', inLayer: 'ip_si', pitch: 'tsv_pitch_um', diameter: 'tsv_d_um', simOnly: true, via: 'tsv',
    note: 'interposer TSV via class homogenized over the Si core (placement not reported)' });
  if (pkg) E.addArrays({ id: 'pth', name: 'PTH field', kind: 'pth', inLayer: 'sbt_core', pitch: 'pth_pitch_um', diameter: 'pth_d_um', wall: 'pth_wall_um', fillKind: 'plugged', simOnly: true, via: 'pth' });
  if (E.hasPart('uf2')) E.part('uf2').material_sim = 'c4_uf_mat';
  return mapSolderResist(E.spec);
}

function dominantOf(sts) {
  const rank = { reported: 1, derived: 2, public: 3, template: 4, user: 5 };
  const best = sts.reduce((a, b) => (rank[b] > rank[a] ? b : a), 'reported');
  return best === 'reported' ? 'derived' : best;
}

export const layout = {
  hbmReach: 'hbm_reach_mm',
  logic: ['soc'], hbm: ['hbm_a', 'hbm_b'], interposers: ['interposer'], bridges: [],
  reticleArea: { w: 'ip_w_mm', d: 'ip_d_mm', mult: 'reticle_x', per: 'reticle_area_mm2', count: true },
  fillUnderInterposer: 'uf2',
};
