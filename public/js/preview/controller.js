import {
  DEFAULT_STATS,
  PROPERTY_LABELS,
  normalizeConfig,
  planPreview,
  properties,
} from '/shared/preview-config.mjs';
import { parsePityData } from './format.js';
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
    updatePityDisplay();
  }
  const updateFacts = () => settings.updateFacts();
  const updateStats = () => settings.updateStats();
  function updatePityDisplay(sourceMsg) {
    if (!config) return;
    const badgeChar = $('pity-badge-char');
    if (badgeChar) badgeChar.textContent = `${config.charPity} / 90`;
    const badgeGuaranteed = $('pity-badge-guaranteed');
    if (badgeGuaranteed) {
      badgeGuaranteed.textContent = config.charGuaranteed ? 'Bảo hiểm' : '50/50';
      badgeGuaranteed.className = `pity-chip-sub ${config.charGuaranteed ? 'guaranteed' : 'fifty'}`;
    }
    const badgeWeapon = $('pity-badge-weapon');
    if (badgeWeapon) badgeWeapon.textContent = `${config.weaponPity} / 80`;
    const badgeRolls = $('pity-badge-rolls');
    if (badgeRolls) badgeRolls.textContent = `${config.rollsLeft}`;
    const sourceText = $('pity-source-text');
    if (sourceText && sourceMsg) sourceText.textContent = sourceMsg;

    const inpChar = controls.querySelector('input[data-key="charPity"]');
    if (inpChar) inpChar.value = config.charPity;
    const chkGuar = controls.querySelector('input[data-key="charGuaranteed"]');
    if (chkGuar) chkGuar.checked = config.charGuaranteed;
    const inpWeap = controls.querySelector('input[data-key="weaponPity"]');
    if (inpWeap) inpWeap.value = config.weaponPity;
    const inpRoll = controls.querySelector('input[data-key="rollsLeft"]');
    if (inpRoll) inpRoll.value = config.rollsLeft;
    const inpMonth = controls.querySelector('input[data-key="monthCard"]');
    if (inpMonth && config.monthCard != null) inpMonth.value = config.monthCard;
  }
  async function fetchPityFromUid(uid) {
    if (!uid) return;
    try {
      const res = await fetch(`/api/pity/${uid}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.found) {
        config.charPity = json.charPity;
        config.charGuaranteed = json.charGuaranteed;
        config.weaponPity = json.weaponPity;
        if (json.rollsLeft != null) config.rollsLeft = json.rollsLeft;
        if (json.monthCard != null) config.monthCard = json.monthCard;
        config = normalizeConfig(config, data);
        updatePityDisplay(`Tự động từ ${json.source} (${json.totalWishes} lượt roll)`);
        schedule();
      } else if (json && json.message) {
        const sourceText = $('pity-source-text');
        if (sourceText) sourceText.textContent = json.message;
      }
    } catch (e) {
      console.warn('Không tải được Pity từ server:', e);
    }
  }
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
  function setActionsState(enabled) {
    const downloadBtns = [
      $('preview-download'),
      $('preview-download-inline'),
      $('floating-download'),
    ].filter(Boolean);
    const copyBtns = [$('preview-copy'), $('preview-copy-inline'), $('floating-copy')].filter(
      Boolean,
    );
    downloadBtns.forEach((b) => (b.disabled = !enabled));
    copyBtns.forEach((b) => (b.disabled = !enabled));
  }
  function schedule() {
    const run = ++generation;
    ready = false;
    setActionsState(false);
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
    if (t.id === 'preview-bg-file' && t.files?.[0]) {
      const file = t.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        config.background = reader.result;
        if (['charPity', 'weaponPity', 'rollsLeft', 'monthCard'].includes(t.dataset.key)) {
          updatePityDisplay('Tùy chỉnh thủ công');
        }
        config = normalizeConfig(config, data);
        schedule();
      };
      reader.readAsDataURL(file);
      return;
    }
    if (t.id === 'preview-pity-file' && t.files?.[0]) {
      const file = t.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const parsed = parsePityData(reader.result);
        if (parsed) {
          config.charPity = parsed.charPity;
          config.charGuaranteed = parsed.charGuaranteed;
          config.weaponPity = parsed.weaponPity;
          if (parsed.rollsLeft != null) config.rollsLeft = parsed.rollsLeft;
          if (parsed.monthCard != null) config.monthCard = parsed.monthCard;
          config = normalizeConfig(config, data);
          const countInfo = parsed.totalWishes ? `${parsed.totalWishes} lượt roll` : 'cấu hình';
          updatePityDisplay(`Đã nạp từ ${file.name} (${countInfo})`);
          schedule();
        } else {
          alert('Không đọc được dữ liệu Pity từ file JSON này.');
        }
      };
      reader.readAsText(file);
      return;
    }
    if (t.dataset.key) {
      if (t.dataset.key === 'background') {
        const wrap = $('preview-custom-bg-wrap');
        if (wrap) wrap.style.display = t.value === 'custom' ? 'block' : 'none';
      }
      if (t.dataset.key === 'wishBanner') {
        const opt = $('preview-wish-options');
        if (opt) opt.style.display = t.checked ? 'block' : 'none';
      }
      if (t.dataset.key === 'sizePreset') {
        config._customCols = false;
        const presets = {
          '1980x2040': { w: 1980, h: 2040, charCols: 8, weaponCols: 15, mapStyle: 'square' },
          '1920x1080': { w: 1920, h: 1080, charCols: 9, weaponCols: 16, mapStyle: 'square' },
          '2560x1440': { w: 2560, h: 1440, charCols: 8, weaponCols: 14, mapStyle: 'square' },
          '1080x1920': { w: 1080, h: 1920, charCols: 5, weaponCols: 8, mapStyle: 'square' },
          '2048x2048': { w: 2048, h: 2048, charCols: 8, weaponCols: 16, mapStyle: 'square' },
          auto: { w: 1600, h: 0, charCols: 7, weaponCols: 14, mapStyle: 'square' },
        };
        const p = presets[t.value];
        if (p) {
          const wInp = controls.querySelector('input[data-key="imageWidth"]');
          const hInp = controls.querySelector('input[data-key="imageHeight"]');
          const charColsInp = controls.querySelector('input[data-key="charCols"]');
          const weaponColsInp = controls.querySelector('input[data-key="weaponCols"]');
          const mapStyleSel = controls.querySelector('select[data-key="mapStyle"]');
          if (wInp) wInp.value = p.w;
          if (hInp) hInp.value = p.h;
          if (charColsInp) charColsInp.value = p.charCols;
          if (weaponColsInp) weaponColsInp.value = p.weaponCols;
          if (mapStyleSel && p.mapStyle) mapStyleSel.value = p.mapStyle;
          config.imageWidth = p.w;
          config.imageHeight = p.h;
          config.charCols = p.charCols;
          config.weaponCols = p.weaponCols;
          if (p.mapStyle) config.mapStyle = p.mapStyle;
        }
      } else if (t.dataset.key === 'imageWidth' || t.dataset.key === 'imageHeight') {
        const presetSelect = controls.querySelector('select[data-key="sizePreset"]');
        if (presetSelect) presetSelect.value = 'custom';
        config.sizePreset = 'custom';
      } else if (t.dataset.key === 'charCols' || t.dataset.key === 'weaponCols') {
        config._customCols = true;
      }
      config[t.dataset.key] =
        t.type === 'checkbox'
          ? t.checked
          : t.type === 'number' || t.type === 'range'
            ? Number(t.value)
            : t.value;
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
    if (
      ['charPity', 'charGuaranteed', 'weaponPity', 'rollsLeft', 'monthCard'].includes(t.dataset.key)
    ) {
      updatePityDisplay('Tùy chỉnh thủ công');
    }
    config = normalizeConfig(config, data);
    schedule();
  });
  controls.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.key) {
      if (t.type === 'range') {
        const out = $(`val-${t.dataset.key}`);
        if (out) out.textContent = t.value + (t.dataset.key === 'bgBlur' ? 'px' : '%');
        config[t.dataset.key] = Number(t.value);
        if (['charPity', 'weaponPity', 'rollsLeft', 'monthCard'].includes(t.dataset.key)) {
          updatePityDisplay('Tùy chỉnh thủ công');
        }
        config = normalizeConfig(config, data);
        schedule();
      } else if (t.type === 'text') {
        config[t.dataset.key] = t.value;
        if (['charPity', 'weaponPity', 'rollsLeft', 'monthCard'].includes(t.dataset.key)) {
          updatePityDisplay('Tùy chỉnh thủ công');
        }
        config = normalizeConfig(config, data);
        schedule();
      } else if (t.type === 'number' && t.value !== '') {
        config[t.dataset.key] = Number(t.value);
        if (['charLimit', 'weaponLimit', 'weaponRows', 'charRows'].includes(t.dataset.key)) {
          if (t.dataset.key === 'weaponRows' && Number(t.value) > 0) config.weaponLimit = 0;
          if (t.dataset.key === 'charRows' && Number(t.value) > 0) config.charLimit = 0;
          const group = controls.querySelector(`.quick-pill-group[data-target="${t.dataset.key}"]`);
          if (group) {
            const val = Number(t.value);
            group
              .querySelectorAll('.quick-pill')
              .forEach((p) => p.classList.toggle('active', Number(p.dataset.val) === val));
          }
        }
        if (t.dataset.key === 'imageWidth' || t.dataset.key === 'imageHeight') {
          const presetSelect = controls.querySelector('select[data-key="sizePreset"]');
          if (presetSelect) presetSelect.value = 'custom';
          config.sizePreset = 'custom';
        }
        if (t.dataset.key === 'charCols' || t.dataset.key === 'weaponCols') {
          config._customCols = true;
        }
        if (['charPity', 'weaponPity', 'rollsLeft', 'monthCard'].includes(t.dataset.key)) {
          updatePityDisplay('Tùy chỉnh thủ công');
        }
        config = normalizeConfig(config, data);
        const charColsInp = controls.querySelector('input[data-key="charCols"]');
        const weaponColsInp = controls.querySelector('input[data-key="weaponCols"]');
        if (charColsInp && document.activeElement !== charColsInp)
          charColsInp.value = config.charCols;
        if (weaponColsInp && document.activeElement !== weaponColsInp)
          weaponColsInp.value = config.weaponCols;
        schedule();
      }
    }
    if (t.id === 'preview-fact-search') updateFacts();
    if (t.id === 'preview-build-search') {
      const q = t.value.trim().toLocaleLowerCase();
      document
        .querySelectorAll('[data-build-name]')
        .forEach((x) => (x.hidden = !x.dataset.buildName.includes(q)));
    }
  });
  controls.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'preview-pity-reload' || b.closest('#preview-pity-reload')) {
      if (data?.role?.uid) {
        fetchPityFromUid(data.role.uid);
      }
      return;
    }
    const pill = b.closest('.quick-pill');
    if (pill) {
      const group = pill.closest('.quick-pill-group');
      if (group && group.dataset.target) {
        const key = group.dataset.target;
        const rawVal = pill.dataset.val;
        const val =
          rawVal === 'balanced' || rawVal === 'full'
            ? rawVal
            : Number.isFinite(Number(rawVal))
              ? Number(rawVal)
              : rawVal;
        config[key] = val;
        if (key === 'weaponRows' && val > 0) config.weaponLimit = 0;
        if (key === 'charRows' && val > 0) config.charLimit = 0;
        config = normalizeConfig(config, data);
        group
          .querySelectorAll('.quick-pill')
          .forEach((p) => p.classList.toggle('active', p === pill));
        const inp = controls.querySelector(`input[data-key="${key}"]`);
        if (inp) inp.value = val;
        schedule();
        return;
      }
    }
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
          charCols: 7,
          weaponCols: 14,
          charGridMode: 'balanced',
          weaponGridMode: 'balanced',
          charAlign: 'bottom',
          weaponAlign: 'bottom',
          charSort: preset === 'vip' ? 'prestige' : 'rarity',
          maps: preset === 'full' || preset === 'compact',
          mapStyle: preset === 'compact' ? 'compact' : 'classic',
          wishBanner: true,
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
    const nextRole = `genshin.preview.v4.${next.role.uid}.${next.role.server}`;
    if (roleKey !== nextRole) {
      roleKey = nextRole;
      let saved;
      try {
        saved = JSON.parse(
          localStorage.getItem(roleKey) ||
            localStorage.getItem(`genshin.preview.v3.${next.role.uid}.${next.role.server}`) ||
            localStorage.getItem(`genshin.preview.v2.${next.role.uid}.${next.role.server}`) ||
            'null',
        );
        if (saved && (saved.charCols === 8 || !saved.charCols)) saved.charCols = 7;
        if (saved && (saved.weaponCols === 12 || !saved.weaponCols)) saved.weaponCols = 14;
      } catch {}
      config = normalizeConfig(saved ?? {}, next);
    } else config = normalizeConfig(config, next);
    setup();
    if (next?.role?.uid) fetchPityFromUid(next.role.uid);
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
    setActionsState(true);
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

  let toastTimer = null;
  function showToast(msg) {
    const toast = $('preview-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 3200);
  }

  function triggerDownload() {
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
      a.download = `genshin-account-${config.uid && data?.role?.uid ? data.role.uid : 'showcase'}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Đang tải ảnh PNG về máy thành công!');
    }, 'image/png');
  }

  function triggerCopy(sourceBtn) {
    if (!ready) return;
    canvas.toBlob(async (blob) => {
      if (!blob) {
        $('preview-error').hidden = false;
        $('preview-error').textContent = 'Chưa tạo được PNG để sao chép.';
        return;
      }
      try {
        if (!navigator.clipboard || !window.ClipboardItem) {
          throw new Error('Trình duyệt không hỗ trợ ClipboardItem');
        }
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        if (sourceBtn) {
          const span = sourceBtn.querySelector('span');
          const oldText = span ? span.textContent : sourceBtn.textContent;
          if (span) span.textContent = '✓ Đã chép!';
          else sourceBtn.textContent = '✓ Đã chép!';
          sourceBtn.classList.add('copy-success');
          setTimeout(() => {
            if (span) span.textContent = oldText;
            else sourceBtn.textContent = oldText;
            sourceBtn.classList.remove('copy-success');
          }, 2500);
        }
        showToast(
          '✓ Đã sao chép ảnh vào Clipboard! Bạn có thể dán (Ctrl+V) vào Discord, Zalo, Messenger...',
        );
      } catch (e) {
        console.warn('Lỗi copy clipboard:', e);
        $('preview-error').hidden = false;
        $('preview-error').textContent =
          'Trình duyệt chưa cho phép ghi ảnh vào Clipboard trực tiếp. Hãy dùng nút Tải ảnh PNG.';
      }
    }, 'image/png');
  }

  $('preview-download')?.addEventListener('click', triggerDownload);
  $('preview-download-inline')?.addEventListener('click', triggerDownload);
  $('floating-download')?.addEventListener('click', triggerDownload);

  $('preview-copy')?.addEventListener('click', (e) => triggerCopy(e.currentTarget));
  $('preview-copy-inline')?.addEventListener('click', (e) => triggerCopy(e.currentTarget));
  $('floating-copy')?.addEventListener('click', (e) => triggerCopy(e.currentTarget));

  const ctxMenu = $('canvas-context-menu');
  if (ctxMenu) {
    canvas.addEventListener('contextmenu', (e) => {
      if (!ready) return;
      e.preventDefault();
      ctxMenu.style.left = `${Math.min(window.innerWidth - 230, e.clientX + 5)}px`;
      ctxMenu.style.top = `${Math.min(window.innerHeight - 180, e.clientY + 5)}px`;
      ctxMenu.hidden = false;
    });
    document.addEventListener('click', (e) => {
      if (!ctxMenu.contains(e.target)) ctxMenu.hidden = true;
    });
    document.addEventListener('scroll', () => {
      ctxMenu.hidden = true;
    });
    $('ctx-copy')?.addEventListener('click', () => {
      ctxMenu.hidden = true;
      triggerCopy($('preview-copy'));
    });
    $('ctx-download')?.addEventListener('click', () => {
      ctxMenu.hidden = true;
      triggerDownload();
    });
    $('ctx-open')?.addEventListener('click', () => {
      ctxMenu.hidden = true;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }, 'image/png');
    });
    $('ctx-zoom')?.addEventListener('click', () => {
      ctxMenu.hidden = true;
      $('preview-zoom')?.click();
    });
  }
}
try {
  initializePreview();
} catch (e) {
  const node = document.getElementById('preview-loading');
  node.hidden = false;
  node.textContent = 'Không mở được tùy chỉnh ảnh: ' + e.message;
}
