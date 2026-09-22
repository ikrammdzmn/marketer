"""Manual LIVE per-campaign view — stdlib only, 127.0.0.1 mindset.

UNLAGGED viewing only: report end_date = today (no T-2h shift). The 2h
closed-window rule stays in force for the scheduled collector and any
future auto action — this view is for eyes only, noted for later revert.
NEVER POSTs (read-only GETs). Secrets never print (lengths only).

Usage:
  python gmvmax-auto/live_view.py        # writes cache/live.json
Then open the dashboard Live section (serves cache, works offline).
"""
import datetime
import json
import os
import urllib.parse
import urllib.request

from collector import FEE_RATE, ROI_BASIS, load_secret

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(HERE, "cache")
LIVE_FILE = os.path.join(CACHE_DIR, "live.json")

MYT = datetime.timezone(datetime.timedelta(hours=8))
BASE = "https://business-api.tiktok.com/open_api/v1.3"


def get(path, params):
    token = load_secret("TIKTOK_PROD_ACCESS_TOKEN")
    url = BASE + path + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Access-Token": token})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def seeds():
    """Known GMV Max campaign IDs, grouped PRODUCT/LIVE (API list endpoints
    don't return GMV campaigns — verified 21 Sep). Accepts grouped
    {"PRODUCT": {...}, "LIVE": {...}} or legacy flat {id: label}.
    IDs came from the owner's bulk export; names are local labels."""
    try:
        with open(os.path.join(HERE, ".local_secrets.json"), encoding="utf-8") as f:
            m = json.load(f).get("TIKTOK_GMV_CAMPAIGNS") or {}
        if any(isinstance(v, dict) for v in m.values()):
            flat = {}
            for grp in ("LIVE", "PRODUCT"):
                flat.update(m.get(grp) or {})
            for k, v in m.items():
                if not isinstance(v, dict):
                    flat[k] = v
            return flat
        return m
    except (OSError, ValueError):
        return {}


def advertisers():
    """All authorized ad accounts (local map, else single stored ID)."""
    try:
        with open(os.path.join(HERE, ".local_secrets.json"), encoding="utf-8") as f:
            sec = json.load(f)
        m = sec.get("TIKTOK_ADVERTISERS") or {}
        if m:
            return list(m.items())
        return [(sec.get("TIKTOK_PROD_ADVERTISER_ID", ""), "")]
    except (OSError, ValueError):
        return [(load_secret("TIKTOK_PROD_ADVERTISER_ID"), "")]


def pull_one(adv, aname, c, store, today, start):
    cid = str(c.get("campaign_id") or c.get("id") or "")
    name = c.get("campaign_name") or c.get("name") or cid
    entry = {"advertiser_id": adv, "advertiser": aname, "id": cid,
             "name": name, "status": c.get("status"), "kind": "UNKNOWN",
             "budget": None, "roi_target": None, "error": None}
    try:
        info = get("/campaign/gmv_max/info/",
                   {"advertiser_id": adv, "campaign_id": cid})
        d = (info.get("data") or {}) if info.get("code") == 0 else {}
        if info.get("code") != 0:
            entry["error"] = "info %s" % info.get("code")
        entry["budget"] = d.get("budget")
        entry["roi_target"] = d.get("roas_bid")
        entry["kind"] = str(d.get("product_specific_type")
                            or d.get("shopping_ads_type")
                            or "GMV").upper()
    except Exception as e:
        entry["error"] = "info failed: %s" % str(e)[:80]
    try:
        rep = get("/gmv_max/report/get/", {
            "advertiser_id": adv,
            "store_ids": json.dumps([store]),
            "dimensions": json.dumps(["advertiser_id", "stat_time_day"]),
            "metrics": json.dumps(["cost", "orders", "gross_revenue", "roi"]),
            "filtering": json.dumps({"campaign_ids": [cid]}),
            "start_date": start, "end_date": today.isoformat()})
        tot_c = tot_g = tot_o = 0.0
        t_c = t_g = t_o = 0.0
        if rep.get("code") == 0:
            for r in ((rep.get("data") or {}).get("list") or []):
                m = r.get("metrics", {}) or {}
                day = str((r.get("dimensions", {}) or {}).get("stat_time_day", ""))[:10]
                cc = float(m.get("cost") or 0)
                gg = float(m.get("gross_revenue") or 0)
                oo = float(m.get("orders") or 0)
                tot_c += cc
                tot_g += gg
                tot_o += oo
                if day == today.isoformat():
                    t_c += cc
                    t_g += gg
                    t_o += oo
        else:
            entry["error"] = (entry["error"] or "") + " report %s" % rep.get("code")
        net = tot_g * (1 - FEE_RATE)
        entry["spend_7d"] = round(tot_c, 2)
        entry["gross_7d"] = round(tot_g, 2)
        entry["net_7d"] = round(net, 2)
        entry["net_roi_7d"] = round(net / tot_c, 2) if tot_c else 0.0
        entry["orders_7d"] = tot_o
        tnet = t_g * (1 - FEE_RATE)
        entry["today"] = {"spend": round(t_c, 2),
                          "net": round(tnet, 2),
                          "roi": round(tnet / t_c, 2) if t_c else 0.0,
                          "orders": t_o}
    except Exception as e:
        entry["error"] = ((entry["error"] or "") + " report failed: %s"
                          % str(e)[:80]).strip()
    if "LIVE" in entry["kind"]:
        try:
            sl = get("/campaign/gmv_max/session/list/",
                     {"advertiser_id": adv, "campaign_id": cid,
                      "page_size": 20})
            sdata = (sl.get("data") or {}) if sl.get("code") == 0 else {}
            entry["sessions"] = len(sdata.get("session_list")
                                    or sdata.get("list") or [])
        except Exception as e:
            entry["sessions_error"] = str(e)[:80]
    return entry


def main():
    store = load_secret("TIKTOK_STORE_ID")
    advs = [(a, n) for a, n in advertisers() if a]
    if not store or not advs or not load_secret("TIKTOK_PROD_ACCESS_TOKEN"):
        print("missing prod keys (ADVERTISERS / STORE_ID / ACCESS_TOKEN)")
        return
    today = datetime.datetime.now(tz=MYT).date()
    start = (today - datetime.timedelta(days=6)).isoformat()

    out = []
    for cid, label in seeds().items():
        hit = None
        for adv, aname in advs:
            entry = pull_one(adv, aname,
                             {"campaign_id": cid, "campaign_name": label},
                             store, today, start)
            if not entry.get("error"):
                hit = entry
                break
            if hit is None:
                hit = entry
        out.append(hit)
        t = hit.get("today", {})
        print("%s | %s | %s | 7d spend=%s net=%s roi=%s ord=%s | today spend=%s net=%s roi=%s%s" % (
            hit.get("advertiser") or hit.get("advertiser_id"), hit["kind"],
            (hit["name"] or "")[:40],
            hit.get("spend_7d"), hit.get("net_7d"),
            hit.get("net_roi_7d"), hit.get("orders_7d"),
            t.get("spend"), t.get("net"), t.get("roi"),
            (" [%s]" % hit["error"] if hit.get("error") else "")))

    os.makedirs(CACHE_DIR, exist_ok=True)
    out.sort(key=lambda c: (0 if "LIVE" in str(c.get("kind", "")) else 1,
                            c.get("name") or ""))
    with open(LIVE_FILE, "w", encoding="utf-8", newline="\n") as f:
        json.dump({"fetched_at": datetime.datetime.now(tz=MYT).isoformat(),
                   "mode": "UNLAGGED-view-only (2h rule suspended for viewing; "
                           "auto actions stay closed-window)",
                   "window": "%s to %s" % (start, today.isoformat()),
                   "roi_basis": ROI_BASIS, "fee_rate": FEE_RATE,
                   "campaigns": out}, f, ensure_ascii=False, indent=2)
    print("wrote cache/live.json (%d campaigns)" % len(out))


if __name__ == "__main__":
    main()
