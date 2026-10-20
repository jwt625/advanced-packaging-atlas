# Batch b043 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b043` -> `0 errors, 0 warnings (data/_staging/b043)`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| eptc59621.2023.10457652 | distilled | 1 | 4 | 4 | 0 | 5 | 0 | 0 | 26 | 6 | yes |
| ectc51846.2026.00051 | distilled | 4 | 10 | 8 | 6 | 5 | 3 | 0 | 10 | 6 | yes |
| ectc51846.2026.00176 | distilled | 1 | 14 | 11 | 5 | 38 | 0 | 2 | 25 | 6 | yes |

## eptc59621.2023.10457652 (STMicroelectronics, 700x700 mm PLP die shift)
- Source: garbled text layer; text.md is OCR. All numbers checked against `page_01..04_220dpi.png`. Noted "OCR text" in papers.notes.
- Figures opened: all four 220 dpi page renders; re-crops of Fig. 1, 2, 4, 8, 9, 10 (p.1-3). No candidates exist (candidates.json empty).
- Key figures (all manual): f01 Fig. 2 stack_schematic; f02 Fig. 1 top_view_layout; f03 Fig. 8 mechanical_plot; f04 Fig. 9 mechanical_plot; f05 Fig. 4 simulation_result; f06 Fig. 10 simulation_result.
- TVs: one panel_level TV (simulated and measured die shift on the same build; basis per row). package_class fan_out_panel is inferred (dies on tape/carrier, compression molded; paper says "PLP of WLCSP"), noted.
- All die shifts are normalized to the undisclosed specification M um; unit column says "x M". Per-step values from text (approx), step-1 maxima from Fig. 4 legend, fit slopes from Fig. 8/9 labels, parametric endpoints from Fig. 10 markers (approx), mold pressure from the p.4 multiphysics figures.
- has_process_flow = yes: die bonding on carrier -> heat to molding temp -> compression molding -> panel release/cool; ball drop named as downstream. No temperatures disclosed.
- Conflicts: tested Y slope 0.055 (Fig. 9 label) vs text ~0.056; text figure numbers off by one (Figure 6/7/8 vs captions Fig. 5/6/7); captions cited.
- Not reported: M, die/carrier/tape/MC materials and properties, molding temperature, sample counts.

## ectc51846.2026.00051 (Intel, EMIB-T scaling)
- Figures opened: page_02-05 renders; 300 dpi re-crops of Fig. 3 and Fig. 4 (no scale bars or labels); 250 dpi re-crops of Fig. 5, 6, 9; candidates p02_fig1, p02_fig2, p03_fig5, p04_fig6, p04_fig7, p05_fig9, p05_fig10.
- Key figures: f01 Fig. 4 cross_section (manual); f02 Fig. 1 cross_section (candidate p02_fig1); f03 Fig. 9 stack_schematic (manual); f04 Fig. 3 micrograph (manual, panels p.2, caption p.3); f05 Fig. 6 package_photo (manual); f06 Fig. 5 other / overlay plot (manual).
- TVs: a = 36 um FLI TV (2x reticle, passed package-level reliability); b = EMIB25T TV (3x18 mm bridge, two 1x reticle dies, 25 um FLI; assembly/reliability future work); c = 240x240 mm quarter-panel substrate (sub_assembly); d = simulation_model for the HBM4e 12 Gb/s channel, MIM PDN and the Fig. 2/7 bandwidth projections.
- Judgment calls: has_process_flow = yes on thin evidence (Sec. II.A.ii names discrete steps for TV b: panel-level TCB bridge attach into cavity, via formation/metallization, panel patterning, FLI bump plating; Fig. 4 adds top die assembly); order as listed, not stated as a sequence. ~50 um bridge thickness is a generic EMIB statement (Sec. I), applied with approx qualifier and noted. Panel 510x515 mm is the platform panel size. FLI for TV a entered with pitch_min/max 36/110 um (mixed regions) and level unspecified. Projected BW densities (Fig. 2) read off log axes, cross-checked against Fig. 7 IO/mm x Gbps. PDN 82% improvement basis unspecified (sim vs measured not stated).
- Excluded: UCIe-A 64 Gb/s and 20 Tb/s/mm (attributed to ref [5]); FOVEROS-S pitches (ref [2]); 72 mm2 bridge size statement (ambiguous roadmap).
- primary_bucket kept si_bridge; buckets add panel (panel-level process and form factor).
- Not reported: bump CDs/heights, TSV and via dimensions, TCB conditions, substrate stack, reliability conditions.

## ectc51846.2026.00176 (Lightmatter / PHIX / Amkor, Passage M1000)
- Figures opened: page_01-04 renders; 400 dpi re-crops of Fig. 2, 5, 7, 9; 800 dpi zooms of Fig. 7 labels; 250 dpi Fig. 10; candidates p01_fig1, p02_fig2, p02_fig5, p03_fig7, p03_table2.
- Key figures: f01 Fig. 7 cross_section (manual); f02 Fig. 1 stack_schematic (candidate p01_fig1); f03 Fig. 2 process_flow (manual); f04 Table 2 data_table (candidate p03_table2); f05 Fig. 5 warpage_plot (manual); f06 Fig. 10 thermal_plot (manual).
- TVs: one package TV (M1000). The 3D module before substrate attach is recorded as metrics.variant (warpage post module dicing), not a separate TV.
- has_process_flow = yes: 38 steps from Fig. 2 plus Sec. II/III text (carrier wafers, TSV reveal, passivation/CMP/2X RDL, C4 SnAg, CoW mass reflow 250 C, wafer UF 160 C 2 h, mold, grind, dicing 50 um kerf, module reflow with magnetic boat, unit UF with solder dam, O2/Ar plasma, TIM/lid snap cure 150 C 15 kg 300 s, LSC reflow 250 C, FAU active alignment Ficontec AL1200, epoxy and low-RI silicone cures, final IL and 80 C bake).
- Conflicts: TTV 11.8 (table) vs 11.75 (text); warpage text "~56 um at 250 C" vs Fig. 5 "58.9 um at 260 C" (figure entered); coupling loss sign 0.43 vs -0.43 dB; FAU epoxy dispense order (Fig. 2) vs text; optical adhesive cure (Fig. 2 UV + thermal vs text UV + 24 h at 25 C).
- Judgment calls: primary_bucket kept si_interposer per batch file although the paper is equally a CPO/photonic-interposer paper (buckets cpo;si_interposer); package_class photonic_interposer. No electrical_interfaces row (SerDes protocol/energy not given); BER and eye entered as metrics (value_text). Worst-case 1.48 dB entered as second optical_interfaces row (basis derived, mean + 3 sigma). Fig. 7(a) die/PIC thickness labels illegible at available resolution: not entered.
- Not reported: die/PIC sizes and thicknesses, substrate x/y and layers, bump pitches, module reflow temperature, UF cure conditions, TC conditions/results, MFD, wavelength in nm.

## Key-figure notes
- 18 figures: 3 candidate as-is (00051 Fig. 1; 00176 Fig. 1, Table 2), 15 manual.
- eptc59621: no candidates at all (OCR paper).
- 00051: p03_fig3 / p03_fig4 candidates empty (bbox at page top, no graphics); p03_fig5, p04_fig6, p04_fig7, p05_fig9, p05_fig10 clip axis labels or bottom edges by ~0.01 page height.
- 00176: p02_fig2, p02_fig5, p03_fig7 clip the bottom row/panels; p04_fig10 bbox is a page corner.
