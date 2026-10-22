---
title: L16 data hygiene - venue normalization, one test_standard cell, text-layer warnings for 11 papers
date: 2026-10-21
status: done 2026-10-21 (validator 0 errors; build_views.py not run, coordinator only)
owner: L16 (lane subagent)
scope: data/papers.csv (venue column only), data/metrics.csv (ectc51529.2024.00093-c-m1 test_standard only),
  references/<id>/TEXT_LAYER_WARNING.md (11 listed ids), data/schema/packaging.schema.yaml (venue enum),
  scripts/validate_db.py (venue check), this notes file
---

# L16: data hygiene

Parent: [DevLog-013](../DevLog-013-backlog-round-1.md) row L16. Sources: DevLog-009 open item (venue free text),
photonics-atlas request (test_standard), DevLog-005 lines ~78-82 (11 papers without TEXT_LAYER_WARNING.md).

## Plan (written 2026-10-21 17:54 PDT, before any edit)

1. Venue normalization
   - Survey: 296 papers, 254 distinct venue strings (acronym, acronym + year, ordinal + pages, full IEEE proceedings
     titles, journal citations with vol/no/pp).
   - Consumers checked: `app/src/lib/columns.ts` (Venue column, text + tooltip), `app/src/lib/Drawer.svelte` (venue +
     year side by side), `app/src/lib/logic.ts` (search haystack), `app/src/routes/explore/+page.svelte` (chart (i)
     papers per venue: counts by the raw string, so free text fragments it into ~254 bars; acronyms fix it),
     `scripts/build_views.py` (copies `venue` as a string; `per_venue_prefix` is an empty placeholder), photonics-atlas
     `adapters/pk.py` (`PkPaper.venue: str`, copied into its sources registry by `build_sources.py`). None parses the
     string; all accept an acronym.
   - Canonical form: venue acronym only (year is its own column). Acronyms = the keys of `config/venues.yaml`
     (screening venue list) plus the Crossref venues `IMAPS`, `IWLPC` (`scripts/prefilter.py` uses these literals) and
     `ICEPT` (one paper; distinct from ICEP, `config/venues.yaml` ICEP excludes "Electronic Packaging Technology").
   - Enforcement: schema enum `venue` and `papers.venue` -> `{type: enum, enum: venue}`, so `check_cell` rejects drift;
     plus a validator check that every `config/venues.yaml` key is in the enum (screening list and db enum stay in sync).
     Not adding ICEPT to `config/venues.yaml`: that file drives `xplore_fetch.py` and would schedule a fetch.
   - Apply with a script that rewrites only the venue cell, same quoting and line endings; diff to confirm.
   - Pages / vol / no. in the old strings are dropped from papers.csv; the complete before -> after list per paper_id
     is kept below so nothing is lost (they are also recoverable from the DOI).
2. `ectc51529.2024.00093-c-m1` test_standard: read the metric row and `references/ectc51529.2024.00093/text.md`; record a
   standard only if printed for that test, with locator; else leave empty and write "not stated" here.
3. Text-layer warnings: read existing TEXT_LAYER_WARNING.md files and `scripts/recheck_text_layers.py`; inspect each of
   the 11 text.md files for the damage (unit glyph loss, font-shifted p.1), with page numbers; write matching warnings;
   assess whether the detector could flag them and describe a detector change here (no mass rewrite).
4. `uv run python scripts/validate_db.py` -> 0 errors. No build_views.py run.

## Progress

- 2026-10-21 17:54 PDT: plan written; venue survey done (counts below).
- 2026-10-21 17:58 PDT: papers.csv venue cells rewritten (byte round-trip of the original verified identical before
  writing; CRLF and QUOTE_MINIMAL kept). Cell diff vs the pre-edit copy: only column `venue` changed, 258 of 296 rows
  (38 were already acronyms); git diff 258 lines. Schema enum `venue` added; validator check added; negative tests
  pass (a 'ECTC 2021' cell and a config venue missing from the enum each raise one error).
- 2026-10-21 17:59 PDT: test_standard for ectc51529.2024.00093-c-m1: not stated (details below); cell left empty.
- 2026-10-21 18:00 PDT: 11 TEXT_LAYER_WARNING.md written after reading each text.md (page-split scan + line greps);
  page renders checked for ectc51529.2024.00094 p.2 (unit glyph mapping) and ectc51529.2024.00093 p.4.
- 2026-10-21 18:01 PDT: read-only detector prototype over all references/*/text.md (scratchpad script, no writes).
- 2026-10-21 18:02 PDT: `uv run python scripts/validate_db.py` -> 0 errors, 185 warnings; all 185 are
  author_affiliations/org_sites warnings from the concurrent L14 edits (0 warnings at 17:58 before those edits landed).

## 1. Venue normalization

Canonical form: acronym only. Rules (regex on the old string, exactly one must match): ECTC (`^ECTC` or "Electronic
Components and Technology Conference"), EPTC (`^EPTC` or "Electronics Packaging Technology Conference"), ESTC, ICEPT
(`^ICEPT`), ICEP (`^ICEP` and `^ICEP-IAAC`; ICEP-IAAC 2025 is the joint ICEP 2025 meeting, and `config/venues.yaml`
ICEP covers 2025), IEDM, VLSI ("Symposium on VLSI Technology and Circuits"), TCPMT ("TCPMT", "IEEE TCPMT", "IEEE
Trans. Compon. Packag. Manuf. Technol.", the full journal name), IMAPS, ITherm, IWLPC, 3DIC. Every mapped venue agrees
with the paper_id prefix (ectc*, tcpmt*, eptc*, icep* and icep-iaac*, iedm*, estc*, vlsitechnologyandcir*, itherm*,
iwlpc*, icept*, 3dic*; IMAPS = 001c.* and 2380-4505-*). The year in the old strings agrees with `year` everywhere (the
one regex hit was a page number).

Dropped information: edition ordinal, pages, vol/no, session codes (ICEP "FB2-2"), city. Recoverable from the DOI;
the full old strings are listed below. If a citation line is wanted in the UI, the additive option is a new
`papers.citation` (or `pages`) column (coordinator decision, schema contract change).

Enforcement: `data/schema/packaging.schema.yaml` `enums.venue` = [ECTC, TCPMT, EPTC, 3DIC, IEDM, VLSI, EDAPS, EPEPS,
IRPS, ITherm, ICEP, ESTC, EMPC, IWLPC, IMAPS, ICEPT] (config/venues.yaml keys + Crossref venues IMAPS, IWLPC + ICEPT).
`papers.venue` stays `type: str`, so `columns_meta()` and the app see no type change (the list only appears as an
extra entry in atlas.json `enums`). `scripts/validate_db.py`: error when a papers.venue is not in `enums.venue`; error
when a `config/venues.yaml` key is missing from `enums.venue`. ICEPT is not added to config/venues.yaml (that file
drives xplore_fetch.py).

App impact (coordinator to check after build_views.py): the Venue column, its tooltip and the Drawer show the acronym
(the Drawer already prints the year beside it); the search haystack loses the year/pages text that sat in venue;
/explore chart (i) "papers per conference / journal" collapses from ~254 bars to 12. photonics-atlas `PkPaper.venue`
(str) keeps validating; its sources registry gets acronym-only venue text on its next build. Old staging dirs
(`data/_staging/b*`) hold free-text venues and would fail if re-validated with `--staging` (already merged).

| After | Papers | Unchanged (already acronym) | Distinct before strings | Before forms (examples) |
|---|---|---|---|---|
| ECTC | 201 | 15 | 187 | `ECTC 2021 (71st), pp. 723-728`; `ECTC 2025 (75th), pp. 481-486`; `ECTC 2024 (74th), pp. 546-550` |
| TCPMT | 22 | 2 | 19 | `IEEE TCPMT vol. 15 no. 7, pp. 1529-1537`; `IEEE TCPMT vol. 13 no. 9, pp. 1510-1515`; `IEEE TCPMT vol. 12 no. 3, pp. 462-468 (2022-03)` |
| EPTC | 20 | 2 | 16 | `EPTC 2023 (25th), pp. 1067-1070`; `EPTC 2023 (25th), pp. 120-124`; `EPTC 2023 (25th), pp. 683-686` |
| IMAPS | 17 | 14 | 4 | `IMAPS International Symposium`; `IMAPS 2025 Symposium (San Diego, CA), pp. 0044-0048`; `IMAPS 2025 Symposium (San Diego), pp. 0249-0254` |
| ICEP | 9 | 0 | 9 | `ICEP 2023, FE4-1, pp. 219-220`; `ICEP 2023, pp. 65-66 (TB3-3)`; `ICEP-IAAC 2025 Proceedings, TC4-1, pp. 111-112` |
| IEDM | 8 | 2 | 6 | `IEDM 2019, pp. 19.4.1-19.4.4`; `IEDM 2025`; `IEDM 2019` |
| ESTC | 6 | 2 | 3 | `ESTC 2024 (10th)`; `ESTC 2022 (9th), pp. 603-609` |
| VLSI | 5 | 0 | 3 | `2026 IEEE/JSAP Symposium on VLSI Technology and Circuits`; `2022 IEEE Symposium on VLSI Technology and Circuits, pp. 258-259`; `2024 IEEE Symposium on VLSI Technology and Circuits` |
| ITherm | 4 | 1 | 4 | `ITherm 2020`; `ITherm 2023 (22nd IEEE Intersociety Conference on Thermal and Thermomechanical Phenomena in Electronic Systems)`; `ITherm 2024 (23rd IEEE Intersociety Conference on Thermal and Thermomechanical Phenomena in Electronic Systems)` |
| IWLPC | 2 | 0 | 1 | `IWLPC 2020` |
| ICEPT | 1 | 0 | 1 | `ICEPT 2023 (24th)` |
| 3DIC | 1 | 0 | 1 | `3DIC 2024` |

Per-paper before -> after (changed rows only, 258 of 296):

| paper_id | before | after |
|---|---|---|
| ectc32696.2021.00125 | ECTC 2021 (71st), pp. 723-728 | ECTC |
| ectc51687.2025.00085 | ECTC 2025 (75th), pp. 481-486 | ECTC |
| ectc51529.2024.00093 | ECTC 2024 (74th), pp. 546-550 | ECTC |
| itherm45881.2020.9190542 | ITherm 2020 | ITherm |
| vlsitechnologyandcir65830.2026.11577576 | 2026 IEEE/JSAP Symposium on VLSI Technology and Circuits | VLSI |
| eptc59621.2023.10457670 | EPTC 2023 (25th), pp. 1067-1070 | EPTC |
| ectc51906.2022.00232 | ECTC 2022 (72nd), pp. 1454-1458 | ECTC |
| ectc51909.2023.00091 | ECTC 2023 (73rd), pp. 510-514 | ECTC |
| ectc51906.2022.00008 | ECTC 2022 (72nd), pp. 1-6 | ECTC |
| ectc51529.2024.00311 | ECTC 2024 (74th), pp. 1859-1862 | ECTC |
| ectc51909.2023.00268 | ECTC 2023 (73rd), pp. 1579-1583 | ECTC |
| eptc59621.2023.10457909 | EPTC 2023 (25th), pp. 120-124 | EPTC |
| vlsitechnologyandcir46769.2022.9830182 | 2022 IEEE Symposium on VLSI Technology and Circuits, pp. 258-259 | VLSI |
| iedm19573.2019.8993659 | IEDM 2019, pp. 19.4.1-19.4.4 | IEDM |
| eptc59621.2023.10457652 | EPTC 2023 (25th), pp. 683-686 | EPTC |
| ectc.2013.6575597 | ECTC 2013 (63rd), pp. 366-371 | ECTC |
| ectc51529.2024.00049 | ECTC 2024 (74th), pp. 259-263 | ECTC |
| ectc51529.2024.00155 | ECTC 2024 (74th), pp. 955-962 | ECTC |
| ectc51529.2024.00013 | ECTC 2024 (74th), pp. 29-33 | ECTC |
| ectc51687.2025.00055 | ECTC 2025 (75th), pp. 292-296 | ECTC |
| ectc51909.2023.00135 | ECTC 2023 (73rd), pp. 778-782 | ECTC |
| ectc51909.2023.00108 | ECTC 2023 (73rd), pp. 612-616 | ECTC |
| ectc51846.2026.00035 | ECTC 2026 (76th), pp. 168-175 | ECTC |
| ectc51529.2024.00144 | ECTC 2024 (74th), pp. 893-897 | ECTC |
| ectc51687.2025.00047 | ECTC 2025 (75th), pp. 246-250 | ECTC |
| iedm50572.2025.11353491 | IEDM 2025 | IEDM |
| tcpmt.2025.3557232 | IEEE TCPMT vol. 15 no. 7, pp. 1529-1537 | TCPMT |
| ectc51529.2024.00021 | ECTC 2024 (74th), pp. 76-80 | ECTC |
| vlsitechnologyandcir46783.2024.10631478 | 2024 IEEE Symposium on VLSI Technology and Circuits | VLSI |
| icept59018.2023.10492317 | ICEPT 2023 (24th) | ICEPT |
| itherm55368.2023.10177502 | ITherm 2023 (22nd IEEE Intersociety Conference on Thermal and Thermomechanical Phenomena in Electronic Systems) | ITherm |
| ectc51909.2023.00153 | ECTC 2023 (73rd), pp. 888-892 | ECTC |
| tcpmt.2023.3312037 | IEEE TCPMT vol. 13 no. 9, pp. 1510-1515 | TCPMT |
| ectc51687.2025.00062 | ECTC 2025 (75th), pp. 331-336 | ECTC |
| ectc51687.2025.00007 | ECTC 2025 (75th), pp. 12-15 | ECTC |
| ectc51846.2026.00117 | ECTC 2026 (76th), pp. 690-694 | ECTC |
| ectc51687.2025.00052 | 2025 IEEE 75th Electronic Components and Technology Conference (ECTC), pp. 274-281 | ECTC |
| ectc51687.2025.00009 | ECTC 2025 (75th), pp. 20-24 | ECTC |
| ectc51529.2024.00017 | ECTC 2024 (74th), pp. 51-55 | ECTC |
| ectc51687.2025.00061 | ECTC 2025 (75th), pp. 309-315 | ECTC |
| eptc62800.2024.10909872 | EPTC 2024 (26th), pp. 190-193 | EPTC |
| ectc51529.2024.00164 | ECTC 2024 (74th), pp. 1025-1029 | ECTC |
| ectc51529.2024.00087 | ECTC 2024 (74th), pp. 519-522 | ECTC |
| ectc51687.2025.00012 | ECTC 2025 (75th), pp. 37-42 | ECTC |
| ectc51846.2026.00198 | ECTC 2026 (76th), pp. 1187-1190 | ECTC |
| ectc51906.2022.00135 | ECTC 2022 (72nd), pp. 824-827 | ECTC |
| ectc51687.2025.00090 | ECTC 2025 (75th), pp. 510-514 | ECTC |
| ectc51687.2025.00178 | ECTC 2025 (75th), pp. 1021-1026 | ECTC |
| ectc51846.2026.00008 | ECTC 2026 (76th), pp. 1-6 | ECTC |
| icep58572.2023.10129695 | ICEP 2023, FE4-1, pp. 219-220 | ICEP |
| ectc51687.2025.00131 | ECTC 2025 (75th), pp. 743-747 | ECTC |
| ectc51529.2024.00207 | ECTC 2024 (74th), pp. 1277-1281 | ECTC |
| eptc62800.2024.10909935 | EPTC 2024 (26th), pp. 1235-1239 | EPTC |
| ectc51906.2022.00309 | ECTC 2022 (72nd), pp. 1970-1974 | ECTC |
| ectc51909.2023.00094 | ECTC 2023 (73rd), pp. 526-530 | ECTC |
| ectc51687.2025.00356 | ECTC 2025 (75th), pp. 2081-2085 | ECTC |
| ectc51687.2025.00048 | ECTC 2025 (75th), pp. 251-255 | ECTC |
| ectc51846.2026.00123 | ECTC 2026 (76th), pp. 723-730 | ECTC |
| ectc.2016.201 | ECTC 2016 (66th), pp. 557-565 | ECTC |
| ectc.2019.00-29 | ECTC 2019 (69th), pp. 2126-2133 | ECTC |
| ectc.2019.00095 | ECTC 2019 (69th), pp. 594-599 | ECTC |
| ectc.2011.5898527 | ECTC 2011 (61st), pp. 285-290 | ECTC |
| ectc32696.2021.00033 | ECTC 2021 (71st), pp. 130-135 | ECTC |
| ectc32862.2020.00185 | ECTC 2020 (70th), pp. 1154-1160 | ECTC |
| ectc32696.2021.00315 | ECTC 2021 (71st), pp. 1998-2002 | ECTC |
| ectc32696.2021.00166 | ECTC 2021 (71st), pp. 1014-1019 | ECTC |
| ectc32696.2021.00174 | ECTC 2021 (71st), pp. 1063-1069 | ECTC |
| ectc51529.2024.00011 | ECTC 2024 (74th), pp. 16-22 | ECTC |
| ectc51529.2024.00023 | ECTC 2024 (74th), pp. 85-89 | ECTC |
| ectc51529.2024.00064 | ECTC 2024 (74th), pp. 348-352 | ECTC |
| ectc51529.2024.00051 | ECTC 2024 (74th), pp. 269-273 | ECTC |
| ectc51529.2024.00076 | ECTC 2024 (74th), pp. 441-446 | ECTC |
| ectc51529.2024.00057 | ECTC 2024 (74th), pp. 305-311 | ECTC |
| ectc51529.2024.00092 | ECTC 2024 (74th), pp. 551-555 | ECTC |
| ectc51529.2024.00096 | ECTC 2024 (74th), pp. 571-575 | ECTC |
| ectc51529.2024.00094 | ECTC 2024 (74th), pp. 556-561 | ECTC |
| ectc51529.2024.00088 | ECTC 2024 (74th), pp. 523-526 | ECTC |
| ectc51529.2024.00106 | ECTC 2024 (74th), pp. 637-642 | ECTC |
| ectc51529.2024.00133 | ECTC 2024 (74th), pp. 829-833 | ECTC |
| ectc51529.2024.00128 | ECTC 2024 (74th), pp. 784-789 | ECTC |
| ectc51529.2024.00125 | ECTC 2024 (74th), pp. 765-770 | ECTC |
| ectc51529.2024.00151 | ECTC 2024 (74th), pp. 929-935 | ECTC |
| ectc51529.2024.00153 | ECTC 2024 (74th), pp. 943-948 | ECTC |
| ectc51529.2024.00229 | ECTC 2024 (74th), pp. 1404-1408 | ECTC |
| ectc51529.2024.00227 | ECTC 2024 (74th), pp. 1392-1397 | ECTC |
| ectc51529.2024.00218 | ECTC 2024 (74th), pp. 1342-1346 | ECTC |
| ectc51529.2024.00258 | ECTC 2024 (74th), pp. 1581-1586 | ECTC |
| ectc51529.2024.00170 | ECTC 2024 (74th), pp. 1060-1063 | ECTC |
| ectc51529.2024.00321 | ECTC 2024 (74th), pp. 1900-1904 | ECTC |
| ectc51529.2024.00396 | ECTC 2024 (74th), pp. 1543-1547 | ECTC |
| ectc51529.2024.00334 | ECTC 2024 (74th), pp. 1968-1972 | ECTC |
| ectc51529.2024.00322 | ECTC 2024 (74th), pp. 1905-1910 | ECTC |
| ectc51529.2024.00265 | ECTC 2024 (74th), pp. 1613-1618 | ECTC |
| ectc51687.2025.00027 | ECTC 2025 (75th), pp. 122-128 | ECTC |
| ectc51687.2025.00014 | ECTC 2025 (75th), pp. 48-53 | ECTC |
| ectc51687.2025.00049 | ECTC 2025 (75th), pp. 256-263 | ECTC |
| ectc51687.2025.00026 | ECTC 2025 (75th), pp. 116-121 | ECTC |
| ectc51687.2025.00028 | ECTC 2025 (75th), pp. 129-133 | ECTC |
| ectc51687.2025.00071 | ECTC 2025 (75th), pp. 380-385 | ECTC |
| ectc51687.2025.00063 | ECTC 2025 (75th), pp. 337-340 | ECTC |
| ectc51687.2025.00095 | ECTC 2025 (75th), pp. 537-541 | ECTC |
| ectc51687.2025.00051 | ECTC 2025 (75th), pp. 254-258 | ECTC |
| ectc51687.2025.00076 | ECTC 2025 (75th), pp. 416-423 | ECTC |
| ectc51687.2025.00141 | ECTC 2025 (75th), pp. 790-795 | ECTC |
| ectc51687.2025.00148 | ECTC 2025 (75th), pp. 847-851 | ECTC |
| ectc51687.2025.00158 | ECTC 2025 (75th), pp. 902-905 | ECTC |
| ectc51687.2025.00097 | ECTC 2025 (75th), pp. 547-553 | ECTC |
| ectc51687.2025.00142 | ECTC 2025 (75th), pp. 812-818 | ECTC |
| ectc51687.2025.00323 | ECTC 2025 (75th), pp. 1895-1900 | ECTC |
| ectc51687.2025.00226 | ECTC 2025 (75th), pp. 1318-1323 | ECTC |
| ectc51687.2025.00284 | ECTC 2025 (75th), pp. 1672-1675 | ECTC |
| ectc51687.2025.00233 | ECTC 2025 (75th), pp. 1358-1362 | ECTC |
| ectc51687.2025.00187 | ECTC 2025 (75th), pp. 1075-1081 | ECTC |
| ectc51687.2025.00378 | ECTC 2025 (75th), pp. 2224-2229 | ECTC |
| ectc51687.2025.00326 | ECTC 2025 (75th), pp. 1915-1919 | ECTC |
| ectc51846.2026.00012 | ECTC 2026 (76th), pp. 24-30 | ECTC |
| ectc51846.2026.00016 | ECTC 2026 (76th), pp. 48-54 | ECTC |
| ectc51687.2025.00359 | ECTC 2025 (75th), pp. 2100-2104 | ECTC |
| ectc51846.2026.00050 | ECTC 2026 (76th), pp. 271-276 | ECTC |
| ectc51846.2026.00019 | ECTC 2026 (76th), pp. 68-72 | ECTC |
| ectc51846.2026.00024 | ECTC 2026 (76th), pp. 97-103 | ECTC |
| ectc51846.2026.00051 | ECTC 2026 (76th), pp. 277-282 | ECTC |
| ectc51846.2026.00062 | ECTC 2026 (76th), pp. 343-349 | ECTC |
| ectc51846.2026.00074 | ECTC 2026 (76th), pp. 426-431 | ECTC |
| ectc51846.2026.00110 | ECTC 2026 (76th), pp. 648-652 | ECTC |
| ectc51846.2026.00106 | ECTC 2026 (76th), pp. 628-631 | ECTC |
| ectc51846.2026.00092 | ECTC 2026 (76th), pp. 546-552 | ECTC |
| ectc51846.2026.00096 | ECTC 2026 (76th), pp. 572-577 | ECTC |
| ectc51846.2026.00119 | ECTC 2026 (76th), pp. 700-705 | ECTC |
| ectc51846.2026.00130 | ECTC 2026 (76th), pp. 775-779 | ECTC |
| ectc51846.2026.00134 | ECTC 2026 (76th), pp. 798-803 | ECTC |
| ectc51846.2026.00140 | ECTC 2026 (76th), pp. 825-828 | ECTC |
| ectc51846.2026.00115 | ECTC 2026 (76th), pp. 677-684 | ECTC |
| ectc51846.2026.00176 | ECTC 2026 (76th), pp. 1067-1070 | ECTC |
| ectc51846.2026.00156 | ECTC 2026 (76th), pp. 926-929 | ECTC |
| ectc51846.2026.00153 | ECTC 2026 (76th), pp. 907-912 | ECTC |
| ectc51846.2026.00187 | ECTC 2026 (76th), pp. 1132-1138 | ECTC |
| ectc51846.2026.00183 | ECTC 2026 (76th), pp. 1107-1112 | ECTC |
| ectc51846.2026.00199 | ECTC 2026 (76th), pp. 1191-1198 | ECTC |
| ectc51846.2026.00209 | ECTC 2026 (76th), pp. 1260-1264 | ECTC |
| ectc51846.2026.00208 | ECTC 2026 (76th), pp. 1252-1259 | ECTC |
| ectc51846.2026.00194 | ECTC 2026 (76th), pp. 1169-1173 | ECTC |
| ectc51846.2026.00204 | ECTC 2026 (76th), pp. 1226-1232 | ECTC |
| ectc51846.2026.00227 | ECTC 2026 (76th), pp. 1380-1386 | ECTC |
| ectc51846.2026.00336 | ECTC 2026 (76th), pp. 2042-2047 | ECTC |
| ectc51846.2026.00302 | ECTC 2026 (76th), pp. 1843-1846 | ECTC |
| ectc51846.2026.00346 | ECTC 2026 (76th), pp. 2103-2109 | ECTC |
| ectc51846.2026.00218 | ECTC 2026 (76th), pp. 1323-1330 | ECTC |
| ectc51846.2026.00365 | ECTC 2026 (76th), pp. 2206-2211 | ECTC |
| ectc51846.2026.00389 | ECTC 2026 (76th), pp. 2352-2358 | ECTC |
| ectc51846.2026.00375 | ECTC 2026 (76th), pp. 2266-2270 | ECTC |
| ectc51846.2026.00416 | ECTC 2026 (76th), pp. 2523-2530 | ECTC |
| ectc51846.2026.00424 | ECTC 2026 (76th), pp. 2572-2577 | ECTC |
| ectc51906.2022.00031 | ECTC 2022 (72nd), pp. 130-136 | ECTC |
| ectc51906.2022.00053 | ECTC 2022 (72nd), pp. 283-288 | ECTC |
| ectc51906.2022.00055 | ECTC 2022 (72nd), pp. 296-300 | ECTC |
| ectc51906.2022.00038 | ECTC 2022 (72nd), pp. 177-181 | ECTC |
| ectc51906.2022.00057 | ECTC 2022 (72nd), pp. 306-311 | ECTC |
| ectc51906.2022.00061 | ECTC 2022 (72nd), pp. 330-334 | ECTC |
| ectc51906.2022.00113 | ECTC 2022 (72nd), pp. 674-678 | ECTC |
| ectc51906.2022.00106 | ECTC 2022 (72nd), pp. 631-634 | ECTC |
| ectc51906.2022.00108 | ECTC 2022 (72nd), pp. 643-647 | ECTC |
| ectc51906.2022.00140 | ECTC 2022 (72nd), pp. 856-861 | ECTC |
| ectc51906.2022.00176 | ECTC 2022 (72nd), pp. 1090-1094 | ECTC |
| ectc51906.2022.00136 | ECTC 2022 (72nd), pp. 828-835 | ECTC |
| ectc51906.2022.00179 | ECTC 2022 (72nd), pp. 1108-1113 | ECTC |
| ectc51906.2022.00218 | ECTC 2022 (72nd), pp. 1355-1360 | ECTC |
| ectc51906.2022.00181 | ECTC 2022 (72nd), pp. 1121-1125 | ECTC |
| ectc51906.2022.00303 | ECTC 2022 (72nd), pp. 1934-1939 | ECTC |
| ectc51906.2022.00332 | ECTC 2022 (72nd), pp. 2104-2110 | ECTC |
| ectc51909.2023.00023 | ECTC 2023 (73rd), pp. 83-90 | ECTC |
| ectc51909.2023.00048 | ECTC 2023 (73rd), pp. 233-238 | ECTC |
| ectc51909.2023.00008 | ECTC 2023 (73rd), pp. 1-4 | ECTC |
| ectc51909.2023.00155 | ECTC 2023 (73rd), pp. 899-906 | ECTC |
| ectc51909.2023.00053 | ECTC 2023 (73rd), pp. 271-276 | ECTC |
| ectc51909.2023.00151 | ECTC 2023 (73rd), pp. 878-882 | ECTC |
| ectc51909.2023.00154 | ECTC 2023 (73rd), pp. 893-898 | ECTC |
| ectc51909.2023.00178 | ECTC 2023 (73rd), pp. 1043-1047 | ECTC |
| ectc51909.2023.00174 | 2023 IEEE 73rd Electronic Components and Technology Conference (ECTC), pp. 1022-1026 | ECTC |
| ectc51909.2023.00179 | ECTC 2023 (73rd), pp. 1048-1052 | ECTC |
| ectc51909.2023.00175 | ECTC 2023 (73rd), pp. 1027-1031 | ECTC |
| ectc51909.2023.00180 | ECTC 2023 (73rd), pp. 1053-1059 | ECTC |
| ectc51909.2023.00219 | ECTC 2023 (73rd), pp. 1285-1290 | ECTC |
| ectc51909.2023.00230 | ECTC 2023 (73rd), pp. 1348-1352 | ECTC |
| ectc51909.2023.00190 | ECTC 2023 (73rd), pp. 1110-1114 | ECTC |
| ectc51909.2023.00252 | ECTC 2023 (73rd), pp. 1486-1492 | ECTC |
| ectc51909.2023.00235 | ECTC 2023 (73rd), pp. 1374-1380 | ECTC |
| ectc51909.2023.00274 | ECTC 2023 (73rd), pp. 1614-1621 | ECTC |
| ectc51909.2023.00307 | ECTC 2023 (73rd), pp. 1792-1797 | ECTC |
| ectc51909.2023.00266 | ECTC 2023 (73rd), pp. 1566-1570 | ECTC |
| ectc51909.2023.00333 | ECTC 2023 (73rd), pp. 1939-1943 | ECTC |
| ectc51909.2023.00324 | ECTC 2023 (73rd), pp. 1892-1895 | ECTC |
| eptc59621.2023.10457918 | EPTC 2023 (25th), pp. 165-168 | EPTC |
| eptc59621.2023.10457912 | EPTC 2023 (25th), pp. 1059-1062 | EPTC |
| eptc59621.2023.10457612 | EPTC 2023 (25th), pp. 1063-1066 | EPTC |
| eptc56328.2022.10013262 | EPTC 2022 (24th), pp. 66-70 | EPTC |
| eptc53413.2021.9663896 | EPTC 2021 (23rd), pp. 258-264 | EPTC |
| estc60143.2024.10712129 | ESTC 2024 (10th) | ESTC |
| eptc67330.2025.11392108 | 2025 IEEE 27th Electronics Packaging Technology Conference (EPTC) | EPTC |
| estc60143.2024.10712070 | ESTC 2024 (10th) | ESTC |
| eptc67330.2025.11392593 | EPTC 2025 (27th IEEE Electronics Packaging Technology Conference) | EPTC |
| eptc67330.2025.11392132 | EPTC 2025 (27th) | EPTC |
| icep58572.2023.10129684 | ICEP 2023, pp. 65-66 (TB3-3) | ICEP |
| icep-iaac64884.2025.11002987 | ICEP-IAAC 2025 Proceedings, TC4-1, pp. 111-112 | ICEP |
| icep-iaac64884.2025.11002958 | ICEP-IAAC 2025, TA2-4, pp. 65-66 | ICEP |
| icep55381.2022.9795565 | ICEP 2022, FB2-2, pp. 131-132 | ICEP |
| icep-iaac64884.2025.11003038 | ICEP-IAAC 2025, WA1-2, pp. 1-2 | ICEP |
| icep61562.2024.10535612 | ICEP 2024, TD2-1, pp. 121-122 | ICEP |
| iedm19573.2019.8993637 | IEDM 2019 | IEDM |
| iedm45625.2022.10019499 | IEDM 2022, pp. 631-634 (paper 27.3) | IEDM |
| icep61562.2024.10535587 | ICEP 2024 Proceedings, FB1-1, pp. 175-176 | ICEP |
| iedm45741.2023.10413759 | IEDM 2023 | IEDM |
| iwlpc52010.2020.9375855 | IWLPC 2020 | IWLPC |
| iwlpc52010.2020.9375887 | IWLPC 2020 | IWLPC |
| tcpmt.2021.3104326 | IEEE TCPMT vol. 12 no. 3, pp. 462-468 (2022-03) | TCPMT |
| iedm45741.2023.10413829 | IEDM 2023 | IEDM |
| itherm55375.2024.10709474 | ITherm 2024 (23rd IEEE Intersociety Conference on Thermal and Thermomechanical Phenomena in Electronic Systems) | ITherm |
| tcpmt.2025.3538554 | IEEE TCPMT, vol. 15, no. 4, pp. 706-715, 2025-04 | TCPMT |
| tcpmt.2021.3123384 | IEEE TCPMT, vol. 12, no. 3, pp. 437-445, Mar. 2022 | TCPMT |
| tcpmt.2023.3266666 | IEEE TCPMT vol. 13 no. 4, pp. 472-480 (2023-04) | TCPMT |
| tcpmt.2025.3540665 | IEEE TCPMT, vol. 15, no. 3, pp. 627-630, 2025-03 | TCPMT |
| tcpmt.2024.3443855 | IEEE Trans. Compon. Packag. Manuf. Technol., vol. 14, no. 11, pp. 2098-2106, Nov. 2024 | TCPMT |
| tcpmt.2025.3557745 | IEEE Trans. Compon. Packag. Manuf. Technol., vol. 15, no. 6, pp. 1275-1283, Jun. 2025 | TCPMT |
| tcpmt.2026.3650893 | IEEE TCPMT vol. 16 no. 2, pp. 455-457 (2026-02) | TCPMT |
| tcpmt.2025.3628798 | IEEE TCPMT, vol. 16, no. 1, pp. 231-243, Jan. 2026 | TCPMT |
| tcpmt.2025.3610036 | IEEE TCPMT, vol. 15, no. 11, pp. 2531-2538, Nov. 2025 | TCPMT |
| tcpmt.2025.3599484 | IEEE TCPMT vol. 15 no. 10 (2025), pp. 2269-2278 | TCPMT |
| tcpmt.2026.3740312 | IEEE TCPMT (accepted author version, 2026) | TCPMT |
| tcpmt.2026.3708099 | IEEE TCPMT vol. 16, no. 8, pp. 1729-1734, Aug. 2026 | TCPMT |
| vlsitechnologyandcir65830.2026.11577374 | 2026 IEEE/JSAP Symposium on VLSI Technology and Circuits | VLSI |
| tcpmt.2026.3717381 | IEEE Transactions on Components, Packaging and Manufacturing Technology (accepted author version) | TCPMT |
| vlsitechnologyandcir46783.2024.10631441 | 2024 IEEE Symposium on VLSI Technology and Circuits | VLSI |
| ectc51846.2026.00274 | ECTC 2026 (76th), pp. 1674-1679 | ECTC |
| 2380-4505-2020.1.000042 | IMAPS International Symposium | IMAPS |
| eptc62800.2024.10909836 | EPTC 2024 (26th), pp. 131-134 | EPTC |
| tcpmt.2026.3736233 | IEEE TCPMT (accepted author version, 2026) | TCPMT |
| ectc51909.2023.00240 | ECTC 2023 (73rd), pp. 1403-1409 | ECTC |
| 001c.147098 | IMAPS 2025 Symposium (San Diego, CA), pp. 0044-0048 | IMAPS |
| tcpmt.2024.3507552 | IEEE TCPMT vol. 15 no. 1, pp. 113-122 (2025-01) | TCPMT |
| ectc51906.2022.00240 | ECTC 2022 (72nd), pp. 1505-1510 | ECTC |
| ectc51687.2025.00060 | ECTC 2025 (75th), pp. 318-323 | ECTC |
| estc55720.2022.9939446 | ESTC 2022 (9th), pp. 603-609 | ESTC |
| tcpmt.2025.3533388 | IEEE TCPMT, vol. 15, no. 8, pp. 1625-1635 | TCPMT |
| 001c.147214 | IMAPS 2025 Symposium (San Diego), pp. 0249-0254 | IMAPS |
| 3dic63395.2024.10830178 | 3DIC 2024 | 3DIC |
| ectc51846.2026.00243 | ECTC 2026 (76th), pp. 1482-1488 | ECTC |
| ectc51846.2026.00065 | ECTC 2026 (76th), pp. 364-371 | ECTC |
| eptc62800.2024.10909809 | EPTC 2024 (26th), pp. 730-733 | EPTC |
| ectc51846.2026.00103 | ECTC 2026 (76th), pp. 610-617 | ECTC |
| eptc67330.2025.11392276 | EPTC 2025 (27th) | EPTC |
| ectc51846.2026.00202 | ECTC 2026 (76th), pp. 1214-1220 | ECTC |
| estc60143.2024.10712019 | ESTC 2024 (10th) | ESTC |
| ectc51906.2022.00360 | ECTC 2022 (72nd), pp. 2281-2286 | ECTC |
| eptc67330.2025.11392196 | EPTC 2025 (27th) | EPTC |
| eptc67330.2025.11392176 | EPTC 2025 (27th) | EPTC |
| ectc51846.2026.00034 | ECTC 2026 (76th), pp. 162-167 | ECTC |
| icep-iaac64884.2025.11002988 | ICEP-IAAC 2025, FC3-3, pp. 211-212 | ICEP |
| tcpmt.2026.3672227 | IEEE TCPMT (accepted author version, 2026) | TCPMT |

## 2. test_standard for ectc51529.2024.00093-c-m1

Not stated. The row is the partially Cu-filled TGV thermal cycle (-55 to 120 C in text, -55 to 122 C in the Fig. 11
caption, 30 min dwell). p.4 Sec. II.C cites "MIL Standard 833" only for the fully filled (Fig. 9) and conformal
(Fig. 10) tests, and the Fig. 9 and Fig. 10 captions end "(MIL standard 833)"; the partially filled paragraph and the
Fig. 11 caption (p.4) name no standard (checked on the text layer and on figures/page_04.png). The closing sentence
("for all three types of via filling methods") reports results, not the standard. The cell stays empty; rows -a-m1 and
-b-m1 keep "MIL Standard 833" as printed. "JISC5012" (p.3, p.5) is the via current/temperature-rise design criterion,
not the TC test.

## 3. Text-layer warnings

Format: the first line mirrors the generated OCR warning (`digit_ratio`, `common_word_ratio` from source.json) but
says the text is the PDF's own layer, not tesseract OCR; then bullets with the damage and page numbers. Written:

| paper_id | damage (pages) |
|---|---|
| ectc51529.2024.00094 | um/mm square glyphs as Lao/Thai letters (p.1-p.6; Tables I-II p.2) |
| ectc51906.2022.00140 | Abstract '2.5D', 'ASIC' as Arabic-block glyphs (p.1); diagram labels shifted +29 (p.2); undulation equation unreadable (p.4) |
| ectc51909.2023.00023 | micro sign as 'P' (p.1-3, 5-7), sigma as 'V' (p.1-3, 5, 7) |
| ectc51909.2023.00048 | shifted +29 duplicate on p.1-p.6 + OCR-like copy ('11m' = um p.2-p.5, '§' p.4); Calibri glyph-ID labels p.3 |
| ectc51909.2023.00153 | Table I-IV numerals as 'ᶙ ᶚ ᶛ ᶜ' (p.1-p.3); table bodies absent (p.2-p.3) |
| ectc51909.2023.00155 | shifted +29 duplicate on p.1-p.8 + OCR-like copy ('urn', '!-Lm', '/lm' = um; 'mm?' p.1) |
| ectc51909.2023.00174 | minor: 'Ŋmages' p.2, 'œEFERENCE' p.5, degree as 'º' p.4; numbers intact |
| ectc51909.2023.00252 | shifted +29 duplicate on p.1-p.7 + OCR-like copy ('urn' = um, 'l' for 1, 'SSW' for 8SW p.1) |
| tcpmt.2021.3104326 | Ohm sign of mOhm as U+0002 (p.4, 11 occurrences); Table I body absent (p.6) |
| vlsitechnologyandcir46783.2024.10631441 | shifted +29 duplicate p.1 + OCR-like copy; p.2 OCR errors ('TSY' for TSV) |
| vlsitechnologyandcir46783.2024.10631478 | shifted +29 duplicate p.1-p.2 + OCR-like copy ('!lm', '/lm', 'urn'); Table 2 labels Calibri-garbled p.2 |

Downstream note: `data/_staging/BATCH_INSTRUCTIONS.md` line 44 says a TEXT_LAYER_WARNING.md means text.md holds
tesseract OCR. That no longer holds for these 11 (their first line says "partly damaged ... not replaced by tesseract
OCR"). Suggested wording: "unusable" = OCR text; "partly damaged" = PDF text with the listed defects (coordinator; not
in L16 paths).

### Why the detector missed them, and a proposed change (not applied)

`extract_source.text_quality()` flags a page when alpha ratio < 0.55 or common-word ratio < 0.03. Shift-29 copies are
mostly letters (alpha stays 0.68-0.83) and sit next to a readable copy, so the page common-word ratio stays 0.07-0.21.
Unit-glyph loss changes a few characters per page and moves neither ratio. `recheck_text_layers.py` only re-runs
`extract()` (re-renders and rewrites text.md), so it cannot find these either.

Read-only prototype over all references/*/text.md (papers with an OCR warning skipped), three per-page signals:

1. shift29: >= 50 control characters (category Cc except tab/newline) and the lines containing U+0003, decoded by +29
   code points, have common-word ratio >= 0.05. Result: flags exactly the 5 shifted papers (00048, 00155, 00252,
   10631441 p.1, 10631478 p.1-p.2) and no other paper. Recommended as a new `shifted_copy_pages` field.
2. unit_loss: regex `\d\s?(Pm\b|urn\b|11m\b|!lm|/lm\b|!-Lm)|m\x02`, >= 3 hits per page. Flags 00023,
   tcpmt.2021.3104326 and the shifted papers, plus 4 papers outside the list that show the same micro-as-'P' loss on
   inspection: ectc51909.2023.00021 ('800 Pm'), ectc51909.2023.00235 ('2 Pm/2 Pm line and space'),
   ectc51906.2022.00142 ('0.2 Pm'), ectc51529.2024.00011 ('20Pm', '42Pm'). These 4 have no warning (not in L16 scope;
   same treatment recommended). Recommended as `unit_glyph_loss_pages`, with a manual check of each new hit.
3. odd letters (letters outside Latin-1/Greek/ligatures, >= 3 per page): catches 00094, 00140, 00153, 10631478 but
   also flags ~60 other papers (names, math italics, legitimate symbols). Not recommended without a script allow-list.

Sketch: add a text-only mode (`--scan-text`) to `recheck_text_layers.py` that reads text.md, computes signals 1-2 per
page, writes `logs/recheck_text_layers_<ts>.jsonl` and touches nothing else; a separate reviewed step writes
"partly damaged" warnings. The two letter substitutions in 00174 are below any useful threshold.

## Hand-off

- Done: tasks 1-3; validator 0 errors. No git writes; build_views.py not run.
- Coordinator: run build_views.py and check the "App impact" items; decide on `papers.citation`; update
  BATCH_INSTRUCTIONS.md line 44 wording; decide on the 4 extra micro-as-'P' papers and the detector change.
- Schema change for the record: additive `enums.venue` (no version bump; the papers.venue column spec is unchanged).
