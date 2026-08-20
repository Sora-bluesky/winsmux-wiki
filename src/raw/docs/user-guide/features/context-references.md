---
title: "コンテキスト参照"
description: "@ 記法をメッセージ中に書いて、ファイル・フォルダ・git の差分・URL をそのまま添付します"
upstream_path: user-guide/features/context-references.md
upstream_blob: b43c3e3b1cafb952482d51c9b3103cdf858a2d40
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/context-references
---

# コンテキスト参照 {#context-references}

`@` に続けて参照を書くと、その中身がメッセージに直接差し込まれます。Hermes は参照をその場で展開し、`--- Attached Context ---` という節の下に内容を付け加えます。

## 使える参照 {#supported-references}

| 書き方 | 説明 |
|--------|-------------|
| `@file:path/to/file.py` | ファイルの中身を差し込みます |
| `@file:path/to/file.py:10-25` | 指定した行の範囲だけを差し込みます（1 始まり、両端を含む） |
| `@folder:path/to/dir` | ディレクトリのツリーとファイル情報を差し込みます |
| `@diff` | `git diff`（作業ツリーの未ステージの変更）を差し込みます |
| `@staged` | `git diff --staged`（ステージ済みの変更）を差し込みます |
| `@git:5` | 直近 N 件のコミットをパッチ付きで差し込みます（最大 10 件） |
| `@url:https://example.com` | ウェブページの内容を取得して差し込みます |

## 使い方の例 {#usage-examples}

```text
Review @file:src/main.py and suggest improvements

What changed? @diff

Compare @file:old_config.yaml and @file:new_config.yaml

What's in @folder:src/components?

Summarize this article @url:https://arxiv.org/abs/2301.00001
```

1 つのメッセージに複数の参照を書けます。

```text
Check @file:main.py, and also @file:test.py.
```

参照の値の末尾に付いた記号（`,`、`.`、`;`、`!`、`?`）は自動で取り除かれます。

## CLI の入力補完 {#cli-tab-completion}

対話型の CLI では、`@` を入力すると補完が始まります。

- `@` だけで、参照の種類（`@diff`、`@staged`、`@file:`、`@folder:`、`@git:`、`@url:`）が一覧で出ます
- `@file:` と `@folder:` では、ファイルサイズ付きでパスの補完が出ます
- `@` に続けて文字を打つと、カレントディレクトリの中で一致するファイルとフォルダが出ます

## 行の範囲 {#line-ranges}

`@file:` の参照では、必要な部分だけを差し込むために行の範囲を指定できます。

```text
@file:src/main.py:42        # Single line 42
@file:src/main.py:10-25     # Lines 10 through 25 (inclusive)
```

行番号は 1 始まりです。範囲の指定が正しくない場合は、警告を出さずに無視されます（ファイル全体が返ります）。

## 大きさの上限 {#size-limits}

コンテキスト参照には上限があり、モデルのコンテキストウィンドウを埋め尽くさないようになっています。

| しきい値 | 値 | 動作 |
|-----------|-------|----------|
| ソフトリミット | コンテキスト長の 25% | 警告を付けたうえで展開します |
| ハードリミット | コンテキスト長の 50% | 展開せず、元のメッセージをそのまま渡します |
| フォルダの項目数 | 最大 200 ファイル | 超えた分は `- ...` に置き換えます |
| git のコミット数 | 最大 10 件 | `@git:N` は [1, 10] の範囲に収められます |

## セキュリティ {#security}

### 機微なパスの遮断 {#sensitive-path-blocking}

認証情報が漏れないよう、次のパスは `@file:` の参照から常に遮断されます。

- SSH の鍵と設定: `~/.ssh/id_rsa`、`~/.ssh/id_ed25519`、`~/.ssh/authorized_keys`、`~/.ssh/config`
- シェルの設定ファイル: `~/.bashrc`、`~/.zshrc`、`~/.profile`、`~/.bash_profile`、`~/.zprofile`
- 認証情報のファイル: `~/.netrc`、`~/.pgpass`、`~/.npmrc`、`~/.pypirc`
- Hermes の環境変数ファイル: `$HERMES_HOME/.env`

次のディレクトリは、中のファイルもすべて遮断されます。
- `~/.ssh/`、`~/.aws/`、`~/.gnupg/`、`~/.kube/`、`$HERMES_HOME/skills/.hub/`

### パスのさかのぼり対策 {#path-traversal-protection}

パスはすべて作業ディレクトリを起点に解決されます。許可されたワークスペースの外を指す参照は拒否されます。

### バイナリファイルの判定 {#binary-file-detection}

バイナリファイルは、MIME タイプとヌルバイトの走査で見分けます。テキストとわかっている拡張子（`.py`、`.md`、`.json`、`.yaml`、`.toml`、`.js`、`.ts` など）は MIME による判定を通りません。バイナリファイルは警告とともに拒否されます。

## 使える場所 {#platform-availability}

コンテキスト参照は、主に **CLI 向けの機能** です。対話型の CLI では `@` で入力補完が働き、メッセージがエージェントに送られる前に参照が展開されます。

**メッセージングのプラットフォーム**（Telegram、Discord など）では、`@` の記法はゲートウェイで展開されず、メッセージはそのまま渡されます。ただしエージェント自身は、`read_file`、`search_files`、`web_extract` のツールでファイルを参照できます。

## コンテキストの圧縮との関係 {#interaction-with-context-compression}

会話のコンテキストが圧縮されるとき、展開された参照の内容も要約の対象に含まれます。つまり次のようになります。

- `@file:` で差し込んだ大きなファイルの中身は、コンテキストの使用量に加算されます
- あとで会話が圧縮されると、そのファイルの中身は要約されます（そのままの形では残りません）
- とても大きなファイルでは、行の範囲（`@file:main.py:100-200`）を使って必要な部分だけを差し込むことを検討してください

## よく使う型 {#common-patterns}

```text
# Code review workflow
Review @diff and check for security issues

# Debug with context
This test is failing. Here's the test @file:tests/test_auth.py
and the implementation @file:src/auth.py:50-80

# Project exploration
What does this project do? @folder:src @file:README.md

# Research
Compare the approaches in @url:https://arxiv.org/abs/2301.00001
and @url:https://arxiv.org/abs/2301.00002
```

## エラーの扱い {#error-handling}

参照が正しくない場合は、処理が失敗するのではなく、その場に警告が出ます。

| 状況 | 動作 |
|-----------|----------|
| ファイルが見つからない | 警告: "file not found" |
| バイナリファイル | 警告: "binary files are not supported" |
| フォルダが見つからない | 警告: "folder not found" |
| git のコマンドが失敗 | git の標準エラー出力を添えた警告 |
| URL から内容が取れない | 警告: "no content extracted" |
| 機微なパス | 警告: "path is a sensitive credential file" |
| ワークスペースの外のパス | 警告: "path is outside the allowed workspace" |
