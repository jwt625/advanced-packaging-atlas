// License: GPL-3.0-or-later.
// Product-class presets (DevLog-010 Decision 5): only facts from primary sources, every other dimension stays a
// family template. Facts as recorded by R5 (DevLog/research/2026-10-20-sim-canonical-configs.md sec. 2.2, AMD white
// papers retrieved 2026-10-20). Re-verification by this lane on 2026-10-20 failed (three WebFetch timeouts on the
// AMD PDF URLs); the facts are therefore R5-verified only. No preset for NVIDIA B300 (conflicting primary statements
// on the stack count), B200 or Rubin (stack count not in the fetched primary pages).
//
// Use: generate(family, {preset: 'mi455x_class', ...overrides}).

const CDNA3 = 'https://www.amd.com/content/dam/amd/en/documents/instinct-tech-docs/white-papers/amd-cdna-3-white-paper.pdf';
const CDNA4 = 'https://www.amd.com/content/dam/amd/en/documents/instinct-tech-docs/white-papers/amd-cdna-4-architecture-whitepaper.pdf';
const CDNA5 = 'https://www.amd.com/content/dam/amd/en/documents/products/technologies/cdna/amd-cdna5-whitepaper.pdf';
const VER = 'R5 retrieval 2026-10-20; lane L3 re-fetch 2026-10-20 timed out';

const pub = (value, source, note) => ({ value, status: 'public', source, note: `${note} (${VER})` });

export const PRESETS = {
  mi300x_class: {
    family: 'cowos_s',
    title: 'MI300X class: 8 HBM3 stacks',
    facts: [
      { fact: '8 XCD + 4 IOD; 8 HBM3 stacks, 192 GB; each IOD fans out to 2 stacks', source: CDNA3, status: 'public' },
      { fact: 'package technology not stated in the white paper; applied to the cowos_s generator as an assumption', status: 'assumption' },
    ],
    params: {
      hbm_n: pub(8, CDNA3, 'MI300X: 8 HBM3 stacks'),
      hbm_gen: pub('HBM3', CDNA3, 'MI300X: HBM3'),
    },
    template_note: 'die sizes, die-to-HBM mapping (XCD on IOD), interposer and substrate sizes and power maps are not public: family templates',
  },
  mi355x_class: {
    family: 'cowos_s',
    title: 'MI355X class: 8 stacks of 12-Hi HBM3E',
    facts: [
      { fact: '8 XCD + 2 IOD; 8 stacks of 12-Hi HBM3E, 36 GB per stack, 288 GB; 1400 W (MI355X, liquid)', source: CDNA4, status: 'public' },
      { fact: 'package technology not stated in the facts recorded by R5; applied to the cowos_s generator as an assumption', status: 'assumption' },
    ],
    params: {
      hbm_n: pub(8, CDNA4, 'MI355X: 8 HBM3E stacks'),
      hbm_gen: pub('HBM3E', CDNA4, 'MI355X: HBM3E 12-Hi (stack height from the HBM table, template)'),
    },
    power_W: { value: 1400, status: 'public', source: CDNA4, note: `MI355X board power, liquid cooled (${VER}); split over dies not public` },
    template_note: 'die sizes and placement, interposer, substrate and power map are not public: family templates',
  },
  mi455x_class: {
    family: 'cowos_l',
    title: 'MI455X class: CoWoS-L, 12 HBM4 stacks',
    facts: [
      { fact: 'CoWoS-L; 8 XCD + 2 IOD + 2 FCD; 12 HBM4 stacks, 2048 bit per stack, 432 GB', source: CDNA5, status: 'public' },
      { fact: 'die counts are public but their mapping to interposer-level dies is not; soc_n left at the template value', status: 'assumption' },
    ],
    params: {
      hbm_n: pub(12, CDNA5, 'MI455X: 12 HBM4 stacks'),
      hbm_gen: pub('HBM4', CDNA5, 'MI455X: HBM4 (footprint and 720 um height from the HBM table, template)'),
      ip_size_rule: { value: 'fit_dies', status: 'template', note: '12 HBM do not fit the 58 mm backbone RI column: RI sized from the die block (template)' },
      reticle_x: { value: '=ri_w_mm * ri_d_mm / reticle_area_mm2', status: 'template', note: 'reticle multiple not public for MI455X: set to the fitted RI area / 830 mm2' },
      sbt_w_mm: { value: '=ri_w_mm + 27', status: 'template', note: 'substrate size not public: RI-to-substrate margin kept as in the CoWoS-L backbone (70 - 43 mm)' },
      sbt_d_mm: { value: '=ri_d_mm + 20', status: 'template', note: 'substrate size not public: RI-to-substrate margin kept as in the CoWoS-L backbone (78 - 58 mm)' },
    },
    template_note: 'die sizes, RI size, substrate and power map are not public: family templates',
  },
};
