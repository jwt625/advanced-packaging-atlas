# Targeted process-flow fix manifest v001 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc32696.2021.00166
- [untyped_condition] ectc32696.2021.00166-F1-s01: time_s empty but conditions has 'medium-range (10s-100s' (type it if single-valued and stated; ranges stay in conditions) (source: script)

## ectc32696.2021.00174
- [category_other] ectc32696.2021.00174-F1-s20: 'tape and reel': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing] ectc32696.2021.00174-a-i2: interconnects.pitch_um 350 (substrate_to_board solder_ball) of TV a appears in no step target/conditions/split/thickness of flows ectc32696.2021.00174-F1 (source: script)

## ectc32696.2021.00315
- [target_missing_preexisting] ectc32696.2021.00315-a-L01: stack_layers.thickness_um 685 (die ASIC and HBM Flashbolt (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc32696.2021.00315-F1 (source: script)
- [target_missing] ectc32696.2021.00315-a-L03: stack_layers.thickness_um 35 (bonding_interface ubump layer with device underfill (bonding)) of TV a appears in no step target/conditions/split/thickness of flows ectc32696.2021.00315-F1 (source: script)
- [target_missing_preexisting] ectc32696.2021.00315-a-L04: stack_layers.thickness_um 110 (interposer Si interposer (core)) of TV a appears in no step target/conditions/split/thickness of flows ectc32696.2021.00315-F1 (source: script)
- [target_missing] ectc32696.2021.00315-a-L06: stack_layers.thickness_um 70 (bonding_interface Cu pillar solder bumps with interposer underfill (bonding)) of TV a appears in no step target/conditions/split/thickness of flows ectc32696.2021.00315-F1 (source: script)

## ectc32862.2020.00185
- [identical_delta_text] ectc32862.2020.00185-F2-s04: 2 delta rows of ectc32862.2020.00185-F2 have the same step text: ectc32862.2020.00185-F2-s04, ectc32862.2020.00185-F2-s05 (source: validator)
- [target_missing_preexisting] ectc32862.2020.00185-a-L02: stack_layers.thickness_um 700 (die daisy-chain test die (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc32862.2020.00185-F1 (source: script)
- [target_missing] ectc32862.2020.00185-a-i1: interconnects.pitch_um 60 (rdl_via rdl_via) of TV a appears in no step target/conditions/split/thickness of flows ectc32862.2020.00185-F1 | interconnects.diameter_um 30 (rdl_via rdl_via) of TV a appears in no step target/conditions/split/thickness of flows ectc32862.2020.00185-F1 (source: script)
- [target_missing_preexisting] ectc32862.2020.00185-d-L02: stack_layers.thickness_um 1100 (other glass panel carrier (carrier)) of TV d appears in no step target/conditions/split/thickness of flows ectc32862.2020.00185-F3 (source: script)
- [target_missing_preexisting] ectc32862.2020.00185-e-L02: stack_layers.thickness_um 700 (die Si die (device)) of TV e appears in no step target/conditions/split/thickness of flows ectc32862.2020.00185-F4 (source: script)
- [target_missing_preexisting] ectc32862.2020.00185-e-L04: stack_layers.thickness_um 1100 (other glass panel carrier (carrier)) of TV e appears in no step target/conditions/split/thickness of flows ectc32862.2020.00185-F4 (source: script)

## ectc51529.2024.00011
- [category_other] ectc51529.2024.00011-F2-s08: 'Cu stump': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51529.2024.00011-F2-s12: 'UBM (LGA) pad': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51529.2024.00011-F2-s16: 'mark': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing] ectc51529.2024.00011-a-L03: stack_layers.thickness_um 34 (fan_out_rdl 2nd EMC with Cu stumps (dielectric)) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00011-F1 (source: script)
- [target_missing] ectc51529.2024.00011-a-L05: stack_layers.thickness_um 25 (fan_out_rdl 1st EMC over die with Cu studs (encapsulant)) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00011-F1 (source: script)
- [target_missing_preexisting] ectc51529.2024.00011-a-L06: stack_layers.thickness_um 665 (die live die (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00011-F1 (source: script)
- [target_missing] ectc51529.2024.00011-a-L07: stack_layers.thickness_um 665 (mold 1st EMC around die and 2 structural Si dies (encapsulant)) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00011-F1 (source: script)
- [target_missing] ectc51529.2024.00011-a-L08: stack_layers.thickness_um 100 (other backside laminate protection (cap)) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00011-F1 (source: script)
- [target_missing] ectc51529.2024.00011-b-L03: stack_layers.thickness_um 34 (fan_out_rdl 2nd EMC with Cu stumps (dielectric)) of TV b appears in no step target/conditions/split/thickness of flows ectc51529.2024.00011-F1 (source: script)
- [target_missing] ectc51529.2024.00011-b-L05: stack_layers.thickness_um 25 (fan_out_rdl 1st EMC over die with Cu studs (encapsulant)) of TV b appears in no step target/conditions/split/thickness of flows ectc51529.2024.00011-F1 (source: script)
- [target_missing_preexisting] ectc51529.2024.00011-b-L06: stack_layers.thickness_um 665 (die live die (device)) of TV b appears in no step target/conditions/split/thickness of flows ectc51529.2024.00011-F1 (source: script)
- [target_missing] ectc51529.2024.00011-b-L07: stack_layers.thickness_um 665 (mold 1st EMC around die (encapsulant)) of TV b appears in no step target/conditions/split/thickness of flows ectc51529.2024.00011-F1 (source: script)
- [target_missing] ectc51529.2024.00011-b-L08: stack_layers.thickness_um 100 (other backside laminate protection (cap)) of TV b appears in no step target/conditions/split/thickness of flows ectc51529.2024.00011-F1 (source: script)
