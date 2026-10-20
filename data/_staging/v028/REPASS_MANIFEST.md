# Targeted process-flow fix manifest v028 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## eptc53413.2021.9663896
- [category_other] eptc53413.2021.9663896-F2-s13: 'Adaptive Patterning: unit-specific via/RDL design per panel ': keyword proposal rdl_layer (source: script)

## eptc56328.2022.10013262
- [category_other] eptc56328.2022.10013262-F2-s02: 'panelization into 600 mm x 600 mm panel': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] eptc56328.2022.10013262-F2-s05: 'final test and BE2 at 300 mm sub-panel': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] eptc56328.2022.10013262-F2-s06: 'panelization into 300 mm round format': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] eptc56328.2022.10013262-F2-s08: 'final test and BE2 at 300 mm round': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] eptc56328.2022.10013262-F3-s02: 'planarization prior to RDL and via build-up (planar EMC surf': keyword proposal rdl_layer (source: script)
- [category_other] eptc56328.2022.10013262-F3-s04: 'generate unit-specific design fitting the as-built panel (re': keyword proposal no keyword match: choose an existing category or keep other (source: script)

## eptc59621.2023.10457612
- [target_missing] eptc59621.2023.10457612-F1-s02: heater line width 200 um (p.1) (source: audit_A)
- [target_missing] eptc59621.2023.10457612-F1-s03: sensor line width 20 um (p.1) (source: audit_A)
- [split_vs_route] eptc59621.2023.10457612-F1-s11: glass vs Si carrier changes the debond step (laser release vs mechanical shim-cutting, p.2 Fig. 3(l), p.3 Sec. II): route glass / Si, not split (source: audit_A)
- [untyped_condition] eptc59621.2023.10457612-F1-s14: temp_c/temp_c_max empty but conditions has 'nation above 200 C' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [split_vs_route] eptc59621.2023.10457612-F1-s20: glass vs Si carrier debond alternative in split: use route (source: audit_A)
- [generic_intro_candidate] eptc59621.2023.10457612-F1-s23: stated_in_flow but located only in p.2 Sec. I: generic_description unless the paper says it was executed (source: script)
- [target_missing_preexisting] eptc59621.2023.10457612-a-L03: stack_layers.thickness_um 321.04 (die Si substrate with DRIE pin-fins and channel trenches (core)) of TV a appears in no step target/conditions/split/thickness of flows eptc59621.2023.10457612-F1 (source: script)
- [target_missing] eptc59621.2023.10457612-a-L04: stack_layers.line_um 191.8 (die metal heater (device)) of TV a appears in no step target/conditions/split/thickness of flows eptc59621.2023.10457612-F1 (source: script)
- [target_missing_preexisting] eptc59621.2023.10457612-a-L04: stack_layers.thickness_um 3.6242 (die metal heater (device)) of TV a appears in no step target/conditions/split/thickness of flows eptc59621.2023.10457612-F1 (source: script)
- [target_missing] eptc59621.2023.10457612-a-L05: stack_layers.line_um 13.3 (die metal sensor (device)) of TV a appears in no step target/conditions/split/thickness of flows eptc59621.2023.10457612-F1 (source: script)
- [target_missing_preexisting] eptc59621.2023.10457612-a-L05: stack_layers.thickness_um 3.5196 (die metal sensor (device)) of TV a appears in no step target/conditions/split/thickness of flows eptc59621.2023.10457612-F1 (source: script)

## eptc59621.2023.10457912
- [split_temp_untyped] eptc59621.2023.10457912-F1-s08: split names a temperature ('300 / 350 / 400 C') but temp_c and temp_c_max are empty (source: validator)

## eptc59621.2023.10457918
- [full_without_typed_condition] eptc59621.2023.10457918: process_flow_level full but no step has a typed process condition (temp_c, temp_c_max, time_s, ramp_c_per_min, pressure_mpa, force_n, atmosphere, dose_mj_cm2, current_density_ma_cm2) (source: validator)
- [untyped_condition] eptc59621.2023.10457918-F1-s06: pressure_mpa empty but conditions has 'uced by 0.2-0.25 bar' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [untyped_condition] eptc59621.2023.10457918-F1-s07: pressure_mpa empty but conditions has 'by a further 0.2 bar; rel' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [category_other] eptc59621.2023.10457918-F1-s13: 'filing and edge chamfer of diced chips': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing_preexisting] eptc59621.2023.10457918-a-L02: stack_layers.thickness_um 150 (glass_core glass wafer with TGV (core)) of TV a appears in no step target/conditions/split/thickness of flows eptc59621.2023.10457918-F1 (source: script)
- [target_missing] eptc59621.2023.10457918-a-i2: interconnects.pitch_um 500 (unspecified other) of TV a appears in no step target/conditions/split/thickness of flows eptc59621.2023.10457918-F1 | interconnects.diameter_um 300 (unspecified other) of TV a appears in no step target/conditions/split/thickness of flows eptc59621.2023.10457918-F1 (source: script)
- [target_missing] eptc59621.2023.10457918-a-i3: interconnects.pitch_um 150 (unspecified bga) of TV a appears in no step target/conditions/split/thickness of flows eptc59621.2023.10457918-F1 | interconnects.diameter_um 70 (unspecified bga) of TV a appears in no step target/conditions/split/thickness of flows eptc59621.2023.10457918-F1 (source: script)
- [target_missing] eptc59621.2023.10457918-a-i4: interconnects.pitch_um 800 (unspecified unspecified) of TV a appears in no step target/conditions/split/thickness of flows eptc59621.2023.10457918-F1 | interconnects.diameter_um 400 (unspecified unspecified) of TV a appears in no step target/conditions/split/thickness of flows eptc59621.2023.1045791 (source: script)
