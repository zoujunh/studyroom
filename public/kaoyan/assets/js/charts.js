/* ============================================================
   charts.js —— 纯 SVG 图表（无依赖）
   ============================================================ */
window.Charts = (function () {
  var U = window.U;

  function niceTicks(min, max, count) {
    count = count || 4;
    var span = Math.max(1, max - min);
    var step = Math.pow(10, Math.floor(Math.log(span / count) / Math.LN10));
    var err = span / count / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
    var out = [];
    for (var v = lo; v <= hi + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
    return out;
  }

  /** 折线/面积图 */
  function line(opts) {
    var labels = opts.labels || [], series = opts.series || [], height = opts.height || 180;
    var w = 560, padL = 42, padR = 16, padT = 16, padB = 26;
    var allVals = [];
    series.forEach(function (s) { s.values.forEach(function (v) { allVals.push(U.num(v)); }); });
    if (!allVals.length) allVals = [0, 1];
    var ticks = niceTicks(U.num(opts.min, Math.min.apply(null, allVals)), U.num(opts.max, Math.max.apply(null, allVals)), opts.tickCount || 4);
    var min = ticks[0], max = ticks[ticks.length - 1];
    var iw = w - padL - padR, ih = height - padT - padB;
    function X(i) { return padL + (labels.length > 1 ? iw * i / (labels.length - 1) : iw / 2); }
    function Y(v) { return padT + ih - (U.clamp(U.num(v), min, max) - min) / (max - min) * ih; }

    var svg = ['<svg class="chart" viewBox="0 0 ' + w + ' ' + height + '" style="height:auto" role="img">'];
    svg.push('<defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="var(--primary)" stop-opacity=".22"/>' +
      '<stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>');
    ticks.forEach(function (t) {
      svg.push('<line class="grid-line" x1="' + padL + '" y1="' + Y(t).toFixed(1) + '" x2="' + (w - padR) + '" y2="' + Y(t).toFixed(1) + '"/>');
      svg.push('<text x="' + (padL - 8) + '" y="' + (Y(t) + 3.5).toFixed(1) + '" text-anchor="end">' + t + '</text>');
    });
    labels.forEach(function (l, i) {
      if (labels.length > 8 && i % 2) return;
      svg.push('<text x="' + X(i).toFixed(1) + '" y="' + (height - 8) + '" text-anchor="middle">' + U.esc(l) + '</text>');
    });

    series.forEach(function (s) {
      var pts = s.values.map(function (v, i) { return [X(i), Y(v)]; });
      if (pts.length > 1) {
        var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
        if (s.area !== false) {
          svg.push('<path d="' + d + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (padT + ih) + ' L' + pts[0][0].toFixed(1) + ' ' + (padT + ih) + ' Z" fill="url(#ag)" stroke="none"/>');
        }
        svg.push('<path class="line" d="' + d + '"/>');
      }
      pts.forEach(function (p, i) {
        var last = i === pts.length - 1;
        svg.push('<circle class="dot' + (last ? ' dot--last' : '') + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (last ? 4.5 : 3.5) + '"/>');
        if (s.showValues && opts.showValues !== false) {
          svg.push('<text class="val" x="' + p[0].toFixed(1) + '" y="' + (p[1] - 10).toFixed(1) + '" text-anchor="middle">' + s.values[i] + '</text>');
        }
      });
    });
    svg.push('</svg>');
    return svg.join('');
  }

  /** 环形图：data=[{label,value,color,cssVar}] */
  function donut(data, opts) {
    opts = opts || {};
    var size = opts.size || 132, sw = opts.stroke || 16, r = (size - sw) / 2, c = size / 2, C = 2 * Math.PI * r;
    var total = U.sum(data, function (d) { return d.value; }) || 0;
    var off = -C * 0.25;
    var svg = ['<svg class="donut" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img">'];
    svg.push('<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="var(--line-2)" stroke-width="' + sw + '"/>');
    if (total > 0) {
      data.forEach(function (d) {
        var len = C * (d.value / total);
        if (len <= 0) return;
        var col = d.cssVar ? 'var(' + d.cssVar + ')' : (d.color || 'var(--primary)');
        svg.push('<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + sw +
          '" stroke-dasharray="' + (len - 1.5).toFixed(2) + ' ' + (C - len + 1.5).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) +
          '" stroke-linecap="butt" transform="rotate(-90 ' + c + ' ' + c + ')"/>');
        off += len;
      });
    }
    if (opts.center) {
      svg.push('<text class="donut__c" x="' + c + '" y="' + (c + 2) + '" text-anchor="middle">' + U.esc(opts.center) + '</text>');
      if (opts.centerSub) svg.push('<text class="donut__s" x="' + c + '" y="' + (c + 17) + '" text-anchor="middle">' + U.esc(opts.centerSub) + '</text>');
    }
    svg.push('</svg>');
    return svg.join('');
  }

  /** 半环进度（首页倒计时用） */
  function ring(pct, opts) {
    opts = opts || {};
    var size = opts.size || 120, sw = opts.stroke || 10, r = (size - sw) / 2, c = size / 2, C = 2 * Math.PI * r;
    var p = U.clamp(U.num(pct), 0, 100);
    var svg = ['<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img">'];
    svg.push('<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="var(--line-2)" stroke-width="' + sw + '" stroke-linecap="round"/>');
    svg.push('<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="var(--primary)" stroke-width="' + sw +
      '" stroke-linecap="round" stroke-dasharray="' + (C * p / 100).toFixed(2) + ' ' + C.toFixed(2) +
      '" transform="rotate(-90 ' + c + ' ' + c + ')"/>');
    if (opts.label) svg.push('<text x="' + c + '" y="' + (c + 5) + '" text-anchor="middle" style="font-size:15px;font-weight:700;fill:var(--ink)">' + U.esc(opts.label) + '</text>');
    svg.push('</svg>');
    return svg.join('');
  }

  /** 迷你柱状图 */
  function bars(items, opts) {
    opts = opts || {};
    var max = Math.max(1, Math.max.apply(null, items.map(function (i) { return U.num(i.value); })));
    return '<div class="bars" style="height:' + (opts.height || 60) + 'px">' + items.map(function (i) {
      var h = Math.round(U.num(i.value) / max * 100);
      return '<div class="bars__i" title="' + U.esc(i.title || (i.label + ' ' + i.value)) + '">' +
        '<div class="bars__b' + (i.on ? ' on' : '') + '" style="height:' + Math.max(3, h) + '%;background:' + (i.on ? '' : '') + '"></div>' +
        '<div class="bars__l">' + U.esc(i.label) + '</div></div>';
    }).join('') + '</div>';
  }

  /** 横向对比条 */
  function progressBar(pct, colorVar) {
    var p = U.clamp(U.num(pct), 0, 100);
    return '<div class="progress"><i style="width:' + p + '%;background:var(' + (colorVar || '--primary') + ')"></i></div>';
  }

  return { line: line, donut: donut, ring: ring, bars: bars, progressBar: progressBar, niceTicks: niceTicks };
})();
