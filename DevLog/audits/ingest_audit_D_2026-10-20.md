## Audit D: tcpmt.2025.3614186 (b097), estc60143.2024.10712019 (b096)

**Result:** 7 defects confirmed against the source:
- 1 wrong value
- 3 figure crops cut at an edge
- 3 minor issues

Nothing else was wrong. The validator gives 0 errors and 0 warnings on both batches. I changed no repo files.

### Sample
Both papers were checked completely, every row of every table plus the evidence YAML; no table had more than 60 rows. Sources:
- **Text:** all of each text.md.
- **Page renders:**
  - tcpmt: pages 2-10.
  - estc: pages 2-6.
- **Candidate crops:** opened for every chosen figure.
- **Re-crops** (written to the audit_D scratch folder):
  - tcpmt: Fig. 18 at 300 dpi; Figs. 5-8 at their manual bboxes; Fig. 6 used for the pitch check.
  - estc: Fig. 3 at 400 dpi; Figs. 4 and 5 at 500 dpi; Fig. 14 panels at 500 dpi; corrected bboxes for Figs. 12, 14 and 15.

| paper | batch | rows checked / total | figures checked | flow level | agree |
|---|---|---|---|---|---|
| tcpmt.2025.3614186 | b097 | 117 / 117 | 20 / 20 | full | yes |
| estc60143.2024.10712019 | b096 | 111 / 111 | 18 / 18 | full | yes |

### Per paper

**tcpmt.2025.3614186**
- **Values verified:**
  - Table I: core 500 um, 2 metal layers, RDL 22 um, ball 580 um, pitch 1 mm, 7404 I/O.
  - Table II properties on TV b layers.
  - Table IV: n 47, 0.09970 / 0.10472 ohm.
  - Fig. 11 labels: 17.6, 14.7, 5.5, 9.3, 5.1.
  - Figs. 15, 16 and 18 plot readings.
  - Warpage: 0.393 measured, 0.398 simulated, -1.761 and -1.600.
- **Conflicts:** all logged correctly (7404 vs 7405, 14.7 vs "below 12", n 24 vs 47, GX-92).
- **Flow F1:**
  - Order is correct: SAP, dicing, die attach, balling, SMT, corner-fill.
  - Typed conditions are present (150 C / 3600 s, 255 C peak, 150 C / 600 s).
  - Keyence profiling and X-ray are inline inspection; the yield is a metric.
  - The HBM stacking position is correctly marked inferred_order.
  - TV b (simulation) is listed in not_reported.
- **Defects:**
  - b-i1 puts the die-set 55 um pitch on the FE model. Fig. 6 geometry shows about 135-140 um, and the paper never states the model pitch.
  - An evidence entry uses row_id b-m10 for the Fig. 16 unit; it should be b-m7 to b-m9.
  - f02 'shows' adds "1 mm pitch", which is not in the figure or caption.

**estc60143.2024.10712019**
- **Values verified:**
  - Fig. 3 stack-up, row by row: 40/17/150/17/20 ... 2100 and 1100 prepreg, 3.952 mm.
  - Fig. 10: 13/18 um Cu, 30 um RG740 (7 per side as drawn), 750 um Megtron 6 core.
  - Fig. 4: 793.83 / 3619.95.
  - Fig. 5: 3674.108 / 3700.788 / 1955.916 / 1991.586 / 1022.55 / 1016.605 and the core thicknesses.
  - Fig. 14: microvia widths 44.18-56.33; core via 204.17 (a core-via label in the full-stacked panel).
  - Tables I and II.
- **Flows:**
  - F1 conditions are correct: 195 C, 260 N/cm2 = 2.6 MPa, 180 min, vacuum.
  - F2 is ordered.
  - F3 is the reprinted generic mSAP flow.
  - All 16 build figures plus Tables I and II are in the figures table.
- **Defects:**
  - Fig. 15 candidate bbox cuts the scale bars.
  - Fig. 12 candidate bbox cuts the bottom border.
  - Fig. 14 manual bbox cuts the configuration labels.
  - b-m1 has statistic 'mean', but Table II does not say average.

### Findings
| # | paper | table | row_id | field | severity | fix |
|---|---|---|---|---|---|---|
| 1 | tcpmt.2025.3614186 | interconnects | b-i1 | pitch_um | content_wrong | Clear 55 and its override. Note it as the die-set pitch (Sec. II.A) on a-c1, and add an evidence conflict entry. |
| 2 | tcpmt.2025.3614186 | evidence | b-m10 | entries.row_id | minor | Change row_id to b-m7 (or b-m7 to b-m9). |
| 3 | tcpmt.2025.3614186 | figures | f02 | shows | minor | Remove "1 mm pitch". |
| 4 | estc60143.2024.10712019 | figures | f11 | bbox | figure | Set manual bbox 0.0695,0.1413,0.4948,0.284 and clear cand_id. |
| 5 | estc60143.2024.10712019 | figures | f13 | bbox | figure | Set manual bbox 0.0911,0.2506,0.4696,0.43 and clear cand_id. |
| 6 | estc60143.2024.10712019 | figures | f09 | bbox | figure | Set bbox 0.52,0.535,0.935,0.918. |
| 7 | estc60143.2024.10712019 | metrics | b-m1 | statistic | minor | Set statistic to single. |

### Rates
- **Defects per row:**
  - tcpmt: 3 / 117 = 2.6% (1 wrong value, 0.9%).
  - estc: 4 / 111 = 3.6% (0 wrong values).
- **Figure defects:**
  - tcpmt: 1 / 20 (shows text only; 0 bbox defects).
  - estc: 3 / 18 bbox defects (17%).
- **Not found:**
  - No basis errors: no design or simulated value is presented as measured.
  - No values from cited prior work were entered.
  - No values were copied onto sibling TVs.
  - No uncovered physical TVs.
  - No tests or measurements entered as process steps.
  - No structure-restating steps.
