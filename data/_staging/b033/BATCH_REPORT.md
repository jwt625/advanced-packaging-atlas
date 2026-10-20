# Batch b033 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b033` -> `0 errors, 0 warnings (data/_staging/b033)`.

| paper_id | status | has_process_flow | TV | comp | layers | ic | steps | ei | oi | metrics | figures (manual) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51909.2023.00266 | distilled | yes | 2 | 5 | 16 | 5 | 14 | 0 | 0 | 13 | 6 (0) |
| ectc51687.2025.00051 | distilled | yes | 3 | 8 | 0 | 5 | 12 | 0 | 0 | 3 | 5 (1) |
| eptc59621.2023.10457670 | distilled | yes | 2 | 3 | 24 | 1 | 15 | 0 | 0 | 10 | 6 (3) |

Primary buckets kept from the batch file (panel, si_bridge, si_interposer).

## ectc51909.2023.00266 - 6-Sided Die Protection for Chiplet Package with Multi-Layer RDL (ECTC 2023)
- TVs: (a) 9-die chiplet fan-out (SoC + 8 structural Si), 5-layer RDL 10/10 um, 300 mm round panel; (b) 2 um L/S line
  pattern + 6 um via SEM demo, carrying the Table I 2 um L/S design rule.
- Figures opened: page_01-05; cand p02_fig2, p03_fig7, p03_fig9, p03_tablei, p04_fig11, p04_fig13, p04_fig15;
  300 dpi re-renders of Fig. 7 and Fig. 13 (reading aids).
- Key figures: f01 Fig. 7 cross_section (candidate); f02 Fig. 2 process_flow (candidate); f03 Table I data_table
  (candidate); f04 Fig. 9 micrograph (candidate); f05 Fig. 13 warpage_plot (candidate); f06 Fig. 11 other, yield bars (candidate).
- Judgment calls:
  - Package size 16x24 mm (Abstract) vs 'Chiplet size: 11mm x 16mm' (TV list): entered 16x24, conflict logged.
  - Carrier '300mm round panel' -> carrier_format wafer_300mm, carrier_size 300; bucket kept panel (paper says panel;
    600x600 PLP is future work).
  - Fan-out stack ordered die side first (Passivation 1 next to the mold/die, UBM last).
  - Table I values are design-rule minima: entered with `ge` qualifiers. 10 um rule on TV a, 2 um rule on TV b.
  - Fig. 11 yield splits (1X/2X/3X backside laminate, thicker Si die, high/low FOR filler) entered as metrics.variant,
    not new TVs: the paper treats them as warpage-learning cycles and does not give stack details.
  - Shadow moire: text says convex, legend says 'Smiling, positive sign'; both kept in scope, values read +/-5 um.
- Not reported: SoC size, die thicknesses, RDL metal and passivation materials/thickness, ball size/pitch, Cu stud
  height, BLR sample count and criterion, measured panel warpage value.

## ectc51687.2025.00051 - EMIB-T (TSV) Advanced Packaging Technology (ECTC 2025)
- TVs: (a) EMIB-T package TV, 3 TSV bridges, 45 um D2D pitch, 77x56 mm, ~2x reticle Si (reliability, Table I);
  (b) EMIB 45 um bump pitch example (Fig. 3 flow, Fig. 5 cross-section); (c) 14-Bridge EMIB-T Package TV (photo label only).
- Figures opened: page_02-04 (pages 1 and 5 are text only, read from text.md); cand p02_fig2, p03_fig4, p04_fig5, p04_tablei;
  manual crop of Fig. 3 on p.3.
- Key figures: f01 Fig. 5 cross_section (candidate); f02 Fig. 4 process_flow (candidate); f03 Fig. 3 process_flow
  (manual, p.3 panels 3-5; panels 1-2 on p.2 left out, no candidate existed); f04 Fig. 2 stack_schematic (candidate);
  f05 Table I data_table (candidate). Fig. 1 (product collage) and Fig. 6 (roadmap) skipped.
- Judgment calls:
  - EMIB-T flow written as full sequence: Fig. 4 key steps plus the unchanged EMIB steps, per Sec. III.B 'no
    significant process difference before and after'. Underfill step taken from Sec. III.C.
  - Bump type at 45 um not named ('EMIB bridge bumps'): ic_type unspecified.
  - UCIe-A >=32 Gbps / HBM4 claims not entered as electrical_interfaces (no data; SI details deferred to ref [9]).
  - stack_layers empty: no layer stack disclosed.
- Not reported: TSV dimensions, bridge size/thickness, bump metallurgy, substrate stack, solder/underfill materials,
  reliability sample counts and criteria, PDN numbers.

## eptc59621.2023.10457670 - Through Si Interposer with 5-layer FS Cu and 2-layer BS Cu RDL (EPTC 2023)
- TVs: (a) 300 mm TSI wafer, via-first Cu TSV 10 um x 100 um, pitch 50/100 um, 5 FS 1 um Cu DD BEOL, 2 BS 3 um Cu RDL,
  Cu/Ni/Au UBM both sides; (b) BEOL-only wafer without TSV (Fig. 6 warpage reference).
- Figures opened: page_01-04; cand p02_fig1, p02_fig3, p03_fig6, p04_fig10; manual crops of Fig. 4, Fig. 5 (300 dpi)
  and Fig. 10 (400 dpi transcription, then final crop).
- Key figures: f01 Fig. 3 cross_section (candidate); f02 Fig. 1 process_flow (candidate); f03 Fig. 4 warpage_plot
  (manual: candidate was caption strip); f04 Fig. 10 electrical_plot (manual: candidate held Fig. 9 caption);
  f05 Fig. 5 warpage_plot (manual: candidate covered axis labels only); f06 Fig. 6 warpage_plot (candidate).
- Judgment calls:
  - Fig. 10 wafer map: 73 printed values transcribed; min 28.16 and max 30.78 ohm entered as measured; mean 29.44 ohm
    is own arithmetic (override value:derived, evidence derived).
  - TSV aspect ratio 10 derived (100/10).
  - Density A/B split kept as metrics.variant on TV a. Fig. 5 values in a.u. read +/-0.01.
  - TV b wafer size not restated: carrier fields left empty. TV b layers mirror the FS stack of TV a ('TSI wafers
    without TSV'), located to p.3.
  - Figs. 4 and 6 have no axis scale (AU): trends only as value_text.
- Source: text.md pages 2-4 contain only captions (figures are images); all content read from page renders.
- Not reported: interposer final thickness, BEOL/RDL line/space, dielectric materials, UBM thickness, density values,
  absolute warpage, yield percentage.

## Schema gaps
- No enum for yield/process-learning bar charts in figure_kind (used `other` for ectc51909.2023.00266 Fig. 11).
- No interconnect_level for die-pad-to-RDL Cu studs in chip-first fan-out (used `other`, ic_type cu_pillar).
- Design-rule minima (Table I) have no dedicated field; recorded as values with `ge` qualifiers.
