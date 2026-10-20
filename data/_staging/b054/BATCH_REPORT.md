# Batch b054 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b054` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51846.2026.00035 | distilled | 4 | 4 | 12 | 5 | 11 | 10 | 0 | 39 | 6 | yes |
| ectc51909.2023.00230 | distilled | 1 | 1 | 14 | 1 | 24 | 1 | 2 | 12 | 6 | yes |
| eptc59621.2023.10457612 | distilled | 2 | 4 | 10 | 4 | 20 | 0 | 0 | 46 | 6 | yes |

## ectc51846.2026.00035 (AOI Electronics, Pillar-Suspended Bridge at 25 um pitch)
- Figures opened: page_04, page_08 renders; page 7 grid; re-crops of Fig. 5, 6, 7 (250/220 dpi), 10, 11; candidates p01_fig1, p02_fig2, p02_tablei, p03_fig3, p03_fig4, p05_tableii, p07_fig11, p08_fig12, p08_fig13.
- Key figures: f01 Fig. 13 xray_csam (candidate p08_fig13); f02 Fig. 11 process_flow (manual; candidate merged Fig. 10 + 11); f03 Fig. 1 stack_schematic (candidate p01_fig1); f04 Table I data_table (candidate p02_tablei); f05 Fig. 5 electrical_plot (manual, no candidate); f06 Table II data_table (candidate p05_tableii).
- TVs: a/b/c = simulation models A (DD checkerboard), B (DD parallel), C (3-layer SAP); d = bridge-last PoC module (300 mm square glass panel carrier).
- Judgment calls: Oxide vs Polymer ILD kept as a split variable (metrics.variant, ILD rows with feature "Oxide/Polymer variant") instead of 5 TVs. Insertion loss at 50 GHz read off Fig. 5 (+/-0.2 dB) as electrical_interfaces rows per model/dielectric/reach; protocol unspecified (UCIe only named as target). Eye height / opening factor from Fig. 6/7 in-plot labels. MicroPillar and tall pillar ic_type "other" (metal not stated). package_class si_bridge_fanout inferred (noted). -3 dB bandwidth 11.5 GHz (Model C, 2.0 mm) appears only in the abstract.
- Excluded: prior-work numbers (40 um pitch, 142 um pad pitch, 9.96 x 0.96 mm, 720 um; 2 um via / 5 um via pitch of ref [5]).
- Not reported: prototype dimensions, pillar metallurgy and tall-pillar size, bonding conditions, measured electrical/yield/reliability data, energy/bit.

## ectc51909.2023.00230 (Fraunhofer IZM / CEA-Leti high-speed TSVs on SiPh)
- Figures opened: page_02-04 renders; 300 dpi re-crops of Fig. 3, 8, 9; candidates p02_fig2, p03_fig4, p03_fig6, p04_fig7 (p04_fig8/9 bboxes viewed via identical re-crops).
- Key figures: f01 Fig. 6 process_flow (candidate p03_fig6); f02 Fig. 4 stack_schematic (candidate p03_fig4); f03 Fig. 7 package_photo (candidate p04_fig7); f04 Fig. 9 electrical_plot (candidate p04_fig9); f05 Fig. 8 electrical_plot (candidate p04_fig8); f06 Fig. 2 stack_schematic (candidate p02_fig2).
- One TV: TSV test reticle on post-processed 200 mm SiPh wafer; HFSS results entered as simulated rows on the same TV (model of the built structure). PDK results (waveguide loss, grating IL, PD responsivity, MZM VpiLpi) attached to the same TV with a note (wafer relation not stated).
- Process flow: CEA-Leti platform steps (10) + IZM 13-step via-last flow (14 rows; step 2 split into TSV etch and passivation).
- Conflicts logged: text "below 2 dB loss at 67 GHz" vs Fig. 9 S12 reticle 1 ~2.35 dB at 67 GHz (dip ~2.65 dB near 64 GHz); text "S11/S22 below -20 dB DC-67 GHz" vs Fig. 8 S11 reticle 2 peak ~-11 dB near 65 GHz. Plot values entered (rule k).
- Not reported: TSV pitch/liner/count, pad metallization materials, final wafer thickness (100 um is the design optimum), reliability, data-rate tests.

## eptc59621.2023.10457612 (IME A*STAR wafer-level embedded Si microcooler) - OCR text
- Source: TEXT_LAYER_WARNING present; text.md is tesseract OCR with digit errors (Tab. 1, Fig. 6 table, "801m"). Every number re-read from page_NN_220dpi.png and 300 dpi re-crops. No figure candidates exist for this paper.
- Figures opened: page_01-04_220dpi; re-crops of Fig. 1, 2, 3, 4, 6, 7, 8, 9, 10, 11 and Tab. 1.
- Key figures (all manual): f01 Fig. 1 stack_schematic; f02 Fig. 10 micrograph; f03 Fig. 3 process_flow; f04 Fig. 2 process_flow; f05 Tab. 1 data_table; f06 Fig. 8 cross_section. Right-column labels of Fig. 2, 3, 10 are truncated at the page edge in the source PDF itself (wider crops only add body text).
- TVs: a = fabricated wafer-level cooler (300 mm, from Tab. 1 label); b = Fig. 1 package design (Si cap 300 um, Si substrate, PCB), design-only.
- Judgment calls: glass vs Si temporary carrier treated as split variable (warpage metrics variant; both debond methods in process conditions). Warpage 500 um / <200 um basis "unspecified" (method not stated). Per-location Tab. 1 values entered (24 rows) plus sensor resistance at 25/150 C per sensor and the paper's fit slope.
- Conflicts logged: substrate thickness 300 (text) / 320 (Fig. 3(i)) / 321.04-324 um (Fig. 10, chosen); DRIE depth >200 (text) / ~250 (Fig. 3(k)) / 250 (Fig. 1) / measured 195-220 um; Fig. 9 labels vs text (~200/~210 um); sensor temperature range 25-150 C (Fig. 6) vs 25-160 C (Conclusions); metal on oxide (text) vs bare Si (Fig. 2a).
- Excluded: stray "opened TSV" phrase (no TSV elsewhere), refs [1]-[3] microcooler data, 15 um line width in Conclusions.
- Not reported: metal identity, polyimide product/thickness, bump heights, solder alloy, pitches, thermal performance (no flow/thermal resistance data).

## Notes
- Candidate quality: ectc51846 p07_fig11 merges Fig. 10 and Fig. 11; no candidate for Fig. 5. ectc51909 all candidates usable as-is. eptc59621 has no candidates (garbled text layer).
- primary_bucket kept from the batch file for all three; ectc51846 buckets extended with panel (300 mm square glass panel carrier).
