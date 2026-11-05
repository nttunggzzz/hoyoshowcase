import { GAME_ASSETS } from '../game-assets.js';
import {
  ART_BACKGROUNDS,
  PROPERTY_LABELS,
  THEMES,
  properties,
  stars,
  vip,
} from '/shared/preview-config.mjs';
import { createCanvasPainter } from './canvas-painter.js';
import { formatNumber as number, formatValue as readable } from './format.js';
import { loadGameImage } from './media.js';
import { mapRegions, regionRows } from './world-data.js';

/** Paints a validated plan. It never changes settings or persistence. */
export async function renderAccountPreview({
  canvas,
  model,
  config: c,
  plan: p,
  isCurrent,
  onProgress,
}) {
  const ctx = canvas.getContext('2d');
  const theme = THEMES[c.theme] || THEMES.abyss;
  const { round, chiseled, panel, cornerBrackets, vignette, text, cover, contain } =
    createCanvasPainter(ctx);
  const label = (id) => PROPERTY_LABELS[id] || model.propertyMap[id]?.name || 'Chỉ số ' + id;
  let hits = [];
  onProgress('Đang dựng ảnh theo tùy chỉnh…');
  const artBg = ART_BACKGROUNDS.find((a) => a.id === c.background);
  const bgUrl = artBg
    ? artBg.url
    : typeof c.background === 'string' &&
        (c.background.startsWith('data:image/') || c.background.startsWith('/assets/backgrounds/'))
      ? c.background
      : model.regions.find((r) => String(r.id) === c.background)?.background_image ||
        model.regions[0]?.background_image;
  const maps = c.maps ? mapRegions(model) : [],
    urls = [
      bgUrl,
      ...(c.account && c.avatar
        ? [(p.buildCharacters[0] ?? p.characters[0] ?? model.characters[0])?.icon]
        : []),
      ...(c.account && c.characters ? p.characters.map((x) => x.icon) : []),
      ...(c.account && c.weapons ? p.weapons.flatMap((x) => [x.weapon.icon, x.icon]) : []),
      ...Object.values(GAME_ASSETS.quality),
      ...Object.values(GAME_ASSETS.elements),
      ...maps.flatMap((r) => [r.cover || r.background_image, r.icon]),
      ...p.buildCharacters.flatMap((x) => [
        x.image,
        x.icon,
        ...(c.buildWeapon ? [x.weapon?.icon] : []),
        ...(c.buildRelics ? x.relics.map((r) => r.icon) : []),
        ...(c.buildSkills ? x.skills.slice(0, 3).map((s) => s.icon) : []),
        ...(c.buildConstellations ? x.constellations.map((z) => z.icon) : []),
      ]),
    ].filter(Boolean),
    unique = [...new Set(urls)],
    images = new Map();
  let cursor = 0,
    count = 0;
  async function worker() {
    while (cursor < unique.length && isCurrent()) {
      const url = unique[cursor++];
      images.set(url, await loadGameImage(url));
      count++;
      if (isCurrent()) onProgress(`Đang dựng ảnh ${count}/${unique.length} asset`);
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  await document.fonts.ready;
  if (!isCurrent()) return;
  canvas.width = p.outputWidth;
  canvas.height = p.outputHeight;
  const baseW = p.baseW || 1600;
  const fullH = Math.max(p.height, Math.ceil(p.outputHeight / p.scale));
  ctx.setTransform(p.scale, 0, 0, p.scale, 0, 0);
  ctx.fillStyle = '#101d2e';
  ctx.fillRect(0, 0, baseW, fullH);
  hits = [];
  const art = (url) => images.get(url),
    bg = art(bgUrl);
  if (p.mapSquare && !p.both) {
    paintSquareMaps(p.mapSquare.x, p.mapSquare.y, p.mapSquare.width, p.mapSquare.height);
  } else if (p.mapHeight) {
    if (c.mapStyle === 'compact') paintCompactMaps(0);
    else paintMaps(0);
  }
  if (p.boardHeight) paintBoard(p.mapHeight);
  let y = p.mapHeight + p.boardHeight;
  p.buildCharacters.forEach((character, i) => {
    paintBuild(character, y, p.buildHeights[i]);
    y += p.buildHeights[i];
  });
  if (c.vignette) {
    vignette(baseW, fullH, 0.42);
  }
  if (c.cornerAccents) {
    cornerBrackets(12, 12, baseW - 24, fullH - 24, theme.accent, 20);
  }
  if (c.watermark && c.watermark.trim()) {
    paintWatermark(c.watermark.trim());
  }
  const missing = [...images].filter(([, im]) => !im).map(([url]) => url);
  return { hits, missing };
  function identity(x, y, w) {
    let top = y;
    if (c.avatar) {
      const avatar = p.buildCharacters[0] ?? p.characters[0] ?? model.characters[0];
      contain(art(avatar?.icon), x, y, 64, 64);
      x += 78;
      w -= 78;
    }
    if (c.name) {
      text(model.profile.nickname || 'Nhà lữ hành', x, top + 25, 26, '#fff', 600, 'left', w - 100);
      top += 32;
    }
    if (c.signature) {
      const sigStr = String(c.signature).trim();
      if (sigStr) {
        text(`“${sigStr}”`, x, top + 17, 12, theme.accent, 500, 'left', w - 100);
        top += 21;
      }
    }
    const meta = [];
    if (c.uid) meta.push('UID ' + model.role.uid);
    if (c.server) meta.push(model.role.server);
    if (meta.length) {
      text(meta.join(' / '), x, top + 18, 14, theme.textMuted);
      top += 25;
    }
    if (c.ar)
      text('AR ' + (model.profile.level ?? '-'), x + w - 8, y + 26, 24, theme.accent, 600, 'right');
    if (c.code) {
      const codeStr = String(c.code).trim();
      if (codeStr) {
        const badgeW = Math.max(54, codeStr.length * 8 + 14);
        panel(x + w - badgeW - 6, y + 36, badgeW, 20, {
          fill: theme.badgeBg,
          stroke: theme.badgeStroke,
          line: 1,
          style: c.frameStyle,
        });
        text(codeStr, x + w - 6 - badgeW / 2, y + 50, 11, theme.accent, 700, 'center');
      }
    }
    if (c.updated)
      text(
        new Date(model.updatedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        x,
        top + 18,
        12,
        '#a6b9cc',
      );
  }
  function paintWishBanner(x, y, w, h) {
    panel(x, y, w, h, {
      fill: theme.panelFill,
      stroke: theme.panelStroke,
      line: 1.2,
      style: c.frameStyle,
    });
    if (c.cornerAccents) {
      cornerBrackets(x + 3, y + 3, w - 6, h - 6, theme.accent, 8);
    }
    text('✦ CẦU NGUYỆN & BẢO HIỂM', x + 16, y + 23, 13, theme.accent, 700, 'left');
    if (c.monthCard > 0) {
      text(`Thẻ tháng: ${c.monthCard} ngày`, x + w - 16, y + 23, 11, '#9abf6b', 600, 'right');
    }
    ctx.fillStyle = theme.borderLine;
    ctx.fillRect(x + 14, y + 33, w - 28, 1);
    const colW = (w - 28) / 3;
    const c1x = x + 14;
    text('PITY NHÂN VẬT', c1x, y + 49, 10, theme.textMuted, 600);
    text(`${c.charPity} / 90`, c1x, y + 74, 20, theme.accent, 800);
    if (c.charGuaranteed) {
      ctx.fillStyle = '#173d2f';
      round(c1x, y + 83, 70, 16, 3);
      ctx.fill();
      text('BẢO HIỂM', c1x + 35, y + 95, 9, '#5af49c', 700, 'center');
    } else {
      text('Tỉ lệ 50 / 50', c1x, y + 94, 10, '#94a8ba', 500);
    }
    const c2x = x + 14 + colW;
    text('PITY VŨ KHÍ', c2x, y + 49, 10, theme.textMuted, 600);
    text(`${c.weaponPity} / 80`, c2x, y + 74, 20, '#9cdcfe', 800);
    text('Định chuẩn', c2x, y + 94, 10, '#7ea9c4', 500);
    const c3x = x + 14 + colW * 2;
    text('MỐI DUYÊN', c3x, y + 49, 10, theme.textMuted, 600);
    text(`${c.rollsLeft}`, c3x, y + 74, 20, '#ff8dbb', 800);
    text('Rolls dự trữ', c3x, y + 94, 10, theme.textMuted, 500);
  }
  function paintBoard(offset) {
    ctx.save();
    ctx.translate(0, offset);
    if (c.bgBlur > 0) {
      ctx.save();
      ctx.filter = `blur(${c.bgBlur}px)`;
      cover(bg, -20, -20, baseW + 40, p.boardHeight + 40);
      ctx.restore();
    } else {
      cover(bg, 0, 0, baseW, p.boardHeight);
    }
    const dimAlpha = (c.bgDim ?? 30) / 100;
    ctx.fillStyle = `rgba(7, 22, 43, ${dimAlpha})`;
    ctx.fillRect(0, 0, baseW, p.boardHeight);
    const banner = p.banner;
    ctx.save();
    round(banner.x, 20, banner.width, p.bannerHeight);
    ctx.clip();
    if (c.bgBlur > 0) {
      ctx.save();
      ctx.filter = `blur(${c.bgBlur}px)`;
      cover(bg, banner.x - 10, 10, banner.width + 20, p.bannerHeight + 20);
      ctx.restore();
    } else {
      cover(bg, banner.x, 20, banner.width, p.bannerHeight);
    }
    ctx.fillStyle = '#10223960';
    ctx.fillRect(banner.x, 20, banner.width, p.bannerHeight);
    ctx.restore();
    const hasIdentity =
      c.name || c.uid || c.ar || c.avatar || c.server || c.updated || c.code || c.signature;
    const wishAboveWeapon = c.wishBanner && c.wishPosition === 'above_weapon' && p.both;
    const drawFullBanner = p.facts.length > 0 || !wishAboveWeapon;
    if (drawFullBanner) {
      panel(banner.x, 20, banner.width, p.bannerHeight, {
        fill: '#11233528',
        stroke: theme.borderLine,
        line: 1,
        style: c.frameStyle,
      });
      if (hasIdentity) {
        panel(banner.x + banner.width - 450, 35, 432, 110, {
          fill: theme.panelFill,
          stroke: theme.panelStroke,
          line: 1.2,
          style: c.frameStyle,
        });
        if (c.cornerAccents) {
          cornerBrackets(banner.x + banner.width - 447, 38, 426, 104, theme.accent, 10);
        }
        identity(banner.x + banner.width - 435, 45, 400);
      } else text('GENSHIN IMPACT', banner.x + 22, 60, 16, theme.accent, 600);
      if (c.wishBanner && !wishAboveWeapon) {
        const pityW = Math.min(480, banner.width - (hasIdentity ? 470 : 40));
        if (pityW >= 260) {
          paintWishBanner(banner.x + 18, 35, pityW, 110);
        }
      }
    } else {
      if (hasIdentity) {
        panel(banner.x + banner.width - 450, 20, 432, 110, {
          fill: theme.panelFill,
          stroke: theme.panelStroke,
          line: 1.2,
          style: c.frameStyle,
        });
        if (c.cornerAccents) {
          cornerBrackets(banner.x + banner.width - 447, 23, 426, 104, theme.accent, 10);
        }
        identity(banner.x + banner.width - 435, 30, 400);
      } else {
        text('GENSHIN IMPACT', banner.x + 22, 45, 16, theme.accent, 600);
      }
    }
    if (wishAboveWeapon) {
      const wishY = p.weaponPanel.y - 110 - 12;
      const wishW = Math.min(500, p.weaponPanel.width);
      paintWishBanner(p.weaponPanel.x, wishY, wishW, 110);
    }
    const cols = p.both ? 3 : 5,
      fw = (banner.width - 36) / cols,
      factStart = hasIdentity || c.wishBanner ? 150 : 40;
    p.facts.forEach((f, i) => {
      const x = banner.x + 18 + (i % cols) * fw,
        y = factStart + Math.floor(i / cols) * 77;
      const short = f.group.startsWith('Khám phá / ')
        ? f.group.slice(10) + ' / ' + f.label
        : f.group === 'Bộ sưu tập' || f.group === 'Hồ sơ & tài nguyên'
          ? f.label
          : f.group + ' / ' + f.label;
      text(short, x, y, 13, theme.textMuted, 400, 'left', fw - 15);
      text(
        f.display,
        x,
        y + 32,
        f.available ? 25 : 18,
        f.available ? theme.accent : theme.textMuted,
        500,
        'left',
        fw - 16,
      );
    });
    if (p.mapSquare && p.both) {
      paintSquareMaps(p.mapSquare.x, p.mapSquare.y, p.mapSquare.width, p.mapSquare.height);
    }
    if (c.characters) {
      if (p.both && c.collectionHeader) {
        panel(20, 20, p.charPanel.width, 74, {
          fill: theme.panelFill,
          stroke: theme.panelStroke,
          line: 1.2,
          style: c.frameStyle,
        });
        text('BỘ SƯU TẬP', 38, 53, 22, theme.accent, 600);
        if (c.name) text(model.profile.nickname || 'Nhà lữ hành', 38, 77, 15, theme.textLight);
      }
      paintGrid(p.characters, p.charPanel, p.charGrid, false, offset);
    }
    if (c.weapons) paintGrid(p.weapons, p.weaponPanel, p.weaponGrid, true, offset);
    text(
      'Vũ khí đang trang bị trên nhân vật; không phải toàn bộ kho túi đồ.',
      22,
      p.boardHeight - 5,
      12,
      '#d3dbe3',
    );
    ctx.restore();
  }
  function paintGrid(items, box, grid, isWeapon, offset) {
    panel(box.x, box.y, box.width, grid.height, {
      fill: theme.panelFill,
      stroke: isWeapon ? theme.borderLine : theme.panelStroke,
      line: 1.2,
      style: c.frameStyle,
    });
    if (c.cornerAccents) {
      cornerBrackets(box.x + 3, box.y + 3, box.width - 6, grid.height - 6, theme.accent, 10);
    }
    const count = isWeapon ? c.weaponCount : c.charCount,
      total = isWeapon ? p.allWeapons : p.allCharacters,
      heading = isWeapon ? 'VŨ KHÍ TRANG BỊ' : 'NHÂN VẬT';
    text(
      heading +
        (count
          ? '  ' +
            (items.length === total ? number(total) : number(items.length) + ' / ' + number(total))
          : ''),
      box.x + 18,
      box.y + 32,
      20,
      theme.accent,
      600,
    );
    const gx = box.x + (box.width - grid.gridWidth) / 2,
      gy = box.y + 52;
    items.forEach((owner, i) =>
      paintTile(
        owner,
        gx + (i % grid.cols) * (grid.cellWidth + grid.gap),
        gy + Math.floor(i / grid.cols) * (grid.cellHeight + grid.gap),
        grid.cellWidth,
        grid.cellHeight,
        isWeapon,
        offset,
      ),
    );
    const totalCells = grid.rows * grid.cols;
    for (let i = items.length; i < totalCells; i++) {
      paintEmptyTile(
        gx + (i % grid.cols) * (grid.cellWidth + grid.gap),
        gy + Math.floor(i / grid.cols) * (grid.cellHeight + grid.gap),
        grid.cellWidth,
        grid.cellHeight,
        isWeapon,
      );
    }
  }
  function paintEmptyTile(x, y, w, h, weapon) {
    ctx.save();
    round(x, y, w, h, 5);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.fill();
    ctx.strokeStyle = theme.borderLine || 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    text(
      '✦',
      x + w / 2,
      y + h / 2 + 5,
      Math.min(14, w * 0.2),
      theme.borderLine || 'rgba(255, 255, 255, 0.2)',
      400,
      'center',
    );
    ctx.restore();
  }
  function paintTile(owner, x, y, w, h, weapon, offset) {
    const item = weapon ? owner.weapon : owner,
      s = stars(item),
      isVip = !weapon && c.c6 && c.constellations && vip(owner),
      footer = c.levels ? Math.max(16, Math.min(23, w * 0.22)) : 0,
      quality = GAME_ASSETS.quality[item.rarity] || GAME_ASSETS.quality[s];
    ctx.save();
    round(x, y, w, h, 5);
    ctx.clip();
    cover(art(quality), x, y, w, h - footer);
    contain(art(item.icon), x, y, w, h - footer);
    if (c.levels) {
      ctx.fillStyle = s === 5 ? '#f8ebd1' : '#ece9ec';
      ctx.fillRect(x, y + h - footer, w, footer);
      text(
        'Lv. ' + item.level,
        x + w / 2,
        y + h - 5,
        Math.max(10, Math.min(16, w * 0.17)),
        '#292e36',
        600,
        'center',
      );
    }
    if (c.stars)
      text(
        '★'.repeat(s),
        x + w - 4,
        y + h - footer - 5,
        Math.min(11, w * 0.12),
        s === 5 ? '#ffe4a0' : '#e1d4ef',
        600,
        'right',
      );
    const corner = weapon
      ? c.refinements
        ? 'R' + (item.affix_level ?? 1)
        : ''
      : c.constellations
        ? 'C' + (owner.actived_constellation_num ?? 0)
        : '';
    if (corner) {
      if (isVip) {
        const bh = c.c6Size === 'large' ? Math.max(24, Math.min(42, w * 0.4)) : 22;
        ctx.fillStyle = '#f0c55e';
        ctx.fillRect(x + 2, y + 2, w - 4, bh);
        text(
          'C6',
          x + w / 2,
          y + bh - 4,
          c.c6Size === 'large' ? Math.min(31, w * 0.39) : 17,
          '#211b10',
          800,
          'center',
        );
      } else {
        ctx.fillStyle = weapon ? '#1e293be0' : s === 5 ? '#7e542adf' : '#493668df';
        round(x + 2, y + 2, Math.min(38, w * 0.45), Math.min(25, w * 0.32), 3);
        ctx.fill();
        text(corner, x + 5, y + Math.min(20, w * 0.25), Math.min(17, w * 0.23), '#fff', 700);
      }
    }
    if (!weapon && c.elements)
      contain(
        art(GAME_ASSETS.elements[owner.element]),
        x + w - 23,
        y + (isVip ? Math.max(26, w * 0.42) : 4),
        19,
        19,
      );
    if (weapon && c.weaponOwner) contain(art(owner.icon), x + w - 26, y + 2, 24, 24);
    ctx.restore();
    ctx.lineWidth = isVip ? 3.5 : c.premium && s === 5 ? 2 : 1;
    ctx.strokeStyle = isVip
      ? '#fff0a5'
      : s === 5 && c.premium
        ? '#edc568'
        : s === 4
          ? '#ab87d3'
          : '#69788a';
    round(x, y, w, h, 5);
    ctx.stroke();
    if (isVip) {
      ctx.strokeStyle = '#b88423';
      ctx.lineWidth = 1;
      round(x + 4, y + 4, w - 8, h - 8, 3);
      ctx.stroke();
    }
    hits.push({
      x,
      y: y + offset,
      w,
      h,
      id: owner.id,
      name: weapon ? item.name + ' / ' + owner.name : owner.name,
    });
  }
  function paintMaps(y) {
    text('Tiến độ khám phá thế giới', 25, y + 40, 30, '#f4f0e5', 600);
    if (c.name || c.uid)
      text(
        [c.name ? model.profile.nickname : null, c.uid ? 'UID ' + model.role.uid : null]
          .filter(Boolean)
          .join(' / '),
        25,
        y + 70,
        15,
        '#bbcddd',
      );
    maps.forEach((r, i) => {
      const x = 25 + (i % 3) * 523,
        top = y + 96 + Math.floor(i / 3) * 200,
        w = 504,
        h = 182;
      ctx.save();
      round(x, top, w, h);
      ctx.clip();
      cover(art(r.cover || r.background_image), x, top, w, h);
      ctx.fillStyle = '#10263bb8';
      ctx.fillRect(x, top, w, h);
      ctx.restore();
      panel(x, top, w, h, { fill: '#10243a12', stroke: '#6e899f', line: 1 });
      contain(art(r.icon), x + 14, top + 10, 38, 38);
      text(r.name, x + 62, top + 33, 19, '#fff', 600, 'left', w - 140);
      const percent = Math.min(100, Number(r.exploration_percentage || 0) / 10);
      text(readable(percent) + '%', x + w - 16, top + 33, 23, '#fff', 600, 'right');
      ctx.fillStyle = '#7b8c98';
      ctx.fillRect(x + 18, top + 56, w - 36, 3);
      ctx.fillStyle = '#9abf6b';
      ctx.fillRect(x + 18, top + 56, ((w - 36) * percent) / 100, 3);
      regionRows(r, model)
        .slice(0, 4)
        .forEach(([name, value], row) => {
          text(
            name.length > 43 ? name.slice(0, 41) + '…' : name,
            x + 18,
            top + 84 + row * 22,
            13,
            '#d8e1ea',
            500,
            'left',
            w - 110,
          );
          text(value, x + w - 18, top + 84 + row * 22, 13, '#eef2f6', 500, 'right');
        });
    });
  }
  function paintCompactMaps(y) {
    text('Tiến độ khám phá thế giới', 25, y + 28, 22, '#f4f0e5', 600);
    if (c.name || c.uid)
      text(
        [c.name ? model.profile.nickname : null, c.uid ? 'UID ' + model.role.uid : null]
          .filter(Boolean)
          .join(' / '),
        25,
        y + 48,
        12,
        '#bbcddd',
      );
    const cols = 3;
    const colW = (1600 - 50 - (cols - 1) * 16) / cols;
    const rowH = 44;
    const startY = y + 62;
    maps.forEach((r, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 25 + col * (colW + 16);
      const top = startY + row * (rowH + 8);
      const percent = Math.min(100, Number(r.exploration_percentage || 0) / 10);
      const isComplete = percent >= 100;
      panel(x, top, colW, rowH, {
        fill: isComplete ? '#10283fec' : '#0e1f33e8',
        stroke: isComplete ? '#3d6c8e' : '#25394e',
        line: 1,
      });
      contain(art(r.icon), x + 8, top + 6, 32, 32);
      text(r.name, x + 48, top + 26, 14, isComplete ? '#ffffff' : '#dbe5f0', 600, 'left', 180);
      const barX = x + 235;
      const barY = top + 18;
      const barW = colW - 325;
      const barH = 8;
      round(barX, barY, barW, barH, 4);
      ctx.fillStyle = '#172b3f';
      ctx.fill();
      if (percent > 0) {
        round(barX, barY, Math.max(6, (barW * percent) / 100), barH, 4);
        ctx.fillStyle = isComplete ? '#40e098' : '#32c1e8';
        ctx.fill();
      }
      text(
        readable(percent) + '%',
        x + colW - 14,
        top + 27,
        14,
        isComplete ? '#40e098' : '#f5d485',
        700,
        'right',
      );
    });
  }
  function paintSquareMaps(x, y, w, h) {
    panel(x, y, w, h, {
      fill: theme.panelFill,
      stroke: theme.panelStroke,
      line: 1.2,
      style: c.frameStyle,
    });
    if (c.cornerAccents) {
      cornerBrackets(x + 3, y + 3, w - 6, h - 6, theme.accent, 10);
    }
    text('TIẾN ĐỘ KHÁM PHÁ THẾ GIỚI', x + 16, y + 25, 13, theme.accent, 700);
    if (c.name || c.uid) {
      const sub = [c.name ? model.profile.nickname : null, c.uid ? 'UID ' + model.role.uid : null]
        .filter(Boolean)
        .join(' / ');
      text(sub, x + w - 16, y + 25, 11, theme.textMuted, 500, 'right', Math.round(w / 2));
    }
    const cols = w >= 660 ? 3 : 2;
    const colGap = 10;
    const paddingX = 14;
    const colW = (w - paddingX * 2 - (cols - 1) * colGap) / cols;
    const count = maps.length;
    const rows = Math.ceil(count / cols);
    const startY = y + 38;
    const rowH = Math.min(38, Math.floor((h - 44) / Math.max(1, rows)));

    maps.forEach((r, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const rx = x + paddingX + col * (colW + colGap);
      const ry = startY + row * rowH;
      const percent = Math.min(100, Number(r.exploration_percentage || 0) / 10);
      const isComplete = percent >= 100;

      round(rx, ry + 1, colW, rowH - 3, 4);
      ctx.fillStyle = isComplete ? '#10283fcc' : '#0e1f33b0';
      ctx.fill();

      const iconSize = Math.min(22, rowH - 8);
      contain(art(r.icon), rx + 4, ry + Math.round((rowH - iconSize) / 2), iconSize, iconSize);

      const nameW = Math.max(50, Math.round(colW * 0.4));
      text(
        r.name,
        rx + iconSize + 8,
        ry + Math.round(rowH / 2) + 4,
        11,
        isComplete ? '#ffffff' : '#dbe5f0',
        500,
        'left',
        nameW,
      );

      const pctStr = readable(percent) + '%';
      const pctX = rx + colW - 6;
      text(
        pctStr,
        pctX,
        ry + Math.round(rowH / 2) + 4,
        11,
        isComplete ? '#40e098' : '#f5d485',
        700,
        'right',
      );

      const barX = rx + iconSize + 10 + nameW;
      const barRight = pctX - 38;
      const barW = Math.max(16, barRight - barX);
      const barY = ry + Math.round((rowH - 4) / 2);
      if (barW > 16) {
        round(barX, barY, barW, 4, 2);
        ctx.fillStyle = '#172b3f';
        ctx.fill();
        if (percent > 0) {
          round(barX, barY, Math.max(3, (barW * percent) / 100), 4, 2);
          ctx.fillStyle = isComplete ? '#40e098' : '#38bdf8';
          ctx.fill();
        }
      }
    });
  }
  function paintWatermark(textString) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.font = 'bold 36px Outfit, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const spacingY = 320;
    const count = Math.ceil(fullH / spacingY);
    for (let i = 0; i <= count; i++) {
      ctx.save();
      ctx.translate(baseW / 2, i * spacingY + 160);
      ctx.rotate(-Math.PI / 12);
      ctx.fillText(textString, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }
  function paintBuild(character, top, height) {
    ctx.save();
    ctx.translate(0, top);
    const cardW = baseW - 40;
    const exclusive = c.c6 && c.buildConstellations && vip(character),
      border = exclusive ? '#ffdc78' : stars(character) === 5 ? theme.panelStroke : '#9474b4';
    panel(20, 14, cardW, height - 28, {
      fill: theme.panelFill,
      stroke: border,
      line: exclusive ? 3 : 1.5,
      style: c.frameStyle,
    });
    if (c.cornerAccents) {
      cornerBrackets(22, 16, cardW - 4, height - 32, theme.accent, 14);
    }
    const heroHeight = height - 58;
    ctx.save();
    round(25, 19, 535, heroHeight, 7);
    ctx.clip();
    cover(bg, 25, 19, 535, heroHeight);
    ctx.fillStyle = '#0b1b3155';
    ctx.fillRect(25, 19, 535, heroHeight);
    contain(art(character.image || character.icon), -65, 45, 700, heroHeight - 20);
    const shade = ctx.createLinearGradient(0, 210, 0, heroHeight);
    shade.addColorStop(0, '#10223900');
    shade.addColorStop(1, '#102239ee');
    ctx.fillStyle = shade;
    ctx.fillRect(25, 19, 535, heroHeight);
    ctx.restore();
    contain(art(GAME_ASSETS.elements[character.element]), 48, 42, 33, 33);
    text('★'.repeat(stars(character)), 95, 66, 18, theme.accent, 600);
    text(character.name, 48, heroHeight - 95, 48, '#fff', 600, 'left', 470);
    const meta = [];
    if (c.levels) meta.push('Lv. ' + character.level);
    if (c.buildConstellations) meta.push('C' + (character.actived_constellation_num ?? 0));
    if (c.buildFetter) meta.push('Thiện cảm ' + character.fetter);
    text(meta.join(' / '), 48, heroHeight - 61, 20, '#d9e3ef');
    if (c.uid) text('UID ' + model.role.uid, 48, heroHeight - 30, 14, '#afc2d5');
    if (exclusive) {
      panel(426, 40, 106, 65, { fill: '#edc05e', stroke: '#fff0a5', line: 2, style: c.frameStyle });
      text('C6', 479, 88, 40, '#211a0e', 800, 'center');
    }
    const left = 590,
      right = baseW - 50,
      width = right - left;
    let y = 54;
    const weapon = character.weapon;
    if (c.buildWeapon && weapon) {
      panel(left, y - 16, width, 111, {
        fill: '#20334b',
        stroke: theme.borderLine,
        line: 1,
        style: c.frameStyle,
      });
      contain(art(weapon.icon), left + 12, y - 8, 91, 91);
      text(weapon.name, left + 118, y + 18, 25, '#f0dfb4', 600, 'left', width - 330);
      text(
        [
          c.levels ? 'Lv. ' + weapon.level : null,
          c.refinements ? 'R' + (weapon.affix_level ?? 1) : null,
        ]
          .filter(Boolean)
          .join(' / '),
        left + 118,
        y + 50,
        17,
        '#b5c7da',
      );
      [weapon.main_property, weapon.sub_property].filter(Boolean).forEach((prop, i) => {
        text(readable(prop.final), right - 25, y + 17 + i * 32, 22, '#fff', 600, 'right');
        text(label(prop.property_type), right - 160, y + 15 + i * 32, 12, '#b8c8d9', 400, 'right');
      });
      y += 118;
    }
    const selected = properties(character).filter((prop) =>
      c.statIds.includes(Number(prop.property_type)),
    );
    if (!selected.length) text('Chưa chọn chỉ số để hiển thị', left, y + 25, 17, '#b3c5d6');
    selected.forEach((prop, i) => {
      const x = left + (i % 2) * 480,
        sy = y + Math.floor(i / 2) * 50;
      ctx.fillStyle = i % 4 < 2 ? '#20344a' : '#1b2e43';
      round(x, sy, 463, 42, 5);
      ctx.fill();
      text(label(prop.property_type), x + 14, sy + 27, 16, '#c2d2e3', 400, 'left', 285);
      text(readable(prop.final), x + 448, sy + 28, 24, '#f8f0dd', 600, 'right');
    });
    if (c.buildConstellations) {
      const cy = Math.max(y + Math.ceil(selected.length / 2) * 50 + 16, 385);
      character.constellations.slice(0, 6).forEach((z, i) => {
        ctx.globalAlpha = z.is_actived ? 1 : 0.24;
        contain(art(z.icon), left + i * 68, cy, 45, 45);
        ctx.globalAlpha = 1;
      });
    }
    function calcRelicCv(r) {
      if (!r || !r.sub_property_list) return 0;
      let cr = 0,
        cd = 0;
      for (const sub of r.sub_property_list) {
        const pType = Number(sub.property_type);
        const num = parseFloat(String(sub.value ?? '0').replace('%', ''));
        if (pType === 20) cr += num;
        if (pType === 22) cd += num;
      }
      return Math.round((cr * 2 + cd) * 10) / 10;
    }
    if (c.buildRelics) {
      const sets = new Map();
      for (const r of character.relics) {
        if (r.set?.name) sets.set(r.set.name, (sets.get(r.set.name) ?? 0) + 1);
      }
      text(
        [...sets].map(([name, n]) => name + ' ×' + n).join('  /  '),
        left,
        Math.max(498, 252 + Math.ceil(selected.length / 2) * 50),
        14,
        '#c9ba95',
        500,
        'left',
        width - 180,
      );
      const totalCv =
        Math.round(character.relics.reduce((sum, r) => sum + calcRelicCv(r), 0) * 10) / 10;
      if (c.artifactCv && totalCv > 0) {
        const cvW = 148;
        panel(right - cvW, Math.max(488, 242 + Math.ceil(selected.length / 2) * 50), cvW, 24, {
          fill: '#1a1810f2',
          stroke: '#f59e0b',
          line: 1,
          style: c.frameStyle,
        });
        text(
          `✦ CV: ${totalCv}`,
          right - cvW / 2,
          Math.max(504, 258 + Math.ceil(selected.length / 2) * 50),
          12,
          '#fbbf24',
          700,
          'center',
        );
      }
      const ry = Math.max(520, 260 + Math.ceil(selected.length / 2) * 50),
        items = character.relics;
      items.slice(0, 5).forEach((r, i) => {
        const x = 590 + i * 194,
          pw = 180;
        panel(x, ry, pw, c.buildSubstats ? 281 : 196, {
          fill: '#1e2e42',
          stroke: stars(r) === 5 ? '#756445' : '#635175',
          line: 1,
          style: c.frameStyle,
        });
        if (c.artifactCv) {
          const cv = calcRelicCv(r);
          if (cv > 0) {
            const badgeW = 54,
              badgeH = 17;
            const badgeX = x + pw - badgeW - 8,
              badgeY = ry + 8;
            const cvColor =
              cv >= 50
                ? '#ec4899'
                : cv >= 40
                  ? '#a855f7'
                  : cv >= 30
                    ? '#f59e0b'
                    : cv >= 20
                      ? '#0ea5e9'
                      : '#64748b';
            round(badgeX, badgeY, badgeW, badgeH, 3);
            ctx.fillStyle = cvColor;
            ctx.fill();
            text(`${cv} CV`, badgeX + badgeW / 2, badgeY + 12, 10, '#ffffff', 700, 'center');
          }
        }
        contain(art(r.icon), x + 40, ry + 9, 100, 85);
        text(r.pos_name || r.name, x + 10, ry + 113, 14, '#f1e3c6', 500, 'left', pw - 20);
        if (c.levels) text('+' + r.level, x + pw - 12, ry + 31, 17, '#f3d48a', 600, 'right');
        text(
          label(r.main_property?.property_type),
          x + 10,
          ry + 141,
          13,
          '#b2c9db',
          400,
          'left',
          pw - 20,
        );
        text(readable(r.main_property?.value), x + 10, ry + 169, 25, '#f0db9e', 600);
        if (c.buildSubstats)
          (r.sub_property_list ?? []).slice(0, 4).forEach((q, n) => {
            const isCrit = Number(q.property_type) === 20 || Number(q.property_type) === 22;
            text(
              label(q.property_type),
              x + 10,
              ry + 194 + n * 22,
              12,
              isCrit ? '#fcd34d' : '#bac8d7',
              isCrit ? 600 : 400,
              'left',
              112,
            );
            text(
              readable(q.value),
              x + pw - 10,
              ry + 194 + n * 22,
              13,
              isCrit ? '#fef08a' : '#e4eaf2',
              isCrit ? 700 : 500,
              'right',
            );
          });
      });
      if (!items.length) text('Chưa có thánh di vật được trả về', left, ry + 50, 17, '#a9bfd2');
    }
    if (c.buildSkills) {
      const sy = height - 100;
      const allCrown =
        character.skills.slice(0, 3).length === 3 &&
        character.skills.slice(0, 3).every((s) => Number(s.level) >= 10);
      if (c.crownBadge && allCrown) {
        panel(left, sy - 24, 180, 20, {
          fill: '#78350f',
          stroke: '#fde047',
          line: 1,
          style: c.frameStyle,
        });
        text('👑 TRIPLE CROWN 👑', left + 90, sy - 10, 11, '#fef08a', 800, 'center');
      }
      const skillW = Math.floor((width - 2 * 12) / 3);
      character.skills.slice(0, 3).forEach((s, i) => {
        const x = left + i * (skillW + 12);
        const isCrowned = Number(s.level) >= 10;
        if (c.crownBadge && isCrowned) {
          ctx.save();
          round(x - 4, sy - 4, skillW, 56, 6);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.restore();
        }
        contain(art(s.icon), x, sy, 48, 48);
        text(s.name, x + 59, sy + 15, 12, '#b8c9d8', 400, 'left', skillW - 65);
        text(
          'Cấp ' + s.level,
          x + 59,
          sy + 42,
          22,
          isCrowned ? '#fde047' : '#f2ddb0',
          isCrowned ? 700 : 600,
        );
        if (c.crownBadge && isCrowned) {
          round(x + skillW - 74, sy + 26, 66, 18, 3);
          ctx.fillStyle = '#b45309';
          ctx.fill();
          text('👑 CROWN', x + skillW - 41, sy + 39, 9, '#fef08a', 800, 'center');
        }
      });
    }
    ctx.restore();
  }
}
