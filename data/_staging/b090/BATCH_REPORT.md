# Batch b090 report (2026-10-20)

Papers: estc55720.2022.9939446, tcpmt.2025.3533388, 001c.147214. All distilled. Schema v2.5.
Validator: `uv run python scripts/validate_db.py --staging data/_staging/b090` -> `0 errors, 0 warnings (data/_staging/b090)`.
author_affiliations / organizations / org_sites left header-only (separate pipeline).

## estc55720.2022.9939446 - PCB Embedding Technology for 5G mmWave Applications (ESTC 2022)
- Status: distilled. process_flow_level: full (F1 cure 150 C / 5400 s).
- Rows: tv 4, comp 8, layers 23, ic 5+1 (6), flows 2, steps 26, ei 1, oi 0, metrics 14, figures 18.
- TVs: a low power embedded AiP module (package); b embedded MMIC process samples incl. embedded LNA (sub_assembly);
  c two-element antenna test structure (test_coupon); d RF interconnect test structures (test_coupon, abstract only).
- Flows: F1 SERENA MMIC embedding + AiP build-up (tv_build, a;b; core, upper build-up, antenna, solder ball and
  test-board steps are a-only deltas); F2 conventional embedding (Fig. 1, Table I Standard; comparison, a;b,
  performed=no, Ag sinter 10 MPa / 230 C).
- Figures opened: page_02-06.png; all 18 candidates (p02_fig1-3, p03_tablei, p03_fig4-7, p04_fig8-10, p05_fig11-14,
  p05_tableii, p06_fig15-16); manual re-crops p04 (Fig. 10), p05 (Fig. 13), p06 (Fig. 15).
- Key figures: f01 Fig. 7 cross_section (cand); f02 Fig. 10 stack_schematic (manual); f03 Fig. 5 process_flow (cand);
  f04 Fig. 6 cross_section (cand); f05 Fig. 4 cross_section (cand); f06 Fig. 11 xray_csam (cand); f07 Fig. 8 micrograph
  (cand); f08 Fig. 16 package_photo (cand); f09 Fig. 12 stack_schematic (cand); f10 Fig. 9 micrograph (cand); f11 Fig. 2
  micrograph (cand); f12 Fig. 1 process_flow (cand); f13 Fig. 3 cross_section (cand); f14 Fig. 15 electrical_plot
  (manual); f15 Table I data_table (cand); f16 Table II data_table (cand); f17 Fig. 13 electrical_plot (manual);
  f18 Fig. 14 electrical_plot (cand).
- Judgment calls: Fig. 10 is a concept schematic; die/capacitor counts taken from it with source schematic. Process
  samples (Fig. 4-8, 15) split from the module as TV b. Abstract IL < 0.4 dB / RL > 20 dB entered with basis
  unspecified (measured vs simulated not stated). LNA S21 ~14 dB read off Fig. 15 (approx). Conventional flow kept as
  comparison flow (Table I contrasts it). Cavity cutting order relative to die attach inferred.
- Not reported: module/die dimensions, lamination conditions, SERENA laser parameters, plating current density,
  solder ball size/alloy, thermal via sizes, reliability, measured thermal resistance; process_steps for c, d.
- Source problems: none (institutional stamp only).

## tcpmt.2025.3533388 - Thermal and Electrical Study of Glass Interposers in Co-Packaged Electronic-Photonic Systems (TCPMT 2025)
- Status: distilled. process_flow_level: full (F1 250 C / 10 s; F2 N2).
- Rows: tv 6, comp 9, layers 27, ic 18, flows 2, steps 10, ei 8, oi 0, metrics 43, figures 17.
- TVs: a thermal TV (package; TGV pitch 100/200/300/400 as metric variants); b CPW lines on glass (test_coupon);
  c glass interposer for electrical characterization (test_coupon); d electrical TV on Rogers PCB (package);
  e optimized electrical design (simulation_model); f thermal FEM variants (simulation_model).
- Flows: F1 SAC305 jetting + flip-chip reflow (a); F2 Bi-Sn BGA attach, reflow, underfill, 36 h RT cure (a;d), with
  a-only primary reflow and chip underfill deltas and per-TV placement deltas (d: microscope alignment).
- Figures opened: page_02-10.png; all 17 candidates; manual re-crops p05 (Fig. 5, Table I), p03 zoom (Fig. 2(a) 35 um label).
- Key figures: f01 Fig. 4 cross_section; f02 Fig. 2 stack_schematic; f03 Fig. 1 stack_schematic; f04 Fig. 3
  package_photo; f05 Fig. 10 package_photo; f06 Fig. 15 electrical_plot; f07 Fig. 13 electrical_plot; f08 Fig. 12
  electrical_plot; f09 Fig. 16 simulation_result; f10 Fig. 11 electrical_plot; f11 Fig. 5 thermal_plot (manual);
  f12 Fig. 6 thermal_plot; f13 Table I data_table (manual); f14 Fig. 7 thermal_plot; f15 Fig. 9 simulation_result;
  f16 Fig. 8 simulation_result; f17 Fig. 14 electrical_plot. All others candidate.
- Judgment calls: interposer fab is only referenced ([18]) so b, c have no flows (listed in not_reported). Microvia
  35 um from Fig. 2(a) label (schematic). BGA count 350 derived (25 x 14). Fig. 6(a) 100 um Tmax ~41 C read off plot.
  IL stored as positive magnitudes; S11 "return loss" values kept as written (negative). Simulation underfill 250 um
  entered as simulated on d. Abstract "~11 dB" vs text 11.83 dB logged as conflict.
- Not reported: interposer fab details, RDL thicknesses, reflow profile values (Supplementary), measured IL numbers
  for c/d (plots only). Supplementary S1-S6 not in the cache.
- Source problems: none.

## 001c.147214 - Fine-Pitch RDL with High Reliability Formed on Glass for Heterogeneous Integration (IMAPS 2025, manual download)
- Status: distilled. process_flow_level: ordered (no typed conditions stated).
- Rows: tv 4, comp 4, layers 19, ic 5, flows 5, steps 16, ei 0, oi 0, metrics 11, figures 17.
- TVs: a panel RDL interposer on carrier glass with chips, mold, release (panel_level); b build-up glass core
  substrate, 3-2-3, 130 x 130 mm unit (panel_level); c DNP-SAP EM monitor (test_coupon); d conventional SAP EM control
  (test_coupon).
- Flows: F1 release layer (a, build_seq 1); F2 RDL layer flow Fig. 7 (a;b;c, build_seq 2; micro bump step a-only
  delta); F3 chip mount, mold, carrier release (a, build_seq 3); F4 glass-core build-up 100/100 um (b, build_seq 1);
  F5 dicing 13 x 13 cm (b, build_seq 3). F1/F4 and F3/F5 share build_seq but no TV.
- Figures opened: page_02-06.png; all 16 candidates; manual crops p02 (Fig. 5, no candidate), p03 (Figs. 6, 7, 8, 9,
  10), p04 (Fig. 12, Fig. 13 no candidate), p05 (Figs. 15, 16, 17), p06 (Fig. 19).
- Key figures: f01 Fig. 19 cross_section (manual); f02 Fig. 17 cross_section (manual); f03 Fig. 18 cross_section
  (cand); f04 Fig. 12 stack_schematic (manual); f05 Fig. 6 process_flow (manual); f06 Fig. 7 process_flow (manual);
  f07 Fig. 14 stack_schematic (cand); f08 Fig. 5 stack_schematic (manual); f09 Fig. 8 package_photo (manual); f10
  Fig. 11 package_photo (cand); f11 Fig. 13 package_photo (manual); f12 Fig. 1 stack_schematic (cand); f13 Fig. 2
  cross_section (cand, reprinted yes); f14 Fig. 9 warpage_plot (manual); f15 Fig. 10 warpage_plot (manual); f16 Fig. 15
  reliability_plot (manual); f17 Fig. 16 reliability_plot (manual). Fig. 3 (HTS, prior work) not included.
- Judgment calls: HAST/HTS (Figs. 2-3) attributed to refs [3][4] and excluded; EM and warpage sections cite [8]/[7]
  at their ends but abstract/intro say they were conducted here, so entered (noted in evidence). Panel 300x400 chosen
  over Sec. II.B "300 x 300". c linked to F2 by inference (DNP-SAP = proposed SAP with inorganic layer). 1 and 2 um
  traces are variants (feature rows, metric variants). Joule-heated 230 C trace temperature basis derived.
- Not reported: all process conditions, dielectric and inorganic materials/thicknesses, RDL layer count, chip type,
  micro bump size, EM sample count, warpage sign convention; process_steps for d.
- Source problems: none. Text layer has duplicated figure labels (flow-figure text) but is readable; no Fig. 4 printed.

## Validator output
`0 errors, 0 warnings (data/_staging/b090)`

## Schema gaps
- No enum for RF/mmWave ICs (GaN/SiGe MMIC, beamformer) in component_type; used `other`.
- Return loss / S11 has no electrical_interfaces column; kept in metrics.
- Mixed-panel figures (photo + plot, schematic + plot) need a single `kind`; chose the dominant panel.

## Coordinator figure fix (2026-10-20): clipped candidate bboxes

A pixel scan of every candidate-bbox figure row found content continuing below the bbox bottom (figure_candidates.py clips raster images, typically by about 0.012 of page height). Each bbox below was extended to the first blank gap under the image (checked on contact sheets; captions excluded) and set to bbox_source manual, cand_id empty.

| fig_id | page | old bbox | new bbox |
|---|---|---|---|
| estc55720.2022.9939446-f05 | 3 | 0.1012,0.4211,0.4597,0.5035 | 0.1012,0.4211,0.4597,0.5154 |
| estc55720.2022.9939446-f06 | 5 | 0.1113,0.1184,0.4491,0.3253 | 0.1113,0.1184,0.4491,0.3369 |
| estc55720.2022.9939446-f08 | 6 | 0.5125,0.0594,0.9304,0.264 | 0.5125,0.0594,0.9304,0.2759 |
| estc55720.2022.9939446-f09 | 5 | 0.1134,0.3647,0.4475,0.448 | 0.1134,0.3647,0.4475,0.459 |
| estc55720.2022.9939446-f10 | 4 | 0.5611,0.0594,0.8812,0.2318 | 0.5611,0.0594,0.8812,0.2429 |
| estc55720.2022.9939446-f11 | 2 | 0.1319,0.6319,0.429,0.7878 | 0.1319,0.6319,0.429,0.7885 |
| estc55720.2022.9939446-f13 | 2 | 0.6341,0.2748,0.8048,0.366 | 0.6341,0.2748,0.8048,0.3672 |
| 001c.147214-f03 | 5 | 0.5229,0.4683,0.9301,0.6764 | 0.5229,0.4683,0.9301,0.6885 |
| 001c.147214-f10 | 4 | 0.0736,0.3528,0.4771,0.5326 | 0.0736,0.3528,0.4771,0.5473 |
