// Op library (CONTRACT.md section 10). Each op: real duration, real time at progress u, and a pure apply that
// writes the state at progress u onto a working copy of the state at the op's start.
import { v, type FlowIndex } from './data';
import { allMembers } from './joint';
import { asmBodies, asmExtent, declZ, liningFilms, liveZ, mouthTop, trenchDepth, zFromRoot, zToRoot } from './model';
import {
	boschDepth, clamp01, faradayRate, meltAt, prestonRate, profileAt, reflowShape, smooth, squeezeFraction, washburnT
} from './physics';
import type {
	BodyState, HoleBody, MatState, OpCall, OpId, PDim, PieceState, Placement, Profile, SceneState, SlabBody, Step
} from './types';

export interface OpCtx {
	ix: FlowIndex;
	step: Step;
}

export interface OpImpl<O extends OpCall = OpCall> {
	/** Real duration in s; null when not determinable from the data. */
	duration(op: O, c: OpCtx): number | null;
	/** Real time (s) at progress u; default u * duration. null: not determinable. */
	realAt?(op: O, u: number, c: OpCtx): number | null;
	apply(s: SceneState, op: O, u: number, c: OpCtx): void;
}

export const DEFAULT_MAT: MatState = { finish: 0, melt: 0, cure: 0, exposed: 0, wet: 0, temp_c: 25, front: 1 };

export function newBodyState(): BodyState {
	return { on: false, g: 0, open: 0, gone: 0, trim_hi: null, trim_lo: null, dish_um: 0, shape: 0, h_um: null, down: false, keep: [], cutBy: [], mat: { ...DEFAULT_MAT }, sub: {} };
}
export function newPieceState(): PieceState {
	return { on: false, parent: null, join: null, flip: 1, lift: 0, collapse_um: 0, singulated: 0, detach: 0 };
}

const bs = (s: SceneState, id: string): BodyState => (s.bodies[id] ??= newBodyState());
const born = (s: SceneState, id: string): BodyState => {
	const b = bs(s, id);
	if (!b.on) {
		b.on = true;
		b.down = s.orient >= 0.5;
	}
	return b;
};
const dur = (d: PDim | undefined): number | null => (d && d.value > 0 ? d.value : null);
/** A profile with points (draft pendings have none: treated as absent). */
const prof = (c: OpCtx, id: string | undefined): Profile | undefined => {
	const p = id ? c.ix.profile.get(id) : undefined;
	return p && p.pts.length ? p : undefined;
};
const profEnd = (p: Profile | undefined): number | null => (p && p.pts.length ? p.pts[p.pts.length - 1][0] - p.pts[0][0] : null);
const sum = (xs: (number | null)[]): number | null => (xs.some((x) => x == null) ? null : xs.reduce<number>((a, b) => a + (b as number), 0));

/** Placement motion shared by place / bond_tcb: pick, flip, align, descend over p in [0, 1]. */
function placeMotion(p: PieceState, flip: boolean, q: number) {
	p.lift = q < 0.6 ? 1 : q < 0.85 ? 1 - 0.85 * smooth((q - 0.6) / 0.25) : 0.15 * (1 - smooth((q - 0.85) / 0.15));
	p.flip = flip ? (q < 0.2 ? 0 : smooth((q - 0.2) / 0.4)) : 1;
}

function joinPiece(s: SceneState, c: OpCtx, piece: string, onto: string, at: [number, number, number, number?][], flip: boolean, solder?: string[]) {
	const p = (s.pieces[piece] ??= newPieceState());
	p.on = true;
	p.parent = onto;
	// current extent of the placed piece and its own joined pieces (trimmed, reflowed, ball caps), not the declared one
	const [zmin, zmax] = asmExtent(c.ix, s, piece);
	p.join = { onto, at, flip, zmin, zmax, ...(solder?.length ? { solder: [...solder] } : {}) };
	return p;
}
const atList = (at: Placement[]): [number, number, number, number][] => at.map((a) => [v(a.x_um, 0), v(a.y_um, 0), v(a.z_um, 0), a.rot_deg ?? 0]);

/** Root-frame trims: remove material above (top) or below (bottom) plane z for every assembly body. */
function trimAsm(s: SceneState, c: OpCtx, face: 'top' | 'bottom', z: number, only?: Set<string>) {
	for (const a of asmBodies(c.ix, s, s.root)) {
		if (only && !only.has(a.b.id)) continue;
		const xf = a.xfs[0];
		const zp = zFromRoot(xf, z);
		// removing root z > plane = piece z > zp (sz > 0) or piece z < zp (sz < 0)
		const hi = (face === 'top') === xf.sz > 0;
		if (hi) a.st.trim_hi = a.st.trim_hi == null ? zp : Math.min(a.st.trim_hi, zp);
		else a.st.trim_lo = a.st.trim_lo == null ? zp : Math.max(a.st.trim_lo, zp);
	}
}

/** Melt gate of a solder body: a joint already converted to IMC uses `imc_melt_c` (never remelts without it, A2
 * n12); otherwise its own `liquidus_c` (v1.1), else the op's (NaN when neither is stated). */
function liqOf(c: OpCtx, id: string, opLiq: PDim | undefined, s?: SceneState): number {
	const b = c.ix.body.get(id);
	if (b && b.kind === 'solder' && b.to_imc && (s?.bodies[id]?.sub.jshape ?? 0) >= 1) return v(b.imc_melt_c, Infinity);
	const own = b && b.kind === 'solder' ? b.liquidus_c : undefined;
	return v(own ?? opLiq);
}

/** Solder bodies a mass reflow heats: the listed ones plus every other solder body of the assembly that states its
 * own liquidus (remelt of earlier joints, audit A1 C1). Unlisted bodies without their own liquidus are not touched. */
function heated(s: SceneState, c: OpCtx, listed: string[]): string[] {
	const out = [...listed];
	for (const a of asmBodies(c.ix, s, s.root)) if (a.b.kind === 'solder' && !listed.includes(a.b.id) && a.b.liquidus_c && a.st.on) out.push(a.b.id);
	return out;
}

/** Melt and reflowed shape per body from T(t) vs that body's liquidus (audit A1 C1). With a profile: melt at the
 * current T, shape = largest melt reached so far. Without: the stated peak gates the melt (peak >= liquidus) over the
 * thermal window q in [0.3, 0.8]; with neither peak nor liquidus, listed bodies melt (the op says they reflow). */
function thermal(s: SceneState, c: OpCtx, ids: string[], listed: string[], opLiq: PDim | undefined, peak: PDim | undefined, p: Profile | undefined, q: number) {
	const t = p ? p.pts[0][0] + q * (profEnd(p) ?? 0) : 0;
	const T = p ? profileAt(p.pts, t) : NaN;
	// a body in a join forms the joint (jshape); otherwise it reflows free (shape: as formed -> free cap)
	const { members } = allMembers(c.ix, s);
	for (const id of ids) {
		const liq = liqOf(c, id, listed.includes(id) ? opLiq : undefined, s);
		const b = born(s, id);
		let prog = 0;
		if (liq === Infinity) {
			b.mat.melt = 0; // converted IMC joint without a stated IMC melting point: never remelts
			if (p) b.mat.temp_c = T;
		} else if (p && Number.isFinite(liq)) {
			prog = reflowShape(p.pts, liq, t);
			b.mat.melt = meltAt(T, liq);
			b.mat.temp_c = T;
		} else {
			const pk = v(peak);
			const melts = Number.isFinite(pk) && Number.isFinite(liq) ? pk >= liq : listed.includes(id);
			if (melts) {
				prog = clamp01((q - 0.3) / 0.1);
				b.mat.melt = q > 0.3 && q < 0.8 ? 1 : 0;
			} else b.mat.melt = 0;
			if (p) b.mat.temp_c = T;
		}
		if (members.has(id)) b.sub.jshape = Math.max(b.sub.jshape ?? 0, prog);
		else b.shape = Math.max(b.shape, prog);
		b.mat.finish = Math.max(b.shape, b.sub.jshape ?? 0);
	}
	if (p) s.temps.T = T;
}

// ---------------------------------------------------------------- ops

type Of<K extends OpId> = Extract<OpCall, { op: K }>;

const build_stack: OpImpl<Of<'build_stack'>> = {
	duration: (o) => dur(o.duration_s),
	apply(s, o, u) {
		const n = o.bodies.length;
		o.bodies.forEach((id, i) => {
			const g = clamp01(u * n - i);
			if (g > 0) born(s, id).g = g;
		});
		s.live.layer = Math.min(n, Math.floor(u * n) + 1);
	}
};

const etch_via: OpImpl<Of<'etch_via'>> = {
	duration(o, c) {
		const h = c.ix.body.get(o.hole) as HoleBody | undefined;
		if (o.duration_s) return dur(o.duration_s);
		if (!h) return null;
		const D = v(h.depth_um);
		if (o.method === 'bosch' && o.etch_per_cycle_um && o.cycle_s) return Math.ceil(D / v(o.etch_per_cycle_um) - 1e-9) * v(o.cycle_s);
		if (o.rate_um_min) return D / (v(o.rate_um_min) / 60);
		return null;
	},
	apply(s, o, u, c) {
		const h = c.ix.body.get(o.hole) as HoleBody;
		const b = born(s, o.hole);
		const D = v(h.depth_um);
		if (o.method === 'bosch' && o.etch_per_cycle_um) {
			const r = boschDepth(D, v(o.etch_per_cycle_um), u);
			b.g = r.depth / D;
			b.sub.cycle = r.cycle;
			b.sub.cycles = r.cycles;
			b.sub.passivating = r.passivating ? 1 : 0;
			s.live.cycle = r.cycle;
			s.live.cycles = r.cycles;
		} else b.g = u;
		s.live.depth_um = b.g * D;
	}
};

/** A cut removes material from every body of its piece that it intersects when it happens (declared hosts plus
 * overlapping bodies present at the cut; bodies created later, e.g. the adhesive placed in a cavity, are not cut). */
function recordCut(s: SceneState, c: OpCtx, cutId: string) {
	const cb = c.ix.body.get(cutId);
	if (!cb || cb.kind !== 'cut') return;
	const x = v(cb.rect.x_um, 0), y = v(cb.rect.y_um, 0), w = v(cb.rect.w_um), d = v(cb.rect.d_um);
	const z0 = v(cb.z_um), z1 = z0 + v(cb.h_um);
	for (const b of c.ix.byPiece.get(cb.piece) ?? []) {
		if (b.kind === 'cut' || b.kind === 'hole') continue;
		const st = s.bodies[b.id];
		if (!st?.on || st.cutBy.includes(cutId)) continue;
		const [bz0, bz1] = liveZ(c.ix, b, st);
		if (bz1 <= z0 || bz0 >= z1) continue;
		const r = 'rect' in b && b.rect ? b.rect : null;
		if (r) {
			const rx = v(r.x_um, 0), ry = v(r.y_um, 0), rw = v(r.w_um), rd = v(r.d_um);
			if (rx + rw / 2 <= x - w / 2 || rx - rw / 2 >= x + w / 2 || ry + rd / 2 <= y - d / 2 || ry - rd / 2 >= y + d / 2) continue;
		}
		st.cutBy.push(cutId);
	}
}

const etch_recess: OpImpl<Of<'etch_recess'>> = {
	duration(o, c) {
		const b = c.ix.body.get(o.cut);
		if (o.duration_s) return dur(o.duration_s);
		return b && o.rate_um_min ? v((b as { h_um: PDim }).h_um) / (v(o.rate_um_min) / 60) : null;
	},
	apply(s, o, u, c) {
		recordCut(s, c, o.cut);
		born(s, o.cut).g = u;
		const b = c.ix.body.get(o.cut);
		if (b && b.kind === 'cut') s.live.depth_um = u * v(b.h_um);
	}
};

const deposit: OpImpl<Of<'deposit'>> = {
	duration(o, c) {
		if (o.duration_s) return dur(o.duration_s);
		const f = c.ix.body.get(o.film);
		return f && (f.kind === 'film' || f.kind === 'slab') && o.rate_nm_min ? (v(f.h_um) * 1000) / (v(o.rate_nm_min) / 60) : null;
	},
	apply(s, o, u, c) {
		const b = born(s, o.film);
		b.g = u;
		if (o.temp_c) b.mat.temp_c = v(o.temp_c);
		b.mat.wet = ['electroless', 'immersion'].includes(o.method) && u < 1 ? 1 : 0;
		// v1.1: deposit may target a slab (a deposited level, e.g. with open lines)
		const f = c.ix.body.get(o.film);
		if (f && (f.kind === 'film' || f.kind === 'slab')) s.live.thickness_um = u * v(f.h_um);
	}
};

const coat: OpImpl<Of<'coat'>> = {
	duration: (o) => dur(o.duration_s),
	apply(s, o, u, c) {
		const b = born(s, o.body);
		b.g = u;
		b.open = 0;
		b.mat.cure = 0;
		const d = c.ix.body.get(o.body);
		if (d && (d.kind === 'slab' || d.kind === 'film')) s.live.thickness_um = u * v(d.h_um);
	}
};

const pattern: OpImpl<Of<'pattern'>> = {
	duration: (o) => dur(o.duration_s),
	apply(s, o, u) {
		const b = born(s, o.body);
		b.g = Math.max(b.g, 1);
		b.mat.exposed = clamp01(u / 0.5);
		if (o.develop !== false) b.open = clamp01((u - 0.5) / 0.5);
		b.mat.wet = u > 0.5 && u < 1 ? 1 : 0;
		if (o.dose_mj_cm2) s.live.dose_mj_cm2 = b.mat.exposed * v(o.dose_mj_cm2);
	}
};

/** plate: per-body thickness and rate -> sequential real-time segments. */
function plateSegments(o: Of<'plate'>, c: OpCtx): { id: string; parts: { key: string; h: number; rate: number | null }[] }[] {
	const js = Array.isArray(o.current_density_ma_cm2) ? o.current_density_ma_cm2 : o.current_density_ma_cm2 ? o.bodies.map(() => o.current_density_ma_cm2 as PDim) : [];
	const eta = v(o.efficiency, 1);
	return o.bodies.map((id, i) => {
		const b = c.ix.body.get(id);
		const explicit = o.rate_um_min?.[i] ? v(o.rate_um_min[i]) / 60 : null;
		const mat = b?.material ?? 'cu';
		const faraday = js[i] ? faradayRate(mat, v(js[i]), eta) : null;
		const rate = explicit ?? faraday;
		if (b?.kind === 'line_fill') {
			const h = c.ix.body.get(b.host) as SlabBody | undefined;
			const depth = h ? trenchDepth(h) : 0;
			return { id, parts: [{ key: 'fill', h: depth, rate }, { key: 'ob', h: v(b.overburden?.h_um, 0), rate }] };
		}
		if (b?.kind === 'via_fill') {
			const h = c.ix.body.get(b.hole) as HoleBody;
			const depth = mouthTop(c.ix, h) - (v(h.z_top_um) - v(h.depth_um));
			const bu = o.bottom_up_um_min ? v(o.bottom_up_um_min) / 60 : rate;
			return { id, parts: [{ key: 'fill', h: depth, rate: o.mode === 'superfill' ? bu : rate }, { key: 'ob', h: v(b.overburden?.h_um, 0), rate }] };
		}
		const h = b && 'h_um' in b ? v((b as { h_um: PDim }).h_um) : 0;
		return { id, parts: [{ key: 'g', h, rate }] };
	});
}
const plate: OpImpl<Of<'plate'>> = {
	duration(o, c) {
		if (o.duration_s) return dur(o.duration_s);
		return sum(plateSegments(o, c).flatMap((s) => s.parts.map((p) => (p.h === 0 ? 0 : p.rate ? p.h / p.rate : null))));
	},
	apply(s, o, u, c) {
		const segs = plateSegments(o, c);
		const parts = segs.flatMap((sg) => sg.parts.map((p) => ({ ...p, id: sg.id })));
		const times = parts.map((p) => (p.h === 0 ? 0 : p.rate ? p.h / p.rate : null));
		const known = !times.some((t) => t == null);
		// playback-linear by thickness when a rate is missing
		const w = known ? (times as number[]) : parts.map((p) => p.h);
		const W = w.reduce((a, b) => a + b, 0) || 1;
		let acc = 0;
		parts.forEach((p, i) => {
			const g = w[i] > 0 ? clamp01((u * W - acc) / w[i]) : u > 0 ? 1 : 0;
			acc += w[i];
			if (g <= 0 && p.key !== 'ob') return;
			const b = g > 0 ? born(s, p.id) : bs(s, p.id);
			if (p.key === 'ob') b.sub.ob = g;
			else if (p.key === 'fill') {
				b.sub.fill = g;
				b.g = g;
			} else b.g = g;
			b.mat.wet = g > 0 && g < 1 ? 1 : 0;
			if (g > 0 && g < 1) {
				s.live.thickness_um = g * p.h;
				if (p.rate) s.live.rate_um_min = p.rate * 60;
			}
		});
	}
};

const strip: OpImpl<Of<'strip'>> = {
	duration: (o) => dur(o.duration_s),
	apply(s, o, u) {
		for (const id of o.bodies) {
			const b = bs(s, id);
			if (!b.on) continue;
			b.gone = u;
			b.keep = [...(o.keep_under ?? [])];
			b.mat.wet = u < 1 ? 1 : 0;
		}
	}
};

/** CMP polishes from the tool-facing side (A2 N1): `face`, else the step orientation (down = the piece bottom). */
const cmpFace = (o: Of<'cmp'>, c: OpCtx): 'top' | 'bottom' => o.face ?? (c.step.orient === 'down' ? 'bottom' : 'top');
function cmpParams(o: Of<'cmp'>, s: SceneState, c: OpCtx) {
	const face = cmpFace(o, c);
	const ids = o.bodies ?? asmBodies(c.ix, s, s.root).map((a) => a.b.id);
	let z0 = v(o.stop_z_um);
	for (const a of asmBodies(c.ix, s, s.root)) if (ids.includes(a.b.id)) {
		const [lo, hi] = zToRoot(a.xfs[0], ...declZ(c.ix, a.b));
		z0 = face === 'top' ? Math.max(z0, hi) : Math.min(z0, lo);
	}
	const rr = o.rr_nm_min ? v(o.rr_nm_min) / 60000 : o.kp && o.pressure_kpa && o.velocity_m_s ? prestonRate(v(o.kp), v(o.pressure_kpa), v(o.velocity_m_s)) : null;
	return { face, ids, z0, rr, stop: v(o.stop_z_um), over: v(o.overpolish_s, 0) };
}
const cmp: OpImpl<Of<'cmp'>> = {
	duration(o, c) {
		if (o.duration_s) return dur(o.duration_s);
		// declared extents of the listed bodies (root piece frame)
		const face = cmpFace(o, c);
		let z0 = v(o.stop_z_um);
		for (const id of o.bodies ?? []) {
			const b = c.ix.body.get(id);
			if (b) z0 = face === 'top' ? Math.max(z0, declZ(c.ix, b)[1]) : Math.min(z0, declZ(c.ix, b)[0]);
		}
		const rr = o.rr_nm_min ? v(o.rr_nm_min) / 60000 : o.kp && o.pressure_kpa && o.velocity_m_s ? prestonRate(v(o.kp), v(o.pressure_kpa), v(o.velocity_m_s)) : null;
		return rr ? Math.abs(z0 - v(o.stop_z_um)) / rr + v(o.overpolish_s, 0) : null;
	},
	apply(s, o, u, c) {
		const p = cmpParams(o, s, c);
		const sg = p.face === 'top' ? -1 : 1; // the plane moves down from the top, up from the bottom
		const T0 = Math.abs(p.z0 - p.stop);
		const clearT = p.rr ? T0 / p.rr : null;
		const total = clearT != null ? clearT + p.over : null;
		let removed: number, overF: number;
		if (total != null && clearT != null) {
			const T = u * total;
			removed = Math.min(T0, (p.rr as number) * T);
			overF = p.over > 0 ? clamp01((T - clearT) / p.over) : T >= clearT ? 1 : 0;
		} else {
			removed = T0 * clamp01(u / 0.8);
			overF = clamp01((u - 0.8) / 0.2);
		}
		const plane = p.z0 + sg * removed;
		trimAsm(s, c, p.face, plane, new Set(p.ids));
		for (const id of p.ids) {
			const b = bs(s, id);
			if (!b.on) continue;
			b.mat.finish = Math.max(b.mat.finish, smooth(removed / Math.max(1e-9, T0)));
			b.mat.wet = u < 1 ? 1 : 0;
		}
		if (o.dishing_um) for (const id of o.dish_bodies ?? []) {
			const b = bs(s, id);
			b.dish_um = overF * v(o.dishing_um);
			b.sub.dishBottom = p.face === 'bottom' ? 1 : 0;
		}
		s.live.removed_um = removed;
		if (p.rr) s.live.rr_nm_min = p.rr * 60000;
	}
};
function grindPlan(o: Of<'grind'>, s: SceneState, c: OpCtx) {
	const [lo, hi] = asmExtent(c.ix, s, s.root);
	const start = o.face === 'top' ? hi : lo;
	const to = v(o.to_z_um);
	const total = Math.abs(start - to);
	const decl = o.stages.map((st) => v(st.removal_um, 0));
	const D = decl.reduce((a, b) => a + b, 0) || 1;
	// stage removals scaled to the actual removal (the data's stages may not sum exactly)
	const rem = decl.map((r) => (r / D) * total);
	const times = o.stages.map((st, i) => (st.feed_um_s && v(st.feed_um_s) > 0 ? rem[i] / v(st.feed_um_s) : null));
	return { start, to, total, rem, times };
}
const grind: OpImpl<Of<'grind'>> = {
	duration(o) {
		if (o.duration_s) return dur(o.duration_s);
		return sum(o.stages.map((st) => (st.feed_um_s && v(st.feed_um_s) > 0 ? v(st.removal_um, 0) / v(st.feed_um_s) : null)));
	},
	apply(s, o, u, c) {
		const g = grindPlan(o, s, c);
		const known = !g.times.some((t) => t == null);
		const w = known ? (g.times as number[]) : g.rem;
		const W = w.reduce((a, b) => a + b, 0) || 1;
		let acc = 0, removed = 0, stage = 0;
		w.forEach((wi, i) => {
			const f = wi > 0 ? clamp01((u * W - acc) / wi) : 0;
			if (f > 0) stage = i + 1;
			removed += f * g.rem[i];
			acc += wi;
		});
		const plane = o.face === 'top' ? g.start - removed : g.start + removed;
		if (removed > 0) trimAsm(s, c, o.face, plane);
		// finish (L36): rough-ground 0, fine-ground (#2000 class) 0.5 matte grey; only CMP / polish reaches 1
		const stName = stage > 0 ? (o.stages[stage - 1]?.name ?? '') : '';
		const fine = /fine|2000|finish|polish/i.test(stName) || (o.stages.length > 1 && stage === o.stages.length && !/rough|coarse/i.test(stName));
		const fin = removed > 0 ? (fine ? 0.5 : 0) : null;
		for (const a of asmBodies(c.ix, s, s.root)) {
			if (a.st.trim_hi != null || a.st.trim_lo != null) {
				a.st.mat.wet = u > 0 && u < 1 ? 1 : 0;
				if (fin != null) { a.st.mat.finish = fin; a.st.grindRoot = s.root; }
			}
		}
		s.live.removed_um = removed;
		s.live.stage = stage;
		s.live.stages = o.stages.length;
	}
};

const reflow: OpImpl<Of<'reflow'>> = {
	duration: (o, c) => dur(o.duration_s) ?? profEnd(prof(c, o.profile)),
	apply(s, o, u, c) {
		thermal(s, c, heated(s, c, o.solder), o.solder, o.liquidus_c, o.peak_c, prof(c, o.profile), u);
	}
};

const place: OpImpl<Of<'place'>> = {
	duration: (o) => dur(o.duration_s),
	apply(s, o, u, c) {
		const p = joinPiece(s, c, o.piece, o.onto, atList(o.at), o.flip, o.solder);
		placeMotion(p, o.flip, u);
		if (o.medium_body) born(s, o.medium_body).g = 1;
	}
};

const TCB_PLACE = 0.25;
const bond_tcb: OpImpl<Of<'bond_tcb'>> = {
	duration: (o, c) => dur(o.duration_s) ?? profEnd(prof(c, o.profiles.T)),
	realAt(o, u, c) {
		const d = profEnd(prof(c, o.profiles.T));
		return d == null ? null : clamp01((u - TCB_PLACE) / (1 - TCB_PLACE)) * d;
	},
	apply(s, o, u, c) {
		const p = joinPiece(s, c, o.piece, o.onto, atList(o.at), o.flip, o.solder);
		placeMotion(p, o.flip, clamp01(u / TCB_PLACE));
		const pT = prof(c, o.profiles.T);
		const q = clamp01((u - TCB_PLACE) / (1 - TCB_PLACE));
		if (q <= 0) return;
		// F7: the stage holds every other solder body that states its own liquidus at stage_c (gated on that liquidus)
		const stage = v(o.stage_c);
		if (Number.isFinite(stage)) {
			const { members } = allMembers(c.ix, s);
			for (const a of asmBodies(c.ix, s, s.root)) {
				if (a.b.kind !== 'solder' || o.solder.includes(a.b.id) || !a.b.liquidus_c || !a.st.on) continue;
				const liq = liqOf(c, a.b.id, undefined, s);
				const b = born(s, a.b.id);
				b.mat.temp_c = stage;
				const melts = Number.isFinite(liq) && stage >= liq;
				b.mat.melt = melts ? 1 : 0;
				if (melts) {
					if (members.has(a.b.id)) b.sub.jshape = Math.max(b.sub.jshape ?? 0, q);
					else b.shape = Math.max(b.shape, q);
					b.mat.finish = Math.max(b.shape, b.sub.jshape ?? 0);
				}
			}
		}
		if (!pT) {
			// no joint-temperature profile (not reported / pending): the joint forms over the bond window, no temperatures
			const { members } = allMembers(c.ix, s);
			for (const id of o.solder) {
				const b = born(s, id);
				const prog = clamp01((q - 0.3) / 0.2);
				if (members.has(id)) b.sub.jshape = Math.max(b.sub.jshape ?? 0, prog);
				else b.shape = Math.max(b.shape, prog);
				b.mat.melt = q > 0.3 && q < 0.8 ? 1 : 0;
				b.mat.finish = Math.max(b.shape, b.sub.jshape ?? 0);
			}
			return;
		}
		const t = pT.pts[0][0] + q * (profEnd(pT) ?? 0);
		thermal(s, c, o.solder, o.solder, o.liquidus_c, undefined, pT, q);
		const ps = prof(c, o.profiles.T_set);
		if (ps) s.temps.T_set = profileAt(ps.pts, t);
		const pf = prof(c, o.profiles.F);
		if (pf) s.temps.F = profileAt(pf.pts, t);
		if (o.standoff_um) s.live.standoff_um = v(o.standoff_um);
	}
};

const bond_temp: OpImpl<Of<'bond_temp'>> = {
	duration: (o) => dur(o.duration_s) ?? dur(o.time_s),
	realAt: (o, u) => (o.time_s ? clamp01((u - 0.5) / 0.5) * v(o.time_s) : null),
	apply(s, o, u, c) {
		for (const id of o.adhesive) {
			const g = clamp01(u / 0.3);
			if (g > 0) born(s, id).g = g;
		}
		if (u <= 0.3) return;
		// carrier lands on the assembly top (adhesive included), flipped: its own top face meets the assembly
		const own = new Set(c.ix.byPiece.get(o.carrier)?.map((b) => b.id) ?? []);
		const top = asmExtent(c.ix, s, s.root)[1];
		const p = joinPiece(s, c, o.carrier, o.onto, [[0, 0, top]], true);
		void own;
		placeMotion(p, true, clamp01((u - 0.3) / 0.2));
		const q = clamp01((u - 0.5) / 0.5);
		for (const id of o.adhesive) {
			const b = bs(s, id);
			b.mat.cure = q;
			if (o.temp_c && q > 0) b.mat.temp_c = v(o.temp_c);
		}
		if (o.temp_c && q > 0) s.temps.T = v(o.temp_c);
	}
};

function scanTime(o: Of<'debond'>, c: OpCtx): number | null {
	const p = c.ix.piece.get(o.carrier);
	if (!p || !o.scan?.pitch_um || !o.scan.speed_mm_s) return null;
	const area = p.carrier.shape === 'disk' ? (Math.PI * v(p.carrier.diameter_mm) ** 2) / 4 : v(p.carrier.w_mm) * v(p.carrier.d_mm);
	return area / ((v(o.scan.pitch_um) / 1000) * v(o.scan.speed_mm_s));
}
const debond: OpImpl<Of<'debond'>> = {
	duration: (o, c) => dur(o.duration_s) ?? scanTime(o, c),
	realAt(o, u, c) {
		const t = scanTime(o, c);
		return t == null ? null : clamp01(u / 0.8) * t;
	},
	apply(s, o, u) {
		const r = bs(s, o.release);
		const f = clamp01(u / 0.8);
		r.mat.exposed = f;
		r.mat.front = f;
		s.live.scan = f;
		const p = s.pieces[o.carrier];
		if (!p) return;
		p.detach = clamp01((u - 0.8) / 0.2);
		if (u >= 1) {
			p.parent = null;
			p.join = null;
			p.on = false;
		}
	}
};

function ufTime(o: Of<'underfill'>): number | null {
	return washburnT(v(o.gamma_n_m), v(o.gap_um) * 1e-6, v(o.theta_deg), v(o.mu_pa_s), v(o.length_mm) * 1e-3);
}
const underfill: OpImpl<Of<'underfill'>> = {
	duration: (o) => dur(o.duration_s) ?? ufTime(o),
	apply(s, o, u) {
		const b = born(s, o.fill);
		// x(t) = sqrt(gamma h cos(theta) t / (3 mu)) and t_fill = 3 mu L^2 / (gamma h cos(theta)) => x / L = sqrt(t / t_fill)
		const f = Math.sqrt(clamp01(u));
		b.g = 1;
		b.mat.front = f;
		b.sub.front = f;
		b.mat.wet = 1;
		if (o.stage_c) b.mat.temp_c = v(o.stage_c);
		s.live.front_mm = f * v(o.length_mm);
	}
};

const MOLD_OPEN = 2; // chase starts at 2x the final gap (view parameter)
const mold: OpImpl<Of<'mold'>> = {
	duration: (o) => dur(o.duration_s) ?? dur(o.time_s),
	// the stated mold time spans the close and the hold (u 0.2-1); the open / charge phase [0, 0.2) is not timed
	realAt: (o, u) => (o.time_s ? clamp01((u - 0.2) / 0.8) * v(o.time_s) : null),
	apply(s, o, u, c) {
		const b = born(s, o.fill);
		const body = c.ix.body.get(o.fill);
		const z0 = body && body.kind === 'fill' ? v(body.z_um) : 0;
		const top = v(o.mold_top_z_um);
		const gf = top - z0, go = MOLD_OPEN * gf;
		const granular = o.charge === 'granular';
		// chase (L38 timeline): open [0, .2) while the charge is laid in, close [.2, .6) with the gap falling
		// monotonically from the open gap to the final one, hold / cure [.6, 1]
		const close = smooth(clamp01((u - 0.2) / 0.4));
		const gap = go + (gf - go) * close;
		const charge = smooth(clamp01(u / 0.2));
		let g: number, front: number, fill: number;
		if (granular) {
			// granular: the charge is spread over the whole cavity as a layer (open gap high), melted and compacted by
			// the chase; fill progress = compaction
			g = u < 0.2 ? go * charge : gap;
			front = 1;
			fill = close;
		} else {
			// liquid: a central charge (volume of the final gap over the cavity) squeezed radially (volume conserving,
			// radius fraction sqrt(gf / gap)); before contact it sits as the charge
			g = gap;
			front = u < 0.2 ? squeezeFraction(gf, go) * charge : squeezeFraction(gf, gap);
			fill = u < 0.2 ? 0 : clamp01((front - squeezeFraction(gf, go)) / Math.max(1e-9, 1 - squeezeFraction(gf, go)));
		}
		if (granular) b.mat.melt = close;
		b.g = 1;
		b.sub.top = z0 + g;
		b.sub.front = front;
		b.mat.front = front;
		b.mat.cure = clamp01((u - 0.6) / 0.4);
		if (o.temp_c) {
			b.mat.temp_c = v(o.temp_c);
			s.temps.T = v(o.temp_c);
		}
		if (o.pressure_mpa) s.temps.P = v(o.pressure_mpa) * close;
		s.live.gap_um = gap;
		s.live.front = granular ? fill : front;
		s.live.close = close;
	}
};

const cure: OpImpl<Of<'cure'>> = {
	duration: (o, c) => dur(o.duration_s) ?? dur(o.time_s) ?? profEnd(prof(c, o.profile)),
	apply(s, o, u, c) {
		const p = prof(c, o.profile);
		const T = p ? profileAt(p.pts, p.pts[0][0] + u * (profEnd(p) ?? 0)) : o.temp_c ? v(o.temp_c) : NaN;
		for (const id of o.bodies) {
			const b = bs(s, id);
			b.mat.cure = Math.max(b.mat.cure, u);
			if (Number.isFinite(T)) b.mat.temp_c = T;
		}
		if (Number.isFinite(T)) s.temps.T = T;
	}
};

function diceLines(o: Of<'dice'>, c: OpCtx): { n: number; length_mm: number } {
	const p = c.ix.piece.get(o.piece);
	if (!p || !p.repeat) return { n: 0, length_mm: 0 };
	const px = v(p.repeat.pitch_x_um) / 1000, py = v(p.repeat.pitch_y_um) / 1000;
	if (p.carrier.shape !== 'disk') {
		const W = v(p.carrier.w_mm), D = v(p.carrier.d_mm);
		const nx = Math.floor(W / px) + 1, ny = Math.floor(D / py) + 1;
		return { n: nx + ny, length_mm: nx * D + ny * W };
	}
	const R = v(p.carrier.diameter_mm) / 2;
	let n = 0, L = 0;
	for (const pitch of [px, py]) for (let x = pitch / 2; x < R; x += pitch) {
		n += 2;
		L += 2 * 2 * Math.sqrt(R * R - x * x);
	}
	return { n, length_mm: L };
}
const dice: OpImpl<Of<'dice'>> = {
	duration(o, c) {
		if (o.duration_s) return dur(o.duration_s);
		const d = diceLines(o, c);
		return o.feed_mm_s && d.length_mm > 0 ? d.length_mm / v(o.feed_mm_s) : null;
	},
	apply(s, o, u, c) {
		const d = diceLines(o, c);
		s.live.line = Math.min(d.n, Math.floor(u * d.n) + 1);
		s.live.lines = d.n;
		if (o.cut) {
			recordCut(s, c, o.cut);
			born(s, o.cut).g = clamp01(u * 2);
		}
		const p = (s.pieces[o.piece] ??= newPieceState());
		p.singulated = smooth((u - 0.9) / 0.1);
		for (const a of asmBodies(c.ix, s, s.root)) if (a.b.kind !== 'cut') a.st.mat.wet = u < 1 ? 1 : 0;
	}
};

const ball_attach: OpImpl<Of<'ball_attach'>> = {
	duration: (o, c) => dur(o.duration_s) ?? profEnd(prof(c, o.profile)),
	realAt(o, u, c) {
		const d = profEnd(prof(c, o.profile));
		return d == null ? null : clamp01((u - 0.5) / 0.5) * d;
	},
	apply(s, o, u, c) {
		if (o.flux) {
			const f = clamp01(u / 0.25);
			if (f > 0) born(s, o.flux).g = f;
		}
		// flux [0, .25); the placer head carries the balls [.25, .41) (drawn by the tool); balls land as full spheres at
		// u >= 0.41 (V1 M12, L38 landing time); reflow [.5, 1]
		if (u < 0.41) return;
		for (const id of o.solder) {
			const b = born(s, id);
			b.g = 1;
			b.sub.drop = 0;
		}
		const q = clamp01((u - 0.5) / 0.5);
		if (q <= 0) return;
		thermal(s, c, heated(s, c, o.solder), o.solder, o.liquidus_c, o.peak_c, prof(c, o.profile), q);
		if (o.flux && q > 0.5) bs(s, o.flux).gone = clamp01((q - 0.5) / 0.5);
	}
};

const print: OpImpl<Of<'print'>> = {
	duration: (o) => dur(o.duration_s),
	apply(s, o, u) {
		for (const id of o.solder) {
			const b = born(s, id);
			b.g = 1;
			b.sub.sweep = u;
			b.mat.melt = 0;
		}
		s.live.sweep = u;
	}
};

const etch_lines: OpImpl<Of<'etch_lines'>> = {
	duration(o, c) {
		if (o.duration_s) return dur(o.duration_s);
		const h = c.ix.body.get(o.body);
		return h && h.kind === 'slab' && o.rate_um_min ? trenchDepth(h) / (v(o.rate_um_min) / 60) : null;
	},
	apply(s, o, u, c) {
		const b = bs(s, o.body);
		b.sub.trench = u;
		const h = c.ix.body.get(o.body);
		if (h && h.kind === 'slab') s.live.depth_um = u * trenchDepth(h);
	}
};

const clean: OpImpl<Of<'clean'>> = {
	duration: (o) => dur(o.duration_s),
	apply(s, o, u, c) {
		for (const id of o.bodies ?? []) {
			const b = bs(s, id);
			if (!b.on) continue;
			b.gone = u;
			b.mat.wet = u < 1 ? 1 : 0;
		}
		// the exposed surfaces of the assembly are wet while cleaning (no geometry change)
		for (const a of asmBodies(c.ix, s, s.root)) if (!(o.bodies ?? []).includes(a.b.id)) a.st.mat.wet = u > 0 && u < 1 ? 1 : 0;
		s.live.clean = u;
	}
};

const inspect: OpImpl<Of<'inspect'>> = {
	duration: (o) => dur(o.duration_s),
	apply(s, _o, u) {
		s.xray = smooth(u / 0.1) * (1 - smooth((u - 0.9) / 0.1));
		s.live.scan = u;
	}
};

export const OPS: { [K in OpId]: OpImpl<Of<K>> } = {
	build_stack, etch_via, etch_recess, deposit, coat, pattern, plate, strip, cmp, grind, reflow, place, bond_tcb, bond_temp,
	debond, underfill, mold, cure, dice, ball_attach, print, inspect, etch_lines, clean
};

export function opImpl(op: OpCall): OpImpl {
	return OPS[op.op] as unknown as OpImpl;
}

/** Live readout labels and units (HUD). */
export const LIVE_LABEL: Record<string, [string, string]> = {
	depth_um: ['depth', 'um'], cycle: ['Bosch cycle', ''], cycles: ['of', ''], thickness_um: ['thickness', 'um'],
	rate_um_min: ['rate (Faraday)', 'um/min'], removed_um: ['removed', 'um'], rr_nm_min: ['removal rate', 'nm/min'],
	stage: ['stage', ''], stages: ['of', ''], front_mm: ['front', 'mm'], gap_um: ['mold gap', 'um'], front: ['fill front', 'of cavity'], close: ['chase closed', 'of travel'],
	line: ['cut line', ''], lines: ['of', ''], scan: ['scan', 'of area'], sweep: ['sweep', 'of width'], layer: ['layer', ''],
	dose_mj_cm2: ['dose', 'mJ/cm2'], standoff_um: ['standoff', 'um'], clean: ['clean', 'of time']
};
