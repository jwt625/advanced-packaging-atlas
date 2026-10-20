# Batch b074 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b074` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tcpmt.2026.3717381 | distilled | 2 | 8 | 14 | 5 | 17 | 0 | 0 | 29 | 6 | yes |
| ectc51846.2026.00218 | distilled | 4 | 4 | 20 | 8 | 29 | 0 | 0 | 22 | 6 | yes |
| ectc51846.2026.00424 | distilled | 3 | 9 | 11 | 1 | 22 | 0 | 0 | 16 | 6 | yes |

## tcpmt.2026.3717381 (stacked glass wafer W-band antenna)
- Figures opened: candidates p01_fig2, p02_fig3, p02_fig4, p03_tablei, p03_fig6, p04_fig8, p04_fig9, p04_fig10, p05_fig13, p05_fig15, p07_fig20, p07_fig22.
- Key figures: f01 Fig. 2 stack_schematic (candidate p01_fig2); f02 Fig. 3 process_flow (candidate p02_fig3); f03 Fig. 15 micrograph (candidate p05_fig15); f04 Fig. 10 stack_schematic (candidate p04_fig10); f05 Table I data_table (candidate p03_tablei); f06 Fig. 20 package_photo (candidate p07_fig20).
- TVs: a = stacked-glass 4x4 array as fabricated on an 8-inch wafer and probe-tested standalone (wafer_level, glass_interposer); b = assembled frontend (glass array on Si-wafer package of the 16-channel transceiver via 479 Cu pillars, underfill, silver paste to PCB, wire bonds; package_class other).
- Judgment calls: RF results (EIML loss, transition IL/RL, S11, gain, beam scan) entered as metrics (category electrical), not electrical_interfaces (no D2D/protocol property). Element-level simulations hung on TV a, Si-to-glass transition simulation on TV b. The Fig. 2 concept stack (BGA, heat sink, TSV) not entered as built; TV b layers take only BCB/Si from Fig. 2/Fig. 8. Stack layers use structure `interposer` (two glass cores, single side) seq 1-8 top to bottom. Pillar diameter 48 um from text; photo shows 47.37 and 48.97 um (conflict logged). Table I "Dtgy" read as Dtgv.
- Not reported: affiliations (not in cached text), glass product, metal thicknesses, TGV pitch/count, bonding conditions, reflow profile, Si wafer dimensions, reliability/warpage.
- Source: accepted author version; text layer clean.

## ectc51846.2026.00218 (CEA-Leti D2W hybrid bonding down to 1 um pitch)
- Figures opened: candidates p02_fig1, p03_fig3, p03_fig4, p04_fig5, p04_fig6, p05_fig8, p06_fig10, p06_fig11, p06_fig12, p07_fig13, p07_fig14, p07_fig15, p07_fig16; manual re-crop of Fig. 6.
- Key figures: f01 Fig. 6 cross_section (manual; candidate had a line of body text); f02 Fig. 1 stack_schematic (candidate p02_fig1); f03 Fig. 3 process_flow (candidate p03_fig3); f04 Fig. 8 electrical_plot (candidate p05_fig8); f05 Fig. 4 xray_csam (candidate p03_fig4); f06 Fig. 11 cross_section (candidate p06_fig11).
- TVs: a = TV1 (6x6 mm die D2W on 300 mm wafer, 5/3/2/1 um pitch DC; one interconnect row per pitch); b = IDGF short loop (sub_assembly); c = TOV short loop coupon; d = HD TSV short loop coupon. TV2 itself is design only (not a TV).
- Judgment calls: interconnect alignment_um = 1.104 um (Fig. 4(c) |mean|+3 sigma, worst axis) vs text "<1 um (3 sigma)" (conflict logged). Yields from the results text (5 um >90, 3 um ~90, 2 um ~70, 1 um ~22%) rather than the abstract ">95% above 2 um" (conflict logged). IDGF Si top die: SEM label ~4 um entered in stack; text 15 um thinning target on component and process step (conflict logged). Fig. 12 medians (~0.19 ohm) read from plot; pitch of that 136k-link DC not stated. TOV entered as ic_type other (no enum). Earlier simple-damascene 0.6 ohm comparison excluded.
- Not reported: bonding tool/conditions beyond 400 C 2 h anneal, dielectric thicknesses, barrier/seed materials, TOV/HD TSV electrical data.

## ectc51846.2026.00424 (Tohoku die-level via-last TSV, photosensitive temporary adhesive)
- Figures opened: page grids p.2-5; manual re-crops of Fig. 1, 3, 4, 6, 8, 9 (two tries), 10; candidates p04_fig6, p04_fig7, p04_fig8, p04_fig9, p02_fig1, p03_fig3, p03_fig4, p05_fig10.
- Key figures (all manual; candidates clipped bottom rows or axis labels): f01 Fig. 10 cross_section; f02 Fig. 4 process_flow; f03 Fig. 3 process_flow; f04 Fig. 8 mechanical_plot; f05 Fig. 6 mechanical_plot; f06 Fig. 9 warpage_plot (crop keeps a sliver of caption).
- TVs: a = via-last TSV TV (2.5 mm dummy die thinned to 40 um on 500 um glass carrier, PW1500S, TSV 9.3 x 40 um, AR 4); b = PW1500S temporary-bond coupons (site size 2.3-4.0 mm and B-stage temperature as variants); c = conventional thermoplastic reference coupon. package_class other for all (no fitting enum).
- Judgment calls: Fig. 4 steps 7-9 (Cu-CMP, Cu/Sn microbumps, debond) listed with `performed` blank; Fig. 10 still shows Cu overburden. PI thickness: 5 um spin-coat (text/Fig. 3) vs ~7 um before / ~6 um after cure (Fig. 7) -> 6 um in stack (conflict logged). Shear for 2.3 and 2.4 mm sites read from Fig. 6 bars. Tg values excluded (sentence cites [6]). uLED heterogeneous integration (Fig. 11) is a concept, no TV.
- Not reported: TSV electrical data, TSV count/pitch, TCB conditions, liner and backside SiO2 thickness, carrier diameter.

## Schema gaps
- interconnect_type has no through-oxide via (TOV); used `other`.
- interconnect_level has no wafer-to-wafer non-hybrid (Cu-Sn-Cu SLID) glass-to-glass bonding level, and no "antenna array to Si wafer" pillar level; used `other`.
- RF/antenna performance (S11 bandwidth, gain, beam scan, line loss in dB/mm) has no dedicated table; entered as metrics category electrical.
- No package_class for die-level via-last TSV on a temporary carrier or for a glass antenna array stacked on a Si package; used `other`.
- figure_kind has no alignment/overlay scatter kind; die-shift plot used `mechanical_plot`, SAM + overlay figure used `xray_csam`.
