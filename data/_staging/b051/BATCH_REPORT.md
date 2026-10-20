# Batch b051 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b051` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51529.2024.00021 | distilled | 2 | 2 | 7 | 1 | 12 | 0 | 0 | 14 | 6 | yes |
| vlsitechnologyandcir46783.2024.10631478 | distilled | 1 | 7 | 7 | 4 | 12 | 0 | 0 | 29 | 6 | yes |
| icept59018.2023.10492317 | distilled | 2 | 8 | 8 | 0 | 4 | 0 | 0 | 21 | 6 | yes |

## ectc51529.2024.00021 (Samsung, D2W HCB for 16H HBM)
- Figures opened: page_02-04 renders; 300 dpi re-crops of Fig. 5 and Fig. 12; candidates p02_fig1, p02_fig3, p03_fig5a, p03_fig6, p04_fig10; manual re-crop of Fig. 12.
- Key figures: f01 Fig. 1 cross_section (candidate p02_fig1); f02 Fig. 3 process_flow (candidate p02_fig3); f03 Fig. 5 other (candidate p03_fig5a, covers (a)+(b)); f04 Fig. 12 electrical_plot (manual); f05 Fig. 6 simulation_result (candidate p03_fig6); f06 Fig. 10 simulation_result (candidate p04_fig10).
- TVs: a = 16H HBM HCB die stack; b = simulation_model for Cu pad expansion / BEOL deformation (Fig. 6, 10).
- Judgment calls: Fig. 5(b) AFM pad recess read as ~14 nm (CLN X, DIW) and ~20 nm (high and low CO2); text says low CO2 gives no change, logged as conflict (legend arrows suggest a cumulative sequence). WSS and thinning taken from the abstract list and placed before the "thin debonding" step of Sec. II.A. Fig. 1(a) TCB is a comparison, not a TV.
- Not reported: pad pitch/size, dielectric type/thickness, die size/thickness, anneal temperature/time, plasma gas, absolute dishing and yield values, reliability.

## vlsitechnologyandcir46783.2024.10631478 (Intel, Foveros Si-interposer with HDMIM)
- Figures opened: page_01-02 renders; p.2 grid; 300 dpi re-crops of Fig. 3-7 and Table 1; 6 manual re-crops; candidates p02_table1, p02_fig3 (both wrong content).
- Key figures (all manual): f01 Fig. 5 cross_section; f02 Fig. 1 stack_schematic; f03 Fig. 2 process_flow; f04 Fig. 4 stack_schematic; f05 Fig. 3 micrograph; f06 Table 1 data_table.
- TV: one package (CPU, GPU, SOC on passive TSV Si-interposer with HDMIM, package substrate). CPU-die HDMIM kept as a component, not a TV.
- Judgment calls: primary_bucket kept as microbump_3d (batch file); package_class si_interposer_2p5d. SIB 36 um pitch / 18 um diameter, PSB 110 um / 70 um (minimum pitches, noted); PSB typed c4 (inferred). TSV 9 x 75 um from SEM labels (measured). CPU-die HDMIM 376, 219, 157 fF/um2 excluded (cited to [2]); 5.4 uF kept from Fig. 7(a). Fig. 2 caption "M1-2 1080um, M3 2000um pitch" not entered (implausible units). GPU -300.4 mV entered as simulated despite "measured" wording (conflict logged). Table 2 noise values basis unspecified.
- Source: p.1 text layer font-encoded plus an OCR copy with errors; all numbers verified on renders (no TEXT_LAYER_WARNING file present).
- Not reported: die/interposer/package sizes, metal L/S and thickness, high-k material, bonding method, TC cycle count, sample counts, any D2D electrical interface property.

## icept59018.2023.10492317 (STMicroelectronics, die shift in PLP)
- Figures opened: page_01-03 renders; 300 dpi re-crops of Fig. 8-10; candidates p01_fig1, p01_fig2, p02_fig3, p03_fig6, p03_fig9, p03_fig10 (all offset); 6 manual re-crops.
- Key figures (all manual): f01 Fig. 2 stack_schematic; f02 Fig. 1 top_view_layout; f03 Fig. 3 other (FE model); f04 Fig. 9 mechanical_plot; f05 Fig. 6 simulation_result; f06 Fig. 10 mechanical_plot.
- TVs: a = ~700x700 mm panel of 1.5x2.7 mm WLCSP (panel_level, fan_out_panel inferred); b = ABAQUS/Moldex3D quarter-Qpanel models.
- Judgment calls: all die shift values normalized to the undisclosed spec M (unit "M" / "M per die"). Step 1 maxima from the Fig. 5 legend (3.37/3.43) over rounded text 3.4 (conflict logged). Tested slopes 0.032/0.055 and simulated 0.0315/0.0562 from printed fit equations. Pre-shift entered as planned design_target. Die count per panel 500000 with qualifier gt.
- Source quality: p.1 footer says 2022 23rd ICEPT (template remnant); p.4 has leftover template text. The triage hint about an ST FOPLP line is not in the paper.
- Not reported: value of M, materials (tape, carrier, MC), molding conditions, die size/thickness, interconnects, sample counts, warpage.

## Schema gaps
- No unit-free/normalized value convention: normalized die shift (multiples of undisclosed M) stored with unit "M".
- No capacitance column in components (HDMIM uF kept in name and metrics).
- No line/metal pitch column in stack_layers (only line/space).
