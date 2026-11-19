import { randomUUID } from 'node:crypto';
import { demand, labHeaders, ApiError, uidServer } from '../hoyolab/client.mjs';
import { stripCredentials } from './collector.mjs';

const HSR_BASE = 'https://sg-act-public-api.hoyolab.com/event/game_record/hkrpg/api/';

export const HSR_SOURCE = Object.freeze({
  url: 'https://act.hoyolab.com/app/community-game-records-sea/rpg/index.html',
  collectorVersion: '0.7.0',
  game: 'hsr',
  gameBiz: 'hkrpg_global',
});

export const HSR_CAPABILITIES = Object.freeze([
  {
    id: 'overview',
    label: 'Tổng quan tài khoản Khai Phá',
    path: 'index',
    method: 'GET',
    params: {},
  },
  {
    id: 'characters',
    label: 'Toàn bộ nhân vật, Nón Ánh Sáng và Di Vật',
    path: 'avatar/info',
    method: 'GET',
    params: { need_wiki: 'true' },
  },
  {
    id: 'challenge_moc',
    label: 'Sảnh Đường Lãng Quên (Memory of Chaos)',
    path: 'challenge',
    method: 'GET',
    params: { schedule_type: 1 },
  },
  {
    id: 'rogue',
    label: 'Vũ Trụ Mô Phỏng (Simulated Universe)',
    path: 'rogue',
    method: 'GET',
    params: { schedule_type: 1 },
  },
]);

export const HSR_ROUTES = Object.freeze({
  'hsr/index': HSR_BASE + 'index',
  'hsr/avatar/info': HSR_BASE + 'avatar/info',
  'hsr/challenge': HSR_BASE + 'challenge',
  'hsr/rogue': HSR_BASE + 'rogue',
});

const FATAL = new Map([
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

function assertHsrOwner(c, role) {
  demand(
    c.selected?.uid === role.uid && c.selected.server === role.server,
    'Tài khoản được chọn đã thay đổi.',
  );
  demand(
    c.roles.some((r) => r.uid === role.uid && r.server === role.server),
    'Role không thuộc danh sách tài khoản đã xác thực.',
  );
  demand(
    uidServer(role.uid, 'hkrpg_global') === role.server ||
      (role.server === 'prod_official_eur' &&
        uidServer(role.uid, 'hkrpg_global') === 'prod_official_euro'),
    'UID/server HSR không hợp lệ.',
  );
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

export function hsrCollectionStatus(c) {
  const j = c.hsrCollection;
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
    hasSnapshot: true,
  };
}

export function cancelHsrCollection(c) {
  demand(c.hsrCollection, 'Chưa có lượt thu thập HSR.');
  c.hsrCollection.stop = 'cancelled';
  c.hsrCollection.controller.abort();
  return hsrCollectionStatus(c);
}

export function exportHsrCollection(c) {
  demand(c.hsrCollection, 'Chưa có dữ liệu HSR để xuất.');
  return stripCredentials(c.hsrCollection.snapshot);
}

export function startHsrCollection(
  c,
  { maxRequests = 100, intervalMs = Math.min(120, c.transport.spacing) } = {},
) {
  demand(
    !c.hsrCollection || c.hsrCollection.snapshot.state !== 'running',
    'Lượt thu thập HSR trước đang chạy.',
  );
  demand(c.selected, 'Hãy chọn UID/server HSR trước.');
  const role = { ...c.selected };
  assertHsrOwner(c, role);
  demand(
    c.cookies.ltoken_v2 || c.cookies.ltoken || c.cookies.cookie_token_v2,
    'Cần đăng nhập HoYoLAB hoặc cookie hợp lệ.',
  );

  c.transport.routes = { ...c.transport.routes, ...HSR_ROUTES };
  const snapshot = {
    schema: 'hsr-battle-chronicle-v1',
    id: randomUUID(),
    source: HSR_SOURCE,
    role: { ...role, game: 'hsr', gameBiz: 'hkrpg_global' },
    startedAt: new Date().toISOString(),
    finishedAt: null,
    state: 'running',
    stopReason: null,
    sections: Object.fromEntries(HSR_CAPABILITIES.map((cap) => [cap.id, entry(cap)])),
    summary: {
      modulesQueued: HSR_CAPABILITIES.length,
      modulesDone: 0,
      modulesFailed: 0,
    },
  };

  const controller = new AbortController();
  const job = {
    snapshot,
    controller,
    role,
    requests: 0,
    activeModule: null,
    stop: null,
    promise: null,
  };
  c.hsrCollection = job;

  const run = async () => {
    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const call = async (routeKey, params = {}) => {
      if (job.requests >= maxRequests) throw new ApiError('hsr_budget', 429, -3006);
      job.requests++;
      await pause(intervalMs);
      return c.transport.data(routeKey, {
        headers: labHeaders(c.cookies),
        params: { role_id: role.uid, server: role.server, ...params },
        signal: controller.signal,
        retryRead: true,
      });
    };

    for (const spec of HSR_CAPABILITIES) {
      if (job.stop) break;
      const target = snapshot.sections[spec.id];
      job.activeModule = spec.id;
      target.state = 'running';
      try {
        const routeKey = `hsr/${spec.path}`;
        const data = await call(routeKey, spec.params);
        target.data = data;
        target.state = 'done';
        target.requestCount++;
        snapshot.summary.modulesDone++;
      } catch (err) {
        if (job.stop === 'cancelled' || controller.signal.aborted) {
          target.state = 'cancelled';
          job.stop = 'cancelled';
          break;
        }
        target.state = 'failed';
        target.error = failure(err);
        snapshot.summary.modulesFailed++;
        const fatalKey = FATAL.get(err.retcode);
        if (fatalKey) {
          job.stop = fatalKey;
          break;
        }
      }
    }

    snapshot.state = job.stop ? (job.stop === 'cancelled' ? 'cancelled' : 'failed') : 'complete';
    snapshot.stopReason = job.stop;
    snapshot.finishedAt = new Date().toISOString();
    job.activeModule = null;
    return stripCredentials(snapshot);
  };

  job.promise = run();
  return job;
}
