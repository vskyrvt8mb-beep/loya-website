// grow-ui.js — интерфейс Loya 2.20: онлайн-запись (вкладка «Записи» и настройки), отзывы после визита,
// «Приведи друга» (ссылка гостя, настройки), касса Dotykačka и чеки из CSV.
// Подключается после renderer.js и пользуется его общими функциями (t, escapeHtml, uiAlert, SETTINGS_LOADERS…).
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (v) => escapeHtml(v == null ? '' : String(v));
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return ymd(d); };
  const hm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const dayLabel = (s, o) => new Date(s + 'T12:00:00').toLocaleDateString(localeCode(), o);
  const money = (v) => (v == null || v === '' ? '' : moneyFmt(Number(v)));
  const toast = (text) => { try { showUndoToastLike(text); } catch (e) { /* без уведомления */ } };
  async function copy(text, statusEl) { try { await navigator.clipboard.writeText(text); } catch (e) { /* без буфера */ } if (statusEl) { statusEl.textContent = t('onlineCopied'); setTimeout(() => { statusEl.textContent = ''; }, 2000); } else toast(t('onlineCopied')); }
  function lxShow(id, html) {
    let m = $(id);
    if (!m) { m = document.createElement('div'); m.id = id; m.className = 'lx-modal'; document.body.appendChild(m); m.addEventListener('mousedown', (e) => { if (e.target === m) m.style.display = 'none'; }); }
    m.innerHTML = html; m.style.display = 'flex';
    m.querySelectorAll('.lx-close').forEach(b => b.addEventListener('click', () => { m.style.display = 'none'; }));
    return m;
  }

  // =============== возможность «Онлайн-запись» (вкладка) ===============
  let bookCfg = null;
  async function loadBookCfg() { try { bookCfg = await window.api.bookGet(); } catch (e) { bookCfg = null; } return bookCfg; }
  async function applyBookingFeature() {
    const s = await window.api.getSettings();
    let on = s.feature_booking;
    if (on !== '1' && on !== '0') on = s.book_on === '1' || ['barber', 'nails', 'spa', 'tattoo', 'petgroom', 'photo'].includes(s.business_niche) ? '1' : '0';
    features.booking = on === '1';
    const nav = document.querySelector('.nav-btn[data-view="appointments"]'); if (nav) nav.style.display = features.booking ? '' : 'none';
    const fb = $('feat-booking'); if (fb) fb.checked = features.booking;
    const tile = $('tile-booking'); if (tile) tile.style.display = features.booking ? '' : 'none';
    if (!features.booking && currentView === 'appointments') { const d = document.querySelector('.nav-btn[data-view="dashboard"]'); if (d) d.click(); }
    if (typeof renderSettingsCats === 'function') renderSettingsCats();
    refreshApptBadge();
  }
  $('feat-booking').addEventListener('change', async (e) => { await window.api.saveSettings({ feature_booking: e.target.checked ? '1' : '0' }); applyBookingFeature(); });
  const prevApply = applyFeatures;
  applyFeatures = function () { prevApply.apply(this, arguments); applyBookingFeature(); };   // eslint-disable-line no-global-assign

  async function refreshApptBadge() {
    const b = $('nav-appt-badge'); if (!b) return;
    if (!features.booking) { b.hidden = true; return; }
    try { const u = await window.api.apptUpcoming(); b.hidden = !u.today; b.textContent = String(u.today); } catch (e) { b.hidden = true; }
  }
  setInterval(refreshApptBadge, 60000);

  // =============== вкладка «Записи» ===============
  let apDay = ymd(new Date());
  const ST_ICON = { booked: '🕑', done: '✅', noshow: '🚫', cancelled: '✕' };
  async function refreshAppointments() {
    const cfg = await loadBookCfg();
    const off = $('ap-off');
    if (cfg && !cfg.on) {
      off.style.display = 'flex';
      off.innerHTML = `<div><b>${esc(t('apOffTitle'))}</b><p class="hint">${esc(t('apOffText'))}</p></div><button type="button" class="team-btn-primary" id="ap-setup">${esc(t('apSetup'))}</button>`;
      $('ap-setup').addEventListener('click', () => openSettingsModal('settings-modal-booking'));
    } else off.style.display = 'none';
    $('ap-link').style.display = cfg && cfg.on && cfg.link ? '' : 'none';
    // неделя (с понедельника), в которую попадает выбранный день
    const d0 = new Date(apDay + 'T12:00:00'); const monday = addDays(apDay, -((d0.getDay() + 6) % 7));
    const week = await window.api.apptList({ from: monday, to: addDays(monday, 6) });
    const today = ymd(new Date());
    $('ap-week').innerHTML = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(monday, i); const n = week.filter(a => a.date === day && a.status === 'booked').length;
      return `<button type="button" class="ap-wd${day === apDay ? ' on' : ''}${day === today ? ' today' : ''}" data-d="${day}"><small>${esc(dayLabel(day, { weekday: 'short' }))}</small><b>${esc(dayLabel(day, { day: 'numeric' }))}</b><span>${n ? n : '·'}</span></button>`;
    }).join('');
    $('ap-week').querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { apDay = b.dataset.d; refreshAppointments(); }));
    { const tt = dayLabel(apDay, { weekday: 'long', day: 'numeric', month: 'long' }); $('ap-day-title').textContent = tt.charAt(0).toUpperCase() + tt.slice(1); }
    const list = week.filter(a => a.date === apDay);
    const L = $('ap-list');
    if (!list.length) { L.innerHTML = `<div class="ap-empty">📭 ${esc(t('apEmpty'))}</div>`; }
    else L.innerHTML = list.map(a => {
      const name = a.client_name || a.name || '—';
      const sub = [a.service_name, a.staff_name, a.price != null ? money(a.price) : ''].filter(Boolean).join(' · ');
      const contact = [a.client_phone || a.phone, a.client_email || a.email].filter(Boolean).join(' · ');
      const acts = a.status === 'booked'
        ? `<button type="button" class="ap-btn ap-ok" data-act="arrived" title="${esc(t('apArrived'))}">✓ <span>${esc(t('apArrived'))}</span></button><button type="button" class="ap-btn" data-act="noshow" title="${esc(t('apNoShow'))}">🚫</button><button type="button" class="ap-btn" data-act="edit" title="${esc(t('apEdit'))}">✎</button><button type="button" class="ap-btn ap-del" data-act="cancel" title="${esc(t('apCancel'))}">✕</button>`
        : `<span class="ap-state">${ST_ICON[a.status] || ''} ${esc(t('apSt_' + a.status))}</span>${a.status !== 'done' ? `<button type="button" class="ap-btn" data-act="restore" title="${esc(t('apRestore'))}">↺</button>` : ''}`;
      return `<div class="ap-item ap-st-${esc(a.status)}" data-id="${a.id}">
        <div class="ap-time"><b>${hm(a.start_min)}</b><small>${hm(Math.min(1439, a.start_min + a.dur))}</small></div>
        <div class="ap-main"><div class="ap-name">${a.client_id ? `<a href="#" data-client="${a.client_id}">${esc(name)}</a>` : esc(name)}${a.source === 'online' ? ` <span class="ap-badge">🌐 ${esc(t('apOnline'))}</span>` : ''}</div>
          ${sub ? `<div class="ap-sub">${esc(sub)}</div>` : ''}${contact ? `<div class="ap-contact">${esc(contact)}</div>` : ''}${a.note ? `<div class="ap-note">📝 ${esc(a.note)}</div>` : ''}</div>
        <div class="ap-acts">${acts}</div></div>`;
    }).join('');
    L.querySelectorAll('[data-client]').forEach(x => x.addEventListener('click', (e) => { e.preventDefault(); openClientProfile(Number(x.dataset.client)); }));
    L.querySelectorAll('.ap-item [data-act]').forEach(b => b.addEventListener('click', () => apAction(Number(b.closest('.ap-item').dataset.id), b.dataset.act, list)));
    $('ap-sync').textContent = cfg && cfg.on && cfg.lastSync ? t('apSynced')(fmtDT(cfg.lastSync)) : '';
    refreshApptBadge();
  }
  async function apAction(id, act, list) {
    const a = list.find(x => x.id === id); if (!a) return;
    if (act === 'edit') { openApptEditor(a); return; }
    if (act === 'arrived') {
      const r = await window.api.apptArrived(id);
      if (!r || !r.ok) { uiAlert(errText((r && r.error) || 'failed')); return; }
      const res = r.result || {};
      toast(res.needsAmount ? t('apArrivedNeedSum') : res.reward ? t('apArrivedReward') : t('apArrivedOk'));
      refreshAppointments(); return;
    }
    if (act === 'cancel') { if (!(await uiConfirm(t('apCancelQ')(a.client_name || a.name || '—', hm(a.start_min)), { danger: true }))) return; await window.api.apptDelete(id); refreshAppointments(); return; }
    if (act === 'noshow') { await window.api.apptStatus(id, 'noshow'); refreshAppointments(); return; }
    if (act === 'restore') { await window.api.apptStatus(id, 'booked'); refreshAppointments(); }
  }
  async function openApptEditor(a) {
    const cfg = bookCfg || await loadBookCfg() || { services: [], staff: [] };
    const clients = await window.api.listClients();
    const isNew = !a || !a.id;
    a = a || { date: apDay, start_min: 10 * 60, dur: (cfg.services[0] || {}).d || 60, price: (cfg.services[0] || {}).p, service_id: (cfg.services[0] || {}).id || '', staff_id: (cfg.staff[0] || {}).id || '' };
    const cl = a.client_id ? clients.find(c => c.id === a.client_id) : null;
    const m = lxShow('lx-appt', `<div class="lx-box ap-ed"><div class="lx-head"><b>📅 ${esc(isNew ? t('apNew') : t('apEdit'))}</b><button type="button" class="lx-close">✕</button></div>
      <label class="ap-f"><span>${esc(t('apClient'))}</span><input type="text" id="ae-client" list="ae-clients" autocomplete="off" value="${esc(cl ? cl.name + (cl.phone ? ' · ' + cl.phone : '') : (a.name || ''))}" placeholder="${esc(t('apClientPh'))}"><datalist id="ae-clients">${clients.slice(0, 2000).map(c => `<option value="${esc(c.name + (c.phone ? ' · ' + c.phone : ''))}">`).join('')}</datalist></label>
      <label class="ap-f" id="ae-phone-row"><span>${esc(t('apPhone'))}</span><input type="tel" id="ae-phone" value="${esc(a.phone || '')}"></label>
      <div class="ap-grid">
        <label class="ap-f"><span>${esc(t('apService'))}</span><select id="ae-svc">${cfg.services.map(s => `<option value="${esc(s.id)}" data-d="${s.d}" data-p="${s.p == null ? '' : s.p}"${s.id === a.service_id ? ' selected' : ''}>${esc(s.n)}</option>`).join('')}<option value=""${!a.service_id ? ' selected' : ''}>${esc(t('apOtherService'))}</option></select></label>
        <label class="ap-f"><span>${esc(t('apStaff'))}</span><select id="ae-staff"><option value="">—</option>${cfg.staff.map(s => `<option value="${esc(s.id)}"${s.id === a.staff_id ? ' selected' : ''}>${esc(s.n)}</option>`).join('')}</select></label>
        <label class="ap-f"><span>${esc(t('apDate'))}</span><input type="date" id="ae-date" value="${esc(a.date)}"></label>
        <label class="ap-f"><span>${esc(t('apTime'))}</span><input type="time" id="ae-time" step="300" value="${hm(a.start_min)}"></label>
        <label class="ap-f"><span>${esc(t('apDur'))}</span><input type="number" id="ae-dur" min="5" max="600" step="5" value="${a.dur}"></label>
        <label class="ap-f"><span>${esc(t('apPrice'))}</span><input type="number" id="ae-price" min="0" step="0.5" value="${a.price == null ? '' : a.price}"></label>
      </div>
      <label class="ap-f"><span>${esc(t('apNote'))}</span><input type="text" id="ae-note" maxlength="300" value="${esc(a.note || '')}"></label>
      <div class="lx-actions"><button type="button" class="btn-secondary lx-close">${esc(t('dlgCancel'))}</button><button type="button" class="team-btn-primary" id="ae-save">${esc(t('promoSave'))}</button></div></div>`);
    const findClient = () => { const v = $('ae-client').value.trim(); return clients.find(c => (c.name + (c.phone ? ' · ' + c.phone : '')) === v) || null; };
    const syncPhone = () => { $('ae-phone-row').style.display = findClient() ? 'none' : ''; };
    $('ae-client').addEventListener('input', syncPhone); syncPhone();
    $('ae-svc').addEventListener('change', () => { const o = $('ae-svc').selectedOptions[0]; if (o && o.dataset.d) { $('ae-dur').value = o.dataset.d; $('ae-price').value = o.dataset.p; } });
    $('ae-save').addEventListener('click', async () => {
      const c = findClient(); const typed = $('ae-client').value.trim();
      if (!c && !typed) { flashBadInput($('ae-client')); return; }
      const payload = { id: a.id, clientId: c ? c.id : null, name: c ? c.name : typed, phone: c ? (c.phone || '') : $('ae-phone').value.trim(), serviceId: $('ae-svc').value, serviceName: $('ae-svc').value ? '' : t('apOtherService'),
        staffId: $('ae-staff').value, date: $('ae-date').value, time: $('ae-time').value, dur: $('ae-dur').value, price: $('ae-price').value, note: $('ae-note').value.trim() };
      let r = await window.api.apptSave(payload);
      if (r && r.conflict) {
        const who = r.conflicts.map(x => `${hm(x.start_min)} ${x.name}`).join(', ');
        if (!(await uiConfirm(t('apConflict')(who)))) return;
        r = await window.api.apptSave({ ...payload, force: true });
      }
      if (!r || !r.ok) { uiAlert(errText((r && r.error) || 'failed')); return; }
      m.style.display = 'none'; apDay = payload.date || apDay; refreshAppointments();
    });
  }
  $('ap-prev').addEventListener('click', () => { apDay = addDays(apDay, -7); refreshAppointments(); });
  $('ap-next').addEventListener('click', () => { apDay = addDays(apDay, 7); refreshAppointments(); });
  $('ap-today').addEventListener('click', () => { apDay = ymd(new Date()); refreshAppointments(); });
  $('ap-add').addEventListener('click', () => openApptEditor(null));
  $('ap-link').addEventListener('click', async () => {
    const cfg = bookCfg || await loadBookCfg(); if (!cfg || !cfg.link) return;
    let qr = ''; try { qr = await window.api.qrDataUrl(cfg.link, { width: 360, bgColor: '#ffffff' }); } catch (e) { /* без QR */ }
    const m = lxShow('lx-booklink', `<div class="lx-box"><div class="lx-head"><b>🔗 ${esc(t('bookLinkTitle'))}</b><button type="button" class="lx-close">✕</button></div>
      <p class="hint">${esc(t('bookLinkHint'))}</p><div class="online-link-row"><input type="text" readonly value="${esc(cfg.link)}"><button type="button" class="btn-secondary" id="bl-copy">${esc(t('onlineCopy'))}</button><button type="button" class="btn-secondary" id="bl-open">${esc(t('onlineOpen'))}</button></div>
      ${qr ? `<img src="${qr}" alt="QR" class="gr-qr">` : ''}<p class="hint" id="bl-st"></p></div>`);
    m.querySelector('#bl-copy').addEventListener('click', () => copy(cfg.link, $('bl-st')));
    m.querySelector('#bl-open').addEventListener('click', () => window.api.openExternal(cfg.link));
  });
  document.querySelector('.nav-btn[data-view="appointments"]').addEventListener('click', () => setTimeout(refreshAppointments, 0));
  window.api.onRemoteDataChanged && window.api.onRemoteDataChanged(() => { if (currentView === 'appointments') refreshAppointments(); else refreshApptBadge(); });

  // =============== настройки «Онлайн-запись» ===============
  let bkState = { services: [], staff: [], hours: {} };
  const DAYS = [1, 2, 3, 4, 5, 6, 0];
  function bkRender() {
    $('bk-services').innerHTML = bkState.services.map((s, i) => `<div class="bk-row" data-i="${i}">
      <input type="text" class="bk-n" maxlength="60" value="${esc(s.n)}" placeholder="${esc(t('bookSvcName'))}">
      <label class="bk-mini"><input type="number" class="bk-d" min="5" max="480" step="5" value="${s.d}"><span>${esc(t('bookMin'))}</span></label>
      <label class="bk-mini"><input type="number" class="bk-p" min="0" step="0.5" value="${s.p == null ? '' : s.p}" placeholder="—"><span>${esc(currencySymbol())}</span></label>
      <button type="button" class="ap-btn ap-del bk-x" title="✕">✕</button></div>`).join('') || `<p class="hint">${esc(t('bookNoServices'))}</p>`;
    $('bk-staff').innerHTML = bkState.staff.map((m, i) => `<div class="bk-row bk-staff-row" data-i="${i}">
      <input type="text" class="bk-n" maxlength="40" value="${esc(m.n)}" placeholder="${esc(t('bookStaffName'))}">
      <div class="bk-chips">${bkState.services.filter(s => s.n).map(s => `<label class="bk-chip"><input type="checkbox" data-s="${esc(s.id)}" ${!m.s.length || m.s.includes(s.id) ? 'checked' : ''}><span>${esc(s.n)}</span></label>`).join('')}</div>
      <button type="button" class="ap-btn ap-del bk-x" title="✕">✕</button></div>`).join('');
    $('bk-hours').innerHTML = DAYS.map(d => { const r = (bkState.hours[d] || [])[0]; const lbl = new Date(2024, 0, 7 + d).toLocaleDateString(localeCode(), { weekday: 'long' });
      return `<div class="bk-hr" data-d="${d}"><label class="bk-open"><input type="checkbox" ${r ? 'checked' : ''}><span>${esc(lbl)}</span></label><input type="time" class="bk-from" value="${r ? r[0] : '09:00'}" ${r ? '' : 'disabled'}><span>—</span><input type="time" class="bk-to" value="${r ? r[1] : '18:00'}" ${r ? '' : 'disabled'}></div>`; }).join('');
    $('bk-services').querySelectorAll('.bk-row').forEach(row => {
      const i = Number(row.dataset.i);
      row.querySelector('.bk-n').addEventListener('input', (e) => { bkState.services[i].n = e.target.value; });
      row.querySelector('.bk-n').addEventListener('change', () => bkRender());
      row.querySelector('.bk-d').addEventListener('input', (e) => { bkState.services[i].d = Number(e.target.value) || 60; });
      row.querySelector('.bk-p').addEventListener('input', (e) => { bkState.services[i].p = e.target.value === '' ? null : Number(e.target.value); });
      row.querySelector('.bk-x').addEventListener('click', () => { const id = bkState.services[i].id; bkState.services.splice(i, 1); bkState.staff.forEach(m => { m.s = m.s.filter(x => x !== id); }); bkRender(); });
    });
    $('bk-staff').querySelectorAll('.bk-row').forEach(row => {
      const i = Number(row.dataset.i);
      row.querySelector('.bk-n').addEventListener('input', (e) => { bkState.staff[i].n = e.target.value; });
      row.querySelectorAll('.bk-chip input').forEach(c => c.addEventListener('change', () => {
        const all = Array.from(row.querySelectorAll('.bk-chip input')); const on = all.filter(x => x.checked).map(x => x.dataset.s);
        bkState.staff[i].s = on.length === all.length ? [] : on;
      }));
      row.querySelector('.bk-x').addEventListener('click', () => { bkState.staff.splice(i, 1); bkRender(); });
    });
    $('bk-hours').querySelectorAll('.bk-hr').forEach(row => {
      const d = row.dataset.d; const cb = row.querySelector('input[type=checkbox]');
      const upd = () => { row.querySelector('.bk-from').disabled = !cb.checked; row.querySelector('.bk-to').disabled = !cb.checked; bkState.hours[d] = cb.checked ? [[row.querySelector('.bk-from').value, row.querySelector('.bk-to').value]] : []; };
      cb.addEventListener('change', upd); row.querySelectorAll('input[type=time]').forEach(x => x.addEventListener('change', upd));
    });
  }
  const newId = (pfx, list) => { let i = list.length + 1; while (list.some(x => x.id === pfx + i)) i++; return pfx + i; };
  $('bk-add-service').addEventListener('click', () => { bkState.services.push({ id: newId('s', bkState.services), n: '', d: 60, p: null }); bkRender(); const rows = $('bk-services').querySelectorAll('.bk-n'); if (rows.length) rows[rows.length - 1].focus(); });
  $('bk-add-staff').addEventListener('click', () => { bkState.staff.push({ id: newId('m', bkState.staff), n: '', s: [] }); bkRender(); const rows = $('bk-staff').querySelectorAll('.bk-n'); if (rows.length) rows[rows.length - 1].focus(); });
  async function bkLinkBox(cfg) {
    const box = $('bk-link-box'); box.style.display = cfg.on && cfg.link ? 'block' : 'none';
    if (cfg.on && cfg.link) { $('bk-url').value = cfg.link; const qr = $('bk-qr'); try { qr.src = await window.api.qrDataUrl(cfg.link, { width: 300, bgColor: '#ffffff' }); qr.style.display = 'block'; } catch (e) { qr.style.display = 'none'; } }
  }
  async function loadBookingSettings() {
    const cfg = await loadBookCfg(); if (!cfg) return;
    $('bk-need-license').style.display = cfg.hasLicense ? 'none' : 'block';
    $('bk-on').checked = cfg.on;
    bkState = { services: (cfg.services || []).map(x => ({ ...x })), staff: (cfg.staff || []).map(x => ({ ...x, s: x.s || [] })), hours: JSON.parse(JSON.stringify(cfg.hours || {})) };
    if (!bkState.services.length) bkState.services.push({ id: 's1', n: '', d: 60, p: null });
    $('bk-step').value = String(cfg.step); $('bk-lead').value = String(cfg.lead); $('bk-days').value = String(cfg.days);
    if (!$('bk-lead').value) $('bk-lead').value = '60'; if (!$('bk-days').value) $('bk-days').value = '30'; if (!$('bk-step').value) $('bk-step').value = '30';
    $('bk-phone').value = cfg.phone || ''; $('bk-address').value = cfg.address || ''; $('bk-note').value = cfg.note || '';
    $('bk-status').textContent = '';
    bkRender(); bkLinkBox(cfg);
  }
  $('btn-bk-save').addEventListener('click', async (e) => {
    const st = $('bk-status');
    const services = bkState.services.filter(s => String(s.n || '').trim());
    if ($('bk-on').checked && !services.length) { st.textContent = t('bookNeedService'); return; }
    e.currentTarget.disabled = true; st.textContent = '…';
    const r = await window.api.bookSave({ on: $('bk-on').checked, services, staff: bkState.staff.filter(m => String(m.n || '').trim()), hours: bkState.hours,
      step: $('bk-step').value, lead: $('bk-lead').value, days: $('bk-days').value, phone: $('bk-phone').value, address: $('bk-address').value, note: $('bk-note').value });
    e.currentTarget.disabled = false;
    if (r && r.on) { await window.api.saveSettings({ feature_booking: '1' }); applyBookingFeature(); }
    if (r && r.publishError) setErrStatus(st, r.publishError === 'need_license' ? 'license_inactive' : r.publishError, '⚠️ ');
    else st.textContent = t('settingsSaved');
    bookCfg = r; bkLinkBox(r || {});
  });
  $('btn-bk-copy').addEventListener('click', () => copy($('bk-url').value, $('bk-status')));
  $('btn-bk-open').addEventListener('click', () => window.api.openExternal($('bk-url').value));
  SETTINGS_LOADERS['settings-modal-booking'] = loadBookingSettings;

  // =============== отзывы после визита ===============
  function starsTxt(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }
  function fbItemHtml(f) {
    return `<div class="fb-item${f.rating != null && f.rating <= 3 ? ' fb-bad' : ''}${f.seen ? '' : ' fb-new'}"><div class="fb-top"><span class="fb-stars">${f.rating != null ? starsTxt(f.rating) : '…'}</span><b>${f.client_id ? `<a href="#" data-client="${f.client_id}">${esc(f.name || '—')}</a>` : esc(f.name || '—')}</b><small>${esc(fmtDT(f.rated_at || f.created_at))}</small></div>${f.comment ? `<div class="fb-comment">“${esc(f.comment)}”</div>` : ''}</div>`;
  }
  function fbStatsHtml(s) {
    return `<div class="fb-stats"><div><b>${s.avg != null ? s.avg.toFixed(1) : '—'}</b><span>${esc(t('fbAvg'))}</span></div><div><b>${s.rated}</b><span>${esc(t('fbRated'))}</span></div><div><b>${s.good}</b><span>${esc(t('fbGood'))}</span></div><div><b>${s.bad}</b><span>${esc(t('fbBad'))}</span></div></div>`;
  }
  function bindClientLinks(root) { root.querySelectorAll('[data-client]').forEach(x => x.addEventListener('click', (e) => { e.preventDefault(); closeSettingsModals(); openClientProfile(Number(x.dataset.client)); })); }
  async function loadReviewSettings() {
    const s = await window.api.getSettings();
    $('fb-on').checked = s.fb_enabled === '1';
    $('fb-delay').value = ['1', '2', '3', '6', '24'].includes(String(s.fb_delay_h)) ? String(s.fb_delay_h) : '2';
    $('fb-url').value = s.review_url || '';
    $('fb-need-license').style.display = s.license_key ? 'none' : 'block';
    $('fb-status').textContent = '';
    const r = await window.api.fbList(20);
    const rated = r.list.filter(x => x.rating != null);
    $('fb-panel').innerHTML = (r.stats.asked ? fbStatsHtml(r.stats) : '') + (rated.length ? `<div class="fb-list">${rated.slice(0, 10).map(fbItemHtml).join('')}</div>` : `<p class="hint">${esc(t('fbNone'))}</p>`) + (r.stats.unseen ? `<button type="button" class="btn-secondary" id="fb-seen">${esc(t('ntReadAll'))}</button>` : '');
    bindClientLinks($('fb-panel'));
    if ($('fb-seen')) $('fb-seen').addEventListener('click', async () => { await window.api.fbMarkSeen(); loadReviewSettings(); });
  }
  $('btn-fb-save').addEventListener('click', async () => {
    const url = $('fb-url').value.trim(); const st = $('fb-status');
    if (url && !/^https:\/\/\S{4,}$/.test(url)) { flashBadInput($('fb-url')); return; }
    await window.api.saveSettings({ fb_enabled: $('fb-on').checked ? '1' : '0', fb_delay_h: $('fb-delay').value, review_url: url });
    reviewUrlCache = url;
    const s = await window.api.getSettings();
    if (s.license_key) { const r = await window.api.profileRepublish(); if (r && r.error) { setErrStatus(st, r.error, '⚠️ '); return; } }
    st.textContent = t('settingsSaved');
  });
  SETTINGS_LOADERS['settings-modal-reviews'] = loadReviewSettings;
  $('btn-promo-open-reviews').addEventListener('click', () => { closeSettingsModals(); openSettingsModal('settings-modal-reviews'); });

  // блок «Отзывы гостей» в Маркетинге
  async function renderMkReviews() {
    const el = $('mk-reviews'); if (!el) return;
    const s = await window.api.getSettings();
    const r = await window.api.fbList(30);
    const rated = r.list.filter(x => x.rating != null);
    if (s.fb_enabled !== '1' && !rated.length) { el.innerHTML = `<div class="mk-todo-empty">${esc(t('fbOffMk'))} <button type="button" class="btn-secondary" id="mk-fb-setup">${esc(t('apSetup'))}</button></div>`; $('mk-fb-setup').addEventListener('click', () => openSettingsModal('settings-modal-reviews')); return; }
    el.innerHTML = fbStatsHtml(r.stats) + (rated.length ? `<div class="fb-list">${rated.slice(0, 6).map(fbItemHtml).join('')}</div>` : `<p class="hint">${esc(t('fbNone'))}</p>`);
    bindClientLinks(el);
  }
  const prevRM = refreshMarketing;
  refreshMarketing = async function () { const out = await prevRM.apply(this, arguments); renderMkReviews(); return out; };   // eslint-disable-line no-global-assign

  // =============== «Приведи друга» ===============
  window.growPromoLoad = async (st) => {
    $('promo-referral-friend').value = ['0', '1', '2', '3', '4', '5'].includes(String(st.referral_friend_stamps)) ? String(st.referral_friend_stamps) : '1';
    $('promo-referral-when').value = st.referral_when === 'signup' ? 'signup' : 'visit';
    const info = await window.api.refInfo(0);
    $('promo-referral-link').textContent = info.baseAvailable ? t('refLinkReady') : t('refLinkNeedOnline');
  };
  window.growPromoSave = () => ({ referral_friend_stamps: $('promo-referral-friend').value, referral_when: $('promo-referral-when').value });
  window.growPromoAfterSave = () => { window.api.profileRepublish().catch(() => {}); };

  window.growProfileHook = async (client) => {
    const box = $('pf-grow'); if (!box) return;
    const [ri, s] = await Promise.all([window.api.refInfo(client.id), window.api.getSettings()]);
    const btns = [];
    if (ri.enabled) btns.push(`<button type="button" class="btn-secondary" id="pf-invite">🤝 ${esc(t('refInviteBtn'))}</button>`);
    if (s.license_key && (client.email || client.telegram_chat_id)) btns.push(`<button type="button" class="btn-secondary" id="pf-askfb">⭐ ${esc(t('fbAskBtn'))}</button>`);
    box.innerHTML = btns.join('');
    box.style.display = btns.length ? '' : 'none';
    if ($('pf-invite')) $('pf-invite').addEventListener('click', () => openInvite(client));
    if ($('pf-askfb')) $('pf-askfb').addEventListener('click', async (e) => {
      const b = e.currentTarget; b.disabled = true;
      const r = await window.api.fbAskNow(client.id);
      b.disabled = false;
      if (r && r.ok && r.sent) toast(t('fbAsked')); else uiAlert(errText((r && r.error) || 'no_channel'));
    });
  };
  async function openInvite(client) {
    const ri = await window.api.refInfo(client.id);
    let qr = ''; if (ri.url) { try { qr = await window.api.qrDataUrl(ri.url, { width: 320, bgColor: '#ffffff' }); } catch (e) { /* без QR */ } }
    const friends = ri.list || [];
    const m = lxShow('lx-invite', `<div class="lx-box"><div class="lx-head"><b>🤝 ${esc(t('refInviteTitle')(client.name))}</b><button type="button" class="lx-close">✕</button></div>
      <p class="hint">${esc(t('refInviteText')(ri.friendText || '🎁', ri.referrerText || '🎁', ri.cfg.when === 'visit'))}</p>
      ${ri.url ? `<div class="online-link-row"><input type="text" readonly value="${esc(ri.url)}"><button type="button" class="btn-secondary" id="iv-copy">${esc(t('onlineCopy'))}</button></div>${qr ? `<img src="${qr}" alt="QR" class="gr-qr">` : ''}
        <div class="lx-actions"><button type="button" class="team-btn-primary" id="iv-send">${esc(t('refSendGuest'))}</button></div>`
        : `<p class="hint team-warn">${esc(t('refLinkNeedOnline'))}</p>`}
      <p class="hint" id="iv-st"></p>
      ${friends.length ? `<div class="lx-sub">${esc(t('refFriends')(friends.length))}</div>${friends.map(f => `<div class="lx-row"><div><b>${esc(f.name)}</b><small>${esc(fmtDT(f.created_at))} · ${f.ref_reward_done ? '✅ ' + esc(t('refRewarded')) : '⏳ ' + esc(t('refWaiting'))}</small></div></div>`).join('')}` : ''}</div>`);
    if (m.querySelector('#iv-copy')) m.querySelector('#iv-copy').addEventListener('click', () => copy(ri.url, $('iv-st')));
    if (m.querySelector('#iv-send')) m.querySelector('#iv-send').addEventListener('click', async (e) => {
      const b = e.currentTarget; b.disabled = true; $('iv-st').textContent = '…';
      const r = await window.api.refSend(client.id); b.disabled = false;
      $('iv-st').textContent = r && r.ok ? t('refSent') : errText((r && r.error) || 'no_channel');
    });
  }

  // =============== уведомления: куда ведёт клик ===============
  window.growNoticeGo = (n) => {
    if (n.kind === 'book') { const nav = document.querySelector('.nav-btn[data-view="appointments"]'); if (nav && nav.style.display !== 'none') nav.click(); return; }
    if (n.kind === 'review') { openSettingsModal('settings-modal-reviews'); return; }
    if (n.kind === 'ref') { const nav = document.querySelector('.nav-btn[data-view="marketing"]'); if (nav) nav.click(); }
  };

  // =============== касса: Dotykačka и CSV ===============
  async function renderDk() {
    const el = $('dk-status'); if (!el) return;
    const r = await window.api.dkStatus();
    const con = !!(r && r.connected);
    $('btn-dk-connect').style.display = con ? 'none' : '';
    $('btn-dk-disconnect').style.display = con ? '' : 'none';
    if (r && r.error === 'need_license') { el.textContent = t('dkNeedLicense'); $('btn-dk-connect').disabled = true; return; }
    $('btn-dk-connect').disabled = false;
    if (r && r.ready === false) { el.textContent = t('dkNotReady'); $('btn-dk-connect').disabled = true; return; }
    el.textContent = con ? t('dkConnected')(r.cloudId || '') + (r.lastError ? ' · ⚠️ ' + r.lastError : '') : (r && r.error ? errText(r.error) : t('dkNotConnected'));
  }
  $('btn-dk-connect').addEventListener('click', async () => {
    const r = await window.api.dkConnect();
    if (!r || !r.ok) { $('dk-status').textContent = r && r.error === 'dk_not_configured' ? t('dkNotReady') : errText((r && r.error) || 'failed'); return; }
    $('dk-status').textContent = t('dkOpened');
    let tries = 0; const iv = setInterval(async () => { tries++; const s = await window.api.dkStatus(); if ((s && s.connected) || tries > 60) { clearInterval(iv); renderDk(); if (typeof loadPosSettings === 'function') loadPosSettings(); } }, 5000);
  });
  $('btn-dk-disconnect').addEventListener('click', async () => { if (!(await uiConfirm(t('dkDisconnectQ'), { danger: true }))) return; await window.api.dkDisconnect(); renderDk(); });
  $('btn-csv-receipts').addEventListener('click', async () => {
    const st = $('csv-rc-status'); st.textContent = '…';
    const r = await window.api.posImportCsv();
    if (!r || r.canceled) { st.textContent = ''; return; }
    if (r.error) { st.textContent = r.error === 'no_total' ? t('csvRcNoTotal') : errText(r.error); return; }
    st.textContent = t('csvRcDone')(r.added, r.dup, r.bad);
  });
  const prevPos = SETTINGS_LOADERS['settings-modal-pos'];
  SETTINGS_LOADERS['settings-modal-pos'] = () => { if (prevPos) prevPos(); renderDk(); $('csv-rc-status').textContent = ''; };

  // старт
  applyBookingFeature();
})();
