"""P0 read-only collector — stdlib only, 127.0.0.1 mindset.

Does (P0):
- Compute closed-window slot (T-2h, 30m grid, Asia/Kuala_Lumpur).
- Skip 02:00-06:00 MYT pull-actions (customizable later).
- Append a stub snapshot row to cache/snapshots.jsonl (dual-write: file first,
  Neon insert attempted only if a postgres driver + NEON_URL_* is available;
  otherwise logs and continues so dashboard works offline).
- NEVER calls POST campaign/gmv_max/update in P0 (guarded by ALLOW_WRITES=0).

Real GMV Max GET wiring (campaign/gmv_max/info, gmv_max/report/get) lands
once sandbox read-only keys exist (see APP_CHECKLIST.md).

Usage:
  python gmvmax-auto/collector.py            # one closed-window tick
  python gmvmax-auto/collector.py --loop     # every 30m (P1 heartbeat lives here later)
"""
import argparse
import datetime
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(HERE, "cache")
CACHE_FILE = os.path.join(CACHE_DIR, "snapshots.jsonl")

MYT = datetime.timezone(datetime.timedelta(hours=8))
ALLOW_WRITES = 0  # P0 hard lock: never POST budget updates.

# ROI basis LOCKED 21 Sep (owner decision): net. TikTok's gross revenue bundles
# affiliate commission + coupons + platform fees, so rules must use
# net_gmv = gross_revenue * (1 - FEE_RATE). FEE_RATE is a single constant
# (customizable later); every snapshot records it + gross figures in raw.
ROI_BASIS = "net"
FEE_RATE = 0.25


def myt_now():
    return datetime.datetime.now(tz=MYT)


def closed_slot(now=None):
    """Return closed 30m slot at T-2h (never the newest slot; lag 15m-2h)."""
    now = now or myt_now()
    target = now - datetime.timedelta(hours=2)
    minute = 0 if target.minute < 30 else 30
    return target.replace(minute=minute, second=0, microsecond=0)


def in_quiet_hours(dt):
    return 2 <= dt.hour < 6


def load_secret(key, default=""):
    """Env first, then gitignored .local_secrets.json. Never print values."""
    v = os.environ.get(key, "")
    if v:
        return v
    try:
        with open(os.path.join(HERE, ".local_secrets.json"), encoding="utf-8") as f:
            return json.load(f).get(key, default) or default
    except (OSError, ValueError):
        return default


def neon_write_stub(row):
    """Best-effort Neon insert. Stdlib has no postgres driver, so P0 file-writes
    first and only attempts DB if a driver is importable. Returns True if written."""
    url = os.environ.get("NEON_URL_DEV", "")
    if not url:
        # Also check gitignored .local_secrets.json (never commit it).
        try:
            with open(os.path.join(HERE, ".local_secrets.json"), encoding="utf-8") as f:
                url = json.load(f).get("NEON_URL_DEV", "")
        except (OSError, ValueError):
            url = ""
    if not url:
        return False
    try:
        import psycopg  # optional; not required for P0 file-first flow
    except ImportError:
        try:
            import psycopg2 as psycopg  # type: ignore
        except ImportError:
            return False
    try:
        con = psycopg.connect(url, connect_timeout=5)
        try:
            with con.cursor() as cur:
                # DB column is `win` (reserved `window` renamed in 004);
                # file JSON key stays `window`, mapped here.
                cur.execute(
                    "INSERT INTO gmv.gmv_snapshots "
                    "(campaign_id, ts, win, spend, gmv, roi, roi_basis, raw) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                    (row["campaign_id"], row["ts"], row["window"], row.get("spend"),
                     row.get("gmv"), row.get("roi"), row["roi_basis"], json.dumps(row)),
                )
            con.commit()
        finally:
            con.close()
        return True
    except Exception as e:
        print("neon write skipped: %s" % e, file=sys.stderr)
        return False


def fetch_report(base, token, adv, store, tag, slot):
    """Read-only GET gmv_max/report/get for the closed slot date.

    Params per live spec (21 Sep): dimensions [advertiser_id, stat_time_day],
    metrics [cost, orders, gross_revenue, roi]; store_ids required (1 store).
    Day rows for the slot date are summed (spend/cost, gmv, orders;
    roi = gmv/spend). Any missing keys / HTTP error →
    (None, None, None, reason) so tick() falls back to file-first stub.
    NEVER POSTs.
    """
    assert ALLOW_WRITES == 0, "P0 must never enable writes"
    if not token or not adv or not store:
        return None, None, None, ""
    import urllib.parse
    import urllib.request
    day = slot.date().isoformat()
    params = {
        "advertiser_id": adv,
        "store_ids": json.dumps([store]),
        "dimensions": json.dumps(["advertiser_id", "stat_time_day"]),
        "metrics": json.dumps(["cost", "orders", "gross_revenue", "roi"]),
        "start_date": day,
        "end_date": day,
    }
    url = base.rstrip("/") + "/gmv_max/report/get/?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Access-Token": token})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.load(resp)
    except Exception as e:
        return None, None, None, "%s GET failed: %s (stub kept)" % (tag, e)
    if isinstance(body, dict) and body.get("code", 0) != 0:
        return None, None, None, "%s API %s: %s (stub kept)" % (
            tag, body.get("code"), str(body.get("message"))[:120])
    try:
        data = body.get("data", {}) or {}
        spend = gmv = orders = 0.0
        hit = False
        for r in data.get("list", []) or []:
            d = r.get("dimensions", {}) or {}
            if str(d.get("stat_time_day", ""))[:10] != day:
                continue
            m = r.get("metrics", {}) or {}
            spend += float(m.get("cost") or 0)
            gmv += float(m.get("gross_revenue") or 0)
            orders += float(m.get("orders") or 0)
            hit = True
        roi = (gmv / spend) if spend > 0 else 0.0
        return spend, gmv, roi, "%s live %s%s" % (
            tag, day, "" if hit else " (no rows)")
    except Exception as e:
        return None, None, None, "%s parse failed: %s (stub kept)" % (tag, e)


def fetch_prod_report(slot):
    """Prod read-only GET (needs PROD_ACCESS_TOKEN/ADVERTISER_ID + STORE_ID)."""
    return fetch_report(
        "https://business-api.tiktok.com/open_api/v1.3",
        load_secret("TIKTOK_PROD_ACCESS_TOKEN"),
        load_secret("TIKTOK_PROD_ADVERTISER_ID"),
        load_secret("TIKTOK_STORE_ID"),
        "prod", slot)


def tick(campaign_id="demo-shop:LIVE", window="30m"):
    now = myt_now()
    if in_quiet_hours(now):
        print("quiet hours 02:00-06:00 MYT: pull-action skipped")
        return None
    slot = closed_slot(now)
    # Prod live, else file-first stub (offline OK). Sandbox skipped: it has
    # no GMV Max endpoints (plain 404, verified 21 Sep).
    spend, gmv, roi, note = fetch_prod_report(slot)
    if not note:
        note = "P0 stub — no prod data"
    # Net lock: gmv/roi stored NET (fee deducted); gross kept for audit.
    gross = gmv or 0.0
    net_gmv = gross * (1 - FEE_RATE)
    net_roi = (net_gmv / spend) if spend else 0.0
    row = {
        "campaign_id": campaign_id,
        "ts": slot.isoformat(),
        "window": window,
        "spend": spend,
        "gmv": net_gmv,
        "roi": net_roi,
        "roi_basis": ROI_BASIS,
        "fee_rate": FEE_RATE,
        "gross_gmv": gross,
        "collected_at": now.isoformat(),
        "note": note,
    }
    os.makedirs(CACHE_DIR, exist_ok=True)
    # Skip re-appending the same closed slot (scheduler ticks faster than slots).
    try:
        with open(CACHE_FILE, encoding="utf-8") as f:
            last = None
            for line in f:
                line = line.strip()
                if line:
                    last = json.loads(line)
        if (last and last.get("campaign_id") == campaign_id
                and last.get("ts") == slot.isoformat()
                and last.get("window") == window):
            print("slot=%s already stored, skipped" % slot.isoformat())
            return last
    except (OSError, ValueError):
        pass
    with open(CACHE_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(row) + "\n")
    db = neon_write_stub(row)
    print("tick slot=%s window=%s file=1 db=%d" % (row["ts"], window, db))
    return row


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--campaign", default="demo-shop:LIVE")
    ap.add_argument("--window", default="30m", choices=["30m", "1h"])
    ap.add_argument("--loop", action="store_true")
    args = ap.parse_args()
    assert ALLOW_WRITES == 0, "P0 must never enable writes"
    if args.loop:
        import time
        while True:
            tick(args.campaign, args.window)
            time.sleep(30 * 60)
    else:
        tick(args.campaign, args.window)


if __name__ == "__main__":
    main()
