# SOTA EMIB / EMIB-T product topology (research for the emib and emib_t templates)

Lane L17, DevLog-013 (plan: DevLog-008 "SOTA CoWoS / EMIB models and compare default"). Written 2026-10-21.
Scope: product-level topology at state-of-the-art complexity: die count and arrangement, HBM count, bridge count
and size, package size, reticle-equivalent Si area, Intel roadmap points. No template, generator or app file was
changed.

Rules used here (same as RESEARCH_SOTA_COWOS.md):
- Every number below was read in this session (2026-10-21) from the page, PDF or cached DB paper named in its row,
  except row E16: a search-result snippet (page not read, HTTP 301), marked as such in its row and not used in
  section 7. (Exception stated 2026-10-21 per audit A5 G2.)
- "Primary" = Intel disclosure (product brief, platform brief, ark specification page, Hot Chips slides, white paper)
  or an Intel-authored conference paper. "Secondary" = press, analysts, third-party compilations; marked `SECONDARY`
  and never used as a `reported` value.
- "DB" = cached text or figure of a paper in the APA database; "DB cell" = a value present in `data/*.csv`.
- Intel's "reticle equivalent" area is not defined in any Intel source read here (TSMC uses 830 mm2; the third-party
  glass paper ectc51846.2026.00198 p.1 defines 25.52 x 32.52 mm = 830 mm2; corrected from 00199 per audit A5 G1). Do not convert Intel reticle multiples to mm2 without
  marking the assumption.
- Conflicts are listed, not resolved.

## 1. Intel platform facts and roadmap (primary)

| id | value | unit | platform | source (URL / DB) | retrieved | quoted phrase / locator | confidence / conflict |
|---|---|---|---|---|---|---|---|
| E1 | HVM since 2017; bridges in a substrate cavity "held in place with adhesives"; EMIB-M = MIM capacitors in the bridge; EMIB-T = TSVs added | - | EMIB, EMIB-M, EMIB-T | Intel EMIB technology brief 366412-001US (2025-07), https://www.intel.com/content/dam/www/central-libraries/us/en/documents/2025-07/emib-product-brief.pdf | 2026-10-21 | p.1: "In high-volume manufacturing since 2017"; "EMIB places bridges in the substrate cavity where they are held in place with adhesives"; p.2: "EMIB-M incorporates Metal Insulator Metal (MIM) capacitors into the silicon bridges"; "Intel Foundry has added through-silicon vias (TSVs) to the EMIB-T solution" | high; no numbers in the brief |
| E2 | 2023: ~4x reticle, ~80 x 80 mm package, 8 HBM, 12 EMIBs | reticle; mm; count | EMIB-T roadmap figure | Intel Foundry platform brief "Accelerating AI and HPC with Advanced Process and Packaging Technologies" 367370-001US (2025-11), https://www.intel.com/content/dam/www/central-libraries/us/en/documents/2025-11/intel-foundry-hpc-ai-brief.pdf | 2026-10-21 | p.5 Fig. 9 table (Year / Reticle Size / Package Size / HBMs / EMIBs): "2023 ~4x ~80x80 8 12" | high; matches E9 (4X, 8 HBM, 12 bridges) |
| E3 | 2026: > 8x reticle, ~120 x 120 mm, 12 HBM, > 20 EMIBs | reticle; mm; count | EMIB-T | same as E2 | 2026-10-21 | Fig. 9: "2026 > 8x ~120x120 12 > 20"; text: "EMIB-T 2.5D supports the growth of AI and HPC solutions with more than 8x reticle size in 2026 and 12x in 2028" | high (roadmap); bridge count conflicts with E7 (C1) |
| E4 | 2028: > 12x reticle, > 120 x 180 mm, > 24 HBM, > 38 EMIBs | reticle; mm; count | EMIB-T | same as E2 | 2026-10-21 | Fig. 9: "2028 > 12x > 120x180 > 24 > 38" | high (roadmap); consistent with E8, E10 |
| E5 | EMIB "enabling systems that exceed 8x the reticle size"; interposer comparison "SI/RDL Interposer (8x Ret) 60% Wafer Utilization" vs "EMIB Bridge 90% Wafer Utilization" | reticle; % | EMIB | same as E2 | 2026-10-21 | p.4 text; p.5 Fig. 8 labels | high (claims) |
| E6 | EMIB 2nd generation bump pitch 55 -> 45 um | um | EMIB | Intel Quality & Reliability Vol. 6 "Intel Advanced Packaging Technology", https://cdrdv2-public.intel.com/826148/Volume%206%20Intel%20Advanced%20Packaging%20Technology.pdf | 2026-10-21 | p.3: "2nd-generation EMIB technology. This has reduced the bump pitch from 55 to 45 microns" | high |
| E7 | product / TV evolution: 2017/2018 55 x 55 FCBGA, 6 bridges, 1.1-1.8x reticle equiv.; 2021 Sapphire Rapids 56.5 x 77.5 FCLGA, 10 bridges, 2.2x; 2022 56.5 x 100 FCLGA, 14 bridges, 2.8x; 2022 Ponte Vecchio 62.5 x 77.5 FCBGA, 11 bridges, 3.1x; 2024 "72.5x82.5 -> 75x113 FCBGA, 11 bridges, ~4.5x" (next to a Granite Rapids image); 2025/6 "~120mmx120mm, 30+ bridges, >8x"; 2027+ ">>120mmx180mm package, >>38 bridges, >>12x"; pitch 55 um (2017-2022), 45 um (2024), 40 um with TSV (2025/6), 25 um with TSV (2027+, "25um pitch EMIB-T in pathfinding") | mm; count; reticle; um | EMIB / EMIB-T (Intel Foundry view) | DB ectc51687.2025.00051 (Intel Foundry, ECTC 2025) | cached 2026-10-19 | p.4 Fig. 6 "Package Form Factor and D2D Interconnect Pitch Evolution" (labels read from a 400 dpi render of `references/ectc51687.2025.00051/source.pdf`; the 2025/6 label renders as "~12mm0x120mm", read as ~120 x 120 mm) | high for labels; no DB cells; 2024 label product attribution ambiguous (C3); 2026 bridges "30+" vs "> 20" in E3 (C1) |
| E8 | package form factor "from ~50mmX50mm to today's ~120mmX120mm"; TVs in flight "HLFF, 30+ bridges and >8X reticle equivalent top Si dies with a mix of EMIB & EMIB-T"; outlook ">12x reticles" and "HLFF (~250mmX250mm & beyond)" | mm; count; reticle | EMIB / EMIB-T | DB ectc51687.2025.00051 | cached 2026-10-19 | p.4 Sec. IV text | high (statements) |
| E9 | "Die area up to 4X the reticle size has been demonstrated in 2023 with up to 8 HBMs and 12 bridge dies"; "By 2028, Intel Foundry is targeting to offer packages with larger than 12X reticle die area and larger than 120mmx180mm package form factor" | reticle; count; mm | EMIB | DB ectc51846.2026.00365 (Intel, ECTC 2026) | cached 2026-10-19 | p.2 Sec. II; Fig. 1 roadmap chart (EMIB 45/55 2.5D + Foveros ~2023; EMIB-T 45 2.5D, EMIB-M 2.5D, EMIB 3.5D ~2025-2026; EMIB-T 40 2.5D ~2027-2028); outlook p.5 Sec. VI: "pathfinding activities have been started to enable package level encapsulation process for 12X reticle die complex size and panel-sized package with approximately 50X reticle die area" (added 2026-10-21 per audit A5 G4) | high |
| E10 | EMIB-T package form factor "> 120 mm x 120 mm", "more than 9x reticles of compute and memory silicon content on a single package"; EMIB "as large as 240 mm x 240 mm package with an effective silicon area equivalent of > 40 reticles"; panel 510 x 515 mm; "multiple thin (~50 um thick) silicon bridges in the top dielectric layers" | mm; reticle; um | EMIB-T, EMIB | DB ectc51846.2026.00051 (Intel Foundry, ECTC 2026) | cached 2026-10-19 | p.1 abstract and Sec. I; DB cells ectc51846.2026.00051-c-m2 (9 reticles), -c-m3 (40 reticles), -c-c1 (240 x 240), -a-c1.thickness_um (50) | high; "> 9x" (ECTC 2026) vs "> 8x" for 2026 (E3) (C2) |
| E11 | 36 um FLI on a 2x reticle Si TV passed package reliability; 35 um "up to 4.5x reticle die complexes" to be certified by end of 2026; EMIB25T TV: single 3 x 18 mm EMIB-T bridge, two 1x reticle top dies, 25 um | um; reticle; mm | EMIB-T | DB ectc51846.2026.00051 | cached 2026-10-19 | p.2 Sec. II.A.i; p.3 Sec. II.A.ii; DB cells -a, -b, -b-c1 (3 x 18 mm, count 1), -b-c2 (2 dies) | high |
| E12 | EMIB-T bridge die size "would allow much larger sizes than 72 mm2 with high aspect ratios" | mm2 | EMIB-T (future) | DB ectc51846.2026.00051 | cached 2026-10-19 | p.5 Sec. IV | high as a statement; 72 mm2 is not tied to a named bridge (3 x 18 = 54 mm2 in E11) |
| E13 | EMIB-T package TV: 45 um D2D pitch, 3 bridges, 77 x 56 mm, ~2x reticle Si; a "14-Bridge EMIB-T Package TV" is shown in the process-flow photo | mm; count; reticle | EMIB-T | DB ectc51687.2025.00051 | cached 2026-10-19 | p.4 Sec. IV; p.3 Fig. 4 step 2 label; DB cells ectc51687.2025.00051-a (77 x 56, 2), -a-c1.count = 3, -c-c1.count = 14 | high |
| E14 | EMIB package, > 5X reticle die area, ~85 x 110 mm, 18 dies including 12 HBM; layout (photo): 6 HBM in a column on each long side, centre 2 x 2 large tiles plus one tile above and one below | reticle; mm; count | EMIB (product not named) | DB ectc51846.2026.00365 | cached 2026-10-19 | p.4 Sec. V ("The package size is approximately 85 mm x 110 mm and has 18 dies including 12 HBMs"); layout from p.5 Fig. 7(a) (300 dpi render); DB cells ectc51846.2026.00365-h (85, 110, 5, 18, 12), -h-c1 (12 HBM), -h-c2 (6 non-HBM) | high for counts and size; layout = figure reading; bridge count not stated |
| E15 | EMIB 3.5D: "more than 100 billion transistors", "47 active tiles, 5 process nodes" | count | EMIB 3.5D (Ponte Vecchio) | Intel Foundry advanced packaging page, https://www.intel.com/content/www/us/en/foundry/packaging.html | 2026-10-21 | quoted on the page | high |
| E16 | EMIB-T "total area exceeding 6x the reticle size today, scaling greater than 8x the reticle size this year and more than 12x by 2028" | reticle | EMIB-T | Intel Foundry community blog "Intel Foundry's Advanced Packaging Innovations Lead the Industry in Scaling Past Reticle Limits", https://community.intel.com/t5/Blogs/Intel-Foundry/Systems-Foundry-for-the-AI-Era/Intel-Foundry-s-Advanced-Packaging-Innovations-Lead-the-Industry/post/1738888 | 2026-10-21 | seen only in a search-result summary; community.intel.com blog URLs redirect to an intel.com search page (HTTP 301), page not read | low (snippet); consistent with E3, E4 |

## 2. Intel products (primary unless marked)

| id | product | value | source (URL) | retrieved | quoted phrase / locator | confidence / conflict |
|---|---|---|---|---|---|---|
| Q1 | Xeon Platinum 8480+ (Sapphire Rapids, 4th Gen Xeon) | package 77.5 x 56.5 mm, FCLGA4677, 56 cores, 350 W | Intel ark, https://www.intel.com/content/www/us/en/products/sku/231746/intel-xeon-platinum-8480-processor-105m-cache-2-00-ghz/specifications.html | 2026-10-21 | "Package Size 77.5mm x 56.5mm" | high; matches E7 (56.5 x 77.5, 10 bridges, 2.2x); 4 tiles shown in the Hot Chips 33 slide image (Q5) |
| Q2 | Xeon CPU Max 9480 (Sapphire Rapids HBM) | package 100 x 56.5 mm, FCLGA4677, 56 cores, 350 W, 64 GB HBM | Intel ark, https://www.intel.com/content/www/us/en/products/sku/232592/intel-xeon-cpu-max-9480-processor-112-5m-cache-1-90-ghz/specifications.html | 2026-10-21 | "Package Size 100mm x 56.5mm"; "Maximum High Bandwidth Memory (HBM) 64 GB" | high; matches E7 2022 point (56.5 x 100, 14 bridges, 2.8x); HBM stack count not on the page |
| Q3 | Xeon 6980P (Granite Rapids-AP, Xeon 6) | package 104.5 x 70.5 mm, FCLGA7529, 128 cores, 500 W | Intel ark, https://www.intel.com/content/www/us/en/products/sku/240777/intel-xeon-6980p-processor-504m-cache-2-00-ghz/specifications.html | 2026-10-21 | "Package Size 104.5mm x 70.5mm" | high; does not match the "72.5x82.5 -> 75x113" label next to the Granite Rapids image in E7 (C3) |
| Q4 | Data Center GPU Max (Ponte Vecchio) | > 100 B transistors, 47 active tiles, 5 process nodes; tile types: compute, Rambo, Foveros base, HBM, Xe Link, EMIB, multi-tile package; base tile Intel 7, 640 mm2; compute tile TSMC N5, Foveros bump pitch 36 um; 2-stack: 8 HBM2e controllers | Intel Hot Chips 33 slides (D. Blythe), https://hc33.hotchips.org/assets/program/conference/day2/hc2021_pvc_final.pdf | 2026-10-21 | slide 18 ">100 Billion Transistors, 47 Active Tiles, 5 Process Nodes"; slide 24 "Base Tile ... Area 640mm2"; slide 23 "Bump Pitch 36um Foveros"; slide 12 "8 HBM2e controllers" (slides are images; read from renders) | high; package size and EMIB count not on the slides (E7: 62.5 x 77.5, 11 bridges); Co-EMIB / EMIB 3.5D, family `include: false` |
| Q5 | Sapphire Rapids | "Multiple Tiles, Single CPU" (4-tile package image); "Embedded Silicon Bridge (EMIB)" listed | Intel Hot Chips 33 slides (A. Biswas, S. Kottapalli), https://hc33.hotchips.org/assets/program/conference/day1/HC2021.C1.4%20Intel%20Arijit.pdf | 2026-10-21 | slide 4 feature list; slide 7 title "Multiple Tiles, Single CPU" | high for "multi-tile + EMIB"; tile count from the image only |
| Q6 | Gaudi 3 | 2 identical compute dies "connected through a high-bandwidth, low-latency interconnect over an interposer bridge"; 8 HBM2e stacks, 128 GB | Intel Gaudi 3 white paper, https://cdrdv2-public.intel.com/817486/gaudi-3-ai-accelerator-white-paper.pdf ; Hot Chips 36 slides (R. Kaplan), https://hc2024.hotchips.org/assets/program/conference/day1/60_HC2024.Intel.RomanKaplan.Gaudi3-0826.pdf | 2026-10-21 | WP p.3 (quoted); WP p.8 "128 GB of 8 HBM2e Stacks"; HC36 slide "2 compute dies connected over an interposer bridge", "8 HBM2e stacks" | high for counts; neither source says EMIB; package size not stated (C4) |
| Q7 | Clearwater Forest (Xeon 6+) | compute chiplets on Intel 18A on base dies by Foveros Direct 3D; sets joined to each other and to I/O dies by EMIB 2.5D | Intel newsroom / Intel white paper (search-result summaries only; https://www.intel.com/content/dam/www/central-libraries/us/en/documents/2024-02/intel-tech-clearwater-wp.pdf and the Xeon 6+ deck returned HTTP 403) | 2026-10-21 | not read | low; topology only, no counts used |

## 3. Secondary reports, not used as values

| id | claim | source | retrieved | note |
|---|---|---|---|---|
| X1 | product table: Stratix 10 55 x 55, 6 EMIB; Sapphire Rapids 56.5 x 76, 4 compute tiles, 4 HBM2e, 10 EMIB; Sapphire Rapids HBM 56.5 x 100, 14 EMIB; Ponte Vecchio 62.5 x 77.5, 16 compute tiles, 8 HBM2e, 11 EMIB; Granite Rapids-AP 70.5 x 104.5, 3 compute + 2 I/O tiles, 12 EMIB; Gaudi 3 72.5 x 82.5, 2 compute tiles, 8 HBM2e, EMIB | `SECONDARY` DB ectc51846.2026.00199 (Georgia Tech, ECTC 2026) p.2 Table I, citing Mahajan et al. IEEE TED 2025, Hot Chips 33/36 and Intel ark | cached 2026-10-19 | conflicts: SPR 56.5 x 76 vs ark 77.5 x 56.5 (Q1); GNR-AP 12 EMIB vs E7 "11 bridges" (if the 2024 label is GNR); Gaudi 3 "EMIB" vs Intel "interposer bridge" (Q6); "4 x HBM2e" on Sapphire Rapids (non-HBM SKU) is not supported by Q1 |
| X2 | EMIB-T 120 x 180 mm, > 38 bridges, > 12 reticle dies, > 24 HBM by 2028; 120 x 120 mm with 12 HBM, 4 dense chiplets, > 20 bridges; Converge Digest "more than 30 EMIB-T bridges", "approaching 10,000 mm2" | Tom's Hardware, TrendForce, Converge Digest, wccftech (search-result summaries only) | 2026-10-21 | pages not opened; the primary E2-E4 supersede them; "4 dense chiplets" not in a primary source read |
| X3 | MI-class or NVIDIA products on EMIB-T (customer adoption) | not researched | - | out of scope; none used |

## 4. Conflicts (not resolved)

- C1 2025/2026 EMIB-T bridge count: "> 20 EMIBs" (platform brief Fig. 9, 2026, ~120 x 120 mm, 12 HBM) vs "30+ bridges"
  (ECTC 2025 Fig. 6, 2025/6, ~120 x 120 mm; and "HLFF, 30+ bridges" TVs in flight, ECTC 2025 p.4).
- C2 Reticle content at ~120 x 120 mm: "> 8x" (platform brief, ECTC 2025 Fig. 6) vs "more than 9x" (ECTC 2026 p.1).
  Probably later data, but the sources do not say.
- C3 2024 label "72.5x82.5 -> 75x113 FCBGA, 11 bridges, ~4.5x" (ECTC 2025 Fig. 6) sits next to a Granite Rapids
  image, but the Xeon 6980P (Granite Rapids-AP) ark package is 104.5 x 70.5 mm; the secondary X1 gives Gaudi 3 as
  72.5 x 82.5 and Granite Rapids-AP as 12 EMIB. Which product the label belongs to is not stated.
- C4 Gaudi 3 packaging: "interposer bridge" (Intel WP and Hot Chips 36) vs "EMIB" (secondary X1). No Intel source read
  here names the Gaudi 3 bridge technology.
- C5 Sapphire Rapids package: 77.5 x 56.5 mm (ark, ECTC 2025 Fig. 6) vs 56.5 x 76 mm (secondary X1).
- C6 2023 point: "~4x, ~80 x 80 mm, 8 HBM, 12 EMIBs" (platform brief) agrees with ECTC 2026 00365 ("4X ... 8 HBMs and
  12 bridge dies"); no conflict, listed because it is the only point given by two primary documents.

## 5. Gaps

- EMIB bridge x/y for any named product (logic-logic or logic-HBM): not disclosed in any source read. Only ranges
  (2 x 2 to 8 x 8 mm, ectc.2016.201 p.5 Table II), the EMIB25T TV bridge (3 x 18 mm) and the "> 72 mm2" future
  statement (E12).
- Die sizes for the EMIB SOTA packages (E14, E7 points): not given. Ponte Vecchio base tile 640 mm2 is the only die
  area read (Q4).
- Bridge count of the > 5X EMIB package with 12 HBM (E14): not stated (the E2 2023 point has 12 EMIBs for ~4x and 8 HBM).
- Intel reticle-equivalent definition (mm2 per reticle): not found.
- Primary product with EMIB-T in volume: none named in the sources read (TVs only).
- HBM footprint on EMIB packages: none primary; DB HBM rows (11 x 11 mm HBM3, 11 x 10 mm HBM2E) are TSMC/MediaTek TVs.

## 6. DB rows relevant to the templates (`reported` candidates)

| family | DB row (tv / comp / metric) | fields | locator |
|---|---|---|---|
| emib | ectc.2016.201-a, -a-c1 | bridge 2 x 2 (lower bound) to 8 x 8 mm, < 75 um thick, M1-M4 2/2 um (current backbone) | p.5 Table II, p.6 Sec. III |
| emib | ectc.2016.201-b, -b-c1/c2 | 5-die MCP with 4 bridges | p.7 Fig. 7 |
| emib | ectc51846.2026.00365-h, -h-c1, -h-c2 | > 5X reticle, ~85 x 110 mm, 18 dies, 12 HBM, 6 non-HBM dies | p.4 Sec. V, p.5 Fig. 7 |
| emib | ectc51846.2026.00365-c | EMIB package with 43.8 mm underfill flow distance | p.2 Fig. 2(c) |
| emib | ectc51687.2025.00061-a | 65 x 65 mm EMIB CHIPS MCP (current outline source) | p.2 Sec. II |
| emib | tcpmt.2023.3312037-a | Ponte Vecchio Co-EMIB (topology only, no sizes) | p.1-2 |
| emib_t | ectc51687.2025.00051-a, -a-c1, -a-c2, -a-i1 | 77 x 56 mm, 3 TSV bridges, ~2x reticle, 45 um D2D | p.4 Sec. IV |
| emib_t | ectc51687.2025.00051-c, -c-c1 | 14-bridge EMIB-T TV (count only) | p.3 Fig. 4 |
| emib_t | ectc51846.2026.00051-a | 36 um FLI TV, 2x reticle | p.2 Sec. II.A.i |
| emib_t | ectc51846.2026.00051-b, -b-c1, -b-c2, -b-i1 | EMIB25T: 1 bridge 3 x 18 mm, 2 x 1x-reticle top dies, 25 um | p.3 Sec. II.A.ii |
| emib_t | ectc51846.2026.00051-c, -c-c1, -c-m1..m3 | 240 x 240 mm quarter-panel substrate, 4 units per panel, > 9 reticles at > 120 x 120 mm, > 40 reticles at 240 x 240 mm | p.1, p.3 Sec. II.B, p.4 Fig. 6 |
| emib_t | ectc51846.2026.00051-d-m2 | on-bridge MIM 500 nF/mm2 | p.5 Sec. III.B |

## 7. Proposed template values (for a later template lane)

Basis: `reported` = DB cell exists; `template` = value with a source but no DB cell (or an arithmetic choice).

| family | knob | value | basis | source id |
|---|---|---|---|---|
| emib | backbone (keep) | 3 dies, 2 bridges (Fig. 4(a) schematic), bridge 2 x 2 mm lower bound | reported: 3 dies, bridge 2 x 2 mm; 2 bridges = figure reading (Fig. 4(a)) (A5 G3) | ectc.2016.201-a |
| emib | SOTA preset `emib_5x_12hbm` | sbt 85 x 110 mm, die_n 18 = 6 logic + 12 HBM, reticle_x 5 (lower bound) | reported | E14 (ectc51846.2026.00365-h) |
| emib | layout for that preset | HBM: one column of 6 on each long (110 mm) side; logic: 2 x 2 large tiles in the centre plus one tile above and one below | template (photo reading) | E14 (p.5 Fig. 7(a)) |
| emib | bridge_n for that preset | one bridge per HBM-logic edge (12) plus one per logic-logic edge; count not reported | template (assumption, topology rule; bridge count not reported) (A5 G3) | E14, E2 (12 EMIBs at ~4x / 8 HBM) |
| emib | bridge_w_mm x bridge_d_mm | keep 2 x 2 to 8 x 8 range; no product value | reported (range) | ectc.2016.201-a-c1 |
| emib | fine_pitch_um options | 55 (gen 1), 45 (gen 2) | reported 55 (ectc.2016.201-a-i1); 45 reported (ectc51687.2025.00051-b-i1) | E6, E7 |
| emib | product presets (optional, counts only) | `spr`: 56.5 x 77.5 mm, 10 bridges, 4 tiles, 2.2x; `spr_hbm`: 56.5 x 100 mm, 14 bridges, 2.8x | template (Intel figure label + ark) | E7, Q1, Q2, Q5 |
| emib_t | backbone (keep) | EMIB25T bridge 3 x 18 mm, 2 x 1x-reticle top dies, 25 um | reported | E11 (ectc51846.2026.00051-b) |
| emib_t | package TV preset | sbt 77 x 56 mm, 3 bridges, ~2x reticle, 45 um | reported | E13 (ectc51687.2025.00051-a) |
| emib_t | SOTA preset `emib_t_2026` | sbt ~120 x 120 mm, 12 HBM, bridges > 20 (brief) or 30+ (ECTC 2025), > 8x (or > 9x) reticle; logic die count not stated (secondary "4 dense chiplets" not used) | template | E3, E7, E10, C1, C2 |
| emib_t | roadmap preset `emib_t_2028` | sbt > 120 x 180 mm, > 24 HBM, > 38 bridges, > 12x reticle | template | E4, E7, E9 |
| emib_t | panel-limit annotation | 240 x 240 mm unit, 4 per 510 x 515 mm panel, > 40 reticles | reported | E10 (ectc51846.2026.00051-c) |
| emib_t | fli_bridge_pitch_um options | 45 / 40 (w/ TSV) / 36 / 25 | 45, 36, 25 reported; 40 template (Intel figure label) | E7, E11, E13 |
| both | bridge thickness note | "~50 um" is a general EMIB statement, not an EMIB-T product value | reported (general) | E10 |
