// code.gs - aff-notify: 4x-daily digest for the Affiliate Collection sheet.
// Plan: g-sheet_tools/aff-notify/plan.md (read it first).
//
// Install: open the spreadsheet > Extensions > Apps Script, paste this file,
// save, then run testNotify() once (authorise when asked) to get a live
// email immediately. Afterwards run installTriggers() once for the
// 9:30am / 11am / 2pm / 4pm MYT schedule. runCheck() is trigger-safe and
// can also be run by hand (stays silent when there is nothing to report).

var CONFIG = {
  TAB: 'Affiliate Collection ', // NOTE trailing space - keep it
  HEADER_ROW: 9,                // first data row (row 8 is the header)
  COL_NUM: 2,                   // B: positional number / start|end markers
  COL_USER: 3,                  // C: USERNAME
  COL_LINK: 4,                  // D: VIDEO LINK
  COL_STATUS: 8,               // H: STATUS dropdown
  COL_DATE_N: 14,              // N: NEXT REVIEW (text d/m/yy, e.g. 27/9/26)
  F4_A1: "'Affiliate Collection '!F4", // PENDING ADS RUN count cell
  MAX_SCAN_ROW: 300,           // safety cap for the marker search
  TZ: 'Asia/Kuala_Lumpur',
  // Recipients: everything goes to you today. Later, point pendingScope at
  // a second address to enable the pending-scope digest (one-line change).
  RECIPIENTS: {
    default: Session.getActiveUser().getEmail(),
    pendingScope: Session.getActiveUser().getEmail() // future: 2nd email
  }
};

function runCheck() {
  digestCheck({ forceSend: false, tag: '' });
}

function testNotify() {
  // Manual real-time test: always sends, with diagnostics appended.
  digestCheck({ forceSend: true, tag: '[TEST] ' });
}

function installTriggers() {
  uninstallTriggers();
  var slots = [[9, 30], [11, 0], [14, 0], [16, 0]];
  for (var i = 0; i < slots.length; i++) {
    ScriptApp.newTrigger('runCheck').timeBased()
      .everyDays(1).atHour(slots[i][0]).nearMinute(slots[i][1]).create();
  }
  Logger.log('installed ' + slots.length + ' daily triggers for runCheck');
}

function uninstallTriggers() {
  var all = ScriptApp.getProjectTriggers();
  for (var i = 0; i < all.length; i++) {
    if (all[i].getHandlerFunction() === 'runCheck') {
      ScriptApp.deleteTrigger(all[i]);
    }
  }
}

function digestCheck(opts) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CONFIG.TAB);
  if (!sh) throw new Error('tab not found: [' + CONFIG.TAB + ']');
  var firstRow = CONFIG.HEADER_ROW;
  var lastRow = findScopeEnd(sh, firstRow);
  var keys = dayKeys();
  var f4 = readF4(ss);

  var priority = [];
  var reminder = [];
  if (lastRow >= firstRow) {
    var nRows = lastRow - firstRow + 1;
    var grid = sh.getRange(firstRow, 1, nRows, CONFIG.COL_DATE_N).getValues();
    for (var r = 0; r < nRows; r++) {
      var row = grid[r];
      var status = String(row[CONFIG.COL_STATUS - 1] || '').trim().toUpperCase();
      if (status !== 'RUNNING') continue;
      var key = parseSheetDate(row[CONFIG.COL_DATE_N - 1]);
      if (!key) continue; // blank/unparseable NEXT REVIEW = skip
      var item = {
        user: String(row[CONFIG.COL_USER - 1] || '').trim(),
        date: String(row[CONFIG.COL_DATE_N - 1]).trim(),
        label: dateLabel(row[CONFIG.COL_DATE_N - 1], keys.today),
        link: String(row[CONFIG.COL_LINK - 1] || '').trim()
      };
      if (key <= keys.today) priority.push(item);
      else if (key === keys.tomorrow) reminder.push(item);
    }
  }

  var actionCount = (f4 >= 1) ? f4 : 0;
  var hasContent = priority.length > 0 || reminder.length > 0 || actionCount > 0;
  if (!hasContent && !opts.forceSend) {
    Logger.log('aff-notify: nothing to report (rows ' + firstRow + '-' +
      lastRow + ', F4=' + f4 + ')');
    return;
  }
  var stamp = Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyy-MM-dd HH:mm');
  var subject = opts.tag + '[Aff-Notify] P' + priority.length +
    ' R' + reminder.length + ' ADS' + actionCount + ' - ' + stamp + ' MYT';
  var lines = [];
  lines.push('Affiliate Collection digest - ' + stamp + ' MYT');
  lines.push('Scope: rows ' + firstRow + '-' + lastRow + ' (2nd end marker).');
  lines.push('');
  if (priority.length > 0) {
    lines.push('[PRIORITY] RUNNING due today/overdue (' + priority.length +
      ') - check ads performance:');
    lines = lines.concat(fmtItems(priority));
    lines.push('');
  }
  if (reminder.length > 0) {
    lines.push('[REMINDER] RUNNING due tomorrow (' + reminder.length + '):');
    lines = lines.concat(fmtItems(reminder));
    lines.push('');
  }
  if (actionCount > 0) {
    lines.push('[ACTION] PENDING ADS RUN queue = ' + actionCount +
      ' - need to run the ads.');
    lines.push('');
  }
  if (!hasContent) lines.push('(test: no trigger conditions met right now.)');
  lines.push('F4 reads: ' + f4);
  MailApp.sendEmail({
    to: CONFIG.RECIPIENTS.default,
    subject: subject,
    body: lines.join('\n'),
    htmlBody: buildHtml(stamp, firstRow, lastRow, priority, reminder,
      actionCount, f4, hasContent)
  });
  Logger.log('aff-notify: sent to ' + CONFIG.RECIPIENTS.default +
    ' P' + priority.length + ' R' + reminder.length +
    ' ADS' + actionCount);
}

function findScopeEnd(sh, firstRow) {
  // Scope = firstRow .. (2nd "end" marker in col B) - 1, so block 3 below
  // is never scanned. New/deleted rows move the marker on their own.
  var vals = sh.getRange(firstRow, CONFIG.COL_NUM,
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
  return firstRow - 1; // no marker: empty scope, nothing scanned
}

function readF4(ss) {
  try {
    var v = ss.getRange(CONFIG.F4_A1).getDisplayValue();
    var n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  } catch (e) {
    Logger.log('aff-notify: F4 unreadable (' + e.message + ')');
    return 0;
  }
}

function parseSheetDate(v) {
  // Accepts real dates and d/m/yy or d/m/yyyy text (sheet format, e.g.
  // 27/9/26). Returns yyyy-MM-dd in sheet tz, or null when blank/bad.
  var p = splitSheetDate(v);
  if (!p) return null;
  return Utilities.formatDate(new Date(p.y, p.m - 1, p.d),
    CONFIG.TZ, 'yyyy-MM-dd');
}

function splitSheetDate(v) {
  // Same accepted inputs as parseSheetDate; returns {y, m, d} or null.
  if (v instanceof Date && !isNaN(v.getTime())) {
    var k = Utilities.formatDate(v, CONFIG.TZ, 'yyyy-MM-dd').split('-');
    return { y: +k[0], m: +k[1], d: +k[2] };
  }
  var m = String(v || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  var d = parseInt(m[1], 10);
  var mo = parseInt(m[2], 10);
  var y = parseInt(m[3], 10);
  if (y < 100) y += 2000;
  var dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 ||
      dt.getDate() !== d) return null;
  return { y: y, m: mo, d: d };
}

function dateLabel(v, todayKey) {
  // "Sun Sep 27 2026 (Today)" / "Mon Sep 28 2026 (Tomorrow)" /
  // "Fri Sep 25 2026 (2 days ago)". Falls back to raw text when unparseable.
  var p = splitSheetDate(v);
  if (!p) return String(v || '').trim();
  var t = String(todayKey).split('-');
  var diff = Math.round((Date.UTC(p.y, p.m - 1, p.d) -
    Date.UTC(+t[0], +t[1] - 1, +t[2])) / 86400000);
  var base = Utilities.formatDate(new Date(p.y, p.m - 1, p.d),
    CONFIG.TZ, 'EEE MMM dd yyyy');
  var suf = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' :
    diff === -1 ? 'Yesterday' : diff > 1 ? 'In ' + diff + ' days' :
    (-diff) + ' days ago';
  return base + ' (' + suf + ')';
}

function dayKeys() {
  var now = new Date();
  var today = Utilities.formatDate(now, CONFIG.TZ, 'yyyy-MM-dd');
  var tmr = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return { today: today,
    tomorrow: Utilities.formatDate(tmr, CONFIG.TZ, 'yyyy-MM-dd') };
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sectionTable(title, bg, items, dateLabel) {
  var h = '<h3 style="margin:16px 0 6px 0;font-family:Arial,sans-serif;' +
    'font-size:15px;color:#ffffff;background:' + bg +
    ';padding:8px 12px;border-radius:6px;">' + esc(title) + ' (' +
    items.length + ')</h3>';
  h += '<table style="border-collapse:collapse;width:100%;' +
    'font-family:Arial,sans-serif;font-size:13px;">';
  h += '<tr style="background:#f1f3f4;">' +
    '<th style="text-align:left;padding:6px 8px;border:1px solid #dadce0;">' +
    'Username</th>' +
    '<th style="text-align:left;padding:6px 8px;border:1px solid #dadce0;">' +
    dateLabel + '</th>' +
    '<th style="text-align:left;padding:6px 8px;border:1px solid #dadce0;">' +
    'Video</th></tr>';
  for (var i = 0; i < items.length; i++) {
    var link = items[i].link;
    var cell = link
      ? '<a href="' + esc(link) + '">open video</a>'
      : '<span style="color:#9aa0a6;">no link</span>';
    h += '<tr><td style="padding:6px 8px;border:1px solid #dadce0;">' +
      esc(items[i].user) + '</td>' +
      '<td style="padding:6px 8px;border:1px solid #dadce0;white-space:nowrap;">' +
      esc(items[i].label) + '</td>' +
      '<td style="padding:6px 8px;border:1px solid #dadce0;">' + cell +
      '</td></tr>';
  }
  return h + '</table>';
}

function buildHtml(stamp, firstRow, lastRow, priority, reminder,
    actionCount, f4, hasContent) {
  var h = '<div style="font-family:Arial,sans-serif;color:#202124;' +
    'max-width:640px;">';
  h += '<h2 style="font-size:17px;margin:0 0 4px 0;">' +
    'Affiliate Collection digest</h2>';
  h += '<p style="font-size:12px;color:#5f6368;margin:0 0 12px 0;">' +
    esc(stamp) + ' MYT &middot; scope rows ' + firstRow + '-' + lastRow +
    ' &middot; P' + priority.length + ' / R' + reminder.length +
    ' / ADS' + actionCount + '</p>';
  if (priority.length > 0) {
    h += sectionTable('PRIORITY - due today/overdue, check ads performance',
      '#c5221f', priority, 'Due');
  }
  if (reminder.length > 0) {
    h += sectionTable('REMINDER - due tomorrow', '#1a73e8', reminder, 'Due');
  }
  if (actionCount > 0) {
    h += '<h3 style="margin:16px 0 6px 0;font-size:15px;color:#ffffff;' +
      'background:#188038;padding:8px 12px;border-radius:6px;">' +
      'ACTION - ads queue (' + actionCount + ')</h3>';
    h += '<p style="font-size:14px;">PENDING ADS RUN queue = <b>' +
      actionCount + '</b> - need to run the ads.</p>';
  }
  if (!hasContent) {
    h += '<p style="font-size:13px;color:#5f6368;">' +
      '(test: no trigger conditions met right now.)</p>';
  }
  h += '<p style="font-size:11px;color:#9aa0a6;">F4 reads: ' + f4 + '</p>';
  return h + '</div>';
}

function fmtItems(items) {
  var out = [];
  for (var i = 0; i < items.length; i++) {
    out.push('- ' + items[i].user + ' | RUNNING | due ' + items[i].label +
      ' | ' + items[i].link);
  }
  return out;
}
