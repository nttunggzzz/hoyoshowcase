import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pages = [path.join(root, 'README.html')];
for (const file of await fs.readdir(path.join(root, 'docs')))
  if (file.endsWith('.html')) pages.push(path.join(root, 'docs', file));
let checked = 0;
for (const filename of pages) {
  const source = await fs.readFile(filename, 'utf8');
  if (!source.includes('<title>') || !source.includes('lang="vi"'))
    throw Error(`Missing page metadata: ${path.relative(root, filename)}`);
  for (const match of source.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const href = match[1];
    if (/^(?:https?:|mailto:|data:)/.test(href)) continue;
    const [relative, anchor] = href.split('#');
    const target = relative
      ? path.resolve(path.dirname(filename), decodeURIComponent(relative))
      : filename;
    if (!target.startsWith(root + path.sep)) throw Error('Document link leaves repository.');
    await fs.access(target).catch(() => {
      throw Error(`Broken link in ${path.relative(root, filename)}: ${href}`);
    });
    if (anchor && path.extname(target) === '.html') {
      const content = await fs.readFile(target, 'utf8');
      if (!content.includes(`id="${anchor}"`)) throw Error(`Missing anchor: ${href}`);
    }
    checked++;
  }
}
console.log(`Documentation checked: ${pages.length} HTML pages, ${checked} local links.`);
