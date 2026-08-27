// 検索・絞り込みの表記揺れ辞書。カタカナ/ひらがな表記 → 本文の正規表記（主に英字）。
// 逆引き/トラブル/モデル/skill のフィルタと、Pagefind（SearchModal の processTerm）で共用する。
export const ALIASES: Record<string, string> = {
  テレグラム: 'telegram',
  ライン: 'line',
  ディスコード: 'discord',
  スラック: 'slack',
  シグナル: 'signal',
  ワッツアップ: 'whatsapp',
  ウィーチャット: 'wechat',
  ジーメール: 'gmail',
  クーロン: 'cron',
  クロン: 'cron',
  スキル: 'skill',
  フック: 'hook',
  ドッカー: 'docker',
  ギットハブ: 'github',
  ノーション: 'notion',
  オブシディアン: 'obsidian',
  スポティファイ: 'spotify',
  クロード: 'claude',
  ジェミニ: 'gemini',
  ジェミナイ: 'gemini',
  グロック: 'grok',
  オラマ: 'ollama',
  オーラマ: 'ollama',
  ウェブフック: 'webhook',
  エムシーピー: 'mcp',
  ブイピーエス: 'vps',
  ポータル: 'portal',
  ブラウザー: 'ブラウザ',
  メモリー: 'memory',
  ダッシュボード: 'dashboard',
};

// 全角→半角(NFKC) + 小文字化
export const normalizeText = (s: string): string => s.normalize('NFKC').toLowerCase();

// クエリを「そのまま + 辞書変換」の候補列に展開する（部分一致で使う）
export const expandQuery = (q: string): string[] => {
  const n = normalizeText(q.trim());
  if (!n) return [];
  const out = [n];
  for (const [ja, canon] of Object.entries(ALIASES)) {
    const jaN = normalizeText(ja);
    if (n.includes(jaN)) out.push(n.split(jaN).join(canon));
  }
  return [...new Set(out)];
};

// Pagefind の processTerm 用: 1語をカノニカル表記へ
export const canonicalTerm = (term: string): string => {
  const n = normalizeText(term);
  return ALIASES[term] ?? ALIASES[n] ?? Object.entries(ALIASES).find(([ja]) => normalizeText(ja) === n)?.[1] ?? term;
};
