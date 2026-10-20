# BATCH_REPORT b089 (2026-10-20)

Papers: itherm55376.2025.11235616, ectc51906.2022.00323, iedm50572.2025.11353855. All distilled.
Validator: `uv run python scripts/validate_db.py --staging data/_staging/b089` -> `0 errors, 0 warnings (data/_staging/b089)`.
author_affiliations / organizations / org_sites left header-only (separate pipeline).

## itherm55376.2025.11235616 - Moisture analysis, embedded Si bridge substrates (ITherm 2025)
- Status: distilled. process_flow_level: full (F2 ABF sample cure has typed temp/time); has_process_flow yes.
- Rows: tv 3, comp 4, layers 13, ic 1, flows 2, steps 14, ei 0, oi 0, metrics 47, figures 15.
- TVs: a = 8-metal-layer embedded Si bridge substrate (sub_assembly, F1 ordered); b = ABF GX92 film sample 6x6x0.078 mm
  (test_coupon, F2 full: 100 C/30 min, 180 C/30 min, 200 C/1 h cure); c = 2D COMSOL model (simulation_model).
- Figures opened: page_02-07.png; cand p02_fig1, p02_fig2, p02_fig3, p03_fig5, p04_tablei-iv, p05_fig8, p05_fig9,
  p06_fig10, p06_fig11, p07_fig12; manual re-crops of Fig. 1, 5, 7 (and 6/7 pair), 8, 9, 10, 11, 12, Table VI-VIII.
- Key figures: f01 Fig. 3 cross_section (candidate); f02 Fig. 10 cross_section (manual); f03 Fig. 1 stack_schematic
  (manual); f04 Fig. 2 top_view_layout (candidate); f05 Fig. 11 micrograph TOF-SIMS (manual); f06 Fig. 12 micrograph
  (manual); f07 Fig. 5 stack_schematic (manual); f08 Fig. 8 stack_schematic (manual); f09 Fig. 9 simulation_result
  (manual); f10 Table VI-VIII simulation_result (manual); f11 Fig. 7 other (uptake plot, manual); f12-f15 Table I-IV
  data_table (candidate).
- Judgment calls: fitted parameters of Tables I-IV as basis derived; drying 100 C/24 h and N2 atmosphere treated as
  test preconditions (metrics.condition), not steps; D2O exposure/potting/sectioning are FA prep -> metrics; TV a as
  sub_assembly (substrate, no die assembly evidenced); Fig. 6 skipped (same data as Fig. 7); Fig. 4 instrument photo
  skipped (not the build); Tables VII/VIII printed as "TABLE I." - located as "Table VI-VIII".
- Not reported: substrate size, layer thicknesses, via dimensions, bridge size, ABF grade of the substrate, F1 process
  conditions, electrical/optical interfaces.
- Excluded: Table V simulation parameters (from ref [5]).
- Source problems: none (text layer clean; table labels VII/VIII misprinted in the paper; org name printed "Microeletronics").

## ectc51906.2022.00323 - Embedded-IC package using Si-interposer for mmWave (ECTC 2022)
- Status: distilled. process_flow_level: ordered (no typed conditions); has_process_flow yes.
- Rows: tv 5, comp 15, layers 20, ic 8, flows 2, steps 11, ei 2, oi 0, metrics 29, figures 11.
- TVs: a = 2-dummy-chip package, improved WPR-1201 process; b = multiplier module improved; c = multiplier module
  typical (ABF + laser vias); d = bare-die wire-bonded module; e = EM/circuit simulation models.
- Flows: F1 (tv a;b;c) shared die attach in lossy-Si cavity with conductive epoxy; deltas a;b = WPR-1201 coat/vacuum
  laminate, bake, expose/develop, seed, electroplate upper pad; delta c = ABF lamination, laser drilling. F2 (b;c;d,
  build_seq 2) PCB attach, Au wire bonding; delta d = die-to-die Au wire (inferred order).
- Figures opened: page_01-07.png; Fig. 2 300 dpi re-render; all 13 candidates (contact sheets).
- Key figures (all candidate): f01 Fig. 1 stack_schematic; f02 Fig. 2 stack_schematic; f03 Fig. 10 package_photo;
  f04 Fig. 9 package_photo; f05 Fig. 3 stack_schematic; f06 Fig. 4 stack_schematic; f07 Fig. 7 stack_schematic;
  f08 Fig. 5 simulation_result; f09 Fig. 6 simulation_result; f10 Fig. 11 electrical_plot; f11 Table I data_table.
- Judgment calls: package_class embedded_die_substrate (Si cavity package); CTC line as electrical_interface
  (protocol other, channel_type organic_rdl per rule (i), IL 0.2 dB derived = 1.24 - 2 x 0.52); bare-die gain metrics
  put on TV d with scope "bare die"; abstract "phase ~5%" and text "~8 deg" both entered; Fig. 8 and Table II skipped
  (Table II = prior work).
- Not reported: cavity etch, seed/plating metal, via sizes, WPR-1201 thickness on built TVs, bake/lamination
  conditions, outline dimensions, sample counts.
- Excluded: Table I dummy-chip 0.4 dB / pad-transition 0.52 dB (ref [14]); Table II refs; typical-process details in [12],[14].
- Source problems: none.

## iedm50572.2025.11353855 - Monolithic BEOL multi-layer MIM capacitor (IEDM 2025)
- Status: distilled. process_flow_level: ordered (gases/tools only); has_process_flow yes.
- Rows: tv 2, comp 2, layers 10, ic 2, flows 1, steps 13, ei 0, oi 0, metrics 17, figures 15.
- TVs: a = 8-layer 3DSMIM on 4-inch wafer (wafer_level); b = PDN droop model (simulation_model).
- Flow F1: 13 steps from Fig. 4 + Fig. 8(d) edge treatment (resist shrink O2, Cl2 TiN etch, O2 edge oxidation).
- Figures opened: page_01-04.png, grid renders p03/p04, manual crops of all chosen figures (candidates misplaced).
- Key figures (all manual): f01 Fig. 9 cross_section; f02 Fig. 11 cross_section (TEM/EDS); f03 Fig. 10 cross_section;
  f04 Fig. 4 process_flow; f05 Fig. 8 process_flow; f06 Fig. 7 stack_schematic; f07 Fig. 5 package_photo (wafer);
  f08 Fig. 6 micrograph; f09 Fig. 1 stack_schematic (paper-level); f10 Fig. 16 stack_schematic; f11 Fig. 12
  electrical_plot; f12 Fig. 14 electrical_plot; f13 Fig. 19 simulation_result; f14 Fig. 18 simulation_result;
  f15 Table 1 data_table.
- Judgment calls: BV 4.58 V (Fig. 14 label) over text 4.6 V; edge angle 119.8 deg (caption/text) vs image 60.2 deg;
  1/2/4-layer devices not separate TVs (no values stated); E-field simulations on TV a with basis simulated; O2/Cl2
  plasma gases kept in conditions (no typed condition) -> ordered; repeat-count of step s08 inferred.
- Not reported: process temperatures/powers/times, device area, via diameter, contact resistance values.
- Excluded: Table 1 prior-work columns, Fig. 19 droop values of refs [6]-[9], conventional MIM 1-2 nF/mm2.
- Source problems: none (text cites SEM as Fig. 10, caption says Fig. 9; caption used).

## Schema gaps
- No figure_kind for moisture-uptake / sorption plots (used "other").
- No step_category for solder mask application (used "other") or wire bonding (used "bonding").
- No structure enum for a standalone thin-film device stack on a wafer (MIM capacitor used "other").
- RF chip-to-chip transmission lines (non-protocol) fit electrical_interfaces only via protocol "other".

## Audit findings and fixes (2026-10-20, ingest_audit_C)

| paper | row | severity | finding | outcome | change or reason |
|---|---|---|---|---|---|
| ectc51906.2022.00323 | ectc51906.2022.00323-F1-s02 | minor | equipment held a process name ('vacuum laminating process'); atmosphere empty | fixed | equipment -> empty; atmosphere -> vacuum; conditions -> 'vacuum laminating process' (p.6 Sec. IV.A) |
| ectc51906.2022.00323 | ectc51906.2022.00323-F1-s07 | minor | typical ABF lamination delta omitted vacuum | fixed | atmosphere -> vacuum; locator already had p.6 Sec. IV.A; p.1 Sec. I (unchanged). Flow F1 notes and evidence not_reported updated to match; level stays ordered |

Final validator: `0 errors, 0 warnings (data/_staging/b089)`
