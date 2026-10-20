# Targeted process-flow fix manifest v035 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## tcpmt.2026.3708099
- [untyped_condition] tcpmt.2026.3708099-F1-s01: 25 mTorr in conditions only | pressure_mpa empty but conditions has 'sccm, chamber 25 mTorr, etc' (type it if single-valued and stated; ranges stay in conditions) (source: audit_B;script)
- [split_temp_untyped] tcpmt.2026.3708099-F1-s16: split names a temperature ('200 C / 300 C / not annealed (initial; unthinned TVs a, c on') but temp_c and temp_c_max are empty (source: validator)

## tcpmt.2026.3717381
- [category_other] tcpmt.2026.3717381-F1-s02: 'polish upper glass wafer': proposed cmp or grinding_thinning (polish glass wafer) (source: audit_B)
- [target_missing_preexisting] tcpmt.2026.3717381-a-L02: stack_layers.thickness_um 150 (interposer Glass1 (core)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2026.3717381-F1 (source: script)
- [target_missing] tcpmt.2026.3717381-a-L05: stack_layers.line_um 80 (interposer MOG3 (conductor)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2026.3717381-F1 (source: script)
- [target_missing_preexisting] tcpmt.2026.3717381-a-L06: stack_layers.thickness_um 150 (interposer Glass2 (core)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2026.3717381-F1 (source: script)
- [target_missing] tcpmt.2026.3717381-a-i3: interconnects.diameter_um 48 (other cu_pillar) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2026.3717381-F1 (source: script)
- [build_seq_unverified] tcpmt.2026.3717381-b: TV in 2 tv_build flows (tcpmt.2026.3717381-F1, tcpmt.2026.3717381-F2); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] tcpmt.2026.3717381-b-i1: interconnects.diameter_um 48 (other cu_pillar) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2026.3717381-F1, tcpmt.2026.3717381-F2 (source: script)

## tcpmt.2026.3740312
- [split_misuse] tcpmt.2026.3740312-F2-s02: split encodes 200 nm film vs 5 um bump: deltas or routes (source: audit_B)

## vlsitechnologyandcir46783.2024.10631441
- [identical_delta_text] vlsitechnologyandcir46783.2024.10631441-F1-s07: 2 delta rows of vlsitechnologyandcir46783.2024.10631441-F1 have the same step text: vlsitechnologyandcir46783.2024.10631441-F1-s07, vlsitechnologyandcir46783.2024.10631441-F1-s08 (source: validator)
- [category_other] vlsitechnologyandcir46783.2024.10631441-F1-s12: 'continued FEOL NS processing (per refs [3,8])': keyword proposal device_fab (proposed category, not in schema v2.5: keep other) (source: script)

## vlsitechnologyandcir65830.2026.11577374
- [category_other] vlsitechnologyandcir65830.2026.11577374-F1-s01: 'Form oxide trench in DRAM wafer': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] vlsitechnologyandcir65830.2026.11577374-F1-s07: 'Backside interconnection and pad-out': proposed rdl_layer (source: audit_B)
