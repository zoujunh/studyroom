/* ============================================================
   util.js —— 通用工具：日期、格式化、DOM 构建、弹窗、表单
   全局命名空间：window.U
   ============================================================ */
window.U = (function () {
  var WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  /* ---------- 基础 ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayISO() { return iso(new Date()); }
  function parseDate(s) {
    if (!s) return null;
    var p = String(s).split('-');
    if (p.length !== 3) return null;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d.getTime()) ? null : d;
  }
  function daysBetween(a, b) {
    var A = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    var B = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((B - A) / 86400000);
  }
  function fmt(s) { var d = parseDate(s); return d ? d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate() : '—'; }
  function fmtCn(s) { var d = parseDate(s); return d ? (d.getMonth() + 1) + '月' + d.getDate() + '日' : '—'; }
  function fmtShort(s) { var d = parseDate(s); return d ? (d.getMonth() + 1) + '.' + d.getDate() : '—'; }
  function weekday(s) { var d = parseDate(s); return d ? WD[d.getDay()] : ''; }
  function relDay(s) {
    var d = parseDate(s); if (!d) return '';
    var n = daysBetween(new Date(), d);
    if (n === 0) return '今天';
    if (n === 1) return '明天';
    if (n === -1) return '昨天';
    return fmt(s);
  }
  function addDays(s, n) { var d = parseDate(s) || new Date(); d.setDate(d.getDate() + n); return iso(d); }
  function mondayOf(d) {
    d = d || new Date();
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var w = (x.getDay() + 6) % 7; // 0=周一
    x.setDate(x.getDate() - w);
    return x;
  }
  function weekDates(monday) {
    var out = [];
    for (var i = 0; i < 7; i++) out.push(addDays(iso(monday), i));
    return out;
  }
  function uid(p) { return (p || 'id') + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function num(v, def) { var n = parseFloat(v); return isNaN(n) ? (def || 0) : n; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function sum(arr, f) { return arr.reduce(function (a, x) { return a + num(f ? f(x) : x); }, 0); }
  function fill(tpl, map) {
    return String(tpl).replace(/\{(\w+)\}/g, function (m, k) { return map[k] == null ? '' : String(map[k]); });
  }

  /* ---------- SVG 图标 ---------- */
  var ICONS = {
    home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1Z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    chart: '<path d="M4 20V10M10 20V5M16 20v-7M22 20H2"/>',
    doc: '<path d="M6 3h7l5 5v13H6z"/><path d="M13 3v5h5"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>',
    exam: '<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/>',
    box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
    check: '<path d="M4 12.5 9 17.5 20 6.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="M14 6l4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    flame: '<path d="M12 3s5 4.2 5 9a5 5 0 0 1-10 0c0-2 1-3.4 1-3.4S8 11 9.5 12c0-3 2.5-4 2.5-9Z"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    school: '<path d="M3 9.5 12 4l9 5.5-9 5.5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M19.9 14.6a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.11A1.7 1.7 0 0 0 8.4 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H2.3a2 2 0 1 1 0-4h.11A1.7 1.7 0 0 0 4 8.4a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H8.4A1.7 1.7 0 0 0 9.43 2.5V2.3a2 2 0 1 1 4 0v.11a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.07a1.7 1.7 0 0 0 1.56 1.03h.11a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.56 1.03z"/>',
    link: '<path d="M10 14a4 4 0 0 1 0-5.6l2.4-2.4a4 4 0 0 1 5.6 5.6L16.8 13"/><path d="M14 10a4 4 0 0 1 0 5.6l-2.4 2.4A4 4 0 0 1 6 12.4L7.2 11"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 1 3.5 10.9c-.5.4-.5 1.6-.5 2.1h-6c0-.5 0-1.7-.5-2.1A6 6 0 0 1 12 3Z"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z"/><path d="M8 3v18"/>'
  };
  function icon(name, cls) {
    return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[name] || '') + '</svg>';
  }

  /* ---------- DOM 构建（避免用 innerHTML 拼接用户数据） ---------- */
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k.indexOf('data-') === 0 || k.indexOf('aria-') === 0) el.setAttribute(k, v);
        else if (k === 'style') el.style.cssText = v;
        else el[k] = v;
      });
    }
    append(el, children);
    return el;
  }
  function append(el, children) {
    (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- Toast ---------- */
  function toast(msg, kind) {
    var box = document.getElementById('toasts');
    if (!box || !box.appendChild) { if (window.console) console.warn('[toast]', msg); return; }
    var t = h('div', { class: 'toast' + (kind ? ' toast--' + kind : ''), text: msg });
    box.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .25s'; t.style.opacity = '0';
      setTimeout(function () { if (t.remove) t.remove(); }, 260);
    }, kind === 'err' ? 3200 : 2100);
  }

  /* ---------- 弹窗 ---------- */
  var stack = [];
  function closeModal() {
    var m = document.getElementById('modal');
    var panel = document.getElementById('modalPanel');
    if (!m || m.hidden) return;
    m.hidden = true;
    clear(panel);
    stack.pop();
  }
  function openModal(cfg) {
    var m = document.getElementById('modal');
    var panel = document.getElementById('modalPanel');
    clear(panel);
    stack.push(cfg);

    var head = h('div', { class: 'modal__head' }, [
      h('div', null, [
        h('div', { class: 'modal__title', text: cfg.title || '' }),
        cfg.desc ? h('div', { class: 'modal__desc', text: cfg.desc }) : null
      ]),
      h('button', { class: 'icon-btn', html: icon('close'), title: '关闭', onclick: closeModal })
    ]);
    var body = h('div', { class: 'modal__body' }, cfg.body ? [cfg.body] : []);
    var foot = h('div', { class: 'modal__foot' });
    (cfg.actions || []).forEach(function (a) {
      foot.appendChild(h('button', {
        class: 'btn ' + (a.kind === 'primary' ? 'btn--primary' : a.kind === 'danger' ? 'btn--danger' : ''),
        text: a.label,
        onclick: function (ev) { a.onClick && a.onClick(ev); }
      }));
    });
    if (!cfg.actions || !cfg.actions.length) foot.appendChild(h('button', { class: 'btn', text: '关闭', onclick: closeModal }));

    append(panel, [head, body, foot]);
    m.hidden = false;
    var first = panel.querySelector('input,select,textarea');
    if (first) setTimeout(function () { try { first.focus(); } catch (e) { } }, 60);
  }
  function confirmBox(title, message, onOk, okLabel) {
    openModal({
      title: title,
      body: h('p', { class: 'muted', text: message, style: 'font-size:13px;margin:0;' }),
      actions: [
        { label: '取消', onClick: closeModal },
        { label: okLabel || '确认删除', kind: 'danger', onClick: function () { closeModal(); onOk(); } }
      ]
    });
  }

  /* ---------- 表单 ---------- */
  function selHtml(options, value) {
    return options.map(function (o) {
      var v = typeof o === 'string' ? o : o.value, l = typeof o === 'string' ? o : o.label;
      return '<option value="' + esc(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + esc(l) + '</option>';
    }).join('');
  }
  function fieldWrap(f) {
    var input;
    if (f.type === 'select') {
      input = h('select', { name: f.name, html: selHtml(f.options || [], f.value) });
    } else if (f.type === 'textarea') {
      input = h('textarea', { name: f.name, rows: f.rows || 3 });
      input.value = f.value == null ? '' : f.value;
    } else if (f.type === 'checkbox') {
      input = h('input', { type: 'checkbox', name: f.name });
      input.checked = !!f.value;
      return h('label', { class: 'f-check' }, [input, h('span', { text: f.label || '' })]);
    } else {
      input = h('input', {
        type: f.type || 'text',
        name: f.name,
        placeholder: f.placeholder || '',
        max: f.max, min: f.min, step: f.step || (f.type === 'number' ? 'any' : null)
      });
      input.value = f.value == null ? '' : f.value;
    }
    return h('div', { class: 'f-row', 'data-field': f.name }, [
      h('div', { class: 'f-lab' }, [h('b', { text: f.label || '' }), f.suffix ? h('span', { text: f.suffix }) : null]),
      h('div', { class: 'f-wrap' + (f.type === 'textarea' ? ' f-wrap--area' : '') }, [input]),
      h('div', { class: 'f-err' })
    ]);
  }
  function formHtml(fields) {
    return h('div', { class: 'form' }, fields.map(function (f) {
      if (f.type === 'group') {
        return h('div', { class: 'f-row--2' }, (f.fields || []).map(fieldWrap));
      }
      if (f.type === 'note') {
        return h('div', { class: 'f-hint', text: f.label || '' });
      }
      return fieldWrap(f);
    }));
  }
  /**
   * 打开表单弹窗
   * fields:[{name,label,type,value,options,required,min,max,suffix,placeholder,wide,half}]
   * extra:{title,desc,submitLabel,body,onSubmit(values, form, close)}  onSubmit 返回 false 则不关闭
   */
  function formModal(title, fields, onSubmit, extra) {
    extra = extra || {};
    var form = formHtml(fields);
    var actions = [
      { label: '取消', onClick: closeModal },
      { label: extra.submitLabel || '保存', kind: 'primary', onClick: submit }
    ];
    if (extra.danger) actions.splice(1, 0, { label: extra.danger.label, kind: 'danger', onClick: function () { closeModal(); extra.danger.onClick(); } });

    function submit() {
      var values = {}, bad = null;
      fields.forEach(function (f) {
        if (f.type === 'group') {
          (f.fields || []).forEach(collect);
        } else if (f.type !== 'note') collect(f);
      });
      function collect(f) {
        var el = form.querySelector('[name="' + f.name + '"]');
        if (!el) return;
        var cell = form.querySelector('[data-field="' + f.name + '"]');
        var errEl = cell ? cell.querySelector('.f-err') : null;
        if (errEl) errEl.textContent = '';
        if (cell) cell.querySelector('.f-wrap') && cell.querySelector('.f-wrap').style.removeProperty('border-color');
        var v;
        if (f.type === 'checkbox') v = el.checked;
        else if (f.type === 'number') { v = el.value === '' ? null : parseFloat(el.value); }
        else v = el.value.trim();

        if (f.required && (v === '' || v == null || v === false)) {
          if (errEl) errEl.textContent = '该项必填';
          bad = bad || el; return;
        }
        if (f.type === 'number' && v != null && !isNaN(v)) {
          if (f.min != null && v < f.min) { if (errEl) errEl.textContent = '不能小于 ' + f.min; bad = bad || el; return; }
          if (f.max != null && v > f.max) { if (errEl) errEl.textContent = '不能大于 ' + f.max; bad = bad || el; return; }
        }
        values[f.name] = v;
      }
      if (bad) { try { bad.focus(); } catch (e) { } return; }
      if (onSubmit && onSubmit(values, form, closeModal) === false) return;
      closeModal();
    }

    openModal({
      title: title,
      desc: extra.desc,
      body: extra.body ? append(h('div', null, [form]), [extra.body]) : form,
      actions: actions
    });
  }

  /* ---------- 下载 ---------- */
  function download(filename, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- 主题 ---------- */
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
    try { localStorage.setItem('ky.theme', t); } catch (e) { }
  }
  function getTheme() {
    try { return localStorage.getItem('ky.theme') || 'light'; } catch (e) { return 'light'; }
  }
  /** 同步 iOS 状态栏颜色，让顶部过渡自然 */
  function syncThemeColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    meta.setAttribute('content', getTheme() === 'dark' ? '#0b0f16' : '#f7f8fc');
  }

  return {
    WD: WD, pad: pad, iso: iso, todayISO: todayISO, parseDate: parseDate, daysBetween: daysBetween,
    fmt: fmt, fmtCn: fmtCn, fmtShort: fmtShort, weekday: weekday, relDay: relDay, addDays: addDays,
    mondayOf: mondayOf, weekDates: weekDates, uid: uid, clamp: clamp, num: num, esc: esc, sum: sum, fill: fill,
    icon: icon, ICONS: ICONS, h: h, append: append, clear: clear, q: q, qa: qa, toast: toast,
    openModal: openModal, closeModal: closeModal, confirmBox: confirmBox, formModal: formModal,
    selHtml: selHtml, download: download, setTheme: setTheme, getTheme: getTheme, syncThemeColor: syncThemeColor
  };
})();
