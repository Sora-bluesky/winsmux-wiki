---
title: "スラッシュコマンド早見表"
description: "対話型 CLI とメッセージングのスラッシュコマンドをすべて集めた早見表"
upstream_path: reference/slash-commands.md
upstream_blob: 608eb80b158e796c1293c9a77e0f095c542d7505
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/slash-commands
---

# スラッシュコマンド早見表 {#slash-commands-reference}

Hermes のスラッシュコマンドには 2 つの入口があり、どちらも `hermes_cli/commands.py` の中心的な `COMMAND_REGISTRY` から動いています。

- **対話型 CLI のスラッシュコマンド** — `cli.py` が受け持ち、登録内容から補完候補が出ます
- **メッセージングのスラッシュコマンド** — `gateway/run.py` が受け持ち、ヘルプ文とプラットフォームのメニューが登録内容から作られます

インストール済みのスキルも、両方の入口で動的なスラッシュコマンドとして出てきます。同梱の `/plan` もそのひとつで、プラン モードを開き、作業中のワークスペースやバックエンドの作業ディレクトリを基準に `.hermes/plans/` へマークダウンの計画を保存します。

## 権限と管理者・一般ユーザーの分け方 {#permissions-and-adminuser-split}

ユーザーごとの許可リストを持てるメッセージング プラットフォーム（Telegram、Discord、Slack、Matrix、Mattermost、Signal、…）では、スラッシュコマンドを 2 段階に分けられます。**管理者**は登録済みのコマンドをすべて使えて、**一般ユーザー**は `user_allowed_commands` に並べた名前だけ（それに加えて、いつでも使える `/help` と `/whoami`）を使えます。設定は `~/.hermes/gateway-config.yaml` にある各プラットフォームの `extra:` ブロックの中で、`allow_admin_from` と `user_allowed_commands`（グループ向けには `group_allow_admin_from` / `group_user_allowed_commands`）を書きます。

書き方の例は各プラットフォームのページにあります。構造はどのプラットフォームでも同じです。

- [Telegram](/hermes/docs/user-guide/messaging/telegram/#slash-command-access-control)
- [Discord](/hermes/docs/user-guide/messaging/discord/)
- [Slack](/hermes/docs/user-guide/messaging/slack/)
- [Matrix](/hermes/docs/user-guide/messaging/matrix/)
- [Mattermost](/hermes/docs/user-guide/messaging/mattermost/)
- [Signal](/hermes/docs/user-guide/messaging/signal/)

ある範囲で `allow_admin_from` を設定していない場合、その範囲は制限なしの従来どおりの動きのままです。許可されたユーザーは全員がすべてのコマンドを実行できます。

## 対話型 CLI のスラッシュコマンド {#interactive-cli-slash-commands}

CLI で `/` と打つと補完メニューが開きます。組み込みコマンドは大文字小文字を区別しません。

### セッション {#session}

| コマンド | 説明 |
|---------|-------------|
| `/new [name]`（別名: `/reset`） | 新しいセッションを始めます（セッション ID と履歴が新しくなります）。`[name]` を付けると最初のセッション名になります。たとえば `/new my-experiment` なら `my-experiment` という名前が付いた新しいセッションが開き、あとから `/resume` や `/sessions` で見つけやすくなります。末尾に `now`、`--yes`、`-y` を足すと確認ダイアログを飛ばせます（例: `/reset now`、`/new --yes my-experiment`）。 |
| `/clear` | 画面を消して新しいセッションを始めます |
| `/history` | 会話の履歴を表示します（`/timestamps` の設定に従います） |
| `/save` | いまの会話を保存します |
| `/prompt`（別名: `/compose`） | 次に送るプロンプトを、その場の入力欄ではなく `$EDITOR`（マークダウン）で書きます。長い文章、複数行、体裁を整えたいプロンプトに向いています。 |
| `/retry` | 直前のメッセージをもう一度エージェントに送ります |
| `/undo` | 直前のユーザーとアシスタントのやり取りを取り消します |
| `/title` | いまのセッションに名前を付けます（使い方: /title My Session Name） |
| `/compress [here [N] \| focus topic]` | 会話の文脈を手動で圧縮します（記憶を書き出してから要約）。`/compress here [N]` は直近 N 往復（既定は 2）だけをそのまま残し、それ以外をまとめます。どこで区切るかを自分で決められます。焦点となる話題を付けると、全体要約で何を残すかを絞り込めます。 |
| `/rollback` | ファイルのチェックポイントを一覧表示、または復元します（使い方: /rollback [number]） |
| `/diff [staged\|all\|session] [--stat] [path...]` | 作業ディレクトリの git の変更を表示します。既定はステージしていない変更と未追跡ファイルです。`staged` はコミット待ちの内容、`all` は HEAD からの全変更、`session` はここで Hermes が変えたものすべての累積差分（保持している最古のチェックポイントを起点にします。チェックポイントを有効にしている必要があります。`/rollback diff <N>` と補い合います）を出します。`--stat` は変更ファイルの一覧だけを出し、パスを渡すと差分の範囲を絞れます。 |
| `/snapshot [create\|restore <id>\|prune]`（別名: `/snap`） | Hermes の設定と状態のスナップショットを作成・復元します。`create [label]` で保存、`restore <id>` でその時点へ戻し、`prune [N]` で古いものを削除します。引数なしなら一覧が出ます。データベースの復元は SQLite のバックアップ API 経由で書き込むので、動いているプロセス（ゲートウェイ、ダッシュボード）からも安全に復元後のデータが見えます。ほかのプロセスがデータベースを掴んだままでこの経路が失敗したときは、壊す危険を冒さずに復元を中止します。掴んでいるプロセスを止めてからやり直してください。 |
| `/stop` | 動いているバックグラウンド処理をすべて終了します |
| `/queue <prompt>`（別名: `/q`） | 次のターンに回すプロンプトを積んでおきます（いま返答中のエージェントは止めません）。 |
| `/steer <prompt>` | 実行の途中でメモを差し込み、**次のツール呼び出しのあと**にエージェントへ届けます。中断もせず、新しいユーザーのターンも作りません。いま動いているツールが終わった時点で、その結果の末尾に文章が足されます。ツールを呼ぶ流れを崩さずに新しい情報を渡せます。作業の途中で方向を促したいときに使います（たとえばテストを走らせている最中に「認証まわりに集中して」と伝える）。 |
| `/goal <text>` | Hermes がターンをまたいで目指し続ける目標を設定します。いわゆる Ralph ループの Hermes 版です。毎ターンのあとに補助の判定モデルが目標の達成を判断し、まだなら Hermes が自動で続けます。サブコマンドは `/goal status`、`/goal pause`、`/goal resume`、`/goal clear`。既定の上限は 20 ターン（`goals.max_turns`）で、ユーザーが実際にメッセージを送ると継続ループより優先され、状態は `/resume` をまたいでも残ります。ひととおりの流れは [持続する目標](/hermes/docs/user-guide/features/goals/) にあります。 |
| `/subgoal <text>` | 動いている目標に、ループの途中で自分の判断基準を足します。継続用のプロンプトはすべてのサブ目標をそのままエージェントに伝え、判定モデルも DONE / CONTINUE の判断に加味します。つまり、元の目標**と**すべてのサブ目標が揃うまで完了になりません。サブコマンドは `/subgoal`（一覧）、`/subgoal remove <N>`、`/subgoal clear`。`/goal` が動いていることが前提です。 |
| `/heartbeat every <interval> <prompt>`（別名: `/hb`） | 決まった間隔で**このセッション**へ普通のユーザーのターンとして入り直すプロンプトを設定します。手が空いていて、かつ間隔が過ぎたときに動きます（最短 60 秒。取りこぼした分はまとめて 1 回になります）。サブコマンドは `/heartbeat status`、`/heartbeat pause`、`/heartbeat resume`、`/heartbeat clear`。このセッションの中だけで動くので、独立して確実に動かしたいなら `hermes cron` を使ってください。[セッション ハートビート](/hermes/docs/user-guide/features/heartbeat/) も参照してください。 |
| `/refine [focus]` | 記憶とスキルを自己改善するバックグラウンドの見直しを、ターン後の自動実行を待たずに**その場で**走らせます。焦点となる文章を添えると見直しの向きを促せます（例: `/refine save the deploy workflow as a skill`）。会話のスナップショットに対してバックグラウンドの分身が動くので、実行中のセッションとプロンプト キャッシュには触れません。終わったら結果が届きます。 |
| `/review [instructions]` | 独立した全権限のレビュー用サブエージェントを立ち上げ、いま話していた成果物をレビューさせます。PR でもコードでもドキュメントでも、直近 10 件のチャットで触れたものなら対象になります。バックグラウンドで調べ（PR を開き、差分を読み、コードを走らせ）、レビュー全文がバックグラウンド サブエージェントの完了としてこのセッションに戻り、主エージェントがそれを踏まえて動けます。レビュー専用のモデルを固定したいときは config.yaml の `auxiliary.review` を使います（既定はメインのモデル）。[サブエージェントへの委譲](/hermes/docs/user-guide/features/delegation/#the-review-command) も参照してください。 |
| `/moa <prompt>` | プロンプトを 1 つ、既定の [Mixture of Agents](/hermes/docs/user-guide/features/mixture-of-agents/) プリセットで処理してから、いまのモデルに戻します。その場かぎりの実行で、セッションのモデルは変わりません。 |
| `/resume [name]` | 名前を付けておいたセッションを再開します |
| `/sessions`（TUI での別名: `/switch`） | 従来型の CLI では、過去のセッションを対話的な一覧から選んで再開します。TUI では、いま開いている TUI セッションの切り替え画面が出ます。TUI で `/sessions new` と打つと、その場でもう 1 つセッションを立ち上げられます。 |
| `/egress [status]` | Docker の送信プロキシの状態を表示します。有効か、設定済みか、動いているか、認証情報の出どころ、トークンの対応付け、まだ通せていないプロバイダー、次にやることが出ます。CLI、TUI、デスクトップのチャット、メッセージング ゲートウェイのいずれでも使えます。 |
| `/redraw` | 画面をすべて描き直します（tmux のサイズ変更やマウス選択のあとで表示が崩れたときに直せます） |
| `/status` | セッションの情報を表示します。モデル、プロバイダー、プロファイル、セッション ID、作業ディレクトリ、名前、作成・更新の時刻、トークンの合計、エージェントが動いているかどうか。続けて手元で作る**セッションの振り返り**が出ます（直近のユーザーとアシスタントのターン数、ツール結果の数、よく使ったツール、最近触れたファイル、最新のプロンプト、最新の返答）。振り返りはメモリ上の会話から手元で計算するので、LLM は呼ばず、プロンプト キャッシュにも影響しません。 |
| `/context [all]`（別名: `/ctx`） | 文脈の使用量を目に見える形で分けて出します。CLI と TUI では 5×20 のマス目（1 マスがモデルの窓のおよそ 1%）と、推定の内訳表が出ます。システム プロンプト、ツール定義、ルール、スキル索引、MCP、サブエージェント、記憶、会話と、空き容量の比較です。メッセージング プラットフォームでは、自動圧縮のしきい値と残り、圧縮の実績、累計の処理量、そして同じ内訳表が文字だけで出ます。`/context all` を付けるとスキルごと・ツールセットごとのコストも並びます（索引のコストと SKILL.md 読み込みのコスト、ツールセットごとのスキーマのトークン数）。読み取りだけで手元の計算なので、LLM は呼ばず、プロンプト キャッシュにも影響しません。 |
| `/agents`（別名: `/tasks`） | いまのセッションで動いているエージェントとタスクを表示します。 |
| `/bg <prompt>` | 別のバックグラウンド セッションでプロンプトを実行します。エージェントが独立して処理するので、いまのセッションはほかの作業に使えます。終わると結果がパネルで出ます。[CLI のバックグラウンド セッション](/hermes/docs/user-guide/cli/#background-sessions) も参照してください。 |
| `/btw <question>` | **いまの会話について**、進行を止めずに短い質問をします。読み取り専用の会話スナップショットに対して補助の LLM が 1 回だけ答えるので、実行中のセッションの履歴とプロンプト キャッシュには触れず、そのターンも走り続けます。まっさらな文脈で別の作業をしたいなら `/bg` を使ってください。 |
| `/branch [name]`（別名: `/fork`） | いまのセッションを枝分かれさせます（別の道を試せます） |
| `/worktree [new [name]\|list]` | **CLI 専用。** セッションの途中で、独立した git のワークツリーを見たり作ったりします（Copilot CLI の `/worktree new` に着想を得ています）。`/worktree` だけなら今のワークツリーを表示、`/worktree list` はリポジトリのワークツリー一覧、`/worktree new [name]` は `.worktrees/` の下にワークツリーを作り（`worktree_sync` に従って、取得し直したリモートの先端から枝分かれします）、セッションのターミナルとファイル操作をそちらへ向け直します。名前を付けたものは `hermes/<name>` ブランチになり、付けない場合は `hermes-<id>` という無作為な名前になります。終了時、まだ push していないコミットがある場合だけワークツリーが残ります。`hermes -w` と同じ扱いです。[Git ワークツリー](/hermes/docs/user-guide/git-worktrees/) も参照してください。 |
| `/handoff <platform>` | **CLI 専用。** いまのセッションをメッセージング プラットフォーム（Telegram、Discord、Slack、WhatsApp、Signal、Matrix）へ引き継ぎます。ゲートウェイがすぐに受け取り、スレッドを持つプラットフォーム（Telegram のトピック、Discord のテキスト チャンネルのスレッド、Slack のメッセージに紐づくスレッド）では新しいスレッドを作り、宛先を CLI の session_id に結び直して発言者つきの記録をすべて再生し、さらに疑似的なユーザーのターンを作って、新しい場所で動いていることをエージェントに確認させます。成功すると CLI は `/resume` の案内を出してきれいに終了します。あとから `/resume <title>` でいつでも手元に戻せます。ターンの途中では受け付けません。ゲートウェイが動いていること、そして引き継ぎ先のプラットフォームでホーム チャンネルを設定していること（引き継ぎ先のチャットで `/sethome`）が必要です。[プラットフォームをまたぐ引き継ぎ](/hermes/docs/user-guide/sessions/#cross-platform-handoff) も参照してください。 |
| `/journey [list\|delete <id>\|edit <id>]`（別名: `/learning`、`/memory-graph`） | 覚えたスキルと記憶をたどる学習の歩みを時系列で開きます。従来型の CLI、TUI の重ね表示、デスクトップ アプリ（Star Map パネル）で使えます。メッセージング プラットフォームでは使えません。[学習の歩み](/hermes/docs/user-guide/features/memory/#learning-journey-journey) も参照してください。 |

### 設定 {#configuration}

| コマンド | 説明 |
|---------|-------------|
| `/config` | いまの設定を表示します |
| `/model [model-name]` | いまのモデルを表示、または切り替えます。使える形は `/model claude-sonnet-4`、`/model provider:model`（プロバイダーごと切り替え）、`/model custom:model`（独自のエンドポイント）、`/model custom:name:model`（名前を付けた独自プロバイダー）、`/model custom`（エンドポイントから自動判別）、それに自分で決めた別名（`/model fav`、`/model grok` — [モデルの別名を自分で決める](#custom-model-aliases) を参照）です。オプションは、`--global` で config.yaml に保存、`--session` でこのセッションだけに限定、`--once` で次のターンだけ適用、`--refresh` でプロバイダーのモデル一覧を取り直し、`--provider <name>` でバックエンドを切り替え（`--global` を付けない限りこのセッションだけ）。単に `/model <name>` と打った場合は、`model.persist_switch_by_default: true` を設定していない限りこのセッションだけの変更です。**対話的な選択画面:** 引数なしで `/model` と打つとプロバイダー → モデルの選択画面が開きます。モデル一覧では**文字を打って絞り込め**ます（たとえば `grok` と打つと該当するモデルだけになります）。Backspace で 1 文字消し、Esc で絞り込みを解除（または画面を閉じます）。選択は必ず 1 つの具体的なモデルに決まります。絞り込みは一覧を狭めるだけで、勝手に推測はしません。**注意:** `/model` で切り替えられるのは、すでに設定済みのプロバイダーの間だけです。新しいプロバイダーを足すには、セッションを抜けてターミナルで `hermes model` を実行してください。**費用の注意:** 会話の途中でモデルを変えるとプロンプト キャッシュが作り直しになります。キャッシュのキーにモデルが含まれるので、次のターンでは会話全体を、約 75% 引きのキャッシュ価格ではなく入力の正価で読み直します。仕組み上避けられませんが、長いセッションでは知っておくと安心です。 |
| `/codex-runtime [auto\|codex_app_server\|on\|off]` | OpenAI や Codex のモデル向けに、任意で使える [Codex app-server ランタイム](/hermes/docs/user-guide/features/codex-app-server-runtime/) を切り替えます。`auto`（既定）は Hermes 標準のチャット補完を使い、`codex_app_server` は `codex app-server` のサブプロセスにターンを渡して、ネイティブのシェル、apply_patch、ChatGPT のサブスクリプション認証、移行済みの Codex プラグインを使えるようにします。次のセッションから有効になります。 |
| `/personality` | あらかじめ用意された人格を設定します。`/personality none`（または `default` / `neutral`）で人格を外し、素の動きに戻します。 |
| `/verbose` | ツールの進捗表示を切り替えます（off → new → all → verbose）。設定で[メッセージングでも有効にできます](#notes)。 |
| `/focus [on\|off\|status]` | **集中表示**の切り替えです。表示だけを絞り、自分のプロンプトと最終的な返答だけを見せます。`/verbose` と組み合わさり、有効にするとツールの進捗表示が `off` になり、それまでのモードを覚えておいて `/focus off` で元に戻します。ターンの終わりには控えめな案内（`⋯ 7 tool lines hidden · /focus off to show`）が出て、ステータス バーには `◉ focus` のバッジが残るので、絞った表示であることがいつでも分かります。モデルに送る内容は何も変わりません。詳細は隠れるだけで、捨てられることはありません。 |
| `/fast [normal\|fast\|status]` | 高速モード（OpenAI の Priority Processing、Anthropic の Fast Mode）を切り替えます。指定できるのは `normal`、`fast`、`status` です。 |
| `/reasoning [level\|show\|hide\|full\|clamp] [--global]` | 推論の深さと表示を管理します。深さには `none` / `minimal` / `low` / `medium` / `high` / `xhigh` / `max` / `ultra` があります。`show` / `hide`（または `on` / `off`）で推論の表示を切り替え、`full` と `clamp` で見せ方を調整します。`--global` を付けると深さを設定ファイルに保存します。 |
| `/skin` | 表示のスキンやテーマを表示、または変更します |
| `/export [profile] [-o out.tar.gz]` | **CLI 専用。** プロファイルを共有できる `.tar.gz` にまとめます。スキル、記憶、ペルソナ、cron、プラグイン、設定に加えて、デスクトップからならテーマとレイアウトも入ります。認証情報（`auth.json`、`.env`）は取り除かれます。既定では作業中のプロファイルを、いまのディレクトリに `<name>.tar.gz` として書き出します。`hermes profile export` と同じ書庫です。版を付けて更新もできる形で配りたいときは、[プロファイルの配布](/hermes/docs/user-guide/profile-distributions/) を使ってください。 |
| `/import <archive.tar.gz> [--name <name>]` | **CLI 専用。** プロファイルの書庫を新しいプロファイルとして取り込みます。`--name` を付けない限り、名前は書庫から推測します。既存のプロファイルへの上書きは拒否し、`default` としての取り込みもできません。名前が空いていればシェルのラッパーも作ります。[プロファイル ファイルの書き出しと取り込み](/hermes/docs/user-guide/profile-distributions/#export-and-import-a-profile-file) も参照してください。 |
| `/statusbar`（別名: `/sb`） | 文脈とモデルを出すステータス バーの表示を切り替えます |
| `/battery [on\|off\|status]` | ステータス バーの先頭に、色分けした電池残量を出すかどうかを切り替えます（既定はオフ。電池がない環境では何も起きません）。 |
| `/voice [on\|off\|tts\|status]` | CLI の音声モードと読み上げを切り替えます。録音は `voice.record_key`（既定: `Ctrl+B`）で始めます。 |
| `/yolo` | YOLO モードを切り替えます。危険なコマンドの確認をすべて飛ばします。 |
| `/approvals [manual\|smart\|off]` | 危険なコマンドをどう承認するかの設定を表示、または変更します。 |
| `/footer [on\|off\|status]` | 最終返答に付くゲートウェイの実行情報（モデル、文脈の使用率、作業ディレクトリ）の表示を切り替えます。 |
| `/busy [queue\|steer\|interrupt\|status]` | Hermes が作業中にメッセージを送ったときの動きを決めます。積んでおく、途中で方向を促す、すぐ中断する、のいずれかです。CLI とメッセージング ゲートウェイの両方で使えます。 |
| `/indicator [kaomoji\|emoji\|unicode\|ascii]` | CLI 専用。TUI の作業中インジケーターの見た目を選びます。 |
| `/timestamps [on\|off\|status]` | CLI 専用。メッセージと `/history` に `[HH:MM]` の時刻を出すかどうかを切り替えます。 |
| `/wake [on\|off\|status]` | CLI 専用。「Hey Hermes」の呼びかけ待ち受けを切り替えます。 |

### ツールとスキル {#tools-skills}

| コマンド | 説明 |
|---------|-------------|
| `/tools [list\|disable\|enable] [name...]` | ツールを管理します。使えるツールの一覧を出したり、このセッションで特定のツールを無効・有効にしたりできます。無効にするとエージェントの道具立てから外れ、セッションが作り直されます。 |
| `/toolsets` | 使えるツールセットを一覧表示します |
| `/browser [connect\|disconnect\|status]` | 手元の Chromium 系ブラウザーとの CDP 接続を管理します。`connect` は動いている Chrome、Brave、Chromium、Edge にブラウザー ツールをつなぎます（既定は `http://127.0.0.1:9222`）。`disconnect` で切り離し、`status` でいまの接続を確認します。デバッガーが見つからない場合は、対応する Chromium 系ブラウザーを自動で起動します。 |
| `/skills` | オンラインのレジストリからスキルを検索、導入、確認、管理します。スキルの書き込み承認のゲートを見るところでもあります。`/skills pending`、`/skills diff <id>`、`/skills approve <id>`、`/skills reject <id>`、`/skills approval on\|off` が使えます。[エージェントによるスキル書き込みの承認](/hermes/docs/user-guide/features/skills/#gating-agent-skill-writes-skillswrite_approval) も参照してください。 |
| `/memory [pending\|approve\|reject\|approval]` | 書き込み承認のゲート（`memory.write_approval`）で保留になっている記憶の書き込みを確認し、ゲート自体の入切もできます。[記憶の書き込みを管理する](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval) も参照してください。 |
| `/bundles` | 設定済みのスキル束を一覧表示します。複数のスキルをまとめて読み込む `/<name>` 形式の別名です。`~/.hermes/config.yaml` の `bundles:` で設定します。[スキル束](/hermes/docs/user-guide/features/skills/#skill-bundles) も参照してください。 |
| `/learn <what to learn from>` | 説明したものから、使い回せるスキルを絞り出します。ディレクトリでも、URL でも、いまエージェントと一緒にやった手順でも、貼り付けたメモでも構いません。形は自由で、エージェントが自分のツールで材料を集め、決められた作法に沿って `SKILL.md` を書きます。CLI、メッセージング ゲートウェイ、TUI、ダッシュボードのスキル ページで使えます。 |
| `/init [notes]` | リポジトリを調べて `AGENTS.md` のプロジェクト向け指示を作成、または更新します（Codex の `/init` の移植です）。エージェントが読み取り専用のツールでマニフェスト、構成、ツールチェーンの設定を見たうえで、簡潔な `AGENTS.md` を書きます。すでにある場合は、書いてあった内容を残したまま統合して更新します。メモを添えると、どこに重きを置くかを促せます。CLI、メッセージング ゲートウェイ、TUI で使えます。 |
| `/cron` | 予定した作業を管理します（一覧、追加・作成、編集、一時停止、再開、実行、削除） |
| `/suggestions [accept\|dismiss N\|catalog\|clear]`（別名: `/suggest`） | 提案された自動化を確認します。`/suggestions` で保留中の提案を一覧、`/suggestions accept <id>` で提案どおりの自動化を作成、`/suggestions dismiss <id>` で却下、`/suggestions catalog` で選りすぐりの入門用自動化を追加、`/suggestions clear` で処理済みの提案の記録を消します。受け入れた作業は、いまいる場所を届け先として引き継ぎます。 |
| `/blueprint [name] [slot=value ...]`（別名: `/bp`） | ひな形から自動化を用意します。`/blueprint` だけなら一覧が出て、`/blueprint <name>` は次のターンで穴埋めの案内が始まり、`/blueprint <name> slot=value ...` はその場で作業を作ります。 |
| `/curator` | スキルをバックグラウンドで手入れします。`status`、`run`、`pin`、`archive` が使えます。[キュレーター](/hermes/docs/user-guide/features/curator/) も参照してください。 |
| `/kanban <action>` | 複数プロファイル・複数プロジェクトの共同作業ボードを、チャットから離れずに動かします。`hermes kanban` と同じことがひととおりできます。`/kanban list`、`/kanban show t_abc`、`/kanban create "title" --assignee X`、`/kanban comment t_abc "text"`、`/kanban unblock t_abc`、`/kanban dispatch` などです。複数のボードにも対応していて、`/kanban boards list`、`/kanban boards create <slug>`、`/kanban boards switch <slug>`、`/kanban --board <slug> <action>` が使えます。[かんばんのスラッシュコマンド](/hermes/docs/user-guide/features/kanban/#kanban-slash-command) も参照してください。 |
| `/reload-mcp`（別名: `/reload_mcp`） | config.yaml から MCP サーバーを読み込み直します |
| `/reload-skills`（別名: `/reload_skills`） | `~/.hermes/skills/` を調べ直して、追加や削除されたスキルを反映します |
| `/reload` | `.env` の変数を動いているセッションに読み込み直します（再起動せずに新しい API キーを反映できます） |
| `/plugins` | 導入済みのプラグインとその状態を一覧表示します |
| `/pet [list\|<slug>]` | [petdex](/hermes/docs/user-guide/features/pets/) のマスコットを表示したり迎えたりします。`/pet` でペインの表示を切り替え、`/pet list` で手元にいるペットを一覧、`/pet <slug>` で好きな 1 匹を迎えます。 |
| `/hatch <description>`（別名: `/generate-pet`） | 文章での説明から、まったく新しい petdex のペットを作ります。設定した画像バックエンド（OpenRouter / Nous Portal）を使います。[ペット](/hermes/docs/user-guide/features/pets/) も参照してください。 |

### 情報 {#info}

| コマンド | 説明 |
|---------|-------------|
| `/help` | 使えるコマンドを分類ごとに表示します。既定では主要なコマンドを出し、スキルのコマンドは件数の 1 行にまとめます。`/help skills` でスキルのコマンドをすべて並べ、`/help <text>` で文字列に一致するコマンド（と該当するスキル）に絞り込めます。 |
| `/palette` | あいまい検索のコマンド パレットを開きます（**Ctrl+P** でも開けます）。文字を打つとコマンドとスキルが絞られ、↑ / ↓ で移動、Enter で選んだコマンドを入力欄に差し込み（勝手に実行はしません）、Esc で取り消します。まずコマンド名で順位が付くので、短い言葉でも狙いどおりに絞れます。 |
| `/version` | Hermes Agent の版、ビルド、環境の情報を表示します。 |
| `/whoami` | 自分のスラッシュコマンドの権限（管理者 / 一般ユーザー）を表示します。 |
| `/usage` | トークンの使用量、費用の内訳、セッションの経過時間を表示します。使っているプロバイダーが対応していれば、その API から取ってきた残りの割り当て・クレジット・プランの使用状況を**アカウントの上限**として表示します。 |
| `/topup` | Nous の残高を表示し、ポータルで支払いを管理します（以前の `/credits` と `/billing` の置き換えです）。 |
| `/subscription`（別名: `/upgrade`） | **CLI 専用。** Nous のプランを確認し、ブラウザーで変更します。 |
| `/insights` | 使い方の傾向と統計を表示します（直近 30 日） |
| `/update` | Hermes Agent を最新版に更新します。 |
| `/platforms`（別名: `/gateway`） | ゲートウェイとメッセージング プラットフォームの状態を表示します（CLI 専用のまとめ表示）。 |
| `/paste` | クリップボードの画像を添付します |
| `/copy [number]` | 直前のアシスタントの返答をクリップボードにコピーします（数字を付けると、後ろから数えて N 番目になります）。CLI 専用です。 |
| `/image <path>` | 手元の画像ファイルを次のプロンプトに添付します。 |
| `/debug` | デバッグ報告（システム情報とログ）を送信し、共有できるリンクを受け取ります。メッセージングでも使えます。 |
| `/update` | Hermes Agent を最新版に更新します。 |
| `/profile` | 作業中のプロファイル名とホーム ディレクトリを表示します |

### 終了 {#exit}

| コマンド | 説明 |
|---------|-------------|
| `/quit` | CLI を終了します（`/exit` でも同じです）。 |

### 動的な CLI のスラッシュコマンド {#dynamic-cli-slash-commands}

| コマンド | 説明 |
|---------|-------------|
| `/<skill-name>` | 導入済みのスキルを、必要なときに呼び出すコマンドとして読み込みます。たとえば `/gif-search`、`/github-pr-workflow`、`/excalidraw` です。 |
| `/skills ...` | レジストリと公式の任意スキル カタログから、スキルを検索、閲覧、確認、導入、点検、公開、設定します。 |

### クイック コマンド {#quick-commands}

自分で決めるクイック コマンドは、短いスラッシュコマンドをシェルのコマンドか別のスラッシュコマンドに割り当てるものです。`~/.hermes/config.yaml` で設定します。

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

こう書いておけば、CLI でもメッセージング プラットフォームでも `/status`、`/deploy`、`/inbox` と打つだけです。クイック コマンドは実行の直前に解決されるため、組み込みの補完やヘルプの表にすべてが出るとは限りません。

文字列だけのプロンプトの近道はクイック コマンドにできません。長めで使い回すプロンプトはスキルに入れるか、`type: alias` で既存のスラッシュコマンドを指してください。

### モデルの別名を自分で決める {#custom-model-aliases}

よく使うモデルに自分で短い名前を付けておくと、CLI でもメッセージング プラットフォームでも `/model <alias>` で呼び出せます。別名はどちらでも同じように動き、このセッションだけ（既定）でも `--global` でも使えます。

設定の書き方は 2 通りあります。

**詳しい書き方** — モデル、プロバイダー、必要ならベース URL まで指定します。`~/.hermes/config.yaml` に書きます。

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
```

**短い書き方** — `provider/model` を 1 つの文字列にまとめます。YAML を編集せず、シェルから設定できます。

```bash
hermes config set model.aliases.fav anthropic/claude-opus-4.6
hermes config set model.aliases.grok x-ai/grok-4
```

あとはチャットでこう打ちます。

```
/model fav            # session-only
/model grok --global  # also persists current-model change to config.yaml
```

自分で決めた別名は組み込みの短縮名より優先されるので、`sonnet`、`kimi`、`opus` などを別名にすると組み込みのほうが隠れます。別名は大文字小文字を区別しません。

### 別名の解決 {#alias-resolution}

コマンドは先頭一致でも通ります。`/h` と打てば `/help`、`/mod` なら `/model` になります。先頭一致で複数のコマンドが当てはまるときは、登録順で最初のものが選ばれます。完全なコマンド名と登録済みの別名は、つねに先頭一致より優先されます。

## メッセージングのスラッシュコマンド {#messaging-slash-commands}

> **Slack のスレッド内でのコマンド（`!` を付ける）:**
> Slack はスレッドの中でのスラッシュコマンドをそもそも通しません（「/queue is not supported in threads. Sorry!」と出ます）し、Hermes にも届きません。Slack のスレッドの中では代わりに `!` を頭に付けてください。`!stop`、`!new`、`!status` のように書けば、ゲートウェイがスラッシュ形式とまったく同じように処理します。スレッドの中では `@Hermes !stop` や `@Hermes /stop` も使えます。判定するのは最初の 1 語だけなので、`!nice work` のようなメッセージはそのままエージェントに渡ります。詳しくは [スレッドの中でコマンドを使う](/hermes/docs/user-guide/messaging/slack/#using-commands-inside-threads-the-cmd-prefix) を参照してください。

メッセージング ゲートウェイは、Telegram、Discord、Slack、WhatsApp、Signal、メール、Home Assistant、Teams のチャットで次の組み込みコマンドに対応しています。

| コマンド | 説明 |
|---------|-------------|
| `/start` | プラットフォーム側の決まりごとのコマンドです。多くのチャット プラットフォーム（Telegram、Discord、…）は、ユーザーがボットとの会話を初めて開いたときに `/start` を自動で送ります。Hermes はこれを黙って受け取るだけで、エージェントは返事をせず、セッションも消費しません。最初のやり取りで 1 ターンを無駄にしないためです。自分で送って、ゲートウェイに届いているかを確かめることもできます。 |
| `/new [name]`（別名: `/reset`） | 新しいセッションを始めます（セッション ID と履歴が新しくなります）。`[name]` を付けると最初のセッション名になります。末尾に `now`、`--yes`、`-y` を足すと確認ダイアログを飛ばせます（例: `/reset now`、`/new --yes my-experiment`）。 |
| `/status` | セッションの情報と、続けて手元で作る**セッションの振り返り**（直近のターン数、よく使ったツール、触れたファイル、最新のプロンプトと返答）を表示します。 |
| `/stop` | 動いているバックグラウンド処理をすべて終了し、実行中のエージェントも止めます。 |
| `/model [provider:model]` | モデルを表示、または切り替えます。プロバイダーごとの切り替え（`/model zai:glm-5`）、独自のエンドポイント（`/model custom:model`）、名前を付けた独自プロバイダー（`/model custom:local:qwen`）、自動判別（`/model custom`）、自分で決めた別名（`/model fav`、`/model grok` — [モデルの別名を自分で決める](#custom-model-aliases) を参照）に対応しています。`--global` を付けると config.yaml に保存します。**注意:** `/model` で切り替えられるのは、すでに設定済みのプロバイダーの間だけです。新しいプロバイダーを足したり API キーを用意したりするには、チャットの外のターミナルで `hermes model` を実行してください。**費用の注意:** セッションの途中でモデルを変えるとプロンプト キャッシュが作り直しになるので（キャッシュのキーにモデルが含まれます）、次のメッセージでは会話全体を入力の正価で読み直します。 |
| `/codex-runtime [auto\|codex_app_server\|on\|off]` | 任意で使える [Codex app-server ランタイム](/hermes/docs/user-guide/features/codex-app-server-runtime/) を切り替えます。config.yaml の `model.openai_runtime` に保存し、キャッシュ済みのエージェントを破棄して、次のメッセージから新しいランタイムを使います。次のセッションから有効になります。 |
| `/personality [name]` | このセッションに人格を重ねます。`/personality none`（または `default` / `neutral`）で外します。 |
| `/fast [normal\|fast\|status]` | 高速モード（OpenAI の Priority Processing、Anthropic の Fast Mode）を切り替えます。 |
| `/retry` | 直前のメッセージをもう一度送ります。 |
| `/undo` | 直前のやり取りを取り消します。 |
| `/sethome`（別名: `/set-home`） | いまのチャットを、そのプラットフォームでの配信先のホーム チャンネルにします。 |
| `/compress [here [N] \| focus topic]` | 会話の文脈を手動で圧縮します。`/compress here [N]` は直近 N 往復（既定は 2）をそのまま残し、それ以外をまとめます。焦点となる話題を付けると、全体要約で何を残すかを絞り込めます。 |
| `/topic [off\|help\|session-id]` | **Telegram の 1 対 1 の会話専用。** 自分で管理する複数セッションのトピック モードを操作します。`/topic` で有効にするか状態を表示、`/topic off` で無効にして結び付けを解除、`/topic help` で使い方、トピックの中で `/topic <session-id>` と打つと以前のセッションに戻せます。[1 対 1 の会話での複数セッション](/hermes/docs/user-guide/messaging/telegram/#multi-session-dm-mode-topic) も参照してください。 |
| `/title [name]` | セッション名を設定、または表示します。 |
| `/resume [name]` | 名前を付けておいたセッションを再開します。 |
| `/sessions [all] [search <query>]` | このチャットの過去のセッションを一覧表示します。`/sessions search <query>` は名前や ID の一致で絞り込みます（最近使ったものが上）。`/sessions all` は出どころをまたいで一覧します（管理者のみ）。 |
| `/usage` | トークンの使用量、費用の目安の内訳（入力 / 出力）、文脈の窓の状態、セッションの経過時間を表示します。使っているプロバイダーが対応していれば、その API から取ってきた残りの割り当てやクレジットを**アカウントの上限**として表示します。 |
| `/topup` | Nous の残高を表示し、ポータルで支払いを管理します。 |
| `/whoami` | 自分のスラッシュコマンドの権限（管理者 / 一般ユーザー）を表示します。 |
| `/insights [days]` | 使い方の統計を表示します。 |
| `/reasoning [level\|show\|hide\|full\|clamp] [--global]` | 推論の深さを変えたり（`max` / `ultra` まで指定できます）、推論の表示を切り替えたり（`full` / `clamp` も含みます）します。`--global` を付けると設定ファイルに保存します。 |
| `/voice [on\|off\|tts\|join\|channel\|leave\|status]` | チャットでの読み上げ返答を操作します。`join` / `channel` / `leave` は Discord のボイス チャンネル向けです。 |
| `/rollback [number]` | ファイルのチェックポイントを一覧表示、または復元します。 |
| `/diff [staged\|all\|session] [--stat]` | 作業ディレクトリの git の変更を表示します（コード ブロックに入れ、各プラットフォームのメッセージ上限に合わせて切り詰めます）。`session` は Hermes が変えたものすべての累積差分、`--stat` は要約だけを出します。 |
| `/bg <prompt>` | 別のバックグラウンド セッションでプロンプトを実行します。終わると結果が同じチャットに届きます。[メッセージングのバックグラウンド セッション](/hermes/docs/user-guide/messaging/#background-sessions) も参照してください。 |
| `/btw <question>` | いまの会話について、進行を止めずに脇道の質問をします。会話のスナップショットから答えを作り、できあがるとチャットに届きます。 |
| `/queue <prompt>`（別名: `/q`） | いま動いているターンを止めずに、次のターンに回すプロンプトを積んでおきます。 |
| `/steer <prompt>` | 次のツール呼び出しのあとにメッセージを差し込みます。中断はせず、モデルは新しいターンとしてではなく次の繰り返しの中で受け取ります。 |
| `/goal <text>` | Hermes がターンをまたいで目指し続ける目標を設定します。いわゆる Ralph ループの Hermes 版です。毎ターンのあとに判定モデルが確認し、まだなら達成するまで Hermes が自動で続けます。一時停止や解除をするか、ターンの上限（既定は 20）に達しても止まります。サブコマンドは `/goal status`、`/goal pause`、`/goal resume`、`/goal clear`。状態表示、一時停止、解除はエージェントの実行中でも安全に使えますが、新しい目標を設定するには先に `/stop` が必要です。[持続する目標](/hermes/docs/user-guide/features/goals/) も参照してください。 |
| `/subgoal <text>` | 動いている `/goal` に、ループの途中で判断基準を足します（`/subgoal`、`/subgoal remove <N>`、`/subgoal clear`）。 |
| `/heartbeat every <interval> <prompt>`（別名: `/hb`） | 手が空いたときにこのセッションへ入り直す、繰り返しのプロンプトを設定します。サブコマンドは `status`、`pause`、`resume`、`clear`。Slack では `/hermes heartbeat …` と書きます。 |
| `/refine [focus]` | 記憶とスキルを自己改善する見直しをその場で走らせます。焦点となる指示を添えることもできます。Slack では `/hermes refine …` と書きます。 |
| `/review [instructions]` | いま話していた成果物（PR、コード、ドキュメント）に対して、独立したレビュー用サブエージェントを立ち上げます。終わるとレビューがこのチャットに戻ります。Slack では `/hermes review …` と書きます。 |
| `/moa <prompt>` | プロンプトを 1 つ、既定の [Mixture of Agents](/hermes/docs/user-guide/features/mixture-of-agents/) プリセットで処理してから、セッションのモデルに戻します。 |
| `/branch [name]`（別名: `/fork`） | いまのセッションを枝分かれさせます（別の道を試せます）。 |
| `/agents`（別名: `/tasks`） | 動いているエージェントとタスクを表示します。 |
| `/sessions` | 過去のセッションを一覧して再開します。 |
| `/context [all]`（別名: `/ctx`） | 文脈の窓の使用量と分類ごとの内訳を出します（メッセージング向けの文字だけの形です）。`/context all` を付けるとスキルごと・ツールセットごとのコストも並びます。 |
| `/egress [status]` | Docker の送信プロキシの状態を表示します。 |
| `/init [notes]` | リポジトリを調べて `AGENTS.md` を作成、または更新します。 |
| `/learn <what to learn from>` | 説明したものから、使い回せるスキルを絞り出します。 |
| `/bundles` | 設定済みのスキル束を一覧表示します（複数のスキルをまとめて読み込む `/<name>` 形式の別名です）。 |
| `/reload-skills`（別名: `/reload_skills`） | `~/.hermes/skills/` を調べ直して、追加や削除されたスキルを反映します。 |
| `/footer [on\|off\|status]` | 最終返答に付く実行情報（モデル、文脈の使用率、作業ディレクトリ）の表示を切り替えます。 |
| `/curator [status\|run\|pin\|archive]` | スキルをバックグラウンドで手入れする操作です。 |
| `/suggestions [accept\|dismiss N\|catalog\|clear]` | 提案された自動化をチャットの中で確認します。`/suggestions` で保留中の提案を一覧、`catalog` で選りすぐりの入門用自動化を追加、`clear` で処理済みの提案の記録を整理します。受け入れた提案は、このチャットやスレッドを作業の届け先として引き継ぎます。 |
| `/blueprint [name] [slot=value ...]` | cron のひな形を見たり、穴埋めの案内を始めたり、その場でひな形から作業を作ったりします。その場で作った作業は、いまのチャットやスレッドに結果を届けます。 |
| `/memory [pending\|approve\|reject\|approval]` | 書き込み承認のゲート（`memory.write_approval`）で保留になっている記憶の書き込みを確認し、チャットの中でそのまま承認・却下できます。`/memory approval on\|off` でゲート自体の入切もできます。[記憶の書き込みを管理する](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval) も参照してください。 |
| `/skills [pending\|approve\|reject\|diff\|approval]` | 書き込み承認のゲート（`skills.write_approval`）で保留になっている**スキル**の書き込みを確認します。保留中の書き込みごとに要点が 1 行で出ます。`/skills diff <id>` はチャット向けに切り詰められるので、差分の全文は CLI か `~/.hermes/pending/skills/<id>.json` で読んでください。ゲートが有効なとき（または保留中の書き込みが残っているとき）だけ出てきます。検索と導入は CLI 専用のままです。 |
| `/kanban <action>` | 複数プロファイル・複数プロジェクトの共同作業ボードをチャットから動かします。引数の形は CLI とまったく同じです。エージェントの実行中でも通るので、`/kanban unblock t_abc`、`/kanban comment t_abc "…"`、`/kanban list --mine`、`/kanban boards switch <slug>` などがターンの途中でも使えます。`/kanban create …` は、実行したチャットを新しい作業のターミナル イベントの通知先として自動で登録します。[かんばんのスラッシュコマンド](/hermes/docs/user-guide/features/kanban/#kanban-slash-command) も参照してください。 |
| `/platform <list\|pause\|resume> [name]` | 動いているゲートウェイのプラットフォームをチャットから操作します。`/platform list` はすべてのアダプターとその状態（動作中、遮断器による停止、手動での停止）を表示します。`/platform pause <name>` はアダプターを外さずに新しいメッセージの受け渡しだけを止め、`/platform resume <name>` は再び有効にして、上流が正常に戻っていれば作動した遮断器も解除します。 |
| `/reload-mcp`（別名: `/reload_mcp`） | 設定から MCP サーバーを読み込み直します。 |
| `/verbose` | ツールの進捗表示を切り替えます。**メッセージングでは既定でオフ**です。`config.yaml` で `display.tool_progress_command: true` にすると使えます。 |
| `/yolo` | YOLO モードを切り替えます。危険なコマンドの確認をすべて飛ばします。 |
| `/commands [page]` | すべてのコマンドとスキルをページ送りで見ます。 |
| `/approve [session\|always]` | 保留中の危険なコマンドを承認して実行します。`session` はこのセッションだけの承認、`always` は恒久的な許可リストに追加します。 |
| `/deny` | 保留中の危険なコマンドを却下します。 |
| `/update` | Hermes Agent を最新版に更新します。 |
| `/restart` | 動いている処理を流し切ってから、ゲートウェイを穏やかに再起動します。ゲートウェイが戻ってくると、実行した人のチャットやスレッドに完了の知らせが届きます。 |
| `/debug` | デバッグ報告（システム情報とログ）を送信し、共有できるリンクを受け取ります。 |
| `/help` | メッセージング向けのヘルプを表示します。 |
| `/<skill-name>` | 導入済みのスキルを名前で呼び出します。 |

## 補足 {#notes}

- `/skin`、`/snapshot`、`/export`、`/import`、`/reload`、`/tools`、`/toolsets`、`/browser`、`/config`、`/cron`、`/platforms`、`/paste`、`/image`、`/statusbar`、`/battery`、`/focus`、`/plugins`、`/indicator`、`/wake`、`/journey`、`/redraw`、`/clear`、`/history`、`/save`、`/copy`、`/handoff`、`/prompt`、`/pet`、`/hatch`、`/timestamps`、`/subscription`、`/quit` は **CLI 専用**のコマンドです。
- `/skills` は**検索・閲覧・導入が CLI 専用**ですが、書き込み承認を確認するサブコマンド（`pending`、`approve`、`reject`、`diff`、`approval`）は、`skills.write_approval` が有効ならメッセージング プラットフォームでも使えます。`/memory` は**両方**で使えます。
- `/verbose` は**既定では CLI 専用**ですが、`config.yaml` で `display.tool_progress_command: true` にするとメッセージング プラットフォームでも使えます。有効にすると `display.tool_progress` のモードを順に切り替え、設定に保存します。
- `/focus` と `/verbose` は表示を抑える仕組み（`display.tool_progress`）を共有しているので、互いに食い違うことはありません。`/focus on` はツールの進捗を `off` に固定し、それまでのモードを `display.focus_saved_tool_progress` に退避します。`/focus off` で元に戻ります。集中表示の最中に `/verbose` を切り替えると、モードの主導権が戻り、集中表示のバッジも消えます。集中表示はあくまで見せ方だけの話で、会話の履歴もシステム プロンプトもモデルに送る内容も変えないため、プロンプト キャッシュにはまったく影響しません。
- `/sethome`、`/restart`、`/approve`、`/deny`、`/topic`、`/platform`、`/commands` は**メッセージング専用**のコマンドです。
- `/status`、`/egress`、`/version`、`/whoami`、`/bg`、`/btw`、`/queue`、`/steer`、`/voice`、`/reload-mcp`、`/reload-skills`、`/rollback`、`/diff`、`/debug`、`/fast`、`/approvals`、`/busy`、`/footer`、`/curator`、`/kanban`、`/topup`、`/suggestions`、`/blueprint`、`/learn`、`/init`、`/sessions`、`/yolo` は CLI とメッセージング ゲートウェイの**両方**で使えます。
- `/voice join`、`/voice channel`、`/voice leave` は Discord でだけ意味を持ちます。
- TUI では、`/sessions` はその TUI プロセスで動いているセッションを表示します。保存済みや閉じたあとの記録には `/resume [name]` か `hermes --tui --resume <id-or-title>` を使ってください。

## 内容が消えるコマンドの確認 {#confirmation-prompts-for-destructive-commands}

保存していないセッションの状態を捨ててしまうスラッシュコマンドについて、CLI は実行前に確認します。いま対象になっているのは次のコマンドです。

| コマンド | 何が失われるか |
|---------|------------------|
| `/clear` | 画面を消して新しいセッションを始めます。いまのセッション ID と、メモリ上の履歴がなくなります。 |
| `/new` / `/reset` | 新しいセッションを始めます（セッション ID が新しくなり、履歴は空になります）。 |
| `/undo` | 直前のユーザーとアシスタントのやり取りを履歴から削除します。 |
| `/exit --delete` / `/quit --delete` | 終了する**うえに**、いまのセッションの SQLite 履歴とディスク上の記録を完全に削除します。 |

いずれの場合も、CLI は 3 択のダイアログを出します。**Approve Once**（今回だけ実行）、**Always Approve**（実行したうえで `approvals.destructive_slash_confirm: false` を保存し、以後は確認なしで実行）、**Cancel**（取りやめ）です。

**その場で飛ばす:** 末尾に `now`、`--yes`、`-y` を足すと、その 1 回だけダイアログを省けます（例: `/reset now`、`/new --yes my-session`、`/clear -y`、`/undo -y`）。ターミナルでダイアログがうまく描けないとき（Windows の PowerShell については [issue #30768](https://github.com/NousResearch/hermes-agent/issues/30768) を参照）や、CLI をスクリプトから動かすときに便利です。

`~/.hermes/config.yaml` で `approvals.destructive_slash_confirm: false` にすると、確認を全体で無効にできます。`true` に戻せば再び有効になります。背景は [セキュリティ — 内容が消えるスラッシュコマンドの確認](/hermes/docs/user-guide/security/#dangerous-command-approval) を参照してください。
