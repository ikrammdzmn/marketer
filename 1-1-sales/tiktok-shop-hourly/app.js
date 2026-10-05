/* Shop Hourly Report - single vanilla IIFE. No modules, no transpiling.
 * Feed: {API}/api/tiktok/shop-metrics/hourly?date=YYYY-MM-DD&shopNumber=N
 * Auth = owner's logged-in browser session. Nothing secret is stored. */
(function () {
  'use strict';

  var CFG = {
    API_BASE: 'https://temp-marketplace.vercel.app',
    MAX_DAYS: 31,
    GAP_MS: 300,
    TOL: 0.05, // cents tolerance for sums-vs-footer gate
    TZ: 'Asia/Kuala_Lumpur'
  };

  var state = { days: {} }; // date -> {date, shop, rows, totals, ok, msg, asOf}
  var chart = null;
  var busy = false;

  function $(id) { return document.getElementById(id); }

  function mytParts(d) {
    // Returns {date: 'YYYY-MM-DD', hour: 0-23} in Asia/Kuala_Lumpur.
    var fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: CFG.TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false
    });
    var parts = {};
    fmt.formatToParts(d).forEach(function (p) { parts[p.type] = p.value; });
    var h = parseInt(parts.hour, 10) % 24;
    return { date: parts.year + '-' + parts.month + '-' + parts.day, hour: h };
  }

  function datesBetween(a, b) {
    var out = [];
    var d = new Date(a + 'T00:00:00');
    var end = new Date(b + 'T00:00:00');
    if (isNaN(d) || isNaN(end) || d > end) return out;
    while (d <= end && out.length < CFG.MAX_DAYS + 1) {
      out.push(d.toISOString().slice(0, 10));
      d = new Date(d.getTime() + 86400000);
    }
    return out;
  }

  function fmt(n, dp) {
    if (n === null || n === undefined || isNaN(n)) return '';
    return Number(n).toFixed(dp === undefined ? 2 : dp);
  }

  function setBusy(on, msg) {
    busy = on;
    ['fetchSingle', 'fetchRange'].forEach(function (id) { $(id).disabled = on; });
    if (msg !== undefined) $('loadStatus').textContent = msg;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function ingestPayload(p) {
    // Validates + normalises one day payload. Returns day object (ok true/false).
    var date = String(p.date || '');
    var shop = p.shopNumber;
    var hours = p.hourly || [];
    var day = { date: date, shop: shop, rows: [],
      totals: { gmv: +p.totalGMV || 0, orders: +p.totalOrders || 0, spend: +p.totalSpend || 0 },
      ok: false, msg: '', asOf: '' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { day.msg = 'bad date'; return day; }
    if (!Array.isArray(hours) || hours.length !== 24) { day.msg = 'expected 24 hourly rows, got ' + hours.length; return day; }

    var now = mytParts(new Date());
    var isToday = (date === now.date);
    var sg = 0, so = 0, ss = 0;
    day.rows = hours.map(function (h, i) {
      var gmv = +h.gmv || 0, orders = +(h.orders || 0), spend = +h.spend || 0;
      var roas = spend > 0 ? gmv / spend : null;
      var future = isToday && i > now.hour;
      var blank = (gmv === 0 && spend === 0 && orders === 0);
      var status = future ? 'missing' : (blank ? 'zero' : 'real');
      if (status !== 'missing') { sg += gmv; so += orders; ss += spend; }
      return { hour: h.hour || ('0' + i).slice(-2) + ':00', gmv: gmv, orders: orders,
        spend: spend, roas: roas, status: status };
    });
    day.asOf = isToday ? ('today ' + now.date + ' ~' + ('0' + now.hour).slice(-2) + ':00 MYT') : 'full day';

    // Gate: non-missing sums must tie to the footer within cents.
    var dg = Math.abs(sg - day.totals.gmv);
    var ds = Math.abs(ss - day.totals.spend);
    if (dg > CFG.TOL || ds > CFG.TOL || Math.round(so) !== Math.round(day.totals.orders)) {
      day.ok = false;
      day.msg = 'sums differ (gmv ' + fmt(dg) + ', spend ' + fmt(ds) + ', orders ' + so + ')';
      return day;
    }
    // Totals ROAS for the strip (never averaged from hours).
    day.totals.roas = day.totals.spend > 0 ? day.totals.gmv / day.totals.spend : null;
    day.ok = true;
    day.msg = 'ok';
    return day;
  }

  function fetchDay(date, shop) {
    var url = CFG.API_BASE + '/api/tiktok/shop-metrics/hourly?date=' + encodeURIComponent(date) +
      '&shopNumber=' + encodeURIComponent(shop);
    return fetch(url, { credentials: 'include' }).then(function (r) {
      if (r.status === 401 || r.status === 403) throw new Error('login expired (HTTP ' + r.status + ') - log in again in another tab, then retry');
      if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + date);
      return r.json();
    }).then(function (p) {
      var day = ingestPayload(p);
      if (!day.ok) throw new Error(date + ': ' + day.msg);
      return day;
    });
  }

  function sleep(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

  function runDates(dates, shop) {
    if (busy) return;
    if (!dates.length) { setBusy(false, 'Pick a day or a valid range.'); return; }
    if (dates.length > CFG.MAX_DAYS) { setBusy(false, 'Range capped at ' + CFG.MAX_DAYS + ' days/run.'); return; }
    setBusy(true, 'Fetching 0/' + dates.length + ' ...');
    var seq = Promise.resolve();
    var done = 0, failed = [];
    dates.forEach(function (date) {
      seq = seq.then(function () {
        return fetchDay(date, shop).then(function (day) {
          state.days[day.date] = day; // overwrite = dedup
        }).catch(function (err) {
          failed.push(err.message);
        }).then(function () {
          done++;
          setBusy(true, 'Fetching ' + done + '/' + dates.length + ' ...');
          render();
          return sleep(CFG.GAP_MS);
        });
      });
    });
    seq.then(function () {
      var keys = Object.keys(state.days).sort();
      var msg = keys.length + ' day(s) loaded' + (failed.length ? ' - FAILED: ' + failed.join('; ') : '');
      setBusy(false, msg);
      render();
    });
  }

  function sortedDays() {
    return Object.keys(state.days).sort().map(function (k) { return state.days[k]; });
  }

  function render() {
    var days = sortedDays();
    // Day badges.
    $('dayList').innerHTML = days.length ? days.map(function (d) {
      return '<span class="badge ' + (d.ok ? 'badge-ok' : 'badge-bad') + '">' +
        esc(d.date) + ' - ' + (d.ok ? 'ok' : esc(d.msg)) + '</span>';
    }).join(' ') : '';
    // Totals strip.
    $('sumBody').innerHTML = days.length ? days.map(function (d) {
      return '<tr><td class="py-1 pr-3">' + esc(d.date) + '</td><td class="py-1 pr-3">' + fmt(d.totals.gmv) +
        '</td><td class="py-1 pr-3">' + d.totals.orders + '</td><td class="py-1 pr-3">' + fmt(d.totals.spend) +
        '</td><td class="py-1 pr-3">' + fmt(d.totals.roas) + '</td>' +
        '<td class="py-1 pr-3"><span class="badge ' + (d.ok ? 'badge-ok' : 'badge-bad') + '">' + (d.ok ? (d.msg === 'ok' ? 'tied' : 'csv') : 'check') + '</span></td>' +
        '<td class="py-1 pr-3 text-gray-500">' + esc(d.asOf) + '</td></tr>';
    }).join('') : '<tr><td class="py-1 text-gray-400">-</td></tr>';
    // Hourly rows.
    var showMissing = $('showMissing').checked;
    var html = '';
    days.forEach(function (d) {
      d.rows.forEach(function (r) {
        if (r.status === 'missing' && !showMissing) return;
        var cls = r.status === 'missing' ? 'row-missing' : (r.status === 'zero' ? 'row-zero' : '');
        html += '<tr class="' + cls + '"><td class="py-1 pr-3">' + esc(d.date) + '</td><td class="py-1 pr-3">' + esc(r.hour) +
          '</td><td class="py-1 pr-3">' + fmt(r.gmv) + '</td><td class="py-1 pr-3">' + r.orders +
          '</td><td class="py-1 pr-3">' + fmt(r.spend) + '</td><td class="py-1 pr-3">' + fmt(r.roas) +
          '</td><td class="py-1 pr-3 text-gray-500">' + r.status + '</td></tr>';
      });
    });
    $('hourBody').innerHTML = html || '<tr><td class="py-1 text-gray-400">-</td></tr>';
    $('exportCsv').disabled = !days.length;
    renderChart(days);
    renderScore(days);
  }

  function renderChart(days) {
    if (typeof Chart === 'undefined') return;
    var labels = [], gmv = [], spend = [], roas = [];
    days.forEach(function (d) {
      d.rows.forEach(function (r) {
        labels.push(d.date.slice(5) + ' ' + r.hour);
        var miss = (r.status === 'missing');
        gmv.push(miss ? null : r.gmv);
        spend.push(miss ? null : r.spend);
        roas.push(miss ? null : r.roas);
      });
    });
    if (chart) { chart.destroy(); chart = null; }
    if (!labels.length) return;
    var dark = document.documentElement.classList.contains('dark');
    var grid = dark ? '#374151' : '#e5e7eb';
    chart = new Chart($('trendChart'), {
      data: { labels: labels, datasets: [
        { type: 'bar', label: 'GMV (RM)', data: gmv, backgroundColor: '#6366f1', yAxisID: 'y' },
        { type: 'line', label: 'Spend (RM)', data: spend, borderColor: '#c084fc', tension: 0.3, spanGaps: true, yAxisID: 'y' },
        { type: 'line', label: 'ROAS (x)', data: roas, borderColor: '#22c55e', tension: 0.3, spanGaps: true, yAxisID: 'y1' }
      ]},
      options: { responsive: true,
        scales: { x: { grid: { color: grid } },
          y: { grid: { color: grid } },
          y1: { position: 'right', grid: { drawOnChartArea: false } } } }
    });
  }

  function renderScore(days) {
    // Hour scorecard: aggregate non-missing rows across loaded days.
    // Tags: DEAD = <2 orders/day; GOLDEN = top-5 avg GMV; WATCH = CPA >RM50.
    var agg = {};
    days.forEach(function (d) {
      d.rows.forEach(function (r) {
        if (r.status === 'missing') return;
        var a = agg[r.hour] || (agg[r.hour] = { g: 0, o: 0, s: 0, n: 0 });
        a.g += r.gmv; a.o += r.orders; a.s += r.spend; a.n++;
      });
    });
    var hours = Object.keys(agg).sort();
    if (!hours.length) {
      $('scoreBody').innerHTML = '<tr><td class="py-1 text-gray-400">-</td></tr>';
      $('exportScore').disabled = true;
      return;
    }
    var rows = hours.map(function (h) {
      var a = agg[h];
      return { hour: h, n: a.n, avgG: a.g / a.n, avgO: a.o / a.n,
        roas: a.s > 0 ? a.g / a.s : null, cpa: a.o > 0 ? a.s / a.o : null };
    });
    var golden = {};
    rows.slice().sort(function (x, y) { return y.avgG - x.avgG; }).slice(0, 5)
      .forEach(function (r) { golden[r.hour] = true; });
    rows.sort(function (x, y) { return x.hour < y.hour ? -1 : 1; });
    $('scoreBody').innerHTML = rows.map(function (r) {
      var tag = r.avgO < 2 ? 'DEAD' : (golden[r.hour] ? 'GOLDEN' : ((r.cpa !== null && r.cpa > 50) ? 'WATCH' : '-'));
      var cls = tag === 'DEAD' ? 'row-zero' : '';
      return '<tr class="' + cls + '"><td class="py-1 pr-3">' + esc(r.hour) + '</td><td class="py-1 pr-3">' + r.n +
        '</td><td class="py-1 pr-3">' + fmt(r.avgG, 0) + '</td><td class="py-1 pr-3">' + r.avgO.toFixed(1) +
        '</td><td class="py-1 pr-3">' + fmt(r.roas) + '</td><td class="py-1 pr-3">' + fmt(r.cpa) +
        '</td><td class="py-1 pr-3">' + tag + '</td></tr>';
    }).join('');
    $('exportScore').disabled = false;
    $('exportScore').onclick = function () {
      var lines = ['hour,days,avg_gmv,avg_orders,roas,cpa,tag'];
      rows.forEach(function (r) {
        var tag = r.avgO < 2 ? 'DEAD' : (golden[r.hour] ? 'GOLDEN' : ((r.cpa !== null && r.cpa > 50) ? 'WATCH' : ''));
        lines.push([r.hour, r.n, r.avgG.toFixed(0), r.avgO.toFixed(1),
          (r.roas === null ? '' : r.roas.toFixed(4)),
          (r.cpa === null ? '' : r.cpa.toFixed(2)), tag].join(','));
      });
      var blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      var ds = sortedDays();
      a.download = 'shop' + ds[0].shop + '-scorecard_' + ds[0].date + '_' + ds[ds.length - 1].date + '.csv';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    };
  }

  function toCsv(days) {
    var lines = ['date,hour,gmv,orders,spend,roas_recomputed,status'];
    days.forEach(function (d) {
      d.rows.forEach(function (r) {
        lines.push([d.date, r.hour, r.gmv.toFixed(2), r.orders, r.spend.toFixed(2),
          (r.roas === null ? '' : r.roas.toFixed(4)), r.status].join(','));
      });
    });
    return lines.join('\n') + '\n';
  }

  function exportCsv() {
    var days = sortedDays();
    if (!days.length) return;
    var blob = new Blob([toCsv(days)], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'shop' + days[0].shop + '-hourly_' + days[0].date + '_' + days[days.length - 1].date + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function dayFromCsvRows(date, shop, list) {
    // Rebuilds a day from exported CSV rows (no API footer: totals = sums of
    // non-missing rows, flagged as csv so the gate difference is visible).
    var day = { date: date, shop: shop, rows: [],
      totals: { gmv: 0, orders: 0, spend: 0 }, ok: true, msg: 'csv (sums as totals)', asOf: 'csv file' };
    var now = mytParts(new Date());
    if (date === now.date) day.asOf = 'csv file (today: tail may be missing)';
    list.sort(function (a, b) { return a.hour < b.hour ? -1 : 1; }).forEach(function (r) {
      var gmv = +r.gmv || 0, orders = +(r.orders || 0), spend = +r.spend || 0;
      var status = r.status;
      if (status !== 'real' && status !== 'zero' && status !== 'missing') {
        status = (gmv === 0 && spend === 0 && orders === 0) ? 'zero' : 'real';
      }
      if (status !== 'missing') { day.totals.gmv += gmv; day.totals.orders += orders; day.totals.spend += spend; }
      day.rows.push({ hour: r.hour, gmv: gmv, orders: orders, spend: spend,
        roas: spend > 0 ? gmv / spend : null, status: status });
    });
    day.totals.roas = day.totals.spend > 0 ? day.totals.gmv / day.totals.spend : null;
    return day;
  }

  function loadDataFiles(files) {
    if (!files.length) return;
    Array.prototype.forEach.call(files, function (f) {
      var rd = new FileReader();
      var isCsv = /\.csv$/i.test(f.name);
      rd.onload = function () {
        try {
          if (isCsv) {
            var lines = String(rd.result).split(/\r?\n/).filter(function (l) { return l.trim() !== ''; });
            var head = (lines.shift() || '').split(',');
            var need = ['date', 'hour', 'gmv', 'orders', 'spend', 'status'];
            var missing = need.filter(function (c) { return head.indexOf(c) < 0; });
            if (missing.length) throw new Error('missing columns: ' + missing.join(','));
            var byDate = {};
            lines.forEach(function (l) {
              var c = l.split(',');
              var o = {};
              head.forEach(function (h, i) { o[h] = (c[i] || '').trim(); });
              if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date)) return;
              (byDate[o.date] || (byDate[o.date] = [])).push(o);
            });
            var keys = Object.keys(byDate).sort();
            if (!keys.length) throw new Error('no data rows');
            keys.forEach(function (k) {
              var day = dayFromCsvRows(k, $('shopNum').value || 1, byDate[k]);
              state.days[k] = day; // overwrite = dedup
            });
          } else {
            var day = ingestPayload(JSON.parse(rd.result));
            if (!day.ok) throw new Error(day.msg);
            state.days[day.date] = day;
          }
          render();
          $('loadStatus').textContent = Object.keys(state.days).sort().length + ' day(s) loaded.';
        } catch (e) { $('loadStatus').textContent = f.name + ': ' + e.message; }
      };
      rd.readAsText(f);
    });
  }

  // Wire up.
  $('fetchSingle').addEventListener('click', function () {
    runDates($('daySingle').value ? [$('daySingle').value] : [], $('shopNum').value || 1);
  });
  $('fetchRange').addEventListener('click', function () {
    runDates(datesBetween($('rangeFrom').value, $('rangeTo').value), $('shopNum').value || 1);
  });
  $('clearDays').addEventListener('click', function () {
    state.days = {};
    if (chart) { chart.destroy(); chart = null; }
    setBusy(false, 'Cleared.');
    render();
  });
  $('jsonFiles').addEventListener('change', function (e) { loadDataFiles(e.target.files); e.target.value = ''; });
  $('showMissing').addEventListener('change', render);
  $('exportCsv').addEventListener('click', exportCsv);
  $('themeToggle').addEventListener('click', function () {
    try {
      var el = document.documentElement;
      var dark = el.classList.toggle('dark');
      localStorage.setItem('marketer-theme', dark ? 'dark' : 'light');
      renderChart(sortedDays());
    } catch (e) {}
  });
  render();
})();
