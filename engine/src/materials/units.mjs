// Unit conversion for the materials library (lane L2, DevLog-012). Stored units are the units printed in the source;
// the loader converts once to SI. License: GPL-3.0-or-later.

/** Multiplicative factors to SI for each quantity family. */
const FACTORS = {
  modulus: { Pa: 1, MPa: 1e6, GPa: 1e9, '1e12 dyn/cm2': 1e11 }, // 1 dyn/cm2 = 0.1 Pa (Hall 1967 tables; L21)
  cte: { '1/K': 1, 'ppm/K': 1e-6 },
  conductivity: { 'W/mK': 1, 'W/cmK': 100 },
  density: { 'kg/m3': 1, 'g/cm3': 1000 },
  cp: { 'J/kgK': 1, 'kJ/kgK': 1000 },
  dimensionless: { 1: 1, '%': 0.01 },
  electrical_conductivity: { 'S/m': 1, 'MS/m': 1e6 },
  resistivity: { 'ohm m': 1, '1e-8 ohm m': 1e-8, 'uohm cm': 1e-8 },
  temperature: { K: 1, C: 1 }, // offsets handled by toKelvin
};

/** Unit family each property (or sub-quantity) uses. */
export const PROPERTY_FAMILY = {
  density: 'density',
  cp: 'cp',
  k: 'conductivity',
  E: 'modulus',
  G: 'modulus',
  nu: 'dimensionless',
  cte: 'cte',
  tg: 'temperature',
  eps_r: 'dimensionless',
  tan_delta: 'dimensionless',
  sigma: 'electrical_conductivity',
  resistivity: 'resistivity',
  cure_shrinkage: 'dimensionless',
};

export function knownUnit(family, unit) {
  return !!FACTORS[family] && Object.prototype.hasOwnProperty.call(FACTORS[family], String(unit));
}

/** Factor that converts a value in `unit` (of `family`) to SI. Throws on unknown units. */
export function siFactor(family, unit) {
  const f = FACTORS[family];
  if (!f) throw new Error(`materials: unknown unit family '${family}'`);
  const k = String(unit);
  if (!Object.prototype.hasOwnProperty.call(f, k)) {
    throw new Error(`materials: unit '${unit}' not allowed for ${family} (allowed: ${Object.keys(f).join(', ')})`);
  }
  return f[k];
}

export const C_TO_K = 273.15;
export const toKelvin = (T_C) => T_C + C_TO_K;
export const toCelsius = (T_K) => T_K - C_TO_K;
export const EPS0 = 8.8541878128e-12; // F/m (CODATA 2018)
