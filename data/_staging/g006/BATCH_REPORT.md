# Batch g006 - author affiliations (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/g006` -> 0 errors, 0 warnings.

Sources: `references/<paper_id>/text.md` page 1 (byline / TCPMT p.1 footnote; imec TCPMT biographies);
`figures/page_01.png` crops checked for every author-grid layout, the superscript bylines (VLSI, ICEP ULVAC), the
font-shifted Murata text layer, and the Purdue/Xperi blocks. Grid byline order = row-major as rendered (IEEE convention);
where the text layer reads column-major this is noted.

Totals: 30 papers, 225 authors, 227 affiliation rows, 38 organizations.

| paper_id | authors | rows | notes |
|---|---|---|---|
| vlsitechnologyandcir65830.2026.11577374 | 16 | 16 | superscript block: SAIMEMORY Tokyo (1), Intel Santa Clara (2, printed "Intel"), PSMC Hsinchu (8), AP Memory Hsinchu (5). "HN Hcueh", "P. Mahji" as printed. |
| tcpmt.2025.3628798 | 15 | 16 | p.1 footnote: all IMEC, Leuven. Hussain additional KU Leuven (joint Ph.D., p.13 biography). Biographies otherwise consistent. |
| ectc51687.2025.00326 | 3 | 3 | Resonac, Kawasaki. |
| ectc51906.2022.00113 | 6 | 6 | single shared block: SK Hynix Semiconductor Co., LTD, R&D CENTER, Icheon. |
| ectc51846.2026.00365 | 9 | 9 | Intel ATTD Chandler AZ; 4-col grid, row-major (Wen Yang 9th). |
| ectc51687.2025.00090 | 8 | 8 | Samsung; Da-Hee KIM Cheonan-si, rest Yongin Si. |
| ectc51906.2022.00031 | 12 | 12 | single shared block, Xperi Corporation, San Jose, USA. |
| tcpmt.2021.3104326 | 8 | 8 | p.1 footnote: 7 CEA-LETI, Gustavo CEA-IRIG; both printed with Universite Grenoble Alpes (UGA not split out). No biographies. |
| icep-iaac64884.2025.11002987 | 5 | 5 | ASE Kaohsiung. |
| ectc51909.2023.00023 | 10 | 10 | Adeia San Jose CA; grid row-major = text order. Theil's printed email is Fountain's (layout typo, irrelevant to rows). |
| estc60143.2024.10712070 | 4 | 5 | AMBIGUOUS ORDER: 3-col grid, row-major gives Shehzad, Myndyk, Junghaehnel, Panchenko; text layer gives Panchenko 2nd. Panchenko additional TU Dresden (Institute of Electronic Packaging Technology). IZM-ASSID kept as unit of Fraunhofer IZM. |
| ectc51687.2025.00095 | 7 | 7 | ASE; Lihong Cao Austin (US), rest Kaohsiung. |
| ectc51529.2024.00076 | 9 | 9 | Univ. Grenoble Alpes, CEA, LETI -> CEA-Leti (UGA not split out). |
| ectc51529.2024.00153 | 12 | 12 | AMBIGUOUS ORDER: 4x3 grid; row-major used (Kwang-Seong Choi 1st, matches batch hint); text layer order differs. ETRI Superintelligence Creative Laboratory, Daejeon. |
| ectc51846.2026.00008 | 7 | 7 | ASE; Cao and Wudjud Austin (US), rest Kaohsiung. |
| ectc51529.2024.00057 | 12 | 12 | AMBIGUOUS ORDER: 4x3 grid; row-major used, text layer is column-major (first and last author same either way). CEA-Leti. |
| ectc51687.2025.00226 | 4 | 4 | Mitsubishi Materials "Corporration" (sic); locality Hyogo-ken is a prefecture. |
| ectc51846.2026.00194 | 5 | 5 | EV Group St. Florian am Inn (3), Asahi Kasei Shizuoka (2, prefecture). |
| ectc51687.2025.00071 | 3 | 3 | Purdue; unit printed "Brick Nanotechnology Center" (as printed, verified on render). No country printed: US from West Lafayette, IN. |
| icep-iaac64884.2025.11002958 | 6 | 6 | ULVAC superscripts: 4 x Institute of Advanced Technology Kanagawa, Ihori Institute of Semiconductor & Electro Kanagawa, Wakai Institute of Advanced Technology Chiba. Prefecture-only localities. |
| ectc51846.2026.00198 | 5 | 5 | USHIO Gotenba. |
| ectc51846.2026.00012 | 3 | 3 | Ableprint Hsinchu (printed "HsinChu"). |
| ectc51529.2024.00170 | 7 | 7 | text layer font-shifted, read on render; 6 Murata Manufacturing Kyoto, Yonemori Murata Electronics North America San Jose CA. |
| ectc51846.2026.00302 | 5 | 5 | Fraunhofer IZM Berlin (4), Chojne Technical University of Berlin. |
| ectc51846.2026.00074 | 11 | 11 | Georgia Tech, per-author units (3D PRC + MSE/ECE, Woodruff ME, IMS). |
| ectc51529.2024.00106 | 10 | 10 | superscripts: imec Leuven (8), Brewer Science Rolla MO, SUSS MicroTec Lithography Sternenfels. |
| tcpmt.2025.3540665 | 3 | 3 | p.1 footnote: Aalto, Dept. of Electrical Engineering and Automation, Espoo. No biographies. |
| iedm45741.2023.10413759 | 8 | 8 | single shared block, UCLA CHIPS, Los Angeles CA. |
| itherm55375.2024.10709474 | 6 | 6 | single shared block, IMECAS Beijing. |
| tcpmt.2025.3610036 | 6 | 6 | p.1 footnote: 4 Georgia Tech 3-D PRC, Kimiyuki JSR Yokkaichi, Swaminathan Penn State CHIMES State College PA. No biographies. |

## Gaps
- No missing authors or affiliations. Localities that are only prefectures (Hyogo-ken, Shizuoka, Kanagawa, Chiba) kept as printed and noted.

## Organizations created (printed variants)
- SAIMEMORY Corp. (company, JP) - SAIMEMORY Corp.
- Intel Corporation (company, US) - Intel; Intel Corporation
- Powerchip Semiconductor Manufacturing Corporation (foundry, TW)
- AP Memory (company, TW) - AP Memory
- imec (research_institute, BE) - IMEC; imec
- KU Leuven (university, BE) - biography only
- Resonac Corporation (company, JP)
- SK hynix Inc. (company, KR) - SK Hynix Semiconductor Co., LTD
- Samsung Electronics (company, KR) - Samsung Electronics Co., Ltd.; Samsung Electronics Co, Ltd
- Xperi Corporation (company, US)
- Adeia Inc. (company, US) - Adeia, Inc.
- CEA (government_lab, FR) - parent of CEA-Leti / CEA-IRIG
- CEA-Leti (research_institute, FR; parent CEA) - Univ. Grenoble Alpes, CEA, LETI; CEA, LETI, Universite Grenoble Alpes
- CEA-IRIG (research_institute, FR; parent CEA) - CEA, Interdisciplinary Research Institute of Grenoble (IRIG)
- Advanced Semiconductor Engineering, Inc. (company, TW)
- Fraunhofer-Gesellschaft (research_institute, DE) - parent only
- Fraunhofer Institute for Reliability and Microintegration IZM (research_institute, DE; parent Fraunhofer-Gesellschaft) - IZM-ASSID (Dresden); Fraunhofer IZM (Berlin)
- Technische Universität Dresden (university, DE) - Technische Universitaet Dresden
- Technische Universität Berlin (university, DE) - Technical University of Berlin
- Electronics and Telecommunications Research Institute (research_institute, KR) - ETRI
- Mitsubishi Materials Corporation (company, JP) - Mitsubishi Materials Corporration (sic)
- EV Group (company, AT)
- Asahi Kasei Corporation (company, JP)
- Purdue University (university, US)
- ULVAC, Inc. (company, JP) - ULVAC, Inc.; ULVAC, inc.
- USHIO Inc. (company, JP)
- Ableprint Technology Co. Ltd. (company, TW)
- Murata Manufacturing Co., Ltd. (company, JP)
- Murata Electronics North America Inc. (company, US; parent Murata Manufacturing Co., Ltd.)
- Georgia Institute of Technology (university, US)
- Brewer Science, Inc. (company, US)
- SUSS MicroTec Lithography GmbH (company, DE) - corporate parent not printed, not set
- Aalto University (university, FI)
- University of California, Los Angeles (university, US)
- Chinese Academy of Sciences (government_lab, CN) - parent only
- Institute of Microelectronics, Chinese Academy of Sciences (research_institute, CN; parent CAS)
- JSR Corporation (company, JP)
- Pennsylvania State University (university, US)

## Merge notes
- Samsung: prior batches used both "Samsung Electronics" and "Samsung Electronics Co., Ltd."; this batch uses "Samsung Electronics".
- Murata: prior batches used both "Murata Manufacturing" and "Murata Manufacturing Co., Ltd."; this batch uses the latter.
- ASE: prior batches also have "ASE Group"; this batch uses "Advanced Semiconductor Engineering, Inc." (as printed).
- Fraunhofer IZM: prior batches have both "Fraunhofer IZM" and the long form; this batch uses the long form.
- CEA-Leti / CEA-IRIG with Universite Grenoble Alpes kept as one row each (same policy as g00x); split if UGA is to be a co-affiliation.
- Grid byline order: earlier batches mixed text-layer and row-major order; this batch uses row-major per render.
