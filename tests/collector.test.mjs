import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, DEMO_ROLE } from './fixtures/collector.mjs';
import {
  startCollection,
  collectionStatus,
  cancelCollection,
  exportCollection,
  CAPABILITIES,
  COLLECTOR_ROUTES,
  stripCredentials,
} from '../src/server/collection/collector.mjs';
import { resetCredentials, selectRole } from '../src/server/hoyolab/client.mjs';
import { createApp } from '../src/server/app.mjs';
import { showcaseModel } from '../src/server/models/showcase.mjs';
import { gameImageUrl, createGameMedia } from '../src/server/media/game-media.mjs';

async function collect(f, options) {
  startCollection(f.ctx, options);
  await f.ctx.collection.done;
  return exportCollection(f.ctx);
}
test('native image cache accepts only public game image URLs and coalesces duplicate loads', async () => {
  const url =
      'https://act-webstatic.hoyoverse.com/game_record/genshin/city_icon/UI_ChapterIcon_Liyue.png',
    encode = (s) => Buffer.from(s).toString('base64url');
  assert.equal(gameImageUrl(encode(url)), url);
  assert.equal(
    gameImageUrl(encode('https://fastcdn.hoyoverse.com/static-resource-v2/2026/08/24/game.png')),
    'https://fastcdn.hoyoverse.com/static-resource-v2/2026/08/24/game.png',
  );
  for (const unsafe of [
    'http://127.0.0.1/private.png',
    'https://act-webstatic.hoyoverse.com.evil.invalid/hk4e/a.png',
    'https://act-webstatic.hoyoverse.com/account/login.png',
    'https://act-webstatic.hoyoverse.com/hk4e/image.png?authkey=SECRET',
  ])
    assert.throws(() => gameImageUrl(encode(unsafe)));
  let calls = 0;
  const media = createGameMedia(async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 4));
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png' } });
  });
  const [a, b] = await Promise.all([media(encode(url)), media(encode(url))]);
  assert.equal(a, b);
  assert.equal(calls, 1);
  await media(encode(url));
  assert.equal(calls, 1);
});
test('showcase retains official region artwork, statues, offerings and display grouping', async () => {
  const f = makeFixture({ characters: 1 }),
    s = await collect(f);
  s.sections.overview.data.world_explorations = [
    {
      id: 2,
      name: 'Liyue',
      background_image: 'https://act-webstatic.hoyoverse.com/game_record/genshin/region.png',
      seven_statue_level: 10,
      offerings: [{ name: 'Offering', level: 8 }],
    },
  ];
  s.sections.overview.data.world_exploration_display = [
    { exploration_id: 2, group: { items: [] } },
  ];
  const m = showcaseModel(s);
  assert.equal(m.regions[0].seven_statue_level, 10);
  assert.equal(m.regions[0].offerings[0].level, 8);
  assert.ok(m.regions[0].background_image.endsWith('region.png'));
  assert.equal(m.worldDisplay[0].exploration_id, 2);
});

test('parallel collection bounds in-flight requests and counts each module independently', async () => {
  let active = 0,
    peak = 0;
  const f = makeFixture({
    characters: 45,
    override: async (call) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 8));
      active--;
    },
  });
  const s = await collect(f);
  assert.ok(peak > 1);
  assert.ok(peak <= 4);
  assert.equal(s.state, 'complete');
  assert.equal(s.summary.requests, f.calls.length);
  for (const m of Object.values(s.sections))
    assert.equal(
      m.requestCount,
      f.calls.filter(
        (c) =>
          c.path === m.endpoint &&
          Object.entries(CAPABILITIES.find((x) => x.id === m.id).params ?? {}).every(
            ([key, value]) => String(c.payload[key]) === String(value),
          ) &&
          (!['tcg_decks', 'tcg_deck_details'].includes(m.id) ||
            (Number(c.payload.deck_id) === 0) === (m.id === 'tcg_decks')),
      ).length,
    );
  assert.equal(s.summary.detailedCharacters, 45);
});
test('a fatal response during parallel work keeps its reason and aborts queued work', async () => {
  const f = makeFixture({
    override: (call) =>
      call.path === 'dailyNote'
        ? new Response(JSON.stringify({ retcode: -100, data: null }))
        : undefined,
  });
  const s = await collect(f);
  assert.equal(s.state, 'expired');
  const count = f.calls.length;
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(f.calls.length, count);
  assert.ok(count < 15);
});
test('showcase view can render partial characters and omits the heavy TCG page bodies', async () => {
  const f = makeFixture({ characters: 2 });
  const s = await collect(f);
  s.sections.overview.data.stats.ltoken_v2 = 'DO-NOT-EXPORT';
  const view = showcaseModel(s, { saved: true });
  assert.equal(view.characters.length, 2);
  assert.equal(view.characters[0].hasDetail, true);
  assert.equal(view.tcg.cards, 2);
  assert.equal(view.saved, true);
  assert.equal(view.sections, undefined);
  assert.ok(!JSON.stringify(view).includes('DO-NOT-EXPORT'));
  assert.ok(!JSON.stringify(view).includes('FIXTURE-LTOKEN-SECRET'));
  assert.throws(() => showcaseModel({}));
});
test('saved showcase opens without upstream requests and does not create a logged-in session', async () => {
  const f = makeFixture({ characters: 2 }),
    saved = await collect(f);
  let calls = 0;
  const server = createApp({
    savedSnapshot: saved,
    transportFactory: () => {
      calls++;
      return makeFixture().transport;
    },
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${origin}/api/showcase/saved`),
      view = (await response.json()).view;
    assert.equal(view.characters.length, 2);
    assert.equal(calls, 0);
    const session = await (await fetch(`${origin}/api/session`)).json();
    assert.equal(session.status.hasLtoken, false);
    assert.equal((await fetch(`${origin}/api/showcase/archive`)).status, 200);
    assert.equal((await fetch(`${origin}/assets/outfit.ttf`)).status, 200);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
test('collects every character in bounded batches, all equipment copies and raw fields', async () => {
  const f = makeFixture(),
    s = await collect(f);
  assert.equal(s.state, 'complete');
  assert.equal(s.summary.characters, 27);
  assert.equal(s.summary.detailedCharacters, 27);
  assert.equal(s.summary.equippedWeapons, 27);
  assert.equal(s.summary.equippedArtifacts, 135);
  assert.equal(s.sections.character_details.data.batches.length, 3);
  assert.equal(s.sections.overview.data.future_field.preserve, true);
  assert.equal(s.views.equippedWeapons[0].future_stat.value, 123);
  assert.equal(s.sections.character_details.data.batches[0].data.unknown_metadata.keep, true);
  assert.equal(s.summary.modulesSucceeded, CAPABILITIES.length);
  assert.ok(!JSON.stringify(s).includes('FIXTURE-LTOKEN-SECRET'));
  assert.ok(!JSON.stringify(s).includes('FIXTURE-MID'));
  const detailCalls = f.calls.filter((x) => x.path === 'character/detail');
  assert.deepEqual(
    detailCalls.map((x) => x.payload.character_ids.length),
    [10, 10, 7],
  );
  for (const x of f.calls) {
    assert.equal(new URL(x.url).origin, 'https://sg-act-public-api.hoyolab.com');
    assert.equal(String(x.payload.role_id), DEMO_ROLE.uid);
    assert.equal(x.payload.server, DEMO_ROLE.server);
    assert.ok(!/setPrivacy|setCover|top$|add_notice|red_dot|set_recommend/.test(x.path));
  }
});
test('TCG follows server next_offset and collects each returned challenge period/deck', async () => {
  const f = makeFixture({ characters: 1 }),
    s = await collect(f);
  assert.deepEqual(
    f.calls.filter((x) => x.path === 'gcg/cardList').map((x) => x.payload.offset),
    ['0', '32'],
  );
  assert.equal(s.sections.tcg_cards.data.card_list.length, 2);
  assert.equal(s.sections.tcg_cards.data.complete, true);
  assert.equal(s.sections.tcg_challenge_records.data.records.length, 2);
  assert.equal(s.sections.tcg_challenge_decks.data.decks.length, 2);
});
test('challenge decks without identifiers are retained and marked incomplete', async () => {
  const f = makeFixture({
      characters: 1,
      override: (call) =>
        call.path === 'gcg/challenge/record'
          ? new Response(
              JSON.stringify({
                retcode: 0,
                data: { deck_list: [{ name: 'deck-without-id', avatar_cards: [] }] },
              }),
            )
          : undefined,
    }),
    s = await collect(f);
  assert.equal(s.sections.tcg_challenge_decks.state, 'partial');
  assert.equal(s.sections.tcg_challenge_decks.data.unresolvedDecks.length, 2);
  assert.equal(s.sections.tcg_challenge_decks.data.unresolvedDecks[0].data.name, 'deck-without-id');
  assert.equal(s.state, 'partial');
});
test('missing character details mark snapshot partial and retain basic equipment fallback', async () => {
  const f = makeFixture({
      characters: 3,
      override: (call) =>
        call.path === 'character/detail'
          ? new Response(JSON.stringify({ retcode: 0, data: { list: [] } }))
          : undefined,
    }),
    s = await collect(f);
  assert.equal(s.state, 'partial');
  assert.equal(s.sections.character_details.state, 'partial');
  assert.equal(s.sections.character_details.data.missingCharacterIds.length, 3);
  assert.equal(s.summary.characters, 3);
  assert.equal(s.summary.detailedCharacters, 0);
  assert.equal(s.summary.equippedWeapons, 3);
});
test('TPS follows the official unlock_tps gate and is not fetched for locked characters', async () => {
  const f = makeFixture({
    characters: 3,
    override: (call) =>
      call.path === 'character/detail'
        ? new Response(
            JSON.stringify({
              retcode: 0,
              data: {
                list: call.payload.character_ids.map((id) => ({ base: { id }, unlock_tps: false })),
              },
            }),
          )
        : undefined,
  });
  const s = await collect(f);
  assert.equal(s.sections.tps.state, 'not_applicable');
  assert.equal(s.sections.tps.requestCount, 0);
  assert.equal(s.summary.modulesNotApplicable, 1);
  assert.equal(s.summary.modulesApplicable, CAPABILITIES.length - 1);
  assert.equal(s.state, 'complete');
  assert.ok(!f.calls.some((x) => x.path === 'tps'));
});
test('TPS is still requested when unlock flags are true or not fully known', async () => {
  const f = makeFixture({
    characters: 2,
    override: (call) =>
      call.path === 'character/detail'
        ? new Response(
            JSON.stringify({
              retcode: 0,
              data: {
                list: call.payload.character_ids.map((id, i) => ({
                  base: { id },
                  ...(i === 0 ? { unlock_tps: false } : {}),
                })),
              },
            }),
          )
        : undefined,
  });
  const s = await collect(f);
  assert.equal(s.sections.tps.state, 'ok');
  assert.equal(f.calls.filter((x) => x.path === 'tps').length, 1);
});
test('foreign IDs in a details response are rejected before export', async () => {
  const f = makeFixture({
      characters: 1,
      override: (call) =>
        call.path === 'character/detail'
          ? new Response(
              JSON.stringify({
                retcode: 0,
                data: { list: [{ base: { id: 999 }, private_marker: 'FOREIGN-DATA' }] },
              }),
            )
          : undefined,
    }),
    s = await collect(f);
  assert.equal(s.sections.character_details.state, 'error');
  assert.ok(!JSON.stringify(s).includes('FOREIGN-DATA'));
});
test('TCG cursor stalls fail explicitly instead of claiming a full card collection', async () => {
  const f = makeFixture({
      override: (call) =>
        call.path === 'gcg/cardList'
          ? new Response(
              JSON.stringify({
                retcode: 0,
                data: { card_list: [{ id: 1 }], is_last: false, next_offset: 0 },
              }),
            )
          : undefined,
    }),
    s = await collect(f);
  assert.equal(s.state, 'partial');
  assert.equal(s.sections.tcg_cards.state, 'error');
  assert.equal(f.calls.filter((x) => x.path === 'gcg/cardList').length, 1);
  assert.equal(s.sections.tcg_challenge_records.state, 'ok');
});
test('privacy failure in one module preserves and continues independent modules', async () => {
  const f = makeFixture({
      override: (call) =>
        call.path === 'dailyNote'
          ? new Response(JSON.stringify({ retcode: 10102, message: 'private', data: null }))
          : undefined,
    }),
    s = await collect(f);
  assert.equal(s.state, 'partial');
  assert.equal(s.sections.realtime_notes.state, 'unavailable');
  assert.equal(s.sections.tcg_cards.state, 'ok');
  assert.equal(s.sections.characters.state, 'ok');
});
for (const [retcode, state] of [
  [-100, 'expired'],
  [1034, 'needs_verification'],
])
  test(`${state} stops later requests and exports no risk/credential body`, async () => {
    const f = makeFixture({
        override: (call) =>
          call.path === 'index'
            ? new Response(
                JSON.stringify({
                  retcode,
                  data: { authkey: 'NO-EXPORT', risk_ticket: 'NO-EXPORT' },
                }),
              )
            : undefined,
      }),
      s = await collect(f);
    assert.equal(s.state, state);
    assert.equal(f.calls.length, 1);
    assert.ok(!JSON.stringify(s).includes('NO-EXPORT'));
    assert.equal(s.sections.characters.state, 'skipped');
  });
test('429 honors a long Retry-After without retrying or querying later modules', async () => {
  const f = makeFixture({
      override: () =>
        new Response(JSON.stringify({ retcode: -3006, data: null }), {
          status: 429,
          headers: { 'Retry-After': '120' },
        }),
    }),
    s = await collect(f);
  assert.equal(s.state, 'rate_limited');
  assert.equal(f.calls.length, 1);
  assert.ok(f.transport.blockedUntil > Date.now());
});
test('request/page budgets retain partial data and mark incomplete coverage', async () => {
  const f = makeFixture(),
    s = await collect(f, { maxRequests: 4 });
  assert.equal(s.state, 'request_limit');
  assert.equal(f.calls.length, 4);
  assert.equal(s.sections.characters.state, 'ok');
  const f2 = makeFixture(),
    s2 = await collect(f2, { maxCardPages: 1 });
  assert.equal(s2.sections.tcg_cards.state, 'partial');
  assert.equal(s2.sections.tcg_cards.data.complete, false);
});
test('cancel aborts current fetch and does not schedule more account requests', async () => {
  const f = makeFixture({
    override: (call) =>
      new Promise((resolve, reject) => {
        call.signal.addEventListener('abort', () => reject(Error('aborted')), { once: true });
      }),
  });
  startCollection(f.ctx);
  await new Promise((resolve) => setTimeout(resolve, 20));
  cancelCollection(f.ctx);
  await f.ctx.collection.done;
  assert.equal(collectionStatus(f.ctx).state, 'cancelled');
  assert.equal(f.calls.length, 1);
});
test('reset/role change cannot leave a running job attached to another account', async () => {
  const f = makeFixture({
    override: (call) =>
      new Promise((resolve, reject) => {
        call.signal.addEventListener('abort', () => reject(Error('aborted')), { once: true });
      }),
  });
  startCollection(f.ctx);
  const previous = f.ctx.collection;
  await new Promise((resolve) => setTimeout(resolve, 10));
  resetCredentials(f.ctx);
  await previous.done;
  assert.equal(f.ctx.collection, null);
  assert.deepEqual(f.ctx.cookies, {});
  const f2 = makeFixture();
  await collect(f2);
  selectRole(f2.ctx, DEMO_ROLE.uid, DEMO_ROLE.server);
  assert.equal(f2.ctx.collection, null);
});
test('role ownership and route allowlist are enforced; credential pruning is recursive', async () => {
  const f = makeFixture();
  f.ctx.selected = { uid: '800000002', server: 'os_asia' };
  assert.throws(() => startCollection(f.ctx));
  assert.ok(
    Object.values(COLLECTOR_ROUTES).every((x) => !x.includes('set') && !x.includes('change')),
  );
  assert.deepEqual(
    stripCredentials({
      stats: { name: 'kept', authkey: 'drop' },
      list: [{ cookie_token_v2: 'drop', level: 1 }],
    }),
    { stats: { name: 'kept' }, list: [{ level: 1 }] },
  );
  await assert.rejects(f.transport.request('https://evil.invalid'));
});
test('HTTP collector is session scoped and exports no credentials', async () => {
  const server = createApp({ transportFactory: () => makeFixture().transport });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const boot = async () => {
      const r = await fetch(`${origin}/api/session`);
      return { cookie: r.headers.get('set-cookie').split(';')[0], ...(await r.json()) };
    };
    const a = await boot(),
      b = await boot();
    const post = (session, path, value = {}) =>
      fetch(`${origin}/api/${path}`, {
        method: 'POST',
        headers: {
          Cookie: session.cookie,
          Origin: origin,
          'x-poc-csrf': session.csrf,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value),
      });
    await post(a, 'cookies', { cookies: 'ltoken_v2=TEST-SECRET; ltuid_v2=42' });
    await post(a, 'roles', { route: 'labRoles' });
    await post(a, 'select', { uid: DEMO_ROLE.uid, server: DEMO_ROLE.server });
    assert.equal((await post(a, 'collector/start')).status, 200);
    const other = await (await post(b, 'collector/status')).json();
    assert.equal(other.collection.state, 'idle');
    assert.equal((await post(b, 'collector/export')).status, 400);
    let result;
    for (let i = 0; i < 100; i++) {
      result = await (await post(a, 'collector/status')).json();
      if (result.collection.state !== 'running') break;
      await new Promise((r) => setTimeout(r, 5));
    }
    assert.equal(result.collection.state, 'complete');
    const exported = await (await post(a, 'collector/export')).text();
    assert.ok(!exported.includes('TEST-SECRET'));
    assert.equal((await fetch(`${origin}/collector`)).status, 200);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
test('HTTP blocks credential/role changes during a job and permits cancellation', async () => {
  const calls = [];
  const server = createApp({
    transportFactory: () =>
      makeFixture({
        override: (call) => {
          calls.push(call);
          if (call.path === 'index')
            return new Promise((resolve, reject) =>
              call.signal.addEventListener('abort', () => reject(Error('cancelled')), {
                once: true,
              }),
            );
        },
      }).transport,
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const boot = await fetch(`${origin}/api/session`),
      cookie = boot.headers.get('set-cookie').split(';')[0],
      session = await boot.json();
    const post = (path, value = {}) =>
      fetch(`${origin}/api/${path}`, {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Origin: origin,
          'x-poc-csrf': session.csrf,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value),
      });
    await post('cookies', { cookies: 'ltoken_v2=TEST-SECRET; ltuid_v2=42' });
    await post('roles', { route: 'labRoles' });
    await post('select', { uid: DEMO_ROLE.uid, server: DEMO_ROLE.server });
    await post('collector/start');
    assert.equal(
      (await post('login', { account: 'fixture', password: 'fixture', profile: 'hoyolab' })).status,
      409,
    );
    assert.equal(
      (await post('select', { uid: DEMO_ROLE.uid, server: DEMO_ROLE.server })).status,
      409,
    );
    assert.equal((await post('collector/cancel')).status, 200);
    await new Promise((r) => setTimeout(r, 20));
    const j = await (await post('collector/status')).json();
    assert.equal(j.collection.state, 'cancelled');
    assert.equal(calls.filter((x) => x.path === 'index').length, 1);
    assert.ok(!calls.some((x) => x.url.endsWith('appLoginByPassword')));
  } finally {
    await new Promise((r) => server.close(r));
  }
});
