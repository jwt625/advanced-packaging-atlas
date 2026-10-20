# Schema gaps reported by extraction agents, 2026-10-19 (DevLog-005)

Verbatim per-batch reports from the structured results of workflow runs `wf_04a3c288-a69`, `wf_88564222-150`
and `wf_76e78bac-aab` (b021-b080, f001-f009). Each note is filed under the first theme it matches. Nothing here
has been acted on; input for the schema v2.x discussion (see also DevLog/audits/audit_x1_2026-10-18.md section 5
and the audit_x2 files).

Total: 256 notes.

| theme | notes |
|---|---|
| Interconnect taxonomy (ic_type / level / bonding_method) | 46 |
| Figures table (figure_kind, labels, candidates) | 39 |
| Metric ranges, spreads, statistics | 22 |
| TV model (package_class, tv_kind, pooled, concept/roadmap) | 20 |
| Assembly stage, splits, DOE legs | 14 |
| Process steps (step_category, flow structure) | 13 |
| Relative / normalized values | 5 |
| Stack-layer and via geometry fields | 15 |
| Components, materials, properties | 14 |
| Interfaces and thermal | 9 |
| Other | 59 |

## Interconnect taxonomy (ic_type / level / bonding_method) (46)

- b021: No interconnect_type for mm-scale backside slot or multi-circle thermal vias (ectc51846.2026.00117), so ic_type other was used with pad_x/pad_y for the slot size. There are also no min/max columns for pad size.
- b022: Approximate plot-read values for cumulative distributions use statistic=median plus a value:approx qualifier; there is no field for read-off uncertainty other than notes
- b022: interconnects has no field for relative-only DOE dimensions (Cu2/Sn as X/Y, 1.3Y); recorded in notes and metrics.variant
- b023: No interconnect_level/ic_type for a UBM pad to substrate joint whose solder type is unstated (used unspecified).
- b023: metrics.value cannot hold a ratio with reference_tv_id cleanly when the base TV has no absolute value (relative-only warpage stored as value_text on the base TV).
- b025: interconnect_level has no die-to-wafer microbump level; used die_stack_internal for D2W microbumps
- b026: No column for Cu stud/post spacing (edge-to-edge) or via enclosure as a design rule; put in notes/metrics.
- b027: No interconnect_type for a fusion bond film that carries no signal. Recorded only as a stack layer.
- b028: optical_interfaces.coupling_loss_db is positive-only while metrics keep the printed negative IL sign; convention noted in scope.
- b032: Normalized/relative metrics (thermal resistance = 1 reference, unitless blanket warpage) have no dedicated normalization field; unit text 'relative (...)' used
- b033: interconnect_level has no value for die-pad-to-RDL Cu studs in chip-first fan-out (used 'other' with ic_type cu_pillar)
- b035: No interconnect_type for substrate bump pads with no die attached (UCIe bump map); used unspecified.
- b036: No field for normalized/relative values (warpage as 'x A mil' or '% of spec'); used unit strings plus reference_tv_id.
- b036: No interconnect_level for bridge-to-RDL Cu bump in a molded embedded-bridge interposer (used level other, ic_type other).
- b039: tv_kind has no fit for a study whose sim-vs-measurement basis is unstated (00047-d set to 'other').
- b040: interconnect_type lacks a generic 'solder bump' / 'cu bump' value: 175 um bridge bottom bumps and SSSC Cu bumps entered as other
- b046: No interconnect_level for vertical through-mold external electrodes or micro balls whose target level is unstated (used die_to_substrate / unspecified)
- b046: No interconnect_type for a free-standing intermediate pillar (PSB MicroPillar) between two solder-capped Cu pillars; entered as cu_pillar with notes
- b047: No stud_bump interconnect_type: Au stud bump TCB entered as other
- b049: No interconnect_level for die-to-RDL Cu studs in chip-first fan-out (used other).
- b049: Normalized or relative simulation outputs (relative strain, normalized warpage) have no unit convention; used unit 'relative' with the normalization in scope.
- b052: No interconnect_type or bonding_method fits a bumpless via-last TSV landing directly on an adhesive-bonded die pad: used ic_type other with bonding_method adhesive, plus a separate tsv row.
- b053: No basis value for a relative R/C/EEP comparison table whose method (simulation or measurement) is not stated: used unspecified.
- b053: No interconnect_level for the die-to-RDL Cu stud in fan-out: used die_to_substrate.
- b053: No interconnect_type for LGA lands, Cu stumps or Ni/Au back bumps: used 'other' with metallurgy and notes.
- b054: Pillars whose metal is not stated (MicroPillar, tall through-mold pillar) map only to ic_type 'other'; no generic 'pillar' or 'through-mold pillar' type.
- b055: A study whose substrate variant is unstated (stiffener warpage) needs its own TV; no way to link it as a variant of sibling TVs g/h.
- b056: interconnect_type/bonding_method have no Au-Au thermocompression or Si-Si direct (fusion) die-stack bond type; used ic_type 'other' (bonding_method fusion / other)
- b059: interconnect_level has no direct Cu-Cu (non-hybrid) die-to-die level; used die_to_die_hybrid for inverse hybrid bonding.
- b060: No interconnect level/ic_type for oxide-only fusion bonds (used level wafer_to_wafer_hybrid + ic_type other, bonding_method fusion)
- b061: Relative-only plots (no axis values, e.g. Maszara surface energy, b-HAST time) can only be value_text; result enum has no 'qualitative' option, so na was used
- b061: interconnect_level has no D2W solder-microbump level; used die_stack_internal for D2W TCB microbumps (consistent with prior batches)
- b062: No field for normalization reference of relative metrics (normalized formulation ratios, warpage 'level %'); recorded in metrics.scope.
- b063: No interconnect_level for a wafer-level ball-on-UBM vertical interconnect ahead of fan-out (used other)
- b064: interconnect_type/bonding_method have no value for non-Cu metal-metal direct bonding (Nb-Nb hydrophilic direct bond), and there is no level for a blanket (unpatterned) W2W metal bond; 'other' used
- b066: No interconnect_type for porous/nanoporous Cu bumps or other solderless bump bonds; used ic_type other.
- b066: No package_class or interconnect_level for chip-to-chip bonding test coupons or unbonded wafer bump coupons; used microbump_3d / die_stack_internal / other.
- b069: No bonding_method enum for SLID/TLP bonding (used tcb)
- b070: No interconnect_level/ic_type for a non-electrical wafer-level seal bond (Cu-Sn slit-to-fin wafer bond) or pressure-contact probes; used level/type other.
- b072: interconnect_level has no chip-to-chip (non-hybrid) option; self-assembled nanosolder chip-to-chip joints entered as level other, ic_type other.
- b074: interconnect_level has no non-hybrid wafer-to-wafer (Cu-Sn-Cu SLID glass-to-glass) level, and no level for an antenna array on a Si-wafer package; used other
- b074: interconnect_type has no through-oxide via (TOV); used other
- b076: interconnects has no field for post-bond (deformed) bump diameter; entered as a geometry metric
- b078: No interconnect_level for interposer-to-interposer (stacked SLSI Cu-Sn bond) or glass-layer-to-glass-layer joints; used level other.
- b078: No interconnect_type or bonding_method for Cu-Sn SLID/IMC bonding or sintered Ag paste joints (used other / sintering).
- b079: Process splits given only in relative units (seed thickness % of POR, current density % of optimum) have no numeric column. They are recorded in metrics.variant and process_steps.conditions text.

## Figures table (figure_kind, labels, candidates) (39)

- b021: figures.label has no convention for uncaptioned images. 'Unnumbered figure (p.5)' was used.
- b022: figure_kind has no value for void-inspection wafer maps or alignment/overlay scatter plots (used 'other' for 00219 Fig. 7 and Fig. 13)
- b023: candidates.json missed a figure whose cand png exists (ectc51906.2022.00140 p02_fig2).
- b024: No figure_kind fits geometry/TTV statistic plots (used 'other').
- b033: figure_kind has no value for yield or process-learning bar charts (used 'other' for ectc51909.2023.00266 Fig. 11)
- b035: No figure_kind for per-coupon maps or topography heatmaps (thickness/width maps, WLI); used other.
- b039: No figure_kind for process-window/XPS/yield-map plots; used 'other' and 'data_table'.
- b041: figure_kind lacks a lithography/process-window (Bossung) plot kind and a fixture/CAD drawing kind (used other)
- b042: figure_kind has no value for a process map (fillet vs non-coverage, 00064 Fig. 4): used 'other'
- b045: No figure_kind for metrology plots such as AFM dishing box plots or CMP topography profiles (used 'other').
- b050: No figure_kind for parameter-vs-process-time plots with SEM insets; used other.
- b053: No figure_kind for overlay-vs-radius (alignment metrology) plots: used other.
- b056: figure_kind has no box-plot/metrology-plot kind for AFM Cu-recess data; used 'other'
- b057: figure_kind has no box-plot/histogram/geometry-distribution kind; eptc62800 Fig. 3 (PID undulation box plot) and Fig. 5 (line-width histogram) used 'other'
- b058: No figure_kind for process-parameter plots (MRR, WIPNU, recess, oxide thickness); used other
- b060: No figure_kind for yield/process-control charts (used other)
- b063: figure_kind has no class for alignment/overlay distribution plots (used other)
- b066: figure_kind has no materials/microstructure plot (grain-size bar chart) or measured stress map; used other and mechanical_plot.
- b067: No figure_kind for process recipe profiles (T/P vs time) or litho Bossung/CD plots; used process_flow and other.
- b068: No figure_kind for a CAD/3D design rendering (00302 Fig. 2 filed as top_view_layout).
- b069: No figure_kind for yield/bar charts (used other)
- b073: No figure_kind for process/geometry data plots (CD uniformity bar charts, via diameter vs focus offset); used 'other'.
- b074: figure_kind has no alignment/overlay scatter kind; used mechanical_plot / xray_csam
- b076: No figure_kind for surface-analysis depth profiles (XPS/ToF-SIMS) or wafer overlay maps; used other
- b078: No figure_kind for a confocal/profilometer depth profile through a via (used other).
- b079: figure_kind has no process-characterization or metrology plot value (Cu shell thickness vs plating time; lithography CD box plots). Used 'other'.
- f001: No figure_kind for metrology or process-result plots (overlay box plot, lithography resolution map by coupon), so 'other' was used.
- f002: No figure_kind for dispense/process metrology such as the jetted dot-size slit test (ectc51906.2022.00106 Fig. 6), so it is recorded as 'other' with a note
- f003: figure_kind has no value for measurement-setup figures; Fig. 7 of ectc51529.2024.00093 was tagged as `other`.
- f003: figure_kind has no value for mixed simulation-plus-hardware panels; Fig. 10 of ectc51909.2023.00235 was tagged as cross_section with tv_ids a;c.
- f004: Several existing DB locators cite the caption page rather than the panel page (ectc51906.2022.00176 'p.4 Fig. 3'; panels are on p.3); figures.page uses the panel page, so the two differ.
- f004: figure_kind has no enum for uniformity/thickness maps or for design-space plots such as aspect ratio vs thickness; these were entered as 'other' with a note.
- f005: figure_kind has no scanning acoustic microscopy (SAM) value; the SAM image was filed under xray_csam
- f006: Candidate detection mislabels OCR'd figure numbers (p07_fig1 = Fig. 11) and fails on boxed IEDM layouts; no field flags a wrong candidate label
- f006: No figure_kind for adhesion/shear or link-power analysis; Fig. 6 (ectc51909.2023.00274) shear+V-I filed as reliability_plot
- f007: figure_kind has no value for process-metrology plots (dishing depth, peel strength); none was needed in this batch, so 'other' was not used.
- f008: No figure_kind for general metrology plots such as photoresist thickness profiles; used other
- f008: No figure_kind for process-condition profiles (bonding temperature/load vs time) or process fixtures; used other
- f009: No figure_kind for hydraulic/flow plots (pressure drop vs flow rate, tcpmt.2023.3266666 Fig. 8); would need 'other'

## Metric ranges, spreads, statistics (22)

- b028: No std-dev column in metrics: std. dev. entered as separate rows with statistic 'other' (66 metric rows for 00012).
- b029: Paper-level reliability results without sample counts or standards (00049 Table III, 00136 Table 3) fit only as pass/fail value_text metrics.
- b037: metrics has no value_min/value_max: per-sample scatter ranges (00265 Fig. 7) had to go in value_text
- b039: metrics has no min/max columns; ranges such as single-via R 1e-3 to 1e-2 ohm go to value_text.
- b042: interconnects has no min/max for bonding temperature/force windows (300-380 C, 100-300 N): kept in notes and process_steps.conditions
- b043: No column for BER/eye margin numeric bathtub data when only plots are given; value_text used.
- b044: metrics has no value_min/value_max, so ranges such as the He leak rate 1e-8 to 1e-7 Pa m3/s go in value_text
- b044: package_class has no fit for an optical-redistribution substrate without chips or a bare PIC sub-assembly with polymer waveguides; 'other' used
- b044: statistic enum has no standard_deviation value; 'other' used with a note
- b046: metrics lacks a numeric range pair (value_min/value_max) for plotted spreads such as the LELE Kelvin via resistance spread (about 0.8 to 1e4 ohm); value_text used
- b054: metrics.value cannot hold a list or range without value_text (e.g. several SEM depths); used value_text.
- b057: metrics has no value_min/value_max; ranges such as 'about 3-4 mm' warpage and reliability T0/T1 spreads went to paired min/max rows or value_text
- b061: metrics.value is single-valued; ranges read from bar charts (e.g. bump heights 4.1-5.2 um, per-via R 0.2-0.6 ohm) had to go in value_text
- b063: metrics has no spread/sd column; +/- values kept in notes
- b065: metrics has no value_min/value_max: IMC thickness ranges (0.6-1.3, 0.3-0.6 um) stored as value_text with statistic range
- b067: metrics.value cannot hold ranges read off scatter plots; used value_text plus statistic=range.
- b068: No metric/statistic slot for '+/-' uncertainty paired with a mean (coupling loss 1.756 +/- 0.029 dB had to be split into two metric rows).
- b070: No component_type for a coolant manifold or slit/distribution layer distinct from micro_cooler; used micro_cooler for slit wafer and other for manifold.
- b071: interconnects has no diameter range or top/bottom diameter columns: tapered TGV top 175-190 / bottom 90-120 um went to metrics value_text (ectc51846.2026.00416).
- b072: No range columns for bonding/process temperature (e.g. 205-210 C, 210-220 C); kept in notes/conditions with temp_c blank.
- b073: Interconnects lack diameter min/max columns (TGV radius range 60-80 um kept in notes).
- b078: interconnects.resistance_mohm holds one value; a reported range (0.620-0.840 ohm per via) has no min/max columns, so it went to metrics.

## TV model (package_class, tv_kind, pooled, concept/roadmap) (20)

- b026: No home for platform-level design-rule roadmaps or tool/process throughput claims that belong to no physical build; used a tv_kind 'other' pseudo-TV (eptc56328.2022.10013262-e).
- b026: papers.has_process_flow cannot say that the flow is generic (platform) rather than TV-specific.
- b027: No package_class for a Si micro-cooler die stack (a fusion-bonded Si carrier on a thermal test vehicle). Used `other`.
- b028: No field for capability claims (e.g. 'sub-2 um L/S' platform capability) distinct from demonstrated builds; entered as design_target with lt qualifier.
- b038: package_class has no class for an embedded passive (ferrite core / inductor) in a glass core; used glass_core_substrate with a note
- b040: Concept-only process flows (no build) have no explicit flag beyond leaving performed blank and TV notes
- b047: No BSPDN package_class or buried_power_rail interconnect type: entered as other
- b047: No SiC material_class/package_class/via type: TSiCV entered as tsv, SiC as ceramic, package_class other
- b049: No package_class for Si-IF / TSV-less silicon interconnect fabric; used si_interposer_2p5d.
- b052: No package_class fits a bridge-on-Si-substrate assembly coupon or a TSV process wafer, so both use 'other'.
- b056: package_class has no fit for a solder-free Cu-Cu TCB 3D stack (neither hybrid_bonded_3d nor microbump_3d) or a bonded-Si microfluidic cooler stack; used 'other'
- b060: No package_class for a generic 'silicon bridge interposer' with no carrier type given (used other)
- b060: No package_class for fusion-bonded TSV-last wafer stacks without hybrid Cu pads (used other)
- b064: package_class has no value for wafer-level bumping or bonding test wafers without a package (microbump_3d/other used)
- b066: No package_class for lithography/plating process test builds (resist on panel); used other.
- b067: Equipment-characterization papers (ion source, exposure tool, cure oven) have no natural home: tool metrics hung on a tv_kind=other TV with package_class=other.
- b068: No component_type for a power stage IC / DrMOS (filed as other); package_class has no DC-DC / power module class (filed as other).
- b074: No package_class for a die-level via-last TSV on a temporary carrier, or for a glass antenna array stacked on a Si package; used other
- b076: optical waveguide coupons (no electrical layers) have no good package_class; used photonic_interposer as inferred
- b080: No package_class for bare TSV test wafers or for a 3D die stack with embedded microfluidic cooling (used other)

## Assembly stage, splits, DOE legs (14)

- b021: Assembly stage (substrate only vs after chip assembly) and material splits that the paper treats as options of one design (glass Low/Middle CTE) have no dedicated column, so they went into metrics.variant. This repeats the b020 judgment call.
- b024: Per-wafer-split rows (TiN thickness, CD, ESL) live in metrics.variant only; nothing ties a split to the interconnect/layer rows it changes.
- b032: Material property sets of material splits (LMC A/B/C Tg/CTE/modulus) only fit stack_layers.properties text, which forced one coupon TV per resin
- b032: Simulation-model TVs with two geometry variants (rectangular vs rounded trace) forced into one TV with same-seq stack rows; no variant column in stack_layers
- b035: No way to assign line/space test features to a stack layer when the paper does not name the metal layer; attached to M1 seq with a note.
- b038: No field for a TV-level die-stack size when top/bottom die split is unknown; 10.4x10.4 mm put in package_x/y_mm on a die_stack TV
- b040: No field for stage of a shared sub-assembly (e.g. CUF+EMC interposer module common to TV1-4): stage metrics hung on TV1 with variant text
- b045: No interconnects column for bond-layer Cu pattern density (%); kept in metrics.variant/notes.
- b054: Split variables that change a layer's material (Oxide vs Polymer ILD in simulation models) have no clean home: rule (f) says new TV for a different stack, but the paper treats them as one model; used same-seq stack_layers rows with feature 'Oxide/Polymer variant' plus metrics.variant.
- b055: Stack layers cannot mark that one build-up/SR thickness applies to both sides without a side split; duplicated front/back rows with a note.
- b057: No clean way to record many simulation configurations (18 CoWoS package x HBM height x bonding scheme combinations) without TV explosion; kept as metrics.variant on 2 simulation TVs
- b058: No way to attach process-split yields to interconnect rows; split data kept in metrics.variant
- b071: Several process splits change a layer that is later removed (sacrificial Cu barrier, no-barrier ablation). Rule f does not say whether this counts as a new TV; I kept them as variants.
- f001: A figure split across pages (ectc.2011.5898527 Fig. 1: panels (a),(b) on p.1, (c) on p.2) can carry only one page and bbox, so panel (c) was dropped and noted.

## Process steps (step_category, flow structure) (13)

- b023: No step_category for bump/C4/Cu pillar formation when the method is not stated (used other); no category for PR coat (used lithography).
- b026: process_steps has no field for flow-level state such as 'TV built only up to step N'; used performed=no on later steps of a generic flow.
- b041: No field for tooling dimensions (stencil thickness) distinct from deposited thickness; put in process_steps.conditions
- b041: step_category lacks ion_exchange and glass melting/forming categories (used other)
- b043: No field for bonding force in kg (lid snap cure 15 kg) in process_steps; kept in notes.
- b050: No metric_category for hydraulic quantities (pressure drop, flow rate); entered under thermal.
- b054: No ion-implantation or silicidation step_category (used 'other' for CEA-Leti SiPh FEOL steps).
- b059: No ALD/vapor-phase deposition step_category; used deposition_other.
- b062: No step_category for Cu damascene metallization (used 'other').
- b065: no field for laser bonding parameters (laser power W) in interconnects; kept in process_steps.conditions
- b068: No step_category for ion exchange or femtosecond-laser glass modification (SLE), so these were filed as other.
- b070: No oxidation step_category; used deposition_other.
- b075: step_category lacks mechanical drilling and laser cutting of sheets; used 'other'.

## Relative / normalized values (5)

- b034: Geometry given only as normalized ratios (open TSV openings 5.5x/8x of an unstated x) has no column; kept in notes and evidence entries
- b035: No metric_category for process counts (flux-cleaning cycles) or architecture runtime ratios; used other.
- b043: Normalized quantities (die shift in units of an undisclosed spec M) have no clean home; stored as metrics with unit 'x M'.
- b051: No convention for normalized or unit-free values: die shift stored as multiples of an undisclosed spec M, with unit 'M' or 'M per die'.
- b052: Normalized-only process conditions (cure temperature and pressure) can only go in free-text conditions.

## Stack-layer and via geometry fields (15)

- b024: No line-pitch column in stack_layers (BPR pitch 105 nm) and no slit-length field for non-circular vias (400 nm slit nTSV); both kept in notes.
- b024: stack_layers has only roughness_ra_um; RMS roughness (Rq) had to go into properties text.
- b025: No field for asymmetric top vs bottom via CD in hybrid-bond pairs; bottom CD kept in notes
- b027: No stack_layers structure value for a motherboard/PCB. Used `other` with feature 'motherboard'.
- b028: No per-pitch pad CD mapping field when a TV carries several pitches/designs on one wafer; handled as interconnect rows with notes.
- b038: interconnects lacks a pad-shape field; '2 um pad' entered as pad_x_um only
- b046: stack_layers has no field for a layer's bottom electrode/liner sides in damascene (barrier on 3 sides); captured in notes
- b051: stack_layers has no metal pitch column (only line/space). The Fig. 2 metal pitch caption was not entered.
- b053: No stack_layers structure for a backside RDL on a die (BS RDL on an HBM-type base die): used structure 'die' with seq top-down, side single.
- b065: stack_layers cannot express interleaved repeated RDL/passivation stacks (3 metal + 4 passivation) other than two rows with repeat
- b066: stack_layers seq assumes vertical stacking; radial TSV liners (SiO2/Ta/seed/fill) do not fit, so the seq order was noted as radial.
- b072: No column/enum for temporary carrier wafers or bonding layers: carriers entered as component_type other and stack_layers structure other with layer_role carrier.
- b073: No interconnect columns for via top vs bottom diameter or taper angle; entered as metrics.
- b075: stack_layers.structure has no good fit for a magnetic-core/dielectric/winding sandwich inside an organic substrate (embedded inductor); used 'other'.
- b079: stack_layers seq is defined top-down only. For via sidewall liners (seed/barrier/liner inside a TGV/TSV) I ordered seq from the via centre outward within the feature, and the notes say so.

## Components, materials, properties (14)

- b024: electrical_interfaces has no per-length loss field (dB/mm) and needs a protocol, so material/channel IL-vs-frequency data from RF characterization papers went to metrics.
- b027: No component_type for a PMIC or buck-regulator controller (`ivr` means an integrated regulator). Used `other`.
- b037: No TV or component field for stiffener ring width or lid/stiffener footprint (kept in notes)
- b038: component_type has no magnetic core entry; ferrite core entered as 'other'
- b048: No home for equipment-level characterization (bond-head thermal expansion, FLOLA vs TCB) other than metrics rows attached to a TV
- b050: No component_type for gasket, coolant manifold or polymer waveguide film; used other.
- b055: No component_type for image sensor die (BI-CIS); used other.
- b056: component_type has no thermal test chip (TTC); used 'other' with is_emulator yes
- b066: No metric_category for material/microstructure properties (porosity, grain size, etch rate); used other.
- b071: No component_type for a discrete power MOSFET or a photodetector (used other), and no structure value for a laser hard-mask or barrier film on a coupon.
- b072: Material-level properties (paste DSC peaks, viscosity minimum, particle size) have no paper-level home; attached to one TV with scope 'applies to all TVs'.
- b075: component_type has no magnetic_core value; embedded magnetic cores entered as 'other' with material and supplier.
- b077: No component_type for a test heater or working fluid; used other plus material text.
- b080: No component_type for a cap/sealing die or a coolant manifold (used other)

## Interfaces and thermal (9)

- b034: No dedicated home for a via/vertical-path insertion loss that is not a protocol interface; used electrical_interfaces with protocol unspecified, following the ectc.2019.00095 precedent
- b037: TIM1 coverage % has no natural metric_category (entered as thermal for the measured SAM value, geometry for the design table)
- b039: No eye-width (UI) column in electrical_interfaces; eye widths stored as metrics rows (00047).
- b040: components has no capacitance column: decoupling capacitance (nF) went to name/notes plus a power_delivery metric
- b047: optical_interfaces has only mfd_fiber_um; no field for the MFD of an on-substrate glass waveguide (put in notes)
- b049: electrical_interfaces.lanes is ambiguous for multi-interface systems (per interface vs total); used per-interface count with a note.
- b054: electrical_interfaces has no field for -3 dB bandwidth or eye height; entered as metrics.
- b071: electrical_interfaces is shaped for D2D/HBM PHYs. A single-lane EML driver path (substrate -> TGV -> EAM, 212.5 Gbps PAM4, 89 GHz EO bandwidth) fits poorly: protocol other, bandwidth went to metrics.
- b071: optical_interfaces has no field for spot radius or alignment tolerance (+/-0.77 um at 1 dB). Both went to notes and metrics.

## Other (59)

- b021: No field to state whether a figure-derived value is measured or simulated when the text and the figure disagree (Fig. 11 in 00117). basis unspecified was used and the conflict is logged in evidence.
- b022: No column for die area when only mm2 is given and not x/y (00181 die areas 70/110 mm2 and 00219 Table I 410 mm2 are in notes only)
- b022: Unsigned warpage magnitudes in a table next to a signed plot: the sign convention can only be written as text in scope
- b023: No structure enum for a temporary carrier (organic/glass carrier recorded as structure other, layer_role carrier) or for backside metallization (BSM recorded as structure other).
- b025: No structured way to hold conflicting layer-count notations (10-2-10 vs 24-layer); handled in evidence conflicts
- b029: No figure-level field to flag a duplicate figure number in the source (00136 has two 'Figure 15'); handled via page + notes.
- b032: No column for per-level measured dimensions of stacked vias (e.g. 5.1/5.2/5.2/5.0 um): kept in evidence entries and notes
- b032: Tool-spec overlay accuracy (stepper 0.3 um 3 sigma) has no clean home; placed in interconnects.alignment_um with override stated
- b033: No field for design-rule minima (Table I min sizes/pitches); entered as values with 'ge' qualifiers
- b036: No metric_category for placement/bonding alignment accuracy (used geometry).
- b037: No field for warpage measurement method or for sample count per marker group
- b037: No way to mark a paper-internal legend-vs-text basis inconsistency (00187 Fig. 9(a) 'Moire' bars) except basis unspecified plus a conflicts entry
- b042: components has no area column: area-only die sizes (e.g. SoC 332.8 mm2, HBM 121 mm2) are kept in notes
- b043: Generic technology projections (BW density vs bump pitch) need a simulation_model TV to hang on; no paper-level metrics table.
- b043: No substrate/package area column for papers that give only area (7200 mm2); stored as geometry metric plus notes.
- b043: protocol enum has hbm4 but no hbm4e; used hbm4 with protocol_as_written HBM4e.
- b044: no dedicated parameter/category for hermeticity (He leak); filed under reliability
- b045: Interconnects lacks a generic 'pad size' field distinct from diameter for undefined-shape pads (3 um stored as pad_x_um).
- b048: interconnects.count has no way to state its scope (per chip vs per coupon/wafer); the scope of the 515,337 bump count is recorded in the evidence file only
- b048: interconnects.resistance_mohm cannot distinguish a per-link daisy-chain value that includes wiring from a pure joint/TSV resistance; this is noted per row
- b049: Rule 13 cited-work exclusion is ambiguous when the cited work reports the same physical TV (UCLA 0.38 pJ/bit via [13]).
- b051: There is no flag for a partly garbled text layer that has no TEXT_LAYER_WARNING.md (vlsi p.1 font-encoded plus an OCR copy); this was recorded in notes and evidence.
- b051: components has no capacitance column, so HDMIM uF values sit in the name and in metrics.
- b052: Embedded passive (Si capacitor) RF figures such as C, ESR, SRF and ESL have no dedicated table: entered as metrics with category power_delivery.
- b055: No field for die-to-interposer standoff/gap or bump-to-bump space (Table I 'gap b/w chips', 'space b/w bumps'); put in notes.
- b055: No interconnect level for chip-on-wafer solder micro-bumps (die_to_wafer exists only as hybrid); used die_stack_internal.
- b056: carrier_format enum has no 100 mm / 4 inch wafer option (used 'other' with size in carrier_size_mm)
- b057: protocol enum has no generic 'ucie' for an unspecified UCIe package type; 'UCIe x32' entered as other with protocol_as_written
- b058: No metric_category for surface chemistry/oxide state (oxide thickness, EDX oxygen, wettability); used other
- b058: interconnects.height_um defined as Cu part when a cap is given, but paper gives only total bump height plus solder thickness; entered total with note
- b059: No interconnect field for specific contact resistance (ohm*cm2); entered as metrics.
- b061: No field for landing-pad diameter separate from top-bump diameter; used pad_x_um/pad_y_um = landing pad diameter (noted per row)
- b061: No paper-level metrics: results whose TV is unstated (EMMI/TEM match rate in ectc51906.2022.00113) must be attached to an arbitrary TV
- b063: interconnects.resistance_mohm cannot record Kelvin vs daisy-chain-link basis or measurement temperature (notes and metrics used)
- b064: No place for paper-level estimates not tied to a TV (wafer vs panel utilization table attached to the most relevant TV)
- b065: interconnects.alignment_um is a single number: X and Y |Mean|+3sigma overlay cannot both be stored (worst axis entered, other in notes)
- b066: carrier_format has no wafer_150mm; used other with carrier_size_mm 150.
- b067: No column for a lithography/exposure field size distinct from package or interposer size; 18-reticle field went into metrics, and reticle_multiple stayed empty.
- b068: Embedded discrete capacitor array internal stack has no natural structure enum (used die).
- b069: No interconnects column for anneal pressure (batch anneal <150 MPa put in notes)
- b070: Dimensionless metrics (COP) have no unit convention; unit left empty.
- b072: No field for a temporary/permanent bond distinction or debond method on interconnects/process; recorded via step category debonding/temporary_bonding and notes.
- b073: No component columns for passive capacitance/ESL/ESR (DTC 2.8 uF); entered as metrics.
- b074: No table for RF/antenna performance (S11 bandwidth, gain, beam scan, line loss in dB/mm); entered as metrics category electrical
- b075: No metric field for model-vs-measured pairs; model predictions (Lmon/Lphy, DCR model) entered as separate metric rows with basis simulated/derived.
- b075: carrier_size_mm cannot hold inch-specified wafers cleanly (4 inch Si wafer); left empty, stated in notes.
- b076: No metric_category for material/microstructure analysis (grain size, oxide thickness, interdiffusion); used other
- b076: bonding_temp_c cannot express 'room temperature' without a number; left blank and put in notes
- b077: No metric_category for material rheology or process compatibility (melt viscosity); used other.
- b077: Non-electrical hermetic Si-Si fusion seal has no natural interconnect level; recorded as a process step and a bonding stack layer.
- b077: Unsigned coplanarity and signed warpage can only be told apart through the scope text.
- b078: interconnects.count is ambiguous between per-die and total (HV-ASIC 541 per ASIC x 16 ASICs); noted in notes.
- b079: No column for a via-filler particle size or volume fraction (e.g. 20 um diamond, 50 vol%). Recorded in metrics (geometry) and notes.
- b080: figures table allows one page/bbox per figure; Fig. 12 of ectc51846.2026.00096 spans two pages (steps 1-6 on p.4 left out, named in notes)
- f002: No guidance on reprinted when a caption credits a company ('Source: DECA') with no reference number; recorded reprinted=no with a note
- f004: Multi-panel figures that mix a photo, SAM images and a histogram (ectc51529.2024.00227 Fig. 6/8) fit no single kind; entered as xray_csam with the panels listed in notes.
- f005: Figures that combine a yield plot with an SEM cross-section (00179 Fig. 14) can take only one kind; filed as electrical_plot
- f006: Combined figures (schematic + warpage map + photo, e.g. ectc51909.2023.00091 Fig. 6/7) need a single kind; used stack_schematic
- f009: Mixed-panel POC figures (schematic + top view + cross-section) forced into a single kind; chose cross_section
