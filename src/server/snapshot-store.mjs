import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { stripCredentials } from './collection/collector.mjs';

function validate(snapshot) {
  if (snapshot?.schema !== 'genshin-battle-chronicle-v1' || !snapshot.sections || !snapshot.role) {
    throw new Error('Bản dữ liệu đã lưu không đúng định dạng.');
  }
  return stripCredentials(snapshot);
}

/** Local game data only. Writes are atomic and serialized for multiple sessions. */
export function createSnapshotStore(directory) {
  const filename = path.join(path.resolve(directory), 'battle-chronicle-latest.json');
  let queue = Promise.resolve();
  return {
    filename,
    async load() {
      try {
        return validate(JSON.parse(await readFile(filename, 'utf8')));
      } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw new Error('Không đọc được bản dữ liệu local. Kiểm tra thư mục data trước khi chạy.');
      }
    },
    save(snapshot) {
      const content = JSON.stringify(validate(snapshot), null, 2) + '\n';
      const write = async () => {
        await mkdir(path.dirname(filename), { recursive: true });
        const temporary = filename + '.' + randomUUID() + '.tmp';
        try {
          await writeFile(temporary, content, { flag: 'wx' });
          await rename(temporary, filename);
        } finally {
          await unlink(temporary).catch(() => {});
        }
      };
      const pending = queue.then(write);
      queue = pending.catch(() => {});
      return pending;
    },
  };
}
