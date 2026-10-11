// Дополнительные тексты кабинета владельца (внимание, фильтры, карточка клиента, экспорт, «запомнить») — 4 языка.
module.exports = {
  ru: {
    tabPoints: 'Точки', pAll: 'Все точки', pClients: 'Клиентов', pScansToday: 'Визитов сегодня', pScansMonth: 'Визитов за месяц', pNew: 'Новых за месяц', pRevMonth: 'Выручка за месяц', pAvg: 'Средний чек', pRewards: 'Наград за месяц', pBonus: 'Бонусов на картах', pActive: 'Активных за 30 дней',
    pDays: 'Визиты по дням', pMonths: 'Выручка по месяцам', pTop: 'Лучшие клиенты точки', pCompare: 'Сравнение точек', pPoint: 'Точка', pUpd: 'Обновлено', pDevices: (n) => n === 1 ? '1 устройство' : `${n} устр.`, pShared: 'общая база', pOwn: 'своя база', pNone: 'Точки появятся, когда программа версии 2.17 или новее на кассах выйдет на связь.', pHint: 'Каждая точка присылает свою статистику сама, раз в несколько минут. Имена и телефоны клиентов здесь не передаются.',
    attT: 'Сегодня стоит обратить внимание', attRisk: 'Давно не были', attNear: 'Близко к награде', attVip: 'VIP-клиенты', attNone: 'Всё спокойно — все клиенты на месте.', attGo: 'Показать',
    fAll: 'Все', fVip: 'VIP', fRisk: 'Давно не были', fNear: 'Близко к награде', sortBy: 'Сортировка', sLast: 'Последний визит', sVisits: 'Больше визитов', sName: 'По имени',
    csv: 'Скачать CSV', call: 'Позвонить', write: 'Написать', cards: 'Карты', noCards: 'Карт пока нет', close: 'Закрыть', notesT: 'Заметки',
    remember: 'Запомнить на этом устройстве', showPw: 'Показать пароль', ago: (m) => m < 1 ? 'только что' : m < 60 ? `${m} мин назад` : `${Math.floor(m / 60)} ч назад`,
    auto: 'Обновляется автоматически', loading: 'Загружаем данные…', homeHint: 'Совет: добавьте эту страницу на экран «Домой» — откроется как приложение.',
  },
  uk: {
    tabPoints: 'Точки', pAll: 'Усі точки', pClients: 'Клієнтів', pScansToday: 'Візитів сьогодні', pScansMonth: 'Візитів за місяць', pNew: 'Нових за місяць', pRevMonth: 'Виручка за місяць', pAvg: 'Середній чек', pRewards: 'Нагород за місяць', pBonus: 'Бонусів на картках', pActive: 'Активних за 30 днів',
    pDays: 'Візити по днях', pMonths: 'Виручка за місяцями', pTop: 'Найкращі клієнти точки', pCompare: 'Порівняння точок', pPoint: 'Точка', pUpd: 'Оновлено', pDevices: (n) => n === 1 ? '1 пристрій' : `${n} пристр.`, pShared: 'спільна база', pOwn: 'своя база', pNone: 'Точки з’являться, коли програма версії 2.17 або новіша на касах вийде на зв’язок.', pHint: 'Кожна точка надсилає свою статистику сама, раз на кілька хвилин. Імена й телефони клієнтів тут не передаються.',
    attT: 'Сьогодні варто звернути увагу', attRisk: 'Давно не були', attNear: 'Близько до нагороди', attVip: 'VIP-клієнти', attNone: 'Усе спокійно — усі клієнти на місці.', attGo: 'Показати',
    fAll: 'Усі', fVip: 'VIP', fRisk: 'Давно не були', fNear: 'Близько до нагороди', sortBy: 'Сортування', sLast: 'Останній візит', sVisits: 'Більше візитів', sName: 'За іменем',
    csv: 'Завантажити CSV', call: 'Подзвонити', write: 'Написати', cards: 'Картки', noCards: 'Карток поки немає', close: 'Закрити', notesT: 'Нотатки',
    remember: 'Запам’ятати на цьому пристрої', showPw: 'Показати пароль', ago: (m) => m < 1 ? 'щойно' : m < 60 ? `${m} хв тому` : `${Math.floor(m / 60)} год тому`,
    auto: 'Оновлюється автоматично', loading: 'Завантажуємо дані…', homeHint: 'Порада: додайте цю сторінку на екран «Додому» — відкриється як застосунок.',
  },
  sk: {
    tabPoints: 'Prevádzky', pAll: 'Všetky prevádzky', pClients: 'Klientov', pScansToday: 'Návštev dnes', pScansMonth: 'Návštev za mesiac', pNew: 'Nových za mesiac', pRevMonth: 'Tržby za mesiac', pAvg: 'Priemerný nákup', pRewards: 'Odmien za mesiac', pBonus: 'Bonusov na kartách', pActive: 'Aktívnych za 30 dní',
    pDays: 'Návštevy po dňoch', pMonths: 'Tržby po mesiacoch', pTop: 'Najlepší klienti prevádzky', pCompare: 'Porovnanie prevádzok', pPoint: 'Prevádzka', pUpd: 'Aktualizované', pDevices: (n) => n === 1 ? '1 zariadenie' : `${n} zar.`, pShared: 'spoločná databáza', pOwn: 'vlastná databáza', pNone: 'Prevádzky sa objavia, keď sa program verzie 2.17 alebo novší na pokladniach pripojí.', pHint: 'Každá prevádzka posiela svoju štatistiku sama, raz za pár minút. Mená a telefóny klientov sa sem neposielajú.',
    attT: 'Dnes stojí za pozornosť', attRisk: 'Dlho neprišli', attNear: 'Blízko k odmene', attVip: 'VIP zákazníci', attNone: 'Všetko v poriadku — zákazníci sú na mieste.', attGo: 'Zobraziť',
    fAll: 'Všetci', fVip: 'VIP', fRisk: 'Dlho neprišli', fNear: 'Blízko k odmene', sortBy: 'Zoradiť', sLast: 'Posledná návšteva', sVisits: 'Najviac návštev', sName: 'Podľa mena',
    csv: 'Stiahnuť CSV', call: 'Zavolať', write: 'Napísať', cards: 'Karty', noCards: 'Zatiaľ žiadne karty', close: 'Zavrieť', notesT: 'Poznámky',
    remember: 'Zapamätať na tomto zariadení', showPw: 'Zobraziť heslo', ago: (m) => m < 1 ? 'práve teraz' : m < 60 ? `pred ${m} min` : `pred ${Math.floor(m / 60)} h`,
    auto: 'Aktualizuje sa automaticky', loading: 'Načítavame údaje…', homeHint: 'Tip: pridajte si túto stránku na plochu — otvorí sa ako aplikácia.',
  },
  en: {
    tabPoints: 'Locations', pAll: 'All locations', pClients: 'Clients', pScansToday: 'Visits today', pScansMonth: 'Visits this month', pNew: 'New this month', pRevMonth: 'Revenue this month', pAvg: 'Average check', pRewards: 'Rewards this month', pBonus: 'Bonuses on cards', pActive: 'Active in 30 days',
    pDays: 'Visits by day', pMonths: 'Revenue by month', pTop: 'Top clients here', pCompare: 'Compare locations', pPoint: 'Location', pUpd: 'Updated', pDevices: (n) => n === 1 ? '1 device' : `${n} devices`, pShared: 'shared database', pOwn: 'own database', pNone: 'Locations appear once the app (version 2.17 or newer) at your tills checks in.', pHint: 'Each location sends its own statistics every few minutes. Client names and phone numbers are not sent here.',
    attT: 'Worth a look today', attRisk: 'Haven’t visited lately', attNear: 'Close to a reward', attVip: 'VIP customers', attNone: 'All quiet — your customers are on track.', attGo: 'Show',
    fAll: 'All', fVip: 'VIP', fRisk: 'Lapsed', fNear: 'Close to reward', sortBy: 'Sort', sLast: 'Last visit', sVisits: 'Most visits', sName: 'By name',
    csv: 'Download CSV', call: 'Call', write: 'Email', cards: 'Cards', noCards: 'No cards yet', close: 'Close', notesT: 'Notes',
    remember: 'Remember on this device', showPw: 'Show password', ago: (m) => m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`,
    auto: 'Updates automatically', loading: 'Loading your data…', homeHint: 'Tip: add this page to your Home Screen — it opens like an app.',
  },
};
