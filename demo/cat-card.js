// cat-card.js — «открытка с котиком»: накладывает QR-код клиента поверх одного
// из готовых фоновых рисунков. Никаких сторонних библиотек — всё через
// стандартный <canvas>, который уже встроен в Electron/Chromium.
//
// Список рисунков теперь управляется из настроек (вкладка «Дизайн карточек») —
// хранится в базе данных, а не зашит в коде. Здесь только выбор одного из них
// для конкретной карты и сама сборка открытки.
//
// Два вида шаблонов:
// 1) «Котики» (has_text_overlay = 0) — название бренда уже нарисовано художником
//    прямо на картинке, ничего сверху дорисовывать не нужно.
// 2) Строгие карточки под нишу бизнеса (has_text_overlay = 1) — на картинке только
//    фон и мотив, название бренда дорисовывается поверх динамически здесь же, в
//    canvas — поэтому одна и та же картинка подходит под любое название бизнеса.

// Небольшой кэш на время сессии — чтобы не дёргать базу при каждом открытии
// карточки клиента. Сбрасывается сам при перезапуске приложения; после
// добавления/удаления карточки в настройках вызывается invalidateCardTemplatesCache().
const cardTemplatesCache = {};

function invalidateCardTemplatesCache(key) {
  if (key) delete cardTemplatesCache[key];
  else Object.keys(cardTemplatesCache).forEach(k => delete cardTemplatesCache[k]);
}

async function getCardTemplatesForLang(lang) {
  const key = lang || 'ru';
  if (cardTemplatesCache[key]) return cardTemplatesCache[key];
  let list = await window.api.cardTemplatesList(key);
  if ((!list || list.length === 0) && key !== 'ru') {
    // для этого языка ничего не добавлено — используем русский набор как запасной
    list = await window.api.cardTemplatesList('ru');
  }
  cardTemplatesCache[key] = list || [];
  return cardTemplatesCache[key];
}

async function getCardTemplatesForNiche(nicheId) {
  const key = 'niche:' + nicheId;
  if (cardTemplatesCache[key]) return cardTemplatesCache[key];
  const list = await window.api.cardTemplatesListByNiche(nicheId);
  cardTemplatesCache[key] = list || [];
  return cardTemplatesCache[key];
}

// ---------- Карточки-заглушки под каждый вид бизнеса ----------
// Нарисованы нами (src/niche-cards/<ниша>.png, 1024×1024) и используются автоматически,
// пока бизнес не добавит свои картинки. На заглушке нет текста — название заведения и
// подпись «Карта лояльности» на языке клиента дорисовываются здесь, в canvas.
// Белая панель под QR у всех заглушек одинаковая: центр (0.5, 0.701), QR — 40% ширины.
const NICHE_PLACEHOLDER_STYLE = {
  coffee:   { text: '#f5e6d3', sub: 'rgba(232,195,154,0.85)' },
  bakery:   { text: '#6b3a12', sub: 'rgba(138,79,28,0.75)' },
  barber:   { text: '#f3efe6', sub: 'rgba(214,178,94,0.9)' },
  nails:    { text: '#7a1f43', sub: 'rgba(176,48,90,0.75)' },
  spa:      { text: '#244a36', sub: 'rgba(63,111,85,0.8)' },
  tattoo:   { text: '#f3eefe', sub: 'rgba(201,168,255,0.85)' },
  fitness:  { text: '#ffffff', sub: 'rgba(62,230,184,0.9)' },
  petgroom: { text: '#4a2688', sub: 'rgba(106,63,181,0.75)' },
  photo:    { text: '#f7f3ea', sub: 'rgba(242,184,75,0.9)' },
  clothing: { text: '#1d1b18', sub: 'rgba(150,122,68,0.95)' },
  sushi:    { text: '#ffffff', sub: 'rgba(255,122,89,0.95)' },
  pizza:    { text: '#fff3dc', sub: 'rgba(246,196,83,0.95)' },
  grocery:  { text: '#f2fbe9', sub: 'rgba(160,235,120,0.9)' },
  travel:   { text: '#ffffff', sub: 'rgba(255,214,120,0.95)' },
  other:    { text: '#ffffff', sub: 'rgba(255,209,102,0.9)' }
};
const PLACEHOLDER_SUBTITLE = { ru: 'Карта лояльности', uk: 'Картка лояльності', sk: 'Vernostná karta', en: 'Loyalty card' };

async function nichePlaceholderTemplate(nicheId, lang) {
  const id = NICHE_PLACEHOLDER_STYLE[nicheId] ? nicheId : 'other';
  const style = NICHE_PLACEHOLDER_STYLE[id];
  const file = await window.api.cardTemplatePlaceholder(id);
  if (!file) return null;
  return {
    id: null, builtin: true, niche: id,
    file,
    qrXPct: 0.5, qrYPct: 0.7012, qrSizePct: 0.40, qrCornerRadiusPct: 0.04,
    hasTextOverlay: true,
    textStyle: { color: style.text, subColor: style.sub, subtitle: PLACEHOLDER_SUBTITLE[lang] || PLACEHOLDER_SUBTITLE.ru, y: 0.148, subY: 0.205 }
  };
}

function rowToTemplate(row, extra) {
  return Object.assign({ id: row.id, file: row.dataUrl, qrXPct: row.qrXPct, qrYPct: row.qrYPct, qrSizePct: row.qrSizePct, qrCornerRadiusPct: row.qrCornerRadiusPct || 0, hasTextOverlay: !!row.hasTextOverlay }, extra || {});
}

// Выбирает картинку для конкретной карты. Строго в рамках текущего вида бизнеса:
// 1) свои картинки бизнеса во вкладке ниши (если есть);
// 2) иначе свои картинки на языке клиента (только загруженные для ЭТОЙ ниши);
// 3) иначе — наша карточка-заглушка этой ниши с названием заведения.
// Картинки, добавленные при другой нише (например, груминг), сюда никогда не попадают —
// база отдаёт только шаблоны текущей ниши. Закреплённый за картой шаблон используется,
// только если он всё ещё в пуле этой ниши; иначе выбор делается заново.
async function pickCatTemplate(code, lang, nicheId, existingTemplateId) {
  let pool = null;
  if (nicheId) {
    const nicheTemplates = await getCardTemplatesForNiche(nicheId);
    if (nicheTemplates && nicheTemplates.some(r => r.dataUrl)) pool = nicheTemplates;
  }
  if (!pool) {
    const templates = await getCardTemplatesForLang(lang);
    if (templates && templates.some(r => r.dataUrl)) pool = templates;
  }
  if (!pool) return nichePlaceholderTemplate(nicheId, lang);

  if (existingTemplateId) {
    const found = pool.find(row => row.id === existingTemplateId);
    if (found && found.dataUrl) return rowToTemplate(found);
  }
  const withImages = pool.filter(row => row.dataUrl);
  const row = withImages[Math.floor(Math.random() * withImages.length)];
  return rowToTemplate(row, { isNewPick: true });
}

// Подбирает размер шрифта так, чтобы название влезло в заданную ширину.
function fitFontSize(ctx, text, weight, maxWidth, startPx, minPx, family) {
  let size = startPx;
  while (size > minPx) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Собирает открытку: фон-шаблон + QR-код (белый фон, чёрный QR — для
// надёжного считывания поверх рисунка) в нужном месте, и, если шаблон это
// предполагает, название бренда сверху. Возвращает PNG data URL.
// Если template === null (нигде нет ни одной карточки) — возвращает null,
// вызывающий код в этом случае должен использовать обычный QR.
async function composeCatCard(code, template, brandName) {
  if (!template) return null;
  const qrDataUrl = await window.api.qrDataUrl(code, { width: 500, bgColor: '#ffffff' });
  const [cardImg, qrImg] = await Promise.all([loadImage(template.file), loadImage(qrDataUrl)]);

  const canvas = document.createElement('canvas');
  canvas.width = cardImg.naturalWidth;
  canvas.height = cardImg.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(cardImg, 0, 0);

  if (template.hasTextOverlay && brandName && template.textStyle) {
    // Заглушка ниши: название заведения крупно + подпись на языке клиента.
    const ts = template.textStyle;
    const family = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const size = fitFontSize(ctx, brandName, 800, canvas.width * 0.8, Math.round(canvas.width * 0.085), Math.round(canvas.width * 0.04), family);
    ctx.font = `800 ${size}px ${family}`;
    ctx.fillStyle = ts.color;
    ctx.fillText(brandName, canvas.width / 2, canvas.height * ts.y);
    ctx.font = `700 ${Math.round(canvas.width * 0.03)}px ${family}`;
    ctx.fillStyle = ts.subColor;
    const sub = (ts.subtitle || '').toUpperCase().split('').join('\u200A');
    ctx.fillText(sub, canvas.width / 2, canvas.height * ts.subY);
  } else if (template.hasTextOverlay && brandName) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.font = `700 ${Math.round(canvas.width * 0.072)}px sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 6;
    ctx.fillText(brandName, canvas.width / 2, canvas.height * 0.145, canvas.width * 0.86);
    ctx.shadowBlur = 0;
  }

  const qrSize = template.qrSizePct * canvas.width;
  const qrX = template.qrXPct * canvas.width - qrSize / 2;
  const qrY = template.qrYPct * canvas.height - qrSize / 2;
  if (template.qrCornerRadiusPct > 0) {
    // Скругляем угол через clip-путь — сам QR-код при этом остаётся нетронутым,
    // просто не рисуется в "отрезанных" уголках квадрата.
    const radius = template.qrCornerRadiusPct * qrSize;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(qrX + radius, qrY);
    ctx.arcTo(qrX + qrSize, qrY, qrX + qrSize, qrY + qrSize, radius);
    ctx.arcTo(qrX + qrSize, qrY + qrSize, qrX, qrY + qrSize, radius);
    ctx.arcTo(qrX, qrY + qrSize, qrX, qrY, radius);
    ctx.arcTo(qrX, qrY, qrX + qrSize, qrY, radius);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    ctx.restore();
  } else {
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  }

  return canvas.toDataURL('image/png');
}
