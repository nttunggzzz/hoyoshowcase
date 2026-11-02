import http from 'node:http';
import { Transport, ApiError, safeStatus } from './hoyolab/client.mjs';
import { stripCredentials } from './collection/collector.mjs';
import { showcaseModel } from './models/showcase.mjs';
import { createGameMedia } from './media/game-media.mjs';
import { createSessionStore } from './session-store.mjs';
import { HttpError, SESSION_TTL_MS, sameSecret, send, readJsonBody } from './http.mjs';
import { serveStatic } from './routes/static.mjs';
import { dispatchApi } from './routes/api.mjs';

const COLLECTION_READ_ROUTES = new Set([
  '/api/collector/status',
  '/api/collector/export',
  '/api/collector/view',
  '/api/collector/cancel',
  '/api/reset',
  '/api/evidence',
]);

export function createApp({
  transportFactory = () => new Transport(),
  savedSnapshot = null,
  onSnapshot = null,
  onPersistenceError = () =>
    console.error('Không lưu được bản dữ liệu local. Bản trong RAM vẫn có thể xuất.'),
} = {}) {
  let saved = savedSnapshot ? stripCredentials(savedSnapshot) : null;
  const gameMedia = createGameMedia();
  const sessions = createSessionStore(transportFactory);

  async function publishSnapshot(snapshot) {
    saved = stripCredentials(snapshot);
    if (onSnapshot) await onSnapshot(saved);
  }

  const server = http.createServer(async (req, res) => {
    let session;
    let acquired = false;
    try {
      const host = `127.0.0.1:${server.address()?.port}`;
      const origin = `http://${host}`;
      if (req.headers.host !== host)
        throw new HttpError(403, 'Chỉ chấp nhận địa chỉ loopback chính xác.');
      const url = new URL(req.url, origin);
      if (url.search) throw new HttpError(400, 'Không gửi credential qua query string.');

      if (req.method === 'GET') {
        if (url.pathname.startsWith('/media/')) {
          try {
            const asset = await gameMedia(url.pathname.slice(7));
            return send(res, 200, asset.data, asset.type, {
              'Cache-Control': 'private, max-age=86400',
            });
          } catch {
            throw new HttpError(404, 'Không tải được ảnh game.');
          }
        }
        if (url.pathname === '/api/showcase/saved')
          return send(res, 200, { view: showcaseModel(saved, { saved: true }) });
        if (url.pathname === '/api/showcase/archive') {
          if (!saved) throw new HttpError(404, 'Chưa có bản dữ liệu đã lưu.');
          return send(res, 200, saved, 'application/json; charset=utf-8', {
            'Content-Disposition': `attachment; filename="battle-chronicle-${saved.role.uid}.json"`,
          });
        }
        if (await serveStatic(res, url.pathname)) return;
      }
      if (!url.pathname.startsWith('/api/')) throw new HttpError(404, 'Không có đường dẫn này.');

      const cookieName = `poc_sid_${server.address().port}`;
      const sid = (req.headers.cookie ?? '')
        .split(';')
        .map((x) => x.trim())
        .find((x) => x.startsWith(`${cookieName}=`))
        ?.slice(cookieName.length + 1);
      session = sessions.get(sid);
      if (req.method === 'GET' && url.pathname === '/api/session') {
        if (!session) {
          const created = sessions.create();
          session = created.session;
          res.setHeader(
            'Set-Cookie',
            `${cookieName}=${created.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1200`,
          );
        }
        return send(res, 200, {
          csrf: session.csrf,
          expiresAt: new Date(session.created + SESSION_TTL_MS).toISOString(),
          status: safeStatus(session.c),
        });
      }
      if (!session) throw new HttpError(401, 'Phiên local hết hạn. Tải lại trang.');
      if (
        req.method !== 'POST' ||
        req.headers.origin !== origin ||
        !sameSecret(req.headers['x-poc-csrf'], session.csrf) ||
        req.headers['content-type'] !== 'application/json'
      ) {
        throw new HttpError(403, 'Yêu cầu cần cùng origin, JSON và CSRF của phiên.');
      }
      if (session.busy) throw new HttpError(409, 'Phiên này đang có request; chờ kết quả.');
      if (
        session.c.collection?.snapshot.state === 'running' &&
        !COLLECTION_READ_ROUTES.has(url.pathname)
      ) {
        throw new HttpError(
          409,
          'Đang thu thập. Hãy dừng lượt hiện tại trước khi đổi tài khoản hoặc chạy thao tác khác.',
        );
      }
      session.busy = acquired = true;
      const input = await readJsonBody(req);
      if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new HttpError(400, 'JSON phải là một object.');
      }
      const result = await dispatchApi(url.pathname, input, session.c, {
        publishSnapshot,
        onPersistenceError,
      });
      return send(res, 200, { ...result, status: safeStatus(session.c) });
    } catch (error) {
      // Upstream response bodies, headers and credentials never enter HTTP errors or logs.
      return send(res, error instanceof HttpError ? error.status : 400, {
        error: error instanceof Error ? error.message : 'Không hoàn thành yêu cầu.',
        ...(error instanceof ApiError
          ? { operation: error.operation, http: error.http, retcode: error.retcode }
          : {}),
        ...(session ? { status: safeStatus(session.c) } : {}),
      });
    } finally {
      if (acquired) session.busy = false;
    }
  });
  server.on('close', () => sessions.dispose());
  return server;
}
