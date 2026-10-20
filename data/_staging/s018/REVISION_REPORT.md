# Revision report s018 (figures supplement, 2026-10-19)

Scope: figures.csv only (key-figure rule 2026-10-19, SKILL.md workflow step 5). Every candidate in candidates.json and every page render was compared with the existing rows. Existing rows keep their bbox and content; only fig_id/rank changed. Every cited crop (candidate or manual) was rendered and opened. Other CSVs and evidence files unchanged (checksums compared).

Validator: `uv run python scripts/validate_db.py --staging data/_staging/s018` -> 0 errors, 0 warnings.

## ectc51687.2025.00178

Figures 6 -> 22.

Added:

| label | kind | bbox source | note |
|---|---|---|---|
| Fig. 1 | stack_schematic | candidate (p01_fig1) |  |
| Fig. 17 | stack_schematic | candidate (p05_fig17) |  |
| Fig. 15 | cross_section | candidate (p05_fig15) |  |
| Fig. 16 | cross_section | manual | No candidate detected for Fig. 16. |
| Fig. 10 | cross_section | candidate (p03_fig10) |  |
| Fig. 9 | stack_schematic | candidate (p03_fig9) |  |
| Fig. 5 | other | candidate (p03_fig5) |  |
| Fig. 11 | simulation_result | candidate (p04_fig11) |  |
| Fig. 7 | warpage_plot | candidate (p03_fig7) |  |
| Fig. 4 | simulation_result | candidate (p03_fig4) |  |
| Fig. 12 | simulation_result | candidate (p04_fig12) |  |
| Fig. 3 | other | candidate (p02_fig3) |  |
| Fig. 2 | other | candidate (p02_fig2) |  |
| Table 2 | data_table | candidate (p05_table2) |  |
| Fig. 19 | reliability_plot | manual | Candidate p05_fig19 also held Fig. 18. |
| Fig. 20 | reliability_plot | manual | Candidate p05_fig20 clipped the x-axis group labels. |

New rank order: f01 Fig. 14; f02 Fig. 1; f03 Fig. 17; f04 Fig. 15; f05 Fig. 16; f06 Fig. 10; f07 Fig. 13; f08 Fig. 9; f09 Fig. 5; f10 Fig. 11; f11 Table 1; f12 Fig. 8; f13 Fig. 7; f14 Fig. 6; f15 Fig. 4; f16 Fig. 12; f17 Fig. 3; f18 Fig. 2; f19 Table 2; f20 Fig. 18; f21 Fig. 19; f22 Fig. 20

Not added: none (all 20 figures and 2 tables now included).

## ectc51909.2023.00219

Figures 6 -> 16.

Added:

| label | kind | bbox source | note |
|---|---|---|---|
| Fig. 17 | cross_section | candidate (p05_fig17) | Text: cross-section taken after the stress-induced voiding test. |
| Fig. 4 | stack_schematic | candidate (p02_fig4) |  |
| Fig. 2 | other | candidate (p01_fig2) |  |
| Fig. 6 | other | manual | Candidate p02_fig6 included the Fig. 5 caption tail. Inspection method not stated. |
| Fig. 8 | other | candidate (p03_fig8) |  |
| Fig. 9 | other | candidate (p03_fig9) |  |
| Fig. 11 | electrical_plot | candidate (p04_fig11) |  |
| Fig. 15 | reliability_plot | candidate (p04_fig15) |  |
| Fig. 16 | reliability_plot | candidate (p05_fig16) |  |
| Fig. 10 | electrical_plot | candidate (p03_fig10) |  |

New rank order: f01 Fig. 14; f02 Fig. 17; f03 Fig. 4; f04 Fig. 5; f05 Fig. 2; f06 Fig. 7; f07 Fig. 6; f08 Fig. 8; f09 Fig. 9; f10 Table I; f11 Fig. 11; f12 Fig. 12; f13 Fig. 13; f14 Fig. 15; f15 Fig. 16; f16 Fig. 10

Not added: Fig. 1 (CIS evolution roadmap), Fig. 3 (pitch/chip-area trend of cited work).

## ectc51906.2022.00181

Figures 6 -> 13.

Added:

| label | kind | bbox source | note |
|---|---|---|---|
| Fig. 8 | micrograph | candidate (p03_fig8) |  |
| Fig. 9 | stack_schematic | manual | No candidate detected for Fig. 9. |
| Fig. 4 | process_flow | candidate (p03_fig4) | Bonding option discussed in the paper; the TV used mass reflow. |
| Fig. 5 | process_flow | candidate (p03_fig5) | Bonding option discussed in the paper; the TV used mass reflow. |
| Fig. 6 | process_flow | candidate (p03_fig6) | Bonding option discussed in the paper; the TV used mass reflow. |
| Table IV | data_table | candidate (p04_tableiv) |  |
| Table II | data_table | manual | Candidate p03_tableii included the title and the next section heading. |

New rank order: f01 Fig. 11; f02 Fig. 3; f03 Table I; f04 Fig. 7; f05 Fig. 10; f06 Fig. 8; f07 Fig. 9; f08 Fig. 4; f09 Fig. 5; f10 Fig. 6; f11 Table III; f12 Table IV; f13 Table II

Not added: Fig. 1 and Fig. 2 (IMEC concept/landscape roadmaps, reprinted).

## ectc51906.2022.00008

Figures 6 -> 9.

Added:

| label | kind | bbox source | note |
|---|---|---|---|
| Figure 9 | xray_csam | candidate (p04_fig9) |  |
| Figure 5 | stack_schematic | candidate (p03_fig5) |  |
| Figure 8 | electrical_plot | candidate (p04_fig8) |  |

New rank order: f01 Figure 6; f02 Figure 7; f03 Figure 9; f04 Figure 10; f05 Figure 5; f06 Figure 11; f07 Table II; f08 Figure 4; f09 Figure 8

Not added: Fig. 1 (interconnect concept chart), Fig. 2 (normalized RC curves, no extracted values), Fig. 3 (noise concept diagram), Table I (qualitative organic vs Si comparison).

## ectc51906.2022.00140

Figures 6 -> 11.

Added:

| label | kind | bbox source | note |
|---|---|---|---|
| Fig. 5 | stack_schematic | manual | Candidate p03_fig5 clipped the bottom edge. |
| Fig. 7 | micrograph | manual | Candidate p03_fig7 clipped panel (b). |
| Fig. 4 | micrograph | manual | Candidate p03_fig4 clipped the image bottoms. |
| Fig. 11 | other | manual | Candidate p05_fig11 clipped the failure images. |
| Fig. 1 | warpage_plot | manual | Candidate p02_fig1 clipped the x-axis title. |

New rank order: f01 Fig. 3; f02 Fig. 2; f03 Fig. 10; f04 Fig. 9; f05 Fig. 5; f06 Fig. 12; f07 Fig. 7; f08 Fig. 4; f09 Fig. 11; f10 Fig. 8; f11 Fig. 1

Not added: Fig. 6 (PID chemistry/shrinkage reaction mechanism, not a build drawing).

## ectc51846.2026.00389

Figures 6 -> 10.

Added:

| label | kind | bbox source | note |
|---|---|---|---|
| Fig. 1 | stack_schematic | candidate (p02_fig1) | Application concept; not a fabricated TV. |
| Fig. 4 | other | manual | Candidate p04_fig4 clipped the (b), (c) labels. |
| Fig. 7 | electrical_plot | manual | Candidate p04_fig7 clipped the x-axis title. |
| Fig. 8 | electrical_plot | manual | Candidate p05_fig8 clipped the (c), (d) axis labels. |

New rank order: f01 Fig. 3; f02 Fig. 2; f03 Fig. 1; f04 Fig. 4; f05 Table I; f06 Table II; f07 Fig. 6; f08 Fig. 7; f09 Fig. 9; f10 Fig. 8

Not added: Fig. 5 (raw MRR S21 traces), Fig. 10-11 (model-to-hardware overlays, no extracted values).

## ectc51846.2026.00134

Figures 6 -> 12.

Added:

| label | kind | bbox source | note |
|---|---|---|---|
| Fig. 3 | cross_section | manual | No candidate detected for Fig. 3. |
| Fig. 2 | micrograph | candidate (p02_fig2) |  |
| Fig. 8(a),(b) | package_photo | manual | Panel (c) cross-section is a separate row. |
| Fig. 5(b) | package_photo | candidate (p03_fig5) | Panel (a) is a separate row. |
| Fig. 9 | other | candidate (p04_fig9) | Concept image; not a fabricated build. |
| Fig. 6 | other | candidate (p03_fig6) |  |

New rank order: f01 Fig. 8(c); f02 Fig. 4; f03 Fig. 3; f04 Fig. 1; f05 Fig. 2; f06 Fig. 5(a); f07 Fig. 8(a),(b); f08 Fig. 5(b); f09 Fig. 10; f10 Fig. 9; f11 Fig. 7; f12 Fig. 6

Not added: none.

## ectc51909.2023.00190

Figures 6 -> 7.

Added:

| label | kind | bbox source | note |
|---|---|---|---|
| Fig. 6 | micrograph | candidate (p04_fig6) |  |

New rank order: f01 Fig. 5; f02 Fig. 1; f03 Fig. 4; f04 Fig. 6; f05 Fig. 3; f06 Fig. 7; f07 Fig. 2

Not added: none.

## Judgment calls

- ectc51906.2022.00181 Fig. 4-6 (TCCUF/TCNCF/TCNCP flows) added as process-flow drawings with empty tv_ids: they describe bonding options, the TV used mass reflow.
- Concept drawings of non-fabricated structures added at low rank with empty tv_ids and a note: ectc51846.2026.00389 Fig. 1, ectc51846.2026.00134 Fig. 9, ectc51909.2023.00219 Fig. 4.
- Split figures: ectc51846.2026.00134 Fig. 8(a),(b) and Fig. 5(b) added as separate rows next to existing Fig. 8(c) and Fig. 5(a).
- Plots/tables added where metrics.csv cites them as the value source (e.g. ectc51687.2025.00178 Fig. 2-4, 7, 11, 12, 19, 20, Table 2; ectc51909.2023.00219 Fig. 11, 15, 16).
- Candidate p02_fig3 of ectc51687.2025.00178 kept although "Core material" reads "Core materia": the truncation is in the source image itself.
