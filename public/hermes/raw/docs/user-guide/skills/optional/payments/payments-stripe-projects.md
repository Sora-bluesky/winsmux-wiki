---
title: "Stripe Projects — Stripe Projects で SaaS を用意し、認証情報を同期する"
description: "Stripe Projects で SaaS を用意し、認証情報を同期する"
upstream_path: user-guide/skills/optional/payments/payments-stripe-projects.md
upstream_blob: 7f2b60032cca601c74299666d5499f3b53c6fab7
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/payments/payments-stripe-projects
---

# Stripe Projects {#stripe-projects}

Stripe Projects で SaaS を用意し、認証情報を同期します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/payments/stripe-projects` で入れます |
| パス | `optional-skills/payments\stripe-projects` |
| バージョン | `0.1.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos |
| タグ | `Payments`, `Stripe`, `Projects`, `Provisioning`, `Infrastructure` |
| 関連 skill | [`stripe-link-cli`](/hermes/docs/user-guide/skills/optional/payments/payments-stripe-link-cli/), [`mpp-agent`](/hermes/docs/user-guide/skills/optional/payments/payments-mpp-agent/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Stripe Projects Skill {#stripe-projects-skill}

[Stripe Projects](https://projects.dev) の CLI プラグインを包んだ skill です。これを通して Hermes は、SaaS（Neon、Twilio、Vercel など）を新しく用意し、認証情報を作ってその人の `.env` に同期し、複数の提供元にまたがる支払いを一か所で管理できます。

支払い系の skill 群が Windows でまだ成熟途中のため、`[linux, macos]` に限定しています。Stripe CLI 自体はどのプラットフォームでも動くので、この制限は skill 群としての方針であって、技術的な限界ではありません。

## 使いどころ {#when-to-use}

きっかけになる言い回し:

- 「&lt;provider> をセットアップして」「&lt;Neon|Twilio|Vercel|...> を用意して」「データベースを作って」
- 「このプロジェクト用に &lt;Postgres|Redis|Twilio の電話番号|...> がほしい」
- 「スタックの認証情報をまとめて管理して」「このキーを入れ替えて」「プランを上げて」
- 「どの提供元を追加できる？」

すでにその提供元のアカウントを持っている場合でも、`stripe projects link <provider>` でつなぐことができます。既存のデータベースや既存の Vercel プロジェクトなど、すでにある資産をそのまま使いたいときは、先に提供元が対応しているか確認してください。多くの提供元は、新しく用意することはできても、既存のものの取り込みには対応していません。

## 事前に必要なもの {#prerequisites}

- Stripe CLI（macOS なら Homebrew、Linux ならパッケージマネージャ、または https://docs.stripe.com/stripe-cli/install からダウンロード）
- Stripe Projects プラグイン
- Stripe アカウント。まだ持っていない場合は、セットアップの途中で CLI がブラウザでのサインインやアカウント作成に案内してくれます。

## 導入 {#install}

macOS:

```
brew install stripe/stripe-cli/stripe
stripe plugin install projects
```

Linux では、まず https://docs.stripe.com/stripe-cli/install のプラットフォーム別手順に従い、そのあとで次を実行します:

```
stripe plugin install projects
```

## 実行のしかた {#how-to-run}

コマンドはすべて、その人のプロジェクトのディレクトリの中から `terminal` ツール経由で実行します（CLI は作業中のディレクトリに `.env` と `.projects/vault/vault.json` を書き込みます）。

## 手順 {#procedure}

### 1. プロジェクトを初期化する {#1-initialize-the-project}

```
cd <project-root>
stripe projects init
```

これで `.projects/vault/vault.json`（暗号化された認証情報の保管庫）ができ、提供元を受け入れる準備が整います。

### 2. 使える提供元を調べる {#2-discover-available-providers}

```
stripe projects catalog
```

Stripe Projects が対応している提供元が一覧で出ます。データベース、ホスティング、認証、AI、分析、メッセージングなど、ひととおり並びます。

### 3. サービスを追加する {#3-add-a-service}

```
stripe projects add <provider>/<service>
```

例:

- `stripe projects add neon/postgres`
- `stripe projects add twilio/sms`
- `stripe projects add runloop/sandbox`

CLI はその人自身の提供元アカウントにサービスを用意し、認証情報を作って `.env` に同期し、保管庫に記録します。途中でプランの選択や料金の確認を求められることがあります。

### 4. 確認する {#4-verify}

```
stripe projects list
```

追加したばかりの提供元と、その `.env` キーが表示されるはずです。

### 5. 管理・プラン変更・削除 {#5-manage-upgrade-remove}

```
stripe projects upgrade <provider>     # tier change
stripe projects remove <provider>      # deprovision
stripe projects rotate <provider>      # rotate credentials
```

## つまずきやすいところ {#pitfalls}

- **`.env` への書き込みは本当に書き込まれます。** CLI はプロジェクト直下にある `.env` にそのまま追記します。`.env` が gitignore されていれば（通常はされています）キーは安全なところに着地しますが、そうでない場合、この skill が認証情報の流出経路になりえます。必ず先に `.gitignore` を確認してください。
- **状態はプロジェクトごとです。** `.projects/vault/vault.json` はプロジェクト単位です。同じサービスを別のプロジェクトで用意すると、別々の資産が2つでき、請求も2つになります。
- **請求は Stripe 側で発生します。** `add`／`upgrade` の途中で出るプラン選択は実際の課金です。確定する前に必ず本人に伝えてください。
- **使える提供元は変わります。** カタログは増えていきます。名前を挙げられた提供元が載っていないときは、`add` を失敗させる前に `stripe projects catalog | grep <name>` で確かめてください。
- **保管庫の認証情報は暗号化されますが、`.env` は平文です。** `.env` の扱いは通常どおりで、コミットは絶対にしないでください。
- **サービスを削除しても、元の資産まで必ず消えるとは限りません。** 提供元によっては、停止状態や休眠状態の資産が残ります。費用の大きいサービス（特にマネージドのデータベース）では、`remove` のあとに提供元自身のダッシュボードを確認してください。

## 動作確認 {#verification}

```
stripe projects --version && stripe projects list
```

初期化済みのプロジェクトの中で終了コードが 0 なら、プラグインは正常です。
