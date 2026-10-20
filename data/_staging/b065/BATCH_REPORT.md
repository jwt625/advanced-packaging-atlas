# Batch b065 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b065` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51529.2024.00153 | distilled | 2 | 4 | 13 | 2 | 13 | 0 | 0 | 10 | 6 | yes |
| ectc51846.2026.00008 | distilled | 1 | 5 | 5 | 3 | 12 | 0 | 0 | 10 | 6 | yes |
| ectc51529.2024.00057 | distilled | 1 | 3 | 16 | 6 | 12 | 0 | 0 | 18 | 6 | yes |

## ectc51529.2024.00153 (ETRI, LABC chip-on-wafer with laser NCF)
- Source: garbled PDF text layer; text.md is tesseract OCR. All numbers checked on figures/page_NN_220dpi.png (p.1-6). OCR scrambled author order: first author taken from the page image (Kwang-Seong Choi).
- Figures opened: page_01-06_220dpi; 250 dpi re-crops of Fig. 1, 7, 8, 9, 10, 12; 600 dpi zoom of Fig. 9(b) IMC labels.
- Key figures (all manual; candidates.json is empty): f01 Fig. 12 cross_section; f02 Fig. 1 stack_schematic; f03 Fig. 8 process_flow; f04 Fig. 9 micrograph; f05 Fig. 7 micrograph; f06 Fig. 10 micrograph.
- TVs: a = CoW prototype (2 chiplets LABC-bonded on Si wafer, >500,000 bumps at 20 um pitch); b = bumped chiplet wafer used for the reflow comparison (sub_assembly). Reflow method is a metrics variant.
- Judgment calls: package_class microbump_3d (role of Si wafer as interposer/base not stated). Bump diameter 10 um entered only on TV b (stated for the laser-reflowed bump array). TV a flow combines bump formation (Sec. III.A), formic-acid reflow (the bonded joints used formic-acid bumps, p.5) and the generic 4-step LABC list (Sec. II.A) with the 700 W / 5 s / ~260 C conditions (Sec. III.B). Bonding temp = pyrometer peak (area-averaged, approx). Melt viscosity 130 Pa.s from text; Fig. 5 minimum reads higher (conflict logged). Transmittance ~90% read off Fig. 4.
- Not reported: chiplet size/thickness, wafer size, bonding pressure, NCF thickness, post-cure conditions, alignment value, electrical/yield/reliability data.
- Excluded: Table I comparison (4 um LABC pitch from ref [11], TCB/MR characteristics).

## ectc51846.2026.00008 (ASE, 600 mm panel RDL with 300 mm panel assembly)
- Figures opened: page_03-05; candidates p03_fig1, p03_tablev, p04_tableviii, p05_fig5, p05_tablexi; manual re-crops of Fig. 1 and Table VI.
- Key figures: f01 Fig. 5 cross_section (candidate p05_fig5); f02 Fig. 1 process_flow (manual: candidate cut at bottom and includes the section heading); f03 Table VI micrograph (manual: candidate p03_tablevi points at the caption on p.3, table image is on p.4); f04 Table V data_table (candidate); f05 Table VIII xray_csam (candidate); f06 Table XI data_table (candidate).
- One TV (2 SoC dies, chip-last 3-layer RDL 5/8 um L/S, 4 passivation layers). Interposer ~17x25 mm from the abstract (approx); the p.5 text holds an unfilled placeholder "[Package Size, e.g., 17x25mm]".
- Judgment calls: Table IV relative productivity entered as author_estimate throughput metrics (baseline 300 mm wafer = 1.0). RDL count 3 (Table V, text) vs "4P4M" (Fig. 1, Sec. IV.A heading): 3 chosen, conflict logged. Flip-chip bump type left unspecified. TTV < 10 um entered with basis unspecified (stated tolerance).
- Not reported: die sizes, dielectric material, bump pitch/size, ball size, bonding conditions, material products, warpage values.

## ectc51529.2024.00057 (CEA-LETI, 3-layer HB demonstrator with HD TSV)
- Figures opened: page_02-06; candidates p02_fig1, p02_fig3, p03_fig5, p03_fig6, p04_fig9, p05_fig12; 600 dpi zooms of Fig. 4(b) and Fig. 5(b) overlay headers.
- Key figures (all candidate): f01 Fig. 6 cross_section; f02 Fig. 1 stack_schematic; f03 Fig. 3 process_flow; f04 Fig. 9 cross_section; f05 Fig. 12 electrical_plot; f06 Fig. 5 xray_csam.
- One TV (300 mm W2W stack); 6 and 4 um pitch are test-structure variants on the same stack (separate interconnect rows per pitch and interface); 3L vs 2L-like are metrics variants.
- Judgment calls: stack layers as one die_stack sequence (tier 3 top after Si removal, F2F, tier 2 with 9 um Si + TSV, F2B, tier 1). Alignment = |Mean|+3sigma from the figure headers (F2F 393/380 nm, F2B 941/1029 nm); text says F2B < 1 um (conflict logged, figure value entered). Table 1 totals entered as derived (paper's own ideal calculation; TSV term from ref [13]).
- Conflicts: abstract says first F2F bond was tier 1/tier 2; body text and Fig. 3 say tier 2/tier 3 (chosen). Fig. 1(b) interface labels appear swapped vs Fig. 3/10.
- Not reported: HB dielectric, bonding/anneal conditions, layer thicknesses, TSV fill metal, n per distribution, reliability.

## Key-figure notes
- 18 figures: 10 candidate, 8 manual (6 for 00153, which has no candidates; 2 for 00008).
