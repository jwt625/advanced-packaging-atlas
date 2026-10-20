# Audit B: 3 newly distilled papers (2026-10-20)

Read-only. Rules: SKILL.md, schema v2.5 (rules a-n), BATCH_INSTRUCTIONS, REPASS conventions and v2.5 additions. Sources used: text.md, page renders, candidate crops, and my own re-crops (scratch audit_B).

## Sample
| paper | batch | rows checked / total | figures checked | flow level |
|---|---|---|---|---|
| ectc51909.2023.00240 | b085 | 109 / 109 (83 metrics, all numeric rows checked) | 17 | fragments: agree |
| 001c.129747 | b088 | 138 / 138 | 25 | ordered: agree |
| eptc67330.2025.11392620 | b092 | 77 / 77 | 15 | none: agree |

## Per-paper summary
- **ectc51909.2023.00240** (Intel/KLA scatterometry, pad-recess metrology): Clean.
  - Values match the source: Tables I/II (36 rows), Fig. 8/15 bars, Fig. 12 fits, r values, site counts and times.
  - The Fig. 15 wafer-label conflict is resolved correctly.
  - All 17 candidate bboxes are complete.
  - One minor problem in a 'shows' field (Fig. 2).
- **001c.129747** (DNP glass-core RDL and TGV):
  - Values verified: PID vias, Fig. 11 dimensions, Table 1, the Fig. 8 IL read-offs, TGV geometries, TC conditions. All 25 manual bboxes checked against the renders.
  - Defects:
    - the nominal L/S on a-L03 is marked measured;
    - F2 should be tv_build (the text describes the flow as executed);
    - layer order in the c stack;
    - 'chain' wording on two metric rows.
- **eptc67330.2025.11392620** (A*STAR IME Si-bridge CPWGs):
  - Values verified: the seven CPWG dimensions (300 dpi re-crop), Table I, the Fig. 11 inset table, the 868 nm SEM gap (with its conflict logged), Cu pillar 20/55 um, and the RL/crosstalk/IL rows.
  - Defects: the TSV labelled in Fig. 1 has no interconnect row; the Fig. 11 bbox cuts off the x-axis title.

## Findings
| paper | row | field | severity | issue | fix |
|---|---|---|---|---|---|
| 001c.129747 | a-L03 | basis | content_wrong | Nominal L/S 1/1 um is marked measured | basis = design_target, source = mixed |
| 001c.129747 | F2 | scope | structure | Flow is described as executed (80 um TGV, 400 um glass, matches k and m) but scoped generic_platform | scope = tv_build; keep tv_ids g;k;m and the pitch conflict |
| eptc67330.2025.11392620 | b-i5 (new) | row | content_missing | TSV in the Si bridge (Fig. 1 label) has no row | add through_via/tsv, stated, schematic, p.1 Fig. 1 |
| eptc67330.2025.11392620 | f13 | bbox | figure | Candidate cuts the x-axis title | bbox 0.0689,0.0597,0.4915,0.272, manual |
| 001c.129747 | c-L02/c-L03 | seq | minor | Inorganic dielectric is placed below the wiring it covers | swap seq (inorganic 2, wiring 3) |
| 001c.129747 | m-m2, n-m2 | parameter | minor | 'chain resistance' is not stated in the paper | 'resistance during TC (structure not stated)' |
| ectc51909.2023.00240 | f05 | shows | minor | Quotes body-text values (~20/~40 nm) | rewrite without the body-text numbers |

## Rates
- Rows checked: 324 of 324 (100%).
- Content-changing defects: 3 (1 content_wrong, 1 content_missing, 1 structure), which is 0.9% of rows.
- Minor defects: 3.
- Figure defects: 1 bbox (f13) out of 57 figures checked, plus 1 minor 'shows' wording issue (f05).
- Key-figure completeness: every schematic and every image of the build is present in all three papers. Rank-1 choices are correct: Fig. 9 AFM images (paper 1), Fig. 7 SEM cross-section (paper 2), Fig. 2 stack plus SEM (paper 3).
- Process-flow structure:
  - All three papers are graded correctly.
  - Paper 2: all physical TVs are covered by a flow or by not_reported.
  - No tests are recorded as steps, no steps only restate structure, and no typed conditions are left in free text (none are stated in any paper).
