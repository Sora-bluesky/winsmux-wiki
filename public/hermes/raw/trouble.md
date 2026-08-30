---
title: "トラブル"
description: "症状から原因と対処を引く表（全 35 項目）"
raw: /hermes/raw/trouble.md
---

# トラブル

症状から原因と対処を引く表。全 35 項目・5 分類。推測の対処は載せず、全項目が公式ドキュメントの記述に対応。

## 接続

### Telegram に送っても返事がない

- 原因: ゲートウェイの停止。ボットトークンの設定ミス。許可一覧への未登録
- 対処: `hermes gateway status` で稼働を確かめ、止まっていれば `hermes gateway start` で立ち上げます。`TELEGRAM_BOT_TOKEN` を見直し、`~/.hermes/logs/gateway.log` にエラーが出ていないかも確かめます。
- 関連: [Telegram](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/telegram/) / [よくある質問とトラブル対処](https://wiki.winsmux.dev/hermes/docs/reference/faq/)

### ボットが「unauthorized」と返す

- 原因: 自分のユーザー ID が `TELEGRAM_ALLOWED_USERS` に入っていない
- 対処: @userinfobot で自分のユーザー ID を確かめ直し、`TELEGRAM_ALLOWED_USERS` に加えます。
- 関連: [Telegram](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/telegram/)

### Telegram の個人チャットでは返事があるのにグループでは黙っている

- 原因: BotFather のプライバシーモードが有効。グループ側の許可設定の漏れ
- 対処: プライバシーモードを切るか、ボットをグループの管理者にします。設定を変えたらボットを一度外して追加し直し、`TELEGRAM_GROUP_ALLOWED_CHATS` などの許可設定も確かめます。
- 関連: [Telegram](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/telegram/)

### Discord のボットはオンラインなのにメッセージへ応答しない

- 原因: Message Content Intent が無効。アクセス方針が未設定で拒否側に倒れている
- 対処: Developer Portal で Message Content Intent を有効にし、`DISCORD_ALLOWED_USERS` などのアクセス方針を設定します。そのあと `hermes gateway restart` で再起動します。
- 関連: [Discord](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/discord/)

### Slack の DM では動くのにチャンネルでは動かない

- 原因: `message.channels` / `message.groups` のイベント購読と履歴スコープの不足。チャンネルへの招待漏れ
- 対処: イベント購読と `channels:history` などのスコープを足し、アプリをワークスペースへ再インストールします。そのうえで `/invite @Hermes Agent` でボットをチャンネルに招待します。
- 関連: [Slack](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/slack/)

### WhatsApp のブリッジが落ちる、再接続を繰り返す

- 原因: WhatsApp 側のプロトコル変更によるセッションの無効化
- 対処: ゲートウェイを再起動して Hermes を更新します。それでも直らなければ `hermes whatsapp` で連携し直します。
- 関連: [WhatsApp](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/whatsapp/)

### Signal の設定中に「Cannot reach signal-cli」と出る

- 原因: signal-cli のデーモンが動いていない
- 対処: `signal-cli --account +YOUR_NUMBER daemon --http 127.0.0.1:8080` でデーモンを立ち上げてから、設定をやり直します。
- 関連: [Signal](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/signal/)

### メール連携の起動時に「IMAP connection failed」と出る

- 原因: `EMAIL_IMAP_HOST` と `EMAIL_IMAP_PORT` の誤り。アカウント側で IMAP が無効
- 対処: 接続先とポート番号を確かめます。Gmail なら「設定 → メール転送と POP/IMAP」で IMAP を有効にします。
- 関連: [メール](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/email/)

### ゲートウェイが起動しない

- 原因: 依存パッケージの不足。ポートの取り合い。トークンの設定ミス
- 対処: `uv pip install -e ".[messaging]"` で依存を入れ直し、`lsof -i :8080` でポートの重なりを見ます。`hermes config show` で設定も確かめます。
- 関連: [よくある質問とトラブル対処](https://wiki.winsmux.dev/hermes/docs/reference/faq/) / [メッセージングゲートウェイ](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/)

### WSL でゲートウェイが切れ続ける、`hermes gateway start` が失敗する

- 原因: WSL2 で systemd が有効になっていない。WSL の再起動や Windows のアイドル終了でサービスが落ちる
- 対処: systemd のサービスにせず、`hermes gateway run` をそのまま動かすか tmux の中で動かします。
- 関連: [よくある質問とトラブル対処](https://wiki.winsmux.dev/hermes/docs/reference/faq/)

### MCP サーバーにつながらない

- 原因: サーバーの実行ファイルが見つからない。コマンドのパスの誤り。実行環境の不足
- 対処: `node --version` などで実行環境を確かめ、サーバーのコマンドを手で動かして確認します。そのうえで `~/.hermes/config.yaml` の `mcp_servers` の記述を見直します。
- 関連: [MCP（Model Context Protocol）](https://wiki.winsmux.dev/hermes/docs/user-guide/features/mcp/) / [Hermes で MCP を使う](https://wiki.winsmux.dev/hermes/docs/guides/use-mcp-with-hermes/) / [MCP 設定の早見表](https://wiki.winsmux.dev/hermes/docs/reference/mcp-config-reference/)

### Docker バックエンドにつながらない

- 原因: Docker のデーモンが動いていない。ユーザーの権限不足
- 対処: `docker info` で稼働を確かめ、`sudo usermod -aG docker $USER` と `newgrp docker` で権限を足します。
- 関連: [Hermes の Docker での動かし方](https://wiki.winsmux.dev/hermes/docs/user-guide/docker/) / [よくある質問とトラブル対処](https://wiki.winsmux.dev/hermes/docs/reference/faq/)

## モデル・鍵

### API キーが通らない

- 原因: キーの未設定・期限切れ・書き間違い。別のプロバイダー用のキー
- 対処: `hermes config show` で今の設定を確かめ、`hermes model` でプロバイダーを設定し直します。`~/.hermes/.env` に食い違う記述が残っていないかも見ます。
- 関連: [よくある質問とトラブル対処](https://wiki.winsmux.dev/hermes/docs/reference/faq/) / [環境変数](https://wiki.winsmux.dev/hermes/docs/reference/environment-variables/)

### モデルが見つからない、使えないと出る

- 原因: モデル名の誤り。そのプロバイダーでは提供されていない
- 対処: `hermes model` で使えるモデルを一覧し、正しい名前を設定します。`hermes chat --model <name>` でセッションごとに指定することもできます。
- 関連: [よくある質問とトラブル対処](https://wiki.winsmux.dev/hermes/docs/reference/faq/) / [モデルカタログ](https://wiki.winsmux.dev/hermes/docs/reference/model-catalog/)

### 最初のチャットが Error 400 で失敗する

- 原因: モデル名の食い違い。API キーにそのモデルを使う権限がない
- 対処: `hermes config show` で設定中のモデルとプロバイダーを確かめ、`hermes model` で選び直します。OpenRouter を使っているなら残高も確かめます。
- 関連: [よくある質問とトラブル対処](https://wiki.winsmux.dev/hermes/docs/reference/faq/)

### レート制限（429 エラー）が出る

- 原因: プロバイダー側の利用制限
- 対処: 少し待ってから実行し直します。日常的に当たるなら、プランを上げるか、別のモデルやプロバイダーへ振り分けます。
- 関連: [よくある質問とトラブル対処](https://wiki.winsmux.dev/hermes/docs/reference/faq/) / [LLM とモデルのプロバイダー](https://wiki.winsmux.dev/hermes/docs/integrations/providers/)

### `/model` に 1 つのプロバイダーしか出てこない

- 原因: 設定済みのプロバイダーが 1 つだけ。`/model` は設定済みの範囲でしか切り替えられない
- 対処: セッションを抜けて、ターミナルから `hermes model` を実行してプロバイダーを足します。そのあと新しいチャットを開きます。
- 関連: [よくある質問とトラブル対処](https://wiki.winsmux.dev/hermes/docs/reference/faq/) / [モデルを設定する](https://wiki.winsmux.dev/hermes/docs/user-guide/configuring-models/)

### 選択画面に「No authenticated providers」と出る

- 原因: 使える認証情報のあるプロバイダーが 1 つもない
- 対処: サイドバーの Keys で API キーや OAuth の登録を確かめます。無ければ `hermes setup` を実行して設定します。
- 関連: [モデルを設定する](https://wiki.winsmux.dev/hermes/docs/user-guide/configuring-models/) / [モデルを選ぶ](https://wiki.winsmux.dev/hermes/models/)

### モデルを選んだのにプロバイダーが切り替わっていた

- 原因: 集約サービスでは、素のモデル名がその集約サービスの内側で先に解決される
- 対処: 選択画面の先頭に出る現在のメインモデルとプロバイダーを見て、意図した組み合わせか確かめます。
- 関連: [モデルを設定する](https://wiki.winsmux.dev/hermes/docs/user-guide/configuring-models/) / [LLM とモデルのプロバイダー](https://wiki.winsmux.dev/hermes/docs/integrations/providers/)

## 自動化

### 定期実行のジョブが動かない

- 原因: ジョブが `[paused]` や `[completed]` になっている。ゲートウェイの停止
- 対処: `hermes cron list` で状態と次の実行時刻を確かめます。ジョブは裏で回るゲートウェイが動かすので、`hermes gateway` を立ち上げておきます。
- 関連: [定期実行がうまくいかないとき](https://wiki.winsmux.dev/hermes/docs/guides/cron-troubleshooting/) / [定期実行タスク（cron）](https://wiki.winsmux.dev/hermes/docs/user-guide/features/cron/)

### ジョブは走るのに何も届かない

- 原因: 配信先の書き方の誤り。出力が空。返答に `[SILENT]` が入っている
- 対処: 配信先の綴りと、その宛先のサービスが設定してあるかを確かめます。`hermes cron list` の `last_error` の欄も見ます。
- 関連: [定期実行がうまくいかないとき](https://wiki.winsmux.dev/hermes/docs/guides/cron-troubleshooting/)

### 定期実行で「Skill not found」と出る

- 原因: スケジューラの動く端末にスキルが入っていない。スキル名とフォルダ名の食い違い
- 対処: `hermes skills list` で正確な名前を確かめ、無ければ `hermes skills install <skill-name>` で入れます。
- 関連: [定期実行がうまくいかないとき](https://wiki.winsmux.dev/hermes/docs/guides/cron-troubleshooting/) / [スキルの仕組み](https://wiki.winsmux.dev/hermes/docs/user-guide/features/skills/)

### 定期実行のジョブが止まったままになる、時間切れになる

- 原因: 動きが止まってからの時間が既定の 600 秒を超えた
- 対処: 環境変数 `HERMES_CRON_TIMEOUT` で上限を変えられます。長くかかる仕事は、データを集めるところをスクリプトに任せて結果だけを届けます。
- 関連: [定期実行がうまくいかないとき](https://wiki.winsmux.dev/hermes/docs/guides/cron-troubleshooting/) / [スクリプトだけの定期実行（LLM なし）](https://wiki.winsmux.dev/hermes/docs/guides/cron-script-only/)

### 定期実行のジョブが遅れる、飛ばされる

- 原因: ゲートウェイの二重起動による鍵の取り合い。同じ時刻へのジョブの集中
- 対処: `ps aux | grep hermes` で重なって動いているゲートウェイを止め、1 つだけにします。ジョブの時刻も少しずつずらします。
- 関連: [定期実行がうまくいかないとき](https://wiki.winsmux.dev/hermes/docs/guides/cron-troubleshooting/) / [cron で何でも自動化する](https://wiki.winsmux.dev/hermes/docs/guides/automate-with-cron/)

## 動作

### コンテキスト長を超えたと出る

- 原因: 会話が長くなってモデルの枠を超えた。コンテキスト長の誤判定
- 対処: `/compress` で会話を圧縮するか、新しいセッションを開きます。長い会話の 1 回目で出るなら、`config.yaml` の `model.context_length` に実際の値を書きます。
- 関連: [よくある質問とトラブル対処](https://wiki.winsmux.dev/hermes/docs/reference/faq/) / [エージェントが前より賢くなくなった気がするとき](https://wiki.winsmux.dev/hermes/docs/guides/troubleshooting-agent-quality/) / [LLM とモデルのプロバイダー](https://wiki.winsmux.dev/hermes/docs/integrations/providers/)

### 応答が遅い

- 原因: モデルの大きさ。API サーバーまでの遠さ。ツールを盛り込んだシステムプロンプトの重さ
- 対処: もっと速くて小さいモデルを試し、`hermes chat -t "terminal"` のように有効なツールセットを絞ります。ローカルモデルなら GPU の VRAM も確かめます。
- 関連: [よくある質問とトラブル対処](https://wiki.winsmux.dev/hermes/docs/reference/faq/) / [コツとベストプラクティス](https://wiki.winsmux.dev/hermes/docs/guides/tips/)

### トークンを使いすぎる

- 原因: 会話の長さ。システムプロンプトとツール定義の膨らみ
- 対処: `hermes prompt-size` で毎回送られる分の内訳を測り、使っていないツールセットとスキルを切ります。長いセッションでは `/compress` と `/usage` も併せて使います。
- 関連: [よくある質問とトラブル対処](https://wiki.winsmux.dev/hermes/docs/reference/faq/) / [CLI コマンド一覧](https://wiki.winsmux.dev/hermes/docs/reference/cli-commands/)

### エージェントが前より賢くなくなった気がする

- 原因: 思っているのと違うモデルでセッションが動いている
- 対処: `/model` か `/status` で今のモデルとプロバイダーを確かめます。違っていれば `/model <name>` でそのセッションを直せます。
- 関連: [エージェントが前より賢くなくなった気がするとき](https://wiki.winsmux.dev/hermes/docs/guides/troubleshooting-agent-quality/) / [モデルを設定する](https://wiki.winsmux.dev/hermes/docs/user-guide/configuring-models/)

### このセッションで覚えてと頼んだのに忘れている

- 原因: 記憶はセッションの開始時に固定された写しとしてシステムプロンプトへ入る
- 対処: 意図どおりの動きです。保存自体はすぐ済んでいて、システムプロンプトに現れるのは次のセッションからです。
- 関連: [エージェントが前より賢くなくなった気がするとき](https://wiki.winsmux.dev/hermes/docs/guides/troubleshooting-agent-quality/) / [ずっと残る記憶](https://wiki.winsmux.dev/hermes/docs/user-guide/features/memory/)

### 前にできたことを「できない」と言う

- 原因: スキルが読み込まれていない。ツールセットが絞られている
- 対処: `/skills` と `/tools list` で読み込まれているものを確かめます。`/reload-skills` で読み直し、`/tools enable` でツールを戻します。
- 関連: [エージェントが前より賢くなくなった気がするとき](https://wiki.winsmux.dev/hermes/docs/guides/troubleshooting-agent-quality/) / [スキルの仕組み](https://wiki.winsmux.dev/hermes/docs/user-guide/features/skills/) / [組み込みツールの一覧](https://wiki.winsmux.dev/hermes/docs/reference/tools-reference/)

## その他

### インストールしたのに `hermes: command not found` になる

- 原因: シェルが新しい PATH を読み直していない
- 対処: `source ~/.bashrc`（zsh なら `~/.zshrc`）を実行するか、新しいターミナルを開きます。`which hermes` で入った場所も確かめます。
- 関連: [よくある質問とトラブル対処](https://wiki.winsmux.dev/hermes/docs/reference/faq/) / [インストール](https://wiki.winsmux.dev/hermes/docs/getting-started/installation/)

### ターミナル操作で `node: command not found` になる

- 原因: ログインシェルから写し取った環境に `nvm` や `pyenv` の設定が入っていない
- 対処: `~/.hermes/config.yaml` の `terminal.shell_init_files` に、読み込ませたいファイルを並べます。
- 関連: [よくある質問とトラブル対処](https://wiki.winsmux.dev/hermes/docs/reference/faq/) / [Hermes Agent の設定](https://wiki.winsmux.dev/hermes/docs/user-guide/configuration/)

### コマンドが危険と判断されて止まる

- 原因: 破壊的な可能性のあるコマンドの検出
- 対処: 意図した動きです。確認を求められたら中身を読み、問題なければ許可します。判断されるパターンはセキュリティのページに載っています。
- 関連: [セキュリティ](https://wiki.winsmux.dev/hermes/docs/user-guide/security/) / [よくある質問とトラブル対処](https://wiki.winsmux.dev/hermes/docs/reference/faq/)

### メッセージ経由だと `sudo` が使えない

- 原因: メッセージゲートウェイに対話できるターミナルがなく、パスワードを尋ねられない
- 対処: メッセージ経由では `sudo` を避け、別のやり方をエージェントに探してもらいます。管理作業は `hermes chat` に切り替えます。
- 関連: [よくある質問とトラブル対処](https://wiki.winsmux.dev/hermes/docs/reference/faq/) / [メッセージングゲートウェイ](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/)

### 端末を移したら設定や記憶が引き継がれない

- 原因: `~/.hermes/` の中身を移していない
- 対処: 移す元の端末で `hermes backup` を実行して zip を作り、新しい端末で `hermes import` を実行します。そのあと `hermes setup` で API キーとプロバイダーの設定を確かめます。
- 関連: [よくある質問とトラブル対処](https://wiki.winsmux.dev/hermes/docs/reference/faq/) / [プロファイル](https://wiki.winsmux.dev/hermes/docs/user-guide/profiles/)
