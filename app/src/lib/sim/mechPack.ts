// Packing of the mechanics results of one study (runCaseAll `mech`, lane L8 shapes) for the /sim page and the worker
// session. New for the atlas (lane L12, audit A3 S2). License: GPL-3.0-or-later.
// - thermo_elastic: one point per uniform temperature, fields.u_m (3 per grid node) and vm_cellnode_Pa (8 per active
//   cell in _num.cells order).
// - process_sequence: one point per step (engine/src/mech/process.mjs solveProcessSequence): steps[] (JSON-safe:
//   step, T_start_C, T_end_C, active, activated, switched, groups, dof, warpage[], von_mises_per_part, ms) and
//   _steps[] with _U (3 per extended node id; grid corners first), _grid (grid masked to the active parts) and
//   _groups[] (per live group: _num.cells and fields.vm_cellnode_Pa).
// Every field is optional here: a missing array gives a table-only result with the reason, never a throw after a
// long solve. Pure module (no DOM, no import.meta), so it runs in Node for checks.
import type { GridLike } from './post';
import type { SimPart, ThermalResult } from './protocol';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface RunOut {
	result: ThermalResult;
	grid: GridLike | null;
	T: Float64Array | null;
	/** Displacement per mechanics point (3 per node, m), for deformation and uz / |u| plots. */
	U?: Float64Array[];
	VM?: Float64Array[];
	activeCells?: Int32Array | null;
	/** Cell activity per mechanics point (process_sequence steps); null = every meshed cell. */
	masks?: (Int32Array | null)[];
	/** Diagonal k of a cell at a temperature (heat-flux arrows). */
	kOf?: (cell: number, T_K: number) => number[];
}

export type MechPoint = NonNullable<ThermalResult['mech']>['points'][number];

const EMPTY = () => ({ xs: new Float64Array(0), ys: new Float64Array(0), zs: new Float64Array(0), nx: 0, ny: 0, nz: 0, cellPart: new Int32Array(0), partIds: [] as string[], partMats: [] as string[] });

const isF64 = (x: unknown): x is Float64Array => x instanceof Float64Array;
const arr = <T>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);

/** Grid copy for the page (typed arrays transferred) and the worker's own view; null when the grid is unusable. */
function grids(g: Rec | null | undefined): { page: ThermalResult['grid']; worker: GridLike } | null {
	if (!g || !(g.nx > 0) || !(g.ny > 0) || !(g.nz > 0) || !g.xs || !g.ys || !g.zs || !g.cellPart) return null;
	const gp = arr<SimPart>(g.parts);
	return {
		page: { xs: Float64Array.from(g.xs), ys: Float64Array.from(g.ys), zs: Float64Array.from(g.zs), nx: g.nx, ny: g.ny, nz: g.nz, stats: g.stats, cellPart: Int32Array.from(g.cellPart), partIds: gp.map((p) => p.id), partMats: gp.map((p) => p.material) },
		worker: { xs: g.xs, ys: g.ys, zs: g.zs, nx: g.nx, ny: g.ny, nz: g.nz, cellPart: g.cellPart }
	};
}

function maxAbsU(U: Float64Array | null): number | null {
	if (!U) return null;
	let m = 0;
	for (let n = 0; n + 2 < U.length; n += 3) {
		const v = Math.hypot(U[n], U[n + 1], U[n + 2]);
		if (v > m) m = v;
	}
	return m;
}

function targetsWithDb(targets: Rec[], metrics: Record<string, Rec> | null): Rec[] {
	return targets.map((tg) => ({ ...tg, db: tg.metric_id && metrics ? (metrics[String(tg.metric_id)] ?? undefined) : undefined }));
}

export interface PackOpts {
	studyId: string;
	targets: Rec[];
	signConvention: string;
	totalMs: number;
	extraWarnings: string[];
	metrics: Record<string, Rec> | null;
	runner: string;
}

/** Mechanics results of one study -> page result and worker session data (thermo_elastic or process_sequence). */
export function packMech(rs: Rec[], o: PackOpts): RunOut {
	const seq = rs.find((r) => r?.type === 'process_sequence');
	return seq ? packSequence(seq, o) : packUniform(rs, o);
}

function base(o: PackOpts, type: string, grid: ThermalResult['grid'], warnings: string[], symFactor: unknown): ThermalResult {
	return {
		study: o.studyId, type, runner: o.runner, grid, fields: {},
		derived: { symmetry_factor: symFactor ?? 1 },
		timing: { total_ms: o.totalMs },
		warnings: [...new Set([...warnings, ...o.extraWarnings])],
		// expected values and tolerance from runCaseAll (expectedFor); the DB row rides along for tooltips
		targets: targetsWithDb(o.targets, o.metrics)
	};
}

function packUniform(rs: Rec[], o: PackOpts): RunOut {
	const g0 = rs[0]?.grid as Rec | undefined;
	const gg = grids(g0);
	const warnings = rs.flatMap((r) => arr<string>(r?.warnings));
	const U = rs.map((r) => (isF64(r?.fields?.u_m) ? (r.fields.u_m as Float64Array) : null));
	const VM = rs.map((r) => (isF64(r?.fields?.vm_cellnode_Pa) ? (r.fields.vm_cellnode_Pa as Float64Array) : null));
	const haveU = U.some(Boolean);
	const fieldsNote = !gg ? 'no grid in the mechanics result: table-only view' : !haveU ? 'no displacement field (fields.u_m) in the mechanics result: table-only view' : U.every(Boolean) ? undefined : `displacement missing at ${U.filter((u) => !u).length} of ${U.length} temperature points`;
	const result = base(o, 'thermo_elastic', gg?.page ?? EMPTY(), warnings, g0?.symFactor);
	result.mech = {
		kind: 'thermo_elastic',
		sign_convention: o.signConvention,
		fields: gg && haveU ? 'full' : 'none',
		fields_note: fieldsNote,
		points: rs.map((r) => ({ T_C: r?.T_C, warpage: arr<Rec>(r?.derived?.warpage), von_mises_per_part: r?.derived?.von_mises_per_part ?? {}, max_abs_u_m: r?.derived?.max_abs_u_m ?? null, timing: r?.timing ?? {}, element: r?.element, supports: r?.supports }))
	};
	if (fieldsNote) result.warnings.push(`results: ${fieldsNote}`);
	if (!gg || !haveU) return { result, grid: null, T: null };
	return { result, grid: gg.worker, T: null, U: U as Float64Array[], VM: VM as Float64Array[], activeCells: (rs[0]?._num?.cells ?? null) as Int32Array | null };
}

function packSequence(r: Rec, o: PackOpts): RunOut {
	const steps = arr<Rec>(r.steps);
	const full = arr<Rec>(r._steps);
	const g = (r.grid ?? full[0]?._grid ?? null) as Rec | null;
	const gg = grids(g);
	const Nc = gg ? (gg.worker.nx + 1) * (gg.worker.ny + 1) * (gg.worker.nz + 1) : 0;
	// per-step displacement on the grid corners (the extended ids start with the corners in grid node order)
	const U = steps.map((_, k) => {
		const u = full[k]?._U;
		return gg && isF64(u) && u.length >= 3 * Nc ? u.slice(0, 3 * Nc) : null;
	});
	const masks = steps.map((_, k) => {
		const m = full[k]?._grid?.cellPart;
		return gg && m instanceof Int32Array && m.length === gg.worker.cellPart.length ? m : null;
	});
	// von Mises per step: the live groups' cell-corner values merged on the active cells of the full grid
	let activeCells: Int32Array | null = null;
	let VM: (Float64Array | null)[] = steps.map(() => null);
	if (gg) {
		const cp = gg.worker.cellPart;
		const idx = new Int32Array(cp.length).fill(-1);
		const act: number[] = [];
		for (let c = 0; c < cp.length; c++) if (cp[c] >= 0) { idx[c] = act.length; act.push(c); }
		activeCells = Int32Array.from(act);
		VM = steps.map((_, k) => {
			const groups = arr<Rec>(full[k]?._groups);
			if (!groups.length) return null;
			const out = new Float64Array(8 * act.length).fill(NaN);
			let any = false;
			for (const gr of groups) {
				const cells = gr?._num?.cells, f = gr?.fields?.vm_cellnode_Pa;
				if (!(cells instanceof Int32Array) || !f || typeof f.length !== 'number' || f.length < 8 * cells.length) continue;
				for (let q = 0; q < cells.length; q++) {
					const qa = idx[cells[q]];
					if (qa < 0) continue;
					for (let a = 0; a < 8; a++) out[8 * qa + a] = f[8 * q + a];
				}
				any = true;
			}
			return any ? out : null;
		});
	}
	const haveU = U.some(Boolean);
	const fieldsNote = !gg ? 'no grid in the process_sequence result: table-only view (warpage per step)'
		: !full.length ? 'the process_sequence result carries no per-step fields (_steps): table-only view (warpage per step)'
			: !haveU ? 'no per-step displacement (_steps[]._U): table-only view (warpage per step)'
				: U.every(Boolean) ? undefined : `per-step displacement missing at ${U.filter((u) => !u).length} of ${U.length} steps`;
	const warnings = [...arr<string>(r.warnings), ...arr<Rec>(r.gen_warnings).map((w) => `generator: ${w?.message ?? JSON.stringify(w)}`)];
	const result = base(o, 'process_sequence', gg?.page ?? EMPTY(), warnings, g?.symFactor);
	result.mech = {
		kind: 'process_sequence',
		sign_convention: o.signConvention,
		fields: gg && haveU ? 'full' : 'none',
		fields_note: fieldsNote,
		points: steps.map((st, k) => ({
			T_C: st?.T_end_C, step: String(st?.step ?? k), T_start_C: st?.T_start_C, active_n: arr(st?.active).length, activated: arr<string>(st?.activated),
			switched: arr<Rec>(st?.switched), dof: st?.dof, warpage: arr<Rec>(st?.warpage), von_mises_per_part: st?.von_mises_per_part ?? {},
			max_abs_u_m: maxAbsU(U[k]), timing: { total_ms: st?.ms }, fields: !!U[k], vm: !!VM[k]
		}))
	};
	if (fieldsNote) result.warnings.push(`results: ${fieldsNote}`);
	if (!steps.length) result.warnings.push('results: the process_sequence result has no steps');
	if (!gg || !haveU) return { result, grid: null, T: null };
	// a step without a field keeps an empty slot (PostSession: no field at that point; the page marks the step)
	return { result, grid: gg.worker, T: null, U: U as Float64Array[], VM: VM as Float64Array[], activeCells, masks };
}

/** Last-resort table-only result when packing itself failed (never lose a finished solve). */
export function tableOnly(rs: Rec[], o: PackOpts, err: unknown): RunOut {
	const msg = `results: packing failed (${err instanceof Error ? err.message : String(err)}); table-only view`;
	const seq = rs.find((r) => r?.type === 'process_sequence');
	const pts: MechPoint[] = seq
		? arr<Rec>(seq.steps).map((st, k) => ({ T_C: st?.T_end_C, step: String(st?.step ?? k), T_start_C: st?.T_start_C, warpage: arr<Rec>(st?.warpage), von_mises_per_part: st?.von_mises_per_part ?? {}, max_abs_u_m: null, timing: {} }))
		: rs.map((r) => ({ T_C: r?.T_C, warpage: arr<Rec>(r?.derived?.warpage), von_mises_per_part: r?.derived?.von_mises_per_part ?? {}, max_abs_u_m: r?.derived?.max_abs_u_m ?? null, timing: {} }));
	const result = base(o, seq ? 'process_sequence' : 'thermo_elastic', EMPTY(), [msg], 1);
	result.mech = { kind: seq ? 'process_sequence' : 'thermo_elastic', sign_convention: o.signConvention, fields: 'none', fields_note: msg, points: pts };
	return { result, grid: null, T: null };
}
