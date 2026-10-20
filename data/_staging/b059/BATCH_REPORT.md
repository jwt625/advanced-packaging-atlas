# Batch b059 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b059` -> `0 errors, 0 warnings`.
Key-figure crops rendered with `scripts/crop_figures.py --staging data/_staging/b059` (18 crops, scratch only).

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tcpmt.2026.3650893 | distilled | 3 | 7 | 17 | 3 | 11 | 0 | 0 | 18 | 6 | yes |
| ectc51529.2024.00321 | distilled | 7 | 8 | 21 | 1 | 15 | 0 | 0 | 32 | 6 | yes |
| ectc51846.2026.00130 | distilled | 4 | 0 | 12 | 3 | 30 | 0 | 0 | 29 | 6 | yes |

## tcpmt.2026.3650893 (Georgia Tech / UCSD, inverse hybrid bonding, 3-page letter)
- Figures opened: page_01-03; 400-600 dpi re-crops of Fig. 3, 4, 5, 5(b), 6, 7; candidates p01_fig2, p02_fig3, p02_fig5, p02_fig6, p03_fig7, p03_fig8.
- Key figures: f01 Fig. 7 cross_section (candidate p03_fig7); f02 Fig. 5 stack_schematic (candidate p02_fig5); f03 Fig. 2 process_flow (candidate p01_fig2); f04 Fig. 3 stack_schematic (candidate p02_fig3); f05 Fig. 6 electrical_plot (manual; candidate ran to page edge); f06 Fig. 8 mechanical_plot (candidate p03_fig8).
- TVs: a = 140 um pitch through-hole testbed (5x5 mm die on 10x10 mm, Cu-Cu TCB 300 C/400 N/5 min, ZnO ALD coverage splits); b = similar testbed without through-holes (one sentence; aspect ratio 1:2500, complete underfill); c = 2x2 mm multipitch 100/20 um Au-passivated Cu bond testbed with 7-supercycle ZIF-8 MOF underfill.
- Judgment calls: package_class hybrid_bonded_3d and level die_to_die_hybrid (IHB = metal bond first, vapor dielectric later; "substrate" is a Si die). TV c bonding_method thermocompression_cu taken from the Fig. 2 caption (override caption); bonding conditions for TV c not stated. TV c stack from Fig. 5(b) schematic (Ti/Cu/Au pad, Au-capped Ti/Cu pillar) plus Fig. 7(c) SEM labels (400 nm pillar, 300 nm Cu RDL, SiO2). After-TCT Rc 1.3e-8 read off Fig. 6 (approx).
- Conflict: Fig. 6 axis unit ohm*um2 vs text ohm*cm2 (text unit kept).
- Not reported: pad/pillar diameters, I/O counts, die thicknesses, TV c substrate size, sample counts, MOF recipe for TV a shear samples. MOF k = 2.6 is attributed to refs [17], [18] (excluded). Fig. 4(a) labels 572/364 um/1.34 mm not entered (meaning undefined).

## ectc51529.2024.00321 (Resonac, panel die-embedded interposer warpage)
- Figures opened: page_02-04; 300-400 dpi re-crops of Fig. 1, 2, 3, 4, 8, 9, 10, 11, 14, Table I; candidates p02_fig1, p02_fig2, p02_fig4, p03_fig8, p03_fig10, p04_fig13.
- Key figures: f01 Fig. 13 cross_section (candidate p04_fig13); f02 Fig. 2 stack_schematic (candidate p02_fig2); f03 Fig. 1 process_flow (candidate p02_fig1); f04 Fig. 8 warpage_plot (candidate p03_fig8); f05 Fig. 10 warpage_plot (candidate p03_fig10); f06 Fig. 4 warpage_plot (candidate p02_fig4).
- TVs: a = final 515x510 mm panel (Glass C, liquid compression EMC, 729 dummy chips, 100 um Cu pillars, SAP RDL 10/10-5/5 um); b/c/d = warpage panels on Glass A/B/C; e = EMC-type panels; f = outer-edge Cu plating prevention panels; g = FE simulation model (Fig. 2 dimensions, Table I properties).
- Judgment calls: Fig. 4 (film EMC, chip count unstated) and Fig. 8 (576/729 chips, EMC unstated) cannot be matched to one build, so per-glass TVs carry EMC/chip-count as metric variants (rule f strict reading would need combinations the paper does not define). Fig. 10 and Fig. 6 glass type unstated -> separate TVs e, f. Fig. 2 thicknesses (glass 1100 um, chip 100 um, DAF 20 um, mold 150 um, etc.) assigned only to the simulation model. Fig. 14 center-line widths read off plot (statistic undefined -> `other`). Buckets kept from batch file (panel; si_bridge; organic_rdl_fanout); si_bridge only via "embedded bridge die" framing, the build uses dummy Si chips.
- Conflict: Sec. III.E gives +730 um after molding for the final build (identical to Fig. 4 film-EMC Glass C value) while Sec. IV says convex before RDL and Fig. 10 liquid EMC is -1550 um. Entered as stated, logged. Sign: + concave (bowl), - convex.
- Not reported: chip size, pillar pitch/diameter, RDL layer count/dielectric product/thickness, real glass thickness, EMC products, cure/molding conditions, warpage tool, sample counts. 320x320 mm panel only in abstract (no data).

## ectc51846.2026.00130 (Applied Materials / EVG, 450 nm pitch W2W hybrid bonding)
- Figures opened: page_02-05; re-crops of Fig. 2, 2(b), 5, 7, 9, 10, 13; candidates p03_fig7, p04_fig10, p05_fig13.
- Key figures: f01 Fig. 2(b) cross_section (manual, no candidate); f02 Fig. 2 process_flow (manual, no candidate); f03 Fig. 13 electrical_plot (candidate p05_fig13); f04 Fig. 7 electrical_plot (manual; candidate clipped x-axis title); f05 Fig. 5 micrograph (manual, no candidate); f06 Fig. 10 electrical_plot (candidate p04_fig10).
- TVs: a = optimized W2W TV (PVD TaN/Ta/CuMn barrier, Insepra SiCN, 400 C 5 min Pyra anneal); b = ALD TaN/PVD TaN barrier variant (layer stack differs); c = post-CMP blanket Cu film (XPS Table I); d = unbonded anneal coupons (AFM Cu expansion).
- Judgment calls: plasma conditions and anneal time kept as variants (process splits). Process flow (30 steps) from Fig. 2a module list plus Sec. II.B/III text (equipment Reflexion LK Prime, EVG Gemini FB XT/SmartView NT3, Producer Pyra, Endura, Producer). 300 mm wafer read from Fig. 4 wafer-map axes (override figure_image). Double-via per-link R ~1.0 ohm read from Fig. 13(b) (not in text). Failure signature (carbon at interface, (111) grains) assigned to TV b since Fig. 8 ties it to ALD TaN/PVD TaN; Fig. 5 itself does not name the barrier. No components rows (wafers only, no die/component data).
- Conflicts: 20M single-via yield 98% (Sec. III.E, abstract) vs >95% (Intro) vs 91% (Fig. 7 barrier stage); leakage "none up to 25 V" vs "<100 pA at 30 V" (both entered).
- Not reported: pad/via diameter, thicknesses, dielectrics other than SiCN, plasma chemistries, anneal profiles/ambients, bond force/temperature, wafer count.

## Candidate quality
- 18 key figures: 12 candidate, 6 manual (tcpmt Fig. 6 edge-to-page bbox; ectc51846 Fig. 2, 2(b), 5 no candidate, Fig. 7 clipped axis title). ectc51846 p05_fig12 candidate points at p.5 top-left while the Fig. 12 image is on p.4 (not used).

## Schema gaps
- No field for specific contact resistance (ohm*cm2) in interconnects; entered as metrics.
- interconnect_level lacks a direct Cu-Cu (non-hybrid) die-to-die level; used die_to_die_hybrid for IHB.
- No field for ALD/vapor-phase deposition category (used deposition_other).
