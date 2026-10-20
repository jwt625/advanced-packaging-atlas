# Batch b036 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b036` -> 0 errors, 0 warnings.

## ectc51687.2025.00026 - Package Warpage Reduction for Large CoWoS-R Packages (TSMC)
- Status: distilled; has_process_flow yes. Bucket organic_rdl_fanout (as batch).
- Rows: papers 1, test_vehicles 6, components 17, stack_layers 5, interconnects 3, process_steps 11, metrics 25, figures 6.
- Figures opened: page_02-05.png; cand p02_fig4, p04_fig11, p04_fig12, p05_fig13, p05_fig14; manual re-crops p03 (Fig. 6a), p02 (Fig. 4), p05 (Fig. 14).
- Key figures: f01 Fig. 6(a) stack_schematic manual; f02 Fig. 11 stack_schematic candidate; f03 Fig. 4 top_view_layout manual;
  f04 Fig. 12 data_table candidate; f05 Fig. 13 warpage_plot candidate; f06 Fig. 14 simulation_result manual.
- Judgment calls: TVs split by substrate size (95x97.3 vs 110x110), CoW (5.5x vs corner window) and CIP structure
  (compensation layer + ring); CIP on 95x97.3 exists only in the Fig. 14 model -> simulation_model TV f. Warpage is only
  disclosed as A/B-normalized mil -> entered as ratios with reference_tv_id. Interposer x/y = stated CoW size 66x68 mm.
  MR6x pass assigned to TV a and c (text says 5.5x and corner window; DOE leg not stated). Fig. 13 stage reductions put on TV d.
- Not reported: absolute warpage, die sizes/thickness, bump diameters/heights/metallurgy, substrate stack, ring/compensation
  layer material, UF products, sample counts.
- Source: clean text layer. Text inconsistencies (1.5x vs ~1.8x CoW; 1.4x vs 1.3x substrate) in evidence conflicts.

## ectc51909.2023.00094 - Warpage Modulation Study on Panel-level Compression Molding (Intel)
- Status: distilled; has_process_flow yes. Bucket panel (as batch).
- Rows: papers 1, test_vehicles 2, components 6, stack_layers 6, interconnects 0, process_steps 8, metrics 11, figures 6.
- Figures opened: page_02-04.png; cand p02_fig2, p02_fig3, p03_tablei, p03_fig5, p03_fig6, p03_fig7, p04_fig8; manual re-crop p04 (Fig. 8).
- Key figures: f01 Fig. 2 process_flow candidate; f02 Table I data_table candidate; f03 Fig. 7 warpage_plot candidate;
  f04 Fig. 6 warpage_plot candidate; f05 Fig. 8 warpage_plot manual; f06 Fig. 3 warpage_plot candidate.
- Judgment calls: two TVs (mold-on-carrier coupon; top-die + overmold panel). Anonymous mold/carrier/die-thickness splits
  (Table I conditions 1-4) kept as metrics.variant because no material identity or dimension is disclosed.
  package_class fan_out_panel inferred (noted). Fig. 8(b) means read +/-2%.
- Not reported: any absolute warpage, warpage spec, mold names/properties, carrier material/thickness, die sizes/thickness,
  molding conditions; no bridge dies in the TVs (bridge encapsulation emulated by mold-only).

## ectc51687.2025.00048 - Embedded Multi Si Bridge Package in Panel Level Process (Samsung, I-Cube E)
- Status: distilled; has_process_flow yes. Bucket si_bridge (as batch).
- Rows: papers 1, test_vehicles 1, components 7, stack_layers 6, interconnects 5, process_steps 10, metrics 17, figures 6.
- Figures opened: page_02-05.png; cand p02_fig2, p02_fig2_2, p02_fig2_3, p03_fig3_4, p04_fig3_8, p05_fig4_2; manual re-crops p02 (Fig. 2.2, also 400 dpi), p04 (Fig. 3.5).
- Key figures: f01 Fig. 4.2 cross_section candidate; f02 Fig. 2.1 stack_schematic candidate; f03 Fig. 2.3 process_flow candidate;
  f04 Fig. 2.2 top_view_layout manual; f05 Fig. 3.5 data_table manual; f06 Fig. 3.2.2 simulation_result candidate.
- Judgment calls: interposer_x/y = 95x105 per Fig. 2.2 'Interposer Size' label although 'Unit Size 51.00x67.72' fits 4.3x
  reticle better (conflict logged). Cu post entered as tmv (inferred, noted). Bonding accuracy / thickness deviation only as
  relative improvement %. TC/uHAST preconditioning from Fig. 3.5 grouping.
- Not reported: die/bridge counts and sizes (except 12 HBM), RDL L/S and layer count, all bump/post pitches, panel size,
  material products, process conditions, absolute warpage.

## Schema gaps
- No field for normalized/relative values (warpage as "x A mil", "% of spec"); used unit strings plus reference_tv_id.
- No interconnect_level for bridge-to-RDL Cu bump in a molded embedded-bridge interposer (used level other, ic_type other).
- Alignment/placement accuracy has no metric_category (used geometry).
