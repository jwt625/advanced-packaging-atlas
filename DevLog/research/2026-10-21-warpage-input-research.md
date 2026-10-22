---
title: Warpage input research - sourced values for the inputs that drive the package warpage misses
date: 2026-10-21
status: done (research only; L19 applies the changes)
scope: cowos_l/warpage_rt_ht, si_interposer_peers/xilinx_tsv_lid, fcbga_organic and glass_core_substrate bare substrates, cowos_s/warpage_corner_stress, si_interposer_peers/50mm_quarter(_e2), si_interposer_peers/120mm_warpage(_cu), solder resist above 225 C, stress-free temperature practice
owner: lane L23 (DevLog-013); notes DevLog/lanes/L23-warpage-inputs.md
---

# Warpage input research (L23, 2026-10-21)

Method: every page and figure of the source papers re-read (page renders, embedded images extracted and zoomed),
companion papers found by grep over all cached `text.md` (TSMC, MediaTek, JOINT2, Amkor, Samsung, Intel, Shinko,
Ajinomoto), DB rows checked, then public web sources at a modest pace (one MDPI page returned 403 and was not retried;
Taiyo's old datasheet URLs now redirect to a news index; web.archive.org is not reachable from this tool).

Conventions: JEITA ED-7306 sign as coded in the engine, + = dome (top, non-interconnect surface convex). The JEITA rule
itself was confirmed only from a search extract of https://home.jeita.or.jp/tsc/std-pdf/ED-7306_E.pdf (retrieved
2026-10-21): "convex ... top surface (the side opposite the interconnects) ... plus"; package sign from the diagonal
sum rule. Basis labels: `paper` = reported in this paper, `related` = reported in a related paper, `datasheet`,
`standard`, `inferred` (my reading or arithmetic; stated as such). Confidence: H / M / L.

Spreads cited below are the existing engine runs: L3 wave 5 (cowos_l: Tsf 90 C -128 / +350 um; TIM E x0.1 +158 /
+43; TIM E x10 -603 / +300; Al lid -612 / +488; base -250.7 / +187.6 at 25 / 240 C), L9 (cowos_l no lid +534 at 25 C;
cowos_s ring removed +535 vs base -341; Xilinx foot decoupled +101.8, lid CTE = substrate membrane CTE +44.3; 50 mm
EMC shrinkage as an equivalent CTE -150 vs -189; fcbga bare top SR removed +28 um), L3 wave 6 (120 mm SUS430 sequence
+184 / +165 / +210 / +230; glue 50-300 um changes it <= 10 %).

## Headline findings

1. **cowos_s target sign is inverted in the case (fact from the figure, H).** ectc51909.2023.00135 (MediaTek, not
   TSMC) Fig. 4 legend draws "(-) Convex" as a dome with the balls down (live bug), and the RT contour maps (BGA side
   up) show the centre low, i.e. the die side convex. Text p.2: "Both packages were convex warpage shape at room
   temperature but turned to a concave shape at 250°C." The measured RT state is a dome: JEITA +198 um (TV1), and
   -153 um at 250 C. The case compares -198 directly with the engine's JEITA value, so the engine's -340 um bowl is a
   sign miss, not a +71 % magnitude miss. Same author's 2022 paper (ectc51906.2022.00232 p.3 Fig. 6) draws the same
   RT dome as "(+)", so the sign symbol changed between the two papers while the shape did not.
2. **TSMC moire convention = JEITA sign, viewed from the bump side (M).** ectc51687.2025.00026 (TSMC CoWoS-R; shares
   author Chien-Hsun Lee with ectc51909.2023.00091) p.3 Fig. 8(a): the + pictogram is a smile with the bumps on the
   concave upper side (bump side up), and the + RT map shows the centre low. That is the non-interconnect side convex,
   i.e. JEITA +. The 00091 Fig. 6(c) RT map (+64) has the same pattern (centre low, two opposite edges high). Combined
   with the physics prior (every lidded or ringed large 2.5D package in the corpus that states its RT shape is a dome:
   Amkor 72 mm lid, MediaTek 74 / 85 / 91 mm Cu rings), the CoWoS-L lid TV at RT is most likely a
   dome (JEITA +64). This weakens L9's "ball-side view, sign reversed" hypothesis: the engine's RT bowl is a physics /
   input miss.
3. **The model substrates are probably far below the stated effective substrate CTEs (inferred, M).** Stated values:
   JOINT2 Substrate A 11.97 / B 12.81 ppm/C (ectc51529.2024.00155 p.2 Sec. II.C), MediaTek ~15 ppm/K
   (ectc51909.2023.00135 p.3 Sec. III.E), Samsung "13~20ppm" (ectc51906.2022.00108 p.2 Sec. II.A), Xilinx "CTE of
   copper is close to substrate's CTE" (ectc.2011.5898527 p.3). My membrane-CTE estimate of the template stacks
   (core_lowcte 33 GPa / 5.9-6.9 ppm/K at 1.3-1.4 mm dominating, thin build-up; Cu fraction 0.4-0.8 assumed) is
   8.7-9.6 ppm/K for 120 mm and about 9.3 ppm/K for cowos_s. If the engine confirms this, every metal ring / lid in
   these cases (Cu 17, SUS430 11 ppm/K) sees the wrong mismatch: too large for Cu (strong bowl at RT: cowos_s,
   cowos_l) and the wrong sign for SUS430 (11 > ~9 in the model, 11 < 11.97 in the paper). This is the single most
   likely common cause of the cowos_s, cowos_l and 120 mm SUS430 misses. L19 must compute the model membrane CTE
   (L9's subcte method) before acting; my numbers are hand estimates.
4. **CoWoS-L lid TIM may be metal (keyword only, L).** ectc51909.2023.00091 p.1 keywords include "metal TIM"; the
   CoWoS-L lid-type package uses "a novel film type thermal interface material (TIM)" (ectc51909.2023.00174 p.2 Sec.
   II.B); TSMC solders indium TIM between CoW die and lid with backside metallization (ectc51687.2025.00085 p.2 Sec.
   III, BLT 200 um, p.3). Neither says what the 00091 lid TV used. A metal TIM couples the lid stiffly at RT and is
   molten above 156.6 C (indium), which changes both studies.
5. **120 mm: the paper's own mechanism is the CTE order SUS430 < substrate (fact, H)**: "In the case of SUS430, the
   CTE was smaller than that of the substrate, which is thought to have caused the substrate side to expand, leading
   to a gradual concave shape" (ectc51687.2025.00027 p.4, companion with the same TV family). Stiffener width for the
   measured Fig. 11 curve: 28 mm x 30 mm (ectc51529.2024.00155 p.5 Fig. 11 caption).
6. **Solder resist above 225 C: no sourced E(T) found** (gap). Sourced above-Tg CTE values exist (bilinear models with
   no upper limit stated). Every SR Tg found is 121-185 C, so 225-265 C is on the rubbery plateau in all sources.

## Case 1: cowos_l/warpage_rt_ht (ectc51909.2023.00091-a, +64 um 25 C / -148 um 240 C)

Facts read in the paper (all 5 pages): lid 91 x 91 x 2 mm (Fig. 6(c) header); substrate "3-2-3, 1.4 mm-core" (p.3
Table 1, already in the case); keywords "COP, metal TIM" (p.1); Fig. 6(a) illustration: flat lid plate over the dies,
dummy dies and side mold, a thin layer under the lid, no foot drawn; no lid / ring material, TIM, adhesive, cure
temperature, stress-free temperature, method or view side anywhere in the text or figures. Text p.3 Sec. II.A: "65 um
at RT and ~150 um at 240°C".

| Input | Value | Unit | Basis | Source (locator, quote) | Conf. | Expected effect (existing spreads) |
|---|---|---|---|---|---|---|
| View side / sign | BGA (bump) side viewed; + = bump-side smile = JEITA + | - | related (inferred transfer) | ectc51687.2025.00026 p.3 Fig. 8(a) pictograms (bumps on the concave side for +), RT map centre low; shared author C.H. Lee | M | Target stays +64 / -148 in JEITA; the engine RT bowl (-250.7) is a physical sign miss. Supports keeping signed comparison as information next to the sign-agnostic gates |
| RT shape of lidded / ringed large 2.5D | dome at RT, bowl at reflow | - | related | 001c.147115 p.4 Fig. 7 (Amkor 72 mm lid, finished package about +105 um at 25 C and about -210 um at 250-260 C, read from the plot +-10 um, ratio about -1.9 at 240 C; "Convex Positive" pictogram balls down; measured BGA side, dead bug); ectc51909.2023.00135 p.2 Fig. 4; ectc51906.2022.00232 p.3 Fig. 6 | H (shape) | Physics prior: the lid / ring term in real packages does not overturn the module dome at RT |
| Lid material | Cu (TSMC CoWoS lid, k 390 W/(m K)) | - | related | ectc51687.2025.00085 p.3 Table 3 row Lid "390" (CoWoS-R thermal TV); the 00091 lid itself is unstated | M | Current template Cu kept; Al lid spread -612 / +488 says the material matters, Cu is the sourced analog |
| Lid thickness / size | 2 / 91 x 91 | mm | paper | ectc51909.2023.00091 p.3 Fig. 6(c) header "Lid: 91mmx91mmx2mm" | H | already in case |
| TIM type | metal TIM (keyword); CoWoS-L lid type uses a "film type" TIM | - | paper (keyword) + related | 00091 p.1 keywords "metal TIM"; ectc51909.2023.00174 p.2 Sec. II.B "a novel film type thermal interface material (TIM) is inserted between lid and CoW die"; ectc51687.2025.00085 p.2 Sec. III "metal sheet TIM will be soldered in between the dies and the lid" | L | If In metal: RT coupling >> 5.8 MPa film; L3 spread TIM E x10 gives -603 at 25 C (further from +64); at 240 C indium is liquid (TIM E ~ 0), so s3 approaches the decoupled state. Intel FEM of a large lidded 2.5D (ectc51687.2025.00187 p.4 Fig. 9(a)) shows the RT sign flip from polymer TIM (+338 um) to solder TIM (-292 / -293 / -208 um), same direction as the engine's lid term |
| Indium E, nu, melting | E about 11 GPa (secondary); nu 0.45; melting 156.6 C | GPa / - / C | handbook (secondary) | E: WebElements indium page (search result, retrieved 2026-10-21; not a primary source); nu: Kim and Ledbetter, Mater. Sci. Eng. A 252(1) 1998 abstract (https://www.nist.gov/publications/low-temperature-elastic-constants-polycrystalline-indium, retrieved 2026-10-21) "The Poisson ratio is unusually high: 0.45"; melting: library tim_indium note 429.784 K; In10Ag supplier bulk modulus 15.5 GPa (Amkor blog, https://semiengineering.com/why-metal-tim-warpage-simulations-fail-and-how-to-fix-them/, retrieved 2026-10-21) | L-M | Needed only for a metal-TIM variant; tim_indium has no elastic data today |
| TIM BLT | metal TIM 200 um (CoWoS-R thermal TV) | um | related | ectc51687.2025.00085 p.3 "The metal TIM used in this study has a bond line thickness (BLT) of 200um" | L for CoWoS-L | Current case TIM 60 um template (InFO_oS analog); 200 um is the TSMC lid analog |
| Lid attach adhesive / cure T | not found for any TSMC lid | - | gap | - | - | - |
| Stress-free temperature | not stated; ring TV of the same paper implies 161 C, lid TV 90 C (L4 linear diagnostic) | C | inferred (L4) | validation/cases/D/ectc51909.2023.00091-cowos_l.yaml diagnostics | M | The two TVs share the module and substrate; the different implied Tsf points to a lid term with its own reference temperature (lid / TIM attach after the module stage), i.e. a process sequence, not one Tsf |
| Substrate effective CTE | not stated for 00091; corpus range 11.97-20 ppm/K for large FCBGA substrates | ppm/K | related | see headline 3 | M | If the model substrate is ~9 ppm/K, the Cu lid mismatch is ~8 instead of ~2-5 ppm/K: the lid bowl term is overstated. Raising it moves 25 C toward the no-lid +534 side |

Facts vs inferences: the view-side transfer from 00026, the metal-TIM reading of a keyword and the substrate-CTE
estimate are inferences. Gaps: TIM product / modulus / BLT for this TV, lid attach (the lid sits over a module that
covers the whole substrate, so a foot is not drawn), dummy-die positions.

## Case 2: si_interposer_peers/xilinx_tsv_lid lidded (ectc.2011.5898527-b-m3, +162.56 um)

| Input | Value | Unit | Basis | Source | Conf. | Expected effect |
|---|---|---|---|---|---|---|
| Lid type | forged Cu lid, "about 1mm (on top of die)" | mm | paper | p.3 Sec. a; Table 3 | H | already in case |
| Lid foot width | about 2 (range 1.5-2.5) | mm | inferred (measured on the FEM figure) | p.3 Fig. 3(b): quarter model side faces show a cavity slot and a narrow foot at the outer edge; foot ~50-55 px of a 575-610 px half-side (21.25 mm) | L | Template 3 mm; a narrower foot reduces the rim-lift term of the W shape (L9 diag: decoupled foot +101.8) |
| Single stress-free T incl. lid | 150 C, whole package | C | paper | p.2 Sec. a "the package is stress free at underfill cure temperature of 150C, and out of plane displacement is obtained after cooling down" | H | already in case |
| Substrate CTE vs Cu lid | "CTE of copper is close to substrate's CTE" | - | paper (qualitative) | p.3 Sec. a | M | Model substrate membrane CTE 14.5 ppm/K (L9) vs Cu 17: a variant with the substrate near 17 ppm/K removes the lid-mismatch bowl; L9 lid-CTE diag (+44.3) is the same lever from the other side |
| Why a dome | lid CTE ~ substrate, so the lid adds stiffness and cuts the module dome 13.2 -> 6.4 mil | - | paper | p.3 Sec. a "decreases warpage significantly due to balancing the CTE mismatch ... Additionally, the copper heat spreader increases the stiffness"; Table 3 | H | The paper's dome needs (a) matched CTE and (b) a compliant TIM (Table 2 TIM1 5.8e-3 GPa, already used) |
| Lid adhesive / attach T | not stated | - | gap | - | - | - |
| Lid analog (other paper) | flat-top metal lid 71.5 x 71.5 mm, cavity 0.9 mm, feet 8 mm, 3 mm thick; measured RT dome | mm | related | 001c.147115 p.2 Table I | M (as analog) | Amkor uses wide feet on a 72 mm package; foot width alone does not decide the sign there |

Gaps: substrate stack (only core 800 um, 18.9 GPa, 11 / 16 ppm/K), lid foot height, adhesive. Public Xilinx package
drawings (7-series packaging guide) could give lid and substrate thickness for the production 2.5D packages; not
fetched.

## Case 3: fcbga_organic and glass_core_substrate bare substrates (ectc51687.2025.00178)

| Input | Value | Unit | Basis | Source | Conf. | Expected effect |
|---|---|---|---|---|---|---|
| Top-side asymmetry in the paper's model | top face shows a central light region over the chip-attach area and small pads elsewhere (SR opened over the die area) | - | paper (figure) + inferred | p.3 Fig. 5(a) build-up substrate model | M (exists) / L (size) | A top SR opening is the only visible asymmetry; L9 diag (top SR removed) +28 um, same sign as +122 / +97 |
| Asymmetry practice | SR on both sides, large die-shadow opening on top | - | related | ectc51906.2022.00180 p.3 "solder mask was laminated on both sides but a large area of the die shadow was opened up for chip assembly and CUF" | M | Supports modelling the top opening as die shadow + margin |
| Cu density asymmetry practice | front / back Cu patterns differ ("imbalance copper density"); ~100 um at RT on 37.5 mm 1-2-1 coupons | - | related | icep-iaac64884.2025.11003038 p.1 Sec. II, p.2 Sec. III (Shinko / AGC / Intel / iNEMI) | M (mechanism) | Per-side Cu residual ratio is a real driver; no values given |
| Symmetric bare substrate | "minimal warpage" for a 4-2-4 substrate alone | - | related | ectc51687.2025.00148 p.3 Sec. III.A | H | Confirms L9: a symmetric stack cannot give +122 |
| Cu residual rate (analog) | 93 % (test design) | % | related | ectc51687.2025.00148 p.2 Sec. II.A | L | Design-specific; not transferable as a value |
| SR thickness each side (analog) | 18 / 18 design; measured 17-18 | um | related | ectc51909.2023.00155 p.2 Table 3 "Solder resist thickness 18 18" (design) and p.6 measured table 18 / 17 / 17 um (Shinko-made 100 mm 4/2/4 substrates, 1.3 mm core) | M | Equal SR thickness on both sides in a Shinko substrate: thickness is not the asymmetry |
| Cu layer thickness (prototype) | 20 | um | paper | p.4 Table 1 "Cu RDL thickness 20μm" (glass prototype, not the simulated substrate) | M | Template uses 13 um build-up Cu |
| Layer counts | 2-2-2, core 1.0 mm glass | - | paper | p.2 Sec. II.B | H | already in case |
| Per-side Cu ratios, SR opening size | not disclosed | - | gap | - | - | - |

Bare-substrate targets stay untestable for magnitude. A sign check becomes possible with a top-SR-opening variant
(die shadow + margin, template).

## Case 4: cowos_s/warpage_corner_stress (ectc51909.2023.00135, measured TV1 RT dome)

| Input | Value | Unit | Basis | Source | Conf. | Expected effect |
|---|---|---|---|---|---|---|
| Target sign (JEITA) | +198 at 25 C (dome), -153 at 250 C (bowl); TV2 +250 / -173 | um | paper (figure) | p.2 Fig. 4: "(-) Convex" pictogram = dome, balls down; RT maps (BGA side up) centre low; text p.2 "convex ... at room temperature ... concave shape at 250°C" | H | Engine -340 (bowl) and ring-removed +535 (dome): the measured state lies between them, so the ring term is overstated by roughly a factor 2.5 in the model (inferred from the two engine numbers) |
| Substrate CTE | ~15 | ppm/K | paper | p.3 Sec. III.E "substrate CTE (~15 ppm/K)" | M (approximate) | Template stack estimate ~9.3 ppm/K (my hand estimate): Cu ring mismatch ~8 vs ~2 ppm/K. Raising it cuts the ring bowl term |
| Underfill2 CTE | ~20 | ppm/K | paper | p.3 Sec. III.E "underfill2 CTE (~20ppm/K)" | M | library underfill_c4 20 / 93 ppm/K (Tg 160) is consistent below Tg |
| Si interposer CTE | ~4 | ppm/K | paper | p.3 Sec. III.E | M | - |
| Ring material | Cu | - | paper | p.1 Sec. II "copper stiffener ring" | H | already in case |
| Ring width | 8.6-10.1 (left / right / top bands 47 / 49 / 42 px of a 413 px photo) | mm | inferred (photo) | p.2 Fig. 2 package photo, assuming the photo frame = the 85 mm outline | L-M | Template 7 mm; wider increases the ring term |
| Ring thickness | 2.5 (same author's Cu rings on 74 and 91 mm packages) | mm | related | ectc51906.2022.00232 p.2 Table I "Ring Thickness 2.5" (ring foot widths 13 / 10 and 17 / 19 mm) | M (analog) | Template 2.0 mm (00155 analog) |
| Ring adhesive | thickness < 100 um; modulus orders differ x100 between grades, 25 vs 250 C ratios 0.5-0.02 | um | related | ectc51906.2022.00108 p.4 "Adhesive thickness is <100umT"; Table III relative moduli 10n / 580n / 1140n at 25 C, 5n / 120n / 28n at 250 C | M | Case bonds the ring rigidly (ring_attach none); an adhesive frame lowers coupling |
| Ring attach temperature | stiffener press cure 150 C and 180 C studied | C | related | ectc51906.2022.00108 p.4 Fig. 6 label "150'C -> 180'C" and text | M | A process_sequence ring attach at 150-180 C (instead of one Tsf 150 C) changes the ring term with T |

## Case 5: 50 mm quarter (ectc51909.2023.00155-d, -189 um at 260 C)

| Input | Value | Unit | Basis | Source | Conf. | Expected effect |
|---|---|---|---|---|---|---|
| EMC cure shrinkage | 0.16, kind not stated | % | paper | p.3 Table 8 row EMC "Cure Shrinkage (%) 0.16" | H (value) / gap (kind) | L9: shrinkage as an equivalent CTE gives -150 (paper -189). Bracket linear 0.16 % vs volumetric 0.16 % (= 0.053 % linear) as L8 already supports |
| Volumetric practice | manufacturer data given as volumetric (0.09 %), applied as 1/3 per axis | % | related | Cheng et al., Materials 14 (2021) 4816, DOI 10.3390/ma14174816, PMC8432544 (retrieved 2026-10-21): "would cause a 0.09% volumetric shrinkage"; "The stress-free temperature of the EMC was defined as its cure temperature" | M | Supports the volumetric reading as plausible; does not decide it |
| Total cure shrinkage of a filled EMC (research grade) | 2.1 vol % (filled), 3.4 vol % (unfilled), mostly before gelation | vol % | related | Sadeghinia et al. 2012 (j.ijadhadh.2011.10.007) p.4 Sec. 2.3.1 "2.1 vs. 3.4 vol%"; Fig. 5 | M | Shows 0.16 % is far below total chemical shrinkage, i.e. the paper's value is an effective post-gel or mold-shrinkage figure (inferred) |
| EMC above-Tg modulus | E2 0.4 GPa (Tg 140 C) | GPa | paper | p.3 Table 8 | H | already in e2 variant |
| Rubbery / glassy ratio (cross-check) | 108.3 / 7239 MPa = 0.015 (Tg tan delta 121 C) | - | related | Sadeghinia p.6 Table 5 (filled) | M | JOINT2 400 / 18000 = 0.022: same class, E2 plausible |
| Stress-free T | 150 C "where the EMC was cured and the material properties became stable" | C | paper | p.3 Sec. II.E | H | already in case |
| Mold cure schedule | C-mold 140 C 900 s, PMC 175 C 5 h (MUF: 120 C, PMC 150 C 1 h) | C | paper | p.3 Table 7 | H | PMC above Tsf: the paper's 150 C is a modelling choice, not a process step |
| Insulation layer | Tg 233 C, E 32 GPa, alpha1 65 ppm/C, no E2 / alpha2, cure shrinkage 21 % | - | paper | p.3 Table 8 row "Insulation layer" (render); p.4 Sec. III bottom-side process (1): "liquid polyimide was applied on the wafer and cured at 230°C for 2 hours. The thickness was 3 um", after molding and grinding, with the molded wafer on a glass carrier | H | At 260 C the 3 um layer is above its Tg 233 C with no above-Tg data (CD6 issue). Its 21 % shrinkage happens at 230 C on the carrier-bonded molded wafer, above the 150 C Tsf; how much stress survives debond is not stated. 21 % applied as a linear eigenstrain would be implausible (inferred): keep it out of default runs and list it as open |
| Viscoelastic data | EMC, CUF, DAF viscoelastic in the paper; no relaxation data given | - | paper | p.3 Sec. II.E | H | Gap (E8) |

## Case 6: 120 mm stiffener (ectc51529.2024.00155-a, SUS430)

| Input | Value | Unit | Basis | Source | Conf. | Expected effect |
|---|---|---|---|---|---|---|
| Substrate effective CTE | Substrate A 11.97, B 12.81 (method not stated) | ppm/C | paper | p.2 Sec. II.C "Substrate A (CTE: 11.97 ppm/°C) and Substrate B (CTE: 12.81 ppm/°C)"; same values ectc51687.2025.00027 p.2 | H | The measured curve is Substrate A (Fig. 11 caption): SUS430 (11) < substrate (11.97). The template stack is about 8.7-9.6 ppm/K (my hand estimate), so the model has SUS430 > substrate, the reverse order. Expected with the sourced order: a bowl-going ring term on heating above the 130 C attach, i.e. toward the measured monotone decrease |
| SUS430 CTE | 11 (paper); 10.4 mean 20-300 C (datasheet) | ppm/C | paper / datasheet | p.5 Sec. III.C "SUS430 (CTE: 11 ppm/°C)"; library sus430 alternatives | H | already in library |
| Stiffener geometry (measured TV) | 28 x 30 mm wide, 2.0 mm thick | mm | paper | p.5 Fig. 11 caption "stiffener size: 28 mm x 30 mm"; p.2 Sec. II.E "2.0 mm-thick" | H | already in case (30 / 28) |
| Glue and cure | silicone glue, 130 C 0.5 h | - | paper | p.2 Sec. II.E | H | already in sequence; glue thickness not stated (template 100 um, bounds 50-300) |
| Package stage cure | CUF 170 C 2 h | C | paper | p.2 Sec. II.E | H | already in sequence |
| Companion FEM Tsf | 180 C (LTS build, CUF 165 C) | C | related | ectc51687.2025.00027 p.2 Sec. II.E "The stress-free temperature was set at 180°C" | M | A labelled bound above 170 C for the package stage |
| Mechanism (paper) | SUS430 CTE below substrate -> concave on heating; Cu above -> convex | - | related | ectc51687.2025.00027 p.4 Sec. III.B (quoted in headline 5) | H | Use as the trend expectation |
| Measured shape at 245 C | "M-shaped" (Substrate A) | - | paper | p.5 Sec. III.C | H | The engine W shapes are not unphysical; keep sign gates shape-aware |
| View side of Fig. 11 | not stated; icon + = convex (centre up) | - | gap | p.5 Fig. 11 | - | Physics: RT + for SUS430 (module dome) and RT - for Cu (ring shrinks more) are both consistent with JEITA |

## Case 7: cross-cutting

### 7a. Solder resist above 225 C

| Item | Value | Basis | Source | Conf. |
|---|---|---|---|---|
| SR E(T) above 225 C | not found | gap | corpus (8 SR-bearing papers checked), Taiyo pages (dead), patents | - |
| tcpmt.2025.3614186 SR | E 2.4 GPa constant at all listed T to 225 C; CTE 60 / 130 ppm/K (breaks 81-121 C) | paper | library solder_resist locator (p.6 Table II) | H |
| JOINT2 SR | E 4.3 GPa, alpha1 43.1 / alpha2 91.2 ppm/C, Tg 151 C | paper | ectc51529.2024.00155 p.3 Table IV | H |
| Xilinx SR | 2.9 GPa, 68 ppm (RT) | paper | ectc.2011.5898527 p.2 Table 2 | H |
| SR Tg (Taiyo high-k SR paper) | "≈ 140 °C" for the SRs | related | ectc51846.2026.00119 p.4 Sec. III.B | M |
| Prior-art dry-film SR | alpha1 45-70, alpha2 140-170 ppm; inventive alpha2 <= 150, Tg 130-180 C | patent | US9389504B2 (LG Chem), https://patents.google.com/patent/US9389504B2/en, retrieved 2026-10-21 | M |
| Taiyo AUS-series values (Tg 150-160 C, CTE 15-40 ppm, E 3.5-13.5 GPa) | search-extract only, not verified on a readable page | unverified | Taiyo nepcon2015 / 2016 PDFs (URLs redirect) | L, do not use |

Reading: every source places 225-265 C above the SR Tg (121-185 C), on a rubbery plateau where the sources give one
alpha2 and no upper limit. No source gives a rubbery modulus. Wentao's CD6 follow-up keeps SR in the ceiling, so the
225 C ceiling stands until a datasheet with DMA E(T) to 260 C is in hand (manual list below).

### 7b. Stress-free temperature practice in the corpus

| Paper | Stated Tsf | Process step named | Locator |
|---|---|---|---|
| ectc.2011.5898527 (Xilinx) | 150 C | underfill cure; "In reality incoming interposer, die and substrate have warpage and therefore some pre-stress"; moire used "to study what the stress-free temperature is" | p.2 Sec. a; p.3 |
| ectc51909.2023.00155 (JOINT2) | 150 C | "where the EMC was cured and the material properties became stable" (PMC 175 C) | p.3 Sec. II.E, Table 7 |
| ectc51687.2025.00027 (JOINT2) | 180 C | none named (CUF 165 C, LTS solder) | p.2 Sec. II.E |
| ectc51529.2024.00155 (JOINT2) | process: CUF 170 C, stiffener glue 130 C | process steps (no FEM Tsf stated in text read) | p.2 Sec. II.E |
| ectc51687.2025.00178 (Shinko) | 180 C bare; 150 C assembled | build-up resin cure; underfill cure | p.2 Sec. II.B; p.3 |
| ectc51687.2025.00148 (Ajinomoto) | UF cure 165 C as the cause of the RT shape | UF cure | p.3 Sec. III.A |
| Cheng 2021 (Materials 14:4816) | EMC cure temperature | EMC cure | PMC8432544 |
| Amkor In10Ag metal-TIM blog (2026-07-16) | 150 C "deformation-free"; measured profile flat near 150 C | - | semiengineering.com URL above |
| Samsung MIoS (ectc51906.2022.00108) | stiffener press cure is "the reference point of the warpage control effect" (150 -> 180 C studied) | stiffener attach | p.4 Sec. III.B |
| Da Silva and Adams 2006 (cited by Sadeghinia) | adhesive heated above its Tg: Tsf = Tg; below: cure temperature | adhesive joints | j.ijadhadh.2011.10.007 p.2 (ref [9], J Adhes Sci Technol 20:1705-26) |

Practice: each attach step sets its own reference (CUF / EMC cure for the module-on-substrate, adhesive cure for the
lid or ring), and papers that model one Tsf pick the last dominant cure (150-180 C). The L4 linear diagnostic
(implied Tsf: cowos_l lid 90 C vs ring 161 C; 120 mm SUS430 231 C vs Cu 96 C) is consistent with a two-reference
process (module stage plus attach stage), not with one Tsf per package.

## Prioritized changes for L19 (it applies; L23 edits nothing)

1. **cowos_s targets to JEITA sign** (H): a-m1 +198 at 25 C, a-m2 -153 at 250 C (TV1), with the Fig. 4 pictogram as
   the reason; fix the case assumption text ("'-' = convex" is the dome). The verdict becomes a sign miss (engine
   -340 bowl). Ask the coordinator to add the explicit JEITA mapping to the metrics.csv scope note (DB edit is not
   L19's). Same check for the ring TV of CoWoS-L is not needed (it is already sign-agnostic).
2. **Substrate membrane-CTE check, then sourced CTE variants** (M): compute the model in-plane CTE (L9 subcte method)
   for cowos_s, cowos_l, 120 mm (and _cu), Xilinx; compare with 15 (MediaTek, cowos_s), 11.97 (120 mm Substrate A),
   ~17 (Xilinx, qualitative). Where the model is off, add a labelled variant that reaches the stated CTE by changing
   template inputs only (core CTE alternative from the library, core thickness, build-up Cu fraction), never the
   ring / lid. Expected: cowos_s and cowos_l RT move toward dome; 120 mm SUS430 trend turns decreasing.
3. **cowos_s ring geometry and attach** (M): ring width 9 mm (photo estimate 8.6-10.1) and thickness 2.5 mm (MediaTek
   2022 analog) as labelled variants; ring_attach adhesive (< 100 um) with a process_sequence ring attach at 150 C
   (bounds 130-180 C from the corpus). Run after item 2, since the CTE fix is the larger lever.
4. **cowos_l lid stage as a process_sequence** (M): module and substrate stress-free at the module stage (bound: ring
   TV implied 161 C; 150 C template), lid + TIM activated at an attach temperature (template 150 C, bounds 125-180 C).
   Plus TIM variants: film polymer 5.8 MPa (current) vs indium (E 11 GPa secondary, nu 0.45; E ~ 0 above 156.6 C in
   s3; BLT 200 um analog). Report, do not fit; the Intel FEM says a metal TIM pushes RT negative, so the TIM variant is
   a test of the keyword reading, not a fix.
5. **120 mm**: run the SUS430 sequence with the substrate at 11.97 ppm/C (item 2) and the companion Tsf 180 C as a
   package-stage bound; keep glue bounds.
6. **50 mm**: keep the shrinkage bracket (linear 0.16 % vs volumetric 0.16 %); keep the insulation-layer 21 % out of
   default eigenstrains (cured at 230 C on the carrier-bonded wafer, kind unknown; open item); flag the insulation
   layer above its Tg 233 C at 260 C.
7. **Xilinx lidded**: foot width 2 mm (figure estimate) and a substrate-at-Cu-CTE variant (paper statement); report
   shape class.
8. **Bare substrates**: optional sign-only variant with the top SR opened over the die shadow (+ margin, template);
   magnitude stays untestable.
9. **SR ceiling**: no change (no sourced E above 225 C).

## Gaps (stay gaps)

- CoWoS-L lid TV: TIM product, modulus and BLT; lid attach material, geometry and cure temperature; view side (only
  inferred from 00026).
- Any lid-attach adhesive cure temperature in a TSMC paper.
- Xilinx: substrate stack, lid foot height, adhesive.
- Shinko 2-2-2: per-side Cu residual ratios, SR opening size, SR / build-up properties.
- MediaTek CoWoS-S: ring width and thickness (photo estimate only), adhesive, ring attach temperature.
- JOINT2 50 mm: kind of the 0.16 % shrinkage; how the paper applied it; viscoelastic data.
- 120 mm: glue thickness; Fig. 11 view side; CTE method for 11.97 / 12.81.
- SR E(T) above 225 C (no source).

## Candidate manual downloads (Wentao's list; none retrieved)

| Item | Identifier | Why |
|---|---|---|
| JEDEC JESD22-B112C (2023) | jedec.org (free with registration) | Sign and view-side definition; the corpus has only JEITA via a search extract |
| JEITA ED-7306 (scanned PDF) | https://home.jeita.or.jp/tsc/std-pdf/ED-7306_E.pdf | Read the sign figure directly (OCR text layer absent per R1) |
| Huang P.K. et al., "Wafer Level System Integration of the Fifth Generation CoWoS-S with High Performance Si Interposer at 2500 mm2", ECTC 2021 pp. 101-104 | DOI not looked up | ref [5] of 00091: the "new, low thermal resistance TIM" and lid of TSMC CoWoS; may state TIM type |
| Kim S.A., Ledbetter H.M., "Low-temperature elastic constants of polycrystalline indium", Mater. Sci. Eng. A 252(1) 1998 | DOI not looked up | Primary indium E, G, nu (room-temperature values not in the abstract) |
| Taiyo PSR-4000 AUS / PSR-800 AUS SR1 technical data sheets | vendor (old URLs redirect) | SR DMA E(T) and TMA alpha to 260 C, the CD6 ceiling |
| Da Silva L.F.M., Adams R.D., "Stress-free temperature in a mixed-adhesive joint", J Adhes Sci Technol 20 (2006) 1705-26 | DOI not looked up | Tsf rule for adhesive joints heated above Tg (lid / ring adhesive) |
| Cheng H.-C. et al., Materials 14 (2021) 4816 | DOI 10.3390/ma14174816 (open access) | EMC cure-shrinkage and Tsf modelling practice; FCPoP E(T) curves |
| Underlying Amkor paper of the In10Ag metal-TIM blog | not identified | Metal-TIM film modulus vs bulk; measured W / M shapes of a lidded FCBGA |

## Sources used (web, retrieved 2026-10-21)

- JEITA ED-7306 search extract: https://home.jeita.or.jp/tsc/std-pdf/ED-7306_E.pdf
- Cheng et al. 2021: https://pmc.ncbi.nlm.nih.gov/articles/PMC8432544/
- Kim and Ledbetter abstract: https://www.nist.gov/publications/low-temperature-elastic-constants-polycrystalline-indium
- Amkor metal-TIM blog (dated 2026-07-16): https://semiengineering.com/why-metal-tim-warpage-simulations-fail-and-how-to-fix-them/
- LG Chem dry-film SR patent: https://patents.google.com/patent/US9389504B2/en
- WebElements indium (secondary, search result only): https://webelements.co.uk/indium/physics.html
