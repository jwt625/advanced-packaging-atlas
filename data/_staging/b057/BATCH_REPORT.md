# Batch b057 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b057` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| eptc62800.2024.10909872 | distilled | 4 | 7 | 10 | 2 | 7 | 2 | 0 | 19 | 6 | yes |
| ectc51529.2024.00258 | distilled | 1 | 2 | 6 | 1 | 15 | 0 | 0 | 17 | 6 | yes |
| ectc51687.2025.00055 | distilled | 8 | 16 | 15 | 4 | 0 | 0 | 0 | 80 | 6 | no |

## eptc62800.2024.10909872 (Samsung panel-level 6-layer RDL interposer, I-Cube R)
- Figures opened: page_01-04 renders; 400 dpi re-crops of Fig. 2, 4, 6, 7; re-crops of Fig. 1, 2, 3, 7 for bboxes; candidates p01_fig1, p02_fig2, p02_fig3, p02_fig4, p03_fig5, p03_table1, p04_fig7.
- Key figures: f01 Fig. 4 cross_section (candidate p02_fig4); f02 Fig. 2 process_flow (manual, candidate clipped C4 bumps); f03 Fig. 1 top_view_layout (manual, candidate cut bottom chiplet); f04 Fig. 3 other/box plot (manual, candidate had body text); f05 Fig. 5 other/histogram (candidate p03_fig5); f06 Fig. 7 package_photo (manual; panels on p.3, candidate p04_fig7 was caption only).
- TVs: a = full panel-level TV (12 HBM + 2 logic + 2 chiplets, 4.3x reticle, through CoP; C4 planned, entered as process step performed=no); b = short-loop RDL panel for warpage; c = UBM DOE coupons (Leg1-6 as metrics.variant, leg structures undisclosed); d = simulation of carrier types A-D (Table 1, relative %).
- Judgment calls: interposer 51x68 mm taken from the Sec. 1 statement "4.3x reticle size (51x68mm2) based on 12xHBM", matching the TV; 415x510 mm panel not assigned (cost comparison only). HBM3 and "UCIe x32" PHY wiring entered as electrical_interfaces (protocol named; L/S 2/2 um, reach <= 5 mm design); UCIe as `other` since S/A not stated. Carrier removal step from Fig. 2 schematic only. Fig. 3 leg means for Legs 2-6 read approx from the plot; Leg1 0.5 um from text.
- Not reported: RDL metal/dielectric products and thicknesses, via sizes, bump type/pitch, mold compound, carrier properties, electrical/reliability data, sample counts.

## ectc51529.2024.00258 (A*STAR IME nano-TSV, 75 nm SOI)
- Figures opened: page_02-05 renders; 400 dpi re-crops of Fig. 3, 4, 7, 11, 12-17; candidates p02_fig2, p02_fig3, p03_fig4, p03_fig8, p05_fig14, p05_fig17.
- Key figures (all candidate): f01 Fig. 3 cross_section; f02 Fig. 2 process_flow (crop carries a fragment of the Fig. 3 caption); f03 Fig. 4 warpage_plot; f04 Fig. 8 top_view_layout; f05 Fig. 14 reliability_plot; f06 Fig. 17 reliability_plot.
- TV: one wafer-level build (12-inch SOI, fusion-bonded to Si carrier); daisy chain, parallel chain and leakage patterns are test structures on the same stack (metrics.variant).
- Process flow: 15 steps from Sec. II text and Fig. 2 Step 1-6 labels. Backside passivation material, oxide planarization method and BS Al method not stated (left open).
- Metrics: wafer warpage per process step (Fig. 4, sign convention not stated); single-TSV and parallel-chain I-V at 1 mA; single-structure R = V/I (derived, includes Al lines); leakage at 3 V; reliability T0/T1 per stress as T1 max with ranges in value_text (TC -40/125 C 60 cycles, HTS 60 h, uHAST 130 C/85% RH/48 h). HTS chain resistance and uHAST leakage marked `partial` (one HTS outlier about 277 ohm; uHAST leakage T1 slightly higher), others `pass` per authors' "comparable".
- Conflicts: text "warpage well controlled (< -100 um)" vs plot extreme about -82 um; text cites Fig 6 for single-TSV I-V but caption is Fig 7 (no Fig. 6 in paper); intro numbers stresses (1),(3),(4).
- Not reported: TSV pitch/count, metal and passivation thicknesses, de-embedded TSV resistance, leakage bias in reliability plots, JEDEC compliance (authors state conditions are not full JEDEC).

## ectc51687.2025.00055 (TSMC SoIC Cool-Stacking)
- Figures opened: page_02-04 renders; candidates p01_fig1, p02_fig2, p02_fig4, p03_tablei, p03_fig5, p04_fig6 (all used as-is).
- Key figures (all candidate): f01 Fig. 1 stack_schematic; f02 Fig. 5 stack_schematic; f03 Fig. 2 electrical_plot; f04 Fig. 4 thermal_plot; f05 Table I data_table; f06 Fig. 6 simulation_result.
- TVs: a daisy-chain die stack (>10k F2B SoIC-CS joints, normalized chain R only); b RTV and c CTV thermal coupons (27x27 mm, 5 laminate layers, on 300-mm wafers; ASTM D5470, n=10: 24.295 +/- 0.140 vs 23.533 +/- 0.169 C-mm2/W); d/e/f simulation models for micro-bump / SoIC / SoIC-CS (Tables I/II, all normalized to SoIC); g/h CoWoS case-study models (lidded/lidless, 2 GPU + 8 HBM).
- Judgment calls: case-study HBM height (8/12/16-hi) and bonding scheme kept as metrics.variant on the lidded/lidless TVs instead of 18 simulation TVs; only the printed bar labels of Fig. 6 entered (48 values); missing bars (no viable Compute power) not entered. Bonding interconnect entered as cu_cu_hybrid (Cu array + dielectric/C-Layer described for RTV/CTV; "hybrid" not used verbatim). Table II relative R/C/BW/EE/EEP kept as metrics, not electrical_interfaces (no protocol or absolute value). has_process_flow = no: no fabrication or bonding steps described.
- Conflict: abstract "37% lower than SoIC" vs Table I/Sec. II.B 0.36X (64% lower); Table I entered.
- Not reported: bond pitch, C-Layer material/thickness ("microns-thick"), die sizes, TSV dimensions, bonding conditions, absolute chain resistance and yield.

## Key-figure notes
- 18 key figures: 14 candidate as-is, 4 manual (all in eptc62800: clipped Fig. 1/2, body-text sliver Fig. 3, Fig. 7 split across pages).
- figure_kind has no box-plot/histogram/geometry-plot kind; Fig. 3 and Fig. 5 of eptc62800 used `other`.
