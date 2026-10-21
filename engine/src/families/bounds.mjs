// License: GPL-3.0-or-later.
// Parameter bounds for UI sliders and range warnings. Only bounds with a source (R5 parameter tables, DB-observed
// ranges, public statements) or a layout rule (counts, `hard: true` = error outside). Everything else has no bounds.
const R5 = 'DevLog/research/2026-10-20-sim-canonical-configs.md';
const count = (min, basis, max) => ({ min, ...(max !== undefined ? { max } : {}), integer: true, hard: true, basis });

export const BOUNDS = {
  cowos_l: {
    soc_n: count(1, 'layout rule: at least one logic die'),
    soc_cols_n: count(1, 'layout rule: at least one SoC column'),
    hbm_n: { min: 0, max: 12, integer: true, basis: `${R5} sec. 4.1: DB-observed 4 (ectc51909.2023.00091-a), 8, 12 (-b); public 12 HBM4 on CoWoS-L (AMD CDNA5 white paper)` },
    reticle_x: { min: 1.6, max: 9.5, basis: `${R5} sec. 4.1: DB-observed 1.6x (ectc51909.2023.00091-a); 9.5x in development (TSMC 2025 annual report ch.5)` },
    sbt_w_mm: { min: 55, max: 120, basis: `${R5} sec. 4.1 range (70 x 78 backbone, 91 mm 00091, 120 mm peer ectc51529.2024.00155)` },
    sbt_d_mm: { min: 55, max: 120, basis: `${R5} sec. 4.1 range` },
    core_h_um: { min: 400, max: 1600, basis: `${R5} sec. 4.1 range` },
    bu_n: { min: 2, max: 10, integer: true, basis: `${R5} sec. 4.1: 3-2-3 (00091-a) to 8-2-8 (CoWoS-R 00049-a)` },
    lid_h_um: { min: 1000, max: 3000, basis: `${R5} sec. 4.1 range` },
    tim_h_um: { min: 25, max: 200, basis: 'TIM BLT 25-200 um swept in ectc51687.2025.00085-d (R5 sec. 4.1)' },
    ubump_pitch_um: { min: 25, max: 45, basis: `${R5} sec. 4.1 range` },
    hbm_h_um: { min: 685, max: 775, basis: `${R5} sec. 2.4: 685 (HBM2E analog) to 775 (HBM4, secondary)` },
  },
  cowos_s: {
    ip_n: count(1, 'template structure: 1 or 2 interposer modules', 2),
    soc_n: count(1, 'layout rule: at least one logic die'),
    soc_cols_n: count(1, 'layout rule: at least one SoC column'),
    hbm_n: { min: 0, integer: true, hard: true, basis: 'layout rule: non-negative count' },
    reticle_x: { min: 1, max: 3.3, basis: `${R5} sec. 4.2: 1.5x backbone; 3.3x CoWoS-S maximum (secondary, config/package3d/RESEARCH.md)` },
    si_h_um: { min: 50, max: 200, basis: '50 um optimized interposer (ectc51909.2023.00135-c-c4) to 200 um peer (ectc51529.2024.00155-a-c3)' },
    sbt_w_mm: { min: 55, max: 120, basis: `${R5} sec. 4.2 range` },
    sbt_d_mm: { min: 55, max: 120, basis: `${R5} sec. 4.2 range` },
    ubump_pitch_um: { min: 25, max: 55, basis: `${R5} sec. 4.2 range` },
    hbm_h_um: { min: 685, max: 775, basis: `${R5} sec. 2.4` },
  },
  emib_t: {
    die_n: count(1, 'layout rule: at least one logic die'),
    die_rows_n: count(1, 'layout rule: at least one die row'),
    hbm_n: { min: 0, integer: true, hard: true, basis: 'layout rule: non-negative even count' },
    bridge_w_mm: { min: 2, max: 8, basis: 'EMIB bridge 2 x 2 to 8 x 8 mm (ectc.2016.201-a-c1)' },
    bridge_d_mm: { min: 2, max: 18, basis: 'EMIB 2-8 mm (ectc.2016.201-a-c1); EMIB25T 18 mm (ectc51846.2026.00051-b-c1)' },
    bridge_h_um: { min: 50, max: 75, basis: '~50 um EMIB (ectc51846.2026.00051 Sec. I), < 75 um (ectc.2016.201-a-c1)' },
    fli_bridge_pitch_um: { min: 25, max: 55, basis: '25 (ectc51846.2026.00051-b-i1) to 55 um (ectc.2016.201-a-i1)' },
    sbt_w_mm: { min: 56, max: 240, basis: '77 x 56 mm TV (ectc51687.2025.00051-a-c2) to 240 mm theoretical (ectc51846.2026.00051 p.3)' },
    sbt_d_mm: { min: 56, max: 240, basis: 'as sbt_w_mm' },
  },
  fcbga_organic: {
    die_cols_n: count(1, 'layout rule: at least one die column'),
    die_rows_n: count(1, 'layout rule: at least one die row'),
    bu_inner_n: { min: 1, integer: true, hard: true, basis: 'layout rule: odd count >= 1 (pad level + pairs + L8)' },
  },
  cowos_r: {
    soc_n: count(1, 'layout rule: at least one logic die'),
    hbm_n: { min: 0, max: 12, integer: true, basis: 'DB: 12 HBM (ectc51529.2024.00049-a-c2), 8 (ectc51687.2025.00085-c-c2)' },
    reticle_x: { min: 3.3, max: 5.5, basis: '3.3x (ectc51687.2025.00085-c) to 5.5x (ectc51529.2024.00049-a)' },
    tim_h_um: { min: 25, max: 200, basis: 'TIM BLT 25-200 um swept in ectc51687.2025.00085-d' },
  },
};
