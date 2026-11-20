import test from 'node:test';
import assert from 'node:assert/strict';
import { uidServer, getRoles, newContext, Transport } from '../src/server/hoyolab/client.mjs';
import { createSnapshotStore } from '../src/server/snapshot-store.mjs';
import { hsrShowcaseModel } from '../src/server/models/hsr-showcase.mjs';
import { gameImageUrl } from '../src/server/media/game-media.mjs';
import {
  startHsrCollection,
  hsrCollectionStatus,
} from '../src/server/collection/hsr-collector.mjs';
import { makeFixture } from './fixtures/collector.mjs';
import { startCollection, exportCollection } from '../src/server/collection/collector.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

function response(data = {}, retcode = 0) {
  return new Response(JSON.stringify({ retcode, data, message: 'OK' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('uidServer recognizes HSR Global regions by prefix', () => {
  assert.equal(uidServer('800000001', 'hkrpg_global'), 'prod_official_asia');
  assert.equal(uidServer('600000001', 'hkrpg_global'), 'prod_official_usa');
  assert.equal(uidServer('700000001', 'hkrpg_global'), 'prod_official_euro');
  assert.equal(uidServer('900000001', 'hkrpg_global'), 'prod_official_cht');
  assert.throws(() => uidServer('123456789', 'hkrpg_global'));
});

test('getRoles parses both Genshin and HSR roles from HoYoLAB', async () => {
  const responses = [
    response({
      list: [
        { game_uid: '800000001', region: 'os_asia', game_biz: 'hk4e_global', nickname: 'Aether' },
        {
          game_uid: '810000001',
          region: 'prod_official_asia',
          game_biz: 'hkrpg_global',
          nickname: 'Trailblazer',
        },
      ],
    }),
  ];
  const transport = new Transport(async () => responses.shift(), { spacing: 0 });
  const ctx = newContext(transport);
  ctx.cookies = { ltoken_v2: 'SECRET', ltuid_v2: '42' };

  const res = await getRoles(ctx);
  assert.equal(res.ok, true);
  assert.equal(ctx.roles.length, 2);

  const genshinRole = ctx.roles.find((r) => r.game === 'genshin');
  assert.ok(genshinRole);
  assert.equal(genshinRole.uid, '800000001');
  assert.equal(genshinRole.server, 'os_asia');
  assert.equal(genshinRole.gameBiz, 'hk4e_global');

  const hsrRole = ctx.roles.find((r) => r.game === 'hsr');
  assert.ok(hsrRole);
  assert.equal(hsrRole.uid, '810000001');
  assert.equal(hsrRole.server, 'prod_official_asia');
  assert.equal(hsrRole.gameBiz, 'hkrpg_global');
});

test('createSnapshotStore validates and saves hsr-battle-chronicle-v1', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'hsr-store-test-'));
  try {
    const store = createSnapshotStore(dir);
    const hsrSnapshot = {
      schema: 'hsr-battle-chronicle-v1',
      role: { uid: '810000001', server: 'prod_official_asia', game: 'hsr' },
      sections: {
        overview: {
          id: 'overview',
          state: 'done',
          data: { stats: { active_days: 100, avatar_num: 35 } },
        },
      },
    };
    await store.save(hsrSnapshot);
    const loaded = await store.load('hsr');
    assert.ok(loaded);
    assert.equal(loaded.schema, 'hsr-battle-chronicle-v1');
    assert.equal(loaded.role.uid, '810000001');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('hsrShowcaseModel normalizes avatars, light cones, and relics cleanly', () => {
  const snapshot = {
    schema: 'hsr-battle-chronicle-v1',
    role: { uid: '810000001', server: 'prod_official_asia', nickname: 'Kafka', level: 70 },
    sections: {
      overview: {
        data: {
          stats: {
            active_days: 365,
            avatar_num: 2,
            achievement_num: 500,
            chest_num: 800,
            abyss_process: '12-3',
          },
        },
      },
      characters: {
        data: {
          avatar_list: [
            {
              id: 1308,
              name: 'Acheron',
              rarity: 5,
              level: 80,
              rank: 2,
              element: 'Thunder',
              path: 'Nihility',
              icon: 'https://act-webstatic.hoyoverse.com/hkrpg/avatar/acheron.png',
              equip: {
                id: 23022,
                name: 'Along the Passing Shore',
                rarity: 5,
                level: 80,
                rank: 1,
                icon: 'https://act-webstatic.hoyoverse.com/hkrpg/equip/passing_shore.png',
              },
              relics: [
                {
                  id: 61091,
                  name: 'Pioneer Head',
                  level: 15,
                  pos: 1,
                  rarity: 5,
                  icon: 'https://act-webstatic.hoyoverse.com/hkrpg/relic/head.png',
                },
              ],
              ornaments: [
                {
                  id: 31051,
                  name: 'Izumo Sphere',
                  level: 15,
                  pos: 1,
                  rarity: 5,
                  icon: 'https://act-webstatic.hoyoverse.com/hkrpg/relic/sphere.png',
                },
              ],
            },
          ],
        },
      },
    },
  };

  const model = hsrShowcaseModel(snapshot);
  assert.equal(model.game, 'hsr');
  assert.equal(model.profile.nickname, 'Kafka');
  assert.equal(model.stats.activeDays, 365);
  assert.equal(model.characters.length, 1);

  const acheron = model.characters[0];
  assert.equal(acheron.name, 'Acheron');
  assert.equal(acheron.rank, 2);
  assert.equal(acheron.equip?.name, 'Along the Passing Shore');
  assert.equal(acheron.equip?.rank, 1);
  assert.equal(acheron.relics.length, 2);
});

test('gameImageUrl accepts HSR game record image URLs', () => {
  const hsrUrl = 'https://act-webstatic.hoyoverse.com/hkrpg/avatar/acheron.png';
  const encoded = Buffer.from(hsrUrl).toString('base64url');
  assert.equal(gameImageUrl(encoded), hsrUrl);

  const hsrRecordUrl =
    'https://act-webstatic.hoyoverse.com/game_record/hkrpg/avatar/icon.png?x-resource-process=image/auto-orient';
  const encodedRecord = Buffer.from(hsrRecordUrl).toString('base64url');
  assert.equal(gameImageUrl(encodedRecord), hsrRecordUrl);
});

test('createApp serves saved HSR and Genshin views independently', async () => {
  const { createApp } = await import('../src/server/app.mjs');
  const f = makeFixture({ characters: 1 });
  startCollection(f.ctx);
  await f.ctx.collection.done;
  const genshinSnapshot = exportCollection(f.ctx);

  const hsrSnapshot = {
    schema: 'hsr-battle-chronicle-v1',
    role: { uid: '810000001', server: 'prod_official_asia', nickname: 'Stelle' },
    sections: { overview: { data: { stats: { active_days: 200 } } } },
  };

  const app = createApp({
    savedSnapshot: genshinSnapshot,
    savedHsrSnapshot: hsrSnapshot,
  });

  await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve));
  const port = app.address().port;

  try {
    const hsrRes = await fetch(`http://127.0.0.1:${port}/api/showcase/saved/hsr`);
    const hsrJson = await hsrRes.json();
    assert.equal(hsrJson.view?.game, 'hsr');
    assert.equal(hsrJson.view?.profile?.uid, '810000001');

    const genshinRes = await fetch(`http://127.0.0.1:${port}/api/showcase/saved/genshin`);
    const genshinJson = await genshinRes.json();
    assert.equal(genshinJson.view?.game, 'genshin');
    assert.equal(genshinJson.view?.role?.uid, '800000001');
  } finally {
    await new Promise((resolve) => app.close(resolve));
  }
});
