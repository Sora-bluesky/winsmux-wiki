// モデルと料金の一覧（/hermes/models/）のデータミラー。
// 正本: https://inference-api.nousresearch.com/v1/models（公開 API・認証不要を 2026-08-27 実測）。
// Portal https://portal.nousresearch.com/models が表示するのと同じカタログ。
// - 既定: fetch → 形状チェック → data/portal-models.json 再生成
// - --check: fetch して件数・差分報告のみ（ファイル不更新）
// 翻訳フィールドなし（モデル名は原文、UI ラベルはページ側で日本語）。
// fetch() は Windows の node で終了時に libuv アサート死するため curl（blueprints と同じ）。
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const API_URL = 'https://inference-api.nousresearch.com/v1/models';
const OUT_FILE = 'data/portal-models.json';

const mode = process.argv[2] ?? '';

const raw = execFileSync('curl', ['-sfL', API_URL], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const upstream = JSON.parse(raw);
if (!Array.isArray(upstream.data) || upstream.data.length < 300) {
  throw new Error(`shape: data missing or too short (${upstream.data?.length})`);
}

// 種別は output_modalities で決める（Portal の TEXT/EMBEDDINGS/OTHER 区分と一致を実測: 329/33/10）
function typeOf(m) {
  const outs = m.architecture?.output_modalities ?? [];
  if (outs.includes('text')) return 'text';
  if (outs.includes('embeddings')) return 'embeddings';
  return 'other';
}

// pricing の値は $/token の文字列 → $/1M tokens の数値へ
function perM(v) {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`shape: bad price ${v}`);
  return Math.round(n * 1e6 * 1e4) / 1e4; // $/1M・小数4桁
}

const models = upstream.data.map((m) => {
  if (typeof m.id !== 'string' || typeof m.name !== 'string') throw new Error('shape: model missing id/name');
  const p = m.pricing ?? {};
  const inM = perM(p.prompt);
  const outM = perM(p.completion);
  const listIn = perM(p.original?.prompt);
  const listOut = perM(p.original?.completion);
  const free = m.id.endsWith(':free') || (inM === 0 && outM === 0);
  const discount = !free && listIn && inM !== null && listIn > 0 ? Math.round((1 - inM / listIn) * 100) : null;
  return {
    id: m.id,
    name: m.name,
    type: typeOf(m),
    ctx: m.context_length ?? null,
    inPerM: inM,
    outPerM: outM,
    listInPerM: listIn,
    listOutPerM: listOut,
    discount,
    free,
  };
});

const counts = { text: 0, embeddings: 0, other: 0 };
for (const m of models) counts[m.type]++;
if (counts.text + counts.embeddings + counts.other !== models.length) throw new Error('shape: type classification lost models');

const prev = fs.existsSync(OUT_FILE) ? JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')) : null;
const prevIds = new Set(prev?.models?.map((m) => m.id) ?? []);
const added = models.filter((m) => !prevIds.has(m.id)).length;
const removed = prev ? prev.models.length - (models.length - added) : 0;

if (mode === '--check') {
  console.log(
    `models: upstream ${models.length} (text ${counts.text} / embeddings ${counts.embeddings} / other ${counts.other}), free ${models.filter((m) => m.free).length}, added ${added}, removed ${removed}`,
  );
  process.exit(added > 0 || removed > 0 ? 2 : 0);
}

const out = {
  fetchedAt: new Date().toISOString().slice(0, 10),
  source: API_URL,
  count: models.length,
  counts,
  models,
};
fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n');
console.log(`models: wrote ${models.length} (text ${counts.text} / embeddings ${counts.embeddings} / other ${counts.other}), free ${models.filter((m) => m.free).length}`);
