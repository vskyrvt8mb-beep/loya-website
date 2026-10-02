// Словарь интерфейса → код для <script>. JSON не умеет передавать функции (например «Ещё {n} дней»),
// поэтому функции переносим как исходный текст. Строки экранируем для безопасной вставки в <script>.
function dictJs(TX) {
  const val = (v) => typeof v === 'function' ? v.toString()
    : Array.isArray(v) ? '[' + v.map(val).join(',') + ']'
    : JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return '{' + Object.keys(TX).map(l => `${JSON.stringify(l)}:{` + Object.entries(TX[l]).map(([k, v]) => `${JSON.stringify(k)}:${val(v)}`).join(',') + '}').join(',') + '}';
}
module.exports = { dictJs };
