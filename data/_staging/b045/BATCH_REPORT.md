# Batch b045 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b045` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51529.2024.00396 | distilled | 2 | 4 | 9 | 1 | 23 | 0 | 0 | 30 | 6 | yes |
| ectc51529.2024.00334 | distilled | 1 | 2 | 8 | 2 | 18 | 0 | 0 | 24 | 6 | yes |
| ectc51529.2024.00322 | distilled | 6 | 30 | 30 | 8 | 58 | 0 | 0 | 59 | 6 | yes |

## ectc51529.2024.00396 (A*STAR IME, glass-to-Si Cu/dielectric hybrid bonding)
- Figures opened: page_04 render; candidates p02_fig1, p03_fig2, p03_fig3, p04_fig4, p04_fig5, p04_fig6; 300 dpi re-crops of Fig. 1 (layer labels), Fig. 5, Fig. 6.
- Key figures: f01 Fig. 6 cross_section (manual); f02 Fig. 1 process_flow (candidate p02_fig1); f03 Fig. 4 other/AFM dishing (candidate p04_fig4); f04 Fig. 3 warpage_plot (candidate p03_fig3); f05 Fig. 5 xray_csam (manual); f06 Fig. 2 xray_csam (candidate p03_fig2).
- TVs: a = 300 mm W2W glass-Si Cu/SiO2 hybrid bonded pair (6 um pitch, 3 um pad, mask design); b = blanket glass-Si direct bond for the cleaning study (3 cleaning splits as metrics.variant).
- Judgment calls: bow values in Fig. 3 assigned to the glass wafer (Sec. III.B context; last bar = bonded pair); sign convention not stated. Fig. 4 per-location dishing read by pixel scan (+/-0.2 nm), box-plot statistic not stated. Roughness: body <0.2 nm entered over abstract <0.3 nm (conflict logged). Abstract 90% void-free entered alongside body "no voids except design voids" (logged). Opaque-layer removal placed after anneal per Fig. 1(h). Anneal + CMP step taken from Fig. 3 x-axis only. 3 um pad size stored in layers.via_diameter_um and interconnects.pad_x_um.
- Not reported: electrical data (no resistance/yield), thicknesses, glass type/CTE, barrier metal, plasma/bond parameters, blanket anneal conditions.
- Source: candidates p04_fig5/p04_fig6 include a line of body text (manual crops).

## ectc51529.2024.00334 (Applied Materials + EV Group, 300 nm pitch W2W HBI)
- Figures opened: page_02-05 renders; candidates p02_fig3, p03_fig5, p04_fig7, p04_fig9, p04_fig10a; re-crops of Fig. 2, 9, 10.
- Key figures: f01 Fig. 7 cross_section (candidate p04_fig7); f02 Fig. 3 process_flow (candidate p02_fig3); f03 Fig. 2 top_view_layout (manual); f04 Fig. 9 electrical_plot (manual); f05 Fig. 10 electrical_plot (manual); f06 Fig. 5 other/CMP topography (candidate p03_fig5).
- TVs: one 300 mm W2W bonded wafer pair; pitches 500/300 nm as two interconnect rows; Cu density, chain length and 450 C re-anneal as metrics.variant.
- Judgment calls: Rs/link from Fig. 10 slope labels (15.6/8.7/6.2 ohm) entered over text (14.8/7.9/6.1) per precedence; conflict logged. 300 nm short-chain label: table "3k" vs caption "5k" (logged). Bond tool model, bond temperature and baseline anneal time not given; EVG40 NT2 (text) vs EVG NT30 (caption) both kept. SiCN (Producer GT Insepra) named as module bond dielectric, per-wafer use not spelled out. interconnect count = longest tested chain.
- Not reported: pad/via diameter and height, dielectric thicknesses, bond conditions, Rs at 300 nm, bond strength.
- Source: candidate p02_fig2 bbox points at the page header; p04_fig9 cuts the yield row; p04_fig10a has a text sliver (manual crops).

## ectc51529.2024.00322 (Resonac / JOINT2, CUF+EMC vs LCMUF at 20/15 um bump pitch)
- Figures opened: page_01-06 renders; candidates p02_fig2, p02_tablei, p03_fig3, p03_fig4, p04_fig7, p06_fig11; 300 dpi re-crops of Fig. 10, 11; 500 dpi zooms of Fig. 11; manual crops of Fig. 3, 4.
- Key figures: f01 Fig. 7 cross_section (candidate p04_fig7); f02 Fig. 3 top_view_layout (manual); f03 Fig. 2 package_photo (candidate p02_fig2); f04 Fig. 4 process_flow (manual); f05 Table I data_table (candidate p02_tablei); f06 Fig. 11 warpage_plot (candidate p06_fig11).
- TVs: a/b/c = CoW fill TVs (15x20 mm large + 4x 5x10 mm small dies on 30x30 mm Si interposer, 12-inch wafer) with CUF+solid EMC-A, LCMUF-A, LCMUF-B (different encapsulant stacks, as in b020 legs); 20 and 15 um pitch kept as interconnect rows (LCMUF-B only 20 um). d/e/f = Structure-A/B/C DAF warpage wafers (die volume ratio 33/49/61%) with EMC-B.
- Judgment calls: Fig. 11 actual and FEM values read per step (42 values, +/-30 um; overlapping markers noted per row); sign convention taken from Fig. 10 inset (+ cry, - smile) and assumed for Fig. 11. Fig. 10 bars read (-1210/-1090/-640/-510 um) over text "around" values (logged). Table V molding conditions applied only to the fill TVs. Process flow for d/e/f written per TV from Fig. 4/Sec. II.B; seed etch category etch_other (wet/dry not stated). Glass carrier CTE 3.7 ppm/C from Fig. 12 schematic. Microbump height_um = die Cu+Ni (5 um), cap = SnAg 5 um; total_length_um = designed ~12 um gap.
- primary_bucket kept microbump_3d (buckets add si_interposer).
- Not reported: microbump bonding method (ref [3]), material products/suppliers, warpage measurement temperature, backside bump dimensions, mold conditions for d/e/f.
- Source: candidates p03_fig3 and p03_fig4 cut the figure bottoms (manual crops).

## Schema gaps
- No figure_kind for metrology plots like AFM dishing boxes or CMP topography profiles (used `other`).
- No column for bond-layer Cu pattern density (%) on interconnects (kept in variants/notes).
- Interconnects has no pad-size vs diameter distinction for square/undefined "pad size" (3 um stored as pad_x_um).
