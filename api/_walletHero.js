// _walletHero.js — рисует «баннер» карточки (Google Wallet heroImage): свой для каждого
// бизнеса (название, цвет из настроек программы) и свой для каждого клиента (штампы или
// накопленная сумма — обновляется после каждого скана, а не просто «3/10» текстом).
//
// Рендерим SVG → PNG через @resvg/resvg-js (без headless-браузера, лёгкий пакет,
// работает в serverless на Vercel). Шрифт Carlito (OFL) зашит в /fonts.
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const W = 1032, H = 336; // рекомендованный Google Wallet размер героя (~3.07:1)
const FONT_BOLD = path.join(__dirname, 'fonts', 'Carlito-Bold.ttf');
const FONT_REG = path.join(__dirname, 'fonts', 'Carlito-Regular.ttf');

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
  ru: { stamp: 'Штамп-карта', discount: 'Скидочная', spend: 'Накопительная', left: (n) => `Ещё ${n} до подарка`, ready: '🎁 Подарок ждёт вас!', every: 'На каждую покупку', toBonus: (m) => `Ещё ${m} до бонуса`, saved: 'Накоплено' },
  uk: { stamp: 'Штамп-картка', discount: 'Знижкова', spend: 'Накопичувальна', left: (n) => `Ще ${n} до подарунка`, ready: '🎁 Подарунок чекає!', every: 'На кожну покупку', toBonus: (m) => `Ще ${m} до бонусу`, saved: 'Накопичено' },
  sk: { stamp: 'Pečiatková karta', discount: 'Zľavová', spend: 'Na nákupy', left: (n) => `Ešte ${n} do darčeka`, ready: '🎁 Darček na vás čaká!', every: 'Na každý nákup', toBonus: (m) => `Ešte ${m} do bonusu`, saved: 'Nazbierané' },
  en: { stamp: 'Stamp card', discount: 'Discount', spend: 'Spend card', left: (n) => `${n} more to a reward`, ready: '🎁 Your reward is ready!', every: 'On every purchase', toBonus: (m) => `${m} more to a bonus`, saved: 'Collected' }
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

function buildHeroSvg({ card, brand, niche, lang, bgImage, showProgress }) {
  const T = TXT[lang] || TXT.ru;
  const accent = /^#[0-9a-fA-F]{6}$/.test(brand.color || '') ? brand.color : '#d4a24a';
  const name = String(brand.name || 'Loya').slice(0, 32);
  const nameW = Math.min(560, textWidth(name, 34));
  const pill = card.type === 'discount' ? T.discount : card.type === 'spend' ? T.spend : T.stamp;
  const pillX = 102 + nameW + 16, pillW = textWidth(pill, 22) + 36;

  let body = '';
  if (card.type === 'discount') {
    body = `<text x="48" y="228" font-family="Carlito" font-weight="700" font-size="112" fill="${accent}" letter-spacing="-2">−${Number(card.discount_percent) || 0}%</text>
      <text x="52" y="282" font-family="Carlito" font-weight="600" font-size="28" fill="${MUTED}">${esc(T.every)}</text>`;
  } else if (card.type === 'spend') {
    const target = Number(card.spend_target) || 0, acc = Number(card.spend_accumulated) || 0;
    if (target > 0) {
      const left = Math.max(0, target - acc);
      body = progressLine(acc / target, `${moneyFmt(acc, brand.currency, lang)} / ${moneyFmt(target, brand.currency, lang)}`,
        left > 0 ? T.toBonus(moneyFmt(left, brand.currency, lang)) : T.ready.replace('🎁 ', ''), accent);
    } else {
      body = `<text x="48" y="228" font-family="Carlito" font-weight="700" font-size="96" fill="${accent}">${esc(moneyFmt(acc, brand.currency, lang))}</text>
        <text x="52" y="282" font-family="Carlito" font-weight="600" font-size="28" fill="${MUTED}">${esc(T.saved)}</text>`;
    }
  } else {
    body = stampsBlock(card.stamp_count, card.stamp_target || 10, accent, T);
  }

  // Своя картинка заведения: на всю ширину баннера; если поверх показываем штампы —
  // слева затемнение, чтобы текст и кружки читались на любой фотографии.
  if (bgImage && /^data:image\/(png|jpeg);base64,/.test(bgImage)) {
    const overlay = showProgress === false ? '' : `<defs><linearGradient id="shadeL" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0b0e13" stop-opacity=".86"/><stop offset="55%" stop-color="#0b0e13" stop-opacity=".55"/><stop offset="100%" stop-color="#0b0e13" stop-opacity=".1"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#shadeL)"/>
      <text x="48" y="71" font-family="Carlito" font-weight="700" font-size="34" fill="#ffffff">${esc(name)}</text>
      <rect x="${pillX - 54}" y="38" width="${pillW}" height="44" rx="22" fill="rgba(255,255,255,.16)"/>
      <text x="${pillX - 54 + pillW / 2}" y="67" font-family="Carlito" font-weight="700" font-size="22" fill="#f1f1f1" text-anchor="middle">${esc(pill)}</text>
      ${body}`;
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="${W}" height="${H}" fill="#181c23"/>
  <image x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" href="${bgImage}" xlink:href="${bgImage}"/>
  ${overlay}
</svg>`;
  }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
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
  ${iconSvg(niche, W - 250, 60, 230, 0.05)}
  <g>${iconSvg(niche, 48, 44, 32, 1).replace(/#fff/g, accent)}</g>
  <text x="102" y="71" font-family="Carlito" font-weight="700" font-size="34" fill="#ffffff">${esc(name)}</text>
  <rect x="${pillX}" y="38" width="${pillW}" height="44" rx="22" fill="rgba(255,255,255,.12)"/>
  <text x="${pillX + pillW / 2}" y="67" font-family="Carlito" font-weight="700" font-size="22" fill="#f1f1f1" text-anchor="middle">${esc(pill)}</text>
  ${body}
</svg>`;
}

function renderHeroPng(args, width) {
  const svg = buildHeroSvg(args);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width || W },
    font: { fontFiles: [FONT_BOLD, FONT_REG], loadSystemFonts: false, defaultFontFamily: 'Carlito' }
  });
  return resvg.render().asPng();
}

module.exports = { renderHeroPng, buildHeroSvg };
