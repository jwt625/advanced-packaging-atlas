# DevLog-004: papers.has_process_flow

Date: 2026-10-19. Follows DevLog-003 (retrieval).

## Request (Wentao, 2026-10-19)

Add the explicit decision field for whether a paper has process/flow information.

## Definition

- `papers.has_process_flow`: `yes` | `no` (schema enum `yes_no`, optional column).
- `yes`: the full text describes an ordered fabrication/assembly flow, or discrete process steps, for at least
  one test vehicle. This requires at least one `process_steps` row.
- `no`: the paper only reports the finished stack, structure or results. `process_steps` stays empty and
  `process_steps` is listed in `evidence.not_reported`.
- Set the field for every `source_status=full_text` paper. Blank is allowed for `needs_download` or failed papers.
- The abstract scoring prompt is unchanged: this is a full-text decision, not an abstract prediction. The triage
  score already gives `process +2` and `xsec +2` for a named sequence or process flow.

## Changes

- `data/schema/packaging.schema.yaml` v2.1: added `has_process_flow` to `papers`, after `n_test_vehicles`.
- `.claude/skills/packaging-distill/SKILL.md`: hard rule 7 now defines the decision and its link to
  `process_steps`; workflow steps 3-4 require recording it in the papers row.
- `data/_staging/BATCH_INSTRUCTIONS.md`: papers row must set `has_process_flow`; yes requires process rows,
  no requires an empty table plus `not_reported`.
- Backfill: `data/papers.csv` 55 `yes`, 3 `no`. Values were derived from existing `process_steps` rows; the three
  no-process papers were checked against their PDFs:
  - `ectc51909.2023.00108` iOIS concept paper, no build details.
  - `ectc51529.2024.00144` COUPE simulation-only paper.
  - `ectc51909.2023.00091` supercarrier RDL mechanical TV; mentions process feasibility but no flow/sequence.
- Updated the `papers.csv` header and backfilled `has_process_flow` in all 24 staging dirs (`b000`-`b019`,
  `pilot_1`-`pilot_3`) and the template. No existing cells were changed (verified against `git show HEAD`).

## Validation

- `uv run python scripts/validate_db.py`: **0 errors, 0 warnings**.
- `validate_db.py --staging` for `b000`-`b019`, `pilot_1`-`pilot_3`, `TEMPLATE`: **0 errors, 0 warnings**.
- `data/_staging/batches` is the batch-input list directory, not a table directory; it still reports a missing
  `papers.csv` (pre-existing, unchanged).
