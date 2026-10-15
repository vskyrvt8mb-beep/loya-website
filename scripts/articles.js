// Статьи для блога (/blog/ и /ru/blog/ …): полезные тексты для владельцев кафе, салонов и магазинов.
// Собирает scripts/build-seo.js. Блок: ['h2', текст] | ['p', текст] | ['ul', [пункты]] | ['tip', текст].
// Цифры — только из практики «как посчитать у себя», без выдуманной статистики.
module.exports = [
  {
    slug: 'bring-customers-back', icon: '🔁', date: '2026-10-13',
    ru: {
      title: 'Как вернуть клиентов в кафе или салон: 7 простых способов',
      desc: 'Практичные способы сделать так, чтобы гости приходили снова: карта лояльности, напоминания, день рождения, работа с пропавшими клиентами и правильные акции.',
      lead: 'Новый гость стоит дорого: реклама, скидки, время. Гость, который уже был у вас и вернулся, приносит деньги почти бесплатно. Вот семь способов, которые работают даже в маленьком заведении без маркетолога.',
      blocks: [
        ['h2', '1. Дайте повод вернуться — карту лояльности'],
        ['p', 'Самый понятный повод: «каждый 10-й кофе в подарок» или «бонусы с каждой покупки». Важно, чтобы подарок был достижим — 6–10 визитов, а не 30. Тогда гость видит цель и тянется к ней.'],
        ['h2', '2. Уберите бумагу'],
        ['p', 'Бумажные карточки теряют, забывают и подделывают. Электронная карта живёт в телефоне — в Apple Wallet, Google Wallet или в Telegram — и всегда под рукой. Гостю не нужно ничего скачивать: QR на стойке, короткая форма, и карта уже в телефоне.'],
        ['h2', '3. Напоминайте, когда до подарка остался шаг'],
        ['p', 'Человек, которому осталось 1–2 штампа, — ваш самый «тёплый» гость. Короткое сообщение «вам остался всего шаг до подарка» часто приводит его уже на этой неделе.'],
        ['h2', '4. Поздравляйте с днём рождения'],
        ['p', 'Поздравление с маленьким подарком — один из самых приятных поводов зайти. Достаточно спросить дату рождения при регистрации, а отправку поручить программе.'],
        ['h2', '5. Замечайте, кто пропал'],
        ['p', 'Если постоянный гость ходил раз в неделю и не был уже месяц — это сигнал. Позовите его обратно личным сообщением раньше, чем он привыкнет к конкурентам.'],
        ['h2', '6. Акции — в тихие часы'],
        ['p', '«Двойные штампы с 14:00 до 16:00» заполняют пустые часы и не съедают выручку в часы пик. Посмотрите, когда у вас меньше всего гостей, — и запускайте акцию именно тогда.'],
        ['h2', '7. Считайте результат'],
        ['ul', ['сколько гостей вернулось за месяц;', 'какой средний чек у постоянных и у новых;', 'сколько подарков выдано и сколько это стоило.']],
        ['tip', 'В Loya всё это делается автоматически: карта в Wallet, напоминания «шаг до подарка», поздравления, список «кто пропал» и отчёт за месяц на почту. Можно попробовать 14 дней бесплатно.']
      ]
    },
    uk: {
      title: 'Як повернути клієнтів у кав’ярню чи салон: 7 простих способів',
      desc: 'Практичні способи зробити так, щоб гості приходили знову: картка лояльності, нагадування, день народження, робота з клієнтами, які зникли, і правильні акції.',
      lead: 'Новий гість коштує дорого: реклама, знижки, час. Гість, який уже був у вас і повернувся, приносить гроші майже безкоштовно. Ось сім способів, що працюють навіть у маленькому закладі без маркетолога.',
      blocks: [
        ['h2', '1. Дайте привід повернутися — картку лояльності'],
        ['p', 'Найзрозуміліший привід: «кожна 10-та кава в подарунок» або «бонуси з кожної покупки». Важливо, щоб подарунок був досяжним — 6–10 візитів, а не 30. Тоді гість бачить мету й тягнеться до неї.'],
        ['h2', '2. Приберіть папір'],
        ['p', 'Паперові картки губляться, забуваються й підробляються. Електронна картка живе в телефоні — в Apple Wallet, Google Wallet або в Telegram — і завжди під рукою. Гостю нічого не треба завантажувати: QR на стійці, коротка форма — і картка вже в телефоні.'],
        ['h2', '3. Нагадуйте, коли до подарунка лишився крок'],
        ['p', 'Людина, якій лишилося 1–2 штампи, — ваш найтепліший гість. Коротке повідомлення «вам лишився лише крок до подарунка» часто приводить її вже цього тижня.'],
        ['h2', '4. Вітайте з днем народження'],
        ['p', 'Привітання з маленьким подарунком — один із найприємніших приводів зайти. Достатньо запитати дату народження під час реєстрації, а надсилання доручити програмі.'],
        ['h2', '5. Помічайте, хто зник'],
        ['p', 'Якщо постійний гість ходив раз на тиждень і не був уже місяць — це сигнал. Покличте його особистим повідомленням раніше, ніж він звикне до конкурентів.'],
        ['h2', '6. Акції — у тихі години'],
        ['p', '«Подвійні штампи з 14:00 до 16:00» заповнюють порожні години й не з’їдають виручку в години пік. Подивіться, коли у вас найменше гостей, — і запускайте акцію саме тоді.'],
        ['h2', '7. Рахуйте результат'],
        ['ul', ['скільки гостей повернулося за місяць;', 'який середній чек у постійних і в нових;', 'скільки подарунків видано і скільки це коштувало.']],
        ['tip', 'У Loya все це відбувається автоматично: картка у Wallet, нагадування «крок до подарунка», привітання, список «хто зник» і звіт за місяць на пошту. Можна спробувати 14 днів безкоштовно.']
      ]
    },
    sk: {
      title: 'Ako vrátiť zákazníkov do kaviarne či salónu: 7 jednoduchých spôsobov',
      desc: 'Praktické spôsoby, ako dosiahnuť, aby sa hostia vracali: vernostná karta, pripomienky, narodeniny, práca so zákazníkmi, ktorí prestali chodiť, a správne akcie.',
      lead: 'Nový hosť je drahý: reklama, zľavy, čas. Hosť, ktorý už u vás bol a vrátil sa, prináša peniaze takmer zadarmo. Tu je sedem spôsobov, ktoré fungujú aj v malej prevádzke bez marketéra.',
      blocks: [
        ['h2', '1. Dajte dôvod vrátiť sa — vernostnú kartu'],
        ['p', 'Najzrozumiteľnejší dôvod: „každá 10. káva zadarmo“ alebo „body z každého nákupu“. Dôležité je, aby bol darček dosiahnuteľný — 6–10 návštev, nie 30. Potom hosť vidí cieľ a chce ho dosiahnuť.'],
        ['h2', '2. Zbavte sa papiera'],
        ['p', 'Papierové kartičky sa strácajú, zabúdajú a falšujú. Elektronická karta je v telefóne — v Apple Wallet, Google Wallet alebo v Telegrame — a vždy poruke. Hosť nemusí nič sťahovať: QR kód na pulte, krátky formulár a karta je v telefóne.'],
        ['h2', '3. Pripomeňte sa, keď do darčeka chýba krok'],
        ['p', 'Človek, ktorému chýbajú 1–2 pečiatky, je váš najvďačnejší hosť. Krátka správa „k darčeku vám chýba už len krok“ ho často privedie ešte v ten týždeň.'],
        ['h2', '4. Blahoželajte k narodeninám'],
        ['p', 'Blahoželanie s malým darčekom je jeden z najpríjemnejších dôvodov zastaviť sa. Stačí sa pri registrácii spýtať na dátum narodenia a posielanie nechať na program.'],
        ['h2', '5. Všímajte si, kto prestal chodiť'],
        ['p', 'Ak stály hosť chodil raz týždenne a už mesiac neprišiel, je to signál. Pozvite ho osobnou správou skôr, než si zvykne na konkurenciu.'],
        ['h2', '6. Akcie v tichých hodinách'],
        ['p', '„Dvojité pečiatky od 14:00 do 16:00“ zaplnia prázdne hodiny a neuberajú z tržieb v špičke. Pozrite sa, kedy máte najmenej hostí — a spustite akciu práve vtedy.'],
        ['h2', '7. Merajte výsledok'],
        ['ul', ['koľko hostí sa za mesiac vrátilo;', 'aký je priemerný nákup stálych a nových hostí;', 'koľko darčekov ste rozdali a koľko to stálo.']],
        ['tip', 'V Loya sa to všetko deje automaticky: karta vo Wallet, pripomienky „krok do darčeka“, blahoželania, zoznam „kto prestal chodiť“ a mesačný prehľad e-mailom. Môžete vyskúšať 14 dní zadarmo.']
      ]
    },
    en: {
      title: 'How to bring customers back to your café or salon: 7 simple ways',
      desc: 'Practical ways to get guests to come back: a loyalty card, reminders, birthdays, winning back lapsed customers and well-timed promotions.',
      lead: 'A new guest is expensive: ads, discounts, time. A guest who has been with you before and comes back brings money almost for free. Here are seven ways that work even in a small venue without a marketer.',
      blocks: [
        ['h2', '1. Give a reason to return — a loyalty card'],
        ['p', 'The clearest reason: “every 10th coffee free” or “points on every purchase”. Keep the reward reachable — 6–10 visits, not 30. Then guests see the goal and go for it.'],
        ['h2', '2. Drop the paper'],
        ['p', 'Paper cards get lost, forgotten and faked. A digital card lives in the phone — in Apple Wallet, Google Wallet or Telegram — and is always at hand. Guests download nothing: a QR code at the counter, a short form, and the card is in their phone.'],
        ['h2', '3. Nudge them when the reward is one step away'],
        ['p', 'Someone who is 1–2 stamps away is your warmest guest. A short message — “just one step to your reward” — often brings them in that same week.'],
        ['h2', '4. Celebrate birthdays'],
        ['p', 'Birthday wishes with a small gift are one of the nicest reasons to drop in. Ask for the date of birth at sign-up and let the app do the sending.'],
        ['h2', '5. Notice who has gone quiet'],
        ['p', 'If a regular came weekly and hasn’t been in for a month, that’s a signal. Invite them back with a personal message before they get used to a competitor.'],
        ['h2', '6. Run promotions in quiet hours'],
        ['p', '“Double stamps from 2 to 4 pm” fills empty hours without eating into peak-time revenue. Check when you have the fewest guests — and run the promotion exactly then.'],
        ['h2', '7. Measure the result'],
        ['ul', ['how many guests came back this month;', 'the average check of regulars vs new guests;', 'how many rewards you gave and what they cost.']],
        ['tip', 'Loya does all of this automatically: the card in Wallet, “one step to your reward” reminders, birthday wishes, a “who has gone quiet” list and a monthly report by email. Try it free for 14 days.']
      ]
    }
  },
  {
    slug: 'digital-loyalty-card', icon: '📱', date: '2026-10-13',
    ru: {
      title: 'Электронная карта лояльности вместо бумажной: как перейти за один день',
      desc: 'Пошаговый план перехода с бумажных карточек на электронные: что выбрать, как перенести гостей, как объяснить новую карту и не потерять ни одного штампа.',
      lead: 'Перейти с бумажных карточек на электронные проще, чем кажется. Не нужно покупать оборудование и уговаривать гостей ставить приложения. Вот план на один день.',
      blocks: [
        ['h2', 'Утро: решите, как будет устроена карта'],
        ['p', 'Оставьте ту же механику, к которой привыкли гости: если был «каждый 10-й кофе в подарок» — пусть так и останется. Новое правило в день перехода только запутает.'],
        ['h2', 'Что нужно для работы'],
        ['ul', ['компьютер или телефон на кассе — сканером станет камера;', 'QR-код на стойке или столике, по которому гость регистрируется сам;', 'программа, которая отправляет карту гостю в Apple Wallet, Google Wallet, на почту или в Telegram.']],
        ['h2', 'День: переносим гостей со штампами'],
        ['p', 'Гость приходит с бумажной карточкой — вы создаёте ему электронную карту и сразу ставите столько же штампов, сколько было на бумаге. Бумажку можно забрать: так никто не получит подарок дважды.'],
        ['p', 'Если у вас уже есть список клиентов в Excel — его можно загрузить сразу, одной таблицей.'],
        ['h2', 'Как объяснить гостю за 10 секунд'],
        ['p', '«Отсканируйте QR — карта появится в телефоне, штампы будут там. Бумажная больше не нужна.» Короткая фраза, которую сотрудник повторяет каждому гостю, работает лучше любой листовки.'],
        ['h2', 'Вечер: проверяем'],
        ['ul', ['сколько гостей получили электронную карту за день;', 'у всех ли перенесены штампы;', 'стоит ли QR на видном месте у кассы.']],
        ['h2', 'Что получите через месяц'],
        ['p', 'Вы впервые увидите, кто ваши постоянные гости, как часто они приходят и сколько тратят. А карта в телефоне больше не потеряется.'],
        ['tip', 'В Loya переход занимает около 10 минут: выберите готовую программу под свой бизнес, распечатайте афишу с QR и начните сканировать. Первые 14 дней — бесплатно.']
      ]
    },
    uk: {
      title: 'Електронна картка лояльності замість паперової: як перейти за один день',
      desc: 'Покроковий план переходу з паперових карток на електронні: що обрати, як перенести гостей, як пояснити нову картку й не втратити жодного штампа.',
      lead: 'Перейти з паперових карток на електронні простіше, ніж здається. Не треба купувати обладнання й умовляти гостей ставити застосунки. Ось план на один день.',
      blocks: [
        ['h2', 'Ранок: вирішіть, як буде влаштована картка'],
        ['p', 'Залиште ту саму механіку, до якої звикли гості: якщо була «кожна 10-та кава в подарунок» — нехай так і залишиться. Нове правило в день переходу лише заплутає.'],
        ['h2', 'Що потрібно для роботи'],
        ['ul', ['комп’ютер або телефон на касі — сканером стане камера;', 'QR-код на стійці чи столику, за яким гість реєструється сам;', 'програма, яка надсилає картку гостю в Apple Wallet, Google Wallet, на пошту або в Telegram.']],
        ['h2', 'День: переносимо гостей зі штампами'],
        ['p', 'Гість приходить із паперовою карткою — ви створюєте йому електронну й одразу ставите стільки ж штампів, скільки було на папері. Папірець можна забрати: так ніхто не отримає подарунок двічі.'],
        ['p', 'Якщо у вас уже є список клієнтів в Excel — його можна завантажити одразу, однією таблицею.'],
        ['h2', 'Як пояснити гостю за 10 секунд'],
        ['p', '«Відскануйте QR — картка з’явиться в телефоні, штампи будуть там. Паперова більше не потрібна.» Коротка фраза, яку працівник повторює кожному гостю, працює краще за будь-яку листівку.'],
        ['h2', 'Вечір: перевіряємо'],
        ['ul', ['скільки гостей отримали електронну картку за день;', 'чи в усіх перенесено штампи;', 'чи стоїть QR на видному місці біля каси.']],
        ['h2', 'Що отримаєте за місяць'],
        ['p', 'Ви вперше побачите, хто ваші постійні гості, як часто вони приходять і скільки витрачають. А картка в телефоні більше не загубиться.'],
        ['tip', 'У Loya перехід займає близько 10 хвилин: оберіть готову програму під свій бізнес, роздрукуйте афішу з QR і почніть сканувати. Перші 14 днів — безкоштовно.']
      ]
    },
    sk: {
      title: 'Elektronická vernostná karta namiesto papierovej: ako prejsť za jeden deň',
      desc: 'Postup krok za krokom pri prechode z papierových kartičiek na elektronické: čo vybrať, ako preniesť hostí, ako vysvetliť novú kartu a nestratiť ani jednu pečiatku.',
      lead: 'Prejsť z papierových kartičiek na elektronické je jednoduchšie, než sa zdá. Netreba kupovať zariadenie ani prehovárať hostí, aby si inštalovali aplikácie. Tu je plán na jeden deň.',
      blocks: [
        ['h2', 'Ráno: rozhodnite, ako bude karta fungovať'],
        ['p', 'Ponechajte rovnaký princíp, na ktorý sú hostia zvyknutí: ak platila „každá 10. káva zadarmo“, nech to tak zostane. Nové pravidlo v deň prechodu by len mýlilo.'],
        ['h2', 'Čo potrebujete'],
        ['ul', ['počítač alebo telefón pri pokladni — skenerom bude kamera;', 'QR kód na pulte alebo stolíku, cez ktorý sa hosť zaregistruje sám;', 'program, ktorý pošle kartu hosťovi do Apple Wallet, Google Wallet, e-mailom alebo do Telegramu.']],
        ['h2', 'Deň: prenášame hostí s pečiatkami'],
        ['p', 'Hosť príde s papierovou kartičkou — vytvoríte mu elektronickú a hneď pridáte toľko pečiatok, koľko mal na papieri. Papierik si nechajte: nikto tak nedostane darček dvakrát.'],
        ['p', 'Ak už máte zoznam zákazníkov v Exceli, môžete ho nahrať naraz jednou tabuľkou.'],
        ['h2', 'Ako to hosťovi vysvetliť za 10 sekúnd'],
        ['p', '„Naskenujte QR kód — karta sa objaví v telefóne a pečiatky budú tam. Papierová už netreba.“ Krátka veta, ktorú obsluha zopakuje každému hosťovi, funguje lepšie než akýkoľvek leták.'],
        ['h2', 'Večer: kontrola'],
        ['ul', ['koľko hostí dostalo elektronickú kartu;', 'či majú všetci prenesené pečiatky;', 'či je QR kód pri pokladni dobre viditeľný.']],
        ['h2', 'Čo budete mať o mesiac'],
        ['p', 'Prvýkrát uvidíte, kto sú vaši stáli hostia, ako často chodia a koľko míňajú. A karta v telefóne sa už nestratí.'],
        ['tip', 'V Loya trvá prechod asi 10 minút: vyberte hotový program pre váš typ podniku, vytlačte plagát s QR kódom a začnite skenovať. Prvých 14 dní je zadarmo.']
      ]
    },
    en: {
      title: 'A digital loyalty card instead of paper: how to switch in one day',
      desc: 'A step-by-step plan for moving from paper punch cards to digital ones: what to choose, how to move your guests over, how to explain the new card and keep every stamp.',
      lead: 'Switching from paper punch cards to digital ones is easier than it looks. No hardware to buy, no persuading guests to install apps. Here is a one-day plan.',
      blocks: [
        ['h2', 'Morning: decide how the card works'],
        ['p', 'Keep the same mechanics your guests already know: if it was “every 10th coffee free”, keep it. A new rule on switch-over day only confuses people.'],
        ['h2', 'What you need'],
        ['ul', ['a computer or phone at the till — its camera becomes the scanner;', 'a QR code on the counter or table that guests use to sign up themselves;', 'an app that sends the card to Apple Wallet, Google Wallet, email or Telegram.']],
        ['h2', 'Daytime: move guests and their stamps'],
        ['p', 'A guest comes in with a paper card — you create a digital card and add the same number of stamps they had on paper. Keep the paper card so nobody gets the reward twice.'],
        ['p', 'If you already have a customer list in Excel, you can import it in one go.'],
        ['h2', 'How to explain it in 10 seconds'],
        ['p', '“Scan the QR code — the card appears in your phone with your stamps. You don’t need the paper one anymore.” A short line your staff repeats to every guest works better than any flyer.'],
        ['h2', 'Evening: check'],
        ['ul', ['how many guests got a digital card today;', 'whether everyone’s stamps were carried over;', 'whether the QR code is clearly visible at the till.']],
        ['h2', 'What you get in a month'],
        ['p', 'For the first time you’ll see who your regulars are, how often they come and how much they spend. And the card in their phone won’t get lost.'],
        ['tip', 'With Loya the switch takes about 10 minutes: pick a ready-made program for your business, print the QR poster and start scanning. The first 14 days are free.']
      ]
    }
  },
  {
    slug: 'loyalty-program-ideas', icon: '🎯', date: '2026-10-13',
    ru: {
      title: 'Какую программу лояльности выбрать: штампы, скидка, бонусы или уровни',
      desc: 'Сравнение четырёх видов программ лояльности для малого бизнеса с примерами для кофейни, барбершопа, салона и магазина: что выбрать и как посчитать выгоду.',
      lead: 'Универсальной программы лояльности нет. То, что отлично работает в кофейне, может не подойти магазину одежды. Разберём четыре основных вида и кому какой подходит.',
      blocks: [
        ['h2', 'Штамп-карта: «каждый N-й — в подарок»'],
        ['p', 'Самая понятная механика. Подходит, когда гость приходит часто и покупает примерно одно и то же: кофе, выпечка, стрижка, мойка машины. Пример: в кофейне — каждый 9-й кофе бесплатно, в барбершопе — каждая 6-я стрижка за полцены.'],
        ['h2', 'Постоянная скидка'],
        ['p', 'Просто и честно: скидка 5–10% на каждую покупку. Хорошо работает в магазинах и салонах, где чек разный. Минус — скидка быстро становится «нормой» и перестаёт радовать.'],
        ['h2', 'Бонусы с суммы покупок'],
        ['p', 'Гость копит бонусы с каждой покупки: например, 1 бонус за каждые 50 €. Бонусы можно потратить на подарок или оплату части следующего чека. Подходит, когда чеки большие и разные.'],
        ['h2', 'Уровни: Silver и Gold'],
        ['p', 'Чем чаще гость приходит, тем выше его уровень и тем приятнее привилегии: двойные бонусы, скидка уровня. Уровни добавляют азарт и хорошо удерживают самых ценных гостей. Их можно сочетать с любой из механик выше.'],
        ['h2', 'Как посчитать, окупится ли'],
        ['ul', ['возьмите средний чек и себестоимость подарка;', 'прикиньте, сколько дополнительных визитов в месяц даст программа;', 'дополнительные визиты × средний чек — это и есть дополнительная выручка.']],
        ['p', 'Если подарок стоит вам 1 € себестоимости, а гость ради него пришёл 9 раз — программа явно окупается.'],
        ['h2', 'Сгорание бонусов — да или нет?'],
        ['p', 'Срок жизни бонусов (например, 6 месяцев без визита) мягко напоминает гостю вернуться вовремя. Главное — предупредить заранее: за неделю до сгорания отправить сообщение.'],
        ['tip', 'В Loya при первой настройке программа сама предложит 3 готовых варианта под ваш вид бизнеса и валюту — выберите одним нажатием, цифры потом легко поправить.']
      ]
    },
    uk: {
      title: 'Яку програму лояльності обрати: штампи, знижка, бонуси чи рівні',
      desc: 'Порівняння чотирьох видів програм лояльності для малого бізнесу з прикладами для кав’ярні, барбершопу, салону й магазину: що обрати й як порахувати вигоду.',
      lead: 'Універсальної програми лояльності немає. Те, що чудово працює в кав’ярні, може не підійти магазину одягу. Розберімо чотири основні види і кому який підходить.',
      blocks: [
        ['h2', 'Штамп-картка: «кожна N-та — у подарунок»'],
        ['p', 'Найзрозуміліша механіка. Підходить, коли гість приходить часто й купує приблизно одне й те саме: каву, випічку, стрижку, мийку авто. Приклад: у кав’ярні — кожна 9-та кава безкоштовно, у барбершопі — кожна 6-та стрижка за пів ціни.'],
        ['h2', 'Постійна знижка'],
        ['p', 'Просто й чесно: знижка 5–10% на кожну покупку. Добре працює в магазинах і салонах, де чек різний. Мінус — знижка швидко стає «нормою» й перестає тішити.'],
        ['h2', 'Бонуси із суми покупок'],
        ['p', 'Гість накопичує бонуси з кожної покупки: наприклад, 1 бонус за кожні 50 €. Бонуси можна витратити на подарунок або оплату частини наступного чека. Підходить, коли чеки великі й різні.'],
        ['h2', 'Рівні: Silver і Gold'],
        ['p', 'Що частіше гість приходить, то вищий його рівень і приємніші привілеї: подвійні бонуси, знижка рівня. Рівні додають азарту й добре утримують найцінніших гостей. Їх можна поєднувати з будь-якою механікою вище.'],
        ['h2', 'Як порахувати, чи окупиться'],
        ['ul', ['візьміть середній чек і собівартість подарунка;', 'прикиньте, скільки додаткових візитів на місяць дасть програма;', 'додаткові візити × середній чек — це і є додаткова виручка.']],
        ['p', 'Якщо подарунок коштує вам 1 € собівартості, а гість заради нього прийшов 9 разів — програма явно окупається.'],
        ['h2', 'Згоряння бонусів — так чи ні?'],
        ['p', 'Термін дії бонусів (наприклад, 6 місяців без візиту) м’яко нагадує гостю повернутися вчасно. Головне — попередити заздалегідь: за тиждень до згоряння надіслати повідомлення.'],
        ['tip', 'У Loya під час першого налаштування програма сама запропонує 3 готові варіанти під ваш вид бізнесу й валюту — оберіть одним натисканням, цифри потім легко змінити.']
      ]
    },
    sk: {
      title: 'Aký vernostný program vybrať: pečiatky, zľava, body alebo úrovne',
      desc: 'Porovnanie štyroch druhov vernostných programov pre malý biznis s príkladmi pre kaviareň, barbershop, salón a obchod: čo vybrať a ako spočítať prínos.',
      lead: 'Univerzálny vernostný program neexistuje. Čo výborne funguje v kaviarni, nemusí sedieť obchodu s oblečením. Pozrime sa na štyri hlavné druhy a komu ktorý vyhovuje.',
      blocks: [
        ['h2', 'Pečiatková karta: „každý N-tý zadarmo“'],
        ['p', 'Najzrozumiteľnejší princíp. Hodí sa, keď hosť chodí často a kupuje približne to isté: kávu, pečivo, strih, umytie auta. Príklad: v kaviarni každá 9. káva zadarmo, v barbershope každý 6. strih za polovicu.'],
        ['h2', 'Stála zľava'],
        ['p', 'Jednoduché a férové: zľava 5–10 % na každý nákup. Funguje v obchodoch a salónoch, kde sa nákupy líšia. Nevýhoda — zľava sa rýchlo stane „normou“ a prestane tešiť.'],
        ['h2', 'Body zo sumy nákupov'],
        ['p', 'Hosť zbiera body z každého nákupu: napríklad 1 bod za každých 50 €. Body môže minúť na darček alebo na časť ďalšieho nákupu. Hodí sa pri veľkých a rôznych nákupoch.'],
        ['h2', 'Úrovne: Silver a Gold'],
        ['p', 'Čím častejšie hosť chodí, tým vyššia úroveň a príjemnejšie výhody: dvojnásobné body, zľava úrovne. Úrovne pridávajú hravosť a dobre udržia najcennejších hostí. Dajú sa kombinovať s ktorýmkoľvek princípom vyššie.'],
        ['h2', 'Ako spočítať, či sa oplatí'],
        ['ul', ['vezmite priemerný nákup a náklady na darček;', 'odhadnite, koľko ďalších návštev mesačne program prinesie;', 'ďalšie návštevy × priemerný nákup = dodatočné tržby.']],
        ['p', 'Ak vás darček stojí 1 € a hosť kvôli nemu prišiel 9-krát, program sa jednoznačne oplatí.'],
        ['h2', 'Prepadnutie bodov — áno, či nie?'],
        ['p', 'Obmedzená platnosť bodov (napríklad 6 mesiacov bez návštevy) jemne pripomína vrátiť sa včas. Dôležité je upozorniť vopred: týždeň pred prepadnutím poslať správu.'],
        ['tip', 'Loya vám pri prvom nastavení sama ponúkne 3 hotové varianty pre váš typ podniku a menu — vyberiete jedným ťuknutím a čísla neskôr ľahko upravíte.']
      ]
    },
    en: {
      title: 'Which loyalty program to choose: stamps, discount, points or tiers',
      desc: 'A comparison of four types of loyalty programs for small businesses, with examples for a coffee shop, barbershop, salon and store: what to pick and how to work out the return.',
      lead: 'There is no one-size-fits-all loyalty program. What works great in a coffee shop may not suit a clothing store. Here are the four main types and who each one fits.',
      blocks: [
        ['h2', 'Stamp card: “every Nth one free”'],
        ['p', 'The easiest mechanic to understand. Best when guests come often and buy roughly the same thing: coffee, pastries, a haircut, a car wash. Example: every 9th coffee free in a coffee shop, every 6th haircut half price in a barbershop.'],
        ['h2', 'A permanent discount'],
        ['p', 'Simple and fair: 5–10% off every purchase. Works well in shops and salons with varied checks. The downside — a discount quickly becomes “normal” and stops delighting.'],
        ['h2', 'Points on spend'],
        ['p', 'Guests earn points on every purchase, e.g. 1 point per €50. Points can go towards a gift or part of the next check. Best when checks are large and varied.'],
        ['h2', 'Tiers: Silver and Gold'],
        ['p', 'The more often a guest visits, the higher their tier and the nicer the perks: double points, a tier discount. Tiers add a game element and keep your most valuable guests. Combine them with any mechanic above.'],
        ['h2', 'How to tell if it pays off'],
        ['ul', ['take your average check and the cost of the reward;', 'estimate how many extra visits a month the program brings;', 'extra visits × average check = extra revenue.']],
        ['p', 'If the reward costs you €1 and the guest came 9 times to earn it, the program clearly pays off.'],
        ['h2', 'Points expiry — yes or no?'],
        ['p', 'A lifetime for points (say, 6 months without a visit) gently reminds guests to come back on time. Just warn them in advance — send a message a week before points expire.'],
        ['tip', 'During first setup Loya suggests 3 ready-made programs for your business type and currency — pick one with a tap and tweak the numbers later.']
      ]
    }
  },
  {
    slug: 'gift-cards', icon: '🎁', date: '2026-10-13',
    ru: {
      title: 'Подарочные сертификаты для малого бизнеса: как продавать и учитывать',
      desc: 'Как кафе, салону или магазину продавать подарочные сертификаты: номинал, срок, электронный сертификат в телефоне, списание частями и учёт остатка.',
      lead: 'Подарочный сертификат — это деньги сегодня и новый гость завтра: тот, кому подарили, часто приходит впервые. Рассказываем, как запустить сертификаты без бумажной путаницы.',
      blocks: [
        ['h2', 'Почему сертификаты выгодны'],
        ['ul', ['оплата приходит сразу, ещё до визита;', 'получатель сертификата часто впервые знакомится с вашим заведением;', 'перед праздниками это готовый подарок для ваших постоянных гостей.']],
        ['h2', 'Номинал и срок'],
        ['p', 'Предложите 2–3 понятных номинала: например, 20, 50 и 100 €. Срок действия — 6–12 месяцев: этого достаточно, чтобы спокойно воспользоваться, и не висит долгом годами. Срок должен быть написан на самом сертификате.'],
        ['h2', 'Бумажный или электронный?'],
        ['p', 'Красивый бумажный сертификат приятно вручить, но его легко потерять. Электронный приходит на почту, в Telegram или в Apple Wallet и Google Wallet — и всегда с собой. Лучший вариант — оба: электронный сертификат с QR, который можно и распечатать в открытке.'],
        ['h2', 'Списание частями'],
        ['p', 'Гость не обязан потратить всю сумму за раз. На кассе сканируют QR, вводят сумму покупки — остаток сохраняется на следующий визит. Так честнее для гостя и проще для персонала.'],
        ['h2', 'Учёт без таблиц'],
        ['ul', ['у каждого сертификата — свой код и остаток;', 'видно, сколько уже потрачено и до какого числа он действует;', 'оплаты сертификатом попадают в отчёт вместе с остальными покупками.']],
        ['tip', 'В Loya сертификат создаётся как обычная карта: номинал, срок — и он сразу уходит гостю на почту, в Telegram или в Wallet. На кассе — скан и списание суммы, остаток считается сам.']
      ]
    },
    uk: {
      title: 'Подарункові сертифікати для малого бізнесу: як продавати й обліковувати',
      desc: 'Як кав’ярні, салону чи магазину продавати подарункові сертифікати: номінал, термін, електронний сертифікат у телефоні, списання частинами й облік залишку.',
      lead: 'Подарунковий сертифікат — це гроші сьогодні й новий гість завтра: той, кому подарували, часто приходить уперше. Розповідаємо, як запустити сертифікати без паперової плутанини.',
      blocks: [
        ['h2', 'Чому сертифікати вигідні'],
        ['ul', ['оплата надходить одразу, ще до візиту;', 'отримувач сертифіката часто вперше знайомиться з вашим закладом;', 'перед святами це готовий подарунок для ваших постійних гостей.']],
        ['h2', 'Номінал і термін'],
        ['p', 'Запропонуйте 2–3 зрозумілі номінали: наприклад, 20, 50 і 100 €. Термін дії — 6–12 місяців: цього досить, щоб спокійно скористатися, і він не висить боргом роками. Термін має бути написаний на самому сертифікаті.'],
        ['h2', 'Паперовий чи електронний?'],
        ['p', 'Гарний паперовий сертифікат приємно вручити, але його легко загубити. Електронний приходить на пошту, у Telegram або в Apple Wallet і Google Wallet — і завжди з собою. Найкращий варіант — обидва: електронний сертифікат із QR, який можна й роздрукувати в листівці.'],
        ['h2', 'Списання частинами'],
        ['p', 'Гість не мусить витратити всю суму за раз. На касі сканують QR, вводять суму покупки — залишок зберігається на наступний візит. Так чесніше для гостя й простіше для персоналу.'],
        ['h2', 'Облік без таблиць'],
        ['ul', ['у кожного сертифіката — свій код і залишок;', 'видно, скільки вже витрачено й до якого числа він діє;', 'оплати сертифікатом потрапляють у звіт разом з іншими покупками.']],
        ['tip', 'У Loya сертифікат створюється як звичайна картка: номінал, термін — і він одразу надходить гостю на пошту, у Telegram або у Wallet. На касі — скан і списання суми, залишок рахується сам.']
      ]
    },
    sk: {
      title: 'Darčekové poukážky pre malý biznis: ako ich predávať a evidovať',
      desc: 'Ako môže kaviareň, salón či obchod predávať darčekové poukážky: hodnota, platnosť, elektronická poukážka v telefóne, čerpanie po častiach a evidencia zostatku.',
      lead: 'Darčeková poukážka sú peniaze dnes a nový hosť zajtra: obdarovaný často príde prvýkrát. Ukážeme, ako spustiť poukážky bez papierového chaosu.',
      blocks: [
        ['h2', 'Prečo sa poukážky oplatia'],
        ['ul', ['platba príde hneď, ešte pred návštevou;', 'obdarovaný často prvýkrát spozná vašu prevádzku;', 'pred sviatkami je to hotový darček pre vašich stálych hostí.']],
        ['h2', 'Hodnota a platnosť'],
        ['p', 'Ponúknite 2–3 jasné hodnoty, napríklad 20, 50 a 100 €. Platnosť 6–12 mesiacov stačí na pokojné využitie a poukážka nevisí ako dlh roky. Platnosť musí byť uvedená priamo na poukážke.'],
        ['h2', 'Papierová alebo elektronická?'],
        ['p', 'Peknú papierovú poukážku je príjemné odovzdať, ale ľahko sa stratí. Elektronická príde e-mailom, do Telegramu alebo do Apple Wallet a Google Wallet — a je stále pri ruke. Najlepšie je oboje: elektronická poukážka s QR kódom, ktorú možno aj vytlačiť do pohľadnice.'],
        ['h2', 'Čerpanie po častiach'],
        ['p', 'Hosť nemusí minúť celú sumu naraz. Pri pokladni naskenujete QR kód, zadáte sumu nákupu — zostatok zostane na ďalšiu návštevu. Je to férovejšie pre hosťa a jednoduchšie pre obsluhu.'],
        ['h2', 'Evidencia bez tabuliek'],
        ['ul', ['každá poukážka má svoj kód a zostatok;', 'vidno, koľko sa už minulo a dokedy platí;', 'platby poukážkou sú v prehľade spolu s ostatnými nákupmi.']],
        ['tip', 'V Loya vytvoríte poukážku ako bežnú kartu: hodnota, platnosť — a hneď odíde hosťovi e-mailom, do Telegramu alebo do Wallet. Pri pokladni stačí sken a odpočítanie sumy, zostatok sa počíta sám.']
      ]
    },
    en: {
      title: 'Gift cards for small businesses: how to sell and track them',
      desc: 'How a café, salon or shop can sell gift cards: amounts, expiry, a digital gift card in the phone, partial redemption and balance tracking.',
      lead: 'A gift card is money today and a new guest tomorrow: the person who receives it often visits for the first time. Here is how to launch gift cards without paper chaos.',
      blocks: [
        ['h2', 'Why gift cards pay off'],
        ['ul', ['you get paid right away, before the visit;', 'the recipient often discovers your venue for the first time;', 'before holidays it’s a ready-made gift for your regulars.']],
        ['h2', 'Amount and expiry'],
        ['p', 'Offer 2–3 clear amounts, e.g. €20, €50 and €100. A validity of 6–12 months is enough to use it comfortably without hanging around for years. Put the expiry date on the gift card itself.'],
        ['h2', 'Paper or digital?'],
        ['p', 'A nice paper gift card is lovely to hand over, but easy to lose. A digital one arrives by email, Telegram or in Apple Wallet and Google Wallet — and is always at hand. Best of both: a digital gift card with a QR code that can also be printed in a greeting card.'],
        ['h2', 'Spend it in parts'],
        ['p', 'Guests don’t have to spend it all at once. At the till you scan the QR code and enter the purchase amount — the rest stays for the next visit. Fairer for guests and simpler for staff.'],
        ['h2', 'Tracking without spreadsheets'],
        ['ul', ['each gift card has its own code and balance;', 'you see how much has been spent and until when it’s valid;', 'gift card payments show up in your report with all other purchases.']],
        ['tip', 'In Loya a gift card is created like any other card: amount, expiry — and it goes straight to the guest by email, Telegram or Wallet. At the till it’s a scan and an amount; the balance updates itself.']
      ]
    }
  }
];
