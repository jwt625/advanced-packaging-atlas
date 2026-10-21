// Field layer of the /sim graphics (R7 4.1, DevLog-010 A10): one ShaderMaterial for surface and slice triangles with a
// 256x1 colormap LUT texture, linear or log scale, display affine (SI -> display unit), range uniforms, deformation
// p + s u in the vertex shader, flat shading from screen-space derivatives; a wireframe overlay of the face outlines
// with the same transform. Object matrix maps package mm (x, y, z up) to the viewer world (X = x, Y = z kz, Z = -y),
// so raycasting works on the undeformed geometry.
import * as THREE from 'three';
import { colormapLut, type ColormapName } from '../colormap';
import type { SurfaceOut } from '../post';
import { ArrowLayer } from './ArrowLayer';

const VERT = /* glsl */ `
attribute float value;
attribute vec3 disp;
uniform float dscale;
varying float vVal;
varying vec3 vView;
void main() {
	vec3 p = position + dscale * disp * 1000.0;
	vVal = value;
	vec4 mv = modelViewMatrix * vec4(p, 1.0);
	vView = mv.xyz;
	gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform sampler2D lut;
uniform float vmin;
uniform float vmax;
uniform float affA;
uniform float affB;
uniform int logScale;
uniform float opacity;
varying float vVal;
varying vec3 vView;
void main() {
	float v = vVal * affA + affB;
	float t = logScale == 1 ? (log(max(v, 1e-30)) - log(vmin)) / (log(vmax) - log(vmin)) : (v - vmin) / (vmax - vmin);
	t = clamp(t, 0.0, 1.0);
	vec3 c = texture2D(lut, vec2(t * 255.0 / 256.0 + 0.5 / 256.0, 0.5)).rgb;
	vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
	float l = 0.62 + 0.38 * abs(n.z);
	gl_FragColor = vec4(c * l, opacity);
}`;

const LINE_VERT = /* glsl */ `
attribute vec3 disp;
uniform float dscale;
void main() {
	vec3 p = position + dscale * disp * 1000.0;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const LINE_FRAG = /* glsl */ `
uniform vec3 color;
uniform float opacity;
void main() { gl_FragColor = vec4(color, opacity); }`;

export interface FieldStyle {
	table: ColormapName;
	reverse: boolean;
	/** Display range (display units). */
	min: number;
	max: number;
	log: boolean;
	/** display = SI * a + b */
	affA: number;
	affB: number;
	dscale: number;
}

export interface FieldMesh {
	mesh: THREE.Mesh;
	data: SurfaceOut;
	wire: THREE.LineSegments | null;
	/** Unused (mirrored copies are separate layers with their own data); kept empty. */
	copies: THREE.Object3D[];
}

export class FieldLayer {
	readonly group = new THREE.Group();
	private lutTex: THREE.DataTexture;
	private lutKey = '';
	private mats: THREE.ShaderMaterial[] = [];
	private lineMat: THREE.ShaderMaterial;
	layers: FieldMesh[] = [];
	readonly arrows: ArrowLayer;
	/** Untransformed group of the arrows (they map package to world themselves). */
	readonly arrowGroup = new THREE.Group();

	constructor() {
		this.lutTex = new THREE.DataTexture(new Uint8Array(256 * 4), 256, 1, THREE.RGBAFormat);
		this.lutTex.magFilter = THREE.LinearFilter;
		this.lutTex.minFilter = THREE.LinearFilter;
		this.lineMat = new THREE.ShaderMaterial({
			vertexShader: LINE_VERT, fragmentShader: LINE_FRAG, transparent: true, depthWrite: false,
			uniforms: { dscale: { value: 0 }, color: { value: new THREE.Color(0x111111) }, opacity: { value: 0.35 } }
		});
		this.group.matrixAutoUpdate = false;
		this.arrows = new ArrowLayer(this.arrowGroup);
	}

	/** Package-to-world matrix for a z-exaggeration kz. */
	setKz(kz: number) {
		this.group.matrix.set(1, 0, 0, 0, 0, 0, kz, 0, 0, -1, 0, 0, 0, 0, 0, 1);
		this.group.matrixWorldNeedsUpdate = true;
	}

	private material(opacity: number): THREE.ShaderMaterial {
		const m = new THREE.ShaderMaterial({
			vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, transparent: opacity < 1, depthWrite: opacity >= 1,
			uniforms: {
				lut: { value: this.lutTex }, vmin: { value: 0 }, vmax: { value: 1 }, affA: { value: 1 }, affB: { value: 0 },
				logScale: { value: 0 }, opacity: { value: opacity }, dscale: { value: 0 }
			}
		});
		this.mats.push(m);
		return m;
	}

	clear() {
		for (const l of this.layers) {
			for (const c of l.copies) this.group.remove(c);
			this.group.remove(l.mesh);
			l.mesh.geometry.dispose();
			if (l.wire) {
				this.group.remove(l.wire);
				l.wire.geometry.dispose();
			}
		}
		for (const m of this.mats) m.dispose();
		this.mats = [];
		this.layers = [];
	}

	/** Replace the layers (surface, slice ...); `opacity` per layer; `wire` adds face outlines. */
	setLayers(list: { data: SurfaceOut; opacity: number; wire: boolean; scale?: [number, number] }[]) {
		this.clear();
		for (const { data, opacity, wire, scale } of list) {
			if (!data.faces) continue;
			const geo = new THREE.BufferGeometry();
			geo.setAttribute('position', new THREE.BufferAttribute(data.pos, 3));
			geo.setAttribute('value', new THREE.BufferAttribute(data.val, 1));
			geo.setAttribute('disp', new THREE.BufferAttribute(data.disp ?? new Float32Array(data.pos.length), 3));
			geo.setIndex(new THREE.BufferAttribute(data.index, 1));
			geo.computeBoundingBox();
			geo.computeBoundingSphere();
			const mesh = new THREE.Mesh(geo, this.material(opacity));
			mesh.renderOrder = opacity < 1 ? 2 : 1;
			this.group.add(mesh);
			let w: THREE.LineSegments | null = null;
			if (wire && !data.tri) {
				// 4 outline edges per face (shared edges drawn twice; acceptable for a QA view)
				const n = data.faces;
				const idx = new Uint32Array(n * 8);
				for (let f = 0; f < n; f++) {
					const v = f * 4;
					idx.set([v, v + 1, v + 1, v + 2, v + 2, v + 3, v + 3, v], f * 8);
				}
				const lg = new THREE.BufferGeometry();
				lg.setAttribute('position', geo.getAttribute('position'));
				lg.setAttribute('disp', geo.getAttribute('disp'));
				lg.setIndex(new THREE.BufferAttribute(idx, 1));
				w = new THREE.LineSegments(lg, this.lineMat);
				w.renderOrder = 3;
				this.group.add(w);
			}
			// mirrored display copy of a symmetry crop (COMSOL Mirror 3D): scale -1 in the package frame
			const [sx, sy] = scale ?? [1, 1];
			for (const o of [mesh, w]) {
				if (!o) continue;
				o.scale.set(sx, sy, 1);
				o.updateMatrix();
			}
			const copies: THREE.Object3D[] = [];
			this.layers.push({ mesh, data, wire: w, copies });
		}
	}

	setStyle(s: FieldStyle, dark: boolean) {
		const key = `${s.table}:${s.reverse}`;
		if (key !== this.lutKey) {
			(this.lutTex.image.data as Uint8Array).set(colormapLut(s.table, s.reverse));
			this.lutTex.needsUpdate = true;
			this.lutKey = key;
		}
		const lo = s.log ? Math.max(s.min, 1e-30) : s.min;
		const hi = s.max > lo ? s.max : lo + (Math.abs(lo) || 1) * 1e-6;
		for (const m of this.mats) {
			m.uniforms.vmin.value = lo;
			m.uniforms.vmax.value = hi;
			m.uniforms.affA.value = s.affA;
			m.uniforms.affB.value = s.affB;
			m.uniforms.logScale.value = s.log ? 1 : 0;
			m.uniforms.dscale.value = s.dscale;
		}
		this.lineMat.uniforms.dscale.value = s.dscale;
		(this.lineMat.uniforms.color.value as THREE.Color).set(dark ? 0x050505 : 0x222222);
	}

	get triangles(): number {
		return this.layers.reduce((a, l) => a + l.data.faces * 2, 0);
	}

	/**
	 * Hit on a layer -> layer index, face index, point in the layer's data frame (for the value) and the package point
	 * (mm) actually under the cursor (differs on mirrored copies).
	 */
	pick(ray: THREE.Raycaster): { layer: number; face: number; p: THREE.Vector3; at: THREE.Vector3 } | null {
		this.group.updateMatrixWorld(true);
		// opaque layers win over translucent ones; nearest within the same kind
		let best: { layer: number; face: number; obj: THREE.Object3D; point: THREE.Vector3; d: number; opaque: boolean } | null = null;
		this.layers.forEach((l, i) => {
			for (const obj of [l.mesh, ...l.copies.filter((c) => (c as THREE.Mesh).isMesh)]) {
				const h = ray.intersectObject(obj, false)[0];
				if (!h || h.faceIndex == null) continue;
				const opaque = !(l.mesh.material as THREE.ShaderMaterial).transparent;
				if (!best || (opaque && !best.opaque) || (opaque === best.opaque && h.distance < best.d))
					best = { layer: i, face: l.data.tri ? h.faceIndex : Math.floor(h.faceIndex / 2), obj, point: h.point.clone(), d: h.distance, opaque };
			}
		});
		if (!best) return null;
		const b = best as { layer: number; face: number; obj: THREE.Object3D; point: THREE.Vector3 };
		const toData = new THREE.Matrix4().copy(b.obj.matrixWorld).invert();
		const toPkg = new THREE.Matrix4().copy(this.group.matrixWorld).invert();
		return { layer: b.layer, face: b.face, p: b.point.clone().applyMatrix4(toData), at: b.point.clone().applyMatrix4(toPkg) };
	}

	/** Bilinear value at package point p (mm) on face f of layer i (faces are axis-aligned rectangles). */
	valueAt(i: number, f: number, p: THREE.Vector3): number {
		const d = this.layers[i].data;
		if (d.tri) return d.val[3 * f];
		const P = (q: number) => new THREE.Vector3(d.pos[(f * 4 + q) * 3], d.pos[(f * 4 + q) * 3 + 1], d.pos[(f * 4 + q) * 3 + 2]);
		const a = P(0), b = P(1), c = P(2), e = P(3);
		const ab = b.clone().sub(a), ad = e.clone().sub(a);
		const u = ab.lengthSq() > 0 ? Math.min(1, Math.max(0, p.clone().sub(a).dot(ab) / ab.lengthSq())) : 0;
		const v = ad.lengthSq() > 0 ? Math.min(1, Math.max(0, p.clone().sub(a).dot(ad) / ad.lengthSq())) : 0;
		void c;
		const V = (q: number) => d.val[f * 4 + q];
		return (1 - u) * (1 - v) * V(0) + u * (1 - v) * V(1) + u * v * V(2) + (1 - u) * v * V(3);
	}

	dispose() {
		this.clear();
		this.arrows.dispose();
		this.lutTex.dispose();
		this.lineMat.dispose();
	}
}
