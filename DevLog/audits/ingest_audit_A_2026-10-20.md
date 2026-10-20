# Audit A: b081 / b083 / b086 (2026-10-20)

## Sample
| paper_id | batch | rows checked / total | figures checked | level (staged) | agree |
|---|---|---|---|---|---|
| 001c.74748 | b081 | 113 / 113 | 11 / 11 | full | yes |
| 2380-4505-2020.1.000042 | b083 | 113 / 113 | 21 / 21 | full | yes |
| tcpmt.2024.3507552 | b086 | 112 / 112 | 15 / 15 | full | yes |

Method:
- Read every text.md in full.
- Opened the page renders of every cited figure and table.
- Re-cropped all key figures at 150-400 dpi into the scratch folder audit_A/.
- Opened the candidate crops used: p06_fig12, p06_fig13 and others.
- Checked every row of all 11 tables plus the evidence YAML.

## Per-paper summary

**001c.74748 (Corning AFG die-embedded glass, IMAPS 2022)**
- Verified correct:
  - 6 TVs.
  - Stacks: the 125/250/125 um AFG laminate and the 40 um ABF.
  - Process conditions: 80 um DFR, 5% HF at ~2.4 um/min, cavity 127-130 um measured, misalignment <15 um, cure 120 C/10 min + 180 C/60 min, PoP bond 240 C.
  - Fig. 5 loss labels (0.18 / 0.47 / 0.66 dB) and the 0.145 dB derived loss.
- Flows:
  - F1 (Fig. 3 a-h, ordered) is shared by TVs a-d.
  - F2 (Fig. 8, full) covers e and f; F3 (PoP bond) is build_seq 2 on f.
  - Level grades are right.
- Defects:
  - The PoP bump width (140 um) is only in metrics.
  - The bottom solder balls (Fig. 8(f), Fig. 10(b) 300 um) have no interconnect row.
  - Three bboxes clip the (b) panel labels.

**2380-4505-2020.1.000042 (Unimicron RDL-first FOPLP, IMAPS 2020)**
- Stack and interconnects match Fig. 3(a): DL thicknesses, via openings, ML L/S/thickness, 35/37/3/15 um bump, 0.35 mm / 0.2 mm BGA.
- Fig. 7 SEM values match exactly, as do Fig. 9 TC profiles and EMC lamination conditions (0.58 'MPs' read as MPa, noted).
- Flows: F1 is split per Fig. 5(a) (28 steps, ordered). F2 (bumping) runs parallel to F1. F3 follows Fig. 5(b) in order (full).
- Reflow conflict (250 C text vs ~260 C curve) is logged.
- Defects:
  - The measured ball width 212.4 um (Fig. 14) is missing.
  - F1-s01 target misused; F3-s12 '4 pulses' not in conditions.
  - The Fig. 12 and Fig. 13 candidate bboxes clip the image bottoms.

**tcpmt.2024.3507552 (Georgia Tech 3-D stitch-chip, TCPMT 2025)**
- Table I values match.
- Measured vs design values are handled correctly:
  - Bump 80/50 um design vs ~90 um as-formed vs 100/20 um after bonding, with conflicts logged.
  - Simulated values (58 um TSV, 56/58 Ohm TDR, Fig. 3 comparison) are basis simulated.
- Flows:
  - Six flows; component flows F1-F4 are parallel at build_seq 1.
  - F5 (3DSC bond) is build_seq 2. F6 is build_seq 3: a shared die attach, then seq-2 deltas for TV-a (TCB) and TV-b (wire bond).
- Defects:
  - i2 metallurgy names the Cu cap, which is on the board side.
  - The 30 um post-bond film label is missing from conflicts.
  - F6-s01 thickness_in_um is missing.
  - F1-s06 target holds a measured value.
  - The figure ranking puts the process flows behind the images.

## Findings
| # | paper | table / row | field | severity | fix |
|---|---|---|---|---|---|
| 1 | 001c.74748 | interconnects f-i1 | diameter_um | content_missing | 140 (measured, figure_image, p.5 Fig. 10(b)) |
| 2 | 001c.74748 | interconnects new f-i3 (+ e-i4) | row | content_missing | bottom solder_ball, diameter 300 um measured (Fig. 10(b)); e: stated, schematic (Fig. 8(f)) |
| 3 | 001c.74748 | figures f01-f03 | bbox | figure | extend y1 to 0.372 / 0.615 / 0.486 to include the (b) labels |
| 4 | 2380-...000042 | metrics new a-m14 | row | content_missing | mounted ball width 212.4 um measured, p.6 Fig. 14; conflict vs 200 um |
| 5 | 2380-...000042 | process_steps F1-s01, F3-s12 | target, conditions | structure | clear the carrier-size target; conditions '4 pulses' |
| 6 | 2380-...000042 | figures f12, f13 | bbox | figure | manual, y1 0.340 / 0.868 |
| 7 | tcpmt.2024.3507552 | interconnects a-i2 | metallurgy | content_wrong | 'Au stud bump to Cu pad (TSV chiplet top)' |
| 8 | tcpmt.2024.3507552 | evidence c3 conflict | thickness_um | content_missing | add 30 um (Fig. 11 panel 2, after bonding) |
| 9 | tcpmt.2024.3507552 | process_steps F6-s01 | thickness_in_um | content_missing | 50.8 (2 mil) + derived entry |
| 10 | tcpmt.2024.3507552 | process_steps F1-s06 | target, basis | structure | target 'd 80, h 50 um' (Table I); basis design_target; result:measured |
| 11 | tcpmt.2024.3507552 | figures f02-f07 | rank | figure | process flows Fig. 7, Fig. 9 to ranks 2-3 |

## Rates
- Rows checked: 338 of 338 (100%), plus 3 evidence YAMLs.
- Content-changing defects: 6 (1 content_wrong, 5 content_missing), i.e. about 1.8 per 100 rows. None changes a pitch, thickness, L/S, warpage, yield or process condition already in the tables.
- Structure defects: 2 (step field misuse).
- Figure defects: 3 of 47 figure rows (2 bbox, 1 rank ordering); 6% of rows.
- Every rank 1 is correct: Fig. 4 cross-section, Fig. 11 SEM cross-section, and Fig. 11 stack schematic (paper 3 has no cross-section image).
- No missing schematic or build-image figures.
- No design or simulated value presented as measured.
- No values copied from cited prior work.
- No physical TV left uncovered by a flow.
