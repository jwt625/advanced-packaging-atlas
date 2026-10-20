"""Geocode organization sites (org_name x locality) for the institutions map (DevLog-006).

Ported from eo-modulator-atlas scripts/geocode_sites.py (DevLog-018 there, incl. its site-review fixes); changes:
site_id column, source "none" for unresolved sites, a timestamped log in logs/, project User-Agent. The response cache
(data/_staging/geo_cache/, git-ignored) was seeded with a copy of the eo-modulator-atlas cache, so shared queries are
not re-fetched.

Source order (user decision 2026-10-04; refined after the site review of the same day): Wikidata entity coordinate (P625) with country check and a
distance check against the printed locality; fallback OpenStreetMap Nominatim on
"org_name, locality, country"; last resort the locality centre (precision city).

Network etiquette: one request at a time, >= 1.1 s apart, descriptive User-Agent, circuit breaker on
HTTP 403/429/5xx, every raw response cached (JSONL, resumable; cached queries are never re-fetched).

Usage:
  uv run python scripts/geocode_sites.py SITES_CSV OUT_CSV [--limit N] [--dry-run]
SITES_CSV columns: org_name, locality, country (ISO alpha-2); optional wikidata_search and nominatim_query
override the search strings for a refinement pass (e.g. "EPFL" instead of a long official name).
"""

import argparse
import csv
import datetime as dt
import json
import math
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

UA = "advanced-packaging-atlas/0.1 (research dataset geocoding; https://github.com/jwt625/advanced-packaging-atlas)"
CACHE = Path("data/_staging/geo_cache/responses.jsonl")
SPACING_S = 1.1
MAX_KM = 50.0
MAX_KM_OVERRIDE = 100.0  # explicit override queries; printed localities are sometimes prefectures/provinces
_last = 0.0
_cache: dict[str, Any] = {}
# Wikidata records Hong Kong / Macau institutions under China (P17 = CN); OSM Nominatim also needs cn for them.
COUNTRY_ALIASES = {"HK": {"HK", "CN"}, "MO": {"MO", "CN"}}


US_STATES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California", "CO": "Colorado",
    "CT": "Connecticut", "DE": "Delaware", "DC": "District of Columbia", "FL": "Florida", "GA": "Georgia",
    "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts",
    "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri", "MT": "Montana",
    "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico",
    "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota",
    "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}


def city_query(locality: str, country: str) -> str:
    """Printed locality as a settlement query; US state abbreviations expanded (avoids e.g. PA -> Alabama)."""
    parts = [x.strip() for x in locality.split(",")]
    if country == "US" and len(parts) >= 2 and parts[-1].upper() in US_STATES:
        parts[-1] = US_STATES[parts[-1].upper()]
    return ", ".join(parts)


def precision_of(r: dict[str, Any]) -> str:
    at, cat = r.get("addresstype", ""), r.get("category", "")
    if at in ("house", "building") or cat == "building":
        return "building"
    if at == "postcode":
        return "postcode"
    if cat in ("amenity", "office", "landuse", "man_made", "craft", "shop", "leisure", "research", "education"):
        return "campus"
    return "city"


def ccodes(country: str) -> str:
    return ",".join(sorted(c.lower() for c in COUNTRY_ALIASES.get(country, {country})))


class Breaker(Exception):
    pass


def load_cache() -> None:
    if CACHE.exists():
        for line in CACHE.read_text().splitlines():
            r = json.loads(line)
            _cache[r["url"]] = r["body"]


def get(url: str, dry: bool) -> Any:
    global _last
    if url in _cache:
        return _cache[url]
    if dry:
        print(f"  DRY {url}")
        return None
    wait = SPACING_S - (time.monotonic() - _last)
    if wait > 0:
        time.sleep(wait)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        if e.code in (403, 429) or e.code >= 500:
            raise Breaker(f"HTTP {e.code} on {url}") from e
        body = {"_http_error": e.code}
    finally:
        _last = time.monotonic()
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    with CACHE.open("a") as f:
        f.write(json.dumps({"url": url, "fetched": dt.datetime.now(dt.UTC).isoformat(), "body": body}) + "\n")
    _cache[url] = body
    return body


def wd(params: dict[str, str], dry: bool) -> Any:
    return get("https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode({**params, "format": "json"}), dry)


def nominatim(q: str, dry: bool, **extra: str) -> Any:
    p = {"q": q, "format": "jsonv2", "limit": "1", **extra}
    return get("https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(p), dry)


def km(a: tuple[float, float], b: tuple[float, float]) -> float:
    (lat1, lon1), (lat2, lon2) = (map(math.radians, a), map(math.radians, b))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(h))


_country_iso: dict[str, str] = {}


def country_iso2(qid: str, dry: bool) -> str | None:
    if qid not in _country_iso:
        e = wd({"action": "wbgetentities", "ids": qid, "props": "claims"}, dry)
        try:
            _country_iso[qid] = e["entities"][qid]["claims"]["P297"][0]["mainsnak"]["datavalue"]["value"]
        except (KeyError, TypeError, IndexError):
            _country_iso[qid] = ""
    return _country_iso[qid] or None


def wikidata_site(org: str, country: str, dry: bool, near: tuple[float, float] | None = None) -> list[dict[str, Any]]:
    if not org:
        return []
    s = wd({"action": "wbsearchentities", "search": org, "language": "en", "type": "item", "limit": "5"}, dry)
    ids = [x["id"] for x in (s or {}).get("search", [])]
    if not ids:
        return []
    ents = wd({"action": "wbgetentities", "ids": "|".join(ids), "props": "claims|labels|descriptions", "languages": "en"}, dry)
    out = []
    for qid in ids:
        e = ((ents or {}).get("entities") or {}).get(qid) or {}
        cl = e.get("claims") or {}
        coords = [c["mainsnak"]["datavalue"]["value"] for c in cl.get("P625", []) if "datavalue" in c.get("mainsnak", {})]
        if not coords:
            continue
        # several coordinates (campuses): take the one nearest the printed locality
        v = min(coords, key=lambda c: km(near, (c["latitude"], c["longitude"]))) if near else coords[0]
        ctry = None
        try:
            ctry = country_iso2(cl["P17"][0]["mainsnak"]["datavalue"]["value"]["id"], dry)
        except (KeyError, IndexError):
            pass
        out.append(
            {
                "qid": qid,
                "lat": v["latitude"],
                "lon": v["longitude"],
                "country": ctry,
                "label": (e.get("labels") or {}).get("en", {}).get("value", ""),
                "desc": (e.get("descriptions") or {}).get("en", {}).get("value", ""),
            }
        )
    ok = COUNTRY_ALIASES.get(country, {country})
    # items without a country (P17) are kept only when a locality distance check will follow
    return [c for c in out if c["country"] in ok or (c["country"] is None and near is not None)]


def geocode(org: str, locality: str, country: str, dry: bool, wd_q: str = "", nm_q: str = "") -> dict[str, Any]:
    city = None
    if locality:
        r = nominatim(city_query(locality, country), dry, countrycodes=ccodes(country), featureType="settlement")
        if r:
            city = (float(r[0]["lat"]), float(r[0]["lon"]))
    # an explicit Nominatim override without a Wikidata override skips the name-based Wikidata search
    for c in ([] if (nm_q and not wd_q) else wikidata_site(wd_q or org, country, dry, city)):
        d = km(city, (c["lat"], c["lon"])) if city else None
        if d is None or d <= MAX_KM:
            return {
                "lat": round(c["lat"], 5), "lon": round(c["lon"], 5), "precision": "campus", "source": "wikidata",
                "source_ref": c["qid"], "source_label": f"{c['label']} ({c['desc']})"[:160],
                "notes": f"{d:.1f} km from locality centre" if d is not None else "no locality to check",
            }
    r = nominatim(nm_q or ", ".join(x for x in (org, locality) if x), dry, countrycodes=ccodes(country))
    if r:
        p = (float(r[0]["lat"]), float(r[0]["lon"]))
        d = km(city, p) if city else None
        if d is None or d <= (MAX_KM_OVERRIDE if nm_q else MAX_KM):
            return {
                "lat": round(p[0], 5), "lon": round(p[1], 5), "precision": precision_of(r[0]),
                "source": "nominatim", "source_ref": f"osm:{r[0].get('osm_type')}/{r[0].get('osm_id')}",
                "source_label": r[0].get("display_name", "")[:160],
                "notes": f"{d:.1f} km from locality centre" if d is not None else "no locality to check",
            }
    if city:
        return {
            "lat": round(city[0], 5), "lon": round(city[1], 5), "precision": "city", "source": "nominatim",
            "source_ref": "", "source_label": f"locality centre: {locality}", "notes": "institution not resolved; locality centre",
        }
    return {"lat": "", "lon": "", "precision": "unresolved", "source": "none", "source_ref": "", "source_label": "", "notes": "unresolved"}


def site_id(org: str, locality: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]+", "-", f"{org} {locality}".lower()).strip("-")[:80]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("sites")
    ap.add_argument("out")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    load_cache()
    with open(a.sites, newline="") as f:
        sites = list(csv.DictReader(f))
    if a.limit:
        sites = sites[: a.limit]
    cols = ["site_id", "org_name", "locality", "country", "lat", "lon", "precision", "source", "source_ref", "source_label", "verified_on", "notes"]
    Path("logs").mkdir(exist_ok=True)
    logf = open(f"logs/geocode_{dt.datetime.now().strftime('%Y%m%dT%H%M%S')}.log", "w")
    rows = []
    try:
        for i, s in enumerate(sites, 1):
            r = geocode(s["org_name"], s["locality"], s["country"], a.dry_run, s.get("wikidata_search", "") or "", s.get("nominatim_query", "") or "")
            rows.append({"site_id": site_id(s["org_name"], s["locality"]), **{k: s[k] for k in ("org_name", "locality", "country")},
                         **r, "verified_on": dt.date.today().isoformat()})
            line = f"[{i}/{len(sites)}] {s['org_name']} | {s['locality']} -> {r['source']} {r['source_ref']} {r['precision']} {r['notes']}"
            print(line, flush=True)
            print(line, file=logf, flush=True)
    except Breaker as e:
        print(f"STOPPED: {e}", file=sys.stderr)
    if not a.dry_run:
        with open(a.out, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=cols)
            w.writeheader()
            w.writerows(rows)
    print(f"{len(rows)} of {len(sites)} sites written to {a.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
