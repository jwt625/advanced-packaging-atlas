# Revision report r002 (2026-10-19)

Mode: audit_fix_and_figures. Validator: `0 errors, 0 warnings (data/_staging/r002)`.
Pre-revision snapshot of this directory: zip in the session scratchpad (`r002/r002_backup_before.zip`).
All Task A changes are logged in each paper's evidence YAML under `revisions:`. Figure changes (Task B) are listed here only.
Process-flow rows: no audit names a process-step defect for these five papers; none changed.

## ectc51529.2024.00094 (FLOLA microbumps, Samsung)

Audit items
- x1, x2A: not named.
- x2B line 131: "-a/b/c-m2 BLT variance 1-3 um ... A copy." Applied. Verified p.4 Sec. IV: one sentence ("BLT varinace of 1~3 um") for all legs.
  - a-m2 kept, scope "initial bonding test, all legs" -> "initial bonding test; applies to TVs a, b, c".
  - b-m2, c-m2 deleted.

Sibling groups
- a-m1 / b-m1 / c-m1 (bump total height 6.5-7.5 um): copy. p.3 Sec. III.A "ranged from 6.5~7.5 um regardless legs", no per-leg values.
  a-m1 kept, scope -> "as-plated bump; applies to TVs a, b, c"; b-m1, c-m1 deleted.
- a-m2 / b-m2 / c-m2: see x2B above.

Figures (6 -> 12)
- Added: Fig. 3 micrograph (candidate p03_fig3); Fig. 8 cross_section (candidate p05_fig8); Fig. 11 cross_section
  (manual 6:0.095,0.400,0.318,0.530, no candidate); Fig. 10 micrograph (candidate p05_fig10); Fig. 9 micrograph
  (candidate p05_fig9); Fig. 2 other (candidate p03_fig2; (a) expansion plot carries a-m5..m7, (b) FLOLA tool schematic).
- Not added: Fig. 4 (reduction mechanism and XPS reprinted from refs [19], [20]; not this build).
- New rank: f01 Fig. 6, f02 Fig. 1, f03 Table II (per-leg bump schematics), f04 Fig. 3, f05 Fig. 8, f06 Fig. 11,
  f07 Fig. 5, f08 Fig. 10, f09 Fig. 9, f10 Fig. 2, f11 Fig. 7, f12 Table I.
- Renumbered: old f04 Table I -> f12, f05 Fig. 7 -> f11, f06 Fig. 5 -> f07; f01-f03 unchanged. Existing bboxes unchanged.

## ectc51529.2024.00151 (FOCoS-Bridge TCB, ASE)

Audit items: none of x1, x2A, x2B names this paper.

Sibling groups
- a-m4/b-m4 (TCG850), a-m5/b-m5 (uHAST396), a-m6/b-m6 (HTS1000): genuine per-TV values. p.6 Table II has separate TV-1 and
  TV-2 columns, each "Pass". Kept.
- a-m7/b-m7 (time-zero O/S pass): copy. p.6 Sec. IV.D "both TVs pass time zero O/S test", one statement.
  a-m7 scope "" -> "applies to TVs a, b"; b-m7 deleted.
- a-m8/b-m8 (TCB joint inspection: no shift, no cold joint/necking, SOH in spec): copy. p.6 Sec. IV.C states the result once
  for both; Fig. 14(a)/(b) and Fig. 15 image each TV but carry no values.
  a-m8 scope "" -> "applies to TVs a, b; Fig. 14(a)/(b) and Fig. 15 top/bottom image each TV"; b-m8 deleted.

Figures (6 -> 12)
- Added: Fig. 15 cross_section (candidate p06_fig15); Fig. 12 cross_section (candidate p05_fig12; BSM schematic + SEM);
  Fig. 8 process_flow (candidate p04_fig8); Fig. 5 process_flow (candidate p03_fig5; MR vs TCB);
  Fig. 14 xray_csam (candidate p06_fig14); Fig. 11 micrograph (candidate p05_fig11; dicing kerfs after BSM).
- Not added: Fig. 3 (concave/convex sign icons), Fig. 4 (generic defect-type sketch), Fig. 6 (generic sputtering principle,
  cites [8]), Fig. 7 (PVD cluster tool layout), Fig. 9 (TCB profile, no numeric axes), Table I (generic warpage-risk matrix).
  None shows this build or carries an extracted value.
- New rank: f01 Fig. 16, f02 Fig. 15, f03 Fig. 12, f04 Fig. 2, f05 Fig. 1, f06 Fig. 8, f07 Fig. 5, f08 Fig. 10, f09 Fig. 14,
  f10 Fig. 11, f11 Fig. 13, f12 Table II.
- Renumbered: old f02 Fig. 1 -> f05, f03 Fig. 2 -> f04, f04 Fig. 10 -> f08, f05 Table II -> f12, f06 Fig. 13 -> f11.

## ectc51529.2024.00155 (120 mm 2.5D package, JOINT2/Resonac)

Audit items: none of x1, x2A, x2B names this paper.

Sibling groups
- a-m24 / b-m5 (PCB joints center Good, edge Good) and c-m7 / d-m5 (center NG (Bridge), edge Good): genuine per-TV values.
  p.6 Table VI lists TV1-TV4 in separate rows. Kept unchanged.

Figures (6 -> 18)
- Added (schematic/image): Fig. 3 cross_section (candidate p03_fig3; IR, wafer photo, optical and SEM cross-sections);
  Fig. 16 stack_schematic (candidate p07_fig16); Fig. 9 package_photo (candidate p05_fig9); Fig. 5 micrograph (candidate
  p04_fig5); Fig. 4 micrograph (manual 4:0.105,0.088,0.475,0.179, no candidate); Fig. 7 warpage_plot with wafer photos
  (candidate p04_fig7).
- Added (values): Table VI (candidate p06_tablevi; source of a-m24/b-m5/c-m7/d-m5), Fig. 8 (p05_fig8), Fig. 11 (p05_fig11),
  Fig. 12 simulation_result (p05_fig12), Table VII (p07_tablevii), Table IV (p03_tableiv; 48 stack-layer property cells).
- Not added: Fig. 10 (FEM contour maps, no extracted values), Fig. 14 (diagonal warpage profiles, no extracted values),
  Table V (results duplicated by Fig. 4 and the 3 metric rows). The paper has no Fig. 6 (numbering skips it).
- New rank: f01 Fig. 3, f02 Fig. 1, f03 Fig. 16, f04 Fig. 2, f05 Fig. 9, f06 Fig. 15, f07 Fig. 5, f08 Fig. 4, f09 Fig. 7,
  f10 Table II, f11 Table I, f12 Fig. 13, f13 Table VI, f14 Fig. 8, f15 Fig. 11, f16 Fig. 12, f17 Table VII, f18 Table IV.
- Rank 1 changed from Fig. 1 (stack schematic) to Fig. 3 (cross-section images), per the cross-section > schematic rule.
- Renumbered: old f01 Fig. 1 -> f02, f02 Fig. 2 -> f04, f03 Table II -> f10, f04 Table I -> f11, f05 Fig. 13 -> f12;
  f06 Fig. 15 unchanged.

## ectc51529.2024.00265 (FCBGA core materials, Resonac)

Audit items (x2A)
- Section 3 defect 1 (sibling copies of adhesion statements): applied. Verified p.5 Sec. IV.E: "The stiffener of the reference
  package with 70-um-thick adhesive separated ... The ratio of the delaminated sample was higher on the substrates with lower
  CTE core ... the stiffener with 150-um-thick adhesive was well attached". No per-core result.
  - a-m21 kept, scope "" -> "applies to TVs a, b, c, d (cores not distinguished)"; b-m9, c-m5, d-m13 deleted.
  - a-m22 kept: value_text "stiffener separated in an early cycle count" -> "reference stiffener separated in an early cycle
    count; delaminated-sample ratio higher on lower-CTE cores"; result fail -> empty; scope "" -> "applies to TVs a, b, c, d;
    per-core ratios not given"; notes reworded. b-m10, c-m6, d-m14 deleted.
- Section 4 "obviously more important figure missed" (Fig. 9 Weibull, Fig. 4): applied, both added.
- Section 2/3 sibling-copy note for components/layers/steps (shared-flow gap, ~150 copy rows): not applicable here.
  Those rows are per-TV builds under rule f and a schema decision is pending; not restructured.
- Section 6 "Verified OK" items: no change.

Sibling groups: the two manifest groups (m21 and m22 families) are the x2A defect above.

Figures (6 -> 11)
- Added: Fig. 2 top_view_layout (candidate p03_fig2; BGA/daisy-chain layout); Fig. 8 xray_csam (candidate p05_fig8;
  motherboard photo + X-ray); Fig. 1 stack_schematic (candidate p02_fig1; generic example packages, tv_ids empty, noted);
  Fig. 9 reliability_plot (candidate p05_fig9; x2A); Fig. 4 warpage_plot (candidate p04_fig4; x2A).
- Not added: Table III (stiffener list; already in metrics.variant and components).
- New rank: f01 Fig. 5(a), f02 Fig. 3, f03 Fig. 2, f04 Fig. 8, f05 Fig. 1, f06 Table I, f07 Table II, f08 Fig. 9, f09 Fig. 7,
  f10 Fig. 4, f11 Fig. 6.
- Renumbered: old f02 Table I -> f06, f03 Fig. 3 -> f02, f04 Table II -> f07, f05 Fig. 7 -> f09, f06 Fig. 6 -> f11.
  f01 bbox (manual, panel (a)) unchanged.

## ectc51529.2024.00322 (CUF+EMC vs LCMUF, JOINT2/Resonac)

Audit items: none of x1, x2A, x2B names this paper.

Sibling groups
- e-m7 / f-m7 (FEM wafer warpage after glass bonding, -730 um): genuine per-TV values. Re-rendered p.6 Fig. 11 at 300 dpi:
  the Structure-B and Structure-C Sim. markers are separate points that coincide near -730 um at "After glass bonding" (with
  Structure-A Sim. and Structure-C Actual). Kept unchanged.

Figures (6 -> 17)
- Added (schematic/image): Fig. 1 process_flow (candidate p01_fig1); Fig. 8 xray_csam (SAT, candidate p05_fig8); Fig. 5
  micrograph (candidate p04_fig5); Fig. 6 micrograph (candidate p04_fig6); Fig. 12 other (warpage-mechanism schematic,
  candidate p06_fig12).
- Added (values): Table II (manual 2:0.068,0.672,0.492,0.874, no candidate), Table III (candidate p03_tableiii), Fig. 10
  (candidate p05_fig10; 95 cells cite it), Fig. 9 (candidate p05_fig9), Table V (candidate p04_tablev), Table VI (manual
  4:0.07,0.505,0.49,0.630; candidate p04_tablevi included the next section heading).
- Not added: Table IV (dispensing conditions, 2 cells).
- New rank: f01 Fig. 7, f02 Fig. 3, f03 Fig. 2, f04 Fig. 1, f05 Fig. 4, f06 Fig. 8, f07 Fig. 5, f08 Fig. 6, f09 Fig. 12,
  f10 Table I, f11 Table II, f12 Table III, f13 Fig. 11, f14 Fig. 10, f15 Fig. 9, f16 Table V, f17 Table VI.
- Renumbered: old f04 Fig. 4 -> f05, f05 Table I -> f10, f06 Fig. 11 -> f13; f01-f03 unchanged.

## Crops opened
Every new candidate crop (`figures/cand/<cand_id>.png`) and every manual re-crop was opened before citing. Manual re-crops
are in the scratchpad `r002/` folder: 00094 p06 Fig. 11, 00155 p04 Fig. 4, 00322 p02 Table II, 00322 p04 Table VI.
