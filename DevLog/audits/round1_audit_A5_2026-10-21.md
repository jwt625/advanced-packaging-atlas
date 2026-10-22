# Audit A5 (round 1): L14 affiliations and L17 SOTA research, 2026-10-21

Fresh-context audit, read-only on data and configs (this file is the only write). Rules: DevLog-013 shared rules,
DevLog-006, `data/_staging/AFFILIATION_INSTRUCTIONS.md`, `DevLog/audits/affiliations_audit_2026-10-20.md`.
Page renders made with uv + pymupdf into the session scratch dir (not tracked). Web reads: 15 requests, sequential;
two TSMC investor PDFs returned HTTP 403 to curl and were read through the fetch tool instead (no retry loop).

Severity: **BLOCKING** = wrong value / org / author mapping that would enter the DB or a template; **SIGNIFICANT** =
wrong source attribution or rule violation that misleads a reader; **MINOR** = precision, consistency or documentation.

## Verdicts

| Part | Verdict | Checked | Errors |
|---|---|---|---|
| 1 L14 affiliations | PASS, 0 blocking | 36 papers + gap paper, 262 authors, 269 of 409 new rows (66 %); 37/37 new orgs; 45/45 new sites; 12 locality_variants | 0 row errors; 0 SIGNIFICANT; 4 MINOR |
| 2 L17 SOTA research | PASS with 1 SIGNIFICANT | 44 values (24 web primary, 20 DB / figure) incl. every section-7 value with a numeric source | 0 wrong numbers; 1 SIGNIFICANT (reticle-dimension attribution, 2 places); 3 MINOR |

## Part 1: L14 affiliations

### Integrity checks

- `data/author_affiliations.csv`: the first 1996 lines are byte-identical to `git show HEAD:data/author_affiliations.csv`
  (prefix-identical, same order); 409 rows appended; 0 old rows lost.
- `data/organizations.csv`: 144 old orgs kept, old order preserved (37 new rows interleaved alphabetically). 3 old rows
  changed, `notes` column only: Adeia, Xperi, University of Applied Science Berlin (the photonics-atlas requests,
  documented in the L14 notes). SEC wording not re-fetched in this audit.
- `data/org_sites.csv`: 214 old sites unchanged except `locality_variants` appended on 12 (coordinates, precision,
  source untouched); 45 new sites.
- New rows: aff_id format, contiguous author_index, `primary` on aff_order 1, every author string found in its
  text.md (whitespace/hyphen-normalized), first author = `papers.first_author` for 57/57.
- `uv run python scripts/validate_db.py`: 0 errors, 0 warnings.

### Sample (every row of each paper compared with a fresh page-1 render and text.md)

| Stratum | papers | result |
|---|---|---|
| Re-ordered grids (9/9) | 3dic63395.2024.10830178, ectc51909.2023.00316, .00331, eptc67330.2025.11392176, .11392196, .11392620, estc55720.2022.9939446, estc60143.2024.10712019, .10712091 | row-major order matches the render in all 9; multi-affiliations (Collaert + VUB footnote; Tsinghua + BNRist / BAQIS) correct |
| Render-only bylines (2/2) | 001c.74577, ectc51687.2025.00060 | ok (LPKF Garbsen x5; 4x3 grid IME / AMAT Singapore by superscript 1/2) |
| Superscripts (8/8) | 001c.129513, 001c.129733, 001c.147098, 001c.147203, 001c.74748, iedm50572.2025.11353855, eptc59621.2023.10457729, ectc51906.2022.00323 | all superscript maps correct (incl. Serna 2,3 = MIT + Bridgewater State; Lee 1,2 = KETI + Yonsei) |
| Journal footnotes (6/6 + gap) | tcpmt.2021.3111345, tcpmt.2024.3507552, tcpmt.2025.3533388, tcpmt.2025.3614186, tcpmt.2026.3672227, tcpmt.2026.3736233; gap tcpmt.2026.3717381 | ok; "was with" / "now with" GTRI correct; gap confirmed (no "is with" footnote) |
| Remaining new-org / new-site carriers (11) | iedm50572.2025.11353487, ectc51846.2026.00243, 001c.147108, ectc51846.2026.00073, 001c.74770, 001c.94484, 001c.74775, ectc51906.2022.00240, ectc51846.2026.00202, ectc51909.2023.00021, ectc51909.2023.00240 | ok |

### Error rates (sample)

| Error type | checked | errors |
|---|---|---|
| Author name not as printed | 262 authors | 0 |
| Byline order | 262 | 0 |
| Missing / extra author | 36 papers | 0 |
| Author -> affiliation mapping | 269 rows | 0 |
| Wrong organization | 269 | 0 |
| Unit | 269 | 0 |
| Locality as printed | 269 | 0 |
| Country | 269 | 0 (5 rows use the org-HQ fallback, see F4) |
| Kind | 269 | 0 |

0/36 papers with an error: 95 % upper bound about 8 % of papers (rule of three).

### New organizations (37)

Names follow the self-name rule (e.g. printed "Luleå Technical University" -> Luleå University of Technology; "Vrij
Universiteit Brussels" -> Vrije Universiteit Brussel); org_type and country plausible for all 37. Subsidiary rule
applied correctly to Applied Materials Singapore Technology, Panasonic Industry, Panasonic System Networks R&D Lab.
(all printed with their own legal form) and GTRI (printed name). One parent decision is inconsistent (F2).

### New sites (45)

Identity and coordinates match the printed locality for all 45; precision labels honest (campus 16, building 2, city
14, region 4, unresolved 9 = no locality printed). Region sites for "Okayama", "Nagano", "Fukuoka" (001c.74775) and
the city override for Fukuoka University "Itoshima" follow the DevLog-006 printed-data rule. Four sites under-use a
printed postcode or street address (F1).

### Findings

- **F1 MINOR: printed postcode / street address not used for the site.** Labels are honest, pins are coarser than the
  paper allows. DevLog-006 rule: a region-level locality may be located when the paper prints a postcode or address
  that identifies the facility (ULVAC 253-8543 precedent).
  | site | printed | now | proposed override (`config/geo_site_overrides.csv`) |
  |---|---|---|---|
  | onto-innovation-massachusetts | "Massachusetts 01887, USA" (ectc51906.2022.00240) | region centre, note "printed region only" | query "01887, Massachusetts, USA", precision city (postcode), note "postcode printed" |
  | shinko-electric-industries-co-ltd-nagano (existing site) | "36 Kita-Owaribe, Nagano 381-0014" (001c.147203, 8 rows) | region centre "printed region only" (no longer true for these rows) | coordinator decision: query "381-0014 Nagano" (city or building precision) or a separate site for this printed address |
  | northrop-grumman-baltimore-md | "7323 Aviation Blvd, Baltimore, MD 21240" | Baltimore city centre | query "21240, Maryland, USA", precision city (postcode) |
  | nec-kawasaki-shi | "1753 Shimonumabe, Nakahara-ku, Kawasaki-shi, Kanagawa 211-8666" | Kawasaki-shi centre | query "Nakahara-ku, Kawasaki" (ward) or "211-8666", precision city |
  Owner: coordinator (geocoder override + re-run on these 4 only).
- **F2 MINOR: parent_org applied inconsistently to the same printed pattern.** "Tyndall National Institute, University
  College Cork" -> parent University College Cork ("printed together"); "Instituto de Telecomunicações, University of
  Aveiro" -> no parent ("no source for a parent relation"). Same evidence, opposite outcome. Correction: either add a
  primary source (Tyndall's own page) with retrieval date to the Tyndall row notes, or clear its parent_org; IT stays
  without a parent. Owner: coordinator / L14 follow-up.
- **F3 MINOR: report wording.** `data/_staging/g009/BATCH_REPORT.md`, row eptc67330.2025.11392176: "3x3 grid" -> the
  render shows a 3+3+2 grid (8 authors); rows are correct. Owner: L14 notes owner.
- **F4 MINOR: contract vs practice for country without any printed address.** 001c.147203 authors 9-13 (Panasonic
  Industry, Panasonic System Networks R&D Lab., Institute of Science Tokyo x2, NICT) carry country JP from the org HQ,
  noted per row. This matches the accepted precedent (ectc51909.2023.00108 TSMC, "country = org HQ, not printed") but
  the contract only allows "country of the printed city". Correction: add the HQ fallback (with the mandatory note) to
  `AFFILIATION_INSTRUCTIONS.md`, or blank these countries. Owner: coordinator.
- Not findings (checked): UCSD "San Diego, CA" as a variant of the La Jolla campus site (same campus); Tokyo Tech
  "Tokyo" pinned to the Wikidata main campus (standard university rule); "PhD." suffixes dropped from Northrop Grumman
  names (noted per row); IMT `other` (only the acronym is printed; the email domain is not used per contract).

## Part 2: L17 SOTA research

### Values verified (44; 0 wrong numbers, units or products)

Web, primary (read this audit, quotes match verbatim apart from dropped trademark signs):

| ids | source | result |
|---|---|---|
| T7, T10, T11, T12 | TSMC press release 2026-04-23 (pr.tsmc.com/english/news/3302) | 5.5x in production; 14x, ~10 compute dies, 20 HBM, 2028; > 14x 2029; 40-reticle SoW-X 2029: ok |
| T9, T13 | TSMC press release 2025-04-24 (news/3228) | 9.5x volume 2027, 12+ HBM; SoW-X 40X compute, volume 2027: ok |
| T15 | TSMC press release 2020-03-03 (news/2026) | ~1,700 mm2, 2X, up to 6 HBM, 96 GB: ok |
| T4, T5, T6, T8, T16 | TSMC 2025 AR ch.5 PDF | PDF p.4 (3.5x since 2024; 5.5x qualification 2026; 9.5x progress), p.8 (5.5x certified 2025, volume 2026), p.3 (second year of volume production): ok, page numbers ok |
| T2 | TSMC 2024 AR ebook p.102 | 1.0 -> 3.3 reticle, ~830 mm2 (garbled duplicated characters as noted): ok |
| T14 | TSMC Q3 2026 transcript p.12 | "real world production of 5x reticle size ... 9x ... 14x": ok |
| P1 | AMD CDNA 5 white paper | CoWoS-L (p.4); 12 stacks HBM4 (p.9); 8 XCD, 2 IOD, 2 FCD, 320 B (p.14); 2,048 bits x 12 stacks, 432 GB (p.22); "FCD and MID" naming conflict (p.14) real: ok |
| P5, P6 | NVIDIA Blackwell Ultra blog | dies 2/2, 192 / 288 GB HBM3E, 1,200 / 1,400 W; "Eight 12-Hi stacks" body vs 2025-09-24 note "12 HBM stacks": conflict exists as stated, not resolved: ok |
| E2, E3, E4, E5 | Intel Foundry HPC/AI brief 2025-11, p.5 Fig. 9, p.4-5 | table "2023 ~4x ~80x80 8 12 / 2026 > 8x ~120x120 12 > 20 / 2028 > 12x > 120x180 > 24 > 38"; "exceed 8x the reticle size"; 60 % / 90 % wafer utilization: ok |
| Q1, Q2, Q3 | Intel ark 8480+, Max 9480, 6980P | 77.5 x 56.5 mm FCLGA4677; 100 x 56.5 mm, 64 GB HBM; 104.5 x 70.5 mm FCLGA7529: ok |

DB / page renders:

| ids | locator | result |
|---|---|---|
| D2 | ectc51909.2023.00091 p.2 Fig. 3 (400 dpi render) | labels 58.9 mm (long, horizontal) and 44.1 mm; SoC1 + SoC2 in the middle, 4 HBM along each long edge; caption "~2,600 mm2 (3x) ... two (2) SoCs, a (1) Chiplet and eight (8) HBM": ok |
| D1 | ectc51909.2023.00091 p.1 Fig. 2 (render) | 1.75X ~1400 / 2.2X ~1760 / 3.3X ~2800; 4 / 6 / 8 HBM; 32 / 96 / 128 GB: ok |
| T1 | ectc51909.2023.00091 p.2 footnote 1; ectc51909.2023.00174 p.2 | 830 mm2 in both; 25.52 x 32.52 mm only in 00174 (G1) |
| D3, D5, D8 | 00174 p.2 Sec. I-II.A; 00091 p.2 | ~2500 mm2 3x, record 3 SoC/chiplet + 8 HBM, 4x ~3300 mm2; 70 x 76 mm text, 43 x 58 mm; 65 mm (4x) and 75-85 mm (5x-6x) estimate, 1 mm extension: ok |
| D6, D7 | DB cells 00091-b, -b-c1..c7; -a, -a-c1..c8 | 4.8, 4000 mm2, 6 SoC, 12 HBM2E, 18 LSI, 45 IPD, 91 x 91 3-2-3, ring; 1.6x, 2 SoC + 4 HBM2E + 8 dummy, 6 LSI, lid 2000 um: ok |
| section 7 cowos_s | ectc51529.2024.00049-a-c2 (11 x 11), ectc51909.2023.00135-a-c4 (85 x 85) | cells exist: ok |
| E7 | ectc51687.2025.00051 p.4 Fig. 6 (450 dpi render) | every label as quoted, incl. "~12mm0x120mm", "72.5x82.5->75x113 FCBGA 11 bridges ~4.5x" next to the Granite Rapids image, 55 / 45 / 40 w/TSV / 25 w/TSV pitch: ok |
| E8, E9, E14 | 00051 p.4 text; ectc51846.2026.00365 p.2, p.4, p.5 Fig. 7(a) render | quotes ok; 85 x 110 mm, 18 dies incl. 12 HBM; layout 6 HBM column per long side, 2 x 2 centre tiles + 1 above + 1 below: ok |
| E10, E11, E13 | ectc51846.2026.00051 cells -c-m2 (9), -c-m3 (40), -c-c1 (240 x 240), -b-c1 (3 x 18, 1), -b-c2 (2), -a-i1 (36 um); ectc51687.2025.00051-a (77 x 56, 2x), -a-c1 (3), -c-c1 (14) | ok |
| section 7 emib pitches | ectc.2016.201-a-i1 (55), ectc51687.2025.00051-b-i1 (45) | ok |

Rule checks:
- Secondary sources as `reported`: none. Section 7 cites only primary or DB ids; X1, P3s, P5s, S1-S3, X2 unused.
- Conflicts: C1-C8 (CoWoS) and C1-C6 (EMIB) are stated, not resolved; spot-checked C5 (B300) and C6 (MI455X naming)
  against the sources: both real.
- Memory: no value found that lacks a read source; snippet-only values are marked as such (G2).

### Findings

- **G1 SIGNIFICANT: reticle-dimension attribution wrong in two places** (the 830 mm2 value itself is right).
  - `config/package3d/RESEARCH_SOTA_COWOS.md` line 15 attributes "830 mm2 (25.52 mm x 32.52 mm)" to both papers.
    ectc51909.2023.00091 p.2 footnote 1 prints only "one reticle size is defined as 830 mm2, derived from the
    maximum patternable device area in a modern lithography scanner". Correction: "TSMC defines 1 reticle = 830 mm2
    (ectc51909.2023.00091 p.2 footnote 1) and ~830 mm2 = 25.52 mm x 32.52 mm (ectc51909.2023.00174 p.2)." Row T1
    is already correct.
  - `config/package3d/RESEARCH_SOTA_EMIB.md` lines 14-15: "the third-party glass paper ectc51846.2026.00199 uses
    25.52 x 32.52 mm". The 00199 text has no reticle definition. The definition is in ectc51846.2026.00198 (USHIO,
    ECTC 2026) p.1: "the reticle size is defined as 25.52 mm × 32.52 mm (830 mm²)" (DB metric
    ectc51846.2026.00198-c-m3). Correction: replace "ectc51846.2026.00199" by "ectc51846.2026.00198 (USHIO) p.1".
  - Owner: L17 (or coordinator; L17 has handed off).
- **G2 MINOR: snippet-only values inside "read this session" tables.** Both files state that every number was read
  from the named page (line 9), but T3 (TSMC 3DFabric, HTTP 403, "~2700 mm2") and E16 (community.intel.com, 301)
  come from search snippets. They are flagged in their own rows and unused in section 7 (T3 appears in C1).
  Correction: add "except rows marked snippet" to line 9, or move T3 / E16 to the secondary tables. Owner: L17.
- **G3 MINOR: basis labels in EMIB section 7.**
  - `bridge_n` for `emib_5x_12hbm` ("one bridge per HBM-logic edge (12) plus one per logic-logic edge") is a modelling
    assumption; no source states it. Correction: basis "template (assumption, topology rule; bridge count not
    reported)".
  - The emib backbone row says "3 dies, 2 bridges ... reported (ectc.2016.201-a)", but ectc.2016.201-a-c1.count is
    empty. Correction: "reported: 3 dies, bridge 2 x 2 mm; 2 bridges = figure reading (Fig. 4(a))".
  - Owner: L17 / template lane.
- **G4 MINOR: unlisted near-conflict and one omitted outlook.**
  - The 2020 point is "2X, ~1,700 mm2" in TSMC press release T15 but "2.2X, ~1760" in ectc51909.2023.00091 Fig. 2 (D1),
    with the same 6 HBM / 96 GB. Correction: add it to COWOS C1.
  - ectc51846.2026.00365 also gives an outlook "panel-sized package with approximately 50X reticle die area", which
    E9 omits. Correction: add the quote to E9 (optional).
  - Owner: L17.

## Corrections list (for the coordinator)

| id | severity | file | change | owner |
|---|---|---|---|---|
| G1 | SIGNIFICANT | RESEARCH_SOTA_COWOS.md l.15; RESEARCH_SOTA_EMIB.md l.14-15 | reticle dims only from 00174; 00199 -> 00198 (USHIO) p.1 | L17 / coordinator |
| F1 | MINOR | config/geo_site_overrides.csv, org_sites re-run (4 sites) | postcode / ward overrides for Onto, NG, NEC; decision on Shinko Nagano | coordinator |
| F2 | MINOR | data/organizations.csv (Tyndall row) | sourced note or clear parent_org | coordinator |
| F3 | MINOR | data/_staging/g009/BATCH_REPORT.md | "3x3" -> "3+3+2" for eptc67330.2025.11392176 | L14 |
| F4 | MINOR | data/_staging/AFFILIATION_INSTRUCTIONS.md | document the HQ-country fallback with mandatory note | coordinator |
| G2 | MINOR | both RESEARCH_SOTA files l.9 | snippet exception or move T3 / E16 | L17 |
| G3 | MINOR | RESEARCH_SOTA_EMIB.md section 7 | basis wording for bridge_n and backbone | L17 / template lane |
| G4 | MINOR | RESEARCH_SOTA_COWOS.md C1; RESEARCH_SOTA_EMIB.md E9 | add 2X vs 2.2X point; add 50X outlook | L17 |
