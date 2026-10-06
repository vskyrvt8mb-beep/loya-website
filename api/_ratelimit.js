// Общий лимит запросов для всех экземпляров серверных функций: счётчики хранятся в Supabase
// (таблица rate_limits и функция rate_hit из schema.sql). Если таблицы ещё нет или база недоступна —
// запасной счётчик в памяти функции, чтобы защита не пропадала совсем.
// Ключи хешируются: email и IP в базе в открытом виде не лежат.
const crypto = require('crypto');

const mem = new Map();
function memLimited(key, max, ms) {
  const now = Date.now();
  const arr = (mem.get(key) || []).filter((t) => now - t < ms);
  if (arr.length >= max) { mem.set(key, arr); return true; }
  arr.push(now); mem.set(key, arr);
  if (mem.size > 5000) for (const [k, v] of mem) if (!v.length || now - v[v.length - 1] > ms) mem.delete(k);
  return false;
}

let supabase = null;
function db() {
  if (supabase) return supabase;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return null;
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

// true — лимит превышен (запрос нужно отклонить). max запросов за ms миллисекунд.
async function limited(key, max, ms) {
  const hashed = crypto.createHash('sha256').update('loya-rl:' + key).digest('hex').slice(0, 40);
  const client = db();
  if (client) {
    try {
      const { data, error } = await client.rpc('rate_hit', { p_key: hashed, p_max: max, p_window_seconds: Math.ceil(ms / 1000) });
      if (!error && typeof data === 'boolean') return !data;
    } catch (e) { /* падаем на счётчик в памяти */ }
  }
  return memLimited(hashed, max, ms);
}

function clientIp(req) {
  return String(((req && req.headers && req.headers['x-forwarded-for']) || '').split(',')[0] || '').trim() || 'unknown';
}

module.exports = { limited, clientIp };
