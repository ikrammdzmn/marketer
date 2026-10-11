// ==UserScript==
// @name         Google Sheets Crosshair (instant, local-only)
// @namespace    marketer.g-sheet_tools
// @version      1.4
// @description  Instant mouse crosshair lines on any Google Sheet. Settings popup (color + thickness + remappable freeze hotkey), row-only and freeze modes, draggable ON/OFF pill. Lines only; no cell changes.
// @author       you
// @match        https://docs.google.com/spreadsheets/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  var COLOR = 'rgba(255, 255, 0, 0.45)';
  var LINE_PX = 8;
  var COLORS = [
    'rgba(255, 255, 0, 0.45)',   // yellow
    'rgba(0, 255, 255, 0.40)',   // cyan
    'rgba(255, 105, 180, 0.40)', // pink
    'rgba(0, 255, 0, 0.35)',     // green
    'rgba(255, 0, 0, 0.35)'      // red
  ];
  var ENABLE_KEY = 'affCrosshairEnabled';
  var POS_KEY = 'affCrosshairPos';
  var SET_KEY = 'affCrosshairSettings';

  // Settings (persisted): { color, px, rowOnly, freezeKey }.
  var settings = { color: COLOR, px: LINE_PX, rowOnly: false, freezeKey: 'Alt+R' };
  try {
    var rawSet = localStorage.getItem(SET_KEY);
    if (rawSet) {
      var s = JSON.parse(rawSet);
      if (typeof s.color === 'string') settings.color = s.color;
      if (typeof s.px === 'number' && s.px >= 2 && s.px <= 16) settings.px = Math.round(s.px);
      if (s.rowOnly === true) settings.rowOnly = true;
      if (typeof s.freezeKey === 'string' && s.freezeKey) settings.freezeKey = s.freezeKey;
    }
  } catch (err) {}

  function saveSettings() {
    try {
      localStorage.setItem(SET_KEY, JSON.stringify(settings));
    } catch (err) {}
  }

  // Freeze state (session-only): pinned horizontal line position.
  var frozenY = null;

  function comboFromEvent(e) {
    var key = (e.key || '').toUpperCase();
    if (!key || key === 'ALT' || key === 'SHIFT' || key === 'CONTROL') return null;
    var parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    parts.push(key.length === 1 ? key : (key.charAt(0) + key.slice(1).toLowerCase()));
    return parts.join('+');
  }

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
    el.style.background = settings.color;
    if (horizontal) {
      el.style.left = '0';
      el.style.right = '0';
      el.style.height = settings.px + 'px';
    } else {
      el.style.top = '0';
      el.style.bottom = '0';
      el.style.width = settings.px + 'px';
    }
    document.documentElement.appendChild(el);
  }

  function applySettings() {
    hLine.style.background = settings.color;
    vLine.style.background = settings.color;
    hLine.style.height = settings.px + 'px';
    vLine.style.width = settings.px + 'px';
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

  // Settings button + popup panel (color + thickness + row-only).
  var setBtn = document.createElement('button');
  setBtn.textContent = 'SET';
  setBtn.title = 'Crosshair settings';
  setBtn.style.cursor = 'pointer';
  setBtn.style.border = 'none';
  setBtn.style.borderLeft = '1px solid #dadce0';
  setBtn.style.padding = '6px 10px';
  setBtn.style.fontSize = '12px';
  setBtn.style.fontWeight = 'bold';
  setBtn.style.background = '#f1f3f4';
  setBtn.style.color = '#202124';
  pill.appendChild(setBtn);

  // FREEZE pill button (pins the horizontal line).
  var freezeBtn = document.createElement('button');
  freezeBtn.textContent = 'FREEZE';
  freezeBtn.title = 'Pin the horizontal line (hotkey below)';
  freezeBtn.style.cursor = 'pointer';
  freezeBtn.style.border = 'none';
  freezeBtn.style.borderLeft = '1px solid #dadce0';
  freezeBtn.style.padding = '6px 10px';
  freezeBtn.style.fontSize = '12px';
  freezeBtn.style.fontWeight = 'bold';
  function paintFreezeBtn() {
    freezeBtn.style.background = (frozenY !== null) ? '#188038' : '#f1f3f4';
    freezeBtn.style.color = (frozenY !== null) ? '#ffffff' : '#202124';
  }
  paintFreezeBtn();
  freezeBtn.addEventListener('click', toggleFreeze);
  pill.appendChild(freezeBtn);
  document.documentElement.appendChild(pill);

  var panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.zIndex = '1000001';
  panel.style.display = 'none';
  panel.style.fontFamily = 'Arial, sans-serif';
  panel.style.fontSize = '12px';
  panel.style.color = '#202124';
  panel.style.background = '#ffffff';
  panel.style.border = '1px solid #dadce0';
  panel.style.borderRadius = '8px';
  panel.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
  panel.style.padding = '10px';
  panel.style.width = '170px';
  panel.style.userSelect = 'none';

  var colorRow = document.createElement('div');
  colorRow.style.display = 'flex';
  colorRow.style.gap = '6px';
  colorRow.style.marginBottom = '8px';
  COLORS.forEach(function (c) {
    var sw = document.createElement('button');
    sw.title = c;
    sw.style.cursor = 'pointer';
    sw.style.width = '24px';
    sw.style.height = '24px';
    sw.style.borderRadius = '50%';
    sw.style.border = (c === settings.color) ? '2px solid #202124' : '1px solid #dadce0';
    sw.style.background = c;
    sw.style.padding = '0';
    sw.addEventListener('click', function () {
      settings.color = c;
      saveSettings();
      applySettings();
      Array.prototype.forEach.call(colorRow.children, function (kid, i) {
        kid.style.border = (COLORS[i] === c) ? '2px solid #202124' : '1px solid #dadce0';
      });
    });
    colorRow.appendChild(sw);
  });
  panel.appendChild(colorRow);

  var pxLabel = document.createElement('div');
  pxLabel.style.marginBottom = '4px';
  panel.appendChild(pxLabel);

  var pxSlider = document.createElement('input');
  pxSlider.type = 'range';
  pxSlider.min = '2';
  pxSlider.max = '16';
  pxSlider.step = '1';
  pxSlider.value = String(settings.px);
  pxSlider.style.width = '100%';
  pxSlider.addEventListener('input', function () {
    settings.px = parseInt(pxSlider.value, 10) || 8;
    pxLabel.textContent = 'Thickness: ' + settings.px + 'px';
    saveSettings();
    applySettings();
  });
  pxLabel.textContent = 'Thickness: ' + settings.px + 'px';
  panel.appendChild(pxSlider);

  var rowBtn = document.createElement('button');
  rowBtn.style.cursor = 'pointer';
  rowBtn.style.width = '100%';
  rowBtn.style.marginTop = '8px';
  rowBtn.style.border = '1px solid #dadce0';
  rowBtn.style.borderRadius = '4px';
  rowBtn.style.padding = '6px';
  rowBtn.style.fontSize = '12px';
  rowBtn.style.fontWeight = 'bold';
  function paintRowBtn() {
    rowBtn.textContent = settings.rowOnly ? 'Row-only: ON' : 'Row-only: OFF';
    rowBtn.style.background = settings.rowOnly ? '#188038' : '#f1f3f4';
    rowBtn.style.color = settings.rowOnly ? '#ffffff' : '#202124';
  }
  paintRowBtn();
  rowBtn.addEventListener('click', function () {
    settings.rowOnly = !settings.rowOnly;
    saveSettings();
    paintRowBtn();
    if (settings.rowOnly) vLine.style.display = 'none';
  });
  panel.appendChild(rowBtn);

  // Freeze-hotkey remap row.
  var hkLabel = document.createElement('div');
  hkLabel.style.marginTop = '8px';
  hkLabel.style.marginBottom = '4px';
  hkLabel.textContent = 'Freeze hotkey: ' + settings.freezeKey;
  panel.appendChild(hkLabel);

  var hkBtn = document.createElement('button');
  hkBtn.textContent = 'SET HOTKEY';
  hkBtn.style.cursor = 'pointer';
  hkBtn.style.width = '100%';
  hkBtn.style.border = '1px solid #dadce0';
  hkBtn.style.borderRadius = '4px';
  hkBtn.style.padding = '6px';
  hkBtn.style.fontSize = '12px';
  hkBtn.style.fontWeight = 'bold';
  hkBtn.style.background = '#f1f3f4';
  hkBtn.style.color = '#202124';
  panel.appendChild(hkBtn);

  var recording = false;
  hkBtn.addEventListener('click', function () {
    recording = true;
    hkBtn.textContent = 'PRESS KEYS...';
    hkBtn.style.background = '#fbbc04';
  });

  document.addEventListener('keydown', function (e) {
    // Hotkey record mode takes the next combo.
    if (recording) {
      var combo = comboFromEvent(e);
      if (!combo) return;
      e.preventDefault();
      e.stopPropagation();
      recording = false;
      hkBtn.textContent = 'SET HOTKEY';
      hkBtn.style.background = '#f1f3f4';
      if (!e.altKey && !e.shiftKey) {
        hkLabel.textContent = 'Use Alt or Shift + key (got ' + combo + ')';
        return;
      }
      settings.freezeKey = combo;
      saveSettings();
      hkLabel.textContent = 'Freeze hotkey: ' + combo;
      return;
    }
    // Skip while typing in fields.
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (comboFromEvent(e) === settings.freezeKey) {
      e.preventDefault();
      toggleFreeze();
    }
  }, true);

  document.documentElement.appendChild(panel);

  function togglePanel() {
    if (panel.style.display === 'none') {
      var r = pill.getBoundingClientRect();
      panel.style.left = Math.max(0, Math.min(window.innerWidth - 190, r.left)) + 'px';
      panel.style.top = (r.bottom + 6) + 'px';
      panel.style.display = 'block';
    } else {
      panel.style.display = 'none';
    }
  }
  setBtn.addEventListener('click', togglePanel);

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

  var pending = null;
  var lastY = null;
  function onMove(e) {
    if (drag) return;
    lastY = e.clientY;
    if (pending) return;
    pending = { x: e.clientX, y: e.clientY };
    requestAnimationFrame(function () {
      var p = pending;
      pending = null;
      if (!p) return;
      if (!enabled) {
        hLine.style.display = 'none';
        vLine.style.display = 'none';
        return;
      }
      hLine.style.top = ((frozenY !== null ? frozenY : p.y) - settings.px / 2) + 'px';
      hLine.style.display = 'block';
      if (settings.rowOnly) {
        vLine.style.display = 'none';
      } else {
        vLine.style.left = (p.x - settings.px / 2) + 'px';
        vLine.style.display = 'block';
      }
    });
  }

  function hide() {
    hLine.style.display = 'none';
    vLine.style.display = 'none';
  }

  function toggleFreeze() {
    if (frozenY !== null) {
      frozenY = null; // release back to follow mode
    } else {
      // Pin at last known cursor height (center if never moved yet).
      frozenY = (typeof lastY === 'number') ? lastY : Math.round(window.innerHeight / 2);
      hLine.style.top = (frozenY - settings.px / 2) + 'px';
      hLine.style.display = 'block';
    }
    paintFreezeBtn();
  }

  document.addEventListener('mousemove', onMove, { passive: true });
  document.addEventListener('mouseleave', hide);
  document.addEventListener('scroll', hide, { passive: true });
})();
