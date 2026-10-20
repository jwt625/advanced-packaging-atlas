# Targeted process-flow fix manifest v009 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51687.2025.00097
- [category_other] ectc51687.2025.00097-F1-s10: 'Edge treatment to remove sidewall dielectric coverage on Dev': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51687.2025.00097-F4-s03: 'Carrier edge trim (through Device 1)': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51687.2025.00097-F5-s05: 'carrier removal (Fig. 1(e))': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51687.2025.00097-F6-s05: 'carrier wafer removal (Fig. 2(e))': keyword proposal no keyword match: choose an existing category or keep other (source: script)

## ectc51687.2025.00141
- [category_other] ectc51687.2025.00141-F1-s07: 'form Cu base substrates for micro-bump connection pads outsi': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51687.2025.00141-F1-s08: 'fabricate on-chip lens in sensor pixel area (Fig. 6(e))': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51687.2025.00141-F1-s09: 'open micro-bump connection pad area (Fig. 6(f))': keyword proposal no keyword match: choose an existing category or keep other (source: script)

## ectc51687.2025.00142
- [category_other] ectc51687.2025.00142-F1-s09: 'Cu damascene pillar formation': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing] ectc51687.2025.00142-a-L02: stack_layers.thickness_um 3.8 (substrate_buildup pillar layer oxide (dielectric)) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025.00142-F1 (source: script)
- [target_missing] ectc51687.2025.00142-a-L04: stack_layers.thickness_um 5.7 (substrate_buildup SAP Cu trace layer (conductor)) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025.00142-F1 (source: script)
- [target_missing] ectc51687.2025.00142-b-L03: stack_layers.thickness_um 0.25 (substrate_buildup nitride liner (dielectric)) of TV b appears in no step target/conditions/split/thickness of flows ectc51687.2025.00142-F2 (source: script)
- [target_missing] ectc51687.2025.00142-c-i1: interconnects.diameter_um 5 (die_to_substrate cu_cu_direct) of TV c appears in no step target/conditions/split/thickness of flows ectc51687.2025.00142-F3 (source: script)

## ectc51687.2025.00148
- [target_missing_preexisting] ectc51687.2025.00148-a-L01: stack_layers.thickness_um 550 (die STAC TEG chip (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025.00148-F1 (source: script)
- [target_missing] ectc51687.2025.00148-a-L07: stack_layers.via_diameter_um 200 (substrate_core core (core)) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025.00148-F1 | stack_layers.via_pitch_um 500 (substrate_core core (core)) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.202 (source: script)
- [target_missing] ectc51687.2025.00148-a-i1: interconnects.diameter_um 100 (die_to_substrate cu_pillar) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025.00148-F1 (source: script)
- [target_missing] ectc51687.2025.00148-a-i4: interconnects.pitch_um 500 (through_via pth) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025.00148-F1 | interconnects.diameter_um 200 (through_via pth) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025.00148-F1 (source: script)
- [target_missing_preexisting] ectc51687.2025.00148-b-L01: stack_layers.thickness_um 550 (die STAC TEG chip (device)) of TV b appears in no step target/conditions/split/thickness of flows ectc51687.2025.00148-F1 (source: script)
- [target_missing] ectc51687.2025.00148-b-L07: stack_layers.via_diameter_um 200 (substrate_core core (core)) of TV b appears in no step target/conditions/split/thickness of flows ectc51687.2025.00148-F1 | stack_layers.via_pitch_um 500 (substrate_core core (core)) of TV b appears in no step target/conditions/split/thickness of flows ectc51687.202 (source: script)
- [target_missing] ectc51687.2025.00148-b-i1: interconnects.diameter_um 100 (die_to_substrate cu_pillar) of TV b appears in no step target/conditions/split/thickness of flows ectc51687.2025.00148-F1 (source: script)
- [target_missing] ectc51687.2025.00148-b-i4: interconnects.pitch_um 500 (through_via pth) of TV b appears in no step target/conditions/split/thickness of flows ectc51687.2025.00148-F1 | interconnects.diameter_um 200 (through_via pth) of TV b appears in no step target/conditions/split/thickness of flows ectc51687.2025.00148-F1 (source: script)
- [target_missing_preexisting] ectc51687.2025.00148-c-L01: stack_layers.thickness_um 550 (die STAC TEG chip (device)) of TV c appears in no step target/conditions/split/thickness of flows ectc51687.2025.00148-F1 (source: script)
- [target_missing] ectc51687.2025.00148-c-L07: stack_layers.via_diameter_um 200 (substrate_core core (core)) of TV c appears in no step target/conditions/split/thickness of flows ectc51687.2025.00148-F1 | stack_layers.via_pitch_um 500 (substrate_core core (core)) of TV c appears in no step target/conditions/split/thickness of flows ectc51687.202 (source: script)
- [target_missing] ectc51687.2025.00148-c-i1: interconnects.diameter_um 100 (die_to_substrate cu_pillar) of TV c appears in no step target/conditions/split/thickness of flows ectc51687.2025.00148-F1 (source: script)
- [target_missing] ectc51687.2025.00148-c-i4: interconnects.pitch_um 500 (through_via pth) of TV c appears in no step target/conditions/split/thickness of flows ectc51687.2025.00148-F1 | interconnects.diameter_um 200 (through_via pth) of TV c appears in no step target/conditions/split/thickness of flows ectc51687.2025.00148-F1 (source: script)

## ectc51687.2025.00158
- [category_other] ectc51687.2025.00158-F2-s01: 'form Cu pillars on wafer carrier': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [build_seq_unverified] ectc51687.2025.00158-a: TV in 2 tv_build flows (ectc51687.2025.00158-F1, ectc51687.2025.00158-F2); build_seq is the flow-number default: confirm the order (source: script)
