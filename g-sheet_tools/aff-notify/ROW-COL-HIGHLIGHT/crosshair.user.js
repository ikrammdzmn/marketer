// ==UserScript==
// @name         Affiliate Collection Crosshair (instant, local-only)
// @namespace    marketer.g-sheet_tools
// @version      1.1
// @description  Instant mouse crosshair lines on Google Sheets. Draggable ON/OFF pill. Lines only; cell paint stays in code.gs.
// @author       you
// @match        https://docs.google.com/spreadsheets/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  var TAB_NAME = 'Affiliate Collection'; // trimmed compare; trailing space tolerated
  var COLOR = 'rgba(255, 255, 0, 0.45)';
  var LINE_PX = 8;
  var ENABLE_KEY = 'affCrosshairEnabled';
  var POS_KEY = 'affCrosshairPos';

  var enabled = true;
  try {
    enabled = (localStorage.getItem(ENABLE_KEY) !== '0');
  } catch (err) {}

  var hLine = document.createElement('div');
  var vLine = document.createElement('div');

  function styleLine(el, horizontal) {
    el.style.position = 'fixed';
    el.style.zIndex = '999999';
    el.style.pointerEvents = 'none';
    el.style.display = 'none';
    el.style.background = COLOR;
    if (horizontal) {
      el.style.left = '0';
      el.style.right = '0';
      el.style.height = LINE_PX + 'px';
    } else {
      el.style.top = '0';
      el.style.bottom = '0';
      el.style.width = LINE_PX + 'px';
    }
    document.documentElement.appendChild(el);
  }

  styleLine(hLine, true);
  styleLine(vLine, false);

  // Draggable ON/OFF pill.
  var pill = document.createElement('div');
  pill.style.position = 'fixed';
  pill.style.zIndex = '1000000';
  pill.style.display = 'flex';
  pill.style.alignItems = 'stretch';
  pill.style.fontFamily = 'Arial, sans-serif';
  pill.style.fontSize = '12px';
  pill.style.border = '1px solid #dadce0';
  pill.style.borderRadius = '8px';
  pill.style.background = '#ffffff';
  pill.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
  pill.style.overflow = 'hidden';
  pill.style.userSelect = 'none';

  var grip = document.createElement('div');
  grip.textContent = 'Crosshair';
  grip.title = 'Drag me';
  grip.style.cursor = 'move';
  grip.style.padding = '6px 8px';
  grip.style.background = '#f1f3f4';
  grip.style.color = '#202124';

  var btn = document.createElement('button');
  btn.style.cursor = 'pointer';
  btn.style.border = 'none';
  btn.style.padding = '6px 10px';
  btn.style.fontSize = '12px';
  btn.style.fontWeight = 'bold';

  function paintBtn() {
    btn.textContent = enabled ? 'ON' : 'OFF';
    btn.style.background = enabled ? '#188038' : '#9aa0a6';
    btn.style.color = '#ffffff';
  }
  paintBtn();

  pill.appendChild(grip);
  pill.appendChild(btn);
  document.documentElement.appendChild(pill);

  function placePill(x, y) {
    pill.style.left = x + 'px';
    pill.style.top = y + 'px';
    pill.style.right = 'auto';
    pill.style.bottom = 'auto';
  }

  (function restorePos() {
    try {
      var raw = localStorage.getItem(POS_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (typeof p.x === 'number' && typeof p.y === 'number') {
          placePill(p.x, p.y);
          return;
        }
      }
    } catch (err) {}
    pill.style.right = '16px';
    pill.style.bottom = '80px';
    pill.style.left = 'auto';
    pill.style.top = 'auto';
  })();

  btn.addEventListener('click', function () {
    enabled = !enabled;
    try {
      localStorage.setItem(ENABLE_KEY, enabled ? '1' : '0');
    } catch (err) {}
    paintBtn();
    if (!enabled) hide();
  });

  // Drag the pill by its label.
  var drag = null;
  grip.addEventListener('mousedown', function (e) {
    var r = pill.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    e.preventDefault();
  });
  document.addEventListener('mousemove', function (e) {
    if (!drag) return;
    var x = Math.max(0, Math.min(window.innerWidth - 40, e.clientX - drag.dx));
    var y = Math.max(0, Math.min(window.innerHeight - 30, e.clientY - drag.dy));
    placePill(x, y);
  });
  document.addEventListener('mouseup', function () {
    if (!drag) return;
    drag = null;
    try {
      var r = pill.getBoundingClientRect();
      localStorage.setItem(POS_KEY, JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top) }));
    } catch (err) {}
  });

  function activeTabMatches() {
    // Bottom sheet tabs; fall back to enabled when DOM not recognised.
    var active = document.querySelector('.docs-sheet-active-tab .docs-sheet-tab-name, [role="tab"][aria-selected="true"]');
    if (!active) return true;
    return (active.textContent || '').trim() === TAB_NAME;
  }

  var pending = null;
  function onMove(e) {
    if (drag) return;
    if (pending) return;
    pending = { x: e.clientX, y: e.clientY };
    requestAnimationFrame(function () {
      var p = pending;
      pending = null;
      if (!p) return;
      if (!enabled || !activeTabMatches()) {
        hLine.style.display = 'none';
        vLine.style.display = 'none';
        return;
      }
      hLine.style.top = (p.y - LINE_PX / 2) + 'px';
      hLine.style.display = 'block';
      vLine.style.left = (p.x - LINE_PX / 2) + 'px';
      vLine.style.display = 'block';
    });
  }

  function hide() {
    hLine.style.display = 'none';
    vLine.style.display = 'none';
  }

  document.addEventListener('mousemove', onMove, { passive: true });
  document.addEventListener('mouseleave', hide);
  document.addEventListener('scroll', hide, { passive: true });
})();
