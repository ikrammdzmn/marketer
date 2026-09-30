// ROW-COL-HIGHLIGHT - crosshair highlight for the Affiliate Collection sheet.
//https://www.youtube.com/watch?v=dXjqzrkzUro SOURCE
//
// Scope = data rows 9 through the SECOND end marker in col B (two blocks;
// block 3 below is never scanned). Bound derives from the marker, never a
// hardcoded end row, so inserts move it on their own.
// Paint is scope-only (row A:O, col 9:lastRow) to keep each click fast.

var CONFIG = {
  TAB: 'Affiliate Collection ', // NOTE trailing space - keep it
  FIRST_ROW: 9, // first data row (row 8 is the header)
  COL_MARKER: 2, // B: start|end markers
  COL_FIRST: 1, // A
  COL_LAST: 15, // O
  MAX_SCAN_ROW: 300 // safety cap for the marker search
};

function onSelectionChange(e) {
  if (!e || !e.range) return;
  var sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== CONFIG.TAB) return;

  var row = e.range.getRow();
  var col = e.range.getColumn();
  var properties = PropertiesService.getScriptProperties();
  var prevRow = properties.getProperty('row');
  var prevCol = properties.getProperty('col');

  // Same cell: nothing to do (avoids flicker + writes).
  if (prevRow && prevCol && +prevRow === row && +prevCol === col) return;

  var lastRow = findScopeEnd(sheet, CONFIG.FIRST_ROW);

  // Outside dynamic scope (header, gaps, block 3, or cols past O): clear old.
  if (lastRow < CONFIG.FIRST_ROW ||
      row < CONFIG.FIRST_ROW || row > lastRow ||
      col < CONFIG.COL_FIRST || col > CONFIG.COL_LAST) {
    restorePrevious();
    return;
  }

  restorePrevious();
  var nCols = CONFIG.COL_LAST - CONFIG.COL_FIRST + 1;
  var nRows = lastRow - CONFIG.FIRST_ROW + 1;
  var rowRange = sheet.getRange(row, CONFIG.COL_FIRST, 1, nCols);
  var colRange = sheet.getRange(CONFIG.FIRST_ROW, col, nRows, 1);

  properties.setProperties({
    'rowColors': JSON.stringify(rowRange.getBackgrounds()[0]),
    'colColors': JSON.stringify(colRange.getBackgrounds().map(function (r) { return r[0]; })),
    'row': String(row),
    'col': String(col),
    'lr': String(lastRow)
  });

  rowRange.setBackground('#ffff00');
  colRange.setBackground('#ffff00');
}

function findScopeEnd(sh, firstRow) {
  // firstRow .. (2nd end marker in col B) - 1, so block 3 is never scanned.
  var vals = sh.getRange(firstRow, CONFIG.COL_MARKER,
    CONFIG.MAX_SCAN_ROW - firstRow + 1, 1).getValues();
  var ends = [];
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0] || '').trim().toLowerCase() === 'end') {
      ends.push(firstRow + i);
      if (ends.length === 2) break;
    }
  }
  if (ends.length >= 2) return ends[1] - 1;
  if (ends.length === 1) return ends[0] - 1;
  return firstRow - 1;
}

function restorePrevious() {
  var properties = PropertiesService.getScriptProperties();
  var row = properties.getProperty('row');
  var col = properties.getProperty('col');
  var lr = properties.getProperty('lr');
  if (!row || !col) return;

  var sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== CONFIG.TAB) {
    clearHighlightState(properties);
    return;
  }
  try {
    var lastRow = +lr;
    // Stored geometry missing/stale (markers moved): fall back to a fresh scan.
    if (!lastRow || lastRow < CONFIG.FIRST_ROW) {
      lastRow = findScopeEnd(sheet, CONFIG.FIRST_ROW);
    }
    var nCols = CONFIG.COL_LAST - CONFIG.COL_FIRST + 1;
    var nRows = lastRow - CONFIG.FIRST_ROW + 1;
    if (nRows < 1) {
      clearHighlightState(properties);
      return;
    }
    var rowRange = sheet.getRange(+row, CONFIG.COL_FIRST, 1, nCols);
    var colRange = sheet.getRange(CONFIG.FIRST_ROW, +col, nRows, 1);
    var rowColors = JSON.parse(properties.getProperty('rowColors'));
    var colColors = JSON.parse(properties.getProperty('colColors'));
    if (rowColors && rowColors.length === nCols) {
      rowRange.setBackgrounds([rowColors]);
    }
    if (colColors && colColors.length === nRows) {
      colRange.setBackgrounds(colColors.map(function (c) { return [c]; }));
    }
  } catch (err) {
    Logger.log('row-col-highlight: restore skipped (' + err.message + ')');
  }
  clearHighlightState(properties);
}

function clearHighlightState(properties) {
  properties.deleteProperty('row');
  properties.deleteProperty('col');
  properties.deleteProperty('lr');
  properties.deleteProperty('rowColors');
  properties.deleteProperty('colColors');
}
