/** Small canvas primitives; no account state or DOM controls. */
export function createCanvasPainter(ctx) {
  function round(x, y, w, h, r = 8) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }
  function panel(x, y, w, h, { fill = '#152538e0', stroke = '#c8ad75', line = 1.5 } = {}) {
    ctx.fillStyle = fill;
    round(x, y, w, h);
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = line;
    ctx.stroke();
  }
  function text(value, x, y, size = 16, color = '#f1eee5', weight = 500, align = 'left', maxWidth) {
    ctx.font = `${weight} ${size}px Outfit, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    const str = String(value ?? '');
    if (maxWidth) {
      while (ctx.measureText(str).width > maxWidth && size > 10) {
        size--;
        ctx.font = `${weight} ${size}px Outfit, sans-serif`;
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

  return { round, panel, text, cover, contain };
}
