import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
// Check staged/tracked and untracked non-ignored files, including a forced add of data/.
const files = [
  ...new Set(
    execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
      cwd: root,
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean),
  ),
];
const issues = [];
for (const file of files) {
  const privatePath =
    /^(?:work|outputs|coverage|test-results|node_modules)\//.test(file) ||
    (file.startsWith('data/') && file !== 'data/.gitkeep') ||
    (/(?:^|\/)\.env(?:\..*)?$/.test(file) && !file.endsWith('.env.example')) ||
    /\.(?:dpapi|p12|pfx|key|log|zip)$/i.test(file) ||
    /(?:^|\/)(?:battle-chronicle-latest|.*-live|.*-proof)\.json$/.test(file);
  if (privatePath) issues.push(`${file}: private/generated file`);
  const extension = path.extname(file);
  if (!['.json', '.js', '.mjs', '.md', '.html', '.yml', '.yaml', '.txt'].includes(extension))
    continue;
  const text = await fs.readFile(path.join(root, file), 'utf8');
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text))
    issues.push(`${file}: private key block`);
  if (extension === '.json') {
    const value = JSON.parse(text);
    if (value?.schema === 'genshin-battle-chronicle-v1') issues.push(`${file}: account snapshot`);
  }
}
if (issues.length) throw Error(issues.join('\n'));
console.log(`Private-file guard checked ${files.length} repository files.`);
