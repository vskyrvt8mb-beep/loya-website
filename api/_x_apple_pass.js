// GET /api/apple-pass?s=<serial>&t=<подпись> — скачать карту (.pkpass). Ссылку выдаёт /api/apple-link.
const A = require('./_apple');
const { licenseActive, supabase } = require('./_license');

const MSG = {
  ru: { nf: 'Карта не найдена. Попросите заведение прислать ссылку ещё раз.', off: 'Apple Wallet пока не подключён.', inactive: 'Карта временно недоступна.', err: 'Не получилось открыть карту. Попробуйте позже.' },
  uk: { nf: 'Картку не знайдено. Попросіть заклад надіслати посилання ще раз.', off: 'Apple Wallet поки не підключено.', inactive: 'Картка тимчасово недоступна.', err: 'Не вдалося відкрити картку. Спробуйте пізніше.' },
  sk: { nf: 'Karta sa nenašla. Požiadajte prevádzku o nový odkaz.', off: 'Apple Wallet zatiaľ nie je pripojený.', inactive: 'Karta je dočasne nedostupná.', err: 'Kartu sa nepodarilo otvoriť. Skúste to neskôr.' },
  en: { nf: 'Card not found. Ask the business to send the link again.', off: 'Apple Wallet isn’t connected yet.', inactive: 'This card is temporarily unavailable.', err: 'Couldn’t open the card. Please try again later.' }
};
function msg(req, k) {
  const h = String((req.headers && req.headers['accept-language']) || '').toLowerCase();
  let l = 'en'; for (const p of h.split(',')) { const x = p.trim().slice(0, 2); if (MSG[x]) { l = x; break; } if (x === 'cs') { l = 'sk'; break; } }
  return MSG[l][k];
}
const text = (res, code, t) => { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.status(code).send(t); };

module.exports = async (req, res) => {
  try {
    const serial = String((req.query && req.query.s) || ''), t = String((req.query && req.query.t) || '');
    if (!A.validSerial(serial) || !A.safeEq(t, A.downloadTokenFor(serial))) { text(res, 404, msg(req, 'nf')); return; }
    if (!A.configured()) { text(res, 503, msg(req, 'off')); return; }
    const { data: row } = await supabase.from('apple_passes').select('*').eq('serial', serial).maybeSingle();
    if (!row) { text(res, 404, msg(req, 'nf')); return; }
    if (!(await licenseActive(row.license_key))) { text(res, 403, msg(req, 'inactive')); return; }
    const buf = A.buildPkpass(A.config(), serial, row.card || {}, row.brand || {}, { design: await A.designFor(row.license_key) });
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', 'attachment; filename="loyalty-card.pkpass"');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(buf);
  } catch (err) { text(res, 500, msg(req, 'err')); }
};
