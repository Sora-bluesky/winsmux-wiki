# 逆引き（/hermes/howto/）が、実際に検索されている語で引けるかを機械的に監査する。
#
# 1. Serper の autocomplete で Google サジェストを大量採取（seed x 派生 の2階層）
# 2. 採取した語を、ページと同じ照合ロジック（expandQuery 相当）で逆引きに当てる
# 3. 0 件になる語を「穴」として一覧化する
#
# 既定では **API を叩かない**。前回採取したサジェスト（data/wiki/suggest-cache.json）で判定し直すだけ。
# サジェストは日々ほとんど変わらないのに、1回の採取で 225 クレジット使う。照合ロジックを直すたびに
# 取り直して 2026-09-01 に無料枠 2,500 の 2/3 を溶かした。取り直しは明示的に指示したときだけ。
#
# 判定だけやり直す（無料）:  python scripts/suggest-audit.py
# サジェストを採り直す（225クレジット）:
#   $env:SERPER_API_KEY='op://AI-Provider-Keys/Serper - personal dev API key/credential'
#   op run -- python scripts/suggest-audit.py --refresh
import json, os, re, sys, time, unicodedata, urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REFRESH = "--refresh" in sys.argv
CACHE = None  # 後で ROOT 確定後に設定
KEY = os.environ.get("SERPER_API_KEY")

SEEDS = [
    "hermes agent", "hermes agent 使い方", "hermes agent 設定", "hermes agent エラー",
    "hermes agent インストール", "hermes agent windows", "hermes agent mac",
    "hermes agent 日本語", "hermes agent スキル", "hermes agent メモリ",
    "hermes agent モデル", "hermes agent 料金", "hermes agent telegram",
    "hermes agent discord", "hermes agent cron", "hermes agent mcp",
    "hermes agent docker", "hermes agent vps", "hermes agent ollama",
    "hermes agent desktop", "hermes agent gateway", "hermes agent 動かない",
    "hermes agent できない", "hermes agent とは", "hermes エージェント",
]
# サジェストの枝を増やす接尾。あいうえお順の総当たりまではやらない（枠を食うため）
TAILS = ["", " 方法", " できない", " 動かない", " おすすめ", " 比較", " 無料", " 手順", " とは"]


def suggest(q):
    body = json.dumps({"q": q, "gl": "jp", "hl": "ja"}).encode()
    r = urllib.request.Request("https://google.serper.dev/autocomplete", body,
                               {"X-API-KEY": KEY, "Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=30) as f:
        return [s["value"] for s in json.load(f).get("suggestions", [])]


def norm(s):
    return unicodedata.normalize("NFKC", s).lower()


def load_wiki():
    with open(os.path.join(ROOT, "data/wiki/howto.json"), encoding="utf-8") as f:
        d = json.load(f)
    # ページと同じ data-want を再現する
    rows = []
    for i in d["items"]:
        want = f"{i['want']} {i['note']} " + " ".join(l["title"] for l in i["links"]) + " " + " ".join(i.get("tags", []))
        rows.append(norm(want))
    # 表記ゆれ辞書を TS から読む
    ts = open(os.path.join(ROOT, "src/lib/search-aliases.ts"), encoding="utf-8").read()
    body = ts.split("ALIASES: Record<string, string> = {", 1)[1].split("};", 1)[0]
    aliases = dict(re.findall(r"\s*([^\s:]+)\s*:\s*'([^']*)'", body))
    return rows, aliases


def expand(q, aliases):
    n = norm(q.strip())
    if not n:
        return []
    out = [n]
    for ja, canon in aliases.items():
        j = norm(ja)
        if j in n:
            out.append(n.replace(j, canon))
    return list(dict.fromkeys(out))


STOP = {"hermes", "agent", "hermesagent", "エージェント", "ヘルメス", "の", "を", "に", "で", "は", "が",
        "方法", "やり方", "手順", "とは", "できない", "できる"}


def hits(q, rows, aliases):
    # ページ側 matchesQuery と同じ判定: 変換候補ごとに語へ割り、共通語を落として全部含むか
    groups = []
    for v in expand(q, aliases):
        ws = [w for w in re.split(r"[\s　]+", v) if w and w not in STOP]
        if ws:
            groups.append(ws)
    if not groups:
        return len(rows)
    strict = sum(1 for t in rows if any(all(w in t for w in ws) for ws in groups))
    if strict:
        return strict
    # ページ側と同じ緩和: 全語一致で 0 件ならどれか1語一致に落とす
    return sum(1 for t in rows if any(any(w in t for w in ws) for ws in groups))


# --- 1) サジェストを用意する（既定はキャッシュ・--refresh のときだけ採取） ---
CACHE = os.path.join(ROOT, "data/wiki/suggest-cache.json")
if REFRESH:
    if not KEY:
        sys.exit("--refresh には SERPER_API_KEY が要ります")
    seen, queries = set(), []
    calls = 0
    for seed in SEEDS:
        for tail in TAILS:
            q = seed + tail
            try:
                for s in suggest(q):
                    k = norm(s)
                    if k not in seen:
                        seen.add(k)
                        queries.append(s.strip())
                calls += 1
            except Exception as e:
                print("ERR", q, repr(e)[:60], file=sys.stderr)
            time.sleep(0.15)
    queries = [q for q in queries if "hermes" in norm(q) or "エージェント" in q]
    with open(CACHE, "w", encoding="utf-8") as f:
        json.dump({"fetched_at": time.strftime("%Y-%m-%dT%H:%M:%S+09:00"),
                   "calls": calls, "queries": queries}, f, ensure_ascii=False, indent=1)
    print(f"# サジェスト採取: {len(queries)} 語 / API 呼び出し {calls} 回（消費クレジット ≒ {calls}）")
else:
    if not os.path.exists(CACHE):
        sys.exit("キャッシュがありません。最初の1回だけ --refresh を付けて実行してください")
    c = json.load(open(CACHE, encoding="utf-8"))
    queries = c["queries"]
    print(f"# キャッシュを使用（採取 {c['fetched_at'][:10]}・{len(queries)} 語・API 呼び出し 0 回）")

# --- 2) 逆引きに当てる ---
rows, aliases = load_wiki()
res = [(q, hits(q, rows, aliases)) for q in queries]
zero = [q for q, n in res if n == 0]
print(f"# 逆引きで 0 件: {len(zero)} / {len(res)}")

out = os.path.join(ROOT, "data/wiki/suggest-audit.json")
with open(out, "w", encoding="utf-8", newline="\n") as f:
    json.dump({"checked_at": time.strftime("%Y-%m-%dT%H:%M:%S+09:00"),
               "total": len(res), "zero": len(zero),
               "queries": [{"q": q, "hits": n} for q, n in sorted(res, key=lambda x: (x[1], x[0]))]},
              f, ensure_ascii=False, indent=1)
print(f"# 保存: {out}")
print("\n# 引けない語（先頭60件）")
for q in zero[:60]:
    print(" ", q)
