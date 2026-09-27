# tg_bot - Telegram sender for aff-notify (group + topic)

Sends the same digest as `code.gs` to a Telegram group topic. `code.gs`
is untouched - this file reuses its globals (`findScopeEnd`, `dayKeys`,
`parseSheetDate`, `dateLabel`, `readF4`), so paste it into the SAME Apps
Script project.

## Setup (once)

1. `@BotFather` -> `/newbot` -> token. Message your bot `/start` (anywhere).
2. Create the group (members: only you), enable Topics, create the
   `Affiliate Digest` topic, add the bot as member (no admin needed).
3. Post "hi" in the topic, run `logThreadId()`, copy the logged
   `chat_id` / `thread` / `from_user` values.
4. Script Properties: `BOT_TOKEN`, `GROUP_ID`, `TOPIC_ID`, `MY_USER_ID`,
   `TG_STYLE` (`full`|`condensed`), `TG_ENABLED` (`1`|`0`).
5. Run `testTelegram()` - the FULL style lands in the topic. (Condensed
   stays available via `TG_STYLE` for scheduled runs.)
6. Run `installTelegramTriggers()` once for 9:30am/11am/2pm/4pm MYT.

## Behavior

- Same scope + rules as email (marker-derived rows, RUNNING priority /
  reminder, F4 ads queue, blank N skipped, block 3 excluded).
- Silent when empty (scheduled runs); tests always send.
- Every sent message starts with a megaphone mention of `MY_USER_ID`, so the
  ping fires even on quiet phones.
- Classic `sendMessage` + HTML tier: bold headers, emoji banners, tappable
  video links, one inline `Open sheet` button. No tables (API tier A).
- `MY_USER_ID` is stored, not yet enforced (used when commands arrive).
