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

export function headingSlug(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function inline(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(
    /\[([^\]]+)\]\((https?:[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>',
  );
  out = out.replace(/\[([^\]]+)\]\((\/[^)]+)\)/g, '<a href="$2">$1</a>');
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
    if (line.startsWith('```')) {
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i]);
        i += 1;
      }
      html.push(`<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`);
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
      html.push(`<h2 id="${headingSlug(line.slice(3))}">${inline(line.slice(3))}</h2>`);
      i += 1;
      continue;
    }
    if (line.startsWith('# ')) {
      html.push(`<h1>${inline(line.slice(2))}</h1>`);
      i += 1;
      continue;
    }
    if (line.startsWith('### ')) {
      html.push(`<h3>${inline(line.slice(4))}</h3>`);
      i += 1;
      continue;
    }
    if (line.trim() === '---') {
      html.push('<hr />');
      i += 1;
      continue;
    }
    if (line.startsWith('- ')) {
      html.push('<ul>');
      while (i < lines.length && lines[i].startsWith('- ')) {
        html.push(`<li>${inline(lines[i].slice(2))}</li>`);
        i += 1;
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
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#') && !lines[i].startsWith('- ') && !lines[i].startsWith('```') && !lines[i].startsWith('|') && !/^\d+\. /.test(lines[i]) && lines[i].trim() !== '---') {
      buf.push(lines[i]);
      i += 1;
    }
    html.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return html.join('\n');
}
