# Batch b044 report (2026-10-19)

Validator: `0 errors, 0 warnings (data/_staging/b044)`

## ectc51846.2026.00092 (TSMC, micropillar direct-to-silicon cooling on CoWoS-R)
- Status: distilled. has_process_flow: yes. primary_bucket thermal_pdn (as batch file).
- Rows: papers 1, test_vehicles 3, components 21, stack_layers 19, interconnects 0, process_steps 7, electrical 0, optical 0, metrics 40, figures 6.
- TVs: a micropillar TTV (manifold lid, sealant); b lidless TTV + TIM1.5 PCM + cold plate; c lidded TTV + TIM1 + lid + TIM2 PCM + cold plate.
- Figures opened: page_02-06 renders; 300 dpi re-crops of Fig. 1, 9, 10, 11; candidates p02_fig1, p02_fig2, p02_fig3, p04_fig7, p05_fig9, p05_fig10, p06_fig12; manual crop of Fig. 7.
- Key figures: f01 Fig. 1 stack_schematic (candidate); f02 Fig. 3 process_flow (candidate); f03 Fig. 7 top_view_layout (manual, legend line cut in candidate); f04 Fig. 10 thermal_plot (candidate); f05 Fig. 2 micrograph (candidate); f06 Fig. 12 reliability_plot (candidate).
- Judgment calls:
  - Lidless and lidded cold-plate baselines are separate TVs (different TIM/lid stack).
  - TDP-vs-flow values were read off Fig. 9/10 (+/-0.03 to 0.05 kW). The text flow rates disagree with the plots: the text gives 4 kW at 4 LPM and 5.3 kW at 8 LPM, and the abstract gives >5000 W at 6 LPM, while Fig. 10 shows 3.15 kW at 4 LPM and 5.05 kW at 10 LPM. The lidless/lidded text ranges at 1-2 LPM also disagree with Fig. 9. The plot values are entered and the alternatives are in evidence conflicts. The abstract claims (>5000 W, 3.7 W/mm2) are kept as their own text rows.
  - The text gives sealant readouts of TCG 500x / HTS 250 h / uHAST 96 h / water 250 h. The Fig. 11 DoE gives 264 h / 1000 h / 1000 cycles / 1000 h. The text durations are entered; Fig. 11 is read as the plan.
  - The carrier protective layer cross-cut adhesion (0B/1B vs 5B) is entered as adhesion metrics on TV a, with the scope "process carrier coating".
  - Sealant dispense and lid attach come after oS in process_steps. That position is inferred, and the rows' notes say so.
- Not reported: interconnect specs; micropillar dimensions; interposer/die/package sizes; lid and sealant materials; critical He leak rate value; Fig. 12 y-values.

## ectc51529.2024.00133 (U Tokyo / Ajinomoto / Spectronix / Mitsubishi Electric, 3 um DUV laser vias in ABF)
- Status: distilled. has_process_flow: yes. primary_bucket advanced_substrate.
- Rows: papers 1, test_vehicles 1, components 1, stack_layers 4, interconnects 1, process_steps 6, electrical 0, optical 0, metrics 4, figures 5.
- Figures opened: page_02-04 renders; candidates p04_fig7, p02_fig1, p04_fig5, p03_fig4, p02_tablei, p04_fig6.
- Key figures: f01 Fig. 7 cross_section; f02 Fig. 1 process_flow; f03 Fig. 5 micrograph; f04 Fig. 4 block_diagram; f05 Table I data_table. All are candidates.
- Judgment calls:
  - package_class is other (model substrate: ABF/Cu on a glass carrier).
  - The ABF layer is split into two rows: 3 um over Cu and 6 um over glass, both "about" (approx).
  - Laser specs come from the Fig. 4 table (<15 ps FWHM, >50 W). The text says <10 ps and 50 W, logged as a conflict.
  - Cu "spaced 30 um apart" is entered as space_um 30 (Fig. 7(b) bar spans the gap).
  - ABF Table I values go in layer properties. Peel >0.5 kgf/cm is an adhesion metric with basis unspecified.
- Not reported: via bottom diameter/taper angle, via count, laser fluence/pulses (AI-optimized and undisclosed), ABF grade, lamination conditions, metallization, reliability.

## ectc51529.2024.00229 (AIST, nanoimprint micro-mirrors for CPO optical re-distribution)
- Status: distilled. has_process_flow: yes. primary_bucket cpo.
- Rows: papers 1, test_vehicles 2, components 2, stack_layers 11, interconnects 0, process_steps 13, electrical 0, optical 3, metrics 12, figures 6.
- TVs: a 75-mm-square substrate with four 40-mm imprinted mirrors (test_coupon); b 26.0 x 16.5 mm SiPh die with optical re-distribution (sub_assembly).
- Figures opened: page_04 render; 110 dpi grids of p.1-3; candidates p01_fig1, p02_fig3, p03_fig4; manual crops of Fig. 1, 3, 4, 5, 6, 7 (montage checked).
- Key figures: f01 Fig. 1 stack_schematic; f02 Fig. 3 process_flow; f03 Fig. 4 package_photo; f04 Fig. 5 micrograph; f05 Fig. 6 optical_plot; f06 Fig. 7 optical_plot. All six are manual: the candidates included neighbouring text or cut axis labels or panel bottoms.
- Judgment calls:
  - package_class is other for both TVs. No enum fits "package substrate with imprinted optical mirror, no chips" or "bare SiPh die with polymer WG re-distribution".
  - The mirror-based coupler loss of 10.2 dB is author_estimate.
  - The SSC beam diameter of 2.28 um (y) goes in mfd_chip_um, with z = 2.25 um in the notes.
  - The polymer WG measured size is 10.3 um high x 8.4 um wide, entered as thickness_um / line_um (design 8 um).
  - Alignment is left empty (not stated).
  - The reference TDECQ of 1.4 dB is read from the Fig. 7(a) label.
- Not reported: substrate material; channel count; fiber pitch; UV dose; spin conditions; throughput per shot; reliability; electrical interfaces.

## Source quality
- ectc51846.2026.00092: the text flow rates are internally inconsistent with Fig. 9/10 (see conflicts).
- ectc51529.2024.00229: most candidate bboxes need manual re-crops.
- No OCR or garbled text layers.

## Schema gaps
- There is no figure_kind or metric column for hermetic leak rate. It went into the reliability category, with value_text for the 1e-8 to 1e-7 Pa m3/s range, because value_min/value_max columns do not exist in metrics.
- There is no statistic enum value for standard deviation; "other" was used with a note.
- package_class has no fit for optical-redistribution substrates without chips or for a bare PIC sub-assembly; "other" was used.
