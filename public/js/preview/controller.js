import {
  DEFAULT_STATS,
  PROPERTY_LABELS,
  normalizeConfig,
  planPreview,
  properties,
} from '/shared/preview-config.mjs';
import { createPreviewSettings } from './settings.js';
import { renderAccountPreview } from './renderer.js';

function initializePreview() {
  const $ = (id) => document.getElementById(id),
    canvas = $('account-canvas'),
    controls = $('preview-controls-body');
  const label = (id) => PROPERTY_LABELS[id] || data?.propertyMap[id]?.name || 'Chỉ số ' + id;
  let data = null,
    config = null,
    roleKey = '',
    visible = false,
    lastDataKey = '',
    generation = 0,
    timer = null,
    ready = false,
    hits = [];
  const settings = createPreviewSettings({
    controls,
    getData: () => data,
    getConfig: () => config,
    label,
  });
  function setup() {
    settings.setup();
    updateSummary();
  }
  const updateFacts = () => settings.updateFacts();
  const updateStats = () => settings.updateStats();
  function updateSummary() {
    if (!data || !config) return;
    const p = planPreview(data, config);
    $('preview-summary').textContent =
      `Hiện ${config.account && config.characters ? p.characters.length : 0}/${p.allCharacters} nhân vật / ${config.account && config.weapons ? p.weapons.length : 0}/${p.allWeapons} vũ khí${config.builds ? ' / ' + p.buildCharacters.length + ' build' : ''}`;
    $('preview-dimensions').textContent = p.outputWidth + ' × ' + p.outputHeight + ' px';
    $('preview-error').hidden = !p.error;
    $('preview-error').textContent = p.error ?? '';
    $('preview-build-options').hidden = !config.builds;
  }
  function persist() {
    try {
      localStorage.setItem(roleKey, JSON.stringify(config));
    } catch {}
  }
  function schedule() {
    const run = ++generation;
    ready = false;
    $('preview-download').disabled = true;
    clearTimeout(timer);
    updateSummary();
    persist();
    timer = setTimeout(
      () =>
        draw(run).catch((e) => {
          if (run === generation) {
            $('preview-loading').hidden = false;
            $('preview-loading').textContent = 'Chưa dựng được ảnh: ' + e.message;
          }
        }),
      100,
    );
  }
  controls.addEventListener('change', (e) => {
    const t = e.target;
    if (!config) return;
    if (t.dataset.key) {
      config[t.dataset.key] =
        t.type === 'checkbox' ? t.checked : t.type === 'number' ? Number(t.value) : t.value;
    } else if (t.dataset.fact) {
      config.facts = config.facts.filter((id) => id !== t.dataset.fact);
      if (t.checked) config.facts.push(t.dataset.fact);
      const group = t.closest('.fact-group');
      if (group)
        group.querySelector('summary span').textContent =
          group.querySelectorAll('input:checked').length +
          '/' +
          group.querySelectorAll('input').length;
    } else if (t.dataset.buildId) {
      const id = Number(t.dataset.buildId);
      if (t.checked && config.buildIds.length >= 6) {
        t.checked = false;
        $('preview-error').hidden = false;
        $('preview-error').textContent = 'Chọn tối đa 6 build trong một ảnh.';
        return;
      }
      config.buildIds = config.buildIds.filter((x) => x !== id);
      if (t.checked) config.buildIds.push(id);
      updateStats();
    } else if (t.dataset.statId) {
      const id = Number(t.dataset.statId);
      config.statIds = config.statIds.filter((x) => x !== id);
      if (t.checked) config.statIds.push(id);
    } else return;
    config = normalizeConfig(config, data);
    schedule();
  });
  controls.addEventListener('input', (e) => {
    if (e.target.dataset.key && e.target.type === 'number' && e.target.value !== '') {
      config[e.target.dataset.key] = Number(e.target.value);
      config = normalizeConfig(config, data);
      schedule();
    }
    if (e.target.id === 'preview-fact-search') updateFacts();
    if (e.target.id === 'preview-build-search') {
      const q = e.target.value.trim().toLocaleLowerCase();
      document
        .querySelectorAll('[data-build-name]')
        .forEach((x) => (x.hidden = !x.dataset.buildName.includes(q)));
    }
  });
  controls.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.action === 'clear-facts') {
      config.facts = [];
      updateFacts();
      schedule();
    }
    if (b.dataset.statPreset) {
      const kind = b.dataset.statPreset,
        element = { Pyro: 40, Electro: 41, Hydro: 42, Dendro: 43, Anemo: 44, Geo: 45, Cryo: 46 };
      config.statIds =
        kind === 'none'
          ? []
          : kind === 'all'
            ? [
                ...new Set(
                  data.characters.flatMap((c) => properties(c).map((p) => p.property_type)),
                ),
              ]
            : kind === 'support'
              ? [2000, 2002, 28, 23, 26, 81]
              : kind === 'em'
                ? [2000, 2001, 28, 23, 20, 22]
                : [
                    ...DEFAULT_STATS,
                    ...config.buildIds
                      .map((id) => element[data.characters.find((c) => c.id === id)?.element])
                      .filter(Boolean),
                  ];
      config = normalizeConfig(config, data);
      updateStats();
      schedule();
    }
  });
  document.querySelectorAll('[data-preset]').forEach((b) =>
    b.addEventListener('click', () => {
      const preset = b.dataset.preset;
      config = normalizeConfig(
        {
          ...config,
          account: preset !== 'build',
          characters: true,
          weapons: true,
          charRows: 0,
          weaponRows: 0,
          charLimit: 0,
          weaponLimit: 0,
          charCols: 8,
          weaponCols: 12,
          charSort: preset === 'vip' ? 'prestige' : 'rarity',
          maps: preset === 'full',
          builds: preset === 'build',
          facts:
            preset === 'full'
              ? [
                  'collection.five',
                  'collection.c6five',
                  'stats.achievement_number',
                  'stats.active_day_number',
                  'abyss_current.state',
                  'theater.0.state',
                ]
              : preset === 'vip'
                ? ['collection.five', 'collection.c6five']
                : [],
          c6: true,
          premium: true,
        },
        data,
      );
      setup();
      schedule();
    }),
  );
  $('preview-reset').addEventListener('click', () => {
    config = normalizeConfig({}, data);
    setup();
    schedule();
  });
  $('preview-settings-toggle').addEventListener('click', (e) => {
    const hide = $('preview-workspace').classList.toggle('controls-hidden');
    e.currentTarget.textContent = hide ? 'Mở tùy chỉnh' : 'Ẩn tùy chỉnh';
    e.currentTarget.setAttribute('aria-expanded', String(!hide));
  });
  $('preview-zoom').addEventListener('click', (e) => {
    const zoom = document.querySelector('.preview-frame').classList.toggle('zoomed');
    e.currentTarget.textContent = zoom ? 'Thu nhỏ' : 'Phóng to';
  });
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        visible = true;
        if (data) schedule();
      }
    },
    { rootMargin: '200px' },
  );
  observer.observe($('account-preview'));
  window.addEventListener('showcase:rendered', (e) => {
    const next = e.detail,
      key =
        next.id + ':' + next.characters.filter((c) => c.hasDetail).length + ':' + next.updatedAt;
    if (key === lastDataKey) return;
    lastDataKey = key;
    data = next;
    const nextRole = `genshin.preview.v2.${next.role.uid}.${next.role.server}`;
    if (roleKey !== nextRole) {
      roleKey = nextRole;
      let saved;
      try {
        saved = JSON.parse(localStorage.getItem(roleKey) || 'null');
      } catch {}
      config = normalizeConfig(saved ?? {}, next);
    } else config = normalizeConfig(config, next);
    setup();
    if (visible) schedule();
  });
  window.dispatchEvent(new Event('showcase:request-data'));
  async function draw(run) {
    if (!data || !visible || run !== generation) return;
    const model = data,
      c = normalizeConfig(config, model),
      plan = planPreview(model, c);
    if (plan.error) {
      $('preview-loading').hidden = true;
      return;
    }
    const result = await renderAccountPreview({
      canvas,
      model,
      config: c,
      plan,
      isCurrent: () => run === generation,
      onProgress: (message) => {
        if (run === generation) {
          $('preview-loading').hidden = false;
          $('preview-loading').textContent = message;
        }
      },
    });
    if (!result || run !== generation) return;
    hits = result.hits;
    ready = true;
    $('preview-download').disabled = false;
    $('preview-loading').title = result.missing.join('\n');
    $('preview-loading').textContent = result.missing.length
      ? result.missing.length + ' ảnh chưa tải được. Đổi tùy chọn để thử lại.'
      : '';
    $('preview-loading').hidden = !result.missing.length;
  }
  canvas.addEventListener('click', (event) => {
    if (!ready) return;
    const r = canvas.getBoundingClientRect(),
      x = ((event.clientX - r.left) * 1600) / r.width,
      y = ((event.clientY - r.top) * (canvas.height / (canvas.width / 1600))) / r.height;
    const tile = hits.find((t) => x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h);
    if (tile)
      window.dispatchEvent(new CustomEvent('showcase:open-character', { detail: { id: tile.id } }));
  });
  $('preview-download').addEventListener('click', () => {
    if (!ready) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        $('preview-error').hidden = false;
        $('preview-error').textContent = 'Chưa tạo được PNG. Giảm độ phân giải rồi thử lại.';
        return;
      }
      const url = URL.createObjectURL(blob),
        a = document.createElement('a');
      a.href = url;
      a.download = `genshin-account-${config.uid ? data.role.uid : 'preview'}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  });
}
try {
  initializePreview();
} catch (e) {
  const node = document.getElementById('preview-loading');
  node.hidden = false;
  node.textContent = 'Không mở được tùy chỉnh ảnh: ' + e.message;
}
