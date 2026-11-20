const loaded = new Map();
export function gameImageSource(url) {
  if (typeof url !== 'string') return '';
  if (/^\/assets\/(native|backgrounds)\/[A-Za-z0-9_.-]+\.(png|jpg|jpeg)$/.test(url)) return url;
  if (url.startsWith('data:image/')) return url;
  try {
    const u = new URL(url);
    const isAllowedHost =
      ['act-webstatic.hoyoverse.com', 'fastcdn.hoyoverse.com'].includes(u.hostname) ||
      (u.hostname === 'cdn.jsdelivr.net' &&
        /^\/gh\/Mar-7th\/StarRailRes(@[^/]+)?\/icon\//.test(u.pathname)) ||
      (u.hostname === 'raw.githubusercontent.com' &&
        /^\/Mar-7th\/StarRailRes\/[^/]+\/icon\//.test(u.pathname));
    return u.protocol === 'https:' && isAllowedHost
      ? '/media/' + btoa(u.href).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
      : '';
  } catch {
    return '';
  }
}
export function loadGameImage(url) {
  const key = gameImageSource(url);
  if (!key) return Promise.resolve(null);
  if (loaded.has(key)) return loaded.get(key);
  const p = new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => {
      loaded.delete(key);
      resolve(null);
    };
    im.src = key;
  });
  loaded.set(key, p);
  return p;
}
