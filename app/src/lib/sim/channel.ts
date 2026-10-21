// "Pick channel" (R7 5.3, U3 first version): a picked routed conductor level (layer box) or a part with routed levels
// opens a regional EM draft case (SPEC 9 em2d): one signal line of the level's line width and thickness over a ground
// plane across the dielectric level below it, embedded in the level's matrix dielectric. Every value carries its
// status: reported / derived from the generator dims, `template` for the regional choices (ground, box, sweep, length)
// with the rationale; material constants from the L2 library or listed under `missing` (never invented).
import { stringify } from 'yaml';
import type { SimPart } from './protocol';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Rec = Record<string, any>;

export interface ChannelPick {
	layer: Rec;
	host: string;
}

/** The routed level behind a picked box: the box's own layer, else the first signal / mixed level hosted by the part. */
export function channelFor(p: SimPart, layers: Rec[]): ChannelPick | null {
	if (p.source === 'layer') {
		const l = layers.find((x) => x.id === p.layer);
		if (l?.route) return { layer: l, host: String(p.host ?? l.part) };
	}
	const hosted = layers.filter((l) => l.route && (l.part === p.id || (l.instances ?? []).includes(p.id)) && /signal|mixed/.test(String(l.route.use)));
	return hosted.length ? { layer: hosted.sort((a, b) => Number(b.z_um) - Number(a.z_um))[0], host: p.id } : null;
}

const st = (d: Rec | undefined, fallback = 'template') => String(d?.status ?? fallback);
const refOf = (d: Rec | undefined) => [d?.ref, ...(d?.refs ?? [])].filter(Boolean).join(', ');

/** em2d draft case text for a picked level (lib: L2 library object for eps_r / tan_delta / sigma, may be null). */
export function channelCase(pick: ChannelPick, layers: Rec[], familyId: string, lib: Rec | null): { id: string; text: string } {
	const L = pick.layer, r = L.route ?? {};
	const w = Number(r.line_um), t = Number(L.h_um);
	const below = layers
		.filter((x) => x.part === L.part && x.role === 'dielectric' && Number(x.z_um) + Number(x.h_um) <= Number(L.z_um) + 1e-6)
		.sort((a, b) => Number(b.z_um) - Number(a.z_um))[0];
	const hd = below ? Number(below.h_um) : t;
	const matKey = String(r.matrix ?? below?.material ?? 'oxide');
	const missing: string[] = [];
	const assumptions: string[] = [];
	const libKey = (k: string): string | null => {
		try {
			if (lib?.keys?.().includes(k)) return k;
			const a = lib?.aliasTemplateKey?.(k);
			return typeof a === 'string' ? a : (a?.key ?? null);
		} catch {
			return null;
		}
	};
	const res = (k: string | null) => {
		try {
			return k && lib ? lib.resolve(k, 298.15, { need: [] }) : null;
		} catch {
			return null;
		}
	};
	const dk = libKey(matKey), dr = res(dk);
	const material: Rec = { model: 'const', eps_r: dr?.eps_r ?? null, note: `library ${dk ?? 'n/a'} (template key ${matKey}); status ${dr?.eps_r != null ? 'library' : 'missing'}` };
	if (dr?.tan_delta != null) material.tan_delta = dr.tan_delta;
	if (dr?.eps_r == null) missing.push(`eps_r of ${matKey} (library ${dk ?? 'no alias'}: N/A): set em2d.materials.diel.eps_r before Compute`);
	if (dr?.tan_delta == null) missing.push(`tan_delta of ${matKey} (library ${dk ?? 'no alias'}: N/A); lossless dielectric until set`);
	const ck = libKey('copper'), cr = res(ck);
	const cond: Rec = { sigma_S_m: cr?.sigma_S_m ?? null, status: cr?.sigma_S_m != null ? 'library' : 'missing', note: `library ${ck ?? 'n/a'}` };
	if (cr?.sigma_S_m == null) missing.push('copper conductivity (library N/A)');
	const rn = (x: number) => Number(x.toPrecision(6));
	const half = rn(w / 2 + 10 * hd + w);
	assumptions.push(
		`template: single line of the level's line width over a ground plane ${hd} um below (the dielectric level under it${below ? `, ${below.id}` : ' not found: thickness = conductor thickness'}); ground thickness = conductor thickness`,
		`template: background dielectric = the level's matrix (${matKey}) everywhere (BEOL/RDL line embedded in its dielectric); neighbours, vias and the return path of the real routing are not modelled`,
		'template: box half-width w/2 + 10 h + w, height 10 h above the line, pmc walls (EM-1 convention); sweep 1-50 GHz, 25 points; line length 1 mm, zref 50 ohm'
	);
	const id = `em/draft-${L.id}`;
	const doc = {
		schema: 'ap-sim/0',
		id,
		title: `Draft channel: ${L.name ?? L.id} in ${pick.host} (${familyId}); regional EM, template set-up`,
		status: 'draft',
		family: 'em2d',
		em2d: {
			section: {
				box: { x_um: [-half, half], y_um: [-t, rn(hd + t + 10 * hd)], bc: { left: 'pmc', right: 'pmc', bottom: 'pmc', top: 'pmc' } },
				background: 'diel',
				dielectrics: [],
				conductors: [
					{ name: 'sig', role: 'signal', conductor: 'cu', rect_um: { x: [rn(-w / 2), rn(w / 2)], y: [hd, rn(hd + t)] }, status: `w ${st(r.dims?.line_um)}, t ${st(L.dims?.h_um)}`, ref: [refOf(r.dims?.line_um), refOf(L.dims?.h_um)].filter(Boolean).join('; ') || undefined },
					{ name: 'gnd', role: 'ground', conductor: 'cu', rect_um: { x: [-half, half], y: [-t, 0] }, status: 'template', note: 'return plane (template)' }
				]
			},
			materials: { diel: material },
			conductor_materials: { cu: cond },
			temperature_C: 25,
			sweep: { start_GHz: 1, stop_GHz: 50, points: 25, spacing: 'lin' },
			lines: [{ length_mm: 1, zref_ohm: 50 }],
			touchstone: true
		},
		targets: [],
		assumptions,
		missing,
		notes: `Picked from /sim geometry: level ${L.id} (line ${w} um ${st(r.dims?.line_um)}, space ${r.space_um} um ${st(r.dims?.space_um)}, thickness ${t} um ${st(L.dims?.h_um)}${below ? `; dielectric below ${below.id} ${below.h_um} um ${st(below.dims?.h_um)}` : ''}).`
	};
	return { id, text: stringify(doc, { lineWidth: 0 }) };
}
