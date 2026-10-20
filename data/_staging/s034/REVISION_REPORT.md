# Revision report s034 (figures supplement, 2026-10-20)

Mode: figures_supplement. Only `figures.csv` edited; all other CSVs and evidence untouched. Existing rows keep their
bbox, caption, shows and notes; only `rank` and `fig_id` changed (renumbered `<paper_id>-fNN` in rank order).
Validator: `uv run python scripts/validate_db.py --staging data/_staging/s034` -> 0 errors, 0 warnings.
Every candidate in `candidates.json` was compared with the existing rows; every added crop (candidate png or manual
re-crop) was opened. Manual re-crops are in the session scratch folder only.

## ectc51846.2026.00119 (6 -> 10)
Added:
- Fig. 4, micrograph (optical top view of b-HAST comb substrate), candidate p03_fig4
- Fig. 3, package_photo (thermal coupon on heat sink + IR view), candidate p03_fig3
- Fig. 8, micrograph (3D profilometer maps with Sa values), candidate p04_fig8
- Fig. 1, stack_schematic (conventional heat-sink solution, paper-level), candidate p01_fig1

Rank: 1 Fig. 6, 2 Fig. 2, 3 Fig. 7, 4 Fig. 4, 5 Fig. 3, 6 Fig. 8, 7 Fig. 1, 8 Fig. 9, 9 Fig. 10, 10 Fig. 5

## ectc51846.2026.00209 (6 -> 9)
Added:
- Fig. 6, package_photo (four-point probe samples), candidate p04_fig6
- Fig. 5, package_photo (tape-test adhesion samples), candidate p03_fig5
- Fig. 1, top_view_layout (laser via machining pattern), candidate p02_fig1

Rank: 1 Fig. 9, 2 Fig. 7, 3 Fig. 6, 4 Fig. 5, 5 Fig. 8, 6 Fig. 1, 7 Fig. 3, 8 Fig. 2, 9 Fig. 4
Re-rank: the Fig. 4 via-profile plot moved from rank 2 to last, below the photos and images.

## ectc51846.2026.00024 (6 -> 10)
Added:
- Fig. 9, cross_section (TEM-PED of W2W bonded interface), candidate p06_fig9
- Fig. 10, cross_section (SEM of bonded interface after 250 C anneal), candidate p06_fig10
- Fig. 2, cross_section (TEM-PED of 3 um pad), candidate p04_fig2
- Fig. 1, cross_section (TEM-PED of blanket Cu films), candidate p03_fig1

Rank: 1 Fig. 6, 2 Fig. 8, 3 Fig. 9, 4 Fig. 10, 5 Fig. 7, 6 Fig. 3, 7 Fig. 2, 8 Fig. 4, 9 Fig. 1, 10 Fig. 5

## tcpmt.2025.3538554 (6 -> 17)
Added:
- Fig. 1, stack_schematic (exploded module diagram), candidate p02_fig1
- Fig. 5, package_photo (DLSSI both sides), candidate p05_fig5
- Fig. 4, package_photo (8-in DLSSI wafer), candidate p05_fig4
- Fig. 8, top_view_layout (four-RDL wire drawings), candidate p06_fig8
- Fig. 7, top_view_layout (fan-out floorplan schematic), candidate p06_fig7
- Fig. 12, package_photo (Al short layer + probe test), candidate p08_fig12
- Fig. 9, simulation_result (FEA mesh, TV c), candidate p07_fig9
- Table I, data_table (component table), manual 2:0.505,0.305,0.925,0.455 (candidate had no title/header)
- Fig. 10, simulation_result (simulated warpage), candidate p07_fig10
- Table II, data_table (RDL count vs L/S), manual 3:0.075,0.07,0.49,0.185 (no candidate)
- Table IV, data_table (DLSSI material properties/volumes), manual 7:0.08,0.07,0.49,0.19 (candidate held only the title)

Rank: 1 Fig. 6, 2 Fig. 2, 3 Fig. 1, 4 Fig. 13, 5 Fig. 5, 6 Fig. 4, 7 Fig. 3, 8 Fig. 8, 9 Fig. 7, 10 Fig. 12, 11 Fig. 9,
12 Table III, 13 Table I, 14 Fig. 11, 15 Fig. 10, 16 Table II, 17 Table IV
Not added: Tables V and VI (FEA solder/connector properties, reflow stage list); no rows cite them.

## ectc51846.2026.00115 (6 -> 10)
Added:
- Fig. 10, cross_section (SEM + EDS line scan across TGV fill), manual 7:0.105,0.175,0.485,0.343 (candidate cut the x-axis)
- Fig. 7, cross_section (planar composite SEM/EDS, TV b), candidate p05_fig7
- Fig. 4, micrograph (particle plating schematic + SEM/EDS), manual 4:0.1,0.085,0.9,0.4 (candidate cut the schematic labels)
- Fig. 5, cross_section (FIB-SEM of Cu shell on particles), candidate p04_fig5

Rank: 1 Fig. 9, 2 Fig. 2, 3 Fig. 8, 4 Fig. 10, 5 Fig. 7, 6 Fig. 4, 7 Fig. 5, 8 Fig. 3, 9 Fig. 6, 10 Fig. 1

## ectc51846.2026.00208 (6 -> 14)
Added:
- Fig. 10, cross_section (TGV fills without agitation), candidate p05_fig10
- Fig. 12, package_photo (wafer surface at 5 vs 0.5 A/dm2), candidate p05_fig12
- Fig. 7, package_photo (EL-Ni delamination vs Cu adhesion layer), candidate p03_fig7
- Fig. 9, micrograph (top views of plated TGV arrays), candidate p04_fig9
- Fig. 6, micrograph (EDX Ni sidewall maps), candidate p03_fig6
- Fig. 2, other (sputter mechanism schematic), candidate p02_fig2
- Fig. 8, other (Ni-glass vs Ni-Cu bonding schematic), candidate p04_fig8
- Fig. 3, other (electroless plating mechanism schematic), candidate p02_fig3

Rank: 1 Fig. 13, 2 Fig. 14, 3 Fig. 5, 4 Fig. 11, 5 Fig. 10, 6 Fig. 4, 7 Fig. 12, 8 Fig. 7, 9 Fig. 1, 10 Fig. 9, 11 Fig. 6,
12 Fig. 2, 13 Fig. 8, 14 Fig. 3
Not added: Fig. 15 (photo of a vendor Cu pillar mounter; equipment, not the build).

## ectc51687.2025.00356 (6 -> 8)
Added:
- Fig. 7, cross_section (TSV fills at wafer center/middle/edge), candidate p04_fig7
- Figure 1, micrograph (CD-SEM top views of TSV openings), candidate p02_fig1

Rank: 1 Fig. 8, 2 Fig. 3, 3 Fig. 4, 4 Fig. 6, 5 Fig. 5, 6 Fig. 7, 7 Figure 1, 8 Figure 2

## ectc51846.2026.00123 (5 -> 8)
Added:
- Fig. 1, stack_schematic (IVPD cross-section + exploded dual-plane DTC), manual 2:0.105,0.09,0.9,0.43 (no candidate)
- Table I, data_table (de-embedding table with open/short/DUT layout drawings), manual 4:0.1,0.285,0.9,0.638 (candidate had no title)
- Fig. 4, other (VNA/GSG probing setup schematic, cal-kit photos), manual 4:0.14,0.09,0.86,0.24 (no candidate)

Rank: 1 Fig. 2, 2 Fig. 3, 3 Fig. 1, 4 Table I, 5 Fig. 4, 6 Fig. 6, 7 Table III, 8 Table II
Not added: Fig. 5 (circuit-configuration drawings and impedance accuracy windows based on ref [23]; no extracted values).

## Judgment calls
- Mechanism and concept schematics (00208 Figs. 2, 3, 8; 00119 Fig. 1) were added as low-rank schematics under the
  "every schematic drawing" rule, with notes saying they are not a built TV.
- 00123 Fig. 1 panel (a) is from ref [2]; panel (b) shows this paper's dual-plane structure, so reprinted = no, with
  a note.
- After rank 1, the order is: cross-sections and stack schematics, then package photos, then the process flow,
  layouts, other images and schematics, then plots and tables. Where an existing order already followed this, it was
  kept.
