# Batch b035 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b035` -> `0 errors, 0 warnings (data/_staging/b035)`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51846.2026.00199 | distilled | 3 | 4 | 18 | 6 | 18 | 1 | 0 | 25 | 6 | yes |
| ectc51909.2023.00008 | distilled | 1 | 1 | 3 | 1 | 7 | 0 | 0 | 9 | 6 | yes |
| ectc51909.2023.00153 | distilled | 5 | 16 | 45 | 5 | 49 | 0 | 0 | 20 | 6 | yes |

## ectc51846.2026.00199 (Georgia Tech, 200x200 mm glass substrate)
- Figures opened: page_02-07 renders; re-crops Fig. 1, 2, 5 (500 dpi), 8 (300 dpi), 9(a)/(b) (600 dpi), 12(a) (600 dpi);
  candidates p04_fig3, p04_fig5, p05_fig6, p05_fig8, p05_fig9, p07_fig14.
- Key figures: f01 Fig. 5 stack_schematic (candidate); f02 Fig. 3 package_photo (candidate); f03 Fig. 9 other (candidate);
  f04 Fig. 8 electrical_plot (candidate); f05 Fig. 14 simulation_result (candidate); f06 Fig. 6 micrograph (candidate).
- TVs: a = fabricated 200x200 mm, 1 mm glass panel, ABF GL102 2-metal-layer SAP, 64 coupons (panel_level);
  b = UCIe-S 3.0 x8 10 mm channel model (simulation_model; TCu 10 um vs 5 um plated target, so separate TV);
  c = ASTRA-sim system model, 18 B200 GPU + 72 HBM on 200x200 mm glass (simulation_model).
- Judgment calls: open/short yield counted from the Fig. 8 pass/fail maps (46/64 open pass, 29/64 short pass);
  yield % entered as derived. Fig. 9 min/max thickness and width read from cell labels; 16 SHORTED cells counted.
  The paper does not say whether DC test structures and UCIe routing are on M1 or M2: the L/S feature rows are on the M1 seq
  with a "layer not stated" note. Second back-side ABF only in Fig. 5 schematic (source schematic). UCIe simulated values
  are on TV b with geometry overrides as design_target; channel_type organic_rdl per rule (i).
- Conflicts logged: text width 5-8 um vs Fig. 9(b) max 9.09 um; "saving up to 13 days" vs Sec. II.C wording; sim TCu 10 vs
  plating target 5 um.
- Not reported: microvia depth/pitch, daisy-chain resistance (chains open), pad sizes, ABF cure, warpage, reliability,
  measured AC data, any die assembly.
- primary_bucket glass kept; buckets extended with panel (200x200 mm panel processing).

## ectc51909.2023.00008 (TSMC, 0.4 um pitch W2W SoIC)
- Figures opened: page_02-04 renders; re-crops Fig. 7 (300 dpi) and Table 1; candidates p03_fig3, p03_fig4, p03_fig5,
  p04_fig6, p04_fig7, p02_table1 (cut).
- Key figures: f01 Fig. 4 xray_csam (candidate); f02 Fig. 5 other (candidate); f03 Fig. 6 electrical_plot (candidate);
  f04 Fig. 7 electrical_plot (candidate); f05 Fig. 3 other (candidate); f06 Table 1 data_table (manual; candidate held only the header row).
- No cross-section or stack drawing exists; CSAM of the bonded pair is rank 1.
- has_process_flow = yes on thin evidence: dual damascene BPV/BPM, planarization polish, F2F W2W bonding, <280 C anneal, CSAM, WAT.
- Almost all results normalized or qualitative: overlay only ">3x mean+3sigma reduction", daisy chain resistance in a.u.,
  CSAM qualitative. Absolute numbers: 0.4 um pitch, <280 C anneal, >200 V breakdown, ~1.4e-10 A leakage at 200 V (read
  off log plot), EEP 2824x and >300x bandwidth density (authors' model, basis derived).
- Not reported: wafer size, die size, BPM CD/thickness, bond film material, bonding conditions, yield %, sample counts.

## ectc51909.2023.00153 (Resonac / JOINT2, fluxless microbump and narrow-gap CUF)
- Figures opened: page_02-05 renders; re-crops Table I, Fig. 5 and Fig. 7(b) (300 dpi); candidates p02_fig4, p02_fig5,
  p04_fig10, p04_fig11, p04_fig12.
- Key figures: f01 Fig. 10 cross_section (candidate); f02 Fig. 5 stack_schematic (candidate); f03 Fig. 4 process_flow
  (candidate); f04 Table I data_table (manual, no candidate); f05 Fig. 12 micrograph (candidate); f06 Fig. 11 other (candidate).
- TVs: a-d = TV-1..TV-4 (pitch/diameter 20/10, 15/10, 15/7.5, 10/5 um), each a full assembly of one 15x20 mm die plus
  four 5x10 mm dies on a 30x30 mm Si interposer (each has its own IR image and flux-cleaning count); e = fluxless TCB
  sample with Cu pretreatment (Developed product A); its bump design and die are not stated.
- Judgment calls: Table I/II bump counts (750,000 / 125,000 / 1,250,000) not split by design (they equal a full-area 20 um
  array), kept in TV notes, not as interconnect counts. TCB 235 C / 7 s / stage 70 C are set values (design_target).
  Dicing step placed after one-time reflow from the Fig. 8 "After dicing" image. Bump space 5 um for TV-2/4 stated;
  10 and 7.5 um for TV-1/3 derived (A - B). Shear strengths 1.7 / 13.5 N read from Fig. 7(b) bars (+/-0.2 N).
- Tables I-IV are missing from the text layer (numerals garbled); all read from page renders.
- primary_bucket microbump_3d kept; buckets extended with si_interposer (30x30 mm Si interposer).
- Not reported: bonding force, actual bond temperature, alignment number, standoff, CUF/flux products, reliability,
  electrical data, pretreatment layer thickness.

## Key-figure notes
- 18 figures chosen; 16 candidate, 2 manual (00008 Table 1: candidate cropped to the header row only; 00153 Table I: no
  candidate for tables on that page). All other candidates were clean (whole figure, little else).

## Schema gaps
- No metric category for process/cleaning counts or architecture runtime ratios; used `other`.
- figure_kind has no map/heatmap kind for per-coupon thickness/width maps or WLI topography; used `other`.
- interconnects has no pad-only type for substrate bump pads with no die attached (UCIe bump map); used `unspecified`.
