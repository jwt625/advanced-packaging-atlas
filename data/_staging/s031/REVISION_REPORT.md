# Revision report s031 (figures supplement, 2026-10-20)

Scope: `figures.csv` only (key-figure rule of 2026-10-19). No other CSV or evidence file changed. Existing rows keep
their bbox, cand_id, caption, shows and notes; only `fig_id` and `rank` changed by re-ranking. Every figure label in
each text.md was compared with candidates.json and existing rows; every added crop (candidate png or manual re-crop)
was opened.

Validator: `0 errors, 0 warnings (data/_staging/s031)`.

## ectc51687.2025.00071 (6 -> 9)
Added:
- Fig. 2, cross_section (SEM of DC-plating pore and pinch-off defects), candidate p02_fig2
- Fig. 3, other (DC multistage and pulse-reverse waveform schematics), candidate p02_fig3
- Fig. 9, other (TSV segmentation schematic + grain size vs depth), candidate p05_fig9

Rank: f01 Fig. 4, f02 Fig. 1, f03 Fig. 2, f04 Fig. 7, f05 Fig. 3, f06 Fig. 9, f07 Fig. 6, f08 Fig. 8, f09 Fig. 5

## icep-iaac64884.2025.11002958 (6 -> 9)
Added:
- Fig. 1, process_flow (Cu wiring flow + sputter cluster tool drawing), manual (candidate clipped bottom labels)
- Fig. 3, other (LIS schematic, photo and cross-section; TV a), manual (candidate clipped Gas (Ar) label)
- Fig. 2, other (CCP schematic), manual (candidate clipped RF electrode)

Rank: f01 Fig. 9, f02 Fig. 6, f03 Fig. 1, f04 Fig. 3, f05 Fig. 2, f06 Fig. 5, f07 Fig. 7, f08 Fig. 8, f09 Fig. 4

## ectc51846.2026.00198 (6 -> 8)
Added:
- Fig. 4, micrograph (optical resist patterns at field center), candidate p03_fig4
- Fig. 1, other (focus vs image height plot; supports metric c-m1), candidate p02_fig1

Rank: f01 Fig. 6, f02 Fig. 3, f03 Fig. 7, f04 Fig. 5, f05 Fig. 4, f06 Fig. 8, f07 Fig. 2, f08 Fig. 1
(images moved ahead of the Bossung plot.)

## ectc51846.2026.00012 (6 -> 9)
Added:
- Fig. 3, warpage_plot (full-field topography maps, EMC wafers), candidate p04_fig3
- Fig. 5, warpage_plot (topography maps, EMC panels), manual (candidate had large blank top margin)
- Fig. 6, warpage_plot (topography maps, ABF substrates), candidate p05_fig6

Not added: Fig. 4 and Fig. 7 (PV bar chart and initial-vs-final plot duplicate Tables I and III values; no extracted
value comes from them). The paper has no cross-section or stack drawing; the measured topography maps are the only
depictions of the builds.

Rank: f01 Fig. 1, f02 Fig. 2, f03 Fig. 3, f04 Fig. 5, f05 Fig. 6, f06 Table I, f07 Table III, f08 Table II, f09 Fig. 8

## ectc51529.2024.00170 (6 -> 12)
Added:
- Fig. 6, stack_schematic (module on evaluation board with load module), candidate p03_fig6
- Fig. 5, other (3D rendering of DC-DC module), candidate p03_fig5
- Fig. 7, block_diagram (evaluation system), manual (candidate merged Fig. 8 caption)
- Table II, data_table (droop test condition), candidate p03_tableii
- Fig. 9, electrical_plot (bottom-substrate impedance; cited by metrics b-m4, c-m3), candidate p04_fig9
- Fig. 2, electrical_plot (iPaS vs general substrate impedance; TV f metrics), candidate p02_fig2

Rank: f01 Fig. 3, f02 Fig. 4, f03 Fig. 1, f04 Fig. 6, f05 Fig. 5, f06 Fig. 7, f07 Table I, f08 Table II, f09 Fig. 8,
f10 Fig. 9, f11 Fig. 10, f12 Fig. 2

## ectc51846.2026.00302 (4 -> 4)
No change: all four figures (Fig. 1-4) already present.

Rank: f01 Fig. 1, f02 Fig. 2, f03 Fig. 3, f04 Fig. 4

## ectc51529.2024.00106 (6 -> 11)
Added:
- Fig. 3, process_flow (B2F bond/debond schematic with wafer photos), candidate p03_fig3
- Fig. 9, micrograph (optical and IR images of N=4 stacks), candidate p04_fig9
- Fig. 5, xray_csam (SAM of N=2/N=3 interfaces, optical, SEM), candidate p03_fig5
- Fig. 6, xray_csam (SAM of N=2 interface after tiers 1-3), candidate p04_fig6
- Fig. 7, xray_csam (SAM of N=2, N=3, N=4 interfaces), candidate p04_fig7

Rank: f01 Fig. 11, f02 Fig. 2, f03 Fig. 1, f04 Fig. 3, f05 Fig. 8, f06 Fig. 9, f07 Fig. 5, f08 Fig. 6, f09 Fig. 7,
f10 Fig. 10, f11 Fig. 4 (Fig. 8 stack photo/IR moved ahead of the yield bar charts.)

## tcpmt.2025.3540665 (3 -> 3)
No change: all three figures already present.

Rank: f01 Fig. 2, f02 Fig. 1, f03 Fig. 3

## Judgment calls
- Equipment schematics (icep Fig. 1-3, 00012 Fig. 1) are kept as "other schematics"; icep TV a is the LIS apparatus.
- Topography (height) maps classed warpage_plot, ranked with images since they are the only views of those builds.
- 00170 Fig. 5 is a 3D rendering, kind other (not package_photo).
