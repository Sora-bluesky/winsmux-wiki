// Structural lint: compare .mirror/en/<path>.md (source) with the translated
// src/raw/docs/<path>.md. Pass -> mirror-state entry becomes 'translated'.
// Usage: node scripts/mirror-lint.mjs <upstream-path> [...]  (e.g. getting-started/quickstart.md)
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const STATE_PATH = join(root, 'data/mirror-state.json');
const FORBIDDEN = /wiki|はじめる|編む|暮らす|入れところ|リファレンス|複数台|\/fleet/;

const FENCE_RE = /^[ \t]*```[^\n]*\n[\s\S]*?^[ \t]*```[ \t]*$/gm;
function fences(md) {
  return [...md.matchAll(FENCE_RE)].map((m) => m[0]);
}
function stripFences(md) {
  return md.replace(FENCE_RE, '');
}
function parts(md) {
  const noFence = stripFences(md);
  return {
    fences: fences(md),
    headings: [...noFence.matchAll(/^(#{1,4}) .*\{#([^}]+)\}\s*$/gm)].map((m) => `${m[1]} ${m[2]}`),
    links: [...noFence.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]),
    // Pair backticks per paragraph (blank-line blocks, newlines flattened) so
    // spans survive different wrap points while a stray bare backtick only
    // poisons its own block. Blocks with odd backtick parity are dropped on
    // both sides symmetrically (backtick bytes are contract-identical), as are
    // prose-like mis-pairs from key names (**Ctrl+`**).
    inlineCode: noFence
      .split(/\n\s*\n/)
      .flatMap((block) => {
        const j = block.replace(/\n/g, ' ');
        if (((j.match(/`/g) ?? []).length) % 2 !== 0) return [];
        return [...j.matchAll(/`[^`]+`/g)].map((m) => m[0]);
      })
      .filter((s) => !/\*\* /.test(s) && !/^`\s/.test(s) && s.length <= 200)
      .sort(),
    admOpen: (noFence.match(/^:::\w+/gm) ?? []).length,
    admClose: (noFence.match(/^:::\s*$/gm) ?? []).length,
    tableRows: (noFence.match(/^\|/gm) ?? []).length,
  };
}

function stripFrontmatter(md) {
  if (!md.startsWith('---')) return { fm: '', body: md };
  const end = md.indexOf('\n---', 3);
  return { fm: md.slice(4, end), body: md.slice(end + 4) };
}

function eq(a, b) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

const state = JSON.parse(await readFile(STATE_PATH, 'utf8'));
let failed = 0;

for (const rel of process.argv.slice(2)) {
  const errors = [];
  const jaPath = join(root, 'src/raw/docs', rel.replace(/\.mdx$/, '.md'));
  let en, ja;
  try {
    en = await readFile(join(root, '.mirror/en', rel.replace(/\.mdx$/, '.md')), 'utf8');
  } catch {
    console.error(`FAIL ${rel}: missing .mirror/en source (run mirror-extract first)`);
    failed++;
    continue;
  }
  try {
    ja = await readFile(jaPath, 'utf8');
  } catch {
    console.error(`FAIL ${rel}: missing translation ${jaPath}`);
    failed++;
    continue;
  }

  const enB = stripFrontmatter(en);
  const jaB = stripFrontmatter(ja);
  const e = parts(enB.body);
  const j = parts(jaB.body);

  if (!eq(e.fences, j.fences)) errors.push(`code fences differ (${e.fences.length} vs ${j.fences.length}, must be byte-identical in order)`);
  if (!eq(e.headings, j.headings)) errors.push(`heading level/anchor sequence differs`);
  if (!eq(e.links, j.links)) errors.push(`link URL sequence differs (${e.links.length} vs ${j.links.length})`);
  if (!eq(e.inlineCode, j.inlineCode)) errors.push(`inline code set differs (${e.inlineCode.length} vs ${j.inlineCode.length})`);
  if (e.admOpen !== j.admOpen || e.admClose !== j.admClose) errors.push('admonition open/close mismatch');
  if (e.tableRows !== j.tableRows) errors.push(`table row count differs (${e.tableRows} vs ${j.tableRows})`);
  const forbidden = stripFences(jaB.body).replace(/`[^`\n]*`/g, '').replace(/\]\([^)]*\)/g, ']()').match(FORBIDDEN);
  if (forbidden) errors.push(`forbidden word: ${forbidden[0]}`);
  for (const key of ['title:', 'description:', 'upstream_path:', 'upstream_blob:', 'sources:']) {
    if (!jaB.fm.includes(key)) errors.push(`frontmatter missing ${key}`);
  }
  const blob = jaB.fm.match(/upstream_blob:\s*([0-9a-f]{40})/)?.[1];
  if (blob && state.files[rel] && blob !== state.files[rel].blob) {
    errors.push(`upstream_blob ${blob.slice(0, 7)} != state ${state.files[rel].blob.slice(0, 7)} (stale translation)`);
  }

  if (errors.length) {
    console.error(`FAIL ${rel}:\n  ${errors.join('\n  ')}`);
    if (state.files[rel]) state.files[rel].status = 'failed';
    failed++;
  } else {
    state.files[rel] = { ...state.files[rel], blob, status: 'translated', translatedAt: new Date().toISOString() };
    console.log(`ok ${rel}`);
  }
}

await writeFile(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
process.exit(failed ? 1 : 0);
