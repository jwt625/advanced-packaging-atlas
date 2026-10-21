<script lang="ts">
	// Ported from eo-modulator-atlas app/src/lib/sim/Splitter.svelte at eb97f96 (GPL-3.0-or-later).
	// Drag handle between two panels. `dir: 'x'` resizes widths (vertical bar), `'y'` heights (horizontal bar).
	let { dir, label, onmove }: { dir: 'x' | 'y'; label: string; onmove: (delta: number) => void } = $props();
	let start: number | null = null;

	function down(e: PointerEvent) {
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		start = dir === 'x' ? e.clientX : e.clientY;
	}
	function move(e: PointerEvent) {
		if (start == null) return;
		const p = dir === 'x' ? e.clientX : e.clientY;
		onmove(p - start);
		start = p;
	}
	function up() {
		start = null;
	}
	function key(e: KeyboardEvent) {
		const step = e.shiftKey ? 40 : 10;
		if ((dir === 'x' && e.key === 'ArrowLeft') || (dir === 'y' && e.key === 'ArrowUp')) onmove(-step);
		else if ((dir === 'x' && e.key === 'ArrowRight') || (dir === 'y' && e.key === 'ArrowDown')) onmove(step);
		else return;
		e.preventDefault();
	}
</script>

<!-- Drag handle; arrow keys resize when focused. -->
<button type="button" class="split {dir}" aria-label={label} data-tip={label}
	onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} onkeydown={key}></button>

<style>
	.split { display: block; padding: 0; border: 0; height: auto; background: var(--border); touch-action: none; border-radius: 0; }
	.split:hover, .split:focus-visible { background: var(--accent); }
	.x { width: 4px; height: 100%; cursor: col-resize; }
	.y { width: 100%; height: 4px; cursor: row-resize; }
</style>
