// telegram.gs - Telegram sender for aff-notify (group + topic design).
// Paste into the SAME Apps Script project as code.gs. Sends nothing on its
// own: run testTelegram() for a live check, installTelegramTriggers() once
// for the 9:30am / 11am / 2pm / 4pm MYT schedule. code.gs is untouched -
// this file reuses its globals: findScopeEnd, dayKeys, parseSheetDate,
// dateLabel, readF4. Keep those names stable.
//
// Script Properties keys: BOT_TOKEN, GROUP_ID, TOPIC_ID, MY_USER_ID,
// TG_STYLE (full|condensed), TG_ENABLED (1|0).

var TG_LAYOUT = {
  TAB: 'Affiliate Collection ',
  HEADER_ROW: 9,
  COL_NUM: 2,     // B: positional number / start|end markers
  COL_USER: 3,    // C: USERNAME
  COL_LINK: 4,    // D: VIDEO LINK
  COL_STATUS: 8,  // H: STATUS dropdown
  COL_DATE_N: 14, // N: NEXT REVIEW (text d/m/yy)
  F4_A1: "'Affiliate Collection '!F4", // PENDING ADS RUN count cell
  MAX_SCAN_ROW: 300,
  TZ: 'Asia/Kuala_Lumpur',
  SLOTS: [[9, 30], [11, 0], [14, 0], [16, 0]]
};

function runTelegram() {
  telegramCheck({ forceSend: false, tag: '' });
}

function testTelegram() {
  // Manual live test: sends the FULL style only.
  telegramCheck({ forceSend: true, tag: '[TEST] ', testStyle: 'full' });
}

function installTelegramTriggers() {
  uninstallTelegramTriggers();
  for (var i = 0; i < TG_LAYOUT.SLOTS.length; i++) {
    ScriptApp.newTrigger('runTelegram').timeBased()
      .everyDays(1).atHour(TG_LAYOUT.SLOTS[i][0])
      .nearMinute(TG_LAYOUT.SLOTS[i][1]).create();
  }
  Logger.log('aff-notify/tg: installed ' + TG_LAYOUT.SLOTS.length +
    ' daily triggers for runTelegram');
}

function uninstallTelegramTriggers() {
  var all = ScriptApp.getProjectTriggers();
  for (var i = 0; i < all.length; i++) {
    if (all[i].getHandlerFunction() === 'runTelegram') {
      ScriptApp.deleteTrigger(all[i]);
    }
  }
}

function logThreadId() {
  // Setup helper: post "hi" in the topic first, then run this. Logs the
  // GROUP_ID, TOPIC_ID (message_thread_id) and your MY_USER_ID for the
  // Script Properties keys.
  var p = PropertiesService.getScriptProperties().getProperties();
  if (!p.BOT_TOKEN) throw new Error('aff-notify/tg: set BOT_TOKEN first');
  var resp = UrlFetchApp.fetch(
    'https://api.telegram.org/bot' + p.BOT_TOKEN + '/getUpdates',
    { muteHttpExceptions: true });
  var data = JSON.parse(resp.getContentText());
  if (!data.ok) throw new Error('aff-notify/tg: getUpdates: ' + data.description);
  if (!data.result || data.result.length === 0) {
    Logger.log('aff-notify/tg: no updates - post "hi" in the topic first');
    return;
  }
  for (var i = 0; i < data.result.length; i++) {
    var m = data.result[i].message || data.result[i].channel_post || {};
    var chat = m.chat || {};
    Logger.log('chat_id=' + chat.id + ' thread=' +
      (m.message_thread_id === undefined ? '(general)' : m.message_thread_id) +
      ' from_user=' + ((m.from || {}).id || '?') +
      ' text=' + String(m.text || '').substring(0, 40));
  }
}

function telegramCheck(opts) {
  var p = PropertiesService.getScriptProperties().getProperties();
  if (!p.BOT_TOKEN || !p.GROUP_ID) {
    Logger.log('aff-notify/tg: missing BOT_TOKEN or GROUP_ID, abort');
    return;
  }
  if (p.TG_ENABLED === '0') {
    Logger.log('aff-notify/tg: disabled via TG_ENABLED=0');
    return;
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TG_LAYOUT.TAB);
  if (!sh) throw new Error('tab not found: [' + TG_LAYOUT.TAB + ']');
  var firstRow = TG_LAYOUT.HEADER_ROW;
  var lastRow = findScopeEnd(sh, firstRow);
  var keys = dayKeys();
  var f4 = readF4(ss);

  var priority = [];
  var reminder = [];
  if (lastRow >= firstRow) {
    var nRows = lastRow - firstRow + 1;
    var grid = sh.getRange(firstRow, 1, nRows, TG_LAYOUT.COL_DATE_N).getValues();
    for (var r = 0; r < nRows; r++) {
      var row = grid[r];
      var status = String(row[TG_LAYOUT.COL_STATUS - 1] || '').trim().toUpperCase();
      if (status !== 'RUNNING') continue;
      var key = parseSheetDate(row[TG_LAYOUT.COL_DATE_N - 1]);
      if (!key) continue; // blank/unparseable NEXT REVIEW = skip
      var item = {
        user: String(row[TG_LAYOUT.COL_USER - 1] || '').trim(),
        link: String(row[TG_LAYOUT.COL_LINK - 1] || '').trim(),
        key: key
      };
      if (key <= keys.today) priority.push(item);
      else if (key === keys.tomorrow) reminder.push(item);
    }
  }

  var actionCount = (f4 >= 1) ? f4 : 0;
  var buckets = splitBuckets(priority, keys.today);
  var hasContent = priority.length > 0 || reminder.length > 0 || actionCount > 0;
  if (!hasContent && !opts.forceSend) {
    Logger.log('aff-notify/tg: nothing to report (rows ' + firstRow + '-' +
      lastRow + ', F4=' + f4 + ')');
    return;
  }
  var stamp = Utilities.formatDate(new Date(), TG_LAYOUT.TZ, 'yyyy-MM-dd HH:mm');
  var style = String(p.TG_STYLE || 'full').toLowerCase() === 'condensed'
    ? 'condensed' : 'full';
  if (opts.forceSend) {
    var tstyle = opts.testStyle === 'condensed' ? 'condensed' : 'full';
    tgSend(p, opts.tag + (tstyle === 'condensed' ? '[CONDENSED]\n' +
      buildTgCondensed(stamp, buckets, reminder, actionCount)
      : '[FULL]\n' + buildTgFull(stamp, firstRow, lastRow, buckets,
          reminder, actionCount, f4, hasContent)));
  } else {
    tgSend(p, opts.tag + (style === 'condensed'
      ? buildTgCondensed(stamp, buckets, reminder, actionCount)
      : buildTgFull(stamp, firstRow, lastRow, buckets, reminder,
          actionCount, f4, hasContent)));
  }
  Logger.log('aff-notify/tg: sent P' + priority.length + ' R' +
    reminder.length + ' ADS' + actionCount + ' style=' +
    (opts.forceSend ? (opts.testStyle === 'condensed' ? 'condensed' : 'full') + '+test' : style));
}

function tgSend(p, html) {
  var payload = {
    chat_id: p.GROUP_ID,
    text: html,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: [[{
      text: 'Open sheet',
      url: SpreadsheetApp.getActiveSpreadsheet().getUrl()
    }]] }
  };
  if (p.TOPIC_ID) {
    var tid = parseInt(p.TOPIC_ID, 10);
    if (!isNaN(tid)) payload.message_thread_id = tid;
  }
  var resp = UrlFetchApp.fetch(
    'https://api.telegram.org/bot' + p.BOT_TOKEN + '/sendMessage',
    { method: 'post', contentType: 'application/json',
      payload: JSON.stringify(payload), muteHttpExceptions: true });
  var code = resp.getResponseCode();
  Logger.log('aff-notify/tg: HTTP ' + code + ' ' +
    resp.getContentText().substring(0, 160));
  if (code !== 200) throw new Error('aff-notify/tg: send failed HTTP ' + code);
}

function tgEsc(s) {
  // Telegram HTML parse_mode: escape & < > only.
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tgMention() {
  // Custom ping: megaphone mention of MY_USER_ID at the top of every sent
  // message (tests included, so the ping itself is verifiable).
  try {
    var id = String((PropertiesService.getScriptProperties()
      .getProperties() || {}).MY_USER_ID || '').replace(/[^0-9]/g, '');
    if (!id) return '';
    return '<a href="tg://user?id=' + id + '">\uD83D\uDCE3</a> ';
  } catch (e) {
    return '';
  }
}

function tgRowLine(item) {
  var link = item.link
    ? ' - <a href="' + tgEsc(item.link) + '">video</a>' : '';
  return '- ' + tgEsc(item.user) + link;
}

function tgBucketLines(out, items) {
  for (var i = 0; i < items.length; i++) out.push(tgRowLine(items[i]));
  return out;
}

function buildTgFull(stamp, firstRow, lastRow, buckets, reminder,
    actionCount, f4, hasContent) {
  var nP = buckets.dueToday.length + buckets.overdue.length;
  var out = [];
  out.push(tgMention() + '<b>Affiliate Collection digest</b>');
  out.push(tgEsc(stamp) + ' MYT - rows ' + firstRow + '-' + lastRow +
    ' - P' + nP + ' R' + reminder.length + ' ADS' + actionCount);
  if (nP > 0) {
    out.push('');
    out.push('\uD83D\uDD34 <b>PRIORITY - check ads performance</b>');
    out.push('Due today (' + buckets.dueToday.length + '):');
    tgBucketLines(out, buckets.dueToday);
    out.push('Overdue, oldest first (' + buckets.overdue.length + '):');
    tgBucketLines(out, buckets.overdue);
  }
  if (reminder.length > 0) {
    out.push('');
    out.push('\uD83D\uDD35 <b>REMINDER - due tomorrow (' +
      reminder.length + ')</b>:');
    tgBucketLines(out, reminder);
  }
  if (actionCount > 0) {
    out.push('');
    out.push('\uD83D\uDFE2 <b>ACTION - ads queue = ' + actionCount +
      ' - need to run the ads.</b>');
  }
  if (!hasContent) out.push('<i>(test: no trigger conditions met right now.)</i>');
  return out.join('\n');
}

function buildTgCondensed(stamp, buckets, reminder, actionCount) {
  var nP = buckets.dueToday.length + buckets.overdue.length;
  var out = [];
  out.push(tgMention() + '<b>AFF digest ' + tgEsc(stamp) + '</b> - P' + nP +
    ' R' + reminder.length + ' ADS' + actionCount);
  if (nP > 0) {
    out.push('\uD83D\uDD34 Today(' + buckets.dueToday.length +
      ') / Overdue(' + buckets.overdue.length + '):');
    tgBucketLines(out, buckets.dueToday.concat(buckets.overdue));
  }
  if (actionCount > 0) {
    out.push('\uD83D\uDFE2 ADS queue ' + actionCount + ' - run the ads.');
  }
  if (nP === 0 && actionCount === 0) {
    out.push('<i>(test: nothing due.)</i>');
  }
  return out.join('\n');
}
