"""Build map label and road files for the explore map from Natural Earth (public domain).

Usage:
  uv run python scripts/build_map_labels.py COUNTRIES.geojson PLACES.geojson ROADS.geojson
Inputs (not vendored; https://github.com/nvkelso/natural-earth-vector/tree/master/geojson):
  ne_110m_admin_0_countries.geojson, ne_10m_populated_places_simple.geojson, ne_10m_roads.geojson
Outputs:
  app/static/geo/labels.json: {"countries": [[name, lon, lat, min_label]], "places": [[name, lon, lat, min_zoom]]}
  app/static/geo/roads_major.geojson: major roads only (Major Highway, Beltway, Bypass, or expressway),
    coordinates rounded to 3 decimals, property z = Natural Earth min_zoom.
  app/static/geo/roads_minor_a.geojson, roads_minor_b.geojson: all other roads (Secondary Highway, Road,
    Unknown, Track; ferries excluded) split at Natural Earth min_zoom 6 (a: <= 6, b: > 6) so the map can load
    each tier only when zoomed in that far.
Natural Earth zoom levels refer to 256 px tiles; the map uses 512 px tiles, so map zoom z ~ NE zoom z + 1.
"""

import json
import sys
from pathlib import Path
from typing import Any

OUT = Path("app/static/geo")
MAJOR = {"Major Highway", "Beltway", "Bypass"}


def rnd(c: Any) -> Any:
    if isinstance(c[0], (int, float)):
        return [round(c[0], 3), round(c[1], 3)]
    return [rnd(x) for x in c]


def main() -> int:
    countries = json.loads(Path(sys.argv[1]).read_text())["features"]
    places = json.loads(Path(sys.argv[2]).read_text())["features"]
    roads = json.loads(Path(sys.argv[3]).read_text())["features"]
    labels = {
        "countries": sorted(
            [p["NAME"], round(p["LABEL_X"], 3), round(p["LABEL_Y"], 3), p["MIN_LABEL"]]
            for p in (f["properties"] for f in countries)
        ),
        "places": sorted(
            ([p["name"], round(p["longitude"], 3), round(p["latitude"], 3), p["min_zoom"]] for p in (f["properties"] for f in places)),
            key=lambda r: (r[3], r[0]),
        ),
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "labels.json").write_text(json.dumps(labels, ensure_ascii=False, separators=(",", ":")))
    keep = [
        {"type": "Feature", "properties": {"z": f["properties"]["min_zoom"]}, "geometry": {"type": f["geometry"]["type"], "coordinates": rnd(f["geometry"]["coordinates"])}}
        for f in roads
        if f.get("geometry") and (f["properties"].get("type") in MAJOR or f["properties"].get("expressway") == 1)
    ]
    (OUT / "roads_major.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": keep}, separators=(",", ":")))
    minor = [
        f
        for f in roads
        if f.get("geometry")
        and not (f["properties"].get("type") in MAJOR or f["properties"].get("expressway") == 1)
        and "Ferry" not in (f["properties"].get("type") or "")
    ]
    for name, sel in (("roads_minor_a.geojson", lambda z: z <= 6), ("roads_minor_b.geojson", lambda z: z > 6)):
        fs = [
            {"type": "Feature", "properties": {}, "geometry": {"type": f["geometry"]["type"], "coordinates": rnd(f["geometry"]["coordinates"])}}
            for f in minor
            if sel(f["properties"]["min_zoom"])
        ]
        (OUT / name).write_text(json.dumps({"type": "FeatureCollection", "features": fs}, separators=(",", ":")))
        print(name, len(fs), "segments")
    print(f"countries {len(labels['countries'])}, places {len(labels['places'])}, major road segments {len(keep)}")
    for f in ("labels.json", "roads_major.geojson", "roads_minor_a.geojson", "roads_minor_b.geojson"):
        print(f, (OUT / f).stat().st_size // 1024, "KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
