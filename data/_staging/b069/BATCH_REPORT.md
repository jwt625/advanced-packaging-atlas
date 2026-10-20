# Batch b069 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b069` -> `0 errors, 0 warnings`.
Crop check: `scripts/crop_figures.py --staging data/_staging/b069` rendered all 15 key-figure crops (scratch only).

| paper_id | status | papers | TV | comp | layers | ic | steps | ei | oi | metrics | figures (manual) | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51529.2024.00106 | distilled | 1 | 4 | 8 | 30 | 8 | 31 | 0 | 0 | 20 | 6 (0) | yes |
| tcpmt.2025.3540665 | distilled | 1 | 1 | 2 | 9 | 1 | 16 | 0 | 0 | 22 | 3 (0) | yes |
| iedm45741.2023.10413759 | distilled | 1 | 4 | 7 | 16 | 3 | 16 | 0 | 0 | 25 | 6 (6) | yes |

## ectc51529.2024.00106 (imec, multi-tier collective D2W)
- Figures opened: page_03-05 renders; candidates p01_fig1, p02_fig2, p03_fig3, p03_fig4, p04_fig8, p05_fig10, p05_fig11; 400-500 dpi re-crops of Fig. 1, 6, 8, 10, 11.
- Key figures (all candidate): f01 Fig. 11 cross_section; f02 Fig. 2 process_flow; f03 Fig. 1 process_flow; f04 Fig. 10 other (yield bars); f05 Fig. 4 other (yield bars); f06 Fig. 8 other (photo + alignment histograms).
- TVs: a N=2 (tier 1), b N=3 (tier 2), c N=4 (tier 3) short-loop stacks; d full-loop N=3 HB stack with TSVs. Aligned vs non-aligned N=2 kept as variant (same stack).
- Judgment calls: short-loop interface entered as ic_type other (SiCN-SiCN, Fig. 1 draws no pads), bonding_method hybrid_bond_d2w (collective D2W). Stack layers for a-c from Fig. 1 labels (SiCN) + text (LT SiCN backside, 50 um dies). Tier 2 transfer yields (93/92/84/64%) not mapped to D01-D04, entered as min/max. Fig. 4/10 per-wafer bar readings in evidence only; text ranges entered.
- Not reported: die size/count, wafer diameter, bonding/anneal conditions (except 'up to 350 C'), TSV and pad dimensions, electrical data.

## tcpmt.2025.3540665 (Aalto, Cu-Sn-In SLID)
- Figures opened: candidates p02_fig1, p02_fig2, p03_fig3 (all complete).
- Key figures (all candidate): f01 Fig. 2 cross_section; f02 Fig. 1 micrograph; f03 Fig. 3 electrical_plot. Paper has only 3 figures.
- One TV (device + cap chip); bonding splits 170 C/5 min, 150 C/5 min, 150 C/2 h as metrics.variant. Interconnect row carries the 170 C condition.
- Judgment calls: bonding_method tcb (flip-chip bonder, 15 MPa) with SLID in metallurgy; level die_stack_internal (chip-to-chip). Text layer drops the Ohm symbol; units restored from context. Paper-derived resistivities/single-bump values entered with basis derived.
- Source issues: chip sizes printed as '6 x 6 um' / '4 x 4 um' (unit typo; not entered). Abstract 'as low as 1.3e-7 Ohm-m' not traceable to body (body best 1.6e-7); logged as conflict.
- Not reported: chip and wafer thickness, bump counts, yield, reliability, deposition methods.

## iedm45741.2023.10413759 (UCLA, GaN/Si-IF power delivery)
- OCR text (TEXT_LAYER_WARNING); body numbers verified on PDF re-crops of p.2. No candidates.json entries.
- Figures opened: page 3-4 grids; 200-300 dpi re-crops of Fig. 4, 5, 6, 8, 9, 10, 11, 14, 15, 16, 17.
- Key figures (all manual): f01 Fig. 8 cross_section; f02 Fig. 5 process_flow; f03 Fig. 4 package_photo; f04 Fig. 17 cross_section; f05 Fig. 15 process_flow; f06 Fig. 9 reliability_plot.
- TVs: a dielets on GaN/Si-IF (10 um pitch Cu-Cu, ALD Al2O3); b dielet-side PDN demo (SU8, plated Cu, solder, test PCB); c thermal test (375 mm2 heater, water cooling); d ANSYS thermal model (simulation_model).
- Judgment calls: pitch 10 um from Fig. 4(c) label vs title 'sub-10 um' (conflict logged). Tacking/anneal entered as upper bounds (lt) from Fig. 5; Fig. 6 profile readings in conditions. package_class wafer_scale for GaN/Si-IF. Fig. 9/10/14/16/17(e) bar/marker values read from images (approx). primary_bucket kept si_interposer.
- Excluded: 1 A/mm2 capability claim, Fig. 3/12/13 circuit/PDN simulations (illegible values).
- Not reported: dielet count/thickness, SiO2 thicknesses, anneal time, shear n, solder alloy, dielet-side PDN dimensions.

## Schema gaps
- No figure_kind for yield/bar charts (used `other`).
- No column for anneal pressure (GaN/Si-IF batch anneal <150 MPa put in notes).
- SLID bonding has no bonding_method enum (used tcb).
