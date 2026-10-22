---
title: L14 affiliations for the 58 DevLog-009 papers; photonics-atlas org requests (Xperi/Adeia, "University of Applied Science Berlin")
date: 2026-10-21
status: done 2026-10-21 (coordinator audit of the new rows pending)
owner: L14 (lane subagent of DevLog-013)
scope: data/_staging/g008, data/_staging/g009 (new), data/{author_affiliations,organizations,org_sites}.csv, config/org_aliases.yaml, config/geo_site_overrides.csv, this file
---

# L14: affiliations round 2

Parent: [DevLog-013](../DevLog-013-backlog-round-1.md) (shared rules, row L14). Pipeline: [DevLog-006](../DevLog-006-institutions-and-map-view.md),
contract `data/_staging/AFFILIATION_INSTRUCTIONS.md` (incl. the 2026-10-20 subsidiary and legal-suffix rules), lessons from
`DevLog/audits/affiliations_audit_2026-10-20.md` (D1-D8).

## Plan (written 2026-10-21 17:53 PDT, before any data change)

Coordinator correction 2026-10-21: no subagents in this lane; extraction done sequentially by L14; step 3 (fresh-context
audit sample) is done by the coordinator after hand-off.

0. Gap list: papers in `data/papers.csv` with no row in `data/author_affiliations.csv` = 58. One of them,
   `tcpmt.2026.3717381`, is the documented gap (accepted manuscript, no affiliations printed); re-checked, not
   re-extracted unless the cached text now prints affiliations. 57 to extract.
1. Extraction (no network): batches `data/_staging/g008` (first 29 ids, sorted) and `g009` (rest); batch id list in
   `<batch>/batch.csv`. Byline/affiliation block from `references/<id>/text.md` p.1 (journals: p.1 footnote,
   biographies); `figures/page_01.png` or a fresh render (scratch only) when the text layer is garbled or the
   superscript/grid mapping is unclear. Canonical org names reused from `data/organizations.csv` directly where the
   printed org is the same organization (so no new aliases are needed for them); subsidiary rule and suffix stripping
   per the contract. Gaps stay gaps. `validate_db.py --staging` 0 errors per batch; BATCH_REPORT.md per batch.
2. Consolidation: `merge_affiliations.py data data/_staging/g008 data/_staging/g009` (the current canonical tables are
   passed as the first "batch" so the 2026-10-20 fixes are kept; a plain g000-g007 re-merge would undo them). Dry run,
   diff vs current (existing 1996 rows and 144 orgs must be unchanged), zip backup of the three tables in
   `cache/backups/`, then apply. New aliases only if a batch used a variant.
3. Audit: coordinator, after hand-off (rows listed at the end of this file).
4. Geocoding: only the (org, locality, country) keys of new rows that no existing site covers (incl. locality_variants).
   Input `data/_staging/geo_sites_input_l14.csv`; pilot 2-3 sites, then the rest; output
   `data/_staging/geo_sites_run_l14.csv`; cache reused, 1.1 s spacing (script default). Region-only printed localities
   get region precision (D4 lesson); no facility override that rests on inference.
5. Site review (offline) of the new sites; overrides appended to `config/geo_site_overrides.csv` and a re-run on the
   flagged new sites only. New-site variants of an existing site (same org, same place) are added to that site's
   `locality_variants` instead of a new site (D1 lesson); existing site coordinates/precision untouched.
6. Append the new sites to `data/org_sites.csv`; `validate_db.py` 0 errors. No `build_views.py`.
7. photonics-atlas requests (read-only there):
   - Xperi vs Adeia: how APA records them; public primary sources (press release / SEC filing) for the 2022 separation;
     proposed `organizations.notes`/`parent_org` wording with URL and retrieval date. Printed affiliations unchanged.
   - "University of Applied Science Berlin": read the printed unit/address in the APA paper(s); HTW vs BHT only if
     the paper says so.

## TODO

- [x] 0 gap list
- [x] 1 extraction g008, g009
- [x] 2 consolidation + apply
- [ ] 3 audit sample (coordinator, after hand-off)
- [x] 4 geocoding new sites (pilot, run)
- [x] 5 site review + overrides
- [x] 6 merge sites, validator
- [x] 7 photonics-atlas answers
- [x] hand-off

## Progress log

- 2026-10-21 17:53: plan written. Gap list computed: 58 papers (296 papers, 238 covered).
- 17:55: coordinator correction received (no subagents; step 3 audit by the coordinator after hand-off).
- 18:00: extraction done by L14 (no network). Spec generator kept in the session scratchpad (not tracked); outputs
  `data/_staging/g008` (29 papers, 208 rows) and `g009` (29 papers incl. the gap, 201 rows), each with `batch.csv`,
  `author_affiliations.csv`, `organizations.csv`, `BATCH_REPORT.md`; validator `--staging` 0 errors / 0 warnings each.
  - Page-1 renders (scratch only) checked for every author grid (22 papers) and for the 2 papers whose byline is not
    where the text layer puts it: `001c.74577` (byline absent from text) and `ectc51687.2025.00060` (12-author grid placed
    after the abstract; a header-only read would have found 0).
  - Grid order: row-major per render (IEEE template order, earlier-batch convention). The text layer is column-major in
    9 papers (noted per row): 3dic63395.2024.10830178, ectc51909.2023.00316, .00331, eptc67330.2025.11392176, .11392196,
    .11392620, estc55720.2022.9939446, estc60143.2024.10712019, .10712091.
  - Gap unchanged: `tcpmt.2026.3717381` (accepted manuscript, no affiliations).
  - Author-name check: every first-row author string occurs in its text.md (one hit needed de-hyphenation: "Hyo-Kyeong Yun").
- 18:01: consolidation. `merge_affiliations.py data data/_staging/g008 data/_staging/g009` (current tables passed first,
  so the 2026-10-20 fixes stay). Dry run: 2405 rows, 181 orgs, 0 errors; all 1996 old rows and 144 old orgs byte-identical.
  Backup `cache/backups/l14_affil_before_merge_20261021T180129.zip` (the 3 tables, org_aliases, overrides). Applied.
  No alias added: batches used canonical names directly (printed forms in notes).
  - 37 new orgs (list in BATCH_REPORTs). Subsidiary rule applied: Applied Materials Singapore Technology (parent
    Applied Materials), Panasonic Industry and Panasonic System Networks R&D Lab. (parent Panasonic), Georgia Tech
    Research Institute (parent Georgia Institute of Technology, from the printed name), Tyndall National Institute
    (parent University College Cork, printed together). Instituto de Telecomunicações: own org, no parent (printed with
    University of Aveiro; no source here for a parent relation). Corning Technology Center Korea stays a unit of Corning
    (existing convention).
- 18:02: geocoding. 57 (org, locality, country) keys lacked a site: 12 are spelling variants of an existing site of the
  same org (to be appended to that site's `locality_variants`, coordinates untouched); 45 new sites in
  `data/_staging/geo_sites_input_l14.csv`. Pilot (`geo_sites_pilot_l14*.csv`): Tyndall Cork wikidata campus ok; Onto
  "Massachusetts" region centre ok; Northrop Grumman Baltimore hit a different NG facility (Middle River, 16.7 km) ->
  needs the printed street address as override. Full run started (`geo_sites_run1_l14.csv`).
- 18:03: photonics-atlas requests (web reads: 3 pages, SEC + adeia.com):
  - Xperi/Adeia: notes added to both org rows (sources and dates); no parent_org, no rename.
  - "University of Applied Science Berlin": unresolved, note added to the org row.
- 18:04: geocoding run 1 done (45/45, `geo_sites_run1_l14.csv`, log `logs/geocode_20261021T*.log`).
- 18:05: site review (offline) of the 45 new sites:
  - ok as run: 42. Wikidata campus 12 (BIT, Bridgewater State, CSU, TU/e, LPKF Garbsen, LTU, MIT, Tokyo Tech Ookayama for
    printed "Tokyo", Tyndall Cork, Aveiro, Oulu, Yonsei); OSM facility hits named after the org: KLA Milpitas, GTRI Smyrna,
    IT Aveiro, Panasonic Enns, Socionext Shin-Yokohama, Thales Alenia Space Toulouse; printed-city fallbacks; region centres for
    printed Massachusetts / Nagano / Okayama / Fukuoka (Sumitomo Bakelite: region by override, its byline lists
    prefecture-level places); 9 unresolved = no locality printed.
  - Flagged 3, overrides appended to `config/geo_site_overrides.csv` (CRLF kept), re-run 2 on those only
    (`geo_sites_run2_l14.csv`):
    - Northrop Grumman "Baltimore, MD": run 1 hit another NG facility (Middle River, 16.7 km). Printed street address
      query found nothing -> printed city centre.
    - NEC "Kawasaki-shi": run 1 hit an NEC-named swimming club. Printed address query found nothing -> city centre.
    - Fukuoka University "Itoshima, Fukuoka": run 1 pinned the Fukuoka-city main campus (15.8 km) -> Itoshima city
      centre (precision city).
  - Final new sites (`geo_sites_final_l14.csv`): campus 16, building 2, city 14, region 4, unresolved 9.
- 18:06: `data/org_sites.csv` 214 -> 259: 45 rows appended; 12 existing sites gained one `locality_variants` entry each
  (same org, same place, spelling only; coordinates/precision untouched): Brewer Science Rolla (Rolla, Missouri), DNP
  Kashiwa (Kashiwa-shi), ELSPES (Hwaseong-si, Gyeonggi-do), EV Group (Sankt Florian am Inn), Georgia Tech (Atlanta,
  Georgia), JSR (Yokkaichi, Mie), SPIL (Taichung City), Samsung Hwaseong-si (Hwseong-si, sic), USHIO (Gotemba, Shizuoka),
  Unimicron Hsinchu (Hsingchu, sic), Unimicron Taoyuan (Taoyuan City), UCSD La Jolla (San Diego, CA).
  - `merge_affiliations.py` re-sorts the whole table; the original row order was restored (old 1996 rows in place, 409
    new appended) so the diff is additions only. Its intermediate `data/_staging/_affil_merged/` was restored to HEAD
    content (read via `git show`, no git write).
  - Validator: 0 errors, 0 warnings (2 notes > 40 words fixed). Coverage 295/296 papers (gap tcpmt.2026.3717381).

## Hand-off

- Counts: papers with affiliations 238 -> 295 / 296; rows 1996 -> 2405 (+409; 402 authors); organizations 144 -> 181
  (+37); sites 214 -> 259 (+45).
- Ready for the coordinator audit: all rows of the 57 papers in `data/_staging/g008` and `g009`
  (`batch.csv` lists them; aff_id prefix = paper_id). Suggested strata: grid papers re-ordered from the text layer (9,
  listed at 18:00), the render-only bylines (001c.74577, ectc51687.2025.00060), superscript papers (001c.129513,
  001c.129733, 001c.147098, 001c.147203, 001c.74748, iedm50572.2025.11353855, eptc59621.2023.10457729,
  ectc51906.2022.00323), journal footnotes (6 tcpmt), and the subsidiary/parent decisions (37 new orgs).
- Open / judgement calls for the coordinator:
  - Shinko 001c.147203 prints a full Nagano city address (36 Kita-Owaribe, 381-0014) but maps to the existing region
    site "Nagano" (existing sites not changed).
  - Tokyo Tech printed "Tokyo" (001c.74775) pinned to the Wikidata main campus (standard rule, 10.8 km).
  - IMT (Rome) org_type `other`: only the acronym is printed.
  - Degree suffixes "PhD." dropped from two Northrop Grumman author names (noted per row).
- photonics-atlas answers:
  - Xperi/Adeia: APA keeps two orgs, Xperi (printed "Xperi Corporation", ectc51906.2022.00031, 12 authors) and Adeia
    (printed "Adeia, Inc.", ectc51909.2023.00023, 10 authors; 9 names overlap per photonics-atlas). Notes added to both
    rows; no parent_org (a successor/rename, not a parent). Sources (retrieved 2026-10-21):
    - https://adeia.com/press-release/xperi-and-tivo-complete-merger (2020-06-01: "Xperi Corporation and TiVo
      Corporation are now combined under Xperi Holding Corporation.")
    - https://www.sec.gov/Archives/edgar/data/1803696/000119312522240678/d693283dex991.htm (8-K exhibit 99.1,
      2022-09-08: product business Xperi Inc. separated from the IP licensing business Adeia; "The Company will be
      renamed Adeia Inc."; spin-off on or about 2022-10-01)
    - https://www.sec.gov/Archives/edgar/data/1803696/000095017023005437/adea-20221231.htm (10-K FY2022: "On October 1,
      2022, Xperi Hold Co's product business was separated from Xperi Hold Co"; "The IP licensing business was retained
      by Xperi Hold Co, which was renamed Adeia Inc."; focus areas include "hybrid bonding (or Direct Bond Interconnect
      (DBI))")
    - Not established by these sources: which post-split entity the subsidiary "Xperi Corporation" itself went to.
  - "University of Applied Science Berlin" (tcpmt.2021.3123384, Ha-Duong Ngo): unresolved. The p.1 footnote prints only
    "Department of Microsystems Engineering, University of Applied Science Berlin, 10587 Berlin, Germany"; no biography;
    neither HTW nor BHT is named. Note added to the org row.
- No contract/schema change needed.
