# Affiliation audit (DevLog-006 step 3), 2026-10-20

Fresh-context audit of `data/author_affiliations.csv` (2020 rows, 238 papers), `data/organizations.csv` (136),
`data/org_sites.csv` (243). Contract: `data/_staging/AFFILIATION_INSTRUCTIONS.md`, `config/org_aliases.yaml`, schema v2.3.
Read-only. Every sampled byline was compared to `text.md` p.1. Where the layout or encoding mattered, the PDF page 1 was
also rendered at 200-300 dpi (grids, superscripts, OCR, font-shifted text).

Severity: **blocking** = wrong org / country / author mapping; **metadata** = canonicalization, site, or policy
inconsistency that skews counts or the map; **minor** = cosmetic or documentation.

## Verdict

- Sample: 30 papers, 299 authors, 307 rows. **0 blocking errors.** Every author name, byline order, author-to-affiliation
  mapping, org identity, unit, printed locality, country and kind matched the printed page.
- DB-wide: no locality/country conflicts, no aff_id format errors, no kind/aff_order errors, and no affiliation without
  a site.
- The defects are in canonicalization policy and in `org_sites`, not in the extraction:
  - 36 redundant sites from locality spelling and romanization variants (760 rows affected).
  - Subsidiaries handled two different ways.
  - Ambiguous multi-site nepes bylines fanned out to every site.
  - About 10 sites with only a printed prefecture/state pinned to a specific facility.

## Sample (seed 20261020, `random.Random(seed).sample` over sorted strata)

Strata come from a page-1 heuristic: superscript/numeric markers, a TEXT_LAYER_WARNING.md, and the tcpmt prefix.
Stratum B = no markers, no warning, not a journal, and (>= 8 authors or >= 3 orgs).

| Stratum | paper_id | authors | rows | orgs | checked against | result |
|---|---|---|---|---|---|---|
| A superscript | vlsitechnologyandcir65830.2026.11577576 | 7 | 7 | 1 | text p.1 | ok; SK hynix America Inc. folded into SK hynix (policy, D2) |
| A | ectc51909.2023.00230 | 5 | 5 | 2 | text p.1 | ok |
| A | vlsitechnologyandcir46783.2024.10631478 | 35 | 35 | 1 | render 300 dpi (text font-shifted) | ok: superscripts 1/2/3 -> TD/DEG/CCG all match; two distinct "Y. Yang" (1, 3) correct |
| A | icep61562.2024.10535612 | 4 | 4 | 1 | text p.1 | ok |
| A | ectc51906.2022.00179 | 17 | 17 | 1 | text p.1 | ok |
| A | ectc51687.2025.00085 | 12 | 12 | 1 | text p.1 | ok |
| A | ectc51909.2023.00252 | 5 | 5 | 3 | text decoded (+29 font shift) | ok (IME x3, GlobalFoundries Bangalore IN, Qorvo San Jose) |
| A | ectc32862.2020.00185 | 3 | 3 | 1 | text p.1 | ok |
| A | vlsitechnologyandcir46783.2024.10631441 | 20 | 20 | 3 | render 300 dpi | ok: unmarked -> IMEC; superscripts 1 ASM Belgium, 2 ASM Helsinki, 3 KLA Newport UK |
| A | ectc51909.2023.00298 | 4 | 5 | 2 | text p.1 | ok (Swaminathan 1,2 -> GT primary, Penn State additional) |
| B shared/many | ectc51529.2024.00151 | 12 | 12 | 1 | text p.1 | ok (ASE Austin x2, Kaohsiung x10) |
| B | ectc51687.2025.00049 | 7 | 10 | 3 | text p.1 | ok (3IT + LN2 CNRS double affiliation; IBM Canada; IBM Research-Tokyo) |
| B | ectc51529.2024.00088 | 12 | 12 | 1 | text p.1 | ok (Santa Clara x9, Singapore x3) |
| B | ectc51846.2026.00106 | 10 | 10 | 1 | text p.1 | ok; Corning subsidiaries kept as unit (policy, D2) |
| B | ectc51909.2023.00154 | 8 | 8 | 1 | text p.1 | ok |
| B | ectc51687.2025.00131 | 11 | 11 | 1 | text p.1 | ok |
| B | ectc51529.2024.00133 | 9 | 9 | 4 | render 200 dpi | ok; "Hroharu" as printed; "Chiba" printed (ISSP) |
| B | ectc51687.2025.00233 | 15 | 15 | 2 | render 200 dpi (4x4 grid) | ok, row-major order matches |
| B | ectc51846.2026.00336 | 14 | 14 | 2 | text p.1 | ok |
| B | ectc51529.2024.00258 | 10 | 10 | 1 | render 200 dpi (4x3 grid) | ok; author 2 King-Jien Chui omitted (only a gmail address printed, no affiliation) = contract-consistent gap (D7) |
| C journal | tcpmt.2025.3557745 | 3 | 4 | 3 | p.1 footnote | ok ("was with" GT primary, "now with" Apple present_address) |
| C | tcpmt.2023.3312037 | 11 | 11 | 1 | p.1 footnote | ok |
| C | tcpmt.2025.3610036 | 6 | 6 | 3 | p.1 footnote | ok (Penn State "State College, PA" as printed) |
| C | tcpmt.2026.3650893 | 8 | 8 | 2 | p.1 footnote | ok |
| C | tcpmt.2026.3740312 | 7 | 10 | 2 | render 200 dpi + footnote | ok (byline absent from text layer; BNRist additional for authors 4, 6, 7 matches) |
| D OCR | ectc51906.2022.00332 | 6 | 6 | 1 | render 200 dpi | ok |
| D | ectc51906.2022.00106 | 8 | 8 | 1 | render 200 dpi | ok (IBM Sysytems sic noted) |
| D | ectc51529.2024.00153 | 12 | 12 | 1 | render 200 dpi | ok |
| D | ectc32696.2021.00166 | 6 | 6 | 1 | render 200 dpi | ok (Chandler / Hillsboro / Santa Clara per author) |
| D | ectc51906.2022.00031 | 12 | 12 | 1 | render 200 dpi | ok |

Extra verification outside the sample:
- iedm45625.2022.10019499: 31 authors with (n) markers. The name and unit of all 31 match after parsing the byline.
- ectc51687.2025.00187: Intel Hsinchu/Arizona/Munich, ok.
- ectc51846.2026.00130: AMAT "South Korea" with no city, ok.
- tcpmt.2026.3708099: CAEP dual units, ok.
- ectc51909.2023.00048 and 00155: font-shifted text, ok after decoding.
- eptc59621.2023.10457612: "Jong Ming Chinq" is as printed (confirmed on the render).
- tcpmt.2026.3717381: gap confirmed. It is an accepted manuscript with no footnote or affiliations.

## Error rates (sample: 30 papers / 299 authors / 307 rows)

| Error type | checked | errors | rate | examples |
|---|---|---|---|---|
| Author name not as printed | 299 authors | 0 | 0% | - |
| Byline order | 299 | 0 | 0% | grids in 00233, 00258, 00153 read row-major, correctly |
| Missing / extra author | 30 papers | 0 (1 documented gap) | 0% | ectc51529.2024.00258 author 2 (no affiliation printed) |
| Author -> affiliation mapping | 307 rows | 0 | 0% | - |
| Wrong organization | 307 | 0 | 0% | - |
| Canonicalization policy (subsidiary handling) | 307 | 13 | 4.2% | vlsitechnologyandcir65830.2026.11577576-a01-1/-a06-1/-a07-1; ectc51846.2026.00106-a01-1..-a10-1 (see D2) |
| Unit | 307 | 0 | 0% | - |
| Locality as printed | 307 | 0 | 0% | - |
| Country | 307 | 0 | 0% | - |
| Kind | 307 | 0 | 0% | - |

Zero blocking errors in 307 rows. Because rows cluster within papers, the paper-level bound is the useful one:
0/30 papers gives a 95% upper bound of about 10% of papers (rule of three). The row-level bound (about 1%) is optimistic.

## Ranked defects

### D1 (metadata) Site splits from locality spelling and romanization variants

- Same org, identical lat/lon, different printed-locality strings:
  - 23 groups; 36 redundant `org_sites` rows (243 -> 207 after merge); 760 affiliation rows affected.
  - Map hovers and site counts list one physical site two to four times.
- Examples (row counts):
  - ASE: Kaohsiung (50) / Kaohsiung City (23)
  - Samsung Electronics: Cheonan-si (37) / Cheonan-si, Chungcheongnam-Do (8) / Chonan-Si (10) /
    Chonan-Si, Chungcheongnam-do (13)
  - SK hynix: Icheon (10) / Icheon-si (6) / Ichon-si (10)
  - Intel: Chandler (50) / Chandler, AZ (68) / Chandler, Arizona (21) / Arizona (1)
  - Intel: Hillsboro / Hillsboro, OR / Hillsboro, Oregon / Oregon, OR
  - IBM: Yorktown Heights / Yorktown Heights, NY / Yorktown, NY / "Yorktown Heights / Albany, NY" / NY
  - Others: Georgia Tech Atlanta / Atlanta, GA; UCLA x3; Applied Materials Santa Clara, CA / California; AIST Tsukuba /
    Tsukuba-shi; Resonac Kawasaki / Kawasaki, Kanagawa and Shimodate / Chikusei, Ibaraki; Penn State State College x2
    and University Park x2; nepes San Diego x2 and Cheongju x2; nepes hayyim Binan / Laguna; Deca, Corning, IBM
    Albany/Bromont/East Fishkill.
- Not a defect: Unimicron Hsinchu vs Hsinchu County are printed as different places, 5.4 km apart.
- Fix:
  - Keep `author_affiliations.locality` as printed.
  - Key sites on a normalized place, e.g. a `site_locality` column or a `config/locality_aliases.yaml`:
    - strip ", <state/prefecture>", " City", "-si", "-shi";
    - Chonan -> Cheonan, Ichon -> Icheon.
  - Then regenerate `org_sites` and `affil.s` in build_views.
  - Merging Penn State State College into University Park is a judgement call: the campus is the same, the printed
    names differ.

### D2 (metadata) Subsidiaries canonicalized two ways

- Separate org rows:
  - Murata Electronics North America Inc. (parent set)
  - Ajinomoto Fine-Techno USA Corporation (no parent)
  - Ajinomoto Fine-Techno Co., Inc. (no parent to Ajinomoto Co., Inc.)
  - nepes hayyim, nepes laweh, Sony Semiconductor Manufacturing Corporation
- Folded into the parent, with the subsidiary in `unit` or dropped:
  - SK hynix America Inc. (11577576-a01/-a06/-a07)
  - Corning Research and Development Corporation, Corning Optical Communication GmbH & Co. KG and Corning Technology Center
    Korea (ectc51846.2026.00106, ectc51687.2025.00063)
  - Amkor Technology Korea, Inc. (ectc51909.2023.00175), Intel Technology Malaysia (icep-iaac64884.2025.11003038-a01-1),
    IBM Canada, ASMPT Singapore Pte. Ltd., ASM Belgium
- Same place, two orgs: Cheongan-myeon is org `nepes` in ectc51906.2022.00136-a0N-2 and `nepes laweh` in
  ectc51909.2023.00266-a04-1.
- Effect: org filters and counts split one brand (Murata, Ajinomoto, nepes) while others are merged.
- Fix: choose one rule and record it in `config/org_aliases.yaml`. Recommended: fold to the brand org, keep the printed
  legal entity in `unit`, and record it in notes. The alternative is to keep separate orgs, always set `parent_org`, and
  roll up in the app.

### D3 (metadata) nepes multi-site bylines fanned out to every site

- Papers: ectc32696.2021.00174, ectc51906.2022.00136, iwlpc52010.2020.9375887.
- Each prints one author list and 2-3 addresses with no per-author mapping.
- Every author gets every address: the first is `primary`, the rest `additional`. That is 14 authors -> 38 rows.
  - San Diego is primary for all 14, which is arbitrary.
  - The Korea and Philippines sites are counted as additional affiliations that were never printed per author.
- In ectc32696.2021.00174 and ectc51906.2022.00136 the org comes only from the email domain (nepes.co.kr) and the
  acknowledgement; no org name is printed in the block. The notes state this.
- Fix:
  - Add kind `site_ambiguous` (or a note-driven flag), or one row per author with empty locality plus a paper-level list
    of sites.
  - In the map, weight these 1/N or exclude them from author counts.

### D4 (metadata) Prefecture/state-only localities pinned to a specific facility in `org_sites`

The printed locality is a state or prefecture, yet the site is resolved to one named facility at campus, building or
city precision:

| site | printed | pinned to |
|---|---|---|
| ibm-ny | "NY" | Watson Research Center, campus. Override row says `locality_level=region`. 4 of its 6 rows are IBM Systems (ectc51909.2023.00150-a05..a08), whose site is not printed. |
| intel-arizona | "Arizona" | Chandler campus |
| intel-oregon-or | "Oregon, OR" | Ronler Acres building |
| amkor-technology-arizona | "Arizona" | Peoria |
| mitsubishi-electric-corporation-hyogo | "Hyogo" | Sanda works of Mitsubishi Electric Mobility, a subsidiary site; Hyogo has several Mitsubishi Electric sites |
| shinko-electric-industries-co-ltd-nagano | "Nagano" | Nagano HQ |
| sony-semiconductor-solutions-corporation-kanagawa | "Kanagawa" | Atsugi |
| sumitomo-electric-industries-ltd-kanagawa | "Kanagawa" | Yokohama works |
| ulvac-inc-kanagawa | "Kanagawa" | Chigasaki |
| nepes-hayyim-laguna | "Laguna" | Laguna Technopark |

- This conflicts with the DevLog-006 00:10 rule: printed data only; region-precision for printed states and
  prefectures; no overrides that rest on inference.
- The affiliation rows themselves are correct.
- Fix: set precision `region` and the region centre for these sites, or require a printed unit or city that names the
  facility. Re-check why the `locality_level=region` override did not apply to ibm-ny.

### D5 (metadata) Unverified org-level facts left in notes

- "verify at merge" or "general knowledge" remains on:
  - ASMPT (country HK)
  - Kulicke & Soffa (country SG; rows US)
  - nepes laweh (parent nepes)
  - Sony Semiconductor Manufacturing Corporation (parent)
- Rows are unaffected. The org country/region/parent drive the dashboard roll-ups.
- Fix: verify from a primary source (company filing or website) and record source and date in notes, or clear the
  parent.

### D6 (minor) org_name legal-suffix inconsistency

- 34 of 136 org names keep legal suffixes, e.g. "Ajinomoto Co., Inc.", "ULVAC, Inc.", "Shinko Electric Industries Co.,
  Ltd.", "FICT LIMITED", "Corning Incorporated", "Microsoft Corporation".
- Merged brands drop them ("Intel", "Applied Materials", "Samsung Electronics").
- `config/org_aliases.yaml` says "own short English name/brand; legal suffixes ... merge".
- Display only today. It is a duplicate risk when later batches print a variant.
- Fix: strip suffixes where the brand is unambiguous and add the suffixed form as an alias.

### D7 (minor) Authors without a printed affiliation vanish from the table

- ectc51529.2024.00258 author 2 leaves an author_index gap.
- tcpmt.2026.3717381 has 9 authors and no rows.
- Contract-consistent, but per-paper author counts from this table are undercounts.
- Fix: document this in the schema comment, or allow a placeholder row (org `N/A`, kind `none`) if author counts matter.

### D8 (minor) org_type consistency

- Spot-check of 20 orgs (seeded): 20/20 plausible.
  - TU Dresden, AIST, iNEMI, TSMC (foundry), Apple, Univ. of Applied Science Berlin, ASML, DuPont, Ajinomoto, nepes,
    Sherbrooke, imec, AMAT, KETI, SPIL, Brewer Science, Science Tokyo, YES, ELSPES, Analog Photonics.
- Cross-org inconsistency: CNRS is `research_institute`, while CEA, CAS and CAEP are `government_lab`.
- Singapore Polytechnic is typed `university` (its note says so).
- Fix: one rule for national research agencies.

## DB-wide checks

| Check | Result |
|---|---|
| Papers covered | 238/239; gap tcpmt.2026.3717381 (confirmed, no affiliations printed) |
| aff_id format, kind/aff_order sequence, first row primary | 0 errors; kinds: primary 1932, additional 86, present_address 2 |
| present_address recall | "now with" / "present address" appears in 4 papers; 2 are real and both captured (tcpmt.2025.3557745, tcpmt.2023.3266666); 2 are false text hits |
| Org country absent from all its rows | 8 orgs. All legitimate non-HQ sites: ASM International (BE, FI), ASML (Wilton US), CNRS (LN2 Sherbrooke CA), KLA (Newport GB), Kulicke & Soffa (Fort Washington US), Renesas (TW, DE), STMicroelectronics (SG, IT, MY), iNEMI (Shanghai CN). No conflict. |
| Locality printed with >1 country | 0 |
| Same name at two author_index in one paper | 1: vlsitechnologyandcir46783.2024.10631478 "Y. Yang" x2. Verified distinct (superscript 1 and 3). |
| Same author_index with different name strings | 0 |
| Authors with >1 org in one paper | 55 (multi-affiliation; sampled cases correct) |
| Same author, >1 row of the same org | 23 authors in 5 papers: nepes x3 papers (D3); GT ectc51906.2022.00180 (two printed schools, ok); CAEP tcpmt.2026.3708099 (two printed units Chengdu/Mianyang, ok) |
| Author count vs byline | First author matches papers.csv for 238/238. Emails in the byline exceed authors only in ectc51529.2024.00258 (D7 gap), ectc51529.2024.00396 (gmail second address, ok) and ectc51846.2026.00035 (two addresses for Kurita, ok). |
| Names not found in p.1 text | 3 papers: font-shifted 10631478 (verified on render); ectc51529.2024.00144 "Douglas C.H. Yu" (text has a stray glyph "DouglasġC.H."); eptc59621.2023.10457612 "Chinq" (as printed) |
| Orgs never used in rows | 5 parent-only rows: A*STAR, CEA, COMAC, Chinese Academy of Sciences, Fraunhofer-Gesellschaft. Keep as parents; hide 0-paper orgs from the app's org filter. |
| parent_org integrity | 0 missing parents |
| Site coverage | every (org, locality, country) in rows has a site; no orphan sites |
| Site variants (D1) | 23 groups / 36 redundant sites |
| Empty locality rows | 56 (Intel 32 incl. iedm45625 x31, TSMC 12, Taiyo Ink 5, Shinko 3, AGC 2, AMAT 1, IBM 1). Verified as printed for iedm45625. |
| Font-shifted text layers without TEXT_LAYER_WARNING | 5: ectc51909.2023.00048, .00155, .00252, vlsitechnologyandcir46783.2024.10631441, .10631478. Affiliation rows for all 5 are correct (taken from renders); this flag matters for the other extraction tables. |

## Recommendations (ordered)

1. D1: add a normalized site key (locality aliases, including romanization), merge the 36 redundant sites, and
   regenerate the sites and `affil` in build_views. Printed locality stays in the affiliation table.
2. D4: downgrade the ~10 facility-pinned region sites to `region` (or require printed evidence), and fix the ibm-ny
   override not applying.
3. D2: fix one subsidiary rule in `config/org_aliases.yaml` and apply it to SK hynix America, Corning entities, Amkor
   Korea, Murata NA, Ajinomoto Fine-Techno (USA), nepes hayyim/laweh, and the Cheongan-myeon org.
4. D3: represent ambiguous multi-site bylines explicitly (new kind or weight), not as N `additional` affiliations.
5. D5/D6/D8: verify the flagged org facts from primary sources, strip legal suffixes to brand names, and align
   org_type for national labs.
6. No row-level re-extraction is needed. The sample shows 0 blocking errors, and the extraction quality is high across
   superscript, grid, journal and OCR layouts.
