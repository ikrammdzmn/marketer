/* Metric Scorer — registry-driven (metrics.json). Vanilla IIFE, no build. Spec: metric.md v3. */
(function () {
'use strict';

var RAW_COLS = ['Ad group name', 'Spend', 'Impressions', 'Reach', '6-second focused views',
  'Paid profile visits', 'Paid likes', 'Paid shares', 'Paid comments', 'Paid follows',
  'Average play time per video view', 'LIVE views', '10-second LIVE views'];

// Legacy fallback bands (used only if metrics.json cannot load, e.g. file://).
var BANDS = {
  v3: { erriK: 0.003, erriS: 0.015, hpsK: 20, hpsS: 35, acsK: 0.025, acsS: 0.008,
    cesK: 15, cesS: 60, cesX: 10000, edsK: 5, edsS: 20, vvesK: 100, vvesS: 400,
    rvsK: 500, rvsS: 1500, hrqK: 25, hrqS: 40, resK: 400, resS: 1200, resX: 10,
    lqsK: 1, lqsS: 3, bcK: 20, bcS: 60, bcX: 1000 },
  v2: { erriK: 0.003, erriS: 0.015, hpsK: 25, hpsS: 45, acsK: 0.05, acsS: 0.01,
    cesK: 5, cesS: 30, cesX: 10000, edsK: 5, edsS: 20, vvesK: 100, vvesS: 400,
    rvsK: 500, rvsS: 1500, hrqK: 2, hrqS: 12, resK: 100, resS: 600, resX: 100,
    lqsK: 1, lqsS: 3, bcK: 0.5, bcS: 2, bcX: 100 }
};

var state = { rows: [], fileName: '' };
var REG = null; // loaded preset registry {preset, label, metrics[]}
var PRESETS = []; // manifest entries {id, file, label}
var PRESET_ID = null;
var LS_KEY = 'metric-presets-overrides-v1';

function num(v) { var n = parseFloat(String(v == null ? '' : v).trim()); return isFinite(n) ? n : 0; }
function flag(v, k, s, invert) {
  if (invert) return v > k ? 'KILL' : (v < s ? 'SCALE' : 'WATCH');
  return v < k ? 'KILL' : (v > s ? 'SCALE' : 'WATCH');
}
function flagChip(f) {
  var c = f === 'KILL' ? 'chip-r' : (f === 'SCALE' ? 'chip-b' : 'chip-s');
  return '<span class="chip ' + c + '">' + f + '</span>';
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function baseCtx(r) {
  var HR = r.imp ? r.sfv / r.imp : 0, PVR = r.imp ? r.prof / r.imp : 0;
  var EDSraw = r.likes ? (r.sh + r.com + r.fol) / r.likes : 0;
  var ACS = r.sfv ? r.spend / r.sfv : 999;
  return { spend: r.spend, imp: r.imp, reach: r.reach, sfv: r.sfv, prof: r.prof,
    likes: r.likes, sh: r.sh, com: r.com, fol: r.fol, awt: r.awt,
    live: r.live, live10: r.live10, HR: HR, PVR: PVR, EDSraw: EDSraw, ACS: ACS };
}

function evalExpr(expr, ctx) {
  try {
    var v = Function('c', 'with(c){return (' + expr + ')}')(ctx);
    return (typeof v === 'number' && isFinite(v)) ? v : 0;
  } catch (e) { return NaN; }
}

// One metric's numbers: supports flat preset schema {band:{k,s}, params:{}}
// and legacy dual schema {bands:{v3:{k,s},v2:{k,s}}, params:{v3:{},v2:{}}}.
function defView(m) {
  if (m.band) return { k: m.band.k, s: m.band.s, params: m.params || {}, flat: true };
  var key = bandKey();
  var b = (m.bands && m.bands[key]) || m.bands.v3;
  var p = ((m.params || {})[key]) || {};
  return { k: b.k, s: b.s, params: p, flat: false };
}

function activeDefs() {
  if (!REG) return null;
  return REG.metrics.filter(function (m) { return m.enabled !== false; }).map(function (m) {
    var v = defView(m);
    return { def: m, k: v.k, s: v.s, params: v.params };
  });
}

function bandKey() { return document.getElementById('vBands').value || 'v3'; }

function legacyScore(r, B) {
  var imp = r.imp, reach = r.reach, sfv = r.sfv;
  var HR = imp ? sfv / imp : 0, PVR = imp ? r.prof / imp : 0;
  var EDSraw = r.likes ? (r.sh + r.com + r.fol) / r.likes : 0;
  var ACS = sfv ? r.spend / sfv : 999;
  var o = { vals: {}, f: {} };
  o.vals = {
    ERRI: imp ? r.live / imp * 100 : 0, HPS: HR * 100, ACS: ACS, CES: (ACS && ACS !== 999) ? B.cesX * HR * PVR * EDSraw / ACS : 0,
    EDS: EDSraw * 100, VVES: (ACS && ACS !== 999) ? (HR * r.awt) / ACS : 0, RVS: (ACS && ACS !== 999) ? r.awt / ACS : 0,
    HRQ: reach ? sfv / reach * 100 : 0, RES: (reach && r.spend) ? ((sfv / reach) * B.resX) / (r.spend / reach) : 0,
    LQS: r.spend ? r.live10 / r.spend * 100 : 0, BCE: (ACS && ACS !== 999) ? B.bcX * HR * PVR / ACS : 0
  };
  o.f = {
    ERRI: flag(o.vals.ERRI, B.erriK, B.erriS), HPS: flag(o.vals.HPS, B.hpsK, B.hpsS),
    ACS: flag(o.vals.ACS, B.acsK, B.acsS, true), CES: flag(o.vals.CES, B.cesK, B.cesS),
    EDS: flag(o.vals.EDS, B.edsK, B.edsS), VVES: flag(o.vals.VVES, B.vvesK, B.vvesS),
    RVS: flag(o.vals.RVS, B.rvsK, B.rvsS), HRQ: flag(o.vals.HRQ, B.hrqK, B.hrqS),
    RES: flag(o.vals.RES, B.resK, B.resS), LQS: flag(o.vals.LQS, B.lqsK, B.lqsS),
    BCE: flag(o.vals.BCE, B.bcK, B.bcS)
  };
  return finishOverall(o);
}

function registryScore(r) {
  var defs = activeDefs();
  var ctx = baseCtx(r);
  var o = { vals: {}, f: {} };
  defs.forEach(function (d) {
    var c = Object.assign({}, ctx, d.params);
    var v = evalExpr(d.def.expression, c);
    if (!isFinite(v)) v = 0;
    o.vals[d.def.short] = v;
    o.f[d.def.short] = flag(v, d.k, d.s, !!d.def.invert);
  });
  return finishOverall(o);
}

function overallOf(F) {
  var g = function (k) { return F[k] || 'WATCH'; };
  if (g('CES') === 'KILL' || (g('ACS') === 'KILL' && (g('HPS') === 'KILL' || g('VVES') === 'KILL'))) {
    var why = [];
    if (g('CES') === 'KILL') why.push('CES kill');
    if (g('ACS') === 'KILL' && g('HPS') === 'KILL') why.push('hook+cost kill');
    if (g('ACS') === 'KILL' && g('VVES') === 'KILL') why.push('cost+view-eff kill');
    return { v: 'KILL', reason: why.join('+') || 'composite kill' };
  }
  if (g('HPS') !== 'KILL' && g('ACS') !== 'KILL' && (g('CES') === 'SCALE' || g('VVES') === 'SCALE') && g('EDS') !== 'KILL') {
    return { v: 'SCALE', reason: 'hook+cost ok, ' + (g('CES') === 'SCALE' ? 'CES scale' : 'VVES scale') };
  }
  var blocks = ['HPS', 'ACS', 'CES', 'VVES', 'EDS'].filter(function (k) { return g(k) === 'KILL'; });
  return { v: 'WATCH', reason: blocks.length ? 'watch(' + blocks.join(',') + ' kill)' : 'watch: no scale signal' };
}

function finishOverall(o) {
  var t = overallOf(o.f);
  o.overall = t.v; o.reason = t.reason;
  // legacy aliases used by renderers
  o.erri = o.vals.ERRI || 0; o.hps = o.vals.HPS || 0; o.acs = o.vals.ACS != null ? o.vals.ACS : 999;
  o.ces = o.vals.CES || 0; o.eds = o.vals.EDS || 0; o.vves = o.vals.VVES || 0;
  o.rvs = o.vals.RVS || 0; o.hrq = o.vals.HRQ || 0; o.res = o.vals.RES || 0;
  o.lqs = o.vals.LQS || 0; o.bc = o.vals.BCE || 0;
  return o;
}

function score(r) {
  if (REG) return registryScore(r);
  var B = BANDS[bandKey()] || BANDS.v3;
  return legacyScore(r, B);
}

function rowsOfWorkbook(wb) {
  var ws = wb.Sheets[wb.SheetNames[0]];
  var aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  if (!aoa.length) return [];
  var hi = -1;
  for (var i = 0; i < Math.min(aoa.length, 10); i++) {
    if (aoa[i] && aoa[i].indexOf('Ad group name') !== -1) { hi = i; break; }
  }
  if (hi === -1) hi = 0;
  var hdr = aoa[hi].map(function (h) { return String(h == null ? '' : h).trim(); });
  function col(name) { return hdr.indexOf(name); }
  var out = [];
  for (var r = hi + 1; r < aoa.length; r++) {
    var row = aoa[r]; if (!row) continue;
    var name = String(row[col('Ad group name')] == null ? '' : row[col('Ad group name')]).trim();
    if (!name || /^total of/i.test(name)) continue;
    function g(n) { var j = col(n); return j === -1 ? 0 : num(row[j]); }
    out.push({ name: name, spend: g('Spend'), imp: g('Impressions'), reach: g('Reach'),
      sfv: g('6-second focused views'), prof: g('Paid profile visits'), likes: g('Paid likes'),
      sh: g('Paid shares'), com: g('Paid comments'), fol: g('Paid follows'),
      awt: g('Average play time per video view'), live: g('LIVE views'), live10: g('10-second LIVE views') });
  }
  return out;
}

function rescore() {
  state.rows.forEach(function (r) { r.s = score(r); });
  render();
}

function filtered() {
  var vf = document.getElementById('vVerdict').value;
  var q = document.getElementById('vSearch').value.trim().toLowerCase();
  return state.rows.filter(function (r) {
    if (vf && r.s.overall !== vf) return false;
    if (q && r.name.toLowerCase().indexOf(q) === -1) return false;
    return true;
  });
}

function killOrder() {
  var w = { KILL: 0, WATCH: 1, SCALE: 2 };
  return state.rows.slice().filter(function (r) { return r.s.overall !== 'SCALE'; })
    .sort(function (a, b) {
      return (w[a.s.overall] - w[b.s.overall]) || (a.s.ces - b.s.ces) || (b.s.acs - a.s.acs);
    });
}

// ---- presets: manifest + per-preset registry ----
function presetFile(entry) {
  return entry.file.indexOf('/') === -1 ? 'presets/' + entry.file : entry.file;
}

function loadPresets() {
  fetch('presets/index.json').then(function (res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }).then(function (mani) {
    PRESETS = mani.presets || [];
    buildPresetSelect(mani.default);
    loadPreset(mani.default || (PRESETS[0] && PRESETS[0].id));
  }).catch(function () {
    // Fallback: legacy single metrics.json (dual v2/v3 schema).
    PRESETS = [{ id: 'default', file: 'metrics.json', label: 'Default (metrics.json)' }];
    buildPresetSelect('default');
    loadPreset('default', true);
  });
}

function buildPresetSelect(defId) {
  var sel = document.getElementById('vPreset');
  if (!sel) return;
  sel.innerHTML = '';
  PRESETS.forEach(function (p) {
    var o = document.createElement('option');
    o.value = p.id; o.textContent = p.label || p.id;
    sel.appendChild(o);
  });
  if (defId) sel.value = defId;
}

function loadPreset(id, isRoot) {
  PRESET_ID = id;
  var entry = null;
  PRESETS.forEach(function (p) { if (p.id === id) entry = p; });
  if (!entry) return;
  var url = isRoot ? entry.file : presetFile(entry);
  fetch(url).then(function (res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }).then(function (j) {
    REG = j;
    if (!REG.preset) REG.preset = id;
    applyOverrides();
    buildMetricsPanel();
    syncBandToggle();
    rescore();
  }).catch(function () {
    REG = null;
    var el = document.getElementById('regStatus');
    if (el) el.textContent = 'Preset ' + id + ' failed to load — legacy 11-metric fallback. Serve via python server.py.';
    rescore();
  });
}

function syncBandToggle() {
  // Band switch only applies to dual-schema registries (legacy metrics.json).
  var dual = REG && REG.metrics.some(function (m) { return !!m.bands; });
  var sel = document.getElementById('vBands');
  if (sel) sel.disabled = !dual;
}

function loadRegistry() { loadPresets(); }

function getOverrides() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
  catch (e) { return {}; }
}

function applyOverrides() {
  var all = getOverrides();
  var ov = all[PRESET_ID];
  if (!REG || !ov) return;
  REG.metrics.forEach(function (m) {
    var o = (ov.metrics || {})[m.id];
    if (o) {
      if (typeof o.enabled === 'boolean') m.enabled = o.enabled;
      var v = defView(m);
      if (m.band) {
        if (isFinite(o.k)) m.band.k = o.k;
        if (isFinite(o.s)) m.band.s = o.s;
      } else if (m.bands) {
        var key = bandKey();
        if (m.bands[key]) {
          if (isFinite(o.k)) m.bands[key].k = o.k;
          if (isFinite(o.s)) m.bands[key].s = o.s;
        }
      }
      void v;
    }
  });
  (ov.added || []).forEach(function (a) {
    if (!REG.metrics.some(function (m) { return m.id === a.id; })) REG.metrics.push(a);
  });
}

function saveOverrides() {
  try {
    var all = getOverrides();
    var ov = { metrics: {}, added: [] };
    REG.metrics.forEach(function (m) {
      var en = document.getElementById('en_' + m.id);
      var kb = document.getElementById('bk_' + m.id), sb = document.getElementById('bs_' + m.id);
      var e = { enabled: en ? en.checked : m.enabled !== false };
      var nk = kb ? parseFloat(kb.value) : NaN, ns = sb ? parseFloat(sb.value) : NaN;
      if (isFinite(nk)) e.k = nk;
      if (isFinite(ns)) e.s = ns;
      ov.metrics[m.id] = e;
    });
    all[PRESET_ID] = ov;
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch (e) {}
}

function buildMetricsPanel() {
  var wrap = document.getElementById('regList');
  if (!wrap || !REG) return;
  wrap.innerHTML = '';
  REG.metrics.forEach(function (m) {
    var v = defView(m);
    var b = { k: v.k, s: v.s };
    var div = document.createElement('div');
    div.className = 'flex flex-wrap items-center gap-2 text-sm';
    div.innerHTML =
      '<label class="flex items-center gap-1"><input type="checkbox" id="en_' + m.id + '"' + (m.enabled !== false ? ' checked' : '') + '> <strong>' + esc(m.short) + '</strong></label>' +
      '<span class="text-gray-500">' + esc(m.name) + '</span>' +
      '<label>K <input id="bk_' + m.id + '" type="number" step="any" value="' + b.k + '" class="filter-input" style="width:90px"></label>' +
      '<label>S <input id="bs_' + m.id + '" type="number" step="any" value="' + b.s + '" class="filter-input" style="width:90px"></label>' +
      '<span class="text-xs text-gray-400">' + esc(m.format) + (m.invert ? ' · inv' : '') + '</span>';
    wrap.appendChild(div);
  });
  var st = document.getElementById('regStatus');
  if (st) st.textContent = 'Preset: ' + (REG.label || REG.preset) + ' · ' + REG.metrics.length + ' metrics. Untick to remove from table/OVERALL/CSV. New preset = new JSON in presets/ + one manifest line.';
}

function render() {
  var view = document.getElementById('vView').value;
  var rows = state.rows;
  var tot = rows.reduce(function (a, r) { return a + r.spend; }, 0);
  var c = { KILL: 0, WATCH: 0, SCALE: 0 };
  rows.forEach(function (r) { if (r.s) c[r.s.overall]++; });
  var pct = parseFloat(document.getElementById('vCut').value) || 50;
  var target = tot * pct / 100, cum = 0, n = 0;
  var ord = killOrder();
  for (var i = 0; i < ord.length; i++) { cum += ord[i].spend; n++; if (cum >= target) break; }
  document.getElementById('kRows').textContent = rows.length || '–';
  document.getElementById('kSpend').textContent = rows.length ? tot.toFixed(2) : '–';
  document.getElementById('kKill').textContent = rows.length ? c.KILL : '–';
  document.getElementById('kWatch').textContent = rows.length ? c.WATCH : '–';
  document.getElementById('kScale').textContent = rows.length ? c.SCALE : '–';
  document.getElementById('kCut').textContent = rows.length ? target.toFixed(2) : '–';
  document.getElementById('kCutN').textContent = rows.length ? n : '–';
  document.getElementById('fileMeta').textContent = state.fileName ?
    state.fileName + ' · ' + rows.length + ' ad groups · bands ' + bandKey() + (REG ? ' · reg ' + REG.metrics.filter(function (m) { return m.enabled !== false; }).length + '/' + REG.metrics.length : ' · legacy') : '';

  var head = document.getElementById('mainHead'), body = document.querySelector('#mainTable tbody');
  head.innerHTML = ''; body.innerHTML = '';
  if (!rows.length) { body.innerHTML = '<tr><td class="empty-note">Load a file to score.</td></tr>'; return; }

  function th(t) { var e = document.createElement('th'); e.textContent = t; head.appendChild(e); }
  function td(tr, h) { var e = document.createElement('td'); e.innerHTML = h; tr.appendChild(e); }
  function f2(v) { return (Math.round(v * 100) / 100).toFixed(2); }
  var shorts = REG ? REG.metrics.filter(function (m) { return m.enabled !== false; }).map(function (m) { return m.short; })
    : ['ERRI', 'HPS', 'ACS', 'CES', 'EDS', 'VVES', 'RVS', 'HRQ', 'RES', 'LQS', 'BCE'];

  if (view === 'raw') {
    document.getElementById('tblTitle').textContent = 'Raw (test columns)';
    RAW_COLS.forEach(th);
    filtered().slice(0, 200).forEach(function (r) {
      var tr = document.createElement('tr');
      [r.name, r.spend, r.imp, r.reach, r.sfv, r.prof, r.likes, r.sh, r.com, r.fol, r.awt, r.live, r.live10]
        .forEach(function (v) { td(tr, String(v)); });
      body.appendChild(tr);
    });
  } else if (view === 'kill') {
    document.getElementById('tblTitle').textContent = 'Kill list (' + pct + '% cut)';
    ['#', 'Batch', 'Spend', 'Cum', 'Verdict', 'CES', 'ACS', 'Reason'].forEach(th);
    cum = 0; var list = killOrder();
    var show = list.filter(function (r) {
      var vf = document.getElementById('vVerdict').value;
      return !vf || r.s.overall === vf;
    });
    document.getElementById('rowCount').textContent = 'kill ' + Math.min(show.length, n) + ' of ' + show.length + ' to save ' + target.toFixed(2);
    show.slice(0, 200).forEach(function (r, i) {
      cum += r.spend;
      if (i >= n) return;
      var tr = document.createElement('tr');
      td(tr, String(i + 1));
      td(tr, esc(String(r.name).split('|').pop().trim()));
      td(tr, r.spend.toFixed(2)); td(tr, cum.toFixed(0));
      td(tr, flagChip(r.s.overall)); td(tr, f2(r.s.ces)); td(tr, r.s.acs.toFixed(4)); td(tr, esc(String(r.s.reason)));
      body.appendChild(tr);
    });
  } else {
    document.getElementById('tblTitle').textContent = 'Scored (' + shorts.length + ' metrics)';
    ['Batch', 'Spend', 'OVERALL', 'Reason'].concat(shorts).forEach(th);
    var frows = filtered();
    document.getElementById('rowCount').textContent = frows.length + ' rows';
    frows.slice(0, 200).forEach(function (r) {
      var tr = document.createElement('tr');
      td(tr, esc(String(r.name).split('|').pop().trim()));
      td(tr, r.spend.toFixed(2));
      td(tr, flagChip(r.s.overall)); td(tr, esc(String(r.s.reason)));
      shorts.forEach(function (sh) {
        var v = r.s.vals[sh], f = r.s.f[sh];
        var txt = (v == null || !isFinite(v)) ? '–' : (sh === 'ACS' ? v.toFixed(4) : f2(v));
        td(tr, txt + (f ? ' ' + flagChip(f) : ''));
      });
      body.appendChild(tr);
    });
  }
}

function loadFile(file) {
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var wb = XLSX.read(e.target.result, { type: 'array' });
      state.rows = rowsOfWorkbook(wb);
      state.fileName = file.name || 'upload';
      document.getElementById('loadStatus').textContent = 'Loaded ' + state.rows.length + ' ad groups.';
      rescore();
    } catch (err) { document.getElementById('loadStatus').textContent = 'Read failed: ' + err.message; }
  };
  reader.readAsArrayBuffer(file);
}

function toCsv(rows) {
  var shorts = REG ? REG.metrics.filter(function (m) { return m.enabled !== false; }).map(function (m) { return m.short; })
    : ['ERRI', 'HPS', 'ACS', 'CES', 'EDS', 'VVES', 'RVS', 'HRQ', 'RES', 'LQS', 'BCE'];
  var lines = [['batch', 'spend', 'overall', 'reason'].concat(shorts.map(function (s) { return s.toLowerCase(); })).join(',')];
  rows.forEach(function (r) {
    lines.push([JSON.stringify(r.name), r.spend, r.s.overall, JSON.stringify(r.s.reason)].concat(shorts.map(function (s) {
      var v = r.s.vals[s];
      return (v == null || !isFinite(v)) ? '' : (s === 'ACS' ? v.toFixed(4) : (Math.round(v * 100) / 100).toFixed(2));
    })).join(','));
  });
  return lines.join('\n');
}

document.getElementById('fileInput').addEventListener('change', function (e) {
  if (e.target.files[0]) loadFile(e.target.files[0]);
});
document.getElementById('loadBundled').addEventListener('click', function () {
  var url = 'source-file/GMV MAX VOL2-Campaign Report-2026-10-01 to 2026-10-05 (1) TEST COLUMN.xlsx';
  document.getElementById('loadStatus').textContent = 'Loading bundled file…';
  fetch(url).then(function (res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.arrayBuffer();
  }).then(function (buf) {
    var wb = XLSX.read(buf, { type: 'array' });
    state.rows = rowsOfWorkbook(wb);
    state.fileName = 'TEST COLUMN (bundled)';
    document.getElementById('loadStatus').textContent = 'Loaded ' + state.rows.length + ' ad groups.';
    rescore();
  }).catch(function (err) {
    document.getElementById('loadStatus').textContent = 'Bundled load failed (' + err.message + ') — use upload instead. Serve via python server.py, not file://.';
  });
});
document.getElementById('clearFiles').addEventListener('click', function () {
  state.rows = []; state.fileName = '';
  document.getElementById('loadStatus').textContent = 'No file loaded.';
  document.getElementById('fileInput').value = ''; render();
});
['vView', 'vVerdict', 'vCut'].forEach(function (id) {
  document.getElementById(id).addEventListener('change', render);
});
document.getElementById('vPreset').addEventListener('change', function () {
  if (!REG) return;
  saveOverrides();
  loadPreset(document.getElementById('vPreset').value);
});
document.getElementById('vBands').addEventListener('change', function () {
  if (REG) buildMetricsPanel();
  rescore();
});
document.getElementById('vSearch').addEventListener('input', render);
document.getElementById('expCsv').addEventListener('click', function () {
  if (!state.rows.length) return;
  var blob = new Blob([toCsv(filtered())], { type: 'text/csv' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'metric-scored.csv'; a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
});
document.getElementById('regSave').addEventListener('click', function () {
  if (!REG) return;
  REG.metrics.forEach(function (m) {
    var en = document.getElementById('en_' + m.id);
    if (en) m.enabled = en.checked;
    var key = bandKey();
    var kb = document.getElementById('bk_' + m.id), sb = document.getElementById('bs_' + m.id);
    if (kb && isFinite(parseFloat(kb.value)) && m.bands && m.bands[key]) m.bands[key].k = parseFloat(kb.value);
    if (sb && isFinite(parseFloat(sb.value)) && m.bands && m.bands[key]) m.bands[key].s = parseFloat(sb.value);
  });
  saveOverrides();
  buildMetricsPanel();
  rescore();
});
document.getElementById('regReset').addEventListener('click', function () {
  try {
    var all = getOverrides();
    delete all[PRESET_ID];
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch (e) {}
  loadPreset(PRESET_ID);
});
document.getElementById('regAdd').addEventListener('click', function () {
  if (!REG) return;
  var name = document.getElementById('na_name').value.trim();
  var sh = document.getElementById('na_short').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  var expr = document.getElementById('na_expr').value.trim();
  var k = parseFloat(document.getElementById('na_k').value), s = parseFloat(document.getElementById('na_s').value);
  var inv = document.getElementById('na_inv').checked;
  var msg = document.getElementById('regAddMsg');
  if (!name || !sh || !expr || !isFinite(k) || !isFinite(s)) { msg.textContent = 'Fill name, SHORT, expression, K, S.'; return; }
  if (REG.metrics.some(function (m) { return m.short === sh; })) { msg.textContent = 'SHORT ' + sh + ' exists.'; return; }
  // validate: evaluate on first row (or zeros), reject unknown identifiers (ReferenceError -> NaN via evalExpr wrapper? test strictly)
  var probe = state.rows.length ? baseCtx(state.rows[0]) : baseCtx({ spend: 1, imp: 1000, reach: 800, sfv: 300, prof: 5, likes: 20, sh: 1, com: 1, fol: 1, awt: 8, live: 1, live10: 1 });
  var t;
  try { t = Function('c', 'with(c){return (' + expr + ')}')(probe); }
  catch (e) { msg.textContent = 'Bad expression: ' + e.message; return; }
  if (typeof t !== 'number' || !isFinite(t)) { msg.textContent = 'Expression must return a finite number.'; return; }
  var id = sh.toLowerCase();
  var bands = { k: k, s: s };
  REG.metrics.push({ id: id, name: name, short: sh, format: 'numeric', inputs: [], expression: expr, invert: inv, enabled: true, params: {}, band: bands });
  try {
    var all = getOverrides();
    var ov = all[PRESET_ID] || { metrics: {}, added: [] };
    ov.added = ov.added || [];
    ov.added.push(REG.metrics[REG.metrics.length - 1]);
    all[PRESET_ID] = ov;
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch (e) {}
  msg.textContent = 'Added ' + sh + '.';
  document.getElementById('na_name').value = ''; document.getElementById('na_short').value = '';
  document.getElementById('na_expr').value = '';
  buildMetricsPanel();
  rescore();
});
document.getElementById('themeToggle').addEventListener('click', function () {
  var el = document.documentElement;
  el.classList.toggle('dark');
  try { localStorage.setItem('marketer-theme', el.classList.contains('dark') ? 'dark' : 'light'); } catch (e) {}
});
var dz = document.getElementById('dropzone');
['dragover', 'dragenter'].forEach(function (ev) {
  dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('drag-over'); });
});
['dragleave', 'drop'].forEach(function (ev) {
  dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('drag-over'); });
});
dz.addEventListener('drop', function (e) {
  if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
});
loadRegistry();
render();
})();
