// ==UserScript==
// @name         Shop Hourly Fetch (same-origin, local-only)
// @namespace    marketer.tiktok-shop-hourly
// @version      1.0
// @description  Fetch shop hourly day-by-day on the marketplace site itself (same origin, your login session), validate, download combined CSV.
// @author       you
// @match        https://temp-marketplace.vercel.app/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  var API = '/api/tiktok/shop-metrics/hourly';
  var MAX_DAYS = 31;
  var TOL = 0.05;
  var GAP_MS = 300;
  var TZ = 'Asia/Kuala_Lumpur';

  // ---------- helpers ----------
  function $(t) { return document.createElement(t); }

  function mytNow() {
    var fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false });
    var p = {};
    fmt.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { date: p.year + '-' + p.month + '-' + p.day, hour: parseInt(p.hour, 10) % 24 };
  }

  function datesBetween(a, b) {
    var out = [];
    var d = new Date(a + 'T00:00:00'), end = new Date(b + 'T00:00:00');
    if (isNaN(d) || isNaN(end) || d > end) return out;
    while (d <= end && out.length < MAX_DAYS) {
      out.push(d.toISOString().slice(0, 10));
      d = new Date(d.getTime() + 86400000);
    }
    return out;
  }

  function ingest(p) {
    var date = String(p.date || '');
    var hours = p.hourly || [];
    var day = { date: date, shop: p.shopNumber, rows: [],
      totals: { gmv: +p.totalGMV || 0, orders: +p.totalOrders || 0, spend: +p.totalSpend || 0 },
      ok: false, msg: '' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { day.msg = 'bad date'; return day; }
    if (!Array.isArray(hours) || hours.length !== 24) { day.msg = 'expected 24 rows, got ' + hours.length; return day; }
    var now = mytNow(), isToday = (date === now.date);
    var sg = 0, so = 0, ss = 0;
    day.rows = hours.map(function (h, i) {
      var gmv = +h.gmv || 0, orders = +(h.orders || 0), spend = +h.spend || 0;
      var future = isToday && i > now.hour;
      var blank = (gmv === 0 && spend === 0 && orders === 0);
      var status = future ? 'missing' : (blank ? 'zero' : 'real');
      if (status !== 'missing') { sg += gmv; so += orders; ss += spend; }
      return { hour: h.hour || ('0' + i).slice(-2) + ':00', gmv: gmv, orders: orders,
        spend: spend, roas: spend > 0 ? gmv / spend : null, status: status };
    });
    if (Math.abs(sg - day.totals.gmv) > TOL || Math.abs(ss - day.totals.spend) > TOL ||
        Math.round(so) !== Math.round(day.totals.orders)) {
      day.msg = 'sums differ from footer';
      return day;
    }
    day.ok = true;
    day.msg = 'ok';
    return day;
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

  // ---------- panel ----------
  var box = $('div');
  box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:999999;font-family:Arial,sans-serif;font-size:12px;background:#fff;color:#202124;border:1px solid #dadce0;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.3);width:230px;user-select:none;';
  var head = $('div');
  head.textContent = 'Shop Hourly Fetch (drag me)';
  head.style.cssText = 'cursor:move;padding:6px 8px;background:#f1f3f4;font-weight:bold;border-radius:8px 8px 0 0;';
  var body = $('div');
  body.style.cssText = 'padding:8px;display:flex;flex-direction:column;gap:6px;';
  function row(label, el) {
    var w = $('label'); w.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:6px;';
    var s = $('span'); s.textContent = label; w.appendChild(s); w.appendChild(el); body.appendChild(w); return el;
  }
  function inp(val, type) {
    var i = $('input'); i.type = type || 'text'; i.value = val;
    i.style.cssText = 'width:110px;padding:3px 5px;border:1px solid #dadce0;border-radius:4px;'; return i;
  }
  var shopI = row('Shop #', inp('1', 'number'));
  var fromI = row('From', inp('', 'date'));
  var toI = row('To', inp('', 'date'));
  var goB = $('button'); goB.textContent = 'Fetch + CSV';
  goB.style.cssText = 'cursor:pointer;border:none;border-radius:4px;background:#1a73e8;color:#fff;font-weight:bold;padding:6px;';
  body.appendChild(goB);
  var st = $('div'); st.textContent = 'idle'; st.style.cssText = 'color:#5f6368;min-height:14px;';
  body.appendChild(st);
  box.appendChild(head); box.appendChild(body);
  document.documentElement.appendChild(box);

  var drag = null;
  head.addEventListener('mousedown', function (e) {
    var r = box.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    e.preventDefault();
  });
  document.addEventListener('mousemove', function (e) {
    if (!drag) return;
    box.style.left = Math.max(0, Math.min(window.innerWidth - 60, e.clientX - drag.dx)) + 'px';
    box.style.top = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - drag.dy)) + 'px';
    box.style.right = 'auto'; box.style.bottom = 'auto';
  });
  document.addEventListener('mouseup', function () { drag = null; });

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  goB.addEventListener('click', function () {
    var shop = shopI.value || 1;
    var dates = (fromI.value && toI.value) ? datesBetween(fromI.value, toI.value)
      : (fromI.value ? [fromI.value] : []);
    if (!dates.length) { st.textContent = 'pick From (+To for range)'; return; }
    goB.disabled = true;
    var kept = [], failed = [], i = 0;
    var seq = Promise.resolve();
    dates.forEach(function (date) {
      seq = seq.then(function () {
        st.textContent = 'fetching ' + (i + 1) + '/' + dates.length + ' (' + date + ')';
        return fetch(API + '?date=' + encodeURIComponent(date) + '&shopNumber=' + encodeURIComponent(shop),
          { credentials: 'same-origin' })
          .then(function (r) {
            if (!r.ok) throw new Error(date + ': HTTP ' + r.status);
            return r.json();
          })
          .then(function (p) {
            var d = ingest(p);
            if (!d.ok) throw new Error(date + ': ' + d.msg);
            kept.push(d);
          })
          .catch(function (e) { failed.push(e.message); })
          .then(function () { i++; return sleep(GAP_MS); });
      });
    });
    seq.then(function () {
      goB.disabled = false;
      if (!kept.length) { st.textContent = 'FAILED: ' + failed.join('; '); return; }
      kept.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      var blob = new Blob([toCsv(kept)], { type: 'text/csv' });
      var a = $('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'shop' + shop + '-hourly_' + kept[0].date + '_' + kept[kept.length - 1].date + '.csv';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      st.textContent = kept.length + ' day(s) saved' + (failed.length ? ' - failed: ' + failed.join('; ') : '');
    });
  });
})();
