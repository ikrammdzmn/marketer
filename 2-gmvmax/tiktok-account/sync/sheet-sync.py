"""Manual Google Sheets sync for the 10 managed TikTok accounts.

Reads the 7-day (default) window via dashboard.pull_and_cache, then upserts
into 1 spreadsheet by Video ID:
  - A-C are yours: Run (checkbox) + Note + Creative age (formula).
    New rows arrive blank/unticked; stat refreshes never touch A-C.
  - D-O are the system block (Video ID, Title, Posted, Views, Likes,
    Comments, Shares, Links + 4 delta cols). ID matches refresh D-O + deltas;
    new IDs insert at row 2, newest first.
Sheet 1 ("Dashboard") gets a numbered per-account totals table each run
(No in col A, Account jump-links in col B). Account tabs are titled
"N. @username / Account Name" and kept left-to-right in Dashboard order
(accounts.json picked order).

Run (manual, from the marketer repo root):
  uv --directory ../tools/spreadsheet-mcp run python ^
    tiktok-account/sync/sheet-sync.py --all --days 7
Windows (pick ONE window per run):
  --days N (default 7) | --today | --yesterday |
  --since YYYY-MM-DD [--until YYYY-MM-DD] | --full
Ticks-only refresh (no TikTok pull, Dashboard cols H-J only):
  ... sheet-sync.py --all --refresh-ticks [--dry-run]
Age-formula seeding (no TikTok pull, col C only):
  ... sheet-sync.py --all --seed-age [--dry-run]
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
AGE_FORMULA_FILE = os.path.join(HERE, "age_formula.txt")
MYT = datetime.timezone(datetime.timedelta(hours=8))
SYNC_VERSION = "v23"

BASE_HEADER = ["Video ID", "Title", "Posted (MYT)", "Views", "Likes",
               "Comments", "Shares", "Links"]
OLD_BASE_HEADER = ["Title", "Video ID", "Posted (MYT)", "Views", "Likes",
                   "Comments", "Shares", "Links"]
DELTA_HEADER = ["ViewsD", "LikesD", "CommentsD", "SharesD"]
HEADER = BASE_HEADER + DELTA_HEADER  # 12 system cols; customs live in A-C
OLD_SYS_HEADER = OLD_BASE_HEADER + DELTA_HEADER  # pre-swap C-D order
METRIC_IDX = [3, 4, 5, 6]  # Views/Likes/Comments/Shares positions in HEADER
N_SYS_COLS = len(HEADER)
# User-owned columns on the LEFT of the system block. New names append here;
# the system block shifts right automatically. Never read, never written -
# except the header row + checkbox validation on col A ("Run").
CUSTOM_LEFT = ["Run", "Note", "Creative age"]
OFF = len(CUSTOM_LEFT)
OLD_WANT = ["Run", "Note"] + HEADER  # pre-insert-C header (14 cols)
N_COLS = OFF + N_SYS_COLS
ID_COL = OFF  # Video ID position in a full row (col C)


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
    cands = [os.environ.get("SPREADSHEET_MCP_DIR", "")]
    d = HERE  # walk up: sibling ../tools lives beside the repo root at any depth
    for _ in range(6):
        cands.append(os.path.join(d, "..", "tools",
                                  "spreadsheet-mcp", "src"))
        d = os.path.dirname(d)
    for cand in cands:
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
    raise last  # type: ignore


def tab_title(name, username, n=None):
    """Sheet tab: N. @username / Account Name (falls back to bare name)."""
    username = (username or "").strip()
    if username and not username.startswith("@"):
        username = "@" + username
    base = "%s / %s" % (username, name) if username else name
    return ("%d. %s" % (n, base)) if n else base


def _strip_num(title):
    """Drop a leading "N. " position prefix (tabs + Dashboard labels)."""
    s = str(title or "").strip()
    i = 0
    while i < len(s) and s[i].isdigit():
        i += 1
    if i == 0 or i > 2:
        return s  # no prefix; guards date serials like 46285.618
    if i + 1 < len(s) and s[i] == "." and s[i + 1] == " ":
        return s[i + 2:]
    if i < len(s) and s[i] == ".":
        return s[i + 1:].strip()
    return s


def _relabel(cell, title):
    """Swap the label of a =HYPERLINK cell to `title`, keeping its gid."""
    s = str(cell or "")
    if s.startswith("=HYPERLINK("):
        i = s.find("#gid=")
        if i != -1:
            j = i + 5
            k = j
            while k < len(s) and s[k].isdigit():
                k += 1
            if k > j:
                return '=HYPERLINK("#gid=%s","%s")' % (
                    s[j:k], title.replace('"', '""'))
    return None


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
    stripped = {_strip_num(t): t for t in have}
    for name, title in tabs.items():
        if title in have:
            continue
        base = _strip_num(title)
        old = None
        if base in have:
            old = base  # legacy unnumbered "@user / Name" tab
        elif base in stripped:
            old = stripped[base]  # differently-numbered tab, renumber
        elif name in have:
            old = name  # pre-rename bare-name tab
        if old is not None:
            reqs.append({"updateSheetProperties": {
                "properties": {"sheetId": have[old], "title": title},
                "fields": "title"}})
            have[title] = have.pop(old)
            stripped = {_strip_num(t): t for t in have}
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
    # Canonical tab order: Dashboard first, then account tabs in picked
    # (Dashboard row) order. Personal tabs are left alone and float right.
    order = ["Dashboard"] + list(tabs.values())
    for i, title in enumerate(order):
        if title in have:
            freeze.append({"updateSheetProperties": {
                "properties": {"sheetId": have[title], "index": i},
                "fields": "index"}})
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
    """Header Row 1: CUSTOM_LEFT + HEADER. Migrates old layouts once
    (A-L shift, pre-swap C-D order, pre-insert-C width).

    - Empty sheet: write the full header.
    - System block already at OFF but custom heads differ: fix header row only.
    - Old A-L layout (system at 0): shift every data row right by OFF,
      blanking customs. Anything past L is preserved as-is.
    Data rows are never reordered; custom values are never touched except
    the header row (old layout has no custom values to preserve).
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
    if head[:len(OLD_WANT)] == OLD_WANT:
        # Pre-insert-C layout (2 customs): blank C for the header +
        # every data row; A-B ticks/notes untouched, system shifts
        # right. Extra user cols beyond (if any) ride along untouched.
        if not dry:
            new = [want]
            for r in grid[1:]:
                raw = list(r)
                while len(raw) < 2:
                    raw.append("")
                row = raw[:2] + [""] + raw[2:]
                row[0] = _checkbox_bool(row[0])
                new.append(row)
            X(svc.spreadsheets().values().update(
                spreadsheetId=sid,
                range="%s!A1:%s%d" % (_q(title), last, len(new)),
                valueInputOption="RAW", body={"values": new}))
        return ["MIGRATED_INSERT_C"]
    if head[:OFF] == CUSTOM_LEFT and \
            head[OFF:OFF + N_SYS_COLS] == OLD_SYS_HEADER:
        # Pre-swap C-D order (Video ID in D): swap C<->D in the header
        # + every data row. A-C customs and the rest are untouched.
        if not dry:
            new = [want]
            for r in grid[1:]:
                r = (list(r) + [""] * N_COLS)[:N_COLS]
                r[OFF], r[OFF + 1] = r[OFF + 1], r[OFF]
                r[0] = _checkbox_bool(r[0])
                new.append(r)
            X(svc.spreadsheets().values().update(
                spreadsheetId=sid,
                range="%s!A1:%s%d" % (_q(title), last, len(new)),
                valueInputOption="RAW", body={"values": new}))
        return ["MIGRATED_C_D"]
    if sys_at_off:
        if not dry:
            X(svc.spreadsheets().values().update(
                spreadsheetId=sid, range="%s!A1:%s1" % (_q(title), last),
                valueInputOption="RAW", body={"values": [want]}))
        return ["HEADER_FIXED"]
    if head[:N_SYS_COLS] == HEADER or \
            head[:N_SYS_COLS] == OLD_SYS_HEADER:
        if not dry:
            new = [want]
            for r in grid[1:]:
                syspart = (r[:N_SYS_COLS] + [""] * N_SYS_COLS)[:N_SYS_COLS]
                if syspart[:2] == OLD_BASE_HEADER[:2]:
                    syspart[0], syspart[1] = syspart[1], syspart[0]
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
    return [v.get("id", ""), v.get("title", ""), myt,
            get("view_count"), get("like_count"),
            get("comment_count"), get("share_count"),
            dash.clean_share(v.get("share_url", ""))]


def _checkbox_bool(v):
    """Col A value for writes: real booleans for checkboxes.

    Sheets reads ticked/unticked boxes as "TRUE"/"FALSE" strings;
    writing those strings back as TEXT trips strict BOOLEAN
    validation (red triangles). Anything else passes through.
    """
    if v is True or v is False:
        return v
    s = str(v).strip().upper() if v != "" and v is not None else ""
    if s == "TRUE":
        return True
    if s == "FALSE":
        return False
    return v


def swap_cd(r):
    """Full-width row with C<->D swapped (old layout -> new). Pure."""
    row = (list(r) + [""] * N_COLS)[:N_COLS]
    row[OFF], row[OFF + 1] = row[OFF + 1], row[OFF]
    return row


def _sorted_newest_first(rows):
    """Full-width rows sorted newest-first by Posted (col OFF+2).

    Stable: equal Posted keeps existing order. A-C (Run ticks +
    notes) travel with their rows since whole rows move together.
    """
    return sorted(rows, key=lambda r: str(r[OFF + 2]), reverse=True)


def sync_account(svc, sid, dash, name, title, videos, dry):
    """Upsert fresh-window videos into tab `title`. Returns (upd, ins, notes).

    All writes stay inside the system block (cols D-O); A-C are only ever
    blank on brand-new rows (checkbox validation covers them after).
    """
    grid = read_block(svc, sid, title)
    if not grid:
        # Pre-rename/renumber tab, dry preview only.
        for cand in (_strip_num(title), name):
            if cand and cand != title:
                grid = read_block(svc, sid, cand)
                if grid:
                    break
    notes = ensure_layout(svc, sid, title, grid, dry)
    migrated = ("MIGRATED_A_B" in notes or "MIGRATED_C_D" in notes
                or "MIGRATED_INSERT_C" in notes) and not dry
    data = []
    if migrated and not dry:
        grid = read_block(svc, sid, title)  # re-read post-migration
    if grid and len(grid) > 1:
        head = grid[0]
        is_new = head[:OFF] == CUSTOM_LEFT and \
            head[OFF:OFF + N_SYS_COLS] == HEADER
        if is_new or migrated:
            data = grid[1:]
        elif head[:len(OLD_WANT)] == OLD_WANT:
            # Old 2-custom width, unmigrated (dry-run): view it with
            # blank C so counts match post-migration reality.
            data = []
            for r in grid[1:]:
                raw = list(r)
                while len(raw) < 2:
                    raw.append("")
                data.append(raw[:2] + [""] + raw[2:])
        elif head[:OFF] == CUSTOM_LEFT and \
                head[OFF:OFF + N_SYS_COLS] == OLD_SYS_HEADER:
            # Old C-D order, unmigrated (dry-run): view it swapped so
            # counts match post-migration reality.
            data = [swap_cd(r) for r in grid[1:]]
        elif head[:N_SYS_COLS] == HEADER or \
                head[:N_SYS_COLS] == OLD_SYS_HEADER:
            # Old A-L layout, unmigrated (dry-run): view it shifted (and
            # C-D swapped when needed) so counts match post-migration.
            data = []
            for r in grid[1:]:
                syspart = (r[:N_SYS_COLS] + [""] * N_SYS_COLS)[:N_SYS_COLS]
                if syspart[:2] == OLD_BASE_HEADER[:2]:
                    syspart = [syspart[1], syspart[0]] + syspart[2:]
                data.append([""] * OFF + syspart + r[N_SYS_COLS:])
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
        vid = vals[0]
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
    # Row-2 insert assumes new rows are newer than tracked rows (true for
    # daily top-ups, false for backfills/gap-fills of older videos).
    # If any new video predates the tracked max, the whole tab needs a
    # re-sort or newer ticked rows end up buried below older ones.
    resort = False
    if new_rows and data:
        old_posted = [str((list(d) + [""] * N_COLS)[OFF + 2]) for d in data]
        old_posted = [p for p in old_posted if p]
        new_posted = [str(r[2]) for r in new_rows if str(r[2])]
        resort = bool(old_posted and new_posted
                      and min(new_posted) < max(old_posted))
    if resort:
        notes.append("RESORT_NEWEST_FIRST")
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
        if resort:
            # Re-read post-write truth, rewrite whole block newest-first.
            # A-C customs travel with their rows; metric updates above are
            # already in the sheet and survive (whole-row rewrite).
            grid2 = read_block(svc, sid, title)
            rows2 = _sorted_newest_first(
                [(r + [""] * N_COLS)[:N_COLS] for r in grid2[1:]])
            for r in rows2:
                r[0] = _checkbox_bool(r[0])
            X(svc.spreadsheets().values().update(
                spreadsheetId=sid,
                range=_rng(title, 2, 0, 1 + len(rows2), N_COLS - 1),
                valueInputOption="RAW", body={"values": rows2}))
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


def _pad6(row):
    """Pad any row to exactly 6 Dashboard cols (footer-safe)."""
    return (list(row) + [""] * 6)[:6]


def _pad8(row):
    """Pad any row to exactly 8 Dashboard cols (footer-safe)."""
    return (list(row) + [""] * 8)[:8]


def _pad10(row):
    """Pad any row to exactly 10 Dashboard cols (footer-safe)."""
    return (list(row) + [""] * 10)[:10]


def _get_yesterday_run_stats(svc, sid, tabs, yesterday_ts, today_ts):
    """
    Batch-read all account tabs (col A=Run, col F=Posted MYT).
    Returns {sheet_title: (yesterday_count, yesterday_ticked, total_ticked)}.
    total_ticked counts every Run=TRUE in col A, any date.
    """
    if not tabs:
        return {}
    ranges = []
    for title in tabs.values():
        ranges.append("%s!A2:F" % _q(title))
    try:
        resp = X(svc.spreadsheets().values().batchGet(
            spreadsheetId=sid, ranges=ranges))
    except Exception as e:  # noqa: BLE001 - missing tabs read as zeros
        blob = str(getattr(e, "content", "")) + str(e)
        if "Unable to parse range" in blob:
            return {}
        raise
    out = {}
    for title, range_data in zip(tabs.values(), resp.get("valueRanges", [])):
        vals = range_data.get("values", [])
        y_count = y_ticked = total_ticked = 0
        for row in vals:
            run_val = str(row[0] if len(row) > 0 else "").strip().upper()
            is_ticked = run_val in ("TRUE", "1", "YES")
            if is_ticked:
                total_ticked += 1
            posted = str(row[5] if len(row) > 5 else "").strip()
            if not posted:
                continue
            try:
                dt = datetime.datetime.strptime(posted[:19], "%Y-%m-%d %H:%M:%S")
                ts = int(dt.replace(tzinfo=MYT).timestamp())
            except (ValueError, TypeError):
                continue
            if yesterday_ts <= ts < today_ts:
                y_count += 1
                if is_ticked:
                    y_ticked += 1
        out[title] = (y_count, y_ticked, total_ticked)
    return out


def _dash_label(cell):
    """Col-A label: unwrap =HYPERLINK("#gid=N","label") or plain text."""
    s = str(cell or "")
    if s.startswith("=HYPERLINK("):
        i = s.find('","')
        if i != -1:
            return s[i + 3:-2].replace('""', '"')
    return s.strip()


def _is_dashboard_footer(a):
    """True for the Updated/timestamp footer rows (even with stale C-J)."""
    s = str(a or "").strip()
    if s == "Updated (MYT)":
        return True
    if s.lower().startswith("sheet-sync v") or \
            (s.startswith("v") and len(s) > 1 and s[1].isdigit()):
        return True
    if len(s) == 19 and s[4] == "-" and s[7] == "-" and \
            s[10] == " " and s[13] == ":":
        return True
    try:
        f = float(s.replace(",", ""))
        if 20000.0 <= f <= 80000.0:
            # Date serial: an old timestamp cell read back as a number
            # (FORMULA render). Col B is never legitimately numeric.
            return True
    except (TypeError, ValueError):
        pass
    return False


def _summary_row(s, gids, n):
    label = s["sheet"]
    gid = gids.get(label)
    cell = ('=HYPERLINK("#gid=%d","%s")' % (gid, label.replace('"', '""'))
            if gid is not None else label)
    return [n, cell, s["followers"], s["videos_7d"],
            s["views_7d"], s["views_d_7d"], s["last_post"],
            s.get("yesterday_videos", 0), s.get("yesterday_ticked", 0),
            s.get("total_ticked", 0)]


def _read_dashboard_grid(svc, sid):
    """Dashboard values A1:J100 with default (formatted) render.

    Dates come back as displayed strings, so footer detection works.
    Col B hyperlinks come back as plain labels - pair with
    _read_dashboard_col_b for the real formulas.
    """
    try:
        resp = X(svc.spreadsheets().values().get(
            spreadsheetId=sid, range="Dashboard!A1:J100"))
    except Exception as e:  # noqa: BLE001 - missing tab reads as empty
        blob = str(getattr(e, "content", "")) + str(e)
        if "Unable to parse range" in blob:
            return []
        raise
    return resp.get("values", [])


def _read_dashboard_col_b(svc, sid):
    """Dashboard col B with FORMULA render (keeps =HYPERLINK cells)."""
    try:
        resp = X(svc.spreadsheets().values().get(
            spreadsheetId=sid, range="Dashboard!B1:B100",
            valueRenderOption="FORMULA"))
    except Exception as e:  # noqa: BLE001 - missing tab reads as empty
        blob = str(getattr(e, "content", "")) + str(e)
        if "Unable to parse range" in blob:
            return []
        raise
    return resp.get("values", [])


def _link_cell(label, gids, svc, sid, dry):
    """HYPERLINK cell for a tab label; plain label if gid unknown/dry."""
    gid = gids.get(label)
    if gid is None and not dry:
        try:
            gid = sheet_id_of(svc, sid, label)
        except (KeyError, TypeError, AttributeError):
            gid = None
    if gid is None:
        return label
    return '=HYPERLINK("#gid=%d","%s")' % (gid, label.replace('"', '""'))


def load_age_formula():
    """Canonical Creative-age C2 formula from sync/age_formula.txt."""
    if not os.path.exists(AGE_FORMULA_FILE):
        raise SystemExit(
            "No age formula: paste the C2 Creative-age formula (one line, "
            "starting with =) into sync/age_formula.txt, then rerun.")
    with open(AGE_FORMULA_FILE, encoding="utf-8-sig") as f:
        formula = f.read().strip()
    if not formula.startswith("="):
        raise SystemExit(
            "Bad age formula in sync/age_formula.txt "
            "(want one line starting with =).")
    return formula


def seed_age(svc, sid, title, formula, dry):
    """Clear col C below the header and (re)write the formula into C2.

    Returns (would_write, strays) - or None when the tab is missing.
    Live runs clear col C first (stray values block ARRAYFORMULA with
    #REF!) then write C2 as USER_ENTERED so it evaluates. The clear uses
    a fixed C2:C10000 bound, never the read extent: trailing formula-blank
    cells are omitted from reads but still block expansion. Cols A-B and
    the system block are never touched.
    """
    try:
        cur = X(svc.spreadsheets().values().get(
            spreadsheetId=sid, range="%s!C2:C" % _q(title))).get("values", [])
    except Exception as e:  # noqa: BLE001 - missing tab reads as skip
        blob = str(getattr(e, "content", "")) + str(e)
        if "Unable to parse range" in blob:
            return None
        raise
    flat = [(r + [""])[0] for r in cur]
    have = bool(flat) and str(flat[0]).strip() == formula.strip()
    strays = sum(1 for v in flat[1:] if str(v).strip() != "")
    if have and strays == 0:
        return (False, 0)
    if not dry:
        # Fixed generous bound, not the read extent: trailing
        # formula-blank cells are omitted from reads but still block
        # ARRAYFORMULA, so the clear must overshoot them (29 Sep bug:
        # read-extent clear left blockers below, every tab #REF!'d).
        X(svc.spreadsheets().values().clear(
            spreadsheetId=sid,
            range="%s!C2:C10000" % _q(title), body={}))
        X(svc.spreadsheets().values().update(
            spreadsheetId=sid, range="%s!C2" % _q(title),
            valueInputOption="USER_ENTERED",
            body={"values": [[formula]]}))
    return (True, strays)


def write_dashboard(svc, sid, dash, summaries, gids, dry, merge=False,
                    order=None):
    header = ["No", "Account", "Followers", "Videos 7d", "Views 7d",
              "ViewsD 7d", "Last post MYT", "Yesterday Videos",
              "Yesterday Ticked", "Total Ticked"]
    fresh = {}
    for i, s in enumerate(summaries, 1):
        fresh[_strip_num(s["sheet"])] = _summary_row(s, gids, i)
    if merge:
        # Single-account run: keep every other account row in place but
        # emit all rows in canonical (accounts.json picked) order, then
        # renumber col A top-to-bottom. Match on the number-stripped
        # col-B label so renumbers and the legacy unnumbered layout both
        # heal. Footer-like rows (including the corrupted Updated/timestamp
        # rows with stale C-J left by the old short rewrite, and bare
        # date-serial rows) are dropped and rebuilt below. Col B comes
        # from the FORMULA read (keeps =HYPERLINK); other cols from the
        # formatted read (keeps dates).
        order = order or [s["sheet"] for s in summaries]
        order_bases = [_strip_num(t) for t in order]
        have, unknowns, seen = {}, [], set()
        formulas = _read_dashboard_col_b(svc, sid)
        for i, r in enumerate(_read_dashboard_grid(svc, sid)[1:]):
            pad = _pad10(r)
            fb = (formulas[i + 1] + [""])[0] \
                if i + 1 < len(formulas) else ""
            if str(fb or "").strip():
                pad[1] = fb
            b = str(pad[1] or "").strip()
            if not b:
                continue
            if _is_dashboard_footer(b) or \
                    _is_dashboard_footer(str(pad[0] or "").strip()):
                # Second check catches legacy pre-numbering footers whose
                # stale values sit in col A (v14-era corruption shape).
                continue
            base = _strip_num(_dash_label(pad[1]))
            if not base or base in seen:
                continue
            seen.add(base)
            if base in order_bases:
                if base not in have:
                    have[base] = pad
            else:
                unknowns.append(pad)
        acc_rows = []
        for title in order:
            base = _strip_num(title)
            if base in fresh:
                acc_rows.append(fresh[base])
            elif base in have:
                row = have[base]
                # Re-link plain labels (FORMULA read keeps links; this
                # heals sheets delinked by the earlier merge), and swap
                # legacy unnumbered labels to the numbered title (gid kept).
                if str(row[1]).startswith("=HYPERLINK("):
                    new_link = _relabel(row[1], title)
                    if new_link is not None:
                        row[1] = new_link
                else:
                    row[1] = _link_cell(title, gids, svc, sid, dry)
                acc_rows.append(row)
        acc_rows += unknowns
        for i, row in enumerate(acc_rows, 1):
            row[0] = i
    else:
        acc_rows = [fresh[_strip_num(s["sheet"])] for s in summaries]
    rows = [header] + acc_rows + [_pad10([]), _pad10(["", "Updated (MYT)"]),
            _pad10(["", datetime.datetime.now(MYT).strftime(
                "%Y-%m-%d %H:%M:%S")]),
            _pad10(["", "sheet-sync " + SYNC_VERSION])]
    n_acc = len(acc_rows)
    if not dry:
        X(svc.spreadsheets().values().update(
            spreadsheetId=sid, range="Dashboard!A1:J%d" % len(rows),
            valueInputOption="USER_ENTERED", body={"values": rows}))
        # Leftover clear: a shorter rewrite (e.g. old 1-row bug, removed
        # account) must not leave stale rows below the new footer.
        if len(rows) < 100:
            X(svc.spreadsheets().values().clear(
                spreadsheetId=sid,
                range="Dashboard!A%d:J100" % (len(rows) + 1), body={}))
        dash_id = sheet_id_of(svc, sid, "Dashboard")
        fmt = {"numberFormat": {"type": "DATE_TIME",
                                "pattern": "yyyy-mm-dd hh:mm:ss"}}
        X(svc.spreadsheets().batchUpdate(spreadsheetId=sid, body={
            "requests": [
                {"repeatCell": {
                    "range": {"sheetId": dash_id, "startRowIndex": 1,
                              "endRowIndex": 1 + n_acc,
                              "startColumnIndex": 6, "endColumnIndex": 7},
                    "cell": {"userEnteredFormat": fmt},
                    "fields": "userEnteredFormat.numberFormat"}},
                {"repeatCell": {
                    "range": {"sheetId": dash_id,
                              "startRowIndex": 3 + n_acc,
                              "endRowIndex": 4 + n_acc,
                              "startColumnIndex": 1, "endColumnIndex": 2},
                    "cell": {"userEnteredFormat": fmt},
                    "fields": "userEnteredFormat.numberFormat"}}]}))
    return rows


def summarize(dash, name, title, videos, since_ts, yesterday_stats=None):
    prof = {}
    _jp, _cp, pp = dash.cache_paths(name)
    if os.path.exists(pp):
        with open(pp, encoding="utf-8") as f:
            prof = json.load(f)
    win = [v for v in videos
           if (v.get("create_time") or 0) >= (since_ts or 0)]
    myts = [dash.to_myt(v.get("create_time"))[0] for v in win]
    myts = [m for m in myts if m]
    y_vids, y_ticked, total_ticked = yesterday_stats.get(title, (0, 0, 0)) if yesterday_stats else (0, 0, 0)
    return {"account": name,
            "followers": prof.get("follower_count", ""),
            "videos_7d": len(win),
            "views_7d": sum(int(v.get("view_count") or 0) for v in win),
            "views_d_7d": "",
            "last_post": max(myts) if myts else "",
            "sheet": title,
            "yesterday_videos": y_vids,
            "yesterday_ticked": y_ticked,
            "total_ticked": total_ticked}


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
    ap.add_argument("--refresh-ticks", action="store_true")
    ap.add_argument("--seed-age", action="store_true")
    ap.add_argument("--spreadsheet-id", default="")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    sid = resolve_spreadsheet_id(args.spreadsheet_id)
    if not sid:
        raise SystemExit("No spreadsheet ID: pass --spreadsheet-id, set "
                         "SHEET_ID env, or create sync/.sheet_id.json")
    specs = [args.today, args.yesterday, args.days is not None,
             bool(args.since or args.until), args.full]
    if args.refresh_ticks and any(specs):
        raise SystemExit("--refresh-ticks takes no window flag "
                         "(--today | --yesterday | --days N | --since/--until | --full)")
    if args.seed_age and any(specs):
        raise SystemExit("--seed-age takes no window flag "
                         "(--today | --yesterday | --days N | --since/--until | --full)")
    if args.refresh_ticks and args.seed_age:
        raise SystemExit("Pick one mode: --refresh-ticks or --seed-age")
    if sum(1 for s in specs if s) > 1:
        raise SystemExit("Pick ONE window: --today | --yesterday | --days N "
                         "| --since/--until | --full")
    if args.days is not None and args.days < 1:
        raise SystemExit("--days needs N >= 1")
    mid = datetime.datetime.now(MYT).replace(
        hour=0, minute=0, second=0, microsecond=0)
    today_ts = int(mid.timestamp())
    yesterday_ts = today_ts - 86400
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
    
    # pyrefly: ignore [missing-import]
    from spreadsheet_mcp.auth import get_sheets_service
    svc = get_sheets_service()
    picked = pick_accounts(dash, args.account)
    # Canonical titles numbered by full picked order, so single-account
    # runs reuse the same numbers/order as --all (never renumber from 1).
    all_active = [x for x in dash.load_accounts() if x.get("active")][:10]
    canon = {}
    for i, a in enumerate(all_active, 1):
        canon[a.get("name", "")] = tab_title(a.get("name", ""),
                                             a.get("username", ""), i)
    tabs = {a.get("name", ""): canon.get(
        a.get("name", ""), tab_title(a.get("name", ""),
                                     a.get("username", "")))
        for a in picked}
    full_order = [canon[a.get("name", "")] for a in all_active]
    names = list(tabs)
    if not args.account and not args.all:
        raise SystemExit("Pass --all or --account NAME")
    if not args.dry_run:
        have = ensure_sheets(svc, sid, canon)
        _sheet_ids_cache[sid] = dict(have)
    if args.seed_age:
        # Formula seeding: no TikTok pull, no Dashboard write. Clears
        # col C below the header and writes the canonical age formula
        # into C2 on every picked tab (col C's only sanctioned writer).
        formula = load_age_formula()
        done, fixed, skipped = 0, 0, []
        for name in names:
            res = seed_age(svc, sid, tabs[name], formula, args.dry_run)
            tag = "DRY " if args.dry_run else ""
            if res is None:
                print("%s%s: no tab - run a normal sync first." % (tag, name))
                skipped.append(name)
                continue
            wrote, strays = res
            done += 1
            if wrote:
                fixed += 1
            verb = "would write" if args.dry_run else "written"
            if wrote and strays:
                print("%s%s: formula %s, %d stray cell%s cleared."
                      % (tag, name, verb, strays,
                         "" if strays == 1 else "s"))
            elif wrote:
                print("%s%s: formula %s." % (tag, name, verb))
            else:
                print("%s%s: already correct." % (tag, name))
        print(("DRY " if args.dry_run else "")
              + "Creative age: %d of %d tabs %s."
              % (fixed, done, "would fix" if args.dry_run else "fixed"))
        if skipped:
            print("Skipped (no tab): %s." % ", ".join(skipped))
        if args.dry_run:
            print("Preview only - sheet untouched.")
        return
    # Dashboard always summarizes the trailing 7d, whatever the fetch preset.
    dash_since = today_ts - 6 * 86400
    summaries, results, skipped = [], [], []
    if args.refresh_ticks:
        # Ticks-only refresh: no TikTok pulls, no tab writes. Summaries
        # come from local cache; cols H-J come from the account tabs.
        for name in names:
            videos = dash.maybe_migrate_cache(name) or []
            summaries.append(summarize(dash, name, tabs[name], videos,
                                       dash_since))
        try:
            yesterday_stats = _get_yesterday_run_stats(
                svc, sid, tabs, yesterday_ts, today_ts)
        except Exception as e:  # noqa: BLE001 - stats must not block
            print("Yesterday stats unreadable (%s) - writing zeros."
                  % str(e)[:120])
            yesterday_stats = {}
        for s in summaries:
            y_vids, y_ticked, total_ticked = yesterday_stats.get(s["sheet"], (0, 0, 0))
            s["yesterday_videos"] = y_vids
            s["yesterday_ticked"] = y_ticked
            s["total_ticked"] = total_ticked
            tag = "DRY " if args.dry_run else ""
            print("%s%s: yesterday %d videos, %d ticked, %d total ticked."
                  % (tag, s["account"], y_vids, y_ticked, total_ticked))
        gids = {t: sheet_id_of(svc, sid, t) for t in tabs.values()
                if not args.dry_run}
        merge = bool(args.account)
        rows = write_dashboard(svc, sid, dash, summaries, gids,
                               args.dry_run, merge=merge,
                               order=full_order)
        n_dash = len(rows) - 5  # header + blank + Updated + timestamp + version
        print(("DRY " if args.dry_run else "")
              + "Dashboard ticks refreshed (%d account%s)."
              % (n_dash, "" if n_dash == 1 else "s"))
        return
    for name in names:
        try:
            access = dash.ensure_access(name)
        except dash.RelinkNeeded as e:
            print("SKIP %s: relink needed (%s)" % (name, e))
            skipped.append(name)
            continue
        print("Pull %s: paging TikTok (throttled ~1s/page)..." % name,
              flush=True)
        _user, merged, info = dash.pull_and_cache(
            name, access, since_ts=since_ts, until_ts=until_ts,
            on_progress=lambda p: print(
                "  %s: page %d - %d videos so far%s" % (
                    name, p.get("page", 0), p.get("fetched", 0),
                    "..." if p.get("has_more") else " - done"),
                flush=True),
            on_wait=lambda s, r: print(
                "  %s: TikTok busy (%s) - retry in %ss..." % (name, r, s),
                flush=True))
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
    # Fetch yesterday's Run checkbox stats from account tabs (after sync,
    # so the tabs have the latest data including any new videos from yesterday).
    yesterday_stats = _get_yesterday_run_stats(svc, sid, tabs, yesterday_ts, today_ts)
    # Update existing summaries with yesterday + total-tick stats.
    for s in summaries:
        y_vids, y_ticked, total_ticked = yesterday_stats.get(s["sheet"], (0, 0, 0))
        s["yesterday_videos"] = y_vids
        s["yesterday_ticked"] = y_ticked
        s["total_ticked"] = total_ticked
    gids = {t: sheet_id_of(svc, sid, t) for t in tabs.values()
            if not args.dry_run}
    merge = bool(args.account)
    rows = write_dashboard(svc, sid, dash, summaries, gids, args.dry_run,
                           merge=merge, order=full_order)
    n_dash = len(rows) - 5  # header + blank + Updated + timestamp + version
    print(("DRY " if args.dry_run else "") + "Dashboard written (%d account%s)."
          % (n_dash, "" if n_dash == 1 else "s"))
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
        print("%d rows would refresh, %d new video%s." % (upd, ins, "" if ins == 1 else "s"))
    else:
        print("%d rows refreshed, %d new video%s added on top." % (upd, ins, "" if ins == 1 else "s"))
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
    try:
        main()
    except KeyboardInterrupt:
        # Ctrl+C abort: finished accounts keep their writes (upsert by
        # Video ID, so a rerun converges); the Dashboard rewrite at the
        # end is skipped and redone next run. Exit 130 = SIGINT.
        print("Aborted by user - finished work kept, rerun to resume.")
        raise SystemExit(130)
