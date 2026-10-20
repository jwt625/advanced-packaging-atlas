# Batch b084 report (2026-10-20)

Papers: tcpmt.2026.3736233, 001c.147108, eptc62800.2024.10909836. All distilled. Validator: `0 errors, 0 warnings (data/_staging/b084)`.
author_affiliations / organizations / org_sites left header-only (separate pipeline).

## tcpmt.2026.3736233 - Embedded multi-terminal DTCs in glass (IEEE TCPMT, accepted author version)
- Status: distilled. process_flow_level: ordered (has_process_flow yes).
- Rows: tv 6, comp 15, layers 43, ic 9, flows 1, steps 15, ei 0, oi 0, metrics 70, figures 29.
- TVs: a single 2.8 uF DTC dual-plane (55-via); b five-parallel 14 uF (no TGVs); c segmented 3-via; d segmented 6-via;
  e interdigitated single-layer (DUT1-3); f Q3D simulation_model (15/30/45/100 um dielectric).
- Figures opened: page_01-page_15.png; candidates p06_fig8, p07_fig10, p08_fig12, p10_fig14, p11_fig15, p14_fig24, p14_fig25,
  p09_tableii, p10_tableiii, p11_tableiv, p14_tablev_2, p14_tablevi, p15_tablevii_2; manual re-crops of Figs. 1-8, 10, 11, 13, 15-21, 23,
  Tables II-VII (all opened).
- Key figures (fig_id suffix, label, kind, source): f01 Fig. 4 stack_schematic manual (reprinted [28]); f02 Fig. 16 process_flow manual;
  f03 Fig. 17 package_photo manual; f04 Fig. 18 package_photo manual; f05 Fig. 19 package_photo manual; f06 Fig. 20 package_photo manual;
  f07 Fig. 21 micrograph manual; f08 Fig. 3 stack_schematic manual (reprinted [27]); f09 Fig. 15 stack_schematic manual;
  f10 Fig. 5 stack_schematic manual; f11 Fig. 2 block_diagram manual (reprinted); f12 Fig. 6 stack_schematic manual;
  f13 Fig. 7 top_view_layout manual (reprinted); f14 Fig. 8 top_view_layout manual (reprinted); f15 Fig. 11 top_view_layout manual;
  f16 Fig. 12 top_view_layout candidate; f17 Fig. 13 simulation_result manual; f18 Fig. 14 stack_schematic candidate;
  f19 Fig. 1 stack_schematic manual; f20 Table V data_table manual; f21 Fig. 24 electrical_plot candidate; f22 Fig. 23 electrical_plot manual;
  f23 Table IV data_table manual; f24 Table II data_table manual; f25 Table III data_table manual; f26 Table VI data_table manual;
  f27 Fig. 25 simulation_result candidate; f28 Table VII data_table manual; f29 Fig. 10 simulation_result manual.
  Skipped: Fig. 9 (method limits/model curves), Fig. 22 (measurement setup photo), Table I (prior-work specs), biographies.
- Judgment calls:
  - Level ordered, not full: Fig. 16 gives 10 ordered steps with materials; the paper defers temperatures/pressures to refs [27],[28].
    Only "vacuum lamination" is stated (atmosphere vacuum on F1-s02).
  - One flow for a-e; second-layer steps (s10-s15) are deltas for a;b;c;d (TV e stops after the first plane); Cu#1/Cu#2
    pattern differences in `split`. ABF cure split from lamination (text "laminated and cured"); second cure inferred from "same sequence".
    Photoresist removal after first plating from Fig. 17(d); seed etch not stated, not added.
  - Glass thickness 300 um (abstract) over 200 um in reprinted Fig. 3(c)/4(c); conflicts logged. Cu#1/Cu#2 net labels disagree
    between Fig. 4(b) and 4(c); no net assigned.
  - Die specs (VCC, TCC, max V/T, SRF, density) from Table VII entered with basis unspecified (datasheet-type values).
  - Table IV used for build geometry; Table VI nominals (40/25/140 um) kept only on sensitivity rows; conflict logged.
  - Fig. 24 ADS markers entered for 3-via/6-via segments only (trace-to-legend mapping by S-parameter index).
  - Open/short de-embedding structures not entered as TVs.
- Not reported: process temperatures/pressures/times, laser types, ABF grade, seed thicknesses, cavity size/depth, DAF thickness,
  reliability/warpage/thermal; electrical_interfaces, optical_interfaces.
- Source problems: none (author-accepted version; text layer fine).

## 001c.147108 - Fully additive triple-stacked Cu spiral inductors (IMAPS 2025, manual download)
- Status: distilled. process_flow_level: full (UV cure 3 min typed as time_s 180).
- Rows: tv 1, comp 2, layers 14, ic 1, flows 1, steps 32, ei 0, oi 0, metrics 4, figures 3.
- Figures opened: page_02, page_03, page_05; cand p03_fig2, p05_fig3; manual re-crop of Fig. 1.
- Key figures: f01 Fig. 3 micrograph candidate; f02 Fig. 2 process_flow candidate; f03 Fig. 1 top_view_layout manual (no candidate).
- Judgment calls: steps from Fig. 2 (1)-(23) plus UV cures, rinses and three in-flow optical inspections from text/Fig. 3(a)-(c);
  final XCT/optical results as metrics. The two HP19 layers coated for selective via plating (steps 9, 18) added as layers although
  the text substrate labels omit them. Text calls the third spiral "(SI2)" once; SI3 used (conflict logged). Venue "IMAPS" per batch file.
  "Sub-micrometer" alignment entered as alignment_um 1 with qualifier lt, basis author_estimate (not measured).
- Not reported: layer thicknesses, FR-4 thickness, coupon size, spiral turns, bath/laser parameters, any electrical data.
- Source problems: none.

## eptc62800.2024.10909836 - Fusion bonding with ultra-thin dielectric layers (EPTC 2024)
- Status: distilled. process_flow_level: ordered (no bonding or deposition conditions).
- Rows: tv 2, comp 3, layers 10, ic 2, flows 1, steps 12, ei 0, oi 0, metrics 14, figures 5.
- Figures opened: page_01-page_03; cand p01_fig1, p01_fig2, p02_fig3, p02_fig4, p03_fig5; 400 dpi zooms of Fig. 3, Fig. 4(B)/(C); manual Fig. 5.
- Key figures: f01 Fig. 4 cross_section candidate; f02 Fig. 2 process_flow candidate; f03 Fig. 5 xray_csam manual (candidate cut panel B labels);
  f04 Fig. 3 warpage_plot candidate; f05 Fig. 1 stack_schematic candidate (concept, paper-level).
- Judgment calls: TVs a (W2W) and b (C2W); pre/post CMP topography W2W cases as metric variants. Fig. 2 metrology boxes as
  inline_inspection steps; dicing (TV b) placed by inference; W2W/C2W bonding as TV deltas with same seq. "<300 nm gap" claim
  entered on both TVs as paper-level scope. c-Si 216 nm from XSEM label (text names only "patterned passive photonic layer").
- Not reported: bonding temperature/anneal/activation, alignment, die size/count, substrate and cladding thickness, numeric bow and roughness.
- Source problems: none.

## Validator output
`uv run python scripts/validate_db.py --staging data/_staging/b084` -> `0 errors, 0 warnings (data/_staging/b084)`

## Schema gaps
- No column for a measured capacitance / ESR / ESL of an embedded passive outside metrics; used metrics category power_delivery.
- No interconnect_level/type for a metal-free oxide-oxide fusion bond that is not an optical coupler yet; used other/other with bonding_method fusion.
- Datasheet-type component ratings (VCC, TCC, max voltage) have no fitting basis; used unspecified.

## Audit findings and fixes (2026-10-20, ingest_audit_C)

| paper | row | severity | finding | outcome | change or reason |
|---|---|---|---|---|---|
| tcpmt.2026.3736233 | tcpmt.2026.3736233-a-m12 | content_wrong | Parallel-plane edge-oriented ESL 5.6 pH marked measured; it is an HFSS simulation result | fixed | Confirmed on page_13 (Fig. 23(b) legend: CPW wave-port before/after de-embedding and direct lumped port only; caption says HFSS simulations) and p.12 Sec. VII.B. basis -> simulated, source mixed kept, condition -> 'HFSS waveport after CPW de-embedding', note added |
| tcpmt.2026.3736233 | tcpmt.2026.3736233-f27 | figure | Fig. 25 candidate crop cuts x-axis title 'Values [um]' | fixed | Re-crop of page_14 confirmed: bbox -> 0.5111,0.566,0.9271,0.738, bbox_source manual, cand_id empty (supersedes "f27 ... candidate" in the key-figure list above); rank unchanged |
| tcpmt.2026.3736233 | new c-m10..m13, d-m10..m13, f-m9..m12 | minor | Table II direct Q3D ESL of two adjacent 3-/6-via segments and Table III segment ESL estimates not entered | fixed | Values confirmed on page_09/page_10 crops. Added 12 simulated table metrics: c (3-via width 3.2/3.02, length 4.09/3.86 pH), d (6-via width 1.76/1.69, length 2.2/2.09 pH) at 200 MHz/1 GHz; f L6via A-D 3.86/5.3/6.83/13.18 pH at 1 GHz (printed as L6via/8). Metrics for this paper now 82 |

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b084` -> `0 errors, 0 warnings (data/_staging/b084)`

## Coordinator figure fix (2026-10-20): clipped candidate bboxes

A pixel scan of every candidate-bbox figure row found content continuing below the bbox bottom (figure_candidates.py clips raster images, typically by about 0.012 of page height). Each bbox below was extended to the first blank gap under the image (checked on contact sheets; captions excluded) and set to bbox_source manual, cand_id empty.

| fig_id | page | old bbox | new bbox |
|---|---|---|---|
| 001c.147108-f01 | 5 | 0.1969,0.1011,0.8032,0.758 | 0.1969,0.1011,0.8032,0.7612 |
| tcpmt.2026.3736233-f16 | 8 | 0.5058,0.2516,0.9224,0.4068 | 0.5058,0.2516,0.9224,0.4176 |
