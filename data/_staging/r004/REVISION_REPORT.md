# Revision report r004 (2026-10-19)

Mode: audit_fix_and_figures. Validator: `uv run python scripts/validate_db.py --staging data/_staging/r004` -> 0 errors, 0 warnings.
All changes are logged per paper in `evidence/<paper_id>.yaml` under `revisions:`. Pre-change copy of the batch: session scratch `r004/backup_before/` (not in repo).
CSV line endings kept as CRLF (as exported).

| paper | non-figure row changes | figures before -> after |
|---|---|---|
| ectc51687.2025.00061 | 2 | 6 -> 9 |
| ectc51687.2025.00284 | 3 | 6 -> 10 |
| ectc51687.2025.00055 | 2 (locators) | 6 -> 8 |
| ectc51687.2025.00097 | 15 (5 updated, 10 deleted) | 6 -> 16 |
| ectc51687.2025.00148 | 3 (1 updated, 2 deleted) | 6 -> 12 |

## ectc51687.2025.00061 (audit_x2B)

Audit items:
- x2B #1, a-i1 speculative typing: **applied**. Checked against the paper: p.3 Fig. 5 labels only "EMIB pitch". p.4 Sec. IV.B names solder bumps only for the EIC-PIC bond, and it says "Inline TCB FAR bonding process was used for all die bonding to substrate".
  - ic_type microbump -> unspecified. Level die_to_bridge kept (Fig. 5).
  - metallurgy solder kept, with the note "bump type not stated, solder inferred from FAR".
  - Row id unchanged.
- x2B #7, a-m1 variant: **applied**. p.5 Sec. IV.C has the pre-screen bake before TCB.
  - Variant "after pre-screen thermal bake (original TCB profile)" -> "incoming substrates after pre-screen bake at solder melting temperature".
- x2B section 4 Fig. 5 kind and the f02 step labels: verified OK in the audit; no change.

Sibling groups: none listed.

Figures:
- Added (all candidate crops, opened):
  - Fig. 10 (xray_csam, p04_fig10)
  - Fig. 9 (micrograph, p04_fig9)
  - Fig. 13 (package_photo, p05_fig13)
- Not added:
  - Figs. 1-4: reprinted, other programs' CPOs.
  - Figs. 6-8: model contour/plot images with no numeric values. They are the source of qualitative rows m8-m10 only.
- New rank:

| fig_id | figure | kind |
|---|---|---|
| f01 | Fig. 5 | stack schematic |
| f02 | Fig. 12 | process flow |
| f03 | Fig. 16 | package photo |
| f04 | Fig. 11 | micrograph |
| f05 | Fig. 15 | X-ray |
| f06 | Fig. 10 | X-ray (new) |
| f07 | Fig. 14 | TSAM (was f06) |
| f08 | Fig. 9 | SEM (new) |
| f09 | Fig. 13 | delamination images (new) |

## ectc51687.2025.00284 (audit_x2A)

Audit items:
- x2A #9, a-s02/a-s03 equipment: **applied**. p.2 Sec. II.A: "Fig. 3 shows the optical measurement set-up on the optical table with a 6-axis control system". The 6-axis system is not named as the attach tool.
  - equipment "6-axis alignment system" -> empty on both rows. Conditions "active alignment" kept.
  - Notes say the attach tool is not named.
- x2A #10, b-m1 n_samples: **applied**. p.4 Fig. 8 caption gives 216 data points; p.4 Sec. III.D gives a total of 18 test samples.
  - n_samples 216 -> 18. Condition now reads "1310 nm; 216 data points on 18 test samples (dies 1T-9T, 1-9) across 300 mm wafer".
- x2A section 4, rank 1 not the best build view: **applied**. Fig. 2 (path/stack schematic) is now f01 (was f02); Fig. 3 photo is now f02 (was f01).
- x2A section 4, tv_ids incomplete: **applied**. Fig. 2 tv_ids a -> a;b, because interfaces 4-5 belong to TV b (p.4 Sec. III.D-E). In the evidence log this revision is recorded under the old id -f02, now -f01.
- x2A process-flow item (00284 two ordered attach steps): the audit accepts it; no change.

Sibling groups: none listed.

Figures:
- Added (all manual; each crop opened):
  - Fig. 1, stack_schematic, paper-level, bbox 0.195,0.6095,0.41,0.69. Concept CoWoS + EPIS-BOE platform, not the measured TV. Candidate cut the SBT bottom.
  - Fig. 7, other (pie), TV a, 0.555,0.69,0.865,0.81. Source of a-m9.
  - Fig. 9, other (pie), TV b, 0.15,0.43,0.44,0.545. Source of b-m3.
  - Fig. 10, other (pies), TV b, 0.085,0.71,0.50,0.825. Source of b-m4/m5.
  - The pie candidates cut the pies at the bottom.
- Existing bboxes kept.
- New rank:

| fig_id | figure | kind |
|---|---|---|
| f01 | Fig. 2 | stack schematic |
| f02 | Fig. 3 | photo |
| f03 | Fig. 1 | concept schematic |
| f04 | Fig. 4 | plot |
| f05 | Fig. 8 | plot |
| f06 | Fig. 6 | plot |
| f07 | Fig. 5 | plot |
| f08 | Fig. 7 | pie |
| f09 | Fig. 9 | pie |
| f10 | Fig. 10 | pies |

## ectc51687.2025.00055 (no audit)

Sibling groups:
- b-m1 / c-m1 (C-SAM "no evidence of non-bond"): **genuine per-TV, kept**. p.2 Fig. 3 shows a separate C-SAM wafer map per build: (a) RTV, (b) CTV. Locators were narrowed to Fig. 3(a) and Fig. 3(b).
- e-m3 / f-m3 (bonding density 1X): **genuine per-TV, kept**. p.3 Table II gives SoIC 1X and SoIC-CS 1X as separate cells.

Figures:
- Added:
  - Fig. 3, xray_csam, TVs b;c, manual 0.0976,0.345,0.4878,0.5029. The candidate included a body-text line at the top.
  - Table II, data_table, TVs d;e;f, candidate p03_tableii. Source of d/e/f m3-m8.
- New rank:

| fig_id | figure | kind |
|---|---|---|
| f01 | Fig. 1 | stack schematic |
| f02 | Fig. 5 | stack schematic |
| f03 | Fig. 3 | C-SAM (new) |
| f04 | Fig. 2 | plot |
| f05 | Fig. 4 | plot |
| f06 | Table I | table |
| f07 | Table II | table (new) |
| f08 | Fig. 6 | plot |

## ectc51687.2025.00097 (no audit)

Sibling groups (all five are copied claims, so each is now one row on TV a with a scope, and the copies on b and c are deleted):
- m1, CSAM void free: p.6 Sec. IV/V states it "for all the temporary bonding processes". Fig. 14 does not map wafers to technologies.
  - a-m1 scope "applies to TVs a, b, c". b-m1 and c-m1 deleted.
- m2, Device 1 <2 um: p.6 Sec. IV/V says this generally; Fig. 15 mapping is not stated.
  - a-m2 scope "applies to TVs a, b, c". b-m2 and c-m2 deleted.
- m3, 350 C / 2 h requirement: p.2 Sec. II gives a general W2W requirement.
  - a-m3 scope "W2W permanent bonding excursion requirement; applies to TVs a, b, c". b-m3 and c-m3 deleted.
- m4, TTV <200 nm: p.2 Sec. II describes it as usual practice.
  - a-m4 scope "Device 1 thinned to <2 um; applies to TVs a, b, c". b-m4 and c-m4 deleted, along with their evidence `derived` entries.
- m5, bonding-layer TTV <1 um: p.2 Sec. I gives a general requirement.
  - a-m5 scope "applies to TVs a, b, c". b-m5 and c-m5 deleted.
- The `judgment_calls` text was updated to match.

Figures:
- Added (candidates unless noted; all opened):
  - Fig. 7, process_flow, a;b;c
  - Fig. 5, process_flow, d
  - Fig. 9, stack_schematic, a
  - Fig. 11, micrograph, b
  - Fig. 6, package_photo, d. The truncated right-edge labels are in the source image.
  - Fig. 14, xray_csam, a;b;c
  - Fig. 15, package_photo, a;b;c
  - Fig. 16, package_photo, a;b;c
  - Fig. 1, process_flow, paper-level, manual 0.506,0.64,0.906,0.79. The candidate cut panel labels (d)-(f).
  - Fig. 2, process_flow, paper-level.
  - Figs. 1-2 are concept product flows, not TVs.
- Not added:
  - Fig. 3: industrial existing systems, from ref [2].
  - Fig. 4: SEM of cracked organic glue in existing systems, not a TV build (already in evidence `excluded`).
- New rank:

| fig_id | figure | kind |
|---|---|---|
| f01 | Fig. 17 | X-section |
| f02 | Fig. 13 | flow |
| f03 | Fig. 7 | flow |
| f04 | Fig. 5 | flow |
| f05 | Fig. 8 | debond A |
| f06 | Fig. 10 | debond B |
| f07 | Fig. 12 | debond C |
| f08 | Fig. 9 | |
| f09 | Fig. 11 | |
| f10 | Fig. 6 | |
| f11 | Fig. 14 | CSAM |
| f12 | Fig. 15 | |
| f13 | Fig. 16 | |
| f14 | Fig. 1 | concept |
| f15 | Fig. 2 | concept |
| f16 | Table 1 | |

## ectc51687.2025.00148 (no audit)

Sibling groups:
- a-m6 / b-m6 / c-m6 ("almost no change in warpage behavior before and after TCT"): **copied claim**. p.4 Sec. III.D makes one statement for all legs and gives no per-leg change value.
  - a-m6 scope "all legs; stiffener dominates warpage; applies to TVs a, b, c". b-m6 and c-m6 deleted.
- b-m4 / c-m4 (73 um at 50 C, stiffener): **genuine per-TV, kept**. p.3 Fig. 4 has separate Leg 2 and Leg 3 markers that overlap; both read about 73 um, as noted in the rows and the evidence.

Figures:
- Added (each crop opened):
  - Fig. 5, micrograph, manual 0.507,0.52,0.905,0.742. The candidate cut the OK/NG labels.
  - Table I, data_table, candidate p02_tablei. Source of the stack_layers properties.
  - Fig. 3, warpage_plot, shadow moire maps, manual 0.093,0.66,0.487,0.79. The candidate cut the 250 C row.
  - Fig. 7, warpage_plot, manual 0.093,0.478,0.487,0.63. Source of m1/m2; the candidate cut the legend.
  - Fig. 9, warpage_plot, candidate p04_fig9. Source of a-m6.
  - Fig. 8, reliability_plot, manual 0.5065,0.1168,0.9003,0.252. Source of m9/m10; the candidate cut the legend.
- Rank 1 kept as Fig. 2 (full stack drawing). Fig. 10's cross-sections show only a local SR/ABF crack, not the build stack (judgment).
- New rank:

| fig_id | figure | kind |
|---|---|---|
| f01 | Fig. 2 | stack schematic |
| f02 | Fig. 1 | photo + section |
| f03 | Fig. 10 | X-section/CCD |
| f04 | Fig. 5 | |
| f05 | Table II | |
| f06 | Table I | |
| f07 | Fig. 3 | |
| f08 | Fig. 4 | |
| f09 | Fig. 7 | |
| f10 | Fig. 9 | |
| f11 | Fig. 6 | |
| f12 | Fig. 8 | |

## Notes / issues
- Concept and context schematics (00284 Fig. 1, 00097 Figs. 1-2) are included as paper-level figures (empty tv_ids) under the "every schematic drawing" rule. Drop them if the rule is meant only for drawings of a TV.
- Scope strings use the short form "applies to TVs a, b, c" as instructed. Nothing in the schema parses this text.
