let csrf = '',
  challenge = null,
  busy = false;
const $ = (id) => document.getElementById(id);
const data = (form) => Object.fromEntries(new FormData(form));
async function request(path, input = {}) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button').forEach((b) => (b.disabled = true));
  $('activity').textContent = 'Đang đọc API…';
  try {
    const r = await fetch(`/api/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-poc-csrf': csrf },
      body: JSON.stringify(input),
    });
    const j = await r.json();
    $('result').textContent = JSON.stringify(j, null, 2);
    $('activity').textContent = j.error
      ? 'Bước này chưa thành công.'
      : j.need
        ? 'Cần bạn hoàn tất xác minh.'
        : 'Đã nhận kết quả.';
    if (j.status) showStatus(j.status);
    const need =
      j.need || (j.status?.pendingCaptcha ? 'captcha' : j.status?.otpPending ? 'otp' : null);
    $('otp-box').hidden = need !== 'otp';
    $('captcha-box').hidden = need !== 'captcha';
    if (need === 'otp')
      $('otp-note').textContent = j.sent
        ? 'Mã đã được gửi. Nhập OTP ở dưới.'
        : 'Dùng mã đã nhận, hoặc bấm gửi OTP nếu chưa có.';
    if (need === 'captcha') {
      const next = j.captcha || j.status.pendingCaptcha;
      const changed = JSON.stringify(challenge) !== JSON.stringify(next);
      challenge = next;
      if (changed || $('captcha-frame').getAttribute('src') !== '/captcha')
        $('captcha-frame').src = '/captcha';
    } else {
      challenge = null;
      $('captcha-frame').src = 'about:blank';
    }
    return j;
  } catch {
    $('activity').textContent = 'Không kết nối được PoC local. Tải lại trang nếu phiên đã hết hạn.';
  } finally {
    busy = false;
    document.querySelectorAll('button').forEach((b) => (b.disabled = false));
  }
}
function showStatus(s) {
  $('session').textContent =
    `Nguồn: ${s.source ?? 'chưa có'} · Token LOGIN: ${s.hasLoginToken || s.hasSdkToken ? 'có' : 'chưa'} · LToken: ${s.hasLtoken ? 'có' : 'chưa'} · CookieToken v2: ${s.hasCookieTokenV2 ? 'có' : 'chưa'} · Authkey: ${s.hasAuthkey ? 'có' : 'chưa'} · UID chọn: ${s.selected?.uid ?? 'chưa có'} · Bản ghi RAM: ${s.records}`;
  const previous = $('roles').value;
  $('roles').replaceChildren(new Option('Chọn game role', ''));
  for (const r of s.roles)
    $('roles').add(
      new Option(`${r.uid} / ${r.server} / ${r.nickname} / Lv.${r.level}`, `${r.uid}|${r.server}`),
    );
  $('roles').value = previous;
}
for (const id of ['showcase', 'login', 'otp', 'cookies', 'sync'])
  $(id).addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = data(e.target);
    if (id === 'login') {
      e.target.elements.account.value = '';
      e.target.elements.password.value = '';
    } else if (['otp', 'cookies'].includes(id)) e.target.reset();
    await request(id, input);
  });
$('authkey-import').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = data(e.target);
  e.target.reset();
  await request('import-authkey', input);
});
$('role').addEventListener('submit', async (e) => {
  e.preventDefault();
  const [uid, server] = $('roles').value.split('|');
  if (uid) await request('select', { uid, server });
});
function download(value, name) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
    url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
document.querySelectorAll('[data-action]').forEach((b) =>
  b.addEventListener('click', async () => {
    const act = b.dataset.action;
    if (act === 'roles-account') return request('roles', { route: 'roles' });
    if (act === 'roles-lab') return request('roles', { route: 'labRoles' });
    if (act === 'detail') return request('chronicle', { detail: true });
    const j = await request(act);
    if (act === 'backup' && j?.backup) download(j.backup, 'genshin-wish-backup.json');
    if (act === 'evidence' && j?.events)
      download({ format: j.format, events: j.events }, 'genshin-api-evidence.json');
  }),
);
$('backup-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 4_500_000) throw Error();
    const backup = JSON.parse(await file.text());
    await request('import-backup', { backup });
  } catch {
    $('activity').textContent = 'Backup JSON không hợp lệ hoặc quá lớn.';
  } finally {
    e.target.value = '';
  }
});
window.addEventListener('message', async (e) => {
  if (
    !['null', location.origin].includes(e.origin) ||
    e.source !== $('captcha-frame').contentWindow
  )
    return;
  if (e.data?.kind === 'captcha-ready' && challenge)
    e.source.postMessage({ kind: 'challenge', challenge }, '*');
  if (e.data?.kind === 'captcha-result')
    await request('captcha', { validation: e.data.validation });
});
fetch('/api/session')
  .then((r) => r.json())
  .then((j) => {
    if (!j.csrf) throw Error();
    csrf = j.csrf;
    showStatus(j.status);
    if (j.status.pendingCaptcha) {
      challenge = j.status.pendingCaptcha;
      $('captcha-box').hidden = false;
      $('captcha-frame').src = '/captcha';
      $('activity').textContent = 'Đã tiếp tục CAPTCHA đang chờ trong phiên local.';
    } else if (j.status.otpPending) {
      $('otp-box').hidden = false;
      $('otp-note').textContent = 'Phiên đang chờ OTP. Dùng mã đã gửi hoặc bấm gửi mã nếu chưa có.';
    }
  })
  .catch(() => {
    $('activity').textContent = 'Không tạo được phiên local. Hãy tải lại trang.';
  });
