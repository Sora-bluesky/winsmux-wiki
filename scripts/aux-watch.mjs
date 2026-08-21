// JSX 由来ページの「殻」（mdx とコンポーネント）の上流変化を検知する。
// これらは自動追随しない（レイアウト変更は手動対応）。sync はこのスクリプトの
// CHANGED 報告を見て人に知らせるだけ。対応が済んだら --update で受け入れる。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const UPSTREAM_REPO = 'C:/Users/sorab/Documents/Projects/oss/hermes-agent';
const STATE_FILE = 'data/aux-state.json';
const WATCHED = [
  'website/docs/user-stories.mdx',
  'website/docs/reference/automation-blueprints-catalog.mdx',
  'website/src/components/UserStoriesCollage/index.tsx',
  'website/src/components/UserStoriesCollage/styles.module.css',
  'website/src/components/AutomationBlueprintsCatalog/index.tsx',
  'website/src/components/AutomationBlueprintsCatalog/styles.module.css',
];

function blobOf(p) {
  try {
    return execFileSync('git', ['-C', UPSTREAM_REPO, 'rev-parse', `upstream/main:${p}`], { encoding: 'utf8' }).trim();
  } catch {
    return 'MISSING';
  }
}

const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {};
const current = Object.fromEntries(WATCHED.map((p) => [p, blobOf(p)]));

if (process.argv[2] === '--update') {
  fs.writeFileSync(STATE_FILE, JSON.stringify(current, null, 2) + '\n');
  console.log('aux-watch: state updated');
  process.exit(0);
}

let changed = 0;
for (const p of WATCHED) {
  if (!state[p]) {
    console.log(`NEW     ${p} (${current[p].slice(0, 7)}) — 初回。--update で受け入れる`);
    changed++;
  } else if (state[p] !== current[p]) {
    console.log(`CHANGED ${p} (${state[p].slice(0, 7)} -> ${current[p].slice(0, 7)}) — レイアウト変更あり・手動対応`);
    changed++;
  }
}
if (!changed) console.log('aux-watch: no changes');
process.exit(changed ? 2 : 0);
