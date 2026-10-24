---
title: Lane L33 - process-flow animation research, assembly / substrate / package tools (R-b)
date: 2026-10-23
status: done (2026-10-23); first pass, gaps listed below
scope: config/process3d/RESEARCH_TOOLS_ASSEMBLY.md, this file
owner: lane L33 (Claude subagent, DevLog-016 research agent R-b)
---

# L33: assembly-tool and process-physics research for the process animation

Binding inputs: DevLog-016 (decisions, design, physics-model table, tool list, ownership), the lane brief
(2026-10-23). Output feeds E3 tool agents (`app/src/lib/process/tools/`, `ToolActor.spec` provenance, CONTRACT.md
Sec. 11), E1 physics (Washburn, solder shape, TCB profile, mold gap closure) and the flow agent D (HUD conditions).

Constraints kept: no code; no git writes; no subagents; no paper retrieval or `scripts/ieee_fetch.py`; no logins or
paywalled downloads; rate-limited web reads (one at a time, stopped on HTTP 403 at nordson.com and mdpi.com); only
my two files edited. Public PDFs that WebFetch could not parse were saved to the session scratchpad and read with
pypdf (Musashi FAD2500 brochure, Henkel UF 8830S TDS, NIST lead-free solder database v4, Senju FA catalogs,
TT Electronics TN012, Moldex3D underfill paper, Liang IMAPS 2012); nothing was written into the repo cache.

## Method

1. Read DevLog-016; dumped DB steps (`data/process_steps.csv`) with typed conditions for the assembly / substrate
   categories (bonding, die_attach, underfill, dispense, molding, cure, reflow, ball_attach, lamination,
   laser_drill, desmear, electroless, sap_msap, surface_finish, cleaning): 695 rows; read the key flows
   ectc51687.2025.00027-F1, ectc51529.2024.00155-F1, ectc.2016.201-F2, ectc51687.2025.00051-F1 in full.
2. Grepped `references/*/text.md` for conditions and read the sections behind each value (page locators from the
   `<!-- page N -->` markers): TCB tables and profile descriptions, CUF tables, mold tables, flux, ball attach,
   ABF lamination / via, EMIB flow text; `config/package3d/RESEARCH_SOTA_EMIB.md` / `RESEARCH_SOTA_COWOS.md` and
   `data/interconnects.csv` for EMIB pitches.
3. Public primary sources (web, accessed 2026-10-23): Panasonic MD-P300 spec pages, Musashi FAD2500 brochure,
   Senju SNR-1065GT catalog table, Henkel UF 8830S TDS, NIST solder database, J-STD-020E table (via TT Electronics
   note), PMC open-access papers (IMC kinetics, Ni3Sn4 on ENIG, Siemens CUF surface tension / contact angles), K&S
   TCB talks (IFTLE 235 / 370), underfill dispense articles (SST, IMAPS), AGC release-film patent, Ajinomoto ABF
   structure page.
4. Derived values (kind D) only where a formula over sourced rows helps the animation: spherical-cap heights for
   the two bump types, Washburn fill time at 25 C, implied effective CUF viscosity, oven dwell vs belt speed.

## Coverage (tool -> geometry / kinematics / process window / physics parameters)

| tool / process | geometry | kinematics | process window | physics params |
|---|---|---|---|---|
| TCB bond head (CoW, 300 mm) | partial (machine + stage; no tool-tip drawing) | Y (A17-A19, A31) | Y (A9-A16, A22-A24) | Y (bump geometry A26-A28; NCF force model A22) |
| mass reflow oven | partial (length, zones, height; no heated length) | Y (belt speed) | Y (J-STD-020E, SAC, SnBi, paper profiles) | n/a |
| solder reflow physics | Y (cap model) | n/a | Y (TL values) | Y (surface tension, IMC k, IMC thickness) |
| flux apply / clean | partial | partial | Y (dip 50 um, 5 N) | n/a; residue colour N |
| capillary underfill (jet / needle) | Y (work area, nozzle, needle offsets) | Y (speeds, L/I pattern, pass timing) | Y (temps, amount, times, cure) | partial (gamma, theta from a board-level UF; viscosity at 25 C only) |
| compression molding + PMC | partial (principle, film, cavity; no tool dimensions) | partial (sequence; no closing speed) | Y (force, T, time, PMC) | partial (filler sizes; no EMC density) |
| ball attach | partial | partial | Y (ball sizes, heights) | Y (ball 600 -> 478 um) |
| stiffener / lid attach | partial (thickness, material) | N (bead geometry) | Y (cure) | n/a |
| ABF lamination | partial (film structure, thickness) | partial | Y (T, P, t, cure) | n/a; colour N |
| laser via drilling | N (machine) / Y (via) | partial | Y (via sizes, taper, laser params) | n/a |
| desmear / electroless / SAP | n/a | partial | partial (seed 0.15-1 um, Cu 4-8 um, L/S) | n/a |
| solder resist / finishes | Y (20 um green, openings; ENi/Au) | n/a | partial | n/a; IPC limits N |
| EMIB / EMIB-T specifics | partial (bridge size, thickness, pitches) | partial (flow order) | N (cavity depth, adhesive, TCB conditions) | n/a |

## Most important gaps

1. TCB bond-head tool tip / collet geometry and materials (A29) - template only.
2. Compression-mold closing speed and clamp ramp (A136); EMC density; cured EMC finish.
3. Reflow heated length / zone lengths (A47).
4. CoW-class CUF surface tension and contact angle at dispense temperature; CUF viscosity vs temperature.
5. Colours: ABF, cured CUF, flux residue (N/A); EMC black and SR green are med confidence.
6. EMIB cavity depth, bridge adhesive, top-die TCB conditions (A201).

## Hand-off notes

- IDs A1-A202 are stable; cite them in `ToolActor.spec` provenance and flow YAML `template` rationales.
- Washburn calibration: A114 (mu_eff <= ~1.4 Pa s for a 20 mm die in 60 min) is derived and low confidence; keep
  the 25 C TDS viscosity (A104) in the HUD as reported and mark the animation knob as template.
- Panasonic MD-P300 published head max is thermosonic 300 C (A3), while a Panasonic FCB3 run used a 440 C set
  point with 250 C actual at the joint (A10): show set vs actual separately.

## Progress log

- 2026-10-23: DB and repo-paper extraction; web research (Panasonic, Musashi, Senju, Henkel, NIST, J-STD-020E,
  PMC IMC / underfill papers, K&S, SST / IMAPS underfill, AGC patent, Ajinomoto); wrote
  `config/process3d/RESEARCH_TOOLS_ASSEMBLY.md` (165 rows, 10 tool sections, appearance table, gaps).
