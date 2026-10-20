# Targeted process-flow fix manifest v016 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51846.2026.00194
- [target_missing] ectc51846.2026.00194-b-L01: stack_layers.line_um 37 (coupon dry film resist (other)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00194-F1 | stack_layers.space_um 37 (coupon dry film resist (other)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.0019 (source: script)

## ectc51846.2026.00199
- [target_missing_preexisting] ectc51846.2026.00199-a-L13: stack_layers.thickness_um 1000 (glass_core glass core (core)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00199-F1 (source: script)
- [target_missing] ectc51846.2026.00199-a-i5: interconnects.pitch_um 130 (die_to_substrate unspecified) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00199-F1 (source: script)

## ectc51846.2026.00204
- [category_other] ectc51846.2026.00204-F1-s01: 'Sn-based alloy nanoparticle synthesis (controlled reduction ': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51846.2026.00204-F1-s02: 'Paste formulation: binder + coupling agent + dispersant in p': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing] ectc51846.2026.00204-a-L01: stack_layers.thickness_um 1 (bonding_interface Nanosolder bump (bonding)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00204-F1 (source: script)
- [target_missing] ectc51846.2026.00204-a-L02: stack_layers.thickness_um 3 (die Electrode pad (conductor)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00204-F1 (source: script)
- [target_missing] ectc51846.2026.00204-a-i1: interconnects.pitch_um 40 (other other) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00204-F1 (source: script)
- [target_missing] ectc51846.2026.00204-b-L02: stack_layers.thickness_um 1.5 (die Top electrode pad (conductor)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00204-F1 (source: script)
- [target_missing] ectc51846.2026.00204-b-L05: stack_layers.thickness_um 1.5 (die Bottom electrode pad (conductor)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00204-F1 (source: script)
- [target_missing] ectc51846.2026.00204-b-i1: interconnects.pitch_um 10 (other other) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00204-F1 (source: script)
- [build_seq_unverified] ectc51846.2026.00204-c: TV in 2 tv_build flows (ectc51846.2026.00204-F1, ectc51846.2026.00204-F2); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] ectc51846.2026.00204-c-L02: stack_layers.thickness_um 3.5 (die Top electrode pad (conductor)) of TV c appears in no step target/conditions/split/thickness of flows ectc51846.2026.00204-F1, ectc51846.2026.00204-F2 (source: script)
- [target_missing] ectc51846.2026.00204-c-L05: stack_layers.thickness_um 3.5 (die Bottom electrode pad (conductor)) of TV c appears in no step target/conditions/split/thickness of flows ectc51846.2026.00204-F1, ectc51846.2026.00204-F2 (source: script)
- [target_missing] ectc51846.2026.00204-c-i1: interconnects.pitch_um 20 (other other) of TV c appears in no step target/conditions/split/thickness of flows ectc51846.2026.00204-F1, ectc51846.2026.00204-F2 (source: script)
- [target_missing] ectc51846.2026.00204-c-i2: interconnects.pitch_um 20 (other other) of TV c appears in no step target/conditions/split/thickness of flows ectc51846.2026.00204-F1, ectc51846.2026.00204-F2 (source: script)
- [target_missing] ectc51846.2026.00204-c-i3: interconnects.pitch_um 20 (other other) of TV c appears in no step target/conditions/split/thickness of flows ectc51846.2026.00204-F1, ectc51846.2026.00204-F2 (source: script)

## ectc51846.2026.00208
- [category_other] ectc51846.2026.00208-F1-s10: 'pre-dip in electroless Ni solution for via penetration': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [untyped_condition] ectc51846.2026.00208-F1-s12: chamber pressure 0.5 Pa in conditions only | pressure_mpa empty but conditions has '0.5 Pa, 30' (type it if single-valued and stated; ranges stay in conditions) (source: audit_B;script)
- [target_missing] ectc51846.2026.00208-a-L04: stack_layers.thickness_um 0.04 (glass_core sputtered Ti (adhesion)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00208-F1 (source: script)
- [target_missing] ectc51846.2026.00208-b-L01: stack_layers.via_diameter_um 100 (glass_core glass substrate (core)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00208-F2 (source: script)
- [target_missing_preexisting] ectc51846.2026.00208-b-L01: stack_layers.thickness_um 1000 (glass_core glass substrate (core)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00208-F2 (source: script)
- [target_missing] ectc51846.2026.00208-b-i1: interconnects.diameter_um 100 (through_via tgv) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00208-F2 (source: script)

## ectc51846.2026.00209
- [value_not_in_paper] ectc51846.2026.00209-F1-s01: conditions '1064 nm' not stated; only product names DIADEM 1064-10 / LMH-10X-1064 (p.2 Sec. IV): drop or mark as read from the product name (source: audit_A)
- [flow_level] ectc51846.2026.00209-F2: F2 ordered but s03 carries 250 C / 60 min sinter (p.4 Sec. VII) -> full (source: audit_A)
- [split_temp_untyped] ectc51846.2026.00209-F4-s02: 500 C / 250 C only in split | split names a temperature ('US-202A 500 C 30 min / CL83A 250 C 60 min') but temp_c and temp_c_max are empty (source: audit_A;validator)
- [target_missing_preexisting] ectc51846.2026.00209-a-L02: stack_layers.thickness_um 150 (interposer No. 1 borosilicate coverslip (core)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00209-F1 (source: script)
- [target_missing_preexisting] ectc51846.2026.00209-a-L05: stack_layers.thickness_um 1000 (interposer borosilicate microscope slide (base) (core)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00209-F1 (source: script)
- [target_missing_preexisting] ectc51846.2026.00209-b-L02: stack_layers.thickness_um 150 (interposer No. 1 borosilicate coverslip (core)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00209-F2 (source: script)
- [target_missing] ectc51846.2026.00209-c-L01: stack_layers.thickness_um 20 (coupon four-point probe pattern (conductor)) of TV c appears in no step target/conditions/split/thickness of flows ectc51846.2026.00209-F4 (source: script)
