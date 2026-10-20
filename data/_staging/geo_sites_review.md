# Geo site review, run 1 (DevLog-006 step 5)

- Input: `data/_staging/geo_sites_run1.csv` (242 sites). Output: `data/_staging/geo_sites_review.csv` (one row per input site, same order).
- Method: offline review, no network. Inputs were source_label, coordinates and distance notes, the printed affiliation rows (`data/author_affiliations.csv`), and page 1 of `references/<paper_id>/text.md`.
- Facility names in the queries come from printed addresses where available. The rest are well-known campus or plant names, which are offline knowledge and carry a confidence mark. No coordinates were written.
- Overrides go in the `wikidata_search` and `nominatim_query` columns for the refinement run. A `nominatim_query` without a `wikidata_search` skips Wikidata and allows 100 km from the locality centre. `locality_fix` is a proposed edit to `author_affiliations.locality`; apply it there, then rebuild the site list.

## Counts

| verdict | n | high | medium | low |
|---|---|---|---|---|
| ok | 127 | 73 | 15 | 39 |
| weak | 84 | 18 | 34 | 32 |
| wrong | 22 | 10 | 11 | 1 |
| unresolved | 9 | 8 | 1 | 0 |
| total | 242 | | | |

- Sites with at least one override query: 82 (10 `wikidata_search`, 80 `nominatim_query`). Sites with a `locality_fix`: 13.
- `ok` includes 39 city-centre fallbacks for organizations with no identifiable site (list below). Their confidence is low because a web lookup might still find a facility.
- 18 of the queries are low confidence: Japanese plant names, or a plant inferred from the unit. Run them, but check each result's label before accepting it.

## Patterns (geocoder and data)

1. **Suffixed localities fail the settlement lookup or match the wrong place.**
   - "Kaohsiung City", "Taichung City", "Taipei City" and "Seoul-si" return nothing.
   - "Daejeon-si" matched a place in Gyeongbuk (~190 km off). "Ichon-si" matched a settlement ~120 km from Icheon.
   - Fix in data (table below), or strip " City" / "-si" / "-shi" / "-ken" in `city_query` before the lookup.
2. **Ambiguous bare names.**
   - "University Park" resolved to University Park, Texas. "Agrate" resolved to Agrate Conturbia (Novara) instead of Agrate Brianza.
   - "Santa Clara" / "Santa Clara, CA" / "Santa Clara, California" resolve to the Santa Clara County centroid (37.233, -121.685), ~25 km south of the city.
     - The resolved facilities (Applied Materials, Marvell, Intel) are still correct; only their distance notes (28-33 km) are inflated.
     - The two city fallbacks (Celestial AI, GlobalFoundries Santa Clara) sit in the county centroid: wrong.
   - Suggested geocoder fix: reject a settlement result whose addresstype is county/state when the printed locality has a city part.
3. **Region-level localities become region centroids recorded with precision `city`.**
   - Affected: Kanagawa, Saitama, Nagano, Kagawa, Tochigi, Hyogo / Hyogo-ken, Fukuoka (the point is in the prefecture interior, not Fukuoka city), Chiba, Ibaraki, Arizona, NY, Chungcheongbuk-do, Laguna.
   - Suggest a `region` precision value (or a note) so the map does not present them as city points.
4. **An empty locality disables the distance check, so any namesake facility in the country is accepted.**
   - Affected: Intel US -> Austin office; IBM US -> Durham NC; IBM JP -> Hiroshima office; AGC -> Amagasaki factory; Intel MY -> Kulim KM3; TSMC -> Fab 7.
   - Suggested geocoder rule: an empty locality yields `unresolved` (or a country-level point flagged as such) unless an override is given.
   - An override query cannot force `unresolved`, so set these manually.
5. **Namesake or acronym collisions.**
   - "ASE, Austin" -> UT Aerospace Engineering Building.
   - "IBM, Albany" -> the historic downtown "IBM Building" (80 State St), not IBM Research at Albany NanoTech.
   - "Intel, Santa Clara" -> the McAfee building on Mission College Blvd (near Intel HQ, wrong label).
6. **The Wikidata main-campus coordinate is accepted inside 50 km although the printed locality names a satellite campus.**
   - Tokyo Tech / Institute of Science Tokyo, printed Kanagawa or Yokohama: Ookayama chosen; the campus is Suzukakedai.
   - University of Tokyo, printed Chiba with an issp email: Hongo chosen; the campus is Kashiwa.
   - Peking University, printed 102600: Yanyuan chosen; the campus is Daxing.
   - Wikidata P625 holds one coordinate for these items, so the nearest-coordinate rule cannot help.
7. **Asian corporate sites.** OSM names are mostly in local script, so English org names miss them. Most JP/KR/CN/TW queries are therefore in Japanese, Korean or Chinese.
8. **Minor issues.**
   - CEA-Leti resolved to a Wikidata item with no English label (Q134487000); its point is on the CEA Grenoble campus, so set `source_label` manually.
   - Apple resolved to Apple Park Visitor Center but recorded precision `city`.
9. **Duplicate sites from spelling variants of one place** (optional normalization; geocoding already gives the same point):
   - Samsung Cheonan-si / Chonan-Si / Chonan-Si, Chungcheongnam-do / Cheonan-si, Chungcheongnam-Do.
   - Resonac Kawasaki / Kawasaki, Kanagawa.
   - SK hynix Icheon / Icheon-si (and Ichon-si, fixed below).
   - IBM Yorktown Heights / Yorktown Heights, NY / Yorktown, NY.
   - IBM East Fishkill / East Fishkill, NY. IBM Albany / Albany, NY. IBM Bromont / Bromont, Quebec.
   - Intel Chandler / Chandler, AZ / Chandler, Arizona. Intel Hillsboro / Hillsboro, OR / Hillsboro, Oregon.
   - UCLA x3. Georgia Tech x2. Penn State University Park / University Park, PA / State College / State College, PA.
   - AIST Tsukuba / Tsukuba-shi. Deca Tempe / Tempe, AZ. nepes San Diego / San Diego, CA. nepes hayyim Binan / Laguna.
   - Unimicron Hsinchu / Hsinchu County: possibly two different plants, so keep both.

## Proposed locality fixes (edit `author_affiliations.locality`)

| org_name | printed locality | locality_fix | conf | n | aff_ids |
|---|---|---|---|---|---|
| ASE | Kaohsiung City | Kaohsiung | high | 23 | ectc51846.2026.00117-a01-1, ectc51846.2026.00117-a02-1, ectc51846.2026.00117-a03-1, ectc51846.2026.00117-a04-1, ectc51846.2026.00117-a05-1, ectc51906.2022.00038-a01-1, ectc51906.2022.00038-a02-1, ectc51906.2022.00038-a03-1, ectc51906.2022.00038-a04-1, ectc51906.2022.00038-a07-1, eptc53413.2021.9663896-a03-1, eptc53413.2021.9663896-a04-1, eptc56328.2022.10013262-a03-1, eptc56328.2022.10013262-a04-1, eptc56328.2022.10013262-a05-1, eptc56328.2022.10013262-a06-1, eptc59621.2023.10457909-a01-1, eptc59621.2023.10457909-a02-1, eptc59621.2023.10457909-a03-1, eptc59621.2023.10457909-a04-1, eptc59621.2023.10457909-a05-1, eptc59621.2023.10457909-a06-1, eptc59621.2023.10457909-a07-1 |
| SK hynix | Ichon-si | Icheon-si | high | 10 | ectc51687.2025.00007-a01-1 .. a07-1, ectc51909.2023.00179-a01-1, ectc51909.2023.00179-a05-1, ectc51909.2023.00179-a07-1 |
| Pennsylvania State University | University Park | University Park, PA | high | 7 | ectc51687.2025.00076-a01-1, ectc51687.2025.00076-a03-1, ectc51687.2025.00076-a06-1, ectc51846.2026.00123-a01-1, ectc51846.2026.00123-a03-1, ectc51846.2026.00123-a04-1, ectc51846.2026.00123-a07-1 |
| SK hynix | Seoul-si | Seoul | high | 4 | ectc51909.2023.00179-a04-1, ectc51909.2023.00179-a06-1, ectc51909.2023.00179-a09-1, ectc51909.2023.00179-a10-1 |
| National Taiwan University | Taipei City | Taipei | medium | 3 | ectc51906.2022.00038-a05-1, ectc51906.2022.00038-a06-1, ectc51906.2022.00038-a08-1 |
| STMicroelectronics | Agrate | Agrate Brianza | high | 3 | icept59018.2023.10492317-a03-1, icept59018.2023.10492317-a04-1, icept59018.2023.10492317-a05-1 |
| Korea Advanced Institute of Science and Technology | Daejeon-si | Daejeon | high | 2 | eptc67330.2025.11392132-a02-1, eptc67330.2025.11392132-a06-1 |
| Applied Materials | Taichung City | Taichung | high | 1 | ectc51529.2024.00096-a05-1 |
| JOINT2 | Shimodate | Chikusei, Ibaraki | high | 1 | ectc51529.2024.00155-a05-1 |
| Resonac Corporation | Shimodate | Chikusei, Ibaraki | high | 1 | ectc51529.2024.00155-a05-2 |

Notes on the table:
- Shimodate was merged into Chikusei in 2005. If the printed value must be kept, store "Shimodate" in `note` and geocode with the fix.
- Penn State "University Park, PA" already resolves as a site (Wikidata, no locality check), so the fixed rows merge into it.
- ASE "Kaohsiung" and SK hynix "Icheon-si" already resolve as sites, so their fixed rows merge too.

### Two sites in one string, or no city printed: decisions needed

| case | aff_ids | proposal | conf |
|---|---|---|---|
| IBM "Yorktown Heights / Albany, NY" (block unit "IBM T. J. Watson Research Center"; Sakuma, Bonilla, McHerron) | ectc51909.2023.00150-a01-1, -a02-1, -a03-1 | locality "Yorktown Heights, NY". The printed unit is the Watson Research Center, which is in Yorktown Heights. The per-author split between the two cities is not printed. Alternative: keep one block and add a second site row "Albany, NY" for the same aff_ids. | medium |
| IBM Research - Tokyo, empty locality (Toyohiro Aoki; printed "IBM Research -Tokyo, Japan") | ectc51909.2023.00150-a04-1 | locality "Kawasaki". The same unit is printed with "Kawasaki, Japan" in ectc51529.2024.00051, ectc51687.2025.00049, ectc51846.2026.00050 and ectc51906.2022.00106. This is cross-paper inference, not printed here. | medium |
| IBM Systems, empty locality (printed "IBM Systems, NY, U.S.A."; Kastberg, Pomerantz, Bunt, Wassick) | ectc51909.2023.00150-a05-1 .. -a08-1 | locality "NY" (the printed state); this geocodes to a state centroid. Wassick and Kastberg print East Fishkill, NY in ectc51529.2024.00051, ectc51909.2023.00180 and ectc51909.2023.00235, so "East Fishkill, NY" is possible as a low-confidence inference. | medium ("NY"), low ("East Fishkill, NY") |
| Intel, empty locality (site `Intel` / US, 34 rows) | ectc51687.2025.00051-a10-1 (printed "Oregon, OR, USA"); ectc51687.2025.00187-a07-1 (printed "Intel, Arizona, US"); iedm45625.2022.10019499-a01-1 .. a31-1 (printed "Intel Corporation, USA" only) | Split the site. a10-1: locality "Oregon" is unsafe for the settlement lookup (towns named Oregon in WI/IL/OH); "Hillsboro, OR" is an inference (Intel's Oregon campuses are in Hillsboro), low. a07-1: locality "Arizona" (state, same as the Lightmatter/Amkor rows). The iedm45625 rows have no identifiable site and should be `unresolved` or country-level. The run-1 Austin point is wrong. | high (split), low (Hillsboro) |
| IBM "NY" (unit "IBM Research - Watson Research Center") | iedm50572.2025.11353491-a11-1, -a12-1 | Keep the printed "NY"; the Watson override query resolves it, within 100 km of the state centroid. Optional locality "Yorktown Heights, NY" from the printed unit. | high |
| Lightmatter "Arizona", Amkor "Arizona" | ectc51846.2026.00176-a01-1, -a02-1, -a05-1 | State only; no site. Amkor's HQ is in Tempe, but the paper prints only the state. | high |

## Organizations with no identifiable site in the printed locality

For these, the city centre (or unresolved) is the honest answer. A web lookup might still find a facility for some.

- **No city printed:**
  - Taiyo Ink Mfg. (icep58572.2023.10129695).
  - Shinko Electric (icep-iaac64884.2025.11003038).
  - AGC Inc. (same paper; the run-1 Amagasaki point is wrong).
  - Applied Materials "South Korea" (ectc51846.2026.00130-a08-1).
  - TSMC (ectc51909.2023.00108; no address, the Fab 7 point is an HQ proxy).
  - Intel Malaysia ATTD (icep-iaac64884.2025.11003038-a01-1; Kulim and Penang both plausible).
  - Intel iedm45625 rows.
- **State or province only:** Lightmatter Arizona, Amkor Arizona, nepes Chungcheongbuk-do, nepes hayyim Laguna (the province centroid; a Laguna Technopark query is proposed from other nepes papers).
- **City printed, facility not identifiable offline:**
  - US: Xperi (San Jose); Adeia (San Jose, CA); Sciperio (Orlando); Yield Engineering Systems (Chandler; Fremont); Absolics (Covington, GA); Applied Materials (Cambridge, MA); Thin Film Technology (North Mankato, MN); MediaTek (San Jose, CA); Murata Electronics North America (San Jose, CA); Resonac (San Jose, CA); Ajinomoto Fine-Techno USA (Cupertino); nepes (Phoenix, AZ); Microsoft (Hillsboro, OR).
  - Canada and Europe: Microsoft (Calgary; Nantes); Intel (Livingston, UK); Renesas (Germering); Corning Optical Communication (Berlin); PHIX (Enschede); ASM (Helsinki).
  - Taiwan: Unimicron (Hsinchu; Hsinchu County); AP Memory (Hsinchu); Ableprint (Hsinchu); DuPont (Miaoli); Renesas (Taichung); Taiwan Foresight (Jhubei; the printed street line is garbled).
  - Korea: ELSPES (Hwaseong); Nopion (Suwon); SK hynix (Dongtan; Suwon; Hanam).
  - Japan: Spectronix (Osaka); AOI Electronics (Tokyo office); Micro Technology (Tokyo); SAIMEMORY (Tokyo).
  - China and Singapore: iNEMI (Shanghai); WinTech Nano-Technology Services (Singapore).
- **Facility exists but its name or building could not be determined offline** (weak, no query): Resonac / JOINT2 / Showa Denko Materials Kawasaki (Packaging Solution Center); Resonac Kanagawa, Chiba, Ibaraki; DNP Kashiwa and Chiba; FICT Nagano; ULVAC Chiba; CAEP Chengdu; Corning Technology Center Korea (Asan); Micron Taichung.

## Refinement-run notes

- Rows to re-run are the `weak`, `wrong` and `unresolved` rows that have a query or a `locality_fix` (82 with queries, plus the locality fixes).
- Accept a result only if its `source_label` names the organization or the facility in the query. Points on a station, a road or a different company should be rejected and kept at the city centre.
- Queries built from printed street addresses (high confidence): IME and LightSpeed (Singapore), ST Toa Payoh, nepes San Diego, Deca Tempe, Brewer Science Rolla, SUSS Sternenfels, ASM Leuven (Kapeldreef 75).
- Co-location overrides via a known Wikidata item:
  - CNRS LN2 -> Université de Sherbrooke.
  - BNRist -> Tsinghua University.
  - IBM Watson -> Thomas J. Watson Research Center (if that item has no P625, the Nominatim query is the fallback).
