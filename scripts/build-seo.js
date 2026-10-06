// Генератор SEO-страниц: из scripts/index.template.html и i18n.js собирает
// отдельные статические страницы на каждый язык, чтобы поисковики и соцсети видели
// готовый текст без JavaScript:
//   /          — English (x-default)
//   /ru/ /uk/ /sk/
// и обновляет sitemap.xml. Запуск:  node scripts/build-seo.js
// Результат (index.html, ru/, uk/, sk/, sitemap.xml) лежит в репозитории — после правки
// i18n.js или шаблона запустите скрипт и закоммитьте изменения.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://loya-loyalty.com';
const EMAIL = 'loya.loyalty.send@gmail.com';
const LANGS = ['en', 'ru', 'uk', 'sk'];
const LOCALE = { en: 'en_US', ru: 'ru_RU', uk: 'uk_UA', sk: 'sk_SK' };
const NAME = { en: 'English', ru: 'Русский', uk: 'Українська', sk: 'Slovenčina' };
const urlOf = (l) => (l === 'en' ? `${SITE}/` : `${SITE}/${l}/`);
const pathOf = (l) => (l === 'en' ? '/' : `/${l}/`);

global.window = {};
require(path.join(ROOT, 'i18n.js'));
const T = window.SITE_I18N;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const template = fs.readFileSync(path.join(__dirname, 'index.template.html'), 'utf8');
const missing = new Set();

function build(lang) {
  const t = (k) => {
    if (T[lang][k] !== undefined) return T[lang][k];
    missing.add(`${lang}:${k}`);
    return T.en[k] !== undefined ? T.en[k] : k;
  };
  let html = template;

  // 1. Готовый текст вместо data-i18n (JS потом подставит то же самое — мерцания нет)
  html = html.replace(/<([a-z0-9]+)((?:\s[^>]*?)?\sdata-i18n="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g,
    (m, tag, attrs, key) => `<${tag}${attrs}>${esc(t(key))}</${tag}>`);
  html = html.replace(/<([a-z0-9]+)((?:\s[^>]*?)?\sdata-i18n-ph="([^"]+)"[^>]*)>/g, (m, tag, attrs, key) =>
    `<${tag}${attrs.replace(/\splaceholder="[^"]*"/, '')} placeholder="${esc(t(key))}">`);
  html = html.replace(/<([a-z0-9]+)((?:\s[^>]*?)?\sdata-i18n-aria="([^"]+)"[^>]*)>/g, (m, tag, attrs, key) =>
    `<${tag}${attrs.replace(/\saria-label="[^"]*"/, '')} aria-label="${esc(t(key))}">`);
  html = html.replace(new RegExp(`<option value="${lang}">`), `<option value="${lang}" selected>`);

  // 2. Подписи к картинкам и тур
  html = html.replace(/\{\{ALT_DASH\}\}/g, esc(t('capDash')));
  html = html.replace('<p class="tour-cap" id="tour-cap"></p>', `<p class="tour-cap" id="tour-cap">${esc(t('capDash'))}</p>`);

  // 3. Ссылки на языковые версии (обычные <a> — их видят и поисковики)
  const langLinks = LANGS.map((l) => `<a href="${pathOf(l)}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${NAME[l]}</a>`).join(' · ');
  html = html.replace('{{LANGLINKS}}', langLinks).replace(/\{\{HOME\}\}/g, pathOf(lang)).replace(/\{\{LANG\}\}/g, lang);

  // 4. <head>: title, description, canonical, hreflang, Open Graph, Twitter, JSON-LD
  const title = t('metaTitle'), desc = t('metaDesc'), url = urlOf(lang);
  const faq = [];
  for (let i = 1; T[lang]['q' + i]; i++) {
    faq.push({ '@type': 'Question', name: t('q' + i), acceptedAnswer: { '@type': 'Answer', text: t('a' + i) } });
  }
  const offer = (name, price, descr) => ({ '@type': 'Offer', name, price, priceCurrency: 'EUR', url, ...(descr ? { description: descr } : {}) });
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Loya', url: `${SITE}/`, logo: `${SITE}/logo.png`,
      contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: EMAIL, availableLanguage: ['English', 'Slovak', 'Russian', 'Ukrainian'] } },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Loya', url: `${SITE}/`, inLanguage: lang },
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Loya', applicationCategory: 'BusinessApplication',
      operatingSystem: 'Windows 10, Windows 11', description: desc, url, image: `${SITE}/og-image.png`, inLanguage: lang,
      offers: [offer('Free', '0.00'), offer('Starter', '9.99'), offer('Pro', '19.99')] },
  ];
  if (faq.length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: lang, mainEntity: faq });

  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta name="robots" content="index,follow,max-image-preview:large">`,
    `<link rel="canonical" href="${url}">`,
    ...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${urlOf(l)}">`),
    `<link rel="alternate" hreflang="x-default" href="${urlOf('en')}">`,
    `<meta property="og:site_name" content="Loya">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:locale" content="${LOCALE[lang]}">`,
    ...LANGS.filter((l) => l !== lang).map((l) => `<meta property="og:locale:alternate" content="${LOCALE[l]}">`),
    `<meta property="og:image" content="${SITE}/og-image.png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${SITE}/og-image.png">`,
    `<meta name="theme-color" content="#07080b">`,
    ...ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`),
  ].join('\n');
  html = html.replace('<!--SEO-->', head)
    .replace('<!--PRELOAD-->', `<link rel="preload" as="image" href="/img/dashboard_${lang}.webp">`);
  return html;
}

for (const lang of LANGS) {
  const out = lang === 'en' ? path.join(ROOT, 'index.html') : path.join(ROOT, lang, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, build(lang));
  console.log('written', path.relative(ROOT, out));
}
if (missing.size) console.warn('missing i18n keys (fallback used):', [...missing].join(', '));

// sitemap.xml с hreflang-связями
const today = new Date().toISOString().slice(0, 10);
const alt = LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${urlOf(l)}"/>`).join('\n')
  + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${urlOf('en')}"/>`;
const entries = LANGS.map((l) => `  <url>\n    <loc>${urlOf(l)}</loc>\n    <lastmod>${today}</lastmod>\n${alt}\n  </url>`);
entries.push(`  <url>\n    <loc>${SITE}/privacy.html</loc>\n    <lastmod>${today}</lastmod>\n  </url>`);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`);
console.log('written sitemap.xml');
