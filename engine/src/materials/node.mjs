// Materials library, Node helper (lane L2, DevLog-012). Reads every engine/data/materials/*.yaml once (`_sources.yaml`
// = source registry, `_aliases.yaml` = alias map), validates and compiles them, and exports the API bound to that
// default library. Browser code uses ./index.mjs (no Node imports). License: GPL-3.0-or-later.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import YAML from 'yaml';
import { createLibrary } from './library.mjs';
import { createRveResolver } from '../homog/resolver.mjs';
import { libraryInputFromDocs } from './index.mjs';

export * from './index.mjs';

export const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'materials');

/** Parse the data directory into {files, sources, aliases} (no validation). */
export function readDataDir(dir = DATA_DIR) {
  const names = readdirSync(dir)
    .filter((n) => n.endsWith('.yaml'))
    .sort();
  return libraryInputFromDocs(names.map((n) => ({ name: n, doc: YAML.parse(readFileSync(join(dir, n), 'utf8')) })));
}

/**
 * Build a library from a data directory (default: engine/data/materials). CD7: `homog:` keys resolve by the E3 RVE
 * (engine/src/homog/resolver.mjs) unless `{homogenization: 'rom'}`; per call, opts.homogenization overrides.
 */
export const RVE_TABLE_DEFAULT = join(dirname(fileURLToPath(import.meta.url)), '..', 'homog', 'rve_table_defaults.json');

/** The precomputed RVE table shipped by L8 (engine/src/homog/rve_table_defaults.json), or null when absent. */
export function readDefaultRveTable(path = RVE_TABLE_DEFAULT) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
}

export function loadLibrary(dir = DATA_DIR, { homogenization = 'rve', rve = {}, rveTable = 'default' } = {}) {
  const lib = createLibrary(readDataDir(dir));
  // same precomputed RVE table as the browser by default (rveTable: null for live RVE only)
  const table = rve.table ?? (rveTable === 'default' ? readDefaultRveTable() : rveTable);
  if (homogenization === 'rve') lib.attachHomogResolver(createRveResolver, table ? { ...rve, table } : rve);
  else if (homogenization !== 'rom') throw new Error(`materials: homogenization must be rve | rom, got ${homogenization}`);
  return lib;
}

let DEFAULT = null;
/** The default library (lazy, built once). */
export function library() {
  if (!DEFAULT) DEFAULT = loadLibrary();
  return DEFAULT;
}

export const resolve = (key, T_K, opts) => library().resolve(key, T_K, opts);
export const rebaseSecantCte = (entry, Tsf_K, T_K, opts) => library().rebaseSecantCte(entry, Tsf_K, T_K, opts);
export const homogenize = (spec) => library().homogenize(spec);
export const aliasTemplateKey = (k) => library().aliasTemplateKey(k);
export const aliasDbString = (s, materialClass) => library().aliasDbString(s, materialClass);
export const aliasDbStringDetail = (s, materialClass) => library().aliasDbStringDetail(s, materialClass);
export const listTemplateValues = () => library().listTemplateValues();
export const materialKeys = () => library().keys();
export const materialEntry = (k) => library().entry(k);
export const alternativesOf = (k) => library().alternativesOf(k);
