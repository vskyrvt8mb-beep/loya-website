// Тексты живых макетов в первом экране страниц ниш (вымышленные заведения — пример того, как выглядит карта).
// type: stamps — штамп-карта, visits — карта визитов со скидкой, points — накопительная карта.
module.exports = {
  cafe: {
    type: 'stamps', brand: 'Black Rich', emoji: '☕', total: 10, done: 7,
    ru: { short: 'Кафе и кофейни', kind: 'Штамп-карта', client: 'Анна', reward: 'Бесплатный кофе', left: 'Ещё 3 до подарка', scan: 'Штамп отмечен', chips: ['⚡ Двойные штампы 14:00–17:00', '💌 «Остался 1 кофе до подарка» — отправлено', '🎂 Поздравление с днём рождения'] },
    uk: { short: 'Кафе та кав’ярні', kind: 'Штамп-картка', client: 'Анна', reward: 'Безкоштовна кава', left: 'Ще 3 до подарунка', scan: 'Штамп відмічено', chips: ['⚡ Подвійні штампи 14:00–17:00', '💌 «Лишилася 1 кава до подарунка» — надіслано', '🎂 Привітання з днем народження'] },
    sk: { short: 'Kaviarne a kafé', kind: 'Pečiatková karta', client: 'Anna', reward: 'Káva zadarmo', left: 'Ešte 3 do darčeka', scan: 'Pečiatka pridaná', chips: ['⚡ Dvojité pečiatky 14:00–17:00', '💌 „Už len 1 káva do darčeka“ — odoslané', '🎂 Blahoželanie k narodeninám'] },
    en: { short: 'Cafés & coffee shops', kind: 'Stamp card', client: 'Anna', reward: 'Free coffee', left: '3 more to a reward', scan: 'Stamp added', chips: ['⚡ Double stamps 2–5 pm', '💌 “1 coffee to your reward” — sent', '🎂 Birthday greeting'] },
  },
  beauty: {
    type: 'visits', brand: 'Velvet Studio', emoji: '💅', total: 8, done: 5,
    ru: { short: 'Салоны и барбершопы', kind: 'Скидочная карта · 10%', client: 'Мария', reward: 'Бесплатная укладка', left: 'Ещё 3 визита до подарка', scan: 'Визит отмечен', chips: ['💌 «Мария, пора на окрашивание?» — отправлено', '🎁 +1 визит в подарок за подругу', '⭐ Просьба об отзыве после визита'] },
    uk: { short: 'Салони та барбершопи', kind: 'Знижкова картка · 10%', client: 'Марія', reward: 'Безкоштовна укладка', left: 'Ще 3 візити до подарунка', scan: 'Візит відмічено', chips: ['💌 «Маріє, час на фарбування?» — надіслано', '🎁 +1 візит у подарунок за подругу', '⭐ Прохання про відгук після візиту'] },
    sk: { short: 'Salóny a barbershopy', kind: 'Zľavová karta · 10 %', client: 'Mária', reward: 'Úprava vlasov zadarmo', left: 'Ešte 3 návštevy do darčeka', scan: 'Návšteva zaznamenaná', chips: ['💌 „Mária, nie je čas na farbenie?“ — odoslané', '🎁 +1 návšteva zadarmo za kamarátku', '⭐ Prosba o recenziu po návšteve'] },
    en: { short: 'Salons & barbershops', kind: 'Discount card · 10%', client: 'Maria', reward: 'Free styling', left: '3 more visits to a reward', scan: 'Visit recorded', chips: ['💌 “Maria, time for a colour refresh?” — sent', '🎁 +1 free visit for bringing a friend', '⭐ Review request after the visit'] },
  },
  shop: {
    type: 'points', brand: 'Nord Store', emoji: '🛍️', total: 250, done: 184,
    ru: { short: 'Магазины', kind: 'Накопительная карта', client: 'Олег', reward: 'Подарок за €250 покупок', left: 'До подарка осталось €66', scan: 'Покупка €64 добавлена', chips: ['🧾 Чек из кассы привязан к карте', '💌 Письмо о новинках отправлено', '🏷️ −15% в день рождения'] },
    uk: { short: 'Магазини', kind: 'Накопичувальна картка', client: 'Олег', reward: 'Подарунок за €250 покупок', left: 'До подарунка лишилося €66', scan: 'Покупку €64 додано', chips: ['🧾 Чек із каси прив’язано до картки', '💌 Лист про новинки надіслано', '🏷️ −15% у день народження'] },
    sk: { short: 'Obchody', kind: 'Bodová karta', client: 'Oleg', reward: 'Darček za nákupy 250 €', left: 'Do darčeka chýba 66 €', scan: 'Nákup 64 € pridaný', chips: ['🧾 Účtenka z pokladne priradená ku karte', '💌 E-mail o novinkách odoslaný', '🏷️ −15 % na narodeniny'] },
    en: { short: 'Retail shops', kind: 'Points card', client: 'Oleg', reward: 'Gift after €250 spent', left: '€66 to your gift', scan: '€64 purchase added', chips: ['🧾 Till receipt linked to the card', '💌 New-arrivals email sent', '🏷️ −15% on your birthday'] },
  },
  travel: {
    type: 'points', brand: 'Sunway Travel', emoji: '✈️', total: 300, done: 210,
    ru: { short: 'Турагентства', kind: 'Бонусная карта · 3%', client: 'Ирина', reward: 'Бонусы на следующий тур', left: 'Ещё €90 бонусов до скидки', scan: 'Тур €1 400 добавлен', chips: ['🌴 Рассылка «Лето 2027» отправлена', '🎁 +€50 за друга-туриста', '🎂 Поздравление и бонус ко дню рождения'] },
    uk: { short: 'Турагенції', kind: 'Бонусна картка · 3%', client: 'Ірина', reward: 'Бонуси на наступний тур', left: 'Ще €90 бонусів до знижки', scan: 'Тур €1 400 додано', chips: ['🌴 Розсилку «Літо 2027» надіслано', '🎁 +€50 за друга-туриста', '🎂 Привітання й бонус до дня народження'] },
    sk: { short: 'Cestovné kancelárie', kind: 'Bonusová karta · 3 %', client: 'Irina', reward: 'Bonusy na ďalší zájazd', left: 'Ešte 90 € bonusov do zľavy', scan: 'Zájazd 1 400 € pridaný', chips: ['🌴 Kampaň „Leto 2027“ odoslaná', '🎁 +50 € za kamaráta-cestovateľa', '🎂 Blahoželanie a bonus k narodeninám'] },
    en: { short: 'Travel agencies', kind: 'Bonus card · 3%', client: 'Irina', reward: 'Bonus for your next trip', left: '€90 more bonus to a discount', scan: '€1,400 trip added', chips: ['🌴 “Summer 2027” campaign sent', '🎁 +€50 for referring a traveller', '🎂 Birthday greeting with a bonus'] },
  },
  photo: {
    type: 'visits', brand: 'Lumen Studio', emoji: '📷', total: 5, done: 3,
    ru: { short: 'Фотостудии', kind: 'Карта съёмок', client: 'Ольга', reward: '5-я съёмка −30%', left: 'Ещё 2 съёмки до скидки', scan: 'Съёмка отмечена', chips: ['💌 «Пора обновить семейные фото?» — отправлено', '⭐ Просьба об отзыве после съёмки', '🎁 Бонус за подругу'] },
    uk: { short: 'Фотостудії', kind: 'Картка зйомок', client: 'Ольга', reward: '5-та зйомка −30%', left: 'Ще 2 зйомки до знижки', scan: 'Зйомку відмічено', chips: ['💌 «Час оновити сімейні фото?» — надіслано', '⭐ Прохання про відгук після зйомки', '🎁 Бонус за подругу'] },
    sk: { short: 'Fotoštúdiá', kind: 'Karta fotení', client: 'Oľga', reward: '5. fotenie −30 %', left: 'Ešte 2 fotenia do zľavy', scan: 'Fotenie zaznamenané', chips: ['💌 „Nie je čas na nové rodinné fotky?“ — odoslané', '⭐ Prosba o recenziu po fotení', '🎁 Bonus za kamarátku'] },
    en: { short: 'Photo studios', kind: 'Shoot card', client: 'Olga', reward: '5th shoot −30%', left: '2 more shoots to a discount', scan: 'Shoot recorded', chips: ['💌 “Time to refresh the family photos?” — sent', '⭐ Review request after the shoot', '🎁 Bonus for bringing a friend'] },
  },
  grooming: {
    type: 'stamps', brand: 'Happy Paws', emoji: '🐾', total: 6, done: 4,
    ru: { short: 'Груминг для животных', kind: 'Штамп-карта питомца', client: 'Бадди', reward: '6-й груминг −50%', left: 'Ещё 2 визита до скидки', scan: 'Визит отмечен', chips: ['🔁 «Бадди пора на стрижку» — отправлено', '🎁 Бонус за друга с питомцем', '📊 Видно, кто давно не приходил'] },
    uk: { short: 'Грумінг для тварин', kind: 'Штамп-картка улюбленця', client: 'Бадді', reward: '6-й грумінг −50%', left: 'Ще 2 візити до знижки', scan: 'Візит відмічено', chips: ['🔁 «Бадді час на стрижку» — надіслано', '🎁 Бонус за друга з улюбленцем', '📊 Видно, хто давно не приходив'] },
    sk: { short: 'Grooming pre zvieratá', kind: 'Pečiatková karta miláčika', client: 'Buddy', reward: '6. grooming −50 %', left: 'Ešte 2 návštevy do zľavy', scan: 'Návšteva zaznamenaná', chips: ['🔁 „Buddy, je čas na strihanie“ — odoslané', '🎁 Bonus za kamaráta s miláčikom', '📊 Vidno, kto dlho neprišiel'] },
    en: { short: 'Pet grooming', kind: 'Pet stamp card', client: 'Buddy', reward: '6th groom half price', left: '2 more visits to a discount', scan: 'Visit recorded', chips: ['🔁 “Time for Buddy’s trim” — sent', '🎁 Bonus for a friend with a pet', '📊 See who hasn’t been back'] },
  },
};
