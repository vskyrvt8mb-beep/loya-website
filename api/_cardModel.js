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
function progress(card, lang, currency) {
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
  return { header: W.hProgress, body: `${Number(card.stamp_count) || 0} / ${Number(card.stamp_target) || 0}` };
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

function buildHeroSvg({ card, brand, niche, lang, bgImage, showProgress }) {
  const T = TXT[lang] || TXT.ru;
  const accent = /^#[0-9a-fA-F]{6}$/.test(brand.color || '') ? brand.color : '#d4a24a';
  const name = String(brand.name || 'Loya').slice(0, 32);
  const nameW = Math.min(560, textWidth(name, 34));
  const pill = card.type === 'gift' ? T.gift : card.type === 'discount' ? T.discount : card.type === 'spend' ? T.spend : T.stamp;
  const pillX = 102 + nameW + 16, pillW = textWidth(pill, 22) + 36;
  // 2.25: «скидка + штампы» — пилюля со скидкой рядом с типом карты; уровень гостя — в правом верхнем углу.
  const cpct = comboPct(card);
  const extra = (dx) => {
    let o = '';
    if (cpct) { const x = pillX + dx + pillW + 10, w = textWidth('−' + cpct + '%', 24) + 34; o += `<rect x="${x}" y="38" width="${w}" height="44" rx="22" fill="${accent}"/><text x="${x + w / 2}" y="68" font-family="Carlito" font-weight="700" font-size="24" fill="${INK}" text-anchor="middle">−${cpct}%</text>`; }
    const tn = tierName(card.tier);
    if (tn) { const col = card.tier === 'gold' ? '#f4cf5b' : card.tier === 'silver' ? '#d7dde5' : 'rgba(255,255,255,.75)'; const w = textWidth(tn, 22) + 40; o += `<rect x="${W - 48 - w}" y="38" width="${w}" height="44" rx="22" fill="none" stroke="${col}" stroke-width="3"/><text x="${W - 48 - w / 2}" y="67" font-family="Carlito" font-weight="700" font-size="22" fill="${col}" text-anchor="middle" letter-spacing="2">${tn}</text>`; }
    return o;
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
      ${extra(-54)}
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
  ${extra(0)}
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
  const p = progress(card, lang, brand.currency);
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

return { TEXT, CUR, progress, tierLabel, tierName, nextLine, comboPct, passModel, buildHeroSvg, TXT };
}
// Сервер: module.exports (+ CLIENT_JS — тот же код для страниц, например для превью в админке). Программа: window.LoyaCard.
if (typeof module !== 'undefined' && module.exports) { module.exports = loyaCardFactory(); module.exports.CLIENT_JS = 'window.LoyaCard=(' + loyaCardFactory.toString() + ')();'; }
else if (typeof window !== 'undefined') window.LoyaCard = loyaCardFactory();
