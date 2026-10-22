# SOTA CoWoS-S / CoWoS-L product topology (research for the cowos_s and cowos_l templates)

Lane L17, DevLog-013 (plan: DevLog-008 "SOTA CoWoS / EMIB models and compare default"). Written 2026-10-21.
Scope: product-level topology at state-of-the-art complexity: die count and arrangement, HBM count and generation,
interposer size (reticle multiple, mm), LSI (local silicon interconnect) bridge count and size, substrate size,
TSMC roadmap points. No template, generator or app file was changed.

Rules used here:
- Every number below was read in this session (2026-10-21) from the page, PDF or cached DB paper named in its row,
  except row T3: a search-result snippet (page not read, HTTP 403), marked as such in its row and not used in
  section 7. (Exception stated 2026-10-21 per audit A5 G2.)
- "Primary" = company disclosure (press release, annual report, earnings call transcript, white paper, technical
  blog) or a conference paper by the company. "Secondary" = press, analysts, teardown firms, third-party papers that
  compile product data; marked `SECONDARY` and never used as a `reported` value.
- "DB" = cached text or figure of a paper already in the APA database (`references/<paper_id>/`); locators are page
  and figure of that paper. "DB cell" = a value present in `data/*.csv`.
- Reticle unit: TSMC defines 1 reticle = 830 mm2 in ectc51909.2023.00091 p.2 footnote 1 ("derived from the maximum
  patternable device area in a modern lithography scanner"; no x/y given there) and ~830 mm2 = 25.52 mm x 32.52 mm in
  ectc51909.2023.00174 p.2 ("~830 mm2, which derives from 25.52 mm x 32.52 mm"). Derived areas below use 830 mm2.
  (Corrected 2026-10-21 per audit A5 G1.)
- Conflicts are listed, not resolved.

## 1. TSMC platform facts and roadmap (primary)

| id | value | unit | platform | source (URL / DB) | retrieved | quoted phrase / locator | confidence / conflict |
|---|---|---|---|---|---|---|---|
| T1 | 1 reticle = 830 | mm2 | CoWoS (definition) | DB ectc51909.2023.00091 (TSMC, ECTC 2023) | cached 2026-10-18 | p.2 footnote 1: "one reticle size is defined as 830 mm2, derived from the maximum patternable device area in a modern lithography scanner" | high; same in ectc51909.2023.00174 p.2 ("~830 mm2 ... 25.52 mm x 32.52 mm") |
| T2 | 1.0 to 3.3 | reticle | CoWoS-S Si interposer, "during the past decade" | TSMC 2024 Annual Report, ebook p.102, https://investor.tsmc.com/static/annualReports/2024/english/ebook/files/basic-html/page102.html | 2026-10-21 | "The CoWoS-S Si interposer technology has advanced from 1.0-reticle to 3.3-reticle size (1 reticle size is approximately 830mm2)" (ebook HTML text has duplicated characters; read as written) | high; envelope max of CoWoS-S |
| T3 | 3.3 (~2700) | reticle (mm2) | CoWoS-S max interposer | TSMC 3DFabric CoWoS page, https://3dfabric.tsmc.com/english/dedicatedFoundry/technology/cowos.htm | 2026-10-21 | page returned HTTP 403 (Cloudflare challenge); value seen only in a search-result summary: "up to 3.3X-reticle size (or ~2700mm2)"; "CoWoS-L or CoWoS-R are recommended for larger than 3.3X" | medium (snippet only, page not read); consistent with T2 |
| T4 | 3.5 | reticle | CoWoS-L, in production since 2024 | TSMC 2025 Annual Report ch.5, https://investor.tsmc.com/static/annualReports/2025/english/pdf/2025_tsmc_ar_e_ch5.pdf | 2026-10-21 | PDF p.4 (printed p.104-105), R&D "CoWoS" bullet: "CoWoS-L at 3.5-reticle size has been in production since 2024" | high; also 2024 AR p.102: "The first CoWoS-L at 3.5-reticle size has been developed and entered production in 2024" |
| T5 | 5.5 | reticle | CoWoS-L qualification | same as T4 | 2026-10-21 | PDF p.4: "the 5.5-reticle size CoWoS-L will finish the qualification in 2026" | conflict with T6 / T7 on status timing (see C2) |
| T6 | 5.5 | reticle | CoWoS (variant not named) certification 2025, volume 2026 | same as T4 | 2026-10-21 | PDF p.8 (printed p.112-113), Q&R: "In 2025, Q&R completed the certification of CoWoS advanced packaging solution for 5.5x mask/reticle size interposers and will initiate volume production in 2026"; same page: "The development focus has shifted from the original Si interposer technology to reconfigured interposers with multiple LSIs" | high |
| T7 | 5.5 | reticle | CoWoS, in production (2026-04) | TSMC press release 2026-04-23 (2026 North America Technology Symposium), https://pr.tsmc.com/english/news/3302 | 2026-10-21 | "The Company is now producing 5.5-reticle size CoWoS and planning for even larger versions." | high |
| T8 | 9.5 | reticle | CoWoS-L in development | same as T4 | 2026-10-21 | PDF p.4: "The further development of the 9.5-reticle size CoWoS-L is also making good progress." | high |
| T9 | 9.5; 12 or more HBM; 2027 | reticle; stacks; year | CoWoS (volume production 2027) | TSMC press release 2025-04-24 (2025 NA Technology Symposium), https://pr.tsmc.com/english/news/3228 | 2026-10-21 | "bring 9.5 reticle size CoWoS to volume production in 2027" ... "integration of 12 HBM stacks or more in a package" | high; not repeated in the 2026 release (T10); see C3 |
| T10 | 14; ~10 large compute dies; 20 HBM; 2028 | reticle; dies; stacks; year | CoWoS (production 2028) | TSMC press release 2026-04-23, https://pr.tsmc.com/english/news/3302 | 2026-10-21 | "A 14-reticle size CoWoS, capable of integrating approximately 10 large compute dies and 20 HBM stacks, is slated for production in 2028." | high (roadmap) |
| T11 | > 14; 2029 | reticle; year | CoWoS | same as T10 | 2026-10-21 | "This will be followed by an expansion to beyond 14 reticles in 2029." | high (roadmap); HBM count for 2029 not stated in the release (secondary S8 says 24) |
| T12 | 40; 2029 | reticle; year | SoW-X (System-on-Wafer, CoWoS-based) | same as T10 | 2026-10-21 | "TSMC's 40-reticle size SoW-X System-on-Wafer technology also expected in 2029" | conflict with T13 on year (C4) |
| T13 | 40X compute of current CoWoS; volume 2027 | ratio; year | SoW-X | TSMC press release 2025-04-24, https://pr.tsmc.com/english/news/3228 | 2026-10-21 | "SoW-X, a CoWoS-based offering to create a wafer-sized system with computing power 40X the current CoWoS solution" ... "Volume production is scheduled for 2027." | conflict with T12 (C4) |
| T14 | "5x" in production; working on "9x", then "14x" | reticle | CoWoS (CEO statement) | TSMC Q3 2026 earnings call transcript (2026-10-15), https://investor.tsmc.com/english/encrypt/files/encrypt_file/reports/2026-10/eba4fac72873bf546b669bd2b5d973df5c93215d/TSMC%203Q26%20Transcript.pdf | 2026-10-21 | transcript p.12, C.C. Wei: "we are in the real world production of 5x reticle size ... And then we are working on the 9x reticle size and moving into the 14x reticle size." | high as a statement; "5x" / "9x" are spoken roundings of 5.5 / 9.5 (assumption) |
| T15 | ~1,700; 2X; up to 6 HBM (96 GB) | mm2; reticle; stacks | CoWoS (TSMC + Broadcom, 2020) | TSMC press release 2020-03-03, https://pr.tsmc.com/english/news/2026 | 2026-10-21 | "With an area of approximately 1,700mm2" ... "the industry's first and largest 2X reticle size interposer" ... "up to 6 cubes of high-bandwidth memory (HBM), offering as much as 96GB of memory" | high (historical point) |
| T16 | CoWoS-L in 2nd year of volume production in 2025; larger-reticle products volume 2026 | - | CoWoS-L | same as T4 | 2026-10-21 | PDF p.3 (printed p.102-103): "This technology entered its second year of volume production in 2025 and is currently being adopted by multiple products featuring larger reticle interposer size, which are expected to start volume production in 2026." | high |

### 1.1 TSMC conference papers in the DB (primary, TSMC authors)

| id | value | platform | DB locator | note |
|---|---|---|---|---|
| D1 | 2016: N16/N12 SoC, 1.75X ~1400 mm2, HBM2, 4 HBM, 32 GB; 2020: N7 SoC, 2.2X ~1760 mm2, HBM2E, 6 HBM, 96 GB; 2022: N5 SoIC, 3.3X ~2800 mm2, HBM3, 8 HBM, 128 GB | CoWoS(-S) generations | ectc51909.2023.00091 p.1 Fig. 2 (table in figure, read from page render) | text p.1: "The number of HBM stacks have grown twice from 4 to 8". 3.3 x 830 = 2739 mm2, not 2800 (C1) |
| D2 | fifth-generation CoWoS: 3X Si interposer ~2,600 mm2, 58.9 mm x 44.1 mm, 2 SoC + 1 chiplet + 8 HBM, 4-mask stitched, eDTC 320 nF/mm2 | CoWoS-S | ectc51909.2023.00091 p.2 text and Fig. 3 (photo: SoC1, SoC2 side by side in the middle; 4 HBM along the top edge, 4 along the bottom edge; dimension labels 58.9 mm and 44.1 mm) | 58.9 x 44.1 = 2597 mm2 (derived). No DB cell for this interposer (no TV row) |
| D3 | CoWoS-S "qualified for a record-high number of 3 SoC/chiplet dies and 8 HBMs"; Si interposer "up to an area equivalent to three full reticle size (3x, or ~2500 mm2)" by two- and four-mask stitching; scaling "up to 4x (~3300 mm2)" still an option but "extremely challenging" | CoWoS-S | ectc51909.2023.00174 p.2 Sec. I; abstract p.1 "developed up to an interposer area of 2500 mm2 by four-mask stitching" | 3x stated as ~2500 here vs ~2600 in D2 (C1) |
| D4 | roadmap figure: 1.5X 1 SoC + 4 HBM; 2X 1 SoC + 6 HBM; 3X 2 SoC + 8 HBM (CoWoS-S, ">1T transistor"); 4X 2 SoC + 12 HBM (dotted, CoWoS-L) | CoWoS-S -> CoWoS-L | ectc51909.2023.00174 p.1 Fig. 1 (`references/ectc51909.2023.00174/figures/img_p01_1.png`) | figure labels; 4X point is a projection |
| D5 | CoWoS-L TV: package 70 x 76 mm (text) / 70 x 78 mm (Fig. 3), interposer 43 x 58 mm, 3 SoC/chiplet + 8 HBM, "More than 10 LSI dies", 3x (~2500 mm2) | CoWoS-L | ectc51909.2023.00174 p.2 Sec. II.A; DB cells ectc51909.2023.00174-a (package_x/y, interposer, n_dies, n_hbm), -a-c3 (43 x 58), -a-c4.count = 10 (lower bound) | package y conflict logged in the TV notes |
| D6 | CoWoS-L_6x TV_4.8x: 4.8x (~4000 mm2), 6 SoC + 12 HBM2E, 18 LSI, 45 IPD, SC-RDL 1 front + 6 back, 91 x 91 mm 3-2-3 substrate, stiffener ring | CoWoS-L (SC-RDL) | ectc51909.2023.00091 p.3 Table 1, p.4 Sec. II.B; DB cells ectc51909.2023.00091-b, -b-c1..c7 | the largest CoWoS-L configuration with counts in the DB |
| D7 | CoWoS-L_6x TV_1.6x: 1.6x top dies (2 SoC + 4 HBM2E) + 3.8x dummy Si to mimic 5.4x (4500 mm2), 6 LSI, 45 IPD (2.9 mm2 each), 91 x 91 mm, lid 2 mm | CoWoS-L (SC-RDL) | ectc51909.2023.00091 p.3 Sec. II.A, Table 1; DB cells ectc51909.2023.00091-a, -a-c1..c8 | |
| D8 | interposer size = rectangle enclosing the top dies plus 1 mm per side; for 5x to 6x (4000 to 5000 mm2) the long interposer dimension "is estimated between 75 and 85 mm"; 4x (~3300 mm2) long dimension 65 mm | CoWoS-L sizing rule | ectc51909.2023.00091 p.2 (left column bottom, right column Sec. II) | author estimate; no DB cell |

## 2. Products (primary unless marked)

| id | product | value | source (URL) | retrieved | quoted phrase / locator | confidence / conflict |
|---|---|---|---|---|---|---|
| P1 | AMD Instinct MI455X | CoWoS-L; 8 XCD (accelerator complex die) + 2 IOD (I/O die) + 2 FCD (fabric and cache die); 12 HBM4 stacks, 2048 bit/stack, 432 GB; XCD on TSMC N2, FCD and "MID" on N3P; 320 B transistors | AMD CDNA 5 white paper, https://www.amd.com/content/dam/amd/en/documents/products/technologies/cdna/amd-cdna5-whitepaper.pdf | 2026-10-21 | p.4: "The AMD Instinct MI455X GPU delivers these advances through seven key architectural innovations and CoWoS-L advanced packaging technology"; p.9: "inclusion of 12 stacks of HBM4 DRAM, up from 8 stacks of HBM3E in the AMD Instinct MI355X GPU"; p.14: "Figure 8 shows the 8 XCD, 2 IOD, and 2 FCD dies in the AMD Instinct MI455X GPU package, along with the 12 stacks of HBM4 DRAM"; p.22: "2,048 bits x 12 stacks HBM4" | high for counts and CoWoS-L. Not stated: whether XCDs are stacked on IODs (they are in MI300 / MI350, P3 / P4), die sizes, interposer size, LSI count, package size. Term "MID" (p.14) is not defined and does not match the "IOD" label of Fig. 8 (C6) |
| P2 | AMD Instinct MI355X / MI350 | 8 XCD vertically stacked + 2 IOD; 8 stacks 12-Hi HBM3E; 288 GB; XCD N3P | AMD CDNA 4 white paper, https://www.amd.com/content/dam/amd/en/documents/instinct-tech-docs/white-papers/amd-cdna-4-architecture-whitepaper.pdf | 2026-10-21 | p.2: "integrates 8 vertically stacked accelerator complex dies (XCD) and 2 I/O Dies (IODs) ... connecting to 8 stacks of 12-Hi high-bandwidth memory (HBM3E)" | high for counts; CoWoS variant not stated in the white paper |
| P3 | AMD Instinct MI300X | up to 8 XCD vertically stacked on 4 IOD (IOD on TSMC 6 nm, each IOD under 2 XCD); 8 HBM3 stacks, 24 GB/stack, 192 GB; each IOD fans out to 2 stacks | AMD CDNA 3 white paper, https://www.amd.com/content/dam/amd/en/documents/instinct-tech-docs/white-papers/amd-cdna-3-white-paper.pdf | 2026-10-21 | p.2: "integrates up to 8 vertically stacked accelerator complex dies (XCD) and 4 I/O dies (IOD) ... connecting to 8 stacks of high-bandwidth memory (HBM)"; p.10: "The IODs are manufactured on TSMC's 6nm process and vertically stacked beneath a pair of XCDs"; p.11: "each IOD fans out through the package to two stacks of memory" | high for counts; CoWoS variant and package size not in the white paper |
| P3s | AMD Instinct MI300X | package 76.8 x 72.0 x 4.9 mm; SoIC hybrid bonding on a CoWoS interposer | `SECONDARY` TechInsights, https://www.techinsights.com/blog/amd-instinct-mi300x-processor-floorplan-analysis | 2026-10-21 | "76.8 mm x 72.0 mm x 4.9 mm (thick)"; page undated | teardown firm; not a `reported` value |
| P4 | NVIDIA H100 (GH100) | 1 GPU die, 814 mm2, TSMC 4N; full GH100: 6 HBM3/HBM2e stacks, 12 x 512-bit controllers; H100 SXM5: 5 HBM3 stacks active, 80 GB | NVIDIA H100 Tensor Core GPU Architecture white paper V1.02 (NVIDIA document; copy read at https://www.ece.lsu.edu/koppel/gp/refs/gtc22-whitepaper-hopper.pdf, the nvidia.com link redirected to an HTML landing page) | 2026-10-21 | p.17: "with 80 billion transistors, a die size of 814 mm2"; p.18: "6 HBM3 or HBM2e stacks, 12 512-bit Memory Controllers"; "80 GB HBM3, 5 HBM3 stacks, 10 512-bit Memory Controllers" | high (NVIDIA document via a university mirror); CoWoS variant not named in the white paper |
| P5 | NVIDIA Blackwell (B200) | 2 reticle-sized dies, NV-HBI 10 TB/s, 208 B transistors, TSMC 4NP; 192 GB HBM3E max; up to 1200 W TGP | NVIDIA technical blog "Inside NVIDIA Blackwell Ultra" (2025-08-22, updated 2025-09-24), https://developer.nvidia.com/blog/inside-nvidia-blackwell-ultra-the-chip-powering-the-ai-factory-era/ | 2026-10-21 | Table 2 rows "Dies per GPU: 2", "Max HBM capacity: 192 GB HBM3E", "Max power (TGP): Up to 1,200W" | high; HBM stack count and CoWoS variant not stated by NVIDIA |
| P5s | NVIDIA B200 (GB100) | CoWoS-L ("local area silicon interconnect (-L) variant ... instead of a monolithic silicon interposer (-S)"); 2 near-reticle GPU dies; 8 SK hynix HBM3E, each 8 DRAM dies + controller die (8-Hi) | `SECONDARY` TechInsights, https://www.techinsights.com/ja/node/59718 (2025-03-05) and https://techinsights.com/ja/node/59581 (2025-04-14) | 2026-10-21 | "eight SK hynix high bandwidth memory 3 extended (HBM3E)"; "Each of the eight HBM packages features eight memory dies stacked" | teardown; consistent with 192 GB = 8 x 24 GB (derived, assumes 24 GB stacks) |
| P6 | NVIDIA Blackwell Ultra (B300) | 2 reticle-sized dies, 208 B transistors, 288 GB HBM3E, 12-Hi stacks, 8,192-bit total; up to 1400 W TGP; stack count CONTRADICTORY: body "Eight 12-Hi stacks" vs update note "12 HBM stacks instead of 8" | NVIDIA technical blog (as P5) | 2026-10-21 | "HBM configuration: Eight 12-Hi stacks, 16 x 512-bit controllers (8,192-bit total width)"; note: "This post was updated on 9/24/25 to correct Figure 1 and the HBM configuration section to show the proper 12 HBM stacks instead of 8." | conflict C5, unresolved; no preset |
| P7 | NVIDIA Rubin | 2 reticle-limited compute dies on one package; up to 288 GB HBM4, 12-Hi stacks; 336 B transistors | NVIDIA technical blog "Inside NVIDIA Rubin GPU architecture" (2026-07-21), https://developer.nvidia.com/blog/inside-nvidia-rubin-gpu-architecture-powering-the-era-of-agentic-ai/ | 2026-10-21 | "constructed from reticle limited compute dies"; "These two dies are unified on a single package"; "up to 288 GB of HBM4 memory, driven by dedicated HBM controllers and 12-Hi stacks" | high; HBM stack count, I/O dies and CoWoS variant not stated (288 / 36 GB = 8 stacks is arithmetic only, 36 GB/stack not stated by NVIDIA) |
| P7s | NVIDIA Rubin | 8 HBM4 stacks; "two near-reticle-sized compute dies plus two I/O dies" on a "4x reticle-size CoWoS-L interposer" | `SECONDARY` search-result summaries of blog.barrack.ai and digitalcitizen.life (pages not opened) | 2026-10-21 | quoted from the search summary only | low; not used |
| P8s | NVIDIA Rubin Ultra | 4 reticle-limited GPUs, 16 HBM4E stacks, 1 TB (GTC 2025 roadmap); later reports that the 4-die version was replaced by 2 dies | `SECONDARY` search-result summaries (glennklockwood.com garden page; Tom's Hardware citing SemiAnalysis) | 2026-10-21 | quoted from search summaries; no NVIDIA page found | low; conflicting; not used |
| P9 | Broadcom 3.5D XDSiP | > 6000 mm2 of silicon, up to 12 HBM stacks per package; lead F2F 3.5D XPU: 4 compute dies + 1 I/O die + 6 HBM; uses TSMC "2.5D CoWoS"; production shipments from 2026-02; 2.5D reference point "up to 2500 mm2 of silicon and ... up to 8 HBMs on an interposer" | Broadcom press release 2024-12-05 (investors.broadcom.com returned HTTP 403; syndicated full text read at https://seekingalpha.com/pr/19938049-broadcom-delivers-industry-s-first-3_5d-f2f-technology-ai-xpus) | 2026-10-21 | "integrates more than 6000 mm2 of silicon and up to 12 high bandwidth memory (HBM) stacks in one packaged device"; "integrates four compute dies, one I/O die, and six HBM modules"; "production shipments starting February 2026" | high (company release via syndication); CoWoS variant (S/L/R) not named |

Other secondary compilation in the DB: ectc51846.2026.00199 (Georgia Tech, ECTC 2026) p.2 Table I lists NVIDIA
B200/B300 as "2 x GPU, 8 x HBM3e (8-Hi/12-Hi), CoWoS", R200 (projected 2026) "2 x GPU, 8 x HBM4", R300 (projected 2027)
"4 x GPU, 16 x HBM4e", substrate "Not specified" / "N/A". `SECONDARY` (third-party compilation citing NVIDIA blogs and
TSMC papers); it sides with 8 stacks for B300.

## 3. Secondary reports (press / analysts), not used as values

| id | claim | source | retrieved | note |
|---|---|---|---|---|
| S1 | 5.5-reticle CoWoS yields 98 %; 14-reticle 20 HBM in 2028; beyond 14 reticles "up to 24 HBM stacks in 2029"; SoW "up to 64 HBM stacks and 16 CoWoS modules at sizes exceeding 40 reticles", HBM-integrated SoW-X 2029 | TrendForce 2026-05-14 citing Commercial Times (Taiwan Technology Symposium), https://www.trendforce.com/news/2026/05/14/news-tsmc-sees-ai-wafer-demand-rising-11x-from-2022-2026-targets-cowos-with-24-hbm-stacks-in-2029/ | 2026-10-21 | 24 HBM (2029) and 64 HBM (SoW) not in a TSMC page read here |
| S2 | B200 on CoWoS-L; B200A on CoWoS-S | TrendForce 2024 (search summary only) | 2026-10-21 | not opened |
| S3 | 9x "super carrier" with 12 HBM4, 7722 mm2 (OIP 2024) | carried from DevLog/research/2026-10-20-sim-canonical-configs.md (Tom's Hardware); not re-read this session | - | superseded by T9 (9.5x, 12+ HBM); 9.5 x 830 = 7885 mm2 (derived) |

## 4. Conflicts (not resolved)

- C1 Reticle-area arithmetic for the 3x / 3.3x CoWoS-S interposer: ~2500 mm2 (ectc51909.2023.00174 p.1-2), ~2600 mm2
  and 58.9 x 44.1 mm = 2597 mm2 (ectc51909.2023.00091 p.2 Fig. 3), 3.3X ~2800 mm2 for the 2022 generation
  (ectc51909.2023.00091 p.1 Fig. 2), 3.3X ~2700 mm2 (TSMC 3DFabric page, snippet). 3 x 830 = 2490; 3.3 x 830 = 2739.
  The 2020 point differs the same way: 2X, ~1,700 mm2 (TSMC press release 2020-03-03, T15) vs 2.2X, ~1760 mm2
  (ectc51909.2023.00091 p.1 Fig. 2, D1), both with 6 HBM / 96 GB. (Added 2026-10-21 per audit A5 G4.)
- C2 5.5x CoWoS(-L) status: "will finish the qualification in 2026" (2025 AR p.4) vs "completed the certification ...
  in 2025 ... volume production in 2026" (2025 AR p.8, same document) vs "now producing 5.5-reticle size CoWoS"
  (press release 2026-04-23) vs "real world production of 5x reticle size" (Q3 2026 call). Likely different
  milestones (qualification of the CoWoS-L variant vs certification of "CoWoS"), but the documents do not say.
- C3 9.5x: volume production 2027 with 12+ HBM (press release 2025-04-24); "making good progress" (2025 AR); the
  2026-04-23 release names only 5.5x and 14x; the CEO says "working on the 9x" (2026-10-15).
- C4 SoW-X: "Volume production is scheduled for 2027" (2025-04-24) vs "40-reticle size SoW-X ... expected in 2029"
  (2026-04-23).
- C5 B300 HBM stack count: 8 (blog body, 8,192-bit width, ectc51846.2026.00199 Table I) vs 12 (blog update note
  2025-09-24). Both in the same NVIDIA page. No preset.
- C6 MI455X die naming: "8 XCD, 2 IOD, and 2 FCD" (Fig. 8 and text p.14) vs "FCD and MID chiplets" on N3P (p.14).
- C7 ectc51909.2023.00174 CoWoS-L TV package 70 x 76 mm (text) vs 70 x 78 mm (Fig. 3) (already logged in the DB).
- C8 3X CoWoS-S die set: "2 SoC + 8 HBM" (ectc51909.2023.00174 Fig. 1), "3 SoC/chiplet dies and 8 HBMs" (same paper,
  text), "two (2) SoCs, a (1) Chiplet and eight (8) HBM" (ectc51909.2023.00091 Fig. 3). Consistent if the chiplet is
  counted separately.

## 5. Gaps (no primary source found or read)

- Product interposer x/y, LSI count, LSI size and package/substrate size for any CoWoS-L product (B200, B300, Rubin,
  MI455X). TSMC and the product owners do not publish them; only teardown firms (paywalled) do.
- LSI x/y/thickness: not in any TSMC paper in the DB (ectc51909.2023.00174, 00091 give counts and wiring only).
- HBM3E / HBM4 package footprint and height from a vendor or JEDEC page: not found (search returned only reseller
  blogs). DB has 11 x 11 mm (HBM3, ectc51529.2024.00049-a-c2) and 11 x 10 mm (HBM2E, ectc51909.2023.00135-a-c2).
- CoWoS-S substrate size for a 3x / 3.3x product: none primary (MI300X 76.8 x 72.0 mm is a teardown value).
- Primary statement of which CoWoS variant NVIDIA H100, B200, B300, Rubin, AMD MI300X / MI355X and Broadcom XDSiP use
  (only MI455X = CoWoS-L is primary).

## 6. DB rows relevant to the templates (`reported` candidates)

| family | DB row (tv / comp) | fields | locator |
|---|---|---|---|
| cowos_s | ectc51909.2023.00135-a (and -a-c1..c8) | 85 x 85 mm, 2 x 1.5x interposers, 2 SoC 27 x 18, 8 HBM2E 11 x 10, interposer 100 um (current template backbone) | p.2 Table I, Fig. 3 |
| cowos_s | ectc.2013.6575597-a | 26 x 24 mm interposer, 40 x 40 mm substrate, 3 dies | p.1-2 |
| cowos_s | ectc51687.2025.00055-g / -h | simulation model: 2 GPU (800 mm2 each) + 8 HBM, interposer 3000 mm2, substrate 5000 mm2, lid 2 mm | p.3 Sec. III.A (simulation_model, not a built TV) |
| cowos_s | (no row) | fifth-generation 3x interposer 58.9 x 44.1 mm, 2 SoC + 1 chiplet + 8 HBM | ectc51909.2023.00091 p.2 Fig. 3: candidate for a new TV row (distillation lane), not added here |
| cowos_l | ectc51909.2023.00174-a, -a-c1..c5 | 70 x 78 (76) mm package, 43 x 58 mm RI (2500 mm2, 3x), 3 SoC + 8 HBM, LSI count 10 (">10") | p.2 Sec. II.A, Fig. 3 |
| cowos_l | ectc51909.2023.00091-b, -b-c1..c7 | 4.8x (4000 mm2), 6 SoC + 12 HBM2E, 18 LSI, 45 IPD, 91 x 91 mm 3-2-3, ring | p.3 Table 1, p.4 Sec. II.B |
| cowos_l | ectc51909.2023.00091-a, -a-c1..c8 | 1.6x + 3.8x dummy (5.4x equiv.), 2 SoC + 4 HBM2E + 8 dummy, 6 LSI, 45 IPD, 91 x 91 mm, lid 2000 um | p.3 Table 1, Sec. II.A |
| cowos_r (context) | ectc51529.2024.00049-a | 5.5x, 66 x 68 mm interposer, 4 SoC 32 x 21 + 12 HBM 11 x 11, 97.3 x 95 mm 8-2-8 | p.2 Fig. 2, Sec. III |

## 7. Proposed template values (for a later template lane)

Basis: `reported` = DB cell exists; `template` = value with a source but no DB cell (or an arithmetic choice), to be
written with `source` / `note`. Source ids refer to the tables above.

| family | knob | value | basis | source id |
|---|---|---|---|---|
| cowos_s | variant / preset name | `sota_3x`: one 3x Si interposer, 2 SoC + 1 chiplet + 8 HBM | template | D2, D3, D4 |
| cowos_s | ip_n | 1 | template | D2 |
| cowos_s | reticle_x | 3 (alt. 3.3 = platform max) | template | D2 (3); T2, D1 (3.3) |
| cowos_s | ip_w_mm x ip_d_mm | 58.9 x 44.1 | template (paper figure label, no DB cell) | D2 |
| cowos_s | soc_n | 2 SoC + 1 chiplet (chiplet size not given) | template | D2, C8 |
| cowos_s | hbm_n, layout | 8; 4 along each long edge (2 rows x 4), SoCs side by side in the middle | template | D2 (Fig. 3 photo) |
| cowos_s | hbm_w_mm x hbm_d_mm | 11 x 11 | reported | ectc51529.2024.00049-a-c2 |
| cowos_s | sbt_w_mm x sbt_d_mm | keep 85 x 85 (DB backbone) ; no primary product value | reported (backbone) | ectc51909.2023.00135-a-c4 |
| cowos_s | reticle_area_mm2 | 830 | template (definition) | T1 |
| cowos_l | backbone (keep) | 3 SoC + 8 HBM, 43 x 58 mm RI, >10 LSI | reported | D5 |
| cowos_l | SOTA preset `tv_4p8x` | reticle_x 4.8, ri_area_mm2 4000, soc_n 6, hbm_n 12, lsi_n 18, sbt 91 x 91, sc_ipd_n 45, ring | reported | D6 (ectc51909.2023.00091-b) |
| cowos_l | ri_w_mm x ri_d_mm for 4.8x | long side 75 (from the 75-85 mm estimate for 5x-6x), short side 4000 / 75 = 53.3 | template | D8 |
| cowos_l | preset `mi455x_class` | hbm_n 12 (HBM4), top-level dies 8 XCD + 2 IOD + 2 FCD (stacking of XCD on IOD not stated); all sizes template | template (counts from a primary product source) | P1 |
| cowos_l | roadmap annotation | 3.5x (2024 production), 5.5x (certified 2025, production 2026), 9.5x with 12+ HBM (2027), 14x with ~10 compute dies + 20 HBM (2028), > 14x (2029) | template (annotation only) | T4, T6, T7, T9, T10, T11 |
| cowos_l | preset `14x_roadmap` (optional) | reticle_x 14, ~10 compute dies, 20 HBM; all sizes template; area 14 x 830 = 11620 mm2 | template | T10, T1 |
| both | no preset | B300 (C5), Rubin / Rubin Ultra stack counts (P7, P8s) | - | C5 |
