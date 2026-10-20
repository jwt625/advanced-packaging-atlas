# Targeted process-flow fix manifest v022 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51906.2022.00180
- [full_without_typed_condition] ectc51906.2022.00180: process_flow_level full but no step has a typed process condition (temp_c, temp_c_max, time_s, ramp_c_per_min, pressure_mpa, force_n, atmosphere, dose_mj_cm2, current_density_ma_cm2) (source: validator)
- [build_seq_unverified] ectc51906.2022.00180-a: TV in 2 tv_build flows (ectc51906.2022.00180-F1, ectc51906.2022.00180-F2); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] ectc51906.2022.00180-a-L12: stack_layers.thickness_um 15 (substrate_buildup dielectric (dielectric)) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00180-F1, ectc51906.2022.00180-F2 (source: script)
- [target_missing] ectc51906.2022.00180-a-i1: interconnects.diameter_um 16 (rdl_via microvia) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00180-F1, ectc51906.2022.00180-F2 (source: script)
- [target_missing] ectc51906.2022.00180-a-i3: interconnects.pitch_um 55 (die_to_substrate cu_pillar) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00180-F1, ectc51906.2022.00180-F2 (source: script)
- [target_missing_preexisting] ectc51906.2022.00180-b-L09: stack_layers.thickness_um 260 (glass_core glass core (core)) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00180-F3 (source: script)
- [target_missing] ectc51906.2022.00180-b-L12: stack_layers.thickness_um 30 (interposer_rdl DL3 (dielectric)) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00180-F3 (source: script)
- [target_missing] ectc51906.2022.00180-b-L14: stack_layers.thickness_um 25 (interposer_rdl DL4 (dielectric)) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00180-F3 (source: script)
- [target_missing] ectc51906.2022.00180-b-i6: interconnects.pitch_min_um 40 (rdl_via microvia) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00180-F3 (source: script)

## ectc51906.2022.00181
- [untyped_condition] ectc51906.2022.00181-F1-s02: temp_c/temp_c_max empty but conditions has 'ie/substrate 235 C as g' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [target_missing_preexisting] ectc51906.2022.00181-a-L01: stack_layers.thickness_um 50 (die_stack ASIC top die (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00181-F1 (source: script)
- [target_missing_preexisting] ectc51906.2022.00181-a-L05: stack_layers.thickness_um 50 (die_stack memory bottom die (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00181-F1 (source: script)

## ectc51906.2022.00218
- [build_order] ectc51906.2022.00218-F1: Fig. 8 step 1 'Multi-ETR' (p.5) comes first: F2 (ETR RDL) precedes F1 (S-SWIFT assembly); set build_seq (source: audit_B)
- [split_misuse] ectc51906.2022.00218-F2-s01: split mixes the coating-level sweep (p.4 Fig. 4) with prototype vs modified dielectric for TVs c vs a/d (p.6 Table I): per-TV material as delta or note (source: audit_B)
- [build_seq_unverified] ectc51906.2022.00218-a: TV in 2 tv_build flows (ectc51906.2022.00218-F1, ectc51906.2022.00218-F2); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] ectc51906.2022.00218-b-L01: stack_layers.space_um 1 (interposer_rdl ETR Cu RDL with pad-less stacked via (conductor)) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00218-F2 (source: script)
- [target_missing] ectc51906.2022.00218-b-i2: interconnects.diameter_um 3.15 (rdl_via rdl_via) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00218-F2 (source: script)
- [target_missing] ectc51906.2022.00218-b-i3: interconnects.diameter_um 3.72 (rdl_via rdl_via) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00218-F2 (source: script)
- [target_missing] ectc51906.2022.00218-b-i4: interconnects.diameter_um 4.9 (rdl_via rdl_via) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00218-F2 (source: script)
- [target_missing] ectc51906.2022.00218-b-i5: interconnects.diameter_um 7.26 (rdl_via rdl_via) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00218-F2 (source: script)

## ectc51906.2022.00244
- [identical_delta_text] ectc51906.2022.00244-F1-s34: 2 delta rows of ectc51906.2022.00244-F1 have the same step text: ectc51906.2022.00244-F1-s34, ectc51906.2022.00244-F1-s35 (source: validator)
- [target_missing] ectc51906.2022.00244-a-L04: stack_layers.space_um 0.073 (die buried power rails (BPR) (conductor)) of TV a appears in no step target/conditions/split/thickness of flows ectc51906.2022.00244-F1 (source: script)
- [target_missing] ectc51906.2022.00244-b-L04: stack_layers.space_um 0.073 (die buried power rails (BPR) (conductor)) of TV b appears in no step target/conditions/split/thickness of flows ectc51906.2022.00244-F1 (source: script)
- [target_missing] ectc51906.2022.00244-c-L04: stack_layers.space_um 0.073 (die buried power rails (BPR) (conductor)) of TV c appears in no step target/conditions/split/thickness of flows ectc51906.2022.00244-F1 (source: script)

## ectc51906.2022.00303
- [untyped_condition] ectc51906.2022.00303-F3-s02: time_s empty but conditions has 'pulse/purge 0.06 s/10 s' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [target_missing] ectc51906.2022.00303-c-L01: stack_layers.thickness_um 30 (interposer_rdl Si-IF RDL (conductor)) of TV c appears in no step target/conditions/split/thickness of flows ectc51906.2022.00303-F1 (source: script)
- [target_missing_preexisting] ectc51906.2022.00303-c-L02: stack_layers.thickness_um 500 (interposer TSV-less interposer Si (mechanical support) (core)) of TV c appears in no step target/conditions/split/thickness of flows ectc51906.2022.00303-F1 (source: script)
- [target_missing_preexisting] ectc51906.2022.00303-d-L02: stack_layers.thickness_um 123 (die mimic dielet Si mesa (device)) of TV d appears in no step target/conditions/split/thickness of flows ectc51906.2022.00303-F2 (source: script)
- [target_missing] ectc51906.2022.00303-d-L03: stack_layers.thickness_um 277 (other Cu TPV fill (bottom-up ECD) (conductor)) of TV d appears in no step target/conditions/split/thickness of flows ectc51906.2022.00303-F2 (source: script)
- [target_missing] ectc51906.2022.00303-d-L04: stack_layers.thickness_um 203 (other SU-8 isolation wall (dielectric)) of TV d appears in no step target/conditions/split/thickness of flows ectc51906.2022.00303-F2 (source: script)
- [target_missing_preexisting] ectc51906.2022.00303-d-L06: stack_layers.thickness_um 410 (other Si wafer under TPV trench (carrier)) of TV d appears in no step target/conditions/split/thickness of flows ectc51906.2022.00303-F2 (source: script)
- [target_missing] ectc51906.2022.00303-e-L05: stack_layers.thickness_um 510 (other SU-8 TPV walls (dielectric)) of TV e appears in no step target/conditions/split/thickness of flows ectc51906.2022.00303-F3 (source: script)
