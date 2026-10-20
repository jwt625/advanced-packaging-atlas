# BATCH_REPORT b086 (2026-10-20)

Papers: ectc51906.2022.00240, tcpmt.2024.3507552, 001c.147098. All distilled. Schema v2.5.

## ectc51906.2022.00240 - Pattern distortion by panel deformation, extremely large field lithography (Onto Innovation, ECTC 2022)
- Status: distilled. process_flow_level ordered (has_process_flow yes): ordered resist/exposure/develop steps, no typed conditions (dose, focus not stated).
- Rows: papers 1, test_vehicles 3, components 3, stack_layers 8, interconnects 0, process_flows 4, process_steps 27, electrical_interfaces 0, optical_interfaces 0, metrics 60, figures 15.
- TVs: -a CCL+ABF panel with 10 um dry film (resolution), -b glass panel with 1.4 um liquid resist (2-layer overlay), -c core-patterned CCL+ABF core board panel (distortion analysis, zone-corrected overlay; Panel 1/2 are samples).
- Flows: F1 generic_platform "typical IC substrate build-up" (Fig. 3, 17 steps, generic_description, linked to -c); F2 resolution exposure (-a); F3 two-layer overlay (-b); F4 zone-corrected overlay (-c; RAS metrology = inline_inspection, laser-drilled marks step inferred_order).
- Figures opened: page_01..06.png; cand p02_fig3, p02_fig4, p02_fig5, p03_fig6, p04_fig8, p04_fig9, p04_fig11; manual re-crops p01, p02 x3, p03 x2, p04 x4, p05 x3, p06 x2.
- Key figures (all manual; candidates cut labels/rows or missing Table 1): f01 Fig. 5 cross_section; f02 Fig. 3 process_flow; f03 Fig. 4 package_photo; f04 Fig. 8 package_photo; f05 Fig. 9 package_photo; f06 Fig. 6 micrograph; f07 Fig. 11 micrograph; f08 Fig. 14 micrograph; f09 Table 1 data_table (includes coreless 4L / cored 6L drawings); f10 Fig. 2 top_view_layout; f11 Fig. 12 data_table; f12 Fig. 13 data_table; f13 Fig. 15 other; f14 Fig. 10 other; f15 Fig. 7 other. Fig. 1 (Cadence roadmap) skipped.
- Judgment calls: resolution panel (-a) and core-patterned panel (-c) treated as different builds (core pattern + liquid film vs dry film). Distortion-term coefficients entered as metrics with unit "fit coefficient", basis derived. Fig. 15 "with additional compensation" values are algorithm predictions (basis derived). Table 1 yield model on -c, basis derived. Tool specs (+/-400 ppm, +/-100 ppm, <1 um overlay) kept in step conditions, not metrics.
- Not reported: interconnects, electrical/optical interfaces, dose/focus/development, layer count and thicknesses, warpage values, panel build conditions.
- Source problems: none (abstract says 515 x 510 mm, body 510 x 515 mm; logged as conflict).

## tcpmt.2024.3507552 - Heterogeneous Integration Enabled by 3-D Stitch-Chips (Georgia Tech, TCPMT 2025)
- Status: distilled. process_flow_level full (Ar plasma 150 W 30 s, bond 290 C typed).
- Rows: papers 1, test_vehicles 3, components 10, stack_layers 21, interconnects 5, process_flows 6, process_steps 27, electrical_interfaces 1, optical_interfaces 0, metrics 23, figures 15.
- TVs: -a 3DSC test vehicle (dummy HR-Si chip on 8 x 8 mm fused-silica board, stitch-chip + TSV chiplet), -b wire-bonded baseline, -c HFSS interconnect comparison models (simulation_model).
- Flows: F1 stitch-chip, F2 TSV chiplet, F3 dummy chip, F4 test board (all build_seq 1, notes "parallel"); F5 3DSC bonding (build_seq 2); F6 test-vehicle assembly (build_seq 3) with delta s02 (-a 3DSC TCB) and s03 (-b wire bonding).
- Figures opened: page_02..08.png; cand p02_fig1, p02_fig2, p03_fig4, p04_fig5, p05_fig6, p06_fig7, p06_fig8, p06_fig9, p06_fig10, p07_fig11, p07_fig12, p07_fig13; manual re-crops p03 (Fig. 3), p05 (Table I), p06 x2, p07, p08 (Fig. 14).
- Key figures: f01 Fig. 11 stack_schematic (candidate); f02 Fig. 13 xray_csam (candidate); f03 Fig. 12 package_photo (candidate); f04 Fig. 10 package_photo (candidate); f05 Fig. 8 micrograph (candidate); f06 Fig. 7 process_flow (candidate); f07 Fig. 9 process_flow (candidate); f08 Fig. 2 stack_schematic (candidate); f09 Fig. 5 top_view_layout (candidate); f10 Fig. 1 stack_schematic (candidate, concept); f11 Fig. 14 electrical_plot (manual, candidate missed panels a,b); f12 Table I data_table (manual, candidate was title only); f13 Fig. 4 simulation_result (candidate); f14 Fig. 6 simulation_result (candidate); f15 Fig. 3 simulation_result (manual).
- Judgment calls: package_class other (glass board with bridge-like stitch link; primary bucket si_bridge kept). Stud bump: design 80/50 um (Table I), ~90 um as formed, 100 um / 20 um after bonding -> measured values in interconnect, all in conflicts. Epoxy film 2 mil = 50.8 um (Fig. 11 says 50 um). Stitch-chip-to-chiplet bonding method left unspecified (paper says only "flip-chip bonder at 290 C"). Fig. 11 calls die attach "flip-chip bonded"; entered as die_attach with conductive epoxy film. TSV chiplet Table I w/l 0.5/1 mm vs text W=1000/L=500 um logged as conflict. RF chain entered as one electrical_interfaces row (protocol unspecified, IL < 1.3 dB).
- Not reported: optical interfaces, metal thicknesses of stitch-chip/board CPW, DRIE/plating/CMP conditions, bonding force/time, reliability.
- Source problems: none.

## 001c.147098 - Simplified via-first TSV and backside interconnect for superconducting quantum annealing (AIST/NEC, IMAPS 2025, manual download)
- Status: distilled. process_flow_level full (ALD TiN 200 C, TEOS SiO2 100 C typed).
- Rows: papers 1, test_vehicles 3, components 3, stack_layers 12, interconnects 2, process_flows 2, process_steps 26, electrical_interfaces 0, optical_interfaces 0, metrics 5, figures 7.
- TVs: -a 100 mm HR-Si wafer with TSVs and Ti-Nb-Ti backside wiring, -b through-pattern chip without TSVs, -c through-pattern chips with 350/700/1400 um pitch TSVs (pitch = variant).
- Flows: F1 new 11-step flow (Fig. 4; 13 rows because text splits barrier/seed and litho/etch), tv_ids -a;-c (Fig. 7 caption); F2 conventional 13-step flow (Fig. 3, ref. [5]) scope comparison, performed no. -b in not_reported (fabrication not described).
- Figures opened: page_02..05.png; cand p02_fig1, p02_fig2, p02_fig3, p03_fig4, p04_fig5, p04_fig6, p05_fig7; manual re-crops of all seven.
- Key figures (all manual; every candidate cut scale bars, labels or bottom panels): f01 Fig. 5 cross_section; f02 Fig. 4 process_flow; f03 Fig. 3 process_flow; f04 Fig. 6 top_view_layout; f05 Fig. 1 stack_schematic; f06 Fig. 2 stack_schematic; f07 Fig. 7 electrical_plot.
- Judgment calls: TSV depth 395 um measured (SEM), as-etched 400-410 um in step result. Conventional flow protection-layer steps as category other (material not stated). Paper calls the TSV-etched face "backside".
- Not reported: electrical/optical interfaces, etch/plating recipe values, SiO2 and Nb thickness, dicing, TSV resistance/yield/reliability.
- Source problems: none. Venue from source.json / page footer (IMAPS 2025 Symposium, San Diego).

## Validator
```
uv run python scripts/validate_db.py --staging data/_staging/b086
0 errors, 0 warnings (data/_staging/b086)
```

## Schema gaps
- No bonding_method value for Au stud bump to Cu cap flip-chip bonding (thermocompression_cu is Cu-Cu); left unspecified.
- No metric unit convention for dimensionless distortion fit coefficients (entered as "fit coefficient").
- No package_class for a glass-board RF chip-to-board link (3DSC); used other.

## Audit findings and fixes (2026-10-20, ingest_audit_A)

Verified against references/tcpmt.2024.3507552/text.md (p.5-7) and re-crops of p.5 Table I, p.6 Fig. 9, p.7 Fig. 11, p.4 Fig. 5.

| paper | row | severity | finding | outcome | change or reason |
|---|---|---|---|---|---|
| tcpmt.2024.3507552 | a-i2 (metallurgy) | content_wrong | Stitch-chip to TSV chiplet joint written as Au stud bump to Cu cap; caps are only on the board side | fixed | metallurgy = 'Au stud bump (stitch-chip) to Cu pad (TSV chiplet top)'; locator += p.7 Fig. 11; F5-s02 notes corrected the same way |
| tcpmt.2024.3507552 | a-c3 (conflicts.thickness_um) | content_missing | Film conflict omits the 30 um after-bonding label in Fig. 11 panel 2 | fixed | conflict values [50.8, 50, 30] with panel-2 locator, chosen 50.8 (as applied); same conflict added for a-L06; a-c3/a-L06/F6-s02 notes mention 30 um after bonding (F6-s02 result left unchanged: schematic value, not measured) |
| tcpmt.2024.3507552 | F6-s01 (thickness_in_um) | content_missing | 2 mil film thickness only in material text | fixed | thickness_in_um = 50.8 (derived 2 mil x 25.4 um/mil, logged); conditions = '2 mil film' |
| tcpmt.2024.3507552 | F1-s06 (target; basis) | structure | target held the as-formed 90 um result; design target is Table I 80/50 um | fixed | target = 'd 80 um, h 50 um'; basis design_target; overrides target:table;result:measured; qualifiers result:approx; locator += p.5 Table I |
| tcpmt.2024.3507552 | f01..f15 (rank) | figure | Process-flow drawings Fig. 7, Fig. 9 ranked 6-7 | partly_fixed | Fig. 7, Fig. 9 moved to ranks 2-3 as proposed; Fig. 5 (stitch-chip layout) placed at rank 4, not 9, per SKILL order (layout/floorplan before other schematics/images); rest as proposed; fig_id renumbered f01..f15 to rank (fig_ids in the per-paper section above are pre-audit) |

Validator after fixes: `0 errors, 0 warnings (data/_staging/b086)`
