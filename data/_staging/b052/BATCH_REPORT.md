# Batch b052 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b052` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51687.2025.00049 | distilled | 4 | 16 | 32 | 9 | 20 | 0 | 0 | 37 | 6 | yes |
| eptc59621.2023.10457912 | distilled | 1 | 0 | 6 | 1 | 9 | 0 | 0 | 18 | 6 | yes |
| ectc51906.2022.00053 | distilled | 1 | 6 | 9 | 2 | 19 | 0 | 0 | 19 | 6 | yes |

## ectc51687.2025.00049 (Sherbrooke/IBM, self-aligned TSV-type Si bridge, DBHi bridge-first)
- Figures opened: page_02-07 renders; 300-400 dpi re-crops of Fig. 2, 3, 6(e-f), 13, 15(c), 17, 17(c), 18(d), 19(e); candidates p02_fig1, p02_fig2, p02_fig3, p05_fig10, p05_fig13, p05_tableii, p06_fig17.
- Key figures: f01 Fig. 10 cross_section (candidate p05_fig10); f02 Fig. 1 stack_schematic (candidate p02_fig1); f03 Fig. 2 process_flow (manual); f04 Fig. 3 micrograph (manual); f05 Table II data_table (candidate p05_tableii); f06 Fig. 17 simulation_result (manual).
- TVs: a = corner-pillar bridge on Si substrate (1-4 pillars per corner, 100 um, square/round); b = full staggered matrix (80 um, 150 um pitch) offset DoE; c = FEM two-sided bonding bridge DBHi module; d = FEM single-sided reference. a/b package_class `other` (bridge on Si substrate coupon, not organic); c/d `si_bridge_organic`.
- Judgment calls: pillar count/shape variants within a kept in one TV (only 'all below 2 um' reported, no per-variant data). Process flow (Fig. 2, 13 steps + substrate SAP + Fig. 4 assembly) on a; b carries the 3 assembly steps with offset split. FEM relative bars read off plots (+/-0.02) and entered on c (two-sided) and d (single-sided), reference_tv_id d. Table I Surface Evolver forces entered as simulated metrics on a. Fig. 13 225 um bridge top height entered as measured (profile plateau).
- Not reported: all die/bridge/substrate dimensions, reflow profile, tacking agent, CR200/TiW/seed thickness, n for corner-pillar tests, absolute FEM values, reliability (future work).
- Conflict: Fig. 6(f) labels the layer under the bridge 'C4/underfill'; text defines it as underfill (single-sided) or underfill+solder composite (two-sided). Text used.

## eptc59621.2023.10457912 (A*STAR IME, 6x55 um TSV Cu electroplating voids)
- OCR text (TEXT_LAYER_WARNING.md): every number checked against page renders. candidates.json empty -> all figures manual.
- Figures opened: page_01-04 renders; 300 dpi crops of Fig. 1-7; 600 dpi crop of Fig. 5(b) label.
- Key figures: f01 Fig. 1 cross_section (manual); f02 Fig. 2 cross_section (manual); f03 Fig. 3 cross_section (manual); f04 Fig. 5 cross_section (manual); f05 Fig. 6 cross_section (manual); f06 Fig. 7 micrograph (manual).
- TV: single wafer-level TV (300 mm, via-middle, pattern density <1%); package_class `other` (TSV process wafer). All plating splits (80/100/125/150% POR, DC vs pulse, duty 50/20/12.5%) and anneal 300/350/400 C as metrics.variant.
- Judgment calls: nominal 6x55 um kept in interconnects; FIB-SEM POR CD/depth (5.423/5.207/58.27 um) entered as geometry metrics. Void length 25.86 um (Fig. 5(b) label) chosen over text '~26 um'. Process-duration changes (+10%, -30%) as throughput metrics.
- Not reported: absolute current densities, times, pulse frequency, electrolyte product, liner/barrier/seed thickness, sample counts, electrical/reliability data.

## ectc51906.2022.00053 (Tokyo Tech/Murata/DISCO/ITRI, functional interposer with embedded multi-terminal Si capacitor)
- OCR text (TEXT_LAYER_WARNING.md): numbers checked against renders. candidates.json empty -> all figures manual.
- Figures opened: page_01-05 renders; 300 dpi crops of Fig. 1, 3, 4, 7, 8, 9, Table 1.
- Key figures: f01 Fig. 8 cross_section (manual); f02 Fig. 4 process_flow (manual); f03 Fig. 7 warpage_plot (manual); f04 Fig. 9 electrical_plot (manual); f05 Table 1 data_table (manual); f06 Fig. 3 micrograph (manual).
- TV: one wafer-level TV (300 mm Si base wafer thinned to 20 um, capacitor 3.07x2.07x0.1 mm with 77 Cu pads, 5 um CYCLOTENE 3022-46, epoxy mold, 775 um carrier). package_class `si_interposer_2p5d`; primary_bucket thermal_pdn kept.
- Judgment calls: capacitor C/ESR/SRF/ESL entered as power_delivery metrics (no D2D interface -> electrical_interfaces empty). Capacitance unit kept as printed (pF). Warpage: only measured values (black labels, a/c/f/h) entered; red N/A values excluded. Cure profile only normalized (temperature 0.4/0.6/1.0, pressure log-normalized) -> conditions text. Carrier debond and singulation (Fig. 4 j-k) entered with note that they are process design, not stated as performed (testing done on carrier).
- Conflicts: TSV interconnect length 20 um (abstract) vs 25 um (conclusion; Fig. 8 20 + 5 um) -> 25. Text typo 'ESR of GSGx4 1/4 of GSGx4' -> Table 1.
- Not reported: interposer size, capacitors per interposer, TSV pitch, RDL material/L/S, absolute cure conditions, die-shift units, reliability.

## Key-figure notes
- 18 figures chosen: 4 candidate (00049 Fig. 1, Fig. 10, Table II; none for the two OCR papers), 14 manual.
- 00049: candidates for Fig. 2, 3, 13, 17 clip the bottom labels/axis; Fig. 10 candidate has blank margin but holds the whole figure.
- Both OCR papers have empty candidates.json; bboxes read from 150 dpi renders and confirmed on 300 dpi re-crops.
