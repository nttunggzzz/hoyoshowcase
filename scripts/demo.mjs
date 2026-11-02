import { createApp } from '../src/server/app.mjs';
import { makeFixture } from '../tests/fixtures/collector.mjs';
import { startCollection, exportCollection } from '../src/server/collection/collector.mjs';

const fixture = makeFixture({ characters: 12 });
startCollection(fixture.ctx);
await fixture.ctx.collection.done;
const snapshot = exportCollection(fixture.ctx);
snapshot.sections.role.data.nickname = 'Demo · Dữ liệu giả lập';
const port = Number(process.env.HOYO_PORT || 47933);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('HOYO_PORT không hợp lệ.');
const server = createApp({
  savedSnapshot: snapshot,
  transportFactory: () => makeFixture().transport,
});
server.listen(port, '127.0.0.1', () =>
  console.log(`DEMO giả lập, không đăng nhập HoYoLAB: http://127.0.0.1:${port}/`),
);
server.on('error', () => {
  console.error('Port demo đang bận. Chọn HOYO_PORT khác.');
  process.exitCode = 1;
});
