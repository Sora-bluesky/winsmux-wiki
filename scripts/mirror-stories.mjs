// user-stories データミラー: 上流 userStories.json の headline/quote を日本語化して追随する。
// - 既定: 状態を更新し、data/user-stories.ja.json を機械再構成（非翻訳フィールドは常に上流を正とする）、
//   未訳分を .mirror/en/stories/batch-NN.json に書き出す
// - --check: 件数報告のみ（書き込みなし）
// - --merge: .mirror/ja/stories/batch-*.json の訳を取り込み、状態を translated にする
// 訳すのは headline / quote のみ。他フィールドはバイト一致で上流からコピーする。
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const UPSTREAM_REPO = 'C:/Users/sorab/Documents/Projects/oss/hermes-agent';
const UPSTREAM_PATH = 'website/src/data/userStories.json';
const STATE_FILE = 'data/stories-state.json';
const JA_FILE = 'data/user-stories.ja.json';
const EN_DIR = '.mirror/en/stories';
const JA_DIR = '.mirror/ja/stories';
const BATCH_SIZE = 30;

const mode = process.argv[2] ?? '';

function upstreamStories() {
  const raw = execFileSync('git', ['-C', UPSTREAM_REPO, 'show', `upstream/main:${UPSTREAM_PATH}`], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  const list = JSON.parse(raw);
  if (!Array.isArray(list) || list.length < 100) {
    throw new Error(`upstream userStories.json shape unexpected (len=${list?.length})`);
  }
  for (const s of list) {
    for (const k of ['id', 'headline', 'quote', 'url', 'category', 'size']) {
      if (typeof s[k] !== 'string') throw new Error(`entry ${s.id ?? '?'} missing field ${k}`);
    }
  }
  return list;
}

function hashOf(s) {
  return createHash('sha256').update(JSON.stringify([s.headline, s.quote])).digest('hex').slice(0, 16);
}

function loadJson(p, fallback) {
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback;
}

const upstream = upstreamStories();
const state = loadJson(STATE_FILE, { entries: {} });
const jaList = loadJson(JA_FILE, []);
const jaById = new Map(jaList.map((s) => [s.id, s]));

let pending = 0;
let translated = 0;
let removed = 0;
const pendingEntries = [];
const nextState = { entries: {} };
const nextJa = [];

for (const s of upstream) {
  const h = hashOf(s);
  const st = state.entries[s.id];
  const ja = jaById.get(s.id);
  if (st && st.hash === h && st.status === 'translated' && ja) {
    // 既訳: 訳文だけ保持し、他フィールドは上流から取り直す
    nextJa.push({ ...s, headline: ja.headline, quote: ja.quote });
    nextState.entries[s.id] = { hash: h, status: 'translated' };
    translated++;
  } else {
    // 新規 or 原文変更: 原文のまま出し、翻訳待ちにする
    nextJa.push({ ...s });
    nextState.entries[s.id] = { hash: h, status: 'pending' };
    pendingEntries.push({ id: s.id, headline: s.headline, quote: s.quote });
    pending++;
  }
}
for (const id of Object.keys(state.entries)) {
  if (!upstream.some((s) => s.id === id)) removed++;
}

if (mode === '--check') {
  console.log(`stories: upstream ${upstream.length}, translated ${translated}, pending ${pending}, removed ${removed}`);
  process.exit(pending > 0 || removed > 0 ? 2 : 0);
}

if (mode === '--merge') {
  if (!fs.existsSync(JA_DIR)) throw new Error(`${JA_DIR} not found — nothing to merge`);
  const files = fs.readdirSync(JA_DIR).filter((f) => f.endsWith('.json')).sort();
  let merged = 0;
  const problems = [];
  for (const f of files) {
    const batch = JSON.parse(fs.readFileSync(path.join(JA_DIR, f), 'utf8'));
    if (!Array.isArray(batch)) { problems.push(`${f}: not an array`); continue; }
    for (const t of batch) {
      const i = nextJa.findIndex((s) => s.id === t.id);
      if (i === -1) { problems.push(`${f}: unknown id ${t.id}`); continue; }
      if (typeof t.headline !== 'string' || typeof t.quote !== 'string' || !t.headline.trim() || !t.quote.trim()) {
        problems.push(`${f}: ${t.id} empty/missing headline or quote`);
        continue;
      }
      const extra = Object.keys(t).filter((k) => !['id', 'headline', 'quote'].includes(k));
      if (extra.length) { problems.push(`${f}: ${t.id} unexpected keys ${extra.join(',')}`); continue; }
      nextJa[i] = { ...nextJa[i], headline: t.headline, quote: t.quote };
      nextState.entries[t.id].status = 'translated';
      merged++;
    }
  }
  if (problems.length) {
    for (const p of problems) console.error(`FAIL ${p}`);
    process.exit(1);
  }
  fs.writeFileSync(JA_FILE, JSON.stringify(nextJa, null, 2) + '\n');
  fs.writeFileSync(STATE_FILE, JSON.stringify(nextState, null, 2) + '\n');
  const still = Object.values(nextState.entries).filter((e) => e.status !== 'translated').length;
  console.log(`stories merge: ${merged} merged, ${still} still pending`);
  process.exit(still > 0 ? 2 : 0);
}

// 既定モード: 再構成 + 未訳バッチ書き出し
fs.mkdirSync(EN_DIR, { recursive: true });
for (const f of fs.readdirSync(EN_DIR)) fs.rmSync(path.join(EN_DIR, f));
for (let i = 0; i < pendingEntries.length; i += BATCH_SIZE) {
  const n = String(i / BATCH_SIZE + 1).padStart(2, '0');
  fs.writeFileSync(path.join(EN_DIR, `batch-${n}.json`), JSON.stringify(pendingEntries.slice(i, i + BATCH_SIZE), null, 2) + '\n');
}
fs.writeFileSync(JA_FILE, JSON.stringify(nextJa, null, 2) + '\n');
fs.writeFileSync(STATE_FILE, JSON.stringify(nextState, null, 2) + '\n');
console.log(
  `stories: upstream ${upstream.length}, translated ${translated}, pending ${pending} (${Math.ceil(pending / BATCH_SIZE)} batches in ${EN_DIR}), removed ${removed}`,
);
