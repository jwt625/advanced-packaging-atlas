# BATCH_REPORT b093 (2026-10-20)

Papers: 001c.129276, 3dic63395.2024.10830178, ectc51846.2026.00243. All distilled. Validator: 0 errors, 0 warnings.

## 001c.129276 - Solenoid transformer balun in glass with TGVs (IMAPS 2024)
- Status: distilled. process_flow_level ordered (has_process_flow yes).
- Rows: papers 1, test_vehicles 1, components 2, stack_layers 7, interconnects 2, process_flows 1, process_steps 7,
  electrical_interfaces 0, optical_interfaces 0, metrics 13, figures 8.
- Figures opened: page_02-04.png; cand p02_table1, p02_fig1, p02_fig2, p03_fig3, p03_fig4, p03_fig5, p04_fig6,
  p04_fig7; manual re-crops of Fig. 1, 2, 3, 4, 5, 6, 7.
- Key figures:
  - f01 Fig. 4 micrograph (manual)
  - f02 Fig. 2 stack_schematic (manual)
  - f03 Fig. 3 process_flow (manual)
  - f04 Table 1 data_table (candidate p02_table1)
  - f05 Fig. 5 electrical_plot (manual)
  - f06 Fig. 7 electrical_plot (manual)
  - f07 Fig. 6 electrical_plot (manual)
  - f08 Fig. 1 block_diagram (manual)
- Judgment calls:
  - One TV (test_coupon, package_class glass_interposer = glass IPD substrate with TGVs).
  - Flow graded ordered: 7 numbered steps with materials and a named laser tool. The only typed condition is the
    vacuum lamination atmosphere, so no temperatures or times.
  - TGV depth 400 um and aspect ratio 13.3 are derived from the glass thickness.
  - TGV Cu is conformal in the Fig. 3 drawing, but the Fig. 4(b) caption says "via filling". Recorded in conflicts.
  - Fractional bandwidth 51% has basis derived (the paper's own calculation).
  - RF performance went to metrics, not electrical_interfaces, because the balun is a passive device and not a die-to-die link.
- Not reported: glass wafer diameter, TGV count, laser via diameter, seed metal, all process temperatures and
  times, ABF cure, reliability, inductance/Q.
- Source problems: none. The text layer is clean, and the Fig. 6-7 axis text is appended to the p.4 text.

## 3dic63395.2024.10830178 - Non-PFAS PID (CYCLOTENE XP80) for RF Si interposer (3DIC 2024)
- Status: distilled. process_flow_level full (cure temperatures and times are typed).
- Rows: papers 1, test_vehicles 1, components 2, stack_layers 10, interconnects 4, process_flows 1, process_steps 25,
  electrical_interfaces 0, optical_interfaces 0, metrics 28, figures 12.
- Figures opened: page_02-05.png; all 11 candidates; manual crops of Fig. 2 (p.2), Fig. 3(a)-(c), Fig. 6, and
  300 dpi zooms of Fig. 3(a) and Fig. 7.
- Key figures:
  - f01 Fig. 9 cross_section (candidate p05_fig9)
  - f02 Fig. 1 stack_schematic (candidate p02_fig1)
  - f03 Fig. 2 process_flow (manual, p.2 panels a-g)
  - f04 Fig. 3(a)-(c) cross_section (manual)
  - f05 Fig. 3(e) cross_section (candidate p03_fig3)
  - f06 Fig. 4 micrograph (candidate p03_fig4)
  - f07 Fig. 8 micrograph (candidate p05_fig8)
  - f08 Fig. 6 micrograph (manual)
  - f09 Fig. 7 electrical_plot (candidate p04_fig7)
  - f10 Fig. 10 electrical_plot (candidate p05_fig10)
  - f11 Fig. 11 electrical_plot (candidate p05_fig11)
  - f12 Fig. 5 other (TTV map, candidate p04_fig5)
- Judgment calls:
  - One wafer_level TV. The III-V die and the 40 um Cu/Ni/Sn micro-bumps belong to the envisioned platform
    (Fig. 1). The micro-bump step (Fig. 2(h)) has performed left empty because Sec. III stops at UBM.
  - The flow is Fig. 2 (a-h) refined by Sec. III detail, giving 25 steps.
  - PID1 soft cure 170 C/1 h is taken from "cured under the soft cure condition ... as well" (Sec. III.C).
  - The two descum placements are inferred_order.
  - The wet vs dry seed-etch comparison (Fig. 4) went to metrics, not to a route: dry etch is the adopted process,
    and the wet etch is a development comparison.
  - Fig. 7 leakage was read off the log plot (nA). The text says pre-descum leakage was "a few milliamps", so the
    plot value was chosen and the text is listed in conflicts.
  - Table I material data is attributed to ref [9]/Dupont, so it is excluded. The figure was skipped.
  - Fig. 3 is split on p.3, so it has two figure rows.
  - The Fig. 4 caption duplicates the Fig. 3 caption (noted).
  - venue = "3DIC 2024" (the batch file says 3DIC; no page numbers are printed).
- Not reported: Si/BEOL thicknesses, Via1 and UBM dimensions, pillar pitch/count, CMP/PVD/plasma parameters,
  warpage sign convention, reliability.
- Source problems: none (clean text; an institutional download stamp is on every page, not used).

## ectc51846.2026.00243 - CVD diamond-lined TSVs for vertical heat transport (ECTC 2026)
- Status: distilled. process_flow_level full (time, pressure and substrate temperature are typed).
- Rows: papers 1, test_vehicles 1, components 2, stack_layers 5, interconnects 3, process_flows 1, process_steps 8,
  electrical_interfaces 0, optical_interfaces 0, metrics 17, figures 8.
- Figures opened: page_02-06.png; 8 candidates (Table I viewed on the page render only, not used); manual crops of Fig. 4, 5, 6, 8 and a
  300 dpi Fig. 8 plot zoom.
- Key figures:
  - f01 Fig. 7 cross_section (candidate p05_fig7)
  - f02 Fig. 3 cross_section (candidate p03_fig3)
  - f03 Fig. 6 cross_section (manual)
  - f04 Fig. 5 cross_section (manual)
  - f05 Fig. 4 cross_section (manual)
  - f06 Fig. 8 stack_schematic (manual)
  - f07 Fig. 2 micrograph (candidate p03_fig2)
  - f08 Fig. 1 micrograph (candidate p02_fig1)
- Judgment calls:
  - One test_coupon TV. The via diameter (10/15/20 um) is a split, with one interconnect row per diameter and
    metrics.variant. The stack is identical across diameters.
  - Deposition time 3 h / 8 h is in split on the HFCVD step, because the paper does not map samples to diameters.
  - Filament carburization is a step (category other) inside the CVD run. Filament temperatures went into
    conditions; temp_c holds the stated ~850 C substrate temperature.
  - 37 Torr was converted to 0.004933 MPa (logged).
  - The Fig. 8 profiles were read off the plot (+/-0.03 um).
  - The thickness range is 0.1-2 um (Sec. III, abstract) against 0.5-2 um in the conclusion. 0.1 um was chosen,
    supported by Fig. 8 (minimum ~0.18 um); the conflict is logged.
  - The Cu-filled composite TSV is proposed only, so it has no TV or step.
  - "Purdue University (ack)" is recorded as the supplier of the TSV samples, without the person's name.
- Not reported: TSV depth, pitch, count; wafer size; SiO2/Ti thickness and methods; carrier bond material; thermal
  measurements; which sample was coated 3 h vs 8 h.
- Source problems: none. In text.md the SEM unit labels are garbled ('!"' for um), but they are readable on the
  renders.

## Validator output
```
uv run python scripts/validate_db.py --staging data/_staging/b093
0 errors, 0 warnings (data/_staging/b093)
```

## Schema gaps
- figure_kind has no geometry/metrology plot kind (thickness map, histogram, thickness profile). Used `other`,
  `micrograph`, or `stack_schematic` according to the dominant panel.
- There is no material-class value for diamond. CVD diamond is entered as dielectric_inorganic.
- A development A/B comparison of one step (wet vs dry seed etch) on the same TV fits neither route (one route was
  adopted) nor split cleanly. It is recorded in metrics.

## Coordinator figure fix (2026-10-20): clipped candidate bboxes

A pixel scan of every candidate-bbox figure row found content continuing below the bbox bottom (figure_candidates.py clips raster images, typically by about 0.012 of page height). Each bbox below was extended to the first blank gap under the image (checked on contact sheets; captions excluded) and set to bbox_source manual, cand_id empty.

| fig_id | page | old bbox | new bbox |
|---|---|---|---|
| ectc51846.2026.00243-f01 | 5 | 0.5065,0.1309,0.9019,0.3288 | 0.5065,0.1309,0.9019,0.3406 |
