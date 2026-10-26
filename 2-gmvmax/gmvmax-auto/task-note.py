#!/usr/bin/env python3
"""task-note.py — agent write path for the shared task-notes channel.

Adds/lists rows in gmv.task_notes (migration 034) so dated TTAM reminders
land in the dashboard /calendar Task notes section. Owner writes via the UI;
this script is how the agent writes. Secrets never printed (lengths only).

  python task-note.py [--prod] list [--days 90]
  python task-note.py [--prod] add --date 2026-10-29 --kind ttam --title "..." [--body "..."]
"""
import argparse
import datetime
import json
import os
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
SECRETS = os.path.join(HERE, ".local_secrets.json")
KINDS = ("ttam", "gmv", "general")


def load_secret_url(prod):
    try:
        with open(SECRETS, encoding="utf-8-sig") as f:
            d = json.load(f)
    except Exception as e:
        print("secrets unreadable: %s" % e, file=sys.stderr)
        return None
    key = "NEON_URL_PROD" if prod else "NEON_URL_DEV"
    url = d.get(key)
    if not url:
        print("%s missing in secrets (present keys: %s)" % (key, sorted(d.keys())), file=sys.stderr)
        return None
    return url


def connect(prod):
    try:
        import psycopg  # optional; mirrors collector.py pattern
    except ImportError:
        try:
            import psycopg2 as psycopg  # type: ignore
        except ImportError:
            print("no postgres driver (pip install psycopg[binary])", file=sys.stderr)
            return None
    url = load_secret_url(prod)
    if not url:
        return None
    try:
        return psycopg.connect(url, connect_timeout=10)
    except Exception as e:
        print("connect failed: %s" % str(e)[:120], file=sys.stderr)
        return None


def cmd_list(args):
    con = connect(args.prod)
    if not con:
        return 1
    with con:
        with con.cursor() as cur:
            cur.execute(
                """SELECT id, date::text, title, kind, done, created_by
                   FROM gmv.task_notes
                   WHERE date >= (CURRENT_DATE - INTERVAL '30 days')
                     AND date <= (CURRENT_DATE + (%s || ' days')::interval)
                   ORDER BY date, id""",
                (str(args.days),),
            )
            rows = cur.fetchall()
    if not rows:
        print("no notes in window")
        return 0
    for r in rows:
        mark = "x" if r[4] else " "
        print("[%s] %s | %s | %s | by %s (id %s)" % (mark, r[1], r[3], r[2], r[5], r[0]))
    return 0


def cmd_add(args):
    try:
        datetime.date.fromisoformat(args.date)
    except ValueError:
        print("bad --date, use YYYY-MM-DD", file=sys.stderr)
        return 1
    if args.kind not in KINDS:
        print("bad --kind, use ttam|gmv|general", file=sys.stderr)
        return 1
    if not args.title.strip():
        print("empty --title", file=sys.stderr)
        return 1
    con = connect(args.prod)
    if not con:
        return 1
    with con:
        with con.cursor() as cur:
            cur.execute(
                """INSERT INTO gmv.task_notes (date, title, body, kind, created_by)
                   VALUES (%s::date, %s, %s, %s, 'agent')
                   RETURNING id""",
                (args.date, args.title.strip(), (args.body or "").strip(), args.kind),
            )
            nid = cur.fetchone()[0]
        con.commit()
    print("added id %s for %s" % (nid, args.date))
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prod", action="store_true", help="use NEON_URL_PROD (default DEV)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    l = sub.add_parser("list")
    l.add_argument("--days", type=int, default=90)
    a = sub.add_parser("add")
    a.add_argument("--date", required=True)
    a.add_argument("--title", required=True)
    a.add_argument("--kind", default="ttam", choices=KINDS)
    a.add_argument("--body", default="")
    args = ap.parse_args()
    if args.cmd == "list":
        return cmd_list(args)
    return cmd_add(args)


if __name__ == "__main__":
    sys.exit(main())
