import { randomBytes } from 'node:crypto';
import { newContext, resetCredentials } from './hoyolab/client.mjs';
import { HttpError, SESSION_TTL_MS } from './http.mjs';

const nonce = () => randomBytes(32).toString('hex');

/** Owns the lifetime of account credentials. Never persist these records. */
export function createSessionStore(transportFactory, { now = Date.now } = {}) {
  const sessions = new Map();

  function expire() {
    for (const [id, session] of sessions) {
      if (now() - session.created > SESSION_TTL_MS) {
        resetCredentials(session.c);
        sessions.delete(id);
      }
    }
  }

  const timer = setInterval(expire, 30_000);
  timer.unref();

  return {
    get(id) {
      expire();
      return sessions.get(id);
    },
    create() {
      expire();
      if (sessions.size >= 10) throw new HttpError(429, 'Đã đạt số phiên local tối đa.');
      const id = nonce();
      const session = {
        created: now(),
        csrf: nonce(),
        c: newContext(transportFactory()),
        busy: false,
      };
      sessions.set(id, session);
      return { id, session };
    },
    dispose() {
      clearInterval(timer);
      for (const session of sessions.values()) resetCredentials(session.c);
      sessions.clear();
    },
  };
}
