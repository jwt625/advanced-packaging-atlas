// Materials library public entry (lane L2, DevLog-012; contract sims/SPEC.md section 4). Pure ES module, no Node
// imports: browser and worker code pass the parsed YAML documents to createLibrary({files, sources, aliases}).
// Node code (CLI, tests) uses ./node.mjs, which reads engine/data/materials/*.yaml and exports the same API bound to
// the default library. License: GPL-3.0-or-later.

export { createLibrary, DEFAULT_NEED, SI_ORIENTATIONS, MaterialError } from './library.mjs';
export { cubicDirectionalE, cubicIsotropicAverages, cubicStiffnessRotZ, engineeringConstants, cubicCompliance } from './cubic.mjs';
export { parseHomogKey, COLUMN_KINDS, LAYER_KINDS } from './homogenize.mjs';
export { validateFile, SCHEMA_ID } from './schema.mjs';
export { applyOverrides, unusedOverrideKeys, OVERRIDE_FIELDS, OVERRIDE_STATUSES } from './overrides.mjs';

/**
 * Split parsed data documents into the createLibrary input. `docs` = [{name, doc}] for every file in
 * engine/data/materials/ (`_sources.yaml` and `_aliases.yaml` are recognized by name).
 */
export function libraryInputFromDocs(docs) {
  const files = [];
  let sources = {};
  let aliases = {};
  for (const { name, doc } of docs) {
    const base = name.split('/').pop();
    if (base === '_sources.yaml') sources = doc?.sources ?? {};
    else if (base === '_aliases.yaml') aliases = doc ?? {};
    else files.push({ name: base, doc });
  }
  return { files, sources, aliases };
}
