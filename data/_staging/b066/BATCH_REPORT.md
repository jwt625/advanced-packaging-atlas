# Batch b066 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b066` -> `0 errors, 0 warnings`.

| paper_id | status | papers | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51687.2025.00226 | distilled | 1 | 5 | 5 | 19 | 11 | 14 | 0 | 0 | 35 | 6 | yes |
| ectc51846.2026.00194 | distilled | 1 | 4 | 0 | 10 | 2 | 16 | 0 | 0 | 6 | 6 | yes |
| ectc51687.2025.00071 | distilled | 1 | 3 | 0 | 18 | 3 | 27 | 0 | 0 | 13 | 6 | yes |

## ectc51687.2025.00226 (Mitsubishi Materials, multilayer nanoporous Cu bumps)
- Figures opened: page_03-06 renders; 300 dpi re-crops of Fig. 3, 4, 6; manual crops of Table I and Table II; candidates p02_fig1, p05_fig5, p06_fig6, p04_fig4.
- Key figures: f01 Fig. 5 cross_section (candidate p05_fig5); f02 Fig. 1 process_flow (candidate p02_fig1); f03 Table I data_table (manual); f04 Table II data_table (manual); f05 Fig. 6 electrical_plot (candidate p06_fig6); f06 Fig. 4 mechanical_plot (candidate p04_fig4).
- TVs by test structure, since each has its own geometry: a = phi 7 um bumps on Ti/Cu-seeded wafer (etch/porosity); b = phi 25 um bumps on a 5 um Cu pillar (indenter compression); c = shear coupon (phi 7 um bumps bonded to an unbumped chip); d = phi 7 um bump-to-bump bond (Fig. 5); e = 8x8 phi 75 um daisy chain. Bump metallurgy (NP-Cu, /Ag, /Ni, /Ni/Ag, /SnAg) is kept as metrics.variant or `feature`. Daisy-chain bonding conditions (Table II A, B, B', C, D and references Ref. 1 Sn, Ref. 2 Ni/SnAg) are one interconnect row each.
- Judgment calls:
  - ic_type `other` (porous Cu bump).
  - bonding_method: thermocompression_cu for the solid-state Ni and Ni/Ag bonds; tcb for the SnAg bonds (TLP-like per the authors).
  - package_class: microbump_3d for the bonded chip-to-chip coupons; other for the unbonded coupons.
  - Table II chain resistance (which includes the Cu pads) goes in metrics, not in interconnects.resistance_mohm.
  - Porosity: the 43.5/29.7/15.4% values are the authors' derived values (Eq. 1); the 43-52% and 28-34% ranges are author_estimate.
- Conflicts: text says shear strength rose 3x from NP-Cu/Ni to NP-Cu/Ni/Ag, but the plot shows about 5x (3.7 vs 18.7 MPa); plotted values entered. Text says NP-Cu/Ni/Ag resistance is "almost the same" as Ni/SnAg, but Table II gives 2.1 vs 1.6 ohm.
- Not reported: bump pitch, chip sizes, bonding conditions for the Fig. 5 samples, sample counts, TC/EM reliability (stated as future work). Table II B' resistance cell is blank.
- Org printed as "Mitsubishi Materials Corporration" (sic), kept as printed.

## ectc51846.2026.00194 (EV Group / Asahi Kasei, digital lithography of DFR on panels)
- Figures opened: page_02-05 renders; candidates p03_tablei, p03_fig4, p04_fig5, p04_fig7, p04_fig8, p05_fig11; manual re-crop of Fig. 8.
- Key figures: f01 Fig. 5 cross_section (candidate p04_fig5); f02 Fig. 7 micrograph (candidate p04_fig7); f03 Table I data_table (candidate p03_tablei); f04 Fig. 4 top_view_layout (candidate p03_fig4); f05 Fig. 8 micrograph (manual); f06 Fig. 11 package_photo (candidate p05_fig11).
- TVs: a = 310x310 mm glass panel; b = 300x300 mm Cu-sputtered glass panel (HRDP), used for CDU; c = 150 mm Cu-sputtered Si wafer; d = DFR via patterns and Cu pillars (substrate not stated). package_class is `other` because these are lithography/plating test builds, not packages.
- Conflicts:
  - Text maps 30 um to AR 1:3 and 40 um to AR 1:4. The captions give the opposite (30 um 1:4, 40 um 1:3), which matches 120 um / diameter; the captions are used.
  - Text says 300 mm Si and glass wafers; Table I says 150 mm Cu-sputtered Si wafer; the table is used.
  - CDU text says "wafer-edge sites" for a panel map.
- Exposure equipment recorded as a multi-head digital exposure system; LITHOSCALE is named only in the conclusions (recorded in papers.notes; technology_name left blank).
- Not reported: pillar pitch, seed thickness, plating time, optimal dose/focus within the stated ranges, throughput and overlay numbers.

## ectc51687.2025.00071 (Purdue, 3 um TSV at AR 4/7/10, Raman and EBSD)
- Figures opened: page_02-05 renders; 300 dpi re-crops of Fig. 6 and Fig. 8; manual crops of Fig. 6, 7, 8; candidates p02_fig1, p03_fig4, p04_fig5, p04_fig6, p04_fig7, p05_fig8.
- Key figures: f01 Fig. 4 cross_section (candidate p03_fig4); f02 Fig. 1 process_flow (candidate p02_fig1); f03 Fig. 6 mechanical_plot (manual); f04 Fig. 8 other/grain-size plot (manual); f05 Fig. 5 mechanical_plot, Raman stress map (candidate p04_fig5); f06 Fig. 7 micrograph, EBSD (manual).
- TVs: one per aspect ratio (different via depth). AR 4:1 is DC plated; 7:1 and 10:1 are pulse-reverse plated (recorded in process_steps).
- Depth 12/21/30 um derived as AR x 3 um (override plus evidence `derived`). Stack-layer seq L02-L06 follows the radial liner order (noted).
- Stress values are the Fig. 6 mean markers: ~86, ~34, ~19 MPa. The abstract says "~100 to ~20 MPa" (conflict logged). Grain sizes come from Fig. 8 bars, with error bars in value_text (error-bar meaning not stated).
- Conflict: the Conclusions say DC grains are smaller than pulse-reverse grains, but the Results text and Fig. 8 show the opposite; the plot is used.
- Not reported: wafer/substrate size, TSV count, plating chemistry, electroless Cu thickness, electrical data.
- primary_bucket kept as microbump_3d per the batch file (TSV-only paper).

## Notes
- Candidate quality (18 figures): 12 used as-is; 6 manual (no candidates for 00226 Tables I/II; 00194 Fig. 8 included the previous caption line; 00071 Fig. 6/8 clipped axis labels; Fig. 7 included a section heading).
- No electrical_interfaces or optical_interfaces in this batch: none of the three papers reports a protocol or optical property.
