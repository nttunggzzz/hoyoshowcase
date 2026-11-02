export const PROPERTY_LABELS = {
  2000: 'HP tối đa',
  2001: 'Tấn công',
  2002: 'Phòng ngự',
  20: 'Tỷ lệ bạo kích',
  22: 'ST bạo kích',
  23: 'Hiệu quả nạp',
  28: 'Tinh thông nguyên tố',
  26: 'Tăng trị liệu',
  27: 'Trị liệu nhận vào',
  999999: 'Thể lực tối đa',
  30: 'Tăng ST vật lý',
  29: 'Kháng vật lý',
  40: 'Tăng ST Hỏa',
  41: 'Tăng ST Lôi',
  42: 'Tăng ST Thủy',
  43: 'Tăng ST Thảo',
  44: 'Tăng ST Phong',
  45: 'Tăng ST Nham',
  46: 'Tăng ST Băng',
  50: 'Kháng Hỏa',
  51: 'Kháng Lôi',
  52: 'Kháng Thủy',
  53: 'Kháng Thảo',
  54: 'Kháng Phong',
  55: 'Kháng Nham',
  56: 'Kháng Băng',
  80: 'Giảm hồi chiêu',
  81: 'Hiệu quả khiên',
  1: 'HP cơ bản',
  2: 'HP cộng thêm',
  3: 'HP %',
  4: 'Tấn công cơ bản',
  5: 'Tấn công cộng thêm',
  6: 'Tấn công %',
  7: 'Phòng ngự cơ bản',
  8: 'Phòng ngự cộng thêm',
  9: 'Phòng ngự %',
};
export const DEFAULT_STATS = [2000, 2001, 2002, 20, 22, 23, 28];
export const DEFAULT_CONFIG = Object.freeze({
  account: true,
  characters: true,
  weapons: true,
  charCount: true,
  weaponCount: true,
  charCols: 8,
  weaponCols: 12,
  charRows: 0,
  weaponRows: 0,
  charLimit: 0,
  weaponLimit: 0,
  charRarity: 'all',
  weaponRarity: 'all',
  charSort: 'prestige',
  weaponSort: 'rarity',
  name: true,
  uid: true,
  ar: true,
  server: false,
  avatar: true,
  updated: false,
  levels: true,
  constellations: true,
  refinements: true,
  elements: true,
  weaponOwner: true,
  stars: true,
  premium: true,
  c6: true,
  c6Size: 'large',
  background: '2',
  maps: false,
  facts: [],
  builds: false,
  buildIds: [],
  statIds: DEFAULT_STATS,
  buildWeapon: true,
  buildRelics: true,
  buildSubstats: true,
  buildSkills: true,
  buildConstellations: true,
  buildFetter: false,
  width: 1600,
});
const boolKeys = Object.keys(DEFAULT_CONFIG).filter((k) => typeof DEFAULT_CONFIG[k] === 'boolean');
const enumValues = {
  charRarity: ['all', 'five', 'four'],
  weaponRarity: ['all', 'five', 'four', 'three'],
  charSort: ['prestige', 'rarity', 'level', 'name', 'constellation'],
  weaponSort: ['rarity', 'level', 'name', 'refinement'],
  c6Size: ['normal', 'large'],
};
const limits = {
  charCols: [1, 12],
  weaponCols: [1, 16],
  charRows: [0, 100],
  weaponRows: [0, 100],
  charLimit: [0, 500],
  weaponLimit: [0, 500],
};
export const stars = (c) =>
  Number(c?.rarity) === 105 ? 5 : Math.min(5, Math.max(1, Number(c?.rarity) || 1));
export const vip = (c) => stars(c) === 5 && Number(c.actived_constellation_num) === 6;
export function properties(character) {
  return [
    ...new Map(
      [...(character.allProperties ?? []), ...(character.properties ?? [])].map((p) => [
        Number(p.property_type),
        p,
      ]),
    ).values(),
  ];
}
export function normalizeConfig(raw = {}, model) {
  const c = { ...DEFAULT_CONFIG, facts: [], statIds: [...DEFAULT_STATS], buildIds: [] };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};
  for (const key of boolKeys) if (typeof raw[key] === 'boolean') c[key] = raw[key];
  for (const [key, choices] of Object.entries(enumValues))
    if (choices.includes(raw[key])) c[key] = raw[key];
  for (const [key, [min, max]] of Object.entries(limits)) {
    const n = Number(raw[key]);
    if (Number.isFinite(n)) c[key] = Math.max(min, Math.min(max, Math.floor(n)));
  }
  if ([1200, 1600, 2400, 3200].includes(Number(raw.width))) c.width = Number(raw.width);
  const ids = new Set((model?.characters ?? []).map((x) => Number(x.id))),
    facts = new Set((model?.previewFacts ?? []).map((x) => x.id));
  c.facts = Array.isArray(raw.facts)
    ? [...new Set(raw.facts.filter((x) => typeof x === 'string' && facts.has(x)))]
    : [];
  c.buildIds = Array.isArray(raw.buildIds)
    ? [...new Set(raw.buildIds.map(Number).filter((x) => ids.has(x)))].slice(0, 6)
    : [];
  if (!Array.isArray(raw.buildIds) && model?.characters.length) {
    const sorted = sortCharacters(model.characters, 'prestige');
    c.buildIds = [sorted[0].id];
  }
  const available = new Set(
    (model?.characters ?? []).flatMap((x) => properties(x).map((p) => Number(p.property_type))),
  );
  c.statIds = Array.isArray(raw.statIds)
    ? [...new Set(raw.statIds.map(Number).filter((x) => available.has(x)))]
    : DEFAULT_STATS.filter((x) => available.has(x));
  const backgrounds = (model?.regions ?? []).filter((r) => r.background_image);
  const wanted = String(raw.background ?? '2');
  c.background = backgrounds.some((r) => String(r.id) === wanted)
    ? wanted
    : String(backgrounds[0]?.id ?? '');
  return c;
}
export function sortCharacters(input, order) {
  return [...input].sort((a, b) => {
    if (order === 'name') return a.name.localeCompare(b.name);
    if (order === 'level') return b.level - a.level || stars(b) - stars(a);
    if (order === 'constellation')
      return (
        (b.actived_constellation_num ?? 0) - (a.actived_constellation_num ?? 0) ||
        stars(b) - stars(a)
      );
    if (order === 'prestige' && vip(a) !== vip(b)) return Number(vip(b)) - Number(vip(a));
    return (
      stars(b) - stars(a) ||
      (order === 'prestige'
        ? (b.actived_constellation_num ?? 0) - (a.actived_constellation_num ?? 0)
        : 0) ||
      b.level - a.level ||
      a.name.localeCompare(b.name)
    );
  });
}
export function selectItems(model, c) {
  let characters = sortCharacters(model.characters, c.charSort).filter(
    (x) => c.charRarity === 'all' || stars(x) === (c.charRarity === 'five' ? 5 : 4),
  );
  let weapons = model.characters
    .filter((x) => x.weapon?.id)
    .filter(
      (x) =>
        c.weaponRarity === 'all' ||
        stars(x.weapon) === { five: 5, four: 4, three: 3 }[c.weaponRarity],
    );
  weapons.sort((a, b) =>
    c.weaponSort === 'name'
      ? a.weapon.name.localeCompare(b.weapon.name)
      : c.weaponSort === 'level'
        ? b.weapon.level - a.weapon.level || stars(b.weapon) - stars(a.weapon)
        : c.weaponSort === 'refinement'
          ? (b.weapon.affix_level ?? 1) - (a.weapon.affix_level ?? 1) ||
            stars(b.weapon) - stars(a.weapon)
          : stars(b.weapon) - stars(a.weapon) || b.weapon.level - a.weapon.level,
  );
  const cap = (list, limit, rows, cols) =>
    list.slice(0, Math.min(limit || Infinity, rows ? rows * cols : Infinity));
  return {
    characters: cap(characters, c.charLimit, c.charRows, c.charCols),
    weapons: cap(weapons, c.weaponLimit, c.weaponRows, c.weaponCols),
    allCharacters: model.characters.length,
    allWeapons: model.characters.filter((x) => x.weapon?.id).length,
  };
}
export function planPreview(model, c) {
  const selected = selectItems(model, c),
    facts = c.facts.map((id) => model.previewFacts?.find((f) => f.id === id)).filter(Boolean);
  const charOn = c.account && c.characters,
    weaponOn = c.account && c.weapons;
  const grid = (count, cols, width) => {
    const gap = 8,
      padding = 18,
      cellWidth = Math.min(160, (width - padding * 2 - gap * (cols - 1)) / cols),
      cellHeight = Math.round(cellWidth * 1.23),
      rows = Math.ceil(count / cols);
    return {
      cols,
      gap,
      cellWidth,
      cellHeight,
      rows,
      height: 68 + rows * cellHeight + Math.max(0, rows - 1) * gap,
      gridWidth: cols * cellWidth + (cols - 1) * gap,
    };
  };
  const both = charOn && weaponOn,
    charWidth = both ? 552 : 1560,
    weaponWidth = both ? 988 : 1560;
  const identity = c.name || c.uid || c.ar || c.server || c.avatar || c.updated;
  const factRows = Math.ceil(facts.length / (both ? 3 : 5));
  const bannerHeight = Math.max(identity ? 185 : 80, 90 + factRows * 77);
  const charGrid = grid(selected.characters.length, c.charCols, charWidth),
    weaponGrid = grid(selected.weapons.length, c.weaponCols, weaponWidth);
  const charPanel = { x: 20, y: both ? 110 : bannerHeight + 38, width: charWidth },
    weaponPanel = { x: both ? 592 : 20, y: bannerHeight + 38, width: weaponWidth };
  const boardHeight = c.account
    ? Math.max(
        20 + bannerHeight,
        charOn ? charPanel.y + charGrid.height : 0,
        weaponOn ? weaponPanel.y + weaponGrid.height : 0,
      ) + 24
    : 0;
  const buildCharacters = c.builds
    ? c.buildIds.map((id) => model.characters.find((x) => x.id === id)).filter(Boolean)
    : [];
  const buildHeights = buildCharacters.map((x) => {
    const n = properties(x).filter((p) => c.statIds.includes(Number(p.property_type))).length;
    return (
      Math.max(520, 260 + Math.ceil(n / 2) * 50) +
      (c.buildRelics ? (c.buildSubstats ? 300 : 215) : 0) +
      (c.buildSkills ? 95 : 0) +
      28
    );
  });
  const mapCount = c.maps
      ? model.worldDisplay?.length || model.regions.filter((x) => !x.parent_id).length
      : 0,
    mapHeight = mapCount ? 100 + Math.ceil(mapCount / 3) * 200 : 0;
  const height = Math.ceil(mapHeight + boardHeight + buildHeights.reduce((a, b) => a + b, 0));
  const scale = c.width / 1600;
  const error =
    c.builds && !buildCharacters.length
      ? 'Chọn ít nhất một nhân vật để kèm build.'
      : height === 0
        ? 'Chọn ít nhất một phần: tổng quan, khám phá hoặc build.'
        : height * scale > 16000 || c.width * height * scale > 32000000
          ? 'Ảnh quá lớn. Giảm số hàng/nhân vật hoặc chọn độ phân giải thấp hơn.'
          : null;
  return {
    ...selected,
    facts,
    both,
    charGrid,
    weaponGrid,
    bannerHeight,
    boardHeight,
    mapHeight,
    buildCharacters,
    buildHeights,
    height,
    width: 1600,
    outputWidth: c.width,
    outputHeight: Math.ceil(height * scale),
    scale,
    error,
    charPanel,
    weaponPanel,
    banner: { x: both ? 592 : 20, y: 20, width: both ? 988 : 1560 },
  };
}
