---
title: "TUI"
description: "Hermes の新しいターミナル画面を起動します。マウスが使えて、表示が豊かで、入力をふさぎません。"
upstream_path: user-guide/tui.md
upstream_blob: c15ee3f6edd4bc1acfd8db37476a30eea95f431b
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/tui
---

# TUI {#tui}

TUI は Hermes の新しい操作画面です。[従来の CLI](/hermes/docs/user-guide/cli/) と同じ Python のランタイムの上で動く、ターミナルの中の画面です。エージェントもセッションもスラッシュコマンドも同じで、それらを扱う場所が、より整っていて反応の良いものになります。

対話しながら Hermes を使うなら、これが推奨の方法です。

## 起動する {#launch}

```bash
# Launch the TUI
hermes --tui

# Resume the latest TUI session (falls back to the latest classic session)
hermes --tui -c
hermes --tui --continue
hermes --tui --resume latest

# Resume a specific session by ID or title
hermes --tui -r 20260409_000000_aa11bb
hermes --tui --resume "my t0p session"

# Resume the latest session for a specific project directory
hermes --tui --resume latest --in ./my-project

# Run source directly — skips the prebuild step (for TUI contributors)
hermes --tui --dev
```

環境変数で有効にすることもできます。

```bash
export HERMES_TUI=1
hermes          # now uses the TUI
hermes chat     # same
```

`~/.hermes/config.yaml` に書いて、常にこちらを使うようにもできます。

```yaml
display:
  interface: tui   # "cli" (default) or "tui"
```

`display.interface: tui` にすると、`hermes` だけ（および `hermes chat`）で TUI が起動します。明示したフラグのほうが必ず優先されるので、一度だけ従来の対話画面に戻したいときは `hermes --cli` を、設定が `cli` のときに TUI を使いたいときは `hermes --tui` または `HERMES_TUI=1` を指定してください。

出荷時の既定は、これまでどおり従来の CLI です。[CLI の画面](/hermes/docs/user-guide/cli/) に書かれていること — スラッシュコマンド、クイックコマンド、スキルの事前読み込み、パーソナリティ、複数行の入力、割り込み — は、TUI でもまったく同じように動きます。

## TUI が向いている理由 {#why-the-tui}

- **最初の画面がすぐ出る** — 読み込みが終わる前にバナーが描かれるので、Hermes の起動中にターミナルが固まったように見えることがありません。
- **入力をふさがない** — セッションの準備ができる前から入力して、送信を予約できます。最初の指示は、エージェントが立ち上がった瞬間に送られます。
- **重ねて表示される画面** — モデルの選択、セッションの選択、承認や確認の問いかけが、その場に流れる形ではなく、重なった枠として表示されます。
- **その場で埋まっていくセッションの一覧** — ツールとスキルが、初期化の進行に合わせて順に埋まっていきます。
- **マウスで選びやすい** — ドラッグすると、SGR の反転ではなく、均一な背景色で範囲が示されます。コピーはターミナル本来の操作でできます。
- **別画面での描画** — 差分だけを更新するため、逐次表示の最中もちらつかず、終了後にスクロールバックが散らかりません。
- **入力欄の使い勝手** — 長い断片を貼ったときのその場での折りたたみ、`Cmd+V` / `Ctrl+V` によるテキストの貼り付けとクリップボードの画像への切り替え、囲み付き貼り付けの安全な処理、画像やファイルのパスの添付の整形があります。

[スキン](/hermes/docs/user-guide/features/skins/) と [パーソナリティ](/hermes/docs/user-guide/features/personality/) は同じものが使えます。セッションの途中で `/skin ares` や `/personality pirate` を実行すると、画面がその場で描き直されます。設定できるキーの一覧と、従来の CLI と TUI のどちらに効くのかは [スキンとテーマ](/hermes/docs/user-guide/features/skins/) をご覧ください。TUI が反映するのは、バナーの配色、UI の色、プロンプトの記号と色、セッションの表示、補完のメニュー、選択範囲の背景色、`tool_prefix`、`help_header` です。

### 折りたためるバナーの区画 {#collapsible-banner-sections}

TUI の起動時のバナーは、実行環境の情報を折りたためる 4 つの区画にまとめます。各区画の見出しの横には `▸` / `▾` の記号が付きます。

| 区画 | 既定の状態 |
|---------|---------------|
| Tools | 開いた状態 |
| Skills | 折りたたまれた状態 |
| System Prompt | 折りたたまれた状態 |
| MCP Servers | 折りたたまれた状態 |

区画の見出し（または横の記号）のどこかをクリックすると、開閉が切り替わります。Tools はセッションの開始時にいちばんよく確認される区画なので、既定で開いています。Skills、System Prompt、MCP Servers を既定で折りたたんでいるのは、スキルを何十個も入れたり、MCP のサーバーをたくさんつないだりしていても、バナーがすっきり収まるようにするためです。この開閉の状態はそのバナーの中だけのものなので、次に起動すると既定に戻ります。

## 必要なもの {#requirements}

- **Node.js** 20 以降 — TUI は、Python の CLI から起動される子プロセスとして動きます。`hermes doctor` がこれを確認します。
- **TTY** — 従来の CLI と同じく、標準入力をパイプでつないだ場合や、対話できない環境では、単発の問い合わせモードに切り替わります。

初回の起動時に、Hermes は TUI が使う Node の依存関係を `ui-tui/node_modules` へ導入します（一度きりで、数秒です）。2 回目以降の起動は速くなります。新しい版の Hermes を取得した場合、ソースが dist より新しければ、TUI の実行ファイルは自動で作り直されます。

:::tip git のワークツリーをまたいで作業しますか？
多数のワークツリーから `hermes --tui --dev` を実行する開発者は、チェックアウトごとに導入する代わりに 1 つの `node_modules` を共有できます。[TUI & Desktop from Worktrees](/hermes/docs/developer-guide/worktree-ui-dev/) をご覧ください。
:::

### 外部で作った実行ファイルを使う {#external-prebuild}

すでに作られた実行ファイルを同梱する配布（Nix、システムのパッケージなど）では、その場所を Hermes に教えられます。

```bash
export HERMES_TUI_DIR=/path/to/prebuilt/ui-tui
hermes --tui
```

そのディレクトリには `dist/entry.js` が入っている必要があります。

## キー操作 {#keybindings}

キー操作は [従来の CLI](/hermes/docs/user-guide/cli/#keybindings) とまったく同じです。動きが違うのは次の点だけです。

- **マウスのドラッグ** は、均一な背景色で選択範囲を示します。
- **`Cmd+V` / `Ctrl+V`** は、まず通常のテキストの貼り付けを試し、次に OSC52 やネイティブのクリップボードの読み取りへ、最後に、クリップボードや貼り付けた内容が画像だと分かった場合は画像の添付へと切り替わります。
- **`/terminal-setup`** は、macOS で `Cmd+Enter` や取り消し・やり直しの操作を揃えるために、手元の VS Code / Cursor / Windsurf のターミナルのキー割り当てを設定します。
- **スラッシュコマンドの補完** は、その場に開く一覧ではなく、説明の付いた浮いた枠として現れます。
- **`Ctrl+X`** は、動作中のセッションを切り替える画面を開きます。ただし（エージェントが動いている最中に送って）順番待ちになっているメッセージが選ばれている場合は、これまでどおりそのメッセージを削除します。**`Esc`** は編集を取り消し、削除せずに選択を解除します。
- **`Ctrl+G` / `Ctrl+X Ctrl+E`** — いま入力中の内容を `$EDITOR` で開き、複数行の長い指示を書けるようにします。保存して終了すると、その内容が指示として戻ります。

## スラッシュコマンド {#slash-commands}

スラッシュコマンドはすべてそのまま動きます。いくつかは TUI 側が受け持っていて、より豊かな出力になったり、その場に流れる枠ではなく重なった画面として現れたりします。

| コマンド | TUI での動き |
|---------|--------------|
| `/help` | 分類されたコマンドの一覧が重なって表示され、矢印キーで移動できます |
| `/sessions`（別名 `/switch`） | 動作中のセッションの切り替え画面です。この TUI で開いているセッションを一覧し、切り替え、閉じ、新しく始められます |
| `/model` | プロバイダごとにまとめられたモデルの選択画面で、費用の目安も出ます |
| `/skin` | その場でのプレビューです。選んでいる最中からテーマが適用されます |
| `/details` | ツール呼び出しの詳しい表示を切り替えます（全体、または区画ごと） |
| `/usage` | トークン / 費用 / コンテキストを詳しく見られる画面です |
| `/agents`（別名 `/tasks`） | 状況を見渡すための画面です。サブエージェントの木構造をその場で表示し、停止や一時停止ができ、枝ごとの費用 / トークン / ファイルの集計と、ターンごとの履歴が並びます |
| `/reload` | `~/.hermes/.env` を、動作中の TUI のプロセスへ読み直します。追加したばかりの API キーが、再起動なしで有効になります |
| `/mouse [on\|off\|toggle\|wheel\|buttons\|all]` | マウスの追跡のしかたを実行中に選びます（`config.yaml` の `display.mouse_tracking` にも保存されます）。`wheel`（1000+1006）は、ホイールでのスクロールを残しつつ、tmux で入力行に "No image in clipboard" があふれる原因になるホバーのイベントを出しません。`buttons` はドラッグでの選択を加えます。`all` が既定で、ホバーを使う表示も含みます。 |

これ以外のスラッシュコマンド（導入したスキル、クイックコマンド、パーソナリティの切り替えを含みます）は、従来の CLI とまったく同じように動きます。[スラッシュコマンド早見表](/hermes/docs/reference/slash-commands/) を参照してください。

## 動作中のセッションの切り替え画面 {#live-session-switcher}

1 つのターミナルを、複数の TUI のセッションを差配する場所として使いたいときに、この切り替え画面を使います。ここに並ぶのは、この TUI のプロセスでいま動いているセッションだけです。閉じたセッションは記録として残っているので、`/resume` や `hermes --tui --resume <id-or-title>` でいつでも開き直せます。

開く方法は次のとおりです。

- TUI で `Ctrl+X` を押す。
- `/sessions` または `/switch` を実行する。
- `/sessions new` で、その場に新しいセッションを作る。
- ステータス行の `N live sessions` という表示をクリックする。

![Hermes TUI Session Orchestrator with one live session and a +new row](https://hermes-agent.nousresearch.com/docs/img/docs/tui-session-orchestrator/session-orchestrator.png)

[動画: https://hermes-agent.nousresearch.com/docs/img/docs/tui-session-orchestrator/session-orchestrator-demo.mp4](https://hermes-agent.nousresearch.com/docs/img/docs/tui-session-orchestrator/session-orchestrator-demo.mp4)

この画面の中では、次の操作ができます。

- `↑` / `↓` で選択を動かします。マウスのクリックでも行を選べます。
- `Enter` で、選んだセッションへ切り替えます。
- `Ctrl+D` で、選んだセッションを閉じます。
- `Ctrl+N` で、空のセッションを始めます。
- `Ctrl+R` で、一覧を最新の状態にします。
- `Esc` で、この画面を閉じます。
- `+new` を選んで指示を入力し、`Enter` を押すと、新しいセッションが立ち上がってその指示を受け取ります。そのセッションだけ別のモデルを使いたい場合は、先に `Tab` を押してください。

## LaTeX の数式の表示 {#latex-math-rendering}

TUI のマークダウンの処理は、LaTeX の数式をそのまま整えて表示します。`$E = mc^2$` や `$$\frac{a}{b}$$` は、TeX のソースではなく Unicode で組まれた数式になります。行の中の数式でも、独立した数式でも動きます。対応していない書き方は、コピーできるように、TeX の文字列をコードの体裁で囲んで表示します。

これは常に有効で、設定するものはありません。従来の CLI は TeX の文字列のまま表示します。

## 明るいターミナルの判別 {#light-terminal-detection}

TUI は明るい配色のターミナルを自動で判別し、明るいテーマへ切り替えます。判別は 3 段階で行われます。

1. 環境変数 `HERMES_TUI_THEME` — 最も優先されます。指定できる値は `light`、`dark`、または背景色を表す 6 桁の 16 進数（`ffffff`、`1a1a2e` など）です。
2. 環境変数 `COLORFGBG` — xterm 系のターミナルが使う、昔からある「背景色は何か」を伝える手がかりです。
3. OSC 11 によるターミナルの背景色の問い合わせ — `COLORFGBG` を設定しない最近のターミナル（Ghostty、Warp、iTerm2、WezTerm、Kitty）で機能します。

ターミナルの種類に関係なく、常に明るいテーマを使いたい場合は次のようにします。

```bash
export HERMES_TUI_THEME=light
```

## 作業中の表示のしかた {#busy-indicator-styles}

ステータスバーで作業中を示す表示は差し替えられます。既定では、エージェントが作業しているあいだ、Hermes のかわいらしい顔文字が 2.5 秒ごとに切り替わります。設定または `/indicator` のスラッシュコマンドで、別の表示を選べます。

```yaml
display:
  tui_status_indicator: kaomoji   # kaomoji | emoji | unicode | ascii
```

セッションの中からなら `/indicator emoji` のように指定します。どの表示も文字の幅が揃えてあるので、切り替わるたびにステータスバーの他の部分がずれることはありません。

## 自動での再開 {#auto-resume}

`hermes --tui` は、既定では起動のたびに新しいセッションを始めます。直前の TUI のセッションへ自動でつなぎ直したい場合は（ターミナルや SSH の接続が突然切れたときに便利です）、次のように指定します。

```bash
export HERMES_TUI_RESUME=1          # most-recent TUI session
# or:
export HERMES_TUI_RESUME=<session-id>   # specific session
```

この変数を外すか、`--resume <id>` を明示すると、その起動のときだけ上書きできます。

## ステータス行 {#status-line}

TUI のステータス行は、エージェントの状態を随時追いかけます。

セッションに名前が付くと、その名前がステータス行の右端に、目立つ色のバッジとして現れます。名前は作業場所の表示と入れ替わり、幅の狭いターミナルでは切り詰められます。

| 状態 | 意味 |
|--------|---------|
| `starting agent…` | セッション ID は決まっていて、ツールとスキルがまだ準備中です。入力はできます。メッセージは順番待ちに入り、準備ができ次第送られます。 |
| `ready` | エージェントは待機中で、入力を受け付けます。 |
| `thinking…` / `running…` | エージェントが推論しているか、ツールを実行しています。 |
| `interrupted` | いまのターンが取り消されました。Enter を押すともう一度送れます。 |
| `forging session…` / `resuming…` | 最初の接続、または `--resume` のやり取りの最中です。 |

スキンごとのステータスバーの色としきい値は、従来の CLI と共通です。変え方は [スキン](/hermes/docs/user-guide/features/skins/) をご覧ください。

ステータス行には、次のものも表示されます。

- **作業ディレクトリと git のブランチ** — `~/projects/hermes-agent (docs/two-week-gap-sweep)` のように出ます。別のターミナルで `git checkout` すると、このブランチ名の部分も更新される（mtime を見てキャッシュします）ので、起動時の状態ではなく、いま実際に使っているブランチが表示されます。
- **その指示ごとの経過時間** — ターンの最中は `⏱ 12s/3m 45s` のように動き、終わると `⏲ 32s / 3m 45s` の形で止まります。前の数字は最後にこちらが送ってからの時間、後ろの数字はセッション全体の時間です。指示を送るたびに、前の数字は 0 に戻ります。
- **`🗜️ N`** — 動作中のセッションが自動で圧縮された回数です。最初の圧縮が起きた時点から表示されます。
- **`▶ N`** — このセッションでいま動いている `/background` の数です。1 つでも動いていれば表示されます。
- **`⚠ YOLO`** — YOLO モードが有効なとき（`hermes --yolo`、`/yolo`、`HERMES_YOLO_MODE=1`）に必ず出る警告です。同じバッジが起動時のバナーにも出るので、自動承認のセッションを気づかずに始めてしまうことはありません。

## 設定 {#configuration}

TUI は Hermes の設定を一通りそのまま使います。`~/.hermes/config.yaml`、プロファイル、パーソナリティ、スキン、クイックコマンド、資格情報のプール、メモリのプロバイダ、ツールとスキルの有効・無効です。TUI 専用の設定ファイルはありません。

TUI の見た目や挙動そのものを調整するキーが、いくつかあります。

```yaml
display:
  skin: default              # any built-in or custom skin
  personality: helpful
  details_mode: collapsed    # hidden | collapsed | expanded — global accordion default
  sections:                  # optional: per-section overrides (any subset)
    thinking: expanded       # always open
    tools: expanded          # always open
    activity: collapsed      # opt back IN to the activity panel (hidden by default)
  mouse_tracking: all        # off | wheel | buttons | all (or true/false for back-compat).
                             #   wheel   — 1000+1006 (scroll + click; no drag, no hover —
                             #             recommended inside tmux to silence the prompt-row
                             #             "No image in clipboard" spam from hover events)
                             #   buttons — adds 1002 for terminal-side drag selection
                             #   all     — adds 1003 for hover (scrollbar paginate-on-hover,
                             #             link mouseenter, etc.)
```

実行中に切り替えるコマンドは次のとおりです。

- `/details [hidden|collapsed|expanded|cycle]` — 全体の表示のしかたを決めます
- `/details <section> [hidden|collapsed|expanded|reset]` — 特定の区画だけ上書きします
  （区画は `thinking`、`tools`、`subagents`、`activity` です）

**既定の見え方**

TUI は、ターンを折りたたみの記号の羅列ではなく、その場で流れる記録として見せる方針で、
区画ごとの既定を決めています。

- `thinking` — **開いた状態**。モデルが出力するそばから、推論がその場に流れます。
- `tools` — **開いた状態**。ツールの呼び出しとその結果が、開いた形で表示されます。
- `subagents` — 全体設定の `details_mode` に従います（既定では折りたたまれた状態で、
  実際に作業を任せるまでは静かなままです）。
- `activity` — **非表示**。周辺の情報（ゲートウェイに関する案内、ターミナルの設定を揃えるための
  助言、バックグラウンドの通知）は、ふだんの作業では雑音になります。ツールの失敗は、
  これまでどおり失敗した行にその場で表示されます。周辺の
  エラーや警告は、どの区画も非表示のときには、浮いた警告として最後の受け皿から現れます。

区画ごとの上書きは、その区画の既定にも、全体設定の `details_mode` にも優先します。
見え方を変えたい場合は、次のようにします。

- `display.sections.thinking: collapsed` — 推論を折りたたみに戻します
- `display.sections.tools: collapsed` — ツールの呼び出しを折りたたみに戻します
- `display.sections.activity: collapsed` — 周辺の情報の区画を出すようにします
- 実行中なら `/details <section> <mode>` を使います

`display.sections` に明示的に書いたものは既定より優先されるので、いまの設定はそのまま使い続けられます。

## セッション {#sessions}

セッションは TUI と従来の CLI で共有されます。どちらも同じ `~/.hermes/state.db` に書き込みます。片方で始めたセッションを、もう片方で再開できます。セッションの選択画面には両方のセッションが、どちらのものかを示す印とともに並びます。

セッションの一生、検索、圧縮、書き出しについては [セッション](/hermes/docs/user-guide/sessions/) をご覧ください。

## TUI とゲートウェイのつながり方 {#how-the-tui-talks-to-its-gateway}

既定では、TUI は自分のプロセスの中にゲートウェイを立ち上げます。そのため TUI は 1 つずつが独立していて、設定することは何もありません。

コードやログの中で `HERMES_TUI_GATEWAY_URL` という環境変数を見かけることがあるかもしれません。これは **ウェブのダッシュボードの内部的な配線** であって、利用者が遠隔のゲートウェイへつなぐためのつまみではありません。ダッシュボードの "Chat" タブ（`hermes dashboard` → `/chat`）を開くと、ダッシュボードのウェブサーバーが TUI の子プロセスを内部で立ち上げ、`HERMES_TUI_GATEWAY_URL` を渡します。これによって、その子プロセスはダッシュボード自身のプロセス内にある `tui_gateway` へ、ループバックの WebSocket（`/api/ws`）でつながります。`/api/ws` というエンドポイントはダッシュボードのサーバー（`hermes_cli/web_server.py`）の中にしか存在せず、そのプロセスの寿命と認証に結び付いています。

「どの TUI からでも、好きなゲートウェイのポートへつなぐ」といった汎用のモードはありません。とくに、OpenAI 互換の API サーバー（`hermes gateway` および `api_server` のプラットフォーム）は `/api/ws` を **提供しません**。あちらはモデルのバックエンドとしての面（`/v1/chat/completions`、`/v1/models` など）であり、TUI の JSON-RPC の制御用のつながりは意図的に公開していません。`HERMES_TUI_GATEWAY_URL` にそのポートを指定すると 404 になります。

複数の画面で同じセッション群を共有したい場合は、共有された `~/.hermes/state.db` を使うか（[セッション](/hermes/docs/user-guide/sessions/) を参照）、ウェブのダッシュボードに組み込まれたチャットを使ってください（[ウェブのダッシュボード](/hermes/docs/user-guide/features/web-dashboard/#chat) を参照）。ゲートウェイの URL を手で指定する方法ではありません。

## 従来の CLI に戻す {#reverting-to-the-classic-cli}

`--tui` を付けずに `hermes` を実行すれば、既定のまま従来の CLI が動きます。ある端末で TUI を優先させたい場合は、`~/.hermes/config.yaml` に `display.interface: tui` を書くか（設定として残ります）、シェルの設定ファイルに `HERMES_TUI=1` を書きます（そのシェルだけ）。戻すには `interface: cli` にするか環境変数を外すか、その場かぎりなら `hermes --cli` を使ってください。

TUI の起動に失敗した場合（Node がない、実行ファイルがない、TTY の問題など）、Hermes は原因を表示してから従来の CLI へ切り替えます。行き止まりになることはありません。

## あわせて読む {#see-also}

- [CLI の画面](/hermes/docs/user-guide/cli/) — スラッシュコマンドとキー操作の全体（共通の内容です）
- [セッション](/hermes/docs/user-guide/sessions/) — 再開、枝分かれ、履歴
- [スキンとテーマ](/hermes/docs/user-guide/features/skins/) — バナー、ステータスバー、重なる画面の見た目を変えます
- [音声モード](/hermes/docs/user-guide/features/voice-mode/) — どちらの画面でも使えます
- [設定](/hermes/docs/user-guide/configuration/) — すべての設定キー
