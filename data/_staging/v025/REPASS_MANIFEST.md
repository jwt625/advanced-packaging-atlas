# Targeted process-flow fix manifest v025 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51909.2023.00174
- [category_other] ectc51909.2023.00174-F4-s06: 'Cu via on LSI top metal': proposed structure-like ('Cu via on LSI top metal'): check (source: audit_B)
- [build_seq_unverified] ectc51909.2023.00174-b: TV in 2 tv_build flows (ectc51909.2023.00174-F1, ectc51909.2023.00174-F2); build_seq is the flow-number default: confirm the order (source: script)
- [build_seq_unverified] ectc51909.2023.00174-c: TV in 2 tv_build flows (ectc51909.2023.00174-F1, ectc51909.2023.00174-F3); build_seq is the flow-number default: confirm the order (source: script)
- [protected] ectc51909.2023.00174-F1-s04 is referenced by config/package3d/cowos_l.yaml: keep this step_id

## ectc51909.2023.00175
- [target_missing_preexisting] ectc51909.2023.00175-a-L06: stack_layers.thickness_um 70 (bridge connect die (Si bridge) with Cu studs (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00175-F1 (source: script)
- [target_missing] ectc51909.2023.00175-a-i4: interconnects.pitch_um 260 (through_via cu_pillar) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00175-F1 (source: script)
- [protected] ectc51909.2023.00175-F1-s01 is referenced by config/package3d/amkor_s_connect.yaml: keep this step_id
- [protected] ectc51909.2023.00175-F1-s10 is referenced by config/package3d/amkor_s_connect.yaml: keep this step_id

## ectc51909.2023.00178
- [category_other] ectc51909.2023.00178-F2-s02: 'backside processes (not detailed)': proposed no information ('backside processes (not detailed)'): delete or keep (source: audit_B)
- [build_seq_unverified] ectc51909.2023.00178-b: TV in 2 tv_build flows (ectc51909.2023.00178-F1, ectc51909.2023.00178-F2); build_seq is the flow-number default: confirm the order (source: script)
- [build_seq_unverified] ectc51909.2023.00178-c: TV in 2 tv_build flows (ectc51909.2023.00178-F1, ectc51909.2023.00178-F2); build_seq is the flow-number default: confirm the order (source: script)

## ectc51909.2023.00179
- [split_temp_untyped] ectc51909.2023.00179-F1-s02: split names a temperature ('material/cure: A 5 min@210 C; B 2 h@190 C; B' 10 min@200 C; ') but temp_c and temp_c_max are empty (source: validator)
- [category_other] ectc51909.2023.00179-F1-s07: 'remounting of diced dies': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [untyped_condition] ectc51909.2023.00179-F1-s08: time_s empty but conditions has 'sted to allow 24 h plas' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [target_missing_preexisting] ectc51909.2023.00179-a-L01: stack_layers.thickness_um 58 (die_stack DRAM core chip (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00179-F1 (source: script)

## ectc51909.2023.00180
- [target_missing] ectc51909.2023.00180-a-L09: stack_layers.line_um 9 (substrate_buildup organic laminate (standard, no cavity) (conductor)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00180-F1 | stack_layers.space_um 12 (substrate_buildup organic laminate (standard, no cavity) (conductor)) of TV a appear (source: script)
- [target_missing] ectc51909.2023.00180-a-i1: interconnects.pitch_min_um 30 (die_to_bridge microbump) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00180-F1 | interconnects.pitch_max_um 75 (die_to_bridge microbump) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00180-F (source: script)
- [target_missing_preexisting] ectc51909.2023.00180-b-L06: stack_layers.thickness_um 60 (bridge Si bridge (device)) of TV b appears in no step target/conditions/split/thickness of flows ectc51909.2023.00180-F2 (source: script)
- [target_missing] ectc51909.2023.00180-b-L09: stack_layers.line_um 9 (substrate_buildup organic laminate (standard, no cavity) (conductor)) of TV b appears in no step target/conditions/split/thickness of flows ectc51909.2023.00180-F2 | stack_layers.space_um 12 (substrate_buildup organic laminate (standard, no cavity) (conductor)) of TV b appear (source: script)
- [target_missing] ectc51909.2023.00180-b-i1: interconnects.pitch_min_um 30 (die_to_bridge microbump) of TV b appears in no step target/conditions/split/thickness of flows ectc51909.2023.00180-F2 | interconnects.pitch_max_um 75 (die_to_bridge microbump) of TV b appears in no step target/conditions/split/thickness of flows ectc51909.2023.00180-F (source: script)
