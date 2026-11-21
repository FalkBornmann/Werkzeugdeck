# Open thermodynamic sources

The three TDB files are unmodified copies from the supplementary SGTE binary collection distributed by Bengt Hallstedt, *The SGTE collection of binary datasets*, Calphad 89 (2025) 102833, https://doi.org/10.1016/j.calphad.2025.102833. License: Creative Commons Attribution 4.0, https://creativecommons.org/licenses/by/4.0/. Download mirror: the ORCHID archive; original archive provenance: https://orchid-project.org/data/databases/sgte-binary/SOURCE.md.

Original assessments (retain both this attribution and each TDB header):
- S.-M. Liang and R. Schmid-Fetzer (2014), Acta Materialia 72, 41–56, https://doi.org/10.1016/j.actamat.2014.02.042 (Al–Si subsystem).
- V. T. Witusiewicz, U. Hecht, S. G. Fries and S. Rex (2004), J. Alloys Compd. 385, 133–143, https://doi.org/10.1016/j.jallcom.2004.04.126 (Al–Cu).
- S. an Mey (1992), Calphad 16, 255–260, https://doi.org/10.1016/0364-5916(92)90022-P (Cu–Ni).

Statement of changes for derived data: Werkzeugdeck evaluates Gibbs energies and enthalpies with pycalphad, samples lower convex hulls and prepares interpolated solidus/liquidus data. The metastable AL2CU_PRIME phase is excluded from the Al–Cu equilibrium calculation. Derived model files alsi-*, alcu-* and cuni-* retain this CC BY 4.0 attribution. They are numerical transformations, not measured data. PROVENANCE.json records the source hashes.

NaCl–KCl–MgCl2: numerical isotherm controls and approximate reaction boundaries are derived from C. Villada, W. Ding, A. Bonk and T. Bauer (2022), https://doi.org/10.3389/fenrg.2022.809663, Fig. 4 and Tables 1/3 (CC BY). The source PDF/figure is not included. Changes: color calibration, local smoothing, tabulated anchors, lower-temperature constraint, and an explicit geometric maximum-liquid balance with idealized solid phase families. DSC onset/end records remain separate. The NaCl/KCl solid miscibility approximation additionally uses Robelin et al. (2004), Eq. 13, https://doi.org/10.1016/j.jct.2004.04.011.
