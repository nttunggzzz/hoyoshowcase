let csrf = '',
  sessionState = null,
  challenge = null,
  busy = false,
  polling = false,
  pollTimer = null,
  snapshot = null,
  downloadedId = null,
  jobEpoch = 0;
let memoryDeviceId = null;
function webDeviceId() {
  const key = 'genshin.hoyolabWeb.deviceId',
    valid = (v) =>
      typeof v === 'string' &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
  try {
    const saved = localStorage.getItem(key);
    if (valid(saved)) return saved;
    memoryDeviceId ??= crypto.randomUUID();
    localStorage.setItem(key, memoryDeviceId);
    return memoryDeviceId;
  } catch {
    return (memoryDeviceId ??= crypto.randomUUID());
  }
}
const localDate = (d) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
const $ = (id) => document.getElementById(id);
const messages = {
  idle: 'Chưa chạy',
  running: 'Đang lấy dữ liệu',
  complete: 'Đã hoàn tất',
  partial: 'Hoàn tất một phần',
  cancelled: 'Đã dừng',
  expired: 'Phiên hết hạn',
  needs_verification: 'Cần xác minh',
  rate_limited: 'Cần chờ giới hạn API',
  request_limit: 'Đạt giới hạn request',
  failed: 'Chưa hoàn tất',
};
const moduleStates = {
  queued: 'Đang chờ',
  running: 'Đang đọc',
  ok: 'Đã lấy',
  not_applicable: 'Chưa mở khóa',
  partial: 'Chưa đầy đủ',
  unavailable: 'Không truy cập được',
  error: 'Lỗi',
  skipped: 'Chưa lấy',
  cancelled: 'Đã dừng',
  expired: 'Hết hạn',
  needs_verification: 'Cần xác minh',
  rate_limited: 'Giới hạn API',
  request_limit: 'Đạt giới hạn',
};
function message(s) {
  $('collector-message').textContent = s;
}
function controls() {
  document.querySelectorAll('#collector-console button').forEach((b) => {
    if (
      !['collector-download', 'collector-cancel', 'collector-clear', 'collector-close'].includes(
        b.id,
      )
    )
      b.disabled = busy || polling;
  });
  document.querySelectorAll('#collector-console input,#collector-console select').forEach((x) => {
    if (!['collector-auto-download', 'collector-search'].includes(x.id))
      x.disabled = busy || polling;
  });
  $('collector-start').disabled = busy || polling || !$('collector-roles').value;
  $('collector-cancel').disabled = !polling;
  $('collector-download').disabled = !snapshot || polling;
  window.dispatchEvent(
    new CustomEvent('chronicle:session', { detail: { status: sessionState, busy, polling, csrf } }),
  );
}
function setSession(s) {
  sessionState = s;
  const pending = s.pendingCaptcha || s.otpPending;
  $('collector-login').hidden = !!s.hasLtoken || !!pending;
  $('collector-change-account').hidden = !s.hasLtoken && !pending;
  $('collector-auth-note').textContent = s.hasLtoken
    ? 'Đang dùng phiên HoYoLAB trong RAM local. Bạn có thể lấy dữ liệu tiếp mà không nhập lại mật khẩu. Phiên được giữ tối đa 20 phút.'
    : 'Dùng luồng đăng nhập web HoYoLAB. Chỉ Device ID được giữ ổn định trong trình duyệt; cookie/token ở RAM local tối đa 20 phút. CAPTCHA hoặc xác minh bổ sung chỉ xuất hiện nếu HoYoLAB yêu cầu.';
  const source =
    {
      hoyolab_web: 'HoYoLAB Web',
      manual_cookies: 'Cookie đã nhập',
      hoyolab_web_pending: 'HoYoLAB Web · đang xác minh',
    }[s.source] ||
    s.source ||
    'chưa đăng nhập';
  const genshinCount = s.roles.filter((r) => r.game !== 'hsr').length;
  const hsrCount = s.roles.filter((r) => r.game === 'hsr').length;
  $('collector-account-state').textContent =
    `Nguồn: ${source} · Cookie HoYoLAB: ${s.hasLtoken ? 'có' : 'chưa có'} · Genshin: ${genshinCount} · Star Rail: ${hsrCount}`;
  const prior = $('collector-roles').value;
  $('collector-roles').replaceChildren(
    new Option(s.roles.length ? 'Chọn UID/server' : 'Chưa có tài khoản', ''),
  );
  for (const r of s.roles) {
    const isHsr = r.game === 'hsr' || r.gameBiz === 'hkrpg_global';
    const tag = isHsr ? '✦ [Star Rail]' : '✦ [Genshin]';
    $('collector-roles').add(
      new Option(
        `${tag} ${r.uid} · ${r.server} · ${r.nickname || (isHsr ? 'Khai Phá' : 'Genshin')} · cấp ${r.level}`,
        `${r.uid}|${r.server}`,
      ),
    );
  }
  if ([...$('collector-roles').options].some((x) => x.value === prior))
    $('collector-roles').value = prior;
  if (s.selected) $('collector-roles').value = `${s.selected.uid}|${s.selected.server}`;
  controls();
}
function authView(j) {
  const need =
    j.need || (j.status?.pendingCaptcha ? 'captcha' : j.status?.otpPending ? 'otp' : null);
  $('collector-otp').hidden = need !== 'otp';
  $('collector-captcha-box').hidden = need !== 'captcha';
  if (need === 'otp') {
    $('collector-otp-note').textContent = j.sent
      ? 'HoYoLAB yêu cầu xác minh bổ sung và đã gửi mã. Nhập OTP tại đây.'
      : 'HoYoLAB yêu cầu xác minh bổ sung cho lượt đăng nhập này. Dùng mã đã nhận hoặc bấm gửi OTP email.';
    message('HoYoLAB yêu cầu xác minh bổ sung cho lượt đăng nhập này.');
  }
  if (need === 'captcha') {
    const next = j.captcha || j.status.pendingCaptcha;
    if (
      JSON.stringify(next) !== JSON.stringify(challenge) ||
      $('collector-captcha').getAttribute('src') !== '/captcha'
    ) {
      challenge = next;
      $('collector-captcha').src = '/captcha';
    }
    message('Hoàn tất CAPTCHA để tiếp tục tự động lấy dữ liệu.');
  } else {
    challenge = null;
    $('collector-captcha').src = 'about:blank';
  }
  return need;
}
async function api(path, input = {}, deferStatus = false) {
  const r = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-poc-csrf': csrf },
    body: JSON.stringify(input),
  });
  let j;
  try {
    j = await r.json();
  } catch {
    throw Error('Không nhận được phản hồi từ server local.');
  }
  if (j.status && !deferStatus) setSession(j.status);
  if (j.error) {
    if (!deferStatus) authView(j);
    throw Error(`${j.error}${j.retcode !== undefined ? ` (mã ${j.retcode})` : ''}`);
  }
  return j;
}
async function action(fn) {
  if (busy) return;
  busy = true;
  controls();
  try {
    await fn();
  } catch (e) {
    message(e.message || 'Chưa hoàn thành yêu cầu.');
  } finally {
    busy = false;
    controls();
  }
}
async function afterAuth(j) {
  if (authView(j)) return;
  if (j.stage?.endsWith('_login') && j.stage !== 'hoyolab_web_login') {
    message('Đăng nhập thành công. Đang chuẩn bị cookie và tìm game role…');
    await api('exchange');
  } else message('Đang dùng cookie web để tìm tài khoản Genshin…');
  try {
    await api('roles', { route: sessionState.hasCookieTokenV2 ? 'roles' : 'labRoles' });
  } catch (e) {
    if (!sessionState.hasLtoken) throw e;
    await api('roles', { route: 'labRoles' });
  }
  if (sessionState.hasCookieTokenV2) {
    try {
      await api('roles', { route: 'roles', gameBiz: 'hkrpg_global' });
    } catch {}
  }
  if (sessionState.roles.length === 1) {
    const r = sessionState.roles[0];
    $('collector-roles').value = `${r.uid}|${r.server}`;
    await begin();
  } else
    message(
      sessionState.roles.length
        ? 'Chọn UID/server muốn lấy dữ liệu (Genshin hoặc Star Rail) rồi bấm “Lấy toàn bộ dữ liệu”.'
        : 'Tài khoản này chưa trả game role Genshin Global.',
    );
}
async function begin() {
  const value = $('collector-roles').value;
  if (!value) throw Error('Hãy chọn UID/server.');
  jobEpoch++;
  const [uid, server] = value.split('|');
  await api('select', { uid, server });
  snapshot = null;
  downloadedId = null;
  $('collector-preview').hidden = true;
  const roleObj = sessionState?.roles?.find((r) => r.uid === uid && r.server === server);
  const isHsr = roleObj?.game === 'hsr' || roleObj?.gameBiz === 'hkrpg_global';
  const j = await api('collector/start', { game: isHsr ? 'hsr' : 'genshin' });
  renderCollection(j.collection);
  polling = true;
  controls();
  schedulePoll();
}
function schedulePoll() {
  clearTimeout(pollTimer);
  const epoch = jobEpoch;
  pollTimer = setTimeout(
    () =>
      poll(epoch).catch((e) => {
        if (epoch !== jobEpoch) return;
        polling = false;
        message(e.message);
        controls();
      }),
    500,
  );
}
async function poll(epoch = jobEpoch) {
  const j = await api('collector/status', {}, true);
  if (epoch !== jobEpoch) return;
  if (j.status) setSession(j.status);
  renderCollection(j.collection);
  if (j.collection.state === 'running') {
    polling = true;
    schedulePoll();
    return;
  }
  polling = false;
  controls();
  if (j.collection.hasSnapshot) {
    const result = await api('collector/export', {}, true);
    if (epoch !== jobEpoch) return;
    snapshot = result.snapshot;
    renderCharacters();
    controls();
    if ($('collector-auto-download').checked && downloadedId !== snapshot.id) {
      saveSnapshot();
      downloadedId = snapshot.id;
    }
    try {
      const isHsr = snapshot.schema === 'hsr-battle-chronicle-v1';
      const viewResult = await api('collector/view', {
        game: isHsr ? 'hsr' : 'genshin',
      });
      if (viewResult?.view) {
        if (isHsr) {
          window.dispatchEvent(new CustomEvent('hsr:update-data', { detail: viewResult.view }));
          window.dispatchEvent(new CustomEvent('hsr:rendered', { detail: viewResult.view }));
        } else {
          window.dispatchEvent(new CustomEvent('showcase:rendered', { detail: viewResult.view }));
        }
      }
    } catch {}
  }
}
function renderCollectionOriginal(c) {
  $('collector-state').textContent = messages[c.state] || c.state;
  $('collector-time').textContent = c.startedAt
    ? `Bắt đầu: ${new Date(c.startedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}${c.finishedAt ? ` · Kết thúc: ${new Date(c.finishedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}` : ''} · ${c.requestCount} request`
    : '';
  const s = c.summary;
  $('collector-character-count').textContent = s?.characters ?? '—';
  $('collector-weapon-count').textContent = s?.equippedWeapons ?? '—';
  $('collector-artifact-count').textContent = s?.equippedArtifacts ?? '—';
  $('collector-module-count').textContent = s
    ? `${s.modulesSucceeded}/${s.modulesApplicable ?? s.modulesTotal}`
    : `${c.modules.filter((x) => x.state === 'ok').length}/${c.modules.length}`;
  $('collector-modules').replaceChildren();
  for (const m of c.modules) {
    const tr = document.createElement('tr');
    for (const text of [
      m.label,
      moduleStates[m.state] || m.state,
      m.error
        ? `${m.error.message}${m.error.retcode !== undefined ? ` (${m.error.retcode})` : ''}`
        : m.progress
          ? JSON.stringify(m.progress)
          : m.reason || `${m.requestCount} request`,
    ]) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.append(td);
    }
    tr.children[1].className =
      m.state === 'ok'
        ? 'state-ok'
        : m.state === 'running'
          ? 'state-running'
          : ['queued', 'skipped', 'not_applicable'].includes(m.state)
            ? ''
            : 'state-error';
    $('collector-modules').append(tr);
  }
  if (c.state === 'running')
    message(`Đang lấy ${c.modules.find((x) => x.id === c.activeModule)?.label || 'dữ liệu'}…`);
  else if (c.state === 'complete')
    message(
      'Đã lấy xong các mục đã đối chiếu. JSON chứa toàn bộ dữ liệu trả về và các giới hạn phạm vi.',
    );
  else if (c.state !== 'idle')
    message(
      'Đã giữ phần dữ liệu lấy được. Xem trạng thái từng mục và tải JSON để kiểm tra phần còn thiếu.',
    );
}
function renderCharacters() {
  if (!snapshot) return;
  $('collector-preview').hidden = false;
  const q = $('collector-search').value.trim().toLocaleLowerCase();
  $('collector-characters').replaceChildren();
  const isHsr = snapshot.schema === 'hsr-battle-chronicle-v1';
  if (isHsr) {
    const list =
      snapshot.sections?.characters?.data?.avatar_list ||
      snapshot.sections?.avatar_info?.data?.avatar_list ||
      [];
    for (const c of list) {
      const name = c.name || String(c.id);
      const equip = c.equip || {};
      if (q && !`${name} ${equip.name || ''}`.toLocaleLowerCase().includes(q)) continue;
      const tr = document.createElement('tr');
      for (const value of [
        name,
        c.level ?? '—',
        `E${c.rank ?? 0}`,
        equip.name || '—',
        equip.level ? `Lv. ${equip.level} / S${equip.rank || 1}` : '—',
      ]) {
        const td = document.createElement('td');
        td.textContent = String(value);
        tr.append(td);
      }
      $('collector-characters').append(tr);
    }
    return;
  }
  if (!snapshot.views?.characters) return;
  for (const c of snapshot.views.characters) {
    const base = c.detail?.base || c.basic,
      weapon = c.detail?.weapon || c.basic.weapon || {};
    if (q && !`${base.name || ''} ${weapon.name || ''}`.toLocaleLowerCase().includes(q)) continue;
    const tr = document.createElement('tr');
    for (const value of [
      base.name || c.id,
      base.level ?? '—',
      base.actived_constellation_num ?? '—',
      weapon.name || '—',
      `${weapon.level ?? '—'} / ${weapon.affix_level ?? '—'}`,
    ]) {
      const td = document.createElement('td');
      td.textContent = String(value);
      tr.append(td);
    }
    $('collector-characters').append(tr);
  }
}
function saveSnapshot() {
  if (!snapshot) return;
  const isHsr = snapshot.schema === 'hsr-battle-chronicle-v1';
  const prefix = isHsr ? 'hsr-battle-chronicle' : 'battle-chronicle';
  const date = localDate(new Date(snapshot.startedAt)),
    url = URL.createObjectURL(
      new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }),
    ),
    a = document.createElement('a');
  a.href = url;
  a.download = `${prefix}-${snapshot.role?.uid || 'latest'}-${date}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('collector-login').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = Object.fromEntries(new FormData(e.target));
  e.target.elements.account.value = '';
  e.target.elements.password.value = '';
  action(async () => {
    message('Đang đăng nhập HoYoLAB Web…');
    await afterAuth(
      await api('login', { ...input, profile: 'hoyolab_web', deviceId: webDeviceId() }),
    );
  });
});
$('collector-cookies').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = Object.fromEntries(new FormData(e.target));
  e.target.reset();
  action(async () => afterAuth(await api('cookies', input)));
});
$('collector-otp-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = Object.fromEntries(new FormData(e.target));
  e.target.reset();
  action(async () => afterAuth(await api('otp', input)));
});
$('collector-send-otp').addEventListener('click', () =>
  action(async () => authView(await api('send-otp'))),
);
$('collector-refresh-captcha').addEventListener('click', () =>
  action(async () => afterAuth(await api('refresh-captcha'))),
);
$('collector-role-form').addEventListener('submit', (e) => {
  e.preventDefault();
  action(begin);
});
$('collector-roles').addEventListener('change', controls);
$('collector-download').addEventListener('click', saveSnapshot);
$('collector-search').addEventListener('input', renderCharacters);
$('collector-cancel').addEventListener('click', () =>
  action(async () => {
    await api('collector/cancel');
    await poll();
  }),
);
async function clearSession() {
  jobEpoch++;
  clearTimeout(pollTimer);
  await api('reset');
  polling = false;
  snapshot = null;
  challenge = null;
  $('collector-preview').hidden = true;
  authView({});
  renderCollection({ state: 'idle', modules: [], summary: null });
  message('Đã xóa dữ liệu và credential khỏi phiên RAM local.');
}
$('collector-clear').addEventListener('click', () => action(clearSession));
$('collector-change-account').addEventListener('click', () => action(clearSession));
window.addEventListener('message', (e) => {
  if (
    !['null', location.origin].includes(e.origin) ||
    e.source !== $('collector-captcha').contentWindow
  )
    return;
  if (e.data?.kind === 'captcha-ready' && challenge)
    e.source.postMessage({ kind: 'challenge', challenge }, '*');
  if (e.data?.kind === 'captcha-result')
    action(async () => afterAuth(await api('captcha', { validation: e.data.validation })));
});
fetch('/api/session')
  .then((r) => r.json())
  .then(async (j) => {
    if (!j.csrf) throw Error('Không tạo được phiên local.');
    csrf = j.csrf;
    setSession(j.status);
    const pending = authView({ status: j.status });
    const c = await api('collector/status');
    renderCollection(c.collection);
    if (c.collection.state === 'running') {
      polling = true;
      controls();
      schedulePoll();
    } else if (c.collection.hasSnapshot) {
      snapshot = (await api('collector/export')).snapshot;
      renderCharacters();
      controls();
    } else if (!pending && sessionState.hasLtoken && !sessionState.roles.length)
      await action(() => afterAuth({}));
    else if (pending) authView({ status: j.status });
    else if (sessionState.hasLtoken)
      message('Đã dùng lại phiên HoYoLAB local. Chọn UID để lấy dữ liệu.');
  })
  .catch((e) => message(e.message));

function renderCollection(c) {
  renderCollectionOriginal(c);
  window.dispatchEvent(new CustomEvent('chronicle:collection', { detail: c }));
}

window.addEventListener('chronicle:request-session', controls);
