// niches.js — централизованный Business Theme Context: список «ниш» бизнеса
// (кофейня, барбершоп, ногтевая студия и т.д.) и всё, что от ниши зависит —
// названия, фразы-приглашения, примеры примечаний клиента, подсказки в форме
// саморегистрации. Один файл — единая точка правды, чтобы `if (niche === 'grooming')`
// не расползался по экранам (main.js, local-api-server.js — через require;
// renderer.js — через обычный <script>, кладёт себя в window.NichesModule).
//
// Чтобы добавить новую нишу — добавьте один объект в NICHES ниже. Никакой другой
// код менять не нужно: выбор ниши, тексты писем, подсказки, страница регистрации
// и виджет погоды уже читают эти данные централизованно.

(function (root) {
  const NICHES = {
    coffee: {
      emoji: '☕',
      name: { ru: 'Кофейня / кафе', sk: 'Kaviareň / kaviarnička', uk: 'Кав\u2019ярня / кафе', en: 'Coffee shop / café' },
      defaultCardTitle: { ru: 'Карта лояльности', sk: 'Vernostná karta', uk: 'Картка лояльності', en: 'Loyalty card' },
      invitePhrase: { ru: 'чашечку кофе', sk: 'dobrú kávu', uk: 'чашечку кави', en: 'a good cup of coffee' },
      clientNoteExample: { ru: 'Например: без кофеина после обеда, любит овсяное молоко', sk: 'Napríklad: bez kofeínu poobede, obľubuje ovsené mlieko', uk: 'Наприклад: без кофеїну після обіду, любить вівсяне молоко', en: 'E.g.: no caffeine after lunch, prefers oat milk' },
      registrationNotesPlaceholder: { ru: 'Например: кокосовое молоко, без сахара', sk: 'Napríklad: kokosové mlieko, bez cukru', uk: 'Наприклад: кокосове молоко, без цукру', en: 'E.g.: coconut milk, no sugar' },
      showWeatherWidget: true
    },
    bakery: {
      emoji: '🥐',
      name: { ru: 'Пекарня / кондитерская', sk: 'Pekáreň / cukráreň', uk: 'Пекарня / кондитерська', en: 'Bakery / pastry shop' },
      defaultCardTitle: { ru: 'Карта лояльности', sk: 'Vernostná karta', uk: 'Картка лояльності', en: 'Loyalty card' },
      invitePhrase: { ru: 'свежую выпечку', sk: 'čerstvé pečivo', uk: 'свіжу випічку', en: 'some fresh pastries' },
      clientNoteExample: { ru: 'Например: аллергия на орехи, любит без глютена', sk: 'Napríklad: alergia na orechy, obľubuje bezlepkové', uk: 'Наприклад: алергія на горіхи, любить без глютену', en: 'E.g.: nut allergy, prefers gluten-free' },
      registrationNotesPlaceholder: { ru: 'Например: без глютена, любит корицу', sk: 'Napríklad: bez lepku, obľubuje škoricu', uk: 'Наприклад: без глютену, любить кориц', en: 'E.g.: gluten-free, loves cinnamon' },
      showWeatherWidget: true
    },
    barber: {
      emoji: '💈',
      name: { ru: 'Барбершоп / парикмахерская', sk: 'Barbershop / kaderníctvo', uk: 'Барбершоп / перукарня', en: 'Barbershop / hair salon' },
      defaultCardTitle: { ru: 'Карта постоянного клиента', sk: 'Karta stáleho klienta', uk: 'Картка постійного клієнта', en: 'Regular client card' },
      invitePhrase: { ru: 'стрижку', sk: 'strihanie', uk: 'стрижку', en: 'a fresh haircut' },
      clientNoteExample: { ru: 'Например: короткий fade, без бороды', sk: 'Napríklad: krátky fade, bez brady', uk: 'Наприклад: короткий fade, без бороди', en: 'E.g.: short fade, no beard trim' },
      registrationNotesPlaceholder: { ru: 'Например: предпочитаемая длина и стиль', sk: 'Napríklad: obľúbená dĺžka a štýl', uk: 'Наприклад: улюблена довжина і стиль', en: 'E.g.: preferred length and style' },
      showWeatherWidget: false
    },
    nails: {
      emoji: '💅',
      name: { ru: 'Ногтевая студия', sk: 'Nechtové štúdio', uk: 'Нігтьова студія', en: 'Nail studio' },
      defaultCardTitle: { ru: 'Карта постоянного клиента', sk: 'Karta stálej klientky', uk: 'Картка постійної клієнтки', en: 'Regular client card' },
      invitePhrase: { ru: 'маникюр', sk: 'manikúru', uk: 'манікюр', en: 'a manicure' },
      clientNoteExample: { ru: 'Например: аллергия на гель-лак, любит квадратную форму', sk: 'Napríklad: alergia na gél lak, obľubuje štvorcový tvar', uk: 'Наприклад: алергія на гель-лак, любить квадратну форму', en: 'E.g.: gel polish allergy, prefers square shape' },
      registrationNotesPlaceholder: { ru: 'Например: любимый цвет, форма ногтей', sk: 'Napríklad: obľúbená farba, tvar nechtov', uk: 'Наприклад: улюблений колір, форма нігтів', en: 'E.g.: favorite color, nail shape' },
      showWeatherWidget: false
    },
    spa: {
      emoji: '💆',
      name: { ru: 'СПА / массаж', sk: 'SPA / masáže', uk: 'СПА / масаж', en: 'Spa / massage' },
      defaultCardTitle: { ru: 'Карта постоянного клиента', sk: 'Karta stáleho klienta', uk: 'Картка постійного клієнта', en: 'Regular client card' },
      invitePhrase: { ru: 'расслабляющий сеанс', sk: 'relaxačnú procedúru', uk: 'розслаблюючий сеанс', en: 'a relaxing session' },
      clientNoteExample: { ru: 'Например: избегать сильного давления, чувствительная спина', sk: 'Napríklad: vyhýbať sa silnému tlaku, citlivý chrbát', uk: 'Наприклад: уникати сильного тиску, чутлива спина', en: 'E.g.: avoid deep pressure, sensitive back' },
      registrationNotesPlaceholder: { ru: 'Например: предпочитаемое масло, зоны для массажа', sk: 'Napríklad: obľúbený olej, oblasti na masáž', uk: 'Наприклад: улюблена олія, зони для масажу', en: 'E.g.: preferred oil, areas to focus on' },
      showWeatherWidget: false
    },
    sushi: {
      emoji: '🍣',
      name: { ru: 'Суши / азиатская кухня', sk: 'Sushi / ázijská kuchyňa', uk: 'Суші / азійська кухня', en: 'Sushi / Asian kitchen' },
      defaultCardTitle: { ru: 'Карта лояльности', sk: 'Vernostná karta', uk: 'Картка лояльності', en: 'Loyalty card' },
      invitePhrase: { ru: 'свежие суши', sk: 'čerstvé suši', uk: 'свіжі суші', en: 'some fresh sushi' },
      clientNoteExample: { ru: 'Например: без васаби, аллергия на морепродукты', sk: 'Napríklad: bez wasabi, alergia na morské plody', uk: 'Наприклад: без васабі, алергія на морепродукти', en: 'E.g.: no wasabi, seafood allergy' },
      registrationNotesPlaceholder: { ru: 'Например: без имбиря, любит острое', sk: 'Napríklad: bez zázvoru, obľubuje pikantné', uk: 'Наприклад: без імбиру, любить гостре', en: 'E.g.: no ginger, likes spicy' },
      showWeatherWidget: false
    },
    pizza: {
      emoji: '🍕',
      name: { ru: 'Пиццерия / фастфуд', sk: 'Pizzeria / rýchle občerstvenie', uk: 'Піцерія / фастфуд', en: 'Pizzeria / fast food' },
      defaultCardTitle: { ru: 'Карта лояльности', sk: 'Vernostná karta', uk: 'Картка лояльності', en: 'Loyalty card' },
      invitePhrase: { ru: 'горячую пиццу', sk: 'horúcu pizzu', uk: 'гарячу піцу', en: 'a hot pizza' },
      clientNoteExample: { ru: 'Например: тонкое тесто, без лука', sk: 'Napríklad: tenké cesto, bez cibule', uk: 'Наприклад: тонке тісто, без цибулі', en: 'E.g.: thin crust, no onions' },
      registrationNotesPlaceholder: { ru: 'Например: любимая пицца, без грибов', sk: 'Napríklad: obľúbená pizza, bez húb', uk: 'Наприклад: улюблена піца, без грибів', en: 'E.g.: favorite pizza, no mushrooms' },
      showWeatherWidget: false
    },
    grocery: {
      emoji: '🛒',
      name: { ru: 'Продукты / магазин у дома', sk: 'Potraviny / obchod pri dome', uk: 'Продукти / магазин біля дому', en: 'Grocery / convenience store' },
      defaultCardTitle: { ru: 'Карта покупателя', sk: 'Zákaznícka karta', uk: 'Картка покупця', en: 'Shopper card' },
      invitePhrase: { ru: 'свежие продукты', sk: 'čerstvé potraviny', uk: 'свіжі продукти', en: 'some fresh groceries' },
      clientNoteExample: { ru: 'Например: покупает фермерское, любит акции на молочное', sk: 'Napríklad: kupuje farmárske, obľubuje akcie na mliečne', uk: 'Наприклад: купує фермерське, любить акції на молочне', en: 'E.g.: buys farm products, likes dairy deals' },
      registrationNotesPlaceholder: { ru: 'Например: любимые товары, диета', sk: 'Napríklad: obľúbené produkty, diéta', uk: 'Наприклад: улюблені товари, дієта', en: 'E.g.: favorite products, diet' },
      showWeatherWidget: false
    },
    travel: {
      emoji: '✈️',
      name: { ru: 'Турфирма / путешествия', sk: 'Cestovná kancelária / cestovanie', uk: 'Турфірма / подорожі', en: 'Travel agency' },
      defaultCardTitle: { ru: 'Карта путешественника', sk: 'Karta cestovateľa', uk: 'Картка мандрівника', en: 'Traveler card' },
      invitePhrase: { ru: 'следующее путешествие', sk: 'ďalšiu cestu', uk: 'наступну подорож', en: 'your next trip' },
      clientNoteExample: { ru: 'Например: любит море, путешествует с детьми', sk: 'Napríklad: miluje more, cestuje s deťmi', uk: 'Наприклад: любить море, подорожує з дітьми', en: 'E.g.: loves the sea, travels with kids' },
      registrationNotesPlaceholder: { ru: 'Например: куда хотите поехать, бюджет', sk: 'Napríklad: kam chcete ísť, rozpočet', uk: 'Наприклад: куди хочете поїхати, бюджет', en: 'E.g.: where you want to go, budget' },
      showWeatherWidget: false
    },
    tattoo: {
      emoji: '🖋️',
      name: { ru: 'Тату / пирсинг-студия', sk: 'Tetovacie / piercingové štúdio', uk: 'Тату / пірсинг-студія', en: 'Tattoo / piercing studio' },
      defaultCardTitle: { ru: 'Карта постоянного клиента', sk: 'Karta stáleho klienta', uk: 'Картка постійного клієнта', en: 'Regular client card' },
      invitePhrase: { ru: 'новую идею', sk: 'nový nápad', uk: 'нову ідею', en: 'a new idea' },
      clientNoteExample: { ru: 'Например: чувствительная кожа, предпочитает крупные формы', sk: 'Napríklad: citlivá pokožka, obľubuje väčšie motívy', uk: 'Наприклад: чутлива шкіра, любить великі форми', en: 'E.g.: sensitive skin, prefers larger pieces' },
      registrationNotesPlaceholder: { ru: 'Например: любимый стиль, зона тела', sk: 'Napríklad: obľúbený štýl, časť tela', uk: 'Наприклад: улюблений стиль, зона тіла', en: 'E.g.: favorite style, body area' },
      showWeatherWidget: false
    },
    fitness: {
      emoji: '🏋️',
      name: { ru: 'Фитнес / йога / танцы', sk: 'Fitness / jóga / tanec', uk: 'Фітнес / йога / танці', en: 'Fitness / yoga / dance' },
      defaultCardTitle: { ru: 'Карта посещений', sk: 'Karta návštev', uk: 'Картка відвідувань', en: 'Visit card' },
      invitePhrase: { ru: 'тренировку', sk: 'tréning', uk: 'тренування', en: 'a workout' },
      clientNoteExample: { ru: 'Например: боль в колене, избегать прыжков', sk: 'Napríklad: bolesť kolena, vyhýbať sa skokom', uk: 'Наприклад: біль у коліні, уникати стрибків', en: 'E.g.: knee pain, avoid jumping exercises' },
      registrationNotesPlaceholder: { ru: 'Например: цель тренировок, ограничения по здоровью', sk: 'Napríklad: cieľ tréningu, zdravotné obmedzenia', uk: 'Наприклад: мета тренувань, обмеження за здоров\u2019ям', en: 'E.g.: training goal, health limitations' },
      showWeatherWidget: false
    },
    petgroom: {
      emoji: '🐾',
      name: { ru: 'Груминг для животных', sk: 'Grooming pre zvieratá', uk: 'Грумінг для тварин', en: 'Pet grooming' },
      defaultCardTitle: { ru: 'Карта постоянного клиента', sk: 'Karta stáleho klienta', uk: 'Картка постійного клієнта', en: 'Regular client card' },
      invitePhrase: { ru: 'груминг для питомца', sk: 'grooming pre miláčika', uk: 'грумінг для улюбленця', en: 'a grooming session for your pet' },
      clientNoteExample: { ru: 'Например: боится фена, предпочитает тихую сушку', sk: 'Napríklad: bojí sa fénu, uprednostňuje tiché sušenie', uk: 'Наприклад: боїться фена, любить тихе сушіння', en: 'E.g.: afraid of the dryer, prefers quiet drying' },
      registrationNotesPlaceholder: { ru: 'Например: порода, характер питомца', sk: 'Napríklad: plemeno, povaha miláčika', uk: 'Наприклад: порода, характер улюбленця', en: 'E.g.: breed, your pet\u2019s temperament' },
      showWeatherWidget: false
    },
    photo: {
      emoji: '📸',
      name: { ru: 'Фотостудия', sk: 'Fotoštúdio', uk: 'Фотостудія', en: 'Photo studio' },
      defaultCardTitle: { ru: 'Карта постоянного клиента', sk: 'Karta stáleho klienta', uk: 'Картка постійного клієнта', en: 'Regular client card' },
      invitePhrase: { ru: 'новую фотосессию', sk: 'nové fotenie', uk: 'нову фотосесію', en: 'a new photo session' },
      clientNoteExample: { ru: 'Например: не любит студийный свет, предпочитает natural-стиль', sk: 'Napríklad: neobľubuje štúdiové svetlo, preferuje prirodzený štýl', uk: 'Наприклад: не любить студійне світло, любить natural-стиль', en: 'E.g.: dislikes studio lighting, prefers a natural look' },
      registrationNotesPlaceholder: { ru: 'Например: повод съёмки, пожелания по стилю', sk: 'Napríklad: dôvod fotenia, želaný štýl', uk: 'Наприклад: привід зйомки, побажання щодо стилю', en: 'E.g.: occasion, preferred style' },
      showWeatherWidget: false
    },
    clothing: {
      emoji: '👗',
      name: { ru: 'Магазин одежды', sk: 'Obchod s oblečením', uk: 'Магазин одягу', en: 'Clothing store' },
      defaultCardTitle: { ru: 'Карта постоянного покупателя', sk: 'Karta stáleho zákazníka', uk: 'Картка постійного покупця', en: 'Loyal customer card' },
      invitePhrase: { ru: 'обновить гардероб', sk: 'obnoviť šatník', uk: 'оновити гардероб', en: 'refresh your wardrobe' },
      clientNoteExample: { ru: 'Например: размер M, любит однотонные вещи', sk: 'Napríklad: veľkosť M, obľubuje jednofarebné oblečenie', uk: 'Наприклад: розмір M, любить однотонні речі', en: 'E.g.: size M, prefers solid colors' },
      registrationNotesPlaceholder: { ru: 'Например: любимые бренды, размер', sk: 'Napríklad: obľúbené značky, veľkosť', uk: 'Наприклад: улюблені бренди, розмір', en: 'E.g.: favorite brands, size' },
      showWeatherWidget: false
    },
    other: {
      emoji: '✨',
      name: { ru: 'Другое', sk: 'Iné', uk: 'Інше', en: 'Other' },
      defaultCardTitle: { ru: 'Карта лояльности', sk: 'Vernostná karta', uk: 'Картка лояльності', en: 'Loyalty card' },
      invitePhrase: { ru: 'к нам', sk: 'k nám', uk: 'до нас', en: 'to visit us' },
      clientNoteExample: { ru: 'Например: особые пожелания клиента', sk: 'Napríklad: osobitné požiadavky klienta', uk: 'Наприклад: особливі побажання клієнта', en: 'E.g.: any special preferences' },
      registrationNotesPlaceholder: { ru: 'Например: ваши пожелания', sk: 'Napríklad: vaše želania', uk: 'Наприклад: ваші побажання', en: 'E.g.: your preferences' },
      showWeatherWidget: false
    }
  };

  // ---------- централизованный доступ (Business Theme Context) ----------
  // Весь остальной код (main.js, local-api-server.js, renderer.js) обращается
  // к нише ТОЛЬКО через эти функции — нигде не должно быть разбросанных
  // if (niche === 'coffee') / if (niche === 'barber') и т.п.
  function getNiche(id) {
    return NICHES[id] || NICHES.other;
  }

  function listNicheIds() {
    return Object.keys(NICHES);
  }

  function getClientNoteExample(nicheId, lang) {
    const niche = getNiche(nicheId);
    return niche.clientNoteExample[lang] || niche.clientNoteExample.ru;
  }

  function getRegistrationNotesPlaceholder(nicheId, lang) {
    const niche = getNiche(nicheId);
    return niche.registrationNotesPlaceholder[lang] || niche.registrationNotesPlaceholder.ru;
  }

  function getInvitePhrase(nicheId, lang) {
    const niche = getNiche(nicheId);
    return niche.invitePhrase[lang] || niche.invitePhrase.ru;
  }

  const api = {
    NICHES,
    getNiche,
    listNicheIds,
    getClientNoteExample,
    getRegistrationNotesPlaceholder,
    getInvitePhrase
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.NichesModule = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
