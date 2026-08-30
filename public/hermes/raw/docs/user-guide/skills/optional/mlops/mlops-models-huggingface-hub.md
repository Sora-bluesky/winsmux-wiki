---
title: "Huggingface Hub — HuggingFace の hf CLI: モデルやデータセットの検索・ダウンロード・アップロード"
description: "HuggingFace の hf CLI: モデルやデータセットの検索・ダウンロード・アップロード"
upstream_path: user-guide/skills/optional/mlops/mlops-models-huggingface-hub.md
upstream_blob: 8f504535f764aacbae4b8ba2b48b61e6daea2b0a
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-models-huggingface-hub
---

# Huggingface Hub {#huggingface-hub}

HuggingFace の hf CLI で、モデルやデータセットを検索・ダウンロード・アップロードします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/mlops/huggingface-hub` で入れます |
| パス | `optional-skills/mlops\models\huggingface-hub` |
| バージョン | `1.0.1` |
| 作者 | Hugging Face |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Hugging Face CLI（`hf`）の早見表 {#hugging-face-cli-hf-reference-guide}

`hf` は Hugging Face Hub をコマンドラインから扱うための新しい入口です。リポジトリ、モデル、データセット、Spaces をこれ一つで管理できます。

> **重要:** `hf` は、すでに非推奨になった `huggingface-cli` に代わるコマンドです。

## すぐ使う {#quick-start}
*   **インストール:** `curl -LsSf https://hf.co/cli/install.sh | bash -s`
*   **ヘルプ:** `hf --help` を実行すると、使える機能と実際の使用例がひととおり表示されます。
*   **認証:** 環境変数 `HF_TOKEN` に入れるか、`--token` フラグで渡す方法をおすすめします。

---

## 主なコマンド {#core-commands}

### 全般 {#general-operations}
*   `hf download REPO_ID`: Hub からファイルをダウンロードします。
*   `hf upload REPO_ID`: ファイルやフォルダをアップロードします（1 回のコミットにまとめたいときはこちら。大きなフォルダを途中から再開しながら送ることもできます）。
*   `hf upload-large-folder REPO_ID LOCAL_PATH`: **[非推奨]** — 代わりに `hf upload` を使ってください。
*   `hf sync`: 手元のディレクトリとバケットの中身をそろえます。
*   `hf env` / `hf version`: 実行環境とバージョンの詳細を表示します。

### 認証（`hf auth`） {#authentication-hf-auth}
*   `login` / `logout`: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) で発行したトークンでログイン・ログアウトします。
*   `list` / `switch`: 保存してある複数のアクセストークンを一覧表示し、切り替えます。
*   `whoami`: いまログインしているアカウントを確認します。

### リポジトリの管理（`hf repos`） {#repository-management-hf-repos}
*   `create` / `delete`: リポジトリを作る、または完全に削除します。
*   `duplicate`: モデル、データセット、Space を別の ID に複製します。
*   `move`: リポジトリを別の名前空間へ移します。
*   `branch` / `tag`: Git のブランチやタグにあたる参照を管理します。
*   `delete-files`: パターンを指定して特定のファイルを削除します。

---

## Hub ごとの個別機能 {#specialized-hub-interactions}

### データセットとモデル {#datasets-models}
*   **データセット:** `hf datasets list`、`info`、`parquet`（parquet の URL 一覧）。
*   **SQL での問い合わせ:** `hf datasets sql SQL` — データセットの parquet URL に対して、DuckDB 経由で SQL をそのまま実行します。
*   **モデル:** `hf models list` と `info`。
*   **論文:** `hf papers ls` — その日の論文を表示します。

### ディスカッションとプルリクエスト（`hf discussions`） {#discussions-pull-requests-hf-discussions}
*   Hub への貢献をひととおり扱えます: `list`、`create`、`info`、`comment`、`close`、`reopen`、`rename`。
*   `diff`: プルリクエストの変更内容を表示します。
*   `merge`: プルリクエストを取り込みます。

### インフラと計算資源 {#infrastructure-compute}
*   **エンドポイント:** 推論エンドポイントを配備・管理します（`deploy`、`pause`、`resume`、`scale-to-zero`、`catalog`）。
*   **ジョブ:** HF 側の計算資源で処理を走らせます。依存関係をスクリプト内に書いた Python を実行する `hf jobs uv` や、資源の使用状況を見る `stats` があります。
*   **Spaces:** 対話型のアプリを管理します。Python ファイルを丸ごと再起動せずに反映する `dev-mode` と `hot-reload` があります。

### ストレージと自動化 {#storage-automation}
*   **バケット:** S3 のようなバケット操作がひととおりできます（`create`、`cp`、`mv`、`rm`、`sync`）。
*   **キャッシュ:** 手元の保存領域を管理します。`list`、`prune`（参照されなくなったリビジョンの削除）、`verify`（チェックサムの照合）があります。
*   **Webhook:** Hub の Webhook を管理して処理を自動化します（`create`、`watch`、`enable` / `disable`）。
*   **コレクション:** Hub の項目をコレクションにまとめます（`add-item`、`update`、`list`）。

---

## さらに使いこなす {#advanced-usage-tips}

### 全体で使えるフラグ {#global-flags}
*   `--format json`: 機械で読める形式で出力します。自動処理に向いています。
*   `-q` / `--quiet`: 出力を ID だけに絞ります。

### 拡張と skill {#extensions-skills}
*   **拡張:** `hf extensions install REPO_ID` を使うと、GitHub のリポジトリから CLI の機能を追加できます。
*   **skill:** `hf skills add` で AI アシスタント向けの skill を管理します。
