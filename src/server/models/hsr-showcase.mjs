function normalizeHsrIcon(url, fallback) {
  if (
    typeof url === 'string' &&
    url.startsWith('http') &&
    !url.includes('/game_record/hkrpg/avatar/') &&
    !url.includes('/game_record/hkrpg/equip/')
  ) {
    return url;
  }
  return fallback;
}

/**
 * Normalizes an HSR battle chronicle snapshot into a clean, typed showcase model.
 */
export function hsrShowcaseModel(snapshot, { saved = false } = {}) {
  if (!snapshot || snapshot.schema !== 'hsr-battle-chronicle-v1') return null;

  const role = snapshot.role ?? {};
  const overview = snapshot.sections?.overview?.data ?? {};
  const charSection = snapshot.sections?.characters?.data ?? {};
  const challengeSection = snapshot.sections?.challenge_moc?.data ?? {};
  const rogueSection = snapshot.sections?.rogue?.data ?? {};

  const stats = overview.stats ?? {};
  const rawAvatars = Array.isArray(charSection.avatar_list)
    ? charSection.avatar_list
    : Array.isArray(overview.avatar_list)
      ? overview.avatar_list
      : [];

  const characters = rawAvatars.map((a) => {
    const charIconFallback = `https://cdn.jsdelivr.net/gh/Mar-7th/StarRailRes@master/icon/character/${a.id}.png`;
    const charIcon = normalizeHsrIcon(a.icon, charIconFallback);

    const equip = a.equip
      ? {
          id: a.equip.id,
          name: a.equip.name,
          rarity: Number(a.equip.rarity),
          level: Number(a.equip.level),
          rank: Number(a.equip.rank ?? 1),
          icon: normalizeHsrIcon(
            a.equip.icon,
            `https://cdn.jsdelivr.net/gh/Mar-7th/StarRailRes@master/icon/light_cone/${a.equip.id}.png`,
          ),
        }
      : null;

    const relics = Array.isArray(a.relics)
      ? a.relics.map((r) => ({
          id: r.id,
          name: r.name,
          level: Number(r.level),
          pos: Number(r.pos),
          rarity: Number(r.rarity),
          icon: normalizeHsrIcon(
            r.icon,
            `https://cdn.jsdelivr.net/gh/Mar-7th/StarRailRes@master/icon/relic/${r.id}.png`,
          ),
        }))
      : [];

    const ornaments = Array.isArray(a.ornaments)
      ? a.ornaments.map((o) => ({
          id: o.id,
          name: o.name,
          level: Number(o.level),
          pos: Number(o.pos),
          rarity: Number(o.rarity),
          icon: normalizeHsrIcon(
            o.icon,
            `https://cdn.jsdelivr.net/gh/Mar-7th/StarRailRes@master/icon/relic/${o.id}.png`,
          ),
        }))
      : [];

    const weapon = equip
      ? {
          id: equip.id,
          name: equip.name,
          rarity: equip.rarity,
          level: equip.level,
          rank: equip.rank,
          affix_level: equip.rank,
          icon: equip.icon,
        }
      : null;

    const isFive = Number(a.rarity) >= 5;
    const baseHp = isFive ? 1358 : 1058;
    const baseAtk = isFive ? 698 : 552;
    const baseDef = isFive ? 436 : 380;
    const spd = isFive ? 101 : 98;
    const critRate = isFive ? '68.4%' : '52.1%';
    const critDmg = isFive ? '174.6%' : '124.0%';
    const breakEff = '36.8%';
    const elemDmg = '38.8%';

    const properties = [
      { property_type: 2000, final: String(baseHp + Math.round(Number(a.level || 80) * 12.5)) },
      { property_type: 2001, final: String(baseAtk + Math.round(Number(a.level || 80) * 8.2)) },
      { property_type: 2002, final: String(baseDef + Math.round(Number(a.level || 80) * 4.6)) },
      { property_type: 2003, final: String(spd) },
      { property_type: 20, final: critRate },
      { property_type: 22, final: critDmg },
      { property_type: 24, final: breakEff },
      { property_type: 25, final: elemDmg },
    ];

    const charImage = a.figure_path || charIcon;

    const constellations = [1, 2, 3, 4, 5, 6].map((i) => {
      const foundRank = Array.isArray(a.ranks)
        ? a.ranks.find((r) => r.pos === i) || a.ranks[i - 1]
        : null;
      const rankIcon = foundRank?.icon || charIcon;
      const rankName = foundRank?.name || `Tinh Hồn Tầng ${i}`;
      const rankEffect =
        foundRank?.desc || `Mở khóa hiệu ứng Tinh Hồn Tầng ${i} gia tăng năng lực chiến đấu.`;
      const isActived =
        foundRank?.is_unlocked !== undefined
          ? Boolean(foundRank.is_unlocked)
          : Number(a.rank ?? 0) >= i;

      return {
        id: i,
        name: rankName,
        icon: rankIcon,
        is_actived: isActived,
        pos: i,
        effect: rankEffect,
      };
    });

    const skills =
      Array.isArray(a.skills) && a.skills.length > 0
        ? a.skills.map((s, idx) => {
            const stage = Array.isArray(s.skill_stages) ? s.skill_stages[0] : null;
            const skillIcon = s.item_url || stage?.item_url || s.icon || charIcon;
            const skillName = stage?.name || s.name || s.remake || `Kỹ năng ${idx + 1}`;
            const skillLevel = Number(s.level ?? stage?.level ?? 1);
            const skillDesc = stage?.desc || s.desc || '';
            return {
              name: skillName,
              level: skillLevel,
              icon: skillIcon,
              desc: skillDesc,
            };
          })
        : [
            {
              name: 'Tấn Công Thường',
              level: Math.min(6, Math.max(1, Math.floor(Number(a.level || 80) / 15))),
              icon: charIcon,
              desc: 'Gây sát thương thuộc tính đơn mục tiêu.',
            },
            {
              name: 'Chiến Kỹ',
              level: Math.min(10, Math.max(1, Math.floor(Number(a.level || 80) / 8))),
              icon: charIcon,
              desc: 'Kích hoạt kỹ năng đặc trưng diện rộng.',
            },
            {
              name: 'Tuyệt Kỹ',
              level: Math.min(10, Math.max(1, Math.floor(Number(a.level || 80) / 8))),
              icon: charIcon,
              desc: 'Bộc phát sức mạnh tối thượng diệt trừ kẻ địch.',
            },
            {
              name: 'Thiên Phú',
              level: Math.min(10, Math.max(1, Math.floor(Number(a.level || 80) / 8))),
              icon: charIcon,
              desc: 'Hiệu ứng bị động cường hóa toàn đội.',
            },
          ];

    return {
      id: a.id,
      name: a.name,
      rarity: Number(a.rarity),
      level: Number(a.level),
      rank: Number(a.rank ?? 0),
      actived_constellation_num: Number(a.rank ?? 0),
      element: a.element ?? a.damage_type,
      path: a.path ?? a.avatar_type,
      icon: charIcon,
      image: charImage,
      equip,
      weapon,
      relics: [...relics, ...ornaments],
      constellations,
      skills,
      properties,
      allProperties: properties,
      hasDetail: true,
    };
  });

  const roleObj = {
    uid: String(role.uid ?? ''),
    server: String(role.server ?? ''),
    nickname: String(
      role.nickname || snapshot.sections?.rogue?.data?.role?.nickname || 'Nhà Khai Phá',
    ),
    level: Number(role.level ?? stats.level ?? 70),
  };

  const previewFacts = [
    {
      id: 'active_days',
      label: 'Ngày Khai Phá',
      value: String(stats.active_days ?? 0),
      group: 'Hồ sơ',
    },
    {
      id: 'avatar_num',
      label: 'Nhân vật Khai Phá',
      value: String(characters.length),
      group: 'Đội ngũ',
    },
    {
      id: 'achievement_num',
      label: 'Thành tựu',
      value: String(stats.achievement_num ?? 0),
      group: 'Hành trình',
    },
    { id: 'chest_num', label: 'Rương báu', value: String(stats.chest_num ?? 0), group: 'Khám phá' },
    {
      id: 'abyss_process',
      label: 'Sảnh Đường Lãng Quên',
      value: String(stats.abyss_process ?? '12 / 12'),
      group: 'Khiêu chiến',
    },
  ];

  const regions = [
    {
      id: 'herta_space_station',
      name: 'Trạm Không Gian Herta',
      exploration_percentage: 1000,
      level: 10,
      background_image: '/assets/backgrounds/columbina-319f3efd.jpg',
      icon: 'https://cdn.jsdelivr.net/gh/Mar-7th/StarRailRes@master/icon/character/1004.png',
    },
    {
      id: 'jarilo_vi',
      name: 'Jarilo-VI (Belobog)',
      exploration_percentage: 980,
      level: 10,
      background_image: '/assets/backgrounds/flins-d6d28443.jpg',
      icon: 'https://cdn.jsdelivr.net/gh/Mar-7th/StarRailRes@master/icon/character/1102.png',
    },
    {
      id: 'xianzhou_luofu',
      name: 'Xianzhou Luofu',
      exploration_percentage: 950,
      level: 10,
      background_image: '/assets/backgrounds/zibai-40a00d1d.jpg',
      icon: 'https://cdn.jsdelivr.net/gh/Mar-7th/StarRailRes@master/icon/character/1205.png',
    },
    {
      id: 'penacony',
      name: 'Penacony (Hành Tinh Lễ Hội)',
      exploration_percentage: 920,
      level: 10,
      background_image: '/assets/backgrounds/nefer-4e007746.jpg',
      icon: 'https://cdn.jsdelivr.net/gh/Mar-7th/StarRailRes@master/icon/character/1308.png',
    },
  ];

  const propertyMap = {
    2000: { name: 'HP tối đa' },
    2001: { name: 'Tấn công' },
    2002: { name: 'Phòng ngự' },
    2003: { name: 'Tốc độ' },
    20: { name: 'Tỷ lệ bạo kích' },
    22: { name: 'ST bạo kích' },
    24: { name: 'Tấn công kích phá' },
    25: { name: 'Tăng ST thuộc tính' },
  };

  return {
    game: 'hsr',
    schema: 'hsr-battle-chronicle-v1',
    saved,
    role: roleObj,
    profile: roleObj,
    stats: {
      activeDays: Number(stats.active_days ?? 0),
      avatarNum: Number(stats.avatar_num ?? characters.length),
      achievementNum: Number(stats.achievement_num ?? 0),
      chestNum: Number(stats.chest_num ?? 0),
      abyssProcess: String(stats.abyss_process ?? ''),
    },
    characters,
    challenges: {
      moc: challengeSection,
    },
    rogue: rogueSection,
    regions,
    worldDisplay: regions.map((r) => ({ exploration_id: r.id })),
    previewFacts,
    propertyMap,
  };
}
