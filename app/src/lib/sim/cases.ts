// Case configs (sims/<family>/<case>.yaml, SPEC 1) bundled at dev and build time through import.meta.glob: every case
// is a lazy chunk, nothing is copied into app/static/ and no build hook is needed.
const FILES = import.meta.glob('../../../../sims/*/*.yaml', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;

export interface CaseEntry {
	/** `<family>/<case>` (path under sims/ without .yaml). */
	id: string;
	family: string;
	load: () => Promise<string>;
}

export const CASES: CaseEntry[] = Object.entries(FILES)
	.map(([path, load]) => {
		const m = path.match(/sims\/([^/]+)\/([^/]+)\.yaml$/);
		return m ? { id: `${m[1]}/${m[2]}`, family: m[1], load } : null;
	})
	.filter((c): c is CaseEntry => c !== null)
	.sort((a, b) => a.id.localeCompare(b.id));

/** In-memory case text for a family without a case file (status draft; params empty = family defaults). */
export function familyCaseText(family: string, title: string): string {
	return [
		'schema: ap-sim/0',
		`id: ${family}/session`,
		`title: ${JSON.stringify(`${title}, family defaults (no case file)`)}`,
		'status: draft',
		`family: ${family}`,
		'params: {}',
		''
	].join('\n');
}
