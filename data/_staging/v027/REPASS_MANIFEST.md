# Targeted process-flow fix manifest v027 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51909.2023.00266
- [category_other] ectc51909.2023.00266-F1-s13: 'detape': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing] ectc51909.2023.00266-a-i2: interconnects.diameter_um 20 (rdl_via rdl_via) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00266-F1 (source: script)

## ectc51909.2023.00274
- [category_other] ectc51909.2023.00274-F1-s02: 'fabricate HEMT devices and metal contacts': keyword proposal device_fab (proposed category, not in schema v2.5: keep other) (source: script)

## ectc51909.2023.00307
- [category_other] ectc51909.2023.00307-F1-s02: 'edge trimming of 8-inch CMOS wafer': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51909.2023.00307-F1-s24: 'bonding of dicing tape': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing] ectc51909.2023.00307-a-L04: stack_layers.thickness_um 0.6 (die liner oxide (dielectric)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00307-F1 (source: script)
- [target_missing] ectc51909.2023.00307-a-L05: stack_layers.thickness_um 0.4 (die liner oxide (dielectric)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00307-F1 (source: script)
- [target_missing] ectc51909.2023.00307-a-L06: stack_layers.thickness_um 0.9 (die liner oxide (dielectric)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00307-F1 (source: script)
- [build_seq_unverified] ectc51909.2023.00307-b: TV in 2 tv_build flows (ectc51909.2023.00307-F1, ectc51909.2023.00307-F2); build_seq is the flow-number default: confirm the order (source: script)

## ectc51909.2023.00324
- [target_missing] ectc51909.2023.00324-a-L02: stack_layers.thickness_um 8.2 (photonic core layer (optical)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00324-F1 | stack_layers.line_um 8.6 (photonic core layer (optical)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023. (source: script)
- [target_missing] ectc51909.2023.00324-a-L03: stack_layers.thickness_um 6.171 (photonic core layer (other)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00324-F1 | stack_layers.line_um 89.76 (photonic core layer (other)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023. (source: script)

## ectc51909.2023.00333
- [target_missing_preexisting] ectc51909.2023.00333-a-L02: stack_layers.thickness_um 80 (substrate_core top ARC (core)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00333-F1 (source: script)
- [target_missing] ectc51909.2023.00333-a-L03: stack_layers.thickness_um 5.4772 (substrate_core ARC-to-ARC bonding layer (bonding)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00333-F1 (source: script)
- [target_missing_preexisting] ectc51909.2023.00333-a-L04: stack_layers.thickness_um 120 (substrate_core bottom ARC (core)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00333-F1 (source: script)
- [target_missing_preexisting] ectc51909.2023.00333-a-L06: stack_layers.thickness_um 1000 (other glass carrier (removed) (carrier)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00333-F1 (source: script)
- [target_missing_preexisting] ectc51909.2023.00333-a-L07: stack_layers.thickness_um 200 (die embedded die (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00333-F1 (source: script)
