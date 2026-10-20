# Targeted process-flow fix manifest v018 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51846.2026.00365
- [category_other] ectc51846.2026.00365-F5-s01: 'barrier applied on substrate to contain underfill and define': keyword proposal no keyword match: choose an existing category or keep other (source: script)

## ectc51846.2026.00375
- [category_other] ectc51846.2026.00375-F1-s07: 'form termination electrodes for characterization': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51846.2026.00375-F1-s08: 'form dedicated GS-probe measurement pads near board center': keyword proposal no keyword match: choose an existing category or keep other (source: script)

## ectc51846.2026.00389
- [target_missing] ectc51846.2026.00389-a-L01: stack_layers.thickness_um 4 (glass_core signal Cu (SAP) (conductor)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00389-F1 (source: script)
- [target_missing] ectc51846.2026.00389-a-L04: stack_layers.thickness_um 0.2 (glass_core Cu seed (seed)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00389-F1 (source: script)
- [target_missing] ectc51846.2026.00389-a-L05: stack_layers.thickness_um 0.05 (glass_core Ti seed/adhesion (adhesion)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00389-F1 (source: script)
- [target_missing_preexisting] ectc51846.2026.00389-a-L07: stack_layers.thickness_um 200 (glass_core glass core (core)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00389-F1 (source: script)
- [target_missing] ectc51846.2026.00389-b-L01: stack_layers.thickness_um 4 (glass_core signal Cu (SAP) (conductor)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00389-F1 | stack_layers.line_um 34 (glass_core signal Cu (SAP) (conductor)) of TV b appears in no step target/conditions/split/thickness of flows  (source: script)
- [target_missing] ectc51846.2026.00389-b-L04: stack_layers.thickness_um 0.2 (glass_core Cu seed (seed)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00389-F1 (source: script)
- [target_missing] ectc51846.2026.00389-b-L05: stack_layers.thickness_um 0.05 (glass_core Ti seed/adhesion (adhesion)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00389-F1 (source: script)
- [target_missing_preexisting] ectc51846.2026.00389-b-L07: stack_layers.thickness_um 200 (glass_core glass core (core)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00389-F1 (source: script)

## ectc51846.2026.00416
- [untyped_condition] ectc51846.2026.00416-F1-s13: 8-10 mA/cm2, 4-8 h in conditions only | time_s empty but conditions has '-10 mA/cm2), 4-8 h (Fig' (type it if single-valued and stated; ranges stay in conditions) (source: audit_B;script)
- [target_missing_preexisting] ectc51846.2026.00416-a-L02: stack_layers.thickness_um 110 (die MOSFET die (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00416-F1 (source: script)
- [target_missing_preexisting] ectc51846.2026.00416-a-L06: stack_layers.thickness_um 320 (glass_core glass core (core)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00416-F1 (source: script)
- [target_missing_preexisting] ectc51846.2026.00416-b-L01: stack_layers.thickness_um 320 (coupon glass coupon (core)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00416-F2 (source: script)

## ectc51846.2026.00424
- [target_missing] ectc51846.2026.00424-a-L04: stack_layers.thickness_um 6 (other photosensitive polyimide adhesive (adhesive)) of TV a appears in no step target/conditions/split/thickness of flows ectc51846.2026.00424-F1 (source: script)
- [target_missing_preexisting] ectc51846.2026.00424-b-L03: stack_layers.thickness_um 500 (other glass support wafer (carrier)) of TV b appears in no step target/conditions/split/thickness of flows ectc51846.2026.00424-F2 (source: script)
- [target_missing_preexisting] ectc51846.2026.00424-c-L03: stack_layers.thickness_um 500 (other glass support wafer (carrier)) of TV c appears in no step target/conditions/split/thickness of flows ectc51846.2026.00424-F3 (source: script)
