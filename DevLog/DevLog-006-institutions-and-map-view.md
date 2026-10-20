# DevLog-006: institutions, locations and the map view

Date: 2026-10-19. Status: in progress. Reference implementation: `eo-modulator-atlas` DevLog-017/018
(per-author affiliations, Wikidata/Nominatim site coordinates, clustered map panel over vendored outlines).

## Request (Wentao, 2026-10-19 23:10)

Is the map view built? Check the eo-modulator-atlas repo as an example. If not, dispatch agents to distill
institutions, research their locations, and set up the map view panel properly.

## State at start

- No map view. The app has dashboard, table, explore and about pages; no geo code, no geo assets.
- `data/papers.csv` has `first_author` and `orgs` (printed names, first author first). There are no per-author
  rows and no organization or location tables.
- 239 papers, all with cached `text.md` (page 1 holds the IEEE byline and affiliation block).

## Design (mirrors eo-modulator-atlas, adapted)

New tables (schema v2.3; validator-checked, optional files):

- `data/author_affiliations.csv`: one row per author x printed affiliation.
  - Columns: aff_id (`<paper_id>-a01-1` = author 1, affiliation 1), paper_id, author_index (1-based byline
    order), author (as printed), aff_order, kind (primary | additional | present_address), org_name (must exist
    in organizations.csv), unit (department/lab as printed), locality (city as printed), country (ISO alpha-2;
    HK, TW own codes), source (paper), locator, note.
- `data/organizations.csv`: one row per organization.
  - Columns: org_name (canonical English name the organization uses itself), org_type (university | company |
    research_institute | government_lab | foundry | facility | consortium | other), country, region,
    parent_org, notes.
  - Duplicates and printed variants merged; the variants are recorded in notes.
- `data/org_sites.csv`: one row per (org, locality).
  - Columns: site_id, org_name, locality, country, lat, lon, precision (building | campus | postcode | city |
    unresolved), source (wikidata | nominatim | manual), source_ref (Q-id or osm type/id), source_label,
    verified_on, notes.

Pipeline:

1. Extraction agents (staging `data/_staging/g0NN/`, 30 papers each, no network):
   - Read the byline and affiliation block of each paper (superscripts, footnotes, IEEE "Affiliation:" lines,
     page renders when the text layer is garbled).
   - Write `author_affiliations.csv` plus proposed organizations.
   - No author or affiliation from memory: a gap is recorded, not filled.
2. Consolidation agent: one canonical organizations list across all batches (merge variants, parent orgs,
   org_type, country, region), and the org_name mapping applied to all staging rows.
3. Fresh-context audit of the affiliations (sample per batch), then corrections.
4. Geocoding (coordinator, one serialized script):
   - Port eo-modulator-atlas `scripts/geocode_sites.py` including its fixes: settlement-only city lookup,
     nearest Wikidata coordinate to the printed locality, P17 handling, HK/MO, overrides.
   - Source order: Wikidata P625, then OSM Nominatim. At most 1 request/s, responses cached in a git-ignored
     cache, pilot on 3 sites first, then the full run.
5. Site review agent (no network): identity, location and precision of every site; overrides and a re-run.
6. App:
   - `build_views.py` emits `sites` and per-paper affiliations.
   - Port `GeoPanel.svelte` and `geo.ts` (greedy clustering re-run on zoom; authors/papers toggle; hover lists),
     plus the vendored basemap assets `app/static/geo/` from eo-modulator-atlas (Natural Earth outlines, labels,
     roads; public domain).
   - Add the panel to the Explore page with attribution "Sites: Wikidata, (c) OpenStreetMap contributors,
     Natural Earth".
   - Checks: svelte-check, build, screenshots dark/light/390 px, no external requests.

## TODO

- [x] Schema v2.3 + validator for the three tables; staging batches g000-g007
- [x] Extraction (agents)
- [x] Organization consolidation (`config/org_aliases.yaml`, `scripts/merge_affiliations.py`)
- [ ] Audit + corrections, merge
- [x] Geocoder port, pilot, full run
- [x] Site review + fixes
- [x] build_views + map panel + checks
- [x] Canonical organizations in the app (Wentao, 2026-10-19 23:13: the table shows several TSMC spellings).
  `papers.orgs` (printed string) currently drives the table column (`columns.ts`), the org filter and URL state
  (`logic.ts`) and the TV tooltip (`TvTip.svelte`). Switch all four to the canonical org_name list per paper from
  `author_affiliations` (first author's orgs first), and keep the printed string as provenance in the hover.

## Progress log

- 2026-10-19 23:08: repo inspected (no map), eo-modulator-atlas reference read (DevLog-018, schemas, scripts,
  app/static/geo assets). Plan written.
- 23:10: schema v2.3. `author_affiliations`, `organizations` and `org_sites` were added. The validator checks
  org references, ISO country codes, duplicate (paper, author, aff_order) rows, and coordinates vs precision.
  A staging dir without test_vehicles.csv no longer needs papers.csv. Templates regenerated; data/ 0 errors.
- 23:10: `data/_staging/AFFILIATION_INSTRUCTIONS.md` (the contract). Batches g000-g007 (30 papers each).
  Extraction launched in workflow `wf_6cf0197a-596` (3 workers).
- 23:11: `scripts/geocode_sites.py` ported from eo-modulator-atlas, incl. its review fixes, plus site_id,
  source none and a timestamped log. Cache `data/_staging/geo_cache/` (git-ignored) seeded with the 1063
  eo-modulator-atlas responses.
- 23:11: basemap assets copied to `app/static/geo/` (same files eo-modulator-atlas tracks; Natural Earth, public
  domain), along with their generators `scripts/topojson_to_geojson.py` and `scripts/build_map_labels.py`.
- 23:37: extraction done in workflow `wf_6cf0197a-596`, 8/8 batches at 0 errors.
  - 2020 affiliation rows, 1932 authors, 238/239 papers. Gap: `tcpmt.2026.3717381`, no affiliations in the
    cached text.
  - 150 proposed organization names.
- 23:39: consolidation, done by the coordinator. `config/org_aliases.yaml` holds 15 canonical names with their
  variants:
  - TSMC and Taiwan Semiconductor Manufacturing Company; ASE, Advanced Semiconductor Engineering (Inc.) and ASE
    Group; A*STAR IME in two spellings; A*STAR; Samsung, SK hynix, Applied Materials, nepes, nepes hayyim, Murata,
    Fraunhofer IZM, Deca, DNP suffix variants; SPIL; Intel.
  - Kept separate: Xperi vs Adeia (spin-off), Showa Denko Materials vs Resonac (rename), Tokyo Tech vs Institute
    of Science Tokyo (merger).
  - `scripts/merge_affiliations.py` merged into `data/author_affiliations.csv` (2020 rows) and
    `data/organizations.csv` (136 orgs). No type/country conflicts; validator 0 errors.
  - The fresh-context affiliation audit is still pending (no free agent slot); it will correct in place.
- 23:40: geocoding pilot on 3 sites (`data/_staging/geo_sites_pilot.csv`):
  - TSMC Hsinchu: OSM building in Hsinchu Science Park, 4.1 km from the city centre.
  - imec Leuven: Kapeldreef campus.
  - A*STAR IME Singapore: unresolved, falls back to the city centre (override needed in the site review).
  - Full run on 242 sites started (`data/_staging/geo_sites_run1.csv`, log `logs/geocode_<ts>.log`).
- 23:54: geocoding run 1 complete (`data/_staging/geo_sites_run1.csv`, logs `logs/geocode_20261019T2339*.log`).
  - 242 sites: wikidata/campus 49, nominatim/campus 35, nominatim/building 22, nominatim/city fallback 127,
    unresolved 9.
  - The unresolved come from awkward printed localities ("Kaohsiung City", "Seoul-si", "Yorktown Heights /
    Albany, NY", "Shimodate") or no printed city (Taiyo Ink, Shinko, Applied Materials).
  - Next: a site-review agent (no network) checks identity/location/precision and proposes query overrides
    (`wikidata_search` / `nominatim_query` columns), then a refinement run on the flagged sites only. Waiting for a
    free agent slot (7 busy).
- 00:03: site review finished (`data/_staging/geo_sites_review.{csv,md}`, offline).
  - Verdicts: 127 ok (39 of them city fallbacks with no identifiable site), 84 weak, 22 wrong, 9 unresolved.
  - Causes:
    - Suffixed localities ("Kaohsiung City", "-si") fail or match far away.
    - Ambiguous names: University Park -> Texas, Agrate -> Agrate Conturbia, Santa Clara -> the county
      centroid.
    - An empty locality skips the distance check, so namesake facilities anywhere are accepted (Intel ->
      Austin, IBM -> Durham).
    - Acronym namesakes: ASE Austin -> UT Aerospace Engineering.
    - Wikidata main campus where a satellite campus is printed: Suzukakedai, Kashiwa, Daxing.
    - Prefectures/states labelled as city.
- 00:10: coordinator decisions (printed data only, no cross-paper inference):
  - Printed localities stay as printed in the table. Disambiguations go to a query-only `locality_query`
    (Kaohsiung, Icheon, University Park PA, Seoul, Taipei, Agrate Brianza, Daejeon, Taichung, Chikusei for
    Shimodate, Yorktown Heights for "Yorktown Heights / Albany, NY", where the printed unit is Watson).
  - Rows where the extractor left the locality empty but the paper prints a state: locality set to the printed
    state (IBM Systems "NY" x4, Intel "Oregon, OR", Intel "Arizona"); notes added; backup in cache/backups.
    IBM Research-Tokyo (only "Japan" printed) and the 31 iedm45625 Intel rows stay unresolved.
  - Schema: site_precision += `region` (printed prefecture/state/province: Kanagawa, Saitama, Nagano, Kagawa,
    Tochigi, Hyogo, Chiba, Ibaraki, Arizona, NY, Oregon, Laguna, Chungcheongbuk-do).
  - Geocoder rules:
    - Strip City/-si/-shi/-ken for the lookup.
    - Reject county/state hits for a city locality (US structured city/state retry).
    - Empty locality without overrides -> unresolved.
    - Wikidata needs a successful locality check.
    - An override hit must have an OSM label naming the queried facility.
    - precision_override / label_override / override_note columns.
  - Override queries accepted only at confidence high/medium and when the reason does not rest on
    "believed / not printed / inferred": 64 used, 18 skipped (those sites fall back to the printed city or
    region centre).
  - Tracked overrides: `config/geo_site_overrides.csv` (87 rows).
  - Refinement run 2 on all 243 sites started (`data/_staging/geo_sites_run2.csv`).
- 00:15: refinement run 2 fixed most flagged sites, but 7 previously-ok sites regressed to unresolved (Marvell
  Santa Clara, SIMIT Shanghai, Penn State, Fukuoka University, Unimicron "Hsinchu County", DuPont Miaoli, iNEMI
  Shanghai). Cause: the county/state rejection dropped the locality entirely.
  - Fix: `locate()` retries settlement -> city -> US structured -> free text. A county/state-only match is kept
    as the locality at precision region.
- Run 3 (`data/_staging/geo_sites_run3.csv`):
  - 243 sites: wikidata/campus 54, nominatim/campus 49, nominatim/building 22, city centre 92, region 18,
    unresolved 7.
  - All 7 unresolved have no printed city (Intel, TSMC, Taiyo Ink, Shinko, AGC, Applied Materials, IBM empty
    localities). No ok-site regressions.
  - Previously wrong sites now: IBM Albany -> Albany NanoTech; Intel Santa Clara -> Robert Noyce Building;
    STMicroelectronics Agrate -> Agrate Brianza; Peking University -> Daxing; ASE Austin -> city centre
    (no namesake).
- Final `data/org_sites.csv`: 243 rows; `site_id` gets a country suffix where the same org/locality appears in
  two countries. Every affiliation (org, locality, country) has a site; validator 0 errors.
- 00:17: map panel + canonical-organization agent launched. It uses the coordinator's dev server at
  127.0.0.1:47331.
- 00:30: map panel + canonical organizations done (agent).
  - `build_views.py`: emits `sites` (235 placed; 8 unresolved get no pin), per-paper `affil` {a, n, s, k}
    (1964/2020 affiliations, 235/239 papers located) and `orgs_canonical` (byline order); printed `orgs` kept as
    provenance. `org_aliases` (from `config/org_aliases.yaml`) maps old filter URLs forward. 0 warnings.
  - App: the table column, org filter, URL state, search text, TV tooltip, drawer, Explore panel h and the dashboard
    tile use canonical names. The table hover shows "printed: ...". The org list in the URL is now '|'-separated
    because names contain commas. Old comma-separated or printed names are mapped via alias/exact match or dropped.
  - Explore panel j (full width after a/b): `GeoPanel.svelte` + `geo.ts` ported from eo-modulator-atlas.
    - sites/lump and authors/papers toggles, bucket pies.
    - Region-precision sites read "printed region only" in the hover.
    - Map centre/zoom are carried in the layout: uirevision alone snapped back to the world view after a mode
      toggle followed by a zoom across a road threshold.
  - Checks: svelte-check 0 errors, build ok, validator 0 errors. No test runner in app/ (geo.test.ts not ported; its 3
    cases pass ad hoc under node). Screenshots (world, East Asia, Taiwan, Hsinchu, US, Tokyo roads, cluster and region
    hovers, table, 390 px): 0 external requests, 0 console errors.
  - Known gap: ASE "Kaohsiung" and "Kaohsiung City" are two sites (printed locality differs).
- 00:31 coordinator check of the map agent's screenshots: world lump view (Taiwan 353, Japan 283, Korea 218,
  Europe 239, US hubs), Taiwan zoom split (Hsinchu 246, Taichung 15, Kaohsiung 75, Taipei 6), and the table
  showing a single "TSMC" (22 papers; org filter lists canonical names).
- 00:31: affiliation audit launched: 30-paper stratified sample plus DB-wide checks, output
  `DevLog/audits/affiliations_audit_2026-10-20.md`.
- 00:42: affiliation audit (`DevLog/audits/affiliations_audit_2026-10-20.md`):
  - Sample: 30 papers, 299 authors, 307 rows. 0 errors in names/order/mapping/org/unit/locality/country/kind;
    95% upper bound about 10% of papers.
  - Consolidation defects (metadata):
    1. 23 groups / 36 duplicate sites from spelling variants (243 -> 207).
    2. About 10 region-only localities pinned to one facility. Coordinator error: override queries were allowed
       on locality_level=region sites.
    3. Subsidiaries canonicalized two ways (13 rows).
    4. nepes multi-site bylines fanned out to every author (38 rows, 3 papers).
    5. Unverified org facts; 34 names keep legal suffixes.
  - Side note: 5 papers have font-shifted text layers without TEXT_LAYER_WARNING.md (overlaps the DevLog-005
    list).
- Fix plan:
  - Agent: defects 3-5 on a staged copy (`data/_staging/affil_fix/`), applied by the coordinator after review.
  - Coordinator, afterwards: defect 1 (normalized site key; printed locality kept in author_affiliations,
    variants listed per site) and defect 2 (region-level localities -> region centre unless the paper itself
    prints a postcode/address identifying the facility), then a re-geocode of the affected sites.
- 00:57: affiliation fixes applied (zip backup `cache/backups/affil_before_fix_*`).
  - The agent staged D3/D5/D6/D8 + subsidiaries in `data/_staging/affil_fix/`: 148 changes in changes.csv;
    FIX_REPORT.md written by the coordinator, because agents cannot write report .md files.
  - Result: affiliation rows 2020 -> 1996, organizations 136 -> 144 (8 printed subsidiaries with parent_org,
    35 legal-suffix renames appended to `config/org_aliases.yaml`).
  - Subsidiary rule added to AFFILIATION_INSTRUCTIONS.md.
  - Coordinator decisions on the open questions are recorded in FIX_REPORT.md.
- Site fixes (coordinator):
  - Overrides re-keyed to the renamed orgs.
  - Facility queries removed from 9 region-level overrides; ULVAC Kanagawa keeps its query because its postcode
    253-8543 is printed.
  - The 3 removed nepes multi-site overrides were dropped.
  - Geocoder: a region-only locality gets the region centre with no facility search inside it. Region-only
    localities are auto-detected (US state names/abbreviations, JP prefectures; DC excluded) and region queries
    are deduplicated ("Oregon, Oregon" -> "Oregon").
    - Found during the run: Intel "Oregon, OR" had no override and had been pinned to the Hillsboro campus.
  - Schema: `org_sites.locality_variants` (other printed spellings of the same place).
  - Validator: each (org, locality, country) maps to exactly one site, and every affiliation maps to a site
    (warning otherwise).
  - build_views maps the variants.
  - Duplicates merged by (org, country, coordinates to 4 decimals): 19 groups, 243 -> 214 sites. Examples:
    Kaohsiung/Kaohsiung City; Cheonan-si x4; Icheon x3; Intel Chandler x3 and Hillsboro x3; IBM Yorktown
    Heights x4; Penn State University Park/State College.
  - Final: 214 sites (campus 79, building 15, city 82, region 29, unresolved 9; every unresolved site has an
    empty printed locality).
  - atlas.json: 205 pinned sites, 1926/1996 affiliations located on 232 papers (was 235). The 3 nepes
    multi-site papers lost their arbitrary pins by design. Validator 0 errors, build_views 0 warnings.
- 2026-10-20 09:21: bug report (Wentao): "Internal Error" after browsing the map.
  - Reproduced headless (40 wheel zooms + 20 pans on /explore): 1003 console errors and the SvelteKit error page.
    The dev log shows 1222 errors in 37 s of the owner's browsing.
  - Causes:
    1. Svelte `effect_update_depth_exceeded`: the map's afterplot callback wrote state (mlMap, mapTick) that
       re-triggered render effects.
    2. Plotly `e.emit is not a function`: every plotly_relayout updated reactive zoom+centre, which re-derived
       traces/layout and called Plotly.react again; the centre/zoom feedback re-triggered relayout, and
       overlapping react calls hit a map object being rebuilt.
  - Fix, `app/src/lib/Plot.svelte` (all plots):
    - Renders serialized: one Plotly.react in flight, later changes coalesce into one follow-up.
    - Props read untracked inside the async render.
    - Every Plotly call and user callback guarded (try/catch, warn).
    - afterplot fires from Plotly's event only (plus once after the first bind).
    - ResizeObserver throttled to one resize per frame and skipped before the first plot.
    - All work ignored after destroy.
  - Fix, `app/src/lib/GeoPanel.svelte`:
    - Traces depend only on a zoom quantized to 0.25 steps, applied 120 ms after the interaction settles.
    - The live centre/zoom is kept outside reactive state and passed back only when the traces re-render (no
      snap-back, no feedback).
    - The pie overlay redraws at most once per animation frame.
    - The mlMap write is untracked; non-finite coordinates are skipped.
  - Result (same headless interaction):
    - 0 errors (was 1003), no error page.
    - 1 long task (82 ms) in about 10 s of zoom/pan.
    - The map re-renders once per settled zoom level.
    - Clusters split with zoom (Taiwan view: 26 -> 36 -> 39 -> 50 bubbles; Hsinchu 267 / Kaohsiung 75).
    - All five pages load with 0 console errors.
    - pnpm check 0/0; pnpm build ok.
  - eo-modulator-atlas has the same GeoPanel/Plot pattern and probably the same bug; not changed (other repo).
