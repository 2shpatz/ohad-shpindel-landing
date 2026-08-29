(function () {
  var dataEl = document.getElementById('spillitout-sleep-chart-data');
  var svg = document.getElementById('fa-svg');
  var tipEl = document.getElementById('fa-tip');
  if (!dataEl || !svg || !tipEl) return;

  var D;
  try { D = JSON.parse(dataEl.textContent || '{}'); } catch (e) { return; }
  if (!D || !D.cycles || !D.cycles.length) return;

  function close(tag) { return '<' + '/' + tag + '>'; }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var W = 720, H = 300;
  var PAD_TOP = 14, PAD_BOTTOM = 34;
  var sel = D.activeSel;
  var visible = {};
  ['attempt', 'fell', 'delta', 'events'].forEach(function (k) {
    visible[k] = D.visible.indexOf(k) !== -1;
  });

  function cycle() {
    for (var i = 0; i < D.cycles.length; i++) if (D.cycles[i].sel === sel) return D.cycles[i];
    return D.cycles[0];
  }

  function gutter(ticks) {
    var longest = 0;
    ticks.forEach(function (t) { if (t.label.length > longest) longest = t.label.length; });
    return Math.max(30, longest * 7 + 10);
  }

  function draw() {
    var c = cycle();
    var clockGut = gutter(c.clockTicks);
    var deltaGut = visible.delta ? gutter(c.deltaTicks) : 12;
    var leftGut = D.rtl ? deltaGut : clockGut;
    var rightGut = D.rtl ? clockGut : deltaGut;
    var x0 = leftGut, x1 = W - rightGut;
    var y0 = PAD_TOP, y1 = H - PAD_BOTTOM;
    var n = c.rows.length;

    function xAt(i) { return n <= 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (n - 1); }
    function yClock(v) {
      var lo = c.clockDomain[0], hi = c.clockDomain[1];
      return hi === lo ? y1 : y1 - ((v - lo) / (hi - lo)) * (y1 - y0);
    }
    function yDelta(v) {
      var hi = c.deltaDomain[1];
      return hi === 0 ? y1 : y1 - (v / hi) * (y1 - y0);
    }

    var p = [];

    c.clockTicks.forEach(function (t) {
      var y = yClock(t.v);
      p.push('<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="var(--grid)" stroke-width="1" />');
      p.push('<text class="fa-svg-text num" x="' + (D.rtl ? x1 + 6 : x0 - 6) + '" y="' + (y + 4) + '" text-anchor="' + (D.rtl ? 'start' : 'end') + '">' + esc(t.label) + close('text'));
    });

    if (visible.delta) {
      c.deltaTicks.forEach(function (t) {
        var y = yDelta(t.v);
        p.push('<text class="fa-svg-text num" x="' + (D.rtl ? x0 - 6 : x1 + 6) + '" y="' + (y + 4) + '" text-anchor="' + (D.rtl ? 'end' : 'start') + '">' + esc(t.label) + close('text'));
      });
    }

    p.push('<line x1="' + x0 + '" y1="' + y1 + '" x2="' + x1 + '" y2="' + y1 + '" stroke="var(--axis-line)" stroke-width="1" />');

    c.rows.forEach(function (row, i) {
      if (i % c.xLabelStep !== 0 && i !== n - 1) return;
      p.push('<text class="fa-svg-text num" x="' + xAt(i) + '" y="' + (y1 + 18) + '" text-anchor="middle">' + esc(row.d) + close('text'));
    });

    function series(key, pick, scale, dashed) {
      if (!visible[key]) return;
      var pts = [];
      c.rows.forEach(function (row, i) {
        var v = pick(row);
        if (v === null || v === undefined) return;
        pts.push({ i: i, x: xAt(i), y: scale(v) });
      });
      if (!pts.length) return;

      var runs = [], run = [pts[0]];
      for (var k = 1; k < pts.length; k++) {
        if (pts[k].i === pts[k - 1].i + 1) run.push(pts[k]);
        else { runs.push(run); run = [pts[k]]; }
      }
      runs.push(run);

      runs.forEach(function (r) {
        if (r.length > 1) {
          p.push('<path d="' + monotonePath(r) + '" fill="none" stroke="' + D.colors[key] + '" stroke-width="2"' + (dashed ? ' stroke-dasharray="5 4"' : '') + ' stroke-linecap="round" />');
        }
      });

      pts.forEach(function (pt) {
        p.push('<circle cx="' + pt.x + '" cy="' + pt.y + '" r="3" fill="' + D.colors[key] + '" />');
      });
    }

    series('attempt', function (r) { return r.a; }, yClock, false);
    series('fell', function (r) { return r.f; }, yClock, false);
    series('delta', function (r) { return r.delta; }, yDelta, true);

    if (visible.events) {
      c.rows.forEach(function (row, i) {
        if (row.ev === null || row.ev === undefined) return;
        p.push('<circle cx="' + xAt(i) + '" cy="' + yClock(row.ev) + '" r="5" fill="' + D.colors.events + '" stroke="rgba(0,0,0,0.3)" stroke-width="1" />');
      });
    }

    p.push('<line id="fa-cursor" x1="0" y1="' + y0 + '" x2="0" y2="' + y1 + '" stroke="var(--axis-line)" stroke-width="1" visibility="hidden" />');
    var half = n <= 1 ? (x1 - x0) / 2 : (x1 - x0) / (2 * (n - 1));
    c.rows.forEach(function (row, i) {
      var cx = xAt(i);
      var left = Math.max(x0, cx - half);
      var width = Math.min(x1, cx + half) - left;
      p.push('<rect class="fa-hit" data-i="' + i + '" x="' + left + '" y="' + y0 + '" width="' + width + '" height="' + (y1 - y0) + '" fill="transparent" />');
    });

    svg.innerHTML = p.join('');
    wireHover(c, xAt);
  }

  function monotonePath(pts) {
    var n = pts.length;
    if (n === 2) return 'M ' + pts[0].x + ' ' + pts[0].y + ' L ' + pts[1].x + ' ' + pts[1].y;

    var dx = [], dy = [], s = [];
    for (var i = 0; i < n - 1; i++) {
      dx.push(pts[i + 1].x - pts[i].x);
      dy.push(pts[i + 1].y - pts[i].y);
      s.push(dx[i] === 0 ? 0 : dy[i] / dx[i]);
    }

    var m = [s[0]];
    for (var j = 1; j < n - 1; j++) {
      if (s[j - 1] * s[j] <= 0) m.push(0);
      else {
        var w1 = 2 * dx[j] + dx[j - 1];
        var w2 = dx[j] + 2 * dx[j - 1];
        m.push((w1 + w2) / (w1 / s[j - 1] + w2 / s[j]));
      }
    }
    m.push(s[n - 2]);

    var d = 'M ' + pts[0].x + ' ' + pts[0].y;
    for (var k = 0; k < n - 1; k++) {
      var t = dx[k] / 3;
      d += ' C ' + (pts[k].x + t) + ' ' + (pts[k].y + m[k] * t) +
           ' ' + (pts[k + 1].x - t) + ' ' + (pts[k + 1].y - m[k + 1] * t) +
           ' ' + pts[k + 1].x + ' ' + pts[k + 1].y;
    }
    return d;
  }

  function wireHover(c, xAt) {
    var cursor = document.getElementById('fa-cursor');
    var hits = svg.querySelectorAll('.fa-hit');
    Array.prototype.forEach.call(hits, function (hit) {
      function show() {
        var i = parseInt(hit.getAttribute('data-i'), 10);
        var row = c.rows[i];
        if (!row) return;

        var rows = '';
        if (visible.attempt) rows += tipRow(D.colors.attempt, D.labels.series.attempt, row.tip.a);
        if (visible.fell) rows += tipRow(D.colors.fell, D.labels.series.fell, row.tip.f);
        if (visible.delta) rows += tipRow(D.colors.delta, D.labels.series.delta, row.tip.delta);

        var evNote = row.tip.ev
          ? '<div class="tip-event">' + esc(D.labels.eventNote) + close('div')
          : '';

        tipEl.innerHTML = '<div class="tip-date num">' + esc(row.d) + close('div') + rows + evNote;
        tipEl.hidden = false;

        var pct = (xAt(i) / W) * 100;
        tipEl.style.left = pct + '%';
        tipEl.style.top = '4px';
        tipEl.style.transform = pct > 60 ? 'translateX(-100%)' : 'none';
        if (cursor) {
          cursor.setAttribute('x1', xAt(i));
          cursor.setAttribute('x2', xAt(i));
          cursor.setAttribute('visibility', 'visible');
        }
      }

      function hide() {
        tipEl.hidden = true;
        if (cursor) cursor.setAttribute('visibility', 'hidden');
      }

      hit.addEventListener('mouseenter', show);
      hit.addEventListener('mousemove', show);
      hit.addEventListener('mouseleave', hide);
      hit.addEventListener('touchstart', show, { passive: true });
    });
  }

  function tipRow(color, label, value) {
    return '<div class="tip-row"><span class="tip-dot" style="background:' + color + '">' + close('span') +
      esc(label) + ': <span class="num">' + esc(value) + close('span') + close('div');
  }

  var picker = document.getElementById('fa-cycle');
  if (picker) {
    picker.addEventListener('change', function () {
      sel = parseInt(picker.value, 10);
      draw();
    });
  }

  var chips = document.querySelectorAll('.fa-chip');
  Array.prototype.forEach.call(chips, function (chip) {
    chip.addEventListener('click', function () {
      var k = chip.getAttribute('data-series');
      visible[k] = !visible[k];
      if (visible[k]) chip.classList.add('on');
      else chip.classList.remove('on');
      chip.setAttribute('aria-pressed', visible[k] ? 'true' : 'false');
      draw();
    });
  });

  draw();
  window.addEventListener('resize', function () { draw(); });
})();
