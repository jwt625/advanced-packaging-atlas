<script lang="ts">
	import { onMount, untrack } from 'svelte';

	interface Props {
		data: unknown[];
		layout: Record<string, unknown>;
		onhover?: (e: any) => void;
		onunhover?: (e: any) => void;
		onclick?: (e: any) => void;
		onafterplot?: (gd: any) => void;
		gd?: any;
		config?: Record<string, unknown>;
		onrelayout?: (e: any) => void;
	}
	let { data, layout, onhover, onunhover, onclick, onafterplot, gd = $bindable(null), config = {}, onrelayout }: Props = $props();

	let el: HTMLDivElement;
	let P: any = $state(null);
	let bound = false;
	let destroyed = false;
	// renders are serialized: one Plotly.react in flight, later prop changes coalesce into one follow-up render
	let busy = false;
	let pending = false;

	/** run a user callback without letting it break Plotly's event loop or the render queue */
	const safe = (f: ((x: any) => void) | undefined, x: any) => {
		if (!f || destroyed) return;
		try {
			f(x);
		} catch (err) {
			console.warn('plot callback failed', err);
		}
	};

	onMount(() => {
		import('plotly.js-dist-min').then((m) => {
			if (!destroyed) P = (m as any).default ?? m;
		});
		let raf = 0;
		const ro = new ResizeObserver(() => {
			if (raf) return;
			raf = requestAnimationFrame(() => {
				raf = 0;
				if (P && el && !destroyed && el.clientWidth > 0 && (el as any)._fullLayout) {
					try {
						P.Plots.resize(el);
					} catch (err) {
						console.warn('plot resize failed', err);
					}
				}
			});
		});
		ro.observe(el);
		return () => {
			destroyed = true;
			ro.disconnect();
			if (raf) cancelAnimationFrame(raf);
			if (P) {
				try {
					P.purge(el);
				} catch {
					/* already purged */
				}
			}
		};
	});

	async function render() {
		if (!P || destroyed) return;
		if (busy) {
			pending = true;
			return;
		}
		busy = true;
		try {
			do {
				pending = false;
				// read the latest props without subscribing this async chain to them (the $effect below subscribes)
				const [d, l, c] = untrack(() => [data, layout, config]);
				await P.react(el, d, l, {
					displaylogo: false,
					responsive: false,
					scrollZoom: false,
					doubleClick: 'reset',
					modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
					toImageButtonOptions: { format: 'png', scale: 2 },
					...c
				});
				if (destroyed) return;
				if (!bound) {
					bound = true;
					gd = el;
					const g = el as any;
					g.on('plotly_hover', (e: any) => safe(onhover, e));
					g.on('plotly_unhover', (e: any) => safe(onunhover, e));
					g.on('plotly_click', (e: any) => safe(onclick, e));
					g.on('plotly_afterplot', () => safe(onafterplot, el));
					g.on('plotly_relayout', (e: any) => safe(onrelayout, e));
					safe(onafterplot, el); // the first afterplot fired before the listener existed
				}
			} while (pending && !destroyed);
		} catch (err) {
			console.warn('plot render failed', err);
		} finally {
			busy = false;
		}
	}

	$effect(() => {
		if (!P) return;
		void data;
		void layout;
		void config;
		render();
	});
</script>

<div class="plot" bind:this={el}></div>

<style>
	.plot {
		width: 100%;
		height: 100%;
	}
</style>
