/* Marketer — local xlsx visualiser (vanilla JS, no build) */
(function () {
  'use strict';

  var BUNDLED_FILE = 'source-file/1. himcoffee - [1858977225474178]/Creative data 2026-09-19 - 2026-09-19 - Product 1729556489100298210.xlsx';
  var MAX_TABLE_ROWS = 200;

  var state = { rows: [], allowlist: [], allowMeta: {}, bench: null, chart: null, trendChart: null, trendSoloChart: null,
    targets: { topN: 20, minImpr: null, maxCPM: null },
    files: [], cmpRows: [], cmpMode: 'compare', cmpInfo: '', dialectCache: {} };

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
  /* Posting date: 'YYYY-MM-DD hh:mm' -> '10 Sep · 4d'; blank/dash -> '–'.
     NOTE: post date is NOT pool-entry time (boosts re-enter Exploring). */
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function ageDays(tp) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(tp || ''));
    if (!m) return NaN;
    var ms = Date.now() - new Date(+m[1], +m[2] - 1, +m[3]).getTime();
    if (!isFinite(ms)) return -1;
    return Math.floor(ms / 86400000);
  }
  function fmtPosted(tp) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(tp || ''));
    if (!m) return '–';
    var a = ageDays(tp);
    return (+m[3]) + ' ' + MONTHS[+m[2] - 1] + (a >= 0 ? ' · ' + a + 'd' : '');
  }

  /* ---------- insight engine (file-adaptive benchmarks + per-video verdicts) ---------- */
  function median(a) {
    if (!a.length) return 0;
    var s = a.slice().sort(function (x, y) { return x - y; });
    var m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function percentile(a, p) {
    if (!a.length) return 0;
    var s = a.slice().sort(function (x, y) { return x - y; });
    return s[Math.min(s.length - 1, Math.floor(p * s.length))];
  }
  function computeBench() {
    var rows = state.rows;
    var N = (state.targets && state.targets.topN) || 20;
    var byImpr = rows.slice().sort(function (a, b) { return b.impr - a.impr; });
    var top = byImpr.slice(0, N);
    var autoTop = top.length ? top[top.length - 1].impr : 0;
    var autoCpm = median(top.filter(function (r) { return r.impr > 0; }).map(function (r) { return r.cpm; }));
    var revRows = rows.filter(function (r) { return r.revenue > 0; });
    var t = state.targets || {};
    state.bench = {
      topN: N,
      topBar: (typeof t.minImpr === 'number') ? t.minImpr : autoTop,
      topSrc: (typeof t.minImpr === 'number') ? 'yours' : 'auto',
      cpmBar: (typeof t.maxCPM === 'number') ? t.maxCPM : autoCpm,
      cpmSrc: (typeof t.maxCPM === 'number') ? 'yours' : 'auto',
      medV2: median(rows.filter(function (r) { return r.impr >= 200; }).map(function (r) { return r.v2; })),
      medAOV: median(rows.filter(function (r) { return r.orders > 0; }).map(function (r) { return r.aov; })),
      p90roi: percentile(revRows.map(function (r) { return r.roi; }), 0.9),
      medRev: median(revRows.map(function (r) { return r.revenue; }))
    };
  }
  /* Benchmark strip above Top creatives */
  function renderBench() {
    var el = $('benchText');
    if (!el) return;
    var B = state.bench;
    if (!B || !state.rows.length) { el.textContent = 'Load a file to see the benchmark bar.'; return; }
    el.textContent = 'Top-' + B.topN + ' bar: ≥' + fmt(B.topBar) + ' impr (' + B.topSrc +
      ') · CPM ≤' + B.cpmBar.toFixed(2) + ' (' + B.cpmSrc + ')';
  }
  /* Insight guide: one row per verdict with live file-adaptive thresholds. */
  function guideRows() {
    var B = state.bench || { topN: 20, topBar: 0, topSrc: 'auto', cpmBar: 0, cpmSrc: 'auto', medV2: 0, medAOV: 0, p90roi: 0, medRev: 0 };
    var live = state.rows.length > 0;
    var na = live ? '' : ' (load a file for live numbers)';
    return [
      { slug: 'Catalogue', chip: '📇', cls: 'chip-c', label: 'Catalogue',
        rule: 'Account-less catalogue row (Product-card type, no video, or no campaign) — not a creative. Blank-account real videos get an Unknown account row + normal verdicts.',
        fix: 'Tick Exclude Product Card for creative-only numbers.' },
      { slug: 'Template', chip: '⭐', cls: 'chip-s', label: 'Template',
        rule: 'Top-decile ROI (≥' + B.p90roi.toFixed(2) + ') with revenue ≥ median (RM' + fmt(B.medRev, 2) + ').' + na,
        fix: 'Copy its hook and retention curve.' },
      { slug: 'Review', chip: '🛑', cls: 'chip-r', label: 'Review',
        rule: 'Spent ≥RM5 with 0 orders. Per-video CPM vs bar called out when above.',
        fix: 'Consider excluding.' },
      { slug: 'Boost', chip: '🚀', cls: 'chip-b', label: 'Boost',
        rule: 'Performing/Outstanding + ROI≥3 + spend<RM50 + CPM at/below bar (' + B.cpmBar.toFixed(2) + ' ' + B.cpmSrc + ').' + na,
        fix: 'Candidate to boost toward ' + fmt(B.topBar) + ' impressions (' + B.topSrc + ').' },
      { slug: 'Learning', chip: '👀', cls: 'chip-l', label: 'Learning',
        rule: 'Under 1,000 impressions — too early to judge.',
        fix: 'Watch toward ' + fmt(B.topBar) + ' (' + B.topSrc + ').' + na },
      { slug: 'Hook', chip: '🪝', cls: 'chip-h', label: 'Hook weak',
        rule: '2s view rate below file median (' + (B.medV2 * 100).toFixed(1) + '%).' + na,
        fix: 'Re-shoot the opening.' },
      { slug: 'Drops', chip: '📉', cls: 'chip-d', label: 'Drops @%',
        rule: 'Biggest retention drop ≥40% at that point (2s→25%→50%→75%→100%).',
        fix: 'Fix that segment.' },
      { slug: 'Basket', chip: '🧺', cls: 'chip-k', label: 'Small basket',
        rule: 'Profitable but AOV below median (RM' + fmt(B.medAOV, 2) + ').' + na,
        fix: 'Push bundles.' }
    ];
  }
  function renderInsightGuide() {
    var el = $('insightGuide');
    if (!el) return;
    el.innerHTML = guideRows().map(function (g) {
      return '<div id="ins-' + g.slug + '" class="text-sm"><span class="chip ' + g.cls + '">' +
        g.chip + ' ' + esc(g.label) + '</span> <span>' + esc(g.rule) + '</span> <span class="text-gray-500 dark:text-gray-400">' +
        esc(g.fix) + '</span></div>';
    }).join('');
  }
  function syncTopNUI() {
    var sel = $('fTopN');
    if (sel) sel.value = String((state.targets && state.targets.topN) || 20);
  }
  /* SOP targets: data/targets.json ({topN, minImpr, maxCPM}; null = auto) */
  function loadTargets() {
    return fetch('data/targets.json?v=' + Date.now())
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (o) {
        if (o && typeof o === 'object') {
          var tn = parseInt(o.topN, 10);
          state.targets.topN = (!isNaN(tn) && tn >= 5 && tn <= 50) ? tn : 20;
          state.targets.minImpr = (typeof o.minImpr === 'number' && o.minImpr >= 0) ? o.minImpr : null;
          state.targets.maxCPM = (typeof o.maxCPM === 'number' && o.maxCPM >= 0) ? o.maxCPM : null;
        }
        syncTopNUI();
        if (state.rows.length) { computeBench(); renderBench(); applyFilters(); }
      })
      .catch(function () { syncTopNUI(); });
  }
  loadTargets();
  /* Biggest relative retention drop (v2 -> 25% -> 50% -> 75% -> 100%), >= 40% */
  function cliffOf(r) {
    var seq = [['25%', r.v25], ['50%', r.v50], ['75%', r.v75], ['100%', r.v100]];
    var prev = r.v2, worst = null, worstDrop = 0.4;
    for (var i = 0; i < seq.length; i++) {
      var cur = seq[i][1];
      if (prev > 0) {
        var drop = (prev - cur) / prev;
        if (drop >= worstDrop) { worst = seq[i][0]; worstDrop = drop; }
      }
      prev = cur;
    }
    return worst;
  }
  /* One verdict per video. Priority: Catalogue > Template > Review > Boost >
     Learning > Hook > Retention cliff > Basket > neutral. Thresholds adapt to
     the loaded file via state.bench (recomputed on every ingest). */
  function insightOf(r) {
    var B = state.bench || { topBar: 0, topSrc: 'auto', cpmBar: 0, cpmSrc: 'auto', medV2: 0, medAOV: 0, p90roi: 0, medRev: 0 };
    if (r.account === 'Product Card')
      return { chip: '📇', cls: 'chip-c', label: 'Catalogue', detail: 'TikTok catalogue promo, not a creative. Tick Exclude Product Card for creative-only numbers.' };
    if (r.revenue > 0 && B.medRev > 0 && r.roi >= B.p90roi && r.revenue >= B.medRev)
      return { chip: '⭐', cls: 'chip-s', label: 'Template', detail: 'Top-decile ROI (' + r.roi.toFixed(2) + ') with RM' + fmt(r.revenue, 2) + ' revenue. Copy its hook and retention curve.' };
    if (r.orders === 0 && r.cost >= 5)
      return { chip: '🛑', cls: 'chip-r', label: 'Review', detail: 'RM' + fmt(r.cost, 2) + ' spent, 0 orders' + (B.cpmBar > 0 && r.cpm > B.cpmBar ? ' — CPM ' + r.cpm.toFixed(2) + ' above bar ' + B.cpmBar.toFixed(2) + ' (' + B.cpmSrc + ')' : '') + '. Consider excluding.' };
    if ((r.sec === 'Performing' || r.sec === 'Outstanding') && r.roi >= 3 && r.cost < 50 && r.impr > 0 && B.cpmBar > 0 && r.cpm <= B.cpmBar)
      return { chip: '🚀', cls: 'chip-b', label: 'Boost', detail: 'ROI ' + r.roi.toFixed(2) + ', RM' + fmt(r.cost, 2) + ' spend, CPM ' + r.cpm.toFixed(2) + ' at/below bar ' + B.cpmBar.toFixed(2) + ' (' + B.cpmSrc + '). Candidate to boost toward ' + fmt(B.topBar) + ' impressions (' + B.topSrc + ').' };
    if (r.impr < 1000)
      return { chip: '👀', cls: 'chip-l', label: 'Learning', detail: fmt(r.impr) + ' impressions — too early to judge. Watch toward ' + fmt(B.topBar) + ' (' + B.topSrc + ').' };
    if (B.medV2 > 0 && r.v2 < B.medV2)
      return { chip: '🪝', cls: 'chip-h', label: 'Hook weak', detail: '2s view rate ' + (r.v2 * 100).toFixed(1) + '% below file median ' + (B.medV2 * 100).toFixed(1) + '%. Re-shoot the opening.' };
    var cliff = cliffOf(r);
    if (cliff)
      return { chip: '📉', cls: 'chip-d', label: 'Drops @' + cliff, detail: 'Retention cliff at ' + cliff + ' — fix that segment.' };
    if (r.orders > 0 && B.medAOV > 0 && r.aov < B.medAOV)
      return { chip: '🧺', cls: 'chip-k', label: 'Small basket', detail: 'AOV RM' + r.aov.toFixed(2) + ' below median RM' + B.medAOV.toFixed(2) + '. Push bundles.' };
    return { chip: '', cls: '', label: '—', detail: '' };
  }
  function insightCell(r) {
    var ins = insightOf(r);
    if (!ins.chip) return '<td>—</td>';
    return '<td><span class="chip ' + ins.cls + '" data-ins="' + esc(keyOf(r.postId, r.account, r.creative)) +
      '" title="' + esc(ins.detail) + ' — click to explain" style="cursor:pointer">' + ins.chip + ' ' + esc(ins.label) + '</span></td>';
  }
  function insightText(r) {
    var ins = insightOf(r);
    return ins.label + (ins.detail ? ' — ' + ins.detail : '');
  }
  /* Base verdict for filtering: collapses dynamic 'Drops @50%' labels to 'Drops'. */
  function insBase(r) {
    var l = insightOf(r).label;
    if (l.indexOf('Drops @') === 0) return 'Drops';
    return l;
  }
  /* Exploration secondary status as a pill badge (icon + label) */
  var SEC_BADGE = {
    'Performing': ['sec-performing', '✓'],
    'Outstanding': ['sec-outstanding', '🏆'],
    'Underperforming': ['sec-underperforming', '🛡'],
    'Exploring': ['sec-exploring', '◷'],
    'Calculating': ['sec-calculating', '⏳'],
    'Unavailable': ['sec-flat', '–'],
    'Authorization needed': ['sec-flat', '🔑'],
    'Rejected': ['sec-rejected', '✕']
  };
  function secBadge(sec) {
    var b = SEC_BADGE[sec] || ['sec-flat', '•'];
    return '<span class="sec ' + b[0] + '">' + b[1] + ' ' + esc(sec) + '</span>';
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
      // accounts.json: array of {name, username, accountId, note, active, live}
      // (legacy plain strings tolerated). Matching is ALWAYS exact on name;
      // everything else is display-only.
      var list = Array.isArray(arr) ? arr : [];
      state.allowlist = list.map(function (e) { return typeof e === 'string' ? e : String(e.name || ''); }).filter(Boolean);
      state.allowMeta = {};
      list.forEach(function (e) {
        if (e && typeof e === 'object' && e.name) {
          state.allowMeta[String(e.name)] = { username: String(e.username || ''), note: String(e.note || ''),
            accountId: String(e.accountId || ''), active: toBool(e.active, true), live: toBool(e.live, false),
            topAffiliate: toBool(e.topAffiliate, false),
            updatedAt: (typeof e.updatedAt === 'string' && e.updatedAt) ? e.updatedAt : null };
        }
      });
      buildAccountOptions();
    })
    .catch(function () {
      setStatus('Note: data/accounts.json not found — run over HTTP to enable allowlist.');
    });
  }
  loadAllowlist();

  /* Catalog (campaign/product ID → friendly names). data/catalog.json is user-authored;
     IDs/labels are display-only — matching stays exact on raw file values. */
  function loadCatalog() {
    return fetch('data/catalog.json?v=' + Date.now())
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (o) {
      state.catalog = (o && typeof o === 'object') ? o : { campaigns: {}, products: {} };
      if (!state.catalog.campaigns) state.catalog.campaigns = {};
      if (!state.catalog.products) state.catalog.products = {};
      if (!state.catalog.archived) state.catalog.archived = {};
      if (!state.catalog.archived.campaigns) state.catalog.archived.campaigns = {};
      if (!state.catalog.archived.products) state.catalog.archived.products = {};
      if (state.rows.length) { populateFacets(); renderCatHint(); applyFilters(); }
    })
    .catch(function () { state.catalog = { campaigns: {}, products: {}, archived: { campaigns: {}, products: {} } }; });
  }
  loadCatalog();
  /* Catalog entry lookup: active section first, `archived` section second, so
     old/deactivated IDs moved to archived still resolve their friendly names
     in past files. Returns the entry object or null. */
  function catCamp(cid) {
    cid = String(cid || '');
    if (!cid) return null;
    var ct = state.catalog || {}, a = ct.archived || {};
    return (ct.campaigns && ct.campaigns[cid]) || (a.campaigns && a.campaigns[cid]) || null;
  }
  /* Merged catalog maps (active + archived, active wins) for renderers that
     index IDs directly. */
  function mergedCat() {
    var ct = state.catalog || {}, a = ct.archived || {}, out = {};
    Object.keys((a.campaigns) || {}).forEach(function (k) { out[k] = a.campaigns[k]; });
    Object.keys((ct.campaigns) || {}).forEach(function (k) { out[k] = ct.campaigns[k]; });
    return out;
  }
  function mergedPrd() {
    var ct = state.catalog || {}, a = ct.archived || {}, out = {};
    Object.keys((a.products) || {}).forEach(function (k) { out[k] = a.products[k]; });
    Object.keys((ct.products) || {}).forEach(function (k) { out[k] = ct.products[k]; });
    return out;
  }
  function catProd(pid) {
    pid = String(pid || '');
    if (!pid) return null;
    var ct = state.catalog || {}, a = ct.archived || {};
    return (ct.products && ct.products[pid]) || (a.products && a.products[pid]) || null;
  }
  /* Friendly display names — bare IDs never stand alone in the UI.
     Campaign: catalog label → raw file name → 'Unnamed campaign' placeholder.
     Product: catalog name → Product-Card rule → 'Unnamed product' placeholder.
     Raw IDs survive only in hover tooltips and CSV ID columns. */
  function campLabel(row) {
    var cid = String((row && row.campaignId) || '');
    var e = catCamp(cid);
    if (e && e.label) return e.label;
    if (row && row.campaign) return row.campaign;
    return cid ? 'Unnamed campaign' : '–';
  }
  function prodName(row) {
    var pid = String((row && row.productId) || '');
    var e = catProd(pid);
    if (e && e.name) return e.name;
    // Catalogue rows carry Product ID 'N/A' — show them as the campaign's Product Card.
    if (pid.toUpperCase() === 'N/A' && row && row.campaign) return 'Product Card - ' + campLabel(row);
    if (pid && pid.toUpperCase() !== 'N/A') return 'Unnamed product';
    return (row && row.productId) || '–';
  }
  /* Product→campaign tie: catalog link field wins; otherwise the campaign the
     product appears in most across loaded files (recomputed per ingest). */
  function campLinkOf(pid) {
    pid = String(pid || '');
    if (!pid) return '';
    var e = catProd(pid);
    if (e && e.campaignId) return String(e.campaignId);
    return (state.prodLink && state.prodLink[pid]) || '';
  }
  /* Product hover title: linked campaign label (when named) + raw product ID. */
  function prodTitle(r) {
    var pid = String((r && r.productId) || '');
    var cid = campLinkOf(pid) || String((r && r.campaignId) || '');
    var lab = cid && catCamp(cid) && catCamp(cid).label;
    return (lab ? lab + ' · ' : '') + pid;
  }
  // Unmapped-ID hint: which campaign/product IDs in the loaded files have no friendly name yet.
  // Unnamed products are grouped by their tied campaign so naming stays per-campaign.
  // Archived entries count as named (they keep their labels).
  function renderCatHint() {
    var el = $('catHint');
    if (!el) return;
    var uc = {}, up = {}, upCamp = {}, upCampName = {};
    state.files.forEach(function (f) {
      f.rows.forEach(function (r) {
        if (r.campaignId && !(catCamp(r.campaignId) && catCamp(r.campaignId).label)) uc[r.campaignId] = 1;
        if (r.productId && String(r.productId).toUpperCase() !== 'N/A' && !(catProd(r.productId) && catProd(r.productId).name)) {
          up[r.productId] = 1;
          var cid = campLinkOf(r.productId) || String(r.campaignId || '');
          upCamp[r.productId] = cid;
          if (cid && r.campaign) upCampName[cid] = r.campaign;
        }
      });
    });
    var nc = Object.keys(uc).length, np = Object.keys(up).length;
    if (!state.files.length || (!nc && !np)) { el.textContent = ''; el.title = ''; return; }
    var byCamp = {};
    Object.keys(up).forEach(function (pid) {
      var cid = upCamp[pid] || '';
      byCamp[cid] = (byCamp[cid] || 0) + 1;
    });
    var grp = Object.keys(byCamp).map(function (cid) {
      var lab = cid ? campLabel({ campaign: upCampName[cid] || '', campaignId: cid }) : 'no campaign';
      return byCamp[cid] + ' in ' + lab;
    }).join(', ');
    el.textContent = 'Catalog: ' + (nc ? nc + ' campaign(s)' : '') + (nc && np ? ' + ' : '') +
      (np ? np + ' product(s)' + (grp ? ' (' + grp + ')' : '') : '') +
      ' unnamed — name them in data/catalog.json to show friendly labels.';
    // Hover lists the actual unnamed IDs so the user knows which entries to add.
    var missC = Object.keys(uc).slice(0, 10).join(', ');
    var missP = Object.keys(up).slice(0, 10).join(', ');
    el.title = (nc ? 'Unnamed campaign IDs: ' + missC + (nc > 10 ? ', …' : '') : '') +
      ((nc && np) ? '\n' : '') + (np ? 'Unnamed product IDs: ' + missP + (np > 10 ? ', …' : '') : '');
  }

  /* Allowlist display helpers: ' (@username)' suffix + ' — note' suffix + ID/Active/Live flags */
  function toBool(v, dflt) {
    if (v === undefined || v === null || v === '') return dflt;
    if (v === true || v === 1 || v === '1') return true;
    if (typeof v === 'string') {
      var s = v.toLowerCase().trim();
      if (s === 'true' || s === 'yes') return true;
      if (s === 'false' || s === 'no' || s === '0') return false;
    }
    return !!v;
  }
  function allowUser(a) { var m = state.allowMeta[a]; return (m && m.username) ? ' (@' + m.username + ')' : ''; }
  function allowNote(a) { var m = state.allowMeta[a]; return (m && m.note) ? m.note : ''; }
  function allowId(a) { var m = state.allowMeta[a]; return (m && m.accountId) ? ' · ID ' + m.accountId : ''; }
  function allowFlags(a) {
    var m = state.allowMeta[a];
    if (!m) return '';
    return (m.live ? ' · 🔴 LIVE' : '') + (m.active ? '' : ' · ⏸ inactive') + (m.topAffiliate ? ' · ⭐ TOP AFFILIATE' : '');
  }
  function allowLabel(a) { var n = allowNote(a); return a + allowUser(a) + (n ? ' — ' + n : '') + allowFlags(a); }
  /* Save-stamp: 'Last updated: 17/9/26 (45 minutes ago)' — server-local time, null = '–'. */
  function fmtAgo(ts) {
    if (!ts) return '–';
    var t = new Date(String(ts)).getTime();
    if (!isFinite(t)) return '–';
    var d = new Date(t);
    var date = d.getDate() + '/' + (d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(2);
    var mins = Math.max(0, Math.floor((Date.now() - t) / 60000));
    var ago;
    if (mins < 1) ago = 'just now';
    else if (mins < 60) ago = mins + (mins === 1 ? ' minute ago' : ' minutes ago');
    else if (mins < 1440) { var h = Math.floor(mins / 60); ago = h + (h === 1 ? ' hour ago' : ' hours ago'); }
    else { var dys = Math.floor(mins / 1440); ago = dys + (dys === 1 ? ' day ago' : ' days ago'); }
    return 'Last updated: ' + date + ' (' + ago + ')';
  }
  function allowUpdated(a) { var m = state.allowMeta[a]; return (m && m.updatedAt) ? ' · ' + fmtAgo(m.updatedAt) : ''; }
  /* Inactive allowlisted account? Non-allowlisted accounts are never inactive. */
  function isInactiveAcc(a) {
    if (state.allowlist.indexOf(a) === -1) return false;
    var m = state.allowMeta[a];
    return !!(m && m.active === false);
  }

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
    // Bulk product-campaigns naming: "2026-09-08 00 ~ 2026-09-15 05" (tilde + hour suffixes)
    var t = /(\d{4}-\d{2}-\d{2})(?:\s+\d{1,2})?\s*~\s*(\d{4}-\d{2}-\d{2})(?:\s+\d{1,2})?/.exec(name || '');
    if (t) {
      var tspan = Math.round((new Date(t[2]) - new Date(t[1])) / 86400000);
      if (isFinite(tspan)) return { days: Math.max(1, tspan), from: t[1], to: t[2] };
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

  /* ---------- multi-file compare engine ---------- */
  // Pure period parse from filename only (no state fallback) — used for overlap detection + sorting.
  function periodOfName(name) {
    var m = /(\d+)\s*days?\s*(\d{4}-\d{2}-\d{2})\s*[–—-]\s*(\d{4}-\d{2}-\d{2})/i.exec(name || '');
    if (m) return { days: parseInt(m[1], 10), from: m[2], to: m[3] };
    var r = /(\d{4}-\d{2}-\d{2})\s*[–—-]\s*(\d{4}-\d{2}-\d{2})/.exec(name || '');
    if (r) {
      var span = Math.round((new Date(r[2]) - new Date(r[1])) / 86400000);
      if (isFinite(span)) return { days: Math.max(1, span), from: r[1], to: r[2] };
    }
    // Bulk product-campaigns naming: "2026-09-08 00 ~ 2026-09-15 05" (tilde + hour suffixes)
    var t = /(\d{4}-\d{2}-\d{2})(?:\s+\d{1,2})?\s*~\s*(\d{4}-\d{2}-\d{2})(?:\s+\d{1,2})?/.exec(name || '');
    if (t) {
      var tspan = Math.round((new Date(t[2]) - new Date(t[1])) / 86400000);
      if (isFinite(tspan)) return { days: Math.max(1, tspan), from: t[1], to: t[2] };
    }
    return null;
  }
  function fileRank(f) { var p = f.period; return (p && p.to ? p.to : '') + '|' + (f.rel || f.label); }
  /* Newest bundled entry by dataset end-date (alphabetical order lies: lowercase
     'creative…' sorts after 'Creative…', and folder prefixes distort it). */
  function entryRank(en) { var p = periodOfName(en.label); return ((p && p.to) || '') + '|' + en.rel; }
  function newestEntry(entries) {
    var best = null, bestR = '';
    entries.forEach(function (en) {
      var r = entryRank(en);
      if (!best || r > bestR) { best = en; bestR = r; }
    });
    return best;
  }
  /* Subfolders under source-file/: folder name format "campaign name - [campaignId]".
     Only the digits inside [...] are read — the name part is display-only. */
  function folderIdOf(folder) {
    var m = /\[(\d+)\]/.exec(String(folder || ''));
    return m ? m[1] : '';
  }
  /* Effective campaign key for the Campaign facet/filter. Bulk rows carry a real
     campaign name; blank-campaign rows filled with a folder [id] key as '[id]'. */
  function campKey(r) {
    if (r && r.campaign) return String(r.campaign);
    var id = r && r.campaignId ? String(r.campaignId) : '';
    return id ? '[' + id + ']' : '';
  }
  function cmpCampKey(r) {
    if (r && r.campaign) return String(r.campaign);
    var id = r && r.campId ? String(r.campId) : '';
    return id ? '[' + id + ']' : '';
  }
  function sortedFiles() { return state.files.slice().sort(function (a, b) {
    return fileRank(a) < fileRank(b) ? -1 : fileRank(a) > fileRank(b) ? 1 : 0; }); }
  function rangesOverlap() {
    var fs = sortedFiles().filter(function (f) { return f.period && f.period.from && f.period.to; });
    for (var i = 1; i < fs.length; i++) {
      if (fs[i].period.from <= fs[i - 1].period.to) return true;
    }
    return false;
  }
  // Join key: 19-digit Post IDs exceed 2^53 — Number() both sides (identical rounding) + account.
  // Bulk exports use Video ID 'N/A' for catalogue rows — those fall back to creative-text + account.
  function keyOf(postId, account, creative) {
    var s = String(postId === null || postId === undefined ? '' : postId).trim();
    if (s === '' || s.toUpperCase() === 'N/A') return 'TXT:' + String(creative || '').slice(0, 80) + '|' + String(account || '');
    var n = Number(s);
    return (isFinite(n) ? n : s) + '|' + String(account || '');
  }
  // Header adapter: accepts per-campaign dialect (Post ID / Creative / ROI) and bulk
  // product-campaigns dialect (Video ID / Video title / Campaign name / no ROI).
  function rowsOfWorkbook(workbook) {
    var name = workbook.SheetNames[0];
    var ws = workbook.Sheets[name];
    var json = XLSX.utils.sheet_to_json(ws, { defval: '' });
    var keys = json.length ? Object.keys(json[0]) : [];
    var bulk = keys.indexOf('Video ID') !== -1 || keys.indexOf('Video title') !== -1 || keys.indexOf('Campaign name') !== -1;
    return { sheet: name, dialect: bulk ? 'bulk' : 'single', rows: json.map(function (r) {
      var cost = num(r['Cost']);
      var impr = int(r['Product ad impressions']);
      var orders = int(r['SKU orders']);
      var revenue = num(r['Gross revenue']);
      var rawAcc = String(r['TikTok account'] === null || r['TikTok account'] === undefined ? '' : r['TikTok account']).trim();
      var pid = (r['Post ID'] !== '' && r['Post ID'] !== undefined) ? r['Post ID'] : r['Video ID'];
      var cr = (r['Creative'] !== '' && r['Creative'] !== undefined) ? r['Creative'] : r['Video title'];
      var camp = String(r['Campaign name'] === null || r['Campaign name'] === undefined ? '' : r['Campaign name']);
      // Blank account: true catalogue rows (Product-card type, no video, or no
      // campaign context) stay 'Product Card'; blank-account real videos become 'Unknown account'.
      var noAcc = (rawAcc === '' || rawAcc === '0' || rawAcc === '-');
      var noVid = (pid === '' || pid === undefined || String(pid).toUpperCase() === 'N/A');
      var account = !noAcc ? rawAcc :
        (String(r['Creative type']) === 'Product card' || noVid || camp === '' ? 'Product Card' : 'Unknown account');
      var roiRaw = (r['ROI'] !== '' && r['ROI'] !== undefined) ? num(r['ROI']) : NaN;
      return {
        postId: pid,
        creative: cr,
        account: account,
        campaign: camp,
        campaignId: String(r['Campaign ID'] === null || r['Campaign ID'] === undefined ? '' : r['Campaign ID']),
        productId: String(r['Product ID'] === null || r['Product ID'] === undefined ? '' : r['Product ID']),
        type: r['Creative type'],
        status: r['Status'],
        sec: r['Exploration secondary status'],
        timePosted: r['Time posted'],
        cost: cost,
        orders: orders,
        revenue: revenue,
        roi: isNaN(roiRaw) ? (cost > 0 ? revenue / cost : 0) : roiRaw, // bulk files carry no ROI column — derived
        aov: orders > 0 ? revenue / orders : 0,
        impr: impr,
        clicks: int(r['Product ad clicks']),
        ctr: num(r['Product ad click rate']),
        v2: num(r['2-second ad video view rate']),
        v25: num(r['25% ad video view rate']),
        v50: num(r['50% ad video view rate']),
        v75: num(r['75% ad video view rate']),
        v100: num(r['100% ad video view rate']),
        cpm: impr > 0 ? cost / impr * 1000 : 0
      };
    }) };
  }
  // Combine mode: sum discrete days by Post-ID key (keeps latest text fields, recomputes roi/aov/cpm).
  function buildCombined(fs) {
    var map = {};
    fs.forEach(function (f) {
      f.rows.forEach(function (r) {
        var k = keyOf(r.postId, r.account, r.creative);
        var m = map[k];
        if (!m) { map[k] = { base: r, cost: 0, orders: 0, revenue: 0, impr: 0, clicks: 0, latest: r }; }
        var e = map[k];
        e.cost += r.cost; e.orders += r.orders; e.revenue += r.revenue; e.impr += r.impr; e.clicks += r.clicks;
        e.latest = r;
      });
    });
    return Object.keys(map).map(function (k) {
      var e = map[k], L = e.latest;
      return { postId: L.postId, creative: L.creative, account: L.account, campaign: L.campaign, campaignId: L.campaignId, productId: L.productId, type: L.type,
        status: L.status, sec: L.sec, timePosted: L.timePosted, cost: e.cost, orders: e.orders,
        revenue: e.revenue, roi: e.cost > 0 ? e.revenue / e.cost : 0,
        aov: e.orders > 0 ? e.revenue / e.orders : 0, impr: e.impr, clicks: e.clicks,
        ctr: L.ctr, v2: L.v2, v25: L.v25, v50: L.v50, v75: L.v75, v100: L.v100,
        cpm: e.impr > 0 ? e.cost / e.impr * 1000 : 0 };
    });
  }
  // Compare mode: baseline (oldest) vs latest — per-video deltas + NEW/LOST/KEPT flags.
  function rebuildCompare() {
    var fs = sortedFiles();
    state.cmpRows = [];
    if (fs.length < 2 || state.cmpMode !== 'compare') return;
    var A = fs[0], B = fs[fs.length - 1];
    var ma = {}, mb = {};
    A.rows.forEach(function (r) { ma[keyOf(r.postId, r.account, r.creative)] = r; });
    B.rows.forEach(function (r) { mb[keyOf(r.postId, r.account, r.creative)] = r; });
    var keys = {};
    Object.keys(ma).forEach(function (k) { keys[k] = 1; });
    Object.keys(mb).forEach(function (k) { keys[k] = 1; });
    state.cmpRows = Object.keys(keys).map(function (k) {
      var a = ma[k] || null, b = mb[k] || null;
      var ref = b || a;
      var ac = a ? a.cost : 0, bc = b ? b.cost : 0;
      var ao = a ? a.orders : 0, bo = b ? b.orders : 0;
      var ar = a ? a.revenue : 0, br = b ? b.revenue : 0;
      var ai = a ? a.impr : 0, bi = b ? b.impr : 0;
      var aroi = a ? a.roi : 0, broi = b ? b.roi : 0;
      var acpm = a ? a.cpm : 0, bcpm = b ? b.cpm : 0;
      return { move: !a ? 'NEW' : !b ? 'LOST' : 'KEPT',
        creative: ref.creative, account: ref.account, postId: ref.postId,
        campaign: ref.campaign || '', campId: ref.campaignId || '', prodId: ref.productId || '',
        aCamp: a ? (a.campaign || '') : '', bCamp: b ? (b.campaign || '') : '',
        aCampId: a ? (a.campaignId || '') : '', bCampId: b ? (b.campaignId || '') : '',
        campMoved: !!a && !!b && (a.campaign || '') !== (b.campaign || ''),
        aRev: ar, bRev: br, dRev: br - ar,
        aOrd: ao, bOrd: bo, dOrd: bo - ao,
        aCost: ac, bCost: bc, dCost: bc - ac,
        aRoi: aroi, bRoi: broi, dRoi: broi - aroi,
        aImpr: ai, bImpr: bi, dImpr: bi - ai,
        aCpm: acpm, bCpm: bcpm,
        aStatus: a ? a.status : '—', bStatus: b ? b.status : '—',
        aSec: a ? a.sec : '', bSec: b ? b.sec : '',
        noise: Math.abs(bc - ac) < 1 && (bo - ao) === 0 };
    });
    state.cmpInfo = (A.rel || A.label) + ' → ' + (B.rel || B.label);
  }
  /* Single-folder [id] auto-pick: when every loaded file comes from the same
     "[id]" folder, pre-set the Campaign facet to that campaign if it exists in
     the facet (bracket key for blank-campaign rows, or the real campaign name
     whose ID matches). Never overrides a user-picked value; mixed/loose loads
     stay on All. */
  function maybeAutoPickFolderCamp() {
    try {
      var sel = $('fCamp');
      if (!sel || sel.value) return;
      if (!state.files.length) return;
      var id = state.files[0].folderId || '';
      if (!id) return;
      for (var i = 1; i < state.files.length; i++) {
        if ((state.files[i].folderId || '') !== id) return;
      }
      var keys = {};
      state.rows.forEach(function (r) {
        if (String(r.campaignId || '') === id) keys[campKey(r)] = 1;
      });
      var kk = Object.keys(keys);
      if (kk.length !== 1 || !kk[0]) return;
      for (var j = 0; j < sel.options.length; j++) {
        if (sel.options[j].value === kk[0]) { sel.value = kk[0]; return; }
      }
    } catch (e) {}
  }
  /* Product→campaign frequency map across ALL loaded files (pid → top cid).
     Backs campLinkOf when the catalog entry sets no explicit campaignId. */
  function buildProdLink() {
    var counts = {};
    state.files.forEach(function (f) {
      f.rows.forEach(function (r) {
        var pid = String(r.productId || '');
        var cid = String(r.campaignId || '');
        if (!pid || pid.toUpperCase() === 'N/A' || !cid) return;
        counts[pid] = counts[pid] || {};
        counts[pid][cid] = (counts[pid][cid] || 0) + 1;
      });
    });
    var link = {};
    Object.keys(counts).forEach(function (pid) {
      var best = '', bestN = 0;
      Object.keys(counts[pid]).forEach(function (cid) {
        if (counts[pid][cid] > bestN) { bestN = counts[pid][cid]; best = cid; }
      });
      if (best) link[pid] = best;
    });
    state.prodLink = link;
  }
  function refreshAfterFiles(announce) {
    var fs = sortedFiles();
    if (!fs.length) {
      state.rows = []; state.cmpRows = []; state.trendRows = [];
      setStatus('No file loaded.');
      $('fileMeta').textContent = '';
    renderFileList(); renderCompareBar(); renderCompare(); renderTrend(); renderCatHint();
      populateFacets(); computeBench(); applyFilters();
      return;
    }
    // Main view: latest file in compare mode, summed rows in combine mode.
    if (state.cmpMode === 'combine' && fs.length > 1) {
      state.rows = buildCombined(fs);
    } else {
      state.rows = fs[fs.length - 1].rows;
    }
    rebuildCompare();
    rebuildTrend();
    var cur = fs[fs.length - 1];
    populateFacets();
    buildProdLink();
    maybeAutoPickFolderCamp();
    computeBench();
    setStatus(announce || ('Loaded ' + fmt(state.rows.length) + ' rows from ' +
      (state.cmpMode === 'combine' && fs.length > 1 ? fs.length + ' files combined.' : cur.label + '.')));
    renderFileMeta(cur.label, cur.fileDate);
    renderFileList(); renderCompareBar(); renderCompare(); renderCatHint();
    applyFilters();
  }
  function addFile(label, fileDate, parsed, replaceAll, meta) {
    if (replaceAll) state.files = [];
    var m = meta || {};
    var rel = m.rel || label;
    var folder = m.folder || '';
    var folderId = m.folderId !== undefined ? m.folderId : folderIdOf(folder);
    // Label-only (option 2): never drop rows. Blank Campaign IDs inherit the
    // folder [id] for display/compare; rows that already carry an ID keep it.
    if (folderId) {
      parsed.rows.forEach(function (r) { if (!r.campaignId) r.campaignId = folderId; });
    }
    // Single-campaign exports carry no Product ID column — only the filename
    // states it ("… Product 1729556….xlsx"). Fill blanks from there so the
    // Product column resolves instead of showing '–'. Bulk rows keep theirs.
    var fileProd = prodOfName(label);
    if (fileProd) {
      parsed.rows.forEach(function (r) { if (!r.productId) r.productId = fileProd; });
    }
    // cap 7 files — drop oldest (by rank) when overflowing
    state.files.push({ label: label, rel: rel, folder: folder, folderId: folderId,
      fileDate: fileDate, period: periodOfName(label), rows: parsed.rows, dialect: parsed.dialect || 'single' });
    state.dialectCache[rel] = parsed.dialect || 'single';
    var fs = sortedFiles();
    while (fs.length > 7) { var drop = fs.shift(); state.files.splice(state.files.indexOf(drop), 1); fs = sortedFiles(); }
    // auto-pick intent on 2nd file: overlap -> compare, disjoint -> combine stays user choice (default compare first, hint combine)
    if (state.files.length === 2) {
      state.cmpMode = rangesOverlap() ? 'compare' : 'compare';
      syncCmpModeUI();
    }
    refreshAfterFiles();
  }
  function renderFileList() {
    var box = $('fileList');
    if (!box) return;
    var fs = sortedFiles();
    if (!fs.length) { box.innerHTML = ''; return; }
    box.innerHTML = fs.map(function (f, i) {
      var tag = fs.length > 1 ? (i === 0 ? ' <span class="suggest-tag">baseline</span>' : i === fs.length - 1 ? ' <span class="suggest-tag">latest</span>' : '') : '';
      var dia = f.dialect ? ' <span class="suggest-tag">' + esc(f.dialect) + '</span>' : '';
      var fld = f.folder ? ' <span class="suggest-tag">' + esc(f.folder) + '</span>' : '';
      var fid = f.folderId ? ' <span class="suggest-tag">[' + esc(f.folderId) + ']</span>' : '';
      var p = f.period ? ' · ' + f.period.from + ' → ' + f.period.to : '';
      var disp = (f.folder ? f.folder + ' / ' : '') + f.label;
      return '<div class="flex flex-wrap items-center gap-2"><span>📄 <strong>' + esc(disp) + '</strong>' +
        ' <span class="text-gray-500">(' + fmt(f.rows.length) + ' rows' + p + ')</span>' + dia + fld + fid + tag + '</span>' +
        '<button type="button" class="hint-btn" data-unload="' + esc(f.rel || f.label) + '">remove</button></div>';
    }).join('');
  }
  function renderCompareBar() {
    var bar = $('compareBar');
    if (!bar) return;
    var show = state.files.length > 1;
    bar.hidden = !show;
    if (!show) return;
    var w = $('overlapWarn');
    if (w) w.textContent = rangesOverlap()
      ? '⚠ ranges overlap — use Latest − Baseline (summing double-counts).'
      : 'No overlap — daily slices can be summed, or diffed for momentum.';
    var mw = $('mixWarn');
    if (mw) {
      var dias = {};
      state.files.forEach(function (f) { dias[f.dialect || 'single'] = 1; });
      var mixed = Object.keys(dias).length > 1;
      var big = state.files.some(function (f) { return f.rows.length > 20000; });
      mw.textContent = (mixed ? '⚠ mixed file types (single + bulk) — single-campaign files take their campaign tag from the source folder. ' : '') +
        (big ? '⏳ large file(s) loaded — parsing may take a few seconds.' : '');
    }
  }
  function syncCmpModeUI() {
    Array.prototype.forEach.call(document.querySelectorAll('input[name="cmpMode"]'), function (r) {
      r.checked = (r.value === state.cmpMode);
    });
  }
  function cmpFiltered() {
    var acc = $('fAccount').value, q = $('fSearch').value.trim().toLowerCase();
    var mv = $('cmpMove').value, noCard = $('fNoCard').checked;
    var hideInel = $('fNoInel').checked;
    var hideInact = $('fNoInactive').checked;
    var cpEl = $('fCamp'), cp = cpEl ? cpEl.value : '';
    var out = state.cmpRows.filter(function (r) {
      if (acc && r.account !== acc) return false;
      if (mv && r.move !== mv) return false;
      if (cp && cmpCampKey(r) !== cp) return false;
      if (noCard && r.account === 'Product Card') return false;
      if (hideInel && (r.aStatus === 'Ineligible' || r.aStatus === '—') &&
        (r.bStatus === 'Ineligible' || r.bStatus === '—')) return false;
      if (hideInact && isInactiveAcc(r.account)) return false;
      if (q && String(r.creative).toLowerCase().indexOf(q) === -1 &&
          String(r.postId).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var s = $('cmpSort').value;
    var key = { drev_desc: 'dRev', droi_desc: 'dRoi', dcost_desc: 'dCost', dord_desc: 'dOrd', dimpr_desc: 'dImpr' }[s] || 'dRev';
    out.sort(function (a, b) { return b[key] - a[key]; });
    return out;
  }
  function fmtDelta(n, d) { var s = (n > 0 ? '+' : '') + fmt(n, d === undefined ? 2 : d); return s; }
  function renderCompare() {
    var sec = $('cmpSection');
    if (!sec) return;
    var show = state.files.length > 1 && state.cmpMode === 'compare';
    sec.hidden = !show;
    if (!show) return;
    var rows = cmpFiltered();
    $('cmpCount').textContent = '— ' + fmt(rows.length) + ' videos (' + state.cmpInfo + ')';
    $('cmpMeta').textContent = 'Baseline = oldest, Latest = newest. Δ = Latest − Baseline. Greyed rows = noise (ΔCost < RM1, ΔOrders = 0).';
    var tb = $('cmpTable').querySelector('tbody');
    if (!rows.length) { tb.innerHTML = '<tr><td colspan="24" class="empty-note">No videos match.</td></tr>'; return; }
    var cat = mergedCat();
    var prd = mergedPrd();
    var lab = function (nm, id) { var e = cat[String(id || '')]; return (e && e.label) ? e.label : (nm || (id ? 'Unnamed campaign' : '–')); };
    tb.innerHTML = rows.slice(0, MAX_TABLE_ROWS).map(function (r) {
      var cr = String(r.creative || '');
      if (cr.length > 60) cr = cr.slice(0, 60) + '…';
      var badge = r.move === 'NEW' ? '<span class="sec sec-performing">● NEW</span>' :
        r.move === 'LOST' ? '<span class="sec sec-rejected">● LOST</span>' : '<span class="sec sec-flat">KEPT</span>';
      var sd = (r.aStatus === r.bStatus) ? esc(r.bStatus) : esc(r.aStatus) + ' → ' + esc(r.bStatus);
      var camp = r.campMoved ? esc(lab(r.aCamp, r.aCampId)) + ' → ' + esc(lab(r.bCamp, r.bCampId)) : esc(lab(r.campaign, r.campId));
      var pe = prd[String(r.prodId || '')];
      var prod = (pe && pe.name) ? pe.name :
        (String(r.prodId || '').toUpperCase() === 'N/A' && r.campaign ? 'Product Card - ' + lab(r.campaign, r.campId) : (r.prodId || '–'));
      var style = r.noise ? ' style="opacity:.45"' : '';
      return '<tr' + style + '><td>' + badge + '</td><td>' + esc(cr) + '</td><td>' + esc(r.account) +
        '</td><td>' + camp + '</td><td title="' + esc(r.prodId || '') + '">' + esc(prod) + '</td><td class="mono">' + esc(r.postId) + '</td><td>' + fmt(r.aRev, 2) + '</td><td>' + fmt(r.bRev, 2) +
        '</td><td>' + fmtDelta(r.dRev) + '</td><td>' + fmt(r.aOrd) + '</td><td>' + fmt(r.bOrd) + '</td><td>' + fmtDelta(r.dOrd, 0) +
        '</td><td>' + fmt(r.aCost, 2) + '</td><td>' + fmt(r.bCost, 2) + '</td><td>' + fmtDelta(r.dCost) +
        '</td><td>' + r.aRoi.toFixed(2) + '</td><td>' + r.bRoi.toFixed(2) + '</td><td>' + fmtDelta(r.dRoi) +
        '</td><td>' + fmt(r.aImpr) + '</td><td>' + fmt(r.bImpr) + '</td><td>' + fmtDelta(r.dImpr, 0) +
        '</td><td>' + r.aCpm.toFixed(2) + '</td><td>' + r.bCpm.toFixed(2) + '</td><td>' + sd + '</td></tr>';
    }).join('');
  }

  /* ---------- trend per creative (day-by-day columns across loaded files) ---------- */
  function fmtDay(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return '–';
    return (+m[3]) + ' ' + MONTHS[+m[2] - 1];
  }
  function trendHead(p) {
    if (!p || !p.from || !p.to) return '–';
    return p.from === p.to ? fmtDay(p.from) : fmtDay(p.from) + '→' + fmtDay(p.to);
  }
  var TREND_METRICS = {
    rev: { label: 'Revenue (MYR)', d: 2, get: function (c) { return c.rev; } },
    ord: { label: 'Orders', d: 0, get: function (c) { return c.ord; } },
    cost: { label: 'Cost (MYR)', d: 2, get: function (c) { return c.cost; } },
    impr: { label: 'Impressions', d: 0, get: function (c) { return c.impr; } }
  };
  // Join all loaded files by video key; ref fields prefer the latest file carrying the video.
  function rebuildTrend() {
    var fs = sortedFiles();
    state.trendRows = [];
    if (fs.length < 2) return;
    var map = {};
    fs.forEach(function (f) {
      f.rows.forEach(function (r) {
        var k = keyOf(r.postId, r.account, r.creative);
        if (!map[k]) map[k] = { key: k, creative: '', account: '', postId: '', campaign: '', campId: '', prodId: '', cells: [] };
      });
    });
    var done = {};
    for (var i = fs.length - 1; i >= 0; i--) {
      fs[i].rows.forEach(function (r) {
        var k = keyOf(r.postId, r.account, r.creative);
        if (!done[k]) {
          done[k] = 1;
          var e = map[k];
          e.creative = r.creative; e.account = r.account; e.postId = r.postId;
          e.campaign = r.campaign || ''; e.campId = r.campaignId || ''; e.prodId = r.productId || '';
        }
      });
    }
    Object.keys(map).forEach(function (k) {
      map[k].cells = fs.map(function () { return null; });
    });
    fs.forEach(function (f, fi) {
      f.rows.forEach(function (r) {
        var e = map[keyOf(r.postId, r.account, r.creative)];
        e.cells[fi] = { rev: r.revenue, ord: r.orders, cost: r.cost, impr: r.impr, status: String(r.status || '') };
      });
    });
    var n = fs.length;
    state.trendRows = Object.keys(map).map(function (k) {
      var e = map[k];
      var base = !!e.cells[0], last = !!e.cells[n - 1];
      e.move = !base && last ? 'NEW' : base && !last ? 'LOST' : 'KEPT';
      return e;
    });
  }
  function trendCampKey(e) { return e.campaign || (e.campId ? '[' + e.campId + ']' : ''); }  function trendFiltered() {
    var acc = $('fAccount').value, q = $('fSearch').value.trim().toLowerCase();
    var cpEl = $('fCamp'), cp = cpEl ? cpEl.value : '';
    var noCard = $('fNoCard').checked;
    var hideInel = $('fNoInel').checked;
    var hideInact = $('fNoInactive').checked;
    return state.trendRows.filter(function (e) {
      if (acc && e.account !== acc) return false;
      if (cp && trendCampKey(e) !== cp) return false;
      if (noCard && e.account === 'Product Card') return false;
      if (hideInact && isInactiveAcc(e.account)) return false;
      if (hideInel) {
        var anyOk = e.cells.some(function (c) { return c && c.status !== 'Ineligible' && c.status !== '—'; });
        if (!anyOk) return false;
      }
      if (q && String(e.creative).toLowerCase().indexOf(q) === -1 &&
          String(e.postId).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }
  /* Per-row sparkline: inline SVG of one video's daily shape for the current
     metric. Scaled per row (min–max of its present days; flat rows sit midline),
     absent days break the line. Pure markup — no per-row Chart.js instances. */
  function sparkline(cells, get, d, dayLabels) {
    var W = 90, H = 28, pad = 3, n = cells.length;
    var idx = [];
    cells.forEach(function (c, i) { if (c) idx.push(i); });
    if (!idx.length) return '<span class="text-gray-400">–</span>';
    var vals = idx.map(function (i) { return get(cells[i]); });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    var X = function (i) { return n < 2 ? W / 2 : pad + i * (W - 2 * pad) / (n - 1); };
    var Y = function (v) { return mx === mn ? H / 2 : H - pad - (v - mn) / (mx - mn) * (H - 2 * pad); };
    var segs = [], cur = [];
    cells.forEach(function (c, i) {
      if (c) { cur.push(X(i).toFixed(1) + ',' + Y(get(c)).toFixed(1)); }
      else if (cur.length) { segs.push(cur); cur = []; }
    });
    if (cur.length) segs.push(cur);
    var dots = idx.map(function (i) {
      return '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(get(cells[i])).toFixed(1) + '" r="1.8" fill="#3b82f6"/>';
    }).join('');
    var lines = segs.filter(function (s) { return s.length > 1; }).map(function (s) {
      return '<polyline points="' + s.join(' ') + '" fill="none" stroke="#3b82f6" stroke-width="1.5"/>';
    }).join('');
    var tip = esc(idx.map(function (i) { return dayLabels[i] + ' ' + fmt(get(cells[i]), d); }).join(' · ') + ' (per-row scale)');
    return '<svg width="' + W + '" height="' + H + '" style="display:block"><title>' + tip + '</title>' + lines + dots + '</svg>';
  }
  function renderTrend() {
    var sec = $('trendSection');
    if (!sec) return;
    var fs = sortedFiles();
    var show = fs.length > 1;
    sec.hidden = !show;
    if (!show) {
      if (state.trendChart) { state.trendChart.destroy(); state.trendChart = null; }
      return;
    }
    var mkey = ($('trendMetric') && $('trendMetric').value) || 'rev';
    var M = TREND_METRICS[mkey] || TREND_METRICS.rev;
    var thead = $('trendTable').querySelector('thead');
    thead.innerHTML = '<tr><th>Move</th><th>Post ID</th><th>Shape</th><th>Creative</th><th>Account</th><th>Campaign</th><th>Product</th>' +
      fs.map(function (f) { return '<th title="' + esc(f.rel || f.label) + '">' + esc(trendHead(f.period)) + '</th>'; }).join('') + '</tr>';
    var rows = trendFiltered();
    var n = fs.length, i;
    rows.forEach(function (e) {
      var tot = 0;
      for (i = 0; i < n; i++) { if (e.cells[i]) tot += M.get(e.cells[i]); }
      e._tot = tot;
      e._latest = e.cells[n - 1] ? M.get(e.cells[n - 1]) : 0;
      e._delta = e._latest - (e.cells[0] ? M.get(e.cells[0]) : 0);
    });
    var s = ($('trendSort') && $('trendSort').value) || 'total_desc';
    var sk = s === 'latest_desc' ? '_latest' : s === 'delta_desc' ? '_delta' : '_tot';
    rows.sort(function (a, b) { return b[sk] - a[sk]; });
    renderTrendChart(fs, rows, M);
    $('trendCount').textContent = '— ' + fmt(rows.length) + ' videos (' + fs[0].label + ' → ' + fs[fs.length - 1].label + ')';
    $('trendMeta').textContent = 'Metric: ' + M.label + ' per file, oldest → newest. – = video absent that file. Click a Shape graph to enlarge it. Click a Post ID to copy it (IDs may differ in trailing digits — verify before Ads Manager use). Respects the Account / Campaign / Search filters above.';
    var tb = $('trendTable').querySelector('tbody');
    var cols = 7 + n;
    if (!rows.length) { tb.innerHTML = '<tr><td colspan="' + cols + '" class="empty-note">No videos match.</td></tr>'; return; }
    var dayLabels = fs.map(function (f) { return trendHead(f.period); });
    tb.innerHTML = rows.slice(0, MAX_TABLE_ROWS).map(function (e) {
      var cr = String(e.creative || '');
      if (cr.length > 60) cr = cr.slice(0, 60) + '…';
      var badge = e.move === 'NEW' ? '<span class="sec sec-performing">● NEW</span>' :
        e.move === 'LOST' ? '<span class="sec sec-rejected">● LOST</span>' : '<span class="sec sec-flat">KEPT</span>';
      var tds = e.cells.map(function (c) {
        if (!c) return '<td class="text-gray-400">–</td>';
        return '<td>' + fmt(M.get(c), M.d) + '</td>';
      }).join('');
      var pid = String(e.postId || '');
      var pidCell = pid
        ? '<td class="mono" data-copy="' + esc(pid) + '" title="Click to copy Post ID — verify trailing digits before Ads Manager use">' + esc(pid) + '</td>'
        : '<td class="text-gray-400">–</td>';
      return '<tr data-tkey="' + esc(e.key) + '"><td>' + badge + '</td>' + pidCell + '<td data-tsolo title="Click to enlarge this creative\'s chart">' + sparkline(e.cells, M.get, M.d, dayLabels) + '</td><td>' + esc(cr) + '</td><td>' + esc(e.account) +
        '</td><td>' + esc(campLabel({ campaign: e.campaign, campaignId: e.campId })) +
        '</td><td title="' + esc(e.prodId || '') + '">' + esc(prodName({ productId: e.prodId, campaign: e.campaign, campaignId: e.campId })) +
        '</td>' + tds + '</tr>';
    }).join('');
  }
  var TREND_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed',
    '#db2777', '#0891b2', '#65a30d', '#ea580c', '#4f46e5'];
  // Daily lines for the top 10 trend rows (current sort + metric). Gaps stay
  // gaps (no fake zeros); legend click toggles creatives (Chart.js default).
  function renderTrendChart(fs, rows, M) {
    if (typeof Chart === 'undefined') return;
    if (state.trendChart) { state.trendChart.destroy(); state.trendChart = null; }
    if (!fs.length || !rows.length || !$('trendChart')) return;
    var ctx = $('trendChart').getContext('2d');
    state.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: fs.map(function (f) { return trendHead(f.period); }),
        datasets: rows.slice(0, 10).map(function (e, i) {
          var cr = String(e.creative || '');
          if (cr.length > 40) cr = cr.slice(0, 40) + '…';
          var col = TREND_COLORS[i % TREND_COLORS.length];
          return { label: cr + ' · ' + e.account, data: e.cells.map(function (c) { return c ? Math.round(M.get(c) * 100) / 100 : null; }),
            borderColor: col, backgroundColor: col, tension: 0.2, spanGaps: false, borderWidth: 2, pointRadius: 3 };
        })
      },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } },
          tooltip: { callbacks: { label: function (cx) { return ' ' + cx.dataset.label + ': ' + fmt(cx.parsed.y, M.d); } } } },
        scales: { x: { ticks: { font: { size: 10 } } },
          y: { ticks: { font: { size: 10 }, callback: function (v) { return fmt(v, M.d); } } } } }
    });
  }
  // Long-format CSV: one row per (video, file) — pivots cleanly into daily series.
  function buildTrendCsv(fs, rows) {
    var q = function (v) { return '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"'; };
    var lines = [['Move', 'Creative', 'Account', 'Campaign', 'Campaign ID', 'Product', 'Product ID', 'Post ID',
      'File', 'Revenue', 'Orders', 'Cost', 'Impressions'].join(',')];
    rows.forEach(function (e) {
      var camp = campLabel({ campaign: e.campaign, campaignId: e.campId });
      var prod = prodName({ productId: e.prodId, campaign: e.campaign, campaignId: e.campId });
      fs.forEach(function (f, i) {
        var c = e.cells[i];
        lines.push([q(e.move), q(e.creative), q(e.account), q(camp), q(e.campId), q(prod), q(e.prodId), q(e.postId),
          q(f.rel || f.label),
          c ? c.rev.toFixed(2) : '', c ? c.ord : '', c ? c.cost.toFixed(2) : '', c ? c.impr : ''].join(','));
      });
    });
    return lines.join('\n');
  }
  var trendCsvBtn = $('trendCsv');
  if (trendCsvBtn) trendCsvBtn.addEventListener('click', function () {
    var fs = sortedFiles();
    var rows = trendFiltered();
    if (!rows.length || fs.length < 2) return;
    download('creatives-trend.csv', buildTrendCsv(fs, rows), 'text/csv');
  });
  /* Trend solo popup: click a Shape cell for one creative, enlarged, with its
     day totals. Current trend metric; gaps stay gaps. */
  function openTrendModal(key) {
    if (typeof Chart === 'undefined') return;
    var e = null;
    state.trendRows.some(function (r) { if (r.key === key) { e = r; return true; } return false; });
    if (!e) return;
    var fs = sortedFiles();
    if (fs.length < 2) return;
    var mkey = ($('trendMetric') && $('trendMetric').value) || 'rev';
    var M = TREND_METRICS[mkey] || TREND_METRICS.rev;
    var cr = String(e.creative || '');
    $('trendModalTitle').textContent = cr.length > 90 ? cr.slice(0, 90) + '…' : (cr || 'Untitled video');
    var mpid = String(e.postId || '');
    var midEl = $('trendModalId');
    if (mpid) {
      midEl.textContent = mpid;
      midEl.setAttribute('data-copy', mpid);
      midEl.title = 'Click to copy Post ID — verify trailing digits before Ads Manager use';
      midEl.style.cursor = 'pointer';
    } else {
      midEl.textContent = '–';
      midEl.removeAttribute('data-copy');
      midEl.title = '';
      midEl.style.cursor = '';
    }
    $('trendModalCtx').textContent = e.account + ' · ' +
      campLabel({ campaign: e.campaign, campaignId: e.campId }) + ' · ' +
      prodName({ productId: e.prodId, campaign: e.campaign, campaignId: e.campId }) +
      ' · ' + e.move + ' · Metric: ' + M.label;
    var tot = 0, present = 0;
    e.cells.forEach(function (c) { if (c) { tot += M.get(c); present++; } });
    var lv = e.cells[fs.length - 1] ? M.get(e.cells[fs.length - 1]) : 0;
    var fv = e.cells[0] ? M.get(e.cells[0]) : 0;
    $('trendModalKpis').innerHTML =
      kpiMini('Total ' + M.label.split(' ')[0], fmt(tot, M.d)) +
      kpiMini('Latest day', fmt(lv, M.d)) + kpiMini('Δ latest−first', fmt(lv - fv, M.d)) +
      kpiMini('Days present', present + '/' + fs.length);
    if (state.trendSoloChart) { state.trendSoloChart.destroy(); state.trendSoloChart = null; }
    var ctx = $('trendModalChart').getContext('2d');
    state.trendSoloChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: fs.map(function (f) { return trendHead(f.period); }),
        datasets: [{ label: M.label,
          data: e.cells.map(function (c) { return c ? Math.round(M.get(c) * 100) / 100 : null; }),
          borderColor: '#2563eb', backgroundColor: '#2563eb',
          tension: 0.2, spanGaps: false, borderWidth: 3, pointRadius: 5 }]
      },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false },
          tooltip: { callbacks: { label: function (cx) { return ' ' + fmt(cx.parsed.y, M.d); } } } },
        scales: { x: { ticks: { font: { size: 11 } } },
          y: { ticks: { font: { size: 11 }, callback: function (v) { return fmt(v, M.d); } } } } }
    });
    $('trendModal').hidden = false;
    document.body.style.overflow = 'hidden';
    $('trendModalClose').focus();
  }
  function closeTrendModal() {
    if (state.trendSoloChart) { state.trendSoloChart.destroy(); state.trendSoloChart = null; }
    $('trendModal').hidden = true;
    document.body.style.overflow = '';
  }
  $('trendTable').querySelector('tbody').addEventListener('click', function (e) {
    var cell = e.target.closest ? e.target.closest('[data-tsolo]') : null;
    if (!cell) return;
    var tr = cell.closest ? cell.closest('tr[data-tkey]') : null;
    if (!tr) return;
    openTrendModal(tr.getAttribute('data-tkey'));
  });
  $('trendModalClose').addEventListener('click', closeTrendModal);
  $('trendModal').addEventListener('click', function (e) {
    if (e.target === $('trendModal')) closeTrendModal();
  });
  /* Click-to-copy for Post IDs (trend cells + solo popup ID line). */
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-copy]') : null;
    if (!t || t._copyBusy) return;
    var txt = t.getAttribute('data-copy') || '';
    if (!txt) return;
    t._copyBusy = true;
    var orig = t.textContent;
    var finish = function () {
      t.textContent = 'Copied ✓';
      setTimeout(function () { t.textContent = orig; t._copyBusy = false; }, 1200);
    };
    var fallback = function () {
      try {
        var ta = document.createElement('textarea');
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
      } catch (err) {}
      finish();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(finish, fallback); }
    else fallback();
  });

  function ingest(workbook, fileName, fileDate) {
    // Single-file entry: replaces the slot list (old behaviour preserved).
    var parsed = rowsOfWorkbook(workbook);
    addFile(fileName, fileDate, parsed, true);
  }

  function loadArrayBuffer(buf, labelOrEntry, fileDate, replaceAll) {
    var entry = (labelOrEntry && typeof labelOrEntry === 'object') ? labelOrEntry : { label: labelOrEntry, rel: labelOrEntry, folder: '', folderId: '' };
    var label = entry.label;
    try {
      var wb = XLSX.read(buf, { type: 'array' });
      var parsed = rowsOfWorkbook(wb);
      addFile(label, fileDate, parsed, replaceAll !== false, entry);
    } catch (e) {
      setStatus('Parse failed (' + label + '): ' + e.message);
    }
  }
  function loadManyBuffers(items) {
    // items: [{buf, label, fileDate, rel?, folder?, folderId?}] — added without clearing between each.
    state.files = [];
    items.forEach(function (it, idx) {
      try {
        var wb = XLSX.read(it.buf, { type: 'array' });
        var parsed = rowsOfWorkbook(wb);
        var rel = it.rel || it.label;
        var folder = it.folder || '';
        var folderId = it.folderId !== undefined ? it.folderId : folderIdOf(folder);
        if (folderId) {
          parsed.rows.forEach(function (r) { if (!r.campaignId) r.campaignId = folderId; });
        }
        var fileProd = prodOfName(it.label);
        if (fileProd) {
          parsed.rows.forEach(function (r) { if (!r.productId) r.productId = fileProd; });
        }
        state.files.push({ label: it.label, rel: rel, folder: folder, folderId: folderId,
          fileDate: it.fileDate, period: periodOfName(it.label), rows: parsed.rows, dialect: parsed.dialect || 'single' });
        state.dialectCache[rel] = parsed.dialect || 'single';
      } catch (e) { setStatus('Parse failed (' + it.label + '): ' + e.message); }
    });
    var fs = sortedFiles();
    while (fs.length > 7) { var drop = fs.shift(); state.files.splice(state.files.indexOf(drop), 1); fs = sortedFiles(); }
    syncCmpModeUI();
    refreshAfterFiles();
  }

  $('fileInput').addEventListener('change', function (e) {
    var list = e.target.files;
    if (!list || !list.length) return;
    var arr = Array.prototype.slice.call(list, 0, 7);
    if (arr.length === 1 && state.files.length === 0) {
      var f0 = arr[0], r0 = new FileReader();
      r0.onload = function () { loadArrayBuffer(r0.result, f0.name, new Date(f0.lastModified), true); };
      r0.readAsArrayBuffer(f0);
      e.target.value = '';
      return;
    }
    var pending = arr.map(function (f) { return { f: f, buf: null }; });
    var done = 0;
    pending.forEach(function (p) {
      var rd = new FileReader();
      rd.onload = function () {
        p.buf = rd.result; done++;
        if (done === pending.length) {
          // append to existing slots (cap 7 inside addFile/loadManyBuffers path)
          pending.forEach(function (q) {
            try {
              var wb = XLSX.read(q.buf, { type: 'array' });
              var parsed = rowsOfWorkbook(wb);
              addFile(q.f.name, new Date(q.f.lastModified), parsed, false);
            } catch (err) { setStatus('Parse failed (' + q.f.name + '): ' + err.message); }
          });
        }
      };
      rd.readAsArrayBuffer(p.f);
    });
    e.target.value = '';
  });

  /* Bundled files: xlsx at source-file/ top level AND one level down in
     campaign subfolders (e.g. "himcoffee - [123]/file.xlsx"). Loose files keep
     working; folders are auto-discovered (no hardcoded list). Folder [id] is a
     label only — rows are never dropped. Falls back to BUNDLED_FILE. */
  function parseListing(html) {
    var files = [], dirs = [], seenF = {}, seenD = {}, m, re = /href="([^"]+)"/gi;
    while ((m = re.exec(html))) {
      var raw;
      try { raw = decodeURIComponent(m[1].split('?')[0].split('#')[0]); } catch (e) { raw = m[1]; }
      raw = String(raw || '').replace(/^\/+/, '');
      if (!raw || raw[0] === '?' || raw.indexOf('://') !== -1) continue;
      if (/\.xlsx$/i.test(raw)) {
        var base = raw.split('/').filter(Boolean).pop();
        if (base && !seenF[base]) { seenF[base] = 1; files.push(base); }
      } else if (/\/$/.test(m[1]) || /\/$/.test(raw)) {
        var dir = raw.replace(/\/+$/, '').split('/').pop();
        if (dir && dir !== 'source-file' && dir[0] !== '.' && !seenD[dir]) { seenD[dir] = 1; dirs.push(dir); }
      }
    }
    return { files: files, dirs: dirs };
  }
  function entryOf(rel) {
    var parts = String(rel || '').split('/');
    var label = parts.pop() || '';
    var folder = parts.join('/');
    return { rel: rel, label: label, folder: folder, folderId: folderIdOf(folder) };
  }
  function fetchBundledFile(url, entry) {
    return fetch(url + '?v=' + Date.now())
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' — serve via http://localhost:8000, file:// is blocked');
        var lm = r.headers.get('Last-Modified');
        return r.arrayBuffer().then(function (buf) { return { buf: buf, date: lm ? new Date(lm) : new Date() }; });
      })
      .then(function (o) { loadArrayBuffer(o.buf, entry, o.date); });
  }
  function findBundledCandidates() {
    var fallback = BUNDLED_FILE.replace(/^source-file\//, '');
    // 1) server.py JSON listing, 2) HTML directory listing (plain python
    // http.server), 3) single-file fallback (picker warns it is incomplete).
    function fromHtml() {
      return fetch('source-file/?v=' + Date.now())
        .then(function (r) {
          if (!r.ok) throw 0;
          return r.text();
        })
        .then(function (html) {
          var top = parseListing(html);
          var out = top.files.map(function (n) { return entryOf(n); });
          var seen = {};
          out.forEach(function (e) { seen[e.rel] = 1; });
          var chains = top.dirs.map(function (dir) {
            return fetch(encodeURI('source-file/' + dir + '/') + '?v=' + Date.now())
              .then(function (r) { if (!r.ok) throw 0; return r.text(); })
              .then(function (sub) {
                parseListing(sub).files.forEach(function (n) {
                  var rel = dir + '/' + n;
                  if (!seen[rel]) { seen[rel] = 1; out.push(entryOf(rel)); }
                });
              })
              .catch(function () {});
          });
          return Promise.all(chains).then(function () {
            if (!out.length) throw 0;
            out.sort(function (a, b) { return a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0; });
            state.listFallback = false;
            // Empty campaign folders (nothing tickable) so the picker can show them as-is.
            out.emptyDirs = top.dirs.filter(function (d) {
              return !out.some(function (e) { return e.folder === d; });
            });
            return out;
          });
        });
    }
    return fetch('api/files?v=' + Date.now())
      .then(function (r) {
        if (!r.ok) throw 0;
        return r.json();
      })
      .then(function (o) {
        var list = o && o.files;
        if (!list || !list.length) throw 0;
        state.listFallback = false;
        var out = list.map(entryOf);
        out.emptyDirs = (o && o.emptyDirs) || [];
        return out;
      })
      .catch(fromHtml)
      .catch(function () { state.listFallback = true; return [entryOf(fallback)]; });
  }
  $('loadBundled').addEventListener('click', function () {
    setStatus('Fetching bundled file…');
    findBundledCandidates().then(function (entries) {
      var file = newestEntry(entries) || entries[entries.length - 1];
      fetchBundledFile(encodeURI('source-file/' + file.rel), file)
        .catch(function (e) { setStatus('Bundled load failed: ' + e.message); });
    });
  });
  /* Picker chips, all from the filename (no file read): span, product, bulk badge. */
  function spanMeta(n) {
    var p = periodOfName(n);
    if (!p) return '<span class="text-gray-500">no date in name</span>';
    if (p.from === p.to) return esc(p.from);
    return esc(p.from) + ' → ' + esc(p.to) + ' · ' + p.days + ' days';
  }
  function prodOfName(n) {
    var m = /Product\s+(\d+)/i.exec(n || '');
    return m ? m[1] : '';
  }
  function bulkOfName(n) { return /product.?campaigns/i.test(n || ''); }
  function pickerMeta(nOrEntry) {
    var entry = (nOrEntry && typeof nOrEntry === 'object') ? nOrEntry : entryOf(nOrEntry);
    var n = entry.label;
    var parts = [spanMeta(n)];
    var pid = prodOfName(n);
    if (pid) {
      var e = catProd(pid);
      parts.push(esc((e && e.name) ? e.name : 'Unnamed product'));
    }
    if (entry.folder) parts.push(esc(entry.folder));
    if (entry.folderId) parts.push('<span class="suggest-tag">[' + esc(entry.folderId) + ']</span>');
    var ck = entry.rel || n;
    if (bulkOfName(n) && state.dialectCache[ck] !== 'bulk') parts.push('<span class="suggest-tag">bulk</span>');
    if (state.dialectCache[ck]) parts.push('<span class="suggest-tag">' + esc(state.dialectCache[ck]) + '</span>');
    return parts.join(' · ');
  }
  var loadAllBtn = $('loadAllBundled');
  if (loadAllBtn) loadAllBtn.addEventListener('click', function () {
    var box = $('bundlePick');
    if (!box.hidden) { box.hidden = true; box.innerHTML = ''; return; }
    box.innerHTML = '<span class="text-gray-500">Listing source-file/…</span>';
    box.hidden = false;
    findBundledCandidates().then(function (entries) {
      var sorted = entries.slice().sort(function (a, b) { return a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0; });
      var warn = state.listFallback
        ? '<div class="text-amber-600 dark:text-amber-400 mb-1">⚠ Could not list source-file/ (showing fallback file only). For the full picker, run <code>python server.py</code> in this folder and open <code>http://localhost:8000</code>.</div>'
        : '';
      var newestRel = (newestEntry(sorted) || sorted[sorted.length - 1] || {}).rel || '';
      // Group by folder: loose files first, then folders alphabetically.
      var byFolder = {}, groups = [];
      sorted.forEach(function (en) {
        var k = en.folder || '';
        if (!byFolder[k]) { byFolder[k] = []; groups.push(k); }
        byFolder[k].push(en);
      });
      groups.sort(function (a, b) {
        if (!a) return -1; if (!b) return 1;
        return a < b ? -1 : a > b ? 1 : 0;
      });
      var html = warn + groups.map(function (folder, gi) {
        var files = byFolder[folder];
        var fid = folderIdOf(folder);
        var title = folder
          ? '📁 <strong>' + esc(folder) + '</strong>' + (fid ? ' <span class="suggest-tag">[' + esc(fid) + ']</span>' : '')
          : '📁 <strong>Top level</strong>';
        var open = files.some(function (en) { return en.rel === newestRel; });
        var rows = files.map(function (en) {
          var meta = pickerMeta(en);
          var checked = (en.rel === newestRel) ? ' checked' : '';
          return '<label class="flex flex-wrap items-center gap-2 py-0.5"><input type="checkbox" data-bpick data-group="g' + gi + '" value="' + esc(en.rel) + '"' + checked + ' class="w-4 h-4">' +
            '<span>📄 <strong>' + esc(en.label) + '</strong><span class="text-gray-500"> (' + meta + ')</span></span></label>';
        }).join('');
        return '<div class="bp-group"><div class="flex flex-wrap items-center gap-2 py-1">' +
          '<input type="checkbox" data-fpick="g' + gi + '" class="w-4 h-4" title="Select all files in this folder">' +
          '<button type="button" data-ftoggle="g' + gi + '" class="hover:underline text-left"><span data-chev="g' + gi + '">' + (open ? '▾' : '▸') + '</span> ' + title +
          ' <span class="text-gray-500">(' + files.length + ' file' + (files.length === 1 ? '' : 's') + ')</span></button></div>' +
          '<div data-flist="g' + gi + '" class="pl-6"' + (open ? '' : ' hidden') + '>' + rows + '</div></div>';
      }).join('');
      // Empty campaign folders: visible but nothing to tick.
      (entries.emptyDirs || []).forEach(function (d) {
        if (byFolder[d]) return;
        var fid = folderIdOf(d);
        html += '<div class="flex flex-wrap items-center gap-2 py-1 text-gray-500"><span>▸ 📁 <strong>' + esc(d) + '</strong>' +
          (fid ? ' <span class="suggest-tag">[' + esc(fid) + ']</span>' : '') + ' (empty — no xlsx yet)</span></div>';
      });
      box.innerHTML = html +
      '<div class="flex flex-wrap items-center gap-2 mt-2"><button id="bundleLoad" class="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">Load selected (max 7)</button>' +
      '<span class="text-xs text-gray-500">Tick a folder to select all its files. Newest is pre-ticked (its folder starts open). Span, product and bulk chips come from file names; the type badge confirms after first read.</span></div>';
      var syncBundleUI = function () {
        Array.prototype.forEach.call(box.querySelectorAll('[data-fpick]'), function (head) {
          var g = head.getAttribute('data-fpick');
          var kids = box.querySelectorAll('[data-bpick][data-group="' + g + '"]');
          var n = 0;
          Array.prototype.forEach.call(kids, function (k) { if (k.checked) n++; });
          head.checked = n > 0 && n === kids.length;
          head.indeterminate = n > 0 && n < kids.length;
        });
        var total = box.querySelectorAll('[data-bpick]:checked').length;
        var btn = $('bundleLoad');
        if (btn) btn.textContent = 'Load selected (' + total + ' · max 7)';
      };
      // Wired once: box persists across opens (only innerHTML is replaced).
      if (!box._bpWired) {
        box._bpWired = true;
        box.addEventListener('click', function (e) {
          var t = e.target.closest ? e.target.closest('[data-ftoggle]') : null;
          if (!t) return;
          var g = t.getAttribute('data-ftoggle');
          var list = box.querySelector('[data-flist="' + g + '"]');
          var chev = box.querySelector('[data-chev="' + g + '"]');
          if (!list) return;
          list.hidden = !list.hidden;
          if (chev) chev.textContent = list.hidden ? '▸' : '▾';
        });
        box.addEventListener('change', function (e) {
          var el = e.target;
          if (el.hasAttribute && el.hasAttribute('data-fpick')) {
            var g = el.getAttribute('data-fpick');
            var kids = box.querySelectorAll('[data-bpick][data-group="' + g + '"]');
            Array.prototype.forEach.call(kids, function (k) { k.checked = el.checked; });
          }
          Array.prototype.forEach.call(box.querySelectorAll('[data-fpick]'), function (head) {
            var gg = head.getAttribute('data-fpick');
            var kk = box.querySelectorAll('[data-bpick][data-group="' + gg + '"]');
            var n = 0;
            Array.prototype.forEach.call(kk, function (k) { if (k.checked) n++; });
            head.checked = n > 0 && n === kk.length;
            head.indeterminate = n > 0 && n < kk.length;
          });
          var total = box.querySelectorAll('[data-bpick]:checked').length;
          var btn = $('bundleLoad');
          if (btn) btn.textContent = 'Load selected (' + total + ' · max 7)';
        });
      }
      syncBundleUI();
      $('bundleLoad').addEventListener('click', function () {
        var sel = Array.prototype.map.call(box.querySelectorAll('[data-bpick]:checked'), function (c) { return c.value; });
        if (!sel.length) { setStatus('Tick at least one bundled file.'); return; }
        sel = sel.slice(-7);
        var byRel = {};
        sorted.forEach(function (en) { byRel[en.rel] = en; });
        setStatus('Fetching ' + sel.length + ' bundled file(s)…');
        var results = [], chain = Promise.resolve();
        sel.forEach(function (rel) {
          chain = chain.then(function () {
            return fetch(encodeURI('source-file/' + rel) + '?v=' + Date.now()).then(function (r) {
              if (!r.ok) throw new Error('HTTP ' + r.status);
              var lm = r.headers.get('Last-Modified');
              return r.arrayBuffer().then(function (buf) {
                var en = byRel[rel] || entryOf(rel);
                results.push({ buf: buf, label: en.label, rel: en.rel, folder: en.folder, folderId: en.folderId,
                  fileDate: lm ? new Date(lm) : new Date() });
              });
            });
          });
        });
        chain.then(function () {
          box.hidden = true; box.innerHTML = '';
          loadManyBuffers(results);
        }).catch(function (e) { setStatus('Bundled load failed: ' + e.message); });
      });
    });
  });
  var clearBtn = $('clearFiles');
  if (clearBtn) clearBtn.addEventListener('click', function () {
    state.files = []; state.cmpRows = [];
    refreshAfterFiles('Cleared. No file loaded.');
  });

  var dz = $('dropzone');
  ['dragover', 'dragenter'].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('drag-over'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('drag-over'); });
  });
  dz.addEventListener('drop', function (e) {
    var list = e.dataTransfer.files;
    if (!list || !list.length) return;
    var arr = Array.prototype.slice.call(list, 0, 7);
    arr.forEach(function (f) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var wb = XLSX.read(reader.result, { type: 'array' });
          var parsed = rowsOfWorkbook(wb);
          addFile(f.name, new Date(f.lastModified), parsed, state.files.length === 0);
        } catch (err) { setStatus('Parse failed (' + f.name + '): ' + err.message); }
      };
      reader.readAsArrayBuffer(f);
    });
  });
  // Compare controls: mode toggle + movement/sort + per-file remove
  Array.prototype.forEach.call(document.querySelectorAll('input[name="cmpMode"]'), function (r) {
    r.addEventListener('change', function () {
      state.cmpMode = document.querySelector('input[name="cmpMode"]:checked').value;
      refreshAfterFiles();
    });
  });
  ['cmpMove', 'cmpSort'].forEach(function (id) {
    var el = $(id);
    if (el) { el.addEventListener('input', renderCompare); el.addEventListener('change', renderCompare); }
  });
  ['trendMetric', 'trendSort'].forEach(function (id) {
    var el = $(id);
    if (el) { el.addEventListener('input', renderTrend); el.addEventListener('change', renderTrend); }
  });
  var flBox = $('fileList');
  if (flBox) flBox.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-unload]') : null;
    if (!b) return;
    var rel = b.getAttribute('data-unload');
    state.files = state.files.filter(function (f) { return (f.rel || f.label) !== rel; });
    refreshAfterFiles();
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
        var m = state.allowMeta[a];
        var tag = (m && m.topAffiliate) ? '<span class="suggest-tag">top affiliate</span>' : (state.allowlist.indexOf(a) !== -1 ? '<span class="suggest-tag">allowlisted</span>' : '');
        return '<button type="button" class="suggest-item" data-acc="' + esc(a) + '"><span>' + esc(a) + esc(allowUser(a)) + esc(allowFlags(a)) + '</span>' + tag + '</button>';
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

  /* Account dropdown: Internal Account + Top Affiliate + Other-accounts optgroups */
  function buildAccountOptions() {
    var sel = $('fAccount'), cur = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    var mkOpt = function (a) {
      var o = document.createElement('option');
      o.value = a; o.textContent = allowLabel(a);
      return o;
    };
    var isTop = function (a) { var m = state.allowMeta[a]; return !!(m && m.topAffiliate); };
    var gi = document.createElement('optgroup');
    var internals = state.allowlist.filter(function (a) { return !isTop(a); });
    gi.label = 'Internal Account (' + internals.length + ')';
    internals.forEach(function (a) { gi.appendChild(mkOpt(a)); });
    sel.appendChild(gi);
    var tops = state.allowlist.filter(isTop);
    if (tops.length) {
      var gt = document.createElement('optgroup');
      gt.label = 'Top Affiliate (' + tops.length + ')';
      tops.forEach(function (a) { gt.appendChild(mkOpt(a)); });
      sel.appendChild(gt);
    }
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
    var statuses = {}, types = {}, secs = {}, camps = {}, campIds = {}, campNames = {};
    state.rows.forEach(function (r) {
      statuses[r.status] = 1; types[r.type] = 1; secs[r.sec] = 1;
      var k = campKey(r);
      if (k) { camps[k] = 1; if (!campIds[k]) campIds[k] = r.campaignId || ''; if (r.campaign) campNames[k] = r.campaign; }
    });
    fillSelect('fStatus', Object.keys(statuses));
    fillSelect('fType', Object.keys(types));
    fillSelect('fSec', Object.keys(secs));
    // Campaign options: friendly label when named, raw file name otherwise.
    // Bracket keys (blank-campaign rows tagged by folder [id]) show the catalog
    // label or the 'Unnamed campaign' placeholder — never a bare ID.
    var sel = $('fCamp'), cur = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    Object.keys(camps).sort().forEach(function (n) {
      var bracket = n.charAt(0) === '[';
      var lab = campLabel({ campaign: bracket ? '' : (campNames[n] || n), campaignId: campIds[n] });
      var o = document.createElement('option');
      o.value = n; o.textContent = (!bracket && lab && lab !== n) ? lab + ' — ' + n : lab;
      sel.appendChild(o);
    });
    // Keep a user-picked campaign across reloads only if it still exists.
    sel.value = cur;
    if (cur && sel.value !== cur) sel.value = '';
    // all distinct file accounts -> "Other" group (allowlist filtered out in builder)
    var seen = {};
    state.rows.forEach(function (r) { if (r.account) seen[r.account] = 1; });
    state.others = Object.keys(seen).sort();
    buildAccountOptions();
  }

  /* ---------- filtering + render ---------- */
  ['fAccount', 'fStatus', 'fSec', 'fType', 'fCamp', 'fSearch', 'fMinRoi', 'fMinOrders', 'fMaxAge', 'fSort', 'fAllowlist', 'fMin1k', 'fNoCard', 'fNoInel', 'fNoInactive', 'fInsight']
    .forEach(function (id) {
      $(id).addEventListener('input', applyFilters);
      $(id).addEventListener('change', applyFilters);
    });
  /* Top-N switcher: re-bars the file, then re-renders (kept out of the generic
     list so the bench recomputes BEFORE filters re-apply) */
  $('fTopN').addEventListener('change', function () {
    var tn = parseInt($('fTopN').value, 10);
    if (isNaN(tn) || tn < 5 || tn > 50) return;
    state.targets.topN = tn;
    computeBench();
    applyFilters();
  });

  function filtered(forceAccount) {
    var acc = forceAccount !== undefined ? forceAccount : $('fAccount').value, st = $('fStatus').value, ty = $('fType').value;
    var se = $('fSec').value, cp = $('fCamp').value;
    var ins = $('fInsight').value;
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
    var maxAge = parseInt($('fMaxAge').value, 10);
    var onlyAllow = $('fAllowlist').checked;
    var only1k = $('fMin1k').checked;
    var noCard = $('fNoCard').checked;
    var hideInel = $('fNoInel').checked;
    var hideInact = $('fNoInactive').checked;
    if (isNaN(minRoi)) minRoi = -Infinity;
    if (isNaN(minOrd)) minOrd = -Infinity;
    var out = state.rows.filter(function (r) {
      if (acc && r.account !== acc) return false;
      if (onlyAllow && state.allowlist.indexOf(r.account) === -1) return false;
      if (only1k && r.impr < 1000) return false;
      if (noCard && r.account === 'Product Card') return false;
      if (hideInel && st !== 'Ineligible' && String(r.status) === 'Ineligible') return false;
      if (hideInact && isInactiveAcc(r.account)) return false;
      if (st && String(r.status) !== st) return false;
      if (se && String(r.sec) !== se) return false;
      if (ins && insBase(r) !== ins) return false;
      if (ty && String(r.type) !== ty) return false;
      if (cp && campKey(r) !== cp) return false;
      if (r.roi < minRoi || r.orders < minOrd) return false;
      if (!isNaN(maxAge)) { var ad = ageDays(r.timePosted); if (isNaN(ad) || ad > maxAge) return false; }
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
    renderBench();
    renderInsightGuide();
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
    renderCompare();
    renderTrend();
    applyInsightLink();
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
      return '<tr data-acc="' + esc(a.account) + '" title="Click for creative details"><td>' + esc(a.account) + esc(allowUser(a.account)) + esc(allowFlags(a.account)) + '</td><td>' + (allow ? 'yes' : '–') + '</td><td>' + fmt(a.rows) +
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
      html += '<div class="cov-miss">&#9888; <strong>' + esc(a) + '</strong>' + esc(allowUser(a)) + esc(allowFlags(a)) + ' — 0 rows in this file, excluded from totals. ' + hints + '</div>';
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
  /* Facet key → display name (bracket keys resolve via catalog/placeholder). */
  function campFacetLabel(key) {
    if (!key) return '';
    for (var i = 0; i < state.rows.length; i++) {
      if (campKey(state.rows[i]) === key) return campLabel(state.rows[i]);
    }
    if (key.charAt(0) === '[') return campLabel({ campaign: '', campaignId: key.slice(1, -1) });
    return key;
  }
  function filterContext() {
    var bits = [];
    if ($('fStatus').value) bits.push('Status=' + $('fStatus').value);
    if ($('fSec').value) bits.push('2nd=' + $('fSec').value);
    if ($('fInsight').value) bits.push('Insight=' + $('fInsight').value);
    if ($('fType').value) bits.push('Type=' + $('fType').value);
    if ($('fCamp').value) bits.push('Campaign=' + campFacetLabel($('fCamp').value));
    var sq = $('fSearch').value.trim();
    if (sq) bits.push((state.idMode ? 'Post ID=' : 'Search=') + (sq.length > 40 ? sq.slice(0, 40) + '…' : sq));
    if ($('fMinRoi').value) bits.push('ROI>=' + $('fMinRoi').value);
    if ($('fMinOrders').value) bits.push('Orders>=' + $('fMinOrders').value);
    if ($('fMaxAge').value) bits.push('posted≤' + $('fMaxAge').value + 'd');
    if ($('fMin1k').checked) bits.push('1000+ impressions');
    if ($('fNoCard').checked) bits.push('Product Card excluded');
    if ($('fNoInel').checked) bits.push('Ineligible hidden');
    if ($('fNoInactive').checked) bits.push('inactive hidden');
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
      return '<tr><td>' + (i + 1) + '</td><td>' + esc(cr) + '</td><td title="' + esc((r.campaign || r.campaignId) || '') + '">' + esc(campLabel(r)) + '</td><td title="' + esc(prodTitle(r)) + '">' + esc(prodName(r)) + '</td><td>' + esc(r.type) + '</td><td>' + esc(r.status) + '</td><td>' + secBadge(r.sec) + '</td>' + insightCell(r) + '<td>' + fmtPosted(r.timePosted) +
        '</td><td>' + fmt(r.cost, 2) + '</td><td>' + fmt(r.orders) + '</td><td>' + fmt(r.revenue, 2) + '</td><td>' + r.roi.toFixed(2) +
        '</td><td>' + r.aov.toFixed(2) +
        '</td><td>' + (r.impr >= 1000 ? '<span class="tick" title="1000+ impressions">✓ </span>' : '') + fmt(r.impr) +
        '</td><td>' + fmt(r.clicks) + '</td><td>' + r.cpm.toFixed(2) + '</td></tr>';
    }).join('') || '<tr><td colspan="17" class="empty-note">No creatives match the active filters.</td></tr>';
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
    $('acctModalTitle').textContent = account + (allow ? ' ✓ allowlisted' + allowUser(account) + (note ? ' — ' + note : '') + allowId(account) + allowFlags(account) + allowUpdated(account) : '');
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
    if (e.key === 'Escape' && !$('insModal').hidden) closeInsightModal();
    if (e.key === 'Escape' && !$('trendModal').hidden) closeTrendModal();
  });
  /* Insight popup: click any verdict chip for the per-video explanation. */
  function openInsightModal(row) {
    var ins = insightOf(row);
    if (!ins.chip) return;
    var cr = String(row.creative || '');
    $('insModalTitle').textContent = ins.chip + ' ' + ins.label;
    $('insModalCtx').textContent = (cr.length > 80 ? cr.slice(0, 80) + '…' : cr) + ' · ' + row.account;
    $('insModalWhy').textContent = ins.detail;
    $('insModalKpis').innerHTML =
      kpiMini('Cost (MYR)', fmt(row.cost, 2)) + kpiMini('Orders', fmt(row.orders)) +
      kpiMini('Revenue (MYR)', fmt(row.revenue, 2)) + kpiMini('ROI', row.roi.toFixed(2)) +
      kpiMini('AOV (MYR)', row.aov.toFixed(2)) + kpiMini('Impr.', fmt(row.impr)) +
      kpiMini('CPM', row.cpm.toFixed(2)) + kpiMini('2s rate', (row.v2 * 100).toFixed(1) + '%');
    $('insModal').hidden = false;
    document.body.style.overflow = 'hidden';
    $('insModalClose').focus();
  }
  function closeInsightModal() {
    $('insModal').hidden = true;
    document.body.style.overflow = '';
  }
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-ins]') : null;
    if (!t) return;
    var k = t.getAttribute('data-ins');
    var row = null;
    state.rows.some(function (r) { if (keyOf(r.postId, r.account, r.creative) === k) { row = r; return true; } return false; });
    if (row) openInsightModal(row);
  });
  $('insModalClose').addEventListener('click', closeInsightModal);
  $('insModal').addEventListener('click', function (e) {
    if (e.target === $('insModal')) closeInsightModal();
  });
  /* ?insight=Label deep-link: expand the guide, filter to that verdict, jump to it (once). */
  var insightLinkDone = false;
  function applyInsightLink() {
    if (insightLinkDone) return;
    insightLinkDone = true;
    var m = /[?&]insight(=([^&#]*))?/i.exec(location.search || '');
    if (!m) return;
    var box = $('insightGuideBox');
    if (box) box.open = true;
    var q = m[2] === undefined ? '' : decodeURIComponent(m[2].replace(/\+/g, ' ')).trim().toLowerCase();
    if (!q) return;
    var hit = guideRows().filter(function (g) { return g.slug.toLowerCase() === q || g.label.toLowerCase() === q; })[0];
    if (hit) {
      var el = document.getElementById('ins-' + hit.slug);
      if (el) el.scrollIntoView();
      var sel = $('fInsight');
      var v = (hit.slug === 'Drops') ? 'Drops' : hit.label;
      if (sel && sel.value !== v) { sel.value = v; applyFilters(); }
    }
  }

  function renderTop(rows) {
    $('rowCount').textContent = '— ' + fmt(rows.length) + ' match';
    var tb = $('topTable').querySelector('tbody');
    if (!rows.length) { tb.innerHTML = '<tr><td colspan="18" class="empty-note">No rows match.</td></tr>'; return; }
    tb.innerHTML = rows.slice(0, MAX_TABLE_ROWS).map(function (r) {
      var cr = String(r.creative || '');
      if (cr.length > 90) cr = cr.slice(0, 90) + '…';
      return '<tr><td class="mono">' + esc(r.postId) + '</td><td>' + esc(cr) + '</td><td>' + esc(r.account) +
        '</td><td title="' + esc((r.campaign || r.campaignId) || '') + '">' + esc(campLabel(r)) + '</td><td title="' + esc(prodTitle(r)) + '">' + esc(prodName(r)) + '</td><td>' + esc(r.type) + '</td><td>' + esc(r.status) + '</td><td>' + secBadge(r.sec) + '</td>' + insightCell(r) + '<td>' + fmtPosted(r.timePosted) + '</td><td>' + fmt(r.cost, 2) + '</td><td>' + fmt(r.orders) +
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
  function mgrRow(name, username, accountId, note, active, live, topAffiliate, stamp) {
    return '<div style="display:grid;grid-template-columns:auto auto 2fr 1.2fr 1.2fr 2fr auto auto auto auto auto;gap:0.5rem;align-items:center" data-mrow>' +
      '<span class="row-num text-sm text-gray-500 dark:text-gray-400" style="min-width:1.5rem;text-align:right"></span>' +
      '<span class="drag-handle" draggable="true" title="Drag to reorder">⠿</span>' +
      '<input data-f="name" class="filter-input" value="' + esc(name) + '" placeholder="Exact account name">' +
      '<input data-f="username" class="filter-input" value="' + esc(username) + '" placeholder="username (no @)">' +
      '<input data-f="accountId" class="filter-input" value="' + esc(accountId) + '" placeholder="account ID (optional)">' +
      '<input data-f="note" class="filter-input" value="' + esc(note) + '" placeholder="note (optional)">' +
      '<label class="text-sm flex items-center gap-1"><input data-f="active" type="checkbox"' + (active ? ' checked' : '') + '> Active</label>' +
      '<label class="text-sm flex items-center gap-1"><input data-f="live" type="checkbox"' + (live ? ' checked' : '') + '> Live</label>' +
      '<label class="text-sm flex items-center gap-1" title="Top affiliate"><input data-f="topAffiliate" type="checkbox"' + (topAffiliate ? ' checked' : '') + '> T-Aff</label>' +
      '<span class="text-xs text-gray-500 dark:text-gray-400" style="white-space:nowrap">' + esc(stamp || '–') + '</span>' +
      '<button type="button" data-mdel class="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-sm" title="Remove">✕</button></div>';
  }
  function mgrGroupHtml(title, key, rowsHtml) {
    return '<div class="text-sm font-semibold mt-3 mb-1">' + esc(title) + ' (<span data-gcount="' + key + '">0</span>)</div>' +
      '<div data-mgroup="' + key + '" style="display:flex;flex-direction:column;gap:0.5rem">' + rowsHtml + '</div>';
  }
  function renderMgr() {
    $('mgrStatus').textContent = '';
    $('mgrTopN').value = (state.targets && state.targets.topN) || 20;
    $('mgrMinImpr').value = (state.targets && typeof state.targets.minImpr === 'number') ? state.targets.minImpr : '';
    $('mgrMaxCPM').value = (state.targets && typeof state.targets.maxCPM === 'number') ? state.targets.maxCPM : '';
    var internals = [], tops = [], dormant = [];
    state.allowlist.forEach(function (a) {
      var m = state.allowMeta[a] || { username: '', accountId: '', note: '', active: true, live: false, topAffiliate: false, updatedAt: null };
      var html = mgrRow(a, m.username, m.accountId, m.note, m.active !== false, m.live === true, m.topAffiliate === true, fmtAgo(m.updatedAt));
      if (m.active === false) dormant.push(html);
      else if (m.topAffiliate === true) tops.push(html); else internals.push(html);
    });
    $('mgrRows').innerHTML = mgrGroupHtml('Internal Account', 'internal', internals.join('')) +
      mgrGroupHtml('Top Affiliate', 'top', tops.join('')) +
      mgrGroupHtml('Inactive', 'inactive', dormant.join(''));
    renumberMgr();
  }
  function collectMgr() {
    var out = [], bad = -1;
    Array.prototype.forEach.call($('mgrRows').querySelectorAll('[data-mrow]'), function (row, i) {
      var g = function (f) { return row.querySelector('[data-f="' + f + '"]').value.trim(); };
      var c = function (f) { return row.querySelector('[data-f="' + f + '"]').checked; };
      var name = g('name'), username = g('username'), accountId = g('accountId'), note = g('note');
      if (!name && !username && !accountId && !note) return; // skip blank rows
      if (!name) { bad = i + 1; return; }
      out.push({ name: name, username: username, accountId: accountId, note: note, active: c('active'), live: c('live'), topAffiliate: c('topAffiliate') });
    });
    return { rows: out, bad: bad };
  }
  /* Manager row order: numbered badges + drag-to-reorder (save follows DOM order). */
  function renumberMgr() {
    var box = $('mgrRows');
    Array.prototype.forEach.call(box.querySelectorAll('[data-mrow]'), function (row, i) {
      var n = row.querySelector('.row-num');
      if (n) n.textContent = (i + 1) + '.';
    });
    ['internal', 'top', 'inactive'].forEach(function (k) {
      var g = box.querySelector('[data-mgroup="' + k + '"]');
      var s = box.querySelector('[data-gcount="' + k + '"]');
      if (g && s) s.textContent = g.querySelectorAll('[data-mrow]').length;
    });
  }
  var mgrDragSrc = null;
  function mgrRowFromEvent(e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-mrow]') : null;
    return t;
  }
  /* Drop position from mouse height: bottom half = after the row (reaches end of list). */
  function dndAfter(clientY, top, height) { return (clientY - top) > height / 2; }
  function mgrClearDrop() {
    Array.prototype.forEach.call($('mgrRows').querySelectorAll('.drag-before,.drag-after,.drag-src'), function (r) {
      r.classList.remove('drag-before'); r.classList.remove('drag-after'); r.classList.remove('drag-src');
    });
  }
  function collectTargets() {
    var tn = parseInt($('mgrTopN').value, 10);
    var mi = $('mgrMinImpr').value.trim(), mc = $('mgrMaxCPM').value.trim();
    if (isNaN(tn) || tn < 5 || tn > 50) return { ok: false, error: 'Top-N must be 5–50.' };
    var out = { topN: tn, minImpr: null, maxCPM: null };
    if (mi !== '') {
      var a = parseFloat(mi);
      if (isNaN(a) || a < 0) return { ok: false, error: 'Min impressions must be empty or ≥ 0.' };
      out.minImpr = a;
    }
    if (mc !== '') {
      var b = parseFloat(mc);
      if (isNaN(b) || b < 0) return { ok: false, error: 'Max CPM must be empty or ≥ 0.' };
      out.maxCPM = b;
    }
    return { ok: true, value: out };
  }
  function postJSON(url, obj) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj)
    }).then(function (r) {
      return r.text().then(function (t) {
        var o = null;
        try { o = JSON.parse(t); } catch (e) { o = null; }
        if (o && o.ok) return o;
        if (r.status === 501 || (t && t.charAt(0) === '<')) throw new Error('plain file server detected — stop it and run python server.py (or use Download JSON)');
        if (!t) throw new Error('empty reply from server (static hosting?) — use Download JSON, or edit locally with server.py');
        throw new Error((o && o.error) || ('HTTP ' + r.status));
      });
    });
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
    var g = $('mgrRows').querySelector('[data-mgroup="internal"]');
    if (g) g.insertAdjacentHTML('beforeend', mgrRow('', '', '', '', true, false, false, '–'));
    else $('mgrRows').insertAdjacentHTML('beforeend', mgrRow('', '', '', '', true, false, false, '–'));
    renumberMgr();
  });
  $('mgrRows').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-mdel]') : null;
    if (!b) return;
    var row = b.closest('[data-mrow]');
    if (row) { row.remove(); renumberMgr(); }
  });
  $('mgrRows').addEventListener('dragstart', function (e) {
    var h = e.target && e.target.closest ? e.target.closest('.drag-handle') : null;
    var row = h && h.closest ? h.closest('[data-mrow]') : null;
    if (!row) return;
    mgrDragSrc = row;
    row.classList.add('drag-src');
    if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', ''); } catch (err) {} }
  });
  $('mgrRows').addEventListener('dragover', function (e) {
    if (!mgrDragSrc) return;
    e.preventDefault(); // keep the container a valid drop zone (lets rows land at the end)
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    var row = mgrRowFromEvent(e);
    var before = $('mgrRows').querySelector('.drag-before'), after = $('mgrRows').querySelector('.drag-after');
    if (before) before.classList.remove('drag-before');
    if (after) after.classList.remove('drag-after');
    if (!row || row === mgrDragSrc || !row.getBoundingClientRect) return;
    var r = row.getBoundingClientRect();
    row.classList.add(dndAfter(e.clientY, r.top, r.height) ? 'drag-after' : 'drag-before');
  });
  /* Dropping a row into a group re-ticks it to match that group. Inactive wins
     for grouping; a dormant top keeps its T-Aff so reactivating restores it. */
  function mgrRetick(row) {
    if (!row || !row.closest) return;
    var g = row.closest('[data-mgroup]');
    if (!g) return;
    var k = g.getAttribute('data-mgroup');
    var top = row.querySelector('[data-f="topAffiliate"]');
    var act = row.querySelector('[data-f="active"]');
    if (k === 'inactive') {
      if (act) act.checked = false;
    } else {
      if (act) act.checked = true;
      if (top) top.checked = (k === 'top');
    }
  }
  $('mgrRows').addEventListener('drop', function (e) {
    if (!mgrDragSrc) return;
    e.preventDefault();
    var row = mgrRowFromEvent(e);
    if (row && row !== mgrDragSrc) {
      if (row.getBoundingClientRect && dndAfter(e.clientY, row.getBoundingClientRect().top, row.getBoundingClientRect().height)) {
        row.parentNode.insertBefore(mgrDragSrc, row.nextSibling);
      } else {
        row.parentNode.insertBefore(mgrDragSrc, row);
      }
      mgrRetick(mgrDragSrc);
      renumberMgr();
    } else if (!row) {
      var g = (e.target && e.target.closest) ? e.target.closest('[data-mgroup]') : null;
      if (!g) g = $('mgrRows').querySelector('[data-mgroup="inactive"]');
      if (g) {
        g.appendChild(mgrDragSrc);
        mgrRetick(mgrDragSrc);
      } else {
        $('mgrRows').appendChild(mgrDragSrc);
      }
      renumberMgr();
    }
    mgrDragSrc = null;
    mgrClearDrop();
  });
  /* Ticking T-Aff or Active moves the row into its live group immediately. */
  $('mgrRows').addEventListener('change', function (e) {
    var cb = (e.target && e.target.matches && e.target.matches('[data-f="topAffiliate"],[data-f="active"]')) ? e.target : null;
    if (!cb) return;
    var row = cb.closest ? cb.closest('[data-mrow]') : null;
    if (!row) return;
    var top = row.querySelector('[data-f="topAffiliate"]');
    var act = row.querySelector('[data-f="active"]');
    var want = (act && !act.checked) ? 'inactive' : ((top && top.checked) ? 'top' : 'internal');
    var cur = row.closest ? row.closest('[data-mgroup]') : null;
    if (cur && cur.getAttribute('data-mgroup') !== want) {
      var dest = $('mgrRows').querySelector('[data-mgroup="' + want + '"]');
      if (dest) { dest.appendChild(row); renumberMgr(); }
    } else {
      renumberMgr();
    }
  });
  $('mgrRows').addEventListener('dragend', function () {
    mgrDragSrc = null;
    mgrClearDrop();
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
    var t = collectTargets();
    if (!t.ok) { $('mgrStatus').textContent = t.error; return; }
    $('mgrStatus').textContent = 'Saving…';
    postJSON('/api/accounts', c.rows)
      .then(function (o) { state.savedEntries = o.entries; return postJSON('/api/targets', t.value); })
      .then(function () {
        $('mgrStatus').textContent = 'Saved ' + state.savedEntries + ' accounts + targets. Reloading…';
        state.targets = t.value;
        syncTopNUI();
        loadAllowlist().then(function () {
          computeBench();
          applyFilters();
          closeMgr();
          setStatus('Accounts + targets reloaded (' + state.savedEntries + ' entries).');
        });
      })
      .catch(function (e) {
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
    var head = ['Post ID', 'Creative', 'Account', 'Campaign', 'Campaign ID', 'Product', 'Product ID', 'Type', 'Status', 'Exploration secondary status', 'Insight', 'Posted', 'Cost', 'Orders', 'Revenue', 'ROI', 'AOV', 'Impressions', 'Clicks', 'CPM'];
    var q = function (v) { return '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"'; };
    var lines = [head.join(',')].concat(rows.map(function (r) {
      return [q(r.postId), q(r.creative), q(r.account), q(campLabel(r)), q(r.campaignId || ''), q(prodName(r)), q(r.productId || ''), q(r.type), q(r.status), q(r.sec), q(insightText(r)), q(r.timePosted),
        r.cost.toFixed(2), r.orders, r.revenue.toFixed(2), r.roi.toFixed(2), r.aov.toFixed(2), r.impr, r.clicks, r.cpm.toFixed(2)].join(',');
    }));
    return lines.join('\n');
  }
  $('expCsv').addEventListener('click', function () {
    var rows = filtered();
    if (!rows.length) return;
    download('creatives-filtered.csv', buildCsv(rows), 'text/csv');
  });
  function buildCmpCsv(rows) {
    var head = ['Move', 'Creative', 'Account', 'Campaign', 'Campaign moved', 'Product', 'Post ID',
      'Base Revenue', 'Latest Revenue', 'Delta Revenue',
      'Base Orders', 'Latest Orders', 'Delta Orders',
      'Base Cost', 'Latest Cost', 'Delta Cost',
      'Base ROI', 'Latest ROI', 'Delta ROI',
      'Base Impr', 'Latest Impr', 'Delta Impr',
      'Base CPM', 'Latest CPM', 'Base Status', 'Latest Status', 'Files'];
    var q = function (v) { return '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"'; };
    var cat = mergedCat();
    var prd = mergedPrd();
    var lines = [head.join(',')].concat(rows.map(function (r) {
      var ce = cat[String(r.campId || '')], pe = prd[String(r.prodId || '')];
      var cl = (ce && ce.label) ? ce.label : (r.campaign || (r.campId ? 'Unnamed campaign' : ''));
      var pn = (pe && pe.name) ? pe.name :
        (String(r.prodId || '').toUpperCase() === 'N/A' && r.campaign ? 'Product Card - ' + cl : (r.prodId || ''));
      return [q(r.move), q(r.creative), q(r.account), q(cl), r.campMoved ? 'yes' : 'no', q(pn), q(r.postId),
        r.aRev.toFixed(2), r.bRev.toFixed(2), r.dRev.toFixed(2),
        r.aOrd, r.bOrd, r.dOrd,
        r.aCost.toFixed(2), r.bCost.toFixed(2), r.dCost.toFixed(2),
        r.aRoi.toFixed(2), r.bRoi.toFixed(2), r.dRoi.toFixed(2),
        r.aImpr, r.bImpr, r.dImpr,
        r.aCpm.toFixed(2), r.bCpm.toFixed(2), q(r.aStatus), q(r.bStatus), q(state.cmpInfo)].join(',');
    }));
    return 'Files: ' + state.cmpInfo + '\n' + lines.join('\n');
  }
  var cmpCsvBtn = $('cmpCsv');
  if (cmpCsvBtn) cmpCsvBtn.addEventListener('click', function () {
    var rows = cmpFiltered();
    if (!rows.length) return;
    download('creatives-compare.csv', buildCmpCsv(rows), 'text/csv');
  });
  /* Sheet-like preview: same filtered set as Export, rendered as a standalone
     HTML table page (new tab, local-only blob). Drag header edges to resize
     columns (Chrome/Edge); click any cell to expand its full text. */
  var PREVIEW_COLS = ['Post ID', 'Creative', 'Account', 'Campaign', 'Product', 'Type', 'Status', 'Exploration secondary status', 'Insight', 'Posted', 'Cost', 'Orders', 'Revenue', 'ROI', 'AOV', 'Impressions', 'Clicks', 'CPM'];
  var PREVIEW_WIDTHS = [150, 340, 170, 170, 150, 90, 110, 150, 150, 110, 90, 80, 110, 70, 80, 110, 80, 80];
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
      'td.open{white-space:normal;overflow:visible}table.wrap-all td{white-space:normal;overflow:visible}' +
      '.sec{display:inline-block;padding:1px 8px;border-radius:9999px;font-size:11px;font-weight:600;white-space:nowrap}' +
      '.sec-performing{background:#dcfce7;color:#166534}.sec-outstanding{background:#fef3c7;color:#92400e}' +
      '.sec-underperforming{background:#f3f4f6;color:#4b5563}.sec-exploring{background:#dbeafe;color:#1e40af}' +
      '.sec-calculating{background:#ffedd5;color:#9a3412}.sec-flat{background:#f3f4f6;color:#4b5563}' +
      '.sec-rejected{background:#fee2e2;color:#991b1b}' +
      '@media (prefers-color-scheme:dark){.sec-performing{background:rgba(22,101,52,.5);color:#86efac}' +
      '.sec-outstanding{background:rgba(146,64,14,.5);color:#fcd34d}.sec-underperforming,.sec-flat{background:#374151;color:#d1d5db}' +
      '.sec-exploring{background:rgba(30,64,175,.5);color:#93c5fd}.sec-calculating{background:rgba(154,52,18,.5);color:#fdba74}' +
      '.sec-rejected{background:rgba(153,27,27,.5);color:#fca5a5}}';
    var js = 'document.querySelector("tbody").addEventListener("click",function(e){' +
      'var td=e.target.closest?e.target.closest("td"):null;if(td)td.classList.toggle("open");});' +
      'document.getElementById("wrapAll").addEventListener("change",function(e){' +
      'document.querySelector("table").classList.toggle("wrap-all",e.target.checked);});';
    var head = '<tr>' + PREVIEW_COLS.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>';
    var cols = PREVIEW_WIDTHS.map(function (w) { return '<col style="width:' + w + 'px">'; }).join('');
    var body = rows.map(function (r) {
      return '<tr><td class="mono">' + esc(r.postId) + '</td><td>' + esc(r.creative) + '</td><td>' + esc(r.account) +
        '</td><td>' + esc(campLabel(r)) + '</td><td>' + esc(prodName(r)) + '</td><td>' + esc(r.type) + '</td><td>' + esc(r.status) + '</td><td>' + secBadge(r.sec) + '</td><td>' + esc(insightText(r)) + '</td><td>' + fmtPosted(r.timePosted) + '</td><td class="num">' + fmt(r.cost, 2) + '</td><td class="num">' + fmt(r.orders) +
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
