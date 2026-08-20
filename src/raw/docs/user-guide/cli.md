---
title: "CLI の画面"
description: "Hermes Agent のターミナル画面を使いこなす — コマンド、キー操作、パーソナリティなど"
upstream_path: user-guide/cli.md
upstream_blob: 08a9401468a4cfba8f1d88a6bb6a8f6dc300d96c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/cli
---

# CLI の画面 {#cli-interface}

Hermes Agent の CLI は、ウェブの画面ではなく、ターミナルの中で完結する本格的な操作画面（TUI）です。複数行の編集、スラッシュコマンドの補完、会話履歴、作業中の割り込みと軌道修正、ツール出力の逐次表示に対応しています。ターミナルで一日を過ごす人のために作られています。

:::tip 初回のセットアップ
`hermes setup --portal` を一度実行すれば、あとは `hermes chat` を叩くだけです。[Nous Portal](/hermes/docs/integrations/nous-portal/) を参照してください。
:::

:::tip
Hermes には、重ねて表示されるモーダル、マウスでの選択、入力をふさがない作りを備えた新しい TUI もあります。`hermes --tui` で起動できます。詳しくは [TUI](/hermes/docs/user-guide/tui/) の解説をご覧ください。
:::

## CLI を起動する {#running-the-cli}

```bash
# Start an interactive session (default)
hermes

# Single query mode (non-interactive)
hermes chat -q "Hello"

# Single query from a file or stdin — nothing is shell-interpreted, so
# arbitrary text (quotes, $(...), backticks) arrives verbatim
hermes chat --query-file prompt.txt
hermes chat --query-file - < prompt.txt

# With a specific model
hermes chat --model "anthropic/claude-sonnet-4"

# With a specific provider
hermes chat --provider nous        # Use Nous Portal
hermes chat --provider openrouter  # Force OpenRouter

# With specific toolsets
hermes chat --toolsets "web,terminal,skills"

# Start with one or more skills preloaded
hermes -s hermes-agent-dev,github-auth
hermes chat -s github-pr-workflow -q "open a draft PR"

# Resume previous sessions
hermes --continue             # Resume the most recent CLI session (-c)
hermes --resume <session_id>  # Resume a specific session by ID (-r)
hermes --resume latest        # Resume the most recent session (same as -c)
hermes --resume latest --in ./dir  # Resume ./dir's latest session, staying in ./dir

# Verbose mode (debug output)
hermes chat --verbose

# Isolated git worktree (for running multiple agents in parallel)
hermes -w                         # Interactive mode in worktree
hermes -w -z "Fix issue #123"     # Single query in worktree
```

### ワークツリーの片づけ {#worktree-cleanup}

`hermes -w` で始めたセッションは、`<repo>/.worktrees/` の下に使い捨てのワークツリーを作ります。
起動のたびに、控えめな整理処理が自動で走ります（一定の期間が過ぎていて、変更がなく、
完全にマージ済みの作業用ツリーだけを消します）。それでも、残す判断をされたツリーや、
マージ済みのローカルブランチは、よく使う端末では溜まっていきます。次のコマンドで
はっきりと回収してください。

```bash
hermes worktree list              # audit: age, size, verdict, reason per tree
hermes worktree prune             # remove safe trees + delete merged branches
hermes worktree prune --dry-run   # show the plan without changing anything
hermes worktree prune --trees-only     # leave local branches alone
hermes worktree prune --branches-only  # leave worktrees alone
```

セッションの中では `/worktree prune [--dry-run]` が同じことをします（そのセッション自身が
動いているツリーには決して手を出しません）。

安全性について、どのモードでも、期間にかかわらず保証されることは次のとおりです。

- コミットしていない **追跡対象の** 変更が消されることはありません。
- **そこにしかない未 push のコミット** が消されることはありません。上流で rebase や squash によって
  マージされたコミットは、`git cherry` によるパッチの同等性判定で検出され、マージ済みとして扱われます。
  これによって、いちばんよくある「PR はマージされたのにツリーが永久に残る」という溜まり方を、
  ようやく回収できるようになります。
- **動作中の hermes セッションが使っている** ツリーには手を触れません。
- **追跡対象外のファイルだけの作業内容**（PR 本文の下書き、メモなど）は、ツリーを削除する前に
  `~/.hermes/archive/worktree-prune/` へ退避されます。捨てられることはありません。
- ブランチの削除は、名前ではなく中身で判断します。コミットがすべて上流にあるローカルブランチは削除して安全だと見なし、
  そこにしかない作業のあるブランチ、チェックアウト中のブランチ、`main` / `master` / `develop` は必ず残します。

`.worktrees/` がツリー 10 個または 5 GB を超えると、起動時にこれらのコマンドを案内する 1 行が
表示されます。

### プラグインの管理 {#plugin-management}

`hermes plugins` の各コマンドは、Hermes ネイティブのプラグインと、持ち運びできる Agent
Plugins v1 のパッケージを、同じ「明示的に有効化する」流儀でまとめて扱います。

```bash
hermes plugins install owner/repository --no-enable
hermes plugins list
hermes plugins enable <plugin-name>
hermes plugins disable <plugin-name>
hermes plugins update <plugin-name>
hermes plugins remove <plugin-name>
```

持ち運びできるパッケージは、明示的に有効化するまで無効のままです。現在の Hermes が読み込むのは、
持ち運びできる Agent Skills と stdio 方式の MCP のエントリです。対応している範囲と信頼の境界については
[plugin developer guide](/hermes/docs/developer-guide/plugins/#portable-agent-plugins-v1-packages)
を参照してください。

## 画面の構成 {#interface-layout}

![Stylized preview of the Hermes CLI layout showing the banner, conversation area, and fixed input prompt.](https://hermes-agent.nousresearch.com/docs/img/docs/cli-layout.svg)
*Hermes CLI のバナー、会話の流れ、下部に固定された入力欄です。崩れやすい文字絵ではなく、安定して読める図として描いています。*

起動時のバナーには、使用中のモデル、ターミナルのバックエンド、作業ディレクトリ、使えるツール、導入済みのスキルが一目で分かるように並びます。

### ステータスバー {#status-bar}

入力欄のすぐ上には、常に表示されるステータスバーがあり、状況に応じて随時更新されます。

```
 ⚕ claude-sonnet-4-20250514 │ 12.4K/200K │ [██████░░░░] 6% │ $0.06 │ 15m
```

| 項目 | 説明 |
|---------|-------------|
| モデル名 | 使用中のモデル（26 文字を超える場合は切り詰められます） |
| トークン数 | 使用中のコンテキストのトークン数 / コンテキストウィンドウの上限 |
| コンテキストのバー | 残量を示す帯。しきい値ごとに色が変わります |
| 費用 | そのセッションの概算費用（価格が不明、または無料のモデルでは `n/a`） |
| 🗜️ N | **コンテキストの圧縮回数** — 動作中のセッションが自動で圧縮された回数です。最初の圧縮が起きた時点から表示されます。 |
| ▶ N | **動作中のバックグラウンドタスク** — 現在のセッションでまだ動いている `/background` の数です。1 つでも動いていれば表示されます。 |
| 経過時間 | そのセッションが始まってからの時間 |
| セッション名 | セッションに名前が付くと、右端に金色のバッジとして固定表示されます。長い名前は、大事なモデル名やコンテキストの表示を押しのける前に切り詰められます。 |
| ⚠ YOLO | **YOLO モードの警告** — `HERMES_YOLO_MODE` が有効なとき（起動時の `hermes --yolo`、またはセッション中の `/yolo` の切り替え）に表示されます。バナーの警告と同じ内容で、自動承認のまま作業していることを忘れないようにするためのものです。 |

このバーはターミナルの幅に合わせて形を変えます。76 桁以上ならすべての項目を、52〜75 桁なら詰めた形を、52 桁未満ならモデル名と経過時間だけ（YOLO モードのときはそのバッジも）を表示します。

**コンテキストの色分け:**

| 色 | しきい値 | 意味 |
|-------|-----------|---------|
| 緑 | 50% 未満 | まだ十分な余裕があります |
| 黄 | 50〜80% | 埋まってきています |
| 橙 | 80〜95% | 上限が近づいています |
| 赤 | 95% 以上 | あふれる寸前です。`/compress` を検討してください |

入力と出力それぞれの費用など、内訳を細かく見たいときは `/usage` を使います。

`openai-codex` プロバイダでは、`/usage` は ChatGPT アカウントに貯まっている利用上限のリセット権も表示します（"You have N resets banked - use /usage reset to activate"）。`/usage reset` は貯まっているリセット権を 1 つ使い、5 時間ごとの上限と週ごとの上限を完全に元へ戻します。上限に達していないうちは、Hermes はこの引き換えを拒みます（リセット権は使うと枠が丸ごと戻るため、早く使うほど無駄になります）。それでも実行したい場合は `/usage reset --force` を指定してください。

### 再開時の表示 {#session-resume-display}

以前のセッションを再開すると（`hermes -c` または `hermes --resume <id>`）、バナーと入力欄のあいだに "Previous Conversation" という枠が現れ、それまでの会話が短くまとめて表示されます。詳細と設定方法は [セッション — 再開時の会話の振り返り](/hermes/docs/user-guide/sessions/#conversation-recap-on-resume) をご覧ください。

## キー操作 {#keybindings}

| キー | 動作 |
|-----|--------|
| `Enter` | メッセージを送信します |
| `Alt+Enter`、`Ctrl+J`、`Shift+Enter` | 改行を入れます（複数行の入力）。`Shift+Enter` は、それを `Enter` と区別できるターミナルでのみ使えます（後述）。Windows Terminal では `Alt+Enter` がターミナル側に取られる（全画面表示の切り替え）ため、代わりに `Ctrl+Enter` か `Ctrl+J` を使ってください。 |
| `Alt+V` | ターミナルが対応していれば、クリップボードから画像を貼り付けます |
| `Ctrl+V` | テキストを貼り付け、可能ならクリップボードの画像も一緒に添付します |
| `Ctrl+B` | 音声モードが有効なとき、音声の録音を開始・停止します（`voice.record_key`、既定値は `ctrl+b`） |
| `Ctrl+G` | いま入力中の内容を `$EDITOR`（vim / nvim / nano / VS Code など）で開きます。保存して終了すると、その内容が次のプロンプトとして送られます。長い複数段落の指示を書くときに便利です。 |
| `Ctrl+X Ctrl+E` | 外部エディタを開く Emacs 風の別のキー割り当てです（`Ctrl+G` と同じ動作）。 |
| `Ctrl+S` | **入力を退避します。** 書きかけの内容をいったん預けて入力欄を空にし、先に別の用件を送れるようにします。入力欄が空の状態でもう一度 `Ctrl+S` を押すと、預けた内容が戻ります（カーソルは末尾、添付していた画像もそのまま）。押すたびに上書きではなく積み上がるので、前の下書きが黙って消えることはありません。2 つ以上預けた状態で `Ctrl+S` を押すと一覧の画面が開きます（`↑` / `↓` で移動、`Enter` で復元、`D` で破棄、`Esc` または `Ctrl+S` で閉じる）。ステータスバーの `📌 N` バッジが、預けてある下書きの数を示します。複数行の下書きは、空行も含めてそのままの形で戻ります。この退避先はセッション中のメモリ上だけにあり、ディスクには何も書きません。下書きには秘密の情報が入りがちだからです。 |
| `Ctrl+C` | エージェントの作業を中断します（2 秒以内に 2 回押すと強制終了します） |
| `Ctrl+D` | 終了します |
| `Ctrl+Z` | Hermes をバックグラウンドへ退避します（Unix のみ）。シェルで `fg` を実行すると戻ります。 |
| `Tab` | 入力候補（薄い文字での提案）を確定するか、スラッシュコマンドを補完します |
| `!<command>` | **シェルモード** — モデルのターンを消費せずに、自分でシェルコマンドを実行します（`!git status`、`!pytest -x` など）。後述します。 |

**複数行の貼り付けのプレビュー。** 複数行のかたまりを貼り付けると、CLI は中身をすべて画面に流し込む代わりに、1 行の短い要約（`[pasted: 47 lines, 1,842 chars — press Enter to send]`）を表示します。実際に送られるのは全文で、これは表示上の工夫にすぎません。

### `!` のシェルモード {#shell-mode}

行頭に `!` を付けると、その行はエージェントへ送られる代わりに、シェルコマンドとして実行されます。

```
> !git status
> !ls -la
> !pytest -x tests/cli
```

- **費用はかかりません。** モデルは一切呼ばれません。API 呼び出しもトークンの消費も待ち時間もありません。
- **会話には残りません。** コマンドもその出力も履歴に追加されないので、コンテキストはきれいなままで、プロンプトのキャッシュにも影響しません。
- **エージェントの `terminal` ツールと同じ場所で動きます。** セッションの作業ディレクトリを使うため、`!pwd` の結果はエージェントから見えるものと一致します。
- **承認の仕組みはそのまま働きます。** 危険なコマンド（`rm -rf`、`~/.hermes/config.yaml` への書き込みなど）は、エージェントの `terminal` ツールと同じ承認画面を通ります。`!` は費用と待ち時間の近道であって、安全の仕組みを迂回するものではありません。
- **失敗した場合は表示されます。** 終了コードが 0 でないコマンドは、出力の後に `! exited <code>` と表示します。
- `!` だけを入力すると、使い方の 1 行の案内が出ます。

シェルモードは CLI 専用です。ゲートウェイ（Discord、Telegram、Slack）や cron からの実行では無視されます。そちらの利用者は、すでに自分のシェルを持っているからです。

**最終応答からのマークダウンの除去。** CLI は、エージェントの *最終的な* 返答から、とくに冗長になりがちなコードのフェンス記号と `**bold**` / `*italic*` の囲みを取り除き、ターミナルで読みやすい文章として表示します。コードブロックと箇条書きはそのまま残ります。この処理は、ゲートウェイ側の画面やツールの実行結果には影響しません。そちらは、それぞれの環境で描画するためにマークダウンのまま渡されます。

## スラッシュコマンド {#slash-commands}

`/` を入力すると、補完の一覧が現れます。Hermes は数多くの CLI 用スラッシュコマンドに加えて、スキルから自動で生まれるコマンドや、自分で定義したクイックコマンドにも対応します。

よく使うものを挙げます。

| コマンド | 説明 |
|---------|-------------|
| `/help` | コマンドのヘルプを表示します |
| `/model` | 使用中のモデルを表示、または切り替えます |
| `/tools` | いま使えるツールを一覧します |
| `/skills browse` | スキルのハブと、公式の任意スキルを見て回ります |
| `/background <prompt>` | 別のバックグラウンドセッションで、その指示を実行します |
| `/skin` | 適用中の CLI の見た目を表示、または切り替えます |
| `/voice on` | CLI の音声モードを有効にします（`Ctrl+B` で録音します） |
| `/voice tts` | Hermes の返答を音声で読み上げるかを切り替えます |
| `/reasoning high` | 推論にかける労力を上げます |
| `/title My Session` | 現在のセッションに名前を付けます |
| `/status` | セッションの情報（モデル / プロファイル / トークン / 経過時間）に続けて、手元で作る **セッションの振り返り** を表示します（直近のターン数、よく使ったツール、触れたファイル、最後のユーザーの指示とその返答）。すべて手元での計算で、モデルは呼びません。 |
| `/context [all]` | コンテキストの使われ方を目で見て把握できる形にします。記号を並べたマス目と、種類ごとのトークン数の表（システムプロンプト / ツール / スキル / メモリ / 会話 / 空き）です。`/context all` を使うと、スキルごと・ツールセットごとの消費も加わります。 |
| `/sessions` | 従来の CLI の中で、セッションを選ぶ画面をそのまま開きます（TUI と同じものです）。入力すると絞り込め、矢印キーで移動し、Enter で再開します。 |

組み込みの CLI 用・メッセージング用のコマンドをすべて見たい場合は、[スラッシュコマンド早見表](/hermes/docs/reference/slash-commands/) を参照してください。

設定の方法、プロバイダ、無音の判定の調整、メッセージングや Discord での音声の使い方については、[音声モード](/hermes/docs/user-guide/features/voice-mode/) をご覧ください。

:::tip
コマンドは大文字と小文字を区別しません。`/HELP` は `/help` と同じように動きます。導入したスキルも、自動的にスラッシュコマンドになります。
:::

## クイックコマンド {#quick-commands}

LLM を呼ばずにその場でシェルコマンドを実行する、独自のコマンドを定義できます。これは CLI でも、メッセージングの各サービス（Telegram、Discord など）でも使えます。

```yaml
# ~/.hermes/config.yaml
quick_commands:
  status:
    type: exec
    command: systemctl status hermes-agent
  gpu:
    type: exec
    command: nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader
  restart:
    type: alias
    target: /gateway restart
```

あとは、どのチャットでも `/status`、`/gpu`、`/restart` と入力するだけです。ほかの例は [設定の解説](/hermes/docs/user-guide/configuration/#quick-commands) をご覧ください。

## 起動時にスキルを読み込んでおく {#preloading-skills-at-launch}

そのセッションで使うスキルが決まっているなら、起動時に指定できます。

```bash
hermes -s hermes-agent-dev,github-auth
hermes chat -s github-pr-workflow -s github-auth
```

Hermes は、最初のやり取りが始まる前に、指定された各スキルをセッションのプロンプトへ読み込みます。このフラグは対話モードでも単発の問い合わせモードでも使えます。

## スキルのスラッシュコマンド {#skill-slash-commands}

`~/.hermes/skills/` にあるスキルは、すべて自動でスラッシュコマンドとして登録されます。スキル名がそのままコマンド名になります。

```
/gif-search funny cats
/axolotl help me fine-tune Llama 3 on my dataset
/github-pr-workflow create a PR for the auth refactor

# Just the skill name loads it and lets the agent ask what you need:
/excalidraw
```

## パーソナリティ {#personalities}

あらかじめ用意された人格を指定して、エージェントの口調を変えられます。

```
/personality pirate
/personality kawaii
/personality concise
```

組み込みの人格には次のものがあります。`helpful`、`concise`、`technical`、`creative`、`teacher`、`kawaii`、`catgirl`、`pirate`、`shakespeare`、`surfer`、`noir`、`uwu`、`philosopher`、`hype`。

既定の状態（人格の上書きなし）に戻すには `/personality none` を使います。`default` と `neutral` でも同じことができます。

`~/.hermes/config.yaml` で独自の人格を定義することもできます。

```yaml
personalities:
  helpful: "You are a helpful, friendly AI assistant."
  kawaii: "You are a kawaii assistant! Use cute expressions..."
  pirate: "Arrr! Ye be talkin' to Captain Hermes..."
  # Add your own!
```

## 複数行の入力 {#multi-line-input}

複数行のメッセージを入力する方法は 2 つあります。

1. **`Alt+Enter`、`Ctrl+J`、`Shift+Enter`** — 改行を入れます
2. **バックスラッシュでの継続** — 行末に `\` を置くと、次の行へ続きます

```
❯ Write a function that:\
  1. Takes a list of numbers\
  2. Returns the sum
```

`Ctrl+J` とバックスラッシュでの継続は、はじめから有効になっています。Claude Code / Codex / OpenCode の複数行入力の操作に合わせたものです。iTerm2 のような対応ターミナルでは、Hermes は拡張されたキー通知も要求するので、`Shift+Enter` が独立した改行キーとして届きます。ターミナルが素の `Enter` で LF を送る作りで、以前のように `Ctrl+J` を送信キーとして使いたい場合は、次の設定で無効にできます。

```yaml
# ~/.hermes/config.yaml
display:
  cli_multiline_shortcuts: false
```

:::info
複数行のテキストの貼り付けにも対応しています。上記の改行キーを使うか、そのまま貼り付けてください。
:::

### Shift+Enter が使えるかどうか {#shiftenter-compatibility}

ほとんどのターミナルは、既定では `Enter` と `Shift+Enter` に同じバイト列を送るため、アプリケーション側でこの 2 つを区別できません。Hermes が `Shift+Enter` を認識できるのは、ターミナルが [Kitty のキーボードプロトコル](https://sw.kovidgoyal.net/kitty/keyboard-protocol/) か xterm の `modifyOtherKeys` モードで、別々のバイト列を送る場合だけです。

| ターミナル | 状況 |
|---|---|
| Kitty、foot、WezTerm、Ghostty | `Shift+Enter` の区別が既定で有効です |
| iTerm2（最近の版）、Alacritty、VS Code のターミナル、Warp | 設定で Kitty のプロトコルを有効にすれば使えます |
| Windows Terminal Preview 1.25 以降 | 設定で Kitty のプロトコルを有効にすれば使えます |
| macOS の Terminal.app、Windows Terminal の安定版 | 使えません。`Shift+Enter` は `Enter` と区別できません |

ターミナルがこの 2 つを区別できない場合でも、`Alt+Enter` と `Ctrl+J` は既定のまま使えます。**とくに Windows Terminal では、`Alt+Enter` はターミナル側に取られて（全画面表示の切り替え）Hermes まで届きません。改行には `Ctrl+Enter`（`Ctrl+J` として届きます）か、`Ctrl+J` を直接使ってください。**

## 作業の途中でエージェントの向きを変える {#redirecting-the-agent-mid-turn}

エージェントが作業している最中でも、新しいターンを始めずに修正を伝えられます。

- **新しいメッセージを入力して Enter** — その修正を使って、動作中のターンの向きを変えます
- **`Ctrl+C`** — いま動いている処理を中断します（2 秒以内に 2 回押すと強制終了します）
- すでに表示された、完了済みのツールの作業と推論はコンテキストに残ります
- 動作中のツールは、安全な区切りまで進んでから修正が適用されます

### 作業中の入力の扱い {#busy-input-mode}

設定キー `display.busy_input_mode` は、エージェントが作業している最中に Enter を押したときの動きを決めます。

| モード | 動作 |
|------|----------|
| `"interrupt"`（既定） | 入力した内容が、動作中のターンの向きを変えます。表示済みの推論と完了した作業を保ったまま、モデルの生成をやり直します。動作中のツールは先に終わります |
| `"queue"` | 入力した内容は黙って順番待ちに入り、エージェントの作業が終わってから次のターンとして送られます |
| `"steer"` | 入力した内容が `/steer` 経由でいまの実行に差し込まれ、次のツール呼び出しの後にエージェントへ届きます。中断も新しいターンも起きません |

```yaml
# ~/.hermes/config.yaml
display:
  busy_input_mode: "steer"   # or "queue" or "interrupt" (default)
```

`"queue"` は、独立した続きのターンを用意します。`"steer"` は必ず、次にツールの結果が返る区切りまで待ちます。既定の `"interrupt"` は、モデルが生成している最中でも早く反応しつつ、動作中のツールを打ち切らずに済ませます。ターンとその作業ごと取り消したいときは `/stop` を使ってください。ここに知らない値を書いた場合は `"interrupt"` として扱われます。

`"steer"` には、自動で切り替わる逃げ道が 2 つあります。エージェントがまだ動き始めていない場合と、画像が添付されている場合は、内容が失われないように `"queue"` と同じ動きになります。

CLI の中から変更することもできます。

```text
/busy queue
/busy steer
/busy interrupt
/busy status
```

:::tip 最初の一度だけ出る案内
Hermes が作業している最中に初めて Enter を押すと、`/busy` という設定について 1 行の案内が表示されます。これはインストールごとに一度きりで、表示済みであることは `config.yaml` の `onboarding.seen.busy_input_prompt` に記録されます。もう一度見たい場合は、このキーを削除してください。
:::

### バックグラウンドへの退避 {#suspending-to-background}

Unix 系のシステムでは、**`Ctrl+Z`** で Hermes をバックグラウンドへ退避できます。ほかのターミナルのプロセスと同じ挙動です。シェルには次のように表示されます。

```
Hermes Agent has been suspended. Run `fg` to bring Hermes Agent back.
```

シェルで `fg` と入力すると、離れたところからそのまま再開します。Windows では使えません。

## ツールの進み具合の表示 {#tool-progress-display}

CLI は、エージェントが作業しているあいだ、動きのある表示で状況を伝えます。

**考え中のアニメーション**（API 呼び出しのあいだ）:
```
  ◜ (｡•́︿•̀｡) pondering... (1.2s)
  ◠ (⊙_⊙) contemplating... (2.4s)
  ✧٩(ˊᗜˋ*)و✧ got it! (3.1s)
```

**ツールの実行の流れ:**
```
  ┊ 💻 terminal `ls -la` (0.3s)
  ┊ 🔍 web_search (1.2s)
  ┊ 📄 web_extract (2.1s)
```

`/verbose` を使うと、表示のしかたを `off → new → all → verbose` の順に切り替えられます。このコマンドは、メッセージングの各サービスでも使えるようにできます。[設定](/hermes/docs/user-guide/configuration/#display-settings) を参照してください。

### ツールのプレビューの長さ {#tool-preview-length}

設定キー `display.tool_preview_length` は、ツール呼び出しのプレビュー行（ファイルのパスやターミナルのコマンドなど）に表示する最大の文字数を決めます。既定値は `0` で、制限なしという意味です。パスもコマンドも省略せずに表示されます。

```yaml
# ~/.hermes/config.yaml
display:
  tool_preview_length: 80   # Truncate tool previews to 80 chars (0 = no limit)
```

これは、幅の狭いターミナルを使うときや、ツールの引数に非常に長いファイルのパスが含まれるときに役立ちます。

## セッションの管理 {#session-management}

### セッションを再開する {#resuming-sessions}

CLI のセッションを終了すると、再開用のコマンドが表示されます。

```
Resume this session with:
  hermes --resume 20260225_143052_a1b2c3

Session:        20260225_143052_a1b2c3
Duration:       12m 34s
Messages:       28 (5 user, 18 tool calls)
```

再開の方法は次のとおりです。

```bash
hermes --continue                          # Resume the most recent CLI session
hermes -c                                  # Short form
hermes -c "my project"                     # Resume a named session (latest in lineage)
hermes --resume 20260225_143052_a1b2c3     # Resume a specific session by ID
hermes --resume "refactoring auth"         # Resume by title
hermes --resume latest                     # Resume the most recent session (same as -c)
hermes --resume latest --in ./my-project   # Latest session for ./my-project's workspace
hermes -r 20260225_143052_a1b2c3           # Short form
```

再開すると、SQLite から会話の履歴がすべて復元されます。エージェントには、それまでのメッセージ、ツールの呼び出し、返答がすべて見えていて、席を外していなかったのと同じ状態になります。

チャットの中で `/title My Session Name` を使うと現在のセッションに名前を付けられます。コマンドラインからなら `hermes sessions rename <id> <title>` です。過去のセッションを見て回るには `hermes sessions list` を使います。

### セッションの保存場所 {#session-storage}

CLI のセッションは、Hermes の SQLite の状態データベース `~/.hermes/state.db` に保存されます。このデータベースが保持しているのは次のものです。

- セッションの情報（ID、名前、日時、トークンの集計）
- メッセージの履歴
- 圧縮や再開をまたいだつながり
- `session_search` が使う全文検索の索引

メッセージング用のアダプタの中には、データベースとは別にサービスごとの記録ファイルを持つものもありますが、CLI 自体は SQLite のセッションの保管場所から再開します。

### コンテキストの圧縮 {#context-compression}

会話が長くなり、コンテキストの上限に近づくと、自動で要約されます。

```yaml
# In ~/.hermes/config.yaml
compression:
  enabled: true
  threshold: 0.50    # Compress at 50% of context limit by default

# Summarization model configured under auxiliary:
auxiliary:
  compression:
    model: ""  # Leave empty to use the main chat model (default). Or pin a cheap fast model, e.g. "google/gemini-3-flash-preview".
```

圧縮が起きるとき、要約されるのは途中のやり取りだけで、最初の 3 ターンと最後の 20 ターンは必ずそのまま残ります。

## バックグラウンドのセッション {#background-sessions}

CLI で別の作業を続けながら、指示を別のバックグラウンドセッションで走らせられます。

```
/background Analyze the logs in /var/log and summarize any errors from today
```

Hermes はすぐに受け付けたことを知らせて、入力欄を返します。

```
🔄 Background task #1 started: "Analyze the logs in /var/log and summarize..."
   Task ID: bg_143022_a1b2c3
```

### 仕組み {#how-it-works}

`/background` で渡した指示ごとに、デーモンスレッドの中で **完全に独立したエージェントのセッション** が立ち上がります。

- **会話が分かれている** — バックグラウンドのエージェントは、いまのセッションの履歴を一切知りません。渡した指示だけを受け取ります。
- **設定は同じ** — バックグラウンドのエージェントは、いまのセッションのモデル、プロバイダ、ツールセット、推論の設定、代替モデルをそのまま引き継ぎます。
- **手元の操作を止めない** — 手前のセッションは変わらず操作できます。会話を続けても、コマンドを実行しても、さらにバックグラウンドの作業を増やしてもかまいません。
- **同時に複数** — バックグラウンドの作業は同時にいくつも走らせられます。それぞれに番号付きの ID が付きます。

### 結果 {#results}

バックグラウンドの作業が終わると、その結果がターミナルに枠付きで現れます。

```
╭─ ⚕ Hermes (background #1) ──────────────────────────────────╮
│ Found 3 errors in syslog from today:                         │
│ 1. OOM killer invoked at 03:22 — killed process nginx        │
│ 2. Disk I/O error on /dev/sda1 at 07:15                      │
│ 3. Failed SSH login attempts from 192.168.1.50 at 14:30      │
╰──────────────────────────────────────────────────────────────╯
```

作業が失敗した場合は、代わりにエラーの通知が出ます。設定で `display.bell_on_complete` を有効にしていれば、終わったときにターミナルのベルが鳴ります。

### 使いどころ {#use-cases}

- **時間のかかる調べもの** — コードを書きながら "/background research the latest developments in quantum error correction" を走らせる
- **ファイルの処理** — 会話を続けながら "/background analyze all Python files in this repo and list any security issues" を走らせる
- **並行した調査** — バックグラウンドの作業を複数立ち上げて、いくつもの切り口を同時に探る

:::info
バックグラウンドのセッションは、本体の会話の履歴には出てきません。独立したセッションであり、それぞれ専用のタスク ID（`bg_143022_a1b2c3` など）を持ちます。
:::

## 静かなモード {#quiet-mode}

CLI は既定で静かなモードで動きます。このモードでは次のようになります。
- ツールからの細かなログを抑えます
- かわいらしい動きのある表示を有効にします
- 出力を読みやすく、すっきりした状態に保ちます

デバッグ用の出力が必要な場合は次のようにします。
```bash
hermes chat --verbose
```
