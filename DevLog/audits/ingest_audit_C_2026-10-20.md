# Audit C: b084 / b089 / b082 (2026-10-20)

I checked every row of all three papers against `text.md`, the page renders, and candidate crops or my own re-crops (in `audit_C/p1`, `audit_C/p3`).

## Sample
| paper | batch | rows checked / total | figures checked | flow level | agree |
|---|---|---|---|---|---|
| tcpmt.2026.3736233 | b084 | 189 / 189 | 29 / 29 | ordered | yes |
| ectc51906.2022.00323 | b089 | 101 / 101 | 11 / 11 | ordered | yes |
| 001c.129764 | b082 | 64 / 64 | 9 / 9 | full | yes |

## Per-paper summary
- **tcpmt.2026.3736233 (embedded DTC in glass)**
  - **Values:** Table IV via geometry, Table V (1 mOhm / 0.143 pH; 2.8 mOhm / 0.52 pH; 27 uOhm / 0.015 pH; 0.56 mOhm / 0.1 pH), Table VI, Table VII, the Table II/III errors and the Fig. 21 optical dimensions all match. Fig. 24 marker values are on the correct traces (S21 = 3-via, S43 = 6-via).
  - **Flow:** written once, with deltas for the second plane on a;b;c;d; level ordered (conditions deferred to refs [27],[28]). All 29 figures were checked; rank 1 (Fig. 4 stack schematic) is correct because the paper has no cross-section image.
  - **Defects:** the 5.6 pH parallel-plane Ze value is simulated (HFSS only, Fig. 23(b)) but marked measured. The Fig. 25 crop cuts the x-axis title. The direct ESL values in Table II and the estimates in Table III were not entered (minor).
- **ectc51906.2022.00323 (W-band Si-embedded IC)**
  - **Values:** all dimensions, losses, gains and lumped-model values match.
  - **Flow:** typical vs improved process are handled as deltas in F1; F2 covers module assembly; every physical TV is covered.
  - **Figures:** all 11 candidate crops are complete.
  - **Defect (minor):** vacuum lamination is written as equipment text instead of atmosphere = vacuum.
- **001c.129764 (9 um pitch microbump, FLOLA)**
  - **Values:** the Table I stacks, the 9.05 um measured pitch, the Table II voids, the IMC thicknesses and the 175 C / 2 h cure all match.
  - **Flow:** level full is justified by the typed cure. Leg1/Leg2 are deltas, and underfill A/B/C is handled as a split.
  - **Figure defect:** the Fig. 3 crop cuts the bottom of the image.
  - **Evidence gap:** the 'another' vs 'same' 12-inch bottom-wafer inconsistency is not logged in conflicts.

## Findings
| # | paper | row | field | severity | fix |
|---|---|---|---|---|---|
| 1 | tcpmt.2026.3736233 | -a-m12 | basis | content_wrong | measured -> simulated; condition 'HFSS waveport after CPW de-embedding' |
| 2 | tcpmt.2026.3736233 | -f27 | bbox | figure | manual 0.5111,0.566,0.9271,0.738 |
| 3 | tcpmt.2026.3736233 | TVs c/d/f metrics | missing | minor | add Table II direct adjacent-segment ESL and Table III L6via estimates (simulated) |
| 4 | ectc51906.2022.00323 | F1-s02, F1-s07 | equipment/atmosphere | minor | s02 equipment empty, atmosphere vacuum; s07 atmosphere vacuum |
| 5 | 001c.129764 | -f08 | bbox | figure | manual 0.1557,0.698,0.4001,0.831 |
| 6 | 001c.129764 | evidence | conflicts | minor | add 'another' vs 'same' 12-inch wafer conflict |

## Rates
- Rows checked: 354 / 354 (100%).
- Content-changing defects: 2 (a-m12 basis; F1-s02/s07 typed atmosphere), plus 1 content_missing (minor) = 3 / 354 (0.8%).
- Figure defects: 2 of 49 figures (4%), both bbox cuts; no wrong page, label, kind, rank or tv_ids found.
- Structure (flows, deltas, build_seq, coverage, test steps): no defects.
