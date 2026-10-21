// In-memory default thermal study for a family session without a case file (coordinator, DevLog-012 wave 2): a UI
// exercise, not a prediction. Every number is `template` and listed in `assumptions` with its rationale; library
// gaps are filled by an explicit, labelled substitution with an existing library entry (no invented values).
import { setIn } from './yamlEdit';
import { materialOf } from './engineRun';
import type { SimPart } from './protocol';

export const DEFAULT_STUDY = {
	power_W: 100,
	top_h_W_m2K: 5000,
	bottom_h_W_m2K: 10,
	T_inf_C: 25,
	max_xy_mm: 2,
	max_nodes: 600000,
	substitute: 'epoxy_generic',
	lid_substitute: 'cu_lid'
} as const;

type Lib = Record<string, unknown>;

/** Common id prefix of the die parts as a glob (`soc_*`), or the single id. */
function dieGlob(parts: SimPart[]): string | null {
	const ids = parts.filter((p) => p.kind === 'die').map((p) => p.id);
	if (!ids.length) return null;
	if (ids.length === 1) return ids[0];
	let pre = ids[0];
	for (const id of ids) while (!id.startsWith(pre)) pre = pre.slice(0, -1);
	return pre ? `${pre}*` : null;
}

/** Template keys (direct or homogenized constituents) whose library k does not resolve, with the reason. */
export function missingK(parts: SimPart[], lib: Lib, map: Record<string, string>): Map<string, string> {
	const out = new Map<string, string>();
	const keys = new Set<string>();
	for (const p of parts) {
		if (map[p.id] || map[p.kind]) continue; // mapped by part id or kind (SPEC 1 order)
		if (p.material.startsWith('homog:')) for (const c of p.material.split(':')[2]?.split('+') ?? []) keys.add(c);
		else keys.add(p.material);
	}
	const res = lib.resolve as (k: string, T: number, o: unknown) => unknown;
	for (const k of keys) {
		if (k === 'void' || map[k]) continue;
		try {
			const lk = materialOf(map, lib)({ id: '', kind: '', material: k } as SimPart);
			res(lk, 298.15, { need: ['k'] });
		} catch (e) {
			out.set(k, e instanceof Error ? e.message.replace(/^materials: /, '') : String(e));
		}
	}
	return out;
}

/** Splice a draft thermal study into the case text (only keys the case does not have are written). */
export function addDefaultThermalStudy(text: string, raw: Record<string, unknown>, parts: SimPart[], lib: Lib): { text: string; notes: string[] } {
	const D = DEFAULT_STUDY;
	const notes: string[] = [];
	const die = dieGlob(parts);
	if (!die) throw new Error('no die parts in the geometry: add a heat source in the YAML tab');
	const hasLid = parts.some((p) => p.id === 'lid');
	const top = hasLid ? 'top:lid' : `top:${die}`;
	const map: Record<string, string> = { ...((raw.materials as { map?: Record<string, string> } | undefined)?.map ?? {}) };
	// parts with template key `other` have no library default (L2 alias): lids and stiffeners -> cu_lid
	for (const p of parts) if (p.material === 'other' && (p.kind === 'lid' || p.kind === 'stiffener') && !map[p.kind]) map[p.kind] = D.lid_substitute;
	const miss = missingK(parts.filter((p) => p.kind !== 'bga'), lib, map);
	for (const k of miss.keys()) map[k] = D.substitute;
	let t = text;
	const set = (path: (string | number)[], v: unknown) => (t = setIn(t, path, v));
	set(['title'], `${String(raw.title ?? raw.id ?? 'session')}; draft thermal study with template loads (UI exercise, not a prediction)`);
	set(['status'], 'draft');
	if (!(raw.geometry as Record<string, unknown> | undefined)?.drop_kinds) set(['geometry'], { drop_kinds: ['bga'] });
	set(['materials'], { map });
	if (!raw.mesh) set(['mesh'], { max_xy_mm: D.max_xy_mm, max_nodes: D.max_nodes });
	set(['physics'], {
		thermal: {
			sources: [{ parts: die, power_W: D.power_W, distribution: 'uniform_volume' }],
			bcs: [
				{ selection: top, type: 'htc', h_W_m2K: D.top_h_W_m2K, T_inf_C: D.T_inf_C },
				{ selection: 'bottom:*', type: 'htc', h_W_m2K: D.bottom_h_W_m2K, T_inf_C: D.T_inf_C },
				{ selection: 'default', type: 'adiabatic' }
			]
		}
	});
	set(['studies'], [{ id: 's1', type: 'thermal_stationary' }]);
	const assumptions = [
		`template: total power ${D.power_W} W on parts ${die}, uniform in volume (illustrative round number, not from a source)`,
		`template: HTC ${D.top_h_W_m2K} W/(m2 K) at ${D.T_inf_C} C on ${top} (illustrative cold-plate-class value, not from a source)`,
		`template: HTC ${D.bottom_h_W_m2K} W/(m2 K) at ${D.T_inf_C} C on every bottom face (illustrative natural-convection-class value, not from a source)`,
		'template: other exterior faces adiabatic',
		'template: BGA dropped (homogenized key solder+void has no library entry for void at 2026-10-20)',
		`template: mesh max_xy ${D.max_xy_mm} mm, max_nodes ${D.max_nodes} (UI default)`,
		...Object.entries(map).filter(([k, v]) => v === D.lid_substitute && k !== D.substitute).map(([k]) => `substitution: parts of kind ${k} with template key other -> ${D.lid_substitute} (L2 alias note: map lid / stiffener parts to cu_lid)`),
		...[...miss.entries()].map(([k, why]) => `substitution: ${k} -> ${D.substitute} because ${why}`)
	];
	set(['assumptions'], assumptions);
	notes.push(`Default thermal study added (draft, template loads); ${miss.size} material substitution(s): ${[...miss.keys()].join(', ') || 'none'}`);
	return { text: t, notes };
}
