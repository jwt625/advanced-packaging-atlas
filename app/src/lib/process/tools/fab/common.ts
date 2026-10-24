// Shared helpers for the wafer-level / fab tool actors (lane L37, DevLog-016; contract section 11).
// Mirrors the API of tools/assembly/common.ts (lane L38) so both maps behave the same in the engine; kept as a
// separate file because each lane owns only its folder.
// Tool frame: 1 unit = 1 um; origin = focus point on the tool-facing surface at step start; +Y toward the tool;
// +X = piece x; -Z = piece y. Kinematics are pure functions of (t, args, ctx); nothing integrates over frames.
// Visual motion: rotation / translation rates are playback rates (visRps), the HUD shows the real value (readouts).

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CreateMaterial, DimStatus, MatState, PDim, ProcMaterial, Readout, ScaleId, ToolActor, ToolArgs, ToolCtx, ToolFrame, Trace } from '../../types';

/** Research file of this lane's numbers (row ids F1..F181). */
export const RES = 'config/process3d/RESEARCH_TOOLS_FAB.md';

// ---------------------------------------------------------------- provenance builders

/** reported: research row(s) quoting a primary source; `row` may list several ("F124, F125"). */
export function rep(value: number, unit: string, row: string, note?: string): PDim {
	const rows = row.split(/,\s*/);
	return { value, unit, status: 'reported', ref: rows[0], ...(rows.length > 1 ? { refs: rows } : {}), source: `${RES} ${row}`, ...(note ? { note } : {}) };
}
/** derived: formula over research rows. */
export function der(value: number, unit: string, formula: string, refs: string[], values?: string, note?: string): PDim {
	return { value, unit, status: 'derived', formula, refs, ...(values ? { values } : {}), ...(note ? { note } : {}) };
}
/** template: rationale required; public source when one exists; analog / gap rows in refs. */
export function tpl(value: number, unit: string, note: string, source?: string, refs?: string[]): PDim {
	return { value, unit, status: 'template', note, ...(source ? { source } : {}), ...(refs ? { refs } : {}) };
}

export function specCounts(spec: Record<string, PDim>): Record<DimStatus, number> {
	const c: Record<DimStatus, number> = { reported: 0, derived: 0, template: 0 };
	for (const k in spec) c[spec[k].status]++;
	return c;
}

// ---------------------------------------------------------------- args

/** args override spec by key (contract 11). PDim, plain number or numeric string accepted. */
export function num(args: ToolArgs, spec: Record<string, PDim>, key: string, fallback = NaN): number {
	const a = (args as Record<string, unknown>)[key];
	if (a && typeof a === 'object' && 'value' in (a as object)) {
		const v = (a as PDim).value;
		if (Number.isFinite(v)) return v;
	}
	if (typeof a === 'number' && Number.isFinite(a)) return a;
	if (typeof a === 'string' && a.trim() !== '' && Number.isFinite(Number(a))) return Number(a);
	const s = spec[key];
	return s && Number.isFinite(s.value) ? s.value : fallback;
}
/** Status of a value after the args merge (args PDim wins). */
export function stat(args: ToolArgs, spec: Record<string, PDim>, key: string): DimStatus {
	const a = (args as Record<string, unknown>)[key];
	if (a && typeof a === 'object' && 'status' in (a as object)) return (a as PDim).status;
	return spec[key]?.status ?? 'template';
}
export function opt(args: ToolArgs, key: string): number | null {
	const a = (args as Record<string, unknown>)[key];
	if (a && typeof a === 'object' && 'value' in (a as object)) return Number.isFinite((a as PDim).value) ? (a as PDim).value : null;
	if (typeof a === 'number' && Number.isFinite(a)) return a;
	return null;
}
export function str(args: ToolArgs, key: string, def: string): string {
	const a = (args as Record<string, unknown>)[key];
	return typeof a === 'string' ? a : def;
}
export function live(ctx: ToolCtx, key: string): number | null {
	const v = ctx.live?.[key];
	return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

// ---------------------------------------------------------------- easing / phases (pure)

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const seg = (u: number, a: number, b: number) => clamp01((u - a) / (b - a));
export const smooth = (x: number) => {
	const t = clamp01(x);
	return t * t * (3 - 2 * t);
};
export const fract = (x: number) => x - Math.floor(x);
/** Contract default process window (types.ts DEFAULT_PHASES); ToolCtx carries the phase but not its bounds. */
export const PH: [number, number] = [0.12, 0.9];
export function phaseProgress(t: number, ctx: ToolCtx): { app: number; ret: number } {
	const [a, b] = ctx.phases ?? PH;
	if (ctx.phase === 'approach') return { app: clamp01(t / Math.max(a, 1e-6)), ret: 0 };
	if (ctx.phase === 'retract') return { app: 1, ret: clamp01((t - b) / Math.max(1 - b, 1e-6)) };
	return { app: 1, ret: 0 };
}
/** 0 retracted .. 1 engaged (smoothed approach in, retract out). */
export function engage(t: number, ctx: ToolCtx): number {
	const { app, ret } = phaseProgress(t, ctx);
	return smooth(app) * (1 - smooth(ret));
}
/** Process progress for the tool (op u in the process window, 0 before, 1 after). */
export function prog(ctx: ToolCtx): number {
	return ctx.phase === 'approach' ? 0 : ctx.phase === 'retract' ? 1 : clamp01(ctx.u);
}

// ---------------------------------------------------------------- visual rates

/**
 * Visual revolutions per playback second for a real spindle speed. Monotone in rpm (faster reads faster), capped so
 * that `features` passing a fixed point stay below ~5 per second (no stroboscopic aliasing of segments / bolts), and
 * at block scale so the surface speed at radius r stays below half a window per second. reduceMotion: 0.
 */
export function visRps(rpm: number, ctx: ToolCtx, opts: { features?: number; f?: ToolFrame | null; r_um?: number } = {}): number {
	if (ctx.reduceMotion || !(rpm > 0)) return 0;
	let rps = 0.12 * Math.sqrt(rpm / 100);
	rps = Math.min(rps, 1.0, 5 / Math.max(1, opts.features ?? 1));
	const f = opts.f;
	if (f && f.scale !== 'work' && opts.r_um && opts.r_um > 0) {
		const span = blockWin(f).span;
		rps = Math.min(rps, (0.5 * span) / (2 * Math.PI * opts.r_um));
	}
	return rps;
}
/** Rotation angle (rad) at playback time for a real rpm (sign = direction). */
export function spin(rpm: number, ctx: ToolCtx, opts: { features?: number; f?: ToolFrame | null; r_um?: number; dir?: 1 | -1 } = {}): number {
	return (opts.dir ?? 1) * 2 * Math.PI * visRps(Math.abs(rpm), ctx, opts) * ctx.tPlay_s;
}

// ---------------------------------------------------------------- frame helpers

/** Carrier (wafer) center in the tool frame. */
export function carrierCenter(f: ToolFrame): THREE.Vector3 {
	return new THREE.Vector3(-f.focus_um.x, 0, f.focus_um.y);
}
export function carrierSize(f: ToolFrame): { w: number; d: number; disk: boolean; r: number } {
	return f.carrier.shape === 'disk'
		? { w: f.carrier.d_um, d: f.carrier.d_um, disk: true, r: f.carrier.d_um / 2 }
		: { w: f.carrier.w_um, d: f.carrier.dd_um, disk: false, r: Math.hypot(f.carrier.w_um, f.carrier.dd_um) / 2 };
}
/** Block window in the tool frame. */
export function blockWin(f: ToolFrame): { x0: number; x1: number; z0: number; z1: number; zSec: number; span: number; h: number } {
	const w = f.window;
	if (!w) return { x0: -100, x1: 100, z0: -100, z1: 100, zSec: 0, span: 200, h: 200 };
	const fy = f.focus_um.y;
	const sec = w.section_y_um ?? (w.y0_um + w.y1_um) / 2;
	const x0 = w.x0_um - f.focus_um.x;
	const x1 = w.x1_um - f.focus_um.x;
	const span = Math.max(x1 - x0, w.y1_um - w.y0_um);
	const h = w.z1_um !== undefined && w.z0_um !== undefined ? w.z1_um - w.z0_um : span;
	return { x0, x1, z0: -(w.y1_um - fy), z1: -(w.y0_um - fy), zSec: -(sec - fy), span, h };
}
/** Tool-frame y of a piece-frame z (contract: zmap; relative to the tool-facing surface at step start). */
export function yOf(f: ToolFrame, z_um: number): number {
	return f.zmap(z_um) - f.zmap(f.surface_um);
}
/**
 * Tool-frame y of the far (chuck-side) face of the work piece. ToolFrame has no stack thickness or orientation, so:
 * surface_um > 0 (front up) -> piece z = 0; otherwise (face down / unknown) -> -stack_um (args) or `fallback`.
 */
export function backY(f: ToolFrame, args: ToolArgs, fallback_um: number): number {
	if (typeof f.back_y === 'number' && Number.isFinite(f.back_y) && f.back_y < 0) return f.back_y;
	const s = opt(args, 'stack_um');
	if (s !== null) return -(f.illustrative ? Math.abs(f.zmap(f.surface_um) - f.zmap(f.surface_um - s)) : s);
	if (f.surface_um > 0) return yOf(f, 0);
	return -fallback_um;
}
/** Current grind / CMP plane in the tool frame: engine surface if it moves, else removed_um (live). */
export function planeY(f: ToolFrame, ctx: ToolCtx): number {
	const ls = live(ctx, 'surface_um');
	if (ls !== null && Math.abs(ls - f.surface_um) > 1e-6) return yOf(f, ls);
	if (Number.isFinite(ctx.surface_um) && Math.abs(ctx.surface_um - f.surface_um) > 1e-6) return yOf(f, ctx.surface_um);
	const r = live(ctx, 'removed_um');
	if (r === null || r <= 0) return 0;
	return -Math.abs(f.zmap(f.surface_um) - f.zmap(f.surface_um - r));
}

// ---------------------------------------------------------------- geometry

export function box(w: number, h: number, d: number, x = 0, y = 0, z = 0): THREE.BufferGeometry {
	const g = new THREE.BoxGeometry(w, h, d);
	g.translate(x, y, z);
	return g;
}
export function boxMM(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): THREE.BufferGeometry {
	return box(Math.max(x1 - x0, 1e-6), Math.max(y1 - y0, 1e-6), Math.max(z1 - z0, 1e-6), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}
/** Vertical cylinder from y0 to y1; optional sector (angles from +x toward -z). */
export function cylY(r: number, y0: number, y1: number, x = 0, z = 0, seg = 48, rTop = r, open = false, thetaStart = 0, thetaLen = Math.PI * 2): THREE.BufferGeometry {
	const g = new THREE.CylinderGeometry(rTop, r, Math.max(Math.abs(y1 - y0), 1e-6), seg, 1, open, thetaStart + Math.PI / 2, thetaLen);
	g.translate(x, (y0 + y1) / 2, z);
	return g;
}
/** Cylinder along an axis through two points. */
export function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 12, rB = r): THREE.BufferGeometry {
	const d = new THREE.Vector3().subVectors(b, a);
	const L = d.length();
	const g = new THREE.CylinderGeometry(rB, r, Math.max(L, 1e-6), seg, 1);
	g.translate(0, L / 2, 0);
	const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
	g.applyQuaternion(q);
	g.translate(a.x, a.y, a.z);
	return g;
}
/** Annulus (washer) about y from y0 to y1; optional sector (thetaStart, thetaLen in the xz plane, from +x toward -z). */
export function ringY(rIn: number, rOut: number, y0: number, y1: number, seg = 96, x = 0, z = 0, thetaStart = 0, thetaLen = Math.PI * 2): THREE.BufferGeometry {
	const pts = [new THREE.Vector2(rIn, y0), new THREE.Vector2(rOut, y0), new THREE.Vector2(rOut, y1), new THREE.Vector2(rIn, y1), new THREE.Vector2(rIn, y0)];
	return lathe(pts, seg, x, z, thetaStart, thetaLen);
}
/**
 * Lathe about y from an (r, y) polyline (closed profiles repeat the first point); each profile edge is its own lathe
 * so corners stay sharp. Angles from +x toward -z (three's LatheGeometry phi = theta + pi / 2).
 */
export function lathe(pts: THREE.Vector2[], seg = 96, x = 0, z = 0, thetaStart = 0, thetaLen = Math.PI * 2): THREE.BufferGeometry {
	// split at every vertex so each profile edge gets its own normals (sharp edges)
	const segsGeo: THREE.BufferGeometry[] = [];
	for (let i = 0; i < pts.length - 1; i++) {
		const g = new THREE.LatheGeometry([pts[i], pts[i + 1]], seg, thetaStart + Math.PI / 2, thetaLen);
		segsGeo.push(g);
	}
	// partial sweep: close both ends with the profile polygon (section faces of a cut-away solid)
	if (thetaLen < Math.PI * 2 - 1e-6) {
		const ring = pts.slice();
		if (ring.length > 2 && ring[0].distanceTo(ring[ring.length - 1]) < 1e-9) ring.pop();
		if (ring.length >= 3) for (const [th, sgn] of [[thetaStart, 1], [thetaStart + thetaLen, -1]] as [number, number][]) {
			const cap = new THREE.ShapeGeometry(new THREE.Shape(ring.map((p) => new THREE.Vector2(p.x, p.y))));
			const e1 = new THREE.Vector3(Math.cos(th), 0, -Math.sin(th));
			const e3 = new THREE.Vector3(Math.sin(th), 0, Math.cos(th)).multiplyScalar(sgn);
			cap.applyMatrix4(new THREE.Matrix4().makeBasis(e1, new THREE.Vector3(0, 1, 0), e3));
			segsGeo.push(facing(cap, e3));
		}
	}
	const g = merge(segsGeo);
	g.translate(x, 0, z);
	return g;
}
/** Non-indexed copy whose every triangle faces `n` (winding fixed), flat normals = n. */
export function facing(g: THREE.BufferGeometry, n: THREE.Vector3): THREE.BufferGeometry {
	const ng = g.index ? g.toNonIndexed() : g;
	if (ng !== g) g.dispose();
	const p = ng.attributes.position as THREE.BufferAttribute;
	const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
	for (let i = 0; i < p.count; i += 3) {
		a.fromBufferAttribute(p, i);
		b.fromBufferAttribute(p, i + 1);
		c.fromBufferAttribute(p, i + 2);
		const cr = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
		if (cr.dot(n) < 0) {
			p.setXYZ(i + 1, c.x, c.y, c.z);
			p.setXYZ(i + 2, b.x, b.y, b.z);
		}
	}
	const nn = new Float32Array(p.count * 3);
	for (let i = 0; i < p.count; i++) nn.set([n.x, n.y, n.z], i * 3);
	ng.setAttribute('normal', new THREE.BufferAttribute(nn, 3));
	for (const k of Object.keys(ng.attributes)) if (k !== 'position' && k !== 'normal') ng.deleteAttribute(k);
	return ng;
}
/** Annular sector prism (curved segment) about the origin: radii rIn..rOut, angle a0..a1 (rad, from +x toward -z). */
export function sector(rIn: number, rOut: number, a0: number, a1: number, y0: number, y1: number, seg = 6): THREE.BufferGeometry {
	const s = new THREE.Shape();
	s.absarc(0, 0, rOut, a0, a1, false);
	s.absarc(0, 0, rIn, a1, a0, true);
	s.closePath();
	const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(y1 - y0, 1e-6), bevelEnabled: false, curveSegments: seg });
	// shape plane xy -> xz: rotate -90 about x maps shape y to -z (angle measured toward -z) and extrusion z to +y
	g.rotateX(-Math.PI / 2);
	g.translate(0, y0, 0);
	return g;
}
/** Flat disk (top face only) at height y. */
export function diskY(r: number, y: number, seg = 96, x = 0, z = 0, rIn = 0): THREE.BufferGeometry {
	const g = rIn > 0 ? new THREE.RingGeometry(rIn, r, seg, 1) : new THREE.CircleGeometry(r, seg);
	g.rotateX(-Math.PI / 2);
	g.translate(x, y, z);
	return g;
}

/** Merge geometries (non-indexed, position + normal only). */
export function merge(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
	const flat = gs.map((g) => {
		const n = g.index ? g.toNonIndexed() : g;
		for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
		if (!n.attributes.normal) n.computeVertexNormals();
		return n;
	});
	const m = mergeGeometries(flat, false);
	for (const g of gs) g.dispose();
	for (const g of flat) if (!gs.includes(g)) g.dispose();
	if (!m) throw new Error('merge failed');
	return m;
}

export function triCount(o: THREE.Object3D): number {
	let n = 0;
	o.traverse((c) => {
		const m = c as THREE.Mesh;
		if (!m.isMesh || !m.visible) return;
		const g = m.geometry;
		const per = (g.index ? g.index.count : g.attributes.position.count) / 3;
		const dr = g.drawRange.count === Infinity ? per : Math.min(per, g.drawRange.count / 3);
		const inst = (m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 1;
		n += dr * inst;
	});
	return Math.round(n);
}
export function drawCalls(o: THREE.Object3D): number {
	let n = 0;
	o.traverse((c) => {
		const m = c as THREE.Mesh;
		const p = c as THREE.Points;
		if ((m.isMesh || p.isPoints || (c as THREE.LineSegments).isLineSegments) && c.visible && (!(m as THREE.InstancedMesh).isInstancedMesh || (m as THREE.InstancedMesh).count > 0)) n++;
	});
	return n;
}

// ---------------------------------------------------------------- HUD extras (same shape as tools/assembly)

export type { Readout, Trace } from '../../types';
/** Held-piece pose published on group.userData.hold every update (tool frame, um), as tools/assembly Hold. */
export interface Hold {
	on: boolean;
	x: number;
	y: number; // held piece top (back) face
	z: number;
}
/** ToolActor plus the extras proposed to L35 (lane note L37, "Interface notes"); same names as tools/assembly. */
export interface FabToolActor extends ToolActor {
	readouts(t: number, args: ToolArgs, ctx: ToolCtx): Readout[];
	traces?(args: ToolArgs): Trace[];
	/** real duration of the default process this tool models (lab / engine fallback), s; null = not determinable */
	defaultDuration?(args: ToolArgs): number | null;
	/** contact region (tool frame um) for the work camera framing (audit V1 C1) */
	focusBox(t: number, args: ToolArgs, ctx: ToolCtx): THREE.Box3;
	/** face-down process (CMP, ECP): the engine should draw the work scene turned over so gravity reads right */
	readonly faceDown: boolean;
	/** rotation (rad, about +Y through the carrier center) the work piece has in the machine at (t, ctx); 0 = none */
	workRot(t: number, args: ToolArgs, ctx: ToolCtx): number;
}

// ---------------------------------------------------------------- local (non-library) materials

/** Machine hardware that has no process-material key (pad, ceramic chuck, anodised parts, plastics). */
export function hw(color: string, rough: number, metal = 0, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
	return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...opts });
}

/**
 * Object-space pattern on a hardware material (no image textures): 1 concentric grooves (CMP pad), 2 perforation
 * grid (resistive plate, showerhead), 3 porous speckle (ceramic chuck). Positions in um (tool-frame geometry), so
 * pitch / width are physical. Faces with |n.y| < 0.5 are left plain. Coverage is antialiased by the pixel footprint
 * and fades to the area-weighted mean colour when unresolved.
 */
export function patterned(base: THREE.MeshStandardMaterial, mode: 1 | 2 | 3, pitch_um: number, width_um: number, col2: string, center?: THREE.Vector2, streaks = 0): THREE.MeshStandardMaterial {
	const u = {
		uPatMode: { value: mode },
		uPatPitch: { value: pitch_um },
		uPatW: { value: width_um },
		uPatCol: { value: new THREE.Color(col2) },
		uPatC: { value: center ?? new THREE.Vector2(0, 0) },
		uPatStreak: { value: streaks }
	};
	base.onBeforeCompile = (sh) => {
		Object.assign(sh.uniforms, u);
		sh.vertexShader = sh.vertexShader
			.replace('#include <common>', '#include <common>\nvarying vec3 vPatP;\nvarying vec3 vPatN;')
			.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPatP = position;\nvPatN = normal;');
		sh.fragmentShader = sh.fragmentShader
			.replace(
				'#include <common>',
				`#include <common>
varying vec3 vPatP;
varying vec3 vPatN;
uniform int uPatMode;
uniform float uPatPitch;
uniform float uPatW;
uniform vec3 uPatCol;
uniform vec2 uPatC;
uniform float uPatStreak;
float patHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float patNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(patHash(i), patHash(i + vec2(1, 0)), f.x), mix(patHash(i + vec2(0, 1)), patHash(i + vec2(1, 1)), f.x), f.y); }`
			)
			.replace(
				'#include <color_fragment>',
				`#include <color_fragment>
if (abs(vPatN.y) > 0.5) {
	vec2 q = vPatP.xz - uPatC;
	float cov = 0.0;
	float mean = 0.0;
	float fw = 1.0;
	if (uPatMode == 1) {
		float s = length(q) / uPatPitch;
		fw = max(fwidth(s), 1e-6);
		float f = fract(s);
		float w = uPatW / uPatPitch;
		cov = clamp((w - f) / fw + 0.5, 0.0, 1.0) * clamp((f + fw * 0.5) / fw, 0.0, 1.0);
		mean = w;
	} else if (uPatMode == 2) {
		vec2 s = q / uPatPitch;
		fw = max(max(fwidth(s.x), fwidth(s.y)), 1e-6);
		float d = length(fract(s) - 0.5);
		float rr = 0.5 * uPatW / uPatPitch;
		cov = clamp((rr - d) / fw + 0.5, 0.0, 1.0);
		mean = 3.14159 * rr * rr;
	} else {
		vec2 s = q / uPatPitch;
		fw = max(fwidth(s.x), 1e-6);
		cov = step(0.72, patNoise(s)) * 0.8;
		mean = 0.2;
	}
	float res = clamp(1.6 - fw * 2.5, 0.0, 1.0);
	float g = mix(mean, cov, res);
	diffuseColor.rgb = mix(diffuseColor.rgb, uPatCol, g);
	if (uPatStreak > 0.0) {
		float a = atan(q.y, q.x);
		float r = length(q);
		diffuseColor.rgb *= 1.0 - uPatStreak * patNoise(vec2(a * 9.0, r / 25000.0));
	}
}`
			);
	};
	base.customProgramCacheKey = () => `apa-fabpat-${mode}`;
	return base;
}

/** Volumetric-looking glow (plasma, light): additive, alpha from view-facing and a height profile y0 (bright) -> y1. */
export function glowMat(color: string, intensity: number, y0: number, y1: number): THREE.ShaderMaterial {
	return new THREE.ShaderMaterial({
		uniforms: { uCol: { value: new THREE.Color(color) }, uInt: { value: intensity }, uY0: { value: y0 }, uY1: { value: y1 } },
		vertexShader: /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec3 vN; varying vec3 vV; varying float vY;
void main() {
	vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
	vN = normalize(normalMatrix * normal);
	vV = normalize(-mvPosition.xyz);
	vY = position.y;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
}`,
		fragmentShader: /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
uniform vec3 uCol; uniform float uInt; uniform float uY0; uniform float uY1;
varying vec3 vN; varying vec3 vV; varying float vY;
void main() {
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	float facing = pow(abs(dot(normalize(vN), normalize(vV))), 1.3);
	float h = clamp((vY - uY0) / (uY1 - uY0), 0.0, 1.0);
	float prof = (1.0 - h * 0.75);
	gl_FragColor = vec4(uCol * uInt * facing * prof, 1.0);
}`,
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		side: THREE.DoubleSide
	});
}

// ---------------------------------------------------------------- base actor

type Pending = { mesh: THREE.Mesh | THREE.Points; key: string; state?: Partial<MatState> };

const PLACEHOLDER = new THREE.MeshBasicMaterial({ visible: false });

/**
 * Base: rigs (moving sub-groups), per-(rig, material) merged meshes, lazy ProcMaterial binding through ctx.mat
 * (place() has no ctx), own hardware / glow materials for parts without a substance key.
 */
export abstract class FabBase implements FabToolActor {
	abstract readonly id: string;
	abstract readonly name: string;
	abstract readonly scales: ScaleId[];
	abstract readonly spec: Record<string, PDim>;
	readonly faceDown: boolean = false;
	readonly group = new THREE.Group();
	protected frame: ToolFrame | null = null;
	protected rigs = new Map<string, THREE.Group>();
	private acc = new Map<string, { rig: string; key: string; geos: THREE.BufferGeometry[]; tip: string; own?: THREE.Material }>();
	private pending: Pending[] = [];
	private mats = new Map<string, ProcMaterial>();
	private matFn: CreateMaterial | null = null;
	private own: THREE.Material[] = [];
	private ownGeo: THREE.BufferGeometry[] = [];
	protected args: ToolArgs = {};

	constructor(args?: ToolArgs) {
		if (args) this.args = args;
	}

	place(frame: ToolFrame): void {
		this.frame = frame;
		this.clear();
		this.build(frame, this.args);
		this.flush();
		if (frame.scale !== 'work') this.applyLod();
		this.setupWindowClip(frame);
		this.rebind();
		this.group.userData.tool = this.id;
		this.group.userData.occluders = this.collect(this.occluderParts());
		this.fixOrder();
	}
	/**
	 * Deterministic draw order for transparent parts: three sorts transparent objects by renderOrder, depth, then object
	 * id; ids depend on creation history (an actor built fresh vs reused), so ties with engine bodies at the same depth
	 * flipped pixels between forward and backward arrival. Every tool object gets an explicit renderOrder.
	 */
	private fixOrder(): void {
		let i = 0;
		this.group.traverse((o) => {
			const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
			if (!m || Array.isArray(m)) return;
			i++;
			if (o.renderOrder === 0) o.renderOrder = 1 + i * 0.001;
		});
	}
	/**
	 * Block / cell level of detail (audit V1 M5): only parts whose tag (`rig|key`; exact, or prefix with a trailing *) is listed are kept, own
	 * hardware colours dimmed to 60 %, glows to 60 %. null = keep everything (tool has no block representation issue).
	 */
	protected blockParts(): string[] | null {
		return null;
	}
	/** Parts that can sit between the default work camera and the work piece (engine may fade / hide them). */
	protected occluderParts(): string[] {
		return [];
	}
	private collect(pats: string[]): THREE.Object3D[] {
		const out: THREE.Object3D[] = [];
		if (!pats.length) return out;
		this.group.traverse((o) => {
			const p = o.userData.part as string | undefined;
			if (p && pats.some((q) => partMatch(p, q))) out.push(o);
		});
		return out;
	}
	private applyLod(): void {
		const keep = this.blockParts();
		if (!keep) return;
		const drop: THREE.Object3D[] = [];
		this.group.traverse((o) => {
			const p = o.userData.part as string | undefined;
			if (!p) return;
			if (!keep.some((q) => partMatch(p, q))) drop.push(o);
		});
		for (const o of drop) {
			o.removeFromParent();
			(o as THREE.Mesh).geometry?.dispose();
			this.pending = this.pending.filter((x) => x.mesh !== o);
		}
		for (const m of this.own) {
			if (m instanceof THREE.MeshStandardMaterial) m.color.multiplyScalar(0.6);
			else if (m instanceof THREE.ShaderMaterial && m.uniforms.uInt) m.userData.lodDim = 0.6;
			else if (m instanceof THREE.PointsMaterial || m instanceof THREE.MeshBasicMaterial) m.opacity *= 0.7;
		}
	}
	/**
	 * Contact region for framing (audit V1 C1), tool frame um: the work piece around the contact plus the business end
	 * of the tool. Default: the carrier footprint from the far face to 0.15 x radius above the surface.
	 */
	focusBox(_t: number, _args: ToolArgs, _ctx: ToolCtx): THREE.Box3 {
		const f = this.frame!;
		const C = carrierCenter(f);
		const W = carrierSize(f);
		const yb = backY(f, this.args, 775);
		if (f.scale !== 'work') {
			const w = blockWin(f);
			return new THREE.Box3(new THREE.Vector3(w.x0, -w.h, w.z0), new THREE.Vector3(w.x1, w.h * 0.3, w.z1));
		}
		return new THREE.Box3(new THREE.Vector3(C.x - W.w / 2, yb, C.z - W.d / 2), new THREE.Vector3(C.x + W.w / 2, 0.15 * W.r, C.z + W.d / 2));
	}
	protected abstract build(frame: ToolFrame, args: ToolArgs): void;
	/** Geometry-relevant args (mode, sizes); a change rebuilds. */
	protected geomKey(args: ToolArgs): string {
		return String((args as Record<string, unknown>).method ?? '');
	}
	private gk: string | null = null;
	update(t: number, args: ToolArgs, ctx: ToolCtx): void {
		if (!this.frame) return;
		const gk = this.geomKey(args);
		if (this.gk === null) this.gk = this.geomKey(this.args);
		if (gk !== this.gk) {
			this.gk = gk;
			this.args = args;
			this.place(this.frame);
		}
		this.args = args;
		if (ctx.mat !== this.matFn) {
			this.matFn = ctx.mat;
			for (const m of this.mats.values()) m.dispose();
			this.mats.clear();
			this.rebind();
		}
		this.animate(t, args, ctx, this.frame);
		this.updateSection();
		this.updateWindowClip();
	}
	/** Own materials cut by the fixed section plane (rotating parts of a cut-away assembly). */
	protected sectionMats: THREE.Material[] = [];
	/** Tool-frame point of the section plane (normal +z: the half z > point.z toward the camera is removed). */
	protected sectionAt = new THREE.Vector3();
	private secPlane = new THREE.Plane();
	/** block / cell: every tool material is clipped to the block window behind the section plane (audit final F12). */
	private winPlanes: THREE.Plane[] | null = null;
	private winLocal: THREE.Plane[] = [];
	private setupWindowClip(f: ToolFrame): void {
		this.winPlanes = null;
		if (f.scale === 'work' || !f.window) return;
		const w = blockWin(f);
		this.winLocal = [
			new THREE.Plane(new THREE.Vector3(1, 0, 0), -w.x0),
			new THREE.Plane(new THREE.Vector3(-1, 0, 0), w.x1),
			new THREE.Plane(new THREE.Vector3(0, 0, 1), -w.z0),
			new THREE.Plane(new THREE.Vector3(0, 0, -1), Math.min(w.z1, w.zSec))
		];
		this.winPlanes = this.winLocal.map((p) => p.clone());
		for (const m of this.own) {
			m.clippingPlanes = this.winPlanes;
			if (m instanceof THREE.ShaderMaterial) m.clipping = true;
			m.needsUpdate = true;
		}
	}
	private updateWindowClip(): void {
		if (!this.winPlanes) return;
		this.group.updateWorldMatrix(true, false);
		const mw = this.group.matrixWorld;
		this.winLocal.forEach((p, i) => this.winPlanes![i].copy(p).applyMatrix4(mw));
	}
	private updateSection(): void {
		if (!this.sectionMats.length) return;
		this.group.updateWorldMatrix(true, false);
		const mw = this.group.matrixWorld;
		const n = new THREE.Vector3(0, 0, -1).transformDirection(mw);
		const p = this.sectionAt.clone().applyMatrix4(mw);
		this.secPlane.setFromNormalAndCoplanarPoint(n, p);
		for (const m of this.sectionMats) if (m.clippingPlanes?.[0] !== this.secPlane) m.clippingPlanes = [this.secPlane];
	}
	protected abstract animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void;
	abstract readouts(t: number, args: ToolArgs, ctx: ToolCtx): Readout[];
	workRot(_t: number, _args: ToolArgs, _ctx: ToolCtx): number {
		return 0;
	}
	protected setHold(h: Hold): void {
		this.group.userData.hold = h;
	}

	protected rig(name: string, parent?: string): THREE.Group {
		let g = this.rigs.get(name);
		if (!g) {
			g = new THREE.Group();
			g.name = name;
			(parent ? this.rig(parent) : this.group).add(g);
			this.rigs.set(name, g);
		}
		return g;
	}
	/** Accumulate a static-shape geometry into the (rig, material) batch; key = library key or 'own:<name>'. */
	protected add(rig: string, key: string, geo: THREE.BufferGeometry, tip: string): void {
		this.rig(rig);
		const k = `${rig}|${key}`;
		let a = this.acc.get(k);
		if (!a) {
			a = { rig, key, geos: [], tip };
			this.acc.set(k, a);
		} else if (!a.tip.split('; ').includes(tip)) a.tip += `; ${tip}`;
		a.geos.push(geo);
	}
	/** Accumulate into a batch drawn with an own (hardware) material. */
	protected addOwn(rig: string, name: string, mat: THREE.Material, geo: THREE.BufferGeometry, tip: string): void {
		this.rig(rig);
		const k = `${rig}|own:${name}`;
		let a = this.acc.get(k);
		if (!a) {
			a = { rig, key: `own:${name}`, geos: [], tip, own: mat };
			this.acc.set(k, a);
			if (!this.own.includes(mat)) this.own.push(mat);
		} else if (!a.tip.split('; ').includes(tip)) a.tip += `; ${tip}`;
		a.geos.push(geo);
	}
	/** Separately transformed mesh with a library material. */
	protected mesh(rig: string, key: string, geo: THREE.BufferGeometry, tip: string, state?: Partial<MatState>): THREE.Mesh {
		const m = new THREE.Mesh(geo, PLACEHOLDER);
		m.userData.tip = tip;
		m.userData.part = `${rig}|${key}`;
		this.rig(rig).add(m);
		this.pending.push({ mesh: m, key, state });
		return m;
	}
	/** Register an own material for disposal (lines, instanced meshes added directly). */
	protected keep<M extends THREE.Material>(m: M): M {
		if (!this.own.includes(m)) this.own.push(m);
		return m;
	}
	/** Separately transformed mesh with an own material. */
	protected ownMesh(rig: string, mat: THREE.Material, geo: THREE.BufferGeometry, tip: string, part = 'own'): THREE.Mesh {
		if (!this.own.includes(mat)) this.own.push(mat);
		const m = new THREE.Mesh(geo, mat);
		m.userData.tip = tip;
		m.userData.part = `${rig}|${part}`;
		this.rig(rig).add(m);
		return m;
	}
	/** Light-like guide (plasma glow, exposure light, laser): additive, no depth write; not a substance. */
	protected glow(rig: string, geo: THREE.BufferGeometry, mat: THREE.Material, tip: string): THREE.Mesh {
		const m = this.ownMesh(rig, mat, geo, tip, 'glow');
		m.renderOrder = 10;
		return m;
	}
	/** Particles (positions written by animate). Own additive points material, size in px. */
	protected points(rig: string, n: number, color: string, sizePx: number, opacity: number, tip: string, additive = true): THREE.Points {
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
		this.ownGeo.push(geo);
		const mat = new THREE.PointsMaterial({ color, size: sizePx, sizeAttenuation: false, transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
		this.own.push(mat);
		const p = new THREE.Points(geo, mat);
		p.frustumCulled = false;
		p.userData.tip = tip;
		p.userData.part = `${rig}|pts`;
		p.renderOrder = 11;
		this.rig(rig).add(p);
		return p;
	}
	private flush(): void {
		for (const a of this.acc.values()) {
			const g = a.geos.length === 1 ? a.geos[0] : merge(a.geos);
			if (a.own) this.ownMesh(a.rig, a.own, g, a.tip, a.key);
			else this.mesh(a.rig, a.key, g, a.tip);
		}
		this.acc.clear();
	}
	/** Library material per key (one instance per key in this actor; 'key#tag' = a separate instance of key). */
	protected mat(key: string): ProcMaterial | null {
		if (!this.matFn) return null;
		let m = this.mats.get(key);
		if (!m) {
			m = this.matFn(key.split('#')[0]);
			if (this.frame) m.setScale(this.frame.umPerUnit);
			if (this.winPlanes) m.setClipping(this.winPlanes);
			this.mats.set(key, m);
		}
		return m;
	}
	protected setMat(key: string, s: Partial<MatState>): void {
		this.mat(key)?.set(s);
	}
	private rebind(): void {
		if (!this.matFn) return;
		for (const p of this.pending) {
			const m = this.mat(p.key);
			if (!m) continue;
			p.mesh.material = m.material;
			if (p.state) m.set(p.state);
		}
		for (const m of this.mats.values()) {
			if (this.frame) m.setScale(this.frame.umPerUnit);
			m.setClipping(this.winPlanes);
		}
	}
	private clear(): void {
		this.group.traverse((o) => {
			const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
			if (g && typeof g.dispose === 'function') g.dispose();
		});
		for (const g of this.rigs.values()) g.removeFromParent();
		this.group.clear();
		this.rigs.clear();
		this.pending = [];
		for (const m of this.own) m.dispose();
		this.own = [];
		for (const g of this.ownGeo) g.dispose();
		this.ownGeo = [];
		this.sectionMats = [];
	}
	pick(obj: THREE.Object3D): string | null {
		let o: THREE.Object3D | null = obj;
		while (o && o !== this.group) {
			if (typeof o.userData.tip === 'string') return `${this.name}: ${o.userData.tip}`;
			o = o.parent;
		}
		return null;
	}
	dispose(): void {
		this.clear();
		for (const m of this.mats.values()) m.dispose();
		this.mats.clear();
	}
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
export function setInst(im: THREE.InstancedMesh, i: number, x: number, y: number, z: number, sx: number, sy = sx, sz = sx, q?: THREE.Quaternion): void {
	_p.set(x, y, z);
	_s.set(sx, sy, sz);
	_m.compose(_p, q ?? _q.identity(), _s);
	im.setMatrixAt(i, _m);
}
/** Part tag match: exact, or prefix when the pattern ends with '*'. */
export function partMatch(p: string, q: string): boolean {
	return q.endsWith('*') ? p.startsWith(q.slice(0, -1)) : p === q;
}
/** Set a glow intensity, honouring the block-scale dimming of applyLod. */
export function setGlow(m: THREE.ShaderMaterial | null, v: number): void {
	if (m) m.uniforms.uInt.value = v * ((m.userData.lodDim as number | undefined) ?? 1);
}
/** Deterministic hash noise in [0, 1) (no Math.random: kinematics stay pure). */
export function hash(i: number, salt = 0): number {
	const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
	return x - Math.floor(x);
}
/** Write point i of a Points cloud. */
export function setPt(p: THREE.Points, i: number, x: number, y: number, z: number): void {
	const a = p.geometry.attributes.position as THREE.BufferAttribute;
	a.setXYZ(i, x, y, z);
}
export function ptsDone(p: THREE.Points, count: number): void {
	const a = p.geometry.attributes.position as THREE.BufferAttribute;
	a.needsUpdate = true;
	p.geometry.setDrawRange(0, count);
}
