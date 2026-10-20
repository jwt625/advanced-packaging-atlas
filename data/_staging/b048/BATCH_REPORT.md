# Batch b048 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b048` -> `0 errors, 0 warnings (data/_staging/b048)`

## ectc51687.2025.00378 - Ultra-Thin Chiplet Embedding in Glass-Core Package RDL (Georgia Tech)
- Status: distilled; full_text, pages 1-6; has_process_flow = yes (10-step Fig. 1 flow + dice-before-grind chip prep).
- Rows: papers 1, test_vehicles 1, components 3, stack_layers 11, interconnects 2, process_steps 22, electrical 0, optical 0, metrics 24, figures 6.
- Figures opened: cand p02_tablei, p02_tableii, p03_fig1, p03_fig2, p03_fig3, p04_fig4, p04_fig5, p04_fig6, p04_fig7, p05_fig8, p05_fig9, p05_tableiii; 600 dpi re-renders of Fig. 5(a)/(b) in scratch.
- Key figures (all candidate): f01 Fig. 8 cross_section; f02 Fig. 1 process_flow; f03 Fig. 5 cross_section; f04 Fig. 2 micrograph; f05 Fig. 7 micrograph; f06 Table III data_table.
- Judgment calls: one TV (test_coupon, glass_embedded_die, 100x100 mm panel); four coupons are samples (metrics.variant). Microvias split into peripheral (100 um pitch, 516) and center (250 um pitch, 216) rows. Chip thickness 25 um from Fig. 8 over Table I "<30 um" (conflict logged). Table III resistances entered per coupon x chain group (12 rows, ranges in value_text). 75% yield denominator not stated; noted as consistent with 3/4 coupons fully connected. Fig. 5(b) labels 29 um and 12 um not attributable to a layer: excluded.
- Not reported: dielectric product, glass type, bonding material, cavity x/y, M1 L/S, lamination press values, cure temperatures, reliability/warpage.
- Source: clean text; typo "ptich".

## ectc51529.2024.00218 - WoWoW integration, 1 um pitch F2F/F2B Cu-Cu, 6 um pitch TSVs (Sony)
- Status: distilled; full_text, pages 1-5; has_process_flow = yes (Fig. 3 flow).
- Rows: papers 1, test_vehicles 1, components 3, stack_layers 9, interconnects 3, process_steps 12, electrical 0, optical 0, metrics 24, figures 6.
- Figures opened: page_03, page_04, page_05 renders; cand p02_fig2, p02_fig3, p03_fig5, p03_fig7, p03_fig8, p04_fig13; 400 dpi re-renders of Fig. 6, 7, 8, 10, 13.
- Key figures (all candidate): f01 Fig. 5 cross_section (STEM); f02 Fig. 2 stack_schematic; f03 Fig. 3 process_flow; f04 Fig. 7 electrical_plot; f05 Fig. 8 electrical_plot; f06 Fig. 13 reliability_plot.
- Judgment calls: one wafer_level TV (3 wafers as dummy_die components); the 2-wafer WoW stage is a comparison variant, not a TV. Interconnect resistance_mohm = daisy-chain median per link incl. wiring (approx, from plots). Post-bond anneal steps inferred only from "two bonding processes including post bonding anneal" (Sec. III.C), no conditions. TDDB lifetime entered as >10 years (author_estimate). Plot reads: F2F/F2B ~0.45 ohm/link; TSV chains ~92/104/120 mohm/link for 3.0/2.5/2.0 um; single TSV 23.7-10.2 mohm; resistivity shift at 3 um -3.8 to -8.5% for 1.8-3.3 um TSVs.
- Not reported: wafer diameter, wafer thicknesses (except 3 um middle Si), pad size, bond/anneal conditions, alignment, TSV depth/liner material.
- Source: clean text, minor typos.

## ectc51529.2024.00094 - Fine-pitch microbump metallurgy and FLOLA (Samsung)
- Status: distilled; full_text, pages 1-7 (p.7 references only); has_process_flow = yes (Fig. 1 flow).
- Rows: papers 1, test_vehicles 3, components 9, stack_layers 31, interconnects 3, process_steps 30, electrical 0, optical 0, metrics 23, figures 6.
- Figures opened: page_02 to page_06 renders; cand p02_tablei, p02_tableii, p02_fig1, p04_fig5, p04_fig6, p05_fig7; 450 dpi re-renders of Fig. 7(a,b) and Fig. 5.
- Key figures (all candidate): f01 Fig. 6 cross_section; f02 Fig. 1 process_flow; f03 Table II data_table; f04 Table I data_table; f05 Fig. 7 reliability_plot; f06 Fig. 5 micrograph.
- Judgment calls: three TVs, one per bump metallurgy leg (different layer stack): a Leg1 Ni-SnAg, b Leg2 M-SnAg, c Leg3 Cu-SnAg. Bumps on both chip and coupon (chips diced from bumped coupons), so the joint stack lists pillar/barrier/SnAg on both sides. Bump CD 7.5 um (Table I) over 7 um (text). Bonding 260 C/10 s/5 N is the initial bonding test; optimized values undisclosed. FLOLA classed as bonding_method tcb (laser-heated TC bonding). Paper-wide metrics (gap 9.92 um, 0/54 SAT voids, bond-head thermal expansion) attached to TV a with scope note. Bond-head expansion values basis unspecified (equipment data, origin not stated). IMC thickness read off Fig. 7 as ranges.
- Not reported: identity of metal M and barrier, underfill product, seed thickness, chips per coupon, electrical data, alignment accuracy.
- Source: text.md unit glyphs garbled (um/mm), verified against renders; Fig. 6 caption and Fig. 7 legend leg labels inconsistent with text (noted).

## Schema gaps
- No field for bump-count scope (per chip vs per coupon); kept in evidence.
- No place for equipment-level characterization (bond-head thermal expansion) other than metrics on a TV.
- Daisy-chain per-link resistance (incl. wiring) vs pure joint resistance is not distinguishable in interconnects.resistance_mohm; noted per row.
