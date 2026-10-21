---
title: Canonical simulation configs and parameter schema for the packaging multiphysics harness
date: 2026-10-20
status: research report (input to DevLog-010); nothing built
lane: canonical configs + parameter schema (one of the DevLog-010 research subagents)
inputs: DevLog-008, DevLog-010, config/package3d/{TEMPLATE_FORMAT.md, families.yaml, RESEARCH.md, 9 templates},
  data/*.csv (read-only queries through scripts/build_package3d.py DB/Matcher), references/<id>/text.md (facts +
  locators only), eo-modulator-atlas sims/SPEC.md + sims/chen2022/config.yaml + DevLog-026 (pattern only), web
  (primary company sources, retrieved 2026-10-20)
---

# Canonical simulation configs and parameter schema

Status words used below (same as DevLog-008): **reported** = one DB cell (row id + field); **derived** = arithmetic
on reported cells; **public** = a company/primary web source, URL in Sec. 2, retrieved 2026-10-20; **secondary** =
press/analyst coverage only, *unverified*; **template** = not reported anywhere we read, rationale given. Nothing
below is a solver result. Ranges marked "DB-observed" span the TVs in `data/` at 296 papers.

Short ids: a bare 5-digit id means `ectc51909.2023.<n>` for 00091, 00135, 00151, 00154, 00174, 00175, 00179;
`ectc51529.2024.<n>` for 00049, 00322; `ectc51687.2025.<n>` for 00026, 00027, 00047, 00055, 00085, 00131, 00148,
00178, 00187; `ectc51846.2026.<n>` for 00051, 00092, 00227; `ectc32696.2021.<n>` for 00125, 00315;
`ectc51906.2022.00108` for 00108. Two papers share a number and are always written in full:
ectc51909.2023.00155 (50 x 50 mm interposer TV, analog source of the templates) vs ectc51529.2024.00155 (120 x 120 mm
grade-A warpage TV), and ectc51687.2025.00051 vs ectc51846.2026.00051 (both EMIB-T; bare 00051 = the 2026 paper).

## 1. Summary

### 1.1 Categories, canonical sim, first physics, priority

| prio | category (`package_class`) | families (package3d ids) | canonical sim (case id) | physics first | then | best validation in DB (Sec. 7) |
|---|---|---|---|---|---|---|
| 1 | Bridge-in-mold RDL interposer (`si_bridge_fanout`) | cowos_l (+ ase_focos_bridge, amkor_s_connect, samsung_i_cube_e via the shared module) | `cowos_l/warpage_rt_ht`: CoW-on-substrate warpage 25 C and 240-260 C, lid or ring | thermo-mechanical (warpage) | steady thermal (Tj, Rjc) with SoC/HBM power map; EM: LSI line IL | 00091-a/b measured warpage (lid / ring, 91 x 91 mm); 00174-d/e LSI IL measured |
| 1 | Si-interposer 2.5D (`si_interposer_2p5d`) | cowos_s (+ samsung_mios, si_interposer_peers) | `cowos_s/warpage_corner_stress`: 2-module 85 x 85 mm MCM, warpage + interposer corner stress vs interposer thickness and C4 height | thermo-mechanical | thermal; EM (interposer line) | 00135-a/b (warpage + normalized corner-stress sweeps); grade-A peers ectc51529.2024.00155-a / ectc51687.2025.00027-a (120 x 120 mm, material table + stress-free T) |
| 1 | Bridge-in-substrate (`si_bridge_organic`) | emib_t, emib | `emib_t/bridge_stress`: 2 x 1X-reticle dies + 3 x 18 mm TSV bridge in a cavity; warpage + bridge-corner / FLI (first-level interconnect) stress | thermo-mechanical | regional EM: HBM channel over the bridge (IL, NEXT/FEXT); thermal | EMIB: ectc.2016.201-c IL 3.5 dB at 10 GHz and NEXT -17 dB (measured). EMIB-T: no warpage/thermal/stress row; HBM4e eye 67 % UI (simulated) only |
| 2 | Organic RDL interposer (`organic_rdl_interposer`) | cowos_r (+ organic_interposer_peers, info_os) | `cowos_r/thermal_rjc`: 3.3x CoWoS-R thermal TV, 4 SoC + 8 HBM heaters, In TIM, lid, cold plate | steady thermal | warpage (00026 normalized) | 00085-c/-d: Rjc 0.0108 C/W measured and simulated, 1866 W, model geometry + k table (Table 3) |
| 2 | FCBGA organic baseline (`organic_substrate`) | fcbga_organic | `fcbga_organic/substrate_warpage`: bare build-up substrate and 2-chip assembly warpage | thermo-mechanical | thermal (theta-JA JEDEC) | 00178-b/c (measured + simulated, stress-free T stated); 00148-b/c (ABF property table) |
| 2 | Fan-out RDL (`fan_out_wafer`, InFO_oS) | info_os | `info_os/theta_jc_tim`: theta-JC vs TIM BLT and k | steady thermal | warpage | itherm45881.2020.9190542-a (theta-JC simulated + measured per TIM) |
| 3 | 3D microbump stack / HBM (`microbump_3d`) | hbm_stack | `hbm_stack/stack_thermal`: 8/12/16-Hi stack on base die, PHY hotspot | steady thermal | die warpage at reflow | 00055-g/h (base-die power-density limits, simulated); 00151-a chip warpage window 20-30 um at 220 C |
| 3 | 3D hybrid bond (`hybrid_bonded_3d`) | soic, hybrid_bond_d2w/w2w, foveros_direct | `soic/thermal_stack`: SoIC vs microbump stack thermal | steady thermal | bond-layer stress | 00055-c/e/f (few rows) |
| 3 | Glass core (`glass_core_substrate`) | glass_core_substrate | `glass_core/warpage_vs_organic`: 65 x 65 mm glass vs organic core | thermo-mechanical | EM: TGV IL | 00178-d/e/f (simulated); 00093-d/e/f TGV IL 0.23-0.48 dB at 30 GHz (measured) |
| 3 | 3D on 2.5D (Foveros, Co-EMIB) | foveros, emib_3p5d | later; build from the above | - | - | electrical only (23 rows), no warpage/thermal |

Why this order: the user named CoWoS-S/L and EMIB-T. Warpage first because (a) all three families have at least one
warpage/stress row or a peer with a full material table, (b) it exercises the full stack (substrate, interposer,
underfill, stiffener/lid) and the thermo-mechanical coupling the harness must own, (c) it needs no power map. Thermal
second (CoWoS-R 00085 is the best-disclosed thermal case in the DB). EM is regional and per bridge/interposer line,
so its canonical case is a cross-section + length, not the whole package (Sec. 5.4).

Engine bring-up order (not user priority): `fcbga_organic/substrate_warpage` (simplest stack, sim + measured, stress-free
T stated) -> `si_interposer_peers/120mm_warpage` (ectc51529.2024.00155-a, full material table) -> `cowos_s` -> `cowos_l` -> `emib_t`.

### 1.2 Key findings

1. Only two DB papers disclose a usable material-property table for a large 2.5D warpage case: ectc51529.2024.00155
   (Table IV, MARC FEM, 260 C top temperature) and ectc51687.2025.00027 (Table IV + stiffener Table III, stress-free
   temperature stated). Both are Si-interposer peers (42 x 46 mm interposer, 120 x 120 mm substrate), not
   TSMC-labelled. No TSMC CoWoS paper in the DB states modulus/CTE tables, stress-free temperature or BCs.
2. TSMC CoWoS-L LSI count fits `n_lsi = n_hbm + n_soc` on all three TSMC TVs in the DB: 00091-a 4 + 2 = 6 (c4 count 6),
   00091-b 12 + 6 = 18 (c3 count 18), 00174-a 8 + 3 = 11 vs ">10" (c4 count 10, qualifier gt). Derived fit, not a
   stated rule; which edges carry which LSI is not reported.
3. Reticle area: TSMC defines one reticle as 830 mm2 (ectc51909.2023.00091 p.2 footnote; TV -b notes). DB interposer
   areas give 833 mm2 per reticle (00174-a 2500/3; 00091-b 4000/4.8), 816 (00049-a 4488/5.5), 814 (00085-c 2685/3.3).
4. EMIB-T scale facts are in our own DB papers (Sec. 2.3): > 120 x 120 mm and > 9x reticles (ectc51846.2026.00051 p.1);
   77 x 56 mm / 3 bridges / ~2x reticle TV and HLFF (hyper-large form factor) TVs with 30+ bridges and > 8X reticle in
   flight (ectc51687.2025.00051 p.4). The often-quoted "120 x 180 mm, 38 bridges" was not found in a primary source.
5. EMIB-T has zero warpage/thermal/stress rows in the DB (3 metrics total). Its canonical sim is a regression and
   sensitivity case until a validation source exists; EMIB (ectc.2016.201-c) supplies the only measured EM target.
6. HBM height is inconsistent across sources: 720 um kept for 12-layer HBM4 (vlsitechnologyandcir65830.2026.11577576
   p.1 text, no DB cell) vs 775 um for 12/16-Hi HBM4 (secondary reports of JEDEC JESD270-4; standard not read).
   HBM3E/HBM4 footprints were not found in any primary source read; 11 x 11 mm is a DB HBM3 value.

## 2. Public SOTA facts (primary unless marked; all retrieved 2026-10-20)

### 2.1 TSMC CoWoS

| fact | value | source | status |
|---|---|---|---|
| CoWoS-L in production since 2024 | 3.5x reticle | TSMC 2025 Annual Report ch.5 p.4, https://investor.tsmc.com/static/annualReports/2025/english/pdf/2025_tsmc_ar_e_ch5.pdf | public |
| CoWoS-L qualification 2026 | 5.5x reticle | same | public |
| CoWoS-L in development | 9.5x reticle ("making good progress") | same | public |
| CoWoS 5.5x interposer certified 2025, volume 2026 | 5.5x | same (Q&R section) | public |
| 9.5x CoWoS volume production 2027 | "12 HBM stacks or more" | TSMC press release 2025-04-24, https://pr.tsmc.com/english/news/3228 | public |
| SoW-X (CoWoS-based wafer-scale) volume 2027 | "40X the current CoWoS" compute | same | public |
| CoWoS-S max | 3.3X (~2700 mm2) | config/package3d/RESEARCH.md line 189 (TSMC page HTTP 403; search snippet) | secondary |
| 9x "super carrier" with 12 HBM4, 7722 mm2 | 2027 qualification | Tom's Hardware (OIP 2024 coverage) | secondary, unverified; superseded by 9.5x above |

### 2.2 Products (public examples, not defaults)

| product | package facts | power | source | status |
|---|---|---|---|---|
| NVIDIA Blackwell (B200) | two reticle-limited dies, 10 TB/s die-to-die; 208B transistors, TSMC 4NP | up to 1200 W (TGP, comparison table) | https://www.nvidia.com/en-us/data-center/technologies/blackwell-architecture/ ; power: Blackwell Ultra blog below | public; HBM count/capacity not on the fetched page |
| NVIDIA Blackwell Ultra (B300) | two reticle-sized dies (NV-HBI); 288 GB HBM3E; body text "Eight 12-Hi stacks, 8192-bit" | up to 1400 W TGP | https://developer.nvidia.com/blog/inside-nvidia-blackwell-ultra-the-chip-powering-the-ai-factory-era/ (2025-08-22) | public but **conflicting**: the 2025-09-24 correction note says "12 HBM stacks instead of 8"; stack count unverified |
| NVIDIA Rubin | two reticle-limited compute dies, one package; up to 288 GB HBM4, 12-Hi stacks, 22 TB/s | not stated | https://developer.nvidia.com/blog/inside-nvidia-rubin-gpu-architecture-powering-the-era-of-agentic-ai/ (2026-07-21) | public; stack count not stated |
| AMD MI300X | 8 XCD (accelerator complex die) + 4 IOD (I/O die); 8 HBM3 stacks, 192 GB; each IOD fans out to 2 stacks | 750 W (search snippet of AMD docs, not read) | https://www.amd.com/content/dam/amd/en/documents/instinct-tech-docs/white-papers/amd-cdna-3-white-paper.pdf | public (power secondary) |
| AMD MI350X / MI355X | 8 XCD + 2 IOD; 8 stacks of 12-Hi HBM3E, 36 GB/stack, 288 GB | 1000 W (MI350X, air) / 1400 W (MI355X, liquid) | https://www.amd.com/content/dam/amd/en/documents/instinct-tech-docs/white-papers/amd-cdna-4-architecture-whitepaper.pdf | public |
| AMD MI455X | **CoWoS-L**; 8 XCD + 2 IOD + 2 FCD (fabric and cache die); 12 HBM4 stacks, 2048 bit/stack, 432 GB | not stated in WP | https://www.amd.com/content/dam/amd/en/documents/products/technologies/cdna/amd-cdna5-whitepaper.pdf | public |
| B200 on CoWoS-L, 8 HBM3E | - | - | widely reported | secondary, unverified (not in a fetched primary page) |

Use: these set parameter **ranges** and named presets (e.g. preset `12hbm4_cowos_l` = MI455X-class counts), never
geometry defaults; die sizes, positions, interposer sizes and power maps of these products are not public.

### 2.3 Intel EMIB / EMIB-T

| fact | value | source | status |
|---|---|---|---|
| EMIB-T: package > 120 x 120 mm, > 9x reticles of compute + memory Si | ECTC 2026 | ectc51846.2026.00051 p.1 | DB paper (text; no DB cell) |
| EMIB bridges ~50 um thick in top dielectric layers | general EMIB | ectc51846.2026.00051 p.1 Sec. I (row -b-c1.thickness_um carries it) | reported (general, not EMIB25T) |
| EMIB25T TV: one 3 x 18 mm bridge, two 1x-reticle top dies, 25 um FLI | | ectc51846.2026.00051 p.3; rows -b-c1, -b-i1 | reported |
| 36 um FLI on a 2x-reticle TV passed package reliability; 35 um up to 4.5x reticle complexes certified by end of 2026 | | ectc51846.2026.00051 p.2 | DB paper text |
| Panel 510 x 515 mm; up to 240 x 240 mm package, > 40 reticles (theoretical) | | ectc51846.2026.00051 p.1, p.3 | DB paper text |
| EMIB-T package TV: 45 um D2D pitch, 3 bridges, 77 x 56 mm, ~2x reticle Si | | ectc51687.2025.00051 p.4; rows -a-c1.count, -a-c2.x_mm/y_mm, -a-i1.pitch_um | reported |
| TVs in flight: HLFF, 30+ bridges, > 8X reticle top Si (mix EMIB + EMIB-T); outlook > 12x reticle, ~250 x 250 mm | | ectc51687.2025.00051 p.4 | DB paper text |
| EMIB-T adds TSVs; EMIB-M adds MIM caps; bridges held by adhesive in a cavity | | Intel EMIB product brief 2025-07, https://www.intel.com/content/dam/www/central-libraries/us/en/documents/2025-07/emib-product-brief.pdf | public |
| > 6x reticle today, > 8x "this year", > 12x by 2028 | | Intel community blog (search snippet; page redirect, not read) | secondary, unverified |
| 120 x 180 mm, 38+ bridges, 12+ reticle dies; 24 HBM by 2028 | | Tom's Hardware / xenospectrum coverage | secondary, unverified |

### 2.4 HBM stack facts (per generation)

| gen | footprint (mm) | stack height (um) | dies | other | sources / status |
|---|---|---|---|---|---|
| HBM2E | 11 x 10 | 685 | 8 | 55 um bump pitch (dummy) | reported: ectc51909.2023.00135-a-c2.x_mm/y_mm; ectc32696.2021.00315-a-c2.thickness_um (Flashbolt, schematic) |
| HBM3 | 11 x 11 | 720 (8Hi) | 8 core + base | - | reported: ectc51909.2023.00154-a-c4, ectc51687.2025.00047-a-c2; 720 um from vlsitechnologyandcir65830.2026.11577576 p.1 text (no cell) |
| HBM3E | N/A (template 11 x 11) | 720 | 12-Hi (36 GB) | 1024 bit | 36 GB/12-Hi: AMD CDNA4 WP (public); 720 um: secondary (TrendForce, ZDNet on JEDEC), unverified |
| HBM4 | N/A (template 11 x 11; ectc51529.2024.00049-a-c2 labels its 11 x 11 HBM "HBM3/4") | 775 (12/16-Hi) or 720 (12-layer) | 12-Hi, 16-Hi | 2048 bit/stack (AMD CDNA5 WP) | 775: secondary, unverified (JESD270-4 not read); 720: vlsitechnologyandcir65830.2026.11577576 p.1 text; **conflict, open question Q3** |
| core die thickness | - | 58 (comparison case only) | - | - | ectc51909.2023.00179-a-c1.thickness_um (template use only, per DevLog-008 M3) |

## 3. Parameter schema (common block)

All families share one parameter vocabulary so the same knobs drive the 3D view (package3d template params) and the
sim. Names reuse the existing template param names where they exist (`soc_n`, `hbm_n`, `reticle_x`, `ri_w_mm`,
`bridge_w_mm`, ...); new keys are marked *new*. Each param entry in a sim config carries `{value, unit, status, ref |
source | note, range: [min, max], range_basis}`.

| group | param | unit | meaning | applies to |
|---|---|---|---|---|
| layout | `reticle_x` | - | interposer / Si area in reticle multiples | CoWoS-S/L/R, EMIB-T (Si content) |
| layout | `reticle_area_mm2` | mm2 | area of one reticle | all |
| layout | `soc_n`, `soc_w_mm`, `soc_d_mm`, `soc_h_um` | | logic die count and size | all |
| layout | `hbm_n`, `hbm_gen` *new*, `hbm_w_mm`, `hbm_d_mm`, `hbm_h_um`, `hbm_hi_n` *new* | | HBM count, generation, footprint, height, dies per stack | all with HBM |
| layout | `hbm_side` *new* | enum | `long_edges` (default) / `short_edges` / `all_edges` placement rule | all with HBM |
| layout | `die_gap_um`, `ip_edge_mm` | | die-to-die gap, die-to-interposer-edge margin | all |
| interposer | `ip_n`, `ip_w_mm`, `ip_d_mm`, `ip_h_um` | | interposer count and size (CoWoS-S), RI size (CoWoS-L: `ri_w_mm`, `ri_d_mm`) | CoWoS |
| interposer | `rdl_n`, `rdl_line_um`, `rdl_space_um`, `cu_t_um`, `pm_t_um`, `rdl_cu_frac` *new* | | RDL stack and in-plane metal fraction | CoWoS-R/L, InFO |
| bridge | `lsi_n` / `bridge_n`, `lsi_w_mm`, `lsi_d_mm`, `lsi_h_um`, `bridge_depth_um`, `tsv_pitch_um`, `tsv_d_um` | | bridge count, size, thickness, burial depth, TSV field | CoWoS-L, EMIB(-T) |
| substrate | `sbt_w_mm`, `sbt_d_mm`, `core_h_um`, `bu_n`, `bu_diel_um`, `bu_cu_um` *new*, `bu_cu_frac` *new*, `core_mat` *new* (`organic`, `glass`) | | substrate outline, core, N-2-N build-up | all |
| joints | `ubump_pitch_um/d_um/h_um`, `c4_pitch_um/d_um/h_um`, `fli_bridge_pitch_um`, `fli_core_pitch_um`, `bga_pitch_um/d_um/h_um` | | interconnect fields (homogenized, Sec. 5.2) | all |
| fills | `uf1_mat`, `uf2_mat`, `mold_mat` *new* | lib key | underfill / mold material keys | all |
| lid | `lid_type` *new* (`none`, `ring`, `lid`), `ring_w_mm`, `ring_h_um`, `ring_mat`, `lid_h_um`, `lid_mat` *new*, `lid_foot_w_mm` | | stiffener ring or lid | all |
| TIM | `tim_mat` *new*, `tim_h_um` (BLT), `tim_k_wmk` *new*, `tim_rc_mm2kw` *new* (contact resistance) | | TIM1 | thermal |
| power | `p_soc_w` *new* (per die), `p_hbm_w` *new* (per stack), `hotspot` *new* `{x_frac, y_frac, w_mm, d_mm, q_wmm2}`, `p_phy_wmm2` *new* | | power map | thermal |
| thermal BC | `bc_top` *new* (`fixed_t`, `htc`, `cold_plate`), `t_case_c` / `htc_wm2k` / `t_inlet_c`, `bc_bottom` (`adiabatic`, `htc`) | | | thermal |
| mech load | `t_ref_c` *new* (stress-free), `t_eval_c` *new* list, `support` *new* (`free_3_2_1`, `board`) | | | warpage |

## 4. Per-family parameter tables

Defaults are the values in the current package3d templates (resolved in `app/static/data/package3d.json`, generated
2026-10-20) unless noted. "rep/der/tem" as in DevLog-008.

### 4.1 CoWoS-L (priority 1)

| param | default | range | status | ref / source / rationale |
|---|---|---|---|---|
| `reticle_x` | 3 | 1.6 - 9.5 | rep | ectc51909.2023.00174-a.reticle_multiple; DB-observed 1.6 (00091-a), 3, 4.8 (00091-b); public 3.5 prod., 5.5 qual. 2026, 9.5 dev. (TSMC AR 2025 ch.5 p.4) |
| `reticle_area_mm2` | 833 | 814 - 858 | der | ectc51909.2023.00174-a.interposer_area_mm2 / .reticle_multiple; TSMC definition 830 mm2 (00091 p.2 footnote); 858 = 26 x 33 mm full field (standard scanner field, `standard_reference`) |
| `ri_w_mm` x `ri_d_mm` | 43 x 58 | area = reticle_x x reticle_area; aspect 0.5 - 2 | rep | 00174-a-c3.x_mm / y_mm; for other `reticle_x` derived: `ri_d_mm = reticle_x * reticle_area_mm2 / ri_w_mm` with `ri_w_mm` from the die block (as cowos_s.yaml does) |
| `soc_n` | 3 | 1 - 8 | rep | 00174-a-c1.count; DB-observed 2 (00091-a-c1), 6 (00091-b-c1); 8 = template ceiling for 9.5x (no source) |
| `soc_w_mm` x `soc_d_mm` | 18.7 x 18.57 | each <= 26 x 33 | tem | not reported for CoWoS-L; template fills the die block (cowos_l.yaml); cap = one reticle field |
| `hbm_n` | 8 | 0 - 12 | rep | 00174-a-c2.count; DB-observed 4 (00091-a-c2), 12 (00091-b-c2); public 12 HBM4 on CoWoS-L (AMD CDNA5 WP), "12 or more" at 9.5x (pr.tsmc.com 3228) |
| `hbm_gen` | HBM2E | HBM2E, HBM3, HBM3E, HBM4 | tem | sets footprint/height from Sec. 2.4; CoWoS-L TVs in DB use HBM2E (00091-a/b-c2) or unspecified (00174-a-c2) |
| `hbm_w_mm` x `hbm_d_mm` | 11 x 10 | 10 - 12.5 per side | tem (analog) | ectc51909.2023.00135-a-c2 (HBM2E); HBM3 11 x 11 (00154-a-c4); upper bound template for HBM4 (unknown, Q3) |
| `hbm_h_um` | 685 | 685 - 775 | tem (analog) | ectc32696.2021.00315-a-c2.thickness_um; 720 / 775 per Sec. 2.4 |
| `hbm_hi_n` | 8 | 8, 12, 16 | tem | only used when the HBM is resolved as a stack (Sec. 5.1); Rubin 12-Hi (NVIDIA blog), MI355X 12-Hi (AMD CDNA4 WP) |
| `die_gap_um` | 150 | 50 - 300 | tem (analog) | ectc51529.2024.00049-a-c1.gap_um (CoWoS-R SoC gap); range template |
| `ip_edge_mm` | 1 | 0.5 - 3 | tem | 00091-a notes: interposer = top-die rectangle + 1 mm per side |
| `lsi_n` | 10 (template layout: one per HBM-SoC edge + one per SoC-SoC edge = 8 + 2) | `>= n_hbm` | rep (count, qualifier gt) | 00174-a-c4.count; empirical fit `n_hbm + n_soc` (Sec. 1.2 item 2) gives 11; the harness should expose both rules (Q4) |
| `lsi_w_mm` x `lsi_d_mm` | 7 x 6 | 2 - 10 per side | tem (analog) | ectc51909.2023.00175-a-c3 (Amkor S-Connect bridge); not reported for TSMC LSI |
| `lsi_h_um` | 70 | 50 - 100 | tem (analog) | 00175-a-c3.thickness_um |
| `lsi_m_n`, `lsi_line_um`/`space_um`, `lsi_m_um` | 4; 0.8/0.8; 2 | LSI-1 0.8/0.8, LSI-2 2/2 | tem; rep; rep | count analog ectc.2016.201-a-L02.repeat; L/S + thickness ectc51909.2023.00174-d-L02 (LSI-1), -e-L02 (LSI-2, 2.3 um) |
| `ri_front_n` / `ri_back_n` | 1 / 1 | 1 - 4 (template) | rep | 00174-a-L03.repeat / -L06.repeat; the 6x TVs add a separate 6-layer super-carrier (SC) RDL the size of the substrate (00091-a-L07.repeat; TV notes), modelled as its own part `sc_rdl` *new* |
| `tiv_pitch_um` / `tiv_d_um` | 100 / 50 | - | rep | ectc51909.2023.00091-a-i2 |
| `ri_core_h_um` | 75 | 60 - 150 | tem | LSI + top via (cowos_l.yaml) |
| `ubump_pitch_um` / `d` / `h` | 35 / 18 / 22 | pitch 25 - 45 | tem (analog) | 00049-a-i1.pitch_min_um (CoWoS-R); ectc51909.2023.00155-a-i2 (d 18, h 15 + 7 cap); 00091-a-i1 notes: "may be scaled to 35 um or lower" |
| `c4_pitch_um` / `d` / `h` | 145 / 75 / 55 | pitch 100 - 150 | tem (analog) | 00049-a-i2 (CoWoS-R); ectc51909.2023.00155-a-i3; 00091 p.2 names C4 pitch scaling to 100-130 um as an assembly challenge |
| `sbt_w_mm` x `sbt_d_mm` | 70 x 78 | 55 - 120 per side | rep | 00174-a.package_x_mm / package_y_mm (78 fig. vs 76 text, logged); 91 x 91 (00091-a/b); 120 x 120 peer (ectc51529.2024.00155-a) |
| `core_h_um` | 1400 | 400 - 1600 | rep | ectc51909.2023.00091-a-L11.thickness_um |
| `bu_n` (per side) | 3 | 2 - 10 | rep | 00091-a-L10.repeat (3-2-3); 8-2-8 in CoWoS-R 00049-a.substrate_layer_count |
| `bu_diel_um` | 40 | 25 - 40 | tem (analog) | ectc51687.2025.00148-a-L04.thickness_um |
| `lid_type` | lid | none / ring / lid | rep (both exist) | 00174-a notes (ring and lid TVs b, c); 00091-a lid, 00091-b ring |
| `lid_h_um` | 2000 | 1000 - 3000 | rep | 00091-a-c8.thickness_um |
| `lid_mat` / `ring_mat` | Cu (template) | Cu, SUS430 | tem | lid material not stated in CoWoS-L rows; SUS430 ring in CoWoS-R (00049-a-c6), Cu ring CoWoS-S (00135-a-c5) |
| `tim_h_um` | 60 | 25 - 200 | tem (analog) | itherm45881.2020.9190542-a-c5 (InFO_oS TIM1); 25-200 um BLT swept in 00085-d |
| `tim_k_wmk` | 6 | 3.2 - 86 | tem (analog) | itherm45881.2020.9190542 Table 4 (3.2-30 W/mK); 86 W/mK In in 00085-d-m32 |
| `p_soc_w` | 500 | 0 - 1000 | tem (analog) | ectc51687.2025.00055-g condition "GPU 500 W each"; public: Blackwell up to 1200 W per 2-die GPU (NVIDIA) |
| `p_hbm_w` | `hbm_w*hbm_d*0.015 + phy_area*p_phy_wmm2` | - | tem (analog) | 00055-g condition: DRAM core 0.015 W/mm2, PHY 0.4-1.0 W/mm2 (HBM base die) |
| `t_ref_c` | 150 | 125 - 220 | tem (analog) | stress-free 150 C after assembly, 180 C bare substrate (ectc51687.2025.00178-c-m3 / -m1 condition) |
| `t_eval_c` | [25, 240] | 25 - 260 | rep | 00091-a-m1/m2 conditions (25 C, 240 C) |

Constraints (CoWoS-L): `ri_w_mm * ri_d_mm <= reticle_x * reticle_area_mm2 * (1 + tol)`; die block + `2 ip_edge_mm`
fits the RI; each SoC <= one reticle field; `hbm_n` placed per the `hbm_side` rule (Sec. 4.6); `lsi_n >= hbm_n`
(each HBM PHY needs a bridge to logic) and `lsi_n >= hbm_n + (soc_n - 1)` with the edge rule; RI + `c4uf_margin_mm`
fits inside the ring / lid foot; `sbt_w_mm >= ri_w_mm + 2 (ring_w_mm or lid_foot_w_mm) + margins`.

### 4.2 CoWoS-S (priority 1)

| param | default | range | status | ref / source / rationale |
|---|---|---|---|---|
| `ip_n` | 2 | 1 - 2 | rep | ectc51909.2023.00135-a-c3.count (MCM of two interposers) |
| `reticle_x` (per interposer) | 1.5 | 1 - 3.3 | rep | 00135-a.reticle_multiple; 3.3x upper bound secondary (RESEARCH.md) |
| `ip_w_mm` x `ip_d_mm` | 40.3 x 31.0 | area <= `reticle_x * reticle_area_mm2` | tem | x/y not reported; derived from the die block and 1.5x (cowos_s.yaml); 42 x 46 peer (ectc51529.2024.00155-a-c3) |
| `ip_h_um` | 100 | 50 - 200 | rep | 00135-a-c3.thickness_um; 50 um optimized (00135-c-c4); 200 um peer (ectc51529.2024.00155-a-c3) |
| `soc_n` (per interposer) | 1 | 1 - 2 | rep | 00135-a-c1.count = 2 for 2 interposers |
| `soc_w_mm` x `soc_d_mm` | 18 x 27 | <= 26 x 33 | rep | 00135-a-c1.y_mm / x_mm (rotated per Fig. 3) |
| `hbm_n` (total) | 8 | 0 - 8 (template ceiling at 3.3x) | rep | 00135-a-c2.count; 8 HBM3 on MI300X (AMD CDNA3 WP, package type not stated there) |
| `hbm_w/d`, `hbm_h_um`, `hbm_gen` | 10 x 11, 685, HBM2E | as 4.1 | rep / tem | 00135-a-c2; height analog 00315-a-c2 |
| `ubump_pitch_um` | 40 | 25 - 55 | rep | 00135-a-i1.pitch_um |
| `ubump_d_um` / `h_um` | 22 / 22 | - | tem (analog) | ectc51909.2023.00155-a-i1 (d 22, h 15 + 7 cap), as in cowos_s.yaml |
| `tsv_d_um` / depth / pitch | 10 / 100 / 50 | pitch 30 - 200 | rep / rep / tem | ectc.2013.6575597-a-i2; pitch analog eptc59621.2023.10457670-a-i1 |
| `cu_n` (BEOL levels), `al_h_um`, `cu_h_um` | 3, 1, 2 | 2 - 6 levels | rep / tem / tem | ectc.2013.6575597-a-L04.repeat; thickness analogs |
| `c4_pitch_um` / `c4_h_um` | 150 / 55 | standoff 60 - 90 (FEA sweep) | rep / tem | 00135-a-i2.pitch_um; 60-90 um studied (00135-a-i2.notes, metrics a-m13..m16) |
| `sbt_w_mm` x `sbt_d_mm` | 85 x 85 | 55 - 120 | rep | 00135-a-c4 |
| `core_h_um`, `bu_h_um` | 1300, 150 | - | tem (analog) | ectc51909.2023.00155-a-L17, -c10 (cowos_s.yaml) |
| `ring_mat`, `ring_h_um`, `ring_w_mm` | Cu, 2000, 7 | SUS430 / Cu; 1000 - 3000; 5 - 30 | rep / tem / tem | 00135-a-c5.material; 2000 analog ectc51909.2023.00155-a-c11; 28 x 30 mm stiffener width in ectc51529.2024.00155-a-c5 |
| `floorplan` *new* | `tv1` (SoC + 4 HBM per interposer) | `tv1`, `tv2` (2 HBM + 2 dummy) | rep | 00135 p.2 Fig. 3 (TV1/TV2) |
| `t_eval_c` | [25, 250] | | rep | 00135-a-m1/m2 conditions |

### 4.3 EMIB-T (priority 1)

| param | default | range | status | ref / source / rationale |
|---|---|---|---|---|
| `die_n` (logic) | 2 | 1 - 12 | rep | ectc51846.2026.00051-b-c2.count; > 9x reticles at > 120 mm (00051 p.1); 12 template ceiling |
| `die_w_mm` x `die_d_mm` | 26 x 33 | <= 26 x 33 | tem | "1x reticle top dies" without size (00051-b-c2.name) |
| `die_h_um` | 775 | 400 - 775 | tem (analog) | ectc51529.2024.00322-a-c1.thickness_um |
| `hbm_n` | 0 | 0 - 12 (24 future) | tem | backbone TV has no HBM; EMIB-T targets HBM4/4e (ectc51687.2025.00051 p.2); 12/24 HBM secondary only |
| `hbm_gen`, footprint, height | HBM4, 11 x 11 (template), 775 | Sec. 2.4 | tem | Q3 |
| `bridge_n` | 1 | `>= hbm_n + (die_n - 1)` (edge rule, Sec. 4.6) | rep | 00051-b-c1 (EMIB25T: 1 bridge); 3 bridges on the 77 x 56 mm TV (ectc51687.2025.00051-a-c1.count); 30+ bridges HLFF (p.4 text) |
| `bridge_w_mm` x `bridge_d_mm` | 3 x 18 | 2 - 8 x 2 - 18 | rep | 00051-b-c1.x_mm / y_mm; EMIB 2 x 2 to 8 x 8 mm (ectc.2016.201-a-c1 range) |
| `bridge_h_um` | 50 | 50 - 75 | tem (ref kept) | ~50 um general EMIB statement (00051-b-c1.thickness_um; Sec. I), EMIB < 75 um (ectc.2016.201-a-c1) |
| `bridge_depth_um` | 80 | 40 - 120 | tem | 2 x build-up dielectric (flow steps ectc51687.2025.00051-F1-s05/s06) |
| `tsv_pitch_um` / `tsv_d_um` (bridge) | 50 / 9 | - | tem (analog) | eptc59621.2023.10457670-a-i1; vlsitechnologyandcir46783.2024.10631478-a-i3 |
| `mim_nf_mm2` *new* | 500 | - | rep | 00051-d-m2 (design target); used only by a PDN study, not by the 3 physics |
| `fli_bridge_pitch_um` | 25 | 25, 35/36, 45, 55 | rep | 00051-b-i1.pitch_um; 36 (00051-a-i1.pitch_min_um), 45 (ectc51687.2025.00051-a-i1), 55 (ectc.2016.201-a-i1) |
| `fli_core_pitch_um` | 110 | 100 - 130 | rep | 00051-a-i1.pitch_max_um; 130 EMIB (ectc.2016.201-a-i2) |
| `fli_h_um`, `fli_bridge_d_um`, `fli_core_d_um` | 30, 12, 70 | - | tem / analog | emib_t.yaml (00227-b-i1, 10631478-a-i2 analogs) |
| `cav_h_um`, `cav_pitch_um` | 30, 110 | - | tem | bridge-to-cavity solder joints + underfill (flow s03); not dimensioned |
| `sbt_w_mm` x `sbt_d_mm` | 77 x 56 | 56 - 120 (240 theoretical) | rep | ectc51687.2025.00051-a-c2; > 120 x 120 (00051 p.1 text) |
| `core_h_um`, `bu_n`, `bu_diel_um` | 1200, 4, 40 | core 400 - 1600, bu 4 - 10 | tem (analog) | ectc51687.2025.00148-a-L07/-L06/-L04 |
| `core_mat` | organic | organic / glass | tem | EMIB in glass core exists (ectc51846.2026.00134-a, glass_core_substrate family) |
| `lid_type` | none | none / ring / lid | tem | no EMIB-T row states stiffener or lid |
| `uf_mat`, `cav_uf_mat` | generic CUF | - | tem | capillary underfill reported for EMIB (ectc.2016.201) |
| `t_ref_c`, `t_eval_c` | 150, [25, 260] | | tem | no EMIB-T warpage condition in DB; 260 C delamination check in EMIB CHIPS (ectc51687.2025.00061-a-m10) |

### 4.4 CoWoS-R (next)

| param | default | range | status | ref |
|---|---|---|---|---|
| `reticle_x` | 5.5 | 3.3 - 5.5 | rep | ectc51529.2024.00049-a.reticle_multiple; 3.3 (ectc51687.2025.00085-c.reticle_multiple) |
| `ip_w_mm` x `ip_d_mm`, `ip_h_um` | 66 x 68, 50 | - | rep | 00049-a-c4; 00049-a-i3.total_length_um used as thickness |
| `rdl_n`, L/S, via | 9, 2/2, 8 | 4 - 9; 1.4/1.4 - 2/2 | rep | 00049-a-L02; 1.4/1.4 (ectc51687.2025.00047-b-L01) |
| `soc_n` / size / gap | 4 / 32 x 21 / 150 um | 1 - 4 | rep | 00049-a-c1 |
| `hbm_n` / size | 12 / 11 x 11 | 0 - 12 | rep | 00049-a-c2 |
| `ipd_n` (land-side) | 248 | 0 - 248 | rep | 00049-a-c3.count |
| `sbt` | 97.3 x 95, 8-2-8 | 95 - 110 | rep | 00049-a-c5, .substrate_layer_count; 110 x 110 (ectc51687.2025.00026-b) |
| `ring_mat` | SUS430 | - | rep | 00049-a-c6.material |
| thermal case (`thermal_rjc`) | 4 SoC + 8 HBM heaters, In TIM 200 um, 86 W/mK, 1866 W uniform SoC, inlet 20 C | BLT 25 - 200 um | rep | ectc51687.2025.00085-c-c1/-c2/-c6, -c-m5..m7, -d-m32 |

### 4.5 EMIB (next)

Defaults as emib.yaml: 3 dies, 2 bridges, bridge 2 x 2 mm (lower bound of 2-8 mm, ectc.2016.201-a-c1), < 75 um,
M1-M4 2/2 um (a-L02), 55 / 130 um bumps (a-i1 / a-i2), 45 um gen 2 (ectc51687.2025.00051-b-i1), substrate 65 x 65 mm
(ectc51687.2025.00061-a). Differences from EMIB-T for the sim: no TSV (bridge is a passive Si slab in the thermal and
mechanical models), adhesive layer under the bridge (`adh_h_um` 20, template), power delivery cantilevered (not modelled).

### 4.6 Cross-family constraints and layout rules

| rule | expression | status |
|---|---|---|
| reticle area | `area(interposer or Si content) <= reticle_x * reticle_area_mm2` (warn above, error above 1.05x) | der (Sec. 1.2 item 3) |
| logic die cap | `soc_w_mm <= 26 and soc_d_mm <= 33` (either orientation) | `standard_reference` (scanner field 26 x 33 mm); TSMC uses 830 mm2 |
| HBM per logic edge | `hbm_per_edge <= floor((edge_mm + die_gap_mm) / (hbm_long_mm + die_gap_mm))` | tem (geometry) |
| HBM placement | default `long_edges`: HBM in columns along the two long SoC edges (CoWoS-S Fig. 3; CoWoS-L photo, 00174 Fig. 3(a)); `short_edges`: rows above/below the SoC block (CoWoS-R 5.5x Fig. 2) | tem with figure locators |
| HBM count parity | `hbm_n % (2 * ip_n) == 0` for symmetric layouts; odd counts allowed with `symmetry: none` | tem |
| bridge count (CoWoS-L) | `lsi_n = n_hbm + n_soc` (fits 3 TSMC TVs) or edge rule `n_hbm + n_adjacent_soc_pairs` | der (fit) / tem |
| bridge count (EMIB-T) | edge rule: one bridge per HBM-logic edge + one per adjacent logic pair | tem; 2 dies 1 bridge (rep), 3 bridges at ~2x reticle (rep) |
| bridge under edge | bridge centred on the die-die gap; `bridge_w_mm > die_gap_um/1000 + 2 * fli_rows * fli_bridge_pitch_um/1000` | tem |
| interposer in substrate | `sbt_w_mm >= ip_w_mm + 2 * (uf2_margin_mm + ring_w_mm + 1)` | tem |
| lid plane | `lid_gap_um = stack height to top die + tim_h_um`; SoC and HBM coplanar (single TIM plane) unless `tim_step_um` *new* given | tem (00085 Fig. 1 coplanar drawing) |
| HBM height vs SoC | `soc_h_um = hbm_h_um` default (coplanar back side) | tem |

## 5. Template contract -> simulation geometry

### 5.1 Parts (package3d `parts`)

All package3d parts are axis-aligned boxes with explicit z (DevLog-008 conventions), so the sim geometry can be a
**conformal rectilinear grid**: x, y, z grid lines at every part/layer/array-region boundary plus graded refinement;
each cell takes the material of the last solid that contains it (painter order = parts, then layers, then
homogenized arrays). This avoids CAD booleans and a tet mesher in the browser, gives hex elements, and keeps thin
layers exact in z. Curved/fillet features do not exist in the templates and are not needed for v1.

| part kind | sim treatment | warpage | thermal | EM (regional) |
|---|---|---|---|---|
| substrate | volume; layered by its `layers` (core + build-up groups) | yes, orthotropic per layer | yes, orthotropic k per layer | only in substrate-channel cases |
| interposer (Si) | volume; BEOL `layers` -> one homogenized layer, Si core with TSV field | yes | yes | yes (line region only) |
| interposer (RDL / RI) | stack of homogenized RDL layers + mold core | yes | yes | yes (line region) |
| die, hbm | volume (Si); HBM optionally resolved as `hbm_hi_n` core dies + MUF/NCF gaps (`hbm_detail: lumped | stacked`) | lumped | lumped default; stacked for `hbm_stack` cases | no |
| bridge (LSI, EMIB) | volume Si + homogenized metal layers; TSV field homogenized | yes | yes | yes, explicit lines |
| mold | volume | yes | yes | dielectric where in the region |
| underfill (`fill`) | volume; joints homogenized into it (Sec. 5.2) | yes | yes | dielectric |
| lid, stiffener (frame) | volume (frame = 4 boxes) | yes | yes | no |
| tim | volume or zero-thickness contact resistance (`tim_model: volume | rc`) | yes (soft, low E) | yes | no |
| ipd | dropped (warpage), lumped (thermal: dropped) | no | no | no |
| adhesive (`kind: other`) | volume when `h_um >= 5`, else merged into the neighbour | yes | yes | no |

### 5.2 Layers and arrays: homogenization rules

Area fraction of a bump/TSV field: `f = pi d^2 / (4 p^2)` (square grid). Examples from the current defaults: micro-bump
40/22 um -> 0.24; C4 150/75 um -> 0.20; TSV 50/10 um -> 0.031; TIV 100/50 um -> 0.20. A field with a `region`
(e.g. FLI over the bridge vs coarse FLI) becomes two homogenized sub-regions.

| layer type | properties | rule (v1) | notes |
|---|---|---|---|
| bump + underfill (`microbump`, `c4`, `cu_pillar`, `bga` with UF) | k_z | `f k_b + (1-f) k_uf` (parallel) | joint metal = Cu pillar + solder by height fraction |
| | k_xy | Maxwell-Garnett (cylinders) or `(1-f) k_uf + f k_b` upper bound; report both bounds | |
| | E_z, alpha_z | Voigt (parallel) | |
| | E_xy, G | Mori-Tanaka or Reuss (underfill-dominated) | lower bound; joint stress not resolved |
| TSV / TIV / TGV / PTH field | same as above with host Si / mold / glass / laminate | | |
| RDL / BEOL level (`role: conductor` + `dielectric` pairs) | in-plane k, E | rule of mixtures with metal fraction `rdl_cu_frac` | `rdl_cu_frac` unknown in every family: template 0.3 (signal) - 0.7 (plane); ectc51687.2025.00085 states orthotropic k from Cu density per layer (p.3), values not in text |
| | out-of-plane | series | |
| substrate build-up | per layer: dielectric + Cu plane fraction `bu_cu_frac` | same | `bu_cu_frac` unknown: template 0.6 - 0.8 (plane) rationale needed per case |
| BGA (no UF) | dropped for package warpage (free BCs); homogenized solder/air layer for board-level | | |

Detail dropped per physics: individual bumps, vias, TSVs and lines (all three, except EM); IPDs; fillets; solder
caps (merged into joint height); cavity clearance gaps < 50 um (merged into fill). Explicit only in EM: signal and
ground lines, vias in the EM region, the dielectric stack under them, the Si below.

Sub-modelling (later tranche): joint-level stress (corner micro-bump, C4, FLI over the bridge) by a local model driven
by the global displacement field at the corner, as in the papers' corner-stress metrics (00135 Fig. 8-10; 00125 ELK
stress).

### 5.3 Symmetry and mesh hints

| family / case | symmetry | condition |
|---|---|---|
| cowos_s TV1 (2 modules along y, SoC + 4 HBM each) | quarter (x = 0, y = 0 mirror) | uniform delta-T, symmetric floor plan; thermal with identical module powers |
| cowos_s TV2 | half (x = 0) | TV2 floor plan is not y-symmetric per module (2 HBM + 2 dummy), verify on Fig. 3 |
| cowos_l 3 SoC + 8 HBM, LSI under each HBM-SoC edge | quarter | odd SoC count centred on y = 0; lid/ring symmetric |
| cowos_r 4 SoC + 12 HBM | quarter | 2 x 2 SoC, 2 HBM rows |
| emib_t 2 dies + 1 bridge | quarter | bridge centred on the gap; odd bridge/HBM counts -> half or full |
| any non-uniform power map / hotspot | none (full) | unless the map itself is mirror-symmetric |
| EM line region | none, or odd/even mirror on differential pairs | per the EO SPEC `x_mirror_odd` precedent |

Mesh hints (template, to be tuned by convergence studies):

| region | in-plane h | through-thickness | rationale |
|---|---|---|---|
| substrate, lid, ring | 1.0 - 2.0 mm (graded from die edges) | >= 2 hex per layer, >= 6 across the substrate | bending of the dominant stiffness layers |
| interposer / RI | 0.5 mm, 0.1 mm near die and interposer corners | >= 3 across Si, 1 per homogenized layer | corner stress and warpage gradient |
| dies, HBM | 0.5 - 1.0 mm | >= 3 | |
| bump/UF layers | inherit neighbours | 1 - 2 | homogenized |
| bridge | 0.2 - 0.5 mm | >= 3 | bridge-corner stress in EMIB-T |
| thermal hotspot | <= hotspot size / 4 | as above | |
| EM line | <= line_w / 4 laterally, <= t / 2 in metal, lambda/20 elsewhere | | separate Nedelec mesh, PML / wave ports (Sec. 5.4) |

Size estimate (template arithmetic, not measured): CoWoS-L quarter model ~60 x 80 x 30 = 1.4e5 hex; trilinear
mechanics ~1.5e5 nodes x 3 = ~4.5e5 DOF; thermal ~1.5e5 DOF. Full CoWoS-L ~1.8e6 DOF mechanics.

### 5.4 EM regional cases (not the package grid)

The EM case is a short line segment extracted from one layer group of a template: the LSI metal stack (cowos_l
`lsi_m`: 0.8/0.8 um LSI-1, 2/2 um LSI-2), the RDL stack (cowos_r `rdl_cu`/`rdl_pm`), the Si-interposer BEOL
(cowos_s `ip_cu`) or the EMIB bridge (emib `m_n` levels at 2/2 um). Inputs: layer thicknesses and L/S from the
template, line length `em_len_mm` *new*, G-S-G / G-S-S-G pattern *new*, Dk/Df per dielectric (library), Si
resistivity (library; unknown in every TSMC row -> `missing`). Output S21/S11/NEXT/FEXT vs f. The cross-section part
can reuse the EO repo 2D quasi-static line solver; the 3D part (bump/via transitions, pads) is the regional FEM with PML.
Grade-A EM candidate: eptc67330.2025.11392620-a (4-layer RDL Si bridge, PI Dk 3.3 / Df 0.034 per layer L01/L08/L10/L14,
4 um dielectric, 2 um metal, 7 L/S designs, IL per mm de-embedded at 56 GHz) - it is a Si-bridge-fan-out coupon outside
the priority families but exactly the regional-line case.

## 6. Config sketch: `sims/cowos_l/warpage_rt_ht.yaml`

Pattern follows eo-modulator-atlas `sims/SPEC.md` (inputs only; params with `=` expressions; `provenance`, `missing`,
`limitations`; `targets` with tolerances and a `source`; `studies` with `sweep_targets`). Differences: geometry comes
from a package3d template plus param overrides (one vocabulary for the 3D view and the sim), and provenance statuses
are the DevLog-008 ones.

```yaml
schema: apa.sim/v1
id: cowos_l-warpage_rt_ht-tv1p6x-lid
family: cowos_l
title: CoWoS-L 1.6x lid-type mechanical TV, package warpage at 25 C and 240 C
validation_tv: ectc51909.2023.00091-a          # the TV the targets come from
repro_grade: B                                 # A = model inputs disclosed; B = geometry partial, materials missing
validation_status: unvalidated
physics: [solid_mechanics, thermal_expansion]  # thermo-mechanical, one-way: prescribed uniform temperature

geometry:
  generator: package3d                         # resolve config/package3d/cowos_l.yaml with these overrides
  template: cowos_l
  overrides:                                   # each override carries its own status
    reticle_x:  {ref: ectc51909.2023.00091-a.reticle_multiple}        # 1.6
    sbt_w_mm:   {ref: ectc51909.2023.00091-a-c6.x_mm}                 # 91
    sbt_d_mm:   {ref: ectc51909.2023.00091-a-c6.y_mm}                 # 91
    soc_n:      {ref: ectc51909.2023.00091-a-c1.count}                # 2
    hbm_n:      {ref: ectc51909.2023.00091-a-c2.count}                # 4
    dummy_n:    {ref: ectc51909.2023.00091-a-c3.count}                # 8 (new template param)
    lsi_n:      {ref: ectc51909.2023.00091-a-c4.count}                # 6
    lid_type:   {template: lid, note: "lid-type TV (00091-a-c8)"}
    lid_h_um:   {ref: ectc51909.2023.00091-a-c8.thickness_um}         # 2000
    sc_rdl_n:   {ref: ectc51909.2023.00091-a-L07.repeat}              # 6-layer super-carrier RDL, 91 x 91 mm (new part)
  ri_from: top_die_rect_plus_mm                # interposer = top-die rectangle + ip_edge_mm (00091-a notes)
  symmetry: quarter                            # x = 0 and y = 0 mirror; checked against the resolved layout
  detail:
    hbm: lumped                                # lumped | stacked
    joints: homogenized                        # homogenized | explicit (sub-model only)
    bga: dropped                               # package-only warpage, free support
  mesh: {kind: rectilinear_hex, h_inplane_mm: 1.0, h_corner_mm: 0.1, min_layers: 2, grade: 1.3, max_dof: 2.0e6}

params:
  t_ref_c:  {value: 150, unit: C, status: template, note: "stress-free T not reported; analog = post-assembly stress-free 150 C of ectc51687.2025.00178-c-m3"}
  dt_room_c: {value: "=25 - t_ref_c", unit: C}
  dt_hot_c:  {value: "=240 - t_ref_c", unit: C}

materials:                                     # library keys; values and citations live in engine/data/materials.json
  silicon:        {library: si_100_isotropic}
  mold_compound:  {library: emc_generic, note: "EMC grade not stated"}
  underfill:      {library: cuf_generic}
  organic_core:   {library: core_laminate_generic}
  build_up:       {library: abf_gl102}         # only if the property table of ectc51687.2025.00148 is used (template)
  copper:         {library: cu_annealed}
  lid:            {library: cu_ofhc, note: "lid material not stated; template"}

homogenize:
  ubump_uf: {from: [ubump_*, uf], rule: {kz: parallel, kxy: maxwell, Ez: voigt, Exy: mori_tanaka}}
  c4_uf:    {from: [c4, c4uf], rule: same}
  tiv_core: {from: [tiv, ri_core], rule: same}
  rdl:      {layers: [ri_f_*, ri_b_*], cu_frac: {value: 0.5, status: template, note: "metal density not reported"}}

physics_blocks:
  solid_mechanics:
    model: linear_elastic                      # v1; viscoelastic mold/UF and plastic Cu/solder later
    thermal_expansion: {reference_temperature: "=t_ref_c"}
  bcs:
    support: free_3_2_1                        # three-point rigid-body fix on the substrate bottom
    mirrors: [x0, y0]
  loads:
    - {name: room, temperature_c: 25}
    - {name: hot,  temperature_c: 240}

studies:
  steps: {type: stationary, sweep: [{load: [room, hot]}]}
  hbm_count:
    type: parametric
    sweep: [{param: hbm_n, values: [4, 8, 12]}, {param: reticle_x, values: [1.6, 3.0, 4.8]}]
    sweep_targets:
      - {at: {hbm_n: 12, reticle_x: 4.8}, metric: warpage_um, load: room, value: null,
         note: "00091-b is ring-type (-m1 186 um); compare only with lid_type: ring", comparable: false}

outputs:
  - {metric: warpage_um, def: "max(w) - min(w) over the substrate top, sign = paper convention (Q6)"}
  - {metric: coplanarity_um, def: "BGA-side coplanarity, JEDEC JEP95 style (Q6)"}

targets:
  - {metric: warpage_um, load: room, value: 64,   tol_abs: 30, source: {metric_id: ectc51909.2023.00091-a-m1}}
  - {metric: warpage_um, load: hot,  value: -148, tol_abs: 40, source: {metric_id: ectc51909.2023.00091-a-m2}}

provenance: {}                                 # filled from the resolved package3d dims (status, ref, note)
missing:
  - material properties of mold, UF1, UF2, substrate layers, lid (none stated in 00091)
  - stress-free temperature, cure schedule, measurement method details
  - top-die, LSI and dummy-die sizes and positions
  - TIM material and BLT
limitations:
  - linear_elastic_no_viscoelastic_cure_history
  - homogenized_joint_layers
  - uniform_temperature_no_process_sequence
```

The thermal companion (`sims/cowos_r/thermal_rjc.yaml`) uses the same geometry block with `physics: [heat_transfer]`,
`loads: [{power_map: {soc: {per_die_w: "=1866/4", region: heater_groups}, hbm: 0}}]` (00085-a-m5 design target 116.7 W
per heater group x 16), `bcs: {top: {cold_plate: {t_inlet_c: 20}}}` or a calibrated `htc`, `tim: {k_wmk: 86, h_um: 200,
rc: calibrate}`, and targets 00085-c-m1 (Rjc 0.0108 C/W, measured) and 00085-c-m5 (Tj 104.9 C), with the BLT sweep
targets from 00085-d-m4..m11 as `sweep_targets` (simulated basis, so `comparable: model_to_model`).

Implementation notes for the geometry generator: (1) `scripts/build_package3d.py` already resolves params, layout and
provenance; the sim needs the same resolver in TS/WASM (browser) or a pre-step that emits `package3d.json`-shaped
geometry for one param set; (2) templates need new params `dummy_n`, `hbm_gen`, `lid_type`, `hbm_side`, `p_*`, and a
layout routine for variable HBM count (today `hbm_rows_n = hbm_n / hbm_cols_n` style formulas, which already work
for even counts); (3) a param override must keep its status (an override of a reported cell with a user value becomes
`user`, a new status shown like template).

## 7. DB support: validation candidates per family

Query: `scripts/build_package3d.py` `DB` + `Matcher({families: true})` over data/metrics.csv and
data/electrical_interfaces.csv (2026-10-20, read-only). Counts = metrics in warpage / thermal / mechanical /
electrical for matched TVs. "inputs" = what the paper text discloses for a model: G geometry (outline, dies,
thicknesses), M material table (modulus/CTE or k), T temperature profile / stress-free T, B BCs / solver.

### 7.1 Per-family counts

| family | TVs matched | warpage | thermal | mechanical | electrical |
|---|---|---|---|---|---|
| cowos_s | 9 | 6 | 42 (sim) | 16 (sim) | 1 |
| cowos_l | 7 | 4 (measured) | 0 | 0 | 6 + 2 power |
| cowos_r | 32 | 20 | 82 | 40 | 33 |
| emib | 12 | 4 | 0 | 10 | 2 |
| emib_t | 6 | 0 | 0 | 0 | 1 (+ 2 power) |
| fcbga_organic | 74 | 157 | 5 | 29 | 37 |
| si_interposer_peers | 52 | 221 | 20 | 41 | 39 |
| samsung_mios | 6 | 63 | 0 | 19 | 1 |
| info_os | 9 | 12 | 65 | 4 | 6 |
| hbm_stack | 18 | 3 | 7 | 17 | 11 |
| soic | 21 | 0 | 10 | 4 | 67 |
| glass_core_substrate | 62 | 51 | 7 | 25 | 74 |
| ase_focos_bridge / amkor_s_connect | 5 / 3 | 25 / 27 | 0 | 2 / 0 | 0 |
| fan_out_panel | 54 | 133 | 0 | 31 | 0 |

### 7.2 Top candidates (metric_id, value, unit, basis, locator, inputs, missing)

CoWoS-L

| metric_id | value | basis | condition / locator | inputs | missing |
|---|---|---|---|---|---|
| ectc51909.2023.00091-a-m1 / -m2 | 64 um / -148 um | measured | 25 C / 240 C, lid TV 1.6x, 91 x 91 mm; p.3 Fig. 6(c) (text says 65 um and ~150 um, p.3) | G partial (outline, core 1400, 3-2-3, lid 2000, uBGA 500/200 um, TMV 100/50) | M, T (stress-free), die/LSI sizes, lid/TIM material |
| ectc51909.2023.00091-b-m1 / -m2 | 186 um / -107 um | measured | 25 C / 240 C, ring TV 4.8x, 6 SoC + 12 HBM2E, 18 LSI; p.4 Fig. 7(c) | as above, ring | as above, ring size |
| ectc51909.2023.00174-d-e1 / -e-e1 | 0.82 / 1.2 dB at 50 GHz | measured | LSI-1 / LSI-2 GSG line; p.4 Sec. III.B, Fig. 9 | L/S 0.8/0.8 t 2 (d-L02); 2/2 t 2.3 (e-L02) | line length ("length not given" in row notes), dielectric thickness, Si resistivity |
| ectc51909.2023.00174-a-m1..m4 | 60 / 24.4 / 40 / 34.8 ohm | measured | daisy chain at T0; p.4 Fig. 11 | - | chain lengths; DC only, not a target for the 3 physics |

CoWoS-S (and Si-interposer peers)

| metric_id | value | basis | condition / locator | inputs | missing |
|---|---|---|---|---|---|
| ectc51909.2023.00135-a-m1 / -m2 | -198 um / 153 um | unspecified | 25 C / 250 C, TV1; p.2 Fig. 4 | G: 85 x 85, 1.5x x 2, SoC 27 x 18, HBM 11 x 10, ip 100 um, C4 150, BGA 1.0 mm | M, T, ring size; basis (sim or measured) not stated |
| ectc51909.2023.00135-b-m1..m4 | -250 / 173 um; +27 % / +13 % vs TV1 | unspecified / derived | TV2 floor plan | as above | as above |
| ectc51909.2023.00135-a-m10 / -m11 (+ b-m13/m14) | 0.79 / 1.0 a.u. | simulated | normalized interposer corner stress, interposer 50 vs 100 um; p.4 Fig. 9 | ratio target (insensitive to absolute M) | M, T, mesh |
| ectc51909.2023.00135-a-m13..m16 | 1.15 / 1.10 / 1.0 / 0.98 a.u. | simulated | corner stress vs C4 height 60-90 um; p.4 Fig. 10 | ratio | as above |
| ectc51529.2024.00155-a-m8 / -m9 | -67 um / 71 um | measured | shadow moire, 23 C / 243 C, single-piece CUF + EMC module; p.5 Fig. 8 | **G + M** (Table IV: Si 167 GPa, 3.2 ppm, Cu, ...; p.4), solver MARC, top T 260 C; 120 x 120 mm 8-2-8, ip 42 x 46 x 200 um, ubump 40/20/13, C4 150/75/30+25, SUS430 stiffener 2000 um | stress-free T, BCs; **grade A candidate** |
| ectc51687.2025.00027-a-m1..m9 | 396 - 696 um (30 C), 71 - 516 um (195-200 C) | measured | coplanarity vs stiffener Cu/SUS430 sizes; p.4 Fig. 3(a) | **G + M** (Table IV, stiffener Table III), stress-free T stated (p.4), ip 100 um | BCs detail; **grade A** |
| ectc51687.2025.00027-c-m1..m12 | 1.0 - 0.21 ratio | simulated | normalized warpage at 195 C vs stiffener material/size/thickness; p.4 Fig. 2(c) | same model | - (model-to-model sweep target) |
| ectc51906.2022.00108-a (31 rows) | e.g. 273 / 418 um (Stiff A 0.7 mm, RT / HT) | measured | Samsung MIoS, 85 x 85; p.3-4 Fig. 4-5 | G, adhesive property Table III | full M table; stiffener material props partial |

EMIB-T / EMIB

| metric_id | value | basis | locator | inputs | missing |
|---|---|---|---|---|---|
| ectc51846.2026.00051-d-m1 | 67 % UI at 12 Gb/s | simulated | HBM4e eye; p.4 Fig. 8 | channel length 6 mm (d-e1 reach) | stack-up, line geometry, driver/receiver models; not an IL target |
| ectc.2016.201-c-e1 | 3.5 dB at 10 GHz (80 samples 3.4-3.6; model ~3.8) | measured | p.8 Fig. 10(a) | bridge M1-M4 2/2 um (a-L02) | trace length, dielectric thicknesses |
| ectc.2016.201-c-m1 | NEXT -17 dB (4-7 GHz) | measured | p.8 Fig. 10(b) | as above | as above |
| ectc51687.2025.00061-a-m8..m10 | convex warpage at RT and 80 C; highest stress gradient at EMIB regions (260 C) | simulated (qualitative) | p.3 Fig. 6-8 | 65 x 65 EMIB CHIPS MCP outline | values; qualitative shape check only |
| ectc51846.2026.00134-a-m1 | 64 um at 260 C | measured | glass-core EMIB, no stiffener; p.4 Fig. 7 | glass core | most G and all M |

CoWoS-R (thermal canonical)

| metric_id | value | basis | locator | inputs | missing |
|---|---|---|---|---|---|
| ectc51687.2025.00085-c-m1 / -m5 / -m6 | Rjc 0.0108 C/W; Tj 104.9 C; Tc 84.6 C | measured | 1866 W uniform SoC, inlet 20 C; p.3 Table 2/4 | **G + k** (Table 3 "model geometry and thermal conductivity" p.3 - table body not in the text layer; DB has TIM 86 W/mK, d-m32); orthotropic k from Cu density; In TIM 200 um; contact resistance calibrated | Table 3 cells other than TIM (read from the page render, Q7); cold-plate model |
| ectc51687.2025.00085-d-m3..m11 | Rjc 0.00982 - 0.01082 C/W vs BLT 25-200 um | simulated | p.4 Fig. 8 | same model | model-to-model sweep target |
| ectc51846.2026.00092-a/b/c | TDP 1.37 - 5.9 kW vs flow 1-16 LPM | measured | p.5 Fig. 9-10 | uniform 16 heater groups, DI water 40 C | cold-plate geometry; system-level (coolant) beyond package scope |
| ectc51687.2025.00026-a..f | RT warpage 1 x A ... 2.2 x A; UF1 stress 0.82 - 1 x | measured / simulated (normalized) | p.4-5 Fig. 10-14 | 95 x 97.3 and 110 x 110 mm SBT | absolute values (normalized only), M |

FCBGA baseline / glass / InFO_oS / HBM

| metric_id | value | basis | locator | inputs | missing |
|---|---|---|---|---|---|
| ectc51687.2025.00178-c-m1..m4 | 122 / -47 um (substrate, 25 / 265 C); 439 / -292 um (2-chip, 25 / 265 C) | simulated | stress-free 180 C / 150 C; p.3 Fig. 4, 6 | G (Table 1 design rules), T stated | full M table (1 modulus mention) |
| ectc51687.2025.00178-b-m4..m6 | 166 / -68 um; dynamic 234 um | measured | DIC 30 / 260 C; p.3 Fig. 7-8 | same | same |
| ectc51687.2025.00178-d/e/f | 4 rows each | simulated | 65 x 65 glass-core variants | as -c | as -c |
| ectc51687.2025.00148-b/c-m1..m5 | -126 / 58 um (UF, 50 / 250 C); 73 / -89 um (stiffener) | measured | shadow moire 50-250 C; p.3 Fig. 4, p.4 Fig. 7 | G (60 x 60, layer table 2), M (ABF Table 1 incl. Young's modulus, CTE) | stress-free T, die details |
| tcpmt.2026.3672227-a-m1..m33 | 86.9 - 812 um per process step | measured | 30 C, after each step; p.6 Fig. 13 | G 102 x 102, process sequence, stress-free mention | full M |
| itherm45881.2020.9190542-a-m1..m9 | theta-JC 0.025 - 0.065 C/W | simulated + measured pairs | TIM 3.2-30 W/mK, BLT 60-140 um; p.4 Tables 3-5 | G 62.5 x 62.5, TIM k and BLT, JEDEC theta-JC definition | full geometry stack, other k values |
| ectc51909.2023.00151-a-m1 / -m2 | 20 / 30 um | measured | HBM core chip warpage window at 220 C; p.2 | - | stack geometry details |
| ectc51529.2024.00093-d/e/f-e1 | 0.23 / 0.34 / 0.48 dB at 30 GHz | measured | CPW through TGV; p.4 Fig. 8 | CPW 30 um | glass Dk/Df (check paper) |
| eptc67330.2025.11392620-a-e1..e7 | 0.44 - 1.40 dB/mm at 56 GHz | measured | 1 mm de-embedded GSSG, 7 L/S designs; p.3 Table I | **full stack + Dk/Df** (L01-L17) | Si resistivity (check paper); grade A EM |

### 7.3 Gaps

- No CoWoS-S/L/R or EMIB/EMIB-T paper in the DB gives a modulus/CTE table, a stress-free temperature or BCs. Their
  targets can only be regression (grade B) or ratio targets; grade-A warpage validation comes from the Si-interposer
  peers (ectc51529.2024.00155, ectc51687.2025.00027), FCBGA (ectc51687.2025.00148, ectc51687.2025.00178) and MIoS (ectc51906.2022.00108).
- EMIB-T has no thermal, warpage or IL row. A literature search for EMIB-T warpage/thermal results (outside the
  current cache) is a curation task for the validation tranche (retrieval is not this lane's job).
- Thermal targets are almost all CoWoS-R / InFO_oS (TSMC thermal TVs) - the CoWoS-R thermal case is the thermal
  canonical regardless of family priority.

## 8. Open questions (for Wentao)

1. Canonical first case: run `cowos_l/warpage_rt_ht` against 00091-a/b (TSMC, grade B, materials missing) as the
   flagship, with `si_interposer_peers/120mm_warpage` (ectc51529.2024.00155-a / ectc51687.2025.00027-a, grade A) as the engine-validation case?
2. HBM layout: is `hbm_side: long_edges` (columns flanking each SoC) the right default for SOTA presets, with
   `short_edges` for CoWoS-R-style layouts? Public product floor plans are not available to settle this.
3. HBM4 stack height default: 720 um (DB paper, 12-layer HBM4) or 775 um (secondary JEDEC reports)? And footprint: keep
   11 x 11 mm template until a primary source is found?
4. CoWoS-L bridge count: expose the DB fit `lsi_n = n_hbm + n_soc` as default, or the edge rule (one per HBM-SoC edge +
   one per adjacent SoC pair)?
5. Product presets (B200/B300/Rubin/MI355X/MI455X-class counts) as named presets with `public` status, or keep the
   UI to DB-backed TVs only? Die and interposer sizes for these products are not public and would be template.
6. Warpage definition and sign: papers differ (signed convex/concave at temperature vs coplanarity). Store a per-target
   `scope` (sign convention, surface, method) like the EO targets, and compute both outputs?
7. CoWoS-R 00085 Table 3 is not in the text layer: approve reading it from the page render to fill the thermal case
   inputs (licensed paper, facts + locator only)?
8. Material library scope for v1: generic EMC/UF/ABF/core values need primary datasheets or papers with property
   tables (ectc51529.2024.00155 Table IV, ectc51687.2025.00027 Tables III-IV, ectc51687.2025.00148 Table 1, ectc51906.2022.00108 Table III are in the cache); approve using these
   as `standard_reference` entries with locators?
