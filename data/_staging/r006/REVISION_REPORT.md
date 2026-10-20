# Revision report r006 (2026-10-19)

Mode: audit_fix_and_figures. Validator: `uv run python scripts/validate_db.py --staging data/_staging/r006` ->
`0 errors, 0 warnings (data/_staging/r006)`. All 50 figure rows re-cropped from page + bbox
(`crop_figures.py --staging`, scratch only). Every added or changed crop was opened: the candidate png for
candidate rows, the scratch re-crop for manual rows. Every change is logged in `evidence/<paper_id>.yaml` under `revisions:`.

audit_x1 names none of the five papers. x2A names 00183. x2B names 00365.

| paper | rows changed outside figures | figures before -> after |
|---|---|---|
| ectc51846.2026.00183 | 3 (edited) | 6 -> 11 |
| ectc51846.2026.00187 | 0 | 6 -> 8 |
| ectc51846.2026.00336 | 2 (1 deleted, 1 edited) | 6 -> 7 |
| ectc51846.2026.00365 | 13 (edited: 7 TVs, 5 components, 1 metric) | 6 -> 9 |
| ectc51906.2022.00031 | 3 (2 deleted, 1 edited) | 6 -> 15 |

## ectc51846.2026.00183 (audit x2A)

Audit items:
- x2A defect 5: a-i1, a-i2 and a-i3 carry alignment_um 0.1 with `le`. Applied.
  - Checked p.3 Sec. III.B: "100 nm or less in 93% of cases". This is a pooled W2W result (Fig. 7) and does not depend on pitch.
  - On all three rows, alignment_um 0.1 -> empty, and qualifier `alignment_um:le` and override `alignment_um:measured` are removed.
  - Notes now point to a-m5, which already holds the 93% at <=100 nm.
  - The evidence `entries` and `derived` items for this cell are removed. `derived` is now an empty list.
- x2A section 4, cosmetic crop margins. Applied to all three; each bbox was re-cropped and opened.
  - f01 (Fig. 8): `0.0889,0.0108,0.5013,0.4629` (candidate) -> `0.10,0.088,0.50,0.463` (manual). Removes the blank page-top margin.
  - f03 (Fig. 4): `0.4935,0.7086,1.0,0.8228` (candidate) -> `0.56,0.715,0.85,0.818` (manual). x1 was 1.0.
  - Fig. 10 (was f04, now f07): `0.0,0.1418,0.5065,0.7326` (candidate) -> `0.105,0.168,0.47,0.72` (manual). Removes the x0=0 margin and the clipped body-text line at the top.
- x2A section 4, f05 Fig. 5 kind `other`: verified OK, no change.
- x2A section 6, Fig. 10 reads, the conflicts entries and s02..s08 matching Fig. 3: verified OK, no change.

Sibling groups: none listed.

Figures added (crops opened):
- Fig. 9, micrograph, candidate p04_fig9 (EDS maps of the bond)
- Fig. 6, xray_csam, manual. Candidate p03_fig6 started at y0 = 0.
- Fig. 13, stack_schematic, candidate p06_fig13 (stress-migration chain drawings)
- Fig. 7, other, candidate p03_fig7 (misalignment scatter, source of a-m5). The x-axis title is clipped in the source page itself.
- Fig. 15, reliability_plot, candidate p06_fig15 (EM plot, context of a-m64)

Not added:
- Fig. 1 (CIS roadmap), Fig. 2 (history from refs [8]-[12]) and Fig. 12 (ref [18]): reprinted or generic, and already excluded.
- Fig. 11 (chain-resistance CDFs): no value was extracted from it.

New rank order: f01 Fig. 8 cross_section | f02 Fig. 3 process_flow | f03 Fig. 4 stack_schematic | f04 Fig. 9 micrograph |
f05 Fig. 6 xray_csam | f06 Fig. 13 stack_schematic | f07 Fig. 10 electrical_plot (was f04) | f08 Fig. 5 other (was f05) |
f09 Fig. 7 other | f10 Fig. 14 reliability_plot (was f06) | f11 Fig. 15 reliability_plot.

## ectc51846.2026.00187 (no audit)

Audit items: none.

Sibling group a-m1 / b-m1 (100K-link chain yield, pitch 1000 nm, 210 C, 100%): genuine per-TV values, so both are kept.
- p.6 Fig. 6(a) plots separate FG Cu (circle) and Std Cu (diamond) points at 1000 nm. Both sit at 100%.
- The decision is logged in revisions with change "none".

Figures added (candidates, crops opened):
- Fig. 3, cross_section, p04_fig3 (TEM of bonded vias plus PED maps; context of a-m21, b-m6)
- Fig. 7, reliability_plot, p06_fig7 (350 C reliability; source of a-m22, a-m23, a-m26..a-m28)

Re-rank: rank 1 is now the Fig. 2 TEM cross-section rather than the Fig. 1 schematic (cross-section image > stack schematic).

New rank order: f01 Fig. 2 cross_section (was f02) | f02 Fig. 1 stack_schematic (was f01) | f03 Fig. 3 cross_section |
f04 Fig. 6 electrical_plot (was f03) | f05 Fig. 4 electrical_plot (was f04) | f06 Fig. 8 reliability_plot (was f05) |
f07 Fig. 7 reliability_plot | f08 Fig. 5 other (was f06).

## ectc51846.2026.00336 (no audit)

Audit items: none.

Sibling group a-m8 / b-m8 (heater/sensor active Si line length 5 um): a copied claim. Consolidated to one row.
- p.5 Sec. IV describes one set of dedicated thermal structures (Fig. 4(a)) with no per-scheme values.
- b-m8 is deleted.
- a-m8 is kept, with scope "applies to TVs a, b (dedicated thermal structures of both schemes)".

Figures added: Fig. 4, top_view_layout, candidate p05_fig4 (heater/sensor layout plus self-heating CDFs; source of a-m6, b-m6, a-m8). Crop opened.

Not added: none missing. All five figures and both tables are now rows.

New rank order: f01 Fig. 1 cross_section | f02 Table II process_flow | f03 Fig. 4 top_view_layout |
f04 Table I stack_schematic (was f05) | f05 Fig. 2 electrical_plot (was f03) | f06 Fig. 5 thermal_plot (was f04) |
f07 Fig. 3 electrical_plot (was f06).

## ectc51846.2026.00365 (audit x2B)

Audit items:
- x2B defect 3: numeric cells sit under row basis `stated` with no override. Applied, and extended to the paper's other numeric TV and component cells.
  - h: overrides += package_x_mm, package_y_mm, reticle_multiple, n_dies and n_hbm, each `:design_target`.
  - i: overrides += reticle_multiple:design_target and n_dies:design_target.
  - j and k: overrides += reticle_multiple:design_target. The existing `reticle_multiple:caption` is kept.
  - Same fix applied elsewhere in the paper:
    - a, f, g: overrides += n_dies:design_target.
    - Components a-c1, f-c1, g-c1, h-c1, i-c1: overrides += count:design_target.
    - h-c2 already carries count:derived.
  - No value changed.
- x2B section 3, g-m1 has statistic max plus a redundant `value:le`. Applied.
  - Verified that the d6 = 3.4 mm label in p.4 Fig. 6(a) is the largest label.
  - Qualifier cleared; value 3.4 and statistic max kept.
- x2B section 3, has_process_flow = yes on generic dispense/cure/CSAM rows (d-s01, e-s01..s03, f-s01, g-s01..s03): not applied.
  - The audit lists this as a convention item, not a defect.
  - The batch task defers process-flow restructuring to a pending decision. Flags and rows are unchanged.
- x2B section 4: verified OK. The f04 void labels and the f02/f05 candidates covering all panels are already noted.
- x2B section 4: "Fig. 8 secondary" is superseded by the 2026-10-19 key-figure rule, so Fig. 8 is now added. Fig. 1 is a roadmap reprinted from ref [7] and stays out.

Sibling groups: none listed.

Figures added (candidates, crops opened):
- Fig. 8, package_photo, p05_fig8a. The bbox covers panels (a) and (b), as noted in the row. TV i.
- Fig. 4, package_photo, p03_fig4 (flow-test fronts, TV d)
- Fig. 5, package_photo, p04_fig5 (void outline, TV f)

New rank order: f01 Fig. 3 cross_section | f02 Fig. 7 package_photo | f03 Fig. 9 package_photo (was f05) |
f04 Fig. 8 package_photo | f05 Fig. 6 xray_csam (was f04) | f06 Fig. 2 package_photo | f07 Fig. 4 package_photo |
f08 Fig. 5 package_photo | f09 Table I data_table (was f03).

## ectc51906.2022.00031 (no audit; OCR text, no candidates)

Audit items: none.

Sibling group b-m3 / c-m6 ("no dependence on distance from die edge"), with the same claim in a-m4: a copied claim. Consolidated to one row.
- p.5 Sec. III.D says "For every stack type, no link resistance dependence ... is observed". Values are given only as Fig. 12 series.
- b-m3 and c-m6 are deleted.
- a-m4 is kept, with scope "applies to TVs a, b, c" and a note that Fig. 12 plots D2W, 2-die and 5-die.

Figures added (all manual, read from page renders; every crop opened):
- Fig. 2, top_view_layout (die floor plan)
- Fig. 3, top_view_layout (edge daisy-chain close-up)
- Fig. 5, stack_schematic (LTxC stack)
- Fig. 1, package_photo (8-die stack photo)
- Fig. 9, xray_csam (D2W and 5-die CSAM)
- Fig. 11, electrical_plot (source of a-m1, a-m2)
- Fig. 8, other (void-free yield bars; source of c-m3, c-m4)
- Fig. 12, electrical_plot (source of a-m4)
- Fig. 14, electrical_plot (source of a-m5, d-m3, d-m4)

New rank order: f01 Fig. 7 cross_section | f02 Fig. 2 top_view_layout | f03 Fig. 3 top_view_layout |
f04 Fig. 6 cross_section (was f03) | f05 Fig. 4 stack_schematic (was f02) | f06 Fig. 5 stack_schematic |
f07 Fig. 1 package_photo | f08 Fig. 9 xray_csam | f09 Fig. 10 electrical_plot (was f04) | f10 Fig. 11 electrical_plot |
f11 Fig. 8 other | f12 Fig. 12 electrical_plot | f13 Fig. 13 electrical_plot (was f05) | f14 Fig. 14 electrical_plot |
f15 Table I data_table (was f06).

## Notes and issues

- Rank order follows SKILL.md step 5 literally: rank 1, then process flow, layout, other schematics/images, then plots/tables.
  - In 00031 the two layout drawings therefore rank above the second SEM cross-section (Fig. 6) and the stack schematics.
- 00187-a-i1 alignment_um 0.05 is the 95th-percentile overlay (x2A recommendation 5, alignment statistic). It was not named for this paper and is left unchanged; the existing conflicts entry documents it.
- Extending x2B defect 3 to n_dies, n_hbm and component counts is a judgment call: "apply the stated fix everywhere it applies" within the paper.
