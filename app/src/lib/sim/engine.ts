// Thin adapter between the /sim workbench and the engine lanes (engine/src/*, DevLog-012): detects which lane modules
// exist at dev/build time (import.meta.glob), calls them through the SPEC contracts and falls back to a fixture built
// from app/static/data/package3d.json while a module is absent. No physics here.
import type { Family } from '../three/types';
import { evaluateExpression, isExpression } from './expr';
import { parse } from 'yaml';
import type { GenWarning, Generated, ParamEntry, ParamStatus, Preset, SimPart } from './protocol';

// Browser entries: every lane's index.mjs is Node-free (Node helpers live in node.mjs); the browser builds the
// materials library with createLibrary() from the bundled data files (L2 design).
const MODS = import.meta.glob(['../../../../engine/src/{families,grid,thermal,materials,mech,em2d,em3d}/index.mjs', '../../../../engine/src/{thermal,mech}/case.mjs', '../../../../engine/src/homog/resolver.mjs']) as Record<string, () => Promise<Record<string, unknown>>>;
/** Precomputed RVE table of the family defaults (L8; served instead of live RVE solves within its tolerance). */
const RVE_TABLE = import.meta.glob('../../../../engine/src/homog/rve_table_defaults.json', { import: 'default' }) as Record<string, () => Promise<unknown>>;
const MAT_DATA = import.meta.glob('../../../../engine/data/materials/*.yaml', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;

export type ModuleName = 'families' | 'grid' | 'thermal' | 'materials' | 'mech' | 'thermalCase' | 'mechCase' | 'em2d' | 'em3d' | 'homog';
const ENTRY: Record<ModuleName, string> = { families: 'families/index.mjs', grid: 'grid/index.mjs', thermal: 'thermal/index.mjs', mech: 'mech/index.mjs', materials: 'materials/index.mjs', thermalCase: 'thermal/case.mjs', mechCase: 'mech/case.mjs', em2d: 'em2d/index.mjs', em3d: 'em3d/index.mjs', homog: 'homog/resolver.mjs' };
const key = (name: ModuleName) => `../../../../engine/src/${ENTRY[name]}`;
export const MODULE_LANE: Record<ModuleName, string> = {
	families: 'L3 (D2 family generators)',
	grid: 'L1 (E1 grid)',
	thermal: 'L1 (E1 steady thermal)',
	materials: 'L2 (D1 materials library)',
	mech: 'E2 (thermo-elasticity, wave 2)',
	thermalCase: 'L1 (case runner)',
	mechCase: 'L8 (mechanics case runner)',
	em2d: 'L7 (E5 EM 2D)',
	em3d: 'L7 (E6 EM 3D block)',
	homog: 'E3 RVE homogenization'
};

export function hasModule(name: ModuleName): boolean {
	return key(name) in MODS && (name !== 'materials' || Object.keys(MAT_DATA).length > 0);
}

/** Number of material data files in this build (engine/data/materials/*.yaml). */
export const materialFileCount = (): number => Object.keys(MAT_DATA).length;

let libPromise: Promise<Record<string, unknown>> | null = null;
/** Homogenization path of the library in this context: precomputed table (with live fallback) or live RVE. */
export let rveMode: 'table' | 'live' | 'none' = 'none';
let rvePreferLive = false;
/** Worker: use the live RVE resolver instead of the table (page `?rve=live`, for measurements); resets the cached library. */
export function setRvePreference(live: boolean) {
	if (live !== rvePreferLive) libPromise = null;
	rvePreferLive = live;
}
/** Material library built in the browser: createLibrary({files, sources, aliases}) from the bundled YAML (L2). */
export function materialLibrary(): Promise<Record<string, unknown>> {
	if (libPromise) return libPromise;
	libPromise = (async () => {
		const mod = loadModule('materials');
		if (!mod) throw new Error('engine/src/materials/index.mjs or engine/data/materials/*.yaml is not in this build');
		const m = await mod;
		const files: { name: string; doc: unknown }[] = [];
		let sources: unknown = {};
		let aliases: unknown = {};
		for (const [path, load] of Object.entries(MAT_DATA).sort(([a], [b]) => a.localeCompare(b))) {
			const name = path.slice(path.lastIndexOf('/') + 1);
			const doc = parse(await load()) as Record<string, unknown>;
			if (name === '_sources.yaml') sources = doc?.sources ?? {};
			else if (name === '_aliases.yaml') aliases = doc;
			else files.push({ name, doc });
		}
		const create = m.createLibrary as ((d: unknown) => Record<string, unknown>) | undefined;
		if (typeof create !== 'function') throw new Error('materials: createLibrary is not exported (API not landed yet)');
		const lib = create({ files, sources, aliases });
		// same default as the Node loader (materials/node.mjs loadLibrary, CD7): homog: keys resolve by the E3 RVE
		// with the precomputed table of the family defaults (L8) unless `?rve=live` (measurements); misses fall back to live
		const hm = loadModule('homog');
		if (hm && typeof lib.attachHomogResolver === 'function') {
			const h = await hm;
			const live = rvePreferLive;
			const loadT = Object.values(RVE_TABLE)[0];
			const table = !live && loadT ? await loadT().catch(() => null) : null;
			rveMode = table ? 'table' : 'live';
			const create = h.createRveResolver as (view: unknown, cfg: Record<string, unknown>) => unknown;
			if (typeof create === 'function') (lib.attachHomogResolver as (f: unknown, o: unknown) => void)(table ? (view: unknown, cfg: Record<string, unknown>) => create(view, { ...cfg, table }) : create, {});
		}
		return lib;
	})();
	libPromise.catch(() => (libPromise = null));
	return libPromise;
}

/** Present engine modules (file exists under engine/src/<name>/index.mjs at dev/build time). */
export function engineStatus(): Record<ModuleName, boolean> {
	return { families: hasModule('families'), grid: hasModule('grid'), thermal: hasModule('thermal'), materials: hasModule('materials'), mech: hasModule('mech'), thermalCase: hasModule('thermalCase'), mechCase: hasModule('mechCase'), em2d: hasModule('em2d'), em3d: hasModule('em3d'), homog: hasModule('homog') };
}

const loaded = new Map<string, Promise<Record<string, unknown>>>();
export function loadModule(name: ModuleName): Promise<Record<string, unknown>> | null {
	const k = key(name);
	if (!MODS[k]) return null;
	if (!loaded.has(k)) loaded.set(k, MODS[k]());
	return loaded.get(k)!;
}

/** Why a study type cannot run in this build (null = runnable). */
export function studyBlockReason(type: string): string | null {
	const st = engineStatus();
	const need = (names: ModuleName[]) => names.filter((n) => !st[n]).map((n) => `engine/src/${n} (${MODULE_LANE[n]})`);
	if (type === 'thermal_stationary' || type === 'thermal_transient') {
		// the run uses the previewed part list (generator or fixture), so families is not required here
		const miss = need(type === 'thermal_transient' ? ['grid', 'thermal', 'materials', 'thermalCase', 'families'] : ['grid', 'thermal', 'materials']);
		return miss.length ? `Not in this build yet: ${miss.join(', ')}` : null;
	}
	if (type === 'thermo_elastic' || type === 'process_sequence') {
		const miss = need(['families', 'grid', 'materials', 'mech', 'mechCase']);
		return miss.length ? `Not in this build yet: ${miss.join(', ')}` : null;
	}
	if (type === 'em2d' || type === 'em3d') {
		const miss = need([type]);
		return miss.length ? `Not in this build yet: ${miss.join(', ')}` : null;
	}
	return `Study type ${type} is not supported by this workbench`;
}

// ---- parameter / provenance helpers ------------------------------------------------------------------------------

const STATUS_SET = new Set<ParamStatus>(['reported', 'derived', 'public', 'template', 'user']);
const asStatus = (s: unknown): ParamStatus => (STATUS_SET.has(s as ParamStatus) ? (s as ParamStatus) : 'template');

function normWarnings(w: unknown): GenWarning[] {
	if (!Array.isArray(w)) return [];
	return w.map((x) => {
		if (typeof x === 'string') return { severity: 'warn', message: x } as GenWarning;
		const o = (x ?? {}) as Record<string, unknown>;
		const sev = o.severity === 'error' || o.severity === 'info' ? o.severity : o.level === 'error' || o.level === 'info' ? o.level : 'warn';
		return { ...o, severity: sev, message: String(o.message ?? o.msg ?? JSON.stringify(o)), param: typeof o.param === 'string' ? o.param : undefined } as GenWarning;
	});
}

function normParams(p: unknown): Record<string, ParamEntry> {
	const out: Record<string, ParamEntry> = {};
	if (!p || typeof p !== 'object') return out;
	for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
		if (v && typeof v === 'object' && 'value' in (v as object)) {
			const e = v as Record<string, unknown>;
			out[k] = { ...(e as object), value: e.value as ParamEntry['value'], status: asStatus(e.status) } as ParamEntry;
		} else out[k] = { value: v as ParamEntry['value'], status: 'template' };
	}
	return out;
}

/** Arrays with a footprint and a z extent become homogenized boxes (SPEC 2), unless already listed as parts. */
function arrayBoxes(arrays: unknown, have: Set<string>): SimPart[] {
	if (!Array.isArray(arrays)) return [];
	const out: SimPart[] = [];
	for (const a of arrays as Record<string, unknown>[]) {
		const r = a.region as Record<string, number> | undefined;
		const z = Number(a.z_um), h = Number(a.h_um ?? a.height_um);
		if (!r || !Number.isFinite(z) || !(h > 0) || have.has(String(a.id))) continue;
		out.push({
			id: String(a.id), name: typeof a.name === 'string' ? a.name : undefined, kind: String(a.kind), array: true,
			material: typeof a.material === 'string' && a.material.startsWith('homog:') ? a.material : `homog:${String(a.kind)}`,
			x_mm: r.x_mm, y_mm: r.y_mm, w_mm: r.w_mm, d_mm: r.d_mm, z_um: z, h_um: h,
			dims: (a.dims as SimPart['dims']) ?? {}, pitch_um: a.pitch_um, diameter_um: a.diameter_um
		});
	}
	return out;
}

/**
 * Fixture generator: package3d.json family parameters and parts. User overrides set status `user`; derived and
 * template entries with a `formula` over `inputs` are re-evaluated (ported expression parser) so their Value column
 * follows the inputs. The part list is the published default: geometry does not follow parameter edits here.
 */
export function fixtureGenerate(fam: Family & { params?: Record<string, unknown> }, overrides: Record<string, unknown>): Generated {
	const t0 = performance.now();
	const params = normParams(fam.params ?? {});
	const warnings: GenWarning[] = [];
	for (const [k, v] of Object.entries(overrides)) {
		const e = params[k];
		if (!e) {
			warnings.push({ severity: 'error', message: `Unknown parameter ${k} for family ${fam.id}`, param: k });
			continue;
		}
		const num = typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : v;
		params[k] = { ...e, value: num as ParamEntry['value'], status: 'user', original: { value: e.value, status: e.status } };
		if (isExpression(num)) params[k].expr = num;
	}
	// user expressions ("=expr", EO params grammar) over the other parameter values
	for (const [k, e] of Object.entries(params)) {
		if (typeof e.expr !== 'string') continue;
		const vals: Record<string, number> = {};
		for (const [n, x] of Object.entries(params)) if (n !== k && typeof x.value === 'number') vals[n] = x.value;
		try {
			params[k] = { ...e, value: evaluateExpression(e.expr.slice(1), vals) };
		} catch (err) {
			warnings.push({ severity: 'error', message: `${k}: ${err instanceof Error ? err.message : String(err)}`, param: k });
		}
	}
	// re-evaluate formulas (a few passes for chains); entries that do not evaluate keep their published value
	for (let pass = 0; pass < 4; pass++) {
		const vals: Record<string, number> = {};
		for (const [k, e] of Object.entries(params)) if (typeof e.value === 'number') vals[k] = e.value;
		let changed = false;
		for (const [k, e] of Object.entries(params)) {
			if (e.status === 'user' || !e.formula || !e.inputs?.length) continue;
			try {
				const v = evaluateExpression(e.formula, vals);
				// published values are rounded (e.g. 18.5667 for 18.56667): only a relative change above 1e-4 counts
				if (typeof e.value === 'number' && Math.abs(v - e.value) > 1e-4 * Math.max(1e-12, Math.abs(v))) {
					params[k] = { ...e, value: Number(v.toPrecision(10)), reevaluated: true };
					changed = true;
				}
			} catch {
				/* formula over names that are not parameters (e.g. analog values r0, r1): keep the published value */
			}
		}
		if (!changed) break;
	}
	const parts: SimPart[] = fam.parts.map((p) => ({ ...p, dims: (p.dims ?? {}) as SimPart['dims'] }));
	parts.push(...arrayBoxes(fam.arrays, new Set(parts.map((p) => p.id))));
	if (Object.keys(overrides).length)
		warnings.push({ severity: 'info', message: 'Fixture geometry: parts are the published package3d.json defaults; parameter edits update the Parameters table and the case YAML, and regenerate geometry once engine/src/families (lane L3) is in the build.' });
	return { params, parts, layers: (fam.layers ?? []) as unknown as Rec[], warnings, source: 'fixture', note: 'package3d.json defaults (no family generator in this build)', ms: performance.now() - t0 };
}

/** Constraint errors of the family generator (GeneratorError issues), kept apart from a thrown bug. */
export class GenerationIssues extends Error {
	constructor(message: string, readonly issues: GenWarning[]) {
		super(message);
	}
}

type Rec = Record<string, unknown>;

/**
 * Grid input boxes of the generator (`boxes`: parts, layer boxes, homogenized array boxes; L3 additive output) with
 * the dims of their source attached for provenance display: part -> its dims; layer -> host w, d and layer h;
 * array -> the array's pitch, diameter, height.
 */
function boxesWithDims(out: Rec): SimPart[] {
	const parts = (Array.isArray(out.parts) ? out.parts : []) as Rec[];
	const boxes = (Array.isArray(out.boxes) ? out.boxes : null) as Rec[] | null;
	if (!boxes) {
		const ps = parts as unknown as SimPart[];
		return [...ps, ...arrayBoxes(out.arrays, new Set(ps.map((p) => p.id)))];
	}
	const byId = (list: unknown) => new Map(((Array.isArray(list) ? list : []) as Rec[]).map((x) => [String(x.id), x]));
	const P = byId(parts), L = byId(out.layers), A = byId(out.arrays);
	return boxes.map((b) => {
		const src = b.source;
		let dims: Rec = {};
		if (src === 'part') dims = (P.get(String(b.id))?.dims as Rec) ?? {};
		else if (src === 'layer') {
			const host = (P.get(String(b.host))?.dims as Rec) ?? {};
			const lay = (L.get(String(b.layer))?.dims as Rec) ?? {};
			dims = { w_mm: host.w_mm, d_mm: host.d_mm, h_um: lay.h_um };
		} else if (src === 'array') dims = (A.get(String(b.id))?.dims as Rec) ?? {};
		return { ...(b as object), array: src === 'array' ? true : undefined, template_array: src === 'array' ? b.array : undefined, dims } as unknown as SimPart;
	});
}

/** Family generator (SPEC 2) when engine/src/families exists, else the fixture. */
export async function generate(familyId: string, overrides: Record<string, unknown>, fam: (Family & { params?: Record<string, unknown> }) | null, data: unknown = null): Promise<Generated> {
	const mod = loadModule('families');
	if (mod) {
		const t0 = performance.now();
		const m = await mod;
		const fn = m.generate as ((id: string, p: Record<string, unknown>, o: { data: unknown }) => unknown) | undefined;
		const known = typeof m.listFamilies === 'function' ? ((m.listFamilies as () => string[])() ?? []) : null;
		if (typeof fn === 'function' && (!known || known.includes(familyId))) {
			let out: Rec;
			try {
				out = (await fn(familyId, overrides, { data })) as Rec;
			} catch (e) {
				const issues = (e as { issues?: unknown }).issues;
				if (Array.isArray(issues)) throw new GenerationIssues(e instanceof Error ? e.message : String(e), normWarnings(issues).map((w) => ({ ...w, severity: w.severity === 'warn' ? 'error' : w.severity })));
				throw e;
			}
			return { params: normParams(out.params), parts: boxesWithDims(out), layers: (out.layers ?? []) as Rec[], warnings: normWarnings(out.warnings), source: 'engine', note: `engine/src/families ${String(out.generator ?? '')}`.trim(), ms: performance.now() - t0 };
		}
	}
	if (!fam) throw new Error(`Family ${familyId} is not in package3d.json and has no generator in this build`);
	const g = fixtureGenerate(fam, overrides);
	if (mod) g.note = `package3d.json defaults (engine/src/families has no generator for ${familyId})`;
	return g;
}

/** Product presets of a family (L3; DevLog-010 Decision 5: primary-source facts only, every other value template). */
export async function presets(familyId: string): Promise<Preset[]> {
	const mod = loadModule('families');
	if (!mod) return [];
	const m = await mod;
	let raw: unknown = null;
	if (typeof m.presets === 'function') raw = await (m.presets as (id: string) => unknown)(familyId);
	else if (m.PRESETS && typeof m.PRESETS === 'object')
		raw = Object.fromEntries(Object.entries(m.PRESETS as Record<string, Rec>).filter(([, v]) => v?.family === familyId));
	if (!raw) return [];
	const list = Array.isArray(raw) ? raw : Object.entries(raw as Record<string, unknown>).map(([id, v]) => ({ id, ...(v as object) }));
	return (list as Record<string, unknown>[]).map((p) => ({
		id: String(p.id), label: String(p.label ?? p.title ?? p.id), params: (p.params ?? {}) as Record<string, unknown>,
		refs: Array.isArray(p.refs) ? (p.refs as string[]) : undefined, note: typeof p.note === 'string' ? p.note : undefined
	}));
}
