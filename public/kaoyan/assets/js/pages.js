/* ============================================================
   pages.js —— 页面视图（返回 HTML；交互由 app.js 委托处理）
   说明：页面上出现的每个数字都来自 Store，没有任何写死的业务数据。
   ============================================================ */
window.Pages = (function () {
  var U = window.U, S = window.Store, UI = window.UI, C = window.Charts;
  function esc(s) { return U.esc(s); }
  function subs() { return S.all().subjects; }

  /* ============ 首页 ============ */
  var Home = {
    render: function (v) {
      var s = S.all(), st = s.settings;
      var goal = S.dailyGoal();
      var mins = S.sessionMinutes(U.todayISO());
      var wk = S.weekStats();
      var todayTasks = S.decorateTasks(S.tasksOn(U.todayISO()));
      var doneToday = todayTasks.filter(function (t) { return t._done; }).length;
      var overdue = S.decorateTasks(s.tasks).filter(function (t) { return t._overdue; });
      var dueMistakes = S.mistakesDue();
      var ov = S.overall();
      var latest = S.latestMock();
      var trend = S.mocksSorted();
      var cd = S.countdown();

      /* --- 倒计时 --- */
      var countCard;
      if (cd.set) {
        var ringPct = cd.days > 0 ? U.clamp(Math.round(100 - cd.days / 3), 6, 100) : 100;
        countCard = '<div class="card count-card">' +
          '<div>' +
          '<div class="count-card__lab">距离 ' + esc(U.fmt(cd.date)) + ' 考研还有</div>' +
          '<div class="count-card__big num"><b>' + cd.days + '</b><span>天</span></div>' +
          '<div class="count-card__meta"><span>约 <em>' + Math.max(0, Math.floor(cd.days / 7)) + '</em> 周</span>' +
          '<span>今日已学 <em>' + (mins / 60).toFixed(1) + '</em> 小时</span>' +
          '<span>周完成率 <em>' + wk.rate + '%</em></span></div>' +
          (st.motto ? '<div class="count-card__tips">' + esc(st.motto) + '</div>' : '') +
          '</div>' +
          '<div style="text-align:center">' + C.ring(ringPct, { label: wk.rate + '%', size: 108 }) +
          '<div class="faint" style="font-size:11px;margin-top:2px">本周任务完成率</div></div>' +
          '</div>';
      } else {
        countCard = '<div class="card count-card">' +
          '<div>' +
          '<div class="count-card__lab">还没有设置考试日期</div>' +
          '<div class="count-card__big num"><b>—</b><span>天</span></div>' +
          '<div class="text-muted" style="font-size:12.5px">填上考试日期，倒计时和剩余周数会自动算出来</div>' +
          '</div>' +
          '<button class="btn btn--primary" data-act="edit-settings">去设置</button>' +
          '</div>';
      }

      /* --- 目标 --- */
      var goalCard = '<div class="card goal-card">' +
        '<div class="card__head" style="margin:0"><div class="card__title"><span class="dot"></span>备考目标</div>' +
        '<button class="link" data-act="edit-profile">修改</button></div>' +
        '<div>' +
        (st.school ? '<div class="v">' + esc(st.school) + '</div>' : '<div class="v faint">还没填目标院校</div>') +
        (st.major ? '<div class="muted" style="font-size:12.5px">' + esc(st.major) + '</div>' : '') +
        '</div>' +
        '<div class="goal-row"><span class="k">目标分数</span><span class="goal-score"><b class="num">' + (ov.target || '—') + '</b>' + (ov.target ? '<span>分</span>' : '') + '</span></div>' +
        (ov.target ? '<div>' + C.progressBar(ov.rate) +
          '<div class="spread" style="margin-top:6px;font-size:11.5px"><span class="muted">当前四科合计 <b class="num" style="color:var(--ink-2)">' + ov.current + '</b> 分</span>' +
          '<span style="color:var(' + (ov.gap > 0 ? '--warn' : '--success') + ')">' + (ov.gap > 0 ? '还差 ' + ov.gap + ' 分' : '已达成目标 🎉') + '</span></div></div>'
          : '<div class="faint" style="font-size:12px">设置目标分数后可以看到差距</div>') +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="btn btn--sm" data-act="edit-settings">调整目标</button>' +
        '<button class="btn btn--sm" data-act="go" data-page="subjects">改单科分数</button>' +
        '</div></div>';

      /* --- 今日任务 --- */
      var tasksCard = '<div class="card">' +
        '<div class="card__head"><div class="card__title"><span class="dot"></span>今日任务' +
        (todayTasks.length ? '<span class="faint num" style="font-weight:400">' + doneToday + '/' + todayTasks.length + '</span>' : '') + '</div>' +
        '<button class="link" data-act="go" data-page="plan">计划页 →</button></div>' +
        (todayTasks.length ? '<div class="progress" style="margin-bottom:8px"><i style="width:' + Math.round(doneToday / todayTasks.length * 100) + '%"></i></div>' : '') +
        UI.taskList(todayTasks, { date: U.todayISO() }) +
        (todayTasks.length ? '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' +
          '<button class="btn btn--sm btn--primary" data-act="add-task">' + U.icon('plus', 'ico--sm') + '添加任务</button>' +
          '<button class="btn btn--sm" data-act="add-session">' + U.icon('clock', 'ico--sm') + '记录时长</button>' +
          '</div>' : '') +
        '</div>';

      /* --- 学习时长（近 7 天） --- */
      var days7 = [];
      for (var i = 6; i >= 0; i--) days7.push(U.addDays(U.todayISO(), -i));
      var mins7 = days7.map(function (d) { return S.sessionMinutes(d); });
      var weekTotal = U.sum(mins7);
      var timeCard = '<div class="card">' +
        '<div class="card__head"><div class="card__title"><span class="dot"></span>学习时长</div>' +
        '<button class="link" data-act="add-session">+ 记录</button></div>' +
        '<div class="spread" style="align-items:flex-end">' +
        '<div><div class="stat__v num">' + (mins / 60).toFixed(1) + '<small>小时 · 今日</small></div>' +
        '<div class="stat__f">目标 ' + (goal / 60).toFixed(1) + ' 小时</div></div>' +
        '<div style="text-align:right"><div class="num" style="font-size:13px;font-weight:650">' + (weekTotal / 60).toFixed(1) + ' 小时</div>' +
        '<div class="faint" style="font-size:11px">近 7 天合计</div></div></div>' +
        '<div style="margin-top:12px">' + C.bars(days7.map(function (d, idx) {
          return { label: U.WD[U.parseDate(d).getDay()].slice(1), value: mins7[idx], on: d === U.todayISO(), title: U.fmt(d) + ' ' + mins7[idx] + ' 分钟' };
        }), { height: 58 }) + '</div>' +
        '<div class="faint" style="font-size:11px;margin-top:8px">已记录 ' + s.sessions.length + ' 条 · 点此处数字可改</div>' +
        '<div style="margin-top:8px"><button class="btn btn--sm btn--block" data-act="manage-sessions">管理时长记录</button></div>' +
        '</div>';

      /* --- 本周完成率 --- */
      var rateCard = '<div class="card">' +
        '<div class="card__head"><div class="card__title"><span class="dot"></span>本周完成率</div>' +
        (wk.total ? '<span class="card__sub">' + U.fmtShort(wk.dates[0]) + ' - ' + U.fmtShort(wk.dates[6]) + '</span>' : '') + '</div>' +
        (wk.total ? '<div class="donut-wrap">' +
          C.donut([{ value: wk.done, cssVar: '--success' }, { value: Math.max(0, wk.total - wk.done), cssVar: '--line-2' }],
            { size: 112, stroke: 14, center: wk.rate + '%', centerSub: '完成率' }) +
          '<div class="legend" style="flex:1;min-width:110px">' +
          UI.legendItem('--success', '已完成', wk.done + ' 项') +
          UI.legendItem('--warn', '待完成', Math.max(0, wk.total - wk.done) + ' 项') +
          UI.legendItem('--line', '逾期', overdue.length + ' 项') +
          '</div></div>' +
          '<div class="faint" style="font-size:11.5px;margin-top:10px">' +
          (wk.rate >= 85 ? '保持住，这个节奏很稳。' : wk.rate >= 60 ? '稳步推进，注意补齐落后科目。' : '节奏偏慢，先保证每天的核心任务。') + '</div>'
          : UI.emptyBox('本周还没有任务', '任务来自「计划」页，先安排几件要做的事',
            '<button class="btn btn--sm btn--primary" data-act="add-task">' + U.icon('plus', 'ico--sm') + '添加任务</button>')) +
        '</div>';

      /* --- 四科进度 --- */
      var subjCard = '<div class="card">' +
        '<div class="card__head"><div class="card__title"><span class="dot"></span>四科进度总览</div>' +
        '<button class="link" data-act="go" data-page="subjects">科目详情 →</button></div>' +
        '<div class="subject-grid">' + subs().map(function (s) { return UI.subjectCard(s); }).join('') + '</div>' +
        '<div class="faint" style="font-size:11.5px;margin-top:10px">科目名称、满分、目标分都可以在「科目」页修改</div>' +
        '</div>';

      /* --- 最近模考 --- */
      var mockCard = '<div class="card">' +
        '<div class="card__head"><div class="card__title"><span class="dot"></span>最近一次模考</div>' +
        '<button class="link" data-act="go" data-page="mocks">全部 →</button></div>' +
        (latest ? '<div class="spread" style="align-items:flex-end">' +
          '<div><div class="faint" style="font-size:11.5px">' + esc(latest.name || U.fmt(latest.date)) + ' · 总分</div>' +
          '<div class="stat__v num" style="font-size:30px">' + latest._total + '<small>分</small></div>' +
          (ov.target ? '<div style="font-size:11.5px;color:var(' + (latest._total >= ov.target ? '--success' : '--warn') + ')">' +
            (latest._total >= ov.target ? '已达目标线' : '距离目标还差 ' + (ov.target - latest._total) + ' 分') + '</div>' : '') +
          '</div>' +
          '<div class="faint" style="font-size:11.5px;text-align:right">历史最高 <b class="num" style="color:var(--ink-2)">' + S.bestMockTotal() + '</b> 分<br>共 ' + trend.length + ' 次模考</div>' +
          '</div>' +
          '<div class="donut-wrap" style="margin-top:12px">' +
          C.donut(subs().map(function (m) { return { value: U.num(latest.scores[m.id]), cssVar: '--c-' + m.color }; }),
            { size: 112, stroke: 15, center: String(latest._total), centerSub: '总分' }) +
          '<div class="legend" style="flex:1;min-width:130px">' + subs().map(function (m) {
            return UI.legendItem('--c-' + m.color, m.name, U.num(latest.scores[m.id]));
          }).join('') + '</div></div>'
          : UI.emptyBox('还没有模考记录', '做一次模考，把分数记下来就能看趋势',
            '<button class="btn btn--sm btn--primary" data-act="add-mock">' + U.icon('plus', 'ico--sm') + '记录模考</button>')) +
        '</div>';

      /* --- 总分趋势 --- */
      var trendCard = '<div class="card">' +
        '<div class="card__head"><div class="card__title"><span class="dot"></span>总分趋势</div>' +
        (ov.target ? '<span class="card__sub">目标 ' + ov.target + ' 分</span>' : '') + '</div>' +
        (trend.length > 1 ? C.line({
          labels: trend.map(function (m) { return m.name || U.fmtShort(m.date); }),
          series: [{ values: trend.map(function (m) { return m._total; }), showValues: true }],
          height: 180, min: Math.max(0, Math.min.apply(null, trend.map(function (m) { return m._total; })) - 30)
        }) : UI.emptyBox('趋势还不够画', '至少记录两次模考才能看出走势')) +
        '</div>';

      /* --- 今日复盘 --- */
      var note = S.reviewNote(U.todayISO());
      var noteCard = '<div class="card">' +
        '<div class="card__head"><div class="card__title"><span class="dot"></span>今日复盘</div>' +
        '<div style="display:flex;gap:8px;align-items:center"><span class="card__sub">' + U.fmtCn(U.todayISO()) + ' ' + U.weekday(U.todayISO()) + '</span>' +
        '<button class="link" data-act="edit-note">' + (note ? '修改' : '写一句') + '</button></div></div>' +
        '<div class="grid grid-3" style="gap:10px">' +
        UI.miniStat('完成任务', doneToday + '/' + todayTasks.length, '项') +
        UI.miniStat('学习时长', (mins / 60).toFixed(1), '小时') +
        UI.miniStat('待复习错题', String(dueMistakes.length), '道') +
        '</div>' +
        (note ? '<div class="notebox">' + esc(note) + '</div>' : '') +
        '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' +
        '<button class="btn btn--sm" data-act="add-mistake">' + U.icon('alert', 'ico--sm') + '记错题</button>' +
        '<button class="btn btn--sm" data-act="go" data-page="mistakes">错题本</button>' +
        '<button class="btn btn--sm" data-act="go" data-page="review">复盘报告</button>' +
        '</div></div>';

      /* --- 全部模块快捷入口（手机端主要靠这里跳转） --- */
      var ENTRY = [
        { page: 'plan', icon: 'calendar', label: '学习计划' },
        { page: 'subjects', icon: 'chart', label: '科目进度' },
        { page: 'papers', icon: 'doc', label: '真题管理' },
        { page: 'mistakes', icon: 'alert', label: '错题薄弱' },
        { page: 'mocks', icon: 'exam', label: '模考成绩' },
        { page: 'resources', icon: 'box', label: '资料库' },
        { page: 'review', icon: 'bulb', label: '复盘' },
        { page: 'settings', icon: 'gear', label: '设置' }
      ];
      var entryCard = '<div class="card"><div class="card__head"><div class="card__title"><span class="dot"></span>全部模块</div></div>' +
        '<div class="entry-grid">' + ENTRY.map(function (e) {
          return '<button class="entry" data-act="go" data-page="' + e.page + '">' +
            '<span class="entry__ico">' + U.icon(e.icon) + '</span><span>' + e.label + '</span></button>';
        }).join('') + '</div></div>';

      /* --- 首次使用的引导 --- */
      var welcome = '';
      if (!S.hasAnyData()) {
        welcome = '<div class="card welcome">' +
          '<div class="welcome__t">欢迎使用考研备考工作台</div>' +
          '<div class="welcome__s">这里没有任何预填数据，所有内容都由你自己填。建议按这个顺序开始：</div>' +
          '<ol class="welcome__l">' +
          '<li><b>设置考试日期和目标分数</b>（倒计时与差距靠它）</li>' +
          '<li><b>改四科的科目名、满分和单科目标</b>（默认是英语/政治/数学/专业课）</li>' +
          '<li><b>添加今天的任务</b>（可设截止时间、优先级）</li>' +
          '</ol>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn btn--primary" data-act="edit-settings">' + U.icon('target', 'ico--sm') + '先设置考试与目标</button>' +
          '<button class="btn" data-act="go" data-page="subjects">改科目分类</button>' +
          '<button class="btn" data-act="add-task">加第一个任务</button>' +
          '<button class="btn" data-act="load-demo">加载示例数据看看效果</button>' +
          '</div></div>';
      }

      return '<div class="page">' + welcome +
        '<div class="grid grid-main">' + countCard + goalCard + '</div>' +
        '<div class="grid grid-4">' +
        UI.statCard({ k: '今日学习', v: (mins / 60).toFixed(1), unit: '小时', icon: 'clock', f: '目标 ' + (goal / 60).toFixed(1) + ' 小时 · 达成 ' + Math.round(mins / goal * 100) + '%', bar: mins / goal * 100, color: '--primary' }) +
        UI.statCard({ k: '本周完成率', v: wk.rate, unit: '%', icon: 'target', f: wk.total ? wk.done + '/' + wk.total + ' 项任务已完成' : '本周还没有任务', bar: wk.rate, color: '--success' }) +
        UI.statCard({ k: '今日剩余任务', v: Math.max(0, todayTasks.length - doneToday), unit: '项', icon: 'calendar', f: overdue.length ? '另有 ' + overdue.length + ' 项逾期' : '暂无逾期任务', bar: todayTasks.length ? (todayTasks.length - doneToday) / todayTasks.length * 100 : 0, color: '--warn' }) +
        UI.statCard({ k: '错题待复习', v: dueMistakes.length, unit: '道', icon: 'alert', f: '共记录 ' + s.mistakes.length + ' 道错题', bar: s.mistakes.length ? dueMistakes.length / s.mistakes.length * 100 : 0, color: '--danger' }) +
        '</div>' +
        '<div class="grid grid-3">' + tasksCard + timeCard + rateCard + '</div>' +
        subjCard +
        '<div class="grid grid-2">' + mockCard + trendCard + '</div>' +
        noteCard + entryCard +
        '</div>';
    }
  };

  /* ============ 学习计划 ============ */
  var Plan = {
    render: function (v) {
      var today = U.todayISO();
      var mon = U.mondayOf(U.parseDate(v.planMonday) || new Date());
      var week = U.weekDates(mon);
      var sel = v.planDate || today;
      var weekTasks = S.decorateTasks(S.tasksBetween(week[0], week[6]));
      var selTasks = S.decorateTasks(S.tasksOn(sel));
      var selDone = selTasks.filter(function (t) { return t._done; }).length;

      var days = '<div class="days">' + week.map(function (d) {
        var list = S.tasksOn(d);
        var done = list.filter(function (t) { return t.status === 'done'; }).length;
        var pips = list.length ? '<div class="day__pip">' + list.slice(0, 5).map(function (t) {
          return '<i class="' + (t.status === 'done' ? 'on' : '') + '"></i>';
        }).join('') + '</div>' : '<div class="day__pip"><i></i></div>';
        return '<button class="day' + (d === sel ? ' is-on' : '') + (d === today ? ' is-today' : '') + '" data-act="pick-day" data-date="' + d + '">' +
          '<div class="day__w">' + U.WD[U.parseDate(d).getDay()] + '</div>' +
          '<div class="day__d num">' + U.parseDate(d).getDate() + '</div>' +
          '<div class="day__n">' + (list.length ? done + '/' + list.length : '—') + '</div>' + pips + '</button>';
      }).join('') + '</div>';

      var weekBar = C.bars(week.map(function (d) {
        var list = S.tasksOn(d);
        var done = list.filter(function (t) { return t.status === 'done'; }).length;
        return { label: U.WD[U.parseDate(d).getDay()].slice(1), value: done, on: d === today, title: U.fmt(d) + ' 完成 ' + done + '/' + list.length };
      }), { height: 54 });

      var subjTable = UI.table([
        { label: '科目', render: function (r) { return UI.subjectChip(r.s.id); } },
        { label: '本周任务', align: 'c', render: function (r) { return '<span class="num">' + r.list.length + '</span>'; } },
        { label: '已完成', align: 'c', render: function (r) { return '<span class="num">' + r.done + '</span>'; } },
        { label: '完成率', render: function (r) { return C.progressBar(r.list.length ? r.done / r.list.length * 100 : 0, '--c-' + r.s.color); } },
        { label: '进度', align: 'r', render: function (r) { return UI.pctChip(r.s.progress); } }
      ], subs().map(function (s) {
        var list = weekTasks.filter(function (t) { return t.subject === s.id; });
        return { s: s, list: list, done: list.filter(function (t) { return t._done; }).length };
      }));

      var todaySessions = S.sessionsOn(today);
      var goal = S.dailyGoal();
      var mins = S.sessionMinutes(today);
      var sessCard = '<div class="card">' +
        '<div class="card__head"><div class="card__title"><span class="dot"></span>今日学习时长</div>' +
        '<button class="link" data-act="add-session">+ 记录</button></div>' +
        '<div class="spread" style="align-items:flex-end">' +
        '<div class="stat__v num">' + (mins / 60).toFixed(1) + '<small>小时</small></div>' +
        '<div class="faint" style="font-size:11.5px">目标 ' + (goal / 60).toFixed(1) + ' 小时 · 达成 ' + Math.round(mins / goal * 100) + '%</div>' +
        '</div>' +
        '<div class="progress" style="margin:8px 0 12px"><i style="width:' + U.clamp(mins / goal * 100, 0, 100) + '%"></i></div>' +
        (todaySessions.length ? '<div class="task-list">' + todaySessions.map(UI.sessionRow).join('') + '</div>'
          : UI.emptyBox('今天还没记录时长', '学完一段就记一笔，复盘时才有依据',
            '<button class="btn btn--sm btn--primary" data-act="add-session">记录时长</button>')) +
        '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' +
        '<button class="btn btn--sm btn--primary" data-act="add-session">' + U.icon('clock', 'ico--sm') + '记录时长</button>' +
        '<button class="btn btn--sm" data-act="edit-goal">改每日目标（' + goal + ' 分钟）</button>' +
        '</div></div>';

      var note = S.reviewNote(today);
      var reviewCard = '<div class="card">' +
        '<div class="card__head"><div class="card__title"><span class="dot"></span>今日复盘</div>' +
        '<button class="link" data-act="edit-note">' + (note ? '修改' : '写一句') + '</button></div>' +
        (note ? '<div class="notebox">' + esc(note) + '</div>'
          : '<div class="faint" style="font-size:12.5px">今天完成了什么、卡在哪、明天先做哪件——三行就够。</div>') +
        '</div>';

      return '<div class="page">' +
        UI.pageHead('学习计划', '按周安排，任务可设截止日期、优先级和完成状态',
          '<button class="btn btn--sm btn--primary" data-act="add-task" data-date="' + sel + '">' + U.icon('plus', 'ico--sm') + '添加任务</button>') +
        '<div class="card">' +
        UI.toolRow(
          '<button class="btn btn--sm" data-act="week-move" data-delta="-7">← 上一周</button>' +
          '<button class="btn btn--sm" data-act="week-move" data-delta="7">下一周 →</button>' +
          '<button class="btn btn--sm" data-act="week-today">本周</button>',
          '<span class="card__sub">' + U.fmt(week[0]) + ' - ' + U.fmt(week[6]) + ' · 完成 ' + weekTasks.filter(function (t) { return t._done; }).length + '/' + weekTasks.length + '</span>') +
        '<div style="margin-top:14px">' + days + '</div>' +
        '<div style="margin-top:14px">' + weekBar + '</div>' +
        '</div>' +
        '<div class="card">' +
        '<div class="card__head"><div class="card__title"><span class="dot"></span>' +
        U.fmtCn(sel) + ' ' + U.weekday(sel) + (sel === today ? ' · 今天' : '') + '</div>' +
        '<span class="card__sub">' + selDone + '/' + selTasks.length + ' 项完成</span></div>' +
        UI.taskList(selTasks, { date: sel }) +
        '</div>' +
        '<div class="grid grid-2">' + sessCard + reviewCard + '</div>' +
        '<div class="card"><div class="card__head"><div class="card__title"><span class="dot"></span>本周各科安排</div>' +
        '<span class="card__sub">只统计本周有任务的科目</span></div>' + subjTable + '</div>' +
        '</div>';
    }
  };

  /* ============ 科目进度 ============ */
  var Subjects = {
    render: function (v) {
      var rows = S.progressTable();
      var totalScore = U.sum(rows, function (r) { return r.data.score; });
      var target = U.num(S.all().settings.targetScore);
      var sumTarget = U.sum(rows, function (r) { return r.target; });
      var avgProgress = Math.round(U.sum(rows, function (r) { return r.data.progress; }) / (rows.length || 1));

      var cards = '<div class="subject-grid">' + rows.map(function (r) {
        return UI.subjectCard(r.data, {
          footer: '<div class="subject__extra">' +
            '<span>错题 ' + r.mistakeCount + '</span><span>真题 ' + r.paperCount + '</span><span>资料 ' + r.resourceCount + '</span><span>近期完成 ' + r.weekRate + '%</span></div>' +
            '<button class="btn btn--sm btn--block" data-act="edit-subject" data-id="' + r.meta.id + '">编辑科目与分数</button>'
        });
      }).join('') + '</div>';

      var table = UI.table([
        { label: '科目', render: function (r) { return '<b>' + esc(r.meta.name) + '</b> <span class="faint">' + esc(r.meta.full || '') + '</span>'; } },
        { label: '当前 / 目标', align: 'c', render: function (r) { return '<span class="num" style="font-weight:650">' + U.num(r.data.score) + '</span> <span class="faint">/ ' + r.target + '（满分 ' + U.num(r.data.max) + '）</span>'; } },
        { label: '达成率', align: 'c', render: function (r) { return '<span class="num">' + (r.target ? Math.round(U.num(r.data.score) / r.target * 100) : 0) + '%</span>'; } },
        { label: '复习进度', render: function (r) { return C.progressBar(r.data.progress, '--c-' + r.data.color); } },
        { label: '薄弱点', render: function (r) { return (r.data.weak || []).map(function (w) { return '<span class="chip">' + esc(w) + '</span>'; }).join(' ') || '<span class="faint">—</span>'; } },
        { label: '操作', align: 'r', render: function (r) { return '<button class="btn btn--sm" data-act="edit-subject" data-id="' + r.meta.id + '">编辑</button>'; } }
      ], rows);

      var mockRows = S.mocksSorted().slice(-5).reverse();
      var mockTable = mockRows.length ? UI.table(
        [{ label: '模考', render: function (m) { return esc(m.name || U.fmt(m.date)); } }]
          .concat(subs().map(function (sub) {
            return { label: sub.name, align: 'c', render: function (m) { return '<span class="num">' + U.num(m.scores[sub.id]) + '</span>'; } };
          }))
          .concat([{ label: '总分', align: 'c', render: function (m) { return '<span class="num tb__total">' + m._total + '</span>'; } }]),
        mockRows) : UI.emptyBox('暂无模考记录', '到「模考」页记录一次，这里会自动生成对比表');

      return '<div class="page">' +
        UI.pageHead('科目进度', '科目名称、满分、单科目标都可以点「编辑」修改',
          '<button class="btn btn--sm" data-act="edit-settings">目标总分设置</button>') +
        '<div class="grid grid-4">' +
        UI.statCard({ k: '四科合计', v: totalScore, unit: '分', icon: 'chart', f: (target ? '目标 ' + target + ' 分 · ' + (target - totalScore > 0 ? '还差 ' + (target - totalScore) + ' 分' : '已达成') : '还没设置目标总分'), bar: target ? Math.round(totalScore / target * 100) : 0, color: '--primary' }) +
        UI.statCard({ k: '单科目标合计', v: sumTarget, unit: '分', icon: 'target', f: '四科目标分之和', bar: U.clamp(sumTarget / Math.max(1, target || sumTarget) * 100, 0, 100), color: '--success' }) +
        UI.statCard({ k: '平均复习进度', v: avgProgress, unit: '%', icon: 'flame', f: '按章节/讲次估算，可自行修改', bar: avgProgress, color: '--warn' }) +
        UI.statCard({ k: '薄弱点', v: U.sum(rows, function (r) { return (r.data.weak || []).length; }), unit: '个', icon: 'alert', f: '已登记的待突破知识点', bar: 45, color: '--danger' }) +
        '</div>' +
        cards +
        '<div class="card"><div class="card__head"><div class="card__title"><span class="dot"></span>四科明细</div>' +
        '<span class="card__sub">达成率 = 当前分 / 单科目标分</span></div>' + table + '</div>' +
        '<div class="card"><div class="card__head"><div class="card__title"><span class="dot"></span>最近 5 次模考分科对比</div>' +
        '<button class="link" data-act="go" data-page="mocks">全部 →</button></div>' + mockTable + '</div>' +
        '</div>';
    }
  };

  /* ============ 真题管理 ============ */
  var Papers = {
    render: function (v) {
      var all = S.all().papers.slice();
      var list = all.filter(function (p) {
        if (v.paperSubject !== 'all' && p.subject !== v.paperSubject) return false;
        if (v.paperStatus !== 'all' && p.progress !== v.paperStatus) return false;
        return true;
      }).sort(function (a, b) { return U.num(b.year) - U.num(a.year); });

      var stat = { todo: 0, doing: 0, done: 0 };
      all.forEach(function (p) { stat[p.progress] = (stat[p.progress] || 0) + 1; });

      var table = list.length ? UI.table([
        { label: '资料名称', render: function (p) { return '<b>' + esc(p.name) + '</b>' + (p.note ? '<div class="faint" style="font-size:11.5px">' + esc(p.note) + '</div>' : ''); } },
        { label: '科目', render: function (p) { return UI.subjectChip(p.subject); } },
        { label: '年份', align: 'c', render: function (p) { return '<span class="num">' + U.num(p.year) + '</span>'; } },
        { label: '类型', align: 'c', render: function (p) { return esc(p.type || '—'); } },
        { label: '状态', align: 'c', render: function (p) { return UI.statusChip(p.progress); } },
        { label: '操作', align: 'r', render: function (p) {
          return '<button class="btn btn--sm" data-act="cycle-paper" data-id="' + p.id + '">' +
            (p.progress === 'done' ? '撤回' : p.progress === 'doing' ? '标记完成' : '开始') + '</button>' +
            '<button class="icon-btn" data-act="edit-paper" data-id="' + p.id + '" title="编辑">' + U.icon('edit', 'ico--sm') + '</button>' +
            '<button class="icon-btn icon-btn--danger" data-act="del-paper" data-id="' + p.id + '" title="删除">' + U.icon('trash', 'ico--sm') + '</button>';
        } }
      ]) : UI.emptyBox(all.length ? '没有符合条件的资料' : '还没有登记真题 / 习题',
        all.length ? '换个筛选条件看看' : '把要刷的真题、习题、讲义都登记进来，进度一目了然',
        '<button class="btn btn--sm btn--primary" data-act="add-paper">' + U.icon('plus', 'ico--sm') + '新增</button>');

      return '<div class="page">' +
        UI.pageHead('真题管理', '真题、模拟题、习题的完成情况',
          '<button class="btn btn--sm btn--primary" data-act="add-paper">' + U.icon('plus', 'ico--sm') + '新增</button>') +
        '<div class="grid grid-4">' +
        UI.statCard({ k: '登记总数', v: all.length, unit: '份', icon: 'doc', f: '覆盖 ' + subs().filter(function (s) { return all.some(function (p) { return p.subject === s.id; }); }).length + ' 个科目', bar: all.length ? 100 : 0, color: '--primary' }) +
        UI.statCard({ k: '进行中', v: stat.doing || 0, unit: '份', icon: 'flame', f: '当前主力', bar: all.length ? (stat.doing || 0) / all.length * 100 : 0, color: '--warn' }) +
        UI.statCard({ k: '已完成', v: stat.done || 0, unit: '份', icon: 'check', f: '记得二刷错题', bar: all.length ? (stat.done || 0) / all.length * 100 : 0, color: '--success' }) +
        UI.statCard({ k: '未开始', v: stat.todo || 0, unit: '份', icon: 'box', f: '排进计划表', bar: all.length ? (stat.todo || 0) / all.length * 100 : 0, color: '--faint' }) +
        '</div>' +
        '<div class="card">' +
        UI.toolRow(
          UI.segmented('paperSubject', [{ value: 'all', label: '全部科目' }].concat(subs().map(function (m) { return { value: m.id, label: m.name }; })), v.paperSubject) +
          UI.segmented('paperStatus', [{ value: 'all', label: '全部' }, { value: 'todo', label: '未开始' }, { value: 'doing', label: '进行中' }, { value: 'done', label: '已完成' }], v.paperStatus),
          '<span class="card__sub">' + list.length + ' 份</span>') +
        '<div style="margin-top:12px">' + table + '</div>' +
        '</div></div>';
    }
  };

  /* ============ 模考成绩 ============ */
  var Mocks = {
    render: function (v) {
      var rows = S.mocksSorted();
      var latest = rows[rows.length - 1] || null;
      var tag = U.num(S.all().settings.targetScore);

      var table = rows.length ? UI.table(
        [{ label: '模考', render: function (m) { return '<b>' + esc(m.name || U.fmt(m.date)) + '</b><div class="faint" style="font-size:11.5px">' + U.fmt(m.date) + '</div>'; } }]
          .concat(subs().map(function (sub) {
            return { label: sub.name, align: 'c', render: function (m) { return '<span class="num">' + U.num(m.scores[sub.id]) + '</span>'; } };
          }))
          .concat([
            { label: '总分', align: 'c', render: function (m) { return '<span class="num tb__total" style="color:' + (tag && m._total >= tag ? 'var(--success)' : 'var(--ink)') + '">' + m._total + '</span>'; } },
            { label: '距目标', align: 'c', render: function (m) {
              if (!tag) return '<span class="faint">—</span>';
              var g = tag - m._total;
              return '<span class="chip chip--' + (g > 0 ? 'warn' : 'success') + '">' + (g > 0 ? '-' + g : '+' + Math.abs(g)) + '</span>';
            } },
            { label: '备注', render: function (m) { return '<span class="faint" style="font-size:11.5px">' + esc(m.note || '—') + '</span>'; } },
            { label: '操作', align: 'r', render: function (m) {
              return '<button class="icon-btn" data-act="edit-mock" data-id="' + m.id + '" title="编辑">' + U.icon('edit', 'ico--sm') + '</button>' +
                '<button class="icon-btn icon-btn--danger" data-act="del-mock" data-id="' + m.id + '" title="删除">' + U.icon('trash', 'ico--sm') + '</button>';
            } }
          ]), rows.slice().reverse()) : UI.emptyBox('还没有模考记录', '把每次模考的分数记下来，就能看到总分趋势和自己真实的进步',
            '<button class="btn btn--sm btn--primary" data-act="add-mock">' + U.icon('plus', 'ico--sm') + '记录一次模考</button>');

      var chart = rows.length > 1 ? C.line({
        labels: rows.map(function (m) { return m.name || U.fmtShort(m.date); }),
        series: [{ values: rows.map(function (m) { return m._total; }), showValues: true }],
        height: 200, min: Math.max(0, Math.min.apply(null, rows.map(function (m) { return m._total; })) - 30)
      }) : '';

      var avg = rows.length ? Math.round(U.sum(rows, function (m) { return m._total; }) / rows.length) : 0;

      return '<div class="page">' +
        UI.pageHead('模考成绩', '四科分数自己填，总分与差距自动算',
          '<button class="btn btn--sm btn--primary" data-act="add-mock">' + U.icon('plus', 'ico--sm') + '记录模考</button>') +
        '<div class="grid grid-4">' +
        UI.statCard({ k: '最近总分', v: latest ? latest._total : 0, unit: '分', icon: 'exam', f: latest ? (latest.name || U.fmt(latest.date)) : '暂无记录', bar: latest && tag ? Math.round(latest._total / tag * 100) : 0, color: '--primary' }) +
        UI.statCard({ k: '历史最高', v: S.bestMockTotal(), unit: '分', icon: 'chart', f: '共 ' + rows.length + ' 次模考', bar: tag ? Math.round(S.bestMockTotal() / tag * 100) : 0, color: '--success' }) +
        UI.statCard({ k: '平均总分', v: avg, unit: '分', icon: 'target', f: tag ? '目标 ' + tag + ' 分' : '还没设置目标分', bar: tag ? Math.round(avg / tag * 100) : 0, color: '--purple' }) +
        UI.statCard({ k: '进步幅度', v: rows.length > 1 ? (rows[rows.length - 1]._total - rows[0]._total) : 0, unit: '分', icon: 'flame', f: rows.length > 1 ? '相比第一次模考' : '至少记录两次', bar: rows.length > 1 ? U.clamp((rows[rows.length - 1]._total - rows[0]._total) * 2, 0, 100) : 0, color: '--warn' }) +
        '</div>' +
        (chart ? '<div class="card"><div class="card__head"><div class="card__title"><span class="dot"></span>总分趋势</div>' +
          (tag ? '<span class="card__sub">目标线 ' + tag + ' 分</span>' : '') + '</div>' + chart + '</div>' : '') +
        '<div class="card"><div class="card__head"><div class="card__title"><span class="dot"></span>模考记录</div>' +
        '<span class="card__sub">共 ' + rows.length + ' 次</span></div>' + table + '</div>' +
        (latest && subs().length ? '<div class="card"><div class="card__head"><div class="card__title"><span class="dot"></span>分科复盘建议</div>' +
          '<span class="card__sub">按最近一次模考自动生成</span></div>' +
          '<ul class="suglist">' + subs().map(function (m) {
            var sc = U.num(latest.scores[m.id]);
            var rate = sc / m.max;
            var txt = rate >= 0.85 ? '状态很好，保持当前节奏，重点做压轴题。'
              : rate >= 0.7 ? '稳步提升中，巩固错题即可。'
                : rate >= 0.55 ? '需要加练，建议每天固定 1 小时专项。'
                  : '明显薄弱，先回到基础章节重新过一遍。';
            return '<li><b>' + esc(m.name) + '</b> ' + sc + '/' + m.max + '（' + Math.round(rate * 100) + '%）— ' + esc(txt) + '</li>';
          }).join('') + '</ul></div>' : '') +
        '</div>';
    }
  };

  /* ============ 错题薄弱点 ============ */
  var Mistakes = {
    render: function (v) {
      var all = S.decorateMistakes(S.all().mistakes);
      var list = all.filter(function (m) {
        if (v.mistakeSubject !== 'all' && m.subject !== v.mistakeSubject) return false;
        if (v.mistakeView === 'due') return m._due;
        if (v.mistakeView === 'weak') return U.num(m.mastery) <= 2;
        if (v.mistakeView === 'mastered') return U.num(m.mastery) >= 5;
        return true;
      });
      var due = all.filter(function (m) { return m._due; });
      var weak = all.filter(function (m) { return U.num(m.mastery) <= 2; });
      var mastered = all.filter(function (m) { return U.num(m.mastery) >= 5; });

      var topWeak = subs().map(function (m) {
        var items = all.filter(function (x) { return x.subject === m.id; });
        return {
          m: m, count: items.length,
          avg: items.length ? U.sum(items, function (x) { return x.mastery; }) / items.length : 0,
          topics: items.slice(0, 3)
        };
      }).sort(function (a, b) { return b.count - a.count; });

      var listHtml = list.length ? list.map(function (m) { return UI.errorRow(m); }).join('') :
        UI.emptyBox(all.length ? '没有符合条件的错题' : '错题本还是空的',
          all.length ? '换个筛选条件看看' : '每道错题记一句「错在哪」，复习时只看这一句就够了',
          '<button class="btn btn--sm btn--primary" data-act="add-mistake">' + U.icon('plus', 'ico--sm') + '记一道错题</button>');

      return '<div class="page">' +
        UI.pageHead('错题 · 薄弱点', '按遗忘曲线安排复习，掌握度到 5 即视为已掌握',
          '<button class="btn btn--sm btn--primary" data-act="add-mistake">' + U.icon('plus', 'ico--sm') + '记错题</button>') +
        '<div class="grid grid-4">' +
        UI.statCard({ k: '错题总数', v: all.length, unit: '道', icon: 'alert', f: '覆盖 ' + topWeak.filter(function (t) { return t.count; }).length + ' 个科目', bar: all.length ? 100 : 0, color: '--danger' }) +
        UI.statCard({ k: '今日待复习', v: due.length, unit: '道', icon: 'clock', f: due.length ? '按间隔复习法到期' : '今天没有到期错题', bar: all.length ? due.length / all.length * 100 : 0, color: '--warn' }) +
        UI.statCard({ k: '薄弱（掌握≤2）', v: weak.length, unit: '道', icon: 'bulb', f: '需要优先攻克', bar: all.length ? weak.length / all.length * 100 : 0, color: '--primary' }) +
        UI.statCard({ k: '已掌握', v: mastered.length, unit: '道', icon: 'check', f: '掌握度 5/5', bar: all.length ? mastered.length / all.length * 100 : 0, color: '--success' }) +
        '</div>' +
        '<div class="card">' +
        UI.toolRow(
          UI.segmented('mistakeView', [{ value: 'all', label: '全部' }, { value: 'due', label: '待复习' }, { value: 'weak', label: '薄弱点' }, { value: 'mastered', label: '已掌握' }], v.mistakeView) +
          UI.segmented('mistakeSubject', [{ value: 'all', label: '全科' }].concat(subs().map(function (m) { return { value: m.id, label: m.name }; })), v.mistakeSubject),
          (due.length ? '<button class="btn btn--sm btn--primary" data-act="review-all-due">一键复习今日 ' + due.length + ' 道</button>' : '<span class="card__sub">共 ' + list.length + ' 道</span>')) +
        '<div class="err-list">' + listHtml + '</div>' +
        '</div>' +
        '<div class="grid grid-2">' +
        '<div class="card"><div class="card__head"><div class="card__title"><span class="dot"></span>各科薄弱点分布</div></div>' +
        UI.table([
          { label: '科目', render: function (r) { return UI.subjectChip(r.m.id); } },
          { label: '错题数', align: 'c', render: function (r) { return '<span class="num">' + r.count + '</span>'; } },
          { label: '平均掌握度', align: 'c', render: function (r) { return '<span class="num">' + (r.avg ? r.avg.toFixed(1) : '—') + '</span>'; } },
          { label: '高频薄弱点', render: function (r) { return r.topics.map(function (t) { return '<span class="chip">' + esc(t.topic) + '</span>'; }).join(' ') || '<span class="faint">—</span>'; } }
        ], topWeak) +
        '</div>' +
        '<div class="card"><div class="card__head"><div class="card__title"><span class="dot"></span>复习节奏</div>' +
        '<button class="link" data-act="edit-settings">改错因选项</button></div>' +
        '<div class="notelist">' +
        '<div>· 记入错题后按 <b>1 / 3 / 7 / 15 / 30 / 60 天</b> 自动排复习时间。</div>' +
        '<div>· 每点一次「复习 +1」，掌握度 +1，下次复习间隔自动拉长。</div>' +
        '<div>· 掌握度 <b>5/5</b> 后不再出现在待复习列表，但仍可回看。</div>' +
        '<div>· 错因选项可在「设置 → 自定义选项」里改成你自己的分类。</div>' +
        '</div></div></div>' +
        '</div>';
    }
  };

  /* ============ 资料库 ============ */
  var Resources = {
    render: function (v) {
      var all = S.all().resources.slice();
      var list = all.filter(function (r) {
        if (v.resSubject !== 'all' && r.subject !== v.resSubject) return false;
        if (v.resType !== 'all' && r.type !== v.resType) return false;
        return true;
      });
      var avg = all.length ? Math.round(U.sum(all, function (r) { return r.progress; }) / all.length) : 0;
      var byType = Object.keys(S.RES_TYPE).map(function (k) {
        return { key: k, label: S.RES_TYPE[k], count: all.filter(function (r) { return r.type === k; }).length };
      });
      var videoCount = (byType.filter(function (b) { return b.key === 'video'; })[0] || {}).count || 0;
      var docCount = all.length - videoCount;

      var body = list.length ? '<div>' + list.map(UI.resourceRow).join('') + '</div>' :
        UI.emptyBox(all.length ? '没有符合条件的资料' : '资料库还是空的',
          all.length ? '换个筛选条件看看' : '网课、PDF、自己的笔记都可以放进来，随时知道学到哪了',
          '<button class="btn btn--sm btn--primary" data-act="add-resource">' + U.icon('plus', 'ico--sm') + '添加资料</button>');

      return '<div class="page">' +
        UI.pageHead('资料库', '网课、笔记、PDF 的来源与学习进度',
          '<button class="btn btn--sm btn--primary" data-act="add-resource">' + U.icon('plus', 'ico--sm') + '添加</button>') +
        '<div class="grid grid-4">' +
        UI.statCard({ k: '资料总数', v: all.length, unit: '份', icon: 'box', f: '四科共用', bar: all.length ? 100 : 0, color: '--primary' }) +
        UI.statCard({ k: '平均学习进度', v: avg, unit: '%', icon: 'chart', f: '按已学比例估算', bar: avg, color: '--success' }) +
        UI.statCard({ k: '网课 / 视频', v: videoCount, unit: '份', icon: 'link', f: '需要整块时间', bar: all.length ? videoCount / all.length * 100 : 0, color: '--warn' }) +
        UI.statCard({ k: '文档 / 笔记', v: docCount, unit: '份', icon: 'doc', f: '碎片时间可看', bar: all.length ? docCount / all.length * 100 : 0, color: '--purple' }) +
        '</div>' +
        '<div class="card card--pad0">' +
        '<div class="card__inner">' +
        UI.toolRow(
          UI.segmented('resSubject', [{ value: 'all', label: '全科' }].concat(subs().map(function (m) { return { value: m.id, label: m.name }; })), v.resSubject) +
          UI.segmented('resType', [{ value: 'all', label: '全部类型' }].concat(Object.keys(S.RES_TYPE).map(function (k) { return { value: k, label: S.RES_TYPE[k] }; })), v.resType),
          '<span class="card__sub">' + list.length + ' 份</span>') +
        '</div>' +
        '<div class="card__inner" style="padding-top:0">' + body + '</div>' +
        '</div>' +
        '<div class="card"><div class="card__head"><div class="card__title"><span class="dot"></span>使用建议</div>' +
        '<button class="link" data-act="edit-settings">改资料类型</button></div>' +
        '<div class="notelist">' +
        '<div>· 一份资料只记一条，进度按百分比更新，比记「学到第几页」更好坚持。</div>' +
        '<div>· 网课建议配合任务使用：把「看完第 N 讲」写成任务，完成即打勾。</div>' +
        '<div>· 资料类型可在「设置 → 自定义选项」里换成你自己的分类。</div>' +
        '</div></div>' +
        '</div>';
    }
  };

  /* ============ 复盘 ============ */
  var Review = {
    render: function () {
      var s = S.all(), wk = S.weekStats(), cd = S.countdown(), ov = S.overall();
      var rv = S.review();
      var trend = S.mocksSorted();

      var days = [];
      for (var i = 6; i >= 0; i--) days.push(U.addDays(U.todayISO(), -i));
      var minsArr = days.map(function (d) { return S.sessionMinutes(d); });
      var sumMins = U.sum(minsArr);
      var loggedDays = minsArr.filter(function (m) { return m > 0; }).length;
      var bestIdx = minsArr.indexOf(Math.max.apply(null, minsArr));

      var perSubject = subs().map(function (m) {
        var list = S.tasksBetween(wk.dates[0], wk.dates[6]).filter(function (t) { return t.subject === m.id; });
        var done = list.filter(function (t) { return t.status === 'done'; }).length;
        return { m: m, total: list.length, done: done, rate: list.length ? Math.round(done / list.length * 100) : 0, score: m.score, progress: m.progress, target: S.subjectTarget(m.id) };
      });

      var chart = trend.length > 1 ? C.line({
        labels: trend.map(function (m) { return m.name || U.fmtShort(m.date); }),
        series: [{ values: trend.map(function (m) { return m._total; }), showValues: true }],
        height: 190, min: Math.max(0, Math.min.apply(null, trend.map(function (m) { return m._total; })) - 30)
      }) : UI.emptyBox('趋势还不够画', '至少记录两次模考');

      /* 复盘建议：全部根据用户自己的数据生成 */
      var sug = [];
      if (ov.target && ov.gap > 0) sug.push('距离目标分数还差 ' + ov.gap + ' 分' + (cd.set && cd.days > 0 ? '，还有 ' + cd.days + ' 天，平均每天要追约 ' + (ov.gap / cd.days).toFixed(2) + ' 分。' : '，建议先设定考试日期。'));
      if (ov.target && ov.gap === 0) sug.push('四科合计已达到目标分数，重点转向稳定发挥和压轴题。');
      var withTask = perSubject.filter(function (r) { return r.total > 0; });
      if (withTask.length) {
        var slow = withTask.slice().sort(function (a, b) { return a.rate - b.rate; })[0];
        sug.push('本周「' + slow.m.name + '」完成率最低（' + slow.rate + '%），下周优先排它的任务。');
      } else {
        sug.push('本周还没有任务记录，先去「计划」页排 3 件最重要的事。');
      }
      if (rv.due) sug.push('有 ' + rv.due + ' 道错题到了复习时间，建议先清掉再学新内容。');
      if (loggedDays && sumMins / loggedDays < S.dailyGoal()) {
        sug.push('近 7 天有记录的日子平均 ' + (sumMins / loggedDays / 60).toFixed(1) + ' 小时，低于每日目标 ' + (S.dailyGoal() / 60).toFixed(1) + ' 小时。');
      }
      if (!s.tasks.length && !s.mocks.length && !s.mistakes.length) sug.push('目前数据还很少，先坚持记录一周，这里的建议会具体很多。');

      var note = S.reviewNote(U.todayISO());

      return '<div class="page">' +
        UI.pageHead('复盘', '时长、完成率、分数变化，一眼看清',
          '<button class="btn btn--sm" data-act="edit-note">' + (note ? '改今日复盘' : '写今日复盘') + '</button>') +
        '<div class="grid grid-4">' +
        UI.statCard({ k: '本周完成率', v: wk.rate, unit: '%', icon: 'target', f: wk.total ? wk.done + '/' + wk.total + ' 项任务' : '本周还没有任务', bar: wk.rate, color: '--success' }) +
        UI.statCard({ k: '本周时长', v: (wk.minutes / 60).toFixed(1), unit: '小时', icon: 'clock', f: '有记录 ' + S.sessionsBetween(wk.dates[0], wk.dates[6]).length + ' 条', bar: U.clamp(wk.minutes / (S.dailyGoal() * 7) * 100, 0, 100), color: '--primary' }) +
        UI.statCard({ k: '四科合计', v: ov.current, unit: '分', icon: 'chart', f: ov.target ? '目标 ' + ov.target + ' 分' : '还没设目标分', bar: ov.rate, color: '--purple' }) +
        UI.statCard({ k: '剩余天数', v: cd.set ? cd.days : '—', unit: cd.set ? '天' : '', icon: 'calendar', f: cd.set ? '考试 ' + U.fmt(cd.date) : '未设置考试日期', bar: cd.set ? 100 - U.clamp(ov.rate, 0, 100) : 0, color: '--warn' }) +
        '</div>' +
        '<div class="grid grid-2">' +
        '<div class="card"><div class="card__head"><div class="card__title"><span class="dot"></span>近 7 天学习时长</div>' +
        (sumMins ? '<span class="card__sub">最长 ' + (Math.max.apply(null, minsArr) / 60).toFixed(1) + ' 小时 · ' + U.fmtShort(days[bestIdx]) + '</span>' : '') + '</div>' +
        (sumMins ? C.bars(days.map(function (d, i) {
          return { label: U.WD[U.parseDate(d).getDay()].slice(1), value: minsArr[i], on: minsArr[i] >= S.dailyGoal(), title: U.fmt(d) + ' ' + minsArr[i] + ' 分钟' };
        }), { height: 110 }) : UI.emptyBox('还没有学习时长记录', '到「计划」页记一笔就能看到柱状图')) +
        '</div>' +
        '<div class="card"><div class="card__head"><div class="card__title"><span class="dot"></span>总分趋势</div>' +
        (ov.target ? '<span class="card__sub">目标 ' + ov.target + ' 分</span>' : '') + '</div>' + chart + '</div>' +
        '</div>' +
        '<div class="card"><div class="card__head"><div class="card__title"><span class="dot"></span>各科本周表现</div>' +
        '<span class="card__sub">' + U.fmt(wk.dates[0]) + ' - ' + U.fmt(wk.dates[6]) + '</span></div>' +
        UI.table([
          { label: '科目', render: function (r) { return UI.subjectChip(r.m.id, true); } },
          { label: '本周任务', align: 'c', render: function (r) { return '<span class="num">' + r.done + '/' + r.total + '</span>'; } },
          { label: '完成率', render: function (r) { return C.progressBar(r.rate, '--c-' + r.m.color); } },
          { label: '当前 / 目标', align: 'c', render: function (r) { return '<span class="num" style="font-weight:650">' + U.num(r.score) + '</span> <span class="faint">/ ' + r.target + '</span>'; } },
          { label: '复习进度', align: 'r', render: function (r) { return UI.pctChip(r.progress); } }
        ], perSubject) +
        '</div>' +
        '<div class="card"><div class="card__head"><div class="card__title">' + U.icon('bulb') + '下一步建议</div>' +
        '<span class="card__sub">根据你的数据自动生成</span></div>' +
        '<ul class="suglist">' + sug.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
        (note ? '<div class="notebox">' + esc(note) + '</div>' : '') +
        '<div class="faint" style="font-size:11.5px;margin-top:12px">数据截止 ' + U.fmtCn(U.todayISO()) +
        ' · 任务 ' + s.tasks.length + ' 项、时长 ' + s.sessions.length + ' 条、模考 ' + s.mocks.length + ' 次、错题 ' + s.mistakes.length + ' 道、资料 ' + s.resources.length + ' 份</div>' +
        '</div></div>';
    }
  };

  /* ============ 设置 ============ */
  var Settings = {
    render: function () {
      var st = S.all().settings, cd = S.countdown(), ov = S.overall(), warn = S.storageWarn();

      function row(k, v, act, btn, hint) {
        return '<div class="setrow">' +
          '<div><div class="setrow__k">' + esc(k) + '</div>' +
          '<div class="setrow__v">' + (v == null || v === '' ? '<span class="faint">未设置</span>' : esc(v)) + '</div>' +
          (hint ? '<div class="faint" style="font-size:11px">' + esc(hint) + '</div>' : '') + '</div>' +
          '<button class="btn btn--sm" data-act="' + act + '">' + esc(btn) + '</button></div>';
      }

      var subjRows = subs().map(function (s) {
        return '<div class="setrow">' +
          '<div><div class="setrow__k">' + UI.subjectChip(s.id) + ' <span class="faint" style="font-size:11px">' + esc(s.full || '') + '</span></div>' +
          '<div class="setrow__v">满分 ' + U.num(s.max) + ' · 目标 ' + S.subjectTarget(s.id) + ' · 当前 ' + U.num(s.score) + ' · 复习 ' + U.num(s.progress) + '%</div>' +
          '<div class="faint" style="font-size:11px">' + ((s.weak || []).length ? '薄弱点：' + esc((s.weak || []).join('、')) : '未填薄弱点') + '</div></div>' +
          '<button class="btn btn--sm" data-act="edit-subject" data-id="' + s.id + '">编辑</button></div>';
      }).join('');

      return '<div class="page">' +
        UI.pageHead('设置', '所有内容都可以自己改，没有写死的选项') +
        '<div class="card"><div class="card__head"><div class="card__title"><span class="dot"></span>考试与目标</div>' +
        '<button class="link" data-act="edit-settings">修改</button></div>' +
        row('考试日期', cd.set ? U.fmt(cd.date) + '（还剩 ' + cd.days + ' 天）' : '', 'edit-settings', '修改日期') +
        row('目标院校', st.school, 'edit-profile', '修改') +
        row('目标专业', st.major, 'edit-profile', '修改') +
        row('目标总分', st.targetScore ? st.targetScore + ' 分（当前四科合计 ' + ov.current + ' 分）' : '', 'edit-settings', '修改', st.targetScore ? (ov.gap > 0 ? '还差 ' + ov.gap + ' 分' : '已达成') : '') +
        row('每日学习目标', (S.dailyGoal() / 60).toFixed(1) + ' 小时（' + S.dailyGoal() + ' 分钟）', 'edit-goal', '修改') +
        row('单科目标比例', S.all().settings.subjectRatio + '%（满分 × 该比例 = 默认单科目标）', 'edit-settings', '修改') +
        row('给自己的一句话', st.motto, 'edit-settings', '修改') +
        '</div>' +
        '<div class="card"><div class="card__head"><div class="card__title"><span class="dot"></span>四科分类</div>' +
        '<span class="card__sub">名称、满分、目标、分数、薄弱点都可改</span></div>' +
        subjRows +
        '</div>' +
        '<div class="card"><div class="card__head"><div class="card__title"><span class="dot"></span>自定义选项</div></div>' +
        row('错因选项', (st.errTypes || []).join('、'), 'edit-errtypes', '修改') +
        row('资料类型', Object.keys(S.RES_TYPE).map(function (k) { return S.RES_TYPE[k]; }).join('、'), 'edit-restypes', '修改') +
        row('任务优先级', '高（必须做） / 中（常规推进） / 低（有空再做）', 'edit-priorities', '修改') +
        '</div>' +
        '<div class="card"><div class="card__head"><div class="card__title"><span class="dot"></span>数据管理</div>' +
        '<span class="card__sub">数据只存在本机浏览器</span></div>' +
        '<div class="setrow"><div><div class="setrow__k">导出备份</div><div class="setrow__v">把全部数据存成一个 JSON 文件</div></div>' +
        '<button class="btn btn--sm" data-act="export">导出</button></div>' +
        '<div class="setrow"><div><div class="setrow__k">导入备份</div><div class="setrow__v">从 JSON 文件恢复数据</div></div>' +
        '<button class="btn btn--sm" data-act="import">导入</button></div>' +
        '<div class="setrow"><div><div class="setrow__k">加载示例数据</div><div class="setrow__v">用一套演示数据看看各项功能（会覆盖当前数据）</div></div>' +
        '<button class="btn btn--sm" data-act="load-demo">加载示例</button></div>' +
        '<div class="setrow"><div><div class="setrow__k">清空所有数据</div><div class="setrow__v">恢复成全新状态，不可撤销，建议先导出</div></div>' +
        '<button class="btn btn--sm btn--danger" data-act="clear-all">清空</button></div>' +
        '<div class="setrow"><div><div class="setrow__k">当前数据量</div><div class="setrow__v">任务 ' + S.all().tasks.length + ' · 时长 ' + S.all().sessions.length + ' · 模考 ' + S.all().mocks.length + ' · 错题 ' + S.all().mistakes.length + ' · 真题 ' + S.all().papers.length + ' · 资料 ' + S.all().resources.length + '</div></div>' +
        '<span class="faint" style="font-size:11px">' + esc(String(S.all().updatedAt || '').slice(0, 19).replace('T', ' ')) + '</span></div>' +
        '<div class="setrow"><div><div class="setrow__k">存储状态</div>' +
        '<div class="setrow__v">' + (warn.ok
          ? '<span style="color:var(--success)">正常</span>' + (warn.backend === 'session' ? '（仅本次会话）' : '（写入本机浏览器）')
          : '<span style="color:var(--danger)">不可用</span> · 数据只在内存中') + '</div>' +
        (warn.ok && warn.backend === 'local' ? '' : '<div class="faint" style="font-size:11px">' + esc(warn.reason) + '</div>') +
        '</div><button class="btn btn--sm" data-act="export">导出保险</button></div>' +
        '</div>' +
        '<div class="card"><div class="card__head"><div class="card__title"><span class="dot"></span>使用技巧</div></div>' +
        '<div class="notelist">' +
        '<div>· 手机浏览器打开后，「添加到主屏幕」可以像 App 一样使用。</div>' +
        '<div>· 键盘按 <b>N</b> 直接新建任务，按 <b>1-9</b> 切换模块。</div>' +
        '<div>· 右上角「夜间 / 日间」切换深色模式，晚上看更舒服。</div>' +
        '<div>· 换手机或清理浏览器前，记得先导出备份。</div>' +
        '</div></div>' +
        '</div>';
    }
  };

  return { Home: Home, Plan: Plan, Subjects: Subjects, Papers: Papers, Mocks: Mocks, Mistakes: Mistakes, Resources: Resources, Review: Review, Settings: Settings };
})();
