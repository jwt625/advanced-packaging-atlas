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

- [ ] Schema v2.3 + validator for the three tables; staging batches g000-g007
- [ ] Extraction (agents)
- [ ] Organization consolidation
- [ ] Audit + corrections, merge
- [ ] Geocoder port, pilot, full run
- [ ] Site review + fixes
- [ ] build_views + map panel + checks
- [ ] Canonical organizations in the app (Wentao, 2026-10-19 23:13: the table shows several TSMC spellings).
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
