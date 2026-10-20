# Targeted process-flow fix manifest v000 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc.2011.5898527
- [generic_intro] ectc.2011.5898527-F1: F1-s01..s14 come from the Introduction's generic 'Typically ...' paragraph (p.1) but are stated_in_flow: generic_description; keep tv_ids a (Conclusions p.5 confirm DRIE, oxide, barrier/seed, Cu fill, CMP for AR <= 10), say so in notes (source: audit_B)
- [generic_intro_candidate] ectc.2011.5898527-F1-s05: stated_in_flow but located only in p.1 Introduction: generic_description unless the paper says it was executed (source: script)
- [generic_intro_candidate] ectc.2011.5898527-F1-s06: stated_in_flow but located only in p.1 Introduction: generic_description unless the paper says it was executed (source: script)
- [generic_intro_candidate] ectc.2011.5898527-F1-s07: stated_in_flow but located only in p.1 Introduction: generic_description unless the paper says it was executed (source: script)
- [generic_intro_candidate] ectc.2011.5898527-F1-s08: stated_in_flow but located only in p.1 Introduction; p.1 Abstract: generic_description unless the paper says it was executed (source: script)
- [generic_intro_candidate] ectc.2011.5898527-F1-s09: stated_in_flow but located only in p.1 Introduction: generic_description unless the paper says it was executed (source: script)
- [generic_intro_candidate] ectc.2011.5898527-F1-s10: stated_in_flow but located only in p.1 Introduction: generic_description unless the paper says it was executed (source: script)
- [generic_intro_candidate] ectc.2011.5898527-F1-s12: stated_in_flow but located only in p.1 Introduction: generic_description unless the paper says it was executed (source: script)
- [generic_intro_candidate] ectc.2011.5898527-F1-s13: stated_in_flow but located only in p.1 Introduction: generic_description unless the paper says it was executed (source: script)
- [generic_intro] ectc.2011.5898527-F2-s01: bumping at '30-60 um' from the same generic paragraph: check step_basis (source: audit_B)
- [generic_intro] ectc.2011.5898527-F2-s02: dicing from the same generic paragraph: check step_basis (source: audit_B)
- [generic_intro_candidate] ectc.2011.5898527-F2-s02: stated_in_flow but located only in p.1 Introduction: generic_description unless the paper says it was executed (source: script)
- [generic_intro_candidate] ectc.2011.5898527-F2-s06: stated_in_flow but located only in p.1 Introduction: generic_description unless the paper says it was executed (source: script)
- [build_seq_unverified] ectc.2011.5898527-a: TV in 2 tv_build flows (ectc.2011.5898527-F1, ectc.2011.5898527-F2); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing_preexisting] ectc.2011.5898527-a-L12: stack_layers.thickness_um 800 (substrate_core substrate core (low-CTE) (core)) of TV a appears in no step target/conditions/split/thickness of flows ectc.2011.5898527-F1, ectc.2011.5898527-F2 (source: script)

## ectc.2016.201
- [category_other] ectc.2016.201-F1-s01: 'bridge wafer fab back-end process with multi-layer thick BEO': proposed rdl_layer (source: audit_B)
- [category_other] ectc.2016.201-F2-s01: 'traditional organic build-up until final build-up layer': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc.2016.201-F2-s02: 'bridge cavity formation': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc.2016.201-F2-s05: '(fine + coarse) via drilling: fine vias in bridge region, co': proposed laser_drill (source: audit_B)
- [target_missing] ectc.2016.201-a-i1: interconnects.pitch_um 55 (die_to_bridge microbump) of TV a appears in no step target/conditions/split/thickness of flows ectc.2016.201-F1, ectc.2016.201-F2 (source: script)
- [target_missing] ectc.2016.201-a-i2: interconnects.pitch_um 130 (die_to_substrate other) of TV a appears in no step target/conditions/split/thickness of flows ectc.2016.201-F1, ectc.2016.201-F2 (source: script)

## ectc.2019.00-29
- [target_missing] ectc.2019.00-29-F2-s03: via ~10 um; openings 10-200 um sit in notes (p.2 Sec. II.A) (source: audit_A)
- [thickness_untyped] ectc.2019.00-29-F2-s05: Ti/Cu seed 'Ti 1 kA / Cu 1 kA' in target, thickness_um empty (stack_layers 0.1 um): thickness_um 0.1 + derived entry (source: audit_A)
- [target_missing] ectc.2019.00-29-F2-s06: L/S 8/8 um (p.2 Sec. II.A) (source: audit_A)
- [target_missing] ectc.2019.00-29-F2-s08: RDL design 5 um (p.2 Sec. II.A); keep 7 um UBM plating, note 5 vs 7 um (source: audit_A)
- [target_missing] ectc.2019.00-29-F2-s11: via ~10 um; openings 10-200 um (p.2 Sec. II.A) (source: audit_A)
- [thickness_untyped] ectc.2019.00-29-F2-s12: Ti/Cu seed 1 kA in target, thickness_um empty: 0.1 + derived entry (source: audit_A)
- [target_missing] ectc.2019.00-29-F2-s13: L/S 8/8 um (p.2 Sec. II.A) (source: audit_A)
- [target_missing] ectc.2019.00-29-F2-s14: RDL design 5 um (p.2 Sec. II.A); note 5 vs 7 um (source: audit_A)
- [step_basis] ectc.2019.00-29-F2-s16: final passivation position not in Fig. 6 or Sec. III.A (role only, p.7 Sec. V.A): inferred_order with a note (source: audit_A)
- [build_seq_unverified] ectc.2019.00-29-a: TV in 2 tv_build flows (ectc.2019.00-29-F1, ectc.2019.00-29-F2); build_seq is the flow-number default: confirm the order (source: script)
- [target_missing] ectc.2019.00-29-a-L03: stack_layers.via_diameter_um 30 (die chip passivation (passivation)) of TV a appears in no step target/conditions/split/thickness of flows ectc.2019.00-29-F1, ectc.2019.00-29-F2 (source: script)
- [target_missing] ectc.2019.00-29-a-L04: stack_layers.thickness_um 5.04 (fan_out_rdl Dielectric layer #3 (final passivation) (passivation)) of TV a appears in no step target/conditions/split/thickness of flows ectc.2019.00-29-F1, ectc.2019.00-29-F2 (source: script)
- [target_missing] ectc.2019.00-29-a-L05: stack_layers.thickness_um 7.97 (fan_out_rdl Cu RDL #2 (conductor)) of TV a appears in no step target/conditions/split/thickness of flows ectc.2019.00-29-F1, ectc.2019.00-29-F2 | stack_layers.line_um 8 (fan_out_rdl Cu RDL #2 (conductor)) of TV a appears in no step target/conditions/split/thickness of (source: script)
- [target_missing] ectc.2019.00-29-a-L08: stack_layers.thickness_um 4.1 (fan_out_rdl Dielectric layer #2 (inter-RDL passivation) (dielectric)) of TV a appears in no step target/conditions/split/thickness of flows ectc.2019.00-29-F1, ectc.2019.00-29-F2 (source: script)
- [target_missing] ectc.2019.00-29-a-L09: stack_layers.thickness_um 5.98 (fan_out_rdl Cu RDL #1 + UBM (conductor)) of TV a appears in no step target/conditions/split/thickness of flows ectc.2019.00-29-F1, ectc.2019.00-29-F2 | stack_layers.line_um 8 (fan_out_rdl Cu RDL #1 + UBM (conductor)) of TV a appears in no step target/conditions/split/ (source: script)
- [target_missing] ectc.2019.00-29-a-L12: stack_layers.thickness_um 6.91 (fan_out_rdl Dielectric layer #1 (base layer, UBM) (dielectric)) of TV a appears in no step target/conditions/split/thickness of flows ectc.2019.00-29-F1, ectc.2019.00-29-F2 (source: script)
- [target_missing] ectc.2019.00-29-c-L01: stack_layers.line_um 2 (coupon positive-tone photoresist (other)) of TV c appears in no step target/conditions/split/thickness of flows ectc.2019.00-29-F4 | stack_layers.space_um 2 (coupon positive-tone photoresist (other)) of TV c appears in no step target/conditions/split/thickness of flows ectc.2 (source: script)
- [target_missing] ectc.2019.00-29-c-L03: stack_layers.line_um 5 (coupon positive-tone photoresist (other)) of TV c appears in no step target/conditions/split/thickness of flows ectc.2019.00-29-F4 | stack_layers.space_um 5 (coupon positive-tone photoresist (other)) of TV c appears in no step target/conditions/split/thickness of flows ectc.2 (source: script)

## ectc.2019.00095
- [category_other] ectc.2019.00095-F1-s02: 'SoIC bond formation on SoC (bond layer)': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing] ectc.2019.00095-a-i1: interconnects.pitch_um 10 (die_to_die_hybrid cu_cu_hybrid) of TV a appears in no step target/conditions/split/thickness of flows ectc.2019.00095-F1 (source: script)
- [target_missing] ectc.2019.00095-e-i1: interconnects.pitch_um 40 (die_stack_internal microbump) of TV e appears in no step target/conditions/split/thickness of flows ectc.2019.00095-F2 (source: script)

## ectc32696.2021.00033
- [target_missing_preexisting] ectc32696.2021.00033-a-L09: stack_layers.thickness_um 1400 (substrate_core organic substrate core (lower CTE) (core)) of TV a appears in no step target/conditions/split/thickness of flows ectc32696.2021.00033-F1 (source: script)
- [target_missing] ectc32696.2021.00033-a-i1: interconnects.pitch_um 36 (other unspecified) of TV a appears in no step target/conditions/split/thickness of flows ectc32696.2021.00033-F1 (source: script)
