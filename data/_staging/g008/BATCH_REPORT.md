# Batch g008 affiliation report (2026-10-21, lane L14)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/g008` -> 0 errors, 0 warnings.
Totals: 29 papers, 207 authors with affiliations, 208 rows, 44 organizations rows.
Sources: references/<paper_id>/text.md p.1 (journals: p.1 footnote); author grids checked on page-1 renders (scratch only, row-major).
Canonical org names reused from data/organizations.csv where the printed org is the same organization.

| paper_id | authors | rows | notes |
|---|---|---|---|
| 001c.129276 | 3 | 3 |  |
| 001c.129513 | 11 | 11 |  |
| 001c.129733 | 10 | 10 |  |
| 001c.129747 | 3 | 3 |  |
| 001c.129764 | 10 | 10 | Locality printed 'Hwseong-si' (sic). |
| 001c.147098 | 6 | 6 |  |
| 001c.147108 | 3 | 3 |  |
| 001c.147115 | 7 | 7 | One shared Amkor Tempe block; 4 amkor.co.kr emails not used. |
| 001c.147203 | 13 | 13 | Superscripts 1-5. Authors 9-13 have no printed address: country = org HQ (noted). Panasonic subsidiaries as own orgs, parent Panasonic. |
| 001c.147214 | 4 | 4 |  |
| 001c.147288 | 5 | 5 |  |
| 001c.74577 | 5 | 5 | Byline absent from text layer; read from page render. LPKF Garbsen; email domain vitrion.com not used. |
| 001c.74748 | 5 | 5 | Superscripts 1-3; no cities printed. CTCK kept as unit of Corning (existing convention). |
| 001c.74770 | 5 | 5 |  |
| 001c.74775 | 6 | 6 | One org per author; printed localities Kagawa (prefecture), Okayama/Nagano/Fukuoka (city vs prefecture ambiguous). |
| 001c.94484 | 2 | 2 |  |
| 2380-4505-2020.1.000042 | 13 | 13 |  |
| 3dic63395.2024.10830178 | 7 | 8 | 4+3 grid, row-major per render (text layer column-major). Collaert: imec primary + VUB additional ('Also'). |
| ectc51529.2024.00392 | 7 | 7 |  |
| ectc51687.2025.00060 | 12 | 12 | 4x3 grid placed after the abstract in the text layer; 12 authors read row-major from render. Applied Materials Singapore Technology Pte. Ltd = subsidiary org (parent Applied Materials). |
| ectc51846.2026.00034 | 20 | 20 |  |
| ectc51846.2026.00065 | 6 | 6 |  |
| ectc51846.2026.00073 | 8 | 8 |  |
| ectc51846.2026.00103 | 5 | 5 | Unit printed 'Wooduff' (sic). |
| ectc51846.2026.00202 | 10 | 10 |  |
| ectc51846.2026.00243 | 5 | 5 | Instituto de Telecomunicacoes (own org, no parent) vs CICECO (unit of University of Aveiro). UCLA: no country printed. |
| ectc51846.2026.00274 | 9 | 9 |  |
| ectc51846.2026.00356 | 3 | 3 |  |
| ectc51906.2022.00240 | 4 | 4 | Onto Innovation printed 'Massachusetts 01887' with no city: locality = state. |

## Organizations used (printed variants in notes)

- A*STAR (government_lab, SG)
- A*STAR Institute of Microelectronics (research_institute, SG, parent A*STAR)
- Amkor Technology (company, US)
- AOI Electronics (company, JP)
- Apic Yamada (company, JP)
- Applied Materials (company, US)
- Applied Materials Singapore Technology (company, SG, parent Applied Materials)
- Corning (company, US)
- Dai Nippon Printing (company, JP)
- Fraunhofer IZM (research_institute, DE, parent Fraunhofer-Gesellschaft)
- Fraunhofer-Gesellschaft (research_institute, DE)
- Georgia Institute of Technology (university, US)
- imec (research_institute, BE)
- Institute of Science Tokyo (university, JP)
- Instituto de Telecomunicações (research_institute, PT)
- Korea Electronics Technology Institute (research_institute, KR)
- LPKF Laser & Electronics (company, DE)
- Luleå University of Technology (university, SE)
- MIRISE Technologies (company, JP)
- National Institute of Advanced Industrial Science and Technology (government_lab, JP)
- National Institute of Information and Communications Technology (government_lab, JP)
- NEC (company, JP)
- Northrop Grumman (company, US)
- Onto Innovation (company, US)
- OUME Electronics (company, JP)
- Panasonic (company, JP)
- Panasonic Industry (company, JP, parent Panasonic)
- Panasonic System Networks R&D Lab. (company, JP, parent Panasonic)
- Renesas Electronics (company, JP)
- Samsung Electronics (company, KR)
- Shinko Electric Industries (company, JP)
- Socionext (company, JP)
- Sumitomo Bakelite (company, JP)
- TAZMO (company, JP)
- Technische Universität Berlin (university, DE)
- Tokyo Institute of Technology (university, JP)
- TSMC (foundry, TW)
- Tyndall National Institute (research_institute, IE, parent University College Cork)
- Unimicron (company, TW)
- University College Cork (university, IE)
- University of Aveiro (university, PT)
- University of California, Los Angeles (university, US)
- University of California, San Diego (university, US)
- Vrije Universiteit Brussel (university, BE)
