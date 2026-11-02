import { demand } from './validation.mjs';
const COOKIE_KEYS = new Set([
  'stoken',
  'mid',
  'ltuid',
  'ltoken',
  'ltuid_v2',
  'ltmid_v2',
  'ltoken_v2',
  'account_id',
  'cookie_token',
  'account_id_v2',
  'account_mid_v2',
  'cookie_token_v2',
]);
export const WEB_COOKIE_KEYS = [
  'ltoken_v2',
  'ltuid_v2',
  'ltmid_v2',
  'cookie_token_v2',
  'account_id_v2',
  'account_mid_v2',
];
export const LAB_KEYS = [
  'ltoken',
  'ltuid',
  'ltoken_v2',
  'ltuid_v2',
  'ltmid_v2',
  'cookie_token_v2',
  'account_id_v2',
  'account_mid_v2',
  'cookie_token',
  'account_id',
];
export const ACCOUNT_KEYS = ['cookie_token_v2', 'account_id_v2', 'account_mid_v2'];
export function parseCookies(raw) {
  demand(typeof raw === 'string' && raw.length <= 20000, 'Cookie không hợp lệ.');
  let entries;
  try {
    entries = Object.entries(JSON.parse(raw));
  } catch {
    entries = raw
      .split(';')
      .filter((x) => x.includes('='))
      .map((x) => {
        const p = x.indexOf('=');
        return [x.slice(0, p).trim(), x.slice(p + 1).trim()];
      });
  }
  const cookies = {};
  for (const [k, v] of entries)
    if (COOKIE_KEYS.has(k)) {
      demand(
        typeof v === 'string' && /^[\x21-\x7e]+$/.test(v) && !/[;\r\n]/.test(v),
        'Giá trị cookie không hợp lệ.',
      );
      cookies[k] = v;
    }
  demand(Object.keys(cookies).length > 0, 'Không thấy cookie xác thực được hỗ trợ.');
  return cookies;
}
export function cookieHeader(cookies, keys) {
  return Object.entries(cookies)
    .filter(([k]) => keys.includes(k))
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}
export function readWebCookies(headers) {
  const cookies = {};
  for (const raw of headers.getSetCookie()) {
    const [pair, ...attributes] = raw.split(';'),
      p = pair.indexOf('=');
    if (p <= 0) continue;
    const key = pair.slice(0, p).trim(),
      value = pair.slice(p + 1).trim();
    if (!WEB_COOKIE_KEYS.includes(key)) continue;
    const age = attributes.map((x) => x.trim()).find((x) => /^max-age=/i.test(x)),
      expires = attributes.map((x) => x.trim()).find((x) => /^expires=/i.test(x));
    const expired = age
      ? Number(age.slice(age.indexOf('=') + 1)) <= 0
      : expires && Date.parse(expires.slice(expires.indexOf('=') + 1)) <= Date.now();
    if (!value || expired) {
      delete cookies[key];
      continue;
    }
    demand(/^[\x21-\x7e]+$/.test(value) && !/[;\r\n]/.test(value), 'Cookie web không hợp lệ.');
    cookies[key] = value;
  }
  return cookies;
}
