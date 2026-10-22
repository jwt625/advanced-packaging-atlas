---
title: Backlog round 1 - data hygiene, figure detector, 3D follow-ups and SOTA research, sim case runs and engine open items
date: 2026-10-21
status: in progress
scope: data/, scripts/, config/package3d/, app/src/lib/three/, app/src/routes/3d/, sims/, engine/, validation/
authors: Claude (coordinator) and lane subagents, at Wentao Jiang's request
---

# DevLog-013: backlog round 1

Request (Wentao, 2026-10-21): "go on with your TODO while i work on mine. Delegate to subagents as needed."

Scope = the "my TODO" list from the 2026-10-21 status review (repo state, DevLog-000..012 open items, lane hand-offs,
sibling repos). Out of scope here (Wentao's): CD1-CD7 decisions, the 8 sim manual downloads, the Palace build, the
warpage-policy decision, the figure-rights decision, `/sim` browser testing, retrieval of any kind.

## State at start (2026-10-21)

- `main` clean and in sync with `origin`; Pages deploy of 9e163cf succeeded.
- DB: 296 papers, 938 TVs; 299 cached `text.md`; extraction backlog 0 (the 3 extra ids are sim-library refs).
- Affiliations: 238/296 papers; the 58 papers of DevLog-009 have none.
- Sim: engine suite 292/292; 18 package + 5 EM cases; ledger `validation/RESULTS.md`.
- Wentao may be testing `/sim` on the running dev server (tmux `apa-sim-ui`, port 47352): lanes do not restart or
  kill it, and engine edits keep the suite green at hand-off.

## Lanes (round 1; 7 concurrent, project cap)

| Lane | Work | Write paths (exclusive) | Notes file |
|---|---|---|---|
| L14 | Affiliations for the 58 papers (DevLog-006 pipeline: staging, consolidation, audit sample, geocoding of new sites, site review, merge); photonics-atlas org requests (Xperi/Adeia history, "University of Applied Science Berlin" identity) | `data/_staging/g0NN/` (new), `data/{author_affiliations,organizations,org_sites}.csv`, `config/org_aliases.yaml`, geocoder overrides/config | `DevLog/lanes/L14-affiliations.md` |
| L15 | Figure detector: bottom-clip of raster figures (DevLog-005/009), fix + re-run over `data/figures.csv` with a zip backup first | `scripts/figure_candidates.py`, `scripts/crop_figures.py`, `data/figures.csv` (bbox fields), local crops | `DevLog/lanes/L15-figure-detector.md` |
| L16 | Data hygiene: venue normalization, `test_standard` for `ectc51529.2024.00093-c-m1`, text-layer warnings for the 11 DevLog-005 papers | `data/papers.csv` (venue), `data/metrics.csv` (that row), `references/<id>/TEXT_LAYER_WARNING.md`, `data/schema/` (venue enum if added), `scripts/validate_db.py` (venue check) | `DevLog/lanes/L16-data-hygiene.md` |
| L17 | SOTA CoWoS-S/L and EMIB/EMIB-T product topology research (DevLog-008 plan), public primary sources only | `config/package3d/RESEARCH_SOTA_{COWOS,EMIB}.md` | `DevLog/lanes/L17-sota-research.md` |
| L18 | DevLog-011 open follow-ups: emib_t per-region level properties, microvia taper harmonization, I-Cube E / Si-IF / CPO callouts, inset framing, then M7 re-score on the final render | `config/package3d/*.yaml` (no product-topology changes to cowos_s/cowos_l/emib/emib_t: that waits for L17), `scripts/{build,score,render}_package3d.py`, `app/src/lib/three/`, `app/src/routes/3d/`, generated `package3d.json` | `DevLog/lanes/L18-3d-followups.md` |
| L19 | Sim case runs and case physics: emib_t bridge_stress timeout, cowos_s and fan_out re-runs, 120 mm SUS430 trend suspects, CoWoS-L 6x TV dummy-Si/SC-RDL knobs, cowos_l browser peak at rtol 1e-7; family drift sync after L18 | `sims/`, `engine/src/families/`, `engine/tests/families*`, `validation/cases/` (these cases), `validation/RESULTS.md` rows | `DevLog/lanes/L19-sim-cases.md` |
| L20 | Engine open items: W-shape test, plate bifurcation vs scikit-fem, Newton line search, q2s MG on the tangent, homog key canonicalization (L11), em2d port-Z reference refinement (L13) | `engine/src/{mech,materials,homog,em2d,em3d}/`, `engine/tests/` (non-family), `validation/reference/` | `DevLog/lanes/L20-engine-open-items.md` |

Queued after a slot frees: A4 fresh-context audit of the L13 em3d changes; final fresh-context audits of this round.

Shared rules (every lane):
- Write only in your own paths; read anything. No git writes (commit, add, stash, checkout, reset, clean).
- No retrieval: no `ieee_fetch.py`, no paper downloads. Web reads only where the lane says so, rate-limited.
- Only the coordinator runs `scripts/build_views.py` (writes `app/static/data/atlas.json`).
- Plan first in the notes file, timestamped progress log (`date`), hand-off ready.
- Heavy runs under `nice -n 10`, one at a time per lane; do not touch the dev servers.
- No emoji; ISO dates; no absolute local paths in tracked files; never use or mention any file in `~/Downloads`.
- Every value traceable (source + locator, formula, or `template` with rationale); a gap stays a gap.
- Contract changes (SPEC, schema) additive only, requested from the coordinator in the final report.

## TODO

- [x] Plan (this file)
- [x] L14-L31 launched; results checked by the coordinator
- [x] Audits A5-A10 and corrections (A4 folded into the L22 EM audit, pending); audits of L22, L27, L28 variants, L29, L30 pending
- [x] `build_views.py`, `pnpm check`, `pnpm build`, engine suite, validator
- [x] Tick stale boxes in DevLog-003 (126, 129), DevLog-008 (128-134; 135 process animation stays open), DevLog-011 (commit item)
- [x] Commit and push (Wentao, 2026-10-22: "cmt and push work done so far")

## Progress (coordinator)

- 2026-10-21: plan written; lanes launched.
- 2026-10-21: Wentao's decisions on CD1-CD7 recorded in DevLog-012 (CD5 note: no TIM in reflow-stage studies;
  CD6 changed: reflow studies at the top of the overlapped material range, e.g. 250 C, no default extrapolation).
  Routed to L19 (case changes).
- 2026-10-21 17:5x PDT: the 8 sim manual downloads (`config/sim/manual_downloads.md`) were matched by page-1
  title/DOI and moved from Wentao's download folder into `references/_inbox/` under their `save_as` names, then
  ingested with `scripts/ingest_inbox.py` (8/8; `references/<id>/{source.pdf,text.md,figures,source.json}`).
  The two Phys. Rev. papers are scans with an OCR text layer: read their tables from page renders.
  Queued lane L21 (materials from the 8 sources) for the next free slot.
- 2026-10-21: Wentao's answers to the remaining open decisions (DevLog-012 wrap-up items 2-4, DevLog-005 figures):
  - Palace: "no Palace. Make native EM solver in browser. Adapt their source code as reference." New lane L22
    (owner of engine/src/em2d and em3d; plan in DevLog-014). L20 task 6 moved to L22.
  - Warpage: pursue absolute agreement through input research: "you ask a subagent to do the research or read/dig
    into what we have cached/parsed." New lane L23 (research only; L19 applies the findings).
  - Figure crops: "local only for now" (no publishing of crops).
  - /sim: "works in general, but glitchy. Test various operations as well as different toggles and orderings."
    New lane L24 (UI owner after L12).
  - Queue (start as slots free, cap 7): L24, L23, L21, L22.
- 2026-10-21: CD6 follow-up decided (compliant layers excluded from the ceiling; see DevLog-012); routed to L19. Solder-resist high-T data added to the L23 research scope.
- 2026-10-21: L16 done (notes `DevLog/lanes/L16-data-hygiene.md`):
  - Venue: 254 strings -> 12 acronyms (258/296 rows; only the venue column changed, bytes-identical otherwise);
    `enums.venue` in the schema plus validator checks. Dropped citation detail (pages, volume, edition) stays
    recoverable from the DOI; the old strings are listed in the notes.
  - `ectc51529.2024.00093-c-m1`: the paper names no standard for that test (MIL 833 only for the Fig. 9/10 tests),
    so `test_standard` stays empty.
  - 11 TEXT_LAYER_WARNING.md written. A read-only detector prototype found 4 more papers with micro-as-'P' damage
    (ectc51909.2023.00021, 00235, ectc51906.2022.00142, ectc51529.2024.00011) and a clean rule for shifted-by-29
    copies; queued as an L16 follow-up (warnings + `--scan-text` mode in recheck_text_layers.py).
  - Coordinator: `data/_staging/BATCH_INSTRUCTIONS.md` wording updated (warnings now cover both OCR text and a
    partly damaged native layer).
- 2026-10-21: L24 launched in L16's slot. Queue: L23, L21, L22, L16 follow-up.
- 2026-10-21: L14 done (notes `DevLog/lanes/L14-affiliations.md`): affiliations 238 -> 295/296 papers
  (tcpmt.2026.3717381 prints none); 1996 -> 2405 rows (additions only, original order kept); orgs 144 -> 181; sites
  214 -> 259 (+45: campus 16, building 2, city 14, region 4, unresolved 9); 3 site overrides after review; validator
  0/0. Backup `cache/backups/l14_affil_before_merge_20261021T180129.zip`.
  - photonics-atlas answers: Xperi and Adeia stay two orgs as printed, with sourced notes (SEC 8-K 2022-09-08, 10-K
    FY2022); no parent relation. "University of Applied Science Berlin" stays unresolved (paper names neither HTW
    nor BHT).
  - Audit A5 (fresh context, affiliation sample) queued next.
- 2026-10-21: L23 launched in L14's slot. Queue: A5, L21, L22, L16 follow-up.
- 2026-10-21: L17 done (notes `DevLog/lanes/L17-sota-research.md`; `config/package3d/RESEARCH_SOTA_{COWOS,EMIB}.md`):
  TSMC CoWoS reticle roadmap (3.5x 2024, 5.5x 2026, 9.5x 2027, 14x 2028, SoW-X 2029) and Intel EMIB/EMIB-T package
  evolution from primary sources; conflicts listed, not resolved (B300 stack count, TSMC dates, CoWoS-S 3x area,
  Intel EMIB-T 2026 bridge count). Proposed template values in section 7 of each file. Requests: DB rows for
  00091 Fig. 2/3, 00174 Fig. 1, ectc51687.2025.00051 Fig. 6 (distillation); a cowos_s template feature (>= 2 SoC
  per interposer, HBM rows along the long edges).
- 2026-10-21: audit A5 launched (L14 affiliation sample + L17 research values). Queue: L21, L22, SOTA templates
  (after L18 and A5), DB rows for the L17 figures, L16 follow-up.
- 2026-10-21: L15 done (notes `DevLog/lanes/L15-figure-detector.md`): root cause = Word-PDF caption blocks start
  with a whitespace-only line one line height above the visible caption, so the figure region was clipped about
  0.01 page height early. Fix: tight text rects from non-blank spans plus a pixel edge-extension post-pass (extend
  only; refuses slivers, text strips, no-gap). Detector cut-through 713/3405 (20.9 %) -> 115/3414 (3.4 %, all
  refused). figures.csv: 3528 checked, 164 corrected (crops re-rendered), 176 ambiguous unchanged, 1 rejected on
  review; validator 0/0. Backup `cache/backups/L15_figures_before_bbox_fix_20261021T175322.zip` (677 MB).
  - Coordinator decision: `candidates.json` / `cand/*.png` are not regenerated (all cached papers are extracted;
    regenerating would break "candidate rows copied exactly"). New papers get the fixed detector.
  - Open: 5 rows need a manual bbox (ectc51687.2025.00027-f06, ectc51529.2024.00155-f10,
    iedm45625.2022.10019499-f08/-f13, iedm45741.2023.10413759-f10); ~120 rows carry a caption/body sliver (needs a
    shrink pass); re-runs of `crop_figures.py --apply` must keep `--skip iedm45741.2023.10413759-f10`. Queued with
    the L16 follow-up as one data follow-up lane.
- 2026-10-21: L21 launched in L15's slot. Queue: L22, SOTA templates (after L18 and A5), DB rows for the L17
  figures, data follow-up (L15 + L16 items).
- 2026-10-21: L23 done (`DevLog/research/2026-10-21-warpage-input-research.md`, notes `DevLog/lanes/L23-warpage-inputs.md`).
  Headline claims (unaudited):
  - cowos_s targets (ectc51909.2023.00135, MediaTek) likely sign-inverted vs JEITA: "(-) Convex" = dome (Fig. 4
    legend), so JEITA +198 um at 25 C / -153 um at 250 C; the engine's -340 um bowl would be a sign miss.
  - cowos_l 00091 +64 um at RT is most likely a real dome (TSMC companion ectc51687.2025.00026 sign pictograms);
    weakens L9's view-side explanation.
  - Template substrate effective in-plane CTE estimated 8.7-9.6 ppm/K vs sourced 12-15 ppm/K (possible common
    cause of lid/ring warpage misses).
  - Solder resist above 225 C: no sourced E(T); the CD6 ceiling stays.
  - 9-item change list for the sim lane; 8 manual-download candidates (none retrieved).
  - Audit A6 (L23 key claims) queued before any target change; L19 told not to change cowos_s signs this round.
- 2026-10-21: L22 launched in L23's slot (native browser 3D EM, Palace source as reference; DevLog-014). The
  queued A4 audit of the L13 changes folds into the final EM audit after L22. Queue: A6, SOTA templates (after
  L18 and A5), warpage-input application lane (after A6 and L19), DB rows for the L17 figures, data follow-up.
- 2026-10-21: audit A5 done (`DevLog/audits/round1_audit_A5_2026-10-21.md`): L14 PASS (0/269 sampled rows wrong;
  old rows byte-identical); L17 PASS (~44 values, no wrong number) with G1 SIGNIFICANT (reticle-definition
  citations) fixed by the coordinator in both RESEARCH_SOTA files (verified in text.md of 00091, 00174, 00198).
  Coordinator decisions on minors:
  - F1: geocoder overrides + re-run for the 4 sites with printed postcode/street (Onto 01887, Northrop 21240,
    NEC Nakahara-ku 211-8666); Shinko 001c.147203 printed street address gets its own site row.
  - F2: Tyndall parent_org kept only with a primary source, else cleared.
  - F3: g009 BATCH_REPORT wording (3+3+2 grid).
  - F4: country from org headquarters when the printed affiliation has none stays allowed with a note (TSMC
    precedent); document it in AFFILIATION_INSTRUCTIONS.md.
  - G2-G4 (snippet-only rows, EMIB basis labels, 2020-point conflict) go to the SOTA template lane.
  F1-F4 join the data follow-up lane.
- 2026-10-21: audit A6 launched (L23 claims). Queue: SOTA templates (after L18), warpage-input application (after
  A6 and L19), DB rows for the L17 figures, data follow-up (L15 + L16 + A5 F1-F4).
- 2026-10-21: L20 done (notes `DevLog/lanes/L20-engine-open-items.md`):
  - W shape test; plate bifurcation detection and branch switching (stable / follow) vs a new scikit-fem
    total-Lagrangian reference (bifurcation at dT -32.01 K; engine = reference to 2.7e-8 on the same mesh).
  - Newton: defaults unchanged (backtracking and slope searches did not help; secant predictor opt-in, can jump
    branch).
  - q2s PCG: column (z-line) block smoother, 472 -> 48 iterations at aspect 20; all nonlinear tangents converge.
  - canonicalHomogKey: 53 -> 49 table keys; duplicates bit-identical, no rebuild.
  - Suite 300: 295 pass; the 5 failures are outside L20 (3 family drift from L18 template edits -> L19 sync;
    2 materials tests from L21's in-progress edits -> told to L21).
  - Coordinator: SPEC section 21 (v0.20) merged from L20's requests.
  - Open: `column` as the default linear q2s smoother (L20 measured it faster at every aspect; results move
    only within PCG tolerance), Hermite prolongation, no branch switching on PCG, L8 nonlinear cases not re-run
    with the stability check. A fresh-context audit of L20 joins the round audits.
- 2026-10-21: L25 launched in L20's slot (L15/L16/A5 follow-ups plus DB rows for the L17 figures).
- 2026-10-21: audit A6 done (`DevLog/audits/round1_audit_A6_2026-10-21.md`; 0 blocking, 3 significant, 10 minor;
  26 spot values, 0 wrong numbers):
  - cowos_s sign CONFIRMED (~95 %): JEITA +198 um at 25 C / -153 um at 250 C (TV2 +250 / -173); RESULTS "miss
    (+71 %)" is a sign miss. Engine sign is geometric (post.mjs).
  - cowos_l: plausible, evidence partly wrong (00026 Fig. 8(a) is the CoW component; lid-TV RT map is saddle-like);
    better evidence is the 00091 ring TV Fig. 7(c) (+ = low centre as viewed), which refutes L9's assumed rule; view
    side unstated, so JEITA +64 (bump-side view) or -64 (lid-side view). Dome prior holds only for ring/lid CTE <=
    substrate CTE (counterexample: 120 mm Cu ring, -330 um bowl at 30 C).
  - Substrate effective in-plane CTE CONFIRMED low (laminate A^-1 N): cowos_s 9.58, cowos_l 8.92/8.84, 120 mm 9.47,
    Xilinx 14.55 ppm/K (reproduces L9's 14.5) vs sourced 11.97-15.
  - L23 change list: safe as written 1, 5 (after 2), 6, 8, 9; changed 2 (reach 11.97 through template core thickness
    or build-up Cu, not a library core alternative; cowos_l bounds only), 3 (ring width 8.6-19 mm), 4 (balanced
    TIM rationale, consistent indium E/nu, sign-agnostic targets); do not apply 7's "substrate at Cu CTE" variant
    (diagnostic only).
  - The warpage-input application lane (L26) starts after L19 (owner of sims/) hands off. The JEITA scope note on
    metrics 00135 -a-m1/m2 and -b-m1/m2 goes in after L25's data/ edits finish.
- 2026-10-21: audit A7 (L20 engine work) launched in A6's slot.
- 2026-10-21: L21 done (notes `DevLog/lanes/L21-materials.md`): all 8 sources transcribed with locators.
  - Default changes: si_crystal Cij Hall 1967 (165.64/63.94/79.51 GPa; E<hkl> 130.02/168.96/187.69), density
    2329.0; silicone_adhesive nu 0.30 placeholder -> 0.495 (PDMS analog, bounds 0.45-0.499).
  - Alternatives added: Si k (Glassbrenner-Slack), alpha (Okada), Cij(T) 4.2-310 K; EMC tier-2 viscoelastic (17-term
    Prony fitted to the digitized master curve, max err 7.8 %; WLF/Arrhenius shift; 2.1 vol% cure shrinkage as an
    alternative, JOINT2 0.16 % stays default); plated Cu (Read); Anand sets (Cheng, Zhang).
  - Fixed an existing overrides bug (any nu override on silicone_adhesive threw).
  - 39 Si-TSV RVE rows recomputed, 586 byte-identical. Materials tests 45/45; suite 307/310 (3 emib_t family drift).
  - No source lifts the CD6 ceilings. EMC glassy nu from Sadeghinia is 0.42, outside the 0.30 +- 0.05 placeholder
    band (EMC nu sensitivity may be understated; for Wentao).
  - Coordinator: SPEC section 22 (v0.21) merged. L19 told about the cases that move (silicone nu; volumetric-locking
    check). A7 told the RVE table diff is L21's.
- 2026-10-21: audit A8 (L21) launched in L21's slot. Queue: L27 viscoelastic case-level wiring (after A7; mech
  owner; piecewise shift, Prony scaling assumption), SOTA templates (after L18), L26 warpage inputs (after L19),
  JEITA note on metrics 00135 (after L25).
- 2026-10-21: L18 done (notes `DevLog/lanes/L18-3d-followups.md`): all 5 DevLog-011 follow-ups.
  - `route.regions` per-region level properties (generator, viewer, scorer); emib_t L2 14/20 um outside the
    bridge, pads only over it; bridge vias aligned to an in-region bump field (fixes a solid Cu bar artefact).
  - One microvia taper form (bottom = top - 2 depth / mv_wall_tan): 72 deg (tan 3.078) or 83 deg (tan 8.22)
    per family, sourced.
  - I-Cube E front RDL 2 -> 1 level; Si-IF trapezoid pillar, wider at the bond tip per both figures (contradicts
    audit V2); CPO variant callouts moved to the FAU tooltip.
  - Illustrative insets frame the same lateral region as in-scale (`zsquash`).
  - Checks: build --check ok (23 families, 883 refs); pnpm check 0/0; 286 headless views, 0 errors, all within M8.
    Own M7 scores (not fresh-context): emib_t 1.86 -> 2.43, I-Cube E 2.14 -> 2.29, Si-IF 2.00 -> 2.33, CPO 2.29.
    Render set `cache/package3d_renders/2026-10-21_183519/`.
  - emib_t drift already re-synced by L19 (families tests 72/72). Coordinator accepts L18's additive edit of
    `config/package3d/TEMPLATE_FORMAT.md`.
  - Open: dark wedges beside tapered filled openings; region tint outside the routing window; emib/cpo/glass
    could adopt `route.regions`.
- 2026-10-21: L28 (SOTA CoWoS/EMIB templates, A5 G2-G4 fixes, variant mechanism) launched in L18's slot. Queue:
  A9 fresh visual audit (L18 renders, then L28 renders), L27 viscoelastic wiring (after A7), L26 warpage inputs
  (after L19), JEITA note on metrics 00135 (after L25).
- 2026-10-21 19:00: L19 hand-off (notes `DevLog/lanes/L19-sim-cases.md`); its run queue (3-4 h, resumable,
  session scratchpad `scripts/queue.sh`, `jobs_2.txt`, `logs/queue.log`) is still executing and L19 resumes
  itself to record results, so L19 stays owner of sims/ and RESULTS.md until then.
  - emib_t/bridge_stress s2 finishes at rtol 1e-7: 1.49e6 DOF, 498/532 iterations, 1116 s, Node peak 1.97 GB (over
    the browser budget). The 1800 s timeout was the old rtol 1e-10.
  - CD5: only cowos_l s3 has TIM + lid at high T; kept (lidded package measured at 240 C), noted.
  - CD6: every organic-substrate high-T study now runs at 225 C (solder_resist); 50 mm at 260 C (emc); compliant
    tim_polymer / silicone_adhesive held at last value. SUS430 zero-crossing gate (~231 C) untestable at default.
  - New case `sims/cowos_l/warpage_rt_ht_ring48x.yaml` (TV0 4.8x ring: 6 SoC, 12 HBM2E, 18 LSI; ring label
    "18mm-12mm-2mm" read as 12 mm bars, 2 mm thick, template).
  - cowos_l memory at rtol 1e-7: browser s2 1.29 GiB / 106 s; s3 1.535 GiB (over the 1.5 GB target).
  - 120 mm Substrate A modelled membrane CTE 8.0 ppm/K vs stated 11.97 (below SUS430's 11): prime suspect,
    consistent with L23/A6. Labelled diagnostic variants queued.
  - Coordinator: SPEC section 23 (v0.22) merged (layer regions -> overlay boxes; CD6 ceiling convention).
    Open request: `sensitivity` status on E_GPa overrides (materials; for the next engine lane).
- 2026-10-21 19:05: L19 final hand-off; its queue keeps running (first job cowos_l s2 on the L21 library finished
  19:00:30, rc 2 = target miss). L26 launched as the next sim-case owner: records queue results into RESULTS.md,
  applies the A6-vetted L23 change list (variants labelled, never tuned), adds `sensitivity` status on E_GPa
  overrides, and syncs L28 drift later.
- 2026-10-21: audit A8 (L21) PASS (`DevLog/audits/round1_audit_A8_2026-10-21.md`): ~285 values, 0 transcription
  errors; Prony fit, CTE integration, Si E<hkl>, RVE row identity all reproduced; Sadeghinia defects confirmed
  (plus a Fig. 12 legend swap). SIGNIFICANT: silicone_adhesive nu 0.495 (rubbery PDMS) at all T gives a glassy-like
  K (~12 GPa at 25 C, E 358 MPa there). Coordinator decision: default back to the CD4 placeholder 0.30 (approved
  2026-10-21); 0.495 kept as the rubbery-state alternative and upper bound (0.25-0.495). L27 launched (Part A this
  revert, Part B A8 minors + Si cp, Part C viscoelastic case wiring after A7). L26 told to label 0.495-era runs as
  upper-bound runs and re-run defaults.
- 2026-10-21: L25 done (notes `DevLog/lanes/L25-data-followups.md`): 5 manual figure bboxes; 4 more text-layer
  warnings and `recheck_text_layers.py --scan-text` (report-only; 11 flagged, all already warned); A5 F1-F4 applied
  (4 sites re-geocoded; Shinko Kita-Owaribe site; Tyndall parent kept with tyndall.ie source; HQ-country rule
  documented); 14 TVs from 00091 Fig. 2, 00174 Fig. 1, 00051 Fig. 6 (projections basis author_estimate, notes
  "ROADMAP PROJECTION"). 00091 Fig. 3 not entered (values attributed to uncached ref [5], schema rule a). Validator
  0/0. Backups in `cache/backups/L25_*`. Open: ~120-row sliver shrink pass; projection schema gap (decision for
  Wentao: `test_vehicles.projection` column or a `roadmap` tv_kind).
- 2026-10-21: coordinator: JEITA ED-7306 equivalents appended to the notes of metrics ectc51909.2023.00135-a-m1/m2,
  -b-m1/m2 (+198 / -153 / +250 / -173 um); printed values unchanged; only those 4 lines differ; validator 0/0.
  Backup `cache/backups/metrics_before_jeita_note_*.csv`.
- 2026-10-21: L24 done (notes `DevLog/lanes/L24-sim-ui-testing.md`): 18 /sim glitches fixed (6 high: same-geometry
  case switch blank view, B - A zero after recompute, carried-over section blanking, pick-channel draft lock, WebGL
  context loss after repeated side-by-side, plus G2 default study failing in 10/23 families); regression driver
  `cache/sim_ui_driver/` (16/16); pnpm check 0/0, build ok. Finding: the dev server on 47352 reloads /sim whenever
  lanes edit engine/ or lib/three (part of the glitchy feel while lanes run). Open: O1, O7 (low, next UI owner);
  O6 default 100 W template overheats 6 small-die families (Wentao); O8 unused non-numeric knob accepted (families);
  si_crystal cp N/A blocks thermal_transient with Si (sent to L27).
- 2026-10-21: audit A10 (L24 + L25) launched.
- 2026-10-21: audit A7 (L20) PASS with corrections (`DevLog/audits/round1_audit_A7_2026-10-21.md`; 0 blocking,
  2 significant, 9 minor); suite 311/311 in 203 s. Bifurcation at -31.998 K (finer reference), column smoother
  exact and nonlinear-PCG only (iterations 526 -> 53 at aspect 20; wall time a wash at aspect 2), canonical keys
  merge nothing wrong.
  - S1: thermal-only RVE table hits serve full-row k (up to 1.74 % off live at 298.15 K; pre-existing in HEAD,
    widened by canonical keys to 26 more spellings) -> L27.
  - S2: `nonlinear.branch` rejected by `thermal/case.mjs` checkNonlinear -> fixed by the coordinator (branch:
    stable | follow validated; test in cli-l10, 21/21). SPEC 21 wording "current (unstable) path" fixed (M7).
  - M1, M4-M8 -> L27; M3 (column default) stays undecided: faster in iterations, not in wall time at low aspect;
    M9 bookkeeping (PLATE-NL row in RESULTS, commit reference files with mech-nl test) -> L26 / commit plan.
  - L27 cleared to start Part C (viscoelastic wiring).
- 2026-10-21: audit A9 (fresh visual, L18 render set) done (`DevLog/audits/round1_audit_A9_2026-10-21.md`): all 23
  families M7 >= 2.0 (emib_t 2.43 = L18; I-Cube E 2.29 = L18; Si-IF 2.50 vs L18 2.33; CPO 2.43 vs 2.29). Si-IF pillar:
  L18 right, V2 wrong (wider at the bond tip; bottom/top 0.81 on 600 dpi renders vs L18's 0.82). No Cu bars,
  z-fighting or V1-type wedges. Defects: D1 major (info_os conformal RDL via cups render with a black core, read as
  voids), D2-D11 minor/cosmetic. D4, D8, D9 sent to L28 (emib templates in progress); viewer defects D1-D3, D5-D7,
  D10, D11 queued as an L28 follow-up (lib/three owner).
- 2026-10-21: audit A10 (L24 + L25) PASS, 0 blocking / 0 significant, 13 minor
  (`DevLog/audits/round1_audit_A10_2026-10-21.md`): L24 G1-G18 correct, regression 16/16, no invented physics
  (default-study template numbers unchanged from HEAD and labelled); L25 ~95 values vs 500-600 dpi renders, 0
  wrong; merge removed 0 rows. Minors: UI M1-M6 -> L30 (launched with L24 O1/O7); data D1-D3, D5, D6 -> L31
  (launched); M7 (default study replaces solder composites with epoxy_generic, understating k) and L24 O6 go to
  Wentao with the default-study template question; D4 (roadmap points counted as TVs, 938 -> 952) ties to the
  projection-schema decision.
- 2026-10-21: L31 done (notes `DevLog/lanes/L31-data-minors.md`): A10 D1 (00174-h note), D2 (3 electrical_interfaces
  rows 00091-c/d/e-e1 with Fig. 2 lane rates and package BW), D3 (inferred-level notes on 00051 interconnects), D5
  (number-free 00091 component rows -> `stated`; numeric maxima stay `design_target`), D6 (district points stay
  `city` with a note). Validator 0/0; backup `cache/backups/L31_before_20261021T191913.zip`.
  Coordinator: added `hbm2` to the schema protocol enum (additive) and set 00091-c-e1 protocol hbm2 (was other);
  label HBM2 added in `scripts/build_views.py`; validator 0/0. `district` precision not added (map styling keys on
  precision; `city` + note kept).
- 2026-10-21/22: L29 done (notes `DevLog/lanes/L29-figure-slivers.md`): `crop_figures.py --sliver-check` (text-only
  page render separates letter ink from figure ink); 3531 rows checked, 143 with a sliver edge: 53 shrunk (median
  0.0016 page), 35 no-glyph, 55 ambiguous left; edge-check after: 3411 clean / 120 ambiguous (was 177), no changed
  row cuts ink; validator 0/0. Backup `cache/backups/L29_figures_before_sliver_20261021T191353.zip`. Open: manual
  bboxes for the listed IEDM/VLSI framed and garbled-text rows.
- 2026-10-21 19:13: L19's queue ended (last jobs emib_t s2 and xilinx s2 exited rc=1 in seconds; case files were
  changing). Jobs after ring48x / fcbga s2h are not recorded; to re-run in the next round.
- 2026-10-22 00:15: usage limit interrupted L22, L26, L27, L28, L29, L30 at ~19:30. Wentao: "cmt and push work done
  so far. If interrupted not gracefully, finish it up first." All six resumed for wrap-up only (no new work).
- 2026-10-22 00:17: L26 wrapped up (notes `DevLog/lanes/L26-sim-cases-2.md`):
  - RESULTS.md: PLATE-NL row; cowos_s 2026-10-20 "+71 %" corrected to a sign miss; new "Mechanics, 2026-10-21
    runs" section (rve, dirty-stamped with src/data hashes, labels calibration / sensitivity / diagnostic).
  - cowos_s: JEITA targets +198 / -153 (TV2 +250 / -173) in a new validation case and the sim targets.
    Substrate CTE 15 ppm/K (template core CTE 13.91) flips both signs to the measured direction; ring geometry
    moves warpage 10-20 %, never the sign. This is calibration, not validation.
  - cowos_s 25 C studies stopped at the PCG 3000-iteration cap (relres 5-9e-7).
  - 120 mm: core 1040 um reaches 11.95 ppm/K.
  - E_GPa `sensitivity` status added with a test.
  - Written, not run: ring_attach, lid_attach (its run was killed at wrap-up by the coordinator, unrecorded),
    lid_attach_indium (diagnostic; no single-source indium E/nu pair), 120mm tsf180, xilinx lid foot, 50 mm
    shrinkage both.
  - L19's queue failed at 19:13 on a transient YAML parse error in encapsulants.yaml (another lane mid-edit).
    The remaining jobs are pending.
  - Coordinator: accepted L26's one-line change in `engine/tests/materials.test.mjs` and the tracked
    `sims/<family>/variants/` folders; SPEC section 24 (v0.23) merged.
- 2026-10-22 00:15: L30 done (notes `DevLog/lanes/L30-sim-ui-followups.md`): L24 O1 (mirrored probe pins hidden when
  mirror off, refit on toggle; pin overlay repaint fix), O7 (Sdd/Scc/Sdc/Scd labels; em2d canvas draws the chosen
  variant; B pane label), A10 M1-M6 (assumption text for top:* HTC and heated set; B - A gated on same physics and
  grid; refreshPresets request token; mesh-edge flag in workbench state; regression scenarios G8/G11/G13/G17).
  pnpm check 0/0, build ok, regression 30/30 on a production preview.
- 2026-10-22 00:19: L28 done (notes `DevLog/lanes/L28-sota-templates.md`):
  - A5 G2-G4 applied to the RESEARCH_SOTA files.
  - Template `variants` mechanism (overlay with the same provenance checks; multi-grid `repeat`); viewer variant
    select; URL `#f=<family>&v=<variant>`.
  - SOTA defaults: cowos_s@sota_3x (00091 Fig. 3 layout), cowos_l@tv_4p8x (DB TV 00091-b), emib@emib_5x_12hbm
    (DB TV 00365-h), emib_t@class_2026 (Intel 2026 roadmap point; layout an assumption). The reported DB TVs stay
    the base (sim contract unchanged; drift 76/76). No product presets or names.
  - Checks: build --check ok (23 families, 4 variants, 912 refs); pnpm check 0/0; 0 render errors; M8 within budget
    (compare 32 calls / 1.10M tris).
  - A9 D4 done; D8, D9 open; D1-D3, D5-D7, D10, D11 not started.
  - Open: fresh-context audit of the 4 variants (not done before this commit); 45 IPDs not drawn; package3d.json
    2.69 -> 4.23 MB. Coordinator accepts the additive edits of fidelity_checklist.yaml and TEMPLATE_FORMAT.md.
- 2026-10-22 00:20: L22 paused for the commit (record `DevLog/DevLog-014-browser-em3d-solver.md`, notes
  `DevLog/lanes/L22-em3d-native.md`). Engine suite 330/330; defaults unchanged (order 1 direct = L7/L13 numbers).
  - Palace (Apache-2.0, commit 29ad351f) is an algorithm reference only (git-ignored clone, nothing built, no
    source text copied); `engine/src/em3d/NOTICE` and `LICENSE-APACHE-2.0` added.
  - Done: order-2 Nedelec (TE10 beta +1.8e-5); GMRES + p-multigrid (iterative = direct to 4e-11); lumped ports;
    adaptive sweep (EM-4, 21 points, 58 s vs 270 s).
  - EM-4 order 2 at 145k DOF: L +0.7 %, C +3.0 %, S11 +0.30..0.34 dB vs L5 NGSolve, at the gate bounds; peak
    memory 2.22 GB, over the browser budget.
  - EM-5a not reached (2 % port-Z gate needs ~1M order-2 DOF); AMS written but not wired.
  - Coordinator: SPEC 14.6 (v0.24) merged; README licence section points to the em3d NOTICE. UI controls for
    order / solver / adaptive / lumped ports are routed to the next /sim lane.
- 2026-10-22 00:20: L27 wrapped up (notes `DevLog/lanes/L27-materials-visco.md`): Part A silicone nu back to 0.30
  (bounds 0.25-0.495; 0.495 as `pdms_rubbery_analog_nu`); Part B A8 minors M1-M6, M9-M11; Si cp from NIST-JANAF
  (712.1 J/(kg K) at 25 C), Cu cp extended to 700 K; transient Si slab gate 60.18417 vs 60.18431 K closed form;
  A7 S1 fixed (thermal-only rows only; 36 (key, T) pairs at 25 C move k by up to 1.74e-2), A7 M1, M4-M8. RVE table:
  535/625 rows changed in fingerprints / rho / cp only (C6, alpha6, k bit-identical). Suite 330/330. Part C not
  started (drafts kept in the session scratchpad). Open: rho/cp for 46 of 54 library keys (thermal_transient fails
  on most package cases), Part C, re-run of thermal cases using the 36 affected homog keys.
  Coordinator: SPEC section 25 (v0.25) merged; CD4 status line added to DevLog-012.
- 2026-10-22 00:30: final checks before commit: validator 0 errors / 0 warnings; `build_views.py` (296 papers, 952 TVs,
  2319/2405 affiliations located on 288 papers); `build_sim_targets.py` (249 rows, 0 missing); check_db_targets 0
  errors (369 DB, 92 script, 23 reference values); `pnpm check` 0/0 (837 files); `pnpm build` ok; engine suite
  330/330 (245 s). Privacy scan of all pending files: no absolute local paths, secrets or private references.

## Next round (carried over)

- Fresh-context audits: L22 (EM order 2 / p-MG / lumped / adaptive, plus the L13 changes), L27, L28 variants
  (provenance + topology + M7), L29, L30.
- Sim: re-run L19 jobs that never ran (fan_out, 120 mm SUS430 / Cu variants, emib_t s1/s2, xilinx s2, glass) and
  L26's written-but-unrun variants (ring_attach, lid_attach, indium, 120mm tsf180, xilinx lid foot, 50 mm both);
  cowos_s 25 C PCG cap; thermal re-runs for the 36 homog keys L27 changed.
- Engine: L22 next steps (wire AMS, companion memory, EM-4 mesh, EM-5a); L27 Part C viscoelastic wiring; rho/cp
  for 46 library keys; q2s column smoother default (M3 undecided).
- 3D: A9 viewer defects D1 (major), D2, D3, D5-D7, D8, D9, D10, D11; 45 IPDs; package3d.json size.
- UI: em3d controls for order / solver / adaptive / lumped ports (L22 request).
- Data: manual bboxes for the L29 ambiguous IEDM/VLSI rows.
- Wentao: projection flag (column vs tv_kind); default thermal-study template (100 W, HTC, epoxy for solder
  composites); EMC glassy nu 0.42 vs the 0.30 placeholder; L23 manual-download candidates.
