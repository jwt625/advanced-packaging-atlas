# Targeted process-flow fix manifest v007 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51687.2025.00014
- [category_other] ectc51687.2025.00014-F1-s01: 'fabricate MZI switch PIC in commercial MPW process': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51687.2025.00014-F1-s03: '3D print VCBELs in PIC trenches by two-photon polymerization': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51687.2025.00014-F1-s05: 'write optical waveguides in glass with femtosecond laser (lo': keyword proposal laser_modification (proposed category, not in schema v2.5: keep other) (source: script)
- [category_other] ectc51687.2025.00014-F1-s07: '3D print VCBELs in glass trenches': keyword proposal no keyword match: choose an existing category or keep other (source: script)

## ectc51687.2025.00026
- [untyped_condition] ectc51687.2025.00026-F1-s05: temp_c/temp_c_max empty but conditions has 'rpage at 210-245 C duri' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [target_missing] ectc51687.2025.00026-a-L03: stack_layers.line_um 2 (interposer_rdl Cu RDL (conductor)) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025.00026-F1 | stack_layers.space_um 2 (interposer_rdl Cu RDL (conductor)) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025. (source: script)
- [target_missing] ectc51687.2025.00026-a-L04: stack_layers.via_diameter_um 8 (interposer_rdl RDL dielectric (dielectric)) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025.00026-F1 (source: script)
- [target_missing] ectc51687.2025.00026-a-i3: interconnects.diameter_um 8 (rdl_via rdl_via) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025.00026-F1 (source: script)
- [build_seq_unverified] ectc51687.2025.00026-d: TV in 2 tv_build flows (ectc51687.2025.00026-F1, ectc51687.2025.00026-F2); build_seq is the flow-number default: confirm the order (source: script)
- [build_seq_unverified] ectc51687.2025.00026-e: TV in 2 tv_build flows (ectc51687.2025.00026-F1, ectc51687.2025.00026-F2); build_seq is the flow-number default: confirm the order (source: script)

## ectc51687.2025.00027
- [category_other] ectc51687.2025.00027-F1-s23: 'print solder paste on PCB': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [split_temp_untyped] ectc51687.2025.00027-F1-s25: split names a temperature ('reflow top: LTS balls 160 C; SAC ball / LTS paste about 210 ') but temp_c and temp_c_max are empty (source: validator)
- [untyped_condition] ectc51687.2025.00027-F1-s25: temp_c/temp_c_max empty but conditions has 'ds about 250-260 C (SAC' (type it if single-valued and stated; ranges stay in conditions) (source: script)
- [target_missing_preexisting] ectc51687.2025.00027-a-L01: stack_layers.thickness_um 675 (die Die A / Die B silicon (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025.00027-F1 (source: script)
- [target_missing] ectc51687.2025.00027-a-L04: stack_layers.thickness_um 0.05 (interposer front pad Au (surface_finish)) of TV a appears in no step target/conditions/split/thickness of flows ectc51687.2025.00027-F1 (source: script)
- [target_missing_preexisting] ectc51687.2025.00027-b-L01: stack_layers.thickness_um 675 (die Die A / Die B silicon (device)) of TV b appears in no step target/conditions/split/thickness of flows ectc51687.2025.00027-F1 (source: script)
- [target_missing] ectc51687.2025.00027-b-L04: stack_layers.thickness_um 0.05 (interposer front pad Au (surface_finish)) of TV b appears in no step target/conditions/split/thickness of flows ectc51687.2025.00027-F1 (source: script)

## ectc51687.2025.00028
- [category_other] ectc51687.2025.00028-F1-s01: 'fabricate silicon capacitor on 12-inch wafer (step-a1)': proposed device_fab (proposed category, not in schema v2.5: keep other; Si capacitor) (source: audit_B)
- [category_other] ectc51687.2025.00028-F2-s02: 'perforate side of substrate core for capacitor (step-c2)': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing] ectc51687.2025.00028-c-L02: stack_layers.thickness_um 50 (die_stack molding (MUF) with Cu bumps at edges (encapsulant)) of TV c appears in no step target/conditions/split/thickness of flows ectc51687.2025.00028-F2, ectc51687.2025.00028-F3 (source: script)

## ectc51687.2025.00049
- [level_regrade] ectc51687.2025.00049: full -> ordered: no temperature, time, pressure, dose or force in the paper (only formic acid atmosphere, p.3 Sec. II.C) (source: audit_A)
- [flow_level] ectc51687.2025.00049-F1: F1 full without conditions -> ordered (source: audit_A)
- [flow_structure] ectc51687.2025.00049-F1-s14: Si-substrate SAP pads are a parallel component build (p.2 Sec. II.B): own flow 'Si substrate pads, SAP', tv_ids a;b, order vs bridge flow not stated (source: audit_A)
- [flow_level] ectc51687.2025.00049-F2: F2 full without conditions -> ordered (source: audit_A)
- [build_seq_unverified] ectc51687.2025.00049-a: TV in 2 tv_build flows (ectc51687.2025.00049-F1, ectc51687.2025.00049-F2); build_seq is the flow-number default: confirm the order (source: script)
- [build_seq_unverified] ectc51687.2025.00049-b: TV in 2 tv_build flows (ectc51687.2025.00049-F1, ectc51687.2025.00049-F2); build_seq is the flow-number default: confirm the order (source: script)
