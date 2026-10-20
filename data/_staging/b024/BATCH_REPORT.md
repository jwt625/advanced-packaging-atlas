# Batch b024 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b024` -> `0 errors, 0 warnings (data/_staging/b024)`.

| paper_id | status | papers | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| vlsitechnologyandcir46783.2024.10631441 | distilled | 1 | 2 | 0 | 14 | 2 | 40 | 0 | 0 | 28 | 6 | yes |
| ectc51846.2026.00389 | distilled | 1 | 2 | 2 | 16 | 2 | 22 | 0 | 0 | 60 | 6 | yes |
| ectc51687.2025.00284 | distilled | 1 | 2 | 4 | 6 | 0 | 4 | 0 | 6 | 14 | 6 | yes |

## vlsitechnologyandcir46783.2024.10631441 (imec, BSPDN slit nTSV, VLSI 2024)
- Source: 2 pages. p.1 PDF text layer is font-shifted and its OCR-like copy drops digits; every p.1 number re-read from 220 dpi page-render crops. p.2 is all figures, read at 300-500 dpi.
- Figures opened: page_01 (two column crops), page_02 grid and re-crops of Fig. 1-10; candidates p02_fig2 (cut on the left), p02_fig3 / p02_fig7 / p02_fig5 bboxes checked against the grid (they merge neighbours).
- Key figures (all manual): f01 Fig. 3 cross_section; f02 Fig. 2 process_flow; f03 Fig. 1 top_view_layout; f04 Fig. 9 electrical_plot; f05 Fig. 7 cross_section; f06 Fig. 6 other (TTV plot).
- TVs: a = TiN/W-filled BPR + FS slit nTSV + Cu BSM1 (wafers D, D*, E, F); b = barrier-free Mo fill (wafers A, B, C). TiN thickness (2.5/5 nm), CD (36/28 nm) and ESL (20/10 nm) are splits in metrics.variant.
- Judgment calls: package_class other, tv_kind wafer_level (follows merged BSPDN rows of ectc51906.2022.00244). Fig. 9 medians read off box plots (+/-2 ohm/um, +/-0.2 ohm, chain +/-1.5 ohm/link on log axis). Overlay (70 nm max, 100 nm margin) entered on TV a and as interconnect alignment on both, since the paper does not split it by fill. Fig. 6 TTV wafers' fill metal unstated (on TV a). Fig. 10 simulation kept qualitative. Same 20-step flow written for both TVs (fill metal differs).
- Conflict: BPR CD "below 36 nm" (text) vs 36 nm (Fig. 9 caption) vs 28/30 nm TEM labels; 36 nm design entered, alternatives logged.
- Not reported: wafer size, nTSV depth, remaining device Si thickness, BSM1 dimensions, carrier bond method, deposition methods, sample counts.

## ectc51846.2026.00389 (Penn State / Georgia Tech / Ajinomoto, ABF Type-A to 220 GHz, ECTC 2026)
- Figures opened: page_03 and page_05 grids and re-crops (Fig. 3, Table II); candidates p02_fig1, p02_fig2, p03_fig3, p04_fig4, p04_fig6, p04_fig7, p05_tablei, p05_fig9.
- Key figures: f01 Fig. 3 package_photo (manual); f02 Fig. 2 top_view_layout (candidate p02_fig2); f03 Table I data_table (candidate p05_tablei); f04 Table II data_table (manual, no candidate); f05 Fig. 6 electrical_plot (candidate p04_fig6); f06 Fig. 9 electrical_plot (candidate p05_fig9).
- TVs: a = MRR coupon (ABF 72.5 um, HFSS design value) and b = microstrip-line coupon (ABF 30 um, ~34 um wide 70 ohm lines); both on 200 um AGC EN-1 glass with 15 um ABF buffer both sides, SAP Cu. Split because the paper gives different ABF thicknesses.
- Judgment calls: insertion loss is dB/mm per frequency/temperature, entered as metrics (electrical), not electrical_interfaces (no protocol, no dB field per length). Table I 36 Dk/Df values entered per frequency x temperature. Both tables are printed "TABLE I"; the insertion-loss one is labelled Table II as cited in the text. RMS roughness 190 nm put in properties (roughness column is Ra). buckets advanced_substrate;glass; package_class glass_core_substrate for the coupons (inferred).
- Not reported: panel size, ring radii and gap values, microvia dimensions, cure/lamination conditions.

## ectc51687.2025.00284 (TSMC, BOE with COUPE/COI/iFAU, ECTC 2025)
- Figures opened: page_02-04 grids; candidates p02_fig1, p02_fig2, p02_fig3, p03_fig4-7, p04_fig8-10; re-crops of Fig. 4, 5, 6, 8.
- Key figures: f01 Fig. 3 package_photo (candidate p02_fig3); f02 Fig. 2 stack_schematic (candidate p02_fig2); f03 Fig. 4 optical_plot (manual); f04 Fig. 8 optical_plot (manual); f05 Fig. 6 optical_plot (manual); f06 Fig. 5 optical_plot (manual).
- TVs: a = BOE module (40-fiber iFAU, 127 um pitch, on COI, on COUPE-like; Parts 1-3), sub_assembly / cpo_module; b = COUPE-like wafer-level structures on a 300 mm wafer (Part 4, 18 samples, 216 points at 1310 nm; Part 5 SiN/Si tip transitions), package_class photonic_interposer (inferred).
- Judgment calls: has_process_flow = yes on thin evidence (module fabrication, two ordered active-alignment attach steps, test). Part 5 losses (0.009, 0.013 dB) basis unspecified (measured vs simulated not stated). Dashed "Intrinsic"/"Optimization" lines entered as unspecified-basis metrics; 2 dB total system loss and 0.3 dB no-variation Rx loss as author_estimate. ML weighting pies entered as derived value_text rows. Optical glue taken from the Fig. 3(b) photo label.
- Source oddities: text says 40 channels but names an outer pair "1-42"; Fig. 4 plots 10 "Sample#" points while text averages the 40-fiber array (text average used, logged).
- Not reported: module dimensions, materials beyond SiN WGs, micro-lens material, glue product, alignment accuracy, Part-4 average.

## Candidate quality (18 key figures)
- 7 candidate as-is (00389 Fig. 2, Table I, Fig. 6, Fig. 9; 00284 Fig. 3, Fig. 2; none for the VLSI paper), 11 manual.
- VLSI p.2 (dense figure page): candidates span quadrants and merge figures; no candidates for Fig. 1, 4, 6, 8, 9, 10.
- 00284: plot candidates consistently cut the x-axis title; 00389: second table (misnumbered TABLE I) has no candidate, Fig. 3 candidate cuts the (b) label.
