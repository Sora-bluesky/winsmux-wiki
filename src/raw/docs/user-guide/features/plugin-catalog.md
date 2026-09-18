---
title: "プラグインカタログ"
description: "審査済みで SHA 固定された Hermes のプラグインを、厳選カタログから探して導入する"
upstream_path: user-guide/features/plugin-catalog.md
upstream_blob: 07e8d4bf744216208da5c3979c80665a30fb4c31
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/plugin-catalog
---

# プラグインカタログ {#plugin-catalog}

プラグインカタログは、人の目で審査した Hermes プラグインをまとめた厳選ディレクトリです。
名前を指定するだけで、次のコマンド 1 つで導入できます。

```bash
hermes plugins install <name>
```

見た目で探すなら **[/docs/plugins](https://hermes-agent.nousresearch.com/plugins)** を開いてください。エントリは種類ごとの棚
（Memory、Desktop、Platforms、Web & Browser、Tools、Voice、Automation、Models）に分かれて並び、検索、階層フィルタ
（Official / Community）、機能チップ、そして各エントリの **Install in Hermes** ボタンとコピーできる CLI コマンドがそろっています。

Desktop では **Capabilities → Plugins → Browse** を開くと、アプリ組み込みのカタログ画面が出ます。
Web サイトを埋め込んだものではありません。**Installed** は別のタブで、カタログの情報ではなく、
アプリの Desktop プラグイン登録と、選んでいるプロファイルのエージェントプラグインの状態をもとに表示します。
Skills も同じ **Installed / Browse** の配置です。検索欄は上に固定され、タブの切り替えと操作ボタンは同じ行に並びます。
Browse の既定はカード表示です。フィルタの横にあるリストとカードのアイコンで表示を切り替えられ、
検索とフィルタはそのまま保たれます。選んだ表示は、プラグインとスキルの両方のカタログで記憶されます。

カタログは既存の[プラグインの仕組み](/hermes/docs/user-guide/features/plugins/)を置き換えるものではなく、補うものです。カタログから導入できるものは、
内部的にはすべて普通のプラグインです。カタログはその上に「見つけやすさ」と審査の
層を足しているだけです。

### 公開している一覧データ {#published-browse-data}

Web サイトと Desktop は、生成された同じ CDN スナップショットを読みます:
[`https://hermes-agent.nousresearch.com/docs/api/plugins.json`](https://hermes-agent.nousresearch.com/docs/api/plugins.json)。
Desktop は
`https://nousresearch.github.io/hermes-agent/docs/api/plugins.json` から取得します。公開ドキュメント側の
別名でも同じデータが返ります。ドキュメントのビルドは `plugin-catalog/*.yaml` を読み、
キャッシュしてあるリポジトリのスター数を加えます。導入コマンドが使う、削除済みエントリの一覧もあわせて公開します。
どちらの Browse 画面も、取得元のリポジトリを巡回したり、GitHub API にその場で問い合わせたりはしません。

この一覧用スナップショットは、導入コマンドが使う
[`plugin-catalog.json`](#live-refresh) とは別物です。そちらはカタログ名と固定値を解決するためのものです。

## エントリに書かれていること {#whats-in-an-entry}

カタログの各エントリは、hermes-agent リポジトリの
[`plugin-catalog/`](https://github.com/NousResearch/hermes-agent/tree/main/plugin-catalog)
ディレクトリに置かれた小さな YAML ファイルで、次の内容を宣言します。

| 項目 | 意味 |
|---|---|
| `name` | `hermes plugins install` に渡すカタログ上のキー |
| `repo` | そのプラグインの公開 git リポジトリ |
| `sha` | 審査を受けた**正確な 40 桁の 16 進コミット**。導入時はブランチの先端ではなく、この固定値をチェックアウトします |
| `tier` | `official`（NousResearch が保守）または `community` |
| `category` | 一覧で並ぶ棚: `desktop`（既定）、`memory`、`platform`、`web`、`tools`、`voice`、`automation`、`models`、`general` のいずれか |
| `maintainer` | プラグインの持ち主 |
| `capabilities` | 宣言されたツール、フック、ミドルウェア、必要な環境変数 |
| `requires_hermes` | 必要な Hermes の最低バージョン。例: `>=0.19`（任意） |
| `platforms` | OS の制限。空ならすべて対象（任意） |
| `docs_url` | 外部ドキュメントへのリンク（任意） |
| `version` | 固定した sha に付ける、人が読むためのラベル。例: `"1.4.0"`。CLI、カタログのカード、Desktop の **Update to** ボタンに `1.4.0 @ abcd1234` の形で表示されます（任意。見た目だけのもの） |
| `image` | カタログのカードに出すバナー画像。2:1 で表示されます（1200×600 が合います。ほかの比率は中央で切り抜かれます）。`raw.githubusercontent.com`、`github.com`、`*.githubusercontent.com` 上の `https` URL で指定します（任意）。審査したあとで中身が変わらないよう、エントリのコミットに固定してください（`raw.githubusercontent.com/owner/repo/<sha>/...`） |

## 信頼のしくみ {#trust-model}

カタログは、何を導入しようとしているのかがはっきり分かるように設計されています。

- **人の手でマージされる登録。** すべてのエントリ（および固定値の更新）は、保守担当者が
  レビューしたプルリクエスト経由で入ります。自動でカタログに載るものはありません。
- **厳密な SHA 固定。** エントリはブランチではなく特定のコミットを固定します。プラグインの
  作者が自分のリポジトリに新しいコードを push しても、カタログが導入する内容は**変わりません**。
  固定値を更新するには、もう一度レビュー付きの PR が必要です。
- **受け入れのときに検査し、導入のときは信頼する。** 受け入れの CI は、インストーラーが走らせるのと同じ
  セキュリティ検査を走らせます（`hermes plugins validate` には `security scan` の検査が含まれます）。
  `dangerous` の判定が出たエントリは通りませんし、`caution` の指摘はレビューする人へ一覧で示されます。
  その人がすでに目を通しているので、カタログからの導入で、固定されたちょうどその SHA をチェックアウト
  したときには、`caution` について改めて尋ねることはしません。`dangerous` はそれでも止めますし、
  生の URL から入れたものや別のリビジョンから入れたものには、いつもどおりの問いかけが出ます。
- **機能の宣言。** エントリには、そのプラグインが提供するツール・フック・ミドルウェアと、
  必要な環境変数（API キーなど）が最初から書かれているので、導入前に影響範囲を判断できます。
- **削除リスト。** セキュリティ事故などでカタログから外されたプラグインは、理由と日付を添えて
  `plugin-catalog/removed.yaml` に載ります。インストーラーは削除リストにあるものの導入を拒否します。
- **導入済み ≠ 有効。** カタログのプラグインを導入するとディスク上に置かれるだけです。ほかの
  プラグインと同じで、読み込ませるには有効化が必要です。
  [プラグイン → 有効化と無効化](/hermes/docs/user-guide/features/plugins/)を参照してください。

:::warning カタログの審査はその時点の審査です
カタログにエントリがあるということは、固定されたコミットを人が見て、機能の宣言が確認され、
リポジトリが応募基準を満たした、という意味です。セキュリティ監査ではありませんし、同じ
リポジトリの他のコミットについては何も保証しません。認証情報を渡す相手のコードは、
自分で読んでください。
:::

## カタログから導入する {#installing-from-the-catalog}

Web サイトの **Install in Hermes** は、次の形のプロトコルリンクを開きます。

```text
hermes://plugin/install?repo=owner%2Frepo&catalog_name=example-plugin&sha=0123456789abcdef0123456789abcdef01234567
```

`repo` は `#subdir` も含めて URL エンコードされます。Desktop は確定の前に、取得元、導入先、
構成要素を確認するよう求めます。リンクを開いただけで勝手に導入されることはありません。
エージェントプラグインの部分については、バックエンドが `catalog_name` を審査済みの固定値に解決します。
リンクの `sha` は**表示用の情報にすぎず**、コミットを選んだり上書きしたりする権限はありません。
単体の Desktop プラグインについて、固定値を保証するものでもありません。

カタログ用のパラメーター（と、公開 Skills Hub の新しい `hermes://skill/install?identifier=...` の経路）を使うには、
新しい Desktop のビルドが必要です。古いビルドは、リポジトリだけを指すプラグインのリンクしか理解できないことがあります。
展開したカードには CLI コマンドも残っているので、Desktop が無くてもカタログ名で導入できます。

```bash
# Install a reviewed catalog entry by name (checks out the pinned SHA)
hermes plugins install <name>

# Then enable it, as with any plugin
hermes plugins enable <name>
```

導入時のプロンプトには、クローンが始まる前にそのエントリの機能一覧（宣言されたツール、
フック、必要な環境変数）が表示されます。

カタログでの名前と、プラグイン自身のマニフェストにある名前は違うことがあります。`hermes
plugins install` は入れたあとの名前を表示し、`enable` にはそちらの名前を渡します。
たとえば `touchdesigner` のエントリ（twozero の MCP サーバーと `touchdesigner-mcp` スキルを
ひとまとめにした、持ち運べる Agent Plugins v1 のパッケージ）は `td` という名前で入ります。
名前を短くしてあるのは、そこから作られる MCP ツールの名前が、プロバイダーの関数名の長さの
上限を超えないようにするためです。

```bash
hermes plugins install touchdesigner
hermes plugins enable td
```

持ち運べるパッケージには、stdio の MCP サーバーを入れることもできます。`snyk` のエントリは
Snyk CLI の版を固定し（`npx -y snyk@<version> mcp`）、`snyk-security-scan` スキルを
同梱しています。1 回入れるだけで、Hermes はコード、依存関係、コンテナ、IaC をスキャンできる
ようになり、その使い方の手順も手に入ります。カタログでの名前とマニフェストの名前は同じです。

```bash
hermes plugins install snyk
hermes plugins enable snyk
```

### カタログ経由で入れたものを更新する {#updating-a-catalog-install}

`hermes plugins update <name>` は、カタログ経由で導入したものに対して `git pull` を実行しません。
手元の固定値と現在のカタログの固定値を比べ、カタログ側が（レビュー済みの PR で）動いていた場合に
新しい SHA で強制的に入れ直します。有効・無効の状態はそのまま保たれます。`hermes plugins list` は
カタログ経由の導入を `catalog:<tier>@<sha>` と表示するので、出どころが一目で分かります。

### カタログに無い名前 {#names-not-in-the-catalog}

カタログのエントリに無い名前をそのまま渡すとエラーになります。未審査の名前をまとめた 2 つ目の
索引は存在しません。そうしたプラグインは `owner/repo` か Git の URL を指定して導入するか
（後述のカスタムソース）、カタログに応募してください。

### 最新版の取り込み {#live-refresh}

ドキュメントのビルド時に、カタログは 1 つの JSON ドキュメント
（`https://hermes-agent.nousresearch.com/docs/api/plugin-catalog.json`）として公開されます。
`search` / `install` / `update` はこれを最大 6 時間に 1 回だけ取得し、`~/.hermes/cache/` に
キャッシュします。そのため、新しいエントリや削除は Hermes を更新しなくても手元に届きます。
オフラインのときは、手元のチェックアウトに同梱されたコピーが使われます（取得に失敗したことは
1 分間覚えているので、`plugins list` とダッシュボードの Plugins ページで待たされる接続の
タイムアウトは、入っているプラグインの数だけではなく多くても 1 回です）。ツリー内のリストと
最新のリスト、どちらの削除も常に両方が適用されます。

### カスタムの git URL は別扱いです {#custom-git-urls-are-different}

`hermes plugins install <git-url>` は今までどおりどのリポジトリにも使えますが、カタログを
完全に迂回します。

- **審査がありません** — 手に入るのは審査済みの固定値ではなく、ブランチ先端の内容です。
- コードが未検証であることを示す**警告バナー**が表示されます。
- 削除リストは引き続き参照されます（問題が判明したリポジトリは URL 指定でも拒否されます）。

自分のプラグインや、すでに信頼しているリポジトリには git URL の経路を使ってください。探すときは
カタログを使ってください。

## カタログにプラグインを応募する {#submitting-a-plugin-to-the-catalog}

応募は、`plugin-catalog/<name>.yaml` を 1 つ追加するプルリクエストとして行います。
チェックリストの全文は
[plugin-catalog の README](https://github.com/NousResearch/hermes-agent/tree/main/plugin-catalog)
にあります。要点として、エントリは次を満たす必要があります。

1. **本人による応募** — PR の作成者が、そのプラグインのリポジトリの所有者か保守担当者であること。
   保守担当者が、審査済みの一括収集から community のプラグインをまとめて追加することもあります
   （固定したコミットごとに検証とスキャンを済ませています）。自分のプラグインがそうして追加されていて、
   内容を変えたい、または外したい場合は、そのエントリに対して PR を出してください。
2. **公開リポジトリであること** — `repo` の URL が誰でもクローンできること。
3. **リリース済みであること** — 既定ブランチだけでなく、実際のリリースやタグがあること。
4. **検証を通っていること** — カタログ検証の GitHub Action が PR 上で緑であること
   （スキーマ、SHA の形式、到達性）。
5. **自分で自分を更新しないこと** — カタログに載せるビルドが、自分のファイルをダウンロードして置き換えてはいけません。
   更新の道は固定した SHA だけです（SHA を上げる PR と、`hermes plugins update <name>` の組み合わせ）。

固定値の更新（`sha` を新しいコミットへ上げること）も、同じ PR とレビューの手順を通ります。
利用者に見えるラベルがコードと食い違わないよう、同じ PR で `version` も上げてください。導入済みのプラグインは、
記録している sha を現在の固定値と比べます。`hermes plugins list --json` は `update_available` を返し、
Desktop の Plugins タブには **Update to 1.4.0** ボタンが出て、`hermes plugins update <name>`
を実行すると新しい固定値のコミットがそのまま取り出されます。

## 関連ページ {#see-also}

- [プラグイン](/hermes/docs/user-guide/features/plugins/) — プラグインの仕組みそのもの。マニフェストの書式、有効化、
  設定について
- [同梱プラグイン](/hermes/docs/user-guide/features/built-in-plugins/) — Hermes に最初から入っているプラグイン
- [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) — 自分で書く
- [プラグインカタログのページ](https://hermes-agent.nousresearch.com/plugins) — 一覧を眺められるカタログ
