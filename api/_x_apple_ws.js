// Веб-сервис Apple Wallet (протокол PassKit Web Service). Адреса вызывает сам iPhone:
//   POST   v1/devices/{device}/registrations/{passTypeId}/{serial}   — карта добавлена (приходит pushToken)
//   DELETE v1/devices/{device}/registrations/{passTypeId}/{serial}   — карта удалена
//   GET    v1/devices/{device}/registrations/{passTypeId}?passesUpdatedSince=… — какие карты изменились
//   GET    v1/passes/{passTypeId}/{serial}                           — свежая версия карты
//   POST   v1/log                                                    — журнал ошибок Wallet
const A = require('./_apple');
const { licenseActive, supabase } = require('./_license');

function wsPath(req) {
  const q = req.query && (req.query.p || req.query.path);
  if (q) return Array.isArray(q) ? q.join('/') : String(q);
  const u = String(req.url || '');
  const i = u.indexOf('/apple-ws/');
  return i >= 0 ? u.slice(i + 10).split('?')[0] : '';
}
const okId = (s) => /^[A-Za-z0-9._-]{1,128}$/.test(String(s || ''));
function authOk(req, serial) {
  const h = String((req.headers && (req.headers.authorization || req.headers.Authorization)) || '');
  return h.startsWith('ApplePass ') && A.safeEq(h.slice(10).trim(), A.authTokenFor(serial));
}

module.exports = async (req, res) => {
  try {
    if (!A.configured()) { res.status(503).end(); return; }
    const cfg = A.config();
    const parts = wsPath(req).split('/').filter(Boolean).map(decodeURIComponent);
    const method = req.method;

    if (parts[0] === 'v1' && parts[1] === 'log' && method === 'POST') { res.status(200).end(); return; }

    // регистрация / удаление
    if (parts[0] === 'v1' && parts[1] === 'devices' && parts[3] === 'registrations' && parts.length === 6) {
      const [, , device, , ptid, serial] = parts;
      if (ptid !== cfg.passTypeId || !okId(device) || !A.validSerial(serial)) { res.status(404).end(); return; }
      if (!authOk(req, serial)) { res.status(401).end(); return; }
      if (method === 'POST') {
        const pushToken = String((req.body && req.body.pushToken) || '');
        if (!/^[A-Fa-f0-9]{16,200}$/.test(pushToken)) { res.status(400).end(); return; }
        const { data: exists } = await supabase.from('apple_registrations').select('device_id').eq('device_id', device).eq('serial', serial).maybeSingle();
        if (exists) { await supabase.from('apple_registrations').update({ push_token: pushToken }).eq('device_id', device).eq('serial', serial); res.status(200).end(); return; }
        await supabase.from('apple_registrations').insert({ device_id: device, serial, push_token: pushToken });
        res.status(201).end(); return;
      }
      if (method === 'DELETE') { await supabase.from('apple_registrations').delete().eq('device_id', device).eq('serial', serial); res.status(200).end(); return; }
      res.status(405).end(); return;
    }

    // какие карты на этом устройстве изменились
    if (parts[0] === 'v1' && parts[1] === 'devices' && parts[3] === 'registrations' && parts.length === 5 && method === 'GET') {
      const [, , device, , ptid] = parts;
      if (ptid !== cfg.passTypeId || !okId(device)) { res.status(404).end(); return; }
      const { data: regs } = await supabase.from('apple_registrations').select('serial').eq('device_id', device);
      const serials = (regs || []).map(r => r.serial);
      if (!serials.length) { res.status(204).end(); return; }
      const since = Number((req.query && req.query.passesUpdatedSince) || 0) || 0;
      const { data: rows } = await supabase.from('apple_passes').select('serial, updated_at').in('serial', serials);
      const changed = (rows || []).filter(r => new Date(r.updated_at).getTime() > since);
      if (!changed.length) { res.status(204).end(); return; }
      const last = Math.max(...(rows || []).map(r => new Date(r.updated_at).getTime()));
      res.status(200).json({ serialNumbers: changed.map(r => r.serial), lastUpdated: String(last) }); return;
    }

    // свежая версия карты
    if (parts[0] === 'v1' && parts[1] === 'passes' && parts.length === 4 && method === 'GET') {
      const [, , ptid, serial] = parts;
      if (ptid !== cfg.passTypeId || !A.validSerial(serial)) { res.status(404).end(); return; }
      if (!authOk(req, serial)) { res.status(401).end(); return; }
      const { data: row } = await supabase.from('apple_passes').select('*').eq('serial', serial).maybeSingle();
      if (!row) { res.status(404).end(); return; }
      const updated = new Date(row.updated_at || Date.now());
      const ims = req.headers && req.headers['if-modified-since'];
      if (ims && Math.floor(updated.getTime() / 1000) <= Math.floor(new Date(ims).getTime() / 1000)) { res.status(304).end(); return; }
      if (!(await licenseActive(row.license_key))) { res.status(304).end(); return; }   // подписка неактивна — карту не обновляем
      const buf = A.buildPkpass(cfg, serial, row.card || {}, row.brand || {});
      res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
      res.setHeader('Last-Modified', updated.toUTCString());
      res.status(200).send(buf); return;
    }
    res.status(404).end();
  } catch (err) { res.status(500).end(); }
};
