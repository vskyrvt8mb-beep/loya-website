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
