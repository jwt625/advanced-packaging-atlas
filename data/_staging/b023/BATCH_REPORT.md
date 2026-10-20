# Batch b023 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b023` -> `0 errors, 0 warnings (data/_staging/b023)`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51906.2022.00140 | distilled | 4 | 10 | 21 | 6 | 15 | 0 | 0 | 26 | 6 (4 manual) | yes |
| ectc51529.2024.00151 | distilled | 2 | 15 | 26 | 10 | 23 | 0 | 0 | 18 | 6 (0 manual) | yes |
| ectc51909.2023.00154 | distilled | 1 | 11 | 13 | 8 | 27 | 0 | 0 | 26 | 6 (2 manual) | yes |

## ectc51906.2022.00140 (Samsung TSP, chip-last FOPLP fine RDL)
- Figures opened: page_02-05 renders; 300 dpi re-crops of Fig. 10, Fig. 12(a), Fig. 12(b); candidates p02_fig3, p04_fig8, p04_fig9, p05_fig10, p05_fig12; manual crops of Fig. 2, Fig. 8, Fig. 12.
- Key figures: f01 Fig. 3 stack_schematic (candidate p02_fig3); f02 Fig. 2 process_flow (manual, no json candidate); f03 Fig. 10 stack_schematic (manual, candidate clipped bottom); f04 Fig. 9 stack_schematic (candidate p04_fig9); f05 Fig. 8 mechanical_plot (manual, candidate clipped x-axis title); f06 Fig. 12 micrograph (manual, candidate clipped bottom).
- TVs: a = 2.5D chip-last TV with as-is planar 11 um UBM; b = same with T-shape 8 um UBM (stack change: extra PID/stopper metal/release layer, so a separate TV); c = L/S 0.9-1.5 um resolution test patterns (NA split, Fig. 12); d = chip-first comparison units (Fig. 1 warpage only).
- Judgment calls: Cu pad space (20/40 um) and thickness (8/11 um) splits kept as metrics.variant on TV a. Fig. 11 labels the yield change 'Low NA' -> 'High NA' while text attributes it to T-shape + exposure; entered on TV b with both noted. Fig. 12(a) focus ranges read off the plot (+/-1 um); NA 0.12 at L/S 1.5 reads 21 vs text 20 (conflict logged). Fine-RDL flow (PID coat, cure, seed, PR 7 um, exposure, development, EP Cu, PR strip, seed etch, AVI) entered from Sec. 2.3 text; chip-last assembly steps from Sec. 2.1.
- Not reported: die/package/panel sizes, RDL layer count, PID/PR products, cure and exposure conditions, bump types/pitches, via sizes, sample counts, warpage sign convention.
- Source: abstract has garbled glyphs ('1 ASIC'); ASIC and AP used for the same die.

## ectc51529.2024.00151 (ASE FOCoS-Bridge TCB)
- Figures opened: page_02-06 renders; candidates p02_fig1, p03_fig2, p05_fig10, p05_fig13, p06_tableii, p06_fig16.
- Key figures: f01 Fig. 16 cross_section (candidate p06_fig16); f02 Fig. 1 process_flow (candidate p02_fig1); f03 Fig. 2 stack_schematic (candidate p03_fig2); f04 Fig. 10 top_view_layout (candidate p05_fig10); f05 Table II data_table (candidate p06_tableii); f06 Fig. 13 warpage_plot (candidate p05_fig13).
- TVs: a = TV-1 (non-BSM, 2 ASIC + 8 HBM, 8 bridges 6.2x6.4 mm, FO 31x47 mm, 70x78 mm FCBGA, 55 um ubump, 150 um C4, RDL L/S 10/10); b = TV-2 (BSM, 2 SoC-1 + 8 SoC-2, 10 bridges, FO 50x50 mm stitched, 76.5x80 mm substrate, RDL L/S 8/8).
- Judgment calls: package_class si_bridge_fanout. Fig. 1 flow (with BSM) entered for TV-2; TV-1 gets only the TCB CoS steps (its pre-CoS flow is not described separately). RDL layer counts conflict (TV-1 '1-layer RDL' vs '2P2M'; TV-2 '2-layer RDL' vs '3P3M'), so no layer count entered; both noted. Reticle multiple stated as >3X, almost 2x and >2x; not entered. Warpage only relative (TV-2 1.9x/1.5x of TV-1); entered as ratios with reference_tv_id. Sign convention from Fig. 3/13 insets (+ convex, - concave).
- Not reported: absolute warpage, TCB temperature/force/time (Fig. 9 has no numeric axes), BSM metals/thicknesses, die sizes, TV-2 bump pitches, substrate layer count, reliability sample counts, specific JEDEC standard numbers.
- primary_bucket kept si_bridge.

## ectc51909.2023.00154 (Samsung 3.5D extremely large Si interposer)
- Figures opened: page_02-06 renders; 400 dpi re-crops of Fig. 8 and Fig. 6; candidates p02_fig2, p02_fig3, p03_fig4, p04_fig8, p05_fig11; manual crops of Fig. 11 and Table 2.
- Key figures: f01 Fig. 11 cross_section (manual, candidate spans page quadrant); f02 Fig. 2 stack_schematic (candidate p02_fig2); f03 Fig. 4 process_flow (candidate p03_fig4); f04 Fig. 3 stack_schematic (candidate p02_fig3); f05 Fig 8 warpage_plot (candidate p04_fig8); f06 Table 2 data_table (manual, no candidate).
- TV: a = one package (3D-ASIC with 4 um pitch Cu-Cu hybrid bond, 2 ASIC 25x19 mm, 3 chiplets 8.4x6.0 mm, 12 HBM3 11x11 mm, 60 um chip gap, 110 um Si interposer 4x reticle, 14L 6-2-6 substrate, stiffener foot 10x3.5 mm). 3D-ASIC kept inside TV a as a die_stack structure, not a separate TV.
- Judgment calls: Fig. 8 data labels entered per temperature (CM -89/135/49/18/-7/-162 um; substrate 32/56/79/70/57/23 um) instead of text summary 'around 50 um' (conflict logged); effective gap 30/52/64 um entered as the paper's derived values. Joint gap mean 67 um (25 locations, 59-77 um). TC1000 27F/30 entered result partial: failures are T-zone UF cracks while electrical test passed. Bump counts from Table 1 ranges with qualifier ge. Process flow has two named flows: 3D-ASIC formation (Sec. II) and CoW assembly (Sec. III, Fig. 4).
- Not reported: interposer/package/substrate dimensions in mm, TSV and Cu pillar dimensions, hybrid bond method and conditions, materials/products, FEM stress values, warpage sign convention.
- Source: Fig. 11 caption repeats the Fig. 10 caption (noted in figures.notes); Fig. 4 caption says '2.5D assembly'.

## Key-figure notes
- 18 figures: 12 candidate as-is, 6 manual. Manual reasons: candidates clipping bottom edge/axis titles (00140 Fig. 8, 10, 12), candidate missing from candidates.json although cand/p02_fig2.png exists (00140 Fig. 2), candidate spanning a page quadrant from the page edge (00154 Fig. 11), no candidate (00154 Table 2).
