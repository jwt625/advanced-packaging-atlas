---
title: L31 data minors - audit A10 Part 2 D1, D2, D3, D5, D6
date: 2026-10-21
status: done 2026-10-21 (validator 0 errors, 0 warnings; build_views.py not run, coordinator only)
owner: L31 (lane subagent)
scope: affected rows of data/test_vehicles.csv, components.csv, interconnects.csv, metrics.csv,
  electrical_interfaces.csv, org_sites.csv; data/evidence/{ectc51909.2023.00091,ectc51909.2023.00174,
  ectc51687.2025.00051}.yaml (revisions/derived only as the skill requires); this notes file
---

# L31: data minors from audit A10

Parent: [DevLog-013](../DevLog-013-backlog-round-1.md). Inputs: [audit A10](../audits/round1_audit_A10_2026-10-21.md)
Part 2 findings D1-D3, D5, D6 (D4 is Wentao's schema decision, not in scope); [L25 notes](L25-data-followups.md).
Binding: `.claude/skills/packaging-distill/SKILL.md`, `data/schema/packaging.schema.yaml` (v2.5).
Not touched: data/figures.csv (L29), scripts/build_views.py (coordinator only).

## Plan (2026-10-21 19:18 PDT, before any edit)

0. Backup the 6 CSVs + 3 evidence YAMLs to `cache/backups/L31_before_<ts>.zip`.
1. Render the source pages with uv + pymupdf into a unique scratchpad folder (00091 p.1 Fig. 2; 00174 p.1 Fig. 1
   and the p.2 Sec. I text; 00051 p.4 Fig. 6 and Sec. IV text); verify each item against the render.
2. D1 (ectc51909.2023.00174-h notes only): reword to "3X lies under both arrows; CoWoS-S per p.2 Sec. I", keeping
   the other facts (label, 1X reticle, year not given); <= 30 words.
3. D2 (00091): if Fig. 2 states the HBM generation and per-pin rate, add electrical_interfaces rows c-e1, d-e1, e-e1
   (protocol enum as available, protocol_as_written, lane_rate_gbps, basis/source/locator). Aggregate BW: the
   figure gives TB/s (memory bandwidth per package); rule (e) allows exact unit changes only, TB/s -> Tbps is x8
   (bytes -> bits), an exact conversion: decide whether to enter and log in evidence `derived`. Component names
   unchanged.
4. D3 (00051 interconnects d-i1..j-i1): level die_to_bridge is inferred from the EMIB context; append
   "Level inferred (EMIB)." to the 7 notes (basis stays: it describes the pitch value, not the level).
5. D5 (00091 TVs c-e and their children): decide basis per schema rule (b) definitions vs the figure wording;
   record the reasoning here and in the evidence revisions.
6. D6 (org_sites nec-kawasaki-shi, shinko-electric-industries-kita-owaribe-nagano): site_precision enum is
   [building, campus, postcode, city, region, unresolved]; no district value. Keep `city`, append a note.
7. Evidence YAML revisions for every changed row (dated); diff each CSV vs backup (only intended cells, CRLF kept);
   `uv run python scripts/validate_db.py` 0/0; delete the scratch renders.

## Progress log

- 2026-10-21 19:19 PDT: backup `cache/backups/L31_before_20261021T191913.zip` (6 CSVs + 3 evidence YAMLs).
- 2026-10-21 19:21 PDT: renders (pymupdf from source.pdf, scratchpad, 250-400 dpi): 00091 p.1 Fig. 2, 00174 p.1
  Fig. 1, 00051 p.4 Fig. 5-6 + Sec. IV; 00174 p.2 Sec. I read in text.md. Findings:
  - D1: CoWoS-S arrow ends just past the 3X point; CoWoS-L arrow starts between 2X and 3X, so 3X is under both.
    p.2 Sec. I: stitching "in the previous CoWoS generations to scale Si interposer up to ... 3x" and "CoWoS-S, Si
    interposer based CoWoS technology": the CoWoS-S attribution rests on this text. A10 confirmed.
  - D2: Fig. 2 row "HBM Type" prints "HBM2 @1.8 Gbps", "HBM2E @3.2 Gbps", "HBM3 @6.4 Gbps"; row "Max. Memory BW,
    TB/s" 0.9 / 2.5 / 6.5. Consistency (own check, not entered): 4 x 1.8 x 1024 pins = 7.4 Tbps = 0.92 TB/s,
    6 x 3.2 x 1024 = 2.46 TB/s, 8 x 6.4 x 1024 = 6.55 TB/s, so "Gbps" is the per-pin rate.
  - D3: Fig. 6 title "Package Form Factor and D2D Interconnect Pitch Evolution"; no bridge named on the pitch band;
    Sec. IV ("EMIB-T (TSV) technology and scaling roadmap", Fig. 5 "EMIB Bridge bumps") gives the EMIB context.
  - D6: schema site_precision enum = building, campus, postcode, city, region, unresolved; no district value.
- 2026-10-21 19:22 PDT: edits applied (csv module, QUOTE_MINIMAL, CRLF; a whole-file read/write roundtrip was
  checked byte-identical before editing). Id-keyed diff vs the pre-edit copy: only the cells below changed; 0 rows
  removed; row order unchanged; every line still CRLF; metrics.csv untouched; figures.csv not touched (L29).

  | item | rows | before | after |
  |---|---|---|---|
  | D1 | test_vehicles ectc51909.2023.00174-h notes | "Point at the CoWoS-S arrow end, where the CoWoS-L arrow starts; label ..." | "3X lies under both Fig. 1 arrows; CoWoS-S per p.2 Sec. I (Si interposer up to 3x). Label '(>1T transistor)'. 1X reticle ~830 mm2. Year not given." |
  | D2 | electrical_interfaces ectc51909.2023.00091-{c,d,e}-e1 (new) | - | protocol other (as written HBM2; enum has no hbm2) / hbm2e / hbm3; lane_rate_gbps 1.8 / 3.2 / 6.4; aggregate_bw_tbps 7.2 / 20 / 52 (TB/s x 8, exact unit change, evidence `derived`); scope "per package, all HBM stacks"; channel_type and lanes empty (not stated); design_target, figure_image, p.1 Fig. 2. Component names unchanged |
  | D3 | interconnects ectc51687.2025.00051-{d..j}-i1 notes | "... (figure reading)." | + " Level die_to_bridge inferred (EMIB context, Sec. IV)." Basis unchanged: it describes the pitch value; the level is a mapping (skill rule 10: inferred mappings go in notes) |
  | D5 | components ectc51909.2023.00091-{c,d,e}-c1 basis | design_target | stated |
  | D6 | org_sites nec-kawasaki-shi, shinko-electric-industries-kita-owaribe-nagano notes | ... | + "; L31 2026-10-21: district-level point, precision city (enum has no district value)"; precision stays city |

- D5 reasoning: schema rule (b) defines `stated` as a non-numeric fact (material, step, name) and `design_target`
  as dimensions/conditions stated as the build or design; `measured` needs a measurement. Fig. 2 prints platform
  maxima ("Max. Interposer Area", "Max. No. of HBMs/pkg.", "Max. Memory Density/BW") per CoWoS generation, numbers
  with no measurement, so TVs c-e, components c2 (count), metrics m1-m2 and the new e1 rows stay design_target.
  The three c1 rows hold only a name and process node (no number): `stated`, as for 620 of 675 number-free component
  rows in the DB.
- D6: the two notes are now 38 and 37 words (validator limit 40; rule (m) asks <= 30). Not shortened, to keep the
  L14/L25 history text intact; trim if wanted. A `district` site_precision value would be an additive schema change
  (coordinator).
- Evidence: data/evidence/ectc51909.2023.00091.yaml: 3 `derived` entries (TB/s -> Tbps), not_reported line
  "electrical_interfaces" narrowed to "of TVs a, b", 2 dated revisions (D2, D5). 00174 and 00051 YAMLs not edited
  (notes-only changes; the skill requires no evidence entry for them).
- 2026-10-21 19:22 PDT: `uv run python scripts/validate_db.py` -> 0 errors, 0 warnings (data). Scratch renders,
  pre-edit copies and the two scratch scripts deleted.

## Hand-off

Status: D1, D2, D3, D5, D6 done; validator 0/0; no git writes; build_views.py not run.
Backup: `cache/backups/L31_before_20261021T191913.zip`.
Files changed: data/test_vehicles.csv, data/components.csv, data/interconnects.csv, data/electrical_interfaces.csv,
data/org_sites.csv, data/evidence/ectc51909.2023.00091.yaml, this file.
Open (coordinator): optional `district` site_precision enum value (additive schema change); optional `hbm2` protocol
enum value (00091-c-e1 uses `other`); D4 stays with Wentao (projection schema decision).
