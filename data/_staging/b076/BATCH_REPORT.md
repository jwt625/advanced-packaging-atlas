# Batch b076 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b076` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51846.2026.00106 | distilled | 3 | 3 | 6 | 0 | 15 | 0 | 3 | 29 | 6 | yes |
| ectc51846.2026.00187 | distilled | 2 | 4 | 18 | 5 | 9 | 0 | 0 | 37 | 6 | yes |
| tcpmt.2026.3740312 | distilled | 5 | 6 | 36 | 3 | 9 | 0 | 0 | 26 | 6 | yes |

## ectc51846.2026.00106 (Corning, IOX glass waveguides for CPO)
- Figures opened: page_02-04 renders; 300 dpi re-crop of Fig. 6; candidates p02_fig1, p02_fig3, p03_fig4, p03_fig5, p03_fig6, p04_fig7.
- Key figures (all candidate): f01 Fig. 5 package_photo; f02 Fig. 4 process_flow; f03 Fig. 7 optical_plot; f04 Fig. 6 optical_plot; f05 Fig. 3 simulation_result; f06 Fig. 1 stack_schematic (concept, paper-level).
- TVs: a = straight-waveguide cut-back coupons; b = 90 deg bend structures (mask opening 3/4.5/6/9 um as metrics.variant); c = 16-ch S-bend fan-outs (250 to 127 um over 6 mm, 250 to 50 um over 8.2 mm; Euler/circular as variants). All on 150 mm x 0.7 mm CPO glass wafers; package_class photonic_interposer inferred from the Fig. 1 concept (no electrical layers built).
- Judgment calls: process flow (Fig. 4 + text) written per TV; Fig. 4 "T=325..425 C" kept in conditions (no single process temperature stated). Fan-out losses 0.62 and 0.65 dB mapped to designs only "as listed" (paper does not state which is Euler/circular). Commercial glass A/B diffusivities entered as comparison metrics on -a (model inputs, not built). Bend-loss 4 to 0.01 dB/cm is an abstract-only claim (basis unspecified).
- Conflicts: fan-out length 8.2 mm (text) vs 8 mm (abstract); "up to 1.3 dB" reduction (text) vs ~1.5 dB from Fig. 7 points; "~12.5 cm total length" looks inconsistent with 0.04 dB/cm and 0.62 dB total (kept as written, flagged).
- Not reported: glass composition/CTE, IOX times, mask material, core dimensions, MFD, sample counts for bends/fan-outs, any electrical/interconnect data.
- Source: garbled symbol-font words on p.2-4 text layer (mask widths, fan-out paragraph, Fig. 3 labels) read from page images.

## ectc51846.2026.00187 (Applied Materials / EVG, 300 nm pitch W2W hybrid bonding)
- Figures opened: page_02-06 renders; 300 dpi re-crops of Fig. 6(a), Fig. 7, Fig. 8; candidates p02_fig1, p03_fig2, p04_fig4, p05_fig5, p06_fig6, p06_fig8.
- Key figures (all candidate): f01 Fig. 1 stack_schematic; f02 Fig. 2 cross_section (TEM); f03 Fig. 6 electrical_plot (yield vs pitch); f04 Fig. 4 electrical_plot (overlay budget); f05 Fig. 8 reliability_plot; f06 Fig. 5 other (overlay map/CDF).
- TVs: a = fine-grain Cu, b = standard Cu (different bonding-via metallurgy, same six-layer SiCN TV). Anneal 210 vs 350 C kept as metrics.variant. Interconnects per pitch on -a (300 nm/150 nm CD, 400 nm/200 nm pad, 500 nm, 800-1000 nm); count = 100K links per chain.
- Judgment calls: 300 mm wafer read from +/-150 mm overlay-map axes (override figure_image). Fig. 4 wafer metallurgy/anneal not stated; its yields and overlay thresholds attached to -a with a note. Plating-before-CMP order noted as implied. Yields read off Fig. 6(a) (+/-2%); 100K-chain median resistances read off log axes of Fig. 7(a)/8(a) (+/-15%).
- Conflicts: overlay 50 nm (Fig. 5) vs 53 nm (Fig. 6(c) yield wafer), both entered as metrics.
- Not reported: layer/SiCN/oxide thicknesses, Cu recess, plasma/bond parameters, sample counts, per-link resistance, post-bond integration details.

## tcpmt.2026.3740312 (Tsinghua, In-In RT flip-chip on Au-passivated Nb/Ti UBM)
- Figures opened: page_02, 03, 05, 06, 07 renders; 300 dpi re-crops of Fig. 1(b), Fig. 6(g), Fig. 8; candidates p02_fig1, p05_fig5, p05_fig6, p06_fig7, p07_fig8, p07_fig9.
- Key figures (all candidate): f01 Fig. 1 stack_schematic (incl. concept panel (a)); f02 Fig. 5 cross_section (FIB/EBSD); f03 Fig. 7 electrical_plot (R-T, TC); f04 Fig. 6 micrograph (TEM-EDS, bump profile); f05 Fig. 8 electrical_plot (CDF); f06 Fig. 9 other (XPS/ToF-SIMS).
- TVs: a = sample2 daisy chain, original 50 um In bumps, 1152 pairs (in-situ Ar clean, 300 nm Ti); b = sample1 reference (no Nb oxide removal, 40 nm Ti); c = 10 um CD bonded strips/bumps (FIB/EBSD/TEM coupons, also bump-diameter study 50/10/5 um); d = In directly on Nb coupon (Fig. 2); e = Nb/Ti/In without Au coupon (ToF-SIMS).
- Judgment calls: the electrical daisy chain uses 50 um bumps (Sec. III.B), not the 10 um minimum feature; 16 short chains (Fig. 8) kept as -a metrics variants. Sample1 bump size/bonding not stated, left empty. Bonding at room temperature recorded as tcb with temp blank (no numeric value). Equipment accuracy (+/-3 um, +/-20 urad) is a theoretical spec, recorded in process conditions only.
- Conflicts: 10 um bump height 4.1 um (Fig. 6(g) profile) vs "5 um-thick In bumps" (text); Fig. 7 described as both per-link and chain resistance.
- Not reported: chip sizes, bump pitch of the daisy chain, bonding force/time, deposition methods for Nb/Ti/Au, critical field values, CDF measurement temperature.
- Source: accepted author version (not final pagination).

## Notes
- No needs_download; all three full_text with clean or partially garbled text layers (00106 verified against images).
- All 18 key figures used candidate bboxes as-is (each crop opened and complete); no manual re-crops needed for figures.
- Schema gaps hit: no figure_kind for surface-analysis depth profiles (XPS/ToF-SIMS) or overlay maps (used `other`); no metric_category for material/microstructure analysis (used `other`); interconnects lack a field for post-bond (deformed) diameter (put in metrics); bonding_temp_c cannot express "room temperature" without a number.
