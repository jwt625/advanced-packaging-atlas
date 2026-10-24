# RESEARCH_TOOLS_FAB: wafer-level / interposer-fab tools for the process animation

Owner: research lane L32 (DevLog-016, research agent R-a). Date: 2026-10-23. Status: first pass, done.
Scope: DRIE Bosch TSV etch, TSV oxide liner, PVD barrier/seed, ECP (TSV fill, through-mask pillar/pad, Faraday
rates), lithography (spin coat, dry film, i-line stepper, develop), resist strip and seed etch, Cu CMP, backgrinding,
TSV reveal, mold grinding, temporary bonding and laser debond, blade dicing, polyimide coat/cure, ENIG and OSP.
Assembly / substrate / package tools are in `RESEARCH_TOOLS_ASSEMBLY.md` (lane L33); ENIG/OSP on organic substrates
also appears there (section 9); this file covers the wafer/interposer-pad view.

## How to read this file

- Every row: ID, quantity, value/range, unit, applies to, kind, source + quote/locator, accessed, confidence.
- Kind: `fact` (stated by the source), `derived` (formula over fact rows; formula given), `estimate` (typical range
  across several sources), `assumption` (no source found; rationale given; render as template).
- Repo papers: `paper_id p.N Sec.` from `references/<paper_id>/text.md` (page from the `<!-- page N -->` markers);
  DB rows: `step_id` from `data/process_steps.csv` (its `locator` column gives the paper page). Web: URL, accessed
  2026-10-23.
- Confidence: `high` = primary document quoted verbatim; `med` = primary but read via a search-result excerpt (page
  fetch blocked or 404) or a similar-but-different tool/material; `low` = derived with strong assumptions, third-party
  listing, or different application domain (e.g. PCB dry film).
- "N/A (not found)" = searched, absent. Do not fill these with invented values; render as template.
- Units as the source states them; conversions are `derived` rows.

Not reached (2026-10-23): appliedmaterials.com (HTTP 403), kla.com / spts.com app notes (KLA "Access Denied", 404 on
spts.com PDFs), canon-europe.com and usa.canon.com (403), electronics.saint-gobain.com (403), svc.org (403),
koreascience.or.kr and lnf-wiki.eecs.umich.edu (connection refused), smtnet.com (refused). Stopped on each after one
attempt. No logins, no paywalled downloads, no paper retrieval scripts. Public PDFs that WebFetch could not parse
were saved to the session scratchpad and read with pypdf (DISCO DAG810 user guide at Notre Dame, Weichart 2009 SVC
HIPIMS paper, Willey 2010 IMAPS TSV paper, Klumpp 2010 DATE paper, DISCO DAD3220 brochure, Ordyl Alpha 900 dry-film
datasheet, HD MicroSystems PI-2600 datasheet, IPC-4552 TOC/Table 3-1); nothing was written into the repo cache.

---

## 1. DRIE Bosch TSV etch

### 1.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| F1 | Bosch gas flows and pressure, deep via | SF6 200 sccm; C4F8 150 sccm; 25 mTorr; etch:passivation time ~1:1 | sccm; mTorr | 70 um x 300 um Si via, 4-in wafer | fact | tcpmt.2026.3708099 p.2 Sec. II.A: "an SF6 flow rate of 200 standard cubic centimeters per minute (sccm), a C4F8 flow rate of 150 sccm, a chamber pressure of 25 millitorr (mtorr), and an etching-to-passivation time ratio of approximately 1:1" | 2026-10-23 (repo) | high |
| F2 | Bosch step times and etch per cycle (loop) vs pattern size | steps ~5 s polymer deposition / 3 s polymer etch / 5 s Si etch; etch per loop 1.11, 1.04, 0.93, 0.79, 0.73 um for 100, 50, 20, 10, 8 um patterns | s; um/loop | Si via DRIE, PR mask | fact | KoreaScience JAKO201506050207441 (2015; authors not verified), https://koreascience.or.kr/article/JAKO201506050207441.pdf (search-result excerpt; fetch refused): "Etch rate [μm/loop] 1.11 1.04 0.93 0.79 0.73" | 2026-10-23 | med |
| F3 | Bosch scallop size vs pattern size | 304, 331, 291, 265, 225 nm for 100, 50, 20, 10, 8 um patterns | nm | same as F2 | fact | same source as F2, excerpt: "Scallop [nm] 304 331 291 265 225" | 2026-10-23 | med |
| F4 | typical Bosch cycle duration | about 5 s per alternating step | s | generic DRIE | fact | arXiv 1705.10150 (search-result excerpt): "The alternating cycles (typically lasting about 5 s)" https://arxiv.org/pdf/1705.10150 | 2026-10-23 | med |
| F5 | nano-Bosch recipe, small features | passivation ~9 s C4F8 100 sccm; etch ~6 s SF6 60 sccm + O2 15 sccm; 212-249 nm per cycle | s; nm/cycle | STS ICP, PMMA mask, 2.8 um deep | fact | https://www.nanolithography.gatech.edu/etching/STS-ICP-2020.pdf (search-result excerpt) | 2026-10-23 | med |
| F6 | generic Bosch cycle (primer) | passivation ~10 s C4F8; etch ~15 s SF6; 0.5-1 um per cycle | s; um | DRIE primer | fact | U. Alberta nanoFAB primer https://www.nanofab.ualberta.ca/wp-content/uploads/2009/03/primer_deepsiliconrie.pdf (search-result excerpt; PDF 404 on fetch): "A single cycle will etch 0.5 to 1 um" | 2026-10-23 | med |
| F7 | scallop baseline vs optimized, 1 x 15 um TSV | baseline > 45 nm with top overhang; optimized < 30 nm at top, slightly tapered | nm | 1 um CD, AR 15 TSV, 300 mm | fact | ectc51687.2025.00356 p.3 Sec. III.B: "an overhang at the top with a rough scallop of more than 45nm"; "minor scallop of less than 30nm at the top" | 2026-10-23 (repo) | high |
| F8 | fine-scallop process limit | scallops < 5 nm with 0.1 s gas switching at 2 um/min; < 100 nm for 2.5 um wide, 100 um deep (AR 40) | nm; um/min | Samco DRIE | fact | https://www.samcointl.com/?p=4412 : "0.1 second high-speed gas switching"; "less than 5 nm"; "2 μm/min"; AR "40", "2.5µm", "100 µm", scallops "less than 100 nm" | 2026-10-23 | high (vendor claim) |
| F9 | scallop size control knob | shorter etch time per cycle -> smaller scallops; etch/deposition time and coil power ramped with depth | - | 60 um x 400-410 um TSV | fact | 001c.147098 p.3 Sec. II: "The etching time per cycle was reduced to decrease the size of the scallops"; "we ramped the parameters (etching time, deposition time, and coil power)" | 2026-10-23 (repo) | high |
| F10 | example 10 x 100 um Bosch TSV result | 10.23-10.61 um diameter, 102.9 um depth | um | TSV, SF6 Bosch | fact | DB tcpmt.2024.3443855-F1-s07 (p.5 Sec. III.A; p.5 Fig. 7(b)) | 2026-10-23 (repo) | high |
| F11 | example TSV-middle geometry | 12 um diameter, 100 um deep; Bosch DRIE through PR | um | CEA-LETI POPSTAR interposer | fact | ectc51909.2023.00009 p.4 Sec. III.B: "TSV middle like with a 12 μm diameter and 100 μm thick" | 2026-10-23 (repo) | high |
| F12 | standard TSV dimension range | CD 3-10 um, AR up to 10 | um; - | via-middle TSV | fact | ectc51687.2025.00356 p.4 Sec. III.D: "standard TSVs dimensions (CD 3-10μm, AR up to 10)" | 2026-10-23 (repo) | high |
| F13 | TSV sizes named in Lam TSV plating patent | 5 x 50 um and 10 x 100 um | um | TSV | fact | US12305307 (Lam Research) https://patents.google.com/patent/US12305307 : "TSVs include 5 × 50 μm and 10 × 100 μm features." | 2026-10-23 | high |
| F14 | ICP chamber powers (SPTS Omega fxP, Synapse ICP) | source 2200 W, platen 800 W, 13.56 MHz both; 5-10 mTorr; chuck 0 C with backside He | W; mTorr; C | ICP deep etch (SiC; chamber analog for Si DRIE) | fact | eptc67330.2025.11392276 p.2 Sec. II.A: "the source power and platen power were maintained at 2200 W and 800W"; DB eptc67330.2025.11392276-F1-s06 | 2026-10-23 (repo) | med (SiC chamber) |
| F15 | SPTS ICP powers, max rate | platen 1000 W, coil 2000 W; electrostatic chuck + clamp ring | W | SPTS ICP (SiC vias) | fact | DB tcpmt.2021.3123384-F1-s12 (p.3 Sec. II.A; Fig. 3) | 2026-10-23 (repo) | med (SiC) |
| F16 | Si DRIE tool, TSV | Telius SP 307H (Tokyo Electron); SF6, Ar, O2; notching at Si/SiO2 suppressed by etch time | - | TSV hole etch | fact | ectc51909.2023.00307 p.2 Sec. II: "etching system (Telius SP 307H, Tokyo Electron)"; DB ectc51909.2023.00307-F1-s06 | 2026-10-23 (repo) | high |
| F17 | derived: loops and time for 10 x 100 um | 100 / 0.79 = ~127 loops; 127 x 13 s = ~27 min; mean ~3.6 um/min | loops; min; um/min | 10 um TSV, F2 recipe | derived | N = depth / etch_per_loop (F2, 10 um row); t = N x (5+3+5) s | - | low (single recipe) |
| F18 | plasma glow colour / chamber appearance | N/A (not found) | - | DRIE chamber | assumption | no public source read; render as template (desaturated) | - | - |

### 1.2 Animation-ready summary (DRIE)

- Feature: 10 x 100 um TSV (F10, F13) default; 12 x 100 (F11) alternative. Etch per cycle 0.79 um (F2, 10 um row),
  scallop pitch = etch per cycle, scallop depth 0.265 um (F3); fine-scallop option < 0.03 um (F7).
- Cycle: passivation (C4F8) then etch (SF6), ~1:1 time (F1), ~5 s each (F4; F2 5/3/5 s). HUD: SF6 200 / C4F8 150
  sccm, 25 mTorr (F1); source/platen 2200/800 W (F14, med).
- Physics: depth(t) = N(t) x e_c with N = floor(t / t_cycle); scallops = N half-cylinders of radius ~ scallop depth
  along the wall; ~127 cycles for 100 um (F17). Liner/PVD follow the scalloped wall.
- Kinematics: wafer static on electrostatic chuck (F15); ICP coil above; alternate glow tint per half-cycle (colour
  template, F18); passivation film pulse coats the hole, etch step clears the bottom, then isotropic undercut.

---

## 2. TSV oxide liner (PECVD / SACVD / thermal)

### 2.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| F19 | liner stack, TSV middle | 300 nm SACVD + 100 nm PECVD SiO2 | nm | 12 x 100 um TSV | fact | ectc51909.2023.00009 p.4 Sec. III.B: "300 nm of Sub-Atmospheric Chemical Vapor Deposition (SACVD) and 100 nm of Plasma Enhanced CVD (PECVD) silicon oxide" | 2026-10-23 (repo) | high |
| F20 | SACVD O3/TEOS conformality at AR > 16 | ~43 | % | Bosch TSV | fact | Klumpp et al., DATE 2010, https://past.date-conference.com/proceedings-archive/2010/DATE10/PDFFILES/12.2_1.PDF Fig. 1: "Conformality of ~43 % - SACVD O3/TEOS film deposited in a TSV with an AR >16:1" | 2026-10-23 | high |
| F21 | required liner conformality for AR >= 10 | 50-60 | % | HAR TSV isolation | fact | same, p.1: "requires a film conformality in the range of 50-60%" | 2026-10-23 | high |
| F22 | SACVD O3/TEOS pressure | 100-600 | Torr | SACVD | fact | same: "Ozone (O3) in a pressure range of 100 -600 Torr" | 2026-10-23 | high |
| F23 | SACVD smooths scallops if film >= scallop size | qualitative | - | Bosch TSV wall | fact | same: "sidewall roughness can be tremendously reduced, if the deposited SiO2 film thickness is equal or thicker than the size of the trench sidewall scallops" | 2026-10-23 | high |
| F24 | PECVD vs plasma-activated conformal film, bottom-corner coverage at 10:1 | PECVD SiO2 at 180 C ~6 %; conformal film deposition ~25 % | % | 10:1 TSV | fact | US8101531 https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8101531 (search-result excerpt): "a PECVD SiO2 film deposited at 180° C. may provide a bottom corner coverage of only approximately 6%" | 2026-10-23 | med |
| F25 | low-T TSV liner temperature | <= 180 C (via-last, bonded to carrier) | C | via-last liner | fact | Willey et al., IMAPS 2010 (Novellus) p.2: "deposition temperatures of 180 °C and lower"; "(<180 °C in the vias last, backside case)" (PDF via meridian.allenpress / imapsource.org) | 2026-10-23 | high |
| F26 | PE-CVD TSV liner, via-last die-level | conformal SiO2 at 200 C | C | 9.3 x 40 um TSV | fact | ectc51846.2026.00424 p.2 Sec. II.B: "A conformal SiO2 isolation liner was subsequently deposited using PE-CVD (Step 5) at 200℃" | 2026-10-23 (repo) | high |
| F27 | TEOS liner on bonded wafer | TEOS + O2, stage 423 K (~150 C) | C | Samco PD-330STC | fact | DB ectc51909.2023.00307-F1-s14 (p.2 Sec. II) | 2026-10-23 (repo) | high |
| F28 | liner for 1 x 15 um TSV | CVD SiO2 (thickness not stated) | - | 300 mm via-middle | fact | ectc51687.2025.00356 p.2 Sec. II: "an SiO2 liner and Ta barrier/Cu seed layers were deposited ... by chemical vapor deposition (CVD) and PVD" | 2026-10-23 (repo) | high |
| F29 | thermal oxide TSV liner thickness / temperature | N/A (not found) | - | thermal liner | assumption | none in DB or read sources | - | - |
| F30 | derived: liner bottom thickness | t_bottom = c x t_field; e.g. 0.4 um field x 0.43 = ~0.17 um | um | SACVD, AR > 16 | derived | F19 x F20 (different TSVs; illustrative combination) | - | low |

### 2.2 Animation-ready summary (liner)

- Film: 0.3 um SACVD + 0.1 um PECVD (F19). Conformality: field 1.0, sidewall-to-bottom ramp to 0.43 (F20) for
  SACVD; PECVD bottom corner 0.06 (F24). HUD temperature 180-200 C (F25, F26).
- Physics: thickness(z) = t_field x c(z), c linear from 1 at top to c_bottom at the floor; SACVD rounds scallops when
  t >= scallop depth (F23).
- Kinematics: wafer static on heated pedestal, showerhead above, film grows uniformly in time (no tool motion).

---

## 3. PVD barrier / seed (Ti, Ta/TaN, Cu)

### 3.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| F31 | magnetron target diameter (200 mm wafer tool) | 300 | mm | Oerlikon ARQ151 rotating-magnet source | fact | Weichart et al., SVC 2009 p.202 (HIPIMS TSV): "takes up a target diameter of 300mm directly cooled and specified for an average power up to 20kW" (https://www.shu.ac.uk/~/media/home/research/meri/what-we-do/projects/pvd-processes-in-high-aspect-ratio-featres-by-hipims.pdf) | 2026-10-23 | high |
| F32 | target-to-substrate distance | 50-80 (typical); 60 in a basic magnetron TSV seed | mm | PVD TSV barrier/seed | fact | Weichart 2009: "adjustable by movement of the substrate stage between 50 and 80mm"; ectc51846.2026.00424 p.2 Sec. II.B: "short target-to-wafer distance of only 60 mm" | 2026-10-23 | high |
| F33 | substrate stage features | mechanical clamp, backside gas cooling, RF bias | - | PVD module | fact | Weichart 2009 p.202: "substrate stage with mechanical clamping which allows substrate cooling by backside gas application"; "an RF bias together with a proper matching circuit is applied" | 2026-10-23 | high |
| F34 | Ti bottom coverage, HIPIMS | 20 % at AR 10:1; 7 % at AR 30:1 | % | Ti in Si trenches | fact | Weichart 2009 abstract: "For Ti a bottom coverage of 20% in trenches with AR 10:1 and 7% in trenches with AR 30:1" | 2026-10-23 | high |
| F35 | Cu and Ta bottom coverage relative to Ti | ~0.5 x Ti | - | HIPIMS | fact | Weichart 2009 p.205: "these materials typically provide roughly half of the bottom coverage of Ti" | 2026-10-23 | high |
| F36 | 100 um deep AR 10 via, thick Ti/Cu | Ti 1.5 um + Cu 4 um field; > 300 nm at bottom; >= 40 nm on sidewalls; mid-sidewall thinner than lower sidewall (bottom resputter) | um; nm | 10 x 100 um via | fact | Weichart 2009 p.205: "more than 300nm material in the bottom and a minimum of 40nm along the sidewalls" | 2026-10-23 | high |
| F37 | HIPIMS deposition rates | Ti 2.8; Ta 3.2; Cu 6.6 | nm/s | 200 mm | fact | Weichart 2009 Table 1 | 2026-10-23 | high |
| F38 | conventional vs ionized Cu seed for 60 um deep 10:1 TSV | conventional 6000-8000 A; HCM ionized 2000 A for void-free fill | A | Novellus IONFLO | fact | Willey 2010 IMAPS p.2-3: "requires only a 2000Å-thick IONFLO™ copper seed layer ... compared to a conventional PVD approach that requires an 6000-8000Å-thick seed layer" | 2026-10-23 | high |
| F39 | ionized PVD wafer temperature | <= ~100 | C | IONFLO | fact | Willey 2010: "the wafer temperature does not rise above ~100°C" | 2026-10-23 | high |
| F40 | basic magnetron Ti/Cu for 4:1 TSV | Ti 100 nm / Cu 1900 nm, no substrate bias, not long-throw/ionized | nm | 9.3 x 40 um via-last | fact | ectc51846.2026.00424 p.2 Sec. II.B: "(Ti/Cu, 100nm/1900nm) ... standard magnetron sputtering tool, not long-throw and/or ionized PVD" | 2026-10-23 (repo) | high |
| F41 | sidewall barrier/seed, 1 um vias, high-power magnetron | Ta ~13 nm, Cu ~17 nm at sidewall | nm | MLV, high AR | fact | DB ectc51687.2025.00009-F1-s06 (p.4 Sec. III.A; Fig. 10) | 2026-10-23 (repo) | high |
| F42 | seed thickness vs coverage depth, 1 x 15 um TSV | 37.5 % POR seed covers only to 11 um depth; 50-56.25 % POR covers full depth; thicker seed enlarges top pinch-off (overhang) | % POR; um | AR 15 TSV | fact | ectc51687.2025.00356 p.3 Sec. III.C: "good seed coverage can be achieved only up to a depth of 11μm"; "the pinch-off void at the TSVs top becomes larger when the seed thickness increases, which is due to the PVD overhang" | 2026-10-23 (repo) | high |
| F43 | Ta / Cu PVD for TSV | Ta 0.1 um, Cu 0.3 um | um | Bosch TSV | fact | DB ectc51687.2025.00071-F1-s06, -s07 (p.2 Fig. 1) | 2026-10-23 (repo) | high |
| F44 | Ti / TiN / Cu stack, TSV middle | Ti PVD + TiN CVD + Cu PVD + electrografted Cu (PVD Cu conformality limited) | - | 12 x 100 um TSV | fact | ectc51909.2023.00009 p.4 Sec. III.B: "As the conformality of the Cu PVD process is limited an additional electro-grafted Cu layer is plated" | 2026-10-23 (repo) | high |
| F45 | long-throw Cu seed for 60 x 400 um TSV | ~4000 nm field; TiN 100 nm ALD at 200 C beneath | nm | 001c.147098 | fact | 001c.147098 p.3 Sec. II: "Cu film was deposited by long-throw sputtering with a surface thickness of approximately 4000 nm" | 2026-10-23 (repo) | high |
| F46 | Ti/Cu seed for RDL / pillars (typical) | Ti 25-100 nm; Cu 150-500 nm | nm | wafer RDL, UBM seed | estimate | DB ectc51909.2023.00155-F1-s01 (Ti 25 / Cu 150 nm), ectc51909.2023.00155-F2-s05 (100/500), ectc51846.2026.00103-F1-s09 (50/200), tcpmt.2025.3599484-F1-s07/-s08 (50/150) | 2026-10-23 (repo) | high |
| F47 | vendor step-coverage claim | iPVD Cu barrier/seed for TSVs up to 10:1 | - | SPTS PVD | fact | https://spts.com/markets/advanced-packaging/pvd-advanced-packaging (search-result excerpt): "world class step coverage for PVD Cu barrier/seed in TSVs with aspect ratios of up to 10:1" | 2026-10-23 | med |
| F48 | MOCVD TiN bottom coverage in slots | 30-70 % (1-5 um wide, 30 um deep slots) | % | TiN MOCVD | fact | Klumpp DATE 2010: "TiN films show a step coverage of 30 % to 70 % at the bottom of the via, depending on the width of the slot hole" | 2026-10-23 | high |
| F49 | 300 mm PVD target / magnet geometry | N/A (not found) | - | 300 mm tools (Endura, etc.) | assumption | Endura named in DB ectc51846.2026.00130-F1-s08; no public geometry read | - | - |

### 3.2 Animation-ready summary (PVD)

- Tool: disk target 300 mm dia for 200 mm wafer (F31) above the wafer at 50-80 mm (F32); for 300 mm wafers scale the
  target to the same ratio (F49, template). Rotating magnet behind target; plasma ring (racetrack) under the target;
  wafer clamped, backside-gas-cooled, RF-biased (F33).
- Films: Ti 0.1 um / Cu 0.3-1.9 um TSV seed (F40, F43); RDL seed Ti 0.05 / Cu 0.2 um (F46).
- Step coverage model (TSV 10:1): field 1.0; Ti bottom 0.20, Cu/Ta bottom 0.10 (F34, F35); sidewall minimum ~0.01-0.03
  of field (F36: >= 40 nm vs 4 um Cu, 1.5 um Ti); overhang at the top lip grows with thickness (F42).
- Kinematics: wafer static; magnet rotates (rate N/A, template); flux shown as straight rays from the racetrack with a
  narrowed angular spread when ionized.

---

## 4. ECP: TSV superfill, through-mask pillar/pad plating, Faraday rates

### 4.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| F50 | plating cell layout | wafer face down in a "clamshell" holder on a rotating spindle; anode below the wafer; cation exchange membrane; ionically resistive element close to the wafer | - | Lam TSV plating | fact | US12305307 https://patents.google.com/patent/US12305307 : "held by, e.g., a “clamshell” substrate holder 809"; "a wafer-facing-down electroplating apparatus"; "An anode 813 is disposed below the wafer"; "cationic exchange membrane (CEM) may be used" | 2026-10-23 | high |
| F51 | ionically resistive element geometry | 6000-12000 non-communicating holes; hole dia 0.01-0.08 in; 2-5 % open area; wafer within ~5-10 mm; cross-flow manifold 1-4 mm high | -; in; %; mm | same | fact | US12305307: "between about 6,000-12,000 non-communicating through-holes"; "diameter of about 0.01 to 0.08 inches"; "about 2-5% ... open area"; "within about 10 mm, more preferably within about 5 mm"; "height between about 1 mm-4 mm" | 2026-10-23 | high |
| F52 | TSV plating bath | 60 g/L Cu, 60 g/L H2SO4, 50 ppm Cl; accelerator 1-200 ppm, suppressor 5-1000 ppm, leveler 1-500 ppm; 20-25 C | g/L; ppm; C | TSV fill | fact | US12305307: "60 g/L Cu, 60 g/L sulfuric acid, and 50 ppm chloride"; "at room temperature (e.g., at about 20-25° C.)" | 2026-10-23 | high |
| F53 | TSV fill current schedule | baseline 0.1-10 mA/cm2; pulse >= 2x baseline (3-5x) for 10-200 s; ramp down >= 30 s; peak ~2 A per 300 mm wafer | mA/cm2; s; A | TSV 5x50, 10x100 | fact | US12305307 claim 6: "between 0.1 and 10 mA/cm2"; "a magnitude of at least about 2 times a magnitude of a baseline current"; "about 2A for a 300 mm wafer" | 2026-10-23 | high |
| F54 | wafer rotation during TSV plating | 50-100 rpm (one embodiment >= 100 rpm) | rpm | TSV 10-80 um dia, 20-200 um deep | fact | US20130249096A1 https://patents.google.com/patent/US20130249096A1/en : "the speed is between about 50 rpm and 100 rpm" | 2026-10-23 | high |
| F55 | TSV fill time claim | < ~17 min (annealed seed); 0.1-20 mA/cm2; ~25 C | min | same | fact | US20130249096A1: "over a period of less than about 17 minutes"; "between about 0.1 and 20 mA/cm 2" | 2026-10-23 | med (application, abandoned) |
| F56 | typical TSV fill time | tens of minutes for 60-100 um TSVs | min | TSV | fact | Willey 2010 IMAPS p.3: "process times for 60-100µm TSV structures in the order of tens of minutes" | 2026-10-23 | high |
| F57 | 3-step periodic-pulse-reverse TSV fill | 0.5 mA/cm2 10 min; PPR 4 mA/cm2 10 s, -2 mA/cm2 2 s, 0 mA/cm2 8 s for 180 min; 6 mA/cm2 120 min; 300 K | mA/cm2; min | TSV, face-up 4C204 (Tosetz) | fact | ectc51909.2023.00307 p.4 Table I; DB -s19, -s27, -s28 | 2026-10-23 (repo) | high |
| F58 | deep via bottom-up fill | 0.5 ASD for 10 h void-free (0.4 ASD V-shaped void); 23 C; nozzle jetting, anode oscillation | A/dm2; h | 70 x 300 um via | fact | tcpmt.2026.3708099 p.2 Sec. II.C: "0.4 and 0.5 ASD, respectively, with a plating time of 10 h"; DB tcpmt.2026.3708099-F1-s05 | 2026-10-23 (repo) | high |
| F59 | 1 x 15 um TSV fill | initial low-duty pulse (6.25 % duty, 2x peak) as seed enhancement; overburden ~740 nm; +18 % current -> 7.5 um void | %; nm | AR 15 TSV | fact | ectc51687.2025.00356 p.3-4 Sec. III.D: "Applying 6.25% duty cycle with twice the peak current"; "The Cu overburden thickness is approximately 740 nm"; "reaches 7.5μm in length at 118% current density" | 2026-10-23 (repo) | high |
| F60 | overburden after TSV fill | < 3 um (CEA-LETI); 2-3 um (ectc51529.2024.00392); 0.74 um (A*STAR) | um | TSV | estimate | ectc51909.2023.00009 p.4: "remaining Cu surface thickness lower than 3 μm"; DB ectc51529.2024.00392-F1-s14; F59 | 2026-10-23 (repo) | high |
| F61 | DC / pulse-reverse TSV fill | DC 2.5 mA/cm2; PR iF 3.5 mA/cm2 90 ms, iR -10 mA/cm2 10 ms | mA/cm2; ms | Bosch TSV | fact | DB ectc51687.2025.00071-F1-s09, -s10 (p.2 Sec. II.A; Fig. 3) | 2026-10-23 (repo) | high |
| F62 | Cu pillar through-mask plating | 5 ASD, 25 C, 110 um pillars (SC-50, MacDermid) | A/dm2; C; um | Cu pillar | fact | DB ectc51846.2026.00194-F3-s04 (p.3 Table I) | 2026-10-23 (repo) | high |
| F63 | RDL / pad Cu plating | 1 A/dm2, 28 min, target 5 um | A/dm2; min; um | SAP RDL | fact | DB ectc51846.2026.00199-F1-s08 (p.4 Sec. III.B) | 2026-10-23 (repo) | high |
| F64 | fountain plating, bump stack | Cu 15 mA/cm2 (4 um), Sn 10 mA/cm2 (2 um), 21 C | mA/cm2; um; C | open fountain plater | fact | DB tcpmt.2021.3111345-F1-s07, -s08 (p.2 Table I) | 2026-10-23 (repo) | high |
| F65 | Ni and SnAg cap plating | Ni 1.0 ASD theoretical 1.0 um; SnAg 1.0 ASD theoretical 2.0 um | A/dm2; um | microbump cap | fact | DB ectc51687.2025.00226-F1-s04, -s06 (p.2 Sec. II) | 2026-10-23 (repo) | high |
| F66 | microbump stack heights (examples) | die: Cu 3 / Ni 2 / SnAg 5 um; 120 mm interposer flow: Cu 30 + SnAg 25 um (55 um total, 150 um pitch) | um | uBump; C4-like interposer bump | fact | DB ectc51909.2023.00153-F1-s03; ectc51687.2025.00027 p.2 Sec. II.B: "Cu and SnAg bumps with a total height of 55 μm and pitch in 150 μm" | 2026-10-23 (repo) | high |
| F67 | Faraday constant | 96485.33212 | C/mol | all | fact | NIST CODATA https://physics.nist.gov/cgi-bin/cuu/Value?f : "96 485.332 12... C mol-1" | 2026-10-23 | high |
| F68 | atomic weights | Cu 63.546; Ni 58.6934; Sn 118.710; Ag 107.8682; Au 196.966570 | g/mol | all | fact | IUPAC CIAAW https://www.ciaaw.org/atomic-weights.htm | 2026-10-23 | high |
| F69 | densities | Cu 8.96; Ni 8.9; Sn-3.5Ag 7.5 | g/cm3 | all | fact | engine/data/materials/metals.yaml and solders.yaml (source nist_solder_db_v4, Tables 2.2.7 and 1.18) | 2026-10-23 (repo) | high |
| F70 | Faraday rate (100 % efficiency) | Cu 0.02205; Ni 0.02050; SnAg 0.0492 um/min per mA/cm2; i.e. at 1 ASD Cu 0.221, Ni 0.205, SnAg 0.492 um/min | um/min | all | derived | rate = j M / (n F rho), n = 2; F67-F69 | - | high |
| F71 | implied current efficiency, RDL | 5 um target / 6.17 um Faraday = ~0.81 | - | F63 | derived | F63, F70 | - | low (target, not measured) |
| F72 | pillar plating time at 5 ASD | 1.10 um/min -> ~100 min for 110 um | min | F62 | derived | F62, F70 (100 % efficiency) | - | med |
| F73 | bottom-up acceleration, deep via | field Faraday 0.11 um/min at 0.5 ASD vs >= 0.5 um/min mean fill (300 um / 600 min): ratio >= ~4.5 | - | F58 | derived | F58, F70 | - | low |
| F74 | electrolyte appearance / anode material | N/A (not found) | - | ECP | assumption | not in read sources (US12305307 names "inert anode 814" in one embodiment) | - | - |

### 4.2 Animation-ready summary (ECP)

- Tool: wafer face down in clamshell (cup + cone), spindle rotation 50-100 rpm (F54), anode below, membrane, porous
  resistive plate 5-10 mm under the wafer with thousands of small holes (F50, F51); electrolyte upflow / cross flow.
- TSV fill (10 x 100 um): baseline 0.1-10 mA/cm2 with an initial pulse (F53); total tens of minutes (F56). Physics:
  bottom-up front height h(t) with v_bottom = k x Faraday rate (k ~ 4.5, F73, low confidence), sidewall/field growth at
  the suppressed rate, then overburden 0.74-3 um (F60). HUD: j, t, bath 60/60/50 (F52), 20-25 C.
- Through-mask pillar / pad: uniform growth inside resist openings at the Faraday rate x efficiency (F70, F71):
  Cu 5 ASD -> 1.1 um/min (F72); RDL 1 ASD 28 min -> 5 um (F63); Ni / SnAg 1 ASD (F65).
- Surface texture: plated Cu matte (see section 15).

---

## 5. Lithography: spin coat, dry film lamination, i-line stepper, develop

### 5.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| F75 | resist spin speed and soft bake | 2200 r/min; 120 C hotplate 3 min | rpm; C; min | i-line grayscale resist | fact | tcpmt.2025.3599484 p.7 Sec. IV: "coated at 2200 r/min and baked on a 120 ◦C hotplate for 3 min" | 2026-10-23 (repo) | high |
| F76 | spin sequence (polyimide; same track) | dispense static; spread 500 rpm 5 s; final speed 30 s; EBR/backside rinse 10 s; spin dry 15 s; hot plate 90 C 90 s + 150 C 90 s | rpm; s; C | PI-2600 | fact | HD MicroSystems PI-2600 TDS https://www.epfl.ch/research/facilities/cmi/wp-content/uploads/2026/06/tds_PI2600_series.pdf p.3: "Spread at 500rpm for 5 seconds"; "Spin at final speed for 30 seconds" | 2026-10-23 | high |
| F77 | resist thickness range in DB flows | 1-40 um liquid (1, 2, 6, 7, 9, 12, 25, 40 um) | um | RDL, pillar, bump litho | estimate | DB ectc51846.2026.00198-F1-s02 (1), ectc51529.2024.00392-F1-s09 (2), ectc51846.2026.00198-F2-s02 (6), ectc32862.2020.00185-F1-s15 (7), 001c.129764-F1-s02 (9), ectc51909.2023.00009-F4-s02 (12), 3dic63395.2024.10830178-F1-s03 (25), ectc51909.2023.00009-F5-s18 (40) | 2026-10-23 (repo) | high |
| F78 | dry film thickness in DB flows | 5, 7, 19, 80 | um | DFR | estimate | DB ectc51846.2026.00199-F1-s05 (5), ectc51906.2022.00180-F3-s11 (7), ectc51906.2022.00142-F5-s09 (19), 001c.74748-F1-s02 (80) | 2026-10-23 (repo) | high |
| F79 | dry film lamination window | hot roll 105-125 C; 2.5-3.5 bar; 1-3 m/min; board preheat > 35 C | C; bar; m/min | Ordyl Alpha 900 (PCB dry film) | fact | Ordyl Alpha 900 datasheet https://www.epfl.ch/research/facilities/cmi/wp-content/uploads/2020/03/ORDYL.pdf p.2: "Hot roll temperature 105 – 125°C"; "Hot roll pressure 2.5 – 3.5 bar"; "Lamination speed 1 – 3m/min" | 2026-10-23 | low (PCB film) |
| F80 | dry film exposure and colour change | 35-100 mJ at 360-380 nm; colour from light blue to dark blue after exposure | mJ/cm2; nm | same | fact | Ordyl datasheet p.3: "mJ 35 – 100"; "peak emission at 360 – 380 nm"; "From light blue to dark blue" | 2026-10-23 | low (PCB film) |
| F81 | dry film develop / strip | develop 0.8-1.2 % Na2CO3, 26-32 C, spray 1.2-1.8 bar; strip 1.5-3.5 % NaOH, 40-60 C | %; C; bar | same | fact | Ordyl datasheet p.3-4 | 2026-10-23 | low (PCB film) |
| F82 | DFR develop on wafer | 1 % Na2CO3, 20 C; puddle 336 s + spray 300 s, 15 mm, 160 mL/min (EVG120) | %; s; mL/min | packaging DFR | fact | DB ectc51846.2026.00194-F2-s03 (p.3 Table I) | 2026-10-23 (repo) | high |
| F83 | i-line stepper for TSV litho | Ultratech AP200/300; 365 nm filter, broadband Hg lamp, NA 0.22 (max) | nm; - | 1 um TSV | fact | DB eptc62800.2024.10909935-F1-s05 (p.1 Experimental Setup); ectc51687.2025.00356 p.2 Sec. III.A: "Ultratech AP200/300 stepper" | 2026-10-23 (repo) | high |
| F84 | i-line stepper max field and NA | max exposure field 52 x 68 mm; NA adjustable 0.12-0.24 | mm; - | packaging stepper | fact | ectc51909.2023.00268 p.2: "52x68mm2 that is the maximum exposure field size of commercial i-line steppers"; DB ectc51909.2023.00268-F1-s03 | 2026-10-23 (repo) | high |
| F85 | Canon FPA-5520iV LF2 | 0.8 um resolution over 52 x 68 mm single field; 4-shot 100 x 100 mm | um; mm | i-line packaging stepper | fact | https://www.eenewseurope.com/en/canon-fields-lithography-stepper-for-3d-packaging/ : "offers 0.8 micron resolution across a single-exposure field of 52mm by 68mm" | 2026-10-23 | high |
| F86 | FPA-5520iV base: reduction and field | 2:1 reduction; 52 x 34 mm; 1.0 um | -; mm; um | i-line stepper | fact | Canon Europe product page (search-result excerpt; page 403) https://www.canon-europe.com/business/products/industrial-products/semiconductor/fpa-5520iv/ | 2026-10-23 | med |
| F87 | grayscale i-line exposure | NA 0.18, 1:1 projection, 480 mJ/cm2 | mJ/cm2 | dual-damascene polymer | fact | DB tcpmt.2025.3599484-F1-s03 (p.7 Sec. IV) | 2026-10-23 (repo) | high |
| F88 | panel stepper exposure | 120 mJ/cm2, 6 um resist; 18-reticle field per shot | mJ/cm2 | panel stepper | fact | DB ectc51846.2026.00198-F2-s03 (p.2 Sec. III.B) | 2026-10-23 (repo) | high |
| F89 | positive resist develop | TMAH 2.38 %, puddle 60 s | %; s | AZ resist | fact | ectc51846.2026.00198 p.2 Sec. III.A: "paddle development in Tetramethylammonium hydroxide (TMAH) 2.38% for 60 seconds" | 2026-10-23 (repo) | high |
| F90 | contact / LDI doses | contact 85 mJ/cm2 (2 um AZ 5214); LDI 160 mJ/cm2 for 10 um CD; MLA 375 nm 100 mJ/cm2 | mJ/cm2 | non-stepper | fact | DB ectc51529.2024.00392-F1-s10; ectc.2019.00-29-F3-s02; ectc51846.2026.00074-F2-s08 | 2026-10-23 (repo) | high |
| F91 | reticle size, lens geometry, stage speed | N/A (not found) | - | stepper | assumption | no public spec page readable (Canon 403) | - | - |

### 5.2 Animation-ready summary (litho)

- Spin coat: dispense on static wafer, spread 500 rpm 5 s, final 2200 rpm 30 s (F75, F76), EBR, hot-plate bake.
  Thickness per step from DB (F77).
- Dry film: roll laminator 105-125 C, 1-3 m/min (F79, PCB-grade, low); film colour light blue, exposed dark blue (F80).
- i-line stepper: Hg lamp 365 nm, reticle above a projection lens (2:1 for Canon, F86; 1:1 for F87), field 52 x 34 or
  52 x 68 mm (F84-F86); step-and-repeat field grid across the wafer; dose 85-480 mJ/cm2 (F87-F90). Kinematics: stage
  steps field to field, shutter flash per field (timing template, F91).
- Develop: TMAH 2.38 % puddle 60 s (F89) or 1 % Na2CO3 puddle + spray (F82).

---

## 6. Resist strip and seed wet etch

### 6.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| F92 | resist strip (solvent) | EKC-162, 40 C, 4-5 min | C; min | beaker strip | fact | DB ectc51909.2023.00298-F1-s11, -F2-s09 (p.2 Sec. II) | 2026-10-23 (repo) | high |
| F93 | resist strip (NMP remover) | Microposit 1165, 50 C | C | RDL | fact | DB ectc51846.2026.00199-F1-s09 (p.4 Sec. III.B) | 2026-10-23 (repo) | high |
| F94 | DFR strip | SPR-920, 75 C | C | DFR | fact | DB ectc51846.2026.00194-F3-s05 (p.3 Table I) | 2026-10-23 (repo) | high |
| F95 | thick resist strip | flood exposure then solvent wet strip | - | 25 um pillar resist | fact | DB 3dic63395.2024.10830178-F1-s06 (p.3 Sec. III.A) | 2026-10-23 (repo) | high |
| F96 | DFR plasma ash | O2 ICP plasma ashing | - | DFR | fact | DB ectc51529.2024.00088-F1-s07 | 2026-10-23 (repo) | high |
| F97 | Cu seed wet etch | spray conveyor 30 C, 25 s | C; s | seed etch | fact | DB ectc51909.2023.00298-F1-s12 (p.2 Sec. II) | 2026-10-23 (repo) | high |
| F98 | Cu seed etchant | H3PO4/H2O2/DI; WLC-C2 1 min RT | - | seed etch | fact | DB estc60143.2024.10712070-F1-s13; ectc51687.2025.00226-F1-s08 | 2026-10-23 (repo) | high |
| F99 | Ti barrier etch | diluted HF; diluted H2O2; or Ti RIE (dry, avoids wet over-etch) | - | Ti seed | fact | DB estc60143.2024.10712070-F1-s17; ectc51906.2022.00180-F3-s14; ectc51846.2026.00199-F1-s11 | 2026-10-23 (repo) | high |
| F100 | seed removal by Ar sputter etch + short wet etch | blanket Ar sputter, then a few seconds wet | s | pillar seed | fact | DB 3dic63395.2024.10830178-F1-s07 (p.3 Sec. III.A) | 2026-10-23 (repo) | high |
| F101 | Cu seed etch rate (um/min) | N/A (not found) | - | wet etch | assumption | only times stated; derive from seed thickness / time if needed (e.g. 0.2 um / 25 s) | - | - |

### 6.2 Animation-ready summary (strip / seed etch)

- Resist strip: immersion or spray, 40-75 C, 4-5 min (F92-F94); resist fades/dissolves uniformly.
- Seed etch: Cu seed 0.15-0.5 um cleared in ~25 s spray at 30 C (F97), then Ti (F99); plated features lose a
  seed-thickness skin (template, F101).

---

## 7. Cu CMP

### 7.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| F102 | Cu CMP set, Reflexion, IC1010 pad, CSL9044C slurry | head 107 rpm; platen 113 rpm; 3.0 or 1.4 psi; slurry 300 ml/min; 3 wt% H2O2 | rpm; psi; ml/min | 300 mm Cu | fact | US9956664B2 (3M) https://patents.google.com/patent/US9956664B2/en Test Method 1: "Head speed: 107 rpm"; "Platen speed: 113 rpm"; "Slurry flow rate: 300 ml/min" | 2026-10-23 | high |
| F103 | multi-zone head pressures | 3.0 psi: retaining ring 8.7, zone1 7.3, zone2 3.1, zone3 3.1, zone4 2.9, zone5 3.0; 1.4 psi: RR 3.8, z1 3.3, z2 1.6, z3 1.4, z4 1.3, z5 1.3 | psi | Reflexion head (5 zones + ring) | fact | US9956664B2: "Retaining Ring=8.7 psi, Zone1=7.3 psi, Zone2=3.1 psi, Zone3=3.1 psi, Zone4=2.9 psi, Zone 5=3.0 psi" | 2026-10-23 | high |
| F104 | pad conditioner set | 5 lb down force; 87 rpm (119 rpm in Method 2); 10 sweeps/min; sinusoidal sweep | lb; rpm; 1/min | same | fact | US9956664B2: "Pad conditioner down force: 5 lb"; "Pad conditioner speed: 87 rpm"; "10 sweeps/min"; "Sinusoidal" | 2026-10-23 | high |
| F105 | Cu removal rate | ~10268 A/min at 3.0 psi; ~4591 A/min at 1.4 psi (0.58 h); ~9711 / 4394 at 20.67 h | A/min | Method 1 | fact | US9956664B2 Table 4 | 2026-10-23 | high |
| F106 | alternate sets | Method 2 (WSP pad, 7106 slurry): head 49 rpm, platen 53 rpm; Method 3 (oxide, VP5000): head 87, platen 93, RR 12 psi, zones 6 psi, conditioner 6 lb | rpm; psi | Reflexion | fact | US9956664B2 Methods 2-3 | 2026-10-23 | high |
| F107 | derived Prestonian check | RR/P = 3423 (3.0 psi) and 3279 (1.4 psi) A/min/psi -> near-linear in P at fixed v | A/min/psi | F105 | derived | F105 / pressure | - | med |
| F108 | Preston law and panel-CMP fit | MRR = K P V_r; panel dielectric data fit a generalized P^(2/3) V model (R2 = 0.95) | - | panel dielectric CMP | fact | ectc51529.2024.00087 p.2 Sec. III.A: "MRR ... = K P V_r"; "a modified and more generalized Prestonian model [5] based on a P2/3V dependence fits the experimental data very well (R2 = 0.95)" | 2026-10-23 (repo) | high |
| F109 | K_p for animation | K_p = RR / (P v); v = 2 pi n_platen R_cc (head ~ platen rpm); R_cc (wafer-centre to platen-centre) N/A | - | Cu CMP | derived | F102, F105; R_cc not found -> template | - | low |
| F110 | platen and pad diameter for 300 mm | ~30 in (762 mm); platen 30-200 rpm | in; rpm | 300 mm polisher | fact | US6406361B1 https://patents.google.com/patent/US6406361B1/en : "platen 30 and polishing pad 32 will be about twenty or thirty inches in diameter, respectively"; "rotates platen 30 at thirty to two-hundred revolutions per minute" | 2026-10-23 | high |
| F111 | head kinematics | each head rotates about its own axis and laterally oscillates in a radial slot; slurry/rinse arm wets entire pad; flexible membrane chamber + retaining ring | - | carousel polisher | fact | US6406361B1: "independently laterally oscillates in a radial slot"; "combined slurry/rinse arm 52"; "Flexible membrane 118" | 2026-10-23 | high |
| F112 | Reflexion LK Prime configuration | 4 polishing pads, 6 polishing heads, 8 cleaning chambers, 2 drying chambers | - | AMAT LK Prime | fact | https://www.appliedmaterials.com/us/en/product-library/reflexion-lk-prime-cmp.html (search-result excerpt; page 403): "four polishing pads, six polishing heads, eight cleaning chambers, and two drying chambers" | 2026-10-23 | med |
| F113 | pad groove (1010 circular) | 0.020 in wide x 0.030 in deep x 0.120 in pitch (0.051 x 0.076 x 0.305 cm) | in; cm | IC1000-type pad | fact | US10875146B2 https://patents.google.com/patent/US10875146B2/en : "0.020 in. wide×0.030 in. deep×0.120 in pitch" | 2026-10-23 | high |
| F114 | conditioner disk | 4.25 in (107.95 mm) diameter; diamond 151-251 um (181 um for Cu bulk A2810) | mm; um | 3M diamond pad conditioners | fact | https://www.3m.com/3M/en_US/p/dc/v000062323 (search-result excerpt): A2810 "4.25 in diameter", "181 micron diamond size", Cu (bulk) | 2026-10-23 | med |
| F115 | slurry appearance | milky-white liquid (fumed-silica CMP dispersion) | - | silica slurry | fact | Evonik AERODISP W 1836 https://www.evonik.com/en/products/se/pr_52009434.html (search-result excerpt): "a milky-white liquid", intended for CMP | 2026-10-23 | med (not a Cu slurry SDS) |
| F116 | colloidal silica oxide polish example | 1:1 slurry:DI 10 min (~800 nm), then 1:4 5 min (+150 nm); RMS 10-15 nm | min; nm | oxide CMP | fact | DB ectc51687.2025.00142-F2-s04, -s07 (p.3 Sec. II) | 2026-10-23 (repo) | high |
| F117 | high-rate bulk Cu CMP | 900 nm/min; ~4 um overburden; dishing <= 90 nm with CMP-stop layer | nm/min; nm | Cu CMP | fact | ectc51906.2022.00218 p.4-5 Sec. III: "removed with a 900 nm/min removal rate"; "not over 90 nm regardless of the over-CMP ratio" | 2026-10-23 (repo) | high |
| F118 | global oxide erosion | > 15 nm unoptimized; < 5 nm optimized (Reflexion LK Prime) | nm | hybrid-bond Cu/SiCN | fact | ectc51529.2024.00334 p.3 Sec. III.E: "an un-optimized module can lead to >15nm of global erosion at higher Cu% whereas our optimized module can lower this down significantly to <5nm" | 2026-10-23 (repo) | high |
| F119 | Cu dishing, bond-pad CMP | 3-5 nm (optimal pad shape); ~1 nm (LK Prime); pressure is the dominant knob | nm | hybrid bonding pads | fact | ectc51906.2022.00113 p.5: "dishing profile of 3 to 5 nm"; "The stronger the CMP pressure, the more Cu pad was dishing"; DB ectc51909.2023.00190-F1-s04 | 2026-10-23 (repo) | high |
| F120 | TSV overburden CMP | overburden ~740 nm removed, then Ta barrier, stop on Si; Cu CMP 350 s stopping on Ti seed for 4.7 um overburden RDL | nm; s | TSV / RDL | fact | ectc51687.2025.00356 p.4 Sec. III.D; DB tcpmt.2025.3599484-F1-s10 | 2026-10-23 (repo) | high |
| F121 | Cu dishing / erosion for TSV-size (5-10 um) Cu | N/A (not found) | - | TSV top | assumption | only hybrid-bond-pad values (F118, F119) and RDL (F117) read | - | - |

### 7.2 Animation-ready summary (CMP)

- Tool: platen + pad 762 mm dia (F110), concentric grooves 0.51 mm wide, 0.76 mm deep, 3.05 mm pitch (F113); carrier
  head 300 mm wafer + retaining ring, 5 membrane zones (F103); conditioner disk 108 mm dia, 4.25 in, sweeping
  sinusoidally 10 sweeps/min at 87 rpm, 5 lbf (F104, F114); slurry arm dispensing 300 ml/min (F102) milky-white
  film (F115).
- Kinematics: platen 113 rpm, head 107 rpm same direction (direction not stated; assumption), head oscillates radially
  (F111; amplitude N/A). HUD: P = 3.0 psi (20.7 kPa) bulk, 1.4 psi (9.7 kPa) soft landing.
- Physics: dz/dt = RR(P) with RR = 1.03 um/min at 3.0 psi, 0.46 at 1.4 psi (F105, F107 linear); 900 nm/min bulk
  alternative (F117). Clear 0.74-4.7 um overburden (F120), barrier, then dishing over Cu features to 1-90 nm (F117,
  F119) and erosion < 5 nm optimized / > 15 nm unoptimized (F118). TSV-scale dishing is template (F121).

---

## 8. Backgrinding (Si thinning)

### 8.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| F122 | grinder in the 120 mm 2.5D interposer flow | DISCO DAG810 surface grinder (mold top grind 200 um; Si interposer back grind to 100 um) | - | ectc51687.2025.00027-F1 | fact | ectc51687.2025.00027 p.2 Sec. II.B: "surface grinder (DAG810, DISCO Corporation). The grinding depth was 200 μm"; "grinded to 100 μm-thick by the same grinder" | 2026-10-23 (repo) | high |
| F123 | DAG810 mechanism | chuck table rotates; rotating diamond wheel sweeps across its centre; spindle moves down; water cools and clears sludge; 3 phases fast-to-slow | - | DAG810 | fact | Notre Dame DAG810 user instructions https://nanofabrication.nd.edu/assets/526553/disco_grinder_user_instructions.pdf p.3: "clamped to a rotating chuck table, across the center of which a rotating diamond wheel sweeps"; "accomplished in 3 different phases (from faster to slower grinding)" | 2026-10-23 | high |
| F124 | #2000 feed rates, DAG810 | P1 0.25, P2 0.12, P3 0.05 um/s; spindle current should not spike above 10 A | um/s; A | DAG810 #2000 wheel | fact | same, p.8: "For 2000 grit wheel, the recommended feed rates are: P1 cut = 0.25 µm/sec, P2 cut = 0.12 µm/sec, P3 cut = 0.05 µm/sec" | 2026-10-23 | high |
| F125 | rough / finish mesh | rough #320-#400; finish #2000-#8000; rough stops 20-40 um above final | # ; um | in-feed back grinding | fact | US8025553 (DISCO) https://patents.google.com/patent/US8025553 : "about #320 to #400"; "about #2000 to #8000"; "greater than the desired thickness upon finish grinding by, for example, 20 to 40 μm" | 2026-10-23 | high |
| F126 | rough feed and speeds | rough feed 4-6 um/s; wheels 3000-5000 rpm; chuck 100-300 rpm; finish final ~0.5 um/s | um/s; rpm | DISCO recess (TAIKO-type) grinding | fact | US7758402 https://patents.google.com/patent/US7758402 : "lowering speed of the rough grinding unit 40A is 4 to 6 μm/sec"; "about 3000 to 5000 rpm"; "about 100 to 300 rpm" | 2026-10-23 | med (recess-grinding geometry) |
| F127 | fine-wheel set (vitrified, <= 1 um diamond) | wheel 1000-6000 rpm; chuck 100-400 rpm; feed 0.05-0.5 um/s; water 2-10 L/min | rpm; um/s; L/min | DISCO fine grinding | fact | US7677955 (DISCO): "Rotational speed of the grinding wheel 34: 1,000 to 6,000 rpm"; "chuck table 2: 100 to 400 rpm"; "0.05 to 0.5 μm/sec"; "2 to 10 liters/min" | 2026-10-23 | high |
| F128 | example speeds | chuck 300 rpm; wheel 6000 rpm; saw marks extend radially | rpm | DISCO grinding | fact | US8100742 (DISCO): "rotate the chuck table 52 at 300 rpm"; "grinding tool 325 at 6000 rpm"; "a saw mark S 1 is formed ... so as to radially extend" | 2026-10-23 | high |
| F129 | wheel diameter, 300 mm grinder | 300 mm diamond wheel (DGP8761); 200 mm wheel (DAG811) | mm | DISCO grinders | fact | https://www.disco.co.jp/eg/products/catalog/pdf/dgp8761.pdf : "Φ300 mm diamond wheel"; https://disco.co.jp/eg/products/grinder/dag811.html : "Φ200 mm diamond wheel" | 2026-10-23 | high |
| F130 | grinder spindle (DAG811) | 4.2 kW rated; 1000-7000 min-1 | kW; rpm | DAG811 | fact | DAG811 page: rated output 4.2 kW; "1,000 to 7,000 min⁻¹" | 2026-10-23 | high |
| F131 | 300 mm grinder/polisher stations | Z1 rough, Z2 fine, Z3 dry polish / CMP (450 mm pads); 4 chuck tables on a turntable | - | DGP8761 | fact | DGP8761 catalog: Z1 rough, Z2 fine, Z3 polish; "Φ450 mm dry polishing pad"; 4 chuck tables | 2026-10-23 | high |
| F132 | segment count and grit size (#325/400 wheel) | 42 diamond teeth; mean diamond 51.2 um; peripheral speed 23.5 m/s; wafer 1.6 m/s; feed 0.5 um/s; Ra 0.49-1.12 um | -; um; m/s | 4-in wafers, metal-bond wheel | fact | Materials 2025, 18(21):4890, https://pmc.ncbi.nlm.nih.gov/articles/PMC12609232/ : "42 diamond teeth"; "a peripheral speed of 23.5 m/s"; "The feed rate was set to 0.5 μm/s"; "Ra) was measured in the range of 0.486–1.118 μm" | 2026-10-23 | med (mixed wafers, bronze bond) |
| F133 | grinding-mark origin | marks = circumferential waviness from cup-wheel axial run-out; angular wavelength a function of wheel/wafer speed ratio | - | Si back grinding | fact | Kang et al. 2013 (search-result excerpt), https://faculty.dlut.edu.cn/2002011009/en/lwcg/739196/content/51557.htm | 2026-10-23 | med |
| F134 | #2000 vs polished surface | #2000 grind Ra 0.015 um (Ry 0.080); dry polish Ra 0.0003 um (Ry 0.0017); damage removed | um | 8-in Si, 200 um final | fact | https://disco.co.jp/eg/products/dry_wheel/dp08.html ; Poligrind page: #2000 B-K09 Ra 0.015, Rmax 0.081 um | 2026-10-23 | high |
| F135 | grind-and-polish thinning example | 775 -> 12 um, TTV 0.8 um (Disco tool); 775 -> 2-3 um grind + in-situ CMP | um | wafer thinning | fact | DB ectc51529.2024.00334-F1-s10; ectc51846.2026.00336-F1-s12 | 2026-10-23 (repo) | high |
| F136 | Cu/Si co-grinding to expose TSVs | vitrified-bond wheel, in-situ wheel cleaning, suppresses Cu burning/smearing | - | Okamoto GNX200BH | fact | 001c.147098 p.3 Sec. II: "vitrified bond grinding wheel, which was cleaned during" grinding; "suppressed Cu burning and smearing" | 2026-10-23 (repo) | high |
| F137 | derived grind times | rough 4-6 um/s -> 240-360 um/min; #2000 P1-P3 15, 7.2, 3.0 um/min | um/min | F124, F126 | derived | x60 | - | high |
| F138 | segment height / width, wheel rim width | N/A (not found) | - | cup wheel | assumption | DISCO spec tables are images; Honway page lists abrasive layer 1-10 mm thickness options only | - | - |

### 8.2 Animation-ready summary (grinder)

- Tool: cup wheel with discrete diamond segments on the rim (42 teeth example, F132); wheel dia 300 mm for 300 mm
  wafers (F129), rim passes over the wafer centre (F123); porous vacuum chuck table rotating; coolant jet 2-10 L/min
  (F127). Coarse Z1 (#320-#400) then fine Z2 (#2000) on separate spindles (F125, F131).
- Kinematics: wheel 3000-6000 rpm, chuck 100-300 rpm, opposite direction (F126, F128, F132); Z infeed rough 4-6 um/s,
  stop 20-40 um above target, fine 0.25 / 0.12 / 0.05 um/s phases (F124, F125).
- Physics: thickness(t) piecewise linear by phase (F137). Surface: arcs radiating from wafer centre (F128, F133), Ra
  ~0.5-1 um after coarse (F132, med), 0.015 um after #2000 (F134), mirror after polish (F134).

---

## 9. TSV reveal (Si recess, passivation, CMP)

### 9.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| F139 | reveal sequence | back grind, dry etch reveal, passivation, CMP, RDL, C4 bump; max TTV < 8 um | um | 2.5D PIC interposer | fact | ectc51846.2026.00176 p.1 Sec. II.A: "wafer back grind and dry etch for TSV reveal, followed by passivation, CMP"; "(Spec. max TTV <8 µm)" | 2026-10-23 (repo) | high |
| F140 | grind stop above TSV tips; reveal step height | grind to within 5-10 um of TSV ends; reveal step ~5 um (2-5 um) | um | SPTS via reveal | fact | SPTS via-reveal brief https://www.spts.com/assets/media/via-reveal-us-feb2021.pdf (search-result excerpt; PDF 404): "ground typically to within 5-10 µm of the TSV nodes" | 2026-10-23 | med |
| F141 | reveal Si etch rate and selectivity | > 9 um/min; 200:1 to oxide liner; Ra <= 1 nm; <= +/-3 % on 300 mm | um/min; - | SPTS Rapier XE | fact | https://www.spts.com/assets/media/blanket-si-etch-usletter-feb2021.pdf (search-result excerpt): "etch rates >9µm/min with 200:1 selectivity to the oxide liner" | 2026-10-23 | med |
| F142 | Si recess vs liner loss | recess ~2 um with Si:SiO2 50:1 -> ~40 nm oxide loss; tip oxide should be > 200 nm | um; nm | via reveal | fact | Klumpp DATE 2010: "a Si recess of ~ 2 µm is targeted, the estimated total SiO2 removal will be ~ 40 nm"; "in the range of >200 nm" | 2026-10-23 | high |
| F143 | revealed Cu nail height | 3-6 um by SF6 RIE | um | via-last TSV | fact | DB ectc51909.2023.00009-F5-s05 (p.5 Sec. III.E.1) | 2026-10-23 (repo) | high |
| F144 | backside passivation | CVD SiO2 from TEOS at 100 C; PECVD SiN 60-600 nm; low-T (< 200 C) films for bonded wafers | C; nm | backside | fact | DB 001c.147098-F1-s10; ectc51909.2023.00009-F1-s23, -F3-s09; Willey 2010 (< 200 C) | 2026-10-23 (repo) | high |
| F145 | reveal CMP removal / time | N/A (not found) | - | reveal CMP | assumption | not in read sources | - | - |

### 9.2 Animation-ready summary (reveal)

- Grind to 5-10 um above tips (F140), Si dry etch 2-5 um recess at > 9 um/min (F140-F142), tips stand up with liner
  cap; passivation film (F144); CMP opens the tips flat (amount template, F145). HUD: TTV < 8 um (F139).

---

## 10. Mold grinding

### 10.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| F146 | mold top grind depth | 200 um (DAG810) | um | ectc51687.2025.00027-F1, ectc51529.2024.00155-F1 | fact | F122; DB ectc51529.2024.00155-F1-s08 | 2026-10-23 (repo) | high |
| F147 | TTV before / after mold grind | 11.75 um post mold; 3.1 um post mold grind | um | wafer-level CoW mold | fact | ectc51846.2026.00176 p.2: "Post mold TTV was 11.75 µm and post mold grind TTV was 3.1 µm" | 2026-10-23 (repo) | high |
| F148 | mold grind knobs | grinding wheel, spindle speed, feed rate (values not given); no Cu smearing | - | panel mold grind to Cu studs | fact | DB ectc51687.2025.00095-F1-s05 (p.2 Sec. II.B) | 2026-10-23 (repo) | high |
| F149 | panel top grind | 600 x 600 mm panel, dual-spindle grinder; panel 565 +/- 10 um; Cu stud 25 +/- 15 um; Z1/Z2 feed and spindle rpm tuned | um | panel FO | fact | ectc51906.2022.00136 p.3 Sec. III.A: "top side panel grind thickness of 565um +/- 10um and a Cu Stud thickness of 25um +/- 15um" | 2026-10-23 (repo) | high |
| F150 | mold TTV with fine wheel | TTV < 10 um across 300 mm | um | topside mold grind | fact | DB ectc51846.2026.00008-F1-s11 (p.5 Sec. IV.E) | 2026-10-23 (repo) | high |
| F151 | EMC-grinding wheel mesh / rpm / feed | N/A (not found) | - | mold grind | assumption | no source gives values | - | - |

### 10.2 Animation-ready summary (mold grind)

- Same tool actor as section 8 (F122). Remove 200 um EMC (F146) until die backs appear; EMC surface goes from
  as-molded to ground matte with exposed silica-filler sections (appearance template); TTV 11.75 -> 3.1 um (F147).

---

## 11. Temporary bonding and laser debond

### 11.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| F152 | TBA stack and bond condition | release layer 1 um; adhesive 70 um; 215 C for 120 s; glass carrier; AIMECHATEC bonder | um; C; s | ectc51687.2025.00027-F1 | fact | ectc51687.2025.00027 p.2 Sec. II.B: "The thicknesses of release layer and adhesive layer were 1 μm and 70 μm, respectively"; "215°C for 120 s" | 2026-10-23 (repo) | high |
| F153 | debond tool in the same flow | laser debonding system (AIMECHATEC) | - | ectc51687.2025.00027-F1 | fact | same: "the debonding process was carried out by a laser debonding system (AIMECHATEC Ltd.)" | 2026-10-23 (repo) | high |
| F154 | glass carrier / TBM thickness | glass 700 um; TBM 30 um; release layer | um | PIC wafer | fact | DB ectc51529.2024.00227-F1-s11, -s21 | 2026-10-23 (repo) | high |
| F155 | Si carrier option | 725 um Si + 20 um adhesive; glass rejected (500 um warp failed vacuum chuck), Si carrier < 200 um warp | um | wafer support | fact | DB ectc51909.2023.00009-F5-s01; ectc51846.2026.00096-F1-s20 | 2026-10-23 (repo) | high |
| F156 | UV laser debond scan speed | 12.2 m/s through glass onto UV-absorbing release film; carrier 1.1 mm glass | m/s; um | panel PIC | fact | eptc67330.2025.11392176 p.2 Sec. II: "scanned at a speed of 12.2 m/s through the glass"; DB -F1-s01 (1100 um) | 2026-10-23 (repo) | high |
| F157 | excimer laser debond | 308 nm nanosecond excimer, raster scanned; scan pattern, fluence, step-field overlap programmable; 200/300 mm | nm | SUSS ELD300 / LD12 | fact | https://product.statnano.com/product/9560/eld300-debonder : "308nm wavelength Excimer laser"; "raster scanned across the wafer" | 2026-10-23 | high |
| F158 | glass transmission vs wavelength | 308 nm ~83 %; 266 nm ~20 %; 355 nm 92 % | % | glass handler | fact | US10224229 https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10224229 (search-result excerpt) | 2026-10-23 | med |
| F159 | solid-state UV laser debond | solid-state UV laser, Gaussian reshaped to quasi top-hat, scan over fixed wafer | - | EVG850 DB | fact | https://www.evgroup.com/company/news/detail/ev-group-unveils-breakthrough-low-temperature-laser-debonding-solution-for-fan-out-wafer-level-packaging-1556569869 (search-result excerpt) | 2026-10-23 | med |
| F160 | alternative debonds | IR laser through Si carrier; photonic (Xe flash 5.5 J/cm2 through glass); thermal release tape 150 C 60 s | J/cm2; C; s | various | fact | DB ectc51687.2025.00097-F1-s17, -s18; ectc51846.2026.00153-F1-s24; ectc32862.2020.00185-F1-s06 | 2026-10-23 (repo) | high |
| F161 | laser spot / line size, pulse energy, pitch | N/A (not found) | - | laser debond | assumption | none of the read sources give values (ectc51687.2025.00097 "values not given") | - | - |

### 11.2 Animation-ready summary (temp bond / laser debond)

- Stack: device wafer / 70 um adhesive / 1 um release / glass carrier 700 um (F152, F154). Bond 215 C 120 s.
- Debond: carrier up on vacuum chuck; UV line or spot raster through glass (308 nm excimer, F157; or solid-state UV,
  F159); scan speed 12.2 m/s (F156); release layer darkens along the scanned track (appearance template), carrier
  lifts with near-zero force. Spot / line geometry template (F161).

---

## 12. Blade dicing

### 12.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| F162 | saw in the 120 mm 2.5D flow | DISCO DAD3360 | - | ectc51687.2025.00027-F1 | fact | ectc51687.2025.00027 p.2 Sec. II.B: "dicing saw (DAD3360, DISCO Corporation)" | 2026-10-23 (repo) | high |
| F163 | blade dicing set (DAD3361) | 20000 rpm rear-cutting; feed 0.5 mm/s; 4 passes, 290 um per pass; metal-resin diamond blade; water jet cooling; 120 um tape on frame | rpm; mm/s; um | 1 mm thick TV | fact | ectc51846.2026.00103 p.4 Sec. IV.A: "removing 290 µm of material with each pass. The feed rate was 0.5 mm/s and the blade was rear-cutting at 20,000 revolutions per minute (RPM)" | 2026-10-23 (repo) | high |
| F164 | kerf | 50 um kerf blade, single pass | um | 2.5D PIC wafer | fact | ectc51846.2026.00176 p.2: "using a 50 µm kerf blade using a single pass process" | 2026-10-23 (repo) | high |
| F165 | DAD322x saw spindle | 1.5 kW at 30000 min-1; 3000-40000 min-1; max blade 58 mm (2 in blade); transfer 0.1-500 mm/s | kW; rpm; mm | DISCO DAD3220/3230 | fact | DAD3220 brochure https://www.nanofab.utah.edu/wp-content/uploads/2022/12/DAD3220-Brochure.pdf.pdf : "Revolution speed range min-1 3,000 to 40,000"; "58 (with 1.5 kW)" | 2026-10-23 | high |
| F166 | DAD3350 spindle / feed | 6000-60000 rpm; cutting speed 0.1-600 mm/s; blades up to 5 in | rpm; mm/s | DAD3350 | fact | university facility pages (search-result excerpt) https://cris.biu.ac.il/en/equipments/dicing-saw-disco-dad3350/ ; https://nano.tau.ac.il/dicing-disco-saw?tab=1 | 2026-10-23 | med |
| F167 | hub blade example | OD 55.56 mm; kerf 20-25 um; max cut depth 0.51-0.64 mm; #2000 grit | mm; um | NBC-ZH2050 listing | fact | eBay listing https://www.ebay.com/p/679473280 (search-result excerpt) | 2026-10-23 | low (third-party) |
| F168 | electroformed blade concentration | concentration 100 = 25 vol % diamond | % | DISCO ZH05 / Z05 | fact | https://www.disco.co.jp/eg/products/blade/zh05.html : "a concentration level of 100 indicates 25 % diamond grit by volume" | 2026-10-23 | high |
| F169 | blade exposure, coolant flow | N/A (not found) | - | dicing | assumption | DISCO blade spec tables are images | - | - |

### 12.2 Animation-ready summary (dicing)

- Tool: 2 in (55.56 mm) hub blade (F165, F167) spinning 20000-40000 rpm (F163, F165), blade thickness ~ kerf 20-50 um
  (F164, F167); wafer on tape on ring frame on vacuum chuck (F163); water jet at the blade (F163).
- Kinematics: X feed 0.5 mm/s (F163), index between streets, rotate chuck 90 deg for the second direction; cut
  through wafer into tape. Kerf trench with chipping edge (template).

---

## 13. Polyimide coat and cure

### 13.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| F170 | spin and soft bake | see F76; soft bake 130-200 C 90-180 s (hot plate) or 30-40 min oven; 2-4 coats possible | C; s | PI-2600 | fact | PI-2600 TDS p.2: "Soft-bake temperatures range from 130 - 200°C for 90 - 180 seconds" | 2026-10-23 | high |
| F171 | cure schedule | ramp 2-4 C/min; 350 C 30 min; N2 or forming gas (air allowed to 300 C) | C/min; C; min | PI-2600 | fact | PI-2600 TDS p.2: "Nominally 2 - 4°C/minute"; "Nominally 350°C for 30 minutes is an adequate cure" | 2026-10-23 | high |
| F172 | spin curve | PI-2610 chart axes span 1.0-5.0 um over 2000-5000 rpm (30 s spin); curve values not extractable from the text layer | um; rpm | PI-2600 | fact | PI-2600 TDS p.2 chart "Film thickness (um) vs Spin speed (rpm)", "Coated 30sec.@ indicated speed" | 2026-10-23 | low (axis range only) |
| F173 | packaging PI / PID cure in DB | 230 C 2 h (PI); 170-200 C 1 h (XP80); 200-250 C 1 h N2 (DF-PID) | C; h | RDL dielectric | fact | DB ectc51909.2023.00155-F2-s04; 3dic63395.2024.10830178-F1-s09, -s23; ectc51687.2025.00233-F2-s08, -s09 | 2026-10-23 (repo) | high |
| F174 | cured PI colour | N/A (not found) | - | PI | assumption | not stated in read datasheet text | - | - |

### 13.2 Animation-ready summary (PI)

- Coat as section 5 (F76); cure: oven ramp 2-4 C/min to 350 C (F171) or 200-250 C for low-T PI/PID (F173); film
  shrinks and darkens on cure (magnitude and colour template, F174).

---

## 14. ENIG and OSP

### 14.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| F175 | ENIG on the 120 mm interposer pads | Ni 2 um / Au 0.05 um, electroless, on Al-Cu pads | um | ectc51687.2025.00027-F1 s29 | fact | DB ectc51687.2025.00027-F1-s29 (p.2 Table I) | 2026-10-23 (repo) | high |
| F176 | IPC-4552 ENIG thickness | EN 3-6 um; immersion Au min 0.05 um (default) or 0.04 um (exception) at -4 sigma | um | PCB ENIG | fact | IPC-4552 w/ Am. 1&2 TOC https://www.electronics.org/TOC/IPC-4552wAm-1-2.pdf Table 3-1: "3 to 6 µm"; "0.05 µm [1.97 µin] at -4 sigma" | 2026-10-23 | high |
| F177 | electroless Ni bath and rate | 70 C, 7 min -> 1.05 um on field (0.27-0.85 um in vias) | C; min; um | EL-Ni on wafer/TGV | fact | ectc51846.2026.00208 p.3 Sec. II.A: "Electroless Ni plating was then performed at 70°C for 7 minutes"; DB -F1-s11 | 2026-10-23 (repo) | high |
| F178 | derived EL-Ni rate | ~9 um/h | um/h | F177 | derived | 1.05 um / 7 min | - | med |
| F179 | OSP thickness | 80-500 nm typical; benzimidazole films 10-100 nm, up to 500-600 nm with metal ions | nm | OSP | fact | US8961678 https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8961678 (search-result excerpt) | 2026-10-23 | med |
| F180 | OSP visual | "visually unchanged" after multiple lead-free reflows; selective on Cu | - | ENTEK PLUS HT | fact | MacDermid Alpha sales sheet https://www.MacDermidAlpha.com/sites/default/files/2021-07/ENTEKPlusHT-EN-20Mar2019-SalesSheet.pdf (search-result excerpt) | 2026-10-23 | med |
| F181 | immersion Au bath temperature / time; OSP bath | N/A (not found) | - | finishes | assumption | not in read sources | - | - |

### 14.2 Animation-ready summary (finishes)

- ENIG: Ni grows 2 um (paper, F175; IPC range 3-6 um, F176) at ~9 um/h (F178), then a 0.05 um Au flash (F175,
  F176): pad colour changes from Cu/Al to Ni grey to gold (colour template). OSP: transparent film 0.08-0.5 um on Cu,
  Cu colour unchanged (F179, F180).

---

## 15. Material appearance by state (render guide)

| state | sourced descriptor | IDs | confidence |
|---|---|---|---|
| Bosch etched Si sidewall | horizontal scallop ribs, pitch = etch/cycle 0.2-1 um, depth 0.03-0.3 um | F2, F3, F7 | med |
| liner on scallops | SACVD smooths scallops when t >= scallop | F23 | high |
| PVD seed in TSV | thick top lip (overhang), thin lower sidewall, thicker bottom | F36, F42 | high |
| plated Cu | rough at high current density (5 A/dm2), smooth at 0.5 A/dm2; plated Cu Ra ~40 nm (RDL) | DB ectc51846.2026.00208-F1-s14; ectc51687.2025.00076 p.7 | high |
| post-CMP Cu / dielectric | planar; oxide RMS 10-15 nm (colloidal silica); SiCN < 0.2 nm RMS; Cu dishing 1-90 nm | F116, F117, F119 | high |
| CMP slurry film | milky-white liquid | F115 | med |
| ground Si (#320-#400) | arcs radiating from centre; Ra ~0.5-1.1 um | F128, F132, F133 | med |
| ground Si (#2000) | fine arcs; Ra 0.015 um; damaged layer | F134, F136 | high |
| dry-polished / CMP Si | mirror; Ra 0.0003 um | F134 | high |
| ground ABF | ~70 nm RMS (1000 then 6000 grit) | DB ectc51687.2025.00142-F4-s02 | high |
| dry film resist | light blue; dark blue after exposure | F80 | low (PCB film) |
| ENIG | Au top layer on Ni | F175, F176 | high (layers); colour template |
| OSP | visually unchanged Cu | F180 | med |
| DRIE plasma, PI cure colour, release-layer change, EMC ground texture | N/A (not found) | F18, F174 | - |

---

## 16. Gaps (most important first)

1. CMP geometry: wafer-centre-to-platen-centre distance and head oscillation amplitude (needed for v in Preston,
   F109); platen/head rotation direction. RR is sourced, so the animation can run on RR(P) directly.
2. Cu dishing / erosion for TSV-scale (5-12 um) Cu after overburden CMP (F121); only hybrid-bond pad and RDL values.
3. Grinding wheel segment geometry (height, width, rim width) and coolant nozzle layout (F138); mold-grind wheel and
   feeds (F151).
4. Laser debond spot/line size, pulse energy, pitch (F161); release-layer appearance change.
5. Bosch recipe for a 300 mm 10 x 100 um TSV from one primary source (cycle times + etch/cycle + scallop together);
   the closest set (F2, F3) came from a search excerpt (fetch refused). Plasma glow colour (F18).
6. ECP: electrolyte flow rate, wafer-to-anode distance, immersion tilt, anode type (F74); bottom-up front velocity is
   derived with low confidence (F73).
7. Stepper reticle size, lens geometry, stage step time (F91); dicing blade exposure and coolant flow (F169).
8. Thermal oxide liner (F29); 300 mm PVD target geometry (F49); immersion Au / OSP bath conditions (F181);
   reveal-CMP removal (F145).
