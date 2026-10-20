# Targeted process-flow fix manifest v034 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## tcpmt.2025.3557745
- [category_other] tcpmt.2025.3557745-F1-s01: 'drill rectangular through cavities in substrates': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] tcpmt.2025.3557745-F1-s02: 'laser-cut metal-polymer composite magnetic sheet to fit cavi': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] tcpmt.2025.3557745-F1-s14: 'drill via through magnetic core to top-layer pad (study/meas': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing_preexisting] tcpmt.2025.3557745-a-L03: stack_layers.thickness_um 200 (other upper magnetic core (core)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.3557745-F1 (source: script)
- [target_missing_preexisting] tcpmt.2025.3557745-a-L07: stack_layers.thickness_um 200 (other lower magnetic core (core)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.3557745-F1 (source: script)

## tcpmt.2025.3599484
- [category_other] tcpmt.2025.3599484-F1-s02: 'soft bake on hotplate': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] tcpmt.2025.3599484-F3-s01: 'cap ETR top surface with Ti using one additional mask': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] tcpmt.2025.3599484-F4-s05: 'Cu overburden removal': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing] tcpmt.2025.3599484-a-i2: interconnects.diameter_um 5 (rdl_via stacked_via) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.3599484-F1 (source: script)
- [target_missing] tcpmt.2025.3599484-a-i5: interconnects.pitch_um 50 (rdl_via rdl_via) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.3599484-F1 | interconnects.diameter_um 10 (rdl_via rdl_via) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.3599484-F1 (source: script)
- [target_missing] tcpmt.2025.3599484-b-L01: stack_layers.line_um 2 (interposer_rdl SAP Cu trace (conductor)) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2025.3599484-F2 | stack_layers.space_um 2 (interposer_rdl SAP Cu trace (conductor)) of TV b appears in no step target/conditions/split/thickness of flows tcpmt (source: script)
- [target_missing] tcpmt.2025.3599484-b-i1: interconnects.pitch_um 50 (rdl_via rdl_via) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2025.3599484-F2 | interconnects.diameter_um 10 (rdl_via rdl_via) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2025.3599484-F2 (source: script)
- [build_seq_unverified] tcpmt.2025.3599484-c: TV in 2 tv_build flows (tcpmt.2025.3599484-F1, tcpmt.2025.3599484-F3); build_seq is the flow-number default: confirm the order (source: script)

## tcpmt.2025.3610036
- [full_without_typed_condition] tcpmt.2025.3610036: process_flow_level full but no step has a typed process condition (temp_c, temp_c_max, time_s, ramp_c_per_min, pressure_mpa, force_n, atmosphere, dose_mj_cm2, current_density_ma_cm2) (source: validator)
- [identical_delta_text] tcpmt.2025.3610036-F1-s08: same ESI CornerStone laser step for a and b (s08/s09, p.4 Sec. IV.A): one shared step, TV-a target in split | 2 delta rows of tcpmt.2025.3610036-F1 have the same step text: tcpmt.2025.3610036-F1-s08, tcpmt.2025.3610036-F1-s09 (source: audit_B;validator)
- [target_missing_preexisting] tcpmt.2025.3610036-a-L04: stack_layers.thickness_um 60 (substrate_core laminate core (core)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.3610036-F1 (source: script)
- [target_missing] tcpmt.2025.3610036-a-i1: interconnects.diameter_um 1.26 (rdl_via microvia) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.3610036-F1 (source: script)
- [target_missing] tcpmt.2025.3610036-a-i2: interconnects.pitch_um 5.3 (rdl_via microvia) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.3610036-F1 | interconnects.diameter_um 1.7 (rdl_via microvia) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.3610036-F1 (source: script)
- [target_missing] tcpmt.2025.3610036-b-L03: stack_layers.thickness_um 2 (substrate_core top Cu cladding (landing) (conductor)) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2025.3610036-F1 (source: script)
- [target_missing_preexisting] tcpmt.2025.3610036-b-L04: stack_layers.thickness_um 60 (substrate_core laminate core (core)) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2025.3610036-F1 (source: script)
- [target_missing] tcpmt.2025.3610036-b-L05: stack_layers.thickness_um 2 (substrate_core bottom Cu cladding (conductor)) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2025.3610036-F1 (source: script)
- [target_missing] tcpmt.2025.3610036-b-i1: interconnects.diameter_um 3.06 (rdl_via microvia) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2025.3610036-F1 (source: script)

## tcpmt.2025.3628798
- [flow_tv_ids] tcpmt.2025.3628798-F2: damascene landing-pad flow lists only TV a; CUF TV b bonds to the same Cu-pad landing die (p.7 Fig. 22; p.2 Sec. I): tv_ids a;b or a TV-b note (source: audit_B)
- [alternative_flow_same_tv] tcpmt.2025.3628798-F4: photo-patternable WLUF (p.5 Fig. 14) is an alternative to F1 s09-s12 on TV a: route inside F1 (s09-s12 route 'CMP reveal') or scope comparison (source: audit_B)
- [target_missing] tcpmt.2025.3628798-F6-s04: landing-bump diameters 6 um Cu / 13 um Ni, Co (p.3 Fig. 8 labels) (source: audit_B)
- [flow_level] tcpmt.2025.3628798-F7: F7 full without typed T/t/P (only plasma-temperature split and atmosphere) -> ordered (source: audit_B)
- [missing_step] tcpmt.2025.3628798-F7-s04: add 'reflow at 140 C' after s04 (temp_c 140, p.11 Fig. 33 caption) (source: audit_B)
- [split_temp_untyped] tcpmt.2025.3628798-F7-s04: split names a temperature ('plasma clean temperature 140 / 160 / 180 C (Fig. 33)') but temp_c and temp_c_max are empty (source: validator)
- [build_seq_unverified] tcpmt.2025.3628798-a: TV in 4 tv_build flows (tcpmt.2025.3628798-F1, tcpmt.2025.3628798-F2, tcpmt.2025.3628798-F3, tcpmt.2025.3628798-F4); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] tcpmt.2025.3628798-a-L03: stack_layers.thickness_um 0.16 (bonding_interface barrier/seed (seed)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.3628798-F1, tcpmt.2025.3628798-F2, tcpmt.2025.3628798-F3, tcpmt.2025.3628798-F4 (source: script)
- [target_missing] tcpmt.2025.3628798-a-L08: stack_layers.thickness_um 0.5 (bonding_interface damascene pad Cu (surface_finish)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.3628798-F1, tcpmt.2025.3628798-F2, tcpmt.2025.3628798-F3, tcpmt.2025.3628798-F4 (source: script)
- [target_missing] tcpmt.2025.3628798-a-L09: stack_layers.thickness_um 0.5 (bonding_interface damascene pad Ni (barrier)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.3628798-F1, tcpmt.2025.3628798-F2, tcpmt.2025.3628798-F3, tcpmt.2025.3628798-F4 (source: script)
- [build_seq_unverified] tcpmt.2025.3628798-b: TV in 2 tv_build flows (tcpmt.2025.3628798-F1, tcpmt.2025.3628798-F5); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] tcpmt.2025.3628798-c-L02: stack_layers.thickness_um 0.15 (bonding_interface seed (seed)) of TV c appears in no step target/conditions/split/thickness of flows tcpmt.2025.3628798-F6 (source: script)
- [target_missing] tcpmt.2025.3628798-c-L03: stack_layers.thickness_um 0.01 (bonding_interface barrier (barrier)) of TV c appears in no step target/conditions/split/thickness of flows tcpmt.2025.3628798-F6 (source: script)
- [target_missing] tcpmt.2025.3628798-d-L02: stack_layers.thickness_um 0.01 (bonding_interface Cu flash (seed)) of TV d appears in no step target/conditions/split/thickness of flows tcpmt.2025.3628798-F7 (source: script)

## tcpmt.2026.3650893
- [split_temp_untyped] tcpmt.2026.3650893-F1-s03: split names a temperature ('120 C, 250 ms DEZ and H2O pulses, 20 s purge / 150 C, 1 s pu') but temp_c and temp_c_max are empty (source: validator)
- [untyped_condition] tcpmt.2026.3650893-F2-s01: time_s empty but conditions has '1 s DEZ' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [untyped_condition] tcpmt.2026.3650893-F3-s03: time_s empty but conditions has 'DEZ pulse 8 s, H2O' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [target_missing] tcpmt.2026.3650893-a-L01: stack_layers.via_diameter_um 75 (die top die (device)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2026.3650893-F1 | stack_layers.via_pitch_um 165 (die top die (device)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2026.3650893-F1 (source: script)
- [target_missing] tcpmt.2026.3650893-a-L02: stack_layers.via_diameter_um 240 (die top die (device)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2026.3650893-F1 (source: script)
- [target_missing] tcpmt.2026.3650893-c-L05: stack_layers.thickness_um 1 (bonding_interface MOF underfill in die-to-substrate gap (dielectric)) of TV c appears in no step target/conditions/split/thickness of flows tcpmt.2026.3650893-F3 (source: script)
- [target_missing] tcpmt.2026.3650893-c-L07: stack_layers.thickness_um 0.4 (bonding_interface Cu pillar (conductor)) of TV c appears in no step target/conditions/split/thickness of flows tcpmt.2026.3650893-F3 (source: script)
- [target_missing] tcpmt.2026.3650893-c-L10: stack_layers.thickness_um 0.3 (die bottom Cu RDL (conductor)) of TV c appears in no step target/conditions/split/thickness of flows tcpmt.2026.3650893-F3 (source: script)
