// Synthetic data for tests and UI verification. This never calls HoYoLAB.
import { Transport, newContext } from '../../src/server/hoyolab/client.mjs';
export const DEMO_ROLE = {
  uid: '800000001',
  server: 'os_asia',
  nickname: 'Dữ liệu kiểm thử',
  level: 55,
};
const result = (data, retcode = 0, status = 200, headers = {}) =>
  new Response(JSON.stringify({ retcode, message: 'fixture response', data }), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
export function makeFixture({ characters = 27, override } = {}) {
  const calls = [];
  const list = Array.from({ length: characters }, (_, i) => ({
    id: 10000001 + i,
    name: `Nhân vật mẫu ${i + 1}`,
    level: 80,
    rarity: 5,
    element: 'Pyro',
    actived_constellation_num: i % 7,
    weapon: { id: 11501, name: 'Vũ khí mẫu', level: 90, affix_level: 1 },
    reliquaries: [],
  }));
  const fetcher = async (url, options) => {
    const u = new URL(url),
      payload = options.body ? JSON.parse(options.body) : Object.fromEntries(u.searchParams),
      path = u.pathname.split('/genshin/api/')[1];
    const call = {
      url: String(url),
      method: options.method,
      payload,
      signal: options.signal,
      path,
    };
    calls.push(call);
    if (override) {
      const r = await override(call, calls);
      if (r !== undefined) return r;
    }
    if (u.pathname.endsWith('/webLoginByPassword')) {
      const r = result({});
      for (const [key, value] of Object.entries({
        ltoken_v2: 'FIXTURE-LTOKEN-SECRET',
        ltuid_v2: '42',
        ltmid_v2: 'FIXTURE-MID',
        cookie_token_v2: 'FIXTURE-COOKIE-SECRET',
        account_id_v2: '42',
        account_mid_v2: 'FIXTURE-MID',
      }))
        r.headers.append('Set-Cookie', `${key}=${value}; Path=/; Secure; HttpOnly`);
      return r;
    }
    if (u.pathname.endsWith('/appLoginByPassword'))
      return result({
        token: { token: 'FIXTURE-LOGIN-SECRET', token_type: 1 },
        user_info: { aid: '42', mid: 'FIXTURE-MID' },
      });
    if (u.pathname.endsWith('/getBySToken'))
      return result({
        tokens: [
          { token_type: 2, token: 'FIXTURE-LTOKEN-SECRET' },
          { token_type: 4, token: 'FIXTURE-COOKIE-SECRET' },
        ],
      });
    if (u.pathname.includes('getUserGameRoles'))
      return result({
        list: [
          {
            game_uid: DEMO_ROLE.uid,
            region: DEMO_ROLE.server,
            nickname: DEMO_ROLE.nickname,
            level: 55,
            game_biz: 'hk4e_global',
          },
        ],
      });
    if (path === 'index')
      return result({
        stats: { avatar_number: characters, achievement_number: 123 },
        world_explorations: [{ name: 'Vùng kiểm thử', exploration_percentage: 500 }],
        homes: [{ level: 10 }],
        future_field: { preserve: true },
        fixture: true,
      });
    if (path === 'roleBasicInfo') return result({ role: { ...DEMO_ROLE } });
    if (path === 'character/list') return result({ list });
    if (path === 'character/detail')
      return result({
        list: payload.character_ids.map((id) => ({
          base: list.find((c) => c.id === id),
          weapon: {
            id: 11501,
            name: 'Vũ khí mẫu',
            level: 90,
            affix_level: 2,
            future_stat: { value: 123 },
          },
          relics: Array.from({ length: 5 }, (_, n) => ({
            id: 150010 + n,
            name: `Thánh di vật ${n + 1}`,
            pos: n + 1,
            level: 20,
          })),
          skills: [{ skill_id: 1, level: 8 }],
          selected_properties: [{ property_type: 1, final: '123' }],
        })),
        property_map: { 1: { name: 'HP' } },
        unknown_metadata: { keep: true },
      });
    if (path === 'gcg/cardList') {
      const offset = Number(payload.offset);
      return result({
        card_list:
          offset === 0
            ? [{ id: 1, card_type: 1, name: 'Thẻ mẫu A' }]
            : [{ id: 2, card_type: 2, name: 'Thẻ mẫu B' }],
        is_last: offset !== 0,
        next_offset: offset === 0 ? 32 : 64,
      });
    }
    if (path === 'gcg/challenge/schedule') return result({ schedule_list: [{ id: 1 }, { id: 2 }] });
    if (path === 'gcg/challenge/record')
      return result({ basic: { schedule_id: payload.schedule_id }, deck_list: [{ id: 7 }] });
    if (path === 'gcg/challenge/deck') return result({ deck: { id: payload.deck_id, cards: [] } });
    if (path === 'gcg/deckList')
      return result({ deck_list: [{ id: 8, avatar_cards: [{ id: 1 }], action_cards: [] }] });
    if (path === 'gcg/cardBackList') return result({ card_back_list: [{ id: 1 }] });
    if (path === 'gcg/matchList') return result({ recent_matches: [], favourite_matches: [] });
    return result({ is_unlock: true, list: [], data: [], fixture: true });
  };
  const transport = new Transport(fetcher, { spacing: 0 }),
    ctx = newContext(transport);
  ctx.source = 'fixture';
  ctx.transport.source = 'fixture';
  ctx.cookies = { ltoken_v2: 'FIXTURE-LTOKEN-SECRET', ltuid_v2: '42', ltmid_v2: 'FIXTURE-MID' };
  ctx.roles = [DEMO_ROLE];
  ctx.selected = { uid: DEMO_ROLE.uid, server: DEMO_ROLE.server };
  return { ctx, transport, fetcher, calls, list, result };
}
