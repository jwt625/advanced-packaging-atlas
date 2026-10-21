// EM 2D cross-section solver (lane L7, tranche E5): public API. License: GPL-3.0-or-later.
export { runEm2d, parseEm2dCase, applyPatch, sweepFrequencies, Em2dCaseError } from './run.mjs';
export { buildSection } from './section.mjs';
export { makeMaterials, makeDielectric, dsBasis, nnls } from './dielectric.mjs';
export { makeRoughness, cannonballParams } from './roughness.mjs';
export { prepareRlgc, rlgcAt, rlgcSweep, vacuumCapacitance } from './rlgc.mjs';
export * as mtl from './mtl.mjs';
export * as closedForms from './closed-forms.mjs';
export { writeTouchstone, readTouchstone } from './touchstone.mjs';
export { CMat } from './dense.mjs';
