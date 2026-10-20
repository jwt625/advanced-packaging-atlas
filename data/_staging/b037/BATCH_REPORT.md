# Batch b037 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b037` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51909.2023.00135 | distilled | 3 | 26 | 21 | 12 | 0 | 0 | 0 | 41 | 6 | no |
| ectc51687.2025.00187 | distilled | 4 | 38 | 44 | 0 | 12 | 0 | 0 | 44 | 6 | yes |
| ectc51529.2024.00265 | distilled | 4 | 24 | 44 | 8 | 76 | 0 | 0 | 53 | 6 | yes |

## ectc51909.2023.00135 (MediaTek, 2.5D CoWoS MCM, 85 mm)
- Figures opened: page_01-05 renders; 300 dpi re-crops of Fig. 8, 9, 10; candidates p01_fig1, p02_fig3, p02_fig4, p03_fig7, p04_fig10, p04_tableii.
- Key figures: f01 Fig. 1 stack_schematic (candidate p01_fig1); f02 Fig. 3 top_view_layout (candidate p02_fig3); f03 Fig. 4 warpage_plot (candidate p02_fig4); f04 Table II data_table (candidate p04_tableii); f05 Fig. 7 cross_section (candidate p03_fig7); f06 Fig. 10 simulation_result (candidate p04_fig10).
- TVs: a = TV1 (2 interposers x SoC + 4 HBM2E, 100 um interposer); b = TV2 (SoC + 2 HBM + 2 dummy per interposer, 100 um); c = optimized TV2 (50 um interposer, increased C4 height; value not stated). Table II treats it as a separate build.
- has_process_flow = no: only the finished stack (Fig. 1) and results. process_steps empty and listed in not_reported.
- Judgment calls: Fig. 4 warpage basis = unspecified (the paper does not say whether it was measured; FEA is introduced later in the paper). Sign convention is from the Fig. 4 legend: BGA side up, - convex, + concave. The Fig. 7 bump heights (65/85 um, measured) are attached to TV2. The failing unit matches the TV2 TC failure; the TV of the passing unit is not stated (noted). FEA normalized corner stress was read from bars (+/-0.01).
- Text gives TV2 failing after TCG 200 cycles, while Table II gives Fail at TCG 1000. Both are entered as separate rows (logged).
- Not reported: interposer mm size, TSV/microbump/C4 dimensions beyond pitch, substrate layers, stiffener size, sample counts, warpage method.

## ectc51687.2025.00187 (Intel, TIM1 silicone + liquid metal on FO-EB)
- Figures opened: page_02-06 renders; 400 dpi re-crops of Fig. 2, Fig. 3, Table I, Fig. 8, Fig. 9(a), Fig. 9(b); manual re-crops of Fig. 10 and Fig. 14; candidates p02_fig2, p05_fig10, p05_fig11, p05_fig12, p06_fig14a, p04_fig9a.
- Key figures: f01 Fig. 2 stack_schematic (manual); f02 Fig. 10 process_flow (manual); f03 Fig. 11 cross_section (candidate p05_fig11); f04 Fig. 14 cross_section (manual); f05 Fig. 12 xray_csam (candidate p05_fig12); f06 Fig. 9 simulation_result (candidate p04_fig9a).
- TVs: a = hybrid TIM1 (silicone-LM center + adhesive PTIM periphery) with dam (built, and the "optimized" FEA structure); b = LM-only TIM1 (built); c = POR PTIM and d = indium STIM (simulation_model, FEA only). Same FO-EB package (4 ASIC 31x12 mm, 3 bridges 2.36x6.36 mm, 50x32 mm module, 75 mm 8-2-8 substrate, 74x74x1 mm forged lid).
- has_process_flow = yes: the 4-step lid attach flow (Fig. 10) is entered as 6 steps on a and b. On b the dam step has performed = no. No conditions are given; SPIL process execution is from the acknowledgment.
- Judgment calls: The Fig. 9(a) orange bars and the HT square are labelled "Moire warp" in the legend, but the text calls Fig. 9(a) simulation results. These are entered with basis unspecified and logged as a conflict. Fig. 9(b) has unlabelled bars (POR ~117, STIM ~297-298 MPa) and a REF point (~152 MPa), read from pixels with the approx qualifier. Coverage design values from Table I are entered on a. The thermal-simulation criteria (BLT/coverage targets) are entered as simulated metrics with ge/le qualifiers. primary_bucket kept as thermal_pdn; buckets extended with si_bridge and organic_rdl_fanout (FO-EB module).
- Conflicts logged: the text gives periphery BLT as "within 50-60 um", but position 3 reads 61.7 um. The text says the optimized structure meets the RT warpage spec, but the simulated BLT 80 um case is 262 um against a 250 um spec. Table I module dimensions have no units.
- Excluded: Introduction TIM conductivity/resistance ranges, the 3 W/mm2 hotspot claim, the Fig. 4(b) 88 C contour (TIM case not stated), and Fig. 6 Tj in a.u.
- Not reported: all interconnect geometry, lid/TIM/adhesive products, cure conditions, HT temperature, warpage sign convention. Reliability and TTV measurements are stated as future work.

## ectc51529.2024.00265 (Resonac, GFRP core materials for 100 mm FCBGA)
- Figures opened: page_02-05 renders; 300 dpi re-crops of Fig. 3, 4, 6, 7; manual re-crops of Fig. 5(a) (two iterations); candidates p02_tablei, p03_tableii, p04_fig3, p05_fig6, p05_fig7.
- Key figures: f01 Fig. 5(a) package_photo (manual); f02 Table I data_table (candidate p02_tablei); f03 Fig. 3 process_flow (candidate p04_fig3); f04 Table II data_table (candidate p03_tableii); f05 Fig. 7 warpage_plot (candidate p05_fig7); f06 Fig. 6 warpage_plot (candidate p05_fig6).
- TVs: one per core material A-D (distinct core laminate: CTE 10.6/7.4/6.6/5.5 ppm/K, measured Tg/E from Table II). Judgment call: the following are recorded in metrics.variant, not as new TVs: Cu remaining ratio (100%/75%), stiffener thickness/width (1.0/2.5 mm; 12/16/20 mm), and adhesive thickness (70/100/150/300 um). The components and layers describe the BLR build (75% Cu, 2.5x16 mm stiffener, 150 um adhesive).
- has_process_flow = yes: Fig. 3 flow (19 steps incl. TC test) is replicated on each TV. Conditions are only those stated (water-soluble flux, SAC305 0.6 mm balls, 0.25 mm Si spacers, no paste on corner pads, TC -55/+125 C at 2 cycles/h).
- Judgment calls: Fig. 4/6/7 values were read by color-pixel marker centers against detected gridlines (+/-10-20 um, approx qualifier). For Fig. 7, the after-CUF ranges and the after-stiffener values are entered per sign group (value_text). The Fig. 9 Weibull x-axis has no cycle values, so only the relative ordering is entered (A longest, C shortest, B ~ D per text). The sign convention comes from the plot insets (+ = convex dome). The solder-bridge observation (Fig. 8) is entered once on a (the core is not stated).
- Not reported: build-up/SR/CUF products, layer thicknesses, L/S, via sizes, reflow/cure profiles, cycles to failure, sample counts. The stiffener configuration for the Fig. 4 and Fig. 7 series is also not stated.

## Key-figure notes
- 18 figures chosen. 13 are candidate crops; 5 needed a manual bbox (00187: Fig. 2, 10, 14; 00265: Fig. 5(a); none in 00135).
- Candidate issues: 00187 p02_fig2 and p06_fig14a include a line of body text at the top, and p05_fig10 clips the bottom of steps 3-4. 00265 p04_fig5 merges the photo and two plots (the panel (a) photo was cropped manually). Table candidates start below the table title (acceptable, as in b020).

## Schema gaps
- No field for warpage-measurement method or sample count per marker group. The Fig. 7 per-sample scatter needed value_text ranges, because metrics has no value_min/value_max.
- TIM1 coverage (%) has no natural metric_category; entered as thermal (measured SAM) and geometry (design Table I).
- No TV-level field for lid/stiffener ring footprint or stiffener width. It is carried in notes.
