---
title: EM wave simulation method and canonical regional EM cases for package signal integrity (IL, RL, NEXT/FEXT)
date: 2026-10-20
status: research report for DevLog-010 (nothing built)
scope: EM-wave part of the multiphysics harness; regional ("cutout") full-wave + 2D cross-section method
author: Claude (research subagent), at Wentao Jiang's request
---

# EM wave method and canonical regional EM cases

Conventions. Facts carry a source tag: `[Sn]` = web source in the Sources list (retrieved 2026-10-20), `DB:` = a row in
`data/*.csv` (metric_id / tv_id / ic_id plus its locator), `paper:` = cached paper text with page/figure locator (facts
only). `[calc]` = my arithmetic (scripts not committed; inputs stated inline). `[inference]` = my engineering
judgement. `[unverified]` = standard textbook/literature content not re-checked against a primary source this session.

Acronyms (non-photonics): SI = signal integrity; IL = insertion loss; RL = return loss; NEXT / FEXT = near-end /
far-end crosstalk; RLGC = per-unit-length resistance, inductance, conductance, capacitance; FEM = finite element
method; FDTD = finite-difference time-domain; PML = perfectly matched layer; ABC = absorbing boundary condition;
SIBC = surface impedance boundary condition; DOF = degrees of freedom; TDR = time-domain reflectometry; VTF = voltage
transfer function (UCIe channel metric); UCIe = Universal Chiplet Interconnect Express; HBM = high-bandwidth memory;
PHY = physical layer; SerDes = serializer/deserializer; PAM4 = 4-level pulse amplitude modulation; NRZ = non-return
to zero; GBd = gigabaud; RDL = redistribution layer; BEOL = back end of line; LSI = local silicon interconnect
(bridge); TSV / TGV = through-silicon / through-glass via; CPW / CPWG = coplanar waveguide (with ground); TRL =
thru-reflect-line calibration; L-2L = two-line de-embedding; WASM = WebAssembly.

## Recommendation summary

1. **Primary engine = 2D cross-section solver + analytic cascade, not 3D.** A 2D FEM on the line cross-section
   gives frequency-dependent multiconductor RLGC (and the port modes); uniform segments of any length are then exact
   via the multiconductor transmission-line exponential, with zero DOF along the length. A 2 mm, 3-line, 2/2 um RDL
   channel to 100 GHz needs about 3e4 triangles (6e4 scalar P2 DOF) per frequency, versus about 2.4e6 tets
   (2.8e6 edge DOF at order 1) for the same mesh extruded in 3D [calc, Sec. 3]. This is browser-native territory.
2. **Conductors must be volume-meshed in 2D for fine-line packaging.** Cu skin depth is 0.66 um at 10 GHz and 0.21 um
   at 100 GHz [calc]. An SIBC is only valid for thickness t > ~3 skin depths (scikit-rf warns that its loss model is
   over-optimistic below 3 skin depths [S9]); for t = 2 um that means f > 9.8 GHz, for t = 1 um f > 39 GHz, for
   t = 0.8 um damascene LSI lines f > 61 GHz [calc]. HBM (4-6 GHz Nyquist) and UCIe (16-32 GHz) bands fall below
   these limits on interposer/bridge lines, so the 2D solver must resolve the current inside the conductors. In 2D
   this is cheap.
3. **3D full-wave only for discontinuities** (microbump / Cu pillar / hybrid-bond pad, via stacks, TSV/TGV, bridge
   entry, C4/ball breakout), as frequency-domain FEM with Nedelec edge elements, wave ports solved by the same 2D
   mode solver, ports placed on uniform lead-ins and de-embedded with the 2D propagation constant. Cascade with the
   2D segments via S-parameter connection (Redheffer star product). This is the HFSS + 2D Extractor + Circuit flow
   used in a DB paper (`ectc51846.2026.00199-b`, notes and p.6 Sec. IV.B) and the general pattern of commercial
   layout cutouts [S13].
4. **Boundary: PEC box tied to ground by default, PML on genuinely open faces.** Package regions are electrically
   small (lambda_g = 1.65 mm at 100 GHz in eps_r 3.3 [calc]). The absorber's job is to kill parallel-plate and
   substrate modes leaking out of the cut and to prevent box resonances, not far-field radiation. A PEC box of lateral
   size W has its first parallel-plate-like resonance near c / (2 W sqrt(eps_r)): 400 GHz for W = 200 um,
   80 GHz for W = 1 mm at eps_r 3.5 [calc]; keep it above ~1.5 f_max or use a graded PML. openEMS guidance: PML of
   6-20 cells (8 default), structures at least that many cells away, radiators at least lambda/4 away, and verify by
   re-running with the PML moved out [S8].
5. **Browser 3D budget: about 2e5 order-1 edge DOF per frequency** for a sparse direct solve [inference: wasm32
   address space is 4 GiB; 3D sparse LU fill grows super-linearly]. The microbump-to-RDL region below fits
   (2.1e5 p1 DOF); the EMIB-T TSV region (3.9e5 p1) and any order-2 run (1e6-2e6 DOF) need a native backend
   (AWS Palace or openEMS) behind the same config schema [calc, Sec. 3].
6. **FDTD is not the first in-browser engine.** The microbump region at uniform 0.5 um cells is 1.5e7 cells,
   dt ~ 1e-15 s, ~2e5 steps for 200 ps, i.e. ~3e12 cell-updates [calc]; FDTD also handles skin depth, sub-um liners
   and thin conductors poorly. Keep openEMS (FDTD) as a cross-solver check, not the primary engine.
7. **First canonical cases (Sec. 4):** EM-1 ABF microstrip on glass (DB has complete geometry, roughness, Dk/Df from
   16.5 to 216 GHz and measured TRL IL/mm 33-200 GHz); EM-2 differential CPWG on a 4-layer polyimide Si-bridge RDL
   (seven geometries, measured IL/mm at 56 GHz, HFSS with/without metal cheesing); EM-3 fine-pitch bridge/RDL
   multi-line crosstalk (PSB 0.75/0.75 um, UCIe-S 10 mm VTF); EM-4 microbump / Cu-pillar vertical transition;
   EM-5 TSV GSG transition (Si photonic interposer TSVs, measured S11 resonance); EM-0 analytic set first.
8. **DB gaps found while doing this** (not edited): the measured IL/mm table of `eptc67330.2025.11392620-a`
   (paper p.3 Table I) and the UCIe-S Nyquist IL (-6.2 dB) and crosstalk-limit formula of `ectc51846.2026.00199-b`
   (paper p.7 Fig. 14 caption, Sec. IV.B.3) are not in `data/metrics.csv`. Worth adding at next ingest audit.

## 1. Signal paths per packaging type

### 1.1 Data rates and frequencies

| Interface | Rate (source) | Nyquist f_N [calc] | Suggested sweep | Notes |
|---|---|---|---|---|
| HBM3 | 6.4 Gb/s (DB `ectc51529.2024.00049-e-m6`) | 3.2 GHz | DC-20 GHz | single-ended, unterminated-style |
| HBM3E | 9.2 Gb/s boost (DB `ectc51529.2024.00049-e-m8`) | 4.6 GHz | DC-25 GHz | |
| HBM4 | up to 8 Gb/s, 2048-bit, 32 channels (JEDEC JESD270-4, 2025-04-16 [S4]) | 4 GHz | DC-25 GHz | DB has 8 Gb/s eye on CoWoS-R (`ectc51529.2024.00049-b-m1`) |
| HBM4e | 12 Gb/s on EMIB-T, ~6 mm channel, 3D full-wave (DB `ectc51846.2026.00051-d-m1`; paper p.4 Sec. III.A) | 6 GHz | DC-30 GHz | |
| UCIe 1.x/2.0 | 4-32 Gb/s NRZ; advanced pkg 25-55 um bump pitch, reach up to 2 mm; standard pkg 100-130 um pitch [S1 slide 2]; standard reach 10 mm short / 25 mm long [S2 p.7] | 2-16 GHz | DC-50 GHz | VTF limits apply 0 to f_N [S1 slide 10; S2 p.11] |
| UCIe 3.0 | 48 and 64 GT/s [S3] | 24-32 GHz | DC-100 GHz | EMIB-T "meets the 64 Gb/s UCIe-A channel requirements" (paper `ectc51846.2026.00051` p.4 Sec. III.A) |
| 112G PAM4 SerDes | ~53 GBd [calc: half of 106.25 GBd] | ~26.6 GHz | DC-67 GHz | |
| 224G PAM4 SerDes | 106.25 GBd (IEEE P802.3dj electrical ad hoc [S5]) | 53.1 GHz | DC-110 GHz | DB evaluates 56 GHz and HFSS to 100 GHz (`eptc67330.2025.11392620-a/-b`) |

UCIe channel metrics (for the post-processor): loss L(f) = 20 log10(Vr/Vs), L(0) = 20 log10(Rrx/(Rtx + Rch + Rrx))
(0 for unterminated); crosstalk XT(f) = 10 log10 of the power sum over 19 aggressors of |Va_i/Vs|^2 [S2 p.11]. Eye
mask 40 mV with 0.75 UI (4-16 Gb/s) or 0.65 UI (24-32 Gb/s) [S1 slide 10]. A DB paper quotes the UCIe-S crosstalk
limit as XT(f) <= min(-26 dB, 2.5 L(f_N) - 10 dB) for 0 <= f <= f_N (paper `ectc51846.2026.00199` p.7 Fig. 14
caption). The numeric VTF-loss limits per data rate are in spec tables reproduced only as images in [S1], [S16];
not retrieved (N/A).

### 1.2 Paths that matter, by family

| Family | Critical SI path(s) | Typical geometry (source) | What the EM case must capture |
|---|---|---|---|
| CoWoS-S | die-to-die and SoC-HBM over Si-interposer BEOL; microbump 40 um pitch (DB `ectc51909.2023.00135-a-i1`); TSV 10 um x 100 um (DB `ectc.2013.6575597-a-i2`) to C4 | interposer damascene Cu, sub-um pitch (template `config/package3d/cowos_s.yaml`, no L/S row in DB); UCIe-A on Si interposer shown with 5 routing layers, CoWoS-S up to 8 [S3] | RC-dominated lines (t ~ delta); oxide eps ~4; ground-plane shielding from Si |
| CoWoS-L | LSI bridge die-to-die; SC-RDL elsewhere | LSI-1 dual damascene Cu L/S 0.8/0.8 um, t 2 um, USG dielectric (DB stack row, tv `ectc51909.2023.00174-d`, p.3 Sec. II.C); LSI-2 SAP Cu L/S 2/2, t 2.3 um (tv `-e`); SC-RDL backside L/S 11/11 (tv `ectc51909.2023.00091-a`) | sub-um lines; bridge-to-RDL vertical entry |
| EMIB | bridge traces under organic build-up | M1-M4 L/S 2/2 um, 2 um vias, bridge Si 75 um (DB tv `ectc.2016.201-a`, p.5 Table II, p.6); measured NEXT about -17 dB (model) / -21 dB (measured) near 10 GHz (DB `ectc.2016.201-c-m1`, p.8 Fig. 10(b)); 5 mm channel supports 6-8 Gb/s at 50% UI eye (paper p.7 Sec. IV) | adjacent-pair NEXT; ground density 50-70% (DB notes) |
| EMIB-T | bridge traces + HSIO and power through bridge TSV; FLI 25 um pitch (DB `ectc51846.2026.00051-b-i1`), 36-110 um mixed (`-a-i1`) | bridge ~50 um thick (paper Sec. I); >= 10 metal layers (`ectc51846.2026.00051-d`, p.4 Sec. III.A); TSV dimensions not reported (DB `-b-i4` notes) | TSV transition with lossy Si and liner; cavity-side bump; MIM on bridge (PDN, out of EM scope) |
| CoWoS-R / InFO-R | HBM and UCIe over organic RDL | Cu L/S 2/2 um (DB tv `ectc51529.2024.00049-a`), L/S 1.4-2.0 um at 6.5 mm HBM length (DB `ectc51687.2025.00047-d-m1..m8`, eye width only, basis unspecified); low-Dk polymer, thickness not in DB | long RC-limited lines; ground mesh vs solid planes |
| Glass core / ABF substrate | UCIe-S, SerDes escape | UCIe-S x8 10 mm: W/S 10/15 um, TCu 10 um, ABF 15 um above (DB `ectc51846.2026.00199-b`); ABF microstrip 34 um on 30 um ABF (DB `ectc51846.2026.00389-b`) | Dk/Df dispersion; roughness |
| FCBGA (SerDes escape) | die bump -> C4 -> build-up -> core PTH -> BGA | stripline 26 um on 30 um prepreg, t 12 um, 50 ohm (DB tv `ectc51909.2023.00021-a/b/c`) | via/PTH stubs, antipads; 224G at 53 GHz |
| SoIC / Foveros Direct / hybrid bond | vertical pad-to-pad, mostly electrically tiny | pitch 9 um and below (DB hybrid-bond rows) | mostly RC/lumped; EM wave cases not needed initially [inference] |
| TSV / TGV transitions | Si photonic interposer TSV 10 um x 100 um, GSG 2/4/6 in series (DB `ectc51909.2023.00230-a`); HRSi GSG TSV (DB `ectc51909.2023.00252-c`) | see EM-5 | liner capacitance, Si conductivity, slow-wave |
| Power delivery | out of EM-wave scope; DB has EMIB-T bridge MIM 500 nF/mm2 (stack row, tv `ectc51846.2026.00051-d`) | - | handle later as PDN impedance (quasi-static / circuit) |

## 2. Method

### 2.1 Options compared

| Approach | What it solves | Strengths | Weaknesses for package SI | Use in harness |
|---|---|---|---|---|
| 2D cross-section (quasi-TEM RLGC, or 2D full-wave modal) + cascade | per-unit-length R(f), L(f), G(f), C(f) matrices of N coupled lines; or modal gamma, Z | exact for uniform lines of any length; resolves skin/proximity effect cheaply; gives port modes for 3D | no discontinuities; quasi-TEM breaks when cross-section ~ lambda/10 (not an issue below ~1 THz for um-scale RDL [calc]) | primary, browser |
| 3D FEM, frequency domain, wave ports | full-wave S-parameters of a cut region | handles any geometry; SIBC or volumetric conductors; adaptive mesh; frequency-dependent materials trivially | DOF grows fast; indefinite system; needs good ports | transitions, browser up to ~2e5 DOF, native beyond |
| FDTD, lumped or waveguide ports | time-domain fields; broadband S in one run | simple, GPU-friendly, broadband | staircase geometry; CFL tied to smallest cell; skin depth and thin liners need sub-cell models; long ring-down for high-Q | cross-check via openEMS |

Palace (AWS, open source) is a parallel 3D FEM for frequency- and time-domain full-wave EM on MFEM, with lumped and
numeric wave ports [search summary of S6 project page]; its CPW example reports that lumped-port termination gives
"much higher reflection than for wave ports", reduced by mesh/order refinement [S6]. This supports wave ports as the
default for line terminations.

### 2.2 Hybrid flow (recommended)

1. Partition the channel into uniform segments (constant cross-section) and discontinuity blocks [inference; same
   pattern as HFSS + 2D Extractor + Circuit in `ectc51846.2026.00199-b`].
2. For each distinct cross-section: 2D solve -> RLGC(f) matrices (N x N) and modal data.
3. Uniform segment of length l: chain matrix T = expm([[0, -Z(f)], [-Y(f), 0]] l) with Z = R + jwL, Y = G + jwC,
   evaluated by modal decomposition (eigenvectors of ZY); convert to 2N-port S with reference impedances
   [unverified, standard MTL theory].
4. Discontinuity block: 3D FEM with wave ports on short uniform lead-ins whose cross-sections are the same as step 2;
   use the same 2D solver for the port eigenproblem so modal normalisation matches exactly.
5. De-embed lead-in length l_p: S_dut = D^-1 S_sim D^-1 with D = diag(exp(-gamma_i l_p)) per mode/port, gamma from
   the 2D solve (port extension).
6. Connect blocks with the generalised S-parameter connection (Redheffer star product; scikit-rf exposes
   `connect`, `cascade`, `cascade_list` [S10]).
7. Post-process: single-ended and mixed-mode S, NEXT/FEXT, VTF (UCIe), TDR/step response; passivity and reciprocity
   checks (scikit-rf module functions `passivity(s)`, `reciprocity(s)` [S10]).

### 2.3 Ports, reference planes, de-embedding

| Item | Recommendation | Basis |
|---|---|---|
| Port type | Wave port (2D eigenmode on the boundary face) for line ends; lumped port only for die pads / bump-level terminations with known Rtx/Rrx | lumped CPW port reflects more [S6] |
| Multi-line ports | One wave port face per line group, N modes; report terminal (per-line) S via modal-to-terminal transform with a power-voltage or power-current Z definition | definition ambiguity for lossy quasi-TEM lines (Marks and Williams, J. Res. NIST 1992, doi 10.6028/jres.097.024) [unverified, not fetched] |
| Port face size | Enclose the line and its reference(s) with margin of several dielectric heights; check that no spurious higher-order port mode propagates below f_max | commonly quoted HFSS sizing rules (about 5-10 w wide, 6-10 h tall for microstrip) [unverified] |
| Lead-in length | Evanescent higher-order fields decay over ~ the line-to-reference spacing; use lead-in >= 3-5 x max(h, s) before the discontinuity [inference] | |
| De-embedding | Analytic port extension with 2D gamma (simulation); for comparisons to measurement use the paper's method: TRL (`ectc51846.2026.00389-b`, p.3 Sec. IV), L-2L (`eptc67330.2025.11392620-a`, p.3 Sec. II.B), open-short (`ectc51687.2025.00076-a`) | DB |
| Line-into-PML alternative | Terminating a line in the PML is a near-perfect match and avoids needing Z0 [S8]; useful for quick IL/crosstalk of a long line in FDTD | [S8] |

### 2.4 Boundaries: PML vs ABC vs PEC

- openEMS: MUR (first-order ABC) works best at normal incidence and known phase velocity, weaker for oblique/mismatched
  waves; PML is more effective but costs more cells; PML_x with x in [6, 20], default 8; keep structures x cells off
  the boundary; radiators at least lambda/4 away; evanescent fields entering the PML can destabilise FDTD; verify by
  moving the PML out and checking that nothing changes [S8].
- HFSS: everything outside the model is PEC by default, so an air box is needed even for small models; PML minimum
  distance quoted in Ansys forum answers ranges from lambda/8 to lambda/4 [S15; forum-grade source].
- Package-specific reading [inference]:
  - Most package SI regions are shielded (solid planes above/below) and electrically small; leakage is mainly the
    parallel-plate (TEM, no cutoff) mode between planes and the Si-substrate mode. A PEC side wall shorted to ground
    is acceptable if the box resonance c/(2 W sqrt(eps_r)) > 1.5 f_max; otherwise use PML on those faces.
  - lambda/4 at the lowest frequency is impossible (lambda_g ~ 165 mm at 1 GHz in eps_r 3.3 [calc]); in FEM use
    complex coordinate stretching scaled with frequency so absorption does not vanish at low f, or switch to PEC/PMC
    walls placed where near fields have decayed below the target crosstalk level.
  - Recommended defaults: lateral PEC walls at >= 10 h (microstrip-like) or >= 3 b (stripline-like) from the
    outermost kept conductor; top face over open air (bridge/die top) PML with 5-8 graded layers; polynomial order
    2-3; target normal-incidence reflection 1e-4 to 1e-6; acceptance test in Sec. 5.

### 2.5 Conductors

| f (GHz) | 1 | 10 | 28 | 53.1 | 100 | 200 |
|---|---|---|---|---|---|---|
| Cu skin depth (um), rho = 1.724e-8 ohm m [calc] | 2.09 | 0.66 | 0.40 | 0.29 | 0.21 | 0.15 |

Cu surface resistance Rs = 0.0082 / 0.026 / 0.062 / 0.083 ohm/sq at 1 / 10 / 56 / 100 GHz [calc].

- Fine RDL / BEOL (t 0.8-2 um): volumetric conductor in 2D, with boundary-layer elements at about delta/2-delta/3
  near surfaces up to f_max; in 3D, mesh inside conductors only near the discontinuity, or use a thin-conductor
  impedance Zs = (1+j)/(sigma delta) coth((1+j) t/delta) per face pair [unverified closed form; reduces to SIBC for
  t >> delta and to DC sheet resistance for t << delta].
- Thick substrate Cu (t >= 4 um, ABF/prepreg lines): SIBC valid above ~2.5 GHz for t = 4 um [calc].
- Electroplated Cu conductivity: DB rows do not give it for the EM candidates; default bulk 5.8e7 S/m and expose as
  parameter (N/A in DB).

### 2.6 Roughness

| Model | Form | Status |
|---|---|---|
| Hammerstad-Jensen | K = 1 + (2/pi) atan(1.4 (Rq/delta)^2), saturates at 2 | standard form [unverified]; reported accurate to ~15 GHz for < 2 um RMS, less accurate above ~5 GHz for very rough Cu [S11 p.6-7] |
| Huray (snowball) | K = A_matte/A_flat + (3/2) sum_i (N_i 4 pi a_i^2 / A_flat) / (1 + delta/a_i + delta^2/(2 a_i^2)) | [S11 p.8 Eq. 4]; parameters need SEM-level data |
| Cannonball-Huray | 14 equal spheres; r = H_RMS / (2 (1 + sqrt 2)); square tile of side 6r | [S11 p.9-10 Eq. 5]; my reading of the tile area as (6r)^2 from the garbled text extraction [unverified]; Cannonball accurate to 50 GHz vs H-J to ~15 GHz on FR408HR stripline [S11 p.18] |
| Groisse | K = 1 + exp(-(delta/(2 Rq))^1.6) | [unverified, from memory] |

Package Cu is far smoother than PCB foil: Rq 0.19 um measured on SAP Cu over ABF (DB stack row of
`ectc51846.2026.00389-b`, p.3 Sec. III); Ra 0.2 vs 0.5 um shiny vs matte press (DB `ectc51909.2023.00021-b`). Since
delta(100 GHz) = 0.21 um ~ Rq, roughness matters at 50-200 GHz even for SAP lines. Default: Huray/Cannonball with
H_RMS from DB, fallback Hammerstad.

### 2.7 Dielectrics (causal)

- Djordjevic-Sarkar (wideband Debye): eps*(w) = eps_inf + Delta_eps ln((w2 + jw)/(w1 + jw)) / (log10(w2/w1) ln 10)
  - j sigma/(w eps0), with w1, w2 the lower/upper corner angular frequencies [S12]; original: Djordjevic et al.,
  IEEE Trans. EMC 43(4), 2001, pp. 662-667 [S12]. Fit eps_inf and Delta_eps from (Dk, Df) at one frequency;
  scikit-rf's MLine uses this model by default ("Djordjevic/Svensson") [S9].
- Where DB has multi-frequency data (ABF Type-A, 16.5-216 GHz, 25/80/115 C: DB `ectc51846.2026.00389-a-m1..m36`),
  fit a multi-pole Debye/Lorentz model and enforce causality instead of the 1-point DS model. ABF Type-A at 25 C:
  Dk 3.406 -> 3.479 and Df 0.00203 -> 0.0083 from 16.5 to 216 GHz (`-m1, -m2, -m31, -m32`). This is also the only
  temperature-dependent Dk/Df set in the DB (Df up to +20.4% by 115 C, `-m41`), the natural EM-thermal coupling hook.
- Lossy Si: eps_r 11.9 plus conductivity; resistivity is not reported for most DB TVs (N/A); expose as parameter.

### 2.8 Mixed-mode, crosstalk, quality checks

- Mixed-mode: port order (1+, 1-, 2+, 2-); S_mm = M S M^-1, M = (1/sqrt 2) [[1,-1,0,0],[0,0,1,-1],[1,1,0,0],
  [0,0,1,1]] gives [[Sdd, Sdc],[Scd, Scc]] [unverified, standard Bockelman-Eisenstadt convention].
- Crosstalk (4-port pair; 1/2 aggressor near/far, 3/4 victim near/far): NEXT = S31, FEXT = S41. Weak-coupling
  backward coefficient K_b = (1/4)(L_m/L + C_m/C); forward coupling proportional to (C_m/C - L_m/L), which is zero
  in a homogeneous dielectric (stripline) [unverified, textbook]. This gives a clean analytic check for the 2D RLGC
  solver (Sec. 5).
- Multi-aggressor: power-sum crosstalk; UCIe VTF XT with 19 aggressors [S2 p.11].
- Quality: reciprocity S = S^T; passivity max singular value of S <= 1 at every f; causality by delay-causal check
  or Kramers-Kronig on |S| and phase; IEEE 370-2020 defines these quality metrics for interconnect S-parameters
  [unverified, not fetched]. TDR: inverse FFT of S11 with a Gaussian/Hamming-windowed step (DB example: Keysight ADS
  TDR, Tr 5 ps, Hamming window, `tcpmt.2024.3507552-a-m12`); requires DC extrapolation, so sweep from very low f.
- Eye diagram / channel operating margin: not needed initially (per brief); VTF and IL/RL/XT masks are enough.

## 3. The "regional representative" region

### 3.1 Cut rules [inference unless tagged]

| Decision | Rule | Rationale |
|---|---|---|
| Lateral extent, stripline-like (planes above and below, spacing b) | >= 2.2 b beyond the outermost kept conductor for -60 dB field level; 1.5 b for -40 dB | dominant decay ~ exp(-pi x / b) between parallel plates: x = ln(1000) b / pi = 2.2 b [calc] |
| Lateral extent, microstrip-like (one plane, height h) | >= 10 h, and verify | fringing decays algebraically, roughly as 1/(1 + (x/h)^2) for coupling (common rule of thumb) [unverified] |
| Aggressors in same layer | victim + 2 nearest per side without ground shields; + 1 per side with interleaved grounds (GSSG/GSGS) | 2nd-neighbour coupling is typically >= 10 dB below 1st [inference]; UCIe compliance uses 19 aggressors, so for VTF XT keep the full bump-field cluster around the victim [S2 p.11] |
| Vertical extent | keep the signal layer, its reference planes, plus the next signal layer if the plane between is meshed (cheesed) or slotted | DB: 4x4 um metal-density cheesing raised 2 mm IL at 56 GHz from 0.89 to 0.96 dB on the ground plane and to 0.95 dB on the signal traces (`eptc67330.2025.11392620-a-m9, -m11, -m15`) |
| Si substrate | keep it if no continuous ground plane separates the line from Si | DB paper: M2M3 lines ~6 um above Si show higher IL than M4M3 lines shielded by M3 (`eptc67330.2025.11392620`, p.3 Sec. II.B) |
| Ground return | include every via wall / ground bump / ground TSV within the lateral cut; tie PEC side walls to the reference planes only if the real structure has stitching there | return-path discontinuity is the main 3D effect at transitions |
| Length of 3D block | discontinuity + lead-in >= 3-5 x max(h, s) per side; everything else in 2D | Sec. 2.3 |

Commercial practice: HFSS 3D Layout cutouts keep only the target nets and their reference nets inside a drawn region
before ports and extents are added [S13]; Cadence markets Clarity as removing the need to "simplify and/or partition"
via distributed adaptive meshing, with localized refinement [S14]. Sigrity cutout behaviour was not researched in this
session (N/A).

### 3.2 DOF estimates [calc]

Mesh-count rules used: tets ~ 6 V / h^3 for element size h; order-1 Nedelec DOF ~ edges ~ 1.2 x tets; order-2
Nedelec (2 per edge + 2 per face, faces ~ 2 x tets) ~ 6.4 x tets; 2D P2 Lagrange DOF ~ 2 x triangles; 2D vector
modal (Nedelec order 2 transverse + P2 longitudinal) ~ 7 x triangles.

**(a) 2 mm uniform 3-line RDL, L/S 2/2 um, t 2 um, over ground, to 100 GHz (2D RLGC + cascade).**

- Cross-section domain: 3 x 2 + 2 x 2 = 10 um of conductors; lateral 70 um (10 h margin with h = 3 um assumed);
  height ~35 um.
- Volumetric conductors: element edge 0.1 um on surfaces (~delta/2 at 100 GHz), 8 boundary layers.
  - lines: 3 x (8 um perimeter / 0.1) x 8 layers x 2 tri = 3,840 triangles
  - ground strip top surface: (70 / 0.1) x 8 x 2 = 11,200 triangles
  - conductor interiors ~1,600; dielectric/air graded ~15,000
  - total ~3.2e4 triangles -> ~6.3e4 P2 DOF (quasi-static R, L, C solves) or ~2.2e5 (full-wave 2D modal)
- With SIBC instead (valid only above ~9.8 GHz for t = 2 um): ~6.5e3 triangles, ~1.3e4 DOF.
- Length: 0 DOF (analytic chain matrix). Electrical length 2 mm / 1.65 mm = 1.2 lambda_g at 100 GHz.
- Cost: 100-200 frequencies x one 2D sparse solve of 6e4 DOF: seconds per frequency in WASM [inference].
- Same thing in 3D by extruding the 2D mesh into 80 um slices: 25 slices -> 7.9e5 prisms -> 2.4e6 tets ->
  2.8e6 order-1 / 1.5e7 order-2 DOF, with 800:1 aspect ratio elements. Not viable in browser.

**(b) 3D microbump-to-RDL transition (CoWoS-S-like, 40 um pitch, G-S-G), with PML.**

- Region 200 x 160 x 60 um (3 bumps + two 60 um RDL lead-ins + margins); bump d 20 um, h 25 um assumed (DB has no
  CoWoS-S bump diameter; the template uses an analog, `config/package3d/cowos_s.yaml`).
- bulk at h = 8 um: 6 x 1.92e6 / 512 = 22,500 tets
- lead-in refinement: 2 x 60 um x (15 x 8 um box) at h = 1 um x 6 = 86,400
- bump shells (2 um at h = 2 um): ~9,900; pads/vias ~20,000
- PML 40 um (5 x 8 um) on 4 sides + top: 3.0e6 um^3 at h = 8 um = 35,250
- total ~1.74e5 tets -> ~2.1e5 order-1 DOF, ~1.1e6 order-2 DOF
- conductors as SIBC except within 10 um of the bump-pad junction (thin-conductor impedance there).
- Box resonance with PEC walls instead of PML: W = 200 um -> 400 GHz (eps_r 3.5), so PEC walls are acceptable
  here to 100 GHz; PML still recommended on the top face if the die back is not modelled [calc + inference].
- FDTD equivalent (uniform 0.5 um): 1.54e7 cells, dt 9.6e-16 s (vacuum CFL), 2.1e5 steps for 200 ps, 3.2e12
  cell-updates.

**(c) EMIB-T bridge TSV transition.**

- Region 250 x 250 x 150 um: signal TSV + 8 ground TSVs at 50 um pitch (analog from DB
  `eptc59621.2023.10457670-a-i1`, used by `config/package3d/emib_t.yaml`; EMIB-T TSV dims not reported, DB
  `ectc51846.2026.00051-b-i4`), TSV d 10 um, length 50 um (bridge ~50 um, paper `ectc51846.2026.00051` Sec. I),
  cavity-side bump + one build-up layer below, bridge BEOL + FLI via above; liner 0.5 um assumed.
- bulk at h = 10 um: 56,250 tets
- liner as 2-layer prism boundary layer (~1.7 um^2 triangles): 9 x (1,570 / 1.7) x 2 x 3 = 49,900 tets
- Si shell 4 um around each TSV at h = 2 um: 42,400; top and bottom lead-ins 2 x 100 um: 144,000; pads/bumps ~30,000
- total ~3.2e5 tets -> ~3.9e5 order-1 DOF, ~2.1e6 order-2 DOF -> native backend.
- Physics needed: lossy Si (sigma parameter, N/A in DB), liner capacitance (MOS depletion ignored initially).

## 4. Canonical regional EM cases

### 4.1 Validation candidates in the DB

Query: `data/metrics.csv` category electrical, parameters matching insertion/return loss, S21/S11/Sdd, crosstalk,
impedance, eye, joined to `test_vehicles.csv`, `stack_layers.csv`, `interconnects.csv` (207 metric rows on 56 TVs).
Ranked by reproducibility (geometry + materials + result).

| Rank | tv_id | Structure | Result rows (value, basis) | Geometry/materials in DB | Missing |
|---|---|---|---|---|---|
| 1 | `ectc51846.2026.00389-b` (+ `-a` for Dk/Df) | 70 ohm microstrip, 2/4/8 mm, glass core | avg IL 0.08 / 0.155 / 0.265 / 0.45 dB/mm at 33 / 77 / 140 / 200 GHz, 25 C (`-m2, -m5, -m8, -m11`); also 80 and 115 C (`-m3..-m13`); S11 < -20 dB 10-220 GHz (`-m14`); measured, TRL; HFSS correlation (`-m16`) | w 34 um, t 4 um, Rq 0.19 um, ABF 30 um over Cu ground, 200 um AGC EN-1 glass, ABF buffer 15 um; Dk/Df 16.5-216 GHz x 3 temps (`-a-m1..m36`) | ground Cu thickness, trace profile, Cu sigma, glass Dk/Df (only matters below ground) |
| 2 | `eptc67330.2025.11392620-a` | differential CPWG, 7 designs, 1 and 2 mm, 4-layer PI RDL on Si bridge | HFSS 2 mm M4M1W25 diff IL 0.08 dB DC, 0.89 dB at 56 GHz, cheesing variants 0.91-0.96 dB (`-m8..m15`, simulated); diff RL > 15 dB DC-65 GHz (`-m2`, measured); measured de-embedded IL/mm at 56 GHz: M4M1 W2/10/25 = 1.353/0.634/0.441, M4M3 W2/5 = 1.351/0.937, M2M3 W2/5 = 1.402/1.040 dB/mm (paper p.3 Table I; not in DB) | metal t 2 um, via 4 um, PI Dk 3.3 Df 0.034, M1-Si 0.868 um; per-design w, signal-ground gap, signal-signal spacing (stack rows, p.2 Fig. 3) | via-wall pitch, cutouts in intermediate layers, top PI thickness, Si resistivity, Cu sigma |
| 3 | `ectc51846.2026.00035-a/-b/-c` | PSB bridge wiring, checkerboard / parallel / SAP multi-layer | crosstalk -20 dB 0-50 GHz at 0.4 mm (`-a-m13`); eye height/opening at 20 Gb/s, 0.4 and 2.0 mm (`-m1..m8`); simulated (HFSS + Ansys Circuit) | L/S 0.75/0.75 um, t 1.0 um, ILD 1.0 um, oxide Dk 4.0 Df 0.002 or m-PPE Dk 2.8 Df 0.0045; model C L/S 1.4/1.4, t 2.5 um; 25 um hex bump pitch | layer count, GND-mesh pattern, port/termination details |
| 4 | `ectc51846.2026.00199-b` | UCIe-S 3.0 x8, 10 mm, 24 lines on glass-core ABF | VTF XT worst -27.6 dB at 12.7 GHz, -36.3 dB at 16 GHz (`-m1, -m2`); VTF IL at 0 Hz -4.35 dB (`-m3`); eye 0.78 UI (`-m4`); Nyquist IL -6.2 dB (paper p.7, not in DB); simulated | W/S 10/15 um, TCu 10 um, ABF 15 um above; Z0 window 47.5-52.5 ohm at 16 GHz (`-m5`); bump pitch 130 um | ABF grade and Dk/Df, ABF thickness below, Tx/Rx model detail |
| 5 | `ectc51909.2023.00021-a/-b/-c` | 50 ohm stripline, single-ended and differential, prepreg | IL/mm at 50 GHz: -0.34 / -0.23 / -0.26 / -0.21 / -0.24 / -0.33 dB/mm by prepreg and press side (`-a-m1,-m2`, `-b-m1..m4`, `-c-m1,-m2`); measured | w 26 um (SE), 22 um (diff), t 12 um, 30 um prepreg both sides, prepreg B Dk 3.2, Df 0.002/0.003/0.0046 at 1/10/50 GHz, Ra 0.2/0.5 um | diff spacing (not stated), Ni/Au pad finish thickness |
| 6 | `ectc51909.2023.00230-a` | GSG line with 2/4/6 via-last Cu TSVs in series (SiPh interposer) | max S11 -11 dB measured, -19.5 dB HFSS DC-67 GHz (`-m3, -m6`); S11 resonance 45 GHz measured vs 40 GHz HFSS (`-m4, -m5`) | TSV d 10 um, depth 100 um, Al RDL 1 um both sides, oxide 1 um | TSV GSG pitch, liner, Si resistivity, line widths |
| 7 | `3dic63395.2024.10830178-a` | microstrip on XP80 over damascene ground, Si interposer | 0.3 dB/mm at 110 GHz RDL1, 0.23 dB/mm RDL2 (`-m25, -m26`); measured | RDL t 5 um, L/S 5/5, PID1 15 um, PID 7 um, M1 ground 1 um | line width of the RF lines (DB variant W/L 50/3000 um only for m27), XP80 Dk/Df |
| 8 | `tcpmt.2025.3599484-d` | HFSS 2 mm 50 ohm microstrip, rectangular vs rounded | S21 -2.58 / -1.88 dB at 70 GHz (`-m1, -m2`); S11 < -30 dB (`-m4`); simulated | w 2 / 2.5 um, t 3 um, dielectric 2 um, Dk 3.0, tan delta 0.02 | ground plane description; good as cross-solver target (sim vs sim) |
| 9 | `ectc.2016.201-c` | EMIB bridge trace pair | NEXT about -17 dB 4-7 GHz (`-m1`, measured) | L/S 2/2 (`-a` row) | trace length, layer, dielectric (DB notes) |

Discarded for now: eye-only rows (`ectc51687.2025.00047-d`, `ectc51529.2024.00049-*`), relative-only rows
(`ectc51529.2024.00049-e`), RF-module rows at 2 GHz (`ectc51909.2023.00252-*`, low-frequency only, useful for a
TSV R/L sanity check), antenna rows.

Closed-form sanity of the top two candidates (Hammerstad-Jensen Z0/eps_eff with thickness correction, Pozar microstrip
dielectric loss, crude conductor loss R = Rs K (1/w + 1/(w + 6h)), Hammerstad roughness) [calc]:

| Case | Z0 (ohm) | eps_eff | alpha_d (dB/mm) | alpha_c crude (dB/mm) | total est. | DB / paper |
|---|---|---|---|---|---|---|
| ABF 34/30/4 um, 77 GHz, Rq 0.19 um | 70.6 | 2.47 | 0.033 | 0.22 | 0.26 | 0.155 measured (`-b-m5`) |
| ABF, 33 GHz | 70.6 | 2.47 | 0.010 | 0.12 | 0.13 | 0.08 measured (`-b-m2`) |
| PI W25 over 16 um, 56 GHz, Df 0.034 | 61 (no side grounds) | 2.48 | 0.23 | 0.21 | 0.45 | 0.441 measured (paper Table I) |

- Z0 70.6 ohm matches the design 70 ohm of the ABF lines (DB TV name). The crude conductor-loss estimate is 60-70%
  high for the ABF case; closed forms are not good enough for conductor loss at w ~ 10-100 delta with thick strips,
  which is exactly why EM-1 is a solver validation case and not an analytic one.
- DC check, M4M1W25: R = rho l / (w t) = 0.69 ohm per 2 mm line; series loss into 50/50 ohm = 0.060 dB per line
  versus HFSS 0.08 dB differential at DC (`-a-m8`), the difference plausibly the ground return [calc + inference].

### 4.2 Case definitions

All cases: frequency sweep with adaptive or log spacing, S-parameters (Touchstone), RLGC(f) where 2D, mixed-mode where
differential, passivity/reciprocity report, TDR. Material IDs refer to a future materials library.

**EM-0 Analytic and cross-solver set (first; see Sec. 5).** Coax, rectangular waveguide, microstrip, stripline, CPW,
coupled stripline FEXT = 0, line-into-PML reflection.

**EM-1 Uniform microstrip on ABF over glass (2D + cascade; 3D TRL-line check).**
- Geometry: w 34 um, t 4 um, ABF 30 um, Cu ground (t parameter, default 4 um), lengths 2/4/8 mm; air above.
- Materials: ABF Type-A dispersive fit from `ectc51846.2026.00389-a-m1..m36` (3 temperatures); Cu 5.8e7 S/m;
  roughness Rq 0.19 um (Huray/Cannonball and H-J variants).
- Ports: 2D wave-port modes; 3D variant: microstrip with wave ports at both ends, no pads (TRL-equivalent).
- Outputs: IL/mm at 33/77/140/200 GHz and 25/80/115 C; Z0; eps_eff.
- Validation: `ectc51846.2026.00389-b-m2..m13` (measured, TRL), HFSS correlation statement `-m16`.
- Why first: geometry, roughness and multi-frequency, multi-temperature dielectric data are all in the DB; it also
  exercises the dielectric fit and the thermal coupling hook.

**EM-2 Differential CPWG on 4-layer polyimide Si-bridge RDL (2D + 3D cheesing variant).**
- Geometry per stack rows: metal 2 um, via 4 um, M1-Si 0.868 um, designs M4M1W2/10/25, M4M3W2/5, M2M3W2/5 with
  stated signal-ground gaps and signal-signal spacings; ground via walls (pitch parameter, N/A); Si below.
- Materials: PI eps_r 3.3, tan delta 0.034 (DS model fitted at an assumed reference frequency, N/A in paper); Cu;
  Si (resistivity parameter).
- Ports: differential wave ports (2 modes); 3D variant with 4x4 um holes at 4 um spacing in M1 / M4 ground / M4
  signal (paper p.3 Sec. II.C, Fig. 9).
- Outputs: Sdd21, Sdd11 DC-100 GHz; IL/mm at 56 GHz per design; delta-IL from cheesing.
- Validation: paper Table I measured IL/mm (p.3); `eptc67330.2025.11392620-a-m8..m15` (HFSS); RL > 15 dB (`-m2`).
- Value: tests volumetric conductors (W2, t 2 um, 56 GHz: delta 0.28 um), Si-substrate loss (M2M3 vs M4M3), and a
  3D periodic perforation effect; 224G-relevant.

**EM-3 Fine-pitch multi-line crosstalk (2D RLGC N-line + cascade).**
- 3a PSB bridge: L/S 0.75/0.75 um, t 1.0 um, ILD 1.0 um, oxide (Dk 4.0, Df 0.002) or m-PPE (Dk 2.8, Df 0.0045),
  reach 0.4 and 2.0 mm, victim + 2 aggressors per side, GND-mesh approximated as solid planes first.
  Validation: `ectc51846.2026.00035-a-m13` (-20 dB, simulated); eye rows as a later check.
- 3b UCIe-S 10 mm on glass-core ABF: 24 lines W/S 10/15 um, TCu 10 um, ABF 15 um above (lower ABF thickness
  parameter); compute VTF loss and 19-aggressor VTF crosstalk with UCIe Tx/Rx terminations; compare against
  `ectc51846.2026.00199-b-m1..m3` and the -6.2 dB Nyquist IL in paper p.7.
- 3c CoWoS-R HBM line: L/S 2/2 um and 1.4-2.0 um, 6.5 mm, polymer dielectric (parameter, N/A); outputs IL at 4-6 GHz
  and near/far-end XT; no direct DB S-parameter validation (eye-only rows `ectc51687.2025.00047-d-m1..m8`).
- Outputs: N x N RLGC(f), NEXT/FEXT vs length, power-sum XT, VTF.

**EM-4 Vertical transition: microbump / Cu pillar to RDL (3D block, wave ports on lead-ins, PEC walls + top PML).**
- Parametric: pitch 40 um (CoWoS-S, DB `ectc51909.2023.00135-a-i1`) or 55 um Cu pillar d 20 um (DB
  `eptc67330.2025.11392620-b` cu_pillar row), G-S-G or S with 4-6 ground neighbours, bump height, pad diameters,
  underfill eps (parameter).
- Outputs: S11/S21 of the transition alone (de-embedded), equivalent pi/T lumped model (L, C), TDR dip.
- Validation: no fully specified public microbump RF dataset in the DB; partial targets: 8-channel Si-bridge to
  FOWLP model, diff IL 2.4-3.0 dB at 56 GHz, XT < -60 dB, RL 15 dB DC-100 GHz (`eptc67330.2025.11392620-b-m1..m4`,
  simulated, geometry incomplete); coaxial Cu-post improvement percentages (`eptc67330.2025.11392593-c-m1, -m2`,
  relative only). Primary validation therefore cross-solver: browser FEM vs Palace vs openEMS on the same mesh/config.

**EM-5 TSV GSG transition (3D, lossy Si, liner).**
- 5a SiPh-interposer TSV chain: TSV d 10 um, depth 100 um, Al RDL 1 um, oxide 1 um, 2/4/6 TSVs in series; GSG pitch,
  liner thickness and Si resistivity as parameters. Validation: S11 resonance 45 GHz measured / 40 GHz HFSS and
  max S11 -11 / -19.5 dB (`ectc51909.2023.00230-a-m3..m6`).
- 5b EMIB-T bridge TSV: template-driven (`config/package3d/emib_t.yaml`): bridge ~50 um, TSV analog d/pitch, cavity
  bump below, FLI via above. No public RF validation (DB `ectc51846.2026.00051-b-i4`: dimensions not given); report
  as parametric only.
- Outputs: S-parameters, per-TSV R(f), L(f), C(f), G(f) extraction; slow-wave/loss vs Si resistivity.

## 5. Analytic and cross-solver validation

### 5.1 Closed forms (implement as unit tests of the 2D solver and post-processor)

| Test | Formula / known result | Tolerance target [inference] |
|---|---|---|
| Coax | Z0 = (60/sqrt eps_r) ln(b/a); alpha_c = Rs (1/a + 1/b) / (2 eta ln(b/a)) [unverified, textbook]; Palace has a coax example [S7] | Z0 < 0.5%, alpha < 2% |
| Rectangular waveguide | TE10 cutoff f_c = c / (2 a sqrt eps_r); 3D port eigen and S21 phase vs beta = sqrt(k^2 - (pi/a)^2) | f_c < 0.1% |
| Parallel-plate | Z0 per width = eta h / w (w >> h); alpha_c = Rs/(eta h) | < 1% |
| Microstrip | Hammerstad-Jensen quasi-static Z0, eps_eff, Kirschning-Jansen dispersion; scikit-rf `MLine` implements H-J (default), Schneider, Wheeler; dispersion Kirschning-Jansen (default), H-J, Kobayashi, Schneider, Yamashita; dielectric DS (default) [S9] | Z0 < 1-2% (closed-form accuracy) |
| Stripline (zero thickness, centred) | Z0 = (30 pi / sqrt eps_r) K(k)/K(k'), k = sech(pi w / (2 b)) (Cohn, conformal) [unverified] | < 0.5% |
| CPW on thick substrate | Z0 = (30 pi / sqrt eps_eff) K(k')/K(k), k = w/(w + 2 s), eps_eff = (eps_r + 1)/2 [unverified]. Check: w 30, s 18 um, eps_r 9.3 -> 56.0 ohm [calc], vs Palace CPW example 56.02 ohm on sapphire (eps_r 9.3 perpendicular / 11.5 parallel to C-axis) [S6] | < 1% |
| Coupled stripline | FEXT = 0 in homogeneous dielectric; K_b = (1/4)(L_m/L + C_m/C) [unverified] | FEXT < -60 dB numerical floor |
| Lossy line | alpha_c ~ R/(2 Z0), alpha_d ~ G Z0 / 2 = pi f sqrt(eps_eff) tan delta_eff / c; microstrip filling factor eps_r (eps_eff - 1)/(sqrt eps_eff (eps_r - 1)) (Pozar) [unverified] | consistency of 2D RLGC with S21 cascade < 0.1 dB |
| Skin effect | round wire R(f) vs exact Bessel solution; flat strip R(f) DC -> sqrt(f) asymptote | < 2% |
| Causality / passivity | DS model satisfies Kramers-Kronig [S12 context]; generated S must pass passivity and reciprocity [S10] | pass at all f |

### 5.2 Boundary and port tests

- PML reflection: uniform microstrip or stripline of length l terminated into PML (or wave port vs PML); measure
  |S11| over 1-100 GHz versus PML thickness (4, 8, 12 layers) and grading order; pass if |S11| < -40 dB and S21
  phase matches 2D beta l within 0.5 deg/mm [inference]. openEMS supports this termination directly [S8].
- Clearance test: move PML/PEC wall outward by 2x; IL change < 0.01 dB, XT change < 1 dB [inference, following S8].
- Port test: lumped vs wave port on Palace CPW geometry, reproduce the qualitative finding that lumped ports reflect
  more [S6].
- De-embedding test: simulate L and 2L lines in 3D, L-2L de-embed, compare to analytic 2D cascade.

### 5.3 Open-source cross-solvers

| Tool | Method | Example cases to mirror | Role |
|---|---|---|---|
| AWS Palace | 3D FEM (MFEM), frequency and time domain, lumped and numeric wave ports [S6 project text] | CPW crosstalk: two CPWs, w 30 um, s 18 um, 266 um apart, 500 um sapphire, 2-32 GHz, p = 2 and 4, Z0 56.02 ohm [S6]; coaxial line [S7] | native backend for EM-4/EM-5; reference for browser FEM |
| openEMS | FDTD, MUR and PML_x boundaries, MSL ports, line-into-PML termination [S8]; stripline-to-MSL transition tutorial (wiki, from search) | MSL, stripline-MSL transition | time-domain cross-check of EM-1 and EM-4 |
| scikit-rf | Network algebra, `connect`/`cascade`/`cascade_list`, `renormalize`, `passivity`, `reciprocity`, `de_embed` [S10]; media models incl. `MLine` [S9] | analytic microstrip, Touchstone IO | post-processing and analytic reference (Python side of the validation suite) |

## Open questions (for the proposal, not for Wentao now)

1. Exact UCIe VTF loss limits per data rate (spec tables are images in [S1], [S16]); needed only for pass/fail coloring.
2. Si resistivity, Cu conductivity and liner thickness are missing for almost every DB TV; the harness should expose
   them as named parameters with documented defaults, not hide them.
3. Whether to support thin-conductor impedance boundaries in 3D (cheaper) or only volumetric conductor meshing near
   discontinuities (simpler, more robust). Recommend volumetric first [inference, simplest robust].

## Sources

Web (all retrieved 2026-10-20):

- [S1] UCIe Consortium, Hot Chips 2023 UCIe tutorial, "Electrical Form Factor and Compliance" (slides 2, 10):
  https://www.hc2023.hotchips.org/assets/program/tutorials/ucie/Electrical%20Form%20Factor%20and%20Compliance.pdf
- [S2] X. Jiang, E. Li (Keysight), "Chiplet Signal Integrity Simulation", Asian IBIS Summit, 2024-10-25 (p.7, p.11):
  https://ibis.org/summits/oct24b/PDFs/07-JiangX.pdf
- [S3] Synopsys, "The Road to 64G UCIe IP: What Designers Need to Know":
  https://www.synopsys.com/articles/ucie-3-0-64gbps-challenges.html
- [S4] JEDEC press release, JESD270-4 HBM4, 2025-04-16:
  https://businesswire.com/news/home/20250416843598/en/JEDEC-and-Industry-Leaders-Collaborate-to-Release-JESD270-4-HBM4-Standard-Advancing-Bandwidth-Efficiency-and-Capacity-for-AI-and-HPC
  (content via search summary; standard text not read)
- [S5] IEEE P802.3dj electrical ad hoc, 2024-01-11 contribution (106.25 GBd signaling, via search summary):
  https://www.ieee802.org/3/dj/public/adhoc/electrical/24_0111/ran_3dj_elec_01a_240111.pdf
- [S6] AWS Palace documentation, "Crosstalk Between Coplanar Waveguides": https://awslabs.github.io/palace/stable/examples/cpw/
- [S7] AWS Palace documentation, "Signal Propagation in a Coaxial Cable" (listed by search, not opened):
  https://awslabs.github.io/palace/stable/examples/coaxial/
- [S8] openEMS documentation, Boundary Conditions: https://docs.openems.de/en/latest/_sources/concepts/bc.rst.txt
- [S9] scikit-rf, `skrf.media.mline.MLine`: https://scikit-rf.readthedocs.io/en/latest/api/media/generated/skrf.media.mline.MLine.html
- [S10] scikit-rf, network API: https://scikit-rf.readthedocs.io/en/latest/api/network.html
- [S11] L. Simonovich, "Practical Method for Modeling Conductor Surface Roughness Using The Cannonball Stack Principle",
  white paper issue 2.0, 2015-04-25: https://www.polarinstruments.com/support/si/AP8203.pdf
- [S12] Altair Feko user guide, Dielectric Modelling (Djordjevic-Sarkar form; cites Djordjevic et al., IEEE Trans. EMC
  43(4) 2001): https://help.altair.com/feko/topics/feko/user_guide/solver_solution_methods/media_modelling_dielectric_feko_c.htm
- [S13] Ansys, HFSS 3D Layout workshop 4.1 BGA (cutout subdesign; via search summary):
  https://innovationspace.ansys.com/courses/wp-content/uploads/2021/07/HFSS_3DLGS_2019R3_EN_WS4.1_BGA-1.pdf
- [S14] Cadence, Clarity 3D Solver product brief / launch coverage (via search summary):
  https://www.cadence.com/en_US/home/resources/product-briefs/streamlining-si-pi-analysis-with-clarity-ace-technology-pb.html ;
  https://www.signalintegrityjournal.com/articles/1199-cadence-unveils-clarity-3d-solver-delivering-unprecedented-performance-and-capacity-for-system-analysis-and-design
- [S15] Ansys Innovation Space forum, PML topic (forum-grade): https://innovationspace.ansys.com/forum/forums/topic/pml/
- [S16] Cadence, DesignCon 2025 "Case Study: UCIe Interface SignOff" (VTF masks as images; values not extracted):
  https://www5.cadence.com/rs/070-BII-206/images/DesignCon_2025_Case%20Study_UCIe_Interface_SignOff.pdf?version=1

DB / cached papers (facts with locators above): `ectc51846.2026.00389` (ABF Type-A on glass), `eptc67330.2025.11392620`
(Si-bridge CPWG), `ectc51846.2026.00035` (PSB bridge), `ectc51846.2026.00199` (UCIe-S on glass), `ectc51909.2023.00021`
(prepreg stripline), `ectc51909.2023.00230` (SiPh TSV), `3dic63395.2024.10830178` (imec RF interposer),
`tcpmt.2025.3599484` (HFSS microstrip edge shape), `ectc.2016.201` (EMIB), `ectc51846.2026.00051` and
`ectc51687.2025.00051` (EMIB-T), `ectc51529.2024.00049` and `ectc51687.2025.00047` (CoWoS-R), `ectc51909.2023.00135`
and `ectc.2013.6575597` (CoWoS-S interconnects), `ectc51909.2023.00174` (CoWoS-L LSI), `tcpmt.2024.3507552`
(TDR settings).
