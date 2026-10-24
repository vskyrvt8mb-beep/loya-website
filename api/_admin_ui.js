// 2.30: админка — таблица клиентов (сортировка, фильтры с числами, быстрые и массовые действия), аналитика,
// красивые окна вместо prompt/confirm, уведомления, журнал с поиском, автообновление и горячие клавиши.
// Код выполняется в браузере на странице /admin (общие переменные страницы: D, T, E, $, api, load, act, delKeys,
// openClient, paint, filter, q, view, selected, lang, dt, dshort, eur). Функция не вызывается на сервере: берём её текст.
/* eslint-disable no-undef */
function adminUiClient() {
  const UI = (() => {
    const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } return null; };
    let sort = ls('loya_admin_sort') || 'new', planF = ls('loya_admin_plan') || 'all', limit = 60, menuKey = null;
    let jQ = '', jOp = '', jOpen = false, autoOn = ls('loya_admin_auto') === '1', autoTimer = null, loadedAt = 0;
    const DAY = 864e5;

    // ---------- мелочи ----------
    function rel(s) {
      const t = T(); if (!s) return t.never;
      const d = (Date.now() - new Date(s).getTime()) / 1000;
      if (d < 90) return t.uiNow; if (d < 3600) return t.uiMin(Math.round(d / 60)); if (d < DAY / 1000) return t.uiHour(Math.round(d / 3600));
      if (d < 30 * DAY / 1000) return t.uiDay(Math.round(d / (DAY / 1000))); return dshort(s);
    }
    function initial(x) { const s = String(x.email || x.key || '?').trim(); return (s[0] || '?').toUpperCase(); }
    function hue(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
    async function copy(text, btn) { try { await navigator.clipboard.writeText(text); toast(T().copied, 'ok'); } catch (e) { toast(text, 'info'); } }

    // ---------- уведомления ----------
    function toast(msg, kind) {
      let box = $('toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; document.body.appendChild(box); }
      const el = document.createElement('div'); el.className = 'toast ' + (kind || 'ok'); el.setAttribute('role', 'status');
      el.innerHTML = '<i>' + (kind === 'err' ? '⚠️' : kind === 'info' ? 'ℹ️' : '✓') + '</i><span>' + E(msg) + '</span>';
      box.appendChild(el); requestAnimationFrame(() => el.classList.add('in'));
      setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, kind === 'err' ? 6000 : 3200);
    }

    // ---------- окно-вопрос вместо prompt/confirm ----------
    // fields: [{ id, label, type: 'text'|'number'|'date'|'textarea', value, placeholder, min, max }]; без полей — подтверждение.
    function ask(o) {
      return new Promise((resolve) => {
        const t = T(); const ov = document.createElement('div'); ov.className = 'dlg-ov';
        ov.innerHTML = '<div class="dlg" role="dialog" aria-modal="true"><div class="dlg-h">' + (o.icon ? '<span class="dlg-ic">' + o.icon + '</span>' : '') + '<b>' + E(o.title || '') + '</b></div>' +
          (o.text ? '<p class="dlg-t">' + E(o.text) + '</p>' : '') +
          (o.fields || []).map(f => '<label class="dlg-f"><span>' + E(f.label || '') + '</span>' + (f.type === 'textarea'
            ? '<textarea data-f="' + f.id + '" rows="3" maxlength="' + (f.max || 500) + '" placeholder="' + E(f.placeholder || '') + '">' + E(f.value || '') + '</textarea>'
            : '<input data-f="' + f.id + '" type="' + (f.type || 'text') + '" value="' + E(f.value == null ? '' : f.value) + '" placeholder="' + E(f.placeholder || '') + '"' + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null && f.type === 'number' ? ' max="' + f.max + '"' : '') + (f.type === 'date' ? ' style="color-scheme:dark"' : '') + '>') +
            (f.hint ? '<small>' + E(f.hint) + '</small>' : '') + '</label>').join('') +
          (o.chips ? '<div class="dlg-chips">' + o.chips.map(c => '<button type="button" class="pill" data-chip="' + E(c.v) + '" data-for="' + E(c.f) + '">' + E(c.l) + '</button>').join('') + '</div>' : '') +
          '<div class="dlg-a"><button type="button" class="btn sec" data-x="0">' + E(t.cancel) + '</button><button type="button" class="btn' + (o.danger ? ' danger' : '') + '" data-x="1">' + E(o.ok || 'OK') + '</button></div></div>';
        document.body.appendChild(ov);
        const done = (ok) => {
          const vals = {}; ov.querySelectorAll('[data-f]').forEach(i => { vals[i.dataset.f] = i.value; });
          ov.remove(); document.removeEventListener('keydown', key, true); resolve(ok ? vals : null);
        };
        const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); done(true); } };
        document.addEventListener('keydown', key, true);
        ov.querySelectorAll('[data-x]').forEach(b => b.onclick = () => done(b.dataset.x === '1'));
        ov.querySelectorAll('[data-chip]').forEach(b => b.onclick = () => { const i = ov.querySelector('[data-f="' + b.dataset.for + '"]'); if (i) { i.value = b.dataset.chip; i.focus(); } });
        ov.addEventListener('mousedown', (e) => { if (e.target === ov) done(false); });
        setTimeout(() => { const f = ov.querySelector('[data-f]') || ov.querySelector('[data-x="1"]'); if (f) f.focus(); }, 30);
      });
    }

    // ---------- фильтры, тариф, сортировка ----------
    const FILTERS = ['all', 'active', 'paying', 'trial', 'atrisk', 'free', 'pastdue', 'banned', 'online', 'inactive', 'test'];
    // «Могут уйти»: пробный кончается за 7 дней, а программой почти не пользуются (не заходили 3+ дня или ни разу)
    const atRisk = (x) => x.plan === 'trial' && x.state === 'active' && x.trialUntil && new Date(x.trialUntil) - Date.now() < 7 * DAY && (!x.lastSeen || Date.now() - new Date(x.lastSeen).getTime() > 3 * DAY);
    function inFilter(x, f) {
      return f === 'all' || (f === 'active' && x.state === 'active') || (f === 'paying' && x.state === 'active' && x.plan !== 'free' && x.plan !== 'trial') ||
        (f === 'trial' && x.plan === 'trial') || (f === 'atrisk' && atRisk(x)) || (f === 'free' && x.plan === 'free') || (f === 'pastdue' && x.state === 'past_due') || (f === 'banned' && x.banned) ||
        (f === 'online' && x.lastSeen && Date.now() - new Date(x.lastSeen).getTime() < 7 * DAY) || (f === 'inactive' && x.state !== 'active') || (f === 'test' && x.livemode === false);
    }
    function inPlan(x) { return planF === 'all' || (planF === 'pro' && x.tier === 'pro' && x.plan !== 'trial') || (planF === 'starter' && x.tier !== 'pro' && x.plan !== 'trial' && x.plan !== 'free') || (planF === 'trial' && x.plan === 'trial') || (planF === 'free' && x.plan === 'free'); }
    function inQuery(x, qq) {
      if (!qq) return true;
      if (qq.startsWith('v:')) return String(x.version || '') === qq.slice(2).trim();
      return (x.email + ' ' + x.key + ' ' + x.note + ' ' + x.version).toLowerCase().includes(qq);
    }
    const ts = (s) => (s ? new Date(s).getTime() : 0);
    const SORTS = {
      new: (a, b) => ts(b.created) - ts(a.created), old: (a, b) => ts(a.created) - ts(b.created),
      seen: (a, b) => ts(b.lastSeen) - ts(a.lastSeen), silent: (a, b) => ts(a.lastSeen) - ts(b.lastSeen),
      email: (a, b) => String(a.email).localeCompare(String(b.email)),
      trial: (a, b) => (a.plan === 'trial' ? ts(a.trialUntil) : 9e15) - (b.plan === 'trial' ? ts(b.trialUntil) : 9e15)
    };
    function rows() { const qq = q.trim().toLowerCase(); return D.list.filter(x => inFilter(x, filter) && inPlan(x) && inQuery(x, qq)).sort(SORTS[sort] || SORTS.new); }

    // ---------- значки статуса ----------
    function chips(x) {
      const t = T(); let h = '';
      h += x.banned ? '<span class="chip c-bad">' + E(t.st_banned) + '</span>' : x.state === 'active' ? '<span class="chip c-ok">' + E(t.st_active) + '</span>' : x.state === 'past_due' ? '<span class="chip c-warn">' + E(t.st_past_due) + '</span>' : '<span class="chip c-bad">' + E(t['st_' + x.state] || x.state) + '</span>';
      if (x.livemode === false) h += '<span class="chip c-test">' + E(t.chTest) + '</span>';
      return h;
    }
    function planCell(x) {
      const t = T();
      if (x.plan === 'trial') { const d = Math.ceil((new Date(x.trialUntil) - Date.now()) / DAY); return d > 0 ? '<span class="chip c-trial">' + E(t.chTrial(d)) + '</span>' : '<span class="chip c-bad">' + E(t.chTrialEnd) + '</span>'; }
      if (x.plan === 'free') return '<span class="chip c-free">' + E(t.planFree) + (x.freeUntil ? ' → ' + E(dshort(x.freeUntil)) : '') + '</span>';
      return '<span class="chip ' + (x.tier === 'pro' ? 'c-pro' : 'c-st') + '">' + (x.tier === 'pro' ? 'Pro' : 'Starter') + '</span>';
    }
    function seenCls(x) { if (!x.lastSeen) return 'seen-never'; const d = Date.now() - new Date(x.lastSeen).getTime(); return d < DAY ? 'seen-today' : d < 7 * DAY ? 'seen-week' : d < 30 * DAY ? 'seen-month' : 'seen-old'; }

    // ---------- список клиентов ----------
    function clients() {
      const t = T();
      const n = {}; FILTERS.forEach(f => { n[f] = D.list.filter(x => inFilter(x, f)).length; });
      $('filters').innerHTML = FILTERS.filter(f => f === 'all' || n[f] > 0 || f === filter).map(f => '<button class="pill fchip ' + (filter === f ? 'on' : '') + ' f-' + f + '" data-f="' + f + '">' + E(t['uiF_' + f]) + ' <small>' + n[f] + '</small></button>').join('');
      $('filters').querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; limit = 60; paint(); });
      const tb = $('ctools');
      if (tb) {
        tb.innerHTML = '<label class="csel"><span>' + E(t.uiPlan) + '</span><select id="planf">' + ['all', 'pro', 'starter', 'trial', 'free'].map(p => '<option value="' + p + '"' + (planF === p ? ' selected' : '') + '>' + E(t['uiPlan_' + p]) + '</option>').join('') + '</select></label>' +
          '<label class="csel"><span>' + E(t.uiSort) + '</span><select id="sortf">' + Object.keys(SORTS).map(s => '<option value="' + s + '"' + (sort === s ? ' selected' : '') + '>' + E(t['uiSort_' + s]) + '</option>').join('') + '</select></label>';
        $('planf').onchange = () => { planF = $('planf').value; ls('loya_admin_plan', planF); limit = 60; paint(); };
        $('sortf').onchange = () => { sort = $('sortf').value; ls('loya_admin_sort', sort); paint(); };
      }
      const all = rows(), L = all.slice(0, limit);
      const head = '<div class="crow chead"><span></span><span>' + E(t.uiColClient) + '</span><span>' + E(t.uiColStatus) + '</span><span>' + E(t.uiColPlan) + '</span><span>' + E(t.uiColDev) + '</span><span>' + E(t.uiColSeen) + '</span><span>' + E(t.uiColCreated) + '</span><span></span></div>';
      $('list').innerHTML = (L.length ? head : '') + L.map(x => {
        const dev = x.devices ? '<span class="dev' + (x.deviceLimit && x.devices >= x.deviceLimit ? ' full' : '') + '">' + x.devices + '/' + (x.deviceLimit || '?') + '</span>' : '<span class="mut">—</span>';
        return '<div class="crow' + (selected.has(x.key) ? ' picked' : '') + '" data-row="' + E(x.key) + '">' +
          '<span><input type="checkbox" class="sel" data-sel="' + E(x.key) + '"' + (selected.has(x.key) ? ' checked' : '') + ' aria-label="select"></span>' +
          '<span class="cwho"><i class="av" style="--h:' + hue(x.email || x.key) + '">' + E(initial(x)) + '</i><span class="cwho-t"><button class="linkbtn" data-client="' + E(x.key) + '">' + E(x.email || '—') + '</button>' +
          '<small><button class="keybtn" data-copy="' + E(x.key) + '" title="' + E(t.copy) + '">' + E(x.key) + '</button>' + (x.version ? ' · v' + E(x.version) : '') + '</small>' + (x.note ? '<small class="cnote">📝 ' + E(x.note) + '</small>' : '') + '</span></span>' +
          '<span class="cst">' + chips(x) + '</span><span>' + planCell(x) + '</span><span>' + dev + '</span>' +
          '<span class="seen ' + seenCls(x) + '" title="' + E(x.lastSeen ? dt(x.lastSeen) : t.never) + '"><i></i>' + E(rel(x.lastSeen)) + '</span>' +
          '<span class="mut" title="' + E(dt(x.created)) + '">' + E(dshort(x.created)) + '</span>' +
          '<span class="cact"><button class="act a-paid" data-client="' + E(x.key) + '">' + E(t.uiOpen) + '</button><button class="act a-copy more" data-menu="' + E(x.key) + '" aria-label="menu">⋯</button></span></div>';
      }).join('') + (all.length > L.length ? '<button class="more-btn" id="more">' + E(t.uiMore(Math.min(100, all.length - L.length))) + '</button>' : '') ||
        '<div class="empty"><b>🔎</b><span>' + E(t.uiEmpty) + '</span>' + (filter !== 'all' || q || planF !== 'all' ? '<button class="pill" id="clr">' + E(t.uiClear) + '</button>' : '') + '</div>';
      $('shown').textContent = t.shown(L.length, all.length);
      if ($('more')) $('more').onclick = () => { limit += 100; paint(); };
      if ($('clr')) $('clr').onclick = () => { filter = 'all'; q = ''; $('q').value = ''; planF = 'all'; ls('loya_admin_plan', planF); paint(); };
      $('list').querySelectorAll('[data-client]').forEach(b => b.onclick = () => openClient(b.dataset.client));
      $('list').querySelectorAll('[data-copy]').forEach(b => b.onclick = (e) => { e.stopPropagation(); copy(b.dataset.copy); });
      $('list').querySelectorAll('[data-sel]').forEach(c => c.onchange = () => { c.checked ? selected.add(c.dataset.sel) : selected.delete(c.dataset.sel); c.closest('.crow').classList.toggle('picked', c.checked); bulk(L); });
      $('list').querySelectorAll('[data-menu]').forEach(b => b.onclick = (e) => { e.stopPropagation(); rowMenu(b.dataset.menu, b); });
      $('selall').onchange = () => { L.forEach(x => $('selall').checked ? selected.add(x.key) : selected.delete(x.key)); paint(); };
      bulk(L);
    }

    // ---------- меню «⋯» строки ----------
    function closeMenu() { const m = $('rmenu'); if (m) m.remove(); menuKey = null; }
    function rowMenu(key, btn) {
      if (menuKey === key) { closeMenu(); return; } closeMenu(); menuKey = key;
      const t = T(); const x = D.list.find(i => i.key === key); if (!x) return;
      const items = [['open', '⚙️ ' + t.uiOpenFull], ['copyKey', '📋 ' + t.uiCopyKey], ['copyEmail', '✉️ ' + t.uiCopyEmail], ['sep'],
        ...(x.plan === 'trial' ? [['extend', '⏳ ' + t.extend]] : []), ...(x.email ? [['nudge', '💬 ' + t.uiNudge]] : []), ['note', '📝 ' + t.editNote], ['resend', t.resend], ['sep'],
        x.plan === 'free' ? ['make_paid', '💳 ' + t.makePaid] : ['make_free', '🎁 ' + t.makeFree],
        ...(x.plan !== 'trial' && x.plan !== 'free' ? [['set_tier', (x.tier === 'pro' ? '⬇️ ' + t.toStarter : '⬆️ ' + t.toPro)]] : []),
        x.banned ? ['unban', '✅ ' + t.unban] : ['ban', '⛔ ' + t.ban], ['sep'], ['del', '🗑 ' + t.del, 'danger']];
      const m = document.createElement('div'); m.id = 'rmenu'; m.className = 'rmenu'; m.setAttribute('role', 'menu');
      m.innerHTML = items.map(i => i[0] === 'sep' ? '<hr>' : '<button type="button" role="menuitem" data-mi="' + i[0] + '" class="' + (i[2] || '') + '">' + E(i[1]) + '</button>').join('');
      document.body.appendChild(m);
      const r = btn.getBoundingClientRect(), mh = m.offsetHeight, mw = m.offsetWidth;
      m.style.top = Math.max(8, (r.bottom + mh + 8 > innerHeight ? r.top - mh - 6 : r.bottom + 6)) + 'px';
      m.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw)) + 'px';
      m.querySelectorAll('[data-mi]').forEach(b => b.onclick = async () => {
        const op = b.dataset.mi; closeMenu();
        if (op === 'open') return openClient(key);
        if (op === 'copyKey') return copy(key);
        if (op === 'copyEmail') return copy(x.email || '');
        if (op === 'del') return delKeys([key]);
        if (op === 'extend') return extend([key]);
        if (op === 'nudge') return nudge([key]);
        if (op === 'resend') { const r2 = await api('admin-action', { op: 'resend_key', key, lang }); return toast(r2.ok ? t.resent : t.mailErr, r2.ok ? 'ok' : 'err'); }
        return act(op, key, op === 'set_tier' ? (x.tier === 'pro' ? 'starter' : 'pro') : undefined);
      });
    }
    document.addEventListener('click', (e) => { if (!e.target.closest('#rmenu') && !e.target.closest('[data-menu]')) closeMenu(); });
    window.addEventListener('scroll', closeMenu, { passive: true });

    // ---------- массовые действия ----------
    async function extend(keys) {
      const t = T();
      const v = await ask({ icon: '⏳', title: t.extend, text: keys.length > 1 ? t.uiBulkFor(keys.length) : '', fields: [{ id: 'd', label: t.uiDays, type: 'number', value: 7, min: 1, max: 365 }], chips: [3, 7, 14, 30].map(n => ({ v: String(n), f: 'd', l: '+' + n })), ok: t.extend });
      if (!v) return; const days = Math.max(1, Math.min(365, Number(v.d) || 7));
      let ok = 0; for (const key of keys) { const r = await api('admin-action', { op: 'extend_trial', key, days }); if (r.ok) ok++; }
      await load(); toast(t.extend + ': ' + t.uiDoneN(ok, keys.length), ok ? 'ok' : 'err');
    }
    // «Нужна помощь?» — письмо от Loya: 3 шага за 5 минут, предложение настроить всё бесплатно и (по желанию) продление пробного
    async function nudge(keys) {
      const t = T(); keys = keys.filter(k => { const x = D.list.find(i => i.key === k); return x && x.email; }); if (!keys.length) return;
      const v = await ask({ icon: '💬', title: t.uiNudgeT, text: (keys.length > 1 ? t.uiBulkFor(keys.length) + ' ' : '') + t.uiNudgeText,
        fields: [{ id: 'l', label: t.uiNudgeLang, value: lang }, { id: 'd', label: t.uiNudgeDays, type: 'number', value: 7, min: 0, max: 30, hint: t.uiNudgeDaysHint }],
        chips: ['ru', 'uk', 'sk', 'en'].map(l => ({ v: l, f: 'l', l: l.toUpperCase() })).concat([0, 7, 14].map(n => ({ v: String(n), f: 'd', l: n ? '+' + n : '0' }))), ok: t.uiNudgeSend });
      if (!v) return;
      const lg = ['ru', 'uk', 'sk', 'en'].includes(String(v.l).trim().toLowerCase()) ? String(v.l).trim().toLowerCase() : lang;
      const days = Math.max(0, Math.min(30, Math.round(Number(v.d)) || 0));
      let ok = 0; for (const key of keys) { const r = await api('admin-action', { op: 'nudge', key, lang: lg, days }); if (r.ok) ok++; }
      await load(); toast(t.uiNudge + ': ' + t.uiDoneN(ok, keys.length), ok ? 'ok' : 'err');
    }
    async function bulkRun(op, label) {
      const t = T(); const keys = [...selected]; if (!keys.length) return;
      let extra = {};
      if (op === 'ban' && !(await ask({ icon: '⛔', title: t.ban, text: t.uiBulkFor(keys.length) + ' ' + t.confirmBan, ok: t.ban, danger: true }))) return;
      if (op === 'make_free') { const v = await ask({ icon: '🎁', title: t.makeFree, text: t.uiBulkFor(keys.length), fields: [{ id: 'u', label: t.until, type: 'date' }], ok: t.makeFree }); if (!v) return; extra = { freeUntil: v.u || '' }; }
      if (op === 'unban' && !(await ask({ icon: '✅', title: t.unban, text: t.uiBulkFor(keys.length), ok: t.unban }))) return;
      let ok = 0; for (const key of keys) { const r = await api('admin-action', Object.assign({ op, key }, extra)); if (r.ok) ok++; }
      await load(); toast(label + ': ' + t.uiDoneN(ok, keys.length), ok ? 'ok' : 'err');
    }
    function csvOf(list) {
      const cell = v => { let s = String(v == null ? '' : v); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
      const out = [['email', 'key', 'state', 'plan', 'tier', 'trial_until', 'free_until', 'created', 'last_seen', 'version', 'devices', 'livemode', 'note']].concat(list.map(x => [x.email, x.key, x.state, x.plan, x.tier, x.trialUntil, x.freeUntil, x.created, x.lastSeen, x.version, x.devices, x.livemode === null ? '' : x.livemode, x.note]));
      const blob = new Blob(['﻿' + out.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'loya-keys-' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    function bulk(L) {
      const t = T(); [...selected].forEach(k => { if (!D.list.some(x => x.key === k)) selected.delete(k); });
      const n = selected.size;
      $('bulk').classList.toggle('hide', !D.list.length); $('bulk').classList.toggle('has-sel', n > 0);
      $('selall-t').textContent = n ? t.uiSelected(n) : t.selectAll;
      $('selall').checked = L.length > 0 && L.every(x => selected.has(x.key));
      const sel = D.list.filter(x => selected.has(x.key));
      const btns = n ? [['extend', '⏳ ' + t.extend, sel.some(x => x.plan === 'trial')], ['nudge', '💬 ' + t.uiNudge, sel.some(x => x.email)], ['make_free', '🎁 ' + t.makeFree, true], ['ban', '⛔ ' + t.ban, true], ['unban', '✅ ' + t.unban, sel.some(x => x.banned)], ['emails', '✉️ ' + t.uiCopyEmails, true], ['csvsel', '⬇ CSV', true], ['del', '🗑 ' + t.delSel(n), true]].filter(b => b[2]) : [];
      $('bulkacts').innerHTML = btns.map(b => '<button type="button" class="act ' + (b[0] === 'del' ? 'a-del' : b[0] === 'ban' ? 'a-ban' : 'a-copy') + '" data-b="' + b[0] + '">' + E(b[1]) + '</button>').join('') + (n ? '<button type="button" class="act a-copy" data-b="none">✕ ' + E(t.uiDeselect) + '</button>' : '<button type="button" class="act a-copy" data-b="csv">⬇ ' + E(t.csv) + '</button>');
      $('bulkacts').querySelectorAll('[data-b]').forEach(b => b.onclick = () => {
        const k = b.dataset.b;
        if (k === 'del') return delKeys([...selected]);
        if (k === 'extend') return extend(sel.filter(x => x.plan === 'trial').map(x => x.key));
        if (k === 'nudge') return nudge(sel.map(x => x.key));
        if (k === 'emails') return copy(sel.map(x => x.email).filter(Boolean).join(', '));
        if (k === 'csvsel') return csvOf(sel);
        if (k === 'csv') return csvOf(rows());
        if (k === 'none') { selected.clear(); return paint(); }
        return bulkRun(k, b.textContent.replace(/^\S+\s/, ''));
      });
    }

    // ---------- аналитика ----------
    function analytics() {
      const t = T(); const box = $('v-analytics'); if (!box || !D) return;
      const L = D.list, now = Date.now();
      // новые ключи за 30 дней по дням
      const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(now - (29 - i) * DAY); return d.toISOString().slice(0, 10); });
      const byDay = days.map(d => { const xs = L.filter(x => String(x.created).slice(0, 10) === d); return { d, trial: xs.filter(x => x.plan === 'trial').length, paid: xs.filter(x => x.plan !== 'trial' && x.plan !== 'free').length, free: xs.filter(x => x.plan === 'free').length }; });
      const mx = Math.max(1, ...byDay.map(b => b.trial + b.paid + b.free));
      const new30 = byDay.reduce((a, b) => a + b.trial + b.paid + b.free, 0), new7 = byDay.slice(-7).reduce((a, b) => a + b.trial + b.paid + b.free, 0);
      const bars = byDay.map(b => { const s = b.trial + b.paid + b.free; return '<div class="ab" title="' + E(dshort(b.d) + ': ' + s) + '"><i class="p" style="height:' + (b.paid / mx * 100) + '%"></i><i class="t" style="height:' + (b.trial / mx * 100) + '%"></i><i class="f" style="height:' + (b.free / mx * 100) + '%"></i></div>'; }).join('');
      // активность
      const seen = (ms) => L.filter(x => x.lastSeen && now - new Date(x.lastSeen).getTime() < ms).length;
      const act4 = [[t.uiAct_today, seen(DAY), 'today'], [t.uiAct_week, seen(7 * DAY), 'week'], [t.uiAct_month, seen(30 * DAY), 'month'], [t.uiAct_never, L.filter(x => !x.lastSeen).length, 'never']];
      const tot = Math.max(1, L.length);
      // тарифы
      const plans = [['pro', L.filter(x => x.state === 'active' && x.tier === 'pro' && x.plan !== 'trial' && x.plan !== 'free').length, '#f472b6'], ['starter', L.filter(x => x.state === 'active' && x.tier !== 'pro' && x.plan !== 'trial' && x.plan !== 'free').length, '#e3b857'],
        ['trial', L.filter(x => x.state === 'active' && x.plan === 'trial').length, '#a78bfa'], ['free', L.filter(x => x.state === 'active' && x.plan === 'free').length, '#60a5fa'], ['inactive', L.filter(x => x.state !== 'active').length, '#4b5563']];
      const ps = Math.max(1, plans.reduce((a, p) => a + p[1], 0)); let acc = 0;
      const cone = plans.map(p => { const a = acc / ps * 360, b = (acc += p[1]) / ps * 360; return p[2] + ' ' + a + 'deg ' + b + 'deg'; }).join(',');
      // версии
      const vers = {}; L.forEach(x => { if (x.version) vers[x.version] = (vers[x.version] || 0) + 1; });
      const latest = (D.ready && D.ready.version) || Object.keys(vers).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0] || '';
      const vlist = Object.entries(vers).sort((a, b) => b[0].localeCompare(a[0], undefined, { numeric: true })).slice(0, 8);
      const vmx = Math.max(1, ...vlist.map(v => v[1]));
      const outdated = L.filter(x => x.version && latest && x.version !== latest && x.state === 'active').length;
      // пробный период и устройства
      const tr = D.money && D.money.trials || {};
      const trialAct = L.filter(x => x.plan === 'trial' && x.state === 'active');
      const trialSoon = trialAct.filter(x => new Date(x.trialUntil) - now < 3 * DAY).length;
      const risk = L.filter(atRisk).length;
      // рост платящих: новые минус отмены по месяцам (последние 6) и отток за 3 месяца
      const growth = () => {
        const m = D.money; if (!m || !Array.isArray(m.months) || !m.months.length) return '';
        const n = Math.min(6, m.months.length), from = m.months.length - n;
        const rows = m.months.slice(from).map((mo, i) => ({ mo, a: Number(m.newPaid[from + i]) || 0, c: Number(m.canceled[from + i]) || 0 }));
        const mx = Math.max(1, ...rows.map(r => Math.max(r.a, r.c)));
        const a3 = rows.slice(-3).reduce((s, r) => s + r.a, 0), c3 = rows.slice(-3).reduce((s, r) => s + r.c, 0);
        const base = (Number(m.payingLive) || 0) + c3; const churn = base ? Math.round(c3 / base * 1000) / 10 : null;
        const mname = (mo) => { const [y, mm] = String(mo).split('-').map(Number); return new Date(y, mm - 1, 1).toLocaleDateString(lang === 'en' ? 'en-GB' : lang, { month: 'short' }); };
        return card(t.uiA_growth, '<div class="akpis k3"><div><b class="g-up">+' + a3 + '</b><span>' + E(t.uiA_g_new) + '</span></div><div><b class="g-down">−' + c3 + '</b><span>' + E(t.uiA_g_lost) + '</span></div><div><b>' + (churn == null ? '—' : churn.toLocaleString(lang === 'en' ? 'en-GB' : lang) + '%') + '</b><span>' + E(t.uiA_g_churn) + '</span></div></div>' +
          '<div class="gbars">' + rows.map(r => { const net = r.a - r.c; return '<div class="gcol" title="' + E(mname(r.mo)) + ': +' + r.a + ' / −' + r.c + '"><div class="gpair"><i class="gup" style="height:' + (r.a / mx * 100) + '%"></i><i class="gdn" style="height:' + (r.c / mx * 100) + '%"></i></div><b class="' + (net > 0 ? 'g-up' : net < 0 ? 'g-down' : '') + '">' + (net > 0 ? '+' : '') + net + '</b><span>' + E(mname(r.mo)) + '</span></div>'; }).join('') + '</div>' +
          '<p class="anote">' + E(t.uiA_g_note) + '</p>');
      };
      const devTotal = L.reduce((a, x) => a + (x.devices || 0), 0), atLimit = L.filter(x => x.deviceLimit && x.devices >= x.deviceLimit).length;
      const card = (title, body, cls) => '<section class="apanel ' + (cls || '') + '"><h2>' + E(title) + '</h2>' + body + '</section>';
      box.innerHTML = '<div class="agrid">' +
        card(t.uiA_new, '<div class="akpis"><div><b>' + new7 + '</b><span>' + E(t.uiA_7d) + '</span></div><div><b>' + new30 + '</b><span>' + E(t.uiA_30d) + '</span></div></div><div class="abars">' + bars + '</div><div class="axis"><span>' + E(dshort(days[0])) + '</span><span>' + E(dshort(days[29])) + '</span></div><div class="legend"><span><b style="background:var(--grad)"></b>' + E(t.uiPlan_paid) + '</span><span><b style="background:#a78bfa"></b>' + E(t.uiPlan_trial) + '</span><span><b style="background:#60a5fa"></b>' + E(t.uiPlan_free) + '</span></div>', 'a-wide') +
        card(t.uiA_act, act4.map(a => '<div class="hbar"><span>' + E(a[0]) + '</span><i><em class="h-' + a[2] + '" style="width:' + (a[1] / tot * 100) + '%"></em></i><b>' + a[1] + '</b></div>').join('') + '<p class="anote">' + E(t.uiA_actNote(Math.round(seen(7 * DAY) / tot * 100))) + '</p>') +
        card(t.uiA_plans, '<div class="donut-w"><div class="donut" style="background:conic-gradient(' + cone + ')"><span><b>' + L.filter(x => x.state === 'active').length + '</b><small>' + E(t.sActive) + '</small></span></div><div class="dleg">' + plans.map(p => '<button type="button" class="dl" data-plan="' + p[0] + '"><b style="background:' + p[2] + '"></b>' + E(t['uiPlan_' + p[0]]) + '<em>' + p[1] + '</em></button>').join('') + '</div></div>') +
        card(t.uiA_vers, (vlist.length ? vlist.map(v => '<button type="button" class="hbar vbar" data-ver="' + E(v[0]) + '"><span>v' + E(v[0]) + (v[0] === latest ? ' <small class="chip c-ok">' + E(t.uiA_latest) + '</small>' : '') + '</span><i><em style="width:' + (v[1] / vmx * 100) + '%"></em></i><b>' + v[1] + '</b></button>').join('') : '<p class="anote">—</p>') + (outdated ? '<p class="anote warn">' + E(t.uiA_outdated(outdated)) + '</p>' : '')) +
        card(t.uiA_trial, '<div class="akpis k3"><div><b>' + trialAct.length + '</b><span>' + E(t.uiA_trialAct) + '</span></div><div><b>' + trialSoon + '</b><span>' + E(t.uiA_trialSoon) + '</span></div><div><b>' + (tr.rate == null ? '—' : Number(tr.rate).toLocaleString(lang === 'en' ? 'en-GB' : lang, { maximumFractionDigits: 1 }) + '%') + '</b><span>' + E(t.uiA_conv) + '</span></div></div>' + (trialSoon ? '<button type="button" class="pill" data-go="trial-soon">' + E(t.uiA_showSoon) + ' →</button>' : '') + (risk ? '<button type="button" class="risk-b" data-risk><b>⚠ ' + risk + '</b><span>' + E(t.uiA_risk) + '</span><em>' + E(t.uiA_riskGo) + ' →</em></button>' : '<p class="anote">✓ ' + E(t.uiA_riskNone) + '</p>')) +
        growth() +
        card(t.uiA_dev, '<div class="akpis k3"><div><b>' + devTotal + '</b><span>' + E(t.uiA_devTotal) + '</span></div><div><b>' + atLimit + '</b><span>' + E(t.uiA_devFull) + '</span></div><div><b>' + (D.stats.online7 || 0) + '</b><span>' + E(t.sOnline) + '</span></div></div>') +
        '</div>';
      box.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => { if (b.dataset.plan === 'inactive') { filter = 'inactive'; planF = 'all'; } else { filter = 'all'; planF = b.dataset.plan; } ls('loya_admin_plan', planF); go('clients'); });
      box.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => { filter = 'all'; q = 'v:' + b.dataset.ver; $('q').value = q; go('clients'); });
      box.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { filter = 'trial'; planF = 'all'; sort = 'trial'; ls('loya_admin_sort', sort); go('clients'); });
      box.querySelectorAll('[data-risk]').forEach(b => b.onclick = () => { filter = 'atrisk'; planF = 'all'; sort = 'trial'; ls('loya_admin_sort', sort); go('clients'); });
    }
    function go(v) { view = v; try { localStorage.setItem('loya_admin_view', v); } catch (e) { /* нет */ } paint(); window.scrollTo(0, 0); }

    // ---------- журнал ----------
    function journal() {
      const t = T(); const J = D.journal;
      let h = '<h2>' + E(t.jTitle) + ' <button class="pill" id="j-t">' + E(jOpen ? t.jHide : t.jShow) + '</button>' + (jOpen && J && J.length ? '<button class="pill" id="j-csv">⬇ CSV</button>' : '') + '</h2>';
      if (jOpen) {
        if (J === null) h += '<div class="mut" style="font-size:13px">' + E(t.jMissing) + '</div>';
        else {
          const ops = [...new Set(J.map(j => j.op))];
          h += '<div class="jbar"><input id="j-q" placeholder="' + E(t.uiJSearch) + '" value="' + E(jQ) + '"><select id="j-op"><option value="">' + E(t.uiJAll) + '</option>' + ops.map(o => '<option value="' + E(o) + '"' + (jOp === o ? ' selected' : '') + '>' + E(t['op_' + o] || o) + '</option>').join('') + '</select></div>';
          const what = j => { const d = j.detail || {}; return [d.key || '', d.keys ? d.keys.length + ' keys' : '', d.email || '', d.newKey || '', d.tier || '', d.days ? '+' + d.days + 'd' : '', d.reason || ''].filter(Boolean).join(' · '); };
          const list = J.filter(j => (!jOp || j.op === jOp) && (!jQ || ((t['op_' + j.op] || j.op) + ' ' + what(j) + ' ' + (j.ip || '')).toLowerCase().includes(jQ.toLowerCase())));
          h += list.length ? list.map(j => '<div class="jr"><small>' + E(dt(j.at)) + '</small><span><b class="jop jop-' + E(j.op) + '">' + E(t['op_' + j.op] || j.op) + '</b>' + (what(j) ? ' — ' + E(what(j)) : '') + (j.ip ? ' <small class="mut">' + E(j.ip) + '</small>' : '') + '</span></div>').join('') : '<div class="mut" style="font-size:13px">—</div>';
        }
      }
      $('journal').innerHTML = h;
      $('j-t').onclick = () => { jOpen = !jOpen; journal(); };
      if ($('j-q')) { $('j-q').oninput = () => { jQ = $('j-q').value; const p = $('j-q').selectionStart; journal(); const i = $('j-q'); i.focus(); i.setSelectionRange(p, p); }; $('j-op').onchange = () => { jOp = $('j-op').value; journal(); }; }
      if ($('j-csv')) $('j-csv').onclick = () => {
        const cell = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
        const rowsJ = [['at', 'op', 'ip', 'detail']].concat(J.map(j => [j.at, j.op, j.ip || '', JSON.stringify(j.detail || {})]));
        const blob = new Blob(['﻿' + rowsJ.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'loya-admin-log-' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      };
    }

    // ---------- шапка: режим Stripe, обновлено, автообновление; плитки обзора ----------
    function chrome() {
      const t = T();
      const mm = D.stripeMode || 'none';
      const env = $('env'); if (env) { env.className = 'env env-' + (mm === 'live' ? 'live' : mm === 'test' ? 'test' : 'none'); env.textContent = mm === 'live' ? 'LIVE' : mm === 'test' ? 'TEST' : '—'; env.title = mm === 'live' ? t.modeLive : t.modeTest; }
      loadedAt = loadedAt || Date.now();
      const upd = $('upd'); if (upd) upd.textContent = t.uiUpdated(new Date(loadedAt).toLocaleTimeString(lang === 'en' ? 'en-GB' : lang, { hour: '2-digit', minute: '2-digit' }));
      const au = $('auto'); if (au) { au.checked = autoOn; $('auto-t').textContent = t.uiAuto; au.onchange = () => { autoOn = au.checked; ls('loya_admin_auto', autoOn ? '1' : '0'); schedule(); toast(autoOn ? t.uiAutoOn : t.uiAutoOff, 'info'); }; }
      // плитки «Обзора» открывают нужный список клиентов
      const map = ['all', 'active', 'paying', 'free', 'online', 'trial', 'pro', 'test'];
      document.querySelectorAll('#stats > .stat').forEach((s, i) => { const f = map[i]; if (!f) return; s.classList.add('clickable'); s.tabIndex = 0; s.onclick = () => { if (f === 'pro') { filter = 'all'; planF = 'pro'; } else { filter = f; planF = 'all'; } ls('loya_admin_plan', planF); go('clients'); }; });
      if (view === 'analytics') analytics();
      let acc = $('acct');
      if (!acc && $('v-service')) { acc = document.createElement('div'); acc.id = 'acct'; acc.className = 'panel acct'; $('v-service').appendChild(acc); }
      if (acc) {
        acc.innerHTML = '<h2>' + E(t.uiAcct) + '</h2><div class="acct-r"><span class="mut">' + E(t.uiLang) + '</span>' + Object.keys(TXT).map(k => '<button class="pill' + (k === lang ? ' on' : '') + '" data-al="' + k + '">' + k.toUpperCase() + '</button>').join('') + '</div><div class="acct-r"><button class="act a-copy" id="acc-lo">' + E(t.logout) + '</button><button class="act a-ban" id="acc-lo2">' + E(t.logoutAll) + '</button></div>';
        acc.querySelectorAll('[data-al]').forEach(b => b.onclick = () => { lang = b.dataset.al; try { localStorage.setItem('loya_admin_lang', lang); } catch (e) { /* нет */ } paint(); });
        $('acc-lo').onclick = () => $('lo').click(); $('acc-lo2').onclick = () => $('lo2').click();
      }
    }
    function schedule() { clearInterval(autoTimer); if (autoOn) autoTimer = setInterval(() => { if (!document.hidden && !document.querySelector('.dlg-ov') && $('modal').classList.contains('hide')) load(); }, 60000); }
    function loaded() { loadedAt = Date.now(); }
    schedule();

    // ---------- горячие клавиши: «/» — поиск, Esc — закрыть окно ----------
    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (e.key === '/' && !typing && D) { e.preventDefault(); if (view !== 'clients') go('clients'); setTimeout(() => { const i = $('q'); if (i) { i.focus(); i.select(); } }, 30); }
      if (e.key === 'Escape') { if ($('rmenu')) return closeMenu(); if (!$('modal').classList.contains('hide') && !document.querySelector('.dlg-ov')) $('modal').classList.add('hide'); }
    });

    return { clients, toast, ask, analytics, journal, chrome, loaded, rel, extend, copy, go };
  })();
  window.UI = UI;
}
const src = adminUiClient.toString();
const CSS = `
/* ===== 2.30: админка — оболочка ===== */
.top{position:sticky;top:0;z-index:20;margin:-16px 0 14px;padding:12px 0;background:rgba(6,7,10,.86);box-shadow:0 0 0 100vmax rgba(6,7,10,.86);clip-path:inset(0 -100vmax);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,.06)}
.top h1{flex:0 1 auto!important;font-size:18px!important;display:flex;align-items:center;gap:10px;min-width:0!important}
.brand-mark{width:34px;height:34px;border-radius:11px;background:var(--grad);color:#1a1204;display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:17px;box-shadow:0 8px 20px rgba(227,184,87,.3);flex:none}
.env{font-size:10.5px;font-weight:900;letter-spacing:.12em;padding:4px 8px;border-radius:7px;border:1px solid}.env-live{color:#86efac;border-color:rgba(74,222,128,.5);background:rgba(34,197,94,.1)}.env-test{color:#fde68a;border-color:rgba(251,191,36,.6);background:rgba(245,158,11,.12)}.env-none{color:#fca5a5;border-color:rgba(248,113,113,.5)}
.tsp{flex:1}.upd{font-size:12px;color:var(--mut);font-weight:700;white-space:nowrap}
.autow{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;color:var(--mut);cursor:pointer;white-space:nowrap}.autow input{width:16px;height:16px;accent-color:var(--a)}
#lang1 .pill{padding:5px 8px;font-size:11.5px}
.tabs{position:sticky;top:62px;z-index:15;backdrop-filter:blur(10px);background:rgba(14,15,19,.85)!important}
.stat.clickable{cursor:pointer;transition:transform .15s,box-shadow .15s}.stat.clickable:hover{transform:translateY(-2px);box-shadow:0 12px 26px rgba(0,0,0,.35)}.stat.clickable:focus-visible{outline:2px solid var(--a);outline-offset:2px}
.stat span{color:var(--mut);font-size:12.5px;font-weight:700}
/* ===== клиенты ===== */
.ctools{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.csel{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:var(--mut)}.csel select{height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:#151922;color:inherit;padding:0 10px;font:inherit;font-size:13.5px;font-weight:700}
.fchip small{opacity:.7;font-weight:800;margin-left:2px}.fchip.f-pastdue:not(.on){color:#fde68a}.fchip.f-atrisk:not(.on){color:#fdba74}
.risk-b{display:flex;align-items:center;gap:10px;width:100%;margin-top:12px;padding:11px 14px;border-radius:12px;border:1px solid rgba(251,146,60,.45);background:rgba(251,146,60,.08);color:inherit;font:inherit;cursor:pointer;text-align:left}.risk-b:hover{background:rgba(251,146,60,.15)}.risk-b b{color:#fdba74;font-size:16px;white-space:nowrap}.risk-b span{flex:1;font-size:13px;color:var(--mut)}.risk-b em{font-style:normal;font-weight:800;font-size:13px;color:#fdba74;white-space:nowrap}
.gbars{display:flex;align-items:stretch;gap:10px;height:130px;margin-top:14px}.gcol{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0}.gpair{flex:1;width:100%;display:flex;align-items:flex-end;justify-content:center;gap:4px}.gpair i{width:12px;border-radius:5px 5px 2px 2px;min-height:2px}.gpair .gup{background:linear-gradient(180deg,#86efac,#22c55e)}.gpair .gdn{background:linear-gradient(180deg,#fca5a5,#ef4444)}.gcol b{font-size:12.5px;font-variant-numeric:tabular-nums}.gcol span{font-size:11px;color:var(--mut)}.g-up{color:#4ade80}.g-down{color:#f87171}
.fchip.f-banned:not(.on){color:#fca5a5}
.crow{display:grid;grid-template-columns:28px minmax(240px,2.4fr) minmax(110px,1fr) minmax(110px,1fr) 70px 120px 92px 150px;gap:10px;align-items:center;padding:10px 14px;border-top:1px solid var(--line);transition:background .12s}
.crow:hover{background:rgba(255,255,255,.025)}.crow.picked{background:rgba(227,184,87,.07)}
.chead{border-top:0;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--mut);padding-top:12px;padding-bottom:8px;position:sticky;top:116px;z-index:5;background:rgba(18,20,26,.97);border-radius:16px 16px 0 0}.chead:hover{background:rgba(18,20,26,.97)}
.crow .sel{margin:0}
.cwho{display:flex;align-items:center;gap:10px;min-width:0}.cwho-t{display:flex;flex-direction:column;min-width:0}.cwho-t .linkbtn{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;font-size:14px}
.cwho small{font-size:11.5px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cnote{color:#fde68a!important}
.av{flex:none;width:34px;height:34px;border-radius:11px;display:inline-flex;align-items:center;justify-content:center;font-style:normal;font-weight:900;font-size:14px;color:#fff;background:linear-gradient(135deg,hsl(var(--h) 55% 46%),hsl(calc(var(--h) + 40) 60% 34%))}
.keybtn{background:none;border:0;padding:0;font:600 11.5px Consolas,monospace;color:var(--a);cursor:pointer}.keybtn:hover{text-decoration:underline}
.cst{display:flex;flex-wrap:wrap;gap:4px}.cst .chip,.crow .chip{margin-left:0}
.dev{font-weight:800;font-size:13px;font-variant-numeric:tabular-nums}.dev.full{color:#fde68a}.mut{color:var(--mut);font-size:12.5px}
.seen{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;white-space:nowrap}.seen i{width:8px;height:8px;border-radius:50%;flex:none;background:#4b5563}
.seen-today i{background:#4ade80;box-shadow:0 0 0 3px rgba(74,222,128,.18)}.seen-week i{background:#a3e635}.seen-month i{background:#fbbf24}.seen-old i{background:#f87171}.seen-never{color:var(--mut)}
.cact{display:flex;gap:6px;justify-content:flex-end}.cact .more{width:34px;padding:0;font-size:16px;letter-spacing:1px}
.more-btn{display:block;width:100%;padding:13px;border:0;border-top:1px solid var(--line);background:none;color:var(--a2);font:inherit;font-weight:800;cursor:pointer;border-radius:0 0 16px 16px}.more-btn:hover{background:rgba(255,255,255,.03)}
.empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:34px 16px;color:var(--mut);font-size:14px;text-align:center}.empty b{font-size:30px}
.bulk{position:sticky;top:116px;z-index:6}.bulk.has-sel{background:rgba(42,33,14,.96)!important;border-color:rgba(227,184,87,.55)!important;backdrop-filter:blur(8px)}
#bulkacts{display:flex;gap:6px;flex-wrap:wrap}
.rmenu{position:fixed;z-index:60;min-width:220px;padding:6px;border-radius:14px;background:#171a22;border:1px solid rgba(255,255,255,.12);box-shadow:0 22px 50px rgba(0,0,0,.55);display:flex;flex-direction:column;animation:pop .14s ease}
.rmenu button{border:0;background:none;color:#f4efe4;font:inherit;font-size:13.5px;font-weight:700;text-align:left;padding:9px 11px;border-radius:9px;cursor:pointer}.rmenu button:hover{background:rgba(255,255,255,.07)}.rmenu button.danger{color:#fca5a5}.rmenu hr{border:0;border-top:1px solid rgba(255,255,255,.08);margin:4px 2px}
@keyframes pop{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}
@media(max-width:980px){.crow{grid-template-columns:28px 1fr auto;row-gap:6px}.chead{display:none}.crow>span:nth-child(3),.crow>span:nth-child(4),.crow>span:nth-child(5),.crow>span:nth-child(6),.crow>span:nth-child(7){grid-column:2;display:inline-flex}
 .crow>span:nth-child(3){grid-row:2}.crow>span:nth-child(4){grid-row:2;justify-self:start;margin-left:0}.crow{grid-template-areas:none}.crow>span:nth-child(8){grid-column:3;grid-row:1}
 .crow>span:nth-child(5),.crow>span:nth-child(7){display:none}.crow>span:nth-child(6){grid-row:3}.crow>span:nth-child(4){grid-column:2;grid-row:3;justify-self:end}}
@media(max-width:600px){.top{gap:6px;flex-wrap:nowrap}.top h1{font-size:16px!important}.upd,.autow,#lang1,#lo2{display:none!important}#rf,#lo{padding:7px 9px;font-size:12px;white-space:nowrap}.top h1 #ttl{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.tabs{top:58px;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));width:100%!important;overflow:visible!important}.tab{flex-direction:column;gap:2px!important;font-size:11.5px!important;padding:7px 2px!important;white-space:normal!important;text-align:center;line-height:1.15}.tab small{display:none}.cact .a-paid{display:none}.bulk{top:118px}.csel{flex:1 1 140px}.csel select{flex:1}}
.acct-r{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}.acct h2{margin-bottom:4px!important}
/* ===== окна и уведомления ===== */
.dlg-ov{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;animation:fade .15s}
.dlg{width:100%;max-width:420px;padding:18px;border-radius:18px;display:flex;flex-direction:column;gap:12px;border:1px solid transparent;background:linear-gradient(170deg,rgba(26,28,36,.98),rgba(12,13,17,.98)) padding-box,linear-gradient(140deg,rgba(247,216,143,.5),rgba(255,255,255,.05) 40%,rgba(227,184,87,.35)) border-box;box-shadow:0 30px 70px rgba(0,0,0,.6);animation:pop .16s ease}
.dlg-h{display:flex;align-items:center;gap:10px;font-size:16px}.dlg-ic{font-size:22px}.dlg-t{font-size:13.5px;color:var(--mut);line-height:1.5;margin:0}
.dlg-f{display:flex;flex-direction:column;gap:6px;font-size:12.5px;font-weight:700;color:var(--mut)}.dlg-f input,.dlg-f textarea{width:100%;font:inherit;font-size:15px;color:inherit;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.05);padding:10px 12px}.dlg-f textarea{resize:vertical;min-height:80px}.dlg-f small{font-weight:600}
.dlg-chips{display:flex;gap:6px;flex-wrap:wrap}.dlg-a{display:flex;gap:8px;justify-content:flex-end;margin-top:4px}.dlg-a .btn{min-width:110px}
.btn.danger{background:linear-gradient(135deg,#ef4444,#b91c1c)!important;color:#fff!important;box-shadow:0 10px 24px rgba(239,68,68,.3)!important}
@keyframes fade{from{opacity:0}to{opacity:1}}
.modal{z-index:50}body:has(.modal:not(.hide)){overflow:hidden}
.toasts{position:fixed;right:16px;bottom:16px;z-index:90;display:flex;flex-direction:column;gap:8px;max-width:min(380px,calc(100vw - 32px))}
.toast{display:flex;gap:10px;align-items:flex-start;padding:11px 14px;border-radius:13px;font-size:13.5px;font-weight:700;background:#171a22;border:1px solid rgba(255,255,255,.12);box-shadow:0 16px 40px rgba(0,0,0,.5);opacity:0;transform:translateY(10px);transition:opacity .25s,transform .25s}
.toast.in{opacity:1;transform:none}.toast.ok{border-color:rgba(74,222,128,.45)}.toast.err{border-color:rgba(248,113,113,.6)}.toast.info{border-color:rgba(147,197,253,.45)}.toast i{font-style:normal}
/* ===== аналитика ===== */
.agrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.apanel{border-radius:16px;padding:14px 16px;border:1px solid transparent;background:linear-gradient(170deg,rgba(24,26,33,.95),rgba(12,13,17,.95)) padding-box,linear-gradient(140deg,rgba(247,216,143,.45),rgba(255,255,255,.05) 35%,rgba(255,255,255,.04) 65%,rgba(227,184,87,.35)) border-box}
.apanel{min-width:0;overflow:hidden}.agrid{min-width:0;width:100%}.abars{overflow:hidden;width:100%}.ab{flex:1 1 0}
.apanel.a-wide{grid-column:1/-1}.apanel h2{font-size:15px;margin:0 0 12px}
.akpis{display:flex;gap:22px;margin-bottom:10px}.akpis.k3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.akpis b{display:block;font-size:26px;font-weight:800;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;font-variant-numeric:tabular-nums}.akpis span{font-size:12px;color:var(--mut);font-weight:700}
.abars{display:flex;align-items:flex-end;gap:3px;height:130px;border-bottom:1px solid var(--line)}.ab{flex:1;height:100%;display:flex;flex-direction:column-reverse;gap:1px;min-width:0}.ab i{display:block;width:100%;border-radius:3px}.ab .p{background:var(--grad)}.ab .t{background:#a78bfa}.ab .f{background:#60a5fa}.ab:hover i{filter:brightness(1.25)}
.axis{display:flex;justify-content:space-between;font-size:11px;color:var(--mut);margin-top:6px}
.hbar{display:grid;grid-template-columns:minmax(90px,1fr) 2fr 40px;align-items:center;gap:10px;font-size:13px;font-weight:700;padding:5px 0;width:100%;background:none;border:0;color:inherit;font-family:inherit;text-align:left}.hbar i{height:10px;border-radius:6px;background:rgba(255,255,255,.07);overflow:hidden;display:block}.hbar em{display:block;height:100%;border-radius:6px;background:var(--grad)}.hbar b{text-align:right;font-variant-numeric:tabular-nums}
.h-today{background:#4ade80!important}.h-week{background:#a3e635!important}.h-month{background:#fbbf24!important}.h-never{background:#6b7280!important}
.vbar{cursor:pointer;border-radius:8px;padding:5px 6px}.vbar:hover{background:rgba(255,255,255,.04)}.vbar .chip{font-size:10px;padding:1px 5px}
.anote{font-size:12.5px;color:var(--mut);margin:10px 0 0;line-height:1.45}.anote.warn{color:#fde68a}
.donut-w{display:flex;gap:16px;align-items:center;flex-wrap:wrap}.donut{width:140px;height:140px;border-radius:50%;display:grid;place-items:center;flex:none}.donut span{width:92px;height:92px;border-radius:50%;background:#12141a;display:flex;flex-direction:column;align-items:center;justify-content:center}.donut b{font-size:24px}.donut small{font-size:11px;color:var(--mut);font-weight:700}
.dleg{display:flex;flex-direction:column;gap:4px;flex:1;min-width:140px}.dl{display:flex;align-items:center;gap:8px;background:none;border:0;color:inherit;font:inherit;font-size:13px;font-weight:700;padding:5px 6px;border-radius:8px;cursor:pointer;text-align:left}.dl:hover{background:rgba(255,255,255,.05)}.dl b{width:10px;height:10px;border-radius:3px;flex:none}.dl em{margin-left:auto;font-style:normal;font-variant-numeric:tabular-nums}
@media(max-width:980px){.agrid{grid-template-columns:1fr 1fr}}@media(max-width:640px){.agrid{grid-template-columns:1fr}.akpis.k3 b{font-size:22px}}
/* ===== журнал ===== */
.jbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}.jbar input{flex:1;min-width:180px;height:40px}.jbar select{height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:#151922;color:inherit;padding:0 10px;font:inherit}
.jop{font-weight:800}.jop-ban,.jop-delete,.jop-login_fail,.jop-cancel_stripe{color:#fca5a5}.jop-unban,.jop-create_free,.jop-extend_trial{color:#86efac}
`;
module.exports = { JS: src.slice(src.indexOf('{') + 1, src.lastIndexOf('}')), CSS };
