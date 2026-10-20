# Targeted process-flow fix manifest v004 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51529.2024.00125
- [category_other] ectc51529.2024.00125-F1-s07: 'form WAT probe pads on top of TSVs': keyword proposal tsv_tgv_formation or etch_dry/etch_wet (via formation) (source: script)

## ectc51529.2024.00128
- [target_missing] ectc51529.2024.00128-F1-s02: 0.64 / 0.48 / 0.36 (0.33x0.4) um pitch (p.3 Sec. III.A) (source: audit_A)
- [target_missing] ectc51529.2024.00128-F1-s03: 0.64 / 0.48 / 0.36 (0.33x0.4) um pitch (p.3 Sec. III.A) (source: audit_A)
- [target_missing] ectc51529.2024.00128-a-i1: interconnects.pitch_um 0.64 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00128-F1 (source: script)
- [target_missing] ectc51529.2024.00128-a-i2: interconnects.pitch_um 0.48 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00128-F1 (source: script)
- [target_missing] ectc51529.2024.00128-a-i3: interconnects.pitch_um 0.36 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00128-F1 | interconnects.pitch_min_um 0.33 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows  (source: script)

## ectc51529.2024.00133
- [full_without_typed_condition] ectc51529.2024.00133: process_flow_level full but no step has a typed process condition (temp_c, temp_c_max, time_s, ramp_c_per_min, pressure_mpa, force_n, atmosphere, dose_mj_cm2, current_density_ma_cm2) (source: validator)
- [target_missing] ectc51529.2024.00133-a-L02: stack_layers.thickness_um 6 (coupon ABF (dielectric)) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00133-F1 (source: script)
- [target_missing_preexisting] ectc51529.2024.00133-a-L04: stack_layers.thickness_um 400 (coupon glass substrate (carrier)) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00133-F1 (source: script)

## ectc51529.2024.00151
- [target_missing] ectc51529.2024.00151-a-L04: stack_layers.line_um 10 (fan_out_rdl FO-RDL metal (conductor)) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00151-F3 | stack_layers.space_um 10 (fan_out_rdl FO-RDL metal (conductor)) of TV a appears in no step target/conditions/split/thickness of flows ectc515 (source: script)
- [target_missing] ectc51529.2024.00151-a-i1: interconnects.pitch_um 55 (die_to_interposer microbump) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00151-F3 (source: script)
- [target_missing] ectc51529.2024.00151-a-i4: interconnects.pitch_um 150 (interposer_to_substrate c4) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00151-F3 (source: script)
- [build_seq_unverified] ectc51529.2024.00151-b: TV in 2 tv_build flows (ectc51529.2024.00151-F2, ectc51529.2024.00151-F3); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] ectc51529.2024.00151-b-L08: stack_layers.line_um 8 (fan_out_rdl FO-RDL metal (conductor)) of TV b appears in no step target/conditions/split/thickness of flows ectc51529.2024.00151-F2, ectc51529.2024.00151-F3 | stack_layers.space_um 8 (fan_out_rdl FO-RDL metal (conductor)) of TV b appears in no step target/conditions/split/thi (source: script)

## ectc51529.2024.00153
- [target_missing] ectc51529.2024.00153-b-i1: interconnects.pitch_um 20 (die_to_substrate microbump) of TV b appears in no step target/conditions/split/thickness of flows ectc51529.2024.00153-F2 | interconnects.diameter_um 10 (die_to_substrate microbump) of TV b appears in no step target/conditions/split/thickness of flows ectc51529.2024.00153- (source: script)
