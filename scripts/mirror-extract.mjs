// Extract upstream docs into translation-ready markdown under .mirror/en/.
// Usage:
//   node scripts/mirror-extract.mjs --init          # catalog all files into mirror-state (pending)
//   node scripts/mirror-extract.mjs <path> [path..] # extract given upstream paths (relative to website/docs/)
// Untrusted input: unknown JSX constructs fail loud, never silently dropped.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const upstreamDir =
  process.env.HERMES_UPSTREAM_DIR ?? 'C:/Users/sorab/Documents/Projects/oss/hermes-agent';
const REF = 'upstream/main';
const DOCS = 'website/docs/';
const OFFICIAL = 'https://hermes-agent.nousresearch.com';
const STATE_PATH = join(root, 'data/mirror-state.json');
export const PROMPT_VERSION = 1;

function git(...args) {
  return execFileSync('git', ['-C', upstreamDir, ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

async function loadState() {
  try {
    return JSON.parse(await readFile(STATE_PATH, 'utf8'));
  } catch {
    return { ref: REF, files: {} };
  }
}

function listUpstream() {
  // path -> blob sha
  const out = new Map();
  for (const line of git('ls-tree', '-r', REF, DOCS).split('\n')) {
    const m = line.match(/^\d+ blob ([0-9a-f]{40})\t(.+)$/);
    if (!m) continue;
    const rel = m[2].slice(DOCS.length);
    if (!/\.(md|mdx)$/.test(rel)) continue;
    if (rel === 'index.mdx') continue; // site landing; /hermes/docs/ top is generated locally
    if (rel === 'user-stories.mdx') continue; // JSX collage page, not mirrorable content
    if (rel === 'reference/automation-blueprints-catalog.mdx') continue; // JSX catalog component page
    out.set(rel, m[1]);
  }
  return out;
}

// docusaurus-style anchor for a heading text
function anchorSlug(text) {
  return text
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

function transform(rel, src) {
  const problems = [];
  let s = src.replace(/\r\n/g, '\n');

  // strip frontmatter; keep title/description for the translator
  let title = '';
  let description = '';
  if (s.startsWith('---')) {
    const end = s.indexOf('\n---', 3);
    const fm = s.slice(4, end);
    title = (fm.match(/^title:\s*(.+)$/m)?.[1] ?? '').replace(/^"|"$/g, '');
    description = (fm.match(/^description:\s*(.+)$/m)?.[1] ?? '').replace(/^"|"$/g, '');
    s = s.slice(end + 4).replace(/^\s*\n/, '');
  }

  s = s.replace(/\{\/\*[\s\S]*?\*\/\}/g, ''); // MDX comments
  s = s.replace(/^import .*$/gm, ''); // import lines

  // Protect code fences from further transforms
  const fences = [];
  s = s.replace(/^[ \t]*```[\s\S]*?^[ \t]*```[ \t]*$/gm, (block) => {
    fences.push(block);
    return `\u0000FENCE${fences.length - 1}\u0000`;
  });

  // YouTube embed wrappers -> plain link line
  s = s.replace(
    /<div[^>]*>\s*<iframe[\s\S]*?src="([^"]+)"[\s\S]*?<\/iframe>\s*<\/div>/g,
    (_, url) => `[YouTube: ${url}](${url})`,
  );
  s = s.replace(/<iframe[\s\S]*?src="([^"]+)"[\s\S]*?<\/iframe>/g, (_, url) => `[YouTube: ${url}](${url})`);
  // self-closing <iframe ... /> (with or without a div wrapper)
  s = s.replace(
    /<div[^>]*>\s*<iframe[\s\S]*?src="([^"]+)"[\s\S]*?\/>\s*<\/div>/g,
    (_, url) => `[YouTube: ${url}](${url})`,
  );
  s = s.replace(/<iframe[\s\S]*?src="([^"]+)"[\s\S]*?\/>/g, (_, url) => `[YouTube: ${url}](${url})`);

  // videos -> plain link line (site-relative media resolves to the official host)
  s = s.replace(/<video[^>]*?src="([^"]+)"[\s\S]*?<\/video>/g, (_, url) => {
    const abs = url.startsWith('/') ? `${OFFICIAL}${url}` : url;
    return `[動画: ${abs}](${abs})`;
  });
  // <img ...> (JSX or HTML, any attribute order) -> markdown image
  s = s.replace(/<img[^>]*>/g, (tag) => {
    const src =
      tag.match(/useBaseUrl\('([^']+)'\)/)?.[1] ?? tag.match(/src="([^"]+)"/)?.[1] ?? null;
    if (!src) return tag; // leave for the fail-loud scan
    const alt = tag.match(/alt="([^"]*)"/)?.[1] ?? '';
    const abs = src.startsWith('/') ? `${OFFICIAL}${src}` : src;
    return `![${alt}](${abs})`;
  });
  // alert divs -> admonitions
  const alertMap = { warning: 'warning', danger: 'danger', info: 'info', success: 'tip', secondary: 'note' };
  s = s.replace(/<div class="alert alert--(\w+)">\s*([\s\S]*?)\s*<\/div>/g, (_, kind, body) => {
    return `:::${alertMap[kind] ?? 'note'}
${body.trim()}
:::`;
  });
  // CTA button: a styled div wrapping one styled <a> -> markdown link
  s = s.replace(/<div[^>]*>\s*<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/div>/g, (_, url, text) => {
    return `[${text.trim()}](${url})`;
  });
  // MDX-escaped angle brackets in prose are literal text, not markup
  s = s.replace(/\\([<>])/g, '$1');
  // figure captions -> emphasized text
  s = s.replace(/<p className="docs-figure-caption">([\s\S]*?)<\/p>/g, (_, t) => `*${t.trim()}*`);
  // styled div wrappers left around a converted link -> unwrap
  s = s.replace(/<div[^>]*>\s*(\[[^\]]*\]\([^)]*\))\s*<\/div>/g, '$1');
  s = s.replace(/<div[^>]*>\s*<\/div>/g, '');

  // Remaining tags: MDX components (Capitalized) and structural HTML we do not
  // render must fail loud. Other lowercase tags are prose placeholders
  // (<profile>, <timestamp>, <service-user>) that render safely as escaped text.
  const structural = /^<\/?(div|span|iframe|video|img|table|thead|tbody|tr|td|th|section|figure|picture|source|script|style|form|input|button|a|p|ul|ol|li|h[1-6])(?![A-Za-z-])/i;
  const component = /^<\/?[A-Z]/;
  const masked = s.replace(/`[^`\n]*`/g, '');
  for (const m of masked.matchAll(/<[A-Za-z\/][^>\n]*>/g)) {
    if ((component.test(m[0]) || structural.test(m[0])) && !m[0].startsWith('<http'))
      problems.push(`unsupported tag: ${m[0].slice(0, 60)}`);
  }

  // images: /img/... -> official absolute
  s = s.replace(/(!\[[^\]]*\]\()\/img\//g, `$1${OFFICIAL}/img/`);
  s = s.replace(/src="\/img\//g, `src="${OFFICIAL}/img/`);

  // links: resolve relative + root-relative doc links to /hermes/docs/...
  const dir = posix.dirname(rel);
  s = s.replace(/\]\(([^)\s]+)\)/g, (whole, url) => {
    if (/^(https?:|mailto:|#)/.test(url)) return whole;
    if (url.startsWith('/img/')) return whole;
    let [path, frag] = url.split('#');
    frag = frag ? `#${frag}` : '';
    if (path.startsWith('/docs/')) path = path.slice('/docs/'.length);
    else if (/^\/(getting-started|user-guide|guides|integrations|developer-guide|reference)\//.test(path))
      path = path.slice(1); // docusaurus root-relative doc link
    else if (path.startsWith('/')) return `](${OFFICIAL}${url})`;
    else path = posix.normalize(posix.join(dir, path));
    path = path.replace(/\.mdx?$/, '').replace(/\/$/, '').replace(/\/index$/, '');
    if (!path || path === '.') return whole;
    return `](/hermes/docs/${path}/${frag})`;
  });

  // headings: append stable {#anchor} derived from the English text
  s = s.replace(/^(#{1,4}) (.+)$/gm, (whole, hashes, text) => {
    if (/\{#[^}]+\}\s*$/.test(text)) return whole;
    const slug = anchorSlug(text);
    return slug ? `${hashes} ${text} {#${slug}}` : whole;
  });

  s = s.replace(/\u0000FENCE(\d+)\u0000/g, (_, n) => fences[Number(n)]);
  s = s.replace(/\n{3,}/g, '\n\n').trim() + '\n';

  return { title, description, body: s, problems };
}

const args = process.argv.slice(2);
const state = await loadState();
const upstream = listUpstream();
const snapshotCommit = git('rev-parse', REF).trim();
state.ref = REF;
state.snapshotCommit = snapshotCommit;
state.files ??= {};

if (args[0] === '--init') {
  for (const [rel, blob] of upstream) {
    const cur = state.files[rel];
    if (!cur) state.files[rel] = { blob, status: 'pending' };
    else if (cur.blob !== blob) {
      cur.blob = blob;
      if (cur.status === 'translated') cur.status = 'stale';
    }
  }
  for (const rel of Object.keys(state.files)) {
    if (!upstream.has(rel)) state.files[rel].status = 'deleted';
  }
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
  const counts = {};
  for (const f of Object.values(state.files)) counts[f.status] = (counts[f.status] ?? 0) + 1;
  console.log(`mirror-state: ${upstream.size} upstream files @ ${snapshotCommit.slice(0, 7)}`, counts);
  process.exit(0);
}

if (args.length === 0) {
  console.error('usage: mirror-extract.mjs --init | <path...>');
  process.exit(1);
}

let failed = 0;
for (const rel of args) {
  if (!upstream.has(rel)) {
    console.error(`FAIL ${rel}: not in upstream`);
    failed++;
    continue;
  }
  const src = git('show', `${REF}:${DOCS}${rel}`);
  const { title, description, body, problems } = transform(rel, src);
  if (problems.length) {
    console.error(`FAIL ${rel}:\n  ${problems.join('\n  ')}`);
    failed++;
    continue;
  }
  const urlPath = rel.replace(/\.mdx?$/, '').replace(/\/index$/, '');
  const out = `---
title: ${JSON.stringify(title || urlPath)}
description: ${JSON.stringify(description)}
upstream_path: ${rel}
upstream_blob: ${upstream.get(rel)}
sources:
  - ${OFFICIAL}/docs/${urlPath}
---

${body}`;
  const dest = join(root, '.mirror/en', rel.replace(/\.mdx$/, '.md'));
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, out);
  state.files[rel] = { blob: upstream.get(rel), status: state.files[rel]?.status === 'translated' ? 'stale' : (state.files[rel]?.status ?? 'pending') };
  console.log(`ok ${rel} -> .mirror/en/${rel}`);
}
await writeFile(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
if (failed) process.exit(1);
