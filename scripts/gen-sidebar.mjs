// Parse upstream website/sidebars.ts into data/sidebar.json.
// The upstream file is untrusted third-party data: no eval. We convert the
// restricted object-literal grammar to JSON and let JSON.parse fail loud.
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const upstreamDir =
  process.env.HERMES_UPSTREAM_DIR ?? 'C:/Users/sorab/Documents/Projects/oss/hermes-agent';
const REF = 'upstream/main';

const src = execFileSync('git', ['-C', upstreamDir, 'show', `${REF}:website/sidebars.ts`], {
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
});

const start = src.indexOf('= {');
const end = src.lastIndexOf('};');
if (start === -1 || end === -1) throw new Error('sidebars.ts: object literal not found');
let body = src.slice(start + 2, end + 1);

// Restricted grammar -> JSON. Strings in the file use single quotes and
// contain no escapes; keys are bare identifiers; trailing commas allowed.
body = body
  .replace(/\/\/[^\n]*/g, '')
  .replace(/'([^'\\\n]*)'/g, (_, s) => JSON.stringify(s))
  .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
  .replace(/,(\s*[}\]])/g, '$1');

const parsed = JSON.parse(body); // fail loud on grammar drift

function normalize(node) {
  if (typeof node === 'string') return { id: node };
  if (node && node.type === 'category') {
    return { label: node.label, items: (node.items ?? []).map(normalize) };
  }
  throw new Error(`sidebars.ts: unsupported node ${JSON.stringify(node).slice(0, 80)}`);
}

const tree = (parsed.docs ?? []).map(normalize);

// Flat order for prev/next inside the mirror.
const order = [];
(function walk(nodes) {
  for (const n of nodes) {
    if (n.id) order.push(n.id);
    if (n.items) walk(n.items);
  }
})(tree);

if (order.length < 300) throw new Error(`suspiciously few sidebar ids (${order.length})`);

await writeFile(
  join(root, 'data/sidebar.json'),
  JSON.stringify({ ref: REF, tree, order }, null, 2) + '\n',
);
console.log(`sidebar.json: ${order.length} ids, ${tree.length} top nodes`);
