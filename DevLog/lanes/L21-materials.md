---
title: Lane L21 - materials library from the 8 manual-download sources
date: 2026-10-21
status: done (hand-off 2026-10-21)
scope: engine/data/materials/, engine/src/materials/ (minimal: loaders, new property kinds), engine/tests/materials*, this file
owner: lane L21 (Claude subagent, DevLog-013), materials-library owner after L2
---

# L21: materials library, 8 manual-download sources

Binding inputs: DevLog-013 shared rules; DevLog/lanes/L2-materials.md (conventions, provenance labels, template
policy CD1/CD5/CD6); DevLog/research/2026-10-20-sim-materials-library-scope.md Sec. 4; config/sim/manual_downloads.md;
DevLog-012 CD table and "Wentao's decisions (2026-10-21)"; sims/SPEC.md sections 4, 8, 11, 11.1, 18.

Sources (references/<id>/source.pdf, text.md, figures/):
physrev.161.756 (Hall 1967), physrev.134.a1058 (Glassbrenner-Slack 1964), 1.333965 (Okada-Tokumaru 1984),
j.ijadhadh.2011.10.007 (Sadeghinia 2012), j.mee.2003.09.012 (Read 2004), 09540910010331428 (Cheng 2000),
j.microrel.2013.07.100 (Zhang 2014), c8sm02105h (Mueller 2019).

## Plan (2026-10-21 18:21 PDT, before implementation)

1. Transcription (section "Transcription" below), per source: values, exact locators (page, table, equation,
   figure), units, T range, property kind (secant vs instantaneous CTE; storage vs relaxation modulus; linear vs
   volumetric shrinkage). The two Phys. Rev. scans: tables read from page renders (higher-dpi renders in the session
   scratchpad with uv + pymupdf); OCR text used only as a cross-check. Plot reads marked digitized with uncertainty.
2. Library changes (engine/data/materials/ only, plus `_sources.yaml`):
   - si_crystal: C11/C12/C44(T) from Hall (table_T leaves; the loader already evaluates per-field tables), k(T) from
     Glassbrenner-Slack if it extends or improves the HPL table, alpha(T) from the Okada-Tokumaru fit (expr_T or a
     generated table, instantaneous). Check E<100>/<110>/<111> at 25 C (was 130 / 169 / 188 GPa). Current sources
     become alternatives. valid_T_C re-derived from the new tables' overlap.
   - emc: Sadeghinia Prony / shift data as a tier-2 `viscoelastic` block (status tier2_data) in the form the E8
     skeleton takes (`prony: [{g, tau_s}]`, `shift`); cure shrinkage as an alternative (sourced) to JOINT2 0.16 %;
     CTE as an alternative.
   - cu_electroplated: Read 2004 E and plasticity (tier-2 `plasticity` block, tier2_data).
   - solders: Cheng 2000 and Zhang 2014 Anand sets as tier-2 `viscoplastic` data / alternatives.
   - silicone_adhesive: nu from Mueller (PDMS), basis analog (template analog_of, CD1 a) with rationale and
     sensitivity bounds; CTE alternative.
   - Every default change listed before / after in this file.
3. Code (minimal): schema checks for tier-2 data blocks if a new kind is needed (viscoelastic prony/shift,
   anand parameter sets, plasticity curves); resolve() exposure only if trivially additive (e.g.
   `lib.tier2(key, kind)` accessor). No mech wiring.
4. Tests: materials tests for the new data (Si E directions at 25 C, Prony sum < 1, Anand set completeness, silicone
   nu bounds); `node --test tests/materials*.test.mjs`, then `npm test`.
5. RVE table: rebuild only if a constituent default changed (Si Cij(T), Si CTE, Si k change -> TSV / Si-containing
   homog rows); report shared-row identity like L11.
6. Report: cases expected to move (for L19), SPEC requests, open items.

## TODO

- [x] Transcribe 8 sources
- [x] Library entries updated
- [x] Code + tests
- [x] RVE table decision / rebuild (39 Si TSV rows recomputed, 586 rows byte-identical)
- [x] Materials tests green (45/45); full suite 307/310 (3 family drift failures, not materials: see log)
- [x] Final report

## Progress log

- 2026-10-21 18:21 PDT plan written; inputs read (DevLog-013, L2 notes, R4 Sec. 4, manual_downloads.md, DevLog-012
  CD decisions, SPEC 4/8/11/11.1/18, materials code, L8 E8 notes and mech/viscoelastic.mjs spec form).
- 2026-10-21 18:31 PDT transcribed Hall 1967, Glassbrenner-Slack 1964, Okada-Tokumaru 1984, Sadeghinia 2012 (see
  Transcription). Hall Cij(T) only 4.2-310 K (Figs. 1-3, digitized); Sadeghinia prints no Prony terms (master curve
  Fig. 11b is a vector plot: markers extracted exactly, Prony fit derived in the session scratchpad); Table 6 T0 values
  reproduce Fig. 12 only when read as C (header says K).
- 2026-10-21 18:35-18:45 PDT transcribed Read 2004, Cheng 2000, Zhang 2014, Mueller 2019; data files, schema
  (tier-2 checks), tier2() accessor, units, expr_T CTE integration fix, override admissibility fix; tests.
  Found and fixed: registry ids `09540910010331428` and `1.333965` were unquoted YAML numbers (the first parsed as
  9540910010331428); now quoted, with a registry test.
- 2026-10-21 18:45 PDT RVE table: 39 rows (homog:tsv:copper+silicon at 0.0021 / 0.0035 / 0.0079) had stale
  fingerprints after the Si change; recomputed in place with the table cfg (n 32, q1im, richardson), all other 586
  rows byte-identical; norm-relative change C6 <= 2.6e-4, alpha6 <= 6.6e-6, rho -4.2e-4; recheck: 0 stale rows,
  TSV row serves hit_exact. Old file kept in the session scratchpad. Rows are matched by position, so L20's
  canonical-key lookup is unaffected (keys unchanged).
- 2026-10-21 18:49 PDT `node --test tests/materials*.test.mjs` 45/45 (5.9 s); `npm test` 307/310 in 206 s
  (log in the session scratchpad): the 3 failures are families.test.mjs emib_t part count 7 vs 6 and the
  transcribe drift alarm (new emib_t part `ob_bu` in config/package3d, L18 / L19 working tree), not materials.

## Transcription (2026-10-21; journal page numbers unless "PDF p.")

### physrev.161.756 (Hall 1967), scan, read from renders
- p.757 Sec. II: pure sample n-type 150 Ohm cm; density 2.3290 +- 0.0002 g/cm3 (pure), 2.3297 (P-doped), 25 C.
- p.758 Table III (pure, 25 C, 1e12 dyn/cm2, +-0.02 %): C11 1.6564, C12 0.6394, C44 0.7951 (McSkimin-Andreatch
  1.6563 / 0.6387 / 0.7955); third-order constants also printed (not used). Table IV: doped 1.6394 / 0.6477 / 0.7919.
  Table V (4.2 K): pure 1.6754 / 0.6492 / 0.8024. Kind: adiabatic (ultrasonic), corrected for thermal expansion.
- Cij(T) only as Figs. 1-3 (C11, C' = (C11 - C12)/2, C44), 4.2-310 K. Digitized pure curves (tick-fit affine with
  scan-skew correction; checks: 4.2 K and 298 K reproduce Tables V / III to <= 1e-4):
  T_K 50 / 100 / 150 / 200 / 250 / 310: C11 1.67527 / 1.67417 / 1.67099 / 1.66654 / 1.66134 / 1.65522 (+-0.0003);
  C' 0.51313 / 0.51289 / 0.51229 / 0.51118 / 0.50981 / 0.50812 (+-0.0003); C44 0.80232 / 0.80188 / 0.80081 /
  0.79923 / 0.79715 / 0.79454 (+-0.0001). No data above 310 K.

### physrev.134.a1058 (Glassbrenner-Slack 1964), scan, Table I from a 400 dpi render
- p.A1062 Table I, Si K (W/cm deg), "representative values", +-5 %: 50 K 26., 60 21., 70 17.0, 80 13.9, 90 11.4,
  100 9.5, 125 6.0, 150 4.20 (barred), 175 3.25 (barred), 200 2.66 (barred), 250 1.95, 300 1.56, 400 1.05, 500 0.80,
  600 0.64, 700 0.52, 800 0.43, 900 0.356, 1000 0.310, 1100 0.280, 1200 0.261, 1300 0.248, 1400 0.237, 1500 0.227,
  1600 0.219, 1681 0.216 (barred last digit = "rather uncertain"). Versus HPL 1972 default: +5 % at 300 K, +6 % at
  400 K, +5 % at 500 K, +3 % at 600 K.

### 1.333965 (Okada-Tokumaru 1984)
- p.318 Eq. (5): alpha(t) = (3.725 {1 - exp[-5.88e-3 (t - 124)]} + 5.548e-4 t) x 1e-6 /K, t in K (instantaneous,
  derivative of the lattice parameter); p.320: applicable 120-1500 K (measured 300-1500 K, FZ and CZ, x-ray Bond
  method); alpha(298.2 K) = 2.59 +- 0.05 ppm/K measured; p.319 Table IV calculated column (e.g. 2.55 at 298.2 K, 3.59
  at 500 K, 4.56 at 1500 K) reproduced to 0.005. Lattice parameter a0 = 0.5430741 nm at 273.2 K (Eq. 4).

### j.ijadhadh.2011.10.007 (Sadeghinia 2012), native text + vector figures
- Material p.83: EPN 1180 + BPA + TPP; filled = 64.5 wt% (50 vol%) fused silica FB-940.
- Table 2 (p.84) Kamal-Sourour kinetics: filled Ea 76.1e3 J/mol, k0 2.48e6 /s, m 0.163, n 1.365 (unfilled 77.5e3,
  1.84e7, 0.158, 1.26). Table 3 DiBenedetto: filled Tg0 15.5 C, Tginf 111.2 C, lambda 0.652.
- Cure shrinkage p.85: filled 2.1 vol%, unfilled 3.4 vol% (isothermal 120 C, volumetric, total incl. pre-gel);
  Eq. (3) linear in conversion.
- CTE p.86 Eq. (6) + Table 4 (filled): k1 7.9e-5 /C, k2 1.88e-4 /C, A1 0.033 /C, Tg_pvt 98 C, s0 0.445 C/MPa,
  b1 5633.8 MPa, b2 9.1e-3 /C, u0 0.609 cm3/g, C 0.0894; linear = volumetric / 3, instantaneous; glassy 26.3,
  rubbery 89.0 ppm/K (text swaps the labels; Eq. 6 and Fig. 8 agree with this reading).
- Bulk modulus Fig. 9 (vector markers, filled, MPa): 50 C 15255, 60 13827, 70 12082, 80 10435, 90 8893, 100 7753,
  110 6948, 120 6424, 130 6127, 140 5814, 150 5600, 160 5401, 170 5186, 180 5088, 190 4872, 200 4679 (+-40).
- DMA p.87 Table 5 (1 Hz storage modulus): filled glassy 7239 MPa, rubbery 108.3 MPa, Tg(E'') 112.5 C, Tg(tan d)
  121 C (unfilled 2253 / 16.3 / 121.3 / 128). Storage, not relaxation, modulus.
- Fig. 11(b) master curve (Tref 120 C): 90 vector markers of shifted isotherms, log10 w -3.256 .. 13.034 rad/s,
  E' 0.098 .. 6.4 GPa. NO Prony terms printed. Lane fit: 17 Prony terms (tau 1e-13 .. 1e3 s), E0 6.431 GPa,
  E_inf 0.0975 GPa, fit max 7.8 % / rms 2.2 % (derived; stored with the 90 points).
- p.88 Table 6 (filled): WLF C1 11.1, C2 56.6, Tref 120 C (caption), Tg^DMA 126.4 C; Arrhenius H 401 kJ/mol,
  T0 200.5 (header "K", but Fig. 12 is reproduced only with C), Tc 90 C. Source sign convention reciprocal to the
  engine (log a_T rises with T); verified against the Fig. 12 vector curve (60 / 80 / 140 C).

### j.mee.2003.09.012 (Read 2004)
- p.67 Table 1 (2.59 um electrodeposit, 25 C, 16 tests): average yield 233 +- 15 MPa, UTS 252 +- 15, elongation
  2 +- 0.7 %, E 73 +- 24 GPa; per strain rate (6.79e-5 / 3.77e-5 / 1.55e-5 / 3.19e-6 /s): yield 246 / 224 / 221 / 223,
  UTS 265 / 244 / 243 / 243, E 73 / 79 / 85 / 52 GPa. Yield definition not stated. "Modulus deficit" vs bulk (p.67).
- p.68 Fig. 4 (one test, 6.79e-5 /s): digitized engineering curve (22 points, peak 256 MPa at 1.5 % strain).

### 09540910010331428 (Cheng 2000), native text
- p.31 Eqs. (1)-(3): standard Anand (A, Q/R, xi, m, s_hat, n, h0, a, s0). p.32 Eq. (4) E = E0 - E1 T_C;
  Table I (MPa): 92.5Pb5Sn2.5Ag 2.403e4 / 28.1; 60Sn40Pb 3.447e4 / 151.7; 62Sn36Pb2Ag 3.447e4 / 151.7;
  96.5Sn3.5Ag 5.24e4 / 193.1.
- p.33 Table II (A /s, Q/R K, xi, m, s_hat MPa, n, h0 MPa, a, s0 MPa):
  92.5Pb5Sn2.5Ag 1.052e5, 11010, 7, 0.241, 41.63, 0.002, 1432, 1.3, 33.07 (column printed "9.2.5Pb5Sn2.5Ag");
  60Sn40Pb 1.49e7, 10830, 11, 0.303, 80.42, 0.0231, 2640.75, 1.34, 56.33;
  62Sn36Pb2Ag 2.30e7, 11262, 11, 0.303, 80.79, 0.0212, 4121.31, 1.38, 42.32;
  96.5Sn3.5Ag 2.23e4, 8900, 6, 0.182, 73.81, 0.018, 3321.15, 1.82, 39.09.
  Pb-rich set fitted to own creep / constant-rate tests (-65..250 C); the other three fitted to the Darveaux-Banerji
  1992 separated model. Pb alloys have no library entry (not stored).

### j.microrel.2013.07.100 (Zhang 2014)
- p.283 Table 1 (A /s, Q/R, s_hat, h0, xi, m, n, a, s0): Sn3.8Ag0.7Cu0.8Zn (this work; tension 1e-4..1e-2 /s,
  -55..125 C) 23500, 8500, 65.9, 3642.5, 5.6, 0.163, 0.0186, 2.1, 34.1; Sn1.0Ag0.5Cu [26] 3.733, 8076, 3.5833,
  4507.5, 0.9951, 0.4454, 0.0120, 2.1669, 2.3479; Sn3.8Ag0.7Cu [26] 15.733, 9883, 3.1505, 1076.9, 1.0673, 0.3686,
  0.0352, 1.6832, 3.2992; Sn3.8Ag0.7Cu0.03Ce [27] 21200, 8026, 57.6, 4352.6, 5, 0.130, 0.0175, 2.3, 28.5;
  Sn3.8Ag0.7Cu [27] 24300, 8710, 65.3, 3541.2, 5.8, 0.183, 0.019, 1.9, 39.5; Sn3.8Ag0.5Cu [28] 325, 10561, 42.1,
  800000, 10, 0.32, 0.02, 2.57, 20; Sn3.0Ag0.5Cu [29] 5870000, 7460, 58.3, 9350, 2, 0.0942, 0.015, 1.5, 45.9;
  Sn3.5Ag [30] 52690, 8765, 76.944, 7205.18, 6, 0.182, 0.018, 1.2321, 30.36; Sn37Pb [31] 6220, 6526, 36.86, 60599,
  3.33, 0.27, 0.022, 1.7811, 3.1522.
- The sac305 and snag defaults (tcpmt.2025.3614186 Table III) equal rows [29] and [30]; Zhang prints no E, nu or
  CTE, so the elastic / CTE part of tcpmt Table III has no primary here. Chan [26] rows have s_hat and s0 near
  3 MPa (inconsistent with the other rows; not stored). Ref [28] is titled 95.5Sn4.0Ag0.5Cu while the row says
  Sn3.8Ag0.5Cu.

### c8sm02105h (Mueller 2019)
- p.782-783: Sylgard 184 nu = 0.4950 +- 0.0010, Sylgard 182 0.4974 +- 0.0006 (mean over curing temperatures
  60-135 C, Fig. 7; strains 1-2.35 %); literature cited 0.45, 0.47 +- 0.028, 0.49-0.5.
- p.783 CTE (mean over cool-down from the curing temperature to room temperature, one alpha per Delta T, p.780):
  S184 309.63 +- 6.91 ppm/C extrapolated to 25 C, slope -0.65 +- 0.07 ppm/C per C of curing temperature (data sheet
  340); S182 289.55 +- 4.44, -0.51 +- 0.05 (data sheet 325). Polymerisation shrinkage about 0.1 % (neglected).

## Library changes (2026-10-21)

Default changes (before -> after):

| Entry.property | Before | After | Why |
|---|---|---|---|
| si_crystal.elastic C11 / C12 / C44 | 165.6 / 63.9 / 79.5 GPa (Hopcroft Table III, rounded) | 165.64 / 63.94 / 79.51 GPa (Hall Table III) | primary, full digits |
| si_crystal.density | 2330 kg/m3 (via Hopcroft) | 2329.0 kg/m3 (Hall p.757) | primary |
| silicone_adhesive.elastic.nu | 0.30 placeholder, sens. -0.05 / +0.19 | 0.495 template analog_of PDMS Sylgard 184, sens. -0.045 / +0.004 (0.45-0.499) | CD4: sourced silicone nu |

E<100> / <110> / <111> at 25 C: 130.016 / 168.931 / 187.653 -> 130.024 / 168.956 / 187.688 GPa (still 130 / 169 / 188).
Hill: E 162.556 -> 162.579 GPa, nu 0.22298 -> 0.22305.

Unchanged defaults with new alternatives / tier-2 data:
- si_crystal: alternatives cubic_T_hall1967 (4.2-310 K tables), k_glassbrenner1964, cte_okada1984 (expr_T).
  k stays HPL 1972 (later evaluated compilation), alpha stays Swenson 1983 (evaluated; O-T within 0.06 ppm/K secant).
- emc: tier-2 viscoelastic (tier2_data, basis derived, analog material): Prony + piecewise Arrhenius / WLF shift in
  engine convention, source values kept; alternatives sadeghinia2012_filled_E (E 7239 / 108.3 MPa bilinear at
  112.5 C, nu 0.421 / 0.496 derived from E and PVT K), sadeghinia2012_filled_cte (Eq. 6), sadeghinia2012_filled_
  shrinkage (2.1 vol%). JOINT2 0.16 % stays the default (the 2.1 vol% includes stress-free pre-gel shrinkage).
- cu_electroplated: alternative e_read2004_film (73 GPa, nu N/A); plasticity alternative read2004_film_curve.
- sac305: Anand alternatives zhang2014_snagcuzn, zhang2014_sac387_ref27, zhang2014_sn38ag05cu_ref28; default
  primary_cited = Zhang Table 1 row [29]. snag: Anand alternative cheng2000_sn35ag, elastic alternative
  e_cheng2000 (E0 - E1 T, nu N/A); default primary_cited = Zhang Table 1 row [30].
- silicone_adhesive: alternative cte_pdms_sylgard184 (309.63 ppm/K secant at 25 C); ECCOBOND 3003 alternative keeps
  the 0.30 placeholder (Tg 49 C, 4 GPa at 25 C: the rubbery analog does not apply).

CD6 ceilings: none of the 8 sources extends solder_resist (225 C), tim_polymer (150 C) or silicone_adhesive E
(150 C). Sadeghinia CTE / K reach 200 C for a model EMC only; Hall stops at 310 K.

Code (engine/src/materials, minimal): units.mjs `1e12 dyn/cm2`; eval.mjs expr_T leaves flagged smooth (an
instantaneous CTE expression is integrated on the 0.5 K grid; before, only 3 nodes); schema.mjs checkTier2
(Prony g > 0, tau > 0, sum < 1, Tref; shift wlf | arrhenius | piecewise; Anand 9 params; bilinear / multilinear
plasticity; nested alternatives need registered source + locator), exports ANAND_PARAMS, SHIFT_TYPES; library.mjs
`lib.tier2(key, property, alternative?)`; overrides.mjs admissibility check resolves with allowExtrapolation for the
entry (a nu override on silicone_adhesive threw because valid_T_C reaches 250 C while the default E table ends at
150 C, so its CD1 sensitivity bounds always failed).

## Cases expected to move (for L19)

- Silicone nu 0.30 -> 0.495: every mechanics study with silicone_adhesive: 120 mm stiffener glue
  (sims/si_interposer_peers/120mm_warpage.yaml, 120mm_warpage_cu.yaml: stiffener_attach_sequence), lid-attach
  adhesive of lidded families (common.mjs lid_adh_mat: cowos_l warpage_rt_ht, xilinx_tsv_lid), cowos_s ring
  adhesive (ring_adh_mat) and cowos_l ring48x if a ring adhesive part is emitted. Thermal-only cases unaffected.
  Caveat: nu 0.495 in thin layers may lock volumetrically with q1 / q1im; check convergence and compare with the
  0.45 bound.
- Si constants and density (+0.02 % stiffness, -0.04 % density): all Si parts and the TSV RVE rows; expected
  change << 0.1 % in warpage; re-runs only to refresh the ledger.
- Library alternatives and tier-2 data change no default result.

## SPEC requests (additive, for the coordinator)

- Section 8/11: `lib.tier2(key, property, alternative?)`; tier-2 data schema: viscoelastic `model:
  prony_proportional` {Tref_C, E0_GPa, E_inf_GPa, g_inf, prony [{g, tau_s}], shift {wlf | arrhenius | piecewise
  {Tc_C, below, above}}} in the mech/viscoelastic.mjs convention; viscoplastic `model: anand` {params (9)};
  plasticity bilinear_isotropic / multilinear_engineering; nested `alternatives` with source + locator.
- Section 18: viscoelastic engine lane to support `shift.type: piecewise` (Sadeghinia Arrhenius below Tc, WLF above).
- Units: modulus `1e12 dyn/cm2`.

## Open items

- Si Cij(T) above 310 K: no source among these 8 (Bourgeois / Hopcroft Table IV needs its reference T).
- EMC: Prony set is from a model EMC (E0 6.43 GPa at 120 C), the default grade has E1 18 GPa: proportional scaling
  is an assumption for the engine lane. Sadeghinia-derived nu (0.42 glassy) lies outside the CD1 band 0.30 +- 0.05:
  flag for Wentao (EMC nu sensitivity may be under-stated).
- silicone_adhesive below its Tg (-15 C): glassy, analog nu not applicable; no glassy-state nu read.
- tim_polymer nu stays the 0.30 placeholder (gel chemistry not stated in its source; PDMS analog not applied).
- sac305 / snag elastic and CTE (tcpmt Table III): primary still unidentified.
- Pb-solder Anand sets (Cheng Table II, Zhang [31]) transcribed here only; no library entries.
