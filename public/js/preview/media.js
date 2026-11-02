const loaded = new Map();
export function gameImageSource(url) {
  if (typeof url !== 'string') return '';
  if (/^\/assets\/native\/[A-Za-z0-9_.-]+\.png$/.test(url)) return url;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' &&
      ['act-webstatic.hoyoverse.com', 'fastcdn.hoyoverse.com'].includes(u.hostname)
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
