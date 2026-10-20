# Advanced Packaging Atlas

A traceable literature database and extraction pipeline for advanced semiconductor packaging: 2.5D
silicon interposers, organic/RDL fan-out and panel-level packaging, local silicon bridges, hybrid
bonding, micro-bump 3D stacking, glass core/substrates, advanced substrates and silicon-photonics
co-packaging, plus the thermal/power-delivery structures integral to the stack.

Two stages:

1. **Triage** ([DevLog-000](DevLog/DevLog-000-literature-triage-plan.md)): screen 2022-2026 packaging
   literature (ECTC, T-CPMT, EPTC, 3DIC, IEDM, VLSI, EDAPS, EPEPS, IRPS, ITherm, ICEP, ESTC, EMPC via
   IEEE Xplore; IWLPC and IMAPS via Crossref), score each abstract for extractable stack-up/process
   detail, and select ~300 papers.
2. **Extraction** ([DevLog-001](DevLog/DevLog-001-fulltext-cache-and-extraction.md)): cache each
   selected full text and distill it into structured rows - stack layers, dimensions, materials,
   interconnect pitch, process steps, electrical/optical interfaces, metrics - each with a page/figure
   locator and an evidence file.

Spec: `init-prompt.md`. Plan, decisions and audit corrections: `DevLog/`.

## Layout

| Path | Contents |
|---|---|
| `scripts/` | pipeline: enumeration, scoring, selection, retrieval, extraction, merge, validation |
| `config/` | venues, buckets, orgs, selection rules, report notes, scoring/curation prompts |
| `data/` | extraction database (`data/*.csv`), `data/evidence/*.yaml`, `data/schema/packaging.schema.yaml`, per-batch staging `data/_staging/` |
| `outputs/` | stage-1 deliverables (`candidates.csv`, `cache_list.csv`, `triage_report.md`) |
| `references/` | local source cache (`source.json` tracked; PDFs/text/figures local-only - see [references/README.md](references/README.md)) |
| `app/` | SvelteKit web atlas (dashboard, table, explorer, about); reads `app/static/data/atlas.json` |
| `.claude/skills/packaging-distill/SKILL.md` | the binding distillation skill |
| `cache/`, `logs/` | local-only pipeline intermediates (git-ignored) |

## Web atlas (`app/`)

A static SvelteKit site that presents the extraction database: a dashboard of coverage, a sortable/
expandable table of every test vehicle with an evidence drawer, and an explorer of the pitch,
through-via, bump, area and disclosure panels. Published to GitHub Pages at
<https://outside5sigma.com/advanced-packaging-atlas/> by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

```sh
uv run python scripts/build_views.py     # regenerate app/static/data/atlas.json from data/*.csv
cd app && pnpm install && pnpm dev       # local dev server
cd app && pnpm build                     # production build into app/build
```

`scripts/build_views.py` is a faithful projection of the database: it computes derived headline
extremes (finest pitch, smallest via, hottest process step, ...) by picking the matching extracted row
and carrying that row's `basis`/`locator`, and never estimates a value.


## Deliverables (`outputs/`)

- `candidates.csv`: every enumerated record incl. front matter, duplicate index entries (marked in
  rationale) and curator-added out-of-window disclosures (DOI, title, first author, affiliation, venue,
  year, session, buckets, score, rationale, access, cache Y/N).
- `cache_list.csv`: selected papers, sorted by primary bucket then year, with priority, lineage_id,
  outside_screen and selection_reason.
- `triage_report.md`: venue enumeration, spec-list coverage, per-bucket summary and gaps, orientation
  reviews, method.

## Triage pipeline (`scripts/`, run with `uv run python scripts/<name>.py`)

1. `xplore_fetch.py`, `xplore_toc_check.py`: IEEE Xplore enumeration (headless Chromium, rate-limited)
   and TOC completeness check.
2. `crossref_fetch.py`: IMAPS Symposium and IWLPC records via Crossref.
3. `openalex_enrich.py`, `xplore_abstracts.py`: full abstracts, affiliations, OA status.
4. `ectc_sessions.py`: ECTC session/committee mapping from ectc.net final programs.
5. `prefilter.py`: merge into `cache/pool.jsonl`, bucket regex prefilter.
6. `make_batches.py`, `make_rescore.py`: LLM scoring batches (scored by subagents per
   `config/scoring_prompt.md`).
7. `make_curation_inputs.py`: per-bucket curation inputs (curated by subagents per
   `config/curation_prompt.md`).
8. `select_cache.py`, `report.py`: deterministic selection and report.

Config in `config/` (venues, buckets, orgs, selection rules, report notes). `cache/` and `logs/` are
git-ignored intermediates. API keys and contact email live in `.env` (git-ignored).

## Extraction database (`data/`)

`data/*.csv` holds ten tables - `papers`, `test_vehicles`, `components`, `stack_layers`,
`interconnects`, `process_steps`, `electrical_interfaces`, `optical_interfaces`, `metrics`, `figures` -
defined by `data/schema/packaging.schema.yaml` (v2.2: columns, enums, rules a-m). Every value row carries
`basis`, `source` and a `locator`; derived values and conflicts live in `data/evidence/<paper_id>.yaml`.
`figures` holds 2-6 key figures per paper (page, bbox, kind, depicted TVs, caption, hover text). The crops
themselves stay local-only (`references/<id>/figures/key/`) because the sources are licensed.

Batch extraction follows [.claude/skills/packaging-distill/SKILL.md](.claude/skills/packaging-distill/SKILL.md)
and [data/_staging/BATCH_INSTRUCTIONS.md](data/_staging/BATCH_INSTRUCTIONS.md), then merges and validates:

```sh
uv run python scripts/figure_candidates.py --all             # detect figure/table regions (local-only)
uv run python scripts/make_extract_batches.py --size 3      # stage batches
uv run python scripts/make_extract_batches.py --figures-backfill --size 6   # key figures for merged papers
uv run python scripts/merge_staging.py data/_staging/<batch> --apply
uv run python scripts/validate_db.py                        # 0 errors expected
uv run python scripts/crop_figures.py                       # render key-figure crops from data/figures.csv
```

Stage-2 status and the key-figure design are in
[DevLog-005](DevLog/DevLog-005-batch-extraction-and-key-figures.md). The pending schema v2.x items and the
ranked defect list are in [DevLog/audits/audit_x1_2026-10-18.md](DevLog/audits/audit_x1_2026-10-18.md)
and [DevLog/audits/schema_gaps_2026-10-19.md](DevLog/audits/schema_gaps_2026-10-19.md).

## Setup and retrieval

Use Python 3.12+ and `uv`:

```sh
uv sync                                                     # creates .venv from uv.lock
uv run python scripts/ieee_fetch.py --login                 # sign in (institutional) once
uv run python scripts/ieee_fetch.py --run --headed          # throttled retrieval, 60 per 2 h, 30 per run
uv run python scripts/ingest_inbox.py                       # ingest manual (_inbox) downloads
```

Retrieval uses a dedicated, git-ignored browser profile (`cache/browser_profile`) so the institutional
session is not reused elsewhere. Cached subscription PDFs carry a licensed-download stamp and stay
local-only; only `source.json` metadata is tracked. Non-IEEE paywalled sources are listed in
`data/manual_downloads.md`.
