import { renderMarkdown, stripFrontmatter } from './markdown';

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

export function buildDoc(id: string, src: string): DocData {
  const { data, body } = parseFrontmatter(src);
  const sources = Array.isArray(data.sources) ? data.sources : [];
  return {
    id,
    title: String(data.title ?? id),
    description: String(data.description ?? ''),
    sources,
    hermesVersion: String(data.hermes_version ?? ''),
    confidence: String(data.confidence ?? ''),
    rawPath: String(data.raw ?? `/hermes/raw/${id}.md`),
    html: renderMarkdown(stripFrontmatter(src).length >= 0 ? body : src),
    markdown: src.replace(/\n$/, '') + '\n',
  };
}
