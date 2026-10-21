// Worker-side postprocessing on the rectilinear grid (SPEC 3, 5; R7 4.1, 6.6; pattern: eo-modulator-atlas
// post/session.ts, GPL-3.0-or-later). Runs where the solution lives (EO DevLog-030 P1); only display arrays travel.
// - surface: exterior faces of the active cells (cellPart >= 0; per point a process_sequence step mask, L12). An optional axis-aligned clip inserts the clip plane
//   as a grid plane and interpolates the nodal field there (exact for Q1), so the cut face is the slice of the field.
// - slice: one axis-aligned plane through the active cells (same interpolation).
// - line: nodal values along x, y or z through a point (bilinear in the two other axes).
// Positions are in mm (package frame, z up); values in SI (K for T, m for cell size).

export type Axis = 'x' | 'y' | 'z';
export type Expr = 'T' | 'cellsize' | 'uz' | 'umag' | 'vm' | 'dT';

export interface GridLike {
	xs: Float64Array;
	ys: Float64Array;
	zs: Float64Array;
	nx: number;
	ny: number;
	nz: number;
	cellPart: Int32Array;
}

export interface SurfaceOut {
	pos: Float32Array; // 4 vertices per face, xyz mm
	val: Float32Array; // per vertex
	disp: Float32Array | null; // per vertex xyz (m): mechanics displacement, or the synthetic debug field
	index: Uint32Array; // 6 per face
	faceCell: Int32Array; // per face
	faces: number;
	/** Triangle soup (isosurface): faces = triangles / 2 for the count, no quad outlines. */
	tri?: boolean;
	range: [number, number];
	ms: number;
}

export interface ClipSpec {
	axis: Axis;
	pos_m: number;
	keep: '+' | '-';
}

const AX: Record<Axis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 };

/** Index c with a[c] <= v <= a[c + 1] (clamped to the cell range) and the local coordinate t in [0, 1]. */
export function locate(a: Float64Array, v: number): { c: number; t: number } {
	const n = a.length - 1;
	if (v <= a[0]) return { c: 0, t: 0 };
	if (v >= a[n]) return { c: n - 1, t: 1 };
	let lo = 0, hi = n;
	while (hi - lo > 1) {
		const m = (lo + hi) >> 1;
		if (a[m] <= v) lo = m;
		else hi = m;
	}
	return { c: lo, t: (v - a[lo]) / (a[lo + 1] - a[lo]) };
}

export class PostSession {
	readonly g: GridLike;
	readonly T: Float64Array | null;
	/** Displacement per mechanics point (3 per node, m). */
	readonly U: Float64Array[];
	private NX: number;
	private NY: number;
	/** von Mises at the 8 corners of each active cell per mechanics point (L8 vm_cellnode_Pa, corner a = i + 2 j + 4 k). */
	readonly VM: Float64Array[];
	private cellQ: Int32Array | null = null;
	/**
	 * Cell activity per mechanics point (process_sequence: the grid masked to the parts active at that step, -1 =
	 * inactive; lane L12). null or absent = g.cellPart. Every op draws only the cells active at its point.
	 */
	private masks: (Int32Array | null)[];
	/** Cell -> part (or -1) of the point of the current op (set by use()). */
	private cp: Int32Array;
	constructor(g: GridLike, T: Float64Array | null, U: Float64Array[] = [], VM: Float64Array[] = [], activeCells: Int32Array | null = null, masks: (Int32Array | null)[] = []) {
		this.g = g;
		this.T = T;
		this.U = U;
		this.VM = VM;
		this.masks = masks;
		this.cp = g.cellPart;
		if (activeCells) {
			this.cellQ = new Int32Array(g.nx * g.ny * g.nz).fill(-1);
			activeCells.forEach((c, q) => (this.cellQ![c] = q));
		}
		this.NX = g.nx + 1;
		this.NY = g.ny + 1;
	}

	/** Nodal scalar of an expression (SI), or null when the session has no such field. */
	field(expr: Expr, point = 0): ((n: number) => number) | null {
		if (expr === 'T') return this.T ? (n) => this.T![n] : null;
		if (expr === 'dT') return this.T && this.ref ? (n) => this.T![n] - this.ref![n] : null;
		const u = this.U[point];
		if (!u) return null;
		if (expr === 'uz') return (n) => u[3 * n + 2];
		if (expr === 'umag') return (n) => Math.hypot(u[3 * n], u[3 * n + 1], u[3 * n + 2]);
		return null;
	}

	/** Reference nodal field of another run on the same grid (compare runs: dT = T - ref). */
	ref: Float64Array | null = null;
	/** Diagonal conductivity of a cell at a temperature (worker-side library resolver), for heat-flux arrows. */
	kOf: ((cell: number, T_K: number) => number[]) | null = null;

	private ext = new Map<Int32Array, Int32Array>();
	/** Select the cell activity of a point (process_sequence steps); ops call it first. */
	private use(point: number) {
		const m = this.masks[point];
		this.cp = m && m.length === this.g.cellPart.length ? m : this.g.cellPart;
	}
	/** Exterior faces of the active cells (cell * 6 + direction), computed once per session and activity mask. */
	exterior(): Int32Array {
		const hit = this.ext.get(this.cp);
		if (hit) return hit;
		const g = this.g, out: number[] = [];
		const D = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
		for (let k = 0; k < g.nz; k++)
			for (let j = 0; j < g.ny; j++)
				for (let i = 0; i < g.nx; i++) {
					const cell = i + g.nx * (j + g.ny * k);
					if (this.cp[cell] < 0) continue;
					for (let d = 0; d < 6; d++) if (!this.active(i + D[d][0], j + D[d][1], k + D[d][2])) out.push(cell * 6 + d);
				}
		const ext = Int32Array.from(out);
		this.ext.set(this.cp, ext);
		return ext;
	}

	/** von Mises (Pa) at corner (di, dj, dk) of cell c, or NaN. */
	vmAt(c: number, di: number, dj: number, dk: number, point = 0): number {
		const vm = this.VM[point], q = this.cellQ?.[c] ?? -1;
		return vm && q >= 0 ? vm[8 * q + di + 2 * dj + 4 * dk] : NaN;
	}

	private node(i: number, j: number, k: number): number {
		return i + this.NX * (j + this.NY * k);
	}

	private active(i: number, j: number, k: number): boolean {
		const g = this.g;
		return i >= 0 && j >= 0 && k >= 0 && i < g.nx && j < g.ny && k < g.nz && this.cp[i + g.nx * (j + g.ny * k)] >= 0;
	}

	/** Cell size (largest edge, m) of a cell. */
	cellSize(c: number): number {
		const g = this.g;
		const i = c % g.nx, j = Math.floor(c / g.nx) % g.ny, k = Math.floor(c / (g.nx * g.ny));
		return Math.max(g.xs[i + 1] - g.xs[i], g.ys[j + 1] - g.ys[j], g.zs[k + 1] - g.zs[k]);
	}

	/**
	 * Exterior faces of the active cells, optionally clipped. A view = index ranges per axis plus, on the clipped axis,
	 * the clip plane as a moved first or last grid plane with interpolated nodal values.
	 */
	surface(expr: Expr, clip: ClipSpec | null, synthetic = false, point = 0): SurfaceOut {
		this.use(point);
		const t0 = performance.now();
		const g = this.g;
		const coords = [g.xs, g.ys, g.zs];
		const lo = [0, 0, 0], hi = [g.nx, g.ny, g.nz]; // cell index ranges [lo, hi)
		let ca = -1, cPlane = -1, cT = 0, cPos = 0; // clipped axis, moved node plane, interpolation, position
		if (clip) {
			ca = AX[clip.axis];
			const { c, t } = locate(coords[ca], clip.pos_m);
			cT = t;
			cPos = clip.pos_m;
			if (clip.keep === '+') {
				lo[ca] = c;
				cPlane = c; // node plane c moves to pos (values interpolated between c and c + 1)
			} else {
				hi[ca] = c + 1;
				cPlane = c + 1; // node plane c + 1 moves to pos
			}
		}
		const coord = (a: number, n: number) => (a === ca && n === cPlane ? cPos : coords[a][n]);
		const F = this.field(expr, point);
		const U = this.U[point] ?? null;
		const T = F;
		const nodeVal = (i: number, j: number, k: number): number => {
			if (!T) return 0;
			if (ca < 0) return T(this.node(i, j, k));
			const ijk = [i, j, k];
			if (ijk[ca] !== cPlane) return T(this.node(i, j, k));
			const a = [...ijk], b = [...ijk];
			if (clip!.keep === '+') b[ca] = cPlane + 1;
			else { a[ca] = cPlane - 1; }
			const va = T(this.node(a[0], a[1], a[2])), vb = T(this.node(b[0], b[1], b[2]));
			return clip!.keep === '+' ? va + (vb - va) * cT : va + (vb - va) * cT;
		};
		// faces to draw (code = cell * 6 + direction): the cached exterior of the full model, and with a clip only the
		// cells on the kept side plus the cap on the clip layer (no full-grid pass per drag step)
		const ext = this.exterior();
		let list: Int32Array;
		if (ca < 0) list = ext;
		else {
			const nxy = g.nx * g.ny;
			const layer = (cell: number) => (ca === 0 ? cell % g.nx : ca === 1 ? Math.floor(cell / g.nx) % g.ny : Math.floor(cell / nxy));
			const keepPlus = clip!.keep === '+';
			const cl = keepPlus ? lo[ca] : hi[ca] - 1; // clip layer
			const capDir = keepPlus ? 2 * ca : 2 * ca + 1;
			const tmp: number[] = [];
			for (let q = 0; q < ext.length; q++) {
				const code = ext[q], cell = (code / 6) | 0, d = code - 6 * cell, L = layer(cell);
				if (keepPlus ? L > cl : L < cl) tmp.push(code);
				else if (L === cl && d !== capDir) tmp.push(code);
			}
			// cap: the clip-plane face of every active cell of the clip layer
			const [b1, b2] = [0, 1, 2].filter((x) => x !== ca);
			const n1 = [g.nx, g.ny, g.nz][b1], n2 = [g.nx, g.ny, g.nz][b2];
			const ijk = [0, 0, 0];
			for (let v = 0; v < n2; v++)
				for (let u = 0; u < n1; u++) {
					ijk[ca] = cl; ijk[b1] = u; ijk[b2] = v;
					const cell = ijk[0] + g.nx * (ijk[1] + g.ny * ijk[2]);
					if (this.cp[cell] >= 0) tmp.push(cell * 6 + capDir);
				}
			list = Int32Array.from(tmp);
		}
		const nf = list.length;
		const pos = new Float32Array(nf * 12), val = new Float32Array(nf * 4), index = new Uint32Array(nf * 6), faceCell = new Int32Array(nf);
		const disp = U || synthetic ? new Float32Array(nf * 12) : null;
		// synthetic test displacement (debug): u_z = (1 - r^2 / R^2) * 1e-6 m over the model footprint, u_x = u_y = 0
		const R2 = synthetic ? Math.max(...[0, 1].map((a) => Math.max(Math.abs(coords[a][0]), Math.abs(coords[a][coords[a].length - 1])) ** 2)) * 2 : 1;
		let f = 0, vmin = Infinity, vmax = -Infinity;
		// face corner offsets (node index deltas) per direction, counter-clockwise seen from outside
		const corners = (d: number): number[][] => {
			switch (d) {
				case 0: return [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]];
				case 1: return [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]];
				case 2: return [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]];
				case 3: return [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]];
				case 4: return [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]];
				default: return [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
			}
		};
		const C = [0, 1, 2, 3, 4, 5].map(corners);
		let lastCell = -1, cs = 0;
		for (let fi = 0; fi < nf; fi++) {
			const cell = (list[fi] / 6) | 0, d = list[fi] - 6 * cell;
			const i = cell % g.nx, j = Math.floor(cell / g.nx) % g.ny, k = Math.floor(cell / (g.nx * g.ny));
			if (cell !== lastCell) { cs = expr === 'cellsize' ? this.cellSize(cell) : 0; lastCell = cell; }
			const v0 = f * 4;
			for (let q = 0; q < 4; q++) {
				const [di, dj, dk] = C[d][q];
				const I = i + di, J = j + dj, K = k + dk;
				const x = coord(0, I), y = coord(1, J), z = coord(2, K);
				pos[(v0 + q) * 3] = x * 1e3;
				pos[(v0 + q) * 3 + 1] = y * 1e3;
				pos[(v0 + q) * 3 + 2] = z * 1e3;
				const v = expr === 'cellsize' ? cs : expr === 'vm' ? this.vmAt(cell, di, dj, dk, point) : nodeVal(I, J, K);
				val[v0 + q] = v;
				if (v < vmin) vmin = v;
				if (v > vmax) vmax = v;
				if (disp && U) {
					// displacement at the (unclipped) node; at the moved clip plane the nearest node value (display only)
					const n = this.node(Math.min(I, g.nx), Math.min(J, g.ny), Math.min(K, g.nz));
					disp[(v0 + q) * 3] = U[3 * n];
					disp[(v0 + q) * 3 + 1] = U[3 * n + 1];
					disp[(v0 + q) * 3 + 2] = U[3 * n + 2];
				} else if (disp) disp[(v0 + q) * 3 + 2] = (1 - (x * x + y * y) / R2) * 1e-6;
			}
			index.set([v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3], f * 6);
			faceCell[f] = cell;
			f++;
		}
		return { pos, val, disp, index, faceCell, faces: nf, range: [vmin, vmax], ms: performance.now() - t0 };
	}

	/** Axis-aligned slice through the active cells at pos (m); values interpolated between the bracketing node planes. */
	slice(expr: Expr, axis: Axis, pos_m: number, point = 0): SurfaceOut {
		this.use(point);
		const t0 = performance.now();
		const g = this.g;
		const a = AX[axis], coords = [g.xs, g.ys, g.zs];
		const { c, t } = locate(coords[a], pos_m);
		const [b1, b2] = ([0, 1, 2] as const).filter((x) => x !== a);
		const n1 = [g.nx, g.ny, g.nz][b1], n2 = [g.nx, g.ny, g.nz][b2];
		const cellAt = (u: number, v: number) => {
			const ijk = [0, 0, 0];
			ijk[a] = c; ijk[b1] = u; ijk[b2] = v;
			return ijk;
		};
		let nf = 0;
		for (let v = 0; v < n2; v++) for (let u = 0; u < n1; u++) { const q = cellAt(u, v); if (this.active(q[0], q[1], q[2])) nf++; }
		const posA = new Float32Array(nf * 12), val = new Float32Array(nf * 4), index = new Uint32Array(nf * 6), faceCell = new Int32Array(nf);
		const T = this.field(expr, point);
		const nodeVal = (u: number, v: number) => {
			if (!T) return 0;
			const p = [0, 0, 0], q = [0, 0, 0];
			p[a] = c; q[a] = c + 1; p[b1] = q[b1] = u; p[b2] = q[b2] = v;
			const va = T(this.node(p[0], p[1], p[2])), vb = T(this.node(q[0], q[1], q[2]));
			return va + (vb - va) * t;
		};
		let f = 0, vmin = Infinity, vmax = -Infinity;
		const quad = [[0, 0], [1, 0], [1, 1], [0, 1]];
		for (let v = 0; v < n2; v++)
			for (let u = 0; u < n1; u++) {
				const q = cellAt(u, v);
				if (!this.active(q[0], q[1], q[2])) continue;
				const cell = q[0] + g.nx * (q[1] + g.ny * q[2]);
				const cs = expr === 'cellsize' ? this.cellSize(cell) : 0;
				const v0 = f * 4;
				for (let r = 0; r < 4; r++) {
					const U = u + quad[r][0], V = v + quad[r][1];
					const xyz = [0, 0, 0];
					xyz[a] = pos_m; xyz[b1] = coords[b1][U]; xyz[b2] = coords[b2][V];
					posA.set([xyz[0] * 1e3, xyz[1] * 1e3, xyz[2] * 1e3], (v0 + r) * 3);
					let val0: number;
					if (expr === 'cellsize') val0 = cs;
					else if (expr === 'vm') {
						const o = [0, 0, 0], o2 = [0, 0, 1];
						o[b1] = quad[r][0]; o[b2] = quad[r][1]; o[a] = 0;
						const lo2 = this.vmAt(cell, o[0], o[1], o[2], point);
						o[a] = 1;
						const hi2 = this.vmAt(cell, o[0], o[1], o[2], point);
						void o2;
						val0 = lo2 + (hi2 - lo2) * t;
					} else val0 = nodeVal(U, V);
					val[v0 + r] = val0;
					if (val0 < vmin) vmin = val0;
					if (val0 > vmax) vmax = val0;
				}
				index.set([v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3], f * 6);
				faceCell[f] = cell;
				f++;
			}
		return { pos: posA, val, disp: null, index, faceCell, faces: nf, range: [vmin, vmax], ms: performance.now() - t0 };
	}

	/** Nodal field along an axis through point p (m); NaN where both cells at a node along the line are void. */
	line(axis: Axis, p: [number, number, number], expr: Expr = 'T', point = 0): { s: Float64Array; v: Float64Array } {
		this.use(point);
		const g = this.g;
		const a = AX[axis], coords = [g.xs, g.ys, g.zs];
		const [b1, b2] = ([0, 1, 2] as const).filter((x) => x !== a);
		const L1 = locate(coords[b1], p[b1]), L2 = locate(coords[b2], p[b2]);
		const n = coords[a].length;
		const s = new Float64Array(n), v = new Float64Array(n);
		const T = this.field(expr, point);
		const nAx = [g.nx, g.ny, g.nz][a];
		for (let m = 0; m < n; m++) {
			s[m] = coords[a][m];
			const ijk = (u: number, w: number, k: number) => { const q = [0, 0, 0]; q[a] = k; q[b1] = u; q[b2] = w; return q; };
			const c1 = ijk(L1.c, L2.c, Math.min(m, nAx - 1)), c0 = ijk(L1.c, L2.c, Math.max(m - 1, 0));
			if (!T || (!this.active(c1[0], c1[1], c1[2]) && !this.active(c0[0], c0[1], c0[2]))) { v[m] = NaN; continue; }
			const at = (du: number, dw: number) => { const q = ijk(L1.c + du, L2.c + dw, m); return T(this.node(q[0], q[1], q[2])); };
			const t1 = L1.t, t2 = L2.t;
			v[m] = (1 - t1) * (1 - t2) * at(0, 0) + t1 * (1 - t2) * at(1, 0) + (1 - t1) * t2 * at(0, 1) + t1 * t2 * at(1, 1);
		}
		return { s, v };
	}

	/** Corner node indices of cell (i, j, k), corner a = di + 2 dj + 4 dk. */
	private cornerNodes(i: number, j: number, k: number, out: Int32Array) {
		for (let a = 0; a < 8; a++) out[a] = this.node(i + (a & 1), j + ((a >> 1) & 1), k + ((a >> 2) & 1));
	}

	/**
	 * Isosurfaces by marching tetrahedra (6 tets per active hex around the 0-7 diagonal; exact for the linear
	 * interpolant on each tet). Vertex value = level (SI). Cells whose corner range misses every level are skipped.
	 */
	iso(expr: Expr, levels: number[], point = 0): SurfaceOut {
		this.use(point);
		const t0 = performance.now();
		const g = this.g, F = this.field(expr, point);
		const pos: number[] = [], val: number[] = [];
		const cells: number[] = [];
		if (F && levels.length) {
			const TET = [[0, 1, 3, 7], [0, 3, 2, 7], [0, 2, 6, 7], [0, 6, 4, 7], [0, 4, 5, 7], [0, 5, 1, 7]];
			const nd = new Int32Array(8), v = new Float64Array(8), P = new Float64Array(24);
			for (let k = 0; k < g.nz; k++)
				for (let j = 0; j < g.ny; j++)
					for (let i = 0; i < g.nx; i++) {
						const cell = i + g.nx * (j + g.ny * k);
						if (this.cp[cell] < 0) continue;
						this.cornerNodes(i, j, k, nd);
						let lo = Infinity, hi = -Infinity;
						for (let a = 0; a < 8; a++) { v[a] = F(nd[a]); if (v[a] < lo) lo = v[a]; if (v[a] > hi) hi = v[a]; }
						if (!levels.some((L) => L >= lo && L <= hi)) continue;
						for (let a = 0; a < 8; a++) {
							P[3 * a] = g.xs[i + (a & 1)] * 1e3; P[3 * a + 1] = g.ys[j + ((a >> 1) & 1)] * 1e3; P[3 * a + 2] = g.zs[k + ((a >> 2) & 1)] * 1e3;
						}
						for (const L of levels) {
							if (L < lo || L > hi) continue;
							for (const tet of TET) {
								const inside = tet.filter((a) => v[a] >= L), outside = tet.filter((a) => v[a] < L);
								if (!inside.length || !outside.length) continue;
								const cut = (a: number, b: number) => {
									const s = (L - v[a]) / (v[b] - v[a]);
									return [P[3 * a] + s * (P[3 * b] - P[3 * a]), P[3 * a + 1] + s * (P[3 * b + 1] - P[3 * a + 1]), P[3 * a + 2] + s * (P[3 * b + 2] - P[3 * a + 2])];
								};
								const tri = (A: number[], B: number[], C: number[]) => { pos.push(...A, ...B, ...C); val.push(L, L, L); cells.push(cell); };
								if (inside.length === 1 || outside.length === 1) {
									const one = inside.length === 1 ? inside[0] : outside[0], rest = inside.length === 1 ? outside : inside;
									tri(cut(one, rest[0]), cut(one, rest[1]), cut(one, rest[2]));
								} else {
									const [a, b] = inside, [c, d] = outside;
									const ac = cut(a, c), ad = cut(a, d), bc = cut(b, c), bd = cut(b, d);
									tri(ac, ad, bd);
									tri(ac, bd, bc);
								}
							}
						}
					}
		}
		const nt = val.length / 3;
		// one "face" per triangle pair slot is not meaningful here: faces = triangles, index sequential
		const index = new Uint32Array(val.length);
		for (let q = 0; q < index.length; q++) index[q] = q;
		const lo = levels.length ? Math.min(...levels) : 0, hi = levels.length ? Math.max(...levels) : 1;
		return { pos: Float32Array.from(pos), val: Float32Array.from(val), disp: null, index, faceCell: Int32Array.from(cells), faces: nt / 2, tri: true, range: [lo, hi], ms: performance.now() - t0 };
	}

	/**
	 * Arrows on a strided set of active cells (about `target` arrows): heat flux q = -k grad T (W/m2; Q1 gradient at
	 * the cell centre, k diagonal from kOf at the cell-mean T) or displacement u (m, mean of the 8 corners).
	 */
	arrows(kind: 'flux' | 'u', target: number, point = 0): { pos: Float32Array; vec: Float32Array; mag: Float32Array; n: number; stride: number; ms: number } {
		const t0 = performance.now();
		const g = this.g;
		let nAct = 0;
		this.use(point);
		for (let c = 0; c < this.cp.length; c++) if (this.cp[c] >= 0) nAct++;
		const stride = Math.max(1, Math.round(Math.cbrt(nAct / Math.max(1, target))));
		const sz = Math.max(1, Math.round(stride / 2)); // fewer z layers: packages are thin
		const nd = new Int32Array(8), v = new Float64Array(8);
		const pos: number[] = [], vec: number[] = [], mag: number[] = [];
		const U = this.U[point], T = this.T;
		for (let k = 0; k < g.nz; k += sz)
			for (let j = 0; j < g.ny; j += stride)
				for (let i = 0; i < g.nx; i += stride) {
					const cell = i + g.nx * (j + g.ny * k);
					if (this.cp[cell] < 0) continue;
					this.cornerNodes(i, j, k, nd);
					let vx = 0, vy = 0, vz = 0;
					if (kind === 'u') {
						if (!U) continue;
						for (let a = 0; a < 8; a++) { vx += U[3 * nd[a]] / 8; vy += U[3 * nd[a] + 1] / 8; vz += U[3 * nd[a] + 2] / 8; }
					} else {
						if (!T) continue;
						let Tm = 0;
						for (let a = 0; a < 8; a++) { v[a] = T[nd[a]]; Tm += v[a] / 8; }
						const hx = g.xs[i + 1] - g.xs[i], hy = g.ys[j + 1] - g.ys[j], hz = g.zs[k + 1] - g.zs[k];
						// centre gradient of the trilinear interpolant: mean of the 4 edge differences per axis
						const gx = (v[1] - v[0] + v[3] - v[2] + v[5] - v[4] + v[7] - v[6]) / (4 * hx);
						const gy = (v[2] - v[0] + v[3] - v[1] + v[6] - v[4] + v[7] - v[5]) / (4 * hy);
						const gz = (v[4] - v[0] + v[5] - v[1] + v[6] - v[2] + v[7] - v[3]) / (4 * hz);
						const kk = this.kOf ? this.kOf(cell, Tm) : [1, 1, 1];
						vx = -kk[0] * gx; vy = -kk[1] * gy; vz = -kk[2] * gz;
					}
					pos.push((g.xs[i] + g.xs[i + 1]) * 500, (g.ys[j] + g.ys[j + 1]) * 500, (g.zs[k] + g.zs[k + 1]) * 500);
					vec.push(vx, vy, vz);
					mag.push(Math.hypot(vx, vy, vz));
				}
		return { pos: Float32Array.from(pos), vec: Float32Array.from(vec), mag: Float32Array.from(mag), n: mag.length, stride, ms: performance.now() - t0 };
	}

	/**
	 * VTK XML UnstructuredGrid of the active cells (VTK_HEXAHEDRON = 12, VTK corner order 0,1,3,2,4,5,7,6 of our
	 * a = i + 2 j + 4 k numbering); points = all grid nodes (m); PointData T_K and u_m (first point) when present;
	 * CellData part_id and von_mises_Pa (mean of the 8 cell corners) when present. Inline binary, base64, UInt32 header.
	 */
	vtu(point = 0, partIds: string[] = []): string {
		const g = this.g;
		const NX = g.nx + 1, NY = g.ny + 1, NZ = g.nz + 1, N = NX * NY * NZ;
		const pts = new Float64Array(3 * N);
		for (let k = 0; k < NZ; k++) for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const n = i + NX * (j + NY * k); pts[3 * n] = g.xs[i]; pts[3 * n + 1] = g.ys[j]; pts[3 * n + 2] = g.zs[k]; }
		const act: number[] = [];
		this.use(point);
		for (let c = 0; c < this.cp.length; c++) if (this.cp[c] >= 0) act.push(c);
		const nc = act.length;
		const conn = new Int32Array(8 * nc), offs = new Int32Array(nc), types = new Uint8Array(nc).fill(12), pid = new Int32Array(nc);
		const ORDER = [0, 1, 3, 2, 4, 5, 7, 6];
		const nd = new Int32Array(8);
		let vm: Float64Array | null = this.VM[point] ? new Float64Array(nc) : null;
		act.forEach((c, q) => {
			const i = c % g.nx, j = Math.floor(c / g.nx) % g.ny, k = Math.floor(c / (g.nx * g.ny));
			this.cornerNodes(i, j, k, nd);
			for (let a = 0; a < 8; a++) conn[8 * q + a] = nd[ORDER[a]];
			offs[q] = 8 * (q + 1);
			pid[q] = this.cp[c];
			if (vm) { let s = 0; for (let a = 0; a < 8; a++) s += this.vmAt(c, a & 1, (a >> 1) & 1, (a >> 2) & 1, point); vm[q] = s / 8; }
		});
		if (vm && !vm.some(Number.isFinite)) vm = null;
		const b64 = (arr: ArrayBufferView) => {
			const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
			const head = new Uint8Array(4);
			new DataView(head.buffer).setUint32(0, bytes.length, true);
			const all = new Uint8Array(4 + bytes.length);
			all.set(head, 0); all.set(bytes, 4);
			let s = '';
			for (let q = 0; q < all.length; q += 0x8000) s += String.fromCharCode(...all.subarray(q, q + 0x8000));
			return btoa(s);
		};
		const da = (type: string, name: string, comps: number, arr: ArrayBufferView) => `<DataArray type="${type}" Name="${name}"${comps > 1 ? ` NumberOfComponents="${comps}"` : ''} format="binary">${b64(arr)}</DataArray>`;
		const pd: string[] = [];
		if (this.T) pd.push(da('Float64', 'T_K', 1, this.T));
		if (this.U[point]) pd.push(da('Float64', 'u_m', 3, this.U[point]));
		const cd = [da('Int32', 'part_id', 1, pid), ...(vm ? [da('Float64', 'von_mises_Pa', 1, vm)] : [])];
		const names = partIds.length ? `<!-- part_id: ${partIds.map((p, i) => `${i}=${p}`).join(' ').replace(/--/g, '-')} -->` : '';
		return `<?xml version="1.0"?>\n<VTKFile type="UnstructuredGrid" version="1.0" byte_order="LittleEndian" header_type="UInt32">\n${names}\n<UnstructuredGrid><Piece NumberOfPoints="${N}" NumberOfCells="${nc}">\n<PointData>${pd.join('\n')}</PointData>\n<CellData>${cd.join('\n')}</CellData>\n<Points>${da('Float64', 'Points', 3, pts)}</Points>\n<Cells>${da('Int32', 'connectivity', 1, conn)}\n${da('Int32', 'offsets', 1, offs)}\n${da('UInt8', 'types', 1, types)}</Cells>\n</Piece></UnstructuredGrid>\n</VTKFile>\n`;
	}
}
