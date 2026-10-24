// Closed-form process physics (CONTRACT.md section 10). Pure functions, SI-consistent units stated per function.
// Physical constants with sources; process values always come from the data (PDim), never from here.

/** Faraday constant, C/mol (CODATA 2018; exact in the 2019 SI: N_A * e). */
export const FARADAY = 96485.33212;

/** Electroplated metals: molar mass M (g/mol, IUPAC standard atomic weights), electrons per ion n (Cu2+, Ni2+, Sn2+,
 * Au(I)), density rho (g/cm3 at 20 C, English Wikipedia element infoboxes, read 2026-10-23). SnAg plating is treated
 * as Sn (Ag content ignored). */
export const METALS: Record<string, { M: number; n: number; rho: number; name: string }> = {
	cu: { M: 63.546, n: 2, rho: 8.935, name: 'Cu' },
	ni: { M: 58.693, n: 2, rho: 8.907, name: 'Ni' },
	solder: { M: 118.71, n: 2, rho: 7.289, name: 'Sn (white)' },
	au: { M: 196.967, n: 1, rho: 19.283, name: 'Au' }
};

/** Faraday growth rate, um/s, for current density j (mA/cm2) and current efficiency eta (0..1).
 * v = M j eta / (n F rho): g/mol * A/cm2 / (C/mol * g/cm3) = cm/s. */
export function faradayRate(metal: string, j_ma_cm2: number, eta = 1): number | null {
	const m = METALS[metal];
	if (!m || !(j_ma_cm2 > 0)) return null;
	const cm_s = (m.M * (j_ma_cm2 / 1000) * eta) / (m.n * FARADAY * m.rho);
	return cm_s * 1e4;
}

/** Preston removal rate, um/s: RR = Kp P v with Kp in 1/Pa (= m2/N), P in kPa, v in m/s. */
export function prestonRate(kp_per_pa: number, p_kpa: number, v_m_s: number): number {
	return kp_per_pa * p_kpa * 1e3 * v_m_s * 1e6;
}

/** Washburn front between parallel plates, x(t) in m: sqrt(gamma h cos(theta) t / (3 mu)).
 * gamma N/m, h m, theta deg, mu Pa.s, t s. */
export function washburnX(gamma: number, h_m: number, theta_deg: number, mu: number, t_s: number): number {
	const c = Math.cos((theta_deg * Math.PI) / 180);
	if (!(c > 0) || !(mu > 0) || t_s <= 0) return 0;
	return Math.sqrt((gamma * h_m * c * t_s) / (3 * mu));
}

/** Washburn fill time for a flow length L (m): t = 3 mu L^2 / (gamma h cos(theta)). */
export function washburnT(gamma: number, h_m: number, theta_deg: number, mu: number, L_m: number): number | null {
	const c = Math.cos((theta_deg * Math.PI) / 180);
	if (!(c > 0) || !(gamma > 0) || !(h_m > 0)) return null;
	return (3 * mu * L_m * L_m) / (gamma * h_m * c);
}

/** Bosch depth (um) at progress u for total depth D and etch per cycle e: a staircase, one step per cycle, the
 * etch half of each cycle advancing the front (the first half is passivation). */
export function boschDepth(D: number, e: number, u: number): { depth: number; cycle: number; cycles: number; passivating: boolean } {
	const N = Math.max(1, Math.ceil(D / e - 1e-9));
	const c = Math.min(u * N, N);
	const k = Math.min(Math.floor(c), N - 1);
	const f = c - k;
	const pass = f < 0.5 && u < 1;
	const inCycle = pass ? 0 : Math.min(1, (f - 0.5) / 0.5);
	const depth = u >= 1 ? D : Math.min(D, (k + inCycle) * e);
	return { depth, cycle: k + 1, cycles: N, passivating: pass };
}

/** Spherical-cap volume (um3) of height h on a wetted radius a. */
export function capVolume(a: number, h: number): number {
	return (Math.PI * h * (3 * a * a + h * h)) / 6;
}

/** Spherical-zone volume (um3) of height H between parallel circles of radii a and b. */
export function zoneVolume(a: number, b: number, H: number): number {
	return (Math.PI * H * (3 * a * a + 3 * b * b + H * H)) / 6;
}

function bisect(f: (x: number) => number, target: number, lo: number, hi: number): number {
	for (let i = 0; i < 80; i++) {
		const m = (lo + hi) / 2;
		if (f(m) < target) lo = m;
		else hi = m;
	}
	return (lo + hi) / 2;
}

/** Height of a free cap of volume V on wetted radius a (V monotone in h). */
export function capHeight(V: number, a: number): number {
	if (!(V > 0) || !(a > 0)) return 0;
	let hi = Math.max(a, 1e-6);
	while (capVolume(a, hi) < V) hi *= 2;
	return bisect((h) => capVolume(a, h), V, 0, hi);
}

/** Zero-load truncated-sphere joint height between pads a and b holding volume V. */
export function jointHeight(V: number, a: number, b: number): number {
	if (!(V > 0)) return 0;
	let hi = Math.max(a, b, 1e-6);
	while (zoneVolume(a, b, hi) < V) hi *= 2;
	return bisect((H) => zoneVolume(a, b, H), V, 0, hi);
}

/** Radius r(z) of the sphere through two circles: base radius a at z = 0 and top radius b at z = H. */
export function zoneRadius(a: number, b: number, H: number, z: number): number {
	if (!(H > 0)) return a;
	const zc = (H * H + b * b - a * a) / (2 * H);
	const R2 = a * a + zc * zc;
	return Math.sqrt(Math.max(0, R2 - (z - zc) * (z - zc)));
}

/** Radius r(z) of a cap of height h on base radius a (z from the base). */
export function capRadius(a: number, h: number, z: number): number {
	if (!(h > 0)) return 0;
	const Rs = (a * a + h * h) / (2 * h);
	const zc = h - Rs;
	return Math.sqrt(Math.max(0, Rs * Rs - (z - zc) * (z - zc)));
}

/** Compression molding: front radius fraction for volume conservation, R/R_full = sqrt(g_final / g). */
export function squeezeFraction(gFinal: number, g: number): number {
	if (!(g > 0)) return 1;
	return Math.min(1, Math.sqrt(gFinal / g));
}

/** Piecewise-linear profile value at time t (s); clamps outside the range. */
export function profileAt(pts: [number, number][], t: number): number {
	if (!pts.length) return NaN;
	if (t <= pts[0][0]) return pts[0][1];
	for (let i = 1; i < pts.length; i++) {
		if (t <= pts[i][0]) {
			const [t0, v0] = pts[i - 1], [t1, v1] = pts[i];
			return t1 > t0 ? v0 + ((t - t0) / (t1 - t0)) * (v1 - v0) : v1;
		}
	}
	return pts[pts.length - 1][1];
}

/** Melt fraction for display: 0 below liquidus - 2 C, 1 above liquidus + 2 C, linear in between. */
export function meltAt(T: number, liq: number): number {
	return Math.min(1, Math.max(0, (T - (liq - 2)) / 4));
}

/** Reflow shape progress at time t: the largest melt reached so far (a solidified joint keeps its reflowed shape). */
export function reflowShape(pts: [number, number][], liq: number, t: number): number {
	let m = 0;
	for (let i = 0; i < pts.length && pts[i][0] <= t; i++) m = Math.max(m, meltAt(pts[i][1], liq));
	return Math.max(m, meltAt(profileAt(pts, t), liq));
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (x: number) => {
	const c = clamp01(x);
	return c * c * (3 - 2 * c);
};
