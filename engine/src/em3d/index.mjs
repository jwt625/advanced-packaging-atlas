// EM 3D block solver (lane L7, tranche E6 phase 1): public API. License: GPL-3.0-or-later.
export { runEm3d, parseEm3dCase, Em3dCaseError } from './run.mjs';
export { buildLayeredMesh, FRAMES } from './mesh.mjs';
export { prepare3d, solveAt } from './solver.mjs';
export { starProduct, s2abcd, abcd2s, lineFromAbcd } from './cascade.mjs';
