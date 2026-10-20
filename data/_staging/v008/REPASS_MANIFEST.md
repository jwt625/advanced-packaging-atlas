# Targeted process-flow fix manifest v008 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51687.2025.00051
- [category_other] ectc51687.2025.00051-F1-s01: 'HDI substrate build-up to cavity layer': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51687.2025.00051-F1-s08: 'via formation to TSV bridge die pads (direct via interconnec': keyword proposal tsv_tgv_formation or etch_dry/etch_wet (via formation) (source: script)
- [category_other] ectc51687.2025.00051-F2-s01: 'HDI substrate build-up to cavity layer': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51687.2025.00051-F2-s06: 'via formation': proposed laser_drill (source: audit_B)
- [target_missing] ectc51687.2025.00051-a-i1: interconnects.pitch_um 45 (die_to_bridge unspecified) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025.00051-F1 (source: script)
- [target_missing] ectc51687.2025.00051-b-i1: interconnects.pitch_um 45 (die_to_bridge unspecified) of TV b appears in no step target/conditions/split/thickness of flows ectc51687.2025.00051-F2 (source: script)
- [protected] ectc51687.2025.00051-F1-s03 is referenced by config/package3d/emib_t.yaml: keep this step_id
- [protected] ectc51687.2025.00051-F1-s05 is referenced by config/package3d/emib_t.yaml: keep this step_id
- [protected] ectc51687.2025.00051-F1-s06 is referenced by config/package3d/emib_t.yaml: keep this step_id

## ectc51687.2025.00063
- [target_missing] ectc51687.2025.00063-d-L01: stack_layers.line_um 10 (cavity Cu electrode (1 RDL) on cavity floor (conductor)) of TV d appears in no step target/conditions/split/thickness of flows ectc51687.2025.00063-F4 | stack_layers.space_um 10 (cavity Cu electrode (1 RDL) on cavity floor (conductor)) of TV d appears in no step target/condi (source: script)

## ectc51687.2025.00071
- [identical_delta_text] ectc51687.2025.00071-F1-s02: 3 delta rows of ectc51687.2025.00071-F1 have the same step text: ectc51687.2025.00071-F1-s02, ectc51687.2025.00071-F1-s03, ectc51687.2025.00071-F1-s04 (source: validator)
- [identical_delta_text] ectc51687.2025.00071-F1-s10: 2 delta rows of ectc51687.2025.00071-F1 have the same step text: ectc51687.2025.00071-F1-s10, ectc51687.2025.00071-F1-s11 (source: validator)
- [target_missing_preexisting] ectc51687.2025.00071-a-L01: stack_layers.thickness_um 12 (coupon Si substrate with TSV array (core)) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025.00071-F1 (source: script)
- [target_missing_preexisting] ectc51687.2025.00071-b-L01: stack_layers.thickness_um 21 (coupon Si substrate with TSV array (core)) of TV b appears in no step target/conditions/split/thickness of flows ectc51687.2025.00071-F1 (source: script)
- [target_missing_preexisting] ectc51687.2025.00071-c-L01: stack_layers.thickness_um 30 (coupon Si substrate with TSV array (core)) of TV c appears in no step target/conditions/split/thickness of flows ectc51687.2025.00071-F1 (source: script)

## ectc51687.2025.00076
- [target_missing_preexisting] ectc51687.2025.00076-a-L04: stack_layers.thickness_um 210 (die embedded DTC (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025.00076-F1 (source: script)
- [target_missing] ectc51687.2025.00076-b-L02: stack_layers.via_diameter_um 155 (substrate_buildup ABF#2 (dielectric)) of TV b appears in no step target/conditions/split/thickness of flows ectc51687.2025.00076-F1 (source: script)
- [target_missing] ectc51687.2025.00076-b-L04: stack_layers.via_diameter_um 134 (substrate_buildup ABF#1 (dielectric)) of TV b appears in no step target/conditions/split/thickness of flows ectc51687.2025.00076-F1 (source: script)
- [target_missing_preexisting] ectc51687.2025.00076-b-L06: stack_layers.thickness_um 210 (die embedded DTC (device)) of TV b appears in no step target/conditions/split/thickness of flows ectc51687.2025.00076-F1 (source: script)
- [target_missing] ectc51687.2025.00076-b-i1: interconnects.diameter_um 134 (rdl_via microvia) of TV b appears in no step target/conditions/split/thickness of flows ectc51687.2025.00076-F1 (source: script)
- [target_missing] ectc51687.2025.00076-b-i2: interconnects.diameter_um 155 (rdl_via stacked_via) of TV b appears in no step target/conditions/split/thickness of flows ectc51687.2025.00076-F1 (source: script)

## ectc51687.2025.00095
- [category_other] ectc51687.2025.00095-F3-s02: 'flux dipping of chip module': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [build_seq_unverified] ectc51687.2025.00095-a: TV in 2 tv_build flows (ectc51687.2025.00095-F1, ectc51687.2025.00095-F3); build_seq is the flow-number default: confirm the order (source: script)
- [protected] ectc51687.2025.00095-F1-s03 is referenced by config/package3d/ase_focos_bridge.yaml: keep this step_id
- [protected] ectc51687.2025.00095-F1-s12 is referenced by config/package3d/ase_focos_bridge.yaml: keep this step_id
