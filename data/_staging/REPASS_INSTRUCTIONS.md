# Process-flow re-pass instructions (DevLog-007, schema v2.5, 2026-10-20)

You revise the process-flow information of already-extracted papers. Work from the project root. Python only via
`uv run python`. No network, no git, no emoji. Never invent: every step, condition and number comes from this paper's
text, tables or figures you opened (page renders `references/<id>/figures/page_NN.png`; crop/zoom into your scratch
folder). The goal is to capture the process-flow information the paper actually discloses, completely and faithfully.

## Read first
1. `.claude/skills/packaging-distill/SKILL.md` rule 7 (binding) and workflow
2. `data/schema/packaging.schema.yaml` v2.5: `papers.process_flow_level`, `process_flows` (incl. `build_seq`), `process_steps`, rule (n)
3. `DevLog/DevLog-007-process-flow-model.md` (design) and, for context, the two process-flow reviews in `DevLog/audits/`
4. Your batch's `REPASS_MANIFEST.md`

## Inputs
`data/_staging/<batch>/` holds a full export of the papers (all tables + evidence YAML). The flows were produced by a
mechanical converter (`scripts/convert_flows.py`): identical sibling sequences were merged into shared flows, differing
steps became TV deltas, some typed conditions were parsed from `conditions`, `process_flow_level` is provisional, and
candidate test/inspection/structure-only rows are listed in `data/_staging/flow_v24/review_rows.csv`.

## Per paper
1. Read the whole text.md and open every process-flow figure / table. Grade `process_flow_level`
   (full | ordered | fragments | none) per rule 7; keep `has_process_flow` consistent (yes iff full/ordered).
2. Flows: one flow per distinct flow the paper describes (`scope` tv_build | generic_platform | comparison; `level`);
   `tv_ids` = the TVs built with it. Split flows the converter merged wrongly (e.g. two figure panels = two flows),
   merge true duplicates, use `route` for alternative routes (seq restarts per route), deltas (`tv_id` set) only for
   steps that differ for one TV. Every physical TV (package / test_coupon / sub_assembly / die_stack / wafer_level /
   panel_level) is in some flow's `tv_ids`, or listed in evidence `not_reported` as "process_steps: <tv_id> (why)".
3. Steps change the build. Post-build reliability tests, measurements and failure-analysis cuts are not steps: move
   their information to `metrics` (keep value, unit, condition, basis, source, locator; do not duplicate a metric that
   already exists) and delete the step row. In-line inspection the paper places inside the flow stays with
   `step_kind: inline_inspection`. Delete rows that only restate a structure (make sure that structure is in
   stack_layers/interconnects/components; add it there if missing and stated).
4. Completeness: add steps the paper states but the rows miss (split composite steps when a figure gives a finer
   order); put stated targets (pitch, diameter, L/S, AR), named equipment, `thickness_in_um` (input) / `thickness_um`
   (result), and conditions on the step. Typed columns: temp_c, temp_c_max, time_s, ramp_c_per_min, pressure_mpa,
   force_n, atmosphere, dose_mj_cm2, current_density_ma_cm2, `split` for a parameter sweep on that step. Unit
   conversions (kN -> N, kgf -> N x 9.80665, A/dm2 -> mA/cm2 x 10 (1 A/dm2 = 10 mA/cm2), ASD = A/dm2) keep the original in `conditions`
   and get an evidence `derived` entry with the formula. `step_basis`: stated_in_flow | inferred_order (the paper
   does not state the order) | generic_description; `performed: no` for steps shown but not executed for these TVs.
   Conventions (from the pilot, 2026-10-20):
   - Flows are numbered in build order (F1 before F2) when you create them; a later sub-flow (e.g. module-to-substrate
     attach after the module flow) is its own flow following the earlier one. Shared steps that come after a branch
     go into their own flow (routes sort shared rows first). v2.5: `build_seq` carries the order (see below).
   - `target` holds the stated geometry the step produces (pitch, diameter, L/S, AR, thickness), never object names
     ("top wafer", "CoW wafer"); move object names to `step` or notes.
   - A value that differs only by variant on the same step goes in `split` on the shared step ("UBM: A 5 um / B 3 um");
     use TV deltas only when the step itself differs or is absent for a TV.
   - Never renumber existing step_ids or flow_ids (evidence references them); new rows take the next free number and
     `seq` carries the order.
   - A wafer/substrate-provision step shown as step (1) in the paper's flow figure may stay (category carrier_prep).
   Additions (schema v2.5, from audits `DevLog/audits/process_flow_audit_{A,B}_2026-10-20.md`):
   - `full` requires at least one stated process condition in a typed column (temp_c, temp_c_max, time_s,
     ramp_c_per_min, pressure_mpa, force_n, atmosphere, dose_mj_cm2, current_density_ma_cm2); materials,
     thicknesses and tools alone are `ordered`. Applies to the paper and to each flow.
   - `split` = a parameter sweep on the same step. `route` = alternative step sequences. Alternatives on the same
     TV are routes inside one flow, not separate flows (a second tv_build flow on a TV runs after the first in the
     per-TV view). Different processes per TV are deltas, not split text.
   - When `split` holds temperatures, also set `temp_c_max` = the highest value (keep the split text).
   - `build_seq` (process_flows, required) orders a TV's flows: 1 = first; it defaults to the flow number, so set
     it when a flow with a higher number is built first (flow ids are never renumbered). Ties only for parallel
     independent sub-flows; both flows' notes then say "parallel".
   - Generic introductory or background text ("typically ...", prior art, a platform overview) is
     `generic_description`, not `stated_in_flow`, unless the paper says it was executed for its TVs (say so in notes).
   - Stated targets go on the step even when the same value is already in interconnects/stack_layers.
   - A delta's `tv_id` may list several TVs (`a;b`): one row per distinct step, never identical copies per TV.
   - `tv_ids` of a generic_platform flow = the TVs it is shown for; of a comparison flow = the TVs it is compared
     against.
5. Record every change in the paper's evidence YAML under `revisions:` ({date: 2026-10-20, source: repass, row_id,
   change, reason}); keep evidence row_id references valid.
6. Only change: papers (process_flow_level, has_process_flow, notes if needed), process_flows, process_steps, metrics
   (moved tests), stack_layers/interconnects/components (only structure facts moved out of deleted rows), evidence.
   Do not touch figures, affiliations or other papers.

## Validation and report
`uv run python scripts/validate_db.py --staging data/_staging/<batch>` until 0 errors (warnings listed in your report).
Write only inside `data/_staging/<batch>/` and your scratch folder. Agents cannot write report .md files, so return the
report in your final structured result: per paper the level (provisional -> final), flows before/after, steps
before/after, rows moved to metrics, rows deleted (structure-only), steps added, conditions added/typed, uncovered TVs
and why, and (pilot only) for each miss in the review: fixed / not applicable (why).
