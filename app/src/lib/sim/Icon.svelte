<script lang="ts">
	// Ported from eo-modulator-atlas app/src/lib/sim/Icon.svelte at eb97f96 (GPL-3.0-or-later).
	// Small line icons (14 px, currentColor) for the graphics toolbar and the tree.
	let { name }: { name: string } = $props();
	const P: Record<string, string> = {
		pan: 'M7 1v12M1 7h12M7 1l-2 2M7 1l2 2M7 13l-2-2M7 13l2-2M1 7l2-2M1 7l2 2M13 7l-2-2M13 7l-2 2',
		zoombox: 'M1.5 1.5h7v7h-7zM8.5 8.5l4 4',
		select: 'M2 1.5l8 5-3.5 1 2 4-1.6.8-2-4-2.9 2.4z',
		measure: 'M1 9.5l8.5-8.5 3.5 3.5-8.5 8.5zM4 7l1.2 1.2M6 5l1.2 1.2M8 3l1.2 1.2',
		cutline: 'M1.5 12.5l11-11M1.5 12.5h0M12.5 1.5h0M1 11h3v3h-3zM10 0h3v3h-3z',
		cutpoint: 'M7 1v4M7 9v4M1 7h4M9 7h4M5.5 5.5h3v3h-3z',
		extents: 'M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9',
		window: 'M1.5 3.5h11v7h-11zM4 6h6v2H4z',
		labels: 'M1.5 2.5h7l4 4.5-4 4.5h-7zM4 7h.1',
		windows: 'M1.5 1.5h11v11h-11z',
		mesh: 'M1 13L7 1l6 12zM4 7h6M7 13l-3-6M7 13l3-6',
		image: 'M1.5 2.5h11v9h-11zM1.5 9.5l3-3 3 3 2-2 3 3M9.5 5h.1',
		undo: 'M4 4.5H9a3.5 3.5 0 010 7H5M4 4.5l2.5-2.5M4 4.5L6.5 7',
		redo: 'M10 4.5H5a3.5 3.5 0 000 7h4M10 4.5L7.5 2M10 4.5L7.5 7',
		clear: 'M3 3l8 8M11 3l-8 8'
	};
</script>

<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><path d={P[name] ?? ''} fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="square" /></svg>

<style>
	svg { display: block; flex: none; }
</style>
