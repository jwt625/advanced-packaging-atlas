// Worker-side engine pipeline for one case study (runs inside sim.worker.ts). Generator families: the case runner
// engine/src/thermal/case.mjs runCaseAll (lane L10; thermal, thermo_elastic and process_sequence studies, as the CLI);
// EM cases: runEm2d / runEm3d (L7); families without a generator: the UI chain (grid buildGrid + thermal solveThermal
// on the previewed parts). Mechanics packing: mechPack.ts. Kept free of DOM APIs.
// License: GPL-3.0-or-later.
import { parse as parseYaml } from 'yaml';
import { loadModule, materialLibrary, rveMode, type ModuleName } from './engine';
import { packMech, tableOnly, type PackOpts, type RunOut } from './mechPack';
import type { SimPart, ThermalResult } from './protocol';

export type { RunOut } from './mechPack';

type Fn = (...a: unknown[]) => unknown;
type Progress = (phase: string, message: string) => void;
type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function need(name: ModuleName): Promise<Record<string, unknown>> {
	const m = loadModule(name);
	if (!m) throw new Error(`engine/src/${name}/index.mjs is not in this build`);
	return m;
}

function pick(mod: Record<string, unknown>, names: string[], what: string): Fn {
	for (const n of names) if (typeof mod[n] === 'function') return mod[n] as Fn;
	throw new Error(`${what}: none of ${names.join(', ')} is exported (API not landed yet)`);
}

/**
 * Library key of a part.
 * - SPEC 1 materials.map: part id, then part kind, then template material key; the map also applies to the
 *   constituents of homogenized keys (UI extension, reported as a contract request).
 * - Else the key itself when the library knows it, else the library alias of the template key (aliasTemplateKey ->
 *   {key, rationale}; it throws for keys that must be mapped per part).
 * - Homogenized keys `homog:<kind>:<incl>+<matrix>:<f>`: constituents aliased as above; generator kinds the library
 *   does not know (layer_pad / layer_signal / layer_plane / layer_mixed, tmv) are rewritten to `rdl_layer` (layers) or
 *   `via_field` (columns) and listed in `notes` (L2/L3 vocabulary mismatch at 2026-10-20).
 */
export function materialOf(map: Record<string, string> | undefined, lib: Record<string, unknown> | null, notes: Set<string> = new Set()): (p: SimPart) => string {
	const m = map ?? {};
	const keys = new Set(lib && typeof lib.keys === 'function' ? ((lib.keys as () => string[])() ?? []) : []);
	const aliasFn = lib && typeof lib.aliasTemplateKey === 'function' ? (lib.aliasTemplateKey as (k: string) => string | { key: string }) : null;
	const kinds = new Set<string>([...((lib?.COLUMN_KINDS as string[]) ?? []), ...((lib?.LAYER_KINDS as string[]) ?? [])]);
	const alias = (k: string): string => {
		if (m[k]) return m[k];
		if (keys.has(k) || !aliasFn || k === 'void') return k;
		const a = aliasFn(k);
		return typeof a === 'string' ? a : a.key;
	};
	return (p) => {
		const direct = m[p.id] ?? m[p.kind];
		if (direct) return direct;
		if (p.material.startsWith('homog:')) {
			const s = p.material.split(':');
			if (kinds.size && !kinds.has(s[1])) {
				const to = s[1].startsWith('layer_') ? 'rdl_layer' : 'via_field';
				notes.add(`homogenized kind ${s[1]} -> ${to} (library kinds: ${[...kinds].join(', ')})`);
				s[1] = to;
			}
			s[2] = s[2].split('+').map(alias).join('+');
			return s.join(':');
		}
		return alias(p.material);
	};
}

const EMPTY_GRID = () => ({ xs: new Float64Array(0), ys: new Float64Array(0), zs: new Float64Array(0), nx: 0, ny: 0, nz: 0 });

/**
 * RVE homogenization use of one run (audit A3 M1): L11 lib.homogStats() counters summed over the base library and
 * every library the run derived through applyOverrides (case / study / sensitivity overrides re-attach their own
 * resolver with their own counters); RVE -> ROM fallbacks over the attachment family, counted once.
 */
function homogUsage(baseLib: Rec, derived: Rec[]): ThermalResult['homog'] {
	if (typeof baseLib?.homogStats !== 'function') return null;
	const counts: Record<string, number> = {};
	let libraries = 0;
	for (const L of [baseLib, ...derived]) {
		let st: Rec | null = null;
		try {
			st = typeof L?.homogStats === 'function' ? (L.homogStats() as Rec | null) : null;
		} catch {
			st = null;
		}
		if (!st) continue;
		libraries++;
		for (const [k, v] of Object.entries(st)) if (typeof v === 'number' && k !== 'rom_fallback') counts[k] = (counts[k] ?? 0) + v;
	}
	if (!libraries) return null;
	let fam: Rec | null = null;
	try {
		fam = baseLib.homogStats({ family: true }) as Rec | null;
	} catch {
		fam = null;
	}
	return {
		table_loaded: rveMode === 'table', libraries, counts,
		rom_fallback: Number(fam?.rom_fallback ?? 0), rom_fallback_keys: (fam?.rom_fallback_keys ?? []) as string[], rom_fallback_events: ((fam?.rom_fallback_events ?? []) as Rec[]).slice(0, 20)
	};
}

/** EM cases (SPEC 9 em2d, SPEC 14 em3d): the engine entry runs every variant; results are JSON (no fields). */
async function runEm(cfg: Rec, onProgress: Progress): Promise<RunOut> {
	const fam = cfg.family as 'em2d' | 'em3d';
	const mod = await need(fam);
	const fn = pick(mod, [fam === 'em2d' ? 'runEm2d' : 'runEm3d'], fam);
	onProgress('solve', `${fam}: all variants`);
	const t0 = performance.now();
	// progress: L7 events (SPEC 14.3: stages mesh, setup, ready, frequency, frequency_done, em3d factor {fraction});
	// per-frequency time from frequency_done.ms, ETA over the rest of this variant and the variants still to run
	const nVar = 1 + ((cfg[fam]?.variants ?? []) as unknown[]).length;
	const seen: string[] = [];
	const steps: number[] = [];
	const report = (m: unknown) => {
		if (typeof m === 'string') return onProgress('solve', m);
		const o = (m ?? {}) as Rec;
		const v = String(o.variant ?? 'base');
		if (!seen.includes(v)) seen.push(v);
		const vi = seen.indexOf(v) + 1, tagV = `[${v} ${vi}/${nVar}]`;
		const i = Number(o.i), n = Number(o.n);
		const mean = steps.length ? steps.slice(-8).reduce((a, b) => a + b, 0) / Math.min(8, steps.length) : NaN;
		const eta = (done: number) => (Number.isFinite(mean) && n > 0 ? `, ETA ${((((n - done) + (nVar - vi) * n) * mean) / 1000).toFixed(1)} s` : '');
		switch (o.stage) {
			case 'mesh': return onProgress('mesh', `${tagV} mesh`);
			case 'setup': return onProgress('mesh', `${tagV} setup ${o.tets != null ? `${o.tets} tets` : ''} ${o.ms != null ? `(${Math.round(o.ms)} ms)` : ''}`.trim());
			case 'ready': return onProgress('setup', `${tagV} ready: ${o.dof ?? `${o.dof_es} + ${o.dof_mqs}`} DOF, ${n} frequencies`);
			case 'frequency': return onProgress('tick', `${tagV} f ${i + 1}/${n} (${o.f_GHz} GHz)${eta(i)}`);
			case 'frequency_done': {
				if (Number.isFinite(Number(o.ms))) steps.push(Number(o.ms));
				const m2 = steps.slice(-8).reduce((a, b) => a + b, 0) / Math.min(8, steps.length);
				return onProgress('solve', `${tagV} f ${i + 1}/${n} ${o.f_GHz} GHz done in ${Math.round(Number(o.ms))} ms (mean ${Math.round(m2)} ms)${eta(i + 1)}`);
			}
			case 'factor': return onProgress('tick', `${tagV} f ${i + 1}/${n}: factorization ${Math.round(100 * Number(o.fraction ?? 0))} %`);
			default: return onProgress('tick', `${tagV} ${String(o.stage ?? '')}`);
		}
	};
	const res = (await fn(cfg, { log: report, onProgress: report })) as Rec;
	const variants = (res.variants ?? [res]) as Rec[];
	const targets = variants.flatMap((v) => ((v.targets ?? []) as Rec[]).map((x) => ({ ...x, variant: v.variant })));
	return {
		result: { study: 'em', type: fam === 'em2d' ? 'em2d_rlgc' : 'em3d_sparams', grid: EMPTY_GRID(), fields: {}, derived: {}, timing: { total_ms: performance.now() - t0 }, warnings: variants.flatMap((v) => (v.warnings ?? []) as string[]), targets, runner: `engine/src/${fam} ${fam === 'em2d' ? 'runEm2d' : 'runEm3d'}`, em: res },
		grid: null,
		T: null
	};
}

/** k diagonal per cell from the case resolver at the cell-mean T (cached per material and 1 K); 3 x 3 tensors -> diagonal. */
function kOfGrid(g: Rec, resolve: Fn): (cell: number, T_K: number) => number[] {
	const cache = new Map<string, number[]>();
	const mats = (g.materials ?? []) as string[], cm = g.cellMat as Int32Array | undefined;
	return (cell, T_K) => {
		const mi = cm ? cm[cell] : -1;
		const key = `${mi}:${Math.round(T_K)}`;
		const hit = cache.get(key);
		if (hit) return hit;
		let k = [NaN, NaN, NaN];
		try {
			const r = resolve(mats[mi], Math.round(T_K), { need: ['k'] }) as Rec;
			const K = r.k_W_mK;
			k = Array.isArray(K?.[0]) ? [K[0][0], K[1][1], K[2][2]] : Array.isArray(K) ? K : [K, K, K];
		} catch {
			/* no k: arrows of this cell are NaN */
		}
		cache.set(key, k);
		return k;
	};
}

/** Result fields kept for the page and the worker session from one SPEC 5 result with its grid (guarded). */
function pack(r: Rec, g: Rec | null | undefined, partMat: (p: SimPart) => string, extraWarnings: string[], runner: string, targets?: Rec[]): RunOut {
	const T = (r?.fields?.T_K instanceof Float64Array ? r.fields.T_K : null) as Float64Array | null;
	const okGrid = !!g && g.nx > 0 && g.ny > 0 && g.nz > 0 && !!g.xs && !!g.ys && !!g.zs && !!g.cellPart;
	const gp = (okGrid ? (g!.parts ?? []) : []) as SimPart[];
	const warnings = [...((r?.warnings ?? []) as string[]), ...extraWarnings];
	if (!okGrid) warnings.push('results: no grid in the thermal result: table-only view');
	else if (!T) warnings.push('results: no temperature field (fields.T_K) in the thermal result: table-only view');
	const result: ThermalResult = {
		study: r?.study, type: r?.type, runner, targets,
		// copies travel to the page; the worker keeps the originals for postprocessing
		grid: okGrid
			? {
					xs: Float64Array.from(g!.xs), ys: Float64Array.from(g!.ys), zs: Float64Array.from(g!.zs), nx: g!.nx, ny: g!.ny, nz: g!.nz, stats: g!.stats,
					cellPart: Int32Array.from(g!.cellPart), partIds: gp.map((p) => p.id), partMats: gp.map((p) => { try { return partMat(p); } catch { return p.material; } })
				}
			: { ...EMPTY_GRID(), cellPart: new Int32Array(0), partIds: [], partMats: [] },
		fields: { T_K: T ? Float64Array.from(T) : undefined },
		derived: r?.derived ?? {}, timing: r?.timing ?? {}, warnings,
		probes: r?.probes as ThermalResult['probes']
	};
	if (!okGrid || !T) return { result, grid: null, T: null };
	return { result, grid: { xs: g!.xs, ys: g!.ys, zs: g!.zs, nx: g!.nx, ny: g!.ny, nz: g!.nz, cellPart: g!.cellPart }, T };
}

/**
 * Resolver of the thermal solve of one study, rebuilt as engine/src/thermal/case.mjs runCase builds it (audit A3 S5):
 * study materials.overrides merged over the case level (studyOverrides) through a new libraryAdapter, then
 * extrapolatingResolver with the effective allow_extrapolation (allowOf). Used for the heat-flux arrows.
 */
function studyResolver(cm: Rec, cfg: Rec, studyId: string, lib: Rec, ad: Rec, applyOverrides: Fn | null): { resolve: Fn; note: string } {
	const s0 = ((cfg?.studies ?? []) as Rec[]).find((s) => s.id === studyId) ?? {};
	let resolve = ad.resolve as Fn;
	let note = 'case-level materials';
	const st = s0.materials?.overrides;
	if (st && typeof st === 'object' && Object.keys(st).length) {
		if (typeof cm.studyOverrides !== 'function' || !applyOverrides) throw new Error(`study ${studyId}: study-level materials.overrides need studyOverrides and applyOverrides for the arrows resolver`);
		const merged = (cm.studyOverrides as Fn)(cfg, s0, lib);
		resolve = ((cm.libraryAdapter as Fn)(lib, cfg.materials?.map ?? {}, { overrides: merged, applyOverrides }) as Rec).resolve as Fn;
		note = `study ${studyId} materials.overrides merged over the case level`;
	}
	const allow = typeof cm.allowOf === 'function' ? (cm.allowOf as Fn)(cfg, s0) : null;
	if (typeof cm.extrapolatingResolver === 'function') resolve = (cm.extrapolatingResolver as Fn)(resolve, allow) as Fn;
	return { resolve, note: allow != null ? `${note}; allow_extrapolation ${JSON.stringify(allow)}` : note };
}

/**
 * Preferred path: the case runner (engine/src/thermal/case.mjs runCaseAll, lane L10, as the engine CLI): generator per
 * study params, case materials.map and materials.overrides (libraryAdapter + L2 applyOverrides), targets. Used when
 * the family has a generator, which needs package3d.json (`data`): when it did not load, the run is refused (audit A3
 * M10, no silent fixture fallback). Families without a generator run the UI chain on the previewed parts.
 */
export async function runCase(text: string, studyId: string, parts: SimPart[], onProgress: Progress, data: unknown = null, metrics: Record<string, Rec> | null = null, dataError = ''): Promise<RunOut> {
	const cfg = parseYaml(text) as Rec;
	if (cfg?.family === 'em2d' || cfg?.family === 'em3d') return runEm(cfg, onProgress);
	const st = ((cfg?.studies ?? []) as Rec[]).find((s) => s.id === studyId);
	const isMech = st?.type === 'thermo_elastic' || st?.type === 'process_sequence';
	const caseMod = loadModule('thermalCase');
	const famMod = loadModule('families');
	if (caseMod && famMod) {
		const [cm, fm, mm] = await Promise.all([caseMod, famMod, need('materials')]);
		const known = typeof fm.listFamilies === 'function' ? (fm.listFamilies as () => string[])() : [];
		if (known.includes(cfg?.family)) {
			if (!data) throw new Error(`package3d.json did not load in the worker${dataError ? ` (${dataError})` : ''}: the ${cfg.family} generator needs it; the study is not run on fixture geometry`);
			// the single entry that applies every case feature (SPEC 17, lane L10), with the same deps as engine/cli.mjs
			onProgress('materials', 'Material library');
			const lib = await materialLibrary();
			// libraries derived by applyOverrides keep their own RVE counters: collected for the run's homogStats sum
			const derived: Rec[] = [];
			const apply0 = (mm.applyOverrides ?? null) as Fn | null;
			const applyOverrides = apply0 ? ((l: unknown, ov: unknown) => { const L = apply0(l, ov) as Rec; derived.push(L); return L; }) as Fn : null;
			const ad = (cm.libraryAdapter as Fn)(lib, cfg.materials?.map ?? {}, { overrides: cfg.materials?.overrides ?? null, applyOverrides }) as Rec;
			const metricLookup = metrics ? (typeof cm.metricLookupFromJson === 'function' ? (cm.metricLookupFromJson as Fn)({ rows: metrics }) : (id: string) => metrics[id] ?? null) : undefined;
			let mech: Rec | null = null;
			if (isMech) {
				const [mc, mi] = await Promise.all([need('mechCase'), need('mech')]);
				const rmc = mc.runMechCase as Fn;
				// guard (L12, 2026-10-20): runCaseAll evaluates a process_sequence target that has no step value (step not in
				// the sequence, surface not active) through evalMechTarget, which reads r.derived.warpage and throws after
				// the whole sequence solved; an empty derived block on sequence results turns that into a target reason.
				// forwardsRtol keeps runCaseAll's rtol detection, which reads the function source.
				const runMechCase = (c: unknown, d: unknown) => {
					const o = rmc(c, d) as Rec;
					for (const r of (o?.results ?? []) as Rec[]) if (r?.type === 'process_sequence' && !r.derived) r.derived = { warpage: [], von_mises_per_part: {} };
					return o;
				};
				mech = { runMechCase, forwardsRtol: /\brtol\b/.test(String(rmc)), mechLibrary: mc.mechLibrary, modelSurface: mc.modelSurface, solveMech: mi.solveMech, JEITA: mi.JEITA_SIGN_CONVENTION };
			}
			const runAll = (cm.runCaseAll ?? null) as Fn | null;
			if (!runAll) throw new Error('engine/src/thermal/case.mjs: runCaseAll is not exported');
			const out = (await runAll(cfg, {
				generate: fm.generate, resolve: ad.resolve, materialOf: ad.materialOf, data, metricLookup, overridesApplied: !!applyOverrides,
				lib, applyOverrides, mech, study: studyId, onProgress, overrideStatuses: mm.OVERRIDE_STATUSES ?? null
			})) as Rec;
			const homog = homogUsage(lib, derived);
			const runner = 'engine/src/thermal/case.mjs runCaseAll';
			const notes = [...((ad.notes as string[]) ?? []), ...((out.notes as string[]) ?? []), ...((out.genWarnings as Rec[]) ?? []).map((w) => `generator: ${w?.message ?? JSON.stringify(w)}`), ...((out.gridWarnings as string[]) ?? [])];
			if (isMech) {
				const rs = ((out.mech as Rec[]) ?? []).filter((r) => r?.study === studyId);
				const errs = ((out.errors as Rec[]) ?? []).filter((x) => x?.study === studyId);
				if (!rs.length) throw new Error(errs.length ? errs.map((x) => `${x.T_C != null ? `${x.T_C} C: ` : ''}${x.error}`).join('; ') : `study ${studyId}: no mechanics result`);
				const o: PackOpts = {
					studyId, targets: (out.targets as Rec[]) ?? [], signConvention: String(mech?.JEITA ?? ''), totalMs: Number(out.total_ms), metrics,
					extraWarnings: [...notes, ...errs.map((x) => `study ${x.study}${x.T_C != null ? ` ${x.T_C} C` : ''}: ${x.error}`)], runner: `${runner} (mechanics: L8 ${st?.type})`
				};
				// never lose a finished solve: a packing failure falls back to the warpage tables
				let packed: RunOut;
				try {
					packed = packMech(rs, o);
				} catch (e) {
					packed = tableOnly(rs, o, e);
				}
				packed.result.homog = homog;
				return packed;
			}
			const r = ((out.results as Rec[]) ?? []).find((x) => x?.study === studyId);
			if (!r) {
				const sk = ((out.skipped as Rec[] | undefined) ?? []).find((x) => x?.study === studyId);
				throw new Error(sk ? `study ${studyId}: ${sk.reason}` : `study ${studyId}: no result`);
			}
			const packed = pack(r, r.grid, ad.materialOf as (p: SimPart) => string, notes, runner, out.targets as Rec[]);
			packed.result.homog = homog;
			if (packed.grid && r.grid) {
				try {
					const sr = studyResolver(cm, cfg, studyId, lib, ad, applyOverrides);
					packed.kOf = kOfGrid(r.grid, sr.resolve);
					packed.result.derived = { ...packed.result.derived, arrows_k: sr.note };
				} catch (e) {
					packed.result.warnings.push(`heat-flux arrows unavailable: ${e instanceof Error ? e.message : String(e)}`);
				}
			}
			if (metrics && packed.result.targets) packed.result.targets = packed.result.targets.map((tg) => ({ ...tg, db: tg.metric_id ? (metrics[String(tg.metric_id)] ?? undefined) : undefined }));
			return packed;
		}
	}
	if (isMech) throw new Error(`study ${studyId}: ${st?.type} studies need the family generator and engine/src/thermal/case.mjs runCaseAll`);
	return runChain(text, studyId, parts, onProgress);
}

/** UI chain on the previewed part list (fixture families without a generator). */
async function runChain(text: string, studyId: string, parts: SimPart[], onProgress: Progress): Promise<RunOut> {
	onProgress('parse', 'Parsing case YAML');
	const cfg = parseYaml(text) as Rec;
	if (!cfg || typeof cfg !== 'object') throw new Error('Case YAML is not a mapping');
	const studies = (Array.isArray(cfg.studies) ? cfg.studies : []) as { id: string; type: string }[];
	const study = studies.find((s) => s.id === studyId);
	if (!study) throw new Error(`Study ${studyId} is not in the case`);
	if (study.type !== 'thermal_stationary') throw new Error(`Study type ${study.type} is not runnable in this build (thermal_stationary only)`);
	if (!parts.length) throw new Error('No parts to mesh');
	const [grid, thermal, matMod] = await Promise.all([need('grid'), need('thermal'), need('materials')]);
	onProgress('materials', 'Material library');
	const lib = { ...(await materialLibrary()), COLUMN_KINDS: matMod.COLUMN_KINDS, LAYER_KINDS: matMod.LAYER_KINDS } as Rec;
	const notes = new Set<string>();
	const matOf = materialOf(cfg.materials?.map, lib, notes);
	const t0 = performance.now();
	const g = (await pick(grid, ['buildGrid'], 'grid')(parts, {
		...(cfg.mesh ?? {}),
		symmetry: cfg.geometry?.symmetry ?? 'none',
		drop_kinds: cfg.geometry?.drop_kinds ?? [],
		materialOf: matOf
	})) as Rec;
	onProgress('mesh', `Grid ${g.nx} x ${g.ny} x ${g.nz} cells (${((g.nx + 1) * (g.ny + 1) * (g.nz + 1)).toLocaleString()} nodes) in ${Math.round(performance.now() - t0)} ms`);
	onProgress('solve', 'Steady heat conduction');
	const resolve = (k: string, T: number, o: Rec) => (lib.resolve as Fn)(k, T, o);
	const r = (await pick(thermal, ['solveThermal'], 'thermal')(g, cfg.physics?.thermal ?? {}, resolve, { study: studyId })) as Rec;
	onProgress('post', 'Result');
	const ignored = ['materials.overrides', 'materials.allow_extrapolation', 'targets'].filter((k) => (k === 'targets' ? (cfg.targets ?? []).length : k === 'materials.overrides' ? Object.keys(cfg.materials?.overrides ?? {}).length : cfg.materials?.allow_extrapolation != null));
	const w = [...[...notes].map((n) => `material key rewrite: ${n}`), ...(ignored.length ? [`UI chain (family without a generator): ${ignored.join(', ')} not applied`] : [])];
	return pack(r, g, matOf, w, 'UI chain (fixture parts; family without a generator)');
}
