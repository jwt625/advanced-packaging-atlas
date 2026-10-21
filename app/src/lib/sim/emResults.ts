// EM result helpers (U3): S-parameter extraction from runEm2d / runEm3d JSON (SPEC 9, 14; entries [re, im]),
// dB / phase (unwrapped) series, mixed-mode blocks, RLGC series, em3d solids as viewer parts. No physics here.
import type { SimPart } from './protocol';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Rec = Record<string, any>;
export type C = [number, number];

export const cabs = (z: C) => Math.hypot(z[0], z[1]);
export const dB = (z: C) => 20 * Math.log10(Math.max(cabs(z), 1e-300));
export const argDeg = (z: C) => (Math.atan2(z[1], z[0]) * 180) / Math.PI;

/** Unwrap a phase series (degrees) so steps stay within +-180. */
export function unwrapDeg(p: number[]): number[] {
	const out = [...p];
	for (let i = 1; i < out.length; i++) {
		let d = out[i] - out[i - 1];
		while (d > 180) { out[i] -= 360; d -= 360; }
		while (d < -180) { out[i] += 360; d += 360; }
	}
	return out;
}

export interface SBlock {
	/** Label of the matrix (e.g. `S (line 1, 10 mm)`, `Sdd`). */
	label: string;
	ports: string[];
	f_GHz: number[];
	/** S[f][i][j] */
	S: C[][][];
	zref: string;
}

/** S-parameter blocks of one variant: em2d lines (single-ended and mixed-mode) or the em3d block. */
export function sBlocks(variant: Rec, family: 'em2d' | 'em3d'): SBlock[] {
	const out: SBlock[] = [];
	if (family === 'em3d') {
		// SPEC 14.1 / 14.4 / 14.5 (engine/src/em3d/run.mjs): `S` = the block at zref_ohm, de-embedded per
		// derived.deembed_method (line_run: companions cut from the device mesh, reference planes inside the leads;
		// port_extension: phase shift inside the solver); `S_port_ref` = the solver S as power waves referenced to the real
		// part of each terminal's characteristic impedance (rows[].zref_native_ohm), before renormalization and, for
		// line_run, before de-embedding (port faces).
		const rows = (variant.derived?.rows ?? []) as Rec[];
		if (rows.length) {
			const d = variant.derived ?? {};
			const ports = ((rows[0].ports ?? []) as Rec[]).map((p, i) => String(p.name ?? i + 1));
			const terms = ((rows[0].terminals ?? []) as unknown[]).length ? (rows[0].terminals as unknown[]).map((t, i) => String((t as Rec)?.name ?? t ?? i + 1)) : ports;
			const de = deembedText(variant);
			out.push({ label: `S (zref ${d.zref_ohm ?? '?'} ohm; ${de})`, ports: terms.length === (rows[0].S?.length ?? 0) ? terms : ports, f_GHz: rows.map((r) => r.f_GHz), S: rows.map((r) => r.S), zref: `${d.zref_ohm ?? '?'} ohm (${de})` });
			if (rows[0].S_port_ref) {
				const zn = zNativeText(rows);
				const where = d.deembed_method === 'line_run' ? 'port faces, not de-embedded' : 'port extension included where deembed_um > 0';
				out.push({ label: `S (Re Z0 per terminal, before renormalization; ${where})`, ports: terms.length === (rows[0].S_port_ref?.length ?? 0) ? terms : ports, f_GHz: rows.map((r) => r.f_GHz), S: rows.map((r) => r.S_port_ref), zref: `Re Z0 per terminal (power waves${zn ? `; ${zn}` : ''}); ${where}` });
			}
		}
		return out;
	}
	const signals = ((variant.derived?.signals ?? []) as unknown[]).map(String);
	const n = signals.length || 1;
	((variant.derived?.lines ?? []) as Rec[]).forEach((L, li) => {
		const sp = (L.s_params ?? []) as Rec[];
		if (!sp.length) return;
		const ports = [...Array.from({ length: n }, (_, i) => `${signals[i] ?? i + 1} near`), ...Array.from({ length: n }, (_, i) => `${signals[i] ?? i + 1} far`)];
		const z = Array.isArray(L.zref_ohm) ? L.zref_ohm.join('/') : String(L.zref_ohm);
		out.push({ label: `S, line ${li + 1} (${L.length_mm} mm, zref ${z} ohm)`, ports, f_GHz: sp.map((r) => r.f_GHz), S: sp.map((r) => r.S), zref: z });
		const mm = (L.mixed_mode ?? []) as Rec[];
		if (mm.length) {
			for (const key of ['Sdd', 'Scc', 'Sdc', 'Scd']) {
				if (!mm[0][key]) continue;
				out.push({ label: `${key}, line ${li + 1} (${L.length_mm} mm)`, ports: ['1', '2'], f_GHz: mm.map((r) => r.f_GHz), S: mm.map((r) => r[key]), zref: `${z} (mixed-mode)` });
			}
		}
	});
	return out;
}

/** De-embedding of an em3d variant in words (derived.deembed_method, derived.companions). */
export function deembedText(v: Rec): string {
	const d = v.derived ?? {};
	const comps = ((d.companions ?? []) as (Rec | null)[]).filter((c): c is Rec => !!c);
	if (d.deembed_method === 'line_run' && comps.length) return `de-embedded by line-run companions, reference planes ${comps.map((c) => `${c.port} at ${c.reference_plane?.axis} = ${c.reference_plane?.at_um} um`).join(', ')}`;
	if (d.deembed_method === 'port_extension') return 'port extension where deembed_um > 0, else at the port faces';
	return d.deembed_method ? String(d.deembed_method) : 'de-embedding not reported';
}

/** Native reference impedances (Re Z0 per terminal) of the first and last rows, ohm. */
function zNativeText(rows: Rec[]): string {
	const z = (r: Rec) => ((r?.zref_native_ohm ?? []) as unknown[]).map((x) => (Array.isArray(x) ? Number(x[0]) : Number(x))).filter(Number.isFinite);
	const a = z(rows[0]), b = z(rows[rows.length - 1]);
	if (!a.length) return '';
	const f = (l: number[]) => l.map((x) => x.toPrecision(4)).join(' / ');
	return rows.length > 1 && b.length ? `${f(a)} ohm at ${rows[0].f_GHz} GHz, ${f(b)} ohm at ${rows[rows.length - 1].f_GHz} GHz` : `${f(a)} ohm`;
}

/** Magnitude (dB) and unwrapped phase (deg) of S_ij over frequency. */
export function sSeries(b: SBlock, i: number, j: number): { f: number[]; db: number[]; ph: number[]; z: C[] } {
	const z = b.S.map((m) => (m?.[i]?.[j] ?? [NaN, NaN]) as C);
	return { f: b.f_GHz, db: z.map(dB), ph: unwrapDeg(z.map(argDeg)), z };
}

/** RLGC(f) entry (row-major N x N) of an em2d variant. */
export function rlgcSeries(variant: Rec, key: 'R_ohm_per_m' | 'L_H_per_m' | 'G_S_per_m' | 'C_F_per_m', i: number, j: number): { f: number[]; v: number[] } {
	const rows = (variant.derived?.rlgc ?? []) as Rec[];
	const n = Math.round(Math.sqrt((rows[0]?.[key] ?? [0]).length));
	return { f: rows.map((r) => r.f_GHz), v: rows.map((r) => r[key]?.[i * n + j] ?? NaN) };
}

/** em3d solids as viewer parts (um -> mm; z in um); cylinders keep `shape: cyl`, polygons their bounding box. */
export function em3dParts(em3d: Rec | undefined): SimPart[] {
	if (!em3d) return [];
	const out: SimPart[] = [];
	const add = (name: string, kind: string, material: string, x: number[], y: number[], z: number[], extra: Rec = {}) =>
		out.push({ id: name, name, kind, material, x_mm: (x[0] + x[1]) / 2e3, y_mm: (y[0] + y[1]) / 2e3, w_mm: (x[1] - x[0]) / 1e3, d_mm: (y[1] - y[0]) / 1e3, z_um: z[0], h_um: z[1] - z[0], dims: {}, ...extra });
	for (const s of (em3d.solids ?? []) as Rec[]) {
		const kind = s.kind === 'conductor' ? 'em_conductor' : 'em_dielectric';
		const mat = String(s.material ?? s.conductor ?? (s.kind === 'conductor' ? 'copper' : 'dielectric'));
		if (s.box_um) add(s.name, kind, mat, s.box_um.x, s.box_um.y, s.box_um.z, { model: s.model });
		else if (s.cylinder_um) {
			const { c, r, z } = s.cylinder_um;
			add(s.name, kind, mat, [c[0] - r, c[0] + r], [c[1] - r, c[1] + r], z, { shape: 'cyl', model: s.model });
		} else if (s.poly_um?.poly) {
			const P = s.poly_um.poly as number[][], w = Number(s.poly_um.w ?? 0);
			const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
			add(s.name, kind, mat, [Math.min(...xs) - w / 2, Math.max(...xs) + w / 2], [Math.min(...ys) - w / 2, Math.max(...ys) + w / 2], [Number(s.z_um?.[0] ?? 0), Number(s.z_um?.[1] ?? 0)], { note: 'polygon drawn as its bounding box' });
		}
	}
	return out;
}

/** Touchstone files of all variants ({variant, name, text}). */
export function touchstones(em: Rec): { variant: string; name: string; text: string }[] {
	return ((em?.variants ?? [em]) as Rec[]).flatMap((v) => ((v.touchstone ?? []) as Rec[]).map((t) => ({ variant: String(v.variant ?? 'base'), name: String(t.name), text: String(t.text) })));
}
