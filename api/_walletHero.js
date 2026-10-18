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

const { buildHeroSvg } = require('./_cardModel');

function renderHeroPng(args, width) {
  const svg = buildHeroSvg(args);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width || W },
    font: { fontFiles: [FONT_BOLD, FONT_REG], loadSystemFonts: false, defaultFontFamily: 'Carlito' }
  });
  return resvg.render().asPng();
}

module.exports = { renderHeroPng, buildHeroSvg };
