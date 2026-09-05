#!/usr/bin/env node
// dist/ を1回だけ走査して、公開物の健全性を数える。読み取り専用・依存なし。
//   node scripts/wiki-audit.mjs          人が読む形（25行以内）
//   node scripts/wiki-audit.mjs --json   機械が読む形
//
// 再帰 grep は使わない。この環境の `grep -r` は実在する文字列に 0 を返すことがある。
// 数えるのは「一致した行数」ではなく「一致した回数」。dist の HTML は 1 行に
// 圧縮されているので、行で数えると全部 1 になる。
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(root, 'dist');
const AS_JSON = process.argv.includes('--json');
const SAMPLE = 10;
const TITLE_MAX = 60;
// 404 はどこからも張られないのが正常なので孤立から外す。除外したことは JSON に残す。
const ORPHAN_EXCLUDE = new Set(['/404.html']);

if (!existsSync(DIST)) {
  console.error('dist/ が無い。先に npm run build');
  process.exit(1);
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const unescape = (s) => s.replace(/&(#?\w+);/g, (m, k) => ENTITIES[k] ?? m);

function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return out;
}

const count = (text, re) => [...text.matchAll(re)].length;

/** dist/hermes/about/index.html -> /hermes/about/ ; dist/404.html -> /404.html */
function keyForFile(rel) {
  const parts = rel.split('/');
  if (parts[parts.length - 1] === 'index.html') {
    parts.pop();
    return '/' + (parts.length ? parts.join('/') + '/' : '');
  }
  return '/' + rel;
}

/** リンク先をページキーに揃える。外部・非 http は null。 */
function normalize(href, fromKey, host) {
  let h = String(href).trim();
  if (!h || /^(#|mailto:|tel:|javascript:|data:)/i.test(h) || h.startsWith('//')) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(h)) {
    let u;
    try {
      u = new URL(h);
    } catch {
      return null;
    }
    if (!/^https?:$/i.test(u.protocol) || !host || u.host !== host) return null;
    h = u.pathname;
  } else {
    const cut = h.search(/[?#]/);
    if (cut >= 0) h = h.slice(0, cut);
    if (!h) return null;
    if (!h.startsWith('/')) {
      try {
        h = new URL(h, 'http://h' + fromKey).pathname;
      } catch {
        return null;
      }
    }
  }
  try {
    h = decodeURI(h);
  } catch {
    /* 壊れた %xx はそのまま扱う */
  }
  if (h.endsWith('/') || /\.[a-z0-9]{1,6}$/i.test(h)) return h;
  return h + '/';
}

const entries = readdirSync(DIST, { recursive: true, encoding: 'utf8' }).map((r) => r.split('\\').join('/'));
const htmlFiles = entries.filter((r) => r.toLowerCase().endsWith('.html')).sort();
const xmlFiles = entries.filter((r) => r.toLowerCase().endsWith('.xml')).sort();

const pages = [];
for (const rel of htmlFiles) {
  const html = readFileSync(join(DIST, rel), 'utf8');
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  pages.push({
    key: keyForFile(rel),
    title: t ? unescape(t[1]).trim() : null,
    description: metas.find((a) => (a.name || '').toLowerCase() === 'description')?.content ?? null,
    canonical: links.find((a) => (a.rel || '').toLowerCase() === 'canonical')?.href ?? null,
    hreflang: links.filter((a) => a.hreflang).length,
    refresh: metas.some((a) => (a['http-equiv'] || '').toLowerCase() === 'refresh'),
    hrefs: [...html.matchAll(/<a\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((m) => m[1] ?? m[2]),
  });
}

// ホストは canonical の実測から採る（決め打ちしない）
const host = pages.map((p) => p.canonical).find(Boolean)
  ? (() => {
      try {
        return new URL(pages.find((p) => p.canonical).canonical).host;
      } catch {
        return null;
      }
    })()
  : null;

const known = new Set(pages.map((p) => p.key));
const inbound = new Map(pages.map((p) => [p.key, 0]));
for (const p of pages) {
  const seen = new Set();
  for (const href of p.hrefs) {
    const k = normalize(href, p.key, host);
    // 自分から自分へのリンクは孤立判定に数えない
    if (!k || k === p.key || !known.has(k) || seen.has(k)) continue;
    seen.add(k);
    inbound.set(k, inbound.get(k) + 1);
  }
}

let sitemapUrls = 0;
let sitemapLastmod = 0;
const sitemapFiles = [];
for (const rel of xmlFiles) {
  const xml = readFileSync(join(DIST, rel), 'utf8');
  if (!/<urlset[\s>]/i.test(xml)) continue; // sitemapindex の <loc> は URL ではない
  sitemapFiles.push(rel);
  sitemapUrls += count(xml, /<loc\b[^>]*>/gi);
  sitemapLastmod += count(xml, /<lastmod\b[^>]*>/gi);
}

const stubs = pages.filter((p) => p.refresh).map((p) => p.key).sort();
// 転送スタブはどこからも張られないのが正常なので、孤立には数えない（別指標のまま）
const orphans = pages
  .filter((p) => inbound.get(p.key) === 0 && !p.refresh && !ORPHAN_EXCLUDE.has(p.key))
  .map((p) => p.key)
  .sort();

const report = {
  dist: 'dist/',
  html_total: pages.length,
  title: {
    with_hermes: pages.filter((p) => p.title && p.title.includes('Hermes')).length,
    missing_or_empty: pages.filter((p) => !p.title).length,
    over_60: pages.filter((p) => p.title && [...p.title].length > TITLE_MAX).length,
  },
  description_missing_or_empty: pages.filter((p) => !p.description).length,
  canonical_missing: pages.filter((p) => !p.canonical).length,
  hreflang_pages: pages.filter((p) => p.hreflang > 0).length,
  sitemap: { files: sitemapFiles, urls: sitemapUrls, with_lastmod: sitemapLastmod },
  redirect_stubs: { count: stubs.length, sample: stubs.slice(0, SAMPLE) },
  orphans: {
    count: orphans.length,
    sample: orphans.slice(0, SAMPLE),
    excluded: [...ORPHAN_EXCLUDE],
    excludes_redirect_stubs: true,
  },
  host: host,
};

if (AS_JSON) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const lines = [];
lines.push(`dist: HTML ${report.html_total} / sitemap URL ${sitemapUrls}（lastmod ${sitemapLastmod}）`);
lines.push(
  `title: Hermes 含む ${report.title.with_hermes} / 空か無し ${report.title.missing_or_empty} / ${TITLE_MAX}字超 ${report.title.over_60}`,
);
lines.push(
  `meta: description 無し ${report.description_missing_or_empty} / canonical 無し ${report.canonical_missing} / hreflang 有り ${report.hreflang_pages}`,
);
for (const [label, items] of [['転送スタブ', stubs], ['孤立ページ（スタブ除く）', orphans]]) {
  if (!items.length) {
    lines.push(`${label}: 0`);
    continue;
  }
  lines.push(`${label}: ${items.length}${items.length > SAMPLE ? `（先頭 ${SAMPLE} 件）` : ''}`);
  for (const s of items.slice(0, SAMPLE)) lines.push(`  ${s}`);
}
console.log(lines.slice(0, 25).join('\n'));
