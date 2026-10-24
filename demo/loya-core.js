/* Loya 2.30.0 — Android core (main.js + db.js с ПК). Собрано build/build-www.js 2026-10-24T06:14:53.991Z */
window.__LOYA_VERSION = "2.30.0"; window.__LOYA_PLAY = false; window.__LOYA_DEMO = true; window.__LOYA_PUBKEY = "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAAnRfWvIJhF2IIoHq/56DcSbGLwYsGPfbdiA0AuRG9TY=\n-----END PUBLIC KEY-----\n"; window.__LOYA_MAINDIR = "/app/pc-app";
(function(){
const __defs = {};
__defs[0] = [function(module, exports, require, __filename, __dirname){
// Loya для Android: «главный процесс» программы работает прямо в приложении.
// Порядок запуска: 1) загружаем файлы программы из хранилища (fs) 2) запускаем main.js — тот же,
// что на ПК 3) окно (renderer.js) общается с ним через window.api, как в Electron.
'use strict';
const VERSION = globalThis.__LOYA_VERSION || '0.0.0';
const NATIVE = () => (globalThis.Capacitor && globalThis.Capacitor.Plugins && globalThis.Capacitor.Plugins.LoyaNative) || null;
const T = {
  ru: { saved: (n) => `Сохранено в «Загрузки/Loya»: ${n}`, savedBrowser: (n) => `Файл ${n} скачан`, saveErr: 'Не удалось сохранить файл', backups: 'Резервные копии хранятся внутри приложения. Чтобы получить файл копии, нажмите «Сохранить базу в файл…».', exit: 'Нажмите «Назад» ещё раз, чтобы выйти' },
  uk: { saved: (n) => `Збережено в «Завантаження/Loya»: ${n}`, savedBrowser: (n) => `Файл ${n} завантажено`, saveErr: 'Не вдалося зберегти файл', backups: 'Резервні копії зберігаються всередині застосунку. Щоб отримати файл копії, натисніть «Зберегти базу у файл…».', exit: 'Натисніть «Назад» ще раз, щоб вийти' },
  sk: { saved: (n) => `Uložené do „Stiahnuté/Loya“: ${n}`, savedBrowser: (n) => `Súbor ${n} stiahnutý`, saveErr: 'Súbor sa nepodarilo uložiť', backups: 'Zálohy sú uložené v aplikácii. Ak chcete súbor zálohy, stlačte „Uložiť databázu do súboru…“.', exit: 'Stlačte „Späť“ ešte raz na ukončenie' },
  en: { saved: (n) => `Saved to “Downloads/Loya”: ${n}`, savedBrowser: (n) => `File ${n} downloaded`, saveErr: 'Could not save the file', backups: 'Backups are kept inside the app. To get a backup file, tap “Save database to a file…”.', exit: 'Press Back again to exit' }
};
const L = () => { const l = (document.documentElement.lang || (window.getLang && window.getLang()) || 'ru').slice(0, 2); return T[l] || T.ru; };
function toast(text) {
  try { if (typeof window.showUndoToastLike === 'function') { window.showUndoToastLike(text); return; } } catch (e) { /* ниже */ }
  const el = document.createElement('div'); el.className = 'android-toast'; el.textContent = text; document.body.appendChild(el); setTimeout(() => el.remove(), 3000);
}

// ---------- globals, которых ждёт код с ПК ----------
const { Buffer } = require('buffer');
globalThis.Buffer = Buffer;
globalThis.process = globalThis.process || {
  platform: 'linux', env: {}, argv: [], versions: {}, version: '', mas: !!globalThis.__LOYA_PLAY, windowsStore: false, resourcesPath: '/app',
  on() {}, once() {}, cwd: () => '/app', nextTick: (fn, ...a) => Promise.resolve().then(() => fn(...a)), getSystemVersion: () => 'Android', exit() {}
};
globalThis.setImmediate = globalThis.setImmediate || ((fn, ...a) => setTimeout(fn, 0, ...a));
globalThis.clearImmediate = globalThis.clearImmediate || clearTimeout;

// ---------- мост окно ↔ main.js ----------
const rendererListeners = new Map();
let markReady; const ready = new Promise(r => { markReady = r; });
let domReady = document.readyState !== 'loading';
if (!domReady) document.addEventListener('DOMContentLoaded', () => { domReady = true; });

function clone(v) {
  if (v === undefined || v === null || typeof v !== 'object') return v;
  try { return structuredClone(v); } catch (e) { try { return JSON.parse(JSON.stringify(v)); } catch (e2) { return v; } }
}
const host = {
  version: VERSION,
  toRenderer(ch, args) { (rendererListeners.get(ch) || []).forEach(fn => { try { fn({ sender: null }, ...clone(args)); } catch (e) { console.error(e); } }); },
  mainWindowReady(fire) {
    const go = () => { markReady(); setTimeout(fire, 50); };
    if (domReady) go(); else document.addEventListener('DOMContentLoaded', go);
  },
  async print(html) {
    const N = NATIVE();
    if (N && N.printHtml && html) { try { await N.printHtml({ html, name: 'Loya' }); return true; } catch (e) { console.error(e); } }
    return false;
  },
  async saveDialog(o = {}) {
    const name = String(o.defaultPath || 'loya-file').split(/[\\/]/).pop();
    return { canceled: false, filePath: require('fs').__EXPORT_DIR + '/' + name };
  },
  openDialog(o = {}) {
    const props = o.properties || [];
    if (props.includes('openDirectory')) return Promise.resolve({ canceled: false, filePaths: [require('fs').__EXPORT_DIR] });
    const exts = (o.filters || []).flatMap(f => f.extensions || []).filter(e => e && e !== '*');
    return new Promise((resolve) => {
      const inp = document.createElement('input');
      inp.type = 'file';
      if (exts.length) inp.accept = exts.map(e => (/^(png|jpe?g|webp|gif)$/i.test(e) ? 'image/' + e.replace('jpg', 'jpeg') + ',' : '') + '.' + e).join(',');
      if (props.includes('multiSelections')) inp.multiple = true;
      inp.style.display = 'none';
      let done = false;
      const finish = async (files) => {
        if (done) return; done = true; inp.remove();
        if (!files || !files.length) { resolve({ canceled: true, filePaths: [] }); return; }
        const paths = [];
        for (const f of files) {
          const buf = Buffer.from(new Uint8Array(await f.arrayBuffer()));
          const p = '/uploads/' + Date.now() + '/' + f.name.replace(/[\\/]/g, '_');
          require('fs').writeFileSync(p, buf);
          paths.push(p);
        }
        resolve({ canceled: false, filePaths: paths });
      };
      inp.addEventListener('change', () => finish(inp.files));
      inp.addEventListener('cancel', () => finish(null));
      // если система не сообщила об отмене — понимаем по возвращению в приложение без файла
      const onFocus = () => setTimeout(() => { if (!inp.files || !inp.files.length) finish(null); }, 1200);
      window.addEventListener('focus', onFocus, { once: true });
      document.body.appendChild(inp);
      inp.click();
    });
  },
  async messageBox(o = {}) {
    const text = [o.message, o.detail].filter(Boolean).join('\n\n');
    if (typeof window.uiDialog === 'function' && o.buttons && o.buttons.length > 1) {
      const ok = await window.uiDialog({ text, okText: o.buttons[0], cancelText: o.buttons[1] });
      return { response: ok ? 0 : 1 };
    }
    if (typeof window.uiAlert === 'function') await window.uiAlert(text); else alert(text);
    return { response: 0 };
  },
  async openExternal(url) {
    const N = NATIVE();
    if (N && N.openUrl) { try { await N.openUrl({ url: String(url) }); return; } catch (e) { /* ниже */ } }
    window.open(String(url), '_blank');
  },
  openPath() { toast(L().backups); },
  // 2.18: системное уведомление — только когда приложение в фоне (в открытом окне есть колокольчик).
  async notify(id, title, text) {
    if (document.visibilityState === 'visible') return;
    const N = NATIVE();
    if (N && N.showNotice) { try { await N.showNotice({ id: String(id), title: String(title || 'Loya'), text: String(text || '') }); } catch (e) { /* нет разрешения */ } }
  }
};
// Нажали на уведомление — открываем нужный экран.
async function takeTappedNotice() {
  const N = NATIVE(); if (!N || !N.takeTappedNotice) return;
  try { const r = await N.takeTappedNotice(); if (r && r.id && typeof window.__loyaNoticeOpen === 'function') window.__loyaNoticeOpen(r.id); } catch (e) { /* старая сборка */ }
}
// Быстрое действие со значка на рабочем столе (долгое нажатие): Сканировать / Новый клиент / Новая карта.
async function takeShortcut() {
  const N = NATIVE(); if (!N || !N.takeShortcut) return;
  try { const r = await N.takeShortcut(); if (r && r.action && typeof window.__loyaShortcut === 'function') window.__loyaShortcut(r.action); } catch (e) { /* старая сборка */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { setTimeout(takeTappedNotice, 300); setTimeout(takeShortcut, 300); } });
window.addEventListener('load', () => { setTimeout(takeTappedNotice, 4000); setTimeout(takeShortcut, 2500); });
// Разрешение на уведомления — спрашиваем, когда программа уже настроена и человек в ней (не во время знакомства).
setTimeout(async () => {
  try {
    const N = NATIVE(); if (!N || !N.askNotices || document.visibilityState !== 'visible') return;
    const h = require('electron').ipcMain.__handlers; const st = h.get('settings:get') ? await h.get('settings:get')({}) : null;
    if (st && st.onboarding_completed === '1' && st.notify_system !== '0') await N.askNotices();
  } catch (e) { /* старая сборка */ }
}, 20000);
globalThis.__LOYA_HOST = host;

// Сохранение файла на устройство: «Загрузки/Loya» через LoyaNative, иначе — обычная загрузка браузера.
const fsShim = require('fs');
fsShim.__onExport(async (name, buf) => {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const mime = { csv: 'text/csv', pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', db: 'application/octet-stream', txt: 'text/plain', html: 'text/html', json: 'application/json' }[ext] || 'application/octet-stream';
  const N = NATIVE();
  if (N && N.saveFile) {
    try { await N.saveFile({ name, mime, base64: buf.toString('base64') }); toast(L().saved(name)); return; }
    catch (e) { console.error(e); toast(L().saveErr); return; }
  }
  try {
    const url = URL.createObjectURL(new Blob([buf], { type: mime }));
    const a = document.createElement('a'); a.href = url; a.download = name; a.dataset.loyaSave = '1'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast(L().savedBrowser(name));
  } catch (e) { toast(L().saveErr); }
});

// Сохранение картинок/файлов, которые окно отдаёт через <a download> (карточка сотрудника и т.п.):
// в WebView Android такие «загрузки» не работают — сохраняем сами в «Загрузки/Loya».
async function exportHref(href, name) {
  const r = await fetch(href); const buf = Buffer.from(new Uint8Array(await r.arrayBuffer()));
  fsShim.writeFileSync(fsShim.__EXPORT_DIR + '/' + (name || 'loya-file'), buf);
}
const origAnchorClick = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function () {
  if (!this.dataset.loyaSave && this.hasAttribute('download') && /^(data:|blob:)/.test(this.href)) { exportHref(this.href, this.getAttribute('download')); return; }
  return origAnchorClick.call(this);
};
document.addEventListener('click', (e) => {
  const a = e.target && e.target.closest && e.target.closest('a[download]');
  if (a && !a.dataset.loyaSave && /^(data:|blob:)/.test(a.href)) { e.preventDefault(); exportHref(a.href, a.getAttribute('download')); }
}, true);
// window.open('') + document.write(...) + print() — так окно печатает карточки; на Android печатаем нативно.
const origOpen = window.open.bind(window);
window.open = function (url, target, features) {
  if (!url || url === 'about:blank') {
    let html = '';
    const fake = { document: { write: (s) => { html += s; }, writeln: (s) => { html += s + '\n'; }, open() {}, close: () => { host.print(html.replace(/\son(load|afterprint)="[^"]*"/gi, '')); } }, print() {}, close() {}, focus() {}, closed: false };
    return fake;
  }
  host.openExternal(url); return null;
};

// window.api: тот же preload.js, что на ПК, но ipcRenderer — прямой вызов обработчиков main.js.
const electronShim = require('electron');
const ipcRenderer = {
  async invoke(ch, ...args) {
    await ready;
    const h = electronShim.ipcMain.__handlers.get(ch);
    if (!h) throw new Error(`No handler registered for '${ch}'`);
    const res = await h({ sender: { send: (c, ...a) => host.toRenderer(c, a) } }, ...clone(args));
    return clone(res);
  },
  send(ch, ...args) {
    ready.then(() => (electronShim.ipcMain.__listeners.get(ch) || []).forEach(fn => { try { fn({ sender: null, reply: (c, ...a) => host.toRenderer(c, a) }, ...clone(args)); } catch (e) { console.error(e); } }));
  },
  on(ch, fn) { (rendererListeners.get(ch) || rendererListeners.set(ch, []).get(ch)).push(fn); return ipcRenderer; },
  once(ch, fn) { const w = (...a) => { ipcRenderer.removeListener(ch, w); fn(...a); }; return ipcRenderer.on(ch, w); },
  removeListener(ch, fn) { rendererListeners.set(ch, (rendererListeners.get(ch) || []).filter(f => f !== fn)); return ipcRenderer; },
  removeAllListeners(ch) { rendererListeners.delete(ch); return ipcRenderer; }
};
const contextBridge = { exposeInMainWorld(key, api) { window[key] = api; } };
window.require = (name) => { if (name === 'electron') return { contextBridge, ipcRenderer }; throw new Error('require is not available: ' + name); };

// ---------- Кнопка «Назад» Android ----------
// Закрываем то, что открыто сверху (диалог, окно, меню), потом — возврат на Главную, потом — выход.
let lastBackAt = 0;
window.__handleAndroidBack = function () {
  try {
    const dlg = document.querySelector('.ui-dialog-overlay');
    if (dlg) { const c = dlg.querySelector('.ui-dialog-cancel') || dlg.querySelector('.ui-dialog-ok'); if (c) c.click(); return false; }
    const vis = (el) => el && getComputedStyle(el).display !== 'none';
    for (const sel of ['#tour-overlay', '#whats-new-overlay']) { const el = document.querySelector(sel); if (vis(el)) { const b = el.querySelector('button'); if (b) b.click(); return false; } }
    const lx = [...document.querySelectorAll('.lx-modal')].filter(vis).pop();
    if (lx) { if (typeof window.lxClose === 'function') window.lxClose(lx.id); else lx.style.display = 'none'; return false; }
    const mo = [...document.querySelectorAll('.modal-overlay')].filter(vis).pop();
    if (mo) { const c = mo.querySelector('.modal-close'); if (c) c.click(); else mo.style.display = 'none'; return false; }
    if (document.body.classList.contains('nav-open')) { document.body.classList.remove('nav-open'); return false; }
    const login = document.getElementById('staff-login-overlay');
    if (vis(login)) return true;
    const active = document.querySelector('.nav-btn.active');
    if (active && active.dataset.view !== 'dashboard') { const d = document.querySelector('.nav-btn[data-view="dashboard"]'); if (d) d.click(); return false; }
    if (Date.now() - lastBackAt < 2000) return true;
    lastBackAt = Date.now(); toast(L().exit); return false;
  } catch (e) { return true; }
};

// ---------- запуск ----------
async function boot() {
  document.documentElement.classList.add('platform-android');
  const mark = () => document.body && document.body.classList.add('platform-android');
  if (document.body) mark(); else document.addEventListener('DOMContentLoaded', mark);
  await fsShim.__load();
  // Отпечаток устройства (на ПК — номер компьютера): ANDROID_ID берётся у системы при каждом запуске и в
  // хранилище не записывается — копия данных с другого планшета не переносит его подписку.
  let devId = '';
  try { const N = NATIVE(); if (N && N.deviceInfo) { const r = await N.deviceInfo(); devId = (r && r.id) || ''; globalThis.__LOYA_DEVICE_NAME = r && r.name; } } catch (e) { /* ниже */ }
  if (devId) fsShim.__putVolatile('/etc/machine-id', devId);
  else if (!fsShim.existsSync('/etc/machine-id')) fsShim.writeFileSync('/etc/machine-id', require('crypto').randomBytes(16).toString('hex'));
  // Открытый ключ подписи подписки — из самой сборки (не из хранилища).
  if (globalThis.__LOYA_PUBKEY) fsShim.__putVolatile((globalThis.__LOYA_MAINDIR || '/app/pc-app') + '/license-pubkey.pem', globalThis.__LOYA_PUBKEY);
  else { try { fsShim.unlinkSync((globalThis.__LOYA_MAINDIR || '/app/pc-app') + '/license-pubkey.pem'); } catch (e) { /* не было */ } }
  // Значки Apple / Google Wallet для писем (main.js читает их как файлы src/wallet-badges/*.png) — берём из самой сборки.
  try {
    const dir = (globalThis.__LOYA_MAINDIR || '/app/pc-app') + '/src/wallet-badges/';
    await Promise.all(['apple', 'google'].flatMap(k => ['ru', 'uk', 'sk', 'en'].map(l => `${k}-${l}.png`)).map(async (f) => {
      const r = await fetch('wallet-badges/' + f); if (r.ok) fsShim.__putVolatile(dir + f, Buffer.from(await r.arrayBuffer()));
    }));
  } catch (e) { /* без значков письма покажут обычные кнопки */ }
  require('./main.js');
  // Печать (карты, наклейки, афиша): системная печать Android — там же «Сохранить как PDF».
  electronShim.ipcMain.handle('print:html', async (e, html) => (await host.print(String(html || ''))) ? { ok: true } : { canceled: true });
  // Саморегистрация «по Wi-Fi» на Android недоступна (нет сервера для телефонов) — только через интернет.
  ready.then(async () => {
    try {
      const h = electronShim.ipcMain.__handlers;
      const st = await h.get('settings:get')({});
      if (st && st.selfreg_mode !== 'online' && h.get('selfreg:setMode')) await h.get('selfreg:setMode')({}, 'online');
    } catch (e) { /* без подписки онлайн-режим включится, когда появится ключ */ }
  });
}
window.__LOYA_BOOT = boot().catch((e) => {
  console.error('[Loya] boot failed', e);
  document.addEventListener('DOMContentLoaded', () => { document.body.insertAdjacentHTML('afterbegin', `<div style="padding:16px;background:#7f1d1d;color:#fff;font:14px sans-serif">Loya: ошибка запуска — ${String(e && e.message || e).replace(/</g, '&lt;')}</div>`); });
});
// Перед уходом приложения в фон — записываем изменения
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') fsShim.__flush(); });
module.exports = host;

}, {"buffer":1,"fs":4,"electron":5,"crypto":6,"./main.js":8}, "/app/shims/android-host.js"];
__defs[1] = [function(module, exports, require, __filename, __dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var customInspectSymbol =
  (typeof Symbol === 'function' && typeof Symbol['for'] === 'function') // eslint-disable-line dot-notation
    ? Symbol['for']('nodejs.util.inspect.custom') // eslint-disable-line dot-notation
    : null

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    var proto = { foo: function () { return 42 } }
    Object.setPrototypeOf(proto, Uint8Array.prototype)
    Object.setPrototypeOf(arr, proto)
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  Object.setPrototypeOf(buf, Buffer.prototype)
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayView(value)
  }

  if (value == null) {
    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof SharedArrayBuffer !== 'undefined' &&
      (isInstance(value, SharedArrayBuffer) ||
      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
Object.setPrototypeOf(Buffer, Uint8Array)

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpreted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayView (arrayView) {
  if (isInstance(arrayView, Uint8Array)) {
    var copy = new Uint8Array(arrayView)
    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
  }
  return fromArrayLike(arrayView)
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(buf, Buffer.prototype)

  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      if (pos + buf.length > buffer.length) {
        Buffer.from(buf).copy(buffer, pos)
      } else {
        Uint8Array.prototype.set.call(
          buffer,
          buf,
          pos
        )
      }
    } else if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    } else {
      buf.copy(buffer, pos)
    }
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}
if (customInspectSymbol) {
  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
      case 'latin1':
      case 'binary':
        return asciiWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF)
      ? 4
      : (firstByte > 0xDF)
          ? 3
          : (firstByte > 0xBF)
              ? 2
              : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += hexSliceLookupTable[buf[i]]
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
  for (var i = 0; i < bytes.length - 1; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(newBuf, Buffer.prototype)

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUintLE =
Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUintBE =
Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUint8 =
Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUint16LE =
Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUint16BE =
Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUint32LE =
Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUint32BE =
Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUintLE =
Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUintBE =
Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUint8 =
Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUint16LE =
Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUint16BE =
Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUint32LE =
Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUint32BE =
Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  } else if (typeof val === 'boolean') {
    val = Number(val)
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

// Create lookup table for `toString('hex')`
// See: https://github.com/feross/buffer/issues/219
var hexSliceLookupTable = (function () {
  var alphabet = '0123456789abcdef'
  var table = new Array(256)
  for (var i = 0; i < 16; ++i) {
    var i16 = i * 16
    for (var j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j]
    }
  }
  return table
})()

}, {"base64-js":2,"ieee754":3}, "/app/buffer/index.js"];
__defs[2] = [function(module, exports, require, __filename, __dirname){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

}, {}, "/app/base64-js/index.js"];
__defs[3] = [function(module, exports, require, __filename, __dirname){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

}, {}, "/app/ieee754/index.js"];
__defs[4] = [function(module, exports, require, __filename, __dirname){
// fs для Android-версии: файлы программы (база loyalty.db, резервные копии, картинки Wallet…)
// живут в памяти и надёжно сохраняются в хранилище приложения (IndexedDB). Те же синхронные
// функции, что у Node `fs`, поэтому код программы с ПК работает без изменений.
// Файлы, которые пользователь «сохраняет» (CSV, PDF, картинки, копии базы), попадают в
// папку «Загрузки/Loya» телефона/планшета через нативный модуль LoyaNative.
'use strict';
const { Buffer } = require('buffer');

const files = new Map();   // путь → { data: Buffer, mtime: number }
const dirs = new Set(['/']);
const DB_NAME = globalThis.__LOYA_DEMO === true ? 'loya-demo-fs' : 'loya-fs', STORE = 'files';   // демо на сайте — своё хранилище
let idb = null;
const dirty = new Set(), removed = new Set();
let flushTimer = null;
const EXPORT_DIR = '/Загрузки';   // «внешняя» папка: запись туда = сохранить файл на устройство

function norm(p) {
  p = String(p || '').replace(/\\/g, '/');
  if (!p.startsWith('/')) p = '/' + p;
  const parts = [];
  for (const s of p.split('/')) { if (!s || s === '.') continue; if (s === '..') parts.pop(); else parts.push(s); }
  return '/' + parts.join('/');
}
function parent(p) { const i = p.lastIndexOf('/'); return i <= 0 ? '/' : p.slice(0, i); }
function enoent(p, op) { const e = new Error(`ENOENT: no such file or directory, ${op} '${p}'`); e.code = 'ENOENT'; return e; }
function ensureDir(p) { const parts = norm(p).split('/').filter(Boolean); let cur = ''; for (const s of parts) { cur += '/' + s; dirs.add(cur); } }
function toBuf(data, enc) {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (typeof data === 'string') return Buffer.from(data, typeof enc === 'string' ? enc : (enc && enc.encoding) || 'utf8');
  return Buffer.from(String(data));
}
function isExport(p) { return p === EXPORT_DIR || p.startsWith(EXPORT_DIR + '/'); }

function scheduleFlush() { clearTimeout(flushTimer); flushTimer = setTimeout(flush, 250); }
function flush() {
  clearTimeout(flushTimer);
  if (!idb || (!dirty.size && !removed.size)) return Promise.resolve();
  const toPut = [...dirty], toDel = [...removed];
  dirty.clear(); removed.clear();
  return new Promise((resolve) => {
    let tx;
    try { tx = idb.transaction(STORE, 'readwrite'); } catch (e) { toPut.forEach(p => dirty.add(p)); toDel.forEach(p => removed.add(p)); resolve(); return; }
    const st = tx.objectStore(STORE);
    for (const p of toDel) st.delete(p);
    for (const p of toPut) { const f = files.get(p); if (f) st.put({ data: f.data.buffer.slice(f.data.byteOffset, f.data.byteOffset + f.data.byteLength), mtime: f.mtime }, p); }
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => { toPut.forEach(p => dirty.add(p)); toDel.forEach(p => removed.add(p)); resolve(); };
  });
}
// Приложение свернули или закрывают — записываем немедленно.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', () => { flush(); });
}

// Загрузка всех файлов из хранилища — до запуска программы.
function load() {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') { resolve(); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onerror = () => resolve();
    req.onsuccess = () => {
      idb = req.result;
      const tx = idb.transaction(STORE, 'readonly'); const st = tx.objectStore(STORE);
      const cur = st.openCursor();
      cur.onsuccess = () => {
        const c = cur.result;
        if (!c) { resolve(); return; }
        const p = String(c.key), v = c.value || {};
        files.set(p, { data: Buffer.from(new Uint8Array(v.data || new ArrayBuffer(0))), mtime: v.mtime || Date.now() });
        ensureDir(parent(p));
        c.continue();
      };
      cur.onerror = () => resolve();
    };
  });
}

// Файл только в памяти (не сохраняется в хранилище и стирает сохранённую копию): отпечаток устройства
// и открытый ключ подписи берутся заново при каждом запуске, их нельзя подменить правкой хранилища.
function putVolatile(p, data) {
  p = norm(p); ensureDir(parent(p));
  files.set(p, { data: toBuf(data), mtime: Date.now() });
  dirty.delete(p); removed.add(p); scheduleFlush();
}

// Сохранение на устройство (Загрузки/Loya) — через нативный модуль; если его нет, браузерная загрузка.
let exportHook = null;
function onExport(fn) { exportHook = fn; }

function writeFileSync(p, data, enc) {
  p = norm(p);
  const buf = toBuf(data, enc);
  if (isExport(p)) { if (exportHook) exportHook(p.slice(EXPORT_DIR.length + 1), buf); return; }
  ensureDir(parent(p));
  files.set(p, { data: buf, mtime: Date.now() });
  removed.delete(p); dirty.add(p); scheduleFlush();
}
function appendFileSync(p, data, enc) {
  p = norm(p); const cur = files.get(p);
  writeFileSync(p, cur ? Buffer.concat([cur.data, toBuf(data, enc)]) : toBuf(data, enc));
}
function readFileSync(p, enc) {
  p = norm(p); const f = files.get(p);
  if (!f) throw enoent(p, 'open');
  const e = typeof enc === 'string' ? enc : enc && enc.encoding;
  return e ? f.data.toString(e) : Buffer.from(f.data);
}
function existsSync(p) { p = norm(p); return files.has(p) || dirs.has(p) || isExport(p); }
function mkdirSync(p) { ensureDir(p); return undefined; }
function unlinkSync(p) { p = norm(p); if (!files.delete(p)) throw enoent(p, 'unlink'); dirty.delete(p); removed.add(p); scheduleFlush(); }
function statSync(p) {
  p = norm(p); const f = files.get(p);
  if (f) return { size: f.data.length, mtime: new Date(f.mtime), mtimeMs: f.mtime, birthtime: new Date(f.mtime), isFile: () => true, isDirectory: () => false };
  if (dirs.has(p)) return { size: 0, mtime: new Date(), mtimeMs: Date.now(), isFile: () => false, isDirectory: () => true };
  throw enoent(p, 'stat');
}
function readdirSync(p, opts) {
  p = norm(p); if (!dirs.has(p)) throw enoent(p, 'scandir');
  const pre = p === '/' ? '/' : p + '/';
  const names = new Map();
  for (const k of files.keys()) if (k.startsWith(pre)) { const rest = k.slice(pre.length); if (!rest.includes('/')) names.set(rest, 'f'); }
  for (const d of dirs) if (d.startsWith(pre)) { const rest = d.slice(pre.length); if (rest && !rest.includes('/')) names.set(rest, 'd'); }
  const list = [...names.keys()].sort();
  if (opts && opts.withFileTypes) return list.map(n => ({ name: n, isFile: () => names.get(n) === 'f', isDirectory: () => names.get(n) === 'd' }));
  return list;
}
function copyFileSync(a, b) { writeFileSync(b, readFileSync(a)); }
function renameSync(a, b) { a = norm(a); b = norm(b); const f = files.get(a); if (!f) throw enoent(a, 'rename'); writeFileSync(b, f.data); files.delete(a); dirty.delete(a); removed.add(a); scheduleFlush(); }
function rmSync(p, opts = {}) {
  p = norm(p);
  if (files.has(p)) { unlinkSync(p); return; }
  if (dirs.has(p)) {
    for (const k of [...files.keys()]) if (k.startsWith(p + '/')) { files.delete(k); removed.add(k); }
    for (const d of [...dirs]) if (d === p || d.startsWith(p + '/')) dirs.delete(d);
    scheduleFlush(); return;
  }
  if (!opts.force) throw enoent(p, 'rm');
}
function cpSync(a, b) {
  a = norm(a); b = norm(b);
  if (files.has(a)) { copyFileSync(a, b); return; }
  for (const k of [...files.keys()]) if (k.startsWith(a + '/')) writeFileSync(b + k.slice(a.length), files.get(k).data);
}

module.exports = {
  existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync, unlinkSync, statSync, readdirSync, copyFileSync, renameSync, rmSync, cpSync,
  promises: {
    readFile: async (p, e) => readFileSync(p, e), writeFile: async (p, d, e) => writeFileSync(p, d, e), unlink: async (p) => unlinkSync(p), mkdir: async (p) => mkdirSync(p)
  },
  // для Android-оболочки
  __load: load, __flush: flush, __putVolatile: putVolatile, __onExport: onExport, __EXPORT_DIR: EXPORT_DIR, __files: files
};

}, {"buffer":1}, "/app/shims/fs.js"];
__defs[5] = [function(module, exports, require, __filename, __dirname){
// electron для Android-версии: главный процесс программы (main.js) работает прямо внутри
// приложения, а окно — это сама страница. ipcMain.handle / webContents.send связаны с
// window.api (preload.js) напрямую, без процессов.
'use strict';
const host = globalThis.__LOYA_HOST;   // см. android-host.js

const handlers = new Map(), listeners = new Map();
const ipcMain = {
  handle(ch, fn) { handlers.set(ch, fn); },
  handleOnce(ch, fn) { handlers.set(ch, (...a) => { handlers.delete(ch); return fn(...a); }); },
  removeHandler(ch) { handlers.delete(ch); },
  on(ch, fn) { (listeners.get(ch) || listeners.set(ch, []).get(ch)).push(fn); return ipcMain; },
  once(ch, fn) { const w = (...a) => { ipcMain.removeListener(ch, w); fn(...a); }; return ipcMain.on(ch, w); },
  removeListener(ch, fn) { listeners.set(ch, (listeners.get(ch) || []).filter(f => f !== fn)); return ipcMain; },
  off(ch, fn) { return ipcMain.removeListener(ch, fn); },
  removeAllListeners(ch) { if (ch) listeners.delete(ch); else listeners.clear(); return ipcMain; },
  __handlers: handlers, __listeners: listeners
};

const finishLoad = [];
let windowCreated = false;
function makeWebContents() {
  const wc = {
    send: (ch, ...args) => host.toRenderer(ch, args),
    on(ev, fn) { if (ev === 'did-finish-load') finishLoad.push(fn); return wc; },
    once(ev, fn) { return wc.on(ev, fn); },
    setWindowOpenHandler() {}, isDestroyed: () => false, executeJavaScript: async (code) => (0, eval)(code),
    print: (opts, cb) => { host.print(null).then(ok => cb && cb(!!ok)); },
    printToPDF: async () => { throw new Error('printToPDF_android'); },
    session: { setPermissionRequestHandler() {}, setPermissionCheckHandler() {} },
    getURL: () => location.href, reload: () => location.reload(), openDevTools() {}, setZoomFactor() {}, id: 1
  };
  return wc;
}
class BrowserWindow {
  constructor() {
    this.webContents = makeWebContents();
    this._main = !windowCreated; windowCreated = true;
    if (this._main) BrowserWindow._main = this;
  }
  loadFile() { if (this._main) host.mainWindowReady(() => finishLoad.splice(0).forEach(f => { try { f(); } catch (e) { console.error(e); } })); return Promise.resolve(); }
  loadURL() { return Promise.resolve(); }
  isDestroyed() { return false; } isMinimized() { return false; } restore() {} focus() {} show() {} hide() {} close() {} destroy() {}
  setMenuBarVisibility() {} setMenu() {} on() { return this; } once() { return this; } maximize() {} setTitle(t) { try { document.title = t; } catch (e) { /* нет */ } }
  static getAllWindows() { return BrowserWindow._main ? [BrowserWindow._main] : []; }
  static getFocusedWindow() { return BrowserWindow._main || null; }
}

const app = {
  getPath: (name) => (name === 'temp' ? '/tmp' : name === 'downloads' ? '/Загрузки' : '/loya'),
  getVersion: () => host.version, getName: () => 'Loya', isPackaged: true,
  whenReady: () => Promise.resolve(), isReady: () => true,
  requestSingleInstanceLock: () => true, on() { return app; }, once() { return app; }, quit() {}, exit() {}, relaunch() { location.reload(); },
  getLocale: () => (navigator.language || 'ru'), setAppUserModelId() {}, commandLine: { appendSwitch() {} }
};

const dialog = {
  showSaveDialog: (w, o) => host.saveDialog(o && o.defaultPath ? o : w),
  showOpenDialog: (w, o) => host.openDialog(o && (o.properties || o.filters) ? o : w),
  showMessageBox: (w, o) => host.messageBox(o && o.message ? o : w),
  showErrorBox: (title, msg) => host.messageBox({ message: `${title}\n${msg}` })
};
const shell = { openExternal: (url) => host.openExternal(url), openPath: async () => { host.openPath(); return ''; }, showItemInFolder() {} };
const session = { defaultSession: { setPermissionRequestHandler() {}, setPermissionCheckHandler() {}, clearCache: async () => {} } };
const systemPreferences = { getMediaAccessStatus: () => 'granted', askForMediaAccess: async () => true };
const Menu = { setApplicationMenu() {}, buildFromTemplate: () => ({}) };
const nativeImage = { createFromPath: () => ({ isEmpty: () => true }), createFromDataURL: () => ({}) };
module.exports = { app, BrowserWindow, ipcMain, dialog, shell, session, systemPreferences, Menu, nativeImage, Notification: function () { return { show() {} }; } };

}, {}, "/app/shims/electron.js"];
__defs[6] = [function(module, exports, require, __filename, __dirname){
// crypto для Android-версии: то же API, что использует программа (Node `crypto`), но на чистом JS.
// Хэши SHA-1/SHA-256, HMAC, scrypt (как crypto.scryptSync в Node: N=16384, r=8, p=1) — побитно
// совпадают с Node, поэтому PIN-коды и коды входа из копии базы с ПК работают и на планшете.
'use strict';
const { Buffer } = require('buffer');

function toBytes(data, enc) {
  if (data instanceof Uint8Array) return data;
  if (typeof data === 'string') return Buffer.from(data, enc || 'utf8');
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return Buffer.from(String(data), 'utf8');
}
function concat(chunks) {
  let n = 0; for (const c of chunks) n += c.length;
  const out = new Uint8Array(n); let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

// ---------- SHA-256 ----------
const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
function sha256(msg) {
  const l = msg.length, bitLen = l * 8;
  const withPad = ((l + 9 + 63) >> 6) << 6;
  const m = new Uint8Array(withPad); m.set(msg); m[l] = 0x80;
  const dv = new DataView(m.buffer);
  dv.setUint32(withPad - 4, bitLen >>> 0); dv.setUint32(withPad - 8, Math.floor(bitLen / 0x100000000));
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  for (let off = 0; off < withPad; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15], b = w[i - 2];
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
      const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K256[i] + w[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + mj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }
  const out = new Uint8Array(32); const od = new DataView(out.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((v, i) => od.setUint32(i * 4, v >>> 0));
  return out;
}

// ---------- SHA-1 ----------
function sha1(msg) {
  const l = msg.length, bitLen = l * 8;
  const withPad = ((l + 9 + 63) >> 6) << 6;
  const m = new Uint8Array(withPad); m.set(msg); m[l] = 0x80;
  const dv = new DataView(m.buffer);
  dv.setUint32(withPad - 4, bitLen >>> 0); dv.setUint32(withPad - 8, Math.floor(bitLen / 0x100000000));
  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);
  for (let off = 0; off < withPad; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 80; i++) { const x = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]; w[i] = (x << 1) | (x >>> 31); }
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let i = 0; i < 80; i++) {
      let f, k;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const t = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) | 0;
      e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = t;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
  }
  const out = new Uint8Array(20); const od = new DataView(out.buffer);
  [h0, h1, h2, h3, h4].forEach((v, i) => od.setUint32(i * 4, v >>> 0));
  return out;
}

const HASHES = { sha256: { fn: sha256, block: 64 }, sha1: { fn: sha1, block: 64 } };
function hashFn(alg) {
  const h = HASHES[String(alg).toLowerCase().replace('-', '')];
  if (!h) throw new Error('Digest method not supported on Android: ' + alg);
  return h;
}
function out(bytes, enc) { const b = Buffer.from(bytes); return enc ? b.toString(enc) : b; }

function hmacBytes(alg, key, msg) {
  const h = hashFn(alg);
  let k = toBytes(key);
  if (k.length > h.block) k = h.fn(k);
  const kk = new Uint8Array(h.block); kk.set(k);
  const ipad = new Uint8Array(h.block), opad = new Uint8Array(h.block);
  for (let i = 0; i < h.block; i++) { ipad[i] = kk[i] ^ 0x36; opad[i] = kk[i] ^ 0x5c; }
  return h.fn(concat([opad, h.fn(concat([ipad, msg]))]));
}

function createHash(alg) {
  const h = hashFn(alg); const chunks = [];
  const api = {
    update(data, enc) { chunks.push(toBytes(data, enc)); return api; },
    digest(enc) { return out(h.fn(concat(chunks)), enc); }
  };
  return api;
}
function createHmac(alg, key) {
  hashFn(alg); const chunks = [];
  const api = {
    update(data, enc) { chunks.push(toBytes(data, enc)); return api; },
    digest(enc) { return out(hmacBytes(alg, key, concat(chunks)), enc); }
  };
  return api;
}

// ---------- PBKDF2-HMAC-SHA256 и scrypt ----------
function pbkdf2Sha256(password, salt, iterations, dkLen) {
  const blocks = Math.ceil(dkLen / 32); const dk = new Uint8Array(blocks * 32);
  for (let i = 1; i <= blocks; i++) {
    const s = new Uint8Array(salt.length + 4); s.set(salt); new DataView(s.buffer).setUint32(salt.length, i);
    let u = hmacBytes('sha256', password, s); const t = u.slice();
    for (let j = 1; j < iterations; j++) { u = hmacBytes('sha256', password, u); for (let k = 0; k < 32; k++) t[k] ^= u[k]; }
    dk.set(t, (i - 1) * 32);
  }
  return dk.slice(0, dkLen);
}
function salsa208(B) {   // B: Uint32Array(16), на месте
  const x = new Uint32Array(B);
  const R = (a, b) => (a << b) | (a >>> (32 - b));
  for (let i = 0; i < 8; i += 2) {
    x[4] ^= R(x[0] + x[12], 7); x[8] ^= R(x[4] + x[0], 9); x[12] ^= R(x[8] + x[4], 13); x[0] ^= R(x[12] + x[8], 18);
    x[9] ^= R(x[5] + x[1], 7); x[13] ^= R(x[9] + x[5], 9); x[1] ^= R(x[13] + x[9], 13); x[5] ^= R(x[1] + x[13], 18);
    x[14] ^= R(x[10] + x[6], 7); x[2] ^= R(x[14] + x[10], 9); x[6] ^= R(x[2] + x[14], 13); x[10] ^= R(x[6] + x[2], 18);
    x[3] ^= R(x[15] + x[11], 7); x[7] ^= R(x[3] + x[15], 9); x[11] ^= R(x[7] + x[3], 13); x[15] ^= R(x[11] + x[7], 18);
    x[1] ^= R(x[0] + x[3], 7); x[2] ^= R(x[1] + x[0], 9); x[3] ^= R(x[2] + x[1], 13); x[0] ^= R(x[3] + x[2], 18);
    x[6] ^= R(x[5] + x[4], 7); x[7] ^= R(x[6] + x[5], 9); x[4] ^= R(x[7] + x[6], 13); x[5] ^= R(x[4] + x[7], 18);
    x[11] ^= R(x[10] + x[9], 7); x[8] ^= R(x[11] + x[10], 9); x[9] ^= R(x[8] + x[11], 13); x[10] ^= R(x[9] + x[8], 18);
    x[12] ^= R(x[15] + x[14], 7); x[13] ^= R(x[12] + x[15], 9); x[14] ^= R(x[13] + x[12], 13); x[15] ^= R(x[14] + x[13], 18);
  }
  for (let i = 0; i < 16; i++) B[i] = (B[i] + x[i]) | 0;
}
function blockMix(B, Y, r) {   // B, Y: Uint32Array(32*r)
  const X = B.slice((2 * r - 1) * 16, 2 * r * 16);
  for (let i = 0; i < 2 * r; i++) {
    for (let k = 0; k < 16; k++) X[k] ^= B[i * 16 + k];
    salsa208(X);
    const dst = (i % 2 === 0 ? (i / 2) : (r + (i - 1) / 2)) * 16;
    Y.set(X, dst);
  }
}
function scryptSync(password, salt, keylen, opts = {}) {
  const N = opts.N || opts.cost || 16384, r = opts.r || opts.blockSize || 8, p = opts.p || opts.parallelization || 1;
  const P = toBytes(password), S = toBytes(salt);
  const B = pbkdf2Sha256(P, S, 1, 128 * r * p);
  const words = 32 * r;
  for (let j = 0; j < p; j++) {
    const X = new Uint32Array(words);
    const bv = new DataView(B.buffer, B.byteOffset + j * 128 * r, 128 * r);
    for (let i = 0; i < words; i++) X[i] = bv.getUint32(i * 4, true);
    const V = new Uint32Array(words * N); const Y = new Uint32Array(words);
    for (let i = 0; i < N; i++) { V.set(X, i * words); blockMix(X, Y, r); X.set(Y); }
    for (let i = 0; i < N; i++) {
      const jj = X[(2 * r - 1) * 16] & (N - 1);
      for (let k = 0; k < words; k++) X[k] ^= V[jj * words + k];
      blockMix(X, Y, r); X.set(Y);
    }
    for (let i = 0; i < words; i++) bv.setUint32(i * 4, X[i], true);
  }
  return Buffer.from(pbkdf2Sha256(P, B, 1, keylen));
}

function getRandomValues(arr) {
  const c = (typeof globalThis !== 'undefined' && globalThis.crypto) || null;
  if (c && c.getRandomValues) {
    for (let i = 0; i < arr.length; i += 65536) c.getRandomValues(arr.subarray(i, Math.min(arr.length, i + 65536)));
    return arr;
  }
  throw new Error('no secure random');
}
function randomBytes(n) { return Buffer.from(getRandomValues(new Uint8Array(n))); }
function randomInt(min, max) {
  if (max === undefined) { max = min; min = 0; }
  const range = max - min; if (range <= 0) throw new RangeError('randomInt range');
  const lim = Math.floor(0x100000000 / range) * range; const b = new Uint32Array(1);
  do { getRandomValues(b); } while (b[0] >= lim);
  return min + (b[0] % range);
}
function randomUUID() { const b = randomBytes(16); b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80; const h = b.toString('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; }
function timingSafeEqual(a, b) {
  if (a.length !== b.length) throw new RangeError('Input buffers must have the same byte length');
  let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0;
}
function createSign() { throw new Error('own_google_wallet_not_supported_on_android'); }


// Проверка подписи Ed25519 (талон подписки Loya) — через tweetnacl (public domain), побайтно совместимо с Node.
function createPublicKey(input) {
  const pem = typeof input === 'string' ? input : (input && (input.key || input)) + '';
  const m = /-----BEGIN PUBLIC KEY-----([\s\S]+?)-----END PUBLIC KEY-----/.exec(pem);
  if (!m) throw new Error('createPublicKey: PEM expected');
  const der = Buffer.from(m[1].replace(/\s+/g, ''), 'base64');
  // SPKI Ed25519: 302a300506032b6570032100 + 32 байта ключа
  if (der.length !== 44 || der.slice(0, 12).toString('hex') !== '302a300506032b6570032100') throw new Error('createPublicKey: only Ed25519');
  return { type: 'public', asymmetricKeyType: 'ed25519', __raw: new Uint8Array(der.slice(12)) };
}
function verify(alg, data, key, sig) {
  if (alg) throw new Error('verify: only Ed25519 (algorithm null)');
  if (!key || !key.__raw) throw new Error('verify: key from createPublicKey expected');
  const nacl = require('tweetnacl');
  const s = new Uint8Array(toBytes(sig));
  if (s.length !== 64) return false;
  return nacl.sign.detached.verify(new Uint8Array(toBytes(data)), s, key.__raw);
}

module.exports = { createPublicKey, verify, createHash, createHmac, scryptSync, randomBytes, randomInt, randomUUID, timingSafeEqual, createSign, pbkdf2Sync: (pw, salt, it, len, dig) => { if (String(dig).toLowerCase() !== 'sha256') throw new Error('pbkdf2: only sha256'); return Buffer.from(pbkdf2Sha256(toBytes(pw), toBytes(salt), it, len)); }, getRandomValues };

}, {"buffer":1,"tweetnacl":7}, "/app/shims/crypto.js"];
__defs[7] = [function(module, exports, require, __filename, __dirname){
(function(nacl) {
'use strict';

// Ported in 2014 by Dmitry Chestnykh and Devi Mandiri.
// Public domain.
//
// Implementation derived from TweetNaCl version 20140427.
// See for details: http://tweetnacl.cr.yp.to/

var gf = function(init) {
  var i, r = new Float64Array(16);
  if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
  return r;
};

//  Pluggable, initialized in high-level API below.
var randombytes = function(/* x, n */) { throw new Error('no PRNG'); };

var _0 = new Uint8Array(16);
var _9 = new Uint8Array(32); _9[0] = 9;

var gf0 = gf(),
    gf1 = gf([1]),
    _121665 = gf([0xdb41, 1]),
    D = gf([0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203]),
    D2 = gf([0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df, 0xd9dc, 0x2406]),
    X = gf([0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e, 0x36d3, 0x2169]),
    Y = gf([0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666]),
    I = gf([0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]);

function ts64(x, i, h, l) {
  x[i]   = (h >> 24) & 0xff;
  x[i+1] = (h >> 16) & 0xff;
  x[i+2] = (h >>  8) & 0xff;
  x[i+3] = h & 0xff;
  x[i+4] = (l >> 24)  & 0xff;
  x[i+5] = (l >> 16)  & 0xff;
  x[i+6] = (l >>  8)  & 0xff;
  x[i+7] = l & 0xff;
}

function vn(x, xi, y, yi, n) {
  var i,d = 0;
  for (i = 0; i < n; i++) d |= x[xi+i]^y[yi+i];
  return (1 & ((d - 1) >>> 8)) - 1;
}

function crypto_verify_16(x, xi, y, yi) {
  return vn(x,xi,y,yi,16);
}

function crypto_verify_32(x, xi, y, yi) {
  return vn(x,xi,y,yi,32);
}

function core_salsa20(o, p, k, c) {
  var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
      j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
      j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
      j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
      j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
      j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
      j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
      j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
      j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
      j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
      j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
      j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
      j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
      j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
      j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
      j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

  var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
      x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
      x15 = j15, u;

  for (var i = 0; i < 20; i += 2) {
    u = x0 + x12 | 0;
    x4 ^= u<<7 | u>>>(32-7);
    u = x4 + x0 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x4 | 0;
    x12 ^= u<<13 | u>>>(32-13);
    u = x12 + x8 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x1 | 0;
    x9 ^= u<<7 | u>>>(32-7);
    u = x9 + x5 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x9 | 0;
    x1 ^= u<<13 | u>>>(32-13);
    u = x1 + x13 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x6 | 0;
    x14 ^= u<<7 | u>>>(32-7);
    u = x14 + x10 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x14 | 0;
    x6 ^= u<<13 | u>>>(32-13);
    u = x6 + x2 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x11 | 0;
    x3 ^= u<<7 | u>>>(32-7);
    u = x3 + x15 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x3 | 0;
    x11 ^= u<<13 | u>>>(32-13);
    u = x11 + x7 | 0;
    x15 ^= u<<18 | u>>>(32-18);

    u = x0 + x3 | 0;
    x1 ^= u<<7 | u>>>(32-7);
    u = x1 + x0 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x1 | 0;
    x3 ^= u<<13 | u>>>(32-13);
    u = x3 + x2 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x4 | 0;
    x6 ^= u<<7 | u>>>(32-7);
    u = x6 + x5 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x6 | 0;
    x4 ^= u<<13 | u>>>(32-13);
    u = x4 + x7 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x9 | 0;
    x11 ^= u<<7 | u>>>(32-7);
    u = x11 + x10 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x11 | 0;
    x9 ^= u<<13 | u>>>(32-13);
    u = x9 + x8 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x14 | 0;
    x12 ^= u<<7 | u>>>(32-7);
    u = x12 + x15 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x12 | 0;
    x14 ^= u<<13 | u>>>(32-13);
    u = x14 + x13 | 0;
    x15 ^= u<<18 | u>>>(32-18);
  }
   x0 =  x0 +  j0 | 0;
   x1 =  x1 +  j1 | 0;
   x2 =  x2 +  j2 | 0;
   x3 =  x3 +  j3 | 0;
   x4 =  x4 +  j4 | 0;
   x5 =  x5 +  j5 | 0;
   x6 =  x6 +  j6 | 0;
   x7 =  x7 +  j7 | 0;
   x8 =  x8 +  j8 | 0;
   x9 =  x9 +  j9 | 0;
  x10 = x10 + j10 | 0;
  x11 = x11 + j11 | 0;
  x12 = x12 + j12 | 0;
  x13 = x13 + j13 | 0;
  x14 = x14 + j14 | 0;
  x15 = x15 + j15 | 0;

  o[ 0] = x0 >>>  0 & 0xff;
  o[ 1] = x0 >>>  8 & 0xff;
  o[ 2] = x0 >>> 16 & 0xff;
  o[ 3] = x0 >>> 24 & 0xff;

  o[ 4] = x1 >>>  0 & 0xff;
  o[ 5] = x1 >>>  8 & 0xff;
  o[ 6] = x1 >>> 16 & 0xff;
  o[ 7] = x1 >>> 24 & 0xff;

  o[ 8] = x2 >>>  0 & 0xff;
  o[ 9] = x2 >>>  8 & 0xff;
  o[10] = x2 >>> 16 & 0xff;
  o[11] = x2 >>> 24 & 0xff;

  o[12] = x3 >>>  0 & 0xff;
  o[13] = x3 >>>  8 & 0xff;
  o[14] = x3 >>> 16 & 0xff;
  o[15] = x3 >>> 24 & 0xff;

  o[16] = x4 >>>  0 & 0xff;
  o[17] = x4 >>>  8 & 0xff;
  o[18] = x4 >>> 16 & 0xff;
  o[19] = x4 >>> 24 & 0xff;

  o[20] = x5 >>>  0 & 0xff;
  o[21] = x5 >>>  8 & 0xff;
  o[22] = x5 >>> 16 & 0xff;
  o[23] = x5 >>> 24 & 0xff;

  o[24] = x6 >>>  0 & 0xff;
  o[25] = x6 >>>  8 & 0xff;
  o[26] = x6 >>> 16 & 0xff;
  o[27] = x6 >>> 24 & 0xff;

  o[28] = x7 >>>  0 & 0xff;
  o[29] = x7 >>>  8 & 0xff;
  o[30] = x7 >>> 16 & 0xff;
  o[31] = x7 >>> 24 & 0xff;

  o[32] = x8 >>>  0 & 0xff;
  o[33] = x8 >>>  8 & 0xff;
  o[34] = x8 >>> 16 & 0xff;
  o[35] = x8 >>> 24 & 0xff;

  o[36] = x9 >>>  0 & 0xff;
  o[37] = x9 >>>  8 & 0xff;
  o[38] = x9 >>> 16 & 0xff;
  o[39] = x9 >>> 24 & 0xff;

  o[40] = x10 >>>  0 & 0xff;
  o[41] = x10 >>>  8 & 0xff;
  o[42] = x10 >>> 16 & 0xff;
  o[43] = x10 >>> 24 & 0xff;

  o[44] = x11 >>>  0 & 0xff;
  o[45] = x11 >>>  8 & 0xff;
  o[46] = x11 >>> 16 & 0xff;
  o[47] = x11 >>> 24 & 0xff;

  o[48] = x12 >>>  0 & 0xff;
  o[49] = x12 >>>  8 & 0xff;
  o[50] = x12 >>> 16 & 0xff;
  o[51] = x12 >>> 24 & 0xff;

  o[52] = x13 >>>  0 & 0xff;
  o[53] = x13 >>>  8 & 0xff;
  o[54] = x13 >>> 16 & 0xff;
  o[55] = x13 >>> 24 & 0xff;

  o[56] = x14 >>>  0 & 0xff;
  o[57] = x14 >>>  8 & 0xff;
  o[58] = x14 >>> 16 & 0xff;
  o[59] = x14 >>> 24 & 0xff;

  o[60] = x15 >>>  0 & 0xff;
  o[61] = x15 >>>  8 & 0xff;
  o[62] = x15 >>> 16 & 0xff;
  o[63] = x15 >>> 24 & 0xff;
}

function core_hsalsa20(o,p,k,c) {
  var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
      j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
      j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
      j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
      j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
      j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
      j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
      j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
      j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
      j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
      j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
      j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
      j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
      j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
      j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
      j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

  var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
      x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
      x15 = j15, u;

  for (var i = 0; i < 20; i += 2) {
    u = x0 + x12 | 0;
    x4 ^= u<<7 | u>>>(32-7);
    u = x4 + x0 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x4 | 0;
    x12 ^= u<<13 | u>>>(32-13);
    u = x12 + x8 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x1 | 0;
    x9 ^= u<<7 | u>>>(32-7);
    u = x9 + x5 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x9 | 0;
    x1 ^= u<<13 | u>>>(32-13);
    u = x1 + x13 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x6 | 0;
    x14 ^= u<<7 | u>>>(32-7);
    u = x14 + x10 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x14 | 0;
    x6 ^= u<<13 | u>>>(32-13);
    u = x6 + x2 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x11 | 0;
    x3 ^= u<<7 | u>>>(32-7);
    u = x3 + x15 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x3 | 0;
    x11 ^= u<<13 | u>>>(32-13);
    u = x11 + x7 | 0;
    x15 ^= u<<18 | u>>>(32-18);

    u = x0 + x3 | 0;
    x1 ^= u<<7 | u>>>(32-7);
    u = x1 + x0 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x1 | 0;
    x3 ^= u<<13 | u>>>(32-13);
    u = x3 + x2 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x4 | 0;
    x6 ^= u<<7 | u>>>(32-7);
    u = x6 + x5 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x6 | 0;
    x4 ^= u<<13 | u>>>(32-13);
    u = x4 + x7 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x9 | 0;
    x11 ^= u<<7 | u>>>(32-7);
    u = x11 + x10 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x11 | 0;
    x9 ^= u<<13 | u>>>(32-13);
    u = x9 + x8 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x14 | 0;
    x12 ^= u<<7 | u>>>(32-7);
    u = x12 + x15 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x12 | 0;
    x14 ^= u<<13 | u>>>(32-13);
    u = x14 + x13 | 0;
    x15 ^= u<<18 | u>>>(32-18);
  }

  o[ 0] = x0 >>>  0 & 0xff;
  o[ 1] = x0 >>>  8 & 0xff;
  o[ 2] = x0 >>> 16 & 0xff;
  o[ 3] = x0 >>> 24 & 0xff;

  o[ 4] = x5 >>>  0 & 0xff;
  o[ 5] = x5 >>>  8 & 0xff;
  o[ 6] = x5 >>> 16 & 0xff;
  o[ 7] = x5 >>> 24 & 0xff;

  o[ 8] = x10 >>>  0 & 0xff;
  o[ 9] = x10 >>>  8 & 0xff;
  o[10] = x10 >>> 16 & 0xff;
  o[11] = x10 >>> 24 & 0xff;

  o[12] = x15 >>>  0 & 0xff;
  o[13] = x15 >>>  8 & 0xff;
  o[14] = x15 >>> 16 & 0xff;
  o[15] = x15 >>> 24 & 0xff;

  o[16] = x6 >>>  0 & 0xff;
  o[17] = x6 >>>  8 & 0xff;
  o[18] = x6 >>> 16 & 0xff;
  o[19] = x6 >>> 24 & 0xff;

  o[20] = x7 >>>  0 & 0xff;
  o[21] = x7 >>>  8 & 0xff;
  o[22] = x7 >>> 16 & 0xff;
  o[23] = x7 >>> 24 & 0xff;

  o[24] = x8 >>>  0 & 0xff;
  o[25] = x8 >>>  8 & 0xff;
  o[26] = x8 >>> 16 & 0xff;
  o[27] = x8 >>> 24 & 0xff;

  o[28] = x9 >>>  0 & 0xff;
  o[29] = x9 >>>  8 & 0xff;
  o[30] = x9 >>> 16 & 0xff;
  o[31] = x9 >>> 24 & 0xff;
}

function crypto_core_salsa20(out,inp,k,c) {
  core_salsa20(out,inp,k,c);
}

function crypto_core_hsalsa20(out,inp,k,c) {
  core_hsalsa20(out,inp,k,c);
}

var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
            // "expand 32-byte k"

function crypto_stream_salsa20_xor(c,cpos,m,mpos,b,n,k) {
  var z = new Uint8Array(16), x = new Uint8Array(64);
  var u, i;
  for (i = 0; i < 16; i++) z[i] = 0;
  for (i = 0; i < 8; i++) z[i] = n[i];
  while (b >= 64) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < 64; i++) c[cpos+i] = m[mpos+i] ^ x[i];
    u = 1;
    for (i = 8; i < 16; i++) {
      u = u + (z[i] & 0xff) | 0;
      z[i] = u & 0xff;
      u >>>= 8;
    }
    b -= 64;
    cpos += 64;
    mpos += 64;
  }
  if (b > 0) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < b; i++) c[cpos+i] = m[mpos+i] ^ x[i];
  }
  return 0;
}

function crypto_stream_salsa20(c,cpos,b,n,k) {
  var z = new Uint8Array(16), x = new Uint8Array(64);
  var u, i;
  for (i = 0; i < 16; i++) z[i] = 0;
  for (i = 0; i < 8; i++) z[i] = n[i];
  while (b >= 64) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < 64; i++) c[cpos+i] = x[i];
    u = 1;
    for (i = 8; i < 16; i++) {
      u = u + (z[i] & 0xff) | 0;
      z[i] = u & 0xff;
      u >>>= 8;
    }
    b -= 64;
    cpos += 64;
  }
  if (b > 0) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < b; i++) c[cpos+i] = x[i];
  }
  return 0;
}

function crypto_stream(c,cpos,d,n,k) {
  var s = new Uint8Array(32);
  crypto_core_hsalsa20(s,n,k,sigma);
  var sn = new Uint8Array(8);
  for (var i = 0; i < 8; i++) sn[i] = n[i+16];
  return crypto_stream_salsa20(c,cpos,d,sn,s);
}

function crypto_stream_xor(c,cpos,m,mpos,d,n,k) {
  var s = new Uint8Array(32);
  crypto_core_hsalsa20(s,n,k,sigma);
  var sn = new Uint8Array(8);
  for (var i = 0; i < 8; i++) sn[i] = n[i+16];
  return crypto_stream_salsa20_xor(c,cpos,m,mpos,d,sn,s);
}

/*
* Port of Andrew Moon's Poly1305-donna-16. Public domain.
* https://github.com/floodyberry/poly1305-donna
*/

var poly1305 = function(key) {
  this.buffer = new Uint8Array(16);
  this.r = new Uint16Array(10);
  this.h = new Uint16Array(10);
  this.pad = new Uint16Array(8);
  this.leftover = 0;
  this.fin = 0;

  var t0, t1, t2, t3, t4, t5, t6, t7;

  t0 = key[ 0] & 0xff | (key[ 1] & 0xff) << 8; this.r[0] = ( t0                     ) & 0x1fff;
  t1 = key[ 2] & 0xff | (key[ 3] & 0xff) << 8; this.r[1] = ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
  t2 = key[ 4] & 0xff | (key[ 5] & 0xff) << 8; this.r[2] = ((t1 >>> 10) | (t2 <<  6)) & 0x1f03;
  t3 = key[ 6] & 0xff | (key[ 7] & 0xff) << 8; this.r[3] = ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
  t4 = key[ 8] & 0xff | (key[ 9] & 0xff) << 8; this.r[4] = ((t3 >>>  4) | (t4 << 12)) & 0x00ff;
  this.r[5] = ((t4 >>>  1)) & 0x1ffe;
  t5 = key[10] & 0xff | (key[11] & 0xff) << 8; this.r[6] = ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
  t6 = key[12] & 0xff | (key[13] & 0xff) << 8; this.r[7] = ((t5 >>> 11) | (t6 <<  5)) & 0x1f81;
  t7 = key[14] & 0xff | (key[15] & 0xff) << 8; this.r[8] = ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
  this.r[9] = ((t7 >>>  5)) & 0x007f;

  this.pad[0] = key[16] & 0xff | (key[17] & 0xff) << 8;
  this.pad[1] = key[18] & 0xff | (key[19] & 0xff) << 8;
  this.pad[2] = key[20] & 0xff | (key[21] & 0xff) << 8;
  this.pad[3] = key[22] & 0xff | (key[23] & 0xff) << 8;
  this.pad[4] = key[24] & 0xff | (key[25] & 0xff) << 8;
  this.pad[5] = key[26] & 0xff | (key[27] & 0xff) << 8;
  this.pad[6] = key[28] & 0xff | (key[29] & 0xff) << 8;
  this.pad[7] = key[30] & 0xff | (key[31] & 0xff) << 8;
};

poly1305.prototype.blocks = function(m, mpos, bytes) {
  var hibit = this.fin ? 0 : (1 << 11);
  var t0, t1, t2, t3, t4, t5, t6, t7, c;
  var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;

  var h0 = this.h[0],
      h1 = this.h[1],
      h2 = this.h[2],
      h3 = this.h[3],
      h4 = this.h[4],
      h5 = this.h[5],
      h6 = this.h[6],
      h7 = this.h[7],
      h8 = this.h[8],
      h9 = this.h[9];

  var r0 = this.r[0],
      r1 = this.r[1],
      r2 = this.r[2],
      r3 = this.r[3],
      r4 = this.r[4],
      r5 = this.r[5],
      r6 = this.r[6],
      r7 = this.r[7],
      r8 = this.r[8],
      r9 = this.r[9];

  while (bytes >= 16) {
    t0 = m[mpos+ 0] & 0xff | (m[mpos+ 1] & 0xff) << 8; h0 += ( t0                     ) & 0x1fff;
    t1 = m[mpos+ 2] & 0xff | (m[mpos+ 3] & 0xff) << 8; h1 += ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
    t2 = m[mpos+ 4] & 0xff | (m[mpos+ 5] & 0xff) << 8; h2 += ((t1 >>> 10) | (t2 <<  6)) & 0x1fff;
    t3 = m[mpos+ 6] & 0xff | (m[mpos+ 7] & 0xff) << 8; h3 += ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
    t4 = m[mpos+ 8] & 0xff | (m[mpos+ 9] & 0xff) << 8; h4 += ((t3 >>>  4) | (t4 << 12)) & 0x1fff;
    h5 += ((t4 >>>  1)) & 0x1fff;
    t5 = m[mpos+10] & 0xff | (m[mpos+11] & 0xff) << 8; h6 += ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
    t6 = m[mpos+12] & 0xff | (m[mpos+13] & 0xff) << 8; h7 += ((t5 >>> 11) | (t6 <<  5)) & 0x1fff;
    t7 = m[mpos+14] & 0xff | (m[mpos+15] & 0xff) << 8; h8 += ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
    h9 += ((t7 >>> 5)) | hibit;

    c = 0;

    d0 = c;
    d0 += h0 * r0;
    d0 += h1 * (5 * r9);
    d0 += h2 * (5 * r8);
    d0 += h3 * (5 * r7);
    d0 += h4 * (5 * r6);
    c = (d0 >>> 13); d0 &= 0x1fff;
    d0 += h5 * (5 * r5);
    d0 += h6 * (5 * r4);
    d0 += h7 * (5 * r3);
    d0 += h8 * (5 * r2);
    d0 += h9 * (5 * r1);
    c += (d0 >>> 13); d0 &= 0x1fff;

    d1 = c;
    d1 += h0 * r1;
    d1 += h1 * r0;
    d1 += h2 * (5 * r9);
    d1 += h3 * (5 * r8);
    d1 += h4 * (5 * r7);
    c = (d1 >>> 13); d1 &= 0x1fff;
    d1 += h5 * (5 * r6);
    d1 += h6 * (5 * r5);
    d1 += h7 * (5 * r4);
    d1 += h8 * (5 * r3);
    d1 += h9 * (5 * r2);
    c += (d1 >>> 13); d1 &= 0x1fff;

    d2 = c;
    d2 += h0 * r2;
    d2 += h1 * r1;
    d2 += h2 * r0;
    d2 += h3 * (5 * r9);
    d2 += h4 * (5 * r8);
    c = (d2 >>> 13); d2 &= 0x1fff;
    d2 += h5 * (5 * r7);
    d2 += h6 * (5 * r6);
    d2 += h7 * (5 * r5);
    d2 += h8 * (5 * r4);
    d2 += h9 * (5 * r3);
    c += (d2 >>> 13); d2 &= 0x1fff;

    d3 = c;
    d3 += h0 * r3;
    d3 += h1 * r2;
    d3 += h2 * r1;
    d3 += h3 * r0;
    d3 += h4 * (5 * r9);
    c = (d3 >>> 13); d3 &= 0x1fff;
    d3 += h5 * (5 * r8);
    d3 += h6 * (5 * r7);
    d3 += h7 * (5 * r6);
    d3 += h8 * (5 * r5);
    d3 += h9 * (5 * r4);
    c += (d3 >>> 13); d3 &= 0x1fff;

    d4 = c;
    d4 += h0 * r4;
    d4 += h1 * r3;
    d4 += h2 * r2;
    d4 += h3 * r1;
    d4 += h4 * r0;
    c = (d4 >>> 13); d4 &= 0x1fff;
    d4 += h5 * (5 * r9);
    d4 += h6 * (5 * r8);
    d4 += h7 * (5 * r7);
    d4 += h8 * (5 * r6);
    d4 += h9 * (5 * r5);
    c += (d4 >>> 13); d4 &= 0x1fff;

    d5 = c;
    d5 += h0 * r5;
    d5 += h1 * r4;
    d5 += h2 * r3;
    d5 += h3 * r2;
    d5 += h4 * r1;
    c = (d5 >>> 13); d5 &= 0x1fff;
    d5 += h5 * r0;
    d5 += h6 * (5 * r9);
    d5 += h7 * (5 * r8);
    d5 += h8 * (5 * r7);
    d5 += h9 * (5 * r6);
    c += (d5 >>> 13); d5 &= 0x1fff;

    d6 = c;
    d6 += h0 * r6;
    d6 += h1 * r5;
    d6 += h2 * r4;
    d6 += h3 * r3;
    d6 += h4 * r2;
    c = (d6 >>> 13); d6 &= 0x1fff;
    d6 += h5 * r1;
    d6 += h6 * r0;
    d6 += h7 * (5 * r9);
    d6 += h8 * (5 * r8);
    d6 += h9 * (5 * r7);
    c += (d6 >>> 13); d6 &= 0x1fff;

    d7 = c;
    d7 += h0 * r7;
    d7 += h1 * r6;
    d7 += h2 * r5;
    d7 += h3 * r4;
    d7 += h4 * r3;
    c = (d7 >>> 13); d7 &= 0x1fff;
    d7 += h5 * r2;
    d7 += h6 * r1;
    d7 += h7 * r0;
    d7 += h8 * (5 * r9);
    d7 += h9 * (5 * r8);
    c += (d7 >>> 13); d7 &= 0x1fff;

    d8 = c;
    d8 += h0 * r8;
    d8 += h1 * r7;
    d8 += h2 * r6;
    d8 += h3 * r5;
    d8 += h4 * r4;
    c = (d8 >>> 13); d8 &= 0x1fff;
    d8 += h5 * r3;
    d8 += h6 * r2;
    d8 += h7 * r1;
    d8 += h8 * r0;
    d8 += h9 * (5 * r9);
    c += (d8 >>> 13); d8 &= 0x1fff;

    d9 = c;
    d9 += h0 * r9;
    d9 += h1 * r8;
    d9 += h2 * r7;
    d9 += h3 * r6;
    d9 += h4 * r5;
    c = (d9 >>> 13); d9 &= 0x1fff;
    d9 += h5 * r4;
    d9 += h6 * r3;
    d9 += h7 * r2;
    d9 += h8 * r1;
    d9 += h9 * r0;
    c += (d9 >>> 13); d9 &= 0x1fff;

    c = (((c << 2) + c)) | 0;
    c = (c + d0) | 0;
    d0 = c & 0x1fff;
    c = (c >>> 13);
    d1 += c;

    h0 = d0;
    h1 = d1;
    h2 = d2;
    h3 = d3;
    h4 = d4;
    h5 = d5;
    h6 = d6;
    h7 = d7;
    h8 = d8;
    h9 = d9;

    mpos += 16;
    bytes -= 16;
  }
  this.h[0] = h0;
  this.h[1] = h1;
  this.h[2] = h2;
  this.h[3] = h3;
  this.h[4] = h4;
  this.h[5] = h5;
  this.h[6] = h6;
  this.h[7] = h7;
  this.h[8] = h8;
  this.h[9] = h9;
};

poly1305.prototype.finish = function(mac, macpos) {
  var g = new Uint16Array(10);
  var c, mask, f, i;

  if (this.leftover) {
    i = this.leftover;
    this.buffer[i++] = 1;
    for (; i < 16; i++) this.buffer[i] = 0;
    this.fin = 1;
    this.blocks(this.buffer, 0, 16);
  }

  c = this.h[1] >>> 13;
  this.h[1] &= 0x1fff;
  for (i = 2; i < 10; i++) {
    this.h[i] += c;
    c = this.h[i] >>> 13;
    this.h[i] &= 0x1fff;
  }
  this.h[0] += (c * 5);
  c = this.h[0] >>> 13;
  this.h[0] &= 0x1fff;
  this.h[1] += c;
  c = this.h[1] >>> 13;
  this.h[1] &= 0x1fff;
  this.h[2] += c;

  g[0] = this.h[0] + 5;
  c = g[0] >>> 13;
  g[0] &= 0x1fff;
  for (i = 1; i < 10; i++) {
    g[i] = this.h[i] + c;
    c = g[i] >>> 13;
    g[i] &= 0x1fff;
  }
  g[9] -= (1 << 13);

  mask = (c ^ 1) - 1;
  for (i = 0; i < 10; i++) g[i] &= mask;
  mask = ~mask;
  for (i = 0; i < 10; i++) this.h[i] = (this.h[i] & mask) | g[i];

  this.h[0] = ((this.h[0]       ) | (this.h[1] << 13)                    ) & 0xffff;
  this.h[1] = ((this.h[1] >>>  3) | (this.h[2] << 10)                    ) & 0xffff;
  this.h[2] = ((this.h[2] >>>  6) | (this.h[3] <<  7)                    ) & 0xffff;
  this.h[3] = ((this.h[3] >>>  9) | (this.h[4] <<  4)                    ) & 0xffff;
  this.h[4] = ((this.h[4] >>> 12) | (this.h[5] <<  1) | (this.h[6] << 14)) & 0xffff;
  this.h[5] = ((this.h[6] >>>  2) | (this.h[7] << 11)                    ) & 0xffff;
  this.h[6] = ((this.h[7] >>>  5) | (this.h[8] <<  8)                    ) & 0xffff;
  this.h[7] = ((this.h[8] >>>  8) | (this.h[9] <<  5)                    ) & 0xffff;

  f = this.h[0] + this.pad[0];
  this.h[0] = f & 0xffff;
  for (i = 1; i < 8; i++) {
    f = (((this.h[i] + this.pad[i]) | 0) + (f >>> 16)) | 0;
    this.h[i] = f & 0xffff;
  }

  mac[macpos+ 0] = (this.h[0] >>> 0) & 0xff;
  mac[macpos+ 1] = (this.h[0] >>> 8) & 0xff;
  mac[macpos+ 2] = (this.h[1] >>> 0) & 0xff;
  mac[macpos+ 3] = (this.h[1] >>> 8) & 0xff;
  mac[macpos+ 4] = (this.h[2] >>> 0) & 0xff;
  mac[macpos+ 5] = (this.h[2] >>> 8) & 0xff;
  mac[macpos+ 6] = (this.h[3] >>> 0) & 0xff;
  mac[macpos+ 7] = (this.h[3] >>> 8) & 0xff;
  mac[macpos+ 8] = (this.h[4] >>> 0) & 0xff;
  mac[macpos+ 9] = (this.h[4] >>> 8) & 0xff;
  mac[macpos+10] = (this.h[5] >>> 0) & 0xff;
  mac[macpos+11] = (this.h[5] >>> 8) & 0xff;
  mac[macpos+12] = (this.h[6] >>> 0) & 0xff;
  mac[macpos+13] = (this.h[6] >>> 8) & 0xff;
  mac[macpos+14] = (this.h[7] >>> 0) & 0xff;
  mac[macpos+15] = (this.h[7] >>> 8) & 0xff;
};

poly1305.prototype.update = function(m, mpos, bytes) {
  var i, want;

  if (this.leftover) {
    want = (16 - this.leftover);
    if (want > bytes)
      want = bytes;
    for (i = 0; i < want; i++)
      this.buffer[this.leftover + i] = m[mpos+i];
    bytes -= want;
    mpos += want;
    this.leftover += want;
    if (this.leftover < 16)
      return;
    this.blocks(this.buffer, 0, 16);
    this.leftover = 0;
  }

  if (bytes >= 16) {
    want = bytes - (bytes % 16);
    this.blocks(m, mpos, want);
    mpos += want;
    bytes -= want;
  }

  if (bytes) {
    for (i = 0; i < bytes; i++)
      this.buffer[this.leftover + i] = m[mpos+i];
    this.leftover += bytes;
  }
};

function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
  var s = new poly1305(k);
  s.update(m, mpos, n);
  s.finish(out, outpos);
  return 0;
}

function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
  var x = new Uint8Array(16);
  crypto_onetimeauth(x,0,m,mpos,n,k);
  return crypto_verify_16(h,hpos,x,0);
}

function crypto_secretbox(c,m,d,n,k) {
  var i;
  if (d < 32) return -1;
  crypto_stream_xor(c,0,m,0,d,n,k);
  crypto_onetimeauth(c, 16, c, 32, d - 32, c);
  for (i = 0; i < 16; i++) c[i] = 0;
  return 0;
}

function crypto_secretbox_open(m,c,d,n,k) {
  var i;
  var x = new Uint8Array(32);
  if (d < 32) return -1;
  crypto_stream(x,0,32,n,k);
  if (crypto_onetimeauth_verify(c, 16,c, 32,d - 32,x) !== 0) return -1;
  crypto_stream_xor(m,0,c,0,d,n,k);
  for (i = 0; i < 32; i++) m[i] = 0;
  return 0;
}

function set25519(r, a) {
  var i;
  for (i = 0; i < 16; i++) r[i] = a[i]|0;
}

function car25519(o) {
  var i, v, c = 1;
  for (i = 0; i < 16; i++) {
    v = o[i] + c + 65535;
    c = Math.floor(v / 65536);
    o[i] = v - c * 65536;
  }
  o[0] += c-1 + 37 * (c-1);
}

function sel25519(p, q, b) {
  var t, c = ~(b-1);
  for (var i = 0; i < 16; i++) {
    t = c & (p[i] ^ q[i]);
    p[i] ^= t;
    q[i] ^= t;
  }
}

function pack25519(o, n) {
  var i, j, b;
  var m = gf(), t = gf();
  for (i = 0; i < 16; i++) t[i] = n[i];
  car25519(t);
  car25519(t);
  car25519(t);
  for (j = 0; j < 2; j++) {
    m[0] = t[0] - 0xffed;
    for (i = 1; i < 15; i++) {
      m[i] = t[i] - 0xffff - ((m[i-1]>>16) & 1);
      m[i-1] &= 0xffff;
    }
    m[15] = t[15] - 0x7fff - ((m[14]>>16) & 1);
    b = (m[15]>>16) & 1;
    m[14] &= 0xffff;
    sel25519(t, m, 1-b);
  }
  for (i = 0; i < 16; i++) {
    o[2*i] = t[i] & 0xff;
    o[2*i+1] = t[i]>>8;
  }
}

function neq25519(a, b) {
  var c = new Uint8Array(32), d = new Uint8Array(32);
  pack25519(c, a);
  pack25519(d, b);
  return crypto_verify_32(c, 0, d, 0);
}

function par25519(a) {
  var d = new Uint8Array(32);
  pack25519(d, a);
  return d[0] & 1;
}

function unpack25519(o, n) {
  var i;
  for (i = 0; i < 16; i++) o[i] = n[2*i] + (n[2*i+1] << 8);
  o[15] &= 0x7fff;
}

function A(o, a, b) {
  for (var i = 0; i < 16; i++) o[i] = a[i] + b[i];
}

function Z(o, a, b) {
  for (var i = 0; i < 16; i++) o[i] = a[i] - b[i];
}

function M(o, a, b) {
  var v, c,
     t0 = 0,  t1 = 0,  t2 = 0,  t3 = 0,  t4 = 0,  t5 = 0,  t6 = 0,  t7 = 0,
     t8 = 0,  t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0,
    t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0,
    t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0,
    b0 = b[0],
    b1 = b[1],
    b2 = b[2],
    b3 = b[3],
    b4 = b[4],
    b5 = b[5],
    b6 = b[6],
    b7 = b[7],
    b8 = b[8],
    b9 = b[9],
    b10 = b[10],
    b11 = b[11],
    b12 = b[12],
    b13 = b[13],
    b14 = b[14],
    b15 = b[15];

  v = a[0];
  t0 += v * b0;
  t1 += v * b1;
  t2 += v * b2;
  t3 += v * b3;
  t4 += v * b4;
  t5 += v * b5;
  t6 += v * b6;
  t7 += v * b7;
  t8 += v * b8;
  t9 += v * b9;
  t10 += v * b10;
  t11 += v * b11;
  t12 += v * b12;
  t13 += v * b13;
  t14 += v * b14;
  t15 += v * b15;
  v = a[1];
  t1 += v * b0;
  t2 += v * b1;
  t3 += v * b2;
  t4 += v * b3;
  t5 += v * b4;
  t6 += v * b5;
  t7 += v * b6;
  t8 += v * b7;
  t9 += v * b8;
  t10 += v * b9;
  t11 += v * b10;
  t12 += v * b11;
  t13 += v * b12;
  t14 += v * b13;
  t15 += v * b14;
  t16 += v * b15;
  v = a[2];
  t2 += v * b0;
  t3 += v * b1;
  t4 += v * b2;
  t5 += v * b3;
  t6 += v * b4;
  t7 += v * b5;
  t8 += v * b6;
  t9 += v * b7;
  t10 += v * b8;
  t11 += v * b9;
  t12 += v * b10;
  t13 += v * b11;
  t14 += v * b12;
  t15 += v * b13;
  t16 += v * b14;
  t17 += v * b15;
  v = a[3];
  t3 += v * b0;
  t4 += v * b1;
  t5 += v * b2;
  t6 += v * b3;
  t7 += v * b4;
  t8 += v * b5;
  t9 += v * b6;
  t10 += v * b7;
  t11 += v * b8;
  t12 += v * b9;
  t13 += v * b10;
  t14 += v * b11;
  t15 += v * b12;
  t16 += v * b13;
  t17 += v * b14;
  t18 += v * b15;
  v = a[4];
  t4 += v * b0;
  t5 += v * b1;
  t6 += v * b2;
  t7 += v * b3;
  t8 += v * b4;
  t9 += v * b5;
  t10 += v * b6;
  t11 += v * b7;
  t12 += v * b8;
  t13 += v * b9;
  t14 += v * b10;
  t15 += v * b11;
  t16 += v * b12;
  t17 += v * b13;
  t18 += v * b14;
  t19 += v * b15;
  v = a[5];
  t5 += v * b0;
  t6 += v * b1;
  t7 += v * b2;
  t8 += v * b3;
  t9 += v * b4;
  t10 += v * b5;
  t11 += v * b6;
  t12 += v * b7;
  t13 += v * b8;
  t14 += v * b9;
  t15 += v * b10;
  t16 += v * b11;
  t17 += v * b12;
  t18 += v * b13;
  t19 += v * b14;
  t20 += v * b15;
  v = a[6];
  t6 += v * b0;
  t7 += v * b1;
  t8 += v * b2;
  t9 += v * b3;
  t10 += v * b4;
  t11 += v * b5;
  t12 += v * b6;
  t13 += v * b7;
  t14 += v * b8;
  t15 += v * b9;
  t16 += v * b10;
  t17 += v * b11;
  t18 += v * b12;
  t19 += v * b13;
  t20 += v * b14;
  t21 += v * b15;
  v = a[7];
  t7 += v * b0;
  t8 += v * b1;
  t9 += v * b2;
  t10 += v * b3;
  t11 += v * b4;
  t12 += v * b5;
  t13 += v * b6;
  t14 += v * b7;
  t15 += v * b8;
  t16 += v * b9;
  t17 += v * b10;
  t18 += v * b11;
  t19 += v * b12;
  t20 += v * b13;
  t21 += v * b14;
  t22 += v * b15;
  v = a[8];
  t8 += v * b0;
  t9 += v * b1;
  t10 += v * b2;
  t11 += v * b3;
  t12 += v * b4;
  t13 += v * b5;
  t14 += v * b6;
  t15 += v * b7;
  t16 += v * b8;
  t17 += v * b9;
  t18 += v * b10;
  t19 += v * b11;
  t20 += v * b12;
  t21 += v * b13;
  t22 += v * b14;
  t23 += v * b15;
  v = a[9];
  t9 += v * b0;
  t10 += v * b1;
  t11 += v * b2;
  t12 += v * b3;
  t13 += v * b4;
  t14 += v * b5;
  t15 += v * b6;
  t16 += v * b7;
  t17 += v * b8;
  t18 += v * b9;
  t19 += v * b10;
  t20 += v * b11;
  t21 += v * b12;
  t22 += v * b13;
  t23 += v * b14;
  t24 += v * b15;
  v = a[10];
  t10 += v * b0;
  t11 += v * b1;
  t12 += v * b2;
  t13 += v * b3;
  t14 += v * b4;
  t15 += v * b5;
  t16 += v * b6;
  t17 += v * b7;
  t18 += v * b8;
  t19 += v * b9;
  t20 += v * b10;
  t21 += v * b11;
  t22 += v * b12;
  t23 += v * b13;
  t24 += v * b14;
  t25 += v * b15;
  v = a[11];
  t11 += v * b0;
  t12 += v * b1;
  t13 += v * b2;
  t14 += v * b3;
  t15 += v * b4;
  t16 += v * b5;
  t17 += v * b6;
  t18 += v * b7;
  t19 += v * b8;
  t20 += v * b9;
  t21 += v * b10;
  t22 += v * b11;
  t23 += v * b12;
  t24 += v * b13;
  t25 += v * b14;
  t26 += v * b15;
  v = a[12];
  t12 += v * b0;
  t13 += v * b1;
  t14 += v * b2;
  t15 += v * b3;
  t16 += v * b4;
  t17 += v * b5;
  t18 += v * b6;
  t19 += v * b7;
  t20 += v * b8;
  t21 += v * b9;
  t22 += v * b10;
  t23 += v * b11;
  t24 += v * b12;
  t25 += v * b13;
  t26 += v * b14;
  t27 += v * b15;
  v = a[13];
  t13 += v * b0;
  t14 += v * b1;
  t15 += v * b2;
  t16 += v * b3;
  t17 += v * b4;
  t18 += v * b5;
  t19 += v * b6;
  t20 += v * b7;
  t21 += v * b8;
  t22 += v * b9;
  t23 += v * b10;
  t24 += v * b11;
  t25 += v * b12;
  t26 += v * b13;
  t27 += v * b14;
  t28 += v * b15;
  v = a[14];
  t14 += v * b0;
  t15 += v * b1;
  t16 += v * b2;
  t17 += v * b3;
  t18 += v * b4;
  t19 += v * b5;
  t20 += v * b6;
  t21 += v * b7;
  t22 += v * b8;
  t23 += v * b9;
  t24 += v * b10;
  t25 += v * b11;
  t26 += v * b12;
  t27 += v * b13;
  t28 += v * b14;
  t29 += v * b15;
  v = a[15];
  t15 += v * b0;
  t16 += v * b1;
  t17 += v * b2;
  t18 += v * b3;
  t19 += v * b4;
  t20 += v * b5;
  t21 += v * b6;
  t22 += v * b7;
  t23 += v * b8;
  t24 += v * b9;
  t25 += v * b10;
  t26 += v * b11;
  t27 += v * b12;
  t28 += v * b13;
  t29 += v * b14;
  t30 += v * b15;

  t0  += 38 * t16;
  t1  += 38 * t17;
  t2  += 38 * t18;
  t3  += 38 * t19;
  t4  += 38 * t20;
  t5  += 38 * t21;
  t6  += 38 * t22;
  t7  += 38 * t23;
  t8  += 38 * t24;
  t9  += 38 * t25;
  t10 += 38 * t26;
  t11 += 38 * t27;
  t12 += 38 * t28;
  t13 += 38 * t29;
  t14 += 38 * t30;
  // t15 left as is

  // first car
  c = 1;
  v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
  v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
  v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
  v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
  v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
  v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
  v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
  v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
  v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
  v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
  v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
  v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
  v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
  v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
  v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
  v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
  t0 += c-1 + 37 * (c-1);

  // second car
  c = 1;
  v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
  v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
  v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
  v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
  v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
  v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
  v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
  v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
  v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
  v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
  v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
  v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
  v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
  v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
  v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
  v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
  t0 += c-1 + 37 * (c-1);

  o[ 0] = t0;
  o[ 1] = t1;
  o[ 2] = t2;
  o[ 3] = t3;
  o[ 4] = t4;
  o[ 5] = t5;
  o[ 6] = t6;
  o[ 7] = t7;
  o[ 8] = t8;
  o[ 9] = t9;
  o[10] = t10;
  o[11] = t11;
  o[12] = t12;
  o[13] = t13;
  o[14] = t14;
  o[15] = t15;
}

function S(o, a) {
  M(o, a, a);
}

function inv25519(o, i) {
  var c = gf();
  var a;
  for (a = 0; a < 16; a++) c[a] = i[a];
  for (a = 253; a >= 0; a--) {
    S(c, c);
    if(a !== 2 && a !== 4) M(c, c, i);
  }
  for (a = 0; a < 16; a++) o[a] = c[a];
}

function pow2523(o, i) {
  var c = gf();
  var a;
  for (a = 0; a < 16; a++) c[a] = i[a];
  for (a = 250; a >= 0; a--) {
      S(c, c);
      if(a !== 1) M(c, c, i);
  }
  for (a = 0; a < 16; a++) o[a] = c[a];
}

function crypto_scalarmult(q, n, p) {
  var z = new Uint8Array(32);
  var x = new Float64Array(80), r, i;
  var a = gf(), b = gf(), c = gf(),
      d = gf(), e = gf(), f = gf();
  for (i = 0; i < 31; i++) z[i] = n[i];
  z[31]=(n[31]&127)|64;
  z[0]&=248;
  unpack25519(x,p);
  for (i = 0; i < 16; i++) {
    b[i]=x[i];
    d[i]=a[i]=c[i]=0;
  }
  a[0]=d[0]=1;
  for (i=254; i>=0; --i) {
    r=(z[i>>>3]>>>(i&7))&1;
    sel25519(a,b,r);
    sel25519(c,d,r);
    A(e,a,c);
    Z(a,a,c);
    A(c,b,d);
    Z(b,b,d);
    S(d,e);
    S(f,a);
    M(a,c,a);
    M(c,b,e);
    A(e,a,c);
    Z(a,a,c);
    S(b,a);
    Z(c,d,f);
    M(a,c,_121665);
    A(a,a,d);
    M(c,c,a);
    M(a,d,f);
    M(d,b,x);
    S(b,e);
    sel25519(a,b,r);
    sel25519(c,d,r);
  }
  for (i = 0; i < 16; i++) {
    x[i+16]=a[i];
    x[i+32]=c[i];
    x[i+48]=b[i];
    x[i+64]=d[i];
  }
  var x32 = x.subarray(32);
  var x16 = x.subarray(16);
  inv25519(x32,x32);
  M(x16,x16,x32);
  pack25519(q,x16);
  return 0;
}

function crypto_scalarmult_base(q, n) {
  return crypto_scalarmult(q, n, _9);
}

function crypto_box_keypair(y, x) {
  randombytes(x, 32);
  return crypto_scalarmult_base(y, x);
}

function crypto_box_beforenm(k, y, x) {
  var s = new Uint8Array(32);
  crypto_scalarmult(s, x, y);
  return crypto_core_hsalsa20(k, _0, s, sigma);
}

var crypto_box_afternm = crypto_secretbox;
var crypto_box_open_afternm = crypto_secretbox_open;

function crypto_box(c, m, d, n, y, x) {
  var k = new Uint8Array(32);
  crypto_box_beforenm(k, y, x);
  return crypto_box_afternm(c, m, d, n, k);
}

function crypto_box_open(m, c, d, n, y, x) {
  var k = new Uint8Array(32);
  crypto_box_beforenm(k, y, x);
  return crypto_box_open_afternm(m, c, d, n, k);
}

var K = [
  0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
  0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
  0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
  0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
  0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
  0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
  0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
  0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
  0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
  0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
  0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
  0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
  0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
  0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
  0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
  0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
  0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
  0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
  0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
  0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
  0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
  0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
  0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
  0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
  0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
  0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
  0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
  0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
  0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
  0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
  0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
  0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
  0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
  0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
  0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
  0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
  0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
  0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
  0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
  0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
];

function crypto_hashblocks_hl(hh, hl, m, n) {
  var wh = new Int32Array(16), wl = new Int32Array(16),
      bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7,
      bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7,
      th, tl, i, j, h, l, a, b, c, d;

  var ah0 = hh[0],
      ah1 = hh[1],
      ah2 = hh[2],
      ah3 = hh[3],
      ah4 = hh[4],
      ah5 = hh[5],
      ah6 = hh[6],
      ah7 = hh[7],

      al0 = hl[0],
      al1 = hl[1],
      al2 = hl[2],
      al3 = hl[3],
      al4 = hl[4],
      al5 = hl[5],
      al6 = hl[6],
      al7 = hl[7];

  var pos = 0;
  while (n >= 128) {
    for (i = 0; i < 16; i++) {
      j = 8 * i + pos;
      wh[i] = (m[j+0] << 24) | (m[j+1] << 16) | (m[j+2] << 8) | m[j+3];
      wl[i] = (m[j+4] << 24) | (m[j+5] << 16) | (m[j+6] << 8) | m[j+7];
    }
    for (i = 0; i < 80; i++) {
      bh0 = ah0;
      bh1 = ah1;
      bh2 = ah2;
      bh3 = ah3;
      bh4 = ah4;
      bh5 = ah5;
      bh6 = ah6;
      bh7 = ah7;

      bl0 = al0;
      bl1 = al1;
      bl2 = al2;
      bl3 = al3;
      bl4 = al4;
      bl5 = al5;
      bl6 = al6;
      bl7 = al7;

      // add
      h = ah7;
      l = al7;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      // Sigma1
      h = ((ah4 >>> 14) | (al4 << (32-14))) ^ ((ah4 >>> 18) | (al4 << (32-18))) ^ ((al4 >>> (41-32)) | (ah4 << (32-(41-32))));
      l = ((al4 >>> 14) | (ah4 << (32-14))) ^ ((al4 >>> 18) | (ah4 << (32-18))) ^ ((ah4 >>> (41-32)) | (al4 << (32-(41-32))));

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // Ch
      h = (ah4 & ah5) ^ (~ah4 & ah6);
      l = (al4 & al5) ^ (~al4 & al6);

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // K
      h = K[i*2];
      l = K[i*2+1];

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // w
      h = wh[i%16];
      l = wl[i%16];

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      th = c & 0xffff | d << 16;
      tl = a & 0xffff | b << 16;

      // add
      h = th;
      l = tl;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      // Sigma0
      h = ((ah0 >>> 28) | (al0 << (32-28))) ^ ((al0 >>> (34-32)) | (ah0 << (32-(34-32)))) ^ ((al0 >>> (39-32)) | (ah0 << (32-(39-32))));
      l = ((al0 >>> 28) | (ah0 << (32-28))) ^ ((ah0 >>> (34-32)) | (al0 << (32-(34-32)))) ^ ((ah0 >>> (39-32)) | (al0 << (32-(39-32))));

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // Maj
      h = (ah0 & ah1) ^ (ah0 & ah2) ^ (ah1 & ah2);
      l = (al0 & al1) ^ (al0 & al2) ^ (al1 & al2);

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      bh7 = (c & 0xffff) | (d << 16);
      bl7 = (a & 0xffff) | (b << 16);

      // add
      h = bh3;
      l = bl3;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      h = th;
      l = tl;

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      bh3 = (c & 0xffff) | (d << 16);
      bl3 = (a & 0xffff) | (b << 16);

      ah1 = bh0;
      ah2 = bh1;
      ah3 = bh2;
      ah4 = bh3;
      ah5 = bh4;
      ah6 = bh5;
      ah7 = bh6;
      ah0 = bh7;

      al1 = bl0;
      al2 = bl1;
      al3 = bl2;
      al4 = bl3;
      al5 = bl4;
      al6 = bl5;
      al7 = bl6;
      al0 = bl7;

      if (i%16 === 15) {
        for (j = 0; j < 16; j++) {
          // add
          h = wh[j];
          l = wl[j];

          a = l & 0xffff; b = l >>> 16;
          c = h & 0xffff; d = h >>> 16;

          h = wh[(j+9)%16];
          l = wl[(j+9)%16];

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // sigma0
          th = wh[(j+1)%16];
          tl = wl[(j+1)%16];
          h = ((th >>> 1) | (tl << (32-1))) ^ ((th >>> 8) | (tl << (32-8))) ^ (th >>> 7);
          l = ((tl >>> 1) | (th << (32-1))) ^ ((tl >>> 8) | (th << (32-8))) ^ ((tl >>> 7) | (th << (32-7)));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // sigma1
          th = wh[(j+14)%16];
          tl = wl[(j+14)%16];
          h = ((th >>> 19) | (tl << (32-19))) ^ ((tl >>> (61-32)) | (th << (32-(61-32)))) ^ (th >>> 6);
          l = ((tl >>> 19) | (th << (32-19))) ^ ((th >>> (61-32)) | (tl << (32-(61-32)))) ^ ((tl >>> 6) | (th << (32-6)));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;

          wh[j] = (c & 0xffff) | (d << 16);
          wl[j] = (a & 0xffff) | (b << 16);
        }
      }
    }

    // add
    h = ah0;
    l = al0;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[0];
    l = hl[0];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[0] = ah0 = (c & 0xffff) | (d << 16);
    hl[0] = al0 = (a & 0xffff) | (b << 16);

    h = ah1;
    l = al1;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[1];
    l = hl[1];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[1] = ah1 = (c & 0xffff) | (d << 16);
    hl[1] = al1 = (a & 0xffff) | (b << 16);

    h = ah2;
    l = al2;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[2];
    l = hl[2];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[2] = ah2 = (c & 0xffff) | (d << 16);
    hl[2] = al2 = (a & 0xffff) | (b << 16);

    h = ah3;
    l = al3;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[3];
    l = hl[3];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[3] = ah3 = (c & 0xffff) | (d << 16);
    hl[3] = al3 = (a & 0xffff) | (b << 16);

    h = ah4;
    l = al4;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[4];
    l = hl[4];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[4] = ah4 = (c & 0xffff) | (d << 16);
    hl[4] = al4 = (a & 0xffff) | (b << 16);

    h = ah5;
    l = al5;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[5];
    l = hl[5];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[5] = ah5 = (c & 0xffff) | (d << 16);
    hl[5] = al5 = (a & 0xffff) | (b << 16);

    h = ah6;
    l = al6;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[6];
    l = hl[6];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[6] = ah6 = (c & 0xffff) | (d << 16);
    hl[6] = al6 = (a & 0xffff) | (b << 16);

    h = ah7;
    l = al7;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[7];
    l = hl[7];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[7] = ah7 = (c & 0xffff) | (d << 16);
    hl[7] = al7 = (a & 0xffff) | (b << 16);

    pos += 128;
    n -= 128;
  }

  return n;
}

function crypto_hash(out, m, n) {
  var hh = new Int32Array(8),
      hl = new Int32Array(8),
      x = new Uint8Array(256),
      i, b = n;

  hh[0] = 0x6a09e667;
  hh[1] = 0xbb67ae85;
  hh[2] = 0x3c6ef372;
  hh[3] = 0xa54ff53a;
  hh[4] = 0x510e527f;
  hh[5] = 0x9b05688c;
  hh[6] = 0x1f83d9ab;
  hh[7] = 0x5be0cd19;

  hl[0] = 0xf3bcc908;
  hl[1] = 0x84caa73b;
  hl[2] = 0xfe94f82b;
  hl[3] = 0x5f1d36f1;
  hl[4] = 0xade682d1;
  hl[5] = 0x2b3e6c1f;
  hl[6] = 0xfb41bd6b;
  hl[7] = 0x137e2179;

  crypto_hashblocks_hl(hh, hl, m, n);
  n %= 128;

  for (i = 0; i < n; i++) x[i] = m[b-n+i];
  x[n] = 128;

  n = 256-128*(n<112?1:0);
  x[n-9] = 0;
  ts64(x, n-8,  (b / 0x20000000) | 0, b << 3);
  crypto_hashblocks_hl(hh, hl, x, n);

  for (i = 0; i < 8; i++) ts64(out, 8*i, hh[i], hl[i]);

  return 0;
}

function add(p, q) {
  var a = gf(), b = gf(), c = gf(),
      d = gf(), e = gf(), f = gf(),
      g = gf(), h = gf(), t = gf();

  Z(a, p[1], p[0]);
  Z(t, q[1], q[0]);
  M(a, a, t);
  A(b, p[0], p[1]);
  A(t, q[0], q[1]);
  M(b, b, t);
  M(c, p[3], q[3]);
  M(c, c, D2);
  M(d, p[2], q[2]);
  A(d, d, d);
  Z(e, b, a);
  Z(f, d, c);
  A(g, d, c);
  A(h, b, a);

  M(p[0], e, f);
  M(p[1], h, g);
  M(p[2], g, f);
  M(p[3], e, h);
}

function cswap(p, q, b) {
  var i;
  for (i = 0; i < 4; i++) {
    sel25519(p[i], q[i], b);
  }
}

function pack(r, p) {
  var tx = gf(), ty = gf(), zi = gf();
  inv25519(zi, p[2]);
  M(tx, p[0], zi);
  M(ty, p[1], zi);
  pack25519(r, ty);
  r[31] ^= par25519(tx) << 7;
}

function scalarmult(p, q, s) {
  var b, i;
  set25519(p[0], gf0);
  set25519(p[1], gf1);
  set25519(p[2], gf1);
  set25519(p[3], gf0);
  for (i = 255; i >= 0; --i) {
    b = (s[(i/8)|0] >> (i&7)) & 1;
    cswap(p, q, b);
    add(q, p);
    add(p, p);
    cswap(p, q, b);
  }
}

function scalarbase(p, s) {
  var q = [gf(), gf(), gf(), gf()];
  set25519(q[0], X);
  set25519(q[1], Y);
  set25519(q[2], gf1);
  M(q[3], X, Y);
  scalarmult(p, q, s);
}

function crypto_sign_keypair(pk, sk, seeded) {
  var d = new Uint8Array(64);
  var p = [gf(), gf(), gf(), gf()];
  var i;

  if (!seeded) randombytes(sk, 32);
  crypto_hash(d, sk, 32);
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;

  scalarbase(p, d);
  pack(pk, p);

  for (i = 0; i < 32; i++) sk[i+32] = pk[i];
  return 0;
}

var L = new Float64Array([0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10]);

function modL(r, x) {
  var carry, i, j, k;
  for (i = 63; i >= 32; --i) {
    carry = 0;
    for (j = i - 32, k = i - 12; j < k; ++j) {
      x[j] += carry - 16 * x[i] * L[j - (i - 32)];
      carry = (x[j] + 128) >> 8;
      x[j] -= carry * 256;
    }
    x[j] += carry;
    x[i] = 0;
  }
  carry = 0;
  for (j = 0; j < 32; j++) {
    x[j] += carry - (x[31] >> 4) * L[j];
    carry = x[j] >> 8;
    x[j] &= 255;
  }
  for (j = 0; j < 32; j++) x[j] -= carry * L[j];
  for (i = 0; i < 32; i++) {
    x[i+1] += x[i] >> 8;
    r[i] = x[i] & 255;
  }
}

function reduce(r) {
  var x = new Float64Array(64), i;
  for (i = 0; i < 64; i++) x[i] = r[i];
  for (i = 0; i < 64; i++) r[i] = 0;
  modL(r, x);
}

// Note: difference from C - smlen returned, not passed as argument.
function crypto_sign(sm, m, n, sk) {
  var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
  var i, j, x = new Float64Array(64);
  var p = [gf(), gf(), gf(), gf()];

  crypto_hash(d, sk, 32);
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;

  var smlen = n + 64;
  for (i = 0; i < n; i++) sm[64 + i] = m[i];
  for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];

  crypto_hash(r, sm.subarray(32), n+32);
  reduce(r);
  scalarbase(p, r);
  pack(sm, p);

  for (i = 32; i < 64; i++) sm[i] = sk[i];
  crypto_hash(h, sm, n + 64);
  reduce(h);

  for (i = 0; i < 64; i++) x[i] = 0;
  for (i = 0; i < 32; i++) x[i] = r[i];
  for (i = 0; i < 32; i++) {
    for (j = 0; j < 32; j++) {
      x[i+j] += h[i] * d[j];
    }
  }

  modL(sm.subarray(32), x);
  return smlen;
}

function unpackneg(r, p) {
  var t = gf(), chk = gf(), num = gf(),
      den = gf(), den2 = gf(), den4 = gf(),
      den6 = gf();

  set25519(r[2], gf1);
  unpack25519(r[1], p);
  S(num, r[1]);
  M(den, num, D);
  Z(num, num, r[2]);
  A(den, r[2], den);

  S(den2, den);
  S(den4, den2);
  M(den6, den4, den2);
  M(t, den6, num);
  M(t, t, den);

  pow2523(t, t);
  M(t, t, num);
  M(t, t, den);
  M(t, t, den);
  M(r[0], t, den);

  S(chk, r[0]);
  M(chk, chk, den);
  if (neq25519(chk, num)) M(r[0], r[0], I);

  S(chk, r[0]);
  M(chk, chk, den);
  if (neq25519(chk, num)) return -1;

  if (par25519(r[0]) === (p[31]>>7)) Z(r[0], gf0, r[0]);

  M(r[3], r[0], r[1]);
  return 0;
}

function crypto_sign_open(m, sm, n, pk) {
  var i, mlen;
  var t = new Uint8Array(32), h = new Uint8Array(64);
  var p = [gf(), gf(), gf(), gf()],
      q = [gf(), gf(), gf(), gf()];

  mlen = -1;
  if (n < 64) return -1;

  if (unpackneg(q, pk)) return -1;

  for (i = 0; i < n; i++) m[i] = sm[i];
  for (i = 0; i < 32; i++) m[i+32] = pk[i];
  crypto_hash(h, m, n);
  reduce(h);
  scalarmult(p, q, h);

  scalarbase(q, sm.subarray(32));
  add(p, q);
  pack(t, p);

  n -= 64;
  if (crypto_verify_32(sm, 0, t, 0)) {
    for (i = 0; i < n; i++) m[i] = 0;
    return -1;
  }

  for (i = 0; i < n; i++) m[i] = sm[i + 64];
  mlen = n;
  return mlen;
}

var crypto_secretbox_KEYBYTES = 32,
    crypto_secretbox_NONCEBYTES = 24,
    crypto_secretbox_ZEROBYTES = 32,
    crypto_secretbox_BOXZEROBYTES = 16,
    crypto_scalarmult_BYTES = 32,
    crypto_scalarmult_SCALARBYTES = 32,
    crypto_box_PUBLICKEYBYTES = 32,
    crypto_box_SECRETKEYBYTES = 32,
    crypto_box_BEFORENMBYTES = 32,
    crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES,
    crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES,
    crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES,
    crypto_sign_BYTES = 64,
    crypto_sign_PUBLICKEYBYTES = 32,
    crypto_sign_SECRETKEYBYTES = 64,
    crypto_sign_SEEDBYTES = 32,
    crypto_hash_BYTES = 64;

nacl.lowlevel = {
  crypto_core_hsalsa20: crypto_core_hsalsa20,
  crypto_stream_xor: crypto_stream_xor,
  crypto_stream: crypto_stream,
  crypto_stream_salsa20_xor: crypto_stream_salsa20_xor,
  crypto_stream_salsa20: crypto_stream_salsa20,
  crypto_onetimeauth: crypto_onetimeauth,
  crypto_onetimeauth_verify: crypto_onetimeauth_verify,
  crypto_verify_16: crypto_verify_16,
  crypto_verify_32: crypto_verify_32,
  crypto_secretbox: crypto_secretbox,
  crypto_secretbox_open: crypto_secretbox_open,
  crypto_scalarmult: crypto_scalarmult,
  crypto_scalarmult_base: crypto_scalarmult_base,
  crypto_box_beforenm: crypto_box_beforenm,
  crypto_box_afternm: crypto_box_afternm,
  crypto_box: crypto_box,
  crypto_box_open: crypto_box_open,
  crypto_box_keypair: crypto_box_keypair,
  crypto_hash: crypto_hash,
  crypto_sign: crypto_sign,
  crypto_sign_keypair: crypto_sign_keypair,
  crypto_sign_open: crypto_sign_open,

  crypto_secretbox_KEYBYTES: crypto_secretbox_KEYBYTES,
  crypto_secretbox_NONCEBYTES: crypto_secretbox_NONCEBYTES,
  crypto_secretbox_ZEROBYTES: crypto_secretbox_ZEROBYTES,
  crypto_secretbox_BOXZEROBYTES: crypto_secretbox_BOXZEROBYTES,
  crypto_scalarmult_BYTES: crypto_scalarmult_BYTES,
  crypto_scalarmult_SCALARBYTES: crypto_scalarmult_SCALARBYTES,
  crypto_box_PUBLICKEYBYTES: crypto_box_PUBLICKEYBYTES,
  crypto_box_SECRETKEYBYTES: crypto_box_SECRETKEYBYTES,
  crypto_box_BEFORENMBYTES: crypto_box_BEFORENMBYTES,
  crypto_box_NONCEBYTES: crypto_box_NONCEBYTES,
  crypto_box_ZEROBYTES: crypto_box_ZEROBYTES,
  crypto_box_BOXZEROBYTES: crypto_box_BOXZEROBYTES,
  crypto_sign_BYTES: crypto_sign_BYTES,
  crypto_sign_PUBLICKEYBYTES: crypto_sign_PUBLICKEYBYTES,
  crypto_sign_SECRETKEYBYTES: crypto_sign_SECRETKEYBYTES,
  crypto_sign_SEEDBYTES: crypto_sign_SEEDBYTES,
  crypto_hash_BYTES: crypto_hash_BYTES
};

/* High-level API */

function checkLengths(k, n) {
  if (k.length !== crypto_secretbox_KEYBYTES) throw new Error('bad key size');
  if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error('bad nonce size');
}

function checkBoxLengths(pk, sk) {
  if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error('bad public key size');
  if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error('bad secret key size');
}

function checkArrayTypes() {
  var t, i;
  for (i = 0; i < arguments.length; i++) {
     if ((t = Object.prototype.toString.call(arguments[i])) !== '[object Uint8Array]')
       throw new TypeError('unexpected type ' + t + ', use Uint8Array');
  }
}

function cleanup(arr) {
  for (var i = 0; i < arr.length; i++) arr[i] = 0;
}

// TODO: Completely remove this in v0.15.
if (!nacl.util) {
  nacl.util = {};
  nacl.util.decodeUTF8 = nacl.util.encodeUTF8 = nacl.util.encodeBase64 = nacl.util.decodeBase64 = function() {
    throw new Error('nacl.util moved into separate package: https://github.com/dchest/tweetnacl-util-js');
  };
}

nacl.randomBytes = function(n) {
  var b = new Uint8Array(n);
  randombytes(b, n);
  return b;
};

nacl.secretbox = function(msg, nonce, key) {
  checkArrayTypes(msg, nonce, key);
  checkLengths(key, nonce);
  var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
  var c = new Uint8Array(m.length);
  for (var i = 0; i < msg.length; i++) m[i+crypto_secretbox_ZEROBYTES] = msg[i];
  crypto_secretbox(c, m, m.length, nonce, key);
  return c.subarray(crypto_secretbox_BOXZEROBYTES);
};

nacl.secretbox.open = function(box, nonce, key) {
  checkArrayTypes(box, nonce, key);
  checkLengths(key, nonce);
  var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
  var m = new Uint8Array(c.length);
  for (var i = 0; i < box.length; i++) c[i+crypto_secretbox_BOXZEROBYTES] = box[i];
  if (c.length < 32) return false;
  if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0) return false;
  return m.subarray(crypto_secretbox_ZEROBYTES);
};

nacl.secretbox.keyLength = crypto_secretbox_KEYBYTES;
nacl.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
nacl.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;

nacl.scalarMult = function(n, p) {
  checkArrayTypes(n, p);
  if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
  if (p.length !== crypto_scalarmult_BYTES) throw new Error('bad p size');
  var q = new Uint8Array(crypto_scalarmult_BYTES);
  crypto_scalarmult(q, n, p);
  return q;
};

nacl.scalarMult.base = function(n) {
  checkArrayTypes(n);
  if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
  var q = new Uint8Array(crypto_scalarmult_BYTES);
  crypto_scalarmult_base(q, n);
  return q;
};

nacl.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
nacl.scalarMult.groupElementLength = crypto_scalarmult_BYTES;

nacl.box = function(msg, nonce, publicKey, secretKey) {
  var k = nacl.box.before(publicKey, secretKey);
  return nacl.secretbox(msg, nonce, k);
};

nacl.box.before = function(publicKey, secretKey) {
  checkArrayTypes(publicKey, secretKey);
  checkBoxLengths(publicKey, secretKey);
  var k = new Uint8Array(crypto_box_BEFORENMBYTES);
  crypto_box_beforenm(k, publicKey, secretKey);
  return k;
};

nacl.box.after = nacl.secretbox;

nacl.box.open = function(msg, nonce, publicKey, secretKey) {
  var k = nacl.box.before(publicKey, secretKey);
  return nacl.secretbox.open(msg, nonce, k);
};

nacl.box.open.after = nacl.secretbox.open;

nacl.box.keyPair = function() {
  var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
  crypto_box_keypair(pk, sk);
  return {publicKey: pk, secretKey: sk};
};

nacl.box.keyPair.fromSecretKey = function(secretKey) {
  checkArrayTypes(secretKey);
  if (secretKey.length !== crypto_box_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
  crypto_scalarmult_base(pk, secretKey);
  return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
};

nacl.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
nacl.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
nacl.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
nacl.box.nonceLength = crypto_box_NONCEBYTES;
nacl.box.overheadLength = nacl.secretbox.overheadLength;

nacl.sign = function(msg, secretKey) {
  checkArrayTypes(msg, secretKey);
  if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var signedMsg = new Uint8Array(crypto_sign_BYTES+msg.length);
  crypto_sign(signedMsg, msg, msg.length, secretKey);
  return signedMsg;
};

nacl.sign.open = function(signedMsg, publicKey) {
  if (arguments.length !== 2)
    throw new Error('nacl.sign.open accepts 2 arguments; did you mean to use nacl.sign.detached.verify?');
  checkArrayTypes(signedMsg, publicKey);
  if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
    throw new Error('bad public key size');
  var tmp = new Uint8Array(signedMsg.length);
  var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
  if (mlen < 0) return null;
  var m = new Uint8Array(mlen);
  for (var i = 0; i < m.length; i++) m[i] = tmp[i];
  return m;
};

nacl.sign.detached = function(msg, secretKey) {
  var signedMsg = nacl.sign(msg, secretKey);
  var sig = new Uint8Array(crypto_sign_BYTES);
  for (var i = 0; i < sig.length; i++) sig[i] = signedMsg[i];
  return sig;
};

nacl.sign.detached.verify = function(msg, sig, publicKey) {
  checkArrayTypes(msg, sig, publicKey);
  if (sig.length !== crypto_sign_BYTES)
    throw new Error('bad signature size');
  if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
    throw new Error('bad public key size');
  var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
  var m = new Uint8Array(crypto_sign_BYTES + msg.length);
  var i;
  for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
  for (i = 0; i < msg.length; i++) sm[i+crypto_sign_BYTES] = msg[i];
  return (crypto_sign_open(m, sm, sm.length, publicKey) >= 0);
};

nacl.sign.keyPair = function() {
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
  crypto_sign_keypair(pk, sk);
  return {publicKey: pk, secretKey: sk};
};

nacl.sign.keyPair.fromSecretKey = function(secretKey) {
  checkArrayTypes(secretKey);
  if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  for (var i = 0; i < pk.length; i++) pk[i] = secretKey[32+i];
  return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
};

nacl.sign.keyPair.fromSeed = function(seed) {
  checkArrayTypes(seed);
  if (seed.length !== crypto_sign_SEEDBYTES)
    throw new Error('bad seed size');
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
  for (var i = 0; i < 32; i++) sk[i] = seed[i];
  crypto_sign_keypair(pk, sk, true);
  return {publicKey: pk, secretKey: sk};
};

nacl.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
nacl.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
nacl.sign.seedLength = crypto_sign_SEEDBYTES;
nacl.sign.signatureLength = crypto_sign_BYTES;

nacl.hash = function(msg) {
  checkArrayTypes(msg);
  var h = new Uint8Array(crypto_hash_BYTES);
  crypto_hash(h, msg, msg.length);
  return h;
};

nacl.hash.hashLength = crypto_hash_BYTES;

nacl.verify = function(x, y) {
  checkArrayTypes(x, y);
  // Zero length arguments are considered not equal.
  if (x.length === 0 || y.length === 0) return false;
  if (x.length !== y.length) return false;
  return (vn(x, 0, y, 0, x.length) === 0) ? true : false;
};

nacl.setPRNG = function(fn) {
  randombytes = fn;
};

(function() {
  // Initialize PRNG if environment provides CSPRNG.
  // If not, methods calling randombytes will throw.
  var crypto = typeof self !== 'undefined' ? (self.crypto || self.msCrypto) : null;
  if (crypto && crypto.getRandomValues) {
    // Browsers.
    var QUOTA = 65536;
    nacl.setPRNG(function(x, n) {
      var i, v = new Uint8Array(n);
      for (i = 0; i < n; i += QUOTA) {
        crypto.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
      }
      for (i = 0; i < n; i++) x[i] = v[i];
      cleanup(v);
    });
  } else if (typeof require !== 'undefined') {
    // Node.js.
    crypto = require('crypto');
    if (crypto && crypto.randomBytes) {
      nacl.setPRNG(function(x, n) {
        var i, v = crypto.randomBytes(n);
        for (i = 0; i < n; i++) x[i] = v[i];
        cleanup(v);
      });
    }
  }
})();

})(typeof module !== 'undefined' && module.exports ? module.exports : (self.nacl = self.nacl || {}));

}, {"crypto":6}, "/app/tweetnacl/nacl-fast.js"];
__defs[8] = [function(module, exports, require, __filename, __dirname){
const { app, BrowserWindow, ipcMain, dialog, session, shell, systemPreferences, Menu, Tray, nativeImage, screen } = require('electron');
// Права сотрудников проверяются здесь, в главной части программы, для каждой команды из окна:
// даже если кнопку как-то вызвать, без права команда не выполнится. Карта «команда → право» — CHANNEL_PERMS.
const __ipcHandle = ipcMain.handle.bind(ipcMain);
// Сеть точек и общая база — только владелец (2.17): сотрудник не может отключить базу, сменить точку или бота.
const OWNER_CHANNELS = new Set(['sync:connect', 'sync:mergeLocal', 'sync:replaceLocal', 'sync:disconnect', 'sync:revoke', 'points:setMine', 'points:setDeviceName',
  'points:setAllDefault', 'points:botPull', 'points:botShare', 'points:botPoll', 'locations:add', 'locations:rename', 'locations:remove']);
ipcMain.handle = (channel, fn) => __ipcHandle(channel, (e, ...args) => {
  if (OWNER_CHANNELS.has(channel) && sessionRole() !== 'owner') return { error: 'no_access' };
  const need = CHANNEL_PERMS[channel];
  if (need && !roleCan(need)) return { error: 'no_access' };
  return fn(e, ...args);
});
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const Database = require('./db');
const { getNiche } = require('./niches.js');
const { todayNamedayNames, namedayNormalize, namedayFirstName } = require('./src/nameday-calendar.js');
const LoyaCardModel = require('./src/card-model.js');
const { startLocalServer } = require('./local-api-server');

let mainWindow;
let db;
let grow = null;   // 2.20: «Приведи друга», отзывы, онлайн-запись, Dotykačka (grow.js)

// Только одна копия программы: две копии открыли бы одну базу, и каждая при сохранении
// затирала бы изменения другой (а локальный сервер не смог бы занять порт).
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Журнал ошибок: вместо системного окна с ошибкой (которое пугает пользователя) пишем
// в файл logs/loya.log в папке данных — его можно прислать в поддержку.
function writeCrashLog(kind, err) {
  try {
    const dir = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'loya.log');
    try { if (fs.statSync(file).size > 1024 * 1024) fs.renameSync(file, file + '.old'); } catch (e) { /* файла ещё нет */ }
    fs.appendFileSync(file, `[${new Date().toISOString()}] ${kind}: ${err && err.stack ? err.stack : String(err)}\n`);
  } catch (e) { /* журнал не должен ронять программу */ }
}
process.on('uncaughtException', (err) => { console.error(err); writeCrashLog('uncaughtException', err); });
process.on('unhandledRejection', (err) => { console.error(err); writeCrashLog('unhandledRejection', err); });
let localServer;

// Тексты для писем клиентам на разных языках.
const EMAIL_TEXT = {
  ru: {
    subjectDiscount: (p) => `Ваша карта лояльности — скидка ${p}%`,
    subjectStamp: (title) => `Ваша карта лояльности — ${title || 'бонусная карта'}`,
    bodySpend: (name, title, acc, target, cur, bonus) => `<p>Здравствуйте, ${name}!</p>
       <p>Вот ваша накопительная карта${title ? ': <b>' + title + '</b>' : ''}.</p>
       ${target ? `<p>Накоплено: <b>${acc} ${cur}</b> из ${target} ${cur}. Когда наберётся ${target} ${cur}, вы получите бонус${bonus ? ': <b>' + bonus + '</b>' : ''}.</p>` : `<p>Всего потрачено: <b>${acc} ${cur}</b>.</p>`}
       <p>Показывайте этот QR-код при каждой покупке:</p>
       <img src="cid:qrcode" width="250" height="250" />`,
    bodyDiscount: (name, p) => `<p>Здравствуйте, ${name}!</p>
       <p>Вот ваша персональная карта лояльности со скидкой <b>${p}%</b>.</p>
       <p>Покажите этот QR-код при оплате:</p>
       <img src="cid:qrcode" width="250" height="250" />`,
    bodyStamp: (name, title, count, target) => `<p>Здравствуйте, ${name}!</p>
       <p>Вот ваша карта: <b>${title || ''}</b> (каждая ${target}-я — в подарок).</p>
       <p>Текущий прогресс: ${count} из ${target}.</p>
       <p>Показывайте этот QR-код при каждой покупке:</p>
       <img src="cid:qrcode" width="250" height="250" />`,
    missingSettings: 'Настройте почту на вкладке "Настройки" перед отправкой.',
    testEmailSubject: (brandName) => `✅ Тестовое письмо — ${brandName}`,
    testEmailBody: '<p>Если вы видите это письмо — настройки почты работают правильно, можно отправлять карты и рассылки клиентам.</p>',
    cardNotFound: 'Карта не найдена',
    noEmail: 'У клиента не указан email',
    subjectBirthday: 'С днём рождения! 🎉',
    bodyBirthday: (name, phrase) => `<p>Здравствуйте, ${name}!</p>
       <p>Поздравляем вас с днём рождения! Желаем всего самого доброго и, конечно, ждём в гости на ${phrase}. 🎂</p>`,
    subjectReengagement: (emoji) => `Мы скучаем по вам! ${emoji}`,
    bodyReengagement: (name, phrase, emoji) => `<p>Здравствуйте, ${name}!</p>
       <p>Мы заметили, что вы давно у нас не были — соскучились! Будем рады видеть вас снова: заходите на ${phrase}. ${emoji}</p>`,
    unsubscribeFooter: (url) => `<p style="margin-top:24px;font-size:11px;color:#9ca3af;">Больше не хотите получать такие письма? <a href="${url}" style="color:#9ca3af;">Отписаться</a>.</p>`,
    subjectCupsReminder: (remaining) => `Осталось ${remaining} до бесплатного визита!`,
    bodyCupsReminder: (name, remaining, title) => `<p>Здравствуйте, ${name}!</p>
       <p>Напоминаем: по карте «${title}» вам осталось всего <b>${remaining}</b> до бесплатной покупки! Ждём вас в гостях.</p>`,
    subjectNameday: (name) => `С именинами, ${name}! 🎉`,
    bodyNameday: (name, giftText, brandName, emoji, phrase) => `
      <div style="text-align:center;font-family:sans-serif;color:#3a2a1c;">
        <h2 style="margin-bottom:4px;">${emoji} ${brandName}</h2>
        <p>Дорогой(ая) ${name},</p>
        <p>поздравляем вас с именинами! 🎉</p>
        <p>Приходите порадовать себя — заглядывайте на ${phrase}.</p>
        ${giftText ? `<p>В подарок от нас сегодня: <b>${giftText}</b>.</p>` : ''}
        <p>Ждём вас в гостях ❤️</p>
        <p style="margin-top:16px;">${brandName}</p>
      </div>`
  },
  sk: {
    subjectDiscount: (p) => `Vaša vernostná karta — zľava ${p}%`,
    subjectStamp: (title) => `Vaša vernostná karta — ${title || 'bonusová karta'}`,
    bodySpend: (name, title, acc, target, cur, bonus) => `<p>Dobrý deň, ${name}!</p>
       <p>Tu je vaša vernostná karta${title ? ': <b>' + title + '</b>' : ''}.</p>
       ${target ? `<p>Nazbierané: <b>${acc} ${cur}</b> z ${target} ${cur}. Keď nazbierate ${target} ${cur}, dostanete bonus${bonus ? ': <b>' + bonus + '</b>' : ''}.</p>` : `<p>Spolu minuté: <b>${acc} ${cur}</b>.</p>`}
       <p>Ukážte tento QR kód pri každom nákupe:</p>
       <img src="cid:qrcode" width="250" height="250" />`,
    bodyDiscount: (name, p) => `<p>Dobrý deň, ${name}!</p>
       <p>Toto je vaša osobná vernostná karta so zľavou <b>${p}%</b>.</p>
       <p>Pri platbe ukážte tento QR kód:</p>
       <img src="cid:qrcode" width="250" height="250" />`,
    bodyStamp: (name, title, count, target) => `<p>Dobrý deň, ${name}!</p>
       <p>Toto je vaša karta: <b>${title || ''}</b> (každý ${target}. nákup je darček).</p>
       <p>Aktuálny stav: ${count} z ${target}.</p>
       <p>Ukazujte tento QR kód pri každom nákupe:</p>
       <img src="cid:qrcode" width="250" height="250" />`,
    missingSettings: 'Pred odoslaním nastavte e-mail v záložke "Nastavenia".',
    testEmailSubject: (brandName) => `✅ Testovací e-mail — ${brandName}`,
    testEmailBody: '<p>Ak vidíte tento e-mail — nastavenia pošty fungujú správne, môžete odosielať karty a kampane klientom.</p>',
    cardNotFound: 'Karta sa nenašla',
    noEmail: 'Klient nemá zadaný e-mail',
    subjectBirthday: 'Všetko najlepšie k narodeninám! 🎉',
    bodyBirthday: (name, phrase) => `<p>Dobrý deň, ${name}!</p>
       <p>Prajeme vám všetko najlepšie k narodeninám! Nech sa vám darí, a samozrejme vás radi privítame na ${phrase}. 🎂</p>`,
    subjectReengagement: (emoji) => `Chýbate nám! ${emoji}`,
    bodyReengagement: (name, phrase, emoji) => `<p>Dobrý deň, ${name}!</p>
       <p>Všimli sme si, že ste u nás dlho neboli — chýbate nám! Radi vás privítame znova, príďte na ${phrase}. ${emoji}</p>`,
    unsubscribeFooter: (url) => `<p style="margin-top:24px;font-size:11px;color:#9ca3af;">Nechcete už dostávať takéto e-maily? <a href="${url}" style="color:#9ca3af;">Odhlásiť sa</a>.</p>`,
    subjectCupsReminder: (remaining) => `Zostáva ${remaining} do odmeny zadarmo!`,
    bodyCupsReminder: (name, remaining, title) => `<p>Dobrý deň, ${name}!</p>
       <p>Pripomíname: na karte „${title}" vám zostáva už len <b>${remaining}</b> do nákupu zdarma! Tešíme sa na vašu návštevu.</p>`,
    subjectNameday: (name) => `Všetko najlepšie k meninám, ${name}! 🎉`,
    bodyNameday: (name, giftText, brandName, emoji, phrase) => `
      <div style="text-align:center;font-family:sans-serif;color:#3a2a1c;">
        <h2 style="margin-bottom:4px;">${emoji} ${brandName}</h2>
        <p>Milá/Milý ${name},</p>
        <p>želáme Vám všetko najlepšie k dnešným meninám! 🎉</p>
        <p>Príďte si spraviť radosť — zastavte sa na ${phrase}.</p>
        ${giftText ? `<p>Ako malý darček od nás máte dnes: <b>${giftText}</b>.</p>` : ''}
        <p>Tešíme sa na Vašu návštevu ❤️</p>
        <p style="margin-top:16px;">${brandName}</p>
      </div>`
  },
  uk: {
    subjectDiscount: (p) => `Ваша карта лояльності — знижка ${p}%`,
    subjectStamp: (title) => `Ваша карта лояльності — ${title || 'бонусна картка'}`,
    bodySpend: (name, title, acc, target, cur, bonus) => `<p>Вітаємо, ${name}!</p>
       <p>Ось ваша накопичувальна картка${title ? ': <b>' + title + '</b>' : ''}.</p>
       ${target ? `<p>Накопичено: <b>${acc} ${cur}</b> з ${target} ${cur}. Коли набереться ${target} ${cur}, ви отримаєте бонус${bonus ? ': <b>' + bonus + '</b>' : ''}.</p>` : `<p>Усього витрачено: <b>${acc} ${cur}</b>.</p>`}
       <p>Показуйте цей QR-код під час кожної покупки:</p>
       <img src="cid:qrcode" width="250" height="250" />`,
    bodyDiscount: (name, p) => `<p>Доброго дня, ${name}!</p>
       <p>Ось ваша особиста картка лояльності зі знижкою <b>${p}%</b>.</p>
       <p>Покажіть цей QR-код під час оплати:</p>
       <img src="cid:qrcode" width="250" height="250" />`,
    bodyStamp: (name, title, count, target) => `<p>Доброго дня, ${name}!</p>
       <p>Ось ваша картка: <b>${title || ''}</b> (кожна ${target}-та — у подарунок).</p>
       <p>Поточний прогрес: ${count} з ${target}.</p>
       <p>Показуйте цей QR-код під час кожної покупки:</p>
       <img src="cid:qrcode" width="250" height="250" />`,
    missingSettings: 'Налаштуйте пошту на вкладці "Налаштування" перед відправленням.',
    testEmailSubject: (brandName) => `✅ Тестовий лист — ${brandName}`,
    testEmailBody: '<p>Якщо ви бачите цей лист — налаштування пошти працюють правильно, можна надсилати картки та розсилки клієнтам.</p>',
    cardNotFound: 'Картку не знайдено',
    noEmail: 'У клієнта не вказано email',
    subjectBirthday: 'З днем народження! 🎉',
    bodyBirthday: (name, phrase) => `<p>Доброго дня, ${name}!</p>
       <p>Вітаємо вас із днем народження! Бажаємо всього найкращого і, звісно, чекаємо в гості на ${phrase}. 🎂</p>`,
    subjectReengagement: (emoji) => `Ми сумуємо за вами! ${emoji}`,
    bodyReengagement: (name, phrase, emoji) => `<p>Доброго дня, ${name}!</p>
       <p>Ми помітили, що ви давно у нас не були — сумуємо! Будемо раді бачити вас знову: заходьте на ${phrase}. ${emoji}</p>`,
    unsubscribeFooter: (url) => `<p style="margin-top:24px;font-size:11px;color:#9ca3af;">Більше не хочете отримувати такі листи? <a href="${url}" style="color:#9ca3af;">Відписатися</a>.</p>`,
    subjectCupsReminder: (remaining) => `Залишилось ${remaining} до безкоштовного візиту!`,
    bodyCupsReminder: (name, remaining, title) => `<p>Доброго дня, ${name}!</p>
       <p>Нагадуємо: за карткою «${title}» вам залишилось всього <b>${remaining}</b> до безкоштовної покупки! Чекаємо на вас у гостях.</p>`,
    subjectNameday: (name) => `З іменинами, ${name}! 🎉`,
    bodyNameday: (name, giftText, brandName, emoji, phrase) => `
      <div style="text-align:center;font-family:sans-serif;color:#3a2a1c;">
        <h2 style="margin-bottom:4px;">${emoji} ${brandName}</h2>
        <p>Дорогий(а) ${name},</p>
        <p>вітаємо вас з іменинами! 🎉</p>
        <p>Завітайте потішити себе — заходьте на ${phrase}.</p>
        ${giftText ? `<p>У подарунок від нас сьогодні: <b>${giftText}</b>.</p>` : ''}
        <p>Чекаємо на вас у гостях ❤️</p>
        <p style="margin-top:16px;">${brandName}</p>
      </div>`
  },
  en: {
    subjectDiscount: (p) => `Your loyalty card — ${p}% off`,
    subjectStamp: (title) => `Your loyalty card — ${title || 'bonus card'}`,
    bodySpend: (name, title, acc, target, cur, bonus) => `<p>Hello, ${name}!</p>
       <p>Here is your spend card${title ? ': <b>' + title + '</b>' : ''}.</p>
       ${target ? `<p>Collected: <b>${cur}${acc}</b> of ${cur}${target}. Once you reach ${cur}${target}, you get a bonus${bonus ? ': <b>' + bonus + '</b>' : ''}.</p>` : `<p>Total spent: <b>${cur}${acc}</b>.</p>`}
       <p>Show this QR code with every purchase:</p>
       <img src="cid:qrcode" width="250" height="250" />`,
    bodyDiscount: (name, p) => `<p>Hello, ${name}!</p>
       <p>Here is your personal loyalty card with a <b>${p}%</b> discount.</p>
       <p>Show this QR code when you pay:</p>
       <img src="cid:qrcode" width="250" height="250" />`,
    bodyStamp: (name, title, count, target) => `<p>Hello, ${name}!</p>
       <p>Here is your card: <b>${title || ''}</b> (every ${target}th purchase is on us).</p>
       <p>Current progress: ${count} of ${target}.</p>
       <p>Show this QR code with every purchase:</p>
       <img src="cid:qrcode" width="250" height="250" />`,
    missingSettings: 'Set up email in the "Settings" tab before sending.',
    testEmailSubject: (brandName) => `✅ Test email — ${brandName}`,
    testEmailBody: '<p>If you see this email — your email settings are working correctly, and you can send cards and campaigns to clients.</p>',
    cardNotFound: 'Card not found',
    noEmail: 'This client has no email on file',
    subjectBirthday: 'Happy Birthday! 🎉',
    bodyBirthday: (name, phrase) => `<p>Hello, ${name}!</p>
       <p>Happy birthday! We wish you all the best, and of course we'd love to see you for ${phrase}. 🎂</p>`,
    subjectReengagement: (emoji) => `We miss you! ${emoji}`,
    bodyReengagement: (name, phrase, emoji) => `<p>Hello, ${name}!</p>
       <p>We noticed you haven't visited in a while — we miss you! We'd love to see you again for ${phrase}. ${emoji}</p>`,
    unsubscribeFooter: (url) => `<p style="margin-top:24px;font-size:11px;color:#9ca3af;">Don't want to receive emails like this anymore? <a href="${url}" style="color:#9ca3af;">Unsubscribe</a>.</p>`,
    subjectCupsReminder: (remaining) => `${remaining} to go until your free visit!`,
    bodyCupsReminder: (name, remaining, title) => `<p>Hello, ${name}!</p>
       <p>A quick reminder: on your "${title}" card you have just <b>${remaining}</b> left until a free purchase! We look forward to seeing you.</p>`,
    subjectNameday: (name) => `Happy name day, ${name}! 🎉`,
    bodyNameday: (name, giftText, brandName, emoji, phrase) => `
      <div style="text-align:center;font-family:sans-serif;color:#3a2a1c;">
        <h2 style="margin-bottom:4px;">${emoji} ${brandName}</h2>
        <p>Dear ${name},</p>
        <p>Happy name day! 🎉</p>
        <p>Come treat yourself — stop by for ${phrase}.</p>
        ${giftText ? `<p>As a little gift from us today: <b>${giftText}</b>.</p>` : ''}
        <p>We look forward to seeing you ❤️</p>
        <p style="margin-top:16px;">${brandName}</p>
      </div>`
  }
};

// Название бренда и ниша бизнеса — задаются один раз при первом запуске (см. онбординг)
// и используются везде вместо того, что раньше было зашито как "Loya"/кофе.
function getBrandContext(lang) {
  const settings = db.getSettings();
  const brandName = settings.brand_name || 'Loya';
  const niche = getNiche(settings.business_niche || 'coffee');
  return {
    brandName,
    emoji: niche.emoji,
    phrase: (niche.invitePhrase[lang] || niche.invitePhrase.ru)
  };
}

// Подписи для типов подарка на именины — используются в письме на языке получателя.
const NAMEDAY_GIFT_LABELS = {
  discount10: { ru: 'скидка 10% сегодня', sk: '10 % zľava dnes', uk: 'знижка 10% сьогодні', en: '10% off today' },
  freeCoffee: { ru: 'кофе бесплатно', sk: 'káva zdarma', uk: 'кава безкоштовно', en: 'a free coffee' },
  freeDessert: { ru: 'десерт бесплатно при покупке кофе', sk: 'dezert zdarma pri kúpe kávy', uk: 'десерт безкоштовно при покупці кави', en: 'a free dessert with any coffee' },
  doubleStamps: { ru: 'двойные штампы на карту', sk: 'dvojité pečiatky na kartu', uk: 'подвійні штампи на карту', en: 'double stamps on your card' }
};

// Раньше (см. историю ниже) данные лежали рядом с исполняемым файлом — специально,
// чтобы приложение можно было носить на флешке. Но это оказалось небезопасно на
// Windows по совсем другой причине: при автообновлении новый установщик обычно сначала
// молча удаляет предыдущую версию (стандартное поведение NSIS — целиком стирает папку
// установки), и база данных, лежавшая прямо там же, стиралась вместе с программой.
// Человек открывал обновлённое приложение и видел пустой аккаунт, будто все клиенты
// пропали.
//
// Решение — раз и навсегда хранить данные в системной пользовательской папке
// (%APPDATA%\Loya на Windows, ~/Library/Application Support/Loya на Mac), которая
// physически находится ВНЕ папки установки и которую ни один установщик или
// деинсталлятор никогда не трогает. Это стандартное место для данных у всех
// нормальных Windows-приложений, не только у Loya.
//
// Чтобы никто не потерял уже накопленные данные при переходе на эту версию — при
// первом запуске после обновления приложение само, один раз, копирует всё содержимое
// старой папки (рядом с exe) в новое место. Старая копия при этом не удаляется —
// просто перестаёт использоваться, на случай если перенос пойдёт не так.
function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function getDataDir() {
  if (!app.isPackaged) {
    return path.join(__dirname, 'data');
  }

  const userDataDir = path.join(app.getPath('userData'), 'data');

  // Уже перенесено (или это вообще новая установка без старых данных) — используем
  // системную папку без каких-либо дополнительных проверок.
  if (fs.existsSync(path.join(userDataDir, 'loyalty.db'))) {
    return userDataDir;
  }

  // Старое место — рядом с exe (Windows/Linux) или внутри .app (там раньше не
  // использовалось, но проверяем для полноты). Если там есть данные — переносим один раз.
  if (process.platform !== 'darwin') {
    try {
      const exeDir = path.dirname(app.getPath('exe'));
      const oldDataDir = path.join(exeDir, 'data');
      if (fs.existsSync(path.join(oldDataDir, 'loyalty.db'))) {
        copyDirRecursive(oldDataDir, userDataDir);
        console.log('[Loya] Данные перенесены из ' + oldDataDir + ' в ' + userDataDir);
      }
    } catch (err) {
      console.log('[Loya] Не удалось перенести старые данные автоматически: ' + err.message);
      // Не страшно — просто продолжаем с пустой userData, ничего не потеряно,
      // старые файлы остаются на месте нетронутыми.
    }
  }

  return userDataDir;
}

const MAX_BACKUPS = 14;

function getBackupDir() {
  return path.join(getDataDir(), 'backups');
}

// Резервная копия базы данных. Файл за сегодня создаётся только один раз (не при каждом
// запуске приложения), а "reason" (например, "before-reset") делает отдельную именную копию
// перед опасными действиями — не зависит от дневного лимита.
// Просит главное окно (у него уже загружен cat-card.js) составить открытку с котиком для
// указанного кода карты, и ждёт результат. Используется саморегистрацией по QR — там код
// выполняется в главном процессе, где нет Canvas/DOM для составления картинки самостоятельно.
// Старый механизм «license-config.json» (сборка под конкретного клиента) удалён в 2.14: правкой одного
// JSON-файла внутри программы можно было включить все функции. Сейчас доступ даёт только подписанный
// сервером талон подписки (см. ниже).
// Адрес сервера подписки — заполняется один раз, после того как сайт и бэкенд будут
// развёрнуты (см. /loya-website в этом же комплекте и SETUP.md там). Пока пусто —
// проверка по ключу подписки просто не выполняется, ничего не ломается.
// Сервер Loya — свой домен. Прежний адрес loya-website-one.vercel.app больше не работает (404),
// поэтому запасного адреса нет. Список оставлен, чтобы при необходимости добавить запасной.
const API_BASES = ['https://loya-loyalty.com'];
const SUBSCRIPTION_API_URL = API_BASES[0];
const WEBSITE_URL = API_BASES[0];

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Cache-Control': 'no-cache' } }, (res) => {
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function httpsPostJsonOnce(url, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: timeoutMs || 15000
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.write(data);
    req.end();
  });
}

// Запрос к серверу Loya с запасным адресом. Ответ сервера (даже с ошибкой, но в формате JSON) —
// это ответ, его возвращаем как есть. Переходим на следующий адрес только если адрес не отвечает
// или вместо JSON пришла чужая страница (например, 404 от другого сайта).
let apiPreferred = 0, apiPreferredAt = 0;
async function httpsPostJson(url, body, timeoutMs) {
  const base = API_BASES.find(b => String(url).startsWith(b));
  if (!base) return httpsPostJsonOnce(url, body, timeoutMs);
  const path = String(url).slice(base.length);
  // Помним, какой адрес ответил в последний раз (10 минут), чтобы не ждать таймаут на каждом запросе.
  const start = Date.now() - apiPreferredAt < 10 * 60 * 1000 ? apiPreferred : 0;
  const order = API_BASES.map((_, i) => (i + start) % API_BASES.length);
  let lastErr;
  for (const i of order) {
    try {
      const res = await httpsPostJsonOnce(API_BASES[i] + path, body, timeoutMs);
      if (i !== 0) { apiPreferred = i; apiPreferredAt = Date.now(); } else { apiPreferred = 0; apiPreferredAt = 0; }
      return res;
    } catch (err) { lastErr = err; }
  }
  throw lastErr || new Error('network');
}

// ---------- пробный режим (пока не введён рабочий ключ подписки) ----------
// Программа ставится одинаково откуда бы её ни скачали (сайт, Microsoft Store, Mac). Без ключа
// подписки работает пробная версия: до 10 клиентов, без рассылок. С ключом лимиты снимаются.
// Лимиты на клиентов и карты — «мягкая» защита для честных пользователей (база лежит на компьютере
// владельца); а Google/Apple Wallet, почта от имени Loya, регистрация по ссылке и доступ из дома
// проверяют ключ на сервере и без подписки не работают вообще.
const FREE_LIMITS = { clients: 10, cards: 15, products: 10 };
const DISTRIBUTION = process.mas ? 'mas' : (process.windowsStore ? 'ms' : 'direct');
// Apple запрещает в приложениях из App Store кнопки и ссылки на внешнюю оплату (кроме отдельных стран) —
// в такой сборке показываем только поле ввода ключа. Для Microsoft Store (свои платежи у не-игр разрешены)
// ссылка включена; если сертификация придерётся — поставьте false.
const CAN_LINK_TO_PURCHASE = DISTRIBUTION !== 'mas';
function subscribeUrl(plan) {
  const lang = ['ru', 'uk', 'sk', 'en'].includes((db && db.getSettings().app_language) || '') ? db.getSettings().app_language : 'ru';
  return `https://loya-loyalty.com/pricing.html?lang=${lang}&src=app-${DISTRIBUTION}${plan === 'pro' || plan === 'starter' ? '&plan=' + plan : ''}`;
}
// Отпечаток компьютера для пробного периода: один пробный период на компьютер. Наружу уходит только хеш.
function machineHash() {
  const cp = require('child_process'); const os = require('os');
  let id = '';
  try {
    if (process.platform === 'win32') { const out = cp.execFileSync('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], { encoding: 'utf8', windowsHide: true, timeout: 4000 }); const m = out.match(/MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/); if (m) id = m[1]; }
    else if (process.platform === 'darwin') { const out = cp.execFileSync('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], { encoding: 'utf8', timeout: 4000 }); const m = out.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/); if (m) id = m[1]; }
    else { id = fs.readFileSync('/etc/machine-id', 'utf8').trim(); }
  } catch (e) { /* ниже запасной вариант */ }
  if (!id) {
    const macs = Object.values(os.networkInterfaces()).flat().filter(n => n && !n.internal && n.mac && n.mac !== '00:00:00:00:00:00').map(n => n.mac).sort();
    id = [os.hostname(), (os.cpus()[0] || {}).model || '', macs.join(',')].join('|');
  }
  return crypto.createHash('sha256').update('loya-trial:' + id.toLowerCase()).digest('hex');
}
// Тарифы: free (без ключа или подписка не активна), starter, pro. Пробный период — 14 дней уровня Pro,
// срок считает сервер; программа хранит разницу своих часов с сервером, поэтому перевод часов не продлевает его.
const TRIAL_OFFLINE_MS = 3 * 86400000;   // во время пробного периода программа должна выходить в сеть хотя бы раз в 3 дня

// ---------- защита подписки: подписанный сервером талон ----------
// Сервер Loya подписывает ответ «подписка активна» своим закрытым ключом (Ed25519, хранится только
// в Vercel). В программе лежит лишь открытый ключ (license-pubkey.pem): им можно проверить талон, но не
// выписать новый. В талоне — отпечаток ключа подписки, отпечаток этого компьютера, тариф и срок.
// Поэтому правка базы (loyalty.db), подмена ответа сервера или копирование базы на другой компьютер
// не включают платные функции. Неподписанный ответ (старый сервер) действует только до перезапуска.
let LICENSE_PUBKEY = null;
try {
  const pem = fs.readFileSync(path.join(__dirname, 'license-pubkey.pem'), 'utf8');
  if (/BEGIN PUBLIC KEY/.test(pem)) LICENSE_PUBKEY = crypto.createPublicKey(pem);
} catch (e) { /* сборка без ключа (разработка) — работает прежняя проверка */ }
let sessionLicense = null;          // { key, state } — неподписанный ответ сервера, только в памяти
let machineIdCache = null;
const machineId = () => machineIdCache || (machineIdCache = machineHash());
const keyFingerprint = (key) => crypto.createHash('sha256').update('loya-key:' + String(key || '').trim()).digest('hex').slice(0, 32);
const b64uDecode = (str) => Buffer.from(String(str || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64');
let tokenCache = { tok: null, key: null, res: null };
function verifyLicenseToken(tok, key) {
  if (!LICENSE_PUBKEY || !tok || !key) return null;
  if (tokenCache.tok === tok && tokenCache.key === key) return tokenCache.res;
  let res = null;
  try {
    const parts = String(tok).split('.');
    if (parts.length === 2 && crypto.verify(null, Buffer.from(parts[0], 'utf8'), LICENSE_PUBKEY, b64uDecode(parts[1]))) {
      const p = JSON.parse(b64uDecode(parts[0]).toString('utf8'));
      if (p && p.v === 1 && p.k === keyFingerprint(key) && p.d === machineId() && Date.parse(p.exp)) res = p;
    }
  } catch (e) { res = null; }
  tokenCache = { tok, key, res };
  return res;
}
// Перевод часов назад не продлевает талон: помним самое позднее время, которое программа видела.
const CLOCK_SLACK = 6 * 3600000;
function touchSeenTime(serverMs) {
  const s = db.getSettings();
  const max = Math.max(Number(s.license_seen_max) || 0, Date.now(), Number(serverMs) || 0);
  if (max - (Number(s.license_seen_max) || 0) > 60000) db.saveSettings({ license_seen_max: String(max) });
}
function stateFromServer(result, s) {
  // Неподписанный ответ сервера → тот же расчёт, что и раньше (используется только в памяти).
  if (!result || !result.active) return null;
  if (result.plan === 'trial') {
    const now = Date.now() + (Number(s.license_server_offset) || 0);
    const until = Date.parse(result.trialUntil || '') || 0;
    if (now >= until) return { mode: 'free', tier: 'free', reason: 'trial_ended' };
    return { mode: 'full', tier: 'pro', reason: 'trial', trial: true, trialUntil: result.trialUntil, daysLeft: Math.max(1, Math.ceil((until - now) / 86400000)) };
  }
  return { mode: 'full', tier: result.tier === 'pro' ? 'pro' : 'starter', reason: 'active' };
}
function inactiveState(s) {
  return { mode: 'free', tier: 'free', reason: s.subscription_status === 'trial_expired' ? 'trial_ended' : s.subscription_status === 'device_limit' ? 'device_limit' : 'inactive', status: s.subscription_status || '', message: s.license_message || '' };
}
function licenseState() {
  // Демо на сайте (сборка build-www --demo): всё открыто, без ключа и без сети
  if (globalThis.__LOYA_DEMO === true) return { mode: 'full', tier: 'pro', reason: 'demo' };
  const s = db.getSettings();
  if (!s.license_key) return { mode: 'free', tier: 'free', reason: 'no_key' };
  if (LICENSE_PUBKEY) {
    if (s.license_blocked === '1') return inactiveState(s);
    const p = verifyLicenseToken(s.license_token, s.license_key);
    const now = Date.now();
    if (p && now < (Number(s.license_seen_max) || 0) - CLOCK_SLACK) return { mode: 'free', tier: 'free', reason: 'clock' };
    if (p && now < Date.parse(p.exp)) {
      if (p.p === 'trial') {
        const until = Date.parse(p.tu || '') || 0;
        const srvNow = now + (Number(s.license_server_offset) || 0);
        if (srvNow >= until) return { mode: 'free', tier: 'free', reason: 'trial_ended' };
        return { mode: 'full', tier: 'pro', reason: 'trial', trial: true, trialUntil: p.tu, daysLeft: Math.max(1, Math.ceil((until - srvNow) / 86400000)) };
      }
      return { mode: 'full', tier: p.t === 'pro' ? 'pro' : 'starter', reason: 'active' };
    }
    if (sessionLicense && sessionLicense.key === s.license_key && sessionLicense.state) return sessionLicense.state;
    return { mode: 'free', tier: 'free', reason: (p || s.license_last_ok) ? 'offline' : 'unverified' };
  }
  // Сборка без открытого ключа (разработка): прежняя проверка по отметкам в базе.
  if (s.license_blocked === '1') return inactiveState(s);
  if (!s.license_verified_at) return { mode: 'free', tier: 'free', reason: 'unverified' };
  if (s.license_plan === 'trial') {
    const now = Date.now() + (Number(s.license_server_offset) || 0);
    const until = Date.parse(s.license_trial_until || '') || 0;
    if (now >= until) return { mode: 'free', tier: 'free', reason: 'trial_ended' };
    const last = Date.parse(s.license_last_ok || s.license_verified_at) || 0;
    if (Date.now() - last > TRIAL_OFFLINE_MS || Date.now() < last - 3600000) return { mode: 'free', tier: 'free', reason: 'offline' };
    return { mode: 'full', tier: 'pro', reason: 'trial', trial: true, trialUntil: s.license_trial_until, daysLeft: Math.max(1, Math.ceil((until - now) / 86400000)) };
  }
  return { mode: 'full', tier: s.license_tier === 'pro' ? 'pro' : 'starter', reason: 'active' };
}
function licenseModeInfo() {
  const st = licenseState();
  return { ...st, limits: FREE_LIMITS, usage: db.getUsage(), canBuy: CAN_LINK_TO_PURCHASE, distribution: DISTRIBUTION, hasKey: !!db.getSettings().license_key };
}
function applyLicenseMode() {
  const st = licenseState();
  db.setFreeLimits(st.mode === 'free' ? FREE_LIMITS : null);
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('license-mode', licenseModeInfo());
  return st;
}
const isFreeMode = () => licenseState().mode === 'free';
// Операции пробного режима, которые пользователю показываем как «доступно в подписке».
const proOnly = () => (isFreeMode() ? { error: 'pro_only' } : null);
// IPC-обёртка: лимит клиентов/карт превращаем в обычный ответ { error: 'free_limit', limit }.
function limited(fn) {
  return (...args) => {
    try { return fn(...args); } catch (e) { if (e && e.code === 'FREE_LIMIT') return { error: 'free_limit', limit: e.limit }; throw e; }
  };
}

// Новая, автоматическая проверка — по лицензионному ключу, который владелец бизнеса сам
// вводит в настройках после оплаты на сайте (см. Settings → Подписка). В отличие от
// license-config.json (зашивается один раз при сборке — не годится для самостоятельной
// регистрации на сайте), этот ключ можно ввести в уже готовое, общее для всех сборки
// приложение. Оба механизма могут работать одновременно, не мешая друг другу.
async function checkSubscriptionLicense() {
  if (!SUBSCRIPTION_API_URL) return { ok: false, reason: 'no_api_configured' };
  const settings = db.getSettings();
  const licenseKey = settings.license_key;
  if (!licenseKey) return { ok: false, reason: 'no_key' };
  try {
    const cp = db.currentPoint();
    const result = await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/verify-license`, { licenseKey, appVersion: app.getVersion(), device: machineId(), platform: String(require('os').platform() || process.platform || ''),
      deviceName: deviceName(), point: cp ? cp.name : '' });
    if (!result || typeof result !== 'object' || result.status === 'rate_limited') return { ok: false, reason: 'network' };
    const blocked = !result.active;
    const serverMs = result.serverTime ? Date.parse(result.serverTime) : 0;
    db.saveSettings({
      license_blocked: blocked ? '1' : '0',
      license_message: result.message || '',
      license_last_check: new Date().toISOString(),
      subscription_status: result.status || '',
      license_plan: result.plan || '',
      license_tier: result.tier || '',
      license_trial_until: result.trialUntil || '',
      license_token: (!blocked && typeof result.token === 'string') ? result.token.slice(0, 2000) : '',
      ...(serverMs ? { license_server_offset: String(serverMs - Date.now()) } : {}),
      // 2.17: сколько ещё устройств работает с этим ключом и сколько можно точек/устройств.
      ...(result.org ? { license_org_others: String(Number(result.org.others) || 0), license_devices_limit: String(Number(result.org.limit) || 0) } : {}),
      ...(result.active ? { license_verified_at: new Date().toISOString(), license_last_ok: new Date().toISOString() } : {})
    });
    touchSeenTime(serverMs);
    sessionLicense = (!blocked && !result.token) ? { key: licenseKey, state: stateFromServer(result, db.getSettings()) } : null;
    // Подписка не активна — это не «чёрный экран», а пробный режим с понятным баннером и кнопкой продления.
    applyLicenseMode();
    // Первое устройство организации получает точку сама (название бренда); второе и следующие — спрашивают.
    if (result.active && result.org && !db.currentPoint() && !(Number(result.org.others) > 0)) db.assignPoint(db.getSettings().brand_name || 'Main');
    setTimeout(() => pushPointSummary().catch(() => {}), 3000);
    return { ok: true, blocked, message: result.message || '', org: result.org || null };
  } catch (err) {
    // Нет интернета или сервер недоступен — намеренно ничего не блокируем (см. тот же
    // принцип, что и у старой проверки: офлайн-first, не наказываем добросовестных
    // клиентов за временные проблемы с сетью).
    return { ok: false, reason: 'network' };
  }
}

function composeCatCardViaRenderer(code, lang, cardId) {
  return new Promise((resolve) => {
    if (!mainWindow || mainWindow.isDestroyed()) { resolve(null); return; }
    const requestId = Math.random().toString(36).slice(2);
    let settled = false;
    const handler = (e, payload) => {
      if (payload.requestId !== requestId) return;
      settled = true;
      ipcMain.removeListener('compose-cat-card-response', handler);
      resolve(payload.dataUrl);
    };
    ipcMain.on('compose-cat-card-response', handler);
    mainWindow.webContents.send('compose-cat-card-request', { requestId, code, lang, cardId });
    setTimeout(() => {
      if (settled) return;
      ipcMain.removeListener('compose-cat-card-response', handler);
      resolve(null);
    }, 8000);
  });
}

function createBackup(reason) {
  try {
    const backupDir = getBackupDir();
    fs.mkdirSync(backupDir, { recursive: true });
    const dataDir = getDataDir();
    const dbFile = path.join(dataDir, 'loyalty.db');
    if (!fs.existsSync(dbFile)) return;

    const stamp = new Date().toISOString().slice(0, 10);
    const suffix = reason ? `${stamp}-${reason}` : stamp;
    const dbDest = path.join(backupDir, `loyalty-${suffix}.db`);

    if (!fs.existsSync(dbDest)) {
      fs.copyFileSync(dbFile, dbDest);
      if (db) db.saveSettings({ backup_last_ok: new Date().toISOString(), backup_last_error: '' });
      // Копируем и картинки карточек вместе с базой — без них загруженные вручную
      // открытки (редактор "Дизайн карточек") при восстановлении из бэкапа пропадут,
      // хотя записи о них в базе останутся ("файл потерян").
      const catCardsSrc = path.join(dataDir, 'cat-cards');
      const catCardsDest = path.join(backupDir, `cat-cards-${suffix}`);
      if (fs.existsSync(catCardsSrc)) {
        fs.cpSync(catCardsSrc, catCardsDest, { recursive: true });
      }
    }

    // Держим только последние MAX_BACKUPS ежедневных копий — и базы, и соответствующих
    // им картинок карточек (именные копии с reason, например "before-reset", не трогаем).
    const daily = fs.readdirSync(backupDir)
      .filter(f => /^loyalty-\d{4}-\d{2}-\d{2}\.db$/.test(f))
      .sort();
    while (daily.length > MAX_BACKUPS) {
      const old = daily.shift();
      const oldStamp = old.replace(/^loyalty-/, '').replace(/\.db$/, '');
      fs.unlinkSync(path.join(backupDir, old));
      const oldCatCards = path.join(backupDir, `cat-cards-${oldStamp}`);
      if (fs.existsSync(oldCatCards)) fs.rmSync(oldCatCards, { recursive: true, force: true });
    }
  } catch (err) {
    console.log('[Backup] Не удалось создать резервную копию:', err.message);
  }
}

// ---------- доступ к камере на macOS ----------
// На Windows этого шага не требуется — доступ к камере разрешается достаточно
// обработчиками разрешений Electron ниже. На macOS же есть ОТДЕЛЬНАЯ системная
// проверка (TCC), которую Electron сам не запрашивает автоматически — без явного
// вызова askForMediaAccess() камера в собранном приложении (после `npm run dist`)
// может не подключаться, даже если в режиме разработки (`npm start`) всё работало.
async function requestCameraPermission() {
  if (process.platform !== 'darwin') return true;
  try {
    const status = systemPreferences.getMediaAccessStatus('camera');
    console.log('[camera] macOS camera permission status:', status);
    if (status === 'granted') return true;
    if (status === 'denied' || status === 'restricted') {
      console.warn('[camera] Camera permission is ' + status + ' in macOS settings');
      return false;
    }
    if (status === 'not-determined') {
      const granted = await systemPreferences.askForMediaAccess('camera');
      console.log('[camera] macOS camera permission result:', granted);
      return granted;
    }
    return false;
  } catch (err) {
    console.error('[camera] Permission request failed:', err);
    return false;
  }
}

// ---------- Telegram Bot API (свой бот на каждый бизнес — см. README) ----------
// Ничего стороннего не подключаем — Bot API прекрасно работает обычными HTTPS-запросами.
function telegramApiCall(token, method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(params || {});
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/${method}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (err) { reject(err); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.write(body);
    req.end();
  });
}

// Фоновое long-polling ожидание сообщений от клиентов боту (в первую очередь — команды
// /start <код>, которой клиент подтверждает привязку своего Telegram к своей карте).
// Один бот — один бизнес, поэтому один процесс приложения слушает ровно один токен.
let telegramPollingEnabled = false;
let telegramUpdateOffset = 0;

// 2.17: общий бот для нескольких точек. Подключения клиентов принимает только одно устройство (то, где бота
// подключили, — telegram_poll ≠ '0'): Telegram не даёт двум программам одновременно читать сообщения одного бота.
// Код из /start, которого ещё нет в базе (клиента записали в другой точке, общая база придёт через пару минут),
// не теряем — повторяем после каждой синхронизации в течение 30 минут.
const tgPendingStarts = [];

// ---------- 2.18: уведомления (центр уведомлений в окне + системные уведомления Windows/macOS/Android) ----------
// События: клиент подключил Telegram, новая регистрация (Wi-Fi / по ссылке), дни рождения сегодня, точка сети не на связи.
// Хранятся локально в notices.json (последние 50) — в общую базу не попадают: у каждого устройства свои.
const NOTICE_TEXT = {
  ru: { book: (d) => d.cancelled ? `Запись отменена: ${d.name} (${d.when})` : `Новая запись: ${d.name} — ${d.when}`, review: (d) => `Отзыв: ${d.name} — ${'★'.repeat(Math.max(1, Math.min(5, Number(d.rating) || 0)))}${d.comment ? ' (с комментарием)' : ''}`, ref: (d) => `${d.friend} пришёл(ла) по приглашению ${d.name} — бонус начислен`, tg: (d) => `${d.name} подключил(а) Telegram`, reg: (d) => `Новый клиент: ${d.name}${d.via === 'online' ? ' (по ссылке)' : ''}`, bday: (d) => (d.count === 1 ? `Сегодня день рождения: ${d.names}` : `Сегодня ${d.count} дня рождения: ${d.names}`), offline: (d) => `Точка «${d.point}» не на связи больше суток`, title: 'Loya' },
  uk: { book: (d) => d.cancelled ? `Запис скасовано: ${d.name} (${d.when})` : `Новий запис: ${d.name} — ${d.when}`, review: (d) => `Відгук: ${d.name} — ${'★'.repeat(Math.max(1, Math.min(5, Number(d.rating) || 0)))}${d.comment ? ' (з коментарем)' : ''}`, ref: (d) => `${d.friend} прийшов(ла) за запрошенням ${d.name} — бонус нараховано`, tg: (d) => `${d.name} підключив(ла) Telegram`, reg: (d) => `Новий клієнт: ${d.name}${d.via === 'online' ? ' (за посиланням)' : ''}`, bday: (d) => (d.count === 1 ? `Сьогодні день народження: ${d.names}` : `Сьогодні ${d.count} дні народження: ${d.names}`), offline: (d) => `Точка «${d.point}» не на зв'язку понад добу`, title: 'Loya' },
  sk: { book: (d) => d.cancelled ? `Rezervácia zrušená: ${d.name} (${d.when})` : `Nová rezervácia: ${d.name} — ${d.when}`, review: (d) => `Hodnotenie: ${d.name} — ${'★'.repeat(Math.max(1, Math.min(5, Number(d.rating) || 0)))}${d.comment ? ' (s komentárom)' : ''}`, ref: (d) => `${d.friend} prišiel(-la) na pozvanie ${d.name} — bonus pripísaný`, tg: (d) => `${d.name} pripojil(a) Telegram`, reg: (d) => `Nový zákazník: ${d.name}${d.via === 'online' ? ' (cez odkaz)' : ''}`, bday: (d) => (d.count === 1 ? `Dnes má narodeniny: ${d.names}` : `Dnes má narodeniny ${d.count} zákazníkov: ${d.names}`), offline: (d) => `Prevádzka „${d.point}“ nie je online viac ako deň`, title: 'Loya' },
  en: { book: (d) => d.cancelled ? `Booking cancelled: ${d.name} (${d.when})` : `New booking: ${d.name} — ${d.when}`, review: (d) => `Review: ${d.name} — ${'★'.repeat(Math.max(1, Math.min(5, Number(d.rating) || 0)))}${d.comment ? ' (with comment)' : ''}`, ref: (d) => `${d.friend} came on ${d.name}’s invitation — bonus added`, tg: (d) => `${d.name} connected Telegram`, reg: (d) => `New customer: ${d.name}${d.via === 'online' ? ' (via link)' : ''}`, bday: (d) => (d.count === 1 ? `Birthday today: ${d.names}` : `${d.count} birthdays today: ${d.names}`), offline: (d) => `Location “${d.point}” has been offline for over a day`, title: 'Loya' }
};
const NOTICE_KINDS = ['tg', 'reg', 'bday', 'offline', 'book', 'review', 'ref'];
const noticesFile = () => path.join(app.getPath('userData'), 'notices.json');
let noticesCache = null;
function loadNotices() {
  if (noticesCache) return noticesCache;
  try { const j = JSON.parse(fs.readFileSync(noticesFile(), 'utf8')); noticesCache = { list: Array.isArray(j.list) ? j.list.slice(0, 50) : [], meta: j.meta && typeof j.meta === 'object' ? j.meta : {} }; }
  catch (e) { noticesCache = { list: [], meta: {} }; }
  return noticesCache;
}
function saveNotices() { try { fs.writeFileSync(noticesFile(), JSON.stringify(loadNotices())); } catch (e) { /* не критично */ } }
const noticesMeta = () => loadNotices().meta;
function saveNoticesMeta(m) { loadNotices().meta = m; saveNotices(); }
function noticeText(n, lang) { const L = NOTICE_TEXT[lang] || NOTICE_TEXT.ru; const f = L[n.kind]; return f ? f(n.data || {}) : ''; }
function notice(kind, data) {
  if (!NOTICE_KINDS.includes(kind)) return null;
  const st = loadNotices();
  const n = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind, data: data || {}, at: new Date().toISOString(), read: false };
  st.list.unshift(n); st.list = st.list.slice(0, 50); saveNotices();
  const s = db.getSettings();
  if (s['notify_' + kind] === '0') { n.read = true; saveNotices(); return n; }
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('app-notice', n);
  // Системное уведомление — только когда окно свёрнуто/в фоне (в открытом окне хватает колокольчика).
  if (s.notify_system !== '0') {
    const text = noticeText(n, s.app_language || 'ru');
    try {
      const hidden = !mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible() || mainWindow.isMinimized() || !mainWindow.isFocused();
      const host = globalThis.__LOYA_HOST;
      if (host && host.notify) host.notify(n.id, s.brand_name || 'Loya', text);
      else if (hidden) {
        const { Notification } = require('electron');
        if (Notification && Notification.isSupported()) {
          const sys = new Notification({ title: s.brand_name || 'Loya', body: text, silent: false });
          sys.on('click', () => { try { if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); mainWindow.webContents.send('app-notice-open', n.id); } } catch (e) { /* окно закрыто */ } });
          sys.show();
        }
      }
    } catch (e) { /* системные уведомления недоступны */ }
  }
  return n;
}
// Дни рождения — раз в день (первая проверка через минуту после запуска, дальше раз в час: вдруг программа работает с вечера).
function checkBirthdayNotice() {
  try {
    const d = new Date(); const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const meta = noticesMeta(); if (meta.bday === today || d.getHours() < 7) return;
    if (db.getSettings().onboarding_completed !== '1') return;
    const list = db.getTodayBirthdays() || [];
    meta.bday = today; saveNoticesMeta(meta);
    if (!list.length) return;
    const names = list.slice(0, 3).map((c) => c.name).join(', ') + (list.length > 3 ? ' …' : '');
    notice('bday', { count: list.length, names, ids: list.slice(0, 20).map((c) => c.id) });
  } catch (e) { /* база ещё не открыта */ }
}
setTimeout(checkBirthdayNotice, 60000);
setInterval(checkBirthdayNotice, 60 * 60 * 1000);
ipcMain.handle('notices:list', () => { const st = loadNotices(); const lang = db.getSettings().app_language || 'ru'; return st.list.map((n) => ({ ...n, text: noticeText(n, lang) })); });
ipcMain.handle('notices:read', (e, id) => { const st = loadNotices(); st.list.forEach((n) => { if (!id || n.id === id) n.read = true; }); saveNotices(); return { ok: true }; });
ipcMain.handle('notices:clear', () => { loadNotices().list = []; saveNotices(); return { ok: true }; });
function tgLinkStart(code, chatId) {
  const client = db.getClientByTelegramLinkCode(code);
  if (!client) return false;
  const settings = db.getSettings(); const token = settings.telegram_bot_token;
  const wasLinked = !!client.telegram_chat_id;
  db.setClientTelegramChatId(client.id, String(chatId));
  if (!wasLinked) notice('tg', { name: client.name, clientId: client.id });
  const brandName = settings.brand_name || 'Loya';
  const niche = getNiche(settings.business_niche || 'coffee');
  const lang = client.preferred_language || settings.app_language || 'ru';
  const welcomeText = TELEGRAM_WELCOME_TEXT[lang] ? TELEGRAM_WELCOME_TEXT[lang](brandName, client.name, niche.emoji) : TELEGRAM_WELCOME_TEXT.ru(brandName, client.name, niche.emoji);
  telegramApiCall(token, 'sendMessage', { chat_id: chatId, text: welcomeText }).catch(() => {}).then(async () => {
    const cards = db.getCardsByClient(client.id);
    if (!cards.length) return;
    let img = null;
    try { img = await composeCatCardViaRenderer(cards[0].code, lang, cards[0].id); } catch (e) { /* ниже будет обычный QR */ }
    await sendCardTelegramNow(cards[0].id, lang, img).catch(() => {});
  });
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('remote-data-changed');
  return true;
}
function tgRetryPending() {
  const now = Date.now();
  for (let i = tgPendingStarts.length - 1; i >= 0; i--) {
    const p = tgPendingStarts[i];
    if (now - p.at > 30 * 60000 || tgLinkStart(p.code, p.chatId)) tgPendingStarts.splice(i, 1);
  }
}
async function telegramPollLoop() {
  if (!telegramPollingEnabled) return;
  const settings = db.getSettings();
  const token = settings.telegram_bot_token;
  if (!token || settings.telegram_poll === '0') { telegramPollingEnabled = false; return; }
  try {
    const result = await telegramApiCall(token, 'getUpdates', { offset: telegramUpdateOffset, timeout: 25 });
    if (result && result.ok && Array.isArray(result.result)) {
      for (const update of result.result) {
        telegramUpdateOffset = update.update_id + 1;
        const msg = update.message;
        if (msg && msg.text && msg.text.indexOf('/start') === 0) {
          const code = msg.text.split(' ')[1];
          if (code && /^[A-Za-z0-9_-]{4,64}$/.test(code) && !tgLinkStart(code, msg.chat.id) && tgPendingStarts.length < 200) tgPendingStarts.push({ code, chatId: msg.chat.id, at: Date.now() });
        }
      }
    }
  } catch (err) {
    // Нет интернета или Telegram недоступен — не страшно, просто попробуем ещё раз чуть позже.
  }
  if (telegramPollingEnabled) setTimeout(telegramPollLoop, 1200);
}

function startTelegramPolling() {
  if (telegramPollingEnabled) return;
  telegramPollingEnabled = true;
  telegramUpdateOffset = 0;
  telegramPollLoop();
}

const TELEGRAM_WELCOME_TEXT = {
  ru: (brand, name, emoji) => `👋 Здравствуйте, ${name}!\n\nВы успешно подключили Telegram к ${brand} ${emoji}\n\nТеперь мы будем присылать вам сюда напоминания, бонусы и приятные новости — коротко и по делу, без спама.\n\nРады, что вы с нами! ❤️`,
  sk: (brand, name, emoji) => `👋 Dobrý deň, ${name}!\n\nÚspešne ste si prepojili Telegram s ${brand} ${emoji}\n\nOd teraz vám sem budeme posielať pripomienky, bonusy a milé novinky — stručne a k veci, žiadny spam.\n\nSme radi, že ste s nami! ❤️`,
  uk: (brand, name, emoji) => `👋 Доброго дня, ${name}!\n\nВи успішно підключили Telegram до ${brand} ${emoji}\n\nТепер ми надсилатимемо вам сюди нагадування, бонуси та приємні новини — коротко і по суті, без спаму.\n\nРаді, що ви з нами! ❤️`,
  en: (brand, name, emoji) => `👋 Hi, ${name}!\n\nYou've successfully connected Telegram with ${brand} ${emoji}\n\nFrom now on we'll send you reminders, perks and nice updates right here — short and to the point, no spam.\n\nGlad to have you with us! ❤️`
};

// ---------- Google Wallet ("Сохранить в Google Wallet") ----------
// Никаких сторонних библиотек (googleapis и т.п.) — подписываем JWT вручную через
// встроенный crypto. Всё, что нужно от Google — Issuer ID и JSON-ключ сервисного
// аккаунта из Google Wallet Business Console (получает и вставляет в настройки сам
// владелец бизнеса — так же, как с Telegram-токеном).
function base64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signGoogleWalletJwt(serviceAccount, payload) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(serviceAccount.private_key);
  return `${unsigned}.${base64url(signature)}`;
}

// Один класс на бизнес (общий дизайн для всех карт этого бизнеса), один объект на
// конкретную карту клиента. И то, и другое — просто данные внутри самого JWT, отдельного
// сетевого запроса к Google не требуется — Google сам создаёт класс/объект по этим данным
// в момент, когда клиент нажимает "Сохранить" по ссылке.
function buildGoogleWalletSaveLink(settings, card) {
  if (!settings.google_wallet_issuer_id || !settings.google_wallet_service_account_json) return null;
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(settings.google_wallet_service_account_json);
  } catch (err) {
    return null;
  }
  const issuerId = settings.google_wallet_issuer_id;
  const brandName = settings.brand_name || 'Loya';
  const classId = `${issuerId}.loya_class`;
  const objectId = `${issuerId}.loya_card_${card.id}`;
  const bgColor = settings.theme_primary || '#a9682f';

  // Подписи на карте в Wallet — на языке клиента (4 языка), с учётом всех трёх типов карт.
  const WALLET_TEXT = {
    ru: { discount: 'Скидочная карта', stamp: 'Карта лояльности', spend: 'Накопительная карта', hDiscount: 'Скидка', hProgress: 'Прогресс', hSpent: 'Потрачено' },
    uk: { discount: 'Знижкова картка', stamp: 'Картка лояльності', spend: 'Накопичувальна картка', hDiscount: 'Знижка', hProgress: 'Прогрес', hSpent: 'Витрачено' },
    sk: { discount: 'Zľavová karta', stamp: 'Vernostná karta', spend: 'Vernostná karta na nákupy', hDiscount: 'Zľava', hProgress: 'Postup', hSpent: 'Minuté' },
    en: { discount: 'Discount card', stamp: 'Loyalty card', spend: 'Spend card', hDiscount: 'Discount', hProgress: 'Progress', hSpent: 'Spent' }
  };
  const wlang = WALLET_TEXT[card.client_language] ? card.client_language : (WALLET_TEXT[settings.app_language] ? settings.app_language : 'ru');
  const W = WALLET_TEXT[wlang];
  const walletCur = { EUR: '€', USD: '$', RUB: '₽', UAH: '₴', CZK: 'Kč', PLN: 'zł', HUF: 'Ft', GBP: '£', CHF: 'CHF' }[settings.spend_currency] || '€';
  const walletMoney = (v) => { const n = Math.round((Number(v) || 0) * 100) / 100; const t = Number.isInteger(n) ? String(n) : n.toFixed(2); return wlang === 'en' ? walletCur + t : t + ' ' + walletCur; };
  const isDiscount = card.type === 'discount';
  const isSpend = card.type === 'spend';
  const isGift = card.type === 'gift';
  const progressText = isGift ? `${walletMoney(card.gift_balance)} / ${walletMoney(card.gift_amount)}` : isDiscount
    ? `-${card.discount_percent}%`
    : isSpend
      ? (Number(card.spend_target) > 0 ? `${walletMoney(card.spend_accumulated)} / ${walletMoney(card.spend_target)}` : walletMoney(card.spend_accumulated))
      : `${card.stamp_count} / ${card.stamp_target}`;

  const genericObject = {
    id: objectId,
    classId,
    genericType: 'GENERIC_TYPE_UNSPECIFIED',
    hexBackgroundColor: bgColor,
    cardTitle: { defaultValue: { language: wlang, value: brandName } },
    subheader: { defaultValue: { language: wlang, value: card.title || (isGift ? ({ ru: 'Подарочный сертификат', uk: 'Подарунковий сертифікат', sk: 'Darčeková poukážka', en: 'Gift card' })[wlang] : isDiscount ? W.discount : isSpend ? W.spend : W.stamp) } },
    header: { defaultValue: { language: wlang, value: card.client_name } },
    textModulesData: [
      { id: 'progress', header: isGift ? ({ ru: 'Остаток', uk: 'Залишок', sk: 'Zostatok', en: 'Balance' })[wlang] : isDiscount ? W.hDiscount : isSpend ? W.hSpent : W.hProgress, body: progressText }
    ].concat(isSpend && Number(card.spend_target) > 0 ? [{ id: 'bonus', header: ({ ru: 'Бонусы', uk: 'Бонуси', sk: 'Bonusy', en: 'Bonuses' })[wlang] || 'Bonuses', body: String(Math.round(Number(card.bonus_balance) || 0)) }] : []),
    barcode: { type: 'QR_CODE', value: card.code, alternateText: card.code }
  };

  const payload = {
    iss: serviceAccount.client_email,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    origins: [],
    payload: { genericObjects: [genericObject] }
  };

  const jwt = signGoogleWalletJwt(serviceAccount, payload);
  return `https://pay.google.com/gp/v/save/${jwt}`;
}

// ---------- Google Wallet через сайт Loya (по умолчанию) ----------
// Бизнесу ничего настраивать не нужно: при активной подписке карты выпускает сервер Loya
// (ключ Google хранится только там). Если бизнес подключил СВОЙ аккаунт Google Wallet в
// настройках — используем его, как раньше.
function walletCardPayload(card, settings) {
  return {
    card: {
      code: card.code, type: card.type, title: card.title || '', client_name: card.client_name || '',
      lang: card.client_language || settings.app_language || 'ru',
      stamp_count: card.stamp_count, stamp_target: card.stamp_target, discount_percent: card.discount_percent,
      spend_accumulated: card.spend_accumulated, spend_target: card.spend_target,
      bonus_balance: Math.round(Number(card.bonus_balance) || 0), spend_bonus_points: Number(card.spend_bonus_points) || 1,
      // 2.19: уровень клиента (если включены привилегии уровней), сертификат (номинал/остаток/срок)
      ...(walletTier(card, settings) ? { tier: walletTier(card, settings) } : {}),
      ...(walletNextTier(card, settings) || {}),
      ...(card.type === 'gift' ? { gift_amount: Number(card.gift_amount) || 0, gift_balance: Math.round((Number(card.gift_balance) || 0) * 100) / 100, expires_at: card.expires_at || '' } : {}),
      // 2.20: личная ссылка «Приведи друга» на обороте карты
      ...(grow && card.client_id && card.type !== 'gift' && !card.single_use ? (() => { try { const u = grow.inviteUrl(card.client_id); return u ? { invite_url: u } : {}; } catch (e) { return {}; } })() : {})
    },
    brand: { name: settings.brand_name || 'Loya', color: settings.theme_primary || '#b8862d', currency: settings.spend_currency || 'EUR', niche: settings.business_niche || 'other', ...(walletGeo(settings) ? { geo: walletGeo(settings) } : {}), look: 1, ...walletLook(settings) }
  };
}
// 2.27: вид карты в Wallet — значок штампа и подарка, цвет штампов, раскладка, сезонное оформление, подпись счётчика.
function walletLook(s) {
  return LoyaCardModel.cleanLook({ stamp: s.wallet_stamp_icon, reward: s.wallet_reward_icon, stampColor: s.wallet_stamp_color, layout: s.wallet_layout, season: s.wallet_season, label: s.wallet_stamp_label,
    arrange: s.wallet_arrange, logoMode: s.wallet_logo_mode, logoSize: s.wallet_logo_size, logoRot: s.wallet_logo_rot, logoX: s.wallet_logo_x, logoY: s.wallet_logo_y, logoFlip: s.wallet_logo_flip });
}
// «Сезон по календарю»: когда наступает новый праздник или время года — перерисовываем карты гостей.
function walletSeasonTick() {
  try {
    const s = db.getSettings();
    if (s.wallet_season !== 'auto' || !s.license_key) return;
    const now = LoyaCardModel.seasonFor(new Date());
    if (s.wallet_season_applied === now) return;
    db.saveSettings({ wallet_season_applied: now });
    if (s.wallet_season_applied) refreshAllWalletCards();
  } catch (e) { /* в следующий раз */ }
}
setTimeout(walletSeasonTick, 90 * 1000); setInterval(walletSeasonTick, 6 * 60 * 60 * 1000);
// 2.25: уровень на карте — по желанию владельца («Дизайн карты → Что показывать»). Раньше — всегда при включённых привилегиях.
function walletTier(card, settings) {
  const show = settings.wallet_show_tier === '1' || (settings.wallet_show_tier !== '0' && settings.tier_perks_on === '1');
  if (!show || card.type === 'gift' || !card.client_id) return '';
  try { return db._clientTier(card.client_id); } catch (e) { return ''; }
}
// «Сколько осталось до следующего уровня» (визитов) — тоже по желанию владельца.
function walletNextTier(card, settings) {
  if (settings.wallet_show_next !== '1' || card.type === 'gift' || !card.client_id) return null;
  try {
    const cfg = db.tierConfig(settings);
    const r = db.get(`SELECT lifetime_purchases AS n FROM clients WHERE id = ?`, [card.client_id]); const n = (r && r.n) || 0;
    if (n >= cfg.gold) return null;
    return n >= cfg.silver ? { tier_next: 'gold', tier_next_left: cfg.gold - n } : { tier_next: 'silver', tier_next_left: cfg.silver - n };
  } catch (e) { return null; }
}
let lastWalletError = '', lastWalletDetail = '';
async function getWalletSaveLink(card) {
  lastWalletError = ''; lastWalletDetail = '';
  const settings = db.getSettings();
  if (settings.google_wallet_issuer_id && settings.google_wallet_service_account_json) {
    const link = buildGoogleWalletSaveLink(settings, card);
    if (link) db.markWalletLinked(card.id);
    return link;
  }
  if (!settings.license_key) return null;
  try {
    const res = await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/wallet-link`, { licenseKey: settings.license_key, ...walletCardPayload(card, settings) });
    if (res && res.link) { db.markWalletLinked(card.id); return res.link; }
    lastWalletError = (res && res.error) || 'failed'; lastWalletDetail = (res && res.detail) || '';
  } catch (err) { lastWalletError = 'network'; /* нет интернета — кнопку просто не показываем */ }
  return null;
}
// Apple Wallet: ссылка на карту для iPhone. Работает, когда на сайте Loya подключён аккаунт
// Apple Developer (переменные APPLE_* в Vercel). Пока его нет — сервер отвечает
// apple_not_configured, и кнопка Apple просто не показывается.
let lastAppleError = '', lastWebCard = '';
async function getAppleWalletLink(card) {
  lastAppleError = ''; lastWebCard = '';
  const settings = db.getSettings();
  if (!settings.license_key) { lastAppleError = 'need_license'; return null; }
  try {
    const res = await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/apple-link`, { licenseKey: settings.license_key, ...walletCardPayload(card, settings) });
    if (res && typeof res.web === 'string' && /^https:\/\/[^\s"<>]+$/.test(res.web)) lastWebCard = res.web;   // 2.30: карта в браузере
    if (res && res.link) { db.markWalletLinked(card.id); return res.link; }
    lastAppleError = (res && res.error) || 'failed';
  } catch (err) { lastAppleError = 'network'; }
  return null;
}
async function getWalletLinks(card) {
  const [google, apple] = await Promise.all([getWalletSaveLink(card).catch(() => null), getAppleWalletLink(card).catch(() => null)]);
  return { google, apple, web: lastWebCard || null };
}
function walletKeyboard(links, lang) {
  const row = [];
  if (links.apple) row.push([{ text: '📱 ' + (APPLE_BTN[lang] || APPLE_BTN.ru).btn, url: links.apple }]);
  if (links.google) row.push([{ text: '💳 ' + (WALLET_BTN[lang] || WALLET_BTN.ru).btn, url: links.google }]);
  if (links.web) row.push([{ text: '🌐 ' + (WEB_CARD[lang] || WEB_CARD.en), url: links.web }]);
  return row.length ? { inline_keyboard: row } : null;
}

// Ручная отправка ссылки «Добавить в Google Wallet» — на email, в Telegram или просто скопировать.
const WALLET_MSG = {
  ru: { subject: (b) => `Ваша карта в Google Wallet — ${b}`, text: (n, b) => `Здравствуйте, ${n}! Добавьте карту «${b}» в Google Wallet — она будет всегда под рукой и сама обновится после покупок.`, tg: (b) => `💳 Ваша карта «${b}» в Google Wallet — добавьте её в телефон одним нажатием:` },
  uk: { subject: (b) => `Ваша картка в Google Wallet — ${b}`, text: (n, b) => `Вітаємо, ${n}! Додайте картку «${b}» у Google Wallet — вона завжди буде під рукою й сама оновиться після покупок.`, tg: (b) => `💳 Ваша картка «${b}» у Google Wallet — додайте її в телефон одним дотиком:` },
  sk: { subject: (b) => `Vaša karta v Google Wallet — ${b}`, text: (n, b) => `Dobrý deň, ${n}! Pridajte si kartu „${b}“ do Google Wallet — bude vždy po ruke a po nákupoch sa sama aktualizuje.`, tg: (b) => `💳 Vaša karta „${b}“ v Google Wallet — pridajte si ju do telefónu jedným ťuknutím:` },
  en: { subject: (b) => `Your card in Google Wallet — ${b}`, text: (n, b) => `Hello ${n}! Add your “${b}” card to Google Wallet — it will always be at hand and update itself after purchases.`, tg: (b) => `💳 Your “${b}” card in Google Wallet — add it to your phone in one tap:` }
};
function escHtml(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

ipcMain.handle('wallet:sendLink', async (e, cardId, channel, lang) => {
  const settings = db.getSettings();
  const card = db.getCardById(cardId);
  if (!card) return { error: 'not_found' };
  lang = WALLET_MSG[lang] ? lang : 'ru';
  const links = await getWalletLinks(card);
  const link = links.google || links.apple;
  if (!link) {
    if (!settings.license_key) return { error: 'need_license' };
    if (lastWalletError === 'wallet_rejected') return { error: 'wallet_rejected', detail: lastWalletDetail };
    return { error: lastWalletError === 'license_inactive' ? 'license_inactive' : lastWalletError === 'wallet_not_configured' ? 'wallet_server' : lastWalletError === 'network' ? 'network' : 'wallet_unavailable' };
  }
  if (channel === 'copy') return { ok: true, link: [links.google && 'Google Wallet: ' + links.google, links.apple && 'Apple Wallet: ' + links.apple].filter(Boolean).join('\n') };
  const brand = getBrandContext(lang).brandName;
  const M = WALLET_MSG[lang];
  try {
    if (channel === 'email') {
      if (!card.client_email) return { error: 'no_client_email' };
      if (!mailReady(settings)) return { error: mailMode(settings) === 'custom' ? 'not_configured' : 'need_license' };
      const mBrand = mailBrand(settings, lang);
      const html = mailShell(`<p>${escHtml(M.text(card.client_name || '', brand))}</p>` + appleButtonHtml(links.apple, lang) + walletButtonHtml(links.google, lang) + webCardLinkHtml(links.web, lang), mBrand, lang);
      await createTransporter(settings).sendMail({ from: mailFrom(settings), to: card.client_email, subject: M.subject(brand), html, attachments: [...walletBadgeAttachments(links, lang), ...mailBrandAttachments(mBrand)] });
      return { ok: true };
    }
    if (channel === 'telegram') {
      if (!settings.telegram_bot_token) return { error: 'telegram_not_connected' };
      const client = db.getClient(card.client_id);
      if (!client || !client.telegram_chat_id) return { error: 'telegram_not_linked' };
      await telegramApiCall(settings.telegram_bot_token, 'sendMessage', {
        chat_id: client.telegram_chat_id, text: M.tg(brand),
        reply_markup: walletKeyboard(links, lang)
      });
      return { ok: true };
    }
  } catch (err) { return { error: err.message || 'send_failed' }; }
  return { error: 'bad_channel' };
});

// ---------- Свой дизайн карт в Google Wallet и Apple Wallet ----------
// Логотип (PNG, квадрат) и баннер (JPEG 1032×336) лежат файлами рядом с базой; на сервер Loya
// отправляются при сохранении. Цвет фона и «штампы поверх картинки» — в настройках.
const WALLET_FILES = { logo: 'wallet-logo.png', hero: 'wallet-hero.jpg' };
function walletFile(kind) { return path.join(getDataDir(), WALLET_FILES[kind]); }
function readWalletImage(kind) {
  try { const b = fs.readFileSync(walletFile(kind)); return `data:${kind === 'logo' ? 'image/png' : 'image/jpeg'};base64,${b.toString('base64')}`; } catch (e) { return null; }
}
function walletDesignState() {
  const s = db.getSettings();
  return {
    logo: readWalletImage('logo'), hero: readWalletImage('hero'),
    bgColor: /^#[0-9a-fA-F]{6}$/.test(s.wallet_bg || '') ? s.wallet_bg : '',
    heroStamps: s.wallet_hero_stamps !== '0',
    synced: s.wallet_design_pending !== '1', hasLicense: !!s.license_key, look: walletLook(s),
    brandName: s.brand_name || 'Loya', brandColor: s.theme_primary || '#d4af37', niche: s.business_niche || 'other'
  };
}
let walletRefreshRunning = false;
// Новый дизайн — и для уже добавленных карт: по очереди обновляем каждую (Google — PATCH, Apple — push).
async function refreshAllWalletCards() {
  if (walletRefreshRunning) return;
  walletRefreshRunning = true;
  try {
    const settings = db.getSettings();
    if (!settings.license_key || (settings.google_wallet_issuer_id && settings.google_wallet_service_account_json)) return;
    const cards = (db.getCards() || []).filter(c => c.wallet_linked).slice(0, 2000);
    for (const c of cards) {
      try { await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/wallet-update`, { licenseKey: settings.license_key, ...walletCardPayload(db.getCardById(c.id) || c, settings) }); } catch (err) { /* следующая */ }
      await new Promise(r => setTimeout(r, 350));
    }
  } finally { walletRefreshRunning = false; }
}
async function uploadWalletDesign(patch) {
  const s = db.getSettings();
  if (!s.license_key) return { error: 'need_license' };
  try {
    const r = await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/wallet?action=design`, { licenseKey: s.license_key, op: 'save', ...patch });
    if (r && r.ok) { db.saveSettings({ wallet_design_pending: '0', wallet_design_ver: String(r.ver || '') }); refreshAllWalletCards(); return { ok: true }; }
    return { error: (r && r.error) || 'failed' };
  } catch (err) { return { error: 'network' }; }
}
// Сохранили дизайн без подписки или без интернета — отправим, как только появятся.
function retryWalletDesignUpload() {
  const s = db.getSettings();
  if (s.wallet_design_pending !== '1' || !s.license_key) return;
  uploadWalletDesign({ bgColor: /^#[0-9a-fA-F]{6}$/.test(s.wallet_bg || '') ? s.wallet_bg : null, heroStamps: s.wallet_hero_stamps !== '0', logo: readWalletImage('logo'), hero: readWalletImage('hero') }).catch(() => {});
}
setInterval(() => { try { if (db) retryWalletDesignUpload(); } catch (e) { /* позже */ } }, 30 * 60 * 1000);
// ---------- Библиотека для камеры (jsQR): копия на диске, чтобы камера работала и без интернета ----------
// Окно загружает jsQR из интернета (CDN). Если при запуске интернета нет — берём сохранённую копию.
// jsQR лежит внутри программы (src/vendor/jsQR.js): раньше копия скачивалась из интернета и подключалась как код.
ipcMain.handle('libs:jsqr', () => null);
// Логотип заведения (показывается в шапке программы вместо эмодзи вида бизнеса).
const BRAND_LOGO_FILE = 'brand-logo.png';
ipcMain.handle('brandLogo:get', () => {
  try { return 'data:image/png;base64,' + fs.readFileSync(path.join(getDataDir(), BRAND_LOGO_FILE)).toString('base64'); } catch (e) { return null; }
});
ipcMain.handle('brandLogo:save', (e, dataUrl) => {
  if (sessionRole() !== 'owner') return { error: 'no_access' };
  return saveBrandLogo(dataUrl);
});
function saveBrandLogo(dataUrl) {
  const file = path.join(getDataDir(), BRAND_LOGO_FILE);
  if (dataUrl === null) { try { fs.unlinkSync(file); } catch (err) { /* не было */ } scheduleProfilePublish(); return { ok: true }; }
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return { error: 'bad_image' };
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length > 700 * 1024 || buf.slice(1, 4).toString() !== 'PNG') return { error: 'bad_image' };
  fs.writeFileSync(file, buf);
  scheduleProfilePublish();
  return { ok: true };
}
// 2.25: свой фон страниц для гостей (регистрация по QR и по ссылке, акция, запись, отзыв). JPEG до 450 КБ.
const PAGE_BG_FILE = 'page-bg.jpg';
ipcMain.handle('pageBg:get', () => { try { return 'data:image/jpeg;base64,' + fs.readFileSync(path.join(getDataDir(), PAGE_BG_FILE)).toString('base64'); } catch (e) { return null; } });
ipcMain.handle('pageBg:save', (e, dataUrl) => { if (sessionRole() !== 'owner') return { error: 'no_access' }; return savePageBg(dataUrl); });
function savePageBg(dataUrl) {
  const file = path.join(getDataDir(), PAGE_BG_FILE);
  if (dataUrl === null) { try { fs.unlinkSync(file); } catch (err) { /* не было */ } scheduleProfilePublish(); return { ok: true }; }
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return { error: 'bad_image' };
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length > 480 * 1024) return { error: 'too_big' };
  fs.writeFileSync(file, buf);
  scheduleProfilePublish();
  return { ok: true };
}
function regPageBg() { try { const b = fs.readFileSync(path.join(getDataDir(), PAGE_BG_FILE)); return b.length < 460 * 1024 ? 'data:image/jpeg;base64,' + b.toString('base64') : ''; } catch (e) { return ''; } }
// Свой фон афиши для стойки (JPEG до 3 МБ).
const POSTER_BG_FILE = 'poster-bg.jpg';
ipcMain.handle('posterBg:get', () => {
  try { return 'data:image/jpeg;base64,' + fs.readFileSync(path.join(getDataDir(), POSTER_BG_FILE)).toString('base64'); } catch (e) { return null; }
});
ipcMain.handle('posterBg:save', (e, dataUrl) => {
  if (sessionRole() === 'cashier') return { error: 'no_access' };
  const file = path.join(getDataDir(), POSTER_BG_FILE);
  if (dataUrl === null) { try { fs.unlinkSync(file); } catch (err) { /* не было */ } return { ok: true }; }
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return { error: 'bad_image' };
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length > 3 * 1024 * 1024 || buf[0] !== 0xff || buf[1] !== 0xd8) return { error: 'bad_image' };
  fs.writeFileSync(file, buf);
  return { ok: true };
});
ipcMain.handle('walletDesign:get', () => walletDesignState());
// payload.logo / payload.hero: data-URL — заменить, null — убрать, не передано — не трогать.
ipcMain.handle('walletDesign:save', async (e, payload) => {
  if (sessionRole() === 'cashier') return { error: 'no_access' };
  const p = payload || {};
  const patch = {};
  for (const kind of ['logo', 'hero']) {
    if (!(kind in p)) continue;
    if (p[kind] === null) { try { fs.unlinkSync(walletFile(kind)); } catch (err) { /* не было */ } patch[kind] = null; continue; }
    const m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(String(p[kind]));
    if (!m) return { error: 'bad_image' };
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > (kind === 'logo' ? 350 : 600) * 1024) return { error: 'too_big' };
    fs.writeFileSync(walletFile(kind), buf);
    patch[kind] = p[kind];
  }
  const bg = /^#[0-9a-fA-F]{6}$/.test(p.bgColor || '') ? p.bgColor : '';
  db.saveSettings({ wallet_bg: bg, wallet_hero_stamps: p.heroStamps === false ? '0' : '1', wallet_design_pending: '1' });
  if (p.look && typeof p.look === 'object') {
    const lk = LoyaCardModel.cleanLook(p.look);
    db.saveSettings({ wallet_stamp_icon: lk.stamp || '', wallet_reward_icon: lk.reward || '', wallet_stamp_color: lk.stampColor || '', wallet_layout: lk.layout || '', wallet_season: lk.season || '', wallet_stamp_label: lk.label || '',
      wallet_arrange: lk.arrange || '', wallet_logo_mode: lk.logoMode || '', wallet_logo_size: lk.logoSize != null ? String(lk.logoSize) : '', wallet_logo_rot: lk.logoRot ? String(lk.logoRot) : '', wallet_logo_x: lk.logoX != null ? String(lk.logoX) : '', wallet_logo_y: lk.logoY != null ? String(lk.logoY) : '', wallet_logo_flip: lk.logoFlip ? '1' : '', wallet_season_applied: lk.season === 'auto' ? LoyaCardModel.seasonFor(new Date()) : '' });
  }
  patch.bgColor = bg || null; patch.heroStamps = p.heroStamps !== false;
  // Картинки, которые не меняли, тоже отправляем — на случай, если на сервере их ещё нет (первый раз после подписки).
  for (const kind of ['logo', 'hero']) if (!(kind in patch)) { const img = readWalletImage(kind); if (img) patch[kind] = img; }
  const up = await uploadWalletDesign(patch);
  return { ok: true, uploaded: !!up.ok, error: up.error || null };
});

// После скана: если карту уже добавляли в Wallet, обновляем штампы/сумму на телефоне клиента.
const walletUpdateTimers = {};
function pushWalletUpdate(cardId) {
  clearTimeout(walletUpdateTimers[cardId]);
  walletUpdateTimers[cardId] = setTimeout(async () => {
    try {
      const settings = db.getSettings();
      const card = db.getCardById(cardId);
      if (!card || !card.wallet_linked || !settings.license_key) return;
      if (settings.google_wallet_issuer_id && settings.google_wallet_service_account_json) return; // свой аккаунт — без облака
      await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/wallet-update`, { licenseKey: settings.license_key, ...walletCardPayload(card, settings) });
    } catch (err) { /* не критично: обновится при следующем скане */ }
  }, 1500);
}

ipcMain.handle('googleWallet:getSaveLink', async (e, cardId) => {
  const card = db.getCardById(cardId);
  if (!card) return { error: 'not_found' };
  try {
    const link = await getWalletSaveLink(card);
    if (!link) return { error: 'not_configured' };
    return { ok: true, link };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('googleWallet:testConnection', (e, { issuerId, serviceAccountJson }) => {
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    if (!serviceAccount.private_key || !serviceAccount.client_email) {
      return { error: 'invalid_key' };
    }
    // Реальной сетевой проверки без похода в Google Wallet REST API не сделать — но мы
    // можем хотя бы убедиться, что ключ валиден и им получится подписать JWT.
    signGoogleWalletJwt(serviceAccount, { test: true });
    db.saveSettings({ google_wallet_issuer_id: String(issuerId), google_wallet_service_account_json: serviceAccountJson });
    return { ok: true, email: serviceAccount.client_email };
  } catch (err) {
    return { error: err.message };
  }
});

// ---------- обновление по воздуху (auto-update через GitHub Releases) ----------
// Работает только в собранном, установленном приложении (npm run dist → выданный
// установщик) — при запуске через "npm start" в разработке electron-updater ничего
// не делает, это нормально, а не баг. Чтобы выпустить новую версию для пользователей:
// поднять версию в package.json → npm run dist → загрузить содержимое папки release
// (сам .exe И файл latest.yml рядом с ним — без .yml проверка новых версий не работает)
// в Releases репозитория vskyrvt8mb-beep/loya-website на GitHub с тем же номером версии
// как тег. Дальше всё происходит само — уже установленные приложения сами находят,
// скачивают и предлагают поставить обновление в фоне.
// Версия из Microsoft Store: её подписывает и обновляет сам Store — собственный
// механизм обновлений в ней не нужен (и не разрешён правилами Store).
const IS_STORE_BUILD = !!process.windowsStore;

function setupAutoUpdater() {
  if (!app.isPackaged) return; // в разработке (electron .) проверка не имеет смысла
  if (IS_STORE_BUILD) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { status: 'checking' });
    }
  });
  autoUpdater.on('update-available', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { status: 'available', version: info.version });
    }
  });
  autoUpdater.on('update-not-available', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { status: 'not-available' });
    }
  });
  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { status: 'downloading', percent: Math.round(progress.percent) });
    }
  });
  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { status: 'downloaded', version: info.version });
    }
    scheduleQuietInstall();
  });
  autoUpdater.on('error', (err) => {
    // Тихо игнорируем — нет интернета или сервер недоступен не должны мешать
    // работе офлайн-first приложения. Разработчику видно в консоли при желании.
    console.log('[Loya][auto-update] ' + err.message);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { status: 'error', message: err.message });
    }
  });

  autoUpdater.checkForUpdates().catch(() => {});
  // Проверяем ещё раз раз в 6 часов, пока приложение открыто — вдруг вышла новая
  // версия уже после запуска.
  setInterval(() => { autoUpdater.checkForUpdates().catch(() => {}); }, 6 * 60 * 60 * 1000);
}

// 2.18: тихая установка. Обновление скачивается само; ставится, когда программой никто не пользуется:
// ночью (2:00–5:00) или если окно скрыто в трее и компьютер не трогали 30 минут. Программа сразу запускается снова.
// Если программу закрыли раньше — обновление поставится при закрытии (autoInstallOnAppQuit).
let quietInstallTimer = null;
function scheduleQuietInstall() {
  if (quietInstallTimer) return;
  quietInstallTimer = setInterval(() => {
    try {
      const h = new Date().getHours();
      let idle = 0; try { idle = require('electron').powerMonitor.getSystemIdleTime(); } catch (e) { idle = 0; }
      const hidden = !mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible();
      if ((h >= 2 && h < 5 && idle >= 600) || (hidden && idle >= 1800)) {
        clearInterval(quietInstallTimer); quietInstallTimer = null;
        appQuitting = true;
        autoUpdater.quitAndInstall(true, true);
      }
    } catch (e) { /* попробуем позже */ }
  }, 5 * 60 * 1000);
}

ipcMain.handle('updates:checkNow', async () => {
  if (IS_STORE_BUILD) return { ok: false, reason: 'store' };
  if (!app.isPackaged) return { ok: false, reason: 'dev_mode' };
  try {
    const result = await autoUpdater.checkForUpdates();
    return { ok: true, version: result && result.updateInfo ? result.updateInfo.version : null };
  } catch (err) {
    return { ok: false, reason: 'error', message: err.message };
  }
});

ipcMain.handle('updates:installNow', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('updates:getCurrentVersion', () => app.getVersion());
ipcMain.handle('updates:isStore', () => IS_STORE_BUILD);
ipcMain.handle('app:websiteUrl', () => WEBSITE_URL);
function httpsProbe(url, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body); const parsed = new URL(url);
    const req = https.request({ hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }, timeout: 10000 }, (res) => {
      let raw = ''; res.on('data', c => raw += c);
      res.on('end', () => { let json = null; try { json = JSON.parse(raw); } catch (e) { /* не JSON */ } resolve({ status: res.statusCode, json }); });
    });
    req.on('error', (e) => resolve({ status: 0, error: String((e && e.message) || e).slice(0, 80) }));
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.write(data); req.end();
  });
}
// «Проверить связь с сервером»: что отвечает на каждом адресе — Google Wallet, почта, база, подписка.
ipcMain.handle('server:check', async () => {
  const key = db.getSettings().license_key || '';
  return Promise.all(API_BASES.map(async (base) => {
    const r = await httpsProbe(base + '/api/health', { licenseKey: key });
    if (!r.status) return { base, reachable: false, error: r.error };
    return { base, reachable: true, status: r.status, data: r.json && r.json.ok ? r.json : null };
  }));
});
// Какие ссылки программа открывает в браузере. Раньше было два обработчика с одним именем
// в preload, и второй «перекрывал» первый — ссылки на сайт Loya молча не открывались.
const EXTERNAL_OK = [
  /^https:\/\/([a-z0-9-]+\.)*loya-loyalty\.com(\/|$|\?|#)/i,   // сайт, подписка, /manage, /owner, /r/…, /j/…, Apple Wallet
  /^https:\/\/loya-website-one\.vercel\.app(\/|$|\?|#)/i,
  /^https?:\/\/[\d.]+:4317\//,                               // свой локальный сервер (телефон, саморегистрация)
  /^https:\/\/t\.me\//i,                                      // Telegram
  /^mailto:/i,                                                  // поддержка
  /^https:\/\/pay\.google\.com\//i,                            // Google Wallet
  /^https:\/\/(g\.page|maps\.app\.goo\.gl|(www\.)?google\.[a-z.]+\/maps)\//i, // отзывы в Google
  /^https:\/\/(www\.)?instagram\.com\//i, /^https:\/\/(www\.)?facebook\.com\//i
];
function externalAllowed(url) { return typeof url === 'string' && url.length < 4000 && EXTERNAL_OK.some(r => r.test(url)); }
function openExternalSafe(url) {
  if (!externalAllowed(url)) { console.warn('[links] blocked', String(url).slice(0, 120)); return { ok: false, error: 'blocked' }; }
  shell.openExternal(url).catch(err => console.error('[links] open failed', err && err.message));
  return { ok: true };
}
ipcMain.handle('app:openExternal', (e, url) => openExternalSafe(url));

async function createWindow() {
  const dataDir = getDataDir();
  db = new Database(path.join(dataDir, 'loyalty.db'));
  await db.init();
  // Демо на сайте: первая загрузка — тестовая кофейня с клиентами и визитами (сборка build-www --demo)
  if (typeof globalThis.__LOYA_DEMO_SEED === 'function') { try { await globalThis.__LOYA_DEMO_SEED(db); } catch (e) { console.error('demo seed', e); } }
  applyLicenseMode();
  setTimeout(() => { try { retryWalletDesignUpload(); } catch (e) { /* позже */ } }, 20000);
  // Если база была повреждена и поднята из копии — сообщаем владельцу. Если копии не нашлось,
  // не делаем сегодняшнюю резервную копию, чтобы пустая база не затёрла хорошую копию.
  if (db.recoveredFrom !== undefined) {
    const lang = (db.getSettings().app_language) || 'ru';
    const MSG = {
      ru: db.recoveredFrom ? `Файл базы был повреждён. Данные восстановлены из резервной копии (${db.recoveredFrom}). Проверьте последние изменения.` : 'Файл базы был повреждён, а резервной копии не нашлось. Повреждённый файл сохранён рядом с базой — обратитесь в поддержку.',
      uk: db.recoveredFrom ? `Файл бази був пошкоджений. Дані відновлено з резервної копії (${db.recoveredFrom}). Перевірте останні зміни.` : 'Файл бази був пошкоджений, а резервної копії не знайдено. Пошкоджений файл збережено поруч із базою — зверніться в підтримку.',
      sk: db.recoveredFrom ? `Súbor databázy bol poškodený. Dáta boli obnovené zo zálohy (${db.recoveredFrom}). Skontrolujte posledné zmeny.` : 'Súbor databázy bol poškodený a záloha sa nenašla. Poškodený súbor je uložený vedľa databázy — kontaktujte podporu.',
      en: db.recoveredFrom ? `The database file was damaged. Data was restored from a backup (${db.recoveredFrom}). Please check the latest changes.` : 'The database file was damaged and no backup was found. The damaged file was kept next to the database — please contact support.'
    };
    setTimeout(() => dialog.showMessageBox({ type: 'warning', title: 'Loya', message: MSG[lang] || MSG.ru }).catch(() => {}), 1500);
  }
  if (db.recoveredFrom !== null) createBackup();
  db.onCardChanged = (cardId) => pushWalletUpdate(cardId);
  // Клиент использовал (или не успел использовать) бонус из регистрации по ссылке — ему выдана
  // постоянная карта. Если есть email или Telegram, отправляем её сразу.
  db.onBonusRedeemed = (clientId, cardId) => deliverCardToClient(clientId, cardId);
  if (grow) grow.attach();
  db.archiveOldScanHistory();

  // Сообщает окну приложения, что данные изменились удалённо (скан с телефона, саморегистрация
  // и т.п.) — с небольшой задержкой (debounce), чтобы при нескольких быстрых сканах подряд не
  // дёргать интерфейс на каждое из них по отдельности.
  let dataChangedDebounce = null;
  function notifyDataChanged() {
    clearTimeout(dataChangedDebounce);
    dataChangedDebounce = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('remote-data-changed');
      }
    }, 400);
  }

  // Локальный сервер для синхронизации с Android-приложением по WiFi.
  // Работает только внутри локальной сети — наружу (в интернет) не смотрит.
  localServer = startLocalServer(db, null, {
    pageLogo: () => regPageLogo(),
    pageBg: () => ({ img: regPageBg(), dim: Number(db.getSettings().reg_page_bg_dim) >= 0 && db.getSettings().reg_page_bg_dim ? Number(db.getSettings().reg_page_bg_dim) : 45 }),
    sendCardEmail: sendCardEmailNow,
    sendNamedayAll: sendNamedayBatch,
    verifyUnsubscribeToken,
    onDataChanged: notifyDataChanged,
    onSelfRegistered: (name) => notice('reg', { name, via: 'wifi' }),
    onRemoteScan: (method, result) => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('remote-scan', { method, result });
    },
    composeCatCard: composeCatCardViaRenderer,
    getGoogleWalletSaveLink: (card) => getWalletSaveLink(card),
    getAppleWalletLink: (card) => getAppleWalletLink(card),
    mailReady: () => mailReady(db.getSettings()),
    syncOnline: () => syncOnlineRegistrations(),
    staffCodeLogin: (code) => (looksLikeLoginCode(code) ? loginByCodeFromPhone(code) : null),
    posReceipt: (payload, source) => posReceipt(payload, source),
    isFree: () => isFreeMode()
  }, dataDir);

  // 2.22: окно запоминает размер и положение; при первом запуске открывается развёрнутым на весь экран.
  const winSt = db.getSettings();
  const winB = savedWindowBounds(winSt);
  let workArea = { width: 1366, height: 768 };
  try { workArea = screen.getPrimaryDisplay().workAreaSize || workArea; } catch (e) { /* по умолчанию */ }
  mainWindow = new BrowserWindow({
    width: winB ? winB.width : Math.min(1280, Math.max(980, workArea.width - 80)),
    height: winB ? winB.height : Math.min(820, Math.max(660, workArea.height - 60)),
    ...(winB ? { x: winB.x, y: winB.y } : {}),
    minWidth: 960,
    minHeight: 640,
    show: false,
    icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // В установленной программе инструменты разработчика (Ctrl+Shift+I) выключены: через них можно было
      // вызывать внутренние функции программы напрямую.
      devTools: !app.isPackaged,
      webviewTag: false,
      spellcheck: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  if (app.isPackaged) Menu.setApplicationMenu(null);
  setupWindowState(winSt);
  // Крестик сворачивает программу в трей (значок у часов) — сканер, саморегистрация и рассылки
  // продолжают работать. Полностью закрыть — правый щелчок по значку → «Выйти из Loya».
  mainWindow.on('close', (ev) => {
    if (appQuitting || !trayEnabled()) return;
    ev.preventDefault();
    mainWindow.hide();
    const st = db.getSettings();
    if (st.tray_hint_shown !== '1') { db.saveSettings({ tray_hint_shown: '1' }); setTimeout(() => showTrayPopup('hint'), 250); }
  });
  // Выключение/перезагрузка Windows не должны «зависать» на сворачивании в трей.
  mainWindow.on('session-end', () => { appQuitting = true; });
  setupTray();   // без меню нет и скрытых сочетаний (перезагрузка, DevTools)
  mainWindow.webContents.on('will-attach-webview', (ev) => ev.preventDefault());
  // Любая ссылка (<a href>, window.open на внешний адрес) открывается в браузере, а не внутри окна программы.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'about:blank' || url === '') return { action: 'allow' }; // окно печати карточки
    openExternalSafe(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (ev, url) => {
    if (url.startsWith('file://')) return;
    ev.preventDefault();
    openExternalSafe(url);
  });
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Проверка удалённой блокировки — один раз сразу после того, как страница полностью
  // загрузится (чтобы слушатель на стороне renderer уже был готов принять событие),
  // и затем каждые 6 часов, пока приложение открыто. Старый (ручной, план Б) и новый
  // (по ключу подписки) механизмы работают независимо — какой настроен, тот и сработает.
  if (SUBSCRIPTION_API_URL) {
    mainWindow.webContents.once('did-finish-load', () => { checkSubscriptionLicense(); applyLicenseMode(); });
    setInterval(checkSubscriptionLicense, 6 * 60 * 60 * 1000);
    // Ключ введён, но проверить его не удалось (нет сети) — пробуем снова каждые 2 минуты, пока не подтвердится.
    setInterval(() => { const s = db.getSettings(); if (s.license_key && ['unverified', 'offline', 'clock'].includes(licenseState().reason)) checkSubscriptionLicense(); }, 2 * 60 * 1000);
    setInterval(() => { try { touchSeenTime(0); } catch (e) { /* не критично */ } }, 30 * 60 * 1000);
  }
}

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) return; // вторая копия — просто закрываемся
  // Разрешаем доступ к камере без диалога (для сканирования QR)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') callback(true);
    else callback(false);
  });
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return permission === 'media';
  });

  // На macOS системное разрешение на камеру запрашивается отдельно, до создания
  // окна — см. комментарий у самой функции выше.
  await requestCameraPermission();

  createWindow().then(() => {
    if (db.getSettings().telegram_bot_token) startTelegramPolling();
    setupAutoUpdater();
  });

  app.on('activate', () => {
    if (mainWindow && !mainWindow.isDestroyed()) showMainWindow();
    else if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  try { require('electron').powerMonitor.on('shutdown', () => { appQuitting = true; app.quit(); }); } catch (e) { /* нет powerMonitor */ }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------- трей: значок у часов и меню в оформлении программы ----------
let appQuitting = false;
let tray = null, trayPopup = null;
app.on('before-quit', () => { appQuitting = true; });
function trayEnabled() { return !!Tray && !!tray && db && db.getSettings().close_to_tray !== '0'; }
const TRAY_TEXT = {
  ru: { sub: 'работает в фоне', open: 'Открыть Loya', scan: 'Сканирование', clients: 'Клиенты', newcard: 'Новая карта', quit: 'Выйти из Loya', tip: 'Loya — щёлкните, чтобы открыть',
    hint: 'Программа продолжает работать в фоне: сканер, регистрация клиентов и рассылки не останавливаются. Значок Loya — рядом с часами. Чтобы закрыть полностью: правый щелчок по значку → «Выйти из Loya».', ok: 'Понятно' },
  uk: { sub: 'працює у фоні', open: 'Відкрити Loya', scan: 'Сканування', clients: 'Клієнти', newcard: 'Нова картка', quit: 'Вийти з Loya', tip: 'Loya — клацніть, щоб відкрити',
    hint: 'Програма продовжує працювати у фоні: сканер, реєстрація клієнтів і розсилки не зупиняються. Значок Loya — біля годинника. Щоб закрити повністю: правий клік по значку → «Вийти з Loya».', ok: 'Зрозуміло' },
  sk: { sub: 'beží na pozadí', open: 'Otvoriť Loya', scan: 'Skenovanie', clients: 'Zákazníci', newcard: 'Nová karta', quit: 'Ukončiť Loya', tip: 'Loya — kliknite pre otvorenie',
    hint: 'Program beží ďalej na pozadí: skener, registrácia zákazníkov aj kampane fungujú. Ikona Loya je pri hodinách. Úplne zavrieť: pravé kliknutie na ikonu → „Ukončiť Loya“.', ok: 'Rozumiem' },
  en: { sub: 'running in the background', open: 'Open Loya', scan: 'Scan', clients: 'Customers', newcard: 'New card', quit: 'Quit Loya', tip: 'Loya — click to open',
    hint: 'Loya keeps running in the background: the scanner, customer sign-ups and campaigns don’t stop. The Loya icon is next to the clock. To quit completely: right-click the icon → “Quit Loya”.', ok: 'Got it' }
};
function trayText() { const l = (db && db.getSettings().app_language) || 'ru'; return TRAY_TEXT[l] || TRAY_TEXT.ru; }
function showMainWindow(view) {
  if (!mainWindow || mainWindow.isDestroyed()) { createWindow(); return; }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show(); mainWindow.focus();
  if (view) mainWindow.webContents.send('tray-open-view', view);
}
// ---------- 2.22: окно — размер, весь экран (F11), масштаб интерфейса (Ctrl + / Ctrl − / Ctrl 0) ----------
const UI_ZOOMS = [0.8, 0.9, 1, 1.1, 1.2];
function uiZoom(st) { const z = Number((st || db.getSettings()).ui_zoom); return UI_ZOOMS.includes(z) ? z : 0.9; }
function savedWindowBounds(st) {
  try {
    const b = JSON.parse(st.win_bounds || 'null');
    if (!b || ![b.x, b.y, b.width, b.height].every(Number.isFinite) || b.width < 600 || b.height < 400) return null;
    // окно должно хотя бы частично попадать на один из подключённых экранов (монитор могли отключить)
    const ok = screen.getAllDisplays().some(d => { const a = d.workArea; return b.x + 120 < a.x + a.width && b.x + b.width - 120 > a.x && b.y >= a.y - 20 && b.y + 60 < a.y + a.height; });
    return ok ? { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) } : null;
  } catch (e) { return null; }
}
function winStatePayload() {
  const w = mainWindow;
  if (!w || w.isDestroyed()) return { full: false, max: false, zoom: uiZoom() };
  const has = (f) => typeof w[f] === 'function';
  return { full: has('isFullScreen') && w.isFullScreen(), max: has('isMaximized') && w.isMaximized(), zoom: uiZoom() };
}
function sendWinState() { try { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('win-state', winStatePayload()); } catch (e) { /* окно закрыто */ } }
function applyUiZoom(z) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try { mainWindow.webContents.setZoomFactor(z); } catch (e) { /* не критично */ }
  sendWinState();
}
function setUiZoom(z) {
  const zz = UI_ZOOMS.includes(Number(z)) ? Number(z) : 0.9;
  db.saveSettings({ ui_zoom: String(zz) });
  applyUiZoom(zz);
  return winStatePayload();
}
function toggleFullScreen(force) {
  const w = mainWindow; if (!w || w.isDestroyed() || typeof w.setFullScreen !== 'function') return winStatePayload();
  const next = typeof force === 'boolean' ? force : !w.isFullScreen();
  w.setFullScreen(next);
  return { ...winStatePayload(), full: next };
}
function setupWindowState(st) {
  const w = mainWindow;
  let shown = false;
  const showNow = () => {
    if (shown || w.isDestroyed()) return; shown = true;
    if (st.win_maximized !== '0') w.maximize();
    w.show();
    if (st.win_fullscreen === '1' && typeof w.setFullScreen === 'function') w.setFullScreen(true);
  };
  w.once('ready-to-show', showNow);
  setTimeout(showNow, 5000);   // на всякий случай: окно не должно остаться невидимым
  let saveTimer = null;
  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (w.isDestroyed()) return;
      const full = w.isFullScreen(), max = w.isMaximized();
      const patch = { win_fullscreen: full ? '1' : '0', win_maximized: max ? '1' : '0' };
      if (!full && !max && !w.isMinimized()) { const b = w.getBounds(); patch.win_bounds = JSON.stringify(b); }
      try { db.saveSettings(patch); } catch (e) { /* не критично */ }
    }, 600);
  };
  ['resize', 'move', 'maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen'].forEach(ev => w.on(ev, save));
  ['maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen'].forEach(ev => w.on(ev, () => setTimeout(sendWinState, 50)));
  w.webContents.on('did-finish-load', () => applyUiZoom(uiZoom()));
  w.webContents.on('before-input-event', (ev, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' && !input.control && !input.alt && !input.meta) { ev.preventDefault(); toggleFullScreen(); return; }
    const mod = process.platform === 'darwin' ? input.meta : input.control;
    if (!mod || input.alt) return;
    const i = UI_ZOOMS.indexOf(uiZoom());
    if (input.key === '=' || input.key === '+' || input.code === 'NumpadAdd') { ev.preventDefault(); setUiZoom(UI_ZOOMS[Math.min(UI_ZOOMS.length - 1, i + 1)]); }
    else if (input.key === '-' || input.code === 'NumpadSubtract') { ev.preventDefault(); setUiZoom(UI_ZOOMS[Math.max(0, i - 1)]); }
    else if (input.key === '0' || input.code === 'Numpad0') { ev.preventDefault(); setUiZoom(0.9); }
  });
  w.webContents.on('zoom-changed', (ev, dir) => { const i = UI_ZOOMS.indexOf(uiZoom()); setUiZoom(UI_ZOOMS[dir === 'in' ? Math.min(UI_ZOOMS.length - 1, i + 1) : Math.max(0, i - 1)]); });
  // колесо мыши с Ctrl не должно незаметно менять масштаб «мимо» настройки
  try { w.webContents.setVisualZoomLevelLimits(1, 1); } catch (e) { /* старый Electron */ }
}
ipcMain.handle('win:state', () => winStatePayload());
ipcMain.handle('win:toggleFull', (e, force) => toggleFullScreen(force));
ipcMain.handle('win:setZoom', (e, z) => setUiZoom(z));

function setupTray() {
  if (!Tray || tray) return;
  try {
    const iconFile = path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
    let img = nativeImage.createFromPath(iconFile);
    if (!img.isEmpty() && process.platform !== 'win32') img = img.resize({ width: process.platform === 'darwin' ? 18 : 22, height: process.platform === 'darwin' ? 18 : 22 });
    tray = new Tray(img);
    tray.setToolTip(trayText().tip);
    tray.on('click', () => { if (trayPopup) closeTrayPopup(); showMainWindow(); });
    tray.on('double-click', () => showMainWindow());
    tray.on('right-click', (e, bounds) => showTrayPopup('menu', bounds));
  } catch (err) { tray = null; }
}
function closeTrayPopup() { if (trayPopup && !trayPopup.isDestroyed()) trayPopup.destroy(); trayPopup = null; }
function trayLogo() { try { return 'data:image/png;base64,' + fs.readFileSync(path.join(getDataDir(), 'brand-logo.png')).toString('base64'); } catch (e) { return ''; } }
function showTrayPopup(mode, bounds) {
  closeTrayPopup();
  const st = db.getSettings();
  const W = mode === 'hint' ? 360 : 260, H = mode === 'hint' ? 270 : 300;
  const pt = (bounds && bounds.width) ? { x: bounds.x + bounds.width / 2, y: bounds.y } : (tray && tray.getBounds && tray.getBounds().width ? { x: tray.getBounds().x + tray.getBounds().width / 2, y: tray.getBounds().y } : screen.getCursorScreenPoint());
  const wa = screen.getDisplayNearestPoint(pt).workArea;
  trayPopup = new BrowserWindow({
    width: W, height: H, frame: false, transparent: true, resizable: false, movable: false, skipTaskbar: true, alwaysOnTop: true, show: false, focusable: true,
    webPreferences: { preload: path.join(__dirname, 'tray-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, devTools: !app.isPackaged }
  });
  const place = (w, h) => {
    if (!trayPopup || trayPopup.isDestroyed()) return;
    let x = Math.round(pt.x - w / 2), y = Math.round(pt.y - h - 6);
    if (y < wa.y) y = Math.round(pt.y + 28);                  // панель задач сверху
    x = Math.max(wa.x + 6, Math.min(wa.x + wa.width - w - 6, x));
    y = Math.max(wa.y + 6, Math.min(wa.y + wa.height - h - 6, y));
    trayPopup.setBounds({ x, y, width: w, height: h });
  };
  place(W, H);
  const T = trayText();
  const data = { brand: st.brand_name || 'Loya', accent: /^#[0-9a-fA-F]{6}$/.test(st.theme_primary || '') ? st.theme_primary : '#d4af37', logo: trayLogo(), labels: T };
  trayPopup.loadFile(path.join(__dirname, 'src', 'tray.html'), { query: { mode, d: JSON.stringify(data) } });
  trayPopup.once('ready-to-show', () => { if (trayPopup) { trayPopup.show(); trayPopup.focus(); } });
  trayPopup.on('blur', () => { if (mode === 'menu') closeTrayPopup(); });
  trayPopup.__place = place;
  if (mode === 'hint') setTimeout(() => { if (trayPopup && trayPopup.__mode === 'hint') closeTrayPopup(); }, 12000);
  trayPopup.__mode = mode;
}
ipcMain.on('tray:size', (e, w, h) => {
  if (!trayPopup || trayPopup.isDestroyed() || e.sender !== trayPopup.webContents) return;
  if (w > 50 && h > 50) trayPopup.__place(Math.min(420, Math.ceil(w)), Math.min(600, Math.ceil(h)));
});
ipcMain.on('tray:action', (e, action) => {
  if (!trayPopup || e.sender !== trayPopup.webContents) return;
  closeTrayPopup();
  if (action === 'quit') { appQuitting = true; app.quit(); return; }
  if (action === 'open') showMainWindow();
  else if (['scan', 'clients', 'newcard'].includes(action)) showMainWindow(action);
});

// ---------------- IPC ----------------

ipcMain.handle('clients:add', limited((e, payload) => db.addClient(payload)));
ipcMain.handle('clients:checkDuplicate', (e, { phone, email }) => {
  const byPhone = phone ? db.getClientByPhone(phone) : null;
  const byEmail = !byPhone && email ? db.getClientByEmail(email) : null;
  const existing = byPhone || byEmail;
  return existing ? { found: true, name: existing.name } : { found: false };
});
ipcMain.handle('clients:list', () => db.getClients());
ipcMain.handle('clients:get', (e, id) => db.getClient(id));
ipcMain.handle('clients:update', (e, id, payload) => db.updateClient(id, payload));
ipcMain.handle('clients:duplicates', (e, id) => db.findPossibleDuplicates(Number(id)));
ipcMain.handle('clients:merge', (e, keepId, dropId) => { const r = db.mergeClients(keepId, dropId); if (r && r.ok && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('remote-data-changed'); return r; });
ipcMain.handle('clients:delete', (e, id) => {
  /* право проверяет CHANNEL_PERMS */
  db.deleteClient(id); return { ok: true };
});

ipcMain.handle('cards:create', limited((e, payload) => {
  // Кассир не может выдать скидку больше, чем разрешил владелец (стандартная скидка заведения — можно).
  if (payload && (payload.type === 'discount' || (payload.type === 'stamp' && Number(payload.discountPercent) > 0)) && sessionRole() !== 'owner') {
    const m = permMatrix()[sessionRole()], pct = Number(payload.discountPercent) || 0, std = perms().standardDiscount;
    if (m && m.maxDiscount > 0 && pct > m.maxDiscount && pct !== std) return { error: 'discount_cap', max: m.maxDiscount };
  }
  // 2.25: «штампы + скидка» — штамп-карта с процентом; у остальных штамп-карт процента нет
  if (payload && payload.type === 'stamp' && !(Number(payload.discountPercent) > 0)) payload = { ...payload, discountPercent: null };
  return db.createCard(payload);
}));
ipcMain.handle('cards:list', () => db.getCards());
ipcMain.handle('cards:byClient', (e, clientId) => db.getCardsByClient(clientId));
ipcMain.handle('cards:byId', (e, id) => db.getCardById(id));
ipcMain.handle('cards:delete', (e, id) => {
  /* право проверяет CHANNEL_PERMS */
  db.deleteCard(id); return { ok: true };
});

ipcMain.handle('scan:code', async (e, code) => {
  let res = db.scanCode(code);
  // Клиент только что зарегистрировался по ссылке, а программа ещё не забрала заявку — забираем сейчас.
  if (res.error === 'not_found' && /^LB-/i.test(String(code || ''))) {
    await syncOnlineRegistrations();
    res = db.scanCode(code);
  }
  return res;
});
ipcMain.handle('scan:codeForce', (e, code) => db.scanCodeForce(code));
ipcMain.handle('promo:stampMultiplier', () => db.currentStampMultiplier());
ipcMain.handle('referral:stats', () => db.getReferralStats());
ipcMain.handle('referral:count', (e, clientId) => db.getReferralCount(clientId));
ipcMain.handle('scan:getLastInfo', () => db.getLastScanInfo());
ipcMain.handle('scan:undoLast', () => db.undoLastScan());
ipcMain.handle('scan:updateAmount', (e, historyId, amount) => {
  db.updateScanAmount(historyId, amount);
  return { ok: true };
});
ipcMain.handle('client:getTotalSpent', (e, clientId) => db.getClientTotalSpent(clientId));
ipcMain.handle('scan:addSpendAmount', (e, cardId, amount) => db.addSpendAmount(cardId, amount));
ipcMain.handle('card:redeemBonus', (e, cardId, count) => db.redeemBonus(Number(cardId), count));
ipcMain.handle('card:setBonusPoints', (e, cardId, pts) => db.setCardBonusPoints(Number(cardId), pts));
ipcMain.handle('stats:topSpenders', (e, limit) => S(() => db.getTopSpenders(limit)));

ipcMain.handle('history:byClient', (e, clientId, limit) => db.getHistoryByClient(clientId, limit || 100));
ipcMain.handle('history:byCard', (e, cardId) => db.getHistoryByCard(cardId));
ipcMain.handle('history:recent', (e, limit) => S(() => db.getRecentHistory(limit)));

ipcMain.handle('stats:get', () => S(() => db.getStats()));
ipcMain.handle('birthdays:upcoming', (e, daysAhead) => db.getUpcomingBirthdays(daysAhead));
ipcMain.handle('birthdays:today', () => db.getTodayBirthdays());
ipcMain.handle('clients:purchaseCounts', () => db.getPurchaseCounts());
ipcMain.handle('clients:stats', (e, id) => db.getClientStats(id));

ipcMain.handle('analytics:advanced', () => S(() => db.getAdvancedStats()));
ipcMain.handle('analytics:topClients', (e, limit) => S(() => db.getTopClients(limit)));
ipcMain.handle('analytics:topCards', (e, limit) => S(() => db.getTopCards(limit)));
ipcMain.handle('analytics:visitsByDay', (e, days) => S(() => db.getVisitsByDay(days)));
ipcMain.handle('analytics:visitsByWeekday', () => S(() => db.getVisitsByWeekday()));
ipcMain.handle('analytics:visitsByHour', () => S(() => db.getVisitsByHour()));
ipcMain.handle('analytics:revenueStats', () => S(() => db.getRevenueStats()));
ipcMain.handle('analytics:revenueByMonth', (e, months) => S(() => db.getRevenueByMonth(months)));
ipcMain.handle('analytics:visitHeatmap', (e, days) => S(() => db.getVisitHeatmap(days)));
ipcMain.handle('analytics:loyaltyFunnel', () => S(() => db.getLoyaltyFunnel()));
ipcMain.handle('analytics:newClientsByMonth', (e, months) => S(() => db.getNewClientsByMonth(months)));
ipcMain.handle('analytics:rewardsByDay', (e, days) => S(() => db.getRewardsByDay(days)));
ipcMain.handle('analytics:cardUsageByType', () => S(() => db.getCardUsageByType()));

ipcMain.handle('clients:withFlags', () => db.getClientsWithFlags());
ipcMain.handle('clients:languageCounts', () => db.getClientLanguageCounts());
ipcMain.handle('clients:overdue', () => db.getOverdueClients());
ipcMain.handle('clients:overdueList', (e, limit) => db.getOverdueClients(Math.max(1, Math.min(50, Number(limit) || 6))));
ipcMain.handle('mk:retention', () => db.getRetentionKpi());

// Клиент месяца появляется не сразу, а под конец месяца (последние 5 дней — «лидер, итоги через N дн.»)
// и первые 3 дня следующего («итоги прошлого месяца: похвалите и наградите»). В середине месяца — рано.
function clientOfMonthPhase(now) {
  const day = now.getDate(), dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (day <= 3) return { phase: 'results', ref: new Date(now.getFullYear(), now.getMonth() - 1, 1), daysLeft: 0 };
  if (day > dim - 5) return { phase: 'final', ref: now, daysLeft: dim - day };
  return { phase: 'early', ref: now, daysLeft: dim - 5 - day + 1 };
}
ipcMain.handle('clients:ofMonth', (e, when) => {
  const now = when && !isNaN(new Date(when)) ? new Date(when) : new Date();
  const ph = clientOfMonthPhase(now);
  const ym = `${ph.ref.getFullYear()}-${String(ph.ref.getMonth() + 1).padStart(2, '0')}`;
  if (ph.phase === 'early') return { phase: 'early', daysLeft: ph.daysLeft, ym };
  const client = S(() => db.getClientOfMonth(ym));
  if (!client) return { phase: ph.phase, ym, empty: true, daysLeft: ph.daysLeft };
  const gift = db.getGiftSince(client.id, ym + '-01');
  return { id: client.id, name: client.name, visits: client.visits, hasEmail: !!client.email, hasTelegram: !!client.telegram_chat_id, gift, phase: ph.phase, ym, daysLeft: ph.daysLeft };
});

ipcMain.handle('gift:save', (e, { clientId, giftText }) => {
  return db.addClientGift(clientId, giftText);
});

ipcMain.handle('gift:markGiven', (e, giftId) => {
  db.markGiftGiven(giftId);
  return { ok: true };
});

// Собирает опции для генерации QR из того, что выбрал пользователь (размер и фон).
function qrOpts(options = {}, fallbackWidth) {
  return {
    width: Number(options.width) || fallbackWidth,
    margin: 1,
    color: {
      dark: '#000000',
      light: options.bgColor || '#ffffff'
    }
  };
}

ipcMain.handle('qr:dataUrl', async (e, code, options) => {
  return QRCode.toDataURL(code, qrOpts(options, 400));
});

// Запасные заголовки окна «Сохранить» (обычно окно передаёт свой, уже переведённый).
const SAVE_TITLE = { ru: ['Сохранить QR-код', 'Сохранить файл'], uk: ['Зберегти QR-код', 'Зберегти файл'], sk: ['Uložiť QR kód', 'Uložiť súbor'], en: ['Save QR code', 'Save file'] };
const saveTitle = (i) => (SAVE_TITLE[(db && db.getSettings().app_language) || 'ru'] || SAVE_TITLE.ru)[i];
ipcMain.handle('qr:saveFile', async (e, code, suggestedName, dialogTitle, options) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: dialogTitle || saveTitle(0),
    defaultPath: suggestedName || `${code}.png`,
    filters: [{ name: 'PNG', extensions: ['png'] }]
  });
  if (canceled || !filePath) return { canceled: true };
  const buffer = await QRCode.toBuffer(code, qrOpts(options, 800));
  fs.writeFileSync(filePath, buffer);
  return { canceled: false, filePath };
});

// Универсальное сохранение произвольной PNG data URL (используется для «открытки с котиком»).
ipcMain.handle('file:saveDataUrl', async (e, dataUrl, suggestedName, dialogTitle) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: dialogTitle || saveTitle(1),
    defaultPath: suggestedName || 'card.png',
    filters: [{ name: 'PNG', extensions: ['png'] }]
  });
  if (canceled || !filePath) return { canceled: true };
  const base64 = dataUrl.split(',')[1];
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  return { canceled: false, filePath };
});

// Секреты, которые кассиру видеть не нужно (пароль почты, токены, ключи).
const CASHIER_HIDDEN = /^(smtp_pass|telegram_bot_token|google_wallet_service_account_json|unsubscribe_secret|sync_device_key|pos_token|owner_|pin_|license_key|license_token|pairing_key)/;
ipcMain.handle('settings:get', () => {
  const st = db.getSettings();
  if (sessionRole() !== 'cashier') return st;
  return Object.fromEntries(Object.entries(st).filter(([k]) => !CASHIER_HIDDEN.test(k)));
});
ipcMain.handle('settings:save', (e, settingsObj) => {
  if (!settingsObj || typeof settingsObj !== 'object') return db.getSettings();
  // Состояние подписки пишет только сама программа после ответа сервера — из окна его не изменить.
  // Права, PIN и коды входа меняет только владелец (права кассира — ещё и администратор).
  const role = sessionRole();
  const deny = role === 'cashier' ? /^(perm_|pin_|owner_|staff_mode|license|subscription)/ : role !== 'owner' ? /^(pin_|owner_|license|subscription|perm_matrix)/ : /^(license|subscription)/;
  settingsObj = Object.fromEntries(Object.entries(settingsObj).filter(([k]) => !deny.test(k) && !(role === 'cashier' && CASHIER_HIDDEN.test(k))));
  db.saveSettings(settingsObj);
  if (db.getSettings().telegram_bot_token) startTelegramPolling();
  if (Object.keys(settingsObj).some(k => PROFILE_KEYS.test(k))) scheduleProfilePublish();
  return db.getSettings();
});
// 2.23: что видно на странице регистрации по ссылке — при изменении публикуем профиль заново (с задержкой, один раз).
const PROFILE_KEYS = /^(reg_page_bg_dim|brand_name|business_niche|theme_primary|app_language|spend_currency|selfreg_|registration_|reg_page_|welcome_double|referral_|review_url|geo_|online_bonus_|book_)/;
let profileTimer = null;
function scheduleProfilePublish() {
  clearTimeout(profileTimer);
  profileTimer = setTimeout(() => {
    const s = db.getSettings();
    if (s.license_key && (s.online_reg_enabled === '1' || s.selfreg_mode === 'online' || s.book_on === '1' || s.fb_enabled === '1')) publishOnlineProfile().catch(() => {});
  }, 2500);
}

// ---------- Регистрация клиентов по ссылке из интернета ----------
// Владелец публикует ссылку (Instagram, сайт). Клиент регистрируется на сайте Loya и получает
// бонусный купон со сроком. Программа на кассе раз в минуту забирает новые заявки, заводит
// клиента и бонусную карту; при первом визите клиент получает постоянную карту.
let onlineSyncing = false;
let onlineAck = [];

function applyOnlineRegistration(it) {
  if (!it || !it.code || db.getCardByCode(it.code)) return false; // уже заведено (повторная выдача после сбоя связи)
  if (it.kind === 'join') {
    // Онлайн-саморегистрация: клиент + постоянная карта по правилу заведения, с тем же кодом, что он видит на телефоне.
    const ex = (it.phone && db.getClientByPhone(it.phone)) || (it.email && db.getClientByEmail(it.email)) || null;
    const cid = ex ? ex.id : db.addClient({
      name: String(it.name || '').slice(0, 100) || '—', email: it.email || '', phone: it.phone || '', birthday: it.birthday || '', notes: '',
      preferredLanguage: ['ru', 'uk', 'sk', 'en'].includes(it.lang) ? it.lang : '', consentEmail: !!it.consent, consentTelegram: false, consentSource: 'online_join'
    });
    db.createDefaultCard(cid, { code: it.code, source: 'online_join' });
    applyOnlineRef(it, cid, !ex);
    return true;
  }
  const existing = (it.phone && db.getClientByPhone(it.phone)) || (it.email && db.getClientByEmail(it.email)) || null;
  const clientId = existing ? existing.id : db.addClient({
    name: String(it.name || '').slice(0, 100) || '—', email: it.email || '', phone: it.phone || '', birthday: it.birthday || '',
    notes: '', preferredLanguage: ['ru', 'uk', 'sk', 'en'].includes(it.lang) ? it.lang : '', marketingConsent: !!it.consent, consentSource: 'online_registration'
  });
  applyOnlineRef(it, clientId, !existing);
  db.createCard({
    clientId, type: 'discount', title: String(it.title || '').slice(0, 80),
    discountPercent: Math.max(1, Math.min(100, Number(it.percent) || 100)),
    code: it.code, expiresAt: /^\d{4}-\d{2}-\d{2}$/.test(it.expires || '') ? it.expires : null, singleUse: true, source: 'online'
  });
  return true;
}

// 2.20: регистрация по ссылке-приглашению друга (?ref=КОД) — связываем нового гостя с пригласившим.
function applyOnlineRef(it, clientId, isNew) {
  if (!it.ref || !isNew || !clientId) return;
  try { const r = db.getClientByRefCode(it.ref); if (r && r.id !== clientId && db.refConfig().on) db.applyReferral(r.id, clientId); } catch (e) { writeCrashLog('onlineRef', e); }
}
async function syncOnlineRegistrations() {
  const s = db.getSettings();
  if ((s.online_reg_enabled !== '1' && s.selfreg_mode !== 'online') || !s.license_key || onlineSyncing) return { skipped: true };
  onlineSyncing = true;
  try {
    const res = await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/online-pull`, { licenseKey: s.license_key, ack: onlineAck, loc: onlineLocId() });
    if (!res || !res.ok) return { error: (res && res.error) || 'failed' };
    onlineAck = [];
    let added = 0;
    for (const it of res.items || []) {
      try { if (applyOnlineRegistration(it)) { added++; notice('reg', { name: String(it.name || '').slice(0, 100), via: 'online' }); } onlineAck.push(it.id); } catch (err) { if (err && err.code === 'FREE_LIMIT') continue; writeCrashLog('onlineRegistration', err); onlineAck.push(it.id); }
    }
    // Подтверждаем сразу — иначе те же заявки пришли бы снова (повторы всё равно отсекаются по коду).
    if (onlineAck.length) { try { await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/online-pull`, { licenseKey: s.license_key, ack: onlineAck, loc: onlineLocId() }); onlineAck = []; } catch (err) { /* подтвердим в следующий раз */ } }
    if (added && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('remote-data-changed');
    return { ok: true, added };
  } catch (err) {
    return { error: 'network' };
  } finally { onlineSyncing = false; }
}

// 2.23: постоянный номер этой точки (компьютера) для страницы регистрации — не меняется и не синхронизируется.
function onlineLocId() {
  let id = db.getSettings().online_loc || '';
  if (!/^[a-z0-9]{10,32}$/.test(id)) { id = crypto.randomBytes(8).toString('hex'); db.saveSettings({ online_loc: id }); }
  return id;
}
// Логотип для страниц (регистрация, акция, запись, отзыв): уменьшаем до 256 px, чтобы он всегда помещался.
let regLogoCache = { mtime: 0, url: '' };
function regPageLogo() {
  try {
    const f = path.join(getDataDir(), BRAND_LOGO_FILE);
    const st = fs.statSync(f);
    if (regLogoCache.mtime === st.mtimeMs) return regLogoCache.url;
    let buf = fs.readFileSync(f);
    try { const img = nativeImage.createFromBuffer(buf); const sz = img.getSize(); if (sz.width > 256 || sz.height > 256) buf = img.resize(sz.width >= sz.height ? { width: 256, quality: 'best' } : { height: 256, quality: 'best' }).toPNG(); } catch (e) { /* как есть */ }
    const url = buf.length && buf.length < 300 * 1024 ? 'data:image/png;base64,' + buf.toString('base64') : '';
    regLogoCache = { mtime: st.mtimeMs, url };
    return url;
  } catch (e) { return ''; }
}
async function publishOnlineProfile() {
  const s = db.getSettings();
  if (!s.license_key) return { error: 'need_license' };
  const niche = getNiche(s.business_niche || 'coffee');
  try {
    const res = await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/profile-publish`, {
      licenseKey: s.license_key,
      loc: onlineLocId(),   // 2.23: у каждой точки своя страница регистрации
      profile: {
        enabled: s.online_reg_enabled === '1' || s.selfreg_mode === 'online' || s.book_on === '1' || s.fb_enabled === '1', promo: s.online_reg_enabled === '1', join: s.selfreg_mode === 'online',
        name: s.brand_name || 'Loya', emoji: niche.emoji, color: s.theme_primary || '#d4af37',
        niche: s.business_niche || 'other', lang: s.app_language || 'ru',
        bonusTitle: s.online_bonus_title || '', bonusPercent: Number(s.online_bonus_percent) || 100, bonusDays: Number(s.online_bonus_days) || 14,
        // 2.20: подарок другу (текст для страницы), ссылка на отзывы Google, онлайн-запись
        refOn: s.referral_enabled === '1', refFriend: grow && db.refConfig(s).friend > 0 ? grow.giftText(db.refConfig(s).friend, s.app_language || 'ru') : '',
        reviewUrl: /^https:\/\//.test(s.review_url || '') ? s.review_url : '',
        ...(grow ? { book: grow.bookConfig(s) } : {}),
        // 2.23: какую карту получит гость (её сразу кладём в Google/Apple Wallet) и оформление страницы
        card: { type: s.selfreg_card_type || 'stamp', stampTarget: Number(s.selfreg_stamp_target) || 10, title: s.selfreg_stamp_title || '', discount: Number(s.selfreg_discount_percent) || 5,
          spendTarget: Number(s.selfreg_spend_target) || 500, spendTitle: s.selfreg_spend_title || '', spendPoints: Number(s.selfreg_spend_points) || 1, welcomeDouble: s.welcome_double === '1' },
        page: { title: s.registration_heading || '', text: s.registration_subtitle || '', button: s.registration_button_text || '', color2: s.reg_page_color2 || '', bg: s.reg_page_bg || '', logo: regPageLogo(), bgImg: regPageBg(), bgDim: Number(s.reg_page_bg_dim) >= 0 && s.reg_page_bg_dim !== '' && s.reg_page_bg_dim != null ? Number(s.reg_page_bg_dim) : 45 },
        // 2.24: «Wallet рядом» — и для карт, которые гость добавляет сам со страницы регистрации
        ...(walletGeo(s) ? { geo: walletGeo(s) } : {}),
        // 2.28: вид карты (значки, расположение, сезон, логотип) — для карт гостей с онлайн-регистрации
        look: walletLook(s)
      }
    });
    if (res && res.ok) { db.saveSettings({ online_slug: res.slug, online_url: res.url }); return { ok: true, url: res.url }; }
    return { error: (res && res.error) || 'failed', detail: (res && res.detail) || '' };
  } catch (err) { return { error: 'network' }; }
}

// ---------- 2.23: настройки от поддержки Loya (админка сайта) ----------
// Владелец сервиса может настроить клиенту оформление, страницу регистрации, Wallet и акции из админки.
// Программа раз в 5 минут спрашивает новую версию и применяет её (последнее изменение побеждает —
// владелец потом может поправить у себя). Заодно отправляем снимок текущих настроек, чтобы в админке
// было видно, что стоит у клиента (только когда он изменился).
const CFG_HEX = /^#[0-9a-fA-F]{6}$/;
const cfgStr = (n) => (v) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const cfgInt = (a, b) => (v) => { const x = Math.round(Number(v)); return Number.isFinite(x) && x >= a && x <= b ? String(x) : null; };
const cfgOne = (list) => (v) => (list.includes(String(v)) ? String(v) : null);
const cfgBool = (v) => (v === '1' || v === true ? '1' : v === '0' || v === false ? '0' : null);
const cfgHex = (v) => (v === '' ? '' : CFG_HEX.test(String(v || '')) ? String(v) : null);
const cfgTime = (v) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || '')) ? String(v) : null);
const cfgJson = (fn) => (v) => { try { const x = fn(typeof v === 'string' ? JSON.parse(v) : v); return x == null ? null : JSON.stringify(x); } catch (e) { return null; } };
const cfgId = (v, i, p) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || (p + (i + 1));
const CLIENT_CFG_FIELDS = {
  brand_name: (v) => cfgStr(60)(v) || null, business_niche: (v) => (/^[a-z_]{2,20}$/.test(String(v || '')) ? String(v) : null),
  app_language: cfgOne(['ru', 'uk', 'sk', 'en']), spend_currency: (v) => (/^[A-Z]{3}$/.test(String(v || '')) ? String(v) : null),
  theme_name: cfgOne(['glossy', 'gold', 'coffee', 'mint', 'ocean', 'berry', 'graphite', 'auto', 'custom']),
  theme_primary: cfgHex, theme_sidebar: cfgHex, theme_screen: cfgHex, theme_text: cfgHex,
  selfreg_card_type: cfgOne(['stamp', 'discount', 'spend', 'combo']), selfreg_stamp_target: cfgInt(2, 50), selfreg_stamp_title: cfgStr(60),
  selfreg_discount_percent: cfgInt(1, 90), selfreg_spend_target: cfgInt(1, 100000), selfreg_spend_title: cfgStr(60), selfreg_spend_points: cfgInt(1, 1000),
  registration_heading: cfgStr(80), registration_subtitle: cfgStr(240), registration_button_text: cfgStr(40),
  reg_page_color2: cfgHex, reg_page_bg: cfgOne(['', 'dark', 'light']), welcome_double: cfgBool,
  bonus_stamps_enabled: cfgBool, bonus_stamps_mult: cfgOne(['2', '3']), bonus_stamps_from: cfgTime, bonus_stamps_to: cfgTime,
  bonus_stamps_days: (v) => { const d = String(v == null ? '' : v).split(',').filter(Boolean); return d.every(x => /^[0-6]$/.test(x)) ? d.join(',') : null; },
  scan_cooldown_min: cfgOne(['0', '5', '15', '30', '60', '180', '720']),
  referral_enabled: cfgBool, referral_bonus_stamps: cfgInt(0, 5), referral_friend_stamps: cfgInt(0, 5),
  review_url: (v) => (v === '' ? '' : /^https:\/\/[^\s<>"']{4,300}$/.test(String(v || '')) ? String(v) : null),
  // 2.24: всё, что владелец настраивает сам, — и из админки (запись, акция по ссылке, «Wallet рядом»)
  selfreg_mode: cfgOne(['wifi', 'online']),
  online_reg_enabled: cfgBool, online_bonus_title: cfgStr(80), online_bonus_percent: cfgInt(1, 100), online_bonus_days: cfgInt(1, 90),
  book_on: cfgBool, book_services: cfgJson((a) => (Array.isArray(a) ? a : []).slice(0, 40).map((x, i) => ({ id: cfgId(x && x.id, i, 's'), n: cfgStr(60)(x && x.n), d: Math.max(5, Math.min(480, Math.round(Number(x && x.d) || 60))), p: x && x.p !== '' && x.p != null && Number.isFinite(Number(x.p)) ? Math.max(0, Number(x.p)) : null })).filter(x => x.n)),
  book_staff: cfgJson((a) => (Array.isArray(a) ? a : []).slice(0, 20).map((x, i) => ({ id: cfgId(x && x.id, i, 'm'), n: cfgStr(40)(x && x.n), s: (Array.isArray(x && x.s) ? x.s : []).map(String).slice(0, 40) })).filter(x => x.n)),
  book_hours: cfgJson((o) => { const out = {}; for (let d = 0; d < 7; d++) out[d] = (Array.isArray(o && o[d]) ? o[d] : []).filter(r => Array.isArray(r) && cfgTime(r[0]) && cfgTime(r[1]) && r[1] > r[0]).slice(0, 3).map(r => [r[0], r[1]]); return out; }),
  book_step: cfgOne(['10', '15', '20', '30', '60']), book_lead: cfgInt(0, 2880), book_days: cfgInt(1, 90),
  book_note: cfgStr(300), book_address: cfgStr(120), book_phone: cfgStr(30),
  geo_on: cfgBool, geo_text: cfgStr(120),
  geo_points: cfgJson((a) => (Array.isArray(a) ? a : []).map(x => ({ lat: Number(x && x.lat), lng: Number(x && x.lng), name: cfgStr(60)(x && x.name) })).filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng) && Math.abs(x.lat) <= 90 && Math.abs(x.lng) <= 180 && !(x.lat === 0 && x.lng === 0)).slice(0, 10)),
  tier_perks_on: cfgBool, auto_winback_enabled: cfgBool, auto_near_enabled: cfgBool, auto_welcome_enabled: cfgBool, auto_birthday_enabled: cfgBool,
  feature_inventory: cfgBool, feature_network: cfgBool, feature_staff: cfgBool, feature_weather: cfgBool,
  wallet_show_tier: cfgBool, wallet_show_next: cfgBool, reg_page_bg_dim: cfgInt(0, 85),
  // 2.28: вид карты в Wallet — и из админки ('' — сбросить к стандартному)
  ...walletLookCfgFields()
};
function walletLookCfgFields() {
  const M = LoyaCardModel, one = (list) => (v) => (v === '' || list.includes(String(v)) ? String(v) : null);
  const int = (a, b) => (v) => { if (v === '' || v == null) return ''; const x = Math.round(Number(v)); return Number.isFinite(x) && x >= a && x <= b ? String(x) : null; };
  return { wallet_stamp_icon: one(M.STAMP_IDS), wallet_reward_icon: one(M.STAMP_IDS), wallet_stamp_color: (v) => (v === '' || /^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? String(v) : null),
    wallet_layout: one(['classic', 'photo']), wallet_season: one(M.SEASONS), wallet_arrange: one(M.ARRANGES), wallet_stamp_label: (v) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>&"]/g, ' ').trim().slice(0, 18),
    wallet_logo_mode: one(['logo', 'both']), wallet_logo_size: int(24, 260), wallet_logo_rot: int(-180, 180), wallet_logo_x: int(0, 1032), wallet_logo_y: int(0, 336), wallet_logo_flip: one(['1']) };
}
// Все остальные настройки (без паролей, ключей и служебных) — только чтобы поддержка видела, что стоит у клиента.
const CFG_SECRET_KEY = /(pass|secret|token|json|_key$|^license|pin|hash|smtp_user|session|private|cookie|device_id|apikey|api_key)/i;
function clientCfgAll(s) {
  const all = {};
  for (const [k, v] of Object.entries(s)) { if (CFG_SECRET_KEY.test(k) || v == null) continue; const val = String(v); if (val.length > 4000) continue; all[k] = val; }
  return all;
}
function clientCfgSnapshot() {
  const s = db.getSettings(); const snap = {};
  for (const k of Object.keys(CLIENT_CFG_FIELDS)) if (s[k] !== undefined && s[k] !== null && s[k] !== '') snap[k] = String(s[k]);
  snap.has_logo = fs.existsSync(path.join(getDataDir(), BRAND_LOGO_FILE)); snap.has_page_bg = fs.existsSync(path.join(getDataDir(), PAGE_BG_FILE)) ? '1' : '0'; snap.version = app.getVersion();
  snap.all = clientCfgAll(s);
  return snap;
}
function applyClientConfig(cfg, ver) {
  const s = db.getSettings();
  const patch = {};
  for (const [k, fn] of Object.entries(CLIENT_CFG_FIELDS)) { if (!(k in cfg)) continue; const v = fn(cfg[k]); if (v !== null && v !== undefined) patch[k] = v; }
  patch.admin_cfg_ver = String(ver);
  db.saveSettings(patch);
  // логотип — только если его поменяли в этой версии
  const rev = Number(cfg.logo_rev) || 0;
  const bgRev = Number(cfg.page_bg_rev) || 0;
  if ('page_bg' in cfg && bgRev > (Number(s.admin_page_bg_rev) || 0)) { try { savePageBg(cfg.page_bg || null); } catch (e) { writeCrashLog('cfgPageBg', e); } db.saveSettings({ admin_page_bg_rev: String(bgRev) }); }
  if ('brand_logo' in cfg && rev > (Number(s.admin_logo_rev) || 0)) { try { saveBrandLogo(cfg.brand_logo || null); } catch (e) { writeCrashLog('cfgLogo', e); } db.saveSettings({ admin_logo_rev: String(rev) }); }
  scheduleProfilePublish();
  // «Wallet рядом» поменяли из админки — обновляем и уже выданные карты
  // 2.28: вид карты поменяли из админки — перерисовываем и уже выданные карты
  if (Object.keys(patch).some(k => k.startsWith('wallet_') && k !== 'wallet_show_tier' && k !== 'wallet_show_next')) setTimeout(() => { try { refreshAllWalletCards().catch(() => {}); } catch (e) { /* позже */ } }, 4000);
  if (Object.keys(patch).some(k => k.startsWith('geo_'))) setTimeout(() => { try { db.saveSettings({ geo_last_apply: new Date().toISOString().slice(0, 16).replace('T', ' ') }); refreshAllWalletCards().catch(() => {}); } catch (e) { /* позже */ } }, 4000);
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('remote-config', { keys: Object.keys(patch) });
  return patch;
}
// Дизайн карт Wallet поменяли в админке — берём картинки с сервера, чтобы в программе было то же самое.
async function syncWalletDesignFromServer(serverVer) {
  const s = db.getSettings();
  try {
    const r = await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/wallet?action=design`, { licenseKey: s.license_key, op: 'get' });
    if (!r || !r.ok) return;
    for (const kind of ['logo', 'hero']) {
      const url = kind === 'logo' ? r.logoUrl : r.heroUrl;
      if (!url) { try { fs.unlinkSync(walletFile(kind)); } catch (e) { /* не было */ } continue; }
      const buf = await httpsGetBuffer(url);
      if (buf && buf.length > 100 && buf.length < 700 * 1024) fs.writeFileSync(walletFile(kind), buf);
    }
    db.saveSettings({ wallet_bg: /^#[0-9a-fA-F]{6}$/.test(r.bg || '') ? r.bg : '', wallet_hero_stamps: r.heroStamps === false ? '0' : '1', wallet_design_ver: String(serverVer || r.ver || '') });
    refreshAllWalletCards();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('remote-config', { keys: ['wallet_design'] });
  } catch (e) { /* в следующий раз */ }
}
function httpsGetBuffer(url) {
  return new Promise((resolve) => {
    try {
      const req = require('https').get(url, { timeout: 15000 }, (res) => {
        if (res.statusCode !== 200) { res.resume(); resolve(null); return; }
        const chunks = []; let n = 0;
        res.on('data', (c) => { n += c.length; if (n > 2 * 1024 * 1024) { req.destroy(); resolve(null); return; } chunks.push(c); });
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });
      req.on('error', () => resolve(null)); req.on('timeout', () => { req.destroy(); resolve(null); });
    } catch (e) { resolve(null); }
  });
}
let cfgPolling = false;
async function pollClientConfig() {
  if (cfgPolling || !db) return { skipped: true };
  const s = db.getSettings();
  if (!s.license_key || !SUBSCRIPTION_API_URL) return { skipped: true };
  cfgPolling = true;
  try {
    const snap = clientCfgSnapshot();
    const hash = crypto.createHash('sha1').update(JSON.stringify(snap)).digest('hex').slice(0, 16);
    const sendSnap = hash !== s.admin_snap_hash || Date.now() - (Number(s.admin_snap_at) || 0) > 6 * 3600e3;
    const r = await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/online?action=client-cfg`, { licenseKey: s.license_key, ver: Number(s.admin_cfg_ver) || 0, ...(sendSnap ? { snap } : {}) });
    if (!r || !r.ok) return { error: (r && r.error) || 'failed' };
    const w = r.wallet || {};
    db.saveSettings({ wallet_google_ok: w.google === false ? '0' : '1', wallet_apple_ok: w.apple ? '1' : '0', ...(sendSnap ? { admin_snap_hash: hash, admin_snap_at: String(Date.now()) } : {}) });
    let applied = null;
    if (r.cfg && Number(r.ver) > (Number(s.admin_cfg_ver) || 0)) applied = applyClientConfig(r.cfg, Number(r.ver));
    if (Number(r.walletVer) > (Number(s.wallet_design_ver) || 0) && s.wallet_design_pending !== '1') await syncWalletDesignFromServer(Number(r.walletVer));
    return { ok: true, applied: applied ? Object.keys(applied).length : 0 };
  } catch (e) { return { error: 'network' }; } finally { cfgPolling = false; }
}
setTimeout(() => { pollClientConfig().catch(() => {}); }, 20000);
setInterval(() => { pollClientConfig().catch(() => {}); }, 5 * 60 * 1000);
ipcMain.handle('cfg:pollNow', () => pollClientConfig());

function onlineInfo() {
  const s = db.getSettings();
  return {
    enabled: s.online_reg_enabled === '1', url: s.online_url || '', hasLicense: !!s.license_key,
    title: s.online_bonus_title || '', percent: Number(s.online_bonus_percent) || 100, days: Number(s.online_bonus_days) || 14,
    regType: s.selfreg_card_type || 'stamp', stats: db.getOnlineBonusStats()
  };
}
ipcMain.handle('online:info', () => onlineInfo());
ipcMain.handle('online:save', async (e, patch) => {
  const p = patch || {};
  db.saveSettings({
    online_reg_enabled: p.enabled ? '1' : '0',
    online_bonus_title: String(p.title || '').trim().slice(0, 80),
    online_bonus_percent: String(Math.max(1, Math.min(100, Number(p.percent) || 100))),
    online_bonus_days: String(Math.max(1, Math.min(90, Number(p.days) || 14)))
  });
  const pub = await publishOnlineProfile();
  if (pub.ok) syncOnlineRegistrations();
  return { ...onlineInfo(), publishError: pub.ok ? null : pub.error, publishDetail: pub.ok ? '' : (pub.detail || '') };
});
ipcMain.handle('online:syncNow', () => syncOnlineRegistrations());
// Как клиенты регистрируются сами: по Wi-Fi заведения (как раньше) или через интернет (QR ведёт на сайт).
ipcMain.handle('selfreg:setMode', async (e, mode) => {
  const s = db.getSettings();
  const m = mode === 'online' ? 'online' : 'wifi';
  if (m === 'online' && !s.license_key) return { error: 'need_license' };
  db.saveSettings({ selfreg_mode: m });
  if (s.license_key) {
    const pub = await publishOnlineProfile();
    if (!pub.ok) { if (m === 'online') db.saveSettings({ selfreg_mode: 'wifi' }); return { error: pub.error || 'failed' }; }
    syncOnlineRegistrations();
  }
  return { ok: true, ...selfregModeInfo() };
});
function selfregModeInfo() {
  const s = db.getSettings();
  return { mode: s.selfreg_mode === 'online' ? 'online' : 'wifi', joinUrl: s.online_url ? String(s.online_url).replace('/r/', '/j/') : '', hasLicense: !!s.license_key };
}
ipcMain.handle('selfreg:modeInfo', () => selfregModeInfo());
// «Новые клиенты»: кто зарегистрировался за последние дни и как.
ipcMain.handle('clients:recent', (e, days) => db.recentClients(Number(days) || 7));
// Профиль на сайте обновляем при запуске (вдруг сменили название/цвет), заявки — раз в минуту.
setTimeout(() => { if (db && db.getSettings().online_reg_enabled === '1') { publishOnlineProfile().then(syncOnlineRegistrations); } }, 15000);
setInterval(() => { if (db) syncOnlineRegistrations(); }, 60 * 1000);

// Отправить клиенту его карту: на email (если есть и почта работает), иначе в Telegram.
async function deliverCardToClient(clientId, cardId) {
  try {
    const st = db.getSettings(), card = db.getCardById(cardId), client = db.getClient(clientId);
    if (!card || !client) return false;
    const lang = ['ru', 'uk', 'sk', 'en'].includes(client.preferred_language) ? client.preferred_language : (st.app_language || 'ru');
    let img = null;
    try { img = await composeCatCardViaRenderer(card.code, lang, card.id); } catch (err) { /* обычный QR */ }
    // v2.16: как в «Настройки → Отправка клиентам»: везде, где клиент есть (или только почта / только Telegram).
    const ch = st.auto_channels === 'email' ? ['email'] : st.auto_channels === 'telegram' ? ['telegram'] : ['email', 'telegram'];
    let ok = false;
    if (ch.includes('email') && client.email && mailReady(st)) { const r = await sendCardEmailNow(cardId, lang, { width: 500, bgColor: '#ffffff' }, img); ok = ok || !!(r && r.ok); }
    if (ch.includes('telegram') && client.telegram_chat_id && st.telegram_bot_token) { const r = await sendCardTelegramNow(cardId, lang, img); ok = ok || !!(r && r.ok); }
    if (!ok && ch.length === 1) {   // выбранного канала у клиента нет — пробуем другой, чтобы карта не потерялась
      if (client.email && mailReady(st) && ch[0] !== 'email') { const r = await sendCardEmailNow(cardId, lang, { width: 500, bgColor: '#ffffff' }, img); ok = !!(r && r.ok); }
      else if (client.telegram_chat_id && st.telegram_bot_token && ch[0] !== 'telegram') { const r = await sendCardTelegramNow(cardId, lang, img); ok = !!(r && r.ok); }
    }
    return ok;
  } catch (err) { writeCrashLog('deliverCard', err); return false; }
}

// ---------- Товары, склад и чеки из кассы ----------
// Фискальный чек печатает сертифицированная касса бизнеса (eKasa и т.п.). Loya получает копию
// чека: сумма → бонусы на карту клиента, товары → списание со склада.
function posReceipt(p, source) {
  if (!p || typeof p !== 'object') return { error: 'bad_json' };
  const pick = (...keys) => { for (const k of keys) if (p[k] !== undefined && p[k] !== null && p[k] !== '') return p[k]; return undefined; };
  const items = Array.isArray(p.items) ? p.items : (Array.isArray(p.lines) ? p.lines : []);
  const r = db.addReceipt({
    source: String(source || 'api').slice(0, 40),
    externalId: pick('id', 'receipt_id', 'receiptId', 'number'),
    total: pick('total', 'amount', 'sum'),
    currency: pick('currency'),
    cardCode: pick('card', 'card_code', 'cardCode', 'loyalty_code'),
    phone: pick('phone', 'customer_phone'),
    createdAt: pick('created_at', 'createdAt', 'date'),
    items: items.map(it => ({ name: it.name || it.title, sku: it.sku || it.code || it.plu, barcode: it.barcode || it.ean, qty: it.qty != null ? it.qty : (it.quantity != null ? it.quantity : 1), price: it.price != null ? it.price : it.unit_price }))
  });
  if (r && r.ok && !r.duplicate && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('remote-data-changed');
  return r;
}

let posSyncing = false, posAck = [];
async function syncPosEvents() {
  const s = db.getSettings();
  if (s.pos_enabled !== '1' || s.pos_cloud !== '1' || !s.license_key || posSyncing) return { skipped: true };
  posSyncing = true;
  try {
    const res = await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/pos-pull`, { licenseKey: s.license_key, ack: posAck });
    if (!res || !res.ok) return { error: (res && res.error) || 'failed' };
    posAck = [];
    let added = 0;
    for (const it of res.items || []) {
      try { const r = posReceipt(it.payload, 'cloud'); if (r && r.ok && !r.duplicate) added++; } catch (err) { writeCrashLog('posReceipt', err); }
      posAck.push(it.id);   // даже ошибочный чек подтверждаем — иначе он приходил бы бесконечно
    }
    if (posAck.length) { try { await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/pos-pull`, { licenseKey: s.license_key, ack: posAck }); posAck = []; } catch (err) { /* подтвердим позже */ } }
    db.saveSettings({ pos_last_sync: new Date().toISOString() });
    return { ok: true, added };
  } catch (err) { return { error: 'network' }; } finally { posSyncing = false; }
}
setInterval(() => { if (db) syncPosEvents(); }, 60 * 1000);

function posInfo() {
  const s = db.getSettings();
  const base = localServer ? localServer.getPairingInfo().url : '';
  return {
    enabled: s.pos_enabled === '1', token: s.pos_token || '', localUrl: base ? base.replace(/\/+$/, '') + '/api/pos/receipt' : '',
    cloud: s.pos_cloud === '1', cloudUrl: s.pos_cloud_url || '', hasLicense: !!s.license_key,
    claimMinutes: Number(s.pos_claim_minutes) || 10, lastSync: s.pos_last_sync || ''
  };
}
ipcMain.handle('pos:info', () => posInfo());
ipcMain.handle('pos:save', async (e, patch) => {
  const p = patch || {};
  const s = db.getSettings();
  const upd = { pos_enabled: p.enabled ? '1' : '0', pos_cloud: p.cloud ? '1' : '0', pos_claim_minutes: String(Math.max(1, Math.min(120, Number(p.claimMinutes) || 10))) };
  if (p.enabled && !s.pos_token) upd.pos_token = crypto.randomBytes(24).toString('hex');
  db.saveSettings(upd);
  let cloudError = null;
  if (p.cloud && p.enabled) {
    try {
      const r = await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/pos-key`, { licenseKey: s.license_key });
      if (r && r.ok) db.saveSettings({ pos_cloud_url: r.url }); else cloudError = (r && r.error) || 'failed';
    } catch (err) { cloudError = 'network'; }
  }
  return { ...posInfo(), cloudError };
});
ipcMain.handle('pos:rotate', async (e, which) => {
  const s = db.getSettings();
  if (which === 'local') db.saveSettings({ pos_token: crypto.randomBytes(24).toString('hex') });
  if (which === 'cloud') {
    try { const r = await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/pos-key`, { licenseKey: s.license_key, rotate: true }); if (r && r.ok) db.saveSettings({ pos_cloud_url: r.url }); } catch (err) { /* ниже вернём как есть */ }
  }
  return posInfo();
});
ipcMain.handle('pos:test', () => posReceipt({ id: 'TEST-' + Date.now(), total: 1, items: [] }, 'test'));
ipcMain.handle('pos:syncNow', () => syncPosEvents());
ipcMain.handle('receipt:claim', (e, receiptId, cardId, applied) => db.claimReceipt(receiptId, cardId, applied));

ipcMain.handle('report:campaigns', (e, days) => db.getCampaignReport({ days: Number(days) || 7, limit: 30 }));
ipcMain.handle('report:week', () => db.getWeekComparison());
ipcMain.handle('report:setCampaignCost', (e, id, cost) => db.setCampaignCost(id, cost));
ipcMain.handle('client:insight', (e, id) => db.getClientInsight(id));
ipcMain.handle('inv:list', (e, f) => db.listProducts(f || {}));
ipcMain.handle('inv:deleteReceipt', (e, id) => db.deleteReceipt(id));
ipcMain.handle('inv:categories', () => db.productCategories());
ipcMain.handle('inv:save', (e, p) => db.saveProduct(p || {}));
ipcMain.handle('inv:delete', (e, id) => db.deleteProduct(id));
ipcMain.handle('inv:move', (e, id, kind, qty, opts) => db.stockMove(id, kind, qty, opts || {}));
ipcMain.handle('inv:moves', (e, f) => db.getStockMoves(f || {}));
ipcMain.handle('inv:summary', () => db.inventorySummary());
ipcMain.handle('inv:receipts', (e, f) => db.listReceipts(f || {}));
ipcMain.handle('inv:importProducts', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { filters: [{ name: 'CSV', extensions: ['csv', 'txt'] }], properties: ['openFile'] });
  if (canceled || !filePaths || !filePaths[0]) return { canceled: true };
  try { return db.importProductsCsv(fs.readFileSync(filePaths[0], 'utf8')); } catch (err) { return { error: 'read_failed' }; }
});
// Выгрузка для бухгалтерии: три CSV-файла за выбранный период в выбранную папку.
ipcMain.handle('inv:export', async (e, period, H, lang) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] });
  if (canceled || !filePaths || !filePaths[0]) return { canceled: true };
  const now = new Date(); const pad = (n) => String(n).padStart(2, '0');
  const ym = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  let from = null, to = null, tag = 'all';
  if (period === 'month') { from = `${ym(now)}-01 00:00:00`; tag = ym(now); }
  if (period === 'prev') { const p = new Date(now.getFullYear(), now.getMonth() - 1, 1); from = `${ym(p)}-01 00:00:00`; to = `${ym(now)}-01 00:00:00`; tag = ym(p); }
  const L = ['ru', 'uk', 'sk', 'en'].includes(lang) ? lang : 'ru';
  const dir = filePaths[0];
  const files = [[`loya-products-${tag}.csv`, db.exportProductsCsv(L, H || {})], [`loya-stock-moves-${tag}.csv`, db.exportMovesCsv(L, H || {}, from, to)], [`loya-receipts-${tag}.csv`, db.exportReceiptsCsv(L, H || {}, from, to)]];
  try { for (const [n, c] of files) fs.writeFileSync(path.join(dir, n), c, 'utf8'); } catch (err) { return { error: 'write_failed' }; }
  return { ok: true, dir, files: files.map(f => f[0]) };
});

// ---------- Доступ из дома ----------
// Владелец включает функцию сам и задаёт пароль. Программа раз в две минуты отправляет на сайт
// Loya копию показателей и список клиентов и забирает правки, сделанные с телефона или
// компьютера (добавить/изменить клиента). Пароль не хранится нигде: на сервер уходит только
// соль и хеш (scrypt). При выключении копия на сервере удаляется.
const OWNER_MIN_PASSWORD = 8;
let ownerSyncing = false;
let ownerLastDigest = '';

function ownerPasswordHash(pass, salt) { return crypto.scryptSync(String(pass), String(salt), 32).toString('hex'); }
function ownerSnapshot() { return db.getOwnerSnapshot(); }
function ownerDigest(snap) { const { at, ...rest } = snap; return crypto.createHash('sha1').update(JSON.stringify(rest)).digest('hex'); }
// Уже применённые правки помним, чтобы после сбоя связи не применить одну и ту же правку дважды.
function ownerAppliedGet() { try { return JSON.parse(db.getSettings().owner_applied || '{}') || {}; } catch (e) { return {}; } }
function ownerAppliedSave(map) {
  const ids = Object.keys(map).map(Number).sort((a, b) => a - b).slice(-150);
  const out = {}; ids.forEach(i => { out[i] = map[i]; });
  db.saveSettings({ owner_applied: JSON.stringify(out) });
}

function ownerInfo() {
  const s = db.getSettings();
  return { enabled: s.owner_enabled === '1', url: s.owner_url || '', hasLicense: !!s.license_key, lastSync: s.owner_last_sync || '', lastError: s.owner_last_error || '', linkExpires: s.owner_link_expires || '', logins: (() => { try { return JSON.parse(s.owner_logins || '[]'); } catch (e) { return []; } })(), minPassword: OWNER_MIN_PASSWORD };
}

async function ownerEnable(password, expiresDays) {
  const s = db.getSettings();
  if (!s.license_key) return { error: 'need_license' };
  if (typeof password !== 'string' || password.length < OWNER_MIN_PASSWORD || password.length > 100) return { error: 'weak_password' };
  const token = crypto.randomBytes(24).toString('hex');   // новая секретная ссылка (старая перестаёт работать)
  const salt = crypto.randomBytes(16).toString('hex');
  let snap;
  try { snap = ownerSnapshot(); } catch (err) { writeCrashLog('ownerSnapshot', err); return { error: 'failed' }; }
  try {
    const res = await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/owner-sync`, { licenseKey: s.license_key, access: { token, salt, hash: ownerPasswordHash(password, salt), expiresDays: [30, 90].includes(Number(expiresDays)) ? Number(expiresDays) : 0 }, snapshot: snap });
    if (!res || !res.ok) return { error: (res && res.error) || 'failed' };
    db.saveSettings({ owner_enabled: '1', owner_url: res.url || '', owner_last_sync: new Date().toISOString(), owner_last_error: '', owner_pending_disable: '0', owner_link_expires: res.linkExpires || '', owner_logins: JSON.stringify(res.logins || []) });
    ownerLastDigest = ownerDigest(snap);
    return { ok: true };
  } catch (err) { return { error: 'network' }; }
}

async function ownerDisable() {
  const s = db.getSettings();
  db.saveSettings({ owner_enabled: '0', owner_url: '', owner_last_error: '', owner_applied: '{}' });
  ownerLastDigest = '';
  if (!s.license_key) return { ok: true };
  try {
    const res = await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/owner-sync`, { licenseKey: s.license_key, disable: true });
    if (res && (res.ok || res.error === 'license_inactive')) { db.saveSettings({ owner_pending_disable: '0' }); return { ok: true }; }
  } catch (err) { /* повторим позже */ }
  db.saveSettings({ owner_pending_disable: '1' });   // копия на сервере удалится, как только появится связь
  return { ok: true, deferred: true };
}

async function ownerSyncOnce(force) {
  const s = db.getSettings();
  if (s.owner_pending_disable === '1' && s.license_key) {
    try { const r = await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/owner-sync`, { licenseKey: s.license_key, disable: true }); if (r && (r.ok || r.error === 'license_inactive')) db.saveSettings({ owner_pending_disable: '0' }); } catch (err) { /* позже */ }
    return { skipped: true };
  }
  if (s.owner_enabled !== '1' || !s.license_key || ownerSyncing) return { skipped: true };
  ownerSyncing = true;
  try {
    const url = `${SUBSCRIPTION_API_URL}/api/owner-sync`;
    const snap = ownerSnapshot(), digest = ownerDigest(snap);
    const changed = force || digest !== ownerLastDigest;
    let res = await httpsPostJson(url, changed ? { licenseKey: s.license_key, snapshot: snap } : { licenseKey: s.license_key, touch: true });
    if (!res || !res.ok) {
      const err = (res && res.error) || 'failed';
      db.saveSettings({ owner_last_error: err });
      // Сервер говорит «не включено» (например, копию удалили вручную) — выключаем и у себя.
      if (err === 'not_enabled') db.saveSettings({ owner_enabled: '0', owner_url: '' });
      return { error: err };
    }
    if (changed) ownerLastDigest = digest;
    // Журнал входов и срок ссылки — показываем владельцу в настройках.
    db.saveSettings({ owner_logins: JSON.stringify(Array.isArray(res.logins) ? res.logins.slice(0, 8) : []), owner_link_expires: res.linkExpires || '' });
    const applied = ownerAppliedGet();
    const acks = [];
    let appliedNow = 0;
    for (const c of res.commands || []) {
      const id = Number(c && c.id);
      if (!Number.isInteger(id)) continue;
      if (applied[id]) { acks.push({ id, ok: !!applied[id].ok, error: applied[id].error || '' }); continue; }
      let r;
      try { r = db.applyOwnerCommand(c.cmd); } catch (err) { writeCrashLog('ownerCommand', err); r = { ok: false, error: 'failed' }; }
      applied[id] = { ok: !!r.ok, error: r.error || '' };
      acks.push({ id, ok: !!r.ok, error: r.error || '' });
      if (r.ok) appliedNow++;
      // Карту, выданную из дома, сразу отправляем клиенту (если владелец не снял галочку).
      if (r.ok && r.cardId && c.cmd && c.cmd.send !== false) deliverCardToClient(r.id, r.cardId);
    }
    if (acks.length) {
      ownerAppliedSave(applied);
      // Сразу отправляем результат и свежие данные — владелец увидит правку без ожидания.
      const fresh = ownerSnapshot();
      try { await httpsPostJson(url, { licenseKey: s.license_key, snapshot: fresh, done: acks }); ownerLastDigest = ownerDigest(fresh); } catch (err) { /* подтвердим на следующем шаге */ }
      if (appliedNow && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('remote-data-changed');
    }
    db.saveSettings({ owner_last_sync: new Date().toISOString(), owner_last_error: '' });
    return { ok: true, applied: appliedNow };
  } catch (err) {
    db.saveSettings({ owner_last_error: 'network' });
    return { error: 'network' };
  } finally { ownerSyncing = false; }
}

ipcMain.handle('owner:info', () => ownerInfo());
ipcMain.handle('owner:enable', async (e, password, expiresDays) => { const r = await ownerEnable(password, expiresDays); return { ...ownerInfo(), error: r.error || null }; });
// «Выйти со всех устройств»: все открытые страницы «Доступа из дома» придётся открыть заново с паролем.
ipcMain.handle('owner:logoutAll', async () => {
  const s = db.getSettings();
  if (s.owner_enabled !== '1' || !s.license_key) return { error: 'not_enabled' };
  try { const r = await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/owner-sync`, { licenseKey: s.license_key, logoutAll: true, touch: true }); return r && r.ok ? { ok: true } : { error: (r && r.error) || 'failed' }; }
  catch (err) { return { error: 'network' }; }
});
ipcMain.handle('owner:disable', async () => { const r = await ownerDisable(); return { ...ownerInfo(), deferred: !!r.deferred }; });
ipcMain.handle('owner:syncNow', async () => { const r = await ownerSyncOnce(true); return { ...ownerInfo(), error: r.error || null }; });
setInterval(() => { if (db) ownerSyncOnce(false); }, 2 * 60 * 1000);
setTimeout(() => { if (db) ownerSyncOnce(true); }, 20000);

// ---------- Telegram: подключение бота и привязка клиентов ----------
ipcMain.handle('telegram:testConnection', async (e, token) => {
  try {
    const result = await telegramApiCall(token, 'getMe', {});
    if (!result.ok) return { ok: false, error: result.description || 'unknown_error' };
    db.saveSettings({ telegram_bot_token: token, telegram_bot_username: result.result.username, telegram_poll: '1', telegram_shared_from: '' });
    startTelegramPolling();
    // Общая база точек включена — делимся ботом с другими точками (они сами решат, подключать ли его).
    if (db.syncState().enabled) orgPost('shared-put', { name: 'telegram', value: { token, username: result.result.username, owner: (db.currentPoint() || {}).name || '' } }).catch(() => {});
    return { ok: true, username: result.result.username, name: result.result.first_name };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('telegram:disconnect', () => {
  telegramPollingEnabled = false;
  const st = db.getSettings();
  // Бот был подключён здесь (не подтянут с другой точки) — убираем его и из общих настроек организации.
  if (st.telegram_bot_token && !st.telegram_shared_from && db.syncState().enabled) orgPost('shared-put', { name: 'telegram', value: null }).catch(() => {});
  db.saveSettings({ telegram_bot_token: '', telegram_bot_username: '', telegram_shared_from: '', telegram_poll: '1' });
  return { ok: true };
});

ipcMain.handle('telegram:getClientLinkInfo', (e, clientId) => {
  const settings = db.getSettings();
  const client = db.getClient(clientId);
  if (!settings.telegram_bot_username || !client) return { connected: false };
  const code = db.getOrCreateTelegramLinkCode(clientId);
  return {
    connected: true,
    linked: !!client.telegram_chat_id,
    deepLink: `https://t.me/${settings.telegram_bot_username}?start=${code}`
  };
});

ipcMain.handle('telegram:disconnectClient', (e, clientId) => {
  db.disconnectClientTelegram(clientId);
  return { ok: true };
});

ipcMain.handle('sendHistory:list', (e, limit) => db.getSendHistory(limit));

// ---------- Поддержка ----------
// Специально не через SMTP (тот у бизнеса может быть не настроен вовсе) — открываем
// обычное mailto:, которое подхватит почтовый клиент, установленный на компьютере.
// Так форма поддержки работает всегда, а не только у тех, кто уже настроил свою почту.
const SUPPORT_EMAIL = 'vladnaruto12@gmail.com';
ipcMain.handle('support:buildMailto', (e, { type, subject, description, priority }) => {
  const settings = db.getSettings();
  const niche = getNiche(settings.business_niche || 'coffee');
  const lines = [
    `Тип обращения: ${type}`,
    `Приоритет: ${priority}`,
    '',
    description,
    '',
    '---',
    `Бизнес: ${settings.brand_name || 'Loya'}`,
    `Ниша: ${niche.name.ru}`,
    `Версия приложения: ${app.getVersion()}`,
    `ОС: ${process.platform} ${process.getSystemVersion ? process.getSystemVersion() : ''}`
  ];
  const mailSubject = `[Loya] ${type}: ${subject}`;
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(lines.join('\n'))}`;
  return { url };
});

// ---------- отписка от рассылок (GDPR) ----------
function getUnsubscribeSecret() {
  const settings = db.getSettings();
  if (settings.unsubscribe_secret) return settings.unsubscribe_secret;
  const secret = crypto.randomBytes(24).toString('hex');
  db.saveSettings({ unsubscribe_secret: secret });
  return secret;
}
function generateUnsubscribeToken(clientId) {
  return crypto.createHmac('sha256', getUnsubscribeSecret()).update(String(clientId)).digest('hex').slice(0, 20);
}
function verifyUnsubscribeToken(clientId, token) {
  return generateUnsubscribeToken(clientId) === token;
}
function getUnsubscribeUrl(clientId) {
  const token = generateUnsubscribeToken(clientId);
  const base = localServer ? localServer.getPairingInfo().url : '';
  return `${base}/unsubscribe?id=${clientId}&token=${token}`;
}
// Добавляет футер со ссылкой отписки в конец письма — только для маркетинговых писем
// (акции/рассылки/поздравления), не для транзакционных (сама карта, напоминание о штампах).
function withUnsubscribeFooter(html, clientId, lang) {
  const L = EMAIL_TEXT[lang] || EMAIL_TEXT.ru;
  return html + L.unsubscribeFooter(getUnsubscribeUrl(clientId));
}

// ---------- Почта: по умолчанию — рабочая почта Loya, либо своя (SMTP) ----------
// Режим «default»: письма уходят через сервер Loya (пароль почты лежит только на сервере,
// клиенту ничего настраивать не нужно), имя отправителя = название бизнеса.
// Режим «custom»: бизнес сам указал свою почту в настройках. Если у бизнеса уже была
// настроена своя почта до этой версии, она продолжает работать как раньше.
function smtpConfigured(s) { return !!(s.smtp_host && s.smtp_user && s.smtp_pass); }
function mailMode(s) { return s.mail_mode || (smtpConfigured(s) ? 'custom' : 'default'); }
function mailReady(s) { return mailMode(s) === 'custom' ? smtpConfigured(s) : !!s.license_key; }
function mailFromName(s) { return String(s.smtp_from_name || s.brand_name || 'Loya').trim() || 'Loya'; }
function mailFrom(s) {
  if (mailMode(s) === 'custom') return s.smtp_from_name ? `"${s.smtp_from_name}" <${s.smtp_user}>` : s.smtp_user;
  return mailFromName(s);
}

function createRelayTransport(settings) {
  return {
    async sendMail(opts) {
      const attachments = (opts.attachments || []).map(a => ({
        filename: a.filename, cid: a.cid, contentType: a.contentType,
        contentBase64: Buffer.isBuffer(a.content) ? a.content.toString('base64') : Buffer.from(String(a.content || '')).toString('base64')
      }));
      let res;
      try {
        res = await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/send-mail`, {
          licenseKey: settings.license_key, fromName: mailFromName(settings),
          replyTo: settings.reply_to_email || '', to: Array.isArray(opts.to) ? opts.to[0] : opts.to,
          subject: opts.subject, html: opts.html, attachments
        });
      } catch (err) { throw new Error('network'); }
      if (!res || res.error) throw new Error((res && res.error) || 'send_failed');
      return { accepted: [opts.to] };
    }
  };
}

function createTransporter(settings) {
  if (mailMode(settings) !== 'custom') return createRelayTransport(settings);
  return nodemailer.createTransport({
    host: settings.smtp_host,
    port: Number(settings.smtp_port) || 587,
    secure: Number(settings.smtp_port) === 465,
    auth: { user: settings.smtp_user, pass: settings.smtp_pass }
  });
}

ipcMain.handle('mail:status', () => {
  const s = db.getSettings();
  const mode = mailMode(s);
  return { mode, ready: mailReady(s), hasLicense: !!s.license_key, smtpConfigured: smtpConfigured(s), fromName: mailFromName(s), replyTo: s.reply_to_email || '' };
});
// «Вернуть по умолчанию»: снова рабочая почта Loya. Свои данные SMTP не стираем —
// их можно включить обратно, просто сохранив форму.
ipcMain.handle('mail:resetDefault', () => { db.saveSettings({ mail_mode: 'default' }); return { ok: true }; });

// Проверка настроек почты — отправляет письмо на тот же адрес, что указан как логин,
// чтобы можно было убедиться, что всё настроено верно, не рассылая реальным клиентам.
// 2.26: пример письма с картой — для предпросмотра в настройках и тестового письма «себе».
const SAMPLE_MAIL = {
  ru: { name: 'Анна', title: 'Бонусная карта', note: 'Это пример: так клиент увидит письмо с картой. Цвет, логотип и название берутся из настроек заведения.' },
  uk: { name: 'Анна', title: 'Бонусна картка', note: 'Це приклад: так клієнт побачить лист із карткою. Колір, логотип і назва беруться з налаштувань закладу.' },
  sk: { name: 'Anna', title: 'Bonusová karta', note: 'Toto je ukážka: takto zákazník uvidí e-mail s kartou. Farba, logo a názov sa berú z nastavení prevádzky.' },
  en: { name: 'Anna', title: 'Bonus card', note: 'This is a sample: this is how a customer sees the card email. Colour, logo and name come from your venue settings.' }
};
async function sampleCardMail(lang, withNote) {
  const L = EMAIL_TEXT[lang] || EMAIL_TEXT.ru, S = SAMPLE_MAIL[lang] || SAMPLE_MAIL.ru;
  const brand = mailBrand(db.getSettings(), lang), code = 'LC-SAMPLE2026', demo = { apple: 'https://loya-loyalty.com', google: 'https://loya-loyalty.com' };
  const qr = await QRCode.toBuffer(code, qrOpts({}, 500));
  const note = withNote ? `<p style="margin:0 0 14px;padding:10px 12px;border-radius:10px;background:#fff7e0;color:#6b5210;font-size:13px">${escHtml(S.note)}</p>` : '';
  const heroPng = await cardHeroPng({ type: 'stamp', stamp_count: 3, stamp_target: 10 }, db.getSettings(), lang);
  const inner = note + mailCardFrame(L.bodyStamp(escHtml(S.name), escHtml(S.title), 3, 10), brand, lang, code, false, !!heroPng) + appleButtonHtml(demo.apple, lang) + walletButtonHtml(demo.google, lang);
  return { subject: L.subjectStamp(S.title), html: mailShell(inner, brand, lang),
    attachments: [{ filename: 'card.png', content: qr, cid: 'qrcode', contentType: 'image/png' }, ...cardHeroAttachments(heroPng), ...walletBadgeAttachments(demo, lang), ...mailBrandAttachments(brand)] };
}
// Предпросмотр в программе: вложения (cid:) подставляются прямо в HTML как картинки data:.
ipcMain.handle('mail:preview', async (e, lang) => {
  try {
    const m = await sampleCardMail(lang, false);
    let html = m.html;
    for (const a of m.attachments) html = html.split('cid:' + a.cid).join(`data:${a.contentType || 'image/png'};base64,${Buffer.from(a.content).toString('base64')}`);
    return { ok: true, subject: m.subject, html };
  } catch (err) { return { error: err.message }; }
});
ipcMain.handle('mail:sendTest', async (e, lang, toEmail) => {
  const L = EMAIL_TEXT[lang] || EMAIL_TEXT.ru;
  const settings = db.getSettings();
  if (!mailReady(settings)) {
    return { error: mailMode(settings) === 'custom' ? L.missingSettings : 'need_license' };
  }
  const recipient = String(toEmail || '').trim() || (mailMode(settings) === 'custom' ? settings.smtp_user : '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(recipient)) return { error: 'bad_email' };
  try {
    const transporter = createTransporter(settings);
    const sample = await sampleCardMail(lang, true);
    await transporter.sendMail({
      from: mailFrom(settings),
      to: recipient,
      subject: L.testEmailSubject(getBrandContext(lang).brandName),
      // Тестовое письмо — это сразу пример письма с картой в оформлении заведения (с пометкой «это пример»).
      html: sample.html.replace('<td style="padding:22px 24px 10px;color:#222222;font:15px/1.55 Arial,Helvetica,sans-serif">', (m) => m + `<div style="margin:0 0 6px;color:#15803d;font-size:13px">${L.testEmailBody.replace(/<\/?p>/g, '')}</div>`),
      attachments: sample.attachments
    });
    return { ok: true };
  } catch (err) {
    return { error: err.message };
  }
});


// Кнопка «Добавить в Google Wallet» в письмах и Telegram — на языке клиента.
const WALLET_BTN = {
  ru: { btn: 'Добавить в Google Wallet', hint: 'Сохраните карту в телефоне — она всегда будет под рукой и сама обновится после покупок.' },
  uk: { btn: 'Додати в Google Wallet', hint: 'Збережіть картку в телефоні — вона завжди буде під рукою й сама оновиться після покупок.' },
  sk: { btn: 'Pridať do Google Wallet', hint: 'Uložte si kartu do telefónu — bude vždy po ruke a po nákupoch sa sama aktualizuje.' },
  en: { btn: 'Add to Google Wallet', hint: 'Save the card on your phone — it’s always at hand and updates itself after purchases.' }
};
const APPLE_BTN = {
  ru: { btn: 'Добавить в Apple Wallet' }, uk: { btn: 'Додати в Apple Wallet' }, sk: { btn: 'Pridať do Apple Wallet' }, en: { btn: 'Add to Apple Wallet' }
};
// Официальные значки Apple / Google Wallet (PNG — SVG почтовики не показывают) идут вложениями
// с cid, поэтому видны в письме без внешних ссылок.
// Если файла значка нет (например, в Android-сборке), письмо уходит с прежней текстовой кнопкой.
// 2.26: оформленное письмо клиенту — шапка в цвете заведения (логотип или значок ниши и название),
// карта с QR в фирменной рамке, подпись внизу. Вёрстка таблицами и инлайн-стилями: так её одинаково показывают Gmail, Outlook и почта на телефоне.
const MAIL_SHELL_TXT = {
  ru: { card: 'Карта лояльности', show: 'Покажите QR-код на кассе', foot: (b) => `Вы получили это письмо, потому что вы клиент «${b}».` },
  uk: { card: 'Картка лояльності', show: 'Покажіть QR-код на касі', foot: (b) => `Ви отримали цей лист, бо ви клієнт «${b}».` },
  sk: { card: 'Vernostná karta', show: 'Ukážte QR kód pri pokladnici', foot: (b) => `Tento e-mail ste dostali, pretože ste zákazníkom „${b}“.` },
  en: { card: 'Loyalty card', show: 'Show the QR code at the till', foot: (b) => `You received this email because you are a customer of ${b}.` }
};
function mailBrand(settings, lang) {
  const ctx = getBrandContext(lang);
  const color = /^#[0-9a-fA-F]{6}$/.test(settings.theme_primary || '') ? settings.theme_primary : '#b8862d';
  const n = parseInt(color.slice(1), 16), lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  let logo = null;
  try { const f = path.join(getDataDir(), BRAND_LOGO_FILE); if (fs.existsSync(f)) logo = fs.readFileSync(f); } catch (e) { /* без логотипа */ }
  return { name: ctx.brandName, emoji: ctx.emoji, color, on: lum > 0.62 ? '#1d1a14' : '#ffffff', logo };
}
function mailBrandAttachments(brand) { return brand.logo ? [{ filename: 'logo.png', content: brand.logo, cid: 'brandlogo', contentType: 'image/png' }] : []; }
// QR-картинка письма (cid:qrcode) — в рамке «карты» цвета заведения; готовая открытка-картинка — просто со скруглением.
// 2.28: картинка карты для письма — ту же рисует сервер Loya для Google/Apple Wallet (штампы, значки, сезон, логотип).
function cardHeroUrl(card, s, lang) {
  const combo = card.type === 'stamp' && Number(card.discount_percent) > 0;
  const q = new URLSearchParams({ type: ['stamp', 'spend', 'discount', 'gift'].includes(card.type) ? card.type : 'stamp', name: String(s.brand_name || 'Loya').slice(0, 60), color: s.theme_primary || '', niche: s.business_niche || 'other',
    currency: s.spend_currency || 'EUR', lang: ['ru', 'uk', 'sk', 'en'].includes(lang) ? lang : 'ru' });
  if (q.get('type') === 'stamp') { q.set('count', Number(card.stamp_count) || 0); q.set('target', Number(card.stamp_target) || 10); if (combo) q.set('pct', Math.round(card.discount_percent)); }
  else if (card.type === 'spend') { q.set('acc', Number(card.spend_accumulated) || 0); q.set('target', Number(card.spend_target) || 0); if (Number(card.bonus_balance) > 0) q.set('bonus', Math.round(card.bonus_balance)); }
  else if (card.type === 'discount') q.set('pct', Number(card.discount_percent) || 0);
  else if (card.type === 'gift') q.set('gb', Number(card.gift_balance) || 0);
  const lk = walletLook(s);
  if (lk.stamp) q.set('si', lk.stamp); if (lk.reward) q.set('sr', lk.reward); if (lk.stampColor) q.set('sc', lk.stampColor.slice(1));
  if (lk.layout) q.set('ly', lk.layout); if (lk.season) { const se = LoyaCardModel.resolveSeason(lk.season); if (se) q.set('se', se); } if (lk.arrange) q.set('ar', lk.arrange);
  const ver = s.wallet_design_pending !== '1' ? s.wallet_design_ver : '';
  const biz = s.license_key ? require('crypto').createHash('sha256').update(String(s.license_key).trim()).digest('hex').slice(0, 16) : '';
  const hasHero = fs.existsSync(walletFile('hero')), hasLogo = fs.existsSync(walletFile('logo'));
  if (biz && ver && hasHero) { q.set('b', biz); q.set('dv', ver); if (s.wallet_hero_stamps === '0') q.set('hs', '0'); }
  if (biz && ver && hasLogo && lk.logoMode) { q.set('lm', lk.logoMode); q.set('b', biz); q.set('dv', ver); for (const [k, v] of [['lz', lk.logoSize], ['lr', lk.logoRot], ['lx', lk.logoX], ['lq', lk.logoY]]) if (v != null) q.set(k, v); if (lk.logoFlip) q.set('lf', '1'); }
  q.set('action', 'hero');
  return `${SUBSCRIPTION_API_URL}/api/wallet?${q.toString()}`;
}
async function cardHeroPng(card, s, lang) {
  if (!SUBSCRIPTION_API_URL) return null;
  const buf = await Promise.race([httpsGetBuffer(cardHeroUrl(card, s, lang)), new Promise(r => setTimeout(() => r(null), 7000))]);
  return buf && buf.length > 500 && buf.slice(1, 4).toString() === 'PNG' ? buf : null;
}
function cardHeroAttachments(png) { return png ? [{ filename: 'card-banner.png', content: png, contentType: 'image/png', cid: 'cardhero' }] : []; }
function mailCardFrame(html, brand, lang, code, isPicture, withHero) {
  const T = MAIL_SHELL_TXT[lang] || MAIL_SHELL_TXT.ru;
  return String(html).replace(/<img src="cid:qrcode"[^>]*>/, () => isPicture
    ? `<img src="cid:qrcode" width="320" style="display:block;margin:16px auto;width:100%;max-width:320px;height:auto;border-radius:14px;border:0" alt="">`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="300" style="margin:18px auto;border-collapse:separate;background:${brand.color};border-radius:18px">
${withHero ? `<tr><td colspan="2" style="padding:0;line-height:0"><img src="cid:cardhero" width="300" style="display:block;width:100%;max-width:300px;height:auto;border:0;border-radius:18px 18px 0 0" alt=""></td></tr>` : ''}
<tr><td style="padding:14px 18px 0;color:${brand.on};font:700 15px Arial,Helvetica,sans-serif">${escHtml(brand.name)}</td><td align="right" style="padding:14px 18px 0;color:${brand.on};font:12px Arial,Helvetica,sans-serif;opacity:.85">${escHtml(T.card)}</td></tr>
<tr><td colspan="2" align="center" style="padding:12px 18px 6px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px"><tr><td style="padding:10px"><img src="cid:qrcode" width="210" height="210" style="display:block;border:0" alt="QR"></td></tr></table></td></tr>
<tr><td colspan="2" align="center" style="padding:4px 18px 16px;color:${brand.on};font:700 13px 'Courier New',monospace;letter-spacing:2px">${escHtml(code || '')}<div style="font:12px Arial,Helvetica,sans-serif;letter-spacing:0;opacity:.85;margin-top:4px">${escHtml(T.show)}</div></td></tr></table>`);
}
function mailShell(innerHtml, brand, lang) {
  const T = MAIL_SHELL_TXT[lang] || MAIL_SHELL_TXT.ru;
  const mark = brand.logo
    ? `<img src="cid:brandlogo" width="36" height="36" style="display:inline-block;vertical-align:middle;border-radius:9px;border:0;margin-right:10px" alt="">`
    : `<span style="font-size:22px;vertical-align:middle;margin-right:8px">${escHtml(brand.emoji || '')}</span>`;
  return `<div style="margin:0;padding:24px 12px;background:#f4f2ee">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;border-collapse:separate;overflow:hidden">
<tr><td style="background:${brand.color};padding:18px 24px;color:${brand.on};font:700 19px Arial,Helvetica,sans-serif">${mark}<span style="vertical-align:middle">${escHtml(brand.name)}</span></td></tr>
<tr><td style="padding:22px 24px 10px;color:#222222;font:15px/1.55 Arial,Helvetica,sans-serif">${innerHtml}</td></tr>
<tr><td style="padding:12px 24px 20px;color:#8a8a8a;font:12px/1.5 Arial,Helvetica,sans-serif;border-top:1px solid #eeeeee">${escHtml(T.foot(brand.name))}</td></tr>
</table></div>`;
}
const BADGE_LANGS = ['ru', 'uk', 'sk', 'en'];
function walletBadgePng(kind, lang) {
  const l = BADGE_LANGS.includes(lang) ? lang : 'ru';
  try { return fs.readFileSync(path.join(__dirname, 'src', 'wallet-badges', `${kind}-${l}.png`)); } catch (e) { return null; }
}
function walletBadgeAttachments(links, lang) {
  const out = [];
  for (const kind of ['apple', 'google']) {
    const png = links[kind] && walletBadgePng(kind, lang);
    if (png) out.push({ filename: `${kind}-wallet.png`, content: png, contentType: 'image/png', cid: `wb-${kind}` });
  }
  return out;
}
function badgeLinkHtml(link, cid, alt, margin) {
  return `<p style="margin:${margin};text-align:center"><a href="${link}" style="display:inline-block;text-decoration:none">
      <img src="cid:${cid}" alt="${alt}" height="44" style="display:inline-block;height:44px;width:auto;border:0"></a></p>`;
}
function appleButtonHtml(link, lang) {
  if (!link) return '';
  const T = APPLE_BTN[lang] || APPLE_BTN.ru;
  if (walletBadgePng('apple', lang)) return badgeLinkHtml(link, 'wb-apple', T.btn, '22px 0 4px');
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0 4px"><tr><td style="border-radius:26px;background:#000000">
      <a href="${link}" style="display:inline-block;padding:13px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:26px">
        ${T.btn}</a></td></tr></table>`;
}
// 2.30: «Открыть карту в браузере» — для гостей без Wallet (штампы и QR всегда актуальные)
const WEB_CARD = { ru: 'Нет Wallet? Откройте карту в браузере', uk: 'Немає Wallet? Відкрийте картку в браузері', sk: 'Nemáte Wallet? Otvorte kartu v prehliadači', en: 'No Wallet? Open your card in the browser' };
function webCardLinkHtml(link, lang) {
  if (!link) return '';
  return `<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13.5px"><a href="${escHtml(link)}" style="color:#7a5d00;text-decoration:underline">🌐 ${escHtml(WEB_CARD[lang] || WEB_CARD.en)}</a></p>`;
}
function walletButtonHtml(link, lang) {
  if (!link) return '';
  const T = WALLET_BTN[lang] || WALLET_BTN.ru;
  const hint = `<p style="margin:0 0 10px;color:#6b6b6b;font-size:13px;font-family:Arial,Helvetica,sans-serif">${T.hint}</p>`;
  if (walletBadgePng('google', lang)) return badgeLinkHtml(link, 'wb-google', T.btn, '16px 0 8px') + hint;
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0 8px"><tr><td style="border-radius:26px;background:#000000">
      <a href="${link}" style="display:inline-block;padding:13px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:26px">
        <span style="font-size:17px">💳</span>&nbsp; ${T.btn}</a></td></tr></table>
    ${hint}`;
}

async function sendCardEmailNow(cardId, lang, qrOptions, cardImageDataUrl) {
  const L = EMAIL_TEXT[lang] || EMAIL_TEXT.ru;
  const settings = db.getSettings();
  if (!mailReady(settings)) {
    return { error: L.missingSettings };
  }
  const card = db.getCardById(cardId);
  if (!card) return { error: L.cardNotFound };
  if (!card.client_email) return { error: L.noEmail };

  // Если готова «открытка с котиком» — отправляем её, иначе запасной вариант — обычный QR.
  const imageBuffer = cardImageDataUrl
    ? Buffer.from(cardImageDataUrl.split(',')[1], 'base64')
    : await QRCode.toBuffer(card.code, qrOpts(qrOptions, 500));

  const transporter = createTransporter(settings);

  const isDiscount = card.type === 'discount';
  const EMAIL_CUR = { EUR: '€', USD: '$', RUB: '₽', UAH: '₴', CZK: 'Kč', PLN: 'zł', HUF: 'Ft', GBP: '£', CHF: 'CHF' }[settings.spend_currency] || '€';
  const roundMoney = (v) => { const n = Math.round((Number(v) || 0) * 100) / 100; return Number.isInteger(n) ? String(n) : n.toFixed(2); };
  const G = card.type === 'gift' ? giftMailText(card, lang, settings) : null;
  const subject = G ? G.subject : isDiscount
    ? L.subjectDiscount(card.discount_percent)
    : L.subjectStamp(card.title);
  const bodyHtml = G ? G.html : isDiscount
    ? L.bodyDiscount(escHtml(card.client_name), card.discount_percent)
    : card.type === 'spend'
      ? L.bodySpend(escHtml(card.client_name), escHtml(card.title), roundMoney(card.spend_accumulated), Number(card.spend_target) > 0 ? roundMoney(card.spend_target) : null, EMAIL_CUR, card.spend_bonus_text || '')
      : L.bodyStamp(escHtml(card.client_name), escHtml(card.title), card.stamp_count, card.stamp_target);

  // Ссылка «Add to Google Wallet» — клиент добавляет карту в телефон прямо из письма.
  // Ссылки «Добавить в Apple Wallet / Google Wallet» — клиент сохраняет карту в телефон прямо из письма.
  const wl = await getWalletLinks(card);
  const mBrand = mailBrand(settings, lang);
  const heroPng = cardImageDataUrl ? null : await cardHeroPng({ ...card, tier: walletTier(card, settings) }, settings, lang);

  try {
    await transporter.sendMail({
      from: mailFrom(settings),
      to: card.client_email,
      subject,
      html: mailShell(mailCardFrame(bodyHtml, mBrand, lang, card.code, !!cardImageDataUrl, !!heroPng) + appleButtonHtml(wl.apple, lang) + walletButtonHtml(wl.google, lang) + webCardLinkHtml(wl.web, lang), mBrand, lang),
      attachments: [{ filename: 'card.png', content: imageBuffer, cid: 'qrcode' }, ...cardHeroAttachments(heroPng), ...walletBadgeAttachments(wl, lang), ...mailBrandAttachments(mBrand)]
    });
    db.logSend({ clientId: card.client_id, channel: 'email', subject, status: 'sent' });
    return { ok: true };
  } catch (err) {
    db.logSend({ clientId: card.client_id, channel: 'email', subject, status: 'error', errorDetail: err.message });
    return { error: err.message };
  }
}

// 2.19: письмо/сообщение с подарочным сертификатом.
const GIFT_TEXT = {
  ru: { s: (b, a) => `🎁 Подарочный сертификат ${b} на ${a}`, h: (n, b, a, d) => `<p>Здравствуйте, ${n}!</p><p>Для вас — <b>подарочный сертификат ${b} на ${a}</b> 🎁</p><p>Покажите QR-код ниже на кассе — сумму можно потратить сразу или частями.${d ? ` Сертификат действует до <b>${d}</b>.` : ''}</p><p><img src="cid:qrcode" alt="QR" style="max-width:280px"></p>`, t: (n, b, a, d) => `${n}, для вас подарочный сертификат ${b} на ${a} 🎁 Покажите QR-код на кассе — можно тратить частями.${d ? ` Действует до ${d}.` : ''}` },
  uk: { s: (b, a) => `🎁 Подарунковий сертифікат ${b} на ${a}`, h: (n, b, a, d) => `<p>Вітаємо, ${n}!</p><p>Для вас — <b>подарунковий сертифікат ${b} на ${a}</b> 🎁</p><p>Покажіть QR-код нижче на касі — суму можна витратити одразу або частинами.${d ? ` Сертифікат діє до <b>${d}</b>.` : ''}</p><p><img src="cid:qrcode" alt="QR" style="max-width:280px"></p>`, t: (n, b, a, d) => `${n}, для вас подарунковий сертифікат ${b} на ${a} 🎁 Покажіть QR-код на касі — можна витрачати частинами.${d ? ` Діє до ${d}.` : ''}` },
  sk: { s: (b, a) => `🎁 Darčeková poukážka ${b} na ${a}`, h: (n, b, a, d) => `<p>Dobrý deň, ${n}!</p><p>Máte <b>darčekovú poukážku ${b} na ${a}</b> 🎁</p><p>Ukážte QR kód nižšie pri pokladni — sumu môžete minúť naraz alebo po častiach.${d ? ` Poukážka platí do <b>${d}</b>.` : ''}</p><p><img src="cid:qrcode" alt="QR" style="max-width:280px"></p>`, t: (n, b, a, d) => `${n}, máte darčekovú poukážku ${b} na ${a} 🎁 Ukážte QR kód pri pokladni — dá sa míňať po častiach.${d ? ` Platí do ${d}.` : ''}` },
  en: { s: (b, a) => `🎁 ${b} gift card for ${a}`, h: (n, b, a, d) => `<p>Hello, ${n}!</p><p>Here is your <b>${b} gift card for ${a}</b> 🎁</p><p>Show the QR code below at the counter — spend it all at once or in parts.${d ? ` Valid until <b>${d}</b>.` : ''}</p><p><img src="cid:qrcode" alt="QR" style="max-width:280px"></p>`, t: (n, b, a, d) => `${n}, here is your ${b} gift card for ${a} 🎁 Show the QR code at the counter — spend it in parts if you like.${d ? ` Valid until ${d}.` : ''}` }
};
function giftMailText(card, lang, settings) {
  const T = GIFT_TEXT[lang] || GIFT_TEXT.ru;
  const sym = { EUR: '€', USD: '$', RUB: '₽', UAH: '₴', CZK: 'Kč', PLN: 'zł', HUF: 'Ft', GBP: '£', CHF: 'CHF' }[settings.spend_currency] || '€';
  const n = Math.round((Number(card.gift_balance) || 0) * 100) / 100; const t = Number.isInteger(n) ? String(n) : n.toFixed(2);
  const amount = lang === 'en' ? sym + t : `${t} ${sym}`;
  const d = card.expires_at ? new Date(String(card.expires_at).slice(0, 10) + 'T12:00:00').toLocaleDateString({ ru: 'ru-RU', uk: 'uk-UA', sk: 'sk-SK', en: 'en-GB' }[lang] || 'ru-RU') : '';
  const brand = settings.brand_name || 'Loya';
  return { subject: T.s(brand, amount), html: T.h(escHtml(card.client_name), escHtml(brand), amount, d), text: T.t(card.client_name, brand, amount, d) };
}

ipcMain.handle('mail:send', async (e, cardId, lang, qrOptions, cardImageDataUrl) => {
  return sendCardEmailNow(cardId, lang, qrOptions, cardImageDataUrl);
});

// Отправка карты клиенту в Telegram — тот же принцип, что и email, но через Bot API.
// Работает только если у клиента уже есть привязанный telegram_chat_id (см. QR-привязку
// в карточке клиента) и в этом бизнесе подключён свой бот.
async function sendCardTelegramNow(cardId, lang, cardImageDataUrl) {
  const L = EMAIL_TEXT[lang] || EMAIL_TEXT.ru;
  const settings = db.getSettings();
  if (!settings.telegram_bot_token) return { error: 'telegram_not_connected' };
  const card = db.getCardById(cardId);
  if (!card) return { error: L.cardNotFound };
  const client = db.getClient(card.client_id);
  if (!client || !client.telegram_chat_id) return { error: 'telegram_not_linked' };

  const isDiscount = card.type === 'discount';
  const G = card.type === 'gift' ? giftMailText(card, lang, settings) : null;
  const subject = G ? G.subject : isDiscount ? L.subjectDiscount(card.discount_percent) : L.subjectStamp(card.title);
  const codeLabel = TELEGRAM_CODE_LABEL[lang] || TELEGRAM_CODE_LABEL.ru;
  const text = G ? `${subject}\n\n${G.text}\n${codeLabel}${card.code}` : `${subject}\n\n${card.client_name}, ${TELEGRAM_CARD_INTRO[lang] ? TELEGRAM_CARD_INTRO[lang]() : TELEGRAM_CARD_INTRO.ru()}\n${codeLabel}${card.code}`;

  try {
    // Та же готовая «открытка» (с котиком или под нишу бизнеса), что уходит на email —
    // собирается в renderer.js (там есть Canvas/DOM) и передаётся сюда уже готовой.
    // Если её почему-то нет под рукой — не страшно, откатываемся на обычный QR-код.
    const imageBuffer = cardImageDataUrl
      ? Buffer.from(cardImageDataUrl.split(',')[1], 'base64')
      : await QRCode.toBuffer(card.code, qrOpts({ width: 500, bgColor: '#ffffff' }, 500));
    const markup = walletKeyboard(await getWalletLinks(card), lang);
    const res = await telegramSendPhoto(settings.telegram_bot_token, client.telegram_chat_id, imageBuffer, text, markup);
    if (!res.ok) throw new Error(res.description || 'send_failed');
    db.logSend({ clientId: card.client_id, channel: 'telegram', subject, status: 'sent' });
    return { ok: true };
  } catch (err) {
    db.logSend({ clientId: card.client_id, channel: 'telegram', subject, status: 'error', errorDetail: err.message });
    return { error: err.message };
  }
}

const TELEGRAM_CARD_INTRO = {
  ru: () => 'вот ваша карта лояльности — покажите этот QR-код при следующей покупке:',
  sk: () => 'tu je vaša vernostná karta — pri ďalšom nákupe ukážte tento QR kód:',
  uk: () => 'ось ваша картка лояльності — покажіть цей QR-код під час наступної покупки:',
  en: () => 'here is your loyalty card — show this QR code on your next purchase:'
};

const TELEGRAM_CODE_LABEL = { ru: 'Код: ', sk: 'Kód: ', uk: 'Код: ', en: 'Code: ' };

// Bot API не поддерживает JSON-запрос с файлом — фото шлётся как multipart/form-data.
// Универсальная отправка файла в Telegram (multipart/form-data) — используется и для
// фото карты (sendPhoto), и для вложения в рассылке, которое может быть картинкой ИЛИ
// произвольным файлом (тогда это sendDocument — Telegram отдельно различает эти методы).
// 2.25: несколько картинок одним сообщением (альбом). Подпись — у первой картинки.
function telegramSendMediaGroup(token, chatId, files, caption) {
  return new Promise((resolve, reject) => {
    const boundary = '----loyaTgGroup' + Date.now();
    const parts = [];
    const media = files.slice(0, 10).map((f, i) => ({ type: 'photo', media: `attach://p${i}`, ...(i === 0 && caption ? { caption: String(caption).slice(0, 1024) } : {}) }));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="media"\r\n\r\n${JSON.stringify(media)}\r\n`));
    files.slice(0, 10).forEach((f, i) => { parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="p${i}"; filename="${String(f.name).replace(/[\r\n"]/g, '_')}"\r\nContent-Type: ${f.mime}\r\n\r\n`)); parts.push(f.buffer); parts.push(Buffer.from('\r\n')); });
    parts.push(Buffer.from(`--${boundary}--\r\n`));
    const body = Buffer.concat(parts);
    const req = https.request({ hostname: 'api.telegram.org', path: `/bot${token}/sendMediaGroup`, method: 'POST', headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length }, timeout: 60000 }, (res) => {
      let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => { try { resolve(JSON.parse(data)); } catch (err) { reject(err); } });
    });
    req.on('error', reject); req.on('timeout', () => req.destroy(new Error('timeout'))); req.write(body); req.end();
  });
}
function telegramSendFile(token, chatId, method, fieldName, fileBuffer, fileName, mimeType, caption, replyMarkup) {
  return new Promise((resolve, reject) => {
    const boundary = '----loyaTelegram' + Date.now();
    const parts = [];
    const pushField = (name, value) => {
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
    };
    pushField('chat_id', chatId);
    if (caption) pushField('caption', caption);
    if (replyMarkup) pushField('reply_markup', JSON.stringify(replyMarkup));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`));
    parts.push(fileBuffer);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const body = Buffer.concat(parts);
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/${method}`,
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length },
      timeout: 30000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (err) { reject(err); } });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.write(body);
    req.end();
  });
}

function telegramSendPhoto(token, chatId, imageBuffer, caption, replyMarkup) {
  return telegramSendFile(token, chatId, 'sendPhoto', 'photo', imageBuffer, 'card.png', 'image/png', caption, replyMarkup);
}


// ===================== v2.16: единая доставка клиенту (email и/или Telegram) с картинкой =====================
// channels — ['email', 'telegram'] (что выбрал владелец). Каждому клиенту уходит только по тем
// каналам, где он доступен (и, для рекламы, где дал согласие). Картинка: в письме — вверху,
// в Telegram — фото с подписью (длинный текст — отдельным сообщением).
const MSG_IMG_DIR = 'msg-img';
const MSG_KINDS = ['birthday', 'winback', 'near', 'welcome', 'nameday', 'campaign', 'congrats', 'reminder'];
function msgImgPath(name) { return path.join(getDataDir(), MSG_IMG_DIR, name); }
function msgImageBuffer(kind, lang) {
  const s = db.getSettings();
  if (s.msg_images === '0' || !MSG_KINDS.includes(kind)) return null;
  for (const f of [`custom-${kind}.jpg`, `${kind}-${lang}.jpg`, `${kind}-${s.app_language || 'ru'}.jpg`, `${kind}-ru.jpg`]) {
    try { return fs.readFileSync(msgImgPath(f)); } catch (e) { /* дальше */ }
  }
  return null;
}
function parseImageDataUrl(u, maxBytes = 3 * 1024 * 1024) {
  const m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(String(u || ''));
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length || buf.length > maxBytes) return null;
  return { buffer: buf, mime: 'image/' + m[1], name: m[1] === 'png' ? 'image.png' : 'image.jpg' };
}
function htmlToPlain(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h\d|li)>/gi, '\n').replace(/<li[^>]*>/gi, '• ')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (m0, href, txt) => (txt.replace(/<[^>]+>/g, '') === href ? href : `${txt.replace(/<[^>]+>/g, '')} (${href})`))
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function normChannels(ch) {
  const list = Array.isArray(ch) ? ch : (ch === 'both' || ch === 'all' ? ['email', 'telegram'] : ch ? [ch] : ['email']);
  return ['email', 'telegram'].filter(c => list.includes(c));
}
function clientReach(c, marketing) {
  const s = db.getSettings();
  const ok = (ch) => marketing ? Database.canMarket(c, ch) : (c && c.do_not_contact != 1 && (ch === 'email' ? !!c.email : !!c.telegram_chat_id));
  return { email: !!c && mailReady(s) && ok('email'), telegram: !!c && !!s.telegram_bot_token && ok('telegram') };
}
/** opts: { channels, subject, html, image: {buffer,mime,name}|null, unsubscribe, lang, kind, campaignId, transporter } */
async function deliverToClient(c, opts) {
  const s = db.getSettings();
  const r = clientReach(c, opts.marketing !== false);
  const out = { email: null, telegram: null };
  const chans = normChannels(opts.channels);
  if (chans.includes('email') && r.email) {
    try {
      const attachments = [];
      let top = '';
      if (opts.image) { attachments.push({ filename: opts.image.name, content: opts.image.buffer, contentType: opts.image.mime, cid: 'loyamsgimage' }); top = '<p style="margin:0 0 18px"><img src="cid:loyamsgimage" alt="" width="560" style="display:block;width:100%;max-width:560px;height:auto;border-radius:14px"></p>'; }
      const html = top + opts.html;
      await (opts.transporter || createTransporter(s)).sendMail({ from: mailFrom(s), to: c.email, subject: opts.subject, html: opts.unsubscribe === false ? html : withUnsubscribeFooter(html, c.id, opts.lang), attachments });
      db.logSend({ clientId: c.id, channel: 'email', subject: opts.logSubject || opts.subject, status: 'sent', campaignId: opts.campaignId });
      out.email = 'sent';
    } catch (err) {
      db.logSend({ clientId: c.id, channel: 'email', subject: opts.logSubject || opts.subject, status: 'error', errorDetail: err.message, campaignId: opts.campaignId });
      out.email = 'error';
    }
  }
  if (chans.includes('telegram') && r.telegram) {
    try {
      const text = `${opts.subject}\n\n${htmlToPlain(opts.html)}`.slice(0, 4000);
      let res;
      if (opts.image) {
        const short = text.length <= 1000;
        res = await telegramSendFile(s.telegram_bot_token, c.telegram_chat_id, 'sendPhoto', 'photo', opts.image.buffer, opts.image.name, opts.image.mime, short ? text : '', opts.replyMarkup);
        if (res.ok && !short) res = await telegramApiCall(s.telegram_bot_token, 'sendMessage', { chat_id: c.telegram_chat_id, text });
      } else {
        res = await telegramApiCall(s.telegram_bot_token, 'sendMessage', { chat_id: c.telegram_chat_id, text, ...(opts.replyMarkup ? { reply_markup: opts.replyMarkup } : {}) });
      }
      if (!res || !res.ok) throw new Error((res && res.description) || 'send_failed');
      db.logSend({ clientId: c.id, channel: 'telegram', subject: opts.logSubject || opts.subject, status: 'sent', campaignId: opts.campaignId });
      out.telegram = 'sent';
    } catch (err) {
      db.logSend({ clientId: c.id, channel: 'telegram', subject: opts.logSubject || opts.subject, status: 'error', errorDetail: err.message, campaignId: opts.campaignId });
      out.telegram = 'error';
    }
  }
  return out;
}
// Итог по пачке: сколько ушло письмами и в Telegram, сколько ошибок и кого пропустили.
function tallyInit() { return { ok: true, sent: 0, failed: 0, telegramSent: 0, telegramFailed: 0, skipped: 0 }; }
function tallyAdd(t, out) {
  if (out.email === 'sent') t.sent++; else if (out.email === 'error') t.failed++;
  if (out.telegram === 'sent') t.telegramSent++; else if (out.telegram === 'error') t.telegramFailed++;
  if (!out.email && !out.telegram) t.skipped++;
}
// Кому можно написать: для окна выбора канала.
function reachTargets(kind, ids) {
  if (kind === 'birthday') return db.getTodayBirthdays();
  if (kind === 'winback') return db.getAdvancedStats().inactiveClients;
  return db.getClientsByIds((Array.isArray(ids) ? ids : []).map(Number).filter(Boolean).slice(0, 5000));
}
ipcMain.handle('msg:reach', (e, { kind, clientIds, marketing } = {}) => {
  const s = db.getSettings();
  const list = reachTargets(kind, clientIds);
  const full = list.length && list[0].do_not_contact === undefined ? db.getClientsByIds(list.map(c => c.id)) : list;
  let email = 0, telegram = 0, none = 0;
  full.forEach(c => { const r = clientReach(c, marketing !== false); if (r.email) email++; if (r.telegram) telegram++; if (!r.email && !r.telegram) none++; });
  return { total: full.length, email, telegram, none, mailReady: mailReady(s), telegramReady: !!s.telegram_bot_token, sendMode: s.send_mode || 'ask', free: isFreeMode() };
});
// Картинки к сообщениям: стандартные рисует окно программы (там есть canvas) и сохраняет сюда,
// свои — загружает владелец. Автоматические рассылки берут их отсюда.
ipcMain.handle('msgimg:sync', (e, list) => {
  if (!Array.isArray(list)) return { error: 'bad' };
  try { fs.mkdirSync(path.join(getDataDir(), MSG_IMG_DIR), { recursive: true }); } catch (err) { /* есть */ }
  let n = 0;
  list.slice(0, 64).forEach(it => {
    if (!it || !MSG_KINDS.includes(it.kind) || !['ru', 'uk', 'sk', 'en'].includes(it.lang)) return;
    const img = parseImageDataUrl(it.dataUrl, 900 * 1024); if (!img || img.mime !== 'image/jpeg') return;
    try { fs.writeFileSync(msgImgPath(`${it.kind}-${it.lang}.jpg`), img.buffer); n++; } catch (err) { /* нет места */ }
  });
  return { ok: true, saved: n };
});
ipcMain.handle('msgimg:custom', (e, kind, dataUrl) => {
  if (!MSG_KINDS.includes(kind)) return { error: 'bad' };
  const file = msgImgPath(`custom-${kind}.jpg`);
  if (dataUrl === undefined) { try { return 'data:image/jpeg;base64,' + fs.readFileSync(file).toString('base64'); } catch (err) { return null; } }
  if (!['owner', 'manager'].includes(sessionRole()) && !roleCan('view:campaigns')) return { error: 'no_access' };
  if (dataUrl === null) { try { fs.unlinkSync(file); } catch (err) { /* не было */ } return { ok: true }; }
  const img = parseImageDataUrl(dataUrl, 1200 * 1024); if (!img || img.mime !== 'image/jpeg') return { error: 'bad_image' };
  try { fs.mkdirSync(path.join(getDataDir(), MSG_IMG_DIR), { recursive: true }); } catch (err) { /* есть */ }
  fs.writeFileSync(file, img.buffer);
  return { ok: true };
});
ipcMain.handle('msgimg:customList', () => MSG_KINDS.filter(k => { try { return fs.existsSync(msgImgPath(`custom-${k}.jpg`)); } catch (e) { return false; } }));
// Личное сообщение одному клиенту (поздравление клиента месяца и т.п.).
const CONGRATS_TEXT = {
  ru: { s: (b) => `Вы — наш клиент месяца! 🏆 ${b}`, h: (n, b, gift) => `<p>${n}, спасибо, что вы так часто с нами!</p><p>В этом месяце вы — самый активный гость <b>${b}</b>.${gift ? ` В знак благодарности для вас подарок: <b>${gift}</b>. Просто скажите об этом при следующем визите.` : ' Приходите — у нас для вас небольшой подарок.'}</p>` },
  uk: { s: (b) => `Ви — наш клієнт місяця! 🏆 ${b}`, h: (n, b, gift) => `<p>${n}, дякуємо, що ви так часто з нами!</p><p>Цього місяця ви — найактивніший гість <b>${b}</b>.${gift ? ` На знак вдячності для вас подарунок: <b>${gift}</b>. Просто скажіть про це під час наступного візиту.` : ' Приходьте — у нас для вас невеликий подарунок.'}</p>` },
  sk: { s: (b) => `Ste náš zákazník mesiaca! 🏆 ${b}`, h: (n, b, gift) => `<p>${n}, ďakujeme, že ste s nami tak často!</p><p>Tento mesiac ste najaktívnejší hosť <b>${b}</b>.${gift ? ` Ako poďakovanie pre vás máme darček: <b>${gift}</b>. Stačí to povedať pri ďalšej návšteve.` : ' Príďte — máme pre vás malý darček.'}</p>` },
  en: { s: (b) => `You are our customer of the month! 🏆 ${b}`, h: (n, b, gift) => `<p>${n}, thank you for visiting us so often!</p><p>This month you are the most loyal guest of <b>${b}</b>.${gift ? ` As a thank-you, here is a gift for you: <b>${gift}</b>. Just mention it on your next visit.` : ' Drop by — we have a small gift for you.'}</p>` }
};
ipcMain.handle('msg:congrats', async (e, { clientId, channels, image, lang: defaultLang } = {}) => {
  const c = db.getClient(Number(clientId)); if (!c) return { error: 'not_found' };
  const lang = CONGRATS_TEXT[c.preferred_language] ? c.preferred_language : (CONGRATS_TEXT[defaultLang] ? defaultLang : 'ru');
  const brand = getBrandContext(lang).brandName;
  const gift = db.getPendingGift(c.id);
  const T = CONGRATS_TEXT[lang];
  const t = tallyInit();
  tallyAdd(t, await deliverToClient(c, { channels, subject: T.s(brand), html: T.h(escHtml(c.name), escHtml(brand), gift ? escHtml(gift.gift_text) : ''), image: kindImage('congrats', lang, image), lang, logSubject: 'congrats', marketing: false, unsubscribe: false }));
  return t;
});
function kindImage(kind, lang, override) {
  if (override === 'none') return null;
  const o = parseImageDataUrl(override); if (o) return o;
  const b = msgImageBuffer(kind, lang); return b ? { buffer: b, mime: 'image/jpeg', name: 'image.jpg' } : null;
}

ipcMain.handle('telegram:sendCard', async (e, cardId, lang, cardImageDataUrl) => {
  return sendCardTelegramNow(cardId, lang, cardImageDataUrl);
});

// Отправляет поздравление с днём рождения всем клиентам, у кого сегодня ДР, указан email
// и дано согласие на маркетинговые письма (GDPR — без согласия такие письма не шлём).
ipcMain.handle('mail:sendBirthdayAll', async (e, defaultLang, opts = {}) => {
  { const g = proOnly(); if (g) return g; }
  const settings = db.getSettings();
  const channels = normChannels(opts.channels || 'email');
  if (channels.length === 1 && channels[0] === 'email' && !mailReady(settings)) return { error: (EMAIL_TEXT[defaultLang] || EMAIL_TEXT.ru).missingSettings };
  const all = db.getClientsByIds(db.getTodayBirthdays().map(c => c.id));
  const t = tallyInit();
  if (!all.length) return t;
  const transporter = mailReady(settings) ? createTransporter(settings) : null;
  const campaignId = db.createCampaign({ kind: 'birthday', title: 'birthday', channels: channels.join('+') });
  for (const c of all) {
    const lang = c.preferred_language || defaultLang || 'ru';
    const L = EMAIL_TEXT[lang] || EMAIL_TEXT.ru;
    tallyAdd(t, await deliverToClient(c, { channels, transporter, subject: L.subjectBirthday, html: L.bodyBirthday(escHtml(c.name), getBrandContext(lang).phrase), image: kindImage('birthday', lang, opts.image), lang, logSubject: 'birthday', campaignId }));
  }
  return t;
});

// Отправляет письмо «мы скучаем» всем клиентам, которые давно не приходили, указан email
// и дано согласие на маркетинговые письма.
ipcMain.handle('mail:sendReengagementAll', async (e, defaultLang, opts = {}) => {
  { const g = proOnly(); if (g) return g; }
  const settings = db.getSettings();
  const channels = normChannels(opts.channels || 'email');
  if (channels.length === 1 && channels[0] === 'email' && !mailReady(settings)) return { error: (EMAIL_TEXT[defaultLang] || EMAIL_TEXT.ru).missingSettings };
  const all = db.getClientsByIds(db.getAdvancedStats().inactiveClients.map(c => c.id));
  const t = tallyInit();
  if (!all.length) return t;
  const transporter = mailReady(settings) ? createTransporter(settings) : null;
  const campaignId = db.createCampaign({ kind: 'winback', title: 'winback', channels: channels.join('+') });
  for (const c of all) {
    const lang = c.preferred_language || defaultLang || 'ru';
    const L = EMAIL_TEXT[lang] || EMAIL_TEXT.ru;
    const ctx = getBrandContext(lang);
    tallyAdd(t, await deliverToClient(c, { channels, transporter, subject: L.subjectReengagement(ctx.emoji), html: L.bodyReengagement(escHtml(c.name), ctx.phrase, ctx.emoji), image: kindImage('winback', lang, opts.image), lang, logSubject: 'winback', campaignId }));
  }
  return t;
});

// Рассылка произвольного сообщения выбранному сегменту клиентов — только тем, кто дал
// согласие на маркетинговые письма (GDPR).
// 2.25: вложений может быть несколько (до 6 картинок/файлов, всего до 20 МБ)
function parseCampaignFiles(list) {
  const out = []; let total = 0;
  for (const a of (Array.isArray(list) ? list : []).slice(0, 6)) {
    if (!a || !a.dataUrl || !a.name) continue;
    const m = String(a.dataUrl).match(/^data:([^;]+);base64,(.+)$/); if (!m) continue;
    const buffer = Buffer.from(m[2], 'base64'); total += buffer.length; if (total > 20 * 1024 * 1024) break;
    out.push({ mime: m[1], buffer, name: String(a.name).slice(0, 120) });
  }
  return out;
}
ipcMain.handle('mail:sendCampaign', async (e, { subject, bodyText, lang: defaultLang, clientIds, attachment, attachments: attachList, sendEmail, alsoTelegram }) => {
  const files = parseCampaignFiles(Array.isArray(attachList) && attachList.length ? attachList : (attachment ? [attachment] : []));
  { const g = proOnly(); if (g) return g; }
  const settings = db.getSettings();
  const wantEmail = sendEmail !== false; // по умолчанию true — на случай старых вызовов без этого поля
  if (wantEmail && (!mailReady(settings))) {
    return { error: (EMAIL_TEXT[defaultLang] || EMAIL_TEXT.ru).missingSettings };
  }

  let sent = 0, failed = 0, skipped = 0;
  const campaignId = db.createCampaign({ kind: 'campaign', title: subject, channels: [wantEmail && 'email', alsoTelegram && 'telegram'].filter(Boolean).join('+') });
  if (wantEmail) {
    const withEmail = db.getClientsByIds(clientIds).filter(c => c.email);
    const clients = withEmail.filter(c => Database.canMarket(c, 'email'));
    skipped = clientIds.length - clients.length;

    if (clients.length > 0) {
      const transporter = createTransporter(settings);
      // Текст владельца → безопасный HTML: экранируем, ссылки делаем кликабельными, {name} — имя клиента.
      const linkify = (txt) => escHtml(txt).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
      const bodyHtmlFor = (name) => String(bodyText || '')
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => `<p>${linkify(line).replace(/\{name\}/gi, escHtml(name))}</p>`)
        .join('');

      // Вложение (необязательное): картинку показываем прямо в теле письма,
      // любой другой файл прикладываем обычным вложением.
      const attachments = [];
      let imageHtml = '';
      files.forEach((f, i) => {
        if (f.mime.startsWith('image/')) {
          attachments.push({ filename: f.name, content: f.buffer, contentType: f.mime, cid: 'campaignimage' + i });
          imageHtml += `<p style="margin:0 0 14px"><img src="cid:campaignimage${i}" alt="" style="display:block;width:100%;max-width:560px;height:auto;border-radius:14px" /></p>`;
        } else attachments.push({ filename: f.name, content: f.buffer, contentType: f.mime });
      });

      for (const c of clients) {
        const lang = c.preferred_language || defaultLang;
        const hello = { sk: 'Dobrý deň', uk: 'Доброго дня', en: 'Hello', ru: 'Здравствуйте' }[lang] || 'Здравствуйте';
        // Если владелец сам обратился по имени ({name}) — отдельное приветствие не добавляем.
        const usesName = /\{name\}/i.test(String(bodyText || ''));
        const greeting = usesName ? '' : `<p>${hello}, ${escHtml(c.name)}!</p>`;
        try {
          await transporter.sendMail({
            to: c.email,
            subject: String(subject || '').replace(/\{name\}/gi, String(c.name || '').replace(/[\r\n]/g, ' ')),
            html: withUnsubscribeFooter(imageHtml + greeting + bodyHtmlFor(c.name), c.id, lang),
            attachments,
            from: mailFrom(settings)
          });
          db.logSend({ clientId: c.id, channel: 'email', subject, status: 'sent', campaignId });
          sent++;
        } catch (err) {
          db.logSend({ clientId: c.id, channel: 'email', subject, status: 'error', errorDetail: err.message, campaignId });
          failed++;
        }
      }
    }
  }

  // Telegram — дополнительный канал той же рассылки, независимо от email (клиент может
  // иметь только Telegram, без почты, и тогда его смысл рассылки не должен потеряться).
  let telegramSent = 0, telegramFailed = 0;
  if (alsoTelegram && settings.telegram_bot_token) {
    const allTargets = db.getClientsByIds(clientIds).filter(c => Database.canMarket(c, 'telegram'));
    const plainText = `${subject}\n\n${String(bodyText || '')}`;

    // Разбираем вложение один раз заранее (а не в цикле на каждого клиента) — если это
    // картинка, шлём как фото с подписью; любой другой файл — как документ с подписью.
    const images = files.filter(f => f.mime.startsWith('image/'));
    const fileInfo = files.length === 1 ? files[0] : null;
    const others = files.length > 1 ? files.filter(f => !f.mime.startsWith('image/')) : [];

    for (const c of allTargets) {
      const textFor = plainText.replace(/\{name\}/gi, String(c.name || ''));
      try {
        let res;
        if (files.length > 1 && images.length > 1) {
          // несколько картинок — одним альбомом с подписью; прочие файлы — следом документами
          res = await telegramSendMediaGroup(settings.telegram_bot_token, c.telegram_chat_id, images, textFor);
          for (const f of others) { try { await telegramSendFile(settings.telegram_bot_token, c.telegram_chat_id, 'sendDocument', 'document', f.buffer, f.name, f.mime, ''); } catch (err2) { /* один файл не дошёл — не страшно */ } }
        } else if (files.length > 1) {
          res = await telegramApiCall(settings.telegram_bot_token, 'sendMessage', { chat_id: c.telegram_chat_id, text: textFor });
          for (const f of files) { try { const img = f.mime.startsWith('image/'); await telegramSendFile(settings.telegram_bot_token, c.telegram_chat_id, img ? 'sendPhoto' : 'sendDocument', img ? 'photo' : 'document', f.buffer, f.name, f.mime, ''); } catch (err2) { /* дальше */ } }
        } else if (fileInfo) {
          const isImage = fileInfo.mime.startsWith('image/');
          res = await telegramSendFile(
            settings.telegram_bot_token, c.telegram_chat_id,
            isImage ? 'sendPhoto' : 'sendDocument', isImage ? 'photo' : 'document',
            fileInfo.buffer, fileInfo.name, fileInfo.mime, textFor
          );
        } else {
          res = await telegramApiCall(settings.telegram_bot_token, 'sendMessage', { chat_id: c.telegram_chat_id, text: textFor });
        }
        if (!res.ok) throw new Error(res.description || 'send_failed');
        db.logSend({ clientId: c.id, channel: 'telegram', subject, status: 'sent', campaignId });
        telegramSent++;
      } catch (err) {
        db.logSend({ clientId: c.id, channel: 'telegram', subject, status: 'error', errorDetail: err.message, campaignId });
        telegramFailed++;
      }
    }
  }

  return { ok: true, sent, failed, skipped, telegramSent, telegramFailed };
});

// ---------- экспорт и сброс данных ----------

function csvEscape(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// Экспорт клиентов в CSV — заголовки и название окна на языке приложения, больше полезных
// колонок (визиты, награды, потрачено, язык, согласие на рассылки).
const CSV_TEXT = {
  ru: { title: 'Экспорт клиентов', header: ['Имя', 'Email', 'Телефон', 'Дата рождения', 'Дата регистрации', 'Карт', 'Покупок', 'Наград', 'Потрачено', 'Язык', 'Согласие на рассылки', 'Заметка'], yes: 'да', no: 'нет', importTitle: 'Импорт клиентов', noNameCol: 'В файле не найдена колонка с именем клиента (ожидается заголовок «Имя»).' },
  uk: { title: 'Експорт клієнтів', header: ['Ім’я', 'Email', 'Телефон', 'Дата народження', 'Дата реєстрації', 'Карток', 'Покупок', 'Нагород', 'Витрачено', 'Мова', 'Згода на розсилки', 'Нотатка'], yes: 'так', no: 'ні', importTitle: 'Імпорт клієнтів', noNameCol: 'У файлі не знайдено колонку з ім’ям клієнта (очікується заголовок «Ім’я»).' },
  sk: { title: 'Export klientov', header: ['Meno', 'Email', 'Telefón', 'Dátum narodenia', 'Dátum registrácie', 'Kariet', 'Nákupov', 'Odmien', 'Minuté', 'Jazyk', 'Súhlas s e-mailami', 'Poznámka'], yes: 'áno', no: 'nie', importTitle: 'Import klientov', noNameCol: 'V súbore sa nenašiel stĺpec s menom klienta (očakáva sa hlavička „Meno“).' },
  en: { title: 'Export clients', header: ['Name', 'Email', 'Phone', 'Birthday', 'Registered', 'Cards', 'Purchases', 'Rewards', 'Spent', 'Language', 'Marketing consent', 'Note'], yes: 'yes', no: 'no', importTitle: 'Import clients', noNameCol: 'The file has no client name column (expected a “Name” header).' }
};
function csvTextForApp() {
  const lang = (db && db.getSettings().app_language) || 'ru';
  return CSV_TEXT[lang] || CSV_TEXT.ru;
}

function buildClientsCsv(clients) {
  const T = csvTextForApp();
  const rows = clients.map(c => [
    c.name, c.email, c.phone, c.birthday, c.created_at, c.cards_count,
    c.lifetime_purchases || 0, c.lifetime_rewards || 0,
    c.total_spent ? Math.round(c.total_spent * 100) / 100 : 0,
    c.preferred_language || '', c.marketing_consent ? T.yes : T.no, c.notes || ''
  ]);
  const lines = [T.header, ...rows].map(row => row.map(csvEscape).join(','));
  // BOM в начале — чтобы Excel на Windows правильно показывал кириллицу.
  return '\uFEFF' + lines.join('\r\n');
}

ipcMain.handle('data:exportClientsCsv', async () => {
  const clients = db.getAllClientsForExport();
  const csv = buildClientsCsv(clients);
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: csvTextForApp().title,
    defaultPath: `clients-export-${new Date().toISOString().slice(0, 10)}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if (canceled || !filePath) return { canceled: true };
  fs.writeFileSync(filePath, csv, 'utf8');
  return { canceled: false, filePath };
});

ipcMain.handle('data:resetStats', () => {
  createBackup('before-reset-stats');
  db.resetStatistics();
  return { ok: true };
});

ipcMain.handle('data:resetAll', () => {
  createBackup('before-reset-all');
  db.resetAllData();
  return { ok: true };
});

// ---------- PIN-код на опасные действия ----------
function hashPin(pin, salt) {
  return crypto.scryptSync(String(pin), salt, 32).toString('hex');
}

ipcMain.handle('pin:isSet', () => {
  const settings = db.getSettings();
  return !!settings.pin_hash;
});

ipcMain.handle('pin:set', (e, pin) => {
  if (!/^\d{4,8}$/.test(String(pin || ''))) {
    return { error: 'pin_format' };
  }
  const salt = crypto.randomBytes(16).toString('hex');
  db.saveSettings({ pin_salt: salt, pin_hash: hashPin(pin, salt) });
  return { ok: true };
});

ipcMain.handle('pin:verify', (e, pin) => {
  const settings = db.getSettings();
  if (!settings.pin_hash || !settings.pin_salt) return { ok: true }; // PIN не установлен — пропускаем
  const ok = hashPin(pin, settings.pin_salt) === settings.pin_hash;
  return { ok };
});

// ---------- смены сотрудников ----------
// Кто сейчас работает за этим компьютером: null — владелец (или режим сотрудников выключен).
let currentStaffSession = null;
function applyDeskScanContext() {
  db.setScanContext({ staffId: currentStaffSession ? currentStaffSession.id : null, source: 'desk' });
}

// Кто за компьютером: owner — владелец (сессии нет), manager — администратор, cashier — кассир.
function sessionRole() { return currentStaffSession ? currentStaffSession.role : 'owner'; }
function canManageStaff() { return sessionRole() !== 'cashier'; }
// ---------- права сотрудников: какие вкладки открывать и что делать на них ----------
// Владелец задаёт права кассира и администратора, администратор — только кассира
// («Настройки → Сотрудники и точки → Права»). Владелец может всё.
const PERM_VIEWS = ['clients', 'newcard', 'scan', 'appointments', 'campaigns', 'inventory', 'marketing', 'settings'];   // «Главная» доступна всегда
const PERM_ACTS = ['stats', 'dashEdit', 'clientAdd', 'clientEdit', 'clientDelete', 'cardDelete', 'cardManual', 'scanUndo', 'sendCards', 'exportData', 'productsEdit'];
const CHANNEL_PERMS = {
  'clients:add': 'clientAdd', 'data:importClientsCsv': 'clientAdd', 'import:commit': 'clientAdd', 'import:open': 'clientAdd',
  'clients:update': 'clientEdit', 'gift:save': 'clientEdit',
  'clients:delete': 'clientDelete', 'cards:delete': 'cardDelete', 'clients:merge': 'clientDelete',
  'cards:create': 'view:newcard', 'cards:setTemplateId': 'view:newcard',
  'cards:markManual': 'cardManual', 'scan:undoLast': 'scanUndo',
  'mail:send': 'sendCards', 'telegram:sendCard': 'sendCards', 'wallet:sendLink': 'sendCards',
  'mail:sendCampaign': 'view:campaigns', 'mail:sendBirthdayAll': 'view:campaigns', 'mail:sendReengagementAll': 'view:campaigns',
  'mail:sendNamedayAll': 'view:campaigns', 'mail:sendCupsReminder': 'view:campaigns', 'auto:runNow': 'view:campaigns',
  'inv:save': 'productsEdit', 'inv:delete': 'productsEdit', 'inv:move': 'productsEdit', 'inv:importProducts': 'productsEdit', 'inv:deleteReceipt': 'productsEdit',
  'data:exportClientsCsv': 'exportData', 'inv:export': 'exportData', 'data:exportOperations': 'exportData',
  'report:setCampaignCost': 'view:marketing',
  'msg:congrats': 'sendCards',
  'cloud:fetch': 'view:settings', 'cloud:setOn': 'view:settings', 'cloud:backupNow': 'view:settings', 'cloud:list': 'view:settings',
  'report:sendNow': 'view:settings', 'report:preview': 'view:settings', 'geo:search': 'view:settings', 'geo:info': 'view:settings', 'geo:apply': 'view:settings', 'wallet:refreshAll': 'view:settings',
  // 2.20
  'book:save': 'view:settings', 'dk:connect': 'view:settings', 'dk:disconnect': 'view:settings', 'pos:importCsv': 'view:settings', 'profile:republish': 'view:settings',
  'appt:save': 'view:appointments', 'appt:status': 'view:appointments', 'appt:delete': 'view:appointments', 'appt:arrived': 'view:appointments',
  'fb:askNow': 'sendCards', 'ref:send': 'sendCards'
};
function defaultPermMatrix(s) {
  const del = s.perm_cashier_delete === '1' ? 1 : 0;
  const all = (keys, v) => Object.fromEntries(keys.map(k => [k, v]));
  return {
    cashier: {
      views: { clients: 1, newcard: 1, scan: 1, appointments: 1, campaigns: 0, inventory: 0, marketing: 0, settings: 0 },
      acts: { stats: s.perm_cashier_stats !== '0' ? 1 : 0, dashEdit: 0, clientAdd: 1, clientEdit: 1, clientDelete: del, cardDelete: del, cardManual: 1, scanUndo: 1, sendCards: 1, exportData: 0, productsEdit: 0 },
      maxDiscount: Math.max(0, Math.min(100, Number(s.perm_cashier_max_discount) || 0))
    },
    manager: { views: all(PERM_VIEWS, 1), acts: all(PERM_ACTS, 1), maxDiscount: 0 }
  };
}
function normPermRole(base, raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const pick = (keys, src, dflt) => Object.fromEntries(keys.map(k => [k, src && k in src ? (src[k] ? 1 : 0) : dflt[k]]));
  return {
    views: pick(PERM_VIEWS, r.views, base.views),
    acts: pick(PERM_ACTS, r.acts, base.acts),
    maxDiscount: 'maxDiscount' in r ? Math.max(0, Math.min(100, Math.round(Number(r.maxDiscount) || 0))) : base.maxDiscount
  };
}
function permMatrix() {
  const s = db.getSettings();
  const base = defaultPermMatrix(s);
  let saved = {};
  try { saved = JSON.parse(s.perm_matrix || '{}') || {}; } catch (e) { saved = {}; }
  return { cashier: normPermRole(base.cashier, saved.cashier), manager: normPermRole(base.manager, saved.manager) };
}
// need: 'view:clients' — вкладка; 'clientDelete' — действие. Товары можно менять, только если открыта их вкладка.
function roleCan(need) {
  const role = sessionRole();
  if (role === 'owner') return true;
  const m = permMatrix()[role];
  if (!m) return false;
  if (need.startsWith('view:')) { const v = need.slice(5); return v === 'dashboard' || v === 'profile' || !!m.views[v]; }
  if (need === 'productsEdit' && !m.views.inventory) return false;
  return !!m.acts[need];
}
function perms() {
  const s = db.getSettings();
  const m = permMatrix();
  return {
    cashierStats: !!m.cashier.acts.stats,
    cashierMaxDiscount: m.cashier.maxDiscount,
    cashierDelete: !!m.cashier.acts.clientDelete,
    staffTheme: s.perm_staff_theme !== '0',
    standardDiscount: Number(s.selfreg_discount_percent) || 0,
    matrix: m
  };
}
function staffThemeFor(staff) {
  return perms().staffTheme && staff && staff.theme_name ? staff.theme_name : null;
}

// Ограничение попыток входа: после 5 неверных PIN/кодов подряд — пауза 30 с, дальше дольше (до 10 мин).
const loginGuard = { fails: 0, until: 0 };
function loginLocked() { const left = loginGuard.until - Date.now(); return left > 0 ? Math.ceil(left / 1000) : 0; }
function loginFailed() {
  loginGuard.fails++;
  if (loginGuard.fails >= 5) loginGuard.until = Date.now() + Math.min(600000, 30000 * Math.pow(2, loginGuard.fails - 5));
}
function loginOk() { loginGuard.fails = 0; loginGuard.until = 0; }
function staffLoggedIn(staff) {
  loginOk();
  currentStaffSession = { id: staff.id, name: staff.name, role: staff.role };
  applyDeskScanContext();
  // Если за сотрудником закреплена точка — этот компьютер работает в ней.
  if (staff.location_id) db.saveSettings({ current_location_id: String(staff.location_id) });
  return { ok: true, role: staff.role, name: staff.name, id: staff.id, theme: staffThemeFor(staff) };
}

// Код входа с QR-карточки — 12 цифр: одинаково читается камерой, сканером (при любой раскладке
// клавиатуры) и телефоном, и его легко ввести руками. Хранится только хэш — показать код
// повторно нельзя, можно выпустить новую карточку (старая сразу перестаёт работать).
function normLoginCode(raw) { return String(raw || '').replace(/\D/g, ''); }
function loginCodeHash(code, salt) { return crypto.createHash('sha256').update(String(salt) + ':' + code).digest('hex'); }
function newLoginCode() { let c = ''; for (let i = 0; i < 12; i++) c += String(crypto.randomInt(0, 10)); return c; }
function sameHex(a, b) { return !!a && !!b && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); }
function loginByCode(raw) {
  const wait = loginLocked();
  if (wait) return { ok: false, error: 'locked', wait };
  const st = db.getSettings();
  if (st.staff_mode_enabled !== '1') return { ok: false, error: 'staff_mode_off' };
  const code = normLoginCode(raw);
  if (code.length !== 12) { loginFailed(); return { ok: false }; }
  if (st.owner_login_hash && sameHex(loginCodeHash(code, st.owner_login_salt), st.owner_login_hash)) {
    loginOk(); currentStaffSession = null; applyDeskScanContext();
    return { ok: true, role: 'owner', name: null, theme: null };
  }
  const hit = db.listStaffAuth().find(x => x.login_hash && sameHex(loginCodeHash(code, x.login_salt), x.login_hash));
  if (hit) return staffLoggedIn(hit);
  loginFailed();
  return { ok: false };
}
function looksLikeLoginCode(raw) { return /^\d{12}$/.test(normLoginCode(raw)) && String(raw || '').replace(/[\s-]/g, '').length === 12; }
// Вход по коду, отсканированному телефоном-сканером: окно на компьютере сразу переключается.
function loginByCodeFromPhone(raw) {
  const r = loginByCode(raw);
  if (r.ok && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('staff-logged-in', r);
  return r;
}

ipcMain.handle('staff:list', () => db.listStaff());
ipcMain.handle('staff:add', (e, { name, role, pin, locationId, email }) => {
  if (!canManageStaff()) return { error: 'no_access' };
  if (!String(name || '').trim()) return { error: 'name' };
  if (!/^\d{4,8}$/.test(String(pin || ''))) return { error: 'pin_format' };
  const salt = crypto.randomBytes(16).toString('hex');
  db.addStaff({ name: String(name).trim(), role, pinSalt: salt, pinHash: hashPin(pin, salt), locationId, email });
  const added = db.listStaff().filter(x => x.name === String(name).trim()).sort((a, b) => b.id - a.id)[0];
  return { ok: true, id: added ? added.id : null };
});
ipcMain.handle('staff:update', (e, id, { name, role, pin, locationId, email }) => {
  if (!canManageStaff()) return { error: 'no_access' };
  let pinSalt, pinHash;
  if (pin) {
    if (!/^\d{4,8}$/.test(String(pin))) return { error: 'pin_format' };
    pinSalt = crypto.randomBytes(16).toString('hex');
    pinHash = hashPin(pin, pinSalt);
  }
  db.updateStaff(id, { name, role, locationId, pinSalt, pinHash });
  if (email !== undefined) db.setStaffEmail(id, email);
  return { ok: true };
});
ipcMain.handle('staff:remove', (e, id) => {
  if (!canManageStaff()) return { error: 'no_access' };
  db.removeStaff(id); return { ok: true };
});
// Вход: staffId = null — владелец (проверяется основной PIN), иначе — PIN сотрудника.
ipcMain.handle('staff:login', (e, staffId, pin) => {
  const wait = loginLocked();
  if (wait) return { ok: false, error: 'locked', wait };
  if (!staffId) {
    const st = db.getSettings();
    const ok = !st.pin_hash || hashPin(pin, st.pin_salt) === st.pin_hash;
    if (ok) { loginOk(); currentStaffSession = null; applyDeskScanContext(); return { ok: true, role: 'owner', name: null, theme: null }; }
    loginFailed();
    return { ok: false };
  }
  const staff = db.getStaffAuth(staffId);
  if (!staff || !staff.pin_hash) { loginFailed(); return { ok: false }; }
  if (hashPin(pin, staff.pin_salt) === staff.pin_hash) return staffLoggedIn(staff);
  loginFailed();
  return { ok: false };
});
ipcMain.handle('staff:loginByCode', (e, code) => loginByCode(code));
ipcMain.handle('staff:logout', () => { currentStaffSession = null; applyDeskScanContext(); return { ok: true }; });
ipcMain.handle('staff:session', () => currentStaffSession);
ipcMain.handle('staff:perms', () => ({ role: sessionRole(), ...perms() }));
// Права роли: владелец меняет права кассира и администратора, администратор — только кассира.
ipcMain.handle('staff:setPerms', (e, role, data) => {
  const me = sessionRole();
  if (!['cashier', 'manager'].includes(role)) return { error: 'bad_role' };
  if (me === 'cashier' || (me === 'manager' && role !== 'cashier')) return { error: 'no_access' };
  const cur = permMatrix();
  cur[role] = normPermRole(cur[role], data);
  db.saveSettings({ perm_matrix: JSON.stringify(cur) });
  return { ok: true, matrix: cur };
});
// Новая QR-карточка входа: staffId = null — карточка владельца (выпускает только владелец).
ipcMain.handle('staff:issueCode', (e, staffId) => {
  if (!canManageStaff()) return { error: 'no_access' };
  if (!staffId && sessionRole() !== 'owner') return { error: 'no_access' };
  const code = newLoginCode();
  const salt = crypto.randomBytes(16).toString('hex');
  if (!staffId) db.saveSettings({ owner_login_salt: salt, owner_login_hash: loginCodeHash(code, salt) });
  else {
    const staff = db.getStaffAuth(staffId);
    if (!staff) return { error: 'not_found' };
    db.setStaffLogin(staffId, salt, loginCodeHash(code, salt));
  }
  return { ok: true, code };
});
ipcMain.handle('staff:revokeCode', (e, staffId) => {
  if (!canManageStaff()) return { error: 'no_access' };
  if (!staffId) { if (sessionRole() !== 'owner') return { error: 'no_access' }; db.saveSettings({ owner_login_salt: '', owner_login_hash: '' }); }
  else db.setStaffLogin(staffId, null, null);
  return { ok: true };
});
// Свой цвет программы — только для себя и только если владелец разрешил.
ipcMain.handle('staff:setMyTheme', (e, themeName) => {
  if (!currentStaffSession) return { error: 'owner' };
  if (!perms().staffTheme) return { error: 'not_allowed' };
  const name = themeName ? String(themeName).replace(/[^a-z]/g, '').slice(0, 20) : null;
  db.setStaffTheme(currentStaffSession.id, name);
  return { ok: true, theme: name };
});
const STAFF_MAIL = {
  ru: { subject: (b) => `Ваша карточка для входа — ${b}`, hi: (n) => `Здравствуйте, ${n}!`, body: 'Это ваша карточка для входа в программу Loya. На экране «Кто сейчас работает?» отсканируйте QR-код камерой, сканером или телефоном — или введите код вручную.', code: 'Код для входа', keep: 'Не передавайте карточку другим людям. Если потеряете — попросите выпустить новую, старая перестанет работать.' },
  uk: { subject: (b) => `Ваша картка для входу — ${b}`, hi: (n) => `Вітаємо, ${n}!`, body: 'Це ваша картка для входу в програму Loya. На екрані «Хто зараз працює?» відскануйте QR-код камерою, сканером або телефоном — або введіть код вручну.', code: 'Код для входу', keep: 'Не передавайте картку іншим людям. Якщо загубите — попросіть випустити нову, стара перестане працювати.' },
  sk: { subject: (b) => `Vaša karta na prihlásenie — ${b}`, hi: (n) => `Dobrý deň, ${n}!`, body: 'Toto je vaša karta na prihlásenie do programu Loya. Na obrazovke „Kto práve pracuje?“ naskenujte QR kód kamerou, skenerom alebo telefónom — alebo zadajte kód ručne.', code: 'Prihlasovací kód', keep: 'Kartu nedávajte iným ľuďom. Ak ju stratíte, požiadajte o novú — stará prestane fungovať.' },
  en: { subject: (b) => `Your sign-in card — ${b}`, hi: (n) => `Hello, ${n}!`, body: 'This is your card for signing in to Loya. On the “Who is working now?” screen, scan the QR code with the camera, a scanner or the phone — or type the code.', code: 'Sign-in code', keep: 'Do not share this card. If you lose it, ask for a new one — the old one will stop working.' }
};
function escHtml(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
ipcMain.handle('staff:sendCard', async (e, { staffId, email, name, code, pngDataUrl, lang }) => {
  if (!canManageStaff()) return { error: 'no_access' };
  const to = String(email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { error: 'email' };
  const settings = db.getSettings();
  if (!mailReady(settings)) return { error: 'mail_not_ready' };
  if (staffId) db.setStaffEmail(staffId, to);
  const L = STAFF_MAIL[lang] || STAFF_MAIL.ru;
  const brand = mailFromName(settings);
  const pretty = normLoginCode(code).replace(/(\d{4})(?=\d)/g, '$1 ');
  const png = Buffer.from(String(pngDataUrl || '').split(',')[1] || '', 'base64');
  if (!png.length) return { error: 'image' };
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#1f1f1f;max-width:560px">
    <p style="font-size:16px;margin:0 0 10px">${escHtml(L.hi(name || ''))}</p>
    <p style="font-size:14px;line-height:1.5;margin:0 0 14px">${escHtml(L.body)}</p>
    <img src="cid:staffcard" alt="" style="width:100%;max-width:520px;border-radius:14px;display:block;margin:0 0 14px">
    <p style="font-size:13px;margin:0 0 4px;color:#6b6b6b">${escHtml(L.code)}</p>
    <p style="font-size:22px;font-weight:bold;letter-spacing:2px;margin:0 0 14px;font-family:Consolas,monospace">${escHtml(pretty)}</p>
    <p style="font-size:12px;color:#6b6b6b;margin:0">${escHtml(L.keep)}</p></div>`;
  try {
    await createTransporter(settings).sendMail({
      from: mailFrom(settings), to, subject: L.subject(brand), html,
      attachments: [{ filename: 'loya-staff-card.png', content: png, cid: 'staffcard', contentType: 'image/png' }]
    });
    return { ok: true };
  } catch (err) { return { error: err.message || 'send_failed' }; }
});

// ---------- точки ----------
ipcMain.handle('locations:list', () => db.listLocations());
ipcMain.handle('locations:add', (e, name) => {
  // 2.17: точки есть в обоих тарифах — Starter до 3, Pro до 10 (или сколько дали в админке). Бесплатно — одна.
  const lim = pointsLimit();
  if (db.listLocations().length >= lim) return licenseState().mode === 'full' ? { error: 'points_limit', limit: lim } : { error: 'pro_required', feature: 'locations' };
  if (String(name || '').trim()) db.addLocation(String(name).trim());
  return { ok: true };
});
ipcMain.handle('locations:rename', (e, id, name) => { if (String(name || '').trim()) db.renameLocation(id, String(name).trim()); return { ok: true }; });
ipcMain.handle('locations:remove', (e, id) => { db.removeLocation(id); return { ok: true }; });
ipcMain.handle('team:report', () => db.getTeamReport());

ipcMain.handle('pin:clear', () => {
  db.saveSettings({ pin_salt: '', pin_hash: '' });
  return { ok: true };
});


ipcMain.handle('license:recheck', async () => SUBSCRIPTION_API_URL ? checkSubscriptionLicense() : { ok: false, reason: 'no_api_configured' });

ipcMain.handle('license:saveKey', async (e, licenseKey) => {
  const key = String(licenseKey || '').trim().slice(0, 60);
  // Новый ключ должен сам пройти проверку: прежние отметки «подтверждён/заблокирован» сбрасываем.
  db.saveSettings({ license_key: key, license_verified_at: '', license_blocked: '0', license_message: '', subscription_status: '', license_token: '' }); sessionLicense = null;
  setTimeout(retryWalletDesignUpload, 5000);
  applyLicenseMode();
  if (!key) return { ok: true, blocked: false, message: '' };
  return await checkSubscriptionLicense();
});
ipcMain.handle('license:mode', () => licenseModeInfo());
ipcMain.handle('license:subscribe', (e, plan) => {
  if (!CAN_LINK_TO_PURCHASE) return { ok: false, error: 'not_allowed' };
  shell.openExternal(subscribeUrl(plan));
  return { ok: true };
});
// 14 дней пробного периода без карты: сервер выдаёт пробный ключ (один раз на email и на компьютер).
// 2.26: пробный ключ — ещё раз прислать ссылку «Подтвердить почту» (письма клиентам включаются после подтверждения).
ipcMain.handle('license:verifyResend', async (e, lang) => {
  const s = db.getSettings();
  if (!s.license_key || !SUBSCRIPTION_API_URL) return { error: 'need_license' };
  try { return await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/verify-resend`, { licenseKey: s.license_key, lang }); }
  catch (err) { return { error: 'network' }; }
});
ipcMain.handle('license:startTrial', async (e, email) => {
  const s = db.getSettings();
  if (s.license_key && s.license_verified_at && s.license_blocked !== '1') return { error: 'has_key' };
  let r;
  try { r = await httpsPostJson(`${SUBSCRIPTION_API_URL}/api/trial-start`, { email: String(email || '').trim().slice(0, 160), machineHash: machineId(), lang: s.app_language || 'uk' }); }
  catch (err) { return { error: 'network' }; }
  if (!r || !r.ok || !r.key) return { error: (r && r.error) || 'failed' };
  db.saveSettings({ license_key: r.key, license_verified_at: '', license_blocked: '0', license_message: '', subscription_status: '', license_token: '' }); sessionLicense = null;
  setTimeout(retryWalletDesignUpload, 5000);
  await checkSubscriptionLicense();
  applyLicenseMode();
  return { ok: true, trialUntil: r.trialUntil };
});

ipcMain.handle('license:getInfo', () => {
  const settings = db.getSettings();
  return {
    licenseKey: settings.license_key || '',
    subscriptionStatus: settings.subscription_status || '',
    blocked: settings.license_blocked === '1',
    message: settings.license_message || '',
    legacy: false,
    apiConfigured: !!SUBSCRIPTION_API_URL
  };
});

// ---------- шаблоны «открытки с котиком» (настраиваются из настроек) ----------
ipcMain.handle('cardTemplates:list', (e, lang) => {
  // Только картинки текущего вида бизнеса — чтобы карточки разных ниш не пересекались.
  const rows = db.getCardTemplates(lang, db.getSettings().business_niche || 'coffee');
  const dir = path.join(getDataDir(), 'cat-cards');
  return rows.map(row => {
    let dataUrl = null;
    try {
      const buf = fs.readFileSync(path.join(dir, row.file_name));
      dataUrl = 'data:image/png;base64,' + buf.toString('base64');
    } catch (err) {
      dataUrl = null; // файл потерян — покажем карточку без превью, но не уроним список
    }
    return { id: row.id, lang: row.lang, qrXPct: row.qr_x_pct, qrYPct: row.qr_y_pct, qrSizePct: row.qr_size_pct, qrCornerRadiusPct: row.qr_corner_radius_pct || 0, dataUrl };
  });
});

// Картинка-заглушка ниши (нарисована нами, лежит в приложении). Отдаём как data URL —
// так canvas в окне может свободно дорисовать название и QR и выгрузить результат.
const placeholderCache = {};
ipcMain.handle('cardTemplates:placeholder', (e, nicheId) => {
  const id = /^[a-z]+$/.test(nicheId || '') ? nicheId : 'other';
  if (placeholderCache[id]) return placeholderCache[id];
  for (const name of [id, 'other']) {
    try {
      const buf = fs.readFileSync(path.join(__dirname, 'src', 'niche-cards', `${name}.png`));
      placeholderCache[id] = 'data:image/png;base64,' + buf.toString('base64');
      return placeholderCache[id];
    } catch (err) { /* пробуем запасной вариант */ }
  }
  return null;
});

ipcMain.handle('cardTemplates:listByNiche', (e, nicheId) => {
  const rows = db.getCardTemplatesForNiche(nicheId);
  const dir = path.join(getDataDir(), 'cat-cards');
  return rows.map(row => {
    let dataUrl = null;
    try {
      const buf = fs.readFileSync(path.join(dir, row.file_name));
      dataUrl = 'data:image/png;base64,' + buf.toString('base64');
    } catch (err) {
      dataUrl = null;
    }
    return { id: row.id, niche: row.niche, hasTextOverlay: !!row.has_text_overlay, qrXPct: row.qr_x_pct, qrYPct: row.qr_y_pct, qrSizePct: row.qr_size_pct, qrCornerRadiusPct: row.qr_corner_radius_pct || 0, dataUrl };
  });
});

ipcMain.handle('cardTemplates:add', (e, { lang, niche, hasTextOverlay, imageDataUrl, qrXPct, qrYPct, qrSizePct, qrCornerRadiusPct }) => {
  try {
    const dir = path.join(getDataDir(), 'cat-cards');
    fs.mkdirSync(dir, { recursive: true });
    const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const fileName = `${niche ? 'niche-' + niche : lang}-custom-${Date.now()}.png`;
    fs.writeFileSync(path.join(dir, fileName), Buffer.from(base64, 'base64'));
    db.addCardTemplate({ lang: niche ? null : lang, niche: niche || null, scopeNiche: db.getSettings().business_niche || 'coffee', hasTextOverlay, fileName, qrXPct, qrYPct, qrSizePct, qrCornerRadiusPct });
    return { ok: true };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('cardTemplates:delete', (e, id) => db.deleteCardTemplate(id));
ipcMain.handle('cards:setTemplateId', (e, cardId, templateId) => {
  db.setCardTemplateId(cardId, templateId);
  return { ok: true };
});

ipcMain.handle('backup:createNow', () => {
  // «Ручная» копия каждый раз новая (со временем в имени), чтобы не путать с ежедневной.
  try {
    const dir = getBackupDir(); fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    fs.writeFileSync(path.join(dir, `loyalty-${stamp}-manual.db`), db.exportBuffer());
    db.saveSettings({ backup_last_ok: new Date().toISOString(), backup_last_error: '' });
    return { ok: true, folder: dir };
  } catch (err) { db.saveSettings({ backup_last_error: String(err.message || err).slice(0, 200) }); return { error: 'backup_failed' }; }
});

// ---------- восстановление из резервной копии ----------
function backupFiles() {
  const dir = getBackupDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /^loyalty-.*\.db$/.test(f)).map(f => {
    const st = fs.statSync(path.join(dir, f));
    const reason = (f.match(/^loyalty-\d{4}-\d{2}-\d{2}(?:-\d{2}-\d{2}-\d{2})?-?(.*)\.db$/) || [])[1] || 'daily';
    return { name: f, size: st.size, time: st.mtime.toISOString(), reason };
  }).sort((a, b) => b.time.localeCompare(a.time)).slice(0, 60);
}
ipcMain.handle('backup:status', () => {
  const s = db.getSettings(); const files = backupFiles();
  return { lastOk: s.backup_last_ok || (files[0] ? files[0].time : ''), lastError: s.backup_last_error || '', count: files.length, folder: getBackupDir() };
});
ipcMain.handle('backup:list', () => backupFiles());
// Источник копии: файл из папки копий (по имени, без путей) или выбранный пользователем файл.
async function readBackupSource(src) {
  if (src && src.name) {
    if (!/^loyalty-[\w.-]+\.db$/.test(src.name)) return { error: 'bad_name' };
    return { buf: fs.readFileSync(path.join(getBackupDir(), src.name)), label: src.name };
  }
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: [{ name: 'Loya', extensions: ['db', 'sqlite'] }] });
  if (canceled || !filePaths || !filePaths[0]) return { canceled: true };
  return { buf: fs.readFileSync(filePaths[0]), label: path.basename(filePaths[0]), filePath: filePaths[0] };
}
let pendingRestore = null;
ipcMain.handle('backup:inspect', async (e, src) => {
  const r = await readBackupSource(src);
  if (r.canceled || r.error) return r;
  const info = db.inspectBackup(r.buf);
  if (info.ok) pendingRestore = { buf: r.buf, label: r.label, at: Date.now() };
  return { ...info, label: r.label };
});
ipcMain.handle('backup:restore', async () => {
  if (!pendingRestore || Date.now() - pendingRestore.at > 10 * 60 * 1000) return { error: 'not_inspected' };
  // Сначала — копия текущего состояния, чтобы восстановление можно было отменить.
  try {
    const dir = getBackupDir(); fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    fs.writeFileSync(path.join(dir, `loyalty-${stamp}-before-restore.db`), db.exportBuffer());
  } catch (err) { return { error: 'backup_failed' }; }
  const r = await db.replaceWith(pendingRestore.buf);
  pendingRestore = null;
  if (!r.ok) return r;
  applyLicenseMode();
  if (mainWindow && !mainWindow.isDestroyed()) setTimeout(() => mainWindow.webContents.reload(), 300);
  return r;
});
ipcMain.handle('backup:exportDb', async () => {
  const stamp = new Date().toISOString().slice(0, 10);
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, { defaultPath: `loya-backup-${stamp}.db`, filters: [{ name: 'Loya', extensions: ['db'] }] });
  if (canceled || !filePath) return { canceled: true };
  try { fs.writeFileSync(filePath, db.exportBuffer()); return { ok: true, filePath }; } catch (err) { return { error: 'write_failed' }; }
});
ipcMain.handle('data:exportOperations', async (e, H, lang) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, { defaultPath: `loya-operations-${new Date().toISOString().slice(0, 10)}.csv`, filters: [{ name: 'CSV', extensions: ['csv'] }] });
  if (canceled || !filePath) return { canceled: true };
  try { fs.writeFileSync(filePath, db.exportOperationsCsv(['ru', 'uk', 'sk', 'en'].includes(lang) ? lang : 'ru', H || {}), 'utf8'); return { ok: true, filePath }; } catch (err) { return { error: 'write_failed' }; }
});

// ---------- импорт клиентов: файл → предпросмотр и сопоставление колонок → проверка и импорт ----------
const importSessions = new Map();
ipcMain.handle('import:open', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: [{ name: 'Excel / CSV', extensions: ['xlsx', 'csv', 'txt'] }] });
  if (canceled || !filePaths || !filePaths[0]) return { canceled: true };
  let parsed;
  // 2.30: таблица Excel (.xlsx) открывается напрямую; старый .xls — просим сохранить как .xlsx или CSV
  if (/\.xls$/i.test(filePaths[0])) return { error: 'xls_old' };
  try {
    const buf = fs.readFileSync(filePaths[0]);
    parsed = /\.xlsx$/i.test(filePaths[0]) || (buf.length > 4 && buf.readUInt32LE(0) === 0x04034b50) ? await require('./xlsx-lite').readXlsx(buf) : Database.parseCsvText(Database.decodeCsv(buf));
  } catch (err) { return { error: 'read_failed' }; }
  if (!parsed.headers.length || !parsed.rows.length) return { error: 'empty' };
  const token = crypto.randomBytes(8).toString('hex');
  importSessions.clear(); importSessions.set(token, parsed.rows);
  return { ok: true, token, file: path.basename(filePaths[0]), headers: parsed.headers, sample: parsed.rows.slice(0, 12), total: parsed.rows.length, mapping: Database.suggestMapping(parsed.headers) };
});
ipcMain.handle('import:commit', (e, token, mapping, opts) => {
  const rows = importSessions.get(token);
  if (!rows) return { error: 'expired' };
  if (!mapping || mapping.name === undefined || mapping.name === null || mapping.name === '') return { error: 'no_name_column' };
  const r = db.importClientsMapped(rows, mapping, opts || {});
  importSessions.delete(token);
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('remote-data-changed');
  return r;
});

// ===================== Pro: общая база между компьютерами =====================
// Всё сохраняется сразу на этом компьютере; раз в 2 минуты изменения уходят на сервер пачкой, а чужие —
// забираются. Без интернета программа работает как обычно, изменения ждут связи (их видно в настройках).
const SYNC_EVERY_MS = 2 * 60 * 1000;
let syncBusy = false;
const syncCreds = () => { const s = db.getSettings(); return { licenseKey: s.license_key, deviceId: s.sync_device_id, deviceKey: s.sync_device_key }; };
const syncPost = (op, body) => httpsPostJson(`${SUBSCRIPTION_API_URL}/api/sync/${op}`, body);
function syncStatus() {
  const st = db.syncState(); const s = db.getSettings();
  return { ...st, connected: !!s.sync_device_id, deviceName: s.sync_device_name || '', lastOk: s.sync_last_ok || '', lastError: s.sync_last_error || '', busy: syncBusy, tier: licenseState().tier };
}
function sendSyncStatus() { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('sync-status', syncStatus()); }
async function runSync() {
  const st = db.syncState(); const c = syncCreds();
  if (syncBusy) return { busy: true };
  if (!st.enabled || !c.deviceId || !SUBSCRIPTION_API_URL) return { off: true };
  if (licenseState().mode !== 'full') { db.saveSettings({ sync_last_error: 'license_required' }); sendSyncStatus(); return { error: 'license_required' }; }
  syncBusy = true; sendSyncStatus();
  let pushed = 0, pulled = 0;
  try {
    for (let i = 0; i < 30; i++) {
      const ops = db.syncCollect(100); if (!ops.length) break;
      const r = await syncPost('push', { ...c, ops });
      if (!r || !r.ok) throw new Error((r && r.error) || 'push_failed');
      db.syncAck(r.results); pushed += ops.length;
    }
    for (let i = 0; i < 40; i++) {
      const cur = db.syncState().cursor;
      const r = await syncPost('pull', { ...c, after: cur, limit: 500, inflight: db.syncInflight() });
      if (!r || !r.ok) throw new Error((r && r.error) || 'pull_failed');
      const a = db.syncApplyRemote(r.items, r.applied); db.syncSetCursor(a.cursor); pulled += a.applied;
      if (!r.more || a.cursor <= cur) break;
    }
    // Чужие изменения могли слиться с нашими — отправляем результат сразу.
    for (let i = 0; i < 5; i++) {
      const ops = db.syncCollect(100); if (!ops.length) break;
      const r = await syncPost('push', { ...c, ops }); if (!r || !r.ok) break;
      db.syncAck(r.results);
    }
    db.saveSettings({ sync_last_ok: new Date().toISOString(), sync_last_error: '' });
    if (pulled && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('remote-data-changed');
    if (pulled) tgRetryPending();
    return { ok: true, pushed, pulled };
  } catch (err) {
    const code = String((err && err.message) || err).slice(0, 60);
    db.saveSettings({ sync_last_error: /network|ECONN|ENOTFOUND|timeout|socket/i.test(code) ? 'network' : code });
    return { error: code };
  } finally { syncBusy = false; sendSyncStatus(); }
}
setTimeout(() => runSync().catch(() => {}), 20000);
setInterval(() => runSync().catch(() => {}), SYNC_EVERY_MS);
ipcMain.handle('sync:status', () => syncStatus());
ipcMain.handle('sync:now', () => runSync());
async function syncConnectImpl(name) {
  if (licenseState().mode !== 'full') return { error: 'license_required' };
  const s = db.getSettings();
  const deviceKey = crypto.randomBytes(32).toString('hex');
  let r;
  try { r = await syncPost('register', { licenseKey: s.license_key, deviceKey, name: String(name || '').trim().slice(0, 60) || deviceName() }); }
  catch (err) { return { error: 'network' }; }
  if (!r || !r.ok) return { error: (r && r.error) || 'failed', limit: r && r.limit };
  db.saveSettings({ sync_device_id: r.deviceId, sync_device_key: deviceKey, sync_device_name: String(name || '').trim().slice(0, 60) || deviceName(), sync_last_error: '' });
  if (!db.currentPoint()) db.assignPoint(s.brand_name || 'Main');
  const localHasData = db.getClients().length > 0;
  const done = async (mode) => { await runSync(); shareBotIfOwner(); pushPointSummary().catch(() => {}); return { ok: true, mode }; };
  if (!r.orgHasData) { db.syncEnable(true); db.syncMarkAll(); return done('uploaded'); }
  if (!localHasData) { db.syncEnable(true); return done('downloaded'); }
  return { ok: true, needChoice: true };   // у организации уже есть база, а здесь — своя: решает владелец
}
ipcMain.handle('sync:connect', (e, name) => syncConnectImpl(name));
// Объединить: клиенты этого устройства добавляются в общую базу (ничего не удаляется).
ipcMain.handle('sync:mergeLocal', async () => {
  if (!db.getSettings().sync_device_id) return { error: 'not_connected' };
  try {
    const dir = getBackupDir(); fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    fs.writeFileSync(path.join(dir, `loyalty-${stamp}-before-merge.db`), db.exportBuffer());
  } catch (err) { /* копия не обязательна для объединения: ничего не удаляется */ }
  // Сначала забираем общую базу и «узнаём» своих клиентов по телефону/email (без дублей), потом отправляем свои записи.
  db.syncEnable(true);
  db._adoptByContact = true; db._adopted = 0;
  let r;
  try { r = await runSync(); } finally { db._adoptByContact = false; }
  const adopted = db._adopted || 0;
  if (!r.ok) return r;
  db.syncMarkAll();
  r = await runSync();
  shareBotIfOwner(); pushPointSummary().catch(() => {});
  return r.ok ? { ok: true, mode: 'merged', adopted } : r;
});
// Заменить данные этого компьютера общей базой организации (перед этим — резервная копия).
ipcMain.handle('sync:replaceLocal', async () => {
  if (!db.getSettings().sync_device_id) return { error: 'not_connected' };
  try {
    const dir = getBackupDir(); fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    fs.writeFileSync(path.join(dir, `loyalty-${stamp}-before-sync.db`), db.exportBuffer());
  } catch (err) { return { error: 'backup_failed' }; }
  db.syncWipeLocal(); db.syncEnable(true);
  const r = await runSync();
  pushPointSummary().catch(() => {});
  return r.ok ? { ok: true, mode: 'downloaded' } : r;
});
ipcMain.handle('sync:disconnect', async () => {
  const c = syncCreds();
  if (c.deviceId) { try { await syncPost('revoke', { ...c, target: c.deviceId }); } catch (e) { /* без сети — просто отключаем здесь */ } }
  db.syncEnable(false);
  db.saveSettings({ sync_device_id: '', sync_device_key: '', sync_last_error: '' });
  sendSyncStatus();
  return { ok: true };
});
ipcMain.handle('sync:devices', async () => { try { return await syncPost('devices', syncCreds()); } catch (e) { return { error: 'network' }; } });
ipcMain.handle('sync:revoke', async (e, target) => { try { return await syncPost('revoke', { ...syncCreds(), target }); } catch (err) { return { error: 'network' }; } });

// ===================== 2.17: сеть точек =====================
// Один ключ подписки — одна организация. У каждого устройства есть своя точка (кафе, салон, магазин).
// • Статистика на Главной и в Аналитике — по выбранной точке (по умолчанию — своей, если база общая).
// • Каждое устройство раз в 10 минут присылает на сервер короткую сводку своей точки (только числа) —
//   так видна статистика других точек, даже если базы клиентов раздельные, и в «Доступе из дома».
// • Общий Telegram-бот: можно «подтянуть» бота другой точки (клиенты к нему подключаются через одно устройство).
function deviceName() {
  const s = db.getSettings();
  if (s.device_name) return s.device_name;
  try { return String(require('os').hostname() || '').slice(0, 60) || 'Loya'; } catch (e) { return 'Loya'; }
}
const orgPost = (op, body) => {
  const s = db.getSettings();
  if (!SUBSCRIPTION_API_URL || !s.license_key) return Promise.resolve({ error: 'no_key' });
  return httpsPostJson(`${SUBSCRIPTION_API_URL}/api/sync/${op}`, { licenseKey: s.license_key, device: machineId(), ...(body || {}) });
};
function pointsLimit() {
  const st = licenseState();
  if (st.mode !== 'full') return 1;
  const n = Number(db.getSettings().license_devices_limit) || 0;
  return n > 0 ? n : (st.tier === 'pro' ? 10 : 3);
}
// Какие точки сейчас показывать в статистике (null — все данные этой базы).
function statsScopeIds() {
  const s = db.getSettings();
  const sel = String(s.stats_view || '');
  const cur = Number(s.current_location_id) || 0;
  if (sel === 'all') return null;
  const locs = db.listLocations();
  if (/^\d+$/.test(sel) && locs.some((l) => l.id === Number(sel))) return [Number(sel)];
  if (sel === 'point') return cur ? [cur] : null;
  // По умолчанию: база общая → своя точка (если не включена «общая статистика»); своя база → всё, что в ней.
  if (db.syncState().enabled && cur && s.stats_all_default !== '1') return [cur];
  return null;
}
function S(fn) { return db.scoped(statsScopeIds(), fn); }
function pointsInfo() {
  const s = db.getSettings(); const st = licenseState(); const sync = db.syncState();
  const cur = db.currentPoint();
  const ids = statsScopeIds();
  return {
    me: cur, deviceName: deviceName(), locations: db.listLocations(), shared: !!sync.enabled, connected: !!s.sync_device_id,
    view: String(s.stats_view || ''), scope: ids, allDefault: s.stats_all_default === '1', limit: pointsLimit(),
    others: Number(s.license_org_others) || 0, licensed: st.mode === 'full', tier: st.tier, hasKey: !!s.license_key,
    joinAsked: s.org_join_asked === keyFingerprint(s.license_key || ''),
    bot: { has: !!s.telegram_bot_token, username: s.telegram_bot_username || '', sharedFrom: s.telegram_shared_from || '', poll: s.telegram_poll !== '0' }
  };
}
let lastPointPush = 0;
async function pushPointSummary(force) {
  const s = db.getSettings();
  if (!SUBSCRIPTION_API_URL || !s.license_key || licenseState().mode !== 'full') return { skipped: true };
  const cur = db.currentPoint(); if (!cur) return { skipped: true };
  if (!force && Date.now() - lastPointPush < 60000) return { skipped: true };
  lastPointPush = Date.now();
  const shared = !!db.syncState().enabled;
  const stats = shared ? db.scoped([cur.id], () => db.pointSummary()) : db.pointSummary();
  try { return await orgPost('point', { point: cur.name, deviceName: deviceName(), shared, stats, ...(shared ? { org: db.pointSummary() } : {}) }); }
  catch (e) { return { error: 'network' }; }
}
setTimeout(() => pushPointSummary(true).catch(() => {}), 40000);
// 2.18: точка сети молчит больше суток — сообщаем владельцу (один раз, пока она снова не выйдет на связь).
async function checkPointsOffline() {
  const s = db.getSettings();
  if (!SUBSCRIPTION_API_URL || !s.license_key || licenseState().mode !== 'full' || !db.currentPoint()) return;
  let r; try { r = await orgPost('points'); } catch (e) { return; }
  if (!r || !r.ok || !Array.isArray(r.points)) return;
  remotePointsCache = { ...r, at: Date.now() };
  const me = (db.currentPoint().name || '').toLowerCase();
  const meta = noticesMeta(); const seen = meta.offline || {};
  const now = Date.now(); const next = {};
  for (const p of r.points) {
    const k = String(p.point || '').toLowerCase(); if (!k || k === me) continue;
    const last = Math.max(...(p.devices || []).map((d) => new Date(d.at).getTime()).filter(Number.isFinite), new Date(p.updated).getTime() || 0);
    if (!last || now - last < 24 * 3600e3) continue;
    next[k] = 1;
    if (!seen[k]) notice('offline', { point: p.point, since: new Date(last).toISOString() });
  }
  meta.offline = next; saveNoticesMeta(meta);
}
setTimeout(() => checkPointsOffline().catch(() => {}), 90000);
setInterval(() => checkPointsOffline().catch(() => {}), 60 * 60 * 1000);
setInterval(() => pushPointSummary(true).catch(() => {}), 10 * 60 * 1000);
// Бот подключён здесь и база общая — сохраняем его в общих настройках (если там ещё нет бота).
async function shareBotIfOwner() {
  const s = db.getSettings();
  if (!s.telegram_bot_token || s.telegram_shared_from || !db.syncState().enabled) return;
  try {
    const g = await orgPost('shared-get', { name: 'telegram' });
    if (g && g.ok && !g.value) await orgPost('shared-put', { name: 'telegram', value: { token: s.telegram_bot_token, username: s.telegram_bot_username || '', owner: (db.currentPoint() || {}).name || '' } });
  } catch (e) { /* позже */ }
}
let remotePointsCache = null;
ipcMain.handle('points:info', () => pointsInfo());
ipcMain.handle('points:setView', (e, sel) => {
  const v = String(sel || '');
  if (!['', 'all', 'point'].includes(v) && !(/^\d+$/.test(v) && db.listLocations().some((l) => l.id === Number(v)))) return { error: 'bad_view' };
  db.saveSettings({ stats_view: v });
  return pointsInfo();
});
ipcMain.handle('points:setAllDefault', (e, on) => { db.saveSettings({ stats_all_default: on ? '1' : '0', stats_view: '' }); return pointsInfo(); });
ipcMain.handle('points:remote', async () => {
  try {
    const r = await orgPost('points');
    if (r && r.ok) { remotePointsCache = { ...r, at: Date.now() }; if (Number(r.limit) > 0) db.saveSettings({ license_devices_limit: String(r.limit) }); return remotePointsCache; }
    return { error: (r && r.error) || 'failed', cached: remotePointsCache };
  } catch (e) { return { error: 'network', cached: remotePointsCache }; }
});
ipcMain.handle('points:setMine', async (e, name) => {
  const nm = String(name || '').trim().slice(0, 60);
  if (!nm) return { error: 'name' };
  const known = db.locationIdByName(nm, false) || (remotePointsCache && (remotePointsCache.points || []).some((p) => p.point.toLowerCase() === nm.toLowerCase()));
  if (!known) {
    const names = new Set(db.listLocations().map((l) => l.name.toLowerCase()));
    ((remotePointsCache && remotePointsCache.points) || []).forEach((p) => names.add(p.point.toLowerCase()));
    if (names.size >= pointsLimit()) return { error: 'points_limit', limit: pointsLimit() };
  }
  db.assignPoint(nm);
  pushPointSummary(true).catch(() => {});
  return pointsInfo();
});
ipcMain.handle('points:setDeviceName', (e, name) => { db.saveSettings({ device_name: String(name || '').trim().slice(0, 60) }); return pointsInfo(); });
ipcMain.handle('points:markAsked', () => { db.saveSettings({ org_join_asked: keyFingerprint(db.getSettings().license_key || '') }); return { ok: true }; });
ipcMain.handle('points:pushNow', () => pushPointSummary(true));
ipcMain.handle('points:botInfo', async () => {
  const s = db.getSettings();
  try {
    const r = await orgPost('shared-get', { name: 'telegram' });
    if (!r || !r.ok) return { error: (r && r.error) || 'failed' };
    const v = r.value;
    return { ok: true, available: !!v, username: v ? v.username : '', owner: v ? v.owner : '', mine: !!r.mine, same: !!(v && v.token === s.telegram_bot_token), haveOwn: !!s.telegram_bot_token };
  } catch (e) { return { error: 'network' }; }
});
// Подключить бота другой точки. Подключения клиентов к боту принимает та точка, где его создали.
ipcMain.handle('points:botPull', async () => {
  try {
    const r = await orgPost('shared-get', { name: 'telegram' });
    const v = r && r.ok && r.value;
    if (!v || !v.token) return { error: 'no_bot' };
    const me = await telegramApiCall(v.token, 'getMe', {}).catch(() => null);
    if (!me || !me.ok) return { error: 'bot_invalid' };
    telegramPollingEnabled = false;
    db.saveSettings({ telegram_bot_token: v.token, telegram_bot_username: me.result.username || v.username || '', telegram_shared_from: v.owner || '—', telegram_poll: '0' });
    return { ok: true, username: me.result.username || v.username || '', owner: v.owner || '' };
  } catch (e) { return { error: 'network' }; }
});
ipcMain.handle('points:botShare', async () => {
  const s = db.getSettings();
  if (!s.telegram_bot_token) return { error: 'no_bot' };
  try { const r = await orgPost('shared-put', { name: 'telegram', value: { token: s.telegram_bot_token, username: s.telegram_bot_username || '', owner: (db.currentPoint() || {}).name || '' } }); return r && r.ok ? { ok: true } : { error: (r && r.error) || 'failed' }; }
  catch (e) { return { error: 'network' }; }
});
// Какое устройство принимает подключения клиентов к общему боту (может быть только одно).
ipcMain.handle('points:botPoll', (e, on) => {
  db.saveSettings({ telegram_poll: on ? '1' : '0' });
  if (on && db.getSettings().telegram_bot_token) startTelegramPolling(); else telegramPollingEnabled = false;
  return pointsInfo();
});

// ---------- согласия на рассылки ----------
ipcMain.handle('consent:stats', () => db.consentStats());
ipcMain.handle('consent:optedOut', () => db.listOptedOut());
ipcMain.handle('consent:setChannel', (e, id, channel, value) => db.setChannelConsent(Number(id), channel === 'telegram' ? 'telegram' : 'email', !!value, 'manual'));
ipcMain.handle('consent:setDnc', (e, id, value) => db.setDoNotContact(Number(id), !!value));

ipcMain.handle('backup:openFolder', () => {
  fs.mkdirSync(getBackupDir(), { recursive: true });
  shell.openPath(getBackupDir());
  return { ok: true };
});

ipcMain.handle('shell:openExternal', (e, url) => openExternalSafe(url));

// Данные для подключения телефона (адрес локального сервера + код сопряжения).
ipcMain.handle('pairing:getInfo', () => localServer.getPairingInfo());
ipcMain.handle('register:getInfo', () => localServer.getRegisterInfo());
ipcMain.handle('scan:getPhoneScanInfo', () => localServer.getScanInfo());

// Простой парсер CSV (RFC4180-подобный: кавычки, экранирование, запятые/переносы внутри полей).
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // снять BOM
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\r') { /* пропускаем, перевод строки обработает \n */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

ipcMain.handle('data:importClientsCsv', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: csvTextForApp().importTitle,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths[0]) return { canceled: true };

  // BOM в начале (его добавляет наш же экспорт и Excel) мешал найти колонку «Имя».
  const text = fs.readFileSync(filePaths[0], 'utf8').replace(/^\uFEFF/, '');
  const rows = parseCsv(text);
  if (rows.length < 2) return { ok: true, imported: 0, skipped: 0 };

  const header = rows[0].map(h => h.trim().toLowerCase());
  const findCol = (names) => {
    for (const n of names) {
      const i = header.indexOf(n.toLowerCase());
      if (i !== -1) return i;
    }
    return -1;
  };
  const nameIdx = findCol(['Имя', 'Name', "Ім'я", 'Ім’я', 'Meno']);
  const notesIdx = findCol(['Заметка', 'Note', 'Нотатка', 'Poznámka']);
  const langIdx = findCol(['Язык', 'Language', 'Мова', 'Jazyk']);
  const emailIdx = findCol(['Email', 'E-mail']);
  const phoneIdx = findCol(['Телефон', 'Phone', 'Telefón']);
  const birthdayIdx = findCol(['Дата рождения', 'Birthday', 'Дата народження', 'Dátum narodenia']);
  if (nameIdx === -1) {
    return { error: csvTextForApp().noNameCol };
  }

  const existingEmails = new Set(db.getClients().map(c => (c.email || '').toLowerCase()).filter(Boolean));
  let imported = 0, skipped = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = (r[nameIdx] || '').trim();
    if (!name) continue;
    const email = emailIdx !== -1 ? (r[emailIdx] || '').trim() : '';
    if (email && existingEmails.has(email.toLowerCase())) { skipped++; continue; }
    const phone = phoneIdx !== -1 ? (r[phoneIdx] || '').trim() : '';
    const birthday = birthdayIdx !== -1 ? (r[birthdayIdx] || '').trim() : '';
    const notes = notesIdx !== -1 ? (r[notesIdx] || '').trim() : '';
    const langRaw = langIdx !== -1 ? (r[langIdx] || '').trim().toLowerCase() : '';
    try { db.addClient({ name, email, phone, birthday, notes, preferredLanguage: ['ru', 'uk', 'sk', 'en'].includes(langRaw) ? langRaw : '' }); }
    catch (err) { if (err && err.code === 'FREE_LIMIT') return { ok: true, imported, skipped, limited: true }; throw err; }
    if (email) existingEmails.add(email.toLowerCase());
    imported++;
  }
  return { ok: true, imported, skipped };
});

// Ручная отметка покупки по карте (без сканирования QR) — та же логика, что и при скане.
ipcMain.handle('cards:markManual', (e, cardId) => db.markCardManually(cardId));

// Напоминание клиенту, что до бесплатной покупки осталось совсем немного.
ipcMain.handle('mail:sendCupsReminder', async (e, cardId, lang, opts = {}) => {
  const L = EMAIL_TEXT[lang] || EMAIL_TEXT.ru;
  const settings = db.getSettings();
  const channels = normChannels(opts.channels || 'email');
  const card = db.getCardById(cardId);
  if (!card || card.type !== 'stamp') return { error: L.cardNotFound };
  const c = db.getClient(card.client_id);
  const r = clientReach(c, false);
  if (!channels.some(ch => r[ch])) return { error: channels.includes('email') && !mailReady(settings) ? L.missingSettings : (channels.includes('email') && !card.client_email ? L.noEmail : 'telegram_not_linked') };
  const remaining = card.stamp_target - card.stamp_count;
  const out = await deliverToClient(c, { channels, subject: L.subjectCupsReminder(remaining), html: L.bodyCupsReminder(escHtml(card.client_name), remaining, escHtml(card.title || '')), image: kindImage('reminder', lang, opts.image), lang, logSubject: 'reminder', marketing: false, unsubscribe: false });
  const t = tallyInit(); tallyAdd(t, out);
  if (!t.sent && !t.telegramSent) return { error: 'send_failed', ...t };
  return t;
});

// ---------- именины (Meniny) ----------

// Отправляет письмо-поздравление с именинами выбранным клиентам (с защитой от повторной отправки в тот же день).
async function sendNamedayBatch(clientIds, giftType, defaultLang, opts = {}) {
  const settings = db.getSettings();
  const channels = normChannels(opts.channels || 'email');
  if (channels.length === 1 && channels[0] === 'email' && !mailReady(settings)) {
    return { error: (EMAIL_TEXT[defaultLang] || EMAIL_TEXT.ru).missingSettings };
  }
  const today = new Date().toISOString().slice(0, 10);
  const clients = db.getClientsByIds(clientIds).filter(c => c.nameday_last_sent !== today);
  const t = tallyInit();
  if (clients.length === 0) { t.skipped = clientIds.length; return t; }
  const transporter = mailReady(settings) ? createTransporter(settings) : null;
  for (const c of clients) {
    const lang = c.preferred_language || defaultLang || 'sk';
    const L = EMAIL_TEXT[lang] || EMAIL_TEXT.ru;
    const giftText = giftType && NAMEDAY_GIFT_LABELS[giftType] ? NAMEDAY_GIFT_LABELS[giftType][lang] : '';
    const ctx = getBrandContext(lang);
    const out = await deliverToClient(c, { channels, transporter, subject: L.subjectNameday(c.name), html: L.bodyNameday(escHtml(c.name), giftText, ctx.brandName, ctx.emoji, ctx.phrase), image: kindImage('nameday', lang, opts.image), lang, logSubject: 'nameday' });
    tallyAdd(t, out);
    if (out.email === 'sent' || out.telegram === 'sent') {
      if (giftText) db.addClientGift(c.id, `🎉 Meniny: ${giftText}`);
      db.markNamedaySent(c.id, today);
    }
  }
  t.skipped += clientIds.length - clients.length;
  return t;
}

ipcMain.handle('mail:sendNamedayAll', async (e, { clientIds, giftType, defaultLang, channels, image }) => {
  { const g = proOnly(); if (g) return g; }
  return sendNamedayBatch(clientIds, giftType, defaultLang, { channels, image });
});

// ---------- автоматические рассылки (сценарии) ----------
// Раз в день в заданное время программа сама пишет нужным клиентам (только тем, кто дал
// согласие на рассылки и указал email). Каждый сценарий не повторяется одному клиенту
// раньше своего «перерыва» — это видно по журналу automation_log.
const AUTO_TEXT = {
  ru: {
    winback: { s: (b) => `Давно не виделись! Мы скучаем 💛 — ${b}`, h: (n, b, e, p) => `<p>Здравствуйте, ${n}!</p><p>Мы заметили, что вы давно не заглядывали в ${e} <b>${b}</b>, и соскучились. Приходите на ${p} — ваша карта лояльности по-прежнему работает, а мы будем рады вас видеть.</p>` },
    near: { s: (b) => `Вам остался всего шаг до подарка 🎁 — ${b}`, h: (n, b, e, p) => `<p>Здравствуйте, ${n}!</p><p>По вашей карте в ${e} <b>${b}</b> вы почти у цели — ещё совсем немного, и подарок ваш. Заходите на ${p}!</p>` },
    welcome: { s: (b) => `Спасибо, что заглянули в ${b}! 👋`, h: (n, b, e, p) => `<p>Здравствуйте, ${n}!</p><p>Спасибо, что выбрали ${e} <b>${b}</b>. Ваша карта уже работает — каждый визит приближает вас к подарку. Будем рады видеть вас снова на ${p}!</p>` },
    birthday: { s: (b) => `С днём рождения! 🎂 — ${b}`, h: (n, b, e, p) => `<p>Дорогой(ая) ${n}!</p><p>Команда ${e} <b>${b}</b> поздравляет вас с днём рождения! Желаем радости и приятных моментов. Приходите на ${p} — будем рады отметить этот день вместе с вами 🎉</p>` }
  },
  uk: {
    winback: { s: (b) => `Давно не бачились! Ми сумуємо 💛 — ${b}`, h: (n, b, e, p) => `<p>Вітаємо, ${n}!</p><p>Ми помітили, що ви давно не заходили до ${e} <b>${b}</b>, і скучили. Приходьте на ${p} — ваша картка лояльності й надалі працює, а ми будемо раді вас бачити.</p>` },
    near: { s: (b) => `Вам лишився лише крок до подарунка 🎁 — ${b}`, h: (n, b, e, p) => `<p>Вітаємо, ${n}!</p><p>За вашою карткою в ${e} <b>${b}</b> ви майже біля мети — ще трохи, і подарунок ваш. Заходьте на ${p}!</p>` },
    welcome: { s: (b) => `Дякуємо, що завітали до ${b}! 👋`, h: (n, b, e, p) => `<p>Вітаємо, ${n}!</p><p>Дякуємо, що обрали ${e} <b>${b}</b>. Ваша картка вже працює — кожен візит наближає вас до подарунка. Будемо раді бачити вас знову на ${p}!</p>` },
    birthday: { s: (b) => `З днем народження! 🎂 — ${b}`, h: (n, b, e, p) => `<p>Дорогий(а) ${n}!</p><p>Команда ${e} <b>${b}</b> вітає вас із днем народження! Бажаємо радості й приємних моментів. Приходьте на ${p} — будемо раді відзначити цей день разом із вами 🎉</p>` }
  },
  sk: {
    winback: { s: (b) => `Dlho sme sa nevideli! Chýbate nám 💛 — ${b}`, h: (n, b, e, p) => `<p>Dobrý deň, ${n}!</p><p>Všimli sme si, že ste v ${e} <b>${b}</b> dlho neboli, a chýbate nám. Príďte na ${p} — vaša vernostná karta stále platí a radi vás uvidíme.</p>` },
    near: { s: (b) => `K darčeku vám chýba už len krok 🎁 — ${b}`, h: (n, b, e, p) => `<p>Dobrý deň, ${n}!</p><p>Na vašej karte v ${e} <b>${b}</b> ste takmer v cieli — ešte kúsok a darček je váš. Príďte na ${p}!</p>` },
    welcome: { s: (b) => `Ďakujeme, že ste sa zastavili v ${b}! 👋`, h: (n, b, e, p) => `<p>Dobrý deň, ${n}!</p><p>Ďakujeme, že ste si vybrali ${e} <b>${b}</b>. Vaša karta už funguje — každá návšteva vás približuje k darčeku. Radi vás opäť privítame na ${p}!</p>` },
    birthday: { s: (b) => `Všetko najlepšie k narodeninám! 🎂 — ${b}`, h: (n, b, e, p) => `<p>Milý/á ${n}!</p><p>Tím ${e} <b>${b}</b> vám praje všetko najlepšie k narodeninám! Veľa radosti a príjemných chvíľ. Príďte na ${p} — radi s vami tento deň oslávime 🎉</p>` }
  },
  en: {
    winback: { s: (b) => `Long time no see! We miss you 💛 — ${b}`, h: (n, b, e, p) => `<p>Hello, ${n}!</p><p>We noticed you haven’t visited ${e} <b>${b}</b> in a while, and we miss you. Come in for ${p} — your loyalty card is still active and we’d love to see you.</p>` },
    near: { s: (b) => `Just one step from your reward 🎁 — ${b}`, h: (n, b, e, p) => `<p>Hello, ${n}!</p><p>On your ${e} <b>${b}</b> card you’re almost there — just a little more and the reward is yours. Come in for ${p}!</p>` },
    welcome: { s: (b) => `Thanks for stopping by ${b}! 👋`, h: (n, b, e, p) => `<p>Hello, ${n}!</p><p>Thank you for choosing ${e} <b>${b}</b>. Your card is already active — every visit brings you closer to a reward. We’d love to see you again for ${p}!</p>` },
    birthday: { s: (b) => `Happy birthday! 🎂 — ${b}`, h: (n, b, e, p) => `<p>Dear ${n}!</p><p>The ${e} <b>${b}</b> team wishes you a very happy birthday! Lots of joy and great moments. Come in for ${p} — we’d love to celebrate with you 🎉</p>` }
  }
};
// Сценарии: кому подходит и через сколько дней можно написать тому же клиенту снова.
const AUTO_RULES = {
  winback: { cooldown: 60 },
  near: { cooldown: 14 },
  welcome: { cooldown: 100000 },   // один раз навсегда
  birthday: { cooldown: 300 },     // раз в год
  expiry: { cooldown: 25 }         // 2.19: «бонусы скоро сгорят» — не чаще раза в 25 дней
};
// Сценарий включён? «Сгорание бонусов» включается вместе с самой функцией (Настройки → Уровни и бонусы).
function autoOn(rule, s) {
  if (rule === 'expiry') return db.expiryMonths(s) > 0 && s.auto_expiry_enabled !== '0';
  return s[`auto_${rule}_enabled`] === '1';
}
// Текст напоминания о сгорании: сколько и когда сгорит.
const EXPIRY_TEXT = {
  ru: { s: (b) => `Ваши бонусы скоро сгорят ⏳ — ${b}`, h: (n, b, e, p, what, date) => `<p>Здравствуйте, ${n}!</p><p>На вашей карте в ${e} <b>${b}</b> есть ${what}. Они сгорят <b>${date}</b>, если до этого не будет покупки. Заходите на ${p} — бонусы останутся с вами!</p>`, bonus: (x) => `${x} бонус(ов)`, stamps: (x) => `${x} штамп(ов)` },
  uk: { s: (b) => `Ваші бонуси скоро згорять ⏳ — ${b}`, h: (n, b, e, p, what, date) => `<p>Вітаємо, ${n}!</p><p>На вашій картці в ${e} <b>${b}</b> є ${what}. Вони згорять <b>${date}</b>, якщо до того не буде покупки. Заходьте на ${p} — бонуси залишаться з вами!</p>`, bonus: (x) => `${x} бонус(ів)`, stamps: (x) => `${x} штамп(ів)` },
  sk: { s: (b) => `Vaše body čoskoro prepadnú ⏳ — ${b}`, h: (n, b, e, p, what, date) => `<p>Dobrý deň, ${n}!</p><p>Na vašej karte v ${e} <b>${b}</b> máte ${what}. Prepadnú <b>${date}</b>, ak dovtedy nenakúpite. Príďte na ${p} — body vám zostanú!</p>`, bonus: (x) => `${x} bod(ov)`, stamps: (x) => `${x} pečiatk(y)` },
  en: { s: (b) => `Your rewards expire soon ⏳ — ${b}`, h: (n, b, e, p, what, date) => `<p>Hello, ${n}!</p><p>Your ${e} <b>${b}</b> card has ${what}. They expire on <b>${date}</b> unless you make a purchase before then. Come in for ${p} — and keep them!</p>`, bonus: (x) => `${x} bonus point(s)`, stamps: (x) => `${x} stamp(s)` }
};

function automationCandidates(rule, settings) {
  const dayMs = 86400000;
  const now = Date.now();
  const parse = (str) => str ? new Date(String(str).replace(' ', 'T') + (String(str).length <= 10 ? 'T12:00:00' : 'Z')).getTime() : null;
  const flags = db.getClientsWithFlags();
  if (rule === 'expiry') {
    const soon = new Map(db.expiringSoon(7).map(x => [x.clientId, x]));
    return flags.filter(c => soon.has(c.id) && (Database.canMarket(c, 'email') || Database.canMarket(c, 'telegram'))).map(c => ({ ...c, expiry: soon.get(c.id) }));
  }
  return flags.filter(c => {
    if (!Database.canMarket(c, 'email') && !Database.canMarket(c, 'telegram')) return false;
    if (rule === 'winback') {
      const days = Number(settings.auto_winback_days) || 30;
      const last = parse(c.lastVisitAt);
      return last && (now - last) / dayMs >= days && (now - last) / dayMs <= 365;
    }
    if (rule === 'near') return c.isNearReward;
    if (rule === 'welcome') {
      const created = parse(c.created_at);
      const age = created ? (now - created) / dayMs : 0;
      return age >= 3 && age <= 14 && (c.purchaseCount || 0) <= 1;
    }
    if (rule === 'birthday') {
      if (!c.birthday) return false;
      const d = new Date();
      const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return String(c.birthday).slice(5, 10) === md;
    }
    return false;
  });
}

async function runAutomations({ force } = {}) {
  { const g = proOnly(); if (g) return g; }
  const settings = db.getSettings();
  if (!mailReady(settings) && !settings.telegram_bot_token) return { error: 'not_configured' };
  const transporter = mailReady(settings) ? createTransporter(settings) : null;
  // v2.16: автоматика пишет и на почту, и в Telegram — каждому туда, где он дал согласие.
  const autoChannels = settings.auto_channels === 'email' ? ['email'] : settings.auto_channels === 'telegram' ? ['telegram'] : ['email', 'telegram'];
  const result = {};
  for (const rule of Object.keys(AUTO_RULES)) {
    result[rule] = 0;
    if (!autoOn(rule, settings)) continue;
    const targets = automationCandidates(rule, settings).filter(c => {
      const last = db.lastAutomationSent(c.id, rule);
      return last === null || last >= AUTO_RULES[rule].cooldown;
    });
    for (const c of targets) {
      const lang = AUTO_TEXT[c.preferred_language] ? c.preferred_language : (AUTO_TEXT[settings.app_language] ? settings.app_language : 'ru');
      const ctx = getBrandContext(lang);
      let T = AUTO_TEXT[lang][rule];
      if (rule === 'expiry') {
        const E = EXPIRY_TEXT[lang] || EXPIRY_TEXT.ru; const x = c.expiry || {};
        const what = [x.bonus > 0 ? E.bonus(x.bonus) : '', x.stamps > 0 ? E.stamps(x.stamps) : ''].filter(Boolean).join(' + ');
        const date = x.date ? new Date(x.date + 'T12:00:00').toLocaleDateString({ ru: 'ru-RU', uk: 'uk-UA', sk: 'sk-SK', en: 'en-GB' }[lang] || 'ru-RU') : '';
        T = { s: E.s, h: (n, b, e, p) => E.h(n, b, e, p, escHtml(what), escHtml(date)) };
      }
      const extra = rule === 'welcome' && grow ? grow.inviteHtml(c, lang) : '';   // 2.20: в приветствии — ссылка «Приведи друга»
      const out = await deliverToClient(c, { channels: autoChannels, transporter, subject: T.s(ctx.brandName), html: T.h(escHtml(c.name), escHtml(ctx.brandName), ctx.emoji, ctx.phrase) + extra, image: rule === 'expiry' ? kindImage('near', lang) : kindImage(rule, lang), lang, logSubject: 'auto:' + rule });
      if (out.email === 'sent' || out.telegram === 'sent') { db.logAutomation(c.id, rule); result[rule]++; }
      else if (out.email === 'error' || out.telegram === 'error') console.log(`[Auto] Не удалось отправить (${rule}) ${c.name}`);
    }
  }
  return { ok: true, sent: result };
}

function checkAutomationSchedule() {
  if (!db) return;
  const settings = db.getSettings();
  if (!Object.keys(AUTO_RULES).some(r => autoOn(r, settings))) return;
  // Местная дата (а не UTC) — иначе около полуночи рассылка могла уйти дважды или не уйти.
  const d0 = new Date();
  const today = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-${String(d0.getDate()).padStart(2, '0')}`;
  if (settings.auto_last_run === today) return;
  const [h, m] = String(settings.auto_time || '10:00').split(':').map(Number);
  const now = new Date();
  if (now.getHours() * 60 + now.getMinutes() < (h || 0) * 60 + (m || 0)) return;
  db.saveSettings({ auto_last_run: today });
  runAutomations().then(r => console.log('[Auto] Готово:', JSON.stringify(r))).catch(() => {});
}
setInterval(checkAutomationSchedule, 60 * 1000);

// ====================== 2.19 ======================
// ---------- подарочные сертификаты, уровни, сгорание бонусов ----------
ipcMain.handle('scan:redeemGift', (e, cardId, amount) => db.redeemGift(Number(cardId), amount));
ipcMain.handle('tiers:config', () => db.tierConfig());
ipcMain.handle('expiry:card', (e, cardId) => { const c = db.getCardById(Number(cardId)); return { date: c ? db.cardExpiryDate(c) : null, months: db.expiryMonths() }; });
ipcMain.handle('expiry:overview', () => ({ months: db.expiryMonths(), soon: db.expiringSoon(7).length, last30: db.expiryStats(30) }));
// Бонусы сгорают раз в день (по местной дате). В общей базе это может сделать любое устройство — повтор безвреден.
function checkExpiryBurn() {
  if (!db) return;
  try {
    const s = db.getSettings(); if (!db.expiryMonths(s)) return;
    const d = new Date(); const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (s.expiry_burn_day === today) return;
    db.saveSettings({ expiry_burn_day: today });
    const r = db.burnExpired();
    if (r.burned && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('remote-data-changed');
  } catch (err) { writeCrashLog('expiryBurn', err); }
}
setTimeout(checkExpiryBurn, 75 * 1000);
setInterval(checkExpiryBurn, 60 * 60 * 1000);

// ---------- отчёт владельцу за месяц ----------
const REPORT_TEXT = {
  ru: { subj: (b, m) => `📈 ${b}: итоги за ${m}`, title: (m) => `Итоги за ${m}`, intro: 'Коротко о том, как поработала программа лояльности за месяц.', visits: 'Визитов', guests: 'Разных гостей', returned: 'Вернулись снова', newc: 'Новых клиентов', revenue: 'Выручка по картам', avg: 'Средний чек', rewards: 'Выдано наград', gift: 'Оплачено сертификатами', vs: 'к прошлому месяцу', top: 'Лучшие гости месяца', vis: 'виз.', risk: (n) => `⚠️ ${n} постоянных гостей давно не заходили — их стоит позвать обратно (Маркетинг → «Что сделать сегодня»).`, burned: (b, s) => `🔥 Сгорело: ${b} бонусов, ${s} штампов — это повод для гостей возвращаться вовремя.`, tiers: (s, g) => `🥈 Silver: ${s} · 🥇 Gold: ${g}`, total: (n) => `Всего клиентов в базе: ${n}`, foot: 'Письмо пришло из программы Loya. Выключить: Настройки → Сообщения и рассылки → «Отчёт за месяц».', months: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'] },
  uk: { subj: (b, m) => `📈 ${b}: підсумки за ${m}`, title: (m) => `Підсумки за ${m}`, intro: 'Коротко про те, як працювала програма лояльності за місяць.', visits: 'Візитів', guests: 'Різних гостей', returned: 'Повернулися знову', newc: 'Нових клієнтів', revenue: 'Виручка за картками', avg: 'Середній чек', rewards: 'Видано нагород', gift: 'Оплачено сертифікатами', vs: 'до минулого місяця', top: 'Найкращі гості місяця', vis: 'віз.', risk: (n) => `⚠️ ${n} постійних гостей давно не заходили — варто покликати їх назад (Маркетинг → «Що зробити сьогодні»).`, burned: (b, s) => `🔥 Згоріло: ${b} бонусів, ${s} штампів — це привід для гостей повертатися вчасно.`, tiers: (s, g) => `🥈 Silver: ${s} · 🥇 Gold: ${g}`, total: (n) => `Усього клієнтів у базі: ${n}`, foot: 'Лист надіслала програма Loya. Вимкнути: Налаштування → Повідомлення й розсилки → «Звіт за місяць».', months: ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'] },
  sk: { subj: (b, m) => `📈 ${b}: výsledky za ${m}`, title: (m) => `Výsledky za ${m}`, intro: 'Stručne o tom, ako fungoval vernostný program za mesiac.', visits: 'Návštev', guests: 'Rôznych hostí', returned: 'Vrátili sa', newc: 'Nových zákazníkov', revenue: 'Tržby cez karty', avg: 'Priemerný nákup', rewards: 'Odmien', gift: 'Zaplatené poukážkami', vs: 'oproti minulému mesiacu', top: 'Najlepší hostia mesiaca', vis: 'náv.', risk: (n) => `⚠️ ${n} stálych hostí dlho neprišlo — oplatí sa ich pozvať späť (Marketing → „Čo urobiť dnes“).`, burned: (b, s) => `🔥 Prepadlo: ${b} bodov, ${s} pečiatok — dôvod pre hostí vracať sa včas.`, tiers: (s, g) => `🥈 Silver: ${s} · 🥇 Gold: ${g}`, total: (n) => `Zákazníkov v databáze: ${n}`, foot: 'E-mail poslal program Loya. Vypnúť: Nastavenia → Správy a kampane → „Mesačný prehľad“.', months: ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december'] },
  en: { subj: (b, m) => `📈 ${b}: your ${m} results`, title: (m) => `${m} results`, intro: 'A short summary of how your loyalty program did over the month.', visits: 'Visits', guests: 'Different guests', returned: 'Came back', newc: 'New customers', revenue: 'Revenue via cards', avg: 'Average check', rewards: 'Rewards given', gift: 'Paid with gift cards', vs: 'vs previous month', top: 'Top guests of the month', vis: 'visits', risk: (n) => `⚠️ ${n} regular guests haven't come in for a while — worth inviting them back (Marketing → “What to do today”).`, burned: (b, s) => `🔥 Expired: ${b} bonus points, ${s} stamps — a reason for guests to come back on time.`, tiers: (s, g) => `🥈 Silver: ${s} · 🥇 Gold: ${g}`, total: (n) => `Customers in your database: ${n}`, foot: 'Sent by the Loya app. Turn off: Settings → Messages & campaigns → “Monthly report”.', months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] }
};
function prevMonthYm(d = new Date()) { const x = new Date(d.getFullYear(), d.getMonth() - 1, 15); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; }
function reportHtml(R, lang, brand, color) {
  const L = REPORT_TEXT[lang] || REPORT_TEXT.ru;
  const [y, m] = R.ym.split('-').map(Number);
  const mName = `${L.months[m - 1]} ${y}`;
  const sym = { EUR: '€', USD: '$', RUB: '₽', UAH: '₴', CZK: 'Kč', PLN: 'zł', HUF: 'Ft', GBP: '£', CHF: 'CHF' }[R.cur$] || R.cur$;
  const money = (v) => { const n = Math.round((Number(v) || 0) * 100) / 100; const t = (Number.isInteger(n) ? String(n) : n.toFixed(2)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return lang === 'en' ? sym + t : t + ' ' + sym; };
  const delta = (a, b) => { if (!b) return a ? '<span style="color:#2f7d4a">▲ new</span>'.replace('new', lang === 'en' ? 'new' : lang === 'sk' ? 'nové' : lang === 'uk' ? 'нове' : 'новое') : ''; const p = Math.round((a - b) / b * 100); return p === 0 ? '<span style="color:#8a8170">=</span>' : p > 0 ? `<span style="color:#2f7d4a">▲ ${p}%</span>` : `<span style="color:#b4462e">▼ ${Math.abs(p)}%</span>`; };
  const c = color || '#b8862d';
  const tile = (label, val, d) => `<td style="width:50%;padding:6px"><div style="background:#faf6ee;border:1px solid #eadfc9;border-radius:14px;padding:14px 16px"><div style="font-size:13px;color:#7a6f5e">${label}</div><div style="font-size:24px;font-weight:800;color:#1d170e;margin-top:4px">${val}</div><div style="font-size:12px;margin-top:2px">${d || '&nbsp;'}</div></div></td>`;
  const rows = [
    [tile(L.visits, R.cur.visits, delta(R.cur.visits, R.prev.visits)), tile(L.guests, R.cur.guests, delta(R.cur.guests, R.prev.guests))],
    [tile(L.returned, R.cur.returned, delta(R.cur.returned, R.prev.returned)), tile(L.newc, R.cur.newClients, delta(R.cur.newClients, R.prev.newClients))],
    [tile(L.revenue, money(R.cur.revenue), delta(R.cur.revenue, R.prev.revenue)), tile(L.avg, money(R.cur.avgCheck), delta(R.cur.avgCheck, R.prev.avgCheck))],
    [tile(L.rewards, R.cur.rewards, delta(R.cur.rewards, R.prev.rewards)), R.cur.gift > 0 ? tile(L.gift, money(R.cur.gift), '') : '<td></td>']
  ].map(r => `<tr>${r.join('')}</tr>`).join('');
  const top = R.top.length ? `<h3 style="font-size:16px;margin:22px 0 8px;color:#1d170e">${L.top}</h3><table style="width:100%;border-collapse:collapse;font-size:14px">${R.top.map((x, i) => `<tr><td style="padding:7px 0;border-bottom:1px solid #eee5d3">${i + 1}. ${escHtml(x.name)}</td><td style="padding:7px 0;border-bottom:1px solid #eee5d3;text-align:right;color:#5a5040">${x.visits} ${L.vis}${x.revenue > 0 ? ' · ' + money(x.revenue) : ''}</td></tr>`).join('')}</table>` : '';
  const notes = [R.atRisk > 0 ? L.risk(R.atRisk) : '', (R.burned.bonus || R.burned.stamps) ? L.burned(R.burned.bonus, R.burned.stamps) : '', (R.tiers.silver || R.tiers.gold) ? L.tiers(R.tiers.silver, R.tiers.gold) : '', L.total(R.totalClients)].filter(Boolean).map(x => `<p style="margin:8px 0;font-size:14px;color:#3d3426">${x}</p>`).join('');
  return { subject: L.subj(brand, mName), html: `<div style="font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;color:#1d170e">
  <div style="background:${c};border-radius:18px 18px 0 0;padding:22px 24px;color:#ffffff"><div style="font-size:14px;opacity:.85">${escHtml(brand)}</div><div style="font-size:24px;font-weight:800;margin-top:4px">${L.title(mName)}</div></div>
  <div style="border:1px solid #eadfc9;border-top:none;border-radius:0 0 18px 18px;padding:18px 18px 22px"><p style="margin:0 0 10px;font-size:14px;color:#5a5040">${L.intro} <span style="color:#8a8170">(${L.vs})</span></p>
  <table style="width:100%;border-collapse:collapse">${rows}</table>${top}<div style="margin-top:16px">${notes}</div>
  <p style="margin:18px 0 0;font-size:12px;color:#8a8170">${L.foot}</p></div></div>` };
}
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
async function sendMonthReport(ym, toEmail) {
  const s = db.getSettings();
  const to = String(toEmail || s.report_email || '').trim();
  if (!isEmail(to)) return { error: 'bad_email' };
  if (!mailReady(s)) return { error: mailMode(s) === 'custom' ? 'not_configured' : 'need_license' };
  const lang = ['ru', 'uk', 'sk', 'en'].includes(s.app_language) ? s.app_language : 'ru';
  const R = db.monthReport(ym || prevMonthYm());
  const { subject, html } = reportHtml(R, lang, s.brand_name || 'Loya', s.theme_primary);
  try {
    await createTransporter(s).sendMail({ from: mailFrom(s), to, subject, html });
    return { ok: true, to };
  } catch (err) { return { error: String(err && err.message || 'send_failed').slice(0, 200) }; }
}
ipcMain.handle('report:preview', (e, ym) => { const s = db.getSettings(); const lang = ['ru', 'uk', 'sk', 'en'].includes(s.app_language) ? s.app_language : 'ru'; return reportHtml(db.monthReport(ym || prevMonthYm()), lang, s.brand_name || 'Loya', s.theme_primary); });
ipcMain.handle('report:sendNow', async (e, email) => {
  // «Пример сейчас» — итоги текущего месяца (чтобы было что показать и в первый день работы).
  const d = new Date(); const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return sendMonthReport(ym, email);
});
// Раз в месяц (с 1-го числа, после 9:00) — итоги прошлого месяца. Включается в настройках на одном устройстве.
async function checkMonthReport() {
  if (!db) return;
  const s = db.getSettings();
  if (s.report_monthly !== '1' || !isEmail(s.report_email) || isFreeMode()) return;
  const now = new Date(); if (now.getHours() < 9) return;
  const ym = prevMonthYm(now);
  if (s.report_last === ym) return;
  if (Number(s.report_try_at) && Date.now() - Number(s.report_try_at) < 3 * 3600e3) return;   // после ошибки — не чаще раза в 3 часа
  db.saveSettings({ report_try_at: String(Date.now()) });
  const r = await sendMonthReport(ym);
  if (r.ok) db.saveSettings({ report_last: ym, report_last_error: '' });
  else db.saveSettings({ report_last_error: String(r.error || '') });
}
setTimeout(() => checkMonthReport().catch(() => {}), 3 * 60 * 1000);
setInterval(() => checkMonthReport().catch(() => {}), 30 * 60 * 1000);

// ---------- облачная копия базы ----------
// Раз в день программа шифрует копию базы (AES-256-GCM, ключ выводится из ключа подписки — без него копию
// не прочитать) и отправляет на сервер Loya частями. Хранятся 3 последние копии каждого устройства.
// Восстановить можно на любом компьютере или телефоне с тем же ключом: Настройки → Управление данными.
const CLOUD_PART = Number(process.env.LOYA_CLOUD_PART) || 2400 * 1024;      // сырые байты на часть (в base64 ≈ 3,2 МБ — в лимит запроса Vercel)
const webSubtle = () => (globalThis.crypto && globalThis.crypto.subtle) || (crypto.webcrypto && crypto.webcrypto.subtle);
async function cloudKey(licenseKey) {
  const raw = crypto.pbkdf2Sync(String(licenseKey), 'loya-cloud-v1', 20000, 32, 'sha256');
  return webSubtle().importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
async function gzipBuf(buf) {
  try { const z = require('zlib'); if (z && typeof z.gzipSync === 'function') return { data: z.gzipSync(buf), gz: 1 }; } catch (e) { /* ниже */ }
  if (typeof CompressionStream !== 'undefined') { const st = new Blob([buf]).stream().pipeThrough(new CompressionStream('gzip')); return { data: Buffer.from(await new Response(st).arrayBuffer()), gz: 1 }; }
  return { data: buf, gz: 0 };
}
async function gunzipBuf(buf) {
  try { const z = require('zlib'); if (z && typeof z.gunzipSync === 'function') return z.gunzipSync(buf); } catch (e) { /* ниже */ }
  if (typeof DecompressionStream !== 'undefined') { const st = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip')); return Buffer.from(await new Response(st).arrayBuffer()); }
  throw new Error('no_gzip');
}
async function cloudEncrypt(buf, licenseKey) {
  const { data, gz } = await gzipBuf(buf);
  const iv = crypto.randomBytes(12);
  const ct = Buffer.from(await webSubtle().encrypt({ name: 'AES-GCM', iv }, await cloudKey(licenseKey), data));
  return Buffer.concat([Buffer.from('LOYC'), Buffer.from([1, gz]), iv, ct]);
}
async function cloudDecrypt(blob, licenseKey) {
  if (blob.length < 34 || blob.slice(0, 4).toString() !== 'LOYC' || blob[4] !== 1) throw new Error('bad_format');
  const gz = blob[5], iv = blob.slice(6, 18), ct = blob.slice(18);
  let plain;
  try { plain = Buffer.from(await webSubtle().decrypt({ name: 'AES-GCM', iv }, await cloudKey(licenseKey), ct)); } catch (e) { throw new Error('bad_key'); }
  return gz ? gunzipBuf(plain) : plain;
}
const cloudPost = (op, body, timeout) => {
  const s = db.getSettings();
  if (!SUBSCRIPTION_API_URL || !s.license_key) return Promise.resolve({ error: 'need_license' });
  return httpsPostJson(`${SUBSCRIPTION_API_URL}/api/sync/${op}`, { licenseKey: s.license_key, device: machineId(), ...(body || {}) }, timeout || 60000);
};
let cloudBusy = false;
async function cloudBackupNow(reason) {
  if (cloudBusy) return { error: 'busy' };
  const s = db.getSettings();
  if (!s.license_key) return { error: 'need_license' };
  if (licenseState().mode !== 'full') return { error: 'license_inactive' };
  cloudBusy = true;
  try {
    const blob = await cloudEncrypt(db.exportBuffer(), s.license_key);
    const sha = crypto.createHash('sha256').update(blob).digest('hex');
    const parts = Math.max(1, Math.ceil(blob.length / CLOUD_PART));
    if (parts > 16) return { error: 'too_big' };
    const id = crypto.randomBytes(12).toString('hex');
    const cur = db.currentPoint ? db.currentPoint() : null;
    const meta = { v: app.getVersion ? app.getVersion() : '', clients: (db.get(`SELECT COUNT(*) AS n FROM clients`) || {}).n || 0, reason: reason || 'daily' };
    for (let i = 0; i < parts; i++) {
      const data = blob.slice(i * CLOUD_PART, (i + 1) * CLOUD_PART).toString('base64');
      let r = null;
      for (let attempt = 0; attempt < 3 && !(r && r.ok); attempt++) {
        try { r = await cloudPost('cloud-put', { id, part: i, parts, size: blob.length, sha, data, deviceName: deviceName(), point: cur ? cur.name : '', meta }, 120000); }
        catch (err) { r = { error: 'network' }; }
        if (r && r.error && !['network', 'server_error', 'not_ready'].includes(r.error)) break;
      }
      if (!r || !r.ok) { db.saveSettings({ cloud_last_error: (r && r.error) || 'network' }); return { error: (r && r.error) || 'network' }; }
    }
    db.saveSettings({ cloud_last_ok: new Date().toISOString(), cloud_last_size: String(blob.length), cloud_last_error: '' });
    return { ok: true, size: blob.length };
  } catch (err) {
    db.saveSettings({ cloud_last_error: String(err && err.message || 'failed').slice(0, 100) });
    return { error: 'failed' };
  } finally { cloudBusy = false; }
}
function checkCloudBackup() {
  if (!db) return;
  const s = db.getSettings();
  if (s.cloud_backup === '0' || !s.license_key || licenseState().mode !== 'full' || s.onboarding_completed !== '1') return;
  const last = Date.parse(s.cloud_last_ok || '') || 0;
  if (Date.now() - last < 20 * 3600e3) return;
  if (Number(s.cloud_try_at) && Date.now() - Number(s.cloud_try_at) < 2 * 3600e3) return;   // после неудачи — через 2 часа
  db.saveSettings({ cloud_try_at: String(Date.now()) });
  cloudBackupNow('daily').catch(() => {});
}
setTimeout(checkCloudBackup, 4 * 60 * 1000);
setInterval(checkCloudBackup, 30 * 60 * 1000);
ipcMain.handle('cloud:status', () => { const s = db.getSettings(); return { on: s.cloud_backup !== '0', lastOk: s.cloud_last_ok || '', size: Number(s.cloud_last_size) || 0, lastError: s.cloud_last_error || '', hasKey: !!s.license_key, licensed: licenseState().mode === 'full', busy: cloudBusy }; });
ipcMain.handle('cloud:setOn', (e, on) => { db.saveSettings({ cloud_backup: on ? '1' : '0' }); return { ok: true }; });
ipcMain.handle('cloud:backupNow', () => cloudBackupNow('manual'));
ipcMain.handle('cloud:list', async () => {
  try {
    const r = await cloudPost('cloud-list', {}, 20000);
    if (!r || !r.ok) return { error: (r && r.error) || 'failed' };
    return { ok: true, items: (r.items || []).map(x => ({ id: x.id, at: x.created_at, size: x.size, device: x.device_name || '', point: x.point || '', mine: !!x.mine, clients: (x.meta && x.meta.clients) || 0 })) };
  } catch (err) { return { error: 'network' }; }
});
// Скачать копию из облака и проверить её (как файл копии); восстановление — той же кнопкой, что и для файла.
ipcMain.handle('cloud:fetch', async (e, id) => {
  if (!/^[0-9a-f]{24}$/.test(String(id || ''))) return { error: 'bad_id' };
  const s = db.getSettings();
  try {
    const chunks = []; let parts = 1, sha = '';
    for (let i = 0; i < parts; i++) {
      const r = await cloudPost('cloud-get', { id, part: i }, 120000);
      if (!r || !r.ok) return { error: (r && r.error) || 'failed' };
      parts = Math.max(1, Math.min(16, Number(r.parts) || 1)); sha = r.sha || sha;
      chunks.push(Buffer.from(String(r.data || ''), 'base64'));
    }
    const blob = Buffer.concat(chunks);
    if (sha && crypto.createHash('sha256').update(blob).digest('hex') !== sha) return { error: 'corrupt' };
    const buf = await cloudDecrypt(blob, s.license_key);
    const info = db.inspectBackup(buf);
    if (info.ok) pendingRestore = { buf, label: 'cloud-' + id.slice(0, 8), at: Date.now() };
    return { ...info, label: 'cloud' };
  } catch (err) { return { error: String(err && err.message) === 'bad_key' ? 'bad_key' : 'network' }; }
});

// ---------- виджет Android «Loya сегодня» ----------
const WIDGET_TEXT = { ru: { v: 'визитов сегодня', r: 'выручка по картам', n: (n) => `новых клиентов: ${n}` }, uk: { v: 'візитів сьогодні', r: 'виручка за картками', n: (n) => `нових клієнтів: ${n}` }, sk: { v: 'návštev dnes', r: 'tržby cez karty', n: (n) => `nových zákazníkov: ${n}` }, en: { v: 'visits today', r: 'revenue via cards', n: (n) => `new customers: ${n}` } };
ipcMain.handle('widget:summary', () => {
  const s = db.getSettings(); const lang = WIDGET_TEXT[s.app_language] ? s.app_language : 'ru'; const W = WIDGET_TEXT[lang];
  const one = (sql) => { const r = db.get(sql); return r ? (Object.values(r)[0] || 0) : 0; };
  const today = `date(created_at, 'localtime') = date('now', 'localtime')`;
  const visits = one(`SELECT COUNT(*) FROM scan_history WHERE ${today}`);
  const rev = Math.round(one(`SELECT COALESCE(SUM(amount_spent), 0) FROM scan_history WHERE amount_spent > 0 AND ${today}`) * 100) / 100;
  const newc = one(`SELECT COUNT(*) FROM clients WHERE ${today}`);
  const sym = { EUR: '€', USD: '$', RUB: '₽', UAH: '₴', CZK: 'Kč', PLN: 'zł', HUF: 'Ft', GBP: '£', CHF: 'CHF' }[s.spend_currency] || '€';
  const t = Number.isInteger(rev) ? String(rev) : rev.toFixed(2);
  const d = new Date();
  return { title: `${s.brand_name || 'Loya'} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, visits: String(visits), visitsLabel: W.v, revenue: lang === 'en' ? sym + t : `${t} ${sym}`, revenueLabel: W.r, foot: W.n(newc) };
});

// ---------- Wallet рядом с заведением ----------
// Координаты заведения: вставить из Google Maps («48.3774, 17.5872» или ссылку с @48.37,17.58) или найти по адресу.
ipcMain.handle('geo:search', async (e, q) => {
  const query = String(q || '').trim().slice(0, 200);
  if (query.length < 3) return { error: 'short' };
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`;
    const req = https.get(url, { headers: { 'User-Agent': 'Loya loyalty app (loya-loyalty.com)', 'Accept-Language': db.getSettings().app_language || 'en' }, timeout: 10000 }, (res) => {
      let raw = ''; res.on('data', (c) => { raw += c; }); res.on('end', () => {
        try { const arr = JSON.parse(raw); resolve({ ok: true, items: (Array.isArray(arr) ? arr : []).slice(0, 5).map(x => ({ name: String(x.display_name || '').slice(0, 140), lat: Number(x.lat), lng: Number(x.lon) })).filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng)) }); }
        catch (err) { resolve({ error: 'failed' }); }
      });
    });
    req.on('error', () => resolve({ error: 'network' }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'network' }); });
  });
});
function walletGeo(s) {
  if (s.geo_on !== '1') return null;
  const ok = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
  let pts = []; try { pts = JSON.parse(s.geo_points || '[]'); } catch (e) { pts = []; }
  pts = (Array.isArray(pts) ? pts : []).map(p => ({ lat: Number(p.lat), lng: Number(p.lng), name: String(p.name || '').slice(0, 60) })).filter(p => ok(p.lat, p.lng));
  if (!pts.length && ok(Number(s.geo_lat), Number(s.geo_lng))) pts = [{ lat: Number(s.geo_lat), lng: Number(s.geo_lng), name: String(s.geo_place || '').slice(0, 60) }];
  if (!pts.length) return null;
  pts = pts.slice(0, 10).map(p => ({ ...p, lat: Math.round(p.lat * 1e6) / 1e6, lng: Math.round(p.lng * 1e6) / 1e6 }));
  return { lat: pts[0].lat, lng: pts[0].lng, points: pts, radius: 200, text: String(s.geo_text || '').slice(0, 120) };
}
// 2.24: проверка «Wallet рядом» и обновление уже выданных карт сразу после сохранения.
ipcMain.handle('geo:info', () => {
  const s = db.getSettings();
  const walletCards = (db.get(`SELECT COUNT(*) AS n FROM cards WHERE wallet_linked = 1`) || {}).n || 0;
  return { license: !!s.license_key, walletCards, lastApply: s.geo_last_apply || '', on: s.geo_on === '1', points: (walletGeo(s) || { points: [] }).points.length };
});
ipcMain.handle('wallet:refreshAll', () => { refreshAllWalletCards().catch(() => {}); return { ok: true }; });
ipcMain.handle('geo:apply', () => {
  const s = db.getSettings();
  scheduleProfilePublish();
  if (!s.license_key) return { error: 'need_license' };
  const cards = (db.get(`SELECT COUNT(*) AS n FROM cards WHERE wallet_linked = 1`) || {}).n || 0;
  db.saveSettings({ geo_last_apply: new Date().toISOString().slice(0, 16).replace('T', ' ') });
  refreshAllWalletCards().catch(() => {});
  return { started: true, cards };
});

// ---------- печать карт и наклеек ----------
// Окно готовит HTML-страницу (A4 с картами/наклейками), здесь она открывается в скрытом
// окне и либо отправляется на принтер через системный диалог, либо сохраняется в PDF.
ipcMain.handle('print:html', async (e, html, opts = {}) => {
  const tmpFile = path.join(require('os').tmpdir(), `loya-print-${Date.now()}.html`);
  fs.writeFileSync(tmpFile, html, 'utf8');
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false, devTools: false } });
  try {
    await win.loadFile(tmpFile);
    await new Promise(r => setTimeout(r, 300));
    if (opts.pdf) {
      const data = await win.webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { marginType: 'none' } });
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: opts.title || 'PDF', defaultPath: `${opts.fileName || 'loya-print'}.pdf`, filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      if (canceled || !filePath) return { canceled: true };
      fs.writeFileSync(filePath, data);
      return { ok: true, filePath };
    }
    const ok = await new Promise(resolve => {
      win.webContents.print({ printBackground: true, margins: { marginType: 'none' } }, (success) => resolve(success));
    });
    return ok ? { ok: true } : { canceled: true };
  } finally {
    win.destroy();
    try { fs.unlinkSync(tmpFile); } catch (err) { /* не страшно */ }
  }
});

ipcMain.handle('auto:runNow', () => runAutomations({ force: true }));
ipcMain.handle('auto:stats', () => db.automationStats(30));
ipcMain.handle('auto:preview', () => {
  const settings = db.getSettings();
  const out = {};
  Object.keys(AUTO_RULES).forEach(rule => {
    out[rule] = automationCandidates(rule, settings).filter(c => {
      const last = db.lastAutomationSent(c.id, rule);
      return last === null || last >= AUTO_RULES[rule].cooldown;
    }).length;
  });
  return out;
});

// Автоматическая ежедневная проверка именин (работает, только пока приложение запущено).
// Каждую минуту проверяем: включена ли автоматика, наступило ли заданное время,
// и не запускали ли мы её уже сегодня — так письма не дублируются даже при частых перезапусках.
function checkNamedayAutoSend() {
  if (!db) return;
  const settings = db.getSettings();
  if (settings.nameday_auto_enabled !== '1') return;
  // Meniny — только для заведений в Словакии.
  if ((settings.business_country || (settings.app_language === 'sk' ? 'SK' : 'OTHER')) !== 'SK') return;

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (settings.nameday_auto_last_run === today) return;

  const targetTime = settings.nameday_auto_time || '09:00';
  const [targetH, targetM] = targetTime.split(':').map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = (targetH || 0) * 60 + (targetM || 0);
  if (nowMinutes < targetMinutes) return;

  const names = todayNamedayNames(now).map(namedayNormalize);
  if (names.length === 0) {
    db.saveSettings({ nameday_auto_last_run: today });
    return;
  }

  const allClients = db.getClients();
  const matches = allClients.filter(c => names.includes(namedayNormalize(namedayFirstName(c.name))));
  db.saveSettings({ nameday_auto_last_run: today });

  if (matches.length === 0) return;

  console.log(`[Meniny] Автоматическая проверка: найдено именинников — ${matches.length}`);
  sendNamedayBatch(matches.map(c => c.id), settings.nameday_auto_gift || '', 'sk')
    .then(res => console.log('[Meniny] Автоматическая рассылка завершена:', JSON.stringify(res)))
    .catch(err => console.log('[Meniny] Ошибка автоматической рассылки:', err.message));
}

setInterval(checkNamedayAutoSend, 60 * 1000);

// ---------- погода (Open-Meteo — бесплатно, без API-ключа) ----------

// Находит координаты города по названию (на нужном языке для названия/страны).
async function geocodeCity(cityName, lang) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=${encodeURIComponent(lang || 'ru')}&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.results || !data.results.length) return null;
  const r = data.results[0];
  return { lat: r.latitude, lon: r.longitude, resolvedName: `${r.name}${r.country ? ', ' + r.country : ''}` };
}

ipcMain.handle('weather:setCity', async (e, cityName, lang) => {
  try {
    const geo = await geocodeCity(cityName, lang);
    if (!geo) return { error: 'city_not_found' };
    db.saveSettings({
      weather_city: cityName,
      weather_lat: String(geo.lat),
      weather_lon: String(geo.lon),
      [`weather_resolved_name_${lang || 'ru'}`]: geo.resolvedName
    });
    return { ok: true, resolvedName: geo.resolvedName };
  } catch (err) {
    return { error: 'network' };
  }
});

ipcMain.handle('weather:get', async (e, lang) => {
  const settings = db.getSettings();
  if (!settings.weather_lat || !settings.weather_lon) {
    return { notConfigured: true };
  }
  try {
    // Название города кешируется отдельно на каждый язык — переключение языка приложения
    // не должно требовать повторного ввода города, но должно менять язык его названия.
    const langKey = `weather_resolved_name_${lang || 'ru'}`;
    let cityDisplayName = settings[langKey];
    if (!cityDisplayName && settings.weather_city) {
      const geo = await geocodeCity(settings.weather_city, lang);
      if (geo) {
        cityDisplayName = geo.resolvedName;
        db.saveSettings({ [langKey]: cityDisplayName });
      }
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${settings.weather_lat}&longitude=${settings.weather_lon}&current=temperature_2m,precipitation,weather_code&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    const tempC = data.current.temperature_2m;
    const precipitation = data.current.precipitation;
    const weatherCode = data.current.weather_code;

    const hotThreshold = Number(settings.weather_hot_threshold) || 25;
    const coldThreshold = Number(settings.weather_cold_threshold) || 8;

    let suggestion = 'neutral';
    if (tempC >= hotThreshold) suggestion = 'hot';
    else if (tempC <= coldThreshold || precipitation > 0) suggestion = 'cold';

    return {
      ok: true,
      city: cityDisplayName || settings.weather_city,
      tempC, precipitation, weatherCode, suggestion,
      hotThreshold, coldThreshold
    };
  } catch (err) {
    return { error: 'network' };
  }
});

// ---------- 2.20: «Приведи друга», отзывы после визита, онлайн-запись, касса Dotykačka ----------
grow = require('./grow')({
  ipcMain, dialog, shell, fs, Database, API: SUBSCRIPTION_API_URL, post: (u, b, t) => httpsPostJson(u, b, t),
  db: () => db, mainWindow: () => mainWindow, notice: (k, d) => notice(k, d), deliverToClient: (c, o) => deliverToClient(c, o),
  getBrandContext: (l) => getBrandContext(l), escHtml: (v) => escHtml(v), mailReady: (s) => mailReady(s), writeCrashLog: (k, e) => writeCrashLog(k, e),
  publishOnlineProfile: () => publishOnlineProfile(), posReceipt: (p, src) => posReceipt(p, src)
});
if (db) grow.attach();

}, {"electron":5,"electron-updater":9,"path":10,"fs":4,"https":11,"crypto":6,"qrcode":12,"nodemailer":41,"./db":42,"./niches.js":45,"./src/nameday-calendar.js":46,"./src/card-model.js":47,"./local-api-server":48,"child_process":49,"os":50,"./xlsx-lite":51,"zlib":49,"./grow":52}, "/app/pc-app/main.js"];
__defs[9] = [function(module, exports, require, __filename, __dirname){
// Обновления Android-версии — через новый APK / магазин приложений, а не через electron-updater.
'use strict';
const autoUpdater = { autoDownload: false, autoInstallOnAppQuit: false, logger: null, on() { return autoUpdater; }, once() { return autoUpdater; }, removeAllListeners() {}, checkForUpdates: () => Promise.resolve(null), downloadUpdate: () => Promise.resolve(null), quitAndInstall() {} };
module.exports = { autoUpdater };

}, {}, "/app/shims/electron-updater.js"];
__defs[10] = [function(module, exports, require, __filename, __dirname){
// path (POSIX) для Android-версии
'use strict';
function normalize(p) {
  const abs = String(p).startsWith('/'); const out = [];
  for (const s of String(p).split('/')) { if (!s || s === '.') continue; if (s === '..') { if (out.length && out[out.length - 1] !== '..') out.pop(); else if (!abs) out.push('..'); } else out.push(s); }
  return (abs ? '/' : '') + out.join('/') || (abs ? '/' : '.');
}
function join(...a) { return normalize(a.filter(x => x !== '' && x != null).map(String).join('/')); }
function resolve(...a) { let r = ''; for (let i = a.length - 1; i >= 0; i--) { r = r ? a[i] + '/' + r : String(a[i]); if (String(a[i]).startsWith('/')) break; } return normalize(r.startsWith('/') ? r : '/' + r); }
function dirname(p) { p = String(p); const i = p.replace(/\/+$/, '').lastIndexOf('/'); return i < 0 ? '.' : i === 0 ? '/' : p.slice(0, i); }
function basename(p, ext) { let b = String(p).replace(/\/+$/, ''); b = b.slice(b.lastIndexOf('/') + 1); if (ext && b.endsWith(ext)) b = b.slice(0, -ext.length); return b; }
function extname(p) { const b = basename(p); const i = b.lastIndexOf('.'); return i <= 0 ? '' : b.slice(i); }
function relative(from, to) { const f = resolve(from).split('/').filter(Boolean), t = resolve(to).split('/').filter(Boolean); let i = 0; while (i < f.length && f[i] === t[i]) i++; return [...Array(f.length - i).fill('..'), ...t.slice(i)].join('/'); }
const path = { sep: '/', delimiter: ':', join, resolve, normalize, dirname, basename, extname, relative, isAbsolute: (p) => String(p).startsWith('/'), parse: (p) => ({ root: '/', dir: dirname(p), base: basename(p), ext: extname(p), name: basename(p, extname(p)) }) };
path.posix = path; path.win32 = path;
module.exports = path;

}, {}, "/app/shims/path.js"];
__defs[11] = [function(module, exports, require, __filename, __dirname){
// https для Android-версии: тот же интерфейс, что у Node (request/get), но запрос делает fetch.
// В Capacitor включён CapacitorHttp — fetch идёт через нативный HTTP Android, без ограничений CORS.
'use strict';
const { Buffer } = require('buffer');
function emitter(o) {
  const ls = {};
  o.on = (ev, fn) => { (ls[ev] = ls[ev] || []).push(fn); return o; };
  o.once = (ev, fn) => { const w = (...a) => { o.removeListener(ev, w); fn(...a); }; return o.on(ev, w); };
  o.removeListener = (ev, fn) => { ls[ev] = (ls[ev] || []).filter(f => f !== fn); return o; };
  o.emit = (ev, ...a) => { (ls[ev] || []).slice().forEach(f => { try { f(...a); } catch (e) { setTimeout(() => { throw e; }); } }); return !!(ls[ev] && ls[ev].length); };
  return o;
}
function request(opts, cbOrOpts, maybeCb) {
  let url, cb = typeof cbOrOpts === 'function' ? cbOrOpts : maybeCb;
  let o = typeof opts === 'string' || opts instanceof URL ? Object.assign({}, typeof cbOrOpts === 'object' ? cbOrOpts : {}) : Object.assign({}, opts);
  if (typeof opts === 'string' || opts instanceof URL) url = String(opts);
  else url = `${o.protocol || 'https:'}//${o.hostname || o.host}${o.port ? ':' + o.port : ''}${o.path || '/'}`;
  const method = (o.method || 'GET').toUpperCase();
  const headers = Object.assign({}, o.headers || {}); delete headers['Content-Length']; delete headers['content-length'];
  const chunks = []; let ended = false, aborted = false, timer = null;
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const req = emitter({});
  req.write = (d) => { chunks.push(typeof d === 'string' ? Buffer.from(d) : Buffer.from(d)); return true; };
  req.setTimeout = (ms, fn) => { if (fn) req.on('timeout', fn); clearTimeout(timer); timer = setTimeout(() => req.emit('timeout'), ms); return req; };
  req.destroy = (err) => { if (aborted) return; aborted = true; clearTimeout(timer); try { ctrl && ctrl.abort(); } catch (e) { /* уже */ } if (err) req.emit('error', err); };
  req.abort = () => req.destroy();
  if (o.timeout) req.setTimeout(o.timeout);
  req.end = (d) => {
    if (d) req.write(d);
    if (ended) return; ended = true;
    // Демо на сайте: ничего не отправляем (письма, Wallet, лицензия) — программа покажет обычную ошибку связи
    if (globalThis.__LOYA_DEMO === true) { setTimeout(() => { if (globalThis.__loyaDemoNet) globalThis.__loyaDemoNet(url); req.emit('error', new Error('demo_offline')); }, 30); return req; }
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    fetch(url, { method, headers, body: body && method !== 'GET' && method !== 'HEAD' ? (headers['Content-Type'] || headers['content-type'] || '').includes('json') ? body.toString('utf8') : body : undefined, signal: ctrl ? ctrl.signal : undefined, cache: 'no-store' })
      .then(async (r) => {
        clearTimeout(timer);
        if (aborted) return;
        const res = emitter({ statusCode: r.status, statusMessage: r.statusText, headers: {} });
        r.headers.forEach((v, k) => { res.headers[k.toLowerCase()] = v; });
        let enc = null;
        res.setEncoding = (e) => { enc = e; return res; };
        res.resume = () => res; res.pipe = () => res;
        if (cb) cb(res);
        const ab = await r.arrayBuffer();
        const buf = Buffer.from(new Uint8Array(ab));
        if (buf.length) res.emit('data', enc ? buf.toString(enc) : buf);
        res.emit('end');
      })
      .catch((err) => { clearTimeout(timer); if (!aborted) req.emit('error', err instanceof Error ? err : new Error(String(err))); });
    return req;
  };
  return req;
}
function get(opts, a, b) { const r = request(opts, a, b); r.end(); return r; }
module.exports = { request, get, Agent: function () {}, createServer: () => ({ listen() {}, on() {}, close() {} }) };

}, {"buffer":1}, "/app/shims/https.js"];
__defs[12] = [function(module, exports, require, __filename, __dirname){
// qrcode для Android-версии: тот же пакет qrcode (браузерная сборка, рисует на canvas).
// toBuffer (на ПК — PNG через pngjs) делаем из toDataURL — результат такой же PNG.
'use strict';
const { Buffer } = require('buffer');
const QR = require('qrcode/lib/browser.js');
async function toDataURL(text, opts) { return QR.toDataURL(String(text), Object.assign({ errorCorrectionLevel: 'M' }, opts || {})); }
async function toBuffer(text, opts) { const u = await toDataURL(text, opts); return Buffer.from(u.split(',')[1], 'base64'); }
module.exports = { toDataURL, toBuffer, toString: (t, o) => QR.toString(String(t), o), toCanvas: QR.toCanvas, create: QR.create };

}, {"buffer":1,"qrcode/lib/browser.js":13}, "/app/shims/qrcode.js"];
__defs[13] = [function(module, exports, require, __filename, __dirname){

const canPromise = require('./can-promise')

const QRCode = require('./core/qrcode')
const CanvasRenderer = require('./renderer/canvas')
const SvgRenderer = require('./renderer/svg-tag.js')

function renderCanvas (renderFunc, canvas, text, opts, cb) {
  const args = [].slice.call(arguments, 1)
  const argsNum = args.length
  const isLastArgCb = typeof args[argsNum - 1] === 'function'

  if (!isLastArgCb && !canPromise()) {
    throw new Error('Callback required as last argument')
  }

  if (isLastArgCb) {
    if (argsNum < 2) {
      throw new Error('Too few arguments provided')
    }

    if (argsNum === 2) {
      cb = text
      text = canvas
      canvas = opts = undefined
    } else if (argsNum === 3) {
      if (canvas.getContext && typeof cb === 'undefined') {
        cb = opts
        opts = undefined
      } else {
        cb = opts
        opts = text
        text = canvas
        canvas = undefined
      }
    }
  } else {
    if (argsNum < 1) {
      throw new Error('Too few arguments provided')
    }

    if (argsNum === 1) {
      text = canvas
      canvas = opts = undefined
    } else if (argsNum === 2 && !canvas.getContext) {
      opts = text
      text = canvas
      canvas = undefined
    }

    return new Promise(function (resolve, reject) {
      try {
        const data = QRCode.create(text, opts)
        resolve(renderFunc(data, canvas, opts))
      } catch (e) {
        reject(e)
      }
    })
  }

  try {
    const data = QRCode.create(text, opts)
    cb(null, renderFunc(data, canvas, opts))
  } catch (e) {
    cb(e)
  }
}

exports.create = QRCode.create
exports.toCanvas = renderCanvas.bind(null, CanvasRenderer.render)
exports.toDataURL = renderCanvas.bind(null, CanvasRenderer.renderToDataURL)

// only svg for now.
exports.toString = renderCanvas.bind(null, function (data, _, opts) {
  return SvgRenderer.render(data, opts)
})

}, {"./can-promise":14,"./core/qrcode":15,"./renderer/canvas":38,"./renderer/svg-tag.js":40}, "/app/lib/browser.js"];
__defs[14] = [function(module, exports, require, __filename, __dirname){
// can-promise has a crash in some versions of react native that dont have
// standard global objects
// https://github.com/soldair/node-qrcode/issues/157

module.exports = function () {
  return typeof Promise === 'function' && Promise.prototype && Promise.prototype.then
}

}, {}, "/app/lib/can-promise.js"];
__defs[15] = [function(module, exports, require, __filename, __dirname){
const Utils = require('./utils')
const ECLevel = require('./error-correction-level')
const BitBuffer = require('./bit-buffer')
const BitMatrix = require('./bit-matrix')
const AlignmentPattern = require('./alignment-pattern')
const FinderPattern = require('./finder-pattern')
const MaskPattern = require('./mask-pattern')
const ECCode = require('./error-correction-code')
const ReedSolomonEncoder = require('./reed-solomon-encoder')
const Version = require('./version')
const FormatInfo = require('./format-info')
const Mode = require('./mode')
const Segments = require('./segments')

/**
 * QRCode for JavaScript
 *
 * modified by Ryan Day for nodejs support
 * Copyright (c) 2011 Ryan Day
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
//---------------------------------------------------------------------
// QRCode for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// The word "QR Code" is registered trademark of
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------
*/

/**
 * Add finder patterns bits to matrix
 *
 * @param  {BitMatrix} matrix  Modules matrix
 * @param  {Number}    version QR Code version
 */
function setupFinderPattern (matrix, version) {
  const size = matrix.size
  const pos = FinderPattern.getPositions(version)

  for (let i = 0; i < pos.length; i++) {
    const row = pos[i][0]
    const col = pos[i][1]

    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || size <= row + r) continue

      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || size <= col + c) continue

        if ((r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          matrix.set(row + r, col + c, true, true)
        } else {
          matrix.set(row + r, col + c, false, true)
        }
      }
    }
  }
}

/**
 * Add timing pattern bits to matrix
 *
 * Note: this function must be called before {@link setupAlignmentPattern}
 *
 * @param  {BitMatrix} matrix Modules matrix
 */
function setupTimingPattern (matrix) {
  const size = matrix.size

  for (let r = 8; r < size - 8; r++) {
    const value = r % 2 === 0
    matrix.set(r, 6, value, true)
    matrix.set(6, r, value, true)
  }
}

/**
 * Add alignment patterns bits to matrix
 *
 * Note: this function must be called after {@link setupTimingPattern}
 *
 * @param  {BitMatrix} matrix  Modules matrix
 * @param  {Number}    version QR Code version
 */
function setupAlignmentPattern (matrix, version) {
  const pos = AlignmentPattern.getPositions(version)

  for (let i = 0; i < pos.length; i++) {
    const row = pos[i][0]
    const col = pos[i][1]

    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        if (r === -2 || r === 2 || c === -2 || c === 2 ||
          (r === 0 && c === 0)) {
          matrix.set(row + r, col + c, true, true)
        } else {
          matrix.set(row + r, col + c, false, true)
        }
      }
    }
  }
}

/**
 * Add version info bits to matrix
 *
 * @param  {BitMatrix} matrix  Modules matrix
 * @param  {Number}    version QR Code version
 */
function setupVersionInfo (matrix, version) {
  const size = matrix.size
  const bits = Version.getEncodedBits(version)
  let row, col, mod

  for (let i = 0; i < 18; i++) {
    row = Math.floor(i / 3)
    col = i % 3 + size - 8 - 3
    mod = ((bits >> i) & 1) === 1

    matrix.set(row, col, mod, true)
    matrix.set(col, row, mod, true)
  }
}

/**
 * Add format info bits to matrix
 *
 * @param  {BitMatrix} matrix               Modules matrix
 * @param  {ErrorCorrectionLevel}    errorCorrectionLevel Error correction level
 * @param  {Number}    maskPattern          Mask pattern reference value
 */
function setupFormatInfo (matrix, errorCorrectionLevel, maskPattern) {
  const size = matrix.size
  const bits = FormatInfo.getEncodedBits(errorCorrectionLevel, maskPattern)
  let i, mod

  for (i = 0; i < 15; i++) {
    mod = ((bits >> i) & 1) === 1

    // vertical
    if (i < 6) {
      matrix.set(i, 8, mod, true)
    } else if (i < 8) {
      matrix.set(i + 1, 8, mod, true)
    } else {
      matrix.set(size - 15 + i, 8, mod, true)
    }

    // horizontal
    if (i < 8) {
      matrix.set(8, size - i - 1, mod, true)
    } else if (i < 9) {
      matrix.set(8, 15 - i - 1 + 1, mod, true)
    } else {
      matrix.set(8, 15 - i - 1, mod, true)
    }
  }

  // fixed module
  matrix.set(size - 8, 8, 1, true)
}

/**
 * Add encoded data bits to matrix
 *
 * @param  {BitMatrix}  matrix Modules matrix
 * @param  {Uint8Array} data   Data codewords
 */
function setupData (matrix, data) {
  const size = matrix.size
  let inc = -1
  let row = size - 1
  let bitIndex = 7
  let byteIndex = 0

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--

    while (true) {
      for (let c = 0; c < 2; c++) {
        if (!matrix.isReserved(row, col - c)) {
          let dark = false

          if (byteIndex < data.length) {
            dark = (((data[byteIndex] >>> bitIndex) & 1) === 1)
          }

          matrix.set(row, col - c, dark)
          bitIndex--

          if (bitIndex === -1) {
            byteIndex++
            bitIndex = 7
          }
        }
      }

      row += inc

      if (row < 0 || size <= row) {
        row -= inc
        inc = -inc
        break
      }
    }
  }
}

/**
 * Create encoded codewords from data input
 *
 * @param  {Number}   version              QR Code version
 * @param  {ErrorCorrectionLevel}   errorCorrectionLevel Error correction level
 * @param  {ByteData} data                 Data input
 * @return {Uint8Array}                    Buffer containing encoded codewords
 */
function createData (version, errorCorrectionLevel, segments) {
  // Prepare data buffer
  const buffer = new BitBuffer()

  segments.forEach(function (data) {
    // prefix data with mode indicator (4 bits)
    buffer.put(data.mode.bit, 4)

    // Prefix data with character count indicator.
    // The character count indicator is a string of bits that represents the
    // number of characters that are being encoded.
    // The character count indicator must be placed after the mode indicator
    // and must be a certain number of bits long, depending on the QR version
    // and data mode
    // @see {@link Mode.getCharCountIndicator}.
    buffer.put(data.getLength(), Mode.getCharCountIndicator(data.mode, version))

    // add binary data sequence to buffer
    data.write(buffer)
  })

  // Calculate required number of bits
  const totalCodewords = Utils.getSymbolTotalCodewords(version)
  const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel)
  const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8

  // Add a terminator.
  // If the bit string is shorter than the total number of required bits,
  // a terminator of up to four 0s must be added to the right side of the string.
  // If the bit string is more than four bits shorter than the required number of bits,
  // add four 0s to the end.
  if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) {
    buffer.put(0, 4)
  }

  // If the bit string is fewer than four bits shorter, add only the number of 0s that
  // are needed to reach the required number of bits.

  // After adding the terminator, if the number of bits in the string is not a multiple of 8,
  // pad the string on the right with 0s to make the string's length a multiple of 8.
  while (buffer.getLengthInBits() % 8 !== 0) {
    buffer.putBit(0)
  }

  // Add pad bytes if the string is still shorter than the total number of required bits.
  // Extend the buffer to fill the data capacity of the symbol corresponding to
  // the Version and Error Correction Level by adding the Pad Codewords 11101100 (0xEC)
  // and 00010001 (0x11) alternately.
  const remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8
  for (let i = 0; i < remainingByte; i++) {
    buffer.put(i % 2 ? 0x11 : 0xEC, 8)
  }

  return createCodewords(buffer, version, errorCorrectionLevel)
}

/**
 * Encode input data with Reed-Solomon and return codewords with
 * relative error correction bits
 *
 * @param  {BitBuffer} bitBuffer            Data to encode
 * @param  {Number}    version              QR Code version
 * @param  {ErrorCorrectionLevel} errorCorrectionLevel Error correction level
 * @return {Uint8Array}                     Buffer containing encoded codewords
 */
function createCodewords (bitBuffer, version, errorCorrectionLevel) {
  // Total codewords for this QR code version (Data + Error correction)
  const totalCodewords = Utils.getSymbolTotalCodewords(version)

  // Total number of error correction codewords
  const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel)

  // Total number of data codewords
  const dataTotalCodewords = totalCodewords - ecTotalCodewords

  // Total number of blocks
  const ecTotalBlocks = ECCode.getBlocksCount(version, errorCorrectionLevel)

  // Calculate how many blocks each group should contain
  const blocksInGroup2 = totalCodewords % ecTotalBlocks
  const blocksInGroup1 = ecTotalBlocks - blocksInGroup2

  const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks)

  const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks)
  const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1

  // Number of EC codewords is the same for both groups
  const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1

  // Initialize a Reed-Solomon encoder with a generator polynomial of degree ecCount
  const rs = new ReedSolomonEncoder(ecCount)

  let offset = 0
  const dcData = new Array(ecTotalBlocks)
  const ecData = new Array(ecTotalBlocks)
  let maxDataSize = 0
  const buffer = new Uint8Array(bitBuffer.buffer)

  // Divide the buffer into the required number of blocks
  for (let b = 0; b < ecTotalBlocks; b++) {
    const dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2

    // extract a block of data from buffer
    dcData[b] = buffer.slice(offset, offset + dataSize)

    // Calculate EC codewords for this data block
    ecData[b] = rs.encode(dcData[b])

    offset += dataSize
    maxDataSize = Math.max(maxDataSize, dataSize)
  }

  // Create final data
  // Interleave the data and error correction codewords from each block
  const data = new Uint8Array(totalCodewords)
  let index = 0
  let i, r

  // Add data codewords
  for (i = 0; i < maxDataSize; i++) {
    for (r = 0; r < ecTotalBlocks; r++) {
      if (i < dcData[r].length) {
        data[index++] = dcData[r][i]
      }
    }
  }

  // Apped EC codewords
  for (i = 0; i < ecCount; i++) {
    for (r = 0; r < ecTotalBlocks; r++) {
      data[index++] = ecData[r][i]
    }
  }

  return data
}

/**
 * Build QR Code symbol
 *
 * @param  {String} data                 Input string
 * @param  {Number} version              QR Code version
 * @param  {ErrorCorretionLevel} errorCorrectionLevel Error level
 * @param  {MaskPattern} maskPattern     Mask pattern
 * @return {Object}                      Object containing symbol data
 */
function createSymbol (data, version, errorCorrectionLevel, maskPattern) {
  let segments

  if (Array.isArray(data)) {
    segments = Segments.fromArray(data)
  } else if (typeof data === 'string') {
    let estimatedVersion = version

    if (!estimatedVersion) {
      const rawSegments = Segments.rawSplit(data)

      // Estimate best version that can contain raw splitted segments
      estimatedVersion = Version.getBestVersionForData(rawSegments, errorCorrectionLevel)
    }

    // Build optimized segments
    // If estimated version is undefined, try with the highest version
    segments = Segments.fromString(data, estimatedVersion || 40)
  } else {
    throw new Error('Invalid data')
  }

  // Get the min version that can contain data
  const bestVersion = Version.getBestVersionForData(segments, errorCorrectionLevel)

  // If no version is found, data cannot be stored
  if (!bestVersion) {
    throw new Error('The amount of data is too big to be stored in a QR Code')
  }

  // If not specified, use min version as default
  if (!version) {
    version = bestVersion

  // Check if the specified version can contain the data
  } else if (version < bestVersion) {
    throw new Error('\n' +
      'The chosen QR Code version cannot contain this amount of data.\n' +
      'Minimum version required to store current data is: ' + bestVersion + '.\n'
    )
  }

  const dataBits = createData(version, errorCorrectionLevel, segments)

  // Allocate matrix buffer
  const moduleCount = Utils.getSymbolSize(version)
  const modules = new BitMatrix(moduleCount)

  // Add function modules
  setupFinderPattern(modules, version)
  setupTimingPattern(modules)
  setupAlignmentPattern(modules, version)

  // Add temporary dummy bits for format info just to set them as reserved.
  // This is needed to prevent these bits from being masked by {@link MaskPattern.applyMask}
  // since the masking operation must be performed only on the encoding region.
  // These blocks will be replaced with correct values later in code.
  setupFormatInfo(modules, errorCorrectionLevel, 0)

  if (version >= 7) {
    setupVersionInfo(modules, version)
  }

  // Add data codewords
  setupData(modules, dataBits)

  if (isNaN(maskPattern)) {
    // Find best mask pattern
    maskPattern = MaskPattern.getBestMask(modules,
      setupFormatInfo.bind(null, modules, errorCorrectionLevel))
  }

  // Apply mask pattern
  MaskPattern.applyMask(maskPattern, modules)

  // Replace format info bits with correct values
  setupFormatInfo(modules, errorCorrectionLevel, maskPattern)

  return {
    modules: modules,
    version: version,
    errorCorrectionLevel: errorCorrectionLevel,
    maskPattern: maskPattern,
    segments: segments
  }
}

/**
 * QR Code
 *
 * @param {String | Array} data                 Input data
 * @param {Object} options                      Optional configurations
 * @param {Number} options.version              QR Code version
 * @param {String} options.errorCorrectionLevel Error correction level
 * @param {Function} options.toSJISFunc         Helper func to convert utf8 to sjis
 */
exports.create = function create (data, options) {
  if (typeof data === 'undefined' || data === '') {
    throw new Error('No input text')
  }

  let errorCorrectionLevel = ECLevel.M
  let version
  let mask

  if (typeof options !== 'undefined') {
    // Use higher error correction level as default
    errorCorrectionLevel = ECLevel.from(options.errorCorrectionLevel, ECLevel.M)
    version = Version.from(options.version)
    mask = MaskPattern.from(options.maskPattern)

    if (options.toSJISFunc) {
      Utils.setToSJISFunction(options.toSJISFunc)
    }
  }

  return createSymbol(data, version, errorCorrectionLevel, mask)
}

}, {"./utils":16,"./error-correction-level":17,"./bit-buffer":18,"./bit-matrix":19,"./alignment-pattern":20,"./finder-pattern":21,"./mask-pattern":22,"./error-correction-code":23,"./reed-solomon-encoder":24,"./version":27,"./format-info":31,"./mode":28,"./segments":32}, "/app/core/qrcode.js"];
__defs[16] = [function(module, exports, require, __filename, __dirname){
let toSJISFunction
const CODEWORDS_COUNT = [
  0, // Not used
  26, 44, 70, 100, 134, 172, 196, 242, 292, 346,
  404, 466, 532, 581, 655, 733, 815, 901, 991, 1085,
  1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921, 2051, 2185,
  2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706
]

/**
 * Returns the QR Code size for the specified version
 *
 * @param  {Number} version QR Code version
 * @return {Number}         size of QR code
 */
exports.getSymbolSize = function getSymbolSize (version) {
  if (!version) throw new Error('"version" cannot be null or undefined')
  if (version < 1 || version > 40) throw new Error('"version" should be in range from 1 to 40')
  return version * 4 + 17
}

/**
 * Returns the total number of codewords used to store data and EC information.
 *
 * @param  {Number} version QR Code version
 * @return {Number}         Data length in bits
 */
exports.getSymbolTotalCodewords = function getSymbolTotalCodewords (version) {
  return CODEWORDS_COUNT[version]
}

/**
 * Encode data with Bose-Chaudhuri-Hocquenghem
 *
 * @param  {Number} data Value to encode
 * @return {Number}      Encoded value
 */
exports.getBCHDigit = function (data) {
  let digit = 0

  while (data !== 0) {
    digit++
    data >>>= 1
  }

  return digit
}

exports.setToSJISFunction = function setToSJISFunction (f) {
  if (typeof f !== 'function') {
    throw new Error('"toSJISFunc" is not a valid function.')
  }

  toSJISFunction = f
}

exports.isKanjiModeEnabled = function () {
  return typeof toSJISFunction !== 'undefined'
}

exports.toSJIS = function toSJIS (kanji) {
  return toSJISFunction(kanji)
}

}, {}, "/app/core/utils.js"];
__defs[17] = [function(module, exports, require, __filename, __dirname){
exports.L = { bit: 1 }
exports.M = { bit: 0 }
exports.Q = { bit: 3 }
exports.H = { bit: 2 }

function fromString (string) {
  if (typeof string !== 'string') {
    throw new Error('Param is not a string')
  }

  const lcStr = string.toLowerCase()

  switch (lcStr) {
    case 'l':
    case 'low':
      return exports.L

    case 'm':
    case 'medium':
      return exports.M

    case 'q':
    case 'quartile':
      return exports.Q

    case 'h':
    case 'high':
      return exports.H

    default:
      throw new Error('Unknown EC Level: ' + string)
  }
}

exports.isValid = function isValid (level) {
  return level && typeof level.bit !== 'undefined' &&
    level.bit >= 0 && level.bit < 4
}

exports.from = function from (value, defaultValue) {
  if (exports.isValid(value)) {
    return value
  }

  try {
    return fromString(value)
  } catch (e) {
    return defaultValue
  }
}

}, {}, "/app/core/error-correction-level.js"];
__defs[18] = [function(module, exports, require, __filename, __dirname){
function BitBuffer () {
  this.buffer = []
  this.length = 0
}

BitBuffer.prototype = {

  get: function (index) {
    const bufIndex = Math.floor(index / 8)
    return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) === 1
  },

  put: function (num, length) {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1)
    }
  },

  getLengthInBits: function () {
    return this.length
  },

  putBit: function (bit) {
    const bufIndex = Math.floor(this.length / 8)
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0)
    }

    if (bit) {
      this.buffer[bufIndex] |= (0x80 >>> (this.length % 8))
    }

    this.length++
  }
}

module.exports = BitBuffer

}, {}, "/app/core/bit-buffer.js"];
__defs[19] = [function(module, exports, require, __filename, __dirname){
/**
 * Helper class to handle QR Code symbol modules
 *
 * @param {Number} size Symbol size
 */
function BitMatrix (size) {
  if (!size || size < 1) {
    throw new Error('BitMatrix size must be defined and greater than 0')
  }

  this.size = size
  this.data = new Uint8Array(size * size)
  this.reservedBit = new Uint8Array(size * size)
}

/**
 * Set bit value at specified location
 * If reserved flag is set, this bit will be ignored during masking process
 *
 * @param {Number}  row
 * @param {Number}  col
 * @param {Boolean} value
 * @param {Boolean} reserved
 */
BitMatrix.prototype.set = function (row, col, value, reserved) {
  const index = row * this.size + col
  this.data[index] = value
  if (reserved) this.reservedBit[index] = true
}

/**
 * Returns bit value at specified location
 *
 * @param  {Number}  row
 * @param  {Number}  col
 * @return {Boolean}
 */
BitMatrix.prototype.get = function (row, col) {
  return this.data[row * this.size + col]
}

/**
 * Applies xor operator at specified location
 * (used during masking process)
 *
 * @param {Number}  row
 * @param {Number}  col
 * @param {Boolean} value
 */
BitMatrix.prototype.xor = function (row, col, value) {
  this.data[row * this.size + col] ^= value
}

/**
 * Check if bit at specified location is reserved
 *
 * @param {Number}   row
 * @param {Number}   col
 * @return {Boolean}
 */
BitMatrix.prototype.isReserved = function (row, col) {
  return this.reservedBit[row * this.size + col]
}

module.exports = BitMatrix

}, {}, "/app/core/bit-matrix.js"];
__defs[20] = [function(module, exports, require, __filename, __dirname){
/**
 * Alignment pattern are fixed reference pattern in defined positions
 * in a matrix symbology, which enables the decode software to re-synchronise
 * the coordinate mapping of the image modules in the event of moderate amounts
 * of distortion of the image.
 *
 * Alignment patterns are present only in QR Code symbols of version 2 or larger
 * and their number depends on the symbol version.
 */

const getSymbolSize = require('./utils').getSymbolSize

/**
 * Calculate the row/column coordinates of the center module of each alignment pattern
 * for the specified QR Code version.
 *
 * The alignment patterns are positioned symmetrically on either side of the diagonal
 * running from the top left corner of the symbol to the bottom right corner.
 *
 * Since positions are simmetrical only half of the coordinates are returned.
 * Each item of the array will represent in turn the x and y coordinate.
 * @see {@link getPositions}
 *
 * @param  {Number} version QR Code version
 * @return {Array}          Array of coordinate
 */
exports.getRowColCoords = function getRowColCoords (version) {
  if (version === 1) return []

  const posCount = Math.floor(version / 7) + 2
  const size = getSymbolSize(version)
  const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2
  const positions = [size - 7] // Last coord is always (size - 7)

  for (let i = 1; i < posCount - 1; i++) {
    positions[i] = positions[i - 1] - intervals
  }

  positions.push(6) // First coord is always 6

  return positions.reverse()
}

/**
 * Returns an array containing the positions of each alignment pattern.
 * Each array's element represent the center point of the pattern as (x, y) coordinates
 *
 * Coordinates are calculated expanding the row/column coordinates returned by {@link getRowColCoords}
 * and filtering out the items that overlaps with finder pattern
 *
 * @example
 * For a Version 7 symbol {@link getRowColCoords} returns values 6, 22 and 38.
 * The alignment patterns, therefore, are to be centered on (row, column)
 * positions (6,22), (22,6), (22,22), (22,38), (38,22), (38,38).
 * Note that the coordinates (6,6), (6,38), (38,6) are occupied by finder patterns
 * and are not therefore used for alignment patterns.
 *
 * let pos = getPositions(7)
 * // [[6,22], [22,6], [22,22], [22,38], [38,22], [38,38]]
 *
 * @param  {Number} version QR Code version
 * @return {Array}          Array of coordinates
 */
exports.getPositions = function getPositions (version) {
  const coords = []
  const pos = exports.getRowColCoords(version)
  const posLength = pos.length

  for (let i = 0; i < posLength; i++) {
    for (let j = 0; j < posLength; j++) {
      // Skip if position is occupied by finder patterns
      if ((i === 0 && j === 0) || // top-left
          (i === 0 && j === posLength - 1) || // bottom-left
          (i === posLength - 1 && j === 0)) { // top-right
        continue
      }

      coords.push([pos[i], pos[j]])
    }
  }

  return coords
}

}, {"./utils":16}, "/app/core/alignment-pattern.js"];
__defs[21] = [function(module, exports, require, __filename, __dirname){
const getSymbolSize = require('./utils').getSymbolSize
const FINDER_PATTERN_SIZE = 7

/**
 * Returns an array containing the positions of each finder pattern.
 * Each array's element represent the top-left point of the pattern as (x, y) coordinates
 *
 * @param  {Number} version QR Code version
 * @return {Array}          Array of coordinates
 */
exports.getPositions = function getPositions (version) {
  const size = getSymbolSize(version)

  return [
    // top-left
    [0, 0],
    // top-right
    [size - FINDER_PATTERN_SIZE, 0],
    // bottom-left
    [0, size - FINDER_PATTERN_SIZE]
  ]
}

}, {"./utils":16}, "/app/core/finder-pattern.js"];
__defs[22] = [function(module, exports, require, __filename, __dirname){
/**
 * Data mask pattern reference
 * @type {Object}
 */
exports.Patterns = {
  PATTERN000: 0,
  PATTERN001: 1,
  PATTERN010: 2,
  PATTERN011: 3,
  PATTERN100: 4,
  PATTERN101: 5,
  PATTERN110: 6,
  PATTERN111: 7
}

/**
 * Weighted penalty scores for the undesirable features
 * @type {Object}
 */
const PenaltyScores = {
  N1: 3,
  N2: 3,
  N3: 40,
  N4: 10
}

/**
 * Check if mask pattern value is valid
 *
 * @param  {Number}  mask    Mask pattern
 * @return {Boolean}         true if valid, false otherwise
 */
exports.isValid = function isValid (mask) {
  return mask != null && mask !== '' && !isNaN(mask) && mask >= 0 && mask <= 7
}

/**
 * Returns mask pattern from a value.
 * If value is not valid, returns undefined
 *
 * @param  {Number|String} value        Mask pattern value
 * @return {Number}                     Valid mask pattern or undefined
 */
exports.from = function from (value) {
  return exports.isValid(value) ? parseInt(value, 10) : undefined
}

/**
* Find adjacent modules in row/column with the same color
* and assign a penalty value.
*
* Points: N1 + i
* i is the amount by which the number of adjacent modules of the same color exceeds 5
*/
exports.getPenaltyN1 = function getPenaltyN1 (data) {
  const size = data.size
  let points = 0
  let sameCountCol = 0
  let sameCountRow = 0
  let lastCol = null
  let lastRow = null

  for (let row = 0; row < size; row++) {
    sameCountCol = sameCountRow = 0
    lastCol = lastRow = null

    for (let col = 0; col < size; col++) {
      let module = data.get(row, col)
      if (module === lastCol) {
        sameCountCol++
      } else {
        if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5)
        lastCol = module
        sameCountCol = 1
      }

      module = data.get(col, row)
      if (module === lastRow) {
        sameCountRow++
      } else {
        if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5)
        lastRow = module
        sameCountRow = 1
      }
    }

    if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5)
    if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5)
  }

  return points
}

/**
 * Find 2x2 blocks with the same color and assign a penalty value
 *
 * Points: N2 * (m - 1) * (n - 1)
 */
exports.getPenaltyN2 = function getPenaltyN2 (data) {
  const size = data.size
  let points = 0

  for (let row = 0; row < size - 1; row++) {
    for (let col = 0; col < size - 1; col++) {
      const last = data.get(row, col) +
        data.get(row, col + 1) +
        data.get(row + 1, col) +
        data.get(row + 1, col + 1)

      if (last === 4 || last === 0) points++
    }
  }

  return points * PenaltyScores.N2
}

/**
 * Find 1:1:3:1:1 ratio (dark:light:dark:light:dark) pattern in row/column,
 * preceded or followed by light area 4 modules wide
 *
 * Points: N3 * number of pattern found
 */
exports.getPenaltyN3 = function getPenaltyN3 (data) {
  const size = data.size
  let points = 0
  let bitsCol = 0
  let bitsRow = 0

  for (let row = 0; row < size; row++) {
    bitsCol = bitsRow = 0
    for (let col = 0; col < size; col++) {
      bitsCol = ((bitsCol << 1) & 0x7FF) | data.get(row, col)
      if (col >= 10 && (bitsCol === 0x5D0 || bitsCol === 0x05D)) points++

      bitsRow = ((bitsRow << 1) & 0x7FF) | data.get(col, row)
      if (col >= 10 && (bitsRow === 0x5D0 || bitsRow === 0x05D)) points++
    }
  }

  return points * PenaltyScores.N3
}

/**
 * Calculate proportion of dark modules in entire symbol
 *
 * Points: N4 * k
 *
 * k is the rating of the deviation of the proportion of dark modules
 * in the symbol from 50% in steps of 5%
 */
exports.getPenaltyN4 = function getPenaltyN4 (data) {
  let darkCount = 0
  const modulesCount = data.data.length

  for (let i = 0; i < modulesCount; i++) darkCount += data.data[i]

  const k = Math.abs(Math.ceil((darkCount * 100 / modulesCount) / 5) - 10)

  return k * PenaltyScores.N4
}

/**
 * Return mask value at given position
 *
 * @param  {Number} maskPattern Pattern reference value
 * @param  {Number} i           Row
 * @param  {Number} j           Column
 * @return {Boolean}            Mask value
 */
function getMaskAt (maskPattern, i, j) {
  switch (maskPattern) {
    case exports.Patterns.PATTERN000: return (i + j) % 2 === 0
    case exports.Patterns.PATTERN001: return i % 2 === 0
    case exports.Patterns.PATTERN010: return j % 3 === 0
    case exports.Patterns.PATTERN011: return (i + j) % 3 === 0
    case exports.Patterns.PATTERN100: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0
    case exports.Patterns.PATTERN101: return (i * j) % 2 + (i * j) % 3 === 0
    case exports.Patterns.PATTERN110: return ((i * j) % 2 + (i * j) % 3) % 2 === 0
    case exports.Patterns.PATTERN111: return ((i * j) % 3 + (i + j) % 2) % 2 === 0

    default: throw new Error('bad maskPattern:' + maskPattern)
  }
}

/**
 * Apply a mask pattern to a BitMatrix
 *
 * @param  {Number}    pattern Pattern reference number
 * @param  {BitMatrix} data    BitMatrix data
 */
exports.applyMask = function applyMask (pattern, data) {
  const size = data.size

  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) {
      if (data.isReserved(row, col)) continue
      data.xor(row, col, getMaskAt(pattern, row, col))
    }
  }
}

/**
 * Returns the best mask pattern for data
 *
 * @param  {BitMatrix} data
 * @return {Number} Mask pattern reference number
 */
exports.getBestMask = function getBestMask (data, setupFormatFunc) {
  const numPatterns = Object.keys(exports.Patterns).length
  let bestPattern = 0
  let lowerPenalty = Infinity

  for (let p = 0; p < numPatterns; p++) {
    setupFormatFunc(p)
    exports.applyMask(p, data)

    // Calculate penalty
    const penalty =
      exports.getPenaltyN1(data) +
      exports.getPenaltyN2(data) +
      exports.getPenaltyN3(data) +
      exports.getPenaltyN4(data)

    // Undo previously applied mask
    exports.applyMask(p, data)

    if (penalty < lowerPenalty) {
      lowerPenalty = penalty
      bestPattern = p
    }
  }

  return bestPattern
}

}, {}, "/app/core/mask-pattern.js"];
__defs[23] = [function(module, exports, require, __filename, __dirname){
const ECLevel = require('./error-correction-level')

const EC_BLOCKS_TABLE = [
// L  M  Q  H
  1, 1, 1, 1,
  1, 1, 1, 1,
  1, 1, 2, 2,
  1, 2, 2, 4,
  1, 2, 4, 4,
  2, 4, 4, 4,
  2, 4, 6, 5,
  2, 4, 6, 6,
  2, 5, 8, 8,
  4, 5, 8, 8,
  4, 5, 8, 11,
  4, 8, 10, 11,
  4, 9, 12, 16,
  4, 9, 16, 16,
  6, 10, 12, 18,
  6, 10, 17, 16,
  6, 11, 16, 19,
  6, 13, 18, 21,
  7, 14, 21, 25,
  8, 16, 20, 25,
  8, 17, 23, 25,
  9, 17, 23, 34,
  9, 18, 25, 30,
  10, 20, 27, 32,
  12, 21, 29, 35,
  12, 23, 34, 37,
  12, 25, 34, 40,
  13, 26, 35, 42,
  14, 28, 38, 45,
  15, 29, 40, 48,
  16, 31, 43, 51,
  17, 33, 45, 54,
  18, 35, 48, 57,
  19, 37, 51, 60,
  19, 38, 53, 63,
  20, 40, 56, 66,
  21, 43, 59, 70,
  22, 45, 62, 74,
  24, 47, 65, 77,
  25, 49, 68, 81
]

const EC_CODEWORDS_TABLE = [
// L  M  Q  H
  7, 10, 13, 17,
  10, 16, 22, 28,
  15, 26, 36, 44,
  20, 36, 52, 64,
  26, 48, 72, 88,
  36, 64, 96, 112,
  40, 72, 108, 130,
  48, 88, 132, 156,
  60, 110, 160, 192,
  72, 130, 192, 224,
  80, 150, 224, 264,
  96, 176, 260, 308,
  104, 198, 288, 352,
  120, 216, 320, 384,
  132, 240, 360, 432,
  144, 280, 408, 480,
  168, 308, 448, 532,
  180, 338, 504, 588,
  196, 364, 546, 650,
  224, 416, 600, 700,
  224, 442, 644, 750,
  252, 476, 690, 816,
  270, 504, 750, 900,
  300, 560, 810, 960,
  312, 588, 870, 1050,
  336, 644, 952, 1110,
  360, 700, 1020, 1200,
  390, 728, 1050, 1260,
  420, 784, 1140, 1350,
  450, 812, 1200, 1440,
  480, 868, 1290, 1530,
  510, 924, 1350, 1620,
  540, 980, 1440, 1710,
  570, 1036, 1530, 1800,
  570, 1064, 1590, 1890,
  600, 1120, 1680, 1980,
  630, 1204, 1770, 2100,
  660, 1260, 1860, 2220,
  720, 1316, 1950, 2310,
  750, 1372, 2040, 2430
]

/**
 * Returns the number of error correction block that the QR Code should contain
 * for the specified version and error correction level.
 *
 * @param  {Number} version              QR Code version
 * @param  {Number} errorCorrectionLevel Error correction level
 * @return {Number}                      Number of error correction blocks
 */
exports.getBlocksCount = function getBlocksCount (version, errorCorrectionLevel) {
  switch (errorCorrectionLevel) {
    case ECLevel.L:
      return EC_BLOCKS_TABLE[(version - 1) * 4 + 0]
    case ECLevel.M:
      return EC_BLOCKS_TABLE[(version - 1) * 4 + 1]
    case ECLevel.Q:
      return EC_BLOCKS_TABLE[(version - 1) * 4 + 2]
    case ECLevel.H:
      return EC_BLOCKS_TABLE[(version - 1) * 4 + 3]
    default:
      return undefined
  }
}

/**
 * Returns the number of error correction codewords to use for the specified
 * version and error correction level.
 *
 * @param  {Number} version              QR Code version
 * @param  {Number} errorCorrectionLevel Error correction level
 * @return {Number}                      Number of error correction codewords
 */
exports.getTotalCodewordsCount = function getTotalCodewordsCount (version, errorCorrectionLevel) {
  switch (errorCorrectionLevel) {
    case ECLevel.L:
      return EC_CODEWORDS_TABLE[(version - 1) * 4 + 0]
    case ECLevel.M:
      return EC_CODEWORDS_TABLE[(version - 1) * 4 + 1]
    case ECLevel.Q:
      return EC_CODEWORDS_TABLE[(version - 1) * 4 + 2]
    case ECLevel.H:
      return EC_CODEWORDS_TABLE[(version - 1) * 4 + 3]
    default:
      return undefined
  }
}

}, {"./error-correction-level":17}, "/app/core/error-correction-code.js"];
__defs[24] = [function(module, exports, require, __filename, __dirname){
const Polynomial = require('./polynomial')

function ReedSolomonEncoder (degree) {
  this.genPoly = undefined
  this.degree = degree

  if (this.degree) this.initialize(this.degree)
}

/**
 * Initialize the encoder.
 * The input param should correspond to the number of error correction codewords.
 *
 * @param  {Number} degree
 */
ReedSolomonEncoder.prototype.initialize = function initialize (degree) {
  // create an irreducible generator polynomial
  this.degree = degree
  this.genPoly = Polynomial.generateECPolynomial(this.degree)
}

/**
 * Encodes a chunk of data
 *
 * @param  {Uint8Array} data Buffer containing input data
 * @return {Uint8Array}      Buffer containing encoded data
 */
ReedSolomonEncoder.prototype.encode = function encode (data) {
  if (!this.genPoly) {
    throw new Error('Encoder not initialized')
  }

  // Calculate EC for this data block
  // extends data size to data+genPoly size
  const paddedData = new Uint8Array(data.length + this.degree)
  paddedData.set(data)

  // The error correction codewords are the remainder after dividing the data codewords
  // by a generator polynomial
  const remainder = Polynomial.mod(paddedData, this.genPoly)

  // return EC data blocks (last n byte, where n is the degree of genPoly)
  // If coefficients number in remainder are less than genPoly degree,
  // pad with 0s to the left to reach the needed number of coefficients
  const start = this.degree - remainder.length
  if (start > 0) {
    const buff = new Uint8Array(this.degree)
    buff.set(remainder, start)

    return buff
  }

  return remainder
}

module.exports = ReedSolomonEncoder

}, {"./polynomial":25}, "/app/core/reed-solomon-encoder.js"];
__defs[25] = [function(module, exports, require, __filename, __dirname){
const GF = require('./galois-field')

/**
 * Multiplies two polynomials inside Galois Field
 *
 * @param  {Uint8Array} p1 Polynomial
 * @param  {Uint8Array} p2 Polynomial
 * @return {Uint8Array}    Product of p1 and p2
 */
exports.mul = function mul (p1, p2) {
  const coeff = new Uint8Array(p1.length + p2.length - 1)

  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      coeff[i + j] ^= GF.mul(p1[i], p2[j])
    }
  }

  return coeff
}

/**
 * Calculate the remainder of polynomials division
 *
 * @param  {Uint8Array} divident Polynomial
 * @param  {Uint8Array} divisor  Polynomial
 * @return {Uint8Array}          Remainder
 */
exports.mod = function mod (divident, divisor) {
  let result = new Uint8Array(divident)

  while ((result.length - divisor.length) >= 0) {
    const coeff = result[0]

    for (let i = 0; i < divisor.length; i++) {
      result[i] ^= GF.mul(divisor[i], coeff)
    }

    // remove all zeros from buffer head
    let offset = 0
    while (offset < result.length && result[offset] === 0) offset++
    result = result.slice(offset)
  }

  return result
}

/**
 * Generate an irreducible generator polynomial of specified degree
 * (used by Reed-Solomon encoder)
 *
 * @param  {Number} degree Degree of the generator polynomial
 * @return {Uint8Array}    Buffer containing polynomial coefficients
 */
exports.generateECPolynomial = function generateECPolynomial (degree) {
  let poly = new Uint8Array([1])
  for (let i = 0; i < degree; i++) {
    poly = exports.mul(poly, new Uint8Array([1, GF.exp(i)]))
  }

  return poly
}

}, {"./galois-field":26}, "/app/core/polynomial.js"];
__defs[26] = [function(module, exports, require, __filename, __dirname){
const EXP_TABLE = new Uint8Array(512)
const LOG_TABLE = new Uint8Array(256)
/**
 * Precompute the log and anti-log tables for faster computation later
 *
 * For each possible value in the galois field 2^8, we will pre-compute
 * the logarithm and anti-logarithm (exponential) of this value
 *
 * ref {@link https://en.wikiversity.org/wiki/Reed%E2%80%93Solomon_codes_for_coders#Introduction_to_mathematical_fields}
 */
;(function initTables () {
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x
    LOG_TABLE[x] = i

    x <<= 1 // multiply by 2

    // The QR code specification says to use byte-wise modulo 100011101 arithmetic.
    // This means that when a number is 256 or larger, it should be XORed with 0x11D.
    if (x & 0x100) { // similar to x >= 256, but a lot faster (because 0x100 == 256)
      x ^= 0x11D
    }
  }

  // Optimization: double the size of the anti-log table so that we don't need to mod 255 to
  // stay inside the bounds (because we will mainly use this table for the multiplication of
  // two GF numbers, no more).
  // @see {@link mul}
  for (let i = 255; i < 512; i++) {
    EXP_TABLE[i] = EXP_TABLE[i - 255]
  }
}())

/**
 * Returns log value of n inside Galois Field
 *
 * @param  {Number} n
 * @return {Number}
 */
exports.log = function log (n) {
  if (n < 1) throw new Error('log(' + n + ')')
  return LOG_TABLE[n]
}

/**
 * Returns anti-log value of n inside Galois Field
 *
 * @param  {Number} n
 * @return {Number}
 */
exports.exp = function exp (n) {
  return EXP_TABLE[n]
}

/**
 * Multiplies two number inside Galois Field
 *
 * @param  {Number} x
 * @param  {Number} y
 * @return {Number}
 */
exports.mul = function mul (x, y) {
  if (x === 0 || y === 0) return 0

  // should be EXP_TABLE[(LOG_TABLE[x] + LOG_TABLE[y]) % 255] if EXP_TABLE wasn't oversized
  // @see {@link initTables}
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]]
}

}, {}, "/app/core/galois-field.js"];
__defs[27] = [function(module, exports, require, __filename, __dirname){
const Utils = require('./utils')
const ECCode = require('./error-correction-code')
const ECLevel = require('./error-correction-level')
const Mode = require('./mode')
const VersionCheck = require('./version-check')

// Generator polynomial used to encode version information
const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0)
const G18_BCH = Utils.getBCHDigit(G18)

function getBestVersionForDataLength (mode, length, errorCorrectionLevel) {
  for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
    if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, mode)) {
      return currentVersion
    }
  }

  return undefined
}

function getReservedBitsCount (mode, version) {
  // Character count indicator + mode indicator bits
  return Mode.getCharCountIndicator(mode, version) + 4
}

function getTotalBitsFromDataArray (segments, version) {
  let totalBits = 0

  segments.forEach(function (data) {
    const reservedBits = getReservedBitsCount(data.mode, version)
    totalBits += reservedBits + data.getBitsLength()
  })

  return totalBits
}

function getBestVersionForMixedData (segments, errorCorrectionLevel) {
  for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
    const length = getTotalBitsFromDataArray(segments, currentVersion)
    if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, Mode.MIXED)) {
      return currentVersion
    }
  }

  return undefined
}

/**
 * Returns version number from a value.
 * If value is not a valid version, returns defaultValue
 *
 * @param  {Number|String} value        QR Code version
 * @param  {Number}        defaultValue Fallback value
 * @return {Number}                     QR Code version number
 */
exports.from = function from (value, defaultValue) {
  if (VersionCheck.isValid(value)) {
    return parseInt(value, 10)
  }

  return defaultValue
}

/**
 * Returns how much data can be stored with the specified QR code version
 * and error correction level
 *
 * @param  {Number} version              QR Code version (1-40)
 * @param  {Number} errorCorrectionLevel Error correction level
 * @param  {Mode}   mode                 Data mode
 * @return {Number}                      Quantity of storable data
 */
exports.getCapacity = function getCapacity (version, errorCorrectionLevel, mode) {
  if (!VersionCheck.isValid(version)) {
    throw new Error('Invalid QR Code version')
  }

  // Use Byte mode as default
  if (typeof mode === 'undefined') mode = Mode.BYTE

  // Total codewords for this QR code version (Data + Error correction)
  const totalCodewords = Utils.getSymbolTotalCodewords(version)

  // Total number of error correction codewords
  const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel)

  // Total number of data codewords
  const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8

  if (mode === Mode.MIXED) return dataTotalCodewordsBits

  const usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode, version)

  // Return max number of storable codewords
  switch (mode) {
    case Mode.NUMERIC:
      return Math.floor((usableBits / 10) * 3)

    case Mode.ALPHANUMERIC:
      return Math.floor((usableBits / 11) * 2)

    case Mode.KANJI:
      return Math.floor(usableBits / 13)

    case Mode.BYTE:
    default:
      return Math.floor(usableBits / 8)
  }
}

/**
 * Returns the minimum version needed to contain the amount of data
 *
 * @param  {Segment} data                    Segment of data
 * @param  {Number} [errorCorrectionLevel=H] Error correction level
 * @param  {Mode} mode                       Data mode
 * @return {Number}                          QR Code version
 */
exports.getBestVersionForData = function getBestVersionForData (data, errorCorrectionLevel) {
  let seg

  const ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M)

  if (Array.isArray(data)) {
    if (data.length > 1) {
      return getBestVersionForMixedData(data, ecl)
    }

    if (data.length === 0) {
      return 1
    }

    seg = data[0]
  } else {
    seg = data
  }

  return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl)
}

/**
 * Returns version information with relative error correction bits
 *
 * The version information is included in QR Code symbols of version 7 or larger.
 * It consists of an 18-bit sequence containing 6 data bits,
 * with 12 error correction bits calculated using the (18, 6) Golay code.
 *
 * @param  {Number} version QR Code version
 * @return {Number}         Encoded version info bits
 */
exports.getEncodedBits = function getEncodedBits (version) {
  if (!VersionCheck.isValid(version) || version < 7) {
    throw new Error('Invalid QR Code version')
  }

  let d = version << 12

  while (Utils.getBCHDigit(d) - G18_BCH >= 0) {
    d ^= (G18 << (Utils.getBCHDigit(d) - G18_BCH))
  }

  return (version << 12) | d
}

}, {"./utils":16,"./error-correction-code":23,"./error-correction-level":17,"./mode":28,"./version-check":29}, "/app/core/version.js"];
__defs[28] = [function(module, exports, require, __filename, __dirname){
const VersionCheck = require('./version-check')
const Regex = require('./regex')

/**
 * Numeric mode encodes data from the decimal digit set (0 - 9)
 * (byte values 30HEX to 39HEX).
 * Normally, 3 data characters are represented by 10 bits.
 *
 * @type {Object}
 */
exports.NUMERIC = {
  id: 'Numeric',
  bit: 1 << 0,
  ccBits: [10, 12, 14]
}

/**
 * Alphanumeric mode encodes data from a set of 45 characters,
 * i.e. 10 numeric digits (0 - 9),
 *      26 alphabetic characters (A - Z),
 *   and 9 symbols (SP, $, %, *, +, -, ., /, :).
 * Normally, two input characters are represented by 11 bits.
 *
 * @type {Object}
 */
exports.ALPHANUMERIC = {
  id: 'Alphanumeric',
  bit: 1 << 1,
  ccBits: [9, 11, 13]
}

/**
 * In byte mode, data is encoded at 8 bits per character.
 *
 * @type {Object}
 */
exports.BYTE = {
  id: 'Byte',
  bit: 1 << 2,
  ccBits: [8, 16, 16]
}

/**
 * The Kanji mode efficiently encodes Kanji characters in accordance with
 * the Shift JIS system based on JIS X 0208.
 * The Shift JIS values are shifted from the JIS X 0208 values.
 * JIS X 0208 gives details of the shift coded representation.
 * Each two-byte character value is compacted to a 13-bit binary codeword.
 *
 * @type {Object}
 */
exports.KANJI = {
  id: 'Kanji',
  bit: 1 << 3,
  ccBits: [8, 10, 12]
}

/**
 * Mixed mode will contain a sequences of data in a combination of any of
 * the modes described above
 *
 * @type {Object}
 */
exports.MIXED = {
  bit: -1
}

/**
 * Returns the number of bits needed to store the data length
 * according to QR Code specifications.
 *
 * @param  {Mode}   mode    Data mode
 * @param  {Number} version QR Code version
 * @return {Number}         Number of bits
 */
exports.getCharCountIndicator = function getCharCountIndicator (mode, version) {
  if (!mode.ccBits) throw new Error('Invalid mode: ' + mode)

  if (!VersionCheck.isValid(version)) {
    throw new Error('Invalid version: ' + version)
  }

  if (version >= 1 && version < 10) return mode.ccBits[0]
  else if (version < 27) return mode.ccBits[1]
  return mode.ccBits[2]
}

/**
 * Returns the most efficient mode to store the specified data
 *
 * @param  {String} dataStr Input data string
 * @return {Mode}           Best mode
 */
exports.getBestModeForData = function getBestModeForData (dataStr) {
  if (Regex.testNumeric(dataStr)) return exports.NUMERIC
  else if (Regex.testAlphanumeric(dataStr)) return exports.ALPHANUMERIC
  else if (Regex.testKanji(dataStr)) return exports.KANJI
  else return exports.BYTE
}

/**
 * Return mode name as string
 *
 * @param {Mode} mode Mode object
 * @returns {String}  Mode name
 */
exports.toString = function toString (mode) {
  if (mode && mode.id) return mode.id
  throw new Error('Invalid mode')
}

/**
 * Check if input param is a valid mode object
 *
 * @param   {Mode}    mode Mode object
 * @returns {Boolean} True if valid mode, false otherwise
 */
exports.isValid = function isValid (mode) {
  return mode && mode.bit && mode.ccBits
}

/**
 * Get mode object from its name
 *
 * @param   {String} string Mode name
 * @returns {Mode}          Mode object
 */
function fromString (string) {
  if (typeof string !== 'string') {
    throw new Error('Param is not a string')
  }

  const lcStr = string.toLowerCase()

  switch (lcStr) {
    case 'numeric':
      return exports.NUMERIC
    case 'alphanumeric':
      return exports.ALPHANUMERIC
    case 'kanji':
      return exports.KANJI
    case 'byte':
      return exports.BYTE
    default:
      throw new Error('Unknown mode: ' + string)
  }
}

/**
 * Returns mode from a value.
 * If value is not a valid mode, returns defaultValue
 *
 * @param  {Mode|String} value        Encoding mode
 * @param  {Mode}        defaultValue Fallback value
 * @return {Mode}                     Encoding mode
 */
exports.from = function from (value, defaultValue) {
  if (exports.isValid(value)) {
    return value
  }

  try {
    return fromString(value)
  } catch (e) {
    return defaultValue
  }
}

}, {"./version-check":29,"./regex":30}, "/app/core/mode.js"];
__defs[29] = [function(module, exports, require, __filename, __dirname){
/**
 * Check if QR Code version is valid
 *
 * @param  {Number}  version QR Code version
 * @return {Boolean}         true if valid version, false otherwise
 */
exports.isValid = function isValid (version) {
  return !isNaN(version) && version >= 1 && version <= 40
}

}, {}, "/app/core/version-check.js"];
__defs[30] = [function(module, exports, require, __filename, __dirname){
const numeric = '[0-9]+'
const alphanumeric = '[A-Z $%*+\\-./:]+'
let kanji = '(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|' +
  '[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|' +
  '[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|' +
  '[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+'
kanji = kanji.replace(/u/g, '\\u')

const byte = '(?:(?![A-Z0-9 $%*+\\-./:]|' + kanji + ')(?:.|[\r\n]))+'

exports.KANJI = new RegExp(kanji, 'g')
exports.BYTE_KANJI = new RegExp('[^A-Z0-9 $%*+\\-./:]+', 'g')
exports.BYTE = new RegExp(byte, 'g')
exports.NUMERIC = new RegExp(numeric, 'g')
exports.ALPHANUMERIC = new RegExp(alphanumeric, 'g')

const TEST_KANJI = new RegExp('^' + kanji + '$')
const TEST_NUMERIC = new RegExp('^' + numeric + '$')
const TEST_ALPHANUMERIC = new RegExp('^[A-Z0-9 $%*+\\-./:]+$')

exports.testKanji = function testKanji (str) {
  return TEST_KANJI.test(str)
}

exports.testNumeric = function testNumeric (str) {
  return TEST_NUMERIC.test(str)
}

exports.testAlphanumeric = function testAlphanumeric (str) {
  return TEST_ALPHANUMERIC.test(str)
}

}, {}, "/app/core/regex.js"];
__defs[31] = [function(module, exports, require, __filename, __dirname){
const Utils = require('./utils')

const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0)
const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1)
const G15_BCH = Utils.getBCHDigit(G15)

/**
 * Returns format information with relative error correction bits
 *
 * The format information is a 15-bit sequence containing 5 data bits,
 * with 10 error correction bits calculated using the (15, 5) BCH code.
 *
 * @param  {Number} errorCorrectionLevel Error correction level
 * @param  {Number} mask                 Mask pattern
 * @return {Number}                      Encoded format information bits
 */
exports.getEncodedBits = function getEncodedBits (errorCorrectionLevel, mask) {
  const data = ((errorCorrectionLevel.bit << 3) | mask)
  let d = data << 10

  while (Utils.getBCHDigit(d) - G15_BCH >= 0) {
    d ^= (G15 << (Utils.getBCHDigit(d) - G15_BCH))
  }

  // xor final data with mask pattern in order to ensure that
  // no combination of Error Correction Level and data mask pattern
  // will result in an all-zero data string
  return ((data << 10) | d) ^ G15_MASK
}

}, {"./utils":16}, "/app/core/format-info.js"];
__defs[32] = [function(module, exports, require, __filename, __dirname){
const Mode = require('./mode')
const NumericData = require('./numeric-data')
const AlphanumericData = require('./alphanumeric-data')
const ByteData = require('./byte-data')
const KanjiData = require('./kanji-data')
const Regex = require('./regex')
const Utils = require('./utils')
const dijkstra = require('dijkstrajs')

/**
 * Returns UTF8 byte length
 *
 * @param  {String} str Input string
 * @return {Number}     Number of byte
 */
function getStringByteLength (str) {
  return unescape(encodeURIComponent(str)).length
}

/**
 * Get a list of segments of the specified mode
 * from a string
 *
 * @param  {Mode}   mode Segment mode
 * @param  {String} str  String to process
 * @return {Array}       Array of object with segments data
 */
function getSegments (regex, mode, str) {
  const segments = []
  let result

  while ((result = regex.exec(str)) !== null) {
    segments.push({
      data: result[0],
      index: result.index,
      mode: mode,
      length: result[0].length
    })
  }

  return segments
}

/**
 * Extracts a series of segments with the appropriate
 * modes from a string
 *
 * @param  {String} dataStr Input string
 * @return {Array}          Array of object with segments data
 */
function getSegmentsFromString (dataStr) {
  const numSegs = getSegments(Regex.NUMERIC, Mode.NUMERIC, dataStr)
  const alphaNumSegs = getSegments(Regex.ALPHANUMERIC, Mode.ALPHANUMERIC, dataStr)
  let byteSegs
  let kanjiSegs

  if (Utils.isKanjiModeEnabled()) {
    byteSegs = getSegments(Regex.BYTE, Mode.BYTE, dataStr)
    kanjiSegs = getSegments(Regex.KANJI, Mode.KANJI, dataStr)
  } else {
    byteSegs = getSegments(Regex.BYTE_KANJI, Mode.BYTE, dataStr)
    kanjiSegs = []
  }

  const segs = numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs)

  return segs
    .sort(function (s1, s2) {
      return s1.index - s2.index
    })
    .map(function (obj) {
      return {
        data: obj.data,
        mode: obj.mode,
        length: obj.length
      }
    })
}

/**
 * Returns how many bits are needed to encode a string of
 * specified length with the specified mode
 *
 * @param  {Number} length String length
 * @param  {Mode} mode     Segment mode
 * @return {Number}        Bit length
 */
function getSegmentBitsLength (length, mode) {
  switch (mode) {
    case Mode.NUMERIC:
      return NumericData.getBitsLength(length)
    case Mode.ALPHANUMERIC:
      return AlphanumericData.getBitsLength(length)
    case Mode.KANJI:
      return KanjiData.getBitsLength(length)
    case Mode.BYTE:
      return ByteData.getBitsLength(length)
  }
}

/**
 * Merges adjacent segments which have the same mode
 *
 * @param  {Array} segs Array of object with segments data
 * @return {Array}      Array of object with segments data
 */
function mergeSegments (segs) {
  return segs.reduce(function (acc, curr) {
    const prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null
    if (prevSeg && prevSeg.mode === curr.mode) {
      acc[acc.length - 1].data += curr.data
      return acc
    }

    acc.push(curr)
    return acc
  }, [])
}

/**
 * Generates a list of all possible nodes combination which
 * will be used to build a segments graph.
 *
 * Nodes are divided by groups. Each group will contain a list of all the modes
 * in which is possible to encode the given text.
 *
 * For example the text '12345' can be encoded as Numeric, Alphanumeric or Byte.
 * The group for '12345' will contain then 3 objects, one for each
 * possible encoding mode.
 *
 * Each node represents a possible segment.
 *
 * @param  {Array} segs Array of object with segments data
 * @return {Array}      Array of object with segments data
 */
function buildNodes (segs) {
  const nodes = []
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]

    switch (seg.mode) {
      case Mode.NUMERIC:
        nodes.push([seg,
          { data: seg.data, mode: Mode.ALPHANUMERIC, length: seg.length },
          { data: seg.data, mode: Mode.BYTE, length: seg.length }
        ])
        break
      case Mode.ALPHANUMERIC:
        nodes.push([seg,
          { data: seg.data, mode: Mode.BYTE, length: seg.length }
        ])
        break
      case Mode.KANJI:
        nodes.push([seg,
          { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
        ])
        break
      case Mode.BYTE:
        nodes.push([
          { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
        ])
    }
  }

  return nodes
}

/**
 * Builds a graph from a list of nodes.
 * All segments in each node group will be connected with all the segments of
 * the next group and so on.
 *
 * At each connection will be assigned a weight depending on the
 * segment's byte length.
 *
 * @param  {Array} nodes    Array of object with segments data
 * @param  {Number} version QR Code version
 * @return {Object}         Graph of all possible segments
 */
function buildGraph (nodes, version) {
  const table = {}
  const graph = { start: {} }
  let prevNodeIds = ['start']

  for (let i = 0; i < nodes.length; i++) {
    const nodeGroup = nodes[i]
    const currentNodeIds = []

    for (let j = 0; j < nodeGroup.length; j++) {
      const node = nodeGroup[j]
      const key = '' + i + j

      currentNodeIds.push(key)
      table[key] = { node: node, lastCount: 0 }
      graph[key] = {}

      for (let n = 0; n < prevNodeIds.length; n++) {
        const prevNodeId = prevNodeIds[n]

        if (table[prevNodeId] && table[prevNodeId].node.mode === node.mode) {
          graph[prevNodeId][key] =
            getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) -
            getSegmentBitsLength(table[prevNodeId].lastCount, node.mode)

          table[prevNodeId].lastCount += node.length
        } else {
          if (table[prevNodeId]) table[prevNodeId].lastCount = node.length

          graph[prevNodeId][key] = getSegmentBitsLength(node.length, node.mode) +
            4 + Mode.getCharCountIndicator(node.mode, version) // switch cost
        }
      }
    }

    prevNodeIds = currentNodeIds
  }

  for (let n = 0; n < prevNodeIds.length; n++) {
    graph[prevNodeIds[n]].end = 0
  }

  return { map: graph, table: table }
}

/**
 * Builds a segment from a specified data and mode.
 * If a mode is not specified, the more suitable will be used.
 *
 * @param  {String} data             Input data
 * @param  {Mode | String} modesHint Data mode
 * @return {Segment}                 Segment
 */
function buildSingleSegment (data, modesHint) {
  let mode
  const bestMode = Mode.getBestModeForData(data)

  mode = Mode.from(modesHint, bestMode)

  // Make sure data can be encoded
  if (mode !== Mode.BYTE && mode.bit < bestMode.bit) {
    throw new Error('"' + data + '"' +
      ' cannot be encoded with mode ' + Mode.toString(mode) +
      '.\n Suggested mode is: ' + Mode.toString(bestMode))
  }

  // Use Mode.BYTE if Kanji support is disabled
  if (mode === Mode.KANJI && !Utils.isKanjiModeEnabled()) {
    mode = Mode.BYTE
  }

  switch (mode) {
    case Mode.NUMERIC:
      return new NumericData(data)

    case Mode.ALPHANUMERIC:
      return new AlphanumericData(data)

    case Mode.KANJI:
      return new KanjiData(data)

    case Mode.BYTE:
      return new ByteData(data)
  }
}

/**
 * Builds a list of segments from an array.
 * Array can contain Strings or Objects with segment's info.
 *
 * For each item which is a string, will be generated a segment with the given
 * string and the more appropriate encoding mode.
 *
 * For each item which is an object, will be generated a segment with the given
 * data and mode.
 * Objects must contain at least the property "data".
 * If property "mode" is not present, the more suitable mode will be used.
 *
 * @param  {Array} array Array of objects with segments data
 * @return {Array}       Array of Segments
 */
exports.fromArray = function fromArray (array) {
  return array.reduce(function (acc, seg) {
    if (typeof seg === 'string') {
      acc.push(buildSingleSegment(seg, null))
    } else if (seg.data) {
      acc.push(buildSingleSegment(seg.data, seg.mode))
    }

    return acc
  }, [])
}

/**
 * Builds an optimized sequence of segments from a string,
 * which will produce the shortest possible bitstream.
 *
 * @param  {String} data    Input string
 * @param  {Number} version QR Code version
 * @return {Array}          Array of segments
 */
exports.fromString = function fromString (data, version) {
  const segs = getSegmentsFromString(data, Utils.isKanjiModeEnabled())

  const nodes = buildNodes(segs)
  const graph = buildGraph(nodes, version)
  const path = dijkstra.find_path(graph.map, 'start', 'end')

  const optimizedSegs = []
  for (let i = 1; i < path.length - 1; i++) {
    optimizedSegs.push(graph.table[path[i]].node)
  }

  return exports.fromArray(mergeSegments(optimizedSegs))
}

/**
 * Splits a string in various segments with the modes which
 * best represent their content.
 * The produced segments are far from being optimized.
 * The output of this function is only used to estimate a QR Code version
 * which may contain the data.
 *
 * @param  {string} data Input string
 * @return {Array}       Array of segments
 */
exports.rawSplit = function rawSplit (data) {
  return exports.fromArray(
    getSegmentsFromString(data, Utils.isKanjiModeEnabled())
  )
}

}, {"./mode":28,"./numeric-data":33,"./alphanumeric-data":34,"./byte-data":35,"./kanji-data":36,"./regex":30,"./utils":16,"dijkstrajs":37}, "/app/core/segments.js"];
__defs[33] = [function(module, exports, require, __filename, __dirname){
const Mode = require('./mode')

function NumericData (data) {
  this.mode = Mode.NUMERIC
  this.data = data.toString()
}

NumericData.getBitsLength = function getBitsLength (length) {
  return 10 * Math.floor(length / 3) + ((length % 3) ? ((length % 3) * 3 + 1) : 0)
}

NumericData.prototype.getLength = function getLength () {
  return this.data.length
}

NumericData.prototype.getBitsLength = function getBitsLength () {
  return NumericData.getBitsLength(this.data.length)
}

NumericData.prototype.write = function write (bitBuffer) {
  let i, group, value

  // The input data string is divided into groups of three digits,
  // and each group is converted to its 10-bit binary equivalent.
  for (i = 0; i + 3 <= this.data.length; i += 3) {
    group = this.data.substr(i, 3)
    value = parseInt(group, 10)

    bitBuffer.put(value, 10)
  }

  // If the number of input digits is not an exact multiple of three,
  // the final one or two digits are converted to 4 or 7 bits respectively.
  const remainingNum = this.data.length - i
  if (remainingNum > 0) {
    group = this.data.substr(i)
    value = parseInt(group, 10)

    bitBuffer.put(value, remainingNum * 3 + 1)
  }
}

module.exports = NumericData

}, {"./mode":28}, "/app/core/numeric-data.js"];
__defs[34] = [function(module, exports, require, __filename, __dirname){
const Mode = require('./mode')

/**
 * Array of characters available in alphanumeric mode
 *
 * As per QR Code specification, to each character
 * is assigned a value from 0 to 44 which in this case coincides
 * with the array index
 *
 * @type {Array}
 */
const ALPHA_NUM_CHARS = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  ' ', '$', '%', '*', '+', '-', '.', '/', ':'
]

function AlphanumericData (data) {
  this.mode = Mode.ALPHANUMERIC
  this.data = data
}

AlphanumericData.getBitsLength = function getBitsLength (length) {
  return 11 * Math.floor(length / 2) + 6 * (length % 2)
}

AlphanumericData.prototype.getLength = function getLength () {
  return this.data.length
}

AlphanumericData.prototype.getBitsLength = function getBitsLength () {
  return AlphanumericData.getBitsLength(this.data.length)
}

AlphanumericData.prototype.write = function write (bitBuffer) {
  let i

  // Input data characters are divided into groups of two characters
  // and encoded as 11-bit binary codes.
  for (i = 0; i + 2 <= this.data.length; i += 2) {
    // The character value of the first character is multiplied by 45
    let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45

    // The character value of the second digit is added to the product
    value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1])

    // The sum is then stored as 11-bit binary number
    bitBuffer.put(value, 11)
  }

  // If the number of input data characters is not a multiple of two,
  // the character value of the final character is encoded as a 6-bit binary number.
  if (this.data.length % 2) {
    bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6)
  }
}

module.exports = AlphanumericData

}, {"./mode":28}, "/app/core/alphanumeric-data.js"];
__defs[35] = [function(module, exports, require, __filename, __dirname){
const Mode = require('./mode')

function ByteData (data) {
  this.mode = Mode.BYTE
  if (typeof (data) === 'string') {
    this.data = new TextEncoder().encode(data)
  } else {
    this.data = new Uint8Array(data)
  }
}

ByteData.getBitsLength = function getBitsLength (length) {
  return length * 8
}

ByteData.prototype.getLength = function getLength () {
  return this.data.length
}

ByteData.prototype.getBitsLength = function getBitsLength () {
  return ByteData.getBitsLength(this.data.length)
}

ByteData.prototype.write = function (bitBuffer) {
  for (let i = 0, l = this.data.length; i < l; i++) {
    bitBuffer.put(this.data[i], 8)
  }
}

module.exports = ByteData

}, {"./mode":28}, "/app/core/byte-data.js"];
__defs[36] = [function(module, exports, require, __filename, __dirname){
const Mode = require('./mode')
const Utils = require('./utils')

function KanjiData (data) {
  this.mode = Mode.KANJI
  this.data = data
}

KanjiData.getBitsLength = function getBitsLength (length) {
  return length * 13
}

KanjiData.prototype.getLength = function getLength () {
  return this.data.length
}

KanjiData.prototype.getBitsLength = function getBitsLength () {
  return KanjiData.getBitsLength(this.data.length)
}

KanjiData.prototype.write = function (bitBuffer) {
  let i

  // In the Shift JIS system, Kanji characters are represented by a two byte combination.
  // These byte values are shifted from the JIS X 0208 values.
  // JIS X 0208 gives details of the shift coded representation.
  for (i = 0; i < this.data.length; i++) {
    let value = Utils.toSJIS(this.data[i])

    // For characters with Shift JIS values from 0x8140 to 0x9FFC:
    if (value >= 0x8140 && value <= 0x9FFC) {
      // Subtract 0x8140 from Shift JIS value
      value -= 0x8140

    // For characters with Shift JIS values from 0xE040 to 0xEBBF
    } else if (value >= 0xE040 && value <= 0xEBBF) {
      // Subtract 0xC140 from Shift JIS value
      value -= 0xC140
    } else {
      throw new Error(
        'Invalid SJIS character: ' + this.data[i] + '\n' +
        'Make sure your charset is UTF-8')
    }

    // Multiply most significant byte of result by 0xC0
    // and add least significant byte to product
    value = (((value >>> 8) & 0xff) * 0xC0) + (value & 0xff)

    // Convert result to a 13-bit binary string
    bitBuffer.put(value, 13)
  }
}

module.exports = KanjiData

}, {"./mode":28,"./utils":16}, "/app/core/kanji-data.js"];
__defs[37] = [function(module, exports, require, __filename, __dirname){
'use strict';

/******************************************************************************
 * Created 2008-08-19.
 *
 * Dijkstra path-finding functions. Adapted from the Dijkstar Python project.
 *
 * Copyright (C) 2008
 *   Wyatt Baldwin <self@wyattbaldwin.com>
 *   All rights reserved
 *
 * Licensed under the MIT license.
 *
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *****************************************************************************/
var dijkstra = {
  single_source_shortest_paths: function(graph, s, d) {
    // Predecessor map for each node that has been encountered.
    // node ID => predecessor node ID
    var predecessors = {};

    // Costs of shortest paths from s to all nodes encountered.
    // node ID => cost
    var costs = {};
    costs[s] = 0;

    // Costs of shortest paths from s to all nodes encountered; differs from
    // `costs` in that it provides easy access to the node that currently has
    // the known shortest path from s.
    // XXX: Do we actually need both `costs` and `open`?
    var open = dijkstra.PriorityQueue.make();
    open.push(s, 0);

    var closest,
        u, v,
        cost_of_s_to_u,
        adjacent_nodes,
        cost_of_e,
        cost_of_s_to_u_plus_cost_of_e,
        cost_of_s_to_v,
        first_visit;
    while (!open.empty()) {
      // In the nodes remaining in graph that have a known cost from s,
      // find the node, u, that currently has the shortest path from s.
      closest = open.pop();
      u = closest.value;
      cost_of_s_to_u = closest.cost;

      // Get nodes adjacent to u...
      adjacent_nodes = graph[u] || {};

      // ...and explore the edges that connect u to those nodes, updating
      // the cost of the shortest paths to any or all of those nodes as
      // necessary. v is the node across the current edge from u.
      for (v in adjacent_nodes) {
        if (adjacent_nodes.hasOwnProperty(v)) {
          // Get the cost of the edge running from u to v.
          cost_of_e = adjacent_nodes[v];

          // Cost of s to u plus the cost of u to v across e--this is *a*
          // cost from s to v that may or may not be less than the current
          // known cost to v.
          cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;

          // If we haven't visited v yet OR if the current known cost from s to
          // v is greater than the new cost we just found (cost of s to u plus
          // cost of u to v across e), update v's cost in the cost list and
          // update v's predecessor in the predecessor list (it's now u).
          cost_of_s_to_v = costs[v];
          first_visit = (typeof costs[v] === 'undefined');
          if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
            costs[v] = cost_of_s_to_u_plus_cost_of_e;
            open.push(v, cost_of_s_to_u_plus_cost_of_e);
            predecessors[v] = u;
          }
        }
      }
    }

    if (typeof d !== 'undefined' && typeof costs[d] === 'undefined') {
      var msg = ['Could not find a path from ', s, ' to ', d, '.'].join('');
      throw new Error(msg);
    }

    return predecessors;
  },

  extract_shortest_path_from_predecessor_list: function(predecessors, d) {
    var nodes = [];
    var u = d;
    var predecessor;
    while (u) {
      nodes.push(u);
      predecessor = predecessors[u];
      u = predecessors[u];
    }
    nodes.reverse();
    return nodes;
  },

  find_path: function(graph, s, d) {
    var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
    return dijkstra.extract_shortest_path_from_predecessor_list(
      predecessors, d);
  },

  /**
   * A very naive priority queue implementation.
   */
  PriorityQueue: {
    make: function (opts) {
      var T = dijkstra.PriorityQueue,
          t = {},
          key;
      opts = opts || {};
      for (key in T) {
        if (T.hasOwnProperty(key)) {
          t[key] = T[key];
        }
      }
      t.queue = [];
      t.sorter = opts.sorter || T.default_sorter;
      return t;
    },

    default_sorter: function (a, b) {
      return a.cost - b.cost;
    },

    /**
     * Add a new item to the queue and ensure the highest priority element
     * is at the front of the queue.
     */
    push: function (value, cost) {
      var item = {value: value, cost: cost};
      this.queue.push(item);
      this.queue.sort(this.sorter);
    },

    /**
     * Return the highest priority element in the queue.
     */
    pop: function () {
      return this.queue.shift();
    },

    empty: function () {
      return this.queue.length === 0;
    }
  }
};


// node.js module exports
if (typeof module !== 'undefined') {
  module.exports = dijkstra;
}

}, {}, "/app/dijkstrajs/dijkstra.js"];
__defs[38] = [function(module, exports, require, __filename, __dirname){
const Utils = require('./utils')

function clearCanvas (ctx, canvas, size) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (!canvas.style) canvas.style = {}
  canvas.height = size
  canvas.width = size
  canvas.style.height = size + 'px'
  canvas.style.width = size + 'px'
}

function getCanvasElement () {
  try {
    return document.createElement('canvas')
  } catch (e) {
    throw new Error('You need to specify a canvas element')
  }
}

exports.render = function render (qrData, canvas, options) {
  let opts = options
  let canvasEl = canvas

  if (typeof opts === 'undefined' && (!canvas || !canvas.getContext)) {
    opts = canvas
    canvas = undefined
  }

  if (!canvas) {
    canvasEl = getCanvasElement()
  }

  opts = Utils.getOptions(opts)
  const size = Utils.getImageWidth(qrData.modules.size, opts)

  const ctx = canvasEl.getContext('2d')
  const image = ctx.createImageData(size, size)
  Utils.qrToImageData(image.data, qrData, opts)

  clearCanvas(ctx, canvasEl, size)
  ctx.putImageData(image, 0, 0)

  return canvasEl
}

exports.renderToDataURL = function renderToDataURL (qrData, canvas, options) {
  let opts = options

  if (typeof opts === 'undefined' && (!canvas || !canvas.getContext)) {
    opts = canvas
    canvas = undefined
  }

  if (!opts) opts = {}

  const canvasEl = exports.render(qrData, canvas, opts)

  const type = opts.type || 'image/png'
  const rendererOpts = opts.rendererOpts || {}

  return canvasEl.toDataURL(type, rendererOpts.quality)
}

}, {"./utils":39}, "/app/renderer/canvas.js"];
__defs[39] = [function(module, exports, require, __filename, __dirname){
function hex2rgba (hex) {
  if (typeof hex === 'number') {
    hex = hex.toString()
  }

  if (typeof hex !== 'string') {
    throw new Error('Color should be defined as hex string')
  }

  let hexCode = hex.slice().replace('#', '').split('')
  if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8) {
    throw new Error('Invalid hex color: ' + hex)
  }

  // Convert from short to long form (fff -> ffffff)
  if (hexCode.length === 3 || hexCode.length === 4) {
    hexCode = Array.prototype.concat.apply([], hexCode.map(function (c) {
      return [c, c]
    }))
  }

  // Add default alpha value
  if (hexCode.length === 6) hexCode.push('F', 'F')

  const hexValue = parseInt(hexCode.join(''), 16)

  return {
    r: (hexValue >> 24) & 255,
    g: (hexValue >> 16) & 255,
    b: (hexValue >> 8) & 255,
    a: hexValue & 255,
    hex: '#' + hexCode.slice(0, 6).join('')
  }
}

exports.getOptions = function getOptions (options) {
  if (!options) options = {}
  if (!options.color) options.color = {}

  const margin = typeof options.margin === 'undefined' ||
    options.margin === null ||
    options.margin < 0
    ? 4
    : options.margin

  const width = options.width && options.width >= 21 ? options.width : undefined
  const scale = options.scale || 4

  return {
    width: width,
    scale: width ? 4 : scale,
    margin: margin,
    color: {
      dark: hex2rgba(options.color.dark || '#000000ff'),
      light: hex2rgba(options.color.light || '#ffffffff')
    },
    type: options.type,
    rendererOpts: options.rendererOpts || {}
  }
}

exports.getScale = function getScale (qrSize, opts) {
  return opts.width && opts.width >= qrSize + opts.margin * 2
    ? opts.width / (qrSize + opts.margin * 2)
    : opts.scale
}

exports.getImageWidth = function getImageWidth (qrSize, opts) {
  const scale = exports.getScale(qrSize, opts)
  return Math.floor((qrSize + opts.margin * 2) * scale)
}

exports.qrToImageData = function qrToImageData (imgData, qr, opts) {
  const size = qr.modules.size
  const data = qr.modules.data
  const scale = exports.getScale(size, opts)
  const symbolSize = Math.floor((size + opts.margin * 2) * scale)
  const scaledMargin = opts.margin * scale
  const palette = [opts.color.light, opts.color.dark]

  for (let i = 0; i < symbolSize; i++) {
    for (let j = 0; j < symbolSize; j++) {
      let posDst = (i * symbolSize + j) * 4
      let pxColor = opts.color.light

      if (i >= scaledMargin && j >= scaledMargin &&
        i < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
        const iSrc = Math.floor((i - scaledMargin) / scale)
        const jSrc = Math.floor((j - scaledMargin) / scale)
        pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0]
      }

      imgData[posDst++] = pxColor.r
      imgData[posDst++] = pxColor.g
      imgData[posDst++] = pxColor.b
      imgData[posDst] = pxColor.a
    }
  }
}

}, {}, "/app/renderer/utils.js"];
__defs[40] = [function(module, exports, require, __filename, __dirname){
const Utils = require('./utils')

function getColorAttrib (color, attrib) {
  const alpha = color.a / 255
  const str = attrib + '="' + color.hex + '"'

  return alpha < 1
    ? str + ' ' + attrib + '-opacity="' + alpha.toFixed(2).slice(1) + '"'
    : str
}

function svgCmd (cmd, x, y) {
  let str = cmd + x
  if (typeof y !== 'undefined') str += ' ' + y

  return str
}

function qrToPath (data, size, margin) {
  let path = ''
  let moveBy = 0
  let newRow = false
  let lineLength = 0

  for (let i = 0; i < data.length; i++) {
    const col = Math.floor(i % size)
    const row = Math.floor(i / size)

    if (!col && !newRow) newRow = true

    if (data[i]) {
      lineLength++

      if (!(i > 0 && col > 0 && data[i - 1])) {
        path += newRow
          ? svgCmd('M', col + margin, 0.5 + row + margin)
          : svgCmd('m', moveBy, 0)

        moveBy = 0
        newRow = false
      }

      if (!(col + 1 < size && data[i + 1])) {
        path += svgCmd('h', lineLength)
        lineLength = 0
      }
    } else {
      moveBy++
    }
  }

  return path
}

exports.render = function render (qrData, options, cb) {
  const opts = Utils.getOptions(options)
  const size = qrData.modules.size
  const data = qrData.modules.data
  const qrcodesize = size + opts.margin * 2

  const bg = !opts.color.light.a
    ? ''
    : '<path ' + getColorAttrib(opts.color.light, 'fill') +
      ' d="M0 0h' + qrcodesize + 'v' + qrcodesize + 'H0z"/>'

  const path =
    '<path ' + getColorAttrib(opts.color.dark, 'stroke') +
    ' d="' + qrToPath(data, size, opts.margin) + '"/>'

  const viewBox = 'viewBox="' + '0 0 ' + qrcodesize + ' ' + qrcodesize + '"'

  const width = !opts.width ? '' : 'width="' + opts.width + '" height="' + opts.width + '" '

  const svgTag = '<svg xmlns="http://www.w3.org/2000/svg" ' + width + viewBox + ' shape-rendering="crispEdges">' + bg + path + '</svg>\n'

  if (typeof cb === 'function') {
    cb(null, svgTag)
  }

  return svgTag
}

}, {"./utils":39}, "/app/renderer/svg-tag.js"];
__defs[41] = [function(module, exports, require, __filename, __dirname){
// nodemailer для Android-версии: «своя почта» (SMTP) отправляется нативным модулем SmtpMailer
// (JavaMail). Рабочая почта Loya (по умолчанию) идёт через сервер Loya и этот модуль не использует.
'use strict';
const { Buffer } = require('buffer');
function createTransport(cfg) {
  return {
    async sendMail(opts) {
      const P = globalThis.Capacitor && globalThis.Capacitor.Plugins && globalThis.Capacitor.Plugins.SmtpMailer;
      if (!P) throw new Error('smtp_not_available');
      const att = (opts.attachments || [])[0];
      const fromName = String(opts.from || '').replace(/<[^>]*>/, '').replace(/"/g, '').trim();
      await P.sendMail({
        host: cfg.host, port: Number(cfg.port) || 587, secure: !!cfg.secure, user: cfg.auth && cfg.auth.user, pass: cfg.auth && cfg.auth.pass,
        fromName, to: Array.isArray(opts.to) ? opts.to[0] : opts.to, subject: opts.subject || '', html: opts.html || opts.text || '',
        ...(att ? { attachmentBase64: Buffer.isBuffer(att.content) ? att.content.toString('base64') : Buffer.from(String(att.content || '')).toString('base64'),
          attachmentName: att.filename || 'file', attachmentMime: att.contentType || 'image/png', attachmentCid: att.cid || undefined } : {})
      });
      return { accepted: [opts.to] };
    },
    verify: async () => true, close() {}
  };
}
module.exports = { createTransport };

}, {"buffer":1}, "/app/shims/nodemailer.js"];
__defs[42] = [function(module, exports, require, __filename, __dirname){
// db.js — локальная база данных на sql.js (SQLite, компилированный в WebAssembly).
// Никаких серверов: файл базы данных лежит в папке data рядом с приложением.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const initSqlJs = require('sql.js');

// Пробный режим (пока не введён рабочий ключ подписки): лимиты на клиентов, карты и товары.
// Лимит на создание клиентов и карт сообщаем исключением — эти методы возвращают номер, и по ошибке
// его не перепутать с результатом; на границах программы (IPC, телефон, регистрация) её ловят.
class FreeLimitError extends Error {
  constructor(limit) { super('free_limit:' + limit); this.code = 'FREE_LIMIT'; this.limit = limit; }
}

class Database {
  // Имя клиента — обычный текст: без угловых скобок и переводов строк (оно попадает в письма и сообщения).
  static cleanName(v) { return String(v == null ? '' : v).replace(/[<>\r\n\t]/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 120); }
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.limits = null;   // null — полный режим; { clients, cards, products } — пробный
  }

  // ===================== Pro: синхронизация между компьютерами =====================
  // Всё сохраняется сразу в этой базе. Триггеры отмечают изменённые записи в sync_dirty; раз в пару минут
  // программа отправляет их пачкой. У каждой отправки свой номер операции (op): если ответ потерялся,
  // повторяется ТА ЖЕ отправка, и сервер её второй раз не применяет. sync_shadow — последняя версия записи,
  // которую подтвердил сервер: от неё считаем, что поменялось у нас, и сливаем счётчики при конфликте.
  _syncMigrate() {
    for (const t of ['clients', 'cards', 'scan_history', 'appointments']) {
      try { this.db.run(`ALTER TABLE ${t} ADD COLUMN uid TEXT`); } catch (e) { /* уже есть */ }
      this.db.run(`UPDATE ${t} SET uid = lower(hex(randomblob(16))) WHERE uid IS NULL`);
      this.db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_${t}_uid ON ${t}(uid)`);
    }
    this.db.run(`CREATE TABLE IF NOT EXISTS sync_ctl (id INTEGER PRIMARY KEY CHECK (id = 1), enabled INTEGER DEFAULT 0, applying INTEGER DEFAULT 0, cursor INTEGER DEFAULT 0)`);
    this.db.run(`INSERT OR IGNORE INTO sync_ctl (id) VALUES (1)`);
    this.db.run(`UPDATE sync_ctl SET applying = 0`);
    this.db.run(`CREATE TABLE IF NOT EXISTS sync_dirty (entity TEXT NOT NULL, uid TEXT NOT NULL, deleted INTEGER DEFAULT 0, op TEXT, op_base INTEGER, op_data TEXT, changed_at TEXT, PRIMARY KEY (entity, uid))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS sync_shadow (entity TEXT NOT NULL, uid TEXT NOT NULL, ver INTEGER NOT NULL, data TEXT, PRIMARY KEY (entity, uid))`);
    const map = { clients: 'client', cards: 'card', scan_history: 'scan', appointments: 'appt' };
    const on = `(SELECT enabled FROM sync_ctl WHERE id = 1) = 1 AND (SELECT applying FROM sync_ctl WHERE id = 1) = 0`;
    for (const [t, e] of Object.entries(map)) {
      this.db.run(`CREATE TRIGGER IF NOT EXISTS trg_${t}_uid AFTER INSERT ON ${t} WHEN NEW.uid IS NULL BEGIN UPDATE ${t} SET uid = lower(hex(randomblob(16))) WHERE id = NEW.id; END`);
      this.db.run(`CREATE TRIGGER IF NOT EXISTS trg_${t}_ins AFTER INSERT ON ${t} WHEN NEW.uid IS NOT NULL AND ${on} BEGIN INSERT INTO sync_dirty (entity, uid, deleted, changed_at) VALUES ('${e}', NEW.uid, 0, datetime('now')) ON CONFLICT(entity, uid) DO UPDATE SET deleted = 0, changed_at = excluded.changed_at; END`);
      this.db.run(`CREATE TRIGGER IF NOT EXISTS trg_${t}_upd AFTER UPDATE ON ${t} WHEN NEW.uid IS NOT NULL AND ${on} BEGIN INSERT INTO sync_dirty (entity, uid, deleted, changed_at) VALUES ('${e}', NEW.uid, 0, datetime('now')) ON CONFLICT(entity, uid) DO UPDATE SET deleted = 0, changed_at = excluded.changed_at; END`);
      this.db.run(`CREATE TRIGGER IF NOT EXISTS trg_${t}_del AFTER DELETE ON ${t} WHEN OLD.uid IS NOT NULL AND ${on} BEGIN INSERT INTO sync_dirty (entity, uid, deleted, changed_at) VALUES ('${e}', OLD.uid, 1, datetime('now')) ON CONFLICT(entity, uid) DO UPDATE SET deleted = 1, changed_at = excluded.changed_at; END`);
    }
  }
  static get SYNC() {
    return {
      client: { table: 'clients', counters: ['lifetime_purchases', 'lifetime_rewards'],
        fields: ['name', 'email', 'phone', 'birthday', 'notes', 'preferred_language', 'nameday_last_sent', 'lifetime_purchases', 'lifetime_rewards', 'marketing_consent', 'created_at', 'consent_email', 'consent_telegram', 'consent_source', 'consent_at', 'do_not_contact', 'unsubscribed_at', 'telegram_chat_id', 'telegram_link_code', 'ref_code', 'ref_reward_done', 'fb_last_at'] },
      card: { table: 'cards', counters: ['stamp_count', 'redeemed_count', 'spend_accumulated', 'bonus_balance', 'gift_balance'],
        fields: ['type', 'title', 'discount_percent', 'stamp_target', 'stamp_count', 'redeemed_count', 'code', 'created_at', 'expires_at', 'single_use', 'source', 'spend_accumulated', 'spend_bonus_text', 'spend_target', 'wallet_linked', 'bonus_balance', 'spend_bonus_points', 'gift_amount', 'gift_balance'] },
      scan: { table: 'scan_history', counters: [], fields: ['result', 'stamp_count_at', 'created_at', 'amount_spent', 'source'] },
      // 2.20: записи (онлайн и из программы) — общие для всех компьютеров бизнеса
      appt: { table: 'appointments', counters: [], fields: ['server_id', 'token', 'name', 'phone', 'email', 'lang', 'service_id', 'service_name', 'price', 'staff_id', 'staff_name', 'date', 'start_min', 'dur', 'status', 'source', 'note', 'reminded', 'server_dirty', 'created_at', 'updated_at'] }
    };
  }
  _cols(table) { if (!this._colCache) this._colCache = {}; if (!this._colCache[table]) this._colCache[table] = this.all(`PRAGMA table_info(${table})`).map(c => c.name); return this._colCache[table]; }
  _syncSerialize(entity, uid) {
    const def = Database.SYNC[entity]; const row = this.get(`SELECT * FROM ${def.table} WHERE uid = ?`, [uid]);
    if (!row) return null;
    const cols = this._cols(def.table); const data = {};
    for (const f of def.fields) if (cols.includes(f)) data[f] = row[f] === undefined ? null : row[f];
    if (entity === 'client') {
      const r = row.referred_by ? this.get(`SELECT uid FROM clients WHERE id = ?`, [row.referred_by]) : null; data.referred_by_uid = r ? r.uid : null;
      const l = row.location_id ? this.get(`SELECT name FROM locations WHERE id = ?`, [row.location_id]) : null; data.location = l ? l.name : null;   // где клиент зарегистрировался
    }
    if (entity === 'card' || entity === 'appt') { const c = row.client_id ? this.get(`SELECT uid FROM clients WHERE id = ?`, [row.client_id]) : null; data.client_uid = c ? c.uid : null; }
    if (entity === 'scan') {
      const c = this.get(`SELECT uid FROM clients WHERE id = ?`, [row.client_id]); const k = this.get(`SELECT uid FROM cards WHERE id = ?`, [row.card_id]);
      data.client_uid = c ? c.uid : null; data.card_uid = k ? k.uid : null;
      const l = row.location_id ? this.get(`SELECT name FROM locations WHERE id = ?`, [row.location_id]) : null; data.location = l ? l.name : null;
    }
    return data;
  }
  syncState() {
    const c = this.get(`SELECT enabled, cursor FROM sync_ctl WHERE id = 1`) || {};
    const p = this.get(`SELECT COUNT(*) AS n FROM sync_dirty`) || {};
    return { enabled: !!c.enabled, cursor: c.cursor || 0, pending: p.n || 0 };
  }
  syncEnable(on) { this.run(`UPDATE sync_ctl SET enabled = ? WHERE id = 1`, [on ? 1 : 0]); }
  syncSetCursor(v) { this.run(`UPDATE sync_ctl SET cursor = ? WHERE id = 1`, [Math.max(0, Number(v) || 0)]); }
  _applying(on) { this.db.run(`UPDATE sync_ctl SET applying = ${on ? 1 : 0} WHERE id = 1`); }
  // Первое подключение компьютера, у которого организация пустая: вся база уходит на сервер.
  syncMarkAll() {
    for (const [e, d] of Object.entries(Database.SYNC)) this.db.run(`INSERT INTO sync_dirty (entity, uid, deleted, changed_at) SELECT '${e}', uid, 0, datetime('now') FROM ${d.table} WHERE uid IS NOT NULL ON CONFLICT(entity, uid) DO NOTHING`);
  }
  // Заменить данные этого компьютера общей базой организации (после резервной копии — это делает программа).
  syncWipeLocal() {
    this._applying(true);
    try { this.db.run(`DELETE FROM scan_history`); this.db.run(`DELETE FROM cards`); this.db.run(`DELETE FROM appointments`); this.db.run(`DELETE FROM clients`); this.db.run(`DELETE FROM sync_dirty`); this.db.run(`DELETE FROM sync_shadow`); this.db.run(`UPDATE sync_ctl SET cursor = 0`); }
    finally { this._applying(false); }
  }
  // Собрать пачку на отправку. Уже отправленная, но не подтверждённая операция повторяется без изменений.
  syncCollect(max = 100) {
    const order = { client: 0, card: 1, scan: 2, appt: 3 };
    const rows = this.all(`SELECT * FROM sync_dirty`).sort((a, b) => order[a.entity] - order[b.entity] || String(a.changed_at).localeCompare(String(b.changed_at))).slice(0, max);
    const ops = [];
    for (const d of rows) {
      if (d.op) { ops.push({ op: d.op, entity: d.entity, uid: d.uid, base: d.op_base, data: JSON.parse(d.op_data) }); continue; }
      const data = d.deleted ? { deleted: true } : this._syncSerialize(d.entity, d.uid);
      if (!data) { this.run(`DELETE FROM sync_dirty WHERE entity = ? AND uid = ?`, [d.entity, d.uid]); continue; }
      const sh = this.get(`SELECT ver FROM sync_shadow WHERE entity = ? AND uid = ?`, [d.entity, d.uid]);
      const op = require('crypto').randomBytes(16).toString('hex');
      const base = sh ? sh.ver : 0;
      this.run(`UPDATE sync_dirty SET op = ?, op_base = ?, op_data = ? WHERE entity = ? AND uid = ?`, [op, base, JSON.stringify(data), d.entity, d.uid]);
      ops.push({ op, entity: d.entity, uid: d.uid, base, data });
    }
    return ops;
  }
  // Слияние при конфликте: счётчики складываем (сервер + наш прирост от общей точки), остальные поля —
  // наши, если мы их меняли, иначе — с сервера. Так два компьютера, пробившие штамп одной карте, не теряют ни одного.
  static syncMerge(entity, local, shadow, remote) {
    if (!remote) return local;
    if (remote.deleted) return remote;
    const def = Database.SYNC[entity]; const out = { ...remote };
    const S = shadow || {};
    for (const f of Object.keys(local || {})) {
      if (def.counters.includes(f)) out[f] = Math.max(0, Math.round(((Number(remote[f]) || 0) + (Number(local[f]) || 0) - (Number(S[f]) || 0)) * 100) / 100);
      else if (JSON.stringify(local[f]) !== JSON.stringify(S[f])) out[f] = local[f];
    }
    if (entity === 'card' && out.type === 'stamp' && Number(out.stamp_target) > 0 && out.stamp_count > out.stamp_target) out.stamp_count = Number(out.stamp_target);   // не больше цели: подарок ждёт
    return out;
  }
  // Записать состояние записи из общей базы в эту базу (без пометки «изменено у нас»).
  _syncWriteLocal(entity, uid, data) {
    const def = Database.SYNC[entity];
    let existing = this.get(`SELECT id FROM ${def.table} WHERE uid = ?`, [uid]);
    // 2.17, «Объединить базы»: тот же клиент уже есть здесь (тот же телефон или email) и ещё ни разу не был
    // в общей базе — не создаём дубль, а «узнаём» его: записи этого устройства станут его записями в общей базе.
    if (!existing && entity === 'client' && this._adoptByContact && data && !data.deleted) {
      const cand = this._adoptCandidate(data);
      if (cand) { this.run(`UPDATE clients SET uid = ? WHERE id = ?`, [uid, cand.id]); existing = { id: cand.id }; this._adopted = (this._adopted || 0) + 1; }
    }
    if (data && data.deleted) { if (existing) this.run(`DELETE FROM ${def.table} WHERE id = ?`, [existing.id]); return true; }
    const cols = this._cols(def.table); const vals = {};
    for (const f of def.fields) if (cols.includes(f) && f in data) vals[f] = data[f];
    if (entity === 'client') {
      if ('referred_by_uid' in data) { const r = data.referred_by_uid ? this.get(`SELECT id FROM clients WHERE uid = ?`, [data.referred_by_uid]) : null; vals.referred_by = r ? r.id : null; }
      if ('location' in data && cols.includes('location_id')) vals.location_id = data.location ? this.locationIdByName(data.location, true) : null;
    }
    if (entity === 'appt') { const c = data.client_uid ? this.get(`SELECT id FROM clients WHERE uid = ?`, [data.client_uid]) : null; if (data.client_uid && !c) return false; vals.client_id = c ? c.id : null; }
    if (entity === 'card' || entity === 'scan') {
      const c = data.client_uid ? this.get(`SELECT id FROM clients WHERE uid = ?`, [data.client_uid]) : null; if (!c) return false;   // клиент ещё не пришёл — позже
      vals.client_id = c.id;
    }
    if (entity === 'scan') {
      const k = data.card_uid ? this.get(`SELECT id FROM cards WHERE uid = ?`, [data.card_uid]) : null; if (!k) return false;
      vals.card_id = k.id;
      if (cols.includes('location_id')) vals.location_id = data.location ? this.locationIdByName(data.location, true) : null;
      // Визиты не меняются — кроме переноса к другому клиенту (объединение дублей, 2.18).
      if (existing) { this.run(`UPDATE scan_history SET client_id = ?, card_id = ? WHERE id = ?`, [vals.client_id, vals.card_id, existing.id]); return true; }
    }
    const keys = Object.keys(vals);
    if (existing) { if (keys.length) this.run(`UPDATE ${def.table} SET ${keys.map(k => k + ' = ?').join(', ')} WHERE id = ?`, [...keys.map(k => vals[k]), existing.id]); }
    else this.run(`INSERT INTO ${def.table} (uid, ${keys.join(', ')}) VALUES (?, ${keys.map(() => '?').join(', ')})`, [uid, ...keys.map(k => vals[k])]);
    return true;
  }
  _adoptCandidate(data) {
    const digits = (v) => String(v || '').replace(/\D/g, '');
    const ph = digits(data.phone), em = String(data.email || '').trim().toLowerCase();
    const free = (r) => r && !this.get(`SELECT 1 FROM sync_shadow WHERE entity = 'client' AND uid = ?`, [r.uid]);
    if (ph.length >= 7) {
      const tail = ph.slice(-9);
      const rows = this.all(`SELECT id, uid, phone FROM clients WHERE phone IS NOT NULL AND phone != ''`);
      const r = rows.find((x) => digits(x.phone).slice(-9) === tail && free(x));
      if (r) return r;
    }
    if (em && /@/.test(em)) {
      const r = this.get(`SELECT id, uid FROM clients WHERE lower(trim(email)) = ? LIMIT 1`, [em]);
      if (free(r)) return r;
    }
    return null;
  }
  _syncSetShadow(entity, uid, ver, data) { this.run(`INSERT INTO sync_shadow (entity, uid, ver, data) VALUES (?, ?, ?, ?) ON CONFLICT(entity, uid) DO UPDATE SET ver = excluded.ver, data = excluded.data`, [entity, uid, ver, JSON.stringify(data)]); }
  _syncShadow(entity, uid) { const r = this.get(`SELECT ver, data FROM sync_shadow WHERE entity = ? AND uid = ?`, [entity, uid]); return r ? { ver: r.ver, data: r.data ? JSON.parse(r.data) : null } : null; }
  // Сервер подтвердил запись (наша или общая версия теперь = ver) или прислал более новую (конфликт).
  _syncResolve(entity, uid, ver, remoteData) {
    const d = this.get(`SELECT * FROM sync_dirty WHERE entity = ? AND uid = ?`, [entity, uid]);
    const sh = this._syncShadow(entity, uid);
    const local = d && !d.deleted ? this._syncSerialize(entity, uid) : null;
    this._applying(true);
    try {
      if (d && local && remoteData && !remoteData.deleted) {
        const merged = Database.syncMerge(entity, local, sh ? sh.data : null, remoteData);
        this._syncWriteLocal(entity, uid, merged);
        this._syncSetShadow(entity, uid, ver, remoteData);
        this.run(`UPDATE sync_dirty SET op = NULL, op_base = NULL, op_data = NULL WHERE entity = ? AND uid = ?`, [entity, uid]);
      } else {
        const ok = this._syncWriteLocal(entity, uid, remoteData);
        if (!ok) return false;
        this._syncSetShadow(entity, uid, ver, remoteData);
        if (d) this.run(`DELETE FROM sync_dirty WHERE entity = ? AND uid = ?`, [entity, uid]);
      }
    } finally { this._applying(false); }
    return true;
  }
  // Ответ сервера на отправку.
  syncAck(results) {
    return this.batch(() => this._syncAck(results));
  }
  _syncAck(results) {
    const out = { ok: 0, conflicts: 0, failed: 0 };
    for (const r of results || []) {
      const d = this.get(`SELECT * FROM sync_dirty WHERE op = ?`, [r.op]);
      if (!d) continue;
      if (r.status === 'ok') {
        const sent = JSON.parse(d.op_data);
        this._syncSetShadow(d.entity, d.uid, r.ver, sent);
        const now = d.deleted ? null : this._syncSerialize(d.entity, d.uid);
        const changedSince = !d.deleted && now && JSON.stringify(now) !== JSON.stringify(sent);
        if (changedSince) this.run(`UPDATE sync_dirty SET op = NULL, op_base = NULL, op_data = NULL WHERE entity = ? AND uid = ?`, [d.entity, d.uid]);
        else this.run(`DELETE FROM sync_dirty WHERE entity = ? AND uid = ?`, [d.entity, d.uid]);
        out.ok++;
      } else if (r.status === 'conflict') {
        out.conflicts++;
        if (r.data) this._syncResolve(d.entity, d.uid, r.ver, r.data);
        else { this.run(`DELETE FROM sync_shadow WHERE entity = ? AND uid = ?`, [d.entity, d.uid]); this.run(`UPDATE sync_dirty SET op = NULL, op_base = NULL, op_data = NULL WHERE entity = ? AND uid = ?`, [d.entity, d.uid]); }
      } else if (r.status === 'invalid') { this.run(`DELETE FROM sync_dirty WHERE entity = ? AND uid = ?`, [d.entity, d.uid]); out.failed++; }
      else out.failed++;   // ошибка сервера — та же операция уйдёт ещё раз
    }
    return out;
  }
  // Изменения из общей базы. Свою же запись (ответ на которую потерялся) узнаём по номеру операции.
  // Новые клиенты за N дней: как пришли (Wi-Fi, онлайн, акция по ссылке, вручную) и есть ли карта.
  recentClients(days = 7) {
    const d = Math.max(1, Math.min(60, Number(days) || 7));
    return this.all(`SELECT c.id, c.name, c.phone, c.email, c.created_at, c.consent_source,
        (SELECT COUNT(*) FROM cards k WHERE k.client_id = c.id) AS cards,
        (SELECT k.source FROM cards k WHERE k.client_id = c.id ORDER BY k.id LIMIT 1) AS card_source
      FROM clients c WHERE c.created_at >= datetime('now', ?) ORDER BY c.created_at DESC, c.id DESC LIMIT 100`, [`-${d} days`]).map(r => ({
      ...r, how: r.card_source === 'online_join' || r.consent_source === 'online_join' ? 'online' : r.card_source === 'online' || r.consent_source === 'online_registration' ? 'promo' : r.consent_source === 'self_registration' || r.card_source === 'selfreg' ? 'wifi' : 'manual'
    }));
  }
  syncInflight() { return this.all(`SELECT op FROM sync_dirty WHERE op IS NOT NULL LIMIT 200`).map(r => r.op); }
  syncApplyRemote(items, appliedOps) {
    return this.batch(() => this._syncApplyRemote(items, appliedOps));
  }
  _syncApplyRemote(items, appliedOps) {
    // Сначала — подтверждения наших отправок, ответ на которые потерялся.
    if (Array.isArray(appliedOps) && appliedOps.length) this.syncAck(appliedOps.map(a => ({ op: a.op, status: 'ok', ver: a.ver })));
    const order = { client: 0, card: 1, scan: 2, appt: 3 };
    let pending = (items || []).slice().sort((a, b) => order[a.entity] - order[b.entity] || a.seq - b.seq);
    let maxSeq = 0, applied = 0;
    for (let pass = 0; pass < 3 && pending.length; pass++) {
      const next = [];
      for (const it of pending) {
        maxSeq = Math.max(maxSeq, Number(it.seq) || 0);
        if (!Database.SYNC[it.entity]) continue;
        const d = this.get(`SELECT * FROM sync_dirty WHERE entity = ? AND uid = ?`, [it.entity, it.uid]);
        if (d && d.op && it.last_op && it.last_op === d.op) { this.syncAck([{ op: d.op, status: 'ok', ver: it.ver }]); applied++; continue; }
        const sh = this._syncShadow(it.entity, it.uid);
        if (sh && sh.ver >= it.ver) continue;   // уже знаем эту версию
        if (this._syncResolve(it.entity, it.uid, it.ver, it.data)) applied++; else next.push(it);
      }
      pending = next;
    }
    // Курсор не уходит дальше записей, которые ещё не удалось применить (их зависимость придёт позже).
    const cursor = pending.length ? Math.min(...pending.map(p => Number(p.seq) || 0)) - 1 : maxSeq;
    return { applied, deferred: pending.length, maxSeq, cursor };
  }

  // ---------- резервные копии: проверка файла перед восстановлением ----------
  // Открываем копию отдельно от рабочей базы, проверяем целостность и наличие главных таблиц.
  inspectBackup(buf) {
    if (!this.SQL) return { ok: false, error: 'not_ready' };
    let d;
    try { d = new this.SQL.Database(buf); } catch (e) { return { ok: false, error: 'not_db' }; }
    try {
      const one = (sql) => { const r = d.exec(sql); return r[0] && r[0].values[0] ? r[0].values[0][0] : null; };
      let integrity = 'ok';
      try { integrity = one('PRAGMA integrity_check'); } catch (e) { integrity = 'error'; }
      if (integrity !== 'ok') return { ok: false, error: 'damaged' };
      const tables = (d.exec(`SELECT name FROM sqlite_master WHERE type = 'table'`)[0] || { values: [] }).values.map(v => v[0]);
      const need = ['clients', 'cards', 'settings'];
      if (!need.every(t => tables.includes(t))) return { ok: false, error: 'not_loya' };
      const count = (t) => tables.includes(t) ? (one(`SELECT COUNT(*) FROM ${t}`) || 0) : 0;
      let last = null; try { last = tables.includes('scan_history') ? one(`SELECT MAX(created_at) FROM scan_history`) : null; } catch (e) { /* нет поля */ }
      let brand = ''; try { brand = one(`SELECT value FROM settings WHERE key = 'brand_name'`) || ''; } catch (e) { /* нет */ }
      return { ok: true, clients: count('clients'), cards: count('cards'), scans: count('scan_history'), products: count('products'), lastActivity: last, brand };
    } finally { try { d.close(); } catch (e) { /* уже закрыта */ } }
  }
  // Заменить рабочую базу проверенной копией: сначала проверка, потом запись во временный файл и переименование,
  // затем повторное открытие — при этом выполняются миграции, так что старые копии подходят к новой версии.
  async replaceWith(buf) {
    const info = this.inspectBackup(buf);
    if (!info.ok) return info;
    const tmp = this.dbPath + '.restore-tmp';
    fs.writeFileSync(tmp, Buffer.from(buf));
    try { this.db.close(); } catch (e) { /* уже закрыта */ }
    fs.renameSync(tmp, this.dbPath);
    const limits = this.limits;
    await this.init();
    this.limits = limits;
    return { ok: true, ...info };
  }
  exportBuffer() { return Buffer.from(this.db.export()); }
  // Операции для бухгалтерии/анализа: визиты, штампы, суммы.
  exportOperationsCsv(lang, H) {
    const rows = this.all(`SELECT h.created_at, c.name AS client, c.phone, k.code, k.type, h.result, h.amount_spent, l.name AS location
      FROM scan_history h LEFT JOIN clients c ON c.id = h.client_id LEFT JOIN cards k ON k.id = h.card_id LEFT JOIN locations l ON l.id = h.location_id
      ORDER BY h.id`);
    const out = [[H.date, H.client, H.phone, H.card, H.type, H.result, H.amount, H.location]];
    for (const r of rows) out.push([r.created_at, r.client || '', r.phone || '', r.code || '', H['type_' + r.type] || r.type || '', H['res_' + r.result] || r.result || '', r.amount_spent == null ? '' : r.amount_spent, r.location || '']);
    return this._csv(out, lang);
  }

  // ---------- импорт клиентов из таблицы (CSV из Excel) ----------
  // Кодировка: UTF-8 (с BOM или без) или Windows-1251 (так Excel часто сохраняет кириллицу).
  static decodeCsv(buf) {
    const b = Buffer.from(buf);
    try { return new TextDecoder('utf-8', { fatal: true }).decode(b).replace(/^\uFEFF/, ''); }
    catch (e) { try { return new TextDecoder('windows-1251').decode(b); } catch (e2) { return b.toString('latin1'); } }
  }
  static parseCsvText(text) {
    const first = (text.split(/\r?\n/).find(l => l.trim()) || '');
    const counts = { ';': (first.match(/;/g) || []).length, ',': (first.match(/,/g) || []).length, '\t': (first.match(/\t/g) || []).length };
    const sep = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0 ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] : ',';
    const rows = []; let row = [], field = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; continue; }
      if (c === '"') q = true;
      else if (c === sep) { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); field = ''; if (row.some(v => v.trim() !== '')) rows.push(row.map(v => v.trim())); row = []; }
      else field += c;
    }
    row.push(field); if (row.some(v => v.trim() !== '')) rows.push(row.map(v => v.trim()));
    return { sep, headers: rows[0] || [], rows: rows.slice(1) };
  }
  static suggestMapping(headers) {
    const syn = {
      name: ['имя', 'ім’я', "ім'я", 'імя', 'фио', 'піб', 'meno', 'name', 'клиент', 'клієнт', 'zákazník'],
      phone: ['телефон', 'phone', 'tel', 'мобил', 'мобіл', 'telefón', 'číslo'],
      email: ['email', 'e-mail', 'почта', 'пошта', 'mail'],
      birthday: ['день рожд', 'дата рожд', 'день народ', 'дата народ', 'narodenin', 'dátum narodenia', 'birth'],
      notes: ['заметк', 'нотат', 'примеч', 'poznám', 'note', 'comment', 'коммент', 'комент'],
      language: ['язык', 'мова', 'jazyk', 'language', 'lang'],
      consent_email: ['согласие email', 'згода email', 'súhlas email', 'email consent', 'consent email'],
      consent_telegram: ['согласие telegram', 'згода telegram', 'súhlas telegram', 'telegram consent', 'consent telegram'],
      consent_all: ['соглас', 'згод', 'súhlas', 'consent', 'рассылк', 'розсилк'],
      id: ['id', '№', 'loya id']
    };
    const used = new Set(); const map = {};
    const order = ['consent_email', 'consent_telegram', 'id', 'birthday', 'email', 'phone', 'name', 'notes', 'language', 'consent_all'];
    for (const f of order) {
      const idx = headers.findIndex((h, i) => !used.has(i) && syn[f].some(w => { const x = String(h).trim().toLowerCase(); return f === 'id' ? x === w : x.includes(w); }));
      if (idx >= 0) { map[f] = idx; used.add(idx); }
    }
    return map;
  }
  static _yes(v) { return /^(1|да|так|yes|y|áno|ano|true|x|\+|✓|согласен|згоден|souhlasím)$/i.test(String(v || '').trim()); }
  static _lang(v) {
    const x = String(v || '').trim().toLowerCase();
    if (!x) return '';
    if (/^(uk|ua|укр|українська|украинский)/.test(x)) return 'uk';
    if (/^(ru|рус|русский|російська)/.test(x)) return 'ru';
    if (/^(sk|slov|slovenčina|словацк)/.test(x)) return 'sk';
    if (/^(en|eng|english|англ)/.test(x)) return 'en';
    return '';
  }
  static _birthday(v) {
    const x = String(v || '').trim(); if (!x) return '';
    let y, m, d, k;
    if ((k = x.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) { [y, m, d] = [k[1], k[2], k[3]]; }
    else if ((k = x.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/))) { [d, m, y] = [k[1], k[2], k[3]]; }
    else return null;
    const dt = new Date(Date.UTC(+y, +m - 1, +d));
    if (dt.getUTCMonth() !== +m - 1 || dt.getUTCDate() !== +d || +y < 1900 || +y > new Date().getFullYear()) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  static _phoneKey(v) { const d = String(v || '').replace(/\D/g, ''); return d.length >= 7 ? d.slice(-9) : ''; }
  // Проверка и импорт по сопоставлению колонок. dupMode: 'skip' — дубли пропускаем; 'fill' — дописываем
  // в найденного клиента только пустые поля (заполненное никогда не перезаписываем молча).
  importClientsMapped(rows, mapping, opts = {}) {
    return this.batch(() => this._importClientsMapped(rows, mapping, opts));
  }
  _importClientsMapped(rows, mapping, opts = {}) {
    const dupMode = opts.dupMode === 'fill' ? 'fill' : 'skip';
    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const get = (r, f) => (mapping[f] !== undefined && mapping[f] !== null && mapping[f] !== '' && Number(mapping[f]) >= 0) ? String(r[Number(mapping[f])] || '').trim() : '';
    const existing = this.all(`SELECT id, name, email, phone, birthday, notes, preferred_language, consent_email, consent_telegram, do_not_contact, marketing_consent, consent_source, consent_at FROM clients`);
    const byId = new Map(existing.map(c => [c.id, c])), byPhone = new Map(), byEmail = new Map();
    for (const c of existing) { const pk = Database._phoneKey(c.phone); if (pk) byPhone.set(pk, c.id); if (c.email) byEmail.set(String(c.email).toLowerCase(), c.id); }
    const seenPhone = new Set(), seenEmail = new Set();
    const rep = { total: rows.length, imported: 0, updated: 0, skipped: 0, warnings: 0, limited: false, issues: [] };
    const issue = (row, name, kind, field) => { if (rep.issues.length < 300) rep.issues.push({ row, name, kind, field: field || null }); };
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i], rowNo = i + 2;
      const name = get(r, 'name');
      if (!name) { rep.skipped++; issue(rowNo, '', 'no_name'); continue; }
      let email = get(r, 'email'), phone = get(r, 'phone'), birthday = get(r, 'birthday');
      if (email && !EMAIL.test(email)) { issue(rowNo, name, 'bad_email', email); rep.warnings++; email = ''; }
      if (phone && !Database._phoneKey(phone)) { issue(rowNo, name, 'bad_phone', phone); rep.warnings++; phone = ''; }
      if (birthday) { const b = Database._birthday(birthday); if (b === null) { issue(rowNo, name, 'bad_birthday', birthday); rep.warnings++; birthday = ''; } else birthday = b; }
      const pk = Database._phoneKey(phone), ek = email.toLowerCase();
      if ((pk && seenPhone.has(pk)) || (ek && seenEmail.has(ek))) { rep.skipped++; issue(rowNo, name, 'dup_in_file'); continue; }
      const idVal = Number(get(r, 'id')) || 0;
      const matchId = (idVal && byId.has(idVal) && idVal) || (pk && byPhone.get(pk)) || (ek && byEmail.get(ek)) || 0;
      const ceRaw = get(r, 'consent_email') || get(r, 'consent_all'), ctRaw = get(r, 'consent_telegram') || get(r, 'consent_all');
      const ce = Database._yes(ceRaw), ct = Database._yes(ctRaw);
      const fields = { name, email, phone, birthday, notes: get(r, 'notes'), preferredLanguage: Database._lang(get(r, 'language')) };
      if (pk) seenPhone.add(pk); if (ek) seenEmail.add(ek);
      if (matchId) {
        if (dupMode === 'skip') { rep.skipped++; issue(rowNo, name, 'duplicate'); continue; }
        const cur = byId.get(matchId);
        const upd = {
          name: cur.name || name, email: cur.email || email, phone: cur.phone || phone, birthday: cur.birthday || birthday,
          notes: cur.notes || fields.notes, preferredLanguage: cur.preferred_language || fields.preferredLanguage,
          // согласие из файла только добавляем (если в файле «да»), но не снимаем и не возвращаем отписавшимся
          consentEmail: cur.consent_email || (ce && !cur.do_not_contact ? 1 : 0), consentTelegram: cur.consent_telegram || (ct && !cur.do_not_contact ? 1 : 0), consentSource: 'import'
        };
        this.updateClient(matchId, upd); rep.updated++; continue;
      }
      try { this.addClient({ ...fields, consentEmail: ce, consentTelegram: ct, consentSource: 'import' }); rep.imported++; }
      catch (e) { if (e && e.code === 'FREE_LIMIT') { rep.limited = true; rep.skipped += rows.length - i; issue(rowNo, name, 'limit'); break; } throw e; }
    }
    return { ok: true, ...rep };
  }

  setFreeLimits(limits) { this.limits = limits && typeof limits === 'object' ? { ...limits } : null; }
  getFreeLimits() { return this.limits ? { ...this.limits } : null; }
  getUsage() {
    const n = (t) => (this.get(`SELECT COUNT(*) AS n FROM ${t}`) || {}).n || 0;
    return { clients: n('clients'), cards: n('cards'), products: (this.get(`SELECT COUNT(*) AS n FROM products WHERE active = 1`) || {}).n || 0 };
  }
  _guard(kind) {
    if (!this.limits || this.limits[kind] == null) return;
    const used = kind === 'products' ? (this.get(`SELECT COUNT(*) AS n FROM products WHERE active = 1`) || {}).n || 0
      : (this.get(`SELECT COUNT(*) AS n FROM ${kind}`) || {}).n || 0;
    if (used >= this.limits[kind]) throw new FreeLimitError(kind);
  }
  // В пробном режиме «живыми» считаются первые N клиентов (по номеру). Остальные не получают штампы и
  // бонусы: иначе бизнес, у которого лежат сотни клиентов, мог бы пользоваться программой бесплатно.
  isClientActive(clientId) {
    if (!this.limits || this.limits.clients == null) return true;
    return this.all(`SELECT id FROM clients ORDER BY id LIMIT ?`, [this.limits.clients]).some(r => r.id === Number(clientId));
  }

  async init() {
    const SQL = await initSqlJs({
      // ищем встроенный .wasm файл внутри node_modules/sql.js/dist
      // В собранной программе (asar) .wasm лежит распакованным рядом — в app.asar.unpacked.
      locateFile: (file) => {
        const p = path.join(require.resolve('sql.js'), '..', file);
        const unpacked = p.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
        return unpacked !== p && fs.existsSync(unpacked) ? unpacked : p;
      }
    });

    // Открываем базу. Если файл повреждён (например, компьютер выключился во время записи
    // в старой версии), не падаем: сохраняем испорченный файл рядом и поднимаем самую
    // свежую рабочую резервную копию из папки backups.
    this.SQL = SQL;
    const openAndCheck = (buf) => {
      const dbObj = new SQL.Database(buf);
      dbObj.exec('SELECT count(*) FROM sqlite_master');
      return dbObj;
    };
    if (fs.existsSync(this.dbPath)) {
      try {
        this.db = openAndCheck(fs.readFileSync(this.dbPath));
      } catch (err) {
        this.recoveredFrom = null;
        try { fs.copyFileSync(this.dbPath, this.dbPath + '.corrupt-' + Date.now()); } catch (e) { /* ignore */ }
        const backupDir = path.join(path.dirname(this.dbPath), 'backups');
        const backups = fs.existsSync(backupDir)
          ? fs.readdirSync(backupDir).filter(f => /^loyalty-.*\.db$/.test(f))
              .map(f => ({ f, t: fs.statSync(path.join(backupDir, f)).mtimeMs })).sort((a, b) => b.t - a.t)
          : [];
        for (const b of backups) {
          try { this.db = openAndCheck(fs.readFileSync(path.join(backupDir, b.f))); this.recoveredFrom = b.f; break; } catch (e) { /* пробуем следующую */ }
        }
        if (!this.db) this.db = new SQL.Database();
        console.log('[Loya] База была повреждена, восстановлено из: ' + (this.recoveredFrom || 'нет копии — новая база'));
      }
    } else {
      this.db = new SQL.Database();
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        birthday TEXT,
        notes TEXT,
        preferred_language TEXT,
        nameday_last_sent TEXT,
        lifetime_purchases INTEGER DEFAULT 0,
        lifetime_rewards INTEGER DEFAULT 0,
        marketing_consent INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        type TEXT NOT NULL,               -- 'discount' | 'stamp'
        title TEXT,
        discount_percent INTEGER,
        stamp_target INTEGER,
        stamp_count INTEGER DEFAULT 0,
        redeemed_count INTEGER DEFAULT 0,
        code TEXT UNIQUE NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id)
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      CREATE TABLE IF NOT EXISTS scan_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        result TEXT NOT NULL,             -- 'discount' | 'stamp' | 'reward'
        stamp_count_at INTEGER,           -- значение счётчика штампов в момент скана (для 'stamp'/'reward')
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS client_gifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        gift_text TEXT NOT NULL,
        status TEXT DEFAULT 'pending',    -- 'pending' | 'given'
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        given_at TEXT
      );
    `);

    // Миграция: если база создана раньше и в scan_history ещё нет колонки stamp_count_at — добавляем.
    const scanCols = this.all(`PRAGMA table_info(scan_history)`);
    if (!scanCols.some(c => c.name === 'stamp_count_at')) {
      this.db.run(`ALTER TABLE scan_history ADD COLUMN stamp_count_at INTEGER`);
    }

    // Миграция: если база создана раньше и в clients ещё нет колонки birthday — добавляем.
    const cols = this.all(`PRAGMA table_info(clients)`);
    if (!cols.some(c => c.name === 'birthday')) {
      this.db.run(`ALTER TABLE clients ADD COLUMN birthday TEXT`);
    }
    if (!cols.some(c => c.name === 'notes')) {
      this.db.run(`ALTER TABLE clients ADD COLUMN notes TEXT`);
    }
    if (!cols.some(c => c.name === 'preferred_language')) {
      this.db.run(`ALTER TABLE clients ADD COLUMN preferred_language TEXT`);
    }
    if (!cols.some(c => c.name === 'nameday_last_sent')) {
      this.db.run(`ALTER TABLE clients ADD COLUMN nameday_last_sent TEXT`);
    }
    if (!cols.some(c => c.name === 'lifetime_purchases')) {
      this.db.run(`ALTER TABLE clients ADD COLUMN lifetime_purchases INTEGER DEFAULT 0`);
      // Бэкфилл для уже существующих клиентов — иначе у всех уровень (BASIC/SILVER/GOLD)
      // обнулился бы при обновлении. Считаем один раз из уже накопленной истории.
      this.db.run(`
        UPDATE clients SET lifetime_purchases = (
          SELECT COUNT(*) FROM scan_history WHERE scan_history.client_id = clients.id
        )
      `);
    }
    if (!cols.some(c => c.name === 'lifetime_rewards')) {
      this.db.run(`ALTER TABLE clients ADD COLUMN lifetime_rewards INTEGER DEFAULT 0`);
      this.db.run(`
        UPDATE clients SET lifetime_rewards = (
          SELECT COUNT(*) FROM scan_history WHERE scan_history.client_id = clients.id AND scan_history.result = 'reward'
        )
      `);
    }
    if (!cols.some(c => c.name === 'marketing_consent')) {
      this.db.run(`ALTER TABLE clients ADD COLUMN marketing_consent INTEGER DEFAULT 0`);
    }

    // Таблица-архив для истории сканирований старше N месяцев — детальные строки удаляются,
    // но помесячные итоги остаются (для долгосрочных графиков), а уровень клиента не зависит
    // от scan_history вообще (см. lifetime_purchases выше), так что архивация безопасна.
    this.db.run(`
      CREATE TABLE IF NOT EXISTS scan_history_archive (
        year_month TEXT PRIMARY KEY,
        discount_count INTEGER DEFAULT 0,
        stamp_count INTEGER DEFAULT 0,
        reward_count INTEGER DEFAULT 0
      )
    `);

    // Шаблоны «открытки с котиком» — теперь управляются из настроек (можно добавлять свои
    // и удалять существующие), а не зашиты в коде. Картинки хранятся файлами рядом с базой
    // (data/cat-cards/), в таблице — только язык, имя файла и разметка места под QR.
    this.db.run(`
      CREATE TABLE IF NOT EXISTS card_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lang TEXT,
        niche TEXT,
        has_text_overlay INTEGER DEFAULT 0,
        file_name TEXT NOT NULL,
        qr_x_pct REAL NOT NULL,
        qr_y_pct REAL NOT NULL,
        qr_size_pct REAL NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // На случай апгрейда с более старой версии, где этих двух столбцов ещё не было —
    // SQLite разрешает добавить столбец в уже существующую таблицу без пересоздания.
    ['niche TEXT', 'has_text_overlay INTEGER DEFAULT 0'].forEach(col => {
      try { this.db.run(`ALTER TABLE card_templates ADD COLUMN ${col}`); } catch (err) { /* уже есть */ }
    });
    // Привязка клиента к Telegram-боту этого бизнеса: telegram_link_code — свой
    // одноразовый код на deep-ссылку (t.me/bot?start=код), telegram_chat_id —
    // заполняется, когда клиент реально нажал Start у бота.
    ['telegram_chat_id TEXT', 'telegram_link_code TEXT'].forEach(col => {
      try { this.db.run(`ALTER TABLE clients ADD COLUMN ${col}`); } catch (err) { /* уже есть */ }
    });
    // Согласия на рассылки — отдельно по каналам, с источником и временем. Наличие email или телефона
    // согласием не считается. do_not_contact — «не беспокоить» (исключение из любых рассылок).
    let consentAdded = false;
    try { this.db.run(`ALTER TABLE clients ADD COLUMN consent_email INTEGER DEFAULT 0`); consentAdded = true; } catch (err) { /* уже есть */ }
    ['consent_telegram INTEGER DEFAULT 0', 'consent_source TEXT', 'consent_at TEXT', 'do_not_contact INTEGER DEFAULT 0', 'unsubscribed_at TEXT'].forEach(col => {
      try { this.db.run(`ALTER TABLE clients ADD COLUMN ${col}`); } catch (err) { /* уже есть */ }
    });
    // Один раз при обновлении: прежнее общее согласие переносим в оба канала (так работало и раньше).
    if (consentAdded) {
      try { this.db.run(`UPDATE clients SET consent_email = marketing_consent, consent_telegram = marketing_consent, consent_source = CASE WHEN marketing_consent = 1 THEN 'legacy' ELSE NULL END`); } catch (err) { /* таблица пустая */ }
    }

    // Сумма покупки — необязательное поле, сотрудник может указать при сканировании,
    // а может пропустить. NULL означает "не указано", а не "потрачено 0".
    try { this.db.run(`ALTER TABLE scan_history ADD COLUMN amount_spent REAL`); } catch (err) { /* уже есть */ }

    // Скругление углов у места под QR-код в редакторе карточек — необязательное,
    // 0 = острые углы (как было раньше), 0.5 = максимальное скругление (почти круг).
    try { this.db.run(`ALTER TABLE card_templates ADD COLUMN qr_corner_radius_pct REAL DEFAULT 0`); } catch (err) { /* уже есть */ }

    // Картинка-открытка выбирается СЛУЧАЙНО один раз при первой генерации и потом
    // запоминается здесь — раньше выбор пересчитывался каждый раз через
    // "хэш кода % количество шаблонов", из-за чего добавление всего одной новой картинки
    // сдвигало остаток от деления и меняло картинку сразу у множества старых карт.
    try { this.db.run(`ALTER TABLE cards ADD COLUMN card_template_id INTEGER`); } catch (err) { /* уже есть */ }

    // Накопительная карта на сумму — третий тип карты, помимо скидочной и штамп-карты.
    // spend_target — сколько нужно накопить (в валюте бизнеса), чтобы получить награду;
    // spend_accumulated — сколько накоплено сейчас (сбрасывается в 0 при достижении цели,
    // как stamp_count у штамп-карты).
    try { this.db.run(`ALTER TABLE cards ADD COLUMN spend_target REAL`); } catch (err) { /* уже есть */ }
    try { this.db.run(`ALTER TABLE cards ADD COLUMN spend_accumulated REAL DEFAULT 0`); } catch (err) { /* уже есть */ }
    // Текст бонуса накопительной карты («скидка 10%», «подарок»). Если у карты нет
    // spend_target (NULL/0) — это карта «только учёт трат»: бонуса нет, сумма просто растёт.
    try { this.db.run(`ALTER TABLE cards ADD COLUMN spend_bonus_text TEXT`); } catch (err) { /* уже есть */ }
    // 2.17: бонусы накопительной карты копятся. За каждые spend_target денег — spend_bonus_points бонусов
    // (покупка на 2000 при пороге 500 → 4 × N). bonus_balance — сколько бонусов у клиента сейчас (можно списать).
    try { this.db.run(`ALTER TABLE cards ADD COLUMN bonus_balance REAL DEFAULT 0`); } catch (err) { /* уже есть */ }
    try { this.db.run(`ALTER TABLE cards ADD COLUMN spend_bonus_points INTEGER DEFAULT 1`); } catch (err) { /* уже есть */ }
    // 2.17: в какой точке клиент зарегистрировался — для статистики по точкам.
    try { this.db.run(`ALTER TABLE clients ADD COLUMN location_id INTEGER`); } catch (err) { /* уже есть */ }

    // История отправок — одна строка на канал (если отправляли и на email, и в Telegram
    // одним действием — это две отдельные строки, потому что у каждого канала свой
    // независимый результат: одно могло уйти успешно, другое — нет).
    this.db.run(`
      CREATE TABLE IF NOT EXISTS send_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        channel TEXT NOT NULL,
        subject TEXT,
        status TEXT NOT NULL,
        error_detail TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Для каждой картинки — к какому виду бизнеса она относится (scope_niche), чтобы
    // карточки разных бизнесов никогда не пересекались (пекарня не получит карточку груминга).
    try { this.db.run(`ALTER TABLE card_templates ADD COLUMN scope_niche TEXT`); } catch (err) { /* уже есть */ }
    // «Приведи друга»: кто пригласил клиента (id другого клиента).
    try { this.db.run(`ALTER TABLE clients ADD COLUMN referred_by INTEGER`); } catch (err) { /* уже есть */ }
    // Карта уже добавлялась в Google Wallet — значит, после сканов её надо обновлять там.
    try { this.db.run(`ALTER TABLE cards ADD COLUMN wallet_linked INTEGER DEFAULT 0`); } catch (err) { /* уже есть */ }
    // Бонусная карта из регистрации по ссылке: действует до даты (expires_at, формат ГГГГ-ММ-ДД,
    // включительно) и срабатывает один раз (single_use). source = 'online' — пришла через интернет.
    try { this.db.run(`ALTER TABLE cards ADD COLUMN expires_at TEXT`); } catch (err) { /* уже есть */ }
    try { this.db.run(`ALTER TABLE cards ADD COLUMN single_use INTEGER DEFAULT 0`); } catch (err) { /* уже есть */ }
    try { this.db.run(`ALTER TABLE cards ADD COLUMN source TEXT`); } catch (err) { /* уже есть */ }
    // Товары и склад (обычный учёт, НЕ касса: фискальный чек печатает сертифицированная касса бизнеса).
    this.db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sku TEXT, barcode TEXT, category TEXT,
      unit TEXT DEFAULT 'pcs', price REAL DEFAULT 0, cost REAL DEFAULT 0, stock REAL DEFAULT 0, min_stock REAL DEFAULT 0,
      active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS stock_moves (
      id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, kind TEXT NOT NULL, qty REAL NOT NULL,
      stock_after REAL, price REAL, note TEXT, receipt_id INTEGER, created_at TEXT DEFAULT (datetime('now')))`);
    // Чеки из кассы бизнеса (по API/веб-хуку или из файла): сумма → бонусы, товары → списание со склада.
    this.db.run(`CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, external_id TEXT, total REAL NOT NULL, currency TEXT,
      items TEXT, client_id INTEGER, card_id INTEGER, status TEXT DEFAULT 'pending', applied TEXT,
      created_at TEXT DEFAULT (datetime('now')), claimed_at TEXT)`);
    try { this.db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_ext ON receipts(source, external_id)`); } catch (err) { /* есть */ }
    // Рассылки как «кампании»: чтобы потом посчитать, сколько получателей пришло после письма.
    this.db.run(`CREATE TABLE IF NOT EXISTS campaigns (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, title TEXT, channels TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
    try { this.db.run(`ALTER TABLE send_history ADD COLUMN campaign_id INTEGER`); } catch (err) { /* уже есть */ }
    // service — карта, купон и другие сервисные письма; marketing — рассылки и акции (только с согласием).
    try { this.db.run(`ALTER TABLE send_history ADD COLUMN purpose TEXT`); } catch (err) { /* уже есть */ }
    try { this.db.run(`ALTER TABLE campaigns ADD COLUMN cost REAL`); } catch (err) { /* уже есть */ }   // затраты на кампанию, если владелец их указал
    // 2.20: «Приведи друга» (личный код гостя, бонус пригласившему выдан), отзывы и онлайн-запись.
    ['ref_code TEXT', 'ref_reward_done INTEGER DEFAULT 0', 'fb_last_at TEXT'].forEach(col => { try { this.db.run(`ALTER TABLE clients ADD COLUMN ${col}`); } catch (err) { /* уже есть */ } });
    this.db.run(`CREATE TABLE IF NOT EXISTS appointments (id INTEGER PRIMARY KEY AUTOINCREMENT, server_id INTEGER, token TEXT, client_id INTEGER, name TEXT, phone TEXT, email TEXT, lang TEXT,
      service_id TEXT, service_name TEXT, price REAL, staff_id TEXT DEFAULT '', staff_name TEXT, date TEXT NOT NULL, start_min INTEGER NOT NULL, dur INTEGER NOT NULL DEFAULT 60,
      status TEXT DEFAULT 'booked', source TEXT DEFAULT 'app', note TEXT, reminded INTEGER DEFAULT 0, server_dirty INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT)`);
    try { this.db.run(`CREATE INDEX IF NOT EXISTS idx_appt_day ON appointments(date, start_min)`); } catch (err) { /* есть */ }
    this.db.run(`CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT UNIQUE, client_id INTEGER, name TEXT, rating INTEGER, comment TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, rated_at TEXT, seen INTEGER DEFAULT 0)`);
    this._syncMigrate();
    try { this.db.run(`CREATE INDEX IF NOT EXISTS idx_send_campaign ON send_history(campaign_id)`); } catch (err) { /* есть */ }
    try { this.db.run(`CREATE INDEX IF NOT EXISTS idx_scan_client_time ON scan_history(client_id, created_at)`); } catch (err) { /* есть */ }
    try { this.db.run(`CREATE INDEX IF NOT EXISTS idx_moves_product ON stock_moves(product_id, id)`); } catch (err) { /* есть */ }

    // Сотрудники (кассиры/менеджеры со своим PIN) и точки продаж. Каждый скан запоминает,
    // кто и в какой точке его сделал — для отчёта по сотрудникам и точкам.
    this.db.run(`
      CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'cashier',
        pin_salt TEXT, pin_hash TEXT,
        location_id INTEGER,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    try { this.db.run(`ALTER TABLE scan_history ADD COLUMN staff_id INTEGER`); } catch (err) { /* уже есть */ }
    // 2.10: email сотрудника (для QR-карточки входа), код входа (хранится только хэш) и личный цвет программы.
    ['email TEXT', 'login_salt TEXT', 'login_hash TEXT', 'theme_name TEXT'].forEach(col => {
      try { this.db.run(`ALTER TABLE staff ADD COLUMN ${col}`); } catch (err) { /* уже есть */ }
    });
    try { this.db.run(`ALTER TABLE scan_history ADD COLUMN location_id INTEGER`); } catch (err) { /* уже есть */ }
    try { this.db.run(`ALTER TABLE scan_history ADD COLUMN source TEXT`); } catch (err) { /* уже есть */ }
    // 2.19: подарочные сертификаты (номинал и остаток) и журнал сгоревших бонусов.
    try { this.db.run(`ALTER TABLE cards ADD COLUMN gift_amount REAL`); } catch (err) { /* уже есть */ }
    try { this.db.run(`ALTER TABLE cards ADD COLUMN gift_balance REAL`); } catch (err) { /* уже есть */ }
    this.db.run(`CREATE TABLE IF NOT EXISTS expiry_log (id INTEGER PRIMARY KEY AUTOINCREMENT, card_id INTEGER, client_id INTEGER, bonus REAL DEFAULT 0, stamps INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);

    // Индексы для быстрой работы на больших базах (тысячи клиентов, десятки тысяч сканов).
    [
      `CREATE INDEX IF NOT EXISTS idx_sh_client ON scan_history(client_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sh_card ON scan_history(card_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sh_created ON scan_history(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_cards_client ON cards(client_id)`
    ].forEach(sql => { try { this.db.run(sql); } catch (err) { /* не критично */ } });

    // Журнал автоматических рассылок: кому, по какому сценарию и когда уже писали —
    // чтобы одно и то же письмо не приходило клиенту повторно.
    this.db.run(`
      CREATE TABLE IF NOT EXISTS automation_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        rule TEXT NOT NULL,
        sent_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this.migrateCardTemplateScopes();
    this.removeBuiltinCatCards();

    this.save();
  }

  // 2.24: встроенные «котики» были нарисованы под одно конкретное заведение (Nectar Kava, с его
  // названием на картинке) и не подходят другим кофейням — убираем их один раз из дизайнов карточек.
  // Свои загруженные картинки не трогаем. У самого Nectar Kava оставляем.
  removeBuiltinCatCards() {
    const done = this.get(`SELECT value FROM settings WHERE key = 'builtin_cats_removed'`);
    if (done && done.value === '1') return;
    const brand = this.get(`SELECT value FROM settings WHERE key = 'brand_name'`);
    if (!/nectar/i.test((brand && brand.value) || '')) {
      const destDir = path.join(path.dirname(this.dbPath), 'cat-cards');
      const builtinCat = /^(ru|sk|uk|en)-(orange|black-sunglasses|white-pink|tabby-green|grey-lavender|siamese-brown)-\d+-\d+\.png$/;
      this.all(`SELECT id, file_name FROM card_templates`).forEach(row => {
        if (!builtinCat.test(row.file_name || '')) return;
        try { fs.unlinkSync(path.join(destDir, row.file_name)); } catch (err) { /* файла нет */ }
        this.run(`DELETE FROM card_templates WHERE id = ?`, [row.id]);
      });
    }
    this.run(`INSERT INTO settings (key, value) VALUES ('builtin_cats_removed', '1') ON CONFLICT(key) DO UPDATE SET value = excluded.value`);
  }

  // Строгие однотонные картинки под остальные ниши (барбершоп, ногти, спа, тату, фитнес,
  // пекарня, груминг, фотостудия, «другое») — без вшитого текста: название бренда и
  // название карты дорисовываются поверх динамически (см. composeCatCard в renderer.js),
  // поэтому одна и та же картинка одинаково хорошо подходит под любое название бизнеса.
  seedNicheCardTemplates() {
    const count = this.get(`SELECT COUNT(*) AS n FROM card_templates WHERE niche IS NOT NULL`).n;
    if (count > 0) return;

    // Координаты одинаковы для всех — сами рисовали разметку и проверили попиксельно,
    // что квадрат под QR целиком помещается в границы картинки (512×512), с отступом снизу.
    const qr = { qrXPct: 0.5, qrYPct: 0.7129, qrSizePct: 0.4492 };
    const niches = ['barber', 'nails', 'spa', 'tattoo', 'fitness', 'bakery', 'petgroom', 'photo', 'clothing', 'other'];

    const srcDir = path.join(__dirname, 'src', 'niche-cards');
    const destDir = path.join(path.dirname(this.dbPath), 'cat-cards');
    try {
      fs.mkdirSync(destDir, { recursive: true });
      niches.forEach(nicheId => {
        const srcFile = path.join(srcDir, `${nicheId}.png`);
        if (!fs.existsSync(srcFile)) return;
        const destName = `niche-${nicheId}-${Date.now()}.png`;
        fs.copyFileSync(srcFile, path.join(destDir, destName));
        this.run(
          `INSERT INTO card_templates (lang, niche, has_text_overlay, file_name, qr_x_pct, qr_y_pct, qr_size_pct) VALUES (NULL, ?, 1, ?, ?, ?, ?)`,
          [nicheId, destName, qr.qrXPct, qr.qrYPct, qr.qrSizePct]
        );
      });
    } catch (err) {
      // не критично — если не вышло, у ниши просто не будет своей картинки, откат на QR
    }
  }

  // Разовая миграция при обновлении до 1.78:
  // — старые встроенные «строгие» заглушки ниш (файлы niche-<ниша>-<время>.png) удаляются:
  //   теперь заглушки нарисованы заново и берутся прямо из приложения (src/niche-cards),
  //   с названием заведения поверх;
  // — встроенные котики (с уже нарисованным брендом кофейни) привязываются к нише «кофейня»;
  // — картинки, загруженные пользователем по языкам, привязываются к нише, выбранной сейчас.
  // Новые установки больше не получают котиков автоматически — у каждого бизнеса с нуля
  // своя заглушка, а свои картинки он добавляет сам.
  migrateCardTemplateScopes() {
    const done = this.get(`SELECT value FROM settings WHERE key = 'card_scope_migrated'`);
    if (done && done.value === '1') return;
    const nicheRow = this.get(`SELECT value FROM settings WHERE key = 'business_niche'`);
    const currentNiche = (nicheRow && nicheRow.value) || 'coffee';
    const destDir = path.join(path.dirname(this.dbPath), 'cat-cards');
    const builtinCat = /^(ru|sk|uk|en)-(orange|black-sunglasses|white-pink|tabby-green|grey-lavender|siamese-brown)-\d+-\d+\.png$/;
    const oldNichePlaceholder = /^niche-[a-z]+-\d+\.png$/;
    this.all(`SELECT * FROM card_templates`).forEach(row => {
      if (row.niche) {
        if (oldNichePlaceholder.test(row.file_name)) {
          try { fs.unlinkSync(path.join(destDir, row.file_name)); } catch (err) { /* нет файла — не страшно */ }
          this.run(`DELETE FROM card_templates WHERE id = ?`, [row.id]);
        } else {
          this.run(`UPDATE card_templates SET scope_niche = ? WHERE id = ?`, [row.niche, row.id]);
        }
      } else if (!row.scope_niche) {
        this.run(`UPDATE card_templates SET scope_niche = ? WHERE id = ?`, [builtinCat.test(row.file_name) ? 'coffee' : currentNiche, row.id]);
      }
    });
    this.run(`INSERT INTO settings (key, value) VALUES ('card_scope_migrated', '1')
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`);
  }

  // ---------- шаблоны карточек ----------
  // Только картинки текущего вида бизнеса (scopeNiche) — чужие ниши не отдаются никогда.
  getCardTemplates(lang, scopeNiche) {
    return this.all(`SELECT * FROM card_templates WHERE lang = ? AND niche IS NULL AND scope_niche = ? ORDER BY id`, [lang, scopeNiche]);
  }

  // Строгие карточки под нишу бизнеса (не привязаны к языку — текст рисуется поверх динамически).
  getCardTemplatesForNiche(nicheId) {
    return this.all(`SELECT * FROM card_templates WHERE niche = ? ORDER BY id`, [nicheId]);
  }

  getCardTemplateById(id) {
    return this.get(`SELECT * FROM card_templates WHERE id = ?`, [id]);
  }

  addCardTemplate({ lang, niche, scopeNiche, hasTextOverlay, fileName, qrXPct, qrYPct, qrSizePct, qrCornerRadiusPct }) {
    return this.run(
      `INSERT INTO card_templates (lang, niche, scope_niche, has_text_overlay, file_name, qr_x_pct, qr_y_pct, qr_size_pct, qr_corner_radius_pct) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [lang || null, niche || null, niche || scopeNiche || null, hasTextOverlay ? 1 : 0, fileName, qrXPct, qrYPct, qrSizePct, qrCornerRadiusPct || 0]
    );
  }

  deleteCardTemplate(id) {
    const row = this.getCardTemplateById(id);
    if (!row) return { error: 'not_found' };
    try {
      const destDir = path.join(path.dirname(this.dbPath), 'cat-cards');
      fs.unlinkSync(path.join(destDir, row.file_name));
    } catch (err) {
      // файла уже нет — не страшно, всё равно убираем запись из базы
    }
    this.run(`DELETE FROM card_templates WHERE id = ?`, [id]);
    return { ok: true };
  }

  // Атомарная запись: сначала во временный файл, затем подмена. Если питание пропадёт
  // посреди записи, основной файл базы останется целым (а не обрезанным).
  save() {
    const data = Buffer.from(this.db.export());
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    const tmp = this.dbPath + '.tmp';
    try {
      fs.writeFileSync(tmp, data);
      try {
        fs.renameSync(tmp, this.dbPath);
      } catch (err) {
        // Windows: файл иногда держит антивирус — пишем напрямую, чтобы не потерять изменения.
        fs.writeFileSync(this.dbPath, data);
        try { fs.unlinkSync(tmp); } catch (e) { /* ignore */ }
      }
    } catch (err) {
      fs.writeFileSync(this.dbPath, data);
    }
  }

  // ---------- helpers ----------
  all(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  get(sql, params = []) {
    const rows = this.all(sql, params);
    return rows[0] || null;
  }

  run(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
    // last_insert_rowid() нужно захватить ДО this.save() — db.export() внутри
    // save() сбрасывает его в 0 (особенность sql.js).
    const idStmt = this.db.prepare('SELECT last_insert_rowid() AS id');
    idStmt.step();
    const lastInsertId = idStmt.getAsObject().id;
    idStmt.free();
    if (this._deferSave) this._dirty = true; else this.save();
    return lastInsertId;
  }

  // Пакетные операции (импорт тысяч клиентов, приём данных синхронизации): файл базы
  // записывается один раз в конце, а не после каждой строки — в десятки раз быстрее.
  batch(fn) {
    if (this._deferSave) return fn();
    this._deferSave = true; this._dirty = false;
    try { return fn(); }
    finally { this._deferSave = false; if (this._dirty) { this._dirty = false; this.save(); } }
  }

  // ---------- clients ----------
  // Согласия: consentEmail / consentTelegram — по каналам. Старые вызовы передают одно marketingConsent —
  // тогда оно применяется к обоим каналам (как и работало раньше). marketing_consent хранит «есть хоть одно».
  _consents(p, cur) {
    const has = (v) => v !== undefined && v !== null;
    const legacy = has(p.marketingConsent) ? (p.marketingConsent ? 1 : 0) : null;
    const ce = has(p.consentEmail) ? (p.consentEmail ? 1 : 0) : (legacy !== null ? legacy : (cur ? (cur.consent_email || 0) : 0));
    const ct = has(p.consentTelegram) ? (p.consentTelegram ? 1 : 0) : (legacy !== null ? legacy : (cur ? (cur.consent_telegram || 0) : 0));
    const dnc = has(p.doNotContact) ? (p.doNotContact ? 1 : 0) : (cur ? (cur.do_not_contact || 0) : 0);
    const changed = !cur || ce !== (cur.consent_email || 0) || ct !== (cur.consent_telegram || 0);
    const source = changed && (ce || ct) ? String(p.consentSource || 'manual').slice(0, 40) : (cur ? cur.consent_source : null);
    const at = changed && (ce || ct) ? new Date().toISOString() : (cur ? cur.consent_at : null);
    return { ce, ct, dnc, any: (ce || ct) && !dnc ? 1 : 0, source: (ce || ct) ? source : (cur && !changed ? cur.consent_source : null), at: (ce || ct) ? at : (cur && !changed ? cur.consent_at : null) };
  }
  addClient(p) {
    const { email, phone, birthday, notes, preferredLanguage } = p || {};
    const name = Database.cleanName(p && p.name);
    this._guard('clients');
    const c = this._consents(p || {}, null);
    const loc = Number(this.getSettings().current_location_id) || null;   // 2.17: точка, где клиент появился
    return this.run(
      `INSERT INTO clients (name, email, phone, birthday, notes, preferred_language, marketing_consent, consent_email, consent_telegram, consent_source, consent_at, do_not_contact, location_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email || '', phone || '', birthday || '', notes || '', preferredLanguage || '', c.any, c.ce, c.ct, c.source, c.at, c.dnc, loc]
    );
  }

  updateClient(id, p) {
    const { email, phone, birthday, notes, preferredLanguage } = p || {};
    const name = Database.cleanName(p && p.name);
    const c = this._consents(p || {}, this.getClient(id));
    this.run(
      `UPDATE clients SET name = ?, email = ?, phone = ?, birthday = ?, notes = ?, preferred_language = ?, marketing_consent = ?, consent_email = ?, consent_telegram = ?, consent_source = ?, consent_at = ?, do_not_contact = ? WHERE id = ?`,
      [name, email || '', phone || '', birthday || '', notes || '', preferredLanguage || '', c.any, c.ce, c.ct, c.source, c.at, c.dnc, id]
    );
    return this.getClient(id);
  }

  // Для ссылки отписки в письмах и для переключателя согласия в карточке клиента (оба канала).
  setMarketingConsent(id, value) {
    this.run(`UPDATE clients SET marketing_consent = ?, consent_email = ?, consent_telegram = ?, consent_source = ?, consent_at = ?${value ? '' : ', unsubscribed_at = ?'} WHERE id = ?`,
      value ? [1, 1, 1, 'manual', new Date().toISOString(), id] : [0, 0, 0, null, null, new Date().toISOString(), id]);
    return this.getClient(id);
  }
  // Отписка по одному каналу (ссылка в письме — только email; Telegram остаётся, если клиент его разрешал).
  setChannelConsent(id, channel, value, source) {
    const col = channel === 'telegram' ? 'consent_telegram' : 'consent_email';
    const cur = this.getClient(id); if (!cur) return null;
    const ce = channel === 'email' ? (value ? 1 : 0) : (cur.consent_email || 0), ct = channel === 'telegram' ? (value ? 1 : 0) : (cur.consent_telegram || 0);
    this.run(`UPDATE clients SET ${col} = ?, marketing_consent = ?, consent_source = ?, consent_at = ?${value ? '' : ', unsubscribed_at = ?'} WHERE id = ?`,
      value ? [1, (ce || ct) && !cur.do_not_contact ? 1 : 0, String(source || 'manual').slice(0, 40), new Date().toISOString(), id]
            : [0, (ce || ct) && !cur.do_not_contact ? 1 : 0, cur.consent_source || null, cur.consent_at || null, new Date().toISOString(), id]);
    return this.getClient(id);
  }
  setDoNotContact(id, value) {
    const cur = this.getClient(id); if (!cur) return null;
    this.run(`UPDATE clients SET do_not_contact = ?, marketing_consent = ? WHERE id = ?`, [value ? 1 : 0, !value && (cur.consent_email || cur.consent_telegram) ? 1 : 0, id]);
    return this.getClient(id);
  }
  // Можно ли слать клиенту МАРКЕТИНГ по каналу. Сервисные сообщения (его карта, купон) это не проверяют.
  static canMarket(c, channel) {
    if (!c || c.do_not_contact == 1) return false;
    const hasCols = c.consent_email !== undefined && c.consent_email !== null;
    if (channel === 'telegram') return !!c.telegram_chat_id && (hasCols ? c.consent_telegram == 1 : !!c.marketing_consent);
    return !!c.email && (hasCols ? c.consent_email == 1 : !!c.marketing_consent);
  }
  canMarket(c, channel) { return Database.canMarket(c, channel); }
  consentStats() {
    const r = this.get(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN do_not_contact = 0 AND consent_email = 1 AND email != '' THEN 1 ELSE 0 END) AS email,
      SUM(CASE WHEN do_not_contact = 0 AND consent_telegram = 1 AND telegram_chat_id IS NOT NULL THEN 1 ELSE 0 END) AS telegram,
      SUM(CASE WHEN do_not_contact = 1 THEN 1 ELSE 0 END) AS excluded,
      SUM(CASE WHEN unsubscribed_at IS NOT NULL THEN 1 ELSE 0 END) AS unsubscribed,
      SUM(CASE WHEN consent_email = 0 AND consent_telegram = 0 THEN 1 ELSE 0 END) AS none
      FROM clients`) || {};
    return { total: r.total || 0, email: r.email || 0, telegram: r.telegram || 0, excluded: r.excluded || 0, unsubscribed: r.unsubscribed || 0, none: r.none || 0 };
  }
  listOptedOut() {
    return this.all(`SELECT id, name, email, phone, do_not_contact, unsubscribed_at, consent_email, consent_telegram FROM clients WHERE do_not_contact = 1 OR unsubscribed_at IS NOT NULL ORDER BY COALESCE(unsubscribed_at, '') DESC, name COLLATE NOCASE LIMIT 1000`);
  }

  getClients() {
    return this.all(`SELECT * FROM clients ORDER BY name COLLATE NOCASE`);
  }

  getClient(id) {
    return this.get(`SELECT * FROM clients WHERE id = ?`, [id]);
  }

  // ---------- привязка клиента к Telegram-боту этого бизнеса ----------
  // Код на deep-ссылку создаётся один раз и живёт постоянно (не одноразовый — если
  // клиент откроет ссылку повторно, она должна продолжать работать).
  getOrCreateTelegramLinkCode(clientId) {
    const row = this.get(`SELECT telegram_link_code FROM clients WHERE id = ?`, [clientId]);
    if (row && row.telegram_link_code) return row.telegram_link_code;
    const code = crypto.randomBytes(9).toString('base64url'); // короткий, URL-safe
    this.run(`UPDATE clients SET telegram_link_code = ? WHERE id = ?`, [code, clientId]);
    return code;
  }

  getClientByTelegramLinkCode(code) {
    return this.get(`SELECT * FROM clients WHERE telegram_link_code = ?`, [code]);
  }

  setClientTelegramChatId(clientId, chatId) {
    this.run(`UPDATE clients SET telegram_chat_id = ? WHERE id = ?`, [chatId, clientId]);
  }

  disconnectClientTelegram(clientId) {
    this.run(`UPDATE clients SET telegram_chat_id = NULL WHERE id = ?`, [clientId]);
  }

  // ---------- история отправок (email/Telegram) ----------
  logSend({ clientId, channel, subject, status, errorDetail, campaignId, purpose }) {
    this.run(
      `INSERT INTO send_history (client_id, channel, subject, status, error_detail, campaign_id, purpose) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [clientId || null, channel, subject || '', status, errorDetail || null, campaignId || null, purpose || (campaignId ? 'marketing' : 'service')]
    );
  }
  createCampaign({ kind, title, channels }) {
    return this.run(`INSERT INTO campaigns (kind, title, channels) VALUES (?, ?, ?)`, [String(kind || 'campaign').slice(0, 30), String(title || '').slice(0, 200), String(channels || '').slice(0, 40)]);
  }

  // ---------- отдача от рассылок ----------
  // Для каждого получателя смотрим, был ли визит (скан) в течение N дней ПОСЛЕ его письма.
  // Это не доказательство, что пришли именно из-за письма, но хорошо видно, какие письма работают лучше.
  _returnStats(recipientsSql, args, days) {
    const w = `+${days} days`;
    const inWin = `h.client_id = r.client_id AND h.created_at > r.sent_at AND h.created_at <= datetime(r.sent_at, ?)`;
    const r = this.get(`WITH r AS (${recipientsSql})
      SELECT COUNT(*) AS recipients,
        COALESCE(SUM(CASE WHEN EXISTS (SELECT 1 FROM scan_history h WHERE ${inWin}) THEN 1 ELSE 0 END), 0) AS returned,
        (SELECT COALESCE(SUM(h.amount_spent), 0) FROM scan_history h JOIN r r2 ON h.client_id = r2.client_id WHERE h.amount_spent > 0 AND h.created_at > r2.sent_at AND h.created_at <= datetime(r2.sent_at, ?)) AS revenue,
        (SELECT COUNT(*) FROM scan_history h JOIN r r2 ON h.client_id = r2.client_id WHERE h.created_at > r2.sent_at AND h.created_at <= datetime(r2.sent_at, ?)) AS visits,
        (SELECT COUNT(*) FROM scan_history h JOIN r r2 ON h.client_id = r2.client_id WHERE h.amount_spent > 0 AND h.created_at > r2.sent_at AND h.created_at <= datetime(r2.sent_at, ?)) AS purchases,
        (SELECT COUNT(*) FROM scan_history h JOIN r r2 ON h.client_id = r2.client_id WHERE h.result = 'reward' AND h.created_at > r2.sent_at AND h.created_at <= datetime(r2.sent_at, ?)) AS rewards,
        AVG((SELECT MIN(julianday(h.created_at)) FROM scan_history h WHERE ${inWin}) - julianday(r.sent_at)) AS avg_days,
        MIN(r.sent_at) AS first_sent, MAX(r.sent_at) AS last_sent
      FROM r`, [...args, w, w, w, w, w, w]) || {};
    return { recipients: r.recipients || 0, returned: r.returned || 0, revenue: Math.round((r.revenue || 0) * 100) / 100,
      visits: r.visits || 0, purchases: r.purchases || 0, rewards: r.rewards || 0,
      avgDays: r.avg_days == null ? null : Math.round(r.avg_days * 10) / 10, firstSent: r.first_sent || null, lastSent: r.last_sent || null };
  }
  setCampaignCost(id, cost) {
    const v = cost === null || cost === '' || cost === undefined ? null : Math.max(0, Math.round(Number(cost) * 100) / 100);
    if (v !== null && !Number.isFinite(v)) return { error: 'invalid_amount' };
    this.run(`UPDATE campaigns SET cost = ? WHERE id = ?`, [v, Number(id)]);
    return { ok: true, cost: v };
  }
  getCampaignReport({ days = 7, limit = 30 } = {}) {
    const d = Math.max(1, Math.min(60, Number(days) || 7));
    const out = [];
    // 1) рассылки с номером кампании
    for (const c of this.all(`SELECT * FROM campaigns WHERE created_at >= datetime('now', '-365 days') ORDER BY id DESC LIMIT ?`, [Math.min(100, limit)])) {
      const st = this._returnStats(`SELECT client_id, MIN(created_at) AS sent_at FROM send_history WHERE campaign_id = ? AND status = 'sent' AND client_id IS NOT NULL GROUP BY client_id`, [c.id], d);
      const sf = this.get(`SELECT COALESCE(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 0) AS sent, COALESCE(SUM(CASE WHEN status != 'sent' THEN 1 ELSE 0 END), 0) AS failed FROM send_history WHERE campaign_id = ?`, [c.id]) || {};
      if (st.recipients) out.push({ key: 'c' + c.id, id: c.id, kind: c.kind, title: c.title, channels: c.channels, createdAt: st.firstSent || c.created_at, sent: sf.sent || 0, failed: sf.failed || 0, cost: c.cost == null ? null : c.cost, ...st });
    }
    // 2) старые рассылки (до учёта кампаний): одна тема в один день, от 3 получателей
    for (const g of this.all(`SELECT subject, date(created_at) AS day, MIN(created_at) AS at, GROUP_CONCAT(DISTINCT channel) AS channels, COUNT(DISTINCT client_id) AS n
        FROM send_history WHERE campaign_id IS NULL AND status = 'sent' AND client_id IS NOT NULL AND created_at >= datetime('now', '-365 days')
        GROUP BY subject, day HAVING n >= 3 ORDER BY at DESC LIMIT ?`, [Math.min(50, limit)])) {
      const st = this._returnStats(`SELECT client_id, MIN(created_at) AS sent_at FROM send_history WHERE campaign_id IS NULL AND status = 'sent' AND client_id IS NOT NULL AND subject = ? AND date(created_at) = ? GROUP BY client_id`, [g.subject, g.day], d);
      if (st.recipients) out.push({ key: 'g' + g.day + g.subject, kind: 'campaign', title: g.subject, channels: (g.channels || '').replace(/,/g, '+'), createdAt: g.at, ...st });
    }
    // 3) автоматические письма — по правилам за 90 дней
    for (const a of this.all(`SELECT rule, COUNT(*) AS n FROM automation_log WHERE sent_at >= datetime('now', '-90 days') GROUP BY rule`)) {
      const st = this._returnStats(`SELECT client_id, sent_at FROM automation_log WHERE rule = ? AND sent_at >= datetime('now', '-90 days')`, [a.rule], d);
      if (st.recipients) out.push({ key: 'a' + a.rule, kind: 'auto', rule: a.rule, title: a.rule, channels: 'email', createdAt: st.lastSent, ...st });
    }
    out.forEach(x => {
      x.rate = x.recipients ? Math.round(x.returned / x.recipients * 1000) / 10 : 0;
      // окно ещё не закончилось — цифры будут расти
      const ref = x.kind === 'auto' ? null : x.createdAt;
      x.inProgress = !!(ref && (Date.now() - new Date(String(ref).replace(' ', 'T') + 'Z').getTime()) < d * 86400000);
    });
    // Ориентир: какая доля постоянных клиентов (были за 90 дней) приходит за любые N дней сама по себе.
    const base90 = (this.get(`SELECT COUNT(DISTINCT client_id) AS n FROM scan_history WHERE created_at >= datetime('now', '-90 days')`) || {}).n || 0;
    const baseN = (this.get(`SELECT COUNT(DISTINCT client_id) AS n FROM scan_history WHERE created_at >= datetime('now', ?)`, [`-${d} days`]) || {}).n || 0;
    const baselineRate = base90 ? Math.round(baseN / base90 * 1000) / 10 : null;
    // Средняя стоимость одной награды (подарка) — если владелец её указал; без неё затраты на награды не считаем.
    const rc = Number(this.getSettings().reward_cost);
    const rewardCost = Number.isFinite(rc) && rc > 0 ? rc : null;
    out.forEach(x => {
      // Сколько пришло бы и без письма (обычная посещаемость) — вычитаем; это ОЦЕНКА, не доказанный эффект.
      x.extraEstimate = baselineRate === null ? null : Math.max(0, Math.round((x.returned - x.recipients * baselineRate / 100) * 10) / 10);
      x.rewardsCost = rewardCost === null ? null : Math.round(x.rewards * rewardCost * 100) / 100;
      const costs = (x.rewardsCost || 0) + (x.cost || 0);
      x.revenueMinusCosts = (x.rewardsCost === null && x.cost == null) ? null : Math.round((x.revenue - costs) * 100) / 100;
    });
    out.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return { days: d, baselineRate, rewardCost, items: out.slice(0, limit) };
  }

  // ---------- эта неделя / прошлая ----------
  // Последние 7 дней против предыдущих 7 (скользящие окна — честное сравнение в любой день недели).
  getWeekComparison() {
    const range = (from, to) => {
      const v = this.get(`SELECT COUNT(*) AS visits, COUNT(DISTINCT client_id) AS clients, COALESCE(SUM(CASE WHEN result = 'reward' THEN 1 ELSE 0 END), 0) AS rewards,
        COALESCE(SUM(CASE WHEN amount_spent > 0 THEN amount_spent ELSE 0 END), 0) AS revenue, COALESCE(SUM(CASE WHEN amount_spent > 0 THEN 1 ELSE 0 END), 0) AS checks
        FROM scan_history WHERE created_at >= datetime('now', ?) AND created_at < datetime('now', ?)`, [from, to]) || {};
      const n = this.get(`SELECT COUNT(*) AS n FROM clients WHERE created_at >= datetime('now', ?) AND created_at < datetime('now', ?)`, [from, to]) || {};
      const r = this.get(`SELECT COUNT(*) AS n, COALESCE(SUM(total), 0) AS sum FROM receipts WHERE created_at >= datetime('now', ?) AND created_at < datetime('now', ?)`, [from, to]) || {};
      return { visits: v.visits || 0, clients: v.clients || 0, newClients: n.n || 0, rewards: v.rewards || 0, revenue: Math.round((v.revenue || 0) * 100) / 100,
        avgCheck: v.checks ? Math.round(v.revenue / v.checks * 100) / 100 : 0, receipts: r.n || 0, sales: Math.round((r.sum || 0) * 100) / 100 };
    };
    return { current: range('-7 days', '+1 minute'), previous: range('-14 days', '-7 days') };
  }

  // ---------- досье клиента (показываем после скана) ----------
  getClientInsight(clientId) {
    const id = Number(clientId); const c = this.getClient(id);
    if (!c) return null;
    const v = this.get(`SELECT COUNT(*) AS visits, MIN(created_at) AS first, MAX(created_at) AS last FROM scan_history WHERE client_id = ?`, [id]) || {};
    // предыдущий визит — второй с конца (последний обычно и есть текущий скан)
    const prev = this.all(`SELECT created_at FROM scan_history WHERE client_id = ? ORDER BY created_at DESC LIMIT 2`, [id]);
    // Если последний визит — только что (этот скан), прошлым считаем предыдущий. У накопительной карты
    // визит записывается после ввода суммы, поэтому в момент скана последний визит и есть прошлый.
    const justNow = prev[0] && (Date.now() - new Date(String(prev[0].created_at).replace(' ', 'T') + 'Z').getTime()) < 120000;
    const lastBefore = justNow ? (prev[1] ? prev[1].created_at : null) : (prev[0] ? prev[0].created_at : null);
    const daysSince = (t) => t ? Math.max(0, Math.floor((Date.now() - new Date(String(t).replace(' ', 'T') + 'Z').getTime()) / 86400000)) : null;
    const span = v.visits > 1 ? (new Date(String(v.last).replace(' ', 'T') + 'Z') - new Date(String(v.first).replace(' ', 'T') + 'Z')) / 86400000 : null;
    const spent = this.get(`SELECT COALESCE(SUM(amount_spent), 0) AS s, COUNT(*) AS n FROM scan_history WHERE client_id = ? AND amount_spent > 0`, [id]) || {};
    // что обычно берёт: по чекам из кассы, привязанным к клиенту
    const counts = {};
    for (const r of this.all(`SELECT items FROM receipts WHERE client_id = ? ORDER BY id DESC LIMIT 200`, [id])) {
      let items = []; try { items = JSON.parse(r.items || '[]'); } catch (e) { /* пусто */ }
      for (const it of items) { const name = String(it.name || it.sku || it.barcode || '').trim(); if (!name) continue; counts[name] = (counts[name] || 0) + (Number(it.qty) || 1); }
    }
    const topItems = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, qty]) => ({ name, qty: Math.round(qty * 100) / 100 }));
    const recAgg = this.get(`SELECT COUNT(*) AS n, COALESCE(SUM(total), 0) AS sum FROM receipts WHERE client_id = ?`, [id]) || {};
    let birthdayInDays = null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(c.birthday || '')) {
      const now = new Date(); const [, mm, dd] = c.birthday.split('-').map(Number);
      let next = new Date(now.getFullYear(), mm - 1, dd); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (next < today) next = new Date(now.getFullYear() + 1, mm - 1, dd);
      birthdayInDays = Math.round((next - today) / 86400000);
    }
    return {
      id, name: c.name, notes: c.notes || '', visits: v.visits || 0, firstVisit: v.first || null, lastBefore, daysSinceLast: daysSince(lastBefore),
      avgGapDays: span != null && v.visits > 1 ? Math.round(span / (v.visits - 1) * 10) / 10 : null,
      spentTotal: Math.round((spent.s || 0) * 100) / 100, avgCheck: spent.n ? Math.round(spent.s / spent.n * 100) / 100 : 0,
      receipts: recAgg.n || 0, receiptsTotal: Math.round((recAgg.sum || 0) * 100) / 100, topItems,
      birthdayInDays: birthdayInDays != null && birthdayInDays <= 14 ? birthdayInDays : null, isNew: (v.visits || 0) <= 1
    };
  }

  getSendHistory(limit = 100) {
    return this.all(`
      SELECT send_history.*, clients.name AS client_name
      FROM send_history LEFT JOIN clients ON clients.id = send_history.client_id
      ORDER BY send_history.id DESC LIMIT ?
    `, [limit]);
  }

  getSendHistoryForClient(clientId, limit = 20) {
    return this.all(`SELECT * FROM send_history WHERE client_id = ? ORDER BY id DESC LIMIT ?`, [clientId, limit]);
  }

  // Поиск по телефону без учёта форматирования (пробелы/скобки/дефисы) — для защиты от дублей при саморегистрации.
  getClientByPhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return null;
    const rows = this.all(`SELECT * FROM clients WHERE phone IS NOT NULL AND TRIM(phone) != ''`);
    // Один и тот же номер пишут по-разному: «+421 900 123 456», «0900 123 456», «00421…».
    // Сравниваем по последним 9 цифрам (номер без кода страны и ведущего нуля).
    const tail = (d) => d.length >= 9 ? d.slice(-9) : d;
    return rows.find(c => {
      const other = String(c.phone).replace(/\D/g, '');
      return other === digits || (digits.length >= 9 && other.length >= 9 && tail(other) === tail(digits));
    }) || null;
  }

  getClientByEmail(email) {
    const e = String(email || '').trim().toLowerCase();
    if (!e) return null;
    return this.get(`SELECT * FROM clients WHERE LOWER(email) = ?`, [e]);
  }

  // 2.18: «Это один и тот же клиент» — переносим всё с дубля на основного клиента и удаляем дубль.
  // Карты, визиты, подарки, история отправок, чеки — во всех таблицах, где есть client_id.
  // Пустые поля основного заполняются из дубля, счётчики складываются. В общей базе изменения уходят на другие устройства.
  findPossibleDuplicates(id) {
    const c = this.getClient(id); if (!c) return [];
    const digits = (v) => String(v || '').replace(/\D/g, '');
    const ph = digits(c.phone).slice(-9), em = String(c.email || '').trim().toLowerCase(), nm = String(c.name || '').trim().toLowerCase();
    return this.all(`SELECT id, name, phone, email, created_at, (SELECT COUNT(*) FROM cards WHERE client_id = clients.id) AS cards, lifetime_purchases FROM clients WHERE id != ?`, [id])
      .map((r) => ({ ...r, score: (ph.length >= 7 && digits(r.phone).slice(-9) === ph ? 3 : 0) + (em && String(r.email || '').trim().toLowerCase() === em ? 3 : 0) + (nm && String(r.name || '').trim().toLowerCase() === nm ? 2 : 0) }))
      .filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 10);
  }
  mergeClients(keepId, dropId) {
    keepId = Number(keepId); dropId = Number(dropId);
    if (!keepId || !dropId || keepId === dropId) return { error: 'bad_ids' };
    const keep = this.getClient(keepId), drop = this.getClient(dropId);
    if (!keep || !drop) return { error: 'not_found' };
    let moved = 0;
    this.batch(() => {
      const tables = this.all(`SELECT name FROM main.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sync_%' AND name NOT LIKE 'sqlite_%'`).map((r) => r.name);
      for (const tb of tables) {
        if (tb === 'clients') continue;
        if (!this.all(`PRAGMA table_info(${tb})`).some((c) => c.name === 'client_id')) continue;
        const n = this.get(`SELECT COUNT(*) AS n FROM ${tb} WHERE client_id = ?`, [dropId]).n;
        if (n) { this.run(`UPDATE ${tb} SET client_id = ? WHERE client_id = ?`, [keepId, dropId]); moved += n; }
      }
      this.run(`UPDATE clients SET referred_by = ? WHERE referred_by = ?`, [keepId, dropId]);
      const pick = (a, b) => (a !== null && a !== undefined && String(a).trim() !== '' ? a : b);
      const notes = [keep.notes, drop.notes].map((x) => String(x || '').trim()).filter(Boolean).filter((x, i, arr) => arr.indexOf(x) === i).join('\n').slice(0, 2000);
      const older = String(drop.created_at || '9') < String(keep.created_at || '9') ? drop.created_at : keep.created_at;
      this.run(`UPDATE clients SET email = ?, phone = ?, birthday = ?, notes = ?, preferred_language = ?, telegram_chat_id = ?, lifetime_purchases = ?, lifetime_rewards = ?,
        consent_email = ?, consent_telegram = ?, marketing_consent = ?, created_at = ?, referred_by = ? WHERE id = ?`,
        [pick(keep.email, drop.email) || '', pick(keep.phone, drop.phone) || '', pick(keep.birthday, drop.birthday) || '', notes, pick(keep.preferred_language, drop.preferred_language) || '',
          pick(keep.telegram_chat_id, drop.telegram_chat_id) || null, (keep.lifetime_purchases || 0) + (drop.lifetime_purchases || 0), (keep.lifetime_rewards || 0) + (drop.lifetime_rewards || 0),
          (keep.consent_email || drop.consent_email) ? 1 : 0, (keep.consent_telegram || drop.consent_telegram) ? 1 : 0, (keep.marketing_consent || drop.marketing_consent) ? 1 : 0,
          older, keep.referred_by === dropId ? null : (keep.referred_by || (drop.referred_by !== keepId ? drop.referred_by : null) || null), keepId]);
      this.run(`DELETE FROM clients WHERE id = ?`, [dropId]);
    });
    return { ok: true, moved, client: this.getClient(keepId) };
  }

  deleteClient(id) {
    this.run(`DELETE FROM scan_history WHERE client_id = ?`, [id]);
    this.run(`DELETE FROM cards WHERE client_id = ?`, [id]);
    this.run(`DELETE FROM clients WHERE id = ?`, [id]);
  }

  // Дни рождения в ближайшие daysAhead дней (сравнение по месяцу/дню, год не важен), включая сегодня.
  getUpcomingBirthdays(daysAhead = 14) {
    const clients = this.all(`SELECT * FROM clients WHERE birthday IS NOT NULL AND birthday != ''`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = [];
    for (const c of clients) {
      const bd = new Date(c.birthday);
      if (isNaN(bd.getTime())) continue;
      const next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
      if (next < today) next.setFullYear(today.getFullYear() + 1);
      const diffDays = Math.round((next - today) / 86400000);
      if (diffDays <= daysAhead) {
        result.push({ ...c, daysUntil: diffDays, isToday: diffDays === 0 });
      }
    }
    result.sort((a, b) => a.daysUntil - b.daysUntil);
    return result;
  }

  getTodayBirthdays() {
    return this.getUpcomingBirthdays(0).filter(c => c.isToday);
  }

  // ---------- cards ----------
  createCard({ clientId, type, title, discountPercent, stampTarget, spendTarget, spendBonusText, spendBonusPoints, code: forcedCode, expiresAt, singleUse, source, giftAmount, giftMonths }) {
    this._guard('cards');
    if (type === 'gift') return this.createGiftCard({ clientId, title, giftAmount, giftMonths, code: forcedCode, source });
    if (!['discount', 'stamp', 'spend'].includes(type)) type = 'stamp';
    const code = forcedCode || ('LC-' + crypto.randomBytes(6).toString('hex').toUpperCase());
    const pts = Database.bonusPoints(spendBonusPoints);
    this.run(
      `INSERT INTO cards (client_id, type, title, discount_percent, stamp_target, stamp_count, spend_target, spend_accumulated, spend_bonus_text, code, expires_at, single_use, source, bonus_balance, spend_bonus_points)
       VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?, ?, ?, ?, ?, 0, ?)`,
      [clientId, type, title || '', discountPercent || null, stampTarget || null, spendTarget || null, spendBonusText || null, code, expiresAt || null, singleUse ? 1 : 0, source || null, pts]
    );
    return this.getCardByCode(code);
  }

  // ---------- 2.19: подарочный сертификат ----------
  // Карта типа gift: номинал (gift_amount) и остаток (gift_balance). На кассе сканируют и списывают сумму
  // покупки (целиком или частями), пока остаток не станет 0. Срок — по умолчанию 12 месяцев.
  createGiftCard({ clientId, title, giftAmount, giftMonths, code: forcedCode, source }) {
    const amount = Math.round(Number(String(giftAmount == null ? '' : giftAmount).replace(',', '.')) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) return { error: 'invalid_amount' };
    const months = Math.max(0, Math.min(60, Math.round(Number(giftMonths == null ? 12 : giftMonths)) || 0));
    let expires = null;
    if (months > 0) { const d = new Date(); d.setMonth(d.getMonth() + months); expires = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
    const code = forcedCode || ('GC-' + crypto.randomBytes(6).toString('hex').toUpperCase());
    this.run(`INSERT INTO cards (client_id, type, title, stamp_count, spend_accumulated, code, expires_at, single_use, source, bonus_balance, spend_bonus_points, gift_amount, gift_balance)
       VALUES (?, 'gift', ?, 0, 0, ?, ?, 0, ?, 0, 1, ?, ?)`, [clientId, String(title || '').slice(0, 80), code, expires, source || 'gift', amount, amount]);
    return this.getCardByCode(code);
  }
  redeemGift(cardId, rawAmount) {
    const card = this.getCardById(cardId);
    if (!card) return { error: 'not_found' };
    if (card.type !== 'gift') return { error: 'not_gift' };
    if (this.isCardExpired(card)) return { error: 'expired', card };
    const amount = Math.round(Number(String(rawAmount).replace(',', '.')) * 100) / 100;
    const bal = Math.round((Number(card.gift_balance) || 0) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) return { error: 'invalid_amount' };
    if (amount > bal + 0.001) return { error: 'gift_not_enough', balance: bal };
    const left = Math.max(0, Math.round((bal - amount) * 100) / 100);
    this.run(`UPDATE cards SET gift_balance = ?, redeemed_count = redeemed_count + 1 WHERE id = ?`, [left, cardId]);
    const ctx = this.scanContext || {};
    const historyId = this.run(`INSERT INTO scan_history (card_id, client_id, result, amount_spent, staff_id, location_id, source) VALUES (?, ?, 'gift', ?, ?, ?, ?)`,
      [cardId, card.client_id, amount, ctx.staffId || null, Number(this.getSettings().current_location_id) || null, ctx.source || 'desk']);
    this.run(`UPDATE clients SET lifetime_purchases = lifetime_purchases + 1 WHERE id = ?`, [card.client_id]);
    this.lastScan = { historyId, cardId, clientId: card.client_id, giftBalance: bal, redeemedCount: card.redeemed_count, isGiftUndo: true, clientName: this.getClient(card.client_id).name };
    this.notifyCardChanged(cardId);
    return { ok: true, amount, balance: left, card: this.getCardById(cardId) };
  }

  // ---------- 2.19: уровни клиентов с привилегиями ----------
  // Пороги настраиваются (по умолчанию 50 и 100 покупок, как раньше). Привилегия уровня: штампы и бонусы ×N
  // и/или скидка уровня (показывается кассиру при скане).
  tierConfig(st) {
    const s = st || this.getSettings();
    const n = (v, d, min, max) => { const x = Math.round(Number(v)); return Number.isFinite(x) && x >= min && x <= max ? x : d; };
    const silver = n(s.tier_silver_at, 50, 2, 100000);
    const gold = Math.max(silver + 1, n(s.tier_gold_at, 100, 3, 100000));
    const on = s.tier_perks_on === '1';
    return {
      silver, gold, on,
      perks: {
        basic: { mult: 1, disc: 0 },
        silver: { mult: on ? n(s.tier_silver_mult, 1, 1, 3) : 1, disc: on ? n(s.tier_silver_disc, 0, 0, 50) : 0 },
        gold: { mult: on ? n(s.tier_gold_mult, 2, 1, 3) : 1, disc: on ? n(s.tier_gold_disc, 5, 0, 50) : 0 }
      }
    };
  }
  tierOf(count, cfg) { const c = cfg || this.tierConfig(); return count >= c.gold ? 'gold' : count >= c.silver ? 'silver' : 'basic'; }
  _clientTier(clientId, cfg) { const r = this.get(`SELECT lifetime_purchases AS n FROM clients WHERE id = ?`, [clientId]); return this.tierOf(r ? r.n || 0 : 0, cfg); }

  // ---------- 2.19: сгорание бонусов ----------
  // Если по карте не было визитов N месяцев, бонусы (и, если включено, штампы) сгорают. За неделю до этого
  // клиенту уходит напоминание (сценарий автоматики «expiry»). Сертификаты и скидочные карты не сгорают.
  expiryMonths(st) { const m = Math.round(Number((st || this.getSettings()).bonus_expiry_months)); return [3, 6, 9, 12, 18, 24].includes(m) ? m : 0; }
  _lastActivity(card) {
    const r = this.get(`SELECT MAX(created_at) AS t FROM scan_history WHERE card_id = ?`, [card.id]);
    return (r && r.t) || card.created_at || null;
  }
  // Дата сгорания (ГГГГ-ММ-ДД) для карты или null (нечему сгорать / функция выключена).
  cardExpiryDate(card, st) {
    const s = st || this.getSettings(); const m = this.expiryMonths(s);
    if (!m || !card) return null;
    const stamps = s.bonus_expiry_stamps === '1';
    const hasValue = (card.type === 'spend' && (Number(card.bonus_balance) || 0) > 0) || (stamps && card.type === 'stamp' && (Number(card.stamp_count) || 0) > 0);
    if (!hasValue) return null;
    const last = this._lastActivity(card); if (!last) return null;
    const d = new Date(String(last).replace(' ', 'T') + (String(last).length <= 10 ? 'T12:00:00' : 'Z'));
    if (isNaN(d.getTime())) return null;
    d.setMonth(d.getMonth() + m);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  _expiryCandidates(st) {
    const s = st || this.getSettings();
    const stamps = s.bonus_expiry_stamps === '1';
    return this.all(`SELECT * FROM cards WHERE (type = 'spend' AND bonus_balance > 0)${stamps ? ` OR (type = 'stamp' AND stamp_count > 0)` : ''}`);
  }
  // Клиенты, у которых что-то сгорит в ближайшие days дней (для напоминания).
  expiringSoon(days = 7) {
    const s = this.getSettings(); if (!this.expiryMonths(s)) return [];
    const today = this._todayLocal();
    const lim = new Date(); lim.setDate(lim.getDate() + days);
    const until = `${lim.getFullYear()}-${String(lim.getMonth() + 1).padStart(2, '0')}-${String(lim.getDate()).padStart(2, '0')}`;
    const out = new Map();
    for (const c of this._expiryCandidates(s)) {
      const e = this.cardExpiryDate(c, s);
      if (e && e > today && e <= until) {
        const o = out.get(c.client_id) || { clientId: c.client_id, date: e, bonus: 0, stamps: 0 };
        if (c.type === 'spend') o.bonus += Math.round(Number(c.bonus_balance) || 0); else o.stamps += Number(c.stamp_count) || 0;
        if (e < o.date) o.date = e;
        out.set(c.client_id, o);
      }
    }
    return [...out.values()];
  }
  burnExpired() {
    const s = this.getSettings(); if (!this.expiryMonths(s)) return { burned: 0 };
    const today = this._todayLocal(); let burned = 0;
    for (const c of this._expiryCandidates(s)) {
      const e = this.cardExpiryDate(c, s);
      if (!e || e > today) continue;
      const bonus = c.type === 'spend' ? Number(c.bonus_balance) || 0 : 0;
      const stamps = c.type === 'stamp' ? Number(c.stamp_count) || 0 : 0;
      if (c.type === 'spend') this.run(`UPDATE cards SET bonus_balance = 0 WHERE id = ?`, [c.id]);
      else this.run(`UPDATE cards SET stamp_count = 0 WHERE id = ?`, [c.id]);
      this.run(`INSERT INTO expiry_log (card_id, client_id, bonus, stamps) VALUES (?, ?, ?, ?)`, [c.id, c.client_id, bonus, stamps]);
      this.notifyCardChanged(c.id); burned++;
    }
    return { burned };
  }
  expiryStats(days = 30) {
    return this.get(`SELECT COUNT(*) AS n, COALESCE(SUM(bonus), 0) AS bonus, COALESCE(SUM(stamps), 0) AS stamps FROM expiry_log WHERE created_at >= datetime('now', ?)`, [`-${Math.max(1, Number(days) || 30)} days`]);
  }

  // Постоянная карта по настройкам саморегистрации («Настройки → Саморегистрация клиентов»).
  createDefaultCard(clientId, opts = {}) {
    const st = this.getSettings();
    const extra = { ...(opts.code ? { code: opts.code } : {}), ...(opts.source ? { source: opts.source } : {}) };
    const type = ['discount', 'spend'].includes(st.selfreg_card_type) ? st.selfreg_card_type : 'stamp';
    // 2.25: «штампы + скидка» — штамп-карта с постоянной скидкой
    if (st.selfreg_card_type === 'combo') return this.createCard({ clientId, type: 'stamp', title: st.selfreg_stamp_title || '', stampTarget: Number(st.selfreg_stamp_target) || 10, discountPercent: Math.max(1, Math.min(90, Number(st.selfreg_discount_percent) || 5)), ...extra });
    if (type === 'discount') return this.createCard({ clientId, type, title: st.selfreg_discount_title || '', discountPercent: Number(st.selfreg_discount_percent) || 5, ...extra });
    if (type === 'spend') return this.createCard({ clientId, type, title: st.selfreg_spend_title || '', spendTarget: Number(st.selfreg_spend_target) || 500, spendBonusPoints: Number(st.selfreg_spend_points) || 1, ...extra });
    return this.createCard({ clientId, type: 'stamp', title: st.selfreg_stamp_title || '', stampTarget: Number(st.selfreg_stamp_target) || 10, ...extra });
  }
  hasPermanentCard(clientId) {
    return !!this.get(`SELECT id FROM cards WHERE client_id = ? AND (single_use IS NULL OR single_use = 0) AND type != 'gift' LIMIT 1`, [clientId]);
  }
  // Местная дата ГГГГ-ММ-ДД (срок бонуса считается по календарю заведения, а не по UTC).
  _todayLocal() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  isCardExpired(card) { return !!(card && card.expires_at && String(card.expires_at).slice(0, 10) < this._todayLocal()); }
  getOnlineBonusStats() {
    const today = this._todayLocal();
    const row = this.get(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN redeemed_count > 0 THEN 1 ELSE 0 END) AS used,
      SUM(CASE WHEN redeemed_count = 0 AND expires_at IS NOT NULL AND expires_at < ? THEN 1 ELSE 0 END) AS expired,
      SUM(CASE WHEN redeemed_count = 0 AND (expires_at IS NULL OR expires_at >= ?) THEN 1 ELSE 0 END) AS active
      FROM cards WHERE source = 'online' AND single_use = 1`, [today, today]) || {};
    const d = new Date(); d.setDate(d.getDate() + 2);
    const soon = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const s2 = this.get(`SELECT COUNT(*) AS n FROM cards WHERE source = 'online' AND single_use = 1 AND redeemed_count = 0 AND expires_at IS NOT NULL AND expires_at >= ? AND expires_at <= ?`, [today, soon]) || {};
    return { total: row.total || 0, used: row.used || 0, expired: row.expired || 0, active: row.active || 0, expiringSoon: s2.n || 0 };
  }

  getCards() {
    return this.all(`
      SELECT cards.*, clients.name AS client_name, clients.email AS client_email, clients.notes AS client_notes, clients.preferred_language AS client_language,
        (clients.telegram_chat_id IS NOT NULL AND clients.telegram_chat_id != '') AS client_has_tg
      FROM cards JOIN clients ON clients.id = cards.client_id
      ORDER BY cards.created_at DESC
    `);
  }

  getCardsByClient(clientId) {
    return this.all(`SELECT * FROM cards WHERE client_id = ? ORDER BY created_at DESC`, [clientId]);
  }

  getCardByCode(code) {
    return this.get(`
      SELECT cards.*, clients.name AS client_name, clients.email AS client_email, clients.notes AS client_notes, clients.preferred_language AS client_language
      FROM cards JOIN clients ON clients.id = cards.client_id
      WHERE cards.code = ?
    `, [code]);
  }

  deleteCard(id) {
    this.run(`DELETE FROM scan_history WHERE card_id = ?`, [id]);
    this.run(`DELETE FROM cards WHERE id = ?`, [id]);
  }

  getCardById(id) {
    return this.get(`
      SELECT cards.*, clients.name AS client_name, clients.email AS client_email, clients.notes AS client_notes, clients.preferred_language AS client_language
      FROM cards JOIN clients ON clients.id = cards.client_id
      WHERE cards.id = ?
    `, [id]);
  }

  setCardTemplateId(cardId, templateId) {
    this.run(`UPDATE cards SET card_template_id = ? WHERE id = ?`, [templateId, cardId]);
  }

  // Обработка скана карты у стойки (по QR-коду)
  scanCode(code) {
    const card = this.getCardByCode(code);
    if (!card) return { error: 'not_found' };
    // Защита от случайного двойного скана и накруток: ту же карту нельзя отметить
    // повторно раньше, чем через заданное в настройках время (0 — защита выключена).
    // Даже если защита выключена, повтор той же карты в течение 15 секунд — почти всегда двойное
    // срабатывание сканера или лишний Enter: спрашиваем (кнопка «Всё равно отметить» остаётся).
    const cooldownMin = Number(this.getSettings().scan_cooldown_min) || 0.25;
    if (cooldownMin > 0 && card.type !== 'spend' && card.type !== 'gift') {
      const last = this.get(`SELECT (julianday('now') - julianday(created_at)) * 1440 AS mins FROM scan_history WHERE card_id = ? ORDER BY id DESC LIMIT 1`, [card.id]);
      if (last && last.mins < cooldownMin) {
        return { error: 'too_soon', minutesAgo: Math.max(0, Math.floor(last.mins)), cooldown: cooldownMin, card: this.getCardById(card.id) };
      }
    }
    return this._processScan(card);
  }

  markWalletLinked(cardId) { this.run(`UPDATE cards SET wallet_linked = 1 WHERE id = ? AND (wallet_linked IS NULL OR wallet_linked = 0)`, [cardId]); }
  notifyCardChanged(cardId) { if (this.onCardChanged && cardId) { try { this.onCardChanged(cardId); } catch (e) { /* не критично */ } } }

  // Отметить несмотря на защиту от повторного скана (сотрудник подтвердил вручную).
  scanCodeForce(code) {
    const card = this.getCardByCode(code);
    if (!card) return { error: 'not_found' };
    return this._processScan(card);
  }

  // «Двойные штампы»: в выбранные дни и часы каждый скан штамп-карты даёт ×2 или ×3 штампа.
  currentStampMultiplier(now = new Date()) {
    const s = this.getSettings();
    if (s.bonus_stamps_enabled !== '1') return 1;
    const mult = Math.max(1, Math.min(5, Number(s.bonus_stamps_mult) || 2));
    const days = String(s.bonus_stamps_days || '').split(',').filter(Boolean).map(Number);
    if (days.length && !days.includes(now.getDay())) return 1;
    const toMin = (str) => { const [h, m] = String(str || '').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
    const from = s.bonus_stamps_from ? toMin(s.bonus_stamps_from) : 0;
    const to = s.bonus_stamps_to ? toMin(s.bonus_stamps_to) : 24 * 60;
    const cur = now.getHours() * 60 + now.getMinutes();
    const inWindow = from <= to ? (cur >= from && cur < to) : (cur >= from || cur < to);
    return inWindow ? mult : 1;
  }

  // 2.23: первый скан карты из саморегистрации (Wi-Fi или по ссылке), если акция включена.
  isWelcomeScan(card) {
    if (!card || card.type !== 'stamp' || this.getSettings().welcome_double !== '1') return false;
    if (!['selfreg', 'online_join'].includes(card.source)) return false;
    return !this.get(`SELECT 1 AS x FROM scan_history WHERE card_id = ? LIMIT 1`, [card.id]);
  }

  // ---------- 2.20: «Приведи друга» ----------
  // Награда — N штампов на первую штамп-карту (не дальше «последнего перед подарком») или N бонусов на накопительную.
  _giveReward(clientId, n) {
    n = Math.max(0, Math.min(10, Math.round(Number(n) || 0)));
    if (!clientId || !n) return null;
    const stamp = this.get(`SELECT * FROM cards WHERE client_id = ? AND type = 'stamp' ORDER BY id LIMIT 1`, [clientId]);
    if (stamp) {
      const newCount = Math.min(stamp.stamp_target - 1, stamp.stamp_count + n);
      if (newCount > stamp.stamp_count) { this.run(`UPDATE cards SET stamp_count = ? WHERE id = ?`, [newCount, stamp.id]); this.notifyCardChanged(stamp.id); }
      return { kind: 'stamps', n: Math.max(0, newCount - stamp.stamp_count), cardId: stamp.id };
    }
    const spend = this.get(`SELECT * FROM cards WHERE client_id = ? AND type = 'spend' ORDER BY id LIMIT 1`, [clientId]);
    if (spend) { this.run(`UPDATE cards SET bonus_balance = COALESCE(bonus_balance, 0) + ? WHERE id = ?`, [n, spend.id]); this.notifyCardChanged(spend.id); return { kind: 'bonus', n, cardId: spend.id }; }
    return null;
  }
  refConfig(st) {
    st = st || this.getSettings();
    const num = (v, d) => { const x = Math.round(Number(v)); return Number.isFinite(x) && x >= 0 && x <= 10 ? x : d; };
    return { on: st.referral_enabled === '1', referrer: num(st.referral_bonus_stamps, 1), friend: num(st.referral_friend_stamps, 1), when: st.referral_when === 'signup' ? 'signup' : 'visit' };
  }
  // Новый гость пришёл по приглашению: связываем, другу — подарок сразу (на его новую карту),
  // пригласившему — после первого визита друга (или сразу, если так выбрано в настройках).
  applyReferral(referrerId, newClientId) {
    if (!referrerId || referrerId === newClientId) return null;
    const cfg = this.refConfig();
    const fresh = this.get(`SELECT referred_by, phone FROM clients WHERE id = ?`, [newClientId]);
    const ref = this.get(`SELECT id, phone FROM clients WHERE id = ?`, [referrerId]);
    if (!fresh || !ref || fresh.referred_by) return null;
    const digits = (v) => String(v || '').replace(/\D/g, '').slice(-9);
    if (digits(fresh.phone) && digits(fresh.phone) === digits(ref.phone)) return null;   // сам себя не приглашает
    this.run(`UPDATE clients SET referred_by = ?, ref_reward_done = 0 WHERE id = ?`, [referrerId, newClientId]);
    const friendGift = this._giveReward(newClientId, cfg.friend);
    let referrerGift = null;
    if (cfg.when === 'signup') { referrerGift = this._giveReward(referrerId, cfg.referrer); this.run(`UPDATE clients SET ref_reward_done = 1 WHERE id = ?`, [newClientId]); }
    return { referrerId, bonus: cfg.referrer, friendGift, referrerGift };
  }
  // После визита (покупки): если гость пришёл по приглашению и награда пригласившему ещё не выдана — выдаём.
  _afterVisit(clientId) {
    const c = this.get(`SELECT id, name, referred_by, ref_reward_done FROM clients WHERE id = ?`, [clientId]);
    if (!c || !c.referred_by || c.ref_reward_done) return null;
    const cfg = this.refConfig();
    if (!cfg.on || cfg.when !== 'visit') return null;
    this.run(`UPDATE clients SET ref_reward_done = 1 WHERE id = ?`, [clientId]);
    const gift = this._giveReward(c.referred_by, cfg.referrer);
    const r = this.get(`SELECT id, name FROM clients WHERE id = ?`, [c.referred_by]);
    const info = r ? { referrerId: r.id, referrerName: r.name, friendName: c.name, gift } : null;
    if (info && this.onReferralReward) { try { this.onReferralReward(info); } catch (e) { /* уведомление не критично */ } }
    return info;
  }
  // Личный код приглашения гостя (6 символов, без похожих букв).
  refCodeFor(clientId) {
    const c = this.get(`SELECT ref_code FROM clients WHERE id = ?`, [clientId]);
    if (!c) return null;
    if (c.ref_code) return c.ref_code;
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 20; i++) {
      const code = Array.from(crypto.randomBytes(6)).map(b => A[b % A.length]).join('');
      if (!this.get(`SELECT 1 FROM clients WHERE ref_code = ?`, [code])) { this.run(`UPDATE clients SET ref_code = ? WHERE id = ?`, [code, clientId]); return code; }
    }
    return null;
  }
  getClientByRefCode(code) {
    const c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return c.length >= 4 ? this.get(`SELECT * FROM clients WHERE ref_code = ?`, [c]) || null : null;
  }
  referralsOf(clientId) {
    return this.all(`SELECT id, name, created_at, ref_reward_done FROM clients WHERE referred_by = ? ORDER BY id DESC LIMIT 50`, [clientId]);
  }

  getReferralStats() {
    const total = this.get(`SELECT COUNT(*) AS n FROM clients WHERE referred_by IS NOT NULL`).n;
    const month = this.get(`SELECT COUNT(*) AS n FROM clients WHERE referred_by IS NOT NULL AND strftime('%Y-%m', created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')`).n;
    const top = this.all(`
      SELECT r.id, r.name, COUNT(c.id) AS n FROM clients c JOIN clients r ON r.id = c.referred_by
      GROUP BY r.id ORDER BY n DESC LIMIT 5`);
    return { total, month, top };
  }

  getReferralCount(clientId) {
    return this.get(`SELECT COUNT(*) AS n FROM clients WHERE referred_by = ?`, [clientId]).n;
  }

  // Ручная отметка покупки по id карты (без сканирования QR) — та же логика, что и при скане.
  markCardManually(cardId) {
    const card = this.getCardById(cardId);
    if (!card) return { error: 'not_found' };
    return this._processScan(card);
  }

  // Обёртка над сканом: связывает скан с чеком из кассы, который «ждёт карту».
  //  • накопительная карта — сумма чека подставится в поле суммы (кассир подтверждает);
  //  • штамп/скидка — чек просто привязывается к клиенту (для отчётов «кто что купил»).
  _processScan(card) {
    if (this.limits && !this.isClientActive(card.client_id)) return { error: 'free_limit', limit: 'scan', card };
    const result = this._processScanCore(card);
    if (!result || result.error || this._suppressReceiptClaim) return result;
    try {
      const minutes = this.getSettings().pos_claim_minutes || 10;
      const pending = this.getPendingReceipt(minutes);
      if (pending) {
        if ((result.type === 'spend' || result.type === 'gift') && result.needsAmount) result.pendingReceipt = pending;
        else if (result.type === 'discount' || result.type === 'stamp' || result.type === 'reward') {
          this.claimReceipt(pending.id, card.id, result.type === 'discount' ? 'discount' : 'stamp');
          result.receiptLinked = { id: pending.id, total: pending.total, currency: pending.currency };
        }
      }
    } catch (e) { /* чеки — дополнительная функция, скан не ломаем */ }
    return result;
  }
  _processScanCore(card) {
    // Бонус из регистрации по ссылке: одноразовый и со сроком. Клиент уже пришёл в заведение,
    // поэтому и при использовании, и при просроченном бонусе ему выдаётся постоянная карта.
    if (card.single_use) {
      if (card.redeemed_count > 0) return { error: 'already_used', card };
      if (this.isCardExpired(card)) {
        const perm = this.hasPermanentCard(card.client_id) ? null : this.createDefaultCard(card.client_id);
        if (perm && this.onBonusRedeemed) { try { this.onBonusRedeemed(card.client_id, perm.id); } catch (e) { /* не критично */ } }
        return { error: 'expired', card, permanentCard: perm };
      }
    }
    // 2.19: подарочный сертификат — как накопительная карта: скан показывает остаток, сумму списывают следующим шагом.
    if (card.type === 'gift') {
      this.lastScan = null;
      if (this.isCardExpired(card)) return { error: 'gift_expired', card };
      if (!((Number(card.gift_balance) || 0) > 0)) return { error: 'gift_empty', card };
      return { type: 'gift', needsAmount: true, card };
    }
    let result;
    let historyId;
    let welcome = false;
    // 2.19: уровень клиента до этой покупки — для привилегий (штампы/бонусы ×N, скидка уровня) и «новый уровень!».
    const tcfg = this.tierConfig();
    const tierBefore = this._clientTier(card.client_id, tcfg);
    const tierMult = tcfg.perks[tierBefore].mult;
    // Снимок состояния ДО изменений — нужен для отмены последнего скана.
    const before = {
      cardId: card.id,
      clientId: card.client_id,
      stampCount: card.stamp_count,
      redeemedCount: card.redeemed_count
    };

    if (card.type === 'discount') {
      historyId = this.logScan(card.id, card.client_id, 'discount');
      result = { type: 'discount', card };
      if (card.single_use) {
        this.run(`UPDATE cards SET redeemed_count = redeemed_count + 1 WHERE id = ?`, [card.id]);
        result.bonusRedeemed = true;
        result.card = this.getCardById(card.id);
        result.permanentCard = this.hasPermanentCard(card.client_id) ? null : this.createDefaultCard(card.client_id);
        if (result.permanentCard && this.onBonusRedeemed) { try { this.onBonusRedeemed(card.client_id, result.permanentCard.id); } catch (e) { /* не критично */ } }
      }
    } else if (card.type === 'spend') {
      // Накопительная карта — сама по себе сканирование ничего не увеличивает и не
      // пишет в историю: сумма покупки обязательна и вводится отдельным шагом сразу
      // после (см. addSpendAmount ниже), а не необязательно, как у остальных типов карт.
      result = { type: 'spend', needsAmount: true, card };
      this.lastScan = null; // отменить нечего, пока сумма не введена
      return result;
    } else {
      // stamp card (в часы «двойных штампов» — сразу несколько штампов за скан; уровень клиента может умножить ещё)
      let mult = Math.min(5, this.currentStampMultiplier() * tierMult);
      // 2.23: «Приветственный бонус» — первый скан карты, полученной через саморегистрацию, даёт двойной штамп.
      if (this.isWelcomeScan(card)) { mult = Math.max(mult, 2); welcome = true; }
      const newCount = card.stamp_count + mult;
      if (newCount >= card.stamp_target) {
        // Лишние штампы сверх цели не сгорают — переходят на следующий круг.
        const carry = Math.min(card.stamp_target - 1, newCount - card.stamp_target);
        this.run(`UPDATE cards SET stamp_count = ?, redeemed_count = redeemed_count + 1 WHERE id = ?`, [carry, card.id]);
        historyId = this.logScan(card.id, card.client_id, 'reward', card.stamp_target);
        this.run(`UPDATE clients SET lifetime_rewards = lifetime_rewards + 1 WHERE id = ?`, [card.client_id]);
        result = { type: 'stamp', reward: true, card: this.getCardById(card.id) };
      } else {
        this.run(`UPDATE cards SET stamp_count = ? WHERE id = ?`, [newCount, card.id]);
        historyId = this.logScan(card.id, card.client_id, 'stamp', newCount);
        result = { type: 'stamp', reward: false, remaining: card.stamp_target - newCount, card: this.getCardById(card.id) };
      }
    }
    result.historyId = historyId;
    if (card.type === 'stamp') this.notifyCardChanged(card.id);
    if (card.type === 'stamp') {
      const m = Math.min(5, this.currentStampMultiplier() * tierMult);
      if (welcome) { result.welcomeBonus = true; result.bonusMultiplier = Math.max(2, m); }
      else if (m > 1) result.bonusMultiplier = m;
    }

    this.run(`UPDATE clients SET lifetime_purchases = lifetime_purchases + 1 WHERE id = ?`, [card.client_id]);
    this._tierInfo(result, card.client_id, tierBefore, tcfg);
    { const rf = this._afterVisit(card.client_id); if (rf) result.referral = rf; }

    // Запоминаем последний скан в памяти (не в базе) — для одноразовой отмены "Отменить последнее".
    // Сбрасывается при следующем скане или перезапуске приложения — это осознанное ограничение,
    // отмена работает только для самого последнего действия в текущем сеансе.
    const lastRow = this.get(`SELECT id FROM scan_history WHERE card_id = ? ORDER BY id DESC LIMIT 1`, [card.id]);
    this.lastScan = {
      historyId: lastRow ? lastRow.id : null,
      ...before,
      wasReward: result.type === 'stamp' && result.reward,
      clientName: this.getClient(card.client_id).name
    };

    // Если у этого клиента есть неполученный подарок (например, за звание «клиент месяца») —
    // прикладываем напоминание к результату скана.
    result.pendingGift = this.getPendingGift(card.client_id) || null;
    return result;
  }

  // Второй, обязательный шаг для накопительной карты — вызывается сразу после скана,
  // когда сотрудник ввёл сумму покупки. В отличие от штамп-карты, где скан сам по себе
  // уже полноценное действие, здесь именно эта сумма и есть само действие.
  addSpendAmount(cardId, rawAmount) {
    const card = this.getCardById(cardId);
    if (!card) return { error: 'not_found' };
    if (card.type !== 'spend') return { error: 'not_spend_card' };
    if (this.limits && !this.isClientActive(card.client_id)) return { error: 'free_limit', limit: 'scan' };
    // Сумма приходит и с телефона — проверяем: только положительное число, не больше миллиона,
    // округление до центов (иначе «abc» или −50 испортили бы накопления).
    const amount = Math.round(Number(String(rawAmount).replace(',', '.')) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return { error: 'invalid_amount' };
    const before = { cardId: card.id, clientId: card.client_id, spendAccumulated: card.spend_accumulated, redeemedCount: card.redeemed_count, bonusBalance: card.bonus_balance || 0 };

    const newAccumulated = Math.round(((card.spend_accumulated || 0) + amount) * 100) / 100;
    let reward = false, earned = 0, times = 0;
    // Без цели (карта «только учёт трат») бонус не выдаётся никогда — сумма просто копится.
    const hasBonus = Number(card.spend_target) > 0;
    const tcfg = this.tierConfig();
    const tierBefore = this._clientTier(card.client_id, tcfg);
    const pts = Database.bonusPoints(card.spend_bonus_points) * tcfg.perks[tierBefore].mult;
    if (hasBonus && newAccumulated >= card.spend_target) {
      // 2.17: бонусы стакаются. Покупка на 2000 при пороге 500 — это 4 порога → 4 × N бонусов.
      // Остаток сверх целых порогов не сгорает — переходит на следующий круг.
      times = Math.floor((newAccumulated + 1e-9) / card.spend_target);
      const carry = Math.max(0, Math.round((newAccumulated - times * card.spend_target) * 100) / 100);
      earned = times * pts;
      this.run(`UPDATE cards SET spend_accumulated = ?, redeemed_count = redeemed_count + ?, bonus_balance = COALESCE(bonus_balance, 0) + ? WHERE id = ?`, [carry, times, earned, cardId]);
      reward = true;
      this.run(`UPDATE clients SET lifetime_rewards = lifetime_rewards + ? WHERE id = ?`, [times, card.client_id]);
    } else {
      this.run(`UPDATE cards SET spend_accumulated = ? WHERE id = ?`, [newAccumulated, cardId]);
    }
    const ctx = this.scanContext || {};
    const historyId = this.run(
      `INSERT INTO scan_history (card_id, client_id, result, amount_spent, staff_id, location_id, source) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cardId, card.client_id, reward ? 'reward' : 'spend', amount, ctx.staffId || null, Number(this.getSettings().current_location_id) || null, ctx.source || 'desk']
    );
    this.run(`UPDATE clients SET lifetime_purchases = lifetime_purchases + 1 WHERE id = ?`, [card.client_id]);

    this.lastScan = {
      historyId, ...before,
      wasReward: reward, rewardTimes: times,
      clientName: this.getClient(card.client_id).name,
      isSpendUndo: true // undoLastScan должен откатывать spend_accumulated, а не stamp_count
    };

    const updatedCard = this.getCardById(cardId);
    this.notifyCardChanged(cardId);
    const tierRes = {}; this._tierInfo(tierRes, card.client_id, tierBefore, tcfg);
    { const rf = this._afterVisit(card.client_id); if (rf) tierRes.referral = rf; }
    return {
      ...tierRes,
      ok: true, reward,
      accumulated: updatedCard.spend_accumulated,
      target: hasBonus ? card.spend_target : null,
      bonusText: card.spend_bonus_text || '',
      earned, times, bonusBalance: updatedCard.bonus_balance || 0, bonusPoints: pts,
      card: updatedCard,
      pendingGift: this.getPendingGift(card.client_id) || null
    };
  }

  // Уровень клиента и его привилегия — в результат скана; tierUp — клиент только что перешёл на новый уровень.
  _tierInfo(result, clientId, tierBefore, cfg) {
    const after = this._clientTier(clientId, cfg);
    result.tier = after;
    if (cfg.on && (cfg.perks[after].mult > 1 || cfg.perks[after].disc > 0)) result.tierPerk = { ...cfg.perks[after] };
    if (after !== tierBefore) result.tierUp = after;
    return result;
  }

  // ---------- отмена последнего сканирования ----------
  getLastScanInfo() {
    return this.lastScan || null;
  }

  undoLastScan() {
    const last = this.lastScan;
    if (!last) return { error: 'nothing_to_undo' };
    if (last.isBonusUndo) {   // отмена списания бонусов — визит не считался, только баланс
      this.run(`UPDATE cards SET bonus_balance = ? WHERE id = ?`, [last.bonusBalance, last.cardId]);
      this.lastScan = null; this.notifyCardChanged(last.cardId);
      return { ok: true, clientName: last.clientName };
    }

    if (last.isGiftUndo) {
      this.run(`UPDATE cards SET gift_balance = ?, redeemed_count = ? WHERE id = ?`, [last.giftBalance, last.redeemedCount, last.cardId]);
    } else if (last.isSpendUndo) {
      this.run(`UPDATE cards SET spend_accumulated = ?, redeemed_count = ?, bonus_balance = ? WHERE id = ?`, [last.spendAccumulated, last.redeemedCount, last.bonusBalance || 0, last.cardId]);
    } else {
      this.run(`UPDATE cards SET stamp_count = ?, redeemed_count = ? WHERE id = ?`, [last.stampCount, last.redeemedCount, last.cardId]);
    }
    this.run(`UPDATE clients SET lifetime_purchases = lifetime_purchases - 1 WHERE id = ?`, [last.clientId]);
    if (last.wasReward) {
      this.run(`UPDATE clients SET lifetime_rewards = MAX(0, lifetime_rewards - ?) WHERE id = ?`, [last.rewardTimes || 1, last.clientId]);
    }
    if (last.historyId) {
      this.run(`DELETE FROM scan_history WHERE id = ?`, [last.historyId]);
    }

    this.lastScan = null;
    this.notifyCardChanged(last.cardId);
    return { ok: true, clientName: last.clientName };
  }

  // ---------- история сканирований ----------
  logScan(cardId, clientId, result, stampCountAt = null) {
    // Кто и где сделал скан: сотрудник текущей смены на этом компьютере (или null — телефон/владелец)
    // и точка, в которой работает этот компьютер.
    const ctx = this.scanContext || {};
    const locationId = Number(this.getSettings().current_location_id) || null;
    return this.run(
      `INSERT INTO scan_history (card_id, client_id, result, stamp_count_at, staff_id, location_id, source) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cardId, clientId, result, stampCountAt, ctx.staffId || null, locationId, ctx.source || 'desk']
    );
  }

  // Контекст следующего скана (устанавливается перед вызовом scanCode: касса или телефон).
  setScanContext(ctx) { this.scanContext = ctx || null; }

  // ---------- товары и склад ----------
  _num(v, min, max, def) { const n = Math.round(Number(String(v == null ? '' : v).replace(',', '.')) * 1000) / 1000; return Number.isFinite(n) && n >= min && n <= max ? n : def; }
  _txt(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); }
  listProducts({ q = '', category = '', lowOnly = false, includeInactive = false } = {}) {
    let rows = this.all(`SELECT * FROM products ${includeInactive ? '' : 'WHERE active = 1'} ORDER BY name COLLATE NOCASE`);
    const qq = String(q).trim().toLowerCase();
    if (qq) rows = rows.filter(p => [p.name, p.sku, p.barcode, p.category].some(v => String(v || '').toLowerCase().includes(qq)));
    if (category) rows = rows.filter(p => (p.category || '') === category);
    if (lowOnly) rows = rows.filter(p => p.min_stock > 0 && p.stock <= p.min_stock);
    return rows;
  }
  getProduct(id) { return this.get(`SELECT * FROM products WHERE id = ?`, [Number(id)]); }
  productCategories() { return this.all(`SELECT DISTINCT category FROM products WHERE active = 1 AND category IS NOT NULL AND category != '' ORDER BY category COLLATE NOCASE`).map(r => r.category); }
  saveProduct(p) {
    const name = this._txt(p && p.name, 120);
    if (!name) return { error: 'product_name' };
    const sku = this._txt(p.sku, 60), barcode = this._txt(p.barcode, 60).replace(/\s+/g, '');
    const unit = ['pcs', 'kg', 'g', 'l', 'ml', 'm', 'pack', 'service'].includes(p.unit) ? p.unit : 'pcs';
    const price = this._num(p.price, 0, 1e7, 0), cost = this._num(p.cost, 0, 1e7, 0), minStock = this._num(p.minStock, 0, 1e7, 0);
    const category = this._txt(p.category, 60);
    // Один и тот же штрихкод / артикул не может быть у двух товаров — иначе чек из кассы спишет не то.
    const dup = (field, val) => val && this.get(`SELECT id FROM products WHERE active = 1 AND ${field} = ? AND id != ?`, [val, Number(p.id) || 0]);
    if (dup('barcode', barcode)) return { error: 'product_dup_barcode' };
    if (dup('sku', sku)) return { error: 'product_dup_sku' };
    if (!p.id && this.limits && this.limits.products != null) { try { this._guard('products'); } catch (e) { return { error: 'free_limit', limit: 'products' }; } }
    if (p.id) {
      if (!this.getProduct(p.id)) return { error: 'not_found' };
      this.run(`UPDATE products SET name=?, sku=?, barcode=?, category=?, unit=?, price=?, cost=?, min_stock=?, updated_at=datetime('now') WHERE id=?`, [name, sku || null, barcode || null, category || null, unit, price, cost, minStock, Number(p.id)]);
      return { ok: true, id: Number(p.id) };
    }
    // run() возвращает id новой строки (sql.js сбрасывает last_insert_rowid при сохранении).
    const id = this.run(`INSERT INTO products (name, sku, barcode, category, unit, price, cost, min_stock, stock) VALUES (?,?,?,?,?,?,?,?,0)`, [name, sku || null, barcode || null, category || null, unit, price, cost, minStock]);
    const initial = this._num(p.stock, 0, 1e7, 0);
    if (initial > 0) this.stockMove(id, 'in', initial, { price: cost, note: 'start' });
    return { ok: true, id };
  }
  deleteProduct(id) {
    const p = this.getProduct(id); if (!p) return { error: 'not_found' };
    // Товар с историей не удаляем совсем — прячем, чтобы отчёты прошлых месяцев остались верными.
    const hasMoves = this.get(`SELECT id FROM stock_moves WHERE product_id = ? LIMIT 1`, [p.id]);
    if (hasMoves) this.run(`UPDATE products SET active = 0, updated_at = datetime('now') WHERE id = ?`, [p.id]);
    else this.run(`DELETE FROM products WHERE id = ?`, [p.id]);
    return { ok: true };
  }
  // Движение товара: in — приход, writeoff — списание, sale — продажа (из чека), return — возврат,
  // adjust — инвентаризация (qty = фактический остаток, в журнал пишется разница).
  stockMove(productId, kind, rawQty, { price = null, note = '', receiptId = null } = {}) {
    const p = this.getProduct(productId);
    if (!p) return { error: 'not_found' };
    if (!['in', 'writeoff', 'sale', 'return', 'adjust'].includes(kind)) return { error: 'bad_kind' };
    const qty = this._num(rawQty, kind === 'adjust' ? 0 : 0.001, 1e7, null);
    if (qty === null) return { error: 'invalid_qty' };
    const delta = kind === 'adjust' ? Math.round((qty - p.stock) * 1000) / 1000 : (kind === 'in' || kind === 'return' ? qty : -qty);
    const after = Math.round((p.stock + delta) * 1000) / 1000;
    this.run(`UPDATE products SET stock = ?, updated_at = datetime('now') ${kind === 'in' && price != null && Number(price) > 0 ? ', cost = ' + this._num(price, 0, 1e7, p.cost) : ''} WHERE id = ?`, [after, p.id]);
    this.run(`INSERT INTO stock_moves (product_id, kind, qty, stock_after, price, note, receipt_id) VALUES (?,?,?,?,?,?,?)`,
      [p.id, kind, delta, after, price == null ? null : this._num(price, 0, 1e7, null), this._txt(note, 200) || null, receiptId]);
    return { ok: true, stock: after, delta };
  }
  getStockMoves({ productId = null, limit = 200, from = null, to = null } = {}) {
    const where = [], args = [];
    if (productId) { where.push('m.product_id = ?'); args.push(Number(productId)); }
    if (from) { where.push('m.created_at >= ?'); args.push(from); }
    if (to) { where.push('m.created_at < ?'); args.push(to); }
    return this.all(`SELECT m.*, p.name AS product_name, p.unit AS unit, p.sku AS sku FROM stock_moves m JOIN products p ON p.id = m.product_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY m.id DESC LIMIT ?`, [...args, Math.min(5000, Number(limit) || 200)]);
  }
  // Чек из кассы, который так и не привязали к клиенту, можно удалить (привязанные — нельзя: они уже начислили бонус).
  deleteReceipt(id) {
    const r = this.get(`SELECT id, status FROM receipts WHERE id = ?`, [Number(id)]);
    if (!r) return { error: 'not_found' };
    if (r.status !== 'pending') return { error: 'not_pending' };
    this.run(`DELETE FROM receipts WHERE id = ?`, [r.id]);
    return { ok: true };
  }
  inventorySummary() {
    const r = this.get(`SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN stock > 0 THEN stock * cost ELSE 0 END),0) AS value,
      COALESCE(SUM(CASE WHEN min_stock > 0 AND stock <= min_stock THEN 1 ELSE 0 END),0) AS low FROM products WHERE active = 1`) || {};
    const s = this.get(`SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS sum FROM receipts WHERE created_at >= datetime('now','-30 days')`) || {};
    const pending = this.get(`SELECT COUNT(*) AS n FROM receipts WHERE status = 'pending'`) || {};
    return { products: r.n || 0, stockValue: Math.round((r.value || 0) * 100) / 100, low: r.low || 0, receipts30: s.n || 0, sales30: Math.round((s.sum || 0) * 100) / 100, pending: pending.n || 0 };
  }
  findProductForItem(it) {
    const bc = this._txt(it && it.barcode, 60).replace(/\s+/g, ''), sku = this._txt(it && it.sku, 60), name = this._txt(it && it.name, 120);
    return (bc && this.get(`SELECT * FROM products WHERE active = 1 AND barcode = ?`, [bc]))
      || (sku && this.get(`SELECT * FROM products WHERE active = 1 AND sku = ?`, [sku]))
      || (name && this.get(`SELECT * FROM products WHERE active = 1 AND name = ? COLLATE NOCASE`, [name])) || null;
  }

  // ---------- чеки из кассы ----------
  // Касса бизнеса (сертифицированная, печатает фискальный чек) присылает копию чека. Loya:
  //  • списывает проданные товары со склада;
  //  • если в чеке есть карта клиента (код или телефон) — сразу начисляет бонусы;
  //  • иначе чек «ждёт карту»: при следующем скане карты в течение N минут сумма подставится сама.
  addReceipt(r) {
    const source = this._txt(r && r.source, 40) || 'api';
    const externalId = this._txt(r.externalId, 80) || null;
    const total = this._num(r.total, 0, 1e7, null);
    if (total === null) return { error: 'invalid_total' };
    if (externalId) {
      const dup = this.get(`SELECT id FROM receipts WHERE source = ? AND external_id = ?`, [source, externalId]);
      if (dup) return { ok: true, duplicate: true, id: dup.id };
    }
    const items = (Array.isArray(r.items) ? r.items : []).slice(0, 300).map(it => ({
      name: this._txt(it && it.name, 120), sku: this._txt(it && it.sku, 60), barcode: this._txt(it && it.barcode, 60),
      qty: this._num(it && it.qty, 0.001, 1e6, 1), price: this._num(it && it.price, 0, 1e7, 0)
    }));
    const createdAt = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(String(r.createdAt || '')) ? String(r.createdAt).replace('T', ' ').slice(0, 19) : null;
    const id = this.run(`INSERT INTO receipts (source, external_id, total, currency, items, status${createdAt ? ', created_at' : ''}) VALUES (?,?,?,?,?, 'pending'${createdAt ? ', ?' : ''})`,
      [source, externalId, total, this._txt(r.currency, 6) || null, JSON.stringify(items), ...(createdAt ? [createdAt] : [])]);
    // склад
    let matched = 0; const unmatched = [];
    for (const it of items) {
      const p = this.findProductForItem(it);
      if (p) { this.stockMove(p.id, 'sale', it.qty, { price: it.price, receiptId: id }); matched++; } else if (it.name || it.sku || it.barcode) unmatched.push(it.name || it.sku || it.barcode);
    }
    // карта клиента в чеке
    let card = null;
    const code = this._txt(r.cardCode, 80);
    if (code) card = this.getCardByCode(code);
    if (!card && r.phone) {
      const cl = this.getClientByPhone(this._txt(r.phone, 30));
      if (cl) { const cards = this.all(`SELECT * FROM cards WHERE client_id = ? AND (single_use IS NULL OR single_use = 0) ORDER BY CASE type WHEN 'spend' THEN 0 WHEN 'stamp' THEN 1 ELSE 2 END, id`, [cl.id]); card = cards[0] ? this.getCardById(cards[0].id) : null; }
    }
    let applied = null;
    if (card) applied = this.applyReceiptToCard(id, card.id);
    return { ok: true, id, matched, unmatched, applied };
  }
  // Начислить бонусы по чеку на карту (вызывается сразу или при скане карты).
  applyReceiptToCard(receiptId, cardId) {
    const rc = this.get(`SELECT * FROM receipts WHERE id = ?`, [receiptId]); const card = this.getCardById(cardId);
    if (!rc || !card) return { error: 'not_found' };
    if (rc.status === 'claimed') return { error: 'already_claimed' };
    let res;
    if (card.type === 'spend') res = rc.total > 0 ? this.addSpendAmount(card.id, rc.total) : { ok: true };
    else if (card.type === 'stamp') { this._suppressReceiptClaim = true; try { res = this.scanCode(card.code); } finally { this._suppressReceiptClaim = false; } }
    else res = { ok: true, type: 'discount' };
    const applied = card.type === 'spend' ? 'spend' : card.type === 'stamp' ? (res && res.error ? 'stamp_' + res.error : 'stamp') : 'discount';
    this.run(`UPDATE receipts SET status = 'claimed', card_id = ?, client_id = ?, applied = ?, claimed_at = datetime('now') WHERE id = ?`, [card.id, card.client_id, applied, rc.id]);
    return { ok: true, applied, result: res };
  }
  // Последний чек, который ждёт карту (не старше N минут) — для подстановки суммы при скане.
  getPendingReceipt(maxMinutes) {
    const m = this._num(maxMinutes, 1, 240, 10);
    return this.get(`SELECT id, total, currency, items, created_at FROM receipts WHERE status = 'pending' AND created_at >= datetime('now', ?) ORDER BY id DESC LIMIT 1`, [`-${m} minutes`]) || null;
  }
  // Чек забрали вручную при скане (сумму кассир уже подтвердил сам) — просто связываем с картой.
  claimReceipt(receiptId, cardId, applied) {
    const rc = this.get(`SELECT * FROM receipts WHERE id = ? AND status = 'pending'`, [Number(receiptId)]); const card = this.getCardById(cardId);
    if (!rc || !card) return { error: 'not_found' };
    this.run(`UPDATE receipts SET status = 'claimed', card_id = ?, client_id = ?, applied = ?, claimed_at = datetime('now') WHERE id = ?`, [card.id, card.client_id, this._txt(applied, 20) || 'linked', rc.id]);
    return { ok: true };
  }
  listReceipts({ limit = 100, from = null, to = null } = {}) {
    const where = [], args = [];
    if (from) { where.push('r.created_at >= ?'); args.push(from); }
    if (to) { where.push('r.created_at < ?'); args.push(to); }
    return this.all(`SELECT r.*, c.name AS client_name FROM receipts r LEFT JOIN clients c ON c.id = r.client_id ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY r.id DESC LIMIT ?`, [...args, Math.min(10000, Number(limit) || 100)]);
  }

  // ---------- выгрузка для бухгалтерии (CSV: открывается в Excel, импортируется в Pohoda, Money, 1С/BAS) ----------
  _csv(rows, lang) {
    const sep = lang === 'en' ? ',' : ';';
    const cell = (v) => { let s = v == null ? '' : (typeof v === 'number' ? (lang === 'en' ? String(v) : String(v).replace('.', ',')) : String(v)); if (/^[=+\-@]/.test(s) && typeof v !== 'number') s = "'" + s; return (s.includes(sep) || /["\n\r]/.test(s)) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return '\ufeff' + rows.map(r => r.map(cell).join(sep)).join('\r\n') + '\r\n';
  }
  exportProductsCsv(lang, H) {
    const rows = [[H.name, H.sku, H.barcode, H.category, H.unit, H.price, H.cost, H.stock, H.minStock, H.stockValue]];
    for (const p of this.listProducts()) rows.push([p.name, p.sku || '', p.barcode || '', p.category || '', p.unit, p.price, p.cost, p.stock, p.min_stock, Math.round(p.stock * p.cost * 100) / 100]);
    return this._csv(rows, lang);
  }
  exportMovesCsv(lang, H, from, to) {
    const rows = [[H.date, H.name, H.sku, H.kind, H.qty, H.stockAfter, H.price, H.receipt, H.note]];
    for (const m of this.getStockMoves({ limit: 5000, from, to }).reverse()) rows.push([m.created_at, m.product_name, m.sku || '', H['k_' + m.kind] || m.kind, m.qty, m.stock_after, m.price == null ? '' : m.price, m.receipt_id || '', m.note || '']);
    return this._csv(rows, lang);
  }
  exportReceiptsCsv(lang, H, from, to) {
    const rows = [[H.date, H.receipt, H.source, H.total, H.currency, H.client, H.items]];
    for (const r of this.listReceipts({ limit: 10000, from, to }).reverse()) {
      let items = []; try { items = JSON.parse(r.items || '[]'); } catch (e) { /* пусто */ }
      rows.push([r.created_at, r.external_id || r.id, r.source, r.total, r.currency || '', r.client_name || '', items.map(i => `${i.name || i.sku || i.barcode} × ${i.qty}`).join(' | ')]);
    }
    return this._csv(rows, lang);
  }
  // Импорт товаров из CSV (первая строка — заголовки; узнаём их на 4 языках и по-английски).
  importProductsCsv(text) {
    const lines = String(text || '').replace(/^\ufeff/, '').split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { error: 'empty' };
    const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
    const parse = (line) => { const out = []; let cur = '', q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === sep) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(v => v.trim()); };
    const head = parse(lines[0]).map(h => h.toLowerCase());
    const find = (...names) => head.findIndex(h => names.some(n => h === n || h.startsWith(n)));
    const ix = { name: find('name', 'название', 'назва', 'názov', 'товар'), sku: find('sku', 'артикул', 'kód', 'kod', 'code'), barcode: find('barcode', 'штрих', 'ean', 'čiarový'),
      category: find('category', 'категория', 'категорія', 'kategória'), unit: find('unit', 'ед', 'од', 'jednotka'), price: find('price', 'цена', 'ціна', 'cena'),
      cost: find('cost', 'закуп', 'nákup', 'себест'), stock: find('stock', 'остаток', 'залишок', 'sklad', 'количество', 'množstvo', 'qty'), min: find('min', 'мин', 'мін') };
    if (ix.name < 0) return { error: 'no_name_column' };
    let created = 0, updated = 0, skipped = 0;
    for (const line of lines.slice(1)) {
      const c = parse(line); const g = (k) => (ix[k] >= 0 ? c[ix[k]] : '');
      const p = { name: g('name'), sku: g('sku'), barcode: g('barcode'), category: g('category'), unit: g('unit') || 'pcs', price: g('price'), cost: g('cost'), minStock: g('min') };
      if (!p.name) { skipped++; continue; }
      const existing = this.findProductForItem({ barcode: p.barcode, sku: p.sku, name: p.name });
      if (existing) { const r = this.saveProduct({ ...p, id: existing.id }); if (r.ok) { updated++; if (g('stock') !== '') this.stockMove(existing.id, 'adjust', g('stock'), { note: 'import' }); } else skipped++; }
      else { const r = this.saveProduct({ ...p, stock: g('stock') }); r.ok ? created++ : skipped++; }
    }
    return { ok: true, created, updated, skipped };
  }

  // ---------- доступ из дома: копия показателей и правки с сайта ----------
  // Снимок для сайта: только то, что нужно владельцу, чтобы посмотреть дела из дома. Данные
  // клиентов (имя, телефон, email) в снимок попадают лишь пока владелец сам включил «Доступ из дома».
  getOwnerSnapshot(maxClients = 1000) {
    const st = this.getSettings();
    const flags = {};
    this.getClientsWithFlags().forEach(c => { flags[c.id] = c; });
    const cardsByClient = {};
    this.getCards().forEach(c => { (cardsByClient[c.client_id] = cardsByClient[c.client_id] || []).push(c); });
    const clients = this.getClients().map(c => {
      const f = flags[c.id] || {};
      return {
        id: c.id, name: c.name, phone: c.phone || '', email: c.email || '', birthday: c.birthday || '', notes: String(c.notes || '').slice(0, 300),
        visits: f.purchaseCount || 0, last: f.lastVisitAt ? String(f.lastVisitAt).slice(0, 10) : '',
        vip: !!f.isVIP, risk: !!f.isAtRisk, near: !!f.isNearReward,
        cards: (cardsByClient[c.id] || []).slice(0, 6).map(k => k.type === 'stamp' ? { t: 's', a: k.stamp_count, b: k.stamp_target } : k.type === 'spend' ? { t: 'm', a: Math.round((k.spend_accumulated || 0) * 100) / 100, b: k.spend_target || 0 } : { t: 'd', a: k.discount_percent || 0, bonus: !!k.single_use })
      };
    }).sort((a, b) => (b.last || '').localeCompare(a.last || '') || b.id - a.id).slice(0, maxClients);
    return {
      v: 1, at: new Date().toISOString(),
      brand: { name: st.brand_name || 'Loya', color: st.theme_primary || '#d4af37', currency: st.spend_currency || 'EUR', niche: st.business_niche || 'other' },
      stats: this.getStats(), advanced: (({ inactiveClients, ...rest }) => rest)(this.getAdvancedStats()),
      revenue: this.getRevenueStats(), revenueByMonth: this.getRevenueByMonth(6), funnel: this.getLoyaltyFunnel(),
      heatmap: this.getVisitHeatmap(90), visitsByDay: this.getVisitsByDay(14),
      topClients: this.getTopClients(5).map(c => ({ name: c.name, visits: c.visits })),
      recent: this.getRecentHistory(15).map(h => ({ name: h.client_name, at: h.created_at, result: h.result, type: h.card_type, title: h.card_title || '', pct: h.discount_percent || 0 })),
      online: this.getOnlineBonusStats(),
      totalClients: clients.length
        ? this.get(`SELECT COUNT(*) AS n FROM clients`).n : 0,
      clients
    };
  }

  // Правка, пришедшая с сайта. Данные — недоверенные: принимаем только два вида правок,
  // строго проверяем поля и длины. Возвращает { ok } или { ok:false, error }.
  applyOwnerCommand(cmd) {
    try { return this._applyOwnerCommand(cmd); } catch (e) { if (e && e.code === 'FREE_LIMIT') return { ok: false, error: 'free_limit' }; throw e; }
  }
  _applyOwnerCommand(cmd) {
    const text = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
    if (!cmd || typeof cmd !== 'object') return { ok: false, error: 'bad_command' };
    if (cmd.type === 'card_add') {
      // Выдать клиенту новую карту из дома. Пределы те же, что и на сайте (проверяем ещё раз —
      // данные с сервера считаем недоверенными).
      const id = Number(cmd.id);
      if (!Number.isInteger(id) || !this.getClient(id)) return { ok: false, error: 'not_found' };
      const n = Number(cmd.value), title = text(cmd.title, 80);
      let card = null;
      if (cmd.cardType === 'stamp' && Number.isInteger(n) && n >= 2 && n <= 50) card = this.createCard({ clientId: id, type: 'stamp', title, stampTarget: n });
      else if (cmd.cardType === 'discount' && Number.isInteger(n) && n >= 1 && n <= 100) card = this.createCard({ clientId: id, type: 'discount', title, discountPercent: n });
      else if (cmd.cardType === 'spend' && Number.isFinite(n) && n >= 1 && n <= 1000000) card = this.createCard({ clientId: id, type: 'spend', title, spendTarget: Math.round(n * 100) / 100 });
      else return { ok: false, error: 'bad_card' };
      return { ok: true, id, cardId: card.id };
    }
    const email = text(cmd.email, 120);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'bad_email' };
    const name = text(cmd.name, 100);
    if (!name) return { ok: false, error: 'bad_name' };
    const phone = text(cmd.phone, 30), notes = text(cmd.notes, 500);
    if (cmd.type === 'client_add') {
      if ((phone && this.getClientByPhone(phone)) || (email && this.getClientByEmail(email))) return { ok: false, error: 'duplicate' };
      const id = this.addClient({ name, email, phone, birthday: /^\d{4}-\d{2}-\d{2}$/.test(cmd.birthday || '') ? cmd.birthday : '', notes, preferredLanguage: ['ru', 'uk', 'sk', 'en'].includes(cmd.lang) ? cmd.lang : '', marketingConsent: false });
      return { ok: true, id };
    }
    if (cmd.type === 'client_edit') {
      const id = Number(cmd.id);
      const cur = Number.isInteger(id) ? this.getClient(id) : null;
      if (!cur) return { ok: false, error: 'not_found' };
      const other = (phone && this.getClientByPhone(phone)) || (email && this.getClientByEmail(email));
      if (other && other.id !== id) return { ok: false, error: 'duplicate' };
      this.updateClient(id, { name, email, phone, birthday: cur.birthday, notes, preferredLanguage: cur.preferred_language });
      return { ok: true, id };
    }
    return { ok: false, error: 'bad_command' };
  }

  // ---------- автоматические рассылки ----------
  lastAutomationSent(clientId, rule) {
    const r = this.get(`SELECT (julianday('now') - julianday(MAX(sent_at))) AS days FROM automation_log WHERE client_id = ? AND rule = ?`, [clientId, rule]);
    return r && r.days !== null ? r.days : null;
  }
  logAutomation(clientId, rule) { this.run(`INSERT INTO automation_log (client_id, rule) VALUES (?, ?)`, [clientId, rule]); }
  automationStats(days = 30) {
    const rows = this.all(`SELECT rule, COUNT(*) AS n FROM automation_log WHERE sent_at >= datetime('now', '-${Math.max(1, Number(days) || 30)} days') GROUP BY rule`);
    const out = {};
    rows.forEach(r => { out[r.rule] = r.n; });
    return out;
  }

  // ---------- сотрудники ----------
  listStaff() {
    return this.all(`SELECT id, name, role, location_id, active, created_at, email, theme_name, (pin_hash IS NOT NULL AND pin_hash != '') AS has_pin, (login_hash IS NOT NULL AND login_hash != '') AS has_code FROM staff WHERE active = 1 ORDER BY name COLLATE NOCASE`);
  }
  listStaffAuth() { return this.all(`SELECT * FROM staff WHERE active = 1`); }
  setStaffLogin(id, salt, hash) { this.run(`UPDATE staff SET login_salt = ?, login_hash = ? WHERE id = ? AND active = 1`, [salt, hash, id]); }
  setStaffEmail(id, email) { this.run(`UPDATE staff SET email = ? WHERE id = ? AND active = 1`, [String(email || '').trim().slice(0, 200) || null, id]); }
  setStaffTheme(id, themeName) { this.run(`UPDATE staff SET theme_name = ? WHERE id = ? AND active = 1`, [themeName || null, id]); }
  getStaffAuth(id) { return this.get(`SELECT * FROM staff WHERE id = ? AND active = 1`, [id]); }
  addStaff({ name, role, pinSalt, pinHash, locationId, email }) {
    return this.run(`INSERT INTO staff (name, role, pin_salt, pin_hash, location_id, email) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, role === 'manager' ? 'manager' : 'cashier', pinSalt, pinHash, locationId || null, String(email || '').trim().slice(0, 200) || null]);
  }
  updateStaff(id, { name, role, locationId, pinSalt, pinHash }) {
    const cur = this.getStaffAuth(id);
    if (!cur) return;
    this.run(`UPDATE staff SET name = ?, role = ?, location_id = ?, pin_salt = ?, pin_hash = ? WHERE id = ?`, [
      name || cur.name, role === 'manager' ? 'manager' : (role === 'cashier' ? 'cashier' : cur.role),
      locationId === undefined ? cur.location_id : (locationId || null),
      pinSalt || cur.pin_salt, pinHash || cur.pin_hash, id
    ]);
  }
  // Удаление «мягкое» — чтобы история сканов по этому сотруднику не потеряла имя.
  removeStaff(id) { this.run(`UPDATE staff SET active = 0, login_hash = NULL WHERE id = ?`, [id]); }

  // ---------- бонусы накопительной карты (2.17) ----------
  static bonusPoints(v) { const n = Math.round(Number(v)); return n >= 1 && n <= 1000 ? n : 1; }
  // Списать бонусы (клиент тратит их на кассе). Визитом не считается; последнее списание можно отменить.
  redeemBonus(cardId, rawCount) {
    const card = this.getCardById(cardId);
    if (!card) return { error: 'not_found' };
    if (card.type !== 'spend') return { error: 'not_spend_card' };
    const n = Math.round(Number(String(rawCount).replace(',', '.')));
    const bal = Math.round(Number(card.bonus_balance) || 0);
    if (!(n >= 1)) return { error: 'invalid_amount' };
    if (n > bal) return { error: 'not_enough', balance: bal };
    this.run(`UPDATE cards SET bonus_balance = ? WHERE id = ?`, [bal - n, cardId]);
    this.lastScan = { cardId, clientId: card.client_id, bonusBalance: bal, isBonusUndo: true, clientName: (this.getClient(card.client_id) || {}).name || '' };
    this.notifyCardChanged(cardId);
    return { ok: true, used: n, balance: bal - n, card: this.getCardById(cardId) };
  }
  // Изменить правило бонусов у карты (сколько бонусов за порог).
  setCardBonusPoints(cardId, pts) { this.run(`UPDATE cards SET spend_bonus_points = ? WHERE id = ? AND type = 'spend'`, [Database.bonusPoints(pts), cardId]); this.notifyCardChanged(cardId); return this.getCardById(cardId); }

  // ---------- сеть точек (2.17) ----------
  locationIdByName(name, create) {
    const nm = String(name || '').trim().slice(0, 60); if (!nm) return null;
    const r = this.get(`SELECT id FROM locations WHERE name = ? COLLATE NOCASE ORDER BY id LIMIT 1`, [nm]);
    if (r) return r.id;
    if (!create) return null;
    this.run(`INSERT INTO locations (name) VALUES (?)`, [nm]);
    const n = this.get(`SELECT id FROM locations WHERE name = ? ORDER BY id DESC LIMIT 1`, [nm]);
    return n ? n.id : null;
  }
  // Назначить этому устройству точку. Записи без точки (сделанные здесь до 2.17) становятся записями этой точки —
  // так статистика каждой точки после объединения баз остаётся правильной.
  assignPoint(name) {
    const prev = Number(this.getSettings().current_location_id) || null;
    const id = this.locationIdByName(name, true); if (!id) return null;
    // Прежняя точка, в которой ничего не было (выбрали по ошибке), не остаётся «висеть» в списке.
    if (prev && prev !== id) {
      const used = this.get(`SELECT (SELECT COUNT(*) FROM scan_history WHERE location_id = ?) + (SELECT COUNT(*) FROM clients WHERE location_id = ?) + (SELECT COUNT(*) FROM staff WHERE location_id = ? AND active = 1) AS n`, [prev, prev, prev]);
      if (used && !used.n) this.run(`DELETE FROM locations WHERE id = ?`, [prev]);
    }
    this.saveSettings({ current_location_id: String(id), point_name: this.get(`SELECT name FROM locations WHERE id = ?`, [id]).name });
    // Только пока база своя: в общей базе записи без точки могли прийти с других устройств — их не присваиваем.
    if (!this.syncState().enabled) this.batch(() => {
      this.run(`UPDATE scan_history SET location_id = ? WHERE location_id IS NULL`, [id]);
      this.run(`UPDATE clients SET location_id = ? WHERE location_id IS NULL`, [id]);
    });
    return id;
  }
  currentPoint() {
    const st = this.getSettings();
    const id = Number(st.current_location_id) || null;
    const row = id ? this.get(`SELECT id, name FROM locations WHERE id = ?`, [id]) : null;
    return row || null;
  }
  // Статистика одной или нескольких точек: на время расчёта таблицы визитов, клиентов и карт подменяются
  // временными «видами» с отбором по точке (SQLite ищет временные объекты раньше основных).
  // Только для чтения: внутри scoped() ничего не записываем.
  scoped(locIds, fn) {
    const ids = (Array.isArray(locIds) ? locIds : [locIds]).map(Number).filter((x) => Number.isInteger(x) && x > 0);
    if (!ids.length || this._scopeDepth) return fn();
    const list = ids.join(',');
    this._scopeDepth = 1;
    try {
      this.db.run(`CREATE TEMP VIEW IF NOT EXISTS scan_history AS SELECT * FROM main.scan_history WHERE location_id IN (${list})`);
      this.db.run(`CREATE TEMP VIEW IF NOT EXISTS clients AS SELECT * FROM main.clients WHERE location_id IN (${list}) OR id IN (SELECT client_id FROM main.scan_history WHERE location_id IN (${list}))`);
      this.db.run(`CREATE TEMP VIEW IF NOT EXISTS cards AS SELECT * FROM main.cards WHERE client_id IN (SELECT id FROM temp.clients)`);
      return fn();
    } finally {
      for (const v of ['cards', 'clients', 'scan_history']) { try { this.db.run(`DROP VIEW IF EXISTS temp.${v}`); } catch (e) { /* нет */ } }
      this._scopeDepth = 0;
    }
  }
  // Короткая сводка для «Сети точек» и «Доступа из дома»: только числа, без имён и телефонов (кроме 5 лучших — по имени).
  pointSummary() {
    const one = (sql, p = []) => { const r = this.get(sql, p); return r ? (Object.values(r)[0] || 0) : 0; };
    const monthCond = `strftime('%Y-%m', created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')`;
    const prevCond = `strftime('%Y-%m', created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime', '-1 month')`;
    const scansMonth = one(`SELECT COUNT(*) FROM scan_history WHERE ${monthCond}`);
    const revMonth = one(`SELECT COALESCE(SUM(amount_spent), 0) FROM scan_history WHERE amount_spent > 0 AND ${monthCond}`);
    const checks = one(`SELECT COUNT(*) FROM scan_history WHERE amount_spent > 0 AND ${monthCond}`);
    const withVisit = one(`SELECT COUNT(DISTINCT client_id) FROM scan_history`);
    const repeaters = one(`SELECT COUNT(*) FROM (SELECT client_id FROM scan_history GROUP BY client_id HAVING COUNT(*) > 1)`);
    const days = this.all(`SELECT date(created_at, 'localtime') AS d, COUNT(*) AS n, COALESCE(SUM(CASE WHEN amount_spent > 0 THEN amount_spent END), 0) AS r
      FROM scan_history WHERE created_at >= datetime('now', '-31 days') GROUP BY d ORDER BY d`);
    const dmap = new Map(days.map((x) => [x.d, x]));
    const outDays = [];
    for (let i = 13; i >= 0; i--) { const dt = new Date(Date.now() - i * 86400000); const d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; const x = dmap.get(d); outDays.push({ d, n: x ? x.n : 0, r: x ? Math.round(x.r * 100) / 100 : 0 }); }
    const months = this.all(`SELECT strftime('%Y-%m', created_at, 'localtime') AS m, COUNT(*) AS n, COALESCE(SUM(CASE WHEN amount_spent > 0 THEN amount_spent END), 0) AS r
      FROM scan_history WHERE created_at >= datetime('now', 'start of month', '-5 months') GROUP BY m ORDER BY m`).map((x) => ({ m: x.m, n: x.n, r: Math.round(x.r * 100) / 100 }));
    const top = this.all(`SELECT c.name AS n, COUNT(*) AS v FROM scan_history h JOIN clients c ON c.id = h.client_id WHERE h.created_at >= datetime('now', '-30 days') GROUP BY h.client_id ORDER BY v DESC LIMIT 5`);
    return {
      kpi: {
        clients: one(`SELECT COUNT(*) FROM clients`),
        newMonth: one(`SELECT COUNT(*) FROM clients WHERE ${monthCond}`),
        active30: one(`SELECT COUNT(DISTINCT client_id) FROM scan_history WHERE created_at >= datetime('now', '-30 days')`),
        scansToday: one(`SELECT COUNT(*) FROM scan_history WHERE date(created_at, 'localtime') = date('now', 'localtime')`),
        scansMonth, scansTotal: one(`SELECT COUNT(*) FROM scan_history`),
        rewardsMonth: one(`SELECT COUNT(*) FROM scan_history WHERE result = 'reward' AND ${monthCond}`),
        revenueMonth: Math.round(revMonth * 100) / 100,
        revenuePrevMonth: Math.round(one(`SELECT COALESCE(SUM(amount_spent), 0) FROM scan_history WHERE amount_spent > 0 AND ${prevCond}`) * 100) / 100,
        revenueTotal: Math.round(one(`SELECT COALESCE(SUM(amount_spent), 0) FROM scan_history WHERE amount_spent > 0`) * 100) / 100,
        avgCheck: checks ? Math.round(revMonth / checks * 100) / 100 : 0, checksMonth: checks,
        cards: one(`SELECT COUNT(*) FROM cards`),
        bonusBalance: Math.round(one(`SELECT COALESCE(SUM(bonus_balance), 0) FROM cards WHERE type = 'spend'`)),
        repeatRate: withVisit ? Math.round(repeaters / withVisit * 100) : 0
      },
      days: outDays, months, top: top.map((x) => ({ n: String(x.n || '').split(' ')[0].slice(0, 30), v: x.v })),
      cur: this.getSettings().spend_currency || 'EUR'
    };
  }

  // ---------- 2.19: итоги месяца для письма владельцу ----------
  // ym — 'ГГГГ-ММ' (по местному времени). Сравнение — с предыдущим месяцем.
  monthReport(ym) {
    const one = (sql, p = []) => { const r = this.get(sql, p); return r ? (Object.values(r)[0] || 0) : 0; };
    const prevYm = (() => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 2, 15); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
    const calc = (m) => {
      const c = `strftime('%Y-%m', created_at, 'localtime') = '${m}'`;
      const visits = one(`SELECT COUNT(*) FROM scan_history WHERE ${c}`);
      const guests = one(`SELECT COUNT(DISTINCT client_id) FROM scan_history WHERE ${c}`);
      const revenue = Math.round(one(`SELECT COALESCE(SUM(amount_spent), 0) FROM scan_history WHERE amount_spent > 0 AND ${c}`) * 100) / 100;
      const checks = one(`SELECT COUNT(*) FROM scan_history WHERE amount_spent > 0 AND ${c}`);
      // Вернувшиеся: были у вас до этого месяца и пришли снова в этом месяце.
      const returned = one(`SELECT COUNT(DISTINCT h.client_id) FROM scan_history h WHERE strftime('%Y-%m', h.created_at, 'localtime') = '${m}'
        AND EXISTS (SELECT 1 FROM scan_history p WHERE p.client_id = h.client_id AND strftime('%Y-%m', p.created_at, 'localtime') < '${m}')`);
      return {
        visits, guests, revenue, checks, avgCheck: checks ? Math.round(revenue / checks * 100) / 100 : 0, returned,
        newClients: one(`SELECT COUNT(*) FROM clients WHERE ${c}`),
        rewards: one(`SELECT COUNT(*) FROM scan_history WHERE result = 'reward' AND ${c}`),
        gift: Math.round(one(`SELECT COALESCE(SUM(amount_spent), 0) FROM scan_history WHERE result = 'gift' AND ${c}`) * 100) / 100
      };
    };
    const cur = calc(ym), prev = calc(prevYm);
    const top = this.all(`SELECT c.name AS name, COUNT(*) AS v, COALESCE(SUM(CASE WHEN h.amount_spent > 0 THEN h.amount_spent END), 0) AS r FROM scan_history h JOIN clients c ON c.id = h.client_id
      WHERE strftime('%Y-%m', h.created_at, 'localtime') = ? GROUP BY h.client_id ORDER BY v DESC, r DESC LIMIT 5`, [ym]).map(x => ({ name: x.name, visits: x.v, revenue: Math.round(x.r * 100) / 100 }));
    const flags = this.getClientsWithFlags();
    const burned = this.get(`SELECT COALESCE(SUM(bonus), 0) AS b, COALESCE(SUM(stamps), 0) AS s FROM expiry_log WHERE strftime('%Y-%m', created_at, 'localtime') = ?`, [ym]) || { b: 0, s: 0 };
    return {
      ym, prevYm, cur, prev, top,
      atRisk: flags.filter(c => c.isAtRisk).length,
      totalClients: one(`SELECT COUNT(*) FROM clients`),
      tiers: { silver: flags.filter(c => c.tier === 'silver').length, gold: flags.filter(c => c.tier === 'gold').length },
      burned: { bonus: Math.round(burned.b || 0), stamps: burned.s || 0 },
      cur$: this.getSettings().spend_currency || 'EUR'
    };
  }

  // ---------- точки ----------
  listLocations() { return this.all(`SELECT * FROM locations ORDER BY id`); }
  addLocation(name) { return this.run(`INSERT INTO locations (name) VALUES (?)`, [name]); }
  renameLocation(id, name) { this.run(`UPDATE locations SET name = ? WHERE id = ?`, [name, id]); }
  removeLocation(id) {
    this.run(`DELETE FROM locations WHERE id = ?`, [id]);
    this.run(`UPDATE staff SET location_id = NULL WHERE location_id = ?`, [id]);
    const cur = this.getSettings().current_location_id;
    if (String(cur) === String(id)) this.saveSettings({ current_location_id: '' });
  }

  // Отчёт за текущий месяц: по сотрудникам и по точкам (сканы, клиенты, выручка).
  getTeamReport() {
    const monthCond = `strftime('%Y-%m', h.created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')`;
    const byStaff = this.all(`
      SELECT h.staff_id AS id, s.name AS name, h.source AS source, COUNT(*) AS scans,
             COUNT(DISTINCT h.client_id) AS clients, SUM(CASE WHEN h.result = 'reward' THEN 1 ELSE 0 END) AS rewards,
             COALESCE(SUM(h.amount_spent), 0) AS revenue
      FROM scan_history h LEFT JOIN staff s ON s.id = h.staff_id
      WHERE ${monthCond}
      GROUP BY h.staff_id, CASE WHEN h.staff_id IS NULL THEN h.source ELSE '' END
      ORDER BY scans DESC`);
    const byLocation = this.all(`
      SELECT h.location_id AS id, l.name AS name, COUNT(*) AS scans, COUNT(DISTINCT h.client_id) AS clients,
             COALESCE(SUM(h.amount_spent), 0) AS revenue
      FROM scan_history h LEFT JOIN locations l ON l.id = h.location_id
      WHERE ${monthCond}
      GROUP BY h.location_id ORDER BY scans DESC`);
    return { byStaff, byLocation };
  }

  // Сумма покупки указывается отдельным шагом ПОСЛЕ скана (необязательно) — вот почему
  // нужен отдельный метод для дозаписи в уже созданную строку истории, а не сразу при скане.
  updateScanAmount(historyId, amount) {
    this.run(`UPDATE scan_history SET amount_spent = ? WHERE id = ?`, [amount, historyId]);
  }

  getClientTotalSpent(clientId) {
    const row = this.get(`SELECT COALESCE(SUM(amount_spent), 0) AS total FROM scan_history WHERE client_id = ?`, [clientId]);
    return row ? Math.round((Number(row.total) || 0) * 100) / 100 : 0;
  }

  // «Лидеры по тратам» — виджет на Главной, кто из клиентов потратил больше всего суммарно
  // (по всем указанным суммам покупок, независимо от типа карты).
  getTopSpenders(limit = 5) {
    return this.all(`
      SELECT clients.id, clients.name, SUM(scan_history.amount_spent) AS total
      FROM scan_history JOIN clients ON clients.id = scan_history.client_id
      WHERE scan_history.amount_spent IS NOT NULL
      GROUP BY clients.id
      ORDER BY total DESC
      LIMIT ?
    `, [limit]);
  }

  // Переносит детальные записи истории старше N месяцев в помесячные итоги и удаляет их —
  // на уровень клиента (lifetime_purchases/lifetime_rewards) это не влияет, они считаются
  // отдельно и не зависят от scan_history.
  archiveOldScanHistory(monthsToKeep = 6) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - monthsToKeep);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const rows = this.all(`
      SELECT strftime('%Y-%m', created_at) AS ym, result, COUNT(*) AS n
      FROM scan_history
      WHERE date(created_at) < ?
      GROUP BY ym, result
    `, [cutoffStr]);
    if (rows.length === 0) return { archived: 0 };

    rows.forEach(r => {
      const existing = this.get(`SELECT year_month FROM scan_history_archive WHERE year_month = ?`, [r.ym]);
      const discountAdd = r.result === 'discount' ? r.n : 0;
      const stampAdd = r.result === 'stamp' ? r.n : 0;
      const rewardAdd = r.result === 'reward' ? r.n : 0;
      if (existing) {
        this.run(
          `UPDATE scan_history_archive SET discount_count = discount_count + ?, stamp_count = stamp_count + ?, reward_count = reward_count + ? WHERE year_month = ?`,
          [discountAdd, stampAdd, rewardAdd, r.ym]
        );
      } else {
        this.run(
          `INSERT INTO scan_history_archive (year_month, discount_count, stamp_count, reward_count) VALUES (?, ?, ?, ?)`,
          [r.ym, discountAdd, stampAdd, rewardAdd]
        );
      }
    });

    const totalArchived = rows.reduce((sum, r) => sum + r.n, 0);
    this.run(`DELETE FROM scan_history WHERE date(created_at) < ?`, [cutoffStr]);
    return { archived: totalArchived };
  }

  getHistoryByClient(clientId, limit = 100) {
    return this.all(`
      SELECT scan_history.*, cards.type AS card_type, cards.title AS card_title, cards.discount_percent, cards.stamp_target AS card_stamp_target
      FROM scan_history
      JOIN cards ON cards.id = scan_history.card_id
      WHERE scan_history.client_id = ?
      ORDER BY scan_history.created_at DESC
      LIMIT ?
    `, [clientId, limit]);
  }

  getHistoryByCard(cardId, limit = 100) {
    return this.all(`
      SELECT scan_history.*, cards.stamp_target AS card_stamp_target
      FROM scan_history
      JOIN cards ON cards.id = scan_history.card_id
      WHERE scan_history.card_id = ?
      ORDER BY scan_history.created_at DESC
      LIMIT ?
    `, [cardId, limit]);
  }

  getRecentHistory(limit = 20) {
    return this.all(`
      SELECT scan_history.*, clients.name AS client_name, cards.type AS card_type, cards.title AS card_title, cards.discount_percent, cards.stamp_target AS card_stamp_target
      FROM scan_history
      JOIN clients ON clients.id = scan_history.client_id
      JOIN cards ON cards.id = scan_history.card_id
      ORDER BY scan_history.created_at DESC
      LIMIT ?
    `, [limit]);
  }

  // ---------- уровни клиентов ----------
  // Пороги по общему числу покупок (все сканы: скидки + штампы + награды).
  static tierFromCount(n) {
    if (n >= 100) return 'gold';
    if (n >= 50) return 'silver';
    return 'basic';
  }

  getPurchaseCounts() {
    const rows = this.all(`SELECT id AS client_id, lifetime_purchases AS n FROM clients`);
    const map = {};
    rows.forEach(r => { map[r.client_id] = r.n; });
    return map;
  }

  getClientStats(clientId) {
    const row = this.get(`SELECT lifetime_purchases, lifetime_rewards FROM clients WHERE id = ?`, [clientId]);
    const totalPurchases = row ? row.lifetime_purchases : 0;
    const totalRewards = row ? row.lifetime_rewards : 0;
    return { totalPurchases, totalRewards, tier: this.tierOf(totalPurchases) };
  }

  // ---------- статистика ----------
  getStats() {
    const totalClients = this.get(`SELECT COUNT(*) AS n FROM clients`).n;
    const totalCards = this.get(`SELECT COUNT(*) AS n FROM cards`).n;
    const discountCards = this.get(`SELECT COUNT(*) AS n FROM cards WHERE type = 'discount'`).n;
    const stampCards = this.get(`SELECT COUNT(*) AS n FROM cards WHERE type = 'stamp'`).n;
    const totalScans = this.get(`SELECT COUNT(*) AS n FROM scan_history`).n;
    const totalRewards = this.get(`SELECT COALESCE(SUM(redeemed_count), 0) AS n FROM cards`).n;
    const scansToday = this.get(`
      SELECT COUNT(*) AS n FROM scan_history WHERE date(created_at, 'localtime') = date('now', 'localtime')
    `).n;
    // v2.23: приросты за 7 дней — для подписей на плитках Главной.
    const wk = (sql) => { try { return this.get(sql).n || 0; } catch (e) { return 0; } };
    const newClients7 = wk(`SELECT COUNT(*) AS n FROM clients WHERE created_at >= datetime('now', '-7 days')`);
    const newCards7 = wk(`SELECT COUNT(*) AS n FROM cards WHERE created_at >= datetime('now', '-7 days')`);
    const scans7 = wk(`SELECT COUNT(*) AS n FROM scan_history WHERE created_at >= datetime('now', '-7 days')`);
    const scansPrev7 = wk(`SELECT COUNT(*) AS n FROM scan_history WHERE created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days')`);
    const rewards7 = wk(`SELECT COUNT(*) AS n FROM scan_history WHERE result = 'reward' AND created_at >= datetime('now', '-7 days')`);
    // v2.26: итоги сегодняшнего дня (строка под приветствием) и выдача карт по дням — для мини-графика на плитке.
    const today = (sql) => wk(sql.replace('%T', "date(created_at, 'localtime') = date('now', 'localtime')"));
    const newClientsToday = today(`SELECT COUNT(*) AS n FROM clients WHERE %T`);
    const rewardsToday = today(`SELECT COUNT(*) AS n FROM scan_history WHERE result = 'reward' AND %T`);
    let cardsByDay = [];
    try { cardsByDay = this.all(`SELECT date(created_at, 'localtime') AS day, COUNT(*) AS n FROM cards WHERE date(created_at, 'localtime') >= date('now', 'localtime', '-13 days') GROUP BY day ORDER BY day`); } catch (e) { cardsByDay = []; }
    return { totalClients, totalCards, discountCards, stampCards, totalScans, totalRewards, scansToday, newClients7, newCards7, scans7, scansPrev7, rewards7, newClientsToday, rewardsToday, cardsByDay };
  }

  // ---------- экспорт и сброс данных ----------
  getAllClientsForExport() {
    return this.all(`
      SELECT clients.*,
        (SELECT COUNT(*) FROM cards WHERE cards.client_id = clients.id) AS cards_count,
        (SELECT SUM(amount_spent) FROM scan_history WHERE scan_history.client_id = clients.id AND amount_spent > 0) AS total_spent
      FROM clients
      ORDER BY name COLLATE NOCASE
    `);
  }

  // Сбрасывает только статистику/активность: историю сканирований, счётчики штампов
  // и наград, подарки. Клиенты и сами карты (и их тип/скидка/название) остаются.
  resetStatistics() {
    this.run(`DELETE FROM scan_history`);
    this.run(`DELETE FROM client_gifts`);
    this.run(`UPDATE cards SET stamp_count = 0, redeemed_count = 0`);
  }

  // Полностью очищает базу: всех клиентов, все карты, историю, подарки.
  // Настройки (SMTP, язык приложения) не трогает.
  resetAllData() {
    this.run(`DELETE FROM scan_history`);
    this.run(`DELETE FROM client_gifts`);
    this.run(`DELETE FROM cards`);
    this.run(`DELETE FROM clients`);
  }

  // ---------- продвинутая аналитика ----------
  // Клиенты, которые обычно приходят с каким-то своим ритмом (например, раз в 3-4 недели
  // на стрижку или маникюр), но в этот раз задержались заметно дольше обычного для себя.
  // Работает для любой ниши — не завязано на погоду или другую специфику кофеен.
  getOverdueClients(limit = 5) {
    const rows = this.all(`SELECT client_id, created_at FROM scan_history ORDER BY client_id, created_at`);
    const byClient = {};
    rows.forEach(r => {
      if (!byClient[r.client_id]) byClient[r.client_id] = [];
      byClient[r.client_id].push(r.created_at);
    });
    const now = new Date();
    const results = [];
    Object.keys(byClient).forEach(clientId => {
      const dates = byClient[clientId].map(d => new Date(d.replace(' ', 'T') + 'Z'));
      if (dates.length < 3) return; // нужно хотя бы 3 визита, чтобы понять типичный для клиента интервал
      const gaps = [];
      for (let i = 1; i < dates.length; i++) {
        gaps.push((dates[i] - dates[i - 1]) / 86400000);
      }
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const daysSinceLast = (now - dates[dates.length - 1]) / 86400000;
      // Просрочен, если задержался минимум на 40% от своего обычного ритма, но не более чем
      // в 4 раза — совсем давно пропавшие уже покрыты отдельным сегментом "неактивные".
      if (avgGap >= 3 && daysSinceLast > avgGap * 1.4 && daysSinceLast < avgGap * 4) {
        results.push({ clientId: Number(clientId), daysSinceLast: Math.round(daysSinceLast), avgGap: Math.round(avgGap) });
      }
    });
    results.sort((a, b) => (b.daysSinceLast - b.avgGap) - (a.daysSinceLast - a.avgGap));
    return results.slice(0, limit).map(r => {
      const c = this.get(`SELECT name FROM clients WHERE id = ?`, [r.clientId]);
      return { clientId: r.clientId, name: c ? c.name : '?', daysSinceLast: r.daysSinceLast, avgGap: r.avgGap };
    });
  }

  // Маркетинг → «Возвращаемость»: насколько клиенты приходят снова.
  getRetentionKpi() {
    const rows = this.all(`SELECT client_id, created_at, amount_spent FROM scan_history ORDER BY client_id, created_at`);
    const now = Date.now(), D = 86400000;
    const by = new Map();
    rows.forEach(r => { const t = Date.parse(String(r.created_at).replace(' ', 'T') + 'Z'); if (!by.has(r.client_id)) by.set(r.client_id, []); by.get(r.client_id).push(t); });
    let withVisit = 0, repeaters = 0, returning30 = 0, gapSum = 0, gapN = 0, visits30 = 0, visitsPrev30 = 0;
    for (const ts of by.values()) {
      withVisit++;
      if (ts.length >= 2) {
        repeaters++;
        const g = (ts[ts.length - 1] - ts[0]) / (ts.length - 1) / D;
        if (g >= 0.5) { gapSum += g; gapN++; }
      }
      const recent = ts.filter(x => now - x <= 30 * D);
      if (recent.length && ts.some(x => now - x > 30 * D)) returning30++;
      visits30 += recent.length;
      visitsPrev30 += ts.filter(x => now - x > 30 * D && now - x <= 60 * D).length;
    }
    const chk = this.get(`SELECT AVG(amount_spent) AS a FROM scan_history WHERE amount_spent > 0 AND created_at >= datetime('now', '-30 days')`);
    return {
      repeatRate: withVisit ? Math.round(repeaters / withVisit * 100) : 0, withVisit, repeaters, returning30,
      avgGapDays: gapN ? Math.round(gapSum / gapN) : 0, visits30, visitsPrev30,
      atRisk: this.getOverdueClients(100000).length,
      avgCheck: chk && chk.a ? Math.round(chk.a * 100) / 100 : 0
    };
  }

  getAdvancedStats() {
    const activeClients = this.get(`
      SELECT COUNT(DISTINCT client_id) AS n FROM scan_history
      WHERE created_at >= datetime('now', '-30 days')
    `).n;

    const newClientsThisMonth = this.get(`
      SELECT COUNT(*) AS n FROM clients
      WHERE strftime('%Y-%m', created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')
    `).n;

    const returningClients = this.get(`
      SELECT COUNT(*) AS n FROM (
        SELECT client_id FROM scan_history GROUP BY client_id HAVING COUNT(*) > 1
      )
    `).n;

    const discountsUsed = this.get(`SELECT COUNT(*) AS n FROM scan_history WHERE result = 'discount'`).n;

    const avgRow = this.get(`
      SELECT AVG(cnt) AS avg FROM (SELECT COUNT(*) AS cnt FROM scan_history GROUP BY client_id)
    `);
    const avgVisits = avgRow && avgRow.avg ? Math.round(avgRow.avg * 10) / 10 : 0;

    // Клиенты, у которых последний визит был больше 30 дней назад (или ни одного визита, а сам клиент добавлен давно).
    const inactiveClients = this.all(`
      SELECT clients.id, clients.name, clients.email, clients.preferred_language, MAX(scan_history.created_at) AS last_visit
      FROM clients
      LEFT JOIN scan_history ON scan_history.client_id = clients.id
      GROUP BY clients.id
      HAVING (last_visit IS NOT NULL AND last_visit < datetime('now', '-30 days'))
         OR (last_visit IS NULL AND clients.created_at < datetime('now', '-30 days'))
    `);

    return { activeClients, newClientsThisMonth, returningClients, discountsUsed, avgVisits, inactiveClients };
  }

  getTopClients(limit = 5) {
    return this.all(`
      SELECT clients.id, clients.name, COUNT(*) AS visits
      FROM scan_history JOIN clients ON clients.id = scan_history.client_id
      GROUP BY clients.id
      ORDER BY visits DESC
      LIMIT ?
    `, [limit]);
  }

  getTopCards(limit = 5) {
    return this.all(`
      SELECT cards.id, cards.type, cards.title, cards.discount_percent, COUNT(*) AS uses
      FROM scan_history JOIN cards ON cards.id = scan_history.card_id
      GROUP BY cards.id
      ORDER BY uses DESC
      LIMIT ?
    `, [limit]);
  }

  getVisitsByDay(days = 14) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (days - 1));
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
    return this.all(`
      SELECT date(created_at, 'localtime') AS day, COUNT(*) AS n
      FROM scan_history
      WHERE date(created_at, 'localtime') >= ?
      GROUP BY day
      ORDER BY day ASC
    `, [cutoffStr]);
  }

  // Распределение посещений по дням недели (0=вс...6=сб) — для поиска "слабых" дней.
  getVisitsByWeekday() {
    const rows = this.all(`
      SELECT CAST(strftime('%w', created_at, 'localtime') AS INTEGER) AS dow, COUNT(*) AS n
      FROM scan_history
      GROUP BY dow
    `);
    const counts = [0, 0, 0, 0, 0, 0, 0];
    let total = 0;
    rows.forEach(r => { counts[r.dow] = r.n; total += r.n; });
    return { counts, total };
  }

  // Распределение посещений по часам суток — для поиска самого активного времени.
  getVisitsByHour() {
    const rows = this.all(`
      SELECT CAST(strftime('%H', created_at, 'localtime') AS INTEGER) AS hour, COUNT(*) AS n
      FROM scan_history
      GROUP BY hour
    `);
    const counts = new Array(24).fill(0);
    let total = 0;
    rows.forEach(r => { counts[r.hour] = r.n; total += r.n; });
    return { counts, total };
  }

  // ---------- аналитика выручки (по суммам покупок, введённым при сканировании) ----------
  getRevenueStats() {
    const month = (offset) => this.get(`
      SELECT COALESCE(SUM(amount_spent), 0) AS total, COUNT(*) AS checks
      FROM scan_history
      WHERE amount_spent > 0
        AND strftime('%Y-%m', created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime', '${offset}')
    `);
    const cur = month('+0 months');
    const prev = month('-1 months');
    const all = this.get(`SELECT COALESCE(SUM(amount_spent), 0) AS total, COUNT(*) AS checks FROM scan_history WHERE amount_spent > 0`);
    return {
      monthRevenue: cur.total, monthChecks: cur.checks, avgCheck: cur.checks ? cur.total / cur.checks : 0,
      prevMonthRevenue: prev.total, prevAvgCheck: prev.checks ? prev.total / prev.checks : 0,
      totalRevenue: all.total, totalChecks: all.checks
    };
  }

  getRevenueByMonth(months = 6) {
    return this.all(`
      SELECT strftime('%Y-%m', created_at, 'localtime') AS ym, ROUND(SUM(amount_spent), 2) AS n
      FROM scan_history
      WHERE amount_spent > 0 AND created_at >= datetime('now', '-${Math.max(1, Math.min(24, Number(months) || 6))} months')
      GROUP BY ym ORDER BY ym
    `);
  }

  // Тепловая карта посещений: день недели × час (по местному времени) за последние N дней.
  getVisitHeatmap(days = 90) {
    const rows = this.all(`
      SELECT CAST(strftime('%w', created_at, 'localtime') AS INTEGER) AS dow,
             CAST(strftime('%H', created_at, 'localtime') AS INTEGER) AS hour, COUNT(*) AS n
      FROM scan_history
      WHERE created_at >= datetime('now', '-${Math.max(7, Math.min(365, Number(days) || 90))} days')
      GROUP BY dow, hour
    `);
    const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
    let max = 0, total = 0;
    rows.forEach(r => { grid[r.dow][r.hour] = r.n; max = Math.max(max, r.n); total += r.n; });
    return { grid, max, total };
  }

  // Воронка лояльности: сколько клиентов дошли до каждого шага.
  getLoyaltyFunnel() {
    const total = this.get(`SELECT COUNT(*) AS n FROM clients`).n;
    const counts = this.all(`SELECT client_id, COUNT(*) AS n FROM scan_history GROUP BY client_id`);
    const byClient = {};
    counts.forEach(r => { byClient[r.client_id] = r.n; });
    const purchase = this.getPurchaseCounts();
    const visitsOf = (id) => Math.max(byClient[id] || 0, purchase[id] || 0);
    const ids = this.all(`SELECT id, lifetime_rewards FROM clients`);
    return {
      total,
      firstVisit: ids.filter(c => visitsOf(c.id) >= 1).length,
      returned: ids.filter(c => visitsOf(c.id) >= 2).length,
      regular: ids.filter(c => visitsOf(c.id) >= 5).length,
      rewarded: ids.filter(c => (c.lifetime_rewards || 0) > 0).length
    };
  }

  getRewardsByDay(days = 14) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (days - 1));
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
    return this.all(`
      SELECT date(created_at, 'localtime') AS day, COUNT(*) AS n
      FROM scan_history
      WHERE result = 'reward' AND date(created_at, 'localtime') >= ?
      GROUP BY day
      ORDER BY day ASC
    `, [cutoffStr]);
  }

  getNewClientsByMonth(months = 6) {
    return this.all(`
      SELECT strftime('%Y-%m', created_at, 'localtime') AS ym, COUNT(*) AS n
      FROM clients
      GROUP BY ym
      ORDER BY ym ASC
    `);
  }

  getCardUsageByType() {
    const discount = this.get(`SELECT COUNT(*) AS n FROM scan_history WHERE result = 'discount'`).n;
    const stampAdd = this.get(`SELECT COUNT(*) AS n FROM scan_history WHERE result = 'stamp'`).n;
    const reward = this.get(`SELECT COUNT(*) AS n FROM scan_history WHERE result = 'reward'`).n;
    return { discount, stampAdd, reward };
  }

  // ---------- сегменты клиентов (для рассылок) ----------
  // Сколько клиентов предпочитают какой язык — чтобы было проще решить, на какой язык
  // делать акцент в рассылках и на что стоит потратить время при переводах.
  getClientLanguageCounts() {
    const rows = this.all(`SELECT preferred_language, COUNT(*) AS n FROM clients GROUP BY preferred_language`);
    const counts = { ru: 0, sk: 0, uk: 0, en: 0, unset: 0 };
    rows.forEach(r => {
      const lang = r.preferred_language;
      if (lang === 'ru' || lang === 'sk' || lang === 'uk' || lang === 'en') counts[lang] = r.n;
      else counts.unset += r.n;
    });
    return counts;
  }

  getClientsWithFlags() {
    const clients = this.all(`SELECT * FROM clients`);
    const purchaseCounts = this.getPurchaseCounts();
    const activeIds = new Set(
      this.all(`SELECT DISTINCT client_id AS id FROM scan_history WHERE created_at >= datetime('now', '-30 days')`).map(r => r.id)
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Для «умных» сегментов маркетинга: ритм визитов каждого клиента и близость к награде.
    const visitStats = {};
    this.all(`SELECT client_id, COUNT(*) AS n, MIN(created_at) AS first_at, MAX(created_at) AS last_at FROM scan_history GROUP BY client_id`)
      .forEach(r => { visitStats[r.client_id] = r; });
    const nearReward = new Set(
      this.all(`SELECT DISTINCT client_id FROM cards
                WHERE (type = 'stamp' AND stamp_count > 0 AND stamp_target - stamp_count <= 2)
                   OR (type = 'spend' AND spend_target > 0 AND spend_accumulated >= spend_target * 0.8)`).map(r => r.client_id)
    );
    const dayMs = 86400000;
    const parseUtc = (str) => new Date(String(str).replace(' ', 'T') + 'Z').getTime();
    const nowMs = Date.now();

    const tcfg = this.tierConfig();
    return clients.map(c => {
      const purchaseCount = purchaseCounts[c.id] || 0;
      const tier = this.tierOf(purchaseCount, tcfg);
      const isActive = activeIds.has(c.id);
      const vs = visitStats[c.id];
      const visits = vs ? vs.n : 0;
      const createdDays = c.created_at ? (nowMs - parseUtc(c.created_at)) / dayMs : 0;
      // Новичок без второго визита: пришёл 3–45 дней назад и был максимум один раз.
      const isNewNoReturn = createdDays >= 3 && createdDays <= 45 && visits <= 1;
      // Под угрозой ухода: постоянный клиент (3+ визита), который пропал заметно дольше
      // своего обычного ритма (в 2 раза, но не меньше 3 недель), и ещё не потерян (до 120 дней).
      let isAtRisk = false;
      if (vs && visits >= 3) {
        const avgGap = (parseUtc(vs.last_at) - parseUtc(vs.first_at)) / dayMs / (visits - 1);
        const since = (nowMs - parseUtc(vs.last_at)) / dayMs;
        isAtRisk = since > Math.max(21, avgGap * 2) && since <= 120;
      }
      let isBirthdaySoon = false;
      if (c.birthday) {
        const bd = new Date(c.birthday);
        if (!isNaN(bd.getTime())) {
          const next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
          if (next < today) next.setFullYear(today.getFullYear() + 1);
          const diffDays = Math.round((next - today) / 86400000);
          isBirthdaySoon = diffDays <= 14;
        }
      }
      return { ...c, purchaseCount, tier, isActive, isInactive: !isActive, isVIP: tier === 'gold', isBirthdaySoon,
        isNearReward: nearReward.has(c.id), isNewNoReturn, isAtRisk,
        // Довольные постоянные клиенты — лучшие кандидаты оставить отзыв.
        isFan: visits >= 5 && isActive,
        lastVisitAt: vs ? vs.last_at : null };
    });
  }

  getClientsByIds(ids) {
    if (!ids || !ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    return this.all(`SELECT * FROM clients WHERE id IN (${placeholders})`, ids);
  }

  markNamedaySent(clientId, dateStr) {
    this.run(`UPDATE clients SET nameday_last_sent = ? WHERE id = ?`, [dateStr, clientId]);
  }

  // ---------- клиент месяца ----------
  // ym — 'YYYY-MM' (по умолчанию текущий месяц). При равенстве визитов побеждает тот, кто пришёл раньше.
  getClientOfMonth(ym) {
    const month = /^\d{4}-\d{2}$/.test(String(ym || '')) ? ym : null;
    return this.get(`
      SELECT clients.id, clients.name, clients.email, clients.telegram_chat_id, COUNT(*) AS visits
      FROM scan_history JOIN clients ON clients.id = scan_history.client_id
      WHERE strftime('%Y-%m', scan_history.created_at) = ${month ? '?' : "strftime('%Y-%m', 'now')"}
      GROUP BY clients.id
      ORDER BY visits DESC, MIN(scan_history.created_at) ASC
      LIMIT 1
    `, month ? [month] : []);
  }
  getGiftSince(clientId, since) {
    return this.get(`SELECT * FROM client_gifts WHERE client_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 1`, [clientId, since]);
  }

  // ---------- подарки клиентам ----------
  addClientGift(clientId, giftText) {
    const id = this.run(`INSERT INTO client_gifts (client_id, gift_text, status) VALUES (?, ?, 'pending')`, [clientId, giftText]);
    return this.get(`SELECT * FROM client_gifts WHERE id = ?`, [id]);
  }

  getLatestGift(clientId) {
    return this.get(`SELECT * FROM client_gifts WHERE client_id = ? ORDER BY created_at DESC LIMIT 1`, [clientId]);
  }

  getPendingGift(clientId) {
    return this.get(`SELECT * FROM client_gifts WHERE client_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1`, [clientId]);
  }

  markGiftGiven(giftId) {
    this.run(`UPDATE client_gifts SET status = 'given', given_at = CURRENT_TIMESTAMP WHERE id = ?`, [giftId]);
  }

  // ---------- settings (SMTP и т.п.) ----------
  getSettings() {
    const rows = this.all(`SELECT key, value FROM settings`);
    const obj = {};
    rows.forEach(r => obj[r.key] = r.value);
    return obj;
  }

  saveSettings(settingsObj) {
    for (const [key, value] of Object.entries(settingsObj)) {
      this.run(`INSERT INTO settings (key, value) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [key, String(value)]);
    }
  }
}

module.exports = Database;
module.exports.FreeLimitError = FreeLimitError;

}, {"fs":4,"path":10,"crypto":6,"sql.js":43}, "/app/pc-app/db.js"];
__defs[43] = [function(module, exports, require, __filename, __dirname){
// sql.js для Android-версии: та же SQLite (WebAssembly), файл .wasm лежит в www/vendor.
'use strict';
const init = require('sql.js/dist/sql-wasm.js');
module.exports = function initSqlJs() { return init({ locateFile: (f) => 'vendor/' + f }); };

}, {"sql.js/dist/sql-wasm.js":44}, "/app/shims/sqljs.js"];
__defs[44] = [function(module, exports, require, __filename, __dirname){

// We are modularizing this manually because the current modularize setting in Emscripten has some issues:
// https://github.com/kripken/emscripten/issues/5820
// In addition, When you use emcc's modularization, it still expects to export a global object called `Module`,
// which is able to be used/called before the WASM is loaded.
// The modularization below exports a promise that loads and resolves to the actual sql.js module.
// That way, this module can't be used before the WASM is finished loading.

// We are going to define a function that a user will call to start loading initializing our Sql.js library
// However, that function might be called multiple times, and on subsequent calls, we don't actually want it to instantiate a new instance of the Module
// Instead, we want to return the previously loaded module

// TODO: Make this not declare a global if used in the browser
var initSqlJsPromise = undefined;

var initSqlJs = function (moduleConfig) {

    if (initSqlJsPromise){
      return initSqlJsPromise;
    }
    // If we're here, we've never called this function before
    initSqlJsPromise = new Promise(function (resolveModule, reject) {

        // We are modularizing this manually because the current modularize setting in Emscripten has some issues:
        // https://github.com/kripken/emscripten/issues/5820

        // The way to affect the loading of emcc compiled modules is to create a variable called `Module` and add
        // properties to it, like `preRun`, `postRun`, etc
        // We are using that to get notified when the WASM has finished loading.
        // Only then will we return our promise

        // If they passed in a moduleConfig object, use that
        // Otherwise, initialize Module to the empty object
        var Module = typeof moduleConfig !== 'undefined' ? moduleConfig : {};

        // EMCC only allows for a single onAbort function (not an array of functions)
        // So if the user defined their own onAbort function, we remember it and call it
        var originalOnAbortFunction = Module['onAbort'];
        Module['onAbort'] = function (errorThatCausedAbort) {
            reject(new Error(errorThatCausedAbort));
            if (originalOnAbortFunction){
              originalOnAbortFunction(errorThatCausedAbort);
            }
        };

        Module['postRun'] = Module['postRun'] || [];
        Module['postRun'].push(function () {
            // When Emscripted calls postRun, this promise resolves with the built Module
            resolveModule(Module);
        });

        // There is a section of code in the emcc-generated code below that looks like this:
        // (Note that this is lowercase `module`)
        // if (typeof module !== 'undefined') {
        //     module['exports'] = Module;
        // }
        // When that runs, it's going to overwrite our own modularization export efforts in shell-post.js!
        // The only way to tell emcc not to emit it is to pass the MODULARIZE=1 or MODULARIZE_INSTANCE=1 flags,
        // but that carries with it additional unnecessary baggage/bugs we don't want either.
        // So, we have three options:
        // 1) We undefine `module`
        // 2) We remember what `module['exports']` was at the beginning of this function and we restore it later
        // 3) We write a script to remove those lines of code as part of the Make process.
        //
        // Since those are the only lines of code that care about module, we will undefine it. It's the most straightforward
        // of the options, and has the side effect of reducing emcc's efforts to modify the module if its output were to change in the future.
        // That's a nice side effect since we're handling the modularization efforts ourselves
        module = undefined;

        // The emcc-generated code and shell-post.js code goes below,
        // meaning that all of it runs inside of this promise. If anything throws an exception, our promise will abort
var k;k||=typeof Module != 'undefined' ? Module : {};var aa=!!globalThis.window,ba=!!globalThis.WorkerGlobalScope,ca=globalThis.process?.versions?.node&&"renderer"!=globalThis.process?.type;
k.onRuntimeInitialized=function(){function a(f,l){switch(typeof l){case "boolean":dc(f,l?1:0);break;case "number":ec(f,l);break;case "string":fc(f,l,-1,-1);break;case "object":if(null===l)lb(f);else if(null!=l.length){var n=da(l.length);m.set(l,n);gc(f,n,l.length,-1);ea(n)}else va(f,"Wrong API use : tried to return a value of an unknown type ("+l+").",-1);break;default:lb(f)}}function b(f,l){for(var n=[],p=0;p<f;p+=1){var r=t(l+4*p,"i32"),w=hc(r);if(1===w||2===w)r=ic(r);else if(3===w)r=jc(r);else if(4===
w){w=r;r=kc(w);w=lc(w);for(var J=new Uint8Array(r),I=0;I<r;I+=1)J[I]=m[w+I];r=J}else r=null;n.push(r)}return n}function c(f,l){this.Qa=f;this.db=l;this.Oa=1;this.mb=[]}function d(f,l){this.db=l;this.fb=fa(f);if(null===this.fb)throw Error("Unable to allocate memory for the SQL string");this.lb=this.fb;this.$a=this.sb=null}function e(f){this.filename="dbfile_"+(4294967295*Math.random()>>>0);if(null!=f){var l=this.filename,n="/",p=l;n&&(n="string"==typeof n?n:ha(n),p=l?ia(n+"/"+l):n);l=ja(!0,!0);p=ka(p,
l);if(f){if("string"==typeof f){n=Array(f.length);for(var r=0,w=f.length;r<w;++r)n[r]=f.charCodeAt(r);f=n}ma(p,l|146);n=na(p,577);oa(n,f,0,f.length,0);pa(n);ma(p,l)}}this.handleError(q(this.filename,g));this.db=t(g,"i32");ob(this.db);this.gb={};this.Sa={}}var g=y(4),h=k.cwrap,q=h("sqlite3_open","number",["string","number"]),v=h("sqlite3_close_v2","number",["number"]),u=h("sqlite3_exec","number",["number","string","number","number","number"]),x=h("sqlite3_changes","number",["number"]),D=h("sqlite3_prepare_v2",
"number",["number","string","number","number","number"]),pb=h("sqlite3_sql","string",["number"]),nc=h("sqlite3_normalized_sql","string",["number"]),qb=h("sqlite3_prepare_v2","number",["number","number","number","number","number"]),oc=h("sqlite3_bind_text","number",["number","number","number","number","number"]),rb=h("sqlite3_bind_blob","number",["number","number","number","number","number"]),pc=h("sqlite3_bind_double","number",["number","number","number"]),qc=h("sqlite3_bind_int","number",["number",
"number","number"]),rc=h("sqlite3_bind_parameter_index","number",["number","string"]),sc=h("sqlite3_step","number",["number"]),tc=h("sqlite3_errmsg","string",["number"]),uc=h("sqlite3_column_count","number",["number"]),vc=h("sqlite3_data_count","number",["number"]),wc=h("sqlite3_column_double","number",["number","number"]),sb=h("sqlite3_column_text","string",["number","number"]),xc=h("sqlite3_column_blob","number",["number","number"]),yc=h("sqlite3_column_bytes","number",["number","number"]),zc=h("sqlite3_column_type",
"number",["number","number"]),Ac=h("sqlite3_column_name","string",["number","number"]),Bc=h("sqlite3_reset","number",["number"]),Cc=h("sqlite3_clear_bindings","number",["number"]),Dc=h("sqlite3_finalize","number",["number"]),tb=h("sqlite3_create_function_v2","number","number string number number number number number number number".split(" ")),hc=h("sqlite3_value_type","number",["number"]),kc=h("sqlite3_value_bytes","number",["number"]),jc=h("sqlite3_value_text","string",["number"]),lc=h("sqlite3_value_blob",
"number",["number"]),ic=h("sqlite3_value_double","number",["number"]),ec=h("sqlite3_result_double","",["number","number"]),lb=h("sqlite3_result_null","",["number"]),fc=h("sqlite3_result_text","",["number","string","number","number"]),gc=h("sqlite3_result_blob","",["number","number","number","number"]),dc=h("sqlite3_result_int","",["number","number"]),va=h("sqlite3_result_error","",["number","string","number"]),ub=h("sqlite3_aggregate_context","number",["number","number"]),ob=h("RegisterExtensionFunctions",
"number",["number"]),vb=h("sqlite3_update_hook","number",["number","number","number"]);c.prototype.bind=function(f){if(!this.Qa)throw"Statement closed";this.reset();return Array.isArray(f)?this.Gb(f):null!=f&&"object"===typeof f?this.Hb(f):!0};c.prototype.step=function(){if(!this.Qa)throw"Statement closed";this.Oa=1;var f=sc(this.Qa);switch(f){case 100:return!0;case 101:return!1;default:throw this.db.handleError(f);}};c.prototype.Ab=function(f){null==f&&(f=this.Oa,this.Oa+=1);return wc(this.Qa,f)};
c.prototype.Ob=function(f){null==f&&(f=this.Oa,this.Oa+=1);f=sb(this.Qa,f);if("function"!==typeof BigInt)throw Error("BigInt is not supported");return BigInt(f)};c.prototype.Tb=function(f){null==f&&(f=this.Oa,this.Oa+=1);return sb(this.Qa,f)};c.prototype.getBlob=function(f){null==f&&(f=this.Oa,this.Oa+=1);var l=yc(this.Qa,f);f=xc(this.Qa,f);for(var n=new Uint8Array(l),p=0;p<l;p+=1)n[p]=m[f+p];return n};c.prototype.get=function(f,l){l=l||{};null!=f&&this.bind(f)&&this.step();f=[];for(var n=vc(this.Qa),
p=0;p<n;p+=1)switch(zc(this.Qa,p)){case 1:var r=l.useBigInt?this.Ob(p):this.Ab(p);f.push(r);break;case 2:f.push(this.Ab(p));break;case 3:f.push(this.Tb(p));break;case 4:f.push(this.getBlob(p));break;default:f.push(null)}return f};c.prototype.qb=function(){for(var f=[],l=uc(this.Qa),n=0;n<l;n+=1)f.push(Ac(this.Qa,n));return f};c.prototype.zb=function(f,l){f=this.get(f,l);l=this.qb();for(var n={},p=0;p<l.length;p+=1)n[l[p]]=f[p];return n};c.prototype.Sb=function(){return pb(this.Qa)};c.prototype.Pb=
function(){return nc(this.Qa)};c.prototype.run=function(f){null!=f&&this.bind(f);this.step();return this.reset()};c.prototype.wb=function(f,l){null==l&&(l=this.Oa,this.Oa+=1);f=fa(f);this.mb.push(f);this.db.handleError(oc(this.Qa,l,f,-1,0))};c.prototype.Fb=function(f,l){null==l&&(l=this.Oa,this.Oa+=1);var n=da(f.length);m.set(f,n);this.mb.push(n);this.db.handleError(rb(this.Qa,l,n,f.length,0))};c.prototype.vb=function(f,l){null==l&&(l=this.Oa,this.Oa+=1);this.db.handleError((f===(f|0)?qc:pc)(this.Qa,
l,f))};c.prototype.Ib=function(f){null==f&&(f=this.Oa,this.Oa+=1);rb(this.Qa,f,0,0,0)};c.prototype.xb=function(f,l){null==l&&(l=this.Oa,this.Oa+=1);switch(typeof f){case "string":this.wb(f,l);return;case "number":this.vb(f,l);return;case "bigint":this.wb(f.toString(),l);return;case "boolean":this.vb(f+0,l);return;case "object":if(null===f){this.Ib(l);return}if(null!=f.length){this.Fb(f,l);return}}throw"Wrong API use : tried to bind a value of an unknown type ("+f+").";};c.prototype.Hb=function(f){var l=
this;Object.keys(f).forEach(function(n){var p=rc(l.Qa,n);0!==p&&l.xb(f[n],p)});return!0};c.prototype.Gb=function(f){for(var l=0;l<f.length;l+=1)this.xb(f[l],l+1);return!0};c.prototype.reset=function(){this.freemem();return 0===Cc(this.Qa)&&0===Bc(this.Qa)};c.prototype.freemem=function(){for(var f;void 0!==(f=this.mb.pop());)ea(f)};c.prototype.Ya=function(){this.freemem();var f=0===Dc(this.Qa);delete this.db.gb[this.Qa];this.Qa=0;return f};d.prototype.next=function(){if(null===this.fb)return{done:!0};
null!==this.$a&&(this.$a.Ya(),this.$a=null);if(!this.db.db)throw this.ob(),Error("Database closed");var f=qa(),l=y(4);ra(g);ra(l);try{this.db.handleError(qb(this.db.db,this.lb,-1,g,l));this.lb=t(l,"i32");var n=t(g,"i32");if(0===n)return this.ob(),{done:!0};this.$a=new c(n,this.db);this.db.gb[n]=this.$a;return{value:this.$a,done:!1}}catch(p){throw this.sb=z(this.lb),this.ob(),p;}finally{sa(f)}};d.prototype.ob=function(){ea(this.fb);this.fb=null};d.prototype.Qb=function(){return null!==this.sb?this.sb:
z(this.lb)};"function"===typeof Symbol&&"symbol"===typeof Symbol.iterator&&(d.prototype[Symbol.iterator]=function(){return this});e.prototype.run=function(f,l){if(!this.db)throw"Database closed";if(l){f=this.tb(f,l);try{f.step()}finally{f.Ya()}}else this.handleError(u(this.db,f,0,0,g));return this};e.prototype.exec=function(f,l,n){if(!this.db)throw"Database closed";var p=qa(),r=null,w=null,J=null;try{J=w=fa(f);var I=y(4);for(f=[];0!==t(J,"i8");){ra(g);ra(I);this.handleError(qb(this.db,J,-1,g,I));
var L=t(g,"i32");J=t(I,"i32");if(0!==L){var G=null;r=new c(L,this);for(null!=l&&r.bind(l);r.step();)null===G&&(G={columns:r.qb(),values:[]},f.push(G)),G.values.push(r.get(null,n));r.Ya()}}return f}catch(la){throw r&&r.Ya(),la;}finally{w&&ea(w),sa(p)}};e.prototype.Mb=function(f,l,n,p,r){"function"===typeof l&&(p=n,n=l,l=void 0);f=this.tb(f,l);try{for(;f.step();)n(f.zb(null,r))}finally{f.Ya()}if("function"===typeof p)return p()};e.prototype.tb=function(f,l){ra(g);this.handleError(D(this.db,f,-1,g,0));
f=t(g,"i32");if(0===f)throw"Nothing to prepare";var n=new c(f,this);null!=l&&n.bind(l);return this.gb[f]=n};e.prototype.Ub=function(f){return new d(f,this)};e.prototype.Nb=function(){Object.values(this.gb).forEach(function(l){l.Ya()});Object.values(this.Sa).forEach(A);this.Sa={};this.handleError(v(this.db));var f=ta(this.filename);this.handleError(q(this.filename,g));this.db=t(g,"i32");ob(this.db);return f};e.prototype.close=function(){null!==this.db&&(Object.values(this.gb).forEach(function(f){f.Ya()}),
Object.values(this.Sa).forEach(A),this.Sa={},this.Za&&(A(this.Za),this.Za=void 0),this.handleError(v(this.db)),ua("/"+this.filename),this.db=null)};e.prototype.handleError=function(f){if(0===f)return null;f=tc(this.db);throw Error(f);};e.prototype.Rb=function(){return x(this.db)};e.prototype.Kb=function(f,l){Object.prototype.hasOwnProperty.call(this.Sa,f)&&(A(this.Sa[f]),delete this.Sa[f]);var n=wa(function(p,r,w){r=b(r,w);try{var J=l.apply(null,r)}catch(I){va(p,I,-1);return}a(p,J)},"viii");this.Sa[f]=
n;this.handleError(tb(this.db,f,l.length,1,0,n,0,0,0));return this};e.prototype.Jb=function(f,l){var n=l.init||function(){return null},p=l.finalize||function(L){return L},r=l.step;if(!r)throw"An aggregate function must have a step function in "+f;var w={};Object.hasOwnProperty.call(this.Sa,f)&&(A(this.Sa[f]),delete this.Sa[f]);l=f+"__finalize";Object.hasOwnProperty.call(this.Sa,l)&&(A(this.Sa[l]),delete this.Sa[l]);var J=wa(function(L,G,la){var V=ub(L,1);Object.hasOwnProperty.call(w,V)||(w[V]=n());
G=b(G,la);G=[w[V]].concat(G);try{w[V]=r.apply(null,G)}catch(Fc){delete w[V],va(L,Fc,-1)}},"viii"),I=wa(function(L){var G=ub(L,1);try{var la=p(w[G])}catch(V){delete w[G];va(L,V,-1);return}a(L,la);delete w[G]},"vi");this.Sa[f]=J;this.Sa[l]=I;this.handleError(tb(this.db,f,r.length-1,1,0,0,J,I,0));return this};e.prototype.Zb=function(f){this.Za&&(vb(this.db,0,0),A(this.Za),this.Za=void 0);if(!f)return this;this.Za=wa(function(l,n,p,r,w){switch(n){case 18:l="insert";break;case 23:l="update";break;case 9:l=
"delete";break;default:throw"unknown operationCode in updateHook callback: "+n;}p=z(p);r=z(r);if(w>Number.MAX_SAFE_INTEGER)throw"rowId too big to fit inside a Number";f(l,p,r,Number(w))},"viiiij");vb(this.db,this.Za,0);return this};c.prototype.bind=c.prototype.bind;c.prototype.step=c.prototype.step;c.prototype.get=c.prototype.get;c.prototype.getColumnNames=c.prototype.qb;c.prototype.getAsObject=c.prototype.zb;c.prototype.getSQL=c.prototype.Sb;c.prototype.getNormalizedSQL=c.prototype.Pb;c.prototype.run=
c.prototype.run;c.prototype.reset=c.prototype.reset;c.prototype.freemem=c.prototype.freemem;c.prototype.free=c.prototype.Ya;d.prototype.next=d.prototype.next;d.prototype.getRemainingSQL=d.prototype.Qb;e.prototype.run=e.prototype.run;e.prototype.exec=e.prototype.exec;e.prototype.each=e.prototype.Mb;e.prototype.prepare=e.prototype.tb;e.prototype.iterateStatements=e.prototype.Ub;e.prototype["export"]=e.prototype.Nb;e.prototype.close=e.prototype.close;e.prototype.handleError=e.prototype.handleError;e.prototype.getRowsModified=
e.prototype.Rb;e.prototype.create_function=e.prototype.Kb;e.prototype.create_aggregate=e.prototype.Jb;e.prototype.updateHook=e.prototype.Zb;k.Database=e};var xa="./this.program",ya=(a,b)=>{throw b;},za=globalThis.document?.currentScript?.src;"undefined"!=typeof __filename?za=__filename:ba&&(za=self.location.href);var Aa="",Ba,Ca;
if(ca){var fs=require("node:fs");Aa=__dirname+"/";Ca=a=>{a=Da(a)?new URL(a):a;return fs.readFileSync(a)};Ba=async a=>{a=Da(a)?new URL(a):a;return fs.readFileSync(a,void 0)};1<process.argv.length&&(xa=process.argv[1].replace(/\\/g,"/"));process.argv.slice(2);"undefined"!=typeof module&&(module.exports=k);ya=(a,b)=>{process.exitCode=a;throw b;}}else if(aa||ba){try{Aa=(new URL(".",za)).href}catch{}ba&&(Ca=a=>{var b=new XMLHttpRequest;b.open("GET",a,!1);b.responseType="arraybuffer";b.send(null);return new Uint8Array(b.response)});
Ba=async a=>{if(Da(a))return new Promise((c,d)=>{var e=new XMLHttpRequest;e.open("GET",a,!0);e.responseType="arraybuffer";e.onload=()=>{200==e.status||0==e.status&&e.response?c(e.response):d(e.status)};e.onerror=d;e.send(null)});var b=await fetch(a,{credentials:"same-origin"});if(b.ok)return b.arrayBuffer();throw Error(b.status+" : "+b.url);}}var Ea=console.log.bind(console),B=console.error.bind(console),Fa,Ga=!1,Ha,Da=a=>a.startsWith("file://"),m,C,Ia,E,F,Ja,Ka,H;
function La(){var a=Ma.buffer;m=new Int8Array(a);Ia=new Int16Array(a);C=new Uint8Array(a);new Uint16Array(a);E=new Int32Array(a);F=new Uint32Array(a);Ja=new Float32Array(a);Ka=new Float64Array(a);H=new BigInt64Array(a);new BigUint64Array(a)}function Na(a){k.onAbort?.(a);a="Aborted("+a+")";B(a);Ga=!0;throw new WebAssembly.RuntimeError(a+". Build with -sASSERTIONS for more info.");}var Oa;
async function Pa(a){if(!Fa)try{var b=await Ba(a);return new Uint8Array(b)}catch{}if(a==Oa&&Fa)a=new Uint8Array(Fa);else if(Ca)a=Ca(a);else throw"both async and sync fetching of the wasm failed";return a}async function Qa(a,b){try{var c=await Pa(a);return await WebAssembly.instantiate(c,b)}catch(d){B(`failed to asynchronously prepare wasm: ${d}`),Na(d)}}
async function Ra(a){var b=Oa;if(!Fa&&!Da(b)&&!ca)try{var c=fetch(b,{credentials:"same-origin"});return await WebAssembly.instantiateStreaming(c,a)}catch(d){B(`wasm streaming compile failed: ${d}`),B("falling back to ArrayBuffer instantiation")}return Qa(b,a)}class Sa{name="ExitStatus";constructor(a){this.message=`Program terminated with exit(${a})`;this.status=a}}var Ta=a=>{for(;0<a.length;)a.shift()(k)},Ua=[],Va=[],Wa=()=>{var a=k.preRun.shift();Va.push(a)},K=0,Xa=null;
function t(a,b="i8"){b.endsWith("*")&&(b="*");switch(b){case "i1":return m[a];case "i8":return m[a];case "i16":return Ia[a>>1];case "i32":return E[a>>2];case "i64":return H[a>>3];case "float":return Ja[a>>2];case "double":return Ka[a>>3];case "*":return F[a>>2];default:Na(`invalid type for getValue: ${b}`)}}var Ya=!0;
function ra(a){var b="i32";b.endsWith("*")&&(b="*");switch(b){case "i1":m[a]=0;break;case "i8":m[a]=0;break;case "i16":Ia[a>>1]=0;break;case "i32":E[a>>2]=0;break;case "i64":H[a>>3]=BigInt(0);break;case "float":Ja[a>>2]=0;break;case "double":Ka[a>>3]=0;break;case "*":F[a>>2]=0;break;default:Na(`invalid type for setValue: ${b}`)}}
var Za=new TextDecoder,$a=(a,b,c,d)=>{c=b+c;if(d)return c;for(;a[b]&&!(b>=c);)++b;return b},z=(a,b,c)=>a?Za.decode(C.subarray(a,$a(C,a,b,c))):"",ab=(a,b)=>{for(var c=0,d=a.length-1;0<=d;d--){var e=a[d];"."===e?a.splice(d,1):".."===e?(a.splice(d,1),c++):c&&(a.splice(d,1),c--)}if(b)for(;c;c--)a.unshift("..");return a},ia=a=>{var b="/"===a.charAt(0),c="/"===a.slice(-1);(a=ab(a.split("/").filter(d=>!!d),!b).join("/"))||b||(a=".");a&&c&&(a+="/");return(b?"/":"")+a},bb=a=>{var b=/^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(a).slice(1);
a=b[0];b=b[1];if(!a&&!b)return".";b&&=b.slice(0,-1);return a+b},cb=a=>a&&a.match(/([^\/]+|\/)\/*$/)[1],db=()=>{if(ca){var a=require("node:crypto");return b=>a.randomFillSync(b)}return b=>crypto.getRandomValues(b)},eb=a=>{(eb=db())(a)},fb=(...a)=>{for(var b="",c=!1,d=a.length-1;-1<=d&&!c;d--){c=0<=d?a[d]:"/";if("string"!=typeof c)throw new TypeError("Arguments to path.resolve must be strings");if(!c)return"";b=c+"/"+b;c="/"===c.charAt(0)}b=ab(b.split("/").filter(e=>!!e),!c).join("/");return(c?"/":
"")+b||"."},gb=a=>{var b=$a(a,0);return Za.decode(a.buffer?a.subarray(0,b):new Uint8Array(a.slice(0,b)))},hb=[],ib=a=>{for(var b=0,c=0;c<a.length;++c){var d=a.charCodeAt(c);127>=d?b++:2047>=d?b+=2:55296<=d&&57343>=d?(b+=4,++c):b+=3}return b},M=(a,b,c,d)=>{if(!(0<d))return 0;var e=c;d=c+d-1;for(var g=0;g<a.length;++g){var h=a.codePointAt(g);if(127>=h){if(c>=d)break;b[c++]=h}else if(2047>=h){if(c+1>=d)break;b[c++]=192|h>>6;b[c++]=128|h&63}else if(65535>=h){if(c+2>=d)break;b[c++]=224|h>>12;b[c++]=128|
h>>6&63;b[c++]=128|h&63}else{if(c+3>=d)break;b[c++]=240|h>>18;b[c++]=128|h>>12&63;b[c++]=128|h>>6&63;b[c++]=128|h&63;g++}}b[c]=0;return c-e},jb=[];function kb(a,b){jb[a]={input:[],output:[],eb:b};mb(a,nb)}
var nb={open(a){var b=jb[a.node.rdev];if(!b)throw new N(43);a.tty=b;a.seekable=!1},close(a){a.tty.eb.fsync(a.tty)},fsync(a){a.tty.eb.fsync(a.tty)},read(a,b,c,d){if(!a.tty||!a.tty.eb.Bb)throw new N(60);for(var e=0,g=0;g<d;g++){try{var h=a.tty.eb.Bb(a.tty)}catch(q){throw new N(29);}if(void 0===h&&0===e)throw new N(6);if(null===h||void 0===h)break;e++;b[c+g]=h}e&&(a.node.atime=Date.now());return e},write(a,b,c,d){if(!a.tty||!a.tty.eb.ub)throw new N(60);try{for(var e=0;e<d;e++)a.tty.eb.ub(a.tty,b[c+e])}catch(g){throw new N(29);
}d&&(a.node.mtime=a.node.ctime=Date.now());return e}},wb={Bb(){a:{if(!hb.length){var a=null;if(ca){var b=Buffer.alloc(256),c=0,d=process.stdin.fd;try{c=fs.readSync(d,b,0,256)}catch(e){if(e.toString().includes("EOF"))c=0;else throw e;}0<c&&(a=b.slice(0,c).toString("utf-8"))}else globalThis.window?.prompt&&(a=window.prompt("Input: "),null!==a&&(a+="\n"));if(!a){a=null;break a}b=Array(ib(a)+1);a=M(a,b,0,b.length);b.length=a;hb=b}a=hb.shift()}return a},ub(a,b){null===b||10===b?(Ea(gb(a.output)),a.output=
[]):0!=b&&a.output.push(b)},fsync(a){0<a.output?.length&&(Ea(gb(a.output)),a.output=[])},hc(){return{bc:25856,dc:5,ac:191,cc:35387,$b:[3,28,127,21,4,0,1,0,17,19,26,0,18,15,23,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}},ic(){return 0},jc(){return[24,80]}},xb={ub(a,b){null===b||10===b?(B(gb(a.output)),a.output=[]):0!=b&&a.output.push(b)},fsync(a){0<a.output?.length&&(B(gb(a.output)),a.output=[])}},O={Wa:null,Xa(){return O.createNode(null,"/",16895,0)},createNode(a,b,c,d){if(24576===(c&61440)||4096===(c&61440))throw new N(63);
O.Wa||(O.Wa={dir:{node:{Ta:O.La.Ta,Ua:O.La.Ua,lookup:O.La.lookup,ib:O.La.ib,rename:O.La.rename,unlink:O.La.unlink,rmdir:O.La.rmdir,readdir:O.La.readdir,symlink:O.La.symlink},stream:{Va:O.Ma.Va}},file:{node:{Ta:O.La.Ta,Ua:O.La.Ua},stream:{Va:O.Ma.Va,read:O.Ma.read,write:O.Ma.write,jb:O.Ma.jb,kb:O.Ma.kb}},link:{node:{Ta:O.La.Ta,Ua:O.La.Ua,readlink:O.La.readlink},stream:{}},yb:{node:{Ta:O.La.Ta,Ua:O.La.Ua},stream:yb}});c=zb(a,b,c,d);P(c.mode)?(c.La=O.Wa.dir.node,c.Ma=O.Wa.dir.stream,c.Na={}):32768===
(c.mode&61440)?(c.La=O.Wa.file.node,c.Ma=O.Wa.file.stream,c.Ra=0,c.Na=null):40960===(c.mode&61440)?(c.La=O.Wa.link.node,c.Ma=O.Wa.link.stream):8192===(c.mode&61440)&&(c.La=O.Wa.yb.node,c.Ma=O.Wa.yb.stream);c.atime=c.mtime=c.ctime=Date.now();a&&(a.Na[b]=c,a.atime=a.mtime=a.ctime=c.atime);return c},fc(a){return a.Na?a.Na.subarray?a.Na.subarray(0,a.Ra):new Uint8Array(a.Na):new Uint8Array(0)},La:{Ta(a){var b={};b.dev=8192===(a.mode&61440)?a.id:1;b.ino=a.id;b.mode=a.mode;b.nlink=1;b.uid=0;b.gid=0;b.rdev=
a.rdev;P(a.mode)?b.size=4096:32768===(a.mode&61440)?b.size=a.Ra:40960===(a.mode&61440)?b.size=a.link.length:b.size=0;b.atime=new Date(a.atime);b.mtime=new Date(a.mtime);b.ctime=new Date(a.ctime);b.blksize=4096;b.blocks=Math.ceil(b.size/b.blksize);return b},Ua(a,b){for(var c of["mode","atime","mtime","ctime"])null!=b[c]&&(a[c]=b[c]);void 0!==b.size&&(b=b.size,a.Ra!=b&&(0==b?(a.Na=null,a.Ra=0):(c=a.Na,a.Na=new Uint8Array(b),c&&a.Na.set(c.subarray(0,Math.min(b,a.Ra))),a.Ra=b)))},lookup(){O.nb||(O.nb=
new N(44),O.nb.stack="<generic error, no stack>");throw O.nb;},ib(a,b,c,d){return O.createNode(a,b,c,d)},rename(a,b,c){try{var d=Q(b,c)}catch(g){}if(d){if(P(a.mode))for(var e in d.Na)throw new N(55);Ab(d)}delete a.parent.Na[a.name];b.Na[c]=a;a.name=c;b.ctime=b.mtime=a.parent.ctime=a.parent.mtime=Date.now()},unlink(a,b){delete a.Na[b];a.ctime=a.mtime=Date.now()},rmdir(a,b){var c=Q(a,b),d;for(d in c.Na)throw new N(55);delete a.Na[b];a.ctime=a.mtime=Date.now()},readdir(a){return[".","..",...Object.keys(a.Na)]},
symlink(a,b,c){a=O.createNode(a,b,41471,0);a.link=c;return a},readlink(a){if(40960!==(a.mode&61440))throw new N(28);return a.link}},Ma:{read(a,b,c,d,e){var g=a.node.Na;if(e>=a.node.Ra)return 0;a=Math.min(a.node.Ra-e,d);if(8<a&&g.subarray)b.set(g.subarray(e,e+a),c);else for(d=0;d<a;d++)b[c+d]=g[e+d];return a},write(a,b,c,d,e,g){b.buffer===m.buffer&&(g=!1);if(!d)return 0;a=a.node;a.mtime=a.ctime=Date.now();if(b.subarray&&(!a.Na||a.Na.subarray)){if(g)return a.Na=b.subarray(c,c+d),a.Ra=d;if(0===a.Ra&&
0===e)return a.Na=b.slice(c,c+d),a.Ra=d;if(e+d<=a.Ra)return a.Na.set(b.subarray(c,c+d),e),d}g=e+d;var h=a.Na?a.Na.length:0;h>=g||(g=Math.max(g,h*(1048576>h?2:1.125)>>>0),0!=h&&(g=Math.max(g,256)),h=a.Na,a.Na=new Uint8Array(g),0<a.Ra&&a.Na.set(h.subarray(0,a.Ra),0));if(a.Na.subarray&&b.subarray)a.Na.set(b.subarray(c,c+d),e);else for(g=0;g<d;g++)a.Na[e+g]=b[c+g];a.Ra=Math.max(a.Ra,e+d);return d},Va(a,b,c){1===c?b+=a.position:2===c&&32768===(a.node.mode&61440)&&(b+=a.node.Ra);if(0>b)throw new N(28);
return b},jb(a,b,c,d,e){if(32768!==(a.node.mode&61440))throw new N(43);a=a.node.Na;if(e&2||!a||a.buffer!==m.buffer){e=!0;d=65536*Math.ceil(b/65536);var g=Bb(65536,d);g&&C.fill(0,g,g+d);d=g;if(!d)throw new N(48);if(a){if(0<c||c+b<a.length)a.subarray?a=a.subarray(c,c+b):a=Array.prototype.slice.call(a,c,c+b);m.set(a,d)}}else e=!1,d=a.byteOffset;return{Xb:d,Eb:e}},kb(a,b,c,d){O.Ma.write(a,b,0,d,c,!1);return 0}}},ja=(a,b)=>{var c=0;a&&(c|=365);b&&(c|=146);return c},Cb=null,Db={},Eb=[],Fb=1,R=null,Gb=!1,
Hb=!0,Ib={},N=class{name="ErrnoError";constructor(a){this.Pa=a}},Jb=class{hb={};node=null;get flags(){return this.hb.flags}set flags(a){this.hb.flags=a}get position(){return this.hb.position}set position(a){this.hb.position=a}},Kb=class{La={};Ma={};bb=null;constructor(a,b,c,d){a||=this;this.parent=a;this.Xa=a.Xa;this.id=Fb++;this.name=b;this.mode=c;this.rdev=d;this.atime=this.mtime=this.ctime=Date.now()}get read(){return 365===(this.mode&365)}set read(a){a?this.mode|=365:this.mode&=-366}get write(){return 146===
(this.mode&146)}set write(a){a?this.mode|=146:this.mode&=-147}};
function S(a,b={}){if(!a)throw new N(44);b.pb??(b.pb=!0);"/"===a.charAt(0)||(a="//"+a);var c=0;a:for(;40>c;c++){a=a.split("/").filter(q=>!!q);for(var d=Cb,e="/",g=0;g<a.length;g++){var h=g===a.length-1;if(h&&b.parent)break;if("."!==a[g])if(".."===a[g])if(e=bb(e),d===d.parent){a=e+"/"+a.slice(g+1).join("/");c--;continue a}else d=d.parent;else{e=ia(e+"/"+a[g]);try{d=Q(d,a[g])}catch(q){if(44===q?.Pa&&h&&b.Wb)return{path:e};throw q;}!d.bb||h&&!b.pb||(d=d.bb.root);if(40960===(d.mode&61440)&&(!h||b.ab)){if(!d.La.readlink)throw new N(52);
d=d.La.readlink(d);"/"===d.charAt(0)||(d=bb(e)+"/"+d);a=d+"/"+a.slice(g+1).join("/");continue a}}}return{path:e,node:d}}throw new N(32);}function ha(a){for(var b;;){if(a===a.parent)return a=a.Xa.Db,b?"/"!==a[a.length-1]?`${a}/${b}`:a+b:a;b=b?`${a.name}/${b}`:a.name;a=a.parent}}function Lb(a,b){for(var c=0,d=0;d<b.length;d++)c=(c<<5)-c+b.charCodeAt(d)|0;return(a+c>>>0)%R.length}
function Ab(a){var b=Lb(a.parent.id,a.name);if(R[b]===a)R[b]=a.cb;else for(b=R[b];b;){if(b.cb===a){b.cb=a.cb;break}b=b.cb}}function Q(a,b){var c=P(a.mode)?(c=Mb(a,"x"))?c:a.La.lookup?0:2:54;if(c)throw new N(c);for(c=R[Lb(a.id,b)];c;c=c.cb){var d=c.name;if(c.parent.id===a.id&&d===b)return c}return a.La.lookup(a,b)}function zb(a,b,c,d){a=new Kb(a,b,c,d);b=Lb(a.parent.id,a.name);a.cb=R[b];return R[b]=a}function P(a){return 16384===(a&61440)}
function Nb(a){var b=["r","w","rw"][a&3];a&512&&(b+="w");return b}function Mb(a,b){if(Hb)return 0;if(!b.includes("r")||a.mode&292){if(b.includes("w")&&!(a.mode&146)||b.includes("x")&&!(a.mode&73))return 2}else return 2;return 0}function Ob(a,b){if(!P(a.mode))return 54;try{return Q(a,b),20}catch(c){}return Mb(a,"wx")}
function Pb(a,b,c){try{var d=Q(a,b)}catch(e){return e.Pa}if(a=Mb(a,"wx"))return a;if(c){if(!P(d.mode))return 54;if(d===d.parent||"/"===ha(d))return 10}else if(P(d.mode))return 31;return 0}function Qb(a){if(!a)throw new N(63);return a}function T(a){a=Eb[a];if(!a)throw new N(8);return a}function Rb(a,b=-1){a=Object.assign(new Jb,a);if(-1==b)a:{for(b=0;4096>=b;b++)if(!Eb[b])break a;throw new N(33);}a.fd=b;return Eb[b]=a}function Sb(a,b=-1){a=Rb(a,b);a.Ma?.ec?.(a);return a}
function Tb(a,b,c){var d=a?.Ma.Ua;a=d?a:b;d??=b.La.Ua;Qb(d);d(a,c)}var yb={open(a){a.Ma=Db[a.node.rdev].Ma;a.Ma.open?.(a)},Va(){throw new N(70);}};function mb(a,b){Db[a]={Ma:b}}function Ub(a,b){var c="/"===b;if(c&&Cb)throw new N(10);if(!c&&b){var d=S(b,{pb:!1});b=d.path;d=d.node;if(d.bb)throw new N(10);if(!P(d.mode))throw new N(54);}b={type:a,kc:{},Db:b,Vb:[]};a=a.Xa(b);a.Xa=b;b.root=a;c?Cb=a:d&&(d.bb=b,d.Xa&&d.Xa.Vb.push(b))}
function Vb(a,b,c){var d=S(a,{parent:!0}).node;a=cb(a);if(!a)throw new N(28);if("."===a||".."===a)throw new N(20);var e=Ob(d,a);if(e)throw new N(e);if(!d.La.ib)throw new N(63);return d.La.ib(d,a,b,c)}function ka(a,b=438){return Vb(a,b&4095|32768,0)}function U(a,b=511){return Vb(a,b&1023|16384,0)}function Wb(a,b,c){"undefined"==typeof c&&(c=b,b=438);Vb(a,b|8192,c)}
function Xb(a,b){if(!fb(a))throw new N(44);var c=S(b,{parent:!0}).node;if(!c)throw new N(44);b=cb(b);var d=Ob(c,b);if(d)throw new N(d);if(!c.La.symlink)throw new N(63);c.La.symlink(c,b,a)}function Yb(a){var b=S(a,{parent:!0}).node;a=cb(a);var c=Q(b,a),d=Pb(b,a,!0);if(d)throw new N(d);if(!b.La.rmdir)throw new N(63);if(c.bb)throw new N(10);b.La.rmdir(b,a);Ab(c)}
function ua(a){var b=S(a,{parent:!0}).node;if(!b)throw new N(44);a=cb(a);var c=Q(b,a),d=Pb(b,a,!1);if(d)throw new N(d);if(!b.La.unlink)throw new N(63);if(c.bb)throw new N(10);b.La.unlink(b,a);Ab(c)}function Zb(a,b){a=S(a,{ab:!b}).node;return Qb(a.La.Ta)(a)}function $b(a,b,c,d){Tb(a,b,{mode:c&4095|b.mode&-4096,ctime:Date.now(),Lb:d})}function ma(a,b){a="string"==typeof a?S(a,{ab:!0}).node:a;$b(null,a,b)}
function ac(a,b,c){if(P(b.mode))throw new N(31);if(32768!==(b.mode&61440))throw new N(28);var d=Mb(b,"w");if(d)throw new N(d);Tb(a,b,{size:c,timestamp:Date.now()})}
function na(a,b,c=438){if(""===a)throw new N(44);if("string"==typeof b){var d={r:0,"r+":2,w:577,"w+":578,a:1089,"a+":1090}[b];if("undefined"==typeof d)throw Error(`Unknown file open mode: ${b}`);b=d}c=b&64?c&4095|32768:0;if("object"==typeof a)d=a;else{var e=a.endsWith("/");a=S(a,{ab:!(b&131072),Wb:!0});d=a.node;a=a.path}var g=!1;if(b&64)if(d){if(b&128)throw new N(20);}else{if(e)throw new N(31);d=Vb(a,c|511,0);g=!0}if(!d)throw new N(44);8192===(d.mode&61440)&&(b&=-513);if(b&65536&&!P(d.mode))throw new N(54);
if(!g&&(e=d?40960===(d.mode&61440)?32:P(d.mode)&&("r"!==Nb(b)||b&576)?31:Mb(d,Nb(b)):44))throw new N(e);b&512&&!g&&(e=d,e="string"==typeof e?S(e,{ab:!0}).node:e,ac(null,e,0));b&=-131713;e=Rb({node:d,path:ha(d),flags:b,seekable:!0,position:0,Ma:d.Ma,Yb:[],error:!1});e.Ma.open&&e.Ma.open(e);g&&ma(d,c&511);!k.logReadFiles||b&1||a in Ib||(Ib[a]=1);return e}function pa(a){if(null===a.fd)throw new N(8);a.rb&&(a.rb=null);try{a.Ma.close&&a.Ma.close(a)}catch(b){throw b;}finally{Eb[a.fd]=null}a.fd=null}
function bc(a,b,c){if(null===a.fd)throw new N(8);if(!a.seekable||!a.Ma.Va)throw new N(70);if(0!=c&&1!=c&&2!=c)throw new N(28);a.position=a.Ma.Va(a,b,c);a.Yb=[]}function cc(a,b,c,d,e){if(0>d||0>e)throw new N(28);if(null===a.fd)throw new N(8);if(1===(a.flags&2097155))throw new N(8);if(P(a.node.mode))throw new N(31);if(!a.Ma.read)throw new N(28);var g="undefined"!=typeof e;if(!g)e=a.position;else if(!a.seekable)throw new N(70);b=a.Ma.read(a,b,c,d,e);g||(a.position+=b);return b}
function oa(a,b,c,d,e){if(0>d||0>e)throw new N(28);if(null===a.fd)throw new N(8);if(0===(a.flags&2097155))throw new N(8);if(P(a.node.mode))throw new N(31);if(!a.Ma.write)throw new N(28);a.seekable&&a.flags&1024&&bc(a,0,2);var g="undefined"!=typeof e;if(!g)e=a.position;else if(!a.seekable)throw new N(70);b=a.Ma.write(a,b,c,d,e,void 0);g||(a.position+=b);return b}
function ta(a){var b=b||0;var c="binary";"utf8"!==c&&"binary"!==c&&Na(`Invalid encoding type "${c}"`);b=na(a,b);a=Zb(a).size;var d=new Uint8Array(a);cc(b,d,0,a,0);"utf8"===c&&(d=gb(d));pa(b);return d}
function W(a,b,c){a=ia("/dev/"+a);var d=ja(!!b,!!c);W.Cb??(W.Cb=64);var e=W.Cb++<<8|0;mb(e,{open(g){g.seekable=!1},close(){c?.buffer?.length&&c(10)},read(g,h,q,v){for(var u=0,x=0;x<v;x++){try{var D=b()}catch(pb){throw new N(29);}if(void 0===D&&0===u)throw new N(6);if(null===D||void 0===D)break;u++;h[q+x]=D}u&&(g.node.atime=Date.now());return u},write(g,h,q,v){for(var u=0;u<v;u++)try{c(h[q+u])}catch(x){throw new N(29);}v&&(g.node.mtime=g.node.ctime=Date.now());return u}});Wb(a,d,e)}var X={};
function Y(a,b,c){if("/"===b.charAt(0))return b;a=-100===a?"/":T(a).path;if(0==b.length){if(!c)throw new N(44);return a}return a+"/"+b}
function mc(a,b){F[a>>2]=b.dev;F[a+4>>2]=b.mode;F[a+8>>2]=b.nlink;F[a+12>>2]=b.uid;F[a+16>>2]=b.gid;F[a+20>>2]=b.rdev;H[a+24>>3]=BigInt(b.size);E[a+32>>2]=4096;E[a+36>>2]=b.blocks;var c=b.atime.getTime(),d=b.mtime.getTime(),e=b.ctime.getTime();H[a+40>>3]=BigInt(Math.floor(c/1E3));F[a+48>>2]=c%1E3*1E6;H[a+56>>3]=BigInt(Math.floor(d/1E3));F[a+64>>2]=d%1E3*1E6;H[a+72>>3]=BigInt(Math.floor(e/1E3));F[a+80>>2]=e%1E3*1E6;H[a+88>>3]=BigInt(b.ino);return 0}
var Ec=void 0,Gc=()=>{var a=E[+Ec>>2];Ec+=4;return a},Hc=0,Ic=[0,31,60,91,121,152,182,213,244,274,305,335],Jc=[0,31,59,90,120,151,181,212,243,273,304,334],Kc={},Lc=a=>{Ha=a;Ya||0<Hc||(k.onExit?.(a),Ga=!0);ya(a,new Sa(a))},Mc=a=>{if(!Ga)try{a()}catch(b){b instanceof Sa||"unwind"==b||ya(1,b)}finally{if(!(Ya||0<Hc))try{Ha=a=Ha,Lc(a)}catch(b){b instanceof Sa||"unwind"==b||ya(1,b)}}},Nc={},Pc=()=>{if(!Oc){var a={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:(globalThis.navigator?.language??
"C").replace("-","_")+".UTF-8",_:xa||"./this.program"},b;for(b in Nc)void 0===Nc[b]?delete a[b]:a[b]=Nc[b];var c=[];for(b in a)c.push(`${b}=${a[b]}`);Oc=c}return Oc},Oc,Qc=(a,b,c,d)=>{var e={string:u=>{var x=0;if(null!==u&&void 0!==u&&0!==u){x=ib(u)+1;var D=y(x);M(u,C,D,x);x=D}return x},array:u=>{var x=y(u.length);m.set(u,x);return x}};a=k["_"+a];var g=[],h=0;if(d)for(var q=0;q<d.length;q++){var v=e[c[q]];v?(0===h&&(h=qa()),g[q]=v(d[q])):g[q]=d[q]}c=a(...g);return c=function(u){0!==h&&sa(h);return"string"===
b?z(u):"boolean"===b?!!u:u}(c)},fa=a=>{var b=ib(a)+1,c=da(b);c&&M(a,C,c,b);return c},Rc,Sc=[],A=a=>{Rc.delete(Z.get(a));Z.set(a,null);Sc.push(a)},Tc=a=>{const b=a.length;return[b%128|128,b>>7,...a]},Uc={i:127,p:127,j:126,f:125,d:124,e:111},Vc=a=>Tc(Array.from(a,b=>Uc[b])),wa=(a,b)=>{if(!Rc){Rc=new WeakMap;var c=Z.length;if(Rc)for(var d=0;d<0+c;d++){var e=Z.get(d);e&&Rc.set(e,d)}}if(c=Rc.get(a)||0)return c;c=Sc.length?Sc.pop():Z.grow(1);try{Z.set(c,a)}catch(g){if(!(g instanceof TypeError))throw g;
b=Uint8Array.of(0,97,115,109,1,0,0,0,1,...Tc([1,96,...Vc(b.slice(1)),...Vc("v"===b[0]?"":b[0])]),2,7,1,1,101,1,102,0,0,7,5,1,1,102,0,0);b=new WebAssembly.Module(b);b=(new WebAssembly.Instance(b,{e:{f:a}})).exports.f;Z.set(c,b)}Rc.set(a,c);return c};R=Array(4096);Ub(O,"/");U("/tmp");U("/home");U("/home/web_user");
(function(){U("/dev");mb(259,{read:()=>0,write:(d,e,g,h)=>h,Va:()=>0});Wb("/dev/null",259);kb(1280,wb);kb(1536,xb);Wb("/dev/tty",1280);Wb("/dev/tty1",1536);var a=new Uint8Array(1024),b=0,c=()=>{0===b&&(eb(a),b=a.byteLength);return a[--b]};W("random",c);W("urandom",c);U("/dev/shm");U("/dev/shm/tmp")})();
(function(){U("/proc");var a=U("/proc/self");U("/proc/self/fd");Ub({Xa(){var b=zb(a,"fd",16895,73);b.Ma={Va:O.Ma.Va};b.La={lookup(c,d){c=+d;var e=T(c);c={parent:null,Xa:{Db:"fake"},La:{readlink:()=>e.path},id:c+1};return c.parent=c},readdir(){return Array.from(Eb.entries()).filter(([,c])=>c).map(([c])=>c.toString())}};return b}},"/proc/self/fd")})();k.noExitRuntime&&(Ya=k.noExitRuntime);k.print&&(Ea=k.print);k.printErr&&(B=k.printErr);k.wasmBinary&&(Fa=k.wasmBinary);k.thisProgram&&(xa=k.thisProgram);
if(k.preInit)for("function"==typeof k.preInit&&(k.preInit=[k.preInit]);0<k.preInit.length;)k.preInit.shift()();k.stackSave=()=>qa();k.stackRestore=a=>sa(a);k.stackAlloc=a=>y(a);k.cwrap=(a,b,c,d)=>{var e=!c||c.every(g=>"number"===g||"boolean"===g);return"string"!==b&&e&&!d?k["_"+a]:(...g)=>Qc(a,b,c,g)};k.addFunction=wa;k.removeFunction=A;k.UTF8ToString=z;k.stringToNewUTF8=fa;k.writeArrayToMemory=(a,b)=>{m.set(a,b)};
var da,ea,Bb,Wc,sa,y,qa,Ma,Z,Xc={a:(a,b,c,d)=>Na(`Assertion failed: ${z(a)}, at: `+[b?z(b):"unknown filename",c,d?z(d):"unknown function"]),i:function(a,b){try{return a=z(a),ma(a,b),0}catch(c){if("undefined"==typeof X||"ErrnoError"!==c.name)throw c;return-c.Pa}},L:function(a,b,c){try{b=z(b);b=Y(a,b);if(c&-8)return-28;var d=S(b,{ab:!0}).node;if(!d)return-44;a="";c&4&&(a+="r");c&2&&(a+="w");c&1&&(a+="x");return a&&Mb(d,a)?-2:0}catch(e){if("undefined"==typeof X||"ErrnoError"!==e.name)throw e;return-e.Pa}},
j:function(a,b){try{var c=T(a);$b(c,c.node,b,!1);return 0}catch(d){if("undefined"==typeof X||"ErrnoError"!==d.name)throw d;return-d.Pa}},h:function(a){try{var b=T(a);Tb(b,b.node,{timestamp:Date.now(),Lb:!1});return 0}catch(c){if("undefined"==typeof X||"ErrnoError"!==c.name)throw c;return-c.Pa}},b:function(a,b,c){Ec=c;try{var d=T(a);switch(b){case 0:var e=Gc();if(0>e)break;for(;Eb[e];)e++;return Sb(d,e).fd;case 1:case 2:return 0;case 3:return d.flags;case 4:return e=Gc(),d.flags|=e,0;case 12:return e=
Gc(),Ia[e+0>>1]=2,0;case 13:case 14:return 0}return-28}catch(g){if("undefined"==typeof X||"ErrnoError"!==g.name)throw g;return-g.Pa}},g:function(a,b){try{var c=T(a),d=c.node,e=c.Ma.Ta;a=e?c:d;e??=d.La.Ta;Qb(e);var g=e(a);return mc(b,g)}catch(h){if("undefined"==typeof X||"ErrnoError"!==h.name)throw h;return-h.Pa}},H:function(a,b){b=-9007199254740992>b||9007199254740992<b?NaN:Number(b);try{if(isNaN(b))return-61;var c=T(a);if(0>b||0===(c.flags&2097155))throw new N(28);ac(c,c.node,b);return 0}catch(d){if("undefined"==
typeof X||"ErrnoError"!==d.name)throw d;return-d.Pa}},G:function(a,b){try{if(0===b)return-28;var c=ib("/")+1;if(b<c)return-68;M("/",C,a,b);return c}catch(d){if("undefined"==typeof X||"ErrnoError"!==d.name)throw d;return-d.Pa}},K:function(a,b){try{return a=z(a),mc(b,Zb(a,!0))}catch(c){if("undefined"==typeof X||"ErrnoError"!==c.name)throw c;return-c.Pa}},C:function(a,b,c){try{return b=z(b),b=Y(a,b),U(b,c),0}catch(d){if("undefined"==typeof X||"ErrnoError"!==d.name)throw d;return-d.Pa}},J:function(a,
b,c,d){try{b=z(b);var e=d&256;b=Y(a,b,d&4096);return mc(c,e?Zb(b,!0):Zb(b))}catch(g){if("undefined"==typeof X||"ErrnoError"!==g.name)throw g;return-g.Pa}},x:function(a,b,c,d){Ec=d;try{b=z(b);b=Y(a,b);var e=d?Gc():0;return na(b,c,e).fd}catch(g){if("undefined"==typeof X||"ErrnoError"!==g.name)throw g;return-g.Pa}},v:function(a,b,c,d){try{b=z(b);b=Y(a,b);if(0>=d)return-28;var e=S(b).node;if(!e)throw new N(44);if(!e.La.readlink)throw new N(28);var g=e.La.readlink(e);var h=Math.min(d,ib(g)),q=m[c+h];M(g,
C,c,d+1);m[c+h]=q;return h}catch(v){if("undefined"==typeof X||"ErrnoError"!==v.name)throw v;return-v.Pa}},u:function(a){try{return a=z(a),Yb(a),0}catch(b){if("undefined"==typeof X||"ErrnoError"!==b.name)throw b;return-b.Pa}},f:function(a,b){try{return a=z(a),mc(b,Zb(a))}catch(c){if("undefined"==typeof X||"ErrnoError"!==c.name)throw c;return-c.Pa}},r:function(a,b,c){try{b=z(b);b=Y(a,b);if(c)if(512===c)Yb(b);else return-28;else ua(b);return 0}catch(d){if("undefined"==typeof X||"ErrnoError"!==d.name)throw d;
return-d.Pa}},q:function(a,b,c){try{b=z(b);b=Y(a,b,!0);var d=Date.now(),e,g;if(c){var h=F[c>>2]+4294967296*E[c+4>>2],q=E[c+8>>2];1073741823==q?e=d:1073741822==q?e=null:e=1E3*h+q/1E6;c+=16;h=F[c>>2]+4294967296*E[c+4>>2];q=E[c+8>>2];1073741823==q?g=d:1073741822==q?g=null:g=1E3*h+q/1E6}else g=e=d;if(null!==(g??e)){a=e;var v=S(b,{ab:!0}).node;Qb(v.La.Ua)(v,{atime:a,mtime:g})}return 0}catch(u){if("undefined"==typeof X||"ErrnoError"!==u.name)throw u;return-u.Pa}},m:()=>Na(""),l:()=>{Ya=!1;Hc=0},A:function(a,
b){a=-9007199254740992>a||9007199254740992<a?NaN:Number(a);a=new Date(1E3*a);E[b>>2]=a.getSeconds();E[b+4>>2]=a.getMinutes();E[b+8>>2]=a.getHours();E[b+12>>2]=a.getDate();E[b+16>>2]=a.getMonth();E[b+20>>2]=a.getFullYear()-1900;E[b+24>>2]=a.getDay();var c=a.getFullYear();E[b+28>>2]=(0!==c%4||0===c%100&&0!==c%400?Jc:Ic)[a.getMonth()]+a.getDate()-1|0;E[b+36>>2]=-(60*a.getTimezoneOffset());c=(new Date(a.getFullYear(),6,1)).getTimezoneOffset();var d=(new Date(a.getFullYear(),0,1)).getTimezoneOffset();
E[b+32>>2]=(c!=d&&a.getTimezoneOffset()==Math.min(d,c))|0},y:function(a,b,c,d,e,g,h){e=-9007199254740992>e||9007199254740992<e?NaN:Number(e);try{var q=T(d);if(0!==(b&2)&&0===(c&2)&&2!==(q.flags&2097155))throw new N(2);if(1===(q.flags&2097155))throw new N(2);if(!q.Ma.jb)throw new N(43);if(!a)throw new N(28);var v=q.Ma.jb(q,a,e,b,c);var u=v.Xb;E[g>>2]=v.Eb;F[h>>2]=u;return 0}catch(x){if("undefined"==typeof X||"ErrnoError"!==x.name)throw x;return-x.Pa}},z:function(a,b,c,d,e,g){g=-9007199254740992>g||
9007199254740992<g?NaN:Number(g);try{var h=T(e);if(c&2){c=g;if(32768!==(h.node.mode&61440))throw new N(43);if(!(d&2)){var q=C.slice(a,a+b);h.Ma.kb&&h.Ma.kb(h,q,c,b,d)}}}catch(v){if("undefined"==typeof X||"ErrnoError"!==v.name)throw v;return-v.Pa}},n:(a,b)=>{Kc[a]&&(clearTimeout(Kc[a].id),delete Kc[a]);if(!b)return 0;var c=setTimeout(()=>{delete Kc[a];Mc(()=>Wc(a,performance.now()))},b);Kc[a]={id:c,lc:b};return 0},B:(a,b,c,d)=>{var e=(new Date).getFullYear(),g=(new Date(e,0,1)).getTimezoneOffset();
e=(new Date(e,6,1)).getTimezoneOffset();F[a>>2]=60*Math.max(g,e);E[b>>2]=Number(g!=e);b=h=>{var q=Math.abs(h);return`UTC${0<=h?"-":"+"}${String(Math.floor(q/60)).padStart(2,"0")}${String(q%60).padStart(2,"0")}`};a=b(g);b=b(e);e<g?(M(a,C,c,17),M(b,C,d,17)):(M(a,C,d,17),M(b,C,c,17))},d:()=>Date.now(),s:()=>2147483648,c:()=>performance.now(),o:a=>{var b=C.length;a>>>=0;if(2147483648<a)return!1;for(var c=1;4>=c;c*=2){var d=b*(1+.2/c);d=Math.min(d,a+100663296);a:{d=(Math.min(2147483648,65536*Math.ceil(Math.max(a,
d)/65536))-Ma.buffer.byteLength+65535)/65536|0;try{Ma.grow(d);La();var e=1;break a}catch(g){}e=void 0}if(e)return!0}return!1},E:(a,b)=>{var c=0,d=0,e;for(e of Pc()){var g=b+c;F[a+d>>2]=g;c+=M(e,C,g,Infinity)+1;d+=4}return 0},F:(a,b)=>{var c=Pc();F[a>>2]=c.length;a=0;for(var d of c)a+=ib(d)+1;F[b>>2]=a;return 0},e:function(a){try{var b=T(a);pa(b);return 0}catch(c){if("undefined"==typeof X||"ErrnoError"!==c.name)throw c;return c.Pa}},p:function(a,b){try{var c=T(a);m[b]=c.tty?2:P(c.mode)?3:40960===(c.mode&
61440)?7:4;Ia[b+2>>1]=0;H[b+8>>3]=BigInt(0);H[b+16>>3]=BigInt(0);return 0}catch(d){if("undefined"==typeof X||"ErrnoError"!==d.name)throw d;return d.Pa}},w:function(a,b,c,d){try{a:{var e=T(a);a=b;for(var g,h=b=0;h<c;h++){var q=F[a>>2],v=F[a+4>>2];a+=8;var u=cc(e,m,q,v,g);if(0>u){var x=-1;break a}b+=u;if(u<v)break;"undefined"!=typeof g&&(g+=u)}x=b}F[d>>2]=x;return 0}catch(D){if("undefined"==typeof X||"ErrnoError"!==D.name)throw D;return D.Pa}},D:function(a,b,c,d){b=-9007199254740992>b||9007199254740992<
b?NaN:Number(b);try{if(isNaN(b))return 61;var e=T(a);bc(e,b,c);H[d>>3]=BigInt(e.position);e.rb&&0===b&&0===c&&(e.rb=null);return 0}catch(g){if("undefined"==typeof X||"ErrnoError"!==g.name)throw g;return g.Pa}},I:function(a){try{var b=T(a);return b.Ma?.fsync?.(b)}catch(c){if("undefined"==typeof X||"ErrnoError"!==c.name)throw c;return c.Pa}},t:function(a,b,c,d){try{a:{var e=T(a);a=b;for(var g,h=b=0;h<c;h++){var q=F[a>>2],v=F[a+4>>2];a+=8;var u=oa(e,m,q,v,g);if(0>u){var x=-1;break a}b+=u;if(u<v)break;
"undefined"!=typeof g&&(g+=u)}x=b}F[d>>2]=x;return 0}catch(D){if("undefined"==typeof X||"ErrnoError"!==D.name)throw D;return D.Pa}},k:Lc};
function Yc(){function a(){k.calledRun=!0;if(!Ga){if(!k.noFSInit&&!Gb){var b,c;Gb=!0;b??=k.stdin;c??=k.stdout;d??=k.stderr;b?W("stdin",b):Xb("/dev/tty","/dev/stdin");c?W("stdout",null,c):Xb("/dev/tty","/dev/stdout");d?W("stderr",null,d):Xb("/dev/tty1","/dev/stderr");na("/dev/stdin",0);na("/dev/stdout",1);na("/dev/stderr",1)}Zc.N();Hb=!1;k.onRuntimeInitialized?.();if(k.postRun)for("function"==typeof k.postRun&&(k.postRun=[k.postRun]);k.postRun.length;){var d=k.postRun.shift();Ua.push(d)}Ta(Ua)}}if(0<
K)Xa=Yc;else{if(k.preRun)for("function"==typeof k.preRun&&(k.preRun=[k.preRun]);k.preRun.length;)Wa();Ta(Va);0<K?Xa=Yc:k.setStatus?(k.setStatus("Running..."),setTimeout(()=>{setTimeout(()=>k.setStatus(""),1);a()},1)):a()}}var Zc;
(async function(){function a(c){c=Zc=c.exports;k._sqlite3_free=c.P;k._sqlite3_value_text=c.Q;k._sqlite3_prepare_v2=c.R;k._sqlite3_step=c.S;k._sqlite3_reset=c.T;k._sqlite3_exec=c.U;k._sqlite3_finalize=c.V;k._sqlite3_column_name=c.W;k._sqlite3_column_text=c.X;k._sqlite3_column_type=c.Y;k._sqlite3_errmsg=c.Z;k._sqlite3_clear_bindings=c._;k._sqlite3_value_blob=c.$;k._sqlite3_value_bytes=c.aa;k._sqlite3_value_double=c.ba;k._sqlite3_value_int=c.ca;k._sqlite3_value_type=c.da;k._sqlite3_result_blob=c.ea;
k._sqlite3_result_double=c.fa;k._sqlite3_result_error=c.ga;k._sqlite3_result_int=c.ha;k._sqlite3_result_int64=c.ia;k._sqlite3_result_null=c.ja;k._sqlite3_result_text=c.ka;k._sqlite3_aggregate_context=c.la;k._sqlite3_column_count=c.ma;k._sqlite3_data_count=c.na;k._sqlite3_column_blob=c.oa;k._sqlite3_column_bytes=c.pa;k._sqlite3_column_double=c.qa;k._sqlite3_bind_blob=c.ra;k._sqlite3_bind_double=c.sa;k._sqlite3_bind_int=c.ta;k._sqlite3_bind_text=c.ua;k._sqlite3_bind_parameter_index=c.va;k._sqlite3_sql=
c.wa;k._sqlite3_normalized_sql=c.xa;k._sqlite3_changes=c.ya;k._sqlite3_close_v2=c.za;k._sqlite3_create_function_v2=c.Aa;k._sqlite3_update_hook=c.Ba;k._sqlite3_open=c.Ca;da=k._malloc=c.Da;ea=k._free=c.Ea;k._RegisterExtensionFunctions=c.Fa;Bb=c.Ga;Wc=c.Ha;sa=c.Ia;y=c.Ja;qa=c.Ka;Ma=c.M;Z=c.O;La();K--;k.monitorRunDependencies?.(K);0==K&&Xa&&(c=Xa,Xa=null,c());return Zc}K++;k.monitorRunDependencies?.(K);var b={a:Xc};if(k.instantiateWasm)return new Promise(c=>{k.instantiateWasm(b,(d,e)=>{c(a(d,e))})});
Oa??=k.locateFile?k.locateFile("sql-wasm.wasm",Aa):Aa+"sql-wasm.wasm";return a((await Ra(b)).instance)})();Yc();


        // The shell-pre.js and emcc-generated code goes above
        return Module;
    }); // The end of the promise being returned

  return initSqlJsPromise;
} // The end of our initSqlJs function

// This bit below is copied almost exactly from what you get when you use the MODULARIZE=1 flag with emcc
// However, we don't want to use the emcc modularization. See shell-pre.js
if (typeof exports === 'object' && typeof module === 'object'){
    module.exports = initSqlJs;
    // This will allow the module to be used in ES6 or CommonJS
    module.exports.default = initSqlJs;
}
else if (typeof define === 'function' && define['amd']) {
    define([], function() { return initSqlJs; });
}
else if (typeof exports === 'object'){
    exports["Module"] = initSqlJs;
}

}, {"node:fs":null,"node:crypto":null}, "/app/dist/sql-wasm.js"];
__defs[45] = [function(module, exports, require, __filename, __dirname){
// niches.js — централизованный Business Theme Context: список «ниш» бизнеса
// (кофейня, барбершоп, ногтевая студия и т.д.) и всё, что от ниши зависит —
// названия, фразы-приглашения, примеры примечаний клиента, подсказки в форме
// саморегистрации. Один файл — единая точка правды, чтобы `if (niche === 'grooming')`
// не расползался по экранам (main.js, local-api-server.js — через require;
// renderer.js — через обычный <script>, кладёт себя в window.NichesModule).
//
// Чтобы добавить новую нишу — добавьте один объект в NICHES ниже. Никакой другой
// код менять не нужно: выбор ниши, тексты писем, подсказки, страница регистрации
// и виджет погоды уже читают эти данные централизованно.

(function (root) {
  const NICHES = {
    coffee: {
      emoji: '☕',
      name: { ru: 'Кофейня / кафе', sk: 'Kaviareň / kaviarnička', uk: 'Кав\u2019ярня / кафе', en: 'Coffee shop / café' },
      defaultCardTitle: { ru: 'Карта лояльности', sk: 'Vernostná karta', uk: 'Картка лояльності', en: 'Loyalty card' },
      invitePhrase: { ru: 'чашечку кофе', sk: 'dobrú kávu', uk: 'чашечку кави', en: 'a good cup of coffee' },
      clientNoteExample: { ru: 'Например: без кофеина после обеда, любит овсяное молоко', sk: 'Napríklad: bez kofeínu poobede, obľubuje ovsené mlieko', uk: 'Наприклад: без кофеїну після обіду, любить вівсяне молоко', en: 'E.g.: no caffeine after lunch, prefers oat milk' },
      registrationNotesPlaceholder: { ru: 'Например: кокосовое молоко, без сахара', sk: 'Napríklad: kokosové mlieko, bez cukru', uk: 'Наприклад: кокосове молоко, без цукру', en: 'E.g.: coconut milk, no sugar' },
      showWeatherWidget: true
    },
    bakery: {
      emoji: '🥐',
      name: { ru: 'Пекарня / кондитерская', sk: 'Pekáreň / cukráreň', uk: 'Пекарня / кондитерська', en: 'Bakery / pastry shop' },
      defaultCardTitle: { ru: 'Карта лояльности', sk: 'Vernostná karta', uk: 'Картка лояльності', en: 'Loyalty card' },
      invitePhrase: { ru: 'свежую выпечку', sk: 'čerstvé pečivo', uk: 'свіжу випічку', en: 'some fresh pastries' },
      clientNoteExample: { ru: 'Например: аллергия на орехи, любит без глютена', sk: 'Napríklad: alergia na orechy, obľubuje bezlepkové', uk: 'Наприклад: алергія на горіхи, любить без глютену', en: 'E.g.: nut allergy, prefers gluten-free' },
      registrationNotesPlaceholder: { ru: 'Например: без глютена, любит корицу', sk: 'Napríklad: bez lepku, obľubuje škoricu', uk: 'Наприклад: без глютену, любить кориц', en: 'E.g.: gluten-free, loves cinnamon' },
      showWeatherWidget: true
    },
    barber: {
      emoji: '💈',
      name: { ru: 'Барбершоп / парикмахерская', sk: 'Barbershop / kaderníctvo', uk: 'Барбершоп / перукарня', en: 'Barbershop / hair salon' },
      defaultCardTitle: { ru: 'Карта постоянного клиента', sk: 'Karta stáleho klienta', uk: 'Картка постійного клієнта', en: 'Regular client card' },
      invitePhrase: { ru: 'стрижку', sk: 'strihanie', uk: 'стрижку', en: 'a fresh haircut' },
      clientNoteExample: { ru: 'Например: короткий fade, без бороды', sk: 'Napríklad: krátky fade, bez brady', uk: 'Наприклад: короткий fade, без бороди', en: 'E.g.: short fade, no beard trim' },
      registrationNotesPlaceholder: { ru: 'Например: предпочитаемая длина и стиль', sk: 'Napríklad: obľúbená dĺžka a štýl', uk: 'Наприклад: улюблена довжина і стиль', en: 'E.g.: preferred length and style' },
      showWeatherWidget: false
    },
    nails: {
      emoji: '💅',
      name: { ru: 'Ногтевая студия', sk: 'Nechtové štúdio', uk: 'Нігтьова студія', en: 'Nail studio' },
      defaultCardTitle: { ru: 'Карта постоянного клиента', sk: 'Karta stálej klientky', uk: 'Картка постійної клієнтки', en: 'Regular client card' },
      invitePhrase: { ru: 'маникюр', sk: 'manikúru', uk: 'манікюр', en: 'a manicure' },
      clientNoteExample: { ru: 'Например: аллергия на гель-лак, любит квадратную форму', sk: 'Napríklad: alergia na gél lak, obľubuje štvorcový tvar', uk: 'Наприклад: алергія на гель-лак, любить квадратну форму', en: 'E.g.: gel polish allergy, prefers square shape' },
      registrationNotesPlaceholder: { ru: 'Например: любимый цвет, форма ногтей', sk: 'Napríklad: obľúbená farba, tvar nechtov', uk: 'Наприклад: улюблений колір, форма нігтів', en: 'E.g.: favorite color, nail shape' },
      showWeatherWidget: false
    },
    spa: {
      emoji: '💆',
      name: { ru: 'СПА / массаж', sk: 'SPA / masáže', uk: 'СПА / масаж', en: 'Spa / massage' },
      defaultCardTitle: { ru: 'Карта постоянного клиента', sk: 'Karta stáleho klienta', uk: 'Картка постійного клієнта', en: 'Regular client card' },
      invitePhrase: { ru: 'расслабляющий сеанс', sk: 'relaxačnú procedúru', uk: 'розслаблюючий сеанс', en: 'a relaxing session' },
      clientNoteExample: { ru: 'Например: избегать сильного давления, чувствительная спина', sk: 'Napríklad: vyhýbať sa silnému tlaku, citlivý chrbát', uk: 'Наприклад: уникати сильного тиску, чутлива спина', en: 'E.g.: avoid deep pressure, sensitive back' },
      registrationNotesPlaceholder: { ru: 'Например: предпочитаемое масло, зоны для массажа', sk: 'Napríklad: obľúbený olej, oblasti na masáž', uk: 'Наприклад: улюблена олія, зони для масажу', en: 'E.g.: preferred oil, areas to focus on' },
      showWeatherWidget: false
    },
    sushi: {
      emoji: '🍣',
      name: { ru: 'Суши / азиатская кухня', sk: 'Sushi / ázijská kuchyňa', uk: 'Суші / азійська кухня', en: 'Sushi / Asian kitchen' },
      defaultCardTitle: { ru: 'Карта лояльности', sk: 'Vernostná karta', uk: 'Картка лояльності', en: 'Loyalty card' },
      invitePhrase: { ru: 'свежие суши', sk: 'čerstvé suši', uk: 'свіжі суші', en: 'some fresh sushi' },
      clientNoteExample: { ru: 'Например: без васаби, аллергия на морепродукты', sk: 'Napríklad: bez wasabi, alergia na morské plody', uk: 'Наприклад: без васабі, алергія на морепродукти', en: 'E.g.: no wasabi, seafood allergy' },
      registrationNotesPlaceholder: { ru: 'Например: без имбиря, любит острое', sk: 'Napríklad: bez zázvoru, obľubuje pikantné', uk: 'Наприклад: без імбиру, любить гостре', en: 'E.g.: no ginger, likes spicy' },
      showWeatherWidget: false
    },
    pizza: {
      emoji: '🍕',
      name: { ru: 'Пиццерия / фастфуд', sk: 'Pizzeria / rýchle občerstvenie', uk: 'Піцерія / фастфуд', en: 'Pizzeria / fast food' },
      defaultCardTitle: { ru: 'Карта лояльности', sk: 'Vernostná karta', uk: 'Картка лояльності', en: 'Loyalty card' },
      invitePhrase: { ru: 'горячую пиццу', sk: 'horúcu pizzu', uk: 'гарячу піцу', en: 'a hot pizza' },
      clientNoteExample: { ru: 'Например: тонкое тесто, без лука', sk: 'Napríklad: tenké cesto, bez cibule', uk: 'Наприклад: тонке тісто, без цибулі', en: 'E.g.: thin crust, no onions' },
      registrationNotesPlaceholder: { ru: 'Например: любимая пицца, без грибов', sk: 'Napríklad: obľúbená pizza, bez húb', uk: 'Наприклад: улюблена піца, без грибів', en: 'E.g.: favorite pizza, no mushrooms' },
      showWeatherWidget: false
    },
    grocery: {
      emoji: '🛒',
      name: { ru: 'Продукты / магазин у дома', sk: 'Potraviny / obchod pri dome', uk: 'Продукти / магазин біля дому', en: 'Grocery / convenience store' },
      defaultCardTitle: { ru: 'Карта покупателя', sk: 'Zákaznícka karta', uk: 'Картка покупця', en: 'Shopper card' },
      invitePhrase: { ru: 'свежие продукты', sk: 'čerstvé potraviny', uk: 'свіжі продукти', en: 'some fresh groceries' },
      clientNoteExample: { ru: 'Например: покупает фермерское, любит акции на молочное', sk: 'Napríklad: kupuje farmárske, obľubuje akcie na mliečne', uk: 'Наприклад: купує фермерське, любить акції на молочне', en: 'E.g.: buys farm products, likes dairy deals' },
      registrationNotesPlaceholder: { ru: 'Например: любимые товары, диета', sk: 'Napríklad: obľúbené produkty, diéta', uk: 'Наприклад: улюблені товари, дієта', en: 'E.g.: favorite products, diet' },
      showWeatherWidget: false
    },
    travel: {
      emoji: '✈️',
      name: { ru: 'Турфирма / путешествия', sk: 'Cestovná kancelária / cestovanie', uk: 'Турфірма / подорожі', en: 'Travel agency' },
      defaultCardTitle: { ru: 'Карта путешественника', sk: 'Karta cestovateľa', uk: 'Картка мандрівника', en: 'Traveler card' },
      invitePhrase: { ru: 'следующее путешествие', sk: 'ďalšiu cestu', uk: 'наступну подорож', en: 'your next trip' },
      clientNoteExample: { ru: 'Например: любит море, путешествует с детьми', sk: 'Napríklad: miluje more, cestuje s deťmi', uk: 'Наприклад: любить море, подорожує з дітьми', en: 'E.g.: loves the sea, travels with kids' },
      registrationNotesPlaceholder: { ru: 'Например: куда хотите поехать, бюджет', sk: 'Napríklad: kam chcete ísť, rozpočet', uk: 'Наприклад: куди хочете поїхати, бюджет', en: 'E.g.: where you want to go, budget' },
      showWeatherWidget: false
    },
    tattoo: {
      emoji: '🖋️',
      name: { ru: 'Тату / пирсинг-студия', sk: 'Tetovacie / piercingové štúdio', uk: 'Тату / пірсинг-студія', en: 'Tattoo / piercing studio' },
      defaultCardTitle: { ru: 'Карта постоянного клиента', sk: 'Karta stáleho klienta', uk: 'Картка постійного клієнта', en: 'Regular client card' },
      invitePhrase: { ru: 'новую идею', sk: 'nový nápad', uk: 'нову ідею', en: 'a new idea' },
      clientNoteExample: { ru: 'Например: чувствительная кожа, предпочитает крупные формы', sk: 'Napríklad: citlivá pokožka, obľubuje väčšie motívy', uk: 'Наприклад: чутлива шкіра, любить великі форми', en: 'E.g.: sensitive skin, prefers larger pieces' },
      registrationNotesPlaceholder: { ru: 'Например: любимый стиль, зона тела', sk: 'Napríklad: obľúbený štýl, časť tela', uk: 'Наприклад: улюблений стиль, зона тіла', en: 'E.g.: favorite style, body area' },
      showWeatherWidget: false
    },
    fitness: {
      emoji: '🏋️',
      name: { ru: 'Фитнес / йога / танцы', sk: 'Fitness / jóga / tanec', uk: 'Фітнес / йога / танці', en: 'Fitness / yoga / dance' },
      defaultCardTitle: { ru: 'Карта посещений', sk: 'Karta návštev', uk: 'Картка відвідувань', en: 'Visit card' },
      invitePhrase: { ru: 'тренировку', sk: 'tréning', uk: 'тренування', en: 'a workout' },
      clientNoteExample: { ru: 'Например: боль в колене, избегать прыжков', sk: 'Napríklad: bolesť kolena, vyhýbať sa skokom', uk: 'Наприклад: біль у коліні, уникати стрибків', en: 'E.g.: knee pain, avoid jumping exercises' },
      registrationNotesPlaceholder: { ru: 'Например: цель тренировок, ограничения по здоровью', sk: 'Napríklad: cieľ tréningu, zdravotné obmedzenia', uk: 'Наприклад: мета тренувань, обмеження за здоров\u2019ям', en: 'E.g.: training goal, health limitations' },
      showWeatherWidget: false
    },
    petgroom: {
      emoji: '🐾',
      name: { ru: 'Груминг для животных', sk: 'Grooming pre zvieratá', uk: 'Грумінг для тварин', en: 'Pet grooming' },
      defaultCardTitle: { ru: 'Карта постоянного клиента', sk: 'Karta stáleho klienta', uk: 'Картка постійного клієнта', en: 'Regular client card' },
      invitePhrase: { ru: 'груминг для питомца', sk: 'grooming pre miláčika', uk: 'грумінг для улюбленця', en: 'a grooming session for your pet' },
      clientNoteExample: { ru: 'Например: боится фена, предпочитает тихую сушку', sk: 'Napríklad: bojí sa fénu, uprednostňuje tiché sušenie', uk: 'Наприклад: боїться фена, любить тихе сушіння', en: 'E.g.: afraid of the dryer, prefers quiet drying' },
      registrationNotesPlaceholder: { ru: 'Например: порода, характер питомца', sk: 'Napríklad: plemeno, povaha miláčika', uk: 'Наприклад: порода, характер улюбленця', en: 'E.g.: breed, your pet\u2019s temperament' },
      showWeatherWidget: false
    },
    photo: {
      emoji: '📸',
      name: { ru: 'Фотостудия', sk: 'Fotoštúdio', uk: 'Фотостудія', en: 'Photo studio' },
      defaultCardTitle: { ru: 'Карта постоянного клиента', sk: 'Karta stáleho klienta', uk: 'Картка постійного клієнта', en: 'Regular client card' },
      invitePhrase: { ru: 'новую фотосессию', sk: 'nové fotenie', uk: 'нову фотосесію', en: 'a new photo session' },
      clientNoteExample: { ru: 'Например: не любит студийный свет, предпочитает natural-стиль', sk: 'Napríklad: neobľubuje štúdiové svetlo, preferuje prirodzený štýl', uk: 'Наприклад: не любить студійне світло, любить natural-стиль', en: 'E.g.: dislikes studio lighting, prefers a natural look' },
      registrationNotesPlaceholder: { ru: 'Например: повод съёмки, пожелания по стилю', sk: 'Napríklad: dôvod fotenia, želaný štýl', uk: 'Наприклад: привід зйомки, побажання щодо стилю', en: 'E.g.: occasion, preferred style' },
      showWeatherWidget: false
    },
    clothing: {
      emoji: '👗',
      name: { ru: 'Магазин одежды', sk: 'Obchod s oblečením', uk: 'Магазин одягу', en: 'Clothing store' },
      defaultCardTitle: { ru: 'Карта постоянного покупателя', sk: 'Karta stáleho zákazníka', uk: 'Картка постійного покупця', en: 'Loyal customer card' },
      invitePhrase: { ru: 'обновить гардероб', sk: 'obnoviť šatník', uk: 'оновити гардероб', en: 'refresh your wardrobe' },
      clientNoteExample: { ru: 'Например: размер M, любит однотонные вещи', sk: 'Napríklad: veľkosť M, obľubuje jednofarebné oblečenie', uk: 'Наприклад: розмір M, любить однотонні речі', en: 'E.g.: size M, prefers solid colors' },
      registrationNotesPlaceholder: { ru: 'Например: любимые бренды, размер', sk: 'Napríklad: obľúbené značky, veľkosť', uk: 'Наприклад: улюблені бренди, розмір', en: 'E.g.: favorite brands, size' },
      showWeatherWidget: false
    },
    other: {
      emoji: '✨',
      name: { ru: 'Другое', sk: 'Iné', uk: 'Інше', en: 'Other' },
      defaultCardTitle: { ru: 'Карта лояльности', sk: 'Vernostná karta', uk: 'Картка лояльності', en: 'Loyalty card' },
      invitePhrase: { ru: 'к нам', sk: 'k nám', uk: 'до нас', en: 'to visit us' },
      clientNoteExample: { ru: 'Например: особые пожелания клиента', sk: 'Napríklad: osobitné požiadavky klienta', uk: 'Наприклад: особливі побажання клієнта', en: 'E.g.: any special preferences' },
      registrationNotesPlaceholder: { ru: 'Например: ваши пожелания', sk: 'Napríklad: vaše želania', uk: 'Наприклад: ваші побажання', en: 'E.g.: your preferences' },
      showWeatherWidget: false
    }
  };

  // ---------- централизованный доступ (Business Theme Context) ----------
  // Весь остальной код (main.js, local-api-server.js, renderer.js) обращается
  // к нише ТОЛЬКО через эти функции — нигде не должно быть разбросанных
  // if (niche === 'coffee') / if (niche === 'barber') и т.п.
  function getNiche(id) {
    return NICHES[id] || NICHES.other;
  }

  function listNicheIds() {
    return Object.keys(NICHES);
  }

  function getClientNoteExample(nicheId, lang) {
    const niche = getNiche(nicheId);
    return niche.clientNoteExample[lang] || niche.clientNoteExample.ru;
  }

  function getRegistrationNotesPlaceholder(nicheId, lang) {
    const niche = getNiche(nicheId);
    return niche.registrationNotesPlaceholder[lang] || niche.registrationNotesPlaceholder.ru;
  }

  function getInvitePhrase(nicheId, lang) {
    const niche = getNiche(nicheId);
    return niche.invitePhrase[lang] || niche.invitePhrase.ru;
  }

  const api = {
    NICHES,
    getNiche,
    listNicheIds,
    getClientNoteExample,
    getRegistrationNotesPlaceholder,
    getInvitePhrase
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.NichesModule = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);

}, {}, "/app/pc-app/niches.js"];
__defs[46] = [function(module, exports, require, __filename, __dirname){
// nameday-calendar.js — официальный словацкий календарь имён (Oficiálne kalendárium,
// Kalendárna komisia pri Ministerstve kultúry SR). Дни без официального имени
// (государственные/церковные праздники без привязки к конкретному имени) не имеют записи.
//
// Файл написан так, чтобы работать и как обычный <script> в renderer (тогда
// NAMEDAY_CALENDAR становится глобальной переменной), и как обычный Node-модуль
// через require() в main.js (для автоматической проверки именин по расписанию).

const NAMEDAY_CALENDAR = {
  '01-02': ['Alexandra', 'Karina'], '01-03': ['Daniela'], '01-04': ['Drahoslav'],
  '01-05': ['Andrea'], '01-06': ['Antónia'], '01-07': ['Bohuslava'], '01-08': ['Severín'],
  '01-09': ['Alexej'], '01-10': ['Dáša'], '01-11': ['Malvína'], '01-12': ['Ernest'],
  '01-13': ['Rastislav'], '01-14': ['Radovan'], '01-15': ['Dobroslava', 'Dobroslav'],
  '01-16': ['Kristína'], '01-17': ['Nataša'], '01-18': ['Bohdana'], '01-19': ['Mário'],
  '01-20': ['Dalibor', 'Sebastián'], '01-21': ['Vincent'], '01-22': ['Zora'],
  '01-23': ['Miloš'], '01-24': ['Timotej'], '01-25': ['Gejza'], '01-26': ['Tamara'],
  '01-27': ['Bohuš'], '01-28': ['Alfonz'], '01-29': ['Gašpar'], '01-30': ['Ema'],
  '01-31': ['Emil'],

  '02-01': ['Tatiana'], '02-02': ['Erika', 'Erik'], '02-03': ['Blažej'],
  '02-04': ['Veronika'], '02-05': ['Agáta'], '02-06': ['Dorota'], '02-07': ['Vanda'],
  '02-08': ['Zoja'], '02-09': ['Zdenko'], '02-10': ['Gabriela'], '02-11': ['Dezider'],
  '02-12': ['Perla'], '02-13': ['Arpád'], '02-14': ['Valentín'], '02-15': ['Pravoslav'],
  '02-16': ['Ida', 'Liana'], '02-17': ['Miloslava'], '02-18': ['Jaromír'],
  '02-19': ['Vlasta'], '02-20': ['Lívia'], '02-21': ['Eleonóra'], '02-22': ['Etela'],
  '02-23': ['Roman', 'Romana'], '02-24': ['Matej'], '02-25': ['Frederik', 'Frederika'],
  '02-26': ['Viktor'], '02-27': ['Alexander'], '02-28': ['Zlatica'], '02-29': ['Radomír'],

  '03-01': ['Albín'], '03-02': ['Anežka'], '03-03': ['Bohumil', 'Bohumila'],
  '03-04': ['Kazimír'], '03-05': ['Fridrich'], '03-06': ['Radoslav', 'Radoslava'],
  '03-07': ['Tomáš'], '03-08': ['Alan', 'Alana'], '03-09': ['Františka'],
  '03-10': ['Branislav', 'Bruno'], '03-11': ['Angela', 'Angelika'], '03-12': ['Gregor'],
  '03-13': ['Vlastimil'], '03-14': ['Matilda'], '03-15': ['Svetlana'],
  '03-16': ['Benjamín'], '03-17': ['Ľubica'], '03-18': ['Eduard'], '03-19': ['Jozef'],
  '03-20': ['Víťazoslav', 'Klaudius'], '03-21': ['Blahoslav'], '03-22': ['Beňadik'],
  '03-23': ['Adrián'], '03-24': ['Gabriel'], '03-25': ['Marián'], '03-26': ['Emanuel'],
  '03-27': ['Alena'], '03-28': ['Soňa'], '03-29': ['Miroslav'], '03-30': ['Vieroslava'],
  '03-31': ['Benjamína'],

  '04-01': ['Hugo'], '04-02': ['Zita'], '04-03': ['Richard'], '04-04': ['Izidor'],
  '04-05': ['Miroslava'], '04-06': ['Irena'], '04-07': ['Zoltán'], '04-08': ['Albert'],
  '04-09': ['Milena'], '04-10': ['Igor'], '04-11': ['Július'], '04-12': ['Estera'],
  '04-13': ['Aleš'], '04-14': ['Justína'], '04-15': ['Fedor'], '04-16': ['Dana', 'Danica'],
  '04-17': ['Rudolf'], '04-18': ['Valér'], '04-19': ['Jela'], '04-20': ['Marcel'],
  '04-21': ['Ervín'], '04-22': ['Slavomír'], '04-23': ['Vojtech'], '04-24': ['Juraj'],
  '04-25': ['Marek'], '04-26': ['Jaroslava'], '04-27': ['Jaroslav'], '04-28': ['Jarmila'],
  '04-29': ['Lea'], '04-30': ['Anastázia'],

  '05-02': ['Žigmund'], '05-03': ['Galina'], '05-04': ['Florián'],
  '05-05': ['Lesana', 'Mona'], '05-06': ['Hermína'], '05-07': ['Monika'],
  '05-08': ['Ingrida'], '05-09': ['Roland'], '05-10': ['Viktória'], '05-11': ['Blažena'],
  '05-12': ['Pankrác'], '05-13': ['Servác'], '05-14': ['Bonifác'], '05-15': ['Žofia'],
  '05-16': ['Svetozár'], '05-17': ['Gizela'], '05-18': ['Viola'], '05-19': ['Gertrúda'],
  '05-20': ['Bernard'], '05-21': ['Zina'], '05-22': ['Júlia', 'Juliana'],
  '05-23': ['Želmíra'], '05-24': ['Ela'], '05-25': ['Urban'], '05-26': ['Dušan'],
  '05-27': ['Iveta'], '05-28': ['Viliam'], '05-29': ['Vilma'], '05-30': ['Ferdinand'],
  '05-31': ['Petronela', 'Petrana'],

  '06-01': ['Žaneta'], '06-02': ['Xénia', 'Oxana'], '06-03': ['Karolína'],
  '06-04': ['Lenka'], '06-05': ['Laura'], '06-06': ['Norbert'], '06-07': ['Róbert'],
  '06-08': ['Medard'], '06-09': ['Stanislava'], '06-10': ['Margaréta'],
  '06-11': ['Dobroslava'], '06-12': ['Zlatko'], '06-13': ['Anton'], '06-14': ['Vasil'],
  '06-15': ['Vít'], '06-16': ['Blanka'], '06-17': ['Adolf'], '06-18': ['Vratislav'],
  '06-19': ['Alfréd'], '06-20': ['Valéria'], '06-21': ['Alojz'], '06-22': ['Paulína'],
  '06-23': ['Sidónia'], '06-24': ['Ján'], '06-25': ['Tadeáš'], '06-26': ['Adriana'],
  '06-27': ['Ladislav', 'Ladislava'], '06-28': ['Beáta'], '06-29': ['Peter', 'Pavol'],
  '06-30': ['Melánia'],

  '07-01': ['Diana'], '07-02': ['Berta'], '07-03': ['Miloslav'], '07-04': ['Prokop'],
  '07-05': ['Cyril', 'Metod'], '07-06': ['Patrícia', 'Patrik'], '07-07': ['Oliver'],
  '07-08': ['Ivan'], '07-09': ['Lujza'], '07-10': ['Amália'], '07-11': ['Milota'],
  '07-12': ['Nina'], '07-13': ['Margita'], '07-14': ['Kamil'], '07-15': ['Henrich'],
  '07-16': ['Drahomír'], '07-17': ['Bohuslav'], '07-18': ['Kamila'], '07-19': ['Dušana'],
  '07-20': ['Iľja'], '07-21': ['Daniel'], '07-22': ['Magdaléna'], '07-23': ['Oľga'],
  '07-24': ['Vladimír'], '07-25': ['Jakub'], '07-26': ['Anna', 'Hana'],
  '07-27': ['Božena'], '07-28': ['Krištof'], '07-29': ['Marta'], '07-30': ['Libuša'],
  '07-31': ['Ignác'],

  '08-01': ['Božidara'], '08-02': ['Gustáv'], '08-03': ['Jerguš'], '08-04': ['Dominik'],
  '08-05': ['Hortenzia'], '08-06': ['Jozefína'], '08-07': ['Štefánia'], '08-08': ['Oskar'],
  '08-09': ['Ľubomíra'], '08-10': ['Vavrinec'], '08-11': ['Zuzana'], '08-12': ['Darina'],
  '08-13': ['Ľubomír'], '08-14': ['Mojmír'], '08-15': ['Marcela'], '08-16': ['Leonard'],
  '08-17': ['Milica'], '08-18': ['Elena', 'Helena'], '08-19': ['Lýdia'],
  '08-20': ['Anabela'], '08-21': ['Jana'], '08-22': ['Tichomír'], '08-23': ['Filip'],
  '08-24': ['Bartolomej'], '08-25': ['Ľudovít'], '08-26': ['Samuel'], '08-27': ['Silvia'],
  '08-28': ['Augustín'], '08-29': ['Nikola', 'Nikolaj'], '08-30': ['Ružena'],
  '08-31': ['Nora'],

  '09-01': ['Drahoslava'], '09-02': ['Linda', 'Rebeka'], '09-03': ['Belo'],
  '09-04': ['Rozália'], '09-05': ['Regína'], '09-06': ['Alica'], '09-07': ['Marianna'],
  '09-08': ['Miriama'], '09-09': ['Martina'], '09-10': ['Oleg'], '09-11': ['Bystrík'],
  '09-12': ['Mária'], '09-13': ['Ctibor'], '09-14': ['Ľudomil'], '09-15': ['Jolana'],
  '09-16': ['Ľudmila'], '09-17': ['Olympia'], '09-18': ['Eugénia'],
  '09-19': ['Konštantín'], '09-20': ['Ľuboslav', 'Ľuboslava'], '09-21': ['Matúš'],
  '09-22': ['Móric'], '09-23': ['Zdenka'], '09-24': ['Ľuboš', 'Ľubor'],
  '09-25': ['Vladislav'], '09-26': ['Edita'], '09-27': ['Cyprián'], '09-28': ['Václav'],
  '09-29': ['Michal'], '09-30': ['Jarolím'],

  '10-01': ['Arnold'], '10-02': ['Levoslav'], '10-03': ['Stela'], '10-04': ['František'],
  '10-05': ['Viera'], '10-06': ['Natália'], '10-07': ['Eliška'], '10-08': ['Brigita'],
  '10-09': ['Dionýz'], '10-10': ['Sláva', 'Slávka'], '10-11': ['Valentina'],
  '10-12': ['Maximilián'], '10-13': ['Koloman'], '10-14': ['Boris'],
  '10-15': ['Terézia'], '10-16': ['Vladimíra'], '10-17': ['Hedviga'], '10-18': ['Lukáš'],
  '10-19': ['Kristián'], '10-20': ['Vendelín'], '10-21': ['Uršuľa'], '10-22': ['Sergej'],
  '10-23': ['Alojzia'], '10-24': ['Kvetoslava'], '10-25': ['Aurel'], '10-26': ['Demeter'],
  '10-27': ['Sabína'], '10-28': ['Dobromila'], '10-29': ['Klára'],
  '10-30': ['Šimon', 'Simona'], '10-31': ['Aurélia'],

  '11-01': ['Denisa'], '11-03': ['Hubert'], '11-04': ['Karol'], '11-05': ['Imrich'],
  '11-06': ['Renáta'], '11-07': ['René'], '11-08': ['Bohumír'], '11-09': ['Teodor'],
  '11-10': ['Tibor'], '11-11': ['Martin'], '11-12': ['Svätopluk'], '11-13': ['Stanislav'],
  '11-14': ['Irma'], '11-15': ['Leopold'], '11-16': ['Agnesa'], '11-17': ['Klaudia'],
  '11-18': ['Eugen'], '11-19': ['Alžbeta'], '11-20': ['Félix'], '11-21': ['Elvíra'],
  '11-22': ['Cecília'], '11-23': ['Klement'], '11-24': ['Emília'], '11-25': ['Katarína'],
  '11-26': ['Kornel'], '11-27': ['Milan'], '11-28': ['Henrieta'], '11-29': ['Vratko'],
  '11-30': ['Ondrej'],

  '12-01': ['Edmund'], '12-02': ['Bibiána'], '12-03': ['Oldrich'], '12-04': ['Barbora'],
  '12-05': ['Oto'], '12-06': ['Mikuláš'], '12-07': ['Ambróz'], '12-08': ['Mariana'],
  '12-09': ['Izabela'], '12-10': ['Radúz'], '12-11': ['Hilda'], '12-12': ['Otília'],
  '12-13': ['Lucia'], '12-14': ['Branislava', 'Bronislava'], '12-15': ['Ivica'],
  '12-16': ['Albína'], '12-17': ['Kornélia'], '12-18': ['Sláva', 'Slávka'],
  '12-19': ['Judita'], '12-20': ['Dagmara'], '12-21': ['Bohdan'], '12-22': ['Adela'],
  '12-23': ['Nadežda'], '12-24': ['Adam', 'Eva'], '12-26': ['Štefan'],
  '12-27': ['Filoména'], '12-28': ['Ivana', 'Ivona'], '12-29': ['Milada'],
  '12-30': ['Dávid'], '12-31': ['Silvester']
};

// Возвращает список имён, у которых сегодня именины (по умолчанию — сегодняшняя дата).
function todayNamedayNames(date) {
  const d = date || new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return NAMEDAY_CALENDAR[`${mm}-${dd}`] || [];
}

// Убирает диакритику для сравнения имён без учёта акцентов (например, Ján ≈ Jan).
function namedayNormalize(str) {
  return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Первое слово из полного имени клиента (считаем его именем для сравнения с календарём).
function namedayFirstName(fullName) {
  return (fullName || '').trim().split(/\s+/)[0] || '';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NAMEDAY_CALENDAR, todayNamedayNames, namedayNormalize, namedayFirstName };
}

}, {}, "/app/src/nameday-calendar.js"];
__defs[47] = [function(module, exports, require, __filename, __dirname){
// _cardModel.js — 2.25: ОДИН источник того, как выглядит карта гостя в Google / Apple Wallet.
// Сервер (сайт Loya) строит по нему настоящую карту и баннер, программа — превью «один в один».
// Файл одинаковый в репозитории сайта (api/_cardModel.js) и в программе (src/card-model.js).
// Без require и без Node API: работает и в браузере, и на сервере.
function loyaCardFactory() {
'use strict';
const W = 1032, H = 336; // размер баннера Google Wallet (heroImage)
const TEXT = {
  ru: { hInvite: 'Пригласите друга', inviteDesc: 'Вам обоим — подарок', gift: 'Подарочный сертификат', hBalance: 'Остаток', hTier: 'Уровень', hUntil: 'Действует до', discount: 'Скидочная карта', stamp: 'Карта лояльности', spend: 'Накопительная карта', hDiscount: 'Скидка', hProgress: 'Штампы', hSpent: 'Накоплено', hBonus: 'Бонусы', hRule: 'Правило' },
  uk: { hInvite: 'Запросіть друга', inviteDesc: 'Вам обом — подарунок', gift: 'Подарунковий сертифікат', hBalance: 'Залишок', hTier: 'Рівень', hUntil: 'Діє до', discount: 'Знижкова картка', stamp: 'Картка лояльності', spend: 'Накопичувальна картка', hDiscount: 'Знижка', hProgress: 'Штампи', hSpent: 'Накопичено', hBonus: 'Бонуси', hRule: 'Правило' },
  sk: { hInvite: 'Pozvite priateľa', inviteDesc: 'Darček pre vás oboch', gift: 'Darčeková poukážka', hBalance: 'Zostatok', hTier: 'Úroveň', hUntil: 'Platí do', discount: 'Zľavová karta', stamp: 'Vernostná karta', spend: 'Vernostná karta na nákupy', hDiscount: 'Zľava', hProgress: 'Pečiatky', hSpent: 'Nazbierané', hBonus: 'Bonusy', hRule: 'Pravidlo' },
  en: { hInvite: 'Invite a friend', inviteDesc: 'A gift for you both', gift: 'Gift card', hBalance: 'Balance', hTier: 'Tier', hUntil: 'Valid until', discount: 'Discount card', stamp: 'Loyalty card', spend: 'Spend card', hDiscount: 'Discount', hProgress: 'Stamps', hSpent: 'Collected', hBonus: 'Bonuses', hRule: 'How it works' }
};
const CUR = { EUR: '€', USD: '$', RUB: '₽', UAH: '₴', CZK: 'Kč', PLN: 'zł', HUF: 'Ft', GBP: '£', CHF: 'CHF' };

// Прогресс карты для строки на пассе.
function progress(card, lang, currency, label) {
  const W = TEXT[lang] || TEXT.en;
  const cur = CUR[currency] || '€';
  const money = (v) => { const n = Math.round((Number(v) || 0) * 100) / 100; let t = Number.isInteger(n) ? String(n) : n.toFixed(2); if (lang !== 'en') t = t.replace('.', ','); return lang === 'en' ? cur + t : `${t} ${cur}`; };
  // 2.19: сертификат — остаток из номинала; срок — отдельной строкой.
  if (card.type === 'gift') {
    const until = /^\d{4}-\d{2}-\d{2}/.test(String(card.expires_at || '')) ? String(card.expires_at).slice(0, 10).split('-').reverse().join('.') : '';
    return { header: W.hBalance, body: `${money(card.gift_balance)} / ${money(card.gift_amount)}`, rule: until ? { header: W.hUntil, body: until } : null };
  }
  if (card.type === 'discount') return { header: W.hDiscount, body: `-${Number(card.discount_percent) || 0}%` };
  if (card.type === 'spend') {
    const acc = money(card.spend_accumulated);
    const bonus = Math.max(0, Math.round(Number(card.bonus_balance) || 0));
    const pts = Math.max(1, Math.round(Number(card.spend_bonus_points) || 1));
    // С 2.17: бонусы копятся — за каждые «порог» денег клиент получает N бонусов (2000 при пороге 500 → 4 × N).
    return { header: W.hSpent, body: Number(card.spend_target) > 0 ? `${acc} / ${money(card.spend_target)}` : acc,
      bonus: Number(card.spend_target) > 0 ? { header: W.hBonus, body: String(bonus) } : null,
      rule: Number(card.spend_target) > 0 ? { header: W.hRule, body: `${money(card.spend_target)} → +${pts}` } : null };
  }
  return { header: label || W.hProgress, body: `${Number(card.stamp_count) || 0} / ${Number(card.stamp_target) || 0}` };
}

// Уровень клиента (2.19, если у заведения включены привилегии уровней).
function tierLabel(t) { return t === 'gold' ? '🥇 GOLD' : t === 'silver' ? '🥈 SILVER' : t === 'basic' ? 'BASIC' : ''; }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// Немного затемняем/осветляем hex-цвет бизнеса, чтобы собрать градиент фона.
function shade(hex, amt) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = clamp(((n >> 16) & 255) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

// Простые векторные значки по типу бизнеса — без эмодзи (шрифты эмодзи ненадёжны при
// серверном рендере), но узнаваемые силуэты вместо абстрактной точки.
const ICONS = {
  coffee: '<path d="M0 14h58v34c0 12-10 22-22 22H22C10 70 0 60 0 48V14z" fill="#fff"/><path d="M58 22h8a12 12 0 0 1 0 24h-8V22z" fill="none" stroke="#fff" stroke-width="7"/><path d="M12 0q4 6 0 10t0 10" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M30 0q4 6 0 10t0 10" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>',
  bakery: '<ellipse cx="34" cy="46" rx="34" ry="24" fill="#fff"/><circle cx="18" cy="30" r="9" fill="#fff"/><circle cx="34" cy="20" r="10" fill="#fff"/><circle cx="52" cy="30" r="9" fill="#fff"/>',
  barber: '<circle cx="10" cy="10" r="9" fill="none" stroke="#fff" stroke-width="6"/><circle cx="10" cy="54" r="9" fill="none" stroke="#fff" stroke-width="6"/><path d="M16 16 L60 58 M16 48 L60 6" stroke="#fff" stroke-width="6" stroke-linecap="round"/>',
  nails: '<path d="M32 0 L40 24 L64 32 L40 40 L32 64 L24 40 L0 32 L24 24 Z" fill="#fff"/>',
  spa: '<path d="M32 0 L40 24 L64 32 L40 40 L32 64 L24 40 L0 32 L24 24 Z" fill="#fff"/>',
  tattoo: '<circle cx="10" cy="10" r="9" fill="none" stroke="#fff" stroke-width="6"/><circle cx="10" cy="54" r="9" fill="none" stroke="#fff" stroke-width="6"/><path d="M16 16 L60 58 M16 48 L60 6" stroke="#fff" stroke-width="6" stroke-linecap="round"/>',
  fitness: '<rect x="0" y="24" width="16" height="16" rx="4" fill="#fff"/><rect x="52" y="24" width="16" height="16" rx="4" fill="#fff"/><rect x="14" y="29" width="40" height="6" rx="3" fill="#fff"/>',
  petgroom: '<circle cx="32" cy="40" r="16" fill="#fff"/><circle cx="10" cy="18" r="8" fill="#fff"/><circle cx="54" cy="18" r="8" fill="#fff"/><circle cx="0" cy="40" r="7" fill="#fff"/><circle cx="64" cy="40" r="7" fill="#fff"/>',
  photo: '<rect x="0" y="12" width="64" height="46" rx="8" fill="#fff"/><rect x="20" y="0" width="24" height="14" rx="4" fill="#fff"/><circle cx="32" cy="36" r="14" fill-opacity="0" stroke="#fff" stroke-width="7"/>',
  clothing: '<path d="M20 0 L32 10 L44 0 L64 14 L54 28 L44 20 V64 H20 V20 L10 28 L0 14 Z" fill="#fff"/>',
  other: '<path d="M32 0 L40 24 L64 32 L40 40 L32 64 L24 40 L0 32 L24 24 Z" fill="#fff"/>'
};
function iconSvg(niche, x, y, size, opacity) {
  const d = ICONS[niche] || ICONS.other;
  return `<g transform="translate(${x},${y}) scale(${size / 64})" opacity="${opacity}">${d}</g>`;
}

// ---------- Дизайн баннера — в стиле карточки из программы ----------
// Тёмный графитовый фон с лёгким свечением фирменного цвета, сверху — значок и название
// бизнеса плюс «пилюля» с типом карты, ниже — штампы (цветные с галочкой, пустые
// пунктиром, последний — подарок), накопленная сумма или крупная скидка.
const TXT = {
  ru: { gift: 'Сертификат', balance: 'Остаток на сертификате', stamp: 'Штамп-карта', discount: 'Скидочная', spend: 'Накопительная', left: (n) => `Ещё ${n} до подарка`, ready: '🎁 Подарок ждёт вас!', every: 'На каждую покупку', toBonus: (m) => `Ещё ${m} до бонуса`, saved: 'Накоплено', bonusN: (n) => `Бонусов: ${n}` },
  uk: { gift: 'Сертифікат', balance: 'Залишок на сертифікаті', stamp: 'Штамп-картка', discount: 'Знижкова', spend: 'Накопичувальна', left: (n) => `Ще ${n} до подарунка`, ready: '🎁 Подарунок чекає!', every: 'На кожну покупку', toBonus: (m) => `Ще ${m} до бонусу`, saved: 'Накопичено', bonusN: (n) => `Бонусів: ${n}` },
  sk: { gift: 'Poukážka', balance: 'Zostatok na poukážke', stamp: 'Pečiatková karta', discount: 'Zľavová', spend: 'Na nákupy', left: (n) => `Ešte ${n} do darčeka`, ready: '🎁 Darček na vás čaká!', every: 'Na každý nákup', toBonus: (m) => `Ešte ${m} do bonusu`, saved: 'Nazbierané', bonusN: (n) => `Bonusy: ${n}` },
  en: { gift: 'Gift card', balance: 'Gift card balance', stamp: 'Stamp card', discount: 'Discount', spend: 'Spend card', left: (n) => `${n} more to a reward`, ready: '🎁 Your reward is ready!', every: 'On every purchase', toBonus: (m) => `${m} more to a bonus`, saved: 'Collected', bonusN: (n) => `Bonuses: ${n}` }
};
const INK = '#0e141b';       // цвет галочек и подарка на закрашенном кружке
const MUTED = 'rgba(255,255,255,.62)';

// Подарок — вектором (эмодзи при серверном рендере ненадёжны).
function giftIcon(cx, cy, s, color) {
  const w = s * 0.56, h = s * 0.42, x = cx - w / 2, y = cy - h / 2 + s * 0.06;
  return `<g fill="${color}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${s * 0.05}"/>
    <rect x="${x - s * 0.04}" y="${y - s * 0.12}" width="${w + s * 0.08}" height="${s * 0.14}" rx="${s * 0.04}"/>
  </g>
  <rect x="${cx - s * 0.045}" y="${y - s * 0.12}" width="${s * 0.09}" height="${h + s * 0.12}" fill="${color === INK ? 'rgba(255,255,255,.55)' : INK}" opacity=".55"/>
  <path d="M${cx} ${y - s * 0.12} C ${cx - s * 0.2} ${y - s * 0.36}, ${cx - s * 0.3} ${y - s * 0.08}, ${cx} ${y - s * 0.12} C ${cx + s * 0.2} ${y - s * 0.36}, ${cx + s * 0.3} ${y - s * 0.08}, ${cx} ${y - s * 0.12}" fill="none" stroke="${color}" stroke-width="${s * 0.07}" stroke-linecap="round"/>`;
}

function stampsBlock(count, target, accent, T) {
  const n = Math.max(1, Number(target) || 1);
  count = clamp(Number(count) || 0, 0, n);
  if (n > 24) { // слишком много кружков — компактная шкала
    return progressLine(count / n, `${count} / ${n}`, n - count > 0 ? T.left(n - count) : T.ready, accent);
  }
  const rows = n <= 10 ? 1 : 2;
  const perRow = Math.ceil(n / rows);
  const gap = 14;
  const size = Math.min(rows === 1 ? 64 : 52, (W - 96 - gap * (perRow - 1)) / perRow);
  const top = rows === 1 ? 132 : 108;
  let out = '';
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / perRow), c = i % perRow;
    const cx = 48 + c * (size + gap) + size / 2;
    const cy = top + r * (size + 12) + size / 2;
    const last = i === n - 1;
    if (i < count) {
      out += `<circle cx="${cx}" cy="${cy}" r="${size / 2}" fill="${accent}"/>`;
      out += last
        ? giftIcon(cx, cy, size, INK)
        : `<path d="M${cx - size * 0.2} ${cy + size * 0.01} l${size * 0.13} ${size * 0.14} l${size * 0.26} -${size * 0.3}" stroke="${INK}" stroke-width="${size * 0.09}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else if (last) {
      out += `<circle cx="${cx}" cy="${cy}" r="${size / 2 - 2.5}" fill="rgba(255,255,255,.04)" stroke="${accent}" stroke-width="4"/>` + giftIcon(cx, cy, size, accent);
    } else {
      out += `<circle cx="${cx}" cy="${cy}" r="${size / 2 - 2}" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="3" stroke-dasharray="7 6"/>`;
    }
  }
  const textY = top + rows * size + (rows - 1) * 12 + 42;
  const caption = n - count > 0 ? T.left(n - count) : T.ready.replace('🎁 ', '');
  out += `<text x="48" y="${textY}" font-family="Carlito" font-weight="600" font-size="28" fill="${MUTED}">${esc(caption)}</text>`;
  return out;
}

function progressLine(frac, bigText, caption, accent) {
  frac = clamp(frac, 0, 1);
  const x = 48, w = W - 96, y = 200, h = 16;
  return `<text x="${x}" y="176" font-family="Carlito" font-weight="700" font-size="52" fill="${accent}">${esc(bigText)}</text>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="rgba(255,255,255,.1)"/>
    <rect x="${x}" y="${y}" width="${Math.max(h, w * frac)}" height="${h}" rx="8" fill="${accent}"/>
    <text x="${x}" y="${y + h + 44}" font-family="Carlito" font-weight="600" font-size="28" fill="${MUTED}">${esc(caption)}</text>`;
}

function moneyFmt(v, currency, lang) {
  const n = Math.round((Number(v) || 0) * 100) / 100;
  let t = Number.isInteger(n) ? String(n) : n.toFixed(2);
  if (lang !== 'en') t = t.replace('.', ',');
  // Знака ₽ в шрифте баннера нет (в тексте самой карты Google рисует его сам) — пишем словами.
  const sym = currency === 'RUB' ? (lang === 'ru' || lang === 'uk' ? 'руб.' : 'RUB')
    : ({ EUR: '€', USD: '$', GBP: '£', UAH: '₴', CZK: 'Kč', PLN: 'zł' }[currency] || currency || '€');
  return lang === 'en' ? `${sym}${t}` : `${t} ${sym}`;
}

// Примерная ширина текста (шрифт пропорциональный) — нужна, чтобы поставить «пилюлю»
// с типом карты сразу после названия бизнеса.
function textWidth(str, size) {
  let w = 0;
  for (const ch of String(str)) w += /[A-ZА-ЯЁІЇЄҐ0-9WMШЩЖЮФ]/.test(ch) ? 0.64 : /[\s.,'’]/.test(ch) ? 0.28 : 0.54;
  return w * size;
}

// ---------- 2.27: «вид карты» — значок штампа, раскладка баннера, сезонное оформление ----------
// Значки рисуются в сетке 24×24: %C — цвет значка, %K — цвет кружка под ним (прорези и детали).
const STAMP_ICONS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="%C" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',
  coffee: '<path d="M3.5 9h13v5a5 5 0 0 1-5 5h-3a5 5 0 0 1-5-5z" fill="%C"/><path d="M16.5 10.5h1.3a2.6 2.6 0 0 1 0 5.2h-1.6" fill="none" stroke="%C" stroke-width="2"/><path d="M8 2.8q1.2 1.6 0 3.2M12 2.8q1.2 1.6 0 3.2" fill="none" stroke="%C" stroke-width="1.6" stroke-linecap="round"/><rect x="2.5" y="20" width="15" height="1.8" rx=".9" fill="%C"/>',
  takeaway: '<path d="M6.5 8h11l-1.3 12.2a1.6 1.6 0 0 1-1.6 1.4H9.4a1.6 1.6 0 0 1-1.6-1.4z" fill="%C"/><rect x="5.5" y="4.6" width="13" height="3" rx="1.2" fill="%C"/><path d="M8 2.4h8l.8 2H7.2z" fill="%C"/><rect x="7.6" y="11.5" width="8.8" height="4" fill="%K" opacity=".5"/>',
  tea: '<path d="M3.5 10h13v3.5a5.5 5.5 0 0 1-5.5 5.5H9a5.5 5.5 0 0 1-5.5-5.5z" fill="%C"/><path d="M16.5 11h1.6a2.4 2.4 0 0 1 0 4.8h-1.9" fill="none" stroke="%C" stroke-width="1.8"/><path d="M10 10V5.6" stroke="%C" stroke-width="1.2"/><rect x="8.3" y="2.6" width="3.4" height="3.4" rx=".6" fill="%C"/><rect x="2.5" y="20" width="16" height="1.8" rx=".9" fill="%C"/>',
  wine: '<path d="M7 2.5h10l-.3 5A4.7 4.7 0 0 1 12 12a4.7 4.7 0 0 1-4.7-4.5z" fill="%C"/><rect x="11.1" y="11.5" width="1.8" height="7.5" fill="%C"/><rect x="7.5" y="18.8" width="9" height="2.2" rx="1.1" fill="%C"/>',
  bottle: '<path d="M10.2 2.6h3.6v4c0 1.1 2.7 2.2 2.7 5.4v8.2a1.8 1.8 0 0 1-1.8 1.8H9.3a1.8 1.8 0 0 1-1.8-1.8V12c0-3.2 2.7-4.3 2.7-5.4z" fill="%C"/><rect x="9.6" y="1.4" width="4.8" height="2" rx=".6" fill="%C"/><rect x="8.8" y="12.5" width="6.4" height="5" rx="1" fill="%K" opacity=".55"/>',
  cocktail: '<path d="M3.5 4h17L12 13.2z" fill="%C"/><rect x="11.1" y="12.5" width="1.8" height="6.8" fill="%C"/><rect x="7.5" y="19" width="9" height="2.2" rx="1.1" fill="%C"/><circle cx="9.6" cy="6.6" r="1.6" fill="%K"/><circle cx="18.5" cy="4" r="2.6" fill="none" stroke="%C" stroke-width="1.4"/>',
  beer: '<rect x="4.5" y="8" width="10.5" height="13" rx="1.6" fill="%C"/><path d="M15 10.5h2.2a2 2 0 0 1 2 2v3.4a2 2 0 0 1-2 2H15" fill="none" stroke="%C" stroke-width="2"/><path d="M3.8 9.2c-.9-2.4 1-4.6 3.3-4 .8-1.8 3.4-2.4 4.9-.9 1.6-.9 4 .2 3.8 2.6v2.3z" fill="%C"/><rect x="7" y="11.5" width="1.4" height="7" rx=".7" fill="%K" opacity=".5"/><rect x="11" y="11.5" width="1.4" height="7" rx=".7" fill="%K" opacity=".5"/>',
  paw: '<ellipse cx="12" cy="16" rx="5.2" ry="4.4" fill="%C"/><ellipse cx="5.6" cy="10.6" rx="2.1" ry="2.6" fill="%C"/><ellipse cx="9.5" cy="6.3" rx="2.1" ry="2.7" fill="%C"/><ellipse cx="14.5" cy="6.3" rx="2.1" ry="2.7" fill="%C"/><ellipse cx="18.4" cy="10.6" rx="2.1" ry="2.6" fill="%C"/>',
  bone: '<g transform="rotate(-35 12 12)"><rect x="6" y="10.2" width="12" height="3.6" fill="%C"/><circle cx="6" cy="9.8" r="2.7" fill="%C"/><circle cx="6" cy="14.2" r="2.7" fill="%C"/><circle cx="18" cy="9.8" r="2.7" fill="%C"/><circle cx="18" cy="14.2" r="2.7" fill="%C"/></g>',
  cat: '<path d="M4 3.5l4.2 4.2a10.5 10.5 0 0 1 7.6 0L20 3.5v9.5c0 4.6-3.6 8.5-8 8.5s-8-3.9-8-8.5z" fill="%C"/><circle cx="9" cy="12.5" r="1.3" fill="%K"/><circle cx="15" cy="12.5" r="1.3" fill="%K"/><path d="M11 15.4h2l-1 1.2z" fill="%K"/>',
  fish: '<path d="M2.5 12c3-5 9.5-6.5 14-2.2L21.5 6v12l-5-3.8C12 18.5 5.5 17 2.5 12z" fill="%C"/><circle cx="7.5" cy="11" r="1.1" fill="%K"/>',
  heart: '<path d="M12 20.5S3.5 15.3 3.5 9.3A4.6 4.6 0 0 1 12 6.8a4.6 4.6 0 0 1 8.5 2.5c0 6-8.5 11.2-8.5 11.2z" fill="%C"/>',
  star: '<path d="M12 2.8l2.75 5.6 6.15.9-4.45 4.33 1.05 6.12L12 16.9l-5.5 2.85 1.05-6.12L3.1 9.3l6.15-.9z" fill="%C"/>',
  smile: '<circle cx="12" cy="12" r="9.5" fill="%C"/><circle cx="8.8" cy="9.8" r="1.4" fill="%K"/><circle cx="15.2" cy="9.8" r="1.4" fill="%K"/><path d="M7.5 13.8c2.2 3.4 6.8 3.4 9 0" stroke="%K" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  flower: '<circle cx="12" cy="7.2" r="3.7" fill="%C"/><circle cx="16.6" cy="10.5" r="3.7" fill="%C"/><circle cx="14.8" cy="15.9" r="3.7" fill="%C"/><circle cx="9.2" cy="15.9" r="3.7" fill="%C"/><circle cx="7.4" cy="10.5" r="3.7" fill="%C"/><circle cx="12" cy="12.2" r="2.5" fill="%K" opacity=".7"/>',
  leaf: '<path d="M4.5 19.5C4.5 10 10.5 4.5 20 4c-.3 9.8-6 15.5-15.5 15.5z" fill="%C"/><path d="M4.5 19.5L14 10" stroke="%K" stroke-width="1.4" stroke-linecap="round" opacity=".6"/>',
  scissors: '<circle cx="6.5" cy="17" r="3" fill="none" stroke="%C" stroke-width="2.2"/><circle cx="17.5" cy="17" r="3" fill="none" stroke="%C" stroke-width="2.2"/><path d="M8.5 14.8L17 3.5M15.5 14.8L7 3.5" stroke="%C" stroke-width="2.2" stroke-linecap="round"/>',
  polish: '<rect x="9.5" y="2" width="5" height="7" rx="1" fill="%C"/><rect x="6" y="9.5" width="12" height="12" rx="3" fill="%C"/><rect x="8.5" y="13" width="7" height="5" rx="1" fill="%K" opacity=".45"/>',
  lipstick: '<path d="M10 3.6l4-1.6v7h-4z" fill="%C"/><rect x="8.8" y="9" width="6.4" height="3.5" rx=".6" fill="%C"/><rect x="7.8" y="12.5" width="8.4" height="9" rx="1.2" fill="%C"/>',
  drop: '<path d="M12 2.5c3.5 5 6.5 8.7 6.5 12.3a6.5 6.5 0 0 1-13 0c0-3.6 3-7.3 6.5-12.3z" fill="%C"/><path d="M9 15a3 3 0 0 0 2.5 3" stroke="%K" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".55"/>',
  dumbbell: '<rect x="1.5" y="9" width="3" height="6" rx="1" fill="%C"/><rect x="4.5" y="6.5" width="3.2" height="11" rx="1" fill="%C"/><rect x="7.7" y="10.9" width="8.6" height="2.2" fill="%C"/><rect x="16.3" y="6.5" width="3.2" height="11" rx="1" fill="%C"/><rect x="19.5" y="9" width="3" height="6" rx="1" fill="%C"/>',
  pizza: '<path d="M12 21.5L3 5.2C8.6 2 15.4 2 21 5.2z" fill="%C"/><circle cx="10" cy="8.5" r="1.6" fill="%K"/><circle cx="14.4" cy="9.8" r="1.4" fill="%K"/><circle cx="12" cy="14.5" r="1.4" fill="%K"/>',
  burger: '<path d="M3.5 10.5a8.5 6.5 0 0 1 17 0z" fill="%C"/><rect x="2.5" y="12" width="19" height="3" rx="1.5" fill="%C"/><path d="M3.5 16.5h17v1.5a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3z" fill="%C"/><circle cx="9" cy="7.5" r=".8" fill="%K"/><circle cx="12.5" cy="6.3" r=".8" fill="%K"/><circle cx="15.5" cy="8" r=".8" fill="%K"/>',
  bakery: '<path d="M3 13c0-5 4-8.5 9-8.5s9 3.5 9 8.5v5.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="%C"/><path d="M8 9.5l2 3M11.5 8.5l2 3M15 9.5l2 3" stroke="%K" stroke-width="1.3" stroke-linecap="round" opacity=".6"/>',
  donut: '<circle cx="12" cy="12" r="9" fill="%C"/><circle cx="12" cy="12" r="3.2" fill="%K"/><path d="M7 7.5l1.2.8M15.8 6.5l-.6 1.3M17.5 13.5l-1.3.3M9 16.5l.6-1.2M6.3 12.2l1.3-.4" stroke="%K" stroke-width="1.2" stroke-linecap="round"/>',
  icecream: '<path d="M7 11.5h10l-5 11z" fill="%C"/><circle cx="9.3" cy="9" r="3.5" fill="%C"/><circle cx="14.7" cy="9" r="3.5" fill="%C"/><circle cx="12" cy="5.8" r="3.6" fill="%C"/><path d="M8.5 13.5l6 2M9.8 16.5l3.8 1.3" stroke="%K" stroke-width="1" opacity=".5"/>',
  cupcake: '<path d="M5.5 12.5h13l-1.6 8.3a1.5 1.5 0 0 1-1.5 1.2H8.6a1.5 1.5 0 0 1-1.5-1.2z" fill="%C"/><path d="M4.5 12.3c-.6-3.2 1.8-5.3 4.2-4.8.9-2.5 5.7-2.5 6.6 0 2.4-.5 4.8 1.6 4.2 4.8z" fill="%C"/><circle cx="12" cy="4" r="1.8" fill="%C"/><path d="M9.5 14.5v5.5M12 14.5v5.5M14.5 14.5v5.5" stroke="%K" stroke-width="1" opacity=".5"/>',
  sushi: '<ellipse cx="12" cy="15" rx="9" ry="5.5" fill="%C"/><ellipse cx="12" cy="11" rx="9" ry="5.5" fill="%C"/><ellipse cx="12" cy="11" rx="6.5" ry="3.7" fill="%K" opacity=".55"/><ellipse cx="12" cy="11" rx="3" ry="1.7" fill="%C"/>',
  music: '<path d="M9 17.5V5l11-2.5v12.5" fill="none" stroke="%C" stroke-width="2.2" stroke-linejoin="round"/><ellipse cx="6.5" cy="17.8" rx="3.3" ry="2.6" fill="%C"/><ellipse cx="17.5" cy="15.3" rx="3.3" ry="2.6" fill="%C"/>',
  book: '<path d="M2.5 5.5c3-1.3 6.3-1.3 9.5.8v14.2c-3.2-2.1-6.5-2.1-9.5-.8z" fill="%C"/><path d="M21.5 5.5c-3-1.3-6.3-1.3-9.5.8v14.2c3.2-2.1 6.5-2.1 9.5-.8z" fill="%C" opacity=".8"/>',
  tooth: '<path d="M12 5.2C9.8 3.5 4 3 4 8.6c0 3.2 1.4 4.6 2 7.3.5 2.4 1 5.6 2.6 5.6 1.9 0 1.6-5 3.4-5s1.5 5 3.4 5c1.6 0 2.1-3.2 2.6-5.6.6-2.7 2-4.1 2-7.3C20 3 14.2 3.5 12 5.2z" fill="%C"/>',
  car: '<path d="M3 14.5l1.8-5.2A2.5 2.5 0 0 1 7.2 7.6h9.6a2.5 2.5 0 0 1 2.4 1.7l1.8 5.2v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="%C"/><rect x="6.2" y="9.4" width="11.6" height="4" rx="1" fill="%K" opacity=".5"/><circle cx="7.2" cy="19.3" r="2.2" fill="%C"/><circle cx="16.8" cy="19.3" r="2.2" fill="%C"/>',
  shirt: '<path d="M8.5 3L3 6.2l2.2 4.3 2.3-1.1V21h9V9.4l2.3 1.1L21 6.2 15.5 3c-.4 1.7-1.8 2.8-3.5 2.8S8.9 4.7 8.5 3z" fill="%C"/>',
  gamepad: '<path d="M7 7h10a5 5 0 0 1 4.9 6l-.8 4a2.7 2.7 0 0 1-4.6 1.2L14.5 16h-5l-2 2.2A2.7 2.7 0 0 1 2.9 17l-.8-4A5 5 0 0 1 7 7z" fill="%C"/><path d="M7.5 10v4M5.5 12h4" stroke="%K" stroke-width="1.5" stroke-linecap="round"/><circle cx="15.5" cy="11" r="1" fill="%K"/><circle cx="17.5" cy="13" r="1" fill="%K"/>',
  gift: '<rect x="3.5" y="10" width="17" height="11" rx="1.5" fill="%C"/><rect x="2.5" y="6.8" width="19" height="4" rx="1.2" fill="%C"/><rect x="11" y="6.8" width="2" height="14.2" fill="%K" opacity=".55"/><path d="M12 6.8C10.5 3.5 6.8 3.3 6.8 5.4s3.5 1.4 5.2 1.4c1.7 0 5.2.7 5.2-1.4S13.5 3.5 12 6.8z" fill="none" stroke="%C" stroke-width="1.6"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-1.8 10H4.8z" fill="%C"/><rect x="4.8" y="19" width="14.4" height="2.2" rx="1" fill="%C"/>',
  diamond: '<path d="M6.5 3.5h11L22 9l-10 12L2 9z" fill="%C"/><path d="M2 9h20M8.5 3.5L12 9l3.5-5.5M7 9l5 12 5-12" stroke="%K" stroke-width="1" fill="none" opacity=".5"/>',
  snowflake: '<g stroke="%C" stroke-width="1.9" stroke-linecap="round" fill="none"><path d="M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5"/><path d="M9.5 3.8L12 6l2.5-2.2M9.5 20.2L12 18l2.5 2.2M3.6 10.3l3.2-.9-.9-3.2M20.4 13.7l-3.2.9.9 3.2M5.9 17.7l.9-3.2-3.2-.9M18.1 6.3l-.9 3.2 3.2.9"/></g>',
  ornament: '<circle cx="12" cy="14" r="7.5" fill="%C"/><rect x="10" y="4.4" width="4" height="3" rx=".8" fill="%C"/><path d="M12 4.4V2" stroke="%C" stroke-width="1.4"/><circle cx="9.3" cy="11.5" r="1.6" fill="%K" opacity=".45"/>',
  pumpkin: '<ellipse cx="8.4" cy="14" rx="5" ry="7" fill="%C"/><ellipse cx="15.6" cy="14" rx="5" ry="7" fill="%C"/><ellipse cx="12" cy="14" rx="4.5" ry="7.3" fill="%C"/><path d="M12 7c0-2 1-3.5 3-4" stroke="%C" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M12 8.5v11.5" stroke="%K" stroke-width="1" opacity=".4"/>',
  egg: '<path d="M12 2.5c4 0 7 6.5 7 11.5a7 7 0 0 1-14 0c0-5 3-11.5 7-11.5z" fill="%C"/><path d="M5.5 12.5l2.2-1.6 2.2 1.6 2.1-1.6 2.1 1.6 2.2-1.6 2.2 1.6" stroke="%K" stroke-width="1.3" fill="none" opacity=".55"/>'
};
const STAMP_IDS = Object.keys(STAMP_ICONS);
const SEASONS = ['none', 'auto', 'xmas', 'newyear', 'winter', 'valentine', 'march8', 'easter', 'spring', 'summer', 'autumn', 'halloween'];
const LAYOUTS = ['classic', 'photo'];
const ARRANGES = ['row', 'arc', 'wave', 'steps', 'garland', 'grid'];
const hexOk = (c) => /^#[0-9a-fA-F]{6}$/.test(String(c || ''));
// Из настроек заведения — только известные значения (сервер получает их в ссылке и в теле запроса).
function cleanLook(b) {
  b = b || {};
  const o = {};
  if (STAMP_IDS.includes(b.stamp)) o.stamp = b.stamp;
  if (STAMP_IDS.includes(b.reward)) o.reward = b.reward;
  if (hexOk(b.stampColor)) o.stampColor = b.stampColor;
  if (LAYOUTS.includes(b.layout) && b.layout !== 'classic') o.layout = b.layout;
  if (SEASONS.includes(b.season) && b.season !== 'none') o.season = b.season;
  const label = String(b.label || '').replace(/[\u0000-\u001f<>&"]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 18);
  if (label) o.label = label;
  // 2.27: расположение штампов и логотип на баннере (размер, поворот, отражение, место)
  if (ARRANGES.includes(b.arrange)) o.arrange = b.arrange;
  if (b.logoMode === 'logo' || b.logoMode === 'both') {
    o.logoMode = b.logoMode;
    const num = (v, lo, hi) => { const x = Math.round(Number(v)); return Number.isFinite(x) && v !== '' && v != null ? Math.max(lo, Math.min(hi, x)) : null; };
    const sz = num(b.logoSize, 24, 260), rt = num(b.logoRot, -180, 180), lx = num(b.logoX, 0, W), ly = num(b.logoY, 0, H);
    if (sz != null) o.logoSize = sz; if (rt) o.logoRot = rt; if (lx != null) o.logoX = lx; if (ly != null) o.logoY = ly;
    if (b.logoFlip === true || b.logoFlip === 1 || b.logoFlip === '1') o.logoFlip = 1;
  }
  return o;
}
// 2.28: готовые стили карты — одним нажатием: цвет карты + вид (значки, цвет штампов, расположение, сезон).
// label — подпись счётчика на 4 языках; name — название стиля. Свой логотип и фото заведения стиль не трогает.
const PRESETS = [
  { id: 'burgundy', bg: '#5e1224', look: { stamp: 'coffee', stampColor: '#ffffff', reward: 'gift', layout: 'photo', arrange: 'row' }, name: { ru: 'Бордовая кофейня', uk: 'Бордова кав’ярня', sk: 'Bordová kaviareň', en: 'Burgundy café' } },
  { id: 'paws', bg: '#d9572b', look: { stamp: 'paw', stampColor: '#f6d77a', reward: 'takeaway', layout: 'photo', arrange: 'row' }, label: { ru: 'Лапки', uk: 'Лапки', sk: 'Labky', en: 'Paws' }, name: { ru: 'Оранжевые лапки', uk: 'Помаранчеві лапки', sk: 'Oranžové labky', en: 'Orange paws' } },
  { id: 'xmas', bg: '#1e1e1c', look: { season: 'xmas', arrange: 'garland', reward: 'wine' }, name: { ru: 'Рождественская гирлянда', uk: 'Різдвяна гірлянда', sk: 'Vianočná girlanda', en: 'Christmas garland' } },
  { id: 'wine', bg: '#2b0f1a', look: { stamp: 'wine', stampColor: '#e8c48a', reward: 'bottle', arrange: 'arc' }, label: { ru: 'Бокалы', uk: 'Келихи', sk: 'Poháre', en: 'Glasses' }, name: { ru: 'Винный бар', uk: 'Винний бар', sk: 'Vináreň', en: 'Wine bar' } },
  { id: 'barber', bg: '#121212', look: { stamp: 'scissors', stampColor: '#ffffff', reward: 'crown', arrange: 'steps' }, name: { ru: 'Барбершоп', uk: 'Барбершоп', sk: 'Barbershop', en: 'Barbershop' } },
  { id: 'nails', bg: '#3b1d2c', look: { stamp: 'polish', stampColor: '#ff8fb1', reward: 'diamond', arrange: 'wave' }, name: { ru: 'Маникюр', uk: 'Манікюр', sk: 'Manikúra', en: 'Nail studio' } },
  { id: 'bakery', bg: '#6b4e30', look: { stamp: 'bakery', stampColor: '#f6d77a', reward: 'cupcake', arrange: 'row' }, name: { ru: 'Пекарня', uk: 'Пекарня', sk: 'Pekáreň', en: 'Bakery' } },
  { id: 'cocktail', bg: '#1f2a44', look: { stamp: 'cocktail', stampColor: '#4fc3f7', reward: 'star', arrange: 'grid' }, name: { ru: 'Коктейль-бар', uk: 'Коктейль-бар', sk: 'Koktailový bar', en: 'Cocktail bar' } },
  { id: 'seasons', bg: '#20252d', look: { season: 'auto', stamp: 'star' }, name: { ru: 'Праздники сами', uk: 'Свята самі', sk: 'Sviatky samy', en: 'Holidays by calendar' } }
];
// Вид карты по стилю: логотип (режим, размер, место) остаётся как был.
function presetLook(id, lang, cur) {
  const p = PRESETS.find(x => x.id === id); if (!p) return null;
  const keep = {}; for (const k of ['logoMode', 'logoSize', 'logoRot', 'logoX', 'logoY', 'logoFlip']) if (cur && cur[k] != null && cur[k] !== '') keep[k] = cur[k];
  return { bg: p.bg, look: { ...p.look, ...(p.label ? { label: p.label[lang] || p.label.en } : {}), ...keep } };
}
// Католическая Пасха (алгоритм Мееуса) — для «по календарю».
function easterDate(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, month - 1, day));
}
// «По календарю»: праздник, если он близко, иначе время года.
function seasonFor(date) {
  const d = date instanceof Date && !isNaN(date) ? date : new Date();
  const m = d.getUTCMonth() + 1, day = d.getUTCDate();
  const ed = easterDate(d.getUTCFullYear()), diff = Math.round((Date.UTC(d.getUTCFullYear(), m - 1, day) - ed.getTime()) / 864e5);
  if ((m === 12 && day >= 28) || (m === 1 && day <= 7)) return 'newyear';
  if (m === 12) return 'xmas';
  if (m === 2 && day >= 7 && day <= 14) return 'valentine';
  if (m === 3 && day <= 8) return 'march8';
  if (diff >= -10 && diff <= 1) return 'easter';
  if (m === 10 && day >= 20) return 'halloween';
  if (m === 12 || m <= 2) return 'winter';
  if (m <= 5) return 'spring';
  if (m <= 8) return 'summer';
  return 'autumn';
}
function resolveSeason(s, date) { return s === 'auto' ? seasonFor(date) : (SEASONS.includes(s) && s !== 'none' ? s : ''); }
function lumOf(hex) { const n = parseInt(String(hex).slice(1), 16); return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; }
function glyph(id, cx, cy, size, color, knock, opacity) {
  const d = (STAMP_ICONS[id] || STAMP_ICONS.check).replace(/%C/g, color).replace(/%K/g, knock || 'none');
  const s = size / 24;
  return `<g transform="translate(${(cx - size / 2).toFixed(1)},${(cy - size / 2).toFixed(1)}) scale(${s.toFixed(4)})"${opacity != null ? ` opacity="${opacity}"` : ''}>${d}</g>`;
}
// Цвет значка на кружке: на светлом — фирменный цвет (если он достаточно тёмный) или почти чёрный, на тёмном — белый.
function inkOn(fill, accent) { return lumOf(fill) > 0.6 ? (lumOf(accent) < 0.5 ? accent : INK) : '#ffffff'; }

// Сезонное оформление: фон-подсветка (glow) и рисунок поверх фона, под штампами.
const SEASON_GLOW = { xmas: ['#d24b2f', '#2f8f5b'], newyear: ['#f4cf5b', '#7c4dff'], winter: ['#8fd3ff', '#ffffff'], valentine: ['#ff4f86', '#ff9eb8'], march8: ['#ff8fb1', '#ffd54a'],
  easter: ['#9be37a', '#ffd27a'], spring: ['#ff9ec4', '#9be37a'], summer: ['#ffd54a', '#2ec5c5'], autumn: ['#ff8a3d', '#c0392b'], halloween: ['#ff7a1a', '#7b3fbf'] };
function snowflakeAt(x, y, s, op) { return glyph('snowflake', x, y, s, '#ffffff', null, op); }
function seasonArt(season) {
  const P = [];
  if (season === 'winter' || season === 'xmas') {
    for (const [x, y, s, o] of [[700, 40, 30, .55], [800, 92, 22, .45], [905, 44, 40, .6], [990, 120, 26, .45], [620, 110, 16, .35], [860, 170, 18, .35], [960, 262, 30, .4], [560, 30, 14, .3]]) P.push(snowflakeAt(x, y, s, o));
    if (season === 'winter') P.push(`<path d="M0 ${H - 26} Q ${W * .2} ${H - 52} ${W * .42} ${H - 30} T ${W * .8} ${H - 34} T ${W} ${H - 40} V ${H} H 0 Z" fill="#ffffff" opacity=".16"/>`);
  } else if (season === 'newyear') {
    const burst = (x, y, r, c, n) => { let o = ''; for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n; o += `<path d="M${(x + Math.cos(a) * r * .35).toFixed(1)} ${(y + Math.sin(a) * r * .35).toFixed(1)} L${(x + Math.cos(a) * r).toFixed(1)} ${(y + Math.sin(a) * r).toFixed(1)}" stroke="${c}" stroke-width="4" stroke-linecap="round"/><circle cx="${(x + Math.cos(a) * r * 1.12).toFixed(1)}" cy="${(y + Math.sin(a) * r * 1.12).toFixed(1)}" r="3.2" fill="${c}"/>`; } return `<g opacity=".75">${o}</g>`; };
    P.push(burst(880, 82, 62, '#f4cf5b', 14), burst(990, 190, 38, '#ff6fa8', 11), burst(730, 46, 30, '#8fd3ff', 10));
    const cols = ['#f4cf5b', '#ff6fa8', '#8fd3ff', '#ffffff'];
    for (let i = 0; i < 22; i++) { const x = 560 + ((i * 197) % 470), y = 18 + ((i * 89) % 300); P.push(`<rect x="${x}" y="${y}" width="${8 + i % 3 * 3}" height="4" rx="2" fill="${cols[i % 4]}" opacity=".55" transform="rotate(${(i * 47) % 180} ${x} ${y})"/>`); }
  } else if (season === 'valentine') {
    for (const [x, y, s, c, o] of [[720, 50, 40, '#ff4f86', .7], [830, 110, 26, '#ff9eb8', .7], [930, 52, 54, '#ff4f86', .8], [1000, 150, 30, '#ffffff', .5], [640, 120, 22, '#ff9eb8', .5], [870, 230, 34, '#ff4f86', .45], [985, 280, 22, '#ff9eb8', .5]]) P.push(glyph('heart', x, y, s, c, null, o));
  } else if (season === 'march8') {
    const tulip = (x, y, s, c) => `<path d="M${x} ${y} q ${-s * .1} ${s * .9} ${s * .05} ${s * 1.6}" stroke="#5aa84a" stroke-width="${s * .09}" fill="none"/><path d="M${x + s * .05} ${y + s * 1.1} q ${s * .45} ${-s * .2} ${s * .5} ${-s * .7} q ${-s * .4} ${s * .1} ${-s * .5} ${s * .7}" fill="#6cc25a"/><path d="M${x - s * .32} ${y - s * .5} q 0 ${s * .55} ${s * .32} ${s * .55} q ${s * .32} 0 ${s * .32} ${-s * .55} l ${-s * .16} ${s * .16} l ${-s * .16} ${-s * .26} l ${-s * .16} ${s * .26} z" fill="${c}"/>`;
    P.push(`<g opacity=".85">${tulip(900, 70, 80, '#ff6fa8')}${tulip(965, 110, 66, '#ffd54a')}${tulip(835, 120, 60, '#ff8fb1')}</g>`);
    for (let i = 0; i < 16; i++) P.push(`<circle cx="${700 + (i * 53) % 300}" cy="${30 + (i * 37) % 90}" r="${4 + i % 3}" fill="#ffd54a" opacity=".6"/>`);
  } else if (season === 'easter') {
    for (const [x, y, s, c, r] of [[880, H - 56, 70, '#ffd27a', -12], [950, H - 50, 62, '#ff9ec4', 10], [1010, H - 62, 56, '#8fd3ff', -6], [820, H - 44, 48, '#9be37a', 14]]) P.push(`<g transform="rotate(${r} ${x} ${y})">${glyph('egg', x, y, s, c, 'rgba(255,255,255,.9)', .95)}</g>`);
    let g = ''; for (let i = 0; i < 40; i++) { const x = 760 + i * 7; g += `<path d="M${x} ${H} q ${3 - i % 5} -${16 + (i * 7) % 18} ${6 - i % 4} -${24 + (i * 5) % 20}" stroke="#5aa84a" stroke-width="3" fill="none"/>`; }
    P.push(`<g opacity=".7">${g}</g>`);
  } else if (season === 'spring') {
    P.push(`<path d="M${W} 10 C 930 40 880 60 790 120 M 905 46 C 900 80 920 100 930 120 M 840 84 C 820 60 800 50 780 46" stroke="#7a5236" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>`);
    for (const [x, y, s, c] of [[990, 22, 34, '#ffc1d9'], [930, 40, 40, '#ff9ec4'], [860, 72, 32, '#ffffff'], [800, 112, 30, '#ffc1d9'], [928, 118, 26, '#ff9ec4'], [780, 44, 24, '#ffffff']]) P.push(glyph('flower', x, y, s, c, '#ffd54a', .9));
  } else if (season === 'summer') {
    let rays = ''; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; rays += `<path d="M${(930 + Math.cos(a) * 62).toFixed(1)} ${(70 + Math.sin(a) * 62).toFixed(1)} L${(930 + Math.cos(a) * 84).toFixed(1)} ${(70 + Math.sin(a) * 84).toFixed(1)}" stroke="#ffd54a" stroke-width="7" stroke-linecap="round"/>`; }
    P.push(`<g opacity=".85"><circle cx="930" cy="70" r="50" fill="#ffd54a"/>${rays}</g>`);
    P.push(`<path d="M0 ${H - 30} q 43 -20 86 0 t 86 0 t 86 0 t 86 0 t 86 0 t 86 0 t 86 0 t 86 0 t 86 0 t 86 0 t 86 0 t 86 0 V ${H} H 0 Z" fill="#2ec5c5" opacity=".28"/><path d="M0 ${H - 14} q 43 -16 86 0 t 86 0 t 86 0 t 86 0 t 86 0 t 86 0 t 86 0 t 86 0 t 86 0 t 86 0 t 86 0 t 86 0 V ${H} H 0 Z" fill="#2ec5c5" opacity=".38"/>`);
  } else if (season === 'autumn') {
    for (const [x, y, s, c, r] of [[700, 40, 34, '#ff8a3d', 20], [800, 100, 28, '#c0392b', -30], [905, 36, 46, '#f4b400', 60], [990, 130, 34, '#ff8a3d', -10], [870, 210, 30, '#c0392b', 40], [990, 260, 26, '#f4b400', 100], [620, 110, 22, '#f4b400', -50]]) P.push(`<g transform="rotate(${r} ${x} ${y})">${glyph('leaf', x, y, s, c, 'rgba(0,0,0,.35)', .85)}</g>`);
  } else if (season === 'halloween') {
    P.push(`<circle cx="940" cy="72" r="46" fill="#ffe9a8" opacity=".9"/><circle cx="925" cy="62" r="8" fill="#e8cf86" opacity=".8"/><circle cx="955" cy="88" r="5" fill="#e8cf86" opacity=".8"/>`);
    const bat = (x, y, s) => `<path d="M${x} ${y} q ${-s * .25} ${-s * .35} ${-s * .55} ${-s * .2} q ${s * .1} ${s * .1} 0 ${s * .25} q ${-s * .15} ${-s * .05} ${-s * .3} ${s * .1} q ${s * .35} ${-s * .05} ${s * .5} ${s * .2} q ${s * .08} ${-s * .16} ${s * .35} ${-s * .2} q ${s * .27} ${s * .04} ${s * .35} ${s * .2} q ${s * .15} ${-s * .25} ${s * .5} ${-s * .2} q ${-s * .15} ${-s * .15} ${-s * .3} ${-s * .1} q ${-s * .1} ${-s * .15} 0 ${-s * .25} q ${-s * .3} ${-s * .15} ${-s * .55} ${s * .2} z" fill="#1b1225"/>`;
    P.push(`<g opacity=".85">${bat(850, 60, 70)}${bat(780, 110, 46)}${bat(1000, 140, 40)}</g>`);
    for (const [x, y, s] of [[920, H - 46, 76], [1000, H - 40, 58], [850, H - 34, 46]]) P.push(glyph('pumpkin', x, y, s, '#ff7a1a', '#1b1225', .95));
  }
  return P.join('');
}
function seasonBack(season) {
  const g = SEASON_GLOW[season]; if (!g) return '';
  return `<defs><radialGradient id="sg1" cx="85%" cy="15%" r="60%"><stop offset="0%" stop-color="${g[0]}" stop-opacity=".34"/><stop offset="100%" stop-color="${g[0]}" stop-opacity="0"/></radialGradient>
    <radialGradient id="sg2" cx="10%" cy="100%" r="55%"><stop offset="0%" stop-color="${g[1]}" stop-opacity=".22"/><stop offset="100%" stop-color="${g[1]}" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#sg1)"/><rect width="${W}" height="${H}" fill="url(#sg2)"/>`;
}

// Штампы значками (2.27): закрашенный — кружок с значком, пустой — пунктир с бледным значком, последний — подарок.
// photo — раскладка «Фото» (штампы внизу баннера); arr — расположение: ряд, дуга, волна, лесенка, гирлянда, два ряда.
function stampsIcons(count, target, accent, T, look, photo, arr, orn) {
  const n = Math.max(1, Number(target) || 1);
  count = clamp(Number(count) || 0, 0, n);
  if (n > 24) return progressLine(count / n, `${count} / ${n}`, n - count > 0 ? T.left(n - count) : T.ready, accent);
  const icon = look.stamp || 'check', reward = look.reward || 'gift';
  const fill = look.stampColor || (photo ? '#ffffff' : accent);
  const ink = inkOn(fill, accent);
  const rewardFill = photo ? accent : '#ffffff';
  const rewardInk = inkOn(rewardFill, accent);
  let out = '';
  const one = (cx, cy, size, i) => {
    const r = size / 2, last = i === n - 1, on = i < count;
    cx = +cx.toFixed(1); cy = +cy.toFixed(1);
    if (last) {
      out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${rewardFill}"${on ? '' : ' opacity=".95"'}/>`;
      if (on) out += `<circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="none" stroke="#ffffff" stroke-width="3" opacity=".8"/>`;
      out += glyph(reward, cx, cy, size * 0.6, rewardInk, rewardFill);
    } else if (on) {
      out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>` + glyph(icon, cx, cy, size * 0.6, ink, fill);
    } else {
      out += `<circle cx="${cx}" cy="${cy}" r="${r - 2}" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.62)" stroke-width="3" stroke-dasharray="7 6"/>` + glyph(icon, cx, cy, size * 0.54, '#ffffff', null, 0.32);
    }
  };
  const caption = n - count > 0 ? T.left(n - count) : T.ready.replace('🎁 ', '');
  const capAt = (y) => { if (!photo) out += `<text x="48" y="${y}" font-family="Carlito" font-weight="600" font-size="28" fill="${MUTED}">${esc(caption)}</text>`; };
  if (arr === 'garland' && n <= 12) {
    // гирлянда: верёвка провисает дугой, штампы висят на нитках, справа — бант (на Рождество — ёлочные шары)
    const P0 = [-20, H - 172], P1 = [W * 0.45, H - 72], P2 = [W - 70, H - 212];
    const at = (t) => [(1 - t) * (1 - t) * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0], (1 - t) * (1 - t) * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1]];
    out += `<path d="M${P0[0]} ${P0[1]} Q ${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}" fill="none" stroke="#f5efe0" stroke-width="5" stroke-linecap="round"/>`;
    const bx = P2[0] + 6, by = P2[1] - 4;
    out += `<g fill="none" stroke="#f5efe0" stroke-width="5" stroke-linecap="round"><path d="M${bx} ${by} c -40 -46 -66 -6 -40 10 c 14 8 30 0 40 -10 z"/><path d="M${bx} ${by} c 40 -46 66 -6 40 10 c -14 8 -30 0 -40 -10 z"/><path d="M${bx} ${by} l -20 34 M${bx} ${by} l 18 36"/></g>`;
    const size = Math.min(70, (W - 160) / n - 12);
    for (let i = 0; i < n; i++) {
      const t = 0.09 + (i / Math.max(1, n - 1)) * 0.83;
      const [x, y] = at(t);
      const drop = 18 + (i % 2) * 10;
      out += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} v ${drop}" stroke="#f5efe0" stroke-width="2.5"/>`;
      const cy = y + drop + size / 2;
      if (i === n - 1 || !orn) { one(x, cy, i === n - 1 ? size * 1.05 : size, i); continue; }
      if (i < count) {
        const c = look.stampColor || '#d24b2f';
        out += `<rect x="${(x - size * 0.12).toFixed(1)}" y="${(cy - size / 2 - 6).toFixed(1)}" width="${(size * 0.24).toFixed(1)}" height="9" rx="2" fill="#e8d9b0"/>`;
        out += `<circle cx="${x.toFixed(1)}" cy="${cy.toFixed(1)}" r="${size / 2}" fill="${c}"/><circle cx="${(x - size * 0.17).toFixed(1)}" cy="${(cy - size * 0.17).toFixed(1)}" r="${size * 0.1}" fill="#ffffff" opacity=".55"/>`;
        if (look.stamp && look.stamp !== 'check' && look.stamp !== 'ornament') out += glyph(look.stamp, x, cy + 2, size * 0.46, inkOn(c, accent), c, 0.9);
      } else {
        out += `<circle cx="${x.toFixed(1)}" cy="${cy.toFixed(1)}" r="${size / 2 - 2}" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.7)" stroke-width="3" stroke-dasharray="7 6"/>`;
      }
    }
    return out;
  }
  // дуга, волна, лесенка — одной линией (до 12 штампов)
  if (['arc', 'wave', 'steps'].includes(arr) && n <= 12) {
    const size = Math.min(photo ? 72 : 64, (W - 96 - 12 * (n - 1)) / n);
    const gap = n > 1 ? Math.min(photo ? 64 : 56, (W - 96 - n * size) / (n - 1)) : 0;   // кривая на всю ширину
    const rowW = n * size + gap * (n - 1), left = photo ? (W - rowW) / 2 : 48;
    const A = arr === 'arc' ? 44 : arr === 'wave' ? 28 : 36;
    const cy0 = photo ? H - 30 - size / 2 - (arr === 'arc' ? 0 : A) : 196;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const dy = arr === 'arc' ? -A * Math.sin(Math.PI * t) : arr === 'wave' ? A * Math.sin(Math.PI * 2 * t) : A * (1 - 2 * t);
      one(left + i * (size + gap) + size / 2, cy0 + dy, size, i);
    }
    capAt(318);
    return out;
  }
  const rows = arr === 'grid' && n >= 4 ? 2 : n <= 10 ? 1 : 2;
  const perRow = Math.ceil(n / rows);
  const gap = photo ? 18 : 14;
  const size = Math.min(photo ? (rows === 1 ? 76 : 58) : (rows === 1 ? 64 : 56), (W - 96 - gap * (perRow - 1)) / perRow);
  const rowW = perRow * size + gap * (perRow - 1);
  const left = photo ? (W - rowW) / 2 : 48;
  const top = photo ? H - 34 - rows * size - (rows - 1) * 12 : (rows === 1 ? 132 : 104);
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / perRow), c = i % perRow;
    one(left + c * (size + gap) + size / 2, top + r * (size + 12) + size / 2, size, i);
  }
  capAt(Math.min(H - 12, top + rows * size + (rows - 1) * 12 + 42));
  return out;
}

// Логотип на баннере (2.27): только логотип, логотип + название или как раньше (значок вида бизнеса + название).
// Размер, поворот, отражение и место задаёт владелец; картинка — логотип карты в Wallet.
function logoBlock(look, img) {
  const s = look.logoSize || 72;
  const x = look.logoX != null ? look.logoX : 48 + s / 2, y = look.logoY != null ? look.logoY : 62;
  const tr = `translate(${x} ${y})${look.logoRot ? ` rotate(${look.logoRot})` : ''}${look.logoFlip ? ' scale(-1 1)' : ''}`;
  return { svg: `<g transform="${tr}"><image x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" preserveAspectRatio="xMidYMid meet" href="${img}" xlink:href="${img}"/></g>`, right: x + s / 2 };
}

function buildHeroSvg({ card, brand, niche, lang, bgImage, showProgress, now }) {
  const T = TXT[lang] || TXT.ru;
  const accent = /^#[0-9a-fA-F]{6}$/.test(brand.color || '') ? brand.color : '#d4a24a';
  // 2.27: значок штампа, раскладка «Фото», расположение штампов, логотип и сезонное оформление
  const look = cleanLook(brand);
  const season = resolveSeason(look.season, now);
  const photoLay = look.layout === 'photo';
  const arr = look.arrange || (season === 'xmas' ? 'garland' : 'row');
  const iconMode = !!(look.stamp || look.reward || look.stampColor || photoLay || season === 'xmas' || look.arrange);
  const art = season ? seasonArt(season) : '';
  const logoImg = look.logoMode && /^data:image\/(png|jpeg);base64,/.test(String(brand.logoImage || '')) ? brand.logoImage : '';
  const lm = logoImg ? look.logoMode : 'name';
  const L = logoImg ? logoBlock(look, logoImg) : null;
  const name = String(brand.name || 'Loya').slice(0, 32);
  const nameW = Math.min(560, textWidth(name, 34));
  const pill = card.type === 'gift' ? T.gift : card.type === 'discount' ? T.discount : card.type === 'spend' ? T.spend : T.stamp;
  const pillW = textWidth(pill, 22) + 36;
  // 2.25: «скидка + штампы» — пилюля со скидкой рядом с типом карты; уровень гостя — в правом верхнем углу.
  const cpct = comboPct(card);
  const extra = (pillX, withPct) => {
    let o = '';
    if (cpct && withPct) { const x = pillX + pillW + 10, w = textWidth('−' + cpct + '%', 24) + 34; o += `<rect x="${x}" y="38" width="${w}" height="44" rx="22" fill="${accent}"/><text x="${x + w / 2}" y="68" font-family="Carlito" font-weight="700" font-size="24" fill="${INK}" text-anchor="middle">−${cpct}%</text>`; }
    const tn = tierName(card.tier);
    if (tn) { const col = card.tier === 'gold' ? '#f4cf5b' : card.tier === 'silver' ? '#d7dde5' : 'rgba(255,255,255,.75)'; const w = textWidth(tn, 22) + 40; o += `<rect x="${W - 48 - w}" y="38" width="${w}" height="44" rx="22" fill="none" stroke="${col}" stroke-width="3"/><text x="${W - 48 - w / 2}" y="67" font-family="Carlito" font-weight="700" font-size="22" fill="${col}" text-anchor="middle" letter-spacing="2">${tn}</text>`; }
    return o;
  };
  // Шапка баннера: значок + название + тип карты (как раньше), логотип + название или только логотип.
  const head = (onPhoto) => {
    if (lm === 'logo') return L.svg + extra(0, false);
    const nameX = lm === 'both' ? L.right + 16 : onPhoto ? 48 : 102;
    const pillX = nameX + nameW + 16;
    return (lm === 'both' ? L.svg : onPhoto ? '' : `<g>${iconSvg(niche, 48, 44, 32, 1).replace(/#fff/g, accent)}</g>`) +
      `<text x="${nameX}" y="71" font-family="Carlito" font-weight="700" font-size="34" fill="#ffffff">${esc(name)}</text>
      <rect x="${pillX}" y="38" width="${pillW}" height="44" rx="22" fill="rgba(255,255,255,${onPhoto ? '.16' : '.12'})"/>
      <text x="${pillX + pillW / 2}" y="67" font-family="Carlito" font-weight="700" font-size="22" fill="#f1f1f1" text-anchor="middle">${esc(pill)}</text>` + extra(pillX, true);
  };

  let body = '';
  if (card.type === 'gift') {
    body = `<text x="48" y="228" font-family="Carlito" font-weight="700" font-size="104" fill="${accent}" letter-spacing="-1">${esc(moneyFmt(Number(card.gift_balance) || 0, brand.currency, lang))}</text>
      <text x="52" y="282" font-family="Carlito" font-weight="600" font-size="28" fill="${MUTED}">${esc(T.balance)}</text>`;
  } else if (card.type === 'discount') {
    body = `<text x="48" y="228" font-family="Carlito" font-weight="700" font-size="112" fill="${accent}" letter-spacing="-2">−${Number(card.discount_percent) || 0}%</text>
      <text x="52" y="282" font-family="Carlito" font-weight="600" font-size="28" fill="${MUTED}">${esc(T.every)}</text>`;
  } else if (card.type === 'spend') {
    const target = Number(card.spend_target) || 0, acc = Number(card.spend_accumulated) || 0;
    if (target > 0) {
      const left = Math.max(0, target - acc);
      const bonus = Math.max(0, Math.round(Number(card.bonus_balance) || 0));
      const cap = left > 0 ? T.toBonus(moneyFmt(left, brand.currency, lang)) : T.ready.replace('🎁 ', '');
      body = progressLine(acc / target, `${moneyFmt(acc, brand.currency, lang)} / ${moneyFmt(target, brand.currency, lang)}`,
        bonus > 0 ? `${T.bonusN(bonus)} · ${cap}` : cap, accent);
    } else {
      body = `<text x="48" y="228" font-family="Carlito" font-weight="700" font-size="96" fill="${accent}">${esc(moneyFmt(acc, brand.currency, lang))}</text>
        <text x="52" y="282" font-family="Carlito" font-weight="600" font-size="28" fill="${MUTED}">${esc(T.saved)}</text>`;
    }
  } else {
    body = iconMode ? stampsIcons(card.stamp_count, card.stamp_target || 10, accent, T, look, photoLay, arr, season === 'xmas') : stampsBlock(card.stamp_count, card.stamp_target || 10, accent, T);
  }
  // В раскладке «Фото» (и на гирлянде поверх фото) на баннере только штампы — название уже есть в шапке карты;
  // свой логотип при этом остаётся, если владелец его включил.
  const bare = card.type === 'stamp' && (photoLay || arr === 'garland');
  const bareHead = L ? L.svg : '';

  // Своя картинка заведения: на всю ширину баннера; если поверх показываем штампы —
  // слева затемнение, чтобы текст и кружки читались на любой фотографии.
  if (bgImage && /^data:image\/(png|jpeg);base64,/.test(bgImage)) {
    const overlay = showProgress === false ? art + bareHead : bare ? `<defs><linearGradient id="shadeB" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0b0e13" stop-opacity=".05"/><stop offset="55%" stop-color="#0b0e13" stop-opacity=".25"/><stop offset="100%" stop-color="#0b0e13" stop-opacity=".62"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#shadeB)"/>${art}${bareHead}${body}` : `<defs><linearGradient id="shadeL" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0b0e13" stop-opacity=".86"/><stop offset="55%" stop-color="#0b0e13" stop-opacity=".55"/><stop offset="100%" stop-color="#0b0e13" stop-opacity=".1"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#shadeL)"/>${art}
      ${head(true)}
      ${body}`;
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="${W}" height="${H}" fill="#181c23"/>
  <image x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" href="${bgImage}" xlink:href="${bgImage}"/>
  ${overlay}
</svg>`;
  }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#383e47"/><stop offset="55%" stop-color="#232830"/><stop offset="100%" stop-color="#181c23"/>
    </linearGradient>
    <radialGradient id="glow" cx="92%" cy="0%" r="75%">
      <stop offset="0%" stop-color="${accent}" stop-opacity=".32"/><stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${season ? seasonBack(season) : ''}
  ${season || lm !== 'name' ? '' : iconSvg(niche, W - 250, 60, 230, 0.05)}
  ${art}
  ${head(false)}
  ${body}
</svg>`;
}


// ---------- 2.25: «скидка + штампы», уровень и «до следующего уровня» ----------
const NEXT = {
  ru: { h: (t) => `До ${t}`, v: (n) => `ещё ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'визит' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'визита' : 'визитов'}` },
  uk: { h: (t) => `До ${t}`, v: (n) => `ще ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'візит' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'візити' : 'візитів'}` },
  sk: { h: (t) => `Do ${t}`, v: (n) => `ešte ${n} ${n === 1 ? 'návšteva' : n < 5 ? 'návštevy' : 'návštev'}` },
  en: { h: (t) => `To ${t}`, v: (n) => `${n} more visit${n === 1 ? '' : 's'}` }
};
function tierName(t) { return t === 'gold' ? 'GOLD' : t === 'silver' ? 'SILVER' : t === 'basic' ? 'BASIC' : ''; }
function nextLine(card, lang) {
  const n = Math.round(Number(card.tier_next_left) || 0); const t = card.tier_next;
  if (!(n > 0) || !['silver', 'gold'].includes(t)) return null;
  const N = NEXT[lang] || NEXT.en;
  return { header: N.h(tierName(t)), body: N.v(n) };
}
// Скидка на штамп-карте («скидка + штампы»): процент > 0 у карты типа stamp.
function comboPct(card) { return card.type === 'stamp' && Number(card.discount_percent) > 0 ? Math.round(Number(card.discount_percent)) : 0; }

// Что написано на карте Google Wallet (заголовки и строки) — то же для превью в программе.
function passModel(card, brand, lang) {
  lang = TEXT[lang] ? lang : 'en';
  const T = TEXT[lang];
  const p = progress(card, lang, brand.currency, cleanLook(brand).label);
  const typeName = card.type === 'gift' ? T.gift : card.type === 'discount' ? T.discount : card.type === 'spend' ? T.spend : T.stamp;
  const tier = tierLabel(card.tier);
  const nx = nextLine(card, lang);
  const pct = comboPct(card);
  const modules = [{ id: 'progress', header: p.header, body: p.body }]
    .concat(pct ? [{ id: 'discount', header: T.hDiscount, body: `-${pct}%` }] : [])
    .concat(p.bonus ? [{ id: 'bonus', header: p.bonus.header, body: p.bonus.body }] : [])
    .concat(tier ? [{ id: 'tier', header: T.hTier, body: tier }] : [])
    .concat(nx ? [{ id: 'next', header: nx.header, body: nx.body }] : [])
    .concat(p.rule ? [{ id: 'rule', header: p.rule.header, body: p.rule.body }] : []);
  return { lang, cardTitle: String(brand.name || 'Loya').slice(0, 60), subheader: String(card.title || typeName).slice(0, 60), header: String(card.client_name || typeName).slice(0, 60), typeName, modules, tier, next: nx, pct, progress: p };
}

return { TEXT, CUR, progress, tierLabel, tierName, nextLine, comboPct, passModel, buildHeroSvg, TXT, cleanLook, resolveSeason, seasonFor, STAMP_ICONS, STAMP_IDS, SEASONS, ARRANGES, PRESETS, presetLook, glyph };
}
// Сервер: module.exports (+ CLIENT_JS — тот же код для страниц, например для превью в админке). Программа: window.LoyaCard.
if (typeof module !== 'undefined' && module.exports) { module.exports = loyaCardFactory(); module.exports.CLIENT_JS = 'window.LoyaCard=(' + loyaCardFactory.toString() + ')();'; }
else if (typeof window !== 'undefined') window.LoyaCard = loyaCardFactory();

}, {}, "/app/src/card-model.js"];
__defs[48] = [function(module, exports, require, __filename, __dirname){
// Android: планшет/телефон сам является кассой — сервер для «телефона-сканера по Wi-Fi» не нужен.
// Оставляем тот же интерфейс, чтобы код программы с ПК работал без изменений.
'use strict';
function startLocalServer() {
  return {
    getPairingInfo: () => ({ url: '', key: '', unavailable: 'android' }),
    getRegisterInfo: () => ({ url: '', unavailable: 'android' }),
    getScanInfo: () => ({ url: '', key: '', unavailable: 'android' }),
    stop() {}
  };
}
module.exports = { startLocalServer };

}, {}, "/app/shims/local-api-server.js"];
__defs[49] = [function(module, exports, require, __filename, __dirname){
'use strict';
const no = () => { throw new Error('child_process is not available on Android'); };
module.exports = { execFileSync: no, execSync: no, spawn: no, exec: no, execFile: no };

}, {}, "/app/shims/child_process.js"];
__defs[50] = [function(module, exports, require, __filename, __dirname){
// os для Android-версии
'use strict';
module.exports = {
  hostname: () => (globalThis.__LOYA_DEVICE_NAME || 'Android'),
  tmpdir: () => '/tmp', homedir: () => '/loya', platform: () => 'android', type: () => 'Android', release: () => '',
  networkInterfaces: () => ({}), cpus: () => [{ model: (typeof navigator !== 'undefined' && navigator.userAgent) || 'android' }], EOL: '\n', arch: () => 'arm64'
};

}, {}, "/app/shims/os.js"];
__defs[51] = [function(module, exports, require, __filename, __dirname){
// xlsx-lite.js — чтение таблиц Excel (.xlsx) без сторонних библиотек: для импорта клиентов.
// .xlsx — это zip с XML внутри. Берём первый лист, общие строки (sharedStrings) и форматы дат (styles),
// и отдаём то же, что Database.parseCsvText: { headers, rows } — дальше всё как с CSV.
// Распаковка: на ПК — zlib (Node), в Android-версии — DecompressionStream браузера.
'use strict';

async function inflateRaw(buf) {
  try {
    const z = require('zlib');
    if (z && typeof z.inflateRawSync === 'function') return z.inflateRawSync(buf);
  } catch (e) { /* нет zlib — ниже */ }
  if (typeof DecompressionStream === 'function') {
    const ds = new DecompressionStream('deflate-raw');
    const out = new Response(new Blob([buf]).stream().pipeThrough(ds));
    return Buffer.from(new Uint8Array(await out.arrayBuffer()));
  }
  throw new Error('no_inflate');
}

// Оглавление zip (central directory) → { имя: { method, size, offset } }
function zipEntries(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('not_zip');
  const count = buf.readUInt16LE(eocd + 10), dirOff = buf.readUInt32LE(eocd + 16);
  const out = {};
  let p = dirOff;
  for (let n = 0; n < count && p + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    out[buf.slice(p + 46, p + 46 + nl).toString('utf8')] = { method, csize, off };
    p += 46 + nl + el + cl;
  }
  return out;
}
async function zipRead(buf, entries, name) {
  const e = entries[name]; if (!e) return null;
  if (buf.readUInt32LE(e.off) !== 0x04034b50) throw new Error('bad_zip');
  const start = e.off + 30 + buf.readUInt16LE(e.off + 26) + buf.readUInt16LE(e.off + 28);
  const data = buf.slice(start, start + e.csize);
  if (e.method === 0) return data.toString('utf8');
  if (e.method === 8) return (await inflateRaw(data)).toString('utf8');
  throw new Error('zip_method');
}

const unxml = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d))).replace(/&amp;/g, '&');
const texts = (xml) => { const out = []; const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g; let m; while ((m = re.exec(xml))) out.push(unxml(m[1] || '')); return out.join(''); };
const colIndex = (ref) => { const m = /^([A-Z]+)/.exec(ref || ''); if (!m) return -1; let n = 0; for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };

// Какие стили ячеек — даты (встроенные форматы 14–22, 45–47 и свои с d/m/y)
function dateStyles(stylesXml) {
  const dates = new Set();
  if (!stylesXml) return dates;
  const custom = {};
  for (const m of stylesXml.matchAll(/<numFmt\b[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) custom[m[1]] = unxml(m[2]);
  const xfs = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(stylesXml);
  if (!xfs) return dates;
  let i = 0;
  for (const m of xfs[1].matchAll(/<xf\b([^>]*?)\/?>/g)) {
    const id = Number((/numFmtId="(\d+)"/.exec(m[1]) || [])[1] || 0);
    const code = custom[id] || '';
    if ((id >= 14 && id <= 22) || (id >= 45 && id <= 47) || (code && /[dmy]/i.test(code.replace(/\[[^\]]*\]|"[^"]*"/g, '')) && !/^[#0.,%\s]+$/.test(code))) dates.add(i);
    i++;
  }
  return dates;
}
function serialToDate(v) {
  const n = Number(v); if (!Number.isFinite(n) || n < 1 || n > 80000) return String(v);
  const d = new Date(Math.round((n - 25569) * 86400000));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

async function readXlsx(buf) {
  if (!buf || buf.length < 22 || buf.readUInt32LE(0) !== 0x04034b50) throw new Error('not_xlsx');
  const E = zipEntries(buf);
  // первый лист книги: workbook.xml → rels → путь к листу
  let sheetPath = 'xl/worksheets/sheet1.xml';
  try {
    const wb = await zipRead(buf, E, 'xl/workbook.xml'), rels = await zipRead(buf, E, 'xl/_rels/workbook.xml.rels');
    const rid = wb && (/<sheet\b[^>]*r:id="([^"]+)"/.exec(wb) || [])[1];
    const tg = rid && rels && (new RegExp(`<Relationship\\b[^>]*Id="${rid}"[^>]*Target="([^"]+)"`).exec(rels) || new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${rid}"`).exec(rels) || [])[1];
    if (tg) sheetPath = tg.startsWith('/') ? tg.slice(1) : 'xl/' + tg.replace(/^\.\//, '');
  } catch (e) { /* берём sheet1 */ }
  const sheet = await zipRead(buf, E, sheetPath);
  if (!sheet) throw new Error('no_sheet');
  const ssXml = await zipRead(buf, E, 'xl/sharedStrings.xml');
  const shared = ssXml ? [...ssXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m => texts(m[1])) : [];
  const dates = dateStyles(await zipRead(buf, E, 'xl/styles.xml'));
  const rows = [];
  for (const rm of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1], inner = cm[2] || '';
      const ci = colIndex((/\br="([A-Z]+\d+)"/.exec(attrs) || [])[1]); const col = ci >= 0 ? ci : row.length;
      const type = (/\bt="([^"]+)"/.exec(attrs) || [])[1] || 'n', style = Number((/\bs="(\d+)"/.exec(attrs) || [])[1] || -1);
      const v = (/<v>([\s\S]*?)<\/v>/.exec(inner) || [])[1];
      let val = '';
      if (type === 's') val = shared[Number(v)] || '';
      else if (type === 'inlineStr') val = texts(inner);
      else if (type === 'b') val = v === '1' ? '1' : '0';
      else if (v != null) val = type === 'n' && dates.has(style) ? serialToDate(v) : unxml(v);
      while (row.length < col) row.push('');
      row[col] = String(val).trim();
    }
    if (row.some(x => x !== '')) rows.push(row);
  }
  const width = Math.max(0, ...rows.map(r => r.length));
  const norm = rows.map(r => { const x = r.slice(); while (x.length < width) x.push(''); return x; });
  return { headers: norm[0] || [], rows: norm.slice(1) };
}

module.exports = { readXlsx };

}, {"zlib":49}, "/app/pc-app/xlsx-lite.js"];
__defs[52] = [function(module, exports, require, __filename, __dirname){
// grow.js — Loya 2.20: «Приведи друга», отзыв после визита, онлайн-запись, касса Dotykačka и импорт чеков из CSV.
// Подключается из main.js: require('./grow')(ctx). Всё, что нужно от главного процесса, приходит в ctx.
'use strict';
const crypto = require('crypto');

module.exports = function initGrow(ctx) {
  const { ipcMain, API, post, notice, deliverToClient, getBrandContext, escHtml, mailReady, Database, writeCrashLog, publishOnlineProfile, posReceipt, dialog, fs, shell } = ctx;
  const db = () => ctx.db();
  const win = () => ctx.mainWindow();
  const L4 = ['ru', 'uk', 'sk', 'en'];
  const langOf = (c, s) => L4.includes(c && c.preferred_language) ? c.preferred_language : (L4.includes(s.app_language) ? s.app_language : 'ru');
  const locale = (lang) => ({ ru: 'ru-RU', uk: 'uk-UA', sk: 'sk-SK', en: 'en-GB' }[lang] || 'ru-RU');
  const hm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const toMin = (t) => { const x = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return x ? Math.min(1439, Number(x[1]) * 60 + Number(x[2])) : null; };
  const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (date, n) => { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + n); return localDate(d); };
  const changed = () => { const w = win(); if (w && !w.isDestroyed()) w.webContents.send('remote-data-changed'); };
  const plural = (lang, n, forms) => { if (lang === 'en') return n === 1 ? forms[0] : forms[1]; if (lang === 'sk') return n === 1 ? forms[0] : n >= 2 && n <= 4 ? forms[1] : forms[2]; const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? forms[0] : a >= 2 && a <= 4 && (b < 12 || b > 14) ? forms[1] : forms[2]; };
  const GIFT_WORD = {
    ru: { stamps: ['штамп', 'штампа', 'штампов'], bonus: ['бонус', 'бонуса', 'бонусов'] },
    uk: { stamps: ['штамп', 'штампи', 'штампів'], bonus: ['бонус', 'бонуси', 'бонусів'] },
    sk: { stamps: ['pečiatka', 'pečiatky', 'pečiatok'], bonus: ['bod', 'body', 'bodov'] },
    en: { stamps: ['stamp', 'stamps'], bonus: ['bonus point', 'bonus points'] }
  };
  // «+2 штампа» — для штамп-карты, «+2 бонуса» — для накопительной (по типу карты, которую выдаёт заведение).
  function giftText(n, lang, kind) {
    const s = db().getSettings();
    const k = kind || (s.selfreg_card_type === 'spend' ? 'bonus' : 'stamps');
    const W = (GIFT_WORD[lang] || GIFT_WORD.ru)[k];
    return `+${n} ${plural(lang, n, W)}`;
  }

  // =================== «Приведи друга» ===================
  // Ссылка-приглашение: страница регистрации на сайте (онлайн-саморегистрация /j/… или акция по ссылке /r/…) + личный код.
  function inviteBase() {
    const s = db().getSettings();
    if (!s.online_url) return '';
    if (s.selfreg_mode === 'online') return String(s.online_url).replace('/r/', '/j/');
    if (s.online_reg_enabled === '1') return String(s.online_url);
    return '';
  }
  function inviteUrl(clientId) {
    const s = db().getSettings();
    if (s.referral_enabled !== '1' || !clientId) return '';
    const base = inviteBase();
    if (!base) return '';
    const code = db().refCodeFor(clientId);
    return code ? `${base}?ref=${code}` : '';
  }
  const INVITE_TEXT = {
    ru: { s: (b) => `Приведите друга — подарок вам обоим 🤝 — ${b}`, h: (n, b, f, r, url) => `<p>Здравствуйте, ${n}!</p><p>Поделитесь этой ссылкой с другом: при регистрации в <b>${b}</b> он получит <b>${f}</b>, а вы — <b>${r}</b> после его первого визита.</p><p><a href="${url}">${url}</a></p>`, line: (f, r, url) => `<p>🤝 Приведите друга: ему — ${f} при регистрации, вам — ${r} после его первого визита. Ваша ссылка: <a href="${url}">${url}</a></p>` },
    uk: { s: (b) => `Запросіть друга — подарунок вам обом 🤝 — ${b}`, h: (n, b, f, r, url) => `<p>Вітаємо, ${n}!</p><p>Поділіться цим посиланням із другом: під час реєстрації в <b>${b}</b> він отримає <b>${f}</b>, а ви — <b>${r}</b> після його першого візиту.</p><p><a href="${url}">${url}</a></p>`, line: (f, r, url) => `<p>🤝 Запросіть друга: йому — ${f} під час реєстрації, вам — ${r} після його першого візиту. Ваше посилання: <a href="${url}">${url}</a></p>` },
    sk: { s: (b) => `Pozvite priateľa — darček pre vás oboch 🤝 — ${b}`, h: (n, b, f, r, url) => `<p>Dobrý deň, ${n}!</p><p>Pošlite tento odkaz priateľovi: pri registrácii v <b>${b}</b> dostane <b>${f}</b> a vy <b>${r}</b> po jeho prvej návšteve.</p><p><a href="${url}">${url}</a></p>`, line: (f, r, url) => `<p>🤝 Pozvite priateľa: on dostane ${f} pri registrácii, vy ${r} po jeho prvej návšteve. Váš odkaz: <a href="${url}">${url}</a></p>` },
    en: { s: (b) => `Invite a friend — a gift for you both 🤝 — ${b}`, h: (n, b, f, r, url) => `<p>Hello ${n}!</p><p>Share this link with a friend: when they sign up at <b>${b}</b> they get <b>${f}</b>, and you get <b>${r}</b> after their first visit.</p><p><a href="${url}">${url}</a></p>`, line: (f, r, url) => `<p>🤝 Invite a friend: they get ${f} on sign-up, you get ${r} after their first visit. Your link: <a href="${url}">${url}</a></p>` }
  };
  const REF_TEXT = {
    ru: { s: (b) => `Спасибо за друга! 🤝 — ${b}`, h: (n, friend, what) => `<p>Здравствуйте, ${n}!</p><p>${friend} пришёл(ла) к нам по вашему приглашению. На вашу карту начислено: <b>${what}</b>. Спасибо, что рекомендуете нас 💛</p>` },
    uk: { s: (b) => `Дякуємо за друга! 🤝 — ${b}`, h: (n, friend, what) => `<p>Вітаємо, ${n}!</p><p>${friend} прийшов(ла) до нас за вашим запрошенням. На вашу картку нараховано: <b>${what}</b>. Дякуємо, що рекомендуєте нас 💛</p>` },
    sk: { s: (b) => `Ďakujeme za priateľa! 🤝 — ${b}`, h: (n, friend, what) => `<p>Dobrý deň, ${n}!</p><p>${friend} k nám prišiel(-la) na vaše pozvanie. Na vašu kartu sme pripísali: <b>${what}</b>. Ďakujeme, že nás odporúčate 💛</p>` },
    en: { s: (b) => `Thanks for the referral! 🤝 — ${b}`, h: (n, friend, what) => `<p>Hello ${n}!</p><p>${friend} came in on your invitation. We’ve added <b>${what}</b> to your card. Thank you for recommending us 💛</p>` }
  };
  function refGifts(lang) { const cfg = db().refConfig(); return { friend: cfg.friend > 0 ? giftText(cfg.friend, lang) : '', referrer: cfg.referrer > 0 ? giftText(cfg.referrer, lang) : '' }; }
  // Строка-приглашение для писем гостю (приветствие и т.п.): пусто, если «Приведи друга» выключено или нет ссылки.
  function inviteHtml(c, lang) {
    const url = c && inviteUrl(c.id);
    if (!url) return '';
    const g = refGifts(lang);
    return (INVITE_TEXT[lang] || INVITE_TEXT.ru).line(escHtml(g.friend || '🎁'), escHtml(g.referrer || '🎁'), escHtml(url));
  }
  // Друг пришёл впервые — пригласившему начислена награда: сообщение ему и колокольчик владельцу.
  function onReferralReward(info) {
    try {
      notice('ref', { name: info.referrerName, friend: info.friendName });
      const c = db().getClientsByIds ? db().getClientsByIds([info.referrerId])[0] : db().getClient(info.referrerId);
      if (!c || !info.gift || !info.gift.n) return;
      const s = db().getSettings(); const lang = langOf(c, s); const T = REF_TEXT[lang] || REF_TEXT.ru;
      const what = giftText(info.gift.n, lang, info.gift.kind);
      const ch = s.auto_channels === 'email' ? ['email'] : s.auto_channels === 'telegram' ? ['telegram'] : ['email', 'telegram'];
      deliverToClient(c, { channels: ch, subject: T.s(getBrandContext(lang).brandName), html: T.h(escHtml(c.name), escHtml(info.friendName || ''), escHtml(what)), lang, logSubject: 'referral:reward', marketing: false, unsubscribe: true }).catch(() => {});
    } catch (e) { writeCrashLog('referralReward', e); }
  }
  // Вызывается из main.js сразу после открытия базы.
  function attach() { db().onReferralReward = onReferralReward; }
  ipcMain.handle('ref:info', (e, clientId) => {
    const s = db().getSettings(); const cfg = db().refConfig(s); const lang = L4.includes(s.app_language) ? s.app_language : 'ru';
    const url = inviteUrl(clientId);
    return { enabled: cfg.on, cfg, url, code: url ? db().refCodeFor(clientId) : '', baseAvailable: !!inviteBase(), hasLicense: !!s.license_key, friendText: cfg.friend ? giftText(cfg.friend, lang) : '', referrerText: cfg.referrer ? giftText(cfg.referrer, lang) : '', list: clientId ? db().referralsOf(clientId) : [] };
  });
  ipcMain.handle('ref:send', async (e, clientId) => {
    const c = db().getClient(clientId); const url = inviteUrl(clientId);
    if (!c) return { error: 'not_found' }; if (!url) return { error: 'no_link' };
    const s = db().getSettings(); const lang = langOf(c, s); const T = INVITE_TEXT[lang] || INVITE_TEXT.ru; const g = refGifts(lang);
    const out = await deliverToClient(c, { channels: ['email', 'telegram'], subject: T.s(getBrandContext(lang).brandName), html: T.h(escHtml(c.name), escHtml(getBrandContext(lang).brandName), escHtml(g.friend || '🎁'), escHtml(g.referrer || '🎁'), escHtml(url)), lang, logSubject: 'referral:invite', marketing: false });
    return { ok: out.email === 'sent' || out.telegram === 'sent', ...out };
  });
  ipcMain.handle('profile:republish', async () => { const s = db().getSettings(); if (!s.license_key) return { error: 'need_license' }; return publishOnlineProfile(); });

  // =================== Отзыв после визита ===================
  const FB_TEXT = {
    ru: { s: (b) => `Как вам у нас? ⭐ — ${b}`, h: (n, e, b) => `<p>Здравствуйте, ${n}!</p><p>Спасибо, что были в ${e} <b>${b}</b>. Оцените визит одним нажатием — это займёт секунду:</p>`, foot: 'Вашу оценку видит владелец заведения.', tg: (n, b) => `${n}, спасибо, что были в ${b}! Как вам у нас? Нажмите на оценку 👇` },
    uk: { s: (b) => `Як вам у нас? ⭐ — ${b}`, h: (n, e, b) => `<p>Вітаємо, ${n}!</p><p>Дякуємо, що завітали до ${e} <b>${b}</b>. Оцініть візит одним натисканням — це займе секунду:</p>`, foot: 'Вашу оцінку бачить власник закладу.', tg: (n, b) => `${n}, дякуємо, що завітали до ${b}! Як вам у нас? Натисніть на оцінку 👇` },
    sk: { s: (b) => `Ako sa vám u nás páčilo? ⭐ — ${b}`, h: (n, e, b) => `<p>Dobrý deň, ${n}!</p><p>Ďakujeme, že ste navštívili ${e} <b>${b}</b>. Ohodnoťte návštevu jedným kliknutím — zaberie to sekundu:</p>`, foot: 'Vaše hodnotenie vidí majiteľ prevádzky.', tg: (n, b) => `${n}, ďakujeme za návštevu v ${b}! Ako sa vám páčilo? Kliknite na hodnotenie 👇` },
    en: { s: (b) => `How was your visit? ⭐ — ${b}`, h: (n, e, b) => `<p>Hello ${n}!</p><p>Thanks for visiting ${e} <b>${b}</b>. Rate your visit with one tap — it takes a second:</p>`, foot: 'Your rating goes to the owner.', tg: (n, b) => `${n}, thanks for visiting ${b}! How was it? Tap a rating 👇` }
  };
  function fbConfig(s) { s = s || db().getSettings(); const d = Number(s.fb_delay_h); return { on: s.fb_enabled === '1', delay: process.env.LOYA_TEST_ANYTIME && d === 0 ? 0 : [1, 2, 3, 6, 24].includes(d) ? d : 2, reviewUrl: s.review_url || '', minDays: Math.max(14, Math.min(365, Number(s.fb_min_days) || 60)) }; }
  function starsHtml(link) {
    return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:6px 0 14px"><tr>${[1, 2, 3, 4, 5].map(i => `<td style="padding:0 4px"><a href="${link}?s=${i}" style="display:inline-block;width:46px;height:46px;line-height:46px;text-align:center;border-radius:12px;background:#fff6dc;border:1px solid #f0d58a;color:#e0a100;font-size:24px;text-decoration:none">★</a><div style="text-align:center;font-size:12px;color:#888;margin-top:3px">${i}</div></td>`).join('')}</tr></table>`;
  }
  async function askFeedback(clients, { manual } = {}) {
    const s = db().getSettings();
    if (!s.license_key) return { error: 'need_license' };
    const items = clients.map(c => ({ c, t: crypto.randomBytes(12).toString('hex') }));
    if (!items.length) return { ok: true, sent: 0 };
    const reg = await post(`${API}/api/fb-new`, { licenseKey: s.license_key, items: items.map(x => ({ t: x.t, n: String(x.c.name || '').slice(0, 60), l: langOf(x.c, s) })) }, 20000);
    if (!reg || !reg.ok) return { error: (reg && reg.error) || 'failed' };
    let sent = 0;
    const ch = s.auto_channels === 'email' ? ['email'] : s.auto_channels === 'telegram' ? ['telegram'] : ['email', 'telegram'];
    for (const { c, t } of items) {
      const lang = langOf(c, s); const T = FB_TEXT[lang] || FB_TEXT.ru; const ctxB = getBrandContext(lang);
      const link = `${API}/f/${t}`;
      const html = T.h(escHtml(String(c.name || '').split(/\s+/)[0]), ctxB.emoji, escHtml(ctxB.brandName)) + starsHtml(link) + `<p style="color:#888;font-size:13px">${escHtml(T.foot)}</p>`;
      const replyMarkup = { inline_keyboard: [[1, 2, 3, 4, 5].map(i => ({ text: `${i}⭐`, url: `${link}?s=${i}` }))] };
      let out = { email: null, telegram: null };
      try { out = await deliverToClient(c, { channels: ch, subject: T.s(ctxB.brandName), html, lang, logSubject: 'auto:review', replyMarkup, marketing: !manual }); } catch (e) { /* ниже отметим попытку */ }
      // Отмечаем попытку в любом случае — чтобы при ошибке почты не писать человеку снова и снова.
      db().run(`UPDATE clients SET fb_last_at = datetime('now') WHERE id = ?`, [c.id]);
      if (out.email === 'sent' || out.telegram === 'sent') {
        sent++;
        db().run(`INSERT OR IGNORE INTO feedback (token, client_id, name) VALUES (?, ?, ?)`, [t, c.id, String(c.name || '').slice(0, 100)]);
      }
    }
    return { ok: true, sent };
  }
  function feedbackCandidates() {
    const cfg = fbConfig();
    const rows = db().all(`SELECT c.*, v.last_at FROM clients c JOIN (SELECT client_id, MAX(created_at) AS last_at FROM scan_history WHERE result IN ('stamp', 'reward', 'spend', 'discount', 'gift') GROUP BY client_id) v ON v.client_id = c.id
      WHERE v.last_at <= datetime('now', ?) AND v.last_at >= datetime('now', ?) AND (c.fb_last_at IS NULL OR c.fb_last_at <= datetime('now', ?)) LIMIT 60`,
    [`-${cfg.delay} hours`, `-${cfg.delay + 20} hours`, `-${cfg.minDays} days`]);
    return rows.filter(c => Database.canMarket(c, 'email') || Database.canMarket(c, 'telegram')).slice(0, 30);
  }
  let fbBusy = false;
  async function checkFeedback() {
    if (fbBusy || !db()) return;
    const s = db().getSettings(); const cfg = fbConfig(s);
    if (!cfg.on || !s.license_key || (!mailReady(s) && !s.telegram_bot_token)) return;
    const h = new Date().getHours(); if ((h < 9 || h >= 21) && !process.env.LOYA_TEST_ANYTIME) return;   // не пишем ночью
    fbBusy = true;
    try { const list = feedbackCandidates(); if (list.length) await askFeedback(list); }
    catch (e) { writeCrashLog('feedback', e); } finally { fbBusy = false; }
  }
  let fbAck = [];
  async function pullFeedback() {
    const s = db() && db().getSettings();
    if (!s || !s.license_key || (s.fb_enabled !== '1' && !db().get(`SELECT 1 FROM feedback WHERE rating IS NULL LIMIT 1`))) return { skipped: true };
    try {
      const r = await post(`${API}/api/fb-pull`, { licenseKey: s.license_key, ack: fbAck }, 20000);
      if (!r || !r.ok) return { error: (r && r.error) || 'failed' };
      fbAck = [];
      let n = 0;
      for (const it of r.items || []) {
        const ex = db().get(`SELECT * FROM feedback WHERE token = ?`, [it.token]);
        const isNew = !ex || ex.rating == null || (it.comment && it.comment !== ex.comment);
        if (ex) db().run(`UPDATE feedback SET rating = ?, comment = ?, rated_at = ?, seen = CASE WHEN ? THEN 0 ELSE seen END WHERE token = ?`, [it.rating, it.comment || null, it.ratedAt || null, isNew ? 1 : 0, it.token]);
        else db().run(`INSERT INTO feedback (token, name, rating, comment, rated_at, seen) VALUES (?, ?, ?, ?, ?, 0)`, [it.token, it.name || '', it.rating, it.comment || null, it.ratedAt || null]);
        if (isNew) { n++; notice('review', { name: it.name || '', rating: it.rating, comment: it.comment ? 1 : 0 }); }
        fbAck.push(it.token);
      }
      if (fbAck.length) { try { await post(`${API}/api/fb-pull`, { licenseKey: s.license_key, ack: fbAck }, 20000); fbAck = []; } catch (e) { /* подтвердим позже */ } }
      if (n) changed();
      return { ok: true, added: n };
    } catch (e) { return { error: 'network' }; }
  }
  ipcMain.handle('fb:list', (e, limit) => {
    const rows = db().all(`SELECT f.*, c.phone, c.email FROM feedback f LEFT JOIN clients c ON c.id = f.client_id ORDER BY COALESCE(f.rated_at, f.created_at) DESC LIMIT ?`, [Math.max(1, Math.min(500, Number(limit) || 50))]);
    const st = db().get(`SELECT COUNT(*) AS asked, SUM(CASE WHEN rating IS NOT NULL THEN 1 ELSE 0 END) AS rated, AVG(rating) AS avg, SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) AS good, SUM(CASE WHEN rating IS NOT NULL AND rating <= 3 THEN 1 ELSE 0 END) AS bad, SUM(CASE WHEN rating IS NOT NULL AND seen = 0 THEN 1 ELSE 0 END) AS unseen FROM feedback`) || {};
    return { list: rows, stats: { asked: st.asked || 0, rated: st.rated || 0, avg: st.avg ? Math.round(st.avg * 10) / 10 : null, good: st.good || 0, bad: st.bad || 0, unseen: st.unseen || 0 }, cfg: fbConfig() };
  });
  ipcMain.handle('fb:markSeen', () => { db().run(`UPDATE feedback SET seen = 1 WHERE seen = 0`); return { ok: true }; });
  ipcMain.handle('fb:askNow', async (e, clientId) => { const c = db().getClient(clientId); if (!c) return { error: 'not_found' }; return askFeedback([c], { manual: true }); });
  ipcMain.handle('fb:syncNow', async () => { await checkFeedback(); return pullFeedback(); });

  // =================== Онлайн-запись ===================
  const parseJson = (v, d) => { try { const x = JSON.parse(v); return x == null ? d : x; } catch (e) { return d; } };
  function bookConfig(s) {
    s = s || db().getSettings();
    let tz = s.book_tz; if (!tz) { try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { tz = 'Europe/Bratislava'; } }
    const hours = parseJson(s.book_hours, null) || { 0: [], 1: [['09:00', '18:00']], 2: [['09:00', '18:00']], 3: [['09:00', '18:00']], 4: [['09:00', '18:00']], 5: [['09:00', '18:00']], 6: [['10:00', '14:00']] };
    return {
      on: s.book_on === '1', services: parseJson(s.book_services, []), staff: parseJson(s.book_staff, []), hours,
      step: Number(s.book_step) || 30, lead: Number(s.book_lead) >= 0 && s.book_lead !== '' && s.book_lead != null ? Number(s.book_lead) : 60, days: Number(s.book_days) || 30,
      note: s.book_note || '', address: s.book_address || '', phone: s.book_phone || '', tz, currency: s.spend_currency || 'EUR'
    };
  }
  function bookLink() { const s = db().getSettings(); return s.online_slug ? `${API}/b/${s.online_slug}` : ''; }
  ipcMain.handle('book:get', () => { const s = db().getSettings(); return { ...bookConfig(s), link: bookLink(), hasLicense: !!s.license_key, lastSync: s.book_last_sync || '' }; });
  ipcMain.handle('book:save', async (e, cfg) => {
    const c = cfg || {};
    const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
    const idOf = (v, i, pfx) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || (pfx + (i + 1));
    const services = (Array.isArray(c.services) ? c.services : []).slice(0, 40).map((x, i) => ({ id: idOf(x.id, i, 's'), n: clean(x.n, 60), d: Math.max(5, Math.min(480, Math.round(Number(x.d) || 60))), p: x.p === '' || x.p == null || !Number.isFinite(Number(x.p)) ? null : Math.max(0, Number(x.p)) })).filter(x => x.n);
    const staff = (Array.isArray(c.staff) ? c.staff : []).slice(0, 20).map((x, i) => ({ id: idOf(x.id, i, 'm'), n: clean(x.n, 40), s: Array.isArray(x.s) ? x.s.map(String) : [] })).filter(x => x.n);
    const hours = {}; for (let d = 0; d < 7; d++) hours[d] = (Array.isArray(c.hours && c.hours[d]) ? c.hours[d] : []).filter(r => toMin(r[0]) != null && toMin(r[1]) != null && toMin(r[1]) > toMin(r[0])).slice(0, 3).map(r => [hm(toMin(r[0])), hm(toMin(r[1]))]);
    db().saveSettings({
      book_on: c.on ? '1' : '0', book_services: JSON.stringify(services), book_staff: JSON.stringify(staff), book_hours: JSON.stringify(hours),
      book_step: String([10, 15, 20, 30, 60].includes(Number(c.step)) ? Number(c.step) : 30), book_lead: String(Math.max(0, Math.min(2880, Math.round(Number(c.lead) || 0)))),
      book_days: String(Math.max(1, Math.min(90, Math.round(Number(c.days) || 30)))), book_note: clean(c.note, 300), book_address: clean(c.address, 120), book_phone: clean(c.phone, 30), ...(c.tz ? { book_tz: clean(c.tz, 60) } : {})
    });
    const s = db().getSettings();
    let publishError = null;
    if (s.license_key) { const pub = await publishOnlineProfile(); if (!pub.ok) publishError = pub.error || 'failed'; else { pushBusy(true).catch(() => {}); syncBookings().catch(() => {}); } }
    else if (c.on) publishError = 'need_license';
    return { ...bookConfig(), link: bookLink(), publishError, hasLicense: !!s.license_key };
  });

  const APPT_COLS = `a.*, c.name AS client_name, c.phone AS client_phone, c.email AS client_email, c.telegram_chat_id AS client_tg`;
  ipcMain.handle('appt:list', (e, f) => {
    const from = /^\d{4}-\d{2}-\d{2}$/.test((f || {}).from || '') ? f.from : localDate();
    const to = /^\d{4}-\d{2}-\d{2}$/.test((f || {}).to || '') ? f.to : addDays(from, 6);
    return db().all(`SELECT ${APPT_COLS} FROM appointments a LEFT JOIN clients c ON c.id = a.client_id WHERE a.date >= ? AND a.date <= ? ORDER BY a.date, a.start_min, a.id`, [from, to]);
  });
  ipcMain.handle('appt:upcoming', () => {
    const today = localDate();
    const counts = db().get(`SELECT SUM(CASE WHEN date = ? AND status = 'booked' THEN 1 ELSE 0 END) AS today, SUM(CASE WHEN date > ? AND status = 'booked' THEN 1 ELSE 0 END) AS later, SUM(CASE WHEN source = 'online' AND created_at >= datetime('now', '-1 day') THEN 1 ELSE 0 END) AS newOnline FROM appointments WHERE date >= ?`, [today, today, today]) || {};
    return { today: counts.today || 0, later: counts.later || 0, newOnline: counts.newOnline || 0 };
  });
  function conflictsFor(a) {
    const end = a.start_min + a.dur;
    return db().all(`SELECT id, name, start_min, dur, staff_id, staff_name FROM appointments WHERE date = ? AND status = 'booked' AND id != ? AND (? = '' OR staff_id = '' OR staff_id = ?) AND start_min < ? AND start_min + dur > ?`,
      [a.date, a.id || 0, a.staff_id || '', a.staff_id || '', end, a.start_min]);
  }
  ipcMain.handle('appt:save', (e, raw) => {
    const r = raw || {};
    const date = String(r.date || ''); const start = toMin(r.time);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || start == null) return { error: 'time' };
    const cfg = bookConfig();
    const svc = cfg.services.find(x => x.id === r.serviceId);
    const dur = Math.max(5, Math.min(600, Math.round(Number(r.dur) || (svc ? svc.d : 60))));
    const st = cfg.staff.find(x => x.id === r.staffId);
    let clientId = Number(r.clientId) || null;
    const name = String(r.name || '').trim().slice(0, 100), phone = String(r.phone || '').trim().slice(0, 30);
    if (!clientId && phone) { const ex = db().getClientByPhone(phone); if (ex) clientId = ex.id; }
    if (!clientId && !name) return { error: 'name' };
    const row = {
      client_id: clientId, name: name || (clientId ? (db().getClient(clientId) || {}).name : ''), phone, email: String(r.email || '').trim().slice(0, 120) || null,
      service_id: svc ? svc.id : '', service_name: svc ? svc.n : String(r.serviceName || '').slice(0, 60), price: r.price !== undefined && r.price !== '' && Number.isFinite(Number(r.price)) ? Number(r.price) : (svc ? svc.p : null),
      staff_id: st ? st.id : '', staff_name: st ? st.n : '', date, start_min: start, dur, note: String(r.note || '').slice(0, 300) || null
    };
    const conflicts = conflictsFor({ ...row, id: r.id });
    if (conflicts.length && !r.force) return { conflict: true, conflicts };
    let id = Number(r.id) || 0;
    if (id) {
      const ex = db().get(`SELECT * FROM appointments WHERE id = ?`, [id]); if (!ex) return { error: 'not_found' };
      const moved = ex.date !== row.date || ex.start_min !== row.start_min;
      db().run(`UPDATE appointments SET client_id = ?, name = ?, phone = ?, email = ?, service_id = ?, service_name = ?, price = ?, staff_id = ?, staff_name = ?, date = ?, start_min = ?, dur = ?, note = ?, updated_at = datetime('now'), reminded = CASE WHEN ? THEN 0 ELSE reminded END, server_dirty = CASE WHEN server_id IS NOT NULL THEN 1 ELSE 0 END WHERE id = ?`,
        [row.client_id, row.name, row.phone, row.email, row.service_id, row.service_name, row.price, row.staff_id, row.staff_name, row.date, row.start_min, row.dur, row.note, moved ? 1 : 0, id]);
    } else {
      id = db().run(`INSERT INTO appointments (client_id, name, phone, email, service_id, service_name, price, staff_id, staff_name, date, start_min, dur, note, status, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'booked', 'app')`,
        [row.client_id, row.name, row.phone, row.email, row.service_id, row.service_name, row.price, row.staff_id, row.staff_name, row.date, row.start_min, row.dur, row.note]);
    }
    afterApptChange();
    return { ok: true, id };
  });
  ipcMain.handle('appt:status', (e, id, status) => {
    if (!['booked', 'cancelled', 'done', 'noshow'].includes(status)) return { error: 'status' };
    db().run(`UPDATE appointments SET status = ?, updated_at = datetime('now'), server_dirty = CASE WHEN server_id IS NOT NULL THEN 1 ELSE 0 END WHERE id = ?`, [status, Number(id)]);
    afterApptChange();
    return { ok: true };
  });
  ipcMain.handle('appt:delete', (e, id) => {
    const a = db().get(`SELECT * FROM appointments WHERE id = ?`, [Number(id)]);
    if (!a) return { error: 'not_found' };
    if (a.server_id) { db().run(`UPDATE appointments SET status = 'cancelled', server_dirty = 1, updated_at = datetime('now') WHERE id = ?`, [a.id]); }
    else db().run(`DELETE FROM appointments WHERE id = ?`, [a.id]);
    afterApptChange();
    return { ok: true };
  });
  // Гость пришёл: запись выполнена + визит на его карту (штамп, а для накопительной — сумма услуги).
  ipcMain.handle('appt:arrived', (e, id) => {
    const a = db().get(`SELECT * FROM appointments WHERE id = ?`, [Number(id)]);
    if (!a) return { error: 'not_found' };
    let clientId = a.client_id;
    try {
      if (!clientId && a.phone) { const ex = db().getClientByPhone(a.phone); if (ex) clientId = ex.id; }
      if (!clientId) clientId = db().addClient({ name: a.name || '—', phone: a.phone || '', email: a.email || '', preferredLanguage: L4.includes(a.lang) ? a.lang : '', consentSource: 'booking' });
    } catch (err) { if (err && err.code === 'FREE_LIMIT') return { error: 'free_limit' }; throw err; }
    db().run(`UPDATE appointments SET status = 'done', client_id = ?, updated_at = datetime('now'), server_dirty = CASE WHEN server_id IS NOT NULL THEN 1 ELSE 0 END WHERE id = ?`, [clientId, a.id]);
    let card = db().getCardsByClient(clientId).find(k => !k.single_use && k.type !== 'gift');
    let created = false;
    try { if (!card) { card = db().createDefaultCard(clientId, { source: 'booking' }); created = true; } } catch (err) { if (err && err.code === 'FREE_LIMIT') { afterApptChange(); return { ok: true, clientId, noCard: 'free_limit' }; } throw err; }
    let result = null;
    if (card.type === 'spend') result = Number(a.price) > 0 ? db().addSpendAmount(card.id, a.price) : { needsAmount: true };
    else result = db().markCardManually(card.id);
    afterApptChange();
    return { ok: true, clientId, cardId: card.id, cardType: card.type, created, result };
  });

  let busyHash = '', busyAt = 0;
  async function pushBusy(force) {
    const s = db().getSettings();
    if (s.book_on !== '1' || !s.license_key) return { skipped: true };
    const items = db().all(`SELECT date, staff_id, start_min, dur FROM appointments WHERE source != 'online' AND status = 'booked' AND date >= ?`, [localDate()]).map(a => ({ date: a.date, staffId: a.staff_id || '', from: a.start_min, to: Math.min(1440, a.start_min + a.dur) }));
    const h = crypto.createHash('sha1').update(JSON.stringify(items)).digest('hex');
    if (!force && h === busyHash && Date.now() - busyAt < 30 * 60e3) return { skipped: true };
    const r = await post(`${API}/api/book-busy`, { licenseKey: s.license_key, items }, 20000);
    if (r && r.ok) { busyHash = h; busyAt = Date.now(); }
    return r;
  }
  let busyTimer = null;
  function afterApptChange() {
    changed();
    clearTimeout(busyTimer); busyTimer = setTimeout(() => { pushBusy().catch(() => {}); syncBookings().catch(() => {}); }, 1500);
  }
  const BOOK_NOTE = (it) => `${String(it.date).slice(8, 10)}.${String(it.date).slice(5, 7)} ${it.time} · ${it.service || ''}`;
  let bookSyncing = false, bookAck = [];
  async function syncBookings() {
    const s = db() && db().getSettings();
    if (!s || s.book_on !== '1' || !s.license_key || bookSyncing) return { skipped: true };
    bookSyncing = true;
    try {
      // 1) изменения онлайн-записей, сделанные здесь (отмена, перенос, пришёл/не пришёл)
      for (const a of db().all(`SELECT * FROM appointments WHERE server_id IS NOT NULL AND server_dirty = 1 LIMIT 50`)) {
        const r = await post(`${API}/api/book-update`, { licenseKey: s.license_key, id: a.server_id, status: a.status, date: a.date, time: hm(a.start_min), staffId: a.staff_id || '' }, 20000);
        if (r && r.ok) db().run(`UPDATE appointments SET server_dirty = 0 WHERE id = ?`, [a.id]);
      }
      // 2) новые и изменённые гостем записи
      const r = await post(`${API}/api/book-pull`, { licenseKey: s.license_key, ack: bookAck }, 20000);
      if (!r || !r.ok) return { error: (r && r.error) || 'failed' };
      bookAck = [];
      let n = 0;
      for (const it of r.items || []) {
        try {
          const ex = db().get(`SELECT * FROM appointments WHERE server_id = ?`, [it.id]);
          const start = toMin(it.time);
          if (!ex) {
            let clientId = null;
            const found = (it.phone && db().getClientByPhone(it.phone)) || (it.email && db().getClientByEmail(it.email)) || null;
            if (found) clientId = found.id;
            else if (it.status === 'booked') {
              try { clientId = db().addClient({ name: String(it.name || '').slice(0, 100) || '—', phone: it.phone || '', email: it.email || '', preferredLanguage: L4.includes(it.lang) ? it.lang : '', consentEmail: !!it.consent, consentTelegram: false, consentSource: 'online_booking' }); } catch (err) { if (!err || err.code !== 'FREE_LIMIT') throw err; }
            }
            db().run(`INSERT INTO appointments (server_id, token, client_id, name, phone, email, lang, service_id, service_name, price, staff_id, staff_name, date, start_min, dur, status, source, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'online', ?)`,
              [it.id, it.token || null, clientId, it.name || '', it.phone || '', it.email || null, it.lang || '', it.serviceId || '', it.service || '', it.price == null ? null : Number(it.price), it.staffId || '', it.staff || '', it.date, start, Number(it.dur) || 60, it.status || 'booked', it.note || null]);
            if (it.status === 'booked') notice('book', { name: it.name || '', when: BOOK_NOTE(it) });
            n++;
          } else if (!ex.server_dirty) {
            db().run(`UPDATE appointments SET status = ?, date = ?, start_min = ?, staff_id = ?, staff_name = ?, updated_at = datetime('now') WHERE id = ?`, [it.status, it.date, start, it.staffId || '', it.staff || ex.staff_name, ex.id]);
            if (ex.status === 'booked' && it.status === 'cancelled') notice('book', { name: it.name || ex.name, when: BOOK_NOTE(it), cancelled: 1 });
            n++;
          }
          bookAck.push(it.id);
        } catch (err) { writeCrashLog('bookingPull', err); bookAck.push(it.id); }
      }
      if (bookAck.length) { try { await post(`${API}/api/book-pull`, { licenseKey: s.license_key, ack: bookAck }, 20000); bookAck = []; } catch (e) { /* подтвердим позже */ } }
      db().saveSettings({ book_last_sync: new Date().toISOString() });
      if (n) changed();
      return { ok: true, added: n };
    } catch (e) { return { error: 'network' }; } finally { bookSyncing = false; }
  }
  ipcMain.handle('book:syncNow', async () => { await pushBusy(true).catch(() => {}); const r = await syncBookings(); await checkReminders().catch(() => {}); return r; });

  // Напоминание накануне: в Telegram (если гость подключил бота) и письмом для записей, сделанных в программе
  // (для онлайн-записей письмо-напоминание присылает сайт).
  const REMIND_TEXT = {
    ru: { s: (b) => `Напоминание: завтра вы записаны — ${b}`, h: (n, when, svc, b) => `<p>Здравствуйте, ${n}!</p><p>Напоминаем: завтра, <b>${when}</b>, вы записаны на «${svc}» в <b>${b}</b>. Ждём вас!</p>`, cx: 'Если планы изменились, запись можно отменить по ссылке:' },
    uk: { s: (b) => `Нагадування: завтра ви записані — ${b}`, h: (n, when, svc, b) => `<p>Вітаємо, ${n}!</p><p>Нагадуємо: завтра, <b>${when}</b>, ви записані на «${svc}» у <b>${b}</b>. Чекаємо на вас!</p>`, cx: 'Якщо плани змінилися, запис можна скасувати за посиланням:' },
    sk: { s: (b) => `Pripomienka: zajtra máte rezerváciu — ${b}`, h: (n, when, svc, b) => `<p>Dobrý deň, ${n}!</p><p>Pripomíname: zajtra o <b>${when}</b> máte rezerváciu na „${svc}“ v <b>${b}</b>. Tešíme sa na vás!</p>`, cx: 'Ak sa vám zmenili plány, rezerváciu môžete zrušiť tu:' },
    en: { s: (b) => `Reminder: you’re booked tomorrow — ${b}`, h: (n, when, svc, b) => `<p>Hello ${n}!</p><p>A reminder: tomorrow at <b>${when}</b> you’re booked for “${svc}” at <b>${b}</b>. See you then!</p>`, cx: 'If your plans changed, you can cancel here:' }
  };
  let remindBusy = false;
  async function checkReminders() {
    const s = db() && db().getSettings();
    if (!s || s.book_on !== '1' || remindBusy || (new Date().getHours() < 16 && !process.env.LOYA_TEST_ANYTIME)) return;
    remindBusy = true;
    try {
      const list = db().all(`SELECT a.*, c.id AS cid FROM appointments a LEFT JOIN clients c ON c.id = a.client_id WHERE a.date = ? AND a.status = 'booked' AND a.reminded = 0 LIMIT 100`, [addDays(localDate(), 1)]);
      for (const a of list) {
        db().run(`UPDATE appointments SET reminded = 1 WHERE id = ?`, [a.id]);
        const c = a.cid ? db().getClient(a.cid) : null;
        if (!c) continue;
        const lang = L4.includes(a.lang) ? a.lang : langOf(c, s); const T = REMIND_TEXT[lang] || REMIND_TEXT.ru; const brand = getBrandContext(lang).brandName;
        const link = a.token && s.online_slug ? `${API}/b/${s.online_slug}?c=${a.token}&lang=${lang}` : '';
        const html = T.h(escHtml(String(c.name || a.name || '').split(/\s+/)[0]), hm(a.start_min), escHtml(a.service_name || ''), escHtml(brand)) + (link ? `<p>${escHtml(T.cx)} <a href="${link}">${link}</a></p>` : '');
        const chans = a.source === 'online' && a.email ? ['telegram'] : ['email', 'telegram'];   // онлайн-запись с почтой: письмо уже шлёт сайт
        try { await deliverToClient(c, { channels: chans, subject: T.s(brand), html, lang, logSubject: 'booking:reminder', marketing: false, unsubscribe: false }); } catch (e) { /* следующий */ }
      }
    } catch (e) { writeCrashLog('bookingReminders', e); } finally { remindBusy = false; }
  }

  // =================== Касса: Dotykačka и импорт чеков из CSV ===================
  ipcMain.handle('dk:status', async () => {
    const s = db().getSettings();
    if (!s.license_key) return { error: 'need_license' };
    try { const r = await post(`${API}/api/dk-status`, { licenseKey: s.license_key }, 15000); return r || { error: 'failed' }; } catch (e) { return { error: 'network' }; }
  });
  ipcMain.handle('dk:connect', async () => {
    const s = db().getSettings();
    if (!s.license_key) return { error: 'need_license' };
    try {
      const r = await post(`${API}/api/dk-start`, { licenseKey: s.license_key }, 15000);
      if (!r || !r.ok) return { error: (r && r.error) || 'failed' };
      // Чеки из облака приходят через общую очередь — включаем приём чеков и облачный адрес.
      db().saveSettings({ pos_enabled: '1', pos_cloud: '1', feature_pos: '1' });
      if (shell && /^https:\/\//.test(r.url)) shell.openExternal(r.url);
      return { ok: true, url: r.url };
    } catch (e) { return { error: 'network' }; }
  });
  ipcMain.handle('dk:disconnect', async () => {
    const s = db().getSettings();
    try { const r = await post(`${API}/api/dk-disconnect`, { licenseKey: s.license_key }, 15000); return r || { error: 'failed' }; } catch (e) { return { error: 'network' }; }
  });
  // CSV любой кассы: дата, сумма, номер чека, карта или телефон. Колонки узнаём по заголовку (4 языка + частые варианты).
  const COLS = {
    id: ['id', 'receipt', 'receipt_id', 'number', 'no', 'nr', 'číslo', 'cislo', 'číslo dokladu', 'doklad', 'чек', 'номер', 'номер чека'],
    total: ['total', 'amount', 'sum', 'suma', 'celkom', 'spolu', 'cena', 'сумма', 'итого', 'сума', 'разом'],
    date: ['date', 'datum', 'dátum', 'created', 'created_at', 'time', 'čas', 'дата', 'время'],
    card: ['card', 'card_code', 'loyalty', 'karta', 'карта', 'картка', 'code', 'kód', 'kod'],
    phone: ['phone', 'telefón', 'telefon', 'mobil', 'телефон', 'tel']
  };
  function parseCsv(text) {
    const src = String(text || '').replace(/^﻿/, '');
    const first = src.split(/\r?\n/)[0] || '';
    const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : (first.includes('\t') ? '\t' : ',');
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (q) { if (ch === '"') { if (src[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
      if (ch === '"') q = true; else if (ch === sep) { row.push(cur); cur = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && src[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim() !== ''));
  }
  function importReceiptsCsv(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) return { error: 'empty' };
    const head = rows[0].map(h => String(h).trim().toLowerCase());
    const col = (k) => head.findIndex(h => COLS[k].includes(h));
    const ix = { id: col('id'), total: col('total'), date: col('date'), card: col('card'), phone: col('phone') };
    if (ix.total < 0) return { error: 'no_total', columns: rows[0] };
    let added = 0, dup = 0, bad = 0;
    for (const r of rows.slice(1, 20001)) {
      const total = Number(String(r[ix.total] || '').replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
      if (!Number.isFinite(total) || total < 0) { bad++; continue; }
      const p = { total, ...(ix.id >= 0 && r[ix.id] ? { id: 'CSV-' + String(r[ix.id]).trim().slice(0, 60) } : {}), ...(ix.date >= 0 && r[ix.date] ? { created_at: String(r[ix.date]).trim() } : {}), ...(ix.card >= 0 && r[ix.card] ? { card: String(r[ix.card]).trim() } : {}), ...(ix.phone >= 0 && r[ix.phone] ? { phone: String(r[ix.phone]).trim() } : {}), items: [] };
      try { const res = posReceipt(p, 'csv'); if (res && res.duplicate) dup++; else if (res && res.ok) added++; else bad++; } catch (e) { bad++; }
    }
    return { ok: true, added, dup, bad, columns: Object.fromEntries(Object.entries(ix).map(([k, v]) => [k, v >= 0 ? rows[0][v] : null])) };
  }
  ipcMain.handle('pos:importCsv', async () => {
    const w = win();
    const { canceled, filePaths } = await dialog.showOpenDialog(w, { filters: [{ name: 'CSV', extensions: ['csv', 'txt'] }], properties: ['openFile'] });
    if (canceled || !filePaths || !filePaths[0]) return { canceled: true };
    try { return importReceiptsCsv(fs.readFileSync(filePaths[0], 'utf8')); } catch (e) { return { error: 'read_failed' }; }
  });

  // =================== таймеры ===================
  setInterval(() => { if (db()) syncBookings().catch(() => {}); }, 60 * 1000);
  setInterval(() => { if (db()) pushBusy().catch(() => {}); }, 10 * 60 * 1000);
  setInterval(() => { if (db()) checkReminders().catch(() => {}); }, 20 * 60 * 1000);
  setInterval(() => { if (db()) checkFeedback().catch(() => {}); }, 5 * 60 * 1000);
  setInterval(() => { if (db()) pullFeedback().catch(() => {}); }, 3 * 60 * 1000);
  setTimeout(() => { if (db()) { syncBookings().catch(() => {}); pullFeedback().catch(() => {}); checkReminders().catch(() => {}); } }, 20000);

  return { attach, inviteUrl, inviteHtml, bookConfig, giftText, refGifts, syncBookings, pushBusy, checkFeedback, pullFeedback, checkReminders, askFeedback, importReceiptsCsv, feedbackCandidates };
};

}, {"./grow":52,"crypto":6}, "/app/pc-app/grow.js"];

const __cache = {};
function __load(id) {
  if (__cache[id]) return __cache[id].exports;
  const [fn, deps, fname] = __defs[id];
  const module = { exports: {}, id: fname, filename: fname, loaded: false };
  __cache[id] = module;
  const req = function (name) {
    if (!(name in deps)) throw new Error('Module not bundled: ' + name + ' (from ' + fname + ')');
    if (deps[name] === null) { const e = new Error('Module not available on Android: ' + name); e.code = 'MODULE_NOT_FOUND'; throw e; }
    return __load(deps[name]);
  };
  req.resolve = (name) => name;
  req.cache = {};
  fn.call(module.exports, module, module.exports, req, fname, fname.slice(0, fname.lastIndexOf('/')) || '/');
  module.loaded = true;
  return module.exports;
}
__load(0);
})();
