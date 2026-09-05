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
  tocRail: string;
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
    '<details class="toc my-6 rounded-lg border border-border bg-bg-subtle px-4 py-3 text-sm min-[1800px]:hidden">' +
    '<summary class="cursor-pointer select-none font-semibold">目次</summary>' +
    `<ul class="mt-2 space-y-1">${items}</ul></details>`
  );
}

/**
 * description が空のときの補い。本文の最初の「日本語の散文行」を 110 字で切る。
 * 見出し・コード・表・リスト・HTML・:::ボックスは飛ばす。日本語を含まない行は
 * 取らない（frontmatter が壊れてコードが流れ込んだ原稿で英文コードを拾わない）。
 * 見つからなければ空のまま返す。文を作って埋めない。
 */
export function fallbackDescription(body: string, max = 110): string {
  // 原稿は行折り返しされているので、空行までを1段落として結合してから判定する
  const paragraphs: string[] = [];
  let buf: string[] = [];
  let inFence = false;
  let inBox = false; // :::note 〜 ::: のボックスは本文ごと飛ばす
  const cjk = /[぀-ヿ一-鿿]/;
  const flush = () => {
    if (buf.length) {
      // 折り返しの継ぎ目は、両端が日本語なら空白を入れない
      let text = buf[0];
      for (const next of buf.slice(1)) {
        text += cjk.test(text.slice(-1)) && cjk.test(next[0]) ? next : ' ' + next;
      }
      paragraphs.push(text);
    }
    buf = [];
  };
  for (const raw of body.split('\n')) {
    const l = raw.trim();
    if (l.startsWith('```')) {
      inFence = !inFence;
      flush();
      continue;
    }
    if (inFence) continue;
    if (l.startsWith(':::')) {
      inBox = l.length > 3 ? true : !inBox;
      flush();
      continue;
    }
    if (inBox) continue;
    if (!l || /^(#|>|\||[-*+] |\d+\. |<|!\[|\[!)/.test(l)) {
      flush();
      continue;
    }
    buf.push(l);
  }
  flush();
  for (const p of paragraphs) {
    if (!/[぀-ヿ一-鿿]/.test(p)) continue;
    const text = p
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[`*~]/g, '') // `_` は識別子（OPENROUTER_API_KEY 等）に入るので消さない
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .replace(/([　-〿぀-ヿ一-鿿]) (?=[　-〿぀-ヿ一-鿿])/g, '$1') // **強調** の両脇に入った空白（句読点も含む）
      .trim();
    if ([...text].length < 20) continue;
    const chars = [...text];
    return chars.length > max ? chars.slice(0, max - 1).join('') + '…' : text;
  }
  return '';
}

export function buildDoc(id: string, src: string): DocData {
  const { data, body } = parseFrontmatter(src);
  const sources = Array.isArray(data.sources) ? data.sources : [];
  const rendered = renderMarkdown(body);
  const toc = tocHtml(body);
  // 右サイドバー用の目次リスト（BaseLayout が共通右カラム内に描画する）
  const tocRail = toc
    ? `<ul class="space-y-1 border-l border-border pl-3">${extractHeadings(body)
        .map(
          (h) =>
            `<li${h.depth === 3 ? ' class="ml-3"' : ''}><a class="text-fg-muted no-underline hover:text-fg" href="#${h.id}">${h.text}</a></li>`,
        )
        .join('')}</ul>`
    : '';
  const html = resolveMirrorLinks(toc ? rendered.replace(/<\/h1>/, '</h1>' + toc) : rendered);
  return {
    id,
    title: String(data.title ?? id),
    description: String(data.description ?? '').trim() || fallbackDescription(body),
    sources,
    hermesVersion: String(data.hermes_version ?? ''),
    confidence: String(data.confidence ?? ''),
    rawPath: String(data.raw ?? `/hermes/raw/${id}.md`),
    html,
    tocRail,
    markdown: src.replace(/\n$/, '') + '\n',
  };
}
