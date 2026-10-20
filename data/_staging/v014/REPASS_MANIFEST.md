# Targeted process-flow fix manifest v014 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51846.2026.00115
- [untyped_condition] ectc51846.2026.00115-F2-s01: '30 min electroless' not typed (time_s) | time_s empty but conditions has 'articles with 30 min elec' (type it if single-valued and stated; ranges stay in conditions) (source: audit_B;script)

## ectc51846.2026.00119
- [target_missing] ectc51846.2026.00119-c-L01: stack_layers.via_diameter_um 105 (solder_mask HTCSR dry film (passivation)) of TV c appears in no step target/conditions/split/thickness of flows ectc51846.2026.00119-F2 (source: script)
- [build_seq_unverified] ectc51846.2026.00119-h: TV in 2 tv_build flows (ectc51846.2026.00119-F4, ectc51846.2026.00119-F5); build_seq is the flow-number default: confirm the order (source: script)

## ectc51846.2026.00130
- [build_seq_unverified] ectc51846.2026.00130-a: TV in 3 tv_build flows (ectc51846.2026.00130-F1, ectc51846.2026.00130-F2, ectc51846.2026.00130-F3); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] ectc51846.2026.00130-a-L05: stack_layers.via_pitch_um 0.45 (bonding_interface V1P bond layer (top wafer) (bonding)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00130-F1, ectc51846.2026.00130-F2, ectc51846.2026.00130-F3 (source: script)
- [target_missing] ectc51846.2026.00130-a-L08: stack_layers.via_pitch_um 0.45 (bonding_interface V1 bond layer (bottom wafer) (bonding)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00130-F1, ectc51846.2026.00130-F2, ectc51846.2026.00130-F3 (source: script)
- [target_missing] ectc51846.2026.00130-a-i1: interconnects.pitch_um 0.45 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00130-F1, ectc51846.2026.00130-F2, ectc51846.2026.00130-F3 (source: script)
- [target_missing] ectc51846.2026.00130-a-i2: interconnects.pitch_um 0.45 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00130-F1, ectc51846.2026.00130-F2, ectc51846.2026.00130-F3 (source: script)
- [build_seq_unverified] ectc51846.2026.00130-b: TV in 3 tv_build flows (ectc51846.2026.00130-F1, ectc51846.2026.00130-F2, ectc51846.2026.00130-F3); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] ectc51846.2026.00130-b-L01: stack_layers.via_pitch_um 0.45 (bonding_interface V1P bond layer (top wafer) (bonding)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00130-F1, ectc51846.2026.00130-F2, ectc51846.2026.00130-F3 (source: script)
- [target_missing] ectc51846.2026.00130-b-L02: stack_layers.via_pitch_um 0.45 (bonding_interface V1 bond layer (bottom wafer) (bonding)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00130-F1, ectc51846.2026.00130-F2, ectc51846.2026.00130-F3 (source: script)
- [target_missing] ectc51846.2026.00130-b-i1: interconnects.pitch_um 0.45 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00130-F1, ectc51846.2026.00130-F2, ectc51846.2026.00130-F3 (source: script)

## ectc51846.2026.00134
- [category_other] ectc51846.2026.00134-F3-s01: 'form embedded 3D waveguides by ultrashort-pulse laser direct': keyword proposal no keyword match: choose an existing category or keep other (source: script)

## ectc51846.2026.00140
- [target_missing] ectc51846.2026.00140-a-L02: stack_layers.line_um 2 (substrate_buildup ET embedded Cu traces and vias (conductor)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00140-F1, ectc51846.2026.00140-F2 | stack_layers.space_um 2 (substrate_buildup ET embedded Cu traces and vias (conductor)) of TV  (source: script)
