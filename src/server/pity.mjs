import fs from 'node:fs/promises';
import path from 'node:path';

const STANDARD_5 = new Set([
  'Diluc',
  'Jean',
  'Mona',
  'Qiqi',
  'Keqing',
  'Tighnari',
  'Dehya',
  'Yumemizuki Mizuki',
]);

/**
 * Tính toán Pity và thông số Wish từ danh sách gacha records hoặc cấu hình
 */
export function computePityFromRecords(records) {
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

    // Banner nhân vật: 301 hoặc 400
    if (bucket === 301 || bucket === 400) {
      charPity++;
      if (rank === '5') {
        lastChar5 = rec.name;
        lastChar5Time = rec.time;
        // Nếu nhân vật 5 sao thuộc STANDARD_5 -> thua 50/50 -> lần sau chắc chắn trúng (Bảo hiểm)
        charGuaranteed = STANDARD_5.has(rec.name);
        charPity = 0;
      }
    } else if (bucket === 302) {
      // Banner vũ khí: 302
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
