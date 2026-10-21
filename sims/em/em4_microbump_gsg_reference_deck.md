# EM-4 reduced: reference deck description (for lane L5 desktop cross-check)

Case: `sims/em/em4_microbump_gsg.yaml` (family `em3d`, browser solver `engine/src/em3d`). This file describes the same
problem in solver-neutral terms so a desktop reference (AWS Palace, openEMS, or scikit-fem/NGSolve) can be built
without reading the engine code. All lengths in um; origin at the signal bump axis, z = 0 at the interposer ground.

## Geometry (all conductors PEC in the base case)

| Item | Shape | x | y | z | Source |
|---|---|---|---|---|---|
| Domain (closed box) | box | -80 .. 80 | -70 .. 70 | 0 .. 44 | template |
| Interposer oxide | box | full | full | 0 .. 6 | template thickness; Dk/Df row below |
| Die oxide (flipped die) | box | full | full | 38 .. 44 | template |
| Underfill | everything else inside the box | | | 6 .. 38 | |
| Interposer signal line | box | -80 .. 0 | -5 .. 5 | 6 .. 8 | template (w 10, t 2) |
| Die signal line | box | 0 .. 80 | -5 .. 5 | 36 .. 38 | template |
| Interposer signal pad | box | -13.5 .. 13.5 | -13.5 .. 13.5 | 6 .. 11 | 27 x 27 x 5 um pad, ectc51909.2023.00155-a-i1 (analog) |
| Signal bump | cylinder, axis z, r 11 | centre (0, 0) | | 11 .. 33 | d 22 um, 15 + 7 um standoff, same analog row |
| Die signal pad | box | -13.5 .. 13.5 | -13.5 .. 13.5 | 33 .. 38 | as interposer pad |
| Ground stacks at y = +40 and y = -40 | via 10 x 10 (z 0 .. 6), pad 27 x 27 (6 .. 11), bump r 11 (11 .. 33), pad 27 x 27 (33 .. 38), via 10 x 10 (38 .. 44) | centred at x = 0 | y = +-40 | 0 .. 44 | pitch 40 um, ectc51909.2023.00135-a-i1; vias template |

The browser mesh approximates each cylinder by a 24-gon (vertices on the circle). A reference model may use true
cylinders; record which.

## Materials

| Material | eps_r | tan delta | Source |
|---|---|---|---|
| Oxide (both oxides) | 4.0 | 0.002 | ectc51846.2026.00035-a-L02 (frequency-independent) |
| Underfill | 3.8 | 0.012 | tcpmt.2025.3533388-d-L08 (1 kHz values, used at GHz) |
| Conductors | PEC (base); variant `lossy`: Cu 5.8e7 S/m at 20 C, TCR 0.00393 1/K, evaluated at 25 C | | template |

## Boundaries and ports

- z = 0 and z = 44: PEC (ground planes of interposer and die). y = +-70: PEC side walls.
- x = -80 (port `ip`) and x = +80 (port `die`): single-mode wave ports covering the whole box face. Mode = quasi-TEM
  mode of the line on that face (signal line against the PEC box). The browser solver uses the electrostatic mode
  (phi = 1 V on the line, beta = k0 sqrt(C / C0), Z0 = 1 / (c sqrt(C C0)), Z0 about 40 ohm); a full-wave 2D port
  eigenmode is the expected desktop equivalent.
- De-embedding: move both reference planes 66.5 um inward (to the pad edges x = -13.5 and x = +13.5) with the port
  propagation constant.
- Reference impedance for reported S: 50 ohm on both ports (renormalized from the port impedance).

## Frequencies and outputs

- Frequencies: 1, 10, 25, 50, 75, 100 GHz.
- Report: S11, S21 (dB, phase) at 50 ohm after de-embedding; pi model from Y (50 ohm, de-embedded):
  series L = Im(-1/Y12)/w, R = Re(-1/Y12), shunt C1 = Im(Y11 + Y12)/w, C2 = Im(Y22 + Y12)/w.
- Desktop settings to record: element order, mesh size near the bumps, port mode type, mesh convergence (two meshes).

## Comparison rules (proposed)

- L and C1 / C2 within 10 % at 10-50 GHz; |S21| (dB) within 0.05 dB and S11 within 3 dB where S11 < -20 dB.
- Browser numbers come from first-order Nedelec elements at <= 6e4 DOF; the mesh-sensitivity spread recorded in
  DevLog/lanes/L7-em2d.md (wave 2) is the expected browser error band.
