---
title: "TUI"
description: "Hermes の新しいターミナル画面を起動する — マウスが使えて、表示が豊かで、入力を待たせない"
upstream_path: user-guide/tui.md
upstream_blob: 04724657f4bb8f4beb301bf53830dbe5164b2774
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/tui
---

# TUI {#tui}

TUI は Hermes の新しい表側の画面です。[従来の CLI](/hermes/docs/user-guide/cli/) と同じ Python のランタイムの上で動くターミナル画面で、エージェントもセッションもスラッシュコマンドも共通、そのうえで操作面がすっきりして反応も軽くなっています。

対話的に Hermes を使うなら、こちらが推奨です。

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

`~/.hermes/config.yaml` に書いて、常にこちらを既定にすることもできます。

```yaml
display:
  interface: tui   # "cli" (default) or "tui"
```

`display.interface: tui` にしておくと、素の `hermes`（および `hermes chat`）で TUI が起動します。明示したフラグが常に優先されるので、その一回だけ従来の REPL に戻したいときは `hermes --cli`、設定の既定が `cli` のときに TUI を使いたいときは `hermes --tui` か `HERMES_TUI=1` を使います。

出荷時の既定は、引き続き従来の CLI です。[CLI 画面](/hermes/docs/user-guide/cli/) に書かれていること、つまりスラッシュコマンド、クイックコマンド、スキルの事前読み込み、人格設定、複数行入力、割り込みは、TUI でもまったく同じように動きます。

## TUI を使う理由 {#why-the-tui}

- **最初の画面がすぐ出る** — アプリの読み込みが終わる前にバナーが描かれるので、Hermes の起動中にターミナルが固まったように見えません。
- **入力を待たせない** — セッションの準備が整う前から入力して、メッセージを溜めておけます。最初のプロンプトは、エージェントが立ち上がった瞬間に送られます。
- **豊かな重ね表示** — モデル選択、セッション選択、承認や確認のやり取りが、行内の流れではなくモーダルのパネルとして表示されます。
- **セッションのパネルが育つ** — ツールとスキルが、準備できたものから順に埋まっていきます。
- **マウスで選びやすい** — SGR の反転ではなく、一様な背景色でドラッグ選択できます。コピーはターミナルのいつもの操作でできます。
- **別画面での描画** — 差分だけを更新するので、ストリーミング中もちらつかず、終了後にスクロールバックが散らかりません。
- **入力欄の気配り** — 長い断片を貼り付けたときの行内での折り畳み、`Cmd+V` / `Ctrl+V` でのテキスト貼り付けとクリップボード画像への切り替え、ブラケットペーストの安全な処理、画像やファイルパスの添付の整形をこなします。

[スキン](/hermes/docs/user-guide/features/skins/) と [人格設定](/hermes/docs/user-guide/features/personality/) は共通です。セッションの途中でも `/skin ares`、`/personality pirate` で切り替えれば、画面がその場で描き直されます。変更できるキーの全一覧と、従来の CLI と TUI のどちらに効くかは [スキンとテーマ](/hermes/docs/user-guide/features/skins/) を参照してください。TUI が反映するのは、バナーの配色、UI の色、プロンプトの記号と色、セッションの表示、補完メニュー、選択の背景色、`tool_prefix`、`help_header` です。

### 畳めるバナーの区画 {#collapsible-banner-sections}

TUI の起動バナーは、実行時の情報を4つの畳める区画にまとめ、それぞれの見出しの横に `▸` / `▾` の記号を表示します。

| 区画 | 既定の状態 |
|---------|---------------|
| Tools | 開いている |
| Skills | 畳まれている |
| System Prompt | 畳まれている |
| MCP Servers | 畳まれている |

区画の見出し（または記号）のどこかをクリックすると開閉します。Tools はセッション開始時に最も見られる区画なので、既定で開いています。Skills、System Prompt、MCP Servers は既定で畳まれているので、スキルを何十個も入れていたり MCP サーバーをたくさんつないでいたりしても、バナーは小さいままです。開閉の状態はそのバナーだけのもので、次の起動時には既定に戻ります。

## 必要なもの {#requirements}

- **Node.js** 20 以上 — TUI は、Python の CLI から起動される別プロセスとして動きます。`hermes doctor` で確認できます。
- **TTY** — 従来の CLI と同じく、標準入力をパイプでつないだ場合や、対話できない環境では単発クエリのモードになります。

初回の起動時に、Hermes が TUI の Node の依存関係を `ui-tui/node_modules` へ入れます（一度きり、数秒です）。2回目以降は速くなります。新しい版の Hermes を取り込むと、ソースが dist より新しい場合に TUI のバンドルが自動で作り直されます。

:::tip git の worktree をまたいで作業していますか?
いくつもの worktree から `hermes --tui --dev` を実行する開発者は、チェックアウトごとに入れる代わりに `node_modules` をひとつ共有できます。[worktree から TUI とデスクトップを動かす](/hermes/docs/developer-guide/worktree-ui-dev/) を参照してください。
:::

### 外部で作ったバンドルを使う {#external-prebuild}

ビルド済みのバンドルを同梱する配布形態（Nix、システムのパッケージなど）では、その場所を Hermes に教えられます。

```bash
export HERMES_TUI_DIR=/path/to/prebuilt/ui-tui
hermes --tui
```

そのディレクトリには `dist/entry.js` が含まれている必要があります。

## キー操作 {#keybindings}

キー操作は [従来の CLI](/hermes/docs/user-guide/cli/#keybindings) とまったく同じです。挙動が違うのは次の点だけです。

- **マウスのドラッグ** で、一様な背景色の選択範囲ができます。
- **`Cmd+V` / `Ctrl+V`** は、まず通常のテキスト貼り付けを試し、次に OSC52 やネイティブのクリップボード読み取りに切り替え、貼り付けた内容が画像だと分かった場合は最後に画像として添付します。
- **`/terminal-setup`** は、macOS で `Cmd+Enter` や取り消し・やり直しの挙動を揃えるため、手元の VS Code / Cursor / Windsurf にターミナルのキー割り当てを入れます。
- **スラッシュコマンドの補完** は、行内のドロップダウンではなく、説明付きの浮かぶパネルとして開きます。
- **`Ctrl+X`** はセッションの切り替え画面を開きます。ただし、待ち行列に入ったメッセージ（エージェントが動いている最中に送ったもの）が選択されている場合は、そのメッセージを削除します。**`Esc`** は編集をやめ、削除せずに選択を解除します。
- **`Ctrl+G` / `Ctrl+X Ctrl+E`** — いま書いている内容を `$EDITOR` で開き、複数行や長いプロンプトを書けます。保存して終了すると、その内容がプロンプトとして送られます。

## スラッシュコマンド {#slash-commands}

スラッシュコマンドはすべてそのまま使えます。いくつかは TUI 独自のもので、より充実した表示になったり、行内のパネルではなく重ね表示になったりします。

| コマンド | TUI での挙動 |
|---------|--------------|
| `/help` | 分類されたコマンドを重ね表示。矢印キーで移動できます |
| `/sessions`（別名 `/switch`） | セッションの切り替え画面 — 開いている TUI のセッションを一覧し、切り替え、閉じ、新しく始められます |
| `/model` | プロバイダーごとにまとめたモーダルのモデル選択画面。費用の目安付き |
| `/skin` | その場でプレビュー — 見て回るあいだ、テーマがそのまま適用されます |
| `/details` | ツール呼び出しの詳細表示を切り替える（全体または区画ごと） |
| `/usage` | トークン / 費用 / コンテキストの詳しいパネル |
| `/agents`（別名 `/tasks`） | 観測用の重ね表示 — サブエージェントの系統図をリアルタイムに示し、停止や一時停止、枝ごとの費用 / トークン / ファイルの集計、やり取りごとの履歴を見られます |
| `/reload` | 動いている TUI のプロセスに `~/.hermes/.env` を読み直させ、追加した API キーを再起動なしで反映します |
| `/mouse [on\|off\|toggle\|wheel\|buttons\|all]` | マウス追跡の設定をその場で選びます（`config.yaml` の `display.mouse_tracking` にも保存されます）。`wheel`（1000+1006）はホイールのスクロールを残しつつ、tmux が入力行に「No image in clipboard」を連発する原因になるホバーのイベントを止めます。`buttons` はドラッグ選択を加えます。`all` が既定で、ホバーを使う表示まで含みます。 |

ほかのスラッシュコマンド（入れたスキル、クイックコマンド、人格の切り替えを含む）は、従来の CLI とまったく同じように動きます。[スラッシュコマンド一覧](/hermes/docs/reference/slash-commands/) を参照してください。

## セッションの切り替え画面 {#live-session-switcher}

ひとつのターミナルを、複数の TUI セッションの管制塔として使いたいときに、この切り替え画面が役立ちます。一覧に出るのは、いまこの TUI のプロセスで動いているセッションだけです。閉じたセッションは記録として残っており、`/resume` や `hermes --tui --resume <id-or-title>` で開き直せます。

開き方は次のいずれかです。

- TUI で `Ctrl+X` を押す。
- `/sessions` または `/switch` を実行する。
- `/sessions new` で、その場で新しいセッションを作る。
- ステータス行の `N live sessions` の表示をクリックする。

![Hermes TUI Session Orchestrator with one live session and a +new row](https://hermes-agent.nousresearch.com/docs/img/docs/tui-session-orchestrator/session-orchestrator.png)

[動画: https://hermes-agent.nousresearch.com/docs/img/docs/tui-session-orchestrator/session-orchestrator-demo.mp4](https://hermes-agent.nousresearch.com/docs/img/docs/tui-session-orchestrator/session-orchestrator-demo.mp4)

切り替え画面の中では次の操作ができます。

- `↑` / `↓` で選択を動かします。マウスのクリックでも選べます。
- `Enter` で、選んだセッションに切り替えます。
- `Ctrl+D` で、選んだセッションを閉じます。
- `Ctrl+N` で、空のセッションを新しく始めます。
- `Ctrl+R` で、一覧を更新します。
- `Esc` で、切り替え画面を閉じます。
- `+new` を選んでプロンプトを打ち、`Enter` を押すと、新しいセッションに投げられます。そのセッションだけモデルを選びたいときは、先に `Tab` を押してください。

## LaTeX の数式表示 {#latex-math-rendering}

TUI の Markdown 処理は、LaTeX の数式をそのまま整形して表示します。`$E = mc^2$` や `$$\frac{a}{b}$$` は、TeX のソースのままではなく Unicode で組まれた数式になります。行内の数式にもブロックの数式にも効きます。対応していない書き方は、コピーできるよう、コード表示に包んだ TeX のまま表示されます。

これは常に有効で、設定は要りません。従来の CLI は TeX をそのまま表示します。

## 明るいターミナルの判定 {#light-terminal-detection}

TUI は明るい配色のターミナルを自動で判定し、明るいテーマに切り替えます。判定は3段階です。

1. 環境変数 `HERMES_TUI_THEME` — 最優先です。指定できる値は `light`、`dark`、または背景色を表す 6 桁の16進数（例: `ffffff`、`1a1a2e`）です。
2. 環境変数 `COLORFGBG` — xterm 系のターミナルが使う、昔からの「背景色は何か」を伝える手がかりです。
3. OSC 11 による背景色の問い合わせ — `COLORFGBG` を設定しない最近のターミナル（Ghostty、Warp、iTerm2、WezTerm、Kitty）で機能します。

ターミナルに関係なく明るいテーマを使い続けたい場合は、次のようにします。

```bash
export HERMES_TUI_THEME=light
```

## 作業中インジケーターの見た目 {#busy-indicator-styles}

ステータスバーの作業中インジケーターは差し替えできます。既定では、エージェントが作業しているあいだ、Hermes の kawaii な顔文字を 2.5 秒ごとに切り替えます。別の見た目にするには、設定か `/indicator` のスラッシュコマンドを使います。

```yaml
display:
  tui_status_indicator: kaomoji   # kaomoji | emoji | unicode | ascii
```

セッションの中からなら `/indicator emoji` のように指定します。どの見た目も文字の幅が揃えてあるので、切り替わってもステータスバーの残りが揺れません。

## 自動での再開 {#auto-resume}

既定では、`hermes --tui` は起動のたびに新しいセッションを始めます。直前の TUI セッションに自動でつなぎ直したい場合（ターミナルや SSH の接続が突然切れるときに便利です）は、次のように指定します。

```bash
export HERMES_TUI_RESUME=1          # most-recent TUI session
# or:
export HERMES_TUI_RESUME=<session-id>   # specific session
```

その変数を外すか、`--resume <id>` を明示して渡せば、起動ごとに上書きできます。

## ステータス行 {#status-line}

TUI のステータス行は、エージェントの状態をリアルタイムに示します。

セッションに名前が付くと、ステータス行の右端にアクセント色のバッジとして表示されます。名前は作業場所のラベルの位置に入り、幅の狭いターミナルでは省略されます。

| 状態 | 意味 |
|--------|---------|
| `starting agent…` | セッション ID は有効で、ツールとスキルはまだ準備中です。入力はできます。メッセージは溜められ、準備ができ次第送られます。 |
| `ready` | エージェントは待機中で、入力を受け付けます。 |
| `thinking…` / `running…` | エージェントが考えているか、ツールを実行しています。 |
| `interrupted` | いまのやり取りが取り消されました。Enter を押せばもう一度送れます。 |
| `forging session…` / `resuming…` | 最初の接続、または `--resume` の手続き中です。 |

スキンごとのステータスバーの色としきい値は、従来の CLI と共通です。変更の仕方は [スキン](/hermes/docs/user-guide/features/skins/) を参照してください。

ステータス行には次のものも表示されます。

- **作業ディレクトリと git のブランチ** — `~/projects/hermes-agent (docs/two-week-gap-sweep)` のように表示されます。別のターミナルで `git checkout` すると、その末尾のブランチ名も更新される（更新時刻をもとに判定）ので、起動時の値ではなく実際のブランチが表示されます。
- **プロンプトごとの経過時間** — やり取りの最中は `⏱ 12s/3m 45s` と動き、終わると `⏲ 32s / 3m 45s` で止まります。前の数字は最後の発言からの時間、後ろの数字はセッション全体の時間です。新しいプロンプトごとに前の数字はリセットされます。
- **`🗜️ N`** — いま動いているセッションが自動圧縮された回数です。最初の圧縮が起きた時点から表示されます。
- **`▶ N`** — このセッションでいま動いている `/bg` のタスク数です。1つ以上動いている間だけ表示されます。
- **`⚠ YOLO`** — YOLO モードが有効なとき（`hermes --yolo`、`/yolo`、`HERMES_YOLO_MODE=1`）に出る警告です。同じバッジは起動バナーにも出るので、自動承認のセッションを気づかずに始めることはありません。

## 設定 {#configuration}

TUI は Hermes の標準的な設定をすべて尊重します。`~/.hermes/config.yaml`、プロファイル、人格設定、スキン、クイックコマンド、認証情報のプール、メモリのプロバイダー、ツールとスキルの有効化がそのまま効きます。TUI 専用の設定ファイルはありません。

TUI の見た目に効くキーがいくつかあります。

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

実行中に切り替えるには次のコマンドを使います。

- `/details [hidden|collapsed|expanded|cycle]` — 全体のモードを設定します
- `/details <section> [hidden|collapsed|expanded|reset]` — 区画ひとつだけを上書きします
  （区画は `thinking`、`tools`、`subagents`、`activity`）

**既定の表示**

TUI は、やり取りを記号の壁ではなく生きた記録として流すよう、区画ごとに考え抜かれた既定値を持っています。

- `thinking` — **開いた状態**。モデルが出力するそばから、思考が行内に流れます。
- `tools` — **開いた状態**。ツールの呼び出しとその結果が開いたまま表示されます。
- `subagents` — 全体の `details_mode` に従います（既定では記号の下に畳まれ、実際に委譲が起きるまで静かなままです）。
- `activity` — **非表示**。周辺の情報（ゲートウェイの案内、ターミナルの挙動を揃えるための助言、バックグラウンドの通知）は、日々の利用では雑音になりがちです。ツールの失敗は、失敗した行に行内で表示されます。周辺のエラーや警告は、すべてのパネルが非表示のときには浮かぶ通知が受け止めます。

区画ごとの上書きは、その区画の既定値より、また全体の `details_mode` より優先されます。表示を組み替えるには次のようにします。

- `display.sections.thinking: collapsed` — 思考を記号の下に戻す
- `display.sections.tools: collapsed` — ツールの呼び出しを記号の下に戻す
- `display.sections.activity: collapsed` — 周辺の情報のパネルを再び表示する
- 実行中に `/details <section> <mode>` を使う

`display.sections` に明示したものは既定値に優先するので、これまでの設定はそのまま動き続けます。

## セッション {#sessions}

セッションは TUI と従来の CLI で共有されます。どちらも同じ `~/.hermes/state.db` に書き込みます。片方で始めたセッションを、もう片方で再開できます。セッションの選択画面には両方のセッションが、出どころのラベル付きで並びます。

セッションの流れ、検索、圧縮、書き出しについては [セッション](/hermes/docs/user-guide/sessions/) を参照してください。

## TUI とゲートウェイのやり取り {#how-the-tui-talks-to-its-gateway}

既定では、TUI は自分のプロセスの中にゲートウェイを立てるので、TUI のインスタンスはそれぞれ独立しています。設定するものは何もありません。

コードやログの中で `HERMES_TUI_GATEWAY_URL` という環境変数を見かけることがあります。これは **Web ダッシュボードの内部的な配線** であって、利用者が遠隔接続に使うためのつまみではありません。ダッシュボードの「Chat」タブ（`hermes dashboard` → `/chat`）を開くと、ダッシュボードの Web サーバーが TUI を子プロセスとして起動し、`HERMES_TUI_GATEWAY_URL` を差し込みます。その子プロセスは、ループバックの WebSocket（`/api/ws`）を通じて、ダッシュボード自身のプロセス内 `tui_gateway` につながります。`/api/ws` というエンドポイントはダッシュボードのサーバー（`hermes_cli/web_server.py`）の中にしか存在せず、そのプロセスの寿命と認証に結び付いています。

「どの TUI からでも、どの単独のゲートウェイのポートにでもつなぐ」という汎用のモードはありません。とくに、OpenAI 互換の API サーバー（`hermes gateway` や `api_server` のプラットフォーム）は `/api/ws` を **提供しません**。あちらはモデルの受け口（`/v1/chat/completions`、`/v1/models` など）であり、TUI の JSON-RPC 制御チャネルは意図的に公開していません。`HERMES_TUI_GATEWAY_URL` にそのポートを指定すると 404 になります。

複数の画面でセッションを共有したい場合は、共有の `~/.hermes/state.db`（[セッション](/hermes/docs/user-guide/sessions/) を参照）か、Web ダッシュボードに組み込まれたチャット（[Web ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/#chat) を参照）を使ってください。ゲートウェイの URL を手で設定する方法ではありません。

## 従来の CLI に戻す {#reverting-to-the-classic-cli}

`--tui` を付けずに `hermes` を起動すれば、既定では従来の CLI のままです。その端末で TUI を優先させたい場合は、`~/.hermes/config.yaml` に `display.interface: tui` を書く（永続）か、シェルのプロファイルに `HERMES_TUI=1` を書きます（シェルごと）。戻すときは `interface: cli` にするか環境変数を外します。一回だけなら `hermes --cli` を渡してください。

TUI の起動に失敗した場合（Node がない、バンドルがない、TTY の問題など）、Hermes は診断内容を表示して従来の CLI に切り替えます。手が止まることはありません。

## 関連ページ {#see-also}

- [CLI 画面](/hermes/docs/user-guide/cli/) — スラッシュコマンドとキー操作の全一覧（共通）
- [セッション](/hermes/docs/user-guide/sessions/) — 再開、分岐、履歴
- [スキンとテーマ](/hermes/docs/user-guide/features/skins/) — バナー、ステータスバー、重ね表示の見た目を変える
- [音声モード](/hermes/docs/user-guide/features/voice-mode/) — どちらの画面でも使えます
- [設定](/hermes/docs/user-guide/configuration/) — 設定キーの全一覧
