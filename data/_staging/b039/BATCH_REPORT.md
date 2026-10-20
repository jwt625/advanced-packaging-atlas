# Batch b039 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b039` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51529.2024.00311 | distilled | 2 | 3 | 8 | 3 | 16 | 0 | 0 | 20 | 6 | yes |
| ectc51687.2025.00047 | distilled | 5 | 10 | 12 | 8 | 0 | 2 | 0 | 29 | 6 | no |
| ectc51909.2023.00268 | distilled | 3 | 3 | 9 | 1 | 11 | 0 | 0 | 20 | 6 | yes |

## ectc51529.2024.00311 (imec / MEC: wet Cu passivation for fluxless TCB)
- Figures opened: page_02-04 renders; candidates p02_fig1, p02_fig2, p03_fig3, p03_fig4, p03_fig5/6 (on page render), p04_fig7a, p04_fig8; 300-500 dpi re-crops of Fig. 7(e) (CDF readout) and Fig. 4.
- Key figures: f01 Fig. 7 cross_section (candidate p04_fig7a, covers panels a-e); f02 Fig. 3 micrograph (candidate p03_fig3); f03 Fig. 4 mechanical_plot (candidate p03_fig4); f04 Fig. 8 xray_csam (candidate p04_fig8); f05 Fig. 1 thermal_plot (candidate p02_fig1); f06 Fig. 2 other/XPS (candidate p02_fig2).
- TVs: a = D2W TCB stack (7.2 mm Ni/Sn top dies on wet-passivated 5 um Cu-bump landing dies, 9 dies per 3x3 cm coupon); b = blanket Cu XPS coupons (cleaned vs passivated as variant).
- Judgment calls: 10/7/5 um pitch structures kept in TV a as a second interconnect row (only CUF coverage reported for them); Ni spacer bumps entered as ic_type other. Die shear unit kept as printed (MPa axis labelled "Die shear force"). Daisy-chain (~46 ohm per 300 bumps) and Kelvin (~29 mohm) read from log-axis CDFs; the lowest ~15% of chains sit at 3-25 ohm (unexplained, noted). Neighbour-die peak temperature: text 140 C vs plotted ~145 C, plot entered (conflict logged).
- Not reported: bump diameters, die thicknesses, landing wafer/die size, passivation thickness/composition, reliability standards and sample counts, EM results.

## ectc51687.2025.00047 (TSMC CoWoS-R 1.4/1.4 um RDL, 3 um via)
- Figures opened: page_02-05 renders; candidates p03_fig6, p03_fig8, p04_tablei, p04_fig9, p04_fig10, p05_fig12; re-crops of Fig. 9 and Fig. 10.
- Key figures: f01 Fig. 6 stack_schematic (candidate p03_fig6); f02 Fig. 9 top_view_layout (manual); f03 Fig. 10 electrical_plot (manual); f04 Fig. 12 stack_schematic (candidate p05_fig12); f05 Fig. 8 electrical_plot (candidate p03_fig8); f06 Table I data_table (candidate p04_tablei).
- TVs: a = 5.5x TV POR (2/2 um, via 8/11 um); b = 5.5x TV KY process (1.4/1.4 um, via 3 um); c = SPICE calibration test structures; d = HBM 6.5 mm channel eye-width study; e = routing/layer-count design study (simulation_model).
- Judgment calls: POR and KY split into two TVs (different RDL stack); interposer x/y = stated "CoW size" 66x68 mm; SBT 97.3x95 (text) chosen over 97x95 (Fig. 9). TV d tv_kind other with basis unspecified because the paper does not say whether eye diagrams are simulated or measured; 2 electrical_interfaces rows (HBM3, 8 and 10 Gbps, 6.5 mm) with eye widths in metrics. CoW joint yield 99.5% is mass-production experience, entered as author_estimate (le) on TV a. has_process_flow = no: KY process content and flow are not described.
- Most numbers are design targets or author estimates (Table I, Fig. 5, Fig. 6). Measured: RWAT 98.1%, resistance ratios 1.37x/1.44x (no absolute axis).
- Not reported: thicknesses, dielectric product/Dk, absolute R/C values, microbump details, warpage values, reliability (ongoing).

## ectc51909.2023.00268 (Samsung PLP RDL scaling and stitching)
- Figures opened: page_02-05 renders; candidates p03_fig5, p03_fig6, p03_fig7, p04_fig8, p04_fig10, p05_fig11 (Fig. 9 on page render).
- Key figures: f01 Figure 10 cross_section (candidate p04_fig10); f02 Figure 5 stack_schematic (candidate p03_fig5); f03 Figure 7 cross_section (candidate p03_fig7); f04 Figure 8 data_table (candidate p04_fig8); f05 Figure 6 other/DoF plot (candidate p03_fig6); f06 Figure 11 micrograph (candidate p05_fig11).
- TVs: a = 2.xD product design (1 AP + 1 HBM) RDL layer 1 at 1.5/1.5 um on 415x510 mm panel (3 panels as variants); b = process-window samples (L/S 0.9-1.5 um, NA split as variant); c = 2/2 um stitching pattern.
- Judgment calls: full SAP flow (8 steps) written for TV a; b and c carry only their split exposure step plus a note. Seed etch category etch_other (wet/dry not stated); seed deposition deposition_other (method not stated). 13 um appears as Fig. 9(a) "via depth" label and as text "Cu pad undulation"; entered as interconnect depth and as a metric (conflict logged). Fig. 6 DoF values read at 1.5 um resolution and limit-resolution curve starts (approx).
- primary_bucket kept panel; buckets panel;organic_rdl_fanout.
- Not reported: dielectric material/thickness, Cu thickness, via diameter, RDL layer count, die/package sizes, stepper model, CAR product, dose, stitching overlay error.

## Notes
- Candidate quality: 16 of 18 chosen figures used candidate crops as-is; 2 manual (00047 Fig. 9 and Fig. 10, both clipped at the bottom).
- No source problems (all clean text layers, correct papers, complete).
