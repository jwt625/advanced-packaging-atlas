// License: GPL-3.0-or-later.
// Node-only helper: read app/static/data/package3d.json (path relative to this file) and generate().
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate as gen, check as chk } from './index.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_PACKAGE3D = resolve(here, '../../../app/static/data/package3d.json');

let cache = null;
export function loadPackage3d(path = DEFAULT_PACKAGE3D, { fresh = false } = {}) {
  if (!cache || fresh || path !== DEFAULT_PACKAGE3D) {
    const j = JSON.parse(readFileSync(path, 'utf8'));
    if (path !== DEFAULT_PACKAGE3D) return j;
    cache = j;
  }
  return cache;
}

export function generateNode(familyId, overrides = {}, opts = {}) {
  return gen(familyId, overrides, { data: opts.data || loadPackage3d(), ...opts });
}

export function checkNode(familyId, overrides = {}, opts = {}) {
  return chk(familyId, overrides, { data: opts.data || loadPackage3d(), ...opts });
}
