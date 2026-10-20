# Revision report r008 (DevLog-005, decisions 1 and 3 of 2026-10-19)

Mode: audit_fix_and_figures. Audits searched (full id and short id) for each paper: audit_x1_2026-10-18, audit_x2A_2026-10-19, audit_x2B_2026-10-19.
Validator: `uv run python scripts/validate_db.py --staging data/_staging/r008` -> 0 errors, 0 warnings (also 0/0 before the edits).
Row changes are logged in each paper's `evidence/<paper_id>.yaml` under `revisions:`. Scratch crops and montages are in the session scratchpad (`r008/`), not in the repo.

| paper | row changes (outside figures) | figures before -> after |
|---|---|---|
| ectc51906.2022.00179 | 0 | 6 -> 20 |
| ectc51906.2022.00232 | 3 (1 deleted, 1 edited, papers.notes) + 1 evidence hygiene edit | 6 -> 19 |
| ectc51906.2022.00244 | 7 (4 deleted, 3 edited) | 6 -> 12 |
| ectc51906.2022.00303 | 12 (TV c notes, 11 process_steps performed=no) | 6 -> 9 |
| ectc51906.2022.00309 | 0 (audit item disputed) | 6 -> 16 |

## ectc51906.2022.00179

Audit items (x1 only; x2A/x2B do not name it):
- x1 sec. 1/8: sampled, verified OK (Fig. 2 diameters, Fig. 5 plateaus, Fig. 14, Fig. 15 (46%), Fig. 16; conflicts 46 vs 50%, TCT 970 vs 1000 cycles, reflow condition). Not applicable (no defect).
- x1 sec. 5 item 3 / sec. 6 item 8 (count semantics, "300 per chain"): schema proposal (count_scope). Not applicable as a row fix: a-i1..a-i4 notes already say "count = bumps per daisy chain".
- x1 sec. 6 item 1 (ranges such as IMC 600-800 nm): schema proposal (value_min/value_max). Not applicable; b-m1 keeps the range in value_text, statistic range.
- No sibling-identical groups listed.

Figures: added 14 (all candidate crops, opened): Fig. 2 micrograph, Fig. 3 cross_section, Fig. 5 cross_section, Fig. 6 cross_section, Fig. 7 micrograph, Fig. 8 micrograph, Fig. 9 warpage_plot (wafer bow, c-m2/m3), Fig. 10 micrograph, Fig. 11 cross_section, Fig. 12 micrograph, Fig. 17 cross_section, Fig. 18 cross_section, Fig. 19 stack_schematic, Fig. 20 micrograph.
New rank (old id in brackets): f01 Fig. 13 [f01], f02 Fig. 1 [f03], f03 Fig. 4 [f02], f04 Fig. 19, f05 Fig. 5, f06 Fig. 6, f07 Fig. 3, f08 Fig. 11, f09 Fig. 7, f10 Fig. 2, f11 Fig. 8, f12 Fig. 10, f13 Fig. 12, f14 Fig. 20, f15 Fig. 17, f16 Fig. 18, f17 Fig. 14 [f04], f18 Fig. 15 [f05], f19 Fig. 16 [f06], f20 Fig. 9.

## ectc51906.2022.00232

Audit items:
- x1 item 15 (papers.notes over 30 words): applied. papers.notes 32 -> 28 words ("TSMC FEA (ack)" dropped from the notes; the acknowledgment remains in TV d notes).
- x1 sec. 7 (non-ASCII dotless-i quote in this evidence file): applied. The source_quality line now names the character (U+0131) instead of quoting it; evidence files of this batch are ASCII-only.
- x2A/x2B: not named.

Sibling-identical metric groups (judged against p.3-p.5):
- a-m3 / b-m3 (multi-reflow failure before RDL optimization): copy. p.3 Sec. III.C: "After TV1 and TV2 underwent multi-reflow testing at 250C, package failures were observed..." stated jointly with no per-TV result. b-m3 deleted; a-m3 scope "applies to TVs a, b", note added.
- a-m4..a-m8 / b-m4..b-m8 (6x multi-reflow, MSL4, uHAST 264 h, TCG 850 cycles, HTS 1000 h, all pass): genuine per-TV values. p.5 Table V has separate TV1 and TV2 columns, each "Passed". Kept unchanged.

Figures: added 13. Fig. 2 stack_schematic (candidate), Fig. 3 package_photo + floor plan (manual, no candidate), Fig. 4 warpage_plot (candidate), Fig. 5 xray_csam (candidate), Fig. 7 simulation_result (candidate; source of c-m5), Fig. 8 top_view_layout (candidate), Fig. 9 micrograph (candidate), Fig. 10 cross_section (candidate), Fig. 11 top_view_layout (manual; candidate cut the B label), Fig. 12 top_view_layout (candidate), Table I, Table III, Table IV data_table (candidates). Existing f06 (Table V) note about the 6-figure cap removed as stale.
New rank: f01 Fig. 13 [f01], f02 Fig. 3, f03 Fig. 8, f04 Fig. 12, f05 Fig. 1 [f02], f06 Fig. 14 [f03], f07 Fig. 2, f08 Fig. 10, f09 Fig. 9, f10 Fig. 11, f11 Fig. 5, f12 Table I, f13 Table II [f04], f14 Fig. 4, f15 Fig. 6 [f05], f16 Table III, f17 Table IV, f18 Table V [f06], f19 Fig. 7.

## ectc51906.2022.00244

Audit items:
- x1 item 4 and x2B sec. 5 (copied statements on sibling TVs): applied.
  - GOhm insulation: a-m34 / b-m18 / c-m5 are a copy. p.6 Sec. III.C (220 dpi render): "For all the process options, chain A and B result insulated ... in the GOhm range". b-m18 and c-m5 deleted; a-m34 scope "applies to TVs a, b, c (all process options)".
  - 1902 n-TSVs per chain: a-m35 / b-m19 are a copy. One chain design on the test chip; the p.7 Fig. 13 caption gives one normalization count. b-m19 deleted; a-m35 scope "applies to TVs a, b (n-TSV chain design; chain data for options 1-7)".
  - 3800 n-TSVs in blocks 1-5: a-m36 / b-m20 are a copy (single p.5 Fig. 10 table, re-read: 80/320/3240/120/40, 1+2+3+4+5 = 3800). b-m20 deleted; a-m36 scope as a-m35.
  - The evidence conflicts entry on a-m35 (1902 vs 3800) still points at an existing row.
- x1 sec. 5 item 6 / sec. 6 item 7 ("copies a 23-step flow 3x"): not applied. It needs flow_id/applies_to (schema), and the task forbids restructuring flows while that decision is pending. No audit-named step defect (performed/order).
- x1 sec. 6 item 1 (box plots in value_text): schema proposal, not applicable as a row fix.
- x1 sec. 8 (Fig. 5 overlay, Fig. 6 labels, Fig. 10 counts, Fig. 13 box plots; conflicts Si 350 vs 500 nm, overlay <10 vs 12/22 nm; Ru 40% ref [7] excluded): verified OK, no change.

Figures: added 6, all manual (paper has no candidates: OCR text layer). Fig. 2 stack_schematic (concept illustration, source not stated, reprinted = no), Fig. 8 top_view_layout, Fig. 9 top_view_layout, Fig. 10 top_view_layout, Fig. 11 top_view_layout, Fig. 12 other (Raphael model geometry). Not added: Fig. 1 (ARM concept and IR-drop maps reprinted from ref [2]; not this build).
New rank: f01 Fig. 7 [f01], f02 Fig. 3 [f02], f03 Fig. 4 [f03], f04 Fig. 8, f05 Fig. 10, f06 Fig. 11, f07 Fig. 6 [f05], f08 Fig. 2, f09 Fig. 9, f10 Fig. 12, f11 Fig. 13 [f04], f12 Fig. 5 [f06].

## ectc51906.2022.00303

Audit items:
- x1 item 12 (00303-c, envisioned design under tv_kind other; proposed enum design_concept): interim fix applied. tv_kind stays `other` (no design_concept enum in v2.3); TV c notes now start "Design concept, not built (tv_kind other until a design_concept enum exists)."
- Same item, process flow of TV c: c-s01..c-s11 (proposed Fig. 5 flow, p.4 Sec. III) had performed empty on a TV that was never built. Set performed = no on all 11 with the note "Proposed flow for the unbuilt concept." The parts that were executed are already recorded on coupons d and e. Order and content unchanged.
- No sibling-identical groups listed.

Figures: added 3 (candidates, opened; each crop omits its caption). Fig. 1 stack_schematic, Fig. 6 package_photo (wafer photo + optical view), Fig. 8 micrograph (ALD parameters, top view, AFM step).
New rank: f01 Fig. 7 [f01], f02 Fig. 5 [f02], f03 Fig. 9 [f05], f04 Fig. 2 [f03], f05 Fig. 1, f06 Fig. 6, f07 Fig. 8, f08 Fig. 3 [f04], f09 Fig. 4 [f06].

## ectc51906.2022.00309

Audit items:
- x1 item 10 ("150 um C4 of 00309-a-i1/i2 typed microbump"): disputed, no change.
  - a-i1 (150 um pitch, 50 um diameter) and a-i2 (100 um pitch) are the top-die "hybrid ubump" large-bump pitches. p.2 Table 1 "Hybrid ubump diameter 50 and 30 um"; p.2 Table 2 L-L 150 / L-S 100 / S-S 45 um; p.2 Sec. II.B "two size of 50 um and 30 um micro bump".
  - They join the dies to the fanout RDL (die_to_interposer), not to the substrate.
  - The paper's C4 is a separate level, 130 um pitch Cu pillar with solder (p.2 Table 1; p.3 Sec. II.D), and is already a-i4 typed c4.
  - The audit's own proposed rule ("microbump ... or as named uBump") also keeps a-i1/a-i2 as microbump.
- No sibling-identical groups listed.

Figures: added 10. Fig. 1 top_view_layout (candidate), Fig. 2 micrograph (candidate), Fig. 3 cross_section (manual; candidate held the Fig. 2 caption tail), Fig. 5 process_flow (manual; candidate held the section heading), Fig. 6 package_photo (candidate), Fig. 8 package_photo (manual; candidate held the Fig. 7 caption tail), Fig. 11 cross_section (candidate), Fig. 13 xray_csam (T-SAM, candidate), Table 2 data_table (manual, no candidate), Table 3 data_table (manual; candidate covered only the MSL4 row).
New rank: f01 Fig. 9 [f01], f02 Fig. 4 [f04], f03 Fig. 5, f04 Fig. 1, f05 Fig. 7 [f02], f06 Fig. 10 [f05], f07 Fig. 11, f08 Fig. 3, f09 Fig. 2, f10 Fig. 8, f11 Fig. 6, f12 Fig. 13, f13 Table 1 [f03], f14 Table 2, f15 Fig. 12 [f06], f16 Table 3.

## Ranking convention used

The rank-1 figure is unchanged in all five papers. After rank 1 the order is: process flow, then layout/floorplan, then other schematics and build images (cross-sections before plain micrographs, schematics interleaved by relevance), then plots/tables. Mixed figures, i.e. data plots with SEM panels (00179 Fig. 5/6/14), stay with their dominant content: Fig. 5/6 count as cross_section and rank among the images; Fig. 14 keeps its kind (electrical_plot) and ranks with the plots. Existing rows keep their bbox, cand_id, caption and shows; only fig_id and rank changed (plus one stale note).

## Issues

- Schema gaps still open (from x1): no `applies_to` column, so the scope text carries "applies to TVs ..."; no `design_concept` tv_kind; no flow_id for flows shared by several TVs (00244 triplicated flow left as is).
- 00232 Fig. 5 (X-ray) and Fig. 7 (FEA) have empty tv_ids: the paper does not say which TV they show.
