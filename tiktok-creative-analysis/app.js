/* Marketer — local xlsx visualiser (vanilla JS, no build) */
(function () {
  'use strict';

  var BUNDLED_FILE = 'source-file/Creative data 7 days 2026-09-06 - 2026-09-13 - Product 1729556489100298210 (1).xlsx';
  var MAX_TABLE_ROWS = 200;

  var state = { rows: [], allowlist: [], chart: null };

  function $(id) { return document.getElementById(id); }

  function num(v) {
    if (v === null || v === undefined || v === '-') return 0;
    var n = parseFloat(String(v).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }
  function int(v) {
    if (v === null || v === undefined || v === '-') return 0;
    var n = parseInt(String(v).replace(/,/g, ''), 10);
    return isNaN(n) ? 0 : n;
  }
  function fmt(n, d) {
    return Number(n).toLocaleString('en-MY', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- theme ---------- */
  $('themeToggle').addEventListener('click', function () {
    var dark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('marketer-theme', dark ? 'dark' : 'light'); } catch (e) {}
  });

  /* ---------- allowlist ---------- */
  fetch('data/accounts.json?v=' + Date.now())
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (arr) {
      state.allowlist = Array.isArray(arr) ? arr.map(String) : [];
      buildAccountOptions();
    })
    .catch(function () {
      setStatus('Note: data/accounts.json not found — run over HTTP to enable allowlist.');
    });

  /* ---------- loading ---------- */
  function setStatus(msg) { $('loadStatus').textContent = msg; }

  /* DD MMMM YYYY, e.g. 13 September 2026 */
  function fmtLong(d) {
    var dt;
    if (d instanceof Date) { dt = d; }
    else {
      var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ''));
      if (!m) return '–';
      dt = new Date(+m[1], +m[2] - 1, +m[3]);
    }
    if (isNaN(dt.getTime())) return '–';
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }
  /* Dataset period: parsed from filename ("7 days 2026-09-06 - 2026-09-13"),
     falling back to the min/max Time posted values in the data. */
  function parsePeriod(name) {
    var m = /(\d+)\s*days?\s*(\d{4}-\d{2}-\d{2})\s*[–—-]\s*(\d{4}-\d{2}-\d{2})/i.exec(name || '');
    if (m) return { days: parseInt(m[1], 10), from: m[2], to: m[3] };
    var dates = [];
    state.rows.forEach(function (r) {
      var t = /^(\d{4}-\d{2}-\d{2})/.exec(String(r.timePosted || ''));
      if (t) dates.push(t[1]);
    });
    if (!dates.length) return null;
    dates.sort();
    var days = Math.round((new Date(dates[dates.length - 1]) - new Date(dates[0])) / 86400000) + 1;
    return { days: days, from: dates[0], to: dates[dates.length - 1] };
  }
  function renderFileMeta(name, fileDate) {
    var p = parsePeriod(name);
    $('fileMeta').textContent = p
      ? 'Data period: ' + p.days + ' days (' + fmtLong(p.from) + ' – ' + fmtLong(p.to) + ')  ·  File dated: ' + fmtLong(fileDate)
      : 'File dated: ' + fmtLong(fileDate);
  }

  function ingest(workbook, fileName, fileDate) {
    var name = workbook.SheetNames[0];
    var ws = workbook.Sheets[name];
    var json = XLSX.utils.sheet_to_json(ws, { defval: '' });
    state.rows = json.map(function (r) {
      var cost = num(r['Cost']);
      var impr = int(r['Product ad impressions']);
      return {
        postId: r['Post ID'],
        creative: r['Creative'],
        account: String(r['TikTok account'] === null || r['TikTok account'] === undefined ? '' : r['TikTok account']).trim(),
        type: r['Creative type'],
        status: r['Status'],
        sec: r['Exploration secondary status'],
        timePosted: r['Time posted'],
        cost: cost,
        orders: int(r['SKU orders']),
        revenue: num(r['Gross revenue']),
        roi: num(r['ROI']),
        impr: impr,
        clicks: int(r['Product ad clicks']),
        cpm: impr > 0 ? cost / impr * 1000 : 0 // derived: source xlsx has no CPM column
      };
    });
    populateFacets();
    setStatus('Loaded ' + fmt(state.rows.length) + ' rows from ' + esc(name) + '.');
    renderFileMeta(fileName, fileDate);
    applyFilters();
  }

  function loadArrayBuffer(buf, label, fileDate) {
    try {
      var wb = XLSX.read(buf, { type: 'array' });
      ingest(wb, label, fileDate);
    } catch (e) {
      setStatus('Parse failed (' + label + '): ' + e.message);
    }
  }

  $('fileInput').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () { loadArrayBuffer(reader.result, f.name, new Date(f.lastModified)); };
    reader.readAsArrayBuffer(f);
  });

  $('loadBundled').addEventListener('click', function () {
    setStatus('Fetching bundled file…');
    fetch(encodeURI(BUNDLED_FILE) + '?v=' + Date.now())
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' — serve via http://localhost:8000, file:// is blocked');
        var lm = r.headers.get('Last-Modified');
        return r.arrayBuffer().then(function (buf) { return { buf: buf, date: lm ? new Date(lm) : new Date() }; });
      })
      .then(function (o) { loadArrayBuffer(o.buf, BUNDLED_FILE, o.date); })
      .catch(function (e) { setStatus('Bundled load failed: ' + e.message); });
  });

  var dz = $('dropzone');
  ['dragover', 'dragenter'].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('drag-over'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('drag-over'); });
  });
  dz.addEventListener('drop', function (e) {
    var f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () { loadArrayBuffer(reader.result, f.name, new Date(f.lastModified)); };
    reader.readAsArrayBuffer(f);
  });

  /* ---------- facets ---------- */
  function fillSelect(id, values) {
    var sel = $(id), cur = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    values.sort().forEach(function (v) {
      if (v === '' || v === null || v === undefined) return;
      var o = document.createElement('option');
      o.value = v; o.textContent = v;
      sel.appendChild(o);
    });
    sel.value = cur;
  }
  /* Account search: narrows dropdown options without touching the active filter */
  function allAccounts() {
    var list = state.allowlist.slice();
    (state.others || []).forEach(function (a) { if (list.indexOf(a) === -1) list.push(a); });
    return list;
  }
  function updateSuggest() {
    var box = $('acctSuggest');
    var raw = $('fAccountSearch').value.trim(), q = raw.toLowerCase();
    if (!q) { box.hidden = true; box.innerHTML = ''; return; }
    var matches = allAccounts().filter(function (a) { return a.toLowerCase().indexOf(q) !== -1; });
    if (!matches.length) {
      box.innerHTML = '<div class="suggest-empty">No account found for &lsquo;' + esc(raw) + '&rsquo;.</div>';
    } else {
      box.innerHTML = matches.slice(0, 8).map(function (a) {
        var tag = state.allowlist.indexOf(a) !== -1 ? '<span class="suggest-tag">allowlisted</span>' : '';
        return '<button type="button" class="suggest-item" data-acc="' + esc(a) + '"><span>' + esc(a) + '</span>' + tag + '</button>';
      }).join('');
    }
    box.hidden = false;
  }
  function filterAccountOptions() {
    var q = $('fAccountSearch').value.trim().toLowerCase();
    var sel = $('fAccount');
    Array.prototype.forEach.call(sel.querySelectorAll('optgroup'), function (g) {
      var any = false;
      Array.prototype.forEach.call(g.querySelectorAll('option'), function (o) {
        var show = !q || o.textContent.toLowerCase().indexOf(q) !== -1;
        o.hidden = !show;
        if (show) any = true;
      });
      g.style.display = any ? '' : 'none';
    });
    updateSuggest();
  }
  $('fAccountSearch').addEventListener('input', filterAccountOptions);
  $('fAccountSearch').addEventListener('focus', updateSuggest);
  $('fAccountSearch').addEventListener('blur', function () {
    setTimeout(function () { $('acctSuggest').hidden = true; }, 150);
  });
  $('acctSuggest').addEventListener('mousedown', function (e) {
    var b = e.target.closest ? e.target.closest('.suggest-item') : null;
    if (!b) return;
    e.preventDefault();
    $('fAccount').value = b.getAttribute('data-acc');
    $('fAccountSearch').value = '';
    filterAccountOptions();
    $('acctSuggest').hidden = true;
    applyFilters();
  });
  $('fAccountSearch').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { $('acctSuggest').hidden = true; return; }
    if (e.key !== 'Enter') return;
    var sel = $('fAccount');
    for (var i = 0; i < sel.options.length; i++) {
      var o = sel.options[i];
      if (!o.hidden && o.value) { sel.value = o.value; $('acctSuggest').hidden = true; applyFilters(); break; }
    }
  });

  /* Account dropdown: Allowlisted optgroup + Other-accounts optgroup */
  function buildAccountOptions() {
    var sel = $('fAccount'), cur = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    var g1 = document.createElement('optgroup');
    g1.label = 'Allowlisted (' + state.allowlist.length + ')';
    state.allowlist.forEach(function (a) {
      var o = document.createElement('option');
      o.value = a; o.textContent = a;
      g1.appendChild(o);
    });
    sel.appendChild(g1);
    var others = (state.others || []).filter(function (a) { return state.allowlist.indexOf(a) === -1; });
    if (others.length) {
      var g2 = document.createElement('optgroup');
      g2.label = 'Other accounts in file (' + others.length + ')';
      others.forEach(function (a) {
        var o = document.createElement('option');
        o.value = a; o.textContent = a;
        g2.appendChild(o);
      });
      sel.appendChild(g2);
    }
    sel.value = cur;
    filterAccountOptions();
  }

  function populateFacets() {
    var statuses = {}, types = {}, secs = {};
    state.rows.forEach(function (r) { statuses[r.status] = 1; types[r.type] = 1; secs[r.sec] = 1; });
    fillSelect('fStatus', Object.keys(statuses));
    fillSelect('fType', Object.keys(types));
    fillSelect('fSec', Object.keys(secs));
    // all distinct file accounts -> "Other" group (allowlist filtered out in builder)
    var seen = {};
    state.rows.forEach(function (r) { if (r.account) seen[r.account] = 1; });
    state.others = Object.keys(seen).sort();
    buildAccountOptions();
  }

  /* ---------- filtering + render ---------- */
  ['fAccount', 'fStatus', 'fSec', 'fType', 'fSearch', 'fMinRoi', 'fMinOrders', 'fSort', 'fAllowlist', 'fMin1k']
    .forEach(function (id) {
      $(id).addEventListener('input', applyFilters);
      $(id).addEventListener('change', applyFilters);
    });

  function filtered(forceAccount) {
    var acc = forceAccount !== undefined ? forceAccount : $('fAccount').value, st = $('fStatus').value, ty = $('fType').value;
    var se = $('fSec').value;
    // Pasted Post IDs (all-digit tokens, comma/space/newline separated) -> exact ID match.
    // Anything else -> creative-text keyword search. Excel-safe: 19-digit IDs exceed
    // 2^53, so both sides compare as Numbers (identical IEEE754 rounding both ways).
    var rawQ = $('fSearch').value.trim();
    var tokens = rawQ.split(/[\s,;]+/).filter(function (t) { return t.length; });
    var idMode = tokens.length > 0 && tokens.every(function (t) { return /^[0-9]+$/.test(t); });
    state.idMode = idMode;
    var idNums = idMode ? tokens.map(Number).filter(isFinite) : [];
    var q = rawQ.toLowerCase();
    var minRoi = parseFloat($('fMinRoi').value);
    var minOrd = parseInt($('fMinOrders').value, 10);
    var onlyAllow = $('fAllowlist').checked;
    var only1k = $('fMin1k').checked;
    if (isNaN(minRoi)) minRoi = -Infinity;
    if (isNaN(minOrd)) minOrd = -Infinity;
    var out = state.rows.filter(function (r) {
      if (acc && r.account !== acc) return false;
      if (onlyAllow && state.allowlist.indexOf(r.account) === -1) return false;
      if (only1k && r.impr < 1000) return false;
      if (st && String(r.status) !== st) return false;
      if (se && String(r.sec) !== se) return false;
      if (ty && String(r.type) !== ty) return false;
      if (r.roi < minRoi || r.orders < minOrd) return false;
      if (rawQ) {
        if (idMode) {
          var pv = Number(r.postId);
          if (!isFinite(pv) || idNums.indexOf(pv) === -1) return false;
        } else if (String(r.creative).toLowerCase().indexOf(q) === -1) return false;
      }
      return true;
    });
    var sort = $('fSort').value;
    if (sort === 'cpm_asc') {
      out.sort(function (a, b) { return a.cpm - b.cpm; });
    } else {
      var key = { revenue_desc: 'revenue', roi_desc: 'roi', cost_desc: 'cost', orders_desc: 'orders', impr_desc: 'impr' }[sort] || 'revenue';
      out.sort(function (a, b) { return b[key] - a[key]; });
    }
    return out;
  }

  function applyFilters() {
    var rows = filtered();
    var cost = 0, rev = 0, ord = 0, impr = 0;
    rows.forEach(function (r) { cost += r.cost; rev += r.revenue; ord += r.orders; impr += r.impr; });
    $('kRows').textContent = fmt(rows.length);
    $('kCost').textContent = fmt(cost, 2);
    $('kRev').textContent = fmt(rev, 2);
    $('kOrders').textContent = fmt(ord);
    $('kRoi').textContent = cost > 0 ? (rev / cost).toFixed(2) : '–';
    $('kImpr').textContent = fmt(impr);
    $('kCpm').textContent = impr > 0 ? (cost / impr * 1000).toFixed(2) : '–';
    renderAcct(rows);
    renderCoverage(rows);
    renderTop(rows);
    renderChart(rows);
  }

  function renderAcct(rows) {
    var map = {};
    rows.forEach(function (r) {
      var m = map[r.account || '(blank)'] || (map[r.account || '(blank)'] = { rows: 0, cost: 0, rev: 0, ord: 0, impr: 0 });
      m.rows++; m.cost += r.cost; m.rev += r.revenue; m.ord += r.orders; m.impr += r.impr;
    });
    var list = Object.keys(map).map(function (k) {
      return { account: k, rows: map[k].rows, cost: map[k].cost, rev: map[k].rev, ord: map[k].ord,
        roi: map[k].cost > 0 ? map[k].rev / map[k].cost : 0,
        cpm: map[k].impr > 0 ? map[k].cost / map[k].impr * 1000 : 0 };
    }).sort(function (a, b) { return b.rev - a.rev; });
    var tb = $('acctTable').querySelector('tbody');
    if (!list.length) { tb.innerHTML = '<tr><td colspan="8" class="empty-note">No rows match.</td></tr>'; return; }
    tb.innerHTML = list.slice(0, 50).map(function (a) {
      var allow = state.allowlist.indexOf(a.account) !== -1;
      return '<tr data-acc="' + esc(a.account) + '" title="Click for creative details"><td>' + esc(a.account) + '</td><td>' + (allow ? 'yes' : '–') + '</td><td>' + fmt(a.rows) +
        '</td><td>' + fmt(a.cost, 2) + '</td><td>' + fmt(a.rev, 2) + '</td><td>' + fmt(a.ord) +
        '</td><td>' + a.roi.toFixed(2) + '</td><td>' + a.cpm.toFixed(2) + '</td></tr>';
    }).join('');
  }

  /* Allowlist coverage: which registered accounts have no data in the file (webpage only) */
  function normAcc(s) { return String(s).toLowerCase().replace(/[\s.]+/g, ''); }
  function lev(a, b) {
    var m = a.length, n = b.length, d = [], i, j;
    if (!m) return n;
    if (!n) return m;
    for (i = 0; i <= m; i++) d[i] = [i];
    for (j = 0; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) {
      for (j = 1; j <= n; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1,
          d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return d[m][n];
  }
  function renderCoverage(rows) {
    var wrap = $('coverageWrap'), sum = $('coverageSummary'), box = $('coverage');
    if (!state.allowlist.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    if (!state.rows.length) {
      sum.textContent = 'Allowlist coverage: load a file to check.';
      box.innerHTML = '';
      return;
    }
    var inFilter = {};
    rows.forEach(function (r) { inFilter[r.account] = (inFilter[r.account] || 0) + 1; });
    var distinct = {};
    state.rows.forEach(function (r) { distinct[r.account] = (distinct[r.account] || 0) + 1; });
    var found = 0, missing = 0, html = '';
    state.allowlist.forEach(function (a) {
      if (inFilter[a]) { found++; return; }
      var na = normAcc(a), best = [];
      Object.keys(distinct).forEach(function (h) {
        if (!h || h === a) return;
        var d = lev(na, normAcc(h));
        if (d <= 2) best.push({ h: h, d: d, n: distinct[h] });
      });
      best.sort(function (x, y) { return x.d - y.d || y.n - x.n; });
      var hints = best.slice(0, 2).map(function (b) {
        return 'Did you mean <button class="hint-btn" data-acc="' + esc(b.h) + '">' + esc(b.h) +
          '</button> (' + fmt(b.n) + ' rows)?';
      }).join(' ');
      html += '<div class="cov-miss">&#9888; <strong>' + esc(a) + '</strong> — 0 rows in this file, excluded from totals. ' + hints + '</div>';
      missing++;
    });
    box.innerHTML = html;
    sum.textContent = 'Allowlist coverage: ' + found + '/' + state.allowlist.length +
      ' registered accounts found' + (missing ? ' — ' + missing + ' missing (click to expand)' : '');
  }
  $('coverage').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.hint-btn') : null;
    if (!b) return;
    var sel = $('fAccount');
    $('fAccountSearch').value = '';
    filterAccountOptions();
    sel.value = b.getAttribute('data-acc');
    applyFilters();
  });

  /* Account detail modal: click a per-account row for its creatives */
  var MODAL_STEP = 50;
  function filterContext() {
    var bits = [];
    if ($('fStatus').value) bits.push('Status=' + $('fStatus').value);
    if ($('fSec').value) bits.push('2nd=' + $('fSec').value);
    if ($('fType').value) bits.push('Type=' + $('fType').value);
    var sq = $('fSearch').value.trim();
    if (sq) bits.push((state.idMode ? 'Post ID=' : 'Search=') + (sq.length > 40 ? sq.slice(0, 40) + '…' : sq));
    if ($('fMinRoi').value) bits.push('ROI>=' + $('fMinRoi').value);
    if ($('fMinOrders').value) bits.push('Orders>=' + $('fMinOrders').value);
    if ($('fMin1k').checked) bits.push('1000+ impressions');
    if ($('fAllowlist').checked) bits.push('allowlist only');
    if ($('fSort').value) bits.push('sorted by ' + $('fSort').value);
    return bits.length ? 'Active filters: ' + bits.join(' · ') : 'No filters — all creatives for this account';
  }
  function renderModalRows() {
    var rows = filtered(state.modalAccount);
    var scrollBox = $('acctModalTable').closest('.table-scroll');
    var st = scrollBox ? scrollBox.scrollTop : 0;
    var tb = $('acctModalTable').querySelector('tbody');
    tb.innerHTML = rows.slice(0, state.modalCount).map(function (r, i) {
      var cr = String(r.creative || '');
      if (cr.length > 90) cr = cr.slice(0, 90) + '…';
      return '<tr><td>' + (i + 1) + '</td><td>' + esc(cr) + '</td><td>' + esc(r.type) + '</td><td>' + esc(r.status) + '</td><td>' + esc(r.sec) +
        '</td><td>' + fmt(r.cost, 2) + '</td><td>' + fmt(r.orders) + '</td><td>' + fmt(r.revenue, 2) + '</td><td>' + r.roi.toFixed(2) +
        '</td><td>' + (r.impr >= 1000 ? '<span class="tick" title="1000+ impressions">✓ </span>' : '') + fmt(r.impr) +
        '</td><td>' + fmt(r.clicks) + '</td><td>' + r.cpm.toFixed(2) + '</td></tr>';
    }).join('') || '<tr><td colspan="12" class="empty-note">No creatives match the active filters.</td></tr>';
    if (scrollBox) scrollBox.scrollTop = st;
    $('acctModalFoot').textContent = 'Showing ' + Math.min(state.modalCount, rows.length) + ' of ' +
      fmt(rows.length) + ' by current sort. Use the main table + Export for the full set.';
    $('acctModalMore').hidden = state.modalCount >= rows.length;
  }
  function openAccountModal(account) {
    var rows = filtered(account);
    var cost = 0, rev = 0, ord = 0, impr = 0;
    rows.forEach(function (r) { cost += r.cost; rev += r.revenue; ord += r.orders; impr += r.impr; });
    var allow = state.allowlist.indexOf(account) !== -1;
    $('acctModalTitle').textContent = account + (allow ? ' ✓ allowlisted' : '');
    $('acctModalCtx').textContent = filterContext();
    $('acctModalKpis').innerHTML =
      kpiMini('Creatives', fmt(rows.length)) + kpiMini('Cost (MYR)', fmt(cost, 2)) +
      kpiMini('Revenue (MYR)', fmt(rev, 2)) + kpiMini('Orders', fmt(ord)) +
      kpiMini('Avg ROI', cost > 0 ? (rev / cost).toFixed(2) : '–') +
      kpiMini('Avg CPM', impr > 0 ? (cost / impr * 1000).toFixed(2) : '–');
    state.modalAccount = account;
    state.modalCount = MODAL_STEP;
    renderModalRows();
    $('acctModal').hidden = false;
    document.body.style.overflow = 'hidden';
    $('acctModalClose').focus();
  }
  function kpiMini(label, value) {
    return '<div class="kpi"><div class="kpi-label">' + esc(label) + '</div><div class="kpi-value" style="font-size:1rem">' + esc(value) + '</div></div>';
  }
  function closeAccountModal() {
    $('acctModal').hidden = true;
    document.body.style.overflow = '';
  }
  $('acctTable').querySelector('tbody').addEventListener('click', function (e) {
    var tr = e.target.closest ? e.target.closest('tr[data-acc]') : null;
    if (!tr) return;
    openAccountModal(tr.getAttribute('data-acc'));
  });
  $('acctModalClose').addEventListener('click', closeAccountModal);
  $('acctModalMore').addEventListener('click', function () {
    state.modalCount += MODAL_STEP;
    renderModalRows();
  });
  $('acctModal').addEventListener('click', function (e) {
    if (e.target === $('acctModal')) closeAccountModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('acctModal').hidden) closeAccountModal();
  });

  function renderTop(rows) {
    $('rowCount').textContent = '— ' + fmt(rows.length) + ' match';
    var tb = $('topTable').querySelector('tbody');
    if (!rows.length) { tb.innerHTML = '<tr><td colspan="13" class="empty-note">No rows match.</td></tr>'; return; }
    tb.innerHTML = rows.slice(0, MAX_TABLE_ROWS).map(function (r) {
      var cr = String(r.creative || '');
      if (cr.length > 90) cr = cr.slice(0, 90) + '…';
      return '<tr><td class="mono">' + esc(r.postId) + '</td><td>' + esc(cr) + '</td><td>' + esc(r.account) +
        '</td><td>' + esc(r.type) + '</td><td>' + esc(r.status) + '</td><td>' + esc(r.sec) + '</td><td>' + fmt(r.cost, 2) + '</td><td>' + fmt(r.orders) +
        '</td><td>' + fmt(r.revenue, 2) + '</td><td>' + r.roi.toFixed(2) + '</td><td>' + (r.impr >= 1000 ? '<span class="tick" title="1000+ impressions">✓ </span>' : '') + fmt(r.impr) + '</td><td>' + fmt(r.clicks) + '</td><td>' + r.cpm.toFixed(2) + '</td></tr>';
    }).join('');
  }

  function renderChart(rows) {
    if (typeof Chart === 'undefined') return;
    var map = {};
    rows.forEach(function (r) {
      var k = r.account || '(blank)';
      map[k] = (map[k] || 0) + r.revenue;
    });
    var top = Object.keys(map).map(function (k) { return { k: k, v: map[k] }; })
      .sort(function (a, b) { return b.v - a.v; }).slice(0, 10);
    var ctx = $('revChart').getContext('2d');
    if (state.chart) state.chart.destroy();
    state.chart = new Chart(ctx, {
      type: 'bar',
      data: { labels: top.map(function (t) { return t.k; }),
        datasets: [{ label: 'Revenue (MYR)', data: top.map(function (t) { return Math.round(t.v * 100) / 100; }) }] },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } } } }
    });
  }

  /* ---------- export ---------- */
  function download(name, content, mime) {
    var blob = new Blob([content], { type: mime });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  $('expCsv').addEventListener('click', function () {
    var rows = filtered();
    if (!rows.length) return;
    var head = ['Post ID', 'Creative', 'Account', 'Type', 'Status', 'Exploration secondary status', 'Cost', 'Orders', 'Revenue', 'ROI', 'Impressions', 'Clicks', 'CPM'];
    var q = function (v) { return '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"'; };
    var lines = [head.join(',')].concat(rows.map(function (r) {
      return [q(r.postId), q(r.creative), q(r.account), q(r.type), q(r.status), q(r.sec),
        r.cost.toFixed(2), r.orders, r.revenue.toFixed(2), r.roi.toFixed(2), r.impr, r.clicks, r.cpm.toFixed(2)].join(',');
    }));
    download('creatives-filtered.csv', lines.join('\n'), 'text/csv');
  });
  $('expJson').addEventListener('click', function () {
    download('creatives-filtered.json', JSON.stringify(filtered(), null, 2), 'application/json');
  });
})();
