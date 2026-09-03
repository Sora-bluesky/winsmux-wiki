---
title: "逆引き"
description: "「〜したい」から最短の手順ページへ引く索引（全 57 項目）"
raw: /hermes/raw/howto.md
---

# 逆引き

「〜したい」から最短の手順ページへ。全 57 項目・6 分類。サイト上の検索はカタカナ・全角の表記揺れにも対応。

## 導入

- **とにかくまず動かしてみたい** — インストールからチャットが返るまでを 5 分でたどる入口です
  - [クイックスタート](https://wiki.winsmux.dev/hermes/docs/getting-started/quickstart/)
- **Mac や Linux に入れたい** — 手早い導入コマンドと、OS ごとの対応状況の一覧です
  - [インストール](https://wiki.winsmux.dev/hermes/docs/getting-started/installation/) / [対応プラットフォーム](https://wiki.winsmux.dev/hermes/docs/getting-started/platform-support/)
- **Windows で使いたい** — WSL なしでそのまま動きます。POSIX 環境が要る用途だけ WSL2 側を見てください
  - [Windows（ネイティブ）](https://wiki.winsmux.dev/hermes/docs/user-guide/windows-native/) / [Windows（WSL2）](https://wiki.winsmux.dev/hermes/docs/user-guide/windows-wsl-quickstart/)
- **Android のスマホで動かしたい** — Termux 上で直接動かす手順です。ティア 2 の扱いで壊れることがあります
  - [Termux（Android）](https://wiki.winsmux.dev/hermes/docs/getting-started/termux/)
- **何から読めばいいか知りたい** — 経験の度合いと目的別に、読む順番が示されています
  - [学習パス](https://wiki.winsmux.dev/hermes/docs/getting-started/learning-path/)
- **最新版に上げたい** — 更新はコマンド 1 つです。アンインストールも同じページにあります
  - [更新とアンインストール](https://wiki.winsmux.dev/hermes/docs/getting-started/updating/)
- **ターミナルの画面を使いやすくしたい** — マウスが使える新しい画面です。対話しながら使うならこちらが推奨です
  - [TUI](https://wiki.winsmux.dev/hermes/docs/user-guide/tui/)
- **アプリや管理画面から使いたい** — どちらも CLI と同じ設定・セッション・記憶を共有します
  - [デスクトップアプリ](https://wiki.winsmux.dev/hermes/docs/user-guide/desktop/) / [管理画面](https://wiki.winsmux.dev/hermes/docs/user-guide/features/web-dashboard/)
- **Claude Code や Codex の設定を引き継ぎたい** — 指示・許可リスト・MCP サーバー・skill・記憶をコマンド 1 つで取り込みます
  - [他のエージェントから取り込む](https://wiki.winsmux.dev/hermes/docs/user-guide/import-from-other-agents/)

## つなぐ

- **Telegram から話しかけたい** — BotFather でトークンを作って渡すだけです。公開 URL は要りません
  - [Telegram](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/telegram/)
- **Discord のサーバーで使いたい** — DM でもチャンネルでも動きます。返事をする条件の表が最初にあります
  - [Discord](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/discord/)
- **Slack のワークスペースで使いたい** — Socket Mode を使うので、動かす環境をインターネットに公開せずに済みます
  - [Slack](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/slack/)
- **LINE から話しかけたい** — 公式の Messaging API を使います。同梱のプラグインを有効にするだけです
  - [LINE](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/line/)
- **メールでやりとりしたい** — IMAP / SMTP で受け取って返信します。Gmail や Outlook でも使えます
  - [メール](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/email/)
- **エージェント専用のメールアドレスを持たせたい** — エージェント側がメールを読み書きする形です。上のメール連携とは役割が違います
  - [エージェントに自分のメールアドレスを持たせる](https://wiki.winsmux.dev/hermes/docs/guides/agent-email-address/)
- **つながる先を一覧で見たい** — 対応するメッセージアプリと、ゲートウェイの構成の全体像です
  - [メッセージングゲートウェイ](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/)
- **声で話しかけたい** — 機能の全体像は前者、設定の手順は後者にあります
  - [音声モード](https://wiki.winsmux.dev/hermes/docs/user-guide/features/voice-mode/) / [音声モードを使う](https://wiki.winsmux.dev/hermes/docs/guides/use-voice-mode-with-hermes/)
- **Gmail やカレンダーを操作させたい** — OAuth2 でつなぎます。設定はエージェントが案内してくれます
  - [Google Workspace](https://wiki.winsmux.dev/hermes/docs/user-guide/skills/google-workspace/)
- **手持ちのツールを MCP でつなぎたい** — しくみは前者、実際の使い方と絞り込み方は後者にあります
  - [MCP](https://wiki.winsmux.dev/hermes/docs/user-guide/features/mcp/) / [MCP を使う](https://wiki.winsmux.dev/hermes/docs/guides/use-mcp-with-hermes/)

## 自動化

- **毎朝ニュースを届けさせたい** — テーマを調べて要約し、Telegram や Discord へ毎朝送る作例です
  - [毎朝のブリーフィングボット](https://wiki.winsmux.dev/hermes/docs/guides/daily-briefing-bot/)
- **決まった時刻に自動で走らせたい** — しくみは前者、監視やレポートなどの実務的な型は後者にあります
  - [定期実行タスク（cron）](https://wiki.winsmux.dev/hermes/docs/user-guide/features/cron/) / [cron で自動化する](https://wiki.winsmux.dev/hermes/docs/guides/automate-with-cron/)
- **定期実行が動かない原因を突き止めたい** — ジョブが走らない・配信が届かない・skill が読めないを症状別に切り分けます
  - [定期実行がうまくいかないとき](https://wiki.winsmux.dev/hermes/docs/guides/cron-troubleshooting/)
- **LLM を使わず監視スクリプトだけ回したい** — スクリプトを時間どおり走らせ、標準出力をそのままチャットへ届けます
  - [スクリプトだけの定期実行](https://wiki.winsmux.dev/hermes/docs/guides/cron-script-only/)
- **手元のスクリプトの出力をチャットへ流したい** — `hermes send` で Telegram・Discord・Slack などへ送ります
  - [スクリプトの出力を流す](https://wiki.winsmux.dev/hermes/docs/guides/pipe-script-output/)
- **GitHub の PR を自動でレビューさせたい** — 定期的に見張る型が前者、Webhook で即座に反応する型が後者です
  - [PR レビューエージェント](https://wiki.winsmux.dev/hermes/docs/guides/github-pr-review-agent/) / [Webhook で PR にコメント](https://wiki.winsmux.dev/hermes/docs/guides/webhook-github-pr-review/)
- **作業を分担させて並行で進めたい** — 子エージェントへの切り出しが前者、ボードで管理する形が後者です
  - [サブエージェントへの委任](https://wiki.winsmux.dev/hermes/docs/user-guide/features/delegation/) / [委任と並行作業](https://wiki.winsmux.dev/hermes/docs/guides/delegation-patterns/) / [カンバン](https://wiki.winsmux.dev/hermes/docs/user-guide/features/kanban/)
- **終わるまで追いかけさせたい** — 目標を預けると、ターンをまたいで動き続けます
  - [持続する目標](https://wiki.winsmux.dev/hermes/docs/user-guide/features/goals/)
- **そのまま使える自動化の型を探したい** — 考え方が前者、そのまま選べる型紙の一覧が後者です
  - [自動化の型紙](https://wiki.winsmux.dev/hermes/docs/guides/automation-blueprints/) / [自動化の型紙の一覧](https://wiki.winsmux.dev/hermes/docs/reference/automation-blueprints-catalog/)
- **自分のログイン済みサイトを見させたい** — 普段の Chrome のログインを複製して、エージェントが自分として閲覧します（既定は無効）
  - [ブラウザ操作（普段のプロファイル）](https://wiki.winsmux.dev/hermes/docs/user-guide/features/browser/)

## モデル

- **使うモデルを切り替えたい** — モデルの指定方法と、用途ごとの使い分けの設定です
  - [モデルを設定する](https://wiki.winsmux.dev/hermes/docs/user-guide/configuring-models/)
- **使えるモデルと料金を見たい** — 料金つきの一覧が前者、選択リストのしくみが後者です
  - [モデルと料金](https://wiki.winsmux.dev/hermes/models/) / [モデルカタログ](https://wiki.winsmux.dev/hermes/docs/reference/model-catalog/)
- **1 つの契約でまとめて使いたい** — モデルとツールのゲートウェイをまとめて用意する推奨構成です
  - [Nous Portal](https://wiki.winsmux.dev/hermes/docs/integrations/nous-portal/)
- **無料で試したい** — 期間限定の無料モデルを使う道と、手元で動かして料金ゼロにする道があります
  - [Nemotron 3 Ultra を無料で動かす](https://wiki.winsmux.dev/hermes/docs/guides/run-nemotron-3-ultra-free/) / [Ollama でローカル実行](https://wiki.winsmux.dev/hermes/docs/guides/local-ollama-setup/)
- **手元の PC だけで動かしたい** — Ollama を使う形が前者、Mac で llama.cpp / MLX を立てる形が後者です
  - [Ollama でローカル実行](https://wiki.winsmux.dev/hermes/docs/guides/local-ollama-setup/) / [Mac でローカル LLM](https://wiki.winsmux.dev/hermes/docs/guides/local-llm-on-mac/)
- **料金を抑えたい** — 使い方側の工夫が前者、コスト重視の振り分け設定が後者です
  - [コツとベストプラクティス](https://wiki.winsmux.dev/hermes/docs/guides/tips/) / [プロバイダールーティング](https://wiki.winsmux.dev/hermes/docs/user-guide/features/provider-routing/)
- **Gemini や Grok を使いたい** — Gemini は API キー、Grok は SuperGrok / X Premium+ のサインインでつなぎます
  - [Google Gemini](https://wiki.winsmux.dev/hermes/docs/guides/google-gemini/) / [xAI Grok OAuth](https://wiki.winsmux.dev/hermes/docs/guides/xai-grok-oauth/)
- **止まったとき自動で切り替えたい** — 控えのプロバイダーへ逃がすのが前者、キーを束ねて回すのが後者です
  - [フォールバックプロバイダー](https://wiki.winsmux.dev/hermes/docs/user-guide/features/fallback-providers/) / [認証情報プール](https://wiki.winsmux.dev/hermes/docs/user-guide/features/credential-pools/)
- **受け答えの質が落ちた原因を調べたい** — モデルの切り替わり、コンテキストの逼迫、記憶の固着を順に確認します
  - [前より賢くなくなった気がするとき](https://wiki.winsmux.dev/hermes/docs/guides/troubleshooting-agent-quality/)

## 安全

- **承認なしで動く範囲を絞りたい** — 危険なコマンドの承認、ファイル書き込みの安全策、利用者の認可をまとめて扱います
  - [セキュリティ](https://wiki.winsmux.dev/hermes/docs/user-guide/security/)
- **API キーを平文で置かずに渡したい** — 仕組みの全体像が前者、1Password から取り出す設定が後者です
  - [シークレット](https://wiki.winsmux.dev/hermes/docs/user-guide/secrets/) / [1Password](https://wiki.winsmux.dev/hermes/docs/user-guide/secrets/onepassword/)
- **仕事用の端末で安全に使いたい** — 既定で守られること、さらに締める設定、失敗の取り消し方を順に見ていきます
  - [個人や仕事の端末で動かす](https://wiki.winsmux.dev/hermes/docs/guides/secure-hermes-on-a-work-machine/)
- **外に出る通信先を制限したい** — 通信先の制限が前者、資格情報を差し込んで手元に残さない形が後者です
  - [Egress プロキシ](https://wiki.winsmux.dev/hermes/docs/user-guide/egress/) / [iron-proxy](https://wiki.winsmux.dev/hermes/docs/user-guide/egress/iron-proxy/)
- **コンテナに閉じ込めて動かしたい** — Hermes 自体を Docker で動かす形と、端末の実行先だけを Docker にする形があります
  - [Docker で動かす](https://wiki.winsmux.dev/hermes/docs/user-guide/docker/)
- **壊れたファイルを巻き戻したい** — 裏側の git リポジトリに自動で残るスナップショットから戻します
  - [チェックポイントと /rollback](https://wiki.winsmux.dev/hermes/docs/user-guide/checkpoints-and-rollback/)
- **作業中のリポジトリを汚さず任せたい** — git のワークツリーで作業場所を分け、同じリポジトリを安全に共有します
  - [Git ワークツリー](https://wiki.winsmux.dev/hermes/docs/user-guide/git-worktrees/)
- **組織で設定を固定して配りたい** — 管理者が決めた設定と秘密情報を、利用者側で変更できない形で配ります
  - [管理者による適用範囲](https://wiki.winsmux.dev/hermes/docs/user-guide/managed-scope/)

## 運用

- **サーバーに常駐させて動かし続けたい** — サービスとして入れる手順が前者にあります。ゲートウェイ自体の説明は後者です
  - [チームで使う Telegram アシスタント](https://wiki.winsmux.dev/hermes/docs/guides/team-telegram-assistant/) / [メッセージングゲートウェイ](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/)
- **会話や好みを覚えさせたい** — 記憶のしくみが前者、どのファイルが何を担うかの対応表が後者です
  - [ずっと残る記憶](https://wiki.winsmux.dev/hermes/docs/user-guide/features/memory/) / [どのファイルが何をするのか](https://wiki.winsmux.dev/hermes/docs/user-guide/which-file-does-what/)
- **話し方や性格を決めたい** — 設定の全体像が前者、SOUL.md に何を書くかの実践が後者です
  - [人格と SOUL.md](https://wiki.winsmux.dev/hermes/docs/user-guide/features/personality/) / [SOUL.md を使う](https://wiki.winsmux.dev/hermes/docs/guides/use-soul-with-hermes/)
- **skill を自作したい** — SKILL.md の書式と公開までが前者、探し方や入れ方を含む全体が後者です
  - [スキルを作る](https://wiki.winsmux.dev/hermes/docs/developer-guide/creating-skills/) / [スキルを使いこなす](https://wiki.winsmux.dev/hermes/docs/guides/work-with-skills/)
- **使える skill を探したい** — 最初から入っているものが前者、コマンドで追加するものが後者です
  - [同梱スキルの一覧](https://wiki.winsmux.dev/hermes/docs/reference/skills-catalog/) / [オプションスキルの一覧](https://wiki.winsmux.dev/hermes/docs/reference/optional-skills-catalog/)
- **用途ごとにエージェントを分けたい** — 設定を分ける単位が前者、名前を持つ Bot の一覧に見せる形が後者です
  - [プロファイル](https://wiki.winsmux.dev/hermes/docs/user-guide/profiles/) / [Bot モード](https://wiki.winsmux.dev/hermes/docs/user-guide/bot-mode/)
- **前の会話を探して再開したい** — セッションの保存・再開・検索と、プラットフォームごとの追跡の話です
  - [セッション](https://wiki.winsmux.dev/hermes/docs/user-guide/sessions/)
- **コマンドや設定項目を調べたい** — 端末のコマンド、対話中のスラッシュコマンド、config.yaml の書き方です
  - [CLI コマンド一覧](https://wiki.winsmux.dev/hermes/docs/reference/cli-commands/) / [スラッシュコマンド早見表](https://wiki.winsmux.dev/hermes/docs/reference/slash-commands/) / [設定](https://wiki.winsmux.dev/hermes/docs/user-guide/configuration/)
- **困ったときに調べたい** — つまずきやすい箇所の対処が前者、うまく使うためのコツが後者です
  - [よくある質問とトラブル対処](https://wiki.winsmux.dev/hermes/docs/reference/faq/) / [コツとベストプラクティス](https://wiki.winsmux.dev/hermes/docs/guides/tips/)
- **今週何が変わったか知りたい** — 日次の同期から機械生成した更新の記録と、週ごとの要約です
  - [更新履歴](https://wiki.winsmux.dev/hermes/updates/)
- **日本語入力で変換を確定すると送信されてしまう** — 変換の確定と送信が同じキーになる問題と、その回避のしかた
  - [日本語入力](https://wiki.winsmux.dev/hermes/japanese/)
