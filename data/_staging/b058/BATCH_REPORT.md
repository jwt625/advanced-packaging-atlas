# Batch b058 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b058` -> `0 errors, 0 warnings (data/_staging/b058)`

## ectc51846.2026.00227 - Fluxless TCB with in-situ atmospheric pressure plasma, 25 um pitch microbumps (IBM / ASMPT)
- Status: distilled. has_process_flow: yes. primary_bucket microbump_3d (as batch file).
- Rows: papers 1, test_vehicles 3, components 6, stack_layers 13, interconnects 4, process_steps 16, electrical_interfaces 0, optical_interfaces 0, metrics 11, figures 6.
- TVs: (a) 3D stack: 6.4x3.7 mm 775 um logic die / 100 um TSV Si interposer / 21x21x0.8 mm laminate, 150 um pitch C4 at both levels; (b) 25 um pitch Cu/Ni/Cu/SnAg microbump chip-to-chip (300 mm short-loop wafers); (c) Cu-oxide coupon for AOR verification.
- Figures opened: page_03, page_04, page_05; cand p03_fig3, p03_fig4, p03_fig5, p05_fig12, p05_fig13, p05_fig16.
- Key figures (all candidate): f01 Fig. 16 cross_section; f02 Fig. 3 stack_schematic; f03 Fig. 13 cross_section; f04 Fig. 12 process_flow (bonding profile); f05 Fig. 4 micrograph; f06 Fig. 5 other (oxide thickness).
- Judgment calls: TV a package_class si_interposer_2p5d (authors call it a 3D stack; one die on TSV Si interposer on laminate). TV b component_type other (short-loop bumped dies, not called dummy). Interposer bump height 75 um entered as height_um with solder 55 um as cap_height_um (paper gives total height). Laminate C4 count 943 = 41 x 23 (derived). Bump diameter 12 um from SEM label (measured). Fig. 7 oxygen wt% read from bars (approx). Underfill step position inferred from fillet.
- Conflicts: thermal cycling range -40/125 C (Sec. III.C, entered) vs -50/125 C (abstract).
- Not reported: numeric TCB temperature/force/time, AOR time and scan speeds, plasma power/flow, interposer x/y, TSV dimensions, laminate layers, underfill product, 25 um TV die size/bump height/count, electrical data, TC sample count.
- Source: fine. Fig. 16 caption order differs from panel labels; text cites Fig. 12 for IMC (shown in Fig. 13). Fig. 1 reprinted from ref [4], not used.

## ectc51529.2024.00087 - Panel-level CMP for heterogeneous integration (Intel)
- Status: distilled. has_process_flow: yes. primary_bucket panel (as batch file).
- Rows: papers 1, test_vehicles 2, components 3, stack_layers 3, interconnects 1, process_steps 7, electrical_interfaces 0, optical_interfaces 0, metrics 11, figures 6.
- TVs: (a) 510x515 mm organic substrate panel with blanket laminated/cured dielectric; (b) 510x515 mm embedded bridge die substrate TV (Cu via reveal).
- Figures opened: page_02, page_03, page_04; cand p02_fig2, p02_fig3, p03_fig4, p03_fig5, p04_fig6, p04_fig7; 300 dpi re-crop of Fig. 4(a).
- Key figures (all candidate): f01 Fig. 7 package_photo; f02 Fig. 2 other (CMP tool schematic); f03 Fig. 3 other (MRR vs P, Vr); f04 Fig. 4 other (WIPNU); f05 Fig. 6 other (TTV); f06 Fig. 5 other (slurry).
- Judgment calls: almost all data normalized; entered text ratios (MRR range >4x, WIPNU >4x, conditioning >2x / 1.4x / 1.6x, TTV ~2-3x, R^2 0.95, ~10% WIPNU target) plus Fig. 4(a) WIPNU extremes (~19.6% and ~4.2%, absolute % axis). TV b package_class si_bridge_organic inferred from "embedded bridge dies". Revealed Cu feature entered as ic_type other (text "Cu vias", caption "Cu pillars").
- Not reported: dielectric material and thickness, absolute MRR/P/V/flow/time, consumable products, absolute TTV, Cu via dimensions, bridge count/size/material, reliability.
- Source: equations garbled in text.md (read from renders). Fig. 1 reprinted from ref [1], not used.

## ectc51846.2026.00183 - 0.4 um pitch 50M-link Cu-Cu W2W connections (Sony)
- Status: distilled. has_process_flow: yes. primary_bucket hybrid_bonding (as batch file).
- Rows: papers 1, test_vehicles 1, components 2, stack_layers 6, interconnects 3, process_steps 8, electrical_interfaces 0, optical_interfaces 0, metrics 64, figures 6.
- TV: (a) W2W Cu-Cu hybrid bonding daisy-chain test module, 500K-50M links at 0.8/0.6/0.4 um pitch (0.4/0.3/0.2 um pads), SiO2, Ta barrier, 400 C anneal. Pitch variants are interconnect rows; process splits (conventional, improved CMP, improved CMP + wet) are metrics.variant.
- Figures opened: page_02 to page_06; cand p02_fig3, p02_fig4, p03_fig5, p04_fig8, p05_fig10, p06_fig14; 250 dpi re-crops of Fig. 10(a)-(c); manual re-crop of Fig. 14.
- Key figures: f01 Fig. 8 cross_section (candidate); f02 Fig. 3 process_flow (candidate); f03 Fig. 4 stack_schematic (candidate); f04 Fig. 10 electrical_plot (candidate); f05 Fig. 5 other (candidate); f06 Fig. 14 reliability_plot (manual, 6:0.09,0.632,0.48,0.835; candidate included Fig. 13 caption line).
- Judgment calls: one TV (one bonded wafer-pair test module). All 54 Fig. 10 yield points entered (3 pitches x 3 processes x 6 chain lengths, +/-2%). interconnects.yield_pct = 50M-link yield of the combined process. count = 50,000,000 (longest chain). alignment_um 0.1 (le) from "<=100 nm in 93% of cases". EM >10 years entered as derived (extrapolated).
- Conflicts: 0.8 um 50M yield abstract 100% / text "nearly 100%" vs Fig. 10(a) ~96 (entered 96); 0.4 um improved CMP 50M text "nearly 0%" vs Fig. ~8 (entered 8); 0.8 um improved CMP 50M text ~75% vs Fig. ~73.
- Not reported: wafer size, layer thicknesses, absolute recess, CMP/wet/bond conditions, anneal time, per-link resistance, EM stress conditions, sample counts.
- Source: Fig. 11 caption title says 0.8 um but covers all three pitches. Figs. 1, 2 and 12 come from cited work (refs [8]-[12], [18]); excluded.

## Schema gaps
- No figure_kind for process-parameter plots (MRR, WIPNU, recess, oxide thickness); used `other`.
- No metric_category for surface chemistry or oxide state (oxide thickness, EDX oxygen, wettability); used `other`.
- interconnects.height_um is "Cu part if a cap is given", but the paper gives only total bump height plus solder thickness; entered total height with a note.
- No per-variant columns on interconnects for process splits (yield by process); split data sit in metrics.
