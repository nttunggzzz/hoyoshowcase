export const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(value);
export const formatValue = (v) => {
  const s = String(v ?? '');
  return /^-?\d+(\.\d+)?%?$/.test(s)
    ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(parseFloat(s)) +
        (s.endsWith('%') ? '%' : '')
    : s;
};

const STANDARD_5_SET = new Set([
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
 * Phân tích và trích xuất dữ liệu Pity từ file JSON bất kỳ (gacha log, bot webui, paimon.moe, hay config)
 */
export function parsePityData(raw) {
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== 'object') return null;

  // Trường hợp 1: Có sẵn các trường số charPity hoặc weaponPity (JSON config)
  if (typeof data.charPity === 'number' || typeof data.weaponPity === 'number') {
    return {
      charPity: Math.max(0, Math.min(90, Number(data.charPity || 0))),
      charGuaranteed: Boolean(data.charGuaranteed),
      weaponPity: Math.max(0, Math.min(80, Number(data.weaponPity || 0))),
      rollsLeft: data.rollsLeft != null ? Number(data.rollsLeft) : undefined,
      monthCard: data.monthCard != null ? Number(data.monthCard) : undefined,
      lastChar5: data.lastChar5 || null,
      lastWeapon5: data.lastWeapon5 || null,
      totalWishes: data.totalWishes || 0,
      sourceType: 'config',
    };
  }

  // Trường hợp 2: Gacha records (dạng mảng hoặc data.list hoặc paimon.moe)
  let records = null;
  if (Array.isArray(data)) {
    records = data;
  } else if (Array.isArray(data.list)) {
    records = data.list;
  } else if (data['301'] || data['302'] || data.character || data.weapon) {
    records = [
      ...(Array.isArray(data['301']) ? data['301'] : []),
      ...(Array.isArray(data['302']) ? data['302'] : []),
      ...(Array.isArray(data.character) ? data.character : []),
      ...(Array.isArray(data.weapon) ? data.weapon : []),
    ];
  }

  if (records && records.length) {
    // Sắp xếp tăng dần theo id (nếu có id, BigInt) hoặc theo time
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
          charGuaranteed = STANDARD_5_SET.has(rec.name);
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
      charPity: Math.min(90, charPity),
      charGuaranteed,
      lastChar5,
      lastChar5Time,
      weaponPity: Math.min(80, weaponPity),
      lastWeapon5,
      lastWeapon5Time,
      totalWishes: sorted.length,
      rollsLeft: data.rollsLeft != null ? Number(data.rollsLeft) : undefined,
      monthCard: data.monthCard != null ? Number(data.monthCard) : undefined,
      sourceType: 'gacha_log',
    };
  }

  return null;
}
