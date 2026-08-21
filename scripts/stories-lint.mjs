// user-stories 訳データの構造照合。上流と data/user-stories.ja.json を突き合わせる。
// 規則: id 集合と順序が一致 / headline・quote 以外の全フィールドがバイト一致 /
//       訳文が非空 / 禁止語 0 / state が全件 translated
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const UPSTREAM_REPO = 'C:/Users/sorab/Documents/Projects/oss/hermes-agent';
const UPSTREAM_PATH = 'website/src/data/userStories.json';
const JA_FILE = 'data/user-stories.ja.json';
const STATE_FILE = 'data/stories-state.json';
// mirror-lint.mjs と同じ禁止語（wiki はホスト名・URL 内識別子のみ許容だが、訳文中には出ない前提で単純検知）
const FORBIDDEN = /はじめる|編む|暮らす|入れところ|リファレンス|複数台/;

const upstream = JSON.parse(
  execFileSync('git', ['-C', UPSTREAM_REPO, 'show', `upstream/main:${UPSTREAM_PATH}`], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  }),
);
const ja = JSON.parse(fs.readFileSync(JA_FILE, 'utf8'));
const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));

const problems = [];
if (upstream.length !== ja.length) problems.push(`length mismatch: upstream ${upstream.length} vs ja ${ja.length}`);

for (let i = 0; i < Math.min(upstream.length, ja.length); i++) {
  const u = upstream[i];
  const j = ja[i];
  if (u.id !== j.id) { problems.push(`order/id mismatch at ${i}: ${u.id} vs ${j.id}`); continue; }
  for (const k of Object.keys(u)) {
    if (k === 'headline' || k === 'quote') continue;
    if (JSON.stringify(u[k]) !== JSON.stringify(j[k])) problems.push(`${u.id}: field ${k} differs from upstream`);
  }
  for (const k of Object.keys(j)) if (!(k in u)) problems.push(`${u.id}: extra field ${k}`);
  if (!j.headline.trim() || !j.quote.trim()) problems.push(`${u.id}: empty headline/quote`);
  const hit = (j.headline + ' ' + j.quote).match(FORBIDDEN);
  if (hit) problems.push(`${u.id}: forbidden word 「${hit[0]}」`);
  if (state.entries[u.id]?.status !== 'translated') problems.push(`${u.id}: state is ${state.entries[u.id]?.status ?? 'missing'}`);
}

if (problems.length) {
  for (const p of problems) console.error(`FAIL ${p}`);
  console.error(`stories-lint: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`stories-lint: OK (${ja.length} entries)`);
