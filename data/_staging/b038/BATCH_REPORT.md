# Batch b038 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b038` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51909.2023.00324 | distilled | 1 | 3 | 5 | 0 | 11 | 0 | 2 | 6 | 6 | yes |
| ectc51906.2022.00055 | distilled | 4 | 12 | 16 | 5 | 16 | 0 | 0 | 12 | 6 | yes |
| ectc51909.2023.00178 | distilled | 3 | 8 | 11 | 5 | 14 | 0 | 0 | 19 | 6 | yes |

## ectc51909.2023.00324 (AIST self-aligned connector on polymer-waveguide substrate)
- Source: TEXT_LAYER_WARNING present; text.md is OCR. All numbers checked on `page_0N_220dpi.png` (pages 1-3); page 4 text only (discussion, refs). papers.notes says "OCR text".
- Figures opened: page_01-03 220 dpi renders; candidates p02_fig3, p02_fig4, p02_fig5, p02_fig6; re-crops of Fig. 8 and Fig. 10 (p.3).
- Key figures: f01 Fig. 4 cross_section (candidate p02_fig4); f02 Fig. 3 process_flow (candidate p02_fig3); f03 Fig. 8 micrograph (manual); f04 Fig. 6 micrograph (candidate p02_fig6); f05 Fig. 10 optical_plot (manual); f06 Fig. 5 optical_plot (candidate p02_fig5).
- TV: one sub_assembly (fiber_subassembly): polymer WG on glass-epoxy + molded MT-compatible connector. The AOP substrate concept (Fig. 1, SiPh die embedded) is not what was built here; technology_name "AOP substrate" kept at paper level only.
- Judgment calls: guiding ridge entered as a core-layer feature row (same seq as cores) with measured 6.171 um height / 89.76 um width from Fig. 6. Per-facet SMF loss 0.45 dB (Fig. 5 fit) chosen over the 0.5 dB restatement in Sec. III (conflict logged). Total connector loss ~1.5 dB entered as the authors' derived sum. channels=12 is the MT connector format, not a count of measured channels (noted).
- Not reported: cladding thicknesses, polymer products, substrate size/thickness, MFD, absolute push load (a.u.), sample count, adhesive product.
- Candidate quality: p03_fig8 and p03_fig10 shifted down (cut the figure tops); others fine.

## ectc51906.2022.00055 (KETI Ni-Zn ferrite-core inductors in photosensitive glass)
- Figures opened: page_02-05 renders; 400 dpi re-crops of Fig. 2 and Fig. 4(d); candidates p02_fig2, p02_fig3, p02_fig4, p03_tablei, p04_fig10, p05_fig11; manual re-crops of Fig. 2, 3, 4, 10.
- Key figures: f01 Fig. 11 cross_section (candidate p05_fig11); f02 Fig. 3 process_flow (manual); f03 Fig. 4 micrograph (manual); f04 Table I data_table (candidate p03_tablei); f05 Fig. 10 electrical_plot (manual); f06 Fig. 2 micrograph (manual).
- TVs: a = type 1 inductor coupon, b = type 2 inductor coupon, c = IVR module (TPS62601 over embedded type 1 inductor, 2 MLCCs, 4-layer ABF RDL, 3x2.5 mm layout), d = micro-TGV demo in 240 um glass (Fig. 2).
- Judgment calls: package_class glass_core_substrate (no embedded-passive class); ferrite core as component_type other + cavity layer. Fig. 3 flow entered once on -a (notes say it applies to -b and -c substrate). TV -d steps are the generic Sec. II ranges (UV 250-350 nm, 580-600 C anneal, HF). primary_bucket glass kept; buckets add thermal_pdn (IVR/PDN).
- Conflicts logged: type 2 core length 920 (Table I) vs 840 um (text); type 2 outer 920x1040 (text) vs 920x1050 (abstract); type 2 TGV 25 um (Table I) vs "TGV D = 30um" label in Fig. 4(d) (inductor type not named); IC TPS62601 vs TPS62061 typo; TGV mean 16.8 stated vs 16.66 from the 10 labels.
- Excluded: glass eps_r 5.5 (attributed to ref [12]); ~10 um minimum hole size (ref [11]).
- Not reported: cavity size/gap, TGV counts, ABF thickness, module Cu thickness, IC solder joint size/pitch, reliability.

## ectc51909.2023.00178 (Samsung D2W hybrid Cu bonding, 4 um pitch)
- Figures opened: page_02-05 renders; candidates p02_fig1, p03_fig3, p03_fig4, p04_fig6, p04_fig7, p05_tablei (all usable as-is).
- Key figures: f01 Fig. 1 cross_section (candidate p02_fig1; panel (a) is the process flow); f02 Fig. 6 cross_section (candidate p04_fig6); f03 Table I data_table (candidate p05_tablei); f04 Fig. 7 electrical_plot (candidate p04_fig7); f05 Fig. 4 electrical_plot (candidate p03_fig4); f06 Fig. 3 micrograph (candidate p03_fig3).
- TVs: a = D2W HCB chip (die_stack, 10.4x10.4 mm stated TV size) carrying the key-factor studies and Test1/2/3 splits as metrics.variant; b = large top package; c = small top package (Table I reliability, Test3 condition). HCB interconnect repeated on b/c with design values only; measured alignment/yield on a.
- Judgment calls: Fig. 8 Test1 reliability rows attached to -a (packaged Test1 samples, large/small not stated). Fig. 4 resistances (~83-90 mOhm, two points ~96/101 mOhm) and Fig. 7 CDF extents read off plots as value_text. Pad "2 um" entered as pad_x_um (shape not stated). Dummy dies entered without material (not stated).
- Conflicts logged: Pre-con L3 condition in text (bake 125 C 24 h / 60 C 60% 40 h / reflow) vs Table I (30 C/60% RH 196 h, 260 C reflow 3 cy), table chosen; 98% vs "over 98%"; Eq. (1) 0.027 vs Fig. 2 label 0.0271.
- Not reported: dielectric material, dishing target/measured values, bonding/anneal conditions, wafer size, die sizes and thicknesses, TSV/backside details, BGA pitch, reliability pass criterion.

## Notes
- No electrical_interfaces in the batch (no protocol/data-rate properties reported).
- Figure candidates: 11 of 18 key figures used as candidates, 7 manual.
