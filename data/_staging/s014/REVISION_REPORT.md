# Revision report s014 (figures supplement, 2026-10-19)

Scope: `figures.csv` only. Key-figure rule (2026-10-19): every schematic drawing and every image of the build, plus the plots/tables that carry extracted values. Every candidate in `candidates.json` and every page render was compared with the existing rows. Every cited crop was opened (candidate png or manual re-crop in the scratch folder). Existing rows keep their bbox and fields. Two stale notes were rewritten (00072 Fig. 2, 00180 Fig. 9). fig_ids were renumbered in rank order.

Rank tiers used for every paper: best views of the physical build (cross-section images > stack schematics > package photos), then process flow, then layout/floorplan, then other schematics and images, then plots/tables.

Validator: `uv run python scripts/validate_db.py --staging data/_staging/s014` -> 0 errors, 0 warnings.

## ectc51906.2022.00142 (6 -> 13)
Added:
- Fig. 13, cross_section, candidate p05_fig13
- Fig. 2, stack_schematic, candidate p02_fig2
- Fig. 1, other (copper-foil schematic), manual (no candidate)
- Fig. 9, micrograph, candidate p04_fig9
- Fig. 11, micrograph, candidate p05_fig11
- Fig. 8, micrograph, candidate p04_fig8
- Table III, data_table, candidate p05_tableiii

Rank order: f01 Fig. 10, f02 Fig. 13, f03 Fig. 3, f04 Fig. 2, f05 Fig. 4, f06 Fig. 1, f07 Fig. 9, f08 Fig. 11, f09 Fig. 8, f10 Fig. 6, f11 Fig. 5, f12 Fig. 12, f13 Table III.
Not added: Fig. 7 (shadow-moire maps; the warpage values are in Fig. 6), Table I (UV doses, also on the Fig. 5 axis), Table II (HAST condition, also in the text).

## ectc51906.2022.00072 (6 -> 7)
Added:
- Fig. 5, reliability_plot, manual (candidate p06_fig5 clipped the HTS panel). The bbox covers the right-column TC and HTS panels. The DH and LTS panels in the left column are named in notes.

Rank order: f01 Fig. 1, f02 Fig. 4, f03 Fig. 2, f04 Fig. 3, f05 Table 1, f06 Fig. 5, f07 Fig. 6.
Fig. 2 (DCB/BOR schematics and coupon images) moved ahead of the plots. Its note no longer says Fig. 5 was skipped.

## ectc51906.2022.00180 (6 -> 13)
Added:
- Fig. 1, stack_schematic (concept, paper-level), candidate p01_fig1
- Fig. 6, package_photo (with x-ray panel), candidate p04_fig6
- Fig. 12, package_photo (with x-ray panel), candidate p06_fig12
- Fig. 5, package_photo, candidate p04_fig5
- Fig. 11, package_photo, candidate p06_fig11
- Fig. 2, top_view_layout, candidate p02_fig2
- Fig. 8, micrograph (die photos), candidate p05_fig8

Rank order: f01 Fig. 7, f02 Fig. 13, f03 Fig. 3, f04 Fig. 1, f05 Fig. 6, f06 Fig. 12, f07 Fig. 4, f08 Fig. 10, f09 Fig. 9, f10 Fig. 5, f11 Fig. 11, f12 Fig. 2, f13 Fig. 8.
The Fig. 9 note about the 6-figure cap was removed because Fig. 12 is now included.

## iedm19573.2019.8993637 (6 -> 10)
Added:
- Fig. 7, cross_section, candidate p03_fig7
- Fig. 8, cross_section, candidate p04_fig8
- Fig. 5, micrograph, manual (candidate clipped the bottom bump row)
- Fig. 12, electrical_plot, manual (candidate clipped the x-axis label). TSV resistance rows cite it.

Rank order: f01 Fig. 1, f02 Fig. 9, f03 Fig. 7, f04 Fig. 8, f05 Fig. 6, f06 Fig. 4, f07 Fig. 5, f08 Fig. 11, f09 Fig. 12, f10 Fig. 13.
Not added: Fig. 2, 3 and 10 render only as fragments (broken embedded images; the existing note is kept).

## itherm45881.2020.9190542 (6 -> 15)
Added:
- Fig. 3, package_photo, manual (candidate clipped the bottom)
- Fig. 7, stack_schematic, candidate p03_fig7
- Fig. 5, stack_schematic (thermal model geometry), candidate p03_fig5
- Table 2, xray_csam (T-SAM images), manual (no candidate)
- Fig. 4, other (ThetaJC setup schematic), candidate p03_fig4
- Fig. 6, other (power-input model view), candidate p03_fig6
- Fig. 13, other (vapor-chamber thermal model, TV b), manual (candidate spanned Table 7)
- Fig. 12, thermal_plot, candidate p05_fig12
- Table 7, data_table, manual (no candidate). 42 rows cite it.

Rank order: f01 Fig. 2, f02 Fig. 3, f03 Fig. 1, f04 Fig. 7, f05 Fig. 5, f06 Table 2, f07 Fig. 4, f08 Fig. 6, f09 Fig. 13, f10 Table 1, f11 Fig. 8, f12 Fig. 9, f13 Fig. 12, f14 Table 7, f15 Table 8.
Not added: Tables 3-6 (their values are in Fig. 8, Fig. 9 and Fig. 12, or they hold conditions only), Fig. 10 (same data as Table 5 and Fig. 9), Fig. 11 (simulated temperature contour render), Figs. 14-16 (plots of the Table 7/8 data).

## ectc.2016.201 (6 -> 12)
Added:
- Fig. 3, stack_schematic, candidate p04_fig3
- Fig. 2, top_view_layout (generic 4-row pattern plus IO-density plot, paper-level), candidate p03_fig2
- Fig. 8, top_view_layout, candidate p08_fig8
- Fig. 6, micrograph, manual (candidate covered only the left half)
- Fig. 9, micrograph, candidate p08_fig9
- Fig. 11, block_diagram (link circuit model), candidate p08_fig11

Rank order: f01 Fig. 4, f02 Fig. 3, f03 Fig. 7, f04 Fig. 5, f05 Fig. 2, f06 Fig. 8, f07 Fig. 6, f08 Fig. 9, f09 Fig. 11, f10 Table II, f11 Fig. 10, f12 Fig. 12.
Not added: Fig. 1 (reprinted memory-landscape roadmap) and Table I (cross-vendor technology comparison; no rows cite it).

## ectc51909.2023.00009 (6 -> 25)
Added:
- Fig. 12, cross_section, manual (no candidate)
- Fig. 13, cross_section, candidate p04_fig13
- Fig. 6, cross_section (schematic plus FIB), manual (no candidate)
- Fig. 9, cross_section, candidate p03_fig9
- Fig. 10, stack_schematic, candidate p04_fig10
- Fig. 5, stack_schematic, candidate p03_fig5
- Fig. 1, stack_schematic (ONoC system, TV b), candidate p02_fig1
- Fig. 2, top_view_layout (TV b), candidate p02_fig2
- Fig. 7, top_view_layout (MRR design plus schematic cross-section), manual (no candidate)
- Fig. 14, micrograph, candidate p04_fig14
- Fig. 17, micrograph, candidate p05_fig17
- Fig. 18, micrograph, manual (no candidate)
- Fig. 8, micrograph, candidate p03_fig8
- Table I, data_table, candidate p06_tablei
- Fig. 21, optical_plot, candidate p06_fig21
- Fig. 22, optical_plot, candidate p07_fig22
- Fig. 23, optical_plot, candidate p07_fig23
- Fig. 24, electrical_plot, candidate p07_fig24
- Fig. 26, electrical_plot, candidate p07_fig26

Rank order: f01 Fig. 16, f02 Fig. 3, f03 Fig. 4, f04 Fig. 2, f05 Fig. 7, f06 Fig. 15, f07 Fig. 11, f08 Fig. 12, f09 Fig. 13, f10 Fig. 6, f11 Fig. 9, f12 Fig. 10, f13 Fig. 5, f14 Fig. 1, f15 Fig. 14, f16 Fig. 17, f17 Fig. 18, f18 Fig. 8, f19 Table I, f20 Fig. 21, f21 Fig. 22, f22 Fig. 23, f23 Fig. 24, f24 Fig. 26, f25 Fig. 27.
Not added: Fig. 19 (no row cites it), Fig. 20 and Fig. 25 (one citing row each).

## ectc51909.2023.00298 (6 -> 10)
Added:
- Fig. 3, micrograph, manual (candidate clipped the scale-bar text)
- Fig. 5, micrograph, candidate p03_fig5
- Fig. 6, micrograph, manual (candidate clipped the scale bar)
- Fig. 9, micrograph, manual (candidate clipped the bottom)

Rank order: f01 Fig. 8, f02 Fig. 1, f03 Fig. 2, f04 Fig. 3, f05 Fig. 4, f06 Fig. 5, f07 Fig. 6, f08 Fig. 7, f09 Fig. 9, f10 Fig. 10.
