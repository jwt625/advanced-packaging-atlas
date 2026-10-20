# Targeted process-flow fix manifest v002 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51529.2024.00023
- [category_other] ectc51529.2024.00023-F1-s01: 'melt and refine glass from high-purity raw materials': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51529.2024.00023-F1-s02: 'cast into boules': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51529.2024.00023-F1-s04: 'slice and finish to 150 mm wafers': proposed carrier_prep (slice and finish to 150 mm wafers) (source: audit_B)
- [category_other] ectc51529.2024.00023-F1-s08: 'thermal silver ion-exchange in molten salt': proposed ion_exchange (proposed category, not in schema v2.5: keep other) (source: audit_B)
- [category_other] ectc51529.2024.00023-F1-s10: 'thermal sodium ion-exchange to bury waveguide core': keyword proposal ion_exchange (proposed category, not in schema v2.5: keep other) (source: script)

## ectc51529.2024.00051
- [generic_intro_candidate] ectc51529.2024.00051-F1-s02: stated_in_flow but located only in p.1 Sec. I: generic_description unless the paper says it was executed (source: script)

## ectc51529.2024.00057
- [category_other] ectc51529.2024.00057-F1-s01: 'fabricate tiers 1, 2, 3 in parallel on 300 mm wafers: MZ, HB': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51529.2024.00057-F1-s07: 'fabricate HBM bonding pad layer on top of TSV': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51529.2024.00057-F1-s10: 'remove tier 3 backside silicon': keyword proposal no keyword match: choose an existing category or keep other (source: script)

## ectc51529.2024.00064
- [split_temp_untyped] ectc51529.2024.00064-F1-s04: split names a temperature ('TCB temperature 300-380 C and force 100-300 N (optimization ') but temp_c and temp_c_max are empty (source: validator)
- [target_missing] ectc51529.2024.00064-a-i1: interconnects.pitch_um 25 (die_stack_internal microbump) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00064-F1 (source: script)
- [target_missing] ectc51529.2024.00064-a-i2: interconnects.diameter_um 32 (other microbump) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00064-F1 (source: script)

## ectc51529.2024.00076
- [target_missing] ectc51529.2024.00076-a-L03: stack_layers.thickness_um 0.112 (die_stack Nb (top) (bonding)) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00076-F1 (source: script)
- [target_missing] ectc51529.2024.00076-a-L04: stack_layers.thickness_um 0.112 (die_stack Nb (bottom) (bonding)) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00076-F1 (source: script)
- [target_missing_preexisting] ectc51529.2024.00076-b-L07: stack_layers.thickness_um 725 (die_stack bottom wafer Si (carrier)) of TV b appears in no step target/conditions/split/thickness of flows ectc51529.2024.00076-F2 (source: script)
