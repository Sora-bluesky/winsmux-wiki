// Print the next N pending/stale non-skill upstream paths in sidebar order.
// Usage: node scripts/mirror-batch-list.mjs [N]   (default 70)
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const state = JSON.parse(await readFile(join(root, 'data/mirror-state.json'), 'utf8'));
const sidebar = JSON.parse(await readFile(join(root, 'data/sidebar.json'), 'utf8'));

const n = Number(process.argv[2] ?? 70);
const wanted = new Set(['pending', 'stale', 'failed']);

// sidebar order first, then any remaining files not in the sidebar
const inSidebar = sidebar.order.map((id) => {
  for (const ext of ['.md', '.mdx']) if (state.files[id + ext]) return id + ext;
  return null;
});
const rest = Object.keys(state.files).filter((p) => !inSidebar.includes(p)).sort();
const ordered = [...inSidebar.filter(Boolean), ...rest];

const out = [];
for (const p of ordered) {
  if (out.length >= n) break;
  if (p.startsWith('user-guide/skills/')) continue; // skills batch is separate (templated)
  const f = state.files[p];
  if (f && wanted.has(f.status)) out.push(p);
}
console.log(out.join('\n'));
console.error(`# ${out.length} paths (requested ${n})`);
