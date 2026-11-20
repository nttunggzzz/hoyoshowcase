/**
 * Honkai: Star Rail Showcase Controller & View Renderer
 */

const el = (id) => document.getElementById(id);
const escape = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const asset = (url) => {
  if (typeof url === 'string' && /^\/assets\/native\/[A-Za-z0-9_.-]+\.png$/.test(url)) return url;
  try {
    const u = new URL(url);
    const isAllowedHost =
      ['act-webstatic.hoyoverse.com', 'fastcdn.hoyoverse.com'].includes(u.hostname) ||
      (u.hostname === 'cdn.jsdelivr.net' &&
        /^\/gh\/Mar-7th\/StarRailRes(@[^/]+)?\/icon\//.test(u.pathname)) ||
      (u.hostname === 'raw.githubusercontent.com' &&
        /^\/Mar-7th\/StarRailRes\/[^/]+\/icon\//.test(u.pathname));
    return u.protocol === 'https:' && isAllowedHost ? u.href : '';
  } catch {
    return '';
  }
};

const img = (url, alt = '', className = '') => {
  const src = asset(url);
  if (!src) return '';
  return `<img src="${escape(src)}" alt="${escape(alt)}" class="${className}" loading="lazy" decoding="async">`;
};

const ELEMENTS = {
  All: 'Tất cả Thuộc Tính',
  Fire: 'Hỏa (Fire)',
  Ice: 'Băng (Ice)',
  Thunder: 'Lôi (Lightning)',
  Wind: 'Phong (Wind)',
  Physical: 'Vật Lý (Physical)',
  Quantum: 'Lượng Tử (Quantum)',
  Imaginary: 'Số Ảo (Imaginary)',
};

const PATHS = {
  All: 'Tất cả Vận Mệnh',
  Destruction: 'Hủy Diệt',
  TheHunt: 'Săn Bắn',
  Erudition: 'Tri Thức',
  Harmony: 'Hòa Hợp',
  Nihility: 'Hư Vô',
  Preservation: 'Bảo Hộ',
  Abundance: 'Trù Phú',
  Remembrance: 'Ký Ức',
};

function notify(text) {
  const n = el('showcase-notice');
  if (!n) return;
  n.textContent = text;
  n.hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => (n.hidden = true), 4500);
}

let hsrModel = null,
  elementFilter = 'All',
  pathFilter = 'All',
  searchQuery = '',
  listenersReady = false;

export function getHsrModel() {
  return hsrModel;
}

export function initHsrShowcase() {
  if (!listenersReady) {
    setupEventListeners();
    listenersReady = true;
  }
  renderFilterBars();
  loadSavedHsr();
}

function renderFilterBars() {
  const elemWrap = el('hsr-element-filters');
  if (elemWrap) {
    elemWrap.innerHTML = Object.entries(ELEMENTS)
      .map(
        ([key, label]) =>
          `<button class="hsr-filter-pill ${key === elementFilter ? 'active' : ''}" data-elem="${key}">${escape(label)}</button>`,
      )
      .join('');
  }

  const pathWrap = el('hsr-path-filters');
  if (pathWrap) {
    pathWrap.innerHTML = Object.entries(PATHS)
      .map(
        ([key, label]) =>
          `<button class="hsr-filter-pill ${key === pathFilter ? 'active' : ''}" data-path="${key}">${escape(label)}</button>`,
      )
      .join('');
  }
}

function setupEventListeners() {
  const elemWrap = el('hsr-element-filters');
  if (elemWrap) {
    elemWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-elem]');
      if (!btn) return;
      elementFilter = btn.dataset.elem;
      elemWrap
        .querySelectorAll('.hsr-filter-pill')
        .forEach((b) => b.classList.toggle('active', b === btn));
      renderRoster();
    });
  }

  const pathWrap = el('hsr-path-filters');
  if (pathWrap) {
    pathWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-path]');
      if (!btn) return;
      pathFilter = btn.dataset.path;
      pathWrap
        .querySelectorAll('.hsr-filter-pill')
        .forEach((b) => b.classList.toggle('active', b === btn));
      renderRoster();
    });
  }

  const searchInput = el('hsr-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLocaleLowerCase();
      renderRoster();
    });
  }

  const grid = el('hsr-roster-grid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('[data-character]');
      if (card) openHsrCharacter(Number(card.dataset.character));
    });
    grid.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('[data-character]');
        if (card) {
          e.preventDefault();
          openHsrCharacter(Number(card.dataset.character));
        }
      }
    });
    grid.addEventListener(
      'error',
      (e) => {
        if (e.target?.tagName === 'IMG') {
          e.target.style.display = 'none';
        }
      },
      true,
    );
  }

  window.addEventListener('hsr:open-character', (e) => {
    if (e.detail?.id != null) openHsrCharacter(Number(e.detail.id));
  });

  const exportBtn = el('hsr-export');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = '/api/showcase/archive/hsr';
      a.download = `battle-chronicle-hsr-${hsrModel?.profile?.uid || 'latest'}.json`;
      a.click();
    });
  }

  const importInput = el('hsr-import');
  if (importInput) {
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const snap = JSON.parse(text);
        let csrf = '';
        try {
          const sRes = await fetch('/api/session');
          const sData = await sRes.json();
          csrf = sData.csrf;
        } catch {}
        const res = await fetch('/api/showcase/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-poc-csrf': csrf,
          },
          body: JSON.stringify(snap),
        });
        const data = await res.json();
        if (data?.ok && data.view) {
          renderHsr(data.view);
          window.dispatchEvent(new CustomEvent('hsr:update-data', { detail: data.view }));
          window.dispatchEvent(new CustomEvent('hsr:rendered', { detail: data.view }));
          notify('Đã nạp tệp dữ liệu Star Rail thành công!');
        } else {
          notify('Lỗi nạp tệp: ' + (data?.error || 'Định dạng JSON không hợp lệ'));
        }
      } catch (err) {
        notify('Lỗi đọc tệp JSON: ' + (err.message || err));
      } finally {
        importInput.value = '';
      }
    });
  }

  window.addEventListener('hsr:update-data', (e) => {
    if (e.detail) renderHsr(e.detail);
  });
}

export function loadSavedHsr() {
  fetch('/api/showcase/saved/hsr')
    .then((r) => r.json())
    .then((j) => {
      if (j?.view?.game === 'hsr') {
        renderHsr(j.view);
      } else {
        showEmptyProfile();
      }
    })
    .catch(() => {
      showEmptyProfile();
    });
}

function showEmptyProfile() {
  const nameEl = el('hsr-profile-name');
  if (nameEl) nameEl.textContent = 'Chưa có hồ sơ Star Rail';
  const metaEl = el('hsr-profile-meta');
  if (metaEl)
    metaEl.textContent = 'Mở mục Tài khoản để đồng bộ hoặc nhập Cookie HoYoLAB có nhân vật HSR.';
  const freshness = el('hsr-freshness');
  if (freshness) freshness.textContent = 'Chưa có bản dữ liệu đã lưu';
}

export function renderHsr(model) {
  if (!model || model.game !== 'hsr') return;
  hsrModel = model;

  const prof = model.profile || {};
  const stats = model.stats || {};

  if (el('hsr-profile-name')) el('hsr-profile-name').textContent = prof.nickname || 'Nhà Khai Phá';
  if (el('hsr-profile-meta'))
    el('hsr-profile-meta').textContent = `UID: ${prof.uid || '-'} · Máy chủ: ${prof.server || '-'}`;
  if (el('hsr-freshness'))
    el('hsr-freshness').textContent = model.saved
      ? 'Đang mở bản Star Rail đã lưu'
      : 'Vừa đồng bộ trực tiếp';

  if (el('hsr-stat-level'))
    el('hsr-stat-level').textContent = `Lv. ${prof.level || stats.level || 70}`;
  if (el('hsr-stat-days')) el('hsr-stat-days').textContent = `${stats.activeDays || 0} ngày`;
  if (el('hsr-stat-avatars'))
    el('hsr-stat-avatars').textContent = String(model.characters?.length || 0);
  if (el('hsr-stat-achievements'))
    el('hsr-stat-achievements').textContent = String(stats.achievementNum || 0);
  if (el('hsr-stat-moc')) el('hsr-stat-moc').textContent = stats.abyssProcess || 'Chưa tham gia';

  renderRoster();
  window.dispatchEvent(new CustomEvent('hsr:rendered', { detail: model }));
  window.dispatchEvent(new CustomEvent('showcase:rendered', { detail: model }));
}

export function openHsrCharacter(id) {
  const c = hsrModel?.characters?.find((x) => x.id === id);
  if (!c) return;

  const w = c.equip || c.weapon;
  const props = c.properties || [];
  const propertyLabels = {
    2000: 'HP tối đa',
    2001: 'Tấn công',
    2002: 'Phòng ngự',
    2003: 'Tốc độ',
    20: 'Tỷ lệ bạo kích',
    22: 'ST bạo kích',
    24: 'Tấn công kích phá',
    25: 'Tăng ST thuộc tính',
  };

  const relicPosName = (pos) => {
    switch (pos) {
      case 1:
        return 'Đầu (Head)';
      case 2:
        return 'Tay (Hands)';
      case 3:
        return 'Thân (Body)';
      case 4:
        return 'Chân (Feet)';
      case 5:
        return 'Quả Cầu Vị Diện';
      case 6:
        return 'Dây Liên Kết';
      default:
        return 'Di vật';
    }
  };

  const dialogContent = el('character-content');
  if (!dialogContent) return;

  dialogContent.innerHTML = `
    <div class="detail-top">
      <div class="detail-art">
        ${img(c.image || c.icon, c.name)}
      </div>
      <div class="detail-info">
        <p class="eyebrow">${escape(c.path || 'Vận Mệnh')} · ${escape(c.element || 'Thuộc Tính')} / ${c.rarity} SAO</p>
        <h2 id="character-dialog-title">${escape(c.name)}</h2>
        <p class="detail-subtitle">Cấp ${c.level} / Tinh Hồn E${c.rank ?? 0} · Honkai: Star Rail</p>
        <div class="stat-grid">
          ${props
            .map(
              (p) => `
            <div class="stat-item">
              <span>${escape(propertyLabels[p.property_type] || 'Chỉ số ' + p.property_type)}</span>
              <strong>${escape(p.final)}</strong>
            </div>
          `,
            )
            .join('')}
        </div>
        <div class="constellations">
          ${(c.constellations || [])
            .map(
              (x) => `
            <span class="${x.is_actived ? 'unlocked' : ''}" title="${escape(x.name)}: ${escape(x.effect)}">
              <span class="hsr-eidolon-chip ${x.is_actived ? 'active' : ''}">E${x.pos}</span>
            </span>
          `,
            )
            .join('')}
        </div>
      </div>
    </div>
    <div class="detail-lower">
      ${
        w
          ? `
        <div class="detail-weapon">
          ${img(w.icon, w.name)}
          <div>
            <p class="eyebrow">NÓN ÁNH SÁNG TRANG BỊ</p>
            <h4>${escape(w.name)}</h4>
            <p>Cấp ${w.level} / Tích Lũy S${w.rank || 1}</p>
          </div>
          <div class="weapon-stats">
            <div><strong>${w.rarity}★</strong><span>Độ hiếm</span></div>
            <div><strong>S${w.rank || 1}</strong><span>Tích lũy</span></div>
            <div><strong>Lv. ${w.level}</strong><span>Cấp độ</span></div>
          </div>
        </div>
      `
          : '<p class="muted">Chưa trang bị Nón Ánh Sáng.</p>'
      }
      <h3>Di vật & Phụ kiện Vị diện (${c.relics?.length ?? 0}/6)</h3>
      <div class="relic-grid">
        ${
          (c.relics || [])
            .map(
              (r) => `
          <article class="relic ${r.pos > 4 ? 'ornament' : 'relic'}">
            ${img(r.icon, r.name)}
            <h4>${escape(r.name)} +${r.level}</h4>
            <div class="relic-main">${r.pos > 4 ? 'Phụ kiện vị diện' : 'Di vật'} (${r.rarity}★)</div>
            <p><span>Vị trí</span><span>${relicPosName(r.pos)}</span></p>
          </article>
        `,
            )
            .join('') || '<p class="muted">Chưa có di vật nào được trang bị.</p>'
        }
      </div>
      <div class="skill-list">
        ${(c.skills || [])
          .map(
            (s) => `
          <div class="skill">
            <div class="skill-icon-wrap">${img(s.icon, s.name)}</div>
            <div><p>${escape(s.name)}</p><strong>Cấp ${s.level}</strong></div>
          </div>
        `,
          )
          .join('')}
      </div>
    </div>
  `;

  dialogContent.addEventListener(
    'error',
    (e) => {
      if (e.target?.tagName === 'IMG') {
        e.target.style.display = 'none';
      }
    },
    true,
  );

  const dialog = el('character-dialog');
  if (dialog && !dialog.open) dialog.showModal();
}

function renderRoster() {
  const grid = el('hsr-roster-grid');
  const empty = el('hsr-roster-empty');
  const countBadge = el('hsr-roster-total');
  if (!grid) return;

  if (!hsrModel || !Array.isArray(hsrModel.characters)) {
    grid.innerHTML = '';
    if (empty) empty.hidden = false;
    if (countBadge) countBadge.textContent = '0';
    return;
  }

  let list = hsrModel.characters.filter((c) => {
    const elemNorm = (c.element || '').toLowerCase();
    const filterElemNorm = elementFilter.toLowerCase();
    const matchElem =
      elementFilter === 'All' ||
      elemNorm === filterElemNorm ||
      (filterElemNorm === 'thunder' && elemNorm === 'lightning') ||
      (filterElemNorm === 'lightning' && elemNorm === 'thunder');

    const pathNorm = (c.path || '').toLowerCase().replace(/\s+/g, '');
    const filterPathNorm = pathFilter.toLowerCase().replace(/\s+/g, '');
    const matchPath =
      pathFilter === 'All' || pathNorm === filterPathNorm || pathNorm.includes(filterPathNorm);

    const matchSearch =
      !searchQuery || `${c.name} ${c.equip?.name ?? ''}`.toLowerCase().includes(searchQuery);
    return matchElem && matchPath && matchSearch;
  });

  // Sort: 5★ first, then by level descending, then rank descending
  list.sort((a, b) => b.rarity - a.rarity || b.level - a.level || b.rank - a.rank);

  if (countBadge) countBadge.textContent = String(list.length);
  if (empty) empty.hidden = list.length > 0;

  grid.innerHTML = list
    .map((c) => {
      const isFiveStar = c.rarity >= 5;
      const rankBadge = `<span class="hsr-eidolon-badge">E${c.rank ?? 0}</span>`;
      const levelBadge = `<span class="hsr-card-level">Lv. ${c.level}</span>`;
      const rarityStars = '★'.repeat(c.rarity || 4);

      const lightConeHtml = c.equip
        ? `<div class="hsr-lc-box">
             <div class="hsr-lc-icon">
               <span class="hsr-lc-fallback" aria-hidden="true">✦</span>
               ${img(c.equip.icon, c.equip.name)}
             </div>
             <div class="hsr-lc-info">
               <span class="hsr-lc-name">${escape(c.equip.name)}</span>
               <span class="hsr-lc-meta">Lv. ${c.equip.level} · <strong>S${c.equip.rank || 1}</strong></span>
             </div>
           </div>`
        : `<div class="hsr-lc-box empty"><span class="hsr-lc-none">Chưa trang bị Nón Ánh Sáng</span></div>`;

      const relicsHtml =
        Array.isArray(c.relics) && c.relics.length
          ? `<div class="hsr-relics-strip" title="Di vật & Phụ kiện">
              ${c.relics
                .slice(0, 6)
                .map(
                  (r) =>
                    `<span class="hsr-relic-dot ${r.pos > 4 ? 'ornament' : 'relic'}"><span class="hsr-relic-fallback" aria-hidden="true">◆</span>${img(r.icon, r.name)}</span>`,
                )
                .join('')}
             </div>`
          : '';

      return `
        <div class="hsr-character-card ${isFiveStar ? 'rarity-5' : 'rarity-4'}" data-character="${c.id}" role="button" tabindex="0" title="Nhấp để xem chi tiết ${escape(c.name)}">
          <div class="hsr-card-banner">
            <div class="hsr-avatar-frame">
              <span class="hsr-avatar-fallback" aria-hidden="true">${escape(c.name.charAt(0))}</span>
              ${img(c.icon, c.name, 'hsr-avatar-img')}
              ${rankBadge}
              ${levelBadge}
            </div>
            <div class="hsr-char-meta">
              <h3 class="hsr-char-name">${escape(c.name)}</h3>
              <div class="hsr-tag-row">
                <span class="hsr-tag elem">${escape(c.element || 'Unknown')}</span>
                <span class="hsr-tag path">${escape(c.path || 'Vận Mệnh')}</span>
                <span class="hsr-tag stars">${rarityStars}</span>
              </div>
            </div>
          </div>
          ${lightConeHtml}
          ${relicsHtml}
        </div>
      `;
    })
    .join('');
}
