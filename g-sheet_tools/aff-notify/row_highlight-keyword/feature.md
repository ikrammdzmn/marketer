# Row Keyword Highlighter - user guide

This tool automatically colors whole rows in your spreadsheet based on
keywords you define. You manage everything from one settings table - no
code, no re-paste.

## What it does

- You list keywords (for example video title fragments like
  `Jom join live saya`) and paint each a color with the normal paint
  bucket. Every row whose column E CONTAINS the keyword gets that color,
  across columns A to O.
- Matching is contains, not exact: extra words around the keyword still
  match. Empty cells never match.
- A keyword can apply to ALL tabs or to one named tab.

## How to use

1. Open the `account info` tab and scroll to row 33 (the header row).
2. Add one rule per row below it:
   - Column E: the keyword text.
   - Column F: paint the cell with the color you want (paint bucket).
   - Column G: `ALL`, or the exact tab name (for example
     `1. @dr.samhan / Dr. Samhan`). Blank means ALL.
3. Add as many rows as you like below.
4. Click `Highlighting Tools` in the top menu, then `Refresh Rules Now`.
5. Wait about 2 seconds for the done notice. Changed colors appear at once.

## Important notes

- Editing the table alone changes nothing - always press Refresh after.
- Short keywords match broadly (that is usually what you want for live
  titles). If too many rows light up, use a longer phrase.
- The `account info` and `Dashboard` tabs are never colored.
- Your old manual colors are kept - the tool only replaces its own rules.
