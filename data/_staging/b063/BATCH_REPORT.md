# Batch b063 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b063` -> `0 errors, 0 warnings (data/_staging/b063)`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures (manual) | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tcpmt.2021.3104326 | distilled | 3 | 7 | 41 | 4 | 23 | 0 | 0 | 22 | 6 (0) | yes |
| icep-iaac64884.2025.11002987 | distilled | 1 | 1 | 4 | 1 | 15 | 0 | 0 | 3 | 5 (3) | yes |
| ectc51909.2023.00023 | distilled | 1 | 2 | 10 | 2 | 12 | 0 | 0 | 32 | 6 (0) | yes |

## tcpmt.2021.3104326 (CEA-LETI, cryogenic SnAg microbump vs Cu/SiO2 hybrid bond)
- Figures opened: all 7 candidates (p02_fig1, p02_fig2, p03_fig3, p04_fig4, p05_fig5, p05_fig6, p06_tablei); all complete.
- Key figures: f01 Fig. 2 stack_schematic (candidate p02_fig2); f02 Fig. 5 cross_section (candidate p05_fig5); f03 Fig. 6 cross_section (candidate p05_fig6); f04 Fig. 1 top_view_layout (candidate p02_fig1); f05 Table I data_table (candidate p06_tablei); f06 Fig. 3 electrical_plot (candidate p03_fig3).
- TVs: a = SnAg microbump D2W, no underfill; b = same plus epoxy capillary underfill (stack changes, so a separate TV per rule f; only FIB-SEM morphology is reported for it); c = Cu/SiO2 hybrid bond D2W (top die thinned to 10 um).
- Judgment calls: Table I SnAg link values (averaged over all measured SnAg structures, which include the 2 with underfill) are attached to TV a with a note. The interconnect `resistance_mohm` for SnAg is the Kelvin (single bump) value at 300 K; HB has no Kelvin structure, so its link R is only in metrics. Bonding reflow 260 C is taken from p.4 (conflict with the p.2 pre-dice reflow logged). The text layer drops the Omega symbol ("100.5 m"); all values checked against the Table I image.
- Superconducting-drop temperatures (3.2 K / 3.4 K) entered as measured; the Tc attributions (Al, Sn, TiN) are literature values and excluded.
- Not reported: die/wafer thicknesses (SnAg), bonding force/temperature for HB, underfill product, chain yields, thermal conductivity.

## icep-iaac64884.2025.11002987 (ASE micro-ball mount)
- Figures opened: page_01, page_02 renders; candidates p01_fig1, p01_fig2, p01_fig3, p02_fig4; re-crops of Fig. 4(c) at 400 dpi, Fig. 4(a)-(b), Fig. 2.
- Key figures: f01 Fig. 4(c) cross_section (manual); f02 Fig. 4(a)-(b) micrograph (manual); f03 Fig. 3 package_photo (candidate p01_fig3); f04 Fig. 1 other (candidate p01_fig1); f05 Fig. 2 other (manual).
- Source: 2-page paper with non-native English; page 2 carries the header "ASE Confidential / Security-C". Very few numbers: 70 um Cu UBM pad width, commercial 70 um micro balls, "fine-pitch (< 150 um)", 100% ball-mount stage yield, no flux residue.
- Judgment calls: package_class fan_out_panel (purpose is chip preparation for large-panel fan-out); TV is the 12 inch wafer with balls. Interconnect level/type `other` (ball alloy not stated; replaces Cu pillar). Pitch entered as < 150 um (stated as the fine-pitch range, not the exact TV pitch). Steps 11-15 (thinning, saw, die bond on 600x600 mm panel, molding, mold grinding) are in the abstract but the conclusion calls them the next step: entered with `performed = no`. SEM scale bar in Fig. 4(c) is illegible, so no dimension was read from it.
- Candidate issues: p02_fig4 covered only panel (c) plus the page header and blank margin; panels (a),(b) sit at the bottom of the other column (no candidate); p01_fig2 included author lines and clipped the bottom row.
- Not reported: ball alloy, exact pitch, plating thicknesses, reflow profile, flux product, die size/thickness, sample counts, electrical or reliability data.

## ectc51909.2023.00023 (Adeia DBI Ultra fine-pitch D2W)
- Figures opened: candidates p02_fig1, p02_fig3, p03_fig4, p04_fig6, p04_fig7, p04_fig8, p05_fig9, p06_fig10, p06_fig11, p06_fig12, p06_fig13, p07_fig14 (all complete).
- Key figures: f01 Fig. 3 cross_section (candidate p02_fig3); f02 Fig. 7 cross_section (candidate p04_fig7); f03 Fig. 1 top_view_layout (candidate p02_fig1); f04 Fig. 4 other (alignment box plots, candidate p03_fig4); f05 Fig. 10 electrical_plot (candidate p06_fig10); f06 Fig. 11 electrical_plot (candidate p06_fig11).
- Judgment calls: one TV (four lots are a split, not new builds). DBI pad height 3.5 um read from the Fig. 3 SEM label (measured override). Anneal 250 C entered in the interconnect row (flow says 250-300 C; 250 C stated sufficient). Interconnect yield_pct = ~92% average across all chains; center-chain yield conflict (65% vs 20-35% loss vs ~80%) logged, 80% (conclusion) entered. Bonder alignment spec and foundry (Tower Semiconductor) recorded; foundry BEOL fabrication kept as one `other` step since the paper gives no sub-steps.
- Text layer renders micro as "P" and sigma as "V"; numbers checked against figure labels where present.
- Not reported: bonding temperature/force/time, activation details, anneal time, substrate and oxide thickness, via diameter, absolute resistances, reliability.

## Schema gaps / friction
- `figure_kind` has no class for alignment/overlay distribution plots (used `other` for Fig. 4 of ectc51909.2023.00023).
- No interconnect_level for a ball-on-UBM vertical interconnect formed at wafer level before fan-out (used `other`).
- Interconnect `resistance_mohm` cannot say whether the value is a Kelvin (single joint) or daisy-chain link average, nor the measurement temperature; handled via notes and metrics.
- Metrics carry +/- spreads only in notes (no sd/spread column), e.g. alignment 0.99 +/- 0.60 um.
