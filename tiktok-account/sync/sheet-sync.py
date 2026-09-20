"""Manual Google Sheets sync for the 10 managed TikTok accounts.

Reads the 7-day (default) window via dashboard.pull_and_cache, then upserts
into 1 spreadsheet by Video ID:
  - A-B are yours: Run (checkbox) + Note. New rows arrive blank/unticked;
    stat refreshes never touch A-B.
  - C-N are the system block (Title, Video ID, Posted, Views, Likes,
    Comments, Shares, Links + 4 delta cols). ID matches refresh C-N + deltas;
    new IDs insert at row 2, newest first.
Sheet 1 ("Dashboard") gets a per-account totals table each run.

Run (manual, from the marketer repo root):
  uv --directory ../tools/spreadsheet-mcp run python ^
    tiktok-account/sync/sheet-sync.py --all --days 7
Windows (pick ONE window per run):
  --days N (default 7) | --today | --yesterday |
  --since YYYY-MM-DD [--until YYYY-MM-DD] | --full
Single account / dry run / gap fill:
  ... sheet-sync.py --account "Dr Samhan" --today
  ... sheet-sync.py --all --days 7 --dry-run
  ... sheet-sync.py --all --since 2026-09-15 --until 2026-09-18 --dry-run
Full-history backfill (slow, throttled ~1s/page, run once supervised):
  ... sheet-sync.py --all --full

Spreadsheet ID resolution: --spreadsheet-id > SHEET_ID env >
sync/.sheet_id.json ({"spreadsheet_id": "..."}), never committed.
Auth: service-account via GOOGLE_SHEETS_CRED (same as spreadsheet-mcp).
"""
import argparse
import datetime
import importlib.util
import json
import os
import socket
import ssl
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
PARENT = os.path.dirname(HERE)  # tiktok-account/
MARKETER = os.path.dirname(PARENT)
DASHBOARD_PY = os.path.join(PARENT, "dashboard", "dashboard.py")
SHEET_ID_FILE = os.path.join(HERE, ".sheet_id.json")
MYT = datetime.timezone(datetime.timedelta(hours=8))

BASE_HEADER = ["Title", "Video ID", "Posted (MYT)", "Views", "Likes",
               "Comments", "Shares", "Links"]
DELTA_HEADER = ["ViewsD", "LikesD", "CommentsD", "SharesD"]
HEADER = BASE_HEADER + DELTA_HEADER  # 12 system cols; customs live in A-B
METRIC_IDX = [3, 4, 5, 6]  # Views/Likes/Comments/Shares positions in HEADER
N_SYS_COLS = len(HEADER)
# User-owned columns on the LEFT of the system block. New names append here;
# the system block shifts right automatically. Never read, never written -
# except the header row + checkbox validation on col A ("Run").
CUSTOM_LEFT = ["Run", "Note"]
OFF = len(CUSTOM_LEFT)
N_COLS = OFF + N_SYS_COLS
ID_COL = OFF + 1  # Video ID position in a full row


def _col(i):
    """0-based column index -> sheet letters (0=A)."""
    s, i = "", i + 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s


def _rng(title, r1, c1, r2, c2):
    return "%s!%s%d:%s%d" % (_q(title), _col(c1), r1, _col(c2), r2)


def _load_dashboard():
    spec = importlib.util.spec_from_file_location("dash_local", DASHBOARD_PY)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _mcp_src_on_path():
    for cand in (
        os.path.join(os.path.dirname(MARKETER), "tools",
                     "spreadsheet-mcp", "src"),
        os.environ.get("SPREADSHEET_MCP_DIR", ""),
    ):
        src = cand if cand.endswith("src") else os.path.join(cand, "src")
        if src and os.path.isdir(src) and src not in sys.path:
            sys.path.insert(0, src)


def resolve_spreadsheet_id(cli_value):
    if cli_value:
        return cli_value.strip()
    env = os.environ.get("SHEET_ID", "").strip()
    if env:
        return env
    if os.path.exists(SHEET_ID_FILE):
        with open(SHEET_ID_FILE, encoding="utf-8-sig") as f:
            return (json.load(f).get("spreadsheet_id", "") or "").strip()
    return ""


def pick_accounts(dash, only):
    accs = [a for a in dash.load_accounts() if a.get("active")]
    if only:
        accs = [a for a in accs if a.get("name", "") == only]
        if not accs:
            raise SystemExit("Unknown/inactive account: " + only)
        return accs
    return accs[:10]


def _q(title):
    return "'%s'" % title.replace("'", "''") if any(
        c in title for c in " '") else title


def X(req, tries=6):
    """Execute a Sheets request, retrying transient network/5xx failures."""
    last = None
    for attempt in range(tries):
        try:
            return req.execute()
        except Exception as e:  # noqa: BLE001 - classified below
            last = e
            status = getattr(getattr(e, "resp", None), "status", None)
            transient = (
                isinstance(e, (ConnectionResetError, TimeoutError,
                               socket.timeout, ssl.SSLError))
                or status == 429
                or (isinstance(status, int) and 500 <= status < 600))
            if not transient or attempt == tries - 1:
                raise
            time.sleep(min(60.0, 2.0 ** attempt))
    raise last


def tab_title(name, username):
    """Sheet tab: @username / Account Name (falls back to bare name)."""
    username = (username or "").strip()
    if username and not username.startswith("@"):
        username = "@" + username
    return "%s / %s" % (username, name) if username else name


DASHBOARD_COLOR = {"red": 0.38, "green": 0.38, "blue": 0.38}
# Fixed palette by account order (first 10 active in accounts.json).
ACCOUNT_COLORS = {
    "HIMCoffee": {"red": 0.55, "green": 0.38, "blue": 0.24},
    "Dr Samhan": {"red": 0.13, "green": 0.59, "blue": 0.95},
    "Dr Samhan Official3": {"red": 0.0, "green": 0.59, "blue": 0.53},
    "Dr. Samhan": {"red": 0.96, "green": 0.26, "blue": 0.21},
    "Affiliate Dr Samhan4": {"red": 0.61, "green": 0.15, "blue": 0.69},
    "Affiliate Dr Samhan3": {"red": 1.0, "green": 0.6, "blue": 0.0},
    "DrSamhanWellness": {"red": 0.3, "green": 0.69, "blue": 0.31},
    "Affiliate Dr Samhan6": {"red": 0.91, "green": 0.12, "blue": 0.39},
    "Dr Samhan Official": {"red": 0.25, "green": 0.32, "blue": 0.71},
    "Dr Samhan Official4": {"red": 0.0, "green": 0.74, "blue": 0.83},
}
DEFAULT_TAB_COLOR = {"red": 0.0, "green": 0.59, "blue": 0.53}


def ensure_sheets(svc, sid, tabs):
    """tabs: {account name: tab title}. Renames old bare-name tabs once."""
    meta = X(svc.spreadsheets().get(
        spreadsheetId=sid, fields="sheets.properties(title,sheetId)"))
    have = {s["properties"]["title"]: s["properties"]["sheetId"]
            for s in meta.get("sheets", [])}
    reqs = []
    if "Dashboard" not in have:
        if "Sheet1" in have:
            cur = X(svc.spreadsheets().values().get(
                spreadsheetId=sid, range="Sheet1!A1")).get("values")
            if not cur:
                reqs.append({"updateSheetProperties": {
                    "properties": {"sheetId": have["Sheet1"],
                                   "title": "Dashboard"},
                    "fields": "title"}})
                have["Dashboard"] = have.pop("Sheet1")
        if "Dashboard" not in have:
            reqs.append({"addSheet": {"properties": {"title": "Dashboard"}}})
    for name, title in tabs.items():
        if title in have:
            continue
        if name in have:
            reqs.append({"updateSheetProperties": {
                "properties": {"sheetId": have[name], "title": title},
                "fields": "title"}})
            have[title] = have.pop(name)
        else:
            reqs.append({"addSheet": {"properties": {"title": title}}})
    if reqs:
        out = X(svc.spreadsheets().batchUpdate(
            spreadsheetId=sid, body={"requests": reqs}))
        for r in out.get("replies", []):
            props = (r.get("addSheet") or {}).get("properties", {})
            if props.get("title"):
                have[props["title"]] = props["sheetId"]
    freeze = []
    title_of = {t: n for n, t in tabs.items()}
    for title, shid in have.items():
        if title == "Dashboard":
            color = DASHBOARD_COLOR
        elif title in title_of:
            color = ACCOUNT_COLORS.get(title_of[title], DEFAULT_TAB_COLOR)
        else:
            color = None
        props = {"sheetId": shid,
                 "gridProperties": {"frozenRowCount": 1}}
        fields = "gridProperties.frozenRowCount"
        if color:
            props["tabColor"] = color
            fields += ",tabColor"
        freeze.append({"updateSheetProperties": {"properties": props,
                                                 "fields": fields}})
    if freeze:
        X(svc.spreadsheets().batchUpdate(
            spreadsheetId=sid, body={"requests": freeze}))
    return have


def read_block(svc, sid, title):
    try:
        resp = X(svc.spreadsheets().values().get(
            spreadsheetId=sid,
            range="%s!A1:%s20000" % (_q(title), _col(N_COLS - 1))))
    except Exception as e:  # noqa: BLE001 - missing tab reads as empty
        blob = str(getattr(e, "content", "")) + str(e)
        if "Unable to parse range" in blob:
            return []
        raise
    return resp.get("values", [])


def ensure_layout(svc, sid, title, grid, dry):
    """Header Row 1: CUSTOM_LEFT + HEADER. Migrates the old A-L layout once.

    - Empty sheet: write the full header.
    - System block already at OFF but custom heads differ: fix header row only.
    - Old A-L layout (system at 0): shift every data row right by OFF,
      blanking A-B. Anything past L is preserved as-is.
    Data rows are never reordered; A-B values are never touched except the
    header row (old layout has no A-B values to preserve).
    """
    want = CUSTOM_LEFT + HEADER
    last = _col(N_COLS - 1)
    if not grid:
        if not dry:
            X(svc.spreadsheets().values().update(
                spreadsheetId=sid, range="%s!A1:%s1" % (_q(title), last),
                valueInputOption="RAW", body={"values": [want]}))
        return ["HEADER_WRITTEN"]
    head = grid[0]
    sys_at_off = head[OFF:OFF + N_SYS_COLS] == HEADER
    if head[:OFF] == CUSTOM_LEFT and sys_at_off:
        return []
    if sys_at_off:
        if not dry:
            X(svc.spreadsheets().values().update(
                spreadsheetId=sid, range="%s!A1:%s1" % (_q(title), last),
                valueInputOption="RAW", body={"values": [want]}))
        return ["HEADER_FIXED"]
    if head[:N_SYS_COLS] == HEADER:
        if not dry:
            new = [want]
            for r in grid[1:]:
                syspart = (r[:N_SYS_COLS] + [""] * N_SYS_COLS)[:N_SYS_COLS]
                new.append([""] * OFF + syspart + r[N_SYS_COLS:])
            X(svc.spreadsheets().values().update(
                spreadsheetId=sid,
                range="%s!A1:%s%d" % (_q(title), last, len(new)),
                valueInputOption="RAW", body={"values": new}))
        return ["MIGRATED_A_B"]
    if not dry:
        X(svc.spreadsheets().values().update(
            spreadsheetId=sid, range="%s!A1:%s1" % (_q(title), last),
            valueInputOption="RAW", body={"values": [want]}))
    return ["HEADER_FIXED"]


def ensure_checkboxes(svc, sid, title, last_row, dry):
    """(Re)apply CHECKBOX validation to col A data rows. Idempotent."""
    if dry or last_row < 2:
        return
    X(svc.spreadsheets().batchUpdate(spreadsheetId=sid, body={"requests": [
        {"setDataValidation": {
            "range": {"sheetId": sheet_id_of(svc, sid, title),
                      "startRowIndex": 1, "endRowIndex": last_row,
                      "startColumnIndex": 0, "endColumnIndex": 1},
            "rule": {"strict": True, "showCustomUi": True,
                     "condition": {"type": "BOOLEAN"}}}}]}))


def _num(v):
    try:
        return int(float(str(v).strip()))
    except (TypeError, ValueError, AttributeError):
        return None


def row_for(dash, v):
    myt, _utc = dash.to_myt(v.get("create_time"))
    get = lambda k: v.get(k, "")
    return [v.get("title", ""), v.get("id", ""), myt,
            get("view_count"), get("like_count"),
            get("comment_count"), get("share_count"),
            dash.clean_share(v.get("share_url", ""))]


def sync_account(svc, sid, dash, name, title, videos, dry):
    """Upsert fresh-window videos into tab `title`. Returns (upd, ins, notes).

    All writes stay inside the system block (cols C-N); A-B are only ever
    blank on brand-new rows (checkbox validation covers them after).
    """
    grid = read_block(svc, sid, title)
    if not grid and title != name:
        grid = read_block(svc, sid, name)  # pre-rename tab, dry preview only
    notes = ensure_layout(svc, sid, title, grid, dry)
    migrated = "MIGRATED_A_B" in notes and not dry
    data = []
    if migrated and not dry:
        grid = read_block(svc, sid, title)  # re-read post-migration
    if grid and len(grid) > 1:
        head = grid[0]
        is_new = head[:OFF] == CUSTOM_LEFT and \
            head[OFF:OFF + N_SYS_COLS] == HEADER
        if is_new or migrated:
            data = grid[1:]
        elif head[:N_SYS_COLS] == HEADER:
            # Old A-L layout, unmigrated (dry-run): view it shifted so
            # counts match post-migration reality.
            data = [[""] * OFF + (r[:N_SYS_COLS] + [""] * N_SYS_COLS)
                    [:N_SYS_COLS] + r[N_SYS_COLS:] for r in grid[1:]]
        else:
            data = grid[1:]
    idmap = {}
    for i, r in enumerate(data):
        full = (r + [""] * N_COLS)[:N_COLS]
        vid = full[ID_COL] or ""
        if vid and vid not in idmap:
            idmap[vid] = (i + 2, full)  # 1-based sheet row
    updates, new_rows = [], []
    for v in videos:
        vals = row_for(dash, v)
        vid = vals[1]
        if not vid:
            continue
        hit = idmap.get(vid)
        if hit is None:
            new_rows.append(vals + ["", "", "", ""])
            continue
        rownum, old = hit
        old_sys = old[OFF:OFF + 8]
        if [str(x) for x in vals] == [str(x) for x in old_sys]:
            continue
        deltas = []
        for i in METRIC_IDX:
            o, n = _num(old_sys[i]), _num(vals[i])
            deltas.append("" if o is None or n is None else n - o)
        full = vals + deltas
        updates.append({"range": _rng(title, rownum, OFF, rownum, OFF + 11),
                        "values": [full]})
    inserted, updated = len(new_rows), len(updates)
    last_row = 1 + len(data) + inserted
    if not dry:
        if updates:
            X(svc.spreadsheets().values().batchUpdate(
                spreadsheetId=sid,
                body={"valueInputOption": "RAW", "data": [
                    dict(u, majorDimension="ROWS") for u in updates]}))
        if new_rows:
            new_rows.sort(key=lambda r: str(r[2]), reverse=True)
            X(svc.spreadsheets().batchUpdate(spreadsheetId=sid, body={
                "requests": [{"insertDimension": {
                    "range": {"sheetId": sheet_id_of(svc, sid, title),
                              "dimension": "ROWS",
                              "startIndex": 1, "endIndex": 1 + inserted}}}]}))
            X(svc.spreadsheets().values().update(
                spreadsheetId=sid,
                range=_rng(title, 2, OFF, 1 + inserted, OFF + 11),
                valueInputOption="RAW", body={"values": new_rows}))
        ensure_checkboxes(svc, sid, title, last_row, dry)
    return updated, inserted, notes


_sheet_ids_cache = {}


def sheet_id_of(svc, sid, title):
    if sid not in _sheet_ids_cache:
        meta = X(svc.spreadsheets().get(
            spreadsheetId=sid,
            fields="sheets.properties(title,sheetId)"))
        _sheet_ids_cache[sid] = {s["properties"]["title"]:
                                 s["properties"]["sheetId"]
                                 for s in meta.get("sheets", [])}
    return _sheet_ids_cache[sid][title]


def write_dashboard(svc, sid, dash, summaries, gids, dry):
    rows = [["Account", "Followers", "Videos 7d", "Views 7d",
             "ViewsD 7d", "Last post MYT"]]
    for s in summaries:
        label = s["sheet"]
        gid = gids.get(s["sheet"])
        cell = ('=HYPERLINK("#gid=%d","%s")' % (gid, label.replace('"', '""'))
                if gid is not None else label)
        rows.append([cell, s["followers"], s["videos_7d"],
                     s["views_7d"], s["views_d_7d"], s["last_post"]])
    rows.append(["", "", "", "", "", ""])  # blank separator (clears stale)
    rows.append(["Updated (MYT)"])
    rows.append([datetime.datetime.now(MYT).strftime("%Y-%m-%d %H:%M:%S")])
    n_acc = len(summaries)
    if not dry:
        X(svc.spreadsheets().values().update(
            spreadsheetId=sid, range="Dashboard!A1:F%d" % len(rows),
            valueInputOption="USER_ENTERED", body={"values": rows}))
        X(svc.spreadsheets().values().clear(
            spreadsheetId=sid, range="Dashboard!G1:G20", body={}))
        dash_id = sheet_id_of(svc, sid, "Dashboard")
        fmt = {"numberFormat": {"type": "DATE_TIME",
                                "pattern": "yyyy-mm-dd hh:mm:ss"}}
        X(svc.spreadsheets().batchUpdate(spreadsheetId=sid, body={
            "requests": [
                {"repeatCell": {
                    "range": {"sheetId": dash_id, "startRowIndex": 1,
                              "endRowIndex": 1 + n_acc,
                              "startColumnIndex": 5, "endColumnIndex": 6},
                    "cell": {"userEnteredFormat": fmt},
                    "fields": "userEnteredFormat.numberFormat"}},
                {"repeatCell": {
                    "range": {"sheetId": dash_id,
                              "startRowIndex": 3 + n_acc,
                              "endRowIndex": 4 + n_acc,
                              "startColumnIndex": 0, "endColumnIndex": 1},
                    "cell": {"userEnteredFormat": fmt},
                    "fields": "userEnteredFormat.numberFormat"}}]}))
    return rows


def summarize(dash, name, title, videos, since_ts):
    prof = {}
    _jp, _cp, pp = dash.cache_paths(name)
    if os.path.exists(pp):
        with open(pp, encoding="utf-8") as f:
            prof = json.load(f)
    win = [v for v in videos
           if (v.get("create_time") or 0) >= (since_ts or 0)]
    myts = [dash.to_myt(v.get("create_time"))[0] for v in win]
    myts = [m for m in myts if m]
    return {"account": name,
            "followers": prof.get("follower_count", ""),
            "videos_7d": len(win),
            "views_7d": sum(int(v.get("view_count") or 0) for v in win),
            "views_d_7d": "",
            "last_post": max(myts) if myts else "",
            "sheet": title}


def _day_start(day):
    """YYYY-MM-DD -> unix ts at 00:00 MYT. Raises SystemExit on bad input."""
    try:
        y, m, d = (int(x) for x in str(day).split("-"))
        return int(datetime.datetime(y, m, d, tzinfo=MYT).timestamp())
    except (TypeError, ValueError):
        raise SystemExit("Bad date (want YYYY-MM-DD): %r" % (day,))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--account", default="")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--days", type=int, default=None)
    ap.add_argument("--today", action="store_true")
    ap.add_argument("--yesterday", action="store_true")
    ap.add_argument("--since", default="")
    ap.add_argument("--until", default="")
    ap.add_argument("--full", action="store_true")
    ap.add_argument("--spreadsheet-id", default="")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    sid = resolve_spreadsheet_id(args.spreadsheet_id)
    if not sid:
        raise SystemExit("No spreadsheet ID: pass --spreadsheet-id, set "
                         "SHEET_ID env, or create sync/.sheet_id.json")
    specs = [args.today, args.yesterday, args.days is not None,
             bool(args.since or args.until), args.full]
    if sum(1 for s in specs if s) > 1:
        raise SystemExit("Pick ONE window: --today | --yesterday | --days N "
                         "| --since/--until | --full")
    if args.days is not None and args.days < 1:
        raise SystemExit("--days needs N >= 1")
    mid = datetime.datetime.now(MYT).replace(
        hour=0, minute=0, second=0, microsecond=0)
    today_ts = int(mid.timestamp())
    if args.full:
        since_ts, until_ts, win = None, None, "full history"
    elif args.today:
        since_ts, until_ts = today_ts, None
        win = "today"
    elif args.yesterday:
        since_ts = today_ts - 86400
        until_ts = today_ts - 1
        win = "yesterday"
    elif args.since or args.until:
        until_ts = _day_start(args.until) + 86399 if args.until else None
        since_ts = _day_start(args.since) if args.since \
            else until_ts - 6 * 86400
        if since_ts is not None and until_ts is not None \
                and since_ts > until_ts:
            raise SystemExit("--since is after --until")
        win = "%s..%s" % (args.since or "7d-before-until",
                           args.until or "now")
    else:
        days = args.days if args.days is not None else 7
        since_ts = today_ts - (days - 1) * 86400
        until_ts = None
        win = "last %d day(s)" % days
    dash = _load_dashboard()
    _mcp_src_on_path()
    from spreadsheet_mcp.auth import get_sheets_service
    svc = get_sheets_service()
    picked = pick_accounts(dash, args.account)
    tabs = {a.get("name", ""): tab_title(a.get("name", ""),
                                         a.get("username", ""))
            for a in picked}
    names = list(tabs)
    if not args.account and not args.all:
        raise SystemExit("Pass --all or --account NAME")
    if not args.dry_run:
        have = ensure_sheets(svc, sid, tabs)
        _sheet_ids_cache[sid] = dict(have)
    # Dashboard always summarizes the trailing 7d, whatever the fetch preset.
    dash_since = today_ts - 6 * 86400
    summaries, results, skipped = [], [], []
    for name in names:
        try:
            access = dash.ensure_access(name)
        except dash.RelinkNeeded as e:
            print("SKIP %s: relink needed (%s)" % (name, e))
            skipped.append(name)
            continue
        _user, merged, info = dash.pull_and_cache(
            name, access, since_ts=since_ts, until_ts=until_ts)
        fresh = [v for v in merged
                 if (since_ts is None or (v.get("create_time") or 0) >= since_ts)
                 and (until_ts is None or (v.get("create_time") or 0) <= until_ts)]
        upd, ins, notes = sync_account(svc, sid, dash, name, tabs[name],
                                       fresh, args.dry_run)
        tag = "DRY " if args.dry_run else ""
        print("%s%s [%s]: fetched=%d fresh=%d updated=%d inserted=%d %s" % (
            tag, name, win, info.get("fetched", 0), len(fresh), upd, ins,
            " ".join(notes)))
        results.append((name, len(fresh), upd, ins))
        summaries.append(summarize(dash, name, tabs[name], merged, dash_since))
    gids = {t: sheet_id_of(svc, sid, t) for t in tabs.values()
            if not args.dry_run}
    write_dashboard(svc, sid, dash, summaries, gids, args.dry_run)
    print(("DRY " if args.dry_run else "") + "Dashboard written (%d accounts)."
          % len(summaries))
    print_summary(results, skipped, len(names), args.dry_run)


def print_summary(results, skipped, total, dry):
    """Plain-words footer under the per-account lines. ASCII only (cp1252)."""
    print("--- What this means ---")
    posted = [n for n, f, _u, _i in results if f > 0]
    videos = sum(f for _n, f, _u, _i in results)
    upd = sum(u for _n, _f, u, _i in results)
    ins = sum(i for _n, _f, _u, i in results)
    ran = len(results)
    print("%d of %d accounts posted in this window (%d videos)."
          % (len(posted), total, videos))
    if dry:
        print("%d rows would refresh, %d new videos." % (upd, ins))
    else:
        print("%d rows refreshed, %d new videos added on top." % (upd, ins))
    quiet = [n for n, f, _u, _i in results if f == 0]
    if quiet:
        print("No posts in window: %s." % ", ".join(quiet))
    if skipped:
        print("Relink needed: %s (dashboard -> Link/Relink, then rerun)."
              % ", ".join(skipped))
    else:
        print("All tokens healthy.")
    if ran == 0:
        print("Nothing synced.")
    elif upd == 0 and ins == 0:
        if dry:
            print("Everything already tracked - a live run would only "
                  "touch the Dashboard timestamp.")
        else:
            print("Nothing changed - Dashboard timestamp updated.")
    if dry:
        print("Preview only - sheet untouched.")
    elif ran == total and not skipped:
        print("Sheet + Dashboard updated.")
    elif ran > 0:
        print("Sheet + Dashboard updated for the other %d." % ran)
    else:
        print("Sheet untouched.")


if __name__ == "__main__":
    main()
