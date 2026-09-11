/* ============================================================
   store.js —— 数据模型与持久化（localStorage）
   设计原则：界面上的每一个数字都来自这里，且都可以被用户修改。
   首次打开是空白结构，没有任何预填业务数据。
   ============================================================ */
window.Store = (function () {
  var KEY = 'kaoyan.workbench.v1';
  var uid = function (p) { return window.U.uid(p); };
  var today = function () { return window.U.todayISO(); };
  var addDays = function (s, n) { return window.U.addDays(s, n); };

  /* 四科固定槽位：名称、满分、单科目标、分数都可以由用户修改 */
  var SLOTS = [
    { id: 'en', color: 'en', name: '英语', full: '英语一', sub: '英语一', max: 100 },
    { id: 'po', color: 'po', name: '政治', full: '思想政治理论', sub: '政治', max: 100 },
    { id: 'ma', color: 'ma', name: '数学', full: '数学一', sub: '数学一', max: 150 },
    { id: 'pr', color: 'pr', name: '专业课', full: '专业课', sub: '专业课', max: 150 }
  ];

  var PRIORITY = { high: { label: '高' }, mid: { label: '中' }, low: { label: '低' } };
  var TASK_STATUS = { todo: '未开始', doing: '进行中', done: '已完成' };
  var PAPER_STATUS = { todo: '未开始', doing: '进行中', done: '已完成' };
  var RES_TYPE = { video: '网课', pdf: '文档', note: '笔记', site: '网站', book: '书籍' };
  var REVIEW_GAP = [1, 3, 7, 15, 30, 60];
  var DEFAULT_ERRTYPES = ['概念不清', '计算失误', '方法不会', '审题错误', '记忆模糊', '时间不够'];

  function baseSettings() {
    return {
      examDate: '', school: '', major: '', targetScore: 0,
      dailyGoalMinutes: 300, subjectRatio: 85, motto: '',
      errTypes: DEFAULT_ERRTYPES.slice()
    };
  }
  function baseSubject(slot) {
    return {
      id: slot.id, color: slot.color, name: slot.name, full: slot.full, sub: slot.sub,
      max: slot.max, target: Math.round(slot.max * 0.85),
      score: 0, progress: 0, weak: [], note: ''
    };
  }

  /* ---------- 空白结构（首次打开就是这样） ---------- */
  function blank() {
    return {
      settings: baseSettings(),
      subjects: SLOTS.map(baseSubject),
      tasks: [], sessions: [], mocks: [], papers: [], mistakes: [], resources: [],
      version: 2, touched: false, updatedAt: new Date().toISOString()
    };
  }

  /* ---------- 示例数据（只有用户主动点击「加载示例」时才使用） ---------- */
  function demo() {
    var t = today(), d = blank();
    d.touched = true;
    Object.assign(d.settings, {
      examDate: '2026-12-19', school: 'XX大学', major: '计算机科学与技术',
      targetScore: 380, dailyGoalMinutes: 300, motto: '备考有规划，上岸更从容！', subjectRatio: 85
    });
    Object.assign(d.subjects[0], { name: '英语', full: '英语一', sub: '英语一', max: 100, target: 80, score: 72, progress: 72, weak: ['长难句拆分', '新题型排序', '作文高级句式'], note: '稳步提升中' });
    Object.assign(d.subjects[1], { name: '政治', full: '思想政治理论', sub: '政治', max: 100, target: 80, score: 68, progress: 68, weak: ['多选题辨析', '马原政经计算', '时政热点'], note: '继续加油' });
    Object.assign(d.subjects[2], { name: '数学', full: '数学一', sub: '数学一', max: 150, target: 120, score: 85, progress: 85, weak: ['级数收敛判断', '概率大题步骤'], note: '状态很好' });
    Object.assign(d.subjects[3], { name: '专业课', full: '计算机学科专业基础综合', sub: '408', max: 150, target: 120, score: 75, progress: 75, weak: ['组成原理流水线', '操作系统 PV 操作'], note: '持续努力' });
    d.tasks = [
      { id: uid('t'), title: '英语：背单词 100 个', subject: 'en', date: t, priority: 'mid', status: 'done', est: 40, createdAt: t },
      { id: uid('t'), title: '数学：高数习题 30 题', subject: 'ma', date: t, priority: 'high', status: 'done', est: 90, createdAt: t },
      { id: uid('t'), title: '政治：精讲精练 第3章', subject: 'po', date: t, priority: 'mid', status: 'todo', est: 50, createdAt: t },
      { id: uid('t'), title: '专业课：背诵第5章', subject: 'pr', date: t, priority: 'high', status: 'todo', est: 60, createdAt: t },
      { id: uid('t'), title: '英语：精读 2 篇真题阅读', subject: 'en', date: addDays(t, 1), priority: 'high', status: 'todo', est: 60, createdAt: t },
      { id: uid('t'), title: '数学：线代强化 第4讲', subject: 'ma', date: addDays(t, 1), priority: 'mid', status: 'todo', est: 80, createdAt: t },
      { id: uid('t'), title: '政治：1000 题错题回看', subject: 'po', date: addDays(t, 2), priority: 'low', status: 'todo', est: 40, createdAt: t },
      { id: uid('t'), title: '专业课：真题 2023 选择题', subject: 'pr', date: addDays(t, 2), priority: 'high', status: 'todo', est: 70, createdAt: t }
    ];
    d.sessions = [
      { id: uid('s'), date: t, minutes: 408, subject: 'all', note: '状态不错，数学效率最高' },
      { id: uid('s'), date: addDays(t, -1), minutes: 336, subject: 'all', note: '' },
      { id: uid('s'), date: addDays(t, -2), minutes: 292, subject: 'all', note: '' },
      { id: uid('s'), date: addDays(t, -3), minutes: 350, subject: 'all', note: '' }
    ];
    d.mocks = [
      { id: uid('m'), date: addDays(t, -45), name: '9.1模拟', scores: { en: 62, po: 55, ma: 70, pr: 111 }, note: '第一次全真模拟，节奏偏慢' },
      { id: uid('m'), date: addDays(t, -30), name: '9.15模拟', scores: { en: 66, po: 58, ma: 76, pr: 115 }, note: '' },
      { id: uid('m'), date: addDays(t, -15), name: '9.30模拟', scores: { en: 68, po: 62, ma: 78, pr: 120 }, note: '数学步骤拿分意识要加强' },
      { id: uid('m'), date: addDays(t, -4), name: '10.15模拟', scores: { en: 72, po: 68, ma: 85, pr: 121 }, note: '政治开始提速' }
    ];
    d.papers = [
      { id: uid('p'), name: '英语一 2018-2025 真题', subject: 'en', year: 2025, type: '真题', progress: 'doing', note: '阅读已刷完 2020 年之前' },
      { id: uid('p'), name: '数学一 2015-2025 真题', subject: 'ma', year: 2025, type: '真题', progress: 'doing', note: '按套卷掐时间做' },
      { id: uid('p'), name: '专业课 历年真题（2010-2025）', subject: 'pr', year: 2025, type: '真题', progress: 'doing', note: '选择题限时 40 分钟' },
      { id: uid('p'), name: '数学 660 题', subject: 'ma', year: 2026, type: '习题', progress: 'todo', note: '' }
    ];
    d.mistakes = [
      { id: uid('e'), subject: 'ma', topic: '级数收敛判断', type: '方法不会', note: '交错级数漏判莱布尼茨条件', mastery: 1, reviewCount: 1, lastReview: addDays(t, -6), createdAt: addDays(t, -12) },
      { id: uid('e'), subject: 'en', topic: '新题型·排序题', type: '审题错误', note: '转折词定位错了，整段顺序串位', mastery: 2, reviewCount: 2, lastReview: addDays(t, -4), createdAt: addDays(t, -10) },
      { id: uid('e'), subject: 'pr', topic: '操作系统·PV 操作', type: '方法不会', note: '生产者消费者信号量顺序写反', mastery: 3, reviewCount: 3, lastReview: addDays(t, -1), createdAt: addDays(t, -14) }
    ];
    d.resources = [
      { id: uid('r'), title: '英语一 高频词 5500（乱序版）', subject: 'en', type: 'pdf', source: '词汇书', progress: 60, url: '', note: '每天 100 个，滚动复习' },
      { id: uid('r'), title: '数学 高数强化课', subject: 'ma', type: 'video', source: '网课', progress: 45, url: '', note: '配合习题册使用' },
      { id: uid('r'), title: '专业课 思维导图笔记', subject: 'pr', type: 'note', source: '自己整理', progress: 55, url: '', note: '每章一张，睡前过一遍' }
    ];
    return d;
  }

  /* ---------- 校验 / 合并 / 迁移 ---------- */
  function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }
  function str(v, d) { return v == null || v === '' ? d : String(v); }
  /** 只接受合法 YYYY-MM-DD，否则回退 */
  function date(v, d) { return window.U.parseDate(v) ? String(v) : d; }
  function idOf(list, id) {
    return list.filter(function (s) { return s.id === id; }).length ? id : list[0].id;
  }

  function normalize(raw) {
    var out = blank();
    if (!raw || typeof raw !== 'object') return out;

    /* 设置项：只接受用户填过的值 */
    var rs = raw.settings || {};
    Object.keys(out.settings).forEach(function (k) {
      if (rs[k] == null) return;
      if (k === 'errTypes') {
        if (Array.isArray(rs.errTypes) && rs.errTypes.length) out.settings.errTypes = rs.errTypes.map(String).filter(Boolean);
      } else if (k === 'targetScore' || k === 'dailyGoalMinutes' || k === 'subjectRatio') {
        var n = num(rs[k], NaN);
        if (!isNaN(n)) out.settings[k] = n;
      } else if (String(rs[k]) !== '') {
        out.settings[k] = String(rs[k]);
      }
    });
    out.settings.examDate = date(out.settings.examDate, '');
    out.settings.subjectRatio = Math.max(1, Math.min(100, num(out.settings.subjectRatio, 85)));
    out.settings.dailyGoalMinutes = Math.max(10, Math.min(1440, num(out.settings.dailyGoalMinutes, 300)));
    out.settings.targetScore = Math.max(0, Math.min(1000, num(out.settings.targetScore, 0)));

    /* 科目：名称、满分、目标分、当前分、进度、薄弱点都可自定义 */
    var rawSubjects = Array.isArray(raw.subjects) ? raw.subjects : [];
    out.subjects = SLOTS.map(function (slot) {
      var hit = rawSubjects.filter(function (x) { return x && x.id === slot.id; })[0] || {};
      var s = baseSubject(slot);
      if (hit.name != null && String(hit.name) !== '') s.name = String(hit.name);
      if (hit.full != null && String(hit.full) !== '') s.full = String(hit.full);
      s.sub = (hit.sub != null && String(hit.sub) !== '') ? String(hit.sub) : s.name;
      s.color = slot.color;
      s.max = Math.max(1, num(hit.max, s.max));
      s.target = Math.max(0, Math.min(s.max, num(hit.target, Math.round(s.max * out.settings.subjectRatio / 100))));
      s.score = Math.max(0, Math.min(s.max, num(hit.score, 0)));
      s.progress = Math.max(0, Math.min(100, num(hit.progress, 0)));
      s.note = str(hit.note, '');
      s.weak = Array.isArray(hit.weak) ? hit.weak.map(String).filter(Boolean) : [];
      return s;
    });

    ['tasks', 'sessions', 'mocks', 'papers', 'mistakes', 'resources'].forEach(function (key) {
      if (!Array.isArray(raw[key])) return;
      out[key] = raw[key].filter(function (x) { return x && typeof x === 'object'; }).map(function (x) {
        var o = Object.assign({}, x);
        if (!o.id) o.id = uid(key.charAt(0));
        if (key === 'tasks') {
          o.title = str(o.title, '未命名任务');
          o.status = TASK_STATUS[o.status] ? o.status : (o.done ? 'done' : 'todo');
          o.priority = PRIORITY[o.priority] ? o.priority : 'mid';
          o.date = date(o.date, today());
          o.subject = idOf(out.subjects, o.subject);
          o.est = Math.max(0, num(o.est, 0));
        } else if (key === 'sessions') {
          o.date = date(o.date, today());
          o.minutes = Math.max(0, num(o.minutes, 0));
          o.subject = o.subject === 'all' ? 'all' : idOf(out.subjects, o.subject);
          o.note = str(o.note, '');
        } else if (key === 'mocks') {
          o.date = date(o.date, today());
          o.name = str(o.name, '');
          o.note = str(o.note, '');
          var sc = {};
          out.subjects.forEach(function (s) { sc[s.id] = Math.max(0, num((o.scores || {})[s.id], 0)); });
          o.scores = sc;
        } else if (key === 'papers') {
          o.name = str(o.name, '未命名资料');
          o.subject = idOf(out.subjects, o.subject);
          o.progress = PAPER_STATUS[o.progress] ? o.progress : 'todo';
          o.year = num(o.year, new Date().getFullYear());
        } else if (key === 'mistakes') {
          o.topic = str(o.topic, '未命名知识点');
          o.subject = idOf(out.subjects, o.subject);
          o.type = str(o.type, DEFAULT_ERRTYPES[0]);
          o.note = str(o.note, '');
          o.mastery = Math.max(0, Math.min(5, num(o.mastery, 0)));
          o.reviewCount = Math.max(0, num(o.reviewCount, 0));
          o.createdAt = date(o.createdAt, today());
          o.lastReview = date(o.lastReview, o.createdAt);
        } else if (key === 'resources') {
          o.title = str(o.title, '未命名资料');
          o.subject = idOf(out.subjects, o.subject);
          o.type = RES_TYPE[o.type] ? o.type : 'note';
          o.progress = Math.max(0, Math.min(100, num(o.progress, 0)));
          o.source = str(o.source, '');
          o.url = str(o.url, '');
          o.note = str(o.note, '');
        }
        return o;
      });
    });

    out.touched = raw.touched === true;
    out.updatedAt = str(raw.updatedAt, out.updatedAt);
    return out;
  }

  /* ---------- 存储可用性检测 ----------
     注意：被嵌在其它页面里预览的 file:// 页面属于「不透明来源」，
     浏览器会禁用 localStorage（SecurityError）；无痕模式或配额写满也会失败。
     这里做降级：能用就用，不能用就退到 sessionStorage / 内存，并如实告知用户。 */
  var persist = { ok: false, backend: 'memory', reason: '', warned: false, checked: false };

  function tryStorage(kind) {
    try {
      var s = window[kind];
      if (!s) return null;
      var probe = '__ky_probe__';
      s.setItem(probe, '1');
      s.removeItem(probe);
      return s;
    } catch (e) { return null; }
  }
  function detectStorage() {
    // 每次都实测：浏览器可能在会话中途禁用存储（权限变更 / 配额写满 / 隐私模式）
    if (persist.backend === 'local') {
      if (tryStorage('localStorage')) { persist.ok = true; return persist; }
      persist.ok = false; persist.checked = false;   // 掉级后重新选后备
    }
    if (persist.checked) return persist;
    persist.checked = true;
    if (tryStorage('localStorage')) {
      persist.ok = true; persist.backend = 'local'; persist.reason = '';
      return persist;
    }
    if (tryStorage('sessionStorage')) {
      persist.ok = true; persist.backend = 'session';
      persist.reason = '浏览器禁用了本机存储，数据暂存在本次会话里（关闭标签页后请先导出备份）';
      return persist;
    }
    persist.ok = false; persist.backend = 'memory';
    persist.reason = '当前环境不允许写入浏览器存储（常见于在别的页面里嵌入预览这个文件），数据只保留在内存中，刷新会丢失';
    return persist;
  }
  function store(kind) { return kind === 'session' ? window.sessionStorage : window.localStorage; }

  function readRaw() {
    var p = detectStorage();
    if (p.backend === 'memory') return null;
    try { return JSON.parse(store(p.backend).getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function writeRaw(json) {
    var p = detectStorage();
    if (p.backend === 'memory') return false;
    try { store(p.backend).setItem(KEY, json); return true; } catch (e) { return false; }
  }
  /** 给界面用的存储状态 */
  function storageWarn() {
    var p = detectStorage();
    return { ok: p.ok, backend: p.backend, reason: p.reason };
  }

  /* ---------- 读写 ---------- */
  var data = null;
  function load() {
    var raw = readRaw();
    data = normalize(raw);
    if (!raw) save();
    return data;
  }
  function all() { if (!data) load(); return data; }
  function save() {
    if (!data) return;
    data.updatedAt = new Date().toISOString();
    if (writeRaw(JSON.stringify(data))) return;
    var p = detectStorage();
    p.ok = false;
    if (!p.warned) {
      p.warned = true;
      window.U.toast('无法写入本机存储，已改为内存保存（刷新会丢失）', 'err');
    }
  }
  function replace(raw) { data = normalize(raw); save(); return data; }
  function clearAll() { data = blank(); data.touched = true; save(); return data; }
  function loadDemo() { data = demo(); save(); return data; }
  function rawJSON() { return JSON.stringify(all(), null, 2); }

  /* ---------- 领域查询 ---------- */
  function subject(id) {
    var list = all().subjects;
    return list.filter(function (s) { return s.id === id; })[0] || list[0];
  }
  function subjectMeta(id) { return subject(id); }
  function subjectName(id) { return subject(id).name; }
  function subjectTarget(id) {
    var s = subject(id);
    return s.target > 0 ? s.target : Math.round(s.max * (all().settings.subjectRatio || 85) / 100);
  }

  function isOverdue(t) { return t.status !== 'done' && t.date < today(); }
  function decorateTasks(list) {
    return list.map(function (t) {
      var s = subject(t.subject);
      return Object.assign({}, t, {
        _sub: s, _color: s.color, _subjectName: s.name,
        _overdue: isOverdue(t), _done: t.status === 'done'
      });
    }).sort(function (a, b) {
      if (a._done !== b._done) return a._done ? 1 : -1;
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      var rank = { high: 0, mid: 1, low: 2 };
      return (rank[a.priority] || 1) - (rank[b.priority] || 1);
    });
  }
  function tasksOn(dateStr) { return all().tasks.filter(function (t) { return t.date === dateStr; }); }
  function tasksBetween(a, b) { return all().tasks.filter(function (t) { return t.date >= a && t.date <= b; }); }

  function sessionsOn(dateStr) { return all().sessions.filter(function (s) { return s.date === dateStr; }); }
  function sessionsBetween(a, b) { return all().sessions.filter(function (s) { return s.date >= a && s.date <= b; }); }
  function sessionMinutes(dateStr) { return window.U.sum(sessionsOn(dateStr), function (s) { return s.minutes; }); }
  function reviewNote(dateStr) {
    var notes = sessionsOn(dateStr).map(function (s) { return s.note; }).filter(Boolean);
    return notes.length ? notes[notes.length - 1] : '';
  }
  function setReviewNote(dateStr, text) {
    var list = sessionsOn(dateStr);
    if (list.length) { list[0].note = text; return; }
    all().sessions.push({ id: uid('s'), date: dateStr, minutes: 0, subject: 'all', note: text, noteOnly: true });
  }

  function mockTotal(m) {
    var total = 0, scores = (m && m.scores) || {};
    all().subjects.forEach(function (s) { total += num(scores[s.id], 0); });
    return total;
  }
  function mocksSorted() {
    return all().mocks.slice().sort(function (a, b) { return String(a.date) < String(b.date) ? -1 : 1; })
      .map(function (m) { return Object.assign({}, m, { _total: mockTotal(m) }); });
  }
  function latestMock() { var a = mocksSorted(); return a.length ? a[a.length - 1] : null; }
  function bestMockTotal() { var a = mocksSorted(); return a.length ? Math.max.apply(null, a.map(function (m) { return m._total; })) : 0; }

  function nextReviewDate(m) {
    var gap = REVIEW_GAP[window.U.clamp(num(m.reviewCount, 0), 0, REVIEW_GAP.length - 1)];
    return addDays(m.lastReview || m.createdAt || today(), gap);
  }
  function decorateMistakes(list) {
    return list.map(function (m) {
      var s = subject(m.subject), next = nextReviewDate(m);
      var diff = window.U.daysBetween(new Date(), window.U.parseDate(next) || new Date());
      return Object.assign({}, m, {
        _sub: s, _color: s.color, _next: next,
        _due: num(m.mastery, 0) < 5 && diff <= 0, _diff: diff
      });
    }).sort(function (a, b) {
      if (a._due !== b._due) return a._due ? -1 : 1;
      if (num(a.mastery, 0) !== num(b.mastery, 0)) return num(a.mastery, 0) - num(b.mastery, 0);
      return a._next < b._next ? -1 : 1;
    });
  }
  function mistakesDue() { return decorateMistakes(all().mistakes).filter(function (m) { return m._due; }); }

  function dailyGoal() { return Math.max(10, num(all().settings.dailyGoalMinutes, 300)); }
  function weekStats() {
    var mon = window.U.mondayOf();
    var week = window.U.weekDates(mon);
    var inWeek = tasksBetween(week[0], week[6]);
    var done = inWeek.filter(function (t) { return t.status === 'done'; }).length;
    return {
      monday: window.U.iso(mon), dates: week, total: inWeek.length, done: done,
      rate: inWeek.length ? Math.round(done / inWeek.length * 100) : 0,
      minutes: window.U.sum(sessionsBetween(week[0], week[6]), function (s) { return s.minutes; })
    };
  }
  function countdown() {
    var raw = all().settings.examDate;
    if (!window.U.parseDate(raw)) return { date: '', days: 0, weeks: 0, set: false };
    return { date: raw, days: window.U.daysBetween(new Date(), window.U.parseDate(raw)), weeks: 0, set: true };
  }
  function overall() {
    var target = num(all().settings.targetScore, 0);
    var current = window.U.sum(all().subjects, function (s) { return s.score; });
    var sumTarget = window.U.sum(all().subjects, function (s) { return subjectTarget(s.id); });
    return {
      current: current, target: target, sumTarget: sumTarget,
      gap: target > 0 ? Math.max(0, target - current) : 0,
      rate: target > 0 ? window.U.clamp(Math.round(current / target * 100), 0, 100) : 0
    };
  }
  /** 近 7 天某科目的任务完成率（没有任务的天不计入分母） */
  function recentSubjectRate(id) {
    var sum = 0, days = 0;
    for (var i = 6; i >= 0; i--) {
      var list = tasksOn(addDays(today(), -i)).filter(function (x) { return x.subject === id; });
      if (!list.length) continue;
      days++;
      sum += list.filter(function (x) { return x.status === 'done'; }).length / list.length;
    }
    return days ? Math.round(sum / days * 100) : 0;
  }
  function progressTable() {
    return all().subjects.map(function (s) {
      return {
        meta: s, data: s, target: subjectTarget(s.id), weekRate: recentSubjectRate(s.id),
        taskCount: all().tasks.filter(function (x) { return x.subject === s.id; }).length,
        mistakeCount: all().mistakes.filter(function (x) { return x.subject === s.id; }).length,
        paperCount: all().papers.filter(function (x) { return x.subject === s.id; }).length,
        resourceCount: all().resources.filter(function (x) { return x.subject === s.id; }).length
      };
    });
  }
  function review() {
    var mastered = all().mistakes.filter(function (m) { return num(m.mastery, 0) >= 5; }).length;
    return {
      totalMistakes: all().mistakes.length, due: mistakesDue().length, mastered: mastered,
      mockCount: all().mocks.length, best: bestMockTotal(), latest: latestMock()
    };
  }
  function hasAnyData() {
    var d = all();
    return !!(d.tasks.length || d.sessions.length || d.mocks.length || d.papers.length ||
      d.mistakes.length || d.resources.length || d.settings.school || d.settings.examDate);
  }

  return {
    SLOTS: SLOTS, PRIORITY: PRIORITY, TASK_STATUS: TASK_STATUS, PAPER_STATUS: PAPER_STATUS,
    RES_TYPE: RES_TYPE, REVIEW_GAP: REVIEW_GAP, DEFAULT_ERRTYPES: DEFAULT_ERRTYPES,
    blank: blank, demo: demo, load: load, all: all, save: save, replace: replace,
    clearAll: clearAll, loadDemo: loadDemo, rawJSON: rawJSON, normalize: normalize,
    storageWarn: storageWarn,
    subject: subject, subjectMeta: subjectMeta, subjectName: subjectName, subjectTarget: subjectTarget,
    tasksOn: tasksOn, tasksBetween: tasksBetween, decorateTasks: decorateTasks, isOverdue: isOverdue,
    sessionsOn: sessionsOn, sessionsBetween: sessionsBetween, sessionMinutes: sessionMinutes,
    reviewNote: reviewNote, setReviewNote: setReviewNote,
    mockTotal: mockTotal, mocksSorted: mocksSorted, latestMock: latestMock, bestMockTotal: bestMockTotal,
    decorateMistakes: decorateMistakes, mistakesDue: mistakesDue, nextReviewDate: nextReviewDate,
    dailyGoal: dailyGoal, weekStats: weekStats, countdown: countdown, overall: overall,
    progressTable: progressTable, review: review, hasAnyData: hasAnyData
  };
})();
