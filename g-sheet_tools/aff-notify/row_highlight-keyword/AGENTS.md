
# agents.md — System Architecture & Agent Handoff Spec

## 1. System Objective
An automated Google Apps Script-driven conditional formatting manager that synchronizes rules across multi-tab Google Sheets workbooks based on a configuration table located on administrative sheet `'account info'`.

---

## 2. Configuration Schema
* **Source Sheet:** `'account info'`
* **Start Row:** `34` (dynamically reads downward to `getLastRow()`).
* **Column 5 (E):** `Target Text` (string to match against Column E of child sheets).
* **Column 6 (F):** `Background Color` (sampled via `.getBackgrounds()`).
* **Column 7 (G):** `Scope` (`'ALL'`, empty string, or exact case-insensitive Sheet Name).
* **Exclusion List:** `['account info', 'Dashboard']`

---

## 3. Formatting Target Bounds
* **Target Columns:** Columns `1` through `15` (`A:O`).
* **Target Rows:** Row `2` through `maxRows` (Row 1 is preserved as header).
* **Evaluated Column:** `$E2` (strict column locking).

---

## 4. Current Active Formula Logic
* **Partial Match / Substring (Current Production since 30 Sep 2026):**
  ```excel
  =AND($E2<>"",ISNUMBER(SEARCH("<ESCAPED_TEXT>",$E2)))
  ```
  Reason: the live tab's col E holds full video titles, rule texts are
  fragments - exact match could never fire (verified live). Short fragments
  match broadly by design.
* **Exact Match (Superseded):**
  ```excel
  =AND($E2<>"", $E2="<ESCAPED_TEXT>")
  ```
  Legacy rules with this prefix are still stripped by the cleanup filter so
  they cannot pile up as zombies.
  *Note:* User was briefed on wildcard behaviors (`?`, `*`) and false positive risks with short words.

---

## 5. Script Engine Architecture (`applyDynamicHighlighting`)

```
[Read 'account info'!E34:G]
       │
       ▼
[Filter valid entries (text != "" && color != "#ffffff")]
       │
       ▼
[Iterate Sheets (Exclude 'account info', 'Dashboard')]
       │
       ├─► [Target Range: A2:O{maxRows}]
       ├─► [Build new ConditionalFormatRules from matching scopes]
       ├─► [Inspect existing rules on sheet]
       │     └─► Strip whitespace & uppercase: formula.replace(/\s+/g, '').toUpperCase()
       │     └─► Filter OUT any rule starting with '=AND($E2<>"",$E2='
       ├─► [Prepend newRules before preserved manual rules]
       └─► [Deploy via sheet.setConditionalFormatRules()]
```

---

## 6. Critical Technical Guardrails
1. **Never use `BooleanCondition.getFormula()`**: It throws an unhandled `TypeError`. Use `BooleanCondition.getCriteriaValues()[0]`.
2. **Whitespace Normalization**: Google Sheets serializes formulas without spaces after delimiters (e.g., `=AND($E2<>"",$E2=...)`). String prefix checks must always strip all whitespace (`\s+`) before testing.
3. **Escaping Multi-line Copy:** Text containing quotes (`"`) or line breaks (`\n`) must be escaped into valid Sheets formula syntax via string concatenation:
   ```javascript
   function escapeForFormula(str) {
     const lines = str.split(/\r?\n/);
     return lines.map(line => `"${line.replace(/"/g, '""')}"`).join('&CHAR(10)&');
   }
   ```
4. **Trigger Design:** Automated time-driven triggers (e.g., 9 AM) are discouraged as conditional formatting rules evaluate dynamically 24/7 once injected. Manual menu execution via `onOpen()` (`Highlighting Tools > Refresh Rules Now`) is the primary deployment method.

---

## 7. Sparring Partner Protocol for Incoming Agents
* Maintain an intellectually rigorous tone.
* Challenge unexamined assumptions (e.g., confusing partial match with exact match, or treating visual glitches as features).
* Verify user claims against spreadsheet mechanics before accepting premise.

---

## 8. Live Deployment
* **Spreadsheet:** `ALL INTERNAL CREATIVE DATA` (owner-confirmed 30 Sep 2026 -
  this tool IS in active use there; do not retire it).
* The config contract above (`'account info'` tab, E34:G table, exclusions)
  must hold on that spreadsheet or the script silently does nothing.
```