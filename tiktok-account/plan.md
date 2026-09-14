# tiktok-account — bulk video + post-time via TikTok Display API

Status: SETUP (app in review; tester pending explicit "proceed")

## 1. Goal

- For each of the 10 managed accounts: bulk list of public videos + post time
  (`id, title, create_time, cover_image_url, share_url`) via official
  `POST /v2/video/list/` (`video.list` scope), paginated by `cursor` while
  `has_more=true`, exported to CSV/Excel.

## 2. Scope

- [x] Options explained; user picked Option 1 (official Display API, own accounts)
- [x] TikTok app form values: Category `Utilities`, description (<120 chars),
  Platforms `Web` only
- [x] `docs/terms.html` + `docs/privacy.html` published via GitHub Pages
  (live at `.../marketer/docs/terms.html`, `.../docs/privacy.html`)
- [x] GitHub Pages source `main`/`(root)` (tool + docs both live)
- [ ] Domain verification: verify URL-prefix `https://ikrammdzmn.github.io/marketer/`
  (3 `tiktok*.txt` live at root; `Domain`/DNS type impossible on github.io)
- [ ] TikTok app approved → user supplies Client Key
- [ ] Local OAuth + paginate-to-CSV tester (per-account tokens; UTC→MYT;
  secrets untracked) — ONLY on explicit "proceed"

## 3. Verify

- [x] Terms/privacy URLs open (200) before pasting into TikTok form
- [x] Verification file live: `.../marketer/tiktok22A2*.txt` fetched OK
- [ ] One account end-to-end: authorize → 1 page of videos → CSV with post times
