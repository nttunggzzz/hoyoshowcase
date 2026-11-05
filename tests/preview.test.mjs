import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeConfig,
  selectItems,
  planPreview,
  sortCharacters,
  vip,
  properties,
} from '../src/shared/preview-config.mjs';
import { previewFacts } from '../src/server/models/preview-facts.mjs';
import { showcaseModel } from '../src/server/models/showcase.mjs';
import { makeFixture } from './fixtures/collector.mjs';
import { startCollection, exportCollection } from '../src/server/collection/collector.mjs';

const model = () => ({
  characters: Array.from({ length: 65 }, (_, i) => ({
    id: i + 1,
    name: 'Character ' + i,
    rarity: i < 25 ? 5 : 4,
    level: 90 - i,
    actived_constellation_num: i === 0 ? 6 : i === 30 ? 6 : 0,
    weapon: { id: 1, name: 'Same weapon', rarity: 4, level: 80, affix_level: 1 },
    allProperties: [
      { property_type: 2000, final: '20340' },
      { property_type: 20, final: '64.8%' },
    ],
  })),
  regions: [{ id: 2, background_image: 'native.png' }],
  previewFacts: [{ id: 'collection.characters', value: 65 }],
  worldDisplay: [],
});
test('visible row/item limits preserve full account totals and separate equipped copies', () => {
  const m = model(),
    c = normalizeConfig(
      {
        charCols: 4,
        charRows: 2,
        charLimit: 12,
        weaponCols: 6,
        weaponRows: 2,
        weaponLimit: 10,
        charGridMode: 'full',
        weaponGridMode: 'full',
      },
      m,
    ),
    p = selectItems(m, c);
  assert.equal(p.characters.length, 8);
  assert.equal(p.weapons.length, 10);
  assert.equal(p.allCharacters, 65);
  assert.equal(p.allWeapons, 65);
  assert.equal(
    selectItems(m, normalizeConfig({ charRarity: 'five', charGridMode: 'full' }, m)).characters
      .length,
    25,
  );
  const balanced = selectItems(
    m,
    normalizeConfig({ charGridMode: 'balanced', weaponGridMode: 'balanced' }, m),
  );
  assert.equal(balanced.characters.length, 63); // 9 full rows of 7
  assert.equal(balanced.weapons.length, 56); // 4 full rows of 14
});
test('five-star C6 gets prestige priority over four-star C6; Aloy retains five-star rarity', () => {
  const m = model(),
    c6four = m.characters[30],
    c6five = m.characters[0];
  assert.equal(vip(c6four), false);
  assert.equal(vip(c6five), true);
  assert.equal(sortCharacters([c6four, m.characters[1], c6five], 'prestige')[0].id, c6five.id);
  assert.equal(vip({ rarity: 105, actived_constellation_num: 6 }), true);
});
test('saved options are bounded and role-specific; achievement/day facts are opt-in', () => {
  const m = model(),
    c = normalizeConfig(
      {
        charCols: 999,
        charRows: -1,
        weaponCols: 0,
        width: 9999,
        buildIds: [1, 1, 999],
        facts: ['collection.characters', 'unknown'],
        statIds: [20, 999],
        name: 'no',
      },
      m,
    );
  assert.equal(c.charCols, 12);
  assert.equal(c.charRows, 0);
  assert.equal(c.weaponCols, 1);
  assert.equal(c.width, 1600);
  assert.deepEqual(c.buildIds, [1]);
  assert.deepEqual(c.statIds, [20]);
  assert.deepEqual(c.facts, ['collection.characters']);
  assert.equal(c.name, true);
  const defaults = normalizeConfig({}, m);
  assert.deepEqual(defaults.facts, []);
  assert.equal(defaults.builds, false);
  assert.equal(defaults.maps, false);
  assert.deepEqual(defaults.buildIds, [1]);
  assert.deepEqual(
    normalizeConfig({ buildIds: [1] }, { ...m, characters: [{ ...m.characters[1], id: 99 }] })
      .buildIds,
    [],
  );
});
test('build/stat selection retains explicit empty choices and rejects empty exports', () => {
  const m = model(),
    c = normalizeConfig({ account: false, builds: true, buildIds: [], statIds: [] }, m);
  assert.deepEqual(c.statIds, []);
  assert.match(planPreview(m, c).error, /Chọn ít nhất một nhân vật/);
  assert.match(
    planPreview(m, normalizeConfig({ account: false }, m)).error,
    /Chọn ít nhất một phần/,
  );
});
test('single-list and two-list compositions keep panels below identity and inside the PNG', () => {
  const m = model();
  for (const raw of [
    { weapons: false },
    { characters: false },
    { characters: true, weapons: true },
  ]) {
    const c = normalizeConfig(raw, m),
      p = planPreview(m, c);
    if (c.weapons) {
      assert.ok(p.weaponPanel.y >= 20 + p.bannerHeight + 18);
      assert.ok(p.weaponPanel.y + p.weaponGrid.height < p.boardHeight);
    }
    if (c.characters) {
      if (!p.both) assert.ok(p.charPanel.y >= 20 + p.bannerHeight + 18);
      assert.ok(p.charPanel.y + p.charGrid.height < p.boardHeight);
    }
  }
});
test('combined PNG grows for maps and multiple builds, with resolution and pixel budget guards', () => {
  const m = model(),
    base = planPreview(m, normalizeConfig({}, m)),
    c = normalizeConfig({ maps: true, builds: true, buildIds: [1, 2] }, m),
    p = planPreview(m, c);
  assert.equal(p.mapHeight, 300);
  assert.equal(p.buildHeights.length, 2);
  assert.equal(p.height, base.height + 300 + p.buildHeights.reduce((a, b) => a + b));
  assert.equal(p.error, null);
  const high = planPreview(m, normalizeConfig({ ...c, width: 3200 }, m));
  assert.equal(high.outputHeight, p.height * 2);
  const tooTall = planPreview(m, normalizeConfig({ charCols: 1, weaponCols: 1, width: 3200 }, m));
  assert.match(tooTall.error, /Ảnh quá lớn/);
  const compact = planPreview(
    m,
    normalizeConfig(
      { account: false, builds: true, buildIds: [1], buildRelics: false, buildSkills: false },
      m,
    ),
  );
  assert.ok(compact.height < p.buildHeights[0]);
});
test('maximum six builds and property deduplication preserve selected final values', () => {
  const m = model(),
    c = normalizeConfig({ buildIds: [1, 2, 3, 4, 5, 6, 7] }, m);
  assert.equal(c.buildIds.length, 6);
  assert.deepEqual(
    properties({
      allProperties: [{ property_type: 20, final: '5%' }],
      properties: [{ property_type: 20, final: '64.8%' }],
    }),
    [{ property_type: 20, final: '64.8%' }],
  );
});
test('theme and aesthetic customization options normalize safely', () => {
  const m = model(),
    c = normalizeConfig(
      {
        theme: 'pyro',
        frameStyle: 'fantasy',
        vignette: false,
        cornerAccents: true,
        artifactCv: true,
        crownBadge: true,
        signature: 'Main Hu Tao C6',
        charGridMode: 'balanced',
        weaponGridMode: 'full',
        weaponAlign: 'bottom',
        wishPosition: 'above_weapon',
        collectionHeader: false,
      },
      m,
    );
  assert.equal(c.theme, 'pyro');
  assert.equal(c.frameStyle, 'fantasy');
  assert.equal(c.vignette, false);
  assert.equal(c.cornerAccents, true);
  assert.equal(c.artifactCv, true);
  assert.equal(c.crownBadge, true);
  assert.equal(c.signature, 'Main Hu Tao C6');
  assert.equal(c.charGridMode, 'balanced');
  assert.equal(c.weaponGridMode, 'full');
  assert.equal(c.weaponAlign, 'bottom');
  assert.equal(c.wishPosition, 'above_weapon');
  assert.equal(c.collectionHeader, false);
  // Fallback on invalid enum value
  const fallback = normalizeConfig(
    {
      theme: 'invalid_theme',
      frameStyle: 'round',
      charGridMode: 'bad',
      weaponAlign: 'center',
      wishPosition: 'nowhere',
    },
    m,
  );
  assert.equal(fallback.theme, 'abyss');
  assert.equal(fallback.frameStyle, 'modern');
  assert.equal(fallback.charGridMode, 'balanced');
  assert.equal(fallback.weaponAlign, 'bottom');
  assert.equal(fallback.wishPosition, 'above_weapon');
  assert.equal(fallback.weaponAlign, 'bottom');
});
test('Chronicle toggles distinguish locked/missing records from real zero and false values', () => {
  const facts = previewFacts({
    sections: {
      overview: { data: { stats: { active_day_number: 0, spiral_abyss: '-' } } },
      abyss_current: { data: { is_unlock: false, total_star: 0, max_floor: '0-0' } },
      abyss_previous: { data: { is_unlock: true, total_star: 0 } },
      theater: { data: { data: [{ has_data: false, stat: { max_round_id: 0, medal_num: 0 } }] } },
      stygian: { data: { data: [{ single: { has_data: false, best: null, challenge: [] } }] } },
      realtime_notes: { data: { current_resin: 0, is_extra_task_reward_received: false } },
    },
    views: { characters: [] },
  });
  const get = (id) => facts.find((x) => x.id === id);
  assert.equal(get('abyss_current.total_star').available, false);
  assert.equal(get('abyss_previous.total_star').display, '0');
  assert.equal(get('theater.0.max_round_id').available, false);
  assert.equal(get('stygian.0.single.state').display, 'Chưa có dữ liệu');
  assert.equal(get('notes.current_resin').display, '0');
  assert.equal(get('notes.is_extra_task_reward_received').display, 'Chưa');
  assert.equal(get('stats.spiral_abyss').available, false);
  assert.equal(new Set(facts.map((x) => x.id)).size, facts.length);
});
test('showcase exposes all returned character stat categories and meaningful catalog fields', async () => {
  const f = makeFixture({ characters: 1 });
  startCollection(f.ctx);
  await f.ctx.collection.done;
  const s = exportCollection(f.ctx),
    detail = s.sections.character_details.data.batches[0].data.list[0];
  detail.base_properties = [{ property_type: 2000, final: '10000' }];
  detail.extra_properties = [{ property_type: 20, final: '5%' }];
  detail.element_properties = [{ property_type: 40, final: '46.6%' }];
  detail.selected_properties = [{ property_type: 20, final: '70%' }];
  const m = showcaseModel(s);
  assert.equal(m.characters[0].allProperties.length, 3);
  assert.equal(m.characters[0].allProperties.find((p) => p.property_type === 20).final, '70%');
  assert.ok(m.previewFacts.some((x) => x.id === 'collection.weapons'));
  assert.ok(m.previewFacts.some((x) => x.id === 'abyss_current.state'));
});
