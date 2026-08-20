import { headingParts, renderMarkdown } from './markdown';

const mirrorFiles = import.meta.glob('../raw/docs/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const mirrorSet = new Set(
  Object.keys(mirrorFiles).map((k) => k.split('raw/docs/')[1].replace(/\.md$/, '').replace(/\/index$/, '')),
);

// Links to not-yet-translated mirror pages fall back to the official docs.
function resolveMirrorLinks(html: string): string {
  return html.replace(
    /href="\/hermes\/docs\/([^"#]+)\/(#[^"]*)?"/g,
    (whole, p: string, frag: string | undefined) =>
      mirrorSet.has(p)
        ? whole
        : `href="https://hermes-agent.nousresearch.com/docs/${p}${frag ?? ''}" target="_blank" rel="noopener"`,
  );
}

export type DocData = {
  id: string;
  title: string;
  description: string;
  sources: string[];
  hermesVersion: string;
  confidence: string;
  rawPath: string;
  html: string;
  markdown: string;
};

function parseFrontmatter(src: string): { data: Record<string, string | string[]>; body: string } {
  if (!src.startsWith('---')) return { data: {}, body: src };
  const end = src.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: src };
  const raw = src.slice(4, end);
  const body = src.slice(end + 4).replace(/^\s*\n/, '');
  const data: Record<string, string | string[]> = {};
  let listKey: string | null = null;
  for (const line of raw.split('\n')) {
    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem && listKey) {
      const cur = data[listKey];
      if (Array.isArray(cur)) cur.push(listItem[1].trim());
      else data[listKey] = [listItem[1].trim()];
      continue;
    }
    const m = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!m) continue;
    listKey = null;
    const key = m[1];
    const val = m[2].trim().replace(/^"|"$/g, '');
    if (val === '') {
      data[key] = [];
      listKey = key;
    } else {
      data[key] = val;
    }
  }
  return { data, body };
}

export type Heading = { depth: 2 | 3; text: string; id: string };

export function extractHeadings(body: string): Heading[] {
  const out: Heading[] = [];
  let inFence = false;
  for (const l of body.split('\n')) {
    if (l.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = l.match(/^(##|###) (.+)$/);
    if (!m) continue;
    const { text, id } = headingParts(m[2].trim());
    out.push({ depth: m[1].length as 2 | 3, text: text.replace(/[`*]/g, ''), id });
  }
  return out;
}

function tocHtml(body: string): string {
  const heads = extractHeadings(body);
  if (heads.filter((h) => h.depth === 2).length < 3) return '';
  const items = heads
    .map(
      (h) =>
        `<li${h.depth === 3 ? ' class="ml-4"' : ''}><a href="#${h.id}">${h.text}</a></li>`,
    )
    .join('');
  return (
    '<details class="toc my-6 rounded-lg border border-border bg-bg-subtle px-4 py-3 text-sm 2xl:hidden">' +
    '<summary class="cursor-pointer select-none font-semibold">目次</summary>' +
    `<ul class="mt-2 space-y-1">${items}</ul></details>`
  );
}

export function buildDoc(id: string, src: string): DocData {
  const { data, body } = parseFrontmatter(src);
  const sources = Array.isArray(data.sources) ? data.sources : [];
  const rendered = renderMarkdown(body);
  const toc = tocHtml(body);
  const rail = toc
    ? '<nav class="toc-rail fixed right-4 top-24 hidden max-h-[70vh] w-56 overflow-y-auto text-sm 2xl:block" aria-label="このページの目次">' +
      '<p class="pb-1 text-xs font-semibold text-fg-muted">目次</p>' +
      `<ul class="space-y-1 border-l border-border pl-3">${extractHeadings(body)
        .map(
          (h) =>
            `<li${h.depth === 3 ? ' class="ml-3"' : ''}><a class="text-fg-muted no-underline hover:text-fg" href="#${h.id}">${h.text}</a></li>`,
        )
        .join('')}</ul></nav>`
    : '';
  const html = resolveMirrorLinks(
    toc ? rendered.replace(/<\/h1>/, '</h1>' + toc + rail) : rendered,
  );
  return {
    id,
    title: String(data.title ?? id),
    description: String(data.description ?? ''),
    sources,
    hermesVersion: String(data.hermes_version ?? ''),
    confidence: String(data.confidence ?? ''),
    rawPath: String(data.raw ?? `/hermes/raw/${id}.md`),
    html,
    markdown: src.replace(/\n$/, '') + '\n',
  };
}
