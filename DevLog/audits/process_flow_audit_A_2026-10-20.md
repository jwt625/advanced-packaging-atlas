# Process-flow audit A (2026-10-20, schema v2.4 re-pass)

Fresh-context, read-only audit of the DevLog-007 re-pass on 11 papers. For each paper I read the whole
`references/<id>/text.md`, opened the process-flow / stack figures on the page renders (crops where labels were
small), and compared them with `data/papers.csv`, `process_flows.csv`, `process_steps.csv`, `test_vehicles.csv`,
moved-test `metrics.csv` rows and the `revisions:` in `data/evidence/<id>.yaml`. Pre-re-pass state was read from
`cache/backups/data_before_repass_full_20261020T024246.zip` (extracted to scratch, not to the repo). Contract:
`data/_staging/REPASS_INSTRUCTIONS.md`, SKILL.md rule 7, schema rule (n).

## Sample

| paper | level (pre -> now) | flows | steps | deltas | verdict |
|---|---|---|---|---|---|
| tcpmt.2025.3540665 | full -> full | 1 | 14 | 0 | pass; bump targets missing on steps |
| ectc51687.2025.00049 | full -> full | 2 | 17 | 0 | minor: level should be ordered |
| ectc51846.2026.00209 | full -> full | 5 | 23 | 5 | pass; 1 inferred wavelength |
| ectc.2019.00-29 | full -> full | 4 | 32 | 0 | pass; RDL targets missing on steps; 1 step_basis |
| ectc51909.2023.00268 | ordered -> ordered | 1 (was 3) | 10 | 4 | pass |
| ectc51687.2025.00323 | ordered -> ordered | 1 | 11 | 0 | pass |
| ectc51529.2024.00128 | ordered -> ordered | 1 | 9 | 0 | pass; pitch targets missing on steps |
| eptc59621.2023.10457612 | ordered -> ordered | 1 | 23 | 0 | pass; carrier alternative as split, not route |
| ectc51906.2022.00108 | ordered -> fragments | 1 | 3 | 0 | pass (regrade correct) |
| icep-iaac64884.2025.11003038 | ordered -> fragments | 1 (was 2) | 10 | 8 | minor: duplicated deltas, 4 structure-derived rows |
| ectc51529.2024.00049 | none -> none | 0 | 0 | 0 | pass |

Totals: 11 papers, 18 flows, 152 steps, 17 delta rows, 32 physical TVs (28 in papers with flows).
Re-pass deletions in the sample: 12 step rows (tests, FA cuts, probing, preconditioning-type reflows) plus 2
flows merged away (00268 F2/F3) and 1 merged (icep F2).

## Error rates by defect type

| # | defect type | count / denominator | rate | examples (row ids, locators) |
|---|---|---|---|---|
| 1 | paper level grade wrong | 1 / 11 papers | 9% | 00049 graded full; no temperature, time, pressure, dose or force anywhere in the paper (only "formic acid atmosphere", p.3 Sec. II.C). Pilot rule (00321 full -> ordered) makes it ordered. |
| 2 | flow level grade inconsistent | 3 / 18 flows | 17% | 00049 F1, F2 full (no conditions); 00209 F2 ordered although s03 carries 250 C / 60 min (p.4 Sec. VII) while F1 with the same kind of content is full |
| 3 | flow structure (route vs split, mixed builds, duplicated deltas) | 3 / 18 flows | 17% | icep F1: 8 delta rows for 3 distinct statements (s03=s04, s05=s06=s07=s08, s09=s10); eptc F1-s11/-s20: glass vs Si carrier with different debond methods (laser release vs mechanical shim-cutting, p.2 Fig. 3(l), p.3 Sec. II) put in `split` instead of `route`; 00049 F1-s14 Si-substrate SAP pads (a parallel component build, p.2 Sec. II.B) inside the bridge flow |
| 4 | physical TV not covered | 0 / 28 | 0% | 00209 c, d, f and 00049 b gained flows; eptc b listed in not_reported |
| 5 | test / measurement / FA left as step | 0 / 152 steps | 0% | remaining inline_inspection rows are legitimate in-flow inspection: 00268 F1-s08 AOI after seed etch (p.3 Sec. 2), 00128 F1-s07 post-bond CSAM (p.4 Sec. IV.B) |
| 6 | structure-only / structure-derived step | 4 / 152 | 2.6% | icep F1-s05..s08 "build-up lamination with outer Cu layers to 1-2-1": the paper only says Samples 3/4 "are four-metal-layers substrate" (p.1 Sec. II, Fig. 1/2); no lamination is stated for them (it is for Sample 2, p.2 Sec. III) |
| 7 | missing step | 0 / 152 | 0% | none found against Fig. 2 (00049), Fig. 6/20 (00-29), Fig. 2/3 (eptc), Fig. 4 (00323), Sec. II (tcpmt), Sec. IV-VII (00209) |
| 8 | stated target/geometry not on the step | 4 / 10 papers with steps (~11 rows) | 40% of papers, ~7% of rows | tcpmt F1-s05..s07: 5x5 um bumps, 15 um pitch (p.1 Sec. I); 00-29 F2-s06/-s08/-s13/-s14: 8/8 um L/S, ~10 um via, 5 um RDL target (p.2 Sec. II.A), F2-s03 openings 10-200 um sit in notes; 00128 F1-s02/-s03: 0.64/0.48/0.36 um pitch (p.3 Sec. III.A); eptc F1-s02/-s03: heater/sensor line width 200/20 um (p.1). All values exist in interconnects/stack_layers, so nothing is lost, but flow retrieval misses them. |
| 9 | stated thickness only as text | 2 rows | 1.3% | 00-29 F2-s05/-s12 Ti/Cu seed "Ti 1 kA / Cu 1 kA" in `target`, thickness_um empty (stack_layers has 0.1 um) |
| 10 | typed condition only in `split` | 3 / 152 | 2% | tcpmt F1-s13 bond 170/150 C (temp_c and time_s cleared by the re-pass, now only in split; interconnect a-i1 still has 170 C / 300 s); 00108 F1-s03 press cure 150/180 C; 00209 F4-s02 500 C/250 C. DB-wide: at least 16 steps carry temperatures only in `split`. |
| 11 | step_basis wrong | 1 / 152 | 0.7% | 00-29 F2-s16 dielectric #3 (final passivation) is `stated_in_flow`, but its position is not in Fig. 6 or Sec. III.A; only its role is stated (p.7 Sec. V.A). Should be inferred_order. |
| 12 | value not in the paper | 1 / 152 | 0.7% | 00209 F1-s01 conditions "1064 nm": the text gives no wavelength, only the product names "DIADEM 1064-10" and "LMH-10X-1064" (p.2 Sec. IV) |
| 13 | unit conversion / derived entry error | 0 | 0% | time conversions on tcpmt F1-s08 (9 min), 00209 F1-s05/-s09 have derived entries; tcpmt's stale time_s derived entry was removed with the value |
| 14 | information lost by deletion/move | 0 / 12 deleted rows checked | 0% | content found in metrics: tcpmt a-m1, a-m17..m21; 00-29 a-m15, b-m5.., c-m3..; 00323 a-m4..m9; 00128 a-m3/m4 (probing method moved into `condition`), a-m6 (new FA row); 00209 d-m1/d-m2/e-m1; 00108 a-m23..m29, a-m32; 00268 b-m8 |
| 15 | dangling evidence references | 0 | 0% | all entries/derived/conflicts row_ids resolve; all metric ids cited in revisions exist |

No invented steps or conditions. Step order, materials, thicknesses and named equipment match the figures in all 10
papers with steps.

## Ranked defects and fixes

1. **Targets not carried onto the step (4 papers, ~11 rows).** The contract's "stated targets on the step" is the
   most-missed item. Fix: tcpmt F1-s05..s07 target "5x5 um bump, 15 um pitch"; 00-29 F2-s06/-s13 "L/S 8/8 um",
   F2-s03/-s11 "via ~10 um; openings 10-200 um", F2-s08/-s14 design 5 um (keep 7 um UBM plating as is, note the
   5 vs 7 um difference); 00128 F1-s02/-s03 "0.64 / 0.48 / 0.36 (0.33x0.4) um pitch"; eptc F1-s02/-s03 "heater
   200 um / sensor 20 um line width". Mechanical aid: for each flow, list interconnect/stack_layers pitch, L/S and
   diameter values of its TVs that do not appear in any step `target`.
2. **Full vs ordered boundary applied inconsistently (1 paper, 3 flows).** 00049 (and its F1, F2) -> ordered. 00209
   F2 -> full (sinter 250 C / 60 min typed) or state in rule 7 that a flow-level grade can be lower than the paper
   grade only when the flow itself lacks conditions. Add one sentence to rule 7: "full requires at least one stated
   process condition (temperature, time, pressure, force, dose, current density, atmosphere with a value);
   thicknesses and materials alone are ordered".
3. **Identical deltas copied across TVs (icep: 8 rows for 3 statements; DB-wide 50 rows in 22 groups).** This is
   Pattern D reappearing one level down, because `tv_id` on a delta takes one TV. Fix options: (a) allow `tv_id` as a
   `;` list on delta rows (validator: subset of the flow's tv_ids), or (b) model stack-up stages as routes or as
   separate flows with two tv_ids each (glass + organic). For icep, (b) gives 3 flows x 2 TVs or 1 flow with
   routes "Sample 2" / "Sample 3-4" / "Sample 4".
4. **Structure-derived pseudo-steps in fragments papers (icep F1-s05..s08).** The 1-2-1 build-up rows restate the
   stack-up; delete them and keep the stack in stack_layers (Fig. 1/2), or keep one generic row
   "four-metal-layer substrate fabricated at panel level" for Samples 3/4. F1-s01 "2-metal-layer core" for Samples 3/4
   is also inferred from the structure; say so in notes.
5. **Typed temperature lost when a value moves into `split` (3 sample rows, >=16 DB-wide).** tcpmt F1-s13 lost
   temp_c 170 / time_s 300 in the re-pass, so a max(temp_c, temp_c_max) over its steps now gives 100 C (F1-s08) instead of 170 C (build_views
   headline not checked).
   Fix: when every variant has a numeric value, also set `temp_c_max` (= highest split value) and keep the split
   text; or add a validator warning "split has a temperature, temp_c and temp_c_max empty".
6. **Alternative routes put in `split` (eptc F1-s11, -s20).** Glass vs Si carrier changes the debond step (laser
   release vs mechanical shim-cutting). Use `route` glass / Si for s11..s20 differences, or keep split but restrict
   split to parameter sweeps in rule 7 wording (it already says so; agents stretch it).
7. **Small items.** 00-29 F2-s16 -> inferred_order with a note; 00209 F1-s01 drop "1064 nm" or mark it as read from
   the product name; 00-29 F2-s05/-s12 thickness_um 0.1 (Ti, Cu each; keep the kA text in conditions with a derived
   entry); 00049 F1-s14 into its own flow ("Si substrate pads, SAP", tv_ids a;b), noting the order vs the bridge flow
   is not stated.

## Comparison with the 2026-10-19 review patterns

| 2026-10-19 pattern | status in this sample |
|---|---|
| A. binary flag mixes fragments with flows | fixed. 00108 and icep regraded ordered -> fragments, `has_process_flow` no; 00049 none correct. Residual: the full/ordered boundary (defect 2). |
| B. tests / inspection / preconditioning as steps | fixed. 0 of 152 rows; 12 deletions verified in metrics; inline inspection kept only where the paper puts it in the flow. |
| C. structure-restating pseudo-steps | mostly fixed. 4 structure-derived rows remain in one fragments paper (icep). 00-29 F1-s01 (solder-cap reflow) was correctly reworded from a structure row into the stated reflow (p.3 Fig. 5). |
| D. flow copied per TV | fixed at flow level (00268 F2/F3 folded into F1 as exposure deltas; 00049 assembly folded into one F2 for a and b; icep F2 folded). Recurs at delta level (defect 3). |
| E. sibling TV without a flow | fixed. 0 uncovered physical TVs; 00209 c/d/f and 00049 b now linked; eptc b correctly in not_reported. |
| F. conditions/splits on the wrong TV | fixed. Per-TV values are in split with TV labels (00049 F1-s09, F2-s02) or in deltas (00268 F1-s03/-s09/-s10). None misplaced. |
| G. missing steps/conditions | steps: fixed (0 missing; 00-29 gained RDL #2 degas, descum and seed etch from Fig. 6(e) and Sec. IV.D; eptc split the multi-step etch and the in-situ degas / Ar clean from Sec. I and III). Targets: still missed (defect 1). |
| H. conditions forced into free text | improved. ramp (tcpmt), atmosphere (tcpmt air, 00049 other), dose (00-29 160 mJ/cm2), temp_c_max (00-29 260 C) are typed. Residual: temperatures only in split (defect 5). |
| I. performed / flow source unused | fixed for step_basis (152/152 set; inferred_order used with notes on 00209 F1-s03, 00049 F1-s14, 00323 F1-s06, 00-29 F3/F4); `performed` is empty except 00323 (all yes), which is acceptable since no generic-not-executed steps occur in the sample. |
| B5. order imposed where none stated | fixed via inferred_order + notes (above). |
| B7. platform-generic flow vs TV build | fixed. 00108 rows are generic_description fragments; 00323 Fig. 3 prior-work flow correctly not entered. |
| B9 / A. invented content | still 0 invented steps; 1 inferred value (defect 12). |

## Recommendations

1. Run a mechanical target-gap pass (defect 1): per flow, interconnect/stack_layers pitch, L/S, diameter and
   thickness values of its TVs that appear in no step `target`/`thickness_um`; agents fix only the flagged rows.
2. Tighten rule 7 / REPASS_INSTRUCTIONS with one line each: the full-vs-ordered condition test (defect 2); split is
   for parameter sweeps, route for alternative step sequences (defect 6); when a split carries temperatures, set
   `temp_c_max` (defect 5).
3. Schema: allow a `;` list in delta `tv_id` (or document routes per stage) and fold the 50 duplicated delta rows
   (22 groups) mechanically, as was done for sibling flows.
4. Validator warnings: split mentions a temperature but temp_c/temp_c_max empty; paper `full` with no typed
   condition on any step; a delta step text identical on 2+ TVs of a flow.
5. No re-pass needed for structure, tests, coverage or information loss: all three were clean in this sample.
