import {
  ART_BACKGROUNDS,
  DEFAULT_STATS,
  THEMES,
  properties,
  stars,
} from '/shared/preview-config.mjs';
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
    `<label class="preview-option"><input type="checkbox" data-key="${key}" ${config[key] ? 'checked' : ''}><span>${title}</span></label>`;
  const input = (key, title, min, max, hint = '') =>
    `<label class="preview-number">${title}<input type="number" min="${min}" max="${max}" step="1" data-key="${key}" value="${config[key]}" aria-label="${title}">${hint ? '<small>' + hint + '</small>' : ''}</label>`;
  const textInput = (key, title, placeholder = '') =>
    `<label class="preview-text-field">${title}<input type="text" data-key="${key}" value="${esc(config[key] ?? '')}" placeholder="${esc(placeholder)}" aria-label="${title}"></label>`;
  const slider = (key, title, min, max, unit = '') =>
    `<div class="preview-slider">
      <div class="slider-row">
        <span>${title}</span>
        <output id="val-${key}">${config[key]}${unit}</output>
      </div>
      <input type="range" min="${min}" max="${max}" step="1" data-key="${key}" value="${config[key]}" aria-label="${title}">
    </div>`;
  const select = (key, title, choices) =>
    `<label class="preview-select">${title}<select data-key="${key}" aria-label="${title}">${choices.map(([value, text]) => `<option value="${value}" ${String(config[key]) === String(value) ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`;

  function setup() {
    const regions = data.regions.filter((r) => r.background_image);
    const bgChoices = [
      ...ART_BACKGROUNDS.map((a) => [a.id, '🎨 ' + a.name]),
      ...regions.map((r) => [String(r.id), '🏛️ Vùng đất: ' + r.name]),
      ['custom', '📁 Tải ảnh tùy chọn…'],
    ];
    const themeChoices = Object.values(THEMES).map((t) => [t.id, t.name]);
    const frameChoices = [
      ['modern', 'Bo góc mềm mại (Modern Glass)'],
      ['fantasy', 'Góc vát vương giả Teyvat (Chiseled RPG)'],
    ];

    controls.innerHTML = /* HTML */ ` <details class="preview-setting" open>
        <summary>Chủ đề màu sắc & Nghệ thuật</summary>
        <div class="setting-content">
          ${select('theme', 'Bảng màu & Phong cách nguyên tố', themeChoices)}
          ${select('frameStyle', 'Kiểu dáng khung viền', frameChoices)}
          <div class="preview-toggle-grid">
            ${toggle('vignette', 'Tối 4 góc điện ảnh (Vignette)')}
            ${toggle('cornerAccents', 'Họa tiết góc kim loại hoàng gia')}
            ${toggle('artifactCv', 'Chấm điểm CV Thánh di vật (Crit Value)')}
            ${toggle('crownBadge', 'Vương Miện Cấp 10 (Crown of Insight)')}
          </div>
          ${textInput('signature', 'Chữ ký / Danh ngôn cá nhân', 'Ví dụ: Main Hu Tao / F2P Wanderer')}
        </div>
      </details>

      <details class="preview-setting" open>
        <summary>Ảnh nền & Ghép ảnh nghệ thuật</summary>
        <div class="setting-content">
          ${select('background', 'Nền nghệ thuật', bgChoices)}
          <div
            id="preview-custom-bg-wrap"
            class="preview-upload-card"
            ${config.background === 'custom' || String(config.background).startsWith('data:image/') ? '' : 'style="display:none;"'}
          >
            <label class="upload-btn">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Chọn ảnh nền từ máy…</span>
              <input
                type="file"
                id="preview-bg-file"
                accept="image/png,image/jpeg,image/webp"
                style="display:none;"
              />
            </label>
            <small class="upload-hint"
              >PNG / JPG / WebP – Không gửi lên server, xử lý ngay tại máy.</small
            >
          </div>
          ${slider('bgBlur', 'Độ mờ nền (Blur)', 0, 20, 'px')}
          ${slider('bgDim', 'Độ tối tương phản (Dim)', 0, 90, '%')}
          <div class="preview-number-grid">
            ${textInput('code', 'Mã nhận diện (Badge)', '#1000')}
            ${textInput('watermark', 'Chữ Watermark chống trộm', 'CHECK BUILD UID')}
          </div>
        </div>
      </details>

      <details class="preview-setting" open>
        <summary>Hòm Cầu Nguyện & Pity (Wish Box)</summary>
        <div class="setting-content">
          ${toggle('wishBanner', 'Bật khung Pity & Mối Duyên')}
          <div id="preview-wish-options" ${config.wishBanner ? '' : 'style="display:none;"'}>
            ${select('wishPosition', 'Vị trí hiển thị hòm Cầu Nguyện', [
              ['above_weapon', 'Trên nóc bảng vũ khí (Sát khung nhân vật - Khuyên dùng)'],
              ['top_banner', 'Trên cùng (Cạnh thông tin người chơi)'],
            ])}

            <div class="pity-auto-box">
              <div class="pity-badge-row">
                <div class="pity-chip">
                  <div class="pity-chip-head">
                    <span class="pity-chip-label">PITY NHÂN VẬT</span>
                    <span
                      class="pity-chip-sub ${config.charGuaranteed ? 'guaranteed' : 'fifty'}"
                      id="pity-badge-guaranteed"
                    >
                      ${config.charGuaranteed ? 'Bảo hiểm' : '50/50'}
                    </span>
                  </div>
                  <div class="pity-chip-main">
                    <strong class="pity-chip-val" id="pity-badge-char"
                      >${config.charPity} / 90</strong
                    >
                  </div>
                </div>
                <div class="pity-chip">
                  <div class="pity-chip-head">
                    <span class="pity-chip-label">PITY VŨ KHÍ</span>
                  </div>
                  <div class="pity-chip-main">
                    <strong class="pity-chip-val" id="pity-badge-weapon"
                      >${config.weaponPity} / 80</strong
                    >
                  </div>
                </div>
                <div class="pity-chip">
                  <div class="pity-chip-head">
                    <span class="pity-chip-label">MỐI DUYÊN</span>
                  </div>
                  <div class="pity-chip-main">
                    <strong class="pity-chip-val" id="pity-badge-rolls">${config.rollsLeft}</strong>
                  </div>
                </div>
              </div>

              <div class="pity-source-label" id="pity-source-label">
                <svg
                  class="pity-icon-svg"
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span id="pity-source-text">Tự động gọi từ file JSON (bot / acc)</span>
              </div>

              <div class="pity-actions-row">
                <label class="pity-action-btn primary" for="preview-pity-file">
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <span>Nạp file JSON từ máy</span>
                </label>
                <input type="file" id="preview-pity-file" accept=".json" style="display:none;" />
                <button
                  type="button"
                  class="pity-action-btn secondary"
                  id="preview-pity-reload"
                  title="Tải lại dữ liệu Pity từ JSON của UID này"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path
                      d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
                    ></path>
                  </svg>
                  <span>Tải lại</span>
                </button>
              </div>
            </div>

            <details class="manual-pity-details">
              <summary>Chỉnh sửa thủ công (nếu cần)</summary>
              <div class="preview-number-grid">
                ${input('charPity', 'Pity Nhân vật', 0, 90)}
                <label class="preview-option check-guaranteed">
                  <input
                    type="checkbox"
                    data-key="charGuaranteed"
                    ${config.charGuaranteed ? 'checked' : ''}
                  />
                  <span>Bảo hiểm 50/50</span>
                </label>
              </div>
              <div class="preview-number-grid">
                ${input('weaponPity', 'Pity Vũ khí', 0, 80)}
                ${input('rollsLeft', 'Mối duyên còn lại', 0, 99999)}
              </div>
              ${input('monthCard', 'Ngày thẻ tháng còn lại', 0, 365, '0 = Không hiện')}
            </details>
          </div>
        </div>
      </details>

      <details class="preview-setting" open>
        <summary>Bố cục & Số lượng</summary>
        <div class="setting-content">
          ${toggle('account', 'Kèm tổng quan tài khoản')}
          ${select('sizePreset', 'Kích thước ảnh mẫu (Preset)', [
            ['auto', 'Mặc định (1600 × Tự động theo nội dung)'],
            ['1980x2040', '1980 × 2040 px (Khổ dọc lớn / Discord)'],
            ['1920x1080', '1920 × 1080 px (Khổ ngang Full HD 16:9)'],
            ['2560x1440', '2560 × 1440 px (Khổ ngang 2K QHD 16:9)'],
            ['1080x1920', '1080 × 1920 px (Khổ dọc Story/Shorts 9:16)'],
            ['2048x2048', '2048 × 2048 px (Khổ vuông 1:1)'],
            ['custom', 'Tùy chỉnh kích thước (Nhập pixel tự do)'],
          ])}
          <div class="preview-number-grid">
            ${input('imageWidth', 'Chiều rộng ảnh (px)', 800, 3840, 'Kéo béo / rộng ra')}${input('imageHeight', 'Chiều dài/cao ảnh (px)', 0, 5000, '0 = Tự động kéo dài')}
          </div>
          ${select('width', 'Độ phân giải PNG (khi chọn Mặc định)', [
            [1200, '1200 px (Gọn nhẹ)'],
            [1600, '1600 px (Chuẩn nét)'],
            [2400, '2400 px (2K Sắc nét)'],
            [3200, '3200 px (4K Ultra HD)'],
          ])}
          ${select('weaponAlign', 'Vị trí căn lề bảng vũ khí', [
            ['bottom', 'Căn bằng lề dưới với nhân vật (Cùng lề dưới, cân xứng)'],
            ['top', 'Căn sát phía trên (Dưới hòm Cầu Nguyện)'],
          ])}
          <fieldset>
            <legend>Nhân vật (${data.characters?.length ?? 0})</legend>
            ${toggle('characters', 'Hiện danh sách nhân vật')}${toggle('charCount', 'Hiện số lượng trong tiêu đề')}${toggle('collectionHeader', 'Hiện khung tiêu đề phụ BỘ SƯU TẬP')}
            <div class="limit-picker-wrap">
              <span class="limit-label">Bố cục hàng nhân vật:</span>
              <div class="quick-pill-group" data-target="charGridMode">
                <button
                  type="button"
                  class="quick-pill ${config.charGridMode === 'balanced' ? 'active' : ''}"
                  data-val="balanced"
                >
                  ✓ Cân đối (Đủ 7 ô/hàng)
                </button>
                <button
                  type="button"
                  class="quick-pill ${config.charGridMode === 'full' ? 'active' : ''}"
                  data-val="full"
                >
                  Hiển thị Full (Tất cả)
                </button>
              </div>
            </div>
            <div class="limit-picker-wrap">
              <span class="limit-label">Số hàng ngang nhân vật muốn hiển thị:</span>
              <div class="quick-pill-group" data-target="charRows">
                <button
                  type="button"
                  class="quick-pill ${config.charRows === 0 ? 'active' : ''}"
                  data-val="0"
                >
                  Tất cả hàng
                </button>
                <button
                  type="button"
                  class="quick-pill ${config.charRows === 1 ? 'active' : ''}"
                  data-val="1"
                >
                  1 hàng (7 ô)
                </button>
                <button
                  type="button"
                  class="quick-pill ${config.charRows === 2 ? 'active' : ''}"
                  data-val="2"
                >
                  2 hàng (14 ô)
                </button>
                <button
                  type="button"
                  class="quick-pill ${config.charRows === 3 ? 'active' : ''}"
                  data-val="3"
                >
                  3 hàng (21 ô)
                </button>
                <button
                  type="button"
                  class="quick-pill ${config.charRows === 4 ? 'active' : ''}"
                  data-val="4"
                >
                  4 hàng (28 ô)
                </button>
              </div>
            </div>
            <div class="preview-number-grid">
              ${input('charRows', 'Số hàng ngang nhân vật', 0, 20, '0 = tất cả')}${input('charCols', 'Số cột mỗi hàng', 1, 12)}
            </div>
            ${select('charSort', 'Sắp xếp nhân vật', [
              ['prestige', '5 sao C6 ưu tiên (Mạnh nhất)'],
              ['rarity', 'Độ hiếm: 5 sao -> 4 sao'],
              ['level', 'Cấp cao nhất'],
              ['constellation', 'Cung mệnh cao nhất'],
              ['name', 'Tên A-Z'],
            ])}${select('charRarity', 'Lọc nhân vật', [
              ['all', 'Tất cả độ hiếm'],
              ['five', 'Chỉ 5 sao'],
              ['four', 'Chỉ 4 sao'],
            ])}
          </fieldset>
          <fieldset>
            <legend>
              Vũ khí trang bị (${data.characters?.filter((x) => x.weapon?.id)?.length ?? 0})
            </legend>
            ${toggle('weapons', 'Hiện vũ khí đang trang bị')}${toggle('weaponCount', 'Hiện số lượng trong tiêu đề')}
            <div class="limit-picker-wrap">
              <span class="limit-label">Bố cục hàng vũ khí:</span>
              <div class="quick-pill-group" data-target="weaponGridMode">
                <button
                  type="button"
                  class="quick-pill ${config.weaponGridMode === 'balanced' ? 'active' : ''}"
                  data-val="balanced"
                >
                  ✓ Cân đối (Đủ 14 ô/hàng)
                </button>
                <button
                  type="button"
                  class="quick-pill ${config.weaponGridMode === 'full' ? 'active' : ''}"
                  data-val="full"
                >
                  Hiển thị Full (Tất cả)
                </button>
              </div>
            </div>
            <div class="limit-picker-wrap">
              <span class="limit-label">Số hàng ngang vũ khí muốn hiển thị:</span>
              <div class="quick-pill-group" data-target="weaponRows">
                <button
                  type="button"
                  class="quick-pill ${config.weaponRows === 0 ? 'active' : ''}"
                  data-val="0"
                >
                  Tất cả hàng
                </button>
                <button
                  type="button"
                  class="quick-pill ${config.weaponRows === 1 ? 'active' : ''}"
                  data-val="1"
                >
                  1 hàng (14 ô)
                </button>
                <button
                  type="button"
                  class="quick-pill ${config.weaponRows === 2 ? 'active' : ''}"
                  data-val="2"
                >
                  2 hàng (28 ô)
                </button>
                <button
                  type="button"
                  class="quick-pill ${config.weaponRows === 3 ? 'active' : ''}"
                  data-val="3"
                >
                  3 hàng (42 ô)
                </button>
                <button
                  type="button"
                  class="quick-pill ${config.weaponRows === 4 ? 'active' : ''}"
                  data-val="4"
                >
                  4 hàng (56 ô)
                </button>
              </div>
            </div>
            <div class="preview-number-grid">
              ${input('weaponRows', 'Số hàng ngang vũ khí', 0, 20, '0 = tất cả')}${input('weaponCols', 'Số cột mỗi hàng', 1, 16)}
            </div>
            ${select('weaponSort', 'Sắp xếp vũ khí', [
              ['rarity', 'Độ hiếm: 5 sao -> 4 sao'],
              ['level', 'Cấp cao nhất'],
              ['refinement', 'Tinh luyện cao nhất'],
              ['name', 'Tên A-Z'],
            ])}${select('weaponRarity', 'Lọc vũ khí', [
              ['all', 'Tất cả độ hiếm'],
              ['five', 'Chỉ 5 sao'],
              ['four', 'Chỉ 4 sao'],
              ['three', 'Chỉ 3 sao'],
            ])}
          </fieldset>
        </div>
      </details>

      <details class="preview-setting">
        <summary>Hồ sơ & Nội dung trên thẻ</summary>
        <div class="setting-content preview-toggle-grid">
          ${toggle('name', 'Tên người chơi')}${toggle('uid', 'UID')}${toggle('ar', 'Hạng mạo hiểm')}${toggle('server', 'Máy chủ')}${toggle('avatar', 'Ảnh đại diện')}${toggle('updated', 'Thời điểm đồng bộ')}${toggle('levels', 'Cấp trên thẻ')}${toggle('constellations', 'Cung mệnh trên thẻ')}${toggle('refinements', 'Tinh luyện vũ khí')}${toggle('elements', 'Icon nguyên tố')}${toggle('weaponOwner', 'Chủ nhân vũ khí')}${toggle('stars', 'Số sao')}
        </div>
      </details>

      <details class="preview-setting">
        <summary>Độ hiếm & Cung mệnh</summary>
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

      <details class="preview-setting" open>
        <summary>Tiến độ khám phá thế giới</summary>
        <div class="setting-content">
          ${toggle('maps', 'Kèm tiến độ khám phá')}
          ${select('mapStyle', 'Kiểu hiển thị bản đồ', [
            ['square', 'Bảng vuông nhỏ gọn (Khuyên dùng - Cạnh banner)'],
            ['compact', 'Dải ngang thu gọn 3 hàng'],
            ['classic', 'Toàn cảnh thẻ lớn (Cổ điển)'],
          ])}
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

      <details class="preview-setting">
        <summary>Build nhân vật chuyên sâu</summary>
        <div class="setting-content">
          ${toggle('builds', 'Kèm chỉ số nhân vật')}
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
