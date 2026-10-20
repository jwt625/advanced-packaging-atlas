import * as THREE from 'three';

// Material class from the free-text material / kind / role strings. Order matters (first match wins).
const RULES: [RegExp, string][] = [
	[/underfill|\bmuf\b|\bcuf\b/i, 'underfill'],
	[/\bemc\b|mold|epoxy mold|encapsul/i, 'mold'],
	[/\btim\b|indium|thermal interface|grease|solder tim/i, 'tim'],
	[/glass/i, 'glass'],
	[/abf|build[-_ ]?up|organic|laminate|bt\b|fr-?4|core|prepreg/i, 'organic'],
	[/steel|stainless|\bsus\d*|kovar|alloy ?42/i, 'lid'],
	[/polyimide|\bpi\b|pbo|bcb|polymer|dielectric|resin/i, 'polymer'],
	[/sio2|oxide|sin\b|nitride|passivation|sicn/i, 'oxide'],
	[/solder|snag|sac\b|sn\b|bga|c4/i, 'solder'],
	[/\bcu\b|copper|pillar|nickel|\bni\b|\bau\b/i, 'copper'],
	[/silicon|\bsi\b|die|dram|hbm/i, 'silicon']
];

export const CLASS_COLOR: Record<string, string> = {
	silicon: '#66758c',
	hbm: '#7a7096',
	bridge: '#4f8b8a',
	interposer: '#5f6f84',
	copper: '#c27c45',
	solder: '#b4b4ab',
	mold: '#3b3f45',
	underfill: '#a48f5c',
	organic: '#47704a',
	polymer: '#b98a2e',
	oxide: '#93a8bf',
	glass: '#6fb0bf',
	tim: '#a9a9b8',
	lid: '#9097a1',
	other: '#808080'
};

export function materialClass(material: string, kind = '', role = ''): string {
	if (kind === 'lid' || kind === 'stiffener') return 'lid';
	if (kind === 'mold') return 'mold';
	if (kind === 'underfill') return 'underfill';
	if (kind === 'tim') return 'tim';
	if (role === 'conductor') return 'copper';
	for (const [re, c] of RULES) if (re.test(material)) {
		if (c === 'silicon' && (kind === 'hbm' || kind === 'bridge' || kind === 'interposer')) return kind;
		return c;
	}
	if (kind === 'hbm' || kind === 'bridge' || kind === 'interposer') return kind;
	if (kind === 'die') return 'silicon';
	if (kind === 'substrate') return 'organic';
	return 'other';
}

/** Conductor layers ("Cu / PI") read as a mix of copper and the dielectric. */
export function layerColor(material: string, role = ''): THREE.Color {
	const base = new THREE.Color(CLASS_COLOR[materialClass(material, '', '')] ?? CLASS_COLOR.other);
	if (role === 'conductor' || /\bcu\b/i.test(material)) base.lerp(new THREE.Color(CLASS_COLOR.copper), role === 'conductor' ? 0.65 : 0.4);
	return base;
}

export function arrayClass(kind: string): string {
	return ['c4', 'bga', 'microbump'].includes(kind) ? 'solder' : 'copper';
}

/** Template look (every box dimension template): desaturate toward luminance. */
export function templateColor(c: THREE.Color): THREE.Color {
	const l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
	return c.clone().lerp(new THREE.Color(l, l, l), 0.7);
}
