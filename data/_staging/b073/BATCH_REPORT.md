# Batch b073 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b073` -> `0 errors, 0 warnings (data/_staging/b073)`.
Crop check: `scripts/crop_figures.py --staging data/_staging/b073` rendered all 16 key-figure crops (scratch only).

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| eptc62800.2024.10909935 | distilled | 1 | 0 | 2 | 2 | 11 | 0 | 0 | 47 | 5 | yes |
| ectc51687.2025.00076 | distilled | 3 | 6 | 14 | 4 | 40 | 0 | 0 | 20 | 5 | yes |
| ectc51687.2025.00359 | distilled | 2 | 0 | 5 | 3 | 13 | 0 | 0 | 16 | 6 | yes |

## eptc62800.2024.10909935 (A*STAR IME, 1 um CD TSV patterning with i-line stepper)
- Figures opened: page_02-05 renders, p.4 grid; 300 dpi re-crops of Fig. 1-7, 10(a-c), 11; candidates p03_fig4, p03_fig5, p05_fig11.
- Key figures: f01 Fig. 11 cross_section (candidate p05_fig11); f02 Fig. 9 micrograph (manual, panels a-f; g-h on other column omitted); f03 Fig. 4 other (manual, candidate clipped legend); f04 Fig. 5 other (manual, candidate clipped axis labels); f05 Fig. 10 other (manual, panels a-b; c on p.5 omitted).
- TVs: one wafer_level TV (300 mm Si). Judgment call: SiO2 hard mask vs bare Si, resist type/thickness (ZR8800 3 um, PFI26A 1.4/2.3 um) and pitch (N, Nx5) are all treated as splits in metrics.variant, since the bar charts pool results across the other splits. package_class `other` (TSV patterning wafer, no interposer build).
- Metrics: 26 bar values (CD uniformity %, read +/-0.3 pt; Fig. 4 +/-1 pt), 6 Fig. 5 box-plot means, text relative claims, 15-wafer repeatability ranges, PEB-delay 50-80 nm. "CD uniformity %" is never defined.
- Interconnects: etched (unfilled) TSV holes, 1 um target CD, X-SEM depth 14.0 and 20.3 um. Absolute pitch not disclosed.
- Conflict: Conclusions claim PFI26A 2.3 um FICD CDU >88% across all splits; Fig. 4 shows ~76% (plot entered, text logged).
- Source issues: text cites "Fig. 15. b)" for Fig. 10(b); Fig. 9 caption repeats c), d) for g), h).
- Not reported: pitch, hard mask thickness/deposition, bake/PEB/develop conditions, dose, ICP recipe, liner/fill.

## ectc51687.2025.00076 (Penn State / Georgia Tech / ELSPES, Si DTC embedded in glass)
- Figures opened: page_02-07 renders; grids p.4, p.6, p.7; 400 dpi re-crop of Fig. 4(a) labels; candidate p07_tablei.
- Key figures: f01 Fig. 3 stack_schematic (manual, no candidate); f02 Fig. 4 stack_schematic (manual, no candidate); f03 Fig. 10 process_flow (manual, no candidate); f04 Table I data_table (candidate p07_tablei); f05 Fig. 7 electrical_plot (manual, no candidate).
- TVs: a = Design 1 (fabricated, 3 samples measured by VNA), b = Design 2 stacked-via/plate design (simulation_model, HFSS only), c = TGV-first glass VPD substrate concept (Fig. 10(a), fabrication status not stated; holds the abstract-level 300 uF / ESR / ESL targets).
- primary_bucket kept thermal_pdn; buckets thermal_pdn;glass.
- Judgment calls: via sizes given as radii -> diameter = 2 x radius (derived, logged). Design 1 via "50 um copper vias" (text) vs "50 um radius" (caption): caption chosen. Design 2 via-2 bottom radius ~73 um (Sec. III) vs 70.5 um (Sec. IV): both in notes. Fig. 4(a) swaps Source/GND labels vs text and Fig. 4(b): text chosen. Cavity size and nominal gap derived from "10 um larger" statement. DTC supplier ELSPES from refs [18]-[19] and co-author affiliation; glass AGC and ABF Ajinomoto from acknowledgment.
- Fig. 2 architecture (100x130 mm package, 1-2 kW, GaN modules) is from the authors' previous work [2]: excluded. DTC chip spec (2.8 uF, ESL <1 pH, ESR <5 mOhm) entered as design_target metrics from the Fig. 1 caption.
- Not reported: measured ESR/ESL after embedding, TGV pitch/depth/count, laser and plating parameters, glass type, reliability.

## ectc51687.2025.00359 (Gigaphoton / Ajinomoto Fine-Techno, KrF excimer ablation of ABF vias)
- Figures opened: page_02-05 renders; 600-1200 dpi re-crops of Fig. 5 labels; 300 dpi re-crops of Fig. 6, 7; candidates p02_fig2, p03_fig3, p03_fig5, p04_fig7, p04_fig11, p05_fig11_2.
- Key figures: f01 Fig. 5 cross_section (candidate p03_fig5); f02 Fig. 11 p.4 cross_section (candidate p04_fig11); f03 Fig. 2 process_flow (candidate p02_fig2); f04 Fig. 3 process_flow (manual, candidate cut the "With PET film" label); f05 Fig. 7 other (candidate p04_fig7); f06 Fig. 11 p.5 micrograph (candidate p05_fig11_2).
- TVs: a = 10 um nanofiller ABF on Cu/Si coupon (PET 38 um sacrificial film on/off as variant), b = dual damascene ablation demo (via 7 um, pad 15 um, trench 2/8 um L/S; desmear/seed/plating/CMP marked performed=no).
- Metrics: taper 83.3 -> 87.6 deg (text), Fig. 5 SEM-label top/bottom diameters (with-PET top labels low resolution, approx), Fig. 6/7 focus-offset readings, ~0.5 um/pulse, void-free Cu fill.
- Source issues: "Fig. 11" printed twice (p.4 and p.5); text calls the dual damascene figure Fig. 12.
- Not reported: via pitch, fluence/pulse count used, desmear recipe beyond gas type and 5 min, seed thicknesses, Cu thickness, wafer size.

## Key-figure notes
- 16 figures: 8 candidate, 8 manual. Paper 00076 had no candidates for Figs. 3, 4, 7, 10 (only Fig. 1, 2, 8, Table I detected). Paper 10909935 candidates for bar charts clipped legends/axis labels (Fig. 4, 5); Fig. 9 and 10 split across columns/pages.
- figure_kind has no generic data-plot value for process/geometry plots (CD uniformity, via diameter vs focus): used `other`.

## Schema gaps
- No figure_kind for process/geometry data plots (CDU bar charts, diameter vs focus offset); `other` used.
- No diameter min/max columns in interconnects (TGV radius range 60-80 um kept in notes).
- Via top vs bottom diameter and taper angle have no interconnect columns; entered as metrics.
- Capacitance (uF) and ESL/ESR of embedded passives have no component columns; entered as metrics.
