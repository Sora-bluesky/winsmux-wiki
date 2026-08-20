import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const srcDir = join(root, 'src/raw');
const destDir = join(root, 'public/hermes/raw');

await mkdir(destDir, { recursive: true });

async function listMd(dir, prefix = '') {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await listMd(join(dir, entry.name), rel)));
    else if (entry.name.endsWith('.md')) out.push(rel);
  }
  return out.sort();
}

const files = await listMd(srcDir);
const copied = [];

for (const file of files) {
  const src = await readFile(join(srcDir, file), 'utf8');
  await mkdir(join(destDir, file, '..'), { recursive: true });
  await writeFile(join(destDir, file), src.endsWith('\n') ? src : src + '\n');
  copied.push(file);
}

const site = 'https://wiki.winsmux.dev';
const catalog = [
  ['/', '一覧'],
  ['/hermes/', '入口'],
  ['/hermes/start/', 'インストールする'],
  ['/hermes/start/line/', 'LINE'],
  ['/hermes/start/telegram/', 'Telegram'],
  ['/hermes/live/', 'すでにインストールしている'],
  ['/hermes/ops/', '運用'],
  ['/hermes/trust/', 'どこまで任せる'],
  ['/hermes/guide/', 'Hermes Agentの使い方（よく使う）'],
  ['/hermes/guide/all/', 'すべて（公式全URLの索引）'],
  ['/hermes/guide/skills/', 'skill（公式skillの同期索引）'],
  ['/hermes/guide/dev/', 'developer-guide（公式索引）'],
  ['/hermes/concepts/gateway/', 'Gateway'],
  ['/hermes/concepts/skills/', 'Skills'],
  ['/hermes/concepts/memory/', 'Memory'],
  ['/hermes/concepts/cron/', 'Cron'],
  ['/hermes/concepts/approval/', '承認'],
  ['/hermes/concepts/config/', '設定'],
  ['/hermes/entities/local/', 'ローカル'],
  ['/hermes/entities/docker/', 'Docker'],
  ['/hermes/entities/vps/', 'VPS'],
  ['/hermes/entities/line/', 'LINEから使う'],
  ['/hermes/entities/telegram/', 'Telegramから使う'],
  ['/hermes/entities/nous-portal/', 'Nous Portal'],
  ['/hermes/syntheses/cost-and-model/', 'コストとモデル'],
  ['/hermes/syntheses/not-a-mirror/', '正本との差分'],
];

for (const f of copied) {
  if (f.startsWith('docs/')) {
    const id = f.replace(/^docs\//, '').replace(/\.md$/, '').replace(/\/index$/, '');
    catalog.push([`/hermes/docs/${id}/`, `${id}（日本語版）`]);
  }
}

const raws = copied.map((f) => `${site}/hermes/raw/${f.replace(/\\/g, '/')}`);

const llms = `# Hermes Agent（日本語）

> 公式 docs の Quickstart / Installation / Messaging の順を日本語にしたもの。独自手順は作らない。正本: https://hermes-agent.nousresearch.com/docs/

Hermes Agent ${'0.20.4'}

## ページ

${catalog.map(([path, label]) => `- [${label}](${site}${path})`).join('\n')}

## 生 Markdown

${raws.map((url) => `- ${url}`).join('\n')}

## 正本

- https://hermes-agent.nousresearch.com/docs/
- https://hermes-agent.nousresearch.com/docs/getting-started/quickstart
- https://hermes-agent.nousresearch.com/docs/getting-started/installation
- https://hermes-agent.nousresearch.com/docs/integrations/nous-portal
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/line
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram
- https://hermes-agent.nousresearch.com/docs/llms.txt
`;

await mkdir(join(root, 'public/hermes'), { recursive: true });
await writeFile(join(root, 'public/hermes/llms.txt'), llms);

const robots = `User-agent: *
Allow: /

Sitemap: ${site}/hermes/llms.txt
`;
await writeFile(join(root, 'public/robots.txt'), robots);

console.log(`synced ${copied.length} raw files + llms.txt`);
