# Manual download list (simulation references, non-IEEE)

Written 2026-10-20 from DevLog/research/2026-10-20-sim-materials-library-scope.md Sec. 4 (DevLog-010, D1/D1b). These
are materials-property sources for the simulation library, not packaging papers for the extraction database. Publishers:
APS, AIP, Elsevier, Emerald, RSC (subscription access). Download each PDF in your browser and save it into
`references/_inbox/` with the exact `save_as` filename; `scripts/ingest_inbox.py` moves it to
`references/<paper_id>/source.pdf` and extracts it. DOIs checked against doi.org / Crossref on 2026-10-20.

Total: 8.

- paper_id: physrev.161.756
  title: Electronic effects in the elastic constants of n-type silicon (J. J. Hall, Phys. Rev. 161, 756, 1967)
  doi: 10.1103/PhysRev.161.756
  publisher_url: https://doi.org/10.1103/PhysRev.161.756
  save_as: physrev.161.756.pdf
  drop_folder: references/_inbox/
  why_needed: Si second-order elastic constants vs temperature.

- paper_id: physrev.134.a1058
  title: Thermal conductivity of silicon and germanium from 3 K to the melting point (Glassbrenner, Slack, Phys. Rev. 134, A1058, 1964)
  doi: 10.1103/PhysRev.134.A1058
  publisher_url: https://doi.org/10.1103/PhysRev.134.A1058
  save_as: physrev.134.a1058.pdf
  drop_folder: references/_inbox/
  why_needed: Si k(T).

- paper_id: 1.333965
  title: Precise determination of lattice parameter and thermal expansion coefficient of silicon between 300 and 1500 K (Okada, Tokumaru, J. Appl. Phys. 56, 314, 1984)
  doi: 10.1063/1.333965
  publisher_url: https://doi.org/10.1063/1.333965
  save_as: 1.333965.pdf
  drop_folder: references/_inbox/
  why_needed: Si alpha(T) fit.

- paper_id: j.ijadhadh.2011.10.007
  title: Characterization and modeling the thermo-mechanical cure-dependent properties of epoxy molding compound (Sadeghinia, Jansen, Ernst, Int. J. Adhes. Adhes. 32, 82, 2012)
  doi: 10.1016/j.ijadhadh.2011.10.007
  publisher_url: https://doi.org/10.1016/j.ijadhadh.2011.10.007
  save_as: j.ijadhadh.2011.10.007.pdf
  drop_folder: references/_inbox/
  why_needed: EMC storage-modulus master curves (Prony + shift), cure shrinkage, CTE.

- paper_id: j.mee.2003.09.012
  title: Morphology, microstructure, and mechanical properties of a copper electrodeposit (Read, Cheng, Geiss, Microelectron. Eng. 75, 2004)
  doi: 10.1016/j.mee.2003.09.012
  publisher_url: https://doi.org/10.1016/j.mee.2003.09.012
  save_as: j.mee.2003.09.012.pdf
  drop_folder: references/_inbox/
  why_needed: Electroplated Cu modulus and plasticity (film vs bulk).

- paper_id: 09540910010331428
  title: Viscoplastic Anand model for solder alloys and its application (Cheng, Wang, Chen, Wilde, Becker, Soldering & Surface Mount Technology, 2000)
  doi: 10.1108/09540910010331428
  publisher_url: https://doi.org/10.1108/09540910010331428
  save_as: 09540910010331428.pdf
  drop_folder: references/_inbox/
  why_needed: Anand parameter sets for several solders (alternatives).

- paper_id: j.microrel.2013.07.100
  title: Anand model and FEM analysis of SnAgCuZn lead-free solder joints in wafer level chip scale packaging devices (Zhang, Han, Guo, He, Microelectron. Rel. 54, 281, 2014)
  doi: 10.1016/j.microrel.2013.07.100
  publisher_url: https://doi.org/10.1016/j.microrel.2013.07.100
  save_as: j.microrel.2013.07.100.pdf
  drop_folder: references/_inbox/
  why_needed: Source [24] of the Anand table in tcpmt.2025.3614186 (p.7 Table III).

- paper_id: c8sm02105h
  title: A quick and accurate method to determine the Poisson's ratio and the coefficient of thermal expansion of PDMS (Mueller, Wapler, Wallrabe, Soft Matter 15, 779-784, 2019)
  doi: 10.1039/c8sm02105h
  publisher_url: https://doi.org/10.1039/c8sm02105h
  save_as: c8sm02105h.pdf
  drop_folder: references/_inbox/
  why_needed: Sourced Poisson ratio and CTE for silicone (PDMS); replaces the 0.30 placeholder of silicone_adhesive (added 2026-10-20, DOI checked on Crossref).
