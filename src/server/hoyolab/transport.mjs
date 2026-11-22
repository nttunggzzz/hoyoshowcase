import { URLS } from './endpoints.mjs';
import { demand } from './validation.mjs';
import { readWebCookies } from './cookies.mjs';
const UA = 'HoyoShowcase/0.7 (local, read-only game data)';
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function errorLabel(retcode) {
  return (
    {
      '-100': 'Credential thiếu, không hợp lệ hoặc đã hết hạn.',
      10102: 'Dữ liệu chưa công khai hoặc endpoint không cho phép xem.',
      1034: 'Battle Chronicle yêu cầu xác minh bổ sung; PoC dừng ở đây.',
      10035: 'API yêu cầu CAPTCHA bổ sung; PoC dừng ở đây.',
      5003: 'API yêu cầu xác minh bổ sung; PoC dừng ở đây.',
      10041: 'API yêu cầu xác minh bổ sung; PoC dừng ở đây.',
    }[retcode] || 'API từ chối yêu cầu; xem operation và retcode trong bằng chứng.'
  );
}
export class ApiError extends Error {
  constructor(operation, http, value) {
    const retcode = Number.isSafeInteger(value) ? value : null;
    super(errorLabel(retcode));
    Object.assign(this, { operation, http, retcode });
  }
}
export function retrySeconds(raw, now = Date.now()) {
  if (!raw) return 0;
  const n = /^\d+$/.test(raw) ? Number(raw) : Math.ceil((Date.parse(raw) - now) / 1000);
  return Number.isFinite(n) ? Math.max(0, n) : 60;
}
export class Transport {
  constructor(fetcher = fetch, { spacing = 400, routes = URLS } = {}) {
    this.fetcher = fetcher;
    this.spacing = spacing;
    this.routes = { ...routes };
    this.last = 0;
    this.blockedUntil = 0;
    this.audit = [];
    this.source = 'none';
    this.schedule = Promise.resolve();
  }
  async request(
    operation,
    {
      method = 'GET',
      body,
      params,
      headers = {},
      retryRead = false,
      signal,
      intervalMs = this.spacing,
    } = {},
  ) {
    demand(
      Object.hasOwn(this.routes, operation) || operation === 'enka',
      'Operation không được hỗ trợ.',
    );
    if (signal?.aborted) throw new Error('Đã dừng thu thập.');
    demand(Date.now() >= this.blockedUntil, 'Đang tạm nghỉ theo giới hạn API; hãy thử lại sau.');
    const url = new URL(
      operation === 'enka' ? `https://enka.network/api/uid/${params.uid}/` : this.routes[operation],
    );
    if (operation !== 'enka' && params)
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    for (let attempt = 0; attempt < 2; attempt++) {
      const previous = this.schedule;
      let release;
      this.schedule = new Promise((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        const delay = Math.max(0, this.last + intervalMs - Date.now());
        if (delay) await pause(delay);
        if (signal?.aborted) throw new Error('Đã dừng thu thập.');
        if (this.blockedUntil > Date.now()) {
          const remaining = this.blockedUntil - Date.now();
          if (remaining > 5000) throw new ApiError(operation, 429, -3006);
          await pause(remaining);
        }
        if (signal?.aborted) throw new Error('Đã dừng thu thập.');
        this.last = Date.now();
      } finally {
        release();
      }
      let response, json;
      const started = Date.now();
      try {
        response = await this.fetcher(url, {
          method,
          headers: {
            Accept: 'application/json',
            'User-Agent': UA,
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...headers,
          },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
          redirect: 'error',
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(25000)])
            : AbortSignal.timeout(25000),
        });
        json = await response.json();
      } catch {
        this.audit.push({
          at: new Date().toISOString(),
          operation,
          source: this.source,
          outcome: 'transport_or_json_error',
        });
        throw new Error(`Không đọc được phản hồi ${operation}; không tự thử lại đăng nhập.`);
      }
      const retcode = Number.isSafeInteger(json?.retcode) ? json.retcode : null;
      const retryAfter = retrySeconds(response.headers.get('retry-after'));
      this.audit.push({
        at: new Date().toISOString(),
        operation,
        source: this.source,
        http: response.status,
        retcode,
        durationMs: Date.now() - started,
        ...(retryAfter ? { retryAfterSeconds: retryAfter } : {}),
      });
      if (response.status === 429 || retcode === -3006) {
        const wait = Math.max(1, retryAfter || 60);
        this.blockedUntil = Date.now() + wait * 1000;
        if (method === 'GET' && retryRead && attempt === 0 && wait <= 5) {
          await pause(wait * 1000);
          continue;
        }
        throw new ApiError(operation, response.status, retcode ?? 429);
      }
      if (!response.ok) throw new ApiError(operation, response.status, retcode);
      return {
        json,
        aigis: response.headers.get('x-rpc-aigis'),
        risk: response.headers.get('x-rpc-verify'),
        http: response.status,
        ...(operation === 'webLogin' ? { cookies: readWebCookies(response.headers) } : {}),
      };
    }
  }
  async data(operation, options) {
    const r = await this.request(operation, options);
    if (r.json.retcode !== 0) throw new ApiError(operation, r.http, r.json.retcode);
    demand(r.json.data && typeof r.json.data === 'object', 'API thành công nhưng thiếu data.');
    return r.json.data;
  }
}
