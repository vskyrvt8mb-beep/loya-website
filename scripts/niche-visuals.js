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
};
