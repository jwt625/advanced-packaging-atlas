# Targeted process-flow fix manifest v033 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## tcpmt.2021.3123384
- [untyped_condition] tcpmt.2021.3123384-F2-s08: temp_c/temp_c_max empty but conditions has 'clamp 10 C; He' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [category_other] tcpmt.2021.3123384-F3-s07: 'open passivation on vias': keyword proposal tsv_tgv_formation or etch_dry/etch_wet (via formation) (source: script)
- [category_other] tcpmt.2021.3123384-F7-s03: 'implantation of contact area': keyword proposal device_fab (proposed category, not in schema v2.5: keep other) (source: script)
- [target_missing] tcpmt.2021.3123384-b-L02: stack_layers.thickness_um 0.2 (coupon seed (adhesion) (adhesion)) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2021.3123384-F2 (source: script)
- [target_missing] tcpmt.2021.3123384-b-L03: stack_layers.thickness_um 0.3 (coupon seed (seed)) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2021.3123384-F2 (source: script)
- [target_missing_preexisting] tcpmt.2021.3123384-c-L03: stack_layers.thickness_um 200 (interposer SiC interposer core with Cu TSiCV (core)) of TV c appears in no step target/conditions/split/thickness of flows tcpmt.2021.3123384-F3 (source: script)
- [target_missing] tcpmt.2021.3123384-d-L02: stack_layers.thickness_um 8 (interposer polymer via liner (dry film, laser reopened) (dielectric)) of TV d appears in no step target/conditions/split/thickness of flows tcpmt.2021.3123384-F3 (source: script)
- [target_missing_preexisting] tcpmt.2021.3123384-d-L03: stack_layers.thickness_um 200 (interposer SiC interposer core with Cu TSiCV (core)) of TV d appears in no step target/conditions/split/thickness of flows tcpmt.2021.3123384-F3 (source: script)
- [build_seq_unverified] tcpmt.2021.3123384-e: TV in 3 tv_build flows (tcpmt.2021.3123384-F3, tcpmt.2021.3123384-F5, tcpmt.2021.3123384-F8); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing_preexisting] tcpmt.2021.3123384-e-L04: stack_layers.thickness_um 200 (interposer SiC interposer with Cu TSiCV (core)) of TV e appears in no step target/conditions/split/thickness of flows tcpmt.2021.3123384-F3, tcpmt.2021.3123384-F5, tcpmt.2021.3123384-F8 (source: script)
- [build_seq_unverified] tcpmt.2021.3123384-f: TV in 3 tv_build flows (tcpmt.2021.3123384-F3, tcpmt.2021.3123384-F6, tcpmt.2021.3123384-F8); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing_preexisting] tcpmt.2021.3123384-f-L03: stack_layers.thickness_um 200 (interposer SiC interposer (core)) of TV f appears in no step target/conditions/split/thickness of flows tcpmt.2021.3123384-F3, tcpmt.2021.3123384-F6, tcpmt.2021.3123384-F8 (source: script)
- [build_seq_unverified] tcpmt.2021.3123384-g: TV in 2 tv_build flows (tcpmt.2021.3123384-F3, tcpmt.2021.3123384-F7); build_seq is the flow-number default: confirm the order (source: script)

## tcpmt.2023.3266666
- [category_other] tcpmt.2023.3266666-F1-s03: 'pattern five glass manifold layers by water jet cutting': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing] tcpmt.2023.3266666-a-L02: stack_layers.thickness_um 2.7 (die SiO2 in thermal path (dielectric)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2023.3266666-F1 (source: script)
- [target_missing_preexisting] tcpmt.2023.3266666-a-L03: stack_layers.thickness_um 775 (die thermal test wafer Si (device)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2023.3266666-F1 (source: script)
- [target_missing] tcpmt.2023.3266666-a-L07: stack_layers.thickness_um 475 (other microchannel wafer Si base (below channels) (thermal)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2023.3266666-F1 (source: script)

## tcpmt.2024.3443855
- [target_missing] tcpmt.2024.3443855-a-L04: stack_layers.thickness_um 3.43 (interposer_rdl top SiO2 (over MOL) (passivation)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2024.3443855-F1 (source: script)
- [target_missing] tcpmt.2024.3443855-a-L05: stack_layers.thickness_um 1.54 (interposer_rdl TM1-TM7 MOL interconnect (low-k ILD) (dielectric)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2024.3443855-F1 (source: script)
- [target_missing] tcpmt.2024.3443855-a-L06: stack_layers.thickness_um 0.34 (interposer_rdl SiO2 under low-k (dielectric)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2024.3443855-F1 (source: script)
- [target_missing] tcpmt.2024.3443855-a-L08: stack_layers.line_um 10.87 (interposer_rdl M1_B bottom RDL (conductor)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2024.3443855-F1 | stack_layers.space_um 9.83 (interposer_rdl M1_B bottom RDL (conductor)) of TV a appears in no step target/conditions/split/thickness o (source: script)
- [target_missing] tcpmt.2024.3443855-a-i1: interconnects.diameter_um 26.2 (die_to_interposer microbump) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2024.3443855-F1 (source: script)
- [target_missing] tcpmt.2024.3443855-a-i2: interconnects.diameter_um 77.6 (interposer_to_substrate c4) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2024.3443855-F1 (source: script)
- [target_missing] tcpmt.2024.3443855-a-i3: interconnects.diameter_um 9.676 (through_via tsv) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2024.3443855-F1 (source: script)
- [target_missing] tcpmt.2024.3443855-a-i4: interconnects.diameter_um 25.27 (rdl_via rdl_via) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2024.3443855-F1 (source: script)

## tcpmt.2025.3538554
- [category_other] tcpmt.2025.3538554-F1-s14: 'fabricate second SLSI on another Si wafer by repeating steps': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing] tcpmt.2025.3538554-a-L03: stack_layers.line_um 10 (interposer_rdl B RDL-1 (conductor)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.3538554-F1 | stack_layers.space_um 10 (interposer_rdl B RDL-1 (conductor)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.35 (source: script)
- [target_missing] tcpmt.2025.3538554-a-L05: stack_layers.line_um 10 (interposer_rdl C RDL-2 (damascene, embedded in Si core) (conductor)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.3538554-F1 | stack_layers.space_um 10 (interposer_rdl C RDL-2 (damascene, embedded in Si core) (conductor)) of TV a appears i (source: script)
- [target_missing] tcpmt.2025.3538554-a-L09: stack_layers.line_um 10 (interposer_rdl E RDL-3 (conductor)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.3538554-F1 | stack_layers.space_um 10 (interposer_rdl E RDL-3 (conductor)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.35 (source: script)
- [target_missing] tcpmt.2025.3538554-a-L11: stack_layers.line_um 10 (interposer_rdl F RDL-4 (conductor)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.3538554-F1 | stack_layers.space_um 10 (interposer_rdl F RDL-4 (conductor)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.35 (source: script)
- [target_missing] tcpmt.2025.3538554-a-L12: stack_layers.thickness_um 9 (bonding_interface G Cu-Sn interlayer (bonding)) of TV a appears in no step target/conditions/split/thickness of flows tcpmt.2025.3538554-F1 (source: script)
- [build_seq_unverified] tcpmt.2025.3538554-b: TV in 2 tv_build flows (tcpmt.2025.3538554-F1, tcpmt.2025.3538554-F2); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] tcpmt.2025.3538554-b-i1: interconnects.pitch_um 500 (die_to_interposer solder_ball) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2025.3538554-F1, tcpmt.2025.3538554-F2 (source: script)
- [target_missing] tcpmt.2025.3538554-b-i2: interconnects.pitch_um 1600 (other solder_ball) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2025.3538554-F1, tcpmt.2025.3538554-F2 (source: script)
- [target_missing] tcpmt.2025.3538554-b-i4: interconnects.pitch_um 750 (other other) of TV b appears in no step target/conditions/split/thickness of flows tcpmt.2025.3538554-F1, tcpmt.2025.3538554-F2 (source: script)

## tcpmt.2025.3540665
- [target_missing] tcpmt.2025.3540665-F1-s05: 5x5 um bumps, 15 um pitch (p.1 Sec. I) on s05..s07 (source: audit_A)
- [target_missing] tcpmt.2025.3540665-F1-s06: 5x5 um bumps, 15 um pitch (p.1 Sec. I) (source: audit_A)
- [target_missing] tcpmt.2025.3540665-F1-s07: 5x5 um bumps, 15 um pitch (p.1 Sec. I) (source: audit_A)
- [split_temp_untyped] tcpmt.2025.3540665-F1-s13: bond 170/150 C only in split; temp_c 170 / time_s 300 cleared by the re-pass (interconnect a-i1 keeps 170 C / 300 s): set temp_c_max | split names a temperature ('bonding: 170 C 5 min / 150 C 5 min / 150 C 2 h') but temp_c and temp_c_max are empty (source: audit_A;validator)
