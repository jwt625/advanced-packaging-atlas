# BATCH_REPORT b097 (2026-10-20)

Papers: tcpmt.2025.3614186, 001c.147115, ectc51529.2024.00392. All distilled. Validator: `0 errors, 0 warnings (data/_staging/b097)`.
author_affiliations.csv, organizations.csv, org_sites.csv left header-only (separate pipeline).

## tcpmt.2025.3614186 (TCPMT 2026, glass)
- Status: distilled. process_flow_level full (has_process_flow yes).
- Rows: papers 1, test_vehicles 2, components 11, stack_layers 20, interconnects 5, process_flows 1, process_steps 26, electrical_interfaces 0, optical_interfaces 0, metrics 31, figures 20.
- TVs: a = 100x100 mm glass-core package (14 xPU-like dies, 8 HBM-like stacks, adhesive only) on 150x150 mm FR-4 PCB; b = 2-D plane-strain FE model (simulation_model).
- Figures opened: page_02-10 renders; cand p02_tablei, p03_fig1, p03_fig2, p04_fig3, p04_fig4, p05_fig5-7, p06_fig8, p06_tableii, p08_fig9, p08_fig10, p08_tableiv, p09_fig11-14, p10_fig15, p10_fig16, p10_fig18; manual re-crops p05 (Fig. 5, 6, 7), p06 (Fig. 8), p08 (Table IV), p10 zooms of Fig. 15, 16, 18.
- Key figures: f01 Fig. 4 package_photo (cand); f02 Fig. 3 xray_csam (cand); f03 Fig. 1 top_view_layout (cand); f04 Fig. 2 micrograph (cand); f05 Fig. 5 stack_schematic (manual); f06 Fig. 6 stack_schematic (manual); f07 Fig. 7 stack_schematic (manual); f08 Fig. 8 stack_schematic (manual); f09 Table I data_table (cand); f10 Fig. 10 warpage_plot (cand); f11 Fig. 9 simulation_result (cand); f12 Fig. 11 reliability_plot (cand); f13 Fig. 12 reliability_plot (cand); f14 Table IV data_table (manual); f15 Fig. 13, f16 Fig. 14, f17 Fig. 15, f18 Fig. 16, f19 Fig. 18 simulation_result (cand); f20 Table II data_table (cand).
- Judgment calls: one physical TV (substrate + dies + board assembly in one flow F1); SAP steps entered in the order written (plating before lithography) with a note; HBM stack build placed after xPU attach (inferred_order); paste-volume profiling and X-ray as inline_inspection; postreflow 100% yield to metrics; FE model kept as separate simulation_model TV (it has Cu-pillar first level and underfill that the physical TV lacks); die-set 55 um bump pitch put on the model's first-level interconnect only; Fig. 15/16/18 values read off plots (approx).
- Conflicts logged: BGA count 7404 (Table I/text) vs 7405 (abstract); mean resistance change peak 14.7% (Fig. 11) vs "below 12%" (text); 24 loops (text) vs n=47 (Table IV); text.md "GX-922" is "GX-92" plus footnote mark in the render.
- Not reported: dielectric thickness/L-S/vias of built substrate; SAP process conditions; HBM batch-cure conditions; corner-fill material; FE bump/ball dimensions; failure data (test ongoing).
- Source problems: none (text layer fine; footnote mark merged into "GX-922").

## 001c.147115 (IMAPS 2025, si_interposer)
- Status: distilled. process_flow_level fragments (has_process_flow no).
- Rows: papers 1, test_vehicles 3, components 27, stack_layers 25, interconnects 8, process_flows 1, process_steps 4, electrical_interfaces 0, optical_interfaces 0, metrics 35, figures 10.
- TVs: a = initial 72x72 mm lidded 2.5D TSV CoW TV (low Tg die UF, high E lid adhesive; Table II leg 1, UF crack); b = follow-up build (high Tg UF, low E adhesive; leg 2, passed TC); c = ANSYS FE model (simulation_model).
- Figures opened: page_02-04 renders; cand p02_fig2, p02_fig3, p03_fig4, p03_fig5, p03_fig6, p04_fig7, p04_fig9, p04_tableii; manual re-crops p02 (Table I), p03 (Fig. 5, Fig. 6), p04 (Fig. 7 at 400 dpi, Table II, Fig. 8).
- Key figures: f01 Fig. 3 cross_section (cand); f02 Fig. 2 stack_schematic (cand, generic, paper-level); f03 Fig. 5 stack_schematic (manual); f04 Fig. 4 stack_schematic (cand); f05 Table I data_table (manual); f06 Fig. 7 warpage_plot (manual); f07 Table II data_table (manual); f08 Fig. 6 simulation_result (manual); f09 Fig. 8 simulation_result (manual); f10 Fig. 9 simulation_result (cand). Fig. 1 (generic roadmap) skipped.
- Judgment calls: underfill/adhesive material change treated as two physical TVs (different stack materials, separate builds and TC outcomes); only flow = generic CoW-singulate-FC sentence of the introduction plus lid attach (generic_platform, fragments); Fig. 7 coplanarity values attributed to TV b per text although the figure sample label reads "Leg 1_02"; Fig. 7 temperature-curve values not entered (axis unit not printed).
- Conflicts logged: TC condition -65/125 C (text) vs -65/150 C, 100X (Fig. 3); 39% simulated stress reduction (text) vs 71% normalized (Fig. 6/8); stiffener SUS 430 (Table II) vs SUS 403 (text); Fig. 7 panel temperatures (25 / peak 240 / 25 C) vs caption (25/125/260 C).
- Not reported: bump/TSV/C4 dimensions; UF and adhesive product names and properties; lid metal, TIM, interposer size; assembly steps/conditions; cycle counts and sample sizes.
- Source problems: none. Running header reads "Module Stress COrrelation..."; title per batch file/body.

## ectc51529.2024.00392 (ECTC 2024, advanced_substrate)
- Status: distilled. process_flow_level full (has_process_flow yes).
- Rows: papers 1, test_vehicles 1, components 2, stack_layers 8, interconnects 1, process_flows 1, process_steps 19, electrical_interfaces 0, optical_interfaces 0, metrics 10, figures 8.
- TV: a = test_coupon, 4 inch Si wafer core with 20 um ABF GL-102 both sides, 90 C ICPCVD Si3N4/SiO2/Si3N4, damascene 5 um Cu pillars at 10 um pitch, 2x3 mm dummy dies Cu-Cu TCB bonded.
- Figures opened: page_02-05 renders; cand p02_fig1, p03_fig2, p04_fig3a, p04_fig4, p05_fig5a, p05_fig6a; manual re-crops p04 (Fig. 3, Fig. 4), p05 (Fig. 5(a), 5(b), 6(a)-(d), 6(e)); 300 dpi zooms of Fig. 1, 3(a), 4, 5(b).
- Key figures: f01 Fig. 4 cross_section (manual); f02 Fig. 5(b) cross_section (manual); f03 Fig. 3 cross_section (manual); f04 Fig. 1 process_flow (cand); f05 Fig. 6(a)-(d) micrograph (manual); f06 Fig. 2 micrograph (cand); f07 Fig. 6(e) mechanical_plot (manual); f08 Fig. 5(a) other (manual).
- Judgment calls: flow split into 19 steps from Fig. 1 + text, TCB split into align / formic acid clean / bond per Fig. 5(a); bond force 50/150 N as split (force_n left empty) and metrics.variant; interconnect row carries the 150 N best condition with note; measured SEM thicknesses (252.2 nm, 2.526-2.530 um, 511.5 nm) entered in stack_layers over the text approximations; package_class other (Si-core substrate with ABF build-up), carrier_size "4 inch".
- Conflicts logged: SiO2 ~3 um (text) vs 2.526-2.530 um (Fig. 3(a)) vs 2.505 um (Fig. 4 after recess); nitride ~250/~500 nm vs measured; overburden 2-3 um (text) vs 6-8 um (Fig. 1); ICPCVD (text) vs HDPCVD (Fig. 1); dishing ~40 nm vs <50 nm.
- Excluded: Table I and Table II (cited values, refs [1], [14], [15]); NCF TCB conditions of ref [11].
- Not reported: ABF lamination/cure and resist bake conditions; plating chemistry/current; pillar height; die thickness/material; bond electrical yield/resistance and reliability.
- Source problems: none.

## Validator output
```
uv run python scripts/validate_db.py --staging data/_staging/b097
0 errors, 0 warnings (data/_staging/b097)
```

## Schema gaps
- No field for a TV-level module (CoW) size distinct from interposer size (001c.147115 module 39x35 mm went to notes).
- No typed column for a non-temperature split value on a step (bond force 50/150 N): force_n left empty, sweep only in `split` text.
- figure_kind has no bonding-profile / process-recipe plot kind (Fig. 5(a) of ectc51529.2024.00392 entered as other).

## Audit findings and fixes (2026-10-20, ingest_audit_D)

| paper | row | severity | finding | outcome | change or reason |
|---|---|---|---|---|---|
| tcpmt.2025.3614186 | tcpmt.2025.3614186-b-i1 (pitch_um) | content_wrong | 55 um pitch is the Sec. II.A die-set value, not stated for the FE model; Fig. 6 geometry larger | fixed | Verified: Sec. III gives no model pitch; Fig. 6 re-crop scale bar about 224 px per 0.100 mm, pillar centres about 307 px apart (about 137 um). pitch_um cleared, override pitch_um:design_target dropped, note rewritten; 55 um die-set pitch added to a-c1 notes and evidence entry; conflict entry added for b-i1 pitch_um. |
| tcpmt.2025.3614186 | evidence entry tcpmt.2025.3614186-b-m10 (unit) | minor | MJ/m2/cycle unit entry pointed at the Andersson fatigue-life row | fixed | Verified b-m10 unit is cycles (Fig. 18); entry moved to b-m7 and matching entries added for b-m8, b-m9 (Fig. 16). |
| tcpmt.2025.3614186 | tcpmt.2025.3614186-f02 (shows) | minor | "1 mm pitch" not in the X-ray image or caption | fixed | Verified: Fig. 3 X-ray has no labels; caption has no pitch. shows = "X-ray image of BGA solder joint array of 100x100 mm glass substrate assembled on 150x150 mm PCB". |

Revisions recorded in evidence/tcpmt.2025.3614186.yaml (revisions list).

Validator after fixes:
```
uv run python scripts/validate_db.py --staging data/_staging/b097
0 errors, 0 warnings (data/_staging/b097)
```

## Coordinator figure fix (2026-10-20): clipped candidate bboxes

A pixel scan of every candidate-bbox figure row found content continuing below the bbox bottom (figure_candidates.py clips raster images, typically by about 0.012 of page height). Each bbox below was extended to the first blank gap under the image (checked on contact sheets; captions excluded) and set to bbox_source manual, cand_id empty.

| fig_id | page | old bbox | new bbox |
|---|---|---|---|
| 001c.147115-f01 | 2 | 0.5229,0.31,0.932,0.4552 | 0.5229,0.31,0.932,0.4685 |
| 001c.147115-f04 | 3 | 0.0699,0.1792,0.4771,0.2274 | 0.0699,0.1792,0.4771,0.2382 |
