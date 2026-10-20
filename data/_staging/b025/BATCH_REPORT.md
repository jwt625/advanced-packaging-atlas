# Batch b025 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b025` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51846.2026.00134 | distilled | 5 | 3 | 8 | 7 | 12 | 0 | 0 | 16 | 6 | yes |
| ectc51909.2023.00190 | distilled | 2 | 2 | 10 | 8 | 16 | 0 | 0 | 23 | 6 | yes |
| icep55381.2022.9795565 | distilled | 3 | 5 | 18 | 10 | 14 | 0 | 0 | 7 | 5 | yes |

## ectc51846.2026.00134 (Intel glass core substrates, ECTC 2026)
- Figures opened: page_02-05 renders; 300 dpi re-crops of Fig. 1, 3, 4, 5(a), 6, 8(a,b); candidates p02_fig1, p04_fig7, p04_fig8, p05_fig10.
- Key figures: f01 Fig. 8(c) cross_section (candidate p04_fig8; panels (a),(b) in other column left out); f02 Fig. 4 cross_section (manual); f03 Fig. 5(a) package_photo (manual); f04 Fig. 7 warpage_plot (candidate p04_fig7); f05 Fig. 1 micrograph (manual, candidate clipped "(d)"); f06 Fig. 10 optical_plot (candidate p05_fig10).
- TVs: a = 10-2-10 / 24-layer glass core panel (510x515 mm) with 2 EMIBs, singulated; b = metallized TGV core coupon (TSC 750); c = LAE hole/cavity demos; d = glass waveguide + through-glass-hole test substrate; e = organic core reference (Fig. 6/7 comparisons only).
- Judgment calls: layer count conflict 10-2-10 (abstract) vs 24-layer (text/captions) logged, not reconciled; Fig. 7 sample build not stated, values attached to TV a / e; the "2" of 10-2-10 read as core layers (noted as reading). EMIB embedding entered as a step with position in flow unknown. Waveguide IL "total variance ~0.1 dB" entered as metric; absolute IL in arbitrary units. Buckets kept from batch (glass; si_bridge; advanced_substrate) although the paper also covers in-glass optical waveguides (cpo-adjacent).
- Excluded: laser-written waveguide capabilities (<0.1 dB/cm, <20 um, >300 nm) stated for the technique with ref [16]; Fig. 9 concept.
- Not reported: any TGV diameter/pitch/depth/taper, glass type, core thickness, RDL L/S and dielectric, unit size, EMIB size, sample counts, overlay numbers (Fig. 6 axes unreadable).

## ectc51909.2023.00190 (Applied Materials / EVG, 0.5 um pitch Cu/SiCN W2W)
- Figures opened: page_02-05 renders; 300 dpi re-crops of Fig. 2 and Fig. 4; candidates p02_fig1, p02_fig2, p02_fig3, p04_fig5, p05_fig7.
- Key figures: f01 Fig. 5 cross_section (candidate p04_fig5); f02 Fig. 1 stack_schematic (candidate p02_fig1); f03 Fig. 4 micrograph TEM/EELS (manual, no candidate); f04 Fig. 7 electrical_plot (candidate); f05 Fig. 3 micrograph AFM (candidate); f06 Fig. 2 mechanical_plot (candidate).
- TVs: a = six-level W2W test vehicle on 300 mm (DOE features A-G as interconnect rows); b = blanket SiCN/TEOS bond-strength coupons (films as metric variants, judgment call).
- Conflicts: interfacial SiOx 4.43/4.89 nm (TEM labels) vs "~6 nm" (text/caption) -> TEM entered; Cu areal density 4-25% vs 3-25% (feature E 3%) noted.
- Fig. 7 per-link resistances (2.34/1.12/0.67 ohm) entered in metrics only, keyed by the legend chain names (not mapped to features B/C/D to avoid inference).
- Fig. 2 bond strengths read +/-0.02 (normalized; reference not stated).
- Not reported: overlay values, yield, layer thicknesses, metal materials, plasma/PECVD conditions, Cu deposition step.

## icep55381.2022.9795565 (imec confined CoSn3 pre-IMC D2W TCB, 2-page ICEP)
- Figures opened: page_01-02 renders; 600 dpi re-crops of Fig. 5 CDF and Fig. 1; candidates p01_fig1, p01_fig2, p02_fig3, p02_fig4, p02_fig5.
- Key figures: f01 Fig. 4 cross_section; f02 Fig. 5 electrical_plot; f03 Fig. 1 stack_schematic; f04 Fig. 3 micrograph; f05 Fig. 2 micrograph (all candidate; only 5 figures in the paper).
- TVs: a = unconfined Co/Sn bumps (5-20 um pitch) pre-IMC study; b = short-loop TCB with confined pre-IMC, Sn 0.5/1/2 um split as variant; c = electrical samples (Co/Sn 1/0.5 um, TCB 150 C, CUF).
- Conflict: single-bump yield 90% (Sec. III.D text) vs 95% (abstract) and Fig. 5 CDF top ~94-95% -> 95 (approx) entered.
- Single-bump resistance values not entered (coarse log axis). 300 mm stated for top wafer only.
- Not reported: die sizes, cavity geometry, Ni/Sn thickness, TCB force/time, CUF product/cure, alignment numbers.

## Key-figure notes
- 17 figures chosen; 13 candidate, 4 manual (Intel Fig. 1, 4, 5(a); AMAT Fig. 4).
- Intel paper: Fig. 3 no candidate; p03_fig4 held only part of Fig. 4(a); Figs. 5 and 8 split across columns (candidates cover single panels).

## Schema gaps
- No metric/field for a substrate whose layer-count notation (10-2-10) and stated total (24-layer) disagree; handled via conflicts.
- interconnect_level lacks a die-to-wafer microbump level (used die_stack_internal for D2W microbumps).
- No field for top vs bottom via CD in asymmetric hybrid-bond pairs (bottom CD in notes).
