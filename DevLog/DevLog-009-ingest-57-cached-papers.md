# DevLog-009: ingest the 57 cached papers not yet in the database (b081-b099)

Date: 2026-10-20. Status: done (merged and pushed 2026-10-20 11:30). Follows DevLog-005 (batch extraction, key figures)
and DevLog-007 (process-flow model, schema v2.5).

## Request (Wentao, 2026-10-20)

Distill every cached paper (`references/<id>/text.md`) that is not in `data/papers.csv`, per SKILL.md and schema v2.5:
all tables, process flows re-keyed to flows, every schematic and image of the build as a key figure (no cap), 0 errors
and 0 warnings per batch and on `data/`. At most 7 subagents; no network, no git during extraction. Fresh-context audit
on about 10 papers before merging; zip-backup `data/` first. Later in the session: commit and push in batches once the
ingestion is done; use 7 parallel agents for this project.

## Plan

- [x] Verify the pending set: 296 cached, 239 in DB, 57 pending (17 IMAPS manual downloads; 4 SMTA/IWLPC unavailable).
- [x] Figure candidates for the 57 (`figure_candidates.py --paper ...`; none had `candidates.json`).
- [x] Stage 19 batches of 3 (`make_extract_batches.py --size 3`): b081-b099.
- [x] Distill (workflow, one agent per batch); each batch validated to 0 errors / 0 warnings.
- [x] Fresh-context audit, stratified sample of 11 papers (A/B/C/D); fix agents verify each finding before applying.
- [x] Coordinator scan of candidate bboxes for clipped edges; mechanical fix.
- [x] Zip-backup `data/`, merge in 3 groups, validate, commit and push per group.
- [x] Rebuild `atlas.json`, local key-figure crops, 3D template check.

## Progress

- 09:58 Pending set verified (57). Figure candidates generated for all 57 (log `logs/figure_candidates_20261020T095756.log`,
  57 ok). No `TEXT_LAYER_WARNING.md` and no garbled-text flag in any `source.json`.
- 09:58 b081-b099 staged. Workflow `wf_6096c7d2-7ca` launched with 5 workers. Contract: BATCH_INSTRUCTIONS.md + SKILL.md
  + schema v2.5 + the v2.5 conventions in REPASS_INSTRUCTIONS.md step 4. Affiliation tables left header-only (separate
  DevLog-006 pipeline).
- 10:54 Wentao: use 7 parallel agents for this project. Audits A/B/C (read-only) started in the free slots while
  b096-b099 ran.
- 11:05 Extraction done: 19/19 agents, 57/57 papers distilled, 0 failed, every batch 0 errors / 0 warnings
  (re-checked by the coordinator). 5.1M subagent tokens, 66 min.
- 11:05 Audits A/B/C (9 papers from b081-b095) done; audit D (2 papers from b096/b097) and per-batch fix agents ran in
  workflow `wf_682020d6-6b4` (7 concurrent). Reports: `DevLog/audits/ingest_audit_{A,B,C,D}_2026-10-20.md`.
- 11:15 Coordinator bbox scan (pixel test: ink at the bbox edge continuing past it) over all candidate-bbox figure rows
  of b081-b099: 51 of 422 candidate rows clip the bottom of a raster image, typically by about 0.012 of page height (SEM
  data bars, photo bottoms, lower panel rows). Each was extended to the first blank gap under the image, checked on
  contact sheets (captions excluded), and set to `bbox_source: manual`. Logged per batch in BATCH_REPORT.md. Top/left
  flags were false positives (body text adjacent to a correct bbox) and were not changed.
- 11:21 Backup `cache/backups/data_before_ingest_b081_b099_20261020T112121.zip`. Merge dry runs: 19/19 with 0 conflicts.
- 11:25-11:30 Merged and pushed in groups: b081-b087 (21 papers), b088-b094 (21), b095-b099 (15). `data/` 0 errors /
  0 warnings after each group; diffs are insertions only.

## Results

| table | before | after | added |
|---|---|---|---|
| papers | 239 | 296 | 57 |
| test_vehicles | 769 | 938 | 169 |
| components | 1885 | 2256 | 371 |
| stack_layers | 3277 | 4204 | 927 |
| interconnects | 1008 | 1267 | 259 |
| process_flows | 486 | 588 | 102 |
| process_steps | 3812 | 4750 | 938 |
| electrical_interfaces | 71 | 120 | 49 |
| optical_interfaces | 53 | 55 | 2 |
| metrics | 5998 | 7511 | 1513 |
| figures | 2812 | 3528 | 716 |
| author_affiliations | 1996 | 1996 | 0 |

- New papers: process_flow_level full 35 / ordered 18 / fragments 3 / none 1 (has_process_flow yes 53 / no 4).
  All papers: full 112 / ordered 159 / fragments 18 / none 7.
- New key figures: 716 (3-29 per paper; 371 candidate, 345 manual bbox). Top kinds: cross_section 103,
  stack_schematic 101, data_table 82, micrograph 65, process_flow 59, package_photo 57.
- `atlas.json` 11.91 MB, 296 papers, 0 warnings; `build_package3d.py --check` ok (23 families); 716 local crops.
- Source notes from the agents (no blockers; numbers read from page renders where the text layer was damaged):
  garbled equations or unit glyphs in ectc51909.2023.00240, 00302, 00021, ectc51846.2026.00243, 00356,
  estc60143.2024.10712091; equations only as images in eptc62800.2024.10909809; illegible embedded SEM labels in
  001c.74775 Fig. 5; misnumbered figures in 001c.94484; duplicated caption in 3dic63395.2024.10830178; caption vs text
  conflict in ectc51846.2026.00103; tcpmt.2026.3672227 is an accepted author version.

## Audit (fresh context, 11 papers)

- Sample: every process_flow_level (full 6, ordered 3, fragments 1, none 1), 4 IMAPS, venues TCPMT/ECTC/EPTC/ESTC/IMAPS,
  9 buckets. Every row checked: 1244 rows, 191 figures. Level grades: 11/11 agree.
- Findings: 31 (4 content_wrong, 6 content_missing, 3 structure, 9 figure, 9 minor). Fix agents re-verified each
  against the source: 34 change items fixed, 1 partly fixed (figure re-rank; a top-view layout placed at rank 4 per the
  SKILL order), 0 rejected. Each change is in the paper's evidence `revisions` and the batch report.
- The content_wrong items:
  - a simulated ESL stored as measured (tcpmt.2026.3736233-a-m12);
  - a nominal L/S stored as measured (001c.129747-a-L03);
  - the wrong joint metallurgy (tcpmt.2024.3507552-a-i2);
  - a die-set pitch attached to an FE model whose geometry contradicts it (tcpmt.2025.3614186-b-i1).
- Rate: 4 wrong values in 1244 rows (0.3%); 0 invented values; no wrong numeric transcription.

## Open / follow-up

- [ ] Affiliations for the 57 new papers (DevLog-006 pipeline: author_affiliations, canonical orgs, org_sites with
      geocoding). The map shows 232/296 papers until then.
- [ ] Detector: `figure_candidates.py` clips the bottom of raster images (51/422 candidate rows here). The 239 papers
      merged before this round very likely carry the same defect (DevLog-005 open detector item). The coordinator
      scan (`ink at bbox edge continues past it` + extend to the first blank gap) can be rerun over `data/figures.csv`.
- [ ] Venue strings stay free text and inconsistent ("ECTC", "ECTC 2026", "IMAPS 2025"), as in the merged papers.
