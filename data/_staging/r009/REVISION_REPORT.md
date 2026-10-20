# Revision report r009 (2026-10-19)

Mode: audit_fix_and_figures.

Validator: `uv run python scripts/validate_db.py --staging data/_staging/r009` -> `0 errors, 0 warnings (data/_staging/r009)`.

Crops:
- All 67 figure rows were re-rendered from page + bbox (`crop_figures.py --staging`, scratch only).
- Every added row's crop was opened: the candidate png for candidate rows, the scratch re-crop for manual rows.

Logging: every change is in `evidence/<paper_id>.yaml` under `revisions:`. That includes the sibling groups kept unchanged, which are logged with change "none (kept)".

Which audits name these papers:
- audit_x1 names 00091 (item 15) and 00150 (item 10).
- audit_x2B names 00154 (defect 4, plus the sample and figure tables).
- audit_x2A names none of the five papers.

Unchanged: process-flow rows, every existing figure bbox, and every row of 00091's figures.

| paper | rows changed outside figures | figures before -> after |
|---|---|---|
| ectc51909.2023.00091 | 1 (edited) | 5 -> 5 |
| ectc51909.2023.00135 | 2 (1 deleted, 1 edited) | 6 -> 16 |
| ectc51909.2023.00150 | 1 (edited, notes/locator only) | 6 -> 15 |
| ectc51909.2023.00153 | 0 | 6 -> 17 |
| ectc51909.2023.00154 | 5 (4 edited, 1 added) | 6 -> 14 |

## ectc51909.2023.00091 (audit x1)

Audit items:
- x1 item 15: papers.notes was over 30 words. Applied.
  - The note was 31 words; it is now 27.
  - Dropped "TSMC" (the org is already in `orgs`), "and" and "name". The content is unchanged.

Sibling groups: none listed.

Figures: no additions.
- The existing set already holds every schematic/image of this paper's build (Fig. 4, 6, 7) and both tables.
- Not added:
  - Fig. 1: a generic CoWoS-S drawing, not this build.
  - Fig. 2: roadmap.
  - Fig. 3: the 5th-generation CoWoS photo from ref [5].
  - Fig. 5: the insertion-loss plot from ref [6].
  - All four were already listed as excluded in evidence.

Rank order (unchanged): f01 Fig. 4 stack_schematic | f02 Fig. 6 stack_schematic | f03 Fig. 7 stack_schematic | f04 Table 1 |
f05 Table 2.

## ectc51909.2023.00135 (no audit)

Audit items: none.

Sibling groups (Table II on p.4 has three result columns: TV1 100 um, TV2 100 um, TV2 50 um):
- a-m3 / b-m5 / c-m1 (MSL4 Pass): genuine per-TV results, each in its own column. Kept.
- a-m4 / b-m6 / c-m2 (uHAST 264 h Pass): genuine per-TV. Kept.
- a-m5 / c-m3 (TCG 1000 cycles Pass; b-m7 is Fail): genuine per-TV. Kept.
- a-m6 / b-m8 / c-m4 (HTS 1000 h Pass): genuine per-TV. Kept.
- a-m12 / b-m15 (20% corner-stress reduction, interposer 100 -> 50 um): a copy.
  - p.3 Sec. III.E gives one number "for both test vehicles". Per-TV values exist only as the Fig. 9 bars, which are already in a-m10/a-m11 and b-m13/b-m14.
  - b-m15 deleted.
  - a-m12: scope -> "applies to TVs a, b"; notes updated.

Figures added (crops opened):
- Fig. 12, cross_section, candidate p04_fig12 (TV1 location A)
- Fig. 11, top_view_layout, candidate p04_fig11 (cross-section locations A/B)
- Fig. 13, cross_section, candidate p05_fig13 (TV1 location B)
- Fig. 14, cross_section, candidate p05_fig14 (thin-interposer TV2 = TV c)
- Fig. 6, cross_section, candidate p03_fig6 (TV2 UF crack)
- Fig. 5, cross_section, candidate p03_fig5 (interposer corner with inset drawing; TV not stated)
- Fig. 2, package_photo, candidate p02_fig2 (TV not stated)
- Table I, data_table, manual 0.09,0.32,0.47,0.51 (the candidate cut the table after the HBM2E row)
- Fig. 8, simulation_result, candidate p03_fig8 (source of a-m9, b-m12)
- Fig. 9, simulation_result, candidate p04_fig9 (source of a-m10/11, b-m13/14)

New rank order:
- f01 Fig. 12 cross_section (new)
- f02 Fig. 3 top_view_layout (was f02)
- f03 Fig. 11 top_view_layout
- f04 Fig. 1 stack_schematic (was f01)
- f05 Fig. 13 cross_section
- f06 Fig. 14 cross_section
- f07 Fig. 7 cross_section (was f05)
- f08 Fig. 6 cross_section
- f09 Fig. 5 cross_section
- f10 Fig. 2 package_photo
- f11 Fig. 4 warpage_plot (was f03)
- f12 Table II (was f04)
- f13 Table I
- f14 Fig. 8 simulation_result
- f15 Fig. 9 simulation_result
- f16 Fig. 10 simulation_result (was f06)

Rank 1 moved from the stack schematic to the cross-section image (rule: cross-section image > stack schematic).

## ectc51909.2023.00150 (audit x1)

Audit items:
- x1 item 10: "the 150 um C4 of ... 00150-a-i3 ... typed microbump". Disputed; ic_type is kept as microbump.
  - Evidence: p.1 Fig. 1(b) labels the "FPGA / AI Chip" joints "Micro bump". The Abstract describes the whole three-chip integration as "Cu-pillar micro-bump solder joint".
  - The paper never calls the AI-chip bumps C4. C4 appears only in the p.1 Fig. 1(a) comparison drawing and in generic remarks on p.2 and p.4.
  - The audit's proposed rule also includes "as named uBump", which applies here.
  - Changed only the notes and the locator, which now cites p.1 Fig. 1(b). The disputed decision is logged in revisions.

Sibling groups: none listed.

Figures added (crops opened):
- Fig. 12, process_flow, candidate p05_fig12.
  - reprinted = yes (from ref [12]). It is the UF-at-temperature process the paper says it uses.
  - Its temperatures stay excluded in evidence.
- Fig. 11, cross_section, manual 0.105,0.522,0.48,0.637 (the candidate clipped the bottom)
- Fig. 5, cross_section, manual 0.10,0.62,0.49,0.87 (candidate clipped the micrographs; source of a-m10..m12)
- Fig. 7, cross_section, manual 0.15,0.088,0.44,0.241 (candidate clipped the bottom; source of a-m13)
- Fig. 8, cross_section, manual 0.09,0.595,0.49,0.745 (candidate clipped the micrographs; source of a-m14)
- Fig. 14, package_photo, manual 0.09,0.088,0.485,0.215 (candidate cut the panel labels)
- Fig. 3, warpage_plot, manual 0.10,0.105,0.49,0.205 (candidate clipped the axis labels; includes the 3(b) drawing; source of a-m1)
- Fig. 6, warpage_plot, manual 0.53,0.33,0.90,0.55 (candidate cut the (c)/(d) labels; source of a-m6, a-m7)
- Fig. 9, other, manual 0.505,0.265,0.905,0.493 (candidate cut the axis titles; source of a-m8)

Not added: Table II, a text list of issues with no build or values.

New rank order:
- f01 Fig. 13 cross_section
- f02 Fig. 10 process_flow (was f03)
- f03 Fig. 12 process_flow
- f04 Fig. 2 top_view_layout (was f05)
- f05 Fig. 1 stack_schematic (was f02)
- f06 Fig. 11 cross_section
- f07 Fig. 5 cross_section
- f08 Fig. 7 cross_section
- f09 Fig. 8 cross_section
- f10 Fig. 14 package_photo
- f11 Table I (was f04)
- f12 Fig. 4 warpage_plot (was f06)
- f13 Fig. 3 warpage_plot
- f14 Fig. 6 warpage_plot
- f15 Fig. 9 other

## ectc51909.2023.00153 (no audit)

Audit items: none name this paper. audit_x2B section 5 lists 00153-f06 (Fig. 11, bars 15/25/20/35) as verified correct; that row is now f13 and is unchanged.

Sibling group b-m2 / d-m2 (bump-to-bump space 5 um): genuine per-TV values, so both are kept.
- p.2 Fig. 5 gives A/B per TV: TV-2 is 15/10 um and TV-4 is 10/5 um.
- p.4 Sec. III.C names TV-2 and TV-4 separately.

Figures added (crops opened):
- Fig. 8, process_flow, candidate p03_fig8 (conventional vs fluxless proposal; TVs a-e)
- Fig. 3, top_view_layout, candidate p02_fig3
- Fig. 13, cross_section, candidate p05_fig13 (source of a-d m4)
- Fig. 9, micrograph, candidate p04_fig9
- Fig. 2, package_photo, candidate p02_fig2
- Fig. 6, micrograph, candidate p03_fig6 (example; TV not stated)
- Fig. 14, micrograph, candidate p05_fig14 (source of e-m3)
- Fig. 7, micrograph, candidate p03_fig7 (source of e-m1, e-m2)
- Table II, data_table, manual 0.09,0.355,0.488,0.525 (no candidate)
- Table III, data_table, manual 0.09,0.183,0.49,0.303 (no candidate; TCB set conditions)
- Table IV, data_table, manual 0.51,0.572,0.9,0.706 (no candidate; fluxless TCB conditions)

Not added: Fig. 1. It is an introductory IR example of flux-residue defects, the build is not specified, and it is already excluded in evidence.

New rank order:
- f01 Fig. 10 cross_section
- f02 Fig. 4 process_flow (was f03)
- f03 Fig. 8 process_flow
- f04 Fig. 3 top_view_layout
- f05 Fig. 5 stack_schematic (was f02)
- f06 Fig. 13 cross_section
- f07 Fig. 9 micrograph
- f08 Fig. 2 package_photo
- f09 Fig. 12 micrograph (was f05)
- f10 Fig. 6 micrograph
- f11 Fig. 14 micrograph
- f12 Fig. 7 micrograph
- f13 Fig. 11 other (was f06)
- f14 Table I (was f04)
- f15 Table II
- f16 Table III
- f17 Table IV

## ectc51909.2023.00154 (audit x2B)

Audit items:
- x2B defect 4: gap_um = 60 on a-c1..a-c4. Applied.
  - p.2 Sec. II gives one statement: "The gap of the each chip was 60um".
  - gap_um on c1, c2, c3 and c4: 60 -> empty. The c1 note now points to the metric below.
  - Added a-m27: geometry, "chip-to-chip gap on Si interposer", 60 um, design_target, text, p.2 Sec. II, scope "all dies on interposer".
- x2B section 4, f01 printed duplicate caption and f05 Fig. 8 labels: verified OK, no change. Those rows are still f01, and f05 is now f11.
- x2B section 5, the a-m21..m24 fail counts "0F/30" sit in value_text: not applicable.
  - The interim schema has no n_fail/n_total, and n_samples = 30 is already set. No change.

Sibling groups: none listed.

Figures added (crops opened):
- Fig. 5, top_view_layout, candidate p03_fig5 (UF dispense pattern + photo)
- Fig. 10, cross_section, manual 0.13,0.088,0.445,0.41 (the candidate spanned a page quadrant from the page edge; source of a-m17, a-m18)
- Fig. 13, cross_section, manual 0.10,0.185,0.48,0.405 (candidate from the page edge; T-zone UF crack, context of a-m24)
- Fig. 7, xray_csam, candidate p04_fig7 (SAT; source of a-m20)
- Fig. 6, other, candidate p04_fig6 (void squeeze-out photos; source of a-m19)
- Fig. 12, simulation_result, manual 0.52,0.645,0.895,0.84 (candidate ran to the page edge; context of a-m25)
- Fig. 9, other, candidate p04_fig9 (source of a-m16..m18)
- Table 1, data_table, manual 0.508,0.762,0.885,0.883 (candidate omitted the title)

Not added: Fig. 1, the interposer-size trend from ref [3], which is already excluded.

New rank order:
- f01 Fig. 11 cross_section
- f02 Fig. 4 process_flow (was f03)
- f03 Fig. 5 top_view_layout
- f04 Fig. 2 stack_schematic (was f02)
- f05 Fig. 3 stack_schematic (was f04)
- f06 Fig. 10 cross_section
- f07 Fig. 13 cross_section
- f08 Fig. 7 xray_csam
- f09 Fig. 6 other
- f10 Fig. 12 simulation_result
- f11 Fig 8 warpage_plot (was f05)
- f12 Fig. 9 other
- f13 Table 1
- f14 Table 2 (was f06)

## Notes

- Ranking follows SKILL.md step 5 literally. After rank 1 come the process flow and the layout figures, then the stack schematics and other images. Under this order a stack schematic (00135 Fig. 1, 00150 Fig. 1, 00154 Fig. 2) can rank below a layout drawing.
- Several `candidates.json` boxes for these papers clip about 0.01 page height at the bottom of image figures (00150 Figs. 3, 5-9, 11, 14). Those rows use manual boxes.
