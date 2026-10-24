---
title: Lane L39 - process-flow animation research, remaining pendings
date: 2026-10-23
status: done (2026-10-23); first pass, hand-off below
scope: config/process3d/RESEARCH_PENDING.md, this file
owner: lane L39 (Claude subagent, DevLog-016 research)
---

# L39: source the values the animated flows still lack

Binding inputs: DevLog-016, COMPOSITION.md (sections 1.1, 1.4, 7), RESEARCH_TOOLS_FAB.md (F1-F181) and
RESEARCH_TOOLS_ASSEMBLY.md (A1-A202) (format; their rows are cited, not duplicated), the lane brief (2026-10-23).

Constraints kept: no code; no git writes; no subagents; no `scripts/ieee_fetch.py` or any retrieval / caching
script; no logins or paywalls; rate-limited web reads (one at a time, stop on anti-bot); DB tables read-only; only
my two files edited.

## Plan (2026-10-23, before research)

1. Pending list: `config/process3d/PENDING.md` did not exist at start (checked twice, the second time after a
   server-overload restart); started from `uv run python scripts/check_process_flows.py --pending` (read-only):
   cowos_s 20 unique pending specs, emib 19, 2p5d_120mm 5. Switch to PENDING.md if it appears before the end.
2. Per quantity: (a) DB rows `data/process_steps.csv` / `data/interconnects.csv` (analog with step_id + locator);
   (b) cached papers `references/*/text.md`; (c) public primary sources (datasheets, patents, open-access papers).
3. Derived rows where a sourced rate plus a flow geometry give the value (CMP time, plating time).
4. Proposals (template values with physical reasoning) for not-found drawing-required items, separate section.

## Progress

- 2026-10-23: inputs read; pending list from the checker; DB / paper sweep started.
- 2026-10-23: server-overload restart; nothing had been written yet. `config/process3d/PENDING.md` (L34) appeared
  (10 drawing_required + 34 hud_only); switched to its numbering (#1-#44).
- 2026-10-23: `config/process3d/RESEARCH_PENDING.md` written: 55 sourced / derived rows (P1-P55), 9 proposals
  (X1-X9), a PENDING # -> rows -> status map (section 7) and a ready-to-paste fill block in COMPOSITION.md 1.1 spec
  format (section 8).

## Result (2026-10-23)

| class | total | found (fact / analog / derived) | proposal | n/a |
|---|---|---|---|---|
| drawing_required | 10 | 5 (#1, #3, #7, #8, #9) | 5 (#2, #4, #5, #6, #10) | 0 |
| hud_only | 34 | 28 (derived: #18, #21, #22, #24, #27) | 6 (#31, #33, #35, #36, #39, #40) | 0 |

Key sources (new this lane): IBM US6622907B2 (eutectic PbSn from MSA, ~100 um, 20-100 mA/cm2); J-STD-028 table
titles (100 um bumps at 200 um pitch, search excerpt); J-STD-020 SnPb profile via Renesas TB493 (TL 183 C, Tc
220 / 235 C); NIST solder DB v4 (Sn-37Pb 8.4 g/cm3, 183 C); Intel TCB description (Semiconductor Digest 2015:
substrate e.g. 140 C, > 100 C/s up, > 50 C/s down); K&S IMAPS 2014 (head ~280 C, 1 s dwell, 7-15 s cycles); Intel
LTS paper (Aspandiar et al.: Bi-Sn-Ag 138-140 C, peak 170-180 C, 4 mil stencil, 1:1 aperture); TSMC US6140241A
(damascene ECP 1.6-7.0 then 9.5-25 mA/cm2); Shin-Etsu US7303852B2 (KrF 15-42 mJ/cm2); SPR955-CM (i-line
165-310 mJ/cm2); AZ 9260 (1550 mJ/cm2 for 10 um holes in 12 um); Isola FR406 (200-350 psi, >= 50 min at 177 C);
DB analogs: estc60143.2024.10712019-F1-s05 (press 195 C / 2.6 MPa / 180 min), tcpmt.2025.3614186-F1-s21
(4-mil stencil), ectc51846.2026.00416-F1-s06 (DAF cavity attach > 95 C, 30 s), ectc51529.2024.00392-F1-s12 (RIE
0.51 um/min), ectc51687.2025.00187-c-c6 (polymer TIM BLT 85 um).

## Hand-off

- L34: section 8 of RESEARCH_PENDING.md is the fill block (one spec per PENDING #, provenance per COMPOSITION.md
  1.1); geometry fills #2 / #6 / #10 and the two TCB profiles (#4, #5) are proposals and render as template.
- Most uncertain: EMIB / EMIB-T TCB conditions (no Intel numbers; X3, X4); SnPb C4 size (standard table title
  via search excerpt, X1) and height / resist (reasoned, X2); EMIB-T cavity joint alloy (X5) and finish (X8);
  Al etch rate (1984 RIE, P34); TSV and damascene doses are resist / tool specific (P27, P28); PCB land for
  0.5 mm balls (X6).
- Not reached: atotech.com (503), caplinq (522), ksp.etri.re.kr (refused), kayakuam (404), circuitnet (404),
  emerald.com (paywall). Downloaded public PDFs live only in the session scratchpad.
