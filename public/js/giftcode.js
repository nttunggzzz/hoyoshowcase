// Giftcode Redemption Controller for HoyoShowcase
// Direct integration with HoYoverse webExchangeCdkey API

const $ = (id) => document.getElementById(id);

let currentCsrf = '';
let currentSession = null;
let activeUid = '';
let activeServer = '';
let activeNickname = '';

const KNOWN_CODES = [
  {
    code: 'GENSHINGIFT',
    reward: '50 Nguyên Thạch + 3 Sách Kinh Nghiệm',
    badge: 'Vĩnh viễn',
  },
  {
    code: 'TARATATATA',
    reward: '10.000 Mora + 10 Sách Kinh Nghiệm',
    badge: 'Mới',
  },
];

async function ensureCsrf() {
  if (currentCsrf) return currentCsrf;
  try {
    const res = await fetch('/api/session');
    const data = await res.json();
    if (data.csrf) {
      currentCsrf = data.csrf;
      currentSession = data.status;
      syncRoleFromSession();
    }
  } catch (err) {
    console.error('Không nạp được CSRF token:', err);
  }
  return currentCsrf;
}

function syncRoleFromSession() {
  if (currentSession?.selected) {
    activeUid = currentSession.selected.uid || activeUid;
    activeServer = currentSession.selected.server || activeServer;
  } else if (currentSession?.roles?.[0]) {
    activeUid = currentSession.roles[0].uid || activeUid;
    activeServer = currentSession.roles[0].server || activeServer;
    activeNickname = currentSession.roles[0].nickname || activeNickname;
  }
  updateAccountBadge();
}

function updateAccountBadge() {
  const label = $('giftcode-role-label');
  const dot = $('giftcode-account-dot');
  if (!label) return;

  const serverNames = {
    os_asia: 'Châu Á (Asia)',
    os_usa: 'Bắc Mỹ (America)',
    os_euro: 'Châu Âu (Europe)',
    os_cht: 'TW/HK/MO',
  };

  if (activeUid) {
    const sName = serverNames[activeServer] || activeServer || 'Châu Á';
    const nick = activeNickname ? `${activeNickname} · ` : '';
    label.innerHTML = `Đổi quà cho: <strong>${nick}UID ${activeUid}</strong> (${sName})`;
    if (dot) dot.className = 'badge-dot active';
  } else {
    label.innerHTML =
      'Chưa kết nối tài khoản HoYoLAB. <a href="#" id="giftcode-login-link">Đăng nhập ngay</a>';
    if (dot) dot.className = 'badge-dot';
    const link = $('giftcode-login-link');
    if (link) {
      link.onclick = (e) => {
        e.preventDefault();
        $('giftcode-dialog')?.close();
        $('connect-open')?.click();
      };
    }
  }
}

function showFeedback(type, message, code = '') {
  const box = $('giftcode-feedback');
  const icon = $('feedback-icon');
  const text = $('feedback-text');
  if (!box || !icon || !text) return;

  box.hidden = false;
  box.className = `giftcode-feedback ${type}`;

  const icons = {
    success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#40e098" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
    warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f5d485" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  };

  icon.innerHTML = icons[type] || icons.warning;
  text.innerHTML = `<strong>${code ? code + ': ' : ''}</strong>${message}`;
}

function hideFeedback() {
  const box = $('giftcode-feedback');
  if (box) box.hidden = true;
}

async function redeem(cdkey) {
  const cleanCode = (cdkey || '').trim().toUpperCase();
  if (!cleanCode) {
    showFeedback('warning', 'Vui lòng nhập mã quà tặng.');
    return;
  }

  const csrf = await ensureCsrf();
  if (!csrf) {
    showFeedback('error', 'Chưa tạo được phiên local. Vui lòng tải lại trang.');
    return;
  }

  const submitBtn = $('giftcode-submit');
  const inputEl = $('giftcode-input');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Đang gửi...</span>`;
  }
  if (inputEl) inputEl.disabled = true;
  hideFeedback();

  try {
    const res = await fetch('/api/redeem-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-poc-csrf': csrf,
      },
      body: JSON.stringify({
        cdkey: cleanCode,
        uid: activeUid || undefined,
        server: activeServer || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || `Lỗi server (${res.status})`);
    }

    if (data.ok) {
      showFeedback(
        'success',
        data.message || 'Đổi thành công! Quà đã được gửi vào Hòm thư trong game của bạn.',
        cleanCode,
      );
    } else {
      const type = data.retcode === -2017 ? 'warning' : 'error';
      showFeedback('warning', data.message || 'Không thể đổi mã này.', cleanCode);
    }
  } catch (err) {
    showFeedback(
      'error',
      err.message ||
        'Không kết nối được tới HoYoverse. Hãy kiểm tra kết nối mạng hoặc thử lại trên web chính thức.',
      cleanCode,
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Đổi quà</span>`;
    }
    if (inputEl) {
      inputEl.disabled = false;
      inputEl.focus();
    }
  }
}

function renderPresets() {
  const container = $('preset-code-list');
  if (!container) return;

  container.innerHTML = KNOWN_CODES.map(
    (c) => `
    <div class="preset-code-card" data-code="${c.code}">
      <div class="code-details">
        <div class="code-title-row">
          <strong>${c.code}</strong>
          ${c.badge ? `<span class="code-badge">${c.badge}</span>` : ''}
        </div>
        <span>${c.reward}</span>
      </div>
      <button type="button" class="button outline mini-redeem-btn" data-code="${c.code}" title="Điền và đổi mã ngay">
        Đổi ngay
      </button>
    </div>
  `,
  ).join('');

  container.querySelectorAll('.mini-redeem-btn').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const code = btn.dataset.code;
      const inp = $('giftcode-input');
      if (inp) inp.value = code;
      redeem(code);
    };
  });

  container.querySelectorAll('.preset-code-card').forEach((card) => {
    card.onclick = () => {
      const code = card.dataset.code;
      const inp = $('giftcode-input');
      if (inp) {
        inp.value = code;
        inp.focus();
      }
    };
  });
}

export function initGiftcode() {
  const dialog = $('giftcode-dialog');
  const openBtn = $('giftcode-open');
  const closeBtn = $('giftcode-close');
  const form = $('giftcode-form');
  const inputEl = $('giftcode-input');
  const pasteBtn = $('giftcode-paste');

  renderPresets();

  window.addEventListener('chronicle:session', (e) => {
    if (e.detail?.csrf) currentCsrf = e.detail.csrf;
    if (e.detail?.status) {
      currentSession = e.detail.status;
      syncRoleFromSession();
    }
  });

  fetch('/api/showcase/saved')
    .then((r) => r.json())
    .then((j) => {
      if (j.view?.role?.uid) {
        activeUid = String(j.view.role.uid);
        activeServer = j.view.role.server || activeServer;
        activeNickname = j.view.profile?.nickname || activeNickname;
        updateAccountBadge();
      }
    })
    .catch(() => {});

  if (openBtn && dialog) {
    openBtn.onclick = () => {
      ensureCsrf();
      updateAccountBadge();
      hideFeedback();
      dialog.showModal();
      setTimeout(() => inputEl?.focus(), 100);
    };
  }

  if (closeBtn && dialog) {
    closeBtn.onclick = () => dialog.close();
  }

  if (dialog) {
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
  }

  if (inputEl) {
    inputEl.addEventListener('input', () => {
      inputEl.value = inputEl.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    });
  }

  if (pasteBtn && inputEl) {
    pasteBtn.onclick = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          inputEl.value = text
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9_-]/g, '');
          inputEl.focus();
        }
      } catch {
        inputEl.focus();
      }
    };
  }

  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const code = inputEl?.value;
      redeem(code);
    };
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGiftcode);
} else {
  initGiftcode();
}
