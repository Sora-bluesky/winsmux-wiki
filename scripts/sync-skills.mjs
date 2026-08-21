// Generate src/raw/skills.md from the upstream hermes-agent clone.
// Deterministic: reads website/docs/user-guide/skills/ at upstream/main.
// Fails loud when the clone or the ref is missing.
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const upstreamDir =
  process.env.HERMES_UPSTREAM_DIR ?? 'C:/Users/sorab/Documents/Projects/oss/hermes-agent';
const REF = 'upstream/main';
const SKILLS_PATH = 'website/docs/user-guide/skills/';
const SITE = 'https://hermes-agent.nousresearch.com';

function git(...args) {
  return execFileSync('git', ['-C', upstreamDir, ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

const headSha = git('rev-parse', REF).trim();
const headDate = git('log', '-1', '--format=%cs', REF).trim();

const files = git('ls-tree', '-r', '--name-only', REF, SKILLS_PATH)
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l.endsWith('.md'));

if (files.length < 100) {
  throw new Error(`suspiciously few skill pages (${files.length}) — check ${upstreamDir} ${REF}`);
}

// One pass over history: first date seen per file = last modification date.
const lastDate = new Map();
{
  const log = git('log', '--format=@%cs', '--name-only', REF, '--', SKILLS_PATH);
  let cur = '';
  for (const line of log.split('\n')) {
    if (line.startsWith('@')) cur = line.slice(1).trim();
    else if (line.trim() && !lastDate.has(line.trim())) lastDate.set(line.trim(), cur);
  }
}

function parseFront(src) {
  const out = {};
  if (!src.startsWith('---')) return out;
  const end = src.indexOf('\n---', 3);
  if (end === -1) return out;
  for (const line of src.slice(4, end).split('\n')) {
    const m = line.match(/^([a-z_]+):\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^"|"$/g, '');
  }
  return out;
}

const skills = files.map((path) => {
  const front = parseFront(git('show', `${REF}:${path}`));
  const rel = path.replace('website/docs/', '').replace(/\.md$/, '');
  const parts = rel.split('/'); // user-guide/skills/bundled/<category>/<slug>
  const source = parts[2] === 'bundled' ? 'bundled' : parts[2] === 'optional' ? 'optional' : 'other';
  return {
    name: front.sidebar_label || front.title || parts.at(-1),
    description: (front.description || '').replace(/\|/g, '\\|'),
    url: `/hermes/docs/${rel}/`,
    date: lastDate.get(path) ?? '',
    category: source === 'other' ? '' : parts[3],
    source,
  };
});

function table(rows) {
  const lines = ['| skill | 概要 | 更新日 |', '|---|---|---|'];
  for (const s of rows) lines.push(`| [${s.name}](${s.url}) | ${s.description} | ${s.date} |`);
  return lines.join('\n');
}

const bundled = skills.filter((s) => s.source === 'bundled');
const optional = skills.filter((s) => s.source === 'optional');
const other = skills.filter((s) => s.source === 'other');

const md = `---
title: skill
description: 公式 skill の同期索引。名前、概要、更新日。各行は日本語版ページへ。
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/skills-catalog
  - https://hermes-agent.nousresearch.com/docs/reference/optional-skills-catalog
  - https://github.com/NousResearch/hermes-agent/tree/main/website/docs/user-guide/skills
hermes_version: "0.20.5"
confidence: high
raw: /hermes/raw/skills.md
---

# skill

公式の skill ページ ${skills.length} 件の索引です。各行のリンクは日本語版ページへ、正本は各ページの「正本:」リンクから公式へ飛べます。

上流 \`${headSha.slice(0, 7)}\`（${headDate}）時点。この一覧は上流の docs から機械生成しています。

## 最初から入っている（${bundled.length}）

- 何もしなくても使えます。

${table(bundled)}

## あとから入れる（${optional.length}）

- 入れると使えるようになります。入れ方は [Work with Skills](/hermes/docs/guides/work-with-skills/) にあります。

${table(optional)}
${
  other.length
    ? `\n## その他（${other.length}）\n\n${table(other)}\n`
    : ''
}
skill の仕組みは [Skills System](/hermes/docs/user-guide/features/skills/)、自作は [Creating Skills](/hermes/docs/developer-guide/creating-skills/) にあります。
`;

await writeFile(join(root, 'src/raw/skills.md'), md);
await writeFile(
  join(root, 'data/upstream.json'),
  JSON.stringify({ ref: REF, sha: headSha, docsDate: headDate, skillPages: skills.length }, null, 2) + '\n',
);
console.log(`skills.md: ${skills.length} pages (bundled ${bundled.length} / optional ${optional.length} / other ${other.length}) @ ${headSha.slice(0, 7)}`);
