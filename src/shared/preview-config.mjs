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
export const ART_BACKGROUNDS = [
  {
    id: 'art-columbina',
    name: 'Columbina (Hàn Sương Cổ Điển)',
    url: '/assets/backgrounds/columbina-319f3efd.jpg',
  },
  { id: 'art-flins', name: 'Flins (Thần Bí U Tối)', url: '/assets/backgrounds/flins-d6d28443.jpg' },
  { id: 'art-nefer', name: 'Nefer (Ảo Ảo Ma Mị)', url: '/assets/backgrounds/nefer-4e007746.jpg' },
  {
    id: 'art-zibai',
    name: 'Zibai (Vàng Son Rực Rỡ)',
    url: '/assets/backgrounds/zibai-40a00d1d.jpg',
  },
];
export const THEMES = Object.freeze({
  abyss: {
    id: 'abyss',
    name: 'Hoàng Gia Vực Sâu (Gold)',
    panelFill: '#122438ea',
    panelStroke: '#d9a74a',
    borderLine: '#2a415d',
    accent: '#f5d485',
    textLight: '#f1eee5',
    textMuted: '#bed0df',
    badgeBg: '#1b344ecd',
    badgeStroke: '#f1d58e',
    glow: 'rgba(217, 167, 74, 0.28)',
  },
  hydro: {
    id: 'hydro',
    name: 'Thủy Triều Fontaine (Hydro)',
    panelFill: '#0c2436f0',
    panelStroke: '#38bdf8',
    borderLine: '#1e506d',
    accent: '#67e8f9',
    textLight: '#f0f9ff',
    textMuted: '#93c5fd',
    badgeBg: '#13354ccd',
    badgeStroke: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.28)',
  },
  pyro: {
    id: 'pyro',
    name: 'Hỏa Diễm Natlan (Pyro)',
    panelFill: '#261214f0',
    panelStroke: '#f97316',
    borderLine: '#662424',
    accent: '#fbbf24',
    textLight: '#fff1f2',
    textMuted: '#fca5a5',
    badgeBg: '#441d20cd',
    badgeStroke: '#fb923c',
    glow: 'rgba(249, 115, 22, 0.28)',
  },
  cryo: {
    id: 'cryo',
    name: 'Hàn Băng Snezhnaya (Cryo)',
    panelFill: '#0f2233f0',
    panelStroke: '#7dd3fc',
    borderLine: '#2c4c68',
    accent: '#bae6fd',
    textLight: '#f8fafc',
    textMuted: '#cbd5e1',
    badgeBg: '#1b384ecd',
    badgeStroke: '#7dd3fc',
    glow: 'rgba(125, 211, 252, 0.28)',
  },
  electro: {
    id: 'electro',
    name: 'Lôi Điện Inazuma (Electro)',
    panelFill: '#1e1330f0',
    panelStroke: '#c084fc',
    borderLine: '#4a2c73',
    accent: '#f0abfc',
    textLight: '#faf5ff',
    textMuted: '#d8b4fe',
    badgeBg: '#351b54cd',
    badgeStroke: '#c084fc',
    glow: 'rgba(192, 132, 252, 0.28)',
  },
  dendro: {
    id: 'dendro',
    name: 'Thảo Mộc Sumeru (Dendro)',
    panelFill: '#0e241bf0',
    panelStroke: '#4ade80',
    borderLine: '#1b5336',
    accent: '#bef264',
    textLight: '#f0fdf4',
    textMuted: '#86efac',
    badgeBg: '#173c2ecd',
    badgeStroke: '#4ade80',
    glow: 'rgba(74, 222, 128, 0.28)',
  },
  geo: {
    id: 'geo',
    name: 'Nham Thạch Liyue (Geo)',
    panelFill: '#241c10f0',
    panelStroke: '#fbbf24',
    borderLine: '#684d1e',
    accent: '#fde047',
    textLight: '#fefce8',
    textMuted: '#fde68a',
    badgeBg: '#3d2e1acd',
    badgeStroke: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.28)',
  },
  oled: {
    id: 'oled',
    name: 'OLED Điện Ảnh (Dark Cinema)',
    panelFill: '#080c14f4',
    panelStroke: '#52525b',
    borderLine: '#27272a',
    accent: '#e4e4e7',
    textLight: '#fafafa',
    textMuted: '#a1a1aa',
    badgeBg: '#18181bcd',
    badgeStroke: '#71717a',
    glow: 'rgba(255, 255, 255, 0.15)',
  },
});
export const DEFAULT_CONFIG = Object.freeze({
  _v: 4,
  _customCols: false,
  account: true,
  characters: true,
  weapons: true,
  collectionHeader: false,
  charCount: true,
  weaponCount: true,
  charCols: 7,
  weaponCols: 14,
  charRows: 0,
  weaponRows: 0,
  charLimit: 0,
  weaponLimit: 0,
  charGridMode: 'balanced',
  weaponGridMode: 'balanced',
  charAlign: 'bottom',
  weaponAlign: 'bottom',
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
  background: 'art-columbina',
  bgBlur: 0,
  bgDim: 30,
  theme: 'abyss',
  frameStyle: 'modern',
  vignette: true,
  cornerAccents: true,
  artifactCv: true,
  crownBadge: true,
  signature: '',
  code: '#1000',
  watermark: '',
  wishBanner: true,
  wishPosition: 'above_weapon',
  charPity: 68,
  charGuaranteed: true,
  weaponPity: 12,
  rollsLeft: 154,
  monthCard: 28,
  mapStyle: 'classic',
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
  imageWidth: 1600,
  imageHeight: 0,
  sizePreset: 'auto',
});
const boolKeys = Object.keys(DEFAULT_CONFIG).filter((k) => typeof DEFAULT_CONFIG[k] === 'boolean');
const enumValues = {
  charRarity: ['all', 'five', 'four'],
  weaponRarity: ['all', 'five', 'four', 'three'],
  charSort: ['prestige', 'rarity', 'level', 'name', 'constellation'],
  weaponSort: ['rarity', 'level', 'name', 'refinement'],
  c6Size: ['normal', 'large'],
  mapStyle: ['square', 'compact', 'classic'],
  theme: ['abyss', 'hydro', 'pyro', 'cryo', 'electro', 'dendro', 'geo', 'oled'],
  frameStyle: ['modern', 'fantasy'],
  charGridMode: ['balanced', 'full'],
  weaponGridMode: ['balanced', 'full'],
  charAlign: ['bottom', 'top'],
  weaponAlign: ['bottom', 'top'],
  wishPosition: ['above_weapon', 'top_banner'],
  sizePreset: ['auto', '1980x2040', '1920x1080', '2560x1440', '1080x1920', '2048x2048', 'custom'],
};
const limits = {
  charCols: [1, 12],
  weaponCols: [1, 24],
  charRows: [0, 100],
  weaponRows: [0, 100],
  charLimit: [0, 500],
  weaponLimit: [0, 500],
  bgBlur: [0, 20],
  bgDim: [0, 90],
  charPity: [0, 90],
  weaponPity: [0, 80],
  rollsLeft: [0, 99999],
  monthCard: [0, 365],
  imageWidth: [800, 3840],
  imageHeight: [0, 5000],
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
  if (raw.mapStyle && ['square', 'compact', 'classic'].includes(raw.mapStyle)) {
    c.mapStyle = raw.mapStyle;
  } else if (raw._v === 4) {
    c.mapStyle = 'square';
  } else {
    c.mapStyle = 'classic';
  }
  for (const [key, [min, max]] of Object.entries(limits)) {
    const n = Number(raw[key]);
    if (Number.isFinite(n)) {
      if (raw._v !== 4 && key === 'charCols' && n === 8) {
        c[key] = 7;
      } else if (raw._v !== 4 && key === 'weaponCols' && n === 12) {
        c[key] = 14;
      } else {
        c[key] = Math.max(min, Math.min(max, Math.floor(n)));
      }
    }
  }
  if ([1200, 1600, 2400, 3200].includes(Number(raw.width))) c.width = Number(raw.width);
  if (raw.sizePreset === '1980x2040') {
    c.imageWidth = 1980;
    c.imageHeight = 2040;
    if (raw.charCols == null) c.charCols = 8;
    if (raw.weaponCols == null) c.weaponCols = 15;
  } else if (raw.sizePreset === '1920x1080') {
    c.imageWidth = 1920;
    c.imageHeight = 1080;
    if (raw.charCols == null) c.charCols = 9;
    if (raw.weaponCols == null) c.weaponCols = 16;
  } else if (raw.sizePreset === '2560x1440') {
    c.imageWidth = 2560;
    c.imageHeight = 1440;
    if (raw.charCols == null) c.charCols = 8;
    if (raw.weaponCols == null) c.weaponCols = 14;
  } else if (raw.sizePreset === '1080x1920') {
    c.imageWidth = 1080;
    c.imageHeight = 1920;
    if (raw.charCols == null) c.charCols = 5;
    if (raw.weaponCols == null) c.weaponCols = 8;
  } else if (raw.sizePreset === '2048x2048') {
    c.imageWidth = 2048;
    c.imageHeight = 2048;
    if (raw.charCols == null) c.charCols = 8;
    if (raw.weaponCols == null) c.weaponCols = 16;
  } else if (raw.sizePreset === 'custom') {
    if (Number.isFinite(Number(raw.imageWidth)))
      c.imageWidth = Math.max(800, Math.min(3840, Math.floor(Number(raw.imageWidth))));
    if (Number.isFinite(Number(raw.imageHeight)))
      c.imageHeight = Math.max(0, Math.min(5000, Math.floor(Number(raw.imageHeight))));
    if (!raw._customCols) {
      if (c.imageWidth >= 1800 && c.charCols <= 6) {
        c.charCols = c.imageWidth >= 2400 ? 8 : 9;
        c.weaponCols = 16;
      } else if (c.imageWidth < 1400 && c.charCols > 6) {
        c.charCols = 5;
        c.weaponCols = 8;
      }
    }
  } else {
    c.sizePreset = 'auto';
    c.imageWidth = c.width;
    c.imageHeight = 0;
  }
  if (c.sizePreset !== 'auto') {
    c.width = c.imageWidth;
  }
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
  if (typeof raw.code === 'string') c.code = raw.code.slice(0, 20);
  if (typeof raw.watermark === 'string') c.watermark = raw.watermark.slice(0, 50);
  if (typeof raw.signature === 'string') c.signature = raw.signature.slice(0, 50);
  const backgrounds = (model?.regions ?? []).filter((r) => r.background_image);
  const wanted = String(raw.background ?? DEFAULT_CONFIG.background);
  const isArt =
    ART_BACKGROUNDS.some((a) => a.id === wanted) ||
    wanted.startsWith('data:image/') ||
    wanted.startsWith('/assets/backgrounds/');
  c.background =
    isArt || backgrounds.some((r) => String(r.id) === wanted)
      ? wanted
      : String(backgrounds[0]?.id ?? 'art-columbina');
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
  const cap = (list, limit, rows, cols, mode) => {
    let maxItems = Math.min(limit || Infinity, rows ? rows * cols : Infinity);
    if (mode === 'balanced' && list.length >= cols) {
      const allowed = Math.min(list.length, maxItems);
      const rounded = Math.floor(allowed / cols) * cols;
      maxItems = rounded > 0 ? rounded : maxItems;
    }
    return list.slice(0, maxItems);
  };
  return {
    characters: cap(characters, c.charLimit, c.charRows, c.charCols, c.charGridMode),
    weapons: cap(weapons, c.weaponLimit, c.weaponRows, c.weaponCols, c.weaponGridMode),
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
  const isCustomSize = c.sizePreset && c.sizePreset !== 'auto';
  const both = charOn && weaponOn,
    baseW = isCustomSize && c.imageWidth > 0 ? c.imageWidth : 1600,
    availW = baseW - 40;
  let charRatio = 0.368;
  if (baseW >= 2400) {
    charRatio = 0.45;
  } else if (baseW >= 1800) {
    charRatio = 0.44;
  } else if (baseW <= 1200) {
    charRatio = 0.48;
  }
  const charWidth = both ? (baseW === 1600 ? 566 : Math.round((baseW - 60) * charRatio)) : availW,
    weaponWidth = both ? (baseW === 1600 ? 974 : baseW - 60 - charWidth) : availW,
    weaponX = both ? charWidth + 40 : 20;
  const identity =
    c.name || c.uid || c.ar || c.server || c.avatar || c.updated || c.code || c.wishBanner;
  const factRows = Math.ceil(facts.length / (both ? 3 : 5));
  const hasTopWish = c.wishBanner && (c.wishPosition === 'top_banner' || !both);
  let bannerHeight = Math.max(
    identity ? (hasTopWish ? 185 : facts.length ? 150 : 100) : 80,
    facts.length ? 90 + factRows * 77 : 0,
  );
  const mapCount = c.maps
    ? model.worldDisplay?.length || model.regions.filter((x) => !x.parent_id).length
    : 0;
  let mapSquare = null;
  let mapHeight = 0;
  const isSquareMap = c.maps && (c.mapStyle === 'square' || (both && c.mapStyle === 'compact'));
  let upperRightHeight = 0;
  if (isSquareMap) {
    if (both) {
      mapHeight = 0;
      const hasWish =
        c.wishBanner && (c.wishPosition === 'above_weapon' || c.wishPosition !== 'top_banner');
      if (weaponWidth >= 760) {
        const boxH = 135;
        const wishW = hasWish
          ? Math.min(420, Math.max(340, Math.round((weaponWidth - 14) * 0.4)))
          : 0;
        const mapW = hasWish ? weaponWidth - wishW - 14 : weaponWidth;
        const mapX = hasWish ? weaponX + wishW + 14 : weaponX;
        mapSquare = {
          x: mapX,
          y: 0,
          width: mapW,
          height: boxH,
          wishW,
          wishH: boxH,
          layout: 'side_by_side',
        };
        upperRightHeight = 147;
      } else {
        const wishH = hasWish ? 110 : 0;
        const mapH = 135;
        mapSquare = {
          x: weaponX,
          y: 0,
          width: weaponWidth,
          height: mapH,
          wishW: weaponWidth,
          wishH,
          layout: 'stacked',
        };
        upperRightHeight = (hasWish ? wishH + 12 : 0) + mapH + 12;
      }
    } else {
      const squareW = Math.min(600, availW);
      mapSquare = { x: Math.round((baseW - squareW) / 2), y: 20, width: squareW, height: 235 };
      mapHeight = 255;
    }
  } else if (c.maps) {
    const mapCols = baseW < 1200 ? 2 : 3;
    mapHeight =
      c.mapStyle === 'compact'
        ? 75 + Math.ceil(mapCount / mapCols) * 52
        : 100 + Math.ceil(mapCount / mapCols) * 200;
  }
  const charGrid = grid(selected.characters.length, c.charCols, charWidth),
    weaponGrid = grid(selected.weapons.length, c.weaponCols, weaponWidth);
  const minCharY = both ? (c.collectionHeader ? 110 : 20) : bannerHeight + 38;
  const hasWishAboveWeapon = c.wishBanner && c.wishPosition !== 'top_banner' && both;
  if (!upperRightHeight && hasWishAboveWeapon) {
    upperRightHeight = 147;
  }
  const minWeaponTop = bannerHeight + (upperRightHeight ? upperRightHeight + 20 : 38);
  const isCustomHeight = isCustomSize && c.imageHeight > 0;
  const rightBottom = minWeaponTop + (weaponOn ? weaponGrid.height : 0);
  const targetBottom = isCustomHeight
    ? c.imageHeight - 24
    : Math.max(minCharY + charGrid.height, rightBottom);
  const charPanelY =
    c.charAlign === 'bottom' ? Math.max(minCharY, targetBottom - charGrid.height) : minCharY;
  const charPanel = { x: 20, y: charPanelY, width: charWidth };
  const charBottom = charOn ? charPanel.y + charGrid.height : bannerHeight + 38;
  const weaponTopY =
    both && c.weaponAlign === 'bottom'
      ? Math.max(minWeaponTop, charBottom - weaponGrid.height)
      : minWeaponTop;
  const weaponPanel = { x: weaponX, y: weaponTopY, width: weaponWidth };
  if (mapSquare && both) {
    mapSquare.y = weaponTopY - mapSquare.height - 12;
  }
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
  const height = Math.ceil(mapHeight + boardHeight + buildHeights.reduce((a, b) => a + b, 0));
  const scale = isCustomSize ? 1 : c.width / 1600;
  const autoOutputHeight = Math.ceil(height * scale);
  const outputWidth = isCustomSize && c.imageWidth > 0 ? c.imageWidth : c.width;
  const outputHeight =
    isCustomSize && c.imageHeight > 0
      ? Math.max(c.imageHeight, autoOutputHeight)
      : autoOutputHeight;
  const error =
    c.builds && !buildCharacters.length
      ? 'Chọn ít nhất một nhân vật để kèm build.'
      : height === 0
        ? 'Chọn ít nhất một phần: tổng quan, khám phá hoặc build.'
        : height * scale > 16000 || outputWidth * outputHeight > 32000000
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
    mapSquare,
    buildCharacters,
    buildHeights,
    height,
    width: 1600,
    outputWidth,
    outputHeight,
    scale,
    baseW,
    error,
    charPanel,
    weaponPanel,
    banner: { x: both ? weaponX : 20, y: 20, width: both ? weaponWidth : availW },
  };
}
