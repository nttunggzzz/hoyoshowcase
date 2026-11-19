// Public image cache only. No account cookies, arbitrary hosts, redirects or API URLs.
export function gameImageUrl(encoded) {
  let url;
  try {
    url = new URL(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    throw Error('Ảnh không hợp lệ.');
  }
  const allowed =
    (url.hostname === 'act-webstatic.hoyoverse.com' &&
      /^\/(?:hk4e|hkrpg|game_record\/(?:genshin|hkrpg))\//.test(url.pathname)) ||
    (url.hostname === 'fastcdn.hoyoverse.com' && /^\/static-resource-v2\//.test(url.pathname));
  if (
    url.protocol !== 'https:' ||
    !allowed ||
    url.port ||
    url.username ||
    url.password ||
    !/\.(png|jpg|jpeg|webp)$/i.test(url.pathname) ||
    [...url.searchParams.keys()].some((k) => k !== 'x-resource-process')
  )
    throw Error('Chỉ tải ảnh game công khai đã hỗ trợ.');
  return url.href;
}
export function createGameMedia(fetcher = fetch) {
  const cache = new Map(),
    pending = new Map();
  let bytes = 0;
  const budget = 64 * 1024 * 1024;
  return async (encoded) => {
    const url = gameImageUrl(encoded);
    if (cache.has(url)) return cache.get(url);
    if (pending.has(url)) return pending.get(url);
    const promise = (async () => {
      const r = await fetcher(url, {
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
        headers: { Accept: 'image/png,image/webp,image/jpeg' },
      });
      const type = r.headers.get('content-type')?.split(';')[0];
      if (!r.ok || !['image/png', 'image/webp', 'image/jpeg'].includes(type))
        throw Error('Không đọc được ảnh game.');
      if (Number(r.headers.get('content-length')) > 8 * 1024 * 1024) throw Error('Ảnh quá lớn.');
      const chunks = [];
      let size = 0;
      for await (const chunk of r.body) {
        size += chunk.length;
        if (size > 8 * 1024 * 1024) throw Error('Ảnh quá lớn.');
        chunks.push(chunk);
      }
      const data = Buffer.concat(chunks),
        value = { data, type };
      while (bytes + data.length > budget && cache.size) {
        const key = cache.keys().next().value;
        bytes -= cache.get(key).data.length;
        cache.delete(key);
      }
      cache.set(url, value);
      bytes += data.length;
      return value;
    })();
    pending.set(url, promise);
    try {
      return await promise;
    } finally {
      pending.delete(url);
    }
  };
}
