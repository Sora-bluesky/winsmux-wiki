---
title: "Sherlock — 400 以上のサービスからユーザー名でアカウントを探す"
description: "400 以上のサービスからユーザー名でアカウントを探す"
upstream_path: user-guide/skills/optional/security/security-sherlock.md
upstream_blob: ad50f1a6eb73ea4ead70bfbf37de4da7ee4593c1
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/security/security-sherlock
---

# Sherlock {#sherlock}

400 以上のソーシャルサービスから、ユーザー名でアカウントを探します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/security/sherlock` で導入します |
| パス | `optional-skills/security/sherlock` |
| バージョン | `1.0.0` |
| 作者 | unmodeled-tyler |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `osint`, `security`, `username`, `social-media`, `reconnaissance` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Sherlock OSINT Username Search {#sherlock-osint-username-search}

[Sherlock Project](https://github.com/sherlock-project/sherlock) を使い、400 以上のソーシャルネットワークから、ユーザー名でアカウントを追跡します。

## 使いどころ {#when-to-use}

- ユーザーが、あるユーザー名に紐づくアカウントを探したいとき。
- ユーザーが、複数のサービスでそのユーザー名が使われていないかを確認したいとき。
- ユーザーが OSINT や偵察調査を行っているとき。
- ユーザーが「このユーザー名はどこに登録されている？」といった質問をするとき。

## 必要なもの {#requirements}

- Sherlock CLI がインストールされていること: `pipx install sherlock-project` または `pip install sherlock-project`
- あるいは Docker が使えること（`docker run -it --rm sherlock/sherlock`）
- ソーシャルプラットフォームへ問い合わせるためのネットワーク接続

## 手順 {#procedure}

### 1. Sherlock がインストールされているか確認する {#1-check-if-sherlock-is-installed}

**他の何よりも先に**、sherlock が使えることを確認します。

```bash
sherlock --version
```

コマンドが失敗した場合:
- インストールを提案します: `pipx install sherlock-project`（推奨）または `pip install sherlock-project`
- **複数のインストール方法を試さないでください** — どれか 1 つを選んで進めます。
- インストールに失敗したら、ユーザーに伝えて中止します。

### 2. ユーザー名を取り出す {#2-extract-username}

**ユーザーのメッセージにはっきり書かれていれば、そのままユーザー名を取り出します。**

clarify を **使うべきでない** 例:
- 「nasa のアカウントを探して」→ ユーザー名は `nasa`
- 「johndoe123 を検索して」→ ユーザー名は `johndoe123`
- 「alice がソーシャルメディアにいるか確認して」→ ユーザー名は `alice`
- 「ソーシャルネットワークでユーザー bob を調べて」→ ユーザー名は `bob`

**clarify を使うのは次の場合だけです:**
- 候補となるユーザー名が複数挙げられている（「alice か bob を検索して」）
- 表現があいまい（ユーザー名を指定せずに「私のユーザー名を検索して」）
- ユーザー名がまったく挙げられていない（「OSINT 検索をして」）

取り出すときは、書かれた **とおり** のユーザー名を使います。大文字・小文字、数字、アンダースコアなどをそのまま保ちます。

### 3. コマンドを組み立てる {#3-build-command}

**既定のコマンド**（ユーザーから特に指定がなければこれを使います）:
```bash
sherlock --print-found --no-color "<username>" --timeout 90
```

**任意のフラグ**（ユーザーが明示的に求めた場合のみ追加します）:
- `--nsfw` — NSFW サイトを含めます（ユーザーが求めた場合のみ）
- `--tor` — Tor 経由でルーティングします（ユーザーが匿名性を求めた場合のみ）

**clarify でオプションについて尋ねないでください** — そのまま既定の検索を実行します。必要ならユーザーが個別のオプションを求められます。

### 4. 検索を実行する {#4-execute-search}

`terminal` ツールで実行します。このコマンドは、ネットワークの状態やサイト数にもよりますが、通常 30〜120 秒かかります。

**terminal 呼び出しの例:**
```json
{
  "command": "sherlock --print-found --no-color \"target_username\"",
  "timeout": 180
}
```

### 5. 結果を解析して提示する {#5-parse-and-present-results}

Sherlock は見つかったアカウントを簡単な形式で出力します。出力を解析して、次を提示します。

1. **要約行:** 「ユーザー名 'Y' のアカウントを X 件見つけました」
2. **分類したリンク:** 役立つなら、プラットフォームの種類ごと（ソーシャル、ビジネス、フォーラムなど）にまとめます。
3. **出力ファイルの場所:** Sherlock は既定で結果を `<username>.txt` に保存します。

**出力の解析例:**
```
[+] Instagram: https://instagram.com/username
[+] Twitter: https://twitter.com/username
[+] GitHub: https://github.com/username
```

できるだけ、クリックできるリンクとして結果を提示します。

## 落とし穴 {#pitfalls}

### 何も見つからないとき {#no-results-found}
Sherlock がアカウントを 1 つも見つけないことは、正しい結果である場合がよくあります。そのユーザー名が、確認したプラットフォームに登録されていないだけかもしれません。次を提案します。
- つづりや表記ゆれの確認
- `?` ワイルドカードで似たユーザー名を試す: `sherlock "user?name"`
- ユーザーがプライバシー設定をしているか、アカウントを削除している可能性

### タイムアウトの問題 {#timeout-issues}
一部のサイトは遅かったり、自動化されたリクエストをブロックしたりします。`--timeout 120` で待ち時間を延ばすか、`--site` で範囲を絞ります。

### Tor の設定 {#tor-configuration}
`--tor` は Tor デーモンの起動が必要です。ユーザーが匿名性を望んでいるのに Tor が使えない場合は、次を提案します。
- Tor サービスのインストール
- `--proxy` で代わりのプロキシを使う

### 誤検出 {#false-positives}
一部のサイトは、そのレスポンス構造のせいで常に「見つかった」を返します。予想外の結果は、手動での確認と突き合わせます。

### レート制限 {#rate-limiting}
検索が激しいと、レート制限にかかることがあります。多数のユーザー名をまとめて検索するときは、呼び出しのあいだに間隔を空けるか、キャッシュ済みデータを使う `--local` を利用します。

## 導入 {#installation}

### pipx（推奨） {#pipx-recommended}
```bash
pipx install sherlock-project
```

### pip {#pip}
```bash
pip install sherlock-project
```

### Docker {#docker}
```bash
docker pull sherlock/sherlock
docker run -it --rm sherlock/sherlock <username>
```

### Linux パッケージ {#linux-packages}
Debian 13 以降、Ubuntu 22.10 以降、Homebrew、Kali、BlackArch で利用できます。

## 倫理的な利用 {#ethical-use}

このツールは、正当な OSINT や調査の目的にのみ使うものです。ユーザーに次を伝えます。
- 自分が所有しているか、調査の許可を得ているユーザー名だけを検索すること
- プラットフォームの利用規約を尊重すること
- 嫌がらせ、ストーキング、違法な行為に使わないこと
- 結果を共有する前に、プライバシーへの影響を考えること

## 検証 {#verification}

sherlock を実行したあと、次を確認します。
1. 出力に、見つかったサイトが URL 付きで並んでいること
2. `<username>.txt` ファイルが作成されていること（ファイル出力を使った場合の既定）
3. `--print-found` を使った場合、出力に含まれるのは一致した `[+]` 行だけであること

## やり取りの例 {#example-interaction}

**ユーザー:** 「ユーザー名 'johndoe123' がソーシャルメディアにあるか確認してくれる？」

**エージェントの手順:**
1. `sherlock --version` を確認する（インストール済みか確かめる）
2. ユーザー名が示されている — そのまま進める
3. 実行: `sherlock --print-found --no-color "johndoe123" --timeout 90`
4. 出力を解析してリンクを提示する

**レスポンスの形式:**
> ユーザー名 'johndoe123' のアカウントを 12 件見つけました:
>
> • https://twitter.com/johndoe123
> • https://github.com/johndoe123
> • https://instagram.com/johndoe123
> • [... 追加のリンク]
>
> 結果の保存先: johndoe123.txt

---

**ユーザー:** 「ユーザー名 'alice' を、NSFW サイトも含めて検索して」

**エージェントの手順:**
1. sherlock がインストール済みか確認する
2. ユーザー名と NSFW フラグの両方が示されている
3. 実行: `sherlock --print-found --no-color --nsfw "alice" --timeout 90`
4. 結果を提示する
