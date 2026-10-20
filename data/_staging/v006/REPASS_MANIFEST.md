# Targeted process-flow fix manifest v006 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51529.2024.00265
- [category_other] ectc51529.2024.00265-F1-s13: 'print solder paste on motherboard': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51529.2024.00265-F1-s17: 'remove spacer': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing_preexisting] ectc51529.2024.00265-a-L03: stack_layers.thickness_um 725 (die Si chip (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00265-F1 (source: script)
- [target_missing_preexisting] ectc51529.2024.00265-a-L08: stack_layers.thickness_um 1400 (substrate_core CCL core (A), L9/L10 (core)) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00265-F1 (source: script)
- [target_missing] ectc51529.2024.00265-a-i1: interconnects.pitch_um 200 (die_to_substrate cu_pillar) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00265-F1 | interconnects.diameter_um 90 (die_to_substrate cu_pillar) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00265 (source: script)
- [target_missing_preexisting] ectc51529.2024.00265-b-L03: stack_layers.thickness_um 725 (die Si chip (device)) of TV b appears in no step target/conditions/split/thickness of flows ectc51529.2024.00265-F1 (source: script)
- [target_missing_preexisting] ectc51529.2024.00265-b-L08: stack_layers.thickness_um 1400 (substrate_core CCL core (B), L9/L10 (core)) of TV b appears in no step target/conditions/split/thickness of flows ectc51529.2024.00265-F1 (source: script)
- [target_missing] ectc51529.2024.00265-b-i1: interconnects.pitch_um 200 (die_to_substrate cu_pillar) of TV b appears in no step target/conditions/split/thickness of flows ectc51529.2024.00265-F1 | interconnects.diameter_um 90 (die_to_substrate cu_pillar) of TV b appears in no step target/conditions/split/thickness of flows ectc51529.2024.00265 (source: script)
- [target_missing_preexisting] ectc51529.2024.00265-c-L03: stack_layers.thickness_um 725 (die Si chip (device)) of TV c appears in no step target/conditions/split/thickness of flows ectc51529.2024.00265-F1 (source: script)
- [target_missing_preexisting] ectc51529.2024.00265-c-L08: stack_layers.thickness_um 1400 (substrate_core CCL core (C), L9/L10 (core)) of TV c appears in no step target/conditions/split/thickness of flows ectc51529.2024.00265-F1 (source: script)
- [target_missing] ectc51529.2024.00265-c-i1: interconnects.pitch_um 200 (die_to_substrate cu_pillar) of TV c appears in no step target/conditions/split/thickness of flows ectc51529.2024.00265-F1 | interconnects.diameter_um 90 (die_to_substrate cu_pillar) of TV c appears in no step target/conditions/split/thickness of flows ectc51529.2024.00265 (source: script)
- [target_missing_preexisting] ectc51529.2024.00265-d-L03: stack_layers.thickness_um 725 (die Si chip (device)) of TV d appears in no step target/conditions/split/thickness of flows ectc51529.2024.00265-F1 (source: script)
- [target_missing_preexisting] ectc51529.2024.00265-d-L08: stack_layers.thickness_um 1400 (substrate_core CCL core (D), L9/L10 (core)) of TV d appears in no step target/conditions/split/thickness of flows ectc51529.2024.00265-F1 (source: script)
- [target_missing] ectc51529.2024.00265-d-i1: interconnects.pitch_um 200 (die_to_substrate cu_pillar) of TV d appears in no step target/conditions/split/thickness of flows ectc51529.2024.00265-F1 | interconnects.diameter_um 90 (die_to_substrate cu_pillar) of TV d appears in no step target/conditions/split/thickness of flows ectc51529.2024.00265 (source: script)

## ectc51529.2024.00321
- [category_other] ectc51529.2024.00321-F1-s06: 'mask panel outer area against Cu electroplating (dummy DF, p': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [identical_delta_text] ectc51529.2024.00321-F1-s06: 2 delta rows of ectc51529.2024.00321-F1 have the same step text: ectc51529.2024.00321-F1-s06, ectc51529.2024.00321-F1-s07 (source: validator)
- [category_other] ectc51529.2024.00321-F1-s07: 'mask panel outer area against Cu electroplating (dummy DF, p': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [identical_delta_text] ectc51529.2024.00321-F1-s12: 3 delta rows of ectc51529.2024.00321-F1 have the same step text: ectc51529.2024.00321-F1-s12, ectc51529.2024.00321-F1-s13, ectc51529.2024.00321-F1-s14 (source: validator)
- [identical_delta_text] ectc51529.2024.00321-F1-s16: 2 delta rows of ectc51529.2024.00321-F1 have the same step text: ectc51529.2024.00321-F1-s16, ectc51529.2024.00321-F1-s19 (source: validator)

## ectc51529.2024.00322
- [target_missing_preexisting] ectc51529.2024.00322-c-L02: stack_layers.thickness_um 775 (die large die / small dies (device)) of TV c appears in no step target/conditions/split/thickness of flows ectc51529.2024.00322-F2 (source: script)
- [target_missing_preexisting] ectc51529.2024.00322-c-L04: stack_layers.thickness_um 775 (interposer Si interposer (core)) of TV c appears in no step target/conditions/split/thickness of flows ectc51529.2024.00322-F2 (source: script)
- [target_missing] ectc51529.2024.00322-d-L03: stack_layers.thickness_um 20 (die DAF (adhesive)) of TV d appears in no step target/conditions/split/thickness of flows ectc51529.2024.00322-F4 (source: script)
- [target_missing] ectc51529.2024.00322-e-L03: stack_layers.thickness_um 20 (die DAF (adhesive)) of TV e appears in no step target/conditions/split/thickness of flows ectc51529.2024.00322-F4 (source: script)
- [target_missing] ectc51529.2024.00322-f-L03: stack_layers.thickness_um 20 (die DAF (adhesive)) of TV f appears in no step target/conditions/split/thickness of flows ectc51529.2024.00322-F4 (source: script)

## ectc51529.2024.00334
- [category_other] ectc51529.2024.00334-F1-s09: 'edge trim of top wafer bevel': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing] ectc51529.2024.00334-a-i1: interconnects.pitch_um 0.5 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00334-F1 (source: script)
- [target_missing] ectc51529.2024.00334-a-i2: interconnects.pitch_um 0.3 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00334-F1 (source: script)

## ectc51529.2024.00396
- [category_other] ectc51529.2024.00396-F1-s15: 'remove opaque layer from glass backside': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_no_number] ectc51529.2024.00396-F1-s15: target 'glass wafer' has no number (object name?) (source: validator)
