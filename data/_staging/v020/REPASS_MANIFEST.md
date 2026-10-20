# Targeted process-flow fix manifest v020 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51906.2022.00061
- [category_other] ectc51906.2022.00061-F1-s10: 'air cooling to room temperature': proposed merge into the parent step's conditions (air cool) (source: audit_B)
- [target_missing] ectc51906.2022.00061-a-L04: stack_layers.thickness_um 6.5 (bonding_interface electroplated Cu (substrate), after TCB (conductor)) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00061-F1 (source: script)
- [target_missing] ectc51906.2022.00061-a-L05: stack_layers.thickness_um 1.8 (bonding_interface CuGa2 IMC (top) (bonding)) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00061-F1 (source: script)
- [target_missing] ectc51906.2022.00061-a-L06: stack_layers.thickness_um 9 (bonding_interface X-alloy (merged top and bottom layers) (bonding)) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00061-F1 (source: script)
- [target_missing] ectc51906.2022.00061-a-L07: stack_layers.thickness_um 1.8 (bonding_interface CuGa2 IMC (bottom) (bonding)) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00061-F1 (source: script)
- [target_missing] ectc51906.2022.00061-a-L08: stack_layers.thickness_um 6.5 (bonding_interface electroplated Cu (substrate), after TCB (conductor)) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00061-F1 (source: script)

## ectc51906.2022.00072
- [category_other] ectc51906.2022.00072-F1-s01: 'PIC fabrication in 90WG 300 mm platform': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [build_seq_unverified] ectc51906.2022.00072-a: TV in 2 tv_build flows (ectc51906.2022.00072-F1, ectc51906.2022.00072-F2); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing_preexisting] ectc51906.2022.00072-a-L02: stack_layers.thickness_um 0.15 (photonic top silicon (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00072-F1, ectc51906.2022.00072-F2 (source: script)
- [target_missing] ectc51906.2022.00072-a-L03: stack_layers.thickness_um 2 (photonic BOX (optical)) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00072-F1, ectc51906.2022.00072-F2 (source: script)

## ectc51906.2022.00106
- [build_seq_unverified] ectc51906.2022.00106-a: TV in 3 tv_build flows (ectc51906.2022.00106-F1, ectc51906.2022.00106-F2, ectc51906.2022.00106-F5); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing_preexisting] ectc51906.2022.00106-a-L02: stack_layers.thickness_um 725 (die Processor chip A and B (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00106-F1, ectc51906.2022.00106-F2, ectc51906.2022.00106-F5 (source: script)
- [target_missing] ectc51906.2022.00106-a-i1: interconnects.pitch_um 75 (die_to_bridge microbump) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00106-F1, ectc51906.2022.00106-F2, ectc51906.2022.00106-F5 (source: script)
- [target_missing_preexisting] ectc51906.2022.00106-b-L02: stack_layers.thickness_um 725 (die Processor chip A and B (device)) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00106-F3, ectc51906.2022.00106-F5 (source: script)
- [target_missing] ectc51906.2022.00106-b-i1: interconnects.pitch_um 75 (die_to_bridge microbump) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00106-F3, ectc51906.2022.00106-F5 (source: script)
- [target_missing] ectc51906.2022.00106-b-i2: interconnects.pitch_um 150 (die_to_substrate c4) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00106-F3, ectc51906.2022.00106-F5 (source: script)

## ectc51906.2022.00108
- [split_temp_untyped] ectc51906.2022.00108-F1-s03: press cure 150/180 C only in split | split names a temperature ('press cure 150 C / 180 C (Stiff B 1 mm)') but temp_c and temp_c_max are empty (source: audit_A;validator)

## ectc51906.2022.00113
- [category_other] ectc51906.2022.00113-F1-s13: 'form Cu pad pattern in SiCN bonding film (pad types A/B/C, T': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [split_temp_untyped] ectc51906.2022.00113-F2-s05: split names a temperature ('Temp1 < Temp2 < Temp3 within 250-400 C') but temp_c and temp_c_max are empty (source: validator)
- [untyped_condition] ectc51906.2022.00113-F2-s05: temp_c/temp_c_max empty but conditions has 's in the 250-400 C rang' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [target_missing] ectc51906.2022.00113-a-L06: stack_layers.thickness_um 0.01 (bonding_interface bonding layer (bonding)) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00113-F1 (source: script)
- [target_missing] ectc51906.2022.00113-b-L06: stack_layers.thickness_um 0.01 (bonding_interface bonding layer (bonding)) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00113-F1 (source: script)
