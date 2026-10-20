# BATCH_REPORT b096 (2026-10-20)

Papers: eptc67330.2025.11392276, ectc51846.2026.00202, estc60143.2024.10712019. Schema v2.5.
Validator: `uv run python scripts/validate_db.py --staging data/_staging/b096` -> `0 errors, 0 warnings (data/_staging/b096)`.
author_affiliations / organizations / org_sites left header-only (separate pipeline).

## eptc67330.2025.11392276 - High-Aspect-Ratio TSiCV Etch Development in 4H-SiC (EPTC 2025)
- Status: distilled. process_flow_level: full (F1 full; typed temp_c 0 C chuck on the ICP etch steps).
- Rows: papers 1, tv 2, comp 2, layers 8, ic 2, flows 1, steps 7, ei 0, oi 0, metrics 44, figures 6.
- TVs: a = 30 um CD TSiCV on 200 mm 4H-SiC (coupons + full wafer); b = 20 um CD TSiCV (Ni redeposition blocks at 45 um).
- Figures opened: page_02-04.png; cand p02_fig1, p02_fig2, p03_fig3, p03_fig4, p03_fig5, p04_fig6; re-crops of Fig. 2, 3, 4, 5, 6 (400-500 dpi).
- Key figures:
  - f01 Fig. 3, cross_section, manual (candidate cut (c) scale bar)
  - f02 Fig. 4, cross_section, manual (candidate cut bottom row)
  - f03 Fig. 2, cross_section, candidate p02_fig2
  - f04 Fig. 1, micrograph, candidate p02_fig1
  - f05 Fig. 6, data_table, manual (candidate cut 'Overall' row)
  - f06 Fig. 5, other (trend plot), candidate p03_fig5
- Judgment calls: 20 um and 30 um CD as separate TVs (different via structure); recipes 1-3 and etch times as split/variants. The litho pillar diameter (a 30 / b 20 um) goes in `split` on one shared step. The two etch steps are TV deltas because the chemistry differs (SF6/Ar/O2 vs SF6/Ar). Fig. 5 values at 120 min, plus the CD and selectivity points, were read off the plot and flagged approx. Fig. 3 angle labels (92.2/93.7/94.7 deg) entered as labelled, noting 92.2 = 180 - 87.8 SWA. package_class other (SiC interposer via module). ic_type other for TSiCV.
- Not reported: wafer thickness, seed/barrier thickness, Ar/O2 flows, per-recipe pressure, metallization, reliability. Fig. 2 labels are undefined and Fig. 4 labels illegible, so neither was entered.
- Source problems: none (clean text). Text calls the full-wafer figure 'Figure 4' (it is Fig. 6).

## ectc51846.2026.00202 - Tether-Free Micro-Transfer-Printing of Si-based Micro-Inductors (ECTC 2026)
- Status: distilled. process_flow_level: full (F2 full: 130 C/240 s soft bake, 100 C/180 s and 90 C/1800 s cure, 50 C stamp cure; F1 ordered; F3 fragments).
- Rows: papers 1, tv 3, comp 10, layers 25, ic 1, flows 3, steps 34, ei 0, oi 0, metrics 14, figures 7.
- TVs: a = inductors in 130 um Si trenches (6 devices); b = inductors on glass (6 devices); c = preliminary trench-embedded inductor + capacitor with single-level RDL (Fig. 6).
- Figures opened: page_03-06.png; cand p03_fig1, p03_fig2, p04_fig3, p05_fig4, p05_fig5, p06_fig6; re-crops Fig. 1, Table I, Fig. 6(c) (600 dpi).
- Key figures:
  - f01 Fig. 3, cross_section, candidate p04_fig3
  - f02 Fig. 1, cross_section, manual (candidate cut scale bar)
  - f03 Fig. 2, process_flow, candidate p03_fig2
  - f04 Fig. 6, cross_section, candidate p06_fig6
  - f05 Table I, data_table, manual (no candidate)
  - f06 Fig. 4, electrical_plot, candidate p05_fig4
  - f07 Fig. 5, electrical_plot, candidate p05_fig5
- Judgment calls: F1 (inductor fab) and F2 (uTP) are separate flows, build_seq 1/2, both linked to a, b and c. Glass vs Si-trench target substrate and print steps are TV deltas (b vs a;c). The Intervia cure is split into UV flash / hot plate / oven per the text order. PDMS stamp fabrication is a tooling step (inferred_order). TV c is in F1/F2 because p.7 says the RDL was built over a transfer-printed, trench-embedded inductor; F3 holds its fragments. L/R at 70 MHz are metrics (power_delivery) as mean with sigma in value_text, n=6. No interconnects for a/b (adhesive attach only; pads probed directly).
- Not reported: BCB bake/cure temperatures, layer thicknesses of cores/ILDs/Cu, carrier debond method, trench etch, glass type, placement accuracy, TV c electrical data. Fig. 6(c) dimension label illegible.
- Source problems: none.

## estc60143.2024.10712019 - Innovative System-in-Package Building Blocks for Future Space Applications (ESTC 2024)
- Status: distilled. process_flow_level: full (F1 full: vacuum press 195 C, 2.6 MPa, 10800 s, vacuum; F2 ordered; F3 generic_platform ordered).
- Rows: papers 1, tv 2, comp 6, layers 33, ic 7, flows 3, steps 16, ei 0, oi 0, metrics 25, figures 18.
- TVs: a = power SiP, GaN transistors (layer 5) and SOIC driver (layer 3) solder-embedded in a 6-layer R-1566S/R-1551S PCB, 27.0 x 27.6 x 3.92 mm; b = 6-N-6 R-G740M RCC / Megtron 6 build-up substrate, 45 x 45 x 1.4 mm, six daisy-chain dummy sites (2100 bumps, 200 um pitch).
- Figures opened: page_02-06.png; all 18 candidates (contact sheets); re-crops of Fig. 3, 4, 5, 9, 10, 14, Table I (p.3), Table II (p.5).
- Key figures:
  - f01 Fig. 5, cross_section, candidate p03_fig5
  - f02 Fig. 6, cross_section, candidate p03_fig6
  - f03 Fig. 2, stack_schematic, candidate p02_fig2
  - f04 Fig. 3, stack_schematic, candidate p02_fig3
  - f05 Fig. 1, process_flow, candidate p02_fig1
  - f06 Fig. 7, xray_csam, candidate p03_fig7
  - f07 Fig. 4, cross_section, candidate p03_fig4
  - f08 Fig. 8, micrograph, candidate p04_fig8
  - f09 Fig. 14, cross_section, manual (candidate p06_fig14 bbox wrong; images on p.5)
  - f10 Fig. 10, stack_schematic, manual (candidate cut bottom row)
  - f11 Fig. 15, cross_section, candidate p06_fig15
  - f12 Fig. 16, cross_section, candidate p06_fig16
  - f13 Fig. 12, top_view_layout, candidate p05_fig12
  - f14 Fig. 9, process_flow, candidate p04_fig9 (reprinted from ref [6])
  - f15 Fig. 11, other, candidate p04_fig11
  - f16 Fig. 13, other, candidate p05_fig13
  - f17 Table I, data_table, manual (p.3 part)
  - f18 Table II, data_table, manual (p.5 right-column part)
- Fig. 17 (planned test flow) was skipped: it is not executed and holds no extracted values.
- Judgment calls: the six via-stack configurations on one substrate form one TV (b), not six. Stack-ups were entered as drawn in Fig. 3 and Fig. 10. Fig. 10 draws an RG740 layer between L7/L8 and the etched core, while the text says 6 laminations; this is listed as a conflict. Package thickness: text 3.92 mm (design) is used. Fig. 3 gives 3.952 mm +/-10%; measured Fig. 5 cross-section totals (3674/3701 um) and layer thicknesses went to metrics. The driver is named 8-pin SOIC (text p.2) vs SO-16 (p.3, Fig. 5); conflict listed. Table II DSC 178 C is entered as printed; it conflicts with Tg 240 C in the text and may be copied from Table I. 260 N/cm2 -> 2.6 MPa. F2 per-layer RCC lamination/patterning was kept as one composite step (no finer order given); generic mSAP Fig. 9 became generic_platform flow F3.
- Not reported: transistor count, passive types, post-lamination steps of TV a, soldering profile, mSAP conditions, design microvia diameters, dummy die size/assembly, thermal-stress conditions. RF/electrical results and the Fig. 17 reliability flow are planned only.
- Source problems: none (clean text; comma decimals; tables split across columns/pages).

## Validator output
```
0 errors, 0 warnings (data/_staging/b096)
```

## Schema gaps
- No enum for SiC (material_class) or through-SiC via (ic_type); used ceramic and other.
- No component_type for discrete power transistors (GaN die) or packaged ICs (SOIC driver); used other.
- Metrics have no sigma/std column; standard deviations go in value_text or as separate rows.
- No column for plasma-etch conditions (chamber pressure in mTorr, RF power, gas flows); kept in conditions text.

## Audit findings and fixes (2026-10-20, ingest_audit_D)

| paper | row | severity | finding | outcome | change or reason |
|---|---|---|---|---|---|
| estc60143.2024.10712019 | estc60143.2024.10712019-f11 | figure | Candidate p06_fig15 cut bottom rows and both scale bars | fixed | bbox_source manual, bbox 0.0695,0.1413,0.4948,0.284, cand_id cleared, note added; re-crop shows 100 um and 20 um bars |
| estc60143.2024.10712019 | estc60143.2024.10712019-f13 | figure | Candidate p05_fig12 cut bottom floorplan border | fixed | bbox_source manual, bbox 0.0911,0.2506,0.4696,0.43, cand_id cleared, note added; re-crop shows full outline |
| estc60143.2024.10712019 | estc60143.2024.10712019-f09 | figure | Manual bbox y1=0.91 clipped panel labels | fixed | bbox 0.52,0.535,0.935,0.918; both configuration labels now complete |
| estc60143.2024.10712019 | estc60143.2024.10712019-b-m1 | minor | Peel strength statistic 'mean' not supported by Table II | fixed | statistic single; Table II gives '0,51 N/mm' without 'Average' (a-m1 stays mean) |

Ranks unchanged, so no fig_id renumbering. Revisions logged in evidence/estc60143.2024.10712019.yaml.

Validator: `0 errors, 0 warnings (data/_staging/b096)`

## Coordinator figure fix (2026-10-20): clipped candidate bboxes

A pixel scan of every candidate-bbox figure row found content continuing below the bbox bottom (figure_candidates.py clips raster images, typically by about 0.012 of page height). Each bbox below was extended to the first blank gap under the image (checked on contact sheets; captions excluded) and set to bbox_source manual, cand_id empty.

| fig_id | page | old bbox | new bbox |
|---|---|---|---|
| eptc67330.2025.11392276-f03 | 2 | 0.5084,0.1606,0.9629,0.3213 | 0.5084,0.1606,0.9629,0.333 |
| eptc67330.2025.11392276-f04 | 2 | 0.0834,0.6225,0.4775,0.715 | 0.0834,0.6225,0.4775,0.7269 |
| ectc51846.2026.00202-f01 | 4 | 0.0871,0.4038,0.4882,0.5961 | 0.0871,0.4038,0.4882,0.6073 |
| estc60143.2024.10712019-f14 | 4 | 0.5767,0.1322,0.8623,0.268 | 0.5767,0.1322,0.8623,0.2724 |
