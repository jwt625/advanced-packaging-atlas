# Batch b040 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b040` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51846.2026.00050 | distilled | 10 | 18 | 5 | 6 | 13 | 0 | 1 | 22 | 6 | yes |
| ectc51529.2024.00155 | distilled | 8 | 40 | 48 | 13 | 31 | 0 | 0 | 58 | 6 | yes |
| ectc51687.2025.00028 | distilled | 3 | 16 | 8 | 2 | 26 | 0 | 0 | 9 | 6 | yes |

## ectc51846.2026.00050 (IBM DBrM die-edge glued Si bridge)
- Figures opened: page_02-05 renders; 400 dpi re-crops of Fig. 5(b), 11, 12(a), 13, 14, 16; candidates p02_fig1, p03_fig5, p04_fig11, p04_fig13, p04_fig14.
- Key figures: f01 Fig. 13 cross_section (candidate p04_fig13); f02 Fig. 1 process_flow (candidate p02_fig1); f03 Fig. 12(a) package_photo (manual); f04 Fig. 14 cross_section (candidate p04_fig14); f05 Fig. 11 cross_section (candidate p04_fig11); f06 Fig. 5 mechanical_plot (candidate p03_fig5).
- TVs: a dual-chip 30 um-pitch reliability module; b DBrM and c DBHi dual-chip builds with 75 um-pitch bridge bumps (Fig. 11); d bending sub-assembly; e TSV-bridge dual-side solder-bump assembly (no TSV); f/g PDN simulation models (non-TSV / TSV bridge); h quad-chip package; i gluing coupons (25-450 um clearance, Si and mold-resin edges); j PWG-integrated concept (tv_kind other, cpo_module).
- Judgment calls: DBHi built and measured here as reference (TV c); DBHi sub-assembly bending 0.2 N kept as a stage variant on c. Release-from-fixture step taken from Fig. 17 (same flow with PWG), noted. Die-to-substrate interconnect = cu_pillar (Fig. 12(a), abstract) although Sec. II.A says C4. TC Condition G recorded as written (standard not named). Bending peaks and Fig. 16 voltages read off plots (approx). buckets extended with cpo (PWG concept).
- Not reported: bump metallurgy/dimensions beyond pitch, bonding conditions, glue/underfill products, chip function/thickness, substrate layers, TC sample count, any electrical-interface numbers.

## ectc51529.2024.00155 (JOINT2/Resonac 120 mm 2.5D)
- Figures opened: page_02-07 renders; 400-450 dpi re-crops of Fig. 7, 8, 11, 12, 13 labels, 15; candidates p02_fig1, p02_fig2, p02_tablei, p02_tableii, p06_fig13.
- Key figures: f01 Fig. 1 stack_schematic (candidate p02_fig1); f02 Fig. 2 process_flow (candidate p02_fig2); f03 Table II data_table (candidate p02_tableii); f04 Table I data_table (manual); f05 Fig. 13 warpage_plot (candidate p06_fig13); f06 Fig. 15 xray_csam (manual).
- TVs: a-d = TV1-TV4 of Table VI (substrate A/B x stiffener 28x30 / 34x36 mm); e = Substrate A with Cu stiffener (Fig. 11); f = LCMUF-molded interposer sub-assembly (failed to bond); g/h = FEM models with 23x25 mm stiffener (Substrate A/B).
- Judgment calls: CUF+EMC interposer-module metrics (Fig. 7 wafer warpage, Fig. 8) and bare Substrate A warpage put on TV1 as stage variants (module common to TV1-4); bare Substrate B on TV3. Fig. 12 simulated values for built stiffener sizes attached to TVs a-d (basis simulated). Full 27-step flow written once on TV a (TV b-d share it); LCMUF route on f. Table V CUF methods as metric variants. Warpage sign: + convex / - concave per plot icons. Interposer-backside bumps called "Cu and SnAg bumps"; entered as cu_pillar with note. Table IV material properties entered in stack_layers.properties/component notes (simulation inputs).
- Source issues: Table III (molding conditions) is referenced but absent; text swaps Table I/II labels (caption labels used); "SUS404" once vs SUS430 (typo); Fig. 8 LCMUF positive at RT vs text "concave" (logged). TSV not mentioned although backside bumps exist.

## ectc51687.2025.00028 (Samsung DASC/SSSC embedded Si capacitors)
- Figures opened: page_02-05 renders; 400 dpi re-crops of Fig. 8, 9; candidates p02_fig3, p03_fig5, p04_fig6, p04_fig7, p04_tablei, p05_fig9.
- Key figures: f01 Fig. 7 stack_schematic (candidate p04_fig7); f02 Fig. 6 process_flow (candidate p04_fig6); f03 Fig. 5 process_flow (manual); f04 Fig. 3 process_flow (candidate p02_fig3); f05 Table I data_table (candidate p04_tablei); f06 Fig. 9 electrical_plot (candidate p05_fig9).
- TVs: 3 simulation_model TVs (Si-cap DSC, DASC eCAP, 8-stack SSSC eCAP) on an over-1 mm-core FC-BGA with automotive SoC. No fabricated sample.
- Judgment calls: has_process_flow = yes because the paper gives discrete, ordered (proposed) fabrication steps a1-a3, b1-b5, c1-c6; steps entered as stated concept, performed left blank. Fig. 9 axis says "voltage drop improvement" with DSC highest, contradicting the text (SSSC best); values entered as plotted and conflict logged. Fig. 8 has no numeric axes (value_text only). primary_bucket thermal_pdn kept.
- Not reported: all package/die dimensions, exact core thickness, Cu bump pitch/diameter, DAF/dummy thickness, ESL/ESR, impedance magnitudes, any measurement.

## Candidate quality
- 18 figures chosen: 14 candidate, 4 manual. Manual reasons: p04_fig12a (00050) contains the C-SAM panels (b),(c), not the photo (a); p02_tablei (00155) cut header row; p07_fig15 (00155) held only (e),(f); p03_fig5 (00028) clipped bottom of b5.
