import { DEFAULT_STATS, properties, stars } from '/shared/preview-config.mjs';
import { escapeHtml as esc } from './format.js';
import { gameImageSource } from './media.js';

/** Form rendering only. State ownership and event handlers stay in controller.js. */
export function createPreviewSettings({ controls, getData, getConfig, label }) {
  const $ = (id) => document.getElementById(id);
  let data, config;
  function sync() {
    data = getData();
    config = getConfig();
  }
  const picture = (url, alt = '') =>
    gameImageSource(url)
      ? `<img src="${esc(gameImageSource(url))}" alt="${esc(alt)}" loading="lazy">`
      : '';

  const toggle = (key, title) =>
    `<label class="preview-option"><input type="checkbox" data-key="${key}" ${config[key] ? 'checked' : ''}>${title}</label>`;
  const input = (key, title, min, max, hint = '') =>
    `<label class="preview-number">${title}<input type="number" min="${min}" max="${max}" step="1" data-key="${key}" value="${config[key]}" aria-label="${title}">${hint ? '<small>' + hint + '</small>' : ''}</label>`;
  const select = (key, title, choices) =>
    `<label class="preview-select">${title}<select data-key="${key}" aria-label="${title}">${choices.map(([value, text]) => `<option value="${value}" ${String(config[key]) === String(value) ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`;
  function setup() {
    const regions = data.regions.filter((r) => r.background_image);
    controls.innerHTML = /* HTML */ ` <details class="preview-setting" open>
        <summary>Bố cục & số lượng</summary>
        <div class="setting-content">
          ${toggle('account', 'Kèm tổng quan tài khoản')}${select(
            'background',
            'Ảnh nền',
            regions.map((r) => [r.id, r.name]),
          )}${select('width', 'Độ phân giải PNG', [
            [1200, '1200 px'],
            [1600, '1600 px'],
            [2400, '2400 px'],
            [3200, '3200 px'],
          ])}
          <fieldset>
            <legend>Nhân vật</legend>
            ${toggle('characters', 'Hiện danh sách nhân vật')}${toggle('charCount', 'Hiện số lượng trong tiêu đề')}
            <div class="preview-number-grid">
              ${input('charCols', 'Nhân vật mỗi hàng', 1, 12)}${input('charRows', 'Số hàng nhân vật tối đa', 0, 100, '0 = không giới hạn')}${input('charLimit', 'Số nhân vật tối đa', 0, 500, '0 = tất cả')}
            </div>
            ${select('charRarity', 'Lọc nhân vật', [
              ['all', 'Tất cả độ hiếm'],
              ['five', 'Chỉ 5 sao'],
              ['four', 'Chỉ 4 sao'],
            ])}${select('charSort', 'Sắp xếp nhân vật', [
              ['prestige', '5 sao C6 ưu tiên'],
              ['rarity', 'Độ hiếm'],
              ['level', 'Cấp cao nhất'],
              ['constellation', 'Cung mệnh'],
              ['name', 'Tên A-Z'],
            ])}
          </fieldset>
          <fieldset>
            <legend>Vũ khí</legend>
            ${toggle('weapons', 'Hiện vũ khí đang trang bị')}${toggle('weaponCount', 'Hiện số lượng trong tiêu đề')}
            <div class="preview-number-grid">
              ${input('weaponCols', 'Vũ khí mỗi hàng', 1, 16)}${input('weaponRows', 'Số hàng vũ khí tối đa', 0, 100, '0 = không giới hạn')}${input('weaponLimit', 'Số vũ khí tối đa', 0, 500, '0 = tất cả')}
            </div>
            ${select('weaponRarity', 'Lọc vũ khí', [
              ['all', 'Tất cả độ hiếm'],
              ['five', 'Chỉ 5 sao'],
              ['four', 'Chỉ 4 sao'],
              ['three', 'Chỉ 3 sao'],
            ])}${select('weaponSort', 'Sắp xếp vũ khí', [
              ['rarity', 'Độ hiếm'],
              ['level', 'Cấp cao nhất'],
              ['refinement', 'Tinh luyện cao nhất'],
              ['name', 'Tên A-Z'],
            ])}
          </fieldset>
        </div>
      </details>
      <details class="preview-setting">
        <summary>Hồ sơ & nội dung trên thẻ</summary>
        <div class="setting-content preview-toggle-grid">
          ${toggle('name', 'Tên người chơi')}${toggle('uid', 'UID')}${toggle('ar', 'Hạng mạo hiểm')}${toggle('server', 'Máy chủ')}${toggle('avatar', 'Ảnh đại diện')}${toggle('updated', 'Thời điểm đồng bộ')}${toggle('levels', 'Cấp trên thẻ')}${toggle('constellations', 'Cung mệnh trên thẻ')}${toggle('refinements', 'Tinh luyện vũ khí')}${toggle('elements', 'Icon nguyên tố')}${toggle('weaponOwner', 'Chủ nhân vũ khí')}${toggle('stars', 'Số sao')}
        </div>
      </details>
      <details class="preview-setting" open>
        <summary>Độ hiếm & cung mệnh</summary>
        <div class="setting-content">
          ${toggle('premium', 'Viền vàng cho nhân vật 5 sao')}${toggle('c6', 'Nhấn mạnh nhân vật 5 sao C6 <span class="vip-sample">C6</span>')}${select(
            'c6Size',
            'Độ nổi bật C6',
            [
              ['large', 'Rất nổi bật'],
              ['normal', 'Tiêu chuẩn'],
            ],
          )}
          <p class="setting-help">
            5 sao C6 có khung vàng kép và huy hiệu lớn. 4 sao dùng khung tím riêng.
          </p>
        </div>
      </details>
      <details class="preview-setting">
        <summary>Thông tin Battle Chronicle <span>${data.previewFacts?.length ?? 0}</span></summary>
        <div class="setting-content">
          <p class="setting-help">
            Chọn từng thông tin để đưa vào ảnh. Thành tựu và ngày hoạt động mặc định tắt.
          </p>
          <input
            id="preview-fact-search"
            type="search"
            placeholder="Tìm La Hoàn, Nhà Hát, Nhựa…"
            aria-label="Tìm thông tin Battle Chronicle"
          />
          <div class="setting-mini-actions">
            <button data-action="clear-facts">Bỏ chọn hết</button>
          </div>
          <div id="preview-facts"></div>
        </div>
      </details>
      <details class="preview-setting" open>
        <summary>Khám phá & build nhân vật</summary>
        <div class="setting-content">
          ${toggle('maps', 'Kèm tiến độ khám phá')}${toggle('builds', 'Kèm chỉ số nhân vật')}
          <div id="preview-build-options" ${config.builds ? '' : 'hidden'}>
            <p class="setting-help">
              Chọn tối đa 6 nhân vật. Mỗi build là một khối gọn, ghép chung trong một PNG.
            </p>
            <input
              id="preview-build-search"
              type="search"
              placeholder="Tìm nhân vật làm build…"
              aria-label="Tìm nhân vật làm build"
            />
            <div id="preview-build-picker" class="preview-build-picker">
              ${data.characters.map((c) => `<label class="build-choice" data-build-name="${esc(c.name.toLocaleLowerCase())}"><input type="checkbox" data-build-id="${c.id}" ${config.buildIds.includes(c.id) ? 'checked' : ''} aria-label="Build ${esc(c.name)}">${picture(c.icon, c.name)}<span>${esc(c.name)}<small>${stars(c)}★ / C${c.actived_constellation_num ?? 0}</small></span></label>`).join('')}
            </div>
            <fieldset>
              <legend>Chỉ số trên ảnh build</legend>
              <div class="setting-mini-actions">
                <button data-stat-preset="dps">DPS</button
                ><button data-stat-preset="support">Hỗ trợ</button
                ><button data-stat-preset="em">Tinh thông</button
                ><button data-stat-preset="all">Tất cả</button
                ><button data-stat-preset="none">Bỏ hết</button>
              </div>
              <p id="preview-stat-context" class="setting-help"></p>
              <div id="preview-stat-picker" class="preview-stat-picker"></div>
            </fieldset>
            <div class="preview-toggle-grid">
              ${toggle('buildWeapon', 'Kèm vũ khí')}${toggle('buildRelics', 'Kèm thánh di vật')}${toggle('buildSubstats', 'Chỉ số phụ thánh di vật')}${toggle('buildSkills', 'Cấp thiên phú')}${toggle('buildConstellations', 'Cung mệnh trong build')}${toggle('buildFetter', 'Thiện cảm')}
            </div>
          </div>
        </div>
      </details>`;
    updateFacts();
    updateStats();
  }
  function updateFacts() {
    const q = $('preview-fact-search')?.value.trim().toLocaleLowerCase() ?? '',
      groups = new Map();
    for (const fact of data.previewFacts ?? []) {
      if (q && !`${fact.group} ${fact.label}`.toLocaleLowerCase().includes(q)) continue;
      if (!groups.has(fact.group)) groups.set(fact.group, []);
      groups.get(fact.group).push(fact);
    }
    $('preview-facts').innerHTML = [...groups]
      .map(
        ([group, items]) =>
          `<details class="fact-group" ${q ? 'open' : ''}><summary>${esc(group)} <span>${items.filter((f) => config.facts.includes(f.id)).length}/${items.length}</span></summary>${items.map((f) => `<label class="preview-fact"><input type="checkbox" data-fact="${f.id}" ${config.facts.includes(f.id) ? 'checked' : ''}><span>${esc(f.label)}<small class="${f.available ? '' : 'unavailable'}">${esc(f.display)}</small></span></label>`).join('')}</details>`,
      )
      .join('');
  }
  function updateStats() {
    const all = [
        ...new Set(
          data.characters.flatMap((c) => properties(c).map((p) => Number(p.property_type))),
        ),
      ],
      c = data.characters.find((c) => c.id === config.buildIds[0]);
    $('preview-stat-context').textContent = c
      ? 'Giá trị minh họa từ ' + c.name + '. Chỉ các ô được chọn mới xuất hiện trên ảnh.'
      : 'Chọn nhân vật để xem chỉ số.';
    const actual = new Map(properties(c ?? {}).map((p) => [Number(p.property_type), p.final]));
    all.sort((a, b) => {
      const order = [...DEFAULT_STATS, 40, 41, 42, 43, 44, 45, 46, 30, 26, 27, 81, 80, 999999];
      return (
        (order.includes(a) ? order.indexOf(a) : 100 + a) -
        (order.includes(b) ? order.indexOf(b) : 100 + b)
      );
    });
    $('preview-stat-picker').innerHTML = all
      .map(
        (id) =>
          `<label class="preview-fact"><input type="checkbox" data-stat-id="${id}" ${config.statIds.includes(id) ? 'checked' : ''}><span>${esc(label(id))}<small>${esc(actual.get(id) ?? 'Không trả về')}</small></span></label>`,
      )
      .join('');
  }

  return {
    setup() {
      sync();
      setup();
    },
    updateFacts() {
      sync();
      updateFacts();
    },
    updateStats() {
      sync();
      updateStats();
    },
  };
}
