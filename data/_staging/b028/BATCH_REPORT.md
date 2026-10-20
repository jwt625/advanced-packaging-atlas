# Batch b028 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b028` -> `0 errors, 0 warnings (data/_staging/b028)`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51687.2025.00012 | distilled | 3 | 12 | 5 | 3 | 12 | 0 | 2 | 66 | 6 | yes |
| ectc51846.2026.00140 | distilled | 2 | 1 | 6 | 3 | 13 | 0 | 0 | 2 | 4 | yes |
| iedm45741.2023.10413829 | distilled | 3 | 0 | 12 | 9 | 12 | 0 | 0 | 28 | 6 | yes |

## ectc51687.2025.00012 (Intel fiber-based CPO on EMIB)
- Figures opened: page_02-05 renders; candidates p02_fig1, p02_fig2, p03_tablei, p04_tablev, p04_tablevii, p04_tableviii; 400 dpi re-crop of the Fig. 1 3D render (pitch label).
- Key figures: f01 Fig. 1 stack_schematic (candidate p02_fig1); f02 Fig. 2 package_photo (candidate p02_fig2, reprinted=yes: caption says some pictures reprinted from [13]); f03 Table I, f04 Table V, f05 Table VII, f06 Table VIII data_table (candidates; crops start below the table title).
- TVs: a = 2-OIO-chiplet package (all data); b, c = 4- and 6-OIO packages (Fig. 2 photo only, no data). Standard vs reflow-compatible FAU, MT insulation, active vs passive alignment and lab vs HVM tester kept as metrics.variant (same stack).
- Metrics: every Table I-XI row entered as mean and std. dev. rows (statistic mean / other), IL sign as printed (negative). optical_interfaces.coupling_loss_db entered positive (2.46, 2.62) per schema; IL/facet = loopback IL / 2 and includes on-chip circuitry loss (scope).
- Fiber pitch 250 um only from a label in the illustrative Fig. 1 render (design_target, schematic).
- Conflicts logged: Table V vs text (-2.39/-2.52 vs -2.40/-2.53 dB; std 0.36 vs 0.40); TCB std text "0.34 to 0.47" vs Table VII end-of-line 0.36. Tables entered.
- Process flow: standard EMIB flow steps as named (chip attach, underfill, heat spreader attach, ball attach), health test, FAU attach last with active alignment, lid, EOL IL test, 3x SAC reflow; passive-alignment DOE as a second flow.
- Not reported: electrical interfaces, any die/bridge/substrate dimensions, bump pitches, wavelength, MFD, reflow profile, adhesive products, yield %, pass criteria.

## ectc51846.2026.00140 (SCHMID InfinityBoard)
- Figures opened: page_03 render; candidates p03_fig1-4; 500 dpi re-crop of Fig. 4(a) (measurement labels unreadable).
- Key figures: f01 Fig. 1 cross_section (candidate p03_fig1); f02 Fig. 3 stack_schematic (candidate p03_fig3); f03 Fig. 2 process_flow (candidate p03_fig2); f04 Fig. 4 micrograph (candidate p03_fig4). Paper has only 4 figures.
- TVs: a = platform panel substrate (glass core + TGV + ET RDL, generic flow); b = DRIE/ET SEM demonstration samples (Fig. 1 L/S ~5 um, Fig. 4 2.4/0.6 um, 15 um via).
- Judgment calls: "sub-2 um L/S" entered as a capability claim (line/space 2 with lt) on TV a; "2.4um/0.6um" entered as line/space in printed order, with a note that the SEM shows ~0.6 um walls between ~2.4 um gaps (roles may be reversed). Fig. 2 sub-steps C-L entered only as "masking" + "DRIE" since the text does not describe them.
- Thermal cycling and bend tests are claimed without any data: two value_text rows with result na.
- Not reported: panel size, glass type/thickness used, TGV dimensions, layer count, thicknesses, any electrical/warpage/reliability numbers.

## iedm45741.2023.10413829 (imec Cu/SiCN W2W HB at 400 nm pitch)
- Source: TEXT_LAYER_WARNING present; text.md is OCR ("OCR text" in papers.notes). All numbers checked on 220 dpi renders / 300 dpi re-crops of p.3-4.
- Figures opened: page_03/04 grids; 300 dpi re-crops of all figures (Figs. 1-17); candidates.json is empty.
- Key figures (all manual): f01 Fig. 16 cross_section (TEM 400 nm equal PAD); f02 Fig. 2 stack_schematic; f03 Fig. 4 process_flow; f04 Fig. 11 electrical_plot; f05 Fig. 13 electrical_plot; f06 Fig. 14 reliability_plot.
- TVs: a = W2W HB wafer pair (300 mm), with pitches 400/450/500/700 nm and equal/unequal PAD as interconnect rows (same wafers); b = SiCN/SiCN and c = SiO2/SiO2 bonded coupons for nanoindentation bond strength.
- Read-off values (approx): Fig. 10 Kelvin medians (+/-0.1 Ohm), Fig. 14 10-year crossings (equal ~120 nm, unequal ~164 nm, +/-5 nm), Fig. 5/6 bond strength (+/-0.02 mN/um2), Fig. 3 pad CDs.
- Conflicts logged: overlay "below 150 nm" vs Fig. 9 colour scale to 153.8 nm; "reliable above 140 nm" vs equal-pad fit ~120 nm; Fig. 6 caption 200 C anneal (0.82) vs Fig. 5 values at 200 C (0.43-0.53); Fig. 16 CD 226 vs Fig. 3 ~225 nm.
- Post-bond anneal: text gives 250 C (bond strength) and 350 C (Cu bulge-out, ref [7]) rationale; entered as one stated step (250 C) with a note, anneal_temp_c left empty on interconnects because the anneal applied to the TV is not explicit.
- Fig. 2 bottom-panel labels ("Equal pads size" / "Small on large pad size") appear swapped relative to the column headings (noted on f02).
- Not reported: thinning thickness, SiCN thickness, TSV dimensions, bonding conditions, EM stress conditions, pad CD for most pitches.

## Key-figure notes
- 16 figures: 10 candidate (00012: 6, 00140: 4), 6 manual (iedm: no candidates detected on OCR pages).
- iedm manual crops needed one adjustment each for Fig. 2 (caption sliver), Fig. 4 (right text clipped) and Fig. 14 (y-axis label).
