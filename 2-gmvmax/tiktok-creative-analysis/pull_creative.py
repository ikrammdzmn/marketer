"""Pull creative allowlist + targets from Neon into this tool's data/ files.

Direction: online (Neon, edited at /accounts) -> local JSON files. The online
side stays the source of truth; this script is a one-way mirror.

Read-only on the DB (SELECT only). Writes reuse server.py's own
validate/validate_targets/write_json, so pulled files always pass the local
Save gates (timestamped backup, LF, <=10 backups).

Needs a postgres driver + Neon URL:
  <python> -m pip install "psycopg[binary]"
  NEON_URL_PROD (or _DEV with --db dev) from env, ../gmvmax-auto/.local_secrets.json,
  or a local .local_secrets.json (all gitignored, never printed).

Usage:
  python pull_creative.py            # prod Neon -> data/
  python pull_creative.py --db dev   # dev Neon instead
  python pull_creative.py --dry-run  # print diff, write nothing
"""
import argparse
import copy
import datetime
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

import server as local_server  # reuse validate/validate_targets/write_json

try:
    sys.stdout.reconfigure(encoding="utf-8")  # names/notes may carry non-cp1252 chars
except Exception:
    pass

MYT = datetime.timezone(datetime.timedelta(hours=8))


def load_secret(key, default=""):
    """Env first, then gitignored secrets files. Never print values."""
    v = os.environ.get(key, "")
    if v:
        return v
    for path in (os.path.join(HERE, "..", "gmvmax-auto", ".local_secrets.json"),
                 os.path.join(HERE, ".local_secrets.json")):
        try:
            with open(os.path.normpath(path), encoding="utf-8") as f:
                v = json.load(f).get(key, default) or default
                if v:
                    return v
        except (OSError, ValueError):
            continue
    return default


def connect(db):
    url = load_secret("NEON_URL_PROD" if db == "prod" else "NEON_URL_DEV")
    if not url:
        sys.exit("error: %s missing (env, ../gmvmax-auto/.local_secrets.json,"
                 " or .local_secrets.json)" %
                 ("NEON_URL_PROD" if db == "prod" else "NEON_URL_DEV"))
    try:
        import psycopg
    except ImportError:
        try:
            import psycopg2 as psycopg  # type: ignore
        except ImportError:
            sys.exit("error: no postgres driver (pip install psycopg[binary])")
    return psycopg.connect(url, connect_timeout=10)


def fmt_stamp(v):
    """Neon timestamptz -> local 'YYYY-MM-DDTHH:MM:SS' wall time (MYT, like server.py)."""
    if v is None:
        return None
    if isinstance(v, datetime.datetime):
        if v.tzinfo is not None:
            v = v.astimezone(MYT)
        return v.strftime("%Y-%m-%dT%H:%M:%S")
    s = str(v).strip()
    return s[:19] if s else None


def read_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def main():
    ap = argparse.ArgumentParser(description="Mirror Neon creative accounts+targets into data/.")
    ap.add_argument("--db", choices=("prod", "dev"), default="prod",
                    help="which Neon branch to pull from (default: prod = live site)")
    ap.add_argument("--dry-run", action="store_true", help="print diff, write nothing")
    args = ap.parse_args()

    old_accounts = read_json(local_server.ACCOUNTS)
    old_targets = read_json(local_server.TARGETS)
    old_by_name = {}
    if isinstance(old_accounts, list):
        for o in old_accounts:
            if isinstance(o, dict) and o.get("name"):
                old_by_name[o["name"]] = o

    con = connect(args.db)
    try:
        with con.cursor() as cur:
            # identity_id deliberately not selected: the local tool has no such
            # field (and this also tolerates pre-022 DBs).
            cur.execute("SELECT name, username, account_id, note, active, live,"
                        " top_affiliate, position, updated_at"
                        " FROM creative.accounts ORDER BY position, name")
            acct_rows = cur.fetchall()
            try:
                cur.execute("SELECT top_n, min_impr, max_cpm FROM creative.targets WHERE id = 1")
                tgt_row = cur.fetchone()
            except Exception as e:
                print("warning: creative.targets unreadable (%s) — targets skipped" % e)
                tgt_row = None
    finally:
        con.close()

    accounts = []
    for r in acct_rows:
        name = (r[0] or "").strip()
        stamp = fmt_stamp(r[8])
        if stamp is None:
            prev = old_by_name.get(name)
            if prev is not None and isinstance(prev.get("updatedAt"), str) and prev["updatedAt"]:
                stamp = prev["updatedAt"]
            else:
                stamp = local_server._now_iso()
        accounts.append({"name": name, "username": (r[1] or "").strip(),
                         "accountId": (r[2] or "").strip(), "note": (r[3] or "").strip(),
                         "active": bool(r[4]) if r[4] is not None else True,
                         "live": bool(r[5]) if r[5] is not None else False,
                         "topAffiliate": bool(r[6]) if r[6] is not None else False,
                         "updatedAt": stamp})

    # Gate through the local saver's own validation (on a copy; stamps stay ours).
    err = local_server.validate(copy.deepcopy(accounts), old_accounts)
    if err:
        sys.exit("error: pulled accounts fail local validation: %s (fix online, re-pull)" % err)
    if len(accounts) > 100:
        sys.exit("error: %d accounts exceed local max 100" % len(accounts))

    norm_targets, terr = (None, "targets table missing")
    if tgt_row is not None:
        norm_targets, terr = local_server.validate_targets(
            {"topN": tgt_row[0],
             "minImpr": None if tgt_row[1] is None else int(tgt_row[1]),
             "maxCPM": None if tgt_row[2] is None else float(tgt_row[2])})
    if terr:
        print("warning: targets skipped: %s" % terr)

    # Diff report (lengths and names only, never secrets).
    new_by_name = {a["name"]: a for a in accounts}
    added = [n for n in new_by_name if n not in old_by_name]
    removed = [n for n in old_by_name if n not in new_by_name]
    changed = [n for n in new_by_name
               if n in old_by_name and any(new_by_name[n][k] != old_by_name[n].get(k)
                                           for k in ("username", "accountId", "note",
                                                     "active", "live", "topAffiliate"))]
    print("Neon (%s): %d accounts; local: %d" %
          (args.db, len(accounts), len(old_by_name)))
    print("added=%d %s" % (len(added), added))
    print("removed=%d %s" % (len(removed), removed))
    print("changed=%d %s" % (len(changed), changed))
    print("targets: local=%s pulled=%s" % (old_targets, norm_targets))
    if args.dry_run:
        print("dry-run: nothing written")
        return

    b1 = local_server.write_json(local_server.ACCOUNTS, "accounts", accounts)
    print("wrote %s (backup %s)" % (local_server.ACCOUNTS, b1))
    if norm_targets is not None:
        b2 = local_server.write_json(local_server.TARGETS, "targets", norm_targets)
        print("wrote %s (backup %s)" % (local_server.TARGETS, b2))


if __name__ == "__main__":
    main()
