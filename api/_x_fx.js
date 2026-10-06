// GET /api/fx — курсы валют для калькулятора на сайте (база EUR). Берём с open.er-api.com на сервере,
// чтобы браузер посетителя не обращался к сторонним сайтам. Кэш: 6 часов в функции и на CDN Vercel.
const CURRENCIES = ['USD', 'GBP', 'CZK', 'PLN', 'UAH'];
let cache = { at: 0, data: null };

async function load() {
  if (cache.data && Date.now() - cache.at < 6 * 3600e3) return cache.data;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 4000);
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/EUR', { signal: ctl.signal });
    const d = await r.json();
    if (!d || d.result !== 'success' || !d.rates) return cache.data;
    const rates = { EUR: 1 };
    for (const c of CURRENCIES) if (Number(d.rates[c]) > 0) rates[c] = Number(d.rates[c]);
    cache = { at: Date.now(), data: { base: 'EUR', time: Number(d.time_last_update_unix) || null, rates } };
    return cache.data;
  } catch (e) { return cache.data; } finally { clearTimeout(timer); }
}

module.exports = async (req, res) => {
  const data = await load();
  if (!data) { res.setHeader('Cache-Control', 'no-store'); res.status(503).json({ error: 'unavailable' }); return; }
  res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
  res.status(200).json(data);
};
