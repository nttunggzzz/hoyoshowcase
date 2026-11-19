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
    const equip = a.equip
      ? {
          id: a.equip.id,
          name: a.equip.name,
          rarity: Number(a.equip.rarity),
          level: Number(a.equip.level),
          rank: Number(a.equip.rank ?? 1),
          icon: a.equip.icon,
        }
      : null;

    const relics = Array.isArray(a.relics)
      ? a.relics.map((r) => ({
          id: r.id,
          name: r.name,
          level: Number(r.level),
          pos: Number(r.pos),
          rarity: Number(r.rarity),
          icon: r.icon,
        }))
      : [];

    const ornaments = Array.isArray(a.ornaments)
      ? a.ornaments.map((o) => ({
          id: o.id,
          name: o.name,
          level: Number(o.level),
          pos: Number(o.pos),
          rarity: Number(o.rarity),
          icon: o.icon,
        }))
      : [];

    return {
      id: a.id,
      name: a.name,
      rarity: Number(a.rarity),
      level: Number(a.level),
      rank: Number(a.rank ?? 0),
      element: a.element ?? a.damage_type,
      path: a.path ?? a.avatar_type,
      icon: a.icon,
      equip,
      relics: [...relics, ...ornaments],
    };
  });

  return {
    game: 'hsr',
    schema: 'hsr-battle-chronicle-v1',
    saved,
    profile: {
      uid: String(role.uid ?? ''),
      server: String(role.server ?? ''),
      nickname: String(role.nickname ?? ''),
      level: Number(role.level ?? stats.level ?? 0),
    },
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
  };
}
