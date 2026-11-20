import { buildViews, stripCredentials } from '../collection/collector.mjs';
import { previewFacts } from './preview-facts.mjs';

const pick = (v, keys) =>
  Object.fromEntries(keys.filter((k) => v?.[k] !== undefined).map((k) => [k, v[k]]));
export function showcaseModel(snapshot, { saved = false } = {}) {
  if (!snapshot) return null;
  if (snapshot.schema !== 'genshin-battle-chronicle-v1' || !snapshot.sections || !snapshot.role)
    throw Error('Bản dữ liệu không đúng định dạng.');
  buildViews(snapshot);
  const sections = snapshot.sections,
    data = (id) => sections[id]?.data;
  const propertyMap = Object.assign(
    {},
    ...(data('character_details')?.batches ?? []).map((b) => b.data.property_map ?? {}),
  );
  const characters = snapshot.views.characters.map((c) => ({
    id: c.id,
    ...c.basic,
    ...(c.detail?.base ?? {}),
    weapon: c.detail?.weapon ?? c.basic.weapon,
    relics: c.detail?.relics ?? [],
    skills: (c.detail?.skills ?? []).map((s) =>
      pick(s, ['skill_id', 'name', 'level', 'icon', 'is_unlock', 'desc']),
    ),
    constellations: (c.detail?.constellations ?? []).map((s) =>
      pick(s, ['id', 'name', 'icon', 'effect', 'is_actived', 'pos']),
    ),
    properties: c.detail?.selected_properties ?? [],
    allProperties: [
      ...new Map(
        [
          ...(c.detail?.base_properties ?? []),
          ...(c.detail?.extra_properties ?? []),
          ...(c.detail?.element_properties ?? []),
          ...(c.detail?.selected_properties ?? []),
        ].map((p) => [p.property_type, p]),
      ).values(),
    ],
    hasDetail: !!c.detail,
  }));
  return stripCredentials({
    game: 'genshin',
    id: snapshot.id,
    state: snapshot.state,
    saved,
    role: snapshot.role,
    profile: data('role') ?? {},
    startedAt: snapshot.startedAt,
    updatedAt: snapshot.finishedAt ?? snapshot.startedAt,
    stats: pick(data('overview')?.stats, [
      'active_day_number',
      'achievement_number',
      'avatar_number',
      'way_point_number',
      'domain_number',
      'spiral_abyss',
      'full_fetter_avatar_num',
      'luxurious_chest_number',
      'precious_chest_number',
      'exquisite_chest_number',
      'common_chest_number',
      'magic_chest_number',
    ]),
    characters,
    propertyMap,
    previewFacts: previewFacts(snapshot),
    regions: (data('overview')?.world_explorations ?? []).map((x) =>
      pick(x, [
        'id',
        'name',
        'icon',
        'exploration_percentage',
        'level',
        'type',
        'parent_id',
        'background_image',
        'inner_icon',
        'cover',
        'offerings',
        'seven_statue_level',
        'area_exploration_list',
        'map_url',
      ]),
    ),
    worldDisplay: data('overview')?.world_exploration_display ?? [],
    notes: pick(data('realtime_notes'), [
      'current_resin',
      'max_resin',
      'finished_task_num',
      'total_task_num',
      'current_expedition_num',
      'max_expedition_num',
      'current_home_coin',
      'max_home_coin',
    ]),
    abyss: pick(data('abyss_current'), [
      'total_star',
      'max_floor',
      'is_unlock',
      'total_battle_times',
      'start_time',
      'end_time',
    ]),
    tcg: {
      cards: data('tcg_cards')?.card_list.length ?? 0,
      decks: data('tcg_decks')?.deck_list.length ?? 0,
      complete: data('tcg_cards')?.complete ?? false,
    },
    summary: snapshot.summary,
    modules: Object.values(sections).map((m) =>
      pick(m, ['id', 'label', 'state', 'reason', 'error', 'requestCount']),
    ),
  });
}
