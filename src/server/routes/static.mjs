import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { send } from '../http.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const publicRoot = path.join(root, 'public');
const DOCUMENTS = new Set([
  'index.html',
  'architecture.html',
  'contributing.html',
  'data-model.html',
  'security.html',
  'troubleshooting.html',
  'styles.css',
]);
const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' https://act-webstatic.hoyoverse.com https://fastcdn.hoyoverse.com; font-src 'self'; connect-src 'self'; frame-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
const CAPTCHA_CSP =
  "default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.geetest.com https://*.geevisit.com https://*.geetest.cn https://*.captchami.com; style-src 'unsafe-inline' https://*.geetest.com https://*.geevisit.com; img-src data: https://*.geetest.com https://*.geevisit.com https://*.geetest.cn https://*.captchami.com; connect-src https://*.geetest.com https://*.geevisit.com https://*.geetest.cn https://*.captchami.com; frame-src https://*.geetest.com https://*.geevisit.com https://*.captchami.com; base-uri 'none'; form-action 'none'; frame-ancestors 'self'";
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

export async function serveStatic(res, pathname) {
  let filename;
  if (pathname === '/' || pathname === '/collector') filename = path.join(publicRoot, 'index.html');
  else if (pathname === '/research') filename = path.join(publicRoot, 'research.html');
  else if (pathname === '/captcha') filename = path.join(publicRoot, 'captcha.html');
  else if (pathname === '/README.html') filename = path.join(root, 'README.html');
  else if (pathname === '/THIRD_PARTY_NOTICES.md')
    filename = path.join(root, 'THIRD_PARTY_NOTICES.md');
  else if (pathname === '/docs/assets/game-asset-sources.json')
    filename = path.join(root, 'docs/assets/game-asset-sources.json');
  else if (pathname === '/shared/preview-config.mjs')
    filename = path.join(root, 'src/shared/preview-config.mjs');
  else if (pathname === '/docs' || pathname === '/docs/')
    filename = path.join(root, 'docs/index.html');
  else if (pathname.startsWith('/docs/') && DOCUMENTS.has(pathname.slice(6)))
    filename = path.join(root, pathname);
  else if (
    /^\/(js|css|assets)\/[A-Za-z0-9_./-]+$/.test(pathname) &&
    !pathname.split('/').includes('..')
  ) {
    const candidate = path.resolve(publicRoot, '.' + pathname);
    if (candidate.startsWith(publicRoot + path.sep) && MIME[path.extname(candidate)])
      filename = candidate;
  }
  if (!filename) return false;
  try {
    const extension = path.extname(filename);
    const data = await readFile(filename);
    // JSON source attribution is served as bytes, not double-serialized as an API object.
    const type = MIME[extension];
    const headers = { 'Content-Security-Policy': pathname === '/captcha' ? CAPTCHA_CSP : CSP };
    if (pathname === '/captcha') headers['X-Frame-Options'] = 'SAMEORIGIN';
    if (extension === '.png' || extension === '.ttf')
      headers['Cache-Control'] = 'public, max-age=86400';
    if (extension === '.json') {
      return (send(res, 200, JSON.parse(data.toString('utf8')), type, headers), true);
    }
    send(res, 200, data, type, headers);
  } catch {
    send(res, 404, { error: 'Không có tệp này.' });
  }
  return true;
}
