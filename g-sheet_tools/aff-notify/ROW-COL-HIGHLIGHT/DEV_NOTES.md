# DEV_NOTES - ROW-COL-HIGHLIGHT handoff (30 Sep 2026)

## Vibe
Owner ran fast and terse: "read code.gs, what does it do" -> "ok fix it" ->
"explain like i'm 5" -> lag complaint -> "go" -> Tampermonkey detour
("bigger lines", "toggle on/off, draggable") -> then pivoted to shop hourly.
Match that energy next time: short replies, confirm-then-build, working
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
