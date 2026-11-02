const labels = {
  active_day_number: 'Ngày hoạt động',
  achievement_number: 'Thành tựu',
  avatar_number: 'Nhân vật',
  way_point_number: 'Điểm dịch chuyển',
  domain_number: 'Bí cảnh',
  spiral_abyss: 'La Hoàn trong hồ sơ',
  full_fetter_avatar_num: 'Nhân vật thân thiết tối đa',
  luxurious_chest_number: 'Rương Hoa Lệ',
  precious_chest_number: 'Rương Quý Hiếm',
  exquisite_chest_number: 'Rương Tinh Xảo',
  common_chest_number: 'Rương Thường',
  magic_chest_number: 'Rương Kỳ Dị',
  anemoculus_number: 'Phong Thần Đồng',
  geoculus_number: 'Nham Thần Đồng',
  electroculus_number: 'Lôi Thần Đồng',
  dendroculus_number: 'Thảo Thần Đồng',
  hydroculus_number: 'Thủy Thần Đồng',
  pyroculus_number: 'Hỏa Thần Đồng',
  moonoculus_number: 'Nguyệt Thần Đồng',
  iceculus_number: 'Băng Thần Đồng',
  max_round_id: 'Màn cao nhất',
  medal_num: 'Huy chương',
  heraldry: 'Huy hiệu',
  coin_num: 'Hoa Huyễn Tưởng',
  avatar_bonus_num: 'Nhân vật ưu thế',
  rent_cnt: 'Lượt trợ diễn',
  tarot_finished_cnt: 'Thẻ Tuyệt Kỹ',
  difficulty_id: 'Độ khó',
  difficulty: 'Độ khó',
  second: 'Thời gian (giây)',
  total_star: 'Sao',
  total_battle_times: 'Lượt chiến đấu',
  total_win_times: 'Lượt thắng',
  max_floor: 'Tầng cao nhất',
  level: 'Cấp',
  visit_num: 'Lượt ghé thăm',
  comfort_num: 'Tiên Lực',
  item_num: 'Đồ trang trí',
  achievement_num: 'Thành tựu',
  current_resin: 'Nhựa hiện tại',
  max_resin: 'Giới hạn Nhựa',
  finished_task_num: 'Ủy thác đã xong',
  total_task_num: 'Ủy thác trong ngày',
  remain_resin_discount_num: 'Lượt giảm Nhựa còn lại',
  resin_discount_num_limit: 'Giới hạn giảm Nhựa',
  current_expedition_num: 'Thám hiểm đang có',
  max_expedition_num: 'Giới hạn thám hiểm',
  current_home_coin: 'Tiền động tiên',
  max_home_coin: 'Giới hạn tiền động tiên',
  finished_num: 'Đã hoàn tất',
  total_num: 'Tổng số',
  stored_attendance: 'Điểm tích lũy',
  progress_current: 'Tiến độ tuần',
  progress_total: 'Mục tiêu tuần',
  period_progress_current: 'Tiến độ kỳ',
  period_progress_total: 'Mục tiêu kỳ',
  avatar_card_num_gained: 'Thẻ nhân vật sở hữu',
  avatar_card_num_total: 'Thẻ nhân vật trong danh mục',
  action_card_num_gained: 'Thẻ hành động sở hữu',
  action_card_num_total: 'Thẻ hành động trong danh mục',
  win_cnt: 'Trận thắng',
  curr_num: 'Đã thu thập',
  total_use_time: 'Thời gian sử dụng (giây)',
  total_coin_consumed: 'Hoa Huyễn Tưởng đã dùng',
  is_unlock: 'Đã mở khóa',
  is_extra_task_reward_received: 'Đã nhận thưởng ủy thác',
  obtained: 'Đã có',
  reached: 'Đã sẵn sàng',
  is_finish_all_mainline: 'Xong toàn bộ Ma Thần',
  is_finish_all_interchapter: 'Xong toàn bộ chương gián chương',
};
const isScalar = (v) => ['string', 'number', 'boolean'].includes(typeof v);
export function previewFacts(snapshot) {
  const out = [],
    sections = snapshot.sections ?? {},
    data = (id) => sections[id]?.data;
  const add = (id, group, label, value, { missing = 'Chưa có dữ liệu', unit = '' } = {}) => {
    const available = value !== undefined && value !== null && value !== '' && value !== '-';
    out.push({
      id,
      group,
      label,
      value: available ? value : null,
      display: available
        ? typeof value === 'boolean'
          ? value
            ? 'Có'
            : 'Chưa'
          : typeof value === 'number'
            ? new Intl.NumberFormat('vi-VN').format(value) + (unit ? ' ' + unit : '')
            : String(value)
        : missing,
      available,
    });
  };
  function fields(prefix, group, object, { missing = false } = {}) {
    for (const [key, value] of Object.entries(object ?? {})) {
      if (!isScalar(value) || !labels[key]) continue;
      add(prefix + '.' + key, group, labels[key], missing ? null : value);
    }
  }
  const chars = snapshot.views?.characters ?? [],
    base = (c) => c.detail?.base ?? c.basic;
  add('collection.characters', 'Bộ sưu tập', 'Tổng nhân vật', chars.length);
  add(
    'collection.weapons',
    'Bộ sưu tập',
    'Vũ khí đang trang bị',
    snapshot.views?.equippedWeapons?.length ?? 0,
  );
  add(
    'collection.artifacts',
    'Bộ sưu tập',
    'Thánh di vật trang bị',
    snapshot.views?.equippedArtifacts?.length ?? 0,
  );
  add(
    'collection.five',
    'Bộ sưu tập',
    'Nhân vật 5 sao',
    chars.filter((c) => [5, 105].includes(base(c).rarity)).length,
  );
  add(
    'collection.four',
    'Bộ sưu tập',
    'Nhân vật 4 sao',
    chars.filter((c) => base(c).rarity === 4).length,
  );
  add(
    'collection.c6five',
    'Bộ sưu tập',
    'Nhân vật 5 sao C6',
    chars.filter(
      (c) => [5, 105].includes(base(c).rarity) && base(c).actived_constellation_num === 6,
    ).length,
  );
  add(
    'collection.c6four',
    'Bộ sưu tập',
    'Nhân vật 4 sao C6',
    chars.filter((c) => base(c).rarity === 4 && base(c).actived_constellation_num === 6).length,
  );
  add(
    'collection.level90',
    'Bộ sưu tập',
    'Nhân vật cấp 90 trở lên',
    chars.filter((c) => base(c).level >= 90).length,
  );
  fields('stats', 'Hồ sơ & tài nguyên', data('overview')?.stats);
  for (const [id, title] of [
    ['abyss_current', 'La Hoàn kỳ hiện tại'],
    ['abyss_previous', 'La Hoàn kỳ trước'],
  ]) {
    const d = data(id);
    add(
      id + '.state',
      title,
      'Trạng thái',
      d
        ? d.is_unlock === false
          ? 'Chưa mở'
          : d.total_battle_times === 0
            ? 'Chưa có lượt đánh'
            : 'Đã có bản ghi'
        : null,
    );
    fields(id, title, d, { missing: !d || d.is_unlock === false });
  }
  const theater = data('theater');
  (theater?.data ?? []).forEach((period, index) => {
    const group = index === 0 ? 'Nhà Hát kỳ hiện tại' : `Nhà Hát kỳ trước ${index}`,
      prefix = 'theater.' + index;
    add(
      prefix + '.state',
      group,
      'Trạng thái',
      period.has_data === false ? 'Chưa có dữ liệu' : 'Đã có bản ghi',
    );
    fields(prefix, group, period.stat ?? period.detail?.detail_stat, {
      missing: period.has_data === false,
    });
    fields(prefix + '.fight', group, period.detail?.fight_statisic, {
      missing: period.has_data === false,
    });
  });
  if (!theater?.data?.length) add('theater.0.state', 'Nhà Hát kỳ hiện tại', 'Trạng thái', null);
  fields('theater.tarot', 'Thẻ Tuyệt Kỹ Nhà Hát', theater?.tarot_card_state);
  (data('stygian')?.data ?? []).forEach((period, index) => {
    for (const [mode, label] of [
      ['single', 'Đơn'],
      ['mp', 'Nhiều người'],
    ]) {
      const group = `U Cảnh ${index === 0 ? 'kỳ hiện tại' : 'kỳ trước ' + index} / ${label}`,
        prefix = `stygian.${index}.${mode}`,
        record = period[mode];
      add(
        prefix + '.state',
        group,
        'Trạng thái',
        record?.has_data === false ? 'Chưa có dữ liệu' : record ? 'Đã có bản ghi' : null,
      );
      fields(prefix, group, record?.best, { missing: record?.has_data === false });
      if (record?.has_data !== false && Array.isArray(record?.challenge))
        add(prefix + '.records', group, 'Trận đã ghi nhận', record.challenge.length);
    }
  });
  fields('notes', 'Ghi chú thời gian thực', data('realtime_notes'));
  for (const [key, title] of [
    ['daily_task', 'Ủy thác & Điểm Tích Lũy'],
    ['week_active_progress', 'Hoạt động tuần'],
    ['archon_quest_progress', 'Nhiệm vụ Ma Thần'],
  ])
    fields('notes.' + key, title, data('realtime_notes')?.[key]);
  fields('tcg', 'Thất Thánh Triệu Hồi', data('tcg_overview'));
  fields('tcg.challenge', 'Thử thách Thất Thánh', data('tcg_overview')?.challenge_basic, {
    missing: data('tcg_overview')?.challenge_basic?.has_data === false,
  });
  if (Array.isArray(data('tcg_decks')?.deck_list))
    add('tcg.decks', 'Thất Thánh Triệu Hồi', 'Bộ bài đã lưu', data('tcg_decks').deck_list.length);
  if (Array.isArray(data('tcg_card_backs')?.card_back_list))
    add(
      'tcg.backs',
      'Thất Thánh Triệu Hồi',
      'Lưng thẻ',
      data('tcg_card_backs').card_back_list.length,
    );
  (data('overview')?.homes ?? []).forEach((home, i) =>
    fields('home.' + i, 'Ấm Trần Ca / ' + home.name, home),
  );
  (data('overview')?.world_explorations ?? []).forEach((region) => {
    const group = 'Khám phá / ' + region.name,
      prefix = 'region.' + region.id;
    add(
      prefix + '.percent',
      group,
      'Tiến độ',
      Math.min(100, Number(region.exploration_percentage ?? 0) / 10),
      { unit: '%' },
    );
    if (region.type === 'Reputation') add(prefix + '.reputation', group, 'Danh vọng', region.level);
    if (region.seven_statue_level > 0)
      add(prefix + '.statue', group, 'Thất Thiên Thần Tượng', region.seven_statue_level);
    (region.offerings ?? []).forEach((x, i) =>
      add(prefix + '.offering.' + i, group, x.name, x.level),
    );
    (region.area_exploration_list ?? []).forEach((x, i) =>
      add(
        prefix + '.area.' + i,
        group,
        x.name,
        Math.min(100, Number(x.exploration_percentage ?? 0) / 10),
        { unit: '%' },
      ),
    );
  });
  fields('achievement', 'Thành tựu', data('achievements'));
  const calendar = data('calendar');
  for (const [key, title] of [
    ['act_list', 'Sự kiện trong lịch'],
    ['fixed_act_list', 'Hoạt động cố định'],
    ['selected_act_list', 'Hoạt động nổi bật'],
  ])
    if (Array.isArray(calendar?.[key]))
      add('calendar.' + key, 'Sự kiện & lịch', title, calendar[key].length);
  if (Array.isArray(data('activities')?.activities))
    add(
      'activities.total',
      'Sự kiện & lịch',
      'Báo cáo sự kiện',
      data('activities').activities.length,
    );
  if (data('envisaged_echoes'))
    add('echoes.unlocked', 'Dư Âm Tưởng Tượng', 'Đã mở khóa', data('envisaged_echoes').is_unlock);
  return out;
}
