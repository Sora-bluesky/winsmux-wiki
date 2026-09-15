// 無料モデル一覧（/hermes/free/）のデータミラー。
// 既定: 3 つの公開 API を取得し、ソースごとに検証して data/free-models.json を原子的に置換する。
// --check: 取得結果を表示するだけで、ファイルは更新しない。
// 取得失敗時は、検証できた前回成功値をソース単位で保持する。
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';

const OUT_FILE = 'data/free-models.json';
const FIXTURE_DIR = process.env.FREE_MODELS_FIXTURE_DIR ?? null;
const CHECK_ONLY = process.argv.includes('--check');

const SOURCES = [
  {
    key: 'nous',
    url: 'https://inference-api.nousresearch.com/v1/models',
    kind: 'priced',
  },
  {
    key: 'openrouter',
    url: 'https://openrouter.ai/api/v1/models',
    kind: 'priced',
  },
  {
    key: 'opencode',
    url: 'https://opencode.ai/zen/v1/models',
    kind: 'opencode',
  },
];

const ERROR_CODES = new Set([
  'http',
  'parse',
  'shape',
  'empty',
  'pagination',
  'duplicate',
]);

class SourceFailure extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function isDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function jstToday() {
  if (process.env.FREE_MODELS_TODAY !== undefined) {
    if (!isDateString(process.env.FREE_MODELS_TODAY)) {
      throw new Error('FREE_MODELS_TODAY must be YYYY-MM-DD');
    }
    return process.env.FREE_MODELS_TODAY;
  }

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

const TODAY = jstToday();

function compareIds(a, b) {
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

function priceKind(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return 'unknown';
    return value === 0 ? 'zero' : 'positive';
  }

  if (typeof value !== 'string') return 'unknown';
  const trimmed = value.trim();
  if (trimmed === '') return 'unknown';
  if (!/^(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$/.test(trimmed)) return 'unknown';
  return /[1-9]/.test(trimmed) ? 'positive' : 'zero';
}

function contextLength(value) {
  return Number.isInteger(value) && value > 0 ? value : null;
}

function toolsSupport(value) {
  return Array.isArray(value) ? value.includes('tools') : null;
}

function expirationDate(value) {
  return isDateString(value) ? value : null;
}

function criteriaOf(ctx, tools) {
  if (tools === false) {
    return { criteria: false, criteriaReason: 'tools' };
  }
  if (ctx !== null && ctx < 64_000) {
    return { criteria: false, criteriaReason: 'ctx' };
  }
  if (tools === true && ctx !== null && ctx >= 64_000) {
    return { criteria: true, criteriaReason: null };
  }
  return { criteria: null, criteriaReason: null };
}

function modelFrom(item, freeBasis) {
  // OpenCode の応答には今のところ長さ・tools・期限が無く null になるが、
  // 将来返ってきたら他の source と同じ正規化で受ける（一律 null にしない）
  const ctx = contextLength(item.context_length);
  const tools = toolsSupport(item.supported_parameters);
  const { criteria, criteriaReason } = criteriaOf(ctx, tools);

  return {
    id: item.id,
    name: typeof item.name === 'string' ? item.name : null,
    ctx,
    tools,
    expires: expirationDate(item.expiration_date),
    freeBasis,
    criteria,
    criteriaReason,
  };
}

function fetchText(source) {
  if (FIXTURE_DIR !== null) {
    return fs.readFileSync(path.join(FIXTURE_DIR, `${source.key}.json`), 'utf8');
  }

  return execFileSync(
    'curl',
    ['-sfL', '--max-time', '30', source.url],
    {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    },
  );
}

function readUpstream(source) {
  let raw;
  try {
    raw = fetchText(source);
  } catch {
    throw new SourceFailure('http');
  }

  if (raw.trimStart().startsWith('<')) {
    throw new SourceFailure('parse');
  }

  let upstream;
  try {
    upstream = JSON.parse(raw);
  } catch {
    throw new SourceFailure('parse');
  }

  if (
    upstream === null ||
    typeof upstream !== 'object' ||
    !Array.isArray(upstream.data) ||
    upstream.data.some((item) => item === null || typeof item !== 'object' || typeof item.id !== 'string')
  ) {
    throw new SourceFailure('shape');
  }

  if (upstream.data.length === 0) {
    throw new SourceFailure('empty');
  }

  const hasTotalCount = Object.prototype.hasOwnProperty.call(upstream, 'total_count');
  if (
    source.key === 'openrouter' &&
    hasTotalCount &&
    (upstream.data.length !== upstream.total_count || upstream.links?.next !== null)
  ) {
    throw new SourceFailure('pagination');
  }

  const seen = new Map();
  const data = [];
  for (const item of upstream.data) {
    const previous = seen.get(item.id);
    if (previous !== undefined) {
      if (!isDeepStrictEqual(previous, item)) {
        throw new SourceFailure('duplicate');
      }
      continue;
    }
    seen.set(item.id, item);
    data.push(item);
  }

  return {
    data,
    upstreamCount: upstream.data.length,
    totalCount: hasTotalCount ? upstream.total_count : null,
  };
}

function selectFreeModels(source, data) {
  const models = [];
  const conflicts = [];

  for (const item of data) {
    if (source.kind === 'opencode') {
      const lower = item.id.toLowerCase();
      // 上流 hermes_cli/models.py と同じ: -free で終わり、鍵が要る ox-alpha-free（完全一致）だけ除く
      if (lower.endsWith('-free') && lower !== 'ox-alpha-free') {
        models.push(modelFrom(item, 'label'));
      }
      continue;
    }

    const prompt = priceKind(item.pricing?.prompt);
    const completion = priceKind(item.pricing?.completion);
    const labeledFree = item.id.endsWith(':free');

    if (labeledFree && (prompt === 'positive' || completion === 'positive')) {
      conflicts.push(item.id);
      continue;
    }

    if (prompt === 'zero' && completion === 'zero') {
      models.push(modelFrom(item, 'pricing'));
      continue;
    }

    if (labeledFree && (prompt === 'unknown' || completion === 'unknown')) {
      models.push(modelFrom(item, 'label'));
    }
  }

  models.sort(compareIds);
  conflicts.sort();

  return { models, conflicts };
}

function isPreviousModel(value) {
  if (value === null || typeof value !== 'object') return false;
  if (typeof value.id !== 'string') return false;
  if (!(typeof value.name === 'string' || value.name === null)) return false;
  if (!(value.ctx === null || (Number.isInteger(value.ctx) && value.ctx > 0))) return false;
  if (!(value.tools === null || typeof value.tools === 'boolean')) return false;
  if (!(value.expires === null || isDateString(value.expires))) return false;
  if (!(value.freeBasis === 'pricing' || value.freeBasis === 'label')) return false;
  if (!(value.criteria === null || typeof value.criteria === 'boolean')) return false;
  if (!(value.criteriaReason === null || value.criteriaReason === 'tools' || value.criteriaReason === 'ctx')) {
    return false;
  }

  const expected = criteriaOf(value.ctx, value.tools);
  return value.criteria === expected.criteria && value.criteriaReason === expected.criteriaReason;
}

function previousBlock(previous, key) {
  const block = previous?.sources?.[key];
  if (block === null || typeof block !== 'object') return null;
  if (!(block.fetchedAt === null || isDateString(block.fetchedAt))) return null;
  if (!Array.isArray(block.models) || !block.models.every(isPreviousModel)) return null;
  if (!Array.isArray(block.conflicts) || !block.conflicts.every((id) => typeof id === 'string')) return null;

  const modelIds = block.models.map((model) => model.id);
  if (new Set(modelIds).size !== modelIds.length) return null;
  if (new Set(block.conflicts).size !== block.conflicts.length) return null;
  if (block.fetchedAt === null && (block.models.length > 0 || block.conflicts.length > 0)) return null;

  return {
    fetchedAt: block.fetchedAt,
    models: block.models,
    conflicts: block.conflicts,
  };
}

function readPrevious() {
  if (!fs.existsSync(OUT_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function atomicWrite(value) {
  const parent = path.dirname(OUT_FILE);
  fs.mkdirSync(parent, { recursive: true });

  const temporary = `${OUT_FILE}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', 'utf8');
    fs.renameSync(temporary, OUT_FILE);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

const previous = readPrevious();
const outputSources = {};
const reports = [];

for (const source of SOURCES) {
  const prior = previousBlock(previous, source.key);

  try {
    const upstream = readUpstream(source);
    const { models, conflicts } = selectFreeModels(source, upstream.data);

    outputSources[source.key] = {
      ok: true,
      fetchedAt: TODAY,
      attemptedAt: TODAY,
      errorCode: null,
      url: source.url,
      models,
      conflicts,
    };

    reports.push({
      key: source.key,
      upstreamCount: upstream.upstreamCount,
      totalCount: upstream.totalCount,
      ok: true,
      errorCode: null,
      models,
      conflicts,
    });
  } catch (error) {
    const errorCode =
      error instanceof SourceFailure && ERROR_CODES.has(error.code)
        ? error.code
        : 'shape';

    const models = prior?.models ?? [];
    const conflicts = prior?.conflicts ?? [];

    outputSources[source.key] = {
      ok: false,
      fetchedAt: prior?.fetchedAt ?? null,
      attemptedAt: TODAY,
      errorCode,
      url: source.url,
      models,
      conflicts,
    };

    reports.push({
      key: source.key,
      upstreamCount: null,
      totalCount: null,
      ok: false,
      errorCode,
      models,
      conflicts,
    });
  }
}

const output = {
  generatedAt: TODAY,
  sources: outputSources,
};

for (const report of reports) {
  const upstream = report.upstreamCount === null ? 'n/a' : report.upstreamCount;
  const totalCount = report.totalCount === null ? 'n/a' : report.totalCount;
  const criteriaTrue = report.models.filter((model) => model.criteria === true).length;
  console.log(
    `${report.key}: upstream=${upstream} total_count=${totalCount} ok=${report.ok} errorCode=${report.errorCode ?? 'null'} free=${report.models.length} criteria_true=${criteriaTrue} conflicts=${report.conflicts.length}`,
  );
}

if (CHECK_ONLY) {
  process.exitCode = 0;
} else {
  atomicWrite(output);
  console.log(`free models: wrote ${OUT_FILE} for ${TODAY}`);
}
