# Targeted process-flow fix manifest v017 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51846.2026.00218
- [target_missing_preexisting] ectc51846.2026.00218-a-L09: stack_layers.thickness_um 775 (other Si bottom wafer (carrier)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00218-F1 (source: script)
- [target_missing] ectc51846.2026.00218-b-L01: stack_layers.thickness_um 6 (other SiO2 encapsulation (IDGF) (encapsulant)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00218-F2 (source: script)
- [target_missing_preexisting] ectc51846.2026.00218-b-L03: stack_layers.thickness_um 4 (die Si top die (device)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00218-F2 (source: script)

## ectc51846.2026.00227
- [level_regrade] ectc51846.2026.00227: ordered but 4 typed temperature steps plus gas and tool: candidate for full (source: audit_B)
- [target_missing_preexisting] ectc51846.2026.00227-a-L01: stack_layers.thickness_um 775 (die top die (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00227-F1 (source: script)
- [target_missing] ectc51846.2026.00227-a-L02: stack_layers.thickness_um 0.1 (interposer top pad finish (surface_finish)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00227-F1 (source: script)
- [target_missing_preexisting] ectc51846.2026.00227-a-L04: stack_layers.thickness_um 100 (interposer Si interposer (core)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00227-F1 (source: script)
- [target_missing] ectc51846.2026.00227-a-L05: stack_layers.thickness_um 10 (interposer bottom bump Cu (conductor)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00227-F1 (source: script)
- [target_missing] ectc51846.2026.00227-a-L08: stack_layers.thickness_um 55 (interposer bottom bump solder (bonding)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00227-F1 (source: script)
- [target_missing] ectc51846.2026.00227-a-i1: interconnects.pitch_um 150 (die_to_interposer c4) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00227-F1 (source: script)
- [target_missing] ectc51846.2026.00227-a-i2: interconnects.pitch_um 150 (interposer_to_substrate c4) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00227-F1 (source: script)

## ectc51846.2026.00302
- [category_other] ectc51846.2026.00302-F1-s02: 'femtosecond-laser modification of future V-groove regions (a': proposed laser_modification (proposed category, not in schema v2.5: keep other) (source: audit_B)
- [category_other] ectc51846.2026.00302-F1-s08: 'first ion exchange: Ag+ in for Na+ in molten salt bath (rais': keyword proposal ion_exchange (proposed category, not in schema v2.5: keep other) (source: script)
- [category_other] ectc51846.2026.00302-F1-s09: 'second ion exchange in second molten salt bath to bury index': keyword proposal ion_exchange (proposed category, not in schema v2.5: keep other) (source: script)

## ectc51846.2026.00336
- [category_other] ectc51846.2026.00336-F1-s05: 'lithography-masked doping': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51846.2026.00336-F2-s03: 'lithography-masked doping': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51846.2026.00336-F2-s14: 'lithography-masked doping': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_no_number] ectc51846.2026.00336-F2-s15: target 'TDV landing on STI floor' has no number (object name?) (source: validator)
- [target_missing] ectc51846.2026.00336-b-i1: interconnects.diameter_um 0.038 (through_via tdv) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00336-F2 (source: script)
- [target_missing] ectc51846.2026.00336-b-i2: interconnects.diameter_um 0.038 (through_via tdv) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00336-F2 (source: script)

## ectc51846.2026.00346
- [target_no_number] ectc51846.2026.00346-F1-s01: target 'PIC wafer' has no number (object name?) (source: validator)
