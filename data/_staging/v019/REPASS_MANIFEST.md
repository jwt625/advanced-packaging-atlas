# Targeted process-flow fix manifest v019 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51906.2022.00031
- [build_order] ectc51906.2022.00031-F1: name heuristic: F1/F2 inverted (F2 TSV/backside prep precedes F1 tape mount s08); check build_seq (source: audit_B)
- [build_seq_unverified] ectc51906.2022.00031-b: TV in 2 tv_build flows (ectc51906.2022.00031-F1, ectc51906.2022.00031-F2); build_seq is the flow-number default: confirm the order (source: script)
- [build_seq_unverified] ectc51906.2022.00031-c: TV in 2 tv_build flows (ectc51906.2022.00031-F1, ectc51906.2022.00031-F2); build_seq is the flow-number default: confirm the order (source: script)
- [build_seq_unverified] ectc51906.2022.00031-d: TV in 2 tv_build flows (ectc51906.2022.00031-F1, ectc51906.2022.00031-F2); build_seq is the flow-number default: confirm the order (source: script)

## ectc51906.2022.00038
- [target_missing] ectc51906.2022.00038-a-L02: stack_layers.thickness_um 28 (bonding_interface Cu pillar to Cu pillar MELI-Cu joints (bonding)) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00038-F1 (source: script)
- [target_missing] ectc51906.2022.00038-a-i1: interconnects.pitch_min_um 30 (die_stack_internal cu_cu_direct) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00038-F1 | interconnects.pitch_max_um 45 (die_stack_internal cu_cu_direct) of TV a appears in no step target/conditions/split/thickness of flows ectc51 (source: script)
- [target_missing] ectc51906.2022.00038-b-i1: interconnects.diameter_um 50 (die_stack_internal cu_cu_direct) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00038-F2 (source: script)

## ectc51906.2022.00053
- [full_without_typed_condition] ectc51906.2022.00053: process_flow_level full but no step has a typed process condition (temp_c, temp_c_max, time_s, ramp_c_per_min, pressure_mpa, force_n, atmosphere, dose_mj_cm2, current_density_ma_cm2) (source: validator)
- [level_regrade] ectc51906.2022.00053: full without typed condition; only normalized temperatures and pressures (source: audit_B)
- [category_other] ectc51906.2022.00053-F1-s03: 'planarize Si capacitor Cu pads and dielectric simultaneously': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing_preexisting] ectc51906.2022.00053-a-L06: stack_layers.thickness_um 100 (die Si capacitor (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00053-F1 (source: script)

## ectc51906.2022.00055
- [untyped_condition] ectc51906.2022.00055-F1-s03: 45-60 min range in conditions only | time_s empty but conditions has '45-60 min' (type it if single-valued and stated; ranges stay in conditions) (source: audit_B;script)
- [untyped_condition] ectc51906.2022.00055-F3-s02: 580-600 C range in conditions only | temp_c/temp_c_max empty but conditions has '580-600 C' (type it if single-valued and stated; ranges stay in conditions) (source: audit_B;script)
- [target_missing] ectc51906.2022.00055-a-L01: stack_layers.line_um 100 (substrate_buildup RDL metal 1 (top solenoid winding) (conductor)) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00055-F1 | stack_layers.space_um 50 (substrate_buildup RDL metal 1 (top solenoid winding) (conductor)) of TV a appears in n (source: script)
- [target_missing_preexisting] ectc51906.2022.00055-a-L03: stack_layers.thickness_um 220 (cavity embedded ferrite core (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00055-F1 (source: script)
- [target_missing] ectc51906.2022.00055-a-L05: stack_layers.line_um 100 (substrate_buildup RDL metal 1 (bottom solenoid winding) (conductor)) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00055-F1 | stack_layers.space_um 50 (substrate_buildup RDL metal 1 (bottom solenoid winding) (conductor)) of TV a appear (source: script)
- [target_missing] ectc51906.2022.00055-a-i1: interconnects.diameter_um 80 (through_via tgv) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00055-F1 (source: script)
- [target_missing] ectc51906.2022.00055-b-L01: stack_layers.line_um 40 (substrate_buildup RDL metal 1 (top solenoid winding) (conductor)) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00055-F1 (source: script)
- [target_missing_preexisting] ectc51906.2022.00055-b-L03: stack_layers.thickness_um 220 (cavity embedded ferrite core (device)) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00055-F1 (source: script)
- [target_missing] ectc51906.2022.00055-b-L05: stack_layers.line_um 40 (substrate_buildup RDL metal 1 (bottom solenoid winding) (conductor)) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00055-F1 (source: script)
- [target_missing] ectc51906.2022.00055-b-i1: interconnects.diameter_um 25 (through_via tgv) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00055-F1 (source: script)
- [build_seq_unverified] ectc51906.2022.00055-c: TV in 2 tv_build flows (ectc51906.2022.00055-F1, ectc51906.2022.00055-F2); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing_preexisting] ectc51906.2022.00055-c-L05: stack_layers.thickness_um 220 (cavity embedded ferrite core (device)) of TV c appears in no step target/conditions/split/thickness of flows ectc51906.2022.00055-F1, ectc51906.2022.00055-F2 (source: script)
- [target_missing] ectc51906.2022.00055-c-i1: interconnects.diameter_um 80 (through_via tgv) of TV c appears in no step target/conditions/split/thickness of flows ectc51906.2022.00055-F1, ectc51906.2022.00055-F2 (source: script)
- [target_missing_preexisting] ectc51906.2022.00055-d-L01: stack_layers.thickness_um 240.18 (glass_core photosensitive glass (core)) of TV d appears in no step target/conditions/split/thickness of flows ectc51906.2022.00055-F3 (source: script)
- [target_missing] ectc51906.2022.00055-d-i1: interconnects.diameter_um 16.8 (through_via tgv) of TV d appears in no step target/conditions/split/thickness of flows ectc51906.2022.00055-F3 (source: script)

## ectc51906.2022.00057
- [category_other] ectc51906.2022.00057-F2-s06: 'backside Cu connection pad formation on middle wafer (protru': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51906.2022.00057-F2-s10: 'Cu connection pad formation on bottom-wafer frontside': keyword proposal no keyword match: choose an existing category or keep other (source: script)
