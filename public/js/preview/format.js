export const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(value);
export const formatValue = (v) => {
  const s = String(v ?? '');
  return /^-?\d+(\.\d+)?%?$/.test(s)
    ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(parseFloat(s)) +
        (s.endsWith('%') ? '%' : '')
    : s;
};
