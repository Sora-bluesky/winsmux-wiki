// 「更新履歴」（/hermes/updates/）のデータ生成。
// 正本はこのリポの git 履歴: 日次 sync のコミットと、
// その中で変わった src/raw/docs/*.md を機械的に集計する。
// - entries は毎回 git から再生成（決定的）。digests（週次の日本語要約）は手書き/Opus 生成の持ち越しで、
//   このスクリプトは消さない。
// 出力: data/wiki-updates.json
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const OUT_FILE = 'data/wiki-updates.json';
const SINCE = '2026-08-20'; // ミラー完成日以降のみ

// sync コミットの subject の書き方は何度も変わっている
// （"sync: mirror upstream <sha>" → "sync: retranslate ..." → "sync mirror with upstream <sha>"）。
// 文面で照合すると書き方が変わるたびに無音で拾えなくなるので、変わらない先頭の型だけを見る。
// feat / fix / chore / revert は入らない。パス限定（-- src/raw/docs）と後段の空判定が二重の絞り。
const SYNC_SUBJECT = /^sync\b/;

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

// コミットごとに日付・subject・変更ファイルを取る
const log = git('log', '--since', SINCE, '--format=@%h|%cs|%s', '--name-only', '--', 'src/raw/docs');
const entries = [];
let cur = null;
for (const line of log.split('\n')) {
  if (line.startsWith('@')) {
    const [sha, date, ...rest] = line.slice(1).split('|');
    const subject = rest.join('|');
    cur = null;
    if (SYNC_SUBJECT.test(subject)) {
      const up = subject.match(/upstream ([0-9a-f]{7,})/)?.[1] ?? null;
      cur = { date, sha, upstream: up, pages: [] };
      entries.push(cur);
    }
  } else if (cur && line.trim().endsWith('.md') && line.startsWith('src/raw/docs/')) {
    cur.pages.push(line.trim());
  }
}

function pageOf(p) {
  const id = p
    .replace(/^src\/raw\/docs\//, '')
    .replace(/\.md$/, '')
    .replace(/\/index$/, '');
  let title = id;
  if (fs.existsSync(p)) {
    const m = fs.readFileSync(p, 'utf8').match(/^---[\s\S]*?\ntitle:\s*"?([^"\n]+)"?\n/);
    if (m) title = m[1].trim();
  }
  return { id, title, url: `/hermes/docs/${id}/` };
}

const cleaned = entries
  .filter((e) => e.pages.length > 0)
  .map((e) => ({ date: e.date, sha: e.sha, upstream: e.upstream, pages: e.pages.map(pageOf) }));

if (cleaned.length === 0) throw new Error('no sync entries found — check git history / SINCE');

const prev = fs.existsSync(OUT_FILE) ? JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')) : {};
const out = {
  generatedAt: new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10), // JST
  entries: cleaned,
  digests: prev.digests ?? {},
};
fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n');
console.log(
  `wiki-updates: ${cleaned.length} sync entries, ${cleaned.reduce((n, e) => n + e.pages.length, 0)} page updates, ${Object.keys(out.digests).length} digests`,
);
