# Targeted process-flow fix manifest v030 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## icep-iaac64884.2025.11002958
- [split_misuse] icep-iaac64884.2025.11002958-F2-s01: split encodes different processes per TV (CCP vs LIS ion gun vs none/preheat): deltas or routes (source: audit_B)
- [split_temp_untyped] icep-iaac64884.2025.11002958-F2-s01: split names a temperature ('ABF (c): temperature not stated; glass (d, e): 'preheating a') but temp_c and temp_c_max are empty (source: validator)
- [split_misuse] icep-iaac64884.2025.11002958-F2-s02: split encodes different processes per TV: deltas or routes (source: audit_B)
- [split_temp_untyped] icep-iaac64884.2025.11002958-F2-s02: split names a temperature ('c (ABF): CCP Pf x Time ~0.7-4.5 kW-min or LIS 1-20 ion-gun p') but temp_c and temp_c_max are empty (source: validator)
- [target_missing] icep-iaac64884.2025.11002958-f-L03: stack_layers.via_diameter_um 80 (glass_core glass substrate with TGVs (core)) of TV f appears in no step target/conditions/split/thickness of flows icep-iaac64884.2025.11002958-F5 (source: script)
- [target_missing_preexisting] icep-iaac64884.2025.11002958-f-L03: stack_layers.thickness_um 430 (glass_core glass substrate with TGVs (core)) of TV f appears in no step target/conditions/split/thickness of flows icep-iaac64884.2025.11002958-F5 (source: script)
- [target_missing] icep-iaac64884.2025.11002958-f-i1: interconnects.diameter_um 80 (through_via tgv) of TV f appears in no step target/conditions/split/thickness of flows icep-iaac64884.2025.11002958-F5 (source: script)

## icep-iaac64884.2025.11002987
- [target_missing] icep-iaac64884.2025.11002987-a-i1: interconnects.pitch_um 150 (other other) of TV a appears in no step target/conditions/split/thickness of flows icep-iaac64884.2025.11002987-F1 (source: script)

## icep-iaac64884.2025.11003038
- [category_other] icep-iaac64884.2025.11003038-F1-s01: 'panel-level fabrication of 2-metal-layer core substrate (400': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [step_basis] icep-iaac64884.2025.11003038-F1-s01: '2-metal-layer core' for Samples 3/4 inferred from the structure: say so in notes (source: audit_A)
- [structure_derived_step] icep-iaac64884.2025.11003038-F1-s05: 1-2-1 build-up lamination rows (were s05..s08) restate the stack-up; Samples 3/4 are only 'four-metal-layers substrate' (p.1 Sec. II): delete or one generic row (source: audit_A)

## icep55381.2022.9795565
- [category_other] icep55381.2022.9795565-F3-s01: 'form damascene metallization layers on 300 mm Si top wafer': keyword proposal rdl_layer (source: script)
- [category_other] icep55381.2022.9795565-F3-s03: 'form damascene metallization layers and Al probing pads on b': keyword proposal rdl_layer (source: script)
- [target_missing] icep55381.2022.9795565-c-L04: stack_layers.thickness_um 0.5 (die_stack Sn (bottom bump, converted to CoSn3 pre-IMC) (bonding)) of TV c appears in no step target/conditions/split/thickness of flows icep55381.2022.9795565-F3 (source: script)
- [target_missing] icep55381.2022.9795565-c-L05: stack_layers.thickness_um 1 (die_stack Co (bottom bump) (bonding)) of TV c appears in no step target/conditions/split/thickness of flows icep55381.2022.9795565-F3 (source: script)

## icep58572.2023.10129684
- [category_other] icep58572.2023.10129684-F1-s01: 'tune panel warpage to 12 mm target via thickness and materia': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] icep58572.2023.10129684-F2-s01: 'tune 300x300 mm panel warpage to 12 mm target via manufactur': keyword proposal no keyword match: choose an existing category or keep other (source: script)
