// データ駆動ページ（models / free / howto / trouble / community / updates）の raw Markdown を
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

// 表のセルに置く素の文字列。改行と表の区切りを無害化する（コードスパン用）
const mdCell = (value) =>
  String(value)
    .replace(/\r?\n/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|');

// 上流のモデル名など、地の文に置く文字列。HTML として解釈されないよう実体にする
// （Markdown を無害化せずに描画する側で <img onerror> が動くのを防ぐ・Codex 指摘 2026-09-15）
const mdText = (value) =>
  mdCell(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const inlineCode = (value) => {
  const text = mdCell(value);
  const runs = text.match(/`+/g) ?? [];
  const longest = runs.reduce((max, run) => Math.max(max, run.length), 0);
  const delimiter = '`'.repeat(longest + 1);
  // 先頭か末尾が backtick だと区切りと結合してスパンが壊れる。CommonMark は両端の 1 空白を
  // 剥がすので、その場合だけ両側に空白を置く（Codex 指摘 2026-09-15）
  const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : '';
  return `${delimiter}${pad}${text}${pad}${delimiter}`;
};

// ISO 週キー（digests のキーと揃える）
function weekOf(date) {
  const d = new Date(date + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

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

// free
{
  const catalog = await readJson('data/free-models.json');
  const notes = await readJson('data/free-notes.json');

  const INTRO = [
    'クラウドのモデル利用料が無料になる代表的な経路を、Hermes DesktopとCLI向けにまとめます。',
    '無料モデルの一覧は公開APIから毎日更新し、経路の説明には確認日を付けています。',
    '無料になるのはモデル利用料です。Tool Gatewayの検索・画像・音声などは別料金になる場合があります。',
  ];

  const REPRESENTATIVE =
    'ここで扱う経路は代表例です。GroqやCerebrasなど、カスタムエンドポイントの無料枠は、公式資料の対応例とレシピ集で確認してください。';

  const NO_CATALOG =
    'このページでは、Google AI Studioのモデル一覧を自動取得していません。対象モデルと条件は公式の料金ページで確認してください。';

  const WARNINGS = [
    'Hermesはコンテキスト長が分からないモデルに256Kの既定値を当てて処理します。この一覧では推定せず「未確認」と表示します。',
    '無料モデルや無料の提供は予告なく入れ替わります。',
    'OpenCode FreeはAPIキーも登録も不要ですが、この経路の動作は未検証です。',
    'Tool Gatewayの検索・画像・音声など、モデル以外の機能は別料金になる場合があります。',
    'Hermesのモデル選択では、ツール非対応モデルを一覧から除く処理はOpenRouterにだけあります。このページはAPIにある無料モデルを掲載し、条件判定を別列で示します。',
  ];

  const METADATA_SOURCE =
    'https://github.com/NousResearch/hermes-agent/blob/59c20a51aa/agent/model_metadata.py';

  const fmtCtx = (value) =>
    value === null ? '未確認' : new Intl.NumberFormat('ja-JP').format(value);

  const toolsText = (value) => {
    if (value === true) return '対応の記載あり';
    if (value === false) return '対応の記載なし';
    return '未確認';
  };

  const criteriaText = (model) => {
    if (model.criteria === true) return '条件を満たす（動作未確認）';
    if (model.criteria === null) return '判定できない';
    const reason = model.criteriaReason === 'tools' ? 'ツール呼び出し' : 'コンテキスト上限';
    return `条件を満たさない（${reason}）`;
  };

  const freeBasisText = (value) =>
    value === 'pricing'
      ? '入力・出力の基本単価0（取得時点）'
      : '提供元の無料表記。料金未確認';

  const expiresText = (value) => {
    if (value === null) return '終了日未記載';
    if (value < catalog.generatedAt) return '掲載期限経過。利用可否未確認';
    return `提供終了予定: ${value}`;
  };

  const sourceStatus = (source) => {
    if (source.ok) return `最終取得: ${source.fetchedAt}`;
    if (source.fetchedAt !== null) {
      return `更新失敗。${source.fetchedAt}取得の情報を表示`;
    }
    return '取得できませんでした。現在の一覧は未確認';
  };

  const sourceFor = (key) => (key === 'gemini' ? null : catalog.sources[key] ?? null);

  const setupLinks = (route) =>
    route.officialSetup
      .map((item) => `[${mdText(item.label)}](${abs(item.url)})`)
      .join(' / ');

  const comparisonRows = notes.routes.map(
    (route) =>
      `| ${mdText(route.title)} | ${mdText(route.signup)} | ${mdText(route.freeScope)} | ${mdText(route.conditions)} | ${setupLinks(route)} | ${mdText(route.checkedAt)} |`,
  );

  const modelTable = (source) => {
    if (source.models.length === 0) return '';

    const rows = source.models.map((model) => {
      const label = model.name ?? model.id;
      const modelCell = `**${mdText(label)}**<br>${inlineCode(model.id)}<br>${mdText(freeBasisText(model.freeBasis))}`;
      return `| ${modelCell} | ${fmtCtx(model.ctx)} | ${toolsText(model.tools)} | ${criteriaText(model)} | ${expiresText(model.expires)} |`;
    });

    return `| モデル | コンテキスト上限（トークン） | ツール呼び出し（API記載） | 公開仕様の条件判定 | 提供終了予定 |
|---|---:|---|---|---|
${rows.join('\n')}`;
  };

  const routeSections = notes.routes.map((route) => {
    const source = sourceFor(route.key);
    const noteText = route.notes.map((note) => mdText(note)).join('\n\n');

    let automatic = NO_CATALOG;
    if (source !== null) {
      const parts = [sourceStatus(source)];

      if (source.conflicts.length > 0) {
        parts.push(`無料表記と価格が不一致のため除外: ${source.conflicts.map(mdText).join(', ')}`);
      }

      if (source.models.length > 0) {
        parts.push(modelTable(source));
      } else if (source.ok) {
        parts.push('取得時点で条件に合うモデルはありません。');
      }

      automatic = parts.join('\n\n');
    }

    return `## ${mdText(route.title)}

${noteText}

公式の設定手順: ${setupLinks(route)}

${automatic}`;
  });

  const desktopSection =
    typeof notes.desktop?.verifiedAt === 'string'
      ? `

## Desktopの設定

実機確認日: ${mdText(notes.desktop.verifiedAt)}

${notes.desktop.steps.map((step, index) => `${index + 1}. ${mdText(step)}`).join('\n')}`
      : '';

  const officialSources = [
    ...new Set([
      ...notes.routes.flatMap((route) => route.sources),
      ...Object.values(catalog.sources).map((source) => source.url),
      METADATA_SOURCE,
    ]),
  ];

  const body =
    front(
      '無料枠で使う方法',
      'クラウドのモデル利用料が無料になる代表的な経路と、無料モデルの一覧。DesktopとCLIが対象。',
      'free.md',
    ) +
    `# 無料枠で使う方法

${INTRO.join('\n\n')}

## 経路の比較

| 経路 | 登録・APIキー | 無料になる範囲 | 利用条件 | 公式の設定手順 | 説明の確認日 |
|---|---|---|---|---|---|
${comparisonRows.join('\n')}

ここで扱う経路は代表例です。GroqやCerebrasなど、カスタムエンドポイントの無料枠は、公式資料の[対応例](${abs('/hermes/docs/integrations/providers/#other-compatible-providers')})と[レシピ集](${abs('/hermes/docs/integrations/providers/#cookbook-together-ai-groq-perplexity')})で確認してください。

${routeSections.join('\n\n')}

## 注意点

${WARNINGS.map((warning) => `- ${warning}`).join('\n')}${desktopSection}

## 正本へのリンク

${officialSources.map((url) => `- ${abs(url)}`).join('\n')}
`;

  await write('free.md', body);
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

  // generatedAt と各 entry の date は、JST の暦日を YYYY-MM-DD で表したもの。
  const [year, month, day] = u.generatedAt.split('-').map(Number);
  const windowStart = new Date(Date.UTC(year, month - 1, day - 6)).toISOString().slice(0, 10);
  const recentEntries = u.entries
    .filter((e) => e.date >= windowStart && e.date <= u.generatedAt)
    .sort((a, b) => b.date.localeCompare(a.date));

  const seenUrls = new Set();
  const weeklyPages = [];
  for (const e of recentEntries) {
    for (const p of e.pages) {
      if (seenUrls.has(p.url)) continue;
      seenUrls.add(p.url);
      weeklyPages.push(`- ${e.date} [${p.title}](${abs(p.url)})`);
    }
  }

  const changedPages = weeklyPages.length
    ? weeklyPages.join('\n')
    : 'この期間に変わったページはありません。';

  const digestMap = u.digests || {};
  const currentWeek = weekOf(u.generatedAt);
  let digestEntry = null;
  if (Object.prototype.hasOwnProperty.call(digestMap, currentWeek)) {
    digestEntry = [currentWeek, digestMap[currentWeek]];
  } else {
    digestEntry =
      Object.entries(digestMap)
        .filter(
          ([week]) =>
            /^\d{4}-W(?:0[1-9]|[1-4]\d|5[0-3])$/.test(week) &&
            week <= currentWeek,
        )
        .sort(([a], [b]) => b.localeCompare(a))[0] || null;
  }

  const digestSection = digestEntry
    ? `\n\n## 週次まとめ\n\n対象週: ${digestEntry[0]}\n\n${digestEntry[1]}`
    : '';

  const agentPrompt =
    'https://wiki.winsmux.dev/hermes/raw/updates-weekly.md を読んで、私の設定と使い方に関係のある更新だけを 3 行以内で教えて。関係が無ければ「無し」と答えて。';

  const weeklyBody =
    front(
      '今週の更新',
      '直近 7 日に変わったページの一覧。あなたの Hermes に読ませる用',
      'updates-weekly.md',
    ) +
    `# 今週の更新（Hermes Agent Wiki）

生成日 = ${u.generatedAt}、対象期間 = ${windowStart} 〜 ${u.generatedAt}（JST）

## あなたの Hermes への頼み方

\`\`\`
${agentPrompt}
\`\`\`

## 変わったページ

${changedPages}${digestSection}

## 正本

- https://wiki.winsmux.dev/hermes/updates/
- https://github.com/NousResearch/hermes-agent/commits/main/website/docs
`;
  await write('updates-weekly.md', weeklyBody);
}

console.log('gen-raw-data: wrote models.md free.md howto.md trouble.md community.md updates.md updates-weekly.md');
