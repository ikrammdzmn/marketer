---
name: telegram-rich
description: Telegram delivery rules for this repo (rich blocks, fallback chain, caps). Load before bot-message work.
---

# Telegram rich skill (repo-local, verified-only)

Bot API 10.1+ Rich Messages, live on owner's client (probe-verified 03–04 Oct
2026). Full catalog: gmvmax-auto `tg-rich-messages.md` (~100 classes);
message shapes: `telegram_message.md`. Self-deleting probe:
`/api/tg-probe` (`?keep=1` to eyeball).

## Send chain (hourly.ts + telegram.ts)

`sendRichMessage {html}` → rich-blocks → legacy HTML fallback. Content
reports `telegram_mode` (rich/legacy mix/false). Rich cap 32k, legacy
4096 chars — truncate + overflow line on every list message regardless.

## Verified shapes (use freely)

Paragraph (bold/string text), `heading` + `size`, `pre`, footer, divider,
math, list (`items:[{blocks}]`), blockquote variants, **table**
(`cells[][]`, striped + compact, `is_header` + align cells), details
(summary object/string/title), map, photo (public URL only).
Whole-cell bold for emphasis (`<b>` renders literally inside rich cells).
Stripes are desktop-only (flat on mobile) — kept anyway.

## Do NOT use (probed dead)

`header` block, `plain`-text, guessed type strings (`section_heading`,
`block_quotation` — discriminators are `heading`/`blockquote`, `size`
required, list items need `blocks[]`, map needs `location{}`, photo needs
media object). `\n` → `<br/>` for the rich pipe only (legacy keeps `\n`).

## Fail-open laws (bugs 32–34)

- Never put fallible media inside an all-or-nothing blocks send — covers
  travel as separate `sendPhoto` or not at all (one hiccup nuked a whole
  Product message while Live survived).
- Verify media URLs by content-type header (`image/*`) — `blob` URLs serve
  HTML; `raw.githubusercontent.com` serves bytes. Vercel-auth URLs block
  Telegram fetches (use `file_id` path).
- Replicate the caller's exact conditions when debugging (bare POST =
  what Telegram sends; `getWebhookInfo` names secret mismatches first).
- Webhook: re-copy secrets, never retype; `drop_pending_updates=true`
  on re-register (5 queued = 5 duplicate syncs).
- Webhook gone? `getUpdates` returning messages proves NO webhook
  (conflict error = active); `getWebhookInfo url:""` confirms. Bare
  `setWebhook` passes but the Vercel wall eats deliveries — `url=` must
  carry percent-encoded `?x-vercel-protection-bypass=`. (B73–74)

## Hourly message contract

3 messages/hour (📹 LIVE, 📦 Product, Total), group topic via
`message_thread_id` (`TELEGRAM_CHAT_ID` + optional `THREAD_ID`).
ON-filter on sends (dashboard keeps everything). Footnote: excluded-OFF
count + `status as of`. `/fetch` = day, `/fetch_hourly` = hour,
`/start` = solo-degrading health, unknown `/cmd` = hint. `chart:`
callback → inline trend photo. Emoji map + `PCT_*`/`STAGNANT_SPEND` consts
live in `hourly.ts` (🔥 top jump per type, ⚠️ cost≥RM5 zero GMV).

## Evidence index

B25–29 (caps/timeouts/webhooks), B32–34 (rich), Checkpoint 8–10 —
gmvmax-auto `DEV_NOTES.md`.
