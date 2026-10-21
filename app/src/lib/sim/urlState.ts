// Ported from eo-modulator-atlas app/src/lib/sim/urlState.ts at eb97f96 (GPL-3.0-or-later).
// Local changes: packaging grammar (R7 6.5): case id or family, YAML path overrides (`set`, same as EO), study,
// tree node, camera preset, section clip, z-exaggeration, deformation scale and worker pool. EO section, mesh level
// and stage keys removed. Query parameters (not hash): /sim is a workbench page; /3d keeps `#f=`.
import { coerce } from './yamlEdit';

export type ViewPreset = 'iso' | 'front' | 'top' | 'right';
export const VIEW_PRESETS: ViewPreset[] = ['iso', 'front', 'top', 'right'];

export interface SimUrlState {
	/** Case id (`cowos_l/warpage_rt_ht`, the path under sims/ without .yaml). */
	caseId: string | null;
	/** Family id for a family-only session (no case file). */
	family: string | null;
	overrides: [string, number | string][];
	study: string | null;
	node: string | null;
	view: ViewPreset | null;
	clip: { axis: 'x' | 'y'; pos_mm: number } | null;
	kz: number | null;
	dscale: number | null;
	/** Packed case text (linkText.ts) of an in-memory case. */
	text?: string | null;
}

export function readUrlState(params: Pick<URLSearchParams, 'get' | 'getAll'>): SimUrlState {
	const overrides: [string, number | string][] = [];
	for (const s of params.getAll('set')) {
		const k = s.indexOf('=');
		if (k > 0) overrides.push([s.slice(0, k), coerce(s.slice(k + 1))]);
	}
	const num = (k: string) => {
		const v = params.get(k);
		return v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null;
	};
	const view = params.get('view');
	const clip = params.get('clip')?.match(/^([xy]):(-?[\d.eE+-]+)$/);
	return {
		caseId: params.get('case'),
		family: params.get('fam'),
		overrides,
		study: params.get('study'),
		node: params.get('node'),
		view: view && (VIEW_PRESETS as string[]).includes(view) ? (view as ViewPreset) : null,
		clip: clip && Number.isFinite(Number(clip[2])) ? { axis: clip[1] as 'x' | 'y', pos_mm: Number(clip[2]) } : null,
		kz: num('kz'),
		dscale: num('dscale'),
		text: params.get('text')
	};
}

export function writeUrlState(s: SimUrlState): string {
	const p = new URLSearchParams();
	if (s.caseId) p.set('case', s.caseId);
	else if (s.family) p.set('fam', s.family);
	for (const [k, v] of s.overrides) p.append('set', `${k}=${v}`);
	if (s.study) p.set('study', s.study);
	if (s.node && s.node !== 'model') p.set('node', s.node);
	if (s.view && s.view !== 'iso') p.set('view', s.view);
	if (s.clip) p.set('clip', `${s.clip.axis}:${s.clip.pos_mm}`);
	if (s.kz != null && s.kz !== 1) p.set('kz', String(s.kz));
	if (s.dscale != null) p.set('dscale', String(s.dscale));
	if (s.text) p.set('text', s.text);
	return p.toString();
}
