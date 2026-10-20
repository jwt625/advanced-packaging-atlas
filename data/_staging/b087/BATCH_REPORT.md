# BATCH_REPORT b087 (2026-10-20)

Papers: ectc51909.2023.00302, 001c.147203, estc60143.2024.10712002. All distilled. Schema v2.5.

## ectc51909.2023.00302 - Reconstituted-SiO2 Tier with Integrated Copper Heat Spreader (ECTC 2023)
- Status: distilled. process_flow_level full (ICP-PECVD 100 C; Cr etch 10 min); has_process_flow yes.
- Rows: tv 4, comp 5, layers 12, ic 4, flows 2, steps 21, ei 1, oi 0, metrics 24, figures 11.
- TVs: a reconstituted-tier testbed (test_coupon), b TOV testbed (test_coupon), c thermal model, d HFSS CPW/TOV model (simulation_model).
- Flows: F1 Fig. 5 reconstitution flow (tv a, 12 steps; barrier, tier transfer and RDL marked performed no); F2 Fig. 10 TOV flow (tv b, 9 steps).
- Figures opened: page_02-06.png; cand p02_fig1, p02_fig2, p02_tablei, p03_fig3, p03_fig4, p04_fig5, p04_fig6, p04_fig7, p05_fig9, p05_fig10, p06_fig11; manual re-crops of Fig. 1, Fig. 2, Fig. 4, Fig. 9 (scratch).
- Key figures: f01 Fig. 6 micrograph (candidate); f02 Fig. 1 stack_schematic (manual); f03 Fig. 5 process_flow (candidate); f04 Fig. 10 process_flow (candidate); f05 Fig. 11 cross_section (candidate); f06 Fig. 7 micrograph (candidate); f07 Fig. 9 package_photo (manual); f08 Fig. 2 simulation_result (manual); f09 Table I data_table (candidate); f10 Fig. 3 electrical_plot (candidate); f11 Fig. 4 electrical_plot (manual).
- Judgment calls: 10 um vs 100 um chiplet gap kept as one TV (layout split; two component rows, split on DRIE step, gap-fill metrics per variant). Debond (s11) marked performed yes per text (Fig. 9 sample "after ... debonding"), transfer (s10) performed no ("would be transferred"). Thermal max/min taken from Fig. 2 legends (37.695 vs text 37.6, conflict logged). Fig. 4 TOV values entered as read although text trend disagrees (logged). TOV ic_type other (no enum for through-oxide via); one row per labelled diameter 2/3/4/5 um with pitch range 4-15 um; height 7-7.5 um as min/max metrics. Fig. 8 (cited build, ref [10]) not kept as key figure.
- Not reported: chiplet count, carrier diameter, adhesive/debond method, plating chemistry/current density, PECVD recipe, TOV pitch per diameter, TOV metallization, measured device performance.
- Source problems: text layer has font-encoded gaps on p.3/p.5 (50 ohm, < 1 dB, > 20 dB); resolved from page renders.

## 001c.147203 - 150 GHz-band Coreless High Multilayer Antenna-in-Package for 6G (IMAPS 2025, manual download)
- Status: distilled. process_flow_level ordered (Fig. 7 sequence, no typed conditions); has_process_flow yes.
- Rows: tv 6, comp 5, layers 11, ic 5, flows 1, steps 15, ei 0, oi 0, metrics 25, figures 12.
- TVs: a coreless 10L AiP module (package), b stacked-via daisy chain (7/9-stacked, test_coupon), c/d/e microstrip coupons on materials A/B/C (test_coupon), f via stress model (simulation_model).
- Flow: F1 Fig. 7 coreless build on support carrier with peelable Cu foil, MSAP, CO2 laser vias, repetition loop, solder printing, SMT/reflow, flip chip, UF (tv a).
- Figures opened: page_02-05.png; all 12 candidates (p02_fig1, p02_fig2, p02_fig3, p02_table1, p03_fig4, p03_fig5, p03_fig6, p04_fig7, p04_fig8, p05_fig9, p05_fig10, p05_table2); 300 dpi re-renders of Fig. 4 panels (scratch) for value reading.
- Key figures (all candidate): f01 Fig. 6 xray_csam; f02 Fig. 9 cross_section; f03 Fig. 1 stack_schematic; f04 Fig. 7 process_flow; f05 Fig. 5 package_photo; f06 Fig. 2 stack_schematic; f07 Fig. 3 stack_schematic; f08 Table 1 data_table; f09 Fig. 8 reliability_plot; f10 Table 2 data_table; f11 Fig. 4 electrical_plot; f12 Fig. 10 simulation_result.
- Judgment calls: materials A/B/C coupons as separate TVs (different dielectric = different stack). Table 1 values over text where they differ (65 vs 70 um dielectric; via 70 vs phi60 um). Substrate x = 8.4 mm from Fig. 5 photo label (text 8 mm); thickness 765 um from Table 1 (text ">1 mmt", abstract "<1mmt"). 9-stacked pass rates read off Fig. 8 (62.5/37.5/25 %, approx). Text Sec. IV figure numbers are off by one vs captions; caption numbers cited. Coupons b-e listed in not_reported for process_steps (fabrication not described).
- Not reported: all process temperatures/pressures/times, solder resist, surface finish, underfill material, RF IC details, carrier material/size, microstrip line width.
- Source problems: none (text clean; figure-number mismatch in source text noted).

## estc60143.2024.10712002 - Over 100-GHz Bridge Chip Interconnection Between Photonic and Electrical ICs with a Heat-Insulating Stress-Relief Membrane Structure (ESTC 2024)
- Status: distilled. process_flow_level full (Au-Au TCB approx 300 C); has_process_flow yes.
- Rows: tv 8, comp 15, layers 42, ic 7, flows 2, steps 15, ei 2, oi 0, metrics 21, figures 11.
- TVs: a/b bridge chip w/ and w/o membrane on AlN RF substrate (sub_assembly); c/d die-shear chips w/o membrane on alumina/AlN (sub_assembly); e/f/g TC daisy-chain chips on alumina (no membrane, no membrane + underfill, membrane; test_coupon); h thermal FEA model.
- Flows: F1 Fig. 3 bridge chip fab (12 steps; backside resist/Deep-RIE/strip as delta tv a;g), build_seq 1; F2 Au stud bump + Au-Au TCB flip-chip (underfill delta tv f, inferred order), build_seq 2.
- Figures opened: page_01-04.png; cand p01_fig1, p02_fig3 (cut: left column only), p03_fig4, p03_tablei, p03_fig5, p03_fig6, p03_fig7, p04_fig8, p04_fig9, p04_fig10; manual crops of Fig. 2 (no candidate) and Fig. 3.
- Key figures: f01 Fig. 2 stack_schematic (manual); f02 Fig. 3 process_flow (manual); f03 Fig. 5 package_photo (candidate); f04 Fig. 7 package_photo (candidate); f05 Fig. 9 package_photo (candidate); f06 Fig. 6 package_photo (candidate); f07 Fig. 4 simulation_result (candidate); f08 Fig. 1 stack_schematic (candidate, conventional CDM, paper-level); f09 Fig. 8 electrical_plot (candidate); f10 Fig. 10 reliability_plot (candidate); f11 Table I data_table (candidate).
- Judgment calls: Fig. 3 ("an example of the process flow") linked to all bridge-chip TVs incl. daisy-chain chips (noted in flow notes). Bump count 32 per TC chip derived from 384 contacts / 12 samples. Die shear in gf/bump kept as printed (no exact unit change applied). Wire-bond 150 K/W entered as author_estimate on model TV h; 1 um CTE displacement as author_estimate on g. Fig. 10 averages read off plot (approx).
- Not reported: Si/polyimide/Cu thicknesses, line geometry, fabricated membrane gap, stud bump size/pitch, TCB force/time, underfill material, sample counts for shear/HF.
- Source problems: none.

## Validator
`uv run python scripts/validate_db.py --staging data/_staging/b087` -> 0 errors, 0 warnings (data/_staging/b087)

## Schema gaps
- No interconnect_type for through-oxide vias (TOV) or Au stud bumps; used `other` with notes.
- interconnects has no diameter_min/max or depth_min/max; ranges (TOV 2-5 um, 7-7.5 um) went to metrics min/max rows.
- Per-length loss (dB/inch) has no electrical_interfaces column; kept in metrics.
- No component_type for RF IC / antenna; used `other`.

## Coordinator figure fix (2026-10-20): clipped candidate bboxes

A pixel scan of every candidate-bbox figure row found content continuing below the bbox bottom (figure_candidates.py clips raster images, typically by about 0.012 of page height). Each bbox below was extended to the first blank gap under the image (checked on contact sheets; captions excluded) and set to bbox_source manual, cand_id empty.

| fig_id | page | old bbox | new bbox |
|---|---|---|---|
| ectc51909.2023.00302-f05 | 6 | 0.087,0.0827,0.4887,0.288 | 0.087,0.0827,0.4887,0.2994 |
