# DevLog-002: standalone spin-off (advanced-packaging-atlas)

Date: 2026-10-18. Follows DevLog-001 (full-text cache and extraction).

## Request (Wentao, 2026-10-18)

Spin the project off into a standalone repository, "advanced-packaging-atlas" (shorthand APA), mirroring
`jwt625/eo-modulator-atlas`. Copy the code and markdown over; **move** the cached papers rather than
duplicating them; publish to GitHub. Do not lose any data.

## Decisions

- Target: `~/Documents/GitHub/advanced-packaging-atlas`, remote `jwt625/advanced-packaging-atlas`, public.
- Copy the committed tree (code, config, schema, data CSVs, evidence, outputs, DevLog); move the heavy
  local-only state (`references/`, `cache/`, `logs/`) so the 828 MB is not duplicated.
- Standalone `.gitignore` (no PlayGround root patterns to override): track code/config/schema/DevLog, the
  extraction database (`data/*.csv`), `data/evidence/*.yaml`, `outputs/`, and the per-source
  `references/<id>/source.json` + `TEXT_LAYER_WARNING.md`. Keep `source.pdf`, `text.md`, `figures/`,
  `cache/`, `logs/`, `.env` and `.venv/` local-only.
- Rename the project package `advanced-packaging-triage` -> `advanced-packaging-atlas` (`pyproject.toml`
  and `uv.lock`), reflecting that the repo now covers triage **and** extraction.

## Migration

Source: `PlayGround/20261018_advanced_packaging` at commit `ee4029a`.

1. Committed the source project to PlayGround first (437 tracked files), so the copy is exactly the
   reviewed tree.
2. Extracted the committed tree with `git archive HEAD:20261018_advanced_packaging` into the new repo
   (437 files; no untracked junk copied).
3. Moved `references/`, `cache/` and `logs/` with `mv` (same volume -> atomic rename, no re-copy).
4. Recorded SHA-256 manifests of all three trees before and after the move; the manifests are identical
   (references 1476 files, cache 1302 files, logs 25 files).
5. Copied `.env` (local-only secrets) and left the old `.venv/` behind (absolute paths); recreate with
   `uv sync`.

## Repo policy

- `.gitignore` and `references/README.md` govern local cache handling. Cached subscription PDFs carry an
  institutional licensed-download stamp and are never pushed; only `source.json` metadata is tracked.
- `cache/` holds the IEEE browser profile (session cookies) and the scoring/curation intermediates; it is
  git-ignored and must stay local.
- New `README.md` documents the standalone atlas (layout, both stages, setup/retrieval).

## Frozen source checkout

`PlayGround/20261018_advanced_packaging` keeps the committed code, config, data, DevLogs and the tracked
`references/*/TEXT_LAYER_WARNING.md` flags, but the cached PDFs, extracted text/figures and the `cache/`
and `logs/` trees were moved here. Do not re-run extraction or validation against that checkout; use this
repository.

## Open (carried over from DevLog-001 / audit_x1)

- Apply the audit_x1 fixes (rule (a) external-source rows, sibling-TV duplicates, column semantics) and
  the schema v2.1 changes; the merged data is committed as-is.
- Fetch the remaining ~220 IEEE papers and the 21 manual (IMAPS/IWLPC) downloads; extraction is at
  58/300 papers.
