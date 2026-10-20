# DevLog-005: batch extraction of the cached backlog and key figures

Date: 2026-10-19. Follows DevLog-004 (`has_process_flow`). Status: extraction round complete; review items open (last update 2026-10-19 22:55).

## Request (Wentao, 2026-10-19)

Ingest the cached papers that are not yet extracted, under the current extraction rules (DevLog-004
`has_process_flow`). Also extract each paper's key figures, so the atlas can later show hover/expand
details. Delegate to subagents, at most 7 in parallel.

## State at start (2026-10-19 20:20)

- 184 papers cached (`text.md` present), 58 merged into `data/papers.csv`, **126 pending**; 9 of the pending
  papers carry `TEXT_LAYER_WARNING.md` (OCR text).
- Retrieval batch 4 (DevLog-003) is running in tmux `apa-ieee-7` and adds up to 30 more. Papers it saves
  before the extraction batches are staged join this run; later ones go to a follow-up round.
- Audit_x1 schema v2.1 proposals (pooled TVs, `value_kind`, unit list, ...) are **not** applied here; they
  remain open in DevLog-002 / audit_x1. The only rule change since the 58 merged papers is `has_process_flow`,
  already backfilled for them.

## Design: key figures

Licensed PDFs stay local, so figure **images** stay local-only. The tracked database holds figure
**metadata**: where the figure is (page + bbox), what it shows, and which TVs it depicts. Crops can be
regenerated from `source.pdf` at any time.

1. `scripts/figure_candidates.py` (deterministic, no LLM). For each cached PDF, it finds captions
   ("Fig. N", "TABLE N"; in-text references such as "Fig. 6 shows" are rejected by font size and punctuation).
   It then grows each region from the caption edge through contiguous graphics and figure-label text, within
   the caption's column, stopping at body text, other captions and claimed regions. Tables grow downward
   first, with a tight gap; figures grow upward.
   - Output (local-only, under the git-ignored `references/*/figures/`):
     - `figures/candidates.json`: cand_id, label, kind, page, bbox as page fractions, caption.
     - `figures/cand/<cand_id>.png`: crops at 200 dpi.
   - Prototype on 7 papers (00049, 00135, 3312037, 00052, 00174, 00093, 00108): most regions are exact.
   - Known misses:
     - Captions in a garbled font encoding (00049 Tables II/III).
     - OCR-only papers, where no text layer means no captions (00244).
     - Raster images whose box includes white margin over neighbouring text (00052 Fig. 7, Table 2).
2. New table `figures` (schema v2.2), child of `papers`, `fig_id = <paper_id>-fNN`:
   - Columns: rank, label, page, kind (enum `figure_kind`), tv_ids, bbox ("x0,y0,x1,y1" page fractions,
     top-left origin), bbox_source (candidate | manual), cand_id, caption (as printed, at most 30 words),
     shows (own words, at most 25 words, the hover text), reprinted (yes/no), notes.
   - No basis/source columns: a figure row records a location, not a value.
3. Selection rule:
   - Per paper, 2-6 key figures (fewer only if the paper has fewer). Rank 1 is the figure that best shows the
     physical build: cross-section > stack schematic > package photo. Then the process flow, layout/floorplan,
     and the figures/tables that most extracted values are read from.
   - Skip author photos, logos and generic roadmaps unless nothing else exists. Flag figures reprinted from
     cited work.
4. The agent opens every chosen crop (candidate png or its own re-crop) and confirms it holds the whole
   figure. If a candidate is wrong or missing, the agent reads a manual bbox off a gridded page render
   (`scripts/crop_figures.py --grid`) and verifies the re-crop.
5. `scripts/crop_figures.py` renders the final crops from `figures.csv` rows to
   `references/<paper_id>/figures/key/<fig_id>.png` (local-only).
6. Later (not in this DevLog): `build_views.py` links value rows to figures by matching locator page and
   figure label, for hover in the app. Publishing crops on the public site needs a rights decision first.

## Plan

- [x] Schema v2.2: `figures` table + `figure_kind`, `bbox_source` enums; validator checks for bbox, page
      range, tv_ids, rank uniqueness, cand_id; templates regenerated.
- [x] `scripts/figure_candidates.py` over all cached papers (log `logs/figure_candidates_<ts>.log`).
- [x] `scripts/crop_figures.py` (grid render, staging re-crop to scratch, final crops from `data/`).
- [x] SKILL.md + BATCH_INSTRUCTIONS.md: key-figure step; `make_extract_batches.py --figures-backfill` (f-batches).
- [x] Pilot: 1 batch (3 papers) end to end, coordinator review of rows and crops.
- [x] Full run: pending papers in batches of 3, at most 7 subagents at once (b021-b070 done, 145 papers).
- [x] Figures backfill for the 58 merged papers (figures-only batches f000-f009).
- [x] Merge, validate (0 errors), fresh-context audit sample (x2A/x2B), final crops, `build_views.py`.
- [ ] Decide on the audit x2 findings and the rule questions (figure cap, `has_process_flow` threshold); apply fixes.
- [ ] Detector: 36% of figure rows needed a manual bbox (501/1410). Agents report bottom-clipped candidates on
      some papers (ectc51846.2026.00416 and 00424, where all 6 were manual). Investigate the caption-edge clipping.
- [ ] App: project `figures` into `atlas.json` and build hover/expand (crops local-only; publishing needs a rights
      decision).
- [x] Follow-up round for papers cached by retrieval batch 5 (31 saved, ended 22:05): b071-b080 merged.
- [ ] Text-layer flags. Agents reported 11 papers with partly garbled text layers and no `TEXT_LAYER_WARNING.md`:
      ectc51529.2024.00094, ectc51906.2022.00140, ectc51909.2023.00023, 00048, 00153, 00155, 00174, 00252,
      tcpmt.2021.3104326, vlsitechnologyandcir46783.2024.10631441 and 10631478.
      - The damage is lost unit glyphs (um, Ohm, mu/sigma) or font-shifted p.1 text.
      - Each agent checked the numbers against page renders, so the data is unaffected.
      - Open: flag them, or fix `recheck_text_layers.py` (audit_x1 item 1) and re-run. Undecided, nothing changed.

## Progress

- 2026-10-19 20:20: inspected the repo; counts above. Prototyped `figure_candidates.py` on 7 papers with
  overlay checks (page renders with candidate boxes).
- 2026-10-19 20:20-20:30: schema v2.2, validator figure checks (figures-only staging dirs need no papers.csv),
  `crop_figures.py`, skill/instruction updates, `make_extract_batches.py --figures-backfill`.
- `figure_candidates.py --all`: 190/190 cached papers, 0 errors (logs `figure_candidates_20261019T2027*.log` and
  the follow-up run). Zero candidates on 7 papers: 6 OCR-text papers (no caption text layer) and
  `ectc51687.2025.00085`; agents use manual bboxes there. One paper (`eptc56328.2022.10013262`) has 41k tiled image
  fragments on a page and hung the region growth; fixed by coalescing touching rects when a page has >200 graphics.
- 2026-10-19 20:32: pilot started: extraction batch `b020` (3 papers) and figures-only batch `f000` (6 merged papers).
- 20:41 f000 done: 36 figures, 6 merged papers, 0 errors. 21 used the candidate crop and 15 needed a manual bbox
  (8 caption/body-text slivers, 3 clipped edges, 1 merged table, 1 wrong page, 2 tables not detected). The
  coordinator checked all 36 crops on a contact sheet: all clean, and the hover texts match the images.
- 20:47 b020 done: 3 papers, 0 errors, 18 figures (5 candidate, 13 manual). The coordinator checked all 18 crops:
  clean. The low candidate rate came from two detector bugs:
  - "Figure  N  text" captions in body-size font were rejected as in-text references.
  - Crops spanned from the previous caption into the next one (ICEP p.2).
- Fixes from the pilot feedback:
  - The detector clips regions to the caption edge and the body-text edge, and joins caption continuation lines.
  - Caption test: smaller font, punctuation, 2+ spaces or a capitalized word after the label.
    Checked on 00148, 00052 and 3312037: every caption accepted, every in-text reference rejected.
  - New `figure_kind` `mechanical_plot`.
  - `crop_figures.py --spec PAGE:bbox` (repeatable).
  - Skill rule for figures split across columns or pages.
- 20:48 candidates regenerated for all 200 cached papers (`logs/figure_candidates_20261019T204846.log`).
  Zero candidates on 13 papers, all with OCR text (`TEXT_LAYER_WARNING.md`).
- 20:52 pilots merged (zip backup in `cache/backups/`): 61 papers, 54 figure rows, validator 0 errors.
- 20:52 full run launched (workflow, 7 queue workers):
  - 47 extraction batches b021-b067 (about 140 papers).
  - 9 figures-only batches f001-f009 (52 merged papers).
  - Papers that retrieval batch 4 saves after 20:52 go to a follow-up round.

Pilot-reported schema gaps (not acted on; for the v2.1/v2.2 schema discussion):
- Assembly stage of the same sample (substrate / after UF / after stiffener). metrics.variant is used.
- Architecture-level claims not measured on the TV. A metric with basis author_estimate is used.
- Numeric min/max for metric ranges. Ranges sit in value_text (also audit_x1 item 1).
- No package_class for an RDL-first molded interposer with embedded Si bridges and PICs.
- 21:15 run 1 (`wf_04a3c288-a69`) stopped on the account's weekly usage limit after 10/56 agents.
  - Complete: b021-b028, b032, b033.
  - Interrupted mid-work: b029, b030 (all papers staged, no BATCH_REPORT), b031 (complete, report written,
    0 errors; accepted) and b034 (2/3 papers).
  - Not started: b035-b067, f001-f009.
- 21:18 retrieval batch 4 ended at 21:03 (log `ieee_run_20261019T201144.log`). Batch 5 started in tmux
  `apa-ieee-8`. Candidates were run for 9 new papers; b068-b070 (7 papers) staged.
- 21:18 run 2 (`wf_88564222-150`) launched after the usage reset, 48 batches.
  - b029, b030 and b034 in finish mode: verify the inherited papers, complete the missing ones, write the report.
  - Then b035-b070 and f001-f009.
- 21:19 merged b021-b028, b031-b033 (zip backup first): 94 papers, 247 figure rows, validator 0 errors.
- 22:23 run 2 status: 44/48 agents done, 0 failed, every batch validator 0 errors / 0 warnings. Running:
  f006-f009 (22 merged papers).
- 22:25 merged b029, b030, b034, b035-b070 and f001-f005 (zip backup `cache/backups/data_before_run2_merge_*`).

## Status at 2026-10-19 22:30

| item | value |
|---|---|
| papers in `data/papers.csv` | 209 (all `full_text`) |
| `has_process_flow` | 201 yes, 8 no |
| test vehicles / components / stack layers | 673 / 1680 / 2822 |
| interconnects / process steps / metrics | 902 / 3722 / 5261 |
| electrical / optical interfaces | 70 / 49 |
| key figures (`data/figures.csv`) | 1103 rows on 187 papers: 698 candidate bbox, 405 manual bbox |
| papers without key figures | 22 (f006-f009, running) |
| validator on `data/` | 0 errors, 0 warnings |
| agent batches (runs 1+2) | 55 structured results: 145 papers distilled, 36 figures-only, 0 blockers |

- Top figure kinds: cross_section 169, data_table 146, stack_schematic 139, process_flow 134, micrograph 87.
- Agent-reported schema gaps: 206 notes, grouped verbatim in `DevLog/audits/schema_gaps_2026-10-19.md`.
  - Largest themes: interconnect taxonomy (39), figures table (30), metric ranges/statistics (18) and the TV
    model (17).
  - None acted on.
- Per-batch detail (judgment calls, not-reported lists, figure choices) is in each `data/_staging/<batch>/BATCH_REPORT.md`.
- Process slips reported by agents: one read-only `git status` (b027); bare `python3` on scratch helpers (b020).
  Nothing outside the staging and scratch dirs was written.
- 22:27 run 2 complete (48/48, 0 failed); merged f006-f009. All 209 papers have key figures: 1233 rows, validator
  0 errors.
- 22:28 retrieval batch 5 ended 22:05 (`ieee_run_20261019T211821.log`, 31 saved, no breaker). Candidates for
  30 new papers. Staged b071-b080 and launched run 3 (`wf_76e78bac-aab`, 5 workers).
- 22:29 launched two read-only fresh-context audits (2 agents; 7 agents in total with run 3):
  - x2A: ectc51529.2024.00265, ectc51687.2025.00284, ectc51846.2026.00110, ectc51846.2026.00183,
    tcpmt.2021.3104326, ectc51687.2025.00026.
  - x2B: eptc59621.2023.10457909, ectc51846.2026.00365, ectc51909.2023.00154, ectc51846.2026.00092,
    ectc51687.2025.00009, ectc51687.2025.00061, plus DB-wide script checks.
  - Sample: 12 of the 148 papers new this session, at least one per bucket, seed 20261019.
  - Output: `DevLog/audits/audit_x2{A,B}_2026-10-19.md`.
- 22:29 `crop_figures.py`: 1233 crops in `references/*/figures/key/` (local-only, 27 s).
  `build_views.py`: atlas.json 7.25 MB, 209 papers. Figures are not projected yet (the app hover work is a
  later step).
- 22:38 audits x2A/x2B done (read-only; files `DevLog/audits/audit_x2A_2026-10-19.md`, `audit_x2B_2026-10-19.md`).

## Audit x2 summary (2026-10-19)

| | x2A | x2B | audit_x1 (2026-10-18) |
|---|---|---|---|
| rows checked | ~476 / 584 | ~188 / 404 | ~364 / 1193 |
| wrong numeric transcription | 0 | 0 | 0 |
| flagged rows | 30 (6.3%) | 16 (8.5%) | ~49 (13%) |
| content-changing | 10 (2.1%) | 2 (1.1%) | 20 (5.5%) |
| key-figure crops opened | 36 | 36 | n/a |
| key-figure defects | 8 (5 substantive) | 2 | n/a |

- Dominant defect class, still: one statement copied onto sibling TVs.
  - x2A: 00265 adhesion pass/fail on all four cores; 3312037-b-i1 resistance copied onto the underfill build.
  - x2B: 00154-a-c1..c4 gap 60 um.
  - DB-wide: 63 groups / 145 rows in 29 papers (audit_x1: 23/49).
- Other content defects:
  - Generic-model values attached to a TV (00026-a-m9..m11).
  - Spec limit stored as a measurement (00026-a-m1).
  - Alignment bound true for only 93% of cases (00183-a-i1..i3).
  - Guessed ic_type (00061-a-i1).
  - Inferred technology_name (10457909-c).
- Key figures:
  - All 72 sampled crops have the right page, label and kind, and none cuts its figure.
  - Defects: rank 1 breaks the cross-section > schematic > photo order twice; `shows` names things not in the
    figure three times; one incomplete `tv_ids`; excess margins three times; one crop cuts panel labels; important
    figures were left out in 00265 and 00026.
  - DB-wide: no box under 1% or over 70% of the page; no duplicate figures; 2-6 per paper everywhere.
- Findings that bear on the rules:
  - 194/209 papers (93%) have exactly 6 figures, so agents fill to the cap.
  - `has_process_flow` is 201 yes / 8 no and does not separate fabrication-flow papers from results papers: a
    few generic steps or cure read-outs satisfy the literal rule. Borderline examples: 10457909, 00365.
  - 447 metrics rows hold numbers only in value_text, and about 180 would become numeric with value_min/value_max.
  - The audit_x1 fixes are still not applied (00174 DECA rows, 00052-e-m1, 00093-a-m1, 6575597 ranks, 00244 copies).
- Recommendations from the auditors:
  - Validator warnings for sibling duplicates and for the rank-1 kind order.
  - A script that checks each cited number appears on its cited page.
  - `performed=no` for proposed flows.
  - Metrics value_min/value_max.
- None of the fixes are applied. They need a decision together with the audit_x1 / schema v2.x items.
- 22:55 run 3 complete (10/10, 0 failed); merged b071-b080. Crops for the 177 new figure rows rendered;
  `build_views.py` -> atlas.json 8.41 MB.
- 22:55 `schema_gaps_2026-10-19.md` regenerated over all three runs: 256 notes. Largest themes: interconnect
  taxonomy 46, figures table 39, metric ranges 22, TV model 20.

## Final state of this round (2026-10-19 22:55)

| item | value |
|---|---|
| papers in `data/papers.csv` | 239 (58 before this DevLog), all `full_text` |
| `has_process_flow` | 231 yes, 8 no |
| test vehicles / components / stack layers | 770 / 1885 / 3277 |
| interconnects / process steps / metrics | 1008 / 4441 / 6057 |
| electrical / optical interfaces | 71 / 53 |
| key figures | 1410 rows on all 239 papers (909 candidate bbox, 501 manual); crops local in `references/*/figures/key/` |
| validator on `data/` | 0 errors, 0 warnings |
| batches | b020-b080 and f000-f009; every batch report is in `data/_staging/<batch>/BATCH_REPORT.md` |
| agents | 3 workflow runs (66 batch agents incl. 3 finish-mode), 2 pilots and 2 audits; 0 failures after the usage-limit restart |
| retrieval backlog | 61 of 300 not cached: 59 subscription (10 p1, 12 p2, 37 p3), 2 OA. `data/manual_downloads.md` covers the IMAPS/IWLPC ones |

Backups of data/ before each merge: `cache/backups/data_before_*.zip` (local-only).

## Decisions (Wentao, 2026-10-19 23:00)

1. Key figures: always keep the figures, especially those with an actual schematic drawing or an SEM/micrograph
   image. Rule change: every figure showing a schematic drawing (stack, structure, process flow, layout) or a
   micrograph (SEM/TEM/FIB/optical cross-section, X-ray, CSAM) is a key figure. The 6-figure cap no longer applies
   to these. Data plots and tables are still chosen by information content.
2. `has_process_flow`: the goal is to capture process-flow information, not to separate papers by a label.
   Sample the `yes` papers and inspect whether they have a proper process flow and whether it was captured.
3. Fix the audit issues (audit_x1, audit_x2A, audit_x2B).

Scope correction (Wentao, 23:00): retrieval/caching is not part of this work. At 23:00 I started a retrieval
session (tmux `apa-ieee-9`) by mistake; it was killed while still waiting at login. No download, no run log.
"Ingestion" = distilling already-cached papers: 239 cached, 239 ingested, 0 pending.
