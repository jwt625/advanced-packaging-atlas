# Revision report s020 (figures supplement, 2026-10-19)

Scope: `figures.csv` only. I compared every candidate in `references/<id>/figures/candidates.json` and every page render with the existing rows, and opened each candidate crop or manual re-crop cited below. Existing rows keep their bbox, cand_id, caption and shows. Only rank and fig_id changed, plus one note (iedm Fig. 16; see below). fig_id values are renumbered `-f01..` in rank order.

Validator: `uv run python scripts/validate_db.py --staging data/_staging/s020` -> 0 errors, 0 warnings.

Figure counts went from 47 to 77 (30 added).

## iedm45741.2023.10413829 (6 -> 9)
Added:
- Fig. 15, cross_section, manual (0.085,0.648,0.395,0.793). The paper has no candidates because the source is OCR.
- Fig. 17, cross_section, manual (0.678,0.628,0.94,0.797).
- Fig. 1, top_view_layout, manual (0.085,0.085,0.31,0.275).

New order: 1 Fig. 16 > 2 Fig. 15 > 3 Fig. 17 > 4 Fig. 2 > 5 Fig. 4 > 6 Fig. 1 > 7 Fig. 11 > 8 Fig. 13 > 9 Fig. 14

Note edit: the Fig. 16 row note said "Fig. 15 ... left out". It now says that Fig. 15 is a separate row.

## icep58572.2023.10129695 (6 -> 6)
No additions. Every schematic and image (Figs. 1-5) was already a row. Table I (film property table) was not added. Order is unchanged: 1 Fig. 4 > 2 Fig. 5 > 3 Fig. 3 > 4 Fig. 1 > 5 Fig. 2 > 6 Fig. 2 (B-HAST)

## ectc51846.2026.00016 (6 -> 8)
Added:
- Fig. 8, stack_schematic, candidate p05_fig8. It shows the package thermal stack with heat sink and vapor chamber (TV -d).
- Fig. 10, optical_plot, candidate p06_fig10. It has an inset drawing of the EC, adhesive and FA, and it carries the coupling-loss values (TV -e).

New order: 1 Fig. 2 > 2 Fig. 1 > 3 Fig. 3 > 4 Fig. 8 > 5 Fig. 4 > 6 Fig. 6 > 7 Fig. 10 > 8 Fig. 11

Not added: Figs. 5, 7 and 9 (HFSS and FEA simulation renders and plots).

## ectc51909.2023.00179 (6 -> 10)
Added:
- Fig. 11, stack_schematic, candidate p04_fig11.
- Fig. 8, xray_csam, candidate p03_fig8.
- Fig. 7, xray_csam, candidate p03_fig7.
- Fig. 9, micrograph, manual (0.539,0.339,0.888,0.4636). The candidate crop had text-line remnants at the top.

New order: 1 Fig. 1 > 2 Fig. 11 > 3 Fig. 8 > 4 Fig. 7 > 5 Fig. 4 > 6 Fig. 9 > 7 Fig. 2 > 8 Fig. 12 > 9 Table 1 > 10 Fig. 6

Not added: Fig. 5 (Cu pop-up profile plot) and Fig. 10 (particle count bar chart). The paper has no Fig. 3; the numbering skips it.

## ectc51909.2023.00151 (6 -> 14)
Added:
- Fig. 5, cross_section, candidate p02_fig5.
- Fig. 7, process_flow, candidate p03_fig7.
- Fig. 10, xray_csam, candidate p03_fig10.
- Fig. 9, stack_schematic, candidate p03_fig9.
- Fig. 13, stack_schematic, candidate p04_fig13.
- Fig. 11, other (gap schematic), candidate p03_fig11.
- Fig. 1, stack_schematic, candidate p01_fig1. Set reprinted yes (from ref [1]). It is a generic 2.5D SiP drawing, so it is paper-level with tv_ids empty.
- Fig. 2, warpage_plot, candidate p02_fig2. It has an inset drawing of the blanket stack and carries the LMC warpage values (TVs -d/-e/-f).

New order: 1 Fig. 8 > 2 Fig. 5 > 3 Fig. 3 > 4 Fig. 4 > 5 Fig. 7 > 6 Fig. 10 > 7 Fig. 12 > 8 Fig. 9 > 9 Fig. 13 > 10 Fig. 11 > 11 Fig. 1 > 12 Fig. 2 > 13 Fig. 14 > 14 Table II

Not added: Table I (LMC properties) and Fig. 6 (warpage-range bar).

## tcpmt.2025.3599484 (6 -> 10)
Added:
- Fig. 11, cross_section, candidate p08_fig11.
- Fig. 2, top_view_layout, candidate p03_fig2.
- Fig. 5, other (grayscale-lithography schematic), manual (0.09,0.068,0.485,0.468). The candidate crop included the running header.
- Fig. 6, micrograph, candidate p05_fig6.

New order: 1 Fig. 9 > 2 Fig. 10 > 3 Fig. 11 > 4 Fig. 1 > 5 Fig. 4 > 6 Fig. 2 > 7 Fig. 5 > 8 Fig. 8 > 9 Fig. 6 > 10 Fig. 12

Re-rank: I moved the Fig. 10 cross-section ahead of the stack schematic and the process flow, following the rank rule.

Not added: Fig. 3 (HFSS simulation), Fig. 7 (depth vs dose plot), Table I (routing density) and the author photos on p.10.

## ectc51909.2023.00266 (6 -> 15)
Added:
- Fig. 6, cross_section, candidate p03_fig6.
- Fig. 8, micrograph (AOI of RDL1-5 and UBM), candidate p03_fig8.
- Fig. 3, micrograph, candidate p02_fig3.
- Fig. 4, package_photo, candidate p02_fig4.
- Fig. 5, package_photo, candidate p03_fig5.
- Fig. 12, package_photo, candidate p04_fig12.
- Fig. 15, micrograph, candidate p04_fig15.
- Fig. 14, package_photo, candidate p04_fig14.
- Fig. 10, micrograph, candidate p04_fig10.

New order: 1 Fig. 7 > 2 Fig. 6 > 3 Fig. 2 > 4 Fig. 8 > 5 Fig. 3 > 6 Fig. 4 > 7 Fig. 5 > 8 Fig. 12 > 9 Fig. 9 > 10 Fig. 15 > 11 Fig. 14 > 12 Fig. 10 > 13 Table I > 14 Fig. 13 > 15 Fig. 11

Not added: Fig. 1 (cost chart sourced from TSMC) and Table II (BLR TC result table).

## ectc51687.2025.00051 (5 -> 5)
No additions. Two figures were left out:
- Fig. 1 is an overview of the Intel Foundry packaging portfolio (product photos and renders). It does not show this paper's TV.
- Fig. 6 is a roadmap.

The p.2 panels of Fig. 3 stay left out, as the existing row's note says. Order is unchanged: 1 Fig. 5 > 2 Fig. 4 > 3 Fig. 3 > 4 Fig. 2 > 5 Table I
