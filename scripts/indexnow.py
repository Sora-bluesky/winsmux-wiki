# 更新した URL を IndexNow で通知する。Bing / Yandex / Naver / Seznam / Yep / Amazon が受け取り、
# 1回の送信が全エンジンに共有される（https://www.indexnow.org/faq）。Google は参加していない。
#
# 鍵は秘密ではない。所有証明として public/<key>.txt を誰でも読める場所に置くのが仕様。
# 実行:
#   python scripts/indexnow.py --all                 # サイトマップの全 URL
#   python scripts/indexnow.py <url> [<url> ...]     # 指定した URL だけ
import glob, json, os, re, sys, urllib.request

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
    k = key()
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    urls = sitemap_urls() if "--all" in sys.argv else args
    if not urls:
        raise SystemExit("送る URL がない（--all かURL を指定する）")
    print(f"鍵ファイル: https://{SITE}/{k}.txt")
    submit(urls, k)
