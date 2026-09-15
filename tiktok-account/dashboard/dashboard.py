"""Local multi-account TikTok dashboard — 127.0.0.1 only, stdlib only.

One-time link per owned account (10 total), then select-and-view:
  python dashboard/dashboard.py            # owns port 8080; tester fallback uses --port
  -> open http://127.0.0.1:8080/ -> Link each account once (TikTok login +
     Authorize) -> pick from dropdown -> Refresh -> table + Export CSV.

Tokens: dashboard/tokens/<Account>.json (gitignored), auto-refreshed
(access ~24h, refresh ~1yr). Cache: dashboard/csvs/ (own folder, gitignored).
Account names are authoritative from
tiktok-creative-analysis/data/accounts.json (read-only, exact match).
"""
import argparse
import csv
import datetime
import hashlib
import html
import json
import os
import secrets
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
PARENT = os.path.dirname(HERE)
ACCOUNTS_PATH = os.path.abspath(os.path.join(
    PARENT, "..", "tiktok-creative-analysis", "data", "accounts.json"))
# When repo layout is <root>/tiktok-account/dashboard, PARENT is tiktok-account;
# accounts live at <root>/tiktok-creative-analysis/data/accounts.json:
if not os.path.exists(ACCOUNTS_PATH):
    ACCOUNTS_PATH = os.path.abspath(os.path.join(
        HERE, "..", "..", "tiktok-creative-analysis", "data", "accounts.json"))
TOKENS_DIR = os.path.join(HERE, "tokens")
CSVS_DIR = os.path.join(HERE, "csvs")

AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/"
TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"
VIDEO_LIST_URL = (
    "https://open.tiktokapis.com/v2/video/list/"
    "?fields=id,title,create_time,cover_image_url,share_url,"
    "view_count,like_count,comment_count,share_count"
)
USER_INFO_URL = (
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,"
    "avatar_url,avatar_url_100,avatar_large_url,display_name,"
    "bio_description,profile_deep_link,is_verified,username,"
    "follower_count,following_count,likes_count,video_count"
)
SCOPES = "user.info.basic,user.info.profile,user.info.stats,video.list"
_ALPH = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
MYT = datetime.timezone(datetime.timedelta(hours=8))

# state -> {account, verifier}; per-account pending OAuth (concurrent-safe).
PENDING = {}
PORT = 8080


def safe(name):
    return "".join(c if c.isalnum() or c in "-_" else "_" for c in name)


def load_accounts():
    with open(ACCOUNTS_PATH, encoding="utf-8") as f:
        return json.load(f)


def load_secrets():
    key = os.environ.get("TIKTOK_CLIENT_KEY", "")
    sec = os.environ.get("TIKTOK_CLIENT_SECRET", "")
    if key and sec:
        return key, sec
    for p in (os.path.join(PARENT, ".local_secrets.json"),
              os.path.join(HERE, ".local_secrets.json")):
        if os.path.exists(p):
            with open(p, encoding="utf-8") as f:
                d = json.load(f)
            return d.get("client_key", ""), d.get("client_secret", "")
    return "", ""


SECRETS = load_secrets()


def redirect_uri():
    return "http://127.0.0.1:%d/callback" % PORT


def post_form(url, payload):
    data = urllib.parse.urlencode(payload).encode()
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def post_json(url, payload, token):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, method="POST",
                                 headers={"Content-Type": "application/json",
                                          "Authorization": "Bearer " + token})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def get_json(url, token):
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def token_file(account):
    return os.path.join(TOKENS_DIR, safe(account) + ".json")


def load_token(account):
    p = token_file(account)
    if not os.path.exists(p):
        return None
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def save_token(account, tok):
    os.makedirs(TOKENS_DIR, exist_ok=True)
    now = time.time()
    access = tok.get("access_token", "") or (tok.get("data") or {}).get("access_token", "")
    refresh = tok.get("refresh_token", "") or (tok.get("data") or {}).get("refresh_token", "")
    prev = load_token(account) or {}
    if not refresh:
        refresh = prev.get("refresh_token", "")
    data = {
        "access_token": access,
        "refresh_token": refresh,
        "access_expires_at": now + int(tok.get("expires_in", 86400)) - 60,
        "refresh_expires_at": now + int(tok.get("refresh_expires_in", 31536000)) - 60,
        "open_id": tok.get("open_id", ""),
        "scope": tok.get("scope", ""),
        "updated_at": now,
    }
    with open(token_file(account), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return data


class RelinkNeeded(Exception):
    pass


def ensure_access(account):
    """Return a live access token, refreshing silently. Raise RelinkNeeded."""
    t = load_token(account)
    if not t or not t.get("refresh_token"):
        raise RelinkNeeded("not linked")
    now = time.time()
    if now >= t.get("refresh_expires_at", 0):
        raise RelinkNeeded("refresh expired — relink " + account)
    if t.get("access_token") and now < t.get("access_expires_at", 0):
        return t["access_token"]
    try:
        tok = post_form(TOKEN_URL, {
            "client_key": SECRETS[0],
            "client_secret": SECRETS[1],
            "grant_type": "refresh_token",
            "refresh_token": t["refresh_token"],
        })
    except Exception as e:  # noqa: BLE001 - expired/revoked refresh
        raise RelinkNeeded("refresh rejected (" + str(e)[:120] + ")")
    new_access = tok.get("access_token", "") or (tok.get("data") or {}).get("access_token", "")
    if not new_access:
        raise RelinkNeeded("refresh gave no token — relink " + account)
    save_token(account, tok)
    return new_access


def to_myt(ts):
    try:
        dt = datetime.datetime.fromtimestamp(int(ts), tz=datetime.timezone.utc)
    except (TypeError, ValueError):
        return "", ""
    return (dt.astimezone(MYT).strftime("%Y-%m-%d %H:%M:%S"),
            dt.strftime("%Y-%m-%d %H:%M:%S"))


def cache_paths(account):
    s = safe(account)
    return (os.path.join(CSVS_DIR, s + "_videos.json"),
            os.path.join(CSVS_DIR, s + "_videos.csv"),
            os.path.join(CSVS_DIR, s + "_profile.json"))


def pull_and_cache(account, access):
    me = get_json(USER_INFO_URL, access)
    md = me.get("data") or {}
    user = md.get("user") or md
    out, cursor, page = [], 0, 0
    while True:
        resp = post_json(VIDEO_LIST_URL, {"max_count": 20, "cursor": cursor}, access)
        d = resp.get("data") or {}
        out.extend(d.get("videos") or [])
        page += 1
        if not d.get("has_more") or page > 500:
            break
        cursor = d.get("cursor", 0)
    os.makedirs(CSVS_DIR, exist_ok=True)
    jp, cp, pp = cache_paths(account)
    with open(jp, "w", encoding="utf-8") as f:
        json.dump({"account": account, "cached_at": time.time(),
                   "count": len(out), "videos": out}, f, ensure_ascii=False)
    with open(cp, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["account", "id", "title", "posted_myt", "posted_utc",
                    "view_count", "like_count", "comment_count",
                    "share_count", "cover_image_url", "share_url"])
        for v in out:
            myt, utc = to_myt(v.get("create_time"))
            w.writerow([account, v.get("id"), v.get("title"), myt, utc,
                        v.get("view_count"), v.get("like_count"),
                        v.get("comment_count"), v.get("share_count"),
                        v.get("cover_image_url"), v.get("share_url")])
    with open(pp, "w", encoding="utf-8") as f:
        json.dump(user, f, ensure_ascii=False, indent=2)
    return user, out


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _json(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _html(self, body, code=200):
        b = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):  # noqa: C901 - small router
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        if parsed.path == "/":
            with open(os.path.join(HERE, "dashboard.html"), encoding="utf-8") as f:
                self._html(f.read())
            return
        if parsed.path == "/api/accounts":
            try:
                accs = load_accounts()
            except Exception as e:  # noqa: BLE001
                self._json({"error": str(e)[:200]}, 500)
                return
            rows = []
            for a in accs:
                name = a.get("name", "")
                t = load_token(name)
                relink = False
                if t and time.time() >= t.get("refresh_expires_at", 0):
                    relink = True
                rows.append({"name": name, "username": a.get("username", ""),
                             "linked": bool(t), "relink": relink})
            self._json({"accounts": rows})
            return
        if parsed.path == "/authorize":
            name = qs.get("account", [""])[0]
            try:
                names = [a.get("name", "") for a in load_accounts()]
            except Exception as e:  # noqa: BLE001
                self._html("accounts.json error: " + html.escape(str(e)[:200]), 500)
                return
            if name not in names:
                self._html("Unknown account. Pick from the dropdown.", 400)
                return
            verifier = "".join(secrets.choice(_ALPH) for _i in range(64))
            challenge = hashlib.sha256(verifier.encode()).hexdigest()
            state = secrets.token_urlsafe(16)
            PENDING[state] = {"account": name, "verifier": verifier}
            q = urllib.parse.urlencode({
                "client_key": SECRETS[0],
                "scope": SCOPES,
                "response_type": "code",
                "redirect_uri": redirect_uri(),
                "state": state,
                "code_challenge": challenge,
                "code_challenge_method": "S256",
            })
            self.send_response(302)
            self.send_header("Location", AUTH_URL + "?" + q)
            self.end_headers()
            return
        if parsed.path == "/callback":
            state = qs.get("state", [""])[0]
            pend = PENDING.pop(state, None)
            if not pend:
                self._html("State mismatch. Start again from / (Link button).", 400)
                return
            code = qs.get("code", [""])[0]
            if not code:
                self._html("Login failed/cancelled: "
                           + html.escape(qs.get("error", ["cancelled"])[0]), 400)
                return
            try:
                tok = post_form(TOKEN_URL, {
                    "client_key": SECRETS[0],
                    "client_secret": SECRETS[1],
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri(),
                    "code_verifier": pend["verifier"],
                })
                save_token(pend["account"], tok)
            except Exception as e:  # noqa: BLE001
                self._html("Token exchange failed: " + html.escape(str(e)[:300]), 500)
                return
            self.send_response(302)
            self.send_header("Location", "/?linked=" + urllib.parse.quote(pend["account"]))
            self.end_headers()
            return
        if parsed.path in ("/api/profile", "/api/videos"):
            name = qs.get("account", [""])[0]
            jp, _cp, pp = cache_paths(name)
            if parsed.path == "/api/profile":
                if os.path.exists(pp):
                    with open(pp, encoding="utf-8") as f:
                        self._json({"linked": True, "cached": True,
                                    "profile": json.load(f)})
                else:
                    t = load_token(name)
                    self._json({"linked": bool(t), "cached": False})
            else:
                if os.path.exists(jp):
                    with open(jp, encoding="utf-8") as f:
                        d = json.load(f)
                    self._json({"linked": True, "cached": True,
                                "count": d.get("count", 0),
                                "videos": d.get("videos", [])})
                else:
                    t = load_token(name)
                    self._json({"linked": bool(t), "cached": False})
            return
        if parsed.path == "/refresh":
            name = qs.get("account", [""])[0]
            try:
                access = ensure_access(name)
            except RelinkNeeded as e:
                self._json({"relink": True, "error": str(e)[:200]}, 401)
                return
            try:
                user, videos = pull_and_cache(name, access)
            except Exception as e:  # noqa: BLE001
                self._json({"error": str(e)[:300]}, 500)
                return
            self._json({"ok": True, "count": len(videos),
                        "followers": user.get("follower_count"),
                        "username": user.get("username")})
            return
        if parsed.path == "/export":
            name = qs.get("account", [""])[0]
            _jp, cp, _pp = cache_paths(name)
            if not os.path.exists(cp):
                self._html("No cache yet — press Refresh first.", 404)
                return
            with open(cp, "rb") as f:
                b = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "text/csv; charset=utf-8")
            self.send_header("Content-Disposition",
                             "attachment; filename=" + safe(name) + "_videos.csv")
            self.send_header("Content-Length", str(len(b)))
            self.end_headers()
            self.wfile.write(b)
            return
        self._html("Not found", 404)


def main():
    global PORT
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8080)
    args = ap.parse_args()
    PORT = args.port
    if not SECRETS[0] or not SECRETS[1] or "PASTE" in SECRETS[0]:
        print("Missing keys. Set env TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_SECRET "
              "or create tiktok-account/.local_secrets.json (untracked).")
        raise SystemExit(2)
    try:
        names = [a.get("name", "") for a in load_accounts()]
    except Exception as e:  # noqa: BLE001
        print("accounts.json error: " + str(e)[:200])
        raise SystemExit(2)
    print("Dashboard: %d accounts from accounts.json" % len(names))
    print("Open http://127.0.0.1:%d/ — Link each account once, then select + Refresh." % PORT)
    print("Tester fallback stays available: python tiktok-account/tester.py --account X --port 8081")
    srv = HTTPServer(("127.0.0.1", PORT), H)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
