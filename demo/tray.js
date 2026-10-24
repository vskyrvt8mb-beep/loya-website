// Меню трея и подсказка «Loya работает в фоне» — в оформлении программы (не системное меню Windows).
(function () {
  const q = new URLSearchParams(location.search);
  let d = {};
  try { d = JSON.parse(q.get('d') || '{}'); } catch (e) { d = {}; }
  const acc = /^#[0-9a-f]{6}$/i.test(d.accent || '') ? d.accent : '#d4af37';
  const n = parseInt(acc.slice(1), 16), rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const root = document.documentElement.style;
  root.setProperty('--acc', acc); root.setProperty('--acc-rgb', rgb.join(','));
  root.setProperty('--acc2', `rgb(${rgb.map(v => Math.round(v * 0.82)).join(',')})`);
  const L = d.labels || {};
  const box = document.getElementById('box');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const head = el('div', 'head');
  const mark = el('div', 'mark');
  if (d.logo && /^data:image\/png;base64,/.test(d.logo)) { const im = new Image(); im.src = d.logo; mark.appendChild(im); } else mark.textContent = String(d.brand || 'L').trim().charAt(0).toUpperCase();
  const ht = el('div'); ht.appendChild(el('b', '', d.brand || 'Loya')); ht.appendChild(el('span', '', L.sub || ''));
  head.appendChild(mark); head.appendChild(ht); box.appendChild(head);
  if (q.get('mode') === 'hint') {
    box.classList.add('hint');
    box.appendChild(el('p', '', L.hint || ''));
    const ok = el('button', 'ok', L.ok || 'OK'); ok.addEventListener('click', () => window.tray.act('hint-ok')); box.appendChild(ok);
  } else {
    const item = (ic, text, act, cls) => { const b = el('button', cls || ''); b.appendChild(el('i', '', ic)); b.appendChild(el('span', '', text)); b.addEventListener('click', () => window.tray.act(act)); box.appendChild(b); };
    item('🪟', L.open, 'open');
    item('📷', L.scan, 'scan');
    item('👥', L.clients, 'clients');
    item('💳', L.newcard, 'newcard');
    box.appendChild(el('div', 'sep'));
    item('⏻', L.quit, 'quit', 'quit');
  }
  requestAnimationFrame(() => { const r = box.getBoundingClientRect(); window.tray.size(Math.ceil(r.width + 16), Math.ceil(r.height + 16)); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.tray.act('close'); });
})();
