# EM-5a: TSV GSG chain, reference deck description (for lane L5 desktop runs)

Target paper: `ectc51909.2023.00230` (CEA-Leti / Fraunhofer IZM via-last TSVs on a SiPh wafer). Measured and HFSS
results in the DB: S11 / S22 dip ("resonance") near 45 GHz measured (`-a-m4`) and 40 GHz in HFSS (`-a-m5`); maximum
reflection -11 dB measured (`-a-m3`, conflict with the text's "below -20 dB" logged in the DB) and -19.5 dB HFSS
(`-a-m6`); bandwidth > 67 GHz (`-a-m1`, `-a-m2`). The HFSS model (paper p.2 Fig. 2) has 4 TSVs in series with GSG
pads.

## What is known (DB rows, paper p.2 Sec. II.B)

| Item | Value | Source |
|---|---|---|
| TSV diameter, depth | 10 um, 100 um (Cu fill, near-vertical walls) | `-a-i1`; paper p.2 Sec. II.B |
| Si substrate | 100 um (thinned) | `-a-L10` |
| Front and back RDL | Al, 1 um | `-a-L03`, `-a-L12` |
| RDL passivation | SiO2, 1 um (front and back), back-side oxide on Si 1 um | `-a-L02`, `-a-L11`, `-a-L13` |
| Front side below the RDL | BOX 2 um, SOI 0.3 um, BEOL with two metal levels (thickness not reported) | `-a-L05`, `-a-L08`, `-a-L09` |
| Pad configuration | GSG; 2 / 4 / 6 TSVs in series (measured), 4 in the HFSS model | paper p.4 Sec. IV, p.2 Fig. 2 |

## What is missing (needed for a faithful model)

GSG pitch, pad shapes and sizes (stadium pads in Fig. 2), number of TSVs per pad (Fig. 2 shows several), front and
back line lengths between TSVs, TSV liner thickness, Si resistivity, BEOL thickness and permittivity, de-embedding
reference planes (the measurement uses probe-tip calibration on pads). Without these the 40 / 45 GHz S11 dip, which is
set by the electrical length between the reflecting TSV transitions, cannot be predicted.

## Proposed desktop model (L5)

1. Rebuild Fig. 2 from the scale bar (0 / 0.15 / 0.3 mm) by image measurement, record every measured dimension
   with its uncertainty, 4 TSVs in series, stadium pads.
2. Materials: Si eps_r 11.9 with sigma swept over 0.1 / 1 / 10 S/m; SiO2 eps_r 3.9; liner 0.2 / 0.5 / 1 um sweep;
   Al sigma 3.5e7 S/m and Cu 5.8e7 S/m (textbook room-temperature values, template; not in the DB).
3. Ports: lumped or wave ports at the GSG pad edges as in the paper's probe-tip reference; 1-67 GHz.
4. Outputs: S11 dip frequency vs the unknowns (sensitivity map), max S11, S21 at 67 GHz.
5. Browser counterpart: `sims/em/em5a_tsv_gsg_chain_reduced.yaml` (2 TSVs, template pitch 50 um, line width 20 um,
   liner 1 um, PEC metals, 58.6k DOF), which checks the browser solver on the same physics (lossy Si, liner,
   vertical transitions) at the browser budget; compare it with the same reduced geometry on the desktop first.
