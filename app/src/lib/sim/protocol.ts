// Worker protocol and shared data shapes of the packaging /sim workbench (sims/SPEC.md sections 2, 3, 5; R7 6.6).
// New for the atlas (pattern: eo-modulator-atlas app/src/lib/sim/types.ts and post/contract.ts, GPL-3.0-or-later).

/** Geometry provenance (DevLog-010 A11): reported | derived | public | template | user. */
export type ParamStatus = 'reported' | 'derived' | 'public' | 'template' | 'user';
export const STATUSES: ParamStatus[] = ['reported', 'derived', 'public', 'template', 'user'];

/** One resolved family parameter (SPEC 2: `{value, unit, status, ref?, note?, formula?}`, plus optional bounds). */
export interface ParamEntry {
	value: number | string | boolean;
	unit?: string;
	status: ParamStatus;
	ref?: string;
	refs?: string[];
	note?: string;
	formula?: string;
	values?: string;
	inputs?: string[];
	/** Bounds supplied by the generator (never invented in the UI); a slider is shown only when both exist. */
	min?: number;
	max?: number;
	step?: number;
	integer?: boolean;
	/** Status and value before a user override (tooltip). */
	original?: { value: unknown; status: ParamStatus };
	[k: string]: unknown;
}

export interface DimEntry {
	status?: string;
	ref?: string;
	refs?: string[];
	note?: string;
	formula?: string;
	[k: string]: unknown;
}

/** Box part (SPEC 2; package3d.json field names). */
export interface SimPart {
	id: string;
	kind: string;
	material: string;
	x_mm: number;
	y_mm: number;
	w_mm: number;
	d_mm: number;
	z_um: number;
	h_um: number;
	in?: string;
	priority?: number;
	name?: string;
	dims?: Record<string, DimEntry>;
	/** Homogenized array box (bumps, TSVs) rather than a solid part. */
	array?: boolean;
	/** Generator box source: part | layer | array (L3 `boxes`). */
	source?: string;
	/** Display shape (`cyl`: cylinder inscribed in the box footprint, em3d bumps). */
	shape?: string;
	[k: string]: unknown;
}

export interface GenWarning {
	severity: 'error' | 'warn' | 'info';
	message: string;
	param?: string;
	[k: string]: unknown;
}

export interface Generated {
	params: Record<string, ParamEntry>;
	parts: SimPart[];
	/** Generator layers (routed conductor levels with `route`), for the channel picker. */
	layers?: Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
	warnings: GenWarning[];
	/** 'engine' = engine/src/families generate(); 'fixture' = package3d.json defaults. */
	source: 'engine' | 'fixture';
	note?: string;
	ms: number;
}

export interface Preset {
	id: string;
	label: string;
	params: Record<string, unknown>;
	refs?: string[];
	note?: string;
}

/** SPEC 5 thermal result, trimmed for transfer (fields as transferable typed arrays). */
export interface ThermalResult {
	study: string;
	type: string;
	grid: { xs: Float64Array; ys: Float64Array; zs: Float64Array; nx: number; ny: number; nz: number; stats?: Record<string, number>; cellPart?: Int32Array; partIds?: string[]; partMats?: string[] };
	fields: { T_K?: Float64Array };
	derived: Record<string, unknown>;
	timing: Record<string, number>;
	warnings: string[];
	/** Case targets evaluated by the L1 case runner (status pass | miss | unchecked). */
	targets?: Record<string, unknown>[];
	/** Where the run came from: L1 case runner or the UI chain (fixture geometry). */
	runner?: string;
	/** Transient probes (L1 thermal_transient): T(t) per named point. */
	probes?: { name: string; at_m: number[]; t_s: number[]; T_C: number[] }[];
	/** EM result (runEm2d / runEm3d JSON). */
	em?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
	/**
	 * Mechanics points: one per uniform temperature (thermo_elastic) or per step (process_sequence: `step`, T_C = step
	 * end temperature). `fields` 'none' = table-only result (reason in `fields_note`).
	 */
	mech?: {
		kind?: 'thermo_elastic' | 'process_sequence';
		sign_convention: string;
		fields?: 'full' | 'none';
		fields_note?: string;
		points: {
			T_C: number; warpage: Record<string, any>[]; von_mises_per_part: Record<string, any>; max_abs_u_m: number | null; timing: Record<string, any>; element?: string; supports?: unknown; // eslint-disable-line @typescript-eslint/no-explicit-any
			step?: string; T_start_C?: number; active_n?: number; activated?: string[]; switched?: Record<string, unknown>[]; dof?: number; fields?: boolean; vm?: boolean;
		}[];
	};
	/** RVE homogenization use of the run (L11 lib.homogStats summed over the run's libraries; L12, audit A3 M1). */
	homog?: { table_loaded: boolean; libraries: number; counts: Record<string, number>; rom_fallback: number; rom_fallback_keys: string[]; rom_fallback_events: Record<string, unknown>[] } | null;
}

/** `parts`: the part list shown in the preview (generator or fixture), so the run solves exactly that geometry. */
export type PostOp =
	| { op: 'surface'; expr: FieldExpr; clip: { axis: 'x' | 'y' | 'z'; pos_m: number; keep: '+' | '-' } | null; synthetic?: boolean; point?: number }
	| { op: 'slice'; expr: FieldExpr; axis: 'x' | 'y' | 'z'; pos_m: number; point?: number }
	| { op: 'line'; axis: 'x' | 'y' | 'z'; p: [number, number, number]; expr?: FieldExpr; point?: number }
	| { op: 'iso'; expr: FieldExpr; levels: number[]; point?: number }
	| { op: 'arrows'; kind: 'flux' | 'u'; target: number; point?: number }
	| { op: 'vtu'; point?: number; partIds?: string[] }
	| { op: 'setRef'; field: Float64Array | null };

export type FieldExpr = 'T' | 'cellsize' | 'uz' | 'umag' | 'vm' | 'dT';

export type WorkerIn =
	| { type: 'run'; id: number; text: string; study: string; parts: SimPart[]; dataUrl: string; metrics?: Record<string, Record<string, unknown>> | null; rveLive?: boolean }
	| ({ type: 'post'; seq: number } & PostOp);

export type WorkerOut =
	| { type: 'progress'; id?: number; phase: string; message: string }
	| { type: 'result'; id?: number; result: ThermalResult; ms: number }
	| { type: 'error'; id?: number; message: string }
	| { type: 'post'; seq: number; data?: unknown; error?: string; ms: number };

/** Grid data kept on the main thread for probes (cell -> part) besides the transferred result. */
export interface CellInfo {
	cellPart: Int32Array;
	partIds: string[];
	partMats: string[];
}
