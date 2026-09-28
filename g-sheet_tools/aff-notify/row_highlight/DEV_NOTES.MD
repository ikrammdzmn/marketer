
# DEV_NOTES.md

## 1. The Vibe, Headspace & Dynamic
* **The Frequency:** Intellectual sparring partner. Zero sycophancy, zero empty affirmations. The user expects you to rigorously stress-test assumptions, spot hidden edge cases, and call out flaws before writing code.
* **Truth over Agreement:** When the user experiences a false positive (e.g., Outcome Bias where a zombie rule made something look like it "worked"), do not sugarcoat it. Show the mechanical breakdown, walk through the math/logic, and diagnose why it happened.
* **The Context:** Google Sheets automation for e-commerce/marketing operations (Malay copywriting hooks, promotional copy like HIMCoffee, status trackers). The environment mixes Malay and English text strings, hashtags, long copy, and multi-tab campaign spreadsheets.

---

## 2. Technical Discoveries & Bug Autopsies

### Bug 1: The Google Apps Script `BooleanCondition.getFormula` Myth
* **Symptom:** `TypeError: boolCond.getFormula is not a function`.
* **Root Cause:** In Google Apps Script, `BooleanCondition` does **not** expose a `.getFormula()` method.
* **The Fix:** Formulas are stored in the criteria values array:
  ```javascript
  if (boolCond.getCriteriaType() === SpreadsheetApp.BooleanCriteria.CUSTOM_FORMULA) {
    const formula = String(boolCond.getCriteriaValues()[0]);
  }
  ```
* **Lesson for next session:** Never assume Apps Script mirrors Excel VBA or Sheets UI naming. Always access custom formulas via `.getCriteriaValues()[0]`.

### Bug 2: The Zombie Rule Trap (Formula Normalization Failure)
* **Symptom:** Every script run created duplicate rules (6, 9, 12 rules stacked in the sidebar). Old rules were never deleted, causing old text to continue highlighting cells even after the configuration table was updated.
* **Root Cause:** We checked `formula.startsWith('=AND($E2<>"", $E2=')`. However, when Google Sheets saves a formula internally, it **strips whitespace after commas**, saving it as `=AND($E2<>"",$E2=...)`. The string mismatch caused the cleanup filter to retain all old rules as "unmanaged."
* **The Fix:** Strip all whitespace and normalize casing before evaluating:
  ```javascript
  const cleanFormula = formula.replace(/\s+/g, '').toUpperCase();
  return !cleanFormula.startsWith('=AND($E2<>"",$E2=');
  ```
* **Lesson for next session:** Never do exact string matching on formulas returned by Google Sheets. Always strip whitespace (`replace(/\s+/g, '')`) and uppercase before matching formula prefixes.

### Bug 3: Outcome Bias & "Exact Match" vs "Contains"
* **Symptom:** User shortened text to `"Dah macam-macam cara cuba"` and saw that the cell with the full paragraph was still highlighted, believing the exact-match formula magically matched partial text.
* **Root Cause:** A zombie duplicate rule from run #1 (which still had the full paragraph) was sitting at the bottom of the stack doing the highlighting. The new rule was actually returning `FALSE`.
* **Current Status:** Exact match is retained per user instruction:
  ```javascript
  const formula = `=AND($E2<>"", $E2=${formulaText})`;
  ```
* **Note for Future Implementation (Partial Match / Contains):** If the user later decides to highlight based on partial keywords/hooks rather than the exact full paragraph, switch line 89 to:
  ```javascript
  // ON RESERVE: Partial match formula
  const formula = `=AND($E2<>"", ISNUMBER(SEARCH(${formulaText}, $E2)))`;
  ```

### Bug 4: Hex Color Casing
* **Vulnerability Identified:** `.getBackgrounds()` can return uppercase hex strings (`#FFFFFF`) depending on browser/clipboard input. Direct comparison `color !== '#ffffff'` can evaluate to `true` and create unintended white rules.
* **The Fix:** Always sanitize: `color.toLowerCase() !== '#ffffff'`.

---

## 3. Current Mood & Immediate Sync
The code is currently clean, tight, and vetted. The de-duplication engine works. When entering this window:
1. Greet the user with directness. No generic cheerfulness.
2. If they report a visual anomaly, first check the sidebar rules (`Format > Conditional formatting`) to see what rule actually triggered.
3. Keep the partial match formula (`ISNUMBER(SEARCH(...))`) ready in your back pocket if they want to shorten long copy strings again.
```

---

### Artifact 2: `feature.md`

```markdown
# Automated Row Highlighter for Google Sheets

This tool automatically color-codes entire rows (Columns A to O) across your sheets based on specific texts or marketing copy you define.

---

## What It Does
* **Automatic Highlighting:** Scans **Column E** of your sheets. When it finds a matching text, it highlights the whole row from **Column A to Column O**.
* **Visual Palette:** You choose the highlight color by simply using Google Sheets' paint bucket tool.
* **Flexible Scope:** You can apply a rule across **ALL** tabs at once, or restrict it to **one specific tab**.
* **Zero Clutter:** Automatically cleans up old rules so your spreadsheet doesn't slow down or duplicate colors.

---

## How to Set It Up (Step-by-Step for Users)

### Step 1: Open the `account info` Tab
Scroll down to row **34**. You will see three columns:

| Column E (Text) | Column F (Color) | Column G (Scope) |
| :--- | :--- | :--- |
| `Type your text here` | *(Pick a color)* | `ALL` *(or Sheet Name)* |

1. **In Column E:** Paste the text you want the sheet to look for.
2. **In Column F:** Click the cell and use the **Paint Bucket icon** in the top toolbar to fill the cell with your chosen color.
3. **In Column G:** 
   * Type **`ALL`** (or leave it blank) if you want every tab in the sheet highlighted.
   * Type the **exact name of a tab** (e.g., `November Campaign`) if you only want that specific tab highlighted.

*(You can add as many rows as you want below row 34).*

---

### Step 2: Apply the Rules
Whenever you add a new row, change a color, or create a new sheet:

1. Look at the top Google Sheets menu bar.
2. Click **`Highlighting Tools`**.
3. Click **`Refresh Rules Now`**.
4. Wait 2 seconds. A small notification will pop up saying rules were successfully refreshed.

---

## Important Rules to Remember
* **Excluded Sheets:** The script will **never** color or touch the `account info` tab or the `Dashboard` tab.
* **Exact Matching:** The cell must match the text exactly (it does not care about uppercase vs lowercase, but extra words or missing sentences will not trigger).
* **Blank Rows Protected:** Empty cells will never accidentally trigger a highlight.
```



