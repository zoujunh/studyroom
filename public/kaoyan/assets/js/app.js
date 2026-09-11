/* ============================================================
   app.js —— 路由、事件委托、所有增删改操作
   ============================================================ */
(function () {
  var U = window.U, S = window.Store, UI = window.UI, P = window.Pages;

  var TABS = [
    { id: 'home', label: '首页', icon: 'home' },
    { id: 'plan', label: '计划', icon: 'calendar' },
    { id: 'subjects', label: '科目', icon: 'chart' },
    { id: 'papers', label: '真题', icon: 'doc' },
    { id: 'mistakes', label: '错题', icon: 'alert' },
    { id: 'mocks', label: '模考', icon: 'exam' },
    { id: 'resources', label: '资料', icon: 'box' },
    { id: 'review', label: '复盘', icon: 'bulb' },
    { id: 'settings', label: '设置', icon: 'gear' }
  ];

  var v = {
    page: 'home',
    planMonday: '', planDate: '',
    paperSubject: 'all', paperStatus: 'all',
    mistakeSubject: 'all', mistakeView: 'all',
    resSubject: 'all', resType: 'all'
  };

  var view = document.getElementById('view');
  var tabsEl = document.getElementById('tabs');

  /* ---------------- 渲染 ---------------- */
  function counts() {
    return {
      home: S.decorateTasks(S.tasksOn(U.todayISO())).filter(function (t) { return !t._done; }).length,
      plan: S.decorateTasks(S.all().tasks).filter(function (t) { return t._overdue; }).length,
      mistakes: S.mistakesDue().length
    };
  }
  function renderTabs() {
    var c = counts();
    tabsEl.innerHTML = TABS.map(function (t) {
      var n = c[t.id] || 0;
      return '<button class="tab' + (v.page === t.id ? ' is-on' : '') + '" data-act="go" data-page="' + t.id + '">' +
        U.icon(t.icon) + '<span>' + t.label + '</span>' +
        (n ? '<span class="badge num">' + n + '</span>' : '') + '</button>';
    }).join('');
    var on = tabsEl.querySelector('.tab.is-on');
    if (on && on.scrollIntoView) { try { on.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) { } }
  }
  function paintChrome() {
    var cd = S.countdown();
    var mins = S.sessionMinutes(U.todayISO());
    var todayTasks = S.decorateTasks(S.tasksOn(U.todayISO()));
    var done = todayTasks.filter(function (t) { return t._done; }).length;
    var wk = S.weekStats();
    var q = document.getElementById('quickStats');
    if (q) {
      q.innerHTML =
        '<div class="quick"><b class="num">' + (cd.set ? cd.days + ' 天' : '—') + '</b><span>距考试</span></div>' +
        '<div class="quick"><b class="num">' + done + '/' + todayTasks.length + '</b><span>今日任务</span></div>';
    }
    var sub = document.getElementById('brandSub');
    if (sub) {
      sub.textContent = S.hasAnyData()
        ? '今日已学 ' + (mins / 60).toFixed(1) + ' 小时 · 本周完成率 ' + wk.rate + '%' +
        (S.all().settings.school ? ' · 目标 ' + S.all().settings.school : '')
        : '先把考试日期、科目和目标填上，其余都交给你自己';
    }
    var gear = document.getElementById('gearBtn');
    if (gear) gear.innerHTML = U.icon('gear');
    var theme = document.getElementById('themeBtn');
    if (theme) {
      theme.innerHTML = U.icon(U.getTheme() === 'dark' ? 'spark' : 'bulb');
      theme.title = U.getTheme() === 'dark' ? '切换到日间' : '切换到夜间';
    }
  }
  function render() {
    if (!v.planDate) v.planDate = U.todayISO();
    var def = TABS.filter(function (t) { return t.id === v.page; })[0] || TABS[0];
    view.innerHTML = UI.storageBanner() + P[def.id.charAt(0).toUpperCase() + def.id.slice(1)].render(v);
    renderTabs();
    paintChrome();
    window.scrollTo({ top: 0, behavior: window.scrollY > 400 ? 'smooth' : 'auto' });
  }
  function go(page) {
    if (!page) return;
    var ok = TABS.filter(function (t) { return t.id === page; }).length;
    if (!ok) return;
    v.page = page;
    if (location.hash !== '#' + page) { try { location.hash = page; } catch (e) { } }
    render();
  }
  function save(msg) { S.save(); render(); if (msg) U.toast(msg, 'ok'); }

  /* ---------------- 学习时长 ---------------- */
  function sessionForm(sess) {
    var s = sess || {};
    var isNew = !sess;
    U.formModal(isNew ? '记录学习时长' : '编辑时长记录', [
      { type: 'group', fields: [
        { name: 'minutes', label: '时长', type: 'number', value: U.num(s.minutes) || (isNew ? 60 : 0), min: 0, max: 1440, suffix: '分钟', required: isNew },
        { name: 'date', label: '日期', type: 'date', value: s.date || U.todayISO(), required: true }
      ] },
      { name: 'subject', label: '科目', type: 'select', value: s.subject || 'all', options: [{ value: 'all', label: '综合 / 全部' }].concat(S.all().subjects.map(function (m) { return { value: m.id, label: m.name }; })) },
      { name: 'note', label: '备注 / 复盘', type: 'textarea', value: s.note || '', placeholder: '例如：数学强化第6讲，效率不错 / 今天状态一般', wide: true }
    ], function (val) {
      if (!isNew) { Object.assign(sess, val); save('已更新记录'); return; }
      if (!val.minutes && !val.note) { U.toast('至少填时长或备注', 'err'); return false; }
      S.all().sessions.push(Object.assign({ id: U.uid('s') }, val));
      save(val.minutes ? '已记录 ' + val.minutes + ' 分钟' : '已保存复盘');
    }, {
      desc: '一天可以记多笔，时长会计入统计',
      danger: isNew ? null : {
        label: '删除', onClick: function () {
          var d = S.all(); d.sessions = d.sessions.filter(function (x) { return x.id !== sess.id; });
          save('已删除记录');
        }
      }
    });
    if (isNew) {
      var panel = document.getElementById('modalPanel');
      var box = panel && panel.querySelector('.modal__body');
      if (box) {
        var quick = U.h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin-top:10px' });
        [15, 25, 45, 60, 90, 120, 180].forEach(function (m) {
          quick.appendChild(U.h('button', {
            class: 'btn btn--sm', text: m + ' 分钟', onclick: function () {
              var el = panel.querySelector('[name="minutes"]'); if (el) el.value = m;
            }
          }));
        });
        box.appendChild(quick);
      }
    }
  }

  /** 管理所有时长记录 */
  function manageSessions() {
    var all = S.all().sessions.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var total = U.sum(all, function (s) { return s.minutes; });
    var body = U.h('div', null, [
      U.h('div', { class: 'toolbar-line' }, [
        U.h('span', { class: 'card__sub', text: '共 ' + all.length + ' 条 · 合计 ' + (total / 60).toFixed(1) + ' 小时' }),
        U.h('button', { class: 'btn btn--sm btn--primary', text: '+ 新增记录', onclick: function () { U.closeModal(); sessionForm(null); } })
      ])
    ]);
    var list = U.h('div', { class: 'task-list', style: 'margin-top:10px' });
    if (!all.length) list.appendChild(U.h('div', { class: 'empty', text: '还没有任何时长记录' }));
    all.slice(0, 60).forEach(function (s) {
      list.appendChild(U.h('div', { class: 'task' }, [
        U.h('div', { class: 'sess__ico', html: U.icon('clock', 'ico--sm') }),
        U.h('div', { class: 'task__main', onclick: function () { U.closeModal(); sessionForm(s); } }, [
          U.h('div', { class: 'task__t', text: (U.num(s.minutes) ? U.num(s.minutes) + ' 分钟' : '仅笔记') + '  ' + U.fmt(s.date) }),
          s.note ? U.h('div', { class: 'task__meta' }, [U.h('span', { class: 'faint', text: s.note })]) : null
        ]),
        U.h('div', { class: 'task__acts', style: 'opacity:1' }, [
          U.h('button', { class: 'icon-btn', html: U.icon('edit', 'ico--sm'), title: '编辑', onclick: function () { U.closeModal(); sessionForm(s); } }),
          U.h('button', {
            class: 'icon-btn icon-btn--danger', html: U.icon('trash', 'ico--sm'), title: '删除', onclick: function () {
              var d = S.all(); d.sessions = d.sessions.filter(function (x) { return x.id !== s.id; });
              U.closeModal(); save('已删除一条记录');
            }
          })
        ])
      ]));
    });
    body.appendChild(list);
    if (all.length > 60) body.appendChild(U.h('div', { class: 'faint', style: 'font-size:11.5px;margin-top:8px', text: '只显示最近 60 条，更早的记录在导出的备份里。' }));
    U.openModal({ title: '学习时长记录', desc: '点任意一条即可修改', body: body, actions: [{ label: '完成', kind: 'primary', onClick: U.closeModal }] });
  }

  /* ---------------- 任务 ---------------- */
  var SUBJ_OPTS = function () { return S.all().subjects.map(function (m) { return { value: m.id, label: m.name }; }); };
  var PRI_OPTS = function () {
    return [{ value: 'high', label: '高（必须做）' }, { value: 'mid', label: '中（常规推进）' }, { value: 'low', label: '低（有空再做）' }];
  };
  var STATUS_OPTS = [{ value: 'todo', label: '未开始' }, { value: 'doing', label: '进行中' }, { value: 'done', label: '已完成' }];

  function taskForm(task, presetDate) {
    var t = task || {};
    U.formModal(task ? '编辑任务' : '添加任务', [
      { name: 'title', label: '任务内容', type: 'text', value: t.title || '', placeholder: '例如：英语·精读 2 篇真题阅读', required: true, wide: true },
      { type: 'group', fields: [
        { name: 'subject', label: '科目', type: 'select', value: t.subject || S.all().subjects[0].id, options: SUBJ_OPTS() },
        { name: 'date', label: '截止日期', type: 'date', value: t.date || presetDate || U.todayISO(), required: true }
      ] },
      { type: 'group', fields: [
        { name: 'priority', label: '优先级', type: 'select', value: t.priority || 'mid', options: PRI_OPTS() },
        { name: 'status', label: '完成状态', type: 'select', value: t.status || 'todo', options: STATUS_OPTS }
      ] },
      { name: 'est', label: '预计用时', type: 'number', value: t.est == null ? 45 : t.est, min: 0, max: 1440, suffix: '分钟' }
    ], function (val) {
      if (task) { Object.assign(task, val); save('任务已更新'); }
      else { S.all().tasks.push(Object.assign({ id: U.uid('t'), createdAt: U.todayISO() }, val)); save('已添加任务'); }
    }, {
      danger: task ? { label: '删除', onClick: function () { removeTask(task.id); } } : null
    });
  }
  function removeTask(id) {
    var d = S.all();
    d.tasks = d.tasks.filter(function (t) { return t.id !== id; });
    save('任务已删除');
  }

  /* ---------------- 目标 / 科目 ---------------- */
  function settingsForm() {
    var st = S.all().settings;
    U.formModal('考试与目标', [
      { type: 'group', fields: [
        { name: 'examDate', label: '考试日期', type: 'date', value: st.examDate },
        { name: 'targetScore', label: '目标总分', type: 'number', value: st.targetScore || '', min: 0, max: 1000, suffix: '分' }
      ] },
      { name: 'school', label: '目标院校', type: 'text', value: st.school, placeholder: '例如：XX大学', wide: true },
      { name: 'major', label: '目标专业', type: 'text', value: st.major, placeholder: '例如：计算机科学与技术', wide: true },
      { type: 'group', fields: [
        { name: 'dailyGoalMinutes', label: '每日学习目标', type: 'number', value: st.dailyGoalMinutes, min: 10, max: 1440, suffix: '分钟' },
        { name: 'subjectRatio', label: '单科目标默认比例', type: 'number', value: st.subjectRatio, min: 1, max: 100, suffix: '%（满分×比例）' }
      ] },
      { name: 'motto', label: '给自己的一句话', type: 'text', value: st.motto, placeholder: '例如：备考有规划，上岸更从容！', wide: true }
    ], function (val) {
      Object.assign(S.all().settings, val);
      save('已保存');
    }, { desc: '都留空也可以，倒计时和差距会按已填内容计算' });
  }
  function goalForm() {
    U.formModal('每日学习目标', [
      { name: 'dailyGoalMinutes', label: '每天目标时长', type: 'number', value: S.dailyGoal(), min: 10, max: 1440, suffix: '分钟', required: true }
    ], function (val) {
      S.all().settings.dailyGoalMinutes = val.dailyGoalMinutes;
      save('每日目标已更新');
    }, {
      desc: '当前 ' + (S.dailyGoal() / 60).toFixed(1) + ' 小时',
      body: quickGoalBody()
    });
    function quickGoalBody() {
      var box = U.h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px' });
      [60, 120, 180, 240, 300, 360, 480].forEach(function (m) {
        box.appendChild(U.h('button', {
          class: 'btn btn--sm', text: (m / 60) + ' 小时', onclick: function () {
            var el = document.getElementById('modalPanel').querySelector('[name="dailyGoalMinutes"]');
            if (el) el.value = m;
          }
        }));
      });
      return box;
    }
  }
  function subjectForm(id) {
    var s = S.subject(id);
    U.formModal('编辑科目', [
      { type: 'group', fields: [
        { name: 'name', label: '科目名称', type: 'text', value: s.name, required: true, placeholder: '例如：英语 / 专业课二' },
        { name: 'full', label: '全称', type: 'text', value: s.full || '', placeholder: '例如：英语一' }
      ] },
      { type: 'group', fields: [
        { name: 'max', label: '满分', type: 'number', value: s.max, min: 1, max: 500, required: true },
        { name: 'target', label: '单科目标分', type: 'number', value: s.target, min: 0, max: 1000 }
      ] },
      { type: 'group', fields: [
        { name: 'score', label: '当前分数', type: 'number', value: s.score, min: 0, max: 1000, required: true },
        { name: 'progress', label: '复习进度', type: 'number', value: s.progress, min: 0, max: 100, suffix: '%' }
      ] },
      { name: 'weak', label: '薄弱点', type: 'text', value: (s.weak || []).join('、'), placeholder: '用「、」或逗号分隔', wide: true },
      { name: 'note', label: '状态备注', type: 'text', value: s.note || '', placeholder: '例如：稳步提升中', wide: true }
    ], function (val) {
      if (val.target > val.max || val.score > val.max) { U.toast('目标和当前分数不能超过满分', 'err'); return false; }
      Object.assign(s, val);
      s.weak = String(val.weak || '').split(/[、,，;；\s]+/).filter(Boolean);
      save('已更新「' + s.name + '」');
    }, {
      desc: '名称、满分、目标都可以改成你自己的分类',
      danger: { label: '恢复默认名称', onClick: function () {
        var slot = S.SLOTS.filter(function (x) { return x.id === s.id; })[0];
        if (!slot) return;
        s.name = slot.name; s.full = slot.full; s.sub = slot.sub; s.max = slot.max;
        s.target = Math.round(slot.max * (S.all().settings.subjectRatio || 85) / 100);
        save('已恢复默认');
      } }
    });
  }

  /* ---------------- 真题 / 模考 / 错题 / 资料 ---------------- */
  function paperForm(p) {
    var t = p || {};
    U.formModal(p ? '编辑真题 / 习题' : '新增真题 / 习题', [
      { name: 'name', label: '名称', type: 'text', value: t.name || '', placeholder: '例如：数学一 2010-2025 真题', required: true, wide: true },
      { type: 'group', fields: [
        { name: 'subject', label: '科目', type: 'select', value: t.subject || S.all().subjects[0].id, options: SUBJ_OPTS() },
        { name: 'year', label: '年份', type: 'number', value: t.year == null ? new Date().getFullYear() : t.year, min: 1980, max: 2100 }
      ] },
      { type: 'group', fields: [
        { name: 'type', label: '类型', type: 'select', value: t.type || '真题', options: ['真题', '模拟题', '习题', '讲义', '背诵手册', '其他'] },
        { name: 'progress', label: '状态', type: 'select', value: t.progress || 'todo', options: [{ value: 'todo', label: '未开始' }, { value: 'doing', label: '进行中' }, { value: 'done', label: '已完成' }] }
      ] },
      { name: 'note', label: '备注', type: 'text', value: t.note || '', placeholder: '例如：阅读已刷完 2020 年之前', wide: true }
    ], function (val) {
      if (p) { Object.assign(p, val); save('已更新'); }
      else { S.all().papers.push(Object.assign({ id: U.uid('p') }, val)); save('已新增'); }
    }, {
      danger: p ? {
        label: '删除', onClick: function () {
          var d = S.all(); d.papers = d.papers.filter(function (x) { return x.id !== p.id; }); save('已删除');
        }
      } : null
    });
  }

  function mockForm(mk) {
    var t = mk || {};
    function totalOf(vals) {
      return U.sum(S.all().subjects, function (m) { return U.num(vals['sc_' + m.id]); });
    }
    var fields = [
      { name: 'name', label: '模考名称', type: 'text', value: t.name || '', placeholder: '例如：11.15模拟 / 第一次全真', required: true, wide: true },
      { name: 'date', label: '考试日期', type: 'date', value: t.date || U.todayISO(), required: true },
      { type: 'note', label: '下面按科目填分数，总分自动计算：' }
    ];
    S.all().subjects.forEach(function (m) {
      fields.push({
        name: 'sc_' + m.id, label: m.name + '（满分 ' + U.num(m.max) + '）', type: 'number',
        value: t.scores ? U.num(t.scores[m.id]) : 0, min: 0, max: U.num(m.max)
      });
    });
    fields.push({ name: 'note', label: '复盘备注', type: 'text', value: t.note || '', placeholder: '例如：数学步骤拿分意识要加强', wide: true });
    U.formModal(mk ? '编辑模考记录' : '记录一次模考', fields, function (val) {
      var scores = {};
      S.all().subjects.forEach(function (m) { scores[m.id] = U.num(val['sc_' + m.id]); });
      var payload = { name: val.name, date: val.date, note: val.note || '', scores: scores };
      if (mk) { Object.assign(mk, payload); save('模考记录已更新'); }
      else { S.all().mocks.push(Object.assign({ id: U.uid('m') }, payload)); save('已记录模考，总分 ' + S.mockTotal(payload)); }
    }, {
      desc: '总分 = 各科之和',
      body: U.h('div', { class: 'f-size', style: 'margin-bottom:10px' }, [
        '本次总分：', U.h('b', { class: 'num', id: 'mockTotalPreview', text: String(mk ? S.mockTotal(mk) : 0) }), ' 分'
      ]),
      danger: mk ? {
        label: '删除', onClick: function () {
          var d = S.all(); d.mocks = d.mocks.filter(function (x) { return x.id !== mk.id; }); save('已删除');
        }
      } : null
    });
    var panel = document.getElementById('modalPanel');
    var out = panel && panel.querySelector('#mockTotalPreview');
    if (out) {
      panel.addEventListener('input', function (e) {
        var n = e && e.target && e.target.name;
        if (!n || n.indexOf('sc_') !== 0) return;
        var vals = {};
        S.all().subjects.forEach(function (m) {
          var el = panel.querySelector('[name="sc_' + m.id + '"]');
          vals['sc_' + m.id] = el ? el.value : 0;
        });
        out.textContent = String(totalOf(vals));
      });
    }
  }

  function mistakeForm(em) {
    var t = em || {};
    U.formModal(em ? '编辑错题' : '记一道错题', [
      { name: 'topic', label: '知识点 / 题目', type: 'text', value: t.topic || '', placeholder: '例如：级数收敛判断', required: true, wide: true },
      { type: 'group', fields: [
        { name: 'subject', label: '科目', type: 'select', value: t.subject || S.all().subjects[0].id, options: SUBJ_OPTS() },
        { name: 'type', label: '错因', type: 'select', value: t.type || S.all().settings.errTypes[0], options: S.all().settings.errTypes }
      ] },
      { name: 'note', label: '错在哪 / 正确思路', type: 'textarea', value: t.note || '', placeholder: '记录关键失误点，复习时只看这一句就够了', wide: true },
      { type: 'group', fields: [
        { name: 'mastery', label: '掌握度', type: 'number', value: t.mastery == null ? 1 : t.mastery, min: 0, max: 5 },
        { name: 'reviewCount', label: '已复习次数', type: 'number', value: t.reviewCount == null ? 0 : t.reviewCount, min: 0, max: 99 }
      ] }
    ], function (val) {
      if (em) { Object.assign(em, val); save('错题已更新'); }
      else {
        S.all().mistakes.push(Object.assign({
          id: U.uid('e'), createdAt: U.todayISO(), lastReview: U.todayISO()
        }, val));
        save('已记入错题本');
      }
    }, {
      desc: '掌握度 0-5，达到 5 视为已掌握',
      danger: em ? {
        label: '删除', onClick: function () {
          var d = S.all(); d.mistakes = d.mistakes.filter(function (x) { return x.id !== em.id; }); save('已删除');
        }
      } : null
    });
  }

  function resourceForm(r) {
    var t = r || {};
    U.formModal(r ? '编辑资料' : '添加资料', [
      { name: 'title', label: '资料名称', type: 'text', value: t.title || '', placeholder: '例如：英语一 高频词 5500', required: true, wide: true },
      { type: 'group', fields: [
        { name: 'subject', label: '科目', type: 'select', value: t.subject || S.all().subjects[0].id, options: SUBJ_OPTS() },
        { name: 'type', label: '类型', type: 'select', value: t.type || 'video', options: Object.keys(S.RES_TYPE).map(function (k) { return { value: k, label: S.RES_TYPE[k] }; }) }
      ] },
      { type: 'group', fields: [
        { name: 'source', label: '来源', type: 'text', value: t.source || '', placeholder: '网课 / 自己整理' },
        { name: 'progress', label: '学习进度', type: 'number', value: t.progress == null ? 0 : t.progress, min: 0, max: 100, suffix: '%' }
      ] },
      { name: 'url', label: '链接（可选）', type: 'text', value: t.url || '', placeholder: 'https://…', wide: true },
      { name: 'note', label: '备注', type: 'text', value: t.note || '', wide: true }
    ], function (val) {
      if (r) { Object.assign(r, val); save('资料已更新'); }
      else { S.all().resources.push(Object.assign({ id: U.uid('r') }, val)); save('已添加资料'); }
    }, {
      danger: r ? {
        label: '删除', onClick: function () {
          var d = S.all(); d.resources = d.resources.filter(function (x) { return x.id !== r.id; }); save('已删除');
        }
      } : null
    });
  }

  /* ---------------- 设置页的小表单 ---------------- */
  function noteForm() {
    var date = v.page === 'plan' ? (v.planDate || U.todayISO()) : U.todayISO();
    U.formModal(U.fmtCn(date) + ' 复盘', [
      { name: 'note', label: '今天完成了什么 / 卡在哪 / 明天先做哪件', type: 'textarea', value: S.reviewNote(date), rows: 5, wide: true }
    ], function (val) {
      S.setReviewNote(date, val.note || '');
      save('复盘已保存');
    }, {
      desc: '这段文字会显示在首页、计划页和复盘页',
      danger: S.reviewNote(date) ? { label: '清空', onClick: function () { S.setReviewNote(date, ''); save('已清空'); } } : null
    });
  }
  function errTypesForm() {
    U.formModal('错因选项', [
      { name: 'list', label: '每行一个', type: 'textarea', value: (S.all().settings.errTypes || []).join('\n'), rows: 7, wide: true }
    ], function (val) {
      var arr = String(val.list || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
      S.all().settings.errTypes = arr.length ? arr : S.DEFAULT_ERRTYPES.slice();
      save('错因选项已更新');
    }, { desc: '记错题时的「错因」下拉选项' });
  }
  function resTypesForm() {
    var cur = S.RES_TYPE;
    U.formModal('资料类型名称', [
      { name: 'video', label: 'video 显示为', type: 'text', value: cur.video },
      { name: 'pdf', label: 'pdf 显示为', type: 'text', value: cur.pdf },
      { name: 'note', label: 'note 显示为', type: 'text', value: cur.note },
      { name: 'site', label: 'site 显示为', type: 'text', value: cur.site },
      { name: 'book', label: 'book 显示为', type: 'text', value: cur.book }
    ], function (val) {
      Object.keys(cur).forEach(function (k) { if (val[k]) cur[k] = String(val[k]); });
      save('资料类型已更新');
    }, { desc: '只改显示名称，已有资料不会被影响' });
  }
  function prioritiesForm() {
    var cur = S.PRIORITY;
    U.formModal('优先级说明', [
      { name: 'high', label: '高优先级', type: 'text', value: cur.high.label },
      { name: 'mid', label: '中优先级', type: 'text', value: cur.mid.label },
      { name: 'low', label: '低优先级', type: 'text', value: cur.low.label }
    ], function (val) {
      Object.keys(cur).forEach(function (k) { if (val[k]) cur[k].label = String(val[k]); });
      save('优先级说明已更新');
    }, { desc: '例如可改成「今天必做 / 本周内 / 有空再说」' });
  }

  /* ---------------- 操作分发 ---------------- */
  var ACT = {
    'go': function (el) { go(el.getAttribute('data-page')); },

    /* 任务 */
    'add-task': function (el) { taskForm(null, el.getAttribute('data-date') || (v.page === 'plan' ? v.planDate : U.todayISO())); },
    'edit-task': function (el) { var t = pick('tasks', el); if (t) taskForm(t); },
    'del-task': function (el) {
      var t = pick('tasks', el);
      if (t) U.confirmBox('删除任务', '「' + t.title + '」将被删除，确定吗？', function () { removeTask(t.id); });
    },
    'toggle-task': function (el) {
      var t = pick('tasks', el);
      if (!t) return;
      t.status = t.status === 'done' ? 'todo' : 'done';
      save(t.status === 'done' ? '完成 +1' : '已标记为未完成');
    },

    /* 时长 */
    'add-session': function () { sessionForm(null); },
    'edit-session': function (el) { var s = pick('sessions', el); if (s) sessionForm(s); },
    'del-session': function (el) {
      var s = pick('sessions', el);
      if (s) U.confirmBox('删除记录', '删除这条 ' + (U.num(s.minutes) || 0) + ' 分钟的记录？', function () {
        var d = S.all(); d.sessions = d.sessions.filter(function (x) { return x.id !== s.id; }); save('已删除');
      });
    },
    'manage-sessions': manageSessions,
    'edit-note': noteForm,
    'edit-goal': goalForm,

    /* 目标与科目 */
    'edit-settings': settingsForm,
    'edit-profile': settingsForm,
    'edit-subject': function (el) { subjectForm(el.getAttribute('data-id')); },
    'edit-errtypes': errTypesForm,
    'edit-restypes': resTypesForm,
    'edit-priorities': prioritiesForm,

    /* 真题 */
    'add-paper': function () { paperForm(null); },
    'edit-paper': function (el) { var p = pick('papers', el); if (p) paperForm(p); },
    'del-paper': function (el) {
      var p = pick('papers', el);
      if (p) U.confirmBox('删除资料', '「' + p.name + '」将被删除，确定吗？', function () {
        var d = S.all(); d.papers = d.papers.filter(function (x) { return x.id !== p.id; }); save('已删除');
      });
    },
    'cycle-paper': function (el) {
      var p = pick('papers', el);
      if (!p) return;
      p.progress = p.progress === 'todo' ? 'doing' : p.progress === 'doing' ? 'done' : 'todo';
      save('状态：' + S.PAPER_STATUS[p.progress]);
    },

    /* 模考 */
    'add-mock': function () { mockForm(null); },
    'edit-mock': function (el) { var m = pick('mocks', el); if (m) mockForm(m); },
    'del-mock': function (el) {
      var m = pick('mocks', el);
      if (m) U.confirmBox('删除模考记录', '删除后趋势图会重新计算，确定吗？', function () {
        var d = S.all(); d.mocks = d.mocks.filter(function (x) { return x.id !== m.id; }); save('已删除');
      });
    },

    /* 错题 */
    'add-mistake': function () { mistakeForm(null); },
    'edit-mistake': function (el) { var m = pick('mistakes', el); if (m) mistakeForm(m); },
    'del-mistake': function (el) {
      var m = pick('mistakes', el);
      if (m) U.confirmBox('删除错题', '「' + m.topic + '」将从错题本移除，确定吗？', function () {
        var d = S.all(); d.mistakes = d.mistakes.filter(function (x) { return x.id !== m.id; }); save('已删除');
      });
    },
    'review-mistake': function (el) {
      var m = pick('mistakes', el);
      if (!m) return;
      m.reviewCount = U.num(m.reviewCount) + 1;
      m.mastery = U.clamp(U.num(m.mastery) + 1, 0, 5);
      m.lastReview = U.todayISO();
      save(m.mastery >= 5 ? '已掌握，摘下这道题 🎉' : '复习 +1，下次 ' + U.relDay(S.nextReviewDate(m)) + ' 再见');
    },
    'review-all-due': function () {
      var due = S.mistakesDue();
      if (!due.length) { U.toast('今天没有到期错题'); return; }
      due.forEach(function (item) {
        var m = pick('mistakes', { getAttribute: function () { return item.id; } });
        if (!m) return;
        m.reviewCount = U.num(m.reviewCount) + 1;
        m.mastery = U.clamp(U.num(m.mastery) + 1, 0, 5);
        m.lastReview = U.todayISO();
      });
      save('已复习 ' + due.length + ' 道错题');
    },

    /* 资料 */
    'add-resource': function () { resourceForm(null); },
    'edit-resource': function (el) { var r = pick('resources', el); if (r) resourceForm(r); },
    'del-resource': function (el) {
      var r = pick('resources', el);
      if (r) U.confirmBox('删除资料', '「' + r.title + '」将被移除，确定吗？', function () {
        var d = S.all(); d.resources = d.resources.filter(function (x) { return x.id !== r.id; }); save('已删除');
      });
    },

    /* 计划页 */
    'pick-day': function (el) { v.planDate = el.getAttribute('data-date'); render(); },
    'week-move': function (el) {
      var base = U.parseDate(v.planMonday) || U.mondayOf();
      var m = U.mondayOf(new Date(base.getFullYear(), base.getMonth(), base.getDate() + U.num(el.getAttribute('data-delta'))));
      v.planMonday = U.iso(m); render();
    },
    'week-today': function () { v.planMonday = ''; v.planDate = U.todayISO(); render(); },

    'seg': function (el) {
      var name = el.getAttribute('data-seg'), val = el.getAttribute('data-val');
      if (name in v) { v[name] = val; render(); }
    },

    'toggle-theme': function () {
      U.setTheme(U.getTheme() === 'dark' ? 'light' : 'dark');
      render();
      U.syncThemeColor();
    },

    /* 数据 */
    'export': function () { U.download('kaoyan-backup-' + U.todayISO() + '.json', S.rawJSON()); U.toast('已导出备份', 'ok'); },
    'import': function () { document.getElementById('importFile').click(); },
    'open-standalone': function () {
      var w = null;
      try { w = window.open(location.href, '_blank'); } catch (e) { }
      if (!w) U.toast('浏览器拦截了新标签页，请手动打开这个文件', 'err');
    },
    'load-demo': function () {
      U.confirmBox('加载示例数据', '当前数据会被示例数据覆盖（建议先导出备份）。确定加载吗？', function () {
        S.loadDemo(); render(); U.toast('已加载示例数据', 'ok');
      }, '确认加载');
    },
    'clear-all': function () {
      U.confirmBox('清空所有数据', '任务、时长、模考、错题、资料、目标设置都会清空，且不可撤销。确定吗？', function () {
        S.clearAll(); render(); U.toast('已清空，回到全新状态', 'ok');
      }, '确认清空');
    }
  };

  function pick(coll, el) {
    var id = el && el.getAttribute ? el.getAttribute('data-id') : null;
    return S.all()[coll].filter(function (x) { return x.id === id; })[0];
  }
  function onAction(el) {
    var fn = ACT[el.getAttribute('data-act')];
    if (fn) { fn(el); return true; }
    return false;
  }
  function nearestAction(target) {
    var el = target;
    while (el && el !== document && el.nodeType === 1) {
      if (el.hasAttribute && el.hasAttribute('data-act')) return el;
      el = el.parentNode;
    }
    return null;
  }

  document.addEventListener('click', function (e) {
    var el = nearestAction(e.target);
    if (!el) return;
    if (onAction(el)) e.preventDefault();
  });

  /* 键盘：N 新建任务，1-9 切页，Esc 关弹窗 */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.metaKey || e.ctrlKey || e.altKey) return;
    var modalOpen = !document.getElementById('modal').hidden;
    if (e.key === 'Escape' && modalOpen) { U.closeModal(); return; }
    if (modalOpen) return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); taskForm(null, v.page === 'plan' ? v.planDate : U.todayISO()); return; }
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= TABS.length) go(TABS[n - 1].id);
  });

  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'importFile') {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          S.replace(JSON.parse(String(reader.result)));
          render(); U.toast('导入成功', 'ok');
        } catch (err) { U.toast('导入失败：文件格式不正确', 'err'); }
      };
      reader.readAsText(f);
      e.target.value = '';
    }
  });

  /* ---------------- 启动 ---------------- */
  U.setTheme(U.getTheme());
  U.syncThemeColor();
  S.load();
  var hash = (location.hash || '').replace('#', '');
  if (TABS.filter(function (t) { return t.id === hash; }).length) v.page = hash;
  window.addEventListener('hashchange', function () {
    var h = (location.hash || '').replace('#', '');
    if (h !== v.page && TABS.filter(function (t) { return t.id === h; }).length) { v.page = h; render(); }
  });
  render();
})();
