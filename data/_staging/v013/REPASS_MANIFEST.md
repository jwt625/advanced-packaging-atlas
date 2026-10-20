# Targeted process-flow fix manifest v013 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51846.2026.00074
- [target_missing] ectc51846.2026.00074-d-L01: stack_layers.line_um 10 (substrate_buildup photoresist (patterned) (other)) of TV d appears in no step target/conditions/split/thickness of flows ectc51846.2026.00074-F2 | stack_layers.space_um 10 (substrate_buildup photoresist (patterned) (other)) of TV d appears in no step target/conditions/split/ (source: script)

## ectc51846.2026.00092
- [category_other] ectc51846.2026.00092-F1-s03: 'Si micropillar formation on backside of the 4 SoC dies using': proposed device_fab (proposed category, not in schema v2.5: keep other; Si micropillars) (source: audit_B)

## ectc51846.2026.00096
- [untyped_condition] ectc51846.2026.00096-F1-s22: temp_c/temp_c_max empty but conditions has 'nation above 200 C for' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [build_seq_unverified] ectc51846.2026.00096-a: TV in 2 tv_build flows (ectc51846.2026.00096-F1, ectc51846.2026.00096-F2); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] ectc51846.2026.00096-a-L06: stack_layers.line_um 19.82 (die Ti RTD sensor (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00096-F1, ectc51846.2026.00096-F2 (source: script)
- [target_missing] ectc51846.2026.00096-a-L07: stack_layers.via_diameter_um 99.62 (die dielectric passivation (passivation)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00096-F1, ectc51846.2026.00096-F2 (source: script)

## ectc51846.2026.00106
- [full_without_typed_condition] ectc51846.2026.00106: process_flow_level full but no step has a typed process condition (temp_c, temp_c_max, time_s, ramp_c_per_min, pressure_mpa, force_n, atmosphere, dose_mj_cm2, current_density_ma_cm2) (source: validator)
- [level_regrade] ectc51846.2026.00106: full without typed condition; untyped 325-425 C ion-exchange range (source: audit_B)
- [category_other] ectc51846.2026.00106-F1-s04: 'thermal silver ion exchange': keyword proposal ion_exchange (proposed category, not in schema v2.5: keep other) (source: script)
- [untyped_condition] ectc51846.2026.00106-F1-s04: temp_c/temp_c_max empty but conditions has 'T=325..425 C (Fig' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [category_other] ectc51846.2026.00106-F1-s06: 'thermal sodium ion exchange (second IOX)': keyword proposal ion_exchange (proposed category, not in schema v2.5: keep other) (source: script)
- [untyped_condition] ectc51846.2026.00106-F1-s06: temp_c/temp_c_max empty but conditions has 'T=325..425 C (Fig' (type it if single-valued and stated; ranges stay in conditions) (source: script)

## ectc51846.2026.00110
- [category_other] ectc51846.2026.00110-F4-s04: 'squeegee removal of excess core material': keyword proposal no keyword match: choose an existing category or keep other (source: script)
