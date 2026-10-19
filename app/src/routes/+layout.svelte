<script lang="ts">
	import '../app.css';
	import { onMount, type Snippet } from 'svelte';
	import { link } from '../lib/paths';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { filters, loadAtlas, store, tableState, ui } from '../lib/state.svelte';
	import { fromHash, toHash } from '../lib/logic';
	import ThemeToggle from '../lib/ThemeToggle.svelte';
	import Tooltip from '../lib/Tooltip.svelte';

	let { children }: { children: Snippet } = $props();
	let ready = $state(false);

	const nav = [
		{ href: '/', label: 'Dashboard' },
		{ href: '/table', label: 'Table' },
		{ href: '/explore', label: 'Explore' },
		{ href: '/about', label: 'About' }
	];

	onMount(() => {
		const t = document.documentElement.getAttribute('data-theme');
		ui.theme = t === 'light' ? 'light' : 'dark';
		const { filters: f, extras } = fromHash(location.hash);
		Object.assign(filters, f);
		if (extras.sort.length) tableState.sort = extras.sort;
		ready = true;
		loadAtlas();
	});

	$effect(() => {
		if (!ready) return;
		const route = page.url.pathname.replace(link('/').replace(/\/$/, ''), '') || '/';
		if (!route.startsWith('/table') && !route.startsWith('/explore')) return;
		const h = toHash(filters, { sort: tableState.sort });
		const want = h ? `#${h}` : '';
		if (location.hash !== want) {
			try {
				void goto(location.pathname + location.search + want, { replace: true, shallow: true, reset: false });
			} catch {
				/* router not ready */
			}
		}
	});

	const isActive = (href: string) => {
		const root = link('/').replace(/\/$/, '');
		const p = page.url.pathname.replace(root, '') || '/';
		return href === '/' ? p === '/' : p.startsWith(href);
	};
</script>

<div class="app">
	<header>
		<a class="brand" href={link('/')} data-tip="Advanced Packaging Atlas">Advanced Packaging Atlas</a>
		<nav>
			{#each nav as n}
				<a href={link(n.href)} class:active={isActive(n.href)}>{n.label}</a>
			{/each}
		</nav>
		<div class="grow"></div>
		{#if store.atlas}
			<span class="muted num" data-tip="Papers / test vehicles in the loaded database">
				{store.atlas.integrity.counts.papers} papers, {store.atlas.integrity.counts.test_vehicles} test vehicles
			</span>
		{:else if store.loading}
			<span class="spinner"></span>
		{/if}
		<ThemeToggle />
	</header>
	<main>
		{@render children()}
	</main>
	<Tooltip />
	<footer>
		Created by Wentao Jiang
		<span class="sep">|</span><a href="https://outside5sigma.com" target="_blank" rel="noopener">homepage</a>
		<span class="sep">|</span><a href="https://github.com/jwt625/advanced-packaging-atlas" target="_blank" rel="noopener">GitHub</a>
	</footer>
</div>

<style>
	.app {
		height: 100vh;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: var(--hdr) minmax(0, 1fr) auto;
	}
	header {
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 0 10px;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}
	.brand {
		color: var(--ink);
		font-weight: 600;
		letter-spacing: 0.02em;
	}
	.brand:hover {
		text-decoration: none;
	}
	nav {
		display: flex;
		gap: 2px;
		height: 100%;
	}
	nav a {
		display: flex;
		align-items: center;
		padding: 0 10px;
		color: var(--ink-2);
		border-bottom: 2px solid transparent;
	}
	nav a:hover {
		background: var(--hover);
		text-decoration: none;
	}
	nav a.active {
		color: var(--ink);
		border-bottom-color: var(--accent);
	}
	.grow {
		flex: 1;
	}
	footer {
		display: flex;
		align-items: center;
		gap: 6px;
		height: 20px;
		padding: 0 10px;
		font-size: 10px;
		color: var(--ink-3);
		background: var(--surface);
		border-top: 1px solid var(--border);
		white-space: nowrap;
		overflow: hidden;
	}
	footer .sep {
		color: var(--line);
	}
	main {
		min-height: 0;
		min-width: 0;
		overflow: hidden;
	}
	@media (max-width: 700px) {
		.app { grid-template-rows: auto minmax(0, 1fr) auto; }
		header { flex-wrap: wrap; gap: 6px 10px; padding: 6px 10px; }
		.brand { white-space: nowrap; }
		header > .muted { display: none; }
		nav { order: 3; width: 100%; height: 30px; overflow-x: auto; }
		nav a { flex-shrink: 0; padding: 0 8px; }
	}
</style>
