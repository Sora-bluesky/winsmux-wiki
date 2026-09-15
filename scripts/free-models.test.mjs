import test from 'node:test';
import assert from 'node:assert/strict';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('./mirror-free-models.mjs', import.meta.url));
const BASE_FIXTURES = fileURLToPath(new URL('./fixtures/free-models/', import.meta.url));
const SOURCE_KEYS = ['nous', 'openrouter', 'opencode'];
const TODAY = '2026-09-15';

function makeSandbox(t, copies = SOURCE_KEYS) {
  const root = mkdtempSync(path.join(tmpdir(), 'free-models-'));
  const fixtures = path.join(root, 'fixtures');
  const data = path.join(root, 'data');

  mkdirSync(fixtures, { recursive: true });
  mkdirSync(data, { recursive: true });

  for (const key of copies) {
    copyFileSync(
      path.join(BASE_FIXTURES, `${key}.json`),
      path.join(fixtures, `${key}.json`),
    );
  }

  t.after(() => rmSync(root, { recursive: true, force: true }));

  return {
    root,
    fixtures,
    outFile: path.join(data, 'free-models.json'),
  };
}

function run(ctx, { today = TODAY, check = false } = {}) {
  return execFileSync(
    process.execPath,
    [SCRIPT, ...(check ? ['--check'] : [])],
    {
      cwd: ctx.root,
      env: {
        ...process.env,
        FREE_MODELS_TODAY: today,
        FREE_MODELS_FIXTURE_DIR: ctx.fixtures,
      },
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    },
  );
}

function readFixture(ctx, key) {
  return JSON.parse(readFileSync(path.join(ctx.fixtures, `${key}.json`), 'utf8'));
}

function writeFixture(ctx, key, value) {
  const body = typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n';
  writeFileSync(path.join(ctx.fixtures, `${key}.json`), body, 'utf8');
}

function readCatalog(ctx) {
  return JSON.parse(readFileSync(ctx.outFile, 'utf8'));
}

function byId(source, id) {
  return source.models.find((model) => model.id === id);
}

test('通常の fixture から無料モデルを安定ソートして生成する', (t) => {
  const ctx = makeSandbox(t);
  run(ctx);

  const catalog = readCatalog(ctx);
  assert.equal(catalog.generatedAt, TODAY);
  assert.deepEqual(Object.keys(catalog.sources), SOURCE_KEYS);

  for (const source of Object.values(catalog.sources)) {
    assert.equal(source.ok, true);
    assert.equal(source.fetchedAt, TODAY);
    assert.equal(source.attemptedAt, TODAY);
    assert.equal(source.errorCode, null);
    assert.deepEqual(
      source.models.map((model) => model.id),
      source.models.map((model) => model.id).toSorted(),
    );
  }

  assert.equal(catalog.sources.nous.models.length, 7);
  assert.equal(catalog.sources.openrouter.models.length, 7);
  assert.equal(catalog.sources.opencode.models.length, 7);

  assert.ok(catalog.sources.nous.models.every((model) => model.freeBasis === 'pricing'));
  assert.ok(catalog.sources.nous.models.every((model) => model.criteria === true));
  assert.ok(catalog.sources.opencode.models.every((model) => model.freeBasis === 'label'));
  assert.ok(catalog.sources.opencode.models.every((model) => model.criteria === null));

  const dots = byId(catalog.sources.openrouter, 'dots-studio/dots-3-note-preview:free');
  assert.equal(dots.expires, '2026-09-30');

  const contentSafety = byId(
    catalog.sources.openrouter,
    'nvidia/nemotron-3.5-content-safety:free',
  );
  assert.equal(contentSafety.tools, false);
  assert.equal(contentSafety.criteria, false);
  assert.equal(contentSafety.criteriaReason, 'tools');

  const lyria = byId(catalog.sources.openrouter, 'google/lyria-3-pro-preview');
  assert.equal(lyria.freeBasis, 'pricing');
  assert.equal(lyria.criteria, false);

  assert.equal(byId(catalog.sources.openrouter, 'openrouter/auto'), undefined);
});

test('無料モデルが 0 件の正常なカタログは成功として保存する', (t) => {
  const ctx = makeSandbox(t);
  const nous = readFixture(ctx, 'nous');
  nous.data = nous.data.filter((item) => !item.id.endsWith(':free')).slice(0, 2);
  writeFixture(ctx, 'nous', nous);

  run(ctx);
  const source = readCatalog(ctx).sources.nous;

  assert.equal(source.ok, true);
  assert.equal(source.errorCode, null);
  assert.equal(source.fetchedAt, TODAY);
  assert.deepEqual(source.models, []);
  assert.deepEqual(source.conflicts, []);
});

test('HTTP 失敗時は検証済みの前回値をソース単位で保持する', (t) => {
  const ctx = makeSandbox(t);
  run(ctx);

  const before = readCatalog(ctx);
  rmSync(path.join(ctx.fixtures, 'nous.json'));
  run(ctx, { today: '2026-09-16' });

  const after = readCatalog(ctx);
  assert.equal(after.sources.nous.ok, false);
  assert.equal(after.sources.nous.errorCode, 'http');
  assert.equal(after.sources.nous.fetchedAt, TODAY);
  assert.equal(after.sources.nous.attemptedAt, '2026-09-16');
  assert.deepEqual(after.sources.nous.models, before.sources.nous.models);
  assert.deepEqual(after.sources.nous.conflicts, before.sources.nous.conflicts);

  assert.equal(after.sources.openrouter.ok, true);
  assert.equal(after.sources.openrouter.fetchedAt, '2026-09-16');
  assert.equal(after.sources.opencode.ok, true);
  assert.equal(after.sources.opencode.fetchedAt, '2026-09-16');
});

test('前回値がない HTTP 失敗は取得日 null と空一覧になる', (t) => {
  const ctx = makeSandbox(t, ['openrouter', 'opencode']);
  run(ctx);

  const source = readCatalog(ctx).sources.nous;
  assert.equal(source.ok, false);
  assert.equal(source.errorCode, 'http');
  assert.equal(source.fetchedAt, null);
  assert.equal(source.attemptedAt, TODAY);
  assert.deepEqual(source.models, []);
  assert.deepEqual(source.conflicts, []);
});

test('HTML 本文は JSON として解釈せず parse エラーにする', (t) => {
  const ctx = makeSandbox(t);
  writeFixture(ctx, 'nous', ' \n<html><body>upstream error</body></html>\n');

  run(ctx);
  const source = readCatalog(ctx).sources.nous;

  assert.equal(source.ok, false);
  assert.equal(source.errorCode, 'parse');
  assert.equal(source.fetchedAt, null);
  assert.deepEqual(source.models, []);
});

test('空の data 配列は empty エラーにする', (t) => {
  const ctx = makeSandbox(t);
  writeFixture(ctx, 'nous', { data: [] });

  run(ctx);
  const source = readCatalog(ctx).sources.nous;

  assert.equal(source.ok, false);
  assert.equal(source.errorCode, 'empty');
});

test('OpenRouter の total_count 不一致は pagination エラーにする', (t) => {
  const ctx = makeSandbox(t);
  const openrouter = readFixture(ctx, 'openrouter');
  openrouter.total_count += 1;
  writeFixture(ctx, 'openrouter', openrouter);

  run(ctx);
  const source = readCatalog(ctx).sources.openrouter;

  assert.equal(source.ok, false);
  assert.equal(source.errorCode, 'pagination');
  assert.equal(source.fetchedAt, null);
  assert.deepEqual(source.models, []);
});

test('壊れた前回ブロックは失敗時の保持値に使わない', (t) => {
  const ctx = makeSandbox(t, ['openrouter', 'opencode']);
  writeFileSync(
    ctx.outFile,
    JSON.stringify({
      generatedAt: TODAY,
      sources: {
        nous: {
          fetchedAt: TODAY,
          models: [{ id: 42 }],
          conflicts: [],
        },
      },
    }) + '\n',
    'utf8',
  );

  run(ctx, { today: '2026-09-16' });
  const source = readCatalog(ctx).sources.nous;

  assert.equal(source.ok, false);
  assert.equal(source.errorCode, 'http');
  assert.equal(source.fetchedAt, null);
  assert.deepEqual(source.models, []);
  assert.deepEqual(source.conflicts, []);
});

test('同一内容の重複 id は 1 件にまとめる', (t) => {
  const ctx = makeSandbox(t);
  const nous = readFixture(ctx, 'nous');
  nous.data.push(structuredClone(nous.data[0]));
  writeFixture(ctx, 'nous', nous);

  run(ctx);
  const source = readCatalog(ctx).sources.nous;
  const ids = source.models.map((model) => model.id);

  assert.equal(source.ok, true);
  assert.equal(source.models.length, 7);
  assert.equal(new Set(ids).size, ids.length);
});

test('内容が異なる重複 id は duplicate エラーにする', (t) => {
  const ctx = makeSandbox(t);
  const nous = readFixture(ctx, 'nous');
  nous.data.push({
    ...structuredClone(nous.data[0]),
    name: `${nous.data[0].name} changed`,
  });
  writeFixture(ctx, 'nous', nous);

  run(ctx);
  const source = readCatalog(ctx).sources.nous;

  assert.equal(source.ok, false);
  assert.equal(source.errorCode, 'duplicate');
  assert.equal(source.fetchedAt, null);
});

test(':free と正の価格が競合するモデルを除外し、価格不明の表記モデルを残す', (t) => {
  const ctx = makeSandbox(t);
  const nous = readFixture(ctx, 'nous');
  const conflictId = nous.data[0].id;
  const labelId = nous.data[1].id;

  nous.data[0].pricing = {
    prompt: '0.01',
    completion: '0',
  };
  delete nous.data[1].pricing;
  writeFixture(ctx, 'nous', nous);

  run(ctx);
  const source = readCatalog(ctx).sources.nous;

  assert.equal(source.ok, true);
  assert.equal(byId(source, conflictId), undefined);
  assert.deepEqual(source.conflicts, [conflictId]);
  assert.equal(byId(source, labelId).freeBasis, 'label');
});

test('価格は数値か十進文字列だけを受け入れ、暗黙変換しない', (t) => {
  const ctx = makeSandbox(t);
  const nous = readFixture(ctx, 'nous');
  const [numeric, scientific, booleanPrice, labelOnly, conflict] = nous.data
    .slice(0, 5)
    .map((item) => structuredClone(item));

  numeric.id = 'fixture/numeric-zero';
  numeric.pricing = { prompt: 0, completion: 0 };

  scientific.id = 'fixture/scientific-zero';
  scientific.pricing = { prompt: '0e0', completion: '0' };

  booleanPrice.id = 'fixture/boolean-zero';
  booleanPrice.pricing = { prompt: false, completion: 0 };

  labelOnly.id = 'fixture/label-only:free';
  delete labelOnly.pricing;

  conflict.id = 'fixture/conflict:free';
  conflict.pricing = { prompt: '0.001', completion: '0' };

  nous.data = [numeric, scientific, booleanPrice, labelOnly, conflict];
  writeFixture(ctx, 'nous', nous);

  run(ctx);
  const source = readCatalog(ctx).sources.nous;

  assert.equal(byId(source, numeric.id).freeBasis, 'pricing');
  assert.equal(byId(source, labelOnly.id).freeBasis, 'label');
  assert.equal(byId(source, scientific.id), undefined);
  assert.equal(byId(source, booleanPrice.id), undefined);
  assert.equal(byId(source, conflict.id), undefined);
  assert.deepEqual(source.conflicts, [conflict.id]);
});

test('コンテキスト長とツール記載から三値の条件判定を作る', (t) => {
  const ctx = makeSandbox(t);
  const nous = readFixture(ctx, 'nous');
  const [threshold, short, unknownTools] = nous.data
    .slice(0, 3)
    .map((item) => structuredClone(item));

  threshold.id = 'fixture/threshold:free';
  threshold.context_length = 64_000;

  short.id = 'fixture/short:free';
  short.context_length = 63_999;

  unknownTools.id = 'fixture/unknown-tools:free';
  unknownTools.context_length = 128_000;
  unknownTools.supported_parameters = null;

  nous.data = [threshold, short, unknownTools];
  writeFixture(ctx, 'nous', nous);

  run(ctx);
  const source = readCatalog(ctx).sources.nous;

  assert.equal(byId(source, threshold.id).criteria, true);
  assert.equal(byId(source, threshold.id).criteriaReason, null);

  assert.equal(byId(source, short.id).criteria, false);
  assert.equal(byId(source, short.id).criteriaReason, 'ctx');

  assert.equal(byId(source, unknownTools.id).tools, null);
  assert.equal(byId(source, unknownTools.id).criteria, null);
  assert.equal(byId(source, unknownTools.id).criteriaReason, null);
});

test('同じ入力と日付で 2 回実行すると出力バイトが一致する', (t) => {
  const ctx = makeSandbox(t);

  run(ctx);
  const first = readFileSync(ctx.outFile);

  run(ctx);
  const second = readFileSync(ctx.outFile);

  assert.deepEqual(second, first);
});

test('--check は失敗を表示しても exit 0 で、出力ファイルを書かない', (t) => {
  const ctx = makeSandbox(t);
  rmSync(path.join(ctx.fixtures, 'nous.json'));

  const stdout = run(ctx, { check: true });

  assert.equal(existsSync(ctx.outFile), false);
  assert.match(stdout, /nous: upstream=n\/a total_count=n\/a ok=false errorCode=http free=0/);
  assert.match(
    stdout,
    /openrouter: upstream=10 total_count=10 ok=true errorCode=null free=7 criteria_true=5 conflicts=0/,
  );
  assert.match(stdout, /opencode: upstream=10 total_count=n\/a ok=true errorCode=null free=7/);
});
