# Revision report s035 (figures supplement, 2026-10-20)

Scope: `figures.csv` only. No other CSV or evidence file changed. Validator: `0 errors, 0 warnings (data/_staging/s035)`.

## ectc51846.2026.00096

Figures before: 6. Figures after: 19. Existing bboxes kept unchanged (notes on Fig. 2 and Fig. 12 p.5 rows updated to point to the new split rows).

Opened: page renders p.1-p.6; candidate crops p02_fig4, p03_fig5-fig10, p04_fig11, p05_fig13, p01_table1; manual re-crops of Fig. 2(g) p.2, Fig. 12 steps 1-6 p.4, Fig. 14 p.5.

Added (13):

| label | page | kind | bbox |
|---|---|---|---|
| Fig. 2(g) | 2 | stack_schematic | manual (no candidate; right-column panel of Fig. 2) |
| Fig. 12 (steps 1-6) | 4 | process_flow | manual (no candidate; first half of Fig. 12) |
| Fig. 4 | 2 | micrograph | candidate p02_fig4 |
| Fig. 13 | 5 | package_photo | candidate p05_fig13 |
| Fig. 14 | 5 | package_photo | manual (candidate p05_fig14 included Sec. VI paragraph) |
| Fig. 11 | 4 | xray_csam | candidate p04_fig11 |
| Fig. 10 | 3 | package_photo | candidate p03_fig10 |
| Fig. 9 | 3 | other | candidate p03_fig9 |
| Fig. 5 | 3 | package_photo | candidate p03_fig5 |
| Fig. 6 | 3 | micrograph | candidate p03_fig6 |
| Fig. 7 | 3 | micrograph | candidate p03_fig7 |
| Fig. 8 | 3 | micrograph | candidate p03_fig8 |
| Table 1 | 1 | data_table | candidate p01_table1 |

New rank order: f01 Fig. 1 (stack schematic), f02 Fig. 2(g), f03 Fig. 2(a)-(f), f04 Fig. 12 steps 1-6 (p.4), f05 Fig. 12 steps 7-14 (p.5), f06 Fig. 3, f07 Fig. 4, f08 Fig. 13, f09 Fig. 14, f10 Fig. 11, f11 Fig. 10, f12 Fig. 9, f13 Fig. 5, f14 Fig. 6, f15 Fig. 7, f16 Fig. 8, f17 Table 1, f18 Table 2, f19 Fig. 16.

Judgment calls:
- Rank 1 stays Fig. 1: no cross-section image of the full stack exists (Fig. 3/4 SEMs show a single TSV only); Fig. 1 and Fig. 2(g) are both whole-stack schematics.
- Fig. 2(g) and Fig. 12 p.4 are not covered by any existing bbox (split figures), so they get their own rows with the printed label.
- Fig. 15 skipped: caption says "schematic diagram", but the image is a lab photo of the test loop, not of the build.
