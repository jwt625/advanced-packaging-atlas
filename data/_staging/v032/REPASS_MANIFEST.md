# Targeted process-flow fix manifest v032 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## iedm45741.2023.10413829
- [category_other] iedm45741.2023.10413829-F1-s03: 'Metal1 (top and bottom)': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] iedm45741.2023.10413829-F1-s04: 'Via (Via1, top and bottom)': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] iedm45741.2023.10413829-F1-s11: 'backside processing': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing] iedm45741.2023.10413829-a-i1: interconnects.diameter_um 0.226 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows iedm45741.2023.10413829-F1 (source: script)
- [target_missing] iedm45741.2023.10413829-a-i2: interconnects.pitch_um 0.45 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows iedm45741.2023.10413829-F1 (source: script)
- [target_missing] iedm45741.2023.10413829-a-i3: interconnects.pitch_um 0.5 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows iedm45741.2023.10413829-F1 (source: script)
- [target_missing] iedm45741.2023.10413829-a-i6: interconnects.pitch_um 0.45 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows iedm45741.2023.10413829-F1 (source: script)
- [target_missing] iedm45741.2023.10413829-a-i7: interconnects.pitch_um 0.5 (wafer_to_wafer_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows iedm45741.2023.10413829-F1 (source: script)

## itherm55375.2024.10709474
- [target_missing] itherm55375.2024.10709474-a-L08: stack_layers.thickness_um 300 (other slit wafer (thermal)) of TV a appears in no step target/conditions/split/thickness of flows itherm55375.2024.10709474-F1 (source: script)

## iwlpc52010.2020.9375855
- [target_missing] iwlpc52010.2020.9375855-a-i4: interconnects.pitch_um 400 (substrate_to_board bga) of TV a appears in no step target/conditions/split/thickness of flows iwlpc52010.2020.9375855-F1 (source: script)
- [target_missing] iwlpc52010.2020.9375855-b-i4: interconnects.pitch_um 400 (substrate_to_board bga) of TV b appears in no step target/conditions/split/thickness of flows iwlpc52010.2020.9375855-F1 (source: script)

## iwlpc52010.2020.9375887
- [category_other] iwlpc52010.2020.9375887-F1-s20: 'backside epoxy': keyword proposal no keyword match: choose an existing category or keep other (source: script)

## tcpmt.2021.3104326
- [target_missing] tcpmt.2021.3104326-a-L02: stack_layers.thickness_um 0.85 (die top die Cu damascene BEOL routing level (conductor)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F1 | stack_layers.line_um 12 (die top die Cu damascene BEOL routing level (conductor)) of TV a appears in no step target/c (source: script)
- [target_missing] tcpmt.2021.3104326-a-L05: stack_layers.thickness_um 2 (bonding_interface microbump Cu base (conductor)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F1 (source: script)
- [target_missing] tcpmt.2021.3104326-a-L06: stack_layers.thickness_um 2 (bonding_interface microbump Ni barrier (barrier)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F1 (source: script)
- [target_missing] tcpmt.2021.3104326-a-L07: stack_layers.thickness_um 5 (bonding_interface microbump solder (bonding)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F1 (source: script)
- [target_missing] tcpmt.2021.3104326-a-L08: stack_layers.thickness_um 0.1 (bonding_interface micropillar Au finish (surface_finish)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F1 (source: script)
- [target_missing] tcpmt.2021.3104326-a-L09: stack_layers.thickness_um 2 (bonding_interface micropillar Ni barrier (barrier)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F1 (source: script)
- [target_missing] tcpmt.2021.3104326-a-L10: stack_layers.thickness_um 3 (bonding_interface micropillar Cu (conductor)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F1 (source: script)
- [target_missing] tcpmt.2021.3104326-a-L13: stack_layers.thickness_um 0.85 (die bottom wafer Cu damascene BEOL routing level (conductor)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F1 | stack_layers.line_um 12 (die bottom wafer Cu damascene BEOL routing level (conductor)) of TV a appears in no ste (source: script)
- [target_missing] tcpmt.2021.3104326-b-L02: stack_layers.thickness_um 0.85 (die top die Cu damascene BEOL routing level (conductor)) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F1 | stack_layers.line_um 12 (die top die Cu damascene BEOL routing level (conductor)) of TV b appears in no step target/c (source: script)
- [target_missing] tcpmt.2021.3104326-b-L05: stack_layers.thickness_um 2 (bonding_interface microbump Cu base (conductor)) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F1 (source: script)
- [target_missing] tcpmt.2021.3104326-b-L06: stack_layers.thickness_um 2 (bonding_interface microbump Ni barrier (barrier)) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F1 (source: script)
- [target_missing] tcpmt.2021.3104326-b-L07: stack_layers.thickness_um 5 (bonding_interface microbump solder (bonding)) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F1 (source: script)
- [target_missing] tcpmt.2021.3104326-b-L08: stack_layers.thickness_um 0.1 (bonding_interface micropillar Au finish (surface_finish)) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F1 (source: script)
- [target_missing] tcpmt.2021.3104326-b-L09: stack_layers.thickness_um 2 (bonding_interface micropillar Ni barrier (barrier)) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F1 (source: script)
- [target_missing] tcpmt.2021.3104326-b-L10: stack_layers.thickness_um 3 (bonding_interface micropillar Cu (conductor)) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F1 (source: script)
- [target_missing] tcpmt.2021.3104326-b-L13: stack_layers.thickness_um 0.85 (die bottom wafer Cu damascene BEOL routing level (conductor)) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F1 | stack_layers.line_um 12 (die bottom wafer Cu damascene BEOL routing level (conductor)) of TV b appears in no ste (source: script)
- [target_missing] tcpmt.2021.3104326-c-L02: stack_layers.thickness_um 0.85 (die top die Cu damascene BEOL routing level (conductor)) of TV c appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F2 (source: script)
- [target_missing] tcpmt.2021.3104326-c-L09: stack_layers.thickness_um 0.85 (die bottom wafer Cu damascene BEOL routing level (conductor)) of TV c appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F2 (source: script)
- [target_missing] tcpmt.2021.3104326-c-L11: stack_layers.thickness_um 0.01 (bonding_interface damascene liner Ti seed (seed)) of TV c appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F2 (source: script)
- [target_missing] tcpmt.2021.3104326-c-L12: stack_layers.thickness_um 0.01 (bonding_interface damascene liner TiN barrier (barrier)) of TV c appears in no step target/conditions/split/thickness of flows tcpmt.2021.3104326-F2 (source: script)
