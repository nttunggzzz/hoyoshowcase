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
    return u.protocol === 'https:' &&
      ['act-webstatic.hoyoverse.com', 'fastcdn.hoyoverse.com'].includes(u.hostname)
      ? u.href
      : '';
  } catch {
    return '';
  }
};

const img = (url, alt = '', className = '') => {
  const src = asset(url);
  if (!src) return '';
  return `<img src="${escape(src)}" alt="${escape(alt)}" class="${className}" loading="lazy" decoding="async" onerror="this.onerror=null;this.remove();">`;
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

  const exportBtn = el('hsr-export');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (!hsrModel) return;
      const blob = new Blob([JSON.stringify(hsrModel, null, 2)], {
        type: 'application/json; charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hsr-battle-chronicle-${hsrModel.profile?.uid || 'latest'}.json`;
      a.click();
      URL.revokeObjectURL(url);
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
        <div class="hsr-character-card ${isFiveStar ? 'rarity-5' : 'rarity-4'}">
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
