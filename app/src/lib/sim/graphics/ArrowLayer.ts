// Arrow plot layer (R7 3.4 Arrow Volume, U4): one InstancedMesh of a unit arrow (shaft + cone along +Y), per instance
// position, direction, length and color (|v| through the colormap LUT). Lives in an untransformed group: positions
// and directions are mapped to the viewer world here (X = x, Y = z kz, Z = -y; direction mapped the same way, so an
// arrow follows the exaggerated geometry while its shape and length stay undistorted), once per display transform
// (mirrored copies of a symmetry crop). Length: proportional to |v| (max arrow = `maxLen` mm) or normalized.
import * as THREE from 'three';
import { colormapLut, type ColormapName } from '../colormap';

export interface ArrowData {
	pos: Float32Array; // mm, package frame
	vec: Float32Array; // SI
	mag: Float32Array;
	n: number;
}

function unitArrow(): THREE.BufferGeometry {
	const shaft = new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8).translate(0, 0.35, 0);
	const head = new THREE.ConeGeometry(0.16, 0.3, 12).translate(0, 0.85, 0);
	const g = new THREE.BufferGeometry();
	const merge = (geos: THREE.BufferGeometry[]) => {
		const pos: number[] = [], nor: number[] = [], idx: number[] = [];
		let off = 0;
		for (const s of geos) {
			const ni = s.toNonIndexed();
			const p = ni.getAttribute('position'), n = ni.getAttribute('normal');
			for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); idx.push(off + i); }
			off += p.count;
		}
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
		g.setIndex(idx);
	};
	merge([shaft, head]);
	shaft.dispose();
	head.dispose();
	return g;
}

export class ArrowLayer {
	private geo = unitArrow();
	private mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
	private inst: THREE.InstancedMesh | null = null;

	constructor(private parent: THREE.Object3D) {}

	clear() {
		if (this.inst) {
			this.parent.remove(this.inst);
			this.inst.dispose();
			this.inst = null;
		}
	}

	set(d: ArrowData | null, o: { maxLen: number; normalized: boolean; table: ColormapName; reverse: boolean; log: boolean; kz: number; transforms: [number, number][] }) {
		this.clear();
		if (!d || !d.n) return;
		let mmax = 0, mmin = Infinity;
		for (let i = 0; i < d.n; i++) if (Number.isFinite(d.mag[i])) { mmax = Math.max(mmax, d.mag[i]); if (d.mag[i] > 0) mmin = Math.min(mmin, d.mag[i]); }
		if (!(mmax > 0)) return;
		const lut = colormapLut(o.table, o.reverse);
		const tr = o.transforms.length ? o.transforms : [[1, 1] as [number, number]];
		const inst = new THREE.InstancedMesh(this.geo, this.mat, d.n * tr.length);
		const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
		let k = 0;
		for (const [sx, sy] of tr)
			for (let i = 0; i < d.n; i++) {
				const mg = d.mag[i];
				if (!(mg > 0) || !Number.isFinite(mg)) continue;
				dir.set(sx * d.vec[3 * i], o.kz * d.vec[3 * i + 2], -sy * d.vec[3 * i + 1]).normalize();
				q.setFromUnitVectors(up, dir);
				const len = o.normalized ? o.maxLen : (o.maxLen * mg) / mmax;
				s.set(len, len, len);
				p.set(sx * d.pos[3 * i], o.kz * d.pos[3 * i + 2], -sy * d.pos[3 * i + 1]);
				m4.compose(p, q, s);
				inst.setMatrixAt(k, m4);
				const t = o.log && mmin < mmax ? (Math.log(mg) - Math.log(mmin)) / (Math.log(mmax) - Math.log(mmin)) : mg / mmax;
				const li = Math.max(0, Math.min(255, Math.round(t * 255)));
				inst.setColorAt(k, c.setRGB(lut[4 * li] / 255, lut[4 * li + 1] / 255, lut[4 * li + 2] / 255, THREE.SRGBColorSpace));
				k++;
			}
		inst.count = k;
		inst.instanceMatrix.needsUpdate = true;
		if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
		inst.renderOrder = 4;
		this.parent.add(inst);
		this.inst = inst;
	}

	dispose() {
		this.clear();
		this.geo.dispose();
		this.mat.dispose();
	}
}
