/**
 * Dynamic Row Highlighting Manager
 * Reads rules from 'account info' and applies conditional formatting to columns A:O.
 */

const CONFIG = {
  SOURCE_SHEET: 'account info',
  EXCLUDED_SHEETS: ['account info', 'Dashboard'],
  START_ROW: 34,
  COL_TEXT: 5,   // Column E
  COL_COLOR: 6,  // Column F
  COL_SCOPE: 7,  // Column G
  START_DATA_ROW: 2,
  NUM_COLUMNS: 15 // Columns A through O (15 columns)
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Highlighting Tools')
    .addItem('Refresh Rules Now', 'applyDynamicHighlighting')
    .addToUi();
}

function applyDynamicHighlighting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG.SOURCE_SHEET);

  if (!configSheet) {
    SpreadsheetApp.getUi().alert(`Error: Sheet '${CONFIG.SOURCE_SHEET}' was not found.`);
    return;
  }

  // 1. Read the configuration table
  const lastRow = configSheet.getLastRow();
  if (lastRow < CONFIG.START_ROW) {
    SpreadsheetApp.getUi().alert('No rules found starting at row 34.');
    return;
  }

  const numRows = lastRow - CONFIG.START_ROW + 1;
  const textValues = configSheet.getRange(CONFIG.START_ROW, CONFIG.COL_TEXT, numRows, 1).getValues();
  const colorValues = configSheet.getRange(CONFIG.START_ROW, CONFIG.COL_COLOR, numRows, 1).getBackgrounds();
  const scopeValues = configSheet.getRange(CONFIG.START_ROW, CONFIG.COL_SCOPE, numRows, 1).getValues();

  const rulesConfig = [];
  for (let i = 0; i < numRows; i++) {
    const text = String(textValues[i][0]).trim();
    const color = colorValues[i][0];
    const scope = String(scopeValues[i][0]).trim();

    // Skip row if Column E is blank or background is white/none
    if (text !== "" && color.toLowerCase() !== "#ffffff" && color !== "") {
      rulesConfig.push({
        text: text,
        color: color,
        scope: scope === "" ? "ALL" : scope
      });
    }
  }

  if (rulesConfig.length === 0) {
    SpreadsheetApp.getUi().alert('No valid rules found with text and background colors.');
    return;
  }

  // Safely escapes text (handles quotes and multi-line text)
  function escapeForFormula(str) {
    const lines = str.split(/\r?\n/);
    return lines.map(line => `"${line.replace(/"/g, '""')}"`).join('&CHAR(10)&');
  }

  // 2. Loop through all sheets and apply rules
  const allSheets = ss.getSheets();
  let updatedSheetCount = 0;

  allSheets.forEach(sheet => {
    const sheetName = sheet.getName();

    // Skip excluded sheets
    if (CONFIG.EXCLUDED_SHEETS.includes(sheetName)) {
      return;
    }

    const maxRows = sheet.getMaxRows();
    if (maxRows < CONFIG.START_DATA_ROW) return;

    // Target range is A2:O
    const targetRange = sheet.getRange(
      CONFIG.START_DATA_ROW,
      1,
      maxRows - CONFIG.START_DATA_ROW + 1,
      CONFIG.NUM_COLUMNS
    );

    // Build the conditional formatting rules
    const newRules = [];
    rulesConfig.forEach(cfg => {
      if (cfg.scope.toUpperCase() === 'ALL' || cfg.scope.toLowerCase() === sheetName.toLowerCase()) {
        const formulaText = escapeForFormula(cfg.text);
        const formula = `=AND($E2<>"",ISNUMBER(SEARCH(${formulaText},$E2)))`;
        const rule = SpreadsheetApp.newConditionalFormatRule()
          .whenFormulaSatisfied(formula)
          .setBackground(cfg.color)
          .setRanges([targetRange])
          .build();

        newRules.push(rule);
      }
    });

    // 3. Remove existing script-generated rules to prevent duplicates
    const existingRules = sheet.getConditionalFormatRules();
    const preservedRules = existingRules.filter(r => {
      const boolCond = r.getBooleanCondition();
      if (!boolCond) return true;

      if (boolCond.getCriteriaType() === SpreadsheetApp.BooleanCriteria.CUSTOM_FORMULA) {
        const criteriaValues = boolCond.getCriteriaValues();
        const formula = criteriaValues && criteriaValues.length > 0 ? String(criteriaValues[0]) : '';
        
        // Strip all whitespace and convert to uppercase to guarantee match.
        // Both prefixes: legacy exact-match rules (pre-partial era) must die
        // too, or they pile up as immortal zombies beside the new rules.
        const cleanFormula = formula.replace(/\s+/g, '').toUpperCase();
        return !cleanFormula.startsWith('=AND($E2<>"",$E2=') &&
          !cleanFormula.startsWith('=AND($E2<>"",ISNUMBER(SEARCH(');
      }
      return true;
    });

    // Deploy: Put newly generated rules at the top, keep older unrelated rules below
    sheet.setConditionalFormatRules([...newRules, ...preservedRules]);
    updatedSheetCount++;
  });

  ss.toast(`Successfully refreshed rules across ${updatedSheetCount} sheets!`, 'Done', 4);
}