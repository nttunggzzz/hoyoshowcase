import fs from 'node:fs/promises';
import path from 'node:path';
import { cookieHeader, ACCOUNT_KEYS } from './hoyolab/cookies.mjs';
import { fetchAuthkey } from './hoyolab/client.mjs';

export const STANDARD_5_GENSHIN = new Set([
  'Diluc',
  'Jean',
  'Mona',
  'Qiqi',
  'Keqing',
  'Tighnari',
  'Dehya',
  'Yumemizuki Mizuki',
]);

export const STANDARD_5_HSR = new Set([
  'Himeko',
  'Welt',
  'Bronya',
  'Gepard',
  'Clara',
  'Yanqing',
  'Bailu',
]);

export const STANDARD_5 = STANDARD_5_GENSHIN;

const HSR_ROUTES = Object.freeze({
  hsr_wishes: 'https://public-operation-hkrpg.hoyoverse.com/common/gacha_record/api/getGachaLog',
});

function decodeKey(k) {
  try {
    return /%[a-f0-9]{2}/i.test(k) ? decodeURIComponent(k) : k;
  } catch {
    return k;
  }
}

/**
 * Tính toán Pity và thông số Wish từ danh sách gacha records hoặc cấu hình
 */
export function computePityFromRecords(records, game = 'genshin') {
  if (!Array.isArray(records)) return null;

  // Sắp xếp tăng dần theo id (cũ -> mới). Nếu id là chuỗi số dài, dùng BigInt
  const sorted = [...records].sort((a, b) => {
    try {
      if (a.id && b.id) {
        const ai = BigInt(a.id);
        const bi = BigInt(b.id);
        return ai < bi ? -1 : ai > bi ? 1 : 0;
      }
    } catch {}
    if (a.time && b.time) return a.time.localeCompare(b.time);
    return 0;
  });

  let charPity = 0;
  let lastChar5 = null;
  let lastChar5Time = null;
  let charGuaranteed = false;

  let weaponPity = 0;
  let lastWeapon5 = null;
  let lastWeapon5Time = null;

  for (const rec of sorted) {
    const bucket = Number(rec.bucket || rec.gacha_type);
    const rank = String(rec.rank_type);

    // Genshin: 301 hoặc 400; HSR: 11
    if (bucket === 301 || bucket === 400 || bucket === 11) {
      charPity++;
      if (rank === '5') {
        lastChar5 = rec.name;
        lastChar5Time = rec.time;
        if (bucket === 11 || game === 'hsr') {
          // Nếu nhân vật 5 sao thuộc STANDARD_5_HSR -> thua 50/50 -> bảo hiểm lượt sau
          charGuaranteed = STANDARD_5_HSR.has(rec.name);
        } else {
          // Nếu nhân vật 5 sao thuộc STANDARD_5_GENSHIN -> thua 50/50 -> bảo hiểm lượt sau
          charGuaranteed = STANDARD_5_GENSHIN.has(rec.name);
        }
        charPity = 0;
      }
    } else if (bucket === 302 || bucket === 12) {
      // Genshin: 302; HSR: 12 (Nón Ánh Sáng)
      weaponPity++;
      if (rank === '5') {
        lastWeapon5 = rec.name;
        lastWeapon5Time = rec.time;
        weaponPity = 0;
      }
    }
  }

  return {
    charPity,
    lastChar5,
    lastChar5Time,
    charGuaranteed,
    weaponPity,
    lastWeapon5,
    lastWeapon5Time,
    totalWishes: sorted.length,
  };
}

/**
 * Kéo pity trực tiếp qua API session (dừng khi gặp 5 sao gần nhất, có cache theo UID)
 */
export async function fetchLivePity(c, uid, game = 'genshin') {
  if (!c || !uid) return null;
  if (c.pityCache?.[uid]) {
    return c.pityCache[uid];
  }

  const role = c.roles?.find((r) => r.uid === uid) || (c.selected?.uid === uid ? c.selected : null);
  if (!role) return null;

  const hasAuth = c.cookies && (c.cookies.cookie_token_v2 || c.cookies.cookie_token);
  if (!hasAuth) return null;

  const isHsr = game === 'hsr' || role.game === 'hsr' || (role.gameBiz && role.gameBiz.startsWith('hkrpg'));
  const records = [];

  try {
    if (isHsr) {
      const d = await c.transport.data('authkey', {
        method: 'POST',
        headers: { Cookie: cookieHeader(c.cookies, ACCOUNT_KEYS) },
        body: {
          game_uid: role.uid,
          region: role.server,
          game_biz: 'hkrpg_global',
          auth_appid: 'webview_gacha',
        },
      });
      if (!d?.authkey) throw new Error('HSR authkey response missing authkey');
      const hsrAuthkey = decodeKey(d.authkey);

      c.transport.routes = { ...c.transport.routes, ...HSR_ROUTES };

      // 1. Banner nhân vật (11)
      let endId = '0';
      for (let page = 0; page < 6; page++) {
        const res = await c.transport.data('hsr_wishes', {
          params: {
            authkey_ver: 1,
            authkey: hsrAuthkey,
            lang: 'en',
            game_biz: 'hkrpg_global',
            gacha_type: '11',
            size: 20,
            end_id: endId,
          },
          retryRead: true,
        });
        const list = res?.list || [];
        if (!list.length) break;
        records.push(...list);
        const has5Star = list.some((x) => String(x.rank_type) === '5');
        if (has5Star || list.length < 20) break;
        endId = list.at(-1)?.id || '0';
      }

      // 2. Banner nón ánh sáng (12)
      endId = '0';
      for (let page = 0; page < 6; page++) {
        const res = await c.transport.data('hsr_wishes', {
          params: {
            authkey_ver: 1,
            authkey: hsrAuthkey,
            lang: 'en',
            game_biz: 'hkrpg_global',
            gacha_type: '12',
            size: 20,
            end_id: endId,
          },
          retryRead: true,
        });
        const list = res?.list || [];
        if (!list.length) break;
        records.push(...list);
        const has5Star = list.some((x) => String(x.rank_type) === '5');
        if (has5Star || list.length < 20) break;
        endId = list.at(-1)?.id || '0';
      }
    } else {
      // Genshin
      if (!c.authkey) {
        await fetchAuthkey(c);
      }
      if (!c.authkey) throw new Error('Genshin authkey creation failed');

      // 1. Banner nhân vật (301)
      let endId = '0';
      for (let page = 0; page < 6; page++) {
        const res = await c.transport.data('wishes', {
          params: {
            authkey_ver: 1,
            authkey: c.authkey,
            lang: 'en',
            game_biz: 'hk4e_global',
            gacha_type: '301',
            real_gacha_type: '301',
            size: 20,
            end_id: endId,
          },
          retryRead: true,
        });
        const list = res?.list || [];
        if (!list.length) break;
        records.push(...list);
        const has5Star = list.some((x) => String(x.rank_type) === '5');
        if (has5Star || list.length < 20) break;
        endId = list.at(-1)?.id || '0';
      }

      // 2. Banner vũ khí (302)
      endId = '0';
      for (let page = 0; page < 6; page++) {
        const res = await c.transport.data('wishes', {
          params: {
            authkey_ver: 1,
            authkey: c.authkey,
            lang: 'en',
            game_biz: 'hk4e_global',
            gacha_type: '302',
            real_gacha_type: '302',
            size: 20,
            end_id: endId,
          },
          retryRead: true,
        });
        const list = res?.list || [];
        if (!list.length) break;
        records.push(...list);
        const has5Star = list.some((x) => String(x.rank_type) === '5');
        if (has5Star || list.length < 20) break;
        endId = list.at(-1)?.id || '0';
      }
    }

    const computed = computePityFromRecords(records, isHsr ? 'hsr' : 'genshin');
    if (!computed) return null;

    c.pityCache ??= {};
    c.pityCache[uid] = computed;
    return computed;
  } catch (err) {
    console.warn(`[Pity API] Lỗi lấy live pity cho UID ${uid} (${game}):`, err.message);
    return null;
  }
}

/**
 * Tìm và đọc file JSON wish của UID trên máy chủ
 */
export async function getPityDataForUid(uid) {
  if (!uid || typeof uid !== 'string') {
    return { ok: true, found: false, message: 'UID không hợp lệ.' };
  }

  // Danh sách đường dẫn khả dĩ
  const candidatePaths = [
    // Bot gacard webui cùng workspace
    path.resolve(process.cwd(), '../genshin-edit-bot-webui/data/acc-card/wish', `${uid}.json`),
    'D:\\Workstation\\genshin-edit-bot-webui\\data\\acc-card\\wish\\' + `${uid}.json`,
    // hoyoshowcase local data
    path.resolve(process.cwd(), 'data/acc-card/wish', `${uid}.json`),
    path.resolve(process.cwd(), 'data/wish', `${uid}.json`),
    path.resolve(process.cwd(), 'data/pity', `${uid}.json`),
  ];

  for (const filePath of candidatePaths) {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(raw);

      // Nếu là gacha log
      const records = data.list || (Array.isArray(data) ? data : null);
      if (records) {
        const computed = computePityFromRecords(records);
        if (computed) {
          return {
            ok: true,
            found: true,
            uid,
            ...computed,
            rollsLeft: data.rollsLeft ?? null,
            monthCard: data.monthCard ?? null,
            source: path.basename(filePath),
          };
        }
      }

      // Nếu là config dạng pity đơn giản
      if (typeof data.charPity === 'number' || typeof data.weaponPity === 'number') {
        return {
          ok: true,
          found: true,
          uid,
          charPity: Number(data.charPity || 0),
          charGuaranteed: Boolean(data.charGuaranteed),
          weaponPity: Number(data.weaponPity || 0),
          rollsLeft: data.rollsLeft ?? null,
          monthCard: data.monthCard ?? null,
          lastChar5: data.lastChar5 ?? null,
          lastWeapon5: data.lastWeapon5 ?? null,
          totalWishes: data.totalWishes ?? 0,
          source: path.basename(filePath),
        };
      }
    } catch {
      // Bỏ qua nếu không tìm thấy file hoặc parse lỗi
    }
  }

  return {
    ok: true,
    found: false,
    uid,
    message: `Chưa tìm thấy file JSON wish cho UID ${uid}. Bạn có thể bấm [Nạp file JSON từ máy].`,
  };
}

/**
 * Lấy pity tổng hợp: ưu tiên live API -> file disk -> mặc định
 */
export async function getPityData(c, uid, game = 'genshin') {
  if (!uid || typeof uid !== 'string') {
    return { ok: true, found: false, message: 'UID không hợp lệ.' };
  }

  // 1. Thử lấy live pity từ session API nếu có session
  if (c) {
    try {
      const live = await fetchLivePity(c, uid, game);
      if (live) {
        return {
          ok: true,
          found: true,
          uid,
          ...live,
          rollsLeft: null,
          monthCard: null,
          source: 'api',
        };
      }
    } catch (e) {
      console.warn('[Pity API] Fallback về file disk do live pity lỗi:', e.message);
    }
  }

  // 2. Fallback về file disk (/api/pity/:uid cũ)
  return await getPityDataForUid(uid);
}
