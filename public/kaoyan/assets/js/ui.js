/* ============================================================
   ui.js —— 共享视图组件（返回 HTML 字符串，事件用 data-act 委托）
   ============================================================ */
window.UI = (function () {
  var U = window.U, S = window.Store;

  function esc(s) { return U.esc(s); }

  /* ---------- 小标签 ---------- */
  function subjectChip(id, withFull) {
    var m = S.subject(id);
    return '<span class="chip chip--' + m.color + '">' + esc(withFull ? (m.full || m.name) : m.name) + '</span>';
  }
  function priorityEl(p) {
    var d = S.PRIORITY[p] || S.PRIORITY.mid;
    return '<span class="pri pri--' + p + '">' + d.label + '优先级</span>';
  }
  function dueChip(t) {
    if (!t.date) return '';
    var cls = t._overdue ? 'chip chip--danger' : (t.date === U.todayISO() ? 'chip chip--warn' : 'chip');
    var text = t._overdue ? ('已逾期 · ' + U.relDay(t.date)) : (t.date === U.todayISO() ? '今天' : U.relDay(t.date));
    return '<span class="' + cls + '">' + esc(text) + '</span>';
  }
  function statusChip(status) {
    if (status === 'done') return '<span class="chip chip--success">已完成</span>';
    if (status === 'doing') return '<span class="chip chip--warn">进行中</span>';
    return '<span class="chip">未开始</span>';
  }
  function pctChip(p) {
    var v = U.num(p);
    var cls = v >= 85 ? 'chip chip--success' : v >= 60 ? 'chip' : 'chip chip--warn';
    return '<span class="' + cls + '">' + v + '%</span>';
  }

  /* ---------- 任务行 ---------- */
  function taskRow(t, opts) {
    opts = opts || {};
    var acts = opts.compact ? '' :
      '<div class="task__acts">' +
      '<button class="icon-btn" data-act="edit-task" data-id="' + t.id + '" title="编辑">' + U.icon('edit', 'ico--sm') + '</button>' +
      '<button class="icon-btn" data-act="add-session" title="记录学习时长">' + U.icon('clock', 'ico--sm') + '</button>' +
      '<button class="icon-btn icon-btn--danger" data-act="del-task" data-id="' + t.id + '" title="删除">' + U.icon('trash', 'ico--sm') + '</button>' +
      '</div>';
    return '<div class="task' + (t._done ? ' is-done' : '') + (t._overdue ? ' is-overdue' : '') + '">' +
      '<button class="task__box" data-act="toggle-task" data-id="' + t.id + '" aria-label="切换完成状态">' + U.icon('check') + '</button>' +
      '<div class="task__main" data-act="edit-task" data-id="' + t.id + '">' +
      '<div class="task__t">' + esc(t.title) + '</div>' +
      '<div class="task__meta">' + subjectChip(t.subject) + dueChip(t) + priorityEl(t.priority) +
      (U.num(t.est) ? '<span class="chip">' + U.num(t.est) + ' 分钟</span>' : '') +
      '</div></div>' + acts + '</div>';
  }
  function taskList(list, opts) {
    if (!list.length) {
      return emptyBox(
        (opts && opts.emptyTitle) || '这一天还没有任务',
        (opts && opts.emptyText) || '加一条，从最容易开始的那件做起',
        '<button class="btn btn--sm btn--primary" data-act="add-task"' +
        (opts && opts.date ? ' data-date="' + opts.date + '"' : '') + '>' + U.icon('plus', 'ico--sm') + '添加任务</button>'
      );
    }
    return '<div class="task-list">' + list.map(function (t) { return taskRow(t, opts); }).join('') + '</div>';
  }
  function emptyBox(title, text, actionHtml) {
    return '<div class="empty"><b>' + esc(title) + '</b>' + esc(text || '') +
      (actionHtml ? '<div style="margin-top:10px">' + actionHtml + '</div>' : '') + '</div>';
  }

  /* ---------- 表格 ---------- */
  function table(cols, rows, opts) {
    opts = opts || {};
    cols = cols || []; rows = rows || [];
    var head = '<tr>' + cols.map(function (c) { return '<th class="' + (c.align || '') + '">' + esc(c.label) + '</th>'; }).join('') + '</tr>';
    var body = rows.map(function (r) {
      return '<tr>' + cols.map(function (c) {
        var v = c.render ? c.render(r) : r[c.key];
        return '<td class="' + (c.align || '') + '">' + (v == null ? '' : v) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return '<div class="table-wrap"><table class="tb">' + (opts.noHead ? '' : '<thead>' + head + '</thead>') + '<tbody>' + body + '</tbody></table></div>';
  }

  /* ---------- 分段控件 ---------- */
  function segmented(name, options, active) {
    return '<div class="seg" data-seg="' + name + '">' + options.map(function (o) {
      return '<button data-act="seg" data-seg="' + name + '" data-val="' + esc(o.value) + '"' +
        (String(o.value) === String(active) ? ' class="is-on"' : '') + '>' + esc(o.label) + '</button>';
    }).join('') + '</div>';
  }

  /* ---------- 卡片部件 ---------- */
  function statCard(o) {
    return '<div class="card stat">' +
      '<div class="stat__k">' + U.icon(o.icon || 'spark') + esc(o.k) + '</div>' +
      '<div class="stat__v num">' + esc(o.v) + (o.unit ? '<small>' + esc(o.unit) + '</small>' : '') + '</div>' +
      (o.bar != null ? '<div class="progress" style="margin:2px 0"><i style="width:' + U.clamp(U.num(o.bar), 0, 100) + '%;background:var(' + (o.color || '--primary') + ')"></i></div>' : '') +
      '<div class="stat__f">' + esc(o.f || '') + '</div>' +
      '</div>';
  }

  /** 科目卡：名称、满分、目标分全部来自用户数据 */
  function subjectCard(s, extra) {
    extra = extra || {};
    var target = S.subjectTarget(s.id);
    var ratio = target > 0 ? Math.round(U.num(s.score) / target * 100) : 0;
    return '<div class="subject subject--' + s.color + '">' +
      '<div class="subject__name"><span>' + esc(s.name) + '</span><span class="faint" style="font-weight:400;font-size:11px">满分 ' + U.num(s.max) + '</span></div>' +
      '<div class="subject__score"><b style="color:var(--c-' + s.color + ')">' + U.num(s.score) + '</b><span>分 · 目标 ' + target + '</span></div>' +
      window.Charts.progressBar(s.progress, '--c-' + s.color) +
      '<div class="subject__foot"><span>' + esc(s.note || (ratio + '% 达成')) + '</span><span class="num">' + U.num(s.progress) + '%</span></div>' +
      (extra.footer || '') +
      '</div>';
  }

  function sessionRow(s) {
    var m = s.subject === 'all' ? null : S.subject(s.subject);
    return '<div class="task">' +
      '<div class="sess__ico">' + U.icon('clock', 'ico--sm') + '</div>' +
      '<div class="task__main">' +
      '<div class="task__t">' + (U.num(s.minutes) ? U.num(s.minutes) + ' 分钟' : '仅笔记') +
      ' <span class="chip">' + esc(U.fmt(s.date)) + '</span>' + (m ? ' ' + subjectChip(m.id) : '') + '</div>' +
      (s.note ? '<div class="task__meta"><span class="faint">' + esc(s.note) + '</span></div>' : '') +
      '</div>' +
      '<div class="task__acts">' +
      '<button class="icon-btn" data-act="edit-session" data-id="' + s.id + '" title="编辑">' + U.icon('edit', 'ico--sm') + '</button>' +
      '<button class="icon-btn icon-btn--danger" data-act="del-session" data-id="' + s.id + '" title="删除">' + U.icon('trash', 'ico--sm') + '</button>' +
      '</div></div>';
  }

  function errorRow(m, compact) {
    var mastered = U.num(m.mastery) >= 5;
    return '<div class="err' + (mastered ? ' err--mastered' : '') + '">' +
      '<div><div class="err__t">' + esc(m.topic) + subjectChip(m.subject) +
      (mastered ? '<span class="chip chip--success">已掌握</span>' : (m._due ? '<span class="chip chip--danger">待复习</span>' : '')) +
      '</div>' +
      '<div class="err__meta">' + esc(m.type) + ' · 记录于 ' + U.fmt(m.createdAt) + ' · 已复习 ' + U.num(m.reviewCount) + ' 次 · 下次 ' + U.relDay(m._next) + '</div>' +
      (m.note ? '<div class="err__meta">' + esc(m.note) + '</div>' : '') +
      '</div>' +
      '<div class="err__bars">' +
      '<div class="faint" style="font-size:11px">掌握度 ' + U.num(m.mastery) + '/5</div>' +
      '<div class="err__row">' + [1, 2, 3, 4, 5].map(function (i) {
        return '<i class="' + (i <= U.num(m.mastery) ? 'on' : '') + '"></i>';
      }).join('') + '</div>' +
      '</div>' +
      '<div class="task__acts" style="opacity:1">' +
      (mastered ? '' : '<button class="btn btn--sm" data-act="review-mistake" data-id="' + m.id + '">复习 +1</button>') +
      '<button class="icon-btn" data-act="edit-mistake" data-id="' + m.id + '" title="编辑">' + U.icon('edit', 'ico--sm') + '</button>' +
      '<button class="icon-btn icon-btn--danger" data-act="del-mistake" data-id="' + m.id + '" title="删除">' + U.icon('trash', 'ico--sm') + '</button>' +
      '</div></div>';
  }

  function resourceRow(r) {
    var m = S.subject(r.subject);
    var typeLabel = S.RES_TYPE[r.type] || '资料';
    return '<div class="res">' +
      '<div class="res__ico" style="background:var(--c-' + m.color + '-soft);color:var(--c-' + m.color + ')">' + esc(typeLabel) + '</div>' +
      '<div><div class="res__t">' + esc(r.title) +
      (r.url ? ' <a class="chip" href="' + esc(r.url) + '" target="_blank" rel="noopener">打开链接</a>' : '') +
      '</div>' +
      '<div class="res__meta">' + esc(m.name) + (r.source ? ' · ' + esc(r.source) : '') + (r.note ? ' · ' + esc(r.note) : '') + '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-top:6px">' +
      '<div style="flex:1;max-width:220px">' + window.Charts.progressBar(r.progress, '--c-' + m.color) + '</div>' +
      '<span class="faint num" style="font-size:11px">已学 ' + U.num(r.progress) + '%</span>' +
      '</div></div>' +
      '<div class="task__acts" style="opacity:1">' +
      '<button class="icon-btn" data-act="edit-resource" data-id="' + r.id + '" title="编辑">' + U.icon('edit', 'ico--sm') + '</button>' +
      '<button class="icon-btn icon-btn--danger" data-act="del-resource" data-id="' + r.id + '" title="删除">' + U.icon('trash', 'ico--sm') + '</button>' +
      '</div></div>';
  }

  function pageHead(title, sub, actionsHtml) {
    return '<div class="spread pagehead" style="align-items:center">' +
      '<div><div class="pagehead__t">' + esc(title) + '</div>' +
      '<div class="card__sub">' + esc(sub || '') + '</div></div>' +
      '<div class="pagehead__acts">' + (actionsHtml || '') + '</div></div>';
  }

  /** 存储受限时的醒目提示（不阻断使用） */
  function storageBanner() {
    var w = S.storageWarn();
    if (w.ok && w.backend === 'local') return '';
    var inFrame = window.self !== window.top;
    var steps = inFrame
      ? ['这里看起来是在别的页面里预览本文件，浏览器会把它当作「不透明来源」并禁用存储。',
        '点浏览器标签页里的文件路径，或直接在文件夹里双击 index.html 用新标签页打开，存储就正常了。',
        '本页面仍可正常使用，但刷新后输入的內容会丢失，重要内容可以先用「导出备份」存成文件。']
      : ['当前浏览器不允许写入本机存储（可能是无痕模式、站点权限或存储空间已满）。',
        '可以改用普通窗口打开，或检查浏览器的 Cookie / 站点数据设置。',
        '在此之前数据只保留在内存中，建议随时导出备份。'];
    return '<div class="card alert' + (w.backend === 'session' ? '' : ' alert--danger') + '">' +
      '<div class="alert__row"><span class="alert__ico">' + U.icon('alert') + '</span>' +
      '<div><div class="alert__t">' + (w.backend === 'session' ? '数据只在本次会话中保存' : '无法保存到浏览器存储') + '</div>' +
      '<div class="alert__s">' + esc(w.reason || '') + '</div></div></div>' +
      '<ol class="alert__l">' + steps.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>' +
      '<div class="alert__acts">' +
      '<button class="btn btn--sm btn--primary" data-act="export">' + U.icon('box', 'ico--sm') + '导出备份</button>' +
      (inFrame ? '<button class="btn btn--sm" data-act="open-standalone">在新标签页打开</button>' : '<button class="btn btn--sm" data-act="import">导入备份</button>') +
      '</div></div>';
  }

  function toolRow(leftHtml, rightHtml) {
    return '<div class="spread tools" style="align-items:center">' +
      '<div class="tools__l">' + (leftHtml || '') + '</div>' +
      '<div class="tools__r">' + (rightHtml || '') + '</div></div>';
  }

  function legendItem(cssVar, label, value) {
    return '<div class="legend__i"><i style="background:var(' + cssVar + ')"></i>' + esc(label) + '<em class="num">' + esc(value) + '</em></div>';
  }
  function miniStat(k, v, unit) {
    return '<div class="ministat">' +
      '<div class="faint" style="font-size:11.5px">' + esc(k) + '</div>' +
      '<div class="num" style="font-size:19px;font-weight:700">' + esc(v) +
      '<span class="faint" style="font-size:11px;font-weight:400"> ' + esc(unit) + '</span></div></div>';
  }

  return {
    subjectChip: subjectChip, priorityEl: priorityEl, dueChip: dueChip, statusChip: statusChip, pctChip: pctChip,
    taskRow: taskRow, taskList: taskList, emptyBox: emptyBox, table: table, segmented: segmented,
    statCard: statCard, subjectCard: subjectCard, sessionRow: sessionRow, errorRow: errorRow, resourceRow: resourceRow,
    pageHead: pageHead, toolRow: toolRow, legendItem: legendItem, miniStat: miniStat, storageBanner: storageBanner
  };
})();
