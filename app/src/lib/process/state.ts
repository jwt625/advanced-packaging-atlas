// Timeline (step-local phases, op windows, real time) and the deterministic state evaluator with step-boundary
// snapshots: scene = f(flow, route, step, t).
import { routeSteps, v, type FlowIndex } from './data';
import { allMembers, pieceCollapse } from './joint';
import { newBodyState, newPieceState, opImpl, type OpCtx } from './ops';
import { clamp01, smooth } from './physics';
import { DEFAULT_PHASES, STEP_PLAY_S, type OpCall, type SceneState, type SolderBody, type Step } from './types';

const ONE_BODY = ['hole', 'cut', 'film', 'body', 'fill', 'release'];
const OPT_BODY = ['flux', 'medium_body'];
const LIST_BODY = ['bodies', 'solder', 'adhesive', 'keep_under', 'dish_bodies', 'reveal'];
const ONE_PIECE = ['piece', 'onto', 'carrier'];
/** Route filter of one op (v1.1): drop list entries outside the route; drop the op when its target body / piece is
 * outside the route (or, for list-only ops, when nothing is left). */
function routeOp(o: OpCall, active: Set<string>): OpCall | null {
	const r = { ...o } as Record<string, unknown>;
	for (const k of ONE_BODY) if (typeof r[k] === 'string' && !active.has(r[k] as string)) return null;
	for (const k of ONE_PIECE) if (typeof r[k] === 'string' && !active.has(r[k] as string)) return null;
	for (const k of OPT_BODY) if (typeof r[k] === 'string' && !active.has(r[k] as string)) delete r[k];
	if (o.op === 'plate') {
		// per-body arrays stay aligned with `bodies`
		const keep = o.bodies.map((b) => active.has(b));
		for (const k of ['current_density_ma_cm2', 'rate_um_min']) if (Array.isArray(r[k])) r[k] = (r[k] as unknown[]).filter((_x, i) => keep[i]);
	}
	for (const k of LIST_BODY) if (Array.isArray(r[k])) r[k] = (r[k] as string[]).filter((x) => active.has(x));
	if (['plate', 'build_stack'].includes(o.op) && !(r.bodies as string[]).length) return null;
	if (['reflow', 'ball_attach', 'print'].includes(o.op) && !(r.solder as string[]).length) return null;
	return r as unknown as OpCall;
}

export interface OpWindow {
	t0: number;
	t1: number;
	dur: number | null; // real s
}
export interface StepTiming {
	a: number;
	b: number;
	ops: OpWindow[];
	total: number | null; // real s: stated, else the sum of the known op durations (null: none known)
	unknown: number; // ops without a determinable duration (0 when the step states its total)
	stated: boolean; // total from step.duration_s
	play_s: number;
}

export class Evaluator {
	readonly steps: Step[];
	private snaps: SceneState[] = [];
	private timings: StepTiming[] = [];

	/** bodies / pieces of the active route (route filter, v1.1) */
	readonly active: Set<string>;
	constructor(readonly ix: FlowIndex, readonly route: string) {
		const inR = (r?: string[]) => !r?.length || r.includes(route);
		this.active = new Set([...ix.flow.bodies.filter((b) => inR(b.routes)).map((b) => b.id), ...ix.flow.pieces.filter((p) => inR(p.routes)).map((p) => p.id)]);
		this.steps = routeSteps(ix.flow, route).map((st) => ({ ...st, ops: st.ops.map((o) => routeOp(o, this.active)).filter((o): o is OpCall => !!o) }));
	}

	get n(): number {
		return this.steps.length;
	}

	ctx(k: number): OpCtx {
		return { ix: this.ix, step: this.steps[k] };
	}

	timing(k: number): StepTiming {
		const hit = this.timings[k];
		if (hit) return hit;
		const st = this.steps[k];
		const [a, b] = st.phases ?? DEFAULT_PHASES;
		const W = st.ops.reduce((s, o) => s + (o.w ?? 1), 0) || 1;
		let acc = 0;
		const c = this.ctx(k);
		const ops = st.ops.map((o) => {
			const t0 = a + ((b - a) * acc) / W;
			acc += o.w ?? 1;
			return { t0, t1: a + ((b - a) * acc) / W, dur: opImpl(o).duration(o, c) };
		});
		const stated = st.duration_s != null && Number.isFinite(st.duration_s.value);
		// V1 M3: a missing op duration no longer voids the step clock: total = sum of the known ones, unknown counted
		const known = ops.filter((o) => o.dur != null);
		const unknown = stated ? 0 : ops.length - known.length;
		const total = stated ? v(st.duration_s ?? undefined) : known.length ? known.reduce((s, o) => s + (o.dur as number), 0) : null;
		const t: StepTiming = { a, b, ops, total, unknown, stated, play_s: STEP_PLAY_S * (st.weight ?? 1) };
		this.timings[k] = t;
		return t;
	}

	/** Active op index and progress at step-local t (-1 before the first op; ops.length after the last). */
	opAt(k: number, t: number): { i: number; u: number } {
		const tm = this.timing(k);
		for (let i = 0; i < tm.ops.length; i++) {
			const w = tm.ops[i];
			if (t < w.t1 || i === tm.ops.length - 1) {
				if (t <= w.t0) return { i: i === 0 ? -1 : i - 1, u: i === 0 ? 0 : 1 };
				return { i, u: clamp01((t - w.t0) / (w.t1 - w.t0)) };
			}
		}
		return { i: -1, u: 0 };
	}

	/** Real process time elapsed in the step at t: the known op durations so far (unknown ones count in `unknown`). */
	realAt(k: number, t: number): { s: number; unknown: number; active?: number } {
		const tm = this.timing(k);
		const st = this.steps[k];
		const { i, u } = this.opAt(k, t);
		if (i < 0) return { s: 0, unknown: 0 };
		let acc = 0, unk = 0;
		for (let j = 0; j < i; j++) {
			const d = tm.ops[j].dur;
			if (d == null) unk++;
			else acc += d;
		}
		const o = st.ops[i];
		const impl = opImpl(o);
		const r = impl.realAt ? impl.realAt(o, u, this.ctx(k)) : tm.ops[i].dur != null ? u * (tm.ops[i].dur as number) : null;
		if (r == null) unk++;
		// active: progress of the active op when its own duration is unknown (the HUD may fill it with a tool default)
		return { s: acc + (r ?? 0), unknown: unk, ...(r == null ? { active: u } : {}) };
	}

	initial(): SceneState {
		const s: SceneState = {
			k: 0, t: 0, phase: 'approach', op: -1, u: 0, root: this.steps[0]?.piece ?? '', orient: this.steps[0]?.orient === 'down' ? 1 : 0,
			pieces: {}, bodies: {}, tReal_s: 0, live: {}, xray: 0, temps: {}
		};
		for (const p of this.ix.flow.pieces) {
			const ps = newPieceState();
			ps.on = !!p.initial && this.active.has(p.id);
			s.pieces[p.id] = ps;
		}
		for (const b of this.ix.flow.bodies) {
			const st = newBodyState();
			if (b.initial && this.active.has(b.id)) {
				st.on = true;
				st.g = 1;
				st.open = 1;
				st.sub.fill = 1;
			}
			if (b.mat0) Object.assign(st.mat, b.mat0);
			s.bodies[b.id] = st;
		}
		return s;
	}

	/** State at the start of step k (after steps 0..k-1). */
	snapshot(k: number): SceneState {
		if (k <= 0) return (this.snaps[0] ??= this.initial());
		const hit = this.snaps[k];
		if (hit) return hit;
		const s = this.evalAt(k - 1, 1);
		this.snaps[k] = s;
		return s;
	}

	evalAt(k: number, t: number): SceneState {
		k = Math.max(0, Math.min(this.n - 1, k));
		t = clamp01(t);
		const st = this.steps[k];
		const s = structuredClone(this.snapshot(k)) as SceneState;
		const tm = this.timing(k);
		s.k = k;
		s.t = t;
		s.root = st.piece;
		s.live = {};
		s.temps = {};
		s.xray = 0;
		s.phase = t < tm.a ? 'approach' : t > tm.b ? 'retract' : 'process';
		const prevOrient = k > 0 ? (this.steps[k - 1].orient === 'down' ? 1 : 0) : st.orient === 'down' ? 1 : 0;
		const cur = st.orient === 'down' ? 1 : 0;
		s.orient = prevOrient + (cur - prevOrient) * smooth(t / Math.max(1e-6, tm.a));
		s.op = -1;
		s.u = 0;
		const c = this.ctx(k);
		for (let i = 0; i < st.ops.length; i++) {
			const w = tm.ops[i];
			if (t <= w.t0) break;
			const u = clamp01((t - w.t0) / (w.t1 - w.t0));
			// growth direction: the step's target orientation, not the in-flight flip
			const o = s.orient;
			s.orient = cur;
			opImpl(st.ops[i]).apply(s, st.ops[i], u, c);
			s.orient = o;
			s.op = i;
			s.u = u;
		}
		const rt = this.realAt(k, t);
		s.tReal_s = rt.s;
		s.tUnknown = rt.unknown;
		if (rt.active != null) s.tActiveU = rt.active;
		this.finalize(s);
		return s;
	}

	/** Collapse of joined pieces (rigid piece: smallest over its joint fields incl. hybrid ball + paste joints). */
	private finalize(s: SceneState) {
		const { members, hy } = allMembers(this.ix, s);
		for (const [id, p] of Object.entries(s.pieces)) p.collapse_um = p.join ? pieceCollapse(this.ix, s, id, members, hy) : 0;
	}
}

/** Stable JSON of a state (determinism checks): numbers rounded to 1e-6. */
export function stateKey(s: SceneState): string {
	return JSON.stringify(s, (_k, x) => (typeof x === 'number' ? Math.round(x * 1e6) / 1e6 : x));
}

/** Playback driver: step k and step-local t kept explicitly (t = 1 of step k is shown as step k, not k + 1 at 0);
 * pos = k + t for the scrub bar. */
export class Player {
	k = 0;
	t = 0;
	playing = false;
	dir: 1 | -1 = 1;
	speed = 1;
	loop = false;
	constructor(public n: number, private playS: (k: number) => number) {}

	get pos(): number {
		return this.k + this.t;
	}
	set pos(p: number) {
		const q = Math.max(0, Math.min(this.n, p));
		this.k = Math.min(this.n - 1, Math.floor(q));
		this.t = q - this.k;
	}
	seek(k: number, t: number) {
		this.k = Math.max(0, Math.min(this.n - 1, Math.floor(k)));
		this.t = Math.max(0, Math.min(1, t));
	}
	/** Advance by dt seconds of wall time; returns false when not playing. */
	tick(dt: number): boolean {
		if (!this.playing) return false;
		this.t += (this.dir * dt * this.speed) / Math.max(0.1, this.playS(this.k));
		while (this.t > 1) {
			if (this.k < this.n - 1) { this.k++; this.t -= 1; }
			else if (this.loop) { this.k = 0; this.t -= 1; }
			else { this.t = 1; this.playing = false; }
		}
		while (this.t < 0) {
			if (this.k > 0) { this.k--; this.t += 1; }
			else if (this.loop) { this.k = this.n - 1; this.t += 1; }
			else { this.t = 0; this.playing = false; }
		}
		return true;
	}
}
