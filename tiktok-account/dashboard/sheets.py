"""Google Sheets reader for dashboard -- yesterday Run tick count.

Read-only. Uses the same auth/env as sheet-sync.py:
  - GOOGLE_SHEETS_CRED (service account JSON) via spreadsheet_mcp
  - SHEET_ID env or sync/.sheet_id.json (spreadsheet ID, 44 chars)
"""
import os
import json
import datetime
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SYNC_DIR = os.path.join(os.path.dirname(HERE), "sync")
SHEET_ID_FILE = os.path.join(SYNC_DIR, ".sheet_id.json")
MYT = datetime.timezone(datetime.timedelta(hours=8))

_sheets_svc = None
_sheet_id_cache = {}
_gid_cache = {}


def _load_sheet_id():
    env = os.environ.get("SHEET_ID", "").strip()
    if env:
        return env
    if os.path.exists(SHEET_ID_FILE):
        try:
            with open(SHEET_ID_FILE, encoding="utf-8-sig") as f:
                return (json.load(f).get("spreadsheet_id", "") or "").strip()
        except (OSError, ValueError):
            pass
    return ""


def get_sheets_service():
    """Lazy init: returns googleapiclient.discovery.Resource for Sheets v4."""
    global _sheets_svc
    if _sheets_svc is not None:
        return _sheets_svc
    try:
        from spreadsheet_mcp.auth import get_sheets_service as mcp_get_svc
        _sheets_svc = mcp_get_svc()
        return _sheets_svc
    except Exception as e:
        raise RuntimeError("Sheets auth failed: " + str(e)[:200])


def _execute(req):
    """Execute with basic retry (transient only)."""
    for attempt in range(3):
        try:
            return req.execute()
        except Exception as e:
            status = getattr(getattr(e, "resp", None), "status", None)
            transient = (
                isinstance(e, (ConnectionError, TimeoutError)) or
                status == 429 or
                (isinstance(status, int) and 500 <= status < 600)
            )
            if not transient or attempt == 2:
                raise
            import time
            time.sleep(min(4.0, 2.0 ** attempt))
    raise RuntimeError("Sheets request failed after retries")


def _get_spreadsheet_id():
    sid = _load_sheet_id()
    if not sid:
        raise RuntimeError("No spreadsheet ID: set SHEET_ID env or create sync/.sheet_id.json")
    return sid


def _get_sheet_gid(svc, sid, title):
    """Cache sheetId by title."""
    key = (sid, title)
    if key in _gid_cache:
        return _gid_cache[key]
    try:
        meta = _execute(svc.spreadsheets().get(
            spreadsheetId=sid, fields="sheets.properties(title,sheetId)"))
        for s in meta.get("sheets", []):
            props = s.get("properties", {})
            t = props.get("title")
            if t:
                _gid_cache[(sid, t)] = props.get("sheetId")
        return _gid_cache.get(key)
    except Exception:
        return None


def _q(title):
    """Quote sheet title for A1 notation."""
    return "'%s'" % title.replace("'", "''") if any(c in title for c in " '") else title


def _yesterday_bounds():
    """Return (since_ts, until_ts) for yesterday in MYT (unix timestamps)."""
    now = datetime.datetime.now(MYT)
    yesterday = now.replace(hour=0, minute=0, second=0, microsecond=0) - datetime.timedelta(days=1)
    since_ts = int(yesterday.timestamp())
    until_ts = since_ts + 86399
    return since_ts, until_ts


def _parse_myt(s):
    """Parse MYT datetime string -> unix ts, or 0 on failure."""
    try:
        dt = datetime.datetime.strptime(s.strip(), "%Y-%m-%d %H:%M:%S")
        return int(dt.replace(tzinfo=MYT).timestamp())
    except (TypeError, ValueError):
        return 0


def get_yesterday_run(account_name, tab_title):
    """
    Read yesterday's videos from the account's tab, count Run checkbox (col A) ticks.

    Returns: {"total": int, "ticked": int, "video_ids": [str, ...]}
    On error: {"error": str, "total": 0, "ticked": 0, "video_ids": []}
    """
    try:
        svc = get_sheets_service()
        sid = _get_spreadsheet_id()
    except RuntimeError as e:
        return {"error": str(e), "total": 0, "ticked": 0, "video_ids": []}

    since_ts, until_ts = _yesterday_bounds()

    try:
        # Read account tab: A (Run), C (Title), D (Video ID), E (Posted MYT)
        # Header is row 1, data starts row 2. Read enough rows.
        resp = _execute(svc.spreadsheets().values().get(
            spreadsheetId=sid,
            range="%s!A2:E200" % _q(tab_title)))
        rows = resp.get("values", [])
    except Exception as e:
        return {"error": "Read tab failed: " + str(e)[:200], "total": 0, "ticked": 0, "video_ids": []}

    total, ticked = 0, 0
    video_ids = []
    for r in rows:
        if len(r) < 4:
            continue
        posted_str = (r[3] or "").strip()
        ct = _parse_myt(posted_str)
        if not ct or ct < since_ts or ct > until_ts:
            continue
        total += 1
        vid = (r[2] or "").strip()
        if vid:
            video_ids.append(vid)
        run_val = (r[0] or "").strip().upper()
        if run_val in ("TRUE", "1", "YES", "CHECKED", "ON"):
            ticked += 1

    return {"total": total, "ticked": ticked, "video_ids": video_ids}


def get_dashboard_accounts():
    """
    Read Dashboard!A1:F to get the list of accounts with tab titles.
    Returns list of {"name": str, "tab": str} in display order.
    """
    try:
        svc = get_sheets_service()
        sid = _get_spreadsheet_id()
    except RuntimeError as e:
        return []

    try:
        resp = _execute(svc.spreadsheets().values().get(
            spreadsheetId=sid, range="Dashboard!A2:F100"))
        rows = resp.get("values", [])
    except Exception:
        return []

    out = []
    for r in rows:
        if not r:
            continue
        a = (r[0] or "").strip()
        if not a or a == "Updated (MYT)":
            continue
        # Extract label from HYPERLINK or plain
        label = a
        if a.startswith("=HYPERLINK("):
            i = a.find('","')
            if i != -1:
                label = a[i + 3:-2].replace('""', '"')
        out.append({"name": label, "tab": label})
    return out


if __name__ == "__main__":
    # Quick manual test: python dashboard/sheets.py
    import sys
    accts = get_dashboard_accounts()
    print("Dashboard accounts (%d):" % len(accts))
    for a in accts:
        res = get_yesterday_run(a["name"], a["tab"])
        print("  %s: total=%d ticked=%d %s" % (a["name"], res.get("total", 0), res.get("ticked", 0), res.get("error", "")))