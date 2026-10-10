// Подписанный «талон» подписки для программы Loya (с версии 2.14).
// Сервер подписывает закрытым ключом Ed25519 из переменной окружения LICENSE_SIGNING_KEY (только в Vercel).
// В программе лежит открытый ключ: она проверяет подпись, но выписать талон сама не может. Поэтому правка
// базы на компьютере клиента или поддельный «сервер» не включают платные функции.
// В талоне: отпечаток ключа подписки, отпечаток компьютера, тариф и срок действия.
const crypto = require('crypto');

let cached;
function signingKey() {
  if (cached !== undefined) return cached;
  const raw = String(process.env.LICENSE_SIGNING_KEY || '').trim();
  cached = null;
  if (!raw) return null;
  try {
    const pem = raw.includes('BEGIN') ? raw.replace(/\\n/g, '\n') : `-----BEGIN PRIVATE KEY-----\n${raw.replace(/\s+/g, '')}\n-----END PRIVATE KEY-----\n`;
    const k = crypto.createPrivateKey(pem);
    if (k.asymmetricKeyType === 'ed25519') cached = k;
  } catch (e) { cached = null; }
  return cached;
}
const keyFingerprint = (key) => crypto.createHash('sha256').update('loya-key:' + String(key || '').trim()).digest('hex').slice(0, 32);
const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const DAY = 86400e3;
const PAID_DAYS = 30;     // столько программа работает без интернета с платной подпиской
const TRIAL_DAYS = 3;     // пробный период — выходить в сеть хотя бы раз в 3 дня

// row — строка licenses, tier — уже вычисленный тариф. Возвращает строку талона или null (ключа подписи нет).
function issue({ licenseKey, device, row, tier }) {
  const k = signingKey();
  if (!k || !/^[0-9a-f]{64}$/.test(String(device || ''))) return null;
  const now = Date.now();
  let exp = now + PAID_DAYS * DAY;
  const plan = row && row.plan === 'trial' ? 'trial' : 'paid';
  let tu;
  if (plan === 'trial') {
    tu = new Date(row.trial_until).toISOString();
    exp = Math.min(Date.parse(tu), now + TRIAL_DAYS * DAY);
  } else if (row && row.plan === 'free' && row.free_until) {
    exp = Math.min(exp, Date.parse(String(row.free_until).slice(0, 10) + 'T23:59:59Z'));
  }
  const payload = { v: 1, k: keyFingerprint(licenseKey), d: device, t: tier === 'pro' ? 'pro' : 'starter', p: plan, ...(tu ? { tu } : {}),
    iat: new Date(now).toISOString(), exp: new Date(exp).toISOString() };
  const body = b64u(JSON.stringify(payload));
  return body + '.' + b64u(crypto.sign(null, Buffer.from(body, 'utf8'), k));
}

module.exports = { issue, keyFingerprint, configured: () => !!signingKey() };
