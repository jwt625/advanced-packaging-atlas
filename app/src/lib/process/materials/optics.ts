// Measured optical constants reduced to render inputs (lane L36). Sources and the reduction are in README.md.
//
// Metals and Si: normal-incidence reflectance F0 = ((n-1)^2 + k^2) / ((n+1)^2 + k^2) at R 630 nm, G 532 nm,
// B 465 nm from refractiveindex.info database tables (CC0), linear values (three's metal colour is F0 in linear RGB).
// Dielectrics: n at 532 nm (three's `ior`). Kapton: absorption coefficient alpha = 4 pi k / lambda (1/um).

export type RGB = [number, number, number];

export const F0: Record<string, RGB> = {
	cu: [0.915, 0.602, 0.55], // Johnson and Christy 1972
	au: [0.942, 0.704, 0.404], // Johnson and Christy 1972
	ni: [0.69, 0.634, 0.583], // Johnson and Christy 1974
	al: [0.908, 0.916, 0.921], // Rakic 1995
	ti: [0.612, 0.575, 0.549], // Johnson and Christy 1974
	ta: [0.883, 0.83, 0.775], // Werner et al. 2009
	fe: [0.529, 0.511, 0.5], // Johnson and Christy 1974
	cr: [0.553, 0.556, 0.558], // Johnson and Christy 1974
	sus430: [0.603, 0.585, 0.573], // Karlsson and Ribbing 1982, ferritic stainless steel
	si: [0.348, 0.374, 0.409], // Green 2008 (crystalline Si, 300 K); Aspnes 1983 gives 0.349 / 0.374 / 0.408
	// Sn: Golovashkin and Motulevich 1964 (293 K) starts at 730 nm (n 2.16, k 6.35 -> 0.828); no visible-range table in
	// the database, so the 730 nm value is used for all three channels (tin is visually neutral white).
	sn: [0.828, 0.828, 0.828]
};

export const IOR: Record<string, number> = {
	sio2: 1.461, // Malitson 1965, fused silica, 532 nm
	si3n4: 2.056, // Luke et al. 2015, LPCVD Si3N4, 532 nm
	borofloat: 1.474, // SCHOTT BOROFLOAT 33 datasheet (2021) Sellmeier fit, 532 nm (nd 1.471)
	kapton: 1.759, // Kumar et al. 2011, Kapton-H, 532 nm
	aln: 2.162, // Pastrnak and Roskovcova 1966, AlN single crystal, ordinary ray, 532 nm
	sic: 2.675, // Shaffer 1971, beta-SiC, 532 nm
	pdms: 1.435, // Schneider et al. 2009, Sylgard 184, 532 nm
	pet: 1.576, // Zhang et al. 2020, PET, 532 nm
	water: 1.334 // Hale and Querry 1973, liquid water 25 C, 532 nm
};

/** Kapton-H absorption coefficient (1/um), Kumar et al. 2011: R 630 nm, G 532 nm, B at 490 nm (table starts there). */
export const KAPTON_ALPHA: RGB = [0.00731, 0.0319, 0.075];

/** Transmittance colour of an absorbing film for a double pass (film on a reflector) of thickness d um. */
export function filmTint(alpha: RGB, dUm: number): RGB {
	return [Math.exp(-2 * alpha[0] * dUm), Math.exp(-2 * alpha[1] * dUm), Math.exp(-2 * alpha[2] * dUm)];
}

/** Draper point: onset of visible incandescence, about 798 K (525 C). */
export const DRAPER_C = 525;

/** Blackbody colour at the three render wavelengths (Planck), normalised to the brightest channel. */
export function planckRGB(tC: number): RGB {
	const T = tC + 273.15;
	const c2 = 14387.77; // um K (second radiation constant)
	const B = (lUm: number) => 1 / (lUm ** 5 * (Math.exp(c2 / (lUm * T)) - 1));
	const v: RGB = [B(0.63), B(0.532), B(0.465)];
	const m = Math.max(...v);
	return [v[0] / m, v[1] / m, v[2] / m];
}
