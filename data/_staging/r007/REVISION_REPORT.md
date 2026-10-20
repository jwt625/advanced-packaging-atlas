# Revision report r007 (2026-10-19)

Mode: audit_fix_and_figures. Audits searched: `audit_x1_2026-10-18.md`, `audit_x2A_2026-10-19.md`, `audit_x2B_2026-10-19.md` (full id and short id).
Validator: `uv run python scripts/validate_db.py --staging data/_staging/r007` -> `0 errors, 0 warnings (data/_staging/r007)`.
Every change is logged in `evidence/<paper_id>.yaml` under `revisions:`. Crops/grids are in the session scratch folder only.

| paper | data rows changed/removed | figures before -> after |
|---|---|---|
| ectc51906.2022.00055 | 2 (1 changed, 1 deleted) | 6 -> 10 |
| ectc51906.2022.00057 | 6 changed (+1 figure note) | 6 -> 13 |
| ectc51906.2022.00106 | 5 changed | 6 -> 11 |
| ectc51906.2022.00108 | 0 | 6 -> 10 |
| ectc51906.2022.00136 | 0 | 6 -> 21 |

## ectc51906.2022.00055

Audit items: none in x1/x2A/x2B. The x2B hit on "00055" is `ectc51687.2025.00055-f06`, a different paper (not applicable).

Sibling group `-a-m4` / `-b-m4` ("inductance and Q increase with ferrite core vs glass core", 4 to 6 times, HFSS):
- Decision: copy. p.4 Sec. III and Sec. V state "4 to 6 times" once, for both inductor types, with no per-type values.
- `-a-m4`: scope -> "HFSS with vs without ferrite core; applies to TVs a, b"; note added.
- `-b-m4`: deleted.

Figures added:
- Fig. 1 (stack_schematic, manual): the candidate cut the "Embedded Inductor" label and took in body text.
- Fig. 7 (package_photo, manual): the candidate cut the (c)/(d) labels.
- Fig. 6 (other, candidate p03_fig6): 3-D structure drawing.
- Fig. 12 (electrical_plot, candidate p05_fig12): efficiency curves behind `-c-m1`.

Not added:
- Fig. 5: vendor material curves.
- Fig. 8: S-parameters; no extracted values.
- Fig. 9: Y-parameter derivation diagram.

New rank order:

| rank | figure | kind |
|---|---|---|
| f01 | Fig. 11 | cross_section |
| f02 | Fig. 1 | stack_schematic |
| f03 | Fig. 7 | package_photo |
| f04 | Fig. 3 | process_flow |
| f05 | Fig. 4 | micrograph |
| f06 | Fig. 2 | micrograph |
| f07 | Fig. 6 | other |
| f08 | Table I | data_table |
| f09 | Fig. 10 | electrical_plot |
| f10 | Fig. 12 | electrical_plot |

## ectc51906.2022.00057

Audit items (x1):

1. Item 5, Fig. 8 axis ambiguity (`-a-m12`, `-a-m13`, `-a-i1.resistance_mohm`): applied.
   - Re-read at 400 dpi. The tick labels 1E-1, 1E+6 and 1E+11 sit 6 gridlines apart each, so the axis cannot be a uniform log scale.
   - Advanced: 1 decade/gridline gives 0.68 ohm; the piecewise read through the 1E+6 label gives 0.93 ohm.
   - Conventional median: 6.8E7 vs 2.3E8.
   - Values kept (0.7 ohm; 8E7 ohm; 700 mOhm). Notes widened. Three `conflicts` entries and a `source_quality` line added. Fig. 8 figure row (f07) note appended; bbox unchanged.
2. Item 9, `-b` carrier 200 mm: applied.
   - p.4 Sec. 3-2 says "200mm wafers were used for the evaluations" (the thinning evaluations), not for the module.
   - `carrier_format` wafer_200mm -> empty and `carrier_size_mm` 200 -> empty; notes rewritten.
   - The statement moved to the condition of `-b-m1` and `-b-m2` (the thinning metrics).
3. Table row "figure read with unlogged axis ambiguity", section 6 item 11, section 8 "Fig. 5-7 and 9" and "1.4 vs 1 um": same as item 1, or verified OK (no change).

Sibling groups: none listed.

Figures added:
- Fig. 2 (stack_schematic, candidate p01_fig2, reprinted yes, ref [10]).
- Fig. 6 (micrograph, candidate p03_fig6; SEM insets on a bar chart).
- Fig. 9 (electrical_plot, manual): the candidate cut the axis titles.
- Fig. 5 (other, candidate p02_fig5).
- Fig. 7 (other, manual): the candidate cut the x labels.
- Fig. 11 (other, candidate p04_fig11).
- Fig. 12 (other, manual): the candidate cut the x title.

Not added: Fig. 1 (generic CIS roadmap).

New rank order:

| rank | figure | kind |
|---|---|---|
| f01 | Fig. 14 | cross_section |
| f02 | Fig. 3 | stack_schematic |
| f03 | Fig. 2 | stack_schematic |
| f04 | Fig. 10 | process_flow |
| f05 | Fig. 13 | xray_csam |
| f06 | Fig. 6 | micrograph |
| f07 | Fig. 8 | electrical_plot |
| f08 | Fig. 9 | electrical_plot |
| f09 | Fig. 5 | other |
| f10 | Fig. 7 | other |
| f11 | Fig. 4 | simulation_result |
| f12 | Fig. 11 | other |
| f13 | Fig. 12 | other |

## ectc51906.2022.00106

Audit items (x1, x2B):

1. x1 item 4 / x2B item 4, gap copied in c1 and m7: applied.
   - `-a-c1.gap_um` 150 -> empty and `-b-c1.gap_um` 150 -> empty.
   - The value is kept once as `-a-m7`, the TV the paper ties it to (jetting through the gap; p.1 Abstract, p.4 Sec. V).
   - The c1 notes were updated to match.
2. x1 item 10, `-a-i1` / `-b-i1` typed c4: applied (interim fix).
   - ic_type c4 -> microbump.
   - The paper names the 75 um bridge bumps "uC4" (p.2 Fig. 1(a) label, p.2 text) and "micro joint". The names as written are now in the notes.
3. x1 item 15, papers.notes over 30 words: applied. Trimmed from 33 to 24 words; "OCR text" kept.
4. x1 section 6 item 5 (nozzle 50/150 um has no column): schema coverage gap. Not applicable; the values are already in `-a-s04` and `-c-s01` conditions.
5. x1 section 8 items (Table III, Fig. 7, 6 mm handler, bridge 3.2 vs 3.5 mm, Tables I-II excluded): verified OK, no change.

Sibling groups: none listed.

Figures added (all manual; OCR paper, no candidates):
- Fig. 3 (package_photo).
- Fig. 8 (xray_csam).
- Fig. 9 (micrograph).
- Fig. 4 (other: jig drawing and result photo).
- Fig. 5 (other: nozzle drawing and high-speed frames).

New rank order:

| rank | figure | kind |
|---|---|---|
| f01 | Fig. 10 | cross_section |
| f02 | Fig. 1 | stack_schematic |
| f03 | Fig. 3 | package_photo |
| f04 | Fig. 2 | process_flow |
| f05 | Fig. 8 | xray_csam |
| f06 | Fig. 9 | micrograph |
| f07 | Fig. 7 | stack_schematic |
| f08 | Fig. 4 | other |
| f09 | Fig. 6 | other |
| f10 | Fig. 5 | other |
| f11 | Table III | data_table |

## ectc51906.2022.00108

Audit items (x1):
- Item 12, "00108-a/c/d" tv_kind other: not applicable. These TV ids belong to `ectc51909.2023.00108`, which has TVs a-d. This paper has only -a (package) and -b (simulation_model).
- Section 6 items 4, 9 and 10 (FEM legs as variants, relative-to-POR reference, warpage sign convention): schema coverage gaps. The rows already carry the POR definition in scope and the RT cry / HT smile convention. No change.
- Section 8 (Fig. 5-8 bars, Table III, FEM legs basis, split variables): verified OK.

Sibling groups: none listed. Data rows unchanged.

Figures:
- Re-ranked under the 2026-10-19 rule (stack schematic > package photo).
- Added:
  - Fig. 6 (warpage_plot, candidate p04_fig6; contains the press-cure head schematic).
  - Fig. 8 p.4 (warpage_plot, candidate p04_fig8).
  - Table III (candidate p04_tableiii).
  - Table II (candidate p03_tableii).
- Not added:
  - Fig. 3: duplicates Table I.
  - Fig. 4: its three bar pairs are a subset of Fig. 5.

New rank order:

| rank | figure | kind |
|---|---|---|
| f01 | Fig. 2 | stack_schematic |
| f02 | Fig. 1 | package_photo |
| f03 | Fig. 8 (p.5) | reliability_plot |
| f04 | Fig. 6 | warpage_plot |
| f05 | Fig. 5 | warpage_plot |
| f06 | Fig. 7 | warpage_plot |
| f07 | Fig. 8 (p.4) | warpage_plot |
| f08 | Table I | data_table |
| f09 | Table III | data_table |
| f10 | Table II | data_table |

## ectc51906.2022.00136

Audit items (x2B):
- Section 5 note "Figure 15 printed twice (p.5, p.6)": not a defect. It is already recorded in the figures notes (f01) and the evidence `conflicts`. No change.

Sibling groups: none listed. Data rows unchanged.

Figures added:

| figure | kind | bbox source |
|---|---|---|
| Figure 14 | package_photo | candidate |
| Figure 6 | package_photo | candidate |
| Figure 11 | package_photo | candidate |
| Figure 3 | process_flow | candidate |
| Figure 1 | top_view_layout | candidate |
| Figure 7 | micrograph | candidate |
| Figures 16-22 | xray_csam | candidate (all 7 crops opened, whole) |
| Table 5 | data_table | manual (no candidate) |
| Table 1 | data_table | manual (no candidate) |

Not added: vendor or background illustrations, already excluded in evidence:
- Fig. 5: Disco grinder photo.
- Fig. 8: spin coat schematic, ref [5].
- Fig. 9: EV Group coater photo.
- Fig. 10: generic slit-coater illustration.
- Fig. 12: Semsysco plating flow.
- Fig. 13: plating additives, ref [2].
- Table 4: JEDEC-type guideline.

New rank order:

| rank | figure | kind |
|---|---|---|
| f01 | Figure 15 (p.6) | cross_section |
| f02 | Figure 4 | stack_schematic |
| f03 | Figure 14 | package_photo |
| f04 | Figure 6 | package_photo |
| f05 | Figure 11 | package_photo |
| f06 | Figure 2 | process_flow |
| f07 | Figure 3 | process_flow |
| f08 | Figure 15 (p.5) | top_view_layout |
| f09 | Figure 1 | top_view_layout |
| f10 | Figure 7 | micrograph |
| f11-f17 | Figures 16-22 | xray_csam |
| f18 | Table 2 | data_table |
| f19 | Table 3 | data_table |
| f20 | Table 5 | data_table |
| f21 | Table 1 | data_table |

## Notes

- Process-flow rows: no audit named a process_steps defect for these five papers; flows unchanged.
- The figure revision entries use `source: figure_rule`, following the r003 precedent. The allowed audit sources cover data changes only.
- 00057 Fig. 2 is attributed to ref [10] and drawn as a "typical" structure. It is kept with `reprinted: yes` because it is the only whole-stack drawing of the three-wafer concept.
