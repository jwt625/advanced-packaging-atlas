# DevLog-007: process-flow model (schema v2.4) and re-pass

Date: 2026-10-19. Status: done (2026-10-20 03:39); was planned to start after the DevLog-005 revision pass is merged (the running
revision batches hold exports with the v2.3 `process_steps` header).

## Request (Wentao, 2026-10-19 23:13)

The process-flow review proposal is approved. The goal is the process-flow information we care about, not a label
that separates papers.

## Findings it rests on

- Sources: `DevLog/audits/process_flow_review_{A,B}_2026-10-19.md`, 18 `yes` and 8 `no` papers.
- Step content is faithful: no invented steps or conditions in about 290 rows.
- Structure fails:
  - Flows copied onto sibling TVs: about 17% of 4441 rows.
  - 142 physical TVs in `yes` papers have no steps.
  - 357-368 test, inspection and preconditioning rows sit inside flows.
  - 388 `other` rows; alternative routes flattened into one seq on 44 TVs.
  - Order imposed where the paper states none.
  - Conditions mostly in free text: 8.2% of rows have temp, time or pressure.
  - `has_process_flow` behaves as "has any row" (231 yes / 8 no).

## Design (schema v2.4)

1. `papers.process_flow_level`: full | ordered | fragments | none.
   - full = an ordered fab/assembly flow for a TV with materials/conditions.
   - ordered = ordered steps with few or no conditions.
   - fragments = isolated steps or generic statements, no real sequence.
   - none.
   - `has_process_flow` stays as a derived column: yes iff full or ordered (validator-enforced).
2. New table `process_flows` (one row per distinct flow in the paper).
   - Columns: flow_id `<paper_id>-F1`, paper_id, flow_name (as the paper names it), scope (tv_build |
     generic_platform | comparison), level (full | ordered | fragments), tv_ids (TVs built with this flow),
     basis/source/locator, notes.
   - A flow is defined once and linked from every TV that uses it.
3. `process_steps` re-keyed to flows: step_id `<flow_id>-s01`, parent `process_flows`. New columns:
   - tv_id: set only for a TV-specific delta step; otherwise the step applies to all `tv_ids` of the flow.
   - route: a branch label when the paper gives alternative routes (seq restarts per route).
   - step_kind: fab | inline_inspection. Post-build reliability tests, measurements and failure-analysis cuts are
     not steps; they move to `metrics`.
   - step_basis: stated_in_flow | inferred_order | generic_description.
   - performed: used again (no = shown in a generic flow but not executed for these TVs).
   - Typed conditions: force_n, atmosphere, dose_mj_cm2, current_density_ma_cm2, ramp_c_per_min, temp_c_max
     (profile peak), split (parameter sweep on this step, e.g. "NA 0.12/0.16/0.18/0.24").
   - New step_category values: bumping, rdl_layer, degas, descum, carrier_prep.
4. Rule 7 rewrite (SKILL.md, BATCH_INSTRUCTIONS.md):
   - A step changes the build. Never write a step that only restates a structure.
   - Split a composite step when a figure gives a finer order.
   - Stated dimensions and named tools go on the step.
   - Record input and result thickness.
   - Every package / test_coupon / sub_assembly TV either links a flow or lists `process_steps` in `not_reported`
     with that TV.

## Plan

- [x] Wait for the revision pass (DevLog-005) to merge; zip-backup `data/`.
- [x] Schema v2.4 + validator:
  - level/flag consistency;
  - flow tv_ids are TVs of the paper;
  - step parent flow;
  - delta tv_id within the flow's tv_ids;
  - every physical TV linked or listed as not reported (warning);
  - typed-column units.
- [x] Mechanical conversion script (`scripts/convert_flows.py`, dry-run + diff report):
  - cluster identical step sequences across sibling TVs into one flow with tv_ids;
  - keep differing steps as deltas;
  - parse typed conditions out of `conditions` only where unambiguous (rest left to agents);
  - flag test/inspection rows and structure-only rows for agent review.
- [x] Rule 7 rewrite in SKILL.md / BATCH_INSTRUCTIONS.md.
- [x] Pilot agent re-pass on the 18 reviewed papers; their review miss lists are the expected diffs. Coordinator
      check, then rule adjustments.
- [x] Full agent re-pass on all `yes` papers (export -> revise -> validate -> `merge --replace`, 7 agents max).
  - Grade process_flow_level.
  - Move tests to metrics.
  - Link sibling TVs and fill missing flows.
  - Fill typed conditions and add the missing steps/conditions from the paper.
- [x] `no` papers: quick confirmation pass (8 papers).
- [x] Fresh-context audit sample (about 20 papers, stratified), fixes, DevLog results.

## Progress

- 2026-10-20 01:16: the revision pass (DevLog-005) is merged and the 3D fix pass is done, so data/ is
  free. Schema v2.4 + converter agent launched, staging only (`data/_staging/flow_v24/`); the coordinator
  applies after review. Scope:
  - schema/validator, export/merge round trip;
  - `scripts/convert_flows.py` (cluster sibling flows, deltas, typed-condition parsing, flagged test and
    structure rows, provisional levels);
  - build_views projection + minimal app compatibility;
  - rule 7 update.
- 2026-10-20 01:34: schema v2.4, validator, converter, build_views and rule 7 done; output staged in
  `data/_staging/flow_v24/` (not applied; data/ unchanged).
  - Schema: `papers.process_flow_level` (required; `has_process_flow` derived); table `process_flows`
    (parent papers); `process_steps` keyed to flows. New step columns: flow_id, tv_id (delta), route,
    step_kind, step_basis, temp_c_max, ramp_c_per_min, force_n, atmosphere (enum), dose_mj_cm2,
    current_density_ma_cm2, split. flow_name moved to the flow. 5 new step_category values. Rule (n).
  - Validator checks: level/flag; level none = no flows, full/ordered = at least one flow; flow tv_ids
    in the paper; delta tv_id in tv_ids; (route, seq) unique per TV and flow (error); typed-column
    ranges (warning). Uncovered physical TVs of full/ordered papers give a warning unless
    not_reported has "process_steps: <tv_id> ...". Negative tests: every check fires.
  - merge_staging/export_paper: rows resolve to their paper via flow_id. The merge dry run no longer
    creates missing data/ tables (only --apply does).
  - Converter results:
    - 4441 -> 3956 rows: 485 folded, 183 TV deltas (25 of them identical on 2+ TVs of a flow).
    - 478 flows, 43 of them on more than one TV.
    - Every TV's projection equals its old rows (550/550 segments); evidence edits are step-id
      tokens only (91 files).
    - Provisional levels: full 98, ordered 125, fragments 8, none 8. The rule agrees with 17 of the
      18 review grades.
    - has_process_flow yes -> no: 8 papers.
    - 125 physical TVs are in no flow.
    - Flags: test 106, preconditioning 10, inspection 207, structure_only 11, other 334.
    - Details in `flow_v24/CONVERSION_REPORT.md`.
  - Validation and merge tests:
    - `validate_db --staging flow_v24`: 0 errors, 125 warnings (the uncovered TVs).
    - `merge_staging flow_v24 --replace` dry run: 0 conflicts.
    - Round trip in a scratch copy (apply, export 4 papers, merge --replace): 0 row differences.
  - build_views: each TV gets shared + delta steps of its flows, ordered by (flow, route, seq). Adds view
    columns flow_name and delta, plus `papers[].process_flows`, `process_flow_level` and the counts.
    Falls back to tv_id grouping without process_flows.csv. Projected per-TV step counts match v2.3 for
    all 769 TVs.
  - App: types only, plus `flow_id` hidden in the drawer. `pnpm check` 0 errors; `pnpm build` ok.
  - TEMPLATE regenerated (adds process_flows.csv; org_sites.csv picks up locality_variants from the
    current schema).
  - Next: coordinator review and apply (zip-backup data/ first), `pnpm data`, then the pilot agent
    re-pass.
- 2026-10-20 01:35: schema/converter agent finished (its 01:34 entry above).
  - Coordinator check: the staged output validates (0 errors, 125 uncovered-TV warnings). An independent
    projection check found 0 TVs whose step multiset differs between v2.3 rows and the v2.4 flow projection.
- 01:36: applied (zip backup `cache/backups/data_before_flow_v24_*`): `merge_staging data/_staging/flow_v24
  --replace --apply`.
  - data/process_flows.csv 478 flows; process_steps 4441 -> 3956 rows (485 sibling copies folded into shared
    flows, 183 TV deltas).
  - Provisional levels: full 98 / ordered 125 / fragments 8 / none 8.
  - has_process_flow yes -> no on 8 papers (00125, 00093, 00110, 00365, 10457909, 9830182, itherm 9190542,
    00019).
  - Validator 0 errors, 125 warnings.
- Coordinator decisions on the agent's open questions:
  1. Add `process_steps.thickness_in_um` (input thickness). Done; rule 7 updated; existing rows empty.
  2. The max-process-temperature headline uses max(temp_c, temp_c_max). Done in build_views.
  3/4/8. Mixed flow names, routes vs sequential sub-flows, and scope are left to the re-pass agents.
  5. "no" papers graded fragments by the reviews: the re-pass agents decide whether to add fragment flows.
  6. full vs ordered: the agents regrade.
  7. No open v2.3 staging batches remain.
- atlas.json rebuilt (8.81 MB, 0 warnings).
- 01:38: pilot re-pass launched (workflow `wf_6bf66b35-905`, 4 workers).
  - Batches p000-p003: the 18 reviewed yes papers + ectc51909.2023.00091 and ectc51906.2022.00008.
  - Contract: `data/_staging/REPASS_INSTRUCTIONS.md`; per-paper expected diffs = the review miss lists.
- 01:53: pilot finished (workflow `wf_6bf66b35-905`, 4/4 batches, 0 errors each).
  - Per-paper review misses are reported fixed (one marked not applicable, with reason).
  - Levels: 00321 full -> ordered (no temp/time/pressure anywhere); 00091 and 00008 none -> fragments (fragment
    flows added); the rest unchanged.
  - Flows split/merged per figure; tests moved to existing metrics; every physical TV covered or not_reported.
  - Merged (backup `cache/backups/data_before_repass_pilot_*`): 0 errors; uncovered-TV warnings 125 -> 112.
- Coordinator error caught by a pilot agent: the contract gave A/dm2 -> mA/cm2 as x100; the correct factor is
  x10.
  - Fixed in REPASS_INSTRUCTIONS.md.
  - Checked all current_density_ma_cm2 values in data/ and the pilot: only 1 A/dm2 -> 10 mA/cm2 was converted
    (correct); the converter did not convert A/dm2.
- Conventions added to the contract from pilot issues:
  - flows numbered in build order;
  - shared post-branch steps in their own flow;
  - `target` = stated geometry only;
  - per-variant values in `split`;
  - never renumber step/flow ids;
  - carrier_prep allowed for a step (1) in the paper's flow figure.
- Template coupling: 5 3D templates referenced v2.3 step ids.
  - Re-pointed via `flow_v24/id_map.csv` (10 refs).
  - `build_package3d.py` resolves shared steps through their flow for the family check.
  - Re-pass manifests list the 10 template-referenced step ids as protected.
- 01:53: full re-pass launched (workflow `wf_6dfe678c-290`, 7 workers).
  - 44 batches q000-q043, 219 papers; levels mixed round-robin across batches.
- 02:44: full re-pass finished (workflow `wf_6dfe678c-290`, 44/44 batches, 0 failed).
  - Coordinator pre-merge checks: every batch validates; figures, author_affiliations, electrical and optical
    interfaces unchanged; all 10 template-protected step ids present.
  - Merged with `--replace` (backup `cache/backups/data_before_repass_full_*`).
  - One sanity warning: ectc51529.2024.00311-F1-s08 ramp 6000 C/min, which is correct (p.3 text "ramped with
    100 C/s", TCB bond head). The validator ramp range is widened to 60000 C/min.
  - data/: 0 errors, 0 warnings; uncovered-TV warnings 112 -> 0. package3d --check ok (23 families);
    atlas.json 9.47 MB, 0 warnings.
- Result (all 239 papers re-passed, schema v2.4):

  | item | value |
  |---|---|
  | process_flow_level | full 85 / ordered 133 / fragments 15 / none 6 |
  | has_process_flow | yes 218 / no 21 |
  | flows | 489 (tv_build 445, generic_platform 32, comparison 12); 112 shared by 2+ TVs |
  | steps | 3812 (v2.3: 4441): fab 3728, inline_inspection 84; step_basis stated 3296 / inferred_order 188 / generic 171 / empty 157 |
  | deltas / routes / splits | 180 / 90 / 271 |
  | typed columns | temp_c 226, time_s 176, thickness_um 332, thickness_in_um 31, atmosphere 53, pressure_mpa 33, force_n 19, temp_c_max 12, dose 10, current density 10, ramp 7 |
  | category other | 178 (v2.3: 388); test/inspection/preconditioning categories 84 (all inline_inspection) |
  | metrics | 5998 rows |

  - Loss check (coordinator): every v2.3 temp_c/time_s/pressure_mpa value still exists in the same paper (step or
    metric). The one apparent miss (0.13 Pa evacuation) is present as 1.3e-07 MPa on F1-s14 (the check's regex
    missed scientific notation).
  - Steps with temp/time/pressure/force: 287 now vs 365 in v2.3; the difference is the folded sibling copies and
    the reliability tests moved to metrics.
- 02:44: fresh-context audits launched on 22 re-passed papers (not the pilot), stratified 8 full / 8 ordered /
  3 fragments / 3 none (seed 20261020); output `DevLog/audits/process_flow_audit_{A,B}_2026-10-20.md`; B adds DB-wide
  checks.
- 02:55: audits A/B of the re-pass finished (`DevLog/audits/process_flow_audit_{A,B}_2026-10-20.md`).
  - Content is faithful: 0 invented, 0 information lost, 0 uncovered TVs, 0 tests left as steps, 1 wrong value in
    172 steps (B); paper level grades 10/11 (A) and 11/11 (B) agree with the auditors.
  - Remaining defects are structural:
    - Flow build order is not modelled: 77 TVs / 52 papers rely on flow numbering; 00218 shows RDL after
      assembly.
    - Alternative routes stored as separate flows (3).
    - Identical deltas copied across TVs (50 rows / 22 groups).
    - Stated targets missing from steps (about 7% of rows in the A sample).
    - Temperatures only in `split` (typed column empty).
    - full/ordered inconsistent (9 full papers with no typed condition; 00227 the reverse).
    - Generic intro text marked stated_in_flow (ectc.2011.5898527).
    - 5 split misuses; 1 missing step and 1 misread value (tcpmt.2025.3628798 F7, iedm45741 233 vs 240 C).
- Plan (coordinator):
  - (A) schema v2.5 + mechanical fixes + per-paper fix list (one agent, staged in `data/_staging/flow_v25/`):
    build_seq, multi-TV deltas, delta folding, new validator warnings, rule 7 additions.
  - (B) a targeted agent pass only on papers in the fix list.
  - A started 02:55.
- 03:10: (A) schema v2.5 + mechanical fixes + fix list done; staged in `data/_staging/flow_v25/` (not applied; data/
  unchanged).
  - Schema v2.5 (additive):
    - `process_flows.build_seq` (int, required on every flow, >= 1): order of the flow in its TVs' build. Ties only
      for parallel independent sub-flows whose notes both say "parallel".
    - `process_steps.tv_id` is a `;` list: a delta may apply to several TVs of its flow.
    - Rule (n) adds: tv_ids of generic_platform flows = TVs the flow is shown for; of comparison flows = TVs it is
      compared against. It also states the full-needs-typed-condition test, split vs route, and temp_c_max for
      temperature splits.
  - Validator:
    - Errors: each delta TV must be in the flow's tv_ids; duplicates; build_seq < 1. (route, seq) uniqueness is
      checked per listed TV.
    - New warnings (`flow_v25_issues`, shared with the fix script): split_temp_untyped, full_without_typed_condition,
      identical_delta_text, target_no_number, equal_build_seq.
    - Negative tests: every new check fires, and the "parallel" note suppresses equal_build_seq.
    - data/ now reports a missing build_seq on all 489 flows until flow_v25 is applied.
  - `scripts/fix_flows_v25.py` (deterministic, dry run by default):
    - build_seq defaults to the flow number (489/489 flows).
    - Folds delta rows that are identical except step_id, tv_id and locator (locators are unioned): 31 rows in 14
      groups -> 14 rows (17 folded away, 9 papers). process_steps 3812 -> 3795.
    - Rows whose notes or values differ stay unfolded: 9 identical_delta_text warnings remain for agents.
    - No renumbering. Folded-away ids are in `fold_map.csv` and in evidence `revisions` (source flow_v25): 31 lines
      in 9 files. No entries/derived/conflicts referenced them, so 0 references were rewritten.
    - No 3D-template step id was folded.
  - Staged checks:
    - Independent per-TV projection check: 552/552 TVs identical. Only the step ids and locators of folded rows
      differ.
    - All other tables are identical copies; flows are identical apart from build_seq.
    - `validate_db --staging flow_v25`: 0 errors, 45 warnings (split_temp_untyped 16, target_no_number 11,
      full_without_typed_condition 9, identical_delta_text 9; equal_build_seq 0).
    - `merge_staging flow_v25 --replace` dry run: 0 conflicts.
  - Fix list (`flow_v25/fix_list.csv`, 931 rows; `fix_papers.csv`, 188 papers):
    - Sources: audit A 29, audit B 56, validator 45, script 813. Rows are deduplicated on (paper, row, issue);
      sources are joined.
    - Largest types:

      | issue type | rows | papers |
      |---|---|---|
      | target_missing (script) | 411 | 111 |
      | category_other | 177 | 93 |
      | target_missing_preexisting (device/core/carrier thickness) | 139 | 60 |
      | build_seq_unverified (only papers with another issue) | 69 | 45 |
      | untyped_condition | 33 | 25 |

    - Paper scope by filter:
      - without target_missing_preexisting and build_seq_unverified: 180 papers;
      - also without target_missing: 137;
      - also without category_other: 65.
  - build_views:
    - Flows are sorted by (build_seq, flow number), steps by (route, seq). build_seq falls back to the flow number.
    - Delta tv_id lists are matched; `papers[].process_flows[].build_seq` is added.
    - Scratch build from the staged data: 769/769 TVs have the same step order and count as the base.
  - build_package3d: the family check accepts multi-TV deltas; `--check` ok (23 families) on both base and staged
    data.
  - App: `build_seq` added to the ProcessFlow type only. `pnpm check` 0 errors; `pnpm build` ok;
    app/static/data not regenerated.
  - Rules: SKILL.md rule 7, REPASS_INSTRUCTIONS.md (v2.5 additions block) and BATCH_INSTRUCTIONS.md (one bullet)
    updated. TEMPLATE/process_flows.csv now has build_seq.
  - Open for the coordinator:
    1. The audit's proposed categories device_fab, ion_exchange and laser_modification are not in schema v2.5;
       the fix list marks them "keep other".
    2. Build-order inversions stated in flow notes are not applied mechanically. They are in the fix list as
       build_order_note: iedm19573.2019.8993637-F2 and ectc51846.2026.00024-F4.
    3. 8 multi-flow TVs in papers without any other issue keep the default build_seq and are not listed.
- 03:12: v2.5 agent finished (its 03:10 entry above). Applied (backup `cache/backups/data_before_flow_v25_*`):
  - build_seq on all 489 flows (default = flow number);
  - multi-TV deltas, with 17 identical delta rows folded (3812 -> 3795 steps);
  - validator warnings: split_temp_untyped 16, target_no_number 11, full_without_typed_condition 9,
    identical_delta_text 9;
  - rule 7 / REPASS_INSTRUCTIONS additions.
  - Validator 0 errors / 45 warnings; package3d --check ok.
- Coordinator decisions on the agent's questions:
  1. step_category += device_fab, ion_exchange, laser_modification (audit B proposal), so pass B can use them.
  2. build_seq set from explicit flow notes: iedm19573.2019.8993637 F2 -> 1 (then F1, F3); ectc51846.2026.00024
     F4 -> 1 (then F1, F2, F3).
  3. The 8 multi-flow TVs in papers without other issues keep the default build order.
- 03:12: pass B launched (workflow `wf_a9296e5e-e4d`, 7 workers).
  - 36 batches v000-v035, 180 papers: every fix_papers.csv paper except those whose only items are
    target_missing_preexisting / build_seq_unverified.
  - Each manifest lists the paper's fix_list items plus the protected 3D-template step ids.
- 03:38: pass B finished (workflow `wf_a9296e5e-e4d`, 36/36 batches, 0 failed).
  - Coordinator pre-merge checks: 0 errors and 0 warnings in every staged batch; figures/affiliations/interfaces
    unchanged; all protected 3D-template step ids present.
  - Merged with `--replace` (backup `cache/backups/data_before_passB_*`). data/: 0 errors, 0 warnings (all 45 v2.5
    warnings resolved).
  - package3d.json regenerated (23 families, --check ok); atlas.json 9.56 MB, 0 warnings.
- Final state (2026-10-20 03:39):

  | item | value |
  |---|---|
  | process_flow_level | full 77 / ordered 141 / fragments 15 / none 6 |
  | flows / steps | 486 / 3812 |
  | steps with a numeric target | 597 |
  | category other | 72 (v2.3: 388) |
  | steps with a typed process condition | 342 |
  | temp_c / temp_c_max / time_s / pressure / force / atmosphere | 229 / 25 / 174 / 34 / 19 / 56 |
  | thickness_in_um / thickness_um / split | 45 / 360 / 274 |

- [x] Fresh-context audit sample (22 papers: audits A/B 2026-10-20), fixes (v2.5 + pass B), DevLog results.
