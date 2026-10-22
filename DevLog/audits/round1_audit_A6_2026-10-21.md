# Audit A6 (round 1): L23 warpage input research, 2026-10-21

Fresh-context audit of `DevLog/research/2026-10-21-warpage-input-research.md` (lane L23; notes
`DevLog/lanes/L23-warpage-inputs.md`) before any validation target or sim case changes on its basis. Read-only on
data, sims, engine and configs (this file is the only write). Page renders and embedded-image extracts at 150-600 dpi
with uv + pymupdf, a membrane-CTE script that calls the engine generator and the materials library (both read-only),
all in the session scratch dir (not tracked). Web reads: 4 fetches (PMC Cheng 2021 twice, NIST Kim and Ledbetter
abstract, WebElements indium), sequential, open access only.

Severity: **BLOCKING** = a wrong value or sign that would enter a target or case as written; **SIGNIFICANT** = wrong
or selectively cited evidence that changes a conclusion's confidence or a change-list item; **MINOR** = locator,
labelling or precision.

## Verdicts

| Priority claim | Verdict | Confidence |
|---|---|---|
| 1 cowos_s target sign (00135) | CONFIRMED: the JEITA targets are +198 um at 25 C and -153 um at 250 C (TV1; TV2 +250 / -173). The engine's -340 um is a sign miss, not a +71 % magnitude miss | High (about 95 %) |
| 2 cowos_l 00091 sign | Conclusion plausible (JEITA +64 / -148 if the moire was viewed from the bump side), but the cited evidence is partly wrong (00091 RT map is not "centre low"; 00026 Fig. 8(a) is a CoW-die component, not a package) and the "every lidded / ringed package is a dome" prior has a counterexample in the corpus. Confidence L-M, not M | Low-medium |
| 3 substrate effective CTE | CONFIRMED: recomputed model membrane CTE 9.6 (cowos_s), 8.9 (cowos_l), 9.5 (120 mm), 14.6 (Xilinx, already L9) ppm/K vs sourced 15 / none / 11.97 / "close to Cu". L23's hand estimate (8.7-9.6, ~9.3) holds within 0.3 ppm/K | High (numbers); medium (that it is the common cause) |
| 4 spot checks | 26 values checked; 0 wrong numbers; 4 page-locator errors; 3 statements not supported by the cited source | - |
| 5 facts vs inference | Mostly well labelled; 3 selective / unsupported items (Intel moire omitted, 120 mm Cu RT bowl omitted, Sadeghinia "before gelation"), 1 mild circularity | - |

Error counts: BLOCKING 0, SIGNIFICANT 3, MINOR 10.

## Priority 1: cowos_s target sign (ectc51909.2023.00135, MediaTek)

Evidence read (p.2 render at 150 dpi, Fig. 4 legend and maps at 600 dpi, embedded images):
- Fig. 4 legend: "(-) Convex" pictogram = module (light green) over substrate (dark green), arched centre-up, grey BGA
  balls hanging below (live bug): a dome. "(+) Concave" = the same stack sagging centre-down, balls below: a bowl.
- Fig. 4 caption: "Package warpage contour plots (BGA side is up)". RT maps (TV1 -198, TV2 -250): dark blue centre,
  yellow / red periphery; 250 C maps (153, 173): light centre, dark blue periphery. With the usual jet map (blue = low)
  and the BGA side up, RT = BGA side concave = die side convex = dome; 250 C = bowl. Consistent with the legend.
- Text p.2 Sec. III.A: "Both packages were convex warpage shape at room temperature but turned to a concave shape at
  250 C." Consistent.
- Same lead author (Laurene Yip), ectc51906.2022.00232 p.3 Fig. 6: RT pictogram = dome with balls down labelled "(+)",
  250 C bowl labelled "(-)", same contour look (centre blue at RT). The physical shape is the same; only the printed
  symbol differs between the two papers. Confirmed.

Engine convention: `engine/src/mech/post.mjs` `JEITA_SIGN_CONVENTION` and `warpage()`: + = top (+z, non-interconnect)
surface convex (dome, centre up), sign = sign(AB_max + AB_min + CD_max + CD_min) of the deviation of u_z from the
diagonal chords, viewed from +z; the cowos_s generator puts the substrate at the bottom (sbt_sr_b at z = 478 um) and the
ring / dies above, so +z = die side. The target surface `bottom:sbt_sr_b` is still signed from the +z view. The mapping
paper (-) = physical dome = engine + is therefore geometric and does not depend on the JEITA text (which L23 confirmed
only from a search extract). JESD22-B112 is not coded anywhere in the engine (grep); SPEC section 16 adds only the
`requires_shape_class` gate; `validation/README.md` item 7 already requires a per-paper sign mapping.

How the target is encoded now:
- `data/metrics.csv` rows -a-m1 = -198, -a-m2 = 153 (TV1), -b-m1 = -250, -b-m2 = 173, scope "package, BGA side up;
  - = convex, + = concave per Fig. 4 legend": a correct transcription of the printed sign, with no physical / JEITA
  mapping.
- `sims/cowos_s/warpage_corner_stress.yaml` targets reference the metric_id with no `value`, so `expectedFor`
  (`engine/src/thermal/case.mjs`) takes -198 from the metrics lookup; the assumption text says the paper sign is
  "compared with the JEITA ED-7306 sign on the substrate bottom" (no mapping).
- `validation/RESULTS.md` row 50: -198 vs -339.5, "miss (+71 %)".

Conclusion: JEITA +198 um at 25 C and -153 um at 250 C (TV1). Residual doubt (about 5 %): the colormap direction is
assumed (no colour bar legible), and a pictogram can be drawn wrongly by authors; but legend, text, contour maps, the
2022 paper of the same group and the physics (no-ring engine +535 dome, Si-rich module on organic) all agree.

## Priority 2: cowos_l 00091 sign

- ectc51687.2025.00026 p.3 Fig. 8(a) is "CoW warpage behavior" (the chip-on-wafer component before substrate attach,
  text p.3 Sec. III.B "The CoW die Moire and substrate Moire behaviors ... Figure 8 (a) and Figure 8 (b)"), not a
  package. Its pictograms (zoomed): + (RT end) = bar curved centre-down with bumps on the upper (concave) side; - (HT)
  = bar curved centre-up, bumps on top. RT map centre dark blue / corners red (+), HT map centre red / corners blue (-).
  So in that figure + = viewed surface centre-low, viewed from the bump side. L23's reading of Fig. 8(a) is correct;
  that it is a component curve is not stated.
- 00026 package-level figures (Fig. 10, 12, 13) give only magnitudes (A, 1.3A, B, 0.75B mils) and diagonal profiles
  without a sign key: no package-level sign convention in 00026.
- 00091 Fig. 6(c) lid TV (raster 276 x 251 px, upscaled): RT (+64) is saddle-like: two opposite edges red, the other
  two edges dark blue, centre cyan (intermediate). It is not "centre low". The validation case
  (`validation/cases/D/ectc51909.2023.00091-cowos_l.yaml` why_sign_agnostic) and L9 already call it saddle-like. The HT
  map (-148) is W-like (corners high, low annulus, raised centre).
- Better in-paper evidence, not used by L23: 00091 p.4 Fig. 7(c) ring TV_4.8x: RT +186 = clean centre-low (dark blue
  centre), HT -107 = clean centre-high. Within 00091 the printed + therefore means the viewed surface is centre-low,
  the same rule as 00026 Fig. 8(a). This refutes L9's implicit assumption (+ = viewed convex, Akrometrix-style), but
  not the view-side question: viewed from the bump side, +64 = JEITA dome; viewed from the lid side, +64 = JEITA bowl.
  00091 states no view side; the bump-side view rests only on the 00026 analogy.
- Dome prior ("every lidded or ringed large 2.5D package in the corpus that states its RT shape is a dome"):
  - Confirmed as cited: 001c.147115 (Amkor, IMAPS 2025) p.4 Fig. 7, "+ Convex Positive" pictogram = dome with balls
    below; finished package about +105 at 25 C, -196 at 240 C, about -213 at 260 C (plot read), measured from the BGA
    side, dead-bug profiles; ectc51909.2023.00135 Fig. 4; ectc51906.2022.00232 Fig. 6. Also supporting, not cited:
    ectc51906.2022.00108 p.2 (Samsung, "cry-shaped warpage at room temperature" of the molded interposer on substrate,
    stiffener compensates) and 001c.147115 Fig. 9 (FEM, all legs "Cry (+)" at RT incl. lid and stiffener legs).
  - Counterexample omitted: ectc51529.2024.00155 p.5 Fig. 11 (120 mm 2.5D package with stiffener, shadow moire,
    icon + = centre up): Cu stiffener -330 um at 30 C (bowl), SUS430 +485 um (dome); DB rows -a-m16..m19 and the Cu
    rows; L23 itself lists "RT - for Cu" under Case 6. View side unstated, but the paper's own mechanism text
    (ectc51687.2025.00027 p.4) explains the Cu bowl by Cu CTE > substrate CTE (11.97 ppm/C). So a ring / lid with CTE
    above the substrate does overturn the module dome at RT in a measured large package; the prior is conditional on
    the substrate CTE, not universal.
- Verdict: JEITA +64 / -148 is plausible (L-M), contingent on a bump-side view. Keep the cowos_l targets
  sign-agnostic (as L23 recommends); do not cite the RT map as "centre low".

## Priority 3: substrate effective CTE

Sourced values re-read: ectc51529.2024.00155 p.3 Sec. II.C "Substrate A (CTE: 11.97 ppm/°C) and Substrate B (CTE:
12.81 ppm/°C)" (Shinko-made; method not stated; same values ectc51687.2025.00027 p.2 Sec. II.B); 00135 p.3
Sec. III.E "substrate CTE (~15 ppm/K)"; ectc51906.2022.00108 p.2 "organic substrate CTE is 13~20ppm"; ectc.2011.5898527
p.3 "CTE of copper is close to substrate's CTE". All quotes correct (one page locator wrong, see M1).

Recomputed model membrane CTE (formula: CLT in-plane laminate, A = sum_k Q_k t_k, N = sum_k Q_k alpha_k t_k,
alpha_eff = A^-1 N with Q_k the plane-stress reduced stiffness of layer k (orthotropic for the homogenized Cu routing
levels), bending coupling ignored; alpha_k = library secant CTE rebased from the case Tsf to 25 C; layers = the
generator's `host: substrate` layer boxes with the case params, map and overrides; homog keys resolved by the library
in its default rve mode. Second column: plain E*t-weighted alpha_x as a first check.)

| Case | Tsf (case) | CLT alpha_x / alpha_y (ppm/K) | E*t-weighted (ppm/K) | Sourced effective CTE |
|---|---|---|---|---|
| cowos_s/warpage_corner_stress (85 mm, 1.3 mm core_lowcte, 2+2 build-up) | 150 C | 9.58 / 9.58 (rom mode 9.76) | 9.23 | ~15 (00135) |
| cowos_l/warpage_rt_ht (91 mm, 3-2-3, 1.4 mm core) | 150 C | 8.92 / 8.84 | 8.65 | none for 00091 (corpus 11.97-20) |
| si_interposer_peers/120mm_warpage and _cu (8-2-8, 1.4 mm core, Table IV overrides) | 170 C | 9.47 / 9.47 | 9.05 | 11.97 (Substrate A) |
| si_interposer_peers/xilinx_tsv_lid (800 um core, 11 ppm/K override) | 150 C | 14.55 / 14.55 | 14.22 | "close to" Cu 17 |

The Xilinx value reproduces L9's 14.5 ppm/K, which validates the script. Sensitivities (same method): 120 mm core
1.0 mm -> 12.29, 0.8 mm -> 14.28 (total held at 1.8 mm, so the 65 ppm/K Table IV dielectric thickens); build-up Cu
20 um -> 10.12; cowos_s core 0.8 mm -> 14.18.

Verdict: L23's estimate holds (8.7-9.6 for 120 mm vs 9.05-9.47; ~9.3 for cowos_s vs 9.23-9.58; cowos_l 8.65-8.92).
The ordering consequences hold: Cu ring / lid mismatch about 7.5-8.2 ppm/K in the model vs about 2 (cowos_s at 15);
SUS430 11 > 9.47 in the model vs 11 < 11.97 in the paper. That it is the common cause of the misses remains a
hypothesis until L19 runs the variants. Note for item 2: the 120 mm core CTE (5.9 ppm/C, Substrate A) and modulus are
reported (Table IV), so the stated 11.97 must be reached through template inputs (core thickness about 1.0-1.1 mm in
this stack, or build-up Cu), not a library core alternative.

## Priority 4: spot checks (26 values)

| # | Value (L23) | Source re-read | Result |
|---|---|---|---|
| 1 | ring width 8.6-10.1 mm (47 / 49 / 42 px of 413 px) | 00135 p.2 Fig. 2 embedded image 413 x 417 px; red-channel profiles: L 48, R 48, T 43, B 44 px | OK (8.8-9.9 mm with an 85 mm frame). Scale check: HBM in photo 48-50 px = 9.9-10.3 mm vs Table I 11 x 10 mm |
| 2 | Cu ring thickness 2.5 mm | ectc51906.2022.00232 p.2 Table I "Ring Thickness (mm) 2.5 / 2.5", foot widths 13/10 and 17/19; p.2 text "copper stiffener ring" | OK |
| 3 | Intel FEM +338 / -292 / -293 / -208 um | ectc51687.2025.00187 p.4 Fig. 9(a) (image read) | Numbers OK; moire bars omitted (S3) |
| 4 | 120 mm stiffener 28 x 30 mm, 2.0 mm, glue 130 C 0.5 h, CUF 170 C 2 h | 00155-2024 p.5 Fig. 11 caption; p.3 Sec. II.E | OK; page p.3 not p.2 (M1) |
| 5 | Tsf 180 C (00027) | ectc51687.2025.00027 p.3 Sec. II.E "The stress-free temperature was set at 180°C"; CUF 165 C p.3 Sec. II.B | OK; page p.3 not p.2 (M1). "LTS build": LTS joints are one of four studied (p.1-2), fine |
| 6 | SUS430 mechanism quote | 00027 p.4 Sec. III.B | OK verbatim |
| 7 | 11.97 / 12.81 ppm/C | 00155-2024 p.3 Sec. II.C | OK; page wrong (M1) |
| 8 | Sadeghinia 2.1 / 3.4 vol% | j.ijadhadh.2011.10.007 p.4 Sec. 2.3.1 | OK; "mostly before gelation" not in source (M2) |
| 9 | Sadeghinia Eg 7239 / Er 108.3 MPa, Tg tan delta 121 C, ratio 0.015 | p.6 Table 5 | OK |
| 10 | JOINT2 EMC E1 18000 / E2 400, ratio 0.022; shrinkage 0.16; Tg 140 | ectc51909.2023.00155 p.3 Table 8 (400 dpi render) | OK |
| 11 | insulation layer Tg 233, E 32,000 MPa, alpha1 65, shrinkage 21 % | same render | OK as printed (M9) |
| 12 | PI cured 230 C 2 h, 3 um, on carrier | 00155-2023 p.4 Sec. III (1) | OK |
| 13 | mold schedule C-mold 140 C 900 s, PMC 175 C 5 h; MUF 120 C, PMC 150 C 1 h | p.3 Table 7 | OK |
| 14 | Tsf 150 C "where the EMC was cured and the material properties became stable" | p.3 Sec. II.E | OK |
| 15 | SR thickness 18 / 18 (design), measured 18 / 17 / 17 | 00155-2023 p.2 Table 3 (top 18, bottom 18); p.6 Table 11 one SR row: design 18, A 17, B 17 | Values OK; the measured row is not per side (M5) |
| 16 | Samsung 13~20 ppm, adhesive < 100 um, Table III 10n / 580n / 1140n and 5n / 120n / 28n, 150 -> 180 C | ectc51906.2022.00108 p.2; p.4 | OK (ratios 0.5 / 0.21 / 0.025) |
| 17 | MediaTek ~15 / ~20 / ~4 ppm/K | 00135 p.3 Sec. III.E | OK |
| 18 | Xilinx "CTE of copper is close to substrate's CTE"; Tsf 150 C at UF cure; "pre-stress" | ectc.2011.5898527 p.3 Sec. a; p.2-3 | OK |
| 19 | 00174 "novel film type thermal interface material (TIM)" | ectc51909.2023.00174 p.2 Sec. II.B | OK |
| 20 | 00085 "metal sheet TIM will be soldered", BLT 200 um, lid k 390 | ectc51687.2025.00085 p.2-3; p.3 Table 3 (image) | OK; lid material not named (M8) |
| 21 | 00091 keywords "COP, metal TIM"; lid 91 x 91 x 2 mm; "65 um at RT and ~150 um at 240°C" | 00091 p.1, p.3 | OK |
| 22 | Amkor +105 / about -210, ratio -1.9 at 240 C; lid Table I | 001c.147115 p.4 Fig. 7 (plot read: +105, -196 at 240, -213 at 260) | OK |
| 23 | Shinko Tsf 180 C bare / 150 C assembled; Ajinomoto "minimal warpage", Cu 93 %, UF 165 C | ectc51687.2025.00178 p.2; ectc51687.2025.00148 p.2-3 | OK |
| 24 | Cheng 2021: 0.09 % volumetric; Tsf = EMC cure temperature | PMC8432544 (fetched 2026-10-21) | Quotes OK; attribution and 1/3 rule overstated (M3) |
| 25 | indium E 11 GPa (WebElements), nu 0.45 (Kim and Ledbetter 1998), melting 429.784 K | fetched; library tim_indium note | OK as cited; set mutually inconsistent with the In10Ag bulk modulus (M7) |
| 26 | engine spreads (L3 wave 5 cowos_l, L3 wave 6 120 mm, L9) | DevLog-012 L3 wave 5 list; L3 notes wave 5 and wave 6 tables; L9 notes | OK |

## Findings

### SIGNIFICANT

**S1. cowos_l sign evidence mis-described (headline 2, Case 1 row "View side / sign").** The 00091 Fig. 6(c) RT map
is saddle-like, not "centre low, two opposite edges high" in the sense of the 00026 bowl; 00026 Fig. 8(a) is the CoW
die, not a package. Correction (replace the evidence sentence and lower confidence to L-M):
"00091 itself fixes the printed-sign rule through the ring TV (p.4 Fig. 7(c): RT +186 centre-low, HT -107
centre-high), i.e. + = viewed surface centre-low, the same rule as the TSMC CoWoS-R CoW-die curve (00026 p.3 Fig. 8(a),
bump side up in the pictograms). The lid-TV maps are saddle-like (RT) and W-like (HT). The view side is not stated in
00091; if it is the bump side (as drawn in 00026), JEITA = +64 / -148, otherwise -64 / +148. Confidence L-M." Replace
"This weakens L9's ball-side view hypothesis" by "This refutes L9's assumed sign rule (+ = viewed convex) but leaves
the view side open."

**S2. Dome prior stated as universal; a measured counterexample is omitted (headline 2, Case 1 row "RT shape").**
ectc51529.2024.00155 p.5 Fig. 11: Cu-stiffened 120 mm 2.5D package -330 um at 30 C with the icon + = centre up
(bowl), mechanism Cu CTE > substrate CTE (00027 p.4). Correction: "Measured large 2.5D packages with a lid or ring are
domes at RT where the ring / lid CTE is at or below the substrate's (Amkor 72 mm lid, MediaTek Cu rings on ~15 ppm/K
substrates, SUS430 on 11.97 ppm/C); the 120 mm Cu stiffener on an 11.97 ppm/C substrate is a bowl at 30 C (-330 um,
00155-2024 Fig. 11, view side not stated). The prior is conditional on the ring / substrate CTE order." This also
makes headline 3 testable: the same paper shows both RT signs depending on that order.

**S3. Intel 00187 Fig. 9(a) cited selectively (Case 1 TIM row; change item 4).** The same figure shows measured
moire at RT for the STIM legs of +241 / +238 / +224 um (BLT 180 / 230 / 180 um), PTIM +77, optimized +98 / +93 / +89,
HT +104; no sign convention is stated and all moire values are positive (possibly unsigned). The FEM sign flip to
-292 / -293 / -208 is not borne out in sign by the paper's own measurement. Correction: cite both series; item 4 text
"the Intel FEM says a metal TIM pushes RT negative" -> "the Intel FEM predicts an RT sign flip with solder TIM
(-208 to -293 um), while the paper's moire for the same legs reads +224 to +241 um (convention not stated, possibly
unsigned); the TIM variant is a sensitivity, not evidence for either sign."

### MINOR

- **M1. Page locators.** ectc51529.2024.00155: Sec. II.C (11.97 / 12.81) and Sec. II.E (CUF 170 C, 2.0 mm stiffener,
  glue 130 C) are on p.3, not p.2 (headline 3, Case 6 rows 1, 4, 5; 7b table). ectc51687.2025.00027 Tsf 180 C is p.3
  Sec. II.E, not p.2.
- **M2. Sadeghinia "mostly before gelation" (Case 5)** is not in the source (no gel statement; the paper models cure
  shrinkage as linear in conversion, p.4 Eq. (3), Fig. 6). Delete, or label `inferred` with its basis.
- **M3. Cheng 2021 (Case 5):** the paper says "The measured volumetric change data provided by the manufacturer was
  applied" and, separately, "It was reported that ... would cause a 0.09% volumetric shrinkage" (gel point to full
  cure); the 1/3 rule is Eq. (9) of the shrinkage-strain definition, not a stated application of the 0.09 %. Rephrase:
  "manufacturer volumetric data applied; 0.09 % volumetric reported for gel-to-full cure; linear strain = 1/3 of the
  volume change by Eq. (9)".
- **M4. SR Tg range "121-185 C" (headline 6, 7a):** 185 C is not traceable to a listed source. Sourced: 140 C
  (ectc51846.2026.00119 p.4), 151 C (00155-2024 Table IV), 130-180 C (US9389504B2), CTE break 81-121 C
  (tcpmt.2025.3614186, a CTE table break, not a stated Tg). Correct to "121-180 C".
- **M5. SR "measured 17-18 um each side" (Case 3):** the measured table (00155-2023 p.6 Table 11) has one SR row
  (design 18, A 17, B 17), not per side; per-side equality rests on design Table 3 only. Reword.
- **M6. cowos_s ring width (Case 4, item 3):** the same author's ring foot widths are 13 / 10 mm (74 mm package) and
  17 / 19 mm (91 mm) (00232 Table I, already cited for thickness). Use bounds 8.6-19 mm with the photo value 9 mm as
  nominal, not 9 mm alone.
- **M7. Indium property set (Case 1, item 4):** E 11 GPa with nu 0.45 implies K = E / (3 (1 - 2 nu)) = 36.7 GPa; the
  cited In10Ag bulk modulus 15.5 GPa with E 11 GPa implies nu = 0.38. Take E and nu as a pair from one source and state
  that Kim and Ledbetter is a low-temperature study whose abstract gives no room-temperature E. Do not mix In10Ag K.
- **M8. TSMC lid "Cu" (Case 1 Lid row):** 00085 Table 3 gives lid k = 390 W/(m K), no material name: label the Cu
  reading `inferred` (from k).
- **M9. 50 mm insulation layer E 32,000 MPa (Case 5):** as printed (Table 8, verified at 400 dpi); atypically stiff
  for a 3 um liquid polyimide (auditor inference). Add "as printed; plausibility unverified" next to the 21 % note.
- **M10. Mild circularity (headline 3):** "single most likely common cause of the cowos_s, cowos_l and 120 mm misses"
  counts cowos_l as a sign miss, which depends on the view-side inference of headline 2. State it for cowos_s and
  120 mm (sign / order evidence in the papers) and mark cowos_l as conditional.

No item looked recalled from memory without a source: every number traced to a paper, a fetched page or the engine
notes, except the three unsupported statements above (M2, M4 upper bound, S2 universality).

## L23 change list (9 items): disposition

| Item | Disposition | Required change |
|---|---|---|
| 1 cowos_s targets to JEITA | **Safe, apply** | Implement as target `value` on a-m1 (+198, 25 C) and a-m2 (-153, compared at the CD6 225 C ceiling) with provenance (status derived, ref the metric_id, note "paper sign inverted vs JEITA per Fig. 4 legend"), since the metrics lookup returns the printed -198. Keep metrics.csv values as printed; coordinator adds "physical: (-) = dome, balls down; JEITA = -1 x printed" to the scope of -a-m1/m2, -b-m1/m2. Fix the case assumption text. RESULTS row 50 becomes a sign miss |
| 2 membrane-CTE check, sourced variants | **Apply with changes** | Check done here (table above). Variants: cowos_s to ~15 (e.g. core 0.8 mm gives 14.2; template inputs only); 120 mm to 11.97 via template core thickness (about 1.0-1.1 mm) or build-up Cu, not a library core alternative (the Table IV core 5.9 ppm/C is reported); cowos_l has no sourced value: use 11.97-15 as a labelled related bound; Xilinx is already 14.55 (see item 7) |
| 3 cowos_s ring geometry and attach | **Apply with changes** | Ring width bounds 8.6-19 mm (photo nominal 9; same-author foot widths 10-19 mm); thickness 2.5 mm analog OK; adhesive < 100 um and attach 150 C (130-180) OK as labelled variants, after items 1-2 |
| 4 cowos_l lid stage, TIM variants | **Apply with changes** | Process sequence and bounds OK. Drop the Intel-FEM rationale or cite both FEM and moire (S3); consistent indium E / nu pair (M7); report only, targets stay sign-agnostic (S1) |
| 5 120 mm | **Safe after item 2** | Tsf 180 C locator p.3 (M1); substrate at 11.97 via item 2's route |
| 6 50 mm | **Safe, apply** | Add "E 32 GPa as printed" note (M9) |
| 7 Xilinx lidded | **Foot 2 mm: safe as a labelled L variant. Substrate-at-Cu-CTE: do not apply as a sourced variant** | The core (800 um, 18.9 GPa, 11 / 16 ppm/K) is reported (Table 2); only template build-up could move the 14.55 model value, and "close to" gives no number. Keep it as a diagnostic (L9's lid-CTE diag +44.3 already covers it) |
| 8 bare substrates SR opening | **Safe (optional)** | none |
| 9 SR ceiling unchanged | **Safe** | Fix the Tg range text (M4) |

## Progress log

- 2026-10-21 18:30 PDT: DevLog-013, L23 deliverable and notes read.
- 2026-10-21 18:35 PDT: 00135 Fig. 4 legend / maps (600 dpi), 00232 Fig. 6, engine sign code, case, metrics, ledger.
- 2026-10-21 18:40 PDT: 00026 Fig. 8 / 10 / 12 / 13, 00091 Fig. 6(c) / 7(c), Amkor Fig. 7 / 9, Intel Fig. 9(a), 120 mm
  Fig. 11; corpus search for RT shape statements near lid / ring.
- 2026-10-21 18:45 PDT: membrane-CTE recompute (4 cases, sensitivities); spot checks; 4 web fetches.
- 2026-10-21 18:50 PDT: report written. No data, sims, engine, config or git writes; no subagents.
