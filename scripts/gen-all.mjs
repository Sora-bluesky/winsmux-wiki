// Regenerate src/raw/all.md from the official llms.txt (live fetch).
// Deterministic transform: sections and titles are kept as published.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const SRC = 'https://hermes-agent.nousresearch.com/docs/llms.txt';

const res = await fetch(SRC);
if (!res.ok) throw new Error(`fetch ${SRC} -> ${res.status}`);
const src = await res.text();

const sections = [];
let cur = null;
for (const line of src.split('\n')) {
  const h = line.match(/^## (.+)$/);
  if (h) {
    cur = { name: h[1].trim(), items: [] };
    sections.push(cur);
    continue;
  }
  const m = line.match(/^- \[([^\]]+)\]\((https:\/\/hermes-agent\.nousresearch\.com\/docs[^)]*)\)/);
  if (m && cur) cur.items.push([m[1], m[2]]);
}

const total = sections.reduce((n, s) => n + s.items.length, 0);
if (total < 100) throw new Error(`suspiciously few URLs (${total}) — llms.txt format changed?`);

const head = `---
title: すべて
description: 公式 docs の全 URL の索引。正本は公式。
sources:
  - https://hermes-agent.nousresearch.com/docs/
  - https://hermes-agent.nousresearch.com/docs/llms.txt
hermes_version: "0.20.4"
confidence: high
raw: /hermes/raw/all.md
---

# すべて

公式 docs の全ページ（${total} 件）です。リンク先はすべて公式（英語）。並びと区分は公式の llms.txt のままにしています。個別 skill のページは、この一覧には入っていません。skill の索引は [skill](/hermes/guide/skills/) にあります。

日本語の導線は [Hermes Agentをインストールする](/hermes/start/)、よく使うページは [よく使う](/hermes/guide/) にあります。
`;

const body = sections
  .map((s) => `\n## ${s.name}（${s.items.length}）\n\n${s.items.map(([t, u]) => `- [${t}](${u})`).join('\n')}`)
  .join('\n');

await writeFile(join(root, 'src/raw/all.md'), head + body + '\n');
console.log(`all.md: ${sections.length} sections, ${total} URLs`);

// dev.md — Developer Guide のみ。入口カードには出さない。
const dev = sections.find((s) => s.name === 'Developer Guide');
if (!dev || dev.items.length < 10) {
  throw new Error('Developer Guide section missing or suspiciously small — llms.txt format changed?');
}
const devMd = `---
title: developer-guide
description: 公式 developer-guide の索引。Hermes 本体を拡張・貢献する人向け。
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/architecture
  - https://hermes-agent.nousresearch.com/docs/llms.txt
hermes_version: "0.20.4"
confidence: high
raw: /hermes/raw/dev.md
---

# developer-guide

Hermes Agent 本体を拡張したり、上流に貢献したりする人向けの公式ページ（${dev.items.length} 件）です。リンク先はすべて公式（英語）。使うだけなら、ここは読まなくて大丈夫です。[よく使う](/hermes/guide/) に戻れます。

## Developer Guide（${dev.items.length}）

${dev.items.map(([t, u]) => `- [${t}](${u})`).join('\n')}
`;
await writeFile(join(root, 'src/raw/dev.md'), devMd);
console.log(`dev.md: ${dev.items.length} URLs`);
