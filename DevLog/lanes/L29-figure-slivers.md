---
title: Lane L29 - figure sliver shrink pass (caption/body text slivers at key-figure bbox edges)
date: 2026-10-21
status: done 2026-10-22 (hand-off ready; validator 0 errors, 0 warnings; build_views.py not run)
scope: scripts/crop_figures.py (--sliver-check), data/figures.csv (bbox and dependent fields of fixed rows), local crops, cache/backups, logs
authors: Claude (lane L29 subagent), at Wentao Jiang's request
---

# L29: figure sliver shrink pass

Parent: [DevLog-013](../DevLog-013-backlog-round-1.md). Inputs: [L15 notes](L15-figure-detector.md) open item 2
(about 120 rows whose bbox edge cuts a caption/body/page-wide text line, edge status `sliver`),
[L25 notes](L25-data-followups.md) open item 1.

Excluded (audit A10 is checking them): ectc51687.2025.00027-f06, ectc51529.2024.00155-f10,
iedm45625.2022.10019499-f08, iedm45625.2022.10019499-f13, iedm45741.2023.10413759-f10.

## Plan (2026-10-21 19:13 PDT, before any edit)

1. Backup: zip `data/figures.csv` + all key crops of rows with an L15 `sliver` edge into
   `cache/backups/L29_figures_before_sliver_<ts>.zip`.
2. `crop_figures.py --sliver-check [--paper ID] [--apply] [--skip FIG_ID]` (same structure as `--edge-check`;
   report `logs/figure_sliver_check_<ts>.jsonl`). Per row, per edge whose `edge_extend` status is `sliver`:
   - straddling lines = text lines crossing the edge inside the bbox span (as in `edge_extend`);
   - unambiguous only when every straddling line has role caption / body / wide (a "label" role line that is only
     texty by width = garbled or figure-internal text -> ambiguous);
   - walk inward over further caption/body/wide lines attached to the edge (multi-line caption inside the bbox);
   - from the inner side of those lines scan inward to the first all-blank pixel line over the bbox span (120 dpi,
     same ink threshold as L15), keep up to 2 blank px; cap the shrink at 0.05 of the page;
   - safety: every ink pixel in the removed strip lies inside a caption/body/wide line rect (+1 px); else ambiguous
     (figure ink would be cut);
   - the new edge is a blank pixel line, so `edge_extend` reports no cut there (re-checked in the report).
   Ambiguous reasons: label-role straddle, non-text ink in the strip, no blank line within the cap, shrink would
   remove more than a set fraction of the bbox.
3. Dry run over all rows; review the list; contact sheets (old bbox red, new blue) of every proposed shrink; reject
   bad ones via `--skip`.
4. Apply: bbox (only the shrunk edges), candidate rows -> bbox_source manual, cand_id empty; dated note appended
   ("bbox <edges> edge cut a caption/body text line; shrunk to just inside it (L29 sliver check 2026-10-21)");
   re-render the key crops of changed rows (200 dpi); view every changed crop (contact sheets).
5. Regression: `--edge-check` dry run: changed edges not cut (no `sliver`/`extend` on them); diff vs backup: only
   the changed rows' bbox/bbox_source/cand_id/notes.
6. `uv run python scripts/validate_db.py` 0 errors. No `build_views.py`. Delete temp images.

## TODO

- [x] Backup zip
- [x] `--sliver-check` mode
- [x] Dry run + review
- [x] Apply + re-crop + visual check of every changed row
- [x] Edge-check regression, diff check
- [x] Validator
- [x] Hand-off

## Progress

- 2026-10-21 19:13 PDT: plan written.
- 2026-10-21 19:13 PDT: backup `cache/backups/L29_figures_before_sliver_20261021T191353.zip` (data/figures.csv + the
  145 key crops of every row with a `sliver` edge in L15's post-apply re-check `figure_edge_check_20261021T181633`).
- 19:16: first `--sliver-check` version (line boxes only): 91 of 143 sliver edges came out `figure_ink`. Debug zooms
  showed why: the font line box of a caption often overlaps the figure's last pixel rows while no glyph ink is inside
  the bbox, so "ink inside the line box" did not separate glyphs from figure ink.
- 19:21: reworked on a text-only render (in-memory copy of the PDF, one redaction over the page that removes images
  and line art and keeps text; the source PDF is never written): glyph ink = ink in both renders inside a text line
  box (1 px tolerance), figure ink = all other ink. New class `no_glyph` (no glyph of the straddling line inside the
  bbox: nothing to trim). Final rule set in the `crop_figures.py` docstring. A test of an extra "block starts with
  Fig./TABLE" text rule changed 0 rows (the label straddles are "(a) (b)" panel-label lines or garbled text
  layers) and was removed.
- 19:26 dry run `logs/figure_sliver_check_20261021T192649.jsonl` (identical to the 19:21 run): 3531 rows, 143 with a
  sliver edge: 53 shrink (55 edges), 35 no_glyph, 55 ambiguous. None of the 5 A10 rows has a sliver edge now (they are
  also passed with `--skip`).
- Visual review before the apply (contact sheets, 150 dpi zoom on every edge, old edge red, new edge blue): all 55
  shrink edges remove only caption/body text (whole multi-line captions in ectc51846.2026.00123-f03/f05/f06,
  ectc.2011.5898527-f02/f04, 001c.147115-f03/f06/f08, tcpmt.2026.3736233-f03/f11; table titles in
  iwlpc52010.2020.9375855-f07, 001c.147115-f07, eptc67330.2025.11392196-f13, as L25's convention; body text in
  tcpmt.2026.3736233-f28; the rotated "Downloaded from" stamp in 2380-4505-2020.1.000042-f02; descender/cap-top
  slivers elsewhere). All 43 no_glyph edges and all 62 ambiguous edges viewed too: no_glyph = edge in the gap or on
  the line box only (crops clean); ambiguous = see below.
- 19:29 apply: `uv run python scripts/crop_figures.py --sliver-check --apply --skip <the 5 A10 rows>`
  (report `logs/figure_sliver_check_20261021T192937.jsonl`): 53 rows shrunk, key crops re-rendered at 200 dpi.
- Diff vs the backup: 3531 rows, same order; exactly 53 rows differ, only in bbox / bbox_source / cand_id / notes;
  every changed edge moved inward, no other edge moved; 14 former candidate rows -> manual, cand_id empty; CRLF kept.
  Note text: "[candidate <cand_id>] bbox <edges> edge cut a caption/body text line; shrunk to just inside it (L29
  sliver check 2026-10-21; was <old bbox>)". Shrink sizes: median 0.0016 of the page (55 edges), max 0.0367
  (ectc.2011.5898527-f02, a two-line caption).
- 19:31 regression `--edge-check` dry run (`logs/figure_edge_check_20261021T193148.jsonl`): clean 3411, ambiguous 120
  (was 176 + 1 at L15's re-check); none of the 53 changed rows is flagged on any edge (no ink cut, no sliver left).
- 2026-10-22 00:15 PDT: `uv run python scripts/validate_db.py`: 0 errors, 0 warnings. `build_views.py` not run.
  Re-rendered crops viewed (outer 70 px band of every changed edge of all 53 crops): no text sliver at a changed
  edge, no figure content cut. Temp images, the backup extract and 2 superseded dry-run reports (191600, 192127)
  deleted; kept: reports 192649 (dry run), 192937 (apply), edge-check 193148; debug scripts in the scratchpad.

## Shrunk rows (53)

`ectc51687.2025.00007-f03`, `ectc51846.2026.00123-f03`, `ectc51846.2026.00123-f05`, `ectc51846.2026.00123-f06`, `ectc.2011.5898527-f02`, `ectc.2011.5898527-f04`, `ectc51529.2024.00096-f08`, `ectc51529.2024.00334-f09`, `ectc51687.2025.00071-f02`, `ectc51687.2025.00076-f05`, `ectc51687.2025.00076-f09`, `ectc51687.2025.00142-f04`, `ectc51846.2026.00115-f05`, `ectc51846.2026.00153-f10`, `ectc51846.2026.00204-f04`, `ectc51846.2026.00204-f08`, `ectc51846.2026.00204-f12`, `ectc51846.2026.00336-f01`, `ectc51846.2026.00336-f05`, `ectc51846.2026.00346-f02`, `ectc51846.2026.00424-f08`, `ectc51906.2022.00140-f02`, `ectc51906.2022.00136-f18`, `ectc51909.2023.00009-f20`, `ectc51909.2023.00151-f01`, `ectc51909.2023.00219-f16`, `eptc53413.2021.9663896-f07`, `eptc53413.2021.9663896-f10`, `icep-iaac64884.2025.11003038-f02`, `iwlpc52010.2020.9375855-f05`, `iwlpc52010.2020.9375855-f07`, `itherm55375.2024.10709474-f09`, `2380-4505-2020.1.000042-f02`, `2380-4505-2020.1.000042-f15`, `tcpmt.2026.3736233-f03`, `tcpmt.2026.3736233-f11`, `tcpmt.2026.3736233-f28`, `ectc51909.2023.00240-f13`, `001c.74770-f08` (top and bottom), `estc55720.2022.9939446-f05`, `estc55720.2022.9939446-f13`, `estc55720.2022.9939446-f14`, `estc55720.2022.9939446-f17`, `eptc67330.2025.11392620-f10` (top and bottom), `001c.129276-f05`, `ectc51846.2026.00202-f02`, `001c.147115-f03`, `001c.147115-f06`, `001c.147115-f07`, `001c.147115-f08`, `ectc51529.2024.00392-f07`, `eptc67330.2025.11392196-f13`, `ectc51909.2023.00174-f03`

## No glyph inside the bbox (35, unchanged, nothing to trim)

`itherm45881.2020.9190542-f02`, `vlsitechnologyandcir65830.2026.11577576-f02`, `iedm19573.2019.8993659-f05`, `ectc.2019.00-29-f04`, `ectc51529.2024.00153-f12`, `ectc51687.2025.00027-f13`, `ectc51687.2025.00049-f15`, `ectc51687.2025.00049-f16`, `ectc51906.2022.00142-f08`, `ectc51909.2023.00179-f02`, `ectc51909.2023.00274-f02`, `eptc59621.2023.10457612-f09`, `vlsitechnologyandcir65830.2026.11577374-f01`, `vlsitechnologyandcir65830.2026.11577374-f06`, `vlsitechnologyandcir65830.2026.11577374-f07`, `vlsitechnologyandcir65830.2026.11577374-f09`, `vlsitechnologyandcir65830.2026.11577374-f12`, `vlsitechnologyandcir46783.2024.10631441-f05`, `vlsitechnologyandcir46783.2024.10631441-f08`, `001c.74577-f04`, `001c.74577-f05`, `001c.74770-f09`, `001c.74770-f11`, `ectc51906.2022.00240-f07`, `iedm50572.2025.11353855-f09`, `iedm50572.2025.11353855-f11`, `iedm50572.2025.11353855-f13`, `iedm50572.2025.11353855-f14`, `iedm50572.2025.11353487-f01`, `iedm50572.2025.11353487-f04`, `iedm50572.2025.11353487-f15`, `001c.129276-f04`, `ectc51846.2026.00202-f06`, `tcpmt.2026.3672227-f18`, `tcpmt.2026.3672227-f19`

## Ambiguous rows (55, unchanged)

Reasons: `label` = a straddling line is a short label line: "(a) (b)" panel-label rows on the edge, figure-internal
text, or garbled text layers (ectc51909.2023.00155 +29 shift, iedm45741.2023.10413759 control-char glyphs);
`figure_ink` = non-text ink in the strip that would be removed: framed layouts (IEDM 2025 / VLSI 2026 column frame
lines), images or table rules touching the descenders/cap tops of the text (hairline slivers), table footnotes;
`touch` = figure ink on the pixel line next to the text.

- bottom label (15): `vlsitechnologyandcir46783.2024.10631478-f01`, `ectc51529.2024.00128-f10`, `ectc51529.2024.00321-f04`, `ectc51687.2025.00158-f01`, `ectc51909.2023.00155-f14`, `ectc51909.2023.00155-f15`, `ectc51909.2023.00155-f16`, `iedm45625.2022.10019499-f07`, `iedm45741.2023.10413759-f01`, `iedm45741.2023.10413759-f04`, `iedm45741.2023.10413759-f05`, `iedm45741.2023.10413759-f12`, `iedm45741.2023.10413829-f08`, `vlsitechnologyandcir46783.2024.10631441-f04`, `ectc51909.2023.00091-f03`
- top figure_ink (14): `itherm45881.2020.9190542-f13`, `vlsitechnologyandcir65830.2026.11577576-f03`, `ectc51687.2025.00027-f10`, `ectc51906.2022.00113-f06`, `ectc51909.2023.00230-f05`, `vlsitechnologyandcir65830.2026.11577374-f08`, `001c.147288-f02`, `001c.74748-f11`, `ectc51846.2026.00274-f07`, `001c.74770-f01`, `001c.74770-f06`, `ectc51687.2025.00060-f05`, `estc60143.2024.10712019-f08`, `ectc51909.2023.00091-f05`
- bottom figure_ink (11): `ectc51687.2025.00076-f07`, `ectc51687.2025.00359-f06`, `iedm45741.2023.10413759-f03`, `vlsitechnologyandcir65830.2026.11577374-f10`, `vlsitechnologyandcir65830.2026.11577374-f11`, `tcpmt.2026.3717381-f24`, `iedm50572.2025.11353855-f10`, `iedm50572.2025.11353487-f07`, `iedm50572.2025.11353487-f09`, `iedm50572.2025.11353487-f10`, `iedm50572.2025.11353487-f16`
- right label (3): `ectc.2013.6575597-f12`, `eptc56328.2022.10013262-f11`, `tcpmt.2026.3736233-f06`
- right figure_ink (2): `ectc51846.2026.00035-f02`, `iedm50572.2025.11353855-f04`
- top touch (2): `eptc62800.2024.10909935-f07`, `eptc62800.2024.10909809-f05`
- top label (2): `iedm45741.2023.10413759-f02`, `vlsitechnologyandcir46783.2024.10631441-f01`
- bottom + top figure_ink (2): `vlsitechnologyandcir65830.2026.11577374-f03`, `2380-4505-2020.1.000042-f01`
- left figure_ink (1): `ectc.2013.6575597-f11`
- bottom/left/right/top label (1): `iedm45741.2023.10413759-f09`
- bottom + top label (1): `iedm45741.2023.10413759-f13`
- right + top figure_ink (1): `2380-4505-2020.1.000042-f03`

## Hand-off

Status: done. 143 sliver rows checked: 53 shrunk (55 edges), 35 no_glyph (fine as is), 55 ambiguous (unchanged).
Files written: `scripts/crop_figures.py` (`--sliver-check`, `text_only_pixmap`, `sliver_shrink`; `--edge-check`
unchanged), `data/figures.csv` (53 rows), 53 local key crops, `cache/backups/L29_figures_before_sliver_20261021T191353.zip`,
logs above, this file. No git writes; no network; no build_views.py.

Open items:
1. Real visible slivers among the ambiguous rows need manual bboxes (agent or Wentao), mainly
   iedm45741.2023.10413759 (f01-f05, f09, f12, f13: edges cut through caption lines; garbled text layer),
   iedm45741.2023.10413829-f08, iedm50572.2025.11353487 (f07/f09/f10/f16, framed), vlsitechnologyandcir65830.2026.11577374
   (f03/f08/f10/f11, framed), ectc51909.2023.00155-f14/f15/f16 (caption cap tops, garbled layer). The rest are hairline
   descender/cap-top slivers or panel-label lines on the edge.
2. `--sliver-check --apply` re-run later is idempotent on the changed rows (they are clean) but would apply any new
   shrink proposals; review its dry run first.
