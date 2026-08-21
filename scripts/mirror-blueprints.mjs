// Automation Blueprints カタログのミラー: 公式サイトが公開する生成物
// https://hermes-agent.nousresearch.com/docs/api/automation-blueprints-index.json を正本として追随する。
// - 既定: fetch → 形状チェック → data/blueprints-upstream.json 保存 → data/blueprints.ja.json 再構成 →
//   未訳分を .mirror/en/blueprints/batch-01.json に書き出す
// - --check: fetch して件数報告のみ（state・ファイル不更新）
// - --merge: .mirror/ja/blueprints/*.json の訳を取り込む
// - --lint: 構造照合（キー集合・非翻訳フィールド一致・訳文非空・禁止語）
// 訳すのは title / description / scheduleHuman / fields[].label / fields[].help のみ。
// key / category / tags / schedule / command / appUrl / fields の name,type,default,options,optional,strict はバイト一致。
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const INDEX_URL = 'https://hermes-agent.nousresearch.com/docs/api/automation-blueprints-index.json';
const UPSTREAM_COPY = 'data/blueprints-upstream.json';
const JA_FILE = 'data/blueprints.ja.json';
const STATE_FILE = 'data/blueprints-state.json';
const EN_DIR = '.mirror/en/blueprints';
const JA_DIR = '.mirror/ja/blueprints';
const TRANSLATED_TOP = ['title', 'description', 'scheduleHuman'];
const TRANSLATED_FIELD = ['label', 'help'];
const FORBIDDEN = /はじめる|編む|暮らす|入れところ|リファレンス|複数台/;

const mode = process.argv[2] ?? '';

function shapeCheck(list) {
  if (!Array.isArray(list) || list.length < 8) throw new Error(`shape: not an array or too short (${list?.length})`);
  for (const b of list) {
    for (const k of ['key', 'title', 'description', 'command', 'scheduleHuman']) {
      if (typeof b[k] !== 'string' || !b[k]) throw new Error(`shape: ${b.key ?? '?'} missing ${k}`);
    }
    if (!Array.isArray(b.fields)) throw new Error(`shape: ${b.key} fields not array`);
    for (const f of b.fields) {
      if (typeof f.name !== 'string' || typeof f.label !== 'string') throw new Error(`shape: ${b.key} field broken`);
    }
  }
}

function hashOf(b) {
  const parts = [b.title, b.description, b.scheduleHuman, ...b.fields.flatMap((f) => [f.label, f.help ?? ''])];
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 16);
}

function loadJson(p, fallback) {
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback;
}

function stripToUpstream(u, j) {
  // 非翻訳フィールドを上流値で比較するための正規化コピー
  const cu = structuredClone(u);
  const cj = structuredClone(j);
  for (const c of [cu, cj]) {
    for (const k of TRANSLATED_TOP) delete c[k];
    for (const f of c.fields ?? []) for (const k of TRANSLATED_FIELD) delete f[k];
  }
  return [cu, cj];
}

if (mode === '--lint') {
  const upstream = loadJson(UPSTREAM_COPY, null);
  const ja = loadJson(JA_FILE, null);
  const state = loadJson(STATE_FILE, { entries: {} });
  if (!upstream || !ja) { console.error('FAIL missing data files (run mirror-blueprints first)'); process.exit(1); }
  const problems = [];
  if (upstream.length !== ja.length) problems.push(`length mismatch ${upstream.length} vs ${ja.length}`);
  for (let i = 0; i < Math.min(upstream.length, ja.length); i++) {
    const u = upstream[i], j = ja[i];
    if (u.key !== j.key) { problems.push(`order/key mismatch at ${i}`); continue; }
    const [cu, cj] = stripToUpstream(u, j);
    if (JSON.stringify(cu) !== JSON.stringify(cj)) problems.push(`${u.key}: non-translated fields differ`);
    for (const k of TRANSLATED_TOP) if (!j[k]?.trim()) problems.push(`${u.key}: empty ${k}`);
    const text = TRANSLATED_TOP.map((k) => j[k]).join(' ') + ' ' + j.fields.map((f) => `${f.label} ${f.help ?? ''}`).join(' ');
    const hit = text.match(FORBIDDEN);
    if (hit) problems.push(`${u.key}: forbidden word 「${hit[0]}」`);
    if (state.entries[u.key]?.status !== 'translated') problems.push(`${u.key}: state is ${state.entries[u.key]?.status ?? 'missing'}`);
  }
  if (problems.length) {
    for (const p of problems) console.error(`FAIL ${p}`);
    process.exit(1);
  }
  console.log(`blueprints-lint: OK (${ja.length} entries)`);
  process.exit(0);
}

// fetch() は Windows の node で終了時に libuv アサート死し exit code を汚す（実測）ため curl を使う
const raw = execFileSync('curl', ['-sfL', INDEX_URL], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const upstream = JSON.parse(raw);
shapeCheck(upstream);

const state = loadJson(STATE_FILE, { entries: {} });
const jaList = loadJson(JA_FILE, []);
const jaByKey = new Map(jaList.map((b) => [b.key, b]));

let pending = 0, translated = 0;
const nextState = { entries: {} };
const nextJa = [];
const pendingEntries = [];

for (const b of upstream) {
  const h = hashOf(b);
  const st = state.entries[b.key];
  const ja = jaByKey.get(b.key);
  if (st && st.hash === h && st.status === 'translated' && ja) {
    const merged = structuredClone(b);
    for (const k of TRANSLATED_TOP) merged[k] = ja[k];
    merged.fields = b.fields.map((f, i) => ({ ...f, label: ja.fields[i]?.label ?? f.label, help: ja.fields[i]?.help ?? f.help }));
    nextJa.push(merged);
    nextState.entries[b.key] = { hash: h, status: 'translated' };
    translated++;
  } else {
    nextJa.push(structuredClone(b));
    nextState.entries[b.key] = { hash: h, status: 'pending' };
    pendingEntries.push({
      key: b.key,
      title: b.title,
      description: b.description,
      scheduleHuman: b.scheduleHuman,
      fields: b.fields.map((f) => ({ name: f.name, label: f.label, help: f.help ?? '' })),
    });
    pending++;
  }
}

if (mode === '--check') {
  console.log(`blueprints: upstream ${upstream.length}, translated ${translated}, pending ${pending}`);
  process.exit(pending > 0 ? 2 : 0);
}

if (mode === '--merge') {
  if (!fs.existsSync(JA_DIR)) throw new Error(`${JA_DIR} not found`);
  const problems = [];
  let merged = 0;
  for (const f of fs.readdirSync(JA_DIR).filter((x) => x.endsWith('.json')).sort()) {
    const batch = JSON.parse(fs.readFileSync(path.join(JA_DIR, f), 'utf8'));
    for (const t of batch) {
      const i = nextJa.findIndex((b) => b.key === t.key);
      if (i === -1) { problems.push(`${f}: unknown key ${t.key}`); continue; }
      for (const k of TRANSLATED_TOP) {
        if (typeof t[k] !== 'string' || !t[k].trim()) { problems.push(`${f}: ${t.key} empty ${k}`); }
      }
      if (!Array.isArray(t.fields) || t.fields.length !== nextJa[i].fields.length) {
        problems.push(`${f}: ${t.key} fields length mismatch`);
        continue;
      }
      for (const k of TRANSLATED_TOP) nextJa[i][k] = t[k];
      nextJa[i].fields = nextJa[i].fields.map((orig, fi) => ({ ...orig, label: t.fields[fi].label, help: t.fields[fi].help }));
      nextState.entries[t.key].status = 'translated';
      merged++;
    }
  }
  if (problems.length) {
    for (const p of problems) console.error(`FAIL ${p}`);
    process.exit(1);
  }
  fs.writeFileSync(UPSTREAM_COPY, JSON.stringify(upstream, null, 2) + '\n');
  fs.writeFileSync(JA_FILE, JSON.stringify(nextJa, null, 2) + '\n');
  fs.writeFileSync(STATE_FILE, JSON.stringify(nextState, null, 2) + '\n');
  const still = Object.values(nextState.entries).filter((e) => e.status !== 'translated').length;
  console.log(`blueprints merge: ${merged} merged, ${still} still pending`);
  process.exit(still > 0 ? 2 : 0);
}

// 既定モード
fs.mkdirSync(EN_DIR, { recursive: true });
for (const f of fs.readdirSync(EN_DIR)) fs.rmSync(path.join(EN_DIR, f));
if (pendingEntries.length) {
  fs.writeFileSync(path.join(EN_DIR, 'batch-01.json'), JSON.stringify(pendingEntries, null, 2) + '\n');
}
fs.writeFileSync(UPSTREAM_COPY, JSON.stringify(upstream, null, 2) + '\n');
fs.writeFileSync(JA_FILE, JSON.stringify(nextJa, null, 2) + '\n');
fs.writeFileSync(STATE_FILE, JSON.stringify(nextState, null, 2) + '\n');
console.log(`blueprints: upstream ${upstream.length}, translated ${translated}, pending ${pending} (${EN_DIR})`);
