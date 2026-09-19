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

# ROI basis must be locked before any rule trusts `roi` (May-2026: ROI now
# includes affiliate commission + coupons + platform fees).
ROI_BASIS = "gross_pending_lock"  # flip to net|gross only by explicit decision.


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


def tick(campaign_id="demo-shop:LIVE", window="30m"):
    now = myt_now()
    if in_quiet_hours(now):
        print("quiet hours 02:00-06:00 MYT: pull-action skipped")
        return None
    slot = closed_slot(now)
    # P0 stub values: real GET wiring comes with sandbox keys. Shape matches 003_gmv.sql.
    row = {
        "campaign_id": campaign_id,
        "ts": slot.isoformat(),
        "window": window,
        "spend": None,
        "gmv": None,
        "roi": None,
        "roi_basis": ROI_BASIS,
        "collected_at": now.isoformat(),
        "note": "P0 stub — wire GET gmv_max/report/get with sandbox keys",
    }
    os.makedirs(CACHE_DIR, exist_ok=True)
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
