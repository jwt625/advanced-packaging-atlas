# BATCH_REPORT b092 (2026-10-20)

Papers: iedm50572.2025.11353487, ectc51909.2023.00331, eptc67330.2025.11392620. All distilled. Schema v2.5.

## iedm50572.2025.11353487 (IEDM 2025, ETC TSV with annular Cu ring and CNT core)
- Status: distilled. process_flow_level full (has_process_flow yes).
- Rows: papers 1, test_vehicles 3, components 0, stack_layers 12, interconnects 2, process_flows 1, process_steps 9, electrical_interfaces 0, optical_interfaces 0, metrics 15, figures 16, evidence 1.
- TVs: -a ETC TSV coupon (test_coupon); -b BCB-core Cu-ring control (test_coupon); -c COMSOL 1/8 TSV models (simulation_model).
- Flow F1 (Fig. 3, tv_ids -a): DRIE (55 um dia, 480 um depth) > parylene-F double-sided CVD (~3 um) > ELP Cu seed > double-sided Cu plating 1.6 ASD (16 mA/cm2; split 15/30/45 min -> 5/12/17 um) > CNT vacuum-assisted filling (atmosphere vacuum) > solvent evaporation (temp_c_max 80) > CMP > double-sided ILs > RDLs.
- Figures opened: page_03.png, page_04.png, grids p03/p04, all 13 candidate crops, 17 manual re-crops (scratch).
- Key figures: f01 Fig. 6 cross_section (candidate p03_fig6); f02 Fig. 5 cross_section (manual); f03 Fig. 4 cross_section (manual); f04 Fig. 3 process_flow (candidate p03_fig3); f05 Fig. 9 micrograph (manual); f06 Fig. 7 stack_schematic (manual); f07 Fig. 2 stack_schematic (manual); f08 Fig. 13 stack_schematic (manual); f09 Fig. 1 stack_schematic (manual, concept); f10 Fig. 10 other (manual, test setup); f11 Fig. 8 electrical_plot (manual); f12 Fig. 11 thermal_plot (manual); f13 Fig. 12 thermal_plot (manual); f14 Fig. 14 simulation_result (manual); f15 Table I data_table (manual); f16 Fig. 15 other (manual).
- Manual reasons: page-3 column split at x~0.527 (Fig. 1/2) and x~0.405 (Fig. 4/5), so candidates bled into neighbours or cut panels; page-4 candidates used half-page widths and merged Fig. 7/8, 9/11, 10/11, 12/13, 15/Table I; no candidate for Fig. 8, Fig. 13, Table I.
- Judgment calls: Cu-ring 5/12/17 um variants kept as one TV (plating-time split, rule f), values in metrics.variant and step split. BCB-core control is a separate TV (different core material). Per-TSV resistance 39.8 mOhm basis derived (calculated from daisy chain). CNT core diameters 15/25/39 um design_target. Thermal result entered as value_text only (no curve values read). Fig. 1 included as a concept schematic (paper-level).
- Not reported: components, electrical/optical interfaces, Si thickness, TSV pitch/count, IL/RDL materials, DRIE/CVD/ELP/CMP conditions, heater power, sample counts; process_steps for -b (control fabrication not described).
- Source problems: none.

## ectc51909.2023.00331 (ECTC 2023, fully additive sub-10 um microvia, SBU-CBM)
- Status: distilled. process_flow_level full (has_process_flow yes; typed time_s 180 for UV cure/photoactivation).
- Rows: papers 1, test_vehicles 1, components 1, stack_layers 7, interconnects 1, process_flows 1, process_steps 13, electrical_interfaces 0, optical_interfaces 0, metrics 2, figures 4, evidence 1.
- Flow F1 (Fig. 1 + Sec. II.B, tv_ids -a): FR-4 ultrasonic clean > PU1 spin coat (UV TP-1) > UV cure 3 min > HP19 spin coat > UV photoactivation 3 min > electroless Cu target layer (~5 um) > PU2 spin coat (20 um) > UV cure 3 min > ps UV laser drilling (PL2210 Nd:YAG, 266 nm, 20 ps, up to 2 kHz; target < 10 um) > HP19 spin coat > LDW selective photoactivation (LW405B, 375 nm, CLEWIN mask) > rinse > selective electroless Cu.
- Figures opened: page_03.png, all 4 candidate crops.
- Key figures: f01 Fig. 4 cross_section (candidate p05_fig4); f02 Fig. 1 process_flow (candidate p03_fig1); f03 Fig. 2 micrograph (candidate p04_fig2); f04 Fig. 3 micrograph (candidate p05_fig3).
- Judgment calls: microvia diameter entered as 10 with qualifier lt (paper only states sub-10 / < 10 um). PU2 thickness 20 um design_target; the text points to Fig. 2c, which shows the Stage I PU layer, so PU1 thickness is left empty (evidence entry). Plating quality and selectivity entered as value_text metrics.
- Not reported: exact via diameter/depth/pitch, PU1 thickness, spin speeds, UV dose, laser fluence, LDW dose, electroless bath time/temperature, resistance, reliability; via Cu fill not performed (stated).
- Source problems: none (text layer uses a garbled glyph for "um" in Sec. I background; not used for values).

## eptc67330.2025.11392620 (EPTC 2025, fine L/S CPWGs on 4-layer RDL Si bridge for CPO)
- Status: distilled. process_flow_level none (no fabrication steps disclosed); process_steps in evidence not_reported.
- Rows: papers 1, test_vehicles 2, components 4, stack_layers 20, interconnects 5, process_flows 0, process_steps 0, electrical_interfaces 8, optical_interfaces 0, metrics 22, figures 15, evidence 1.
- TVs: -a bridge CPWG test coupon (7 designs, 1 and 2 mm); -b 8-channel XPU-OE SerDes HFSS model (simulation_model).
- Figures opened: page_02.png, grids p01/p03/p04, 300 dpi re-crops of Fig. 2/3, all 15 candidate crops, 11 manual re-crops.
- Key figures: f01 Fig. 2 cross_section (manual); f02 Fig. 3 stack_schematic (candidate p02_fig3); f03 Fig. 4 micrograph (manual); f04 Fig. 9 top_view_layout (manual); f05 Fig. 1 stack_schematic (manual); f06 Fig. 13 other (candidate p04_fig13); f07 Fig. 10 top_view_layout (manual); f08 Table I data_table (manual); f09 Fig. 8 electrical_plot (candidate p03_fig8); f10 Fig. 5 electrical_plot (manual); f11 Fig. 6 electrical_plot (manual); f12 Fig. 7 electrical_plot (manual); f13 Fig. 11 electrical_plot (candidate p04_fig11); f14 Fig. 12 electrical_plot (candidate p04_fig12); f15 Fig. 14 electrical_plot (candidate p04_fig14).
- Manual reasons: candidates cut panel labels (Fig. 1, 2, 4, 5, 6, 7, 9, 10) or included the next section heading (Table I).
- Judgment calls: CPWG space_um = GND-to-signal gap read from Fig. 3; signal-to-signal spacing in notes. Table I IL/mm at 56 GHz in electrical_interfaces (measured, de-embedded). M1-to-Si distance 0.868 um from SEM label (text says around 0.8 um; conflict logged). Fig. 11 inset IL table (simulated) entered as 8 metrics on -a. Fig. 1 architecture interconnects (ubump, TMI, C4) and FOWLP RDL counts placed on simulation TV -b as stated; no physical package TV created because it is not reported as built. Protocol unspecified (paper says only 224 Gbps PAM4 SerDes). Fig. 2(b) SEM dimension labels not assigned by the paper; not entered.
- Not reported: process steps, optical interfaces, RDL metal material, via diameter, bridge size, Cu pillar height, BER, energy per bit, sample counts.
- Source problems: none.

## Validator
uv run python scripts/validate_db.py --staging data/_staging/b092
0 errors, 0 warnings (data/_staging/b092)

## Schema gaps
- No column for a TSV liner/core sub-structure; via-internal layers recorded as stack_layers rows at the substrate seq with `feature`.
- electrical_interfaces has a single space_um; CPWGs have two spacings (GND-signal gap and signal-signal spacing); the second goes in notes.
- electrical_interfaces has no min/max insertion loss; the 8-channel 2.4-3 dB range went into metrics (min/max), and the ei row carries the upper bound.
- No component_type for XPU / optical engine chiplet (used other).

## Audit findings and fixes (2026-10-20, ingest_audit_B)

| paper | row | severity | finding | outcome | change or reason |
|---|---|---|---|---|---|
| eptc67330.2025.11392620 | eptc67330.2025.11392620-b-i5 (new) | content_missing | Fig. 1 labels a TSV in the Si bridge; no interconnects row | fixed | Verified on p.1 Fig. 1 render (TSV leader into left Bridge). Added through_via/tsv row, basis stated, source schematic, locator p.1 Fig. 1; no dimensions stated. interconnects for this paper 5 -> 6. |
| eptc67330.2025.11392620 | eptc67330.2025.11392620-f13 | figure | Candidate bbox for Fig. 11 cuts x-axis title 'Freq [GHz]' | fixed | Re-crop opened: includes axis title, no caption text. bbox 0.0689,0.0597,0.4915,0.272, bbox_source manual, cand_id empty, notes 'Candidate cut x-axis title'. |

Revisions logged in evidence/eptc67330.2025.11392620.yaml. Final validator: `0 errors, 0 warnings (data/_staging/b092)`

## Coordinator figure fix (2026-10-20): clipped candidate bboxes

A pixel scan of every candidate-bbox figure row found content continuing below the bbox bottom (figure_candidates.py clips raster images, typically by about 0.012 of page height). Each bbox below was extended to the first blank gap under the image (checked on contact sheets; captions excluded) and set to bbox_source manual, cand_id empty.

| fig_id | page | old bbox | new bbox |
|---|---|---|---|
| eptc67330.2025.11392620-f06 | 4 | 0.505,0.0609,0.9275,0.232 | 0.505,0.0609,0.9275,0.2434 |
