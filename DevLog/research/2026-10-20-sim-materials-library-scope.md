---
title: R4 - materials library scope, DB yield and schema proposal for the packaging multiphysics harness
date: 2026-10-20
status: research report (nothing built; no repo file changed except this report)
parent: DevLog/DevLog-010-multiphysics-sim-harness-proposal.md
author: Claude research subagent R4 (at Wentao Jiang's request)
retrieval_date_web: 2026-10-20
---

# R4: materials library scope and schema

Conventions. "Fact" = read by this lane in a cached paper (via the DB row and its locator, or the text layer) or on a
web page / abstract, with locator. "Estimate" = this lane's judgement, labelled. Values are quoted only where a source
and locator exist; everything else is `N/A` or "source only". Paper locators use the PDF page index (`p.N`) as in the
DB `locator` column. Web sources: bibliographic existence checked 2026-10-20 (search engine record, publisher record or
the page itself); "content read" is stated only where the page text was actually read.

## 1. Summary

- Need: 3 physics (EM 1-100 GHz, heat conduction, thermo-elasticity; later viscoelastic EMC/underfill and Anand
  solder) over -55 to 260 C for 13 template material keys. The keys are too coarse: the library needs about 30 tier-1
  material entries (Section 3) mapped onto the 13 keys plus 5-8 derived (homogenized) entries.
- Public primary data exists and is excellent for the elemental/crystalline set: Si (Hall 1967 Cij; Okada-Tokumaru 1984
  and Swenson 1983 CTE(T); Glassbrenner-Slack 1964 k(T); Krupka 2006 microwave eps/tan d), Cu/Au/Ni (NIST JPCRD
  evaluated compilations: Matula 1979 resistivity, Ho-Powell-Liley 1972 k, Ledbetter-Naimon 1974 and Ledbetter-Reed
  1973 elastic constants). Glass vendors publish data sheets (Corning, SCHOTT; AGC partly gated).
- Proprietary or process-dependent classes dominate package warpage: EMC, underfill, ABF/build-up, core laminate,
  solder resist, PI/PBO, adhesives, TIMs, BEOL low-k. For these the realistic default basis is "paper model input"
  (values the authors fed their FE models, often from undisclosed vendor data) plus a few public vendor TDS.
- DB yield (fact): `stack_layers.properties` filled in 313 / 4204 rows from 74 papers (CTE 187 rows / 33 papers,
  modulus 110 / 17, Tg 89 / 15, Dk 56 / 19, Df 43 / 15, k 33 / 9). `metrics.csv`: 106 rows / 25 papers are actual
  material-property values (36 of them one paper: ABF Type-A Dk/Df vs f and T). Text scan of 296 cached papers:
  33 papers carry an explicit material-property table (17 with E + CTE, i.e. FE model input tables; 6 with k; 9 with
  Dk/Df); 12 mention Anand/creep, 15 viscoelastic/Prony (several false hits, see Section 5); 3 cure shrinkage.
- Already in the DB, the same "silicon" is modelled with E = 120, 131, 150, 167, 170 GPa and CTE 2.6-4 ppm/C across
  papers (Section 5.4): the library must carry Si as anisotropic cubic and make the isotropic shortcut explicit.
- Correction to the task brief: "Hopkins 2010" is M. A. Hopcroft, W. D. Nix, T. W. Kenny, "What is the Young's modulus
  of silicon?", JMEMS 19(2), 229-238 (2010), doi 10.1109/JMEMS.2009.2039697.
- Schema (Section 6): copy the eo-modulator-atlas `library` provenance pattern (`value, condition, source_read,
  locator, primary_cited, verification, verified_on`, `alternatives`, `missing`), extended with `model` (isotropic,
  orthotropic, cubic, T-table, bilinear-Tg, Prony+WLF, Anand, bilinear plasticity), explicit CTE kind
  (secant + T_ref vs instantaneous), frequency tables for Dk/Df, SI storage, and `derived` entries with formula.

### Effort estimate (estimate; basis in Section 7)

| Tier | Content | Entries (est.) | Agent-hours (est.) | Wall clock at 7 parallel agents (est.) |
|---|---|---|---|---|
| T0 MVP | 12 materials, constant isotropic E, nu, CTE, k, eps, tan d, sigma; paper-model-input basis from DB rows already extracted | ~90 | 6-10 | half a day |
| T1 | ~30 materials, T-dependent where it matters (Si CTE/k, Cu sigma/k/CTE, polymer bilinear Tg, glass CTE), Dk/Df vs f, Si cubic Cij, HR-Si sigma; 5-8 derived entries; 2 audits | ~300 property entries, ~60 T- or f-tables | 35-60 | 1-2 days |
| T2 | viscoelastic EMC/UF (Prony + WLF/shift), Anand SAC305 + SnAg, Cu bilinear/multilinear plasticity, cure shrinkage, polymer creep optional | 8-12 parameter sets | 25-45 (+ user download of ~10-15 paywalled papers) | 1-2 days after downloads |

Main risks: proprietary values (EMC, UF, ABF, core), secant vs instantaneous CTE ambiguity, Tg definition (DMA tan d
peak vs TMA onset vs DSC) and above-Tg handling, Si orientation, NIST cryogenic fits ending at 300 K, image-only tables
(text layer missing) in several papers. Details in Section 8.

## 2. Physics requirements per property

| Physics | Required per material | Optional / tier-2 |
|---|---|---|
| EM (FEM, 1-100 GHz, regional) | eps_r(f[,T]), tan d(f[,T]) for dielectrics; sigma(T) for conductors; Si: eps_r + resistivity (HR-Si vs standard) | causal fit params (wideband Debye / Djordjevic-Sarkar) as derived; Cu surface roughness (Huray params) is a geometry/process input, not a bulk property |
| Heat conduction | k (iso or k_xy/k_z), k(T) for Si and Cu; rho, cp for transients | contact/interface resistance (TIM BLT-dependent) as interface entries |
| Thermo-elasticity (warpage, stress) | E or Cij, nu, CTE(T) with explicit kind; Tg with E1/E2 and CTE1/CTE2 for polymers; rho (gravity, rarely needed) | stress-free / reference temperature is a process step property (config), not a material property |
| Viscoelastic (T2) | Prony series (E_inf, g_i, tau_i) at T_ref; shift function (WLF C1, C2 or Arrhenius); cure shrinkage (vol %) and degree-of-cure dependence | cure kinetics (Kamal), moisture swelling (CME) |
| Viscoplastic solder (T2) | Anand 9 parameters (s0, Q/R, A, xi, m, h0, s_hat, n, a) + E(T), nu, CTE | Garofalo creep alternative; IMC elastic props |
| Plasticity (T2) | Cu yield + tangent modulus (bilinear) or multilinear stress-strain(T) | Ni, Al pad plasticity |

Temperature span: -55 C (TC condition B lower bound) to 260 C (Pb-free reflow peak); cure/mold steps reach 150-200 C.
Note: NIST cryogenic fits (Cu, 304 SS) end at 300 K (fact: trc.nist.gov OFHC copper page, read 2026-10-20: k for
RRR 50-500, cp and linear expansion, 4-300 K, stated fit error 1-2 % for k, 5 % for expansion at T >= 50 K). They
cover the -55 to 27 C part only.

## 3. Property matrix

Columns: physics (EM / TH / TM / VE / VP); T-dependence needed over -55..260 C (Y = matters, y = weak, N = not
needed); value range = DB paper-model inputs with locator where available, else N/A; proprietary = typical
availability (open / vendor TDS / proprietary / process-dependent).

### 3.1 Semiconductors and inorganics

| Material (key -> template key) | Property | Physics | T-dep | Values in hand (source, locator) | Availability |
|---|---|---|---|---|---|
| si_crystal -> silicon | C11, C12, C44 (cubic), orientation (wafer (100), flat <110>) in config | TM | y | N/A in this lane (Hall 1967 not read; a secondary SFU note quotes Hall RT values, not used) | open, primary |
| si_crystal | E, nu isotropic shortcut (direction-dependent) | TM | y | paper inputs: 167 GPa (ectc51529.2024.00155 p.3 Table IV; ectc51687.2025.00027 p.3 Table IV), 150 (ectc.2011.5898527 p.2 Table 2), 131 + nu 0.3 (tcpmt.2025.3614186 p.6 Table II), 120 (ectc51909.2023.00175 p.3 Sec. III.C), 170 (ectc51909.2023.00155 p.3 Table 8); Hopcroft 2010 abstract: E spans 130-188 GPa with orientation | open |
| si_crystal | CTE(T) instantaneous | TM | Y | paper inputs 2.6 ppm/K (001c.129513 p.2 Sec. II), 2.8 (tcpmt.2025.3614186 p.6 Table II), 3 (ectc.2011.5898527 p.2 Table 2), 3.2 (ectc51529.2024.00155 p.3 Table IV), ~4 (ectc51909.2023.00135 p.4 Table II) | open, primary |
| si_crystal | k(T) | TH | Y | model form k = 117.5 - 0.42 (T[C] - 100) W/mK (ectc51687.2025.00085 p.3 Table 3) | open, primary |
| si_crystal | rho, cp | TH | y | N/A | open |
| si_crystal / si_hr -> silicon | eps_r, tan d(rho, f, T), resistivity | EM | Y (free-carrier loss rises with T in HR-Si per Krupka 2006 abstract) | N/A | open (Krupka); resistivity is a wafer spec |
| sio2_beol / sio2_thermal -> oxide | E, nu, CTE, eps_r, tan d, k | TM, EM, TH | y | glass/silica category: fused silica CTE 0.5e-6/K, E 72 GPa, Dk 3.8 (001c.74577 p.3 Table I) | open bulk; film is process-dependent |
| sin_pecvd -> oxide/other | E, nu, CTE, residual stress, eps_r | TM, EM | N | PECVD inorganic TGV liner: CTE 2.7 ppm/K, E 81.1 GPa (ectc51846.2026.00074 p.3 Table II); passivation CTE 5.5e-7 1/C, E 75 GPa, nu 0.3 (tcpmt.2025.3614186 p.6 Table II, layer not named as SiN) | process-dependent |
| low_k_beol -> oxide/other | E (effective BEOL stack), CTE, eps_r | TM, EM | N | N/A | proprietary (foundry); use derived BEOL effective entry |
| aln_film (ceramic, optional) | k (cross-plane, in-plane) | TH | y | sputtered AlN 150 / 60 W/mK, drop-cast 10 W/mK (ectc51846.2026.00065 p.4 Table I) | paper |

### 3.2 Metals

| Material | Property | Physics | T-dep | Values in hand (source, locator) | Availability |
|---|---|---|---|---|---|
| cu_bulk_annealed (lid, stiffener, thick planes) -> copper | sigma(T) | EM, TH (Joule) | Y (roughly linear in T) | N/A (Matula 1979 Cu table not read in this lane) | open, primary |
| cu_bulk_annealed | k(T) | TH | y | N/A | open, primary (Ho-Powell-Liley 1972) |
| cu_bulk_annealed | E, nu (polycrystal), Cij | TM | y | N/A | open, primary (Ledbetter-Naimon 1974) |
| cu_bulk_annealed | CTE(T) | TM | y | paper inputs 16.5 ppm/C (eptc59621.2023.10457909 p.1 Table 1; eptc67330.2025.11392176 p.2 Table I), 17 (ectc.2011.5898527 p.2 Table 2; ectc51909.2023.00155 p.3 Table 8) | open (NIST cryo fit to 300 K only) |
| cu_electroplated (RDL, TSV, pillar, build-up) -> copper | E, yield, tangent modulus, CTE, sigma | TM, EM | Y (anneal/grain growth) | paper inputs E 100 GPa (ectc51909.2023.00155 p.3 Table 8), 130 GPa TSV Cu (ectc.2011.5898527 p.2 Table 2); Cu yield + tangent modulus present in ectc51846.2026.00103 p.4 Table II (values not transcribed here); Cu-Cu anneal expansion metrics in DB | process-dependent; few open primary (Read et al. 2004, NIST) |
| ni_ubm -> other | E, nu, CTE, sigma, k | TM, EM | y | N/A | open (Ledbetter-Reed 1973 elastic; resistivity N/A this lane) |
| au_finish -> other | sigma | EM | y | EO library already carries gold_bulk_293k sigma from Matula 1979 Table 5 p.1209 (sibling repo) | open |
| ti_seed, al_pad | sigma, E, CTE | EM, TM | N | N/A | open; thin, often negligible mechanically |
| ss304 / sus (stiffener) -> stainless_steel | E, nu, CTE(T), k | TM, TH | y | DB row eptc67330.2025.11392176 p.3 Table II "stainless steel" E 1.9 GPa, Tg 65-75 C, CTE 31.2 ppm/C: inconsistent with a steel (looks like an adhesive/coverlay column); flag for extraction audit | open below 300 K (NIST); above RT N/A found |
| lid_cu_ni (Ni-plated Cu lid) -> copper | as cu_bulk_annealed | TM, TH | y | lid/stiffener CTE 17 ppm/C (001c.147115, DB row) | open |

### 3.3 Solders and interconnect alloys

| Material | Property | Physics | T-dep | Values in hand | Availability |
|---|---|---|---|---|---|
| sac305 -> solder | E(T), nu, CTE | TM | Y (strong) | paper input "solder" E 37.4 GPa (ectc51529.2024.00155 p.3 Table IV; ectc51687.2025.00027 p.3 Table IV; alloy not named in the table) | open (NIST lead-free DB) |
| sac305 | Anand 9 params | VP | Y (built in) | tcpmt.2025.3614186 p.7 Table III (SAC305 and Sn-Ag eutectic, from its ref [24] Zhang et al.); table body not in the text layer (image), needs page render | open papers, partly paywalled |
| snag (microbump) -> solder | E(T), CTE, Anand | TM, VP | Y | same Table III (Sn-Ag eutectic) | open papers |
| sigma, k of solders | sigma, k | EM, TH | y | N/A | open (NIST DB) |
| imc_cu6sn5 / cu3sn | E, CTE | TM | N | tcpmt.2025.3614186 models IMCs as elastic-plastic (p.6 Sec. III.B) | papers |

### 3.4 Polymers, composites, encapsulants

| Material | Property | Physics | T-dep | Values in hand (source, locator) | Availability |
|---|---|---|---|---|---|
| underfill_cuf -> underfill | Tg, E1/E2, CTE1/CTE2, nu, k | TM, TH | Y (Tg step) | CUF E 6.6 GPa, CTE 22/100, Tg 166 C and E 6.9, CTE 20/93, Tg 160 (ectc51529.2024.00155 p.3 Table IV); E 9.4 GPa (-50 to 83 C) to 0.08 GPa (93-250 C), CTE 3.1e-5 to 1.19e-4 1/C (tcpmt.2025.3614186 p.6 Table II); CUF Tg 160, E1 8.9 / E2 0.1 GPa, CTE 26/104 (ectc51909.2023.00155 p.3 Table 8); CUF / LCMUF filler, Tg, CTE1, E (ectc51529.2024.00322 p.4 Table VI); NCP vs CUF (ectc51906.2022.00106 p.2 Table I) | proprietary; some vendor TDS (Henkel UF 8830S TDS located, not read) |
| underfill viscoelastic | Prony + shift | VE | Y | N/A | proprietary; papers |
| muf_lmc -> mold_compound/underfill | Tg, E, CTE1/2 | TM | Y | LMC A/B/C Tg 186/182/152 C, CTE1 5/5/8, CTE2 18/16/21 ppm/C, E 15/25/12.5 GPa at RT (ectc51909.2023.00151 p.2 Table I) | proprietary |
| emc -> mold_compound | Tg, E1/E2, CTE1/2, nu, k, cure shrinkage | TM, TH | Y | EMC E 13 GPa, CTE 7/25, Tg 160 C (ectc51529.2024.00155 p.3 Table IV); E 13, CTE 10/46, Tg 174 (ectc51687.2025.00027 p.3 Table IV); granular EMC Tg 140, E1 18 / E2 0.4 GPa, CTE 7/25, cure shrinkage 0.16 % (ectc51909.2023.00155 p.3 Table 8, p.6 Table 10); EMC A/B/C Tg 145-175, CTE 7-12 / 22-46, E 19 / 1.6 GPa (ectc51909.2023.00175 p.3 Table 2); granular/liquid/sheet EMC (ectc32862.2020.00185 p.3 Table 2); EMC A/B/C CTE1, Tg, G' (001c.129513 p.4 Table 1) | proprietary |
| emc viscoelastic | Prony + WLF, cure shrinkage vs degree of cure | VE | Y | N/A (Sadeghinia et al. 2012 measures storage modulus master curves and cure shrinkage of an EMC; not read) | proprietary; few open papers |
| abf_gl (GL102 class) -> organic_build_up | CTE1/CTE2 (xy), Tg, E, nu, Dk/Df(f) | TM, EM | Y | ABF-GL CTE xy 20 (25-150 C) / 49 (150-240 C) ppm/C, Tg 171 C (DMA), E 13 GPa (ectc51687.2025.00148 p.2 Table I); ABF GL used as dielectric with CTE below/above a T threshold (ectc51846.2026.00103 p.4 Table II) | vendor brochure (public URL dead 2026-10-20) + papers |
| abf_gx92 -> organic_build_up | same | TM, EM | Y | ABF-GX CTE xy 39 (25-150 C) / 117 (150-240 C), Tg 168 C (DMA), E 5.0 GPa (ectc51687.2025.00148 p.2 Table I); GX92P Dk 3.2, Df 0.017 at 5.8 GHz (tcpmt.2025.3610036 p.4 Table II) | vendor + papers |
| abf_gz41 | same | TM, EM | Y | N/A in DB | vendor brochure only |
| abf_type_a (new low-loss) | Dk, Df vs f (16.5-216 GHz) and T (25-115 C) | EM | Y | Dk 3.406-3.532, Df 0.00203-0.0101 (ectc51846.2026.00389 p.5 Table I; 36 metrics rows). Text layer prints "25 C" as "250C" (degree glyph read as 0): verify temperatures against the page render | paper (measured) |
| pid_lowloss (JSR GT-N01 etc.) -> polymer_dielectric | Dk/Df, CTE, E | EM, TM | y | GT-N01 Dk 2.8, Df < 0.005 at 10 GHz (tcpmt.2025.3610036 p.4 Table II); PID E 3.5 GPa, Tg 200 C, CTE 60-70, Dk 2.9 at 25 GHz (eptc67330.2025.11392176 p.2 Table I) | vendor + papers |
| polyimide (HD-4100 class), PBO -> polymer_dielectric | E, nu, CTE, Tg, Dk/Df, k | TM, EM, TH | y | JSR5100 E 2.5 GPa, nu 0.35, CTE 54 ppm/C (tcpmt.2025.3538554 p.7 Table IV, its ref [22]); PI CTE 180-210 ppm/C, E 2.2-3.0 GPa as FO-PLP sweep input (eptc59621.2023.10457909 p.1 Table 1); BCB / polyimide / parylene-N / ABF GL comparison (ectc51529.2024.00392 p.3 Table II) | vendor TDS (HD-4100 bulletin not found publicly) |
| bcb (Cyclotene 3000/4000, XP80) -> polymer_dielectric | E, CTE, Tg, Dk/Df | TM, EM | y | XP80 vs Cyclotene 4000 property comparison (3dic63395.2024.10830178 Table I, p. not resolved); DuPont 4000-series data sheet located (Kayaku), not read | vendor TDS public |
| solder_resist -> polymer_dielectric | E, CTE1/2, Tg | TM | Y | SR row in ectc51529.2024.00155 p.3 Table IV | proprietary |
| core_gfrp_bt (BT, low-CTE glass-fabric cores) -> organic_laminate | CTE xy / z (orthotropic), E xy(T), Tg, Dk/Df | TM, EM | Y | GFRP cores A-D: Tg 260-280 C (DMA), CTE 5.5-10.6 ppm/K (TMA 20-220 C), E 28-33 GPa at 25 C, 18-29 GPa at 220 C (ectc51529.2024.00265 p.3 Table II); core E 33 GPa, CTE 6.9 / 0.1, Tg 293 C (ectc51687.2025.00027 p.3 Table IV); substrate core E 18.9 GPa, CTE x,y 11, z 16 (ectc.2011.5898527 p.2 Table 2) | vendor TDS (MGC HL832NS not found publicly; Resonac/Panasonic cores appear in DB) |
| prepreg (high-speed) | Dk/Df vs f | EM | y | Prepreg A Dk 4.0/4.0/3.7, Df 0.012/0.012/0.013 at 1/10/50 GHz; Prepreg B Dk 3.2, Df 0.002/0.003/0.0046 (ectc51909.2023.00021 p.2 Table I) | vendor |
| fr4_pcb (board for BLR) -> organic_laminate | CTE, E | TM | y | FR-4 CTE 17 ppm/C (tcpmt.2025.3614186 p.3 Sec. II.D) | generic |
| adhesive_lid / daf / tbm -> other | E(T), CTE, Tg | TM | Y | adhesive relative modulus at 25 / 250 C (DB metrics, 3 rows each); adhesive material table (ectc51906.2022.00108 p.4) | proprietary |
| tim_indium -> tim | k, E, CTE, yield (soft) | TH, TM | y | indium TIM (DB stack row exists, no values) | vendor (Indium Corp app note located, not read) |
| tim_polymer (gel, grease, PCM) -> tim | k, E (very low) | TH | N | gel TIM k 3.2 / 6.0 W/mK, film 25 / 30 W/mK variants (itherm45881.2020.9190542 p.2 Table 2, p.3); TIM1 E 5.8e-3 GPa (ectc.2011.5898527 p.2 Table 2) | vendor |
| tim_graphite -> tim | k_z, k_xy (anisotropic), E | TH | N | graphite film TIM bulk k > 20 W/mK through thickness (ectc51687.2025.00085 p.2 Table 1) | vendor |
| sinter_glue | k | TH | N | NAMICS H9890-7 up to 140 W/mK, data sheet (DB stack row) | vendor |

### 3.5 Glass

| Material | Property | Physics | T-dep | Values in hand (source, locator) | Availability |
|---|---|---|---|---|---|
| glass_alkali_free (EAGLE XG, EN-A1, AF 32 class) -> glass | CTE (range-stated secant), E, nu, k, eps_r, tan d(f) | TM, EM, TH | y | AGC EN-A1 instantaneous CTE 3.8 ppm/C, E 77 GPa, nu 0.22 (ectc51846.2026.00103 p.4 Table II); Glass A/B/C CTE 3.25 / 3.17 / 8.60 ppm/K, E 64.0 / 73.6 / 71.6 GPa (ectc51529.2024.00321 p.2 Fig. 4); alkali-free CTE 3.2-8.7e-6/K, E 74 GPa, Dk 7.3 (001c.74577 p.3 Table I); Corning glass CTE 3.4 ppm/C (tcpmt.2025.3614186 p.2 Table I) | vendor TDS public (Corning, SCHOTT); AGC partly gated |
| glass_borosilicate (Borofloat 33) | same | same | y | DB stack rows (borofloat 33, 4 rows) | vendor public |
| glass_fused_silica | same | same | N | 001c.74577 p.3 Table I | vendor public |
| glass_alkali_rich / soda | same | same | N | soda glass CTE 9.2 ppm/K (ectc51846.2026.00153 p.2 Sec. III.A) | generic |

## 4. Candidate primary sources per material (verified existence 2026-10-20)

Status codes: B = bibliographic record verified (publisher/APS/IEEE/NIST record or reprint URL), content not read;
R = page content read by this lane (what was read is stated); L = located (URL found) but not readable by the fetch
tool or gated; X = searched, not found publicly.

| Material | Source | Locator / content | Status |
|---|---|---|---|
| Si | M. A. Hopcroft, W. D. Nix, T. W. Kenny, "What is the Young's modulus of silicon?", J. Microelectromech. Syst. 19(2), 229-238 (2010), doi 10.1109/JMEMS.2009.2039697 | abstract: E 130-188 GPa depending on orientation; full text has Cij and orientation formulas (not read) | B |
| Si | J. J. Hall, "Electronic effects in the elastic constants of n-type silicon", Phys. Rev. 161, 756 (1967), doi 10.1103/PhysRev.161.756 | second-order constants vs T, pure and P-doped Si (APS abstract) | B |
| Si | Y. Okada, Y. Tokumaru, J. Appl. Phys. 56, 314-320 (1984), doi 10.1063/1.333965 | empirical alpha(T) fit, 120-1500 K (abstract) | B |
| Si | C. A. Swenson, "Recommended values for the thermal expansivity of silicon from 0 to 1000 K", J. Phys. Chem. Ref. Data 12, 179-182 (1983), doi 10.1063/1.555681, https://srd.nist.gov/jpcrdreprint/1.555681.pdf | evaluated compilation | L (NIST reprint fetched; text layer not extractable by the tool; read with a PDF renderer later) |
| Si | C. J. Glassbrenner, G. A. Slack, Phys. Rev. 134, A1058 (1964), doi 10.1103/PhysRev.134.A1058 | k, 3-1580 K, +-5 % (APS abstract) | B |
| Si (EM) | J. Krupka et al., "Measurements of permittivity, dielectric loss tangent, and resistivity of float-zone silicon at microwave frequencies", IEEE TMTT 54(11), 3995-4001 (2006), doi 10.1109/TMTT.2006.883655 | 10-400 K, eps frequency independent, loss conductivity-dominated (abstract) | B |
| HR-Si | Okmetic RFSi high-resistivity wafers, https://okmetic.com/silicon-wafers/rfsi-wafers-high-resistivity-line-for-rf/high-resistivity-wafers | vendor page lists silicon interposers as a target application; resistivity "up to > 7,000 Ohm-cm" (search snippet, not read) | L |
| Cu, Au | R. A. Matula, "Electrical resistivity of copper, gold, palladium, and silver", J. Phys. Chem. Ref. Data 8, 1147 (1979), doi 10.1063/1.555614, https://srd.nist.gov/jpcrdreprint/1.555614.pdf | recommended rho(T); already used for Au in eo-modulator-atlas (Table 5 p.1209) | B (Cu table not read) |
| Cu (and others) | C. Y. Ho, R. W. Powell, P. E. Liley, "Thermal conductivity of the elements", J. Phys. Chem. Ref. Data 1, 279 (1972), doi 10.1063/1.3253100, https://srd.nist.gov/jpcrdreprint/1.3253100.pdf | recommended k tables | B |
| Cu | H. M. Ledbetter, E. R. Naimon, "Elastic properties of metals and alloys. II. Copper", J. Phys. Chem. Ref. Data 3, 897-935 (1974), doi 10.1063/1.3253150, https://srd.nist.gov/jpcrdreprint/1.3253150.pdf | polycrystal E, G, B, nu; single-crystal Cij; T dependence | B |
| Ni | H. M. Ledbetter, R. P. Reed, "Elastic properties of metals and alloys, I. Iron, nickel, and iron-nickel alloys", J. Phys. Chem. Ref. Data 2, 531 (1973) | companion of the Cu paper (named in its record) | B (DOI not checked) |
| Cu (cryo) | NIST cryogenic materials, OFHC copper, https://trc.nist.gov/cryogenics/materials/OFHC%20Copper/OFHC_Copper_rev1.htm | k(RRR), cp, expansion; 4-300 K | R (coverage and fit errors only) |
| Cu electroplated | D. T. Read, Y. W. Cheng, R. Geiss, "Morphology, microstructure, and mechanical properties of a copper electrodeposit", Microelectron. Eng. 75 (2004) | NIST work on electrodeposited Cu | B (pages not confirmed) |
| SS 304 | NIST 2000 cryogenic material properties database, https://trc.nist.gov/cryogenics/Papers/Material_Properties/2000-Cryogenic_Material_Properties_Database.pdf ; NBSIR 80-1627 (elastic constants of 304/310/316, 4-295 K), https://nvlpubs.nist.gov/nistpubs/Legacy/IR/nbsir80-1627.pdf | below 300 K only | B |
| SS 304 above RT | none found in this lane | - | X |
| Solders | NIST, "Database for solder properties with emphasis on new lead-free solders", release 4.0 (2002), https://www.msed.nist.gov/solder/NIST_LeadfreeSolder_v4.pdf ; catalog https://www.nist.gov/node/715981 | compiled properties of lead-free solders | B |
| Anand model | L. Anand, "Constitutive equations for hot-working of metals", Int. J. Plasticity 1(3), 213-231 (1985), doi 10.1016/0749-6419(85)90004-X | model form | B |
| SAC305 Anand | M. Motalab, Z. Cai, J. C. Suhling, P. Lall, "Determination of Anand constants for SAC solders using stress-strain or creep data", ITherm 2012, https://ieeexplore.ieee.org/abstract/document/6231522 | SAC305 constants from stress-strain (3 rates, 5 T) and creep (abstract) | B |
| Solder Anand | Z. N. Cheng, G. Z. Wang, L. Chen, J. Wilde, K. Becker, "Viscoplastic Anand model for solder alloys and its application", Soldering & Surface Mount Technology (2000), doi 10.1108/09540910010331428 | Anand fits for several solders | B |
| Solder Anand (in repo) | tcpmt.2025.3614186 | p.7 Table III, SAC305 + Sn-Ag eutectic, citing Zhang et al. [24] | R (caption; body is an image) |
| EMC | M. Sadeghinia, K. M. B. Jansen, L. J. Ernst, "Characterization and modeling the thermo-mechanical cure-dependent properties of epoxy molding compound", Int. J. Adhes. Adhes. 32, 82-88 (2012) | cure kinetics, CTE, cure shrinkage, storage modulus master curves (abstract); DOI 10.1016/j.ijadhadh.2011.10.007 inferred from a repository URL, confirm | B |
| Underfill | Henkel LOCTITE ECCOBOND UF 8830S TDS, https://datasheets.tdx.henkel.com/LOCTITE-ECCOBOND-UF-8830S-en_GL.pdf | Tg, CTE1/2, modulus (per search snippet of Henkel regional pages; not read) | L |
| ABF | Ajinomoto Fine-Techno product brochure (OFC 2021 exhibitor PDF) | GX92 / GX-T31 / GZ41 / GL CTE, Tg, Dk/Df at 5.8 GHz per search snippet; URL returned 404 on 2026-10-20 | L (dead link) |
| ABF | Ajinomoto ECTC 2019 presentation, https://www.ectc.net/files/69/ECTC2019 Presentation material_Ajinomoto.pdf ; ECTC 2013 Narahashi (Ajinomoto) web PDF on ectc.net | ABF family chemistry and loss ranking (snippet) | L |
| BCB | DuPont CYCLOTENE 4000 Series data sheet (Kayaku AM), https://kayakuam.com/wp-content/uploads/2024/05/888_00008_DuPont_Cyclotene_4000_Series_DS3000.pdf ; CYCLOTENE 3000 processing procedures rev A, https://wiki.nanofab.ucsb.edu/w/images/7/72/BCB-cyclotene-3000-revA.pdf | Dk/Df, CTE, Tg, tensile modulus | L |
| PI (HD-4100), PBO (HD-8820) | HD MicroSystems product bulletins | - | X (only a PI2525 third-party mirror found; not used) |
| Core BT | Mitsubishi Gas Chemical HL832NS TDS | - | X |
| Glass | Corning EAGLE XG PI sheet, https://www.corning.com/media/worldwide/cdt/documents/EAGLE_XG_Glass_PI_Sheet.pdf and 2021 version under corning.com/media/cn/cdt/documents/ | CTE (0-300 C), E, G, nu per search snippets | L (HTTP 403 to the fetch tool) |
| Glass | SCHOTT AF 32 eco technical details, https://www.schott.com/en-gb/products/af-32-eco/technical-details ; downloads page lists thin-glass and electrical-properties data sheets | values only in chart images | R (page text read: no numbers in text) |
| Glass | AGC EN-A1 data sheet (photonicsonline.com, gated) ; https://agcem.com/?p=423 | CTE 38e-7 per snippet | L |
| SiO2 / SiN films | J. M. Grow, R. A. Levy, J. Mater. Res. 9, 2072 (1994), doi 10.1557/JMR.1994.2072 | nanoindentation of CVD ceramic films | B |
| Low-k | none found in this lane | - | X |
| Indium | Indium Corporation, "Physical Constants of Pure Indium", https://documents.indium.com/qdynamo/download.php?docid=358 | k, CTE, modulus (snippet; two Indium Corp documents disagree on CTE per snippet) | L |
| Graphite TIM | Panasonic PGS (EYG) data | distributor listings only; in-plane vs through-plane split not found | X |
| CTE test methods | ASTM E831 (TMA, "technical" coefficient), ASTM E228 (push-rod dilatometer) | definitions of mean vs instantaneous; paywalled standards | B |

Download list for the user (subscription access; retrieval is not this lane's job): Hopcroft 2010, Hall 1967,
Okada-Tokumaru 1984, Glassbrenner-Slack 1964, Krupka 2006, Motalab 2012, Sadeghinia 2012, Read 2004, and the source
[24] of tcpmt.2025.3614186 (Zhang et al., Anand model and FEM). NIST JPCRD reprints are open (srd.nist.gov).

## 5. DB yield

### 5.1 `stack_layers.properties` (query 2026-10-20, read-only)

| Measure | Count |
|---|---|
| rows / rows with properties | 4204 / 313 |
| papers with any property row | 74 |
| rows (papers) mentioning CTE | 187 (33) |
| modulus / E | 110 (17) |
| Tg | 89 (15) |
| Dk / permittivity | 56 (19) |
| Df / loss tangent | 43 (15) |
| thermal conductivity | 33 (9) |
| Poisson | 6 (1) |
| by material_class | dielectric_polymer 92, organic_laminate 34, mold_compound 33, underfill 27, glass 26, silicon 25, metal 17, dielectric_inorganic 16, unspecified 15, ceramic 9, tim 8, other 8, adhesive 2, solder 1 |

Pattern matching is keyword based (CTE also matches "ppm"); counts are upper bounds, not audited.
Material variety (distinct `material` strings): dielectric_polymer 174, metal 266, glass 49, organic_laminate 50,
adhesive 48, mold_compound 46, underfill 45, solder 28, tim 17. This is the alias table the library mapping must absorb.

### 5.2 `metrics.csv`

- 7511 rows. Rows whose parameter or variant mentions a material property: CTE 163 (50 papers), Tg 33 (3), k 24 (7),
  Dk 23 (2), Df 23 (5), modulus 21 (8). Most are sweep variants of warpage/stress results, not property values.
- Rows that are material-property values: 106 rows from 25 papers. Largest: ABF Type-A Dk 18 + Df 18 rows
  (ectc51846.2026.00389); thermal conductivity / effective k 20; adhesive relative modulus 25 / 250 C 6; resistivity
  and RRR about 12; DLSSI equivalent E, nu, CTE 3 (tcpmt.2025.3538554).

### 5.3 Cached full text (296 `references/*/text.md`, local only)

| Signal | Papers |
|---|---|
| explicit material-property table (caption heuristic + >= 2 property keywords in the next 30 lines) | 33 |
| of which E + CTE (FE model input type) | 17 |
| with thermal conductivity column | 6 |
| with Dk/Df column | 9 |
| CTE mentioned at all / >= 3 times | 132 / 74 |
| Young's/elastic modulus or GPa >= 1 / >= 3 | 27 / 7 |
| Tg >= 1 | 28 |
| Poisson | 4 |
| Anand or creep | 12 |
| viscoelastic / Prony / WLF / shift factor | 15 (includes false hits from 4 papers whose text layer is font-shifted: ectc51909.2023.00048, ectc51909.2023.00155, vlsitechnologyandcir46783.2024.10631441, vlsitechnologyandcir46783.2024.10631478) |
| cure / chemical shrinkage | 3 (ectc51846.2026.00012, ectc51846.2026.00199, eptc59621.2023.10457652) |

Papers with an FE-input-type table (E + CTE) are 17 / 296 (about 6 %) of the corpus; the other warpage papers in
the corpus report results without a full input table (not individually checked).

### 5.4 Richest papers for extraction (fact: table exists at locator; columns from the table header)

| # | paper_id | Locator | Materials / columns | Already in DB |
|---|---|---|---|---|
| 1 | ectc51529.2024.00155 | p.3 Table IV "Material properties used in simulation" | Si, Cu, solder, solder resist, dielectric, EMC, CUF, core...; E, CTE1, CTE2, Tg | yes (24 rows) |
| 2 | ectc51687.2025.00027 | p.3 Table IV; p.3 stiffener table | same layout as #1 (same group) + core, stiffener | yes (8) |
| 3 | ectc51846.2026.00103 | p.4 Table II | AGC EN-A1 glass, ABF GL dielectric (CTE below/above T), Cu with yield strength and tangent modulus; instantaneous CTE stated | no |
| 4 | tcpmt.2025.3614186 | p.6 Table II; p.7 Table III | full glass-package BLR model: Si (E, G, nu), passivation, UF E(T) step, SAC305 / Sn-Ag Anand, IMC, Cu plastic | yes (11), Anand not |
| 5 | ectc51909.2023.00155 | p.3 Table 8; p.6 Table 10 | EMC E1/E2, CTE1/2, Tg, cure shrinkage; CUF; Si; Cu (text layer font-shifted; DB rows exist) | yes (13) |
| 6 | ectc51529.2024.00265 | p.3 Table II | 4 GFRP cores + motherboard: Tg, CTE, E at 25 / 220 C | yes (4) |
| 7 | ectc.2011.5898527 | p.2 Table 2 | substrate core (orthotropic CTE x,y / z), Si, Cu, uBump UF, C4 UF, TIM1, lid; Anand cited | yes (8) |
| 8 | ectc51687.2025.00148 | p.2 Table I | ABF GL / GX / others: CTE1/2, Tg, E, TS, elongation | yes (12) |
| 9 | ectc51909.2023.00151 | p.2 Table I | LMC A/B/C: Tg, CTE1/2, E | yes (4) |
| 10 | ectc51909.2023.00175 | p.3 Table 2 | EMC A/B/C: Tg, CTE1/2, E below / above Tg | yes (3) |
| 11 | ectc51846.2026.00389 | p.5 Table I | ABF Type-A Dk/Df 16.5-216 GHz x 25-115 C | yes (4 + 36 metrics) |
| 12 | ectc51687.2025.00085 | p.2 Table 1; p.3 Table 3 | TIM k; Si k(T) model; orthotropic k of routing layers from Cu density | yes (15) |
| 13 | tcpmt.2025.3538554 | p.7 Table IV | E, nu, CTE and volume of each layer in a stacked Si interposer + homogenized result | partly (1) |
| 14 | ectc51846.2026.00074 | p.3 Tables I, II | glass core, polymer and inorganic TGV liners (E, CTE), Poisson | yes (4) |
| 15 | ectc51529.2024.00321 | p.3 Table I; p.2 Fig. 4 | EMC for warpage simulation; glass A/B/C E, CTE | yes (4) |
| 16 | 001c.74577 | p.3 Table I | fused silica, alkali-free, alkali-rich glass, Si: CTE, E, rho, Dk | no |
| 17 | ectc51529.2024.00392 | p.3 Table II | BCB, PI HD-series, parylene-N, ABF GL with cited sources | no |
| 18 | eptc67330.2025.11392176 | p.2 Table I; p.3 Table II | coverlay, PIC, PID, Cu, stiffener: E, Tg, CTE, Dk/Df | yes (13; stiffener row suspect) |
| 19 | ectc51906.2022.00106 | p.2 Table I | NCP A-C vs CUF: Tg (DMA), CTE, modulus, filler | no |
| 20 | ectc51846.2026.00243 | p.2 Table I | CVD diamond, Cu and other thermal materials: k, resistivity, Dk, tan d | no |

Further tables with fewer columns: ectc51529.2024.00322 p.4 Tables V-VI, ectc32862.2020.00185 p.3 Table 2, 001c.129513
p.4 Table 1, tcpmt.2025.3610036 p.4 Table II, ectc51909.2023.00021 p.2 Table I, ectc51529.2024.00133 p.2 Table I,
itherm45881.2020.9190542 p.2 Table 2, ectc51846.2026.00065 p.4 Table I, ectc51906.2022.00108 p.3-4 Tables II and
adhesive table, estc60143.2024.10712019 Table I (R-1566S core), 3dic63395.2024.10830178 Table I.

Extraction sizing (estimate): 20 rich tables x 20-30 min (read page render, transcribe with locator, units, condition,
secant/tangent note) = 7-10 agent-hours; the 12 smaller tables 3-4 h. About 60 % of the rich tables already have DB
rows; their transfer to the library is mostly a mapping job, but the DB `properties` text must be re-read at source for
conditions (CTE range, Tg method) that the free text often drops.

## 6. Library schema proposal

File: `engine/data/materials.yaml` (or `.json`, matching the EO repo), schema id `packaging-atlas.materials/v1`.
Storage in SI (Pa, 1/K, W/(m K), S/m, kg/m^3, J/(kg K), s, K or C stated per field); display units are a UI concern.
Pattern copied from eo-modulator-atlas `engine/data/materials.json` (`library`, `library_schema`, `missing`,
`formulas`, `alternatives` with `use`, override rule config > library).

```yaml
schema: packaging-atlas.materials/v1
verified_on: 2026-10-20
verification_classes:
  primary_evaluated: critically evaluated compilation that checked originals (NIST JPCRD, Swenson 1983, Matula 1979)
  primary_measurement: original measurement paper read (Okada-Tokumaru 1984, Hall 1967, Krupka 2006)
  vendor_datasheet: manufacturer TDS / PI sheet read (state revision and date)
  paper_model_input: value an FE/EM paper used as model input; its origin often unstated (secondary)
  paper_measurement: value measured and reported in a packaging paper (e.g. DMA/TMA, resonator)
  derived: computed by formula from other library entries (see `derived`)
  placeholder: unsourced engineering value allowed only behind an explicit config flag; never default
template_keys:          # 3D template `material` -> default library entry (overridable per element)
  silicon: si_crystal
  copper: cu_electroplated
  solder: sac305
  underfill: underfill_cuf_generic
  mold_compound: emc_generic
  organic_build_up: abf_gl
  organic_laminate: core_gfrp_lowcte
  polymer_dielectric: polyimide_generic
  glass: glass_alkali_free
  oxide: sio2_beol
  tim: tim_polymer
  stainless_steel: ss304
  other: null           # must be resolved per element; generator warns
aliases:                # DB `material` strings -> library key (lower-case match); absorbs 266 metal / 174 polymer spellings
  "abf gx92": abf_gx92
  "ajinomoto build-up film (abf)": abf_unspecified
  "borofloat 33 (schott)": glass_borosilicate_bf33

library:
  si_crystal:
    description: single-crystal Si, undoped or lightly doped, room-temperature reference
    class: silicon
    density:     {value: N/A, unit: kg/m^3, ...}
    elastic:
      model: cubic                        # isotropic | orthotropic | transversely_isotropic | cubic | anisotropic
      frame: crystal                      # crystal axes [100],[010],[001]; part orientation lives in the sim config
      C_Pa:
        value: {C11: N/A, C12: N/A, C44: N/A}
        T_dependence: {model: table | linear, ...}
        condition: "pure Si, 25 C"
        source_read: Hall 1967 Phys. Rev. 161, 756
        locator: "Table N, p.M"
        primary_cited: "this paper"
        verification: primary_measurement
        verified_on: 2026-10-20
      isotropic_shortcuts:                # derived from C, never typed in; used only when the config asks for it
        E_110_Pa: {derived: "1/S'(110)", inputs: [C_Pa]}
        E_100_Pa: {derived: "1/S11", inputs: [C_Pa]}
    cte:
      kind: instantaneous                 # instantaneous (tangent) | secant
      T_ref_C: null                       # required when kind = secant; reference of the secant definition
      model: table                        # constant | table | polynomial | bilinear_tg
      table: {T_C: [...], alpha_per_K: [...]}
      interpolation: pchip
      valid_T_C: [-55, 260]
      source_read: Okada and Tokumaru 1984, J. Appl. Phys. 56, 314
      locator: "Eq. N (fit), p.M"
      verification: primary_measurement
      alternatives:
        swenson1983: {source_read: "Swenson 1983 JPCRD 12, 179", locator: "Table N", use: "sensitivity"}
    thermal:
      k_W_mK: {model: table, table: {T_C: [...], k: [...]}, source_read: Glassbrenner and Slack 1964, ...}
      cp_J_kgK: {...}
    electrical:
      eps_r:   {value: N/A, f_range_Hz: [1e9, 1e11], source_read: Krupka 2006, ...}
      resistivity_ohm_m: {value: null, note: "wafer spec, set per variant (standard vs HR-Si); drives tan d"}
      tan_delta: {model: conductivity, formula: "tan_d = sigma / (2 pi f eps0 eps_r) + tan_d_lattice"}
    missing: {}

  emc_generic:
    class: mold_compound
    elastic:
      model: bilinear_tg                 # E1 below Tg, E2 above, smooth step of width dT_tg
      E1_Pa: {...}
      E2_Pa: {...}
      nu: {...}
      tg:
        T_C: {value: ..., method: DMA_tan_delta_peak | DMA_E_onset | TMA | DSC, rate_K_min: ...}
        transition_width_K: {value: ..., basis: placeholder}
    cte:
      kind: secant
      T_ref_C: 25
      model: bilinear_tg                 # alpha1 in the TMA range below Tg, alpha2 above
      alpha1_per_K: {value: ..., range_C: [lo, hi], method: TMA}
      alpha2_per_K: {value: ..., range_C: [lo, hi], method: TMA}
    viscoelastic:                        # tier 2
      model: prony_wlf                   # prony_wlf | prony_arrhenius | prony_table_shift
      T_ref_C: ...
      E_inf_Pa: ...
      terms: [{g: ..., tau_s: ...}]      # normalized shear or tensile; state which
      shift: {C1: ..., C2_K: ..., or: {Ea_J_mol: ...}}
      bulk: {model: elastic, K_Pa: ...}
    cure_shrinkage:
      vol_fraction: {value: ..., basis: paper_model_input, source_read: ectc51909.2023.00155, locator: "p.6 Table 10"}
      apply_at_step: mold_cure            # process step in the sim config; strain-free state set by the process sequence
    thermal: {k_W_mK: {...}}
    electrical: {eps_r: ..., tan_delta: ...}

  sac305:
    class: solder
    elastic: {model: isotropic, E_Pa: {model: table, ...}, nu: {...}}
    cte: {kind: secant, T_ref_C: 25, model: constant, ...}
    viscoplastic:                         # tier 2
      model: anand
      params: {s0_Pa: ..., Q_R_K: ..., A_per_s: ..., xi: ..., m: ..., h0_Pa: ..., s_hat_Pa: ..., n: ..., a: ...}
      fit_basis: stress_strain | creep
      source_read: ...
      locator: ...
      alternatives: {...}                 # several published SAC305 sets disagree; keep each as an alternative

  abf_gl:
    class: dielectric_polymer
    elastic: {model: bilinear_tg, ...}
    cte:
      kind: secant
      model: bilinear_tg
      alpha1_per_K: {value: 20e-6, range_C: [25, 150], plane: xy, source_read: ectc51687.2025.00148, locator: "p.2 Table I", verification: paper_measurement}
      alpha2_per_K: {value: 49e-6, range_C: [150, 240], plane: xy, ...}
      alpha_z_per_K: {value: N/A}
    electrical:
      dk_df:
        model: table_f_T                  # table_f | table_f_T | djordjevic_sarkar (derived fit)
        f_Hz: [...]
        T_C: [...]
        eps_r: [[...]]
        tan_delta: [[...]]
        method: "resonator / line extraction; state"

  core_gfrp_lowcte:
    class: organic_laminate
    elastic: {model: orthotropic, E_x_Pa: {model: table, T_C: [25, 220], value: [...]}, E_z_Pa: N/A, nu_xy: N/A, G_xz_Pa: N/A}
    cte: {kind: secant, T_ref_C: 20, alpha_xy_per_K: {range_C: [20, 220], method: TMA}, alpha_z_per_K: {...}}

derived:                                   # homogenized / effective entries; never hand-typed values
  ubump_uf_layer:
    description: microbump array in underfill as one effective layer
    inputs: {bump: sac305 | snag | cu_pillar_stack, matrix: underfill_cuf_generic}
    parameters: {pitch_um: cfg, diameter_um: cfg, array: square}
    volume_fraction: "f = (pi d^2 / 4) / p^2"
    elastic_model: transversely_isotropic
    formulas:
      E_z: "Voigt: f E_b + (1 - f) E_m"
      E_xy: "Halpin-Tsai or Reuss bound; state choice"
      alpha_z: "Turner: (f E_b a_b + (1 - f) E_m a_m) / (f E_b + (1 - f) E_m)"
      k_z: "f k_b + (1 - f) k_m"
      k_xy: "Maxwell-Eucken (cylinders) or series bound; state choice"
    validity: "layer homogenization for warpage only; local stress needs resolved bumps"
    cross_check: tcpmt.2025.3538554 p.7 Table IV (volume-weighted equivalent E, nu, CTE of a stacked interposer)
  tsv_field:
    inputs: {via: cu_electroplated, liner: sio2_beol, host: si_crystal}
    parameters: {pitch_um: cfg, diameter_um: cfg, liner_um: cfg}
    elastic_model: transversely_isotropic
    formulas: {same family as above; host anisotropy kept in xy}
  rdl_layer:
    inputs: {metal: cu_electroplated, dielectric: polyimide_generic | abf_gl}
    parameters: {metal_fraction: cfg or from layout density, orientation: mesh | x_lines | y_lines}
    formulas: {k_xy: "parallel", k_z: "series", E: "Voigt/Reuss by direction", alpha: "Turner per direction"}
    cross_check: ectc51687.2025.00085 p.3 (orthotropic k from Cu density per routing layer)
  substrate_buildup_stack: {inputs: [abf_*, cu_electroplated, core_*], parameters: {layer_list: cfg}}
  c4_uf_layer: {inputs: [sac305, underfill_cuf_generic], parameters: {pitch_um, diameter_um}}
  bga_layer: {inputs: [sac305, air_or_board_uf], parameters: {pitch_um, diameter_um}}
  beol_effective: {inputs: [cu_electroplated, low_k_beol, sio2_beol], parameters: {metal_fraction_per_level: cfg}}

missing:
  low_k_beol: "no public E/CTE/eps for foundry low-k stacks found 2026-10-20"
  ss304_above_RT: "NIST data end at 300 K; no evaluated source above RT found"
formulas:
  cte_secant_to_instantaneous: "a_inst(T) = a_sec(T) + (T - T_ref) d a_sec / dT"
  cte_instantaneous_to_secant: "a_sec(T) = 1/(T - T_ref) * integral_{T_ref}^{T} a_inst dT'"
  thermal_strain: "eps_th(T) = a_sec(T) (T - T_ref) - a_sec(T0) (T0 - T_ref), T0 = strain-free temperature of the step"
  bilinear_tg_smooth: "P(T) = P1 + (P2 - P1) / (1 + exp(-(T - Tg)/w))"
```

Rules (from the EO pattern, adapted):
- Every leaf value carries `source_read`, `locator`, `condition`, `verification`, `verified_on`; `primary_cited` when
  the read source cites another.
- `paper_model_input` may be the default only for classes with no public primary/vendor data; the entry lists the
  spread across papers in `alternatives` (for example EMC: ectc51529.2024.00155, ectc51687.2025.00027,
  ectc51909.2023.00155, ectc51909.2023.00175), so sensitivity runs are a library switch.
- CTE without `kind` fails schema validation; `kind: secant` without `T_ref_C` fails. Paper values with only a range
  (TMA "30-150 C") are `secant` with `T_ref_C` = range start and `range_C` stored.
- Tg needs `method`. Bilinear models store the raw E1/E2 and a separate smoothing width flagged `placeholder` until a
  DMA curve exists.
- Anisotropy: orientation is a part (config) property; the library stores crystal-frame tensors only.
- Stress-free temperature, cure step, reflow step: process sequence in the sim config, not material.
- Units in the key name (`_Pa`, `_per_K`, `_W_mK`), as the EO library does (`sigma_Sm`, `r_pm_per_v`).
- Tests: a citation test (every leaf has locator + verification), a units/range sanity test (E in 1e5-1e12 Pa, CTE in
  0-3e-4 1/K, eps_r 1-20 at GHz), and a derived-entry test (homogenized values lie within Voigt-Reuss bounds).

## 7. Effort sizing (estimates; basis stated)

### 7.1 Tier-1 material list (30) and property counts

| Group | Materials | Property fields each (est.) | T/f tables |
|---|---|---|---|
| Semiconductor/inorganic | si_crystal, si_hr (EM variant), sio2_beol, sio2_fused, sin_pecvd, low_k_beol (placeholder), aln_film | 9-12 | Si CTE, Si k, Si cp; HR-Si loss vs rho |
| Metals | cu_bulk, cu_electroplated, ni, au, ti, al, ss304, (cu_lid = cu_bulk) | 8-10 | Cu sigma(T), Cu k(T), Cu CTE(T), SS CTE(T) |
| Solder | sac305, snag, imc (one) | 6-8 | E(T) x 2 |
| Polymers | underfill_cuf, muf_lmc, emc, abf_gl, abf_gx92, abf_gz41, polyimide, pbo, bcb, pid_lowloss, solder_resist, core_gfrp_lowcte, core_bt, prepreg_lowloss, adhesive_lid | 10-12 (bilinear Tg doubles E and CTE) | Dk/Df(f) for 8; E(T) for 4 cores/UF |
| Glass | glass_alkali_free, glass_borosilicate, glass_fused (shared with sio2_fused), glass_soda | 8-10 | CTE(T) optional |
| TIM | tim_indium, tim_polymer, tim_graphite (anisotropic k) | 4-6 | none |

Total about 30 materials x ~10 = ~300 property entries, ~60 T- or f-tables (estimate).

### 7.2 Hours (estimate)

| Task | Basis | Agent-hours |
|---|---|---|
| Schema, loader, validation tests, alias table | EO library pattern exists; 13 template keys; ~720 distinct DB material strings to map semi-automatically | 5-8 |
| Primary-source entries (Si, Cu, Ni, Au, SS, glass, silica) | ~120 entries x 4-6 min with source in hand; JPCRD reprints need page rendering | 8-12 |
| T-table digitization (Si CTE/k, Cu sigma/k, solder E(T), core E(T)) | ~25 tables x 15-25 min | 6-10 |
| Vendor TDS discovery and reading (ABF, BCB, PI, UF, glass, TIM) | ~25 documents x 15-25 min; several gated or dead links | 6-10 |
| Paper model-input transfer (Section 5.4 tables) | 20 rich + 12 small tables | 10-14 |
| Dk/Df frequency tables (ABF Type-A, prepregs, glass, PID, Si) | ~10 tables | 3-5 |
| Derived entries (5-8) with formulas and a cross-check | analytic; check vs tcpmt.2025.3538554 and ectc51687.2025.00085 | 3-5 |
| Two fresh-context audits + fixes | per standing rule | 4-6 |
| Tier-1 total | | 35-60 (central ~45) |

Tier-2 (estimate): Anand SAC305 + SnAg with 2-3 alternative sets each (4-6 h, after downloads); EMC and UF Prony +
shift from open papers or the in-repo DMA-type tables (8-14 h; the risk is that no open full Prony set exists for a
modern low-CTE EMC); cure shrinkage vs cure degree (3-5 h); Cu electroplated bilinear/multilinear plasticity vs T
(3-6 h); audits (3-5 h). Tier-2 total 25-45 h, gated by about 10-15 user downloads.

Parallel plan (estimate): 7 agents by material group (Si/inorganic, metals, solder, encapsulants, build-up/core,
glass, TIM + derived), one schema owner; T1 in 1-2 days wall clock.

## 8. Risks and mitigations

| Risk | Evidence | Impact | Mitigation |
|---|---|---|---|
| Proprietary values for EMC, UF, ABF grades, cores, solder resist, low-k | no public TDS found for HL832NS, HD-4100, low-k; ABF brochure URL dead (Section 4) | warpage error dominated by these | `paper_model_input` default + `alternatives` spread; sensitivity runs; per-config override with provenance |
| Secant vs instantaneous CTE ambiguity | only ectc51846.2026.00103 p.4 Table II states "instantaneous"; most tables give alpha1/alpha2 without definition; TMA ranges (e.g. 25-150 C) imply mean values | thermal-strain error near Tg (not quantified in this lane) | schema makes `kind` mandatory; ranges stored; conversion formulas in `formulas` |
| Tg definition and above-Tg modulus | Tg by DMA vs TMA vs DSC appears in the DB (e.g. "Tg 168 C (DMA)"); UF E drops from 9.4 to 0.08 GPa across Tg (tcpmt.2025.3614186 p.6 Table II) | step location shifts warpage-vs-T curves | store method; bilinear with explicit width; T2 replaces with Prony + shift |
| Si orientation / isotropic shortcut | E = 120-170 GPa in DB papers for the same Si (Section 3.1) | stiffness of thinned dies, interposer warpage | cubic Cij default; isotropic E derived per direction only on request |
| Temperature coverage | NIST cryo fits stop at 300 K (Cu, SS); many vendor values only at 25 C | reflow-range errors | T-tables to 260 C from JPCRD (Cu, Si); flag `valid_T_C` and refuse extrapolation without a flag |
| Image-only tables, garbled text layers | Anand table tcpmt.2025.3614186 p.7 is an image; 4 papers with font-shifted text layers; "250C" degree artefact in ectc51846.2026.00389 | extraction errors | read page renders (as DevLog-038 did); audit against DB rows |
| Extraction quality of existing DB rows | eptc67330.2025.11392176 "stainless steel" row with Tg and 1.9 GPa | wrong library seeds | re-read each table at source when transferring; never copy `properties` free text blindly |
| Film vs bulk | electroplated Cu, PECVD SiN, thin SiO2 differ from bulk; Cu anneal expansion metrics in DB | stress at TSV/RDL | separate film entries with process condition; bulk only for lids/planes |
| Homogenization misuse | effective layers hide local stress | wrong solder/bump stress | `derived.validity` text; UI badge "homogenized" |
| Frequency extrapolation of Dk/Df | vendor Dk/Df at 5.8 or 10 GHz only | IL error at 50-100 GHz | causal fit (derived) with stated anchor points; prefer measured wideband sets (ectc51846.2026.00389) |

## 9. Questions for the user (few, numbered)

1. Accept `paper_model_input` as the default basis for EMC, UF, ABF, cores and solder resist (with alternatives and
   sensitivity), given no public primary data?
2. Download the subscription list in Section 4 into the cached references (or `references/_inbox/`) so tier-1 Si
   tables and tier-2 Anand/EMC sets can be read at source?
3. Default Si model: cubic Cij for all Si parts (slower assembly of the stiffness matrix, same DOF count), or isotropic
   E(110) for canonical sims with cubic as a variant?
