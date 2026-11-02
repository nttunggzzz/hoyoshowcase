import { demand, uidServer } from './validation.mjs';
import { WEB_COOKIE_KEYS, LAB_KEYS, ACCOUNT_KEYS, parseCookies, cookieHeader } from './cookies.mjs';
import { ApiError, Transport } from './transport.mjs';
export { URLS } from './endpoints.mjs';
export { demand, uidServer } from './validation.mjs';
export { parseCookies, readWebCookies } from './cookies.mjs';
export { ApiError, Transport, retrySeconds } from './transport.mjs';

import {
  randomBytes,
  randomInt,
  randomUUID,
  createHash,
  publicEncrypt,
  constants,
} from 'node:crypto';

// Protocol adaptation: genshin.py MIT, a11758e4911d4d2e906290b4db013c27d023428c.
// SDK headers/RSA: user-provided handoff; no runtime/vault from the old app is used.
const RSA_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4PMS2JVMwBsOIrYWRluY
wEiFZL7Aphtm9z5Eu/anzJ09nB00uhW+ScrDWFECPwpQto/GlOJYCUwVM/raQpAj
/xvcjK5tNVzzK94mhk+j9RiQ+aWHaTXmOgurhxSp3YbwlRDvOgcq5yPiTz0+kSeK
ZJcGeJ95bvJ+hJ/UMP0Zx2qB5PElZmiKvfiNqVUk8A8oxLJdBB5eCpqWV6CUqDKQ
KSQP4sM0mZvQ1Sr4UcACVcYgYnCbTZMWhJTWkrNXqI8TMomekgny3y+d6NX/cFa6
6jozFIF4HCX5aW8bp8C8vq2tFvFbleQ/Q3CU56EWWKMrOcpmFtRmC18s9biZBVR/
8QIDAQAB
-----END PUBLIC KEY-----`;
export const BANNERS = Object.freeze(['100', '200', '301', '302', '400', '500']);
const pick = (o, keys) =>
  Object.fromEntries(keys.filter((k) => o?.[k] !== undefined).map((k) => [k, o[k]]));
function ds(salt) {
  const t = Math.floor(Date.now() / 1000),
    alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    r = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
  return `${t},${r},${createHash('md5').update(`salt=${salt}&t=${t}&r=${r}`).digest('hex')}`;
}
function appLoginDs(body) {
  const t = Math.floor(Date.now() / 1000),
    chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    r = Array.from({ length: 6 }, () => chars[randomInt(chars.length)]).join('');
  return `${t},${r},${createHash('md5')
    .update(`salt=IZPgfb0dRPtBeLuFkdDznSZ6f4wWt6y2&t=${t}&r=${r}&b=${JSON.stringify(body)}&q=`)
    .digest('hex')}`;
}
export function labHeaders(cookies) {
  return {
    Cookie: cookieHeader(cookies, LAB_KEYS),
    'x-rpc-app_version': '1.5.0',
    'x-rpc-client_type': '5',
    'x-rpc-language': 'en-us',
    'x-rpc-lang': 'en-us',
    ds: ds('6s25p5ox5y14umn1p61aqyyvbvvl3lrt'),
  };
}
function sdkHeaders(device, verifier = false) {
  return {
    'x-rpc-device_id': device,
    'x-rpc-language': 'en-us',
    'x-rpc-client_type': verifier ? '5' : '3',
    ...(verifier
      ? {
          'x-rpc-app_version': '3.1.0',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) miHoYoBBSOversea/3.1.0',
        }
      : { 'x-rpc-app_id': 'c77bxgx7ljb4', 'User-Agent': 'HYPContainer/1.1.4.133' }),
  };
}
function flowHeaders(f, verifier = false) {
  if (f.profile === 'hoyolab_web' && !verifier)
    return {
      'x-rpc-app_id': 'c9oqaq3s3gu8',
      'x-rpc-client_type': '4',
      'x-rpc-device_id': f.device,
      Origin: 'https://account.hoyolab.com',
      Referer: 'https://account.hoyolab.com/',
      'x-rpc-language': 'en-us',
    };
  if (f.profile !== 'hoyolab' && f.profile !== 'hoyolab_web') return sdkHeaders(f.device, verifier);
  return {
    'x-rpc-app_id': 'c9oqaq3s3gu8',
    'x-rpc-client_type': '2',
    'x-rpc-device_id': f.device,
    'x-rpc-language': 'en-us',
    ...(!verifier
      ? {
          'x-rpc-aigis_v4': 'true',
          'x-rpc-app_version': '4.8.0',
          'x-rpc-sdk_version': '2.2.0',
          ds: appLoginDs(f.body),
        }
      : {}),
  };
}
function parseJSON(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
export function newContext(transport = new Transport()) {
  return {
    transport,
    cookies: {},
    source: null,
    flow: null,
    sdk: null,
    roles: [],
    selected: null,
    authkey: null,
    archive: null,
    collection: null,
  };
}
export function resetCredentials(c) {
  c.collection?.controller?.abort();
  Object.assign(c, {
    cookies: {},
    source: null,
    flow: null,
    sdk: null,
    roles: [],
    selected: null,
    authkey: null,
    archive: null,
    collection: null,
  });
  c.transport.source = 'none';
}
export async function startLogin(c, account, password, profile = 'sdk', deviceId = null) {
  demand(
    typeof account === 'string' &&
      account.length > 0 &&
      account.length <= 240 &&
      typeof password === 'string' &&
      password.length > 0 &&
      Buffer.byteLength(password) <= 245,
    'Tài khoản/mật khẩu không hợp lệ.',
  );
  demand(['sdk', 'hoyolab', 'hoyolab_web'].includes(profile), 'Nguồn đăng nhập không được hỗ trợ.');
  if (profile === 'hoyolab_web' && deviceId !== null)
    demand(
      typeof deviceId === 'string' &&
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(deviceId),
      'Device ID web không hợp lệ.',
    );
  const encrypt = (s) =>
    publicEncrypt(
      { key: RSA_KEY, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(s, 'utf8'),
    ).toString('base64');
  const device =
    profile === 'hoyolab_web'
      ? deviceId || randomUUID()
      : profile === 'sdk'
        ? randomBytes(27).toString('hex').slice(0, 53)
        : Array.from(
            { length: 16 },
            () => 'abcdefghijklmnopqrstuvwxyz0123456789'[randomInt(36)],
          ).join('');
  resetCredentials(c);
  c.transport.source = profile;
  c.source = `${profile}_pending`;
  c.flow = {
    profile,
    device,
    body: {
      account: encrypt(account),
      password: encrypt(password),
      ...(profile === 'sdk'
        ? { token_type: 1 }
        : profile === 'hoyolab_web'
          ? { token_type: 6 }
          : {}),
    },
    proof: {},
    pending: null,
  };
  return login(c);
}
async function challenge(c, r, pending) {
  const f = c.flow;
  const a = parseJSON(r.aigis);
  if (a) {
    const d = typeof a.data === 'string' ? parseJSON(a.data) : a.data;
    demand(a.session_id && d?.gt && (d?.challenge || d?.use_v4), 'CAPTCHA trả schema chưa hỗ trợ.');
    f.challenge = a.session_id;
    f.captchaParams = d.use_v4
      ? { version: 4, captcha_id: d.gt, risk_type: d.risk_type, session_id: a.session_id }
      : { gt: d.gt, challenge: d.challenge, new_captcha: true };
    f.pending = pending;
    return { need: 'captcha', captcha: f.captchaParams };
  }
  return null;
}
async function login(c) {
  const f = c.flow;
  demand(f, 'Phiên đăng nhập đã hết hạn.');
  const operation = f.profile === 'hoyolab_web' ? 'webLogin' : 'login';
  const r = await c.transport.request(operation, {
    method: 'POST',
    body: f.body,
    headers: { ...flowHeaders(f), ...f.proof },
  });
  const need = await challenge(c, r, 'login');
  if (need) return need;
  const risk = parseJSON(r.risk);
  if (risk?.risk_ticket && risk.verify_str) {
    const v = typeof risk.verify_str === 'string' ? parseJSON(risk.verify_str) : risk.verify_str;
    demand(v?.ticket, 'OTP trả schema chưa hỗ trợ.');
    f.risk = risk.risk_ticket;
    f.ticket = v.ticket;
    return info(c);
  }
  if (r.json.retcode !== 0) throw new ApiError(operation, r.http, r.json.retcode);
  if (f.profile === 'hoyolab_web') {
    demand(
      WEB_COOKIE_KEYS.every((k) => typeof r.cookies?.[k] === 'string' && r.cookies[k]),
      'Đăng nhập web chưa trả đủ cookie để đọc Battle Chronicle.',
    );
    c.cookies = r.cookies;
    c.source = 'hoyolab_web';
    c.sdk = null;
    c.flow = null;
    return {
      ok: true,
      stage: 'hoyolab_web_login',
      hasLtokenV2: true,
      hasCookieTokenV2: true,
      next: 'Dùng cookie web để lấy game role; không cần đổi token app.',
    };
  }
  const { token, user_info: u } = r.json.data ?? {};
  demand(
    typeof token?.token === 'string' &&
      token.token &&
      typeof u?.mid === 'string' &&
      u.mid &&
      /^\d+$/.test(String(u?.aid)),
    'LOGIN thiếu token/aid/mid.',
  );
  c.sdk = { token: token.token, aid: String(u.aid), mid: u.mid, tokenType: token.token_type };
  c.source = f.profile || 'sdk';
  c.flow = null;
  return {
    ok: true,
    stage: `${c.source}_login`,
    hasToken: true,
    hasAid: true,
    hasMid: true,
    tokenType: Number.isInteger(token.token_type) ? token.token_type : null,
    next: 'Bấm thử đổi credential; sau đó kiểm tra game role và từng endpoint dữ liệu.',
  };
}
async function info(c) {
  const f = c.flow;
  demand(f?.ticket, 'Không có yêu cầu OTP đang chờ.');
  const d = await c.transport.data('info', {
    method: 'POST',
    body: { action_type: 'verify_for_component', action_ticket: f.ticket },
    headers: flowHeaders(f, true),
  });
  const s = String(d.verify_info?.status ?? '')
    .toLowerCase()
    .replaceAll('_', '');
  if (s === 'verified' || s.includes('statusverified')) {
    f.proof['x-rpc-verify'] = JSON.stringify({ risk_ticket: f.risk, verify_str: null });
    delete f.ticket;
    delete f.risk;
    return login(c);
  }
  // Do not return the linked email, tickets, or arbitrary upstream fields.
  return { need: 'otp', sent: !!d.captcha_sent };
}
export async function sendOtp(c) {
  const f = c.flow;
  demand(f?.ticket, 'Không có OTP đang chờ.');
  demand(!f.sentAt || Date.now() - f.sentAt >= 60000, 'Chờ ít nhất 60 giây trước khi gửi lại OTP.');
  f.sentAt = Date.now();
  const r = await c.transport.request('send', {
    method: 'POST',
    body: { action_type: 'verify_for_component', action_ticket: f.ticket },
    headers: { ...flowHeaders(f, true), ...(f.sendAigis ? { 'x-rpc-aigis': f.sendAigis } : {}) },
  });
  const need = await challenge(c, r, 'send');
  if (need) return need;
  if (r.json.retcode !== 0) throw new ApiError('send', r.http, r.json.retcode);
  return { need: 'otp', sent: true };
}
export async function submitOtp(c, code) {
  const f = c.flow;
  demand(f?.ticket && /^\d{6}$/.test(code), 'Nhập OTP 6 chữ số trên trang local.');
  await c.transport.data('verify', {
    method: 'POST',
    body: {
      action_type: 'verify_for_component',
      action_ticket: f.ticket,
      email_captcha: code,
      verify_method: 2,
    },
    headers: flowHeaders(f, true),
  });
  return info(c);
}
export async function submitCaptcha(c, v) {
  const f = c.flow;
  demand(f?.challenge, 'Không có CAPTCHA đang chờ.');
  let payload;
  if (f.captchaParams?.version === 4) {
    const keys = ['captcha_id', 'lot_number', 'pass_token', 'gen_time', 'captcha_output'];
    demand(
      keys.every((k) => typeof v?.[k] === 'string' && v[k].length > 0 && v[k].length <= 12000),
      'Thiếu kết quả CAPTCHA v4.',
    );
    payload = pick(v, keys);
  } else {
    demand(
      typeof v?.geetest_validate === 'string' && typeof v?.geetest_challenge === 'string',
      'Thiếu kết quả CAPTCHA.',
    );
    payload = {
      geetest_challenge: v.geetest_challenge,
      geetest_validate: v.geetest_validate,
      geetest_seccode: v.geetest_seccode || `${v.geetest_validate}|jordan`,
    };
  }
  const aigis = `${f.challenge};${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
  delete f.challenge;
  delete f.captchaParams;
  const pending = f.pending;
  f.pending = null;
  if (pending === 'send') {
    f.sendAigis = aigis;
    delete f.sentAt;
    return sendOtp(c);
  }
  f.proof['x-rpc-aigis'] = aigis;
  return login(c);
}
export async function refreshCaptcha(c) {
  const f = c.flow;
  demand(f?.challenge && f?.body, 'Không có lượt CAPTCHA đang chờ.');
  demand(
    !f.lastCaptchaRefresh || Date.now() - f.lastCaptchaRefresh >= 30000,
    'Chờ 30 giây trước khi yêu cầu lại CAPTCHA.',
  );
  f.lastCaptchaRefresh = Date.now();
  const pending = f.pending;
  delete f.challenge;
  delete f.captchaParams;
  f.pending = null;
  if (pending === 'send') {
    delete f.sendAigis;
    delete f.sentAt;
    return sendOtp(c);
  }
  delete f.proof['x-rpc-aigis'];
  return login(c);
}
export async function exchange(c) {
  demand(c.sdk, 'Cần LOGIN thành công trước.');
  const s = c.sdk;
  const cookie = {
    stoken: s.token,
    ltuid_v2: s.aid,
    ltmid_v2: s.mid,
    account_id_v2: s.aid,
    account_mid_v2: s.mid,
    mid: s.mid,
  };
  const d = await c.transport.data('exchange', {
    method: 'POST',
    body: { dst_token_types: [2, 4] },
    headers: {
      'x-rpc-app_id': 'c9oqaq3s3gu8',
      ds: ds('IZPgfb0dRPtBeLuFkdDznSZ6f4wWt6y2'),
      Cookie: cookieHeader(cookie, Object.keys(cookie)),
    },
  });
  const next = { ltuid_v2: s.aid, ltmid_v2: s.mid, account_id_v2: s.aid, account_mid_v2: s.mid };
  demand(Array.isArray(d.tokens), 'Đổi credential thiếu danh sách tokens.');
  for (const t of d.tokens)
    if (typeof t.token === 'string' && t.token) {
      if (t.token_type === 2) next.ltoken_v2 = t.token;
      if (t.token_type === 4) next.cookie_token_v2 = t.token;
    }
  demand(next.ltoken_v2 || next.cookie_token_v2, 'Không có token loại 2 hoặc 4 trong kết quả.');
  c.cookies = next;
  return {
    ok: true,
    stage: 'credential_exchange',
    hasLtokenV2: !!next.ltoken_v2,
    hasCookieTokenV2: !!next.cookie_token_v2,
  };
}
export function importCookies(c, raw) {
  const cookies = parseCookies(raw);
  resetCredentials(c);
  c.cookies = cookies;
  c.source = 'manual_cookies';
  c.transport.source = 'manual_cookies';
  return {
    ok: true,
    stage: 'cookies_loaded',
    hasLtoken: !!(cookies.ltoken_v2 || cookies.ltoken),
    hasCookieTokenV2: !!cookies.cookie_token_v2,
  };
}
export async function getRoles(c, route = 'roles') {
  demand(['roles', 'labRoles'].includes(route), 'Đường game role không hợp lệ.');
  const d = await c.transport.data(route, {
    headers:
      route === 'roles' ? { Cookie: cookieHeader(c.cookies, ACCOUNT_KEYS) } : labHeaders(c.cookies),
    params: route === 'roles' ? { game_biz: 'hk4e_global' } : undefined,
    retryRead: true,
  });
  demand(Array.isArray(d.list), 'API game role thiếu list.');
  c.roles = d.list
    .filter(
      (x) =>
        (!x.game_biz || x.game_biz === 'hk4e_global') &&
        ['os_asia', 'os_usa', 'os_euro', 'os_cht'].includes(x.region),
    )
    .map((x) => ({
      uid: String(x.game_uid),
      server: x.region,
      nickname: String(x.nickname ?? ''),
      level: x.level,
    }));
  for (const r of c.roles)
    demand(uidServer(r.uid) === r.server, 'UID/server do API trả không khớp bảng nhận diện.');
  return { ok: true, stage: route, roles: c.roles };
}
export function selectRole(c, uid, server) {
  demand(
    c.roles.some((r) => r.uid === uid && r.server === server),
    'Chọn UID/server trong danh sách API trả về.',
  );
  c.collection?.controller?.abort();
  c.collection = null;
  c.selected = { uid, server };
  c.authkey = null;
  c.archive = null;
  return { ok: true, selected: c.selected };
}
function requireRole(c) {
  demand(c.selected, 'Cần chọn game role trước.');
  return c.selected;
}
export async function chronicle(c, detail = false) {
  const r = requireRole(c);
  const p = { role_id: r.uid, server: r.server };
  const index = await c.transport.data('index', {
    params: { ...p, avatar_list_type: 0 },
    headers: labHeaders(c.cookies),
    retryRead: true,
  });
  const chars = await c.transport.data('characters', {
    method: 'POST',
    body: p,
    headers: labHeaders(c.cookies),
  });
  demand(Array.isArray(chars.list), 'Danh sách nhân vật thiếu list.');
  const data = {
    uid: r.uid,
    server: r.server,
    stats: pick(index.stats, [
      'active_day_number',
      'achievement_number',
      'avatar_number',
      'spiral_abyss',
      'way_point_number',
      'domain_number',
    ]),
    characterCount: chars.list.length,
    characters: chars.list.map((x) =>
      pick(x, [
        'id',
        'name',
        'element',
        'rarity',
        'level',
        'fetter',
        'actived_constellation_num',
        'weapon',
        'reliquaries',
      ]),
    ),
  };
  if (detail && chars.list.length) {
    const d = await c.transport.data('detail', {
      method: 'POST',
      body: { ...p, character_ids: chars.list.slice(0, 3).map((x) => x.id) },
      headers: labHeaders(c.cookies),
    });
    data.detailSample = Array.isArray(d.list)
      ? d.list
          .slice(0, 3)
          .map((x) =>
            pick(x, [
              'base',
              'weapon',
              'relics',
              'constellations',
              'skills',
              'selected_properties',
              'base_properties',
              'extra_properties',
              'element_properties',
            ]),
          )
      : [];
    data.propertyMap = d.property_map ?? {};
  }
  return { ok: true, stage: 'battle_chronicle', ...data };
}
export async function fetchAuthkey(c) {
  const r = requireRole(c);
  demand(
    ACCOUNT_KEYS.every((k) => c.cookies[k]),
    'Cần đủ cookie_token_v2, account_id_v2 và account_mid_v2.',
  );
  const d = await c.transport.data('authkey', {
    method: 'POST',
    headers: { Cookie: cookieHeader(c.cookies, ACCOUNT_KEYS) },
    body: {
      game_uid: r.uid,
      region: r.server,
      game_biz: 'hk4e_global',
      auth_appid: 'webview_gacha',
    },
  });
  demand(
    typeof d.authkey === 'string' && d.authkey.length > 0,
    'Tạo authkey thiếu trường authkey.',
  );
  c.authkey = decodeKey(d.authkey);
  return { ok: true, stage: 'authkey_created', hasAuthkey: true };
}
function decodeKey(k) {
  try {
    return /%[a-f0-9]{2}/i.test(k) ? decodeURIComponent(k) : k;
  } catch {
    throw new Error('Authkey bị mã hóa URL không hợp lệ.');
  }
}
export function importAuthkey(c, raw, uid, server) {
  demand(uidServer(uid) === server, 'UID/server không khớp.');
  demand(typeof raw === 'string' && raw.length <= 20000 && raw.length > 0, 'Authkey không hợp lệ.');
  let key = raw.trim();
  if (/^https?:\/\//.test(key)) {
    let u;
    try {
      u = new URL(key);
    } catch {
      throw new Error('Link lịch sử không hợp lệ.');
    }
    key = u.searchParams.get('authkey');
    demand(key, 'Link thiếu authkey.');
  } else key = decodeKey(key);
  demand(key.length > 0 && !/[\r\n]/.test(key), 'Authkey không hợp lệ.');
  resetCredentials(c);
  c.authkey = key;
  c.source = 'manual_authkey';
  c.transport.source = 'manual_authkey';
  c.selected = { uid, server };
  return {
    ok: true,
    stage: 'authkey_loaded',
    selected: c.selected,
    ownershipVerified: false,
    next: 'Bản ghi gacha trả về phải khớp UID trước khi được nhập.',
  };
}
const WISH_FIELDS = [
  'uid',
  'id',
  'gacha_type',
  'item_id',
  'count',
  'time',
  'name',
  'item_type',
  'rank_type',
];
export function normalizeWishes(list, role, queryType) {
  demand(Array.isArray(list), 'Gacha thiếu list.');
  return list.map((x) => {
    demand(
      typeof x.id === 'string' && /^\d+$/.test(x.id),
      'ID cầu nguyện phải là chuỗi số để tránh mất chính xác.',
    );
    demand(
      String(x.uid) === role.uid,
      'UID của authkey không khớp UID đã chọn; không nhập dữ liệu.',
    );
    demand(
      typeof x.gacha_type === 'string' && BANNERS.includes(x.gacha_type),
      'Loại banner trả về chưa được hỗ trợ.',
    );
    return { ...pick(x, WISH_FIELDS), uid: role.uid, queried_type: queryType };
  });
}
export async function wishPage(c, banner, end = '0') {
  demand(BANNERS.includes(banner) && /^\d+$/.test(end), 'Banner/cursor không hợp lệ.');
  const role = requireRole(c);
  demand(c.authkey, 'Cần authkey còn hiệu lực.');
  const d = await c.transport.data('wishes', {
    params: {
      authkey_ver: 1,
      authkey: c.authkey,
      lang: 'en',
      game_biz: 'hk4e_global',
      gacha_type: banner,
      real_gacha_type: banner,
      size: 20,
      end_id: end,
    },
    retryRead: true,
  });
  demand(!d.region || d.region === role.server, 'Server của authkey không khớp game role.');
  const records = normalizeWishes(d.list, role, banner);
  return { records, nextCursor: records.at(-1)?.id ?? null };
}
function emptyArchive(role) {
  return {
    format: 'genshin-insights-poc-v1',
    uid: role.uid,
    server: role.server,
    game_biz: 'hk4e_global',
    records: [],
    sync: {},
  };
}
export function importArchive(c, a) {
  const r = requireRole(c);
  demand(
    a?.format === 'genshin-insights-poc-v1' &&
      a.uid === r.uid &&
      a.server === r.server &&
      a.game_biz === 'hk4e_global' &&
      Array.isArray(a.records) &&
      a.records.length <= 100000,
    'Backup không đúng định dạng hoặc khác UID/server.',
  );
  const seen = new Set(),
    records = [];
  for (const x of a.records) {
    demand(BANNERS.includes(x.queried_type), 'Backup thiếu queried_type.');
    const item = normalizeWishes([x], r, x.queried_type)[0];
    if (!seen.has(item.id)) {
      seen.add(item.id);
      records.push(item);
    }
  }
  // Imported cursor/checkpoint metadata is untrusted; every new sync starts from end_id=0.
  c.archive = { ...emptyArchive(r), records };
  return { ok: true, imported: records.length };
}
export async function syncWishes(c, banner, maxPages = 3) {
  demand(
    BANNERS.includes(banner) && Number.isInteger(maxPages) && maxPages >= 1 && maxPages <= 20,
    'Mỗi lượt thử từ 1 đến 20 trang, một loại banner.',
  );
  const r = requireRole(c);
  c.archive ??= emptyArchive(r);
  const a = c.archive;
  const previous = a.sync[banner];
  const continuing = previous && ['page_cap', 'in_progress'].includes(previous.stop);
  const priorCoverage = previous?.coverageComplete === true;
  const known = new Set(a.records.map((x) => x.id));
  let added = 0,
    cursor = continuing ? previous.lastCursor : '0',
    pages = 0,
    stop = 'page_cap',
    overlap = false;
  for (; pages < maxPages;) {
    const p = await wishPage(c, banner, cursor);
    pages++;
    if (!p.records.length) {
      stop = 'empty_page';
      break;
    }
    const overlapHere = p.records.some((x) => known.has(x.id));
    for (const row of p.records)
      if (!known.has(row.id)) {
        known.add(row.id);
        a.records.push(row);
        added++;
      }
    overlap ||= overlapHere;
    // Stop on overlap only if a previous scan of this exact query reached its end.
    if (priorCoverage && overlapHere) {
      stop = 'known_coverage';
      break;
    }
    if (!p.nextCursor || (cursor !== '0' && BigInt(p.nextCursor) >= BigInt(cursor))) {
      stop = 'cursor_not_advancing';
      break;
    }
    cursor = p.nextCursor;
    // Save progress after every accepted page, including when a later network call fails.
    a.sync[banner] = {
      at: new Date().toISOString(),
      stop: 'in_progress',
      lastCursor: cursor,
      coverageComplete: priorCoverage,
    };
  }
  const coverageComplete = stop === 'empty_page' || (priorCoverage && stop === 'known_coverage');
  a.sync[banner] = {
    at: new Date().toISOString(),
    pages,
    stop,
    lastCursor: cursor,
    overlap,
    coverageComplete,
  };
  return {
    ok: true,
    stage: 'wish_sync',
    added,
    total: a.records.length,
    pages,
    stop,
    overlap,
    coverageComplete,
    sample: a.records.slice(-5),
    note:
      stop === 'page_cap'
        ? 'Đã chạm giới hạn trang. Bấm đồng bộ tiếp để tiếp tục cursor trong phiên này.'
        : 'Không suy ra lịch sử trọn đời hoặc pity trước mốc lưu trữ.',
  };
}
const enkaCache = new Map();
export async function showcase(c, uid) {
  uidServer(uid);
  const hit = enkaCache.get(uid);
  if (hit && hit.until > Date.now()) return { ...hit.data, cached: true };
  const { json: j } = await c.transport.request('enka', { params: { uid }, retryRead: true });
  demand(j.playerInfo && typeof j.ttl === 'number', 'Enka thiếu playerInfo/ttl.');
  const data = {
    ok: true,
    stage: 'enka',
    uid,
    ttl: j.ttl,
    playerInfo: pick(j.playerInfo, [
      'nickname',
      'level',
      'worldLevel',
      'finishAchievementNum',
      'towerFloorIndex',
      'towerLevelIndex',
    ]),
    showcaseCount: j.avatarInfoList?.length ?? 0,
    avatars: (j.avatarInfoList ?? []).map((x) =>
      pick(x, [
        'avatarId',
        'propMap',
        'talentIdList',
        'fightPropMap',
        'skillDepotId',
        'skillLevelMap',
        'equipList',
        'fetterInfo',
      ]),
    ),
  };
  if (enkaCache.size >= 100) enkaCache.delete(enkaCache.keys().next().value);
  enkaCache.set(uid, { until: Date.now() + Math.max(1, j.ttl) * 1000, data });
  return { ...data, cached: false };
}
export function safeStatus(c) {
  return {
    source: c.source,
    hasSdkToken: !!c.sdk && c.source === 'sdk',
    hasLoginToken: !!c.sdk,
    hasLtoken: !!(c.cookies.ltoken_v2 || c.cookies.ltoken),
    hasCookieTokenV2: !!c.cookies.cookie_token_v2,
    hasAuthkey: !!c.authkey,
    roles: c.roles,
    selected: c.selected,
    records: c.archive?.records.length ?? 0,
    ...(c.flow?.captchaParams ? { pendingCaptcha: c.flow.captchaParams } : {}),
    otpPending: !!c.flow?.ticket,
  };
}
