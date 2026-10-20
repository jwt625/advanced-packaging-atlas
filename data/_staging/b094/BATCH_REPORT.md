# Batch b094 report (2026-10-20)

Papers: ectc51909.2023.00021, ectc51846.2026.00356, estc60143.2024.10712091. All distilled. Validator: `0 errors, 0 warnings (data/_staging/b094)`.

## ectc51909.2023.00021 - High Frequency Characteristics of Fine Copper Lines on High Rigidity Dielectrics (ECTC 2023)
- Status: distilled. process_flow_level: full (UV irradiation 1260 mJ/cm2 typed in dose_mj_cm2).
- Rows: papers 1, test_vehicles 3, components 3, stack_layers 32, interconnects 9, process_flows 1, process_steps 26, electrical_interfaces 0, optical_interfaces 0, metrics 23, figures 17.
- TVs: a strip-line coupon on prepreg A (shiny-side press); b on prepreg B (shiny vs matt foil-side press = split); c reference on insulation film (desmear SAP).
- Flow: F1 (a;b;c, full, 26 steps): subtractive GND, prepreg press with VLP foil, foil etch, UV, electroless Cu, DFR, plating, strip, seed etch, Pd removal (Fig. 3), pad-layer press, foil half-etch 2-3 um, blackening, CO2 laser via, desmear, SAP pad layer with via fill, SR, electroless Ni/Au. Deltas: foil press/etch/UV/half-etch/blackening a;b; desmear of film c (inferred_order).
- Figures opened: page_01..06.png; cand p02_fig1, p02_fig2, p02_fig3, p02_tablei, p03_fig4, p03_fig5, p03_fig7, p04_fig9, p04_fig11, p04_fig12, p05_fig13, p05_fig14, p05_fig15, p05_tableii, p06_fig16, p06_fig17; manual re-crop of Fig. 10.
- Key figures: f01 Fig. 16 cross_section (candidate); f02 Fig. 17 cross_section (candidate); f03 Fig. 1 stack_schematic (candidate); f04 Fig. 3 process_flow (candidate); f05 Fig. 4 process_flow (candidate); f06 Fig. 2 stack_schematic (candidate); f07 Fig. 5 top_view_layout (candidate); f08 Fig. 10 package_photo (manual, no candidate); f09 Fig. 14 package_photo (candidate); f10 Fig. 13 micrograph (candidate); f11 Fig. 12 micrograph (candidate); f12 Fig. 11 micrograph (candidate); f13 Fig. 15 electrical_plot (candidate); f14 Table II data_table (candidate); f15 Table I data_table (candidate); f16 Fig. 7 simulation_result (candidate); f17 Fig. 9 simulation_result (candidate).
- Judgment calls: foil-side press is a split on TV b, not a TV. Final single-ended widths 19/26 um entered as design_target; 50-ohm widths 17/24 (single) and 18/22 um (differential) as simulated; 12 um line thickness only as simulated override. Insertion loss kept negative as printed (dB/mm); Table II over Fig. 15 for prepreg A (-0.34 vs about -0.32, conflict logged); text "about 0.1 dB" differential improvement not entered (Table II shows 0.01-0.02 dB/mm). Fig. 12 via depth 30 um entered as measured for a and b (prepreg not stated). Insulation-film TV assumed not UV-treated (paper contrasts "UV-assisted SAP + prepreg" with "desmear + insulation film"). Inline OM/SEM inspection "for each process" = one inferred_order row. Pd removal from Fig. 3 only (source schematic).
- Not reported: substrate size, core and film product names, press conditions, plating chemistry/current density, laser parameters, SR material, Ni/Au thicknesses, measured line dimensions, GND-via size, final differential spacing, film Dk/Df.
- Source problems: section/conclusion headings garbled in text.md (font encoding); Fig. 8/Fig. 9 captions appear swapped vs content and Fig. 8 duplicates the single-ended impedance plot; Fig. 17 caption repeats "(b)".

## ectc51846.2026.00356 - Die-Shift of Sub-20 um Thickness Embedded Chiplet in Glass-Core Package Redistribution Layers (ECTC 2026)
- Status: distilled. process_flow_level: full (ABF cure 180 C/1 h, tack 90 C/60 s, bake 110 C/1 h N2, vacuum lamination).
- Rows: papers 1, test_vehicles 1, components 3, stack_layers 10, interconnects 0, process_flows 3, process_steps 23, electrical_interfaces 0, optical_interfaces 0, metrics 62, figures 10.
- TV: a 100x100 mm, 500 um glass substrate with ABF GL102 both sides, Ti/Cu fiducials, nine ~19 um DBG Si chiplets attached with APTMS and encapsulated with 30 um ABF (panel_level, glass_embedded_die).
- Flows: F1 chiplet fiducial lift-off + DBG (ordered, build_seq 1, parallel); F2 substrate ABF lamination/cure + fiducial lift-off (full, build_seq 1, parallel); F3 O2 plasma, APTMS, pick-and-place tack, N2 bake, ABF encapsulation, cure, with three inline coordinate measurements (full, build_seq 2).
- Figures opened: page_02, 03, 04, 06.png; cand p02_fig1, p02_fig2, p03_fig3, p03_fig4, p03_fig5, p04_fig6, p05_fig7, p06_tablei, p06_tableii, p06_fig8.
- Key figures: f01 Fig. 1 stack_schematic; f02 Fig. 5 package_photo; f03 Fig. 4 package_photo; f04 Fig. 2 package_photo; f05 Fig. 3 micrograph; f06 Fig. 7 top_view_layout; f07 Fig. 6 micrograph; f08 Table I data_table; f09 Fig. 8 other; f10 Table II data_table (all candidate).
- Judgment calls: all 54 Table I/II values entered per die/stage (variant "die N"). Chiplet thickness 19 um (profilometer) over text "approximately 20 um" (conflict logged); four profile thicknesses and two street widths entered. Die-site pitch about 30 mm read from Fig. 8 axes (approx). Post-attach baseline measurement placed after N2 bake (inferred_order). Chiplet 5 mm size from Fig. 1 concept not entered for the TV. No interconnects (RDL metallization omitted by design). Encapsulation ABF grade not restated (GL102 only stated for base layers).
- Not reported: chiplet x/y, wafer diameter, glass type/CTE, plasma/APTMS/bonder parameters, lamination conditions, measurement uncertainty, warpage, reliability.
- Source problems: equations (1)-(17) partly garbled in text.md; renders fine.

## estc60143.2024.10712091 - Improving the Wafer Thinning Flow Robustness for 2.5D & 3D Applications (ESTC 2024)
- Status: distilled. process_flow_level: ordered (no typed condition stated; soft bake, EBR solvent, 50 um target only).
- Rows: papers 1, test_vehicles 1, components 2, stack_layers 8, interconnects 0, process_flows 3, process_steps 17, electrical_interfaces 0, optical_interfaces 0, metrics 37, figures 13.
- TV: a temporary-bonded device wafer (BrewerBOND T1107 LRL, C1301-50 TBM) on glass/Si carrier, ground to 50 um; DOE wafers D05-D13 are splits (edge-trim width, offset-Y).
- Flows: F1 edge trim + inspection (shared) then routes POR (LRL on device, TBM on carrier, soft bake, mesitylene EBR, bond) and alternative (LRL + TBM on device, no EBR, bond); F2 post-bond inspection, grinding to 50 um, clean, Si CMP, polar edge inspection (build_seq 2); F3 1 um SiO2, TiN/Cu seed, 1.6 um Cu plating on D05, D06, D10-D13 (build_seq 3).
- Figures opened: page_01..06.png; cand p01_fig1, p01_fig2, p02_fig3, p02_fig4, p02_fig5, p03_fig6, p03_tablei, p04_fig8, p04_fig9, p05_fig10, p06_tableii, p06_fig11, p06_fig12; manual re-crops of Fig. 2 and Fig. 5.
- Key figures: f01 Fig. 3 cross_section (candidate); f02 Fig. 1 micrograph (candidate); f03 Fig. 2 process_flow (manual: candidate merged author block, cut labels); f04 Fig. 9 stack_schematic (candidate); f05 Fig. 5 stack_schematic (manual: candidate included equations); f06 Fig. 4 package_photo (candidate); f07 Fig. 10 micrograph (candidate); f08 Fig. 11 micrograph (candidate); f09 Table II data_table; f10 Table I data_table; f11 Fig. 8 other; f12 Fig. 6 simulation_result; f13 Fig. 12 electrical_plot (all candidate).
- Judgment calls: alternative TBM-on-device flow modeled as a route on the same TV (same stack), metrics carry its two wafers. carrier_format wafer_300mm inferred from about 150 mm radii in Fig. 10 (override derived; size not stated). Table II edge-trim widths over Fig. 8 box medians (D07 614 vs about 537, D08 592 vs about 535, D13 1284 vs about 1258; conflicts logged). Model outputs (50 % / <0.1 % yield loss) simulated; delta sigma 130 um and EBR N(500, 65) um as author_estimate. Rs about 10.0 mOhm/sq median read off Fig. 12 (approx). Edge trimming categorized as dicing (blade trim; no edge-trim category). Fig. 7 (SEMI M1-0114 generic definition) not a key figure.
- Not reported: wafer diameter in text, initial wafer thickness, coating/bake/bonding conditions, grinding/CMP conditions, deposition methods, debonding.
- Source problems: Greek symbols and equations (3)-(9) dropped in text.md; read from renders. "restricted" footer on every page.

## Validator output
`uv run python scripts/validate_db.py --staging data/_staging/b094` -> `0 errors, 0 warnings (data/_staging/b094)`

## Schema gaps
- No step_category for wafer edge trimming (used dicing) or for spin-coating of temporary bonding / release layers (used deposition_other).
- No figure_kind for metrology/geometry plots (die-shift quiver map, edge-trim box plot); used other.
- metrics has no min/max or sign-convention column for per-length insertion loss printed as negative dB; kept as printed with scope note.
- No column for UV wavelength or lamp distance on process_steps (kept in conditions).
