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
Refinement rules (DevLog-006, after the 2026-10-20 site review): locality suffixes (City, -si, -shi, -ken) are
stripped for the lookup only; a county/state hit for a city locality is rejected (US: structured city/state retry);
optional locality_query (disambiguation of the printed locality) and locality_level=region (printed prefecture /
state / province -> precision region, 300 km tolerance); an empty locality without overrides is unresolved; an
override hit is accepted only if its OSM label names the queried facility; precision_override, label_override and
override_note are applied after geocoding.
"""

import argparse
import re
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


GENERIC = {"university", "institute", "research", "center", "centre", "company", "corporation", "campus", "technology",
           "laboratory", "laboratories", "inc", "ltd", "co", "the", "of", "and", "national", "science"}
BAD_SETTLEMENT = {"county", "state", "province", "region", "state_district", "country"}
REGION_KM = 300.0


def label_matches(query: str, label: str) -> bool:
    """Accept an override hit only if its OSM label names the queried facility (review rule, DevLog-006)."""
    head = query.split(",")[0].strip()
    if any(ord(ch) > 127 for ch in head):
        toks = [t for t in re.split(r"[\s\u3000]+", head) if t]
        return any(t in label for t in toks)
    toks = [t for t in re.findall(r"[a-z0-9]+", head.lower()) if len(t) >= 3]
    key = [t for t in toks if t not in GENERIC] or toks
    return any(t in label.lower() for t in key)


def strip_suffix(locality: str) -> str:
    """'Kaohsiung City' -> 'Kaohsiung', 'Seoul-si' -> 'Seoul', 'Hyogo-ken' -> 'Hyogo' (query only; data keeps print)."""
    parts = [re.sub(r"(\s+City|-si|-shi|-ken)$", "", x.strip(), flags=re.I) for x in locality.split(",")]
    return ", ".join(parts)


def locate(locality: str, country: str, level: str, dry: bool) -> tuple[tuple[float, float] | None, str]:
    """Centre of the printed locality: (point, 'city' | 'region').

    A county/state hit for a city-type locality is not used as a city; the lookup retries as city, US structured
    city/state, then free text. If only a county/state-level match exists (printed "Hsinchu County", province-level
    municipalities such as Shanghai), it is kept as the locality at precision region (300 km tolerance).
    """
    q = city_query(strip_suffix(locality), country)
    cc = ccodes(country)
    pt = lambda r: (float(r[0]["lat"]), float(r[0]["lon"]))  # noqa: E731
    if level == "region":
        q = ", ".join(dict.fromkeys(x.strip() for x in q.split(",") if x.strip()))  # "Oregon, Oregon" -> "Oregon"
        r = nominatim(q, dry, countrycodes=cc, featureType="state")
        return (pt(r), "region") if r else (None, "region")
    held = None
    tries = [lambda: nominatim(q, dry, countrycodes=cc, featureType="settlement"),
             lambda: nominatim(q, dry, countrycodes=cc, featureType="city")]
    if country == "US" and "," in q:
        city, state = [x.strip() for x in q.split(",", 1)]
        tries.append(lambda: get("https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
            {"city": city, "state": state, "countrycodes": "us", "format": "jsonv2", "limit": "1"}), dry))
    tries.append(lambda: nominatim(q, dry, countrycodes=cc))
    for t in tries:
        r = t()
        if not r:
            continue
        if r[0].get("addresstype") in BAD_SETTLEMENT:
            held = held or r
            continue
        return pt(r), "city"
    return (pt(held), "region") if held else (None, "city")


JP_PREFECTURES = {
    "hokkaido", "aomori", "iwate", "miyagi", "akita", "yamagata", "fukushima", "ibaraki", "tochigi", "gunma", "saitama",
    "chiba", "kanagawa", "niigata", "toyama", "ishikawa", "fukui", "yamanashi", "nagano", "gifu", "shizuoka", "aichi",
    "mie", "shiga", "hyogo", "nara", "wakayama", "tottori", "shimane", "okayama", "hiroshima", "yamaguchi", "tokushima",
    "kagawa", "ehime", "kochi", "saga", "nagasaki", "kumamoto", "oita", "miyazaki", "kagoshima", "okinawa",
}  # prefectures whose name is not also a major printed city (Tokyo, Osaka, Kyoto, Fukuoka, ... excluded)


def is_region_only(locality: str, country: str) -> bool:
    """Printed locality is only a state / prefecture ("Arizona", "NY", "Oregon, OR", "Kanagawa", "Hyogo-ken")."""
    parts = [strip_suffix(x).strip().lower() for x in locality.split(",") if x.strip()]
    if not parts:
        return False
    if country == "US":
        states = ({k.lower() for k in US_STATES} | {v.lower() for v in US_STATES.values()}) - {"dc", "district of columbia"}
        return all(x in states for x in parts)
    if country == "JP":
        return all(x in JP_PREFECTURES for x in parts)
    return False


def geocode(org: str, locality: str, country: str, dry: bool, wd_q: str = "", nm_q: str = "",
            loc_q: str = "", level: str = "") -> dict[str, Any]:
    if not level and not loc_q and is_region_only(locality, country):
        level = "region"
    unresolved = {"lat": "", "lon": "", "precision": "unresolved", "source": "none", "source_ref": "", "source_label": ""}
    q_loc = loc_q or locality
    if not q_loc and not (wd_q or nm_q):
        return {**unresolved, "notes": "no locality printed"}
    city, kind = locate(q_loc, country, level, dry) if q_loc else (None, "city")
    if kind == "region" and city and not (wd_q or nm_q):
        # printed region only: no facility search inside it (printed-data rule, affiliations audit 2026-10-20 D2)
        return {"lat": round(city[0], 5), "lon": round(city[1], 5), "precision": "region", "source": "nominatim",
                "source_ref": "", "source_label": f"region centre: {q_loc}", "notes": "printed region only"}
    max_km = REGION_KM if kind == "region" else MAX_KM
    # an explicit Nominatim override without a Wikidata override skips the name-based Wikidata search
    for c in ([] if (nm_q and not wd_q) else wikidata_site(wd_q or org, country, dry, city)):
        d = km(city, (c["lat"], c["lon"])) if city else None
        if d is not None and d <= max_km:
            return {
                "lat": round(c["lat"], 5), "lon": round(c["lon"], 5), "precision": "campus", "source": "wikidata",
                "source_ref": c["qid"], "source_label": f"{c['label']} ({c['desc']})"[:160],
                "notes": f"{d:.1f} km from {kind} centre",
            }
    r = nominatim(nm_q or ", ".join(x for x in (org, strip_suffix(q_loc)) if x), dry, countrycodes=ccodes(country))
    if r and nm_q and not label_matches(nm_q, r[0].get("display_name", "")):
        r = None
    if r:
        p = (float(r[0]["lat"]), float(r[0]["lon"]))
        d = km(city, p) if city else None
        tol = max(MAX_KM_OVERRIDE if nm_q else MAX_KM, max_km)
        if d is not None and d <= tol:
            return {
                "lat": round(p[0], 5), "lon": round(p[1], 5), "precision": precision_of(r[0]),
                "source": "nominatim", "source_ref": f"osm:{r[0].get('osm_type')}/{r[0].get('osm_id')}",
                "source_label": r[0].get("display_name", "")[:160],
                "notes": f"{d:.1f} km from {kind} centre",
            }
    if city:
        return {
            "lat": round(city[0], 5), "lon": round(city[1], 5), "precision": kind, "source": "nominatim",
            "source_ref": "", "source_label": f"{kind} centre: {q_loc}",
            "notes": f"institution not resolved; printed {kind} centre",
        }
    return {**unresolved, "notes": "unresolved"}


def site_id(org: str, locality: str) -> str:
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
            r = geocode(s["org_name"], s["locality"], s["country"], a.dry_run, s.get("wikidata_search", "") or "",
                        s.get("nominatim_query", "") or "", s.get("locality_query", "") or "", s.get("locality_level", "") or "")
            if s.get("precision_override"):
                r["precision"] = s["precision_override"]
            if s.get("label_override"):
                r["source_label"] = s["label_override"]
            if s.get("override_note"):
                r["notes"] = "; ".join(x for x in (r["notes"], s["override_note"]) if x)
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
