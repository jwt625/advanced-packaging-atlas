# Targeted process-flow fix manifest v021 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51906.2022.00136
- [category_other] ectc51906.2022.00136-F1-s23: 'tape and reel / ship': keyword proposal no keyword match: choose an existing category or keep other (source: script)

## ectc51906.2022.00140
- [untyped_condition] ectc51906.2022.00140-F1-s02: time_s empty but conditions has 'erface over 1000 h HTS' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [category_other] ectc51906.2022.00140-F1-s20: 'final backend processing': keyword proposal no keyword match: choose an existing category or keep other (source: script)

## ectc51906.2022.00142
- [category_other] ectc51906.2022.00142-F7-s02: 'cover Cu lines with insulating resin': proposed lamination (prepreg cover) (source: audit_B)
- [target_missing_preexisting] ectc51906.2022.00142-a-L03: stack_layers.thickness_um 800 (substrate_core core material (core)) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00142-F1 (source: script)
- [build_seq_unverified] ectc51906.2022.00142-b: TV in 2 tv_build flows (ectc51906.2022.00142-F2, ectc51906.2022.00142-F3); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing_preexisting] ectc51906.2022.00142-b-L01: stack_layers.thickness_um 725 (die Si chip (device)) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00142-F2, ectc51906.2022.00142-F3 (source: script)
- [target_missing_preexisting] ectc51906.2022.00142-b-L05: stack_layers.thickness_um 800 (substrate_core core material (core)) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00142-F2, ectc51906.2022.00142-F3 (source: script)
- [build_seq_unverified] ectc51906.2022.00142-c: TV in 2 tv_build flows (ectc51906.2022.00142-F3, ectc51906.2022.00142-F4); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing_preexisting] ectc51906.2022.00142-c-L01: stack_layers.thickness_um 725 (die Si chip (device)) of TV c appears in no step target/conditions/split/thickness of flows ectc51906.2022.00142-F3, ectc51906.2022.00142-F4 (source: script)
- [target_missing_preexisting] ectc51906.2022.00142-c-L05: stack_layers.thickness_um 800 (substrate_core core material (core)) of TV c appears in no step target/conditions/split/thickness of flows ectc51906.2022.00142-F3, ectc51906.2022.00142-F4 (source: script)
- [build_seq_unverified] ectc51906.2022.00142-d: TV in 2 tv_build flows (ectc51906.2022.00142-F5, ectc51906.2022.00142-F7); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing_preexisting] ectc51906.2022.00142-d-L07: stack_layers.thickness_um 800 (substrate_core core material (core)) of TV d appears in no step target/conditions/split/thickness of flows ectc51906.2022.00142-F5, ectc51906.2022.00142-F7 (source: script)
- [build_seq_unverified] ectc51906.2022.00142-e: TV in 2 tv_build flows (ectc51906.2022.00142-F6, ectc51906.2022.00142-F7); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] ectc51906.2022.00142-e-L02: stack_layers.line_um 10 (substrate_buildup comb Cu lines (conductor)) of TV e appears in no step target/conditions/split/thickness of flows ectc51906.2022.00142-F6, ectc51906.2022.00142-F7 | stack_layers.space_um 10 (substrate_buildup comb Cu lines (conductor)) of TV e appears in no step target/cond (source: script)
- [target_missing_preexisting] ectc51906.2022.00142-e-L06: stack_layers.thickness_um 800 (substrate_core core material (core)) of TV e appears in no step target/conditions/split/thickness of flows ectc51906.2022.00142-F6, ectc51906.2022.00142-F7 (source: script)

## ectc51906.2022.00176
- [category_other] ectc51906.2022.00176-F1-s01: 'BEOL metal stack processing on top die (TD) wafer and bottom': keyword proposal rdl_layer (source: script)
- [target_no_number] ectc51906.2022.00176-F1-s01: target 'TD wafer; BW' has no number (object name?) (source: validator)
- [target_no_number] ectc51906.2022.00176-F1-s03: target 'TD wafer; BW' has no number (object name?) (source: validator)
- [target_no_number] ectc51906.2022.00176-F1-s04: target 'TD wafer; BW' has no number (object name?) (source: validator)
- [target_no_number] ectc51906.2022.00176-F1-s05: target 'TD wafer; BW' has no number (object name?) (source: validator)
- [category_other] ectc51906.2022.00176-F1-s06: 'pad exposure': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_no_number] ectc51906.2022.00176-F1-s06: target 'TD wafer; BW' has no number (object name?) (source: validator)
- [category_other] ectc51906.2022.00176-F1-s07: 'fiducial mark fabrication on TD and BW for bonding accuracy': proposed lithography (fiducial marks) (source: audit_B)
- [target_no_number] ectc51906.2022.00176-F1-s07: target 'TD wafer; BW' has no number (object name?) (source: validator)
- [target_no_number] ectc51906.2022.00176-F1-s08: target 'TD wafer' has no number (object name?) (source: validator)
- [target_no_number] ectc51906.2022.00176-F1-s10: target 'TD on BW' has no number (object name?) (source: validator)

## ectc51906.2022.00179
- [category_other] ectc51906.2022.00179-F3-s02: 'FS M1 and VIA1 standard Cu damascene': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [build_seq_unverified] ectc51906.2022.00179-b: TV in 2 tv_build flows (ectc51906.2022.00179-F1, ectc51906.2022.00179-F3); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] ectc51906.2022.00179-d-i1: interconnects.pitch_min_um 7 (die_stack_internal microbump) of TV d appears in no step target/conditions/split/thickness of flows ectc51906.2022.00179-F4 | interconnects.pitch_max_um 40 (die_stack_internal microbump) of TV d appears in no step target/conditions/split/thickness of flows ectc51906.202 (source: script)
- [target_missing] ectc51906.2022.00179-d-i2: interconnects.pitch_um 7 (through_via tsv) of TV d appears in no step target/conditions/split/thickness of flows ectc51906.2022.00179-F4 | interconnects.diameter_um 3 (through_via tsv) of TV d appears in no step target/conditions/split/thickness of flows ectc51906.2022.00179-F4 (source: script)
