# BATCH_REPORT b082 (2026-10-20)

Papers: 001c.129733, 001c.129764, ectc51846.2026.00274. Schema v2.5. All three distilled.

## 001c.129733 - Reconstructed W2W bonding (Samsung, IMAPS 2024)
- Status: distilled. process_flow_level: ordered (has_process_flow yes). No numeric process conditions in the paper.
- Rows: papers 1, test_vehicles 2, components 6, stack_layers 13, interconnects 7, process_flows 2, process_steps 20, electrical_interfaces 0, optical_interfaces 0, metrics 15, figures 8.
- TVs: a = reconstructed W2W bonded wafer pair, 2 um pitch (wafer_level); b = Fig. 1 example 3D system package (tv_kind other, concept only).
- Flows: F1 reconstructed W2W flow (tv_build, a, build_seq 1, 15 steps); F2 typical D2W flow (comparison, a, build_seq 2, 5 steps).
- Figures opened: page_02, page_04, page_05; candidates p02_fig1, p02_fig2, p03_fig3, p04_fig4, p04_fig5, p04_fig6, p05_fig7, p05_fig8; 8 manual re-crops in scratch.
- Key figures: f01 Fig. 7 cross_section (candidate p05_fig7); f02 Fig. 8 cross_section (manual); f03 Fig. 2 process_flow (manual); f04 Fig. 1 stack_schematic (manual); f05 Fig. 4 micrograph (manual); f06 Fig. 6 other (manual); f07 Fig. 5 other (manual); f08 Fig. 3 other (manual).
- Judgment calls: Sec. II.B D2W surface-prep steps applied to F1 (text: same as D2W up to D2W bonding); D2W anneal kept only in F2; W2W anneal F1-s13 inferred_order from Sec. III.B; carrier removal F1-s14 generic_description (Fig. 7 demo still shows carrier); post-carrier options F1-s15 performed no; Fig. 3 margin bars read approx (derived, design analysis); daisy-chain TEGs attached to TV a.
- Not reported: anneal/CMP/plasma conditions, wafer diameter, die size/count/thickness, pad diameter, D2W interface pitch, W2W condition parameters, daisy-chain resistance, electrical yield.
- Source problems: none.

## 001c.129764 - 9 um pitch micro-bump, FLOLA (Samsung, IMAPS 2024)
- Status: distilled. process_flow_level: full (cure 175 C / 2 h typed).
- Rows: papers 1, test_vehicles 2, components 6, stack_layers 16, interconnects 2, process_flows 1, process_steps 11, electrical_interfaces 0, optical_interfaces 0, metrics 16, figures 9.
- TVs: a = Leg1 Ni-SnAg; b = Leg2 M-SnAg with 1 um diffusion barrier (both 9.5 x 9.5 mm chips FLOLA-bonded on 12-inch Si wafer, wafer_level).
- Flow: F1 bumping + assembly (Fig. 2), tv_ids a;b; electroplating as deltas F1-s03 (a) / F1-s04 (b); underfill A/B/C as split on F1-s10.
- Figures opened: page_02 to page_05; candidates p02_tablei, p03_tableii, p03_fig2, p03_fig3, p03_fig4, p04_fig5, p04_fig6, p04_tableiii, p05_fig7; 6 manual re-crops.
- Key figures: f01 Fig. 6 cross_section (manual); f02 Fig. 4 cross_section (manual); f03 Fig. 2 process_flow (manual); f04 Table I data_table (candidate p02_tablei); f05 Fig. 1 micrograph (manual, image on p.2; candidate p03_fig1 bbox wrong); f06 Fig. 5 cross_section (manual); f07 Table II xray_csam (candidate p03_tableii); f08 Fig. 3 cross_section (candidate p03_fig3); f09 Fig. 7 other (manual).
- Judgment calls: two TVs by bump metallurgy; underfill void and joint-formation results entered once on TV a with scope "applies to TVs a, b" (leg not stated); wafer-side bump layers from PFIB/EDS (thickness empty); bonding_method tcb (paper: flux-less thermal-compression bonding with laser heat); 12-inch mapped to wafer_300mm; CD 5 um entered as bump diameter; 4 kA seed converted to 0.4 um (logged).
- Not reported: FLOLA temperature/force/time/laser power, plasma conditions, chip/wafer thickness, bump count, gap, underfill product names, M and barrier identity, HTS n per condition, unit of Table II void area.
- Source problems: none (Fig. 1 image and caption on different pages).

## ectc51846.2026.00274 - BLR of 3.3X CoWoS-R on OAM (TSMC, ECTC 2026)
- Status: distilled. process_flow_level: ordered (module assembly order from Fig. 3; no typed conditions).
- Rows: papers 1, test_vehicles 2, components 12, stack_layers 9, interconnects 1, process_flows 1, process_steps 4, electrical_interfaces 0, optical_interfaces 0, metrics 36, figures 18.
- TVs: a = 3.3X CoWoS-R daisy-chain MTV on OAM board (package); b = quarter FEA model (simulation_model).
- Flow: F1 OAM assembly (edge bond dispense, stiffener, cold plate, baseboard), tv_ids a; edge bond with/without as split; F1-s01 inferred_order.
- Figures opened: page_02 to page_06; 300 dpi re-renders of Figs. 2-3; candidates p02_fig1-4, p03_fig5, p03_fig6, p03_tableii, p03_tableiii, p04_fig8-11, p05_tableiv, p05_fig12, p06_tablev, p06_tablevi, p06_fig13; manual re-crops of Fig. 4, Fig. 14, Tables II, IV, VI.
- Key figures: f01 Fig. 2 stack_schematic (candidate p02_fig2); f02 Fig. 1 stack_schematic (candidate p02_fig1); f03 Fig. 3 process_flow (candidate p02_fig3); f04 Fig. 6 package_photo (candidate p03_fig6); f05 Fig. 8 micrograph (candidate p04_fig8); f06 Fig. 9 micrograph (candidate p04_fig9); f07 Fig. 5 stack_schematic (candidate p03_fig5); f08 Fig. 4 top_view_layout (manual); f09 Fig. 14 top_view_layout (manual, no candidate); f10 Fig. 12 simulation_result (candidate p05_fig12); f11 Fig. 13 simulation_result (candidate p06_fig13); f12 Fig. 11 simulation_result (candidate p04_fig11); f13 Table II data_table (manual); f14 Fig. 10 reliability_plot (candidate p04_fig10); f15 Table III data_table (candidate p03_tableiii); f16 Table V data_table (candidate p06_tablev); f17 Table VI data_table (manual); f18 Table IV data_table (manual).
- Judgment calls: edge bond with/without = split, not TV; ring material, edge bond pattern, PCB model = simulation splits on TV b; monitoring (load cell, film, strain gauges) as step conditions, strain result as metric; normalized delta W_ave unit "x" with reference in scope; text "max 20 C" deviation kept vs Table III 21 C (conflict logged); venue formatted like other ECTC 2026 rows.
- Not reported: package/interposer/substrate/board dimensions, die set, BGA pitch/ball/alloy/count, edge bond and stiffener materials (experiment), BGA attach and edge bond cure, cold plate force value, Table II dwell, n per split, Weibull beta/eta, PCB modulus/CTE values.
- Source problems: none.

## Validator
`uv run python scripts/validate_db.py --staging data/_staging/b082` -> `0 errors, 0 warnings (data/_staging/b082)`

## Schema gaps
- No structure enum for board/module-level elements (cold plate, OAM PCB, connector, baseboard); used `other`/`tim_lid`.
- No column for a metric's unit-less normalized ratio reference; used unit "x" plus scope text.
- Comparison flow (F2 of 001c.129733) needs a build_seq although it is not part of the TV build; set to 2.

## Audit findings and fixes (2026-10-20, ingest_audit_C)

| paper | row | severity | finding | outcome | change or reason |
|---|---|---|---|---|---|
| 001c.129764 | 001c.129764-f08 | figure | Fig. 3 candidate bbox starts in whitespace and cuts the bottom of the fillet image | fixed | Re-crop of page_03 confirmed: bbox -> 0.1557,0.698,0.4001,0.831, bbox_source manual, cand_id empty (supersedes "candidate p03_fig3" in the key-figure list above) |
| 001c.129764 | evidence conflicts (001c.129764-a-c2) | minor | Bottom wafer: "another 12-inch Si wafer" (p.2 Sec. I) vs "the same 12-inch wafer" (p.2 Sec. II.B); conflicts empty | fixed | Conflicts entries added for a-c2 and b-c2 (same component on both TVs); component names unchanged (already neutral); revisions logged |

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b082` -> `0 errors, 0 warnings (data/_staging/b082)`

## Coordinator figure fix (2026-10-20): clipped candidate bboxes

A pixel scan of every candidate-bbox figure row found content continuing below the bbox bottom (figure_candidates.py clips raster images, typically by about 0.012 of page height). Each bbox below was extended to the first blank gap under the image (checked on contact sheets; captions excluded) and set to bbox_source manual, cand_id empty.

| fig_id | page | old bbox | new bbox |
|---|---|---|---|
| 001c.129733-f01 | 5 | 0.0854,0.0859,0.4873,0.4224 | 0.0854,0.0859,0.4873,0.4358 |
