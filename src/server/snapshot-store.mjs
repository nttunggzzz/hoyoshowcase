import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { stripCredentials } from './collection/collector.mjs';

const ALLOWED_SCHEMAS = new Set(['genshin-battle-chronicle-v1', 'hsr-battle-chronicle-v1']);

function validate(snapshot) {
  if (!ALLOWED_SCHEMAS.has(snapshot?.schema) || !snapshot.sections || !snapshot.role) {
    throw new Error('Bản dữ liệu đã lưu không đúng định dạng.');
  }
  return stripCredentials(snapshot);
}

/** Local game data only. Writes are atomic and serialized for multiple sessions. */
export function createSnapshotStore(directory, defaultGame = null) {
  const dir = path.resolve(directory);
  const getFilename = (game) => {
    if (game === 'hsr') return path.join(dir, 'battle-chronicle-hsr-latest.json');
    if (game === 'genshin') return path.join(dir, 'battle-chronicle-genshin-latest.json');
    return path.join(dir, 'battle-chronicle-latest.json');
  };
  const filename = getFilename(defaultGame);
  let queue = Promise.resolve();
  return {
    filename,
    async load(game = defaultGame) {
      const target = getFilename(game);
      try {
        return validate(JSON.parse(await readFile(target, 'utf8')));
      } catch (error) {
        if (error.code === 'ENOENT') {
          if (target !== filename) {
            try {
              return validate(JSON.parse(await readFile(filename, 'utf8')));
            } catch (fallbackError) {
              if (fallbackError.code === 'ENOENT') return null;
              throw new Error(
                'Không đọc được bản dữ liệu local. Kiểm tra thư mục data trước khi chạy.',
              );
            }
          }
          return null;
        }
        throw new Error('Không đọc được bản dữ liệu local. Kiểm tra thư mục data trước khi chạy.');
      }
    },
    save(snapshot, game = null) {
      const validated = validate(snapshot);
      const target = getFilename(
        game || (validated.schema === 'hsr-battle-chronicle-v1' ? 'hsr' : defaultGame),
      );
      const content = JSON.stringify(validated, null, 2) + '\n';
      const write = async () => {
        await mkdir(path.dirname(target), { recursive: true });
        const temporary = target + '.' + randomUUID() + '.tmp';
        try {
          await writeFile(temporary, content, { flag: 'wx' });
          await rename(temporary, target);
          if (target !== filename && validated.schema === 'genshin-battle-chronicle-v1') {
            const fallbackTemp = filename + '.' + randomUUID() + '.tmp';
            await writeFile(fallbackTemp, content, { flag: 'wx' });
            await rename(fallbackTemp, filename);
          }
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
