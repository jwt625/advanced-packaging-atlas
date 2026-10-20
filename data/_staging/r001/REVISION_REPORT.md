# Revision report r001 (2026-10-19)

Mode: audit fixes + key figures. Validator: `uv run python scripts/validate_db.py --staging data/_staging/r001` -> 0 errors, 0 warnings.
Every change is logged in `evidence/<paper_id>.yaml` under `revisions:`. Audits searched: audit_x1_2026-10-18, audit_x2A_2026-10-19,
audit_x2B_2026-10-19 (full id and short id).

## ectc32696.2021.00166 (Intel HB, OCR text)

Audit items (x1):
| item | status | rows before -> after |
|---|---|---|
| 9: carrier wafer_300mm speculative | applied. p.5 Sec. V "full 300mm wafer" is a generic recess-tolerance sentence | -a carrier_format wafer_300mm -> empty, carrier_size_mm 300 -> empty; notes rewritten |
| 11 / sec. 2 enum: -b-i1 die_to_die_hybrid vs -a-i1 die_to_wafer_hybrid | applied (level only). Sec. V/Fig. 10 is the paper's only HB assembly flow (D2W); active chip still in fab, so bonding_method stays unspecified; note says inferred | -b-i1 level die_to_die_hybrid -> die_to_wafer_hybrid |
| 15: papers.notes > 30 words | applied | notes trimmed to 27 words, "OCR text" kept |
| sec. 5/6: count semantics (3,000,000 total), 1 um routing pitch | not applicable (schema gap); -b-i1 note now says "total count", -e-L01 note already holds the pitch | - |
| sec. 8 verified-OK items (Table 1, Fig. 6, excluded refs) | no change needed | - |

Sibling groups: none listed.

Figures (6 -> 11). Added (all manual, OCR paper has no candidates; crops opened):
- Fig. 7 p.5 top_view_layout (daisy-chain layout, TV a)
- Fig. 8 p.5 package_photo (fabricated passive chip with pad inset, TV a)
- Fig. 3 p.3 stack_schematic (F2F solder vs HB sketches, TVs c;d)
- Fig. 5 p.4 stack_schematic (side-by-side interposer section + top view, TV e)
- Fig. 4 p.3 block_diagram (D2D circuit + capacitance bars; carries c-m1 locator, TVs c;d)
Not added: Fig. 1 (generic pitch-scaling trend, already in evidence excluded).
New rank order: f01 Fig. 11 cross_section; f02 Fig. 10 process_flow; f03 Fig. 2 process_flow; f04 Fig. 7 top_view_layout;
f05 Fig. 9 top_view_layout; f06 Fig. 8 package_photo; f07 Fig. 3 stack_schematic; f08 Fig. 5 stack_schematic;
f09 Fig. 6 electrical_plot; f10 Fig. 4 block_diagram; f11 Table 1 data_table.

## ectc32696.2021.00174 (nepes 600 mm FOPLP)

Audit items (x1; x2B lists the same open item):
| item | status | rows before -> after |
|---|---|---|
| 2: Table 2 "Source: DECA" entered as results | applied (interim fix: move to excluded, delete TV -b). Verified p.3: caption "Usable Area Comparison. Source: DECA" | TV -b deleted; -b-m1..-b-m13 deleted; evidence excluded += Table 2 entry; papers.n_test_vehicles 6 -> 5; papers.notes "segmentation table" -> "Table 2 (DECA) excluded" |
| sec. 8 verified-OK (Table 4, Fig. 3 bars, BLR simulation basis, Yole/JCET/Techsearch excluded) | no change needed | - |

The text's own "1X vs 2X usable loss" sentence is a restatement of the DECA table; not entered.
Sibling groups: none listed.

Figures (6 -> 16). Added (all candidates, crops opened): Fig. 6 p.2 process_flow; Fig. 8 p.3 package_photo (600x600 panel);
Fig. 11 p.4 other (die-shift sketch); Fig. 12 p.4 micrograph (ball shear); Fig. 13 p.5 micrograph (AOI defects);
Fig. 15/16/17 p.5 xray_csam (CSAM post MSL1, uHAST, TC500); Fig. 10 p.4 warpage_plot (TTV/warpage maps);
Fig. 3 p.2 simulation_result (BLR, carries c/d/e/f-m1).
Not added: Fig. 1 (Techsearch/IZM reprint, generic chip-first vs chip-last), Fig. 2 (generic fan-out technology comparison
table, not this build), Table 1/Fig. 18/Fig. 20 (Yole/JCET sources, excluded), Fig. 19 and Table 6 (qualitative cost),
Table 2 (DECA, excluded), Table 3 (two spec lines already in a-m1..m3 pass_criterion).
f06 (Table 5) notes: removed the "6-figure cap" remark.
New rank order: f01 Fig. 14 cross_section; f02 Fig. 7 stack_schematic; f03 Fig. 5 process_flow; f04 Fig. 6 process_flow;
f05 Fig. 9 top_view_layout; f06 Fig. 8 package_photo; f07 Fig. 11 other; f08 Fig. 12 micrograph; f09 Fig. 13 micrograph;
f10 Fig. 15 xray_csam; f11 Fig. 16 xray_csam; f12 Fig. 17 xray_csam; f13 Fig. 10 warpage_plot; f14 Fig. 3 simulation_result;
f15 Table 4 data_table; f16 Table 5 data_table.

## ectc51529.2024.00049 (TSMC CoWoS-R 5.5x)

Audit items: none name this paper.

Sibling-identical groups:
| group | decision | rows before -> after |
|---|---|---|
| a-m4 / b-m2 / c-m1 "POC hammer test passed" | copy. p.4 Sec. VI: one sentence "passed POC hammer test on 7/8/9L", no per-build result | kept a-m4 with scope "applies to TVs a, b, c (9L, 8L, 7L)"; b-m2, c-m1 deleted |
| a-m5 / c-m8 (D2D UF1 1X) | genuine per-TV: Fig. 7 table gives separate 7L and 9L columns | kept |
| a-m6 / c-m9 (D2H UF1 0.99X) | genuine per-TV (Fig. 7 7L/9L columns) | kept |
| a-m7 / c-m10 (AD 0.95X) | genuine per-TV (Fig. 7 7L/9L columns) | kept |

Figures (6 -> 9). Added (candidates, crops opened): Fig. 6 p.3 micrograph (grayscale top-view image of HBM/SoC/IPD + DTC table;
imaging modality not stated, TV e); Fig. 4 p.3 data_table (SerDes ratios, e-m1..m5); Fig. 5 p.3 data_table (eye ratios, e-m6..m11).
Not added: Fig. 3(a) (line-density positioning chart, excluded in evidence).
New rank order: f01 Fig. 3(b) stack_schematic; f02 Fig. 2 top_view_layout; f03 Fig. 1 package_photo; f04 Fig. 6 micrograph;
f05 Fig. 7 simulation_result; f06 Table II; f07 Table III; f08 Fig. 4 data_table; f09 Fig. 5 data_table.

## ectc51529.2024.00092 (Absolics/YES LMCT TGV etch)

Audit items:
| item | status | rows before -> after |
|---|---|---|
| x1 item 14: numeric process conditions under basis stated (x5) | applied | -b-s01, -b-s03, -b-s04 basis stated -> design_target; -b-s02 basis -> design_target, override thickness_um:design_target dropped (redundant); -a-s03 basis -> design_target, override time_s:design_target dropped (time_s:figure_image kept) |
| x2B defects 5, 6 and f02 bbox (ectc51846.2026.00092) | not applicable: different paper (same short id) | - |

Sibling groups: none listed.

Figures (6 -> 9). Added (candidates, crops opened): Fig. 1 p.2 process_flow (LMCT concept, paper-level; the figure is cut at
the right edge in the paper itself); Fig. 2 p.2 stack_schematic (hourglass TGV parameter drawing, no values, paper-level);
Fig. 10 p.4 other (bath concentration, carries b-m7/b-m8).
Not added: Fig. 7 (APC control block diagram, no build structure, no values); Fig. 9 (temperature trend, axis labels illegible,
b-m5 value is from text).
Judgment: rank 1 stays Fig. 4 (top-view image of the actual etched vias) over Fig. 2 (generic via-shape drawing); f01 note updated.
New rank order: f01 Fig. 4 micrograph; f02 Fig. 6 process_flow; f03 Fig. 1 process_flow; f04 Fig. 2 stack_schematic;
f05 Fig. 5 micrograph; f06 Fig. 3 other; f07 Table 1 data_table; f08 Fig. 8 other; f09 Fig. 10 other.

## ectc51529.2024.00093 (DNP glass core TGV)

Audit items (x1; x2B lists a-m1 as open):
| item | status | rows before -> after |
|---|---|---|
| 6: a/b/c-i1 pitch 90/150/100 from generic Fig. 4 | applied (notes only). p.2: Fig. 4 shows "three types of via filling methods"; p.4 TC coupons give thickness and diameters but no pitch | a-i1, b-i1, c-i1 pitch_um 90/150/100 -> empty; override pitch_um:figure_image removed; values in notes; evidence entries now field notes; figure f01 tv_ids a;b;c -> empty (same reason) |
| 8: a/b/c-m1 "TC resistance change" with value 1000 cycles | applied (interim rename) | parameter -> "TC cycles without resistance change" (a-m1, b-m1, c-m1) |
| coverage sec. 6: top/bottom diameters only in notes | not applicable (schema gap: no diameter_bottom_um) | - |
| sec. 8 verified-OK (Fig. 6 table, Fig. 9 300 um, 0.48 vs 0.45 dB conflict) | no change needed | - |

Sibling groups: none listed.

Figures (6 -> 11). Added: Fig. 2 p.2 cross_section (manual 0.095,0.118,0.475,0.695; no candidate; SEM + X-ray CT, TV h);
Fig. 10 p.4 reliability_plot (candidate; conformal coupon SEM/schematic/plot, TV b); Fig. 3 p.2 package_photo (candidate; panels, TV i);
Fig. 1 p.1 stack_schematic (candidate; generic FCBGA location sketch, paper-level); Fig. 5 p.3 other (candidate; simulation
preconditions, TV g).
New rank order: f01 Fig. 4 cross_section; f02 Fig. 2 cross_section; f03 Fig. 9 reliability_plot; f04 Fig. 10 reliability_plot;
f05 Fig. 11 reliability_plot; f06 Fig. 3 package_photo; f07 Fig. 1 stack_schematic; f08 Fig. 7 other; f09 Fig. 8 electrical_plot;
f10 Fig. 6 simulation_result; f11 Fig. 5 other.

## Notes
- Existing figure bboxes unchanged (no audit named a bbox defect for these papers).
- Crops and grid renders stayed in the session scratchpad; none written to the repo.
- Process-flow rows were not restructured; the only process_steps change is the x1 item 14 basis fix (00092).
