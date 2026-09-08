// 「更新履歴」（/hermes/updates/）のデータ生成。
// 正本はこのリポの git 履歴。コミット前の当日分だけ、
// src/raw/docs の作業ツリーと mirror-state を使って補う。
// - entries は毎回 git から再生成（決定的）。digests（週次の日本語要約）は手書き/Opus 生成の持ち越しで、
//   このスクリプトは消さない。
// 出力: data/wiki-updates.json
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const OUT_FILE = 'data/wiki-updates.json';
const MIRROR_STATE_FILE = 'data/mirror-state.json';
const SINCE = '2026-08-20'; // ミラー完成日以降のみ

// sync コミットの subject の書き方は何度も変わっている
// （"sync: mirror upstream <sha>" → "sync: retranslate ..." → "sync mirror with upstream <sha>"）。
// 文面で照合すると書き方が変わるたびに無音で拾えなくなるので、変わらない先頭の型だけを見る。
// feat / fix / chore / revert は入らない。パス限定（-- src/raw/docs）と後段の空判定が二重の絞り。
const SYNC_SUBJECT = /^sync\b/;

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function worktreeDocs() {
  // `git status` は autocrlf の正規化判定だけで M を返すことがある（内容は同一・2026-09-08 実測）。
  // 内容の差分（HEAD 比・追加/変更/リネーム）と未追跡だけを「今日の変更」に数える
  const changed = git('diff', '--name-only', '--diff-filter=ACMR', 'HEAD', '--', 'src/raw/docs');
  const untracked = git('ls-files', '--others', '--exclude-standard', '--', 'src/raw/docs');
  const paths = [];

  for (const line of `${changed}\n${untracked}`.split('\n')) {
    const p = line.trim().replace(/\\/g, '/');
    if (p.startsWith('src/raw/docs/') && p.endsWith('.md')) paths.push(p);
  }

  return [...new Set(paths)];
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
    // CRLF の作業ツリー（git checkout 後など）でも題を読めるように改行を揃える
    const m = fs
      .readFileSync(p, 'utf8')
      .replace(/\r\n/g, '\n')
      .match(/^---[\s\S]*?\ntitle:\s*"?([^"\n]+)"?\n/);
    if (m) title = m[1].trim();
  }
  return { id, title, url: `/hermes/docs/${id}/` };
}

const cleaned = entries
  .filter((e) => e.pages.length > 0)
  .map((e) => ({
    date: e.date,
    sha: e.sha,
    upstream: e.upstream,
    pages: [...new Set(e.pages)],
  }));

if (cleaned.length === 0) throw new Error('no sync entries found — check git history / SINCE');

const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); // JST
const workingTreePaths = worktreeDocs();

if (workingTreePaths.length > 0) {
  const mirrorState = JSON.parse(fs.readFileSync(MIRROR_STATE_FILE, 'utf8'));
  const snapshotCommit = mirrorState.snapshotCommit;
  const upstream =
    typeof snapshotCommit === 'string' && /^[0-9a-f]{40}$/i.test(snapshotCommit)
      ? snapshotCommit.slice(0, 7)
      : null;
  const todayEntry = {
    date: today,
    sha: null,
    upstream,
    pages: workingTreePaths,
  };

  const existingToday = cleaned.find((e) => e.date === today);
  if (existingToday) {
    const seen = new Set(existingToday.pages);
    for (const p of todayEntry.pages) {
      if (!seen.has(p)) {
        existingToday.pages.push(p);
        seen.add(p);
      }
    }
  } else {
    cleaned.unshift(todayEntry);
  }
}

const renderedEntries = cleaned.map((e) => ({
  date: e.date,
  sha: e.sha,
  upstream: e.upstream,
  pages: e.pages.map(pageOf),
}));

const prev = fs.existsSync(OUT_FILE) ? JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')) : {};
const out = {
  generatedAt: today,
  entries: renderedEntries,
  digests: prev.digests ?? {},
};
fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n');
console.log(
  `wiki-updates: ${cleaned.length} sync entries, ${cleaned.reduce((n, e) => n + e.pages.length, 0)} page updates, ${workingTreePaths.length} working-tree pages, ${Object.keys(out.digests).length} digests`,
);
