# Batch g007 affiliation report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/g007` -> 0 errors, 0 warnings.
Totals: 29 papers, 213 authors with affiliations, 232 author_affiliations rows, 42 organizations rows.
Sources: references/<paper_id>/text.md page 1; page-1 top renders (scratch only) checked for every paper to confirm
byline order of author grids. Journal papers: first-page footnote (biographies of tcpmt.2025.3538554 consistent).

## Per paper (authors / rows; gaps and ambiguities)

| paper_id | authors | rows | notes |
|---|---|---|---|
| ectc51846.2026.00019 | 7 | 7 | Mitsubishi Electric; printed localities Kanagawa (4) / Hyogo (3) are prefectures. |
| ectc51846.2026.00416 | 9 | 9 | Georgia Tech, Atlanta (7); Thin Film Technology Corporation, North Mankato MN (2). |
| ectc51687.2025.00097 | 7 | 7 | Micron Technology, Inc., unit APTD; Boise, Idaho (6), Taichung TW (Mota Liou). |
| ectc51846.2026.00204 | 7 | 7 | Nopion Co.,Ltd Suwon (4); Hanyang Univ. Seoul: Mech. Convergence Eng. (2), Mech. Eng. (1). |
| ectc51846.2026.00153 | 9 | 9 | Resonac: Kanagawa (2), Ibaraki (4), Chiba (2) as printed (prefecture-level); Kotake printed "San jose CA, USA". |
| eptc62800.2024.10909935 | 3 | 4 | Superscripts: Riley Kang 1,2 -> IME primary + Singapore Polytechnic (School of EEE) additional. |
| ectc51687.2025.00076 | 6 | 6 | Penn State, University Park (3); Georgia Tech ECE (1); ELSPES Inc., Hwaseong, Gyeonggi (2). |
| ectc51687.2025.00359 | 6 | 6 | Printed "Gigaphopton Inc." (sic; email gigaphoton.com) Tochigi (3); Ajinomoto Fine-Techno, Kanagawa (3). |
| tcpmt.2026.3717381 | 9 (byline) | 0 | GAP: accepted-manuscript version prints no affiliations (no footnote, no biographies); byline only. Funding mentions China Academy of Engineering Physics but that is not an affiliation statement. No rows written. |
| ectc51846.2026.00218 | 12 | 12 | Printed "Univ. Grenoble Alpes, CEA, Leti, Grenoble" -> one CEA-Leti row each (earlier-batch convention); Univ. Grenoble Alpes not given its own row. |
| ectc51846.2026.00424 | 6 | 6 | Tohoku, Sendai. Tetsu Tanaka and Fukushima: one printed block with two departments/graduate schools, kept as one row with both in unit. |
| tcpmt.2024.3443855 | 7 | 7 | p.1 footnote: Rui Cao UCAS School of Integrated Circuits; 5 authors IMECAS (System Packaging and Integration Technology Center), Beijing; Lijun Chen National Center for Advanced Packaging, Wuxi. |
| tcpmt.2025.3557745 | 3 | 4 | Avula printed "was with" Georgia Tech (ECE + 3-D Systems Packaging Research Center) -> primary; "now with Apple Inc., Cupertino" -> present_address. Swaminathan printed "Penn State University". |
| ectc51687.2025.00142 | 8 | 8 | UCLA CHIPS (4; one printed "Heterogeneosu" typo, unit normalized); Applied Materials Santa Clara (4). |
| ectc51846.2026.00106 | 10 | 10 | Corning Optical Communication GmbH & Co. KG Berlin (1) and Corning Research and Development Corporation, Corning NY (9) kept as units of Corning Incorporated (earlier-batch convention). |
| ectc51846.2026.00187 | 10 | 10 | Applied Materials, Inc. Santa Clara (5); EV Group St. Florian am Inn (5). |
| tcpmt.2026.3740312 | 7 | 10 | Byline absent from text layer; read from page image. Footnote: all Tsinghua School of Integrated Circuits; Qian Wang, Wei Chen, Jian Cai also Beijing National Research Center for Information Science and Technology. |
| ectc51687.2025.00027 | 7 | 14 | Block "Consortium JOINT2 (...), Resonac Corporation" -> JOINT2 primary + Resonac additional (g-batch convention), Kawasaki. |
| eptc67330.2025.11392132 | 9 | 9 | AMBIGUOUS ORDER: 3x3 grid read row-major (S.D. Lee, Y.J. Lee, J. Kim, S. Kang, J.S. Lee, S.J. Kim, M.D. Rhee, K. Moon, S. Hyun); text layer is column-major. Samsung unit printed "Advanced Precess Development Team" (sic), Hwaseong-si; KAIST Mech. Eng. Daejeon-si (2). |
| ectc51846.2026.00119 | 9 | 9 | Taiyo Ink Mfg Co., Ltd. Saitama (5; Saitama city vs prefecture ambiguous); Georgia Tech Atlanta (4). |
| ectc51846.2026.00209 | 7 | 7 | Sciperio, Inc. Orlando (6); Rojas printed "Embry-Riddle Aeronautical Institute" (email erau.edu) -> Embry-Riddle Aeronautical University, Daytona Beach. |
| ectc51846.2026.00024 | 11 | 11 | IME (6), Applied Materials unit Packaging Plating and Cleans (2), IMRE (2), WinTech Nano-Technology Services Pte. Ltd. (1); all Singapore. |
| tcpmt.2025.3538554 | 7 | 11 | Footnote: Cai, Xia, Han, Wu SIMIT (State Key Lab of Transducer Technology) + UCAS School of Graduate Study; Ling, Chen SIMIT only; Hao Wang Shanghai Aircraft Design and Research Institute, COMAC. |
| ectc51846.2026.00115 | 3 | 3 | UCLA MAE "Los Angeles, CA 90095" with no country printed -> US, noted; Taiwan Foresight Co., Ltd., Jhubei City, Hsinchu County. |
| ectc51846.2026.00208 | 8 | 8 | Tohoku Sendai (7); Micro Technology Tokyo (Miyauchi). Kiyoharu Mori printed Tohoku University but email t-microtec.com (noted, not used). |
| ectc51687.2025.00356 | 7 | 7 | All IME, Singapore. |
| ectc51846.2026.00123 | 7 | 7 | Penn State (4), Georgia Tech (1), ELSPES (2). |
| tcpmt.2026.3708099 | 8 | 15 | Footnote: 7 authors CAEP Microsystem and Terahertz Research Center, Chengdu + Institute of Electronic Engineering, Mianyang (additional); X. Li IEE Mianyang only (email njust.edu.cn, noted). CAEP sub-institutes kept as units. |
| ectc51846.2026.00096 | 9 | 9 | Single shared IME block, Singapore. |

## Organizations created (42) with printed variants

| org_name | type | country | parent | printed |
|---|---|---|---|---|
| Mitsubishi Electric Corporation | company | JP | | Mitsubishi Electric Corporation |
| Georgia Institute of Technology | university | US | | Georgia Institute of Technology |
| Thin Film Technology Corporation | company | US | | Thin Film Technology Corporation |
| Micron Technology | company | US | | Micron Technology, Inc. |
| Nopion | company | KR | | Nopion Co.,Ltd |
| Hanyang University | university | KR | | Hanyang University |
| Resonac Corporation | company | JP | | Resonac Corporation |
| A*STAR | government_lab | SG | | parent only |
| A*STAR Institute of Microelectronics | research_institute | SG | A*STAR | Institute of Microelectronics (IME), Agency for Science, Technology and Research (A*STAR); ... (IME), A*STAR |
| A*STAR Institute of Materials Research and Engineering | research_institute | SG | A*STAR | Institute of Materials Research and Engineering (IMRE), Agency for Science, Technology and Research (A*STAR) |
| Singapore Polytechnic | university | SG | | Singapore Polytechnic (polytechnic; closest type) |
| Pennsylvania State University | university | US | | Pennsylvania State University; Penn State University |
| ELSPES | company | KR | | ELSPES Inc. |
| Gigaphoton | company | JP | | Gigaphopton Inc. (sic) |
| Ajinomoto Fine-Techno Co., Inc. | company | JP | | Ajinomoto Fine-Techno Co., Inc. |
| CEA | government_lab | FR | | parent only |
| CEA-Leti | research_institute | FR | CEA | Univ. Grenoble Alpes, CEA, Leti, Grenoble |
| Tohoku University | university | JP | | Tohoku University |
| Chinese Academy of Sciences | government_lab | CN | | parent only |
| University of Chinese Academy of Sciences | university | CN | | University of Chinese Academy of Sciences |
| Institute of Microelectronics, Chinese Academy of Sciences | research_institute | CN | Chinese Academy of Sciences | Institute of Microelectronics of the Chinese Academy of Sciences |
| Shanghai Institute of Microsystem and Information Technology | research_institute | CN | Chinese Academy of Sciences | ..., Chinese Academy of Sciences |
| National Center for Advanced Packaging | other | CN | | National Center for Advanced Packaging, Wuxi (type not printed) |
| Apple | company | US | | Apple Inc. |
| University of California, Los Angeles | university | US | | UCLA Center for Heterogeneous Integration and Performance Scaling (CHIPS); University of California, Los Angeles |
| Applied Materials | company | US | | Applied Materials; Applied Materials, Inc. |
| Corning Incorporated | company | US | | Corning Optical Communication GmbH & Co. KG; Corning Research and Development Corporation (units) |
| EV Group | company | AT | | EV Group |
| Tsinghua University | university | CN | | Tsinghua University |
| Beijing National Research Center for Information Science and Technology | research_institute | CN | | as printed |
| JOINT2 | consortium | JP | | Consortium JOINT2 (Jisso Open Innovation Network of Tops 2) |
| Samsung Electronics | company | KR | | Samsung Electronics Co., Ltd |
| Korea Advanced Institute of Science and Technology | university | KR | | as printed |
| Taiyo Ink Mfg. Co., Ltd. | company | JP | | Taiyo Ink Mfg Co., Ltd. |
| Sciperio | company | US | | Sciperio, Inc. |
| Embry-Riddle Aeronautical University | university | US | | Embry-Riddle Aeronautical Institute (sic) |
| WinTech Nano-Technology Services | company | SG | | WinTech Nano-Technology Services Pte. Ltd. |
| COMAC | company | CN | | COMAC (parent only) |
| Shanghai Aircraft Design and Research Institute | research_institute | CN | COMAC | Shanghai Aircraft Design and Research Institute, COMAC |
| Taiwan Foresight | company | TW | | Taiwan Foresight Co., Ltd. |
| Micro Technology | company | JP | | Micro Technology |
| China Academy of Engineering Physics | government_lab | CN | | units: Microsystem and Terahertz Research Center; Institute of Electronic Engineering |

## Merge notes
- Naming: corporate suffixes (Inc., Co., Ltd.) dropped except where earlier batches kept them (Ajinomoto Fine-Techno Co., Inc.; Taiyo Ink Mfg. Co., Ltd.). Earlier batches also have "Applied Materials, Inc.", "Samsung Electronics Co., Ltd.", "Institute of Microelectronics, A*STAR" variants to merge.
- Org HQ countries, org_type and parent links (CEA, CAS, COMAC, A*STAR) are org-level facts, not printed in the papers; confirm at merge.
- CAEP sub-institutes and Corning legal entities kept as units; split into own orgs at merge if the convention changes.
- Prefecture-level localities (Kanagawa, Hyogo, Ibaraki, Tochigi; Chiba/Saitama ambiguous) kept as printed; geocoding should treat them as region-level.
