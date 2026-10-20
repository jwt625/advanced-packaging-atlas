# Batch b047 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b047` -> `0 errors, 0 warnings (data/_staging/b047)`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures (manual) | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tcpmt.2021.3123384 | distilled | 7 | 12 | 33 | 12 | 59 | 0 | 0 | 44 | 6 (1) | yes |
| ectc51846.2026.00336 | distilled | 2 | 0 | 8 | 6 | 34 | 0 | 0 | 18 | 6 (2) | yes |
| ectc51687.2025.00014 | distilled | 2 | 8 | 6 | 2 | 12 | 0 | 1 | 11 | 6 (2) | yes |

## tcpmt.2021.3123384 (Fraunhofer IZM, TSiCV / SiC interposer, TCPMT 2022)
- Figures opened: page_05-09 renders; candidates p02_fig2, p03_fig3, p03_fig4, p04_tablei, p04_fig5, p04_fig6, p07_fig13, p08_fig16, p09_fig19; manual re-crops of Table III (p.5) and Table IV (p.6).
- Key figures: f01 Fig. 16 cross_section (candidate p08_fig16); f02 Fig. 2 process_flow (candidate p02_fig2); f03 Fig. 19 process_flow (candidate p09_fig19); f04 Fig. 13 xray_csam (candidate p07_fig13); f05 Fig. 3 other/etch-rate plot (candidate p03_fig3); f06 Table IV data_table (manual).
- TVs: (a) via-etch coupons, (b) deep-etch MEMS coupons, (c) TSiCV interposer with PECVD liner, (d) TSiCV interposer with BCB dry-film liner, (e) planar SiC chips flip-chip on interposer, (f) deep-etched MEMS die flip-chip on interposer, (g) SiC pressure sensor on interposer via Au stud bump TCB.
- Judgment calls: SiC interposer -> package_class `other` and ic_type `tsv` (no SiC enums; noted). PECVD vs BCB liners split into separate TVs (different stack); liner type of the interposer used in assemblies e/f/g not stated. Ni vs Cu mask and via diameters 40/80/120 um kept as variants / separate ic rows. Chip thickness 40 vs 100 um kept in one TV (Fig. 16 shows 100 um). "Chip gap ~30 um" entered as written (standoff vs die gap unclear). TSiCV resistance ~1 ohm entered as derived (authors' 1.96 ohm / two vias). Table IV model values entered as simulated, measured as measured; Table IV "Max" column (difference) not entered.
- Not reported: via pitch/count (except 36-via array), PECVD liner material/thickness, solder alloy, bonding conditions, die/interposer x-y sizes, reliability.
- Source: Table III candidate cut after 2 of 5 rows; Table IV candidate title only; Table II no candidate. Fig. 3 caption says 80 um but plot shows all three diameters (logged).

## ectc51846.2026.00336 (imec BSPDN connection schemes, ECTC 2026)
- Figures opened: page_02-05 renders; 300 dpi re-crops of Fig. 2(a) and 2(b),(c); candidates p02_tableii, p03_fig1, p03_fig2, p04_fig3; manual re-crops Fig. 1 and Fig. 5.
- Key figures: f01 Fig. 1 cross_section (manual); f02 Table II process_flow (candidate p02_tableii); f03 Fig. 2 electrical_plot (candidate p03_fig2); f04 Fig. 5 thermal_plot (manual); f05 Table I stack_schematic (candidate p02_tablei); f06 Fig. 3 electrical_plot (candidate p04_fig3).
- TVs: (a) TDV-BPR-nTSV scheme with ~250 nm remaining Si; (b) TDV-only scheme, no remaining Si. Both wafer_level, package_class `other`.
- Judgment calls: TDV-scheme thinning approaches #1 and #2 recorded as two flows under TV b because the paper does not say which approach the measured samples used. Mo vs TiN/W fill as separate interconnect rows / variants. Median TDV resistances read off the Weibull plot (+/-2 ohm, approx). Heating rate for TV a: Fig. 5 measured bar ~60 K/mW entered; abstract says 50 K/mW (conflict logged). Nanometre dimensions converted to um (logged).
- Not reported: wafer size, pitches, M0/BSM materials, bonding stack and carrier bonding, reliability. Detailed flows deferred to refs [10], [11]; TDV daisy-chain yield >90% attributed to [11] excluded.
- Source: text layer clips Fig. 4/5 captions; Fig. 5 has no candidate; Fig. 1 candidate clipped bottom scale bars.

## ectc51687.2025.00014 (Sumitomo Electric VCBEL glass PIC platform, ECTC 2025)
- Figures opened: page_02-05 renders; candidates p02_fig3, p03_fig4, p04_fig6, p04_fig7, p04_fig8; manual re-crops Fig. 3 and Fig. 5.
- Key figures: f01 Fig. 5 micrograph (manual); f02 Fig. 3 stack_schematic (manual); f03 Fig. 4 package_photo (candidate p03_fig4); f04 Fig. 8 optical_plot (candidate p04_fig8); f05 Fig. 7 optical_plot (candidate p04_fig7); f06 Fig. 6 simulation_result (candidate p04_fig6).
- TVs: (a) optical switch module (MZI PIC flip-chip TCB on glass with fs-laser waveguides and 3D-printed VCBELs); (b) FDTD roughness model (simulation_model).
- Judgment calls: package_class `photonic_interposer` for the glass substrate carrying waveguides and wiring; stud bump ic_type `other` (no stud-bump enum); alignment `passive` (flip-chip bonder placement only). Coupling loss entered as positive 1.6 dB. Fig. 1/2 ASIC-on-glass-on-organic platform treated as concept (not a TV). Sidefill step placed after bonding; its flow position is not stated.
- Not reported: dimensions of PIC, glass and module; glass type/thickness; bump metal, pitch, count; channel count, fiber pitch; reliability beyond 300 C TCB survival.

## Schema gaps
- No SiC material class / package class / via type (TSiCV entered as `tsv`, SiC as `ceramic`, package `other`).
- No `stud_bump` interconnect_type (Au stud bump TCB entered as `other`).
- No BSPDN / backside-power package_class or `buried_power_rail` interconnect type (entered as `other`).
- optical_interfaces has `mfd_fiber_um` only; no field for the MFD of an on-substrate glass waveguide (put in notes).
