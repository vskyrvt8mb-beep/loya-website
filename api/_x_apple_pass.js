// GET /api/apple-pass?s=<serial>&t=<подпись> — скачать карту (.pkpass). Ссылку выдаёт /api/apple-link.
const A = require('./_apple');
const { licenseActive, supabase } = require('./_license');

module.exports = async (req, res) => {
  try {
    const serial = String((req.query && req.query.s) || ''), t = String((req.query && req.query.t) || '');
    if (!A.validSerial(serial) || !A.safeEq(t, A.downloadTokenFor(serial))) { res.status(404).send('Not found'); return; }
    if (!A.configured()) { res.status(503).send('Apple Wallet is not configured'); return; }
    const { data: row } = await supabase.from('apple_passes').select('*').eq('serial', serial).maybeSingle();
    if (!row) { res.status(404).send('Not found'); return; }
    if (!(await licenseActive(row.license_key))) { res.status(403).send('Subscription inactive'); return; }
    const buf = A.buildPkpass(A.config(), serial, row.card || {}, row.brand || {});
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', 'attachment; filename="loyalty-card.pkpass"');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(buf);
  } catch (err) { res.status(500).send('Error'); }
};
