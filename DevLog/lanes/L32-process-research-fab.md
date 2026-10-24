---
title: Lane L32 - process-flow animation research, wafer-level / interposer-fab tools (R-a)
date: 2026-10-23
status: done (2026-10-23); first pass, gaps listed below
scope: config/process3d/RESEARCH_TOOLS_FAB.md, this file
owner: lane L32 (Claude subagent, DevLog-016 research agent R-a)
---

# L32: fab-tool and process-physics research for the process animation

Binding inputs: DevLog-016 (decisions, design, physics-model table, tool list, ownership), the lane brief
(2026-10-23). Output feeds E3 fab tool agents (`app/src/lib/process/tools/`), E1 physics (Bosch cycles, PVD step
coverage, Faraday plating, Preston CMP + dishing, grind infeed) and flow agent D (HUD conditions, provenance).

Constraints kept: no code; no git writes; no subagents; no paper retrieval or `scripts/ieee_fetch.py`; no logins or
paywalled downloads; web reads one at a time, one attempt per blocked host (appliedmaterials.com 403, kla.com Access
Denied, spts.com PDFs 404, canon 403, saint-gobain 403, svc.org 403, koreascience / umich / smtnet refused); only my
two files edited. Public PDFs that WebFetch could not parse were copied into the session scratchpad and read with
pypdf under `uv run --no-project` (DISCO DAG810 user guide, Weichart 2009 HIPIMS TSV paper, Willey 2010 IMAPS TSV
paper, Klumpp 2010 DATE paper, DISCO DAD3220 brochure, Ordyl Alpha 900 TDS, HD MicroSystems PI-2600 TDS, IPC-4552
TOC); nothing written into the repo cache.

## Method

1. Read DevLog-016 and `config/process3d/CONTRACT.md` head; matched the row format of
   `RESEARCH_TOOLS_ASSEMBLY.md` (L33) with kinds spelled out (fact / derived / estimate / assumption) so they do not
   collide with the F-prefixed IDs.
2. Dumped DB steps with typed conditions or equipment for the fab categories (etch_dry, tsv_tgv_formation,
   via_reveal, deposition_pvd, deposition_cvd, electroplating, cmp, grinding_thinning, lithography, resist_strip,
   etch_wet, temporary_bonding, debonding, dicing, electroless, surface_finish, cure, carrier_prep): ~900 rows.
3. Grepped `references/*/text.md` (scallop, step coverage, target-to-wafer, grit, rpm, psi, reveal, conformality)
   and read the sections behind each value; page locators from `<!-- page N -->` markers. Key repo papers:
   ectc51687.2025.00356 (1 x 15 um TSV: scallop, PVD seed, ECP), ectc51909.2023.00009 (TSV-middle liner/seed),
   001c.147098 (Bosch scallop control, long-throw seed, Cu/Si grinding), tcpmt.2026.3708099 (Bosch gases, 10 h via
   fill), ectc51846.2026.00424 (60 mm target distance), ectc51529.2024.00087 (Preston), ectc51906.2022.00218 /
   ectc51529.2024.00334 / ectc51906.2022.00113 (CMP rate, dishing, erosion), ectc51687.2025.00027 (DAG810, TBA,
   laser debond, DAD3360), ectc51846.2026.00103 / 00176 (dicing, reveal, TTV).
4. Web: vendor pages and public patents for tool geometry and kinematics (DISCO grinder/blade pages and patents,
   3M/Rohm-and-Haas CMP patents with full Reflexion recipes, Applied carrier-head patent, Lam TSV plating patents),
   open papers (Weichart 2009, Willey 2010, Klumpp 2010, Materials 2025 back-grinding), standards (IPC-4552 table),
   constants (NIST CODATA F, IUPAC atomic weights). Densities reused from `engine/data/materials/` (NIST solder DB).
5. Derived rows only where a formula over sourced rows is stated: Faraday rates, implied efficiency, pillar time,
   bottom-up acceleration (low), Bosch loop count, RR/P linearity, grind-phase rates, EL-Ni rate.

## Coverage (Y / partial / N)

| tool / process | geometry | kinematics | process window | physics params |
|---|---|---|---|---|
| DRIE Bosch | partial (chamber powers, chuck; no glow colour) | Y (cycle alternation) | Y | Y (etch/cycle, scallop vs CD) |
| oxide liner | Y (film) | n/a (static) | Y | Y (conformality 43-60 %, PECVD 6 %) |
| PVD barrier/seed | Y (300 mm target, 50-80 mm gap) | partial (magnet rate N/A) | Y | Y (bottom 20 % Ti / ~10 % Cu at 10:1) |
| ECP | Y (clamshell, HRVA, gap) | Y (50-100 rpm) | Y | Y (Faraday); bottom-up rate low |
| litho (spin, DFR, stepper, develop) | partial (field, NA; no reticle/lens geometry) | partial | Y | n/a |
| resist strip / seed etch | n/a | n/a | Y | partial (no etch rates) |
| Cu CMP | Y (pad 762 mm, grooves, 5-zone head, 108 mm disk) | Y (rpm, sweeps; no oscillation amplitude) | Y | Y (RR vs P; dishing/erosion); Kp needs R_cc |
| backgrinding | partial (wheel dia, 42 segments; no segment size) | Y (rpm, infeed phases) | Y | Y (feeds, Ra) |
| TSV reveal | n/a | n/a | Y (via search excerpts) | Y (recess vs liner loss) |
| mold grinding | same actor as grinder | partial | Y (depth, TTV) | N (wheel/feed values) |
| temp bond / laser debond | Y (stack) | partial (scan speed; no spot size) | Y | partial |
| blade dicing | Y (2 in blade, kerf) | Y (rpm, feed, passes) | Y | n/a; exposure N/A |
| polyimide coat / cure | n/a | Y (spin sequence) | Y | partial (no shrinkage) |
| ENIG / OSP | n/a | n/a | Y | partial (EL-Ni rate; no Au bath) |

## Gaps (most important first)

1. CMP wafer-to-platen centre distance and head oscillation amplitude (Preston velocity); rotation directions.
2. TSV-scale Cu dishing / erosion after overburden CMP (only hybrid-bond pads and RDL).
3. Grinding wheel segment geometry and coolant layout; mold-grind wheel and feeds.
4. Laser debond spot / line size, pulse energy, pitch; release-layer appearance.
5. A single primary-source 300 mm 10 x 100 um Bosch recipe with cycle times + etch/cycle + scallop (current best set
   is a search excerpt); DRIE plasma appearance.
6. ECP flow rate, anode distance, immersion tilt; bottom-up front velocity (derived, low).
7. Stepper reticle/lens geometry and step timing; blade exposure; thermal liner; 300 mm PVD target; Au/OSP baths.

## Progress log

- 2026-10-23: DB dump and repo greps; web research (one fetch at a time); wrote RESEARCH_TOOLS_FAB.md (181 rows,
  F1-F181, 16 sections incl. animation-ready summaries, appearance guide, gaps); this note.
