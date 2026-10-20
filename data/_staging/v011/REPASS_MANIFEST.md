# Targeted process-flow fix manifest v011 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51687.2025.00326
- [target_missing] ectc51687.2025.00326-b-L04: stack_layers.thickness_um 0.175 (interposer_rdl seed (seed)) of TV b appears in no step target/conditions/split/thickness of flows ectc51687.2025.00326-F1 (source: script)

## ectc51687.2025.00359
- [category_other] ectc51687.2025.00359-F1-s04: 'peel off PET film (after dry desmear)': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51687.2025.00359-F1-s08: 'peel off PET film before ablation': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51687.2025.00359-F3-s02: 'peel off PET film before ablation': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51687.2025.00359-F3-s05: 'peel off PET film after ablation': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [build_seq_unverified] ectc51687.2025.00359-a: TV in 2 tv_build flows (ectc51687.2025.00359-F1, ectc51687.2025.00359-F3); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] ectc51687.2025.00359-a-L01: stack_layers.thickness_um 38 (coupon PET cover film (sacrificial) (other)) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025.00359-F1, ectc51687.2025.00359-F3 (source: script)

## ectc51687.2025.00378
- [full_without_typed_condition] ectc51687.2025.00378: process_flow_level full but no step has a typed process condition (temp_c, temp_c_max, time_s, ramp_c_per_min, pressure_mpa, force_n, atmosphere, dose_mj_cm2, current_density_ma_cm2) (source: validator)
- [build_seq_unverified] ectc51687.2025.00378-a: TV in 2 tv_build flows (ectc51687.2025.00378-F1, ectc51687.2025.00378-F2); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] ectc51687.2025.00378-a-L02: stack_layers.thickness_um 0.25 (substrate_buildup Cu seed (seed)) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025.00378-F1, ectc51687.2025.00378-F2 (source: script)
- [target_missing] ectc51687.2025.00378-a-L03: stack_layers.thickness_um 0.05 (substrate_buildup Ti seed (adhesion)) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025.00378-F1, ectc51687.2025.00378-F2 (source: script)
- [target_missing_preexisting] ectc51687.2025.00378-a-L07: stack_layers.thickness_um 400 (glass_core glass core (core)) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025.00378-F1, ectc51687.2025.00378-F2 (source: script)

## ectc51846.2026.00012
- [category_other] ectc51846.2026.00012-F1-s05: 'load on flat, convex/concave stage (membrane) or vacuum chuc': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [untyped_condition] ectc51846.2026.00012-F1-s05: pressure_mpa empty but conditions has 'ambient 8.0 bar; chu' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [category_other] ectc51846.2026.00012-F1-s07: 'after 10 min stabilization, pressurize sealed membrane (0.4 ': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51846.2026.00012-F1-s09: 'cool to room temperature under constraint, then release memb': keyword proposal profile fragment: merge into the parent step's conditions (source: script)
- [untyped_condition] ectc51846.2026.00012-F1-s09: temp_c/temp_c_max empty but conditions has 'r cool from ~190 C at ~' (type it if single-valued and stated; ranges stay in conditions) | time_s empty but conditions has 'm ~190 C at ~160 min to 5' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [category_other] ectc51846.2026.00012-F2-s05: 'load on flat, convex/concave stage (membrane) or vacuum chuc': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51846.2026.00012-F2-s07: 'after 10 min stabilization, pressurize sealed membrane (0.4 ': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51846.2026.00012-F2-s09: 'cool to room temperature under constraint, then release memb': proposed merge into the parent step's conditions (cool / release) (source: audit_B)
- [untyped_condition] ectc51846.2026.00012-F2-s09: temp_c/temp_c_max empty but conditions has 'r cool from ~190 C at ~' (type it if single-valued and stated; ranges stay in conditions) | time_s empty but conditions has 'm ~190 C at ~160 min to 5' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [category_other] ectc51846.2026.00012-F3-s02: 'via formation': keyword proposal tsv_tgv_formation or etch_dry/etch_wet (via formation) (source: script)
- [category_other] ectc51846.2026.00012-F3-s05: 'load on flat, convex/concave stage (membrane) or vacuum chuc': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51846.2026.00012-F3-s07: 'after 10 min stabilization, pressurize sealed membrane (0.4 ': proposed lamination (membrane pressurize) (source: audit_B)
- [untyped_condition] ectc51846.2026.00012-F3-s07: pressure_mpa empty but conditions has 'membrane 0.4 bar abov' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [category_other] ectc51846.2026.00012-F3-s09: 'cool to room temperature under constraint, then release memb': keyword proposal profile fragment: merge into the parent step's conditions (source: script)
- [untyped_condition] ectc51846.2026.00012-F3-s09: temp_c/temp_c_max empty but conditions has 'r cool from ~190 C at ~' (type it if single-valued and stated; ranges stay in conditions) | time_s empty but conditions has 'm ~190 C at ~160 min to 5' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [target_missing_preexisting] ectc51846.2026.00012-c-L03: stack_layers.thickness_um 2000 (substrate_core glass-reinforced epoxy core (core)) of TV c appears in no step target/conditions/split/thickness of flows ectc51846.2026.00012-F3 (source: script)

## ectc51846.2026.00016
- [category_other] ectc51846.2026.00016-F1-s14: 'expose preserved PIC edge optical I/O regions': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing] ectc51846.2026.00016-a-L07: stack_layers.thickness_um 4 (bridge Si bridge RDL dielectric (dielectric)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00016-F1 (source: script)
- [target_missing] ectc51846.2026.00016-a-i4: interconnects.pitch_um 125 (die_to_interposer microbump) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00016-F1 (source: script)
