# Revision report r010 (2026-10-19)

Mode: audit_fix_and_figures. Sources checked: text.md and every page render of each paper; all 84 figure crops
rendered from the staged figures.csv and inspected. Validator: `0 errors, 0 warnings (data/_staging/r010)`.
Process-flow rows: untouched (no audit names a process_steps row in this batch).
Every Task A change is logged in the paper's evidence YAML under `revisions:`.

Audit search note: the short id `00180` in audit_x1 item 10 (`00180-b-i3`, 150 um C4 typed microbump) refers to
ectc51906.2022.00180 (its b-i3 is the 150 um SoC P/G bump), not to this batch's ectc51909.2023.00180, which has no b-i3.

## ectc51909.2023.00155

Audits: none name this paper.

Sibling groups:
- a-m1 / b-m1 (TCT line A, 15/15 pass): genuine per-TV values; p.8 Table 13 gives separate TV1 (Substrate-A) and TV2
  (Substrate-B) rows, 3 TVs each. Kept both.
- a-m2 / b-m2 (TCT line B, 15/15 pass): same table, same decision. Kept both.

Figures: 6 -> 27. Added (all schematics/images missing before, plus value-bearing tables/plots):

| label | kind | source |
|---|---|---|
| Fig. 18 | cross_section | manual (no candidate) |
| Fig. 2 | process_flow | manual (no candidate) |
| Fig. 5 | package_photo | candidate p05_fig5_2 |
| Fig. 7 | cross_section | candidate p05_fig7 |
| Fig. 13 | cross_section | candidate p06_fig13 |
| Fig. 10 | micrograph | candidate p06_fig10 |
| Fig. 19 | stack_schematic | candidate p08_fig19 |
| Fig. 6 | xray_csam | candidate p05_fig6 |
| Fig. 8 | xray_csam | candidate p05_fig8 |
| Fig. 17 | package_photo | candidate p07_fig17 |
| Fig. 11 | package_photo | candidate p06_fig11 |
| Fig. 12 | package_photo | candidate p06_fig12 |
| Fig. 14 | package_photo | candidate p07_fig14 |
| Fig. 3 | other (FEM model drawing) | candidate p03_fig3 |
| Table 13 | data_table | candidate p08_table13 |
| Table 2 | data_table | candidate p02_table2 |
| Table 10 | data_table | candidate p06_table10 |
| Table 11 | data_table | candidate p06_table11 |
| Table 12 | data_table | candidate p07_table12 |
| Table 7 | data_table | candidate p03_table7 |
| Fig. 15 | thermal_plot | candidate p07_fig15 |

Not added: Tables 4, 5, 6, 8, 9 (conditions already carried by rows; Table 4 duplicates the Table 12 design column).

New rank order: f01 Fig. 16, f02 Fig. 18, f03 Fig. 1, f04 Fig. 4, f05 Fig. 2, f06 Fig. 5, f07 Fig. 7, f08 Fig. 13,
f09 Fig. 10, f10 Fig. 19, f11 Fig. 6, f12 Fig. 8, f13 Fig. 17, f14 Fig. 11, f15 Fig. 12, f16 Fig. 14, f17 Fig. 3,
f18 Fig. 9, f19 Table 13, f20 Table 1, f21 Table 2, f22 Table 3, f23 Table 10, f24 Table 11, f25 Table 12, f26 Table 7,
f27 Fig. 15. (Old f01 Fig. 1 -> f03, f02 Fig. 4 -> f04, f03 Fig. 16 -> f01, f04 Table 1 -> f20, f05 Table 3 -> f22,
f06 Fig. 9 -> f18; bboxes unchanged.)

## ectc51909.2023.00175

Audit items (x1):
- Item 4 / section 4: a-m1 and b-m1 abstract "<100 um" warpage copied on mTV1 and mTV2. Verified p.1 abstract:
  "Less than 100 um of warpage was controlled by the EMC selections", after describing both modules, no module named.
  Applied: one row on the first TV. a-m1 scope -> "module; applies to TVs a, b (abstract names no module); temperature and
  sign not stated", notes updated; b-m1 deleted.

Sibling group a-m1 / b-m1: the same item; copy removed (above).

Figures: 6 -> 11. Added: Fig. 7 (xray_csam, candidate p04_fig7), Fig. 9 (warpage_plot, candidate p05_fig9),
Fig. 5 (warpage_plot, candidate p03_fig5), Table 4 (data_table, candidate p05_table4), Fig. 4 (simulation_result,
candidate p03_fig4). Fig. 3 note about the 6-figure cap cleared. Not added: Tables 2-3 (qualitative EMC legs, no values).

New rank order: f01 Fig. 6, f02 Fig. 8, f03 Fig. 1, f04 Fig. 2, f05 Table 1, f06 Fig. 7, f07 Fig. 9, f08 Fig. 5,
f09 Table 4, f10 Fig. 3, f11 Fig. 4 (old f01-f05 unchanged; old f06 Fig. 3 -> f10).

## ectc51909.2023.00180

Audits: none name this paper (see the audit search note above).

Sibling groups (all genuine per-TV values, kept):
- a-m6/b-m6 (C4 wetting Excellent), a-m8/b-m8 (C4 alignment Excellent), a-m9/b-m9 (C4 shape Optimal),
  a-m10/b-m10 (C4 voiding Yes): p.4 Table I has separate T&R and NCP columns; both columns print the same rating.
- d-m3/e-m3 (relative C4 strain 1.0): p.6 Fig. 19 plots separate bars for case 2 (Bridge t group) and case 3
  (cavity group), each about 1.0.

Figures: 6 -> 19. Added: Fig. 10 (cross_section, p03_fig10), Fig. 7 (micrograph, p03_fig7), Fig. 8 (micrograph,
p03_fig8), Fig. 11 (micrograph, p03_fig11), Fig. 4 (micrograph, p02_fig4), Fig. 5 (micrograph, p02_fig5),
Fig. 6 (micrograph, p03_fig6), Fig. 1 (stack_schematic, p01_fig1; standard DBHi = FEM cases 1-2),
Fig. 12 (other, FEM model, p05_fig12), Fig. 13 (other, FEM bridge/C4 models, p05_fig13), Table II (data_table,
p04_tableii), Fig. 18 (simulation_result, p06_fig18), Fig. 19 (simulation_result, p06_fig19); all candidate.
Fig. 17 note about the 6-figure cap cleared. Not added: Figs. 14-16 (contours; their max values duplicate Figs. 17-19)
and Table III (qualitative High/Low summary).

New rank order: f01 Fig. 3, f02 Fig. 2, f03 Fig. 9, f04 Fig. 10, f05 Fig. 7, f06 Fig. 8, f07 Fig. 11, f08 Fig. 4,
f09 Fig. 5, f10 Fig. 6, f11 Fig. 1, f12 Fig. 12, f13 Fig. 13, f14 Table I, f15 Table IV, f16 Table II, f17 Fig. 17,
f18 Fig. 18, f19 Fig. 19. (Old f04 Table I -> f14, f05 Table IV -> f15, f06 Fig. 17 -> f17.)

## ectc51909.2023.00235

Audit items:
- x1 item 3 (and x2B open list): b-m2/b-m3/b-m4 n_samples 100 (approx). Verified p.6 Sec. III.C: "accelerated thermal
  cycle stress, HTS, and THB for ~100 packaged modules", one pool, not per test. Applied: n_samples and qualifier
  n_samples:approx cleared on all three; scope -> "about 100 packaged modules shared across ATC, HTS and THB (per-test n
  not stated)"; b-m2 notes trimmed.
- x1 item 9: a-m14..a-m17 (SEM labels V1 20.64, V3 9.471, H2 5.467, H1 2.31 um, Fig. 10(b)). Verified p.6: labels are
  printed upside down; the paper names no feature for them. Applied: rows deleted; values moved to evidence `excluded`.
- x1 item 10: a-i4 / b-i4 (150 um pitch, 90 um diameter) typed microbump. Verified p.2 Table I: "C4 Pitch 150",
  "C4 Diameter 90" for Chip 3. Applied: ic_type microbump -> c4 on both; note "Named C4 in Table I".
- x1 sections 6 and 8 (coverage lines naming 00235: Tables I-II verified OK, FEA basis OK, MR/TCB split handled,
  warpage sign/stage and n_samples as schema coverage gaps): not applicable (no row defect named); a-m2 already notes the
  undefined sign convention.

Figures: 6 -> 17. Added: Fig. 3 (cross_section, candidate p02_fig3), Fig. 2 (package_photo, manual; candidate
p02_tablei merged it with Table I), Fig. 1 (package_photo, candidate p01_fig1), Fig. 6 (micrograph, candidate p04_fig6),
Fig. 9 (micrograph, candidate p05_fig9), Fig. 7 (other, FEA model + joint section, candidate p04_fig7), Table II
(data_table, manual; candidate bbox off, printed title repeats "CHIP AND SUBSTRATE CRITERIA" but content is DTC results),
Table V (data_table, manual; candidate bbox included the page margin), Fig. 11 (reliability_plot, candidate p06_fig11),
Table IV (data_table, candidate p06_tableiv), Table III (data_table, candidate p05_tableiii).

New rank order: f01 Fig. 4, f02 Fig. 12, f03 Fig. 3, f04 Fig. 5, f05 Fig. 2, f06 Fig. 1, f07 Fig. 6, f08 Fig. 10,
f09 Fig. 9, f10 Fig. 7, f11 Table I, f12 Table II, f13 Table V, f14 Fig. 11, f15 Table IV, f16 Fig. 8, f17 Table III.
(Old f02 Table I -> f11, f03 Fig. 5 -> f04, f04 Fig. 12 -> f02, f05 Fig. 8 -> f16, f06 Fig. 10 -> f08.)

## ectc51909.2023.00274

Audit items (x1):
- Item 8: a-L03 / a-L04 via_pitch_um = 10 holds the Cu pad / pillar pitch. Verified p.4 Fig. 4(c)-(d) (10 um bonding
  pitch of pillars and pads). Applied: via_pitch_um cleared; pitch kept in feature and notes.
- Item 8: b-L09 / c-L09 bonding_interface thickness 0.22 um. Verified p.5 Sec. III.A: Ti/Cu 20/200 nm is the dielet
  lift-off pattern. Applied: thickness_um and override thickness_um:derived cleared; notes "Dielet-side Ti/Cu 20/200 nm
  lift-off pattern; bond interface thickness not reported"; the two derived entries removed from evidence. b-s01
  (deposition step thickness 0.22) unchanged: it is the deposited film.
- Item 4: b-m2 / c-m2 "no opens and no shorts" copied. Verified p.6 Sec. III.B: "Daisy chains measured on two different
  samples were found to have no opens and shorts"; no per-build result. Applied: one row on b, scope "applies to TVs b, c:
  daisy chains on two different samples", notes keep the inference (one sample per dielet thickness); c-m2 deleted.
- Item 12: d (envisioned GaN-IF 3D-IVR) typed simulation_model. Verified p.3 Sec. II.A / Fig. 2 "envisioned schematic";
  no simulation; d-m1..m3 are author estimates. Applied interim: tv_kind -> other, notes "Design concept (envisioned
  system, not built, not simulated)".
- Sections 6 and 8 coverage lines (137.5 MPa anneal pressure, 180 per-chain count semantics, verified shear/chain/Fig. 9(b)/
  Fig. 11(c) values, concept TV basis): not applicable (no row defect; 137.5 MPa is already in a-s10 pressure_mpa).

Figures: 6 -> 10. Added: Fig. 11 (stack_schematic, candidate p07_fig1 whose label reads "Fig. 1" from the OCR caption
"Figure 1 1"; bbox correct), Fig. 8 (process_flow, candidate p05_fig8), Fig. 4 (package_photo, candidate p04_fig4),
Fig. 7 (other, PL/XRD/Raman, candidate p05_fig7). Fig. 6 note about the 6-figure cap cleared.
Not added: Fig. 1 (PDN circuit/block concept, no structure drawing and no extracted values).

New rank order: f01 Fig. 5, f02 Fig. 10, f03 Fig. 11, f04 Fig. 2, f05 Fig. 3, f06 Fig. 8, f07 Fig. 9, f08 Fig. 4,
f09 Fig. 6, f10 Fig. 7. (Old f03 Fig. 2 -> f04, f04 Fig. 3 -> f05, f05 Fig. 9 -> f07, f06 Fig. 6 -> f09.)

## Row change counts (outside figures)

| paper | changed | deleted | total |
|---|---|---|---|
| 00155 | 0 | 0 | 0 |
| 00175 | 1 | 1 | 2 |
| 00180 | 0 | 0 | 0 |
| 00235 | 5 | 4 | 9 |
| 00274 | 6 | 1 | 7 |

## Open issues

- 00235 a-i1/b-i1 (75 um) and i2/i3 (55 um) are also labelled "C4 Pitch" in Table I but are called micro-bumps in the
  text and abstract; no audit names them, left as microbump.
- 00180 FEM interconnect typing differs by case (c-i1 c4, d/e/f-i1 unspecified, g-i1 cu_pillar); not named by an audit,
  left unchanged.
- Interim fixes waiting on schema: `applies_to` (00175-a-m1, 00274-b-m2 carry it in scope), `design_concept` tv_kind
  (00274-d now `other`), pad_pitch_um (00274-a-L03/L04 in notes).
