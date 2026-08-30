---
title: "Obsidian — Obsidian の保管庫にあるノートを読む・探す・作る・直す"
description: "Obsidian の保管庫にあるノートを読む・探す・作る・直す"
upstream_path: user-guide/skills/bundled/note-taking/note-taking-obsidian.md
upstream_blob: 34d311f2062cac912e3be794fdf9d520131e3401
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/note-taking/note-taking-obsidian
---

# Obsidian {#obsidian}

Obsidian の保管庫にあるノートを読む・探す・作る・直すための skill です。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/note-taking\obsidian` |
| バージョン | `1.0.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Obsidian`, `Notes`, `Markdown`, `Vault` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Obsidian の保管庫 {#obsidian-vault}

この skill は、Obsidian の保管庫をファイルとして扱う作業に使います。ノートを読む、ノートを一覧する、ノートのファイルを探す、ノートを作る、内容を追記する、ウィキリンクを足す、といった作業です。

## 保管庫のパス {#vault-path}

ファイル系のツールを呼ぶ前に、保管庫のパスが分かっている状態にしておきます。

保管庫のパスは `OBSIDIAN_VAULT_PATH` という環境変数で指定する決まりになっていて、たとえば `${HERMES_HOME:-~/.hermes}/.env` に書きます。設定されていないときは `~/Documents/Obsidian Vault` を使います。

ファイル系のツールはシェルの変数を展開しません。`$OBSIDIAN_VAULT_PATH` を含んだパスを `read_file`、`write_file`、`patch`、`search_files` に渡さないでください。先に保管庫のパスを確定させ、具体的な絶対パスを渡します。保管庫のパスには空白が入ることもあります。これも、シェルのコマンドよりファイル系のツールを選ぶ理由のひとつです。

保管庫のパスが分からない場合は、`OBSIDIAN_VAULT_PATH` を調べたり、既定のパスが存在するかを確かめたりするために `terminal` を使ってもかまいません。パスが分かったら、ファイル系のツールに戻ります。

## ノートを読む {#read-a-note}

確定させた絶対パスを指定して `read_file` を使います。行番号とページ送りが付くので、`cat` よりこちらを選びます。

## ノートを一覧する {#list-notes}

`search_files` に `target: "files"` と保管庫のパスを渡します。`find` や `ls` よりこちらを選びます。

- markdown のノートをすべて出すには、保管庫のパスの下で `pattern: "*.md"` を使います。
- サブフォルダだけを見たいときは、そのサブフォルダの絶対パスの下を探します。

## 探す {#search}

ファイル名を探すときも中身を探すときも `search_files` を使います。`grep`、`find`、`ls` よりこちらを選びます。

- ファイル名で探すときは、`search_files` に `target: "files"` とファイル名の `pattern` を渡します。
- ノートの中身で探すときは、`search_files` に `target: "content"` と、`pattern` として中身の正規表現を渡します。markdown のノートだけに絞りたいときは `file_glob: "*.md"` も付けます。

## ノートを作る {#create-a-note}

確定させた絶対パスと markdown の全文を指定して `write_file` を使います。シェルのヒアドキュメントや `echo` より、こちらを選びます。引用符のややこしさを避けられて、結果も構造のある形で返ってきます。

## ノートに追記する {#append-to-a-note}

不自然にならない範囲で、ファイル系のツールだけで完結させます。

- 対象のノートを `read_file` で読みます。
- 見出しの後ろに節を足す、末尾の決まったブロックの前に足す、といった具合に目印が安定しているときは、`patch` で位置を指定して追記します。
- 壊れやすい patch を組み立てるより、ノート全体を書き直したほうがはっきりする場合は `write_file` を使います。

`patch` で位置を指定して追記するときは、目印の部分を「目印 + 新しい内容」に置き換えます。

目印になるものがなく、ただ末尾に足すだけなら、それがいちばん分かりやすく安全なやり方であるかぎり `terminal` を使ってもかまいません。

## 部分的な書き換え {#targeted-edits}

いまの内容から位置を確実に特定できるなら、ノートの部分的な変更には `patch` を使います。シェルでテキストを書き換えるより、こちらを選びます。

## ウィキリンク {#wikilinks}

Obsidian ではノート同士を `[[Note Name]]` という書き方でつなぎます。ノートを作るときは、これを使って関係する内容へリンクします。
