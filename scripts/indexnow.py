# 更新した URL を IndexNow で通知する。Bing / Yandex / Naver / Seznam / Yep / Amazon が受け取り、
# 1回の送信が全エンジンに共有される（https://www.indexnow.org/faq）。Google は参加していない。
#
# 鍵は秘密ではない。所有証明として public/<key>.txt を誰でも読める場所に置くのが仕様。
# 実行:
#   python scripts/indexnow.py --changed             # 前回のビルドから中身が変わったページだけ（既定の運用）
#   python scripts/indexnow.py --all                 # サイトマップの全 URL（初回・作り直しのとき）
#   python scripts/indexnow.py <url> [<url> ...]     # 指定した URL だけ
#   python scripts/indexnow.py --changed --seed      # 送らずに現状を記録するだけ
import glob, hashlib, json, os, re, sys, urllib.request

SITE = "wiki.winsmux.dev"
ENDPOINT = "https://api.indexnow.org/indexnow"
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def key():
    # public/ に置いた鍵ファイル名そのものが鍵。定数を二重に持たない
    for p in glob.glob(os.path.join(HERE, "public", "*.txt")):
        name = os.path.basename(p)[:-4]
        if re.fullmatch(r"[0-9a-f]{8,128}", name):
            return name
    raise SystemExit("public/ に IndexNow の鍵ファイルがない")


def sitemap_urls():
    def get(u):
        r = urllib.request.Request(u, headers={"User-Agent": "winsmux-indexnow"})
        with urllib.request.urlopen(r, timeout=30) as f:
            return f.read().decode("utf-8")
    idx = get(f"https://{SITE}/sitemap-index.xml")
    out = []
    for sm in re.findall(r"<loc>([^<]+)</loc>", idx):
        out += re.findall(r"<loc>([^<]+)</loc>", get(sm))
    return out


STATE = os.path.join(HERE, ".indexnow-state.json")


def dist_pages():
    """dist の実 HTML から URL とその中身のハッシュを作る。

    変更判定をソースのパスからの推測でやらない。データ駆動のページは元ファイルと URL が
    1対1にならず、推測すると送り漏れと送りすぎの両方が出る。出力を直接見れば迷いがない。
    サイトマップに載っている URL だけに絞るので、canonical でないルート等は自然に外れる。
    """
    dist = os.path.join(HERE, "dist")
    smap = os.path.join(dist, "sitemap-0.xml")
    if not os.path.isdir(dist) or not os.path.exists(smap):
        raise SystemExit("dist が無い。先に npm run build を実行する")
    with open(smap, encoding="utf-8") as f:
        allowed = set(re.findall(r"<loc>([^<]+)</loc>", f.read()))
    out = {}
    for path in glob.glob(os.path.join(dist, "**", "index.html"), recursive=True):
        rel = os.path.relpath(path, dist).replace(os.sep, "/")[: -len("index.html")]
        url = f"https://{SITE}/" + rel
        if url not in allowed:
            continue
        with open(path, "rb") as f:
            out[url] = hashlib.sha1(f.read()).hexdigest()
    return out


def changed_urls():
    cur = dist_pages()
    try:
        with open(STATE, encoding="utf-8") as f:
            prev = json.load(f).get("pages", {})
    except Exception:
        prev = {}
    return [u for u, h in sorted(cur.items()) if prev.get(u) != h], cur


def save_state(pages):
    tmp = STATE + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline=chr(10)) as f:
        json.dump({"pages": pages}, f, ensure_ascii=False, indent=1)
    os.replace(tmp, STATE)


def submit(urls, k):
    # 1回 10,000 URL まで。それ以上は分割する
    for i in range(0, len(urls), 10000):
        chunk = urls[i:i + 10000]
        body = json.dumps({"host": SITE, "key": k, "urlList": chunk}).encode()
        r = urllib.request.Request(ENDPOINT, body, {"Content-Type": "application/json; charset=utf-8"})
        try:
            with urllib.request.urlopen(r, timeout=60) as f:
                print(f"{f.status} {len(chunk)} URL を送信")
        except urllib.error.HTTPError as e:
            # 400=形式 / 403=鍵が読めない / 422=host と URL の不一致 / 429=送りすぎ
            print(f"{e.code} {e.reason}: {e.read()[:200].decode('utf-8', 'replace')}")
            raise SystemExit(1)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--changed" in sys.argv:
        urls, cur = changed_urls()
        if "--seed" in sys.argv:
            save_state(cur)
            print(f"{len(cur)} ページの状態を記録した（送信はしない）")
            raise SystemExit(0)
        if not urls:
            print("中身が変わったページは無い。送信しない")
            raise SystemExit(0)
        print(f"変更 {len(urls)} ページ:")
        for u in urls[:10]:
            print("  " + u.replace(f"https://{SITE}", ""))
        if len(urls) > 10:
            print(f"  ほか {len(urls) - 10} ページ")
        k = key()
        print(f"鍵ファイル: https://{SITE}/{k}.txt")
        submit(urls, k)
        save_state(cur)   # 送信が通ってから記録する。失敗した分は次回また送る
        raise SystemExit(0)

    urls = sitemap_urls() if "--all" in sys.argv else args
    if not urls:
        raise SystemExit("送る URL がない（--changed / --all / URL のどれかを指定する）")
    k = key()
    print(f"鍵ファイル: https://{SITE}/{k}.txt")
    submit(urls, k)
