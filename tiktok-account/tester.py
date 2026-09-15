"""Local TikTok Display API tester — 127.0.0.1 only, stdlib only.

Flow (one OAuth per owned account):
  python tester.py --account DrSamhanWellness
  -> opens TikTok login -> Authorize video.list -> auto paginates
     POST /v2/video/list/ -> writes csvs/<account>_videos.csv

Secrets: NEVER hardcoded. Loads from env (TIKTOK_CLIENT_KEY /
TIKTOK_CLIENT_SECRET) or untracked .local_secrets.json in this folder.
"""
import argparse
import base64
import csv
import datetime
import hashlib
import html
import json
import os
import secrets
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
REDIRECT_URI = "http://127.0.0.1:8080/callback"
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
STATE = secrets.token_urlsafe(8)
_ALPH = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
CODE_VERIFIER = "".join(secrets.choice(_ALPH) for _i in range(64))
# Desktop Login Kit: hex encoding of SHA256 (not base64url)
CODE_CHALLENGE = hashlib.sha256(CODE_VERIFIER.encode()).hexdigest()
RESULT = {}

MYT = datetime.timezone(datetime.timedelta(hours=8))


def load_secrets():
    key = os.environ.get("TIKTOK_CLIENT_KEY", "")
    sec = os.environ.get("TIKTOK_CLIENT_SECRET", "")
    if key and sec:
        return key, sec
    path = os.path.join(HERE, ".local_secrets.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
        return d.get("client_key", ""), d.get("client_secret", "")
    return "", ""


def login_url(client_key, port=8080):
    q = urllib.parse.urlencode({
        "client_key": client_key,
        "scope": SCOPES,
        "response_type": "code",
        "redirect_uri": f"http://127.0.0.1:{port}/callback",
        "state": STATE,
        "code_challenge": CODE_CHALLENGE,
        "code_challenge_method": "S256",
    })
    return AUTH_URL + "?" + q


def post_json(url, payload, token=""):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, method="POST",
                                 headers={"Content-Type": "application/json"})
    if token:
        req.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def post_form(url, payload):
    data = urllib.parse.urlencode(payload).encode()
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def get_json(url, token):
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def fetch_all_videos(access_token):
    out, cursor, page = [], 0, 0
    while True:
        resp = post_json(VIDEO_LIST_URL,
                         {"max_count": 20, "cursor": cursor}, access_token)
        d = resp.get("data") or {}
        out.extend(d.get("videos") or [])
        page += 1
        print(f"  page {page}: got {len(d.get('videos') or [])} videos")
        if not d.get("has_more"):
            break
        cursor = d.get("cursor", 0)
        if page > 500:
            break
    return out


def to_myt(ts):
    try:
        dt_utc = datetime.datetime.fromtimestamp(int(ts),
                                                 tz=datetime.timezone.utc)
    except (TypeError, ValueError):
        return "", ""
    return (dt_utc.astimezone(MYT).strftime("%Y-%m-%d %H:%M:%S"),
            dt_utc.strftime("%Y-%m-%d %H:%M:%S"))


def save_csv(account, videos):
    os.makedirs(os.path.join(HERE, "csvs"), exist_ok=True)
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in account)
    path = os.path.join(HERE, "csvs", f"{safe}_videos.csv")
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["account", "id", "title", "posted_myt", "posted_utc",
                    "view_count", "like_count", "comment_count",
                    "share_count", "cover_image_url", "share_url"])
        for v in videos:
            myt, utc = to_myt(v.get("create_time"))
            w.writerow([account, v.get("id"), v.get("title"), myt, utc,
                        v.get("view_count"), v.get("like_count"),
                        v.get("comment_count"), v.get("share_count"),
                        v.get("cover_image_url"), v.get("share_url")])
    return path


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, body, code=200):
        b = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/":
            url = login_url(RESULT["client_key"], RESULT.get("port", 8080))
            self._send(f'<p>Account: <b>{html.escape(RESULT["account"])}</b></p>'
                       f'<p><a href="{html.escape(url)}">1) Login as @{html.escape(RESULT["account"])} on TikTok</a></p>'
                       "<p>After Authorize it returns here automatically.</p>")
        elif parsed.path == "/callback":
            qs = urllib.parse.parse_qs(parsed.query)
            if qs.get("state", [""])[0] != STATE:
                self._send("State mismatch. Restart tester.", 400)
                return
            code = qs.get("code", [""])[0]
            if not code:
                err = qs.get("error", ["cancelled"])[0]
                self._send(f"Login failed/cancelled: {html.escape(err)}", 400)
                return
            try:
                tok = post_form(TOKEN_URL, {
                    "client_key": RESULT["client_key"],
                    "client_secret": RESULT["client_secret"],
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": f"http://127.0.0.1:{RESULT.get('port', 8080)}/callback",
                    "code_verifier": CODE_VERIFIER,
                })
                access = tok.get("access_token", "") or (
                    tok.get("data") or {}).get("access_token", "")
                if not access:
                    raise ValueError(json.dumps(tok)[:300])
                print("Token OK, fetching user info + video list...")
                try:
                    me = get_json(USER_INFO_URL, access)
                    _md = me.get("data") or {}
                    _mu = _md.get("user") or _md
                    safe = "".join(c if c.isalnum() or c in "-_" else "_"
                                   for c in RESULT["account"])
                    ppath = os.path.join(HERE, "csvs", f"{safe}_profile.json")
                    os.makedirs(os.path.join(HERE, "csvs"), exist_ok=True)
                    with open(ppath, "w", encoding="utf-8") as _f:
                        json.dump(_mu, _f, ensure_ascii=False, indent=2)
                    print(f"  profile: @{_mu.get('username')} "
                          f"followers={_mu.get('follower_count')} "
                          f"videos={_mu.get('video_count')}")
                except Exception as e:  # noqa: BLE001 - profile optional
                    ppath = ""
                    print(f"  profile fetch skipped: {str(e)[:200]}")
                videos = fetch_all_videos(access)
                path = save_csv(RESULT["account"], videos)
                RESULT["done"] = path
                self._send(f"<h3>Done: {len(videos)} videos</h3>"
                           f"<p>Saved: {html.escape(path)}</p>"
                           + (f"<p>Profile: {html.escape(ppath)}</p>" if ppath else "")
                           + "<p>Repeat for next account: restart with --account &lt;name&gt;.</p>")
            except Exception as e:  # noqa: BLE001 - show error on page
                self._send(f"Error: {html.escape(str(e)[:500])}", 500)
        else:
            self._send("Not found", 404)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--account", required=True,
                    help="Account label, e.g. DrSamhanWellness")
    ap.add_argument("--port", type=int, default=8080)
    args = ap.parse_args()
    key, sec = load_secrets()
    if not key or not sec or "PASTE" in key:
        print("Missing keys. Set env TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_SECRET "
              "or create tiktok-account/.local_secrets.json "
              "(see .local_secrets.EXAMPLE.json). Never commit it.")
        raise SystemExit(2)
    RESULT.update(client_key=key, client_secret=sec, account=args.account,
                  port=args.port)
    print(f"Account: {args.account}")
    print(f"1) Open http://127.0.0.1:{args.port}/ in your browser")
    print("2) Click the TikTok login link, login + Authorize (video.list)")
    print("3) CSV lands in tiktok-account/csvs/ — one file per account")
    srv = HTTPServer(("127.0.0.1", args.port), H)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
