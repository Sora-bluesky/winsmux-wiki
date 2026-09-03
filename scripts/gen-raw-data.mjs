// データ駆動ページ（models / howto / trouble / community / updates）の raw Markdown を
// 画面と同じ JSON から生成する。sync-public.mjs の先頭で import され、build のたびに追随する。
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const site = 'https://wiki.winsmux.dev';

const readJson = async (rel) => JSON.parse(await readFile(join(root, rel), 'utf8'));
const write = (name, body) => writeFile(join(root, 'src/raw', name), body.endsWith('\n') ? body : body + '\n');

const front = (title, description, page) => `---
title: "${title}"
description: "${description}"
raw: /hermes/raw/${page}
---

`;

const abs = (u) => (u.startsWith('/') ? site + u : u);
const linkList = (links) => (links || []).map((l) => `[${l.title}](${abs(l.url)})`).join(' / ');

// models
{
  const c = await readJson('data/portal-models.json');
  const money = (v) => (v == null ? '-' : `$${v}`);
  const rows = c.models.map((m) =>
    `| ${m.name} \`${m.id}\` | ${m.type} | ${m.ctx ? Math.round(m.ctx / 1000) + 'K' : '-'} | 入 ${money(m.inPerM)} / 出 ${money(m.outPerM)} | 入 ${money(m.listInPerM)} / 出 ${money(m.listOutPerM)} | ${m.free ? '無料' : m.discount ? m.discount + '%' : '-'} |`,
  );
  const body =
    front('モデルと料金', `Nous Portal で使える全 ${c.count} モデルの価格一覧（100万トークンあたりの米ドル）`, 'models.md') +
    `# モデルと料金

Nous Portal で使える全 ${c.count} モデル（TEXT ${c.counts.text} / EMBEDDINGS ${c.counts.embeddings} / OTHER ${c.counts.other}）。価格は 100万トークンあたりの米ドル。取得日 ${c.fetchedAt.slice(0, 10)}。正本: https://portal.nousresearch.com/models

| モデル | 種別 | コンテキスト | Portal 価格（/1M） | 定価（/1M） | 割引 |
|---|---|---|---|---|---|
${rows.join('\n')}
`;
  await write('models.md', body);
}

// howto
{
  const h = await readJson('data/wiki/howto.json');
  const sections = h.categories.map((cat) => {
    const items = h.items
      .filter((i) => i.category === cat)
      .map((i) => `- **${i.want}** — ${i.note}${i.links?.length ? '\n  - ' + linkList(i.links) : ''}`);
    return `## ${cat}\n\n${items.join('\n')}`;
  });
  const body =
    front('逆引き', `「〜したい」から最短の手順ページへ引く索引（全 ${h.items.length} 項目）`, 'howto.md') +
    `# 逆引き\n\n「〜したい」から最短の手順ページへ。全 ${h.items.length} 項目・${h.categories.length} 分類。サイト上の検索はカタカナ・全角の表記揺れにも対応。\n\n${sections.join('\n\n')}\n`;
  await write('howto.md', body);
}

// trouble
{
  const t = await readJson('data/wiki/trouble.json');
  const sections = t.categories.map((cat) => {
    const items = t.items
      .filter((i) => i.category === cat)
      .map((i) => `### ${i.symptom}\n\n- 原因: ${i.cause}\n- 対処: ${i.fix}${i.links?.length ? '\n- 関連: ' + linkList(i.links) : ''}`);
    return `## ${cat}\n\n${items.join('\n\n')}`;
  });
  const body =
    front('トラブル', `症状から原因と対処を引く表（全 ${t.items.length} 項目）`, 'trouble.md') +
    `# トラブル\n\n症状から原因と対処を引く表。全 ${t.items.length} 項目・${t.categories.length} 分類。推測の対処は載せず、全項目が公式ドキュメントの記述に対応。\n\n${sections.join('\n\n')}\n`;
  await write('trouble.md', body);
}

// community
{
  const c = await readJson('data/wiki/community.json');
  const weeks = c.weeks.map((w) => {
    const topics = w.topics.map((tp) => `### ${tp.channel}\n\n${tp.summary}`);
    return `## ${w.week}（${w.range}）\n\n${topics.join('\n\n')}`;
  });
  const body =
    front('コミュニティの動き', '公式 Discord の開発チャンネルの話題の週次日本語要約', 'community.md') +
    `# コミュニティの動き\n\n公式 Discord の開発チャンネルの話題を週ごとに日本語で要約。出典: ${c.source}\n\n${weeks.join('\n\n')}\n`;
  await write('community.md', body);
}

// updates
{
  const u = await readJson('data/wiki-updates.json');
  const entries = u.entries.map((e) => {
    const pages = e.pages.map((p) => `- [${p.title}](${abs(p.url)})`);
    return `## ${e.date}\n\n${pages.join('\n')}`;
  });
  const digests = Object.entries(u.digests || {}).map(([wk, text]) => `## 週次まとめ ${wk}\n\n${text}`);
  const body =
    front('更新履歴', '公式 docs への追随記録（日次の再翻訳ページ一覧と週次まとめ）', 'updates.md') +
    `# 更新履歴\n\n公式 docs への追随記録。\n\n${entries.join('\n\n')}\n\n${digests.join('\n\n')}\n`;
  await write('updates.md', body);
}

console.log('gen-raw-data: wrote models.md howto.md trouble.md community.md updates.md');
