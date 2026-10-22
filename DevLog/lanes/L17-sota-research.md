---
title: Lane L17 - SOTA CoWoS-S/L and EMIB/EMIB-T product topology research (DevLog-008 plan, research step)
date: 2026-10-21
status: done (hand-off ready)
scope: config/package3d/RESEARCH_SOTA_COWOS.md, config/package3d/RESEARCH_SOTA_EMIB.md (new); this notes file
authors: Claude (lane L17 subagent), at Wentao Jiang's request
---

# L17: SOTA CoWoS / EMIB product topology research

Binding: DevLog-013 shared rules; DevLog-008 "SOTA CoWoS / EMIB models and compare default"; DevLog-010 decision 5
(product presets only from primary facts; B300 stack count contradictory, no preset until resolved).

## Plan (2026-10-21 17:56 PDT)

1. DB first: list CoWoS-S / CoWoS-L / EMIB / EMIB-T TVs, components and cached-text statements (reticle multiples,
   HBM counts, bridge counts, package sizes) with paper_id / tv id / locator, so templates can use `reported` values.
2. Web, CoWoS (sequential, no subagents per coordinator correction 2026-10-21): TSMC primary pages (3DFabric CoWoS,
   annual report, press releases, technology symposium releases), product pages / white papers / technical blogs
   (NVIDIA Blackwell, Blackwell Ultra, Rubin; AMD MI300X, MI355X, MI455X; Broadcom where public). Record number,
   unit, product, URL, retrieval date, quoted phrase, confidence / conflict note. Secondary (press, analysts) marked.
3. Web, EMIB: Intel Foundry EMIB / EMIB-T pages and briefs, Intel product disclosures (Sapphire Rapids, Ponte
   Vecchio, Granite Rapids, Clearwater Forest, Gaudi 3, Stratix 10 / Agilex), Hot Chips / ISSCC / ECTC where public.
4. Write the two RESEARCH_SOTA files: facts table, secondary table, conflicts, gaps, DB rows, proposed template values.
5. Every number from a page read in this session; anything only seen in a search snippet is marked as such.

Constraints: write only the two RESEARCH_SOTA files and this file; no git; no retrieval into references/; no
template / generator / app edits; nothing under the user's downloads folder; modest web pace; stop on anti-bot.

## Progress log

- 2026-10-21 17:56 PDT: plan written. DB scan done (TVs, components, cached text of ectc51909.2023.00091 / 00174,
  ectc51687.2025.00051, ectc51846.2026.00051 / 00365 / 00199). Starting CoWoS web research.
- 2026-10-21 18:07 PDT: RESEARCH_SOTA_COWOS.md written (TSMC AR 2024/2025, press releases 2020/2025/2026, Q3 2026 transcript; AMD CDNA3/4/5 WPs; NVIDIA H100 WP, Blackwell Ultra and Rubin blogs; Broadcom XDSiP release; TechInsights secondary). TSMC 3DFabric page blocked by Cloudflare (403), not retried. Starting EMIB.
- 2026-10-21 18:15 PDT: RESEARCH_SOTA_EMIB.md written (Intel EMIB brief 2025-07, Intel Foundry HPC/AI platform
  brief 2025-11 Fig. 9 roadmap table, Q&R Vol. 6, ark pages 8480+ / Max 9480 / 6980P, Hot Chips 33 SPR + PVC slides,
  Gaudi 3 WP + Hot Chips 36; DB papers ectc51687.2025.00051 Fig. 6, ectc51846.2026.00051, ectc51846.2026.00365 Fig. 1/7).
  Not readable: community.intel.com blogs (301 to search), Clearwater Forest WP and Xeon 6+ deck (403); recorded as such.
  No subagents used (coordinator correction). No fresh-context audit run (no subagents allowed); queued for the
  coordinator's final audits.

## Hand-off

Outputs: config/package3d/RESEARCH_SOTA_COWOS.md, config/package3d/RESEARCH_SOTA_EMIB.md (facts, secondary, conflicts,
gaps, DB rows, proposed template values). Coordinator requests:
- DB row candidates for a distillation lane (not added here): ectc51909.2023.00091 p.2 Fig. 3 fifth-generation 3x
  CoWoS-S interposer 58.9 x 44.1 mm (2 SoC + 1 chiplet + 8 HBM); ectc51909.2023.00091 p.1 Fig. 2 generation table;
  ectc51909.2023.00174 p.1 Fig. 1 roadmap; ectc51687.2025.00051 p.4 Fig. 6 Intel product/TV evolution labels.
- Template lane: cowos_s SOTA needs 2 SoC (+1 chiplet) per interposer with HBM rows along the long edges (the current
  template draws 1 SoC per interposer with HBM columns beside it); emib SOTA preset needs 6 logic tiles + 12 HBM.
- Open conflicts: B300 HBM stack count (NVIDIA page internal); Intel 2026 EMIB-T bridge count (> 20 vs 30+); TSMC SoW-X
  year (2027 vs 2029); Gaudi 3 "interposer bridge" vs "EMIB".
