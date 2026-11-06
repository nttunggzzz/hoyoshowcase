/** Small canvas primitives; no account state or DOM controls. */
export function createCanvasPainter(ctx) {
  function round(x, y, w, h, r = 8) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }
  function chiseled(x, y, w, h, c = 8) {
    ctx.beginPath();
    ctx.moveTo(x + c, y);
    ctx.lineTo(x + w - c, y);
    ctx.lineTo(x + w, y + c);
    ctx.lineTo(x + w, y + h - c);
    ctx.lineTo(x + w - c, y + h);
    ctx.lineTo(x + c, y + h);
    ctx.lineTo(x, y + h - c);
    ctx.lineTo(x, y + c);
    ctx.closePath();
  }
  function panel(
    x,
    y,
    w,
    h,
    { fill = '#152538e0', stroke = '#c8ad75', line = 1.5, style = 'modern' } = {},
  ) {
    ctx.fillStyle = fill;
    if (style === 'fantasy') {
      chiseled(x, y, w, h, 10);
    } else {
      round(x, y, w, h);
    }
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = line;
    ctx.stroke();
  }
  function cornerBrackets(x, y, w, h, color = '#f5d485', size = 12) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(x, y + size);
    ctx.lineTo(x, y);
    ctx.lineTo(x + size, y);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + w - size, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + size);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x, y + h - size);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + size, y + h);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + w - size, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - size);
    ctx.stroke();
    ctx.restore();
  }
  function vignette(w, h, strength = 0.45) {
    ctx.save();
    const cx = w / 2,
      cy = h / 2,
      radius = Math.max(cx, cy) * 1.1;
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, radius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.7, `rgba(0, 0, 0, ${strength * 0.4})`);
    grad.addColorStop(1, `rgba(0, 0, 0, ${strength})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  function text(value, x, y, size = 16, color = '#f1eee5', weight = 500, align = 'left', maxWidth) {
    ctx.fillStyle = color;
    ctx.textAlign = align;
    let str = String(value ?? '');
    ctx.font = `${weight} ${size}px Outfit, sans-serif`;
    if (maxWidth && Number.isFinite(maxWidth)) {
      while (ctx.measureText(str).width > maxWidth && size > 9) {
        size--;
        ctx.font = `${weight} ${size}px Outfit, sans-serif`;
      }
      if (ctx.measureText(str).width > maxWidth) {
        while (str.length > 1 && ctx.measureText(str + '…').width > maxWidth) {
          str = str.slice(0, -1);
        }
        str += '…';
      }
    }
    ctx.fillText(str, x, y);
  }
  function cover(im, x, y, w, h) {
    if (!im) return;
    const scale = Math.max(w / im.width, h / im.height),
      iw = w / scale,
      ih = h / scale;
    ctx.drawImage(im, (im.width - iw) / 2, (im.height - ih) / 2, iw, ih, x, y, w, h);
  }
  function contain(im, x, y, w, h) {
    if (!im) return;
    const scale = Math.min(w / im.width, h / im.height);
    ctx.drawImage(
      im,
      x + (w - im.width * scale) / 2,
      y + (h - im.height * scale) / 2,
      im.width * scale,
      im.height * scale,
    );
  }

  return { round, chiseled, panel, cornerBrackets, vignette, text, cover, contain };
}
