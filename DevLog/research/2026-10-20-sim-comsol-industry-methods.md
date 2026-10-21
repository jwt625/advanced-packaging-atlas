---
title: How COMSOL and package-industry tools implement thermo-mechanics, thermal and EM for packaging - implementation lessons
date: 2026-10-20
status: research report (input to DevLog-010)
scope: COMSOL (Structural Mechanics, Heat Transfer, RF), Ansys Mechanical / HFSS / HFSS 3D Layout, Cadence Celsius, package warpage literature, JEDEC/JEITA conventions
retrieval: all URLs retrieved 2026-10-20 unless stated otherwise
---

# COMSOL and package-industry methods for the multiphysics harness

Conventions in this report

- [Sn] = source number in the source list at the end. "Fact" = stated in the cited source. "Inference" = my reading or
  derivation, labelled as such. "Not verified" = I could not confirm from a primary source in this pass.
- "snippet" next to a source = the claim was confirmed only from search-engine-extracted page text (the page itself
  timed out or is a scanned PDF); treat as lower confidence than a fetched page.
- Acronyms: CTE coefficient of thermal expansion; DOF degrees of freedom; AMG algebraic multigrid; SA-AMG smoothed
  aggregation AMG; GMG geometric multigrid; AMS auxiliary-space Maxwell solver; PML perfectly matched layer;
  SBC scattering boundary condition; IBC impedance boundary condition; TBC transition boundary condition;
  AWE asymptotic waveform evaluation; EMC epoxy molding compound; DMA dynamic mechanical analysis; WLF Williams-Landel-Ferry;
  TTS time-temperature superposition; RVE representative volume element; ROM rule of mixtures; ECAD electronic CAD;
  RDL redistribution layer; HTC heat transfer coefficient; TEM transverse electromagnetic; PEC perfect electric conductor.

## Top 15 implementation lessons

| # | Lesson | Source |
|---|---|---|
| 1 | Thermal strain uses the secant CTE by default: eps_th = alpha_s(T) (T - Tref). Tangent CTE data must be integrated; COMSOL does this numerically at every evaluation and warns it is slower, recommending pre-conversion to secant. Store secant curves; convert tangent data once at load time. | [S1] |
| 2 | Measured CTE curves carry their own strain-free temperature Tm (COMSOL built-in data: 293 K). Changing the strain-free temperature Tref requires re-basing alpha (closed form below), not just shifting T. Process-step modeling needs this per domain. | [S1] |
| 3 | When temperature feeds mechanics, discretize temperature one order lower than displacement (thermal strain ~ T; mechanical strain ~ grad u). Default displacement shape functions are quadratic serendipity. Plan: P2 displacement, P1 temperature on the same mesh. | [S1], [S9] |
| 4 | Thermal stress in packaging is a one-way, quasi-static chain: the Thermal Stress interface sets structural transient behaviour to quasi-static. Thermoelastic damping (reverse coupling) is only active with inertial terms. A segregated solve (thermal then mechanical) converges to the fully coupled answer when it applies, with much less memory. | [S3], [S4], [S6] |
| 5 | COMSOL default linear solver for 3D structural mechanics is direct (PARDISO); the offered iterative alternative is GMRES preconditioned by GMG for quadratic elements and SA-AMG for linear elements; SOR Line smoothing helps slender (thin, layered) geometry; iterative solvers are sensitive to mesh quality. | [S8] |
| 6 | Free warpage bodies need rigid-body-mode suppression that adds no reaction forces for self-equilibrated loads (3 non-collinear points, 6 DOF in 3D); it must not be combined with other constraints. Literature models use quarter symmetry plus one z-fixed point. | [S11], [S22] |
| 7 | Process sequence = material activation with stress-free activation: at activation the elastic strain is removed (inelastic strain kept), inactive material keeps stiffness scaled by 1e-5 (default; too low ill-conditions K). COMSOL's own layered-plate example: stress-free at 800 C, cool to 150 C, activate a stress-free carrier, cool to 20 C. | [S18], [S19] |
| 8 | Ansys trace mapping (the industry ECAD-to-mechanics path) maps per-layer metal fraction through a regular grid (default 200 x 200; cell <= min trace width; FE mesh < 4 x cell), then assigns black/white or averaged properties; orthotropic conductivity is computed from a per-element thermal resistance network; Ansys calls averaged stress results qualitative and points to submodeling. | [S20] |
| 9 | ROM homogenization is not good enough for laminate stiffness: for a coreless substrate, ROM/analytical in-plane E was -23.2% vs detailed FEA, while trace-mapped FEA RVE (9 orthotropic constants) was +0.9%. Bump + underfill layers are routinely replaced by equivalent orthotropic layers. | [S22], [S23] |
| 10 | Elastic EMC overpredicts wafer warpage strongly: multi-die FOWLP after molding, elastic FEA 2.247 mm, viscoelastic (25-term Prony, WLF) 1.473 mm, measured 0.887 mm. Viscoelastic EMC is needed for absolute warpage; elastic is acceptable only for trends. | [S23] |
| 11 | EM: frequency-domain curl-curl E with second-order edge (Nedelec) elements is the default; at least 5 second-order elements per local wavelength (about 10 linear), rarely more than 10; tetrahedra preferred over hexes (lower dispersion), hex/prism suited to PML; mesh at the highest frequency of a sweep. | [S32], [S33] |
| 12 | PML: polynomial stretching (default) or rational; scaling factor and curvature default 1; guidance (COMSOL Acoustics, transferable inference) at least 8 mesh layers for polynomial, 5-6 for rational; regular, not too thin elements. Second-order SBC is a cheaper fallback (about 10% reflection near 75 deg incidence). | [S30], [S31] |
| 13 | Conductors: IBC when characteristic size >> skin depth (no interior mesh, gives loss); TBC for thin films (any delta/t, valid if t < curvature radius); mesh the metal only when size ~ delta. Roughness on IBC/TBC: Hammerstad-Jensen or Huray "snowball". | [S34] |
| 14 | Ports: lumped (gap) port only for TEM gaps much smaller than the wavelength; numeric (wave) port needs a prior 2D boundary mode solve; HFSS 3D Layout wave ports are PEC-backed, sized by extent factors, can reference two planes (needed for stripline: "Don't use gap ports for stripline"), and can be de-embedded. | [S35], [S41] |
| 15 | Regional EM (HFSS 3D Layout cutout): keep only signal nets plus their reference nets, clip power nets at the cutout extents, define dielectric horizontal padding and an airbox; adaptive mesh at the highest frequency to Max Delta S (default 0.02); interpolating sweep for wideband S-parameters; COMSOL equivalent is AWE (Pade moment matching) driven by S-parameter expressions. | [S40], [S42], [S36] |

## 1. COMSOL thermo-mechanics (Heat Transfer in Solids + Solid Mechanics)

### 1.1 Coupling architecture (facts)

- Three ways to couple [S2]:
  1. Predefined "Thermal Stress, Solid" interface: adds Solid Mechanics + Heat Transfer in Solids + a Thermal Expansion
     multiphysics coupling, and adjusts physics settings for the combined analysis (recommended when coupling is known
     up front).
  2. Add both interfaces and a Thermal Expansion multiphysics coupling manually.
  3. Thermal Expansion subnode under Linear Elastic Material, pointed at the computed temperature.
- The coupling is domain level: temperature from heat transfer is a thermal load on Solid Mechanics [S3 search snippet,
  5.3 doc].
- Thermal Stress interface sets Solid Mechanics "Structural transient behavior" to Quasi static (inertia dropped);
  this changes the time stepper for time-dependent studies [S2], [S3].
- Thermal Expansion coupling settings [S4 snippet]:
  - "Volume reference temperature" Tref = temperature with zero thermal strain; default from a Common model input;
    can be user defined.
  - Thermal strain input: secant CTE (default, may be T-dependent), tangent CTE, or thermal strain as a function of T.
  - Heat sources: "Mechanical losses" (plastic work, viscous damping -> heat) and "Thermoelastic damping" (reverse
    coupling; only used with "Include inertial terms").
- Layered and thin variants exist: "Thermal Expansion, Thin Layer" and "Thermal Expansion, Layered" (layered shells),
  with the same thermal strain options and Tref concept [S5 snippet].

### 1.2 Strain decomposition and CTE definitions

- Fact [S1]: tangent alpha_t is the thermodynamic definition (dL/L0 = alpha_t dT, unique at each T); secant alpha_s is
  the COMSOL default and depends on the reference temperature at which L = L0.
- Fact [S1]: selecting tangent CTE triggers a numerical integration each time thermal strain is used, "a negative impact
  on the performance"; alternative is to precompute the integral externally and enter a secant function.
- Fact [S1]: COMSOL's built-in material CTE uses Tm = 293 K as the strain-free temperature of measured data and
  re-bases to the model Tref (variable Tempref) with an `if(abs(T-Tempref)>1e-3, ...)` guard that switches to a
  derivative form near T = Tref.
- Standard relations (consistent with [S1]; written out by me):
  - eps_th(T) = integral_{Tref}^{T} alpha_t(T') dT' = alpha_s(T) (T - Tref)
  - alpha_s(T) = (1/(T - Tref)) integral_{Tref}^{T} alpha_t dT'
  - Re-basing measured secant alpha_m (strain-free at Tm) to a new strain-free Tr (derived by me; algebraically equal to
    the COMSOL built-in expression quoted in [S1]):
    alpha_r(T) = alpha_m(T) + (Tr - Tm) (alpha_m(T) - alpha_m(Tr)) / (T - Tr), all divided by (1 + alpha_m(Tr) (Tr - Tm)).
- Strain decomposition (inference, standard small-strain FE practice; COMSOL docs page for the full additive split not
  fetched): eps_total = eps_el + eps_th + eps_inel (plastic, creep, viscoelastic, cure shrinkage as an extra eigenstrain);
  sigma = C : eps_el. Activation removes eps_el only [S18].

### 1.3 Element orders (facts)

| Field | COMSOL default | Source |
|---|---|---|
| Displacement (Solid Mechanics) | Quadratic serendipity (older versions: quadratic Lagrange) | [S9 snippet] |
| Temperature (Heat Transfer in Solids, standalone) | Quadratic Lagrange (5.4 to 6.4) | [S10 snippet] |
| Temperature when it drives thermal strain | Recommended one order lower than displacement | [S1] |
| Electric field (EM Waves, Frequency Domain) | Second order (curl elements); first and third "of more academic interest" | [S33] |

- Not verified: whether the predefined Thermal Stress interface automatically lowers temperature to linear (the 6.2
  Thermal Stress page lists only the quasi-static change [S3]).

### 1.4 Studies, segregation and solvers (facts)

- Fully coupled = Newton on all fields, non-symmetric Jacobian, often needs a direct solver, memory intensive; needed
  for very strong interactions. Segregated = solve each physics in turn with latest other fields; converges to the
  same answer when applicable, more outer iterations, each cheaper; built-in multiphysics interfaces ship default
  sequences; example order voltage -> temperature -> displacement (busbar with sigma(T), E(T), alpha(T - T0)) [S6].
- Direct solvers available: MUMPS, PARDISO (typically fastest), SPOOLES (slowest, least memory); MUMPS/PARDISO can go
  out of core; iterative default relative tolerance 1e-3; oscillating convergence usually signals an under-constrained
  model [S7].
- Structural defaults [S8]:
  - Direct: MUMPS in 2D, PARDISO in 3D.
  - Iterative alternative (3D stationary / time / frequency): GMRES + GMG for quadratic or higher displacement order;
    switches to SA-AMG for linear displacement (avoids remeshing to build coarse levels; solver sequence must be
    regenerated after changing order).
  - GMG default smoother SOR; "SOR Line" pre/post smoother better for slender geometries.
  - Iterative solvers "might not converge if the mesh quality is low".
- Heat transfer default solver: not verified in this pass.

### 1.5 Boundary conditions for free warpage

- Rigid Motion Suppression [S11 snippet]: adds the constraints needed to remove rigid body modes "so that there will be
  no reaction forces if the external loads are self-equilibrating"; default contributing points = Automatic (all points
  of the domain, 6.x); "From selection" needs >= 3 points in 3D; one node per disconnected body; must not be combined
  with Prescribed Displacement, Roller, or Symmetry. Theory: 3 non-collinear points, 6 DOF, rotations constrained via
  point placement and direction.
- Symmetry/roller: literature practice (Ansys) is quarter model, normal displacement fixed on the symmetry planes, plus
  the bottom node on the symmetry-plane intersection fixed in z [S22].

### 1.6 Thin and layered features

| Feature | Physics | What it does | Source |
|---|---|---|---|
| Linear Elastic Material, Layered (formerly Layered Linear Elastic Material) | Shell only (not Plate) | Layered shell; arbitrary layers need Composite Materials Module; layers defined by Layered Material + Link/Stack (offset, local coordinates) | [S12 snippet] |
| Thin Layer (Solid Mechanics) | Solid, boundary | Supersedes Thin Elastic Layer from 6.2 ("more general"); multilayer support listed in Composite Materials Module | [S13], [S12 snippet] |
| Thin Elastic Layer | Solid, interior boundary or pair | Elastic + damping springs between parts; cannot be added from 6.2 | [S13] |
| Thin Layer (Heat Transfer) | Boundary | Layer types: Thermally thick (only through-thickness flux; poor conductor, e.g. TIM/glue); Thermally thin (tangential conduction; good conductor, e.g. Cu traces); General (both; multiple sublayers, sources per sublayer; 5.3 doc: up to five sublayers) | [S14 snippet] |
| Heat Transfer in Shells | Shell | Same layer settings as the Thin Layer node | [S14 snippet] |

- Inference: for packages built by layer extrusion, thin films (passivation, IMC, TIM bond line, seed layers) are
  better handled as Thin Layer boundary features than as 1-um-thick 3D domains that blow up element counts and aspect
  ratios. Thermally thick = series contact resistance (ds/k); thermally thin = in-plane sheet conductance (k ds).

### 1.7 Contact (facts, for later lid/stiffener/socket models)

- Methods: Penalty (default), Penalty dynamic, Augmented Lagrangian (+ dynamic), Nitsche; pairs are asymmetric
  (destination may not penetrate source); augmented Lagrangian more accurate, more expensive; Nitsche default formulation
  "Incomplete" (6.2+); default penalty factor E_char / h_min; too high penalty ill-conditions [S15 snippet].

### 1.8 Inelastic material models

- Viscoelasticity [S16 snippet]: Generalized Maxwell branches (G_m, tau_m); thermorheologically simple shift
  tau -> a_T(T) tau_m; shift functions None (default), WLF, Arrhenius, Tool-Narayanaswamy-Moynihan (6.0+), user defined;
  WLF defaults Tref 293.15 K, C1 17.44, C2 51.6 K; WLF uses log10, invalid below T0 - C2; T0 usually Tg.
- Viscoplasticity (Anand) for solder [S17]: COMSOL gallery model 4488 "Viscoplastic Creep in Solder Joints": two chips
  on a Cu/FR4 board with 60Sn40Pb balls; nine Anand parameters from literature (e.g. A = 1.49e7 1/s, Q/R = 10830 K);
  heat source 5e7 W/m3 for 4 h, initial 20 C; plastic flow after about 40 s.
- Cure shrinkage: no COMSOL-specific feature verified in this pass. Literature applies it as a volumetric eigenstrain:
  0.09% volumetric gel-to-full-cure, linear strain = 1/3 of volumetric [S22].

### 1.9 Activation / element birth-death for process sequences (facts)

- Activation subnode under Linear Elastic Material (Solid Mechanics, Membrane) [S18]:
  - Boolean activation expression evaluated per Gauss point; wrap in `centroid()` for whole elements.
  - Material is not added; stiffness and density of inactive material are scaled by the activation scale factor
    (default 1e-5; too low -> ill-conditioned stiffness).
  - At each activation the elastic strain is removed (stress-free activation); inelastic strains (plastic) are not
    removed; external stresses are never removed. Variables `isactive`, `wasactive` allow latching.
  - Blog comment: activation changed stress but not temperature results (thermal activation is separate).
- Worked example [S19]: "Thermal Stresses in a Layered Plate" (Application ID 273): coating + substrate stress-free at
  800 C, cooled to 150 C; carrier added stress-free via Activation and assembly cooled to 20 C; 2D plane strain; Rigid
  Motion Suppression. Result: carrier in tension, adjacent substrate in compression (higher carrier CTE).
- Ansys equivalent: element death/birth (EKILL/EALIVE) used in package process simulation [S22]; detailed
  per-step mechanics of death-birth not described in that paper.

## 2. Package-industry practice: warpage and thermal

### 2.1 Homogenization of RDL, substrate and interconnect layers

- Ansys Mechanical trace mapping [S20] (facts):
  - Inputs: Ansys EDB, ODB++, IPC-2581 (search snippet, same help set).
  - Two-stage mapping: ECAD metal -> regular grid (default 200 x 200) -> target mesh; grid cell <= minimum trace width;
    mechanical mesh size < 4 x grid cell.
  - Material modes: Black/White (metal fraction >= 0.5 -> metal); Averaged (k_x, k_y, k_z, c_p; E_x/y/z, nu, CTE,
    density from metal fraction; mixing rule not named); Directional (orthotropic k from a per-element thermal
    resistance network) vs Nondirectional (default, averaged k).
  - T-dependent properties evaluated at the union of temperature points, then averaged.
  - Solid: one body per layer; Shell: all layers in one layered shell (SOLSH190 solid-shell available).
  - Nonlinear materials unsupported in Averaged mode; stress results "may deviate from full fidelity"; use submodeling
    for accurate local stress.
- Cheng, Tai, Liu 2021 (flip-chip PoP) [S22] (facts):
  - Coreless substrate and interposer homogenized as orthotropic media: trace mapping onto a uniform fine first-order
    brick background mesh, per-element isotropic properties from Cu vs prepreg/solder-mask volume fraction (ROM), then
    load-case FEA on the mapped block to extract nine orthotropic constants (remaining Poisson ratios from symmetry).
  - In-plane E at 25 C: detailed FEA 40,317 MPa; TM/FEA 40,690 MPa (+0.9%); ROM/analytical 30,951 MPa (-23.2%).
- Chen et al. 2022 (multi-die FOWLP) [S23]: underfill + bump layers replaced by equivalent orthotropic properties per
  die (closed-form expressions, their Eqs. 11-18); shell elements; quarter model.
- Cadence Celsius [S24]: chip thermal models from Voltus with "layer-based metal densities" and power maps; fine-grain
  IP models merged with coarse-grain chip tiles; example: warpage of ASIC + 2 HBM + interposer + package + PCB, load
  175 C to 25 C, max interposer warpage 183 um (design-stage example, not a validation). Celsius offers static and
  quasi-static warpage/stress solvers with linear and nonlinear materials and global/local models [S25 snippet].
  Celsius homogenization formulas: not verified (white paper on cadence.com returned HTTP 403).
- TSV fields: periodic RVE homogenization with death-birth warpage evolution and building-block refinement is reported
  in literature (search snippets only; review in [S44]); not verified in detail.

### 2.2 Global-local (submodeling)

- Ansys: submodeling = "cut-boundary displacement method": coarse-model displacements on the cut boundary are applied as
  BCs to the fine submodel; place the cut far from the stress concentration (St. Venant) [S21 snippet].
- Celsius advertises global and local models for 3D-IC warpage [S25 snippet].
- Inference: same mechanism serves (a) bump/ball stress from a homogenized package model, (b) temperature boundary data
  for a detailed die-stack thermal model. Temperature must also be interpolated onto the submodel (thermal load), not
  only displacements.

### 2.3 Process-sequence modeling: stress-free temperatures per step

| Paper / model | Step and stress-free (reference) temperature | Source |
|---|---|---|
| COMSOL layered plate | coating+substrate 800 C -> 150 C; carrier activated stress-free at 150 C -> 20 C | [S19] |
| FOWLP, Chen 2022 | PI2 cure Tref 120 C -> 25 C; EMC molding Tref 125 C -> 25 C; carrier-2 bond at 180 C -> 25 C | [S23] |
| FC-PoP, Cheng 2021 | Die bond, underfill cure, interposer bond (preheat 185/145 C, top to 245 C), mold cure, ramp; EMC stress-free T = its cure temperature; 25-260 C reflow ramp evaluated | [S22] |
| Celsius example | 175 C -> 25 C | [S24] |

- Additional facts [S22]: non-uniform transient temperature from a 3D transient conduction analysis (natural
  convection + radiation) is the thermal load during bonding (not a uniform T). Max warpage about 653.7 um after
  interposer bonding vs 82.6 um at end of flow: intermediate states matter.
- Viscoelastic EMC data practice [S22], [S23]: DMA multi-frequency sweeps over 25-260 C (or 25-200 C), master curve
  by TTS, WLF shift (Cheng: a1 = 208.9, a2 = 1092.0 at Tg ~100 C; Chen: Tref 140 C, Tg 143 C), Prony series with 22 to
  25 terms spanning relaxation times from 1e-16 to 1e14 s (Cheng) or 1e-16 to 1e10 s (Chen).
- Accuracy anchors: Cheng 2021 simulated vs measured 82.6 vs 78.4 um at 30 C and 40.2 vs 42.2 um at 260 C (max diff
  about 5%) [S22]; Chen 2022 after molding elastic 2.247 mm / viscoelastic 1.473 mm / measured 0.887 mm [S23].

### 2.4 Warpage measurement and sign conventions

- Signed warpage = coplanarity with a sign; standards JEDEC JESD22-B112A and JEITA ED-7306; IPC-9641 for PCB side
  [S26].
- JEITA ED-7306 [S27 snippet; scanned PDF]: convex warpage of the top (non-interconnect) surface is plus; package sign =
  sign of (AB_max + AB_min + CD_max + CD_min) along both diagonals of the measurement zone.
- JESD22-B112 sign convention: not verified (paywalled).
- Akrometrix/Micron study [S26]: parts measured ball side, without balls, 30 C -> 260 C -> 30 C; signed warpage flips
  sign and misleads for complex shapes; proposes JEDEC Full Field Signed Warpage and "3S" with a third, indeterminate
  category.
- Paper-specific conventions differ: Chen 2022 uses "crying face is positive" with carrier on top [S23]; Cheng 2021
  reports magnitudes only [S22]. "Smile/cry" are informal; no standard definition found.
- Inference for our engine: report (a) coplanarity (max - min of out-of-plane displacement after removing rigid tilt
  by a best-fit plane), (b) signed warpage per ED-7306 diagonal rule with an explicit "viewed from" flag, (c) full-field
  map. Never report a sign without stating the convention and viewing side.

### 2.5 Thermal boundary conditions and compact models

- JESD15-3 two-resistor model: built from theta-JB and theta-JC(top) per JESD51-8 / JESD51-12; single-die, single
  junction temperature [S28]. ROHM note: 2R is simplest and least accurate; DELPHI (JESD15-4) multi-resistor network is
  more boundary-condition independent but does not support transients [S28].
- JESD51-14 transient dual interface method: R_theta-JC for packages with a single dominant heat path, from two transient
  measurements with different case-to-heatsink interface (paste vs dry) [S29].
- Inference: engine thermal BCs should include (a) fixed-T cold plate, (b) HTC (Robin) with ambient T, (c) adiabatic,
  (d) lumped heat sink (HTC + area, or 1D R-C), (e) a "virtual JEDEC fixture" preset that computes theta-JC(top) (top
  at fixed T, other faces adiabatic) and theta-JB, enabling 2R export.

## 3. EM for package SI: COMSOL RF and Ansys HFSS

### 3.1 Formulation and elements (facts)

- COMSOL EM Waves, Frequency Domain: curl-curl equation for E with mu_r, eps_r, sigma, time-harmonic; Scattered Field
  formulation splits E into background + relative field; eigenfrequency variant [S33].
- Second-order curl (Nedelec) elements default; minimum 2 elements per wavelength (Nyquist) is unacceptably inaccurate;
  at least 5 second-order elements per local wavelength in dielectric, rarely more than 10 [S32], [S33].
- Tetrahedra preferred (lower dispersion error than hex: shortest/longest line ratio sqrt(3) in a cube); hex/prism for
  PML or strongly anisotropic solutions [S33].
- Mesh for a wide band: one mesh at the highest frequency, per-frequency remeshing, or per-band meshes; do a mesh
  refinement study; skin depth in lossy media resolved with boundary layer meshes [S33].
- HFSS: geometrically conforming tetrahedral mesh, adaptively refined from an initial mesh plus "Lambda Refinement"
  seeding at the Solution Frequency (typically highest frequency of interest) until Max Delta S (all S-matrix entries,
  magnitude and phase, worst case) falls below threshold; default 0.02 "reasonable for most cases" [S40]. Forum-level
  (not verified in Ansys docs): two consecutive converged passes, 30% tetrahedra refined per pass.

### 3.2 Ports and S-parameters (facts)

| Port | Where | Notes | Source |
|---|---|---|---|
| Lumped port (Uniform, Coaxial, Multielement, User defined) | Gap between two conductors | Gap much smaller than the wavelength; field essentially TEM; S-parameters and impedance post-processed | [S35] |
| Port (Rectangular, Circular, Coaxial) | Waveguide cross section | Analytic mode shapes | [S35] |
| Numeric port | Arbitrary cross section | Requires a prior boundary mode solve (Boundary Mode Analysis step); multi-mode by stacking ports on one boundary | [S35] |
| Periodic port | Gratings / unit cells | Diffraction orders | [S35] |
| HFSS 3DL gap port (= lumped port in HFSS MCAD) | Trace edge to nearest reference plane | Auto-picks nearest ground; do not use for stripline | [S41] |
| HFSS 3DL wave port | Two or more edges | Own geometry sized by extent factors; PEC backed ("PEC cap", need not be on the outer extent); multiple terminals; references planes above and below; can be de-embedded; not with the SIwave solver | [S41] |
| HFSS 3DL gap (coax) port | BGA pad / pin | Coaxial cross section, radial extent factor; component-level automation for all bumps/balls with a common reference plane | [S41] |

- Port sweep and Touchstone export are standard in COMSOL [S33].
- Not verified in this pass: COMSOL TEM port characteristic impedance definitions for multi-conductor ports and the
  detailed de-embedding (reference-plane shift) formulas. Inference: de-embedding a wave port = multiply S_ij by
  exp(+gamma_i d_i + gamma_j d_j) using the port mode propagation constant from the 2D mode solve.

### 3.3 Open boundaries: PML vs SBC (facts)

- PML is a domain with anisotropic complex eps and mu; absorbs propagating and evanescent fields; best over widest
  angle range; costs more memory than SBC; reflections arise mainly from discretization, so mesh must follow the
  anisotropy [S30].
- First-order SBC: about 10% reflection at 60 deg; second-order SBC: about 10% near 75 deg; SBC is only exactly
  non-reflecting at normal incidence [S30].
- COMSOL PML parameters [S31 snippet]: coordinate stretching Polynomial (default), Rational, or User defined; PML
  scaling factor and curvature parameter default 1; scaling factor 1/cos(theta) for plane waves at angle theta;
  curvature parameter pushes elements toward the inner PML boundary (useful for mixed wavelengths or propagating +
  evanescent content); lowering the factor below 1 trades absorption for cheaper resolution.
- Mesh layers (from the COMSOL Acoustics Module 6.3 page; applying it to EM is my inference): >= 8 layers with
  polynomial stretching, 5-6 with rational; avoid very thin elements [S31 snippet].
- PML thickness vs wavelength and scatterer-to-PML distance: not verified (not in [S30]).
- HFSS 3D Layout cutouts use "HFSS Extents": dielectric horizontal padding plus airbox dimensions, absolute or percent
  of the dielectric polygon size [S42]. Which absorbing boundary HFSS applies at the extents by default: not verified.

### 3.4 Conductors, skin depth, roughness (facts)

- delta = sqrt(2 / (omega mu0 mu_r sigma)); compare with characteristic size L_c (volume/area or thinnest dimension)
  [S34].
- IBC when L_c >> delta: interior not meshed, loss included; accurate for smooth shapes at L_c/delta > 10, locally
  inaccurate at sharp corners; not for partially penetrated thin films [S34].
- TBC for thin conductive layers: through-thickness and tangential impedances; doubles boundary DOFs; accurate for any
  delta/t if t < curvature radius and good conductor (comment by COMSOL staff, article revised) [S34].
- Layered Impedance / Layered Transition BCs added in COMSOL 6.0/6.1 (staff comment) [S34].
- Roughness on IBC/TBC: input RMS height (IBC) or RMS thickness variation (TBC); valid when roughness > delta and <<
  L_c; Hammerstad-Jensen and Huray "snowball" models [S34].
- Numeric check (my calculation, Cu sigma = 5.8e7 S/m): delta = 2.09 um at 1 GHz, 0.66 um at 10 GHz, 0.38 um at 30 GHz.
  A 2 um RDL line is about 1 delta thick at 1 GHz: IBC invalid there; TBC or meshed interior required at the low end
  of an SI sweep; IBC acceptable for substrate Cu (10-20 um) above a few GHz.

### 3.5 Frequency sweeps (facts)

- COMSOL Adaptive Frequency Sweep = AWE: reduced-order model by moment matching, Pade (default) or Taylor; "AWE
  expression type" Physics controlled (default) or User controlled scalar expressions (typically |S21|); infinite
  gradients in the expression (perfectly matched S11 notch) slow it; relative tolerance controls convergence [S36].
- HFSS sweep types: Interpolating (wideband, no fields), Discrete (fields at every point), Fast/ALPS ("use with
  caution", narrow band) [S40]; DC point can be solved by Q3D in 3D Layout [S42].

### 3.6 EM linear solvers (facts and gaps)

- COMSOL Auxiliary-Space AMG = generalization of AMS for complex-valued RF problems on Nedelec elements [S37]; AMS
  basis is Hiptmair-Xu nodal auxiliary space preconditioning (mesh-independent, needs only Poisson solvers) [S39].
- COMSOL iterative EM settings "Analysis methodology": Robust (default), Intermediate, Fast; 100:1 dielectric contrast
  needs Robust or direct; 2D, eigenvalue and periodic problems use direct solvers (periodic switches automatically)
  [S33].
- COMSOL 3D RF default solver: not verified from official docs. A user report says the default iterative solver
  (BiCGStab + multigrid) converged with SBC but nothing converged with PML on their 3D model [S38] (user report).
- Inference: PML makes the system strongly indefinite and complex-symmetric; for cutout-size problems a sparse direct
  complex-symmetric factorization is the robust baseline.

### 3.7 Regional modeling (HFSS 3D Layout cutout) (facts)

- Workflow [S42]: draw a region polygon on a user layer; Cutout Subdesign with Include = signal nets
  (RXDATA3+/-, RXDATA4+/-) and reference nets (VDD, VSS), "Clip at extents" for VDD/VSS; add solder balls and bumps;
  create ports on component (BGA) per net; define HFSS Extents; setup: 2.5 GHz single adaptive frequency, max 20
  passes, Max Delta S 0.02; interpolating linear-step sweep from 0 GHz with Q3D DC point.
- Ports in 3D Layout auto-find the nearest reference plane [S41].

## 4. COMSOL UI concepts relevant to 3D packaging (short)

- Model Builder concepts used above (facts): physics interfaces with default nodes; multiphysics coupling nodes with
  coupled-interface selectors [S3]; hidden "Discretization" section revealed through "Show More Options" ->
  "Advanced Physics Options" [S10 snippet]; study steps (Stationary, Time Dependent, Frequency Domain, Boundary Mode
  Analysis, Adaptive Frequency Sweep) [S33], [S35], [S36]; solver sequences with direct and suggested iterative
  alternatives that are disabled by default (Acoustics example) [S8].
- Selections by entity level (domain / boundary / edge / point) appear throughout the feature pages, e.g. Rigid Motion
  Suppression point selection [S11]; Thin Layer as boundary features [S13], [S14].
- Results (facts): `isactive`-based Filter to show only active material [S18]; mesh statistics with element quality
  0..1 (default skewness; alternatives max angle, volume vs circumradius, volume vs length, condition number, growth
  rate; curved skewness for higher-order geometry) and a quality histogram [S43].
- Not verified in this pass (official pages not fetched): Deformation attribute auto scale factor, von Mises /
  principal stress default plots, slice / isosurface / arrow / clip plane features, Smith plot. They are commonly known
  COMSOL features; the UI/UX report should verify before quoting.

## Implications for our engine (recommendations; inference unless cited)

### A. Thermal

- Formulation: steady -div(k grad T) = Q with k(T) (orthotropic tensor per domain, homogenized layers); Picard
  iteration on k(T) (COMSOL busbar shows T-dependent properties are the norm [S6]); transient optional via backward
  Euler / BDF2.
- Elements: P1 tetrahedra/prisms when feeding mechanics ([S1] rule); P2 only for standalone thermal accuracy studies.
- BCs: fixed T, HTC (Robin), heat flux, adiabatic, lumped heat-sink R; thin features as boundary Thin Layer:
  thermally thick (R = t/k, TIM, bond line, die attach), thermally thin (sheet k t, Cu planes) [S14].
- Outputs: T field, max T_j per die, gradients, theta-JC(top)/theta-JB virtual fixtures, 2R export [S28], [S29].
- Solver: PCG + SA-AMG (SPD system); sparse Cholesky for small models. Reuse the sibling engine's sparse
  LDL^T (`eo-modulator-atlas/engine/src/ldlt.mjs`, up-looking, reusable symbolic analysis, complex-symmetric variant)
  as the direct baseline.

### B. Thermo-mechanics

- Formulation: small-strain linear elasticity, sigma = C : (eps - eps_th - eps_0), eps_th = alpha_s(T)(T - Tref_d) per
  domain d, eps_0 = per-domain eigenstrain (cure shrinkage, activation offset). One-way, segregated: thermal -> mechanics
  [S3], [S6].
- CTE handling: store secant curves with their own strain-free temperature Tm; re-base to Tref by the closed form in
  1.2; convert tangent data once at material load (avoid per-evaluation integration [S1]); record Tm in the materials
  library schema (it is a property of the dataset, not of the model).
- Elements: P2 displacement (10-node tets; 15-node prisms or 20-node serendipity hexes on extruded layered meshes),
  P1 temperature interpolated at Gauss points [S1], [S9]. Prism/hex extrusion fits package stacks (thin, wide layers);
  use several elements through thin layers or a solid-shell treatment. Avoid P1 tets for bending-dominated warpage
  (shear locking; standard FE knowledge, not from the cited sources).
- Rigid modes: default "free warpage" BC = 3-2-1 point constraints with zero reactions (COMSOL Rigid Motion
  Suppression semantics [S11]); options: quarter/half symmetry + one z point [S22], simply supported on a ring/corners,
  three-point support, bonded-to-board. Warpage post-processing removes the best-fit plane before computing
  coplanarity (inference).
- Solver: direct sparse Cholesky up to the memory limit; above that PCG + SA-AMG with the 6 rigid-body near-null-space
  vectors (COMSOL uses SA-AMG for linear elements and GMG for quadratic [S8]; inference: p-multigrid P2 -> P1 then
  SA-AMG gives the GMG-like path without remeshing). Line/plane smoothers or semi-coarsening for thin layered
  geometry ([S8] SOR Line hint).
- Process sequence (core feature): a `process_steps` list; each step = {activate domains, stress-free temperature of
  newly active domains, temperature field (uniform or from a thermal solve), BC set, optional removals (carrier
  debond, grinding)}. Implement COMSOL-style stress-free activation [S18]: on activation store the current total strain
  of the new domain as its eigenstrain offset (so eps_el = 0); for linear elasticity this is exact superposition. For
  inactive domains prefer removing DOFs from the system over 1e-5 stiffness scaling (avoids ill-conditioning [S18];
  scaling acceptable as a fallback). Validate against COMSOL model 273 (800 C -> 150 C -> carrier -> 20 C) [S19] and
  Stoney-type bilayer closed forms.
- Materials roadmap: phase 1 linear elastic, T-dependent E(T), alpha(T), EMC with two CTEs about Tg [S23];
  phase 2 viscoelastic EMC/underfill/PI (Prony + WLF, recursive Maxwell-branch update per time step) because elastic
  EMC can overpredict warpage by about 2.5x vs measured [S23]; phase 3 Anand solder for bump/ball submodels [S17];
  cure shrinkage as volumetric eigenstrain [S22].
- Outputs: displacement (with deformation scale), warpage map, coplanarity, signed warpage with explicit convention
  (ED-7306 rule [S27]), von Mises, principal stresses, interface normal/shear stress at die corners, Tref per step.

### C. Homogenization strategy

- Layer-level metal-fraction maps on a regular grid (Ansys-like: cell <= min feature, mesh <= 4 cells [S20]); per layer
  options: black/white, averaged, orthotropic.
- Thermal k: in-plane parallel / through-plane series bounds as a quick estimate; orthotropic from a per-cell resistance
  network (Ansys Directional [S20]) as the default.
- Mechanics: do not rely on ROM for laminate/RDL stiffness (-23% error [S22]); compute 9 orthotropic constants and CTE
  by our own RVE solves (unit cell, 6 load cases + 1 thermal case, periodic or kinematic BCs) cached per
  (layer, pattern, T). Same machinery for bump + underfill, TSV fields and hybrid-bond layers [S23], [S44].
- Global-local: cut-boundary displacement (and temperature) interpolation onto detailed submodels for bumps, TSVs,
  die corners [S21], [S20].

### D. EM (regional SI)

- Formulation: curl (mu_r^-1 curl E) - k0^2 eps_r,c E = -j k0 Z0 J, second-order Nedelec on tetrahedra (prisms in PML
  and thin dielectrics allowed), complex eps from tan delta; mesh h <= lambda_local/5 at f_max [S32], [S33]; adaptive
  refinement loop on Max |Delta S| < 0.02 between passes at f_max [S40].
- Region: HFSS-style cutout: signal nets + reference nets, power nets clipped at extents, dielectric padding, air
  above/below [S42]; boundary: PML (polynomial, >= 8 layers, or rational 5-6 [S31]) on air faces; laterally either PML
  in the dielectric stack or PEC/PMC walls when the stack is reference-plane bounded (inference); second-order SBC as
  a low-memory option [S30].
- Ports: (1) lumped/gap ports for bumps, balls, short TEM gaps [S35], [S41]; (2) wave ports with a 2D mode solve on the
  port face, PEC-backed, extent-factor sizing, multi-terminal for differential pairs, two-plane referencing for
  stripline [S41]. Reuse the sibling engine's 2D vector mode solver (`eo-modulator-atlas/engine/src/vector-mode.mjs`,
  Nedelec/Lagrange order 2) for port modes (inference: requires adapting to closed RF port geometry and complex eps).
  De-embedding by port propagation constant (inference).
- Conductors: per-conductor policy chosen by t/delta at each frequency: TBC (default for RDL and thin lines, valid at
  any t/delta [S34]); IBC for thick Cu at high f (L_c/delta > 10 [S34]); meshed interior otherwise; roughness
  Hammerstad-Jensen / Huray on IBC/TBC [S34]; PEC only for early prototyping.
- Sweep: adaptive rational (AWE/Pade-like) interpolation of S(f) with error check on |S21| and |S11| [S36]; discrete
  points for field plots [S40].
- Solver: sparse direct complex-symmetric LDL^T as baseline (PML + iterative is fragile [S38]; COMSOL uses direct for
  periodic and eigen problems [S33]); iterative GMRES + AMS (Hiptmair-Xu [S39], COMSOL Auxiliary-space AMG [S37]) as
  the scale-out path, likely needing a shifted or absorbing preconditioner when PML is present (inference).
- Outputs: S-parameters (IL, RL, NEXT/FEXT for multi-port), Touchstone export, port impedance, field magnitude slices,
  port mode plots.

### E. Workflow/UI implications (short)

- Physics-node defaults per study (COMSOL Model Builder pattern): each physics node carries its own discretization
  order and suggested solver; multiphysics coupling node holds Tref and coupling options [S3], [S4].
- Process steps as first-class tree nodes with per-step activation and Tref; results filtered by `isactive` [S18].
- Mesh-quality panel with skewness histogram, min/avg quality, DOF count [S43].

## Gaps and items not verified

- COMSOL default solver for 3D Heat Transfer and for 3D RF Frequency Domain (official pages not fetched).
- Whether Thermal Stress, Solid automatically sets temperature to linear.
- PML thickness / distance guidance for EM in COMSOL docs; HFSS default boundary at 3D Layout extents.
- JESD22-B112 sign convention; JEITA ED-7306 confirmed only from search-extracted text.
- Cadence Celsius homogenization formulas (cadence.com white paper returned HTTP 403); Siemens (Simcenter Flotherm /
  Xpedition) methods not researched in this pass.
- COMSOL results-UI specifics (deformation scale, Smith plot) not verified from official pages.

## Sources (all retrieved 2026-10-20)

- [S1] COMSOL 5.4 Structural Mechanics User's Guide, "Thermal Expansion" (secant/tangent CTE, Tref, performance, element
  order advice): https://doc.comsol.com/5.4/doc/com.comsol.help.sme/sme_ug_modeling.05.115.html ; 6.3 version (same
  topic, page timed out, confirmed by search snippet): https://doc.comsol.com/6.3/doc/com.comsol.help.sme/sme_ug_modeling.05.165.html
- [S2] COMSOL 6.4 Structural Mechanics, "Modeling Thermal Expansion":
  https://doc.comsol.com/6.4/doc/com.comsol.help.sme/sme_introduction.02.32.html
- [S3] COMSOL 6.2 Structural Mechanics, "The Thermal Stress Interface":
  https://doc.comsol.com/6.2/doc/com.comsol.help.sme/sme_ug_multiphysics.18.02.html ; 5.3 version:
  https://doc.comsol.com/5.3/doc/com.comsol.help.sme/sme_ug_multiphysics.13.02.html
- [S4] COMSOL 6.4 Structural Mechanics, "Multiphysics Couplings" (snippet):
  https://doc.comsol.com/6.4/doc/com.comsol.help.sme/sme_ug_multiphysics.20.59.html ; 6.3:
  https://doc.comsol.com/6.3/doc/com.comsol.help.sme/sme_ug_multiphysics.18.50.html
- [S5] COMSOL 6.4 "Thermal Expansion, Thin Layer" and "Thermal Expansion, Layered" (snippet):
  https://doc.comsol.com/6.4/doc/com.comsol.help.sme/sme_ug_multiphysics.20.60.html ;
  https://doc.comsol.com/6.4/doc/com.comsol.help.sme/sme_ug_multiphysics.20.61.html
- [S6] COMSOL Blog, "Solving Multiphysics Problems": https://www.comsol.com/blogs/solving-multiphysics-problems
- [S7] COMSOL Blog, "Solutions to Linear Systems of Equations: Direct and Iterative Solvers":
  https://www.comsol.com/blogs/solutions-linear-systems-equations-direct-iterative-solvers
- [S8] COMSOL 6.3 Structural Mechanics, "Selecting Iterative Solvers":
  https://doc.comsol.com/6.3/doc/com.comsol.help.sme/sme_ug_modeling.05.208.html ; 6.4 (timed out):
  https://doc.comsol.com/6.4/doc/com.comsol.help.sme/sme_ug_modeling.05.216.html
- [S9] COMSOL 6.4 Reference Manual, "The Solid Mechanics Interface" (discretization default, snippet):
  https://doc.comsol.com/6.4/doc/com.comsol.help.comsol/comsol_ref_structuralmechanics.31.02.html
- [S10] COMSOL 6.4 Reference Manual, "The Heat Transfer in Solids Interface" (discretization default, snippet):
  https://doc.comsol.com/6.4/doc/com.comsol.help.comsol/comsol_ref_heattransfer.30.10.html
- [S11] COMSOL 6.4 Structural Mechanics, "Rigid Motion Suppression" (snippet):
  https://doc.comsol.com/6.4/doc/com.comsol.help.sme/sme_ug_solid.07.069.html ; theory (6.0):
  https://doc.comsol.com/6.0/doc/com.comsol.help.sme/sme_ug_theory.06.64.html
- [S12] COMSOL 6.4 "Linear Elastic Material, Layered" (snippet):
  https://doc.comsol.com/6.4/doc/com.comsol.help.sme/sme_ug_shell_plate.09.08.html ; Composite Materials Module
  User's Guide 6.4: https://doc.comsol.com/6.4/doc/com.comsol.help.compmat/CompositeMaterialsModuleUsersGuide.pdf
- [S13] COMSOL 6.4 Structural Mechanics, "Thin Elastic Layer" (deprecated from 6.2, superseded by Thin Layer):
  https://doc.comsol.com/6.4/doc/com.comsol.help.sme/sme_ug_solid.07.093.html
- [S14] COMSOL Heat Transfer Module, "Thin Layer" theory 6.4 (snippet):
  https://doc.comsol.com/6.4/doc/com.comsol.help.heat/heat_ug_theory.07.031.html ; features 5.3:
  https://doc.comsol.com/5.3/doc/com.comsol.help.heat/heat_ug_ht_features.09.65.html ; Thin Layer / Heat Transfer in
  Shells 6.4: https://doc.comsol.com/6.4/doc/com.comsol.help.heat/heat_ug_ht_features.09.103.html
- [S15] COMSOL 6.3 "Setting Up a Contact Problem" and 6.4 contact node (snippet):
  https://doc.comsol.com/6.3/doc/com.comsol.help.sme/sme_ug_modeling.05.143.html ;
  https://doc.comsol.com/6.4/doc/com.comsol.help.sme/sme_ug_solid.07.124.html
- [S16] COMSOL 6.1 Viscoelasticity node (snippet): https://doc.comsol.com/6.1/doc/com.comsol.help.sme/sme_ug_solid.07.016.html ;
  Viscoelastic Tube model 6.4: https://doc.comsol.com/6.4/doc/com.comsol.help.models.sme.viscoelastic_tube/viscoelastic_tube.html
- [S17] COMSOL Application Gallery 4488, "Viscoplastic Creep in Solder Joints":
  https://www.comsol.com/model/viscoplastic-creep-in-solder-joints-4488 ; doc 6.4:
  https://doc.comsol.com/6.4/doc/com.comsol.help.models.nsm.viscoplastic_solder_joints/viscoplastic_solder_joints.html
- [S18] COMSOL 6.3 "Activating and Deactivating Material" (snippet):
  https://doc.comsol.com/6.3/doc/com.comsol.help.sme/sme_ug_modeling.05.157.html ; COMSOL Blog (M. Danielsson,
  2018-11-07), "How to Activate Material in Simulations of Manufacturing Processes": https://www.comsol.com/blogs?p=286151
- [S19] COMSOL Application Gallery 273, "Thermal Stresses in a Layered Plate" (snippet):
  https://www.comsol.com/model/thermal-stresses-in-a-layered-plate-273 ; doc 6.4:
  https://doc.comsol.com/6.4/doc/com.comsol.help.models.sme.layered_plate/layered_plate.html
- [S20] Ansys Mechanical help v261, "Trace Mapping in Mechanical":
  https://ansyshelp.ansys.com/public/Views/Secured/corp/v261/en/wb_sim/ds_trace_mapping.html ; "ECAD Analysis using
  Trace Mapping": https://ansyshelp.ansys.com/public/views/secured/corp/v261/en/wb_sim/ds_trace.html
- [S21] Ansys MAPDL help v261, "Understanding Submodeling" (snippet):
  https://ansyshelp.ansys.com/public/Views/Secured/corp/v261/en/ans_adv/Hlp_G_ADV4UN.html
- [S22] H.-C. Cheng, L.-C. Tai, Y.-C. Liu, "Theoretical and Experimental Investigation of Warpage Evolution of Flip Chip
  Package on Packaging during Fabrication", Materials 14(17):4816 (2021), doi:10.3390/ma14174816:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC8432544/
- [S23] C. Chen, M. Su, R. Ma, Y. Zhou, J. Li, L. Cao, "Investigation of Warpage for Multi-Die Fan-Out Wafer-Level
  Packaging Process", Materials 15(5):1683 (2022), doi:10.3390/ma15051683: https://pmc.ncbi.nlm.nih.gov/articles/PMC8911451/
- [S24] Cadence / EMA, "Thermal and Stress Analysis of 3D-ICs with Celsius Thermal Solver" (white paper PDF, uploaded
  2025-03): https://ema-eda.com/wp-content/uploads/2025/03/Thermal-and-Stress-Analysis-of-3D-ICs-with-.pdf
- [S25] Cadence Celsius Studio product page (snippet): https://www.cadence.com/ja_JP/home/tools/system-analysis/thermal-solutions.html ;
  white paper "Thermal Warpage Simulation of a Temperature-Dependent Linear Elastic Material Package" (HTTP 403, not read):
  https://www.cadence.com/zh_TW/home/resources/white-papers/thermal-warpage-simulation-of-a-temperature-wp.html
- [S26] N. Hubble (Akrometrix), J. Young, K. Hartnett (Micron), "Surface Mount Signed Warpage Case Study; New Methods for
  Characterizing 3D Shapes Through Reflow Temperatures" (IPC paper PDF): https://www.circuitnet.com/pdf/surface_mount_signed_warpage_ipc.pdf
- [S27] JEITA ED-7306 (scanned PDF; sign rule from search-extracted text only): https://home.jeita.or.jp/tsc/std-pdf/ED-7306_E.pdf
- [S28] JEDEC JESD15-3 two-resistor compact model: https://www.jedec.org/standards-documents/docs/jesd-15-3 ; ROHM
  application note, "Two-Resistor Model for Thermal Simulation":
  https://fscdn.rohm.com/en/products/databook/applinote/common/two_resistor_model_for_thermal_simulation-e.pdf
- [S29] JEDEC JESD51-14: https://www.jedec.org/standards-documents/docs/jesd51-14-0 ; Electronics Cooling (2024-04),
  "The applicability of JESD51-14 ...": https://www.electronics-cooling.com/2024/04/the-applicability-of-jesd51-14-for-the-determination-of-junction-to-case-thermal-resistance/ ;
  Electronics Cooling (2011-04), "New thermal testing standard": https://www.electronics-cooling.com/2011/04/new-thermal-testing-standard/
- [S30] COMSOL Blog (W. Frei, 2015-01-28), "Using Perfectly Matched Layers and Scattering Boundary Conditions for Wave
  Electromagnetics Problems": https://www.comsol.com/blogs/using-perfectly-matched-layers-and-scattering-boundary-conditions-for-wave-electromagnetics-problems
- [S31] COMSOL 6.4 Reference Manual, "Perfectly Matched Layer" (snippet):
  https://doc.comsol.com/6.4/doc/com.comsol.help.comsol/comsol_ref_definitions.21.139.html ; COMSOL 6.3 Acoustics
  Module, "Perfectly Matched Layers (PMLs)" (mesh layer counts, snippet):
  https://doc.comsol.com/6.3/doc/com.comsol.help.aco/aco_ug_pressure.05.139.html
- [S32] COMSOL Knowledge Base 1118 (mesh resolution for wave problems, snippet): https://www.comsol.com/support/knowledgebase/1118 ;
  RF Module 6.4 "Meshing and Solving" (timed out): https://doc.comsol.com/6.4/doc/com.comsol.help.rf/rf_ug_modeling.05.08.html
- [S33] COMSOL Blog, "Simulation Tools for Solving Wave Electromagnetics Problems":
  https://www.comsol.com/blogs/simulation-tools-for-solving-wave-electromagnetics-problems
- [S34] COMSOL Blog, "Modeling Metallic Objects in Wave Electromagnetics Problems":
  https://www.comsol.com/blogs/modeling-metallic-objects-in-wave-electromagnetics-problems
- [S35] COMSOL Blog, "Ports and Lumped Ports for Wave Electromagnetics Problems":
  https://www.comsol.com/blogs/ports-and-lumped-ports-for-wave-electromagnetics-problems ; "Your Guide to Lumped Ports
  in the RF Module" (snippet): https://www.comsol.com/blogs/your-guide-to-lumped-ports-in-the-rf-module
- [S36] COMSOL 6.4 Reference Manual, "Adaptive Frequency Sweep" (snippet):
  https://doc.comsol.com/6.4/doc/com.comsol.help.comsol/comsol_ref_solver.36.036.html ; COMSOL Blog, "Methods That
  Accelerate the Modeling of Bandpass-Filter-Type Devices" (snippet):
  https://www.comsol.com/blogs/methods-that-accelerate-the-modeling-of-bandpass-filter-type-devices
- [S37] COMSOL 6.4 Reference Manual, "Auxiliary-Space AMG" (snippet):
  https://doc.comsol.com/6.4/doc/com.comsol.help.comsol/comsol_ref_solver.36.167.html
- [S38] COMSOL forum (user report), "Iterative Solvers for 3D Electromagnetic Waves Problems with PMLs":
  https://comsol.com/forum/thread/256161/Iterative-Solvers-for-3D-Electromagnetic-Waves-Problems-with-PMLs
- [S39] R. Hiptmair, J. Xu, "Nodal Auxiliary Space Preconditioning in H(curl) and H(div) Spaces", SIAM J. Numer. Anal.
  45(6):2483-2509 (2007), doi:10.1137/060660588: https://epubs.siam.org/doi/abs/10.1137/060660588
- [S40] Ansys, "HFSS Getting Started, Lecture 3: HFSS FEM Solution Setup" (2020 R2 training PDF):
  https://innovationspace.ansys.com/courses/wp-content/uploads/2021/07/HFSS_GS_2020R2_EN_LE3_FEM_MeshSoln.pdf
- [S41] Ansys, "HFSS 3D Layout Getting Started, Module 4: Ports" (2019 R3 training PDF):
  https://innovationspace.ansys.com/courses/wp-content/uploads/sites/5/2021/07/HFSS_3DLGS_2019R3_EN_LE04_Ports-1.pdf
- [S42] Ansys, "HFSS 3D Layout Getting Started, Workshop 4.1: BGA" (2019 R3 training PDF):
  https://innovationspace.ansys.com/courses/wp-content/uploads/2021/07/HFSS_3DLGS_2019R3_EN_WS4.1_BGA-1.pdf
- [S43] COMSOL 6.4 Reference Manual, "Mesh Element Quality" and "Mesh Statistics" (snippet):
  https://doc.comsol.com/6.4/doc/com.comsol.help.comsol/comsol_ref_mesh.24.24.html ;
  https://doc.comsol.com/6.4/doc/com.comsol.help.comsol/comsol_ref_mesh.24.25.html
- [S44] MDPI Coatings 13(2):318 (homogenization methods review incl. TSV-stack submodeling; snippet only):
  https://www.mdpi.com/2079-6412/13/2/318
