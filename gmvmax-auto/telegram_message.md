# telegram_message.md — Telegram Rich Messages (Bot API 10.1+)

How hourly/daily reports reach the group topic, and which rich shapes actually render.
Probe endpoint: `gmvmax-auto/online/src/app/api/tg-probe/route.ts` (`GET /api/tg-probe`,
`?keep=1` leaves messages for eyeball checks, default self-deletes).
Sender: `gmvmax-auto/online/src/lib/telegram.ts` (`sendTelegramFull`).
Hourly builder: `gmvmax-auto/online/src/lib/hourly.ts` (`buildBlocks` + `summarize` fallback).
Daily builder: `gmvmax-auto/online/src/lib/daily.ts`.

## Send chain (do not reorder)

1. `sendRichMessage {blocks}` → 2. `sendRichMessage {html}` (`\n` → `<br/>`, legacy keeps `\n`) → 3. legacy `sendMessage` (HTML parse_mode).
   A failed blocks-shape falls through automatically — a bad guess never kills the message.

## Works (verified live on owner's clients, 04 Oct 2026)

Used in reports today: `paragraph`, `table` (`striped+compact`, `is_header` + `align` cells),
`details` (all 3 summary shapes), `divider`, `markdown`/`html` shorthand (fallback pipe).

| Shape | Notes | Spec ref |
|---|---|---|
| `paragraph` | Title + totals paragraphs. | https://core.telegram.org/bots/api#inputrichblockparagraph |
| `table` | Movers/steady/account tables. Stripes **desktop only**; mobile flat (wallpaper bleed). Kept `striped+compact`. | https://core.telegram.org/bots/api#inputrichblocktable |
| `details` | Steady + Earlier-today collapsibles. | https://core.telegram.org/bots/api#inputrichblockdetails |
| `divider` | | https://core.telegram.org/bots/api#inputrichblockdivider |
| `footer` | Small footer text — candidate for totals footers. | https://core.telegram.org/bots/api#inputrichblockfooter |
| `markdown` / `html` shorthand | Bold/italic/code/link rendered. `{html}` is our fallback pipe already. | https://core.telegram.org/bots/api#sendrichmessage |
| `heading` (`size` 1–6) | Round 2 verified. | https://core.telegram.org/bots/api#inputrichblocksectionheading |
| `pre` | Mono block with copy button. | https://core.telegram.org/bots/api#inputrichblockpreformatted |
| `blockquote` (`blocks[]`) | Side-bar quote. | https://core.telegram.org/bots/api#inputrichblockblockquotation |
| `expandable_blockquote` | Collapsible quote. | https://core.telegram.org/bots/api#inputrichblockexpandableblockquotation |
| `pullquote` | Centered quote. | https://core.telegram.org/bots/api#inputrichblockpullquotation |
| `list` (`items:[{blocks:[paragraph]}]`) | Bullets rendered. | https://core.telegram.org/bots/api#inputrichblocklist |
| `mathematical_expression` (`expression`, LaTeX) | Rendered `E=mc²`. | https://core.telegram.org/bots/api#inputrichblockmathematicalexpression |
| `map` (`location:{latitude,longitude}`) | Accepted. | https://core.telegram.org/bots/api#inputrichblockmap |
| `photo` (`photo:{type:"photo", media:URL}`) | Accepted; public URLs fetched directly, no `file_id` needed. Only Vercel-protected `public/` URLs are blocked — use external hosts for report images. | https://core.telegram.org/bots/api#inputrichblockphoto |

## Partially (accepted but limited)

| Shape | Limitation |
|---|---|
| Cell HTML string (`<b>` in table cell text) | `ok:true` but clients show raw tags — never use for emphasis. Whole-cell bold is the max; partial-bold lives in legacy HTML fallback only. |
| `anchor` (`name` only) | `RICH_MESSAGE_EMPTY` alone — invisible jump target, renders nothing by itself. Needs link/content pairing; no report use. https://core.telegram.org/bots/api#inputrichblockanchor |
| Table stripes | Desktop-only; mobile ignores (see client notes). |

## Not working

| Shape | Reason |
|---|---|
| `header` block | Rejected (03 Oct probe). |
| Paragraph/cell text as segment arrays | `Unsupported rich text type` — no such RichText form. |
| `thinking` | `RICH_MESSAGE_BLOCK_UNSUPPORTED` — drafts/streaming only (`sendRichMessageDraft`). https://core.telegram.org/bots/api#inputrichblockthinking |
| `TextQuote` | Not a rich block — reply-quote object (`Message.quote`). Rich quoting = `blockquote`/`pullquote`. https://core.telegram.org/bots/api#textquote |
| Guessed strings (`section_heading`, `preformatted`, `block_quotation`, `pull_quotation`, `expandable_block_quotation`, flat `{items:[{text}]}`, flat map lat/lon, URL-string photo) | Wrong shapes — superseded by round-2 corrections above. |

## Client notes (owner-verified)

- Mobile renders tables flat (no stripes) with wallpaper showing through; desktop shows stripes.
- Wide 6-col tables need sideways scroll on mobile (fine) but clip/wrap on desktop — short names (`Bracket …tail`) mitigate.
- `?keep=1` probe messages must be hand-deleted in the topic.
