import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() && entry.name !== 'node_modules'
    ? files(path.join(directory, entry.name)) : entry.isFile() && /\.(m?js)$/.test(entry.name)
      ? [path.join(directory, entry.name)] : []))).flat();
}
const sources = (await Promise.all(['backend/src', 'frontend/js', 'scripts', 'tests'].map(folder => files(path.join(root, folder))))).flat();
for (const source of sources) {
  const result = spawnSync(process.execPath, ['--check', source], { encoding: 'utf8' });
  if (result.status) { console.error(result.stderr); process.exit(result.status); }
}
console.log('Syntax OK: ' + sources.length + ' JavaScript files');
