# Batch b064 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b064` -> `0 errors, 0 warnings (data/_staging/b064)`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| estc60143.2024.10712070 | distilled | 3 | 3 | 9 | 3 | 36 | 0 | 0 | 21 | 6 | yes |
| ectc51687.2025.00095 | distilled | 2 | 8 | 13 | 8 | 26 | 0 | 0 | 19 | 6 | yes |
| ectc51529.2024.00076 | distilled | 2 | 2 | 13 | 2 | 20 | 0 | 0 | 13 | 6 | yes |

## estc60143.2024.10712070 (Fraunhofer IZM-ASSID, 6 um microbumps, sidewall loss)
- Figures opened: page_02, page_03, page_04 renders; candidates p02_fig2, p02_fig3, p03_tableiii, p04_fig6, p05_tableiv, p05_fig10.
- Key figures: f01 Fig. 6 cross_section (candidate p04_fig6); f02 Fig. 2 process_flow (candidate p02_fig2); f03 Fig. 3 stack_schematic (candidate p02_fig3); f04 Table IV data_table (candidate p05_tableiv); f05 Table III data_table (candidate p03_tableiii); f06 Fig. 10 cross_section (candidate p05_fig10).
- TVs: one per DOE variant (Reference Ti/Cu 50/100 nm with Cu/Ni/SnAg; Test 1 20/50 nm and Test 2 20/30 nm with Cu/SnAg). Seed thickness and the Ni layer change the stack, so these are separate TVs, not variants.
- Judgment calls: the bumps are not bonded, so interconnect level is `unspecified` and bonding_method `none`. The applied wet etch times (Table III) go in process_steps.time_s as design_target, with the baseline times in conditions. The Table IV ranges are entered as min/max metric rows (approx). The authors' reduction ranges (55-135, 30-95, 85-230 nm) are entered as derived value_text rows with reference_tv_id. The 0.6-1.0 um bump height variation is stated once for all variants and is repeated per TV.
- Conflicts logged: Discussion says "closer to half millimeter" for thick layers (Table IV value used). Discussion range 55-230 nm vs Results 85-230 nm.
- Not reported: bump height target, plating thicknesses and chemistry, SiO2 thickness, wafer bulk material, resist, sputter tool, shear strength (future work), yield.
- Source: Fig. 5 and Fig. 8 are split across pages, and their candidates hold only part of each.

## ectc51687.2025.00095 (ASE, FOPLP 300 mm panel)
- Figures opened: page_02, page_03, page_04 renders; candidates p02_tablei, p02_fig1, p03_tableiii, p03_tablev, p03_fig2, p04_fig5, p04_fig6; manual re-crops of Fig. 1 (p.2) and Fig. 2 (p.3).
- Key figures: f01 Fig. 5 cross_section (candidate p04_fig5); f02 Fig. 6 cross_section (candidate p04_fig6); f03 Fig. 1 process_flow (manual, reprinted yes: text cites [2]); f04 Table III data_table (candidate p03_tableiii); f05 Fig. 2 cross_section (manual); f06 Table I data_table (candidate p02_tablei, paper-level).
- TVs: a = TV-1, FOCoS Bridge 3x reticle chip module (si_bridge_fanout); b = TV-2, FOCoS Chip Last package (fan_out_panel). primary_bucket stays panel. buckets now include si_bridge (TV-1 embeds 10 Si bridges).
- Judgment calls: carrier_size_mm "300" as written ("300mm panel"; the panel shape is not stated). The paper describes LDI in general; I applied it to the TV-1 RDL step, which Sec. IV.C/D tie to LDI. For TV-2 the patterning method is left unstated. Table I DPW/DPP are generic author estimates, attached to TV-1 as cost metrics with a scope note. The Fig. 1 TCB steps are in the TV-1 flow and noted as citing ref [2]. Passivation via landing of 100% goes in rdl_via yield_pct (measured override) and in metrics. Passivation material "PI" comes from the Sec. IV.D heading. Material classes of unnamed passivations are `unspecified`.
- Very few numbers: L/S 8/8 and 5/5 um, layer counts, 3x reticle, tall Cu pillar up to 120 um, 10 um via opening, pass/fail reliability (MR3X/MR6X, MSL3+TCT1000, MSL3+uHAST264, HTST1000 as written). There are no warpage, TTV or TCB condition values.
- Source: the Table VI candidate (p03_tablevi) points at the caption corner, but the table image is at the top of the p.3 right column. Candidates p02_fig1 and p03_fig2 clip the bottom of their figures. Tables VI and VII share the caption "CU REVEAL RESULT".

## ectc51529.2024.00076 (CEA-Leti, Nb-Nb hydrophilic direct bonding)
- Figures opened: page_02, page_03, page_04, page_05 renders; candidates p02_fig1, p03_fig5, p03_fig6, p04_fig8, p05_fig9, p05_fig10; manual re-crop of Fig. 8.
- Key figures: f01 Fig. 9 cross_section (candidate p05_fig9); f02 Fig. 6 process_flow (candidate p03_fig6); f03 Fig. 5 cross_section (candidate p03_fig5); f04 Fig. 10 micrograph (candidate p05_fig10); f05 Fig. 8 xray_csam (manual); f06 Fig. 1 micrograph (candidate p02_fig1).
- TVs: a = full-sheet Nb-Nb W2W bond on 200 mm thermally oxidized Si; b = patterned Nb pads (3 um wide, 7 um pitch, air between pads) on TiN/dielectric, top Si removed.
- Judgment calls: package_class `other` and interconnect level/ic_type/bonding_method `other`, because this is a metal-metal direct bond with no dielectric (not hybrid) and no enum fits (see schema gaps). alignment_um 0.4 is the measured STEM offset (override measured); the tool spec "3-sigma < 1 um" is in the notes. The full-sheet Nb thickness is the TEM ~112 nm (200 nm as deposited). Space 4 um is read from the Fig. 6C label. Gc 1.6 J/m2 is entered as measured, with a derived lower-bound row (> 1.6), because the fracture ran at the Nb/SiO2 interface.
- Not reported: electrical or Tc data (ongoing), patterned-wafer diameter, dielectric thicknesses, pad count, yield.
- Source: candidate p04_fig8 clips the panel bottoms and labels.

## Schema gaps
- interconnect_type / bonding_method have no value for non-Cu metal-metal direct bonding (Nb-Nb hydrophilic direct bond); `cu_cu_direct` and `fusion` do not fit. No level for a blanket (unpatterned) W2W metal bond.
- package_class has no value for wafer-level bumping or bonding test wafers without a package (microbump_3d and other used).
- There is no place for paper-level estimates that are not tied to a TV (e.g. the wafer vs panel utilization table); they are attached to the most relevant TV.
