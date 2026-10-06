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
const photos = (t) => [['photo-barista', 'real1'], ['photo-table', 'real2']].map(([f, k]) => `        <figure class="photo reveal">
          <img src="/img/${f}-768.webp" srcset="/img/${f}-768.webp 768w, /img/${f}-1536.webp 1536w" sizes="(max-width: 760px) 100vw, 560px" width="1536" height="1024" loading="lazy" decoding="async" alt="${esc(t(k))}">
          <figcaption>${esc(t(k))}</figcaption>
        </figure>`).join('\n');

// ---------- главная ----------
function buildHome(lang) {
  const t = tr(lang);
  let html = fillI18n(template, t);
  html = html.replace(new RegExp(`<option value="${lang}">`), `<option value="${lang}" selected>`);
  html = html.replace(/\{\{ALT_DASH\}\}/g, esc(t('capDash'))).replace('{{PHOTOS}}', photos(t));
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
  let bottom = anchors(home.slice(mainEnd));
  bottom = bottom.replace(/<span class="foot-langs">[\s\S]*?<\/span><span>Windows/, '<span class="foot-langs">' +
    LANGS.map((l) => `<a href="${pathOf(l, sub)}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${NAME[l]}</a>`).join(' · ') + '</span><span>Windows');
  bottom = bottom.replace(/<div class="sticky-cta">[\s\S]*?<\/div>\n/, `<div class="sticky-cta"><a href="${homePath}#download" class="btn btn-primary">🎁 <span data-i18n="heroCta">${esc(t('heroCta'))}</span></a></div>\n`);

  const card = ([icon, h, p]) => `<div class="card reveal"><div class="icon">${icon}</div><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`;
  const others = Object.entries(NICHES).filter(([k]) => k !== key)
    .map(([, o]) => `<a class="btn btn-ghost btn-sm" href="${pathOf(lang, o.slug)}">${o.icon} ${esc(o[lang].name)}</a>`).join('');
  const main = `<main id="main">
  <section class="hero niche-hero">
    <div class="grid-bg"></div>
    <div class="container center">
      <nav class="crumbs" aria-label="breadcrumb"><a href="${homePath}">Loya</a> <span aria-hidden="true">›</span> <span>${esc(d.name)}</span></nav>
      <h1 class="hero-title"><span>${esc(d.h1)} </span><span class="gold">${esc(d.h1gold)}</span></h1>
      <p class="hero-sub niche-lead">${esc(d.lead)}</p>
      <div class="hero-ctas niche-ctas">
        <a href="${homePath}#download" class="btn btn-primary">🎁 <span>${esc(t('heroCta'))}</span></a>
        <a href="${homePath}#pricing" class="btn btn-ghost"><span>${esc(t('navPricing'))}</span></a>
      </div>
      <div class="hero-note">${esc(t('heroNote'))}</div>
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
      ${key === 'cafe' ? `<div class="photo-grid niche-photos">\n${photos(t)}\n      </div>` : ''}
      <div class="niche-shot tour-frame reveal"><img src="/img/dashboard_${lang}.webp" alt="${esc(t('capDash'))}" loading="lazy" width="1600" height="1000"></div>
    </div>
  </section>

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
