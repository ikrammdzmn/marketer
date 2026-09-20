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
import urllib.error
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

# Throttle: TikTok 429s big accounts when pages fire back-to-back.
# 1s gap + retry with backoff keeps 700-2000 video accounts working.
PAGE_DELAY = 1.0
MAX_RETRIES = 5


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


def _retry_wait(err, attempt):
    try:
        ra = err.headers.get("Retry-After") if getattr(err, "headers", None) else None
        if ra:
            return max(1.0, min(120.0, float(str(ra).split(",")[0].strip())))
    except (TypeError, ValueError):
        pass
    return min(60.0, 2.0 ** attempt)


def _http_body(err):
    try:
        return err.read().decode("utf-8", "replace")[:300]
    except Exception:  # noqa: BLE001
        return ""


def post_json(url, payload, token, on_wait=None):
    data = json.dumps(payload).encode()
    for attempt in range(MAX_RETRIES + 1):
        req = urllib.request.Request(url, data=data, method="POST",
                                     headers={"Content-Type": "application/json",
                                              "Authorization": "Bearer " + token})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            body = _http_body(e)
            if (e.code == 429 or 500 <= e.code < 600) and attempt < MAX_RETRIES:
                wait = _retry_wait(e, attempt)
                if on_wait:
                    try:
                        on_wait(wait, "HTTP %s" % e.code)
                    except Exception:  # noqa: BLE001 - progress must not break pulls
                        pass
                time.sleep(wait)
                continue
            raise Exception("HTTP Error %s: %s" % (e.code, body or e.reason))
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < MAX_RETRIES:
                wait = min(60.0, 2.0 ** attempt)
                if on_wait:
                    try:
                        on_wait(wait, "network")
                    except Exception:  # noqa: BLE001
                        pass
                time.sleep(wait)
                continue
            raise


def get_json(url, token, on_wait=None):
    for attempt in range(MAX_RETRIES + 1):
        req = urllib.request.Request(url, method="GET")
        req.add_header("Authorization", "Bearer " + token)
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            body = _http_body(e)
            if (e.code == 429 or 500 <= e.code < 600) and attempt < MAX_RETRIES:
                time.sleep(_retry_wait(e, attempt))
                continue
            raise Exception("HTTP Error %s: %s" % (e.code, body or e.reason))
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < MAX_RETRIES:
                time.sleep(min(60.0, 2.0 ** attempt))
                continue
            raise


def token_file(account):
    return os.path.join(TOKENS_DIR, safe(account) + ".json")


def load_token(account):
    p = token_file(account)
    if not os.path.exists(p):
        return None
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def save_token(account, tok, extra=None):
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
        "linked_as": (extra or {}).get("linked_as", prev.get("linked_as", "")),
        "mismatch": (extra or {}).get("mismatch", prev.get("mismatch", False)),
        "updated_at": now,
    }
    with open(token_file(account), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return data


def expected_username(account):
    """Expected TikTok @username for a slot from accounts.json (" if unset)."""
    try:
        for a in load_accounts():
            if a.get("name", "") == account:
                return (a.get("username", "") or "").strip()
    except Exception:  # noqa: BLE001 - accounts readable in practice
        pass
    return ""


def actual_identity(access):
    """Who just logged in: (username, display_name) via user/info."""
    me = get_json(USER_INFO_URL, access)
    md = me.get("data") or {}
    user = md.get("user") or md
    return ((user.get("username") or "").strip(),
            (user.get("display_name") or "").strip())


def slot_for_username(username, exclude=""):
    """Slot name whose expected username matches (case-insensitive)."""
    if not username:
        return ""
    try:
        for a in load_accounts():
            if a.get("name", "") != exclude and \
                    (a.get("username", "") or "").strip().lower() == username.lower():
                return a.get("name", "")
    except Exception:  # noqa: BLE001
        pass
    return ""


def linked_slot_for_username(username, exclude=""):
    """Slot already holding a token linked_as username (case-insensitive)."""
    if not username or not os.path.isdir(TOKENS_DIR):
        return ""
    for fn in os.listdir(TOKENS_DIR):
        if not fn.endswith(".json"):
            continue
        try:
            with open(os.path.join(TOKENS_DIR, fn), encoding="utf-8") as f:
                t = json.load(f)
        except (OSError, ValueError):
            continue
        if (t.get("linked_as") or "").strip().lower() != username.lower():
            continue
        for a in load_accounts():
            if token_file(a.get("name", "")) == os.path.join(TOKENS_DIR, fn) \
                    and a.get("name", "") != exclude:
                return a.get("name", "")
    return ""


class RelinkNeeded(Exception):
    pass


def clean_share(url):
    """Drop TikTok API tracking query (?utm_campaign=...) from share_url.

    The video address is scheme://host + path only; cover_image_url is
    NOT touched (its query holds the expiry signature).
    """
    if not url or not isinstance(url, str):
        return url
    try:
        p = urllib.parse.urlsplit(url)
    except ValueError:
        return url
    if not p.scheme or not p.netloc:
        return url
    return urllib.parse.urlunsplit((p.scheme, p.netloc, p.path, "", ""))


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


def _day_to_ts(day, end=False):
    """YYYY-MM-DD (MYT calendar day) -> unix ts. end=True gives 23:59:59."""
    try:
        y, m, d = (int(x) for x in str(day).split("-"))
        dt = datetime.datetime(y, m, d, 23, 59, 59) if end else datetime.datetime(y, m, d)
        return int(dt.replace(tzinfo=MYT).timestamp())
    except (TypeError, ValueError):
        return None


def pull_and_cache(account, access, since_ts=None, until_ts=None, max_videos=None,
                   on_progress=None, on_wait=None):
    """Paginate video/list with throttle + 429 retry.

    since_ts/until_ts are unix timestamps (create_time bounds). TikTok has
    no server-side date filter, but the list comes back newest-first, so we
    early-stop once items are older than since_ts. max_videos caps the fetch
    to the newest N videos. Range/limit pulls MERGE into the existing cache
    instead of replacing it; full pulls replace.
    Returns (user, merged, info).
    on_progress fires after every TikTok page with
    {"page": N, "fetched": M, "has_more": bool}; on_wait fires before
    every retry sleep with (seconds, reason). Both are best-effort.
    """
    me = get_json(USER_INFO_URL, access, on_wait=on_wait)
    md = me.get("data") or {}
    user = md.get("user") or md
    jp, _cp, _pp = cache_paths(account)
    existing = []
    if os.path.exists(jp):
        try:
            with open(jp, encoding="utf-8") as f:
                existing = (json.load(f) or {}).get("videos") or []
        except (OSError, ValueError):
            existing = []
    ranged = since_ts is not None or until_ts is not None
    limited = max_videos is not None and max_videos > 0
    out, cursor, page = [], 0, 0
    stopped_early, complete = False, False
    while True:
        resp = post_json(VIDEO_LIST_URL, {"max_count": 20, "cursor": cursor}, access,
                         on_wait=on_wait)
        d = resp.get("data") or {}
        batch = d.get("videos") or []
        for v in batch:
            try:
                ct = int(v.get("create_time", 0))
            except (TypeError, ValueError):
                ct = 0
            if until_ts is not None and ct and ct > until_ts:
                continue  # newer than window: skip but keep paging
            if since_ts is not None and ct and ct < since_ts:
                stopped_early = True  # older than window: done (newest-first)
                break
            out.append(v)
            if limited and len(out) >= max_videos:
                stopped_early = True  # reached newest-N cap
                break
        page += 1
        if on_progress:
            try:
                on_progress({"page": page, "fetched": len(out),
                             "has_more": bool(d.get("has_more")) and not stopped_early})
            except Exception:  # noqa: BLE001 - progress must not break pulls
                pass
        if stopped_early or not d.get("has_more") or page > 500:
            complete = not d.get("has_more") or stopped_early or page > 500
            break
        cursor = d.get("cursor", 0)
        time.sleep(PAGE_DELAY)
    if ranged or limited:
        by_id = {}
        for v in existing:
            if v.get("id"):
                by_id[v["id"]] = v
        for v in out:
            if v.get("id"):
                by_id[v["id"]] = v
        merged = sorted(by_id.values(),
                        key=lambda v: int(v.get("create_time") or 0),
                        reverse=True)
    else:
        merged = out
    for v in merged:
        if isinstance(v, dict) and v.get("share_url"):
            v["share_url"] = clean_share(v["share_url"])
    _write_cache(account, merged)
    _jp2, _cp2, pp = cache_paths(account)
    with open(pp, "w", encoding="utf-8") as f:
        json.dump(user, f, ensure_ascii=False, indent=2)
    return user, merged, {"fetched": len(out), "pages": page,
                          "ranged": ranged, "limited": limited,
                          "stopped_early": stopped_early,
                          "complete": complete}


def _write_cache(account, videos):
    """Write videos JSON + CSV cache. Returns (json_path, csv_path)."""
    os.makedirs(CSVS_DIR, exist_ok=True)
    jp, cp, _pp = cache_paths(account)
    with open(jp, "w", encoding="utf-8") as f:
        json.dump({"account": account, "cached_at": time.time(),
                   "count": len(videos), "videos": videos}, f, ensure_ascii=False)
    with open(cp, "w", newline="", encoding="utf-8-sig") as f:
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
    return jp, cp


def maybe_migrate_cache(account):
    """One-time cleanup for caches saved before link-trimming existed.

    Rewrites JSON + CSV only if a dirty share_url is found. Returns videos.
    """
    jp, _cp, _pp = cache_paths(account)
    if not os.path.exists(jp):
        return None
    try:
        with open(jp, encoding="utf-8") as f:
            d = json.load(f) or {}
    except (OSError, ValueError):
        return None
    videos = d.get("videos") or []
    dirty = False
    for v in videos:
        if isinstance(v, dict) and v.get("share_url"):
            clean = clean_share(v["share_url"])
            if clean != v["share_url"]:
                v["share_url"] = clean
                dirty = True
    if dirty:
        _write_cache(account, videos)
    return videos


def cache_fetched_at(account):
    """Unix ts of the last TikTok pull for an account, or None if never."""
    jp, _cp, _pp = cache_paths(account)
    if not os.path.exists(jp):
        return None
    try:
        with open(jp, encoding="utf-8") as f:
            ts = (json.load(f) or {}).get("cached_at")
        if ts:
            return float(ts)
    except (OSError, ValueError, TypeError):
        pass
    try:
        return os.path.getmtime(jp)
    except OSError:
        return None


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

    def _stream_refresh(self, name, access, since_ts, until_ts, max_videos):
        """Stream /refresh progress as NDJSON on the same connection.

        One JSON object per line: {"type":"progress",...} per TikTok page,
        {"type":"waiting",...} before retry sleeps, then a final
        {"type":"done",...} (or {"type":"error",...}). Works with the
        single-threaded server because no second request is needed.
        """
        self.send_response(200)
        self.send_header("Content-Type", "application/x-ndjson; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        closed = []

        def emit(obj):
            if closed:
                return
            try:
                self.wfile.write((json.dumps(obj, ensure_ascii=False) + "\n").encode())
                self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                closed.append(True)  # browser left; keep pulling so cache still saves

        def on_progress(p):
            emit({"type": "progress", "page": p.get("page", 0),
                  "fetched": p.get("fetched", 0),
                  "has_more": p.get("has_more", False)})

        def on_wait(seconds, reason):
            emit({"type": "waiting", "seconds": round(float(seconds), 1),
                  "reason": str(reason)[:60]})

        try:
            user, videos, info = pull_and_cache(name, access, since_ts, until_ts,
                                               max_videos, on_progress=on_progress,
                                               on_wait=on_wait)
        except Exception as e:  # noqa: BLE001
            emit({"type": "error", "error": str(e)[:300]})
            return
        emit({"type": "done", "ok": True, "count": len(videos),
              "fetched": info.get("fetched", len(videos)),
              "pages": info.get("pages", 0),
              "ranged": info.get("ranged", False),
              "limited": info.get("limited", False),
              "stopped_early": info.get("stopped_early", False),
              "followers": user.get("follower_count"),
              "username": user.get("username"),
              "fetched_at": cache_fetched_at(name)})

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
                              "linked": bool(t), "relink": relink,
                              "linked_as": (t or {}).get("linked_as", ""),
                              "mismatch": bool((t or {}).get("mismatch", False))})
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
                access = tok.get("access_token", "") or (tok.get("data") or {}).get("access_token", "")
                if not access:
                    raise ValueError("exchange gave no token")
                actual, display = actual_identity(access)
            except Exception as e:  # noqa: BLE001
                self._html("Token exchange failed: " + html.escape(str(e)[:300]), 500)
                return
            expected = expected_username(pend["account"])
            if not expected or not actual or actual.lower() == expected.lower():
                save_token(pend["account"], tok,
                           {"linked_as": actual, "mismatch": False})
                self.send_response(302)
                self.send_header("Location", "/?linked=" + urllib.parse.quote(pend["account"]))
                self.end_headers()
                return
            # Mismatch: save nothing. Park the token for an explicit override.
            cstate = secrets.token_urlsafe(16)
            PENDING[cstate] = {"confirm": True, "account": pend["account"],
                               "tok": tok, "actual": actual, "display": display,
                               "expected": expected}
            dup = linked_slot_for_username(actual, pend["account"])
            alt = slot_for_username(actual, pend["account"])
            body = "<h3>Wrong account?</h3><p>Slot <b>" + html.escape(pend["account"]) \
                + "</b> expects <b>@" + html.escape(expected) + "</b>, but you logged in as <b>@" \
                + html.escape(actual) + "</b>" \
                + (html.escape(" (" + display + ")") if display else "") + ". Nothing was saved.</p>"
            if dup:
                body += "<p><b>@" + html.escape(actual) + "</b> is already linked under slot <b>" \
                    + html.escape(dup) + "</b> — saving here will duplicate it.</p>"
            if alt:
                body += "<p><a href=\"/authorize?account=" + urllib.parse.quote(alt) \
                    + "\">Link @" + html.escape(actual) + " to its matching slot (" \
                    + html.escape(alt) + ") instead</a></p>"
            body += "<form method=\"POST\" action=\"/confirm-link\">" \
                "<input type=\"hidden\" name=\"state\" value=\"" + html.escape(cstate) + "\">" \
                "<label><input type=\"checkbox\" name=\"ack\" value=\"on\"> " \
                "I know this doesn't match — save anyway</label><br><br>" \
                "<button type=\"submit\">Save anyway</button></form>" \
                "<p><a href=\"/\">Cancel — back to accounts (fresh login needed)</a></p>"
            self._html(body, 409)
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
                videos = maybe_migrate_cache(name)
                if videos is None:
                    t = load_token(name)
                    self._json({"linked": bool(t), "cached": False})
                else:
                    self._json({"linked": True, "cached": True,
                                "count": len(videos), "videos": videos,
                                "fetched_at": cache_fetched_at(name)})
            return
        if parsed.path == "/refresh":
            name = qs.get("account", [""])[0]
            since_ts = _day_to_ts(qs.get("since", [""])[0]) if qs.get("since", [""])[0] else None
            until_raw = qs.get("until", [""])[0]
            until_ts = _day_to_ts(until_raw, end=True) if until_raw else None
            max_videos = None
            if qs.get("limit", [""])[0]:
                try:
                    max_videos = int(qs.get("limit", [""])[0])
                    if max_videos <= 0:
                        max_videos = None
                except (TypeError, ValueError):
                    max_videos = None
            try:
                access = ensure_access(name)
            except RelinkNeeded as e:
                self._json({"relink": True, "error": str(e)[:200]}, 401)
                return
            if qs.get("stream", [""])[0] == "1":
                self._stream_refresh(name, access, since_ts, until_ts, max_videos)
                return
            try:
                user, videos, info = pull_and_cache(name, access, since_ts, until_ts, max_videos)
            except Exception as e:  # noqa: BLE001
                self._json({"error": str(e)[:300]}, 500)
                return
            self._json({"ok": True, "count": len(videos),
                        "fetched": info.get("fetched", len(videos)),
                        "pages": info.get("pages", 0),
                        "ranged": info.get("ranged", False),
                        "limited": info.get("limited", False),
                        "stopped_early": info.get("stopped_early", False),
                        "followers": user.get("follower_count"),
                        "username": user.get("username"),
                        "fetched_at": cache_fetched_at(name)})
            return
        if parsed.path == "/unlink":
            name = qs.get("account", [""])[0]
            p = token_file(name)
            if os.path.exists(p):
                os.remove(p)
                self._json({"ok": True, "account": name})
            else:
                self._json({"ok": False, "error": "not linked"}, 404)
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

    def do_POST(self):  # noqa: C901 - tiny router
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/confirm-link":
            try:
                n = int(self.headers.get("Content-Length", "0"))
            except (TypeError, ValueError):
                n = 0
            form = urllib.parse.parse_qs(self.rfile.read(max(0, n)).decode("utf-8", "replace"))
            pend = PENDING.pop(form.get("state", [""])[0], None)
            if not pend or not pend.get("confirm"):
                self._html("State mismatch. Start again from / (Link button).", 400)
                return
            if form.get("ack", [""])[0] != "on":
                self._html("Tick the acknowledgment checkbox to save anyway, "
                           "or <a href=\"/\">cancel back to accounts</a>.", 400)
                return
            save_token(pend["account"], pend["tok"],
                       {"linked_as": pend.get("actual", ""), "mismatch": True})
            self.send_response(302)
            self.send_header("Location", "/?linked=" + urllib.parse.quote(pend["account"]))
            self.end_headers()
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
