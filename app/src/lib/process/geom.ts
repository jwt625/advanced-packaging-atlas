// Geometry: z maps (actual / illustrative, blended between steps), merged boxes, per-site tile and band geometries
// (shared, cached), section halves. Local frame of tiles / bands: Y up (mapped), X = piece x, Z = -piece y.
import * as THREE from 'three';
import type { PBox, Sample } from './prims';

export interface ZM {
	map(z: number): number;
	readonly z0: number;
	readonly z1: number;
}

/** Piecewise z map. Actual: map(z) = z - z0 (um). Illustrative: the 3D tab's ZMap rule: coarse intervals get t^0.4 of
 * the total height H, fine breaks inside a coarse interval share it by thickness with a floor (each >= FLOOR / n). */
export class ZMapP implements ZM {
	readonly breaks: number[];
	readonly mapped: number[];
	constructor(breaks: number[], coarse: number[], readonly z0: number, readonly z1: number, readonly illustrative: boolean, H: number, focus?: [number, number] | null, share = 0.4) {
		const inR = (z: number) => z >= z0 - 1e-9 && z <= z1 + 1e-9;
		const b = [...new Set([z0, z1, ...breaks.filter(inR)].map((z) => Math.round(z * 1e6) / 1e6))].sort((a, c) => a - c);
		this.breaks = b;
		if (!illustrative || b.length < 2) {
			this.mapped = b.map((z) => z - z0);
			return;
		}
		const cs = new Set([b[0], b[b.length - 1], ...coarse.filter(inR).map((z) => Math.round(z * 1e6) / 1e6)]);
		const c = b.filter((z) => cs.has(z));
		const wc = c.slice(1).map((z, i) => Math.pow(Math.max(z - c[i], 0), 0.4));
		// final F2: the step's active region (the bodies its ops act on, incl. joints) gets at least `share` of H
		if (focus) {
			const inF = wc.map((_w, i) => c[i] >= focus[0] - 1e-6 && c[i + 1] <= focus[1] + 1e-6);
			const all = wc.reduce((s, x) => s + x, 0);
			const fs = wc.reduce((s, x, i) => s + (inF[i] ? x : 0), 0);
			if (fs > 0 && fs < all && fs / all < share) {
				const m = (share * (all - fs)) / (1 - share) / fs;
				wc.forEach((x, i) => { if (inF[i]) wc[i] = x * m; });
			}
		}
		const tot = wc.reduce((s, x) => s + x, 0) || 1;
		const FLOOR = 0.5;
		const out = [0];
		let bi = 0;
		for (let k = 0; k < c.length - 1; k++) {
			const Hk = (wc[k] / tot) * H, T = c[k + 1] - c[k];
			const sub: number[] = [];
			while (bi < b.length - 1 && b[bi + 1] <= c[k + 1] + 1e-9) { sub.push(b[bi + 1] - b[bi]); bi++; }
			const n = sub.length || 1;
			const ws = sub.map((t) => Math.max(t, (FLOOR * T) / n));
			const ts = ws.reduce((s, x) => s + x, 0) || 1;
			for (const w of ws) out.push(out[out.length - 1] + (w / ts) * Hk);
		}
		while (out.length < b.length) out.push(out[out.length - 1]);
		this.mapped = out;
	}
	map(z: number): number {
		const b = this.breaks, m = this.mapped, n = b.length;
		if (n < 2) return z - this.z0;
		if (z <= b[0]) return m[0] + (z - b[0]) * this.slope(0);
		if (z >= b[n - 1]) return m[n - 1] + (z - b[n - 1]) * this.slope(n - 2);
		let lo = 0, hi = n - 1;
		while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (b[mid] <= z) lo = mid; else hi = mid; }
		const t = b[hi] - b[lo];
		return t > 0 ? m[lo] + ((z - b[lo]) / t) * (m[hi] - m[lo]) : m[lo];
	}
	/** Inverse of map (piecewise linear, extrapolated like map). */
	inverse(y: number): number {
		const b = this.breaks, m = this.mapped, n = b.length;
		if (n < 2) return y + this.z0;
		if (y <= m[0]) return b[0] + (y - m[0]) / (this.slope(0) || 1);
		if (y >= m[n - 1]) return b[n - 1] + (y - m[n - 1]) / (this.slope(n - 2) || 1);
		let lo = 0, hi = n - 1;
		while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (m[mid] <= y) lo = mid; else hi = mid; }
		const d = m[hi] - m[lo];
		return d > 0 ? b[lo] + ((y - m[lo]) / d) * (b[hi] - b[lo]) : b[lo];
	}
	private slope(i: number): number {
		const t = this.breaks[i + 1] - this.breaks[i];
		return t > 0 ? (this.mapped[i + 1] - this.mapped[i]) / t : 1;
	}
}

export class BlendMap implements ZM {
	constructor(readonly a: ZM, readonly b: ZM, readonly w: number) {}
	get z0() { return this.b.z0; }
	get z1() { return this.b.z1; }
	map(z: number): number {
		return this.w >= 1 ? this.b.map(z) : this.w <= 0 ? this.a.map(z) : this.a.map(z) * (1 - this.w) + this.b.map(z) * this.w;
	}
}

// ---------------------------------------------------------------- boxes

/** Merged box geometry (scene coords: x - ox, map(z), -(y - oy)). */
export function boxesGeometry(boxes: PBox[], zm: ZM, ox: number, oy: number): THREE.BufferGeometry | null {
	if (!boxes.length) return null;
	const pos: number[] = [], nor: number[] = [], idx: number[] = [];
	const face = (p: number[][], n: number[]) => {
		const base = pos.length / 3;
		for (const q of p) pos.push(q[0], q[1], q[2]), nor.push(n[0], n[1], n[2]);
		idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
	};
	for (const b of boxes) {
		const x0 = b.x0 - ox, x1 = b.x1 - ox, Y0 = zm.map(b.z0), Y1 = zm.map(b.z1);
		const Z0 = -(b.y1 - oy), Z1 = -(b.y0 - oy); // scene z range
		if (!(x1 > x0 && Y1 > Y0 && Z1 > Z0)) continue;
		face([[x0, Y0, Z1], [x1, Y0, Z1], [x1, Y1, Z1], [x0, Y1, Z1]], [0, 0, 1]);
		face([[x1, Y0, Z0], [x0, Y0, Z0], [x0, Y1, Z0], [x1, Y1, Z0]], [0, 0, -1]);
		face([[x1, Y0, Z1], [x1, Y0, Z0], [x1, Y1, Z0], [x1, Y1, Z1]], [1, 0, 0]);
		face([[x0, Y0, Z0], [x0, Y0, Z1], [x0, Y1, Z1], [x0, Y1, Z0]], [-1, 0, 0]);
		face([[x0, Y1, Z1], [x1, Y1, Z1], [x1, Y1, Z0], [x0, Y1, Z0]], [0, 1, 0]);
		face([[x0, Y0, Z0], [x1, Y0, Z0], [x1, Y0, Z1], [x0, Y0, Z1]], [0, -1, 0]);
	}
	if (!pos.length) return null;
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
	g.setIndex(idx);
	return g;
}

// ---------------------------------------------------------------- cached unit geometries

const cache = new Map<string, THREE.BufferGeometry>();
export function cacheSize(): number {
	return cache.size;
}
export function clearGeomCache() {
	for (const g of cache.values()) g.dispose();
	cache.clear();
}
function cached(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
	let g = cache.get(key);
	if (!g) {
		if (cache.size > 800) clearGeomCache();
		g = make();
		cache.set(key, g);
	}
	return g;
}
const q = (x: number) => Math.round(x * 1e4) / 1e4;

/** Pitch cell px x py, height h (mapped), minus a round hole r; keeps local y >= dy (piece-y offset of the section
 * from the site center; <= -py/2 = full). Bottom at Y = 0. */
export function tileGeometry(px: number, py: number, r: number, dy: number, h: number, segs: number): THREE.BufferGeometry {
	const ylo = Math.max(-py / 2, dy);
	const key = `tile:${q(px)}:${q(py)}:${q(r)}:${q(ylo)}:${q(h)}:${segs}`;
	return cached(key, () => {
		const hx = px / 2, hy = py / 2;
		const s = new THREE.Shape();
		const rr = Math.min(r, hx * 0.999, hy * 0.999);
		if (rr <= 0 || ylo >= rr) {
			s.moveTo(-hx, ylo); s.lineTo(hx, ylo); s.lineTo(hx, hy); s.lineTo(-hx, hy); s.closePath();
		} else if (ylo <= -rr) {
			s.moveTo(-hx, ylo); s.lineTo(hx, ylo); s.lineTo(hx, hy); s.lineTo(-hx, hy); s.closePath();
			const hole = new THREE.Path();
			hole.absarc(0, 0, rr, 0, Math.PI * 2, true);
			s.holes.push(hole);
		} else {
			const xc = Math.sqrt(rr * rr - ylo * ylo);
			const aL = Math.atan2(ylo, -xc), aR = Math.atan2(ylo, xc);
			s.moveTo(-hx, ylo);
			s.lineTo(-xc, ylo);
			s.absarc(0, 0, rr, aL, aR, true);
			s.lineTo(hx, ylo);
			s.lineTo(hx, hy);
			s.lineTo(-hx, hy);
			s.closePath();
		}
		const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(h, 1e-6), bevelEnabled: false, curveSegments: segs });
		g.rotateX(-Math.PI / 2);
		return g;
	});
}

/** Solid of revolution between rin(y) and rout(y) over mapped samples (Y up, local origin at the site center).
 * half: keeps local z <= 0 (piece y >= site y) and closes the section with flat caps at z = 0.
 * skipOuter: the outer wall abuts another solid (lining films, host wall ring) and is never visible.
 * Indexed, analytic normals. Small profiles are cached and shared; large ones (scallops) are returned unshared. */
export function bandGeometry(ss: { y: number; rin: number; rout: number }[], segs: number, half: boolean, skipOuter = false): { geo: THREE.BufferGeometry; shared: boolean } {
	const make = () => {
		const pos: number[] = [], nor: number[] = [], idx: number[] = [];
		const p0 = half ? Math.PI : 0, pl = half ? Math.PI : Math.PI * 2;
		const n = ss.length;
		const slope = (r: (i: number) => number, i: number) => {
			const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
			const dy = ss[b].y - ss[a].y;
			return dy > 1e-9 ? (r(b) - r(a)) / dy : 0;
		};
		const wall = (r: (i: number) => number, outward: boolean) => {
			const base = pos.length / 3;
			for (let i = 0; i < n; i++) {
				const s = slope(r, i);
				for (let j = 0; j <= segs; j++) {
					const ph = p0 + (pl * j) / segs, c = Math.cos(ph), si = Math.sin(ph);
					pos.push(r(i) * c, ss[i].y, r(i) * si);
					const k = outward ? 1 : -1, l = Math.hypot(1, s);
					nor.push((k * c) / l, (-k * s) / l, (k * si) / l);
				}
			}
			const W = segs + 1;
			for (let i = 0; i < n - 1; i++) for (let j = 0; j < segs; j++) {
				const A = base + i * W + j, B = base + (i + 1) * W + j, C = base + i * W + j + 1, D = base + (i + 1) * W + j + 1;
				if (outward) idx.push(A, B, C, B, D, C);
				else idx.push(A, C, B, B, C, D);
			}
		};
		if (!skipOuter) wall((i) => ss[i].rout, true);
		if (ss.some((x) => x.rin > 1e-9)) wall((i) => ss[i].rin, false);
		const annulus = (i: number, up: boolean) => {
			const base = pos.length / 3;
			for (let j = 0; j <= segs; j++) {
				const ph = p0 + (pl * j) / segs;
				pos.push(ss[i].rin * Math.cos(ph), ss[i].y, ss[i].rin * Math.sin(ph), ss[i].rout * Math.cos(ph), ss[i].y, ss[i].rout * Math.sin(ph));
				nor.push(0, up ? 1 : -1, 0, 0, up ? 1 : -1, 0);
			}
			for (let j = 0; j < segs; j++) {
				const I = base + 2 * j, O = I + 1, I2 = I + 2, O2 = I + 3;
				if (up) idx.push(I, I2, O, O, I2, O2);
				else idx.push(I, O, I2, O, O2, I2);
			}
		};
		annulus(n - 1, true);
		annulus(0, false);
		if (half) {
			for (const sgn of [1, -1]) {
				const base = pos.length / 3;
				for (let i = 0; i < n; i++) {
					pos.push(sgn * ss[i].rin, ss[i].y, 0, sgn * ss[i].rout, ss[i].y, 0);
					nor.push(0, 0, 1, 0, 0, 1);
				}
				for (let i = 0; i < n - 1; i++) {
					const I = base + 2 * i, O = I + 1, I2 = I + 2, O2 = I + 3;
					if (sgn > 0) idx.push(I, O, I2, O, O2, I2);
					else idx.push(I, I2, O, O, I2, O2);
				}
			}
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
		g.setIndex(idx);
		return g;
	};
	if (ss.length > 64) return { geo: make(), shared: false };
	const key = `band:${segs}:${half ? 1 : 0}:${skipOuter ? 1 : 0}:${ss.map((x) => `${q(x.y)},${q(x.rin)},${q(x.rout)}`).join(';')}`;
	return { geo: cached(key, make), shared: true };
}

/** Samples mapped to scene y, consecutive duplicates removed. */
export function mapSamples(ss: Sample[], zm: ZM): { y: number; rin: number; rout: number }[] {
	const out: { y: number; rin: number; rout: number }[] = [];
	for (const s of ss) {
		const y = zm.map(s.z);
		const last = out[out.length - 1];
		if (last && Math.abs(last.y - y) < 1e-7 && Math.abs(last.rin - s.rin) < 1e-7 && Math.abs(last.rout - s.rout) < 1e-7) continue;
		out.push({ y, rin: s.rin, rout: s.rout });
	}
	return out;
}
