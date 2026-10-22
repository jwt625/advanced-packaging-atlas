// Lumped ports for the 3D EM block solver (lane L22, DevLog-014 D6).
// Adapted from awslabs/palace at 29ad351f (Apache-2.0): palace/models/lumpedportoperator.cpp (surface impedance
// Z_s = R w / l, Robin term i w / Z_s int E_t . v_t, drive 2 i w / Z_s int E_inc . v, port voltage V = (1/w) int
// E . l dS) and palace/fem/lumpedelement.hpp (uniform rectangular element: direction, length l along it, width w).
// Changes: JavaScript; this engine's units (the curl-curl form is multiplied by mu0, so the Robin coefficient is
// j w mu0 / Z_s); single rectangle per port; terminal V and I (Thevenin source 2 V_inc in series with R, current into
// the block I = (2 V_inc - V) / R) so the Z / S path of the wave ports is reused. License of this file:
// GPL-3.0-or-later; see engine/src/em3d/NOTICE.

import { buildFaces } from './space.mjs';
import { faceMass, FACE_EDGES } from './elements.mjs';
import { triTables, triSurfaceGrads, TRI_QUAD, evalVector } from './hcurl.mjs';

const fail = (m) => {
  throw new Error(`em3d lumped port: ${m}`);
};
const AX = { x: 0, y: 1, z: 2 };

/**
 * Port data: rectangle rect_um {x, y, z} (one zero extent), direction '+x' | '-x' | ... (E direction, in the plane),
 * R_ohm. Returns {name, R, l, w, dir, tris: [{v, e (global DOFs), T}], dofs, a (int phi . l-hat dS per port DOF)}.
 */
export function prepareLumped(mesh, space, spec, ctx) {
  const name = spec.name ?? 'lumped';
  const r = spec.rect_um ?? fail(`${name}: rect_um {x, y, z} required`);
  const m = /^([+-])([xyz])$/.exec(spec.direction ?? '');
  if (!m) fail(`${name}: direction must be +x, -x, +y, -y, +z or -z`);
  const sgn = m[1] === '-' ? -1 : 1,
    dax = AX[m[2]];
  const ext = ['x', 'y', 'z'].map((k) => {
    const v = r[k] ?? fail(`${name}: rect_um.${k} missing`);
    return [Math.min(v[0], v[1]) * 1e-6, Math.max(v[0], v[1]) * 1e-6];
  });
  const span = Math.max(...ext.map((e) => e[1] - e[0]));
  const nax = ext.findIndex((e) => e[1] - e[0] <= 1e-12 * span);
  if (nax < 0 || ext.filter((e) => e[1] - e[0] <= 1e-12 * span).length !== 1) fail(`${name}: rect_um needs exactly one zero extent`);
  if (dax === nax) fail(`${name}: direction ${spec.direction} is normal to the port rectangle`);
  const wax = [0, 1, 2].find((k) => k !== nax && k !== dax);
  const l = ext[dax][1] - ext[dax][0],
    w = ext[wax][1] - ext[wax][0];
  const R = spec.R_ohm ?? 50;
  if (!(R > 0)) fail(`${name}: R_ohm must be > 0`);
  const tol = 1e-9 * span;
  const inside = (n) => {
    for (let k = 0; k < 3; k++) {
      const x = mesh.nodes[3 * n + k];
      if (x < ext[k][0] - tol || x > ext[k][1] + tol) return false;
    }
    return true;
  };
  const F = space.faces ? space : buildFaces(mesh);
  const tris = [];
  let area = 0;
  for (let f = 0; f < F.nFaces; f++) {
    const v = [F.faces[3 * f], F.faces[3 * f + 1], F.faces[3 * f + 2]];
    if (!v.every(inside)) continue;
    // conductor-interior faces carry no field DOFs; skip faces of non-domain tets only (both sides conductor)
    const e = space.order === 1 ? Int32Array.from(FACE_EDGES, ([i, j]) => ctx.edgeOf(v[i], v[j])) : space.faceDofs(v);
    const T = space.order === 1 ? faceMass(mesh.nodes, v).T : ctx.faceT(v);
    const P = v.map((q) => [mesh.nodes[3 * q], mesh.nodes[3 * q + 1], mesh.nodes[3 * q + 2]]);
    const { g, area: A } = triSurfaceGrads(P);
    tris.push({ v, e: Array.from(e), T, g, A });
    area += A;
  }
  if (!tris.length) fail(`${name}: no mesh faces in rect_um (the mesh must conform to the rectangle)`);
  if (Math.abs(area / (l * w) - 1) > 1e-6) fail(`${name}: mesh faces cover ${(area * 1e12).toFixed(3)} um^2 of the ${(l * w * 1e12).toFixed(3)} um^2 rectangle (non-conforming mesh)`);
  const set = new Set();
  for (const t of tris) for (const d of t.e) set.add(d);
  const dofs = Int32Array.from([...set].sort((x, y) => x - y));
  const loc = new Map(Array.from(dofs, (d, k) => [d, k]));
  // a_d = int phi_d . l-hat dS (exact on the 16-point rule for order <= 2)
  const TT = triTables(space.order);
  const a = new Float64Array(dofs.length);
  const vec = new Float64Array(3);
  for (const t of tris) {
    t.r = t.e.map((d) => loc.get(d));
    for (const [lam, wq] of TRI_QUAD)
      for (let i = 0; i < TT.n; i++) {
        evalVector(TT.basis[i], lam, t.g, 3, vec);
        a[t.r[i]] += sgn * vec[dax] * wq * t.A;
      }
  }
  return { name, R, l, w, Zs: (R * w) / l, dir: spec.direction, tris, dofs, a, area };
}
