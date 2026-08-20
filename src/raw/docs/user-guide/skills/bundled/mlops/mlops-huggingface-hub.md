---
title: "Huggingface Hub — HuggingFace の hf CLI でモデルやデータセットを検索・取得・アップロードする"
description: "HuggingFace の hf CLI でモデルやデータセットを検索・取得・アップロードする"
upstream_path: user-guide/skills/bundled/mlops/mlops-huggingface-hub.md
upstream_blob: 6e8f804079b072ee616e3ed6c405cd0f7d4b7edf
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/mlops/mlops-huggingface-hub
---

# Huggingface Hub {#huggingface-hub}

HuggingFace の hf CLI でモデルやデータセットを検索・取得・アップロードします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/mlops/huggingface-hub` |
| バージョン | `1.0.1` |
| 作者 | Hugging Face |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Hugging Face CLI（`hf`）早見表 {#hugging-face-cli-hf-reference-guide}

`hf` コマンドは、Hugging Face Hub をコマンドラインから扱うための新しいインターフェースです。リポジトリ・モデル・データセット・Spaces を管理できます。

> **重要:** `hf` コマンドは、非推奨になった `huggingface-cli` コマンドに代わるものです。

## さっそく使う {#quick-start}
*   **導入:** `curl -LsSf https://hf.co/cli/install.sh | bash -s`
*   **ヘルプ:** `hf --help` を実行すると、使える機能と実例をひととおり確認できます。
*   **認証:** 環境変数 `HF_TOKEN` か `--token` フラグで渡す方法をおすすめします。

---

## 主なコマンド {#core-commands}

### 全般 {#general-operations}
*   `hf download REPO_ID`: Hub からファイルをダウンロードします。
*   `hf upload REPO_ID`: ファイルやフォルダをアップロードします（1 コミットにまとめたいときにおすすめ。大きなディレクトリの再開可能なアップロードにも対応します）。
*   `hf upload-large-folder REPO_ID LOCAL_PATH`: **【非推奨】** — 代わりに `hf upload` を使ってください。
*   `hf sync`: ローカルのディレクトリとバケットの間でファイルを同期します。
*   `hf env` / `hf version`: 実行環境とバージョンの情報を表示します。

### 認証（`hf auth`） {#authentication-hf-auth}
*   `login` / `logout`: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) で発行したトークンでログイン・ログアウトします。
*   `list` / `switch`: 保存した複数のアクセストークンを管理し、切り替えます。
*   `whoami`: いまログインしているアカウントを表示します。

### リポジトリ管理（`hf repos`） {#repository-management-hf-repos}
*   `create` / `delete`: リポジトリを作成する、または完全に削除します。
*   `duplicate`: モデル・データセット・Space を別の ID に複製します。
*   `move`: リポジトリを別の名前空間へ移します。
*   `branch` / `tag`: Git 相当の参照を管理します。
*   `delete-files`: パターンを指定して特定のファイルを削除します。

---

## Hub ならではの操作 {#specialized-hub-interactions}

### データセットとモデル {#datasets-models}
*   **データセット:** `hf datasets list`、`info`、`parquet`（parquet の URL 一覧）。
*   **SQL クエリ:** `hf datasets sql SQL` — データセットの parquet URL に対して、DuckDB 経由で SQL をそのまま実行します。
*   **モデル:** `hf models list` と `info`。
*   **論文:** `hf papers ls` — 日々の論文を表示します。

### ディスカッションとプルリクエスト（`hf discussions`） {#discussions-pull-requests-hf-discussions}
*   Hub への貢献を最初から最後まで扱えます: `list`、`create`、`info`、`comment`、`close`、`reopen`、`rename`。
*   `diff`: PR の変更内容を表示します。
*   `merge`: プルリクエストを取り込みます。

### インフラと計算資源 {#infrastructure-compute}
*   **エンドポイント:** Inference Endpoints をデプロイ・管理します（`deploy`、`pause`、`resume`、`scale-to-zero`、`catalog`）。
*   **ジョブ:** HF のインフラ上で計算処理を走らせます。依存関係をスクリプト内に書いた Python を動かす `hf jobs uv` や、リソースを監視する `stats` があります。
*   **Spaces:** 対話型アプリを管理します。Python ファイルを丸ごと再起動せずに反映する `dev-mode` と `hot-reload` があります。

### ストレージと自動化 {#storage-automation}
*   **バケット:** S3 のようなバケット操作をひととおり行えます（`create`、`cp`、`mv`、`rm`、`sync`）。
*   **キャッシュ:** ローカルの保存領域を管理します。`list`、`prune`（参照されなくなったリビジョンの削除）、`verify`（チェックサムの確認）が使えます。
*   **Webhook:** Hub の webhook を管理して処理を自動化します（`create`、`watch`、`enable` / `disable`）。
*   **コレクション:** Hub の項目をコレクションにまとめます（`add-item`、`update`、`list`）。

---

## 進んだ使い方とコツ {#advanced-usage-tips}

### 全体で使えるフラグ {#global-flags}
*   `--format json`: 自動処理しやすい機械可読の出力にします。
*   `-q` / `--quiet`: 出力を ID だけに絞ります。

### 拡張と skill {#extensions-skills}
*   **拡張:** `hf extensions install REPO_ID` で、GitHub のリポジトリから CLI の機能を追加できます。
*   **skill:** `hf skills add` で AI アシスタントの skill を管理します。
