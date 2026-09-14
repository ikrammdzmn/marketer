/* Marketer — local xlsx visualiser (vanilla JS, no build) */
(function () {
  'use strict';

  var BUNDLED_FILE = 'source-file/Creative data 2026-09-07 - 2026-09-14 - Product 1729556489100298210.xlsx';
  var MAX_TABLE_ROWS = 200;

  var state = { rows: [], allowlist: [], allowMeta: {}, chart: null };

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
  function loadAllowlist() {
    return fetch('data/accounts.json?v=' + Date.now())
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (arr) {
      // accounts.json: array of {name, username, note} (legacy plain strings tolerated).
      // Matching is ALWAYS exact on name; username/note are display-only.
      var list = Array.isArray(arr) ? arr : [];
      state.allowlist = list.map(function (e) { return typeof e === 'string' ? e : String(e.name || ''); }).filter(Boolean);
      state.allowMeta = {};
      list.forEach(function (e) {
        if (e && typeof e === 'object' && e.name) {
          state.allowMeta[String(e.name)] = { username: String(e.username || ''), note: String(e.note || '') };
        }
      });
      buildAccountOptions();
    })
    .catch(function () {
      setStatus('Note: data/accounts.json not found — run over HTTP to enable allowlist.');
    });
  }
  loadAllowlist();

  /* Allowlist display helpers: ' (@username)' suffix + ' — note' suffix */
  function allowUser(a) { var m = state.allowMeta[a]; return (m && m.username) ? ' (@' + m.username + ')' : ''; }
  function allowNote(a) { var m = state.allowMeta[a]; return (m && m.note) ? m.note : ''; }
  function allowLabel(a) { var n = allowNote(a); return a + allowUser(a) + (n ? ' — ' + n : ''); }

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
  /* Dataset period: parsed from filename ("7 days 2026-09-06 - 2026-09-13" or bare
     "2026-09-07 - 2026-09-14"), falling back to the min/max Time posted values. */
  function parsePeriod(name) {
    var m = /(\d+)\s*days?\s*(\d{4}-\d{2}-\d{2})\s*[–—-]\s*(\d{4}-\d{2}-\d{2})/i.exec(name || '');
    if (m) return { days: parseInt(m[1], 10), from: m[2], to: m[3] };
    var r = /(\d{4}-\d{2}-\d{2})\s*[–—-]\s*(\d{4}-\d{2}-\d{2})/.exec(name || '');
    if (r) {
      var span = Math.round((new Date(r[2]) - new Date(r[1])) / 86400000);
      if (isFinite(span)) return { days: Math.max(1, span), from: r[1], to: r[2] };
    }
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
      var orders = int(r['SKU orders']);
      var revenue = num(r['Gross revenue']);
      var rawAcc = String(r['TikTok account'] === null || r['TikTok account'] === undefined ? '' : r['TikTok account']).trim();
      // TikTok's unattributed placeholders ('', '0', '-') = default catalogue promo, not a creative
      var account = (rawAcc === '' || rawAcc === '0' || rawAcc === '-') ? 'Product Card' : rawAcc;
      return {
        postId: r['Post ID'],
        creative: r['Creative'],
        account: account,
        type: r['Creative type'],
        status: r['Status'],
        sec: r['Exploration secondary status'],
        timePosted: r['Time posted'],
        cost: cost,
        orders: orders,
        revenue: revenue,
        roi: num(r['ROI']),
        aov: orders > 0 ? revenue / orders : 0, // derived: source xlsx has no AOV column
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

  /* Bundled file: auto-detect the xlsx in source-file/ via the server directory
     listing (works on server.py / python http.server). Filenames carry the date
     range, so the last alphabetically = latest. Falls back to BUNDLED_FILE. */
  function fetchBundledFile(url, label) {
    return fetch(url + '?v=' + Date.now())
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' — serve via http://localhost:8000, file:// is blocked');
        var lm = r.headers.get('Last-Modified');
        return r.arrayBuffer().then(function (buf) { return { buf: buf, date: lm ? new Date(lm) : new Date() }; });
      })
      .then(function (o) { loadArrayBuffer(o.buf, label, o.date); });
  }
  function findBundledCandidates() {
    return fetch('source-file/?v=' + Date.now())
      .then(function (r) {
        if (!r.ok) throw 0;
        return r.text();
      })
      .then(function (html) {
        var seen = {}, out = [], m, re = /href="([^"]*?\.xlsx)"/gi;
        while ((m = re.exec(html))) {
          var name = decodeURIComponent(m[1].split('/').pop().split('?')[0]);
          if (name && !seen[name]) { seen[name] = 1; out.push(name); }
        }
        if (!out.length) throw 0;
        out.sort();
        return out;
      })
      .catch(function () { return [BUNDLED_FILE.split('/').pop()]; });
  }
  $('loadBundled').addEventListener('click', function () {
    setStatus('Fetching bundled file…');
    findBundledCandidates().then(function (names) {
      var file = names[names.length - 1];
      fetchBundledFile(encodeURI('source-file/' + file), file)
        .catch(function (e) { setStatus('Bundled load failed: ' + e.message); });
    });
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
        return '<button type="button" class="suggest-item" data-acc="' + esc(a) + '"><span>' + esc(a) + esc(allowUser(a)) + '</span>' + tag + '</button>';
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
      o.value = a; o.textContent = allowLabel(a);
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
  ['fAccount', 'fStatus', 'fSec', 'fType', 'fSearch', 'fMinRoi', 'fMinOrders', 'fSort', 'fAllowlist', 'fMin1k', 'fNoCard']
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
    var noCard = $('fNoCard').checked;
    if (isNaN(minRoi)) minRoi = -Infinity;
    if (isNaN(minOrd)) minOrd = -Infinity;
    var out = state.rows.filter(function (r) {
      if (acc && r.account !== acc) return false;
      if (onlyAllow && state.allowlist.indexOf(r.account) === -1) return false;
      if (only1k && r.impr < 1000) return false;
      if (noCard && r.account === 'Product Card') return false;
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
    $('kAov').textContent = ord > 0 ? (rev / ord).toFixed(2) : '–';
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
        aov: map[k].ord > 0 ? map[k].rev / map[k].ord : 0,
        cpm: map[k].impr > 0 ? map[k].cost / map[k].impr * 1000 : 0 };
    }).sort(function (a, b) { return b.rev - a.rev; });
    var tb = $('acctTable').querySelector('tbody');
    if (!list.length) { tb.innerHTML = '<tr><td colspan="9" class="empty-note">No rows match.</td></tr>'; return; }
    tb.innerHTML = list.slice(0, 50).map(function (a) {
      var allow = state.allowlist.indexOf(a.account) !== -1;
      return '<tr data-acc="' + esc(a.account) + '" title="Click for creative details"><td>' + esc(a.account) + esc(allowUser(a.account)) + '</td><td>' + (allow ? 'yes' : '–') + '</td><td>' + fmt(a.rows) +
        '</td><td>' + fmt(a.cost, 2) + '</td><td>' + fmt(a.rev, 2) + '</td><td>' + fmt(a.ord) +
        '</td><td>' + a.roi.toFixed(2) + '</td><td>' + a.aov.toFixed(2) + '</td><td>' + a.cpm.toFixed(2) + '</td></tr>';
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
      html += '<div class="cov-miss">&#9888; <strong>' + esc(a) + '</strong>' + esc(allowUser(a)) + ' — 0 rows in this file, excluded from totals. ' + hints + '</div>';
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
    if ($('fNoCard').checked) bits.push('Product Card excluded');
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
        '</td><td>' + r.aov.toFixed(2) +
        '</td><td>' + (r.impr >= 1000 ? '<span class="tick" title="1000+ impressions">✓ </span>' : '') + fmt(r.impr) +
        '</td><td>' + fmt(r.clicks) + '</td><td>' + r.cpm.toFixed(2) + '</td></tr>';
    }).join('') || '<tr><td colspan="13" class="empty-note">No creatives match the active filters.</td></tr>';
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
    var note = allowNote(account);
    $('acctModalTitle').textContent = account + (allow ? ' ✓ allowlisted' + allowUser(account) + (note ? ' — ' + note : '') : '');
    $('acctModalCtx').textContent = filterContext();
    $('acctModalKpis').innerHTML =
      kpiMini('Creatives', fmt(rows.length)) + kpiMini('Cost (MYR)', fmt(cost, 2)) +
      kpiMini('Revenue (MYR)', fmt(rev, 2)) + kpiMini('Orders', fmt(ord)) +
      kpiMini('Avg ROI', cost > 0 ? (rev / cost).toFixed(2) : '–') +
      kpiMini('Avg AOV', ord > 0 ? (rev / ord).toFixed(2) : '–') +
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
    if (e.key === 'Escape' && !$('mgrModal').hidden) closeMgr();
  });

  function renderTop(rows) {
    $('rowCount').textContent = '— ' + fmt(rows.length) + ' match';
    var tb = $('topTable').querySelector('tbody');
    if (!rows.length) { tb.innerHTML = '<tr><td colspan="14" class="empty-note">No rows match.</td></tr>'; return; }
    tb.innerHTML = rows.slice(0, MAX_TABLE_ROWS).map(function (r) {
      var cr = String(r.creative || '');
      if (cr.length > 90) cr = cr.slice(0, 90) + '…';
      return '<tr><td class="mono">' + esc(r.postId) + '</td><td>' + esc(cr) + '</td><td>' + esc(r.account) +
        '</td><td>' + esc(r.type) + '</td><td>' + esc(r.status) + '</td><td>' + esc(r.sec) + '</td><td>' + fmt(r.cost, 2) + '</td><td>' + fmt(r.orders) +
        '</td><td>' + fmt(r.revenue, 2) + '</td><td>' + r.roi.toFixed(2) + '</td><td>' + r.aov.toFixed(2) + '</td><td>' + (r.impr >= 1000 ? '<span class="tick" title="1000+ impressions">✓ </span>' : '') + fmt(r.impr) + '</td><td>' + fmt(r.clicks) + '</td><td>' + r.cpm.toFixed(2) + '</td></tr>';
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

  /* ---------- account manager (local server.py saver) ---------- */
  function mgrRow(name, username, note) {
    return '<div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:0.5rem;align-items:center" data-mrow>' +
      '<input data-f="name" class="filter-input" value="' + esc(name) + '" placeholder="Exact account name">' +
      '<input data-f="username" class="filter-input" value="' + esc(username) + '" placeholder="username (no @)">' +
      '<input data-f="note" class="filter-input" value="' + esc(note) + '" placeholder="note (optional)">' +
      '<button type="button" data-mdel class="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-sm" title="Remove">✕</button></div>';
  }
  function renderMgr() {
    $('mgrStatus').textContent = '';
    $('mgrRows').innerHTML = state.allowlist.map(function (a) {
      var m = state.allowMeta[a] || { username: '', note: '' };
      return mgrRow(a, m.username, m.note);
    }).join('');
  }
  function collectMgr() {
    var out = [], bad = -1;
    Array.prototype.forEach.call($('mgrRows').querySelectorAll('[data-mrow]'), function (row, i) {
      var g = function (f) { return row.querySelector('[data-f="' + f + '"]').value.trim(); };
      var name = g('name'), username = g('username'), note = g('note');
      if (!name && !username && !note) return; // skip blank rows
      if (!name) { bad = i + 1; return; }
      out.push({ name: name, username: username, note: note });
    });
    return { rows: out, bad: bad };
  }
  function openMgr() {
    renderMgr();
    $('mgrModal').hidden = false;
    document.body.style.overflow = 'hidden';
    probeSaver();
  }
  /* Detect whether the saver endpoint exists (server.py). Plain static servers
     answer /api/version with 404/empty HTML; server.py answers JSON. */
  function probeSaver() {
    $('mgrStatus').textContent = 'Checking saver…';
    fetch('/api/version?v=' + Date.now())
      .then(function (r) {
        return r.text().then(function (t) {
          var o = null;
          try { o = JSON.parse(t); } catch (e) { o = null; }
          if (o && o.server === 'server.py') {
            $('mgrStatus').textContent = 'Saver connected (local server.py).';
          } else if (t && t.charAt(0) === '<') {
            $('mgrStatus').textContent = 'Saver unavailable (plain file server at ' + location.host + ') — stop it and run python server.py in the tiktok-creative-analysis folder, or use Download JSON.';
          } else if (!t) {
            $('mgrStatus').textContent = 'Saver unavailable (empty reply from ' + location.host + ') — something else sits on this port. Stop it, run python server.py, reload, or use Download JSON.';
          } else {
            $('mgrStatus').textContent = 'Saver unavailable (HTTP ' + r.status + ') — use Download JSON.';
          }
        });
      })
      .catch(function () {
        $('mgrStatus').textContent = 'Saver unreachable — use Download JSON.';
      });
  }
  function closeMgr() {
    $('mgrModal').hidden = true;
    document.body.style.overflow = '';
  }
  $('manageAccts').addEventListener('click', openMgr);
  $('mgrClose').addEventListener('click', closeMgr);
  $('mgrAdd').addEventListener('click', function () {
    $('mgrRows').insertAdjacentHTML('beforeend', mgrRow('', '', ''));
  });
  $('mgrRows').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-mdel]') : null;
    if (!b) return;
    var row = b.closest('[data-mrow]');
    if (row) row.remove();
  });
  $('mgrDownload').addEventListener('click', function () {
    var c = collectMgr();
    if (c.bad > 0) { $('mgrStatus').textContent = 'Row ' + c.bad + ' needs a name.'; return; }
    download('accounts.json', JSON.stringify(c.rows, null, 2) + '\n', 'application/json');
    $('mgrStatus').textContent = 'Downloaded ' + c.rows.length + ' entries — replace data/accounts.json with it.';
  });
  $('mgrSave').addEventListener('click', function () {
    var c = collectMgr();
    if (c.bad > 0) { $('mgrStatus').textContent = 'Row ' + c.bad + ' needs a name.'; return; }
    if (c.rows.length > 100) { $('mgrStatus').textContent = 'Too many entries (max 100).'; return; }
    $('mgrStatus').textContent = 'Saving…';
    fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c.rows)
    }).then(function (r) {
      return r.text().then(function (t) {
        var o = null;
        try { o = JSON.parse(t); } catch (e) { o = null; }
        if (o && o.ok) return o;
        if (r.status === 501 || (t && t.charAt(0) === '<')) throw new Error('plain file server detected — stop it and run python server.py (or use Download JSON)');
        if (!t) throw new Error('empty reply from server (static hosting?) — use Download JSON, or edit locally with server.py');
        throw new Error((o && o.error) || ('HTTP ' + r.status));
      });
    }).then(function (o) {
      $('mgrStatus').textContent = 'Saved ' + o.entries + ' entries' +
        (o.backup ? ' (backup: ' + o.backup + ')' : '') + '. Reloading…';
      loadAllowlist().then(function () { applyFilters(); closeMgr(); setStatus('Allowlist reloaded (' + o.entries + ' entries).'); });
    }).catch(function (e) {
      $('mgrStatus').textContent = 'Save failed: ' + e.message + '.';
    });
  });
  $('mgrModal').addEventListener('click', function (e) {
    if (e.target === $('mgrModal')) closeMgr();
  });

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
  function buildCsv(rows) {
    var head = ['Post ID', 'Creative', 'Account', 'Type', 'Status', 'Exploration secondary status', 'Cost', 'Orders', 'Revenue', 'ROI', 'AOV', 'Impressions', 'Clicks', 'CPM'];
    var q = function (v) { return '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"'; };
    var lines = [head.join(',')].concat(rows.map(function (r) {
      return [q(r.postId), q(r.creative), q(r.account), q(r.type), q(r.status), q(r.sec),
        r.cost.toFixed(2), r.orders, r.revenue.toFixed(2), r.roi.toFixed(2), r.aov.toFixed(2), r.impr, r.clicks, r.cpm.toFixed(2)].join(',');
    }));
    return lines.join('\n');
  }
  $('expCsv').addEventListener('click', function () {
    var rows = filtered();
    if (!rows.length) return;
    download('creatives-filtered.csv', buildCsv(rows), 'text/csv');
  });
  /* Sheet-like preview: same filtered set as Export, rendered as a standalone
     HTML table page (new tab, local-only blob). Drag header edges to resize
     columns (Chrome/Edge); click any cell to expand its full text. */
  var PREVIEW_COLS = ['Post ID', 'Creative', 'Account', 'Type', 'Status', 'Exploration secondary status', 'Cost', 'Orders', 'Revenue', 'ROI', 'AOV', 'Impressions', 'Clicks', 'CPM'];
  var PREVIEW_WIDTHS = [150, 340, 170, 90, 110, 150, 90, 80, 110, 70, 80, 110, 80, 80];
  function buildPreviewHtml(rows) {
    var css = 'body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;background:#f3f4f6;color:#111827}' +
      '@media (prefers-color-scheme:dark){body{background:#111827;color:#e5e7eb}}' +
      'header{position:sticky;top:0;z-index:5;background:inherit;padding:12px 16px;border-bottom:1px solid #d1d5db}' +
      'h1{font-size:16px;margin:0 0 4px}p.meta{font-size:12px;color:#6b7280;margin:0 0 8px}' +
      '.toolbar{display:flex;gap:16px;align-items:center;font-size:13px}.tip{color:#6b7280}' +
      '.wrap-scroll{overflow:auto;max-height:calc(100vh - 140px)}' +
      'table{border-collapse:collapse;table-layout:fixed;width:max-content;min-width:100%;font-size:12px;background:#fff}' +
      '@media (prefers-color-scheme:dark){table{background:#1f2937}}' +
      'th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}' +
      '@media (prefers-color-scheme:dark){th,td{border-color:#374151}}' +
      'thead th{position:sticky;top:0;background:#e5e7eb;resize:horizontal;overflow:hidden;min-width:60px;max-width:800px;z-index:2}' +
      '@media (prefers-color-scheme:dark){thead th{background:#030712}}' +
      'tbody tr:nth-child(even){background:rgba(0,0,0,0.04)}' +
      'td.num{text-align:right;font-variant-numeric:tabular-nums}td.mono{font-family:ui-monospace,monospace;font-size:11px}' +
      'td.open{white-space:normal;overflow:visible}table.wrap-all td{white-space:normal;overflow:visible}';
    var js = 'document.querySelector("tbody").addEventListener("click",function(e){' +
      'var td=e.target.closest?e.target.closest("td"):null;if(td)td.classList.toggle("open");});' +
      'document.getElementById("wrapAll").addEventListener("change",function(e){' +
      'document.querySelector("table").classList.toggle("wrap-all",e.target.checked);});';
    var head = '<tr>' + PREVIEW_COLS.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>';
    var cols = PREVIEW_WIDTHS.map(function (w) { return '<col style="width:' + w + 'px">'; }).join('');
    var body = rows.map(function (r) {
      return '<tr><td class="mono">' + esc(r.postId) + '</td><td>' + esc(r.creative) + '</td><td>' + esc(r.account) +
        '</td><td>' + esc(r.type) + '</td><td>' + esc(r.status) + '</td><td>' + esc(r.sec) + '</td><td class="num">' + fmt(r.cost, 2) + '</td><td class="num">' + fmt(r.orders) +
        '</td><td class="num">' + fmt(r.revenue, 2) + '</td><td class="num">' + r.roi.toFixed(2) + '</td><td class="num">' + r.aov.toFixed(2) + '</td><td class="num">' + fmt(r.impr) +
        '</td><td class="num">' + fmt(r.clicks) + '</td><td class="num">' + r.cpm.toFixed(2) + '</td></tr>';
    }).join('');
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Preview (' + fmt(rows.length) + ' rows) — TikTok Creative Analysis</title>' +
      '<style>' + css + '</style></head><body>' +
      '<header><h1>Preview — ' + fmt(rows.length) + ' rows</h1>' +
      '<p class="meta">' + esc(filterContext()) + ' · generated ' + esc(new Date().toLocaleString('en-GB')) + '</p>' +
      '<div class="toolbar"><label><input type="checkbox" id="wrapAll"> Wrap all cells</label>' +
      '<span class="tip">Tip: drag a column edge to resize, click any cell to expand it, Ctrl+F to find.</span></div></header>' +
      '<div class="wrap-scroll"><table><colgroup>' + cols + '</colgroup><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      '<script>' + js + '</scr' + 'ipt></body></html>';
  }
  $('previewCsv').addEventListener('click', function () {
    var rows = filtered();
    if (!rows.length) return;
    var blob = new Blob([buildPreviewHtml(rows)], { type: 'text/html;charset=utf-8' });
    window.open(URL.createObjectURL(blob), '_blank');
  });
  $('expJson').addEventListener('click', function () {
    download('creatives-filtered.json', JSON.stringify(filtered(), null, 2), 'application/json');
  });
})();
