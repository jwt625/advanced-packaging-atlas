// Categorical slots follow the validated default palette order (dataviz skill, palette.md):
// both modes pass the adjacent-pair CVD and normal-vision gates for these seven slots. Buckets beyond
// the seven fold into one neutral "Other" group; colour follows the bucket, never its rank.
export const BUCKET_SLOTS = [
	'si_interposer',
	'organic_rdl_fanout',
	'si_bridge',
	'panel',
	'hybrid_bonding',
	'microbump_3d',
	'glass'
] as const;

export const OTHER_GROUP = 'other_group';

const DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9'];
const LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7'];
const OTHER = '#898781';

export type Theme = 'dark' | 'light';

export function bucketGroup(bucket: string): string {
	return (BUCKET_SLOTS as readonly string[]).includes(bucket) ? bucket : OTHER_GROUP;
}

export function groupColor(group: string, theme: Theme): string {
	const i = (BUCKET_SLOTS as readonly string[]).indexOf(group);
	if (i < 0) return OTHER;
	return (theme === 'dark' ? DARK : LIGHT)[i];
}

export const GROUP_ORDER: string[] = [...BUCKET_SLOTS, OTHER_GROUP];

export interface PlotTheme {
	surface: string;
	ink: string;
	ink2: string;
	muted: string;
	grid: string;
	line: string;
	accent: string;
}

export function plotTheme(t: Theme): PlotTheme {
	return t === 'dark'
		? { surface: '#1a1a19', ink: '#f2f1ec', ink2: '#c3c2b7', muted: '#898781', grid: '#2c2c2a', line: '#383835', accent: '#3987e5' }
		: { surface: '#fcfcfb', ink: '#0b0b0b', ink2: '#52514e', muted: '#6f6d68', grid: '#e1e0d9', line: '#c3c2b7', accent: '#2a78d6' };
}
