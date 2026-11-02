import { GAME_ASSETS } from '../game-assets.js';
import { PROPERTY_LABELS, properties, stars, vip } from '/shared/preview-config.mjs';
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
  const { round, panel, text, cover, contain } = createCanvasPainter(ctx);
  const label = (id) => PROPERTY_LABELS[id] || model.propertyMap[id]?.name || 'Chỉ số ' + id;
  let hits = [];
  onProgress('Đang dựng ảnh theo tùy chỉnh…');
  const background = model.regions.find((r) => String(r.id) === c.background),
    maps = c.maps ? mapRegions(model) : [],
    urls = [
      background?.background_image,
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
  ctx.setTransform(p.scale, 0, 0, p.scale, 0, 0);
  ctx.fillStyle = '#101d2e';
  ctx.fillRect(0, 0, 1600, p.height);
  hits = [];
  const art = (url) => images.get(url),
    bg = art(background?.background_image);
  if (p.mapHeight) paintMaps(0);
  if (p.boardHeight) paintBoard(p.mapHeight);
  let y = p.mapHeight + p.boardHeight;
  p.buildCharacters.forEach((character, i) => {
    paintBuild(character, y, p.buildHeights[i]);
    y += p.buildHeights[i];
  });
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
      text(model.profile.nickname || 'Nhà lữ hành', x, top + 25, 28, '#fff', 600, 'left', w - 100);
      top += 34;
    }
    const meta = [];
    if (c.uid) meta.push('UID ' + model.role.uid);
    if (c.server) meta.push(model.role.server);
    if (meta.length) {
      text(meta.join(' / '), x, top + 19, 15, '#bdcede');
      top += 27;
    }
    if (c.ar)
      text('AR ' + (model.profile.level ?? '-'), x + w - 8, y + 28, 25, '#f1d58e', 600, 'right');
    if (c.updated)
      text(
        new Date(model.updatedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        x,
        top + 18,
        13,
        '#a6b9cc',
      );
  }
  function paintBoard(offset) {
    ctx.save();
    ctx.translate(0, offset);
    cover(bg, 0, 0, 1600, p.boardHeight);
    ctx.fillStyle = '#07162b78';
    ctx.fillRect(0, 0, 1600, p.boardHeight);
    const banner = p.banner;
    ctx.save();
    round(banner.x, 20, banner.width, p.bannerHeight);
    ctx.clip();
    cover(bg, banner.x, 20, banner.width, p.bannerHeight);
    ctx.fillStyle = '#10223960';
    ctx.fillRect(banner.x, 20, banner.width, p.bannerHeight);
    ctx.restore();
    panel(banner.x, 20, banner.width, p.bannerHeight, { fill: '#11233528' });
    const hasIdentity = c.name || c.uid || c.ar || c.avatar || c.server || c.updated;
    if (hasIdentity) {
      panel(banner.x + banner.width - 450, 35, 432, 110, { fill: '#122438da' });
      identity(banner.x + banner.width - 435, 45, 400);
    } else text('GENSHIN IMPACT', banner.x + 22, 60, 16, '#d9c996', 600);
    const cols = p.both ? 3 : 5,
      fw = (banner.width - 36) / cols,
      factStart = hasIdentity ? 150 : 40;
    p.facts.forEach((f, i) => {
      const x = banner.x + 18 + (i % cols) * fw,
        y = factStart + Math.floor(i / cols) * 77;
      const short = f.group.startsWith('Khám phá / ')
        ? f.group.slice(10) + ' / ' + f.label
        : f.group === 'Bộ sưu tập' || f.group === 'Hồ sơ & tài nguyên'
          ? f.label
          : f.group + ' / ' + f.label;
      text(short, x, y, 13, '#bed0df', 400, 'left', fw - 15);
      text(
        f.display,
        x,
        y + 32,
        f.available ? 25 : 18,
        f.available ? '#f4e4bc' : '#b6c5d3',
        500,
        'left',
        fw - 16,
      );
    });
    if (c.characters) {
      if (p.both) {
        panel(20, 20, 552, 74, { fill: '#102137dc' });
        text('BỘ SƯU TẬP', 38, 53, 22, '#e9d59d', 600);
        if (c.name) text(model.profile.nickname || 'Nhà lữ hành', 38, 77, 15, '#c8d5e4');
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
      fill: '#132438e8',
      stroke: isWeapon ? '#baa071' : '#d7bd82',
    });
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
      '#ead6a2',
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
  function paintBuild(character, top, height) {
    ctx.save();
    ctx.translate(0, top);
    const exclusive = c.c6 && c.buildConstellations && vip(character),
      border = exclusive ? '#ffdc78' : stars(character) === 5 ? '#cbb06e' : '#9474b4';
    panel(20, 14, 1560, height - 28, {
      fill: '#15263bed',
      stroke: border,
      line: exclusive ? 3 : 1.5,
    });
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
    text('★'.repeat(stars(character)), 95, 66, 18, '#ead398', 600);
    text(character.name, 48, heroHeight - 95, 48, '#fff', 600, 'left', 470);
    const meta = [];
    if (c.levels) meta.push('Lv. ' + character.level);
    if (c.buildConstellations) meta.push('C' + (character.actived_constellation_num ?? 0));
    if (c.buildFetter) meta.push('Thiện cảm ' + character.fetter);
    text(meta.join(' / '), 48, heroHeight - 61, 20, '#d9e3ef');
    if (c.uid) text('UID ' + model.role.uid, 48, heroHeight - 30, 14, '#afc2d5');
    if (exclusive) {
      panel(426, 40, 106, 65, { fill: '#edc05e', stroke: '#fff0a5', line: 2 });
      text('C6', 479, 88, 40, '#211a0e', 800, 'center');
    }
    const left = 590,
      right = 1550,
      width = 960;
    let y = 54;
    const weapon = character.weapon;
    if (c.buildWeapon && weapon) {
      panel(left, y - 16, width, 111, { fill: '#20334b', stroke: '#665b49', line: 1 });
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
        width,
      );
      const ry = Math.max(520, 260 + Math.ceil(selected.length / 2) * 50),
        items = character.relics;
      items.slice(0, 5).forEach((r, i) => {
        const x = 590 + i * 194,
          pw = 180;
        panel(x, ry, pw, c.buildSubstats ? 281 : 196, {
          fill: '#213249',
          stroke: stars(r) === 5 ? '#756445' : '#635175',
          line: 1,
        });
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
            text(
              label(q.property_type),
              x + 10,
              ry + 194 + n * 22,
              12,
              '#bac8d7',
              400,
              'left',
              112,
            );
            text(readable(q.value), x + pw - 10, ry + 194 + n * 22, 13, '#e4eaf2', 500, 'right');
          });
      });
      if (!items.length) text('Chưa có thánh di vật được trả về', left, ry + 50, 17, '#a9bfd2');
    }
    if (c.buildSkills) {
      const sy = height - 100;
      character.skills.slice(0, 3).forEach((s, i) => {
        const x = 590 + i * 322;
        contain(art(s.icon), x, sy, 48, 48);
        text(s.name, x + 59, sy + 15, 12, '#b8c9d8', 400, 'left', 245);
        text('Cấp ' + s.level, x + 59, sy + 42, 22, '#f2ddb0', 600);
      });
    }
    ctx.restore();
  }
}
