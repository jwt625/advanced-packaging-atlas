// Zoom-dependent clustering of weighted map points (institution sites) in Web Mercator pixel space.
// Greedy: the heaviest unassigned point seeds a cluster at its own position and absorbs every
// unassigned point within `radiusPx` at the current zoom. Deterministic for equal input.

export interface GeoPoint<T> {
	lon: number;
	lat: number;
	/** ranking weight (e.g. papers at the site); ties broken by input order */
	w: number;
	item: T;
}

export interface GeoCluster<T> {
	lon: number;
	lat: number;
	items: T[];
}

/** Web Mercator pixel coordinates at zoom z (tile size 512, as MapLibre). */
export function project(lon: number, lat: number, z: number): [number, number] {
	const s = 512 * 2 ** z;
	const phi = (Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI) / 180;
	return [((lon + 180) / 360) * s, (0.5 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / (2 * Math.PI)) * s];
}

export function clusterPoints<T>(points: GeoPoint<T>[], zoom: number, radiusPx = 36): GeoCluster<T>[] {
	const order = points.map((p, i) => ({ p, i, xy: project(p.lon, p.lat, zoom) })).sort((a, b) => b.p.w - a.p.w || a.i - b.i);
	const used = new Set<number>();
	const out: GeoCluster<T>[] = [];
	const r2 = radiusPx * radiusPx;
	for (const seed of order) {
		if (used.has(seed.i)) continue;
		used.add(seed.i);
		const c: GeoCluster<T> = { lon: seed.p.lon, lat: seed.p.lat, items: [seed.p.item] };
		for (const o of order) {
			if (used.has(o.i)) continue;
			const dx = o.xy[0] - seed.xy[0];
			const dy = o.xy[1] - seed.xy[1];
			if (dx * dx + dy * dy <= r2) {
				used.add(o.i);
				c.items.push(o.p.item);
			}
		}
		out.push(c);
	}
	return out;
}
