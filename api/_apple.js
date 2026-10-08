// Apple Wallet (PassKit): карта лояльности в iPhone, как у Google Wallet.
//
// Как это устроено:
//  1. Программа просит ссылку (/api/apple-link) — сервер запоминает состояние карты
//     (таблица apple_passes) и отдаёт ссылку на скачивание файла .pkpass.
//  2. Клиент открывает ссылку на iPhone → Wallet предлагает «Добавить».
//  3. Wallet сам регистрирует устройство на нашем веб-сервисе (/api/apple-ws/v1/...).
//  4. После скана программа шлёт /api/wallet-update → сервер обновляет apple_passes и
//     отправляет «тихий» push через APNs → iPhone сам скачивает новую версию карты.
//
// Нужно (переменные Vercel), пока их нет — всё выключено и ничего не ломает:
//   APPLE_PASS_TYPE_ID   — например pass.com.loyaloyalty.card
//   APPLE_TEAM_ID        — Team ID аккаунта Apple Developer
//   APPLE_PASS_CERT      — сертификат Pass Type ID (PEM или PEM в base64)
//   APPLE_PASS_KEY       — закрытый ключ к нему (PEM или base64), без пароля или с APPLE_PASS_KEY_PASSWORD
//   APPLE_WWDR_CERT      — промежуточный сертификат Apple WWDR G4 (PEM или base64)
const crypto = require('crypto');
const http2 = require('http2');
const forge = require('node-forge');
const W = require('./_wallet');
const ASSETS = require('./_apple_assets');

const SITE_URL = process.env.PUBLIC_URL || 'https://loya-loyalty.com';
const PASS_BG = 'rgb(32,37,45)';     // тот же графит, что у карты Google Wallet

function pem(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  if (s.startsWith('-----BEGIN')) return s.replace(/\\n/g, '\n');
  try { return Buffer.from(s, 'base64').toString('utf8').trim(); } catch (e) { return ''; }
}
function config() {
  const c = {
    passTypeId: String(process.env.APPLE_PASS_TYPE_ID || '').trim(),
    teamId: String(process.env.APPLE_TEAM_ID || '').trim(),
    cert: pem(process.env.APPLE_PASS_CERT), key: pem(process.env.APPLE_PASS_KEY),
    keyPassword: process.env.APPLE_PASS_KEY_PASSWORD || '', wwdr: pem(process.env.APPLE_WWDR_CERT)
  };
  if (!c.passTypeId || !c.teamId || !c.cert.includes('BEGIN CERTIFICATE') || !c.key.includes('PRIVATE KEY') || !c.wwdr.includes('BEGIN CERTIFICATE')) throw new Error('apple_not_configured');
  return c;
}
function configured() { try { config(); return true; } catch (e) { return false; } }

// ---- идентификаторы и токены ----
function secret() { return crypto.createHash('sha256').update('loya-apple:' + (process.env.APPLE_AUTH_SECRET || process.env.SUPABASE_SERVICE_KEY || 'dev')).digest(); }
function serialFor(licenseKey, code) {
  const biz = crypto.createHash('sha256').update(String(licenseKey).trim()).digest('hex').slice(0, 16);
  return `loya_${biz}_${String(code || '').replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 60)}`;
}
const validSerial = (s) => /^loya_[a-f0-9]{16}_[A-Za-z0-9_.-]{1,60}$/.test(String(s || ''));
function hmac(prefix, s) { return crypto.createHmac('sha256', secret()).update(prefix + ':' + s).digest('hex').slice(0, 40); }
const authTokenFor = (serial) => hmac('auth', serial);       // Wallet присылает его в заголовке Authorization
const downloadTokenFor = (serial) => hmac('dl', serial);     // подпись ссылки на скачивание
function safeEq(a, b) { const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || '')); return x.length === y.length && crypto.timingSafeEqual(x, y); }

// ---- содержимое карты ----
function hexToRgb(h) { const n = parseInt(String(h || '').slice(1), 16); return /^#[0-9a-fA-F]{6}$/.test(h || '') ? `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})` : 'rgb(212,175,55)'; }
const BACK = {
  ru: { client: 'Клиент', how: 'Как пользоваться', howText: 'Покажите QR-код на кассе — штампы и бонусы начислятся, а карта обновится сама.', by: 'Карта выпущена через Loya — loya-loyalty.com' },
  uk: { client: 'Клієнт', how: 'Як користуватися', howText: 'Покажіть QR-код на касі — штампи й бонуси нарахуються, а картка оновиться сама.', by: 'Картку випущено через Loya — loya-loyalty.com' },
  sk: { client: 'Klient', how: 'Ako používať', howText: 'Ukážte QR kód pri pokladni — pečiatky a bonusy sa pripíšu a karta sa sama aktualizuje.', by: 'Kartu vydal systém Loya — loya-loyalty.com' },
  en: { client: 'Client', how: 'How to use', howText: 'Show the QR code at the till — stamps and bonuses are added and the card updates itself.', by: 'Card issued via Loya — loya-loyalty.com' }
};
function buildPassJson(cfg, serial, card, brand, design) {
  const lang = W.TEXT[card.lang] ? card.lang : 'en';
  const T = W.TEXT[lang], B = BACK[lang];
  const p = W.progress(card, lang, brand.currency);
  const typeName = card.type === 'discount' ? T.discount : card.type === 'spend' ? T.spend : T.stamp;
  const name = String(brand.name || 'Loya').slice(0, 60);
  // Свой цвет фона заведения: на светлом фоне текст тёмный, иначе белый.
  const ownBg = design && /^#[0-9a-fA-F]{6}$/.test(design.bg_color || '') ? design.bg_color : '';
  const lum = ownBg ? (() => { const n = parseInt(ownBg.slice(1), 16); return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; })() : 0;
  const lightBg = lum > 0.62;
  return {
    formatVersion: 1,
    passTypeIdentifier: cfg.passTypeId, teamIdentifier: cfg.teamId, serialNumber: serial,
    organizationName: name, description: `${name} — ${typeName}`, logoText: name,
    backgroundColor: ownBg ? hexToRgb(ownBg) : PASS_BG, foregroundColor: lightBg ? 'rgb(20,20,20)' : 'rgb(255,255,255)', labelColor: lightBg ? 'rgb(70,70,70)' : hexToRgb(brand.color),
    webServiceURL: `${SITE_URL}/api/apple-ws`, authenticationToken: authTokenFor(serial),
    sharingProhibited: true,
    barcodes: [{ format: 'PKBarcodeFormatQR', message: String(card.code), messageEncoding: 'iso-8859-1', altText: String(card.code) }],
    storeCard: {
      headerFields: [{ key: 'progress', label: p.header, value: p.body, changeMessage: '%@' }],
      secondaryFields: [
        { key: 'client', label: B.client, value: String(card.client_name || '—').slice(0, 60) },
        { key: 'type', label: typeName, value: String(card.title || '').slice(0, 60) || '—' }
      ],
      backFields: [
        { key: 'how', label: B.how, value: B.howText },
        { key: 'code', label: 'QR', value: String(card.code) },
        { key: 'by', label: 'Loya', value: B.by }
      ]
    }
  };
}

// ---- ZIP (без сжатия — Wallet это принимает) ----
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function zip(files) {
  const parts = [], central = []; let offset = 0;
  for (const [name, data] of files) {
    const nameBuf = Buffer.from(name, 'utf8'), crc = crc32(data);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6); local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10); local.writeUInt16LE(0x21, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    parts.push(local, nameBuf, data);
    const cen = Buffer.alloc(46); cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0, 8); cen.writeUInt16LE(0, 10);
    cen.writeUInt16LE(0, 12); cen.writeUInt16LE(0x21, 14); cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(data.length, 20); cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28); cen.writeUInt32LE(offset, 42);
    central.push(cen, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const cenBuf = Buffer.concat(central);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cenBuf.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cenBuf, end]);
}

// ---- подпись manifest.json (PKCS#7, detached), как требует Apple ----
function signManifest(cfg, manifestBuf) {
  const cert = forge.pki.certificateFromPem(cfg.cert);
  const wwdr = forge.pki.certificateFromPem(cfg.wwdr);
  const key = cfg.keyPassword ? forge.pki.decryptRsaPrivateKey(cfg.key, cfg.keyPassword) : forge.pki.privateKeyFromPem(cfg.key);
  if (!key) throw new Error('apple_key_password');
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifestBuf.toString('binary'));
  p7.addCertificate(cert); p7.addCertificate(wwdr);
  p7.addSigner({ key, certificate: cert, digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [{ type: forge.pki.oids.contentType, value: forge.pki.oids.data }, { type: forge.pki.oids.messageDigest }, { type: forge.pki.oids.signingTime, value: new Date() }] });
  p7.sign({ detached: true });
  return Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), 'binary');
}

// Полоса-баннер с прогрессом (тот же рисунок, что и в Google Wallet). Не получилось — карта без неё.
function stripImages(card, brand, design) {
  try {
    const { renderHeroPng } = require('./_walletHero');
    const args = { card, brand, niche: brand.niche || 'other', lang: card.lang };
    if (design && design.hero) { args.bgImage = `data:${design.hero_mime || 'image/jpeg'};base64,${design.hero}`; args.showProgress = design.hero_stamps !== false; }
    return [['strip.png', renderHeroPng(args, 375)], ['strip@2x.png', renderHeroPng(args, 750)], ['strip@3x.png', renderHeroPng(args, 1125)]];
  } catch (e) { return []; }
}

// Свой логотип заведения → картинки нужных Apple размеров (вписываем, не обрезая).
function fitPng(dataUrl, w, h) {
  const { Resvg } = require('@resvg/resvg-js');
  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" href="${dataUrl}" xlink:href="${dataUrl}"/></svg>`;
  return new Resvg(svg, { fitTo: { mode: 'original' } }).render().asPng();
}
function logoImages(design) {
  if (!design || !design.logo) return null;
  try {
    const url = `data:${design.logo_mime || 'image/png'};base64,${design.logo}`;
    return [['logo.png', fitPng(url, 50, 50)], ['logo@2x.png', fitPng(url, 100, 100)], ['logo@3x.png', fitPng(url, 150, 150)],
      ['icon.png', fitPng(url, 29, 29)], ['icon@2x.png', fitPng(url, 58, 58)], ['icon@3x.png', fitPng(url, 87, 87)]];
  } catch (e) { return null; }
}

// opts.design — строка wallet_designs заведения (логотип, баннер, цвет) или null.
function buildPkpass(cfg, serial, card, brand, opts = {}) {
  const design = opts.design || null;
  const files = [['pass.json', Buffer.from(JSON.stringify(buildPassJson(cfg, serial, card, brand, design)), 'utf8')]];
  const own = logoImages(design);
  const ownNames = new Set((own || []).map(([n]) => n));
  for (const [n, b64] of Object.entries(ASSETS)) if (!ownNames.has(n)) files.push([n, Buffer.from(b64, 'base64')]);
  if (own) files.push(...own);
  if (opts.strip !== false) files.push(...stripImages(card, brand, design));
  const manifest = {};
  for (const [n, data] of files) manifest[n] = crypto.createHash('sha1').update(data).digest('hex');
  const manifestBuf = Buffer.from(JSON.stringify(manifest), 'utf8');
  files.push(['manifest.json', manifestBuf], ['signature', signManifest(cfg, manifestBuf)]);
  return zip(files);
}

// ---- push: «карта изменилась» (APNs, тот же сертификат Pass Type ID) ----
function pushUpdate(cfg, pushTokens, host) {
  if (!pushTokens.length) return Promise.resolve([]);
  return new Promise((resolve) => {
    const results = [];
    let client;
    try {
      client = http2.connect(host || process.env.APPLE_APNS_HOST || 'https://api.push.apple.com', {
        cert: cfg.cert, key: cfg.key, passphrase: cfg.keyPassword || undefined,
        ...(process.env.APPLE_APNS_CA ? { ca: pem(process.env.APPLE_APNS_CA) } : {})
      });
    } catch (e) { resolve(pushTokens.map(t => ({ token: t, status: 0 }))); return; }
    client.on('error', () => { /* соединение — ниже вернём статус 0 */ });
    let left = pushTokens.length;
    const done = (r) => { results.push(r); if (--left === 0) { client.close(); resolve(results); } };
    for (const token of pushTokens) {
      try {
        const req = client.request({ ':method': 'POST', ':path': `/3/device/${token}`, 'apns-topic': cfg.passTypeId, 'apns-push-type': 'background', 'content-type': 'application/json' });
        req.on('response', (h) => { const status = h[':status']; req.on('data', () => {}); req.on('end', () => done({ token, status })); });
        req.on('error', () => done({ token, status: 0 }));
        req.setTimeout(10000, () => { req.close(); });
        req.end('{}');
      } catch (e) { done({ token, status: 0 }); }
    }
  });
}

// Дизайн заведения для карты Apple (по ключу подписки); нет таблицы/дизайна — null.
async function designFor(licenseKey) {
  try { const D = require('./_walletDesign'); return await D.getDesignFull(D.bizOf(licenseKey), ''); } catch (e) { return null; }
}

module.exports = { designFor, config, configured, serialFor, validSerial, authTokenFor, downloadTokenFor, safeEq, buildPassJson, buildPkpass, pushUpdate, zip, crc32, SITE_URL };
