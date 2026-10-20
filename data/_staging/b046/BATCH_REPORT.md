# Batch b046 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b046` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51529.2024.00096 | distilled | 3 | 0 | 18 | 2 | 23 | 0 | 0 | 18 | 6 | yes |
| icep58572.2023.10129684 | distilled | 3 | 3 | 0 | 2 | 6 | 0 | 0 | 9 | 4 | yes |
| ectc51529.2024.00013 | distilled | 1 | 6 | 6 | 4 | 12 | 0 | 0 | 5 | 6 | yes |

## ectc51529.2024.00096 (Applied Materials, dual damascene polymer RDL)
- Figures opened: candidates p01_fig1, p02_fig2, p02_fig3, p03_fig5, p03_fig6, p03_fig7, p04_fig8, p04_fig9; re-crops of Fig. 6(A) (400 dpi), Fig. 5 (600 dpi), Fig. 2 step 1 (500 dpi).
- Key figures: f01 Fig. 6 cross_section (candidate p03_fig6); f02 Fig. 2 process_flow (candidate p02_fig2); f03 Fig. 1 top_view_layout (candidate p01_fig1); f04 Fig. 7 electrical_plot (candidate p03_fig7); f05 Fig. 8 electrical_plot (candidate p04_fig8); f06 Fig. 9 electrical_plot (candidate p04_fig9).
- TVs: a = LELE (2x ~1 um PI + 500 A SiN, Cu on 1 um Al), b = greyscale DWL (single ~3 um photosensitive PI, Cu on Cu/Ti), c = Cu/greyscale polymer/P+ Si capacitor (Ti barrier with/without as metrics.variant).
- Judgment calls: package_class fan_out_wafer for the wafer-level RDL coupons (paper targets FOWLP); 2/2 um L/S from text plus Fig. 7 'Pitch = 4 um'; Fig. 7 medians (~6 vs ~9 ohm/mm) and Fig. 9 breakdown fields read off log plots (approx); NMP strip entered once since it is stated generically.
- Conflicts: greyscale bottom electrode Cu/Ti (text) vs Al (Fig. 1 schematic); LELE via text says >100 ohm excluded, Fig. 8 CDF extends to ~1e4 ohm; text calls the BTS plot Fig. 8, caption is Fig. 9.
- Not reported: PI product names/properties, metal thicknesses, exposure doses, RIE/CMP conditions, device counts, BTS duration. Fig. 5 SEM CD labels illegible.

## icep58572.2023.10129684 (ASE, panel back-end micro ball mount)
- Figures opened: page_01, page_02 renders; candidates p01_fig1, p02_fig3, p02_fig4, p02_fig5; re-crops of Fig. 1, 3 (two tries), 4, 5.
- Key figures: f01 Fig. 5 cross_section (manual); f02 Fig. 1 package_photo (candidate p01_fig1); f03 Fig. 3 other (manual); f04 Fig. 4 micrograph (manual). Fig. 2 (tool photo) skipped.
- TVs: a = 600x600 mm epoxy compound panel (warpage tuned to 12 mm, Panel Saw), b = 300x300 mm panel with frame (handling + 55 um micro ball mount), c = ~150 um standard substrate 95x240 mm (micro ball test).
- Judgment calls: has_process_flow yes (panel saw, flux stencil printing, brush ball planting, reflow); reflow step from Fig. 5 caption only; interconnect level unspecified (balls replace plated pillars, target level not stated); 3 vs >9 stages, -50% time, -45% cost entered as author_estimate; 130 um pitch statement kept in notes only.
- Not reported: layer stack, ball alloy and pitch, reflow profile, numeric yield/TTV, warpage sign convention. 2-page extended abstract.

## ectc51529.2024.00013 (AOI Electronics / Tokyo Tech, Pillar-Suspended Bridge)
- Figures opened: page_01-04 renders; candidates p01_fig1, p02_fig3, p03_fig8, p03_fig9, p04_table1, p04_table3; re-crops of Table 1 (250 dpi) and Fig. 1 basic structure (400 dpi).
- Key figures: f01 Fig. 8 cross_section (candidate p03_fig8); f02 Fig. 3 process_flow (candidate p02_fig3); f03 Fig. 1 stack_schematic (candidate p01_fig1); f04 Table 1 data_table (candidate p04_table1); f05 Fig. 9 micrograph (candidate p03_fig9); f06 Table 3 data_table (candidate p04_table3).
- TV: one PSB module (Table 1): 2 chiplet TEGs 10x7x0.7 mm, bridge TEG 10x1x0.11 mm, module 10.60x14.94 mm x 820 um; MicroPillar 40/25/10 um Cu/Ni/Au; Tall Pillar 142/70/120 um; 1st/2nd mold 700/120 um; 300 mm square glass-carrier panel.
- Judgment calls: cross-section module (Fig. 6) treated as the same build as the reliability module; MicroPillar plus chiplet-side and bridge-side solder-capped Cu pillars as three die_to_bridge rows (counts 2240/2250 = pads per TEG); chiplet bonding set mass_reflow from abstract/Sec. III wording ("connecting chiplets and bridges via MicroPillar"); 12-step flow from Fig. 3 labels plus Sec. III conditions.
- Reliability: HTS 150 C 1000 h 0/22, TCT -65/150 C 1000 cy 0/21, THS 80 C/85%RH 1000 h 0/22, PCT 121 C/100%RH/2 atm 200 h 0/21 (ongoing); MSL 3 precondition for TCT/THS/PCT; fail = open/short/+10% R; 200 terminal pairs per sample.
- Source issue: text.md Table 1 numbers lost in extraction (read from image).
- Not reported: reflow temperature/profile, solder alloy, Tall Pillar metal, mold products, RDL dimensions, daisy-chain resistance, MicroPillar edge offset value.

## Candidate quality
- 00096: all 6 chosen candidates usable as-is (Fig. 9 has blank margin above).
- icep: Fig. 3 candidate clipped bottom row, Fig. 5 clipped right edge, Fig. 4 heavily padded; Fig. 2 candidate merged caption with body text.
- 00013: all 6 chosen candidates usable; Fig. 10/12/13/14 candidates span page corners (x0=0 or x1=1), not used.
