// Конструктор карты Loya на главной сайта: посетитель собирает карту лояльности (стиль, логотип, цвета,
// значки штампов, расположение, праздник, фото) и сразу видит её в Google и Apple Wallet.
// Рисует тот же модуль карты, что и сервер, и программа (api/_cardModel.js → /js/card-model.js), поэтому
// превью = настоящая карта гостя. Готовый дизайн переносится в программу кодом «LOYA-DESIGN:…»
// (Настройки → Карты в Wallet → «Дизайн с сайта»).
// Исходник: builder.src.js. scripts/build-seo.js подставляет данные (/*BLD_DATA*/) и пишет builder.js.
(function () {
  'use strict';
  const root = document.getElementById('bld');
  if (!root || !window.LoyaCard) return;
  const C = window.LoyaCard;
  const D = /*BLD_DATA*/{};
  const lang = (window.loyaLang && window.loyaLang()) || document.documentElement.lang || 'en';
  const L = ['ru', 'uk', 'sk', 'en'].includes(lang) ? lang : 'en';

  // ---------- тексты ----------
  const TX = {
    ru: {
      tabStyle: 'Стиль', tabBrand: 'Заведение', tabStamps: 'Штампы', tabHoliday: 'Праздник и фото',
      presets: 'Готовые стили', presetsHint: 'Одно нажатие — цвет, значки и расположение. Всё можно поправить дальше.',
      name: 'Название заведения', nameDef: 'Кофейня «Лиса»', niche: 'Вид бизнеса',
      logo: 'Логотип', logoPick: 'Загрузить логотип', logoChange: 'Заменить', logoRemove: 'Убрать', logoDrop: 'PNG, JPG или SVG — можно перетащить сюда', logoMode: 'Что на картинке карты', logoSize: 'Размер логотипа',
      cardColor: 'Цвет карты', accent: 'Фирменный цвет', accentHint: 'Цвет кружков штампов. В программе это «Цвет кнопок» в теме оформления.',  custom: 'Свой цвет',
      stampIcon: 'Значок штампа', rewardIcon: 'Значок подарка — последний кружок', stampColor: 'Цвет штампов', auto: 'Авто',
      count: 'Штампов до подарка', arrange: 'Расположение штампов', label: 'Подпись счётчика', labelPh: 'Например: Кофе, Лапки, Бокалы',
      season: 'Праздник или сезон', seasonHint: '«По календарю» — карта сама меняет оформление к Рождеству, 8 Марта, Пасхе, Хэллоуину…',
      photo: 'Фото на всю полосу', photoPick: 'Загрузить фото', photoRemove: 'Убрать фото', photoHint: 'Фото зала, витрины или напитка — штампы встанут в ряд снизу.',
      google: 'Google Wallet', apple: 'Apple Wallet', visit: 'Отметить визит', reward: '🎁 Подарок готов! Гость получит его при следующем визите', again: 'Ещё раз',
      client: 'Анна К.', cardType: 'Карта лояльности', clientLbl: 'Гость', previewNote: 'Так карта выглядит в телефоне гостя. Google и Apple рисуют её немного по-своему.',
      png: 'Скачать картинку', link: 'Ссылка на дизайн', linkCopied: 'Ссылка скопирована — отправьте её партнёру или себе', reset: 'Начать заново',
      ctaTitle: 'Нравится? Эта карта — ваша', ctaSub: 'Скачайте Loya бесплатно и перенесите дизайн одним кодом — гости получат её в Wallet уже сегодня.',
      ctaGet: 'Скачать Loya бесплатно', ctaMove: 'Перенести дизайн в Loya',
      mvTitle: 'Перенесите дизайн в программу', mvStep1: 'Скопируйте код ниже.', mvStep2: 'В Loya откройте «Настройки → Карты в Wallet».', mvStep3: 'Нажмите «🌐 Дизайн с сайта» — код вставится сам. Проверьте и нажмите «Сохранить».',
      mvCopy: 'Скопировать код', mvCopied: 'Код скопирован ✓', mvNoApp: 'Ещё нет Loya?', mvClose: 'Закрыть',
      imgErr: 'Не удалось открыть картинку. Попробуйте PNG или JPG.', live: 'Живое превью', sampleShare: 'Сделано в конструкторе Loya'
    },
    uk: {
      tabStyle: 'Стиль', tabBrand: 'Заклад', tabStamps: 'Штампи', tabHoliday: 'Свято й фото',
      presets: 'Готові стилі', presetsHint: 'Одне натискання — колір, значки й розташування. Усе можна підправити далі.',
      name: 'Назва закладу', nameDef: 'Кав’ярня «Лисиця»', niche: 'Вид бізнесу',
      logo: 'Логотип', logoPick: 'Завантажити логотип', logoChange: 'Замінити', logoRemove: 'Прибрати', logoDrop: 'PNG, JPG або SVG — можна перетягнути сюди', logoMode: 'Що на картинці картки', logoSize: 'Розмір логотипа',
      cardColor: 'Колір картки', accent: 'Фірмовий колір', accentHint: 'Колір кружечків штампів. У програмі це «Колір кнопок» у темі оформлення.',  custom: 'Свій колір',
      stampIcon: 'Значок штампа', rewardIcon: 'Значок подарунка — останній кружечок', stampColor: 'Колір штампів', auto: 'Авто',
      count: 'Штампів до подарунка', arrange: 'Розташування штампів', label: 'Підпис лічильника', labelPh: 'Наприклад: Кава, Лапки, Келихи',
      season: 'Свято або сезон', seasonHint: '«За календарем» — картка сама змінює оформлення до Різдва, 8 Березня, Великодня, Гелловіну…',
      photo: 'Фото на всю смугу', photoPick: 'Завантажити фото', photoRemove: 'Прибрати фото', photoHint: 'Фото залу, вітрини чи напою — штампи стануть у ряд унизу.',
      google: 'Google Wallet', apple: 'Apple Wallet', visit: 'Відмітити візит', reward: '🎁 Подарунок готовий! Гість отримає його під час наступного візиту', again: 'Ще раз',
      client: 'Анна К.', cardType: 'Картка лояльності', clientLbl: 'Гість', previewNote: 'Так картка виглядає в телефоні гостя. Google і Apple малюють її трохи по-своєму.',
      png: 'Завантажити картинку', link: 'Посилання на дизайн', linkCopied: 'Посилання скопійовано — надішліть його партнеру або собі', reset: 'Почати знову',
      ctaTitle: 'Подобається? Ця картка — ваша', ctaSub: 'Завантажте Loya безкоштовно й перенесіть дизайн одним кодом — гості отримають її у Wallet уже сьогодні.',
      ctaGet: 'Завантажити Loya безкоштовно', ctaMove: 'Перенести дизайн у Loya',
      mvTitle: 'Перенесіть дизайн у програму', mvStep1: 'Скопіюйте код нижче.', mvStep2: 'У Loya відкрийте «Налаштування → Картки у Wallet».', mvStep3: 'Натисніть «🌐 Дизайн із сайту» — код вставиться сам. Перевірте й натисніть «Зберегти».',
      mvCopy: 'Скопіювати код', mvCopied: 'Код скопійовано ✓', mvNoApp: 'Ще немає Loya?', mvClose: 'Закрити',
      imgErr: 'Не вдалося відкрити картинку. Спробуйте PNG або JPG.', live: 'Живий перегляд', sampleShare: 'Зроблено в конструкторі Loya'
    },
    sk: {
      tabStyle: 'Štýl', tabBrand: 'Prevádzka', tabStamps: 'Pečiatky', tabHoliday: 'Sviatok a fotka',
      presets: 'Hotové štýly', presetsHint: 'Jedno kliknutie — farba, ikony a rozloženie. Všetko sa dá ďalej upraviť.',
      name: 'Názov prevádzky', nameDef: 'Kaviareň Líška', niche: 'Druh podnikania',
      logo: 'Logo', logoPick: 'Nahrať logo', logoChange: 'Zmeniť', logoRemove: 'Odstrániť', logoDrop: 'PNG, JPG alebo SVG — dá sa sem pretiahnuť', logoMode: 'Čo je na obrázku karty', logoSize: 'Veľkosť loga',
      cardColor: 'Farba karty', accent: 'Firemná farba', accentHint: 'Farba krúžkov pečiatok. V programe je to „Farba tlačidiel“ vo vzhľade.',  custom: 'Vlastná farba',
      stampIcon: 'Ikona pečiatky', rewardIcon: 'Ikona darčeka — posledný krúžok', stampColor: 'Farba pečiatok', auto: 'Auto',
      count: 'Pečiatok do darčeka', arrange: 'Rozloženie pečiatok', label: 'Popis počítadla', labelPh: 'Napríklad: Káva, Labky, Poháre',
      season: 'Sviatok alebo sezóna', seasonHint: '„Podľa kalendára“ — karta sama mení vzhľad na Vianoce, MDŽ, Veľkú noc, Halloween…',
      photo: 'Fotka na celý pás', photoPick: 'Nahrať fotku', photoRemove: 'Odstrániť fotku', photoHint: 'Fotka priestoru, vitríny alebo nápoja — pečiatky budú v rade dole.',
      google: 'Google Wallet', apple: 'Apple Wallet', visit: 'Zaznamenať návštevu', reward: '🎁 Darček je pripravený! Hosť ho dostane pri ďalšej návšteve', again: 'Znova',
      client: 'Anna K.', cardType: 'Vernostná karta', clientLbl: 'Hosť', previewNote: 'Takto vyzerá karta v telefóne hosťa. Google a Apple ju kreslia trochu po svojom.',
      png: 'Stiahnuť obrázok', link: 'Odkaz na dizajn', linkCopied: 'Odkaz skopírovaný — pošlite ho partnerovi alebo sebe', reset: 'Začať odznova',
      ctaTitle: 'Páči sa? Táto karta je vaša', ctaSub: 'Stiahnite si Loya zadarmo a preneste dizajn jedným kódom — hostia ju dostanú do Walletu ešte dnes.',
      ctaGet: 'Stiahnuť Loya zadarmo', ctaMove: 'Preniesť dizajn do Loya',
      mvTitle: 'Preneste dizajn do programu', mvStep1: 'Skopírujte kód nižšie.', mvStep2: 'V Loya otvorte „Nastavenia → Karty vo Wallete“.', mvStep3: 'Kliknite na „🌐 Dizajn z webu“ — kód sa vloží sám. Skontrolujte a kliknite na „Uložiť“.',
      mvCopy: 'Skopírovať kód', mvCopied: 'Kód skopírovaný ✓', mvNoApp: 'Ešte nemáte Loya?', mvClose: 'Zavrieť',
      imgErr: 'Obrázok sa nepodarilo otvoriť. Skúste PNG alebo JPG.', live: 'Živý náhľad', sampleShare: 'Vytvorené v konštruktore Loya'
    },
    en: {
      tabStyle: 'Style', tabBrand: 'Your venue', tabStamps: 'Stamps', tabHoliday: 'Holiday & photo',
      presets: 'Ready styles', presetsHint: 'One tap sets colour, icons and layout. Fine-tune everything next.',
      name: 'Venue name', nameDef: 'Fox Coffee', niche: 'Business type',
      logo: 'Logo', logoPick: 'Upload logo', logoChange: 'Replace', logoRemove: 'Remove', logoDrop: 'PNG, JPG or SVG — or drop it here', logoMode: 'What the card picture shows', logoSize: 'Logo size',
      cardColor: 'Card colour', accent: 'Brand colour', accentHint: 'The colour of the stamp circles. In the app it is the “Button colour” in Theme.',  custom: 'Custom colour',
      stampIcon: 'Stamp icon', rewardIcon: 'Reward icon — the last circle', stampColor: 'Stamp colour', auto: 'Auto',
      count: 'Stamps to a reward', arrange: 'Stamp layout', label: 'Counter label', labelPh: 'E.g. Coffees, Paws, Glasses',
      season: 'Holiday or season', seasonHint: '“By calendar” changes the look by itself for Christmas, Valentine’s, Easter, Halloween…',
      photo: 'Full-width photo', photoPick: 'Upload photo', photoRemove: 'Remove photo', photoHint: 'A photo of your place, counter or drink — stamps line up at the bottom.',
      google: 'Google Wallet', apple: 'Apple Wallet', visit: 'Add a visit', reward: '🎁 Reward ready! The guest gets it on the next visit', again: 'Again',
      client: 'Anna K.', cardType: 'Loyalty card', clientLbl: 'Guest', previewNote: 'This is how the card looks on a guest’s phone. Google and Apple draw it slightly differently.',
      png: 'Download picture', link: 'Design link', linkCopied: 'Link copied — send it to a partner or yourself', reset: 'Start over',
      ctaTitle: 'Like it? This card is yours', ctaSub: 'Download Loya for free and move the design over with one code — guests get it in Wallet today.',
      ctaGet: 'Download Loya for free', ctaMove: 'Move the design to Loya',
      mvTitle: 'Move the design to the app', mvStep1: 'Copy the code below.', mvStep2: 'In Loya open “Settings → Wallet cards”.', mvStep3: 'Click “🌐 Design from website” — the code pastes itself. Check it and click “Save”.',
      mvCopy: 'Copy code', mvCopied: 'Code copied ✓', mvNoApp: 'No Loya yet?', mvClose: 'Close',
      imgErr: 'Could not open the picture. Try PNG or JPG.', live: 'Live preview', sampleShare: 'Made with the Loya card builder'
    }
  };
  const t = (k) => (TX[L] && TX[L][k] !== undefined ? TX[L][k] : TX.en[k]);
  const NICHES = {
    ru: { coffee: 'Кофейня', bakery: 'Пекарня', barber: 'Барбершоп', nails: 'Маникюр', spa: 'Салон красоты', fitness: 'Фитнес', petgroom: 'Груминг', photo: 'Фотостудия', clothing: 'Магазин', other: 'Другое' },
    uk: { coffee: 'Кав’ярня', bakery: 'Пекарня', barber: 'Барбершоп', nails: 'Манікюр', spa: 'Салон краси', fitness: 'Фітнес', petgroom: 'Грумінг', photo: 'Фотостудія', clothing: 'Магазин', other: 'Інше' },
    sk: { coffee: 'Kaviareň', bakery: 'Pekáreň', barber: 'Barbershop', nails: 'Manikúra', spa: 'Salón krásy', fitness: 'Fitness', petgroom: 'Strihanie psov', photo: 'Fotoštúdio', clothing: 'Obchod', other: 'Iné' },
    en: { coffee: 'Coffee shop', bakery: 'Bakery', barber: 'Barbershop', nails: 'Nail studio', spa: 'Beauty salon', fitness: 'Fitness', petgroom: 'Pet grooming', photo: 'Photo studio', clothing: 'Shop', other: 'Other' }
  };
  const ACCENTS = ['#e3b857', '#ff8a3d', '#e2574c', '#ff4f86', '#9b6bff', '#4fc3f7', '#2ec5a0', '#7cb342', '#ffffff'];
  const COUNTS = [6, 8, 10, 12];

  // ---------- состояние ----------
  const DEF = () => ({ v: 1, name: t('nameDef'), niche: 'coffee', color: '#e3b857', bg: '#20252d', count: 10, filled: 6, tab: 'google', step: 'style',
    look: { stamp: 'coffee', reward: 'gift', stampColor: '', arrange: 'row', season: '', label: '', layout: '', logoMode: '', logoSize: 96 }, logo: null, photo: null, preset: '' });
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('loya_bld') || 'null'); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem('loya_bld', JSON.stringify(v)); } catch (e) { try { localStorage.setItem('loya_bld', JSON.stringify({ ...v, logo: null, photo: null })); } catch (e2) { /* нет места */ } } }
  };
  const hexOk = (s) => /^#[0-9a-f]{6}$/i.test(String(s || ''));
  const imgOk = (s) => typeof s === 'string' && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 900000;
  function sanitize(o) {
    const d = DEF(); o = o && typeof o === 'object' ? o : {};
    const look = C.cleanLook(o.look || {});
    return {
      ...d,
      name: String(o.name == null ? d.name : o.name).replace(/[\u0000-\u001f<>]/g, '').slice(0, 32),
      niche: NICHES.en[o.niche] ? o.niche : d.niche,
      color: hexOk(o.color) ? o.color : d.color, bg: hexOk(o.bg) ? o.bg : d.bg,
      count: COUNTS.includes(Number(o.count)) ? Number(o.count) : d.count,
      filled: Math.max(0, Math.min(COUNTS.includes(Number(o.count)) ? Number(o.count) : d.count, o.filled == null || o.filled === '' || !Number.isFinite(Number(o.filled)) ? d.filled : Math.round(Number(o.filled)))),
      tab: o.tab === 'apple' ? 'apple' : 'google', step: ['style', 'brand', 'stamps', 'holiday'].includes(o.step) ? o.step : 'style',
      look: { ...d.look, stamp: look.stamp || '', reward: look.reward || '', stampColor: look.stampColor || '', arrange: look.arrange || '', season: look.season || '', label: look.label || '', layout: look.layout || '', logoMode: look.logoMode || '', logoSize: look.logoSize || d.look.logoSize },
      logo: imgOk(o.logo) ? o.logo : null, photo: imgOk(o.photo) ? o.photo : null, preset: String(o.preset || '').slice(0, 20)
    };
  }
  const b64u = { enc: (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), dec: (s) => decodeURIComponent(escape(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')))) };
  let S = sanitize(store.get());
  // Ссылка на дизайн (#card=…) — без картинок, их в ссылку не кладём
  const fromHash = () => { const m = /[#&]card=([A-Za-z0-9_-]+)/.exec(location.hash); if (!m) return false; try { S = sanitize({ ...JSON.parse(b64u.dec(m[1])), logo: null, photo: null }); return true; } catch (e) { return false; } };
  const opened = fromHash();
  let saveT = null;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => store.set(S), 300); };

  // ---------- карта ----------
  const isLight = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 > 0.62; };
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const lookOf = (st) => { const k = { ...st.look }; if (!st.logo) { delete k.logoMode; delete k.logoSize; } if (k.logoMode && k.logoMode !== 'name') { const s = Math.max(48, Math.min(120, Number(k.logoSize) || 96)); k.logoSize = s; k.logoX = null; k.logoY = Math.round(Math.max(62, s / 2 + 14)); } else { delete k.logoMode; delete k.logoSize; } if (!st.photo) delete k.layout; else k.layout = 'photo'; return C.cleanLook(k); };
  const brandOf = (st) => ({ name: st.name || t('nameDef'), color: st.color, currency: 'EUR', ...lookOf(st), logoImage: st.logo || '' });
  const cardOf = (st) => ({ type: 'stamp', stamp_count: st.filled, stamp_target: st.count, client_name: t('client'), title: '', lang: L });
  function heroSvg(st, card) {
    let svg = C.buildHeroSvg({ card: card || cardOf(st), brand: brandOf(st), niche: st.niche, lang: L, bgImage: st.photo || null, showProgress: true });
    return svg.replace(/font-family="Carlito"/g, 'font-family="Carlito, Calibri, \'Segoe UI\', Manrope, Arial, sans-serif"');
  }
  const svgUrl = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  // Декоративный QR (не настоящий код)
  const QR = (() => {
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const n = 25, cell = []; const fin = (x, y) => `<path d="M${x} ${y}h7v7h-7z M${x + 1} ${y + 1}v5h5v-5z" fill-rule="evenodd"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
    const inFinder = (x, y) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inFinder(x, y) && rnd() > 0.52) cell.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><g fill="#111">${fin(0, 0)}${fin(n - 7, 0)}${fin(0, n - 7)}${cell.join('')}</g></svg>`);
  })();
  function passHtml(st) {
    const card = cardOf(st), bg = st.bg, light = isLight(bg);
    const fg = light ? '#141414' : '#ffffff', sub = light ? 'rgba(20,20,20,.62)' : 'rgba(255,255,255,.66)';
    const M = C.passModel(card, brandOf(st), L);
    const logo = (cls) => st.logo ? `<span class="${cls}" style="background-image:url('${st.logo}')"></span>` : `<span class="${cls} bp-logo-l" style="background:${st.color};color:${isLight(st.color) ? '#141414' : '#fff'}">${esc((st.name || 'L').trim().charAt(0).toUpperCase() || 'L')}</span>`;
    const hero = `<div class="bp-hero"><img alt="" draggable="false" src="${svgUrl(heroSvg(st, card))}"></div>`;
    const qr = `<div class="bp-qr"><img alt="" src="${QR}"></div>`;
    if (st.tab !== 'apple') {
      const mod = (m) => `<span class="bp-mod"><small style="color:${sub}">${esc(m.header)}</small><b>${esc(m.body)}</b></span>`;
      return `<div class="bp bp-g" style="background:${bg};color:${fg}">
        <div class="bp-g-top">${logo('bp-logo bp-logo-c')}<span>${esc(M.cardTitle)}</span></div>
        <div class="bp-g-sub" style="color:${sub}">${esc(M.subheader)}</div>
        <div class="bp-g-name">${esc(M.header)}</div>
        <div class="bp-mods">${M.modules.filter(m => m.id !== 'rule').slice(0, 4).map(mod).join('')}</div>
        ${qr}${hero}</div>`;
    }
    const lab = light ? '#464646' : st.color;
    const amod = (m) => `<span class="bp-mod"><small style="color:${lab}">${esc(m.header)}</small><b>${esc(m.body)}</b></span>`;
    const heads = M.modules.filter(m => ['progress', 'discount', 'bonus'].includes(m.id)).slice(0, 2);
    return `<div class="bp bp-a" style="background:${bg};color:${fg}">
      <div class="bp-a-top">${logo('bp-logo bp-logo-s')}<span class="bp-a-name">${esc(M.cardTitle)}</span><span class="bp-a-heads">${heads.map(amod).join('')}</span></div>
      ${hero}
      <div class="bp-a-fields">${amod({ header: t('clientLbl'), body: M.header })}${amod({ header: M.typeName, body: t('cardType') })}</div>
      ${qr}</div>`;
  }

  // ---------- значки ----------
  const icon = (id, knock) => `<svg viewBox="0 0 24 24" aria-hidden="true">${(C.STAMP_ICONS[id] || C.STAMP_ICONS.check).replace(/%C/g, 'currentColor').replace(/%K/g, knock || '#171a21')}</svg>`;
  const iconName = (id) => ((D.names || {})[L] || (D.names || {}).en || {})[id] || id;
  const arrPic = (id) => {
    const pts = { row: [[6, 20], [16, 20], [26, 20], [36, 20], [46, 20]], arc: [[6, 25], [16, 17], [26, 14], [36, 17], [46, 25]], wave: [[6, 20], [16, 13], [26, 20], [36, 27], [46, 20]],
      steps: [[6, 28], [16, 24], [26, 20], [36, 16], [46, 12]], garland: [[8, 22], [18, 26], [28, 27], [38, 24], [46, 18]], grid: [[10, 14], [20, 14], [30, 14], [10, 27], [20, 27], [30, 27]] }[id];
    const rope = id === 'garland' ? '<path d="M2 12 Q 26 26 50 8" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".6"/>' : '';
    return `<svg viewBox="0 0 52 40" aria-hidden="true">${rope}${pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.2" fill="currentColor"/>`).join('')}</svg>`;
  };
  const nm = (grp, id) => (((D[grp] || {})[L]) || ((D[grp] || {}).en) || {})[id] || id;

  // ---------- разметка ----------
  const STEPS = [['style', '✨', 'tabStyle'], ['brand', '🏷', 'tabBrand'], ['stamps', '☕', 'tabStamps'], ['holiday', '🎄', 'tabHoliday']];
  const swatch = (attr, c, on, label) => `<button type="button" class="bld-sw${on ? ' on' : ''}" ${attr}="${c}" style="--c:${c}" aria-label="${esc(label || c)}" aria-pressed="${on}"></button>`;
  const hexField = (id, val) => `<label class="bld-hex" title="${esc(t('custom'))}"><input type="color" id="${id}-pick" value="${val}" aria-label="${esc(t('custom'))}"><input type="text" id="${id}" value="${val.toUpperCase()}" maxlength="7" spellcheck="false" autocomplete="off" aria-label="HEX"></label>`;
  root.innerHTML = `
    <div class="bld-shell">
      <div class="bld-side">
        <div class="bld-steps" role="tablist">${STEPS.map(([k, ic, lb], i) => `<button type="button" role="tab" class="bld-step" data-step="${k}" aria-selected="false"><i>${i + 1}</i><span class="bld-step-ic" aria-hidden="true">${ic}</span><span>${esc(t(lb))}</span></button>`).join('')}</div>
        <div class="bld-panes">
          <div class="bld-pane" data-pane="style">
            <div class="bld-h">${esc(t('presets'))}</div>
            <div class="bld-presets" id="bld-presets"></div>
            <p class="bld-hint">${esc(t('presetsHint'))}</p>
          </div>
          <div class="bld-pane" data-pane="brand" hidden>
            <div class="bld-row2">
              <label class="bld-f"><span class="bld-h">${esc(t('name'))}</span><input type="text" id="bld-name" maxlength="32" autocomplete="off"></label>
              <label class="bld-f"><span class="bld-h">${esc(t('niche'))}</span><select id="bld-niche">${Object.entries(NICHES[L] || NICHES.en).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
            </div>
            <div class="bld-h">${esc(t('logo'))}</div>
            <div class="bld-drop" id="bld-logo-drop">
              <span class="bld-logo-pv" id="bld-logo-pv"></span>
              <span class="bld-drop-tx"><b id="bld-logo-btn-t"></b><small>${esc(t('logoDrop'))}</small></span>
              <button type="button" class="bld-x" id="bld-logo-rm" aria-label="${esc(t('logoRemove'))}">✕</button>
              <input type="file" id="bld-logo-file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden>
            </div>
            <div id="bld-logo-tools" hidden>
              <div class="bld-h">${esc(t('logoMode'))}</div>
              <div class="bld-seg" id="bld-lm">${['name', 'both', 'logo'].map(k => `<button type="button" data-lm="${k}">${esc(nm('lm', k))}</button>`).join('')}</div>
              <label class="bld-f bld-range" id="bld-lsize-w"><span class="bld-h">${esc(t('logoSize'))}</span><input type="range" id="bld-lsize" min="48" max="120" step="2"></label>
            </div>
            <div class="bld-h">${esc(t('cardColor'))}</div>
            <div class="bld-sws" id="bld-bgs"></div>
            <div class="bld-h">${esc(t('accent'))}</div>
            <div class="bld-sws" id="bld-accs"></div>
            <p class="bld-hint">${esc(t('accentHint'))}</p>
          </div>
          <div class="bld-pane" data-pane="stamps" hidden>
            <div class="bld-h">${esc(t('stampIcon'))}</div>
            <div class="bld-icons" id="bld-stamp"></div>
            <div class="bld-h">${esc(t('rewardIcon'))}</div>
            <div class="bld-icons bld-icons-r" id="bld-reward"></div>
            <div class="bld-h">${esc(t('stampColor'))}</div>
            <div class="bld-sws" id="bld-scs"></div>
            <div class="bld-row2">
              <div class="bld-f"><span class="bld-h">${esc(t('count'))}</span><div class="bld-seg" id="bld-count">${COUNTS.map(n => `<button type="button" data-n="${n}">${n}</button>`).join('')}</div></div>
              <label class="bld-f"><span class="bld-h">${esc(t('label'))}</span><input type="text" id="bld-label" maxlength="18" placeholder="${esc(t('labelPh'))}" autocomplete="off"></label>
            </div>
            <div class="bld-h">${esc(t('arrange'))}</div>
            <div class="bld-arrs" id="bld-arr">${C.ARRANGES.map(a => `<button type="button" data-arr="${a}">${arrPic(a)}<span>${esc(nm('arr', a))}</span></button>`).join('')}</div>
          </div>
          <div class="bld-pane" data-pane="holiday" hidden>
            <div class="bld-h">${esc(t('season'))}</div>
            <div class="bld-seasons" id="bld-season">${C.SEASONS.map(s => `<button type="button" data-season="${s}"><span aria-hidden="true">${(D.seasonIc || {})[s] || '•'}</span>${esc(nm('seasons', s))}</button>`).join('')}</div>
            <p class="bld-hint">${esc(t('seasonHint'))}</p>
            <div class="bld-h">${esc(t('photo'))}</div>
            <div class="bld-drop bld-drop-photo" id="bld-photo-drop">
              <span class="bld-photo-pv" id="bld-photo-pv"></span>
              <span class="bld-drop-tx"><b id="bld-photo-btn-t"></b><small>${esc(t('photoHint'))}</small></span>
              <button type="button" class="bld-x" id="bld-photo-rm" aria-label="${esc(t('photoRemove'))}">✕</button>
              <input type="file" id="bld-photo-file" accept="image/png,image/jpeg,image/webp" hidden>
            </div>
          </div>
        </div>
        <div class="bld-nav"><button type="button" class="bld-link" id="bld-reset">↺ ${esc(t('reset'))}</button><button type="button" class="btn btn-ghost btn-sm" id="bld-prev">←</button><button type="button" class="btn btn-primary btn-sm" id="bld-next"></button></div>
      </div>
      <div class="bld-stage">
        <div class="bld-stage-top">
          <div class="bld-tabs" role="tablist"><button type="button" role="tab" data-tab="google"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.2z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z"/></svg>${esc(t('google'))}</button><button type="button" role="tab" data-tab="apple"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7a4.5 4.5 0 0 0-3.5-1.9c-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8a4.7 4.7 0 0 0-4 2.4c-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.1-1.2 2.9-2.4.9-1.3 1.3-2.7 1.3-2.7s-2.4-1-2.4-4zM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.6 2.8-1.4z"/></svg>${esc(t('apple'))}</button></div>
        </div>
        <div class="bld-phone" id="bld-phone-w"><span class="bld-live" title="${esc(t('live'))}"><i></i>LIVE</span><div class="bld-notch"></div><div class="bld-screen" id="bld-pass"></div></div>
        <div class="bld-visit-row">
          <button type="button" class="bld-visit" id="bld-visit"><span class="bld-visit-ic" aria-hidden="true">＋</span><span id="bld-visit-t"></span><b id="bld-visit-n"></b></button>
        </div>
        <div class="bld-reward" id="bld-reward-msg" role="status" aria-live="polite"></div>
        <p class="bld-note">${esc(t('previewNote'))}</p>
        <div class="bld-acts"><button type="button" class="bld-act" id="bld-png">⬇ ${esc(t('png'))}</button><button type="button" class="bld-act" id="bld-share">🔗 ${esc(t('link'))}</button></div>
      </div>
    </div>
    <div class="bld-cta">
      <div class="bld-cta-tx"><h3>${esc(t('ctaTitle'))}</h3><p>${esc(t('ctaSub'))}</p></div>
      <div class="bld-cta-b"><a href="#download" class="btn btn-primary">${esc(t('ctaGet'))} <span class="arr" aria-hidden="true">→</span></a><button type="button" class="btn btn-ghost" id="bld-move">${esc(t('ctaMove'))}</button></div>
    </div>
    <div class="bld-mini" id="bld-mini" aria-hidden="true"><img alt="" id="bld-mini-img"></div>
    <div class="bld-toast" id="bld-toast" role="status" aria-live="polite"></div>
    <div class="bld-modal" id="bld-modal" hidden role="dialog" aria-modal="true" aria-labelledby="bld-mv-t">
      <div class="bld-modal-in">
        <button type="button" class="bld-x bld-modal-x" data-close aria-label="${esc(t('mvClose'))}">✕</button>
        <div class="bld-mv-hero" id="bld-mv-hero"></div>
        <h3 id="bld-mv-t">${esc(t('mvTitle'))}</h3>
        <ol class="bld-mv-steps"><li>${esc(t('mvStep1'))}</li><li>${esc(t('mvStep2'))}</li><li>${esc(t('mvStep3'))}</li></ol>
        <textarea id="bld-code" readonly rows="3" spellcheck="false"></textarea>
        <div class="bld-mv-acts"><button type="button" class="btn btn-primary btn-sm" id="bld-copy">${esc(t('mvCopy'))}</button><a href="#download" class="bld-link" data-close>${esc(t('mvNoApp'))} → ${esc(t('ctaGet'))}</a></div>
      </div>
    </div>`;
  const $ = (id) => document.getElementById(id);

  // ---------- отрисовка ----------
  const BLANK = { stamp: '', reward: '', stampColor: '', arrange: '', season: '', label: '', layout: '' };
  let presetsKey = '';
  function renderPresets() {
    const key = [S.name, S.logo ? S.logo.length : 0, S.color, S.niche, S.count].join('|');
    if (key === presetsKey) { markPresets(); return; }
    presetsKey = key;
    const card = { type: 'stamp', stamp_count: Math.max(1, S.count - 3), stamp_target: S.count, client_name: '', lang: L };
    $('bld-presets').innerHTML = C.PRESETS.map(p => {
      const pl = C.presetLook(p.id, L, {});
      const st = { ...S, bg: pl.bg, look: { ...S.look, ...BLANK, ...pl.look }, photo: null };
      return `<button type="button" class="bld-preset" data-ps="${p.id}" style="--pbg:${pl.bg}"><span class="bld-preset-img"><img alt="" loading="lazy" src="${svgUrl(heroSvg(st, card))}"></span><b>${esc(p.name[L] || p.name.en)}</b></button>`;
    }).join('');
    markPresets();
  }
  const markPresets = () => $('bld-presets').querySelectorAll('[data-ps]').forEach(b => { const on = b.dataset.ps === S.preset; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  function renderSwatches() {
    $('bld-bgs').innerHTML = (D.wdColors || ['#20252d']).map(c => swatch('data-bg', c, S.bg.toLowerCase() === c.toLowerCase())).join('') + hexField('bld-bg-hex', S.bg);
    $('bld-accs').innerHTML = ACCENTS.map(c => swatch('data-acc', c, S.color.toLowerCase() === c.toLowerCase())).join('') + hexField('bld-acc-hex', S.color);
    $('bld-scs').innerHTML = `<button type="button" class="bld-sw bld-sw-auto${S.look.stampColor ? '' : ' on'}" data-sc="" aria-pressed="${!S.look.stampColor}">${esc(t('auto'))}</button>` +
      (D.stampColors || []).map(c => swatch('data-sc', c, (S.look.stampColor || '').toLowerCase() === c)).join('') + hexField('bld-sc-hex', S.look.stampColor || '#ffffff');
  }
  function renderIcons() {
    const sel = S.look.stamp || 'check', rw = S.look.reward || 'gift';
    $('bld-stamp').innerHTML = C.STAMP_IDS.map(id => `<button type="button" data-ic="${id}" class="${id === sel ? 'on' : ''}" title="${esc(iconName(id))}" aria-label="${esc(iconName(id))}" aria-pressed="${id === sel}">${icon(id)}</button>`).join('');
    $('bld-reward').innerHTML = (D.rewards || ['gift']).map(id => `<button type="button" data-rw="${id}" class="${id === rw ? 'on' : ''}" title="${esc(iconName(id))}" aria-label="${esc(iconName(id))}" aria-pressed="${id === rw}">${icon(id)}</button>`).join('');
  }
  const setOn = (box, attr, val) => box.querySelectorAll(`[${attr}]`).forEach(b => { const on = String(b.getAttribute(attr)) === String(val); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  function renderControls() {
    $('bld-name').value = S.name; $('bld-niche').value = S.niche; $('bld-label').value = S.look.label || '';
    setOn($('bld-count'), 'data-n', S.count);
    setOn($('bld-arr'), 'data-arr', S.look.arrange || (S.look.season === 'xmas' ? 'garland' : 'row'));
    setOn($('bld-season'), 'data-season', S.look.season || 'none');
    setOn($('bld-lm'), 'data-lm', S.look.logoMode || 'name');
    $('bld-lsize').value = S.look.logoSize || 96;
    $('bld-lsize-w').hidden = !S.look.logoMode || S.look.logoMode === 'name';
    $('bld-logo-tools').hidden = !S.logo;
    $('bld-logo-pv').style.backgroundImage = S.logo ? `url('${S.logo}')` : '';
    $('bld-logo-pv').classList.toggle('empty', !S.logo);
    $('bld-logo-btn-t').textContent = S.logo ? t('logoChange') : t('logoPick');
    $('bld-logo-rm').hidden = !S.logo;
    $('bld-photo-pv').style.backgroundImage = S.photo ? `url('${S.photo}')` : '';
    $('bld-photo-pv').classList.toggle('empty', !S.photo);
    $('bld-photo-btn-t').textContent = S.photo ? t('logoChange') : t('photoPick');
    $('bld-photo-rm').hidden = !S.photo;
    renderSwatches(); renderIcons();
  }
  function renderSteps() {
    root.querySelectorAll('[data-step]').forEach(b => { const on = b.dataset.step === S.step; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    root.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== S.step; });
    const i = STEPS.findIndex(s => s[0] === S.step);
    $('bld-prev').hidden = i === 0;
    $('bld-next').innerHTML = i < STEPS.length - 1 ? `${esc(t(STEPS[i + 1][2]))} <span class="arr" aria-hidden="true">→</span>` : `${esc(t('ctaMove'))} <span class="arr" aria-hidden="true">→</span>`;
  }
  let lastHero = '';
  function renderPass() {
    root.querySelectorAll('[data-tab]').forEach(b => { const on = b.dataset.tab === S.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $('bld-pass').innerHTML = passHtml(S);
    const img = $('bld-pass').querySelector('.bp-hero img'); if (img) { lastHero = img.src; $('bld-mini-img').src = lastHero; }
    $('bld-visit-t').textContent = S.filled >= S.count ? t('again') : t('visit');
    $('bld-visit-n').textContent = `${S.filled} / ${S.count}`;
  }
  function render(all) { if (all) { renderControls(); renderSteps(); } renderPresets(); renderPass(); save(); }

  // ---------- картинки ----------
  function readImage(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type) || file.size > 15 * 1024 * 1024) { reject(new Error('type')); return; }
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => { URL.revokeObjectURL(url); resolve(im); };
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load')); };
      im.src = url;
    });
  }
  function logoFrom(im) {
    const w = im.naturalWidth || im.width || 256, h = im.naturalHeight || im.height || 256;
    for (const max of [320, 240, 180]) {
      const k = Math.min(1, max / Math.max(w, h)), cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
      const c = document.createElement('canvas'); c.width = cw; c.height = ch;
      c.getContext('2d').drawImage(im, 0, 0, cw, ch);
      const u = c.toDataURL('image/png'); if (u.length < 330 * 1024 * 1.37) return u;
    }
    return null;
  }
  function photoFrom(im) {
    const W = 1032, H = 336, w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
    const k = Math.max(W / w, H / h), dw = w * k, dh = h * k;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    c.getContext('2d').drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh);
    for (const q of [0.84, 0.74, 0.62]) { const u = c.toDataURL('image/jpeg', q); if (u.length < 560 * 1024 * 1.37) return u; }
    return null;
  }
  async function takeFile(kind, file) {
    try {
      const im = await readImage(file);
      const u = kind === 'logo' ? logoFrom(im) : photoFrom(im);
      if (!u) throw new Error('big');
      if (kind === 'logo') { S.logo = u; if (!S.look.logoMode) S.look.logoMode = 'both'; } else { S.photo = u; S.look.layout = 'photo'; }
      S.preset = ''; render(true);
    } catch (e) { toast(t('imgErr')); }
  }
  for (const kind of ['logo', 'photo']) {
    const drop = $(`bld-${kind}-drop`), inp = $(`bld-${kind}-file`);
    drop.addEventListener('click', (e) => { if (e.target.closest('.bld-x')) return; inp.click(); });
    drop.tabIndex = 0; drop.setAttribute('role', 'button');
    drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
    inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; inp.value = ''; if (f) takeFile(kind, f); });
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) takeFile(kind, f); });
    $(`bld-${kind}-rm`).addEventListener('click', () => { S[kind] = null; if (kind === 'logo') S.look.logoMode = ''; else S.look.layout = ''; render(true); });
  }

  // ---------- события ----------
  root.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => { S.step = b.dataset.step; renderSteps(); save(); }));
  $('bld-next').addEventListener('click', () => {
    const i = STEPS.findIndex(s => s[0] === S.step);
    if (i < STEPS.length - 1) { S.step = STEPS[i + 1][0]; renderSteps(); save(); const side = root.querySelector('.bld-side'); if (side.getBoundingClientRect().top < 60) side.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else openMove();
  });
  $('bld-prev').addEventListener('click', () => { const i = STEPS.findIndex(s => s[0] === S.step); if (i > 0) { S.step = STEPS[i - 1][0]; renderSteps(); save(); } });
  $('bld-reset').addEventListener('click', () => { const keep = S.step; S = DEF(); S.step = keep; presetsKey = ''; render(true); });
  $('bld-presets').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ps]'); if (!b) return;
    const pl = C.presetLook(b.dataset.ps, L, S.look);
    S.bg = pl.bg; S.look = { ...S.look, ...BLANK, ...pl.look };
    S.preset = b.dataset.ps; render(true); pulse();
  });
  $('bld-name').addEventListener('input', (e) => { S.name = e.target.value.replace(/[<>]/g, '').slice(0, 32); render(false); });
  $('bld-niche').addEventListener('change', (e) => { S.niche = e.target.value; render(false); });
  $('bld-label').addEventListener('input', (e) => { S.look.label = e.target.value.replace(/[<>&"]/g, '').slice(0, 18); render(false); });
  $('bld-lsize').addEventListener('input', (e) => { S.look.logoSize = Number(e.target.value); render(false); });
  $('bld-lm').addEventListener('click', (e) => { const b = e.target.closest('[data-lm]'); if (!b) return; S.look.logoMode = b.dataset.lm === 'name' ? 'name' : b.dataset.lm; render(true); });
  $('bld-count').addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (!b) return; S.count = Number(b.dataset.n); S.filled = Math.min(S.filled, S.count); render(true); });
  $('bld-arr').addEventListener('click', (e) => { const b = e.target.closest('[data-arr]'); if (!b) return; S.look.arrange = b.dataset.arr; S.preset = ''; render(true); });
  $('bld-season').addEventListener('click', (e) => { const b = e.target.closest('[data-season]'); if (!b) return; S.look.season = b.dataset.season === 'none' ? '' : b.dataset.season; S.preset = ''; render(true); pulse(); });
  $('bld-stamp').addEventListener('click', (e) => { const b = e.target.closest('[data-ic]'); if (!b) return; S.look.stamp = b.dataset.ic; S.preset = ''; render(true); });
  $('bld-reward').addEventListener('click', (e) => { const b = e.target.closest('[data-rw]'); if (!b) return; S.look.reward = b.dataset.rw; S.preset = ''; render(true); });
  // цвета: образцы и поле #RRGGBB
  const normHex = (v) => { let s = String(v || '').trim().replace(/^#/, ''); if (/^[0-9a-f]{3}$/i.test(s)) s = s.split('').map(c => c + c).join(''); return /^[0-9a-f]{6}$/i.test(s) ? '#' + s.toLowerCase() : null; };
  function colorGroup(box, attr, key, hexId) {
    const set = (v, rerender) => { if (key === 'bg') S.bg = v; else if (key === 'color') S.color = v; else S.look.stampColor = v; S.preset = key === 'color' ? S.preset : ''; render(rerender); };
    $(box).addEventListener('click', (e) => { const b = e.target.closest(`[${attr}]`); if (!b) return; set(b.getAttribute(attr), true); });
    $(box).addEventListener('input', (e) => {
      if (e.target.id === hexId + '-pick') { $(hexId).value = e.target.value.toUpperCase(); set(e.target.value, false); setOn($(box), attr, e.target.value); }
      else if (e.target.id === hexId) { const v = normHex(e.target.value); e.target.closest('.bld-hex').classList.toggle('bad', !v && e.target.value.replace('#', '').length >= 3); if (v) { $(hexId + '-pick').value = v; set(v, false); setOn($(box), attr, v); } }
    });
    $(box).addEventListener('change', (e) => { if (e.target.id === hexId || e.target.id === hexId + '-pick') renderSwatches(); });
  }
  colorGroup('bld-bgs', 'data-bg', 'bg', 'bld-bg-hex');
  colorGroup('bld-accs', 'data-acc', 'color', 'bld-acc-hex');
  colorGroup('bld-scs', 'data-sc', 'stampColor', 'bld-sc-hex');
  root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { S.tab = b.dataset.tab; renderPass(); save(); }));

  // «Отметить визит»: штамп за штампом, на последнем — подарок и конфетти
  function pulse() { const w = $('bld-phone-w'); w.classList.remove('pulse'); void w.offsetWidth; w.classList.add('pulse'); }
  $('bld-visit').addEventListener('click', () => {
    if (S.filled >= S.count) { S.filled = 0; $('bld-reward-msg').classList.remove('on'); render(false); return; }
    S.filled += 1; render(false); pulse();
    if (S.filled >= S.count) { $('bld-reward-msg').textContent = t('reward'); $('bld-reward-msg').classList.add('on'); confetti(); }
  });
  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const w = $('bld-phone-w'), cols = [S.color, '#ffffff', S.look.stampColor || '#f6d77a', '#ff4f86', '#4fc3f7'];
    for (let i = 0; i < 36; i++) {
      const p = document.createElement('i'); p.className = 'bld-conf';
      p.style.cssText = `left:${50 + (Math.random() - .5) * 30}%;background:${cols[i % cols.length]};--dx:${(Math.random() - .5) * 340}px;--dy:${-140 - Math.random() * 220}px;--r:${Math.random() * 720 - 360}deg;animation-delay:${Math.random() * 120}ms`;
      w.appendChild(p); setTimeout(() => p.remove(), 1600);
    }
  }

  // ---------- картинка, ссылка, перенос в программу ----------
  let toastT = null;
  function toast(msg) { const el = $('bld-toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2800); }
  async function copyText(s) {
    try { await navigator.clipboard.writeText(s); return true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = s; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { ok = false; } ta.remove(); return ok;
    }
  }
  const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  $('bld-png').addEventListener('click', async () => {
    try {
      const W = 1200, H = 630, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#11141c'); g.addColorStop(1, '#07080b'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      const rg = x.createRadialGradient(W * .8, 0, 10, W * .8, 0, W * .7); rg.addColorStop(0, S.color + '55'); rg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = rg; x.fillRect(0, 0, W, H);
      const im = await loadImg(lastHero), bw = 1032, bh = 336, bx = (W - bw) / 2, by = 110;
      x.save(); x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 50; x.shadowOffsetY = 24; x.beginPath(); if (x.roundRect) x.roundRect(bx, by, bw, bh, 28); else x.rect(bx, by, bw, bh); x.fillStyle = S.bg; x.fill(); x.restore();
      x.save(); x.beginPath(); if (x.roundRect) x.roundRect(bx, by, bw, bh, 28); else x.rect(bx, by, bw, bh); x.clip(); x.drawImage(im, bx, by, bw, bh); x.restore();
      x.fillStyle = 'rgba(244,239,228,.86)'; x.font = '700 30px Manrope, Segoe UI, Arial, sans-serif'; x.textAlign = 'center'; x.fillText(S.name || 'Loya', W / 2, 520);
      x.fillStyle = 'rgba(244,239,228,.5)'; x.font = '600 20px Manrope, Segoe UI, Arial, sans-serif'; x.fillText(t('sampleShare') + ' · loya-loyalty.com', W / 2, 560);
      const a = document.createElement('a'); a.download = 'loya-card.png'; a.href = c.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { toast(t('imgErr')); }
  });
  $('bld-share').addEventListener('click', async () => {
    const { logo, photo, ...rest } = S;
    const url = location.origin + location.pathname + '#card=' + b64u.enc(JSON.stringify({ ...rest, step: 'style' }));
    if (await copyText(url)) toast(t('linkCopied'));
  });
  function designCode() {
    const look = lookOf(S); delete look.logoX; delete look.logoY;
    const o = { v: 1, name: S.name, bg: S.bg, color: S.color, look, heroStamps: true };
    if (S.logo) o.logo = S.logo; if (S.photo) o.hero = S.photo;
    return 'LOYA-DESIGN:' + b64u.enc(JSON.stringify(o));
  }
  let lastFocus = null;
  function openMove() {
    lastFocus = document.activeElement;
    $('bld-code').value = designCode();
    $('bld-mv-hero').innerHTML = `<img alt="" src="${lastHero}">`;
    $('bld-copy').textContent = t('mvCopy');
    $('bld-modal').hidden = false; document.documentElement.classList.add('menu-lock');
    setTimeout(() => $('bld-copy').focus(), 30);
  }
  function closeMove() { $('bld-modal').hidden = true; document.documentElement.classList.remove('menu-lock'); if (lastFocus) lastFocus.focus(); }
  $('bld-move').addEventListener('click', openMove);
  $('bld-modal').addEventListener('click', (e) => { if (e.target === $('bld-modal') || e.target.closest('[data-close]')) closeMove(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('bld-modal').hidden) closeMove(); });
  $('bld-copy').addEventListener('click', async () => { $('bld-code').select(); if (await copyText($('bld-code').value)) { $('bld-copy').textContent = t('mvCopied'); toast(t('mvCopied')); } });

  // ---------- телефон: мини-превью, когда большая карта ушла с экрана ----------
  const mini = $('bld-mini');
  if ('IntersectionObserver' in window) {
    let phoneVisible = true, inSection = false;
    const upd = () => mini.classList.toggle('on', inSection && !phoneVisible && window.innerWidth < 980);
    new IntersectionObserver(([e]) => { phoneVisible = e.isIntersecting; upd(); }, { threshold: 0.15 }).observe($('bld-phone-w'));
    new IntersectionObserver(([e]) => { inSection = e.isIntersecting; upd(); }, { rootMargin: '-120px 0px -160px 0px' }).observe(root.querySelector('.bld-side'));
    window.addEventListener('resize', upd, { passive: true });
    mini.addEventListener('click', () => $('bld-phone-w').scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }

  render(true);
  root.classList.add('ready');
  if (opened) setTimeout(() => root.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
})();
