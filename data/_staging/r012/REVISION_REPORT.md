# Revision report r012 (2026-10-19)

Mode: audit_fix_and_figures. Validator: `uv run python scripts/validate_db.py --staging data/_staging/r012` -> 0 errors, 0 warnings.
Every change is logged per paper in `evidence/<paper_id>.yaml` under `revisions:`. The pre-change copy of the batch is in session scratch `r012/backup_before/` (not in the repo).
CSV line endings are kept as exported (LF, and CRLF for optical_interfaces.csv). Non-ASCII "µ" in pre-existing icep61562 title and captions was not touched.

| paper | non-figure row changes | figures before -> after |
|---|---|---|
| tcpmt.2021.3104326 | 5 updated, plus 2 evidence conflict edits | 6 -> 7 |
| estc60143.2024.10712129 | 2 (1 updated, 1 deleted) | 6 -> 22 |
| icep-iaac64884.2025.11003038 | 2 (1 updated, 1 deleted) | 6 -> 6 |
| iwlpc52010.2020.9375855 | 2 (1 updated, 1 deleted) | 6 -> 7 |
| icep61562.2024.10535612 | 0 | 4 -> 4 |

## tcpmt.2021.3104326 (audit_x2A)

Audit items:
- x2A #2, b-i1 resistance_mohm 47.8 copied from a-i1: **applied**.
  - Evidence: the p.3 Fig. 3 caption says "These data have been obtained on assemblies without underfill". The p.6 Table I Kelvin value of 47.8 mOhm at 300 K is not split by underfill.
  - Change: resistance_mohm 47.8 -> empty, and the overrides `resistance_mohm:measured;resistance_mohm:table` -> empty.
  - Locator: p.4 Sec. IV -> p.5 Sec. IV, and Table I removed from it.
  - Notes now say the R data come from no-underfill assemblies. b-m2 ("similar to assemblies without underfill") is kept.
- x2A #6, 260 C stacking-reflow locator p.4 -> p.5: **applied**. The text "reactions happening during the reflow at 260 C at the end of the stacking process" comes after the `<!-- page 5 -->` marker.
  - a-i1: locator `p.2 Sec. II; p.4 Sec. IV; p.6 Table I` -> `p.2 Sec. II; p.5 Sec. IV; p.6 Table I`; notes "per p.4" -> "per p.5".
  - a-s05 and b-s05: locator `p.2 Sec. II; p.4 Sec. IV` -> `p.2 Sec. II; p.5 Sec. IV`; notes "(p.4)" -> "(p.5)".
  - Evidence conflicts entry for a-i1 bonding_temp_c: "(p.4)" / "p.4 Sec. IV" -> "(p.5)" / "p.5 Sec. IV".
- x2A #10, c-i1 height_um = 0.5 is the pad thickness: **applied**.
  - Evidence: the p.5 Fig. 6 caption gives "a 500-nm-thick 5 um x 5 um Cu bonding pad" per half link.
  - Change: height_um 0.5 -> empty, and the override `height_um:caption` removed. The pad thickness is now in notes; c-L05 and c-L06 already hold 0.5 um.
- x2A #11, a-m10 unlogged conflict: **applied**. Fig. 3(d) was opened: its lowest warm-up point reads about 11.0 mOhm, against 11.7 in p.6 Table I and the p.4 text.
  - A conflicts entry was added, with 11.7 chosen under rule (k).
  - The value is unchanged.
- x2A section 4, rank 1 not the best build view: **applied**. Fig. 5 FIB-SEM is now f01 (was f02), Fig. 6 is f02 (was f03), and the Fig. 2 schematic is f03 (was f01).
- x2A section 4, f03 `shows` "SiN liners": **applied**. In Fig. 6(b) the arrows label SiN dielectric layers, and the liners are Ti/TiN (p.2 Sec. II).
  - Text -> "SiN dielectric layers arrowed".
  - "4 visible vias per side" was trimmed to "vias" to meet the 25-word limit.
  - Logged under the old id -f03 (now -f02).
- x2A has_process_flow, numeric checks and exclusions: verified OK in the audit; no change.

Sibling groups: none listed.

Figures:
- Added Fig. 4 (electrical_plot, candidate p04_fig4, opened). It is the hybrid-bond Rlink vs T plot, the counterpart of Fig. 3 for TV c.
- All 7 printed figures and tables are now included.

New rank:

| fig_id | figure | kind |
|---|---|---|
| f01 | Fig. 5 | cross section (was f02) |
| f02 | Fig. 6 | cross section (was f03) |
| f03 | Fig. 2 | stack schematic (was f01) |
| f04 | Fig. 1 | layout |
| f05 | Table I | data table |
| f06 | Fig. 3 | electrical plot |
| f07 | Fig. 4 | electrical plot (new) |

## estc60143.2024.10712129 (audit_x2B)

Audit items:
- x2B section 5, f05 `shows` numbers (delta 2030 um, t=2.0 mm, w=20.5 mm, delta 108 um): the audit verified them correct; no change. The row is now f17.
- x2B section 5, "Pass (both lines)" x5 (not judged by the audit): judged here as a sibling group (below).

Sibling groups:
- g-m1, g-m2, h-m1, h-m2, h-m3: **kept all (genuine per-TV)**. p.5 Table VII (opened) lists Pass/Fail per substrate, per cycle count (500/1000/2000) and per test line.
  - Substrate-A = TV g: Pass, Pass, then Fail at 2000 cycles (g-m3).
  - Substrate-B = TV h: Pass at all three counts.
- a-m1, b-m1: **copy -> one row**. p.3 Sec. III.A gives one statement for "the 15 um bump pitch": good underfilling, no voids in both processes.
  - TV-A and TV-B are both 15 um pitch, and Fig. 8 does not name the TV.
  - a-m1 scope "15 um bump pitch" -> "15 um bump pitch; applies to TVs a, b". b-m1 deleted.

Figures:
- Added schematics and images (all opened):

| figure | kind | crop | note |
|---|---|---|---|
| Fig. 16 | cross_section | candidate | |
| Fig. 18 | cross_section | manual | no candidate existed; candidate p05_tablevii had merged it with Table VII |
| Fig. 10 | cross_section | candidate | |
| Fig. 8 | cross_section | candidate | SAT plus SEM |
| Fig. 9 | cross_section | candidate | |
| Fig. 12 | cross_section | candidate | panel photo plus SEM |
| Fig. 17 | stack_schematic | candidate | test-line daisy chain |
| Fig. 3 | process_flow | candidate | |
| Fig. 4 | process_flow | candidate | |
| Fig. 5 | process_flow | candidate | |
| Fig. 6 | process_flow | candidate | |

- Added plots and tables that carry extracted values:

| figure | kind | crop | note |
|---|---|---|---|
| Fig. 13 | warpage_plot | manual | candidate cut the sub-labels; source of f-m1, f-m2 |
| Table VII | data_table | manual | candidate also held Fig. 18; source of TCT rows |
| Table II | data_table | candidate | die specs |
| Table III | data_table | candidate | interposer specs |
| Table V | data_table | manual | candidate also held Fig. 7; motherboard specs |

- Not added:
  - Fig. 1: generic 2.xD concept and challenges schematic, not a build of this paper.
  - Fig. 2: already inside the Table I crop (f15 notes).
  - Table VI: a three-cell TCT condition table; its values are in the metric condition fields.
- Existing bboxes unchanged.

New rank:

| fig_id | figure | kind |
|---|---|---|
| f01 | Fig. 14 | cross section |
| f02 | Fig. 16 | cross section (new) |
| f03 | Fig. 18 | cross section (new, manual) |
| f04 | Fig. 10 | cross section (new) |
| f05 | Fig. 8 | cross section (new) |
| f06 | Fig. 9 | cross section (new) |
| f07 | Fig. 12 | cross section (new) |
| f08 | Fig. 11 | micrograph (was f06) |
| f09 | Fig. 17 | stack schematic (new) |
| f10 | Fig. 7 | process flow (was f02) |
| f11 | Fig. 3 | process flow (new) |
| f12 | Fig. 4 | process flow (new) |
| f13 | Fig. 5 | process flow (new) |
| f14 | Fig. 6 | process flow (new) |
| f15 | Table I + Fig. 2 | data table (was f03) |
| f16 | Fig. 13 | warpage plot (new, manual) |
| f17 | Fig. 15 | warpage plot (was f05) |
| f18 | Table VII | data table (new, manual) |
| f19 | Table IV | data table (was f04) |
| f20 | Table II | data table (new) |
| f21 | Table III | data table (new) |
| f22 | Table V | data table (new, manual) |

## icep-iaac64884.2025.11003038 (no audit)

Audit items: none in x1, x2A or x2B.

Sibling groups:
- e-m4, g-m4: **copy -> one row**. p.2 Sec. III says "The GCS warpage was 2.5 - 5x lower than OCS for 4-metal-layers substrates at peak temperature". This is one statement for Samples 3 and 4.
  - e-m4 scope -> "GCS vs OCS, 4-metal-layer substrates; applies to TVs e, g (Samples 3, 4; OCS refs f, h)". reference_tv_id f is kept.
  - g-m4 deleted.

Figures: all 6 printed figures (Figs. 1-6) were already included. The page renders show no other figure; no change.

Rank unchanged:

| fig_id | figure | kind |
|---|---|---|
| f01 | Fig. 1 | stack schematic |
| f02 | Fig. 2 | stack schematic |
| f03 | Fig. 6 | warpage plot |
| f04 | Fig. 5 | warpage plot |
| f05 | Fig. 3 | warpage plot |
| f06 | Fig. 4 | warpage plot |

## icep61562.2024.10535612 (audit_x2B)

Audit items:
- x2B section 5, "Fig. 2" label used twice (p.1 and p.2): **not applicable**. This is the source's own numbering. f01 and f04 already note it in figures.notes, and the audit lists it as noted.

Sibling groups: none listed.

Figures: all 4 printed figures were already included. Page renders p.1-2 were checked; nothing else is there. No change.

Rank unchanged:

| fig_id | figure | kind |
|---|---|---|
| f01 | Fig. 2 (p.1) | micrograph |
| f02 | Fig. 4 | Bossung plot |
| f03 | Fig. 3 | Bossung plot |
| f04 | Fig. 2 (p.2) | Bossung plot |

## iwlpc52010.2020.9375855 (no audit)

Audit items: none in x1, x2A or x2B.

Sibling groups:
- a-m11, b-m1 (X-Cube height with Cu pillar 0.67 mm): **copy -> one row**. p.3 Sec. X-Cube Test Vehicles gives one height in a paragraph on both TVs. Fig. 3 ("Details of package and functional test vehicles") is a single drawing with 0.67 mm.
  - a-m11 scope -> "X-Cube height incl. Cu pillar; applies to TVs a, b". b-m1 deleted.

Figures:
- Added Fig. 2 (stack_schematic, candidate p03_fig2, opened). It is an X-Cube structure drawing: SRAM face-to-back on logic with TSV, Cu pillars to substrate, BGA.
  - tv_ids is empty: the paper calls it "one of X-Cube implementations" and does not tie it to TV a or b.
- Not added:
  - Fig. 1: generic 2.5D CoW/CoS assembly schematic, not this paper's build.
  - Fig. 7: reprinted [11] interface circuit diagram; e1/e2 values come from the text.
  - Figs. 8 and 9: reprinted [12] EDA design flows, not a fabrication flow.

New rank (images and schematics now ahead of the table):

| fig_id | figure | kind |
|---|---|---|
| f01 | Fig. 5 | cross section |
| f02 | Fig. 3 | stack schematic |
| f03 | Fig. 2 | stack schematic (new) |
| f04 | Fig. 4 | package photo (was f05) |
| f05 | Fig. 10 | package photo (was f06) |
| f06 | Fig. 6 | block diagram (was f04) |
| f07 | Table 1 | data table (was f03) |
