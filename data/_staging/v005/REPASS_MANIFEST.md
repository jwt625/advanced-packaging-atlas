# Targeted process-flow fix manifest v005 (DevLog-007 pass B, schema v2.5, 2026-10-20)

Targeted pass: address every listed item for each paper (verify against the paper first; an item can be
'not applicable' with a reason). Do not redo the rest of the paper. Candidate items (target_missing*,
untyped_condition, category_other, build_seq_unverified) are candidates: fix only what the paper states.

## ectc51529.2024.00170
- [category_other] ectc51529.2024.00170-F1-s01: 'form cavity in substrate core': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51529.2024.00170-F1-s03: 'seal with resin material': keyword proposal no keyword match: choose an existing category or keep other (source: script)

## ectc51529.2024.00218
- [category_other] ectc51529.2024.00218-F1-s01: 'flatten bonding surfaces of top and middle wafers': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51529.2024.00218-F1-s07: 'flatten middle-wafer backside and bottom-wafer frontside': keyword proposal no keyword match: choose an existing category or keep other (source: script)

## ectc51529.2024.00227
- [generic_intro_candidate] ectc51529.2024.00227-F1-s02: stated_in_flow but located only in p.2 Sec. I: generic_description unless the paper says it was executed (source: script)
- [generic_intro_candidate] ectc51529.2024.00227-F1-s03: stated_in_flow but located only in p.2 Sec. I: generic_description unless the paper says it was executed (source: script)
- [generic_intro_candidate] ectc51529.2024.00227-F1-s04: stated_in_flow but located only in p.2 Sec. I: generic_description unless the paper says it was executed (source: script)
- [target_missing] ectc51529.2024.00227-a-L08: stack_layers.thickness_um 0.2 (other release layer (on TBM) (other)) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00227-F1 (source: script)
- [target_missing] ectc51529.2024.00227-a-L09: stack_layers.thickness_um 30 (other temporary bonding material (TBM) (adhesive)) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00227-F1 (source: script)
- [target_missing_preexisting] ectc51529.2024.00227-a-L10: stack_layers.thickness_um 700 (other glass carrier (carrier)) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00227-F1 (source: script)
- [target_missing] ectc51529.2024.00227-b-L09: stack_layers.thickness_um 30 (other temporary bonding material (TBM) (adhesive)) of TV b appears in no step target/conditions/split/thickness of flows ectc51529.2024.00227-F1 (source: script)
- [target_missing_preexisting] ectc51529.2024.00227-b-L10: stack_layers.thickness_um 700 (other glass carrier (carrier)) of TV b appears in no step target/conditions/split/thickness of flows ectc51529.2024.00227-F1 (source: script)

## ectc51529.2024.00229
- [category_other] ectc51529.2024.00229-F1-s02: 'form UV-curable PDMS replica mold from metal master mold and': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51529.2024.00229-F1-s06: 'release mold': keyword proposal profile fragment: merge into the parent step's conditions (source: script)
- [category_other] ectc51529.2024.00229-F2-s03: 'form PDMS mold from master mold; cut larger than chip': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [category_other] ectc51529.2024.00229-F2-s06: 'release mold': keyword proposal profile fragment: merge into the parent step's conditions (source: script)
- [target_missing] ectc51529.2024.00229-b-L03: stack_layers.thickness_um 10.3 (photonic polymer optical waveguide core (optical)) of TV b appears in no step target/conditions/split/thickness of flows ectc51529.2024.00229-F2 | stack_layers.line_um 8.4 (photonic polymer optical waveguide core (optical)) of TV b appears in no step target/conditions (source: script)
- [target_missing] ectc51529.2024.00229-b-L07: stack_layers.thickness_um 0.22 (photonic Si waveguide with adiabatic-taper SSC (optical)) of TV b appears in no step target/conditions/split/thickness of flows ectc51529.2024.00229-F2 (source: script)

## ectc51529.2024.00258
- [category_other] ectc51529.2024.00258-F1-s03: 'planarize oxide': keyword proposal no keyword match: choose an existing category or keep other (source: script)
- [target_missing_preexisting] ectc51529.2024.00258-a-L03: stack_layers.thickness_um 0.075 (die Si epitaxial layer (SOI device Si) (device)) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00258-F1 (source: script)
- [target_missing] ectc51529.2024.00258-a-i1: interconnects.diameter_um 0.18 (through_via tsv) of TV a appears in no step target/conditions/split/thickness of flows ectc51529.2024.00258-F1 (source: script)
