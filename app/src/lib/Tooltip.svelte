<script lang="ts">
	// One custom tooltip for the sim UI (sharp corners; native `title` tooltips are drawn rounded by the OS). Elements
	// carry their text in `data-tip`; hover (after a short delay) or keyboard focus shows it next to the element.
	import { onMount } from 'svelte';

	let text = $state('');
	let x = $state(0);
	let y = $state(0);
	let el: HTMLDivElement | undefined = $state();
	let timer: ReturnType<typeof setTimeout> | null = null;
	let current: Element | null = null;

	function place(px: number, py: number) {
		const w = el?.offsetWidth ?? 240, h = el?.offsetHeight ?? 24;
		x = Math.max(4, Math.min(px + 12, innerWidth - w - 4));
		y = py + 18 + h > innerHeight - 4 ? Math.max(4, py - h - 8) : py + 18;
	}
	function show(target: Element, px: number, py: number) {
		const t = target.getAttribute('data-tip');
		if (!t) return;
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => {
			text = t;
			place(px, py);
			queueMicrotask(() => place(px, py));
		}, 350);
	}
	function hide() {
		if (timer) clearTimeout(timer);
		timer = null;
		text = '';
		current = null;
	}

	onMount(() => {
		// Events can fire while Svelte removes the focused element (inside an update): defer the state change.
		const hideSoon = () => queueMicrotask(hide);
		const over = (e: PointerEvent) => {
			const t = (e.target as Element | null)?.closest?.('[data-tip]') ?? null;
			if (t === current) return;
			if (timer) clearTimeout(timer);
			timer = null;
			if (text) queueMicrotask(() => (text = ''));
			current = t;
			if (t) show(t, e.clientX, e.clientY);
		};
		const move = (e: PointerEvent) => {
			if (text && current) place(e.clientX, e.clientY);
		};
		const focus = (e: FocusEvent) => {
			const t = (e.target as Element | null)?.closest?.('[data-tip]') ?? null;
			if (!t || !(e.target as HTMLElement).matches(':focus-visible')) return;
			const r = t.getBoundingClientRect();
			current = t;
			show(t, r.left, r.bottom - 12);
		};
		document.addEventListener('pointerover', over);
		document.addEventListener('pointermove', move, { passive: true });
		document.addEventListener('pointerdown', hideSoon, true);
		document.addEventListener('focusin', focus);
		document.addEventListener('focusout', hideSoon);
		window.addEventListener('scroll', hideSoon, true);
		return () => {
			document.removeEventListener('pointerover', over);
			document.removeEventListener('pointermove', move);
			document.removeEventListener('pointerdown', hideSoon, true);
			document.removeEventListener('focusin', focus);
			document.removeEventListener('focusout', hideSoon);
			window.removeEventListener('scroll', hideSoon, true);
			if (timer) clearTimeout(timer);
		};
	});
</script>

{#if text}<div class="tip-pop" role="tooltip" bind:this={el} style:left="{x}px" style:top="{y}px">{text}</div>{/if}

<style>
	.tip-pop { position: fixed; z-index: 100; max-width: 380px; padding: 4px 7px; font-size: 11px; line-height: 1.4; color: var(--ink); background: var(--surface); border: 1px solid var(--line); box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3); white-space: pre-wrap; overflow-wrap: anywhere; pointer-events: none; border-radius: 0; }
</style>
