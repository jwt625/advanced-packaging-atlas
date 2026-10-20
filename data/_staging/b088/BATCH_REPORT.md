# BATCH_REPORT b088 (2026-10-20)

Papers: 001c.129747, ectc51687.2025.00060, 001c.94484. Schema v2.5. No network, no git.

## 001c.129747 - Ultra-High Density RDL on Glass Core Substrate for Heterogenous Integration (IMAPS 2024, DNP)
- Status: distilled. process_flow_level: ordered (has_process_flow yes).
- Rows: papers 1, test_vehicles 16, components 13, stack_layers 30, interconnects 15, process_flows 2, process_steps 20,
  electrical_interfaces 8, optical_interfaces 0, metrics 8, figures 25; evidence/001c.129747.yaml.
- TVs: a fine-line RDL 300x400 mm glass panel; b PID via test; c 5-metal RDL stack on carrier glass; d CPW TEG 5 mm;
  e CPW eye model (sim); f UCIe 1.0 GSG/SSG/SSS channel model (sim); g/h/i conformal/filled/partial TGV panels
  (300x400, 510x515, 300x400 mm); j/k/l filled/conformal/partial CPW+TGV S21 coupons; m/n/o conformal/filled/partial
  TC coupons; p 550x650 mm filled panel.
- Flows: F1 "Process flow of RDL layers (Fig. 3)" tv_build ordered, tv a;c, 9 steps (adds text-stated dry etch of
  inorganic layer between Fig. 3 g and h). F2 "process flow of Glass interposer (Fig. 14)" generic_platform ordered,
  tv g;k;m (conformal builds), 11 steps (3-2 and 3-3 split into seed/litho and plate/strip/seed etch; plasma ashing placed
  after seed per text). No typed conditions anywhere in the paper.
- Figures opened: page_02-07.png; all 22 candidates (cand/*.png, contact sheets); manual re-crops of every chosen figure
  in scratch; 400 dpi zooms of Fig. 8 and Fig. 24.
- Key figures (fig_id, label, kind, source): f01 Fig. 7 cross_section manual; f02 Fig. 5 cross_section manual; f03 Fig. 2
  stack_schematic manual; f04 Fig. 3 process_flow manual; f05 Fig. 13 stack_schematic manual; f06 Fig. 14 process_flow
  manual; f07 Fig. 1 stack_schematic manual; f08 Fig. 4 package_photo manual; f09 Fig. 6 micrograph manual; f10 Fig. 15
  package_photo manual; f11 Fig. 16 package_photo manual; f12 Fig. 17 package_photo manual; f13 Fig. 25 package_photo
  manual; f14 Fig. 18 micrograph manual; f15 Fig. 19 electrical_plot manual; f16 Fig. 20 stack_schematic manual; f17
  Fig. 22 reliability_plot manual; f18 Fig. 23 reliability_plot manual; f19 Fig. 24 reliability_plot manual; f20 Fig. 11
  stack_schematic manual; f21 Fig. 10 stack_schematic manual; f22 Table 1 data_table manual; f23 Fig. 8 electrical_plot
  manual; f24 Fig. 12 simulation_result manual; f25 Fig. 9 simulation_result manual. All manual: candidates cut labels,
  axes or bottoms (cand p05_fig15 holds Fig. 14 with a wrong bbox); Fig. 5, 14, 25 and Table 1 had no candidate.
  Fig. 21 not kept (its 0.34 dB value is in Table 1).
- Judgment calls: buckets glass;panel;organic_rdl_fanout (added organic_rdl_fanout: half the paper is the RDL
  interposer on glass carrier). F2 made generic_platform because the Fig. 14 text (TGV 80 um/200 um pitch, conformal
  plating) matches no single figured build (panel g shows 150 um pitch); conflict logged. CPW/TC coupons kept as separate
  TVs per fill type (different glass thickness and via sizes). Fig. 8 insertion loss at 40 GHz (6.6 dB L/S 1.5, 3.8 dB
  L/S 3) and Fig. 22-24 resistances read off plots, approx. UCIe rows protocol ucie_a (simulated), SSS not claimed to
  pass (text names only GSG/SSG). TGV diameter = top diameter; bottom in notes.
- Not reported: process conditions, dielectric names/thicknesses, TGV forming method, filled/partial fill processes,
  TC dwell (filled/partial), sample counts, warpage, optical interfaces.
- Source problems: none (text layer fine; references 1 and 5 share a title, not used).

## ectc51687.2025.00060 - Scalability and Process Optimization in Hybrid Bonding with Fine-Pitch Interconnections (ECTC 2025, IME A*STAR / Applied Materials)
- Status: distilled. process_flow_level: ordered (has_process_flow yes).
- Rows: papers 1, test_vehicles 2, components 4, stack_layers 22, interconnects 5, process_flows 2, process_steps 22,
  electrical_interfaces 0, optical_interfaces 0, metrics 25, figures 11; evidence/ectc51687.2025.00060.yaml.
- TVs: a mTV (C2W, 3 and 5 um pads in alternate rows); b eTV (10k-link daisy chains at 6 and 10 um pitch, 1 um/2.5 um
  pitch scaling, about 600 dies/wafer).
- Flows: F1 "Schematic process flow of pre-bond component and substrate fabrication (Fig. 1)" tv a;b, 17 steps
  (Fig. 1 a-l plus text-stated wet cleans, CuBS, descum, anneal); F2 die singulation and C2W bonding, tv a;b, build_seq 2,
  5 steps (plasma dicing, backgrind to 50 um, C2W HB, post-bond anneal, C-SAM inline_inspection). Splits: resist
  PFI26/ZR8800, bond dielectric TEOS/SiCN, barrier Ta/Ti, CMP slots 9/11/12. No typed conditions stated -> ordered.
- Figures opened: page_02-05.png; all 11 candidates; manual re-crops of Fig. 6 and Fig. 8; 300-400 dpi zooms of Fig. 6,
  Fig. 10 average labels, Fig. 2(b) colour bar.
- Key figures: f01 Fig. 8 cross_section manual; f02 Fig. 5 cross_section candidate p04_fig5; f03 Fig. 4 cross_section
  candidate p03_fig4; f04 Fig. 9 cross_section candidate p05_fig9; f05 Fig. 3 cross_section candidate p03_fig3; f06 Fig. 1
  process_flow candidate p02_fig1; f07 Fig. 7 xray_csam candidate p04_fig7; f08 Fig. 6 micrograph manual; f09 Fig. 2
  warpage_plot candidate p03_fig2; f10 Fig. 10 electrical_plot candidate p05_fig10; f11 Fig. 11 electrical_plot candidate
  p05_fig11.
- Judgment calls: TEOS/SiCN and Ti/Ta treated as splits (stack rows with feature, step split), not separate TVs; all
  eTV pitches on one TV b with one interconnect row per pad/pitch; dishing per pad from Fig. 6 AFM labels (0.4/1.2/2 nm)
  over text "up to 3 nm"; 30% chain increase over abstract "more than 25%"; dishing split range from conclusion (1 nm
  protrusion to 5 nm) over abstract (-1 to +7 nm); Fig. 4 tv_ids empty (mTV/eTV not stated).
- Not reported: wafer diameter, die size, bonding/anneal temperature, force, time; layer thicknesses (except SiN
  2000 A); 2.5 um pitch electrical data; CMP parameters; electrical/optical interfaces.
- Source problems: none (IEEE institutional download stamp only).

## 001c.94484 - Solder-less Fine Pitch Copper-to-Copper Bonding (IMAPS 2023, Northrop Grumman)
- Status: distilled. process_flow_level: full (has_process_flow yes).
- Rows: papers 1, test_vehicles 1, components 2, stack_layers 7, interconnects 1, process_flows 1, process_steps 3,
  electrical_interfaces 0, optical_interfaces 0, metrics 14, figures 16; evidence/001c.94484.yaml.
- TV: a 5x5 mm Si die on 10x10 mm Si interposer (760 um each), 40 um x 7 um Cu pads at 80 um pitch, 9 chains x 400.
- Flow: F1 "process flow for bonding (Fig. 4)" tv_build full: plasma clean, formic acid vapor preconditioning
  (atmosphere other), TC bonding under vapor (temp_c_max 450 from Taguchi levels; DOE split from Table I; kgf->N in
  conditions note). No anneal.
- Figures opened: page_02-05.png; all 15 candidates; manual re-crops of Fig. 1, 2, 6, 8, 9, 13 (printed "Figure 6"),
  Table I, Table III.
- Key figures: f01 Figure 14 cross_section candidate p05_fig14; f02 Figure 6 cross_section manual; f03 Figure 7
  package_photo candidate p04_fig7; f04 Figure 4 process_flow candidate p03_fig4; f05 Figure 3 block_diagram candidate
  p02_fig3; f06 Figure 1 package_photo manual; f07 Figure 2 top_view_layout manual; f08 Figure 5 mechanical_plot
  candidate p03_fig5; f09 Table I data_table manual; f10 Figure 8 electrical_plot manual; f11 Figure 9 reliability_plot
  manual; f12 Figure 10 reliability_plot candidate p04_fig10; f13 Figure 51 reliability_plot candidate p04_fig51; f14
  Figure 12 reliability_plot candidate p05_fig12; f15 Figure 6 (p.5) reliability_plot manual; f16 Table III data_table
  manual.
- Judgment calls: tv_kind test_coupon, package_class microbump_3d (inferred, noted); Table I forces (55/500/900 kgf)
  chosen over Fig. 6 labels (550 kgf); selected bonding condition not stated so interconnect bonding_temp/force left empty;
  Taguchi shear values read off Fig. 5 as value_text; Table III resistance change unit not printed (unit left empty).
- Not reported: selected bond condition, bonding time, pad/oxide fabrication, plasma clean and formic acid parameters,
  Table III unit.
- Source problems: figure numbering errors in the source (Fig. 11 printed "Figure 51", Fig. 13 printed "Figure 6",
  Table II printed "Table III"); labels kept as printed.

## Validator
`uv run python scripts/validate_db.py --staging data/_staging/b088` -> `0 errors, 0 warnings (data/_staging/b088)`

## Schema gaps
- No step_category for a generic "cover layer"/"insulation layer formation" with unstated method (used other /
  deposition_other).
- interconnects has no bottom-diameter column for tapered TGVs/vias (bottom diameter in notes).
- Typed force column cannot hold a DOE sweep; sweep stays in split text (force_n left empty).
- No component_type for a glass carrier panel (used other).

## Audit findings and fixes (2026-10-20, ingest_audit_B)

Each finding re-checked against references/001c.129747/text.md and page renders page_02, page_03 (Fig. 7 re-cropped), page_05, page_06.

| paper | row | severity | finding | outcome | change or reason |
|---|---|---|---|---|---|
| 001c.129747 | 001c.129747-a-L03 | content_wrong | Nominal L/S 1/1 um marked measured/figure_image | fixed | basis design_target, source mixed (text + Fig. 5 caption); line/space 1/1 unchanged; only AR about 3 is a result |
| 001c.129747 | 001c.129747-F2 | structure | Flow scoped generic_platform though described as executed | fixed | scope tv_build; notes rewritten (past-tense Sec. III.A, pitch 200 vs 150 um conflict with g); tv_ids g;k;m and s01 conflict kept; conflict why text updated |
| 001c.129747 | 001c.129747-c-L02; 001c.129747-c-L03 | minor | Inorganic dielectric ordered below the fine wiring it covers | fixed | c-L03 seq 2, c-L02 seq 3 (Fig. 3(f) deposition on Cu, Fig. 7 label; matches TV a); L04/L05 unchanged |
| 001c.129747 | 001c.129747-m-m2; 001c.129747-n-m2 | minor | 'chain resistance' not stated for conformal/filled TC structures | fixed | parameter 'resistance during TC (structure not stated)'; daisy chain stated only for Fig. 24 (o) |

Revisions logged in evidence/001c.129747.yaml.

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b088` -> `0 errors, 0 warnings (data/_staging/b088)`

## Coordinator figure fix (2026-10-20): clipped candidate bboxes

A pixel scan of every candidate-bbox figure row found content continuing below the bbox bottom (figure_candidates.py clips raster images, typically by about 0.012 of page height). Each bbox below was extended to the first blank gap under the image (checked on contact sheets; captions excluded) and set to bbox_source manual, cand_id empty.

| fig_id | page | old bbox | new bbox |
|---|---|---|---|
| 001c.94484-f01 | 5 | 0.5229,0.4054,0.93,0.5492 | 0.5229,0.4054,0.93,0.5618 |
| 001c.94484-f03 | 4 | 0.18,0.0859,0.3675,0.2115 | 0.18,0.0859,0.3675,0.2242 |
| 001c.94484-f05 | 2 | 0.5394,0.5767,0.9466,0.7292 | 0.5394,0.5767,0.9466,0.7339 |
| 001c.94484-f14 | 5 | 0.0699,0.0859,0.4857,0.2701 | 0.0699,0.0859,0.4857,0.2709 |
