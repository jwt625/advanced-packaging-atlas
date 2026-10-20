# Targeted process-flow fix manifest v015 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51846.2026.00153
- [category_other] ectc51846.2026.00153-F1-s06: 'TBF trimmed around glass carrier edges': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [untyped_condition] ectc51846.2026.00153-F1-s17: pressure_mpa empty but conditions has '30 C, 600 s; 4.0 MPa on 3' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [category_other] ectc51846.2026.00153-F2-s02: 'TBF trimmed around glass carrier edges': keyword proposal no keyword match: choose an existing category or keep other (source: script)

## ectc51846.2026.00156
- [category_other] ectc51846.2026.00156-F1-s08: 'TIM conditioning: circulate 50 C coolant with chip at full T': keyword proposal no keyword match: choose an existing category or keep other (source: script)

## ectc51846.2026.00176
- [build_seq_unverified] ectc51846.2026.00176-a: TV in 4 tv_build flows (ectc51846.2026.00176-F1, ectc51846.2026.00176-F2, ectc51846.2026.00176-F3, ectc51846.2026.00176-F4); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] ectc51846.2026.00176-a-L06: stack_layers.thickness_um 13.8 (bonding_interface L1 micro bumps (PIC to top die) (bonding)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00176-F1, ectc51846.2026.00176-F2, ectc51846.2026.00176-F3, ectc51846.2026.00176-F4 (source: script)
- [target_missing] ectc51846.2026.00176-a-i2: interconnects.diameter_um 10 (through_via tsv) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00176-F1, ectc51846.2026.00176-F2, ectc51846.2026.00176-F3, ectc51846.2026.00176-F4 (source: script)

## ectc51846.2026.00183
- [category_other] ectc51846.2026.00183-F1-s01: 'form Cu wires (daisy-chain wiring layers)': keyword proposal rdl_layer (source: script)

## ectc51846.2026.00187
- [split_temp_untyped] ectc51846.2026.00187-F1-s07: split names a temperature ('210 C / 350 C, 2 h each') but temp_c and temp_c_max are empty (source: validator)
- [untyped_condition] ectc51846.2026.00187-F1-s07: temp_c/temp_c_max empty but conditions has '200-350 C by e' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [category_other] ectc51846.2026.00187-F1-s08: 'post-bonding integration to make bonded wafers electrically ': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing] ectc51846.2026.00187-a-L04: stack_layers.via_diameter_um 0.15 (die_stack top oxide with top bonding via (dielectric)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00187-F1 | stack_layers.via_pitch_um 0.3 (die_stack top oxide with top bonding via (dielectric)) of TV a appears in no step t (source: script)
- [target_missing] ectc51846.2026.00187-a-L05: stack_layers.via_diameter_um 0.15 (die_stack top SiCN bonding layer (bonding)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00187-F1 | stack_layers.via_pitch_um 0.3 (die_stack top SiCN bonding layer (bonding)) of TV a appears in no step target/conditions/split (source: script)
- [target_missing] ectc51846.2026.00187-a-L06: stack_layers.via_diameter_um 0.15 (die_stack bottom SiCN bonding layer (bonding)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00187-F1 | stack_layers.via_pitch_um 0.3 (die_stack bottom SiCN bonding layer (bonding)) of TV a appears in no step target/conditions (source: script)
- [target_missing] ectc51846.2026.00187-a-L07: stack_layers.via_diameter_um 0.15 (die_stack bottom oxide with bottom bonding via (dielectric)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00187-F1 | stack_layers.via_pitch_um 0.3 (die_stack bottom oxide with bottom bonding via (dielectric)) of TV a appears  (source: script)
- [target_missing] ectc51846.2026.00187-a-i1: interconnects.pitch_um 0.3 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00187-F1 | interconnects.diameter_um 0.15 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ec (source: script)
- [target_missing] ectc51846.2026.00187-a-i2: interconnects.pitch_um 0.4 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00187-F1 | interconnects.diameter_um 0.2 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ect (source: script)
- [target_missing] ectc51846.2026.00187-a-i3: interconnects.pitch_um 0.5 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00187-F1 (source: script)
- [target_missing] ectc51846.2026.00187-a-i4: interconnects.pitch_min_um 0.8 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00187-F1 | interconnects.pitch_max_um 1 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows  (source: script)
- [target_missing] ectc51846.2026.00187-b-L04: stack_layers.via_diameter_um 0.15 (die_stack top oxide with top bonding via (dielectric)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00187-F1 | stack_layers.via_pitch_um 0.3 (die_stack top oxide with top bonding via (dielectric)) of TV b appears in no step t (source: script)
- [target_missing] ectc51846.2026.00187-b-L05: stack_layers.via_diameter_um 0.15 (die_stack top SiCN bonding layer (bonding)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00187-F1 | stack_layers.via_pitch_um 0.3 (die_stack top SiCN bonding layer (bonding)) of TV b appears in no step target/conditions/split (source: script)
- [target_missing] ectc51846.2026.00187-b-L06: stack_layers.via_diameter_um 0.15 (die_stack bottom SiCN bonding layer (bonding)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00187-F1 | stack_layers.via_pitch_um 0.3 (die_stack bottom SiCN bonding layer (bonding)) of TV b appears in no step target/conditions (source: script)
- [target_missing] ectc51846.2026.00187-b-L07: stack_layers.via_diameter_um 0.15 (die_stack bottom oxide with bottom bonding via (dielectric)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00187-F1 | stack_layers.via_pitch_um 0.3 (die_stack bottom oxide with bottom bonding via (dielectric)) of TV b appears  (source: script)
- [target_missing] ectc51846.2026.00187-b-i1: interconnects.pitch_min_um 0.3 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00187-F1 | interconnects.pitch_max_um 1 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV b appears in no step target/conditions/split/thickness of flows  (source: script)
