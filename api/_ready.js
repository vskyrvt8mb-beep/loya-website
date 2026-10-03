// «Готовность к запуску» — панель в админке. Подробности (режим Stripe, почта, адрес сайта) видит только
// администратор: публичный /api/health их не отдаёт.
const H = require('./_x_health');
const { supabase } = require('./_license');

async function readiness() {
  const items = [];
  const add = (id, level, v) => items.push({ id, level, v: v === undefined ? null : v });
  const out = await H.collect({});
  await H.stripeInfo(out);
  const mode = out.stripeMode;
  add('stripeMode', mode === 'live' ? 'ok' : mode === 'test' ? 'warn' : 'bad', mode);
  if (mode === 'live' || mode === 'test') {
    const p = out.stripePrice;
    if (!out.stripePriceSet) add('price', 'bad', { s: 'missing' });
    else if (!p || !p.ok) add('price', 'bad', { s: 'notfound' });
    else if (p.livemode !== (mode === 'live')) add('price', 'bad', { s: 'mismatch' });
    else if (!p.active) add('price', 'bad', { s: 'inactive' });
    else if (!p.recurring) add('price', 'bad', { s: 'notRecurring' });
    else add('price', 'ok', { s: 'ok', amount: p.amount, currency: p.currency, interval: p.interval });
    add('webhook', out.stripeWebhook ? 'ok' : 'bad');
  }
  add('portal', out.stripePortal ? 'ok' : 'warn');
  const pu = process.env.PUBLIC_URL || '';
  add('publicUrl', pu === 'https://loya-loyalty.com' ? 'ok' : 'warn', pu);
  const mailOn = !!(process.env.MAIL_USER && process.env.MAIL_PASS);
  const host = process.env.MAIL_HOST || 'smtp.gmail.com';
  if (!mailOn) add('mail', 'bad', 'off');
  else if (/gmail\.com$/i.test(host)) add('mail', 'warn', 'gmail');
  else if (!process.env.MAIL_FROM) add('mail', 'warn', 'nofrom');
  else add('mail', 'ok', 'ok');
  add('wallet', out.wallet && out.walletKeyValid ? 'info' : 'bad', out.wallet && out.walletKeyValid ? 'mode' : 'off');
  add('apple', out.apple ? 'ok' : 'info');
  add('db', out.db && !out.tablesMissing.length ? 'ok' : 'bad', out.db ? out.tablesMissing.join(', ') : 'no db');
  let testKeys = 0;
  try { const { data } = await supabase.from('licenses').select('livemode').eq('livemode', false).limit(500); testKeys = (data || []).length; } catch (e) { /* колонки ещё нет */ }
  if (testKeys > 0) add('testKeys', mode === 'live' ? 'warn' : 'info', testKeys);
  const bad = items.filter(i => i.level === 'bad').length, warn = items.filter(i => i.level === 'warn').length;
  return { items, bad, warn, version: out.siteVersion };
}
module.exports = { readiness };
