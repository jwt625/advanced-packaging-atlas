# Batch b031 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b031` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| icep58572.2023.10129695 | distilled | 5 | 1 | 13 | 5 | 21 | 0 | 0 | 5 | 6 | yes |
| ectc51846.2026.00016 | distilled | 6 | 21 | 17 | 6 | 15 | 5 | 4 | 13 | 6 | yes |
| ectc51846.2026.00110 | distilled | 5 | 0 | 10 | 2 | 7 | 0 | 1 | 21 | 6 | yes |

## icep58572.2023.10129695 (Taiyo Ink photo-imageable interlayer film)
- Figures opened: page_01, page_02; 300 dpi re-crops of Table I, Fig. 2 (B-HAST), Fig. 4, Fig. 5; candidates p01_fig1, p02_fig2, p02_fig2_2, p02_fig3, p02_fig4.
- Key figures: f01 Fig. 4 stack_schematic (candidate p02_fig4); f02 Fig. 5 cross_section (manual, no candidate); f03 Fig. 3 package_photo (candidate p02_fig3); f04 Fig. 1 micrograph (candidate p01_fig1); f05 Fig. 2 micrograph (candidate p02_fig2); f06 "Fig. 2 (B-HAST)" reliability_plot (candidate p02_fig2_2).
- TVs: a 10 um film via coupon (8/10 um vias); b multi-thickness via coupon (30 um/50 um and 15 um/15 um, one exposure); c SAP Cu comb L/S 12/13 um B-HAST coupon; d 3-layer RDL on 8 inch Si wafer (L/S 2/2 um); e electroless Cu adhesion samples (splits as process_steps alternatives, qualitative results).
- Judgment calls: buckets extended with organic_rdl_fanout (3-layer RDL on Si wafer). package_class other for all TVs (material coupons; RDL on Si without package assembly). The RDL third layer is entered from the Fig. 4 schematic only; text describes two lamination cycles. Cure 150 C (Sec. II) recorded only for the property/via flow, not for RDL steps. 8 inch wafer kept as written (carrier_format wafer_200mm, carrier_size_mm empty).
- Table I values are targets/comparisons; only the film targets went into layer properties; conventional-material numbers excluded. Table I cure target ">180 C" contradicts the low-cure claim (logged as conflict, not entered).
- Not reported: film trade name, measured Dk/Df/Tg, coupon substrates, layer 2/3 thickness, RDL via size, exposure/cure details, warpage value, sample counts.
- Source: two captions numbered Fig. 2; second labelled "Fig. 2 (B-HAST)" in figures.label with a note.

## ectc51846.2026.00016 (A*STAR IME PIC-in-mold CPO platform)
- Figures opened: page_02-06 renders; 400 dpi re-crops of Fig. 1, 2, 3, 4; candidates p02_fig1, p02_fig2, p03_fig3, p03_fig4, p04_fig6, p06_fig11.
- Key figures: f01 Fig. 2 cross_section (manual); f02 Fig. 1 stack_schematic (manual); f03 Fig. 3 stack_schematic (manual); f04 Fig. 4 electrical_plot (manual); f05 Fig. 6 simulation_result (candidate p04_fig6); f06 Fig. 11 optical_plot (candidate p06_fig11).
- TVs: a package platform (79x52 mm RDL-first molded interposer, 300 mm carrier, FS 2L / BS 4L RDL, TMIs, embedded 4L Si bridge with TSVs, embedded PIC; cpo_module); b FOWLP frontside CPWG coupon (5/8 um LW as two EI rows); c Si-bridge CPWG coupon (25 um LW); d simulation_model (HFSS channels, Ansys FEA warpage with/without stainless stiffener, thermal with VC/heat sink/TIM); e EC-to-FAU adhesive-index sub-assembly; f lens-assisted expanded-beam sub-assembly.
- Judgment calls: all warpage/thermal/SI-prediction values on TV d with basis simulated; measured CPWG IL at 65 GHz on b/c. 125 um microbump pitch (from the TIA-xPU HFSS model) entered on TV a as design_target. Fig. 3 gap labels (7.5/10/18/16/21 um) not assigned to S-S vs S-G spacing (space_um empty, labels in notes). Process flow (15 steps) from Sec. III plus FAU attach from Sec. VI; carrier release not stated, not added. Chiplets marked is_emulator yes per Sec. II ("representative chiplets").
- Not reported: die sizes/counts, substrate, TMI/TSV/bump dims except 125 um, bonding conditions, materials by product, wavelength, measured warpage/thermal, reliability.
- Candidate quality: 4 of 6 chosen candidates clipped the bottom (Fig. 1 bumps, Fig. 2 scale bar, Fig. 3 panels d/e, Fig. 4 axis label).

## ectc51846.2026.00110 (DNP polymer waveguides on glass)
- Figures opened: page_01-05; 400 dpi re-crop of Fig. 7; candidates p02_fig2, p02_fig3, p03_fig4, p03_fig5, p04_fig6, p04_fig7.
- Key figures: f01 Fig. 2 cross_section (candidate p02_fig2); f02 Fig. 6 process_flow (candidate p04_fig6); f03 Fig. 4 top_view_layout (candidate p03_fig4); f04 Fig. 5 optical_plot (candidate p03_fig5); f05 Fig. 7 reliability_plot (candidate p04_fig7); f06 Fig. 3 simulation_result (candidate p02_fig3).
- TVs: a 3 um / 10 um pitch imprinted waveguides on glass; b crosstalk samples (5-125 um pitch, Delta 0.4/1.3/2.3% as variants, 1310 nm SMF); c <1 um material film on Si for HTS/THS; d BPM simulation model; e proposed trench-imprint + squeegee core-fill flow (tv_kind other, not built).
- Judgment calls: has_process_flow yes on the Fig. 6 ordered flow (proposed) plus the imprint step for a/b; TV e steps carry "proposed" note. package_class glass_core_substrate for a/b/e (coupons, no electrical build-up). Glass substrate for b taken from the conclusion. Polymer waveguide arrays entered as interconnects level optical / ic_type other (pitch). THS 500 h Delta (~3.0%) and HTS/THS core/clad indices read off Fig. 7 (approx). THS test_standard entered as the cited bias-life standard title; bias not stated.
- Not reported: glass type/thickness, core height, cladding of fabricated samples, residual layer thickness, propagation/coupling loss, resin products, sample counts.
- Source: Fig. 8 caption duplicates Fig. 7 caption although it plots bending loss vs Delta.

## Schema gaps / friction
- No figure-level way to mark duplicate printed labels (two "Fig. 2" in icep paper); used a suffix in label.
- No column for optical crosstalk or alignment tolerance in optical_interfaces; both went to metrics.
- No ic_type for polymer optical waveguide arrays (used level optical + ic_type other).
- CPWG gap dimensions (signal-ground vs signal-signal) have no dedicated columns beyond space_um.
