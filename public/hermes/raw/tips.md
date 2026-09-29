---
title: "Hermes Wingtips 日本語版"
description: "Nous Research の @witcheer による X の連載「Hermes Wingtips」の #1〜#86（2026-09-28 まで）を日本語で"
raw: /hermes/raw/tips.md
---

# Hermes Wingtips 日本語版

「Hermes Wingtips」は、Nous Research の [@witcheer](https://x.com/witcheer) による X の連載です。1 回にひとつ、Hermes Agent の機能や設定を紹介しています。このページは #1〜#86（2026-09-28 まで）の 86 回・8 分類を収録しています。

日本語の文はこのサイトによる要約です。正確な内容は元のポストと公式ドキュメントをご覧ください。

## メッセージとボット

- **#86 スクリプトからメッセージを Telegram などへ送る** — `hermes send` は設定済みのボットを使って、スクリプトからメッセージを送ります。モデルは呼びません。`hermes send --to telegram` のように送り先を指定し、ほかのコマンドの出力をパイプで渡すこともできます。
  - 元のポスト: https://x.com/witcheer/status/2104531742686093765
  - 関連: [スクリプトの出力をメッセージングプラットフォームへ流す](https://wiki.winsmux.dev/hermes/docs/guides/pipe-script-output/) / [CLIコマンド一覧](https://wiki.winsmux.dev/hermes/docs/reference/cli-commands/)
- **#82 ボットの「停滞しています」通知の意味と調整** — 追加のメッセージが届いているのにエージェントの動きが止まっていると、ゲートウェイが1回だけ知らせます。通知するだけでターンは止めません。時間は `agent.session_stall_timeout`（既定300秒、0で無効）で変えます。
  - 元のポスト: https://x.com/witcheer/status/2102997146660110386
  - 関連: [Hermes Agent の設定](https://wiki.winsmux.dev/hermes/docs/user-guide/configuration/)
- **#81 許可していない相手からの DM を丁寧に断る** — 許可していない相手がボットに DM を送ると、既定ではペアリングコードが返ります。`unauthorized_dm_behavior: decline` にすると短いお断りを1回だけ送り、その後24時間はその相手に返信しません。
  - 元のポスト: https://x.com/witcheer/status/2102680195161366668
  - 関連: [Hermes Agent の設定](https://wiki.winsmux.dev/hermes/docs/user-guide/configuration/) / [セキュリティ](https://wiki.winsmux.dev/hermes/docs/user-guide/security/)
- **#73 メッセージの送信時刻をエージェントに伝える** — `gateway.message_timestamps` の `enabled` を `true` にすると、利用者のメッセージの先頭に送信時刻が付いてモデルに届きます。「今朝の件」や間が空いたことを踏まえた返答になります。画面の表示と保存される記録は変わりません。
  - 元のポスト: https://x.com/witcheer/status/2099784645529276481
  - 関連: [メッセージングゲートウェイ](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/)
- **#43 Telegram でトピックを分けるか、別のエージェントを立てるか** — 1つのボットの DM で並行する会話を持つなら `/topic` で、裏のエージェントは1つのままです。完全に分けたいときは `hermes profile create` で別のボットを持つ別のエージェントを作ります。
  - 元のポスト: https://x.com/witcheer/status/2087071761040896227
  - 関連: [Telegram](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/telegram/) / [プロファイル: 複数のエージェントを動かす](https://wiki.winsmux.dev/hermes/docs/user-guide/profiles/)
- **#24 ゲートウェイの会話は自動ではリセットされない** — Telegram などの会話は、時間が経っても日付が変わっても切れません。今の本体は `session_reset` の設定を無視します。区切りたいときは `/new` か `/reset` を使い、時間で区切りたいならプラグインを入れます。
  - 元のポスト: https://x.com/witcheer/status/2078481963040530769
  - 関連: [セッション](https://wiki.winsmux.dev/hermes/docs/user-guide/sessions/)
- **#16 再起動後にゲートウェイが戻らないときの設定** — ユーザーのサービスとして入れたゲートウェイはログアウトで止まり、再起動後も自動では戻りません。`sudo loginctl enable-linger $USER` を一度実行するか、`sudo hermes gateway install --system` を使います。
  - 元のポスト: https://x.com/witcheer/status/2074942527996838105
  - 関連: [メッセージングゲートウェイ](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/)
- **#1 Telegram のグループでボットが黙ったままのときの直し方** — グループでボットが反応しないときは、BotFather のプライバシーモードが原因のことが多いです。`/setprivacy` で無効にしたあと、ボットをグループから外して入れ直すと、ふつうの発言も届くようになります。
  - 元のポスト: https://x.com/witcheer/status/2067717599090143569
  - 関連: [Telegram](https://wiki.winsmux.dev/hermes/docs/user-guide/messaging/telegram/)

## モデルとプロバイダ

- **#75 要約などの補助タスクだけ、思考の深さを下げる** — 会話の要約や画像の読み取りなどの補助タスクには、それぞれ `reasoning_effort` を設定できます。`low` や `none` にすると補助の呼び出しが速く安くなり、メインのチャットの設定は変わりません。
  - 元のポスト: https://x.com/witcheer/status/2100460797239415168
  - 関連: [Hermes Agent の設定](https://wiki.winsmux.dev/hermes/docs/user-guide/configuration/)
- **#74 OpenRouter で特定の提供元を避ける** — OpenRouter では同じモデルを複数の提供元が配信しています。`config.yaml` の `provider_routing` の `ignore` に提供元を書くと、そこへは送られなくなります。Nous Portal は振り分けを自分で決めるので設定は効きません。
  - 元のポスト: https://x.com/witcheer/status/2100156876209963106
  - 関連: [提供元の振り分け](https://wiki.winsmux.dev/hermes/docs/user-guide/features/provider-routing/)
- **#59 モデルが止まったら控えのモデルで会話を続ける** — メインのモデルがレート制限やエラーで止まると、控えの provider と model へ切り替わり、同じ会話を続けます。控えは `hermes fallback` で登録します。制限の解除時刻やクールダウンを過ぎると、メインがまた試されます。
  - 元のポスト: https://x.com/witcheer/status/2094362454390129137
  - 関連: [フォールバックプロバイダー](https://wiki.winsmux.dev/hermes/docs/user-guide/features/fallback-providers/)
- **#56 どのチャットからでもモデルを切り替えて保存する** — `hermes model` の選択画面はパイプやスクリプトからは使えませんが、チャットの `/model` なら切り替えられます。`--global` を付けると `config.yaml` にも残り、`--once` なら1ターンだけ切り替えて元に戻ります。
  - 元のポスト: https://x.com/witcheer/status/2092941623961190832
  - 関連: [モデルの設定](https://wiki.winsmux.dev/hermes/docs/user-guide/configuring-models/) / [スラッシュコマンド早見表](https://wiki.winsmux.dev/hermes/docs/reference/slash-commands/)
- **#39 モデルが 404 を返したら ID の接頭辞を確かめる** — モデル指定で 404 が返るとき、障害ではなく ID の `vendor/` の部分が抜けていることがあります。`vendor/model` の形で書くのを習慣にし、迷ったら `hermes model` の選択画面から選びます。
  - 元のポスト: https://x.com/witcheer/status/2085293767506931833
- **#34 Nous Portal の契約を別のアプリから使う** — `hermes proxy start` で手元に OpenAI 互換の中継サーバーが立ち、Open WebUI などが契約中のモデルを使えます。準備の確認は `hermes proxy status` です。エージェントごと使いたいときは API サーバーのほうです。
  - 元のポスト: https://x.com/witcheer/status/2082613966774350301
  - 関連: [契約の中継サーバー](https://wiki.winsmux.dev/hermes/docs/user-guide/features/subscription-proxy/)
- **#29 ローカルモデルには 64K 以上のコンテキストを** — Hermes はツールを使う作業に 64,000 トークン以上のコンテキストが要り、小さいと起動時に断られます。Ollama は `OLLAMA_CONTEXT_LENGTH`、vLLM は `--max-model-len`、llama.cpp は `-c` で広げます。
  - 元のポスト: https://x.com/witcheer/status/2080682763594899763
  - 関連: [LLM とモデルプロバイダ](https://wiki.winsmux.dev/hermes/docs/integrations/providers/)
- **#26 Web ページを読むときの費用と文字数の上限** — `web_extract` は今、長いページを LLM で要約せず、決まった文字数で先頭と末尾を残して返します。要約用のモデル代はかかりません。1ページの上限は `web.extract_char_limit` で変えられます。
  - 元のポスト: https://x.com/witcheer/status/2079595063534145708
  - 関連: [Web 検索と本文抽出](https://wiki.winsmux.dev/hermes/docs/user-guide/features/web-search/)
- **#23 自前のモデルがツールを実行せず JSON を返すとき** — 返答にツール呼び出しの JSON がそのまま出るときは、推論サーバー側でツール呼び出しが無効です。vLLM は `--enable-auto-tool-choice` と `--tool-call-parser`、llama.cpp は `--jinja` を付けて起動します。
  - 元のポスト: https://x.com/witcheer/status/2078094918740758606
  - 関連: [LLM とモデルプロバイダ](https://wiki.winsmux.dev/hermes/docs/integrations/providers/)
- **#21 同じプロバイダのキーを複数登録して順に回す** — 認証情報プールは、1つのプロバイダに複数のキーを登録し、制限や枠切れのキーから次へ切り替えます。別プロバイダへ移るフォールバックはプールを使い切ってからです。追加は `hermes auth add`、確認は `hermes auth list` です。
  - 元のポスト: https://x.com/witcheer/status/2077409888045510954
  - 関連: [認証情報プール](https://wiki.winsmux.dev/hermes/docs/user-guide/features/credential-pools/)
- **#14 モデルを切り替えるとプロンプトのキャッシュが消える** — 会話の途中で `/model` でモデルを変えると、次のターンは履歴全体を割引なしで読み直します。長いセッションでは行ったり来たりせず、別のモデルで新しいセッションを始めるほうが安く済むことがあります。
  - 元のポスト: https://x.com/witcheer/status/2074153526222114974
  - 関連: [コツとベストプラクティス](https://wiki.winsmux.dev/hermes/docs/guides/tips/)
- **#10 フォールバックの各項目には provider と model が要る** — `fallback_providers` の各項目は、`provider` と `model` の両方がそろって初めて有効になり、欠けた項目は無視されます。クラウドが落ちたときの最後の控えとして、`custom` で自前のエンドポイントも指定できます。
  - 元のポスト: https://x.com/witcheer/status/2072321716626366479
  - 関連: [フォールバックプロバイダー](https://wiki.winsmux.dev/hermes/docs/user-guide/features/fallback-providers/)
- **#8 複数のモデルに助言させて1つの答えにまとめる** — Mixture of Agents は、参照役のモデルたちの分析を集約役のモデルがまとめて答える仮想のモデルです。料金はほぼ集約役の側にかかります。1回だけ試すなら `/moa`、組み合わせは `hermes moa configure` で決めます。
  - 元のポスト: https://x.com/witcheer/status/2070888011508674819
  - 関連: [Mixture of Agents](https://wiki.winsmux.dev/hermes/docs/user-guide/features/mixture-of-agents/)

## セッションと文脈

- **#66 使わなくなった古いセッションを自動で片付ける** — 終了して長く触れていないセッションは、起動時に自動で整理されます。すべて残したいときは `hermes config set sessions.auto_prune false`、残す期間を変えるときは `sessions.retention_days`（既定90日）を使います。
  - 元のポスト: https://x.com/witcheer/status/2097201422844436642
  - 関連: [セッション](https://wiki.winsmux.dev/hermes/docs/user-guide/sessions/)
- **#65 他の CLI エージェントの会話を Hermes で続ける** — `hermes sessions import` で、Claude Code と Codex CLI のセッションが新しい順に並び、選んだものが Hermes のセッションになります。元のファイルは書き換えません。設定の移行は `hermes import-agent` です。
  - 元のポスト: https://x.com/witcheer/status/2096849498173530284
  - 関連: [セッション](https://wiki.winsmux.dev/hermes/docs/user-guide/sessions/)
- **#64 チームの AGENTS.md を触らずに自分用の指示を使う** — プロジェクトの `AGENTS.md` の隣に `AGENTS.override.md` を置くと、こちらが代わりに読み込まれます。共有の指示ファイルは書き換えずに済み、git の管理から外せば手元だけの設定になります。
  - 元のポスト: https://x.com/witcheer/status/2096481734388858931
  - 関連: [コンテキストファイル](https://wiki.winsmux.dev/hermes/docs/user-guide/features/context-files/)
- **#63 要約モデルが応答しないときにセッションを止めない** — 要約モデルが一定時間なにも返さないと、Hermes は待つのをやめます。`compression.context_timeout_seconds`（既定120秒）がその許容時間で、圧縮リクエスト自体のタイムアウトより短くはなりません。控えのモデルを設定していれば、1回だけやり直します。
  - 元のポスト: https://x.com/witcheer/status/2096128698147557524
  - 関連: [Hermes Agent の設定](https://wiki.winsmux.dev/hermes/docs/user-guide/configuration/)
- **#60 裏で別の作業を頼む `/bg` と、脇道の質問の `/btw`** — `/bg` はプロンプトを別のセッションで裏に回し、終わると結果が返ってきます。`/btw` はいまの会話について、進行中の作業を止めずに質問します。どちらもメッセージングのプラットフォームでも使えます。
  - 元のポスト: https://x.com/witcheer/status/2094664430814400740
  - 関連: [スラッシュコマンド早見表](https://wiki.winsmux.dev/hermes/docs/reference/slash-commands/) / [CLI 画面](https://wiki.winsmux.dev/hermes/docs/user-guide/cli/)
- **#53 4つの Markdown ファイルの役割を見分ける** — `SOUL.md` はエージェントの人格、`AGENTS.md` はプロジェクトごとの決まり、`MEMORY.md` はエージェント自身の覚え書き、`USER.md` は利用者の好みです。後の2つはエージェントが書きます。置き場所と読み込まれる時機は下のページにまとまっています。
  - 元のポスト: https://x.com/witcheer/status/2091778310783070649
  - 関連: [どのファイルが何をするのか](https://wiki.winsmux.dev/hermes/docs/user-guide/which-file-does-what/) / [コンテキストファイル](https://wiki.winsmux.dev/hermes/docs/user-guide/features/context-files/)
- **#52 しばらく間が空いた会話を、再開する前に要約する** — 長いスレッドに間を置いて戻ると、古い履歴を毎ターン読み直すことになります。`compression.idle_compact_after_seconds` に秒数を入れると、その時間やり取りがなかったセッションは最初の返信の前に要約されます。既定は0（無効）です。
  - 元のポスト: https://x.com/witcheer/status/2091520019318423801
  - 関連: [Hermes Agent の設定](https://wiki.winsmux.dev/hermes/docs/user-guide/configuration/)
- **#49 会話の要約が始まる位置をモデルごとに決める** — 会話の要約（圧縮）は、チャットに使うモデルのコンテキスト長に対する割合で始まります。割合は `compression.threshold` で決まり、モデルごとに変えたいときは `compression.model_thresholds` を使います。
  - 元のポスト: https://x.com/witcheer/status/2090030442363670584
  - 関連: [Hermes Agent の設定](https://wiki.winsmux.dev/hermes/docs/user-guide/configuration/) / [コンテキストの圧縮とキャッシュ](https://wiki.winsmux.dev/hermes/docs/developer-guide/context-compression-and-caching/)
- **#48 使わないツールを外して毎回のトークンを減らす** — 読み込んだツールの定義は、使わなくても毎回モデルに送られます。`config.yaml` の `platform_toolsets` でプラットフォームごとのツールを絞れます。変化は `hermes prompt-size` でトークンを使わずに確かめられます。
  - 元のポスト: https://x.com/witcheer/status/2089706892993941840
  - 関連: [ツールとツールセット](https://wiki.winsmux.dev/hermes/docs/user-guide/features/tools/) / [CLIコマンド一覧](https://wiki.winsmux.dev/hermes/docs/reference/cli-commands/)
- **#42 文脈を圧縮するときの要約を安いモデルに任せる** — 文脈を圧縮するときの要約は、既定では普段のチャットモデルが書きます。高いモデルを使っていると、費用も待ち時間もその分かかります。`auxiliary.compression` で速くて安いモデルに振り分けられます。
  - 元のポスト: https://x.com/witcheer/status/2086745372521591061
  - 関連: [Hermes Agent の設定](https://wiki.winsmux.dev/hermes/docs/user-guide/configuration/)
- **#31 毎回のメッセージに乗る固定の分量を確かめる** — `hermes prompt-size` は、会話の前に毎回送られるシステムプロンプト、スキルの索引、記憶、ツールの定義の大きさを内訳で示します。減らしたいときは `hermes tools` や `hermes skills` で使わないものを外します。
  - 元のポスト: https://x.com/witcheer/status/2081381590488568218
  - 関連: [CLIコマンド一覧](https://wiki.winsmux.dev/hermes/docs/reference/cli-commands/)
- **#25 `/goal` の「完了」をはっきり決めて渡す** — `/goal` は判定役のモデルが完了と判断するまで作業を続けます。完了の条件があいまいだと判定もあいまいになるので、`/goal draft` で取り決めを書かせるか、`verify:` や `stop when:` で条件を書き添えます。
  - 元のポスト: https://x.com/witcheer/status/2079195853634310372
  - 関連: [続く目標（Goal）](https://wiki.winsmux.dev/hermes/docs/user-guide/features/goals/)
- **#20 セッションを読める形や共有できる形で書き出す** — `hermes sessions export` は `--format` で形式を選べます。`md`／`qmd` は保管用、`html` は1ページで共有用です。外に出すときは `--redact` で鍵や認証情報を伏せ、1件だけなら `--session-id` を付けます。
  - 元のポスト: https://x.com/witcheer/status/2077015914361336050
  - 関連: [セッション](https://wiki.winsmux.dev/hermes/docs/user-guide/sessions/)
- **#19 保存した記憶は次のセッションで見えるようになる** — `MEMORY.md` と `USER.md` の写しはセッション開始時に一度だけ取られます。途中で保存した内容はすぐディスクに入りますが、プロンプトに入るのは次のセッションからです。今すぐ使うなら `/new` で始め直します。
  - 元のポスト: https://x.com/witcheer/status/2076670836891689174
  - 関連: [ずっと残る記憶](https://wiki.winsmux.dev/hermes/docs/user-guide/features/memory/)
- **#15 文脈の圧縮は履歴を消さず、作業メモに書き直す** — 長い会話が圧縮されると、あいだのやり取りは目標・制約・進み具合・決定事項・関係ファイル・次の手順といった決まった枠の要約に置き換わります。元のやり取りは `session_search` で探せます。
  - 元のポスト: https://x.com/witcheer/status/2074478482327806232
  - 関連: [コンテキストの圧縮とキャッシュ](https://wiki.winsmux.dev/hermes/docs/developer-guide/context-compression-and-caching/)
- **#13 セッションを溜め込む保存領域を軽く保つ方法** — セッションは `~/.hermes/state.db` に溜まります。終了したセッションを消すのが `hermes sessions prune` です。自動の整理 `sessions.auto_prune` は既定で有効で、履歴を全部残したいときは `false` にします。
  - 元のポスト: https://x.com/witcheer/status/2073728726496334163
  - 関連: [セッション](https://wiki.winsmux.dev/hermes/docs/user-guide/sessions/)
- **#4 エージェントの設定ファイル、どれが何を決めるか** — `SOUL.md` は人格、`USER.md` は使う人、`MEMORY.md` は覚えた事実です。プロジェクトの指示は `.hermes.md` → `AGENTS.override.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules` の順で最初の1つだけが読まれ、長すぎるファイルは切り詰められます。
  - 元のポスト: https://x.com/witcheer/status/2069385776756895880
  - 関連: [コンテキストファイル](https://wiki.winsmux.dev/hermes/docs/user-guide/features/context-files/) / [どのファイルが何をするのか](https://wiki.winsmux.dev/hermes/docs/user-guide/which-file-does-what/)
- **#3 保存した記憶が同じセッションで効かない理由** — 記憶はすぐディスクへ保存されますが、システムプロンプトに入る写しはセッション開始時に固定されます。キャッシュを保つための作りで、新しい記憶は次のセッションから反映されます。すぐ効かせたいときは `/new` です。
  - 元のポスト: https://x.com/witcheer/status/2069020659829608570
  - 関連: [ずっと残る記憶](https://wiki.winsmux.dev/hermes/docs/user-guide/features/memory/)
- **#2 🗜️ の数字の意味と、文脈の圧縮で残るもの・消えるもの** — 🗜️ は会話を自動要約した回数です。最初と直近は残り、あいだが要約されます。効き方は `config.yaml` の `protect_last_n`、`auxiliary.compression.model`、`model.context_length` で調整します。
  - 元のポスト: https://x.com/witcheer/status/2068027535955468533
  - 関連: [コンテキストの圧縮とキャッシュ](https://wiki.winsmux.dev/hermes/docs/developer-guide/context-compression-and-caching/) / [Hermes Agent の設定](https://wiki.winsmux.dev/hermes/docs/user-guide/configuration/)

## skill

- **#80 決まったスキルを毎回のセッションで最初から使う** — `config.yaml` の `skills.auto_load` に並べたスキルは、CLI・ゲートウェイ・cron などの新しいセッションで最初から読み込まれます。1回の起動だけなら `hermes -s <skill>` を使います。
  - 元のポスト: https://x.com/witcheer/status/2102275176138178793
  - 関連: [CLI 画面](https://wiki.winsmux.dev/hermes/docs/user-guide/cli/) / [Hermes Agent の設定](https://wiki.winsmux.dev/hermes/docs/user-guide/configuration/)
- **#72 エージェントが作るスキルの保存先を変える** — `config.yaml` の `skills.create_dir` に場所を書くと、エージェントが新しく作るスキルはそこへ保存されます。共有のリポジトリなどを指定できます。すでにあるスキルは元の場所のまま更新されます。
  - 元のポスト: https://x.com/witcheer/status/2099370347153805667
  - 関連: [スキルの仕組み](https://wiki.winsmux.dev/hermes/docs/user-guide/features/skills/)
- **#70 ほかのフォルダに置いたスキルもまとめて読み込む** — `config.yaml` の `skills` に `external_dirs` を足すと、共有リポジトリなど別の場所にあるスキルも読み込まれ、スラッシュコマンドで呼べます。同じ名前のスキルがあれば手元のものが優先されます。
  - 元のポスト: https://x.com/witcheer/status/2098679753960034724
  - 関連: [スキルの仕組み](https://wiki.winsmux.dev/hermes/docs/user-guide/features/skills/)
- **#68 スキル名をスラッシュコマンドとして直接呼ぶ** — 入っているスキルはどれも `/スキル名` で呼べます。`/humanizer` のあとに依頼を書くと、そのスキルを読み込んでから依頼を処理します。メッセージの先頭に複数並べれば、いくつものスキルを一度に使えます。
  - 元のポスト: https://x.com/witcheer/status/2097944804084556003
  - 関連: [スキルの仕組み](https://wiki.winsmux.dev/hermes/docs/user-guide/features/skills/)
- **#44 キュレーターによるスキル整理を以前の状態へ巻き戻す** — 統合の処理（`consolidate`）でスキルを書き換える前に、現役のスキルの控えが取られます。書庫入りのスキルや監査台帳は控えに入りません。`hermes curator rollback --list` で控えを一覧し、`hermes curator rollback` で戻せます。
  - 元のポスト: https://x.com/witcheer/status/2087482141118435477
  - 関連: [キュレーター](https://wiki.winsmux.dev/hermes/docs/user-guide/features/curator/)
- **#35 よく一緒に使うスキルを1つのコマンドにまとめる** — `hermes bundles create` でスキルをまとめると、`/<名前>` と打つだけで全部をまとめて読み込めます。まとめは `~/.hermes/skill-bundles/` の小さな YAML なので、共有やバージョン管理もしやすくなります。
  - 元のポスト: https://x.com/witcheer/status/2082882457339322828
  - 関連: [スキルの仕組み](https://wiki.winsmux.dev/hermes/docs/user-guide/features/skills/)
- **#17 スキルを入れる前に組み込みツールを確かめる** — 記憶、Web 検索、ブラウザ操作、定期実行、サブエージェントは最初から入っているツールです。同じ役割の外部スキルを入れる前に、組み込みツールの一覧で足りるかどうかを見ておくと重複を避けられます。
  - 元のポスト: https://x.com/witcheer/status/2075236387914166408
  - 関連: [組み込みツール一覧](https://wiki.winsmux.dev/hermes/docs/reference/tools-reference/)
- **#5 資料や作業をコマンド1つでスキルに変える** — `/learn` にフォルダ、ドキュメントの URL、直前の作業、貼ったメモを渡すと、再利用できるスキルを書き起こします。できた `SKILL.md` の説明文は毎回読み込まれるので、使う前に短く整えておきます。
  - 元のポスト: https://x.com/witcheer/status/2069828190197973337
  - 関連: [スキルの仕組み](https://wiki.winsmux.dev/hermes/docs/user-guide/features/skills/)

## 定期実行

- **#85 cron やボットの新しい作業をまとめて止める** — `hermes pause` を実行すると、cron の発火・kanban の振り分け・ゲートウェイの新しいターンがすべて始まらなくなります。`hermes resume` で元に戻ります。予想外の定期実行を見つけたときに使います。
  - 元のポスト: https://x.com/witcheer/status/2104227606614757460
  - 関連: [定期実行タスク（cron）](https://wiki.winsmux.dev/hermes/docs/user-guide/features/cron/) / [CLIコマンド一覧](https://wiki.winsmux.dev/hermes/docs/reference/cli-commands/)
- **#62 定期実行のジョブだけを、別の安いモデルで動かす** — `hermes config set cron.model <model>` で、個別に指定していない定期実行のジョブがすべてそのモデルで動きます。重いジョブだけ別のモデルにしたいときは `hermes cron edit <job_id> --model` で固定します。
  - 元のポスト: https://x.com/witcheer/status/2095722000907923465
  - 関連: [定期実行タスク（cron）](https://wiki.winsmux.dev/hermes/docs/user-guide/features/cron/)
- **#61 設定に問題のある定期実行はモデルを呼ばずに止まる** — 定期実行の前に、そのジョブが実行できるかが確かめられます。失敗すると `blocked_config` になり、通知は1回だけ届き、LLM は呼ばれません。次に正常に実行できれば自動で解除されます。
  - 元のポスト: https://x.com/witcheer/status/2095028256332271691
  - 関連: [定期実行タスク（cron）](https://wiki.winsmux.dev/hermes/docs/user-guide/features/cron/)
- **#55 前のジョブの出力を、次の定期実行のジョブへ渡す** — 定期実行のジョブは毎回まっさらなセッションで動きます。`context_from` に別のジョブの ID を指定すると、その直近の出力が実行時にプロンプトの先頭へ付きます。`continuity` なら自分の前回の出力が付きます。
  - 元のポスト: https://x.com/witcheer/status/2092527968140632114
  - 関連: [定期実行タスク（cron）](https://wiki.winsmux.dev/hermes/docs/user-guide/features/cron/)
- **#50 異常がないときは、定期実行の通知を送らない** — cron ジョブの応答が `[SILENT]` だと、配信先へは何も届きません。「問題なければ [SILENT] だけ返す」とプロンプトに書けば、異常があるときだけ通知が来ます。失敗の通知は `[SILENT]` では止まらず、宛先は `--failure-deliver` で変えられます。
  - 元のポスト: https://x.com/witcheer/status/2090697512097112274
  - 関連: [定期実行タスク（cron）](https://wiki.winsmux.dev/hermes/docs/user-guide/features/cron/) / [cron であらゆる作業を自動化する](https://wiki.winsmux.dev/hermes/docs/guides/automate-with-cron/)
- **#47 定期実行のプロンプトは会話の文脈なしで書く** — チャットでうまくいった作業を `/cron` で予約すると、結果が崩れることがあります。定期実行は会話の記憶がない新しいセッションで動くためです。URL・コマンド・守る条件をプロンプトの中に全部書いておきます。
  - 元のポスト: https://x.com/witcheer/status/2089275668949356763
  - 関連: [定期実行タスク（cron）](https://wiki.winsmux.dev/hermes/docs/user-guide/features/cron/)
- **#28 定期実行のジョブに作業ディレクトリを与える** — 定期実行のジョブは既定でどのリポジトリにも属さず、`AGENTS.md` も読み込みません。`hermes cron create` に `--workdir` を付けるか、チャットで場所を伝えると、そのディレクトリで動き、指示ファイルも読まれます。
  - 元のポスト: https://x.com/witcheer/status/2080346485745676561
  - 関連: [定期実行タスク（cron）](https://wiki.winsmux.dev/hermes/docs/user-guide/features/cron/)

## 承認と安全

- **#83 拒否されたコマンドの言い換えをやめさせる** — 審査役に続けて拒否されると、エージェントに作業を止めて報告し、手動の実行か `/approve` を頼むよう指示が出ます。回数は `approvals.denial_breaker_threshold`（既定3、0で無効）で決まります。
  - 元のポスト: https://x.com/witcheer/status/2103395194963980527
  - 関連: [Hermes Agent の設定](https://wiki.winsmux.dev/hermes/docs/user-guide/configuration/)
- **#78 危険なコマンドの審査役に自分のルールを足す** — 危なそうなコマンドは、実行前に別のモデルが承認・拒否・確認のどれかを判断します。`approvals.smart_policy` に書いたルールがその審査役の指示に加わり、「/etc の変更は必ず確認」のような方針を持たせられます。
  - 元のポスト: https://x.com/witcheer/status/2101606053800456228
  - 関連: [Hermes Agent の設定](https://wiki.winsmux.dev/hermes/docs/user-guide/configuration/)
- **#69 同じツール呼び出しの空回りを検知して止める** — 同じ呼び出しの失敗や、進展のない繰り返しを数え、しきい値で警告を入れます。ゲートウェイと cron では既定でターンを止めます。すべての環境で止めたいときは `tool_loop_guardrails.hard_stop_enabled` を `true` にします。
  - 元のポスト: https://x.com/witcheer/status/2098290534758408306
  - 関連: [Hermes Agent の設定](https://wiki.winsmux.dev/hermes/docs/user-guide/configuration/)
- **#51 スクリプトからの実行でもファイル変更を取り消せる** — `hermes chat --checkpoints` を付けて動かすと、ファイルを変える前の状態が保存されます。あとでそのフォルダでセッションを開けば `/rollback` で戻せます。保存状況は `hermes checkpoints status` で見られます。
  - 元のポスト: https://x.com/witcheer/status/2091175733750124856
  - 関連: [チェックポイントと /rollback](https://wiki.winsmux.dev/hermes/docs/user-guide/checkpoints-and-rollback/)
- **#41 何度も承認するコマンドを許可リストの候補にする** — `hermes approvals suggest` は過去の承認の履歴から、繰り返し許しているコマンドを許可リストの候補として番号付きで出します。そのままでは何も書かず、選んだものだけ `--apply` で反映します。
  - 元のポスト: https://x.com/witcheer/status/2086460177046286778
  - 関連: [セキュリティ](https://wiki.winsmux.dev/hermes/docs/user-guide/security/)
- **#40 root を渡さず、決まったコマンドだけ許す** — エージェントに特定のサービスの起動と停止だけをパスワードなしで許すには、そのユニットに絞った sudoers の規則を書きます。ほかのサービスで `sudo -n` がパスワードを求めることも確かめておきます。
  - 元のポスト: https://x.com/witcheer/status/2085640740353233270
- **#33 書き換えの前に自動で控えを取り、あとで戻す** — チェックポイントを有効にすると、書き込みや危ない操作の前にプロジェクトの状態を控えます。1回だけなら `hermes chat --checkpoints`、常に使うなら `checkpoints.enabled`。戻すときは `/rollback` です。
  - 元のポスト: https://x.com/witcheer/status/2082169101913604120
  - 関連: [チェックポイントと /rollback](https://wiki.winsmux.dev/hermes/docs/user-guide/checkpoints-and-rollback/)
- **#18 記憶とスキルの書き込みを承認してから反映させる** — 自動での学習は続けたまま、記憶やスキルの書き込みを確認してから反映させられます。`/memory approval on` と `/skills approval on` を有効にすると、新しい書き込みは承認するまで保留になります。
  - 元のポスト: https://x.com/witcheer/status/2075562193320292426
  - 関連: [ずっと残る記憶](https://wiki.winsmux.dev/hermes/docs/user-guide/features/memory/) / [スキルの仕組み](https://wiki.winsmux.dev/hermes/docs/user-guide/features/skills/)

## CLI とデスクトップ

- **#77 作業の終わりや確認待ちを端末のベルで知らせる** — `display.bell_on_complete` を有効にするとターンが終わったとき、`display.bell_on_prompt` なら承認などの確認待ちで端末のベルが鳴ります。SSH 越しでも鳴り、Ghostty などではデスクトップ通知も出ます。既定はオフです。
  - 元のポスト: https://x.com/witcheer/status/2101229280185270718
  - 関連: [Hermes Agent の設定](https://wiki.winsmux.dev/hermes/docs/user-guide/configuration/) / [CLI 画面](https://wiki.winsmux.dev/hermes/docs/user-guide/cli/)
- **#76 CLI の入力欄で vi のキー操作を使う** — `config.yaml` で `display.vim_mode: true` にすると、CLI の入力欄が vi のキー操作になります。Esc で NORMAL、i で INSERT に移り、ステータスバーの右端にモードが出ます。起動時に読まれるので CLI を再起動します。
  - 元のポスト: https://x.com/witcheer/status/2100853054970990803
  - 関連: [Hermes Agent の設定](https://wiki.winsmux.dev/hermes/docs/user-guide/configuration/)
- **#71 スクリプトからの one-shot 実行で会話を続ける** — `hermes -z` はスクリプト向けに質問を1回投げて終わる実行です。`--resume latest` を付けると直近のセッションの続きとして動きます。`latest` の代わりにセッションの ID やタイトルも使えます。
  - 元のポスト: https://x.com/witcheer/status/2099034806466015383
  - 関連: [CLIコマンド一覧](https://wiki.winsmux.dev/hermes/docs/reference/cli-commands/)
- **#67 サポート用の診断レポートを1コマンドで作る** — `hermes debug share` で、バージョン・システム情報・直近のログをまとめたレポートを作り、共有用の URL を受け取れます。アップロード前に秘密の値は伏せられます。`--local` なら手元に表示するだけ、`--nous` なら非公開の置き場へ送ります。
  - 元のポスト: https://x.com/witcheer/status/2097565476435992883
  - 関連: [CLIコマンド一覧](https://wiki.winsmux.dev/hermes/docs/reference/cli-commands/)
- **#37 複数のリポジトリを1つのプロジェクトにまとめる** — `hermes project create` で複数のフォルダに1つの名前を付けると、デスクトップのセッションがプロジェクトごとにまとまります。`add-folder` で追加、`use` で切り替え、`bind-board` でカンバンの盤と結びます。
  - 元のポスト: https://x.com/witcheer/status/2083587946574389358
  - 関連: [CLIコマンド一覧](https://wiki.winsmux.dev/hermes/docs/reference/cli-commands/)
- **#27 時間のかかる作業を別のセッションで裏に回す** — `/bg <プロンプト>` を送ると、別のセッションが並行して動き、手元のチャットはそのまま使えます。裏のエージェントは今の会話を知らないので、プロンプトは単体で分かるように書きます。モデルと設定は引き継がれます。
  - 元のポスト: https://x.com/witcheer/status/2079951218101891530
  - 関連: [CLI 画面](https://wiki.winsmux.dev/hermes/docs/user-guide/cli/) / [スラッシュコマンド早見表](https://wiki.winsmux.dev/hermes/docs/reference/slash-commands/)
- **#22 エージェントの作業を止めずに途中で方向を伝える** — `/steer` で送ったメモは、今のツール呼び出しが終わった時点でエージェントに届き、作業は中断されません。次のターンに回すなら `/queue`、作業中の Enter の動きを決めるなら `/busy` です。
  - 元のポスト: https://x.com/witcheer/status/2077799836804407715
  - 関連: [スラッシュコマンド早見表](https://wiki.winsmux.dev/hermes/docs/reference/slash-commands/)
- **#7 カーソルを奪わずに Mac を操作させる** — エージェントが裏でクリックや入力をしても、手元のカーソルは動きません。`hermes computer-use install` で入れ、画面収録とアクセシビリティを許可し、`hermes -t computer_use chat` で使います。
  - 元のポスト: https://x.com/witcheer/status/2070594190656815137
  - 関連: [コンピュータ操作](https://wiki.winsmux.dev/hermes/docs/user-guide/features/computer-use/)

## その他

- **#84 起動時の MCP サーバーの同時接続数を決める** — Hermes の起動時、設定した MCP サーバーへ接続する数に上限を設けられます。`mcp.discovery_concurrency`（既定4、0で無制限）を上げると早く揃い、小さいマシンでは下げると負荷が抑えられます。
  - 元のポスト: https://x.com/witcheer/status/2103850251220042077
  - 関連: [MCP（Model Context Protocol）](https://wiki.winsmux.dev/hermes/docs/user-guide/features/mcp/)
- **#79 指定したツールセットをすべての場所で止める** — `agent.disabled_toolsets` に並べたツールセットは、CLI とすべてのゲートウェイで外されます。プラットフォームごとの設定より後に効くので、一か所で確実に止められます。`web` や `memory` などを指定します。
  - 元のポスト: https://x.com/witcheer/status/2101910495888392672
  - 関連: [Hermes Agent の設定](https://wiki.winsmux.dev/hermes/docs/user-guide/configuration/)
- **#58 自分のログイン状態を使ってブラウザ作業を任せる** — 本物のプロファイルで見て回る機能を有効にすると、ふだんのブラウザのプロファイルの写しを使い、ログインが要るサイトも操作できます。元のブラウザではなく写しが動き、設定を戻すと次にブラウザを使うときに写しが消されます。
  - 元のポスト: https://x.com/witcheer/status/2093944377085219321
  - 関連: [ブラウザの自動操作](https://wiki.winsmux.dev/hermes/docs/user-guide/features/browser/)
- **#57 作業を子エージェントに分けて並行して進める** — 組み込みの `delegate_task` ツールで、独立した子エージェントに作業を任せられます。子は会話の文脈を持たずに始まるので、必要なパスや条件は指示に書き込みます。子だけ安いモデルで動かす設定もあります。
  - 元のポスト: https://x.com/witcheer/status/2093591294740168760
  - 関連: [サブエージェントへの委任](https://wiki.winsmux.dev/hermes/docs/user-guide/features/delegation/)
- **#54 セッション・プロジェクト・プロファイル・ボットの違い** — セッションは1つの会話、プロジェクトは作業フォルダのまとまりです。プロファイルは設定・記憶・スキル・履歴を別に持つ独立したエージェントで、デスクトップアプリの Bot Mode ではプロファイルがアバター付きのボットとして並びます。
  - 元のポスト: https://x.com/witcheer/status/2092200934608625728
  - 関連: [プロファイル: 複数のエージェントを動かす](https://wiki.winsmux.dev/hermes/docs/user-guide/profiles/) / [Hermes Desktop](https://wiki.winsmux.dev/hermes/docs/user-guide/desktop/)
- **#46 ブラウザ操作を1本のスクリプトでまとめて進める** — Browser Use モードでは、クリックごとにツールを呼ぶ代わりに、一連の操作をまとめて動かします。手元の Chrome とクラウドブラウザでは、これが既定のブラウザドライバです。詳しくはブラウザの自動操作のページへ。
  - 元のポスト: https://x.com/witcheer/status/2088204444391399722
  - 関連: [ブラウザの自動操作](https://wiki.winsmux.dev/hermes/docs/user-guide/features/browser/)
- **#45 OpenClaw の設定と記憶を Hermes へ移す** — OpenClaw の設定・記憶・スキルを Hermes へ取り込めます。`hermes claw migrate --dry-run` なら計画を見るだけです。API キーは `--migrate-secrets` を付けたときだけ移り、適用前に復元用の zip が作られます。
  - 元のポスト: https://x.com/witcheer/status/2087812081110147134
  - 関連: [OpenClaw から移ってくる](https://wiki.winsmux.dev/hermes/docs/guides/migrate-from-openclaw/)
- **#38 設定や環境の不調をコマンド1つで点検する** — `hermes doctor` は設定、依存関係、認証などを調べて問題を一覧にします。直せるものは `hermes doctor --fix` が自動で修復を試みます。更新のあとや調子がおかしいときに、まず走らせるコマンドです。
  - 元のポスト: https://x.com/witcheer/status/2084003270776041697
  - 関連: [CLIコマンド一覧](https://wiki.winsmux.dev/hermes/docs/reference/cli-commands/)
- **#36 Claude Code や Codex の設定をそのまま移す** — `hermes import-agent` は `~/.claude` や `~/.codex` を見つけ、指示・スキル・MCP サーバー・許可リストを Hermes の形に移します。API キーは読みません。書く前に計画が出て、`--dry-run` なら何も書きません。
  - 元のポスト: https://x.com/witcheer/status/2083360088593776765
  - 関連: [他のエージェントから取り込む](https://wiki.winsmux.dev/hermes/docs/user-guide/import-from-other-agents/)
- **#32 トークンやモデルの使い方を期間でまとめて振り返る** — `hermes insights` は手元のセッションの記録から、直近30日のトークン量、使ったモデル、プラットフォーム、よく使うツールをまとめて表示します。期間は `--days`、対象の絞り込みは `--source` で指定します。
  - 元のポスト: https://x.com/witcheer/status/2081822725325435386
  - 関連: [CLIコマンド一覧](https://wiki.winsmux.dev/hermes/docs/reference/cli-commands/)
- **#30 設定や記憶ごとエージェントを丸ごとバックアップする** — `hermes backup` は設定・記憶・スキル・セッションなどを zip にまとめ、動いている最中でも安全に取れます。戻すのは `hermes import`、重要なファイルだけ手早く取るなら `hermes backup --quick` です。
  - 元のポスト: https://x.com/witcheer/status/2081051573254549904
  - 関連: [CLIコマンド一覧](https://wiki.winsmux.dev/hermes/docs/reference/cli-commands/)
- **#12 カンバンのタスクが書いたファイルを消さずに残す方法** — カンバンのワーカーは既定で使い捨ての作業場所（scratch）で動き、タスクが終わると中身が消えます。残したいときはタスクを作るときに `--workspace dir:<絶対パス>` を付けます。相対パスは受け付けられません。
  - 元のポスト: https://x.com/witcheer/status/2073051003482456511
  - 関連: [カンバン（マルチエージェント盤）](https://wiki.winsmux.dev/hermes/docs/user-guide/features/kanban/)
- **#11 `all` だけではカンバンのツールが入らない** — チャットのエージェントにカンバンの盤を操作させたいとき、`all` を指定してもカンバンのツールは含まれません。`hermes -p <プロファイル> tools enable kanban` で名前を挙げて有効にし、新しいチャットを始めます。
  - 元のポスト: https://x.com/witcheer/status/2072698059788562587
  - 関連: [カンバン（マルチエージェント盤）](https://wiki.winsmux.dev/hermes/docs/user-guide/features/kanban/)
- **#9 プロファイルは設定ではなく別のエージェント** — プロファイルを作ると、記憶・セッション・スキル・ボットを別に持つ独立したエージェントになります。`hermes profile create <名前> --clone-all` は設定・記憶・スキルなどを写しますが、セッション履歴・cron ジョブ・ボットの接続設定は写しません。
  - 元のポスト: https://x.com/witcheer/status/2071924626561638757
  - 関連: [プロファイル: 複数のエージェントを動かす](https://wiki.winsmux.dev/hermes/docs/user-guide/profiles/)
- **#6 ディスクがいっぱいになる前に見ておきたい場所と片づけ方** — ディスクを圧迫するのはログより、状態のスナップショットや定期実行の出力のことがあります。同梱の `disk-cleanup` プラグインを有効にすると、一時ファイルや定期実行の出力を期限で片づけます。
  - 元のポスト: https://x.com/witcheer/status/2070141757707239594
  - 関連: [同梱のプラグイン](https://wiki.winsmux.dev/hermes/docs/user-guide/features/built-in-plugins/)
