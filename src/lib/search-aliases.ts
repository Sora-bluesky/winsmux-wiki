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
  メモリー: '記憶',
  ダッシュボード: 'dashboard',
  メモリ: '記憶',
  日本語化: '日本語',
  ローカルモデル: 'ローカル',
  ローカルllm: 'ローカル',
  常駐: 'ゲートウェイ',
  // 2026-09-01 のサジェスト監査（scripts/suggest-audit.py）で 0 件だった語の橋渡し
  macos: 'mac',
  macbook: 'mac',
  vps: 'サーバー',
  gateway: 'ゲートウェイ',
  cronjobs: 'cron',
  cronjob: 'cron',
  dockerfile: 'docker',
  dockerhub: 'docker',
  mcps: 'mcp',
  memories: '記憶',
  memory: '記憶',
  モデル変更: 'モデル',
  モデル選択: 'モデル',
  無料枠: '無料',
  複数: 'プロファイル',
  windows11: 'windows',
  // くっついた修飾語を落とす（「インストール方法」→「インストール」）。空文字への置換で語が消える
  方法: '',
  おすすめ: '',
  比較: '',
  model設定: 'モデル',
  toha: 'とは',
  使用: '使い',
  活用: '使い',
  起動: '動か',
  openclaw: 'import',
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

// 実際に打たれる語は「hermes agent telegram つながらない」のように複数語になる。
// クエリ全体の部分一致だけで判定すると、そういう語は必ず 0 件になる（2026-09-01 実測: サジェスト 218 語が全滅）。
// 語に割って、製品名のような共通語を落としたうえで、残りを全部含む行を出す。
const STOPWORDS = new Set([
  'hermes', 'agent', 'hermesagent', 'エージェント', 'ヘルメス',
  'の', 'を', 'に', 'で', 'は', 'が',
  // 打たれるが行のテキストに現れない汎用の修飾語
  '方法', 'やり方', '手順', 'とは', 'できない', 'できる',
]);

export const queryTokens = (q: string): string[][] => {
  const variants = expandQuery(q);
  if (!variants.length) return [];
  const groups = variants.map((v) => v.split(/[\s　]+/).filter((w) => w && !STOPWORDS.has(w)));
  // 変換の結果どれかが空になる = 実質は修飾語だけの検索。絞り込まず全件を出す
  if (groups.some((ws) => ws.length === 0)) return [];
  return groups.filter((ws) => ws.length > 0);
};

// 1行ぶんのテキストがクエリに一致するか。
// いずれかの変換候補について、その全ての語を含めば一致とみなす。
export const matchesQuery = (text: string, q: string): boolean => {
  const groups = queryTokens(q);
  if (!groups.length) return true;
  return groups.some((ws) => ws.every((w) => text.includes(w)));
};

// 緩い一致: どれか1語でも含めば一致。全語一致で 0 件になったときの受け皿。
export const matchesQueryLoose = (text: string, q: string): boolean => {
  const groups = queryTokens(q);
  if (!groups.length) return true;
  return groups.some((ws) => ws.some((w) => text.includes(w)));
};

// 一覧に対する絞り込み。まず全語一致で試し、1件も無ければどれか1語一致に緩める。
// 「docker compose」のように、複合語の片方しか本文に無い検索を空振りさせないため。
export const filterByQuery = (texts: string[], q: string): boolean[] => {
  const strict = texts.map((t) => matchesQuery(t, q));
  if (strict.some(Boolean)) return strict;
  return texts.map((t) => matchesQueryLoose(t, q));
};

// Pagefind の processTerm 用: 1語をカノニカル表記へ
export const canonicalTerm = (term: string): string => {
  const n = normalizeText(term);
  return ALIASES[term] ?? ALIASES[n] ?? Object.entries(ALIASES).find(([ja]) => normalizeText(ja) === n)?.[1] ?? term;
};
