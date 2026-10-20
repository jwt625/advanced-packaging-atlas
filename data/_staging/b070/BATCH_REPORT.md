# Batch b070 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b070` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| itherm55375.2024.10709474 | distilled | 2 | 10 | 13 | 2 | 15 | 0 | 0 | 17 | 6 | yes |

## itherm55375.2024.10709474 (IME CAS, SSF manifold embedded cooling)
- Source: 5 pages, clean text layer, full text read (pp. 1-5). primary_bucket thermal_pdn kept.
- Figures opened: page_02, page_03, page_04 renders; candidates p02_fig1, p02_tablei, p03_fig5, p03_fig7, p04_fig9; re-crops of Fig. 1, Fig. 2(a)-(b), Fig. 2(c)-(d), Fig. 5, Fig. 9 (scratch only).
- Key figures: f01 Fig. 1 stack_schematic (manual); f02 Fig. 5 process_flow (manual); f03 Fig. 7 stack_schematic (candidate p03_fig7); f04 Fig. 2(a)-(b) top_view_layout (manual; panels (c)-(d) in the other column, named in notes); f05 Table I data_table (candidate p02_tablei); f06 Fig. 9 thermal_plot (manual). 4 of 6 manual: candidates p02_fig1, p03_fig5, p04_fig9 clip labels; Fig. 2 had no candidate.
- TVs: a = fabricated embedded-cooling TV (Si fin chip 750 um with 400 um SSF fins, Cu-Sn bonded 300 um Si slit wafer, adhesive to manifold, Ti/Cu 18x20 mm heater, PCB probes, Al fixing plate); b = simulation_model of near-chip reference (700 um chip + 100 um TC-5888 TIM at 5.2 W/mK + Si cold plate). Embedded-structure FEA results (16.8 / 12.3 mm2K/W) kept on TV a as simulated metrics (same structure).
- Judgment calls: tv_kind package / package_class other (thermal TV with PCB and fixture, as for the earlier ITherm embedded-cooling TV). Stack seq 1 = heater side (Fig. 7(a) orientation; Fig. 1 is drawn inverted). Flow rate is a metrics.variant split. Extrapolated 60 C heat flux/power (388 W/cm2, 1400 W; 556 W/cm2, 2000 W) and COPs entered as basis derived (paper's own linear extrapolation/calculation), not measured. Cu-Sn wafer bond and probe contact entered as interconnects with level/type other (no pitch or conditions disclosed). Process flow from Fig. 5 (applies to both fin and slit wafers) plus Sec. III steps (lift-off heater, adhesive to manifold, black paint, probe/fixture assembly).
- Conflict: pressure drop at 0.5 L/min 3 kPa (Sec. IV) vs 3.5 kPa (Conclusions); 3 kPa entered (consistent with the stated COP 56000).
- Not reported: wafer size, die outer x/y, bond pad geometry and bonding conditions, layer thicknesses of SiO2/Ti/Cu/Sn, manifold material and dimensions (only an undefined 3.8 mm label in Fig. 2(d)), adhesive product, inlet temperature at 0.5 L/min, sample count, reliability.
- Source note: text says the manifold has 4 inlets and 3 outlets; Fig. 2(d) labels one inlet and one outlet.
