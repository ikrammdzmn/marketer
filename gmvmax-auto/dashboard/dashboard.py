"""P0 skeleton dashboard — stdlib only, 127.0.0.1 only.

Serves cache written by ../collector.py so UI works offline (Neon unreachable OK).
Shows: campaign picker (LIVE + PRODUCT stub), 30m/1h table, data-freshness
timestamp + DEV/PROD branch badge. Rules/approval UI stubbed grey (P1/P2).

Usage:
  python gmvmax-auto/dashboard/dashboard.py            # owns 8082
  python gmvmax-auto/dashboard/dashboard.py --port 8099  # smoke test, then kill
"""
import argparse
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CACHE_FILE = os.path.join(ROOT, "cache", "snapshots.jsonl")
HTML_FILE = os.path.join(HERE, "dashboard.html")


def branch():
    if os.environ.get("NEON_URL_PROD"):
        return "PROD"
    if os.environ.get("NEON_URL_DEV"):
        return "DEV"
    try:
        with open(os.path.join(ROOT, ".local_secrets.json"), encoding="utf-8") as f:
            sec = json.load(f)
        if sec.get("NEON_URL_PROD"):
            return "PROD"
        if sec.get("NEON_URL_DEV"):
            return "DEV"
    except (OSError, ValueError):
        pass
    return "LOCAL-FILE"


def load_snapshots(limit=200):
    rows = []
    try:
        with open(CACHE_FILE, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        rows.append(json.loads(line))
                    except ValueError:
                        continue
    except OSError:
        pass
    return rows[-limit:]


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, body, ctype="application/json", code=200):
        data = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urlparse(self.path).path
        if path in ("/", "/index.html"):
            try:
                with open(HTML_FILE, "rb") as f:
                    self._send(f.read(), "text/html; charset=utf-8")
            except OSError:
                self._send("dashboard.html missing", "text/plain", 500)
        elif path == "/api/health":
            rows = load_snapshots(1)
            self._send(json.dumps({
                "ok": True,
                "branch": branch(),
                "freshness": rows[-1].get("ts") if rows else None,
                "count": len(load_snapshots()),
            }))
        elif path == "/api/snapshots":
            self._send(json.dumps({"branch": branch(), "rows": load_snapshots()}))
        else:
            self._send("not found", "text/plain", 404)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8082)
    args = ap.parse_args()
    srv = HTTPServer(("127.0.0.1", args.port), Handler)
    print("gmvmax-auto dashboard on http://127.0.0.1:%d/ branch=%s" % (args.port, branch()))
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
