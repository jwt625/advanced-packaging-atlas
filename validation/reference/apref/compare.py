"""Engine result (sims/SPEC.md section 5) vs reference: R6 section 4.3 comparison metrics and tolerance verdicts.

Usage:
  uv run python -m apref.compare --engine <engine_result.json> --reference <results/X-skfem.json> --spec <rows.yaml>
rows.yaml:
  rows:
    - {engine: derived.Tmax_C.value, reference: results.convergence.q2.T_bottom_C.f_ext, tier: A, qclass: global}
    - {engine: derived.warpage_um.value, reference: 372.7, tier: C, qclass: warpage, unit_scale: 1.0}
    - {engine_field: T_K, offset: -273.15, reference_samples: <samples.json>, tier: B, qclass: field}
Paths are dotted keys into the JSON (list indices allowed). A reference may be a number.

Tolerances (R6 section 4.3, proposed values, assumptions to revise after first runs):
  A global rel < 1e-3; A point_stress rel < 1e-2; B nafems rel < 1e-2; B global (cross-solver) rel < 5e-3;
  B point_stress rel < 2e-2; B field rel-L2 < 5e-3; C warpage |d| <= max(10 um, 10 %); C thermal_rise rel <= 5 %;
  D warpage sign match and |d| <= max(20 um, 25 %); D thermal_rise rel <= 10 %; C/D ratio rel <= 15 %.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
import yaml

TOL = {
    ("A", "global"): {"rel": 1e-3},
    ("A", "point_stress"): {"rel": 1e-2},
    ("B", "nafems"): {"rel": 1e-2},
    ("B", "global"): {"rel": 5e-3},
    ("B", "point_stress"): {"rel": 2e-2},
    ("B", "field"): {"rel_l2": 5e-3},
    ("C", "warpage"): {"abs_um": 10.0, "rel": 0.10, "rule": "max"},
    ("C", "thermal_rise"): {"rel": 0.05},
    ("D", "warpage"): {"abs_um": 20.0, "rel": 0.25, "rule": "max", "sign": True},
    ("D", "thermal_rise"): {"rel": 0.10},
    ("C", "ratio"): {"rel": 0.15},
    ("D", "ratio"): {"rel": 0.15},
}


def get_path(obj, path):
    if isinstance(path, int | float):
        return float(path)
    cur = obj
    for part in str(path).split("."):
        if isinstance(cur, list):
            cur = cur[int(part)]
        else:
            if part not in cur:
                raise KeyError(f"path {path}: missing key {part}")
            cur = cur[part]
    return cur


def compare_scalar(value: float, ref: float, tier: str, qclass: str, tol: dict | None = None) -> dict:
    """Metric and verdict for one scalar (warpage values in um)."""
    t = dict(TOL.get((tier, qclass), {})) if tol is None else tol
    if not t:
        raise KeyError(f"no tolerance for tier {tier} class {qclass}")
    d = value - ref
    rel = d / abs(ref) if ref != 0 else math.inf
    out = {"value": value, "reference": ref, "diff": d, "rel": rel, "tolerance": t}
    if t.get("rule") == "max":
        lim = max(t["abs_um"], t["rel"] * abs(ref))
        ok = abs(d) <= lim
        out["limit"] = lim
        if t.get("sign"):
            out["sign_match"] = bool(np.sign(value) == np.sign(ref))
            ok = ok and out["sign_match"]
    else:
        ok = abs(rel) <= t["rel"]
    out["pass"] = bool(ok)
    return out


def engine_grid(eng: dict):
    g = eng["grid"]
    xs, ys, zs = (np.asarray(g[k], dtype=float) for k in ("xs", "ys", "zs"))
    return xs, ys, zs


def sample_engine(eng: dict, field: str, pts: np.ndarray, comp: int | None = None) -> np.ndarray:
    """Trilinear interpolation of a nodal field on the SPEC rectilinear grid; node n = i + (nx+1) (j + (ny+1) k).
    pts: (3, P) m. comp: component for interleaved vector fields (u_m: 3 per node). Points outside the grid -> nan;
    void cells are not detected here (sample inside material only)."""
    xs, ys, zs = engine_grid(eng)
    f = np.asarray(eng["fields"][field], dtype=float)
    if comp is not None:
        f = f[comp::3]
    nx1, ny1 = xs.size, ys.size
    F = f.reshape(zs.size, ny1, nx1)  # [k, j, i]
    out = np.full(pts.shape[1], np.nan)
    for p in range(pts.shape[1]):
        x, y, z = pts[:, p]
        if not (xs[0] <= x <= xs[-1] and ys[0] <= y <= ys[-1] and zs[0] <= z <= zs[-1]):
            continue
        i = min(np.searchsorted(xs, x, side="right") - 1, xs.size - 2)
        j = min(np.searchsorted(ys, y, side="right") - 1, ys.size - 2)
        k = min(np.searchsorted(zs, z, side="right") - 1, zs.size - 2)
        tx = (x - xs[i]) / (xs[i + 1] - xs[i])
        ty = (y - ys[j]) / (ys[j + 1] - ys[j])
        tz = (z - zs[k]) / (zs[k + 1] - zs[k])
        c = F[k:k + 2, j:j + 2, i:i + 2]
        wz = np.array([1 - tz, tz])[:, None, None]
        wy = np.array([1 - ty, ty])[None, :, None]
        wx = np.array([1 - tx, tx])[None, None, :]
        out[p] = float((c * wz * wy * wx).sum())
    return out


def sampling_points(lo, hi, n=(11, 11, 5)) -> np.ndarray:
    """Tensor sampling grid (3, P) strictly inside the box [lo, hi] (m): cell-centred so no point lies on a part
    boundary plane."""
    ax = [lo[i] + (np.arange(n[i]) + 0.5) * (hi[i] - lo[i]) / n[i] for i in range(3)]
    X, Y, Z = np.meshgrid(*ax, indexing="ij")
    return np.stack([X.ravel(), Y.ravel(), Z.ravel()])


def reference_samples(basis, dofs: np.ndarray, pts: np.ndarray, comp: int | None = None) -> dict:
    """Reference field values at pts from a scikit-fem solution (scalar, or component of an interleaved vector)."""
    from .fem import point_matrices

    V, _, _ = point_matrices(basis, pts)
    vec = dofs if comp is None else dofs[comp::3]
    return {"points_m": pts.tolist(), "values": (V @ vec).tolist()}


def field_rel_l2(a: np.ndarray, b: np.ndarray, offset: float = 0.0) -> float:
    """Relative L2 difference on a common sampling set (nan samples dropped): ||a - b|| / ||b - offset||."""
    ok = np.isfinite(a) & np.isfinite(b)
    return float(np.linalg.norm(a[ok] - b[ok]) / max(np.linalg.norm(b[ok] - offset), 1e-300))


def run(engine: dict, reference: dict, rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        tier, qc = r["tier"], r["qclass"]
        if "engine_field" in r:
            smp = r["reference_samples"]
            if isinstance(smp, str):
                smp = json.loads(Path(smp).read_text())
            pts = np.asarray(smp["points_m"], dtype=float)
            ref = np.asarray(smp["values"], dtype=float)
            val = sample_engine(engine, r["engine_field"], pts, r.get("comp")) + r.get("offset", 0.0)
            e = field_rel_l2(val, ref, r.get("norm_offset", 0.0))
            t = TOL[(tier, qc)]
            out.append({"row": r.get("id", r["engine_field"]), "rel_l2": e, "n": int(np.isfinite(val).sum()),
                        "tolerance": t, "pass": bool(e <= t["rel_l2"])})
            continue
        v = float(get_path(engine, r["engine"])) * r.get("unit_scale", 1.0)
        ref = float(get_path(reference, r["reference"]))
        res = compare_scalar(v, ref, tier, qc, r.get("tolerance"))
        res["row"] = r.get("id", r["engine"])
        out.append(res)
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--engine", required=True)
    ap.add_argument("--reference", required=True)
    ap.add_argument("--spec", required=True)
    a = ap.parse_args(argv)
    eng = json.loads(Path(a.engine).read_text())
    ref = json.loads(Path(a.reference).read_text())
    rows = yaml.safe_load(Path(a.spec).read_text())["rows"]
    res = run(eng, ref, rows)
    for r in res:
        print(json.dumps(r))
    return 0 if all(r["pass"] for r in res) else 1


if __name__ == "__main__":
    raise SystemExit(main())
