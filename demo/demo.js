// Демо Loya на сайте (loya-loyalty.com/demo/): программа работает прямо в браузере, как Android-версия.
// Этот файл подключается только в сборке `node build/build-www.js --demo`:
//  1) при первом запуске заполняет тестовую кофейню — клиенты, карты, визиты за 2,5 месяца, подарки;
//  2) показывает полоску «Демо» с кнопками «Начать заново» и «Скачать Loya»;
//  3) сеть выключена (shims/https.js): письма, Wallet и лицензия в демо не отправляются.
// Данные живут только в этом браузере (IndexedDB «loya-demo-fs»).
(function () {
  'use strict';
  globalThis.__LOYA_DEMO = true;
  const LANGS = ['ru', 'uk', 'sk', 'en'];
  const q = new URLSearchParams(location.search).get('lang');
  let saved = null; try { saved = localStorage.getItem('loya_lang'); } catch (e) { /* нет */ }
  const nav = (navigator.languages || [navigator.language || 'en']).map(l => String(l).slice(0, 2).toLowerCase()).map(l => (l === 'cs' ? 'sk' : l));
  const LANG = LANGS.includes(q) ? q : LANGS.includes(saved) ? saved : (nav.find(l => LANGS.includes(l)) || 'en');

  const TX = {
    ru: { brand: 'Кофейня «Лиса»', demo: 'Демо', note: 'Данные только в этом браузере', reset: 'Начать заново', get: 'Скачать Loya', resetAsk: 'Начать демо заново? Все изменения в демо удалятся.', offline: 'В демо письма, Wallet и облако не отправляются — скачайте Loya, чтобы всё работало по-настоящему.', hide: 'Свернуть', card: 'Штамп-карта', disc: 'Скидка постоянного гостя', gift: 'Бесплатный капучино', notes: ['Любит овсяный капучино', 'Приходит с собакой', 'Берёт с собой', 'Сладкоежка', ''] },
    uk: { brand: 'Кав’ярня «Лисиця»', demo: 'Демо', note: 'Дані лише в цьому браузері', reset: 'Почати знову', get: 'Завантажити Loya', resetAsk: 'Почати демо знову? Усі зміни в демо видаляться.', offline: 'У демо листи, Wallet і хмара не надсилаються — завантажте Loya, щоб усе працювало насправді.', hide: 'Згорнути', card: 'Штамп-картка', disc: 'Знижка постійного гостя', gift: 'Безкоштовне капучино', notes: ['Любить вівсяне капучино', 'Приходить із собакою', 'Бере з собою', 'Ласун', ''] },
    sk: { brand: 'Kaviareň Líška', demo: 'Demo', note: 'Údaje sú len v tomto prehliadači', reset: 'Začať odznova', get: 'Stiahnuť Loya', resetAsk: 'Začať demo odznova? Všetky zmeny v deme sa vymažú.', offline: 'V deme sa e-maily, Wallet ani cloud neodosielajú — stiahnite si Loya, aby všetko fungovalo naozaj.', hide: 'Skryť', card: 'Pečiatková karta', disc: 'Zľava stáleho hosťa', gift: 'Cappuccino zadarmo', notes: ['Má rád ovsené cappuccino', 'Chodí so psom', 'Berie so sebou', 'Mlsný jazýček', ''] },
    en: { brand: 'Fox Coffee', demo: 'Demo', note: 'Data stays in this browser', reset: 'Start over', get: 'Download Loya', resetAsk: 'Start the demo over? All changes in the demo will be deleted.', offline: 'In the demo, emails, Wallet and cloud are not sent — download Loya to make it all real.', hide: 'Hide', card: 'Stamp card', disc: 'Regulars discount', gift: 'Free cappuccino', notes: ['Likes oat cappuccino', 'Comes with a dog', 'Takeaway', 'Sweet tooth', ''] }
  };
  const T = TX[LANG];
  const NAMES = {
    ru: ['Анна Ковалёва', 'Михаил Орлов', 'Елена Смирнова', 'Дмитрий Волков', 'Ольга Новикова', 'Иван Петров', 'Мария Соколова', 'Алексей Морозов', 'Наталья Лебедева', 'Сергей Козлов', 'Татьяна Павлова', 'Андрей Фёдоров', 'Юлия Белова', 'Павел Егоров', 'Ксения Зайцева', 'Никита Борисов', 'Дарья Макарова', 'Артём Николаев', 'Полина Гусева', 'Виктор Кузнецов', 'Алина Титова', 'Роман Голубев', 'Вера Комарова', 'Максим Ильин', 'Светлана Попова', 'Глеб Сорокин', 'Ирина Карпова', 'Кирилл Жуков', 'Евгения Тихонова', 'Олег Беляев', 'Софья Романова', 'Игорь Степанов', 'Лилия Крылова', 'Тимур Абрамов', 'Нина Яковлева', 'Денис Филиппов'],
    uk: ['Анна Коваленко', 'Михайло Шевчук', 'Олена Бондаренко', 'Дмитро Ткаченко', 'Ольга Кравченко', 'Іван Мельник', 'Марія Олійник', 'Олексій Поліщук', 'Наталія Лисенко', 'Сергій Савченко', 'Тетяна Руденко', 'Андрій Марченко', 'Юлія Бойко', 'Павло Гончаренко', 'Ксенія Кузьменко', 'Микита Петренко', 'Дарина Іваненко', 'Артем Литвиненко', 'Поліна Клименко', 'Віктор Кравець', 'Аліна Мороз', 'Роман Павленко', 'Віра Левченко', 'Максим Захарченко', 'Світлана Тимошенко', 'Гліб Карпенко', 'Ірина Остапенко', 'Кирило Гуменюк', 'Євгенія Сидоренко', 'Олег Васильченко', 'Софія Романенко', 'Ігор Степаненко', 'Лілія Демченко', 'Тимур Нестеренко', 'Ніна Яковенко', 'Денис Пилипенко'],
    sk: ['Anna Kováčová', 'Michal Horváth', 'Eva Varga', 'Peter Tóth', 'Zuzana Nagyová', 'Ján Baláž', 'Mária Szabóová', 'Martin Molnár', 'Lucia Lukáčová', 'Tomáš Novák', 'Katarína Kollárová', 'Marek Németh', 'Jana Kováčiková', 'Pavol Oravec', 'Simona Polák', 'Lukáš Gajdoš', 'Veronika Hudáková', 'Jakub Krajčír', 'Barbora Kučerová', 'Viktor Benko', 'Alena Blahová', 'Róbert Šimko', 'Monika Švecová', 'Matej Vlček', 'Silvia Ďuricová', 'Filip Hruška', 'Ivana Mikulová', 'Samuel Baran', 'Petra Fialová', 'Juraj Kráľ', 'Sofia Čierna', 'Igor Marko', 'Lenka Bartošová', 'Dominik Kmeť', 'Nina Jurčová', 'Daniel Rusnák'],
    en: ['Anna Clarke', 'Michael Turner', 'Emily Walker', 'David Hughes', 'Olivia Wright', 'James Hall', 'Sophie Green', 'Thomas Baker', 'Grace Lewis', 'Daniel Young', 'Chloe King', 'Andrew Scott', 'Lucy Adams', 'Paul Mitchell', 'Ella Roberts', 'Nathan Carter', 'Hannah Phillips', 'Ryan Evans', 'Amelia Collins', 'Victor Stewart', 'Alice Morris', 'Robert Reed', 'Mia Cook', 'Max Bell', 'Zoe Murphy', 'George Ward', 'Isla Cooper', 'Jack Price', 'Ruby Gray', 'Oliver Wood', 'Freya Bennett', 'Henry Brooks', 'Lily Kelly', 'Leo Foster', 'Nina Ross', 'Sam Howard']
  }[LANG];

  // ---------- тестовая кофейня ----------
  globalThis.__LOYA_DEMO_SEED = async function (db) {
    const st = db.getSettings();
    if (st.onboarding_completed === '1') return;
    let seed = 20261024; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const now = Date.now(), DAY = 86400000;
    const ts = (ms) => new Date(ms).toISOString().replace('T', ' ').slice(0, 19);
    const S = db.db;
    const one = (sql, p) => { S.run(sql, p || []); const r = S.exec('SELECT last_insert_rowid()'); return r[0].values[0][0]; };
    const cols = (tb) => new Set((S.exec(`PRAGMA table_info(${tb})`)[0] || { values: [] }).values.map(v => v[1]));
    const cc = cols('clients'), kc = cols('cards'), hc = cols('scan_history');
    const ins = (tb, have, o) => { const k = Object.keys(o).filter(x => have.has(x)); return one(`INSERT INTO ${tb} (${k.join(',')}) VALUES (${k.map(() => '?').join(',')})`, k.map(x => o[x])); };
    S.run('BEGIN');
    try {
      const TARGET = 10;
      NAMES.forEach((name, i) => {
        const first = name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[^a-z]/g, '') || ['anna', 'mike', 'elena', 'dima', 'olga', 'ivan', 'maria', 'alex', 'nata', 'sergey', 'tanya', 'andrew'][i % 12];
        const joined = now - (5 + Math.floor(rnd() * 70)) * DAY - Math.floor(rnd() * 8) * 3600000;
        const bd = new Date(now + (i < 2 ? (i + 1) * DAY : Math.floor(rnd() * 330) * DAY));
        const loyal = i < 6, sleepy = i >= 30;
        const cid = ins('clients', cc, {
          name, email: rnd() > 0.25 ? `${first}.${i + 1}@example.com` : '', phone: rnd() > 0.3 ? `+421 9${String(10 + i).padStart(2, '0')} ${String(Math.floor(rnd() * 900) + 100)} ${String(Math.floor(rnd() * 900) + 100)}` : '',
          birthday: `${1975 + Math.floor(rnd() * 28)}-${String(bd.getMonth() + 1).padStart(2, '0')}-${String(bd.getDate()).padStart(2, '0')}`,
          notes: pick(T.notes), preferred_language: LANG, marketing_consent: rnd() > 0.2 ? 1 : 0, consent_email: 1, consent_telegram: 0, consent_source: 'demo', consent_at: ts(joined), do_not_contact: 0, created_at: ts(joined)
        });
        const discount = i % 9 === 4;
        const code = 'LC-DEMO' + String(1000 + i);
        const cardId = ins('cards', kc, { client_id: cid, type: discount ? 'discount' : 'stamp', title: discount ? T.disc : T.card, discount_percent: discount ? 10 : null, stamp_target: discount ? null : TARGET, stamp_count: 0, redeemed_count: 0, code, created_at: ts(joined), source: 'demo' });
        // визиты: постоянные — часто, «уснувшие» — давно не заходили
        const last = sleepy ? now - (35 + Math.floor(rnd() * 20)) * DAY : now - Math.floor(rnd() * (loyal ? 3 : 12)) * DAY;
        const n = loyal ? 14 + Math.floor(rnd() * 12) : sleepy ? 2 + Math.floor(rnd() * 4) : 3 + Math.floor(rnd() * 9);
        const times = [];
        for (let k = 0; k < n; k++) times.push(joined + rnd() * Math.max(DAY, last - joined));
        times.sort((a, b) => a - b);
        let count = 0, redeemed = 0;
        for (const tm of times) {
          const d = new Date(tm); d.setHours(8 + Math.floor(rnd() * 11), Math.floor(rnd() * 60)); const at = ts(Math.min(d.getTime(), now - 600000));
          if (discount) { ins('scan_history', hc, { card_id: cardId, client_id: cid, result: 'discount', amount_spent: Math.round((3 + rnd() * 12) * 100) / 100, created_at: at, source: 'scan' }); continue; }
          count += 1;
          if (count >= TARGET) { ins('scan_history', hc, { card_id: cardId, client_id: cid, result: 'reward', stamp_count_at: TARGET, created_at: at, source: 'scan' }); count = 0; redeemed += 1; }
          else ins('scan_history', hc, { card_id: cardId, client_id: cid, result: 'stamp', stamp_count_at: count, created_at: at, source: 'scan' });
        }
        // сегодня уже заходили несколько постоянных гостей — на Главной видно «сегодня»
        if (i < 5 && !discount) {
          count += 1; const at = ts(now - (20 + i * 37) * 60000);
          if (count >= TARGET) { ins('scan_history', hc, { card_id: cardId, client_id: cid, result: 'reward', stamp_count_at: TARGET, created_at: at, source: 'scan' }); count = 0; redeemed += 1; }
          else ins('scan_history', hc, { card_id: cardId, client_id: cid, result: 'stamp', stamp_count_at: count, created_at: at, source: 'scan' });
        }
        S.run('UPDATE cards SET stamp_count = ?, redeemed_count = ? WHERE id = ?', [count, redeemed, cardId]);
        S.run('UPDATE clients SET lifetime_purchases = ?, lifetime_rewards = ? WHERE id = ?', [n + (i < 5 && !discount ? 1 : 0), redeemed, cid]);
        if (i === 1 || i === 3) one('INSERT INTO client_gifts (client_id, gift_text, status, created_at) VALUES (?, ?, ?, ?)', [cid, T.gift, 'pending', ts(now - DAY)]);
      });
      S.run('COMMIT');
    } catch (e) { try { S.run('ROLLBACK'); } catch (e2) { /* уже */ } throw e; }
    db.saveSettings({
      onboarding_completed: '1', brand_name: T.brand, business_niche: 'coffee', app_language: LANG, last_seen_version: globalThis.__LOYA_VERSION || '',
      region_confirmed: '1', business_country: LANG === 'en' ? 'GB' : LANG === 'uk' ? 'UA' : 'SK', spend_currency: LANG === 'en' ? 'GBP' : LANG === 'uk' ? 'UAH' : 'EUR',
      feature_network: '0', feature_staff: '1', feature_weather: '0', feature_inventory: '0', feature_pos: '0', theme_name: 'glossy', home_start_state: 'hidden', theme_primary: '#e2b54a', demo_seeded: '1'
    });
    if (typeof db.save === 'function') db.save();
  };

  // ---------- полоска «Демо» ----------
  let lastNet = 0;
  globalThis.__loyaDemoNet = function () {
    if (Date.now() - lastNet < 8000) return; lastNet = Date.now();
    setTimeout(() => toast(T.offline), 400);
  };
  function toast(text) {
    const el = document.createElement('div'); el.className = 'demo-toast'; el.textContent = text; document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('on'));
    setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 400); }, 5200);
  }
  function resetDemo() {
    if (!confirm(T.resetAsk)) return;
    try { localStorage.clear(); sessionStorage.clear(); } catch (e) { /* нет */ }
    const r = indexedDB.deleteDatabase('loya-demo-fs');
    const go = () => location.replace(location.pathname + '?lang=' + LANG);
    r.onsuccess = go; r.onerror = go; r.onblocked = () => setTimeout(go, 400);
  }
  function bar() {
    const site = LANG === 'en' ? '/' : '/' + LANG + '/';
    const b = document.createElement('div'); b.className = 'demo-bar'; b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Loya demo');
    b.innerHTML = `<span class="demo-chip"><i></i>${T.demo}</span><span class="demo-note">${T.note}</span>
      <button type="button" class="demo-b" data-act="reset">↺ ${T.reset}</button>
      <a class="demo-b demo-b-gold" href="${site}#download">${T.get} →</a>
      <button type="button" class="demo-x" data-act="min" aria-label="${T.hide}" title="${T.hide}">–</button>`;
    b.querySelector('[data-act=reset]').addEventListener('click', resetDemo);
    b.querySelector('[data-act=min]').addEventListener('click', (e) => { e.stopPropagation(); b.classList.toggle('min'); try { sessionStorage.setItem('demo_min', b.classList.contains('min') ? '1' : '0'); } catch (err) { /* нет */ } });
    b.addEventListener('click', (e) => { if (b.classList.contains('min') && !e.target.closest('a,button')) { b.classList.remove('min'); try { sessionStorage.setItem('demo_min', '0'); } catch (err) { /* нет */ } } });
    try { if (sessionStorage.getItem('demo_min') === '1') b.classList.add('min'); } catch (e) { /* нет */ }
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bar); else bar();
})();
