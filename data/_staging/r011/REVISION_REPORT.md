# Revision report r011 (2026-10-19)

Mode: audit_fix_and_figures. Validator: `uv run python scripts/validate_db.py --staging data/_staging/r011` ->
`0 errors, 0 warnings (data/_staging/r011)`.

Checks:
- All 50 figure rows were re-cropped from page + bbox (`crop_figures.py --staging`, scratch only).
- I opened every added crop: the candidate png for candidate rows, the scratch re-crop for manual rows.
- Every change is logged in `evidence/<paper_id>.yaml` under `revisions:`. Figure changes use source `figure_rule`, as in r006.

Audit coverage:
- audit_x1 names 00307 and 00333.
- audit_x2B names 10457909.
- audit_x2A names none of the five papers.
- 11392132 and 10712070 have sibling groups only.

| paper | rows changed outside figures | figures before -> after |
|---|---|---|
| ectc51909.2023.00307 | 1 (papers.notes) | 6 -> 9 |
| ectc51909.2023.00333 | 1 (papers.notes) | 6 -> 7 |
| eptc59621.2023.10457909 | 5 (1 TV, 4 metrics edited) | 6 -> 10 |
| eptc67330.2025.11392132 | 6 (2 edited, 4 deleted) | 6 -> 12 |
| estc60143.2024.10712070 | 3 (1 edited, 2 deleted) | 6 -> 12 |

## ectc51909.2023.00307 (audit_x1)

Audit items:
- x1 item 15, papers.notes over 30 words (was 32): applied. Trimmed to 29 words, with "OCR text" added: TEXT_LAYER_WARNING.md exists and BATCH_INSTRUCTIONS asks for the flag.
- x1 item 14, process steps with numeric conditions under basis `stated` (two rows): not applicable.
  - a-s14: temp_c 149.85 (423 K stage temperature, p.2 Sec. II) already carries `temp_c:design_target`.
  - a-s22: temp_c 179.85 / time_s 3600 (453 K, 1 h, p.2 Sec. II) already carry `temp_c:design_target;time_s:design_target`.
  - The numeric cells are therefore design_target, and the K -> C conversions are in `derived`. Logged with change "none".
- x1 item 1, the text-layer recheck pipeline: not applicable to rows. This paper is the audit's own example of a true number-only shift. text.md is OCR, and the numbers were already read from the page images.
- x2B section 5, f03 (Fig. 3) bbox area 63%: the audit opened it and found it correct. No change.

Sibling groups: none listed.

Figures added (crops opened):
- Fig. 2, stack_schematic, candidate p02_fig2. BBM layer in a two-tier 3D-IC, the paper's structure drawing.
- Fig. 4, micrograph, candidate p04_fig4. SEM of the Si burrs at the TSV hole (context of a-m4, a-s10/s11).
- Table I, data_table, manual `4:0.085,0.262,0.468,0.466`. Candidate p04_tablei merges Table I with Fig. 5. Source of a-s19.

Not added: Fig. 1. It is a generic power-integrity illustration of a conventional 3D IC (IR drop, di/dt noise), not this build.

New rank order: f01 Fig. 9 cross_section | f02 Fig. 3 process_flow (was f03) | f03 Fig. 8 cross_section (was f02) |
f04 Fig. 2 stack_schematic | f05 Fig. 6 micrograph (was f04) | f06 Fig. 4 micrograph | f07 Fig. 7 warpage_plot (was f05) |
f08 Fig. 5 other (was f06) | f09 Table I data_table.

## ectc51909.2023.00333 (audit_x1)

Audit items:
- x1 item 15, papers.notes over 30 words (was 32): applied. Trimmed to 28 words; the content is unchanged.
- x1 item 14, process step with a numeric condition under basis `stated` (one row): not applicable.
  - a-s07: temp_c 70 (hot roller, p.4 Sec. III.C) already carries `temp_c:design_target`. Logged with change "none".

Sibling groups: none listed.

Figures added (crop opened):
- Fig. 2, stack_schematic, candidate p02_fig2. Generic die-in-cavity height-mismatch drawings; paper-level (no tv_ids), and the note says it is not the built TV.

Not added: Fig. 1. It is an ARC roll/wafer/panel photo credited to ref [5]: material only, not this build.

New rank order: f01 Fig. 8 cross_section | f02 Fig. 3 process_flow | f03 Fig. 4 cross_section | f04 Fig. 6 cross_section |
f05 Fig. 5 micrograph | f06 Fig. 7 package_photo | f07 Fig. 2 stack_schematic. The existing six are unchanged.

## eptc59621.2023.10457909 (audit_x2B)

Audit items:
- x2B defect 2, `technology_name` M-series on the real-panel TV -c: applied.
  - Checked p.4 Sec. 4 and Fig. 10. The real 600x600 mm sample is never named as M-series. The match rests only on the Fig. 10 Simul. values (-1.37/-2.81/-7.62), which equal the M-series curve of Fig. 8.
  - Change: -c technology_name "M-series" -> empty. The note now reads "Inferred (not named in paper): M-series ...". Rule (l).
- x2B section 3, the baseline model run repeated within TV a: applied with the audit's interim fix (mark the baselines in variant).
  - a-m1, a-m4, a-m9 and a-m21 are all -7.62 mm. p.2 says every sweep is "based on standard modeling" (CPD 0.3 mm, 1.0X CTE and modulus), and Fig. 8 M-series Passivation 2 gives the same value.
  - Variants: "CPD 0.3 mm (baseline)", "CPD CTE 1.0X (baseline)", "CPD modulus 1.0X (baseline)", "Passivation 2 (baseline)".
  - Each note names the other three rows. No row was deleted, so each sweep can still be plotted on its own.
- x2B section 3, has_process_flow calibration on -c-s01/-c-s02 (two cure steps with no conditions): not applied.
  - This is a convention item, not a named row defect, and the has_process_flow decision is still pending.
  - The steps were performed on the real panel: warpage was measured after each cure (p.4 Fig. 10), and the order is given by Fig. 10. No performed=no or inferred-order fix applies.
- x2B section 4: rank 1 (Fig. 1 stack_schematic) was confirmed. Fig. 4/6/7 were called "secondary". Under the 2026-10-19 rule they are now added, because they carry extracted values.

Sibling groups: none listed.

Figures added (crops opened):
- Table 1, data_table, manual `1:0.500,0.483,0.905,0.616` (no candidate). Model layer thickness/CTE/modulus; source of the a-L01..L06 and a-c1..c3 values.
- Fig. 4, simulation_result, candidate p02_fig4_2. Source of a-m1..m3. Candidate p02_fig4 is the Fig. 3 region.
- Fig. 6, simulation_result, candidate p03_fig6. Source of a-m9..m13.
- Fig. 7, simulation_result, candidate p03_fig7. Source of a-m14..m18.

Not added:
- Fig. 2: an ANSYS GUI screenshot of a plain panel, with no labels or values.
- Tables 2-5: lists of split levels only. The levels already sit in metrics.variant, and the Table 5 vs Fig. 7 conflict is in evidence `conflicts`.

New rank order: f01 Fig. 1 stack_schematic | f02 Fig. 3 stack_schematic | f03 Fig. 9 stack_schematic | f04 Fig. 10 warpage_plot |
f05 Fig. 8 simulation_result | f06 Table 1 data_table | f07 Fig. 4 simulation_result | f08 Fig. 5 simulation_result (was f06) |
f09 Fig. 6 simulation_result | f10 Fig. 7 simulation_result.

## eptc67330.2025.11392132 (no audit)

Audit items: none.

Sibling groups:
- a-m1 / b-m1 / c-m1 ("working fluid active above ~2 W"): a copied claim. p.4 Sec. III.A says "for all cases ... begins to increase sharply above ... 2W". It is one statement with no per-case value.
  - Kept a-m1, with scope "applies to TVs a, b, c (all 400 um cases; one statement, p.4)".
  - Deleted b-m1 and c-m1.
- a-m2 / b-m2 / c-m2 (channel/total thickness ratio 37.5%): a copied claim. p.5 Sec. III.B states "Case #2 has a ratio of 150um / 400um (37.5%)", for Case #2 only.
  - Case #2 = TVs b (#2-1) and c (#2-2). The row stays on the first of them, b-m2, with scope "Case #2 (applies to TVs b, c ...); Case #1 has the same dimensions, ratio not stated for it".
  - Deleted a-m2 and c-m2.

Figures added (all candidates, crops opened):
- Fig. 1, xray_csam, p01_fig1.
  - (b) is this work's HSD image, which p.3 cites as a void-free SAT image of a good die.
  - (a) is reprinted from ref [8], as stated in notes. The row keeps reprinted = no because panel (b) is this build.
  - Case not stated, so the row is paper-level.
- Fig. 6, xray_csam, p03_fig6. SAT of Case #2 dies with bonding voids (TVs b, c); these dies were excluded from testing.
- Fig. 2, package_photo, p02_fig2. High-speed frames of the visualization sample (TV e; source of e-m1).
- Fig. 7, other, p04_fig7. Test-bench CAD and photos, including an HSD in the socket.
- Fig. 12, stack_schematic, p06_fig12. Concept SiP with the HSD bonded on the logic die; the note says it was not built.
- Fig. 11, thermal_plot, p05_fig11. Best case of each sample type (TVs a, c, d); referenced by c-m4 and d-m1.

Not added: Fig. 9. It is reprinted from ref [10] (liquid-film physics), not this build.

New rank order: f01 Fig. 4 micrograph | f02 Fig. 3 top_view_layout | f03 Fig. 5 package_photo | f04 Fig. 1 xray_csam |
f05 Fig. 6 xray_csam | f06 Fig. 2 package_photo | f07 Fig. 7 other | f08 Fig. 12 stack_schematic | f09 Table I data_table (was f04) |
f10 Fig. 8 thermal_plot (was f05) | f11 Fig. 10 thermal_plot (was f06) | f12 Fig. 11 thermal_plot.

## estc60143.2024.10712070 (no audit)

Audit items: none.

Sibling group a-m6 / b-m6 / c-m6 (bump height variation 0.6-1.0 um, center to edge): a copied claim.
- p.6 Sec. III.E: "noticed for all technological parameters ... overall height variation of (0.6 - 1.0) um". No per-variant value is given.
- Kept a-m6, with the scope prefixed "applies to TVs a, b, c". Deleted b-m6 and c-m6.

Figures added (crops opened):
- Fig. 8, cross_section, manual `4:0.530,0.785,0.925,0.905`.
  - The figure is split across pages. Panels (a,b) on p.4 (bump stack, Cu/SnAg voids; b-m5) were cropped.
  - Panels (c,d) on p.5 (undercut boxes, candidate p05_fig8) are left out, as stated in notes.
- Fig. 5, cross_section, manual `3:0.530,0.6625,0.925,0.895`.
  - The figure is split across pages. Panels (a-d) on p.3 were cropped.
  - Panels (e,f) on p.4 (candidate p04_fig5) are left out, as stated in notes. Source of a-m1/a-m2.
- Fig. 7, cross_section, candidate p04_fig7. Test 1 SEM; source of b-m1/b-m2.
- Fig. 9, cross_section, candidate p05_fig9. Test 2 SEM; source of c-m1/c-m2.
- Fig. 1, micrograph, candidate p01_fig1. Motivating SEM of over-etched bumps; paper-level, since the build is not one of the DOE wafers.
- Fig. 4, micrograph, candidate p03_fig4. Optical inspection after Cu and Ti etch; the wafer's variant is not stated.

Not added: Tables I and II. Their thicknesses and baseline etch times are repeated in full in Table III, which is already f12.

New rank order: f01 Fig. 6 cross_section | f02 Fig. 2 process_flow | f03 Fig. 8 cross_section | f04 Fig. 10 cross_section (was f06) |
f05 Fig. 5 cross_section | f06 Fig. 7 cross_section | f07 Fig. 9 cross_section | f08 Fig. 3 stack_schematic (was f03) |
f09 Fig. 1 micrograph | f10 Fig. 4 micrograph | f11 Table IV data_table (was f04) | f12 Table III data_table (was f05).

## Notes for the merge

- Existing figure bboxes are unchanged; no audit named a bbox defect in these papers.
- Process-flow rows are untouched. The has_process_flow calibration item for 10457909 waits for the pending decision.
- The deleted metric ids (11392132 a-m2, b-m1, c-m1, c-m2; 10712070 b-m6, c-m6) leave gaps in the numbering. No other row or evidence entry referenced them.
