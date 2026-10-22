# Batch g009 affiliation report (2026-10-21, lane L14)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/g009` -> 0 errors, 0 warnings.
Totals: 29 papers, 195 authors with affiliations, 201 rows, 48 organizations rows.
Sources: references/<paper_id>/text.md p.1 (journals: p.1 footnote); author grids checked on page-1 renders (scratch only, row-major).
Canonical org names reused from data/organizations.csv where the printed org is the same organization.

| paper_id | authors | rows | notes |
|---|---|---|---|
| ectc51906.2022.00323 | 6 | 7 | Hyun-Beom Lee 1,2: KETI primary + Yonsei additional. |
| ectc51906.2022.00360 | 7 | 7 |  |
| ectc51909.2023.00021 | 8 | 8 |  |
| ectc51909.2023.00240 | 5 | 5 |  |
| ectc51909.2023.00302 | 4 | 4 |  |
| ectc51909.2023.00316 | 9 | 12 | 3x3 grid row-major per render. Qian Wang, Jian Cai: Tsinghua + BNRist; Tiefu Li: Tsinghua + BAQIS. |
| ectc51909.2023.00331 | 9 | 9 | 4+4+1 grid row-major per render. Acharya: Oulu printed, ltu.se email not used. |
| eptc59621.2023.10457729 | 11 | 12 | Superscripts; Serna 2,3 = MIT + Bridgewater State. Tyndall printed without city. |
| eptc62800.2024.10909809 | 4 | 4 |  |
| eptc62800.2024.10909836 | 3 | 3 |  |
| eptc67330.2025.11392176 | 8 | 8 | 3+3+2 grid (8 authors) row-major per render; Kuo locality printed 'Hsingchu' (sic). |
| eptc67330.2025.11392196 | 5 | 5 | 3+2 grid row-major per render. |
| eptc67330.2025.11392276 | 8 | 8 |  |
| eptc67330.2025.11392620 | 4 | 4 | 3+1 grid row-major per render. |
| estc55720.2022.9939446 | 8 | 8 | 3x3 grid row-major per render. |
| estc60143.2024.10712002 | 5 | 5 |  |
| estc60143.2024.10712019 | 9 | 9 | 3x3 grid row-major per render. IMT: only the acronym printed. |
| estc60143.2024.10712091 | 6 | 6 | 3x2 grid row-major per render. Guerrero: Brewer Science printed, imec.be email not used. |
| icep-iaac64884.2025.11002988 | 5 | 5 |  |
| iedm50572.2025.11353487 | 8 | 8 |  |
| iedm50572.2025.11353855 | 10 | 10 |  |
| itherm55376.2025.11235616 | 9 | 9 |  |
| tcpmt.2021.3111345 | 7 | 7 |  |
| tcpmt.2024.3507552 | 5 | 6 | Footnote: Paul K. Jo 'was with' GT (primary), 'now with' GTRI Smyrna (present_address). |
| tcpmt.2025.3533388 | 10 | 10 |  |
| tcpmt.2025.3614186 | 6 | 6 |  |
| tcpmt.2026.3672227 | 8 | 8 | Footnote names 'Danni', 'Liu li' mapped to byline Danni Cao, Liu Li. CSU: one row with both printed units. |
| tcpmt.2026.3717381 | 0 | 0 | GAP (unchanged): accepted manuscript prints no affiliations; no rows. |
| tcpmt.2026.3736233 | 8 | 8 |  |

## Organizations used (printed variants in notes)

- A*STAR (government_lab, SG)
- A*STAR Institute of Microelectronics (research_institute, SG, parent A*STAR)
- Aalto University (university, FI)
- Agency for Defense Development (government_lab, KR)
- Beijing Academy of Quantum Information Sciences (research_institute, CN)
- Beijing Institute of Technology (university, CN)
- Beijing National Research Center for Information Science and Technology (research_institute, CN)
- Brewer Science (company, US)
- Bridgewater State University (university, US)
- Central South University (university, CN)
- Changsha Anmuquan Intelligent Technology (company, CN)
- Chinese Academy of Sciences (government_lab, CN)
- Eindhoven University of Technology (university, NL)
- ELSPES (company, KR)
- EV Group (company, AT)
- Fraunhofer IZM (research_institute, DE, parent Fraunhofer-Gesellschaft)
- Fraunhofer-Gesellschaft (research_institute, DE)
- Fukuoka University (university, JP)
- Georgia Institute of Technology (university, US)
- Georgia Tech Research Institute (research_institute, US, parent Georgia Institute of Technology)
- Hytek (company, DK)
- imec (research_institute, BE)
- IMT (other, IT)
- Institute of Microelectronics, Chinese Academy of Sciences (research_institute, CN, parent Chinese Academy of Sciences)
- Intel (company, US)
- JSR (company, JP)
- KLA (company, US)
- Korea Electronics Technology Institute (research_institute, KR)
- LIG Nex1 (company, KR)
- Luleå University of Technology (university, SE)
- Massachusetts Institute of Technology (university, US)
- Panasonic (company, JP)
- Peking University (university, CN)
- Pennsylvania State University (university, US)
- Resonac (company, JP)
- Somacis (company, IT)
- SPIL (company, TW)
- Sumitomo Electric Industries (company, JP)
- Technische Universität Berlin (university, DE)
- Thales Alenia Space (company, FR)
- Tokyo Institute of Technology (university, JP)
- Tsinghua University (university, CN)
- Tyndall National Institute (research_institute, IE, parent University College Cork)
- Unimicron (company, TW)
- University College Cork (university, IE)
- University of Oulu (university, FI)
- USHIO (company, JP)
- Yonsei University (university, KR)
