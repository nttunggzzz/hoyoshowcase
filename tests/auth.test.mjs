import test from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../src/server/hoyolab/client.mjs';
import { createApp } from '../src/server/app.mjs';
import { createHash } from 'node:crypto';
function response(data = {}, retcode = 0, headers = {}, status = 200) {
  return new Response(JSON.stringify({ retcode, data, message: 'DO-NOT-EXPOSE token=SECRET' }), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
function fake(responses) {
  const calls = [];
  const transport = new c.Transport(
    async (url, opts) => {
      calls.push({ url: String(url), ...opts });
      const r = responses.shift();
      assert.ok(r, 'Unexpected upstream request');
      return typeof r === 'function' ? r(url, opts) : r;
    },
    { spacing: 0 },
  );
  return { ctx: c.newContext(transport), calls };
}
const role = { uid: '800000001', server: 'os_asia' };
const wish = (id, uid = role.uid) => ({
  id,
  uid,
  gacha_type: '301',
  item_id: '10000001',
  count: '1',
  rank_type: '4',
  name: 'Demo',
  item_type: 'Character',
  time: '2026-10-20 08:00:00',
});
test('UID: 18 Asia and other Global servers; no aid inference', () => {
  assert.equal(c.uidServer('1800000001'), 'os_asia');
  assert.equal(c.uidServer('600000001'), 'os_usa');
  assert.throws(() => c.uidServer('123456789'));
});
test('cookie parsing uses whitelist and rejects injection', () => {
  assert.deepEqual(c.parseCookies('ltoken_v2=SECRET; irrelevant=DROP; ltuid_v2=42'), {
    ltoken_v2: 'SECRET',
    ltuid_v2: '42',
  });
  assert.throws(() => c.parseCookies('{"ltoken":"secret\\r\\nInjected: x"}'));
});
const webCookies = {
  ltoken_v2: 'WEB-LTOKEN-SECRET==',
  ltuid_v2: '42',
  ltmid_v2: 'WEB-MID-SECRET',
  cookie_token_v2: 'WEB-COOKIE-SECRET',
  account_id_v2: '42',
  account_mid_v2: 'WEB-MID-SECRET',
};
function webResponse() {
  const r = response({});
  for (const [k, v] of Object.entries(webCookies))
    r.headers.append('Set-Cookie', `${k}=${v}; Secure; HttpOnly; Path=/`);
  r.headers.append('Set-Cookie', 'unrelated=DROP; Path=/');
  return r;
}
test('web login consumes separate Set-Cookie headers directly without app login or token exchange', async () => {
  const f = fake([webResponse()]),
    device = '12345678-abcd-4abc-8abc-123456789abc';
  const r = await c.startLogin(
    f.ctx,
    'demo@example.invalid',
    'fixture-only',
    'hoyolab_web',
    device,
  );
  assert.equal(r.stage, 'hoyolab_web_login');
  assert.deepEqual(f.ctx.cookies, webCookies);
  assert.equal(f.ctx.sdk, null);
  assert.equal(f.ctx.flow, null);
  assert.equal(f.calls.length, 1);
  const call = f.calls[0],
    body = JSON.parse(call.body);
  assert.equal(call.url, c.URLS.webLogin);
  assert.equal(call.headers['x-rpc-client_type'], '4');
  assert.equal(call.headers['x-rpc-app_id'], 'c9oqaq3s3gu8');
  assert.equal(call.headers['x-rpc-device_id'], device);
  assert.equal(call.headers.Origin, 'https://account.hoyolab.com');
  assert.equal(call.headers.Referer, 'https://account.hoyolab.com/');
  assert.equal(call.headers.ds, undefined);
  assert.equal(body.token_type, 6);
  assert.notEqual(body.password, 'fixture-only');
  assert.notEqual(body.account, 'demo@example.invalid');
  assert.equal(c.safeStatus(f.ctx).hasLtoken, true);
  assert.ok(!JSON.stringify([r, f.ctx.transport.audit, c.safeStatus(f.ctx)]).includes('SECRET'));
});
test('web CAPTCHA replay uses the web endpoint and keeps encrypted credentials and Device ID', async () => {
  const f = fake([
    response({}, -3101, {
      'x-rpc-aigis': JSON.stringify({
        session_id: 'web-session',
        data: { gt: 'gt', challenge: 'challenge' },
      }),
    }),
    webResponse(),
  ]);
  assert.equal(
    (await c.startLogin(f.ctx, 'demo@example.invalid', 'fixture-only', 'hoyolab_web')).need,
    'captcha',
  );
  assert.equal(
    (await c.submitCaptcha(f.ctx, { geetest_validate: 'proof', geetest_challenge: 'challenge' }))
      .stage,
    'hoyolab_web_login',
  );
  assert.equal(f.calls[0].body, f.calls[1].body);
  assert.equal(f.calls[0].headers['x-rpc-device_id'], f.calls[1].headers['x-rpc-device_id']);
  assert.ok(f.calls.every((x) => x.url === c.URLS.webLogin));
  assert.match(f.calls[1].headers['x-rpc-aigis'], /^web-session;/);
});
test('web login rejects incomplete cookie success and invalid Device ID without falling back to app', async () => {
  const f = fake([response({})]);
  await assert.rejects(
    c.startLogin(f.ctx, 'demo@example.invalid', 'fixture-only', 'hoyolab_web', 'invalid\r\nvalue'),
  );
  assert.equal(f.calls.length, 0);
  await assert.rejects(
    c.startLogin(f.ctx, 'demo@example.invalid', 'fixture-only', 'hoyolab_web'),
    /chưa trả đủ cookie/,
  );
  assert.deepEqual(f.ctx.cookies, {});
  assert.equal(c.safeStatus(f.ctx).hasLtoken, false);
  assert.equal(f.calls.length, 1);
});
test('web cookie parser preserves equals and respects cookie removal without accepting unrelated cookies', () => {
  const h = new Headers();
  for (const value of [
    'ltoken_v2=secret==; Path=/',
    'ltuid_v2=42; Path=/',
    'ltuid_v2=42; Max-Age=0',
    'cookie_token_v2=old; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'unrelated=DROP',
  ])
    h.append('Set-Cookie', value);
  assert.deepEqual(c.readWebCookies(h), { ltoken_v2: 'secret==' });
});
test('web OTP is entered only after a real risk response and is never sent automatically', async () => {
  const f = fake([
    response({}, -3235, {
      'x-rpc-verify': JSON.stringify({
        risk_ticket: 'risk',
        verify_str: JSON.stringify({ ticket: 'ticket' }),
      }),
    }),
    response({ verify_info: { status: 'Pending' }, captcha_sent: false }),
  ]);
  assert.equal(
    (await c.startLogin(f.ctx, 'demo@example.invalid', 'fixture-only', 'hoyolab_web')).need,
    'otp',
  );
  assert.deepEqual(
    f.calls.map((x) => x.url),
    [c.URLS.webLogin, c.URLS.info],
  );
  assert.equal(c.safeStatus(f.ctx).otpPending, true);
});
test('SDK -> CAPTCHA -> OTP -> LOGIN repeats same Device ID and never returns token', async () => {
  const f = fake([
    response({}, -3101, {
      'x-rpc-aigis': JSON.stringify({
        session_id: 'session',
        data: JSON.stringify({ gt: 'gt', challenge: 'ch' }),
      }),
    }),
    response({}, -3235, {
      'x-rpc-verify': JSON.stringify({
        risk_ticket: 'risk',
        verify_str: JSON.stringify({ ticket: 'ticket' }),
      }),
    }),
    response({ verify_info: { status: 'Pending' }, captcha_sent: true }),
    response({}),
    response({ verify_info: { status: 'StatusVerified' } }),
    response({
      token: { token: 'SDK-SECRET', token_type: 1 },
      user_info: { aid: '42', mid: 'MID-SECRET' },
    }),
  ]);
  const a = await c.startLogin(f.ctx, 'demo@example.invalid', 'password');
  assert.equal(a.need, 'captcha');
  const b = await c.submitCaptcha(f.ctx, { geetest_validate: 'valid', geetest_challenge: 'ch' });
  assert.equal(b.need, 'otp');
  const d = await c.submitOtp(f.ctx, '123456');
  assert.equal(d.stage, 'sdk_login');
  assert.ok(!JSON.stringify(d).includes('SECRET'));
  assert.equal(f.ctx.flow, null);
  assert.equal(new Set(f.calls.map((x) => x.headers['x-rpc-device_id'])).size, 1);
  assert.match(f.calls[0].headers['x-rpc-device_id'], /^[a-f0-9]{53}$/);
  assert.notEqual(JSON.parse(f.calls[0].body).password, 'password');
  assert.notEqual(JSON.parse(f.calls[0].body).account, 'demo@example.invalid');
  assert.equal(JSON.parse(f.calls[0].body).token_type, 1);
  assert.ok(f.calls[1].headers['x-rpc-aigis']);
  assert.ok(f.calls.at(-1).headers['x-rpc-verify']);
});
test('CAPTCHA on OTP send retries that request, not password login', async () => {
  const f = fake([
    response({}, -3101, {
      'x-rpc-aigis': JSON.stringify({ session_id: 's', data: { gt: 'g', challenge: 'c' } }),
    }),
    response({}),
  ]);
  f.ctx.flow = { device: 'a'.repeat(53), ticket: 'ticket', proof: {} };
  assert.equal((await c.sendOtp(f.ctx)).need, 'captcha');
  assert.equal(
    (await c.submitCaptcha(f.ctx, { geetest_validate: 'v', geetest_challenge: 'c' })).sent,
    true,
  );
  assert.ok(f.calls.every((x) => x.url === c.URLS.send));
});
test('expired CAPTCHA refresh preserves encrypted credentials and Device ID, with bounded manual retry', async () => {
  const header = (n) => ({
    'x-rpc-aigis': JSON.stringify({ session_id: `s${n}`, data: { gt: 'gt', challenge: `ch${n}` } }),
  });
  const f = fake([response({}, -3101, header(1)), response({}, -3101, header(2))]);
  await c.startLogin(f.ctx, 'fixture@example.invalid', 'fixture-only');
  const firstBody = f.calls[0].body;
  const next = await c.refreshCaptcha(f.ctx);
  assert.equal(next.captcha.challenge, 'ch2');
  assert.equal(f.calls[1].body, firstBody);
  assert.equal(f.calls[0].headers['x-rpc-device_id'], f.calls[1].headers['x-rpc-device_id']);
  await assert.rejects(c.refreshCaptcha(f.ctx));
  assert.equal(f.calls.length, 2);
});
test('SDK token -> exact library getBySToken request, with token 2/4 parsed independently', async () => {
  const f = fake([
    response({
      tokens: [
        { token_type: 2, token: 'LT-SECRET' },
        { token_type: 4, token: 'CT-SECRET' },
      ],
    }),
  ]);
  f.ctx.sdk = { token: 'SDK-SECRET', aid: '42', mid: 'MID-SECRET' };
  const result = await c.exchange(f.ctx);
  assert.equal(f.calls[0].url, c.URLS.exchange);
  assert.equal(f.calls[0].headers['x-rpc-app_id'], 'c9oqaq3s3gu8');
  assert.deepEqual(JSON.parse(f.calls[0].body), { dst_token_types: [2, 4] });
  assert.match(f.calls[0].headers.Cookie, /stoken=SDK-SECRET/);
  assert.ok(!JSON.stringify(result).includes('SECRET'));
});
test('independent HoYoLAB login uses its own app profile, body-signed DS and source label', async () => {
  const f = fake([
    response({
      token: { token: 'LAB-SECRET', token_type: 1 },
      user_info: { aid: '42', mid: 'MID' },
    }),
  ]);
  const result = await c.startLogin(f.ctx, 'fixture@example.invalid', 'fixture-only', 'hoyolab');
  const call = f.calls[0],
    body = JSON.parse(call.body);
  assert.equal(result.stage, 'hoyolab_login');
  assert.equal(call.headers['x-rpc-app_id'], 'c9oqaq3s3gu8');
  assert.equal(call.headers['x-rpc-client_type'], '2');
  assert.equal(body.token_type, undefined);
  assert.match(call.headers['x-rpc-device_id'], /^[a-z0-9]{16}$/);
  const [t, r, hash] = call.headers.ds.split(',');
  assert.equal(
    hash,
    createHash('md5')
      .update(`salt=IZPgfb0dRPtBeLuFkdDznSZ6f4wWt6y2&t=${t}&r=${r}&b=${call.body}&q=`)
      .digest('hex'),
  );
  assert.equal(f.ctx.transport.audit[0].source, 'hoyolab');
  assert.equal(c.safeStatus(f.ctx).hasSdkToken, false);
});
test('HoYoLAB v4 CAPTCHA validates required fields and sends a bound Aigis result', async () => {
  const f = fake([
    response({}, -3101, {
      'x-rpc-aigis': JSON.stringify({
        session_id: 'v4-session',
        data: { gt: 'captcha-id', risk_type: 'slide', use_v4: true },
      }),
    }),
    response({
      token: { token: 'LAB-SECRET', token_type: 1 },
      user_info: { aid: '42', mid: 'MID' },
    }),
  ]);
  const a = await c.startLogin(f.ctx, 'fixture@example.invalid', 'fixture-only', 'hoyolab');
  assert.equal(a.captcha.version, 4);
  await assert.rejects(c.submitCaptcha(f.ctx, { captcha_id: 'captcha-id' }));
  const valid = {
    captcha_id: 'captcha-id',
    lot_number: 'lot',
    pass_token: 'provider-proof',
    gen_time: '123',
    captcha_output: 'output',
  };
  await c.submitCaptcha(f.ctx, valid);
  const [session, b64] = f.calls[1].headers['x-rpc-aigis'].split(';');
  assert.equal(session, 'v4-session');
  assert.deepEqual(JSON.parse(Buffer.from(b64, 'base64').toString()), valid);
  assert.ok(!JSON.stringify(f.ctx.transport.audit).includes('provider-proof'));
});
test('HTTP 200 retcode failure never counts as login or credential success', async () => {
  const f = fake([response({}, -100)]);
  f.ctx.sdk = { token: 'S', aid: '42', mid: 'M' };
  await assert.rejects(c.exchange(f.ctx), (e) => e.retcode === -100);
  assert.deepEqual(f.ctx.cookies, {});
});
test('roles are server-authoritative and foreign selection is rejected', async () => {
  const f = fake([
    response({ list: [{ game_uid: role.uid, region: role.server, game_biz: 'hk4e_global' }] }),
  ]);
  await c.getRoles(f.ctx);
  assert.throws(() => c.selectRole(f.ctx, '800000002', 'os_asia'));
  c.selectRole(f.ctx, role.uid, role.server);
  assert.deepEqual(f.ctx.selected, role);
});
test('authkey mint payload has game UID/server, never aid', async () => {
  const f = fake([response({ authkey: 'a%2Bb%3D' })]);
  f.ctx.selected = role;
  f.ctx.cookies = { cookie_token_v2: 'CT', account_id_v2: '42', account_mid_v2: 'MID' };
  const j = await c.fetchAuthkey(f.ctx);
  assert.equal(f.ctx.authkey, 'a+b=');
  assert.equal(j.hasAuthkey, true);
  assert.deepEqual(JSON.parse(f.calls[0].body), {
    game_uid: role.uid,
    region: role.server,
    game_biz: 'hk4e_global',
    auth_appid: 'webview_gacha',
  });
});
test('authkey URL parsed locally, plus and encoded plus preserved', () => {
  const f = c.newContext();
  c.importAuthkey(f, 'https://example.invalid/?authkey=a%2Bb%3D', role.uid, role.server);
  assert.equal(f.authkey, 'a+b=');
  c.importAuthkey(f, 'a+b=', role.uid, role.server);
  assert.equal(f.authkey, 'a+b=');
});
test('wish response must match UID; numeric large IDs rejected', () => {
  assert.throws(() => c.normalizeWishes([wish('123', '800000002')], role, '301'));
  assert.throws(() => c.normalizeWishes([wish(9007199254740993)], role, '301'));
  assert.equal(
    c.normalizeWishes([wish('9007199254740993123')], role, '301')[0].id,
    '9007199254740993123',
  );
});
test('bounded sync resumes across caps, deduplicates, then uses proven overlap incrementally', async () => {
  const f = fake([
    response({
      region: 'os_asia',
      list: [wish('9007199254740993123'), wish('9007199254740993122')],
    }),
    response({ region: 'os_asia', list: [wish('9007199254740993121')] }),
    response({ region: 'os_asia', list: [] }),
    response({
      region: 'os_asia',
      list: [wish('9007199254740993124'), wish('9007199254740993123')],
    }),
  ]);
  f.ctx.selected = role;
  f.ctx.authkey = 'AUTH-SECRET';
  assert.equal((await c.syncWishes(f.ctx, '301', 1)).stop, 'page_cap');
  assert.equal((await c.syncWishes(f.ctx, '301', 1)).added, 1);
  const done = await c.syncWishes(f.ctx, '301', 2);
  assert.equal(done.coverageComplete, true);
  assert.equal(done.stop, 'empty_page');
  const inc = await c.syncWishes(f.ctx, '301', 2);
  assert.equal(inc.stop, 'known_coverage');
  assert.equal(inc.added, 1);
  assert.equal(inc.total, 4);
  assert.equal(new URL(f.calls[1].url).searchParams.get('end_id'), '9007199254740993122');
  assert.equal(new URL(f.calls[3].url).searchParams.get('end_id'), '0');
  assert.ok(!JSON.stringify(f.ctx.transport.audit).includes('SECRET'));
});
test('backup cannot inject credentials, foreign UID, or trusted checkpoint', () => {
  const ctx = c.newContext();
  ctx.selected = role;
  const a = {
    format: 'genshin-insights-poc-v1',
    ...role,
    game_biz: 'hk4e_global',
    records: [{ ...wish('3'), queried_type: '301', authkey: 'LEAK' }],
    sync: { 301: { coverageComplete: true } },
    token: 'LEAK',
  };
  c.importArchive(ctx, a);
  assert.ok(!JSON.stringify(ctx.archive).includes('LEAK'));
  assert.deepEqual(ctx.archive.sync, {});
  assert.throws(() => c.importArchive(ctx, { ...a, uid: '800000002' }));
});
test('rate limit on authentication is not retried and logs contain no URL/body', async () => {
  const f = fake([response({}, -3006, { 'Retry-After': '120' }, 429)]);
  await assert.rejects(c.startLogin(f.ctx, 'a@b.invalid', 'PASSWORD-SECRET'));
  assert.equal(f.calls.length, 1);
  assert.ok(!JSON.stringify(f.ctx.transport.audit).includes('SECRET'));
  assert.equal(c.retrySeconds('120'), 120);
});
test('loopback HTTP guards isolate sessions, reject cross-origin writes, and never export secrets', async () => {
  let calls = 0;
  const server = createApp({
    transportFactory: () =>
      new c.Transport(
        async () => {
          calls++;
          return response({}, -100);
        },
        { spacing: 0 },
      ),
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const a = await fetch(`${origin}/api/session`),
      cookieA = a.headers.get('set-cookie').split(';')[0],
      sA = await a.json();
    const b = await fetch(`${origin}/api/session`),
      cookieB = b.headers.get('set-cookie').split(';')[0],
      sB = await b.json();
    assert.notEqual(sA.csrf, sB.csrf);
    const post = (path, data, cookie = cookieA, csrf = sA.csrf, site = origin) =>
      fetch(`${origin}/api/${path}`, {
        method: 'POST',
        headers: {
          Cookie: cookie,
          'x-poc-csrf': csrf,
          Origin: site,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    assert.equal(
      (await post('cookies', { cookies: 'ltoken_v2=COOKIE-SECRET; ltuid_v2=42' })).status,
      200,
    );
    assert.equal((await post('reset', {}, cookieB, sA.csrf)).status, 403);
    assert.equal((await post('reset', {}, cookieA, sA.csrf, 'https://evil.invalid')).status, 403);
    const statusB = await (
      await fetch(`${origin}/api/session`, { headers: { Cookie: cookieB } })
    ).json();
    assert.equal(statusB.status.hasLtoken, false);
    const ev = await (await post('evidence', {})).text();
    assert.ok(!ev.includes('COOKIE-SECRET'));
    assert.equal(calls, 0);
    assert.equal((await fetch(`${origin}/api/session?token=secret`)).status, 400);
    const page = await fetch(origin);
    assert.match(page.headers.get('content-security-policy'), /script-src 'self'/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
test('redeemCode validates input and calls upstream giftcode endpoint', async () => {
  const f = fake([
    response({
      body: { retcode: 0, message: 'Đổi thành công!', data: null },
    }),
  ]);
  f.ctx.cookies = { cookie_token_v2: 'TEST_COOKIE_TOKEN' };
  f.ctx.selected = { uid: '887630784', server: 'os_asia' };

  await assert.rejects(c.redeemCode(f.ctx, ''), /nhập mã đổi quà/);
  await assert.rejects(
    c.redeemCode({ ...f.ctx, cookies: {} }, 'GENSHINGIFT'),
    /đăng nhập tài khoản/,
  );

  const res = await c.redeemCode(f.ctx, 'GENSHINGIFT');
  assert.equal(res.ok, true);
  assert.equal(res.retcode, 0);
  assert.equal(res.code, 'GENSHINGIFT');
  assert.equal(f.calls.length, 1);
  assert.ok(f.calls[0].url.startsWith(c.URLS.redeem));
  assert.match(f.calls[0].headers.Cookie, /cookie_token_v2=TEST_COOKIE_TOKEN/);
});
