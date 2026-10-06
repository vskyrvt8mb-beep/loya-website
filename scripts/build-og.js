// Картинки для соцсетей и мессенджеров (Open Graph, 1200×630) на каждом языке: og-image_<lang>.png.
// Нужен playwright-core и Chromium (в зависимости сайта не входит — это инструмент разработчика):
//   npm i --no-save playwright-core && node scripts/build-og.js
// Путь к Chromium можно задать переменной CHROMIUM_PATH.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright-core');

const ROOT = path.join(__dirname, '..');
global.window = {};
require(path.join(ROOT, 'i18n.js'));
const T = window.SITE_I18N;
const BADGE = {
  ru: '14 дней бесплатно · от €9.99/мес',
  uk: '14 днів безкоштовно · від €9.99/міс',
  sk: '14 dní zadarmo · od 9,99 €/mes.',
  en: '14 days free · from €9.99/mo',
};
const file = (p) => 'file://' + path.join(ROOT, p);

function page(lang) {
  const t = T[lang];
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: Manrope; font-weight: 200 800; src: url(${file('fonts/manrope-latin-wght-normal.woff2')}); unicode-range: U+0000-00FF, U+20AC, U+2000-206F; }
  @font-face { font-family: Manrope; font-weight: 200 800; src: url(${file('fonts/manrope-latin-ext-wght-normal.woff2')}); unicode-range: U+0100-02AF; }
  @font-face { font-family: Manrope; font-weight: 200 800; src: url(${file('fonts/manrope-cyrillic-wght-normal.woff2')}); unicode-range: U+0400-045F, U+0490-0491; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; overflow: hidden; font-family: Manrope, sans-serif; color: #f4efe4;
    background: radial-gradient(700px 420px at 18% 0%, rgba(227,184,87,.22), transparent 70%), linear-gradient(160deg, #0d0f15, #07080b 60%); }
  .left { position: absolute; left: 70px; top: 70px; width: 600px; }
  .brand { display: flex; align-items: center; gap: 18px; font-weight: 700; font-size: 32px; margin-bottom: 48px; }
  .brand img { width: 64px; height: 64px; border-radius: 16px; }
  h1 { font-weight: 800; font-size: 64px; line-height: 1.06; letter-spacing: -.02em; }
  h1 span { display: block; }
  .gold { background: linear-gradient(135deg, #f7d88f, #e3b857 45%, #b8862d); -webkit-background-clip: text; color: transparent; }
  p { margin-top: 26px; font-size: 25px; color: rgba(244,239,228,.7); font-weight: 600; }
  .badge { display: inline-block; margin-top: 34px; padding: 18px 28px; border-radius: 18px; font-weight: 800; font-size: 24px;
    color: #1a1204; background: linear-gradient(135deg, #f7d88f, #e3b857 45%, #b8862d); }
  .shot { position: absolute; left: 700px; top: 100px; width: 640px; border-radius: 18px; border: 8px solid #1b1f29;
    box-shadow: 0 30px 80px rgba(0,0,0,.6); transform: perspective(1400px) rotateY(-14deg); transform-origin: left center; }
  </style></head><body>
  <img class="shot" src="${file(`img/dashboard_${lang}.webp`)}">
  <div class="left">
    <div class="brand"><img src="${file('logo.png')}">Loya</div>
    <h1><span>${t.heroTitle1}</span><span class="gold">${t.heroTitle2}</span></h1>
    <p>${String(t.footTag).replace(/\.$/, '')}</p>
    <div class="badge">${BADGE[lang]}</div>
  </div></body></html>`;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  const tmp = path.join(ROOT, 'scripts', '.og.html');
  for (const lang of Object.keys(BADGE)) {
    fs.writeFileSync(tmp, page(lang));
    await tab.goto('file://' + tmp);
    await tab.evaluate(() => document.fonts.ready);
    await tab.waitForTimeout(200);
    await tab.screenshot({ path: path.join(ROOT, `og-image_${lang}.png`) });
    console.log('written', `og-image_${lang}.png`);
  }
  fs.unlinkSync(tmp);
  fs.copyFileSync(path.join(ROOT, 'og-image_en.png'), path.join(ROOT, 'og-image.png'));
  await browser.close();
})();
