---
title: Lane L15 - figure detector bottom-clip of raster figures, edge-continuation post-pass over data/figures.csv
date: 2026-10-21
status: done (hand-off ready)
scope: scripts/figure_candidates.py, scripts/crop_figures.py, data/figures.csv (bbox and dependent fields), local crops
authors: Claude (lane L15 subagent), at Wentao Jiang's request
---

# L15: figure detector

Binding: DevLog-013 shared rules and row L15; DevLog-005 open detector item (36 % manual bboxes; ectc51846.2026.00416
and 00424 all manual); DevLog-009 open item (51/422 candidate rows clipped at the bottom, about 0.012 of page height;
coordinator scan "ink at bbox edge continues past it" + extend to the first blank gap; extended rows set to
`bbox_source: manual`, `cand_id` empty, note appended).

## Plan (2026-10-21 17:55)

1. Backup: `data/figures.csv`, all `references/*/figures/key/*.png`, all `candidates.json` into
   `cache/backups/L15_figures_before_bbox_fix_<ts>.zip`.
2. Root cause in `figure_candidates.py` on 00416, 00424 and a few other clipped rows: debug script in the scratchpad,
   compare the candidate rect against the image rects (`get_image_info`), drawings and labels, and the region limits.
3. Fix the detector; add a deterministic edge-continuation post-pass (shared function) that:
   - renders the page at a fixed dpi, grayscale; for each bbox edge tests whether ink in the 1-2 px band just inside
     the edge continues in the band just outside;
   - extends that edge outward to the first blank gap (row/column with no ink across the bbox span), with a max reach;
   - never shrinks; refuses (ambiguous) when the extension runs into a caption or body-text block, or exceeds the reach.
   Exposed as `crop_figures.py --edge-check` (dry-run report by default, `--apply` writes `data/figures.csv`).
4. Dry-run over all rows of `data/figures.csv`; list flagged rows; apply only unambiguous extensions; ambiguous rows
   listed here, unchanged.
5. Re-crop corrected rows (`--force` on those fig_ids only); view before/after for a sample incl. 00416 and 00424;
   delete own comparison images.
6. `scripts/validate_db.py` 0 errors. No `build_views.py`.

## TODO

- [x] Backup zip
- [x] Root cause
- [x] Detector fix
- [x] Edge-check post-pass
- [x] Dry-run over figures.csv; review
- [x] Apply unambiguous; re-crop; visual check
- [x] Validator
- [x] Hand-off

## Progress

- 2026-10-21 17:53: backup `cache/backups/L15_figures_before_bbox_fix_20261021T175322.zip` (figures.csv, 3528 key
  crops, 296 candidates.json; 677 MB stored).
- 17:55 root cause (debug script in the scratchpad, 00416 p.3): the caption block's raw bbox starts with a
  whitespace-only line one line height above the caption glyphs (Word-made PDFs put a blank span between image and
  caption). `page_candidates` uses the caption block top as the region bottom and then clips the region to it
  (`r &= ...region.y1`), so the raster image loses its bottom ~0.01 of page height (00416 Fig. 2: image bottom 0.387,
  caption block top 0.3769, caption glyphs start at ~0.400). Same for every caption of 00416 and 00424, and it
  matches the "about 0.012 of page height" of DevLog-009. Body-text and label rects had the same whitespace issue.
- 17:57 detector fix in `figure_candidates.py`:
  - `text_rect(b)`: block rect from non-blank spans; used for captions, caption continuation lines, body-text stops
    and labels; whitespace-only blocks are no longer labels.
  - `edge_extend(...)` post-pass on every candidate (see below).
  - Re-detection (no writes) of 00416/00424: new candidate bottoms match the manual bboxes the agents set within
    about 0.002 (e.g. 00416 Fig. 3 0.7558 -> 0.7661, manual 0.768; 00424 Fig. 10 0.3902 -> 0.4009, manual 0.40).
- 17:58-18:05 edge-continuation post-pass `edge_extend` (shared by the detector and `crop_figures.py --edge-check`):
  page render 120 dpi gray; an edge is cut when >= 3 pixels are ink (< 230) both on the last line inside and the first
  line outside; extend to the first all-blank pixel line over the bbox span (+ up to 3 blank px), max 0.08 of the page;
  extensions < 0.003 are "touch" (hairline on the edge), not applied. Refusals: `sliver` (the cut ink is a caption /
  body / page-wide text line straddling the edge), `text` (the added strip holds such a line, or any text line wider
  than half the bbox, or a long rotated margin stamp), `reach`. Extend-only by construction.
  - Iterations after visual review of contact sheets (old bbox red, new blue dashed):
    1. First guard (text role only) let IEDM framed figures extend through their captions (garbled text layer or the
       caption merged into another block, so the role was unknown) -> added the "wider than half the bbox" rule.
    2. 2380-4505-2020.1.000042 right edges extended over the rotated "Downloaded from ..." stamp -> long rotated lines
       count as page-wide text.
- 18:04 dry run over all 3528 rows (`logs/figure_edge_check_20261021T180435.jsonl`): clean 3199, extend 152,
  ambiguous 164, extend+ambiguous 13. Edge statuses: bottom extend 121 / sliver 80 / text 11 / reach 9; top extend 20
  / sliver 66 / text 11 / reach 4; left extend 18 / sliver 3 / reach 6; right extend 12 / sliver 13 / text 1 /
  reach 4. Rows with an extension: 165 (83 candidate, 82 manual).
- Visual review (contact sheets, all 51 rows with a top/left/right extension, the 24 largest and 24 random
  bottom-only extensions, zooms on 3 near-caption cases, all 18 bottom text/reach rows): extensions add the clipped
  image bottoms, BGA balls, "(a)/(b)/(c)/(d)" panel labels, axis tick labels, table bottom rules and footnotes; none
  reaches into a caption. Rejected: `iedm45741.2023.10413759-f10` (right edge grows into the neighbouring figure's
  dashed frame) -> `--skip`. Cosmetic but kept: IEDM framed figures where a left edge grows by ~0.004 to include the
  frame line.
- 18:10 fixed detector vs old candidates, no writes (scratchpad script, all 296 papers with candidates.json):
  old candidates.json 3405 regions, 713 (20.9 %) with a bottom edge cutting ink; fixed detector 3414 regions, 115
  (3.4 %) still flagged at the bottom (refused cases: caption/body slivers, framed IEDM figures), 258 flagged on any
  edge. `candidates.json` and `cand/*.png` were not regenerated (see open items).
- 18:14 apply: `uv run python scripts/crop_figures.py --edge-check --apply --skip iedm45741.2023.10413759-f10`
  (report `logs/figure_edge_check_20261021T181409.jsonl`): 164 rows extended, key crops of those rows re-rendered
  (200 dpi). Diff check against HEAD: only these 164 rows changed; 83 former candidate rows -> bbox, bbox_source
  manual, cand_id empty, note; 81 manual rows -> bbox, note. 0 edges moved inward. Note text: "[candidate <cand_id>]
  bbox <edges> edge cut through ink; extended to the first blank gap (L15 edge check 2026-10-21)".
  Extension sizes (dry run): bottom median 0.0067 of page height (max 0.0215), top median 0.0045, left 0.0044,
  right 0.0068.
- 18:16 re-check after apply (`logs/figure_edge_check_20261021T181633.jsonl`): clean 3351, ambiguous 176,
  extend+ambiguous 1 (the skipped row): the pass is idempotent.
- Before/after crops viewed for 8 applied rows (001c.147288-f05 SEM data bar, ectc51687.2025.00085-f01 BGA balls,
  ectc51687.2025.00076-f10 "(b)" label, iedm19573.2019.8993659-f01 "(c)" label, eptc53413.2021.9663896-f21 plot
  bottom, iedm45741.2023.10413829-f01 TEM right side, ectc51909.2023.00150-f13 plot top, ectc51529.2024.00155-f10
  unchanged ambiguous): all applied crops complete, no caption text added. The named papers ectc51846.2026.00416 and
  00424 are already clean in `figures.csv` (all manual except 00416-f14); old vs fixed-detector candidate crops viewed
  side by side for 12 figures: old ones lose the PCB/legend/axis titles/bottom panel row, fixed ones are complete.
- 18:18 `uv run python scripts/validate_db.py`: 0 errors, 0 warnings. `build_views.py` not run.
- Own temp files deleted (contact sheets, zooms, before crops, 3 superseded dry-run reports, a stray empty
  `detcmp.jsonl`). Kept: debug scripts in the scratchpad (not tracked), reports 180435 (dry run), 181409 (apply),
  181633 (re-check) under `logs/`.

## Ambiguous rows (not changed; from the post-apply re-check)

Status meaning: `sliver` = the edge cuts a caption/body/page-wide text line (bbox holds a text sliver; the figure is
usually complete; fixing needs a shrink, out of scope); `text` = a blank gap exists but the added strip would hold
caption/body text or a wide line; `reach` = no blank gap within 0.08 of the page (framed figures, page-filling
images). Sampled visually (all 18 bottom text/reach rows, 21 sliver rows): most are complete figures with a caption
or frame touching the bbox edge. Seen as real content clips needing a manual bbox:
- `ectc51687.2025.00027-f06` (Table I footnote line cut), `ectc51529.2024.00155-f10` (table footnote cut at the
  right), `iedm45625.2022.10019499-f08` ("(b)" label under the lower panel cut), `iedm45625.2022.10019499-f13`
  ("(a)"/"(b)" labels cut), `iedm45741.2023.10413759-f10` (skipped: the right-edge extension reaches into the
  neighbouring figure's dashed frame; the bottom is a caption sliver).

Full list by edge status:

- bottom sliver (60): `001c.129276-f05`, `001c.147115-f03`, `001c.147115-f06`, `001c.147115-f08`, `001c.74577-f05`, `2380-4505-2020.1.000042-f15`, `ectc.2011.5898527-f02`, `ectc.2011.5898527-f04`, `ectc.2019.00-29-f04`, `ectc51529.2024.00128-f10`, `ectc51529.2024.00155-f10`, `ectc51529.2024.00321-f04`, `ectc51529.2024.00392-f07`, `ectc51687.2025.00076-f05`, `ectc51687.2025.00076-f07`, `ectc51687.2025.00076-f09`, `ectc51687.2025.00158-f01`, `ectc51687.2025.00359-f06`, `ectc51846.2026.00123-f03`, `ectc51846.2026.00123-f05`, `ectc51846.2026.00123-f06`, `ectc51846.2026.00202-f02`, `ectc51846.2026.00204-f04`, `ectc51846.2026.00204-f12`, `ectc51846.2026.00336-f01`, `ectc51846.2026.00424-f08`, `ectc51906.2022.00136-f18`, `ectc51906.2022.00140-f02`, `ectc51906.2022.00142-f08`, `ectc51909.2023.00091-f03`, `ectc51909.2023.00155-f14`, `ectc51909.2023.00155-f15`, `ectc51909.2023.00155-f16`, `ectc51909.2023.00179-f02`, `eptc59621.2023.10457612-f09`, `estc55720.2022.9939446-f05`, `estc55720.2022.9939446-f13`, `estc55720.2022.9939446-f14`, `estc55720.2022.9939446-f17`, `icep-iaac64884.2025.11003038-f02`, `iedm45625.2022.10019499-f07`, `iedm45741.2023.10413759-f01`, `iedm45741.2023.10413759-f04`, `iedm45741.2023.10413759-f05`, `iedm45741.2023.10413759-f12`, `iedm50572.2025.11353487-f07`, `iedm50572.2025.11353487-f09`, `iedm50572.2025.11353487-f10`, `iedm50572.2025.11353487-f16`, `iedm50572.2025.11353855-f14`, `iwlpc52010.2020.9375855-f05`, `tcpmt.2026.3717381-f24`, `tcpmt.2026.3736233-f03`, `tcpmt.2026.3736233-f11`, `tcpmt.2026.3736233-f28`, `vlsitechnologyandcir46783.2024.10631441-f04`, `vlsitechnologyandcir46783.2024.10631441-f05`, `vlsitechnologyandcir46783.2024.10631478-f01`, `vlsitechnologyandcir65830.2026.11577374-f01`, `vlsitechnologyandcir65830.2026.11577374-f11`
- top sliver (50): `001c.129276-f04`, `001c.147115-f07`, `001c.147288-f02`, `001c.74577-f04`, `001c.74748-f11`, `001c.74770-f01`, `001c.74770-f06`, `001c.74770-f09`, `001c.74770-f11`, `ectc51529.2024.00096-f08`, `ectc51529.2024.00334-f09`, `ectc51687.2025.00007-f03`, `ectc51687.2025.00027-f10`, `ectc51687.2025.00027-f13`, `ectc51687.2025.00049-f15`, `ectc51687.2025.00049-f16`, `ectc51687.2025.00060-f05`, `ectc51687.2025.00071-f02`, `ectc51687.2025.00142-f04`, `ectc51846.2026.00115-f05`, `ectc51846.2026.00153-f10`, `ectc51846.2026.00202-f06`, `ectc51846.2026.00204-f08`, `ectc51846.2026.00274-f07`, `ectc51846.2026.00336-f05`, `ectc51846.2026.00346-f02`, `ectc51906.2022.00113-f06`, `ectc51909.2023.00009-f20`, `ectc51909.2023.00091-f05`, `ectc51909.2023.00151-f01`, `ectc51909.2023.00174-f03`, `ectc51909.2023.00219-f16`, `ectc51909.2023.00230-f05`, `ectc51909.2023.00240-f13`, `ectc51909.2023.00274-f02`, `eptc53413.2021.9663896-f07`, `eptc53413.2021.9663896-f10`, `eptc62800.2024.10909809-f05`, `eptc62800.2024.10909935-f07`, `eptc67330.2025.11392196-f13`, `estc60143.2024.10712019-f08`, `itherm45881.2020.9190542-f02`, `itherm45881.2020.9190542-f13`, `itherm55375.2024.10709474-f09`, `iwlpc52010.2020.9375855-f07`, `tcpmt.2026.3672227-f18`, `tcpmt.2026.3672227-f19`, `vlsitechnologyandcir65830.2026.11577374-f07`, `vlsitechnologyandcir65830.2026.11577374-f08`, `vlsitechnologyandcir65830.2026.11577576-f03`
- bottom text (10): `ectc51687.2025.00027-f06`, `ectc51909.2023.00155-f08`, `ectc51909.2023.00155-f09`, `estc60143.2024.10712070-f02`, `estc60143.2024.10712129-f12`, `iedm45625.2022.10019499-f13`, `iedm45741.2023.10413759-f08`, `vlsitechnologyandcir46783.2024.10631478-f10`, `vlsitechnologyandcir65830.2026.11577374-f04`, `vlsitechnologyandcir65830.2026.11577576-f04`
- top text (9): `ectc32862.2020.00185-f05`, `ectc32862.2020.00185-f17`, `ectc32862.2020.00185-f22`, `ectc51529.2024.00258-f02`, `ectc51687.2025.00284-f06`, `ectc51906.2022.00061-f04`, `eptc56328.2022.10013262-f02`, `iedm50572.2025.11353855-f05`, `vlsitechnologyandcir46783.2024.10631478-f06`
- bottom sliver, top sliver (9): `001c.74770-f08`, `2380-4505-2020.1.000042-f01`, `eptc67330.2025.11392620-f10`, `iedm45741.2023.10413759-f13`, `iedm50572.2025.11353855-f09`, `iedm50572.2025.11353855-f10`, `vlsitechnologyandcir46783.2024.10631441-f01`, `vlsitechnologyandcir65830.2026.11577374-f03`, `vlsitechnologyandcir65830.2026.11577374-f10`
- right sliver (8): `2380-4505-2020.1.000042-f02`, `ectc.2013.6575597-f12`, `ectc51529.2024.00153-f12`, `ectc51846.2026.00035-f02`, `ectc51906.2022.00240-f07`, `eptc56328.2022.10013262-f11`, `iedm19573.2019.8993659-f05`, `tcpmt.2026.3736233-f06`
- bottom reach (6): `iedm45625.2022.10019499-f08`, `iedm50572.2025.11353487-f05`, `iedm50572.2025.11353487-f11`, `vlsitechnologyandcir46783.2024.10631478-f03`, `vlsitechnologyandcir65830.2026.11577374-f02`, `vlsitechnologyandcir65830.2026.11577374-f05`
- left reach (3): `eptc67330.2025.11392176-f01`, `iedm45741.2023.10413759-f06`, `iedm50572.2025.11353855-f15`
- bottom sliver, top reach (3): `iedm50572.2025.11353487-f01`, `iedm50572.2025.11353487-f04`, `iedm50572.2025.11353487-f15`
- left sliver (2): `ectc.2013.6575597-f11`, `vlsitechnologyandcir65830.2026.11577374-f06`
- bottom sliver, left reach (1): `vlsitechnologyandcir65830.2026.11577576-f02`
- left reach, top sliver (1): `iedm45741.2023.10413759-f02`
- bottom sliver, top text (1): `iedm45741.2023.10413759-f03`
- bottom sliver, left sliver, right sliver, top sliver (1): `iedm45741.2023.10413759-f09`
- bottom sliver, right extend (1): `iedm45741.2023.10413759-f10`
- right reach (1): `iedm45741.2023.10413759-f14`
- bottom sliver, right reach (1): `iedm45741.2023.10413829-f08`
- bottom reach, top sliver (1): `vlsitechnologyandcir65830.2026.11577374-f09`
- bottom text, top sliver (1): `vlsitechnologyandcir65830.2026.11577374-f12`
- bottom sliver, right reach, top sliver (1): `vlsitechnologyandcir46783.2024.10631441-f08`
- right sliver, top sliver (1): `2380-4505-2020.1.000042-f03`
- right text (1): `001c.129747-f20`
- bottom reach, right sliver (1): `iedm50572.2025.11353855-f04`
- bottom sliver, right sliver, top text (1): `iedm50572.2025.11353855-f11`
- left reach, right reach (1): `iedm50572.2025.11353855-f12`
- bottom sliver, right sliver, top sliver (1): `iedm50572.2025.11353855-f13`
- bottom reach, top reach (1): `iedm50572.2025.11353487-f13`

## Open items (for the coordinator)

1. `candidates.json` / `cand/*.png` were left as they are. Regenerating them with the fixed detector
   (`figure_candidates.py --all --force`) changes the bbox of most candidates, so the 2130 remaining
   `bbox_source: candidate` rows would no longer equal their candidate bbox ("copied exactly" rule; the validator only
   checks the cand_id). Options: leave as is (all cached papers are extracted; new papers get the fixed detector), or
   regenerate and re-sync candidate rows (extend-only) in one pass. Decision needed; backup of the current
   candidates.json is in the zip, `cand/*.png` is not.
2. The 5 rows listed above need a manual bbox (agent or Wentao). Top/bottom `sliver` rows (about 120) hold a
   caption/body-text sliver; trimming them needs a shrink, which this lane did not do.
3. IEDM framed layouts (`iedm45625`, `iedm45741`, `iedm50572`, VLSI 2026 papers) dominate the `reach` and `text`
   cases: frame lines keep ink continuous, so the blank-gap rule cannot decide there.
4. `--skip` exists for rows rejected on review; re-running `--edge-check --apply` later without
   `--skip iedm45741.2023.10413759-f10` would apply that rejected extension.

