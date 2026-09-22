"""Prod advertiser OAuth helper — stdlib only, 127.0.0.1 only.

Flow (run once per approval):
  python gmvmax-auto/prod_auth.py
1. Prints an authorize URL (contains App ID only — safe to open/share).
2. Listens on 127.0.0.1:8082 /callback for the TikTok redirect.
3. Exchanges auth_code for a prod access token LOCALLY and appends
   TIKTOK_PROD_ACCESS_TOKEN (+ advertiser id) to .local_secrets.json.
   Secrets never print — lengths only.

P0 read-only: token is used only for GETs (collector asserts ALLOW_WRITES=0).
"""

import json
import os
import secrets
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SECRETS = os.path.join(HERE, ".local_secrets.json")
REDIRECT = "http://localhost:8082/callback"
AUTH_PAGE = "https://business-api.tiktok.com/portal/auth"
TOKEN_URL = "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/"


def load():
    with open(SECRETS, encoding="utf-8") as f:
        return json.load(f)


def main():
    sec = load()
    app_id = str(sec.get("TIKTOK_APP_ID", ""))
    app_secret = str(sec.get("TIKTOK_APP_SECRET", ""))
    if not app_id or not app_secret:
        print("missing TIKTOK_APP_ID/SECRET in .local_secrets.json")
        return
    state = secrets.token_urlsafe(16)
    url = (AUTH_PAGE + "?" + urllib.parse.urlencode(
        {"app_id": app_id, "state": state, "redirect_uri": REDIRECT}))
    print("OPEN THIS URL IN YOUR BROWSER:")
    print(url)
    print("listening on 127.0.0.1:8082/callback ... (Ctrl+C to stop)")

    from http.server import BaseHTTPRequestHandler, HTTPServer

    got = {}

    class H(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            got["code"] = (q.get("auth_code") or [""])[0]
            got["state"] = (q.get("state") or [""])[0]
            body = b"OK - you can close this tab and return to the terminal."
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    srv = HTTPServer(("127.0.0.1", 8082), H)
    srv.handle_request()  # single callback, then exit listener
    code = got.get("code", "")
    if not code or got.get("state") != state:
        print("no auth_code captured (state mismatch or empty). Re-run.")
        return
    payload = json.dumps({
        "app_id": app_id, "secret": app_secret,
        "auth_code": code}).encode("utf-8")
    req = urllib.request.Request(TOKEN_URL, data=payload,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            body = json.load(r)
    except Exception as e:
        print("token exchange failed: %s" % e)
        return
    data = body.get("data", {}) if isinstance(body, dict) else {}
    token = data.get("access_token", "") if isinstance(data, dict) else ""
    adv = data.get("advertiser_ids", [""]) if isinstance(data, dict) else [""]
    if not token:
        print("exchange returned no token: %s" % str(body)[:200])
        return
    sec["TIKTOK_PROD_ACCESS_TOKEN"] = token
    if adv and adv[0]:
        sec["TIKTOK_PROD_ADVERTISER_ID"] = str(adv[0])
    with open(SECRETS, "w", encoding="utf-8", newline="\n") as f:
        json.dump(sec, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("saved: TIKTOK_PROD_ACCESS_TOKEN len=%d, advertiser len=%d"
          % (len(token), len(str(adv[0])) if adv and adv[0] else 0))


if __name__ == "__main__":
    main()
