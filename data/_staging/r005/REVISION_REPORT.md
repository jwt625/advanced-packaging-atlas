# Revision report r005 (2026-10-19)

Mode: audit_fix_and_figures. Audits searched: audit_x1_2026-10-18, audit_x2A_2026-10-19 and audit_x2B_2026-10-19, by full paper
id and by short id. Every change is logged in the paper's evidence YAML under `revisions:` (source audit_x2A / audit_x2B /
sibling_dup / figures).

Validator: `uv run python scripts/validate_db.py --staging data/_staging/r005` -> 0 errors, 0 warnings.

Short-id hits that name other papers (not applicable here):
- audit_x1 line 110: `ectc51529.2024.00092`, not ectc51846.2026.00092.
- audit_x2B line 125: `ectc51909.2023.00153-f06`, not ectc51846.2026.00153.

Rank order (SKILL.md step 5):
1. Rank 1 is the best view of the physical build (cross-section image > stack schematic > package photo).
2. Then the process flow and layouts/floorplans.
3. Then other schematics and images of the build.
4. Then plots and tables.

Existing rows keep their bbox, except 00092-f02, where audit_x2B names a bbox defect. Every crop cited below (candidate
png or manual re-crop) was opened. Re-crops and contact sheets are in the session scratchpad under `r005/`.

## ectc51846.2026.00035

Audit items: none (no audit names this paper).

Sibling groups:
- a-m9/b-m9, a-m10/b-m10, a-m11/b-m11, a-m12/b-m12 (DCR and 5 GHz inductance at 0.4 and 2.0 mm): kept.
  - p.5 Table II has separate Model A and Model B rows, each with its own cells (18.3/54.7 ohm, 1.15/3.98 nH).
  - These are genuine per-TV values.
- a-m13/b-m13/c-m9 (crosstalk below -20 dB at 0.4 mm): copy.
  - p.5 Sec. III.B.4: "all models maintain crosstalk levels below -20 dB". This is one statement with no per-model value.
  - a-m13 kept, scope '' -> "applies to TVs a, b, c". b-m13 and c-m9 deleted.
- a-m14/b-m14 (receiver-side voltage 0.6 Vp-p at 2.0 mm): copy.
  - p.5 Sec. III.C.1.b: "In Model A and B ... dropping to 0.6 Vp-p". This is one joint statement.
  - a-m14 kept, scope '' -> "applies to TVs a, b". b-m14 deleted.

Figures (6 -> 13). Added:
- Fig. 10 top_view_layout, manual (p.7 0.555,0.068,0.895,0.305). Candidate p07_fig11 merged Fig. 10 and Fig. 11.
- Fig. 3 top_view_layout, candidate p03_fig3.
- Fig. 12 micrograph (MicroPillar SEM), candidate p08_fig12.
- Fig. 4 stack_schematic (RDL model cross-sections), candidate p03_fig4.
- Fig. 2 top_view_layout (line-length definition), candidate p02_fig2.
- Fig. 6 electrical_plot (eyes at 0.4 mm), candidate p04_fig6.
- Fig. 7 electrical_plot (eyes at 2.0 mm), candidate p05_fig7.

Not added:
- Fig. 8 and Fig. 9 (crosstalk curves): the only value taken, -20 dB, comes from text.

New rank order:

| fig_id | label | kind | was |
|---|---|---|---|
| f01 | Fig. 13 | xray_csam | f01 |
| f02 | Fig. 11 | process_flow | f02 |
| f03 | Fig. 10 | top_view_layout | new |
| f04 | Fig. 3 | top_view_layout | new |
| f05 | Fig. 12 | micrograph | new |
| f06 | Fig. 1 | stack_schematic | f03 |
| f07 | Fig. 4 | stack_schematic | new |
| f08 | Fig. 2 | top_view_layout | new |
| f09 | Table I | data_table | f04 |
| f10 | Table II | data_table | f06 |
| f11 | Fig. 6 | electrical_plot | new |
| f12 | Fig. 7 | electrical_plot | new |
| f13 | Fig. 5 | electrical_plot | f05 |

## ectc51846.2026.00074

Audit items: none (no audit names this paper).

Sibling group a-m1/b-m1/c-m1 (TGV integrity after 100 thermal-shock cycles, pass): kept as genuine per-TV results.
- Each build was cycled and X-rayed separately (p.5 Fig. 13 no liner, Fig. 14 PL, Fig. 15 IL).
- Text: "in all the three samples".
- Locators narrowed from "p.5 Sec. IV.E; p.5 Figs. 13-15" to each TV's own figure:
  - a-m1: Fig. 13
  - b-m1: Fig. 14
  - c-m1: Fig. 15

Figures (6 -> 17). Most candidates in this paper are offset upward and clip the bottom, so most additions are manual.
Added:
- Fig. 1(a) stack_schematic (no-liner stack, TV a), manual. The f01 note "panel (a) left out" was updated.
- Fig. 8, 9 and 10 xray_csam (as-plated, TVs a, b, c), manual. The candidates clipped the bottom.
- Fig. 14 and 15 xray_csam (after thermal shock, TVs b, c), manual. The candidates clipped the bottom.
- Fig. 4 stack_schematic (model cross-section, TV e), manual. Candidate p03_fig4 bbox was the page corner.
- Fig. 2 and Fig. 3 other (Ansys model geometry, TV e), manual. The candidates clipped the scale bars.
- Fig. 6 simulation_result (shear stress, legend max 60.37 MPa, source of e-m2), manual. The candidate clipped the scale bar.
- Fig. 7 other (FTIR, source of b-m5/c-m5), manual. The candidate clipped the axis label.

New rank order:

| fig_id | label | kind | was |
|---|---|---|---|
| f01 | Fig. 1(b) | stack_schematic | f01 |
| f02 | Fig. 1(a) | stack_schematic | new |
| f03 | Fig. 11 | process_flow | f02 |
| f04 | Fig. 8 | xray_csam | new |
| f05 | Fig. 9 | xray_csam | new |
| f06 | Fig. 10 | xray_csam | new |
| f07 | Fig. 13 | xray_csam | f04 |
| f08 | Fig. 14 | xray_csam | new |
| f09 | Fig. 15 | xray_csam | new |
| f10 | Fig. 12 | micrograph | f06 |
| f11 | Fig. 4 | stack_schematic | new |
| f12 | Fig. 2 | other | new |
| f13 | Fig. 3 | other | new |
| f14 | Table II | data_table | f03 |
| f15 | Fig. 5 | simulation_result | f05 |
| f16 | Fig. 6 | simulation_result | new |
| f17 | Fig. 7 | other | new |

## ectc51846.2026.00092

Audit items (audit_x2B):
- Defect 5 (a-s02, a-s06, a-s07 have an inferred order): applied.
  - Checked on p.2 Fig. 3 and p.3 Sec. I.B: the paper gives only CoW -> micropillar loop -> oS. Carrier coating, sealant
    dispense and lid attach have no stated position.
  - The proposed `seq_basis` column is a pending schema change. Interim fix: the notes of each row now start with
    "seq inferred, not stated: ...". seq values are unchanged, and the flow is not restructured.
- Defect 6 (f01 `shows` beyond the figure): applied.
  - The p.2 render confirms that the Fig. 1 drawing has no labels, and the caption names no layers.
  - shows -> "Unlabelled cross-section schematic of manifold lid with inlet/outlet over micropillared dies on interposer
    and substrate".
- Section 4 (f02 bbox runs to the page edge, x1=1.0): applied.
  - bbox 0.4935,0.3837,1.0,0.4965 (candidate p02_fig3) -> 0.545,0.3837,0.885,0.4965 (manual). Re-cropped and opened.
- Section 5 (a-m11 value_text "1e-8 to 1e-7"): not applicable. It is a schema recommendation (value_min/value_max), and the
  row is already value_text-only.

Sibling groups: none listed.

Figures (6 -> 10). Added:
- Fig. 4 micrograph (micropillar residue, Process A vs B), candidate p03_fig4.
- Fig. 5 other (carrier-coating cross-cut images 1B/0B vs 5B, source of a-s02 result), candidate p03_fig5.
- Fig. 9 thermal_plot (lidless/lidded TDP vs flow, source of b-m1..m10 and c-m1..m10), candidate p05_fig9.
- Fig. 11 data_table (sealant DoE), candidate p05_fig11.

Not added:
- Fig. 6 (He leak test rig) and Fig. 8 (thermal test loop): equipment schematics, not the build.

New rank order:

| fig_id | label | kind | was |
|---|---|---|---|
| f01 | Fig. 1 | stack_schematic | f01 |
| f02 | Fig. 3 | process_flow | f02 |
| f03 | Fig. 7 | top_view_layout | f03 |
| f04 | Fig. 2 | micrograph | f05 |
| f05 | Fig. 4 | micrograph | new |
| f06 | Fig. 5 | other | new |
| f07 | Fig. 10 | thermal_plot | f04 |
| f08 | Fig. 9 | thermal_plot | new |
| f09 | Fig. 12 | reliability_plot | f06 |
| f10 | Fig. 11 | data_table | new |

## ectc51846.2026.00110

Audit items (audit_x2A):
- Defect 8 (e-s01..s04 belong to a proposed flow, but performed is empty): applied.
  - p.3 Sec. III.A: "is proposed". p.4: "is expected to".
  - e-s01, e-s02, e-s03, e-s04 performed '' -> 'no'.
  - tv_kind stays `other` (the design_concept enum is pending).
- Section 4 (f04 "5-80 um axis"), section 6 (Fig. 7 values, a-m1 author_estimate, UCIe ref [3] excluded): the audit
  verified these as OK. No change.

Sibling groups: none listed.

Figures (6 -> 8). Added:
- Fig. 1 other (concept rendering of GPU/HBM/PIC on glass with polymer waveguides), paper-level, candidate p01_fig1. Notes
  say it is an envisioned package, not a built TV.
- Fig. 8 simulation_result (bending loss vs Delta, source of d-m6), candidate p05_fig8. The printed caption repeats the
  Fig. 7 caption; this is noted.

New rank order:

| fig_id | label | kind | was |
|---|---|---|---|
| f01 | Fig. 2 | cross_section | f01 |
| f02 | Fig. 6 | process_flow | f02 |
| f03 | Fig. 4 | top_view_layout | f03 |
| f04 | Fig. 1 | other | new |
| f05 | Fig. 5 | optical_plot | f04 |
| f06 | Fig. 7 | reliability_plot | f05 |
| f07 | Fig. 3 | simulation_result | f06 |
| f08 | Fig. 8 | simulation_result | new |

## ectc51846.2026.00153

Audit items: none (no audit names this paper).

Sibling groups:
- a-m3/b-m4/e-m7 (0.2 ppm/K) and c-m4/d-m4 (1.2 ppm/K), CTE difference between EMC and glass carrier: kept as genuine
  per-TV values.
  - The value follows each build's own EMC: LW gives 0.2 ppm/K, 400ZHF gives 1.2 ppm/K (p.4 Sec. IV.A, p.5 Sec. IV.C).
  - It is a build property, not a copied claim.
- a-m4/b-m5/c-m5 (debond/detape "no damage", pass): kept as genuine per-TV results.
  - p.4 Table II has one row per 320 mm coupon, each with its own photos and "No damage" result.

Figures (6 -> 11). Added:
- Table III package_photo (510 x 515 mm coupon after detaping), manual. Candidate p04_tableiii held only the title.
- Fig. 4 package_photo (coupons before debonding), candidate p03_fig4.
  - tv_ids = e only, because the (A) 320 mm variant is not identified.
- Fig. 5 micrograph (EMC and Si dummy surfaces after debond), candidate p04_fig5.
- Fig. 7 warpage_plot (with/without chips, TVs a, b), candidate p05_fig7.
- Fig. 8 warpage_plot (LW vs 400ZHF, TVs a, c), candidate p05_fig8.

Not added:
- Fig. 2 (Xe flash equipment photo): equipment, not the build.
- Table I (generic list of release methods).

New rank order:

| fig_id | label | kind | was |
|---|---|---|---|
| f01 | Fig. 1 | stack_schematic | f01 |
| f02 | Fig. 3 | process_flow | f02 |
| f03 | Table II | data_table | f03 |
| f04 | Table III | package_photo | new |
| f05 | Table IV | package_photo | f06 |
| f06 | Fig. 4 | package_photo | new |
| f07 | Fig. 5 | micrograph | new |
| f08 | Fig. 6 | warpage_plot | f05 |
| f09 | Fig. 7 | warpage_plot | new |
| f10 | Fig. 8 | warpage_plot | new |
| f11 | Fig. 9 | warpage_plot | f04 |

## Issues

- Several papers have no cross-section image of the build: 00074, 00092 and 00153.
  - In these, rank 1 is a stack schematic. For 00153 it is the generic photonic-debond mechanism drawing (Fig. 1).
- Two kinds have no fitting figure_kind, so they use `other`:
  - FTIR spectra (00074 Fig. 7)
  - cross-cut adhesion images (00092 Fig. 5)
- 00153 Table II and Table III are photo tables.
  - The existing Table II row keeps kind data_table.
  - The new Table III row is package_photo, consistent with the existing Table IV row.
