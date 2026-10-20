# Targeted process-flow fix manifest v031 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## icep61562.2024.10535587
- [category_other] icep61562.2024.10535587-F4-s04: 'Tape and reel (TnR)': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [build_seq_unverified] icep61562.2024.10535587-a: TV in 4 tv_build flows (icep61562.2024.10535587-F1, icep61562.2024.10535587-F2, icep61562.2024.10535587-F3, icep61562.2024.10535587-F4); build_seq is the flow-number default: confirm the order (source: script)

## icep61562.2024.10535612
- [category_other] icep61562.2024.10535612-F1-s04: 'hold at room temperature': keyword proposal profile fragment: merge into the parent step's conditions (source: script)

## iedm19573.2019.8993637
- [build_order_note] iedm19573.2019.8993637-F2: notes say 'precedes F1' but build_seq defaults to the flow number (2): set build_seq (source: script)
- [category_other] iedm19573.2019.8993637-F2-s08: 'resume standard interconnect flow; redundant vias land on TS': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [build_seq_unverified] iedm19573.2019.8993637-a: TV in 3 tv_build flows (iedm19573.2019.8993637-F1, iedm19573.2019.8993637-F2, iedm19573.2019.8993637-F3); build_seq is the flow-number default: confirm the order (source: script)

## iedm45625.2022.10019499
- [category_other] iedm45625.2022.10019499-F1-s01: 'metal stack redefinition above final metal: much smaller via': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] iedm45625.2022.10019499-F1-s03: 'form damascene hybrid bonding layer with reduced thickness f': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] iedm45625.2022.10019499-F2-s05: 'form hybrid bonding interface (HBI) layer over the structure': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] iedm45625.2022.10019499-F2-s12: 'form another hybrid bonding layer to attach to another chip': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing] iedm45625.2022.10019499-b-i1: interconnects.pitch_um 3 (die_to_wafer_hybrid cu_cu_hybrid) of TV b appears in no step target/conditions/split/thickness of flows iedm45625.2022.10019499-F2 (source: script)

## iedm45741.2023.10413759
- [category_other] iedm45741.2023.10413759-F1-s01: 'GaN HEMT fabrication': keyword proposal device_fab (proposed category, not in schema v2.5: keep other) (source: script)
- [value_misread] iedm45741.2023.10413759-F1-s05: conditions '~233 C' -> '~240 C' (Fig. 6 plateau on the 240 C gridline, p.3); typed temp_c 250 lt stays (source: audit_B)
- [derived_entry_missing] iedm45741.2023.10413759-F1-s07: thickness_um 0.01 from '10 nm' (p.2 Sec. II.B) has no evidence derived entry (source: audit_B)
- [target_missing] iedm45741.2023.10413759-a-L04: stack_layers.thickness_um 2 (die dielet Cu pad (bonding)) of TV a appears in no step target/conditions/split/thickness of flows iedm45741.2023.10413759-F1 (source: script)
- [target_missing] iedm45741.2023.10413759-a-L05: stack_layers.thickness_um 3 (bonding_interface GaN/Si-IF Cu pillar (bonding)) of TV a appears in no step target/conditions/split/thickness of flows iedm45741.2023.10413759-F1 (source: script)
- [target_missing] iedm45741.2023.10413759-a-L06: stack_layers.thickness_um 2 (interposer_rdl GaN/Si-IF Cu pad (conductor)) of TV a appears in no step target/conditions/split/thickness of flows iedm45741.2023.10413759-F1 (source: script)
- [target_missing_preexisting] iedm45741.2023.10413759-a-L08: stack_layers.thickness_um 0.4 (interposer GaN (device)) of TV a appears in no step target/conditions/split/thickness of flows iedm45741.2023.10413759-F1 (source: script)
- [target_missing] iedm45741.2023.10413759-a-L09: stack_layers.thickness_um 0.25 (interposer AlN (other)) of TV a appears in no step target/conditions/split/thickness of flows iedm45741.2023.10413759-F1 (source: script)
