"""Validate our deterministic insight bullets vs Claude video_insight.json (810).

Reference window: 2026-10-01..2026-10-26 (Neon daily_rows) ~ their 1 Ogo..26 Okt
frozen medians. Compares only signals both sides can emit; subtitle-only
bullets (voice start, beg-kuning, script density) are unverifyable by design.
Exit 0 always (report, not gate); prints agreement rates + mismatch samples.
"""
import json
import re
import sys
import psycopg

START, END = "2026-10-01", "2026-10-26"
sec = json.load(open("2-gmvmax/gmvmax-auto/.local_secrets.json"))
INS = json.load(open("2-gmvmax/tiktok-creative-analysis/claude system/claude-system-updated"
                     "/creative-analisis/data/video_insight.json", encoding="utf-8"))


def pct(vals, p):
    s = sorted(vals)
    return s[min(len(s) - 1, int(p * len(s)))] if s else float("nan")


def main():
    con = psycopg.connect(sec["NEON_URL_PROD"])
    with con.cursor() as cur:
        cur.execute(
            "SELECT item_id, MAX(title), SUM(cost), SUM(gmv), SUM(orders), SUM(impressions),"
            " SUM(clicks), SUM(impressions*v2s)/NULLIF(SUM(impressions),0),"
            " SUM(impressions*vp25)/NULLIF(SUM(impressions),0),"
            " SUM(impressions*vp50)/NULLIF(SUM(impressions),0),"
            " SUM(impressions*vp75)/NULLIF(SUM(impressions),0),"
            " SUM(impressions*vp100)/NULLIF(SUM(impressions),0)"
            " FROM creative.daily_rows WHERE date >= %s AND date <= %s GROUP BY 1",
            (START, END))
        rows = cur.fetchall()
        cur.execute("SELECT item_id, posted_at FROM creative.item_meta")
        meta = {r[0]: r[1] for r in cur.fetchall()}
    con.close()
    ours = {}
    for r in rows:
        (iid, title, cost, gmv, orders, imp, clicks, r2, r25, r50, r75, r100) = r
        ours[str(iid)] = dict(title=title or "", cost=float(cost or 0), gmv=float(gmv or 0),
                              orders=int(orders or 0), imp=float(imp or 0),
                              clicks=float(clicks or 0), r2=r2, r25=r25, r50=r50,
                              r75=r75, r100=r100)
    ref = [v["r2"] for v in ours.values() if v["imp"] >= 500 and v["r2"] is not None]
    p25, p75 = pct(ref, 0.25), pct(ref, 0.75)
    print("reference: n=%d imp>=500 with r2, P25=%.3f P75=%.3f" % (len(ref), p25, p75))

    def bullets(v):
        hv = float(v["r2"]) if v["r2"] is not None else float("nan")
        tier = ("kuat" if hv >= p75 else "lemah" if hv <= p25 else "sedang") if hv == hv else None
        r50, r100 = v["r50"], v["r100"]
        endu = None
        if r50 and r50 > 0 and r100 is not None:
            reach = float(r100) / float(r50)
            endu = "kuat" if reach >= 0.38 else ("biasa" if reach >= 0.29 else "lepas")
        roi = v["gmv"] / v["cost"] if v["cost"] > 0 else None
        t = (v["title"] or "")
        return dict(tier=tier, endu=endu, roi8=(roi is not None and roi >= 8),
                    reply=bool(re.match(r"^\s*replying to @", t, re.I)),
                    authority=bool(re.search(r"doktor|\bdr\b|pakar", t, re.I)))

    def theirs(e):
        tx = " ".join(b[0] if isinstance(b, list) else b for k in ("h", "s", "w") for b in e.get(k, []))
        m = re.search(r"hook (kuat|sedang|sederhana|lemah)", tx)
        tier = {"sederhana": "sedang"}.get(m.group(1), m.group(1)) if m else None
        me = re.search(r"Daya tahan hujung: (\w+)|ramai tinggalkan di hujung|tonton habis (tinggi|rendah)", tx)
        endu = None
        if "ramai tinggalkan di hujung" in tx:
            endu = "lepas"
        elif "tonton habis tinggi" in tx or "Daya tahan hujung: kuat" in tx:
            endu = "kuat"
        elif "Daya tahan hujung: biasa" in tx:
            endu = "biasa"
        return dict(tier=tier, endu=endu,
                    roi8=("jauh melepasi" in tx),
                    reply=("balas komen" in tx or "reply to" in tx.lower()),
                    authority=("doktor" in tx or "authority" in tx))

    both = [e for e in INS if str(e.get("id")) in ours]
    print("overlap: %d / %d insight videos in Neon Oct window" % (len(both), len(INS)))
    for sig in ("tier", "endu", "roi8", "reply", "authority"):
        cov = agr = 0
        miss = []
        for e in both:
            a, b = bullets(ours[str(e["id"])])[sig], theirs(e)[sig]
            if a is None or b is None:
                continue
            cov += 1
            if a == b:
                agr += 1
            elif len(miss) < 5:
                miss.append((e["id"], a, b))
        print("%-9s coverage=%d agree=%d (%.0f%%)" % (sig, cov, agr, 100 * agr / max(1, cov)))
        for m in miss:
            print("   mismatch vid=%s ours=%s theirs=%s" % m)


if __name__ == "__main__":
    sys.exit(main())
