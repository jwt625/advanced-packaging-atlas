---
title: Round 1 audit A8 - lane L21 materials library from the 8 manual-download sources
date: 2026-10-21
auditor: A8 (fresh-context Claude subagent, DevLog-013)
scope: engine/data/materials/{_sources,silicon,encapsulants,metals,solders,tims_adhesives}.yaml; engine/src/materials/{units,eval,schema,library,index,overrides}.mjs; engine/tests/materials.test.mjs, engine/tests/materials-l21.test.mjs; 39 Si-TSV rows of engine/src/homog/rve_table_defaults.json; notes DevLog/lanes/L21-materials.md
method: git diff HEAD; page renders at 300 dpi (uv + pymupdf, session scratchpad); vector data extracted from the Sadeghinia PDF drawing commands; independent recomputation in node; no edits outside this file
---

# Audit A8: lane L21 (materials)

## Verdict

PASS with 1 SIGNIFICANT finding (silicone nu analog outside its rubbery domain) and 11 MINOR items. No BLOCKING
finding. No wrong number among the stored values checked.

- Values checked against the source pages: about 285 (about 180 read from 300 dpi renders, 106 from the PDF vector
  data), 0 transcription errors in stored values. Two numbers in notes are wrong (M1, M2) and one claim is loose (M5).
- The three claimed Sadeghinia source defects: T0 unit CONFIRMED, sign convention CONFIRMED (a reciprocal convention,
  internally consistent, not an error), glassy/rubbery label swap CONFIRMED. A fourth source defect found (M3: Fig. 12
  legend line styles swapped).
- Derived values reproduced: Prony fit error, CTE integration, Si E<hkl> and Hill averages, EMC derived nu, RVE rows.
- `cd engine && nice -n 10 node --test tests/materials*.test.mjs`: 45/45 pass (5.0 s, 2026-10-21 19:0x PDT).

## 1. Transcription (render checks)

| Source | Locator | Values checked | Result |
|---|---|---|---|
| Hall 1967 (scan) | p.758 Table III, IV, V; p.757 Sec. II | C11 / C12 / C44 = 1.6564 / 0.6394 / 0.7951 (1e12 dyn/cm2, 25 C, +-0.02 %); McSkimin-Andreatch 1.6563 / 0.6387 / 0.7955; Table IV doped 1.6394 / 0.6477 / 0.7919; Table V pure 1.6754 / 0.6492 / 0.8024; density 2.3290 +- 0.0002 g/cm3 pure, 2.3297 doped, 25 C, hydrometric | all match |
| Hall 1967 digitized | p.757 Fig. 1 (C11), p.759 Fig. 3 (C44) | own pixel read with tick calibration and scan-skew correction: C44 at 50 / 150 / 200 / 250 / 310 K = 0.80236 / 0.80086 / 0.79933 / 0.79721 / 0.79466 (L21: 0.80232 / 0.80081 / 0.79923 / 0.79715 / 0.79454); C11 at 100 / 200 / 250 K = 1.67404 / 1.66651 / 1.66138 (L21: 1.67417 / 1.66654 / 1.66134); calibration point 298 K reads 1.65632 vs Table III 1.6564 | within 1.3e-4, inside the stated +-0.0003 / +-0.0001 |
| Hall text | p.759 | "corrected for thermal expansion", "true adiabatic elastic moduli" (p.758), Cij(T) 4.2-310 K | match |
| Glassbrenner-Slack 1964 (scan) | p.A1062 Table I | Si k 200-800 K: 2.66 (last digit barred), 1.95, 1.56, 1.05, 0.80, 0.64, 0.52, 0.43 W/cm deg; "+-5 %"; 1681 K 0.216 | all match; vs HPL default +5.4 / +6.2 / +5.0 / +3.4 % at 300 / 400 / 500 / 600 K (L21: +5 / +6 / +5 / +3) |
| Okada-Tokumaru 1984 | p.318 Eq. (5); p.319 Table IV; p.320 | 3.725, 5.88e-3, 124, 5.548e-4, x 1e-6 /K, t in K; a0 0.5430741 nm; Table IV calculated 0.41 (140 K), 1.45 (200 K), 2.55 (298.2 K), 3.59 (500 K), 4.10 (800 K), 4.56 (1500 K); "applicable between 120 and 1500 K"; 2.59 +- 0.05 at 298.2 K | all match; Eq. (5) reproduces Table IV to <= 0.005 |
| Sadeghinia 2012 | p.86 Table 4 row Filled | u0 0.609 cm3/g, k1 7.9e-5 /C, k2 1.88e-4 /C, A1 0.033 /C, b1 5633.8 MPa, b2 9.1e-3 /C, Tg_pvt 98 C, s0 0.445 C/MPa, C 0.0894 | all match, units as stored |
| Sadeghinia 2012 | p.87 Table 5 row Filled | glassy 7239 MPa, rubbery 108.3 MPa, Tg(E'') 112.5 C, Tg(tan d) 121 C (1 Hz) | match |
| Sadeghinia 2012 | p.88 Table 6 row Filled, Eqs. (9)-(10) | C1 11.1, C2 56.6, Tg^DMA 126.4 C, H 401 kJ/mol, T0 200.5 (header "T0 (K)"), Tc 90 C, Tref 120 C | match |
| Sadeghinia 2012 | p.87 Fig. 9 (vector) | 16 filled K markers 50-200 C: own extraction 15256, 13828, 12083, 10436, 8893, 7754, 6949, 6425, 6128, 5814, 5600, 5402, 5187, 5088, 4873, 4679 MPa | equal to L21 within 1 MPa |
| Sadeghinia 2012 | p.87 Fig. 11(b) (vector) | all 90 stored (log10 w, log10 E) points matched to a filled marker of the figure within 0.0008 decade (median 0.0003); no master-curve marker left out (unused markers = 3 duplicates and the legend) | match |
| Sadeghinia 2012 | p.85 Sec. 2.3.1 | cure shrinkage filled 2.1 vol%, unfilled 3.4 vol%, inert-filler estimate 1.7 vol%, heating 5 C/min, cure 120 C | match |
| Read 2004 | p.67 Table 1 | average 233 +- 15 / 252 +- 15 MPa / 2 +- 0.7 % / 73 +- 24 GPa; per-rate yield 246 / 224 / 221 / 223, UTS 265 / 244 / 243 / 243, E 73 / 79 / 85 / 52 | all match (see M6 for the test count) |
| Read 2004 | p.68 Fig. 4 | visual check of the digitized curve: peak about 256 MPa near 1.5 %, last point about 249 MPa at 2.25 %, preload about 11 MPa | consistent |
| Cheng 2000 | p.32 Table I, Eq. (4); p.33 Table II | Table I E0 / E1: 2.403e4 / 28.1, 3.447e4 / 151.7 (x2), 5.24e4 / 193.1 MPa; Table II all 36 values (four alloys x 9 parameters, units /s, K, MPa) incl. the printed "9.2.5Pb5Sn2.5Ag" header | all match |
| Zhang 2014 | p.283 Table 1 | the 5 stored rows (this work, [27] SAC387, [28], [29], [30]) x 9 parameters = 45 values; sac305 default = row [29], snag default = row [30] exactly; refs [26]-[31] titles | all match; units A /s, s_hat / h0 / s0 MPa (source prints Q/R unit as "K^-1"; stored as K, correct) |
| Mueller 2019 | p.782 Sec. 5, p.783 Figs. 7-8 | nu S184 0.4950 +- 0.0010, S182 0.4974 +- 0.0006 (mean over 6 curing temperatures 60-135 C, strains 1-2.35 %); literature 0.45 (Studer, Sasoglu), 0.47 +- 0.028 (Roman), 0.49, 0.499, 0.5 +- 0.002; CTE S184 309.63 +- 6.91 ppm/C at 25 C, -0.65 +- 0.07 ppm/C^2; S182 289.55 +- 4.44, -0.51 +- 0.05; data sheet 340 / 325 | all match |

## 2. The three claimed Sadeghinia source defects

1. **T0 unit (header K, value used as C): CONFIRMED.** Evidence: the Arrhenius curve drawn in Fig. 12(b) (vector data,
   +5 display offset removed) equals Eq. (9) with Table 6 values and T0 = 200.5 C = 473.65 K exactly: at 24.9 C the
   drawn curve is -31.08 (display), Eq. (9) gives -26.08 - 5 = -31.08. The red shift-factor curve at 60 / 80 / 140 C
   reads -18.55 / -14.83 / +2.99 (own calibration from the frame; L21 -18.63 / -14.91 / +2.91; Eq. -18.67 / -15.11 /
   +2.90). With T0 = 200.5 K the 60 C value would be +41.6 (see M1), so the K reading is refuted. The unfilled row
   (T0 140.5, Tc 114 C) is also only consistent as C.
2. **log a_T sign convention: CONFIRMED as a convention, not an error.** Render of p.88: Eq. (9) log a = -H/(2.30 R)
   (1/T - 1/T0), Eq. (10) log a = +C1 (T - Tref)/(C2 + T - Tref); both rise with T, Fig. 12 rises with T, and Fig. 11(b)
   puts the low-T (stiff) isotherms at high frequency, i.e. omega_r = omega / a_T(source). So the source a_T is the
   reciprocal of the standard / engine a_T, and is self-consistent. L21's stored engine form (log10 a_T = -C1 (T -
   Tref)/(C2 + T - Tref); ln a_T = Ea/R (1/T - 1/Tref), Ea = H ln10 / 2.30) is the correct translation. The word
   "defect" in the lane notes overstates it; the yaml wording ("prints the reciprocal factor") is accurate.
3. **Glassy / rubbery label swap in the p.86 text: CONFIRMED.** The text says k1 and (k1 + k2) are the rubbery and
   glassy volumetric CTE; Eq. (6) with tanh -> -1 below Tg gives k1 below Tg, and Fig. 8 (filled about 28 ppm/K at
   40 C, 89 ppm/K at 150-200 C) agrees with k1 = glassy. Stored expression checked:
   (79 + 94 (2 - 2/(1 + e^(0.066 (T - 98)))))/3 = (k1 + k2/2 (1 + tanh[A1 (T - 98)]))/3; 27.7 ppm/K at 40 C.

## 3. Derived values

- **Prony fit**: recomputed from the stored 17 terms and 90 points: max relative error 7.77 % (at log10 w = -0.978,
  a scattered point at the foot of the transition), rms 2.25 % (claim 7.8 % / 2.2 %); identical from g_i E0 and from
  the stored E_i (E_i = g_i E0 to 5e-5); E_inf + sum E_i = 6.43098 vs E0 6.431 GPa; g_inf = 1 - sum g = 0.0151581
  (stored 0.0151579). Fit form (E' Prony series storage modulus) correct.
- **CTE integration (eval.mjs expr_T smooth -> 0.5 K grid)**: library secant for cte_okada1984 vs the closed-form
  integral of Eq. (5) (F(T) = 3.725 (T + e^(-5.88e-3 (T - 124))/5.88e-3) + 5.548e-4 T^2/2): max |error| 6.6e-7 ppm/K
  over 200-600 K, 8.6e-7 ppm/K over 120-1500 K. PASS. Behaviour change limited: `smooth` is read only by buildStrain,
  and before L21 expr_T was used only for k overrides; the only expr_T CTE leaves are the two new alternatives.
- **Si E<hkl> from Hall Cij**: s11 / s12 / s44 = 7.691 / -2.142 / 12.577 TPa^-1; E<100> / <110> / <111> = 130.024 /
  168.956 / 187.688 GPa; Hill E 162.579 GPa, nu 0.22305; 30 deg rotation C11' 187.135, C16' -12.410 GPa (test values).
  All match L21.
- **EMC derived nu**: (3K - E)/(6K) = 0.4209 glassy (K 15255, E 7239), 0.4961 rubbery (K 4679, E 108.3). Match.
- **Okada vs Swenson**: secant difference max 0.0495 ppm/K (200-600 K), instantaneous max 0.053 ppm/K at the Swenson
  nodes (see M5).

## 4. Policy compliance

- Provenance labels: digitized values carry "digitized 2026-10-21" with uncertainty in the locator and basis measured
  (same convention as the existing krupka2006 eps_r and motalab E leaves); Hall C12(T) basis derived; Prony / master
  curve basis derived with the fit method and residual stored; EMC nu derived with the two-test caveat. Compliant.
- CD1: silicone nu is basis template with analog_of, source, locator, rationale, and a sensitivity block. Bounds
  -0.045 / +0.004 deviate from the CD1 letter (+-0.05) for physical reasons (M8). The glassy-below-Tg caveat is stated
  in the note, but see S1.
- CD5: no template CTE added. The PDMS CTE alternative is basis measured on a different (same-class) material, as the
  library already does for other-grade alternatives (M9).
- ECCOBOND 3003 alternative: nu stays the 0.30 placeholder, with the reason (Tg 49 C, 4000 MPa at 25 C). Compliant.
- overrides.mjs fix: enumerated every library key (resolve at lo / mid / hi of valid_T_C, strict vs allowExtrapolation
  for that key): the admissibility outcome changes for silicone_adhesive only (strict threw at 250 C, E table ends at
  150 C). No other material changes behaviour; the check still refuses N/A or non-admissible stiffness.
- Quoted YAML ids: `"1.333965"` and `"09540910010331428"` quoted in `_sources.yaml` keys, paper_id and every `source:`
  use; no other unquoted numeric-looking source id in engine/data/materials; registry test added.
- Code: schema checkTier2 / tier2() accessor / units factor `1e12 dyn/cm2` = 1e11 Pa (correct) reviewed; see M10, M11.

## 5. RVE table

- `git show HEAD:` vs working tree: top-level fields byte-identical; 625 rows; 39 rows differ, exactly the 39 rows of
  homog:tsv:copper+silicon:{0.0021 (11), 0.0035 (17), 0.0079 (11)}; the other 586 rows byte-identical (JSON.stringify
  reproduces both files exactly, every row text located in order, non-row bytes identical). Keys, T_K, Tsf_K,
  topology, k, cp unchanged.
- 12 mechanical rows: C6, alpha6, rho, fp, fp_k changed; 27 conduction-only rows (C6 null): only fp_k changed.
- Magnitudes: C6 Frobenius norm-relative change max 3.30e-4 (L21 states <= 2.6e-4: M4), alpha6 max 6.5e-6, rho
  -4.26e-4 .. -4.16e-4 (Si density -4.29e-4).
- Fingerprints: 0 stale rows over the whole table against the current working-tree library. Independent live RVE of
  homog:tsv:copper+silicon:0.0035 at T 298.15 K, Tsf 423.15 K (table cfg n 32, q1im, richardson): C6, alpha6, rho
  identical to the table row (relative difference 0).

## Findings

### BLOCKING

None.

### SIGNIFICANT

**S1. silicone_adhesive nu 0.495 (PDMS rubbery analog) is applied over the whole E table, including the
glass-transition and glassy range, where it is not physical.**
- Evidence: resolve('silicone_adhesive') returns nu 0.495 at every temperature (no warning at -40 C). Implied bulk
  modulus K = E / (3 (1 - 2 nu)): 264 GPa at -65 C (E 7918 MPa), 194 GPa at -40 C, 82 GPa at 0 C, 11.9 GPa at 25 C
  (E 358 MPa), 1.73 GPa at 150 C (E 52 MPa). For comparison, the Sadeghinia 50 vol% silica-filled glassy epoxy has
  K 15.3 GPa (Fig. 9) and Si about 98 GPa. The E table itself shows the adhesive is not rubbery at 25 C (358 MPa is
  7x the 150 C value, 40 K above the TMA Tg of -15 C). Mueller's value is for unfilled PDMS in the rubbery state
  (MPa-range modulus). The yaml note restricts the caveat to "below Tg (-15 C)"; the 25-130 C range is also affected.
- Impact: the 120 mm stiffener-glue studies (s2 / sequence steps at 30-225 C, glue stress-free 130 C), the lid-attach
  adhesive of lidded families and the cowos_s ring adhesive: at 30 C the glue becomes almost incompressible
  (K about 11.5 GPa vs about 0.3 GPa with the old 0.30), changing peel / constraint near the room-temperature end;
  plus the volumetric-locking risk L21 flagged. Under nu 0.45 (the lower sensitivity bound) K at 25 C is 1.19 GPa.
- Proposed fix (decision for Wentao / coordinator, applied by the materials owner): (a) apply the analog only where
  the adhesive is rubbery (e.g. nu as a bilinear_tg / table_T leaf: 0.495 at and above the temperature where E reaches
  its rubbery plateau, the 0.30 placeholder or a wider band below), or (b) derive nu(T) from a sourced silicone bulk
  modulus (no source cached: a gap), and in either case (c) have L19 report the 0.45 bound alongside 0.495 for every
  case listed in "Cases expected to move". Extend the yaml note and `missing` to the transition range.
- Owner: L21 / materials-library owner (data), Wentao (CD4 follow-up decision), L19 (sensitivity runs).

### MINOR

- **M1. Wrong number in a note.** encapsulants.yaml emc.viscoelastic.shift.note: "with 200.5 K the 60 C value would be
  about +71". Eq. (9) with T0 = 200.5 K gives +41.6 at 60 C (+45.2 at 80 C). The conclusion (K reading refuted) holds.
  Fix: replace +71 by +41.6. Owner: L21.
- **M2. Ea rounding.** Ea = H ln10 / 2.30 = 401 x 1.0011239 = 401449.8 J/mol; stored 401448 (4.5e-6 relative; no
  effect). Fix optional: 401450. Owner: L21.
- **M3. Fourth Sadeghinia source defect not recorded.** In Fig. 12 the line styles are swapped against the legend: the
  dotted line labelled "WLF fit" is the Arrhenius curve (low-T branch; equals Eq. (9) to 0.00 at 24.9 C), and the
  dash-dot line labelled "Arrhenius fit" is the WLF curve (high-T branch; equals Eq. (10) at 85 C, -22.96 vs -22.99
  display, diverging toward its 63.4 C singularity). No data impact (L21 used the red shift-factor curve). Fix: add
  to the shift note and to the L21 transcription. Owner: L21.
- **M4. RVE change magnitude wording.** "norm-relative change C6 <= 2.6e-4" does not name the norm; Frobenius
  norm-relative max is 3.3e-4 (consistent with the Si Cij change, 3.4e-4). Fix: state the norm. Owner: L21 (notes).
- **M5. Loose claim.** silicon.yaml cte_okada1984 `use`: "within 0.05 ppm/K of the Swenson default at 200-600 K";
  instantaneous difference reaches 0.053 ppm/K at a Swenson node (secant max 0.0495; the notes and test say 0.06).
  Fix: "within 0.06 ppm/K". Owner: L21.
- **M6. Read 2004 test count.** Locator says "16 microtensile tests" (source text, p.67); Table 1 rows sum to 14
  (6 + 3 + 2 + 3). Source inconsistency; fix: note both in the locator. Owner: L21.
- **M7. Read curve preload.** read2004_film_curve starts at (strain 0, 11 MPa). Stated in `condition`, but a
  multilinear consumer will read a non-zero stress at zero strain. Fix: flag for the mech lane (subtract the preload
  or start at the first loaded point) when plasticity is wired. Owner: mech lane that consumes tier-2 plasticity.
- **M8. CD1 sensitivity letter.** silicone nu bounds -0.045 / +0.004 (0.45-0.499) instead of CD1 +-0.05; justified
  (nu < 0.5, sourced lower value) and documented; the test hard-codes the new delta. Needs a one-line coordinator
  acknowledgment in DevLog-012 CD4 (which still reads "silicone_adhesive nu uses the 0.30 placeholder for now").
  Owner: coordinator.
- **M9. Analog markers on alternatives.** cte_pdms_sylgard184 (PDMS for a filled adhesive) and the EMC tier-2
  viscoelastic block (model EMC for the generic emc entry, E0 6.43 GPa vs default E 18 GPa) state the analog in free
  text only (`use`, `material`); no machine-readable analog_of. Proportional scaling of the Prony set to the default
  grade is an open assumption (L21 open item). Fix: add `analog_of` on both. Owner: L21; scaling rule: viscoelastic
  engine lane.
- **M10. library.mjs comment placement.** The new tier2Data JSDoc and function were inserted between the existing
  JSDoc "Default library key for a 3D-template material key; `other` has no default and throws." and
  `aliasTemplateKey`, which now has no doc and the orphaned comment sits above tier2Data. Fix: move the insertion
  above the old comment. Owner: L21.
- **M11. tier2() Anand parameter filter and verified_on.** tier2Data builds `params` by excluding source / locator /
  note / condition, so any other field on an alternative (basis, use, verified_on) would leak into params; whitelist
  ANAND_PARAMS instead. New nested alternatives (three Zhang sets, cheng2000_sn35ag, read2004_film_curve) carry no
  verified_on, and the parent blocks keep verified_on 2026-10-20 after the 2026-10-21 additions. Owner: L21.

## Not checked

- Hall Fig. 2 (C') digitization (C12(T) derived from it); Sadeghinia Tables 2-3 (kinetics, DiBenedetto; notes only,
  not stored); Glassbrenner values outside 200-800 K (not stored); full engine suite (L21 reports 307/310, the 3
  failures in families tests from L18/L19 drift).
