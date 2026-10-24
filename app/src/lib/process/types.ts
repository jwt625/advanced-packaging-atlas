// process3d.json contract v1 (DevLog-016; semantics in config/process3d/CONTRACT.md).
// Frames: piece frame = x, y in um from the unit center, z in um up from the piece bottom, front side up.
// Scene axes at every scale (as the 3D tab): scene x = piece x, scene y = mapped z, scene z = -piece y.
import type * as THREE from 'three';
import type { Dim, DimStatus, Ref } from '../three/types';

export type { Dim, DimStatus, Ref };

// ---------------------------------------------------------------- provenance

/** A physical quantity with provenance. reported: `ref`; derived: `formula` + `refs` (+ `values`); template: `note`
 * (+ `source`, analog `refs`). */
export interface PDim extends Dim {
	value: number;
	unit: string; // um, mm, nm, s, C, N, MPa, kPa, mA/cm2, mJ/cm2, um/min, nm/min, um/s, mm/s, m/s, rpm, Pa.s, N/m, deg, 1
	qualifier?: 'approx' | 'gt' | 'lt' | 'ge' | 'le';
	values?: string;
	source?: string;
}

/** v1.1: HUD-only "not reported" quantity (no value). Never used for geometry or physics. */
export interface PNa {
	status: 'na';
	unit?: string;
	note?: string;
	ref?: string;
	refs?: string[];
}

/** Text with provenance (equipment, material as written, atmosphere). */
export interface PText {
	text: string;
	status: DimStatus;
	ref?: string;
	refs?: string[];
	note?: string;
}

/** Time profile, real seconds from the op start. */
export interface Profile {
	id: string;
	q: 'T' | 'F' | 'P' | 'rpm' | 'I' | 'v';
	unit: string;
	pts: [number, number][];
	status: DimStatus;
	ref?: string;
	refs?: string[];
	note?: string;
	formula?: string;
	/** which trace of the quantity (TCB: 'set' head set temperature vs 'actual' joint temperature) */
	trace?: 'set' | 'actual' | string;
	label?: string;
}

// ---------------------------------------------------------------- top level

export interface Process3D {
	version: 1;
	contract?: string; // '1.1'
	generated: string; // ISO date
	fixture?: boolean;
	/** v1.1: draft build (pending values emitted as template PDims / PTexts without a value, note "pending: ...") */
	draft?: boolean;
	pending?: unknown[];
	note?: string;
	refs: Record<string, Ref>;
	flows: Flow[];
}

export interface Route {
	id: string;
	name: string;
	note?: string;
	default?: boolean;
	family?: string;
}

export interface Flow {
	id: string;
	name: string;
	family: string | null; // package3d family id for the selector
	family_label?: string; // group label when family is null
	kind: 'composite' | 'paper';
	source_flows: string[]; // DB process_flows.flow_id
	routes: Route[];
	summary: string;
	refs: string[];
	pieces: Piece[];
	sites: Site[];
	bodies: Body[];
	profiles: Profile[];
	steps: Step[];
	completeness?: { reported: number; derived: number; template: number; n?: number; na?: number };
	note?: string;
}

// ---------------------------------------------------------------- pieces, sites

export type PieceKind = 'wafer' | 'panel' | 'strip' | 'die' | 'substrate' | 'board' | 'carrier' | 'stiffener' | 'stencil' | 'other';

export type Outline =
	| { shape: 'disk'; diameter_mm: PDim; notch?: boolean }
	| { shape: 'rect'; w_mm: PDim; d_mm: PDim };

/** Block-scale window in the root piece frame (view parameters, plain numbers). */
export interface Window {
	x0_um: number;
	x1_um: number;
	y0_um: number;
	y1_um: number;
	z0_um?: number; // z crop (break mark)
	z1_um?: number;
	section_y_um?: number; // default: row through the cell site's center nearest the window center
}

export interface Piece {
	id: string;
	name: string;
	kind: PieceKind;
	carrier: Outline;
	unit: { w_um: PDim; d_um: PDim };
	repeat?: { pitch_x_um: PDim; pitch_y_um: PDim; n?: number; edge_exclusion_mm?: PDim };
	block: Window;
	initial: boolean;
	routes?: string[];
	note?: string;
}

/** Footprint: center + size, piece frame. */
export interface Rect {
	x_um: PDim;
	y_um: PDim;
	w_um: PDim;
	d_um: PDim;
}

export interface Site {
	id: string;
	piece: string;
	name?: string;
	rect: Rect;
	pitch_x_um: PDim;
	pitch_y_um?: PDim; // default pitch_x_um
	pattern: 'grid' | 'stagger' | 'single';
}

/** Placement of a joined piece in the target frame: unit center (x, y); z = height of its lowest point after
 * orientation at first contact (before solder collapse). */
export interface Placement {
	x_um: PDim;
	y_um: PDim;
	z_um: PDim;
	rot_deg?: number;
}

// ---------------------------------------------------------------- materials (E2 interface, adopted as specified)

export interface MatState {
	finish: number; // 0 as-deposited / ground .. 1 polished
	melt: number; // 0 solid / paste .. 1 liquid / reflowed
	cure: number; // 0 uncured .. 1 cured
	exposed: number; // resist dose fraction
	wet: number; // liquid film / slurry
	temp_c: number;
	front: number; // flow front 0..1 along the flow direction
}

export interface ProcMaterial {
	key: string;
	material: THREE.Material;
	set(state: Partial<MatState>): void;
	setScale(umPerUnit: number): void;
	setClipping(planes: THREE.Plane[] | null): void;
	/** world-space flow front shared by all tiles of a fill (E2, 2026-10-23); optional until E2 lands */
	setFront?(axis: 'x' | 'y' | 'z' | 'radial' | THREE.Vector3, box: THREE.Box3): void;
	dispose(): void;
}

export type CreateMaterial = (key: string, opts?: { instanced?: boolean }) => ProcMaterial;

/** Substance keys (E2). Requested additions are listed in CONTRACT.md section 9. */
export type MatKey =
	| 'si' | 'oxide' | 'nitride' | 'cu' | 'ti' | 'ni' | 'au' | 'osp' | 'solder' | 'imc' | 'resist' | 'dry_film'
	| 'polyimide' | 'emc' | 'underfill' | 'abf' | 'core' | 'solder_resist' | 'glass' | 'tba' | 'daf' | 'adhesive'
	| 'flux' | 'slurry' | 'electrolyte' | 'steel' | 'al' | 'release' | 'prepreg' | 'void'
	| (string & {});

// ---------------------------------------------------------------- bodies

interface BodyBase {
	id: string;
	name: string;
	piece: string;
	material: MatKey; // 'void' for holes and cuts
	label?: string; // material as written in the source
	mat0?: Partial<MatState>;
	routes?: string[];
	initial?: boolean; // present at flow start
	group?: string; // UI grouping (e.g. "BEOL")
	xray?: boolean; // translucent by default
	note?: string;
}

export interface Opening {
	site: string;
	d_um: PDim;
	d_bot_um?: PDim;
	shape?: 'circle' | 'square';
}

/** Line pattern of a level (v1.1): lines run along `dir` (repeat across the other axis), centred on the slab rect.
 * With `material`: the level is as built (conductor embedded in the trenches). Without: trenches opened by
 * `etch_lines` (dielectric) or `pattern` (resist), filled by a `line_fill` body. `n`: representative count (view
 * parameter; default every line inside the block window, capped at 400). */
export interface Lines {
	line_um: PDim;
	space_um: PDim;
	dir: 'x' | 'y';
	material?: MatKey;
	depth_um?: PDim; // trench depth from the slab top (default: full slab)
	n?: number;
}

export interface SlabBody extends BodyBase {
	kind: 'slab';
	z_um: PDim;
	h_um: PDim;
	rect?: Rect; // default: the piece unit
	frame_inner?: { w_um: PDim; d_um: PDim }; // ring (stiffener, frame)
	openings?: Opening[];
	lines?: Lines;
}

export interface FilmBody extends BodyBase {
	kind: 'film';
	z_um: PDim; // field bottom
	h_um: PDim; // field thickness
	rect?: Rect;
	lines?: string[]; // hole / opening-host slab / cut ids whose walls and floor it lines
	cov_side_top?: PDim; // sidewall thickness at the mouth / h_um
	cov_side_bot?: PDim; // sidewall thickness at the feature bottom / h_um
	cov_bottom?: PDim; // floor thickness / h_um
	selective?: { site: string; d_um: PDim }; // pads only, no field film
	over?: string[]; // post ids it wraps
}

export interface HoleBody extends BodyBase {
	kind: 'hole';
	site: string;
	hosts: string[];
	z_top_um: PDim;
	depth_um: PDim;
	d_top_um: PDim;
	d_bot_um?: PDim;
	scallop?: { period_um: PDim; amp_um: PDim };
	shape?: 'circle' | 'square';
}

export interface ViaFillBody extends BodyBase {
	kind: 'via_fill';
	hole: string;
	mode: 'full' | 'conformal' | 'plug';
	wall_um?: PDim;
	overburden?: { h_um: PDim; rect?: Rect };
}

export interface PostBody extends BodyBase {
	kind: 'post';
	site: string;
	z_um: PDim;
	h_um: PDim;
	d_um: PDim;
	d_top_um?: PDim;
	role: 'pad' | 'ubm' | 'pillar' | 'barrier' | 'finish' | 'via_land' | 'other';
}

export interface SolderBody extends BodyBase {
	kind: 'solder';
	site: string;
	z_um: PDim; // base
	d_um: PDim; // as formed
	h_um: PDim; // as formed (sphere: = d_um)
	form: 'plated' | 'paste' | 'sphere';
	wet_d_um?: PDim; // wetted diameter at the base (default d_um)
	joint_top_d_um?: PDim; // wetted diameter of the top pad once joined
	/** v1.1: 'up' = base plane at z_um, solder above it; 'down' = base plane at z_um, solder hangs below it (backside
	 * bumps, C4, BGA made face down). Absent: v1 behaviour (extent [z_um, z_um + h_um]; base at the top when the body
	 * was created while the root faced down). */
	dir?: 'up' | 'down';
	/** v1.1 (audit A1 C1): this alloy's liquidus; melt follows T(t) vs this value (op liquidus_c is the fallback) */
	liquidus_c?: PDim;
	/** A2 n12: the joint converts fully to IMC (e.g. 2013 "full IMC uBump joint"): drawn with the `imc` material once
	 * the joint has formed (joint progress 1) */
	to_imc?: boolean;
	/** melting / transformation temperature of the converted IMC joint (e.g. Cu6Sn5 about 415 C): the remelt gate once
	 * the joint is IMC (absent: a converted joint never remelts) */
	imc_melt_c?: PDim;
	/** paste: metal volume fraction; only this share of the printed paste becomes solder (flux volume disappears) */
	metal_vol_frac?: PDim;
}

export interface FillBody extends BodyBase {
	kind: 'fill';
	rect: Rect;
	z_um: PDim;
	h_um: PDim;
	flow: { from: 'x-' | 'x+' | 'y-' | 'y+' | 'center' | 'perimeter' };
	fillet_um?: PDim;
}

/** v1.1: conductor in the trenches of a slab with `lines` (damascene / SAP lines), plus optional overburden. */
export interface LineFillBody extends BodyBase {
	kind: 'line_fill';
	host: string; // slab id with `lines`
	overburden?: { h_um: PDim; rect?: Rect };
}

export interface CutBody extends BodyBase {
	kind: 'cut';
	hosts: string[];
	rect: Rect;
	z_um: PDim;
	h_um: PDim;
}

export type Body = SlabBody | FilmBody | HoleBody | ViaFillBody | PostBody | SolderBody | FillBody | CutBody | LineFillBody;
export type BodyKind = Body['kind'];

// ---------------------------------------------------------------- steps, views

export type ScaleId = 'work' | 'block' | 'cell';
export type CamView = 'iso' | 'front' | 'top' | 'side';

export interface StepView {
	primary: ScaleId;
	pip: ScaleId | null;
	cell_site?: string;
	cell_z_um?: [number, number]; // cell-scale z crop (default: the block window's z crop)
	block?: Window;
	focus?: { x_um: number; y_um: number }; // work-scale focus inside the unit
	camera?: Partial<Record<ScaleId, { view: CamView; zoom?: number }>>;
}

export interface HudParam {
	key: string;
	label: string;
	q: PDim | PText | PNa; // draft pending: template without value, note "pending: ..."
	kind: 'condition' | 'target' | 'result' | 'material' | 'equipment';
}

export type ToolArgs = Record<string, PDim | string | boolean>;

export interface ToolCall {
	id: string;
	scale?: ScaleId;
	args?: ToolArgs;
}

export interface Step {
	id: string;
	n: number;
	name: string;
	category: string;
	step_kind?: string;
	db_step: string | null;
	src?: { order_ref?: string; flow_id?: string; note?: string };
	routes?: string[];
	piece: string;
	orient: 'up' | 'down';
	view: StepView;
	ops: OpCall[];
	tool?: ToolCall | null;
	equipment?: PText;
	hud: HudParam[];
	duration_s?: PDim | null; // absent: sum of op durations; null: not reported
	weight?: number;
	phases?: [number, number]; // process window inside t, default [0.12, 0.9]
	note?: string;
}

// ---------------------------------------------------------------- ops

interface OpBase {
	/** fix round 1 (audit A1 m10): op-level order provenance (which source supplies this op's place in the step) */
	src?: { order_ref?: string; flow_id?: string; step_id?: string; note?: string };
	label?: string;
	w?: number; // playback weight inside the step (default 1)
	tool?: ToolCall | null; // null: no tool for this op
	duration_s?: PDim; // stated real time of this op
}

export interface BuildStackOp extends OpBase { op: 'build_stack'; bodies: string[]; method?: string }
export interface EtchViaOp extends OpBase {
	op: 'etch_via';
	hole: string;
	method: 'bosch' | 'rie' | 'laser' | 'wet';
	etch_per_cycle_um?: PDim;
	cycle_s?: PDim;
	rate_um_min?: PDim;
	mask?: string;
}
export interface EtchRecessOp extends OpBase {
	op: 'etch_recess';
	cut: string;
	method: 'laser' | 'route' | 'etch' | 'mill';
	rate_um_min?: PDim;
	raster_pitch_um?: PDim;
}
export interface DepositOp extends OpBase {
	op: 'deposit';
	film: string;
	method: 'pvd' | 'cvd' | 'pecvd' | 'ald' | 'thermal' | 'electroless' | 'immersion' | 'evaporation';
	rate_nm_min?: PDim;
	temp_c?: PDim;
}
export interface CoatOp extends OpBase {
	op: 'coat';
	body: string;
	method: 'spin' | 'spray' | 'dry_film' | 'vacuum_laminate' | 'print';
	planarization?: PDim;
	rpm?: PDim;
	temp_c?: PDim;
	pressure_mpa?: PDim;
}
export interface PatternOp extends OpBase {
	op: 'pattern';
	body: string;
	method: 'stepper' | 'aligner' | 'ldi' | 'ablation';
	tone: 'positive' | 'negative';
	dose_mj_cm2?: PDim;
	develop?: boolean; // default true
}
export interface PlateOp extends OpBase {
	op: 'plate';
	bodies: string[]; // sequential
	mode: 'superfill' | 'through_mask' | 'conformal' | 'panel';
	current_density_ma_cm2?: PDim | PDim[]; // one, or one per body
	efficiency?: PDim;
	rate_um_min?: PDim[]; // explicit per-body rate (overrides Faraday)
	bottom_up_um_min?: PDim; // superfill fill-front rate
}
export interface StripOp extends OpBase {
	op: 'strip';
	bodies: string[];
	method: 'resist_strip' | 'ash' | 'seed_etch' | 'flux_clean' | 'adhesive_clean' | 'wet_clean';
	keep_under?: string[];
	rate_um_min?: PDim;
}
export interface CmpOp extends OpBase {
	op: 'cmp';
	stop_z_um: PDim;
	/** A2 N1: side polished (default: the step orientation, `down` = the piece bottom) */
	face?: 'top' | 'bottom';
	bodies?: string[];
	rr_nm_min?: PDim;
	kp?: PDim; // Preston coefficient
	pressure_kpa?: PDim;
	velocity_m_s?: PDim;
	overpolish_s?: PDim;
	dishing_um?: PDim;
	erosion_um?: PDim;
	dish_bodies?: string[];
}
export interface GrindStage {
	name: string; // coarse | fine | ...
	removal_um: PDim;
	feed_um_s?: PDim;
	wheel?: string; // e.g. mesh designation as written
}
export interface GrindOp extends OpBase {
	op: 'grind';
	face: 'top' | 'bottom';
	to_z_um: PDim; // final plane, piece frame of the step's root piece
	stages: GrindStage[];
	reveal?: string[];
}
export interface ReflowOp extends OpBase {
	op: 'reflow';
	solder: string[];
	profile?: string; // Profile id (q = 'T')
	liquidus_c: PDim;
	peak_c?: PDim;
	tal_s?: PDim;
	atmosphere?: PText;
}
export interface PlaceOp extends OpBase {
	op: 'place';
	piece: string;
	onto: string;
	at: Placement[];
	flip: boolean;
	medium?: 'flux' | 'adhesive' | 'daf' | 'glue' | 'none';
	medium_body?: string;
	force_n?: PDim;
	/** v1.1: solder bodies of the joint (either piece); melted later by reflow, used for the collapse */
	solder?: string[];
}
export interface BondTcbOp extends OpBase {
	op: 'bond_tcb';
	piece: string;
	onto: string;
	at: Placement[];
	flip: boolean;
	solder: string[];
	/** T = joint (actual) temperature, drives melt; T_set = head set temperature (shown separately); F = bond force */
	profiles: { T: string; T_set?: string; F?: string };
	liquidus_c: PDim;
	standoff_um?: PDim;
	/** final round (F7): stage temperature; unlisted assembly solder bodies with their own liquidus_c are held at it and
	 * gated against their own liquidus (listed bodies follow profiles.T) */
	stage_c?: PDim;
	// v1.1: `solder` may list bodies of the `onto` piece (substrate-side bumps, EMIB); the joint takes its cap there
}
export interface BondTempOp extends OpBase {
	op: 'bond_temp';
	carrier: string;
	onto: string;
	adhesive: string[];
	temp_c?: PDim;
	time_s?: PDim;
	pressure_mpa?: PDim;
}
export interface DebondOp extends OpBase {
	op: 'debond';
	carrier: string;
	method: 'laser' | 'thermal_slide' | 'mechanical' | 'chemical';
	release: string;
	scan?: { pattern: 'raster' | 'spiral'; pitch_um?: PDim; speed_mm_s?: PDim };
}
export interface UnderfillOp extends OpBase {
	op: 'underfill';
	fill: string;
	gap_um: PDim;
	gamma_n_m: PDim;
	mu_pa_s: PDim;
	theta_deg: PDim;
	length_mm: PDim;
	dispense: 'one_side' | 'L' | 'U' | 'perimeter';
	stage_c?: PDim;
}
export interface MoldOp extends OpBase {
	op: 'mold';
	fill: string;
	method: 'compression' | 'transfer' | 'liquid';
	mold_top_z_um: PDim;
	/** v1.1: granular = charge spread uniformly in the cavity, then a top-down squeeze (no radial front; 00027 used
	 * granular EMC); liquid (default, v1) = central charge, radial squeeze front */
	charge?: 'granular' | 'liquid';
	temp_c?: PDim;
	pressure_mpa?: PDim;
	time_s?: PDim;
}
export interface CureOp extends OpBase {
	op: 'cure';
	bodies: string[];
	profile?: string;
	temp_c?: PDim;
	time_s?: PDim;
}
export interface DiceOp extends OpBase {
	op: 'dice';
	piece: string;
	method: 'blade' | 'laser' | 'stealth' | 'plasma';
	kerf_um: PDim;
	feed_mm_s?: PDim;
	spindle_rpm?: PDim;
	cut?: string;
}
export interface BallAttachOp extends OpBase {
	op: 'ball_attach';
	solder: string[];
	flux?: string;
	method: 'ball_drop' | 'paste_reflow';
	profile?: string;
	liquidus_c: PDim;
	peak_c?: PDim; // fix round 1: gates the remelt of earlier joints like `reflow`
}
export interface PrintOp extends OpBase {
	op: 'print';
	solder: string[];
	stencil_um: PDim;
	method: 'stencil' | 'jet';
}
/** v1.1: open the line trenches of a slab with `lines` (u = trench depth fraction). */
export interface EtchLinesOp extends OpBase {
	op: 'etch_lines';
	body: string;
	method: 'rie' | 'laser' | 'wet';
	rate_um_min?: PDim;
}
/** v1.1: desmear, wet clean, flux clean, plasma clean; optional bodies removed (flux, residues). */
export interface CleanOp extends OpBase {
	op: 'clean';
	method: 'desmear' | 'wet_clean' | 'flux_clean' | 'plasma' | 'rinse';
	bodies?: string[];
}
export interface InspectOp extends OpBase {
	op: 'inspect';
	method: 'xray_ct' | 'aoi' | 'sam' | 'cross_section' | 'electrical';
	target?: string[];
}

export type OpCall =
	| BuildStackOp | EtchViaOp | EtchRecessOp | DepositOp | CoatOp | PatternOp | PlateOp | StripOp | CmpOp | GrindOp
	| ReflowOp | PlaceOp | BondTcbOp | BondTempOp | DebondOp | UnderfillOp | MoldOp | CureOp | DiceOp | BallAttachOp
	| PrintOp | InspectOp | EtchLinesOp | CleanOp;
export type OpId = OpCall['op'];

/** Default tool per op (CONTRACT.md section 10); ops with method-dependent tools resolve at runtime. */
export const OP_TOOL: Record<OpId, string | null> = {
	build_stack: null,
	etch_via: 'drie', // laser method: laser_drill
	etch_recess: 'drie', // blanket / plasma recess etch (V1 M6); laser method: laser_drill
	deposit: 'pvd', // cvd / pecvd / ald / thermal: cvd; electroless / immersion: wet_bench
	coat: 'spin_coater', // dry_film / vacuum_laminate: laminator
	pattern: 'litho',
	plate: 'ecp',
	strip: 'wet_bench',
	cmp: 'cmp',
	grind: 'grinder',
	reflow: 'reflow_oven',
	place: 'pick_place',
	bond_tcb: 'tcb_head',
	bond_temp: 'wafer_bonder',
	debond: 'laser_debond',
	underfill: 'jet_dispenser',
	mold: 'mold_chase',
	cure: 'cure_oven',
	dice: 'dicing_blade',
	ball_attach: 'ball_placer',
	print: 'stencil_printer',
	inspect: 'xray_ct',
	etch_lines: 'drie', // laser method: laser_drill
	clean: 'wet_bench'
};

// ---------------------------------------------------------------- evaluated state (engine)

export interface BodyState {
	on: boolean; // exists
	g: number; // growth 0..1 (film thickness, fill height, post height, coat thickness, hole depth fraction)
	open: number; // openings developed 0..1 (slabs with openings)
	gone: number; // removal 0..1 (strip / clean)
	trim_hi: number | null; // material above this plane removed (piece frame z, um): grind / CMP
	trim_lo: number | null; // material below this plane removed: backside grind
	dish_um: number; // CMP dishing of this body's top
	shape: number; // solder: 0 as formed .. 1 equilibrium shape
	h_um: number | null; // solder: current equilibrium height target (cap or joint)
	down: boolean; // grows downward (created while the root faced down)
	keep: string[]; // strip: post ids that protect this film under them
	cutBy: string[]; // cuts that removed material from this body (recorded at the cut, V1 C3)
	grindRoot?: string; // root piece of the last grind that touched this body (grind-mark frame, V2 M8)
	mat: MatState;
	sub: Record<string, number>; // per-op detail (bosch cycle index, scan line, ...)
}

/** Join of a piece onto its parent (set by place / bond_tcb / bond_temp). zmin / zmax: the piece's own z extent at the
 * join (piece frame), used to put its lowest point after orientation at at[i][2]. */
export interface Join {
	onto: string;
	at: [number, number, number, number?][]; // x, y, z, rot_deg (quarter turns)
	flip: boolean;
	zmin: number;
	zmax: number;
	solder?: string[]; // v1.1: joint solder bodies (either piece)
}

export interface PieceState {
	on: boolean;
	parent: string | null;
	join: Join | null;
	flip: number; // 0..1 in-flight rotation progress (1 = final orientation)
	lift: number; // 0..1 staging height above the placement (view value)
	collapse_um: number; // solder collapse after contact (set by the evaluator from the joint solution)
	singulated: number; // 0..1 (dice)
	detach: number; // 0..1 (debond lift-off)
}

export interface SceneState {
	k: number; // step index within the route
	t: number;
	phase: 'approach' | 'process' | 'retract';
	op: number; // index of the active op (-1 outside the process window)
	u: number; // progress of the active op
	root: string; // root piece id
	orient: number; // 0 up .. 1 down
	pieces: Record<string, PieceState>;
	bodies: Record<string, BodyState>;
	tReal_s: number | null; // real elapsed time in the step: sum of the known op durations so far (V1 M3)
	tUnknown?: number; // ops started so far whose duration is not determinable (HUD: "+ n N/A")
	tActiveU?: number; // progress of the active op when its duration is not determinable
	live: Record<string, number>; // op readouts (front_um, depth_um, thickness_um, ...)
	xray: number; // 0..1 inspection see-through
	temps: { T?: number; T_set?: number; F?: number; P?: number }; // profile values at tReal of the active op
}

// OpImpl (engine-internal) lives in ops.ts.

// ---------------------------------------------------------------- tools (E3, app/src/lib/process/tools/)

/** v1.1 tool frame: the tool root sits at the focus point on the tool-facing surface at step start; +Y toward the tool.
 * surface_um = piece-frame z (root piece) of that surface; zmap(z) = tool-frame y (um) of a piece-frame z, with
 * zmap(surface_um) = 0 (illustrative: the step's z map; faces down: sign reversed). focus_um: work = view.focus (or
 * the carrier center), block = the window center (piece frame). */
export interface ToolFrame {
	scale: ScaleId;
	umPerUnit: number;
	carrier: { shape: 'disk'; d_um: number } | { shape: 'rect'; w_um: number; dd_um: number };
	unit: { w_um: number; d_um: number };
	focus_um: { x: number; y: number };
	surface_um: number;
	window?: Window;
	illustrative: boolean;
	zmap: (z_um: number) => number;
	repeat?: { pitch_x_um: number; pitch_y_um: number }; // v1.1: unit grid of the root piece (dicing streets)
	back_y?: number; // v1.1: tool-frame y of the far face of the assembly at step start
}

/** v1.1 ctx.live keys set by the engine (single source for bodies and tools): front_frac (underfill fill fraction),
 * front_x_um (print blade front, piece x; at block scale the stroke spans the window), gap_um (mold), top_z_um
 * (coat / lamination film top, piece z), depth_um (etch), hold_z_um (held piece top face, piece z), contact_z_um
 * (held piece top at first contact), collapse_um (joint collapse), surface_um (current facing surface). */
export interface ToolCtx {
	u: number;
	phase: 'approach' | 'process' | 'retract';
	op: OpId;
	tReal_s: number | null;
	tPlay_s: number;
	surface_um: number; // current tool-facing surface, piece z (grind / CMP move it)
	profile: { T?: number; T_set?: number; F?: number; P?: number };
	live: Record<string, number>;
	mat: CreateMaterial; // a fresh material instance per call
	reduceMotion: boolean;
	phases?: [number, number]; // v1.1 (engine always sets it): the step's process window inside t
	opPlay_s?: number; // v1.1 (engine always sets it): playback seconds elapsed in the active op (pick a visual cadence when the real one flickers)
}

export interface ToolActor {
	readonly id: string;
	readonly name: string;
	readonly scales: ScaleId[];
	readonly spec: Record<string, PDim>;
	readonly group: THREE.Group;
	place(frame: ToolFrame): void;
	update(t: number, args: ToolArgs, ctx: ToolCtx): void;
	pick?(obj: THREE.Object3D): string | null;
	dispose(): void;
	/** v1.1 HUD extras (optional): live tool values at t, default traces (real s from the op start), default real
	 * duration of the modelled process (s; null = not determinable). Held tools (tcb_head, pick_place) publish
	 * group.userData.hold = {on, x, y, z} (tool frame, top face of the held piece). */
	readouts?(t: number, args: ToolArgs, ctx: ToolCtx): Readout[];
	traces?(args: ToolArgs): Trace[];
	defaultDuration?(args: ToolArgs): number | null;
	/** v1.1 (L37): the machine works face down (cmp, ecp): the engine turns the work scene 180 deg about scene z */
	readonly faceDown?: boolean;
	/** V1 C1: the tool's business end (contact region) in the tool frame (um), so the wafer-scale camera frames the
	 * workpiece plus it; optional */
	focusBox?(t: number, args: ToolArgs, ctx: ToolCtx): THREE.Box3 | null;
	// also (L37 / L38): group.userData.occluders: Object3D[] (parts the engine may fade / hide when they sit between the
	// camera and the workpiece) and optionally group.userData.setOccluderOpacity(a) (separate material instances)
	/** v1.1 (L37): rotation (rad) of the work piece about +Y through the carrier center (chuck / head / holder) */
	workRot?(t: number, args: ToolArgs, ctx: ToolCtx): number;
}

export interface Readout {
	key: string;
	label: string;
	value: number | null;
	unit: string;
	status: DimStatus;
	note?: string;
}
export interface Trace {
	key: string;
	label: string;
	q: 'T' | 'F' | 'P' | 'v' | 'rpm';
	unit: string;
	pts: [number, number][];
	status: DimStatus;
	note?: string;
}

// ---------------------------------------------------------------- playback, URL

export interface Playback {
	flow: string;
	route: string;
	k: number;
	t: number;
	playing: boolean;
	dir: 1 | -1;
	speed: number;
	loop: boolean;
	illustrative: boolean;
	scale: ScaleId | null; // primary override (null: step's view.primary)
	pip: boolean;
	section: boolean;
}

/** URL hash keys in process mode: #mode=process&flow=..&route=..&step=<step id>&t=<0..1>[&scale=..&ill=0|1] */
export interface ProcessHash {
	mode: 'process';
	flow?: string;
	route?: string;
	step?: string;
	t?: number;
	scale?: ScaleId;
	ill?: boolean;
}

/** Base playback seconds per step at 1x (UI constant, not data). */
export const STEP_PLAY_S = 6;
/** Default process window inside a step's t (UI constant). */
export const DEFAULT_PHASES: [number, number] = [0.12, 0.9];
