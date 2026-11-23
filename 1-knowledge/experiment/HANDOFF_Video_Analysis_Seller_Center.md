# HANDOFF - Video analysis from TikTok Seller Center (for another AI)

Date written: 19 Nov 2026. Timezone: Asia/Kuala_Lumpur (GMT+08:00).
Shop: Dr Samhan (TikTok Shop Seller Center Malaysia). Creator in scope: `@dr.samhan` only.

Read this first, then read `SOP_Analisis_Video_Beg_Kuning_Dr_Samhan_A-Z.md` (same folder).
The SOP is a record of one earlier session, not a clean instruction set. This handoff says which
parts to follow and which to skip.

## 1. Goal

For the top videos of `@dr.samhan` in a chosen period:

1. Find which videos produced GMV and orders (Seller Center numbers, not guesses).
2. Watch each video (picture and sound) and write its real script: hook, body, proof, offer, CTA.
3. Explain why it may have worked, with evidence, and what to test next.
4. Never claim cause. Label every statement as evidence, interpretation, or test suggestion.

## 2. Who does what

| Step | Who |
|---|---|
| Log in to Seller Center (password, OTP, CAPTCHA) | The user, by hand. The AI never types or stores credentials. |
| Navigate Analytics, set filters, export, download | The AI (browser), read-only. |
| Watch/listen to the videos and write the analysis | The AI. |

Do not ask for, paste, or store cookies, passwords, tokens, or a browser profile folder.
Do not change any Seller Center setting, price, product, campaign, or budget.

## 3. What to follow from the SOP

Follow: sections A-P (scope, access, filters, export, Excel fix, video download), T (script
structure), U (metric formulas), V (cautious interpretation), W/X (per-video template and the
"why it won" writing rule), Y (new script draft, only if asked), Z (checklists), Appendix 1 (output fields).

Skip or adapt (they were Mac/session-specific): Q (Descript transcription), R (Swift/AVFoundation
frame extraction), S (Apple Vision OCR). If you can watch video and hear audio directly, use that
instead and say so. If you cannot, cut frames and transcribe locally, then label the transcript as
machine-made (it misheard Malay words in earlier tests).

Do not copy any number from the SOP as if it were current. Re-read everything from Seller Center.

## 3b. Defaults (confirm with the user if unclear)

- Period: last 30 days up to yesterday (example used: 19 Oct - 17 Nov 2026).
- Ranking: Video-attributed GMV, descending. Review the top 10 in detail.
- Report language: match the user (English or Malay).

## 4. Tested browser steps (worked on 18-19 Nov 2026)

Layout can change. Find the same function in the live UI if a label differs.

1. Open `https://seller-my.tiktok.com/compass/video-analytics/video-details?platform_data_source=shop&shop_region=MY`
   in a browser. User logs in. Confirm the top-right shop name is "Dr Samhan".
2. Path: Analytics > LIVE & video analytics > Video > Details. Not "LIVE > Details".
3. Date range: click the date box (default "Last 7 days"), choose **Custom**, click the back arrow
   once so October and November show, click the start day then the end day. Confirm the label
   reads "Custom: Oct 19, 2026 - Nov 17, 2026" and the table reloads. "Last 28 days" is not 30 days.
4. Creator: `@dr.samhan` is under the **Affiliate accounts** tab, not Linked accounts. Open the
   "Input creator name" dropdown. Type in the dropdown's OWN "Search" field (typing in the outer
   box gives "No results found"). Pick the exact result `dr.samhan`, then confirm every row shows `@dr.samhan`.
5. Export: click **Export**. A message like "You can try to choose another time period" can appear
   and does not prove the file is empty. Open the exported-reports icon (clipboard, right of Export).
   Reports stay downloadable for 7 days. Pick the report whose name time matches your export, not an old one. Click Download.
6. Read the xlsx with openpyxl: open `read_only=True, data_only=True`, call `reset_dimensions()`
   (the sheet claims to be 1 cell, but it holds all rows), header is on row 3, data from row 4.
   Earlier result for 19 Oct - 17 Nov: 314 rows, 314 unique Video IDs, 32 columns, creator `dr.samhan`.
   Sanity check: top video `7372860202367913232`, Video-attributed GMV RM11,050.27.
7. Videos: click a row's caption. It opens a player page on a TikTok CDN host. The page has one
   `<video>` element; its `currentSrc` is an https link. Download it with the same logged-in browser
   context (send `Referer: https://seller-my.tiktok.com/`). Result: a real mp4 with video and audio.
   The link is signed and expires. Do not copy it into notes.
8. Name each file by **Video ID** (`<video_id>.mp4`). Keep a small `mapping.csv` (rank, Video ID,
   file). Do not rely on download order (`download (3).mp4`), the SOP shows that is unreliable.

## 5. Things that do NOT work (do not retry)

- yt-dlp or any downloader on public TikTok URLs: for these videos it returns only an audio track
  (the sound or music, wrong length), never the picture. The seller-session player is what works.
- Official APIs: the Shop API has metrics and captions only (no video file, no cover). The Ads API
  endpoints for video files return a permission error.
- Do not use someone's Chrome cookies with a downloader script.

## 6. Analysis rules (from the SOP, repeated because they matter)

- Winning = sales performance in this scope. It is not profit, ROAS, or proof that the script caused sales.
- State denominators: CTOR = orders / product clicks; GPM = GMV / views x 1000; video CTR = product clicks / views.
- Say the click/order sample size next to any high rate.
- Caption is not dialogue. Packaging text is not dialogue. Quote only what you verified.
- Missing data: write "not available". Never fill zero.
- Health claims in the videos are the creator's claims, not verified facts. Flag them as a policy risk
  without judging the product.
- Comparisons between videos are observations, not A/B tests.

## 7. Output

Per video, use the SOP section X2 template:

- Identity: account, Video ID, posted date, duration, period.
- Numbers (from the export): GMV, orders, views, product clicks, CTOR, GPM, finish rate, used in ads.
- Script table: time | spoken | on-screen text | visual, split into HOOK / BODY / PROOF / OFFER / CTA.
- Why it may have worked: evidence, interpretation, test suggestion (three separate lines).
- Limits: what could not be seen or heard.

Then one summary: ranked table, the structures worth re-testing, and what the data cannot show.
Save files in a folder outside git, for example `Documents\video-analysis\<period>\`. Videos, the
xlsx and the browser profile never go into a git repo.

## 8. Known limits

- Whisper-type transcripts mis-hear Malay, especially numbers and prices. Verify against on-screen text.
- Frames sampled once per second can miss quick text or cuts.
- A scheduled, unattended run is not recommended: logins expire (OTP/CAPTCHA), the layout changes,
  and automating a seller account may be restricted by TikTok's terms. Run it on demand.

## 9. Finish checklist

- [ ] User logged in themselves; shop is Dr Samhan.
- [ ] Creator is exactly `@dr.samhan`; date range label verified.
- [ ] Export has the expected record count and unique Video IDs.
- [ ] Each mp4 is named by Video ID and matches its row (duration agrees with the export).
- [ ] Hook, body, proof, offer, CTA seen or heard, not inferred from the caption.
- [ ] Every claim is labelled evidence / interpretation / test suggestion.
- [ ] No credentials, cookies, signed links, or profile folders in any saved file.
