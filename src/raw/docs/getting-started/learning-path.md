---
title: "学習パス"
description: "'経験の度合いと目的に合わせて、Hermes Agent のドキュメントを読み進める順番を選びます。'"
upstream_path: getting-started/learning-path.md
upstream_blob: 0f6e9d85101cafaa5d88f09e56b6ebc1b10bac70
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/learning-path
---

# 学習パス {#learning-path}

Hermes Agent でできることは幅広く、CLI アシスタント、Telegram / Discord のボット、作業の自動化、RL による学習などが含まれます。このページでは、経験の度合いとやりたいことに応じて、どこから手をつけ、何を読めばよいのかを整理します。

:::tip ここから始めてください
Hermes Agent をまだ導入していない場合は、[インストール手順](/hermes/docs/getting-started/installation/)から進み、続けて[クイックスタート](/hermes/docs/getting-started/quickstart/)を一通り実行してください。以下の内容はすべて、動作するインストールがある前提で書かれています。
:::

:::tip 初回のプロバイダ設定
初めて使う場合は、ほぼ確実に `hermes setup --portal` が適しています。一度の OAuth 認証で、モデルと Tool Gateway の 4 つのツール（検索 / 画像 / TTS / ブラウザ）がまとめて使えるようになります。[Nous Portal](/hermes/docs/integrations/nous-portal/) を参照してください。
:::

## このページの使い方 {#how-to-use-this-page}

- **自分のレベルが分かっている場合** [経験の度合い別の表](#by-experience-level)に進み、該当する段階の読む順番に従ってください。
- **目的がはっきりしている場合** [目的別](#by-use-case)へ飛んで、当てはまるシナリオを探してください。
- **ざっと眺めたい場合** [主な機能](#key-features-at-a-glance)の表で、Hermes Agent にできることの全体像を確認できます。

## 経験の度合い別 {#by-experience-level}

| レベル | 目的 | おすすめの読む順番 | 所要時間の目安 |
|---|---|---|---|
| **初級** | 動く状態にして、基本的な対話をし、組み込みツールを使う | [インストール](/hermes/docs/getting-started/installation/) → [クイックスタート](/hermes/docs/getting-started/quickstart/) → [CLI の使い方](/hermes/docs/user-guide/cli/) → [設定](/hermes/docs/user-guide/configuration/) | 約 1 時間 |
| **中級** | メッセージングのボットを用意し、メモリ・cron ジョブ・スキルといった応用機能を使う | [セッション](/hermes/docs/user-guide/sessions/) → [メッセージング](/hermes/docs/user-guide/messaging/) → [ツール](/hermes/docs/user-guide/features/tools/) → [スキル](/hermes/docs/user-guide/features/skills/) → [メモリ](/hermes/docs/user-guide/features/memory/) → [Cron](/hermes/docs/user-guide/features/cron/) | 約 2〜3 時間 |
| **上級** | 独自ツールを作り、スキルを作成し、RL でモデルを学習させ、プロジェクトに貢献する | [アーキテクチャ](/hermes/docs/developer-guide/architecture/) → [ツールの追加](/hermes/docs/developer-guide/adding-tools/) → [スキルの作成](/hermes/docs/developer-guide/creating-skills/) → [コントリビュート](/hermes/docs/developer-guide/contributing/) | 約 4〜6 時間 |

## 目的別 {#by-use-case}

やりたいことに当てはまるシナリオを選んでください。それぞれ、読むべき順番どおりに関連ドキュメントへのリンクが並んでいます。

### 「CLI のコーディングアシスタントが欲しい」 {#i-want-a-cli-coding-assistant}

Hermes Agent を、コードの記述・レビュー・実行を対話的に行うターミナルアシスタントとして使います。

1. [インストール](/hermes/docs/getting-started/installation/)
2. [クイックスタート](/hermes/docs/getting-started/quickstart/)
3. [CLI の使い方](/hermes/docs/user-guide/cli/)
4. [コード実行](/hermes/docs/user-guide/features/code-execution/)
5. [コンテキストファイル](/hermes/docs/user-guide/features/context-files/)
6. [ヒントとコツ](/hermes/docs/guides/tips/)

:::tip
コンテキストファイルを使えば、ファイルをそのまま会話に渡せます。Hermes Agent は自分のプロジェクトのコードを読み、編集し、実行できます。
:::

### 「Telegram / Discord のボットが欲しい」 {#i-want-a-telegramdiscord-bot}

Hermes Agent を、普段使っているメッセージングのプラットフォーム上のボットとして動かします。

1. [インストール](/hermes/docs/getting-started/installation/)
2. [設定](/hermes/docs/user-guide/configuration/)
3. [メッセージングの概要](/hermes/docs/user-guide/messaging/)
4. [Telegram の設定](/hermes/docs/user-guide/messaging/telegram/)
5. [Discord の設定](/hermes/docs/user-guide/messaging/discord/)
6. [音声モード](/hermes/docs/user-guide/features/voice-mode/)
7. [Hermes で音声モードを使う](/hermes/docs/guides/use-voice-mode-with-hermes/)
8. [セキュリティ](/hermes/docs/user-guide/security/)

プロジェクトの完成例は、次を参照してください。
- [日次ブリーフィングのボット](/hermes/docs/guides/daily-briefing-bot/)
- [チーム向け Telegram アシスタント](/hermes/docs/guides/team-telegram-assistant/)

### 「作業を自動化したい」 {#i-want-to-automate-tasks}

定期的な作業をスケジュールしたり、バッチ処理を走らせたり、エージェントの動作をつなげたりします。

1. [クイックスタート](/hermes/docs/getting-started/quickstart/)
2. [Cron によるスケジュール実行](/hermes/docs/user-guide/features/cron/)
3. [バッチ処理](/hermes/docs/user-guide/features/batch-processing/)
4. [委譲](/hermes/docs/user-guide/features/delegation/)
5. [フック](/hermes/docs/user-guide/features/hooks/)

:::tip
cron ジョブを使うと、日次のまとめ、定期的なチェック、レポートの自動作成といった作業を、その場にいなくても Hermes Agent がスケジュールどおりに実行してくれます。
:::

### 「専門特化したボットのチームが欲しい」 {#i-want-a-team-of-specialist-bots}

それぞれ独自のモデル・メモリ・スキル・定期実行・チャットを持つ名前付きのボットを作り、グループチャットや `@mentions` でまとめて動かします。

1. [デスクトップ](/hermes/docs/user-guide/desktop/)
2. [プロファイル](/hermes/docs/user-guide/profiles/)
3. [ボットモード](/hermes/docs/user-guide/bot-mode/)
4. [Cron によるスケジュール実行](/hermes/docs/user-guide/features/cron/)
5. [マルチ接続のデスクトップ](/hermes/docs/user-guide/multi-connection-desktop/)

### 「独自のツールやスキルを作りたい」 {#i-want-to-build-custom-toolsskills}

自作のツールや、再利用できるスキルのパッケージで Hermes Agent を拡張します。

1. [プラグイン](/hermes/docs/user-guide/features/plugins/)
2. [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/)
3. [ツールの概要](/hermes/docs/user-guide/features/tools/)
4. [スキルの概要](/hermes/docs/user-guide/features/skills/)
5. [MCP（Model Context Protocol）](/hermes/docs/user-guide/features/mcp/)
6. [アーキテクチャ](/hermes/docs/developer-guide/architecture/)
7. [ツールの追加](/hermes/docs/developer-guide/adding-tools/)
8. [スキルの作成](/hermes/docs/developer-guide/creating-skills/)

:::tip
独自ツールを作る場合、たいていはプラグインから始めるのが適しています。[ツールの追加](/hermes/docs/developer-guide/adding-tools/)
のページは Hermes 本体の組み込み開発向けであり、通常のユーザーが独自ツールを作る道筋ではありません。
:::

### 「モデルを学習させたい」 {#i-want-to-train-models}

Hermes Agent の RL 学習パイプライン（[Atropos](https://github.com/NousResearch/atropos) が土台）を使い、強化学習でモデルの振る舞いをファインチューニングします。

1. [クイックスタート](/hermes/docs/getting-started/quickstart/)
2. [設定](/hermes/docs/user-guide/configuration/)
3. [Atropos の RL 環境](https://github.com/NousResearch/atropos)（外部）
4. [プロバイダのルーティング](/hermes/docs/user-guide/features/provider-routing/)
5. [アーキテクチャ](/hermes/docs/developer-guide/architecture/)

:::tip
RL 学習は、Hermes Agent が会話やツール呼び出しをどう扱うかという基礎を理解してから取り組むと、うまく進みます。初めての場合は、まず初級のパスを一通りたどってください。
:::

### 「Python ライブラリとして使いたい」 {#i-want-to-use-it-as-a-python-library}

Hermes Agent を、自作の Python アプリケーションにプログラムとして組み込みます。

1. [インストール](/hermes/docs/getting-started/installation/)
2. [クイックスタート](/hermes/docs/getting-started/quickstart/)
3. [Python ライブラリのガイド](/hermes/docs/guides/python-library/)
4. [アーキテクチャ](/hermes/docs/developer-guide/architecture/)
5. [ツール](/hermes/docs/user-guide/features/tools/)
6. [セッション](/hermes/docs/user-guide/sessions/)

## 主な機能の一覧 {#key-features-at-a-glance}

何が使えるのか分からない場合は、主要な機能を並べた次の一覧を確認してください。

| 機能 | 何ができるか | リンク |
|---|---|---|
| **ツール** | エージェントが呼び出せる組み込みツール（ファイル入出力、検索、シェルなど） | [ツール](/hermes/docs/user-guide/features/tools/) |
| **スキル** | 新しい機能を追加する、インストール可能なプラグインのパッケージ | [スキル](/hermes/docs/user-guide/features/skills/) |
| **メモリ** | セッションをまたいで保持される記憶 | [メモリ](/hermes/docs/user-guide/features/memory/) |
| **ボットモード** | 会話履歴・定期実行・グループチャット・`@mentions` を備えた、名前付きの専門ボット | [ボットモード](/hermes/docs/user-guide/bot-mode/) |
| **コンテキストファイル** | ファイルやディレクトリを会話に渡す | [コンテキストファイル](/hermes/docs/user-guide/features/context-files/) |
| **MCP** | Model Context Protocol を通じて外部のツールサーバーに接続する | [MCP](/hermes/docs/user-guide/features/mcp/) |
| **Cron** | エージェントの作業を定期実行としてスケジュールする | [Cron](/hermes/docs/user-guide/features/cron/) |
| **委譲** | 並行作業のためにサブエージェントを起動する | [委譲](/hermes/docs/user-guide/features/delegation/) |
| **コード実行** | Hermes のツールをプログラムから呼び出す Python スクリプトを実行する | [コード実行](/hermes/docs/user-guide/features/code-execution/) |
| **ブラウザ** | Web の閲覧とスクレイピング | [ブラウザ](/hermes/docs/user-guide/features/browser/) |
| **フック** | イベント駆動のコールバックとミドルウェア | [フック](/hermes/docs/user-guide/features/hooks/) |
| **バッチ処理** | 複数の入力をまとめて処理する | [バッチ処理](/hermes/docs/user-guide/features/batch-processing/) |
| **プロバイダのルーティング** | 複数の LLM プロバイダにリクエストを振り分ける | [プロバイダのルーティング](/hermes/docs/user-guide/features/provider-routing/) |

## 次に読むもの {#what-to-read-next}

今いる段階に応じて、次のように進めてください。

- **インストールが終わったところ** → [クイックスタート](/hermes/docs/getting-started/quickstart/)に進み、最初の会話を実行してください。
- **クイックスタートを終えた** → [CLI の使い方](/hermes/docs/user-guide/cli/)と[設定](/hermes/docs/user-guide/configuration/)を読み、自分好みに調整してください。
- **基本には慣れた** → [ツール](/hermes/docs/user-guide/features/tools/)、[スキル](/hermes/docs/user-guide/features/skills/)、[メモリ](/hermes/docs/user-guide/features/memory/)を見て、エージェントの力を引き出してください。
- **チームで使う準備をしている** → [セキュリティ](/hermes/docs/user-guide/security/)と[セッション](/hermes/docs/user-guide/sessions/)を読み、アクセス制御と会話の管理を理解してください。
- **作る準備ができた** → [開発者ガイド](/hermes/docs/developer-guide/architecture/)に進み、内部構造を理解して貢献を始めてください。
- **実用的な例が見たい** → [ガイド](/hermes/docs/guides/tips/)の章に、実際のプロジェクト例とヒントがあります。

:::tip
すべてを読む必要はありません。目的に合ったパスを選び、リンクを順にたどっていけば、短い時間で使いこなせるようになります。次の一手を探すために、いつでもこのページに戻ってきてください。
:::
