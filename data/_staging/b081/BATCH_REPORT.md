# Batch b081 report (2026-10-20)

Papers: 001c.147288, eptc59621.2023.10457729, 001c.74748. All distilled. Validator: `0 errors, 0 warnings (data/_staging/b081)`.

## 001c.147288 - Wafer Level Substrates with Si-Core and Hybrid Organic/Inorganic Interconnect (IMAPS 2025)
- Status: distilled. process_flow_level: full (F3 has typed tack 250 C / 15 s and anneal 240 C / 4 h, vacuum, 0 pressure).
- Rows: papers 1, test_vehicles 3, components 4, stack_layers 11, interconnects 3, process_flows 3, process_steps 13, electrical_interfaces 0, optical_interfaces 0, metrics 9, figures 5.
- TVs: a Si-core through-via wafer (Fig. 2), b dual-sided Si-Core substrate 3+3 layers (Fig. 3), c Si die Cu-Cu TCB on hybrid organic/inorganic substrate at 10 um pitch (Fig. 6).
- Flows: F1 through-via module (a;b, ordered, build_seq 1); F2 double-sided organic build-up (b, ordered, build_seq 2); F3 hybrid inorganic-on-organic layers + tack/gang-anneal Cu-Cu TCB (c, full).
- Figures opened: page_02/03/04.png; cand p03_fig2, p03_fig3, p03_fig4, p04_fig5, p04_fig6; manual re-crops of Fig. 2, 4, 5, 6 at 400 dpi.
- Key figures: f01 Fig. 2 cross_section (candidate); f02 Fig. 3 cross_section (candidate); f03 Fig. 6 cross_section (candidate); f04 Fig. 4 stack_schematic (manual, candidate cut callout labels); f05 Fig. 5 cross_section (candidate, reprinted yes: prior work [10]).
- Judgment calls: Fig. 5 values (3.9, 2.06, 0.85 um) excluded as prior work [10]; Fig. 1 (UCIe spec options) not a key figure (not this build). Si thickness 296.7 um (SEM label) chosen over caption 300 um; via length kept at caption 360 um because the 413.0 um label span is unclear (kept as metric). Fig. 2 widths (53.74, 51.91, 22.05, 58.98, 12.68 um) entered as metrics with "interpreted from label position"; other labels excluded. Thickness of TV a epoxy put in F1-s03 `split` (TV-specific). Fig. 4 concept (up to 8+8 layers, embedded devices) not attached to any TV. Formic acid clean typed atmosphere other.
- Not reported: via design diameters, laser type, fill method, build-up L/S/thickness, TCB force, die size/count, CVD temperature, reliability/warpage/electrical data.
- Source problems: none (text complete, 4 pages; reference [11] empty in source).

## eptc59621.2023.10457729 - Packaging strategies for 3D integration of Photonic and Electronic chips on a Glass substrate (EPTC 2023)
- Status: distilled. process_flow_level: full (reflow peak 260 C, 1 C/s ramp, 109 s above 220 C).
- Rows: papers 1, test_vehicles 5, components 7, stack_layers 10, interconnects 2, process_flows 3, process_steps 10, electrical_interfaces 0, optical_interfaces 2, metrics 24, figures 8.
- TVs: a SAC305 bump-height coupon on dummy Si chip (pads 50-105 um); b flip-chip Si on glass, 100 um pads; c Si epoxy-bonded on glass (Dymax OP-29); d free-form coupler FDTD model; e inverse-taper evanescent coupler FDTD model (simulation_model).
- Flows: F1 Au pads + jetted SAC305 + reflow (a;b, full); F2 flip-chip + underfill (b, ordered, build_seq 2); F3 optical epoxy bonding (c, ordered). d, e: simulation models, listed in not_reported.
- Figures opened: page_01..04.png; cand p01_fig1, p02_fig2, p02_fig3, p03_fig4, p04_fig6; manual re-crops of Fig. 4, 5, 7, 8.
- Key figures: f01 Figure 7 cross_section (manual, no candidate); f02 Figure 8 cross_section (manual, no candidate); f03 Figure 1 stack_schematic (candidate); f04 Figure 6 micrograph (candidate); f05 Figure 5 other (manual, candidate cut axis title); f06 Figure 4 other (manual, candidate cut axis title); f07 Figure 2 simulation_result (candidate, reprinted yes); f08 Figure 3 simulation_result (candidate).
- Judgment calls: bump heights for 55/60/65/70/80/90/95/105 um pads read off Fig. 5 (qualifier approx); 50/75/85/100 um from Fig. 6 labels. Gap spread: Fig. 7 label +/-0.107 um chosen over text +/-0.177 um (conflict logged). Evanescent tolerances entered as simulated although Fig. 2 is reprinted from co-author work [1] (paper states them as its simulation results). Underfill step from Introduction only (inferred_order). Bump count 196 = 14x14 (derived). Ramp 1 C/s -> 60 C/min (derived).
- Not reported: flip-chip bonder/conditions, underfill product/cure, reflow atmosphere, epoxy-sample dimensions, UV dose, numeric free-form tolerances.
- Source problems: none (5 pages; institutional download stamp only).

## 001c.74748 - Die-embedded packaging using Corning multi-layered glass (IMAPS 2022)
- Status: distilled. process_flow_level: full (F2 light cure 120 C/10 min, full cure 180 C/60 min; F3 bond 240 C).
- Rows: papers 1, test_vehicles 6, components 14, stack_layers 20, interconnects 7, process_flows 3, process_steps 28, electrical_interfaces 2, optical_interfaces 0, metrics 21, figures 11.
- TVs: a single-sided DEP single IC; b single-sided DEP dual IC; c single-sided DEP with HRS transmission-line dummy IC (28 GHz loss); d RF test module (LNA + 2 TL dummies); e double-sided DEP with TGVs; f PoP of two double-sided DEPs.
- Flows: F1 single-sided Fig. 3 flow (a;b;c;d, ordered, 14 steps, (f)/(g)/(h) panels split); F2 double-sided Fig. 8 flow (e;f, full, 13 steps); F3 PoP flip-chip bonding (f, full, build_seq 2).
- Figures opened: page_02..05.png; cand p02_fig1, p03_table1, p03_fig2, p03_fig3, p04_fig5, p04_fig6, p04_fig7, p05_fig8; manual re-crops of Fig. 1, 3, 4, 5, 6, 7, 8, 9, 10.
- Key figures: f01 Fig. 4 cross_section (manual, no candidate); f02 Fig. 9 cross_section (manual, no candidate); f03 Fig. 10 cross_section (manual, no candidate); f04 Fig. 3 process_flow (manual); f05 Fig. 8 process_flow (manual); f06 Fig. 6 package_photo (manual); f07 Fig. 1 stack_schematic (manual); f08 Fig. 2 top_view_layout (candidate); f09 Fig. 5 electrical_plot (manual); f10 Fig. 7 electrical_plot (manual); f11 Table 1 data_table (candidate).
- Judgment calls: double-sided DEP n_dies 3 from Fig. 9(b) vs abstract "two ICs" (conflict logged). Cavity depth 127-130 um from text over partly illegible Fig. 4(a) label 130.65 um. Fig. 10(b) labels 140/387/300 um entered as interpreted geometry metrics; 80 um gap and 1.27 mm clear. Table 1 development goals entered as design_target metrics (variant "development goal"); "current level (organic board)" column excluded. 0.145 dB interconnection loss as electrical_interfaces basis derived (paper's own formula). DFR removal in F1 inferred from Fig. 3(d). Glass-etch rate 2.4 um/min and 5% HF kept in conditions (no typed column).
- Not reported: TGV dimensions and drilling method, MET1/MET2 metal and thickness, passivation material, etch time/temperature, lamination conditions, PoP bond force/time, warpage, reliability.
- Source problems: none (6 pages).

## Validator output
`uv run python scripts/validate_db.py --staging data/_staging/b081` -> `0 errors, 0 warnings (data/_staging/b081)`

## Schema gaps
- No column for etch rate or etchant concentration on process_steps (kept in conditions).
- metrics has no min/max columns; ranges such as cavity depth 127-130 um go to value_text with statistic range.
- No figure_kind for a process-condition plot (reflow profile) or a geometry-vs-parameter plot (bump height vs pad size); used other.

## Audit findings and fixes (2026-10-20, ingest_audit_A)

Verified against references/001c.74748/text.md p.4-5 and 400 dpi re-crops of page_05.png (Fig. 8, Fig. 10(b)) plus re-crops of the three proposed figure bboxes.

| paper | row | severity | finding | outcome | change or reason |
|---|---|---|---|---|---|
| 001c.74748 | 001c.74748-f-i1 | content_missing | PKG-to-PKG bump width (Fig. 10(b) 140 um) only in metric f-m2; interconnect diameter empty | fixed | diameter_um = 140; overrides diameter_um:measured;diameter_um:figure_image; notes updated. 387 um kept as metric only (span ambiguous) |
| 001c.74748 | 001c.74748-f-i3 (new) | content_missing | Bottom package balls (Fig. 10(b) 300 um) had no interconnect row | fixed | Added unspecified solder_ball, diameter_um 300, measured, figure_image, p.5 Fig. 10(b) |
| 001c.74748 | 001c.74748-e-i4 (new) | content_missing | Double-sided DEP bottom solder balls (Fig. 8(f), Fig. 9(b) inset) had no interconnect row | fixed | Added unspecified solder_ball, stated, schematic, p.5 Fig. 8(f); p.5 Fig. 9(b); no dimensions |
| 001c.74748 | 001c.74748-f01 | figure | bbox clipped printed (b) panel label of Fig. 4 | fixed | bbox 0.1,0.105,0.45,0.372 (re-crop checked) |
| 001c.74748 | 001c.74748-f02 | figure | bbox clipped printed (b) panel label of Fig. 9 | fixed | bbox 0.1,0.36,0.45,0.615 (re-crop checked) |
| 001c.74748 | 001c.74748-f03 | figure | bbox clipped printed (b) panel label of Fig. 10 | fixed | bbox 0.55,0.092,0.9,0.486 (re-crop checked) |

001c.74748 interconnects now 9 rows (was 7). Revisions logged in evidence/001c.74748.yaml. No figure re-rank.

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b081` -> `0 errors, 0 warnings (data/_staging/b081)`

## Coordinator figure fix (2026-10-20): clipped candidate bboxes

A pixel scan of every candidate-bbox figure row found content continuing below the bbox bottom (figure_candidates.py clips raster images, typically by about 0.012 of page height). Each bbox below was extended to the first blank gap under the image (checked on contact sheets; captions excluded) and set to bbox_source manual, cand_id empty.

| fig_id | page | old bbox | new bbox |
|---|---|---|---|
| 001c.147288-f01 | 3 | 0.0695,0.1642,0.3305,0.2914 | 0.0695,0.1642,0.3305,0.3042 |
| 001c.147288-f02 | 3 | 0.0695,0.333,0.3285,0.4097 | 0.0695,0.333,0.3285,0.4224 |
| 001c.147288-f03 | 4 | 0.0695,0.4006,0.4775,0.5758 | 0.0695,0.4006,0.4775,0.5879 |
| eptc59621.2023.10457729-f04 | 4 | 0.1036,0.1706,0.4977,0.3749 | 0.1036,0.1706,0.4977,0.3848 |
| 001c.74748-f08 | 3 | 0.095,0.1512,0.452,0.3858 | 0.095,0.1512,0.452,0.3982 |
