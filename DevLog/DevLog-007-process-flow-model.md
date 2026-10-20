# DevLog-007: process-flow model (schema v2.4) and re-pass

Date: 2026-10-19. Status: planned; implementation starts after the DevLog-005 revision pass is merged (the running
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

- [ ] Wait for the revision pass (DevLog-005) to merge; zip-backup `data/`.
- [ ] Schema v2.4 + validator:
  - level/flag consistency;
  - flow tv_ids are TVs of the paper;
  - step parent flow;
  - delta tv_id within the flow's tv_ids;
  - every physical TV linked or listed as not reported (warning);
  - typed-column units.
- [ ] Mechanical conversion script (`scripts/convert_flows.py`, dry-run + diff report):
  - cluster identical step sequences across sibling TVs into one flow with tv_ids;
  - keep differing steps as deltas;
  - parse typed conditions out of `conditions` only where unambiguous (rest left to agents);
  - flag test/inspection rows and structure-only rows for agent review.
- [ ] Rule 7 rewrite in SKILL.md / BATCH_INSTRUCTIONS.md.
- [ ] Pilot agent re-pass on the 18 reviewed papers; their review miss lists are the expected diffs. Coordinator
      check, then rule adjustments.
- [ ] Full agent re-pass on all `yes` papers (export -> revise -> validate -> `merge --replace`, 7 agents max).
  - Grade process_flow_level.
  - Move tests to metrics.
  - Link sibling TVs and fill missing flows.
  - Fill typed conditions and add the missing steps/conditions from the paper.
- [ ] `no` papers: quick confirmation pass (8 papers).
- [ ] Fresh-context audit sample (about 20 papers, stratified), fixes, DevLog results.
