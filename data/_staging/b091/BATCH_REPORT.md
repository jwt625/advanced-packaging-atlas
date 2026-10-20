# BATCH_REPORT b091 (2026-10-20)

Papers: tcpmt.2021.3111345, ectc51846.2026.00073, ectc51909.2023.00316. All full text, 8 pages each, no TEXT_LAYER_WARNING.
Validator: `uv run python scripts/validate_db.py --staging data/_staging/b091` -> `0 errors, 0 warnings (data/_staging/b091)`.
author_affiliations.csv, organizations.csv, org_sites.csv left header-only (separate pipeline).

## tcpmt.2021.3111345 (Cu-In-Sn W2W SLID bonding at 170-250 C) - distilled
- process_flow_level: full (typed current density, bath temp, force, time, ramp, preheat temp, vacuum). has_process_flow yes.
- Rows: tv 3, comp 6, layers 32, ic 15, flows 3, steps 27, ei 0, oi 0, metrics 24, figures 13.
- TVs: a symmetric Cu/Sn/In both wafers (EVG #2 200 C, EVG #3 170 C, Aalto #2 200 C x2); b asymmetric bottom Cu/Sn, top Cu/In (EVG #1, 250 C); c asymmetric bottom Cu/In, top Cu/Sn (EVG #4, 200 C). All wafer_level, 100 mm.
- Flows: F1 wafer prep + Cu/Sn/In ECD (12 steps, all TVs; per-TV wafer assignment of Sn/In in split); F2 bonding with route EVG (8 steps, all TVs; Fig. 2 split into contact/heat/force/cool; C-SAM as inline_inspection) and route Aalto (6 delta steps, tv a: 75 C preheat under vacuum, 20 C/min to 200 C, 1 h, 4.3 kN); F3 dicing (Disco DAD3220).
- Figures opened: page_02-07 renders; candidates p02_fig1, p03_fig2, p03_fig3, p03_fig4, p04_fig5, p04_fig6, p04_fig7, p05_fig8, p05_fig9, p06_fig10, p06_fig12, p07_fig13; manual crop Table I (p.2).
- Key figures: f01 Fig. 8 cross_section (cand), f02 Fig. 9 cross_section (cand), f03 Fig. 2 process_flow (cand), f04 Fig. 1 top_view_layout (cand), f05 Fig. 4 other/SAM schematic (cand), f06 Fig. 5 xray_csam (cand), f07 Fig. 6 xray_csam (cand), f08 Fig. 3 micrograph (cand), f09 Fig. 7 micrograph (cand), f10 Fig. 13 micrograph (cand), f11 Table I data_table (manual 0.095,0.448,0.475,0.68), f12 Fig. 12 mechanical_plot (cand), f13 Fig. 10 simulation_result (cand). Fig. 11 (isothermal section) skipped: no extracted values.
- Judgment calls: TV split by layer stack (Table I), bonding temperature as split variable (rule f); top wafer mapped to "Si cap" of Fig. 8 (inferred, noted); one interconnect row per bump size (10/25/50/100/250 um square, pitch not stated); 17 MPa / 4.3 kN / 1 h applied to EVG too (text: same force and time); resist strip and field etch placed after ECD (inferred_order, Sec. III); Fig. 12 maxima read approx (EVG3 ~45.7, Aalto ~57.5, EVG1 ~47.6 MPa); conflict with text "highest 40-50 MPa" logged (plot chosen); remelt ~600 C entered as derived (phase-diagram reasoning).
- Not reported: bump pitch/count, wafer thickness, EVG chamber atmosphere/ramp, alignment accuracy value, bonding yield numbers, electrical/optical interfaces.
- Source problems: none.

## ectc51846.2026.00073 (ASRA Si-bridge 2.5D automotive reliability TV) - distilled
- process_flow_level: fragments (BOM items + stiffener attach; no sequence, no conditions). has_process_flow no.
- Rows: tv 6, comp 59, layers 60, ic 30, flows 1, steps 6, ei 0, oi 0, metrics 53, figures 22.
- TVs: a DOE1 baseline (Cu, L, t, UF-A), b DOE2 (t-0.5 mm), c DOE3 (L+2 mm), d DOE4 (SUS), e DOE5 (UF-B lower CTE), f DOE1 without stiffener (warpage/simulation reference). Separate TVs per stiffener/UF build, following merged precedent (ectc51529.2024.00155 stiffener widths as TVs).
- Flow F1 fragments (tv_ids a-f): stiffener attach (delta a-e, DOE split), EMC, wafer UF (UF-A/UF-B split), C4 UF, ENEPIG, SAC305 ball attach; generic_description.
- Metrics: MSL3 + TCT-B readouts 250/500/700/1000 per DOE (Table VI, failures/tested, readout level), failure modes (Fig. 12, 13, 15), warpage change RT-reflow 2nd cycle (Fig. 16, 300 dpi re-render: 78/81/83/68/109 um), Fig. 10 cycle 1/2 hysteresis and RT/HT warpage (approx), Fig. 17 with/without stiffener 223 um (30 C) / 184 um (245 C), simulation correlation (qualitative).
- Figures opened: page_02-08 renders; all 18 candidates (contact sheets); 300 dpi re-renders of Fig. 10, Fig. 16, Table V legend; manual crops Fig. 12, Tables I, II, III, V, VI.
- Key figures: f01 Fig. 15 cross_section (cand), f02 Fig. 12 cross_section (manual 0.515,0.52,0.9,0.695; candidate merged with Table VI), f03 Fig. 1 stack_schematic (cand), f04 Fig. 2 package_photo (cand), f05-f10 Figs. 3-8 top_view_layout (cand), f11 Fig. 13 xray_csam (cand), f12 Table V warpage_plot (manual), f13 Table I, f14 Table II, f15 Table III, f16 Table VI data_table (manual), f17 Fig. 16, f18 Fig. 10, f19 Fig. 9, f20 Fig. 17, f21 Fig. 14 warpage_plot (cand), f22 Fig. 18 simulation_result (cand). Skipped: Table IV (duplicated by Table VI), Fig. 11 (range breakdown, not extracted).
- Judgment calls: n_dies 7 = 4 top + 3 bridges; accelerator die typed asic (emulator); bridge pillar matrix as die_to_bridge "other" (material/pitch not stated); TCT result pass iff 0 failures at that readout; warpage sign as plotted with Table V "-" legend; text "about 80 um" kept as own row next to Fig. 16 value (conflict logged); "about 200 um" vs Fig. 17 labels logged.
- Not reported: stiffener L and t values, die/interposer sizes, RDL L/S, u-bump diameter/height/count, assembly process conditions, UF CTE/modulus, electrical/optical interfaces.
- Source problems: none (institutional stamp line only).

## ectc51909.2023.00316 (TiN TSV interposer for superconducting quantum 3D integration) - distilled
- process_flow_level: ordered (Fig. 3 flow with materials/thicknesses/tools, no typed conditions). has_process_flow yes.
- Rows: tv 1, comp 1, layers 8, ic 1, flows 2, steps 21, ei 0, oi 0, metrics 11, figures 8.
- TV a: 4-inch 300 um Si wafer, 30 um TSV / 60 um pitch / AR >= 10, CVD/thermal SiO2, ALD TiN (>200 nm sidewall), 120 nm Al, double-sided Al/TiN wiring; daisy chains and GSG lines.
- Flows: F1 TSV interposer flow (16 steps, Fig. 3(a)-(l) with (b)/(c) and (e) split, UV-tape steps); F2 generic_platform proposed chiplet architecture assembly (5 steps, performed no, Fig. 1).
- Metrics: SEM diameter 29.6 um, thickness 300.9 um, slope ~89.84 deg, AR >10, TiN >200 nm, EDS layering, RT resistance 66.1 +- 6.9 ohm (n 10), cryo 7.3 ohm, ~89% drop 20 K->0.2 K, daisy chain linearity 6-48 TSVs, S21 3-9 GHz qualitative.
- Figures opened: page_04-06 renders; all 8 candidates (contact sheets).
- Key figures: f01 Fig. 4 cross_section, f02 Fig. 3 process_flow, f03 Fig. 2 top_view_layout, f04 Fig. 1 stack_schematic (proposal, paper-level), f05 Fig. 5 micrograph, f06 Fig. 8 process_flow (reprinted [22], paper-level), f07 Fig. 6 electrical_plot, f08 Fig. 7 electrical_plot; all candidate.
- Judgment calls: flip-chip In TCB TV of Sec. IV-C is prior work [22]: no TV, numbers excluded, Fig. 8 kept as reprinted; carrier size "4-inch" not converted to mm; TSV depth = wafer thickness (derived); GSG line as stack_layers feature row (S 190 um, gap 105 um; G 600 um in properties); no electrical_interfaces (test CPW, no protocol/loss value at frequency).
- Not reported: process temperatures/times/recipes, surface TiN thickness, chip size, numeric S21 at a frequency, Tc.
- Source problems: none.

## Schema gaps
- interconnect_level has no wafer-to-wafer non-hybrid (SLID/solder W2W) value; used "other" with notes.
- carrier_format has no 100 mm wafer; used "other" with carrier_size_mm 100 (4-inch left blank).
- No pad size min/max columns on interconnects; one row per discrete bump size.
- Stiffener DOE with undisclosed relative dimensions (L, t, t-0.5 mm, L+2 mm) has no numeric home; kept in names/notes/split.
