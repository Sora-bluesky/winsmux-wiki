---
title: "Apple Notes — memo CLI で Apple メモを操作する: 作成・検索・編集"
description: "memo CLI で Apple メモを操作する: 作成・検索・編集"
upstream_path: user-guide/skills/bundled/apple/apple-apple-notes.md
upstream_blob: ac3ecdfff6a1d58df78ef3c4a71b804bf2053f68
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/apple/apple-apple-notes
---

# Apple Notes {#apple-notes}

memo CLI で Apple メモを操作します。作成・検索・編集ができます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/apple/apple-notes` |
| バージョン | `1.0.1` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | macos |
| タグ | `Notes`, `Apple`, `macOS`, `note-taking` |
| 関連 skill | [`obsidian`](/hermes/docs/user-guide/skills/bundled/note-taking/note-taking-obsidian/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Apple Notes {#apple-notes}

`memo` を使うと、ターミナルから Apple メモを直接操作できます。メモは iCloud 経由ですべての Apple 製端末に同期されます。

## 事前に必要なもの {#prerequisites}

- **macOS** とメモ.app
- インストール: `brew tap antoniorodr/memo && brew install antoniorodr/memo/memo`
- 確認を求められたら、メモ.app へのオートメーション権限を許可してください（システム設定 → プライバシー → オートメーション）

## こんなときに使います {#when-to-use}

- Apple メモの作成・表示・検索を頼まれたとき
- 端末をまたいで読めるように、メモ.app へ情報を保存したいとき
- メモをフォルダに整理したいとき
- メモを Markdown / HTML に書き出したいとき

## 使わないほうがよい場面 {#when-not-to-use}

- Obsidian の保管庫を扱う場合 → `obsidian` skill を使ってください
- Bear Notes → 別のアプリなので、ここでは扱えません
- エージェント内部だけで使う短いメモ → 代わりに `memory` ツールを使ってください

## 早見表 {#quick-reference}

### メモを見る {#view-notes}

```bash
memo notes                        # List all notes
memo notes -f "Folder Name"       # Filter by folder
memo notes -s "query"             # Search notes (fuzzy)
```

### メモを作る {#create-notes}

```bash
memo notes -a                     # Add a note (opens your $EDITOR)
memo notes -a -f "Folder Name"    # Add a note into a specific folder
```

`-a`/`--add` は値を取らないフラグです。実行すると `$EDITOR` が開いて本文を書く形になり、タイトルを引数として渡すことはできません。フォルダを指定したいときは `-f/--folder` を使います。先に `$EDITOR` を設定しておいてください（例: `export EDITOR=vim`）。

### メモを編集する {#edit-notes}

```bash
memo notes -e                     # Interactive selection to edit
```

### メモを削除する {#delete-notes}

```bash
memo notes -d                     # Interactive selection to delete
```

### メモを移動する {#move-notes}

```bash
memo notes -m                     # Move note to folder (interactive)
```

### メモを書き出す {#export-notes}

```bash
memo notes -ex                    # Export to HTML/Markdown
```

## 制限 {#limitations}

- 画像や添付ファイルを含むメモは編集できません
- 対話的な選択画面が出るため、ターミナルを操作できる状態が必要です（必要なら pty=true を使ってください）
- macOS 専用です。Apple のメモ.app が必要です

## ルール {#rules}

1. iPhone / iPad / Mac のあいだで同期したいと言われたら、Apple メモを優先します
2. 同期の必要がないエージェント内部のメモには `memory` ツールを使います
3. Markdown をそのまま扱う知識管理には `obsidian` skill を使います
