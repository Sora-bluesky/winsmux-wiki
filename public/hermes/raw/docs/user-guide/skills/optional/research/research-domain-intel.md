---
title: "Domain Intel — サブドメイン・SSL 証明書・WHOIS・DNS を受動的に調べる"
description: "サブドメイン・SSL 証明書・WHOIS・DNS を受動的に調べる"
upstream_path: user-guide/skills/optional/research/research-domain-intel.md
upstream_blob: f1d27f6fe505d2a76e2f824e72ef5e0e91bfe817
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/research/research-domain-intel
---

# Domain Intel {#domain-intel}

サブドメイン・SSL 証明書・WHOIS・DNS を受動的に調べます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | オプション — `hermes skills install official/research/domain-intel` で導入します |
| パス | `optional-skills/research\domain-intel` |
| バージョン | `1.0.0` |
| 作者 | FurkanL0, Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Domains`, `OSINT`, `DNS`, `Research` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこの内容を指示として見ています。
:::

# Domain Intelligence — 受動的な OSINT {#domain-intelligence-passive-osint}

Python の標準ライブラリだけでドメインを受動的に調べます。
**依存パッケージなし。API キーなし。Linux・macOS・Windows で動きます。**

## 補助スクリプト {#helper-script}

この skill には `scripts/domain_intel.py` が入っています。ドメイン調査の操作をひととおりまかなえる CLI ツールです。

```bash
# Subdomain discovery via Certificate Transparency logs
python SKILL_DIR/scripts/domain_intel.py subdomains example.com

# SSL certificate inspection (expiry, cipher, SANs, issuer)
python SKILL_DIR/scripts/domain_intel.py ssl example.com

# WHOIS lookup (registrar, dates, name servers — 100+ TLDs)
python SKILL_DIR/scripts/domain_intel.py whois example.com

# DNS records (A, AAAA, MX, NS, TXT, CNAME)
python SKILL_DIR/scripts/domain_intel.py dns example.com

# Domain availability check (passive: DNS + WHOIS + SSL signals)
python SKILL_DIR/scripts/domain_intel.py available coolstartup.io

# Bulk analysis — multiple domains, multiple checks in parallel
python SKILL_DIR/scripts/domain_intel.py bulk example.com github.com google.com
python SKILL_DIR/scripts/domain_intel.py bulk example.com github.com --checks ssl,dns
```

`SKILL_DIR` は、この SKILL.md が置かれているディレクトリです。出力はすべて構造化された JSON です。

## 使えるコマンド {#available-commands}

| コマンド | 何をするか | データの取得元 |
|---------|-------------|-------------|
| `subdomains` | 証明書のログからサブドメインを探す | crt.sh（HTTPS） |
| `ssl` | TLS 証明書の詳細を調べる | 対象の TCP:443 へ直接接続 |
| `whois` | 登録情報・登録事業者・各種の日付 | WHOIS サーバー（TCP:43） |
| `dns` | A・AAAA・MX・NS・TXT・CNAME レコード | システムの DNS と Google DoH |
| `available` | ドメインが登録済みかを調べる | DNS・WHOIS・SSL のシグナル |
| `bulk` | 複数のドメインに複数の検査をまとめて実行 | 上記すべて |

## 組み込みツールとの使い分け {#when-to-use-this-vs-built-in-tools}

- インフラまわりの疑問（サブドメイン・SSL 証明書・WHOIS・DNS レコード・空き状況）には **この skill** を使います
- そのドメインや会社が何をしているかを広く調べるなら **`web_search`** を使います
- ページの中身そのものを取りたいなら **`web_extract`** を使います
- 「この URL につながるか」を手早く見たいだけなら **`terminal` で `curl -I`** を使います

| やりたいこと | 向いているツール | 理由 |
|------|-------------|-----|
| 「example.com は何をしているサイト?」 | `web_extract` | DNS/WHOIS ではなくページの中身が取れる |
| 「ある会社の情報を調べたい」 | `web_search` | ドメイン限定ではない一般的な調査向き |
| 「このサイトは安全?」 | `web_search` | 評判の確認には Web 上の文脈が要る |
| 「URL につながるか確かめたい」 | `terminal` で `curl -I` | 単純な HTTP の確認 |
| 「X のサブドメインを探したい」 | **この skill** | 受動的に調べられる手段はこれだけ |
| 「SSL 証明書はいつ切れる?」 | **この skill** | 組み込みツールでは TLS を覗けない |
| 「このドメインの登録者は誰?」 | **この skill** | WHOIS の情報は Web 検索では出てこない |
| 「coolstartup.io は空いている?」 | **この skill** | DNS+WHOIS+SSL による受動的な空き確認 |

## 動作環境 {#platform-compatibility}

Python の標準ライブラリだけで動きます（`socket`、`ssl`、`urllib`、`json`、`concurrent.futures`）。
Linux・macOS・Windows のいずれでも、追加の依存なしに同じように動きます。

- **crt.sh への問い合わせ**は HTTPS（ポート 443）を使うので、たいていのファイアウォールの内側でも通ります
- **WHOIS への問い合わせ**は TCP のポート 43 を使うため、制限の厳しいネットワークでは塞がれていることがあります
- **DNS の問い合わせ**は MX/NS/TXT に Google DoH（HTTPS）を使うので、ファイアウォールと相性がよいです
- **SSL の確認**は対象のポート 443 へ接続します。ここだけが唯一の「能動的な」操作です

## データの取得元 {#data-sources}

問い合わせはすべて**受動的**です。ポートスキャンも脆弱性検査もしません。

- **crt.sh** — Certificate Transparency のログ（サブドメインの発見、HTTPS のみ）
- **WHOIS サーバー** — 100 を超える TLD の権威ある登録事業者へ TCP で直接接続
- **Google DNS-over-HTTPS** — MX・NS・TXT・CNAME の解決（ファイアウォールと相性がよい）
- **システムの DNS** — A/AAAA レコードの解決
- **SSL の確認**だけが唯一の「能動的な」操作です（対象の 443 番への TCP 接続）

## 補足 {#notes}

- WHOIS の問い合わせは TCP のポート 43 を使うため、制限の厳しいネットワークでは塞がれていることがあります
- WHOIS サーバーによっては登録者情報を伏せています（GDPR）。その旨を利用者に伝えてください
- crt.sh は人気のあるドメインだと時間がかかることがあります（証明書が何千件もあるため）。待ち時間の見込みを伝えてください
- 空き状況の確認は 3 つの受動的なシグナルにもとづく推定です。登録事業者の API のように確定的ではありません

---

*Contributed by [@FurkanL0](https://github.com/FurkanL0)*
