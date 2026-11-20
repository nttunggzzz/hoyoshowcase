import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createApp } from '../src/server/app.mjs';
import { sameSecret, SESSION_TTL_MS } from '../src/server/http.mjs';
import { createSessionStore } from '../src/server/session-store.mjs';
import { createSnapshotStore } from '../src/server/snapshot-store.mjs';
import { makeFixture } from './fixtures/collector.mjs';

const minimalSnapshot = (id) => ({
  schema: 'genshin-battle-chronicle-v1',
  id,
  role: { uid: '800000001', server: 'os_asia' },
  sections: {},
});
async function removeTestDirectory(directory) {
  const target = path.resolve(directory);
  if (
    !target.startsWith(path.resolve(os.tmpdir()) + path.sep) ||
    !path.basename(target).startsWith('hoyoshowcase-')
  )
    throw Error('Unexpected test cleanup target');
  await fs.rm(target, { recursive: true, force: true });
}
test('constant-time comparison rejects unequal byte lengths without throwing', () => {
  assert.equal(sameSecret('aa', 'aa'), true);
  assert.equal(sameSecret('é', 'a'), false);
  assert.equal(sameSecret(undefined, 'aa'), false);
});
test('expired RAM sessions clear credentials and abort their collection', () => {
  let time = 0;
  const sessions = createSessionStore(() => makeFixture().transport, { now: () => time });
  try {
    const { id, session } = sessions.create();
    session.c.cookies = { ltoken_v2: 'TEST-SECRET' };
    const controller = new AbortController();
    session.c.collection = { controller };
    time = SESSION_TTL_MS + 1;
    assert.equal(sessions.get(id), undefined);
    assert.deepEqual(session.c.cookies, {});
    assert.equal(controller.signal.aborted, true);
  } finally {
    sessions.dispose();
  }
});
test('session store bounds independent sessions and resets them on close', () => {
  const sessions = createSessionStore(() => makeFixture().transport);
  const created = Array.from({ length: 10 }, () => sessions.create());
  assert.throws(() => sessions.create(), /tối đa/);
  assert.equal(new Set(created.map((x) => x.session.csrf)).size, 10);
  sessions.dispose();
  assert.equal(sessions.get(created[0].id), undefined);
});
test('snapshot writes are atomic, serialized and strip credentials', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hoyoshowcase-store-'));
  try {
    const store = createSnapshotStore(dir);
    assert.equal(await store.load(), null);
    await Promise.all([
      store.save({ ...minimalSnapshot('first'), password: 'DO-NOT-WRITE' }),
      store.save({ ...minimalSnapshot('second'), nested: { ltoken_v2: 'DO-NOT-WRITE' } }),
    ]);
    assert.equal((await store.load()).id, 'second');
    assert.ok(!(await fs.readFile(store.filename, 'utf8')).includes('DO-NOT-WRITE'));
    assert.deepEqual(await fs.readdir(dir), ['battle-chronicle-latest.json']);
  } finally {
    await removeTestDirectory(dir);
  }
});
test('invalid archives fail explicitly rather than replacing user data', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hoyoshowcase-invalid-'));
  try {
    const store = createSnapshotStore(dir);
    await fs.writeFile(store.filename, 'broken JSON');
    await assert.rejects(store.load(), /Không đọc được/);
    assert.throws(() => store.save({}), /định dạng/);
    assert.equal(await fs.readFile(store.filename, 'utf8'), 'broken JSON');
  } finally {
    await removeTestDirectory(dir);
  }
});
test('product, module and HTML docs routes work without exposing source or local data', async () => {
  const server = createApp();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of [
      '/',
      '/collector',
      '/research',
      '/README.html',
      '/docs/',
      '/docs/architecture.html',
    ]) {
      const r = await fetch(origin + route);
      assert.equal(r.status, 200, route);
      assert.match(r.headers.get('content-type'), /text\/html/);
    }
    for (const route of [
      '/js/preview/controller.js',
      '/js/preview/renderer.js',
      '/shared/preview-config.mjs',
    ]) {
      const r = await fetch(origin + route);
      assert.equal(r.status, 200, route);
      assert.match(r.headers.get('content-type'), /javascript/);
    }
    for (const route of [
      '/src/server/hoyolab/client.mjs',
      '/data/battle-chronicle-latest.json',
      '/.git/config',
      '/package.json',
    ])
      assert.equal((await fetch(origin + route)).status, 404, route);
    const captcha = await fetch(origin + '/captcha');
    assert.equal(captcha.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.match(captcha.headers.get('content-security-policy'), /geetest/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
test('showcase archive and import routes support both Genshin and HSR snapshots', async () => {
  const genshinSnap = {
    schema: 'genshin-battle-chronicle-v1',
    id: 'snap-genshin-1',
    role: { uid: '800000001', server: 'os_asia', nickname: 'Traveler', level: 60 },
    sections: {
      overview: { data: { stats: {} } },
      characters: { data: { list: [] } },
    },
  };
  const hsrSnap = {
    schema: 'hsr-battle-chronicle-v1',
    id: 'snap-hsr-1',
    role: { uid: '810000001', server: 'prod_official_asia', nickname: 'Trailblazer', level: 70 },
    sections: {
      overview: { data: { stats: {} } },
      characters: { data: { avatar_list: [] } },
    },
  };
  let savedSnapshots = [];
  const server = createApp({
    savedSnapshot: genshinSnap,
    savedHsrSnapshot: hsrSnap,
    onSnapshot: async (s) => savedSnapshots.push(s),
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const rG = await fetch(origin + '/api/showcase/archive/genshin');
    assert.equal(rG.status, 200);
    const jG = await rG.json();
    assert.equal(jG.schema, 'genshin-battle-chronicle-v1');

    const rH = await fetch(origin + '/api/showcase/archive/hsr');
    assert.equal(rH.status, 200);
    const jH = await rH.json();
    assert.equal(jH.schema, 'hsr-battle-chronicle-v1');

    const sRes = await fetch(origin + '/api/session');
    const { csrf } = await sRes.json();
    const cookie = sRes.headers.get('set-cookie')?.split(';')[0];

    const impHsr = await fetch(origin + '/api/showcase/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-poc-csrf': csrf,
        Cookie: cookie,
        Origin: origin,
      },
      body: JSON.stringify(hsrSnap),
    });
    assert.equal(impHsr.status, 200);
    const resH = await impHsr.json();
    assert.equal(resH.ok, true);
    assert.equal(resH.game, 'hsr');
    assert.equal(resH.view.game, 'hsr');

    const impBad = await fetch(origin + '/api/showcase/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-poc-csrf': csrf,
        Cookie: cookie,
        Origin: origin,
      },
      body: JSON.stringify({ schema: 'unknown-v1' }),
    });
    assert.equal(impBad.status, 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
