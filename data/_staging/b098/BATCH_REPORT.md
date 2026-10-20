# Batch b098 report (2026-10-20)

Papers: ectc51906.2022.00360, eptc67330.2025.11392196, eptc67330.2025.11392176. All distilled; validator 0 errors, 0 warnings.

## ectc51906.2022.00360 - Vertical via-less interconnects in laminated glass panels, 40-170 GHz (ECTC 2022)
- Status: distilled. process_flow_level: ordered (has_process_flow yes; no typed conditions stated).
- Rows: tv 2, comp 2, layers 16, ic 8, flows 1, steps 15, ei 16, oi 0, metrics 18, figures 14.
- Figures opened: page_02-05.png; cand p02_fig1, p02_fig2, p02_fig3, p02_fig5, p03_fig6, p03_fig7, p04_fig9, p04_fig10, p05_fig11, p05_fig12, p05_fig13, p05_fig14; manual re-crops of Table I (p.4) and Table II (p.5).
- Key figures: f01 Fig. 6 micrograph (cand); f02 Fig. 7 micrograph (cand); f03 Fig. 2 stack_schematic (cand); f04 Fig. 5 process_flow (cand); f05 Fig. 1 stack_schematic (cand); f06 Fig. 13 top_view_layout (cand); f07 Fig. 3 stack_schematic (cand, simulation-only comparison TGV); f08 Table I data_table (manual); f09 Table II data_table (manual); f10-f13 Fig. 9-12 electrical_plot (cand); f14 Fig. 14 electrical_plot (cand).
- Judgment calls:
  - Two TVs (ABF-glass-ABF, JSR-glass-JSR); patch sizes 70/110/160/300 um are test features (rule g), one interconnect row per patch (level/ic_type other, via-less capacitive).
  - One flow (Fig. 5 double-sided SAP) for both TVs; dry-film and liquid front ends and seed etch as TV deltas; litho/plate/strip shared.
  - Insertion loss (Tables I/II) in electrical_interfaces (protocol other, channel glass), measured and simulated rows; 10 dB bandwidth and footprint in metrics.
  - Cu thickness 5 um (measured) over 6 um design (conflict logged).
  - Dk/Df values attributed to refs [12], [13] excluded. Fig. 4 (simulated TPV S21) and Fig. 8 (probe-station setup) not key figures.
- Not reported: process conditions, panel size, ABF seed metal, JSR drill method, IL frequency, Fig. 14 basis/stack.
- Source problems: none (text layer clean; tables garbled in text layer, read from renders).

## eptc67330.2025.11392196 - 2.5D cryogenic packaging for advanced quantum processors (EPTC 2025)
- Status: distilled. process_flow_level: full (reflow peak 200 C, die attach 130 C / 40 min, H2 plasma atmosphere).
- Rows: tv 1, comp 5, layers 17, ic 4, flows 3, steps 36, ei 0, oi 0, metrics 23, figures 14.
- Figures opened: page_02-05.png; cand p02_fig2, p02_fig3, p02_fig4, p03_fig5, p03_fig6, p03_fig7, p03_fig8, p03_fig9, p03_tablei, p04_fig11, p04_fig12, p04_fig13, p05_fig14, p05_tableii; 300 dpi re-crop of Fig. 4; manual re-crops of Fig. 3, Fig. 5, Table I.
- Key figures: f01 Fig. 13 cross_section (cand); f02 Fig. 2 stack_schematic (cand); f03 Fig. 4 process_flow (manual); f04 Fig. 3 process_flow (manual); f05 Fig. 5 process_flow (manual); f06 Fig. 11 xray_csam (cand); f07 Fig. 12 package_photo (cand); f08 Fig. 9 package_photo (cand); f09 Fig. 6 package_photo (cand); f10 Fig. 7 micrograph (cand); f11 Fig. 8 micrograph (cand); f12 Fig. 14 package_photo (cand); f13 Table I data_table (manual); f14 Table II data_table (cand).
- Judgment calls:
  - One package TV; ball shear (bumped chips) kept as metrics on it rather than a separate sub-assembly TV.
  - Flows: F1 chip flow (Fig. 3) and F2 interposer flow (Fig. 4) both build_seq 1, notes "parallel"; F3 assembly build_seq 2.
  - X-ray after flip chip/die attach = inline_inspection step plus a yield metric.
  - Back-grind 110 um then reveal to 100 um read from Fig. 4 panel labels (schematic override).
  - Reflow "peak 180~200 C": temp_c_max 200, range in conditions.
  - Die attach material SMT 158M (p.2 text + Fig. 2) vs SMT158N (p.4): 158M chosen, conflict logged. TSV liner Ta (text) vs TiN/alpha-Ta (Fig. 4) logged.
  - Tc values (Fig. 10) attributed to ref [4] excluded; Fig. 1 (website reprint) and Fig. 10 not key figures.
  - 1 mil Al wire converted to 25.4 um (evidence derived).
- Not reported: bump pitch/count, UBM thickness, TSV pitch/count, flip-chip bond parameters, plasma parameters, cryogenic test temperature, sample counts.
- Source problems: none (first page has template placeholder "XXX-X-XXXX" header; cosmetic).

## eptc67330.2025.11392176 - RDL-FPC hybrid substrate for compact SiP (EPTC 2025)
- Status: distilled. process_flow_level: ordered (no typed temperature/time/pressure stated; laser scan speed only).
- Rows: tv 2, comp 2, layers 19, ic 2, flows 1, steps 21, ei 0, oi 0, metrics 11, figures 8.
- Figures opened: page_02-04.png; cand p02_fig1, p02_fig2, p02_tablei, p03_fig3, p03_tableii, p04_fig4, p04_fig5, p04_tableiii.
- Key figures: f01 Fig. 3 cross_section (cand); f02 Fig. 1 process_flow (cand); f03 Fig. 2 package_photo (cand); f04 Fig. 4 stack_schematic (cand); f05 Fig. 5 micrograph (cand); f06 Table I data_table (cand); f07 Table II data_table (cand); f08 Table III data_table (cand).
- Judgment calls:
  - Two panel_level TVs: baseline (PIC under SUS stiffener) and PIC open / CVL close (stack differs in stiffener region); one flow with the PIC2 layout in `split`.
  - Reliability tests hung on TV -a; paper does not state which PIC layout the samples used (noted).
  - Flattening equipment step entered as generic_description, performed blank (text says warpage "can be" eliminated).
  - PID Dk/Df from Table II (2.9 / 0.002 @ 25 GHz) over text 0.02 and abstract 2.8 / 0.0060 @ 20 GHz (conflict logged). Text gives glass carrier CTE 31.2 but Table II column is stiffener: table chosen.
  - Stack seq top-down after debond: CVL, PIC1, PID/Cu/seed (repeat 5), PIC2, CVL, SUS.
- Not reported: process temperatures/times, laser parameters, SUS thickness, unit size, reflow profile, bending sample count.
- Source problems: none. Internal inconsistency: 45 um RDL stack vs 5 x (5+5) um (noted in evidence).

## Validator output
```
uv run python scripts/validate_db.py --staging data/_staging/b098
0 errors, 0 warnings (data/_staging/b098)
```

## Schema gaps
- No interconnect_type/level for via-less capacitive (contactless) vertical transitions; used other/other.
- No step_category for wire bonding or flux printing; used bonding and other.
- metrics has no frequency-band columns; 10 dB bandwidth stored as value_text range.
- atmosphere enum lacks Ar/H2 mix; used other with conditions.

## Coordinator figure fix (2026-10-20): clipped candidate bboxes

A pixel scan of every candidate-bbox figure row found content continuing below the bbox bottom (figure_candidates.py clips raster images, typically by about 0.012 of page height). Each bbox below was extended to the first blank gap under the image (checked on contact sheets; captions excluded) and set to bbox_source manual, cand_id empty.

| fig_id | page | old bbox | new bbox |
|---|---|---|---|
| eptc67330.2025.11392196-f01 | 4 | 0.5086,0.6127,0.9302,0.8463 | 0.5086,0.6127,0.9302,0.8569 |
| eptc67330.2025.11392196-f02 | 2 | 0.0697,0.5488,0.4901,0.605 | 0.0697,0.5488,0.4901,0.6129 |
| eptc67330.2025.11392196-f06 | 4 | 0.1523,0.5671,0.4087,0.726 | 0.1523,0.5671,0.4087,0.7377 |
| eptc67330.2025.11392196-f07 | 4 | 0.5464,0.0594,0.8924,0.352 | 0.5464,0.0594,0.8924,0.362 |
| eptc67330.2025.11392196-f08 | 3 | 0.5551,0.6929,0.8838,0.8765 | 0.5551,0.6929,0.8838,0.8883 |
| eptc67330.2025.11392196-f09 | 3 | 0.0695,0.4707,0.4919,0.5832 | 0.0695,0.4707,0.4919,0.5941 |
| eptc67330.2025.11392196-f11 | 3 | 0.5446,0.3768,0.8943,0.5635 | 0.5446,0.3768,0.8943,0.5701 |
| eptc67330.2025.11392196-f12 | 5 | 0.0806,0.1497,0.4804,0.262 | 0.0806,0.1497,0.4804,0.2719 |
