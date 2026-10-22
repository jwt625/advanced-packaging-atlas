---
title: Lane L23 - warpage input research (sourced values for undisclosed warpage inputs)
date: 2026-10-21
status: done (2026-10-21)
scope: research only; writes this file and DevLog/research/2026-10-21-warpage-input-research.md
owner: lane L23 (Claude subagent, DevLog-013)
---

# L23: warpage input research

Request (Wentao, 2026-10-21): pursue absolute warpage agreement through input research: "ask a subagent to do the
research or read/dig into what we have cached/parsed." L19 applies the findings; this lane edits no sims/ or engine/.

## Plan (2026-10-21 18:08 PDT)

1. Read context: validation/RESULTS.md, L9 notes, DevLog-012 (L3 wave 5 spreads, L9, CD table and decisions), L19
   notes, case YAMLs (cowos_l, xilinx_tsv_lid, fcbga bare, glass, cowos_s, 50mm_quarter(_e2), 120mm(_cu)), materials
   library entries and ranges.
2. Corpus mining (per case): full re-read of the source paper text.md and page renders (tables / figures beyond the
   DB rows); grep all text.md for companion papers (same authors, CoWoS-L/S warpage, lid / TIM / stiffener, shadow
   moire convention, stress-free temperature, solder resist E(T)); DB tables stack_layers / components / metrics /
   process_steps.
3. Public web (modest pace, stop on anti-bot): datasheets (Taiyo PSR / AUS solder resist, TIM films, lid adhesives,
   SUS430), JEDEC JESD22-B112 / JEITA ED-7306 sign and view convention summaries.
4. Deliverable: per-case tables (input, value, unit, basis, source + locator, confidence, expected effect citing
   the existing spreads); facts vs inferences separated; prioritized change list for L19; gaps; paywalled
   candidates (DOI + why) for Wentao's manual list. No retrieval, no git writes, no ~/Downloads.

## Progress log

- 2026-10-21 18:16 PDT: context read (RESULTS, L9, DevLog-012 L3/L9/L19/CD, L19 notes, case YAMLs, library
  entries). Corpus mined: 00091 (re-read all pages; keyword "metal TIM"), companions 00174 (film TIM for CoWoS-L lid
  type), 00026 (TSMC moire sign pictograms), 00085 (In metal TIM soldered, Cu lid k 390), 001c.147115 (Amkor lidded
  72 mm, measured BGA-side, lid foot 8 mm), MediaTek 00135 / 2022.00232 (sign pictograms, ring photo, ring 2.5 mm),
  Xilinx 2011 (Fig. 3(b) lid model), Shinko 00178, Ajinomoto 00148, iNEMI glass 2025, JOINT2 00155 SR thickness.
  Finding: 00135 '(-) Convex' pictogram = dome with balls down, i.e. JEITA +; the case compares -198 as JEITA -.
  Next: web (SR datasheets, JEITA / JESD22-B112, Xilinx package drawings), 50 mm / 120 mm papers, Sadeghinia 2012.
- 2026-10-21 18:23 PDT: 50 mm (Table 8 render: insulation Tg 233 C, shrinkage 21 %), Sadeghinia 2012 (2.1 vol%
  filled cure shrinkage, Eg 7239 / Er 108 MPa), 120 mm (Substrate A / B CTE 11.97 / 12.81 ppm/C stated; stiffener
  28 x 30 mm; companion 00027 Tsf 180 C, Table III widths), Samsung MIoS 00108 (adhesive < 100 um, press cure
  150 -> 180 C), Intel 00187 (STIM vs PTIM FEM sign flip). Web: JEITA ED-7306 sign (search extract), Taiyo SR PDFs
  dead (redirect), MDPI 403 (stopped), PMC Cheng 2021 (0.09 % volumetric EMC shrinkage), LG Chem patent SR alpha2,
  NIST indium nu 0.45, SemiEngineering Amkor In10Ag blog. Writing the deliverable.
- 2026-10-21 18:26 PDT: deliverable written: DevLog/research/2026-10-21-warpage-input-research.md (per-case
  tables, cross-cutting SR and Tsf practice, prioritized L19 list, gaps, manual-download candidates). Self-check
  corrections before hand-off: 50 mm insulation polyimide is cured at 230 C on the carrier-bonded molded wafer (p.4),
  not before the module exists; removed a circular item (CoWoS-L ring TV) from the dome evidence; Amkor values marked
  as plot reads. No sims/, engine/, data/ or git writes; no retrieval; no subagents (project cap). Scratch crops only
  in the session scratchpad.
