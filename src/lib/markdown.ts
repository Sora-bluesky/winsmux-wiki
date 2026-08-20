export function stripFrontmatter(src: string): string {
  if (!src.startsWith('---')) return src;
  const end = src.indexOf('\n---', 3);
  if (end === -1) return src;
  return src.slice(end + 4).replace(/^\s*\n/, '');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function headingParts(s: string): { text: string; id: string } {
  const m = s.match(/^(.*?)\s*\{#([^}]+)\}\s*$/);
  if (m) return { text: m[1], id: m[2] };
  return { text: s, id: headingSlug(s) };
}

export function headingSlug(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function inline(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(/&lt;(\/?(?:strong|em|b|i|kbd|sup|sub|br))&gt;/g, '<$1>');
  out = out.replace(
    /!\[([^\]]*)\]\((https?:[^)]+|\/[^)]+)\)/g,
    '<img src="$2" alt="$1" loading="lazy" class="my-2 max-w-full rounded-lg border border-border" />',
  );
  out = out.replace(
    /\[([^\]]+)\]\((https?:[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>',
  );
  out = out.replace(/\[([^\]]+)\]\((\/[^)]+|#[^)]+)\)/g, '<a href="$2">$1</a>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return out;
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fenceOpen = line.match(/^(\s*)```/);
    if (fenceOpen) {
      const indent = fenceOpen[1].length;
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        buf.push(lines[i].startsWith(fenceOpen[1]) ? lines[i].slice(indent) : lines[i]);
        i += 1;
      }
      html.push(
        '<div class="codeblock relative">' +
          '<button type="button" class="copy-code absolute right-2 top-2 rounded-md border border-border bg-bg px-2 py-1 text-xs text-fg-muted hover:text-fg" aria-label="コードをコピー">コピー</button>' +
          `<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>` +
          '</div>',
      );
      i += 1;
      continue;
    }
    if (line.startsWith('|') && i + 1 < lines.length && /^\|?\s*-/.test(lines[i + 1])) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        rows.push(cells);
        i += 1;
      }
      const head = rows[0];
      const body = rows.slice(2);
      html.push('<div class="my-4 overflow-x-auto"><table class="w-full text-sm border-collapse">');
      html.push('<thead><tr>');
      for (const c of head) html.push(`<th class="border border-border bg-bg-subtle px-3 py-2 text-left">${inline(c)}</th>`);
      html.push('</tr></thead><tbody>');
      for (const row of body) {
        html.push('<tr>');
        for (const c of row) html.push(`<td class="border border-border px-3 py-2 align-top">${inline(c)}</td>`);
        html.push('</tr>');
      }
      html.push('</tbody></table></div>');
      continue;
    }
    if (line.startsWith('## ')) {
      const h = headingParts(line.slice(3));
      html.push(`<h2 id="${h.id}">${inline(h.text)}</h2>`);
      i += 1;
      continue;
    }
    if (line.startsWith('# ')) {
      html.push(`<h1>${inline(headingParts(line.slice(2)).text)}</h1>`);
      i += 1;
      continue;
    }
    if (line.startsWith('#### ')) {
      const h = headingParts(line.slice(5));
      html.push(`<h4 id="${h.id}">${inline(h.text)}</h4>`);
      i += 1;
      continue;
    }
    if (line.startsWith('### ')) {
      const h = headingParts(line.slice(4));
      html.push(`<h3 id="${h.id}">${inline(h.text)}</h3>`);
      i += 1;
      continue;
    }
    if (/^:::(\w+)/.test(line)) {
      const m = line.match(/^:::(\w+)\s*(.*)$/)!;
      const type = m[1].toLowerCase();
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== ':::') {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1;
      const titles: Record<string, string> = {
        note: 'メモ',
        tip: 'ヒント',
        info: '情報',
        warning: '注意',
        caution: '注意',
        danger: '危険',
      };
      const tones: Record<string, string> = {
        note: 'border-border bg-bg-subtle',
        tip: 'border-emerald-300 bg-emerald-50',
        info: 'border-sky-300 bg-sky-50',
        warning: 'border-amber-300 bg-amber-50',
        caution: 'border-amber-300 bg-amber-50',
        danger: 'border-red-300 bg-red-50',
      };
      const title = m[2].trim() || titles[type] || type;
      html.push(
        `<aside class="adm my-4 rounded-lg border px-4 py-3 ${tones[type] ?? tones.note}">` +
          `<p class="mb-1 text-sm font-semibold">${inline(title)}</p>` +
          renderMarkdown(buf.join('\n')) +
          '</aside>',
      );
      continue;
    }
    if (line.trim() === '---') {
      html.push('<hr />');
      i += 1;
      continue;
    }
    if (/^\s*- /.test(line)) {
      const items: { depth: number; text: string }[] = [];
      while (i < lines.length && /^\s*- /.test(lines[i])) {
        const m = lines[i].match(/^(\s*)- (.*)$/)!;
        items.push({ depth: Math.floor(m[1].length / 2), text: m[2] });
        i += 1;
      }
      let p = 0;
      const sub = (depth: number): string => {
        let out = '<ul>';
        while (p < items.length && items[p].depth >= depth) {
          const it = items[p];
          p += 1;
          let li = inline(it.text);
          if (p < items.length && items[p].depth > it.depth) li += sub(items[p].depth);
          out += `<li>${li}</li>`;
        }
        return out + '</ul>';
      };
      html.push('<ul>');
      while (p < items.length) {
        const it = items[p];
        p += 1;
        let li = inline(it.text);
        if (p < items.length && items[p].depth > it.depth) li += sub(items[p].depth);
        html.push(`<li>${li}</li>`);
      }
      html.push('</ul>');
      continue;
    }
    if (/^\d+\. /.test(line)) {
      html.push('<ol>');
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        html.push(`<li>${inline(lines[i].replace(/^\d+\. /, ''))}</li>`);
        i += 1;
      }
      html.push('</ol>');
      continue;
    }
    if (line.trim() === '') {
      i += 1;
      continue;
    }
    const buf = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#') && !/^\s*- /.test(lines[i]) && !lines[i].startsWith('```') && !lines[i].startsWith('|') && !lines[i].startsWith(':::') && !/^\d+\. /.test(lines[i]) && lines[i].trim() !== '---') {
      buf.push(lines[i]);
      i += 1;
    }
    html.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return html.join('\n');
}
