#!/usr/bin/env python3
"""Marketer local server: static files + validated accounts.json saver (stdlib only).

Usage:
    python server.py [port]        # default port 8000, binds 127.0.0.1 only

- Serves this folder over HTTP (same as `python -m http.server`).
- POST /api/accounts with a JSON array of {name, username, note} validates,
  backs up data/accounts.json, then writes it. Nothing else is writable.
- Do NOT expose this to a network: it has no auth and is meant for localhost.
"""
import glob
import json
import os
import sys
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")
ACCOUNTS = os.path.join(DATA_DIR, "accounts.json")
MAX_ENTRIES = 100
MAX_BACKUPS = 10


def validate(arr):
    """Return an error string, or None. Normalises entries in place."""
    if not isinstance(arr, list):
        return "body must be a JSON array"
    if len(arr) > MAX_ENTRIES:
        return "too many entries (max %d)" % MAX_ENTRIES
    seen = set()
    for i, e in enumerate(arr):
        tag = "entry %d" % (i + 1)
        if not isinstance(e, dict):
            return tag + " must be an object"
        name = e.get("name", "")
        username = e.get("username", "")
        note = e.get("note", "")
        if not isinstance(name, str) or not name.strip():
            return tag + " needs a name"
        if not isinstance(username, str) or not isinstance(note, str):
            return tag + ": username/note must be strings"
        if len(name) > 120 or len(username) > 60 or len(note) > 200:
            return tag + ": field too long (name<=120, username<=60, note<=200)"
        name = name.strip()
        if name in seen:
            return "duplicate name: " + name
        seen.add(name)
        arr[i] = {"name": name, "username": username.strip(), "note": note.strip()}
    return None


def prune_backups():
    backs = sorted(glob.glob(os.path.join(DATA_DIR, "accounts.backup-*.json")))
    for old in backs[:-MAX_BACKUPS] if len(backs) > MAX_BACKUPS else []:
        try:
            os.remove(old)
        except OSError:
            pass


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, *args):
        sys.stderr.write("[server] " + args[0] % args[1:] + "\n")

    def _json(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        # Fingerprint endpoint so the page can tell server.py apart from any
        # plain static server (which answers 404 HTML here instead of JSON).
        if urlparse(self.path).path == "/api/version":
            return self._json(200, {"ok": True, "server": "server.py", "version": 1})
        return super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/accounts":
            return self._json(404, {"ok": False, "error": "not found"})
        try:
            size = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            size = 0
        if size <= 0 or size > 1000000:
            return self._json(400, {"ok": False, "error": "bad body"})
        try:
            arr = json.loads(self.rfile.read(size).decode("utf-8"))
        except Exception:
            return self._json(400, {"ok": False, "error": "invalid JSON"})
        err = validate(arr)
        if err:
            return self._json(400, {"ok": False, "error": err})
        backup_name = None
        try:
            os.makedirs(DATA_DIR, exist_ok=True)
            if os.path.exists(ACCOUNTS):
                with open(ACCOUNTS, "rb") as f:
                    old = f.read()
                backup_name = "accounts.backup-%s.json" % time.strftime("%Y%m%d-%H%M%S")
                with open(os.path.join(DATA_DIR, backup_name), "wb") as f:
                    f.write(old)
                prune_backups()
            with open(ACCOUNTS, "w", encoding="utf-8", newline="\n") as f:
                json.dump(arr, f, ensure_ascii=False, indent=2)
                f.write("\n")
        except OSError as e:
            return self._json(500, {"ok": False, "error": "write failed: %s" % e})
        return self._json(200, {"ok": True, "entries": len(arr), "backup": backup_name})


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print("Serving %s at http://localhost:%d (localhost only)" % (ROOT, port))
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
