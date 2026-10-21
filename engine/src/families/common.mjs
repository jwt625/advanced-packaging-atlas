// License: GPL-3.0-or-later.
// Shared family knobs: HBM generation table, lid / ring / none, reticle area. Every value carries its source.

export const HBM_GENS = ['family', 'HBM2E', 'HBM3', 'HBM3E', 'HBM4'];

// Footprint (long x short side, mm) and stack height (um) per generation (R5 sec. 2.4; DevLog-010 Decision 5).
// Status template everywhere: the cells are analogs from other TVs and the heights are paper-text values.
export const HBM_TABLE = {
  HBM2E: {
    long_mm: 11, short_mm: 10, h_um: 685,
    refs: ['ectc51909.2023.00135-a-c2.x_mm', 'ectc51909.2023.00135-a-c2.y_mm', 'ectc32696.2021.00315-a-c2.thickness_um'],
    note: 'HBM2E 11 x 10 mm (TSMC CoWoS-S TV component row); stack height 685 um (Samsung Flashbolt schematic row)',
  },
  HBM3: {
    long_mm: 11, short_mm: 11, h_um: 720,
    refs: ['ectc51909.2023.00154-a-c4.x_mm', 'ectc51909.2023.00154-a-c4.y_mm', 'ectc51687.2025.00047-a-c2.x_mm'],
    source: 'vlsitechnologyandcir65830.2026.11577576 p.1, section "HBM Package Development Challenges" (Fig. 2 text: "maintaining total HBM height as 720um")',
    note: 'HBM3 11 x 11 mm (component rows); height 720 um from a general statement on the HBM development direction across generations (not an HBM3-specific value; no DB cell)',
  },
  HBM3E: {
    long_mm: 11, short_mm: 11, h_um: 720,
    refs: ['ectc51909.2023.00154-a-c4.x_mm'],
    source: 'vlsitechnologyandcir65830.2026.11577576 p.1, section "HBM Package Development Challenges" (Fig. 2 text: "maintaining total HBM height as 720um")',
    note: 'HBM3E footprint not found in any primary source read: HBM3 11 x 11 mm kept (template); height 720 um from a general statement on the HBM development direction (not HBM3E-specific)',
  },
  HBM4: {
    long_mm: 11, short_mm: 11, h_um: 720,
    refs: ['ectc51529.2024.00049-a-c2.x_mm', 'ectc51529.2024.00049-a-c2.y_mm'],
    source: 'vlsitechnologyandcir65830.2026.11577576 p.1 (12-layer HBM4 MTV4; total HBM height 720 um)',
    note: 'HBM4 footprint not found in a primary source: 11 x 11 mm of a CoWoS-R HBM labelled HBM3/4 (template); 12-Hi height 720 um (DevLog-010 Decision 5)',
    alternatives: [{ value: 775, unit: 'um', note: 'HBM4 12/16-Hi 775 um per secondary reports of JEDEC JESD270-4 (standard not read; unverified)' }],
  },
};

/**
 * Formula picks for hbm_w_mm / hbm_d_mm / hbm_h_um from `hbm_gen`. `longAxis` = 'x' when the family draws the long
 * HBM side along x (CoWoS-L, CoWoS-R) or 'y' (CoWoS-S draws HBM2E with 10 mm along x).
 */
export function hbmGenFormulas(longAxis = 'x') {
  const f = { hbm_w_mm: [], hbm_d_mm: [], hbm_h_um: [] };
  for (const [gen, t] of Object.entries(HBM_TABLE)) {
    const base = { when: { hbm_gen: gen }, formula: null, status: 'template', replace: true, refs: t.refs, source: t.source };
    const wv = longAxis === 'x' ? t.long_mm : t.short_mm;
    const dv = longAxis === 'x' ? t.short_mm : t.long_mm;
    f.hbm_w_mm.push({ ...base, value: wv, note: `${gen} footprint: ${t.note}` });
    f.hbm_d_mm.push({ ...base, value: dv, note: `${gen} footprint: ${t.note}` });
    f.hbm_h_um.push({ ...base, value: t.h_um, note: `${gen} stack height: ${t.note}`, alternatives: t.alternatives });
  }
  return f;
}

export const HBM_GEN_PARAM = {
  value: 'family', status: 'template', options: HBM_GENS,
  note: "HBM generation preset for footprint and height (R5 sec. 2.4); 'family' keeps the template's own HBM dims",
};

export const RETICLE_830 = {
  // TSMC footnote: one reticle = 830 mm2 (ectc51909.2023.00091 p.2). A cell of a CoWoS-L TV (notes field).
  reported: { value: 830, status: 'reported', ref: 'ectc51909.2023.00091-b.notes', note: 'one reticle defined as 830 mm2 (p.2 footnote)' },
  analog: { value: 830, status: 'template', refs: ['ectc51909.2023.00091-b.notes'], note: 'area of one reticle not given for this family; TSMC definition 830 mm2 (ectc51909.2023.00091 p.2 footnote)' },
};

export const LID_TYPES = ['lid', 'ring', 'none'];

export function lidTypeParam(def, note) {
  return { value: def, status: 'template', options: LID_TYPES, note };
}

/** Lid (plate + sidewall frame) or ring parts on the substrate. */
export function lidRingParts(P, { lidType, base = 'substrate', ringId = 'ring', ringKind = 'stiffener', ringMat = 'copper', ringLabel, tim, explodeNote }) {
  const out = [];
  if (lidType === 'ring') {
    out.push({ id: ringId, name: 'Stiffener ring', kind: ringKind, material: ringMat, material_label: ringLabel, w: 'sbt_w_mm', d: 'sbt_d_mm', h: 'ring_h_um',
      shape: 'frame', frame_w: 'ring_w_mm', frame_wy: P.has('ring_wy_mm') ? 'ring_wy_mm' : undefined, on: base,
      note: 'outer edge assumed flush with the substrate edge' });
  } else if (lidType === 'lid') {
    if (tim) out.push(tim);
    const adh = P.has('lid_attach') && P.v('lid_attach') === 'adhesive';
    if (adh) {
      out.push({ id: 'lid_adh', name: 'Lid attach adhesive', kind: 'other', material: 'other', material_sim: 'lid_adh_mat', material_label: 'lid-attach adhesive (not reported)',
        w: 'sbt_w_mm', d: 'sbt_d_mm', h: 'lid_adh_h_um', shape: 'frame', frame_w: 'lid_foot_w_mm', on: base });
    }
    out.push({ id: 'lid_foot', name: 'Lid sidewall', kind: 'lid', material: 'other', material_sim: 'lid_mat', material_label: 'lid (material not reported)', w: 'sbt_w_mm', d: 'sbt_d_mm',
      h: adh ? 'lid_gap_um - lid_adh_h_um' : 'lid_gap_um', shape: 'frame', frame_w: 'lid_foot_w_mm', on: adh ? 'lid_adh' : base });
    out.push({ id: 'lid', name: 'Lid', kind: 'lid', material: 'other', material_sim: 'lid_mat', material_label: 'lid (material not reported)', w: 'sbt_w_mm', d: 'sbt_d_mm',
      h: 'lid_h_um', on: base, gap: 'lid_gap_um', note: explodeNote || 'lid outline assumed equal to the substrate' });
  }
  return out;
}

// Library keys (engine/data/materials, lane L2) for template parts whose package3d material is `other`. The part keeps
// its template key (package3d.json); boxes use the sim key. Values are template choices with their basis.
export const SIM_MAT = {
  lid_mat: { value: 'cu_lid', status: 'template', note: 'lid material not reported; Cu lid assumed (R5 sec. 4.1 lid_mat Cu template; L2 maps lid / stiffener copper to cu_lid)' },
  al_mat: { value: 'al', status: 'template', note: 'Al RDL level (template material_label Al)' },
  beol_diel_mat: { value: 'sio2_film', status: 'template', note: 'BEOL / backside / bond dielectric not specified in the sources; SiO2 film assumed' },
  adhesive_mat: { value: 'epoxy_generic', status: 'template', note: 'adhesive not named in the sources; generic epoxy assumed' },
  mim_mat: { value: 'sio2_film', status: 'template', note: 'MIM capacitor stack not specified; SiO2 film assumed for the band' },
  c4_uf_mat: { value: 'underfill_cuf', status: 'template', note: 'C4 (interposer-to-substrate) underfill sim key, separate from the micro-bump underfill so a case can point it at its own library entry (L9 2026-10-20); default = the shared CUF entry; set underfill_c4 (L2 wave 8, Bottom CUF of ectc51529.2024.00155 Table IV) where the source distinguishes the C4 underfill' },
  sr_mat: { value: 'solder_resist', status: 'template', note: 'solder-resist layers (template material polymer_dielectric, which aliases to polyimide_rdl) use the library solder_resist entry; SR product not reported (L9 cross-cutting item 1, 2026-10-20)' },
};

// Lid attach (audit: L8 Xilinx lid sign miss): lid sidewall on an adhesive frame instead of bonded to the substrate.
export const LID_ATTACH = {
  lid_attach: { value: 'none', status: 'template', options: ['none', 'adhesive'],
    note: 'none = lid sidewall bonded directly to the substrate (template); adhesive = sidewall on an adhesive frame of lid_adh_h_um' },
  lid_adh_h_um: { value: 150, status: 'template', refs: ['ectc51529.2024.00265-a-c4.thickness_um'],
    note: 'lid-attach adhesive thickness not reported; analog = 150 um silicone stiffener adhesive (with glass-bead spacers) of an FCBGA TV' },
  lid_adh_mat: { value: 'silicone_adhesive', status: 'template', note: 'lid-attach adhesive not named; silicone adhesive library entry (analog of the FCBGA stiffener adhesive)' },
};
