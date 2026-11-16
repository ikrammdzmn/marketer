"""Seller-creative nightly backfill (Stage 1: manual runs; Stage 2: scheduler).

Pulls Shop Open API organic listing + product imp/clicks and upserts to Neon,
mirroring online/src/lib/seller-creative.ts semantics:
- per-day dual-sort walk (views + gmv), <100-view floor unless GMV > 0
- money-object unwrap (B142), post_time assumed MYT
- rewrite-on-revise upserts; imp survives listing-only syncs (COALESCE)
- account_class from creative.accounts (/accounts mapping), unregistered -> legacy regex
- stops cleanly at --max-minutes (for the 12:30am window)

Usage:
  python 2-gmvmax/gmvmax-auto/seller-backfill.py --days 2            # last 2 closed days
  python 2-gmvmax/gmvmax-auto/seller-backfill.py --start 2026-11-10 --end 2026-11-12
  python 2-gmvmax/gmvmax-auto/seller-backfill.py --days 7 --dry-run  # reads only, no writes
  python 2-gmvmax/gmvmax-auto/seller-backfill.py --days 7 --no-notify

Logs: seller-backfill.log beside this script (append) + stdout + Telegram digest.
Exit codes: 0 clean, 1 partial (some days failed), 2 fatal (token/DB down).
Secrets: env first, then gitignored .local_secrets.json (lengths-only in logs).
"""

import argparse
import datetime
import hashlib
import hmac
import json
import logging
import os
import re
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(HERE, "seller-backfill.log")
SHOP_ID = "7495609155379170274"
SHOP_BASE = "https://open-api.tiktokglobalshop.com"
PERF_PATH = "/analytics/202509/shop_videos/performance"
MAX_PAGES = 25
IMP_VIEW_FLOOR = 10000
MYT = datetime.timezone(datetime.timedelta(hours=8))

INTERNAL = {
    "dr.samhan", "affiliatedrsamhan1", "affiliatedrsamhan5",
    "himcoffeedrsamhan", "himcoffeebydrsamhan", "himcoffeebydrsamhan1",
    "himcoffeebydrsamhan2", "himcoffeebydrsamhan3", "drsamhanofficial",
    "drsamhanofficial3", "drsamhanofficial4", "drsamhanofficial8",
    "drsamhanstore", "drsamhansembangsihat", "drsamhaninfosihat",
}


def log_setup():
    lg = logging.getLogger("backfill")
    lg.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s", "%Y-%m-%d %H:%M:%S")
    fh = logging.FileHandler(LOG_FILE, encoding="utf-8")
    fh.setFormatter(fmt)
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    lg.handlers = [fh, sh]
    return lg


LOG = log_setup()


def load_secret(key, default=""):
    v = os.environ.get(key, "")
    if v:
        return v
    try:
        with open(os.path.join(HERE, ".local_secrets.json"), encoding="utf-8") as f:
            return json.load(f).get(key, default) or default
    except (OSError, ValueError):
        return default


def db_connect(db):
    import psycopg

    url = load_secret("NEON_URL_PROD" if db == "prod" else "NEON_URL_DEV")
    if not url:
        raise RuntimeError(f"missing {'NEON_URL_PROD' if db == 'prod' else 'NEON_URL_DEV'}")
    return psycopg.connect(url, connect_timeout=10)


def token_expiry_ms(updated_at, expire_in):
    try:
        base = datetime.datetime.fromisoformat(str(updated_at)).timestamp() * 1000
    except (ValueError, TypeError):
        base = float("nan")
    try:
        v = float(expire_in)
    except (TypeError, ValueError):
        return None
    if v <= 0:
        return None
    if v > 1e12:
        return v
    if v > 3e7:
        return v * 1000
    if base != base:  # NaN
        return None
    return base + v * 1000


def http_get(url, headers, timeout=30):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8", "replace")
        except Exception:
            body = ""
        return e.code, body


def refresh_token(app_key, app_secret, refresh_tok):
    qs = urllib.parse.urlencode({
        "app_key": app_key, "app_secret": app_secret,
        "grant_type": "refresh_token", "refresh_token": refresh_tok,
    })
    code, body = http_get(f"https://auth.tiktok-shops.com/api/v2/token/refresh?{qs}", {}, timeout=30)
    try:
        data = json.loads(body).get("data", {})
    except ValueError:
        raise RuntimeError(f"refresh non-JSON (HTTP {code})")
    if not data.get("access_token"):
        raise RuntimeError("refresh returned no access_token")
    return (data["access_token"], data.get("refresh_token"),
            data.get("expires_in", data.get("access_token_expire_in", 86400)))


def get_analytics_creds(con, dry_run):
    app_key = load_secret("SHOP_ANALYTICS_APP_KEY").strip().strip("'\"")
    app_secret = load_secret("SHOP_ANALYTICS_APP_SECRET").strip().strip("'\"")
    if not app_key or not app_secret:
        raise RuntimeError("missing SHOP_ANALYTICS_APP_KEY/SECRET")
    with con.cursor() as cur:
        cur.execute(
            "SELECT shop_id, access_token, refresh_token, shop_cipher,"
            " access_token_expire_in, updated_at"
            " FROM credentials.shop_analytics_tokens WHERE shop_id = %s",
            (SHOP_ID,))
        row = cur.fetchone()
    if not row:
        raise RuntimeError("no shop_analytics_tokens row (run 025 migration / Shop grants)")
    _, access_token, refresh_tok, shop_cipher, expire_in, updated_at = row
    if not shop_cipher:
        raise RuntimeError("no shop cipher — authorize the Analytics app via Shop grants first")
    exp = token_expiry_ms(updated_at, expire_in if expire_in is not None else 86400)
    if exp is not None and time.time() * 1000 >= exp - 3600_000 and refresh_tok and not dry_run:
        LOG.info("token near expiry, refreshing (old len=%d)", len(refresh_tok or ""))
        access_token, new_refresh, new_exp = refresh_token(app_key, app_secret, refresh_tok)
        with con.cursor() as cur:
            cur.execute(
                "UPDATE credentials.shop_analytics_tokens SET access_token = %s,"
                " refresh_token = %s, access_token_expire_in = %s, updated_at = now()"
                " WHERE shop_id = %s",
                (access_token, new_refresh or refresh_tok, new_exp, SHOP_ID))
        con.commit()
        LOG.info("token refreshed ok (new len=%d)", len(access_token))
    return app_key, app_secret, access_token, shop_cipher


def sign_shop_url(url, app_secret):
    decoded = urllib.parse.unquote(url)
    qidx = decoded.find("?")
    m = re.search(r"\.com(.*?)\?", decoded)
    path = m.group(1) if m else ""
    q = decoded[qidx + 1:] if qidx >= 0 else ""
    params = {}
    for pair in q.split("&"):
        eq = pair.find("=")  # first '=' — base64 page_tokens carry padding
        if eq < 0:
            continue
        params[pair[:eq]] = pair[eq + 1:]
    timestamp = str(int(time.time()) - 100)
    merged = dict(params)
    merged["timestamp"] = timestamp
    keys = sorted(k for k in merged if k not in ("app_secret", "token", "access_token", "sign"))
    sig_input = path + "".join(k + str(merged[k]) for k in keys)
    sig = hmac.new(app_secret.encode(), (app_secret + sig_input + app_secret).encode(),
                   hashlib.sha256).hexdigest()
    return sig, timestamp


def shop_get(path, qp, creds, tries=4):
    app_key, app_secret, access_token, shop_cipher = creds
    base = {"app_key": app_key, "shop_cipher": shop_cipher}
    base.update(qp)
    last_err = ""
    for i in range(tries):
        items = sorted(base.items())
        url_for_sign = SHOP_BASE + path + "?" + "&".join(
            f"{k}={urllib.parse.quote(str(v), safe='')}" for k, v in items)
        sig, ts = sign_shop_url(url_for_sign, app_secret)
        final = dict(base)
        final["sign"] = sig
        final["timestamp"] = ts
        url = SHOP_BASE + path + "?" + "&".join(
            f"{k}={urllib.parse.quote(str(v), safe='')}" for k, v in sorted(final.items()))
        code, txt = http_get(url, {"x-tts-access-token": access_token,
                                   "content-type": "application/json"}, timeout=45)
        try:
            body = json.loads(txt)
        except ValueError:
            raise RuntimeError(f"shop non-JSON (HTTP {code}): {txt[:120]}")
        if code == 429 or body.get("code") == 429:
            last_err = f"429 (attempt {i + 1})"
            if i < tries - 1:
                time.sleep(2 * 2 ** i)
                continue
            raise RuntimeError("shop 429, retries exhausted")
        if body.get("code") != 0:
            raise RuntimeError(f"shop code={body.get('code')}: {body.get('message', 'failed')}")
        return body.get("data") or {}
    raise RuntimeError(last_err or "shop GET failed")


def num(v):
    try:
        n = float(v) if isinstance(v, str) else float(v or 0)
    except (TypeError, ValueError):
        return 0
    return n if n == n else 0


def money(v):
    if isinstance(v, dict) and "amount" in v:
        return num(v.get("amount"))
    return num(v)


def parse_post_time(v):
    s = str(v or "").strip()
    if not s:
        return None
    if re.match(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$", s):
        s = s.replace(" ", "T") + "+08:00"
    try:
        d = datetime.datetime.fromisoformat(s)
    except ValueError:
        return None
    return d.astimezone(datetime.timezone.utc).isoformat()


def posted_from_id(video_id):
    s = str(video_id or "").strip()
    if not re.match(r"^\d{15,22}$", s):
        return None
    try:
        ts = int(s) >> 32
    except ValueError:
        return None
    if ts <= 0:
        return None
    return (datetime.datetime.fromtimestamp(ts + 8 * 3600, tz=datetime.timezone.utc)).isoformat()


def pick_rows(lst):
    out = []
    for r in lst:
        vid = str(r.get("video_id", r.get("id", "")) or "")
        if not vid:
            continue
        views = num(r.get("views", r.get("view_count")))
        g = r.get("gmv")
        gmv = None if g is None else money(g)
        if views < 100 and not (gmv is not None and gmv > 0):
            continue
        tags = [str(x).strip() for x in (r.get("hash_tags") or r.get("hashtags") or []) if str(x).strip()]
        prods = []
        for p in (r.get("products") or []):
            prods.append(p if isinstance(p, str) else str(p.get("name") or p.get("id") or ""))
        prods = [x for x in prods if x]
        username = (str(r.get("username") or "").strip() or None)
        out.append({
            "video_id": vid, "views": views,
            "ctr": None if r.get("click_through_rate") is None else num(r.get("click_through_rate")),
            "gmv": gmv,
            "sku_orders": None if r.get("sku_orders") is None else round(num(r.get("sku_orders"))),
            "username": username,
            "caption": (str(r.get("title") or "").strip()[:500] or None),
            "duration_s": (round(num(r.get("duration"))) or None),
            "hashtags": (" ".join(tags)[:500] or None),
            "products": (" | ".join(prods)[:500] or None),
            "posted_api": parse_post_time(r.get("video_post_time", r.get("post_time"))),
        })
    return out


def fetch_day(date_ge, date_lt, creds):
    seen = {}
    latest = None
    pages = 0
    for sort in ("views", "gmv"):
        page_token = ""
        thin = flat = 0
        for _ in range(MAX_PAGES):
            qp = {"start_date_ge": date_ge, "end_date_lt": date_lt,
                  "sort_field": sort, "page_size": "100"}
            if page_token:
                qp["page_token"] = page_token
            data = shop_get(PERF_PATH, qp, creds)
            if sort == "views" and pages == 0:
                latest = data.get("latest_available_date")
            lst = data.get("video_list") or data.get("videos") or []
            pages += 1
            min_views, sellers = float("inf"), 0
            for r in pick_rows(lst):
                prev = seen.get(r["video_id"])
                if prev is None:
                    seen[r["video_id"]] = r
                else:
                    for k in ("username", "caption", "duration_s", "hashtags", "products", "posted_api"):
                        if prev.get(k) is None and r.get(k) is not None:
                            prev[k] = r[k]
                min_views = min(min_views, r["views"])
                if (r["gmv"] or 0) > 0:
                    sellers += 1
            if sort == "views":
                thin = thin + 1 if min_views < 100 else 0
                if thin >= 2:
                    break
            else:
                flat = flat + 1 if sellers == 0 else 0
                if flat >= 2:
                    break
            page_token = str(data.get("next_page_token") or data.get("page_token") or "")
            if not page_token:
                break
            time.sleep(0.15)
    return list(seen.values()), latest, pages


def fetch_imp(video_id, date_ge, date_lt, creds):
    data = shop_get(f"{PERF_PATH.replace('/performance', '')}/{video_id}/products/performance",
                    {"start_date_ge": date_ge, "end_date_lt": date_lt}, creds)
    arr = data.get("products")
    if isinstance(arr, list):
        imp = clicks = 0
        has_i = has_c = False
        for p in arr:
            if p.get("product_impressions") is not None:
                imp += round(num(p.get("product_impressions")))
                has_i = True
            if p.get("product_clicks") is not None:
                clicks += round(num(p.get("product_clicks")))
                has_c = True
        return (imp if has_i else None, clicks if has_c else None)
    # fallback key scan
    cands = [data.get("performance"), data.get("data"), data]
    if isinstance(data.get("list"), list) and data["list"]:
        cands.append(data["list"][0])
    if isinstance(data.get("video_list"), list) and data["video_list"]:
        cands.append(data["video_list"][0])

    def pick(*keys):
        for c in cands:
            if not isinstance(c, dict):
                continue
            for k in keys:
                if c.get(k) is not None:
                    v = c[k]
                    if isinstance(v, dict) and "amount" in v:
                        return round(money(v))
                    n = num(v)
                    if n == n:
                        return round(n)
        return None

    return (pick("product_impressions", "product_impression", "impressions", "imp", "product_views"),
            pick("product_clicks", "product_click", "clicks", "click"))


def norm_user(u):
    return str(u or "").strip().lower().lstrip("@")


def legacy_class(username):
    u = norm_user(username)
    if not u:
        return "affiliate"
    if re.search(r"samhan|himcoffee", u):
        return "linked"
    if u in INTERNAL:
        return "internal"
    return "affiliate"


def load_class_map(con):
    try:
        with con.cursor() as cur:
            cur.execute("SELECT username, active, top_affiliate FROM creative.accounts")
            rows = cur.fetchall()
    except Exception as e:
        LOG.warning("accounts lookup failed (%s) — legacy regex fallback", e)
        return {}
    out = {}
    for username, active, top in rows:
        u = norm_user(username)
        if u:
            out[u] = "inactive" if active is False else ("top_affiliate" if top else "internal")
    return out


def upsert_day(con, date, rows, imp_by_id, dry_run):
    if dry_run or not rows:
        return len(rows)
    chunk = 500
    n = 0
    with con.cursor() as cur:
        for i in range(0, len(rows), chunk):
            part = rows[i:i + chunk]
            vals, args = [], []
            for r in part:
                imp = imp_by_id.get(r["video_id"], (None, None))[0]
                vals.append("(" + ", ".join(["%s"] * 7) + ")")
                args += [r["video_id"], date, r["views"],
                         None if r["ctr"] is None else r["ctr"],
                         r["gmv"], r["sku_orders"], imp]
            cur.execute(
                "INSERT INTO creative.video_day_organic"
                " (video_id, date, views, ctr, gmv, sku_orders, imp) VALUES "
                + ", ".join(vals) +
                " ON CONFLICT (video_id, date) DO UPDATE SET views = EXCLUDED.views,"
                " ctr = EXCLUDED.ctr, gmv = EXCLUDED.gmv, sku_orders = EXCLUDED.sku_orders,"
                " imp = COALESCE(EXCLUDED.imp, creative.video_day_organic.imp),"
                " synced_at = NOW()",
                args)
            n += len(part)
    con.commit()
    return n


def upsert_meta(con, rows, class_map, dry_run):
    if dry_run or not rows:
        return len(rows)
    chunk = 200
    n = 0
    with con.cursor() as cur:
        for i in range(0, len(rows), chunk):
            part = rows[i:i + chunk]
            vals, args = [], []
            for r in part:
                u = norm_user(r.get("username"))
                cls = class_map.get(u) if u and u in class_map else (
                    "affiliate" if u else legacy_class(r.get("username")))
                from_id = posted_from_id(r["video_id"])
                vals.append("(" + ", ".join(["%s"] * 11) + ")")
                args += [r["video_id"], r.get("username"), r.get("caption"), r.get("duration_s"),
                         r.get("hashtags"), r.get("products"), r.get("posted_api"), from_id,
                         cls, None, False]
            cur.execute(
                "INSERT INTO creative.video_meta (video_id, username, caption, duration_s,"
                " hashtags, products, posted_api, posted_from_id, account_class, cover_url, in_main1)"
                f" VALUES {', '.join(vals)} ON CONFLICT (video_id) DO UPDATE SET"
                " username = COALESCE(EXCLUDED.username, creative.video_meta.username),"
                " caption = COALESCE(EXCLUDED.caption, creative.video_meta.caption),"
                " duration_s = COALESCE(EXCLUDED.duration_s, creative.video_meta.duration_s),"
                " hashtags = COALESCE(EXCLUDED.hashtags, creative.video_meta.hashtags),"
                " products = COALESCE(EXCLUDED.products, creative.video_meta.products),"
                " posted_api = COALESCE(EXCLUDED.posted_api, creative.video_meta.posted_api),"
                " posted_from_id = COALESCE(creative.video_meta.posted_from_id, EXCLUDED.posted_from_id),"
                " account_class = COALESCE(EXCLUDED.account_class, creative.video_meta.account_class),"
                " cover_url = COALESCE(EXCLUDED.cover_url, creative.video_meta.cover_url),"
                " in_main1 = creative.video_meta.in_main1 OR EXCLUDED.in_main1,"
                " updated_at = NOW()",
                args)
            n += len(part)
    con.commit()
    return n


def send_tg(text):
    token = load_secret("TELEGRAM_BOT_TOKEN")
    chat = load_secret("TELEGRAM_CHAT_ID")
    thread = load_secret("TELEGRAM_THREAD_ID")
    if not token or not chat:
        LOG.warning("telegram skipped (no BOT_TOKEN/CHAT_ID)")
        return
    try:
        payload = {"chat_id": chat, "text": text}
        if thread:
            payload["message_thread_id"] = thread
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=urllib.parse.urlencode(payload).encode(),
            headers={"Content-Type": "application/x-www-form-urlencoded"})
        urllib.request.urlopen(req, timeout=20).read()
    except Exception as e:
        LOG.warning("telegram failed: %s", e)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=7)
    ap.add_argument("--start", default="")
    ap.add_argument("--end", default="")
    ap.add_argument("--db", choices=["prod", "dev"], default="prod")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--no-notify", action="store_true")
    ap.add_argument("--max-minutes", type=float, default=25)
    a = ap.parse_args()
    t0 = time.time()
    deadline = t0 + a.max_minutes * 60

    today = datetime.datetime.now(tz=MYT).date()
    if a.start and a.end:
        start_d = datetime.date.fromisoformat(a.start)
        end_d = datetime.date.fromisoformat(a.end)
    else:
        end_d = today - datetime.timedelta(days=1)
        start_d = end_d - datetime.timedelta(days=a.days - 1)
    days = []
    d = end_d
    while d >= start_d:  # newest-first
        days.append(d.isoformat())
        d -= datetime.timedelta(days=1)

    LOG.info("backfill start db=%s range=%s..%s dry_run=%s (deadline %.0f min)",
             a.db, start_d, end_d, a.dry_run, a.max_minutes)
    try:
        con = db_connect(a.db)
    except Exception as e:
        LOG.error("FATAL db connect: %s", e)
        if not a.no_notify:
            send_tg(f"🚨 seller-backfill: DB connect failed ({a.db}): {e}")
        return 2
    try:
        creds = get_analytics_creds(con, a.dry_run)
    except Exception as e:
        LOG.error("FATAL token: %s", e)
        if not a.no_notify:
            send_tg(f"🚨 seller-backfill: token failed: {e}")
        return 2
    LOG.info("token ok (len=%d)", len(creds[2]))
    class_map = load_class_map(con)
    LOG.info("class map: %d accounts", len(class_map))

    # latest_available guard: one overview call, skip newer days
    try:
        ov = shop_get("/analytics/202509/shop_videos/overview_performance",
                      {"start_date_ge": start_d.isoformat(),
                       "end_date_lt": (end_d + datetime.timedelta(days=1)).isoformat()}, creds)
        latest_av = ov.get("latest_available_date")
    except Exception as e:
        latest_av = None
        LOG.warning("overview probe failed (%s) — pulling all days anyway", e)
    if latest_av:
        LOG.info("latest_available_date=%s", latest_av)
        skipped = [x for x in days if x > latest_av]
        for x in skipped:
            LOG.info("skip %s (newer than latest_available)", x)
        days = [x for x in days if x <= latest_av]

    ok_days = fail_days = tot_vids = tot_imp = 0
    fails = []
    for day in days:
        if time.time() > deadline:
            LOG.warning("deadline reached, stopping (%d days left)", len(days) - ok_days - fail_days)
            break
        nxt = (datetime.date.fromisoformat(day) + datetime.timedelta(days=1)).isoformat()
        try:
            rows, _, pages = fetch_day(day, nxt, creds)
        except Exception as e:
            fail_days += 1
            fails.append(f"{day}: listing {e}")
            LOG.error("FAIL %s listing: %s", day, e)
            continue
        imp_by_id = {}
        for r in rows:
            if time.time() > deadline:
                break
            if r["views"] >= IMP_VIEW_FLOOR or (r["gmv"] or 0) > 0:
                try:
                    imp_by_id[r["video_id"]] = fetch_imp(r["video_id"], day, nxt, creds)
                    tot_imp += 1
                except Exception as e:
                    LOG.warning("imp miss %s %s: %s", day, r["video_id"], e)
        try:
            n = upsert_day(con, day, rows, imp_by_id, a.dry_run)
            # clicks need the date — second pass inside same transaction region
            if not a.dry_run and imp_by_id:
                with con.cursor() as cur:
                    for vid, (_, clicks) in imp_by_id.items():
                        if clicks is not None:
                            cur.execute(
                                "UPDATE creative.video_day_organic SET clicks = %s,"
                                " synced_at = NOW() WHERE video_id = %s AND date = %s",
                                (clicks, vid, day))
                con.commit()
            upsert_meta(con, rows, class_map, a.dry_run)
        except Exception as e:
            fail_days += 1
            fails.append(f"{day}: db {e}")
            LOG.error("FAIL %s db: %s", day, e)
            try:
                con.rollback()
            except Exception:
                pass
            continue
        ok_days += 1
        tot_vids += n
        LOG.info("OK %s videos=%d imp_filled=%d (pages n/a)", day, n,
                 sum(1 for v in imp_by_id.values() if v[0] is not None))
    dt = (time.time() - t0) / 60
    summary = (f"seller-backfill {'DRY' if a.dry_run else a.db}: {ok_days} day(s) ok,"
               f" {fail_days} failed, {tot_vids} video-days, {tot_imp} imp calls,"
               f" {dt:.1f} min")
    if fail_days or ok_days == 0:
        LOG.error("%s%s", summary, f" | {'; '.join(fails[:5])}" if fails else "")
    else:
        LOG.info(summary)
    if not a.no_notify and not a.dry_run:
        icon = "🚨" if (fail_days or ok_days == 0) else "✅"
        send_tg(f"{icon} {summary}" + (f"\n{'; '.join(fails[:3])}" if fails else ""))
    try:
        con.close()
    except Exception:
        pass
    return 0 if (fail_days == 0 and ok_days > 0) else 1


if __name__ == "__main__":
    sys.exit(main())
