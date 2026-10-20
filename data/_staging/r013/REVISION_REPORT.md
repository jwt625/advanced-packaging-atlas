# Revision report r013 (2026-10-19)

Mode: audit_fix_and_figures. Validator: `uv run python scripts/validate_db.py --staging data/_staging/r013` ->
`0 errors, 0 warnings (data/_staging/r013)`.

Checks:
- All 50 figure rows were re-cropped from page + bbox (`crop_figures.py --staging`, scratch only; 50 crops written).
- Every added crop was opened: the candidate png for candidate rows, the scratch re-crop for manual rows.
- Every change is logged in `evidence/<paper_id>.yaml` under `revisions:` (sources audit_x1, sibling_dup, figures).
- Existing figure bboxes are unchanged; no audit named a bbox defect in these papers.

Audit coverage (searched full id and short id in audit_x1, audit_x2A, audit_x2B):
- vlsitechnologyandcir46769.2022.9830182: audit_x1 item 11, audit_x2B section 5.
- The other four papers: no audit hit. Sibling groups only.
- Outside the three named audits: process_flow_review_B lists 11577576 (grade "complete", 1 miss = POR-not-MTV4-specific, already noted on a-s01). Not acted on.

| paper | rows changed outside figures | figures before -> after |
|---|---|---|
| vlsitechnologyandcir46769.2022.9830182 | 5 (interconnects edited) | 6 -> 8 |
| tcpmt.2025.3557745 | 0 | 6 -> 13 |
| tcpmt.2026.3708099 | 7 (3 deleted, 4 edited) | 6 -> 11 |
| vlsitechnologyandcir46783.2024.10631441 | 2 (locators edited) | 6 -> 10 |
| vlsitechnologyandcir65830.2026.11577576 | 3 (2 deleted, 1 edited) | 6 -> 8 |

## vlsitechnologyandcir46769.2022.9830182 (audit_x1, audit_x2B)

Audit items:
- x1 item 11, SoIC bonds typed `die_to_interposer` / `die_stack_internal`: applied.
  - Rows: -a-i1, -a-i2, -c-i1, -e-i1, -i-i1. Level changed to `die_to_die_hybrid`. bonding_method set to `unspecified` (was empty on 4 of the 5).
  - Each row's notes now end "D2W vs C2C not stated."
  - Why the generic level: p.1 says only that chiplets and cubes are "face-to-face bonded to the interposer" and that the bond is also used inside the cube. Neither die_to_wafer nor C2C is stated, so `die_to_wafer_hybrid` would be invented.
  - Microbump rows -d-i1, -f-i1, -j-i1 are not hybrid and are unchanged.
- x2B section 5, has_process_flow = yes with 1 step (-a-s01): reviewed, not applied.
  - The audit lists the count and states no defect. Its fix is a schema change: a three-valued flag, or >= 3 steps for yes.
  - Full text: the only process statement is the face-to-face SoIC bonding sentence (p.1 Sec. Technology and Architecture). There is no fabrication sequence.
  - The has_process_flow calibration is a pending decision, so the flag and the row are unchanged. This matches r000 and r011.
  - Under a ">= 3 steps" rule this paper would become `no`.

Sibling groups: none listed.

Figures added (crops opened):
- Fig. 2, top_view_layout, manual 2:0.082,0.288,0.490,0.512. Four SoIC_H floorplans. Candidate p02_fig2 merged the references, Fig. 1 and Fig. 2.
- Fig. 5, simulation_result, manual 2:0.505,0.075,0.925,0.215. Lite I/O driver schematic plus the energy/bit plot (~66% label, source of -c-m3). Candidate p02_fig5 clipped the (a)/(b) labels.

New rank order:
1. f01 Fig. 1, stack_schematic (with SEM)
2. f02 Fig. 2, top_view_layout (new)
3. f03 Fig. 8, data_table with stack drawings (was f05)
4. f04 Fig. 4 (was f02)
5. f05 Fig. 6 (was f04)
6. f06 Fig. 7
7. f07 Fig. 3 (was f03)
8. f08 Fig. 5 (new)

## tcpmt.2025.3557745 (no audit; sibling groups only)

Sibling groups: all four are genuine per-build values. Each is a separate column cell for Sample #1/#2/#3 in a table, so no change.
- -a-m7 / -b-m7 / -c-m7, footprint 9 mm2: p.5 Table II "Footprint area" row, 9 mm2 in each sample column.
- -b-m4 / -c-m4, DC resistance 85 mOhm: Table II "Measured vs. model DCR", 85 mOhm for #2 and #3. Same in Table IV.
- -b-m8 / -c-m8, Im 3.5 A: p.7 Table IV, separate rows for Samples #2 and #3.
- -b-m12 / -c-m12, Q 11: Table IV, separate rows. Table V repeats 11 for #3.

Figures added (crops opened):
- Fig. 2, stack_schematic, manual 3:0.075,0.068,0.500,0.335. Two package integration approaches (cores in substrate vs composite build-up). No candidate.
- Table I, stack_schematic, candidate p04_tablei. Cross-section and top-view drawings of the single, parallel and series configurations.
- Fig. 1, block_diagram, candidate p01_fig1. Power delivery architecture cross-sections. Context only, so tv_ids is empty.
- Fig. 8, electrical_plot, candidate p07_fig8. Large-signal waveforms, losses and efficiency (-b-m14, -c-m13).
- Fig. 7, electrical_plot, candidate p06_fig7. Small-signal R and L spectra, fsat 90 MHz (-b-m13).
- Table V, data_table, manual 8:0.075,0.072,0.495,0.215. Measured vs anticipated (-c-m14..m16). Candidate p08_tablev held only the title.
- Table III, data_table, candidate p06_tableiii. Core material properties (in the -c2 component notes).

New rank order:
1. f01 Fig. 6, cross_section
2. f02 Fig. 5, cross_section
3. f03 Fig. 3, stack_schematic (was f05)
4. f04 Fig. 4, process_flow (was f03)
5. f05 Fig. 2 (new)
6. f06 Table I (new)
7. f07 Fig. 1 (new)
8. f08 Table II (was f04)
9. f09 Table IV (was f06)
10. f10 Fig. 8 (new)
11. f11 Fig. 7 (new)
12. f12 Table V (new)
13. f13 Table III (new)

## tcpmt.2026.3708099 (no audit; sibling groups only)

Sibling groups:
- -a-m12 / -b-m8 / -c-m10 / -d-m11, via depth deviation +/-10 um: copy, fixed.
  - Source: one sentence for the DRIE etch of all wafers, "achieved via depths exhibited a +/-10-um deviation from the target 300-um depth" (p.2 Sec. II.A). No per-build values.
  - Kept -a-m12 with scope "applies to TVs a, b, c, d". Deleted -b-m8, -c-m10, -d-m11.
- -a-m14 / -c-m12 / -d-m12, voids after 300 C anneal: genuine, kept.
  - p.5 Sec. III.C names the 0.4-ASD, 0.5-ASD and 0.5-ASD thinned samples separately. The 0.4-ASD thinned sample is not named.
  - Locators narrowed:
    - -a-m14 "p.5 Sec. III.C; p.5 Fig. 10" -> "p.5 Sec. III.C" (Fig. 10 has no 0.4-ASD panel).
    - -c-m12 -> "p.5 Sec. III.C; p.5 Fig. 10(c)".
    - -d-m12 -> "p.5 Sec. III.C; p.5 Fig. 10(d)".

Figures added (all candidates, crops opened):
- Fig. 1, top_view_layout, p02_fig1. TSV distribution map in one SiP unit.
- Fig. 8, micrograph, p05_fig8. EBSD maps of TSV cross sections (-a-m5.., -c-m6.., -d-m9).
- Fig. 3, mechanical_plot, p03_fig3. Profilometer maps/profiles (cited by the protrusion rows).
- Fig. 5, mechanical_plot, p04_fig5. Micro-Raman stress maps (cited by the stress rows).
- Fig. 7, simulation_result, p04_fig7. FEM max deformation (-a-m7, -b-m7, -c-m9, -d-m10).

New rank order:
1. f01 Fig. 2, cross_section
2. f02 Fig. 1, layout (new)
3. f03 Fig. 10, micrograph (was f06)
4. f04 Fig. 8 (new)
5. f05 Table I (was f02)
6. f06 Fig. 4 (was f03)
7. f07 Fig. 3 (new)
8. f08 Fig. 5 (new)
9. f09 Fig. 6 (was f04)
10. f10 Fig. 9 (was f05)
11. f11 Fig. 7 (new)

## vlsitechnologyandcir46783.2024.10631441 (no audit; sibling groups only)

Sibling groups:
- -a-m18 / -b-m8, "no oxygen signal detected" (EDS): genuine, kept.
  - Fig. 8 has a separate TEM/EDS panel per fill: (a) TiN/W and (b) Mo. The caption states the result for both.
  - Locators narrowed to "p.2 Fig. 8(a); ..." and "p.2 Fig. 8(b); ...".

Figures added (manual, no usable candidate, crops opened):
- Fig. 4, cross_section, 2:0.472,0.298,0.675,0.472. XTEM and EDS of Mo-filled slit nTSVs (TV b). Its only build image besides Fig. 8.
- Fig. 8, cross_section, 2:0.553,0.503,0.948,0.680. TEM/EDS at the nTSV/BSM1 interface for both fills (-a-m18, -b-m8).
- Fig. 5, other, 2:0.055,0.492,0.215,0.668. Overlay wafer maps (-a-m9). Candidate p02_fig5 merged Fig. 5 and Fig. 7.
- Fig. 10, simulation_result, 2:0.724,0.722,0.952,0.860. Kelvin-resistance sensitivity plot (-a-m19).

New rank order:
1. f01 Fig. 3, cross_section
2. f02 Fig. 4, cross_section (new)
3. f03 Fig. 2, process_flow (was f02)
4. f04 Fig. 1, layout (was f03)
5. f05 Fig. 7
6. f06 Fig. 8 (new)
7. f07 Fig. 5 (new)
8. f08 Fig. 9 (was f04)
9. f09 Fig. 6
10. f10 Fig. 10 (new)

## vlsitechnologyandcir65830.2026.11577576 (no audit; sibling groups only)

Sibling groups:
- -b-m4 / -c-m5 / -d-m5, "no significant difference among the three" warpage: copy, fixed.
  - Source: one comparative sentence (p.1, "package warpage analysis showed no significant differences ... (Fig. 7)"). No per-package values; the Fig. 7 warpage axis is unlabelled.
  - Kept -b-m4 and appended "; applies to TVs b, c, d" to its scope. Deleted -c-m5 and -d-m5.

Figures added (manual, crops opened):
- Fig. 7, warpage_plot, 3:0.505,0.062,0.935,0.302. Package warpage contour plus diagonal scan (-b-m4). Candidate p03_fig7 clipped the (b) label.
- Fig. 2, other, 2:0.072,0.372,0.492,0.606. Development direction: stack count, normalized chip thickness, C2C BLT (-a-m6, -a-m7). No candidate.

Not added: Table I (HBM generation roadmap: capacity, IO, bandwidth, package size). It is a generic roadmap and no row cites it.

New rank order:
1. f01 Fig. 3, SEM + C-SAM
2. f02 Fig. 1, process_flow
3. f03 Fig. 5, stack_schematic
4. f04 Fig. 8 (was f05)
5. f05 Fig. 4 (was f04)
6. f06 Fig. 6
7. f07 Fig. 7 (new)
8. f08 Fig. 2 (new)

## Issues
- The has_process_flow calibration for 9830182 (1 step) is deferred to the pending process-flow decision.
- The schema has no generic hybrid level for an unstated D2W/C2C bond. `die_to_die_hybrid` + `unspecified` is used as the interim fix.
- Deleted metric ids leave gaps in the numbering: 3708099 -b-m8, -c-m10, -d-m11 and 11577576 -c-m5, -d-m5. No other row or evidence entry referenced them.
