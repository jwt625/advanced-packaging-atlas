---
title: Lane L30 - /sim UI follow-ups (L24 O1 / O7, audit A10 M1-M6)
date: 2026-10-21
status: done (2026-10-22 00:18 PDT)
scope: app/src/routes/sim/, app/src/lib/sim/, cache/sim_ui_driver/ (git-ignored), this file
owner: lane L30 (Claude subagent, DevLog-013), /sim UI owner after L24
---

# L30: /sim UI follow-ups

Inputs: DevLog-013 shared rules and 2026-10-21 entries, DevLog/lanes/L24-sim-ui-testing.md (open items O1, O7;
driver), DevLog/audits/round1_audit_A10_2026-10-21.md Part 1 (M1-M6). Not in scope: A10 M7 / L24 O6 (default-study
template values, Wentao's decision), app/src/lib/three/ and app/src/routes/3d/ (L28), engine/ and sims/
(L22 / L27 / L26).

## Plan (2026-10-21 19:18 PDT)

| id | item | fix |
|---|---|---|
| O1a | probe pins on mirrored copies stay drawn with the mirror off | overlay draws a pin only when it lies in a drawn copy (solved domain x >= 0 / y >= 0 per symmetry, or mirror on); probes table marks hidden pins |
| O1b | camera not refit on the mirror toggle | refit (current preset) when the set of drawn copies of the field layers changes |
| O7a | mixed-mode entries labelled S11 | SBlock carries its matrix name (S, Sdd, Scc, Sdc, Scd); pair checkboxes, traces, Smith names use it |
| O7b | em2d canvas shows the base case | selected variant id in workbench state (`wb.emVariant`); EmPages binds it; the section canvas draws the patched section (engine em2d `applyPatch`, same as the runner) and names the variant |
| O7c | side-by-side B pane has no label | "B · case · study" banner on the main pane while side by side |
| M1 | `top:*` HTC on every exterior top face, not stated | assumption line says so when no single lid (template numbers unchanged) |
| M2 | heated set not listed | assumption lists every heated part (dies and contained parts) |
| M3 | B - A gated on B only | `wb.diffBlock` (reason or null): A and B thermal (T field), same grid; used by the option (disabled + reason), `diffOn`, the result fallback |
| M4 | refreshPresets late replies | request token |
| M5 | G14 flag in ModelTree | `wb.meshWire`; cleared by the user's own edge toggle; field plot groups switch the edges off |
| M6 | regression gaps | regress.mjs: G8, G17, G11, G13 scenarios, plus O1, O7, M3, M4, M5 checks |

Test: production build, `vite preview` (rebuild.sh, own tmux session `apa-l30`, own free port), driver
`cache/sim_ui_driver/`; gates `pnpm check` 0/0, `pnpm build`, `node regress.mjs` all pass; session killed after.

## TODO

- [x] Plan
- [x] Fixes O1, O7, M1-M5 (plus the overlay repaint of pins found while testing O1)
- [x] Driver: rebuild.sh session / port parameters; regress.mjs new scenarios (M6)
- [x] Gates, cleanup, hand-off

## Progress log

- 2026-10-21 19:18 PDT: read DevLog-013, L24 notes, A10 Part 1, the /sim code; plan written.
- 2026-10-21 19:25 PDT: fixes in; `pnpm check` 0/0; production preview on port 47394 (tmux `apa-l30`, lsof free);
  regress 28/28.
- 2026-10-21 19:28 PDT: found while checking the O1 screenshots: pins are drawn on the 2D overlay, which repainted only
  on a viewer render, so programmatic changes to `wb.probes` and the Probes "Clear" button left pins on screen (or
  showed new ones late). Fixed: a Graphics effect repaints on probes / mirror changes. Verified on screenshots (3 pins
  with the mirror on, pin 1 only with it off, none after Clear).
- 2026-10-21 19:32 PDT: d_em (variant picker now selects by index; values are variant ids) exit 0, 0 errors; em2 run
  22.8 s.
- 2026-10-22 00:15 PDT (wrap-up on the coordinator's request): `pnpm check` 837 files 0/0; `pnpm build` ok
  (rebuild.sh, log `logs/sim_ui_test_build_20261022T001537.log`); `node regress.mjs` 30/30 PASS, 0 page / console
  errors, 0 failed requests (`logs/sim_ui_l30_regress_20261022T001541.log`). tmux `apa-l30` killed, port 47394 free;
  `apa-app`, `apa-sim-ui`, `apa-l28` and port 47352 not touched.

## Results

| id | fix | verified by |
|---|---|---|
| O1 pins | `wb.probeDrawn(q)`: a pin in a mirrored copy (x < 0 for half_x / quarter, y < 0 for half_y / quarter) is not drawn while the mirror is off; the probes table greys those rows with a tooltip; overlay repaints on probe / mirror changes | regress `O1 mirrored-copy pins` (cowos_r quarter: drawn [true, false, false], 2 grey rows); screenshots |
| O1 camera | Graphics refits the current preset when the set of drawn copies of the field layers changes | regress `O1 camera refits` (top view: distance 182.8 -> 91.7 -> 182.8) |
| O7 labels | `SBlock.name` (S, Sdd, Scc, Sdc, Scd): pair checkboxes, trace names, Smith traces | regress `O7 mixed-mode` (Sdd11, Sdd12, Sdd21, Sdd22) |
| O7 variant canvas | `wb.emVariant` (reset per case load), bound by EmPages' Variant picker; the em2d canvas draws `applyPatch(em2d, patch).section` (engine em2d export, the runner's own patch) and names the variant (bc line and canvas aria-label); a patch error falls back to base with the reason | regress `O7 em2d canvas` (label base -> m4m1w2, canvas pixels differ); screenshot |
| O7 B label | "B · case · study" banner on the main pane while side by side | regress `O7 side-by-side B pane labelled` |
| M1 | when `top:*`, the HTC assumption says it is every exterior top face (exposed substrate, ring / stiffener, mold tops too); template numbers unchanged | regress `M1/M2` (info_os, emib); page read for info_os, emib, cowos_s, hbm_stack |
| M2 | power assumption lists every heated part: count, dies, parts contained in a die | same (hbm_stack: base + 7 contained parts) |
| M3 | `wb.diffBlock`: both runs thermal with nodal T and the same grid, else a reason; used by `diffOn`, the option (disabled, reason in the label and tooltip), the A summary line and the result fallback to side by side | regress `M3` (A mechanics, B thermal, same grid: option disabled, no dT drawn) |
| M4 | `refreshPresets` request token (`presetSeq`) | regress `M4` (rapid family switching; scenario check only: the reply order cannot be forced from the page) |
| M5 | flag `wb.meshWire`, `wb.dropMeshWire()`; the user's own edge toggle clears the flag; tree field nodes, a mechanics result and any expression other than cellsize drop tree-set edges | regress `M5` |
| M6 | regress.mjs: G8, G11, G13, G17 scenarios added (G11 / G13 were code-only in L24) | regress `G8`, `G11` (A 1 pt, B 2 pts: A layers drawn, uz span 301.7 um), `G13` (4 -> 0 layers while computing), `G17` |

Not changed: A10 M7 / L24 O6 (default-study template values; Wentao).

## Files changed (L30)

- `app/src/lib/sim/workbench.svelte.ts`: meshWire, emVariant, presetSeq, probeDrawn, diffBlock, dropMeshWire, diff
  fallback via diffBlock.
- `app/src/lib/sim/Graphics.svelte`: diffOn via diffBlock, pin filter and repaint, camera refit on copies, B banner,
  em2d variant section, meshWire effect, `__simViewerA` (debug=1 only).
- `app/src/lib/sim/ResultPages.svelte`: diff option reason, probes rows, edge toggle clears the flag.
- `app/src/lib/sim/ModelTree.svelte`: flag moved to wb.
- `app/src/lib/sim/EmPages.svelte`, `emResults.ts`, `EmSection.svelte`: matrix names, variant state, canvas label.
- `app/src/lib/sim/defaults.ts`: assumption lines (M1, M2).
- `cache/sim_ui_driver/` (git-ignored): `rebuild.sh` (SIM_SESSION / SIM_PORT, creates the session), `regress.mjs`
  (30 checks), `d_em.mjs` (variant by index); evidence `evidence/l30-o1-mirror-{on,off}.png`,
  `evidence/l30-o7-variant-m4m1w2.png`.

## Open

- None from O1 / O7 / M1-M6. The em3d block viewer has no variant view (outside O7's em2d scope).
- Re-run: `SIM_SESSION=apa-l30 SIM_PORT=<free port> cache/sim_ui_driver/rebuild.sh`, then
  `SIM_BASE=http://localhost:<port> node regress.mjs` (about 6 min); kill the session afterwards.
