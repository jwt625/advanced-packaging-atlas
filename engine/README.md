# ap-sim-engine

Browser-native 3D simulation engine for the Advanced Packaging Atlas `/sim` workbench (plan: DevLog-010; implementation
and lane ownership: DevLog-012). Dependency-free ES modules (plus `yaml`); the same code runs in a Web Worker and in Node
(CLI, tests, bench). GPL-3.0-or-later; several modules are ported from the eo-modulator-atlas engine (each ported file
names its source path and commit in its header).

| Path | Contents | Lane |
|---|---|---|
| `src/la/` | sparse symmetric pattern, orderings, supernodal Cholesky, LDL^T, complex (ported), PCG, multigrid | E1 |
| `src/params/` | parameter expressions and units (ported) | E1 |
| `src/grid/` | rectilinear grid aligned to box boundaries; cell material/part maps; named boundary selections | E1 |
| `src/thermal/` | steady heat conduction (Q1 hex), BCs, sources, energy balance | E1 |
| `src/mech/` | thermo-elasticity (wave 2) | E2 |
| `src/materials/` + `data/materials/` | materials library loader and data | D1 |
| `src/families/` | parameterized package-family generators (box parts with provenance) | D2 |
| `src/em2d/` | 2D cross-section multiconductor RLGC(f), MTL cascade, Touchstone | E5 |

```sh
pnpm install          # yaml only
pnpm test             # node --test
node cli.mjs <sims/<family>/<case>.yaml>
```

Units: SI internally (m, K, W, Pa, S/m). Config files use explicit unit suffixes (`_mm`, `_um`, `_C`, `_W`).
Solver outputs are never committed; logs and benchmarks go to `../logs/` with timestamped filenames.
