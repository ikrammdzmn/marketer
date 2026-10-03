"""Shop OAuth helper — stdlib only, 127.0.0.1 only.

Seller-side flow (bypasses the Partner Testing-Tool path):
  python gmvmax-auto/shop_auth.py
1. Prints an authorize URL (contains App Key only - safe to open/share).
2. Listens on 127.0.0.1:8082 /callback for the TikTok redirect.
3. Exchanges the code LOCALLY via auth.tiktok-shops.com/api/v2/token/get
   and saves TIKTOK_SHOP1_ACCESS_TOKEN/REFRESH_TOKEN/SHOP_CIPHER
   (+ SHOP1_SHOP_ID) to .local_secrets.json. Secrets never print -
   key-names + lengths only.
"""

import json
import os
import secrets
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SECRETS = os.path.join(HERE, ".local_secrets.json")
REDIRECT = "http://localhost:8082/callback"
AUTH_PAGE = "https://services.tiktokshop.com/open/authorize"
TOKEN_URL = "https://auth.tiktok-shops.com/api/v2/token/get"


def load():
    with open(SECRETS, encoding="utf-8") as f:
        return json.load(f)


def main():
    sec = load()
    app_key = str(sec.get("SHOP_APP_KEY", ""))
    app_secret = str(sec.get("SHOP_APP_SECRET", ""))
    if not app_key or not app_secret:
        print("missing SHOP_APP_KEY/SECRET in .local_secrets.json")
        return
    state = secrets.token_urlsafe(16)
    url = (AUTH_PAGE + "?" + urllib.parse.urlencode(
        {"service_id": app_key, "state": state}))
    print("OPEN THIS URL IN YOUR BROWSER (log in as the MY seller):")
    print(url)
    print("listening on 127.0.0.1:8082/callback ... (Ctrl+C to stop)")

    from http.server import BaseHTTPRequestHandler, HTTPServer

    got = {}

    class H(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            got["code"] = (q.get("code") or [""])[0]
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
        print("no code captured (state mismatch or empty). Re-run.")
        return
    params = urllib.parse.urlencode({
        "app_key": app_key, "app_secret": app_secret,
        "auth_code": code, "grant_type": "authorized_code"})
    try:
        with urllib.request.urlopen(TOKEN_URL + "?" + params,
                                    timeout=20) as r:
            body = json.load(r)
    except Exception as e:
        print("token exchange failed: %s" % e)
        return
    if not isinstance(body, dict) or body.get("code") != 0:
        print("exchange error: %s" % str(body)[:300])
        return
    data = body.get("data", {}) or {}
    print("response keys: %s" % sorted(data.keys()))
    token = data.get("access_token", "")
    refresh = data.get("refresh_token", "")
    if not token:
        print("exchange returned no token: %s" % str(body)[:300])
        return
    shops = data.get("shops") or data.get("shop_list") or []
    cipher, shop_id = "", ""
    if isinstance(shops, list):
        for s in shops:
            if isinstance(s, dict) and (
                    str(s.get("id", "")) == "7495609155379170274"
                    or not shop_id):
                shop_id = str(s.get("id", ""))
                cipher = str(s.get("cipher", "") or s.get("shop_cipher", ""))
        print("shops in response: %d (saved first MY match or first)"
              % len(shops))
    if not cipher:
        cipher = str(data.get("cipher", "") or data.get("shop_cipher", ""))
    sec["TIKTOK_SHOP1_ACCESS_TOKEN"] = token
    if refresh:
        sec["TIKTOK_SHOP1_REFRESH_TOKEN"] = refresh
    if cipher:
        sec["TIKTOK_SHOP1_SHOP_CIPHER"] = cipher
    if shop_id:
        sec["TIKTOK_SHOP1_SHOP_ID"] = shop_id
    with open(SECRETS, "w", encoding="utf-8", newline="\n") as f:
        json.dump(sec, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("saved: ACCESS_TOKEN len=%d, REFRESH len=%d, CIPHER len=%d, SHOP_ID len=%d"
          % (len(token), len(refresh), len(cipher), len(shop_id)))


if __name__ == "__main__":
    main()
