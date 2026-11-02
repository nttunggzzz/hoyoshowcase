import { fileURLToPath } from 'node:url';
import { createApp } from './app.mjs';
import { createSnapshotStore } from './snapshot-store.mjs';

const port = Number(process.env.HOYO_PORT || process.env.GENSHIN_COLLECTOR_PORT || 47932);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('HOYO_PORT không hợp lệ.');

const store = createSnapshotStore(
  process.env.HOYO_DATA_DIR || fileURLToPath(new URL('../../data/', import.meta.url)),
);
const server = createApp({
  savedSnapshot: await store.load(),
  onSnapshot: (snapshot) => store.save(snapshot),
});
server.listen(port, '127.0.0.1', () => {
  console.log(`HoyoShowcase: http://127.0.0.1:${port}/`);
  console.log(`Tài liệu: http://127.0.0.1:${port}/README.html`);
});
server.on('error', () => {
  console.error('Không mở được port. Chọn HOYO_PORT khác; không dừng dịch vụ khác.');
  process.exitCode = 1;
});
