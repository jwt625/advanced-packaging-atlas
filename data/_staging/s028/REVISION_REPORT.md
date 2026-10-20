# Revision report s028 (figures supplement, 2026-10-20)

Mode: figures_supplement (DevLog-005 decisions 2026-10-19). Only `figures.csv` edited. Existing rows keep their bbox, caption,
shows and notes; only `fig_id`/`rank` changed by re-ranking. Every added crop was opened (candidate png or manual re-crop
in the session scratch folder).

Validator: `uv run python scripts/validate_db.py --staging data/_staging/s028` -> 0 errors, 0 warnings.

## ectc51687.2025.00323 (6 -> 10)
Added:
- Fig. 3 (p.2) process_flow, candidate p02_fig3: generic three-layer WoW flow citing [5, 6], paper-level (no tv_ids)
- Fig. 6 (p.3) xray_csam, candidate p03_fig6: SAM image of 200 mm wafer
- Fig. 8 (p.3) other, candidate p03_fig8: alignment scatter (misalignment < 0.5 um metric)
- Fig. 10 (p.4) other, manual 0.515,0.085,0.905,0.29: STEM-EDS profiles (oxidized Cu 9.9/6.8/5.3 nm); candidate clipped axis labels

Skipped: Fig. 1 (stacked BI-CIS roadmap), Fig. 2 (generic WoW vs CoW comparison table), Fig. 7, Fig. 9 (values covered by text and Fig. 12/14).
Rank: f01 Fig. 13, f02 Fig. 5, f03 Fig. 4, f04 Fig. 3, f05 Fig. 6, f06 Fig. 14, f07 Fig. 8, f08 Fig. 12, f09 Fig. 10, f10 Fig. 15

## ectc51846.2026.00062 (6 -> 12)
Added:
- Fig. 2 (p.2) micrograph, manual 0.525,0.325,0.912,0.515 (no candidate): frontside pillar SEM + profilometry
- Fig. 3 (p.2) micrograph, manual 0.52,0.765,0.90,0.89: backside pad SEM; panels on p.2, caption on p.3 (candidate held only the caption)
- Fig. 5 (p.3) micrograph, manual 0.52,0.088,0.895,0.335 (no candidate): electrical-TV backside pads / frontside pillars
- Fig. 9 (p.5) micrograph, manual 0.10,0.505,0.48,0.765: backside pad images + roughness bars (candidate clipped the chart)
- Fig. 11 (p.6) electrical_plot, candidate p06_fig11: chain resistance CDFs
- Fig. 7 (p.4) warpage_plot, manual 0.52,0.205,0.90,0.368: die warpage line scan (candidate clipped x-axis)

Skipped: Fig. 6 (bonding-profile traces; no extracted values cite it).
Rank: f01 Fig. 10, f02 Fig. 8, f03 Fig. 4, f04 Fig. 1, f05 Fig. 5, f06 Fig. 2, f07 Fig. 3, f08 Fig. 9, f09 Fig. 11, f10 Fig. 7, f11 Table II, f12 Table I

## eptc62800.2024.10909872 (6 -> 8)
Added:
- Fig. 6 (p.3) package_photo, candidate p03_fig6: panel side view and edge-lift ruler measurement (TV -b)
- Table 1 (p.3) data_table, manual 0.10,0.65,0.49,0.80: predicted warpage by carrier type (TV -d); candidate omitted the title

Rank: f01 Fig. 4, f02 Fig. 2, f03 Fig. 1, f04 Fig. 7, f05 Fig. 6, f06 Fig. 3, f07 Fig. 5, f08 Table 1
(package photo Fig. 7 moved up from rank 6 to 4 per the image-before-plots rule.)

## ectc51529.2024.00258 (6 -> 17)
Added (schematics/layouts):
- Fig. 5 (p.3) top_view_layout, candidate p03_fig5: daisy-chain GDS + schematic
- Fig. 10 (p.4) top_view_layout, candidate p04_fig10: leakage-pattern GDS + schematic
- Fig. 1 (p.1) stack_schematic, candidate p01_fig1: conventional vs backside PDN concept, paper-level
Added (plots/tables carrying extracted metrics m8-m17):
- Fig. 7 (p.3) electrical_plot, candidate p03_fig7
- Fig. 9 (p.3) electrical_plot, manual 0.52,0.62,0.88,0.822 (candidate had a caption fragment)
- Fig. 11 (p.4) electrical_plot, manual 0.10,0.36,0.475,0.582 (candidate had a caption fragment)
- Table 1 (p.4) data_table, manual 0.09,0.758,0.495,0.842 (candidate omitted the title)
- Fig. 12 (p.4) reliability_plot, candidate p04_fig12
- Fig. 13 (p.4) reliability_plot, manual 0.535,0.38,0.89,0.575 (candidate had a caption fragment)
- Fig. 15 (p.5) reliability_plot, manual 0.13,0.335,0.48,0.52 (candidate had a caption fragment)
- Fig. 16 (p.5) reliability_plot, candidate p05_fig16

Rank: f01 Fig. 3, f02 Fig. 2, f03 Fig. 8, f04 Fig. 5, f05 Fig. 10, f06 Fig. 1, f07 Fig. 4, f08 Fig. 7, f09 Fig. 9, f10 Fig. 11,
f11 Table 1, f12 Fig. 12, f13 Fig. 13, f14 Fig. 14, f15 Fig. 15, f16 Fig. 16, f17 Fig. 17

## ectc51846.2026.00227 (6 -> 15)
Added:
- Fig. 10 (p.4) cross_section, candidate p04_fig10: SEM side view of 3D stack joints (TV -a)
- Fig. 15 (p.5) package_photo, candidate p05_fig15: top view with cut plane (TV -a)
- Fig. 1 (p.1) process_flow, candidate p01_fig1: plasma oxide-removal concept, cited to [4], reprinted yes, paper-level
- Fig. 9 (p.4) xray_csam, candidate p04_fig9: X-ray at four corners (TV -a)
- Fig. 14 (p.5) cross_section, candidate p05_fig14: non-wet joints before AOR optimization (TV -b)
- Fig. 6 (p.3) micrograph, manual 0.51,0.528,0.90,0.7635: laminate Sn presolder before/after AOR (candidate clipped scale-bar labels)
- Fig. 8 (p.4) micrograph, candidate p04_fig8: wettability on laminate/interposer (TV -a)
- Fig. 11 (p.4) micrograph, candidate p04_fig11: 25 um pitch wettability (TV -b)
- Fig. 7 (p.4) other, candidate p04_fig7: EDX oxygen bars (metrics a-m1..m3)

Skipped: Fig. 2 (bonder block diagram, no build drawing).
Rank: f01 Fig. 16, f02 Fig. 3, f03 Fig. 10, f04 Fig. 13, f05 Fig. 15, f06 Fig. 12, f07 Fig. 1, f08 Fig. 9, f09 Fig. 14,
f10 Fig. 4, f11 Fig. 6, f12 Fig. 8, f13 Fig. 11, f14 Fig. 5, f15 Fig. 7

## ectc51529.2024.00087 (6 -> 6)
No additions. Only Fig. 1 is missing, and it is a generic wafer-vs-panel motivation graphic (not this paper's build). Order unchanged.

## tcpmt.2026.3650893 (6 -> 8)
Added:
- Fig. 1 (p.1) process_flow, manual 0.55,0.175,0.89,0.295: HB vs IHB concept, paper-level (candidate included title/author text)
- Fig. 4 (p.2) micrograph, candidate p02_fig4: ZnO coverage SEM on debonded bottom die (TV -a)

Rank: f01 Fig. 7, f02 Fig. 5, f03 Fig. 2, f04 Fig. 3, f05 Fig. 1, f06 Fig. 4, f07 Fig. 6, f08 Fig. 8

## ectc51529.2024.00321 (6 -> 15)
Added:
- Fig. 5 (p.2) stack_schematic, manual 0.51,0.50,0.905,0.622 (no candidate): panel-edge Cu-plating prevention drawing + photo (TV -f)
- Fig. 11 (p.4) package_photo, candidate p04_fig11a: final panel photo + 360 um warpage map (TV -a)
- Fig. 12 (p.4) micrograph, manual 0.135,0.665,0.445,0.842: L/S 5/5 um RDL SEM (candidate included a Fig. 11 caption line)
- Fig. 7 (p.3) package_photo, candidate p03_fig7: 576 vs 729 chip panels (TVs -a..-d)
- Fig. 6 (p.2) warpage_plot, candidate p02_fig6: before/after Cu-plating prevention photos + maps (TV -f)
- Fig. 3 (p.2) simulation_result, candidate p02_fig3 (TV -g)
- Fig. 9 (p.3) simulation_result, candidate p03_fig9 (TV -g)
- Table I (p.3) data_table, manual 0.515,0.555,0.907,0.71 (candidate omitted the title) (TV -g)
- Fig. 14 (p.4) other, candidate p04_fig14: Cu width vs L/S (TV -a)

Rank: f01 Fig. 13, f02 Fig. 2, f03 Fig. 1, f04 Fig. 5, f05 Fig. 11, f06 Fig. 12, f07 Fig. 7, f08 Fig. 6, f09 Fig. 4, f10 Fig. 8,
f11 Fig. 10, f12 Fig. 3, f13 Fig. 9, f14 Table I, f15 Fig. 14

## Issues
- No figure_kind for scatter/box/bar/profile plots; used `other` with a note (unchanged convention).
- ectc51687.2025.00323 Fig. 3 and tcpmt Fig. 1 / 00227 Fig. 1 / 00258 Fig. 1 are concept or generic drawings kept per the
  "every schematic" rule with empty tv_ids; only 00227 Fig. 1 is marked reprinted (caption cites [4]).
