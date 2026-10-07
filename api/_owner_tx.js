// Дополнительные тексты кабинета владельца (внимание, фильтры, карточка клиента, экспорт, «запомнить») — 4 языка.
module.exports = {
  ru: {
    attT: 'Сегодня стоит обратить внимание', attRisk: 'Давно не были', attNear: 'Близко к награде', attVip: 'VIP-клиенты', attNone: 'Всё спокойно — все клиенты на месте.', attGo: 'Показать',
    fAll: 'Все', fVip: 'VIP', fRisk: 'Давно не были', fNear: 'Близко к награде', sortBy: 'Сортировка', sLast: 'Последний визит', sVisits: 'Больше визитов', sName: 'По имени',
    csv: 'Скачать CSV', call: 'Позвонить', write: 'Написать', cards: 'Карты', noCards: 'Карт пока нет', close: 'Закрыть', notesT: 'Заметки',
    remember: 'Запомнить на этом устройстве', showPw: 'Показать пароль', ago: (m) => m < 1 ? 'только что' : m < 60 ? `${m} мин назад` : `${Math.floor(m / 60)} ч назад`,
    auto: 'Обновляется автоматически', loading: 'Загружаем данные…', homeHint: 'Совет: добавьте эту страницу на экран «Домой» — откроется как приложение.',
  },
  uk: {
    attT: 'Сьогодні варто звернути увагу', attRisk: 'Давно не були', attNear: 'Близько до нагороди', attVip: 'VIP-клієнти', attNone: 'Усе спокійно — усі клієнти на місці.', attGo: 'Показати',
    fAll: 'Усі', fVip: 'VIP', fRisk: 'Давно не були', fNear: 'Близько до нагороди', sortBy: 'Сортування', sLast: 'Останній візит', sVisits: 'Більше візитів', sName: 'За іменем',
    csv: 'Завантажити CSV', call: 'Подзвонити', write: 'Написати', cards: 'Картки', noCards: 'Карток поки немає', close: 'Закрити', notesT: 'Нотатки',
    remember: 'Запам’ятати на цьому пристрої', showPw: 'Показати пароль', ago: (m) => m < 1 ? 'щойно' : m < 60 ? `${m} хв тому` : `${Math.floor(m / 60)} год тому`,
    auto: 'Оновлюється автоматично', loading: 'Завантажуємо дані…', homeHint: 'Порада: додайте цю сторінку на екран «Додому» — відкриється як застосунок.',
  },
  sk: {
    attT: 'Dnes stojí za pozornosť', attRisk: 'Dlho neprišli', attNear: 'Blízko k odmene', attVip: 'VIP zákazníci', attNone: 'Všetko v poriadku — zákazníci sú na mieste.', attGo: 'Zobraziť',
    fAll: 'Všetci', fVip: 'VIP', fRisk: 'Dlho neprišli', fNear: 'Blízko k odmene', sortBy: 'Zoradiť', sLast: 'Posledná návšteva', sVisits: 'Najviac návštev', sName: 'Podľa mena',
    csv: 'Stiahnuť CSV', call: 'Zavolať', write: 'Napísať', cards: 'Karty', noCards: 'Zatiaľ žiadne karty', close: 'Zavrieť', notesT: 'Poznámky',
    remember: 'Zapamätať na tomto zariadení', showPw: 'Zobraziť heslo', ago: (m) => m < 1 ? 'práve teraz' : m < 60 ? `pred ${m} min` : `pred ${Math.floor(m / 60)} h`,
    auto: 'Aktualizuje sa automaticky', loading: 'Načítavame údaje…', homeHint: 'Tip: pridajte si túto stránku na plochu — otvorí sa ako aplikácia.',
  },
  en: {
    attT: 'Worth a look today', attRisk: 'Haven’t visited lately', attNear: 'Close to a reward', attVip: 'VIP customers', attNone: 'All quiet — your customers are on track.', attGo: 'Show',
    fAll: 'All', fVip: 'VIP', fRisk: 'Lapsed', fNear: 'Close to reward', sortBy: 'Sort', sLast: 'Last visit', sVisits: 'Most visits', sName: 'By name',
    csv: 'Download CSV', call: 'Call', write: 'Email', cards: 'Cards', noCards: 'No cards yet', close: 'Close', notesT: 'Notes',
    remember: 'Remember on this device', showPw: 'Show password', ago: (m) => m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`,
    auto: 'Updates automatically', loading: 'Loading your data…', homeHint: 'Tip: add this page to your Home Screen — it opens like an app.',
  },
};
