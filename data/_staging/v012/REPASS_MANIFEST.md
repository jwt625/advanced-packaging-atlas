# Targeted process-flow fix manifest v012 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51846.2026.00019
- [flow_tv_ids] ectc51846.2026.00019-F2: generic_platform flow tv_ids = TV b (simulation_model); empty or a TV it is shown for (rule n v2.5) (source: audit_B)

## ectc51846.2026.00024
- [build_order_note] ectc51846.2026.00024-F4: notes say 'precedes bonding flows F1' but build_seq defaults to the flow number (4): set build_seq (source: script)
- [build_seq_unverified] ectc51846.2026.00024-a: TV in 2 tv_build flows (ectc51846.2026.00024-F1, ectc51846.2026.00024-F4); build_seq is the flow-number default: confirm the order (source: script)
- [build_seq_unverified] ectc51846.2026.00024-b: TV in 2 tv_build flows (ectc51846.2026.00024-F2, ectc51846.2026.00024-F4); build_seq is the flow-number default: confirm the order (source: script)

## ectc51846.2026.00050
- [split_misuse] ectc51846.2026.00050-F3-s02: split encodes Cu pillar 150 um (a) vs bridge solder bumps 175 um (e): deltas or routes (source: audit_B)
- [build_seq_unverified] ectc51846.2026.00050-a: TV in 2 tv_build flows (ectc51846.2026.00050-F1, ectc51846.2026.00050-F3); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing_preexisting] ectc51846.2026.00050-a-L02: stack_layers.thickness_um 60 (bridge Si bridge chip (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00050-F1, ectc51846.2026.00050-F3 (source: script)
- [build_seq_unverified] ectc51846.2026.00050-b: TV in 2 tv_build flows (ectc51846.2026.00050-F1, ectc51846.2026.00050-F3); build_seq is the flow-number default: confirm the order (source: script)
- [build_seq_unverified] ectc51846.2026.00050-e: TV in 3 tv_build flows (ectc51846.2026.00050-F1, ectc51846.2026.00050-F3, ectc51846.2026.00050-F4); build_seq is the flow-number default: confirm the order (source: script)
- [build_seq_unverified] ectc51846.2026.00050-h: TV in 2 tv_build flows (ectc51846.2026.00050-F1, ectc51846.2026.00050-F3); build_seq is the flow-number default: confirm the order (source: script)

## ectc51846.2026.00051
- [category_other] ectc51846.2026.00051-F1-s02: 'via formation and metallization to bridge pads (new via-to-b': keyword proposal tsv_tgv_formation or etch_dry/etch_wet (via formation) (source: script)

## ectc51846.2026.00062
- [split_temp_untyped] ectc51846.2026.00062-F1-s15: split names a temperature ('force/bond head temp (Table I): #1 300 N/300 C, #2 300 N/350') but temp_c and temp_c_max are empty (source: validator)
- [untyped_condition] ectc51846.2026.00062-F1-s15: 'chuck 180 C' not typed (temp_c) | temp_c/temp_c_max empty but conditions has 'chuck 180 C; dwe' (type it if single-valued and stated; ranges stay in conditions) (source: audit_B;script)
- [target_missing] ectc51846.2026.00062-a-L06: stack_layers.via_diameter_um 6.151 (die front Cu pillars (bonding)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00062-F1 (source: script)
- [target_missing] ectc51846.2026.00062-a-i1: interconnects.diameter_um 6.151 (die_stack_internal cu_cu_direct) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00062-F1 (source: script)
- [target_missing] ectc51846.2026.00062-a-i2: interconnects.diameter_um 6.151 (die_to_substrate cu_cu_direct) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00062-F1 (source: script)
- [target_missing] ectc51846.2026.00062-b-L04: stack_layers.via_diameter_um 6.151 (die front Cu pillars (bonding)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00062-F1 (source: script)
- [target_missing] ectc51846.2026.00062-b-i1: interconnects.diameter_um 6.151 (die_to_substrate cu_cu_direct) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00062-F1 (source: script)
