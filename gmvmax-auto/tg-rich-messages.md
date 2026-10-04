# tg-rich-messages.md — Bot API Rich Messages reference + probe status

Full catalog of the [Rich Messages](https://core.telegram.org/bots/api#rich-messages)
spec range (up to `InputRichBlockThinking`), one row per class with spec link and
our probe status. Legend: WORKS = rendered on owner's clients 04 Oct 2026 ·
PARTIAL = accepted but limited · FAILED = rejected with reason · NOT PROBED = untested.
Probe runner: `GET /api/tg-probe?keep=1`. Findings applied in `telegram_message.md`.

## Batch 1 — shells, methods, formatting (done 04 Oct)

Limits (all messages): 32,768 chars · 500 blocks · 16 nesting levels ·
50 media · 20 table columns.
Ref: https://core.telegram.org/bots/api#rich-message-formatting-options

| Class | Spec | Probe status | Notes |
|---|---|---|---|
| Markdown style (`markdown` field) | https://core.telegram.org/bots/api#rich-markdown-style | WORKS | `**bold** *italic* \`code\` [link](…)` rendered. `tg://photo\|video\|document\|audio?id=` reuses/uploads. |
| HTML style (`html` field) | https://core.telegram.org/bots/api#rich-html-style | WORKS | Our `{html}` fallback pipe uses it (`\n`→`<br/>`). |
| `RichMessage` | https://core.telegram.org/bots/api#richmessage | — | Received-side (`blocks[]` + `is_rtl`). What clients render; we send `Input*`. |
| `InputRichMessage` | https://core.telegram.org/bots/api#inputrichmessage | WORKS | Exactly one of `html`/`markdown`/`blocks`. `media[]` binds `tg://…?id=` links; `skip_entity_detection`, `is_rtl`. |
| `InputRichMessageMedia` | https://core.telegram.org/bots/api#inputrichmessagemedia | NOT PROBED | `{id, media}` — binds uploaded files to `tg://` links. |
| `sendRichMessage` | https://core.telegram.org/bots/api#sendrichmessage | WORKS | Our only send path (+fallbacks). Needs send-media rights when blocks carry media. |
| `sendRichMessageDraft` | https://core.telegram.org/bots/api#sendrichmessagedraft | NOT PROBED | 30s ephemeral streaming preview; final persist needs `sendRichMessage`. `thinking` lives here. |
| `RichMessageButton` / `RichTextButton` / `RichBlockButtons` | https://core.telegram.org/bots/api#richmessagebutton | NOT PROBED | 10.3 button row (`url`, `callback_data`, `web_app`, …). Untested — no report need yet. |
| `InputRichMessageContent` | https://core.telegram.org/bots/api#inputrichmessagecontent | NOT PROBED | Inline-query results only; previously-uploaded files only. |

Key spec discovery: `RichText` can be a plain String, an **Array of RichText**,
or a typed object — so partial-bold via `["prev → ", {type:"bold", text:"new"}]`
is plausible (our failed attempt used a nonexistent `"plain"` type).
Ref: https://core.telegram.org/bots/api#richtext — array-shape probe pending.

## Batch 2 — RichText inline (done 04 Oct, spec-sourced)

`RichText` = plain String, Array of RichText, or typed object — array form is the
partial-bold retry path (`["prev → ", {bold:new}]`; our failed attempt used a
nonexistent `"plain"` type).
Ref: https://core.telegram.org/bots/api#richtext

| Class | Shape | Spec | Probe status |
|---|---|---|---|
| Bold | `{type:"bold", text}` | https://core.telegram.org/bots/api#richtextbold | WORKS (cell/title text) |
| Italic | `{type:"italic", text}` | https://core.telegram.org/bots/api#richtextitalic | LOOSE (via html shorthand only) |
| Underline | `{type:"underline", text}` | https://core.telegram.org/bots/api#richtextunderline | LOOSE (via html shorthand only) |
| Strikethrough | `{type:"strikethrough", text}` | https://core.telegram.org/bots/api#richtextstrikethrough | LOOSE (via html shorthand only) |
| Spoiler | `{type:"spoiler", text}` | https://core.telegram.org/bots/api#richtextspoiler | NOT PROBED |
| DateTime | `{type:"date_time", text, unix_time, date_time_format}` | https://core.telegram.org/bots/api#richtextdatetime | NOT PROBED |
| TextMention | `{type:"text_mention", text, user}` | https://core.telegram.org/bots/api#richtexttextmention | NOT PROBED |
| Subscript | `{type:"subscript", text}` | https://core.telegram.org/bots/api#richtextsubscript | NOT PROBED |
| Superscript | `{type:"superscript", text}` | https://core.telegram.org/bots/api#richtextsuperscript | NOT PROBED |
| Marked | `{type:"marked", text}` (`==marked==`) | https://core.telegram.org/bots/api#richtextmarked | NOT PROBED |
| Code | `{type:"code", text}` | https://core.telegram.org/bots/api#richtextcode | LOOSE (via html shorthand only) |
| CustomEmoji | `{type:"custom_emoji", custom_emoji_id, alternative_text}` | https://core.telegram.org/bots/api#richtextcustomemoji | NOT PROBED |
| Math | `{type:"mathematical_expression", expression}` (LaTeX) | https://core.telegram.org/bots/api#richtextmathematicalexpression | NOT PROBED |
| Url | `{type:"url", text, url}` | https://core.telegram.org/bots/api#richtexturl | LOOSE (via html shorthand only) |
| EmailAddress | `{type:"email_address", text, email_address}` | https://core.telegram.org/bots/api#richtextemailaddress | NOT PROBED (auto-detect covers) |
| PhoneNumber | `{type:"phone_number", text, phone_number}` | https://core.telegram.org/bots/api#richtextphonenumber | NOT PROBED (auto-detect covers) |
| BankCardNumber | `{type:"bank_card_number", text, bank_card_number}` | https://core.telegram.org/bots/api#richtextbankcardnumber | NOT PROBED (auto-detect covers) |
| Mention | `{type:"mention", text, username}` | https://core.telegram.org/bots/api#richtextmention | NOT PROBED (auto-detect covers) |
| Hashtag | `{type:"hashtag", text, hashtag}` | https://core.telegram.org/bots/api#richtexthashtag | NOT PROBED (auto-detect covers) |
| Cashtag | `{type:"cashtag", text, cashtag}` | https://core.telegram.org/bots/api#richtextcashtag | NOT PROBED (auto-detect covers) |
| BotCommand | `{type:"bot_command", text, bot_command}` | https://core.telegram.org/bots/api#richtextbotcommand | NOT PROBED |
| Button (10.3) | `{type:"button", button}` | https://core.telegram.org/bots/api#richtextbutton | NOT PROBED |
| Anchor | `{type:"anchor", name}` | https://core.telegram.org/bots/api#richtextanchor | NOT PROBED |
| AnchorLink | `{type:"anchor_link", text, anchor_name}` (empty = top) | https://core.telegram.org/bots/api#richtextanchorlink | NOT PROBED |
| Reference | `{type:"reference", text, name}` | https://core.telegram.org/bots/api#richtextreference | NOT PROBED |
| ReferenceLink | `{type:"reference_link", text, reference_name}` | https://core.telegram.org/bots/api#richtextreferencelink | NOT PROBED |

## Batch 3 — RichBlock received (done 04 Oct, spec-sourced)

Received-side mirror of what clients render — not directly sendable (we send
`Input*`; send-side verdicts live in `telegram_message.md`).
Ref: https://core.telegram.org/bots/api#richblock

| Class | Fields of note | Spec |
|---|---|---|
| Caption | `text` + `credit` (`<cite>`) | https://core.telegram.org/bots/api#richblockcaption |
| TableCell | `text?` (omitted = invisible cell), `is_header`, `colspan`, `rowspan`, `align` (left/center/right), `valign` (top/middle/bottom) | https://core.telegram.org/bots/api#richblocktablecell |
| ListItem | `label`, `blocks[]`, `has_checkbox`, `is_checked`, ordered `value` + `type` (a/A/i/I/1) | https://core.telegram.org/bots/api#richblocklistitem |
| Paragraph | `type:"paragraph"` | https://core.telegram.org/bots/api#richblockparagraph |
| SectionHeading | `type:"heading"`, `size` 1–6 | https://core.telegram.org/bots/api#richblocksectionheading |
| Preformatted | `type:"pre"`, `language?` | https://core.telegram.org/bots/api#richblockpreformatted |
| Footer | `type:"footer"` | https://core.telegram.org/bots/api#richblockfooter |
| Divider | `type:"divider"` | https://core.telegram.org/bots/api#richblockdivider |
| Math | `type:"mathematical_expression"`, `expression` | https://core.telegram.org/bots/api#richblockmathematicalexpression |
| Anchor | `type:"anchor"`, `name` | https://core.telegram.org/bots/api#richblockanchor |
| List | `type:"list"`, `items[]` | https://core.telegram.org/bots/api#richblocklist |
| BlockQuotation | `type:"blockquote"`, `blocks[]`, `credit?` | https://core.telegram.org/bots/api#richblockblockquotation |
| ExpandableBlockQuotation | `type:"expandable_blockquote"`, `text`, `credit?` | https://core.telegram.org/bots/api#richblockexpandableblockquotation |
| PullQuotation | `type:"pullquote"`, `text`, `credit?` | https://core.telegram.org/bots/api#richblockpullquotation |
| Collage | `type:"collage"`, `blocks[]`, `caption?` (`<tg-collage>`) | https://core.telegram.org/bots/api#richblockcollage |
| Slideshow | `type:"slideshow"`, `blocks[]`, `caption?` (`<tg-slideshow>`) | https://core.telegram.org/bots/api#richblockslideshow |
| Table | `cells[][]`, `is_bordered?`, `is_striped?`, `is_compact?`, `caption?` | https://core.telegram.org/bots/api#richblocktable |
| Details | `summary`, `blocks[]`, `is_open?` | https://core.telegram.org/bots/api#richblockdetails |
| Map | `location`, `zoom`, `width`, `height` (received: all required), `caption?` | https://core.telegram.org/bots/api#richblockmap |
| Buttons | `buttons[]` (1–8), `align?` (`<tg-button-row>`) | https://core.telegram.org/bots/api#richblockbuttons |
| Animation | `animation`, `has_spoiler?`, `caption?` | https://core.telegram.org/bots/api#richblockanimation |
| Audio | `audio`, `caption?` | https://core.telegram.org/bots/api#richblockaudio |
| Document | `document`, `caption?` (`<tg-document>`) | https://core.telegram.org/bots/api#richblockdocument |
| Photo | `photo[]` sizes, `has_spoiler?`, `caption?` | https://core.telegram.org/bots/api#richblockphoto |
| Video | `video`, `has_spoiler?`, `caption?` | https://core.telegram.org/bots/api#richblockvideo |
| VoiceNote | `type:"voice_note"`, `voice_note`, `caption?` | https://core.telegram.org/bots/api#richblockvoicenote |
| Thinking | drafts-only | https://core.telegram.org/bots/api#richblockthinking |

## Batch 4 — InputRichBlock send (done 04 Oct)

Send-side union. Ref: https://core.telegram.org/bots/api#inputrichblock
Full per-shape evidence: `gmvmax-auto/telegram_message.md`.

| Class | Spec | Probe status |
|---|---|---|
| Paragraph | https://core.telegram.org/bots/api#inputrichblockparagraph | WORKS (daily use) |
| SectionHeading (`heading` + `size`) | https://core.telegram.org/bots/api#inputrichblocksectionheading | WORKS |
| Preformatted (`pre`) | https://core.telegram.org/bots/api#inputrichblockpreformatted | WORKS |
| Footer | https://core.telegram.org/bots/api#inputrichblockfooter | WORKS |
| Divider | https://core.telegram.org/bots/api#inputrichblockdivider | WORKS |
| Math (`expression`) | https://core.telegram.org/bots/api#inputrichblockmathematicalexpression | WORKS |
| Anchor (`name`) | https://core.telegram.org/bots/api#inputrichblockanchor | PARTIAL (invisible alone) |
| List (`items:[{blocks}]`) | https://core.telegram.org/bots/api#inputrichblocklist | WORKS |
| ListItem (`blocks[]`, checkbox?, ordered value/type?) | https://core.telegram.org/bots/api#inputrichblocklistitem | WORKS via list (checkbox/order variants NOT PROBED) |
| BlockQuotation (`blocks[]`, `credit?`) | https://core.telegram.org/bots/api#inputrichblockblockquotation | WORKS (`credit` NOT PROBED) |
| ExpandableBlockQuotation | https://core.telegram.org/bots/api#inputrichblockexpandableblockquotation | WORKS |
| PullQuotation | https://core.telegram.org/bots/api#inputrichblockpullquotation | WORKS |
| Collage (`blocks[]`, `caption?`) | https://core.telegram.org/bots/api#inputrichblockcollage | NOT PROBED |
| Slideshow (`blocks[]`, `caption?`) | https://core.telegram.org/bots/api#inputrichblockslideshow | NOT PROBED |
| Table (`cells[][]`, `is_bordered?`, `caption?`) | https://core.telegram.org/bots/api#inputrichblocktable | WORKS (`is_bordered`, `caption` NOT PROBED) |
| Details (`summary`, `blocks[]`, `is_open?`) | https://core.telegram.org/bots/api#inputrichblockdetails | WORKS (`is_open` NOT PROBED) |
| Map (`location`, `zoom?`, `width?`, `height?`) | https://core.telegram.org/bots/api#inputrichblockmap | WORKS |
| Buttons (10.3, 1–8, `align?`) | https://core.telegram.org/bots/api#inputrichblockbuttons | NOT PROBED |
| Animation (`InputMediaAnimation`) | https://core.telegram.org/bots/api#inputrichblockanimation | NOT PROBED |
| Audio (`InputMediaAudio`) | https://core.telegram.org/bots/api#inputrichblockaudio | NOT PROBED |
| Document (`InputMediaDocument`, 10.3) | https://core.telegram.org/bots/api#inputrichblockdocument | NOT PROBED |
| Photo (`InputMediaPhoto` `{type, media}`) | https://core.telegram.org/bots/api#inputrichblockphoto | WORKS (public URL; `file_id`/`attach://` variants NOT PROBED) |
| Video (`InputMediaVideo`) | https://core.telegram.org/bots/api#inputrichblockvideo | NOT PROBED |
| VoiceNote (`InputMediaVoiceNote`) | https://core.telegram.org/bots/api#inputrichblockvoicenote | NOT PROBED |
| Thinking | https://core.telegram.org/bots/api#inputrichblockthinking | FAILED (drafts-only) |
