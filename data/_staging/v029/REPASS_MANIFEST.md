# Targeted process-flow fix manifest v029 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## eptc67330.2025.11392108
- [category_other] eptc67330.2025.11392108-F1-s08: 'cavity making in B substrate for each AiP unit': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [build_seq_unverified] eptc67330.2025.11392108-a: TV in 2 tv_build flows (eptc67330.2025.11392108-F1, eptc67330.2025.11392108-F2); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing_preexisting] eptc67330.2025.11392108-a-L01: stack_layers.thickness_um 450 (substrate_core A substrate (antenna substrate) (core)) of TV a appears in no step target/conditions/split/thickness of flows eptc67330.2025.11392108-F1, eptc67330.2025.11392108-F2 (source: script)
- [target_missing_preexisting] eptc67330.2025.11392108-a-L03: stack_layers.thickness_um 800 (substrate_core B substrate (interposer) (core)) of TV a appears in no step target/conditions/split/thickness of flows eptc67330.2025.11392108-F1, eptc67330.2025.11392108-F2 (source: script)
- [target_missing] eptc67330.2025.11392108-a-L04: stack_layers.thickness_um 120 (underfill A/B unit to C substrate joint gap with underfill (encapsulant)) of TV a appears in no step target/conditions/split/thickness of flows eptc67330.2025.11392108-F1, eptc67330.2025.11392108-F2 (source: script)
- [target_missing_preexisting] eptc67330.2025.11392108-a-L05: stack_layers.thickness_um 230 (substrate_core C substrate (IC carrier) (core)) of TV a appears in no step target/conditions/split/thickness of flows eptc67330.2025.11392108-F1, eptc67330.2025.11392108-F2 (source: script)
- [target_missing_preexisting] eptc67330.2025.11392108-a-L06: stack_layers.thickness_um 625 (die RF IC CSP in B substrate cavity (device)) of TV a appears in no step target/conditions/split/thickness of flows eptc67330.2025.11392108-F1, eptc67330.2025.11392108-F2 (source: script)
- [target_missing] eptc67330.2025.11392108-a-i3: interconnects.diameter_um 230 (other solder_ball) of TV a appears in no step target/conditions/split/thickness of flows eptc67330.2025.11392108-F1, eptc67330.2025.11392108-F2 (source: script)

## eptc67330.2025.11392132
- [category_other] eptc67330.2025.11392132-F1-s14: 'evacuate channel via open ports to < 0.13 Pa': keyword proposal tsv_tgv_formation or etch_dry/etch_wet (via formation) (source: script)
- [category_other] eptc67330.2025.11392132-F1-s15: 'charge working fluid by volumetric measurement': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] eptc67330.2025.11392132-F1-s16: 'seal fill ports': keyword proposal no keyword match: choose an existing category or keep other (source: script)

## eptc67330.2025.11392593
- [category_other] eptc67330.2025.11392593-F2-s02: 'form Cu posts on panel': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing] eptc67330.2025.11392593-a-L04: stack_layers.line_um 7 (fan_out_rdl top-side RDL metal layers (conductor)) of TV a appears in no step target/conditions/split/thickness of flows eptc67330.2025.11392593-F1 | stack_layers.space_um 7 (fan_out_rdl top-side RDL metal layers (conductor)) of TV a appears in no step target/conditions/split (source: script)

## estc60143.2024.10712070
- [full_without_typed_condition] estc60143.2024.10712070: process_flow_level full but no step has a typed process condition (temp_c, temp_c_max, time_s, ramp_c_per_min, pressure_mpa, force_n, atmosphere, dose_mj_cm2, current_density_ma_cm2) (source: validator)
- [level_regrade] estc60143.2024.10712070: full without typed condition; materials only, anneal a 250-300 C range: looks ordered (spot read) (source: audit_B)
- [untyped_condition] estc60143.2024.10712070-F1-s13: time_s empty but conditions has 'between (e.g. 12 s base' (type it if single-valued and stated; ranges stay in conditions) (source: script)

## estc60143.2024.10712129
- [target_missing] estc60143.2024.10712129-a-i1: interconnects.pitch_um 15 (die_to_interposer microbump) of TV a appears in no step target/conditions/split/thickness of flows estc60143.2024.10712129-F1 | interconnects.diameter_um 10 (die_to_interposer microbump) of TV a appears in no step target/conditions/split/thickness of flows estc60143.2024.1 (source: script)
- [target_missing] estc60143.2024.10712129-b-i1: interconnects.pitch_um 15 (die_to_interposer microbump) of TV b appears in no step target/conditions/split/thickness of flows estc60143.2024.10712129-F1 | interconnects.diameter_um 7.5 (die_to_interposer microbump) of TV b appears in no step target/conditions/split/thickness of flows estc60143.2024. (source: script)
- [target_missing] estc60143.2024.10712129-c-i1: interconnects.pitch_um 10 (die_to_interposer microbump) of TV c appears in no step target/conditions/split/thickness of flows estc60143.2024.10712129-F1 | interconnects.diameter_um 5 (die_to_interposer microbump) of TV c appears in no step target/conditions/split/thickness of flows estc60143.2024.10 (source: script)
- [target_missing_preexisting] estc60143.2024.10712129-g-L01: stack_layers.thickness_um 675 (die Die A / Die B (device)) of TV g appears in no step target/conditions/split/thickness of flows estc60143.2024.10712129-F5 (source: script)
- [target_missing] estc60143.2024.10712129-g-L07: stack_layers.thickness_um 17 (solder_mask top solder resist (passivation)) of TV g appears in no step target/conditions/split/thickness of flows estc60143.2024.10712129-F5 (source: script)
- [target_missing] estc60143.2024.10712129-g-L08: stack_layers.thickness_um 15 (substrate_buildup build-up film (dielectric)) of TV g appears in no step target/conditions/split/thickness of flows estc60143.2024.10712129-F5 (source: script)
- [target_missing_preexisting] estc60143.2024.10712129-g-L09: stack_layers.thickness_um 1300 (substrate_core core (core)) of TV g appears in no step target/conditions/split/thickness of flows estc60143.2024.10712129-F5 (source: script)
- [target_missing] estc60143.2024.10712129-g-L10: stack_layers.thickness_um 15 (substrate_buildup build-up film (dielectric)) of TV g appears in no step target/conditions/split/thickness of flows estc60143.2024.10712129-F5 (source: script)
- [target_missing] estc60143.2024.10712129-g-L11: stack_layers.thickness_um 17 (solder_mask bottom solder resist (passivation)) of TV g appears in no step target/conditions/split/thickness of flows estc60143.2024.10712129-F5 (source: script)
- [target_missing] estc60143.2024.10712129-g-i1: interconnects.diameter_um 22 (die_to_interposer microbump) of TV g appears in no step target/conditions/split/thickness of flows estc60143.2024.10712129-F5 (source: script)
- [target_missing] estc60143.2024.10712129-g-i2: interconnects.diameter_um 18 (die_to_interposer microbump) of TV g appears in no step target/conditions/split/thickness of flows estc60143.2024.10712129-F5 (source: script)
- [target_missing_preexisting] estc60143.2024.10712129-h-L01: stack_layers.thickness_um 675 (die Die A / Die B (device)) of TV h appears in no step target/conditions/split/thickness of flows estc60143.2024.10712129-F5 (source: script)
- [target_missing] estc60143.2024.10712129-h-L07: stack_layers.thickness_um 17 (solder_mask top solder resist (passivation)) of TV h appears in no step target/conditions/split/thickness of flows estc60143.2024.10712129-F5 (source: script)
- [target_missing] estc60143.2024.10712129-h-L08: stack_layers.thickness_um 15 (substrate_buildup build-up film (dielectric)) of TV h appears in no step target/conditions/split/thickness of flows estc60143.2024.10712129-F5 (source: script)
- [target_missing_preexisting] estc60143.2024.10712129-h-L09: stack_layers.thickness_um 1300 (substrate_core core (core)) of TV h appears in no step target/conditions/split/thickness of flows estc60143.2024.10712129-F5 (source: script)
- [target_missing] estc60143.2024.10712129-h-L10: stack_layers.thickness_um 15 (substrate_buildup build-up film (dielectric)) of TV h appears in no step target/conditions/split/thickness of flows estc60143.2024.10712129-F5 (source: script)
- [target_missing] estc60143.2024.10712129-h-L11: stack_layers.thickness_um 17 (solder_mask bottom solder resist (passivation)) of TV h appears in no step target/conditions/split/thickness of flows estc60143.2024.10712129-F5 (source: script)
- [target_missing] estc60143.2024.10712129-h-i1: interconnects.diameter_um 22 (die_to_interposer microbump) of TV h appears in no step target/conditions/split/thickness of flows estc60143.2024.10712129-F5 (source: script)
- [target_missing] estc60143.2024.10712129-h-i2: interconnects.diameter_um 18 (die_to_interposer microbump) of TV h appears in no step target/conditions/split/thickness of flows estc60143.2024.10712129-F5 (source: script)
