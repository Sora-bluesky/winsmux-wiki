// 週次の版確認（.github/workflows/deps-check.yml から呼ぶ。手元でも `node scripts/deps-check.mjs` で動く）。
// 見るもの: package.json の依存 / deploy.yml に固定した Node と wrangler / npm audit。
// 何も書き換えない。遅れがあれば Markdown の報告を stdout に出し、出力ファイル（引数1）にも書く。
// 終了コード: 0 = 遅れなし、10 = 遅れあり、それ以外 = 確認そのものが失敗（取得失敗を「遅れなし」と読まない）。
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const out = process.argv[2];
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const deploy = readFileSync('.github/workflows/deploy.yml', 'utf8');

const parse = (v) => v.replace(/^[^\d]*/, '').split('-')[0].split('.').map(Number);
const cmp = (a, b) => {
  const x = parse(a), y = parse(b);
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
};
const isStable = (v) => /^\d+\.\d+\.\d+$/.test(v);

async function getJson(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'winsmux-wiki-deps-check' } });
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return r.json();
}

const rows = [];

// 1. package.json の依存
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
for (const [name, spec] of Object.entries(deps)) {
  const doc = await getJson(`https://registry.npmjs.org/${name.replace('/', '%2F')}`);
  const cur = spec.replace(/^[\^~]/, '');
  const stable = Object.keys(doc.versions).filter(isStable);
  const major = parse(cur)[0];
  const sameMajor = stable.filter((v) => parse(v)[0] === major).sort(cmp).at(-1);
  const latest = doc['dist-tags'].latest;
  if (cmp(sameMajor, cur) > 0 || cmp(latest, cur) > 0) {
    rows.push({ what: name, cur: spec, same: cmp(sameMajor, cur) > 0 ? sameMajor : '—', latest: cmp(latest, cur) > 0 ? latest : '—' });
  }
}

// 2. deploy.yml の wrangler（package.json と同じ版であること）
const wPins = [...deploy.matchAll(/wrangler@(\d+\.\d+\.\d+)/g)].map((m) => m[1]);
const wPkg = (pkg.devDependencies.wrangler ?? '').replace(/^[\^~]/, '');
for (const p of new Set(wPins)) {
  if (p !== wPkg) rows.push({ what: 'wrangler（deploy.yml）', cur: p, same: `package.json は ${wPkg}`, latest: '—' });
}

// 3. deploy.yml の Node（同じ系列の最新と比べる）
const nPins = [...deploy.matchAll(/node-version:\s*['"]?([\d.]+)/g)].map((m) => m[1]);
if (!nPins.length) throw new Error('deploy.yml に node-version が見つからない');
const nodeIndex = await getJson('https://nodejs.org/dist/index.json');
for (const p of new Set(nPins)) {
  const line = parse(p)[0];
  const newer = nodeIndex.filter((x) => parse(x.version)[0] === line && cmp(x.version, p) > 0);
  if (newer.length) {
    const sec = newer.some((x) => x.security);
    rows.push({ what: `Node（deploy.yml）${sec ? '・セキュリティ修正あり' : ''}`, cur: p, same: newer[0].version.slice(1), latest: '—' });
  }
}

// 4. npm audit（lock はリポに入れていないので、無ければ lock だけ作る。install script は走らせない）
if (!existsSync('package-lock.json')) execFileSync('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], { stdio: 'ignore', shell: process.platform === 'win32' });
let audit;
try {
  audit = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', shell: process.platform === 'win32' });
} catch (e) {
  audit = e.stdout; // 指摘があると非 0 で終わる
}
const auditJson = JSON.parse(audit);
const meta = auditJson.metadata?.vulnerabilities;
if (!meta) throw new Error('npm audit の結果を読めない');
// メジャーを上げずに直せる指摘だけを「遅れ」に数える（メジャー越えでしか直らないものは報告に載せるだけ）
const fixable = Object.entries(auditJson.vulnerabilities ?? {})
  .filter(([, v]) => v.fixAvailable === true || (v.fixAvailable && v.fixAvailable.isSemVerMajor === false))
  .map(([n, v]) => `${n}（${v.severity}）`);

const lines = [];
if (rows.length) {
  lines.push('| 対象 | いまの版 | 同じメジャーの最新 | 最新 |', '|---|---|---|---|');
  for (const r of rows) lines.push(`| ${r.what} | ${r.cur} | ${r.same} | ${r.latest} |`);
  lines.push('');
}
lines.push(`npm audit: critical ${meta.critical} / high ${meta.high} / moderate ${meta.moderate} / low ${meta.low}`);
lines.push(fixable.length ? `メジャーを上げずに直せる指摘: ${fixable.join('、')}` : 'メジャーを上げずに直せる指摘: なし');
lines.push('', '上げるときは、上げる前と後のビルド結果（dist）を比べてから push する。Node と wrangler は deploy.yml の固定版も直す。');
const report = lines.join('\n');
console.log(report);
if (out) writeFileSync(out, report + '\n');
process.exit(rows.length || fixable.length ? 10 : 0);
