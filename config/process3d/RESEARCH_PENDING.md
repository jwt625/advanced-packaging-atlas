# RESEARCH_PENDING: sources for the values the animated flows still lack

Owner: research lane L39 (DevLog-016). Date: 2026-10-23. Status: first pass, done.
Scope: the 44 entries of `config/process3d/PENDING.md` (10 drawing_required, 34 hud_only). Rows already in
`RESEARCH_TOOLS_FAB.md` (F1-F181) and `RESEARCH_TOOLS_ASSEMBLY.md` (A1-A202) are cited by ID, not repeated.
Section 7 maps every PENDING # to its rows and status; section 8 is a ready-to-paste fill block for lane L34.

## How to read this file

- Same row format as the two research files: ID, quantity, value / range, unit, applies to, kind, source + quote /
  locator, accessed, confidence.
- Kind: `fact` (stated by the source), `derived` (formula over fact rows; formula given), `estimate` (range across
  sources), `assumption` (no source; rationale given). Proposals (section 6) are template values with physical
  reasoning for items no source gives; they carry IDs X1.. and must render as template.
- Repo papers: `paper_id p.N Sec.` from `references/<paper_id>/text.md`; DB rows: `row_id` of `data/*.csv` (their
  `locator` gives the paper page). A DB value of another build is an analog (render as template, COMPOSITION.md 1.1).
- Confidence: `high` = primary document read verbatim; `med` = primary but via a search-result excerpt or a
  WebFetch summary, or a similar-but-different process / material; `low` = old or different-domain source, or a
  derivation with strong assumptions.
- "N/A (not found)" = searched, absent.

Not reached (2026-10-23): atotech.com flyer PDF (HTTP 503), storefront.caplinq.com (HTTP 522), ksp.etri.re.kr
(connection refused), kayakuam.com SPR955 flyer (404), circuitnet.com paper page (404), knowde.com DAF page (empty),
louisville.edu Al etch guide (HTML landing page only), emerald.com Richter 1997 SnPb paper (paywall, abstract only).
Stopped on each after one attempt. No logins, no paywalled downloads, no paper retrieval scripts. Public PDFs that
WebFetch could not parse were copied into the session scratchpad and read with pypdf (K&S IMAPS 2014 TCB paper,
Henkel ATB F100E1 TDS, AI Technology ESP7666 TDS, Intel LTS paper (Aspandiar et al.), Renesas TB493, NIST solder
database v4, AZ 9260 spec sheet, Shipley SPR955 datasheet, Isola FR406 processing guide); nothing was written into
the repo cache.

---

## 1. Solder and joints

### 1.1 SnPb eutectic C4 on the CoWoS-S interposer backside (PENDING #1, #2, #3, #26, #27, #28, #29)

The 2013 TSMC paper states only "SnPb eutectic plating solder with 200um pitch" (ectc.2013.6575597 p.1; DB
ectc.2013.6575597-a-i3); the 2011 TSMC/Xilinx CoWoS paper states "180um/Eut" (ectc.2011.5898527 p.2 Table 1) and
"C4 bump is electroplated and reflow soldered on top of the UBM layer" (p.2). Neither gives a size, recipe or
profile.

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| P1 | electroplated eutectic / high-Pb bump diameter at 200 um pitch | 100 (at 200 um pitch); 125 (at 250 um pitch) | um | plated SnPb C4 | fact | J-STD-028 (bump shear test standard) table titles, via search-result excerpt: Table 4 "Aptos electroplated type data for bump diameter and pitch of 100 µm/200 µm"; Table 3 "Sn-Pb eutectic or high Pb solder joints with bump diameter and pitch of 125 µm/250 µm". Full standard not read (only a third-party copy surfaced; not fetched) | 2026-10-23 | med |
| P2 | plated eutectic SnPb bump, 250 um pitch | 150 um diameter at 250 um pitch; optimal plating "7 A/dm2" for 4 h (abstract text garbled) | um; A/dm2; h | Sn-Pb flip-chip bumps | fact | Hwang, Hong, Kang, Jung, J. Welding and Joining 19(5) 520-525 (2001), https://koreascience.kr/article/JAKO200111921000086.pub abstract: "The Sn-Pb eutectic solder bump formation (150μm diameter, 250μm pitch)" | 2026-10-23 | low (7 A/dm2 x 4 h = ~880 um at the P7 Faraday rate; the abstract numbers are garbled or the bump is a large mushroom) |
| P3 | eutectic SnPb C4 plating bath, thickness, current density | 63Sn/37Pb wt %, ~100 um thick, methane sulfonic acid bath, room temperature, 20-100 mA/cm2 | um; mA/cm2 | IBM C4 process | fact | US6622907B2 (IBM), https://patents.google.com/patent/US6622907B2/en : "a eutectic PbSn alloy having the composition 63% Sn, 37% Pb by weight with a thickness of about 100 micrometers"; "electroplated from a methane sulfonic acid solution of Sn 2+ and Pb 2+ cations"; "performed at room temperature with a current density from about 20 mA/cm 2 to about 100 mA/cm 2"; resist: "thick-film photoresist" (no number); C4 diameter / pitch not stated | 2026-10-23 | high |
| P4 | plating resist thickness rule | resist at least as thick as electroplated barrier + solder; Ni barrier plated at 5-30 mA/cm2 | -; mA/cm2 | electroplated SnPb on a Ni barrier | fact | US5937320 (search-result excerpt), https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/5937320 : "good results are had when the photoresist is at least as thick as the combined thickness of electroplated barrier layer 18 and the electroplated solder"; "current density of from about 5 to 30 mA/cm.sup.2" | 2026-10-23 | med |
| P5 | Sn-37Pb density and melting point | 8.4 (8.36 in Table 2.2.3); 183 | g/cm3; C | Sn-37Pb eutectic | fact | NIST Database for Solder Properties v4, https://www.msed.nist.gov/solder/NIST_LeadfreeSolder_v4.pdf p.22 Table 1.18 "Density, g/cm3 ... 8.4"; "Melting Point (ºC) ... 183"; p.35 Table 2.2.3 "Density (g/cm3) 7.25 8.36" (Sn-37Pb column). Also gives the flow's `liq_snpb_c` template its citation | 2026-10-23 | high |
| P6 | Pb atomic weight | 207.2 (conventional value); standard interval [206.14, 207.94] | g/mol | Faraday rate | fact | CIAAW https://www.ciaaw.org/lead.htm : "A_r(Pb) = [206.14, 207.94] since 2020"; "207.2 ± 1.1" if a single value is needed (Sn from F68) | 2026-10-23 | high |
| P7 | Faraday deposition rate of 63Sn37Pb (100 % efficiency) | 0.0522 per mA/cm2; 1.04 at 20, 3.65 at 70, 5.22 at 100 mA/cm2 | um/min | plated SnPb | derived | rate = j / (rho x 2F x (w_Sn/M_Sn + w_Pb/M_Pb)) = j / (8.4 x 1368.7 C/g); F67, F68 (Sn 118.710), P5, P6; both metals divalent | - | high (alloy plates at the bath composition, assumed) |
| P8 | SnPb plating time for a 75 um column (proposal X2) | 4311 at 20; 1725 at 50; 1232 at 70; 862 at 100 mA/cm2 | s | C4 plate op | derived | t = h / rate (P7), 100 % efficiency | - | med |
| P9 | reflowed C4 shape from a plated column | 100 um dia x 75 um column (589,000 um3) -> cap height 80.5 um, sphere radius 55.8 um (111.5 um max dia); 100 x 80 -> 83.2 / 113.2; 100 x 100 -> 92.9 / 119.8 | um | C4 reflow op | derived | volume-conserving truncated sphere on a 100 um wetted UBM: V = pi h (3 a^2 + h^2) / 6, a = 50 um, R = (a^2 + h^2) / (2 h); no IMC or seed loss | - | med |
| P10 | Sn-Pb eutectic assembly profile (J-STD-020) | preheat 100-150 C, 60-120 s; ramp TL->Tp 3 C/s max; TL 183 C; tL 60-150 s; tp within 5 C of Tc 20 s; ramp-down 6 C/s max; 25 C -> peak 6 min max | C; s; C/s; min | SnPb reflow (classification profile) | fact | Renesas TB493 Rev.0.00 (2012-10-18), https://www.renesas.com/doc/tech-brief/tb493.pdf Table 1 "SN-PB EUTECTIC ASSEMBLY": "Liquidous Temperature (TL) 183°C"; "Time (tL) maintained above TL 60-150 seconds"; "Time 25°C to peak temperature 6 minutes max." | 2026-10-23 | high (secondary statement of the standard) |
| P11 | SnPb classification peak temperature Tc | 235 (thickness < 2.5 mm and volume < 350 mm3); 220 (all other cases) | C | SnPb reflow peak | fact | TB493 Table 2 "SnPb EUTECTIC PROCESS - REFLOW PEAK TEMPERATURES (TC)": "< 2.5 mm 235°C 220°C"; ">= 2.5 mm 220°C 220°C". Note: "Reflow profiles in this document are for classification/preconditioning and are not meant to specify board assembly profiles" | 2026-10-23 | high |

Not found: a plated SnPb C4 size, plated height or reflow profile for the 2011 / 2013 CoWoS TVs or any 200 um-pitch
TSMC interposer (DB, cached papers, web). Proposals X1, X2 in section 6.

### 1.2 EMIB-T cavity-side bridge joint alloy (PENDING #6)

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| P12 | EMIB-T cavity-side joint metallurgy | N/A (not found); Intel states only "Mechanically reliable solder joints and underfill protection between TSV bridge die back side and substrate cavity side interfaces" and "cavity pad surface finishes" | - | EMIB-T bridge attach | fact (absence) | ectc51687.2025.00051 p.4 Sec. III.C; ectc51846.2026.00051 (TCB named, no alloy); IBM TSV-bridge analog ectc51846.2026.00050 ("dual-sided solder-bump bridge", no alloy); web search (Intel EMIB-T press / analysis pages) gave no alloy | 2026-10-23 | - |

Proposal X5 (section 6).

### 1.3 EMIB low-temperature BGA alloy and reflow peak (PENDING #7, #44)

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| P13 | LTS use on the EMIB CHIPS package | "Low-temperature solder was used as the ball-grid array bumps"; alloy not named | - | ectc51687.2025.00061-F3-s05 | fact | ectc51687.2025.00061 p.5 (assembly section); cites Jayaram et al., "A Review of Low Temperature Solders in Microelectronics Packaging", IEEE TCPMT 2023 (not read) | 2026-10-23 (repo) | high |
| P14 | Intel LTS alloys and melting points | BSA Bi57.6/Sn42.0/Ag0.4: 138-140 C; LTRR Bi58/Sn42: 139 and 139-141 C; SAC305 217-219 C | wt %; C | Intel board SMT of BGA packages | fact | Aspandiar, Byrd, Tang, Campbell, Mokler (Intel Corporation), "Investigation of Low Temperature Solders to Reduce Reflow Temperature, Improve SMT Yields and Realize Energy Savings", IPC APEX EXPO technical paper (year not printed in the text layer; latest reference 2014), https://www.electronics.org/system/files/technical_resource/E38%26S14-03%20-%20Scott%20Mokler.pdf p.4 Table 1: "Bi57.6 /Sn42.0/Ag0.4 Bi58/Sn42 Bi58/Sn42"; "Melting Point, C 217-219 138-140 139 139-141"; p.2: "The eutectic temperature is this system is 138C" | 2026-10-23 | high (Intel; board-level paste with SAC balls, not the 00061 BGA balls) |
| P15 | LTS reflow peak | BSA profile peak 170-180 C (ramp-soak-peak); used 175-180 C vs SAC 245-250 C; "reducing the reflow peak temperature from 245C to <180C" | C | same | fact | same, p.4: "with a peak temperature in the 170-180C range"; p.7: "soldered with the BSA solder paste in the 175 to 180°C temperature range"; abstract p.1 | 2026-10-23 | high |
| P16 | Sn-58Bi melting point; LTS top temperature in 00027 | 138 C (A52, NIST); 160 C reflow top (A51, ectc51687.2025.00027 p.5) | C | existing rows | fact | RESEARCH_TOOLS_ASSEMBLY.md A51, A52 | - | high |

---

## 2. Bonding

### 2.1 EMIB top-die TCB on the organic substrate (PENDING #4, #41, #42, #43)

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| P17 | Intel TCB process sequence and substrate temperature | substrate with pre-applied flux on a hot pedestal under vacuum; constant force while the die heats past solidus; solder chase on melt; head retracts while molten to set joint height; substrate e.g. 140 C; pulse heater > 100 C/s heating, > 50 C/s cooling; Intel TCB in HVM since 2014 | C; C/s | Intel TCB (die to organic substrate) | fact | P. Garrou, "Intel and ASM look to TCB", Semiconductor Digest IFTLE (URL path 2015/11), https://sst.semiconductor-digest.com/?p=66712 : "Intel introduced TCB into high volume manufacturing in 2014."; "the substrate with pre-applied flux is held flat on the hot pedestal under vacuum"; "the substrate is processed at a lower temperature (e.g. 140°C)"; "heating ramp rate exceeding 100°C/s and cooling ramp rate exceeding 50°C/s" | 2026-10-23 | med (summary of an Intel ECTC talk; no EMIB numbers) |
| P18 | K&S TCB head temperature cycle | upper temperature ~280 C (fixed by solder melt); 160 -> 280 -> 160 C cycle with 1 s dwell at 280 C; heating > 200 C/s, cooling > 100 C/s (avg ~135 C/s 280 -> 160 C); cycle 180 -> 260 -> 180 C takes >= 1.2 s; market tools do the cycle in 7-15 s; flux-dip alignment limited to 100-150 C; model substrate held at 70 C | C; C/s; s | K&S TCB bond head (Cu pillar on organic substrate) | fact | Colosimo, Clauberg, Galipeau, Wasserman, Schmidt-Lange et al. (Kulicke & Soffa), "High Productivity Thermo-Compression Flip Chip Bonding", IMAPS 2014 (47th Int. Symp. Microelectronics), https://imapsource.org/api/v1/articles/56216-high-productivity-thermo-compression-flip-chip-bonding.pdf p.1: "Machines in the market today can accomplish this temperature cycle in 7 to 15 seconds"; p.3: "the upper temperature is more or less fixed to around 280ºC by the need to melt the solder"; p.3: "temperature cycle from 160ºC to 280ºC and back to 160ºC with a 1 sec dwell time at 280ºC"; p.5: "the bottom of the 200µm thick substrate is held at 70ºC" | 2026-10-23 | high |
| P19 | TCB force and time analogs | 39.2 N, 6 s, head 325 C, 100 C/s (A13); 1 N, 7 s, head 440 C set / 250 C joint (A10, A11); "upwards of 300N" for large dies (A21); 10 N / 2.5 s (A15) | N; s; C | existing rows | fact | RESEARCH_TOOLS_ASSEMBLY.md A10, A11, A13, A15, A21 | - | high |
| P20 | joint peak target for SnAg caps | 250 C (A55 mass reflow of SnAg caps; A10 actual joint max 250 C) vs liquidus 221 C (A60) | C | existing rows | fact | A10, A55, A60 | - | high |

Not found: any Intel EMIB top-die TCB temperature, force or time. Profile proposal X3 (section 6).

### 2.2 EMIB bridge adhesive attach in the cavity (PENDING #32, #33)

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| P21 | die placement into a blind cavity with DAF | heated bonder stage, glass held > 95 C for >= 30 s during landing; then vacuum lamination 1 MPa, 100 C, 5 s; DAF cure 130 C for 4 h; DAF Nitto EM-310J1-P, 10 um; bonder Finetech fine-placer matrix | C; s; MPa; h; um | embedded die in a glass cavity (EMIB-like analog, academic) | fact | ectc51846.2026.00416 p.2 Sec. II.B: "a heating recipe was customized to ensure glass reaches temperatures of > 95 ˚C for at least 30 seconds"; "high pressure vacuum lamination for 5 seconds at 1 MPa and 100 ˚C and DAF curing for 4 hours at 130 ˚C"; DB ectc51846.2026.00416-F1-s06 (temp_c 95, time_s 30) | 2026-10-23 (repo) | high (analog; force not stated) |
| P22 | DAF cure and thickness (Henkel) | cure 1 h at 130 C; adhesive 25 um (small die), 35-120 um (die-to-die, FOW) | h; C; um | LOCTITE ABLESTIK ATB F100E1 | fact | Henkel TDS (2024-08), https://datasheets.tdx.henkel.com/LOCTITE-ABLESTIK-ATB-F100E1-en_GL.pdf : "Recommended cure schedule 1 hour @ 130°C"; "Adhesive thickness, μm 25 for small die application, 35-120 for Dieto Die, FOW/FOD" | 2026-10-23 | high |
| P23 | DAF cure pressure and schedules (AI Technology) | 5-15 psi with 125 C 90 min / 150 C 30 min / 175 C 5 min; film 20 or 40 um | psi; C; min | ESP7666-HK-DAF (power-device dicing DAF) | fact | AI Technology TDS rev. G (2015-01-28), https://www.aitechnology.com/wp-content/uploads/ESP7666-HK-DAF.pdf : "Pressure 5-15 psi"; "125ºC 90 min 150ºC 30 min 175ºC 5 min"; "Standard thicknesses ... are 20, and 40 micron" | 2026-10-23 | med (cure-table layout garbled in the text layer) |
| P24 | force from the DAF cure pressure | 0.14-0.41 N on a 2 x 2 mm bridge; 1.9-5.6 N on a 3 x 18 mm bridge | N | bridge_place | derived | F = P x A; 5-15 psi = 0.0345-0.103 MPa (P23); bridge 2 x 2 mm (package3d emib bridge_w/d_mm, A191 lower bound), 3 x 18 mm (emib_t) | - | low (cure pressure, not a placement force) |
| P25 | bonder load floor | 1-50 N VCM head (MD-P300) | N | existing row | fact | RESEARCH_TOOLS_ASSEMBLY.md A2 | - | high |

Not found: EMIB bridge adhesive type, attach temperature or force (Intel: "held in place with an adhesive",
ectc.2016.201 p.6). Force proposal X7 (section 6).

### 2.3 EMIB-T bridge TCB (PENDING #5, #34, #35, #36)

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| P26 | EMIB-T bridge attach method | panel-level TCB on 510 x 515 mm panels; no temperature, force or time given | - | EMIB-T | fact | RESEARCH_TOOLS_ASSEMBLY.md A197 (ectc51846.2026.00051 p.1, p.3) | - | high |

Not found: any EMIB-T bridge TCB condition. Proposals X4 (profile, force, time) in section 6; head temperature from
P18.

---

## 3. Wafer fab (CoWoS-S interposer front side and backside)

### 3.1 Exposure doses (PENDING #14, #16, #23)

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| P27 | thick positive resist dose, 10 um contact holes in a 12 um film | 1550 mJ/cm2 (DOF reference, 10 um CH 1:1 pitch); 1725 mJ/cm2 (10 um L/S); FEM 1200-2600 mJ/cm2; Ultratech 1500 gh-line stepper; soft bake 110 C 180 s; AZ 300MIF spray 400 s at 23 C | mJ/cm2; C; s | AZ 9260, 12 um (TSV-mask class: tsv_res_h_um analog is 12 um) | fact | AZ 9260 Thick Positive Photoresist spec sheet (AZ Electronic Materials, roadmap dated 11/2007), https://www.nanofab.utah.edu/wp-content/uploads/2022/12/AZ-9260-Thick-Positive-Photoresist-Spec-Sheet-1.pdf pp.6-22 (12 um FT, Ultratech 1500, AZ 300 MIF): "Depth of Focus @ 1550mJ/cm2, 10.0 µm CH, 1:1 Pitch"; "Depth of Focus @ 1725 mJ/cm², 10.0 µm L/S"; "FEM: 1200 mJ/cm2 with increments of 75 mJ/cm2"; "Softbake: 110°C hotplate/ 180 sec." | 2026-10-23 | med (gh-line broadband stepper, not i-line) |
| P28 | KrF (248 nm) chemically amplified resist optimum dose | 15.0-42.0 mJ/cm2 (Table 2, Examples 19-36) at 1:1 0.18 um L/S, 400 nm film, Nikon S203B KrF scanner NA 0.68 | mJ/cm2 | KrF resist for sub-um damascene lines | fact | US7303852B2 (Shin-Etsu Chemical), https://patents.google.com/patent/US7303852B2/en : "the dose which provides a 1:1 resolution of a 0.18 μm line-and-space pattern is an optimum exposure"; "a KrF excimer laser scanner (S203B of Nikon Corporation, NA=0.68, s=0.75)"; Table 2 values (e.g. Example 19 "42.0", Example 21 "15.0", Example 25 "25.0") | 2026-10-23 | med (patent examples, read via WebFetch summary of the table) |
| P29 | i-line resist dose (SPR955-CM) | 165 mJ/cm2 at 0.25 um L/S in 0.97 um resist; 245 mJ/cm2 at 0.40 um L/S in 1.40 um; other plots 163-310 mJ/cm2; GCA XLS 7500 i-line NA 0.55 | mJ/cm2 | i-line patterning of the Al RDL (2 um resist drawn) | fact | Shipley SPR955-CM datasheet, https://www.mri.psu.edu/sites/default/files/docs/LithoDataSheets/Shipley_SPR955_Datasheet.pdf p.1: "165 mJ/cm 2 at 0.25 µm lines/spaces in"; "245 mJ/cm 2 at 0.40 µm lines/spaces in"; "EXP: GCA XLS 7500 i-Line (0.55 NA, 0.54 σ)"; "Dense Lines/Spaces (310 mJ/cm2)" | 2026-10-23 | high |
| P30 | 248 nm lithography in a 300 mm Si interposer-class fab | "Si patterning levels 2-3 by 248 nm photolithography" (level 1 at 193 nm) | - | damascene litho tool class | fact | DB ectc51909.2023.00230-F1-s02 (p.2 Sec. III.A) | 2026-10-23 (repo) | med (FEOL Si levels of a photonic interposer, not BEOL Cu) |

### 3.2 Damascene dielectric deposition temperature (PENDING #15)

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| P31 | PECVD / TEOS dielectric deposition temperature | conventional CCP PECVD 200-350 C; "High T TEOS (350 °C)" vs "Low T TEOS (180 °C)" | C | BEOL dielectric on a full-thickness wafer | fact | ectc51529.2024.00392 p.4 Sec. III.B: "With conventional CCP (capacitively coupled plasma) PECVD approaches, the processing temperature is anywhere from 200-350°C"; ectc51909.2023.00048 p.4 Table I: "High T TEOS (3 50 °C)"; PECVD SiN at 300 C on a 300 mm photonic interposer (DB ectc51909.2023.00230-F1-s07) | 2026-10-23 (repo) | high |

### 3.3 Dielectric and Al etch: tools and times (PENDING #18, #19, #24)

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| P32 | fluorine RIE of nitride + oxide | ~0.51 um/min; CHF3, C4F8, Ar; selective to resist and ABF; tool "RIE" | um/min | dielectric opening etch | fact | DB ectc51529.2024.00392-F1-s12 (p.4 Sec. III.C): conditions "CHF3, C4F8, Ar; ~0.51 um/min; selective to resist and ABF" | 2026-10-23 (repo) | high (thin-film RDL on ABF, not a 300 mm BEOL etcher) |
| P33 | damascene dielectric etch time (via + line, one level) | 181 | s | fs_interconnect.etch | derived | (imd_h_um + cu_h_um) / 0.51 um/min = (0.54 + 1.0) / 0.51 x 60 (package3d cowos_s analogs; P32); no over-etch | - | low |
| P34 | Al(Si) plasma etch rates (RIE) | BCl3 only 400 A/min; BCl3/O2 2800 A/min; BCl3/CCl4 ~2000 A/min; BCl3/CCl4/O2 ~3500 A/min; 70 mTorr, 300 W | A/min | Al RDL etch | fact | US4444618A (General Electric, 1984), https://patents.google.com/patent/US4444618A/en : "the etch rate of Al(Si) was too slow to be practical (400 Å/min)"; "the etch rate of Al(Si) was 2800 Å/min"; "etch rates were in the order of 3500 Å/min" | 2026-10-23 | low (1984 parallel-plate RIE, CCl4 chemistry; modern Cl2/BCl3 TCP rates not found) |
| P35 | Al RDL etch time for 1 um Al | 171-300 (214 at 0.28 um/min) | s | fs_interconnect.al_etch | derived | t = al_h_um / rate; 1 um (package3d al_h_um) / 0.20-0.35 um/min (P34 range of practical mixtures); no over-etch | - | low |

### 3.4 Damascene Cu ECP and CMP (PENDING #20, #21, #22)

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| P36 | two-step damascene Cu ECP | first step 1.6-7.0 mA/cm2; second 9.5-25 mA/cm2; dwell 1-10 s between; bath 21-27 C; 200 mm; sub-half-micron openings; TaN 150-450 A, Cu seed 500-2500 A | mA/cm2; s; C | Cu damascene fill | fact | US6140241A (TSMC), https://patents.google.com/patent/US6140241A/en : "first ECD period is initiated at a current density of between about 1.6 and 7.0 mA./cm2"; "the current density of the second ECD process step is preferably between about 9.5 and 25 mA./cm2"; "The dwell period is preferably between about 1 and 10 seconds" | 2026-10-23 | high |
| P37 | damascene ECP time for 1 um at 20 mA/cm2 | 136 (bulk step only; + first-step and dwell time if drawn) | s | fs_interconnect.ecp | derived | t = dam_ovb_um / (0.02205 um/min per mA/cm2 x 20) (F70, 100 % efficiency; dam_ovb_um = 1 um) | - | med |
| P38 | damascene CMP time for 1 um overburden | 58 (64 with a 10 % over-polish, assumption) | s | fs_interconnect.cmp | derived | t = dam_ovb_um / 1.0268 um/min (F105, 3.0 psi Reflexion); barrier clear not included | - | med |
| P39 | oxide CMP removal rate (Reflexion, 3M test) | 2910-5490 A/min (commercial conditioner CE20 vs Example 16A at 4.9 h) | A/min | oxide CMP (optional input for the backside CMP template) | fact | US9956664B2 (3M), https://patents.google.com/patent/US9956664B2/en (oxide polishing comparison; read via WebFetch summary) | 2026-10-23 | med |

Backside CMP time is no longer pending (PENDING.md: now a template from F105). If the backside CMP is meant to clear
oxide over the tips, P39 gives 150-290 s for 1.4 um (bs_pass_h_um 1 um + 0.4 um liner), derived.

### 3.5 Front passivation tools (PENDING #25)

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| P40 | passivation deposition tool on a Si interposer | PECVD SiO2, 0.3 um | um | fs_passivation | fact | DB ectc51846.2026.00065-F1-s01 (p.2 Sec. III) equipment "PECVD" | 2026-10-23 (repo) | high (analog) |
| P41 | passivation opening | litho (P29 dose class) + fluorine RIE (P32) | - | fs_passivation | estimate | P29, P32 | - | med |

---

## 4. Substrate and package

### 4.1 Electroless Cu seed bath temperature (PENDING #30)

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| P42 | electroless Cu bath temperature and rate | typical 20-80 C; preferred 30-60 C; examples 35, 37, 40, 45, 50, 55 C (40 C most used); 0.26-0.59 um in 5 min at 40-50 C; target "0.3 μm per 5 minutes" | C; um | electroless Cu on epoxy/glass laminates (PCB) | fact | US9702046B2, https://patents.google.com/patent/US9702046B2/en : "Typically copper deposition is done at temperatures of 20° C. to 80° C."; "Preferably the electroless compositions deposit copper at temperatures of 30° C. to 60° C."; "Each laminate was copper plated for 5 minutes at 40° C., 45° C. or 50° C." | 2026-10-23 | med (laminate, not ABF; assignee not captured) |
| P43 | electroless Cu seed enhancement temperature | 48 C; HCHO reducer; mixer 600 r/min | C | electroless Cu in TGVs (glass) | fact | DB tcpmt.2025.3557232-F1-s08 (p.4 Sec. IV.A): "raising the reaction temperature to 48 ◦C" | 2026-10-23 (repo) | med (glass, not ABF) |
| P44 | SAP electroless Cu rate (Atotech Printoganth MV TP2) | 0.5 um in 20 min; temperature not in the excerpt | um; min | SAP on ABF | fact | Atotech flyer (search-result excerpt; fetch HTTP 503), https://atotech.com/wp-content/uploads/2024/05/Flyer22_09_PTH_Printoganth_MV_TP2_high_res.pdf | 2026-10-23 | low |

### 4.2 EMIB-T cavity-pad finish (PENDING #31)

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| P45 | cavity-pad finish type and thickness | N/A (not found): "cavity pad surface finishes have been incorporated into the substrate flow" | - | EMIB-T | fact (absence) | ectc51687.2025.00051 p.4 Sec. III.C | 2026-10-23 (repo) | - |

Finish analogs: ENi 2 um / Au 0.05 um (F175, A178); IPC-4552 EN 3-6 um, IAu >= 0.05 um (F176); OSP 0.08-0.5 um
(F179). Proposal X8 (section 6).

### 4.3 EMIB-T bridge underfill (PENDING #37, #38)

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| P46 | bridge underfill: tool, dispense and cure analogs | jet valve underfill in the Intel EMIB-family CHIPS package (DB ectc51687.2025.00061-F3-s03 equipment; "Underfill was done with a jet valve", ectc51687.2025.00061 p.4); stage 100-110 C, syringe 72 C (A93, A94); needle CUF substrate preheat 70-80 C (A99); cure 150 C 2 h (A106) or 150-175 C 2 h (A107) | C; h | bridge_uf_t | fact | existing rows A93, A94, A99, A106, A107; DB ectc51687.2025.00061-F3-s03 | 2026-10-23 (repo) | med (no EMIB-T bridge underfill condition found) |

### 4.4 Substrate bump and FLI plating tools (PENDING #39, #40)

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| P47 | EMIB-T FLI formation method | "FLI bump plating" (chemistry / metallurgy for Imax); plating type and tool not stated | - | fli_t | fact | DB ectc51846.2026.00051-F1-s04 (p.3 Sec. II.A.ii (d)) | 2026-10-23 (repo) | high (method only) |
| P48 | panel Cu plating tool class in a build-up flow | "Cu electroplating in sacrificial anode tank" | - | SAP / bump plating on panels | fact | DB ectc51909.2023.00298-F1-s10 (p.2 Sec. II) | 2026-10-23 (repo) | med (academic glass-panel line) |

Not found: the EMIB substrate mixed-pitch bump process / tool (ectc.2016.201 p.6: "precise bump height control for
mixed CD bumps", A194). Template wording proposal X9.

### 4.5 Polymer TIM bond line (PENDING #8)

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| P49 | polymer TIM1 BLT (POR PTIM) | 85 | um | FCBGA-class package with lid (FEA case) | fact | DB ectc51687.2025.00187-c-c6 notes "BLT 85 um in FEA case" (p.4 Sec. II.B.1) | 2026-10-23 (repo) | med (FEA input) |
| P50 | TIM1 BLT (gel or film) under a lid | 60 baseline; 140 tested; 30-120 window | um | TSMC InFO_oS TTV | fact | DB itherm45881.2020.9190542-a-c5 thickness_um 60 (p.2 Table 1); notes "BLT 60 baseline; 140 um tested; 30-120 um considered" | 2026-10-23 (repo) | high |

The EMIB CHIPS package uses a polymer TIM (ectc51687.2025.00061 p.5: "Polymer TIM was chosen"); its BLT is not
stated.

---

## 5. 00027 flow (120 mm Si interposer package to PCB)

### 5.1 Stencil thickness and paste deposit diameter (PENDING #9, #10)

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| P51 | PCB paste stencil for a large BGA package | 4-mil (~100 um) stainless-steel stencil, SAC305 Type 4, final solder volume 84 % of the designed pad volume; 1 mm pitch NSMD ENIG pads; 580 um balls | um; % | 100 x 100 mm glass package on a 150 x 150 mm PCB | fact | DB tcpmt.2025.3614186-F1-s21; tcpmt.2025.3614186 p.4 Sec. II.E.3: "the paste was deposited using a 4-mil (≈100 µm) thick stainless-steel stencil"; p.3 Sec. II.D: "Nonsolder mask defined (NSMD) pads were adopted with a 1 mm pitch" | 2026-10-23 (repo) | high (analog) |
| P52 | Intel LTS stencil design | 4 mil (101.6 um) laser-cut stainless stencil; aperture : land = 1:1; lands 12 mil (304.8 um) and 15 mil (381.0 um); area ratio 0.75 and 1.0 (AR = d / 4t); finest pitch 0.65 mm | um; - | BGA board SMT, SAC and Bi-Sn pastes | fact | Aspandiar et al. (Intel), P14 URL, p.5: "The stencil aperture diameter: land diameter ratio was 1:1. The stencil thickness was 4 mils (101.6 m)"; Table 2 "12 mils (304.8 m)", "15 mils (381.0 m)" | 2026-10-23 | high |

PCB land diameter for the 0.5 mm balls of 00027 is not reported (paper or DB). Proposal X6.

### 5.2 PCB batch-lamination press (PENDING #11, #12, #13)

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| P53 | vacuum press lamination of a multilayer stack | 195 C; 260 N/cm2 (2.6 MPa); total press cycle 180 min | C; MPa; min | R-1566S laminates / R-1551S prepreg stack (embedded-component PCB) | fact | estc60143.2024.10712019 p.3 Sec. II.C: "vacuum press at a temperature of 195°C and a pressure of 260 N/cm2 during a total press lamination cycle of 180 minutes"; DB estc60143.2024.10712019-F1-s05 (temp_c 195, time_s 10800, pressure_mpa 2.6) | 2026-10-23 (repo) | high (analog; different laminate) |
| P54 | FR406 multilayer lamination cycle | full pressure 200-350 psi (14.1-24.6 kg/cm2), 275 psi suggested; heat rise 4.5-6.7 C/min (79-135 C); cure >= 50 min at 177 C (or 185 C in the second cycle); reduce to 50 psi after 15 min at cure; cool <= 2.8 C/min; vacuum throughout | psi; C/min; C; min | Isola FR406 laminate / prepreg | fact | Isola FR406 Processing Guide, https://www.isola-group.com/wp-content/uploads/FR406-High-Performance-Epoxy-Laminate-and-Prepreg-Processing-Guide-1.pdf : "Apply full pressure of 200-350 PSI (14.1-24.6 kg/cm2) on the panels. Suggest 275 PSI (19.3 kg/cm2)"; "Cure for a minimum of 50 minutes @ 177°C (350°F)"; "all cycles assume vacuum is maintained throughout the heating cycle" | 2026-10-23 | high |
| P55 | P54 in SI | 275 psi = 1.90 MPa; 200-350 psi = 1.38-2.41 MPa | MPa | - | derived | x 0.006894757 MPa/psi | - | high |

The 00027 board material is not named ("copper cladding laminate and multi-layer prepreg by a vacuum press
(VH-2347, KITAGAWA SEIKI CO., LTD.)", ectc51687.2025.00027 p.3).

---

## 6. Proposals (template values for items no source gives; render as template)

| ID | for PENDING # | proposed value | reasoning (inputs) |
|---|---|---|---|
| X1 | #1 c4_d_um | 100 um (UBM / plating opening diameter) | J-STD-028 pairs electroplated bumps of 100 um with 200 um pitch (P1) = the 2013 C4 pitch; 0.5 x pitch, same ratio as the 125 / 250 um eutectic row (P1); 150 / 250 um (P2, ratio 0.6) is the upper end (120 um at 200 um pitch). |
| X2 | #2 c4_h_um; #3 c4_res_h_um | plated column 75 um in an 80 um dry-film resist; reflowed cap 80.5 um high, 111.5 um max diameter | Resist must exceed the plated height (P4); 80 um is the thickest DFR in the DB flows (001c.74748-F1-s02, F78), so the straight-wall column is 75 um (5 um margin). Volume-conserving reflow on the 100 um UBM (P9) gives a 111.5 um sphere at 200 um pitch (88 um gap). IBM's ~100 um plated deposit (P3) is the sourced upper bound (100 x 100 um column -> 92.9 um / 119.8 um, still < pitch). Plating time 4311 s at 20 mA/cm2 (P8). |
| X3 | #4 profiles.tcb_T (+ #41-#43) | joint T(t), t from contact: (0 s, 140 C), (1.1 s, 250 C), (4.1 s, 250 C), (6.3 s, 140 C); head set peak 280 C (alternative 325 C); force 39.2 N constant until melt (joint crosses 221 C at 0.81 s), then position control (force to ~0 during solder chase); total ~6 s | Stage / contact 140 C and ramp > 100 C/s, cool > 50 C/s (Intel, P17); 100 C/s ramp also in A13; joint peak 250 C = SnAg cap peak (A55, A10 actual) above the 221 C liquidus (A60); 3 s above liquidus to fit the 6 s of A13 and the 7 s of A10 and lie inside the 7-15 s tool cycle (P18); head 280 C (P18) or 325 C (A13); constant force then solder chase (P17, A17). Force value = A13 (4 kgf fluxless D2W); the large-die bound is A21 (up to 300 N). |
| X4 | #5 profiles.btcb_T; #34-#36 | same T(t) shape as X3 with joint peak 250 C; head set 280 C (P18); force 10 N; time 6 s | Panel-level TCB of a thin (~50 um) bridge (A197); no condition found. SnAg cavity joint assumed (X5) so the same peak applies. Force: the 2 x 2 mm-class DAF-pressure estimate gives < 1 N (P24) but solder TCB needs contact load; 10 N = small-force TC placement of a large chip (A15); a 3 x 18 mm bridge with ~1760 cavity joints at 175 um pitch (package3d emib_t cav_pitch_um) is lighter than a 19 x 19 mm top die (X3, 39 N). Time = A13. |
| X5 | #6 liq_cav_c | Sn-3.5Ag, liquidus 221 C | The bridge back-side joint must be formed before the encapsulation lamination (100-120 C, A163-A164) and ABF cure (<= 180 C, A165), so a 221 C SnAg joint stays solid through the build-up; SnAg is the FLI-side alloy already used by the flow (`liq_fli_c`, A60). A Sn-Bi joint (138 C) would remelt in the 170-180 C cure. No Intel source names the alloy (P12). |
| X6 | #10 paste_d_um | 400 um (aperture = PCB land, 1:1) | Aperture : land 1:1 (Intel, P52); land taken as 0.8 x the 500 um ball (assumption; no land size for 0.5 mm balls found); area ratio 400 / (4 x 101.6) = 0.98 with the 100 um stencil (P51, P52 formula), inside the 0.75-1.0 range Intel printed. Paste deposit height = stencil thickness x 0.84 transfer (P51) if the engine wants a printed volume. |
| X7 | #33 bridge placement force | 1 N | The DAF cure pressure on a 2 x 2 mm bridge is only 0.14-0.41 N (P24); 1 N is the lowest load of a production VCM bond head (A2) and the CoW TCB force of A11. Temperature (#32): stage 95 C >= 30 s at placement, then cure 130 C 1 h (P21, P22). |
| X8 | #31 cavity-pad finish thickness | 2.05 um (ENi 2 um + Au 0.05 um) | Finish type not reported (P45). ENIG is the solder-joint finish already used in the 00027 flow and for interposer pads (F175, A178); IPC-4552 allows EN 3-6 um (F176); the drawn 2 um is below that range (thinner than the IPC-4552 minimum). OSP (0.08-0.5 um, F179) would not be visible at block scale. |
| X9 | #39, #40 tools | "panel electroplating line (through-resist Cu and solder plating)" | FLI by plating (P47); panel Cu plating tank in a build-up flow (P48); mixed-CD bumps need height control (A194), consistent with through-resist plating. Wording only; no tool named by any source. |

---

## 7. Map: PENDING # -> rows -> status

Status: `found` = sourced value (fact or analog, possibly via a derived row); `proposal` = section 6;
`n/a` = searched, nothing usable.

| # | quantity | class | rows | status | value to fill |
|---|---|---|---|---|---|
| 1 | SnPb C4 diameter | drawing | P1, P2 | found (med) | 100 um (X1 range 100-120) |
| 2 | SnPb C4 height | drawing | P3, P4, P9 | proposal (X2) | 75 um plated (reflowed 80.5 um, derived) |
| 3 | C4 plating resist thickness | drawing | P4, F78 | found (analog) | 80 um (001c.74748-F1-s02) |
| 4 | TCB joint T profile (EMIB) | drawing | P17-P20 | proposal (X3) | 140 -> 250 -> 250 -> 140 C over 6.3 s |
| 5 | EMIB-T bridge TCB T profile | drawing | P18, P26 | proposal (X4) | as X3 |
| 6 | EMIB-T cavity joint alloy / liquidus | drawing | P12 | proposal (X5) | Sn-3.5Ag, 221 C |
| 7 | EMIB LTS BGA alloy / liquidus | drawing | P13-P16 | found (Intel, analog) | Bi-Sn(-Ag), 138 C |
| 8 | polymer TIM BLT | drawing | P49, P50 | found (analog) | 85 um (range 30-120) |
| 9 | stencil thickness | drawing | P51, P52 | found (analog) | 100 um |
| 10 | paste deposit diameter | drawing | P52 | proposal (X6) | 400 um |
| 11 | PCB press temperature | hud | P53, P54 | found (analog) | 195 C (177-195) |
| 12 | PCB press time | hud | P53, P54 | found (analog) | 10800 s total cycle (>= 3000 s at cure) |
| 13 | PCB press pressure | hud | P53, P55 | found (analog) | 2.6 MPa (1.38-2.6) |
| 14 | TSV resist dose | hud | P27 | found (med) | 1550 mJ/cm2 |
| 15 | damascene dielectric CVD T | hud | P31 | found | 350 C (200-350) |
| 16 | damascene dose | hud | P28 | found (med) | 25 mJ/cm2 (15-42) |
| 17 | damascene litho tool | hud | P28, P30 | found (template wording) | KrF (248 nm) scanner |
| 18 | damascene etch time | hud | P32, P33 | found (derived, low) | 181 s |
| 19 | dielectric etch tool | hud | P32 | found (analog) | RIE (fluorocarbon) |
| 20 | damascene ECP current density | hud | P36 | found | 20 mA/cm2 (bulk; first step 1.6-7.0) |
| 21 | damascene ECP time | hud | P37 | found (derived) | 136 s |
| 22 | damascene CMP time | hud | P38 | found (derived) | 58 s |
| 23 | Al RDL dose | hud | P29 | found | 245 mJ/cm2 (163-310) |
| 24 | Al RDL etch time | hud | P34, P35 | found (derived, low) | 214 s (171-300) |
| 25 | front passivation tools | hud | P40, P41 | found (analog) | PECVD; litho + fluorine RIE opening |
| 26 | SnPb plating current density | hud | P3 | found | 20 mA/cm2 (20-100) |
| 27 | SnPb plating time | hud | P7, P8 | found (derived) | 4311 s for 75 um at 20 mA/cm2 |
| 28 | C4 bump reflow peak | hud | P10, P11 | found | 235 C (220-235) |
| 29 | C4 joining reflow peak | hud | P10, P11 | found | 220 C (220-235) |
| 30 | electroless Cu bath T | hud | P42, P43 | found (analog) | 40 C (35-55; 48 C glass analog) |
| 31 | cavity-pad finish thickness | hud | P45 | proposal (X8) | 2.05 um ENIG |
| 32 | bridge attach T / cure | hud | P21, P22 | found (analog) | 95 C placement; cure 130 C 1-4 h |
| 33 | bridge placement force | hud | P24, P25 | proposal (X7) | 1 N |
| 34 | EMIB-T bridge TCB head T | hud | P18 | found (generic TCB) | 280 C |
| 35 | EMIB-T bridge TCB force | hud | - | proposal (X4) | 10 N |
| 36 | EMIB-T bridge TCB time | hud | P19 (A13) | proposal (X4) | 6 s |
| 37 | bridge underfill T / cure | hud | P46 | found (analog) | stage 100 C; cure 150 C 7200 s |
| 38 | bridge underfill tool | hud | P46 | found (analog) | jet valve dispenser |
| 39 | substrate bumping process / tool | hud | P47, P48 | proposal (X9) | panel electroplating line |
| 40 | FLI plating tool | hud | P47, P48 | proposal (X9) | panel electroplating line |
| 41 | top-die TCB head T | hud | P18, P19 | found (generic TCB) | 280 C (325 C alt.) |
| 42 | top-die TCB time | hud | P19 | found (analog) | 6 s |
| 43 | top-die TCB force | hud | P19 | found (analog) | 39.2 N |
| 44 | LTS BGA reflow peak | hud | P15 | found (Intel, analog) | 175 C (160-180) |

Counts: drawing_required 10 = 5 found (#1, #3, #7, #8, #9) + 5 proposal (#2, #4, #5, #6, #10) + 0 n/a.
hud_only 34 = 28 found (of which derived: #18, #21, #22, #24, #27) + 6 proposal (#31, #33, #35, #36, #39, #40)
+ 0 n/a. #34 and #41 use the generic K&S head temperature (P18) and count as found; #34-#36 share X4.

---

## 8. Fill block for lane L34 (COMPOSITION.md 1.1 specs; keys per PENDING.md "location")

```yaml
# ---- drawing_required
# 1 flows/cowos_s.yaml geometry.c4_d_um
c4_d_um: {template: 100, source: "RESEARCH_PENDING.md P1, X1 (J-STD-028 Table 4: electroplated bumps 100 um at 200 um pitch, search excerpt)", note: "SnPb C4 size not reported (2013 TV); UBM / plating opening drawn at 0.5 x the 200 um pitch"}
# 2 flows/cowos_s.yaml geometry.c4_h_um
c4_h_um: {template: 75, source: "RESEARCH_PENDING.md X2 (P3, P4, P9)", note: "plated SnPb column height (proposal); resist 80 um must exceed it; reflowed cap 80.5 um / 111.5 um dia on the 100 um UBM (volume conserving); IBM plates ~100 um (P3, upper bound)"}
# 3 geometry/cowos_s.yaml c4_res_h_um
c4_res_h_um: {analog: 001c.74748-F1-s02.thickness_um, note: "C4 plating resist not reported; 80 um dry-film resist (thickest DFR in the DB flows, F78); exceeds the 75 um plated C4 (P4 rule)"}
# 4 geometry/emib.yaml profiles.tcb_T (joint temperature, s from contact)
tcb_T_points: [["0", {template: 140, source: "RESEARCH_PENDING.md P17 (Intel TCB, substrate e.g. 140 C)", note: "contact / preheat"}],
               ["1.1", {template: 250, source: "RESEARCH_PENDING.md X3 (P17 ramp > 100 C/s; A55 / A10 joint peak 250 C)", note: "joint peak"}],
               ["4.1", {template: 250, source: "RESEARCH_PENDING.md X3 (A13 6 s, A10 7 s)", note: "3 s above the 221 C liquidus"}],
               ["6.3", {template: 140, source: "RESEARCH_PENDING.md X3 (P17 cooling > 50 C/s)", note: "release"}]]
# optional force profile (#43): 39.2 N constant from 0 to 0.81 s (joint reaches 221 C), then position control (solder chase, A17 / P17)
# 5 geometry/emib.yaml profiles.btcb_T: same points as tcb_T, source "RESEARCH_PENDING.md X4"
# 6 flows/emib.yaml geometry.liq_cav_c
liq_cav_c: {template: 221, source: "RESEARCH_TOOLS_ASSEMBLY.md A60 (NIST v4: Sn-3.5Ag 221); RESEARCH_PENDING.md X5", note: "cavity-side joint alloy not reported (P12); SnAg assumed so the joint stays solid through encapsulation lamination and ABF cure"}
# 7 flows/emib.yaml geometry.liq_bga_c
liq_bga_c: {template: 138, source: "RESEARCH_PENDING.md P14, P16 (Intel LTS paper, Aspandiar et al.: Bi-Sn eutectic 138 C; NIST Sn-58Bi 138, A52)", note: "EMIB CHIPS BGA 'low-temperature solder' alloy not named (00061); Intel LTS family Bi-Sn(-Ag), MP 138-141 C"}
# 8 flows/emib.yaml geometry.tim_h_um
tim_h_um: {analog: ectc51687.2025.00187-c-c6.notes, value: 85, note: "EMIB polymer TIM BLT not reported; POR polymer TIM1 BLT of a lidded FCBGA-class FEA case; InFO_oS TIM1 60 um (30-120 window, itherm45881.2020.9190542-a-c5)"}
# 9 flows/2p5d_120mm.yaml geometry.stencil_um
stencil_um: {analog: tcpmt.2025.3614186-F1-s21.conditions, value: 100, note: "stencil not reported; 4-mil (~100 um) stencil printing SAC305 paste onto 1 mm-pitch PCB pads of a large BGA package; Intel LTS work also 4 mil (P52)"}
# 10 geometry/2p5d_120mm.yaml paste_d_um
paste_d_um: {template: 400, source: "RESEARCH_PENDING.md X6 (P52: aperture : land 1:1)", note: "PCB land for 0.5 mm balls not reported; land and aperture drawn at 0.8 x ball (assumption); area ratio 0.98 with the 100 um stencil"}

# ---- hud_only (replace the {na}); step / op keys per PENDING.md
s13.hud.temp_c: {analog: estc60143.2024.10712019-F1-s05.temp_c, note: "195 C vacuum press of a laminate / prepreg stack; FR406 cures at 177-185 C (P54)"}
s13.hud.time_s: {analog: estc60143.2024.10712019-F1-s05.time_s, note: "total press cycle 180 min; FR406 >= 50 min at cure temperature (P54)"}
s13.hud.pressure_mpa: {analog: estc60143.2024.10712019-F1-s05.pressure_mpa, note: "260 N/cm2; FR406 200-350 psi = 1.38-2.41 MPa (P54, P55)"}
tsv_etch.pattern.hud.dose_mj_cm2: {template: 1550, source: "RESEARCH_PENDING.md P27 (AZ 9260 spec sheet: 10 um contact holes in 12 um resist, Ultratech 1500 gh-line)", note: "TSV litho dose not reported; FEM 1200-2600 mJ/cm2"}
fs_interconnect.diel.hud.temp_c: {template: 350, source: "RESEARCH_PENDING.md P31 (ectc51909.2023.00048 Table I 'High T TEOS (350 C)'; ectc51529.2024.00392 CCP PECVD 200-350 C)", note: "BEOL dielectric on the full-thickness wafer (no carrier)"}
fs_interconnect.litho.equipment: {template: "KrF (248 nm) scanner", refs: [ectc51909.2023.00230-F1-s02.step], source: "RESEARCH_PENDING.md P28, P30", note: "0.4 / 0.4 um lines need DUV; 248 nm litho in a 300 mm Si interposer fab"}
fs_interconnect.litho.hud.dose_mj_cm2: {template: 25, source: "RESEARCH_PENDING.md P28 (US7303852B2 Table 2: 15-42 mJ/cm2 at 0.18 um L/S, KrF)", note: "damascene dose not reported"}
fs_interconnect.etch.equipment: {analog: ectc51529.2024.00392-F1-s12.equipment, note: "fluorine RIE (CHF3 / C4F8 / Ar) of nitride + oxide"}
fs_interconnect.etch.hud.time_s: {template: "(imd_h_um + cu_h_um) / 0.51 * 60", source: "RESEARCH_PENDING.md P32, P33", note: "0.51 um/min fluorine RIE (ectc51529.2024.00392-F1-s12); no over-etch"}
fs_interconnect.ecp.hud.current_density_ma_cm2: {template: 20, source: "RESEARCH_PENDING.md P36 (US6140241A, TSMC: 9.5-25 mA/cm2 bulk step after 1.6-7.0)", note: "bulk step"}
fs_interconnect.ecp.hud.time_s: {template: "dam_ovb_um / (0.02205 * 20) * 60", source: "RESEARCH_TOOLS_FAB.md F70; RESEARCH_PENDING.md P37", note: "Faraday time at 20 mA/cm2, 100 % efficiency"}
fs_interconnect.cmp.hud.time_s: {template: "dam_ovb_um / 1.0268 * 60", source: "RESEARCH_TOOLS_FAB.md F105; RESEARCH_PENDING.md P38", note: "overburden only; barrier clear not included"}
fs_interconnect.al_litho.hud.dose_mj_cm2: {template: 245, source: "RESEARCH_PENDING.md P29 (SPR955-CM: 245 mJ/cm2 at 0.40 um L/S in 1.40 um, i-line)", note: "Al RDL dose not reported"}
fs_interconnect.al_etch.hud.time_s: {template: "al_h_um / 0.28 * 60", source: "RESEARCH_PENDING.md P34, P35 (US4444618A: 2000-3500 A/min Al(Si) RIE)", note: "low confidence; no over-etch"}
fs_passivation.equipment: {analog: ectc51846.2026.00065-F1-s01.equipment, note: "PECVD passivation on a Si interposer; opening by litho + fluorine RIE (ectc51529.2024.00392-F1-s12)"}
c4_bumping.plate.hud.current_density_ma_cm2: {template: 20, source: "RESEARCH_PENDING.md P3 (US6622907B2, IBM: eutectic PbSn from MSA, 20-100 mA/cm2)", note: "lower end"}
c4_bumping.plate.hud.time_s: {template: "c4_h_um / (0.05219 * 20) * 60", source: "RESEARCH_PENDING.md P7, P8", note: "Faraday time for 63Sn37Pb (rho 8.4, NIST), 100 % efficiency"}
c4_bumping.reflow.hud.temp_c_max: {template: 235, source: "RESEARCH_PENDING.md P10, P11 (J-STD-020 SnPb via Renesas TB493: Tc 235 / 220 C, TL 183 C, 60-150 s above TL)", note: "wafer-level bump reflow; thin (< 2.5 mm), small-volume class of Table 2"}
on_substrate.reflow.hud.temp_c_max: {template: 220, source: "RESEARCH_PENDING.md P10, P11", note: "package >= 350 mm3: Tc 220 C"}
buildup.seed.hud.temp_c: {template: 40, source: "RESEARCH_PENDING.md P42 (US9702046B2: 30-60 C preferred, examples 35-55 C)", note: "48 C TGV analog (tcpmt.2025.3557232-F1-s08)"}   # same for via_plating.seed
cavity_t.hud.thickness_um: {template: 2.05, source: "RESEARCH_PENDING.md X8 (F175, F176)", note: "finish type not reported; ENi 2 / Au 0.05 um drawn as ENIG"}
bridge_place.hud.temp_c: {analog: ectc51846.2026.00416-F1-s06.temp_c, note: "die into blind cavity on DAF: > 95 C for >= 30 s; DAF cure 130 C 4 h (P21) or 1 h (P22)"}
bridge_place.hud.force_n: {template: 1, source: "RESEARCH_PENDING.md X7 (A2 VCM head minimum; P24)", note: "placement force not reported"}
bridge_place_t.hud.temp_c: {template: 280, source: "RESEARCH_PENDING.md P18 (K&S IMAPS 2014: head ~280 C)", note: "bond-head set; joint profile btcb_T"}
bridge_place_t.hud.force_n: {template: 10, source: "RESEARCH_PENDING.md X4 (A15)", note: "proposal"}
bridge_place_t.hud.time_s: {template: 6, source: "RESEARCH_PENDING.md X4 (A13)", note: "proposal"}
bridge_uf_t.equipment: {analog: ectc51687.2025.00061-F3-s03.equipment, note: "jet valve underfill of the EMIB-family CHIPS package"}
bridge_uf_t.hud.temp_c: {template: 100, source: "RESEARCH_TOOLS_ASSEMBLY.md A93 (stage 100 C)", note: "cure 150 C 2 h (A106)"}
bumps.equipment: {template: "panel electroplating line (through-resist Cu and solder plating)", refs: [ectc51909.2023.00298-F1-s10.step], source: "RESEARCH_PENDING.md X9", note: "process not stated (2016)"}
fli_t.equipment: {template: "panel electroplating line (through-resist Cu and solder plating)", refs: [ectc51846.2026.00051-F1-s04.step], source: "RESEARCH_PENDING.md X9", note: "'FLI bump plating', tool not named"}
tcb.hud.temp_c: {template: 280, source: "RESEARCH_PENDING.md P18 (K&S); A13 325 C alternative", note: "bond-head set; joint profile tcb_T peaks at 250 C"}
tcb.hud.time_s: {analog: ectc51529.2024.00311-F1-s08.time_s, note: "6 s fluxless D2W TCB (A13)"}
tcb.hud.force_n: {analog: ectc51529.2024.00311-F1-s08.force_n, note: "4 kgf (A13); large dies up to 300 N (A21)"}
bga.hud.temp_c_max: {template: 175, source: "RESEARCH_PENDING.md P15 (Intel: Bi-Sn-Ag peak 170-180 C)", note: "00027 LTS top 160 C (A51)"}
```

---

## 9. Most uncertain items

1. EMIB / EMIB-T TCB (X3, X4): no Intel number for temperature, force or time; the profile is assembled from an
   Intel process description (P17), a K&S tool paper (P18) and non-EMIB DB rows (A10, A13, A15).
2. SnPb C4 geometry (X1, X2): the 100 um / 200 um pairing comes from a standard's table title read in a search
   excerpt; plated height and resist are physically reasoned, not reported.
3. EMIB-T cavity joint alloy (X5) and cavity-pad finish (X8): Intel names neither.
4. Al etch rate (P34): 1984 RIE data with an obsolete CCl4 chemistry; modern Cl2/BCl3 rates not found.
5. Doses: TSV dose is a gh-line broadband stepper value for AZ 9260 (P27); damascene dose from resist patent
   examples (P28); both are tool- and resist-specific.
6. Paste diameter (X6): the PCB land size for 0.5 mm balls is an assumption (0.8 x ball).
