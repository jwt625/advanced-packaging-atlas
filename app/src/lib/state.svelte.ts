import { staticUrl } from './paths';
import { buildIndex, defaultFilters, type Index } from './logic';
import { defaultColumns } from './columns';
import type { Atlas, Filters, SortKey } from './types';

export const store = $state<{ atlas: Atlas | null; index: Index | null; loading: boolean; error: string }>({
	atlas: null,
	index: null,
	loading: true,
	error: ''
});

export const filters = $state<Filters>(defaultFilters());
export const tableState = $state<{ sort: SortKey[]; columns: string[]; expanded: string[] }>({
	sort: [{ key: 'year', dir: 'desc' }],
	columns: defaultColumns(),
	expanded: []
});
export const ui = $state<{ theme: 'dark' | 'light'; drawerTv: string | null }>({ theme: 'dark', drawerTv: null });

let loadStarted = false;

export async function loadAtlas(): Promise<void> {
	if (loadStarted) return;
	loadStarted = true;
	try {
		const res = await fetch(staticUrl('data/atlas.json'));
		if (!res.ok) throw new Error(`atlas.json: HTTP ${res.status}`);
		const a = (await res.json()) as Atlas;
		store.index = buildIndex(a);
		store.atlas = a;
	} catch (e) {
		store.error = e instanceof Error ? e.message : String(e);
	} finally {
		store.loading = false;
	}
}

export function resetFilters(): void {
	Object.assign(filters, defaultFilters());
}

export function setTheme(t: 'dark' | 'light'): void {
	ui.theme = t;
	document.documentElement.setAttribute('data-theme', t);
	try {
		localStorage.setItem('ap-atlas-theme', t);
	} catch {
		/* storage unavailable */
	}
}
