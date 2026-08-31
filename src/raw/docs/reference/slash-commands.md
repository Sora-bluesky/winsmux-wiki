---
title: "スラッシュコマンド早見表"
description: "対話型 CLI とメッセージング両方のスラッシュコマンドを網羅した早見表"
upstream_path: reference/slash-commands.md
upstream_blob: 5405230994df1b3014d213fd4ed060731a2ae8c7
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/slash-commands
---

# スラッシュコマンド早見表 {#slash-commands-reference}

Hermes のスラッシュコマンドには 2 つの入り口があり、どちらも `hermes_cli/commands.py` にある中央の `COMMAND_REGISTRY` が動かしています。

- **対話型 CLI のスラッシュコマンド** — `cli.py` が処理し、補完候補はレジストリから出てきます
- **メッセージングのスラッシュコマンド** — `gateway/run.py` が処理し、ヘルプ文とプラットフォームのメニューはレジストリから生成されます

インストール済みのスキルも、どちらの入り口でも動的なスラッシュコマンドとして現れます。（`/plan` はかつてこの一種でしたが、今は組み込みコマンドです。後述のセッションの表を見てください。）

## 権限と管理者・一般ユーザーの切り分け {#permissions-and-adminuser-split}

ユーザーごとの許可リストに対応しているメッセージングプラットフォーム（Telegram、Discord、Slack、Matrix、Mattermost、Signal など）は、スラッシュコマンドを二段階に分ける仕組みにも対応しています。**管理者**は登録済みのコマンドをすべて使え、**一般ユーザー**は `user_allowed_commands` に挙げた名前だけを使えます（これに加えて常に許可される最低ラインとして `/help` と `/whoami` があります）。設定は `~/.hermes/gateway-config.yaml` の各プラットフォームの `extra:` ブロックの中で、`allow_admin_from` と `user_allowed_commands`（グループ向けの対応物である `group_allow_admin_from` / `group_user_allowed_commands`）を書きます。

例はプラットフォームごとのドキュメントを見てください。構造はどのプラットフォームでも同じです。

- [Telegram](/hermes/docs/user-guide/messaging/telegram/#slash-command-access-control)
- [Discord](/hermes/docs/user-guide/messaging/discord/)
- [Slack](/hermes/docs/user-guide/messaging/slack/)
- [Matrix](/hermes/docs/user-guide/messaging/matrix/)
- [Mattermost](/hermes/docs/user-guide/messaging/mattermost/)
- [Signal](/hermes/docs/user-guide/messaging/signal/)

ある範囲で `allow_admin_from` を設定していない場合、その範囲は制限なしの後方互換モードのままになり、許可されたユーザー全員がすべてのコマンドを実行できます。

## 対話型 CLI のスラッシュコマンド {#interactive-cli-slash-commands}

CLI で `/` を打つと補完メニューが開きます。組み込みコマンドは大文字小文字を区別しません。

### セッション {#session}

| コマンド | 説明 |
|---------|-------------|
| `/new [name]`（別名: `/reset`） | 新しいセッションを始めます（セッション ID と履歴が新しくなります）。`[name]` を付けるとセッションの初期タイトルになります。たとえば `/new my-experiment` なら、最初から `my-experiment` という名前が付いた新しいセッションが開くので、あとから `/resume` や `/sessions` で見つけやすくなります。末尾に `now`、`--yes`、`-y` を足すと確認ダイアログを飛ばせます（例: `/reset now`、`/new --yes my-experiment`）。 |
| `/clear` | 画面を消して新しいセッションを始めます |
| `/history` | 会話の履歴を表示します（`/timestamps` の設定に従います） |
| `/save` | 今の会話を保存します |
| `/prompt`（別名: `/compose`） | 次に送るプロンプトを、その場の入力欄ではなく `$EDITOR`（markdown）で書きます。長いプロンプト、複数行のプロンプト、書式を整えたいプロンプトに向いています。 |
| `/retry` | 直前のメッセージを送り直します（エージェントに再送します） |
| `/undo` | 直前のユーザーとアシスタントのやり取りを取り消します |
| `/title` | 今のセッションにタイトルを付けます（書き方: /title My Session Name） |
| `/compress [here [N] \| focus topic]` | 会話のコンテキストを手動で圧縮します（記憶を書き出してから要約します）。`/compress here [N]` は直近 N 往復（既定は 2）だけをそのまま残し、それ以外を要約します。圧縮の境目を自分で決められます。focus のトピックを付けると、全体要約で何を残すかを絞り込めます。 |
| `/rollback` | ファイルシステムのチェックポイントを一覧表示、または復元します（書き方: /rollback [number]） |
| `/diff [staged\|all\|session] [--stat] [path...]` | 作業ディレクトリの git の変更を表示します。既定では、ステージしていない変更と追跡外のファイルを出します。`staged` はコミット待ちの内容、`all` は HEAD からのすべて、`session` はここで Hermes が変更したものの累積差分（保持されている最古のチェックポイントを基準にします。チェックポイントを有効にしている必要があり、`/rollback diff <N>` を補うものです）を表示します。`--stat` は変更されたファイルの要約だけを出し、パスを引数に渡すと差分の対象を絞れます。 |
| `/snapshot [create\|restore <id>\|prune]`（別名: `/snap`） | Hermes の設定・状態のスナップショットを作る、または復元します。`create [label]` で保存、`restore <id>` でその時点に戻し、`prune [N]` で古いものを削除します。引数なしなら一覧を出します。データベースの復元は SQLite のバックアップ API を通して書き込むので、動いているプロセス（ゲートウェイ、ダッシュボード）からも復元後のデータが安全に見えます。他のプロセスがデータベースを開いたままでこの経路が失敗した場合、破損の危険を冒すより復元を断ります。掴んでいるプロセスを止めてからやり直してください。 |
| `/stop` | 動いているバックグラウンドプロセスをすべて止めます |
| `/queue <prompt>`（別名: `/q`） | 次のターンに送るプロンプトを予約します（今動いているエージェントの返答は中断しません）。 |
| `/steer <prompt>` | 実行の途中で、**次のツール呼び出しの後に**エージェントへ届くメモを差し込みます。中断も、新しいユーザーターンも起きません。テキストは今のツールが終わった時点で直前のツール結果の内容に追記され、ツール呼び出しのループを壊さずにエージェントへ新しい文脈を渡せます。作業の途中で方向を微調整したいとき（たとえばテスト実行中に「認証まわりに集中して」と伝えたいとき）に使います。 |
| `/goal <text>` | Hermes がターンをまたいで目指し続ける常設の目標を設定します。Ralph ループに対する Hermes なりの答えです。各ターンの後に補助の判定モデルが目標の達成可否を判断し、まだなら Hermes が自動で続けます。サブコマンドは `/goal status`、`/goal pause`、`/goal resume`、`/goal clear` です。予算は既定で 20 ターン（`goals.max_turns`）。ユーザーが実際にメッセージを送ると継続ループより優先され、状態は `/resume` しても残ります。ひととおりの流れは [常設の目標](/hermes/docs/user-guide/features/goals/) を見てください。 |
| `/subgoal <text>` | ループの途中で、ユーザーが決めた条件を今の目標に追加します。継続用のプロンプトはすべてのサブゴールをそのままエージェントに見せ、判定モデルも DONE / CONTINUE の判断材料に入れます。つまり、元の目標**と**すべてのサブゴールが満たされるまで目標は完了になりません。サブコマンドは `/subgoal`（一覧）、`/subgoal remove <N>`、`/subgoal clear` です。`/goal` が動いている必要があります。 |
| `/heartbeat every <interval> <prompt>`（別名: `/hb`） | 繰り返し送られるプロンプトを設定します。**このセッション**が待機中で、指定した間隔が過ぎるたびに、普通のユーザーターンとして入ってきます（最短 60 秒。取りこぼした分はまとめられます）。サブコマンドは `/heartbeat status`、`/heartbeat pause`、`/heartbeat resume`、`/heartbeat clear` です。セッション内・プロセス内で完結する仕組みなので、独立して確実に動く定期実行が欲しいときは `hermes cron` を使ってください。[セッションのハートビート](/hermes/docs/user-guide/features/heartbeat/) も見てください。 |
| `/refine [focus]` | ターン後の自動実行を待たず、記憶とスキルの自己改善レビューを**今すぐ**走らせます。focus のテキストを付けるとレビューの方向を指定できます（例: `/refine save the deploy workflow as a skill`）。会話のスナップショットに対してバックグラウンドのフォークで動くので、動いているセッションとプロンプトキャッシュには手を付けません。終わったら結果が報告されます。 |
| `/review [instructions]` | 独立した、完全な権限を持つレビュー用サブエージェントを立ち上げ、直前まで話していた成果物をレビューさせます。PR でも、コードでも、ドキュメントでも、直近 10 件のチャットで触れたものなら何でも対象になります。サブエージェントはバックグラウンドで調べ（PR を開き、差分を読み、コードを動かし）、レビュー全文はバックグラウンドサブエージェントの完了通知としてこのセッションに戻ってくるので、主エージェントがそれを踏まえて動けます。レビュー専用のモデルを固定したいときは config.yaml の `auxiliary.review` を設定します（既定はメインのモデルです）。[サブエージェントへの委任](/hermes/docs/user-guide/features/delegation/#the-review-command) も見てください。 |
| `/moa <prompt>` | プロンプトを 1 つ、既定の [Mixture of Agents](/hermes/docs/user-guide/features/mixture-of-agents/) プリセットで実行してから、今のモデルに戻します。単発なので、セッションのモデルは変わりません。 |
| `/resume [name]` | 名前を付けて保存したセッションを再開します |
| `/sessions`（TUI での別名: `/switch`） | 従来の CLI では、過去のセッションを対話的なピッカーで選んで再開します。TUI では、今開いている TUI セッションのライブ切り替え画面を開きます。TUI で `/sessions new` を使うと、その場でもう 1 つライブセッションを始められます。 |
| `/egress [status]` | Docker の egress プロキシの状態（有効かどうか、設定済みかどうか、動いているかどうか、認証情報の取得元、トークンの対応付け、まだカバーできていないプロバイダ、次にやるべき対処）を表示します。CLI、TUI、デスクトップのチャット、メッセージングゲートウェイのどれでも使えます。 |
| `/redraw` | 画面全体を描き直します（tmux のリサイズ後の表示のずれや、マウス選択の残骸などから回復できます） |
| `/status` | セッションの情報（モデル、プロバイダ、プロファイル、セッション ID、作業ディレクトリ、タイトル、作成・更新の時刻、トークンの合計、エージェントが動いているかどうか）を表示し、続けてローカルで作った **Session recap** のブロックを出します（直近のユーザー・アシスタントのターン数、ツール結果の件数、よく使ったツール、最近触ったファイル、最新のユーザープロンプト、最新のアシスタントの返答）。この要約はメモリ上の会話からローカルで計算するので、LLM の呼び出しもプロンプトキャッシュへの影響もありません。 |
| `/context [all]`（別名: `/ctx`） | コンテキストウィンドウの内訳を目に見える形で出します。CLI と TUI では 5×20 のブロックのマス目（1 マスがモデルのウィンドウの約 1% にあたります）と、カテゴリごとの推定値の表（システムプロンプト、ツール定義、ルール、スキルの索引、MCP、サブエージェント、記憶、会話）を空き容量と並べて表示します。メッセージングプラットフォームでは、自動圧縮のしきい値と余裕を示すゲージ、圧縮の統計、累積のやり取り量、そして同じカテゴリ表をテキストで出します。`/context all` を使うと、スキルごと・ツールセットごとのコスト一覧（索引のコストと SKILL.md 読み込みのコスト、ツールセットごとのスキーマのトークン数）が加わります。読み取り専用でローカルで計算するので、LLM の呼び出しもプロンプトキャッシュへの影響もありません。 |
| `/agents`（別名: `/tasks`） | 今のセッションで動いているエージェントとタスクを表示します。 |
| `/bg <prompt>` | プロンプトを別のバックグラウンドセッションで実行します。エージェントが独立して処理するので、今のセッションは他の作業に使えます。タスクが終わると結果がパネルで出ます。[CLI のバックグラウンドセッション](/hermes/docs/user-guide/cli/#background-sessions) も見てください。 |
| `/btw <question>` | 進行中の会話を止めずに、**今の会話について**ちょっとした質問をします。読み取り専用の記録のスナップショットに対して補助の LLM を 1 回呼んで答えるので、動いているセッションの履歴とプロンプトキャッシュには触れず、今のターンもそのまま続きます。まっさらな文脈で別の作業をさせたいときは `/bg` を使ってください。 |
| `/branch [name]`（別名: `/fork`） | 今のセッションを分岐させます（別の道を試せます） |
| `/worktree [new [name]\|list]` | **CLI 専用。** セッションの途中で、隔離された git の worktree を確認したり作ったりします（Copilot CLI の `/worktree new` に着想を得ています）。引数なしの `/worktree` は今の worktree を表示し、`/worktree list` はリポジトリの worktree を並べ、`/worktree new [name]` は `.worktrees/` の下に worktree を作って（取得したてのリモートの先端から分岐し、`worktree_sync` の設定に従います）、セッションのターミナルとファイル系のツールをそこへ向け直します。名前を付けたものはその名前を使い（ブランチは `hermes/<name>`）、付けなかったものはランダムな `hermes-<id>` になります。終了時、push していないコミットがある場合だけ worktree は残ります。`hermes -w` と同じライフサイクルです。[Git の worktree](/hermes/docs/user-guide/git-worktrees/) も見てください。 |
| `/handoff <platform>` | **CLI 専用。** 今のセッションをメッセージングプラットフォーム（Telegram、Discord、Slack、WhatsApp、Signal、Matrix）へ引き継ぎます。ゲートウェイがすぐに受け取り、スレッドに対応しているプラットフォームでは新しいスレッドを作り（Telegram のトピック、Discord のテキストチャンネルのスレッド、Slack のメッセージに紐づくスレッド）、引き継ぎ先を CLI の session_id に結び直して、役割込みの記録をまるごと再生します。さらに合成のユーザーターンを 1 つ差し込むので、エージェントが新しい場所で動いていることを確認できます。成功すると CLI は `/resume` のヒントを出してきれいに終了します。ローカルではいつでも `/resume <title>` で再開できます。ターンの途中では断られます。ゲートウェイが動いていることと、引き継ぎ先のプラットフォームにホームチャンネルが設定されていること（引き継ぎ先のチャットで `/sethome` を実行）が必要です。[プラットフォームをまたぐ引き継ぎ](/hermes/docs/user-guide/sessions/#cross-platform-handoff) も見てください。 |
| `/journey [list\|delete <id>\|edit <id>]`（別名: `/learning`、`/memory-graph`） | 覚えたスキルと記憶をたどる学習の道のりのタイムラインを開きます。従来の CLI、TUI のオーバーレイ、デスクトップアプリ（Star Map パネル）で使えます。メッセージングプラットフォームでは使えません。[学習の道のり](/hermes/docs/user-guide/features/memory/#learning-journey-journey) も見てください。 |

### 設定 {#configuration}

| コマンド | 説明 |
|---------|-------------|
| `/config` | 今の設定を表示します |
| `/model [model-name]` | 今のモデルを表示、または変更します。`/model claude-sonnet-4`、`/model provider:model`（プロバイダの切り替え）、`/model custom:model`（独自のエンドポイント）、`/model custom:name:model`（名前を付けた独自プロバイダ）、`/model custom`（エンドポイントから自動判別）、そしてユーザーが決めた別名（`/model fav`、`/model grok`。[モデルの別名を自分で決める](#custom-model-aliases) を参照）に対応します。フラグは、`--global` で config.yaml に変更を残す、`--session` でセッション限りにする、`--once` で次のターンだけに適用する、`--refresh` でプロバイダのモデル一覧を取り直す、`--provider <name>` でバックエンドを切り替える（`--global` がなければセッション限り）です。単に `/model <name>` と書いた場合は、`model.persist_switch_by_default: true` を設定していない限りセッション限りです。**対話的なピッカー:** 引数なしで `/model` を実行するとプロバイダ→モデルのピッカーが開きます。モデルの一覧では**入力してあいまい検索で絞り込め**（たとえば `grok` と打つと該当するモデルだけになります）、Backspace で絞り込みを縮め、Esc で消せます（またはピッカーを閉じます）。選択は必ず 1 つの具体的なモデルに落ち着きます。絞り込みは一覧を狭めるだけで、推測はしません。**注意:** `/model` は、すでに設定済みのプロバイダの間でしか切り替えられません。新しいプロバイダを追加するには、セッションを抜けてターミナルから `hermes model` を実行してください。**費用に関する注意:** 会話の途中でモデルを切り替えるとプロンプトキャッシュがリセットされます。キャッシュのキーにモデルが含まれるので、次のターンは会話全体を、約 75% 割引のキャッシュ料金ではなく入力の全額で読み直すことになります。想定どおりの挙動で避けようがありませんが、長いセッションでは知っておく価値があります。 |
| `/codex-runtime [auto\|codex_app_server\|on\|off]` | OpenAI / Codex のモデル向けに、任意で使える [Codex app-server ランタイム](/hermes/docs/user-guide/features/codex-app-server-runtime/) を切り替えます。`auto`（既定）は Hermes の標準のチャット補完を使い、`codex_app_server` は `codex app-server` のサブプロセスにターンを渡して、ネイティブのシェル、apply_patch、ChatGPT のサブスクリプション認証、移行済みの Codex プラグインを使えるようにします。次のセッションから有効になります。 |
| `/personality` | あらかじめ用意された人格を設定します。`/personality none`（または `default` / `neutral`）で重ねた人格を外し、素の振る舞いに戻します。 |
| `/verbose` | ツールの進捗表示を切り替えます。off → new → all → verbose と順に回ります。設定によって[メッセージングでも有効にできます](#notes)。 |
| `/focus [on\|off\|status]` | **フォーカス表示**を切り替えます。表示だけを絞るモードで、自分のプロンプトと最終的な返答だけを見せます。`/verbose` と組み合わさり、有効にするとツールの進捗表示が `off` に固定され、それまでのモードを覚えておきます。`/focus off` で元に戻ります。各ターンの終わりに戻し方を示す薄い 1 行（`⋯ 7 tool lines hidden · /focus off to show`）が出て、ステータスバーには `◉ focus` のバッジが出続けるので、絞り込み表示中であることが常にわかります。モデルへの送信内容は何も変わりません。詳細は隠れるだけで、捨てられることはありません。 |
| `/fast [normal\|fast\|status]` | 高速モード（OpenAI の Priority Processing、Anthropic の Fast Mode）を切り替えます。選べるのは `normal`、`fast`、`status` です。 |
| `/reasoning [level\|show\|hide\|full\|clamp] [--global]` | 推論の深さと表示を管理します。レベルには `none` / `minimal` / `low` / `medium` / `high` / `xhigh` / `max` / `ultra` があります。`show` / `hide`（または `on` / `off`）で推論の表示を切り替え、`full` と `clamp` で見せ方を調整します。`--global` を付けると深さの設定を config に残します。 |
| `/skin` | 表示のスキン・テーマを表示、または変更します |
| `/export [profile] [-o out.tar.gz]` | **CLI 専用。** プロファイルを共有できる `.tar.gz` にまとめます。スキル、記憶、ペルソナ、cron、プラグイン、設定、そして（デスクトップからなら）テーマとレイアウトが入ります。認証情報（`auth.json`、`.env`）は取り除かれます。既定では今使っているプロファイルを対象にし、今のディレクトリに `<name>.tar.gz` を作ります。`hermes profile export` と同じ書庫です。版を管理して更新もできる共有をしたい場合は、代わりに[プロファイル配布](/hermes/docs/user-guide/profile-distributions/)を使ってください。 |
| `/import <archive.tar.gz> [--name <name>]` | **CLI 専用。** プロファイルの書庫を新しいプロファイルとして取り込みます。`--name` を指定しない限り、名前は書庫から推測します。既存のプロファイルの上書きは断り、`default` としての取り込みもできません。名前が空いていればシェルのラッパーも作ります。[プロファイルのファイルを書き出す・取り込む](/hermes/docs/user-guide/profile-distributions/#export-and-import-a-profile-file) も見てください。 |
| `/statusbar`（別名: `/sb`） | コンテキストとモデルのステータスバーの表示を切り替えます |
| `/battery [on\|off\|status]` | ステータスバーの先頭に、色分けしたバッテリー残量を出すかどうかを切り替えます（既定は off。バッテリーがない環境では何も起きません）。 |
| `/voice [on\|off\|tts\|status]` | CLI の音声モードと読み上げを切り替えます。録音には `voice.record_key`（既定: `Ctrl+B`）を使います。 |
| `/yolo` | YOLO モードを切り替えます。危険なコマンドの承認確認をすべて飛ばします。 |
| `/approvals [manual\|smart\|off]` | 危険なコマンドの承認モード（設定に残るもの）を表示、または設定します。 |
| `/footer [on\|off\|status]` | 最終的な返答に付くゲートウェイの実行情報のフッター（モデル、コンテキストの使用率、作業ディレクトリ）を出すかどうかを切り替えます。 |
| `/busy [queue\|steer\|interrupt\|status]` | Hermes が作業している最中にメッセージを送ったときの動きを決めます。新しいメッセージを予約する、ターンの途中で方向を伝える、すぐ中断する、のいずれかです。CLI とメッセージングゲートウェイの両方で使えます。 |
| `/indicator [kaomoji\|emoji\|unicode\|ascii]` | CLI 専用。TUI の処理中インジケーターの見た目を選びます。 |
| `/timestamps [on\|off\|status]` | CLI 専用。メッセージと `/history` に `[HH:MM]` の時刻を出すかどうかを切り替えます。 |
| `/wake [on\|off\|status]` | CLI 専用。「Hey Hermes」というウェイクワードの待ち受けを切り替えます。 |

### ツールとスキル {#tools-skills}

| コマンド | 説明 |
|---------|-------------|
| `/tools [list\|disable\|enable] [name...]` | ツールを管理します。使えるツールを一覧表示したり、今のセッションで特定のツールを無効・有効にしたりできます。ツールを無効にするとエージェントの持ち道具から外れ、セッションがリセットされます。 |
| `/toolsets` | 使えるツールセットを一覧表示します |
| `/browser [connect\|disconnect\|status]` | ローカルの Chromium 系ブラウザとの CDP 接続を管理します。`connect` は動いている Chrome、Brave、Chromium、Edge にブラウザ系ツールをつなぎます（既定は `http://127.0.0.1:9222`）。`disconnect` は切り離します。`status` は今の接続を表示します。デバッガが見つからない場合は、対応している Chromium 系ブラウザを自動で起動します。 |
| `/skills` | オンラインのレジストリからスキルを検索、インストール、確認、管理します。スキルの書き込み承認ゲートを確認する場所でもあります: `/skills pending`、`/skills diff <id>`、`/skills approve <id>`、`/skills reject <id>`、`/skills approval on\|off`。[エージェントによるスキルの書き込みにゲートをかける](/hermes/docs/user-guide/features/skills/#gating-agent-skill-writes-skillswrite_approval) も見てください。 |
| `/memory [pending\|approve\|reject\|approval]` | 書き込み承認ゲート（`memory.write_approval`）が保留にした記憶の書き込みを確認し、ゲート自体の入り切りもできます。[記憶の書き込みを制御する](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval) も見てください。 |
| `/bundles` | 設定済みのスキルバンドル（複数のスキルをまとめて読み込む `/<name>` というスラッシュの別名）を一覧表示します。`~/.hermes/config.yaml` の `bundles:` の下で設定します。[スキルバンドル](/hermes/docs/user-guide/features/skills/#skill-bundles) も見てください。 |
| `/learn <what to learn from>` | 説明したものから、繰り返し使えるスキルを抽出します。ディレクトリでも、URL でも、いま一緒に進めた手順でも、貼り付けたメモでも構いません。形式は自由で、エージェントが自分のツールで材料を集め、社内の執筆基準に沿って `SKILL.md` を書きます。CLI、メッセージングゲートウェイ、TUI、ダッシュボードの Skills ページで使えます。 |
| `/plan [task]` | 実装計画を markdown で書き、動いているワークスペースの `.hermes/plans/` に保存します。計画だけで、実行はしません。引数を空にすると会話からタスクを推測します。（以前はバンドルされた `plan` スキルでしたが、Telegram や Discord のコマンドメニューの上限に引っかからないよう組み込みになりました。） |
| `/init [notes]` | リポジトリを走査して `AGENTS.md` のプロジェクト指示を生成、または更新します（Codex の `/init` の移植です）。エージェントが読み取り専用のツールでマニフェスト、構成、ツールチェーンの設定を調べ、簡潔な `AGENTS.md` を書きます。すでにある場合は、書いてある内容を保ったままマージして更新します。notes を付けると重点を指定できます。CLI、メッセージングゲートウェイ、TUI で使えます。 |
| `/cron` | 定期タスクを管理します（一覧、追加・作成、編集、一時停止、再開、実行、削除） |
| `/suggestions [accept\|dismiss N\|catalog\|clear]`（別名: `/suggest`） | 提案された自動化を確認します。`/suggestions` で保留中の提案を一覧表示し、`/suggestions accept <id>` で提案された自動化を作り、`/suggestions dismiss <id>` で却下し、`/suggestions catalog` で選りすぐりの入門用自動化を追加し、`/suggestions clear` で処理済みの提案の記録を消します。受け入れたジョブは、今いる場所を配信元として引き継ぎます。 |
| `/blueprint [name] [slot=value ...]`（別名: `/bp`） | ひな形から自動化を設定します。引数なしの `/blueprint` はカタログを一覧表示し、`/blueprint <name>` は次のエージェントのターンで案内付きの入力の流れを始め、`/blueprint <name> slot=value ...` はジョブを直接作ります。 |
| `/curator` | バックグラウンドでのスキルの手入れです。`status`、`run`、`pin`、`archive` があります。[Curator](/hermes/docs/user-guide/features/curator/) も見てください。 |
| `/kanban <action>` | 複数のプロファイル・複数のプロジェクトにまたがる共同作業ボードを、チャットから離れずに操作します。`hermes kanban` でできることはひととおり使えます: `/kanban list`、`/kanban show t_abc`、`/kanban create "title" --assignee X`、`/kanban comment t_abc "text"`、`/kanban unblock t_abc`、`/kanban dispatch` など。複数ボードにも対応しています: `/kanban boards list`、`/kanban boards create <slug>`、`/kanban boards switch <slug>`、`/kanban --board <slug> <action>`。[Kanban のスラッシュコマンド](/hermes/docs/user-guide/features/kanban/#kanban-slash-command) も見てください。 |
| `/reload-mcp`（別名: `/reload_mcp`） | config.yaml から MCP サーバーを読み直します |
| `/reload-skills`（別名: `/reload_skills`） | `~/.hermes/skills/` を走査し直して、新しく入れたスキルや消したスキルを反映します |
| `/reload` | `.env` の変数を動いているセッションに読み直します（再起動せずに新しい API キーを拾えます） |
| `/plugins` | インストール済みのプラグインとその状態を一覧表示します |
| `/pet [list\|<slug>]` | [petdex](/hermes/docs/user-guide/features/pets/) のマスコットを切り替える、または迎え入れます。`/pet` でペインを開閉し、`/pet list` でインストール済みのペットを表示し、`/pet <slug>` で特定のペットを迎え入れます。 |
| `/hatch <description>`（別名: `/generate-pet`） | 設定した画像生成バックエンド（OpenRouter / Nous Portal）を使い、テキストの説明からまったく新しい petdex のペットを作ります。[ペット](/hermes/docs/user-guide/features/pets/) も見てください。 |

### 情報 {#info}

| コマンド | 説明 |
|---------|-------------|
| `/help` | 使えるコマンドをカテゴリごとにまとめて表示します。既定では中心的なコマンドを表示し、スキルのコマンドは件数を 1 行にまとめます。`/help skills` でスキルのコマンドをすべて並べ、`/help <text>` で部分一致によりコマンド（と該当するスキル）を絞り込めます。 |
| `/palette` | あいまい検索のコマンドパレットを開きます（**Ctrl+P** でも開きます）。入力するとすべてのコマンドとスキルが絞り込まれ、↑ / ↓ で移動し、Enter で選んだコマンドを入力欄に挿入します（自動では実行しません）。Esc で取り消します。並び順はコマンド名を優先するので、短い入力でも狙いが外れません。 |
| `/version` | Hermes Agent のバージョン、ビルド、環境の情報を表示します。 |
| `/whoami` | 自分のスラッシュコマンドの権限（管理者 / 一般ユーザー）を表示します。 |
| `/usage` | トークンの使用量、費用の内訳、セッションの経過時間を表示し、使っているプロバイダが対応していれば、そのプロバイダの API から取ってきた残りの利用枠・クレジット・プランの消費を示す **Account limits** の節も出します。 |
| `/topup` | Nous の残高を表示し、ポータルで支払いを管理します（以前の `/credits` と `/billing` を置き換えたものです）。 |
| `/subscription`（別名: `/upgrade`） | **CLI 専用。** Nous のプランを確認し、ブラウザで変更します。 |
| `/insights` | 使用状況の分析結果を表示します（直近 30 日） |
| `/update` | Hermes Agent を最新版に更新します。 |
| `/platforms`（別名: `/gateway`） | ゲートウェイとメッセージングプラットフォームの状態を表示します（CLI 専用のまとめ表示です）。 |
| `/paste` | クリップボードの画像を添付します |
| `/copy [number]` | 直前のアシスタントの返答をクリップボードにコピーします（数字を付けると、後ろから N 番目をコピーします）。CLI 専用です。 |
| `/image <path>` | 次のプロンプトのためにローカルの画像ファイルを添付します。 |
| `/debug` | デバッグ用の報告（システム情報とログ）をアップロードし、共有できるリンクを受け取ります。メッセージングでも使えます。 |
| `/update` | Hermes Agent を最新版に更新します。 |
| `/profile` | 今使っているプロファイル名とホームディレクトリを表示します |

### 終了 {#exit}

| コマンド | 説明 |
|---------|-------------|
| `/quit` | CLI を終了します（`/exit` でも同じです）。 |

### 動的な CLI スラッシュコマンド {#dynamic-cli-slash-commands}

| コマンド | 説明 |
|---------|-------------|
| `/<skill-name>` | インストール済みのスキルを、必要なときに呼び出すコマンドとして読み込みます。例: `/gif-search`、`/github-pr-workflow`、`/excalidraw`。 |
| `/skills ...` | レジストリと公式の任意スキルのカタログから、スキルを検索、閲覧、確認、インストール、監査、公開、設定します。 |

### クイックコマンド {#quick-commands}

ユーザーが決めるクイックコマンドは、短いスラッシュコマンドをシェルのコマンドか別のスラッシュコマンドに割り当てるものです。`~/.hermes/config.yaml` で設定します。

```yaml
quick_commands:
  status:
    type: exec
    command: systemctl status hermes-agent
  deploy:
    type: exec
    command: scripts/deploy.sh
  inbox:
    type: alias
    target: /gmail unread
```

こうしておくと、CLI やメッセージングプラットフォームで `/status`、`/deploy`、`/inbox` と打てます。クイックコマンドは実行時に解決されるので、組み込みの補完やヘルプの表にはすべてが出てくるとは限りません。

文字列だけのプロンプトの短縮は、クイックコマンドとしては使えません。長めの使い回すプロンプトはスキルに入れるか、`type: alias` で既存のスラッシュコマンドを指してください。

### モデルの別名を自分で決める {#custom-model-aliases}

よく使うモデルに自分で短い名前を付けておくと、CLI でもどのメッセージングプラットフォームでも `/model <alias>` で呼び出せます。別名はどちらでも同じように動き、セッション限り（既定）でも `--global` の切り替えでも使えます。

設定の書き方は 2 通りあります。

**完全な形** — モデル、プロバイダ、必要ならベース URL まで固定します。`~/.hermes/config.yaml` に書きます。

```yaml
model_aliases:
  fav:
    model: claude-sonnet-4.6
    provider: anthropic
  grok:
    model: grok-4
    provider: x-ai
  ollama-qwen:
    model: qwen3-coder:30b
    provider: custom
    base_url: http://localhost:11434/v1
  theta:
    model: theta-1
    provider: custom
    base_url: https://theta.example.com/v1
    key_env: THETA_API_KEY        # or: api_key: "${THETA_API_KEY}"
```

独自の `base_url` を持つ別名は、そのエンドポイントの認証情報を
`api_key`（値そのもの、または `"${VAR}"` という参照）か `key_env`（環境
変数の名前）で渡せます。両方が設定されている場合は `api_key` が優先されます。どちらも設定していない場合、キーは別名の**ホスト**から
解決され、切り替える前に使っていたプロバイダから引き継ぐことはありません。

**短い形** — `provider/model` を 1 つの文字列で書きます。YAML を編集せずシェルから設定できます。

```bash
hermes config set model.aliases.fav anthropic/claude-opus-4.6
hermes config set model.aliases.grok x-ai/grok-4
```

そしてチャットでは、こう使います。

```
/model fav            # session-only
/model grok --global  # also persists current-model change to config.yaml
```

ユーザーが決めた別名は組み込みの短い名前より優先されるので、別名を `sonnet`、`kimi`、`opus` などにすると組み込みのほうが隠れます。別名は大文字小文字を区別しません。

### 別名の解決 {#alias-resolution}

コマンドは前方一致でも解決できます。`/h` と打てば `/help`、`/mod` と打てば `/model` になります。前方一致が複数のコマンドに当たってあいまいなときは、レジストリの並び順で最初に見つかったものが選ばれます。完全なコマンド名と登録済みの別名は、常に前方一致より優先されます。

## メッセージングのスラッシュコマンド {#messaging-slash-commands}

> **Slack のスレッド内でのコマンド（`!` の接頭辞）:**
> Slack はスレッドの中でのネイティブのスラッシュコマンドを自前でブロックしており（"/queue is not supported in threads. Sorry!"）、Hermes には届きません。Slack のスレッドの中では代わりに `!` を頭に付けてください。`!stop`、`!new`、`!status` のように書けば、ゲートウェイがスラッシュの形とまったく同じように処理します。スレッドでは `@Hermes !stop` と `@Hermes /stop` も動きます。既知のコマンド一覧と照合されるのは最初の語だけなので、`!nice work` のようなメッセージはそのままエージェントに渡ります。詳しくは [スレッドの中でコマンドを使う](/hermes/docs/user-guide/messaging/slack/#using-commands-inside-threads-the-cmd-prefix) を見てください。

メッセージングゲートウェイは、Telegram、Discord、Slack、WhatsApp、Signal、メール、Home Assistant、Teams のチャットの中で、次の組み込みコマンドに対応しています。

| コマンド | 説明 |
|---------|-------------|
| `/start` | プラットフォームのプロトコル上のコマンドです。多くのチャットプラットフォーム（Telegram、Discord など）は、ユーザーがボットとの会話を初めて開いたときに `/start` を自動で送ります。Hermes はこの合図を黙って受け取ります。エージェントの返答もセッションの消費もないので、初回の挨拶でターンを無駄にしません。ゲートウェイに届いているかを確かめるために、自分で送ってみることもできます。 |
| `/new [name]`（別名: `/reset`） | 新しいセッションを始めます（セッション ID と履歴が新しくなります）。`[name]` を付けるとセッションの初期タイトルになります。末尾に `now`、`--yes`、`-y` を足すと確認ダイアログを飛ばせます（例: `/reset now`、`/new --yes my-experiment`）。 |
| `/status` | セッションの情報を表示し、続けてローカルで作った **Session recap** のブロック（直近のターン数、よく使ったツール、触ったファイル、最新のプロンプトと返答）を出します。 |
| `/stop` | 動いているバックグラウンドプロセスをすべて止め、実行中のエージェントを中断します。 |
| `/model [provider:model]` | モデルを表示、または変更します。プロバイダの切り替え（`/model zai:glm-5`）、独自のエンドポイント（`/model custom:model`）、名前を付けた独自プロバイダ（`/model custom:local:qwen`）、自動判別（`/model custom`）、ユーザーが決めた別名（`/model fav`、`/model grok`。[モデルの別名を自分で決める](#custom-model-aliases) を参照）に対応します。`--global` を付けると変更を config.yaml に残します。**注意:** `/model` は、すでに設定済みのプロバイダの間でしか切り替えられません。新しいプロバイダを足したり API キーを設定したりするには、チャットの外のターミナルで `hermes model` を使ってください。**費用に関する注意:** セッションの途中でモデルを切り替えるとプロンプトキャッシュがリセットされるので（キャッシュのキーにモデルが含まれます）、次のメッセージは会話全体を入力の全額で読み直すことになります。 |
| `/codex-runtime [auto\|codex_app_server\|on\|off]` | 任意で使える [Codex app-server ランタイム](/hermes/docs/user-guide/features/codex-app-server-runtime/) を切り替えます。設定は config.yaml の `model.openai_runtime` に残り、キャッシュされたエージェントを破棄するので、次のメッセージから新しいランタイムが使われます。次のセッションから有効になります。 |
| `/personality [name]` | このセッションに重ねる人格を設定します。`/personality none`（または `default` / `neutral`）で外します。 |
| `/fast [normal\|fast\|status]` | 高速モード（OpenAI の Priority Processing、Anthropic の Fast Mode）を切り替えます。 |
| `/retry` | 直前のメッセージを送り直します。 |
| `/undo` | 直前のやり取りを取り消します。 |
| `/sethome`（別名: `/set-home`） | 今のチャットを、配信先となるプラットフォームのホームチャンネルに設定します。 |
| `/compress [here [N] \| focus topic]` | 会話のコンテキストを手動で圧縮します。`/compress here [N]` は直近 N 往復（既定は 2）をそのまま残し、それ以外を要約します。focus のトピックを付けると、全体要約で何を残すかを絞り込めます。 |
| `/topic [off\|help\|session-id]` | **Telegram の個人チャット専用。** ユーザーが自分で管理する複数セッションのトピックモードを操作します。`/topic` で有効にする、または状態を表示し、`/topic off` で無効にして紐づけを消し、`/topic help` で使い方を表示し、トピックの中で `/topic <session-id>` と打つと以前のセッションを復元します。[個人チャットの複数セッションモード](/hermes/docs/user-guide/messaging/telegram/#multi-session-dm-mode-topic) も見てください。 |
| `/title [name]` | セッションのタイトルを設定、または表示します。 |
| `/resume [name]` | 名前を付けて保存したセッションを再開します。 |
| `/sessions [all] [search <query>]` | このチャットの過去のセッションを一覧表示します。今使っているセッションには `(current)` の印が付きます。`/sessions search <query>` はタイトルや ID の一致で絞り込みます（最近使ったものが先に出ます）。`/sessions all` は発生元をまたいで一覧表示します（管理者専用。管理者でない場合は案内が出て、チャットの範囲の一覧が返ります）。 |
| `/usage` | トークンの使用量、費用の内訳の見積もり（入力・出力）、コンテキストウィンドウの状態、セッションの経過時間を表示し、使っているプロバイダが対応していれば、そのプロバイダの API から取ってきた残りの利用枠・クレジットを示す **Account limits** の節も出します。 |
| `/topup` | Nous の残高を表示し、ポータルで支払いを管理します。 |
| `/whoami` | 自分のスラッシュコマンドの権限（管理者 / 一般ユーザー）を表示します。 |
| `/insights [days]` | 使用状況の分析結果を表示します。 |
| `/reasoning [level\|show\|hide\|full\|clamp] [--global]` | 推論の深さを変える（レベルは `max` / `ultra` まであります）、または推論の表示を切り替えます（`full` / `clamp` も含みます）。`--global` を付けると config に残します。 |
| `/voice [on\|off\|tts\|join\|channel\|leave\|status]` | チャットでの読み上げの返答を操作します。`join` / `channel` / `leave` は Discord のボイスチャンネルモードを管理します。 |
| `/rollback [number]` | ファイルシステムのチェックポイントを一覧表示、または復元します。 |
| `/diff [staged\|all\|session] [--stat]` | 作業ディレクトリの git の変更を表示します（コードブロックに入り、プラットフォームのメッセージ長の上限に合わせて切り詰められます）。`session` は Hermes が変更したものの累積差分を出し、`--stat` は要約だけを出します。 |
| `/bg <prompt>` | プロンプトを別のバックグラウンドセッションで実行します。タスクが終わると結果が同じチャットに返ってきます。[メッセージングのバックグラウンドセッション](/hermes/docs/user-guide/messaging/#background-sessions) も見てください。 |
| `/btw <question>` | 進行中の会話を止めずに、今の会話についてちょっとした質問をします。記録のスナップショットから答え、用意ができ次第チャットに送られます。 |
| `/queue <prompt>`（別名: `/q`） | 今のターンを中断せず、次のターンに送るプロンプトを予約します。 |
| `/steer <prompt>` | 中断せずに、次のツール呼び出しの後にメッセージを差し込みます。モデルは新しいターンとしてではなく、次の反復でそれを受け取ります。 |
| `/goal <text>` | Hermes がターンをまたいで目指し続ける常設の目標を設定します。Ralph ループに対する Hermes なりの答えです。各ターンの後に判定モデルが確認し、まだなら達成するまで Hermes が自動で続けます。途中で一時停止したり消したり、ターンの予算（既定は 20）に達したりすれば止まります。サブコマンドは `/goal status`、`/goal pause`、`/goal resume`、`/goal clear` です。エージェントが動いている最中でも status / pause / clear は安全に実行できますが、新しい目標を設定するには先に `/stop` が必要です。[常設の目標](/hermes/docs/user-guide/features/goals/) も見てください。 |
| `/subgoal <text>` | ループの途中で、動いている `/goal` に条件を追加します（`/subgoal`、`/subgoal remove <N>`、`/subgoal clear`）。 |
| `/heartbeat every <interval> <prompt>`（別名: `/hb`） | このセッションが待機中のときに繰り返し入ってくるプロンプトを設定します。サブコマンドは `status`、`pause`、`resume`、`clear` です。Slack では `/hermes heartbeat …` を使ってください。 |
| `/refine [focus]` | 記憶とスキルの自己改善レビューを今すぐ走らせます。focus の指示を付けることもできます。Slack では `/hermes refine …` を使ってください。 |
| `/review [instructions]` | 直前まで話していた成果物（PR、コード、ドキュメント）を対象に、独立したレビュー用サブエージェントを立ち上げます。レビューは終わり次第このチャットに戻ってきます。Slack では `/hermes review …` を使ってください。 |
| `/moa <prompt>` | プロンプトを 1 つ、既定の [Mixture of Agents](/hermes/docs/user-guide/features/mixture-of-agents/) プリセットで実行してから、セッションのモデルに戻します。 |
| `/branch [name]`（別名: `/fork`） | 今のセッションを分岐させます（別の道を試せます）。 |
| `/agents`（別名: `/tasks`） | 動いているエージェントとタスクを表示します。 |
| `/sessions` | 過去のセッションを見て、再開します。 |
| `/context [all]`（別名: `/ctx`） | コンテキストウィンドウの使用量のゲージとカテゴリごとの内訳です（メッセージング向けのテキスト表示）。`/context all` を使うと、スキルごと・ツールセットごとのコストの詳細が加わります。 |
| `/egress [status]` | Docker の egress プロキシの状態を表示します。 |
| `/init [notes]` | リポジトリを走査して `AGENTS.md` を生成、または更新します。 |
| `/learn <what to learn from>` | 説明したものから、繰り返し使えるスキルを抽出します。 |
| `/plan [task]` | 実装計画を markdown で書き、`.hermes/plans/` に保存します。実行はしません。 |
| `/bundles` | 設定済みのスキルバンドル（複数のスキルをまとめて読み込む `/<name>` の別名）を一覧表示します。 |
| `/reload-skills`（別名: `/reload_skills`） | `~/.hermes/skills/` を走査し直して、新しく入れたスキルや消したスキルを反映します。 |
| `/footer [on\|off\|status]` | 最終的な返答に付く実行情報のフッター（モデル、コンテキストの使用率、作業ディレクトリ）を出すかどうかを切り替えます。 |
| `/curator [status\|run\|pin\|archive]` | バックグラウンドでのスキルの手入れの操作です。 |
| `/suggestions [accept\|dismiss N\|catalog\|clear]` | 提案された自動化をチャットの中で確認します。`/suggestions` は保留中の提案を一覧表示し、`catalog` は選りすぐりの入門用自動化を追加し、`clear` は処理済みの提案の記録を整理します。受け入れた提案は、このチャットやスレッドをジョブの配信元として保ちます。 |
| `/blueprint [name] [slot=value ...]` | cron のひな形を眺める、案内付きの入力の会話を始める、またはひな形からジョブを直接作ります。直接作ったジョブは今のチャットやスレッドに結果を返します。 |
| `/memory [pending\|approve\|reject\|approval]` | 書き込み承認ゲート（`memory.write_approval`）が保留にした記憶の書き込みを確認し、チャットの中でそのまま承認・却下できます。ゲート自体は `/memory approval on\|off` で切り替えます。[記憶の書き込みを制御する](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval) も見てください。 |
| `/skills [pending\|approve\|reject\|diff\|approval]` | 書き込み承認ゲート（`skills.write_approval`）が保留にした**スキル**の書き込みを確認します。保留中の書き込みごとに 1 行の要点を表示します。`/skills diff <id>` はチャット向けに切り詰められるので、差分の全文は CLI か `~/.hermes/pending/skills/<id>.json` で読んでください。ゲートが有効なとき（または保留中の書き込みが残っているとき）だけ現れます。検索とインストールは CLI 専用のままです。 |
| `/kanban <action>` | 複数のプロファイル・複数のプロジェクトにまたがる共同作業ボードをチャットから操作します。引数の使い方は CLI とまったく同じです。エージェントが動いている場合の制限を回り込むので、`/kanban unblock t_abc`、`/kanban comment t_abc "…"`、`/kanban list --mine`、`/kanban boards switch <slug>` などはターンの途中でも動きます。`/kanban create …` を使うと、実行元のチャットが新しいタスクのターミナルイベントに自動で登録されます。[Kanban のスラッシュコマンド](/hermes/docs/user-guide/features/kanban/#kanban-slash-command) も見てください。 |
| `/platform <list\|pause\|resume> [name]` | 動いているゲートウェイのプラットフォームをチャットからそのまま操作します。`/platform list` はすべてのアダプタとその状態（動作中、遮断器による停止中、手動での停止中）を表示し、`/platform pause <name>` はアダプタを外さずに新しいメッセージの配送だけを止め、`/platform resume <name>` は再開して、接続先が正常に戻っていれば作動した遮断器も解除します。 |
| `/reload-mcp`（別名: `/reload_mcp`） | 設定から MCP サーバーを読み直します。 |
| `/verbose` | ツールの進捗表示を順に切り替えます。**メッセージングでは既定で off** です。`config.yaml` で `display.tool_progress_command: true` にすると有効になります。 |
| `/yolo` | YOLO モードを切り替えます。危険なコマンドの承認確認をすべて飛ばします。 |
| `/commands [page]` | すべてのコマンドとスキルをページ送りで眺めます。 |
| `/approve [session\|always]` | 保留中の危険なコマンドを承認して実行します。`session` はこのセッションだけ承認し、`always` は恒久的な許可リストに追加します。 |
| `/deny` | 保留中の危険なコマンドを却下します。 |
| `/update` | Hermes Agent を最新版に更新します。 |
| `/restart` | 動いている処理を流し切ってから、ゲートウェイを穏やかに再起動します。ゲートウェイが復帰すると、依頼した人のチャットやスレッドに確認の通知が届きます。 |
| `/debug` | デバッグ用の報告（システム情報とログ）をアップロードし、共有できるリンクを受け取ります。 |
| `/help` | メッセージング向けのヘルプを表示します。 |
| `/<skill-name>` | インストール済みのスキルを名前で呼び出します。 |

## 補足 {#notes}

- `/skin`、`/snapshot`、`/export`、`/import`、`/reload`、`/tools`、`/toolsets`、`/browser`、`/config`、`/cron`、`/platforms`、`/paste`、`/image`、`/statusbar`、`/battery`、`/focus`、`/plugins`、`/indicator`、`/wake`、`/journey`、`/redraw`、`/clear`、`/history`、`/save`、`/copy`、`/handoff`、`/prompt`、`/pet`、`/hatch`、`/timestamps`、`/subscription`、`/quit` は **CLI 専用**のコマンドです。
- `/skills` の検索・閲覧・インストールは **CLI 専用**です。書き込み承認の確認用サブコマンド（`pending`、`approve`、`reject`、`diff`、`approval`）は、`skills.write_approval` が有効ならメッセージングプラットフォームでも動きます。`/memory` は**どちらの入り口でも**動きます。
- `/verbose` は**既定では CLI 専用**ですが、`config.yaml` で `display.tool_progress_command: true` にするとメッセージングプラットフォームでも使えます。有効にすると `display.tool_progress` のモードを順に切り替え、設定に保存します。
- `/focus` と `/verbose` は同じ抑制の経路（`display.tool_progress`）を共有するので、互いに矛盾することはありません。`/focus on` はツールの進捗表示を `off` に固定し、それまでのモードを `display.focus_saved_tool_progress` に控えておきます。`/focus off` でそれを戻します。フォーカス中に `/verbose` で切り替えると、モードの主導権が戻ってフォーカスのバッジは消えます。フォーカス表示は見た目だけのもので、会話の履歴もシステムプロンプトもモデルへ送るものも一切変えないので、プロンプトキャッシュへの影響はゼロです。
- `/sethome`、`/restart`、`/approve`、`/deny`、`/topic`、`/platform`、`/commands` は**メッセージング専用**のコマンドです。
- `/status`、`/egress`、`/version`、`/whoami`、`/bg`、`/btw`、`/queue`、`/steer`、`/voice`、`/reload-mcp`、`/reload-skills`、`/rollback`、`/diff`、`/debug`、`/fast`、`/approvals`、`/busy`、`/footer`、`/curator`、`/kanban`、`/topup`、`/suggestions`、`/blueprint`、`/learn`、`/init`、`/sessions`、`/yolo` は、CLI とメッセージングゲートウェイの**どちらでも**動きます。
- `/voice join`、`/voice channel`、`/voice leave` は Discord でしか意味がありません。
- TUI では、`/sessions` は今の TUI プロセスで動いているセッションを表示します。保存済みや閉じたあとの記録には `/resume [name]` か `hermes --tui --resume <id-or-title>` を使ってください。

## 取り返しのつかないコマンドの確認 {#confirmation-prompts-for-destructive-commands}

保存していないセッションの状態を捨ててしまうスラッシュコマンドについては、CLI が実行前に確認します。今のところ対象は次のとおりです。

| コマンド | 失われるもの |
|---------|------------------|
| `/clear` | 画面を消して新しいセッションを始めます。今のセッション ID とメモリ上の履歴は失われます。 |
| `/new` / `/reset` | 新しいセッションを始めます（新しいセッション ID と空の履歴）。 |
| `/undo` | 直前のユーザーとアシスタントのやり取りを履歴から取り除きます。 |
| `/exit --delete` / `/quit --delete` | 終了する**うえに**、今のセッションの SQLite の履歴とディスク上の記録を完全に削除します。 |

これらのそれぞれについて、CLI は 3 択のダイアログを開きます。**Approve Once**（今回だけ進める）、**Always Approve**（進めたうえで `approvals.destructive_slash_confirm: false` を設定に残し、以後は確認なしで実行する）、**Cancel** です。

**その場で飛ばす:** 末尾に `now`、`--yes`、`-y` を付けると、その 1 回だけダイアログを省けます（例: `/reset now`、`/new --yes my-session`、`/clear -y`、`/undo -y`）。ダイアログが端末でうまく表示されないとき（Windows のネイティブの PowerShell については [issue #30768](https://github.com/NousResearch/hermes-agent/issues/30768) を見てください）や、CLI をスクリプトから動かすときに便利です。

`~/.hermes/config.yaml` で `approvals.destructive_slash_confirm: false` にすると、確認を全体的に無効にできます。`true` に戻せばまた有効になります。背景は [セキュリティ — 取り返しのつかないスラッシュコマンドの確認](/hermes/docs/user-guide/security/#dangerous-command-approval) を見てください。
