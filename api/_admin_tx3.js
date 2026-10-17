// 2.23: тексты админки — вкладки, настройка клиента (оформление, регистрация, Wallet, акции), Telegram по ссылке.
module.exports = {
  ru: {
    tabOverview: '📊 Обзор', tabClients: '👥 Клиенты', tabService: '⚙️ Сервис',
    rowSetup: '⚙️ Настроить', rowCopy: '📋 Ключ',
    edTitle: 'Клиент', edSave: '💾 Сохранить для клиента', edSaving: 'Сохраняем…', edSaved: (v) => `Сохранено (версия ${v}). Программа клиента применит изменения в течение 5 минут.`, edNoChanges: 'Ничего не изменилось', edErr: 'Не удалось сохранить', edNeedSchema: 'Нет таблицы admin_settings — выполните schema.sql в Supabase',
    etInfo: 'Обзор', etVenue: 'Заведение и вид', etReg: 'Регистрация', etWallet: 'Карта Wallet', etPromo: 'Акции',
    snapNow: (d, v) => `Сейчас у клиента (данные программы от ${d}${v ? ', v' + v : ''})`, snapNone: 'Программа клиента ещё не присылала свои настройки (обновите её до 2.23 и подождите 5 минут). Поля пустые — заполните то, что нужно задать.',
    cfgVer: (v, d) => `Из админки уже задано: версия ${v} от ${d}`, manage: 'Управление ключом',
    fBrand: 'Название заведения', fNiche: 'Вид бизнеса', fLang: 'Язык программы', fCur: 'Валюта', fLogo: 'Логотип заведения', fLogoHint: 'PNG/JPG, лучше квадратный. Показывается в программе, на странице регистрации и в письмах.', fPick: 'Выбрать…', fRemove: 'Убрать', fTheme: 'Цветовая тема программы', fCustom: 'Свои цвета', cPrimary: 'Главный', cSidebar: 'Меню', cScreen: 'Фон', cText: 'Текст',
    fCardType: 'Какую карту получает новый гость', ctStamp: 'Штамп-карта', ctDiscount: 'Скидочная', ctSpend: 'Накопительная', fStampTarget: 'Штампов до подарка', fStampTitle: 'Что в подарок', fDiscount: 'Скидка, %', fSpendTarget: 'Сумма для бонуса', fSpendTitle: 'Бонус', fSpendPoints: 'Бонусов за сумму',
    fRegHead: 'Заголовок страницы регистрации', fRegText: 'Текст под заголовком', fRegBtn: 'Текст кнопки (на компьютере)', fRegBg: 'Фон страницы', bgDark: 'Тёмный', bgLight: 'Светлый', bgAuto: 'Как в программе', fColor2: 'Второй цвет градиента', fPages: 'Страницы регистрации точек', fOpen: 'Открыть ↗', regHint: 'На телефоне вместо кнопки будет «Добавить в Apple Wallet / Google Wallet». Обязательны только имя и email.',
    fWLogo: 'Логотип карты', fWHero: 'Картинка на карте (полоса 3:1)', fWBg: 'Цвет карты', fWStamps: 'Показывать штампы поверх картинки', wPreview: 'Примерный вид', wHint: 'Сохраняется сразу на сервере Loya: новые карты получают этот вид, старые обновятся при следующем визите клиента.',
    fWelcome: 'Приветственный бонус: двойной штамп за первый визит после саморегистрации', fBonus: 'Двойные штампы в тихие часы', fMult: 'Штампов за скан', fFrom: 'С', fTo: 'До', fDays: 'Дни (пусто — каждый день)', fRef: '«Приведи друга»', fRefBonus: 'Пригласившему, штампов', fRefFriend: 'Другу, штампов', fCooldown: 'Защита от повторного скана, минут (0 — выкл.)', fReview: 'Ссылка на отзывы Google',
    tgLinkBtn: '📲 Подключить Telegram', tgLinkOpen: 'Откройте ссылку на телефоне или компьютере с Telegram и нажмите «Запустить». Ждём…', tgLinked: '✅ Telegram подключён — проверьте сообщение от бота', tgWaitLong: 'Пока не подключилось. Нажмите «Запустить» в боте и подождите несколько секунд.',
    svcTitle: 'Сервис и безопасность'
  },
  uk: {
    tabOverview: '📊 Огляд', tabClients: '👥 Клієнти', tabService: '⚙️ Сервіс',
    rowSetup: '⚙️ Налаштувати', rowCopy: '📋 Ключ',
    edTitle: 'Клієнт', edSave: '💾 Зберегти для клієнта', edSaving: 'Зберігаємо…', edSaved: (v) => `Збережено (версія ${v}). Програма клієнта застосує зміни протягом 5 хвилин.`, edNoChanges: 'Нічого не змінилося', edErr: 'Не вдалося зберегти', edNeedSchema: 'Немає таблиці admin_settings — виконайте schema.sql у Supabase',
    etInfo: 'Огляд', etVenue: 'Заклад і вигляд', etReg: 'Реєстрація', etWallet: 'Картка Wallet', etPromo: 'Акції',
    snapNow: (d, v) => `Зараз у клієнта (дані програми від ${d}${v ? ', v' + v : ''})`, snapNone: 'Програма клієнта ще не надсилала свої налаштування (оновіть її до 2.23 і зачекайте 5 хвилин). Поля порожні — заповніть те, що потрібно задати.',
    cfgVer: (v, d) => `З адмінки вже задано: версія ${v} від ${d}`, manage: 'Керування ключем',
    fBrand: 'Назва закладу', fNiche: 'Вид бізнесу', fLang: 'Мова програми', fCur: 'Валюта', fLogo: 'Логотип закладу', fLogoHint: 'PNG/JPG, краще квадратний. Показується в програмі, на сторінці реєстрації та в листах.', fPick: 'Обрати…', fRemove: 'Прибрати', fTheme: 'Колірна тема програми', fCustom: 'Свої кольори', cPrimary: 'Головний', cSidebar: 'Меню', cScreen: 'Фон', cText: 'Текст',
    fCardType: 'Яку картку отримує новий гість', ctStamp: 'Штамп-картка', ctDiscount: 'Знижкова', ctSpend: 'Накопичувальна', fStampTarget: 'Штампів до подарунка', fStampTitle: 'Що в подарунок', fDiscount: 'Знижка, %', fSpendTarget: 'Сума для бонусу', fSpendTitle: 'Бонус', fSpendPoints: 'Бонусів за суму',
    fRegHead: 'Заголовок сторінки реєстрації', fRegText: 'Текст під заголовком', fRegBtn: 'Текст кнопки (на комп’ютері)', fRegBg: 'Фон сторінки', bgDark: 'Темний', bgLight: 'Світлий', bgAuto: 'Як у програмі', fColor2: 'Другий колір градієнта', fPages: 'Сторінки реєстрації точок', fOpen: 'Відкрити ↗', regHint: 'На телефоні замість кнопки буде «Додати в Apple Wallet / Google Wallet». Обов’язкові лише ім’я та email.',
    fWLogo: 'Логотип картки', fWHero: 'Картинка на картці (смуга 3:1)', fWBg: 'Колір картки', fWStamps: 'Показувати штампи поверх картинки', wPreview: 'Приблизний вигляд', wHint: 'Зберігається одразу на сервері Loya: нові картки отримують цей вигляд, старі оновляться під час наступного візиту клієнта.',
    fWelcome: 'Вітальний бонус: подвійний штамп за перший візит після самореєстрації', fBonus: 'Подвійні штампи в тихі години', fMult: 'Штампів за скан', fFrom: 'З', fTo: 'До', fDays: 'Дні (порожньо — щодня)', fRef: '«Приведи друга»', fRefBonus: 'Тому, хто запросив, штампів', fRefFriend: 'Другові, штампів', fCooldown: 'Захист від повторного скану, хвилин (0 — вимк.)', fReview: 'Посилання на відгуки Google',
    tgLinkBtn: '📲 Підключити Telegram', tgLinkOpen: 'Відкрийте посилання на телефоні чи комп’ютері з Telegram і натисніть «Запустити». Чекаємо…', tgLinked: '✅ Telegram підключено — перевірте повідомлення від бота', tgWaitLong: 'Поки не підключилося. Натисніть «Запустити» в боті й зачекайте кілька секунд.',
    svcTitle: 'Сервіс і безпека'
  },
  sk: {
    tabOverview: '📊 Prehľad', tabClients: '👥 Klienti', tabService: '⚙️ Služba',
    rowSetup: '⚙️ Nastaviť', rowCopy: '📋 Kľúč',
    edTitle: 'Klient', edSave: '💾 Uložiť pre klienta', edSaving: 'Ukladáme…', edSaved: (v) => `Uložené (verzia ${v}). Program klienta zmeny použije do 5 minút.`, edNoChanges: 'Nič sa nezmenilo', edErr: 'Uloženie zlyhalo', edNeedSchema: 'Chýba tabuľka admin_settings — spustite schema.sql v Supabase',
    etInfo: 'Prehľad', etVenue: 'Prevádzka a vzhľad', etReg: 'Registrácia', etWallet: 'Karta Wallet', etPromo: 'Akcie',
    snapNow: (d, v) => `Aktuálne u klienta (údaje programu z ${d}${v ? ', v' + v : ''})`, snapNone: 'Program klienta ešte neposlal nastavenia (aktualizujte ho na 2.23 a počkajte 5 minút). Polia sú prázdne — vyplňte, čo treba nastaviť.',
    cfgVer: (v, d) => `Z administrácie už nastavené: verzia ${v} z ${d}`, manage: 'Správa kľúča',
    fBrand: 'Názov prevádzky', fNiche: 'Typ podniku', fLang: 'Jazyk programu', fCur: 'Mena', fLogo: 'Logo prevádzky', fLogoHint: 'PNG/JPG, ideálne štvorcové. Zobrazuje sa v programe, na stránke registrácie a v e-mailoch.', fPick: 'Vybrať…', fRemove: 'Odstrániť', fTheme: 'Farebná téma programu', fCustom: 'Vlastné farby', cPrimary: 'Hlavná', cSidebar: 'Menu', cScreen: 'Pozadie', cText: 'Text',
    fCardType: 'Akú kartu dostane nový hosť', ctStamp: 'Pečiatková', ctDiscount: 'Zľavová', ctSpend: 'Zberová', fStampTarget: 'Pečiatok do darčeka', fStampTitle: 'Čo je darček', fDiscount: 'Zľava, %', fSpendTarget: 'Suma pre bonus', fSpendTitle: 'Bonus', fSpendPoints: 'Bonusov za sumu',
    fRegHead: 'Nadpis stránky registrácie', fRegText: 'Text pod nadpisom', fRegBtn: 'Text tlačidla (na počítači)', fRegBg: 'Pozadie stránky', bgDark: 'Tmavé', bgLight: 'Svetlé', bgAuto: 'Ako v programe', fColor2: 'Druhá farba prechodu', fPages: 'Stránky registrácie prevádzok', fOpen: 'Otvoriť ↗', regHint: 'Na telefóne bude namiesto tlačidla „Pridať do Apple Wallet / Google Wallet“. Povinné je len meno a e-mail.',
    fWLogo: 'Logo karty', fWHero: 'Obrázok na karte (pás 3:1)', fWBg: 'Farba karty', fWStamps: 'Zobrazovať pečiatky cez obrázok', wPreview: 'Približný vzhľad', wHint: 'Ukladá sa hneď na server Loya: nové karty dostanú tento vzhľad, staršie sa aktualizujú pri ďalšej návšteve klienta.',
    fWelcome: 'Uvítací bonus: dvojitá pečiatka za prvú návštevu po samoregistrácii', fBonus: 'Dvojité pečiatky v tichých hodinách', fMult: 'Pečiatok za sken', fFrom: 'Od', fTo: 'Do', fDays: 'Dni (prázdne — každý deň)', fRef: '„Priveď priateľa“', fRefBonus: 'Tomu, kto pozval, pečiatok', fRefFriend: 'Priateľovi, pečiatok', fCooldown: 'Ochrana pred opakovaným skenom, minút (0 — vyp.)', fReview: 'Odkaz na recenzie Google',
    tgLinkBtn: '📲 Pripojiť Telegram', tgLinkOpen: 'Otvorte odkaz v telefóne alebo počítači s Telegramom a kliknite „Spustiť“. Čakáme…', tgLinked: '✅ Telegram je pripojený — skontrolujte správu od bota', tgWaitLong: 'Zatiaľ sa nepripojilo. Kliknite v bote „Spustiť“ a počkajte pár sekúnd.',
    svcTitle: 'Služba a bezpečnosť'
  },
  en: {
    tabOverview: '📊 Overview', tabClients: '👥 Clients', tabService: '⚙️ Service',
    rowSetup: '⚙️ Set up', rowCopy: '📋 Key',
    edTitle: 'Client', edSave: '💾 Save for the client', edSaving: 'Saving…', edSaved: (v) => `Saved (version ${v}). The client’s app applies the changes within 5 minutes.`, edNoChanges: 'Nothing changed', edErr: 'Couldn’t save', edNeedSchema: 'No admin_settings table — run schema.sql in Supabase',
    etInfo: 'Overview', etVenue: 'Venue and look', etReg: 'Sign-up', etWallet: 'Wallet card', etPromo: 'Promotions',
    snapNow: (d, v) => `Current client settings (sent by the app on ${d}${v ? ', v' + v : ''})`, snapNone: 'The client’s app hasn’t sent its settings yet (update it to 2.23 and wait 5 minutes). Fields are empty — fill in what you want to set.',
    cfgVer: (v, d) => `Already set from admin: version ${v} on ${d}`, manage: 'Key management',
    fBrand: 'Venue name', fNiche: 'Business type', fLang: 'App language', fCur: 'Currency', fLogo: 'Venue logo', fLogoHint: 'PNG/JPG, square works best. Shown in the app, on the sign-up page and in emails.', fPick: 'Choose…', fRemove: 'Remove', fTheme: 'App colour theme', fCustom: 'Custom colours', cPrimary: 'Main', cSidebar: 'Menu', cScreen: 'Background', cText: 'Text',
    fCardType: 'Card a new guest gets', ctStamp: 'Stamp card', ctDiscount: 'Discount', ctSpend: 'Spend card', fStampTarget: 'Stamps until the reward', fStampTitle: 'The reward', fDiscount: 'Discount, %', fSpendTarget: 'Amount for a bonus', fSpendTitle: 'Bonus', fSpendPoints: 'Bonuses per amount',
    fRegHead: 'Sign-up page heading', fRegText: 'Text under the heading', fRegBtn: 'Button text (on a computer)', fRegBg: 'Page background', bgDark: 'Dark', bgLight: 'Light', bgAuto: 'Like the app', fColor2: 'Second gradient colour', fPages: 'Locations’ sign-up pages', fOpen: 'Open ↗', regHint: 'On phones the button becomes “Add to Apple Wallet / Google Wallet”. Only name and email are required.',
    fWLogo: 'Card logo', fWHero: 'Card picture (3:1 strip)', fWBg: 'Card colour', fWStamps: 'Show stamps over the picture', wPreview: 'Approximate look', wHint: 'Saved on the Loya server right away: new cards get this look, existing ones update at the guest’s next visit.',
    fWelcome: 'Welcome bonus: double stamp on the first visit after self sign-up', fBonus: 'Double stamps in quiet hours', fMult: 'Stamps per scan', fFrom: 'From', fTo: 'To', fDays: 'Days (empty — every day)', fRef: '“Refer a friend”', fRefBonus: 'Referrer, stamps', fRefFriend: 'Friend, stamps', fCooldown: 'Repeat-scan protection, minutes (0 — off)', fReview: 'Google reviews link',
    tgLinkBtn: '📲 Connect Telegram', tgLinkOpen: 'Open the link on a phone or computer with Telegram and press “Start”. Waiting…', tgLinked: '✅ Telegram connected — check the bot’s message', tgWaitLong: 'Not connected yet. Press “Start” in the bot and wait a few seconds.',
    svcTitle: 'Service and security'
  }
};
