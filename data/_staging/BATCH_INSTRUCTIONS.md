# Batch distillation instructions (shared contract, 2026-10-18; key figures added 2026-10-19, DevLog-005; process flows v2.4/v2.5 2026-10-20, DevLog-007)

You distill advanced-packaging papers into table rows. Work from the project root (the directory containing `data/`,
`scripts/`, `references/`). No emoji. Never invent: an empty cell means not reported. Do not use git. No network.

## Read first
1. `.claude/skills/packaging-distill/SKILL.md` (binding)
2. `data/schema/packaging.schema.yaml` (v2.5: columns, enums, rules a-n, `figures`, `process_flows` tables)
3. Worked examples once they exist: `data/_staging/pilot_*/` (and their `REVIEW.md` if present)

## Your task
Your batch file `data/_staging/batches/<batch>.csv` lists paper_ids (with title, bucket, priority as hints only).
For each paper, one at a time, completely:
1. If `references/<paper_id>/text.md` is missing: status needs_download; move on.
2. Read the whole text.md; open the page renders for every figure/table you take a number from.
3. Write rows into `data/_staging/<batch>/{papers,test_vehicles,components,stack_layers,interconnects,process_flows,process_steps,electrical_interfaces,optical_interfaces,metrics,figures}.csv`
   (copy headers from `data/_staging/TEMPLATE/`) and `data/_staging/<batch>/evidence/<paper_id>.yaml`.
4. The papers row: source_status full_text, pages_read, verified_on (today), primary_bucket from the batch file unless
   the full text clearly shows otherwise (say so in the report). Process flow per SKILL.md rule 7 (binding):
   - Grade `process_flow_level` (full | ordered | fragments | none); `has_process_flow` = yes iff full/ordered.
   - Each distinct flow once in `process_flows`, linked to every TV built with it (`tv_ids`); steps keyed to the
     flow; TV-specific steps as deltas (`tv_id` set; v2.5: a `;` list when the delta applies to several TVs);
     alternative routes in `route` (alternatives on one TV are routes in one flow, not separate flows); `build_seq`
     orders a TV's flows (1 = first). Never copy a flow per TV. `full` needs at least one typed process condition.
   - A step changes the build: no structure-restating steps; reliability tests, preconditioning, measurements and
     failure-analysis cuts go to `metrics`; in-flow inspection is `step_kind` inline_inspection.
   - Split composite steps when a figure gives a finer order; stated dimensions and named tools on the step;
     input and result thickness; typed conditions (force_n, atmosphere, dose, current density, ramp, peak
     temperature) and sweeps in `split`, on the TV that ran them.
   - Every package / test_coupon / sub_assembly / die_stack / wafer_level / panel_level TV of a full/ordered paper
     links a flow or is listed in `evidence.not_reported` as "process_steps: <tv_id> (why)". Level none: no flows
     and `process_steps` in `evidence.not_reported`.
5. Key figures per SKILL.md workflow step 5: every schematic drawing and every SEM/micrograph/X-ray/photo of the build,
   plus the plots/tables that carry extracted values (no 6-figure cap). Open every chosen crop (candidate png or
   your manual re-crop); never cite a bbox you have not looked at. Re-crops and grid renders go in your scratch
   subfolder (`--out <session scratchpad>/<batch>/`).

## Figures-only batches (backfill for merged papers)
If your batch file has `mode` = `figures_only`, the paper is already in `data/`: read its rows there
(`data/test_vehicles.csv` etc., for `tv_ids` and to know which figures the values came from) and write only
`data/_staging/<batch>/figures.csv`. Do not write papers.csv, other tables or evidence.

## Source quality
If `references/<paper_id>/TEXT_LAYER_WARNING.md` exists, the PDF text layer was garbled and `text.md` holds tesseract
OCR of `figures/page_NN_220dpi.png`: verify every number against those images and note "OCR text" in papers.notes.
Temporary files (crops, re-renders, helper scripts) go only in your own subfolder `<session scratchpad>/<batch>/`
(the scratchpad is shared by parallel agents).

## Validation and boundaries
Run `uv run python scripts/validate_db.py --staging data/_staging/<batch>` until it reports 0 errors (warnings are
listed in your report). Write only inside `data/_staging/<batch>/`. Never edit `data/*.csv`, `data/schema/`,
scripts, other batches, or `references/`.

## BATCH_REPORT.md (in your staging dir)
Per paper: status, rows per table, figures opened (file names), key figures (fig_id, label, kind, candidate/manual),
judgment calls, fields not reported, anything wrong with the source (truncated, wrong paper, scanned). Final message: short per-paper status, validator output, blockers,
schema gaps you hit (bullets).
