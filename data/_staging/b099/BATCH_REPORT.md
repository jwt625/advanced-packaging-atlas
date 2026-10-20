# Batch b099 report (2026-10-20)

Papers: ectc51846.2026.00034, icep-iaac64884.2025.11002988, tcpmt.2026.3672227. All three distilled. Validator: `0 errors, 0 warnings (data/_staging/b099)`.

## ectc51846.2026.00034 - Laser Assisted Bonding of InP Power Amplifier Chiplets on a 300 mm RF Si Interposer (ECTC 2026)
- Status: distilled. process_flow_level: full (F1 s03 typed 325 C / 1.5 s laser recipe).
- Rows: papers 1, test_vehicles 2, components 3, stack_layers 7, interconnects 1, process_flows 1, process_steps 4, electrical_interfaces 0, optical_interfaces 0, metrics 29, figures 9.
- TVs: a = 2 x 1.4 mm InP D-band PA chiplets LAB-bonded on the imec 300 mm RF Si interposer (wafer_level; 43-device DOE); b = Si blanket wafer laser-heating coupon (thermocouple, two sensors ~500 um apart).
- Flows: F1 LAB bonding procedure (a, full): align with markers, contact + light constant force (10-50 g DOE in split), underside pyrometer-controlled laser 325 C / 1.5 s with 0.5 s ramps, release/cool. TV b in not_reported (heating measurement only).
- Figures opened: page_02..06.png; cand p02_fig1, p02_fig2, p03_fig3, p03_fig4, p03_fig5, p04_fig6, p05_fig7, p06_fig8; manual crop of Table 1 (page 3).
- Key figures: f01 Fig. 2 stack_schematic (candidate); f02 Fig. 1 micrograph (candidate); f03 Fig. 6 warpage_plot (candidate); f04 Table 1 data_table (manual, no candidate); f05 Fig. 4 other (candidate); f06 Fig. 5 other (candidate); f07 Fig. 3 thermal_plot (candidate, TV b); f08 Fig. 7 electrical_plot (candidate); f09 Fig. 8 electrical_plot (candidate).
- Judgment calls: text swaps Fig. 1/Fig. 2 relative to captions; caption labels cited (conflict logged). FC1-FC4/NOFC structures are variants, not TVs. RF S11/S21 of passive transitions kept in metrics (no protocol/PHY, so no electrical_interfaces row). Interconnect alignment_um 0.6 (lt) = abstract average misalignment, override measured. "Three thick RDLs (of ~30 um)" entered as 30 um approx, repeat 3, ambiguity noted. Sensor 1 end-of-hold temperature from text (~190 C) over eye reading of plot (~196 C), conflict logged. Process window <350 C / <3 s as author_estimate. Bond force not typed into force_n (sweep, grams kept in split).
- Not reported: interposer fabrication flow, RDL L/S, polymer name, bump height/count, UBM, chiplet thickness, bonder/laser model, wavelength, atmosphere, DOE matrix values, yield, reliability.
- Source problems: none (6 pages; institutional stamp only).

## icep-iaac64884.2025.11002988 - Lithography for less than 8 um pitch (ICEP-IAAC 2025)
- Status: distilled. process_flow_level: full (PEB 60 C / 60 s, development 27 C, 30 min rest).
- Rows: papers 1, test_vehicles 1, components 1, stack_layers 4, interconnects 0, process_flows 1, process_steps 7, electrical_interfaces 0, optical_interfaces 0, metrics 32, figures 6.
- TV: a = 15 um DFR resist-line coupon on glass with 400 nm plating seed; 8 um pitch (mask L/S 3.0/5.0 um) and 6 um pitch (2.5/3.5 um) features as separate stack rows.
- Flows: F1 DFR patterning (a, full): seeded glass, DFR lamination, projection exposure (lens NA and dose 80-140 mJ/cm2 sweep in split), PEB, rest, Na2CO3 development, DI rinse.
- Figures opened: page_01..02.png; cand p02_fig1, p02_fig2, p02_table1..4; manual re-crop of Fig. 2.
- Key figures: f01 Fig. 1 other (candidate); f02 Fig. 2 other (manual, candidate merged with Table 2 note text); f03 Table 1, f04 Table 3, f05 Table 2, f06 Table 4 data_table (candidate).
- Judgment calls: Table 1 high-NA 120 mJ/cm2 margin prints 27.5 um, Table 2 header and all five ratios in that column use 17.5; entered 17.5, conflict logged. Lens/dose sweep in split, dose_mj_cm2 left empty (no single dose). "-" table cells entered as "no window" value_text rows. Ratios 1.69 and 3.00 entered as derived (paper's own). package_class other (glass is an evaluation carrier only).
- Not reported: NA values, tool model, wavelength, seed material, DFR product, lamination conditions, numeric CD band, plating/strip/etch (SAP not completed).
- Source problems: none (2-page extended abstract). Abstract says wiring formed; only resist lines were patterned.

## tcpmt.2026.3672227 - Process-Induced Warpage and Assembly Risks in Ultra-Large Multi-Chip FCBGA (IEEE TCPMT, accepted 2026)
- Status: distilled. process_flow_level: full (reflow peak 245 C, underfill cure 165 C, adhesive cure 125 C).
- Rows: papers 1, test_vehicles 2, components 6, stack_layers 9, interconnects 2, process_flows 1, process_steps 22, electrical_interfaces 0, optical_interfaces 0, metrics 80, figures 19.
- TVs: a = 102 x 102 x 4.46 mm four-die FCBGA (4 x 26x29x0.775 mm Si dies, C2 Cu pillar 130 um pitch, 18-layer 1.964 mm substrate with 1.24 mm low-CTE core, Cu ring 8 x 2.5 mm, 10392 BGA at 1.0 mm); b = bare 18-layer substrate (shadow moire, SOP geometry).
- Flows: F1 (a, full) with routes FCF (11 steps) and RAF (11 steps), incl. X-ray/SAT inline_inspection steps from Sec. II.D; MCJ variants in FCF s01 split. TV b in not_reported (characterization only).
- Figures opened: page_02..08.png; embedded img_p04_4, img_p05_1, img_p05_2, img_p06_1, img_p06_3, img_p06_4, img_p06_5, img_p07_2, img_p07_3, img_p08_1; all 19 candidates; enlarged crops of Fig. 8(e)(f) for label reading.
- Key figures (all candidate): f01 Fig. 9 cross_section; f02 Fig. 12 cross_section; f03 Fig. 10 xray_csam; f04 Fig. 1 stack_schematic; f05 Fig. 2 process_flow; f06 Fig. 5 stack_schematic; f07 Fig. 7 other (MCJ schematic); f08 Fig. 8 warpage_plot; f09 Fig. 6 other (TV b); f10 Fig. 14 xray_csam; f11 Fig. 15, f12 Fig. 16, f13 Fig. 17 reliability_plot; f14 Fig. 13, f15 Fig. 11 warpage_plot; f16 Fig. 4 warpage_plot (TV b); f17 Fig. 3 other; f18 Table I, f19 Table II data_table.
- Judgment calls: FCF vs RAF and MCJ on/off are routes/splits of one TV (same stack), not separate TVs. Fig. 8(f) labels (23.8 um at 150, 22.5 at 200 um spacer) chosen over text (22.5 at 150 um), conflict logged; Fig. 8(e) Type 3 23.5 kept on its own row. RAF stage warpage from Fig. 13 (-282/257/244/233 um) over text "~250 um" and "below 200 um", conflicts logged; text is also inconsistent on smile/cry shape after ring attach. Warpage entered with sign as plotted (no convention defined). C2 "size 70x90 um" as pad_x/pad_y; solder cap SnAg inferred from IMC text (noted). RAF reflow/underfill temperatures from Fig. 3. uHAST result pass for electrical with separate delamination row (result na). Final MCJ setting assumed optimized Type 3 / 200 um (noted in evidence). Table II "HTST" recorded as HTSL per text.
- Not reported: die function, underfill/adhesive products, SOP alloy, C2 count, BGA alloy and reflow, process times/ramps/atmosphere, MCJ force, reliability sample counts.
- Source problems: accepted author version (template header line "REPLACE THIS LINE..."; final pagination may differ). Fig. 10 caption labels the SEM panel (e), image/text (d).

## Validator output
`uv run python scripts/validate_db.py --staging data/_staging/b099` -> `0 errors, 0 warnings (data/_staging/b099)`

## Schema gaps
- No figure_kind for alignment/misalignment scatter, lithography Bossung curves or process-temperature sequence plots; used other.
- process_steps has no column for a lens NA / optical setting or a focus sweep; kept in split.
- Bond force stated in grams as a DOE range has no range column (force_n is single-valued); kept in split.
- No defined warpage sign convention field; recorded "sign as plotted" in scope.
- metrics lacks min/max columns; S21 ranges and ratio ranges stored as value_text with statistic range.

## Coordinator figure fix (2026-10-20): clipped candidate bboxes

A pixel scan of every candidate-bbox figure row found content continuing below the bbox bottom (figure_candidates.py clips raster images, typically by about 0.012 of page height). Each bbox below was extended to the first blank gap under the image (checked on contact sheets; captions excluded) and set to bbox_source manual, cand_id empty.

| fig_id | page | old bbox | new bbox |
|---|---|---|---|
| tcpmt.2026.3672227-f08 | 4 | 0.5079,0.4977,0.9272,0.849 | 0.5079,0.4977,0.9272,0.8501 |
