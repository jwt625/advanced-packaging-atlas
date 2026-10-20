# Targeted process-flow fix manifest v023 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51906.2022.00332
- [category_other] ectc51906.2022.00332-F1-s02: 'fabricate Si-IF Cu wiring by BEOL Cu damascene or dual damas': proposed rdl_layer (source: audit_B)
- [category_other] ectc51906.2022.00332-F2-s01: 'Si-IF metal layer 1 fabrication with some wafer cleaning ste': keyword proposal rdl_layer (source: script)
- [category_other] ectc51906.2022.00332-F2-s03: 'Si-IF metal layer 2 fabrication': proposed rdl_layer (source: audit_B)

## ectc51909.2023.00008
- [category_other] ectc51909.2023.00008-F1-s01: 'fabricate bond pad via (BPV) and bond pad metal (BPM) by BEO': proposed rdl_layer (source: audit_B)

## ectc51909.2023.00009
- [category_other] ectc51909.2023.00009-F1-s01: 'Implantation steps for MRR PN/PIN junctions and access paths': keyword proposal device_fab (proposed category, not in schema v2.5: keep other) (source: script)
- [category_other] ectc51909.2023.00009-F1-s04: 'Additional implantation on MRR slab': keyword proposal device_fab (proposed category, not in schema v2.5: keep other) (source: script)
- [build_seq_unverified] ectc51909.2023.00009-a: TV in 5 tv_build flows (ectc51909.2023.00009-F1, ectc51909.2023.00009-F2, ectc51909.2023.00009-F3, ectc51909.2023.00009-F4, ectc51909.2023.00009-F5); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] ectc51909.2023.00009-a-L12: stack_layers.thickness_um 0.11 (photonic thermal heater (conductor)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00009-F1, ectc51909.2023.00009-F2, ectc51909.2023.00009-F3, ectc51909.2023.00009-F4, ectc51909.2023.00009-F5 (source: script)
- [target_missing] ectc51909.2023.00009-a-L20: stack_layers.thickness_um 0.8 (photonic BOX (optical)) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00009-F1, ectc51909.2023.00009-F2, ectc51909.2023.00009-F3, ectc51909.2023.00009-F4, ectc51909.2023.00009-F5 (source: script)
- [target_missing] ectc51909.2023.00009-a-i7: interconnects.pitch_um 80 (interposer_to_substrate other) of TV a appears in no step target/conditions/split/thickness of flows ectc51909.2023.00009-F1, ectc51909.2023.00009-F2, ectc51909.2023.00009-F3, ectc51909.2023.00009-F4, ectc51909.2023.00009-F5 (source: script)

## ectc51909.2023.00023
- [full_without_typed_condition] ectc51909.2023.00023: process_flow_level full but no step has a typed process condition (temp_c, temp_c_max, time_s, ramp_c_per_min, pressure_mpa, force_n, atmosphere, dose_mj_cm2, current_density_ma_cm2) (source: validator)
- [level_regrade] ectc51909.2023.00023: full without typed condition; anneal 250-300 C range only: looks ordered (spot read) (source: audit_B)
- [untyped_condition] ectc51909.2023.00023-F1-s08: 250-300 C range in conditions only | temp_c/temp_c_max empty but conditions has '250 to 300 C; 250' (type it if single-valued and stated; ranges stay in conditions) (source: audit_B;script)

## ectc51909.2023.00048
- [category_other] ectc51909.2023.00048-F1-s01: 'fabricate Si photonics (PIC) wafer in low-loss SiPh process': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51909.2023.00048-F1-s13: 'dielectric stress relief process (shifts bow positive)': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51909.2023.00048-F1-s23: 'remove bulk Si from top surface to reveal BEOL': keyword proposal rdl_layer (source: script)
