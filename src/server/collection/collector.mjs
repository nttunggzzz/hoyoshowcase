import { randomUUID } from 'node:crypto';
import { demand, labHeaders, ApiError, uidServer } from '../hoyolab/client.mjs';

// Read endpoints observed in the shipped HoYoLAB pc_3970008a.js + 44 lazy chunks,
// retrieved 2026-11-02. No settings, notices, sort order, red-dot cancellation or writes.
const BASE = 'https://sg-act-public-api.hoyolab.com/event/game_record/genshin/api/';
export const SOURCE = Object.freeze({
  url: 'https://act.hoyolab.com/app/community-game-records-sea/index.html',
  clientDate: '2026-11-02',
  collectorVersion: '0.7.0',
  bundle: 'pc_3970008a.js',
  bundleSha256: 'ee6ba837d85e7a1d4a10b74dc8a98403f51b62a18b0c1ee2d73bbe724e5eab6e',
  libraryCommit: '83518883f840d0a318ddb18374d76d5fe29038d8',
});
export const CAPABILITIES = Object.freeze([
  {
    id: 'overview',
    label: 'Tổng quan, khám phá và Ấm Trần Ca',
    path: 'index',
    method: 'GET',
    params: { avatar_list_type: 1 },
  },
  { id: 'role', label: 'Hồ sơ tài khoản Genshin', path: 'roleBasicInfo', method: 'GET' },
  { id: 'characters', label: 'Toàn bộ danh sách nhân vật', path: 'character/list', method: 'POST' },
  {
    id: 'character_details',
    label: 'Chi tiết tất cả nhân vật và trang bị',
    path: 'character/detail',
    method: 'POST',
    dynamic: true,
  },
  {
    id: 'abyss_current',
    label: 'La Hoàn kỳ hiện tại',
    path: 'spiralAbyss',
    method: 'GET',
    params: { schedule_type: 1 },
  },
  {
    id: 'abyss_previous',
    label: 'La Hoàn kỳ trước',
    path: 'spiralAbyss',
    method: 'GET',
    params: { schedule_type: 2 },
  },
  {
    id: 'theater',
    label: 'Nhà Hát Giả Tưởng, các kỳ API trả về',
    path: 'role_combat',
    method: 'GET',
    params: { need_detail: true },
  },
  {
    id: 'stygian',
    label: 'U Cảnh Nguy Chiến, các kỳ API trả về',
    path: 'hard_challenge',
    method: 'GET',
    params: { need_detail: true },
  },
  {
    id: 'stygian_popularity',
    label: 'Đội hình phổ biến U Cảnh',
    path: 'hard_challenge/popularity',
    method: 'GET',
  },
  { id: 'envisaged_echoes', label: 'Dư Âm Tưởng Tượng', path: 'char_master', method: 'GET' },
  { id: 'achievements', label: 'Thành tựu', path: 'achievement', method: 'POST' },
  {
    id: 'activities',
    label: 'Toàn bộ báo cáo sự kiện API còn cung cấp',
    path: 'activities',
    method: 'GET',
  },
  { id: 'calendar', label: 'Lịch hoạt động và tiến độ', path: 'act_calendar', method: 'POST' },
  {
    id: 'realtime_notes',
    label: 'Nhựa, thám hiểm và ghi chú thời gian thực',
    path: 'dailyNote',
    method: 'GET',
  },
  { id: 'tps', label: 'Cấu hình súng đặc biệt nếu đã mở khóa', path: 'tps', method: 'GET' },
  {
    id: 'tcg_overview',
    label: 'Tổng quan Thất Thánh Triệu Hồi',
    path: 'gcg/basicInfo',
    method: 'GET',
  },
  {
    id: 'tcg_cards',
    label: 'Toàn bộ thẻ bài qua phân trang',
    path: 'gcg/cardList',
    method: 'GET',
    dynamic: true,
  },
  { id: 'tcg_card_backs', label: 'Mặt lưng thẻ bài', path: 'gcg/cardBackList', method: 'GET' },
  {
    id: 'tcg_decks',
    label: 'Bộ bài Thất Thánh',
    path: 'gcg/deckList',
    method: 'GET',
    params: { deck_id: 0 },
  },
  {
    id: 'tcg_deck_details',
    label: 'Chi tiết từng bộ bài Thất Thánh',
    path: 'gcg/deckList',
    method: 'GET',
    dynamic: true,
  },
  {
    id: 'tcg_matches',
    label: 'Các trận gần đây và trận yêu thích',
    path: 'gcg/matchList',
    method: 'GET',
  },
  {
    id: 'tcg_schedules',
    label: 'Các kỳ thử thách Thất Thánh',
    path: 'gcg/challenge/schedule',
    method: 'GET',
  },
  {
    id: 'tcg_challenge_records',
    label: 'Chi tiết từng kỳ thử thách Thất Thánh',
    path: 'gcg/challenge/record',
    method: 'GET',
    dynamic: true,
  },
  {
    id: 'tcg_challenge_decks',
    label: 'Chi tiết các bộ bài trong thử thách',
    path: 'gcg/challenge/deck',
    method: 'GET',
    dynamic: true,
  },
]);
const CATALOG = Object.fromEntries(CAPABILITIES.map((x) => [x.id, x]));
export const COLLECTOR_ROUTES = Object.freeze(
  Object.fromEntries(CAPABILITIES.map((x) => [`bc_${x.id}`, BASE + x.path])),
);
const SECRET_KEYS =
  /^(?:password|email_captcha|stoken(?:_v2)?|ltoken(?:_v2)?|cookie_token(?:_v2)?|authkey|token|access_token|refresh_token|pass_token|account_mid_v2|account_id_v2|ltmid_v2|ltuid_v2|aid|mid)$/i;
export function stripCredentials(value) {
  if (Array.isArray(value)) return value.map(stripCredentials);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([k]) => !SECRET_KEYS.test(k) && !['__proto__', 'prototype', 'constructor'].includes(k),
        )
        .map(([k, v]) => [k, stripCredentials(v)]),
    );
  return value;
}
const now = () => new Date().toISOString();
const fatalCodes = new Map([
  [-100, 'expired'],
  [10001, 'expired'],
  [1034, 'needs_verification'],
  [10035, 'needs_verification'],
  [10041, 'needs_verification'],
  [5003, 'needs_verification'],
  [-3006, 'rate_limited'],
]);
function failure(e) {
  return {
    message: e instanceof ApiError ? e.message : 'Không đọc được dữ liệu của mục này.',
    ...(e instanceof ApiError ? { http: e.http, retcode: e.retcode } : {}),
  };
}
function assertOwner(c, role) {
  demand(
    c.selected?.uid === role.uid && c.selected.server === role.server,
    'Tài khoản được chọn đã thay đổi.',
  );
  demand(
    c.roles.some((r) => r.uid === role.uid && r.server === role.server),
    'Role không thuộc danh sách tài khoản đã xác thực.',
  );
  demand(uidServer(role.uid) === role.server, 'UID/server không hợp lệ.');
}
function entry(spec) {
  return {
    id: spec.id,
    label: spec.label,
    endpoint: spec.path,
    method: spec.method,
    state: 'queued',
    requestCount: 0,
    data: null,
  };
}
export function collectionStatus(c) {
  const j = c.collection;
  if (!j) return { state: 'idle', modules: [], summary: null };
  const s = j.snapshot;
  return {
    id: s.id,
    state: s.state,
    startedAt: s.startedAt,
    finishedAt: s.finishedAt,
    requestCount: j.requests,
    activeModule: j.activeModule,
    role: s.role,
    summary: s.summary,
    modules: Object.values(s.sections).map(({ data, ...m }) => m),
    limitations: s.limitations,
    hasSnapshot: true,
  };
}
export function cancelCollection(c) {
  demand(c.collection, 'Chưa có lượt thu thập.');
  c.collection.stop = 'cancelled';
  c.collection.controller.abort();
  return collectionStatus(c);
}
export function exportCollection(c) {
  demand(c.collection, 'Chưa có dữ liệu để xuất.');
  return stripCredentials(c.collection.snapshot);
}
export function startCollection(
  c,
  {
    maxRequests = 300,
    maxCardPages = 200,
    batchSize = 10,
    concurrency = 4,
    intervalMs = Math.min(120, c.transport.spacing),
  } = {},
) {
  demand(
    !c.collection || c.collection.snapshot.state !== 'running',
    'Lượt thu thập trước đang chạy.',
  );
  demand(c.selected, 'Hãy chọn UID/server trước.');
  const role = { ...c.selected };
  assertOwner(c, role);
  demand(
    c.cookies.ltoken_v2 || c.cookies.ltoken || c.cookies.cookie_token_v2,
    'Cần đăng nhập HoYoLAB hoặc cookie hợp lệ.',
  );
  demand(
    Number.isInteger(maxRequests) && maxRequests >= 1 && maxRequests <= 500,
    'Giới hạn request không hợp lệ.',
  );
  demand(
    Number.isInteger(maxCardPages) && maxCardPages >= 1 && maxCardPages <= 300,
    'Giới hạn phân trang không hợp lệ.',
  );
  demand(
    Number.isInteger(batchSize) && batchSize >= 1 && batchSize <= 20,
    'Kích thước nhóm nhân vật không hợp lệ.',
  );
  demand(
    Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 4,
    'Số request song song không hợp lệ.',
  );
  c.transport.routes = { ...c.transport.routes, ...COLLECTOR_ROUTES };
  const snapshot = {
    schema: 'genshin-battle-chronicle-v1',
    id: randomUUID(),
    source: SOURCE,
    credentialSource: c.source,
    role,
    startedAt: now(),
    finishedAt: null,
    state: 'running',
    sections: Object.fromEntries(CAPABILITIES.map((x) => [x.id, entry(x)])),
    views: { characters: [], equippedWeapons: [], equippedArtifacts: [] },
    summary: null,
    limitations: [
      'Chỉ dữ liệu Genshin mà Battle Chronicle/API cho phép tài khoản này đọc tại thời điểm thu thập.',
      'Vũ khí và thánh di vật là trang bị gắn với nhân vật. Chưa thấy API kho độc lập trong bundle đã kiểm tra; không coi đây là toàn bộ túi đồ.',
      'Giữ nguyên các kỳ/lịch sử API còn trả về; không khôi phục kỳ đã bị HoYoLAB loại bỏ.',
      'Không thu thập lịch sử cầu nguyện, game khác, ảnh tĩnh hoặc nội dung bài viết hướng dẫn bên ngoài Battle Chronicle.',
      'Snapshot gồm nhiều request nối tiếp, không phải ảnh chụp đồng thời của máy chủ.',
    ],
  };
  const job = {
    snapshot,
    controller: new AbortController(),
    requests: 0,
    activeModule: null,
    stop: null,
    done: null,
  };
  c.collection = job;
  const check = () => {
    if (job.controller.signal.aborted) {
      job.stop ??= 'cancelled';
      throw new Error('cancelled');
    }
    assertOwner(c, role);
    if (job.stop) throw new Error('stopped');
    if (job.requests >= maxRequests) {
      job.stop = 'request_limit';
      throw new Error('budget');
    }
  };
  let active = 0;
  const waiting = [];
  async function request(id, extra = {}) {
    if (active >= concurrency) await new Promise((resolve) => waiting.push(resolve));
    else active++;
    try {
      check();
      const spec = CATALOG[id],
        payload = { role_id: role.uid, server: role.server, ...spec.params, ...extra };
      job.requests++;
      snapshot.sections[id].requestCount++;
      return await c.transport.data(`bc_${id}`, {
        method: spec.method,
        headers: { ...labHeaders(c.cookies), Referer: SOURCE.url, 'x-rpc-env': 'default' },
        ...(spec.method === 'POST' ? { body: payload } : { params: payload }),
        retryRead: spec.method === 'GET',
        signal: job.controller.signal,
        intervalMs,
      });
    } finally {
      if (waiting.length) waiting.shift()();
      else active--;
    }
  }
  function errorState(m, e) {
    if (e instanceof ApiError)
      job.stop ??= fatalCodes.get(e.retcode) || (e.http === 429 ? 'rate_limited' : null);
    if (job.controller.signal.aborted) job.stop ??= 'cancelled';
    if (job.stop && job.stop !== 'request_limit') job.controller.abort();
    m.state =
      job.stop ||
      (e instanceof ApiError && [10102, 1008, 1009].includes(e.retcode) ? 'unavailable' : 'error');
    m.error = failure(e);
  }
  async function run(id, fn) {
    const m = snapshot.sections[id];
    if (job.stop) {
      m.state = 'skipped';
      m.reason = job.stop;
      return;
    }
    m.state = 'running';
    m.startedAt = now();
    job.activeModule = id;
    try {
      await fn(m);
      if (m.state === 'running') m.state = 'ok';
    } catch (e) {
      errorState(m, e);
    } finally {
      m.finishedAt = now();
    }
  }
  async function together(tasks) {
    const results = await Promise.allSettled(tasks.map((fn) => fn()));
    const failed = results.find((x) => x.status === 'rejected');
    if (failed) throw failed.reason;
  }
  const read = (id) =>
    run(id, async (m) => {
      m.data = stripCredentials(await request(id));
    });
  async function details() {
    await run('character_details', async (m) => {
      const list = snapshot.sections.characters.data?.list;
      demand(Array.isArray(list), 'Danh sách nhân vật không có list hợp lệ.');
      const ids = [...new Set(list.map((x) => x.id))];
      demand(
        ids.every((id) => Number.isSafeInteger(id) && id > 0),
        'ID nhân vật không hợp lệ.',
      );
      m.data = { expectedCharacterIds: ids, batches: [], missingCharacterIds: [] };
      const received = new Set();
      const tasks = [];
      for (let p = 0; p < ids.length; p += batchSize) {
        const wanted = ids.slice(p, p + batchSize);
        tasks.push(async () => {
          const d = await request('character_details', { character_ids: wanted });
          demand(Array.isArray(d.list), 'Chi tiết nhân vật thiếu list.');
          for (const x of d.list) {
            const id = x.base?.id ?? x.id;
            demand(wanted.includes(id), 'API trả chi tiết ngoài nhóm nhân vật đã yêu cầu.');
          }
          for (const x of d.list) received.add(x.base?.id ?? x.id);
          m.data.batches.push({ requestedCharacterIds: wanted, data: stripCredentials(d) });
          m.data.batches.sort(
            (a, b) =>
              ids.indexOf(a.requestedCharacterIds[0]) - ids.indexOf(b.requestedCharacterIds[0]),
          );
          m.progress = { received: received.size, total: ids.length };
        });
      }
      await together(tasks);
      m.data.missingCharacterIds = ids.filter((id) => !received.has(id));
      if (m.data.missingCharacterIds.length) {
        m.state = 'partial';
        m.error = { message: 'API chưa trả đủ chi tiết các nhân vật đã yêu cầu.' };
      }
    });
  }
  async function cards() {
    await run('tcg_cards', async (m) => {
      m.data = { pages: [], card_list: [], complete: false };
      const offsets = new Set();
      let offset = 0;
      for (let page = 0; page < maxCardPages; page++) {
        demand(!offsets.has(String(offset)), 'Cursor thẻ bài không tiến lên.');
        offsets.add(String(offset));
        const d = await request('tcg_cards', {
          need_avatar: true,
          need_action: true,
          need_stats: false,
          offset,
          limit: 32,
        });
        demand(Array.isArray(d.card_list), 'Danh sách thẻ bài thiếu card_list.');
        m.data.pages.push(stripCredentials(d));
        m.data.card_list.push(...stripCredentials(d.card_list));
        m.progress = { pages: page + 1, cards: m.data.card_list.length };
        if ([true, 1, 'true'].includes(d.is_last)) {
          m.data.complete = true;
          break;
        }
        demand(
          d.next_offset !== undefined && String(d.next_offset) !== String(offset),
          'API không trả cursor tiếp theo hợp lệ.',
        );
        offset = d.next_offset;
      }
      if (!m.data.complete) {
        m.state = 'partial';
        m.error = { message: 'Đã chạm giới hạn phân trang thẻ bài.' };
      }
    });
  }
  async function firearms() {
    await run('tps', async (m) => {
      const detailSection = snapshot.sections.character_details;
      const list = snapshot.sections.characters.data?.list ?? [];
      const details = (detailSection.data?.batches ?? []).flatMap((x) => x.data.list ?? []);
      const flags = details.map((x) => x.unlock_tps ?? x.base?.unlock_tps);
      if (
        detailSection.state === 'ok' &&
        list.length === details.length &&
        flags.every((x) => x === false)
      ) {
        m.state = 'not_applicable';
        m.reason =
          'Trang HoYoLAB không hiện mục súng: mọi nhân vật đã lấy đều có unlock_tps=false.';
        m.eligibility = {
          source: 'character/detail.unlock_tps',
          charactersChecked: list.length,
          unlocked: false,
        };
        return;
      }
      m.data = stripCredentials(await request('tps'));
    });
  }
  async function challengeRecords() {
    await run('tcg_challenge_records', async (m) => {
      const schedules = snapshot.sections.tcg_schedules.data?.schedule_list;
      demand(Array.isArray(schedules), 'Không có danh sách kỳ Thất Thánh hợp lệ.');
      m.data = { records: [] };
      await together(
        schedules.map((s) => async () => {
          demand(
            typeof s.id === 'number' || typeof s.id === 'string',
            'ID kỳ Thất Thánh không hợp lệ.',
          );
          m.data.records.push({
            scheduleId: s.id,
            data: stripCredentials(await request('tcg_challenge_records', { schedule_id: s.id })),
          });
        }),
      );
      m.data.records.sort(
        (a, b) =>
          schedules.findIndex((s) => s.id === a.scheduleId) -
          schedules.findIndex((s) => s.id === b.scheduleId),
      );
    });
  }
  async function deckDetails() {
    await run('tcg_deck_details', async (m) => {
      const decks = snapshot.sections.tcg_decks.data?.deck_list;
      demand(Array.isArray(decks), 'Không có danh sách bộ bài hợp lệ.');
      m.data = { decks: [], unresolvedDecks: [] };
      const seen = new Set();
      for (const deck of decks) {
        const id = deck.deck_id ?? deck.id;
        if (!/^\d+$/.test(String(id)) || Number(id) <= 0) {
          m.data.unresolvedDecks.push(deck);
          continue;
        }
        if (seen.has(String(id))) continue;
        seen.add(String(id));
        m.data.decks.push({
          deckId: id,
          data: stripCredentials(await request('tcg_deck_details', { deck_id: id })),
        });
      }
      if (m.data.unresolvedDecks.length) {
        m.state = 'partial';
        m.error = { message: 'Một số bộ bài chưa có ID hợp lệ để lấy chi tiết.' };
      }
    });
  }
  async function challengeDecks() {
    await run('tcg_challenge_decks', async (m) => {
      const records = snapshot.sections.tcg_challenge_records.data?.records;
      demand(Array.isArray(records), 'Chưa có dữ liệu thử thách Thất Thánh.');
      m.data = { decks: [], unresolvedDecks: [] };
      const seen = new Set();
      for (const r of records)
        for (const deck of r.data.deck_list ?? []) {
          const id = deck.deck_id ?? deck.id;
          if ((typeof id !== 'number' && typeof id !== 'string') || !/^\d+$/.test(String(id))) {
            m.data.unresolvedDecks.push({ scheduleId: r.scheduleId, data: stripCredentials(deck) });
            continue;
          }
          const key = `${r.scheduleId}:${id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          m.data.decks.push({
            scheduleId: r.scheduleId,
            deckId: id,
            data: stripCredentials(
              await request('tcg_challenge_decks', { schedule_id: r.scheduleId, deck_id: id }),
            ),
          });
        }
      if (m.data.unresolvedDecks.length) {
        m.state = 'partial';
        m.error = {
          message: 'Một số bộ bài thử thách chưa có ID để lấy chi tiết; dữ liệu gốc vẫn được giữ.',
        };
      }
    });
  }
  job.done = (async () => {
    try {
      await read('overview');
      if (!job.stop) {
        const independent = CAPABILITIES.filter(
          (x) =>
            ![
              'overview',
              'role',
              'characters',
              'character_details',
              'tps',
              'tcg_cards',
              'tcg_decks',
              'tcg_deck_details',
              'tcg_schedules',
              'tcg_challenge_records',
              'tcg_challenge_decks',
            ].includes(x.id),
        );
        await together([
          async () => {
            await read('characters');
            await details();
            await firearms();
          },
          () => read('role'),
          () => read('realtime_notes'),
          ...independent
            .filter((x) => x.id !== 'realtime_notes')
            .map((spec) => () => read(spec.id)),
          () => cards(),
          async () => {
            await read('tcg_decks');
            await deckDetails();
          },
          async () => {
            await read('tcg_schedules');
            await challengeRecords();
            await challengeDecks();
          },
        ]);
      }
    } catch {
      job.stop ??= 'failed';
    } finally {
      for (const m of Object.values(snapshot.sections))
        if (m.state === 'queued' || m.state === 'running') {
          m.state = 'skipped';
          m.reason = job.stop || 'not_collected';
        }
      buildViews(snapshot);
      const modules = Object.values(snapshot.sections),
        notApplicable = modules.filter((x) => x.state === 'not_applicable').length;
      snapshot.summary = {
        characters: snapshot.views.characters.length,
        detailedCharacters: snapshot.views.characters.filter((x) => x.detail).length,
        equippedWeapons: snapshot.views.equippedWeapons.length,
        equippedArtifacts: snapshot.views.equippedArtifacts.length,
        modulesSucceeded: modules.filter((x) => x.state === 'ok').length,
        modulesApplicable: modules.length - notApplicable,
        modulesNotApplicable: notApplicable,
        modulesTotal: modules.length,
        requests: job.requests,
      };
      snapshot.state =
        job.stop ||
        (modules.some((x) => !['ok', 'not_applicable'].includes(x.state)) ? 'partial' : 'complete');
      snapshot.finishedAt = now();
      job.activeModule = null;
    }
    return snapshot;
  })();
  return collectionStatus(c);
}
export function buildViews(snapshot) {
  const list = snapshot.sections.characters.data?.list ?? [];
  const details = new Map();
  for (const b of snapshot.sections.character_details.data?.batches ?? [])
    for (const d of b.data.list ?? []) details.set(d.base?.id ?? d.id, d);
  const views = { characters: [], equippedWeapons: [], equippedArtifacts: [] };
  for (const basic of list) {
    const detail = details.get(basic.id),
      base = detail?.base ?? basic;
    views.characters.push({ id: basic.id, basic, ...(detail ? { detail } : {}) });
    const weapon = detail?.weapon ?? base.weapon ?? basic.weapon;
    if (weapon?.id)
      views.equippedWeapons.push({
        characterId: basic.id,
        characterName: base.name ?? basic.name,
        ...weapon,
      });
    for (const artifact of detail?.relics ?? basic.reliquaries ?? [])
      views.equippedArtifacts.push({
        characterId: basic.id,
        characterName: base.name ?? basic.name,
        ...artifact,
      });
  }
  snapshot.views = stripCredentials(views);
  return snapshot.views;
}
