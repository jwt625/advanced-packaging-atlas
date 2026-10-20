# Targeted process-flow fix manifest v026 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51909.2023.00190
- [generic_intro_candidate] ectc51909.2023.00190-F1-s03: stated_in_flow but located only in p.1 Abstract: generic_description unless the paper says it was executed (source: script)
- [category_other] ectc51909.2023.00190-F1-s09: 'edge trim of bonded top wafer, stopped a few microns above t': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [split_temp_untyped] ectc51909.2023.00190-F2-s03: split names a temperature ('anneal 200/250/300/350 C') but temp_c and temp_c_max are empty (source: validator)
- [target_missing] ectc51909.2023.00190-a-i2: interconnects.diameter_um 0.2 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00190-F1 (source: script)
- [target_missing] ectc51909.2023.00190-a-i3: interconnects.diameter_um 0.25 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00190-F1 (source: script)
- [target_missing] ectc51909.2023.00190-a-i4: interconnects.pitch_um 0.8 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00190-F1 (source: script)
- [target_missing] ectc51909.2023.00190-a-i5: interconnects.diameter_um 0.4 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00190-F1 (source: script)
- [target_missing] ectc51909.2023.00190-a-i6: interconnects.diameter_um 0.2 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00190-F1 (source: script)
- [target_missing] ectc51909.2023.00190-a-i8: interconnects.diameter_um 0.4 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00190-F1 (source: script)

## ectc51909.2023.00219
- [target_missing] ectc51909.2023.00219-a-i1: interconnects.pitch_um 6 (die_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00219-F1 (source: script)
- [target_missing] ectc51909.2023.00219-b-i1: interconnects.pitch_um 6 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV b appears in no step target/conditions/split/thickness of flows ectc51909.2023.00219-F2 (source: script)

## ectc51909.2023.00230
- [category_other] ectc51909.2023.00230-F1-s03: 'ion implantation steps before and after waveguide patterning': keyword proposal device_fab (proposed category, not in schema v2.5: keep other) (source: script)
- [category_other] ectc51909.2023.00230-F1-s06: 'silicidation of Si contact areas of active devices': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51909.2023.00230-F1-s10: 'BEOL: via contacts to silicide and TiN, two metallization le': keyword proposal rdl_layer (source: script)
- [build_seq_unverified] ectc51909.2023.00230-a: TV in 2 tv_build flows (ectc51909.2023.00230-F1, ectc51909.2023.00230-F2); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] ectc51909.2023.00230-a-L08: stack_layers.thickness_um 0.3 (photonic SOI Si device layer (waveguides, modulators, Ge PD) (optical)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00230-F1, ectc51909.2023.00230-F2 (source: script)
- [target_missing] ectc51909.2023.00230-a-L09: stack_layers.thickness_um 2 (photonic buried oxide (BOX) (optical)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00230-F1, ectc51909.2023.00230-F2 (source: script)

## ectc51909.2023.00235
- [build_seq_unverified] ectc51909.2023.00235-a: TV in 2 tv_build flows (ectc51909.2023.00235-F1, ectc51909.2023.00235-F5); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] ectc51909.2023.00235-a-L02: stack_layers.line_um 2 (substrate_buildup high-density (HD) fine wiring build-up layers (conductor)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00235-F1, ectc51909.2023.00235-F5 | stack_layers.space_um 2 (substrate_buildup high-density (HD) fine wiring build (source: script)
- [target_missing] ectc51909.2023.00235-a-i1: interconnects.pitch_um 75 (die_to_substrate microbump) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00235-F1, ectc51909.2023.00235-F5 | interconnects.diameter_um 30 (die_to_substrate microbump) of TV a appears in no step target/conditions/split/thickness of fl (source: script)
- [target_missing] ectc51909.2023.00235-a-i2: interconnects.pitch_um 55 (die_to_substrate microbump) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00235-F1, ectc51909.2023.00235-F5 | interconnects.diameter_um 30 (die_to_substrate microbump) of TV a appears in no step target/conditions/split/thickness of fl (source: script)
- [target_missing] ectc51909.2023.00235-a-i3: interconnects.pitch_um 55 (die_to_substrate microbump) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00235-F1, ectc51909.2023.00235-F5 | interconnects.diameter_um 25 (die_to_substrate microbump) of TV a appears in no step target/conditions/split/thickness of fl (source: script)
- [target_missing] ectc51909.2023.00235-a-i4: interconnects.pitch_um 150 (die_to_substrate c4) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00235-F1, ectc51909.2023.00235-F5 | interconnects.diameter_um 90 (die_to_substrate c4) of TV a appears in no step target/conditions/split/thickness of flows ectc51909 (source: script)
- [target_missing] ectc51909.2023.00235-a-i5: interconnects.pitch_um 1000 (substrate_to_board bga) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00235-F1, ectc51909.2023.00235-F5 (source: script)
- [build_seq_unverified] ectc51909.2023.00235-b: TV in 2 tv_build flows (ectc51909.2023.00235-F3, ectc51909.2023.00235-F5); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] ectc51909.2023.00235-b-i1: interconnects.pitch_um 75 (die_to_substrate microbump) of TV b appears in no step target/conditions/split/thickness of flows ectc51909.2023.00235-F3, ectc51909.2023.00235-F5 | interconnects.diameter_um 30 (die_to_substrate microbump) of TV b appears in no step target/conditions/split/thickness of fl (source: script)
- [target_missing] ectc51909.2023.00235-b-i2: interconnects.pitch_um 55 (die_to_substrate microbump) of TV b appears in no step target/conditions/split/thickness of flows ectc51909.2023.00235-F3, ectc51909.2023.00235-F5 | interconnects.diameter_um 30 (die_to_substrate microbump) of TV b appears in no step target/conditions/split/thickness of fl (source: script)
- [target_missing] ectc51909.2023.00235-b-i3: interconnects.pitch_um 55 (die_to_substrate microbump) of TV b appears in no step target/conditions/split/thickness of flows ectc51909.2023.00235-F3, ectc51909.2023.00235-F5 | interconnects.diameter_um 25 (die_to_substrate microbump) of TV b appears in no step target/conditions/split/thickness of fl (source: script)
- [target_missing] ectc51909.2023.00235-b-i4: interconnects.pitch_um 150 (die_to_substrate c4) of TV b appears in no step target/conditions/split/thickness of flows ectc51909.2023.00235-F3, ectc51909.2023.00235-F5 | interconnects.diameter_um 90 (die_to_substrate c4) of TV b appears in no step target/conditions/split/thickness of flows ectc51909 (source: script)
- [target_missing] ectc51909.2023.00235-b-i5: interconnects.pitch_um 1000 (substrate_to_board bga) of TV b appears in no step target/conditions/split/thickness of flows ectc51909.2023.00235-F3, ectc51909.2023.00235-F5 (source: script)

## ectc51909.2023.00252
- [target_missing] ectc51909.2023.00252-a-i3: interconnects.pitch_um 350 (substrate_to_board solder_ball) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00252-F1 (source: script)
