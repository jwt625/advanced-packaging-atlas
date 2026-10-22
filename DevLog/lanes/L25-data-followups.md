---
title: L25 data follow-ups - manual figure bboxes, text-layer scan, affiliation minors (A5 F1-F4), DB rows for L17 figures
date: 2026-10-21
status: done 2026-10-21 (validator 0 errors, 0 warnings; build_views.py not run, coordinator only)
owner: L25 (lane subagent)
scope: data/figures.csv (5 rows) + their key crops; references/<id>/TEXT_LAYER_WARNING.md (4 ids);
  scripts/recheck_text_layers.py (--scan-text); config/geo_site_overrides.csv, data/org_sites.csv,
  data/author_affiliations.csv (001c.147203 Shinko rows), data/organizations.csv (Tyndall row);
  data/_staging/g009/BATCH_REPORT.md; data/_staging/AFFILIATION_INSTRUCTIONS.md; data/_staging/<new batch>/ and the
  merged data tables (test_vehicles, components, metrics, figures as needed); this notes file
---

# L25: data follow-ups

Parent: [DevLog-013](../DevLog-013-backlog-round-1.md) (L15, L16, A5 F1-F4, L17 DB-row requests).
Sources: [L15 notes](L15-figure-detector.md), [L16 notes](L16-data-hygiene.md),
[audit A5](../audits/round1_audit_A5_2026-10-21.md), `config/package3d/RESEARCH_SOTA_{COWOS,EMIB}.md`.

## Plan (written 2026-10-21 18:49 PDT, before any edit)

A. Figures (5 rows): ectc51687.2025.00027-f06, ectc51529.2024.00155-f10, iedm45625.2022.10019499-f08,
   iedm45625.2022.10019499-f13, iedm45741.2023.10413759-f10.
   - Render each page with the 0.05 grid (`crop_figures.py --paper ID --grid N --out <scratch>`), read the full
     figure/table extent incl. labels and footnotes, test crops (`--bbox`) in the scratchpad, view them.
   - Write bbox to figures.csv: bbox_source manual, cand_id empty, note appended with the date.
   - Re-crop the 5 key crops with `crop_figures.py --paper ID ... --force` (row-scoped, not a global --apply).
   - If iedm45741.2023.10413759-f10 is fixed manually here, record that the `--skip` is no longer required.
   - The ~120-row sliver shrink pass stays open (not started).
B. Text layers.
   - Verify micro-as-'P' damage in text.md + page renders for ectc51909.2023.00021, ectc51909.2023.00235,
     ectc51906.2022.00142, ectc51529.2024.00011; write TEXT_LAYER_WARNING.md in the L16 format.
   - Add `--scan-text` to scripts/recheck_text_layers.py: per page of text.md, rule 1 shift29 (>= 50 Cc chars and
     lines with U+0003 decoded by +29 have common-word ratio >= 0.05), rule 2 unit_loss regex (>= 3 hits/page);
     report-only, JSONL to logs/recheck_text_layers_scan_<ts>.jsonl; never writes text.md / source.json.
   - Run over all references; compare hits vs existing warnings.
C. Affiliations (A5).
   - F1: overrides for Onto (01887), Northrop Grumman (21240), NEC (Nakahara-ku 211-8666); new site for Shinko
     "36 Kita-Owaribe, Nagano 381-0014" and point the 8 rows of 001c.147203 at it. Read geocode_sites.py first;
     re-run only on these sites (<= 1 request/s, cached); diff org_sites.csv to prove no other site changed.
   - F2: Tyndall parent_org UCC: light web read of Tyndall/UCC official page; keep with URL + date, else clear.
   - F3: g009 BATCH_REPORT.md wording 3+3+2.
   - F4: AFFILIATION_INSTRUCTIONS.md: HQ-country fallback with mandatory row note.
D. DB rows (L17 requests): 00091 Fig. 2/3, 00174 Fig. 1, ectc51687.2025.00051 Fig. 6.
   - Read packaging-distill SKILL.md, existing rows for these papers, page renders; add only missing values with
     locators; stage under data/_staging/<new batch>/, merge with the existing merge script; projection values marked
     per the skill (or note field + schema gap).
Finish: `uv run python scripts/validate_db.py` 0 errors; list of changed files; hand-off.

Backups before data edits: zip of the touched data files to `cache/backups/L25_*_<ts>.zip`.

## Progress log

- 2026-10-21 18:49 PDT: plan written.
- 2026-10-21 18:49 PDT: backup `cache/backups/L25_data_before_20261021T184919.zip` (data/*.csv, geo overrides, g009
  report, AFFILIATION_INSTRUCTIONS.md, recheck script, the 5 old key crops).
- 2026-10-21 18:52 PDT: A done. 5 rows of data/figures.csv set to manual bboxes from 0.05-grid page renders plus
  PDF text/image/drawing coordinates (pymupdf), test crops viewed (200-600 dpi zooms). Old key crops removed (in the
  backup zip) and re-rendered with `crop_figures.py --paper <id>` (skip-existing, so only these 5 were written).
  Diff vs the backup: exactly these 5 lines changed.

  | fig_id | old bbox (source) | new bbox | fix |
  |---|---|---|---|
  | ectc51687.2025.00027-f06 | 0.5472,0.4366,0.8795,0.5816 (candidate p02_tablei) | 0.5472,0.4366,0.8840,0.5920 | footnote line "1) Electroless plating, 2) Electroplating" (y 0.577-0.588) included |
  | ectc51529.2024.00155-f10 | 0.5316,0.6921,0.863,0.8385 (candidate p02_tableii) | 0.5316,0.6921,0.8820,0.8480 | footnote line (x to 0.876, y to 0.843) included |
  | iedm45625.2022.10019499-f08 | 0.365,0.272,0.622,0.420 (manual) | 0.365,0.272,0.622,0.4210 | "(b)" label bottom (image ends 0.4224, panel frame 0.4208-0.4221) |
  | iedm45625.2022.10019499-f13 | 0.495,0.745,0.906,0.842 (manual) | 0.495,0.745,0.906,0.8447 | "(a)"/"(b)" labels (0.8339-0.8441) above the caption (0.8450) |
  | iedm45741.2023.10413759-f10 | 0.45,0.752,0.585,0.882 (manual) | 0.448,0.751,0.5770,0.880 | right edge between the plot frame (0.5747) and the Fig. 11 dashed frame (0.579); bottom above the caption |

  Table titles stay outside the bbox (as in the candidate crops; title text is in `caption`). Notes: appended
  "manual bbox (L25 2026-10-21, page render): <fix>; was <source> <old bbox>"; bbox_source manual, cand_id empty.
- 2026-10-21 18:52 PDT: edge check dry run on the 4 papers (`logs/figure_edge_check_20261021T1852{06,08,09,27}.jsonl`;
  two runs in the same second share 185208): f06, f10 (00155), f13 now clean; iedm45741.2023.10413759-f10 clean after
  the right-edge fix (first try at x1 0.575 sat on the plot frame; detector proposed 0.5784, set 0.5770 by zoom);
  iedm45625.2022.10019499-f08 stays `ambiguous` (bottom `reach`: framed IEDM panel; visually complete, (b) intact).
  Consequence: `--skip iedm45741.2023.10413759-f10` is no longer needed for `crop_figures.py --edge-check --apply`
  (the row is clean now); keeping it is harmless.
- Not started (open): the ~120-row caption/body sliver shrink pass (L15 list).
- 2026-10-21 18:54 PDT: B warnings. Damage verified in text.md (per-page greps) and against page renders (line crops
  at 250 dpi of the hit lines: 00021 p.1/p.2/p.4, 00235 p.1/p.2, 00142 p.4 x2, 00011 p.3; all show a real 'μm',
  '°C', 'φ' or readable label where the text layer has 'P', 'q', 'I' or a +29 shift). 4 TEXT_LAYER_WARNING.md
  written in the L16 format (first line "text layer partly damaged (flagged 2026-10-21, DevLog-013 L16 follow-up
  L25)" + ratios from source.json):

  | paper_id | damage (pages) |
  |---|---|
  | ectc51909.2023.00021 | micro as 'P' (p.2-p.4); diameter as 'I' (p.4 'I30 Pm via'); +29-shifted heading/labels (p.1 'Test vehicle', p.5 'Insertion loss', p.6 conclusion heading) |
  | ectc51909.2023.00235 | micro as 'P' (p.1-p.7, no real μm); degree as 'q' (p.2-p.3, '240 qC', 'ppm/qC') |
  | ectc51906.2022.00142 | micro as 'P' (p.2, p.4, p.5); +29-shifted figure labels (p.4) |
  | ectc51529.2024.00011 | micro as 'P' (p.3 x4, p.6 x1) |

- 2026-10-21 18:55 PDT: `--scan-text` added to scripts/recheck_text_layers.py (L16 rules 1 and 2 exactly; report-only;
  skips papers whose warning is "unusable" = tesseract OCR; default mode unchanged, wrapped in `recheck()`).
  Run: `uv run python scripts/recheck_text_layers.py --scan-text` -> `logs/recheck_text_layers_scan_20261021T185504.jsonl`.
  289 text.md scanned, 18 skipped (OCR warning), 11 flagged, all 11 carry a warning, 0 flagged without a warning.
  - shift29: 00048 p.1-6, 00155 p.1-8, 00252 p.1-7, 10631441 p.1, 10631478 p.1-2 (= L16 prototype, no other paper).
  - unit_loss: 00011 p.3, 00142 p.2/4/5, 00021 p.2-4, 00023 p.1-3/5/7, 00048 p.3, 00155, 00235 p.1/2/5/6/7, 00252,
    tcpmt.2021.3104326 p.4, 10631478 p.2.
  - Warned but not flagged (other damage types, outside the two rules, expected): ectc51529.2024.00094 (Lao/Thai
    unit glyphs), ectc51906.2022.00140 (Arabic-block glyphs; its +29 labels on p.2 are below 50 control chars),
    ectc51909.2023.00153 (table numerals), ectc51909.2023.00174 (minor letter substitutions).
  - Pages below the 3-hit threshold are not flagged (00011 p.6 has 1 hit; 00235 p.3/p.4 have 2): the warnings list
    them from the manual read. ruff is not installed in the project env (not run); `--help` and the scan run clean.
- 2026-10-21 18:58 PDT: C done.
  - F1: `config/geo_site_overrides.csv` (CRLF kept): NG and NEC rows (L14 street-address queries that had not
    resolved) now query the printed postcode / printed neighbourhood; rows added for Onto (postcode) and the new
    Shinko site. Geocoder run on these 4 only (`scripts/geocode_sites.py <scratch>/geo_in.csv <scratch>/geo_out.csv`,
    dry run first; 4 + 1 new Nominatim requests at the script's 1.1 s spacing, cached in
    `data/_staging/geo_cache/responses.jsonl`; logs `logs/geocode_20261021T1857*.log`). Shinko re-queried once with
    the OSM district name (first hit was a node on Route 18 named after the district).

    | site_id | before | after |
    |---|---|---|
    | onto-innovation-massachusetts | 42.37888,-72.03237 region (MA centre) | 42.55855,-71.17246 postcode ("01887, Wilmington, Middlesex County, MA") |
    | northrop-grumman-baltimore-md | 39.29088,-76.61076 city (Baltimore centre) | 39.20799,-76.65837 postcode ("21240, Anne Arundel County, MD") |
    | nec-kawasaki-shi | 35.53066,139.70377 city (Kawasaki centre) | 35.57401,139.6688 city (OSM neighbourhood 下沼部 / Shimonumabe, Nakahara-ku; osm:relation/12765937) |
    | shinko-electric-industries-kita-owaribe-nagano (new) | - | 36.65467,138.23816 city (OSM place 大字北尾張部 / Kita-Owaribe, Nagano-shi; osm:node/9106379294; OSM postcode 381-0015 vs printed 381-0014) |

    Postcode hits carry no OSM id (source_ref left empty instead of "osm:None/None"). Precision stays "city" for the
    two neighbourhood/district points (no enum value between postcode and city). The 8 Shinko rows of 001c.147203:
    locality "Nagano" -> "Kita-Owaribe, Nagano" (printed address minus house number and postcode; note keeps the full
    print). `shinko-electric-industries-nagano` (region) unchanged and still used by ectc51687.2025.00178 (5 rows).
    Diff vs backup: org_sites 3 rows changed + 1 appended; author_affiliations 8 rows (locality only); no other site
    changed.
  - F2: kept. Primary source: tyndall.ie home page, "Tyndall is part of University College Cork"
    (https://www.tyndall.ie/, retrieved 2026-10-21; /about-us/ has only a UCC logo). Recorded in the Tyndall row notes.
    Instituto de Telecomunicações stays without a parent (not in scope).
  - F3: `data/_staging/g009/BATCH_REPORT.md` row eptc67330.2025.11392176 "3x3 grid" -> "3+3+2 grid (8 authors)".
  - F4: `data/_staging/AFFILIATION_INSTRUCTIONS.md` country rule: HQ fallback when neither country nor city is printed,
    mandatory note "country = org HQ, not printed", locality empty (precedents cited).
  - `uv run python scripts/validate_db.py`: 0 errors, 0 warnings.
- 2026-10-21 19:05 PDT: D done. Pre-check: none of the requested values were in data/ (the original distillations
  listed 00091 Fig. 2, 00174 Fig. 1 transistor counts and 00051 Fig. 6 under evidence `excluded`). Figures re-read
  from 300-450 dpi renders (00091 p.1 Fig. 2, p.2 Fig. 3; 00174 p.1 Fig. 1; 00051 p.4 Fig. 6).
  - Batch `data/_staging/l25` (builder script in the scratchpad): all existing packaging-table rows of the 3 papers
    unchanged + new rows; evidence copies edited (excluded lines narrowed, conflicts/entries/revisions added);
    `BATCH_REPORT.md`. `validate_db.py --staging data/_staging/l25` 0/0; `merge_staging.py data/_staging/l25 --apply
    --replace` (backup `cache/backups/L25_before_merge_l25_20261021T190433.zip`).
  - New: 14 TVs (tv_kind other), 21 components, 7 interconnects, 10 metrics, 3 figures (candidate crops checked);
    papers.n_test_vehicles 00091 2->5, 00174 5->9, 00051 3->10.

    | paper | TVs | values |
    |---|---|---|
    | ectc51909.2023.00091 | c, d, e | 2016/2020/2022: N16/N12, N7 SoC, N5 SoIC; 1.75X ~1400, 2.2X ~1760, 3.3X ~2800 mm2; HBM2/2E/3 at 1.8/3.2/6.4 Gbps; 4/6/8 HBM; 32/96/128 GB; 0.9/2.5/6.5 TB/s (all "Max." per generation) |
    | ectc51909.2023.00174 | f, g, h, i | 1.5X 1 SoC + 4 HBM, 2X 1 + 6, 3X 2 + 8 (CoWoS-S, >1T transistors), 4X 2 + 12 (CoWoS-L, dotted = projection) |
    | ectc51687.2025.00051 | d .. j | 2017/2018 55x55 FCBGA 6 bridges 1.1-1.8x; 2021 56.5x77.5 FCLGA 10, 2.2x; 2022 56.5x100 FCLGA 14, 2.8x; 2022 62.5x77.5 FCBGA 11, 3.1x; 2024 72.5x82.5->75x113 FCBGA 11, ~4.5x; 2025/6 ~120x120, 30+, >8x; 2027+ >>120x180, >>38, >>12x (projection); D2D pitch 55/55/55/55/45/40/25 um |

  - Projection marking: basis `author_estimate` + notes starting "ROADMAP PROJECTION" (00174-i, 00051-j).
    Schema gap (for the coordinator): no field marking projected/roadmap values; additive proposal: a
    `test_vehicles.projection` yes/no (or a `roadmap` tv_kind).
  - NOT entered: 00091 Fig. 3 (3x interposer 58.9 x 44.1 mm, 2 SoC + 1 chiplet + 8 HBM). The paper attributes it to
    ref [5] ("has been developed, as shown in Figure 3 [5]"; Huang et al., fifth-generation CoWoS-S), so schema rule
    (a) excludes it; it stays in evidence `excluded`. Ref [5] is not cached (no retrieval).
  - Product names in 00051 Fig. 6 (Sapphire Rapids, Ponte Vecchio, Granite Rapids) stay in notes (image captions; the
    2024 attribution is ambiguous, RESEARCH_SOTA_EMIB C3). technology_name set only where printed (CoWoS, CoWoS-S /
    CoWoS-L by Fig. 1 arrow, EMIB-T for the 25 um pathfinding point).
  - Merge side effect: `merge_staging.py --replace` moves the 3 papers' rows to the end of each staged table
    (papers, test_vehicles, components, stack_layers, interconnects, process_flows, process_steps,
    electrical_interfaces, metrics, figures). Set comparison vs the pre-merge copy: 0 rows removed, only the new rows
    added, papers changed in n_test_vehicles only; CRLF kept.
  - Key crops rendered for the 3 new figure rows (`crop_figures.py --paper <id>`, skip-existing).
- 2026-10-21 19:06 PDT: `uv run python scripts/validate_db.py` -> 0 errors, 0 warnings. build_views.py not run.

## Hand-off

Status: A-D done; validator 0/0; no git writes; build_views.py not run (coordinator).

Open items:
1. ~120-row caption/body sliver shrink pass (L15 list) not started.
2. iedm45625.2022.10019499-f08 stays `ambiguous` in the edge check (framed panel; visually complete).
3. `--skip iedm45741.2023.10413759-f10` no longer needed (row is edge-check clean now); harmless to keep.
4. 00091 Fig. 3 values need ref [5] (fifth-generation CoWoS-S, ECTC 2021) cached and distilled, if wanted.
5. Schema gap: no projected/roadmap marker (see D).
6. Pages below the `--scan-text` 3-hit threshold are listed only in the manual warnings (00011 p.6, 00235 p.3-p.4).

Files changed (tracked unless noted): data/figures.csv, data/papers.csv, data/test_vehicles.csv,
data/components.csv, data/stack_layers.csv (order only), data/interconnects.csv, data/process_flows.csv (order
only), data/process_steps.csv (order only), data/electrical_interfaces.csv (order only), data/metrics.csv,
data/org_sites.csv, data/author_affiliations.csv, data/organizations.csv, data/evidence/{ectc51909.2023.00091,
ectc51909.2023.00174,ectc51687.2025.00051}.yaml, data/_staging/l25/ (new), data/_staging/g009/BATCH_REPORT.md,
data/_staging/AFFILIATION_INSTRUCTIONS.md, config/geo_site_overrides.csv, scripts/recheck_text_layers.py,
references/{ectc51909.2023.00021,ectc51909.2023.00235,ectc51906.2022.00142,ectc51529.2024.00011}/TEXT_LAYER_WARNING.md,
this file. Local only (git-ignored): 8 key crops under references/*/figures/key/, geocoder cache, logs, backups.
