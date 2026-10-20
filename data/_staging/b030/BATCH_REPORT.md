# Batch b030 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b030` -> `0 errors, 0 warnings`.

Resume note: all three papers were distilled by a previous agent that stopped at a usage limit before writing this
report. On resume, each paper had a papers row, TV/child rows, an evidence YAML and 6 figures rows; no rows were
changed. Spot-check: all 18 crops rendered with `scripts/crop_figures.py --staging data/_staging/b030`; 2 per paper
opened and confirmed (eptc f01, f05; ectc51909 f03, f04; ectc51687 f04, f05). The per-paper summaries below are
taken from the existing rows and evidence files.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| eptc67330.2025.11392593 | distilled | 3 | 12 | 9 | 8 | 27 | 1 | 0 | 8 | 6 | yes |
| ectc51909.2023.00048 | distilled | 2 | 7 | 9 | 7 | 35 | 0 | 2 | 28 | 6 | yes |
| ectc51687.2025.00009 | distilled | 3 | 0 | 2 | 3 | 9 | 0 | 0 | 12 | 6 | yes |

## eptc67330.2025.11392593 (nepes embedded bridge die FOWLP interposer, NPU + HBM)
- Figures opened (per evidence): all nine candidates p02_fig1 .. p05_fig9; Fig. 9 re-cropped at 450 dpi.
- Key figures: f01 Fig. 5 cross_section (candidate p04_fig5); f02 Fig. 1 stack_schematic (candidate p02_fig1); f03 Fig. 2 process_flow (candidate p03_fig2); f04 Fig. 3 micrograph (candidate p03_fig3); f05 Fig. 7 package_photo (candidate p04_fig7); f06 Fig. 9 simulation_result (candidate p05_fig9).
- TVs: a = 49x49 mm interposer, 3 NPU + 6 HBM over embedded Si bridges, Cu posts, MUF, C4 to substrate; b = 600x600 mm panel route singulated to 300x300 mm panels (10 SoC dies each); c = coaxial Cu post (simulated only).
- Judgment calls: RDL repeat = 2 (Sec. II.B process text) over the single 7/7 um L/S statement in Sec. II.A (conflict logged). Coaxial post IL improvement entered as the authors' ~34% at 40 GHz; Fig. 9(a) curves would give ~50% if red = coaxial, but the legend does not identify the curves. Bridge count 6 and 2 unlabeled blocks read from Fig. 1(b).
- Not reported: die/bridge/interposer/mold thicknesses and sizes, exact Cu post height, microbump metallurgy, bonding conditions, MUF/DAF products, substrate size/layers, C4 pitch, warpage, reliability, yield, measured electrical data, FOWLP wafer size.
- Source: clean text layer. Fig. 5(b) image label reads "NPU" over "Bridge die" while the caption says HBM die (noted on f01).

## ectc51909.2023.00048 (AIM Photonics 300 mm Si photonics active interposer)
- Figures opened (per evidence): page_02-06 renders; 400 dpi re-crops of Fig. 2(d), 3, 5, 8; candidates p02_fig2, p03_fig3, p03_fig4, p05_fig6, p06_fig8.
- Key figures: f01 Fig. 3 stack_schematic (candidate p03_fig3); f02 Fig. 4 process_flow (candidate p03_fig4); f03 Fig. 2 stack_schematic (manual; candidate included a cut caption line); f04 Fig. 5 warpage_plot (manual; no candidate); f05 Fig. 8 optical_plot (candidate p06_fig8); f06 Fig. 6 optical_plot (candidate p05_fig6).
- TVs: a = 300 mm active interposer (PIC wafer oxide-bonded to TSV interposer wafer, ~100 um thick, 100 um TSVs, backside RDL); b = III-V DFB laser flip-chip bonded (Sn-Au) in interposer laser trench, edge-coupled.
- Judgment calls: coupling loss 1.6 dB (Fig. 8(a) and Sec. IV) over the 1.5 dB "approaching" statement in Sec. III.C. Process order follows Fig. 4 (wire bond before fiber attach); single singulation step after bumping and de-bond. Fig. 5 wafer-bow bars read by pixel scale (+/-10 um). Ridge alignment bound 0.4 um entered as stated; 0.38 um derived check from Fig. 8(c) gap labels.
- Excluded: Table I bond energies (adapted from ref [15]); prior work of refs [11], [13]; architecture background.
- Not reported: electrical_interfaces; die size, TSV diameter/pitch, RDL L/S and thickness, layer thicknesses; anneal and bonding conditions; Cu pillar/solder/BGA dimensions; laser wavelength; fiber-array coupling loss; wafer-bow sign convention; sample counts.
- Source: text.md has a shifted-glyph duplicate plus an OCR-like layer with digit errors ('11m' for um); all numbers checked on page renders. No TEXT_LAYER_WARNING.md present.

## ectc51687.2025.00009 (Intel multi-level bond vias for C2W hybrid bonding)
- Figures opened (per evidence): page_02-05 renders; 400 dpi re-crops of Fig. 9, 10, 12; candidates p03_fig6, p03_fig7, p04_fig10, p04_fig11, p05_fig12.
- Key figures: f01 Fig. 11 cross_section (candidate p04_fig11); f02 Fig. 6 stack_schematic (candidate p03_fig6, no tv_ids: generic architecture illustration); f03 Fig. 10 cross_section (candidate p04_fig10); f04 Fig. 9 cross_section (manual; no candidate); f05 Fig. 12 electrical_plot (candidate p05_fig12); f06 Fig. 7 simulation_result (candidate p03_fig7).
- TVs: a = MLV process wafer (~1x9 um Cu vias, 3 um pitch, 1200-link daisy chains), measured; b = parasitic capacitance model (regular stack via vs MLV 0.8 and 0.5 um2), simulated; c = 3D die stack PDN model (IR drop vs metal thickness), simulated.
- Judgment calls: title claims 1 um pitch; only 3 um pitch MLVs are demonstrated and entered. No bonded stack, so no hybrid-bond interconnect beyond the MLV. Median daisy-chain resistance ~295 ohm read from the Fig. 12 dashed line. AR ~10 from Fig. 9(a) caption chosen over "8:1" in Sec. IV; capacitance reduction 24% (Fig. 7(d), Sec. II) over "up to 25%" (Sec. IV). Fig. 4 caption contradicts the plot on IR drop vs thickness; plot/text entered.
- Not reported: components, optical/electrical interfaces, bonding conditions, ILD/hardmask materials and thicknesses, wafer size, MLV count, absolute IR drop, TSV pitch, per-via resistance, reliability.
- Source: clean text layer. No candidate for Fig. 9; others correct.

## Fields not reported / schema gaps
- None blocking. Simulated-only TVs (eptc -c, ectc51687 -b, -c) carry basis simulated on their metrics.
