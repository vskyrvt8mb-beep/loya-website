// GET /download — ведёт на установщик .exe из последнего релиза программы.
// GET /download-android (/download?os=android) — на файл .apk для планшета/телефона из того же релиза.
// Ссылку узнаём на сервере (кэш 10 минут в функции и на CDN Vercel), чтобы не упираться
// в лимит GitHub API у посетителей. Если узнать не удалось — страница последнего релиза.
const REPO = 'vskyrvt8mb-beep/loya-website';
const FALLBACK = `https://github.com/${REPO}/releases`;
const cache = { exe: { at: 0, url: null }, apk: { at: 0, url: null } };

async function latestAsset(kind) {
  const c = cache[kind];
  if (c.url && Date.now() - c.at < 600e3) return c.url;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 4000);
  try {
    const headers = { 'User-Agent': 'loya-website', Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    // Файлы для Windows и Android могут лежать в разных релизах (например, свежий релиз — только .apk),
    // поэтому смотрим несколько последних опубликованных релизов и берём самый новый с нужным файлом.
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=20`, { headers, signal: ctl.signal });
    if (!r.ok) return null;
    const list = await r.json();
    const re = kind === 'apk' ? /\.apk$/i : /\.exe$/i;
    let asset = null;
    for (const rel of Array.isArray(list) ? list : []) {
      if (rel.draft || rel.prerelease) continue;
      asset = (rel.assets || []).find((a) => re.test(a.name) && !/blockmap/i.test(a.name));
      if (asset) break;
    }
    if (!asset) return null;
    cache[kind] = { at: Date.now(), url: asset.browser_download_url };
    return asset.browser_download_url;
  } catch (e) { return null; } finally { clearTimeout(timer); }
}

module.exports = async (req, res) => {
  const os = String((req.query && req.query.os) || '').toLowerCase();
  const url = await latestAsset(os === 'android' ? 'apk' : 'exe');
  res.setHeader('Cache-Control', url ? 'public, s-maxage=600, stale-while-revalidate=3600' : 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.statusCode = 302;
  res.setHeader('Location', url || FALLBACK);
  res.end();
};
