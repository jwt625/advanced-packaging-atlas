<script lang="ts">
	// Institution map (DevLog-006), ported from eo-modulator-atlas GeoPanel: Plotly scattermap over vendored
	// Natural Earth outlines (no tile server), zoom-dependent clustering in geo.ts, bucket pies per location.
	import { onMount, untrack } from 'svelte';
	import Frame from './Frame.svelte';
	import Plot from './Plot.svelte';
	import { store, ui } from './state.svelte';
	import { GROUP_ORDER, OTHER_GROUP, bucketGroup, groupColor, plotTheme } from './colors';
	import { staticUrl } from './paths';
	import { clusterPoints } from './geo';
	import { enumLabel, type View } from './logic';
	import type { Site } from './types';

	let { view }: { view: View } = $props();
	let unit = $state<'authors' | 'papers'>('authors');
	/** lump nearby sites into zoom-dependent clusters; off = one point per site location (exactly co-located sites still share one) */
	let lump = $state(false);
	let mapW = $state(800);
	/** panel fills the viewport below the header (36 px), footer (20 px) and main padding (16 px), 480-960 px */
	let winH = $state(1000);
	const panelH = $derived(Math.round(Math.min(960, Math.max(480, winH - 72))));

	const th = $derived(plotTheme(ui.theme));
	const a = $derived(store.atlas);
	const sites = $derived(a?.sites ?? []);
	const groupLabel = (g: string) => (g === OTHER_GROUP ? 'Other buckets' : a ? enumLabel(a, 'bucket', g) : g);
	const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	interface Pin {
		site: Site;
		paper: string;
		label: string;
		author: string;
		group: string;
	}

	/** One pin per (paper, author, site) in author mode; per (paper, site) in paper mode. */
	const pins = $derived.by(() => {
		const out: Pin[] = [];
		for (const p of view.papers) {
			const group = bucketGroup(p.primary_bucket);
			const seen = new Set<string>();
			for (const f of p.affil ?? []) {
				const site = sites[f.s];
				if (!site) continue;
				const key = unit === 'authors' ? `${f.a}|${f.s}` : `${f.s}`;
				if (seen.has(key)) continue;
				seen.add(key);
				out.push({ site, paper: p.paper_id, label: p.label, author: f.n, group });
			}
		}
		return out;
	});

	const nAuthors = $derived(new Set(pins.map((q) => `${q.paper}|${q.author}`)).size);
	const nPapersLocated = $derived(view.papers.filter((p) => (p.affil ?? []).length).length);

	interface SiteSum {
		site: Site;
		n: number;
		papers: Map<string, string>;
		authors: Set<string>;
		authorPapers: Set<string>;
		groups: Map<string, number>;
	}
	/** Per-site aggregate of the pins in the current unit mode. */
	const siteSummary = $derived.by(() => {
		const m = new Map<number, SiteSum>();
		for (const q of pins) {
			const r = m.get(q.site.id) ?? { site: q.site, n: 0, papers: new Map(), authors: new Set(), authorPapers: new Set(), groups: new Map() };
			r.n += 1;
			if (!r.papers.has(q.paper)) r.groups.set(q.group, (r.groups.get(q.group) ?? 0) + 1);
			r.papers.set(q.paper, q.label);
			r.authors.add(q.author);
			r.authorPapers.add(`${q.paper}|${q.author}`);
			m.set(q.site.id, r);
		}
		return [...m.values()];
	});

	const zoom0 = $derived(Math.max(-1, Math.log2(Math.max(mapW, 200) / 512)));
	/** Zoom level the traces are computed for, quantized to ZQ steps: clusters, labels and road tiers change only
	 * when it changes, so a scroll-zoom does not trigger a re-render per wheel event (perf; the earlier unquantized
	 * zoom + centre feedback re-rendered on every relayout and could loop into Plotly/Svelte errors). */
	const ZQ = 0.25;
	let zoom = $state<number | null>(null);
	/** live view (not reactive): passed back in the layout when the traces re-render, so the view never snaps back */
	let view0: { center: { lon: number; lat: number } | null; zoom: number | null } = { center: null, zoom: null };
	let relayoutTimer: ReturnType<typeof setTimeout> | undefined;
	function onrelayout(e: any) {
		if (!e) return;
		const z = typeof e['map.zoom'] === 'number' ? e['map.zoom'] : e.map?.zoom;
		const c = e['map.center'] ?? e.map?.center;
		if (typeof z === 'number' && Number.isFinite(z)) view0.zoom = z;
		if (c && Number.isFinite(c.lon) && Number.isFinite(c.lat)) view0.center = { lon: c.lon, lat: c.lat };
		// debounce: apply the quantized zoom once the interaction settles
		clearTimeout(relayoutTimer);
		relayoutTimer = setTimeout(() => {
			if (view0.zoom === null) return;
			const q = Math.round(view0.zoom / ZQ) * ZQ;
			if (q !== zoom) zoom = q;
		}, 120);
	}
	onMount(() => () => clearTimeout(relayoutTimer));
	const clusters = $derived(clusterPoints(siteSummary.map((r) => ({ lon: r.site.lon, lat: r.site.lat, w: r.papers.size, item: r })), zoom ?? zoom0, lump ? 36 : 0));

	const absUrl = (f: string) => (typeof location === 'undefined' ? '' : new URL(staticUrl(f), location.href).href);
	const geo = $derived({
		c110: absUrl('geo/countries_110m.geojson'),
		c50: absUrl('geo/countries_50m.geojson'),
		s50: absUrl('geo/subunits_50m.geojson'),
		roads: absUrl('geo/roads_major.geojson'),
		minorA: absUrl('geo/roads_minor_a.geojson'),
		minorB: absUrl('geo/roads_minor_b.geojson')
	});
	const FINE_ZOOM = 3;
	const ROAD_ZOOM = 4.5;
	/** minor-road tiers (Natural Earth min_zoom <= 6, > 6) */
	const MINOR_A_ZOOM = 5.5;
	const MINOR_B_ZOOM = 6.5;
	const zEff = $derived(zoom ?? zoom0);

	/** Natural Earth labels (countries: [name, lon, lat, min_label]; places: [name, lon, lat, min_zoom]). */
	type Label = [string, number, number, number];
	let labels = $state<{ countries: Label[]; places: Label[] } | null>(null);
	onMount(() => {
		fetch(staticUrl('geo/labels.json'))
			.then((r) => (r.ok ? r.json() : null))
			.then((j) => (labels = j))
			.catch(() => (labels = null));
	});
	// Natural Earth zooms refer to 256 px tiles; this map uses 512 px tiles (NE zoom ~ map zoom + 1).
	const countryLabels = $derived(labels && zEff <= 7 ? labels.countries.filter((c) => c[3] <= zEff + 2) : []);
	const placeLabels = $derived(labels ? labels.places.filter((p) => p[3] <= zEff + 1) : []);

	const paperGroup = $derived(new Map(pins.map((q) => [q.paper, q.group])));

	/** bucket mix per bubble over distinct papers, in GROUP_ORDER (sites-mode color and pie slices) */
	const clusterMix = $derived(
		clusters.map((c) => {
			const m = new Map<string, number>();
			for (const pid of new Set(c.items.flatMap((r) => [...r.papers.keys()]))) {
				const g = paperGroup.get(pid) ?? OTHER_GROUP;
				m.set(g, (m.get(g) ?? 0) + 1);
			}
			return [...m.entries()].sort((x, y) => GROUP_ORDER.indexOf(x[0]) - GROUP_ORDER.indexOf(y[0]));
		})
	);
	const dominant = (mix: [string, number][]) => (mix.length ? mix.reduce((b, e) => (e[1] > b[1] ? e : b))[0] : OTHER_GROUP);
	// bubble label: distinct authors per paper (authors mode) or distinct papers (papers mode), not affiliation pins
	const bubbleN = $derived(
		clusters.map((c) => (unit === 'authors' ? new Set(c.items.flatMap((r) => [...r.authorPapers])).size : new Set(c.items.flatMap((r) => [...r.papers.keys()])).size))
	);
	// lumped: labelled bubbles; unlumped: small unlabelled points, log-size 5 to 11 px so every location stays visible
	const bubbleSize = $derived(bubbleN.map((v) => (lump ? Math.min(46, 11 + 3.2 * Math.sqrt(v)) : Math.min(11, 5 + 1.2 * Math.log2(Math.max(1, v))))));

	/** MapLibre map inside the Plotly scattermap (internal API; without it the dominant-color points remain) */
	let mlMap = $state<any>(null);
	let pieSvg = $state<SVGSVGElement | null>(null);
	let mapTick = $state(0);
	// pie overlay redraws at most once per animation frame (MapLibre fires 'move' per frame during pan/zoom)
	let tickRaf = 0;
	const bump = () => {
		if (tickRaf) return;
		tickRaf = requestAnimationFrame(() => {
			tickRaf = 0;
			mapTick += 1;
		});
	};
	onMount(() => () => cancelAnimationFrame(tickRaf));
	function onafterplot(gd: any) {
		const m = gd?._fullLayout?.map?._subplot?.map;
		if (m && m !== untrack(() => mlMap)) mlMap = m;
		bump();
	}
	// pie overlay in the MapLibre canvas container: below Plotly's hover labels, transparent to the mouse
	$effect(() => {
		const m = mlMap;
		if (!m) return;
		const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		el.setAttribute('style', 'position:absolute;left:0;top:0;pointer-events:none;overflow:visible');
		m.getCanvasContainer().appendChild(el);
		pieSvg = el;
		m.on('move', bump);
		m.on('resize', bump);
		return () => {
			m.off('move', bump);
			m.off('resize', bump);
			el.remove();
			pieSvg = null;
		};
	});
	$effect(() => {
		const el = pieSvg;
		const m = mlMap;
		void mapTick;
		if (!el || !m) return;
		if (lump) {
			el.innerHTML = '';
			return;
		}
		const W = m.getContainer().clientWidth;
		const H = m.getContainer().clientHeight;
		el.setAttribute('width', String(W));
		el.setAttribute('height', String(H));
		const f = (v: number) => v.toFixed(2);
		let out = '';
		clusters.forEach((c, i) => {
			const mix = clusterMix[i];
			if (mix.length < 2) return;
			if (!Number.isFinite(c.lon) || !Number.isFinite(c.lat)) return;
			const p = m.project([c.lon, c.lat]);
			const r = bubbleSize[i] / 2;
			if (p.x < -r || p.y < -r || p.x > W + r || p.y > H + r) return;
			const tot = mix.reduce((t, e) => t + e[1], 0);
			let a0 = -Math.PI / 2;
			for (const [g, k] of mix) {
				const a1 = a0 + (2 * Math.PI * k) / tot;
				out += `<path d="M${f(p.x)},${f(p.y)}L${f(p.x + r * Math.cos(a0))},${f(p.y + r * Math.sin(a0))}A${f(r)},${f(r)} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${f(p.x + r * Math.cos(a1))},${f(p.y + r * Math.sin(a1))}Z" fill="${groupColor(g, ui.theme)}"/>`;
				a0 = a1;
			}
		});
		el.innerHTML = `<g opacity="0.9" stroke="${th.surface}" stroke-width="0.5">${out}</g>`;
	});

	/** precision wording for the hover; region = only a prefecture/state/province was printed */
	const PREC: Record<string, string> = {
		building: 'building',
		campus: 'campus',
		postcode: 'postcode centre',
		city: 'city centre',
		region: 'printed region only'
	};
	const precText = (si: Site) => PREC[si.precision] ?? si.precision;

	const mapTraces = $derived.by(() => {
		const topGroups = (mm: Map<string, number>) =>
			[...mm.entries()]
				.sort((x, y) => y[1] - x[1])
				.slice(0, 3)
				.map(([k, v]) => `${esc(groupLabel(k))} ${v}`)
				.join(', ');
		const pl_ = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
		const where = (si: Site) => esc(si.locality || `city not printed, ${si.country}`) + (si.precision === 'region' ? ' (region)' : '');
		const hover = clusters.map((c) => {
			const pinsN = c.items.reduce((t, r) => t + r.n, 0);
			const people = new Set(c.items.flatMap((r) => [...r.authorPapers])).size;
			if (c.items.length === 1) {
				const r = c.items[0];
				const lbls = [...r.papers.values()];
				const pl = [...r.papers.entries()].map(([id, l]) => (lbls.filter((x) => x === l).length > 1 ? `${l} (${id})` : l));
				return (
					`<b>${esc(r.site.org)}</b><br>${esc(r.site.locality || 'city not printed')}, ${esc(r.site.country)} (${esc(precText(r.site))}; ${esc(r.site.source)}${r.site.source_ref ? ' ' + esc(r.site.source_ref) : ''})` +
					`<br>${unit === 'authors' ? `${pl_(r.authors.size, 'author')} on ` : ''}${pl_(pl.length, 'paper')}; ${topGroups(r.groups)}<br>` +
					pl.slice(0, 10).map(esc).join('<br>') +
					(pl.length > 10 ? `<br>+${pl_(pl.length - 10, 'more paper')}` : '')
				);
			}
			const papers = new Set(c.items.flatMap((r) => [...r.papers.keys()]));
			// bucket mix over distinct papers (a paper with authors at several sites counts once)
			const groups = new Map<string, number>();
			for (const pid of papers) {
				const g = paperGroup.get(pid) ?? OTHER_GROUP;
				groups.set(g, (groups.get(g) ?? 0) + 1);
			}
			const ranked = [...c.items].sort((x, y) => y.papers.size - x.papers.size || y.authors.size - x.authors.size || x.site.org.localeCompare(y.site.org));
			return (
				`<b>${pl_(c.items.length, 'site')}, ${pl_(papers.size, 'paper')}, ${unit === 'authors' ? `${pl_(people, 'author')} (${pl_(pinsN, 'affiliation')})` : pl_(pinsN, 'paper-site pair')}</b><br>${topGroups(groups)}<br><br><b>Top sites by papers</b><br>` +
				ranked
					.slice(0, 5)
					.map((r) => `${esc(r.site.org)} (${where(r.site)}): ${pl_(r.papers.size, 'paper')}${unit === 'authors' ? `, ${pl_(r.authors.size, 'author')}` : ''}`)
					.join('<br>') +
				(ranked.length > 5 ? `<br>+${pl_(ranked.length - 5, 'more site')}${lump ? '; zoom in to split' : ' at the same coordinates'}` : '')
			);
		});
		return [
			{
				type: 'scattermap',
				lat: countryLabels.map((c) => c[2]),
				lon: countryLabels.map((c) => c[1]),
				mode: 'text',
				text: countryLabels.map((c) => c[0]),
				textfont: { size: 11, color: th.muted },
				hoverinfo: 'skip'
			},
			{
				type: 'scattermap',
				lat: placeLabels.map((p) => p[2]),
				lon: placeLabels.map((p) => p[1]),
				mode: 'markers+text',
				text: placeLabels.map((p) => p[0]),
				textposition: 'top right',
				textfont: { size: 10, color: th.ink2 },
				marker: { size: 4, color: th.ink2, opacity: 0.8 },
				hoverinfo: 'skip'
			},
			{
				type: 'scattermap',
				lat: clusters.map((c) => c.lat),
				lon: clusters.map((c) => c.lon),
				mode: lump ? 'markers+text' : 'markers',
				text: bubbleN.map(String),
				textfont: { size: 10, color: '#ffffff' },
				marker: { size: bubbleSize, color: lump ? th.accent : clusterMix.map((mx) => groupColor(dominant(mx), ui.theme)), opacity: lump ? 0.85 : 0.9 },
				customdata: hover,
				hovertemplate: '%{customdata}<extra></extra>'
			}
		];
	});

	const mapStyle = $derived({
		version: 8,
		sources: geo.c110
			? {
					c110: { type: 'geojson', data: geo.c110 },
					c50: { type: 'geojson', data: geo.c50 },
					s50: { type: 'geojson', data: geo.s50 }
				}
			: {},
		layers: [
			{ id: 'bg', type: 'background', paint: { 'background-color': th.surface } },
			...(geo.c110
				? [
						// coarse outlines when zoomed out, 1:50m outlines plus state/province borders when zoomed in
						{ id: 'land110', type: 'fill', source: 'c110', maxzoom: FINE_ZOOM, paint: { 'fill-color': th.grid } },
						{ id: 'borders110', type: 'line', source: 'c110', maxzoom: FINE_ZOOM, paint: { 'line-color': th.line, 'line-width': 0.6 } },
						{ id: 'land50', type: 'fill', source: 'c50', minzoom: FINE_ZOOM, paint: { 'fill-color': th.grid } },
						{ id: 'sub50', type: 'line', source: 's50', minzoom: FINE_ZOOM, paint: { 'line-color': th.line, 'line-width': 0.5, 'line-dasharray': [2, 2] } },
						{ id: 'borders50', type: 'line', source: 'c50', minzoom: FINE_ZOOM, paint: { 'line-color': th.line, 'line-width': 0.8 } }
					]
				: [])
		]
	});

	const roadLayer = (source: string, minzoom: number, opacity: number, width: number) => ({
		sourcetype: 'geojson',
		source,
		type: 'line',
		color: th.muted,
		opacity,
		line: { width },
		minzoom,
		below: 'traces',
		// each road file is requested only once the map is zoomed in that far
		visible: zEff >= minzoom && !!source
	});

	const mapLayout = $derived({
		uirevision: 'j-map',
		paper_bgcolor: 'rgba(0,0,0,0)',
		margin: { l: 0, r: 0, t: 0, b: 0 },
		font: { family: 'system-ui, sans-serif', size: 11, color: th.ink2 },
		showlegend: false,
		hovermode: 'closest',
		hoverlabel: { bgcolor: th.surface, bordercolor: th.line, font: { color: th.ink, size: 11 }, align: 'left' },
		map: {
			// the live view (read untracked: a pan alone never re-renders); defaults on first render
			center: untrack(() => view0.center) ?? { lat: 30, lon: 20 },
			zoom: untrack(() => view0.zoom) ?? zoom ?? zoom0,
			style: mapStyle,
			// Natural Earth roads in three tiers (minor b, minor a, major)
			layers: [roadLayer(geo.minorB, MINOR_B_ZOOM, 0.3, 0.5), roadLayer(geo.minorA, MINOR_A_ZOOM, 0.4, 0.7), roadLayer(geo.roads, ROAD_ZOOM, 0.55, 1)]
		}
	});

	const legend = $derived(GROUP_ORDER.filter((g) => pins.some((q) => q.group === g)));
</script>

<svelte:window bind:innerHeight={winH} />

<Frame
	letter="j"
	desc="Institutions at author level: one pin per author and printed affiliation (or per paper and institution site), placed at the institution site (Wikidata or OpenStreetMap coordinates; precision building, campus, city centre, or printed region only). Sites with no printed city or region are not placed. Default: one point per site location (sites with identical coordinates share a point), 5 to 11 px by log count, coloured by primary bucket, a pie by distinct papers per bucket where a location has several. Lump: nearby sites cluster within 36 px at the current zoom and split when zoomed in; label = distinct authors per paper (authors) or distinct papers (papers); an author with two affiliations counts once in the label and twice as affiliations. Scroll to zoom, drag to pan, double-click to reset. Outlines refine from 1:110m to 1:50m with state/province borders at zoom 3; country and city labels by Natural Earth label zoom; roads from zoom 4.5 (major), 5.5 and 6.5 (Natural Earth 1:10m; no city streets). No external tiles."
	badge={unit === 'authors' ? `${nAuthors} authors, ${pins.length} affiliations, ${nPapersLocated}/${view.papers.length} papers` : `${pins.length} paper-site pairs, ${nPapersLocated}/${view.papers.length} papers`}
	badgeTip="pins in the current filter; papers with at least one located affiliation / papers in the filter"
	height={panelH}
>
	{#snippet controls()}
		<span class="seg" title="Bubble grouping">
			<button class:on={!lump} onclick={() => (lump = false)} title="one point per site location">sites</button><button class:on={lump} onclick={() => (lump = true)} title="lump nearby sites into larger bubbles (36 px radius at the current zoom)">lump</button>
		</span>
		<span class="seg" title="Pin unit">
			<button class:on={unit === 'authors'} onclick={() => (unit = 'authors')} title="count distinct authors per paper (one pin per author and affiliation)">authors</button><button class:on={unit === 'papers'} onclick={() => (unit = 'papers')} title="count distinct papers (one pin per paper and institution site)">papers</button>
		</span>
	{/snippet}
	<div class="map" bind:clientWidth={mapW}>
		{#if sites.length}
			<Plot data={mapTraces} layout={mapLayout} config={{ scrollZoom: true }} {onrelayout} {onafterplot} />
			{#if !lump}
				<div class="legend">
					{#each legend as g (g)}<span><i style="background:{groupColor(g, ui.theme)}"></i>{groupLabel(g)}</span>{/each}
				</div>
			{/if}
			<span class="attr">Sites: Wikidata, &copy; OpenStreetMap contributors; basemap: Natural Earth</span>
		{:else}
			<div class="msg muted">no located affiliations in this build</div>
		{/if}
	</div>
</Frame>

<style>
	.map {
		position: relative;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
	}
	.attr {
		position: absolute;
		left: 4px;
		bottom: 2px;
		font-size: 9px;
		color: var(--ink-3);
		pointer-events: none;
	}
	.legend {
		position: absolute;
		left: 4px;
		top: 4px;
		display: flex;
		flex-wrap: wrap;
		gap: 2px 8px;
		max-width: 60%;
		font-size: 10px;
		color: var(--ink-2);
		pointer-events: none;
	}
	.legend i {
		display: inline-block;
		width: 8px;
		height: 8px;
		margin-right: 3px;
		vertical-align: -1px;
	}
	.msg {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
