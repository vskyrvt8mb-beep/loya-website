// Генератор SEO-страниц: из шаблона scripts/index.template.html, текстов i18n.js и scripts/niches.js
// собирает статические страницы на каждый язык, чтобы поисковики и соцсети видели готовый текст без JavaScript:
//   /            — главная, English (x-default);   /ru/  /uk/  /sk/
//   /cafe/  /beauty-salon/  /shop/   — страницы под ниши (и /ru/cafe/ и т.д.)
// и sitemap.xml. Запуск:  node scripts/build-seo.js
// Результат лежит в репозитории — после правки i18n.js, niches.js или шаблона запустите скрипт и закоммитьте.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://loya-loyalty.com';
const EMAIL = 'loya.loyalty.send@gmail.com';
const STORE_ID = '9NDD15Q4KTPQ';
const LANGS = ['en', 'ru', 'uk', 'sk'];
const LOCALE = { en: 'en_US', ru: 'ru_RU', uk: 'uk_UA', sk: 'sk_SK' };
const STORE_HL = { en: 'en-us', ru: 'ru-ru', uk: 'uk-ua', sk: 'sk-sk' };
const NAME = { en: 'English', ru: 'Русский', uk: 'Українська', sk: 'Slovenčina' };
const pathOf = (l, sub = '') => (l === 'en' ? '/' : `/${l}/`) + (sub ? sub + '/' : '');
const urlOf = (l, sub) => SITE + pathOf(l, sub);

global.window = {};
require(path.join(ROOT, 'i18n.js'));
const T = window.SITE_I18N;
const NICHES = require('./niches');
const VIS = require('./niche-visuals');

// Иконки карточек на страницах ниш: эмодзи из niches.js → единый стиль (золотые линии)
const svgI = (d) => `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  '🧾': '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
  '🕒': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  '👋': '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6 2 0 3.6.6 4.8 1.6"/><path d="M16 15h6M19 12l3 3-3 3"/>',
  '☕': '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 2.5c-1 1.2 1 2 0 3.2M12 2.5c-1 1.2 1 2 0 3.2"/>',
  '📱': '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M9 7h2v2H9zM13 7h2v2h-2zM9 11h2v2H9z"/><path d="M11 18h2"/>',
  '⏰': '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2"/><path d="M5 3L2 6M19 3l3 3"/>',
  '💌': '<path d="M3 6h18v12H3z"/><path d="M3 7l9 6 9-6"/>',
  '📅': '<rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M3 9h18M8 2v4M16 2v4"/><path d="M8 13h3v3H8z"/>',
  '📒': '<path d="M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2z"/><path d="M5 17a2 2 0 0 1 2-2h12"/><path d="M9 7h6"/>',
  '📣': '<path d="M3 10v4h4l6 4V6L7 10z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
  '💳': '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
  '🔁': '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
  '🎁': '<rect x="3" y="9" width="18" height="12" rx="1.5"/><path d="M12 9v12M3 13h18"/><path d="M12 9c-2-4-6-4-6-1.5S10 9 12 9zm0 0c2-4 6-4 6-1.5S14 9 12 9z"/>',
  '👩‍🎨': '<path d="M6 3l8 8M10 3l-4 4"/><path d="M14 11l-3 3a3 3 0 1 0 4 4l3-3"/><circle cx="18" cy="18" r="1"/>',
  '🛒': '<path d="M3 4h2l2.5 11h11L21 7H7"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/>',
  '🤷': '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/><path d="M11 6.5a1.5 1.5 0 1 1 1.5 1.5v1"/>',
  '📦': '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  '💰': '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v12"/>',
  '📊': '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  '💅': '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.6 7.6L20 18M8.6 16.4L20 6"/>',
  '🛍️': '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  '✈️': '<path d="M10.5 13.5L3 11l1.5-1.5 8 .5 4-4a2.1 2.1 0 0 1 3 3l-4 4 .5 8L14.5 22l-2.5-7.5"/><path d="M6 18l2-2"/>',
  '📷': '<path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13.5" r="3.5"/>',
  '🐾': '<circle cx="6" cy="10" r="2"/><circle cx="10" cy="6" r="2"/><circle cx="14" cy="6" r="2"/><circle cx="18" cy="10" r="2"/><path d="M12 12c-3 0-5.5 3.5-5.5 6 0 1.5 1 2.5 2.5 2.5 1.2 0 1.8-.6 3-.6s1.8.6 3 .6c1.5 0 2.5-1 2.5-2.5 0-2.5-2.5-6-5.5-6z"/>',
};
const iconOf = (e) => (ICONS[e] ? svgI(ICONS[e]) : e);

// Живой макет первого экрана ниши: карта гостя + всплывающие уведомления
function nicheVisual(key, lang) {
  const v = VIS[key], d = v[lang];
  let body = '';
  if (v.type === 'points') {
    const pct = Math.round(v.done / v.total * 100);
    body = `<div class="nv-points"><b class="nv-num">€<span data-count="${v.done}">${v.done}</span></b><span>/ €${v.total}</span></div>
          <div class="nv-bar"><i style="--to:${pct}%"></i></div>`;
  } else {
    const cols = v.total <= 6 ? v.total : (v.type === 'visits' ? 4 : 5);
    body = `<div class="nv-stamps nv-${v.type}" style="grid-template-columns:repeat(${cols},1fr)">${Array.from({ length: v.total }, (_, i) => `<s class="${i < v.done ? 'on' : ''}${i === v.done ? ' next' : ''}${i === v.total - 1 ? ' gift' : ''}">${i === v.total - 1 ? '🎁' : i < v.done ? '✓' : ''}</s>`).join('')}</div>`;
  }
  return `<div class="niche-visual nv-${key}" aria-hidden="true">
      <div class="hero-glow"></div>
      <div class="nv-phone"><div class="nv-scr">
        <div class="nv-top"><span class="nv-logo">${v.emoji}</span><b>${esc(v.brand)}</b><em>${esc(d.kind)}</em></div>
        <div class="nv-reward">${esc(d.reward)}</div>
        <div class="nv-client">${esc(d.client)}</div>
        <div class="nv-qr"><i></i></div>
        ${body}
        <div class="nv-left">${esc(d.left)}</div>
        <div class="nv-toast">✓ ${esc(d.scan)}</div>
      </div></div>
      ${d.chips.map((c, i) => `<div class="chip nv-chip nv-c${i + 1}">${esc(c)}</div>`).join('')}
    </div>`;
}

// Тур по программе (тот же блок, что на главной)
function tourBlock(t, lang) {
  const tabs = [['dashboard', 'tabDash'], ['scan', 'tabScan'], ['marketing', 'tabMkt'], ['clients', 'tabClients'], ['analytics', 'tabAnalytics']];
  return `<section class="section" id="tour" style="padding-top:20px">
    <div class="container center">
      <h2 class="h2 reveal">${esc(t('tourTitle'))}</h2>
      <p class="lead reveal">${esc(t('tourSub'))}</p>
      <div class="tour-tabs">${tabs.map(([k, l], i) => `<button class="tour-tab${i ? '' : ' active'}" data-tab="${k}" data-i18n="${l}">${esc(t(l))}</button>`).join('')}</div>
      <div class="tour-frame reveal"><img id="tour-img" src="/img/dashboard_${lang}.webp" alt="${esc(t('capDash'))}" loading="lazy" width="1600" height="1000"></div>
      <p class="tour-cap" id="tour-cap">${esc(t('capDash'))}</p>
    </div>
  </section>`;
}

// Меню «Для кого» в шапке и быстрый выбор бизнеса на главной
const navFor = (lang, t) => `<div class="nav-drop"><button type="button" class="nav-drop-btn" aria-expanded="false" aria-controls="nav-for"><span data-i18n="navFor">${esc(t('navFor'))}</span> <svg width="12" height="8" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>
        <div class="nav-drop-menu" id="nav-for">${Object.entries(NICHES).map(([k, n]) => `<a href="${pathOf(lang, n.slug)}"><span class="nd-ic">${iconOf(n.icon)}</span><span><b>${esc(VIS[k][lang].short)}</b><small>${esc(VIS[k][lang].kind)}</small></span></a>`).join('')}</div></div>`;
const forTiles = (lang) => `      <div class="for-grid">${Object.entries(NICHES).map(([k, n]) => `
        <a class="for-tile reveal" href="${pathOf(lang, n.slug)}"><span class="ft-ic">${iconOf(n.icon)}</span><span class="ft-txt"><b>${esc(VIS[k][lang].short)}</b><small>${esc(VIS[k][lang].kind)}</small></span><span class="ft-go" aria-hidden="true">→</span></a>`).join('')}
      </div>`;
const footNiches = (lang) => Object.entries(NICHES).map(([k, n]) => `<a href="${pathOf(lang, n.slug)}">${esc(VIS[k][lang].short)}</a>`).join('');
const heroFor = (lang, t) => `<div class="hero-for"><span>${esc(t('heroFor'))}</span>${Object.entries(NICHES).map(([k, n]) => `<a href="${pathOf(lang, n.slug)}">${iconOf(n.icon)}<span>${esc(VIS[k][lang].short)}</span></a>`).join('')}</div>`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const template = fs.readFileSync(path.join(__dirname, 'index.template.html'), 'utf8');
const missing = new Set();
const tr = (lang) => (k) => {
  if (T[lang][k] !== undefined) return T[lang][k];
  missing.add(`${lang}:${k}`);
  return T.en[k] !== undefined ? T.en[k] : k;
};

// Готовый текст вместо data-i18n (JS потом подставит то же самое — мерцания нет)
function fillI18n(html, t) {
  html = html.replace(/<([a-z0-9]+)((?:\s[^>]*?)?\sdata-i18n="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g,
    (m, tag, attrs, key) => `<${tag}${attrs}>${esc(t(key))}</${tag}>`);
  html = html.replace(/<([a-z0-9]+)((?:\s[^>]*?)?\sdata-i18n-ph="([^"]+)"[^>]*)>/g, (m, tag, attrs, key) =>
    `<${tag}${attrs.replace(/\splaceholder="[^"]*"/, '')} placeholder="${esc(t(key))}">`);
  html = html.replace(/<([a-z0-9]+)((?:\s[^>]*?)?\sdata-i18n-aria="([^"]+)"[^>]*)>/g, (m, tag, attrs, key) =>
    `<${tag}${attrs.replace(/\saria-label="[^"]*"/, '')} aria-label="${esc(t(key))}">`);
  return html;
}

function headTags({ lang, title, desc, sub, ld }) {
  const url = urlOf(lang, sub);
  const og = `${SITE}/og-image_${lang}.png`;
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta name="robots" content="index,follow,max-image-preview:large">`,
    `<link rel="canonical" href="${url}">`,
    ...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${urlOf(l, sub)}">`),
    `<link rel="alternate" hreflang="x-default" href="${urlOf('en', sub)}">`,
    `<meta property="og:site_name" content="Loya">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:locale" content="${LOCALE[lang]}">`,
    ...LANGS.filter((l) => l !== lang).map((l) => `<meta property="og:locale:alternate" content="${LOCALE[l]}">`),
    `<meta property="og:image" content="${og}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(title)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${og}">`,
    `<meta name="theme-color" content="#07080b">`,
    ...ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`),
  ].join('\n');
}

const fontPreload = (lang) => `<link rel="preload" href="/fonts/manrope-${lang === 'ru' || lang === 'uk' ? 'cyrillic' : 'latin'}-wght-normal.woff2" as="font" type="font/woff2" crossorigin>`;
const offers = (url) => [['Free', '0.00'], ['Starter', '9.99'], ['Pro', '19.99']].map(([name, price]) => ({ '@type': 'Offer', name, price, priceCurrency: 'EUR', url }));
const ORG = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Loya', url: `${SITE}/`, logo: `${SITE}/logo.png`,
  contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: EMAIL, availableLanguage: ['English', 'Slovak', 'Russian', 'Ukrainian'] } };
const faqLd = (lang, pairs) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: lang,
  mainEntity: pairs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

// Фото «как это выглядит в кофейне» (пример кофейни Black Rich), с подписями на языке страницы
const photos = (t, lang) => [['photo-barista', 'real1'], ['photo-table', 'real2']].map(([n, k]) => [`${n}-${lang}`, k]).map(([f, k]) => `        <figure class="photo reveal">
          <img src="/img/${f}-768.webp" srcset="/img/${f}-768.webp 768w, /img/${f}-1536.webp 1536w" sizes="(max-width: 760px) 100vw, 560px" width="1536" height="1024" loading="lazy" decoding="async" alt="${esc(t(k))}">
          <figcaption>${esc(t(k))}</figcaption>
        </figure>`).join('\n');

// ---------- главная ----------
function buildHome(lang) {
  const t = tr(lang);
  let html = fillI18n(template, t);
  html = html.replace(new RegExp(`<option value="${lang}">`), `<option value="${lang}" selected>`);
  html = html.replace(/\{\{ALT_DASH\}\}/g, esc(t('capDash'))).replace('{{PHOTOS}}', photos(t, lang)).replace('{{NAV_FOR}}', navFor(lang, t)).replace('{{HERO_FOR}}', heroFor(lang, t)).replace('{{FOR_TILES}}', forTiles(lang)).replace('{{FOOT_NICHES}}', footNiches(lang));
  html = html.replace('<p class="tour-cap" id="tour-cap"></p>', `<p class="tour-cap" id="tour-cap">${esc(t('capDash'))}</p>`);
  for (const [key, n] of Object.entries(NICHES)) {
    html = html.split(`{{NICHE_${key}_NAME}}`).join(esc(n[lang].name)).split(`{{NICHE_${key}}}`).join(pathOf(lang, n.slug));
  }
  const langLinks = LANGS.map((l) => `<a href="${pathOf(l)}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${NAME[l]}</a>`).join(' · ');
  html = html.replace('{{LANGLINKS}}', langLinks)
    .replace(/\{\{STORE_URL\}\}/g, `https://apps.microsoft.com/detail/${STORE_ID}?hl=${STORE_HL[lang]}`)
    .replace(/\{\{HOME_URL\}\}/g, encodeURIComponent(urlOf(lang)))
    .replace(/\{\{HOME\}\}/g, pathOf(lang)).replace(/\{\{LANG\}\}/g, lang);

  const title = t('metaTitle'), desc = t('metaDesc'), url = urlOf(lang);
  const faq = [];
  for (let i = 1; T[lang]['q' + i]; i++) faq.push([t('q' + i), t('a' + i)]);
  const ld = [
    ORG,
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Loya', url: `${SITE}/`, inLanguage: lang },
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Loya', applicationCategory: 'BusinessApplication',
      operatingSystem: 'Windows 10, Windows 11', description: desc, url, image: `${SITE}/og-image_${lang}.png`, inLanguage: lang,
      downloadUrl: `${SITE}/download`, installUrl: `https://apps.microsoft.com/detail/${STORE_ID}`, offers: offers(url) },
  ];
  if (faq.length) ld.push(faqLd(lang, faq));
  return html.replace('<!--SEO-->', headTags({ lang, title, desc, ld }))
    .replace('<!--PRELOAD-->', `<link rel="preload" as="image" href="/img/dashboard_${lang}.webp">`)
    .replace(/<link rel="preload" href="\/fonts\/[^"]+" as="font"[^>]*>/, fontPreload(lang));
}

// ---------- страницы под ниши ----------
// Шапка и подвал берутся из готовой главной этого языка, ссылки-якоря (#pricing и т.п.) ведут на главную.
function buildNiche(lang, key, home) {
  const n = NICHES[key], d = n[lang], t = tr(lang), homePath = pathOf(lang), sub = n.slug;
  const start = home.indexOf('<body'), mainStart = home.indexOf('<main id="main">'), mainEnd = home.indexOf('</main>');
  const anchors = (s) => s.replace(/href="#(?!main")/g, `href="${homePath}#`);
  let top = anchors(home.slice(start, mainStart)).replace('data-page="home"', 'data-page="niche"');
  // язык на странице ниши: переключатель ведёт на ту же нишу на другом языке
  top = top.replace(/data-page-lang="[a-z]+"/, `data-page-lang="${lang}" data-page-sub="${sub}"`);
  top = top.replace(`<a href="${pathOf(lang, sub)}"><span class="nd-ic">`, `<a href="${pathOf(lang, sub)}" aria-current="page"><span class="nd-ic">`);
  let bottom = anchors(home.slice(mainEnd));
  bottom = bottom.replace(/<span class="foot-langs">[\s\S]*?<\/span><span>Windows/, '<span class="foot-langs">' +
    LANGS.map((l) => `<a href="${pathOf(l, sub)}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${NAME[l]}</a>`).join(' · ') + '</span><span>Windows');
  bottom = bottom.replace(/<div class="sticky-cta">[\s\S]*?<\/div>\n/, `<div class="sticky-cta"><a href="${homePath}#download" class="btn btn-primary">🎁 <span data-i18n="heroCta">${esc(t('heroCta'))}</span></a></div>\n`);

  const card = ([icon, h, p]) => `<div class="card reveal"><div class="icon">${iconOf(icon)}</div><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`;
  const others = Object.entries(NICHES).filter(([k]) => k !== key)
    .map(([, o]) => `<a class="btn btn-ghost btn-sm" href="${pathOf(lang, o.slug)}">${o.icon} ${esc(o[lang].name)}</a>`).join('');
  const main = `<main id="main">
  <section class="hero niche-hero">
    <div class="grid-bg"></div>
    <div class="container hero-grid">
      <div>
        <nav class="crumbs" aria-label="breadcrumb"><a href="${homePath}">Loya</a> <span aria-hidden="true">›</span> <span>${esc(d.name)}</span></nav>
        <h1 class="hero-title"><span>${esc(d.h1)}</span><span class="gold">${esc(d.h1gold)}</span></h1>
        <p class="hero-sub">${esc(d.lead)}</p>
        <div class="hero-ctas">
          <a href="${homePath}#download" class="btn btn-primary">🎁 <span>${esc(t('heroCta'))}</span></a>
          <a href="#tour" class="btn btn-ghost">▶ <span>${esc(t('navTour'))}</span></a>
        </div>
        <div class="hero-note">${esc(t('heroNote'))}</div>
      </div>
      ${nicheVisual(key, lang)}
    </div>
  </section>

  <section class="section prob">
    <div class="container center">
      <h2 class="h2 reveal">${esc(d.painsTitle)}</h2>
      <div class="cards3" style="text-align:left">${d.pains.map(card).join('')}</div>
    </div>
  </section>

  <section class="section" style="padding-top:20px">
    <div class="container center">
      <h2 class="h2 reveal">${esc(d.howTitle)}</h2>
      <div class="cards4" style="text-align:left">${d.how.map(card).join('')}</div>
      ${key === 'cafe' ? `<div class="photo-grid niche-photos">\n${photos(t, lang)}\n      </div>` : ''}
    </div>
  </section>

  ${tourBlock(t, lang)}

  <section class="section" style="padding-top:20px">
    <div class="container center">
      <div class="niche-example reveal"><h2 class="h2">${esc(d.exampleTitle)}</h2><p class="lead">${esc(d.example)}</p>
        <a href="${homePath}#calc" class="btn btn-ghost btn-sm">🧮 <span>${esc(t('calcTitle'))}</span></a></div>
    </div>
  </section>

  <section class="section" style="padding-top:20px">
    <div class="container center">
      <h2 class="h2 reveal">${esc(t('faqTitle'))}</h2>
      <div class="faq" style="text-align:left">${d.faq.map(([q, a]) => `<details class="reveal"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
      <div class="niche-others reveal"><h3>${esc(t('footSolutions'))}</h3><div>${others}</div></div>
    </div>
  </section>

  <div class="container">
    <div class="final reveal">
      <h2 class="h2">${esc(t('finalTitle'))}</h2>
      <p>${esc(t('finalSub'))}</p>
      <a href="${homePath}#download" class="btn btn-primary">🎁 <span>${esc(t('finalCta'))}</span></a>
    </div>
  </div>
`;
  const ld = [
    ORG,
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Loya', item: urlOf(lang) },
      { '@type': 'ListItem', position: 2, name: d.name, item: urlOf(lang, sub) }] },
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Loya', applicationCategory: 'BusinessApplication',
      operatingSystem: 'Windows 10, Windows 11', description: d.metaDesc, url: urlOf(lang, sub), inLanguage: lang, offers: offers(urlOf(lang)) },
    faqLd(lang, d.faq),
  ];
  const headStart = home.slice(0, home.indexOf('<title>'));
  const headEnd = home.slice(home.indexOf('<link rel="icon"'), start).replace(/<link rel="preload" as="image"[^>]*>\n/, '');
  return headStart + headTags({ lang, title: d.metaTitle, desc: d.metaDesc, sub, ld }) + '\n' + headEnd + top + main + bottom;
}

const pages = [];
for (const lang of LANGS) {
  const home = buildHome(lang);
  const out = lang === 'en' ? path.join(ROOT, 'index.html') : path.join(ROOT, lang, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, home);
  pages.push(path.relative(ROOT, out));
  for (const key of Object.keys(NICHES)) {
    const nOut = path.join(ROOT, ...(lang === 'en' ? [] : [lang]), NICHES[key].slug, 'index.html');
    fs.mkdirSync(path.dirname(nOut), { recursive: true });
    fs.writeFileSync(nOut, buildNiche(lang, key, home));
    pages.push(path.relative(ROOT, nOut));
  }
}
console.log('written', pages.join(', '));
if (missing.size) console.warn('missing i18n keys (fallback used):', [...missing].join(', '));

// sitemap.xml с hreflang-связями
const today = new Date().toISOString().slice(0, 10);
const group = (sub) => {
  const alt = LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${urlOf(l, sub)}"/>`).join('\n')
    + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${urlOf('en', sub)}"/>`;
  return LANGS.map((l) => `  <url>\n    <loc>${urlOf(l, sub)}</loc>\n    <lastmod>${today}</lastmod>\n${alt}\n  </url>`);
};
const entries = [...group(''), ...Object.values(NICHES).flatMap((n) => group(n.slug))];
for (const p of ['privacy.html', 'terms.html']) entries.push(`  <url>\n    <loc>${SITE}/${p}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`);
console.log('written sitemap.xml');
