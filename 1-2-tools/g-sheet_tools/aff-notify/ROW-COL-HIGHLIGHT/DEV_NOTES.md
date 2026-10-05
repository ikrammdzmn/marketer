# DEV_NOTES - ROW-COL-HIGHLIGHT handoff (03 Oct 2026)

## Vibe
Owner ran fast and terse: "read code.gs, what does it do" -> "ok fix it" ->
"explain like i'm 5" -> lag complaint -> "go" -> Tampermonkey detour
("bigger lines", "toggle on/off, draggable") -> then pivoted to shop hourly.
03 Oct session: "use in all google sheet" -> v1.2 -> "what features?" ->
"colour and thickness in popup?" -> v1.3 (SET popup + row-only) ->
"explain freeze line" -> "can i change hotkey in pill?" -> v1.4 (FREEZE +
remappable Alt+R). Plan-mode interludes between builds - keep plans short,
one question max, build on "go". Short replies, confirm-then-build, working
artifacts over explanations. ELI5 mode works when they ask simply.

## Facts
- `code.gs`: bound-script crosshair for `Affiliate Collection ` (trailing
  space). `onSelectionChange` is a SIMPLE trigger - no install needed; a
  manual run once only grants scopes. Scope = rows 9..2nd `end` in col B
  via `findScopeEnd` (same shape as `aff-notify/code.gs`), paint is
  scope-only (row A:O + col 9:lastRow, `#ffff00`), same-cell clicks skip.
- `crosshair.user.js` v1.1 (Tampermonkey, Sheets pages only): instant
  cursor-following lines (`LINE_PX = 8`) + draggable ON/OFF pill
  (localStorage persist). Lines only - Sheets grid is canvas, no userscript
  can paint real cells; cell fill stays in `code.gs`.
- v1.2 (03 Oct 2026): tab gate removed - runs on ALL Google Sheets/tabs,
  renamed `Google Sheets Crosshair`. No `code.gs` change (still bound
  Affiliate paint, deprecated).
- v1.3 (03 Oct 2026): SET popup on pill (color swatches + thickness slider,
  localStorage persisted) + row-only mode toggle (hides vertical line).
- v1.4 (03 Oct 2026): FREEZE button + hotkey (default `Alt+R`, remappable
  via SET HOTKEY in popup, Alt/Shift combos only) pins the horizontal line
  at last cursor height; press again to release. Freeze is session-only.
- `Tampermonkey.md`: built list + 13 possible features + will-not-do list.

## Bugs fixed (all mine or inherited, all fixed same session)
1. **Hardcoded `A8:O47` scope.** Inserts push the 2nd `end` past row 47 and
   new rows silently lose highlight. Fix: marker-derived `findScopeEnd`.
   LESSON: same fixed-cap-rot lesson as aff-notify - never hardcode end rows
   when junk/markers live below.
2. **`deleteAllProperties()` nuke.** Original restore wiped ALL script
   properties - would have deleted `tg_bot` keys (`BOT_TOKEN`, `GROUP_ID`,
   ...). Fix: per-key `deleteProperty` via `clearHighlightState`.
   LESSON: never broad-delete shared storage; check sibling scripts first.
3. **Laggy crosshair.** Full-row + full-column reads/writes (~1000 cells) +
   Properties JSON per click. Fix: scope-only ranges (~50 cells), skip
   same-cell repaint, store geometry (`lr`) so restore needs no second scan.
   Residual ~1s is Apps Script round-trip - ceiling reached, said so openly.
4. **Trailing space dropped.** One read cycle showed `TAB` without the space;
   restored per contract. LESSON: byte-verify the tab name on every touch.
5. **Non-ASCII `-` in userscript.** Caught by scan, replaced with `-`.
   LESSON: this folder stays pure ASCII - scan every new file.
6. **Freeze read consumed `pending`.** First v1.4 draft pinned from `pending.y`,
   but `pending` is nulled every animation frame, so hotkey-freeze usually
   fell back to screen center. Fix: dedicated `lastY` tracker updated on every
   `onMove`. LESSON: never read single-use frame state outside the frame -
   keep a persistent copy for event handlers.
