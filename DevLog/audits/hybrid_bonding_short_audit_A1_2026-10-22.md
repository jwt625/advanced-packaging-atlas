---
title: Hybrid bonding short video, fresh-context audit A1
date: 2026-10-22
scope: media/hybrid-bonding-short/scenes/{l1a..l7b, hero_bond}.html + notes (s00_horizon excluded, being redesigned)
inputs: STYLE.md, DevLog-015, edit.json, cache/video/frames/<shot>/, data/*.csv, references/<paper_id>/text.md and figures/key
auditor: fresh-context subagent (read-only on the repo except this report)
---

# Audit A1: hybrid bonding short (2026-10-22)

## Method

- Read STYLE.md, DevLog-015, edit.json, every scene HTML and notes file.
- Contact sheets (6 frames per shot, red guide at y = 600) and full-res crops of every shot, built with ffmpeg / PIL in
  the session scratchpad (not in the repo).
- Pitch / CD / thickness measured on full-res frames against each scene's px/um.
- Every atlas id cited in the notes looked up in `data/interconnects.csv`, `stack_layers.csv`, `test_vehicles.csv`,
  `figures.csv`, `metrics.csv`. Spot-checked cached text for the numbers that come from prose (00155 gap / 478 / 444 um,
  00323 recess, 00113 dishing, iedm hex grid / 25 %, 00130 1.5 nm expansion, 00187 grain size, 00024 / 00219 grain
  growth, 00057 protrusion).
- Compared scenes against the figure crops each notes file lists (00155-f02, -f07; 00179-f01; 00183-f01; 00218-f01;
  iedm 10413829-f01).
- Grepped all scenes for `Math.random`, `Date`, `performance`, `data:`, base64, `<img>`, `fetch`, `url(`, `href`,
  `.png`, `fillText`, SVG `<text>`, rAF / timers, cross-frame state.
- Horizontal-edge profile around y = 600 on the first / middle / last frame of every shot.
- WCAG contrast of the overlay colour against the text band (x 560-1360, y 500-592) for pass-B shots and the hero.
- Per-shot bitrate of the draft `out/hybrid-bonding-short.mp4` (694 frames, matches edit.json).

## Findings

| # | Scene | Sev | Category | Finding | Evidence | Suggested fix |
|---|---|---|---|---|---|---|
| 1 | l7a | medium | physics / topology | The TaN/Ta liner (magenta) runs straight across the via-pad junction on both wafers: a 4 px barrier band spans the full pad width at the pad far end, including the via footprint. That reads as a barrier between via Cu and pad Cu (single-damascene look) and contradicts the notes ("one dual-damascene Cu body with one liner", citing `ectc51909.2023.00008-a-L01/L03`). Visible at 1080p on every column at y ~338 and ~862. | `l7a_hb04_tem.html:49-53` (the `yy >= PAD0 - B` branch returns barrier for `dx <= hw + B` without excluding `dx <= VIAW_S`); frame `cache/video/frames/l7a/f00000.png` (x 640-840, y 300-400) | In that branch return Cu where `dx <= VIAW_S` (liner only on the pad ledge outside the via). Or, if a single-damascene pad is intended, change the notes and cite a source for it. |
| 2 | hero | medium | physics / dimensions | Bond-wave wedge is exaggerated by orders of magnitude and the notes don't quantify the exaggeration. The top wafer opens to 0.30 um within ~2.6 um of the front at t = 0 (about 0.11 um at 1.4 um at t = 0.32 s), a 4-7 deg wedge. Estimate, not sourced: the bond-front opening is set by wafer bow over mm-to-cm lengths, so a few um behind the front the gap should be well under 1 nm. The recess (15x) is declared as exaggerated; this wedge is called only a "chosen shape". | `hero_bond.html:455`; `hero_bond.notes.md:58`; frame `cache/video/frames/hero/f00008.png` (right half, top wafer rising from y 600 to ~520) | List it under exaggerations with the factor, or shrink the wedge to a few px so the front stays legible without implying a 0.3 um gap. |
| 3 | hero | medium | contract / overlay | If the hero carries the planned cues ("Until / there's / no line", `hero_bond.notes.md` Physics table), the anneal glow makes the band too bright for the light overlay just when "no line" lands. The 5th-percentile contrast of #f4f1ea against band pixels is 1.8-2.0 at t = 1.0-1.5 s (median 4.6), against 5.1 at t = 0 and 9.7 at t = 3 s. The brightest part is the glow at y ~560-592, behind the glyph bottoms. edit.json does not pass hero text yet. | frames `hero/f00025.png`, `f00030.png`, `f00037.png`; crop of band at t = 1.2 s | Cap glow luminance inside x 560-1360, y 500-592 (or keep the glow below y 600 there) at t 0.9-1.6 s. Re-measure with the cue params. |
| 4 | l7a | medium | provenance | The composition is very close to `iedm45741.2023.10413829-f01`: about seven I-beam columns, M1T trapezoid caps at the top edge and M1B caps at the bottom edge, one isolated M1 segment per column, and the same vertical crop M1T..M1B. The notes say they adopted the figure's specific depiction ("M1 is drawn as one segment per column, as in the 0.4 um TEM reference"). The scene is not traced (EDS false colour, own grains), but this is the closest any scene comes to reproducing one figure's composition. | `l7a_hb04_tem.notes.md:50`; frame `l7a/f00000.png` vs `references/iedm45741.2023.10413829/figures/key/iedm45741.2023.10413829-f01.png` | Change the section or crop: cut along the links (as l7b does), or crop M1B off-frame and show more ILD above M1T, or cut obliquely so the links show partially. |
| 5 | l6a, l6b | low | provenance | The vertical geometry (barrel pads, via, link, 0.53 um oxide, link ending flush with the pad's widest edge) is measured off `ectc51846.2026.00183-f01` (a), and the layout (6-7 pitches, staggered top / bottom links, Si at the band edges) resembles its left panel. The physics and the 220-320 px pitch rule largely force this, and it is not traced (1 um pitch, different proportions). Recorded so it can be weighed together with #4. | `l6a_hb1_pointillism.notes.md` dimension table; frames `l6a/f00030.png`, `l6b/f00030.png` vs `references/ectc51846.2026.00183/figures/key/ectc51846.2026.00183-f01.png` | None required. Optionally use the tapered pad of the featured 1 um source (`ectc51906.2022.00057-f02`) instead of the 0.8 um module's barrel. |
| 6 | l4a | low | motion vs cut | The CUF step (starts 1.85 s) is effectively invisible: the shot is 50 frames = 1.96 s, so the front is only ~120 px into frame on the last frame. The notes present the underfill as part of the shot. | `l4a_ubump_chalk.notes.md:19`; edit.json `l4a` 50 frames; `l4a/f00049.png` | Accept, or start CUF earlier (~1.3 s) if the cut stays at 4 beats. |
| 7 | l6a | low | motion vs cut | Grain growth settles at ~1.9 s but the shot is 31 frames (1.2 s), so it is cut mid-growth. Not wrong, only incomplete. | `l6a_hb1_pointillism.notes.md:47`; edit.json `l6a` 31 frames | Compress growth to ~1.0 s if the end state should read. |
| 8 | l4a | low | readability | TSV Cu and Si share the paper tone. Only outlines and the right-flank chalk shading separate them, so on a freeze frame the TSV columns barely read as a different material from the Si between them. | `l4a/f00049.png` (x 98-220 TSV vs 225-355 Si) | Add a light chalk lay-in tone on the TSV Cu (and pad / plate Cu) only. |
| 9 | l1b | low | contract / overlay | The text is 170 px wide and the cavity between balls is ~105 px, so "1 mm" always overlaps ball bodies and their 1-lp black outlines. Contrast passes (p5 3.7:1 against the light text) but the band is not calm. The notes claim the text centre sits in a gap at t = 0, which is true only for the centre. | band crops of `l1b/f00000`, `f00006`, `f00012`, `f00030` | Lower outline contrast inside the band, or accept. |
| 10 | l3a | low | contract / line | The strongest full-width horizontal edge sits at y ~607 (interposer passivation surface), not 600. The contract plane (top of the ENi pad, which protrudes 1 um) is at 600 as specified, but at 1080p the eye reads 607 as "the line". 7 px. | edge profile: `l3a` frames, max edge rows 607-608; `l3a_pillar_riso.notes.md` (ENi protruding 1 um) | Accept (7 px), or darken the pad-top edge so 600 dominates. |
| 11 | l3b | low | physics / framing | The view is ambiguous. The notes say the die face (bumped side) is seen from above, yet below y = 600 they draw an underfill fillet over the interposer, i.e. a bonded die. Bumps of a bonded die are visible only in an IR / see-through view (the convention l5b states explicitly). The lower ~45 % of the frame is also a flat gradient with nothing in it. | `l3b_pillar_tiling.notes.md:42,45`; `l3b/f00031.png` | State "IR see-through view of the bonded die" in the notes. Optionally give the lower field some interposer-surface structure (e.g. fillet edge) for composition. |
| 12 | l5b | low | contract | The on-screen pitch is 24 px, outside the 220-320 px rule. The rule is written for cross-sections, the notes justify the moire, and the 5.2 to 3.0 deg rotation is declared as exaggerated. No change needed; listed for completeness. | `l5b_hb3_opart.notes.md` Dimensions | None. |
| 13 | l7b | low | notes accuracy | The notes say "every edge falls on a 0.1 um = 65 px module", but via width (0.16 um = 104 px) and M1 thickness (~1.3 modules) are off-module, as the same paragraph admits. | `l7b_hb04_swiss.notes.md:6` | Reword to "pad, gap and heights on the module; via and M1 at true size". |
| 14 | l7b | low | motion / physics | Pads and vias slide vertically into their slots: non-physical motion that STYLE's motion list does not allow, but the owner asked for it (DevLog-015 2026-10-22 "L7B Swiss grid assembles") and the notes call it a graphic device. The settled geometry is correct. | `l7b_hb04_swiss.notes.md` Motion table | None (owner-approved). |
| 15 | l7b, l6b, l4b | low | material colour code | Colour choices could be misread as material differences on a freeze frame. l7b: top Cu tonal red, bottom Cu black (same material). l6b: upper Cu a blurred ghost, lower Cu crisp white. l4b: inside the disc, Si takes the Ni red. All are declared in the notes. | `l7b/f00030.png`, `l6b/f00030.png`, `l4b/f00030.png` | Accept, or give same-material features the same hue family. |
| 16 | l6a, l1a, l3a, l7a, l5b | low | encode | In the draft MP4 (overall 4.76 Mb/s) these shots draw 9-12.5 Mb/s (l6a 12.5, l1a 10.5, l3a 10.2, l7a 9.5, l5b 9.4). The pointillism at 0.64 px/frame subpixel pan is the worst case. The mid l6a frame inspected from the MP4 looks clean at the current VBR. A hard cap near the reference ~5.1 Mb/s could block these shots. | `ffprobe` packet sizes per edit.json shot; MP4 frame 246 crop | Keep VBR/CRF for the final encode, or check l6a / l1a / l3a frames after any capped encode. |
| 17 | DevLog-015 | low | dimensions / wording | The pitch-ladder table calls L4 "Fine-pitch microbump (HBM-class stack, with TSV)" at 10 um. The scene models imec's R&D B2F TSV stack (`ectc51906.2022.00179`). The atlas HBM die-stack microbump row is 36 um (`vlsitechnologyandcir46769.2022.9830182-j-i1`, 12-Hi), and the HBM die-to-interposer rows are 35-55 um. The overlay says only "10 µm", so this affects only the DevLog text. | `DevLog/DevLog-015-hybrid-bonding-short-video.md:43` | Reword to "fine-pitch TSV die-stack microbump (R&D, imec B2F)". |

No high-severity findings.

## Checks that passed (verified, not assumed)

- **Pitch on screen** (measured on full-res frames):

  | Scene | Pitch |
  |---|---|
  | l1a | 280 px |
  | l1b | 282 px |
  | l2a / l2b | 300 px |
  | l3a | 280 px |
  | l3b | 220 px |
  | l4a / l4b | 260 px |
  | l5a | 320 px |
  | l6a / l6b | 280 px |
  | l7a / l7b | 260 px |
  | hero | 222-295 px (perspective) |

  Key sizes match their claims: ball 177 px, C4 waist 180 px with 70-72 um joint height, pillar 140 x 91-98 px, TSV 117-130 px, Sn standoff 77 px, HB pads 148 / 138 / 130 px.
- **Joint plane**: on y = 600 (+/- 2 px, stroke width) in every shot, including the moving shots (l1b drop, l2b settle, l4a TCB, hero bond wave). The hero's bottom-wafer plane is the horizon.
- **Topology**:
  - Pads, pillars, UBM, caps and barriers sit on the correct side in l1-l6: package SMD / board NSMD, C4 SMD with SR overlap (verified at 12x zoom on l2a), pillar on the die and ENi pad on the interposer, B2F TSV coaxial with bump, M1B / VIA1B / Ni UBM / IMC / Sn order, thin Cu over Ni on the landing pad.
  - Hybrid-bond pads are equal and facing. Daisy-chain links alternate tiers in l5a, l6a / l6b and l7b.
  - Taper is widest toward the bond face (l6, l7a vias and pads, l7a M1 per code). Laser microvias are wider toward the die in l2.
- **Process order**: CUF after chip join / TCB (l2a, l3a, l4a). The TCB sequence is descent, contact, melt, collapse. Hybrid: RT dielectric bond front, then anneal, Cu expansion closing the recess, then grain growth across the interface (hero, l7a). Grain growth on anneal in l6a.
- **Numbers vs atlas**: every cited ic_id / layer_id / tv_id / fig_id exists and carries the claimed value. Prose numbers check out against the cached text: 00155 gap 16-21 um (f07 table) and 18 um average; ball 478 / standoff 444 um; 00323 -6.7 to -7.0 nm; 00113 3-5 nm; iedm hex grid and 25 % Cu max (22.7 % derived is correct); 00130 1.5 nm expansion; 00187 grains 42 / 47 nm; 00073 5/2/5. Estimates are labelled as estimates. No invented number is presented as sourced.
- **Contract**:
  - No `Math.random` / `Date` / `performance.now` in render paths (`performance.now` only in apa.js preview play loop).
  - No data URIs, base64, `<img>`, fetch, external URLs or `.png` references. `drawImage` is used only on scene-internal canvases.
  - No `fillText` or SVG text. No cross-frame state.
  - No vertical camera motion. Pans run 14-30 px/s.
  - Pass-B overlay contrast at p5 is at least 3.5:1 for all seven shots: l1b 3.7, l2b 6.7, l3b 7.1, l4b 3.9, l5b 8.5, l6b 3.5 at t = 0 rising to 5.1, l7b 4.8.

## Per-scene verdict

- **l1a BGA engraving**: correct and well sourced. The 444 um standoff ball shape is derived consistently. Strong engraving vocabulary. Pass.
- **l1b BGA pixel**: correct within declared pixel quantization. The reflow sequence is plausible and declared stylized. Text band busy but legible (#9). Pass.
- **l2a C4 ukiyo-e**: C4 / SMD / UBM / CUF topology correct. The flow model is declared schematic. The wave reads clearly as Hokusai. The lower build-up half is flatter vector than woodblock (taste only). Pass.
- **l2b C4 Art Nouveau**: correct reflow collapse with constant volume and fixed wetted ends. Ornament is confined to Si and the frieze. Pass.
- **l3a Cu pillar risograph**: correct stack (pillar / Ni / SnAg / IMC / ENi), dimensions to scale. Riso idiom convincing. Pass; #10 minor.
- **l3b pillar girih**: bump lattice and size correct, pattern well constructed. View ambiguity and empty lower field (#11). Pass.
- **l4a TCB red chalk**: imec B2F stack correct and carefully sourced. TCB sequence right. CUF not visible within the cut (#6), TSV vs Si tone (#8). Pass.
- **l4b Bauhaus**: geometry identical to l4a, material colour code consistent. Style reads as Bauhaus-adjacent (bars + disc); acceptable. Pass.
- **l5a Mondrian**: CEA-Leti TV1 stack, 1.5 um pads, 0.5 um HBV, alternating daisy chain all correct. Clean De Stijl. Pass.
- **l5b op-art**: top-view alignment moire with declared exaggeration. Physically honest notes. Pass.
- **l6a pointillism**: correct F2F daisy chain and anneal grain growth. Provenance close to 00183-f01 but physics-forced (#5). Heavy on bitrate (#16). Pass.
- **l6b cyanotype**: same geometry, develop motion good, contrast measured and adequate. Pass.
- **l7a STEM-EDS**: dimensions and anneal sequence well sourced, but the liner across the via-pad junction (#1) contradicts the stated dual damascene, and the composition is closest to a single figure (#4). Fix #1; consider #4.
- **l7b Swiss**: settled geometry correct and to the module (except notes wording, #13). Strong Swiss style. Pass.
- **hero_bond**: physics order correct, hex grid / CD / recess / expansion sourced, good 3D look. Undeclared wedge exaggeration (#2) and overlay contrast risk during the dissolve (#3). Fix both before the phrase is added.
