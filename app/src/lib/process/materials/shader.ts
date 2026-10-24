// Procedural layer shader injected into MeshPhysicalMaterial (lane L36, DevLog-016).
//
// One program family for every key: all per-key differences are uniforms, so materials share programs through
// `customProgramCacheKey` (three adds its own parameters: instancing, clipping-plane count, OPAQUE vs transparent).
// Feature layers (all optional, gated by uniform branches): grain (cellular), particles (filler / powder spheres),
// scratches (grind arcs / CMP micro-scratches / rolling lines), plain weave (glass-fibre yarns), flow front, dishing,
// wet film (clearcoat), blackbody emission. Texture coordinates are object-attached and in um:
// vPmTex = model scale * (instanceMatrix * position) (non-instanced: relative to the geometry bbox centre), times uUm.
// Isotropic textures are solid (3D) noise, so boxes, cylinders, spheres and section faces need no UVs or seams.
// Every procedural feature fades out by its pixel footprint (um per pixel) and its unresolved part goes to roughness
// or to the area-weighted mean colour, so features stay physical (no aliasing) from wafer scale to unit cell.

import type * as THREE from 'three';

export const PROGRAM_KEY = 'apa-procmat-v1';

const VERT_DECL = /* glsl */ `
uniform vec3 uBoxMin;
uniform vec3 uBoxMax;
varying vec3 vPmTex;
varying vec3 vPmN;
varying vec3 vPmLoc;
varying vec3 vPmAx;
varying vec3 vPmAy;
varying vec3 vPmAz;
varying vec3 vPmW;
`;

const VERT_MAIN = /* glsl */ `
{
	vec3 pmC = 0.5 * (uBoxMin + uBoxMax);
	vec3 pmHalf = max(0.5 * (uBoxMax - uBoxMin), vec3(1e-9));
	vPmLoc = (transformed - pmC) / pmHalf;
	vec3 pmP = transformed;
	vec3 pmNo = objectNormal;
	mat3 pmR = mat3(1.0);
	#ifdef USE_INSTANCING
		pmP = (instanceMatrix * vec4(pmP, 1.0)).xyz;
		pmNo = transpose(inverse(mat3(instanceMatrix))) * pmNo;
		pmR = mat3(instanceMatrix);
		vPmW = (modelMatrix * vec4(pmP, 1.0)).xyz;
	#else
		vPmW = (modelMatrix * vec4(pmP, 1.0)).xyz;
		pmP -= pmC;
	#endif
	vec3 pmS = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
	vPmTex = pmP * pmS;
	vPmN = normalize(pmNo / pmS);
	mat3 pmMV = mat3(modelViewMatrix) * pmR;
	vPmAx = normalize(pmMV * vec3(1.0, 0.0, 0.0));
	vPmAy = normalize(pmMV * vec3(0.0, 1.0, 0.0));
	vPmAz = normalize(pmMV * vec3(0.0, 0.0, 1.0));
}
`;

const FRAG_DECL = /* glsl */ `
varying vec3 vPmTex;
varying vec3 vPmN;
varying vec3 vPmLoc;
varying vec3 vPmAx;
varying vec3 vPmAy;
varying vec3 vPmAz;
uniform float uUm;          // um per world unit
uniform vec4 uGrain;        // size um, height um, colour variation, unresolved roughness
uniform vec4 uGrain2;       // boundary darkening, facet tilt, -, -
uniform vec4 uPart;         // d50 um, volume fraction, protrusion um, cover (0 bare .. 1 under resin skin)
uniform vec3 uPartCol;      // particle albedo / F0 (linear)
uniform vec4 uPart2;        // metalness, roughness, -, facet tilt
uniform vec4 uPart3;        // coarse / fine size ratio of the second (fine) particle layer, -, -, -
uniform vec4 uScr;          // spacing um, depth um, anisotropy, mode (1 grind arcs, 2 CMP scratches, 3 rolling lines)
uniform vec4 uScr2;         // -, macro bands per rad, band roughness, scratch width um
uniform vec2 uGrind;        // grinding-wheel radius um, wheel-centre offset from the wafer centre um
uniform vec4 uGrindC;       // wafer (chuck) centre in world coordinates (xyz), w = 1: grind marks in the wafer frame
uniform vec4 uWeave;        // warp pitch um, fill pitch um, ply thickness um, on (0/1)
uniform vec3 uWeaveCol;     // yarn (glass + resin) albedo
uniform vec4 uWeave2;       // filament diameter um, yarn width fraction, yarn height fraction, -
uniform vec4 uFront;        // front 0..1, mode (0 off, 1..6 = +x -x +y -y +z -z, 7 radial xz), wobble, band width
uniform vec4 uFront2;       // band clearcoat, band lighten, -, -
varying vec3 vPmW;          // world position
uniform vec4 uFrontAx;      // world mode 8: unit axis xyz, w = projection of the box low end on the axis
uniform vec4 uFrontC;       // world mode 8: w = projected box length; mode 9 (radial xz): xyz = box centre
uniform vec4 uFrontH;       // world box half extents (xyz)
uniform vec2 uCoat;         // clearcoat weight, clearcoat roughness
uniform vec2 uWet;          // wet 0..1, diffuse darkening when wet
uniform vec3 uEmit;         // emission (linear)
uniform vec4 uDish;         // depth um, -, -, -
uniform vec4 uMottle;       // size um, colour variation, roughness variation, -
uniform float uAlphaFres;   // 1: alpha rises to 1 at grazing incidence (Schlick), for transparent films / glass
uniform vec4 uPathTint;     // rgb edge colour, w = strength per unit path (path ~ 1 / |n.v|): glass edge tint without transmission

float pmHash13(vec3 p) {
	p = fract(p * 0.1031);
	p += dot(p, p.zyx + 31.32);
	return fract((p.x + p.y) * p.z);
}
vec3 pmHash33(vec3 p) {
	p = fract(p * vec3(0.1031, 0.1030, 0.0973));
	p += dot(p, p.yxz + 33.33);
	return fract((p.xxy + p.yxx) * p.zyx);
}
float pmHash12(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}
float pmVnoise3(vec3 p) {
	vec3 i = floor(p);
	vec3 f = fract(p);
	vec3 u = f * f * (3.0 - 2.0 * f);
	float a = pmHash13(i), b = pmHash13(i + vec3(1, 0, 0)), c = pmHash13(i + vec3(0, 1, 0)), d = pmHash13(i + vec3(1, 1, 0));
	float e = pmHash13(i + vec3(0, 0, 1)), g = pmHash13(i + vec3(1, 0, 1)), h = pmHash13(i + vec3(0, 1, 1)), k = pmHash13(i + vec3(1, 1, 1));
	return mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, g, u.x), mix(h, k, u.x), u.y), u.z);
}
float pmVnoise2(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(pmHash12(i), pmHash12(i + vec2(1, 0)), u.x), mix(pmHash12(i + vec2(0, 1)), pmHash12(i + vec2(1, 1)), u.x), u.y);
}
// Cellular noise: x = F1, y = F2 (cell units), z = id of the nearest cell, w unused; off = nearest feature - p
vec4 pmWorley(vec3 p, out vec3 off) {
	vec3 i = floor(p);
	vec3 f = fract(p);
	float d1 = 9.0, d2 = 9.0, id = 0.0;
	off = vec3(0.0);
	for (int z = -1; z <= 1; z++)
	for (int y = -1; y <= 1; y++)
	for (int x = -1; x <= 1; x++) {
		vec3 g = vec3(float(x), float(y), float(z));
		vec3 r = g + 0.1 + 0.8 * pmHash33(i + g) - f;
		float d = dot(r, r);
		if (d < d1) { d2 = d1; d1 = d; id = pmHash13(i + g + 17.17); off = r; }
		else if (d < d2) { d2 = d; }
	}
	return vec4(sqrt(d1), sqrt(d2), id, 0.0);
}
// sphere confined to its cell (cell units): x coverage (antialiased by aa), y cap height 0..1, z id
vec3 pmSph(vec3 p, float rLo, float rHi, float occ, float aa) {
	vec3 i = floor(p);
	vec3 f = p - i;
	float id = pmHash13(i + 7.31);
	if (id >= occ) return vec3(0.0, 0.0, id);
	float r = mix(rLo, rHi, pmHash13(i + 3.17));
	vec3 c = vec3(r) + (1.0 - 2.0 * r) * pmHash33(i + 19.1);
	float d = length(f - c);
	float cov = 1.0 - smoothstep(r - aa, r + aa, d);
	return vec3(cov, sqrt(max(r * r - d * d, 0.0)) / r, id);
}
// visibility of a feature of size L (um) at pixel footprint fw (um per pixel)
// (audit V1 M10): a feature fades in between 3 and 6 px on screen, so nothing below ~3 px is drawn as pixel noise
float pmVis(float fw, float L) { return smoothstep(3.0, 6.0, L / max(fw, 1e-9)); }

// In-feed (cup-wheel) grinding marks: with wheel speed >> chuck speed the grit path in the wafer frame is, to first
// order, a circle of the wheel radius Rw whose centre sits at distance D from the wafer centre (D = Rw when the rim
// passes over the wafer centre), rotated about the wafer centre by the chuck angle. For a point P the mark through it
// has its centre C with |C| = D and |P - C| = Rw. Returns C (xz, um); points the rim never reaches use the nearest
// reachable circle.
vec2 pmArcCentre(vec2 P) {
	float Rw = uGrind.x, D = uGrind.y;
	float r = length(P);
	vec2 ph = r > 1e-3 ? P / r : vec2(1.0, 0.0);
	vec2 pp = vec2(-ph.y, ph.x);
	float a = r > 1e-3 ? (r * r + D * D - Rw * Rw) / (2.0 * r) : 0.0;
	a = clamp(a, -D, D);
	return ph * a + pp * sqrt(max(D * D - a * a, 0.0));
}
// across-scratch unit vector (xz)
vec2 pmArcAcross(vec2 P) {
	vec2 d = P - pmArcCentre(P);
	return length(d) > 1e-6 ? normalize(d) : vec2(1.0, 0.0);
}
float pmArcPhase(vec2 P) {
	vec2 C = pmArcCentre(P);
	return atan(C.y, C.x);
}
// scratch streaks in one tile, oriented by the tile-centre arc frame (tile << Rw, so the frame is locally exact)
float pmGrindTile(vec2 P, vec2 tile, float T, float sp) {
	vec2 c = (tile + 0.5) * T;
	vec2 n = pmArcAcross(c);
	vec2 t = vec2(-n.y, n.x);
	vec2 q = vec2(dot(P - c, n) / sp, dot(P - c, t) / (sp * 40.0)) + 97.0 * pmHash12(tile);
	return pmVnoise2(q) * 0.65 + pmVnoise2(q * vec2(2.7, 1.3) + 11.0) * 0.35;
}
// Mikkelsen bump: height in view-space units
vec3 pmPerturb(vec3 pos, vec3 N, float h) {
	vec3 sx = dFdx(pos);
	vec3 sy = dFdy(pos);
	vec3 r1 = cross(sy, N);
	vec3 r2 = cross(N, sx);
	float det = dot(sx, r1);
	vec3 g = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
	// limit the tilt to ~60 deg: derivative spikes across triangle edges / feature rims would otherwise sparkle
	float gl = length(g);
	float gmax = 1.7 * abs(det);
	if (gl > gmax) g *= gmax / gl;
	vec3 n2 = abs(det) * N - g;
	return dot(n2, n2) > 0.0 ? normalize(n2) : N;
}
`;

const FRAG_MAIN = /* glsl */ `
vec3 pmT = vPmTex * uUm;
vec3 pmNt = normalize(vPmN);
float pmFw = max(length(fwidth(pmT)), 1e-6);
float pmH = 0.0;
float pmRough = 0.0;
float pmPM = 0.0;            // particle coverage (area fraction under the pixel)
float pmAniso = 0.0;
vec3 pmADir = vec3(1.0, 0.0, 0.0);
float pmCoat = uCoat.x;
float pmCoatR = uCoat.y;
vec3 pmAlb = vec3(1.0);
float pmTopFace = smoothstep(0.6, 0.8, abs(pmNt.y));
{
	// flow front (underfill, EMC, liquids): material exists only behind the front
	if (uFront.y > 0.5 && uFront.x < 0.9999) {
		int fm = int(uFront.y + 0.5);
		float s;
		vec3 wq = vPmLoc;
		if (fm >= 8) wq = (vPmW - uFrontC.xyz) / max(uFrontH.xyz, vec3(1e-9));
		if (fm == 8) s = (dot(vPmW, uFrontAx.xyz) - uFrontAx.w) / max(uFrontC.w, 1e-9);
		else if (fm == 9) s = length(wq.xz) * 0.70710678;
		else if (fm == 7) s = length(vPmLoc.xz) * 0.70710678;
		else if (fm <= 2) s = 0.5 + 0.5 * (fm == 1 ? vPmLoc.x : -vPmLoc.x);
		else if (fm <= 4) s = 0.5 + 0.5 * (fm == 3 ? vPmLoc.y : -vPmLoc.y);
		else s = 0.5 + 0.5 * (fm == 5 ? vPmLoc.z : -vPmLoc.z);
		float wob = (pmVnoise3(wq * 5.0) - 0.5) * uFront.z;
		float d = uFront.x - s + wob;
		if (uFront.x <= 0.0001 || d < 0.0) discard;
		float band = 1.0 - smoothstep(0.0, max(uFront.w, 1e-4), d);
		pmCoat = max(pmCoat, band * uFront2.x);
		pmAlb *= 1.0 + band * uFront2.y;
	}
	// large-scale mottling (uneven plating, paste, resin flow lines)
	if (uMottle.x > 0.0) {
		float m = pmVnoise3(pmT / uMottle.x) * 0.6 + pmVnoise3(pmT / (uMottle.x * 0.37)) * 0.4 - 0.5;
		pmAlb *= 1.0 + uMottle.y * m;
		pmRough += uMottle.z * m;
	}
	// grains (plated Cu / Sn, Ni-P nodules, solidification cells)
	if (uGrain.x > 0.0) {
		float vis = pmVis(pmFw, uGrain.x);
		if (vis > 0.0) {
			vec3 off;
			vec4 w = pmWorley(pmT / uGrain.x, off);
			float edge = smoothstep(0.0, 0.12, w.y - w.x);
			// F1 is continuous across cell borders: nodules meet in creases, no height steps (steps alias to sparkles)
			float dome = clamp(1.0 - w.x * w.x, 0.0, 1.0);
			float facet = clamp(w.y - w.x, 0.0, 1.0);
			pmH += vis * uGrain.y * (mix(dome, facet, uGrain2.y));
			pmAlb *= 1.0 + vis * (uGrain.z * (w.z - 0.5) * 2.0 - uGrain2.x * (1.0 - edge));
		}
		pmRough += uGrain.w * (1.0 - vis);
	}
	// particles (silica filler in EMC / underfill / ABF, solder powder in paste): spheres confined to their own
	// cell (exact circles on any section, no overlap). Coarse layer: mean diameter uPart.x; fine layer at
	// uPart.x / uPart3.x fills the matrix between coarse spheres up to the target volume fraction uPart.y.
	if (uPart.x > 0.0) {
		float c1 = uPart.x / 0.82;
		float c2 = c1 / max(uPart3.x, 1.0);
		float occ1 = min(1.0, uPart.y / 0.30);
		float occ2 = clamp((uPart.y - 0.30) / 0.70 / 0.27, 0.0, 1.0);
		float vis1 = pmVis(pmFw, uPart.x * 0.5);
		float vis2 = pmVis(pmFw, uPart.x * 0.5 / max(uPart3.x, 1.0));
		float cov = 0.0;
		if (vis1 > 0.0) {
			vec3 a = pmSph(pmT / c1, 0.32, 0.5, occ1, pmFw / c1);
			vec3 b = vis2 > 0.0 ? pmSph(pmT / c2 + 0.37, 0.25, 0.5, occ2, pmFw / c2) : vec3(0.0);
			float fine = mix(occ2 * 0.27, b.x, vis2) * (1.0 - a.x);
			cov = a.x + fine;
			vec3 tilt = pmHash33(vec3(a.z * 37.0, 5.0, a.z * 91.0)) - 0.5;
			// a resin skin (cover) also hides the particle relief
			pmH += vis1 * (1.0 - uPart.w) * (a.x * (uPart.z * a.y + uPart2.w * c1 * (tilt.x + tilt.z) * a.y) + b.x * (1.0 - a.x) * uPart.z * b.y / max(uPart3.x, 1.0));
		}
		pmPM = mix(uPart.y, cov, vis1) * (1.0 - uPart.w);
	}
	// scratches
	int sm = int(uScr.w + 0.5);
	if (sm == 1) {
		// in-feed grinding: arcs of the wheel radius through the wafer centre, on faces normal to y
		// wafer frame: world xz relative to the wafer centre (setGrindCentre), else the mesh's own centre
		vec2 P = uGrindC.w > 0.5 ? (vPmW.xz - uGrindC.xz) * uUm : pmT.xz;
		vec2 nAcross = pmArcAcross(P);
		pmAniso = uScr.z * pmTopFace;
		pmADir = vec3(nAcross.x, 0.0, nAcross.y);
		float vis = pmVis(pmFw, uScr.x) * pmTopFace;
		if (vis > 0.0) {
			float T = uScr.x * 48.0;
			vec2 g = P / T - 0.5;
			vec2 i0 = floor(g);
			vec2 fr = g - i0;
			float a = pmGrindTile(P, i0, T, uScr.x), b = pmGrindTile(P, i0 + vec2(1, 0), T, uScr.x);
			float c = pmGrindTile(P, i0 + vec2(0, 1), T, uScr.x), d = pmGrindTile(P, i0 + vec2(1, 1), T, uScr.x);
			vec2 u = smoothstep(0.0, 1.0, fr);
			float n = mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
			float groove = smoothstep(0.5, 0.8, n);
			pmH -= vis * uScr.y * groove;
			pmAlb *= 1.0 - vis * 0.18 * groove;
		}
		float band = 0.5 + 0.5 * sin(pmArcPhase(P) * uScr2.y);
		pmRough += pmTopFace * uScr2.z * (band - 0.5);
	} else if (sm == 2) {
		// sparse CMP micro-scratches: straight segments, one candidate per tile of uScr.x um
		vec3 an = abs(pmNt);
		vec2 P = an.y >= max(an.x, an.z) ? pmT.xz : (an.x > an.z ? pmT.zy : pmT.xy);
		float w = uScr2.w;
		float cov = 0.0;
		vec2 ti = floor(P / uScr.x);
		for (int y = -1; y <= 1; y++)
		for (int x = -1; x <= 1; x++) {
			vec2 t = ti + vec2(float(x), float(y));
			vec3 h = pmHash33(vec3(t, 7.0));
			if (h.z > 0.45) continue;
			vec2 c = (t + h.xy) * uScr.x;
			float ang = pmHash12(t + 3.1) * 3.14159265;
			vec2 dir = vec2(cos(ang), sin(ang));
			vec2 rel = P - c;
			float along = dot(rel, dir);
			float L = uScr.x * (0.6 + 1.2 * pmHash12(t + 9.7));
			float dist = abs(dot(rel, vec2(-dir.y, dir.x)));
			float endFade = 1.0 - smoothstep(0.35 * L, 0.5 * L, abs(along));
			float wEff = max(w, pmFw);
			cov = max(cov, endFade * clamp(w / pmFw, 0.0, 1.0) * (1.0 - smoothstep(0.5 * wEff, wEff, dist)));
		}
		pmH -= cov * uScr.y;
		pmAlb *= 1.0 - 0.45 * cov;
		pmRough += 0.25 * cov;
		pmAniso = 0.0;
	} else if (sm == 3) {
		// rolling / brushing lines along x
		pmAniso = uScr.z;
		pmADir = vec3(0.0, 0.0, 1.0);
		float vis = pmVis(pmFw, uScr.x);
		if (vis > 0.0) {
			float n = pmVnoise2(vec2(pmT.z / uScr.x, pmT.x / (uScr.x * 60.0))) * 0.7 + pmVnoise2(vec2(pmT.y / uScr.x, pmT.x / (uScr.x * 60.0)) * 1.9) * 0.3;
			pmH -= vis * uScr.y * n;
			pmAlb *= 1.0 - vis * 0.1 * (n - 0.5);
		}
	}
	// plain weave (glass-fibre fabric in resin), plies stacked in y
	float pmYarn = 0.0;
	if (uWeave.w > 0.5) {
		float px = uWeave.x, pz = uWeave.y, t = uWeave.z;
		float vis = pmVis(pmFw, min(px, t) * 0.25);
		float ply = floor(pmT.y / t);
		float yl = (pmT.y - (ply + 0.5) * t) / t;
		float off = pmHash12(vec2(ply, 2.0));
		float xs = pmT.x / px + off * 7.0, zs = pmT.z / pz + off * 13.0;
		float j = floor(zs), i = floor(xs);
		float warpC = 0.22 * sin(3.14159265 * xs + 3.14159265 * j);
		float fillC = -0.22 * sin(3.14159265 * zs + 3.14159265 * i);
		float wz = (fract(zs) - 0.5) / (0.5 * uWeave2.y);
		float wx = (fract(xs) - 0.5) / (0.5 * uWeave2.y);
		float hy = 0.5 * uWeave2.z;
		float warp = wz * wz + ((yl - warpC) / hy) * ((yl - warpC) / hy);
		float fill = wx * wx + ((yl - fillC) / hy) * ((yl - fillC) / hy);
		float aa = 2.0 * pmFw / min(px, t);
		float inWarp = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, warp);
		float inFill = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, fill);
		pmYarn = max(inWarp, inFill);
		// filaments: elongated cells along the yarn axis
		float fv = pmVis(pmFw, uWeave2.x);
		if (fv > 0.0 && pmYarn > 0.0) {
			vec3 o2;
			vec3 q = inWarp >= inFill ? vec3(pmT.x / (uWeave2.x * 30.0), pmT.y / uWeave2.x, pmT.z / uWeave2.x)
				: vec3(pmT.x / uWeave2.x, pmT.y / uWeave2.x, pmT.z / (uWeave2.x * 30.0));
			vec4 w = pmWorley(q, o2);
			float fib = 1.0 - smoothstep(0.38, 0.5, w.x);
			pmAlb *= 1.0 - fv * pmYarn * 0.45 * (1.0 - fib);
		}
		pmYarn *= mix(0.55, 1.0, vis);
	}
	// dishing on the top face of each object / instance (Cu pads after CMP): concave bowl of depth uDish.x um
	if (uDish.x > 0.0) {
		float rho2 = min(dot(vPmLoc.xz, vPmLoc.xz), 1.0);
		pmH -= pmTopFace * uDish.x * (1.0 - rho2);
	}
	// wet film: clearcoat plus diffuse darkening (Lekner and Dorf 1988)
	pmCoat = max(pmCoat, uWet.x);
	pmCoatR = mix(pmCoatR, 0.04, uWet.x);
	diffuseColor.rgb = mix(diffuseColor.rgb, uWeaveCol, pmYarn);
	diffuseColor.rgb *= pmAlb;
	diffuseColor.rgb = mix(diffuseColor.rgb, uPartCol, pmPM);
	diffuseColor.rgb *= 1.0 - uWet.y * uWet.x * (1.0 - metalness * (1.0 - pmPM));
}
`;

const FRAG_ROUGH = /* glsl */ `
roughnessFactor = clamp(roughnessFactor + pmRough, 0.02, 1.0);
roughnessFactor = mix(roughnessFactor, uPart2.y, pmPM);
`;
const FRAG_METAL = /* glsl */ `
metalnessFactor = mix(metalnessFactor, uPart2.x, pmPM);
`;
const FRAG_NORMAL = /* glsl */ `
normal = pmPerturb(-vViewPosition, normal, pmH / max(uUm, 1e-9));
if (uAlphaFres > 0.0) {
	float nv = clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0);
	diffuseColor.a = mix(diffuseColor.a, 1.0, uAlphaFres * pow(1.0 - nv, 5.0));
	if (uPathTint.w > 0.0) {
		float k = 1.0 - exp(-uPathTint.w / max(nv, 0.08));
		diffuseColor.rgb = mix(diffuseColor.rgb, uPathTint.rgb, k);
		diffuseColor.a = min(1.0, diffuseColor.a + 0.4 * k);
	}
}
`;
const FRAG_EMIT = /* glsl */ `
totalEmissiveRadiance += uEmit;
`;
const FRAG_LIGHTS = /* glsl */ `
#ifdef USE_CLEARCOAT
	material.clearcoat = saturate(pmCoat);
	material.clearcoatRoughness = min(max(pmCoatR, 0.0525) + geometryRoughness, 1.0);
#endif
#ifdef USE_ANISOTROPY
	{
		vec3 pmTv = pmADir.x * vPmAx + pmADir.y * vPmAy + pmADir.z * vPmAz;
		pmTv = pmTv - normal * dot(pmTv, normal);
		float l = length(pmTv);
		material.anisotropy = saturate(pmAniso) * smoothstep(0.25, 0.7, l);
		pmTv = l > 1e-4 ? pmTv / l : vec3(1.0, 0.0, 0.0);
		material.alphaT = mix(pow2(material.roughness), 1.0, pow2(material.anisotropy));
		material.anisotropyT = pmTv;
		material.anisotropyB = cross(normal, pmTv);
	}
#endif
`;

export type PmUniforms = Record<string, { value: unknown }>;

function rep(src: string, anchor: string, add: string, before = false): string {
	if (!src.includes(anchor)) throw new Error(`procmat: shader anchor missing: ${anchor}`);
	return src.replace(anchor, before ? `${add}\n${anchor}` : `${anchor}\n${add}`);
}

/** Wire the procedural layers into a MeshPhysicalMaterial. All materials share one program family. */
export function installShader(m: THREE.MeshPhysicalMaterial, uniforms: PmUniforms): void {
	m.onBeforeCompile = (sh) => {
		Object.assign(sh.uniforms, uniforms);
		let v = sh.vertexShader;
		v = rep(v, '#include <common>', VERT_DECL);
		v = rep(v, '#include <begin_vertex>', VERT_MAIN);
		sh.vertexShader = v;
		let f = sh.fragmentShader;
		f = rep(f, '#include <common>', FRAG_DECL);
		f = rep(f, '#include <color_fragment>', FRAG_MAIN);
		f = rep(f, '#include <roughnessmap_fragment>', FRAG_ROUGH);
		f = rep(f, '#include <metalnessmap_fragment>', FRAG_METAL);
		f = rep(f, '#include <normal_fragment_maps>', FRAG_NORMAL);
		f = rep(f, '#include <emissivemap_fragment>', FRAG_EMIT);
		f = rep(f, '#include <lights_physical_fragment>', FRAG_LIGHTS);
		sh.fragmentShader = f;
	};
	m.customProgramCacheKey = () => PROGRAM_KEY;
}
