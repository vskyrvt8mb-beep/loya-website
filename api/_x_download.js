// GET /download — ведёт на установщик .exe из последнего релиза программы.
// Ссылку узнаём на сервере (кэш 10 минут в функции и на CDN Vercel), чтобы не упираться
// в лимит GitHub API у посетителей. Если узнать не удалось — страница последнего релиза.
const REPO = 'vskyrvt8mb-beep/loya-website';
const FALLBACK = `https://github.com/${REPO}/releases/latest`;
let cache = { at: 0, url: null };

async function latestExe() {
  if (cache.url && Date.now() - cache.at < 600e3) return cache.url;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 4000);
  try {
    const headers = { 'User-Agent': 'loya-website', Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers, signal: ctl.signal });
    if (!r.ok) return null;
    const rel = await r.json();
    const asset = (rel.assets || []).find((a) => /\.exe$/i.test(a.name) && !/blockmap/i.test(a.name));
    if (!asset) return null;
    cache = { at: Date.now(), url: asset.browser_download_url };
    return cache.url;
  } catch (e) { return null; } finally { clearTimeout(timer); }
}

module.exports = async (req, res) => {
  const url = await latestExe();
  res.setHeader('Cache-Control', url ? 'public, s-maxage=600, stale-while-revalidate=3600' : 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.statusCode = 302;
  res.setHeader('Location', url || FALLBACK);
  res.end();
};
