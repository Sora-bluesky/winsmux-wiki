---
title: "スラッシュコマンド早見表"
description: "対話型 CLI とメッセージングのスラッシュコマンドをすべて集めた早見表"
upstream_path: reference/slash-commands.md
upstream_blob: e1317c216bbcf84a80bbdc75215a656e7e63fcd7
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/slash-commands
---

# スラッシュコマンド早見表 {#slash-commands-reference}

Hermes のスラッシュコマンドには入り口が2つあり、どちらも `hermes_cli/commands.py` にある中央の `COMMAND_REGISTRY` から動いています。

- **対話型 CLI のスラッシュコマンド** — `cli.py` が処理し、入力補完もこの登録簿から出てきます
- **メッセージングのスラッシュコマンド** — `gateway/run.py` が処理し、ヘルプの文面や各サービスのメニューも登録簿から生成されます

インストール済みのスキルも、どちらの入り口でも動的なスラッシュコマンドとして使えます。同梱スキルの `/plan` もその一つで、プラン モードを開き、作業中のワークスペースやバックエンドの作業ディレクトリを基点に `.hermes/plans/` へ Markdown のプランを保存します。

## 権限と管理者・一般ユーザーの分け方 {#permissions-and-adminuser-split}

ユーザーごとの許可リストを持つメッセージングサービス（Telegram、Discord、Slack、Matrix、Mattermost、Signal など）では、スラッシュコマンドを二段階に分けられます。**管理者**は登録済みのコマンドをすべて使えて、**一般ユーザー**は `user_allowed_commands` に並べた名前だけ（それに加えて、常に許可される `/help` と `/whoami`）を使えます。設定は `~/.hermes/gateway-config.yaml` の各サービスの `extra:` ブロックの中で、`allow_admin_from` と `user_allowed_commands`（グループ向けには `group_allow_admin_from` / `group_user_allowed_commands`）を書きます。

書き方はどのサービスでも同じなので、実例は各サービスのドキュメントを見てください。

- [Telegram](/hermes/docs/user-guide/messaging/telegram/#slash-command-access-control)
- [Discord](/hermes/docs/user-guide/messaging/discord/)
- [Slack](/hermes/docs/user-guide/messaging/slack/)
- [Matrix](/hermes/docs/user-guide/messaging/matrix/)
- [Mattermost](/hermes/docs/user-guide/messaging/mattermost/)
- [Signal](/hermes/docs/user-guide/messaging/signal/)

ある範囲について `allow_admin_from` を設定していない場合、その範囲は従来どおり制限なしのままで、許可された全員がすべてのコマンドを実行できます。

## 対話型 CLI のスラッシュコマンド {#interactive-cli-slash-commands}

CLI で `/` を打つと入力補完のメニューが開きます。組み込みコマンドは大文字・小文字を区別しません。

### セッション {#session}

| コマンド | 説明 |
|---------|-------------|
| `/new [name]`（別名: `/reset`） | 新しいセッションを始めます（セッション ID と履歴が新しくなります）。`[name]` を付けると最初のセッション名になります。たとえば `/new my-experiment` なら `my-experiment` という名前が付いた新しいセッションが開き、あとから `/resume` や `/sessions` で見つけやすくなります。末尾に `now`、`--yes`、`-y` を足すと確認ダイアログを飛ばせます（例: `/reset now`、`/new --yes my-experiment`）。 |
| `/clear` | 画面を消して新しいセッションを始めます |
| `/history` | 会話の履歴を表示します（`/timestamps` の設定に従います） |
| `/save` | いまの会話を保存します |
| `/prompt`（別名: `/compose`） | 次に送るプロンプトを、その場の入力欄ではなく `$EDITOR`（Markdown）で書きます。長い文章、複数行、体裁を整えたいプロンプトに向いています。 |
| `/retry` | 直前のメッセージをもう一度エージェントへ送り直します |
| `/undo` | 直前のユーザーとアシスタントのやり取りを取り消します |
| `/title` | いまのセッションに名前を付けます（使い方: /title My Session Name） |
| `/compress [here [N] \| focus topic]` | 会話の文脈を手動で圧縮します（記憶を書き出してから要約）。`/compress here [N]` は直近 N 往復（既定 2）だけをそのまま残し、それより前を要約します。区切る位置を自分で決められます。話題を指定すると、要約で何を残すかを絞り込めます。 |
| `/rollback` | ファイルの復元ポイントを一覧表示、または復元します（使い方: /rollback [number]） |
| `/diff [staged\|all\|session] [--stat] [path...]` | 作業ディレクトリの git の変更を表示します。既定では、ステージしていない変更と未追跡ファイルです。`staged` はコミット待ちの内容、`all` は HEAD 以降のすべて、`session` はここで Hermes が変更したものの累積差分（保持している最も古い復元ポイントを基準にします。復元ポイントを有効にしている必要があり、`/rollback diff <N>` を補うものです）を表示します。`--stat` は変更されたファイルの一覧だけを出し、パスを渡すと差分の対象を絞れます。 |
| `/snapshot [create\|restore <id>\|prune]`（別名: `/snap`） | Hermes の設定と状態のスナップショットを作成・復元します。`create [label]` で保存、`restore <id>` でその時点に戻し、`prune [N]` で古いものを削除します。引数なしなら一覧表示です。 |
| `/stop` | 動いているバックグラウンドの処理をすべて止めます |
| `/queue <prompt>`（別名: `/q`） | 次のターンに回すプロンプトを予約します（いま動いているエージェントの応答は止めません）。 |
| `/steer <prompt>` | 実行中に差し込むメモで、**次のツール呼び出しのあと**にエージェントへ届きます。中断もせず、新しいユーザーのターンにもなりません。いま動いているツールが終わった時点で、その結果の末尾に文章が足されるので、ツール呼び出しの流れを崩さずに新しい情報を渡せます。作業の途中で方向を寄せたいとき（テスト実行中に「認証まわりを重点的に」と伝える等）に使います。 |
| `/goal <text>` | Hermes がターンをまたいで目指し続ける目標を設定します。Ralph ループを Hermes なりに解釈したものです。各ターンのあとに判定役のモデルが達成できたかを判断し、まだなら自動で続きます。サブコマンドは `/goal status`、`/goal pause`、`/goal resume`、`/goal clear`。既定の上限は 20 ターン（`goals.max_turns`）で、ユーザーが実際にメッセージを送ると継続ループより優先され、状態は `/resume` しても残ります。詳しい流れは [継続する目標](/hermes/docs/user-guide/features/goals/) を見てください。 |
| `/subgoal <text>` | ループの途中で、いまの目標に自分で条件を書き足します。継続用のプロンプトはすべての追加条件をそのままエージェントに見せ、判定役も DONE / CONTINUE の判断に織り込みます。つまり、元の目標**と**すべての追加条件がそろうまで達成扱いになりません。サブコマンドは `/subgoal`（一覧）、`/subgoal remove <N>`、`/subgoal clear`。`/goal` が動いている必要があります。 |
| `/heartbeat every <interval> <prompt>`（別名: `/hb`） | 決めた間隔ごとに、**このセッション**へ通常のユーザーのターンとして入ってくる定期プロンプトを設定します（最短 60 秒。取りこぼした分はまとめて 1 回になります）。サブコマンドは `/heartbeat status`、`/heartbeat pause`、`/heartbeat resume`、`/heartbeat clear`。セッション内で完結する仕組みなので、独立して確実に回したいときは `hermes cron` を使ってください。[セッションのハートビート](/hermes/docs/user-guide/features/heartbeat/) も参照。 |
| `/refine [focus]` | 記憶とスキルの自己改善レビューを、ターン後の自動実行を待たずに**その場で**走らせます。文章を添えるとレビューの重点を指定できます（例: `/refine save the deploy workflow as a skill`）。会話のスナップショットに対してバックグラウンドで分岐して動くので、進行中のセッションとプロンプトキャッシュには触れず、終わったら結果が報告されます。 |
| `/review [instructions]` | いま話し合っていた作業を、独立した権限フル装備のレビュー役サブエージェントに見てもらいます。対象は PR でもコードでもドキュメントでも、直近 10 件のチャットで触れたものなら何でも構いません。バックグラウンドで PR を開き、差分を読み、コードを動かして調べ、そのレビュー全文がバックグラウンドのサブエージェントの完了報告としてこのセッションに戻ってくるので、メインのエージェントがそのまま対応できます。レビュー専用のモデルは config.yaml の `auxiliary.review` で固定できます（既定ではメインのモデルと同じものを使います）。[サブエージェントへの委任](/hermes/docs/user-guide/features/delegation/#the-review-command) も参照。 |
| `/moa <prompt>` | プロンプトを 1 回だけ既定の [Mixture of Agents](/hermes/docs/user-guide/features/mixture-of-agents/) の設定で流し、そのあといまのモデルに戻します。その場限りで、セッションのモデルは変わりません。 |
| `/resume [name]` | 名前を付けておいたセッションを再開します |
| `/sessions`（TUI での別名: `/switch`） | 従来の CLI では、過去のセッションを選択画面で見て再開します。TUI では、いま開いている TUI セッションの切り替え画面を開きます。TUI で `/sessions new` を使うと、その場でもう一つセッションを立ち上げられます。 |
| `/egress [status]` | Docker の外向き通信プロキシの状態を表示します。有効か、設定済みか、動いているか、認証情報の出どころ、トークンの対応関係、まだ通していない提供元、次にやるべきことがわかります。CLI、TUI、デスクトップのチャット、メッセージングのゲートウェイのいずれでも使えます。 |
| `/redraw` | 画面全体を描き直します（tmux のサイズ変更やマウス選択のあとに表示が崩れたときの復旧用） |
| `/status` | セッションの情報（モデル、提供元、プロファイル、セッション ID、作業ディレクトリ、名前、作成・更新の時刻、トークン合計、エージェントが動いているか）を表示し、続けて手元で作った**セッションの振り返り**を出します（最近のユーザー・アシスタントのターン数、ツール結果の件数、よく使ったツール、最近触れたファイル、直近のユーザーのプロンプトとアシスタントの返答）。振り返りはメモリ上の会話から手元で計算するので、LLM の呼び出しもプロンプトキャッシュへの影響もありません。 |
| `/context [all]`（別名: `/ctx`） | 文脈の使用量を目に見える形で分解します。CLI と TUI では、5×20 のマス目（1 マスがモデルの文脈のおよそ 1%）と、システムプロンプト、ツール定義、ルール、スキルの索引、MCP、サブエージェント、記憶、会話といった内訳の推定値を、空き容量と並べて表示します。メッセージングでは、自動圧縮の基準値と余裕を示すゲージ、圧縮の統計、累計のやり取り量、そして同じ内訳を文字で出します。`/context all` を付けると、スキルごと・ツールセットごとのコスト（索引の分と SKILL.md 読み込みの分、ツールセットのスキーマのトークン数）も並びます。読み取るだけで手元で計算するので、LLM の呼び出しもプロンプトキャッシュへの影響もありません。 |
| `/agents`（別名: `/tasks`） | いまのセッションで動いているエージェントとタスクを表示します。 |
| `/background <prompt>`（別名: `/bg`、`/btw`） | 別のバックグラウンドセッションでプロンプトを処理します。エージェントが単独で進めるので、いまのセッションは別の作業に使えます。終わると結果がパネルで出ます。[CLI のバックグラウンドセッション](/hermes/docs/user-guide/cli/#background-sessions) を参照。 |
| `/branch [name]`（別名: `/fork`） | いまのセッションを分岐させます（別の進め方を試すため） |
| `/worktree [new [name]\|list]` | **CLI 専用。** セッションの途中で、独立した git の作業ツリーを確認・作成します（Copilot CLI の `/worktree new` に着想を得ています）。`/worktree` だけならいまの作業ツリーを表示し、`/worktree list` はリポジトリの作業ツリー一覧、`/worktree new [name]` は `.worktrees/` の下に作業ツリーを作り（`worktree_sync` に従って、取得し直したリモートの先端から分岐します）、セッションのターミナルとファイル操作をそちらへ向け直します。名前を付けると `hermes/<name>` ブランチになり、付けなければ `hermes-<id>` という無作為な名前になります。終了時は、未 push のコミットがある場合だけ作業ツリーが残ります（`hermes -w` と同じ扱いです）。[git の作業ツリー](/hermes/docs/user-guide/git-worktrees/) を参照。 |
| `/handoff <platform>` | **CLI 専用。** いまのセッションをメッセージングサービス（Telegram、Discord、Slack、WhatsApp、Signal、Matrix）へ引き渡します。ゲートウェイがすぐ引き取り、スレッドを持つサービス（Telegram のトピック、Discord のテキストチャンネルのスレッド、Slack のメッセージ起点のスレッド）では新しいスレッドを作り、引き渡し先を CLI の session_id に結び直すので、発言者の区別を保ったまま会話がすべて再生されます。さらに疑似的なユーザーのターンを差し込むので、エージェントが新しい場所で動いていることを自分で確認します。うまくいけば CLI は `/resume` の案内を出して終了し、いつでも `/resume <title>` で手元に戻せます。ターンの途中では実行できません。ゲートウェイが動いていること、引き渡し先のサービスでホームチャンネルが設定されていること（引き渡し先のチャットで `/sethome`）が必要です。[サービスをまたぐ引き渡し](/hermes/docs/user-guide/sessions/#cross-platform-handoff) を参照。 |
| `/journey [list\|delete <id>\|edit <id>]`（別名: `/learning`、`/memory-graph`） | 覚えたスキルと記憶をたどる学習の足跡を開きます。従来の CLI、TUI のオーバーレイ、デスクトップアプリ（Star Map パネル）で使えます。メッセージングサービスでは使えません。[学習の足跡](/hermes/docs/user-guide/features/memory/#learning-journey-journey) を参照。 |

### 設定 {#configuration}

| コマンド | 説明 |
|---------|-------------|
| `/config` | いまの設定を表示します |
| `/model [model-name]` | いまのモデルを表示、または変更します。指定できるのは `/model claude-sonnet-4`、`/model provider:model`（提供元ごと切り替え）、`/model custom:model`（独自のエンドポイント）、`/model custom:name:model`（名前を付けた独自の提供元）、`/model custom`（エンドポイントから自動判別）、そして自分で決めた別名（`/model fav`、`/model grok` — [モデルの別名を自分で決める](#custom-model-aliases) を参照）です。オプションは、`--global` で config.yaml に保存、`--session` でそのセッション限りに固定、`--once` で次のターンだけ適用、`--refresh` で提供元のモデル一覧を取り直し、`--provider <name>` でバックエンドを切り替え（`--global` を付けない限りセッション限り）。単に `/model <name>` と書いた場合は、`model.persist_switch_by_default: true` を設定していなければセッション限りです。**選択画面:** 引数なしで `/model` を実行すると、提供元 → モデルの順に選ぶ画面が開きます。モデルの一覧では**入力してあいまい絞り込み**ができます（`grok` と打てば該当するモデルだけに絞られます）。Backspace で絞り込みを削り、Esc で解除（または画面を閉じる）です。選択の結果は必ず 1 つのモデルに定まり、絞り込みは候補を減らすだけで推測はしません。**注意:** `/model` は、すでに設定済みの提供元の間でしか切り替えられません。新しい提供元を足すには、セッションを抜けてターミナルから `hermes model` を実行してください。**費用の注意:** 会話の途中でモデルを変えるとプロンプトキャッシュが無効になります。キャッシュの鍵にモデルが含まれているためで、次のターンは会話全体を、約 75% 引きのキャッシュ価格ではなく通常の入力価格で読み直します。避けられない仕様ですが、長いセッションでは知っておく価値があります。 |
| `/codex-runtime [auto\|codex_app_server\|on\|off]` | OpenAI / Codex 系のモデル向けに、任意の [Codex app-server ランタイム](/hermes/docs/user-guide/features/codex-app-server-runtime/) を切り替えます。`auto`（既定）は Hermes の標準のチャット補完を使い、`codex_app_server` は `codex app-server` のサブプロセスにターンを渡して、ネイティブのシェル、apply_patch、ChatGPT のサブスクリプション認証、移植された Codex のプラグインを使えるようにします。次のセッションから有効になります。 |
| `/personality` | あらかじめ用意された人格を設定します。`/personality none`（または `default` / `neutral`）で人格を外して素の動きに戻します。 |
| `/verbose` | ツールの進捗表示を切り替えます（off → new → all → verbose の順）。設定でメッセージングでも[有効にできます](#notes)。 |
| `/focus [on\|off\|status]` | **集中表示**の切り替えです。表示だけを絞るモードで、自分のプロンプトと最終的な返答だけが見えます。`/verbose` とも噛み合っていて、有効にするとツールの進捗表示は `off` になり、それまでのモードは覚えられていて `/focus off` で戻ります。各ターンの終わりには控えめな復帰の案内（`⋯ 7 tool lines hidden · /focus off to show`）が出て、ステータスバーには `◉ focus` の印が残るので、絞った表示のままかどうかが常にわかります。モデルへ送る内容は何も変わりません。詳細は隠れるだけで、捨てられてはいません。 |
| `/fast [normal\|fast\|status]` | 高速モード（OpenAI の Priority Processing / Anthropic の Fast Mode）を切り替えます。指定できるのは `normal`、`fast`、`status` です。 |
| `/reasoning [level\|show\|hide\|full\|clamp] [--global]` | 推論の深さと表示を調整します。深さは `none` / `minimal` / `low` / `medium` / `high` / `xhigh` / `max` / `ultra` などです。`show` / `hide`（または `on` / `off`）で推論の表示を切り替え、`full` と `clamp` は見せ方を調整します。`--global` を付けると深さを設定ファイルに保存します。 |
| `/skin` | 見た目のスキン／テーマを表示、または変更します |
| `/export [profile] [-o out.tar.gz]` | **CLI 専用。** プロファイルを配布できる `.tar.gz` にまとめます。スキル、記憶、人格、定期実行、プラグイン、設定に加え、デスクトップからならテーマや画面の配置も入ります。認証情報（`auth.json`、`.env`）は取り除かれます。既定では、いま使っているプロファイルを、いまのディレクトリに `<name>.tar.gz` として書き出します。中身は `hermes profile export` と同じです。版を管理しながら更新も届けたい場合は、[プロファイルの配布](/hermes/docs/user-guide/profile-distributions/) を使ってください。 |
| `/import <archive.tar.gz> [--name <name>]` | **CLI 専用。** プロファイルの書庫を新しいプロファイルとして取り込みます。名前は書庫から推測しますが、`--name` で指定もできます。既存のプロファイルを上書きすることはなく、`default` としての取り込みもできません。名前が空いていればシェルのラッパーも作ります。[プロファイルをファイルで書き出す・取り込む](/hermes/docs/user-guide/profile-distributions/#export-and-import-a-profile-file) を参照。 |
| `/statusbar`（別名: `/sb`） | 文脈とモデルを示すステータスバーの表示を切り替えます |
| `/battery [on\|off\|status]` | ステータスバーの先頭に、色分けしたバッテリー残量を出すかどうかを切り替えます（既定は off。バッテリーがない環境では何も起きません）。 |
| `/voice [on\|off\|tts\|status]` | CLI の音声モードと読み上げを切り替えます。録音には `voice.record_key`（既定: `Ctrl+B`）を使います。 |
| `/yolo` | YOLO モードを切り替えます。危険なコマンドの承認確認をすべて飛ばします。 |
| `/approvals [manual\|smart\|off]` | 危険なコマンドの承認方式（保存される設定）を表示、または変更します。 |
| `/footer [on\|off\|status]` | 最終的な返答に、ゲートウェイの実行情報のフッター（モデル、文脈の使用率、作業ディレクトリ）を付けるかを切り替えます。 |
| `/busy [queue\|steer\|interrupt\|status]` | CLI 専用。Hermes が作業している最中に Enter を押したときの動き（新しいメッセージを予約する、途中で方向を伝える、すぐ割り込む）を決めます。 |
| `/indicator [kaomoji\|emoji\|unicode\|ascii]` | CLI 専用。TUI の「作業中」表示の見た目を選びます。 |
| `/timestamps [on\|off\|status]` | CLI 専用。メッセージと `/history` に `[HH:MM]` の時刻を出すかを切り替えます。 |
| `/wake [on\|off\|status]` | CLI 専用。「Hey Hermes」の呼びかけ待ち受けを切り替えます。 |

### ツールとスキル {#tools-skills}

| コマンド | 説明 |
|---------|-------------|
| `/tools [list\|disable\|enable] [name...]` | ツールを管理します。使えるツールを一覧表示したり、いまのセッションで特定のツールを無効・有効にしたりできます。無効にするとエージェントの持ち道具から外れ、セッションが初期化されます。 |
| `/toolsets` | 使えるツールセットを一覧表示します |
| `/browser [connect\|disconnect\|status]` | 手元の Chromium 系ブラウザとの CDP 接続を管理します。`connect` は動いている Chrome、Brave、Chromium、Edge にブラウザ用のツールをつなぎます（既定: `http://127.0.0.1:9222`）。`disconnect` で切り離し、`status` でいまの接続を表示します。デバッガが見つからない場合は、対応する Chromium 系ブラウザを自動で起動します。 |
| `/skills` | オンラインの登録簿からスキルを検索、インストール、確認、管理します。スキルの書き込み承認の確認場所でもあります: `/skills pending`、`/skills diff <id>`、`/skills approve <id>`、`/skills reject <id>`、`/skills approval on\|off`。[エージェントによるスキル書き込みに承認をはさむ](/hermes/docs/user-guide/features/skills/#gating-agent-skill-writes-skillswrite_approval) を参照。 |
| `/memory [pending\|approve\|reject\|approval]` | 書き込み承認（`memory.write_approval`）で保留になっている記憶の書き込みを確認し、承認の仕組み自体も切り替えます。[記憶の書き込みを制御する](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval) を参照。 |
| `/bundles` | 設定済みのスキルの束を一覧表示します。複数のスキルをまとめて読み込む `/<name>` の別名です。`~/.hermes/config.yaml` の `bundles:` の下で設定します。[スキルの束](/hermes/docs/user-guide/features/skills/#skill-bundles) を参照。 |
| `/learn <what to learn from>` | 説明したものから、再利用できるスキルを抽出します。ディレクトリでも、URL でも、いまエージェントと一緒に進めた手順でも、貼り付けたメモでもかまいません。書き方は自由で、エージェントが自分のツールで材料を集め、家のルールに沿って `SKILL.md` を書き上げます。CLI、メッセージングのゲートウェイ、TUI、ダッシュボードのスキル画面で使えます。 |
| `/init [notes]` | リポジトリを読み取って、プロジェクトの指示書 `AGENTS.md` を作成・更新します（Codex の `/init` の移植です）。エージェントが読み取り専用のツールで、依存関係の定義、構成、ツールチェーンの設定を調べ、簡潔な `AGENTS.md` を書きます。すでにある場合は、書かれている内容を残したまま統合して更新します。メモを添えると重点を指定できます。CLI、メッセージングのゲートウェイ、TUI で使えます。 |
| `/cron` | 定期実行のタスクを管理します（一覧、追加・作成、編集、一時停止、再開、実行、削除） |
| `/suggestions [accept\|dismiss N\|catalog\|clear]`（別名: `/suggest`） | 提案された自動化を確認します。`/suggestions` で保留中の提案を一覧表示し、`/suggestions accept <id>` で提案どおりの自動化を作成、`/suggestions dismiss <id>` で見送り、`/suggestions catalog` で厳選された入門用の自動化を追加、`/suggestions clear` で処理済みの提案の記録を消します。受け入れたジョブは、いま使っている入り口を配信先として引き継ぎます。 |
| `/blueprint [name] [slot=value ...]`（別名: `/bp`） | ひな型から自動化を設定します。`/blueprint` だけならひな型の一覧、`/blueprint <name>` は次のエージェントのターンで項目を順に埋める案内を始め、`/blueprint <name> slot=value ...` はその場でジョブを作ります。 |
| `/curator` | スキルをバックグラウンドで手入れします（`status`、`run`、`pin`、`archive`）。[キュレーター](/hermes/docs/user-guide/features/curator/) を参照。 |
| `/kanban <action>` | 複数のプロファイル・複数のプロジェクトにまたがる共同作業ボードを、チャットから離れずに操作します。`hermes kanban` でできることはすべて使えます: `/kanban list`、`/kanban show t_abc`、`/kanban create "title" --assignee X`、`/kanban comment t_abc "text"`、`/kanban unblock t_abc`、`/kanban dispatch` など。複数ボードにも対応しています: `/kanban boards list`、`/kanban boards create <slug>`、`/kanban boards switch <slug>`、`/kanban --board <slug> <action>`。[かんばんのスラッシュコマンド](/hermes/docs/user-guide/features/kanban/#kanban-slash-command) を参照。 |
| `/reload-mcp`（別名: `/reload_mcp`） | config.yaml から MCP サーバーを読み込み直します |
| `/reload-skills`（別名: `/reload_skills`） | 新しく入れたスキルや消したスキルを反映するため、`~/.hermes/skills/` を調べ直します |
| `/reload` | `.env` の変数を動いているセッションに読み込み直します（再起動せずに新しい API キーを反映できます） |
| `/plugins` | 入っているプラグインとその状態を一覧表示します |
| `/pet [list\|<slug>]` | [petdex](/hermes/docs/user-guide/features/pets/) のマスコットを表示したり迎えたりします。`/pet` でパネルの表示を切り替え、`/pet list` で手元のペットを一覧表示、`/pet <slug>` で特定の一匹を迎えます。 |
| `/hatch <description>`（別名: `/generate-pet`） | 文章の説明から、まったく新しい petdex のペットを作ります。設定済みの画像生成（OpenRouter / Nous Portal）を使います。[ペット](/hermes/docs/user-guide/features/pets/) を参照。 |

### 情報 {#info}

| コマンド | 説明 |
|---------|-------------|
| `/help` | 使えるコマンドを分類ごとに表示します。既定では中心的なコマンドを見せ、スキル由来のコマンドは件数だけの 1 行にまとめます。`/help skills` はスキルのコマンドをすべて並べ、`/help <text>` は文字列でコマンド（と該当するスキル）を絞り込みます。 |
| `/palette` | あいまい検索のコマンドパレットを開きます（**Ctrl+P** でも開きます）。入力してすべてのコマンドとスキルを絞り込み、↑/↓ で移動、Enter で選んだコマンドを入力欄に挿入します（勝手に実行はしません）。Esc で取り消しです。コマンド名を優先して並べるので、短い入力でも狙いが外れません。 |
| `/version` | Hermes Agent の版、ビルド、実行環境の情報を表示します。 |
| `/whoami` | 自分のスラッシュコマンドの権限（管理者 / 一般ユーザー）を表示します。 |
| `/usage` | トークンの使用量、費用の内訳、セッションの経過時間を表示します。使っている提供元が対応していれば、API から取ってきた残りの利用枠・クレジット・プランの使用状況を**アカウントの上限**として並べます。 |
| `/topup` | Nous の残高を表示し、ポータルで支払いを管理します（以前の `/credits` と `/billing` の置き換えです）。 |
| `/subscription`（別名: `/upgrade`） | **CLI 専用。** Nous のプランを確認し、ブラウザで変更します。 |
| `/insights` | 使用状況の分析を表示します（直近 30 日） |
| `/update` | Hermes Agent を最新版に更新します。 |
| `/platforms`（別名: `/gateway`） | ゲートウェイとメッセージングサービスの状態を表示します（CLI 専用のまとめ表示）。 |
| `/paste` | クリップボードの画像を添付します |
| `/copy [number]` | 直前のアシスタントの返答をクリップボードにコピーします（数字を付けると、その分だけさかのぼった返答になります）。CLI 専用。 |
| `/image <path>` | 手元の画像ファイルを次のプロンプトに添付します。 |
| `/debug` | デバッグ用の報告（システム情報とログ）をアップロードし、共有できるリンクを受け取ります。メッセージングでも使えます。 |
| `/update` | Hermes Agent を最新版に更新します。 |
| `/profile` | 使っているプロファイルの名前とホームディレクトリを表示します |

### 終了 {#exit}

| コマンド | 説明 |
|---------|-------------|
| `/quit` | CLI を終了します（`/exit` でも同じです）。 |

### 動的な CLI スラッシュコマンド {#dynamic-cli-slash-commands}

| コマンド | 説明 |
|---------|-------------|
| `/<skill-name>` | 入っているスキルを、必要になったときにコマンドとして読み込みます。例: `/gif-search`、`/github-pr-workflow`、`/excalidraw`。 |
| `/skills ...` | 登録簿や公式の追加スキル目録から、スキルを検索、閲覧、確認、インストール、点検、公開、設定します。 |

### クイックコマンド {#quick-commands}

クイックコマンドは、短いスラッシュコマンドをシェルのコマンドか別のスラッシュコマンドに割り当てる、自分専用の設定です。`~/.hermes/config.yaml` で設定します。

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

こうしておくと、CLI でもメッセージングサービスでも `/status`、`/deploy`、`/inbox` と打てます。クイックコマンドは実行時に解決されるので、組み込みの入力補完やヘルプの表にはすべてが出てくるとは限りません。

文字列だけのプロンプトの短縮は、クイックコマンドとしては使えません。長くて何度も使うプロンプトはスキルにするか、`type: alias` で既存のスラッシュコマンドを指してください。

### モデルの別名を自分で決める {#custom-model-aliases}

よく使うモデルに自分で短い名前を付けておくと、CLI でもメッセージングサービスでも `/model <alias>` で呼び出せます。別名はどちらでも同じように働き、セッション限り（既定）でも `--global` でも使えます。

設定の書き方は 2 通りあります。

**詳しい書き方** — モデルと提供元、必要ならベース URL まで指定します。`~/.hermes/config.yaml` に書きます。

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

**短い書き方** — `provider/model` を 1 つの文字列で書きます。YAML を編集せず、シェルから設定できます。

```bash
hermes config set model.aliases.fav anthropic/claude-opus-4.6
hermes config set model.aliases.grok x-ai/grok-4
```

あとはチャットでこう打ちます。

```
/model fav            # session-only
/model grok --global  # also persists current-model change to config.yaml
```

自分で決めた別名は組み込みの短縮名より優先されるので、`sonnet`、`kimi`、`opus` などを別名にすると組み込みの方が隠れます。別名は大文字・小文字を区別しません。

### 別名の解決 {#alias-resolution}

コマンドは先頭一致でも通ります。`/h` は `/help` に、`/mod` は `/model` になります。先頭一致で複数のコマンドに当てはまる場合は、登録簿の順で最初に見つかったものが勝ちます。完全なコマンド名と登録済みの別名は、常に先頭一致より優先されます。

## メッセージングのスラッシュコマンド {#messaging-slash-commands}

> **Slack のスレッド内でのコマンド（`!` 始まり）:**
> Slack 自体がスレッドの中でのスラッシュコマンドを止めてしまい（「/queue is not supported in threads. Sorry!」）、Hermes には届きません。Slack のスレッドの中では代わりに `!` を頭に付けてください（`!stop`、`!new`、`!status`）。ゲートウェイはスラッシュの形とまったく同じように処理します。スレッドの中でも `@Hermes !stop` と `@Hermes /stop` は動きます。判定されるのは最初の単語だけなので、`!nice work` のようなメッセージはそのままエージェントに渡ります。詳しくは [スレッドの中でコマンドを使う](/hermes/docs/user-guide/messaging/slack/#using-commands-inside-threads-the-cmd-prefix) を見てください。

メッセージングのゲートウェイは、Telegram、Discord、Slack、WhatsApp、Signal、メール、Home Assistant、Teams のチャットで、次の組み込みコマンドに対応しています。

| コマンド | 説明 |
|---------|-------------|
| `/start` | サービス側の作法としてのコマンドです。多くのチャットサービス（Telegram、Discord など）は、ユーザーがボットとの会話を初めて開いたときに `/start` を自動で送ります。Hermes はこの合図を黙って受け取り、エージェントの返答もセッションの消費もしないので、最初の握手でターンを無駄にしません。ゲートウェイに届いているかを確かめるために、自分で送ってもかまいません。 |
| `/new [name]`（別名: `/reset`） | 新しいセッションを始めます（セッション ID と履歴が新しくなります）。`[name]` を付けると最初のセッション名になります。末尾に `now`、`--yes`、`-y` を足すと確認ダイアログを飛ばせます（例: `/reset now`、`/new --yes my-experiment`）。 |
| `/status` | セッションの情報を表示し、続けて手元で作った**セッションの振り返り**（最近のターン数、よく使ったツール、触れたファイル、直近のプロンプトと返答）を出します。 |
| `/stop` | 動いているバックグラウンドの処理をすべて止め、実行中のエージェントに割り込みます。 |
| `/model [provider:model]` | モデルを表示、または変更します。提供元ごとの切り替え（`/model zai:glm-5`）、独自のエンドポイント（`/model custom:model`）、名前を付けた独自の提供元（`/model custom:local:qwen`）、自動判別（`/model custom`）、自分で決めた別名（`/model fav`、`/model grok` — [モデルの別名を自分で決める](#custom-model-aliases) を参照）に対応しています。`--global` を付けると config.yaml に保存されます。**注意:** `/model` は、すでに設定済みの提供元の間でしか切り替えられません。新しい提供元を足したり API キーを用意したりするには、チャットの外に出てターミナルから `hermes model` を使ってください。**費用の注意:** セッションの途中でモデルを変えるとプロンプトキャッシュが無効になり（キャッシュの鍵にモデルが含まれるためです）、次のメッセージは会話全体を通常の入力価格で読み直します。 |
| `/codex-runtime [auto\|codex_app_server\|on\|off]` | 任意の [Codex app-server ランタイム](/hermes/docs/user-guide/features/codex-app-server-runtime/) を切り替えます。config.yaml の `model.openai_runtime` に保存され、キャッシュしていたエージェントを破棄するので、次のメッセージから新しいランタイムになります。次のセッションから有効です。 |
| `/personality [name]` | そのセッションに人格を重ねます。`/personality none`（または `default` / `neutral`）で外します。 |
| `/fast [normal\|fast\|status]` | 高速モード（OpenAI の Priority Processing / Anthropic の Fast Mode）を切り替えます。 |
| `/retry` | 直前のメッセージを送り直します。 |
| `/undo` | 直前のやり取りを取り消します。 |
| `/sethome`（別名: `/set-home`） | いまのチャットを、配信先となるサービスのホームチャンネルとして登録します。 |
| `/compress [here [N] \| focus topic]` | 会話の文脈を手動で圧縮します。`/compress here [N]` は直近 N 往復（既定 2）をそのまま残し、残りを要約します。話題を指定すると、要約で何を残すかを絞り込めます。 |
| `/topic [off\|help\|session-id]` | **Telegram の個人チャット専用。** 自分で管理する複数セッションのトピックモードを操作します。`/topic` で有効化または状態表示、`/topic off` で無効化して結び付けを解除、`/topic help` で使い方、トピックの中で `/topic <session-id>` を打つと以前のセッションに戻せます。[個人チャットでの複数セッション](/hermes/docs/user-guide/messaging/telegram/#multi-session-dm-mode-topic) を参照。 |
| `/title [name]` | セッションの名前を設定、または表示します。 |
| `/resume [name]` | 名前を付けておいたセッションを再開します。 |
| `/sessions [all] [search <query>]` | このチャットの過去のセッションを一覧表示します。`/sessions search <query>` は名前や ID で絞り込みます（最近使った順）。`/sessions all` は入り口をまたいで一覧表示します（管理者のみ）。 |
| `/usage` | トークンの使用量、費用の内訳の見積もり（入力・出力）、文脈の使用状況、セッションの経過時間を表示します。使っている提供元が対応していれば、API から取ってきた残りの利用枠・クレジットを**アカウントの上限**として並べます。 |
| `/topup` | Nous の残高を表示し、ポータルで支払いを管理します。 |
| `/whoami` | 自分のスラッシュコマンドの権限（管理者 / 一般ユーザー）を表示します。 |
| `/insights [days]` | 使用状況の分析を表示します。 |
| `/reasoning [level\|show\|hide\|full\|clamp] [--global]` | 推論の深さ（`max` / `ultra` まで）を変えたり、推論の表示を切り替えたり（`full` / `clamp` を含む）します。`--global` で設定ファイルに保存します。 |
| `/voice [on\|off\|tts\|join\|channel\|leave\|status]` | チャットでの読み上げを操作します。`join` / `channel` / `leave` は Discord のボイスチャンネルモード用です。 |
| `/rollback [number]` | ファイルの復元ポイントを一覧表示、または復元します。 |
| `/diff [staged\|all\|session] [--stat]` | 作業ディレクトリの git の変更を表示します（コードブロックに入れ、サービスのメッセージ長に合わせて切り詰めます）。`session` は Hermes が変更したものの累積差分で、`--stat` はまとめだけを出します。 |
| `/background <prompt>` | 別のバックグラウンドセッションでプロンプトを処理します。終わると同じチャットに結果が届きます。[メッセージングのバックグラウンドセッション](/hermes/docs/user-guide/messaging/#background-sessions) を参照。 |
| `/queue <prompt>`（別名: `/q`） | いまのターンに割り込まずに、次のターンへ回すプロンプトを予約します。 |
| `/steer <prompt>` | 割り込まずに、次のツール呼び出しのあとにメッセージを差し込みます。新しいターンとしてではなく、モデルが次に進むところで受け取ります。 |
| `/goal <text>` | Hermes がターンをまたいで目指し続ける目標を設定します。Ralph ループを Hermes なりに解釈したものです。各ターンのあとに判定役のモデルが確認し、まだなら達成するまで自動で続きます。途中で一時停止・解除するか、ターンの上限（既定 20）に達すれば止まります。サブコマンドは `/goal status`、`/goal pause`、`/goal resume`、`/goal clear`。エージェントが動いている最中でも status / pause / clear は安全ですが、新しい目標を設定するには先に `/stop` が必要です。[継続する目標](/hermes/docs/user-guide/features/goals/) を参照。 |
| `/subgoal <text>` | ループの途中で、いまの `/goal` に条件を書き足します（`/subgoal`、`/subgoal remove <N>`、`/subgoal clear`）。 |
| `/heartbeat every <interval> <prompt>`（別名: `/hb`） | 空いているときにこのセッションへ入ってくる定期プロンプトを設定します。サブコマンドは `status`、`pause`、`resume`、`clear`。Slack では `/hermes heartbeat …` の形で使います。 |
| `/refine [focus]` | 記憶とスキルの自己改善レビューをその場で走らせます。重点を指定することもできます。Slack では `/hermes refine …` の形で使います。 |
| `/review [instructions]` | いま話し合っていた作業（PR、コード、ドキュメント）を、独立したレビュー役サブエージェントに見てもらいます。終わるとそのレビューがこのチャットに戻ってきます。Slack では `/hermes review …` の形で使います。 |
| `/moa <prompt>` | プロンプトを 1 回だけ既定の [Mixture of Agents](/hermes/docs/user-guide/features/mixture-of-agents/) の設定で流し、そのあとセッションのモデルに戻します。 |
| `/branch [name]`（別名: `/fork`） | いまのセッションを分岐させます（別の進め方を試すため）。 |
| `/agents`（別名: `/tasks`） | 動いているエージェントとタスクを表示します。 |
| `/sessions` | 過去のセッションを見て再開します。 |
| `/context [all]`（別名: `/ctx`） | 文脈の使用量のゲージと内訳です（メッセージングで読みやすい文字の形）。`/context all` を付けるとスキルごと・ツールセットごとのコストも並びます。 |
| `/egress [status]` | Docker の外向き通信プロキシの状態を表示します。 |
| `/init [notes]` | リポジトリを読み取って `AGENTS.md` を作成・更新します。 |
| `/learn <what to learn from>` | 説明したものから、再利用できるスキルを抽出します。 |
| `/bundles` | 設定済みのスキルの束を一覧表示します（複数のスキルをまとめて読み込む `/<name>` の別名）。 |
| `/reload-skills`（別名: `/reload_skills`） | 新しく入れたスキルや消したスキルを反映するため、`~/.hermes/skills/` を調べ直します。 |
| `/footer [on\|off\|status]` | 最終的な返答に実行情報のフッター（モデル、文脈の使用率、作業ディレクトリ）を付けるかを切り替えます。 |
| `/curator [status\|run\|pin\|archive]` | スキルのバックグラウンドでの手入れを操作します。 |
| `/suggestions [accept\|dismiss N\|catalog\|clear]` | 提案された自動化をチャットでそのまま確認します。`/suggestions` は保留中の提案の一覧、`catalog` は厳選された入門用の自動化の追加、`clear` は処理済みの提案の記録の整理です。受け入れた提案は、このチャットやスレッドをジョブの配信先として保持します。 |
| `/blueprint [name] [slot=value ...]` | 定期実行のひな型を眺めたり、項目を順に埋める会話を始めたり、その場でひな型からジョブを作ったりします。直接作ったジョブは、いまのチャットやスレッドに結果を届けます。 |
| `/memory [pending\|approve\|reject\|approval]` | 書き込み承認（`memory.write_approval`）で保留になっている記憶の書き込みを確認し、チャットのままで承認・却下できます。`/memory approval on\|off` で承認の仕組み自体も切り替えられます。[記憶の書き込みを制御する](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval) を参照。 |
| `/skills [pending\|approve\|reject\|diff\|approval]` | 書き込み承認（`skills.write_approval`）で保留になっている**スキル**の書き込みを確認します。保留ごとに 1 行の要点が出ます。`/skills diff <id>` はチャット向けに切り詰められるので、差分の全文は CLI か `~/.hermes/pending/skills/<id>.json` で読んでください。承認の仕組みが有効なとき（または保留が残っているとき）だけ出てきます。検索とインストールは CLI 専用のままです。 |
| `/kanban <action>` | 複数のプロファイル・複数のプロジェクトにまたがる共同作業ボードをチャットから操作します。指定できる内容は CLI とまったく同じです。エージェントが動いていても止められないので、`/kanban unblock t_abc`、`/kanban comment t_abc "…"`、`/kanban list --mine`、`/kanban boards switch <slug>` などがターンの途中でも通ります。`/kanban create …` を使うと、そのチャットが新しいタスクのターミナルの動きを自動で受け取るようになります。[かんばんのスラッシュコマンド](/hermes/docs/user-guide/features/kanban/#kanban-slash-command) を参照。 |
| `/platform <list\|pause\|resume> [name]` | 動いているゲートウェイのサービスをチャットから操作します。`/platform list` はすべての接続とその状態（動作中、遮断による停止、手動停止）を表示し、`/platform pause <name>` はその接続を外さずに新しいメッセージの配信だけを止め、`/platform resume <name>` は再開して、相手側が復調していれば作動した遮断も解除します。 |
| `/reload-mcp`（別名: `/reload_mcp`） | 設定から MCP サーバーを読み込み直します。 |
| `/verbose` | ツールの進捗表示を切り替えます。**メッセージングでは既定で off** です。`config.yaml` で `display.tool_progress_command: true` にすると使えます。 |
| `/yolo` | YOLO モードを切り替えます。危険なコマンドの承認確認をすべて飛ばします。 |
| `/commands [page]` | すべてのコマンドとスキルを見ます（ページ送り）。 |
| `/approve [session\|always]` | 保留になっている危険なコマンドを承認して実行します。`session` はこのセッション限りの承認、`always` は恒久的な許可リストへの追加です。 |
| `/deny` | 保留になっている危険なコマンドを却下します。 |
| `/update` | Hermes Agent を最新版に更新します。 |
| `/restart` | 動いている処理を終えてから、ゲートウェイを穏やかに再起動します。復帰すると、依頼した人のチャットやスレッドに完了の知らせが届きます。 |
| `/debug` | デバッグ用の報告（システム情報とログ）をアップロードし、共有できるリンクを受け取ります。 |
| `/help` | メッセージング向けのヘルプを表示します。 |
| `/<skill-name>` | 入っているスキルを名前で呼び出します。 |

## 補足 {#notes}

- `/skin`、`/snapshot`、`/export`、`/import`、`/reload`、`/tools`、`/toolsets`、`/browser`、`/config`、`/cron`、`/platforms`、`/paste`、`/image`、`/statusbar`、`/battery`、`/focus`、`/plugins`、`/busy`、`/indicator`、`/wake`、`/journey`、`/redraw`、`/clear`、`/history`、`/save`、`/copy`、`/handoff`、`/prompt`、`/pet`、`/hatch`、`/timestamps`、`/subscription`、`/quit` は **CLI 専用**のコマンドです。
- `/skills` は、検索・閲覧・インストールについては **CLI 専用**です。書き込み承認の確認用のサブコマンド（`pending`、`approve`、`reject`、`diff`、`approval`）は、`skills.write_approval` が有効ならメッセージングサービスでも動きます。`/memory` は**どちらでも**使えます。
- `/verbose` は**既定では CLI 専用**ですが、`config.yaml` で `display.tool_progress_command: true` にするとメッセージングサービスでも使えます。有効にすると `display.tool_progress` のモードを順に切り替え、設定に保存します。
- `/focus` と `/verbose` は同じ抑制の仕組み（`display.tool_progress`）を共有しているので、互いに食い違うことはありません。`/focus on` はツールの進捗表示を `off` に固定し、それまでのモードを `display.focus_saved_tool_progress` に退避します。`/focus off` で戻り、集中表示のまま `/verbose` を切り替えるとモードの主導権が戻って集中表示の印も消えます。集中表示は見た目だけの機能で、会話の履歴もシステムプロンプトもモデルへ送る内容も変えないため、プロンプトキャッシュには一切影響しません。
- `/sethome`、`/restart`、`/approve`、`/deny`、`/topic`、`/platform`、`/commands` は**メッセージング専用**のコマンドです。
- `/status`、`/egress`、`/version`、`/whoami`、`/background`、`/queue`、`/steer`、`/voice`、`/reload-mcp`、`/reload-skills`、`/rollback`、`/diff`、`/debug`、`/fast`、`/approvals`、`/footer`、`/curator`、`/kanban`、`/topup`、`/suggestions`、`/blueprint`、`/learn`、`/init`、`/sessions`、`/yolo` は、CLI とメッセージングのゲートウェイの**どちらでも**動きます。
- `/voice join`、`/voice channel`、`/voice leave` は Discord でだけ意味を持ちます。
- TUI での `/sessions` は、その TUI のプロセスで動いているセッションを表示します。保存済みや閉じたあとの記録には `/resume [name]` か `hermes --tui --resume <id-or-title>` を使ってください。

## 取り消せないコマンドの確認 {#confirmation-prompts-for-destructive-commands}

保存していないセッションの状態を捨ててしまうスラッシュコマンドについては、CLI が実行前に確認します。いま対象になっているのは次のコマンドです。

| コマンド | 失われるもの |
|---------|------------------|
| `/clear` | 画面を消して新しいセッションを始めます。いまのセッション ID とメモリ上の履歴はなくなります。 |
| `/new` / `/reset` | 新しいセッションを始めます（セッション ID が変わり、履歴は空になります）。 |
| `/undo` | 直前のユーザーとアシスタントのやり取りを履歴から取り除きます。 |
| `/exit --delete` / `/quit --delete` | 終了し、**さらに**いまのセッションの SQLite の履歴とディスク上の記録を完全に削除します。 |

いずれの場合も CLI は 3 択のダイアログを出します。**Approve Once**（今回だけ実行）、**Always Approve**（実行したうえで `approvals.destructive_slash_confirm: false` を保存し、以後は確認なしで実行）、**Cancel** です。

**その場で飛ばす:** 末尾に `now`、`--yes`、`-y` を付けると、その 1 回だけダイアログを省けます（例: `/reset now`、`/new --yes my-session`、`/clear -y`、`/undo -y`）。使っているターミナルでダイアログがうまく描画されないとき（Windows のネイティブ PowerShell については [issue #30768](https://github.com/NousResearch/hermes-agent/issues/30768) を参照）や、CLI をスクリプトから動かすときに便利です。

確認そのものを止めたい場合は、`~/.hermes/config.yaml` で `approvals.destructive_slash_confirm: false` にしてください。`true` に戻せば再び確認するようになります。背景は [セキュリティ — 取り消せないスラッシュコマンドの確認](/hermes/docs/user-guide/security/#dangerous-command-approval) を見てください。
