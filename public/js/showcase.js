import { GAME_ASSETS } from './game-assets.js';
import { initHsrShowcase } from './hsr/showcase.js';
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
const img = (url, alt = '', className = '') =>
  asset(url)
    ? `<img src="${escape(asset(url))}" alt="${escape(alt)}" class="${className}" loading="lazy" decoding="async">`
    : '';
const number = (n) =>
  n === undefined || n === null ? '-' : new Intl.NumberFormat('vi-VN').format(n);
const plain = (s) =>
  String(s ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
const elements = {
  All: 'Tất cả',
  Pyro: 'Hỏa',
  Hydro: 'Thủy',
  Anemo: 'Phong',
  Electro: 'Lôi',
  Dendro: 'Thảo',
  Cryo: 'Băng',
  Geo: 'Nham',
};
let model = null,
  csrfToken = '',
  session = null,
  heroId = null,
  filter = 'All',
  search = '',
  sort = 'level',
  mode = 'characters',
  visible = 18,
  viewBusy = false,
  lastViewKey = '',
  lastJob = null,
  regionsExpanded = false,
  initialAnchorHandled = false;
try {
  document.documentElement.dataset.theme = localStorage.getItem('genshin.showcase.theme') || 'dark';
} catch {}
function themeLabel() {
  el('theme-toggle').textContent =
    document.documentElement.dataset.theme === 'dark' ? 'Sáng' : 'Tối';
}
themeLabel();
el('theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem('genshin.showcase.theme', next);
  } catch {}
  themeLabel();
});
function notify(text) {
  el('showcase-notice').textContent = text;
  el('showcase-notice').hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => (el('showcase-notice').hidden = true), 4500);
}
function openConsole() {
  el('collector-console').showModal();
}
for (const id of ['connect-open', 'progress-open', 'showcase-refresh'])
  el(id).addEventListener('click', openConsole);
el('collector-close').addEventListener('click', () => el('collector-console').close());
el('character-close').addEventListener('click', () => el('character-dialog').close());
for (const id of ['character-dialog', 'collector-console'])
  el(id).addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (
      e.target === e.currentTarget &&
      (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
    )
      e.currentTarget.close();
  });
document.querySelectorAll('.topbar nav a').forEach((a) =>
  a.addEventListener('click', () => {
    const parentNav = a.closest('nav');
    if (parentNav) {
      parentNav.querySelectorAll('a').forEach((x) => x.classList.toggle('active', x === a));
    }
  }),
);

export function switchGame(game) {
  const isHsr = game === 'hsr';
  const genshinBtn = el('game-btn-genshin');
  const hsrBtn = el('game-btn-hsr');
  const genshinMain = el('showcase-main');
  const hsrMain = el('hsr-showcase-main');
  const genshinNav = el('topbar-nav-genshin');
  const hsrNav = el('topbar-nav-hsr');
  const brandTitle = el('brand-title');
  const brandSub = el('brand-sub');

  if (genshinBtn) {
    genshinBtn.classList.toggle('active', !isHsr);
    genshinBtn.setAttribute('aria-selected', !isHsr ? 'true' : 'false');
  }
  if (hsrBtn) {
    hsrBtn.classList.toggle('active', isHsr);
    hsrBtn.setAttribute('aria-selected', isHsr ? 'true' : 'false');
  }

  if (genshinMain) genshinMain.hidden = isHsr;
  if (hsrMain) hsrMain.hidden = !isHsr;
  if (genshinNav) genshinNav.hidden = isHsr;
  if (hsrNav) hsrNav.hidden = !isHsr;

  if (brandTitle && brandSub) {
    if (isHsr) {
      brandTitle.textContent = 'ASTRAL';
      brandSub.textContent = 'EXPRESS';
    } else {
      brandTitle.textContent = 'TEYVAT';
      brandSub.textContent = 'ARCHIVE';
    }
  }

  try {
    localStorage.setItem('hoyoshowcase.activeGame', game);
  } catch {}

  if (isHsr) {
    initHsrShowcase();
  }
}

const gameBtnGenshin = el('game-btn-genshin');
const gameBtnHsr = el('game-btn-hsr');
if (gameBtnGenshin) gameBtnGenshin.addEventListener('click', () => switchGame('genshin'));
if (gameBtnHsr) gameBtnHsr.addEventListener('click', () => switchGame('hsr'));

try {
  const activeGame = localStorage.getItem('hoyoshowcase.activeGame');
  if (activeGame === 'hsr') {
    switchGame('hsr');
  }
} catch {}
el('showcase-export').addEventListener('click', () => {
  if (!model) return notify('Kết nối HoYoLAB để lấy dữ liệu trước.');
  if (lastJob?.hasSnapshot && !el('collector-download').disabled) el('collector-download').click();
  else {
    const a = document.createElement('a');
    a.href = '/api/showcase/archive/genshin';
    a.download = `battle-chronicle-genshin-${model.profile?.uid || 'latest'}.json`;
    a.click();
  }
});

const showcaseImport = el('showcase-import');
if (showcaseImport) {
  showcaseImport.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const snap = JSON.parse(text);
      let csrf = csrfToken;
      if (!csrf) {
        try {
          const sRes = await fetch('/api/session');
          const sData = await sRes.json();
          csrf = sData.csrf;
          csrfToken = csrf;
        } catch {}
      }
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
        renderShowcase(data.view);
        window.dispatchEvent(new CustomEvent('showcase:rendered', { detail: data.view }));
        notify('Đã nạp tệp dữ liệu Genshin Impact thành công!');
      } else {
        notify('Lỗi nạp tệp: ' + (data?.error || 'Định dạng JSON không hợp lệ'));
      }
    } catch (err) {
      notify('Lỗi đọc tệp JSON: ' + (err.message || err));
    } finally {
      showcaseImport.value = '';
    }
  });
}
window.addEventListener('chronicle:session', (e) => {
  session = e.detail.status;
  csrfToken = e.detail.csrf || csrfToken;
  const running = e.detail.polling;
  el('showcase-refresh').disabled = running || e.detail.busy;
  el('showcase-refresh').innerHTML = running
    ? 'Đang đồng bộ…'
    : 'Đồng bộ dữ liệu <span aria-hidden="true">↻</span>';
});
window.addEventListener('chronicle:collection', (e) => {
  lastJob = e.detail;
  const j = e.detail;
  if (j.state === 'running') {
    el('showcase-freshness').textContent =
      `Đang cập nhật ${j.modules.filter((x) => ['ok', 'not_applicable'].includes(x.state)).length}/${j.modules.length} mục`;
    el('data-status').textContent =
      'Bạn có thể xem bộ sưu tập trong lúc dữ liệu tiếp tục cập nhật.';
  }
  const key = `${j.id}:${j.requestCount}:${j.state}`;
  if (j.hasSnapshot && key !== lastViewKey) {
    lastViewKey = key;
    loadCurrentView().catch((err) => notify(err.message));
  }
});
async function loadCurrentView() {
  if (viewBusy || !csrfToken) return;
  viewBusy = true;
  try {
    const r = await fetch('/api/collector/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-poc-csrf': csrfToken },
        body: '{}',
      }),
      j = await r.json();
    if (j.error) throw Error(j.error);
    if (j.view?.characters.length) render(j.view);
  } finally {
    viewBusy = false;
  }
}
function render(next) {
  const changed = model?.id !== next.id;
  next.regions = next.regions.map((r) => {
    const art = GAME_ASSETS.regions?.[r.id];
    return art
      ? {
          ...r,
          name: GAME_ASSETS.labels[r.name] || r.name,
          offerings: (r.offerings ?? []).map((o) => ({
            ...o,
            name: GAME_ASSETS.labels[o.name] || o.name,
          })),
          background_image: art.scene,
          cover: art.card,
          icon: art.icon,
        }
      : r;
  });
  model = next;
  const profile = next.profile,
    stats = next.stats;
  el('profile-name').textContent = profile.nickname || 'Nhà lữ hành';
  el('profile-meta').textContent =
    `UID ${next.role.uid}   /   ${next.role.server === 'os_asia' ? 'Máy chủ Châu Á' : next.role.server}   /   Hạng mạo hiểm ${profile.level ?? '-'}`;
  if (next.state !== 'running')
    el('showcase-freshness').textContent =
      `${next.saved ? 'Bản đã lưu' : 'Đã đồng bộ'}: ${new Date(next.updatedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
  const fallback = [...next.characters].sort((a, b) => b.level - a.level || b.rarity - a.rarity)[0];
  if (changed || !next.characters.some((c) => c.id === heroId)) {
    let saved;
    try {
      saved = Number(localStorage.getItem(`genshin.showcase.hero.${next.role.uid}`));
    } catch {}
    heroId = next.characters.some((c) => c.id === saved)
      ? saved
      : (next.characters.find((c) => c.id === 10000052)?.id ?? fallback?.id);
  }
  renderHero();
  el('hero-stats').innerHTML = [
    [next.characters.length, 'Nhân vật đồng hành'],
    [stats.active_day_number, 'Ngày hoạt động'],
    [stats.achievement_number, 'Thành tựu'],
    [stats.way_point_number, 'Điểm dịch chuyển'],
  ]
    .map(([n, label]) => `<div><strong>${number(n)}</strong><span>${label}</span></div>`)
    .join('');
  const n = next.notes;
  el('daily-panel').innerHTML = [
    ['◈', 'Nhựa nguyên chất', n.current_resin, n.max_resin],
    ['◇', 'Ủy thác hàng ngày', n.finished_task_num, n.total_task_num],
    ['⌁', 'Thám hiểm', n.current_expedition_num, n.max_expedition_num],
    ['⌂', 'Tiền động tiên', n.current_home_coin, n.max_home_coin],
  ]
    .map(
      ([symbol, label, current, max]) =>
        `<div class="daily-item"><span class="daily-symbol" aria-hidden="true">${symbol}</span><div><p>${label}</p><strong>${number(current)} <small>/ ${number(max)}</small></strong></div></div>`,
    )
    .join('');
  renderRoster();
  renderWorld();
  window.dispatchEvent(new CustomEvent('showcase:rendered', { detail: next }));
  const done = next.modules.filter((m) => m.state === 'ok').length,
    total = next.modules.filter((m) => m.state !== 'not_applicable').length;
  el('data-status').textContent =
    next.state === 'running'
      ? 'Đang cập nhật. Dữ liệu sẽ xuất hiện khi từng phần hoàn tất.'
      : `${done}/${total} mục đã lấy. Nhân vật và trang bị được lưu cùng hồ sơ của bạn.`;
  if (!initialAnchorHandled) {
    initialAnchorHandled = true;
    if (['#overview', '#collection', '#account-preview', '#exploration'].includes(location.hash))
      requestAnimationFrame(() =>
        el(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant', block: 'start' }),
      );
  }
}
function renderHero() {
  const c = model.characters.find((c) => c.id === heroId);
  if (!c) return;
  el('hero').classList.remove('skeleton');
  el('hero-name').textContent = c.name;
  el('hero-kicker').textContent = 'NHÂN VẬT NỔI BẬT';
  el('hero-caption').textContent =
    `Cấp ${c.level} / ${elements[c.element] || c.element} / Cung mệnh ${c.actived_constellation_num ?? 0}`;
  const url = asset(c.image) || asset(c.icon);
  if (el('hero-image').getAttribute('src') !== url) el('hero-image').src = url;
  el('hero-image').alt = c.name;
  el('hero-element-word').textContent = c.element?.toUpperCase() ?? '';
  el('hero-element').innerHTML = img(
    GAME_ASSETS.elements[c.element],
    elements[c.element] || c.element,
  );
  el('hero-rarity').textContent = '★'.repeat(Math.min(5, c.rarity ?? 0));
  el('hero-build').innerHTML = c.weapon
    ? `${img(c.weapon.icon)}<div><strong>${escape(c.weapon.name)}</strong><span>Cấp ${c.weapon.level} / Tinh luyện ${c.weapon.affix_level ?? 1}</span></div>`
    : '';
  el('hero-detail').disabled = false;
  const choices = [
    c,
    ...[...model.characters]
      .sort((a, b) => b.level - a.level || b.rarity - a.rarity)
      .filter((x) => x.id !== c.id),
  ].slice(0, 5);
  el('hero-switcher').innerHTML = choices
    .map(
      (x) =>
        `<button aria-label="Nổi bật: ${escape(x.name)}" aria-pressed="${x.id === heroId}" data-hero="${x.id}">${img(x.icon, x.name)}</button>`,
    )
    .join('');
}
el('hero-switcher').addEventListener('click', (e) => {
  const button = e.target.closest('[data-hero]');
  if (button) {
    heroId = Number(button.dataset.hero);
    saveHero();
    renderHero();
  }
});
el('hero-detail').addEventListener('click', () => openCharacter(heroId));
function saveHero() {
  try {
    localStorage.setItem(`genshin.showcase.hero.${model.role.uid}`, String(heroId));
  } catch {}
}
el('element-filters').innerHTML = Object.entries(elements)
  .map(
    ([key, label]) =>
      `<button data-element="${key}" aria-label="${label}" title="${label}" aria-pressed="${key === filter}">${key === 'All' ? label : img(GAME_ASSETS.elements[key], label)}</button>`,
  )
  .join('');
el('element-filters').addEventListener('click', (e) => {
  const b = e.target.closest('[data-element]');
  if (!b) return;
  filter = b.dataset.element;
  visible = 18;
  document
    .querySelectorAll('[data-element]')
    .forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  renderRoster();
});
el('roster-search').addEventListener('input', (e) => {
  search = e.target.value.trim().toLocaleLowerCase();
  visible = 18;
  renderRoster();
});
el('roster-sort').addEventListener('change', (e) => {
  sort = e.target.value;
  renderRoster();
});
for (const type of ['characters', 'weapons'])
  el(`tab-${type}`).addEventListener('click', () => {
    mode = type;
    visible = 18;
    for (const t of ['characters', 'weapons'])
      el(`tab-${t}`).setAttribute('aria-selected', String(t === type));
    el('element-filters').hidden = type === 'weapons';
    el('equipment-note').hidden = type !== 'weapons';
    document.querySelector('#collection h2').firstChild.textContent =
      type === 'weapons' ? 'Vũ khí đang trang bị' : 'Những người đồng hành';
    renderRoster();
  });
el('roster-more').addEventListener('click', () => {
  visible += 18;
  renderRoster();
});
function renderRoster() {
  if (!model) return;
  let list = model.characters.filter(
    (c) =>
      (mode === 'weapons' ? !!c.weapon : filter === 'All' || c.element === filter) &&
      (!search || `${c.name} ${c.weapon?.name ?? ''}`.toLocaleLowerCase().includes(search)),
  );
  const target = (c) => (mode === 'weapons' ? c.weapon : c);
  list.sort((a, b) =>
    sort === 'name'
      ? target(a).name.localeCompare(target(b).name)
      : sort === 'rarity'
        ? target(b).rarity - target(a).rarity || target(b).level - target(a).level
        : sort === 'constellation'
          ? b.actived_constellation_num - a.actived_constellation_num || b.level - a.level
          : target(b).level - target(a).level || target(b).rarity - target(a).rarity,
  );
  el('roster-total').textContent = ' ' + number(list.length);
  el('roster-empty').hidden = list.length > 0;
  el('roster-more').hidden = list.length <= visible;
  el('roster-more').textContent =
    `Xem thêm ${Math.min(18, list.length - visible)} ${mode === 'weapons' ? 'vũ khí' : 'nhân vật'}`;
  el('roster-grid').innerHTML = list
    .slice(0, visible)
    .map((c) => {
      const weapon = mode === 'weapons',
        x = weapon ? c.weapon : c;
      return `<button class="character-card element-${escape(c.element)} ${!weapon && c.rarity >= 5 ? 'premium-five' : ''} ${!weapon && c.rarity >= 5 && c.actived_constellation_num === 6 ? 'vip-c6' : ''} ${weapon ? 'weapon-card' : ''}" data-character="${c.id}" aria-label="Xem build ${escape(c.name)}${weapon ? ': ' + escape(x.name) : ''}"><div class="card-portrait">${img(GAME_ASSETS.quality[Math.min(5, x.rarity ?? 1)], '', 'quality-surface')}${img(weapon ? x.icon : c.image || c.icon, x.name)}<span class="card-element">${weapon ? escape(x.type_name || 'Vũ khí') : img(GAME_ASSETS.elements[c.element], elements[c.element] || c.element)}</span><span class="card-level">Lv. ${x.level}</span><span class="card-rarity" aria-label="${x.rarity} sao">${'★'.repeat(Math.min(5, x.rarity ?? 0))}</span></div><div class="card-copy"><h3>${escape(x.name)}</h3><p><span>${escape(weapon ? c.name : c.weapon?.name || 'Chưa có vũ khí')}</span><span class="constellation">${weapon ? 'R' + (x.affix_level ?? 1) : 'C' + (c.actived_constellation_num ?? 0)}</span></p></div></button>`;
    })
    .join('');
}
el('roster-grid').addEventListener('click', (e) => {
  const card = e.target.closest('[data-character]');
  if (card) openCharacter(Number(card.dataset.character));
});
function regionPercent(value) {
  return Math.min(100, Math.max(0, Number(value || 0) / 10)).toLocaleString('vi-VN') + '%';
}
function renderWorld() {
  const byId = new Map(model.regions.map((r) => [r.id, r]));
  const displayed = model.worldDisplay?.length
    ? model.worldDisplay
        .map((d) => ({ ...byId.get(d.exploration_id), groups: d.group?.items ?? [] }))
        .filter((r) => r.id)
    : model.regions.filter((r) => !r.parent_id);
  el('region-count').textContent = displayed.length + ' vùng đất';
  el('regions-toggle').hidden = true;
  el('regions').innerHTML = displayed
    .map((r) => {
      const rows = [];
      if (r.type === 'Reputation')
        rows.push({
          name: 'Danh vọng',
          value: 'Cấp ' + r.level,
          icon: '/assets/native/world_reputation_level.432dbefa.png',
        });
      if (r.seven_statue_level > 0)
        rows.push({
          name: 'Thất Thiên Thần Tượng',
          value: 'Cấp ' + r.seven_statue_level,
          icon: '/assets/native/world_immortals_level.813fea6e.png',
        });
      if (r.type === 'Offering' && !r.offerings?.length)
        rows.push({ name: r.name, value: 'Cấp ' + r.level });
      for (const o of r.offerings ?? [])
        rows.push({ name: o.name, value: 'Cấp ' + o.level, icon: o.icon });
      for (const g of r.groups ?? []) {
        const part = byId.get(g.area_ids?.[0]);
        if (part) rows.push({ name: part.name, value: regionPercent(g.exploration_percentage) });
      }
      const row = (x) =>
        '<div class="native-region-row"><span>' +
        img(x.icon?.startsWith('/assets/native/') ? x.icon : '') +
        '<span>' +
        escape(x.name) +
        '</span></span><strong>' +
        escape(x.value) +
        '</strong></div>';
      return (
        '<article class="native-region">' +
        img(r.cover || r.background_image, '', 'native-region-cover') +
        '<div class="native-region-heading">' +
        img(r.icon || r.inner_icon || r.offerings?.[0]?.icon, r.name) +
        '<h3>' +
        escape(r.name) +
        '</h3><strong>' +
        regionPercent(r.exploration_percentage) +
        '</strong></div><progress max="1000" value="' +
        Math.min(1000, Number(r.exploration_percentage || 0)) +
        '" aria-label="' +
        escape(r.name) +
        '"></progress><div class="native-region-rows">' +
        rows.slice(0, 4).map(row).join('') +
        (rows.length > 4
          ? '<details><summary>Thêm ' +
            (rows.length - 4) +
            ' mục</summary>' +
            rows.slice(4).map(row).join('') +
            '</details>'
          : '') +
        '</div></article>'
      );
    })
    .join('');
  const a = model.abyss;
  el('battle-panel').innerHTML =
    '<div><p class="eyebrow">LA HOÀN THÂM CẢNH</p><h3>Kỳ hiện tại</h3><p>' +
    (a.total_battle_times
      ? 'Tầng cao nhất: ' + escape(a.max_floor)
      : 'Chưa có lượt đánh trong kỳ này.') +
    '</p><p>Kỷ lục hồ sơ: ' +
    escape(model.stats.spiral_abyss ?? 'Chưa có') +
    '</p></div><div class="abyss-number">' +
    number(a.total_star) +
    '<small> sao</small></div>';
  el('archive-panel').innerHTML =
    '<div><p class="eyebrow">THẤT THÁNH TRIỆU HỒI</p><h3>Bộ sưu tập thẻ bài</h3><p>' +
    model.tcg.decks +
    ' bộ bài đã lưu / ' +
    (model.tcg.complete ? 'Đã đọc đủ các trang' : 'Đang cập nhật thẻ bài') +
    '</p></div><strong class="archive-number">' +
    number(model.tcg.cards) +
    '</strong>';
}

function propertyName(p) {
  return (
    model.propertyMap[p]?.name ||
    {
      2000: 'HP',
      2001: 'ATK',
      2002: 'DEF',
      20: 'Tỷ lệ bạo kích',
      22: 'ST bạo kích',
      23: 'Hiệu quả nạp',
      28: 'Tinh thông nguyên tố',
    }[p] ||
    `Chỉ số ${p}`
  );
}
function openCharacter(id) {
  const c = model?.characters.find((x) => x.id === id);
  if (!c) return;
  const w = c.weapon;
  const priority = [2000, 2001, 2002, 20, 22, 23, 28, 41, 42, 43, 44, 45, 46];
  const props = [...(c.properties ?? [])]
    .sort(
      (a, b) =>
        (priority.indexOf(a.property_type) === -1 ? 99 : priority.indexOf(a.property_type)) -
        (priority.indexOf(b.property_type) === -1 ? 99 : priority.indexOf(b.property_type)),
    )
    .slice(0, 8);
  el('character-content').innerHTML =
    `<div class="detail-top"><div class="detail-art">${img(c.image || c.icon, c.name)}</div><div class="detail-info"><p class="eyebrow">${escape(elements[c.element] || c.element)} / ${c.rarity} SAO</p><h2 id="character-dialog-title">${escape(c.name)}</h2><p class="detail-subtitle">Cấp ${c.level} / Cung mệnh ${c.actived_constellation_num ?? 0} / Thiện cảm ${c.fetter ?? '-'}</p><div class="stat-grid">${props.map((p) => `<div class="stat-item"><span>${escape(propertyName(p.property_type))}</span><strong>${escape(p.final)}</strong></div>`).join('')}</div>${!c.hasDetail ? '<p class="detail-subtitle">Chi tiết build đang được tải.</p>' : ''}<div class="constellations">${c.constellations.map((x) => `<span title="${escape(x.name)}: ${escape(plain(x.effect))}">${img(x.icon, x.name, x.is_actived ? 'unlocked' : '')}</span>`).join('')}</div><button id="pin-character" class="text-button">Đặt làm nhân vật nổi bật ↗</button></div></div><div class="detail-lower">${
      w
        ? `<div class="detail-weapon">${img(w.icon, w.name)}<div><p class="eyebrow">VŨ KHÍ TRANG BỊ</p><h4>${escape(w.name)}</h4><p>Cấp ${w.level} / Tinh luyện ${w.affix_level ?? 1}</p></div><div class="weapon-stats">${[
            w.main_property,
            w.sub_property,
          ]
            .filter(Boolean)
            .map(
              (p) =>
                `<div><strong>${escape(p.final)}</strong><span>${escape(propertyName(p.property_type))}</span></div>`,
            )
            .join('')}</div></div>`
        : ''
    }<h3>Thánh di vật</h3><div class="relic-grid">${c.relics.map((r) => `<article class="relic">${img(r.icon, r.name)}<h4>${escape(r.name)} +${r.level}</h4><div class="relic-main">${escape(propertyName(r.main_property?.property_type))} ${escape(r.main_property?.value)}</div>${(r.sub_property_list ?? []).map((p) => `<p><span>${escape(propertyName(p.property_type))}</span><span>${escape(p.value)}</span></p>`).join('')}</article>`).join('') || '<p class="muted">Chưa có thánh di vật được trả về.</p>'}</div><div class="skill-list">${c.skills
      .slice(0, 3)
      .map(
        (s) =>
          `<div class="skill">${img(s.icon, s.name)}<div><p>${escape(s.name)}</p><strong>Cấp ${s.level}</strong></div></div>`,
      )
      .join('')}</div></div>`;
  el('pin-character').addEventListener('click', () => {
    heroId = c.id;
    saveHero();
    renderHero();
    el('character-dialog').close();
    notify(`Đã chọn ${c.name} làm nhân vật nổi bật.`);
  });
  if (!el('character-dialog').open) el('character-dialog').showModal();
}
fetch('/api/showcase/saved')
  .then((r) => r.json())
  .then((j) => {
    if (j.view && !model) render(j.view);
    else if (!j.view && !model) {
      el('showcase-freshness').textContent = 'Chưa có hồ sơ';
      el('hero').classList.remove('skeleton');
      el('hero-caption').textContent =
        'Kết nối HoYoLAB để xem toàn bộ nhân vật, trang bị và hành trình khám phá.';
      el('hero-detail').textContent = 'Kết nối HoYoLAB';
      el('hero-detail').disabled = false;
      el('hero-detail').addEventListener('click', () => {
        if (!model) openConsole();
      });
    }
  })
  .catch(() => {
    el('showcase-freshness').textContent = 'Không mở được bản đã lưu';
    notify('Không mở được dữ liệu. Hãy kiểm tra kết nối local.');
  });

el('regions-toggle').addEventListener('click', () => {
  regionsExpanded = !regionsExpanded;
  renderWorld();
  el('regions-toggle').textContent = regionsExpanded ? 'Thu gọn khu vực ↑' : 'Xem tất cả khu vực ↗';
});
for (const id of ['tab-characters', 'tab-weapons'])
  el(id).addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const next = el(id === 'tab-characters' ? 'tab-weapons' : 'tab-characters');
      next.click();
      next.focus();
    }
  });

window.addEventListener('showcase:open-character', (e) => {
  const activeGame = localStorage.getItem('hoyoshowcase.activeGame');
  if (activeGame === 'hsr') {
    window.dispatchEvent(new CustomEvent('hsr:open-character', { detail: e.detail }));
  } else {
    openCharacter(Number(e.detail.id));
  }
});

window.dispatchEvent(new Event('chronicle:request-session'));

window.addEventListener('showcase:request-data', () => {
  if (model) window.dispatchEvent(new CustomEvent('showcase:rendered', { detail: model }));
});
