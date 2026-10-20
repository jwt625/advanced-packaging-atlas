# Batch b080 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b080` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51846.2026.00123 | distilled | 1 | 3 | 10 | 1 | 12 | 0 | 0 | 18 | 5 | yes |
| tcpmt.2026.3708099 | distilled | 4 | 0 | 20 | 4 | 40 | 0 | 0 | 48 | 6 | yes |
| ectc51846.2026.00096 | distilled | 1 | 8 | 8 | 4 | 47 | 0 | 0 | 32 | 6 | yes |

## ectc51846.2026.00123 (Penn State / Georgia Tech / ELSPES, glass-embedded DTC)
- Figures opened: page_02-05, page_07 renders; 400 dpi re-crops of Fig. 2(a)-(e); manual crops of Fig. 6, Table II, Table III; candidates p03_fig2, p03_fig3, p07_tableii, p07_tableiii.
- Key figures: f01 Fig. 2 stack_schematic (candidate p03_fig2); f02 Fig. 3 process_flow (candidate p03_fig3); f03 Fig. 6 electrical_plot (manual, no candidate); f04 Table III data_table (manual); f05 Table II data_table (manual). Table candidates clip the last row.
- One TV (test coupon, glass_embedded_die): 2.8 uF 55-terminal DTC (200 um + 10 um pads) in 200 um blind cavity of 300 um glass; ABF 30 um / Cu#1 6 um / ABF 15 um / Cu#2 6 um; stacked microvias, 57 um vertical height, 200 um pad pitch.
- Process flow (12 steps) from Fig. 3 plus Sec. II text (DAF lamination/cure, pick-and-place, vacuum lamination split out of Fig. 3 step 2).
- Metrics: ESR 2 mOhm / SRF 140 MHz (2-port shunt) vs 11 mOhm / 20 MHz (1-port); ESL 0.143 pH vs 11.2 pH; Im(Z) at 9 GHz before/after de-embedding; placement offset < 5 um; surface step < 5 um; four Fig. 2(e) optical dimensions.
- Judgment calls: PDN results in metrics (power_delivery), no electrical_interfaces. Fig. 2(e) caption names 3 quantities for 4 annotations, so the 4 values are entered without assignment. Die thickness 200 um (text/caption/schematic) chosen over abstract 210 um (logged). Fig. 5(d) model curves excluded (illustrative, accuracy windows from ref [23]). Supplier AGC (glass) and Ajinomoto (ABF) from ack/text; DTC supplier not stated (ELSPES co-authors only).
- Not reported: die/cavity x-y, via diameters/count, lamination/cure conditions, lateral impedances, reliability.

## tcpmt.2026.3708099 (CAEP, ultradeep 300 x 70 um Cu TSVs)
- Figures opened: page_02-05 renders; 450 dpi re-crops of Fig. 2(b), Fig. 4, Fig. 6, Fig. 9; 600 dpi crop of Fig. 7 labels; manual crop of Table I; candidates p03_fig2, p03_fig4, p04_fig6, p05_fig9, p05_fig10.
- Key figures: f01 Fig. 2 cross_section (candidate p03_fig2); f02 Table I data_table (manual, no candidate); f03 Fig. 4 mechanical_plot (candidate p03_fig4); f04 Fig. 6 mechanical_plot (candidate p04_fig6); f05 Fig. 9 mechanical_plot (candidate p05_fig9); f06 Fig. 10 micrograph (candidate p05_fig10).
- TVs: 4 wafer-level builds = {0.4 ASD voided fill, 0.5 ASD solid fill} x {blind in 500 um Si, thinned to 300 um through-via}. Anneal (none/200/300 C) is a metrics variant. package_class other (TSV test wafers for a Si-based embedded fan-out SiP interposer).
- Process flow (10 steps per TV) from Sec. II: Bosch DRIE conditions, 1 um thermal SiO2, 1 um Ti / 2 um Cu PEPVD, DVF 200 bath plating 10 h at 23 C, mechanical Cu removal, CMP (A21/IC1000), 10% HF Ti strip, backside thinning (performed=no on blind TVs), anneal 1 C/min, 3 h dwell.
- Metrics: Cu protrusion per Fig. 4 bar labels (thinned bars split top/bottom); average Raman Si stress (Fig. 6, +/-2 MPa); EBSD grain size (Fig. 9, +/-0.03 um); FEM max deformation labels (simulated); 0.4 ASD cross-section geometry (306/73/185/26 um); fill and void observations; cracking vs anneal ramp.
- Judgment calls: Fig. 4 legend does not name the thinned samples; stacked top/bottom bars mapped to thinned TVs (only through vias have a bottom end; consistent with text). Fig. 7 'max' quantity unnamed in the figure; entered as max deformation (simulated) with note. Stress sign convention not stated.
- Not reported: TSV count, tools, electrical/EM/TC reliability (future work), sample counts.

## ectc51846.2026.00096 (IME A*STAR, two stacked chips with backside two-phase cooling)
- Figures opened: page_01-06 renders; 400-450 dpi re-crops of Fig. 3, Fig. 12 (p.4 steps 1-6, p.5 steps 7-14), Fig. 16; manual crops of Fig. 1, Fig. 2(a)-(f); candidates p01_fig1, p02_fig3, p03_table2, p05_fig12, p06_fig16.
- Key figures: f01 Fig. 1 stack_schematic (manual; candidate included body text); f02 Fig. 2 process_flow (manual, panels (a)-(f); (g) excluded, no candidate); f03 Fig. 12 process_flow (candidate p05_fig12; steps 1-6 on p.4 not in bbox); f04 Table 2 data_table (candidate p03_table2); f05 Fig. 3 micrograph (manual; candidate included text); f06 Fig. 16 thermal_plot (candidate p06_fig16).
- One TV (package, class other): cap chip + chip-2 + chip-1 (10x10x0.3 mm thermal test chips, Ti heater + 2 RTDs, 8x8 mm x 250 um microchannel with 100 um pin fins at 150 um staggered pitch, 30x300 um via-first TSVs in chip-1) solder-stacked on PCB with 3D-printed 316L manifold.
- Process flow 47 steps: TSV (Sec. III), frontside (Sec. IV), backside on Si carrier (Sec. V), assembly steps 1-14 of Fig. 12 (NCP cap bond 130 C 15 min; SnAg3.5 200 um balls, Indium NC-506 flux 50 um, 5 N, 245 C peak; U8410-406 underfill at 80 C), resistance test, manifold mount.
- Metrics: 157 W (chip-1) and 187 W (chip-2) at 699 mL/min, 344 W/cm2 total (text); Fig. 16 heat flux vs flowrate for chip-1/chip-2/total (pixel-centroid read); TSV SEM 30.5/27.4/297 um; Table 2 line widths, PSPI opening/thickness, UBM thickness with spec limits; carrier warpage glass 500 um vs Si < 200 um.
- Conflicts: abstract gives 157/187 W/cm2 heat flux while body text gives W power and Fig. 16 plots W/mm2 (~1.67/2.01 at 0.7 L/min); heat-flux area not given, so text W values and Fig. 16 points entered separately. Fig. 2(e) lists laser debonding although the Si carrier was selected.
- Layer seq orientation: seq 1 = chip backside (microchannel side faces up in the stack, Fig. 2(f)); layers apply to both chips (TSVs only in chip-1).
- Not reported: cap material/size, ball pitch/count, chip temperatures, pressure drop, thermal resistance, oxide thicknesses, reliability.

## Key-figure notes
- 17 key figures: 10 candidate, 7 manual. Manual reasons: tables with clipped last row (00123 Tables II/III), candidates including body text (00096 Fig. 1, Fig. 3), no candidate (00123 Fig. 6, tcpmt Table I as image, 00096 Fig. 2 split over columns).
- Re-crops and grid renders are in the session scratch folder only.

## Schema gaps
- No package_class for bare TSV test wafers (used `other`) or for a 3D stack with embedded microfluidic cooling (used `other`).
- No component_type for a cap/sealing die or a coolant manifold (used `other`).
- Figure split across pages (00096 Fig. 12) can carry only one page/bbox.
