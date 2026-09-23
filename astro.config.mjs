// @ts-check
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static Assets only. Do not change output to 'server'.
// Do not add @astrojs/cloudflare, src/pages/api/*, Functions, KV, R2, or a Worker main script.

const SITE_URL = 'https://wiki.winsmux.dev';
const PROJECT_ROOT = fileURLToPath(new URL('.', import.meta.url));

const REDIRECTED = new Set([
  '/',
  '/hermes/live/',
  '/hermes/start/',
  '/hermes/start/line/',
  '/hermes/start/telegram/',
  '/hermes/syntheses/cost-and-model/',
]);

// public/_headers で X-Robots-Tag: noindex を返すページ。両方を同時に直す
const NOINDEX = new Set(['/hermes/search/']);

const TEMPLATE_ROUTES = [
  { urlPrefix: 'hermes/concepts/', sourceDir: 'src/raw/concepts' },
  { urlPrefix: 'hermes/entities/', sourceDir: 'src/raw/entities' },
  { urlPrefix: 'hermes/syntheses/', sourceDir: 'src/raw/syntheses' },
];

const GIT_HISTORY_PATHS = ['src/raw', 'src/pages', 'data'];

/** @returns {Map<string, string>} */
function loadGitDates() {
  const dates = new Map();

  try {
    const isShallow =
      execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim() === 'true';

    // A shallow boundary can make unchanged files appear to have been committed
    // by the checkout's newest commit, so omit dates rather than publish guesses.
    if (isShallow) return dates;

    const log = execFileSync(
      'git',
      ['log', '--format=@%cI', '--name-only', '--', ...GIT_HISTORY_PATHS],
      {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );

    /** @type {string | undefined} */
    let currentDate;

    for (const line of log.split(/\r?\n/)) {
      const commit = /^@(\d{4}-\d{2}-\d{2})T/.exec(line);
      if (commit) {
        currentDate = commit[1];
        continue;
      }

      const sourcePath = line.replaceAll('\\', '/');
      if (!sourcePath || !currentDate || dates.has(sourcePath)) continue;

      // git log is newest-first, so the first occurrence is the latest commit.
      dates.set(sourcePath, currentDate);
    }
  } catch {
    // Git may be unavailable or the directory may have no usable history.
  }

  return dates;
}

/**
 * @param {string[]} candidates
 * @returns {string | undefined}
 */
function firstExistingSource(candidates) {
  return candidates.find((sourcePath) => existsSync(resolve(PROJECT_ROOT, sourcePath)));
}

/**
 * .astro が import している本文ファイル（raw/*.md・data/*.json）を repo 相対パスで返す
 * @param {string} astroPath
 * @returns {string[]}
 */
function importedContentSources(astroPath) {
  let text;
  try {
    text = readFileSync(resolve(PROJECT_ROOT, astroPath), 'utf8');
  } catch {
    return [];
  }
  const out = [];
  for (const m of text.matchAll(/from\s+'([^']+\.(?:md|json))(?:\?raw)?'/g)) {
    const abs = resolve(PROJECT_ROOT, dirname(astroPath), m[1]);
    const rel = relative(PROJECT_ROOT, abs).split('\\').join('/');
    if (!rel.startsWith('..') && !isAbsolute(rel) && existsSync(abs)) out.push(rel);
  }
  return out;
}

/**
 * @param {string} pageUrl
 * @returns {string | string[] | undefined}
 */
function sourcePathForUrl(pageUrl) {
  /** @type {string} */
  let pathname;

  try {
    pathname = decodeURIComponent(new URL(pageUrl).pathname);
  } catch {
    return undefined;
  }

  const route = pathname.replace(/^\/+|\/+$/g, '');
  if (route.includes('\\') || route.split('/').some((part) => part === '.' || part === '..')) {
    return undefined;
  }

  // Exact static routes take precedence over catch-all and parameterized routes.
  // 静的ルートの本文は .astro が import する raw/*.md や data/*.json にあるので、
  // それらも日付の候補に入れる（.astro の日付だけだと本文更新が lastmod に出ない）
  const staticSource = firstExistingSource(
    route
      ? [`src/pages/${route}/index.astro`, `src/pages/${route}.astro`]
      : ['src/pages/index.astro'],
  );
  if (staticSource) return [staticSource, ...importedContentSources(staticSource)];

  const docsPrefix = 'hermes/docs/';
  if (route.startsWith(docsPrefix)) {
    const id = route.slice(docsPrefix.length);
    if (!id) return undefined;

    return firstExistingSource([
      `src/raw/docs/${id}.md`,
      `src/raw/docs/${id}/index.md`,
    ]);
  }

  for (const { urlPrefix, sourceDir } of TEMPLATE_ROUTES) {
    if (!route.startsWith(urlPrefix)) continue;

    const id = route.slice(urlPrefix.length);
    if (!id || id.includes('/')) return undefined;

    return firstExistingSource([`${sourceDir}/${id}.md`]);
  }

  return undefined;
}

const gitDates = loadGitDates();

let serializedUrlCount = 0;
let datedUrlCount = 0;
/** @type {ReturnType<typeof setTimeout> | undefined} */
let lastmodSummaryTimer;

function scheduleLastmodSummary() {
  if (lastmodSummaryTimer !== undefined) clearTimeout(lastmodSummaryTimer);

  lastmodSummaryTimer = setTimeout(() => {
    process.stderr.write(
      `sitemap lastmod: ${datedUrlCount} of ${serializedUrlCount} urls dated\n`,
    );
    serializedUrlCount = 0;
    datedUrlCount = 0;
    lastmodSummaryTimer = undefined;
  }, 0);
}

export default defineConfig({
  output: 'static',
  site: SITE_URL,
  trailingSlash: 'always',
  integrations: [
    // ルートは /hermes/ を canonical に指している。正規化先ではない URL を
    // サイトマップに載せるとクロールの一枠を無駄にするので外す
    sitemap({
      // 301 で転送する入口（public/_redirects）と noindex のページ（public/_headers）はサイトマップに載せない
      filter: (page) => {
        const path = page.replace(SITE_URL, '');
        return !REDIRECTED.has(path) && !NOINDEX.has(path);
      },
      serialize(item) {
        serializedUrlCount += 1;

        const sources = sourcePathForUrl(item.url);
        // 複数の候補があれば最新の日付を採る（未コミットの候補は無視）
        const lastmod = (Array.isArray(sources) ? sources : sources ? [sources] : [])
          .map((sourcePath) => gitDates.get(sourcePath))
          .filter(Boolean)
          .sort()
          .at(-1);

        if (lastmod) {
          item.lastmod = lastmod;
          datedUrlCount += 1;
        }

        scheduleLastmodSummary();
        return item;
      },
    }),
  ],
});

