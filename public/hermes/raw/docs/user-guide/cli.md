---
title: "CLI 画面"
description: "Hermes Agent のターミナル画面を使いこなす — コマンド、キー操作、人格設定など"
upstream_path: user-guide/cli.md
upstream_blob: 756038b8baefd48e36a5d91c5c04b4648b926d62
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/cli
---

# CLI 画面 {#cli-interface}

Hermes Agent の CLI は、Web の画面ではなく、ターミナル上で完結する本格的な操作画面（TUI）です。複数行の編集、スラッシュコマンドの入力補完、会話履歴、実行中の割り込みと軌道修正、ツール出力のストリーミング表示を備えています。ターミナルで一日を過ごす人のために作られています。

:::tip 最初のセットアップ
`hermes setup --portal` というコマンドひとつで、`hermes chat` を始められる状態になります。[Nous Portal](/hermes/docs/integrations/nous-portal/) を参照してください。
:::

:::tip
Hermes には、モーダル表示・マウス選択・入力を待たせない設計を備えた新しい TUI も付いています。`hermes --tui` で起動できます。[TUI](/hermes/docs/user-guide/tui/) のガイドを参照してください。
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

### 作業ツリーの後片付け {#worktree-cleanup}

`hermes -w` のセッションは、`<repo>/.worktrees/` の下に使い捨ての作業ツリーを作ります。
起動時には控えめな掃除処理が自動で走りますが（きれいな状態で、完全に取り込み済みで、
一定の日数を過ぎた一時ツリーだけを消します）、残しておいたツリーや取り込み済みの
ローカルブランチは、忙しい端末ではやはり溜まっていきます。次のコマンドで、
自分の意思で回収してください。

```bash
hermes worktree list              # audit: age, size, verdict, reason per tree
hermes worktree prune             # remove safe trees + delete merged branches
hermes worktree prune --dry-run   # show the plan without changing anything
hermes worktree prune --trees-only     # leave local branches alone
hermes worktree prune --branches-only  # leave worktrees alone
```

セッションの中では `/worktree prune [--dry-run]` が同じことをします（そのセッション自身が
動いているツリーには決して触りません）。

安全のための保証（どのモードでも、どれだけ古くても変わりません）:

- コミットしていない**追跡中**の変更が消えることはありません。
- **まだ push していない固有のコミット**が消えることはありません。上流で rebase や squash で
  取り込まれたコミットは `git cherry` のパッチ等価判定で検出され、取り込み済みとして
  扱われます。これがあるおかげで、いちばん多い「PR は取り込み済みなのにツリーが永久に
  残る」という無駄をようやく回収できます。
- **push 済みで PR が開いているレーンは、何も失わずにディスクだけ空けます**。きれいな
  ツリーのブランチ先端が `origin` の持つものと完全に一致していれば（掃除1回につき
  `git ls-remote` を1回だけ実行して確認します）、その作業コピーは重複です。ツリーは
  削除されますが**ブランチの参照は残る**ので、そのレーンは
  `git worktree add .worktrees/<name> <branch>` ひとつで元に戻せます。リモートに
  つながらない場合、ツリーはそのまま残されます。
- **動作中の hermes セッションが使っている**ツリーには触りません。
- **追跡外のファイルだけの一時作業**（PR 本文の下書き、メモなど）は、ツリーを削除する前に
  `~/.hermes/archive/worktree-prune/` へ退避されます。捨てられることはありません。
- ブランチの削除は名前ではなく中身で判断します。コミットがすべて上流にあるローカル
  ブランチは削除しても安全です。固有の作業を持つブランチ、チェックアウト中のブランチ、
  `main`/`master`/`develop` は常に残ります。

同じ控えめな掃除処理は cron のスケジューラからも走ります（バックグラウンドで、最短でも
6時間に1回まで）。おかげで、誰も何日も `hermes -w` を起動しないゲートウェイ専用の端末でも、
CLI セッションの合間に取り込み済みの一時ツリーが溜まらなくなりました。

`.worktrees/` が10ツリーまたは5GBを超えると、起動時にこれらのコマンドを案内する
1行のお知らせが出ます。

### プラグインの管理 {#plugin-management}

`hermes plugins` のコマンド群は、Hermes 標準のプラグインと、持ち運びできる Agent
Plugins v1 のパッケージを、どちらも同じ「明示的に有効化する」流れで管理します。

```bash
hermes plugins install owner/repository --no-enable
hermes plugins list
hermes plugins enable <plugin-name>
hermes plugins disable <plugin-name>
hermes plugins update <plugin-name>
hermes plugins remove <plugin-name>
```

持ち運びできるパッケージは、明示的に有効化するまで無効のままです。Hermes が現在
読み込むのは、持ち運びできる Agent Skills と stdio 方式の MCP エントリです。
対応している範囲と信頼の境界については
[プラグイン開発ガイド](/hermes/docs/developer-guide/plugins/#portable-agent-plugins-v1-packages)
を参照してください。

## 画面の構成 {#interface-layout}

![バナー、会話領域、固定された入力欄からなる Hermes CLI の画面構成を図案化したプレビュー。](https://hermes-agent.nousresearch.com/docs/img/docs/cli-layout.svg)
*Hermes CLI のバナー、会話の流れ、固定された入力欄を、崩れやすい文字絵ではなく、安定した図としてドキュメント用に描いたものです。*

起動時のバナーには、モデル、ターミナルのバックエンド、作業ディレクトリ、使えるツール、
導入済みのスキルが一目で分かる形で表示されます。

### ステータスバー {#status-bar}

入力欄の上には、常に表示され、リアルタイムで更新されるステータスバーがあります。

```
 ⚕ claude-sonnet-4-20250514 │ 12.4K/200K │ [██████░░░░] 6% │ $0.06 │ 15m
```

| 項目 | 説明 |
|---------|-------------|
| モデル名 | 現在のモデル（26文字を超えると省略されます） |
| トークン数 | 使用中のコンテキストトークン数／コンテキスト上限 |
| コンテキストバー | 色分けされたしきい値付きの、使用量を示すバー |
| 費用 | このセッションの推定費用（価格が不明またはゼロのモデルでは `n/a`） |
| 🗜️ N | **コンテキスト圧縮の回数** — 動作中のセッションが自動圧縮された回数です。最初の圧縮が起きた時点から表示されます。 |
| ▶ N | **動作中のバックグラウンドタスク** — 現在のセッションでまだ動いている `/bg` プロンプトの数です。ひとつでも動いていれば表示されます。 |
| 経過時間 | セッションの経過時間 |
| セッション名 | セッションに名前が付くと、右端に固定された金色のバッジとして表示されます。長い名前は、モデル名やコンテキストといった必須項目を押しのける前に省略されます。 |
| ⚠ YOLO | **YOLO モードの警告** — `HERMES_YOLO_MODE` が有効なとき（起動時の `hermes --yolo`、またはセッション途中で切り替えた `/yolo`）に表示されます。バナー行の警告と同じもので、自動承認モードにいることを忘れないようにするためのものです。 |

このバーはターミナルの幅に合わせて形を変えます。76桁以上ならすべて、52〜75桁なら
コンパクト表示、52桁未満なら最小表示（モデルと経過時間、それに YOLO 有効時はバッジ）です。

**コンテキストの色分け:**

| 色 | しきい値 | 意味 |
|-------|-----------|---------|
| 緑 | 50% 未満 | まだ十分に余裕があります |
| 黄 | 50〜80% | 埋まってきています |
| 橙 | 80〜95% | 上限が近づいています |
| 赤 | 95% 以上 | あふれる寸前です — `/compress` を検討してください |

入力トークンと出力トークンなど、分類ごとの費用を含む詳しい内訳は `/usage` で確認できます。

`openai-codex` プロバイダでは、`/usage` は ChatGPT アカウントに貯まっている利用上限の
リセット権も表示します（"You have N resets banked - use /usage reset to activate"）。
`/usage reset` は貯まったリセットを1つ使い、5時間ごとの上限と週ごとの上限を完全に
戻します。上限を使い切っていない状態では、Hermes は使用を拒みます（リセットは残量を
まるごと戻すので、早く使うほど損になります）。それでも使いたいときは
`/usage reset --force` を指定してください。

### セッション再開時の表示 {#session-resume-display}

前のセッションを再開すると（`hermes -c` や `hermes --resume <id>`）、バナーと入力欄の間に
「Previous Conversation」というパネルが現れ、それまでの会話の要約が短くまとめて表示されます。
詳細と設定は [セッション — 再開時の会話の振り返り](/hermes/docs/user-guide/sessions/#conversation-recap-on-resume)
を参照してください。

## キー操作 {#keybindings}

| キー | 動作 |
|-----|--------|
| `Enter` | メッセージを送信します |
| `Alt+Enter`、`Ctrl+J`、`Shift+Enter` | 改行します（複数行の入力）。`Shift+Enter` は、それを `Enter` と区別できるターミナルが必要です — 下記を参照してください。Windows Terminal では `Alt+Enter` がターミナル側に取られる（全画面の切り替え）ため、代わりに `Ctrl+Enter` か `Ctrl+J` を使ってください。 |
| `Alt+V` | ターミナルが対応していれば、クリップボードから画像を貼り付けます |
| `Ctrl+V` | テキストを貼り付け、可能ならクリップボードの画像も一緒に添付します |
| `Ctrl+B` | 音声モードが有効なとき、録音を開始・停止します（`voice.record_key`、既定は `ctrl+b`） |
| `Ctrl+G` | 現在の入力内容を `$EDITOR`（vim/nvim/nano/VS Code など）で開きます。保存して終了すると、編集したテキストがそのまま次のプロンプトとして送られます。長い、段落がいくつもあるプロンプトに向いています。 |
| `Ctrl+X Ctrl+E` | 外部エディタを開く Emacs 風の別割り当てです（`Ctrl+G` と同じ動作）。 |
| `Ctrl+S` | **書きかけを一時的にしまう。** いま書いている下書きをよけて入力欄を空にし、先に別のことを送れるようにします。空の入力欄でもう一度 `Ctrl+S` を押すと下書きが戻ります（カーソルは末尾、添付した画像も復元されます）。押すたびに上書きせず積み重なるので、前の下書きが黙って失われることはありません。2つ以上しまってある状態で `Ctrl+S` を押すと一覧パネルが開きます（`↑`/`↓` で移動、`Enter` で復元、`D` で破棄、`Esc` か `Ctrl+S` で閉じる）。ステータスバーの `📌 N` バッジが、しまってある下書きの数を示します。複数行の下書きも、空行を含めてそのまま往復します。しまった内容はそのセッションの間だけメモリ上にあり、ディスクには書かれません（下書きには秘密が含まれることが多いためです）。 |
| `Ctrl+C` | エージェントを中断します（2秒以内に2回押すと強制終了） |
| `Ctrl+D` | 終了します |
| `Ctrl+Z` | Hermes をバックグラウンドに退避します（Unix のみ）。シェルで `fg` を実行すると戻ります。 |
| `Tab` | 入力候補（薄い文字の提案）を確定するか、スラッシュコマンドを補完します |
| `!<command>` | **シェルモード** — モデルのターンを消費せずに、自分でシェルコマンドを実行します（例: `!git status`、`!pytest -x`）。下記を参照してください。 |

**複数行の貼り付けプレビュー。** 複数行のかたまりを貼り付けると、CLI は中身をそのまま
画面に流し込む代わりに、1行の短いプレビュー（`[pasted: 47 lines, 1,842 chars — press Enter to send]`）
を表示します。送られるのはあくまで全文で、これは表示上の工夫です。

### `!` シェルモード {#shell-mode}

行頭に `!` を付けると、その行はエージェントに送られず、シェルコマンドとして実行されます。

```
> !git status
> !ls -la
> !pytest -x tests/cli
```

- **費用はゼロ。** モデルは一切呼ばれません。API 呼び出しも、トークンも、待ち時間もありません。
- **会話には何も入りません。** コマンドとその出力は履歴に追加されないので、コンテキストは
  きれいなままで、プロンプトキャッシュにも触れません。
- **エージェントの `terminal` ツールと同じ場所で動きます。** セッションの作業ディレクトリを
  使うので、`!pwd` はエージェントから見えるものと一致します。
- **承認はそのまま働きます。** 危険なコマンド（`rm -rf`、`~/.hermes/config.yaml` への書き込みなど）は、
  エージェントの `terminal` ツールと同じ承認プロンプトを通ります。`!` は費用と待ち時間の
  近道であって、安全の抜け道ではありません。
- **異常終了は表示されます。** 失敗したコマンドは、出力のあとに `! exited <code>` と表示します。
- `!` だけを入力すると、使い方の短い案内が1行出ます。

シェルモードは CLI 専用です。ゲートウェイのプラットフォーム（Discord、Telegram、Slack）と
cron の実行では無視されます。そこにいる人はすでに自分のシェルを持っているからです。

**最終応答のマークダウン除去。** CLI は、エージェントの*最終*返信から、いちばん冗長な
マークダウンの囲みと `**bold**` / `*italic*` の記号を取り除き、生のソースではなく読みやすい
ターミナルの文章として表示します。コードブロックと箇条書きはそのまま残ります。これは
ゲートウェイのプラットフォームやツールの結果には影響しません。そちらはネイティブに
表示するためマークダウンのままです。

## スラッシュコマンド {#slash-commands}

`/` と入力すると補完のドロップダウンが出ます。Hermes は多数の CLI スラッシュコマンド、
スキルから動的に生えるコマンド、ユーザーが自分で定義したクイックコマンドに対応しています。

よく使う例:

| コマンド | 説明 |
|---------|-------------|
| `/help` | コマンドのヘルプを表示します |
| `/model` | 現在のモデルを表示、または変更します |
| `/tools` | いま使えるツールの一覧を表示します |
| `/skills browse` | スキルのハブと公式のオプションスキルを見て回ります |
| `/bg <prompt>` | 別のバックグラウンドセッションでプロンプトを実行します |
| `/btw <question>` | いまの会話を中断せずに、その会話についての小さな質問をします |
| `/skin` | 現在の CLI の見た目を表示、または切り替えます |
| `/voice on` | CLI の音声モードを有効にします（`Ctrl+B` で録音） |
| `/voice tts` | Hermes の返信の読み上げを切り替えます |
| `/reasoning high` | 推論の深さを上げます |
| `/title My Session` | 現在のセッションに名前を付けます |
| `/status` | セッションの情報（モデル／プロファイル／トークン／経過時間）に続けて、ローカルで作った **Session recap** のブロック（最近のターン数、よく使ったツール、触れたファイル、直近のユーザー入力とアシスタントの返信）を表示します。すべて手元での計算で、LLM は呼びません。 |
| `/context [all]` | コンテキストの使用状況を目で見て分かる形で分解します — 記号のブロックの並びと、分類ごとのトークン表（システムプロンプト／ツール／スキル／メモリ／会話／空き）。`/context all` を付けると、スキルごと・ツールセットごとの内訳も加わります。 |
| `/sessions` | 従来の CLI の中で、対話式のセッション選択画面を開きます（TUI が使うものと同じ画面です）。文字を打って絞り込み、矢印キーで移動、Enter で再開します。 |

CLI とメッセージング向けの組み込みコマンドの全一覧は
[スラッシュコマンド早見表](/hermes/docs/reference/slash-commands/) を参照してください。

セットアップ、プロバイダ、無音の調整、メッセージングや Discord での音声の使い方は
[音声モード](/hermes/docs/user-guide/features/voice-mode/) を参照してください。

:::tip
コマンドは大文字と小文字を区別しません — `/HELP` は `/help` と同じように動きます。導入したスキルも、自動的にスラッシュコマンドになります。
:::

## クイックコマンド {#quick-commands}

LLM を呼ばずに、その場でシェルコマンドを実行する独自のコマンドを定義できます。これは
CLI でも、メッセージングのプラットフォーム（Telegram、Discord など）でも動きます。

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

あとはどのチャットでも `/status`、`/gpu`、`/restart` と入力するだけです。ほかの例は
[設定ガイド](/hermes/docs/user-guide/configuration/#quick-commands) を参照してください。

## 起動時にスキルを読み込む {#preloading-skills-at-launch}

そのセッションで使いたいスキルが最初から決まっているなら、起動時に指定できます。

```bash
hermes -s hermes-agent-dev,github-auth
hermes chat -s github-pr-workflow -s github-auth
```

Hermes は、最初のターンの前に、指定された各スキルをセッションのプロンプトへ読み込みます。
このフラグは、対話モードでも単発クエリモードでも同じように使えます。

## スキルのスラッシュコマンド {#skill-slash-commands}

`~/.hermes/skills/` に導入されたスキルは、すべて自動的にスラッシュコマンドとして
登録されます。スキル名がそのままコマンドになります。

```
/gif-search funny cats
/axolotl help me fine-tune Llama 3 on my dataset
/github-pr-workflow create a PR for the auth refactor

# Just the skill name loads it and lets the agent ask what you need:
/excalidraw
```

## 人格設定 {#personalities}

あらかじめ用意された人格を指定すると、エージェントの口調が変わります。

```
/personality pirate
/personality kawaii
/personality concise
```

組み込みの人格には次のものがあります: `helpful`、`concise`、`technical`、`creative`、
`teacher`、`kawaii`、`catgirl`、`pirate`、`shakespeare`、`surfer`、`noir`、`uwu`、
`philosopher`、`hype`。

既定の状態（上書きなし）に戻すには `/personality none` を使います。`default` と
`neutral` でも同じです。

`~/.hermes/config.yaml` で独自の人格を定義することもできます。

```yaml
personalities:
  helpful: "You are a helpful, friendly AI assistant."
  kawaii: "You are a kawaii assistant! Use cute expressions..."
  pirate: "Arrr! Ye be talkin' to Captain Hermes..."
  # Add your own!
```

## 複数行の入力 {#multi-line-input}

複数行のメッセージを入力する方法は2つあります。

1. **`Alt+Enter`、`Ctrl+J`、`Shift+Enter`** — 改行を入れます
2. **バックスラッシュによる継続** — 行末に `\` を置くと次の行へ続きます:

```
❯ Write a function that:\
  1. Takes a list of numbers\
  2. Returns the sum
```

`Ctrl+J` とバックスラッシュによる継続は既定で有効で、Claude Code / Codex / OpenCode の
複数行入力の操作に合わせてあります。iTerm2 のような対応ターミナルでは、Hermes は
拡張キー通知も要求するので、`Shift+Enter` が独立した改行キーとして届きます。もし
ターミナルが素の `Enter` に対して LF を送っていて、従来の「`Ctrl+J` で送信」の動作が
必要なら、次の設定で外せます。

```yaml
# ~/.hermes/config.yaml
display:
  cli_multiline_shortcuts: false
```

:::info
複数行テキストの貼り付けにも対応しています — 上記の改行キーのいずれかを使うか、そのまま内容を貼り付けてください。
:::

### Shift+Enter の対応状況 {#shiftenter-compatibility}

ほとんどのターミナルは、既定では `Enter` と `Shift+Enter` に同じバイト列を送るため、
アプリケーション側では区別できません。Hermes が `Shift+Enter` を認識するのは、
ターミナルが [Kitty キーボードプロトコル](https://sw.kovidgoyal.net/kitty/keyboard-protocol/)
または xterm の `modifyOtherKeys` モードで別のバイト列を送る場合だけです。

| ターミナル | 状況 |
|---|---|
| Kitty、foot、WezTerm、Ghostty | `Shift+Enter` の区別が既定で有効です |
| iTerm2（最近の版）、Alacritty、VS Code のターミナル、Warp | 設定で Kitty プロトコルを有効にすれば対応します |
| Windows Terminal Preview 1.25 以降 | 設定で Kitty プロトコルを有効にすれば対応します |
| macOS の Terminal.app、通常版の Windows Terminal（安定版） | 非対応 — `Shift+Enter` を `Enter` と区別できません |

ターミナルが区別できない場合でも、`Alt+Enter` と `Ctrl+J` は既定のまま使えます。
**とくに Windows Terminal では `Alt+Enter` がターミナルに取られてしまい（全画面の切り替え）、
Hermes には届きません。改行には `Ctrl+Enter`（`Ctrl+J` として届きます）か、`Ctrl+J` を
直接使ってください。**

## 実行中のエージェントの軌道修正 {#redirecting-the-agent-mid-turn}

エージェントが作業している最中でも、新しいターンを始めずに訂正を送れます。

- **新しいメッセージを入力して Enter** — その訂正で、動作中のターンの向きを変えます
- **`Ctrl+C`** — 現在の処理を中断します（2秒以内に2回押すと強制終了）
- 完了済みのツールの作業と、すでに表示された推論はコンテキストに残ります
- 実行中のツールは、安全な区切りまで進んでから訂正が適用されます

### 入力が重なったときの動作 {#busy-input-mode}

`display.busy_input_mode` の設定キーは、エージェントが作業している最中に Enter を押した
ときの動作を決めます。

| モード | 動作 |
|------|----------|
| `"interrupt"`（既定） | メッセージが動作中のターンの向きを変えます。表示済みの推論と完了した作業を残したまま、モデルの生成をやり直します。実行中のツールは先に終わります |
| `"queue"` | メッセージは黙って待ち行列に入り、エージェントが終わったあと、次のターンとして送られます |
| `"steer"` | メッセージは `/steer` を通じて現在の実行に差し込まれ、次のツール呼び出しのあとでエージェントに届きます — 中断も、新しいターンもありません |

```yaml
# ~/.hermes/config.yaml
display:
  busy_input_mode: "steer"   # or "queue" or "interrupt" (default)
```

`"queue"` モードは、別の後続ターンを用意します。`"steer"` は必ず次のツール結果の区切りを
待ちます。既定の `"interrupt"` モードは、実行中のツールを打ち切らずに、モデルの生成中に
より早く反応します。ターンとその前面の作業ごと取り消したいときは `/stop` を使ってください。
知らない値が入っていた場合は `"interrupt"` に戻ります。

`"steer"` には自動的な代替が2つあります。エージェントがまだ動き出していないとき、または
画像が添付されているときは、何も失わないよう `"queue"` の動作に切り替わります。

CLI の中から変更することもできます。

```text
/busy queue
/busy steer
/busy interrupt
/busy status
```

:::tip 最初の一度だけのヒント
Hermes が作業している最中に初めて Enter を押すと、Hermes は `/busy` という設定について1行の案内を表示します。これはインストールごとに一度だけです。表示したことは `config.yaml` の `onboarding.seen.busy_input_prompt` に記録されます。このキーを消すと、もう一度ヒントが出ます。
:::

### バックグラウンドへの退避 {#suspending-to-background}

Unix 系の環境では、**`Ctrl+Z`** を押すと Hermes をバックグラウンドへ退避できます。
ほかのターミナルのプロセスとまったく同じです。シェルには確認が表示されます。

```
Hermes Agent has been suspended. Run `fg` to bring Hermes Agent back.
```

シェルで `fg` と入力すると、離れたところからそのままセッションが再開します。Windows では
対応していません。

## ツールの進行表示 {#tool-progress-display}

CLI は、エージェントが作業している様子をアニメーションで見せます。

**考え中のアニメーション**（API 呼び出し中）:
```
  ◜ (｡•́︿•̀｡) pondering... (1.2s)
  ◠ (⊙_⊙) contemplating... (2.4s)
  ✧٩(ˊᗜˋ*)و✧ got it! (3.1s)
```

**ツール実行の流れ:**
```
  ┊ 💻 terminal `ls -la` (0.3s)
  ┊ 🔍 web_search (1.2s)
  ┊ 📄 web_extract (2.1s)
```

表示モードは `/verbose` で切り替わります: `off → new → all → verbose`。このコマンドは
メッセージングのプラットフォームでも有効にできます —
[設定](/hermes/docs/user-guide/configuration/#display-settings) を参照してください。

### ツールのプレビューの長さ {#tool-preview-length}

`display.tool_preview_length` の設定キーは、ツール呼び出しのプレビュー行（ファイルパスや
ターミナルのコマンドなど）に表示する最大文字数を決めます。既定は `0` で、制限なしを
意味します — パスもコマンドも省略されずに表示されます。

```yaml
# ~/.hermes/config.yaml
display:
  tool_preview_length: 80   # Truncate tool previews to 80 chars (0 = no limit)
```

これは幅の狭いターミナルや、ツールの引数に非常に長いファイルパスが入る場面で役に立ちます。

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

再開の選択肢:

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

再開すると、SQLite から会話の履歴がすべて復元されます。エージェントは、それまでの
メッセージ、ツール呼び出し、応答をすべて見ることができます。まるで席を立たなかったかの
ようにです。

チャットの中で `/title My Session Name` を使うと現在のセッションに名前が付きます。
コマンドラインからは `hermes sessions rename <id> <title>` でも同じです。過去の
セッションを見て回るには `hermes sessions list` を使います。

### セッションの保存先 {#session-storage}

CLI のセッションは、Hermes の SQLite 状態データベース `~/.hermes/state.db` に保存されます。
このデータベースが持っているものは次のとおりです。

- セッションのメタデータ（ID、タイトル、日時、トークンの計数）
- メッセージの履歴
- 圧縮・再開をまたいだ系譜
- `session_search` が使う全文検索の索引

メッセージング用のアダプタの中には、データベースとは別にプラットフォームごとの記録
ファイルを持つものもありますが、CLI 自体は SQLite のセッション置き場から再開します。

### コンテキストの圧縮 {#context-compression}

長い会話は、コンテキストの上限に近づくと自動的に要約されます。

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

圧縮が起きると、途中のターンが要約されます。最初の3ターンと最後の20ターンは常に
そのまま残ります。

## バックグラウンドのセッション {#background-sessions}

CLI で別の作業を続けながら、切り離したバックグラウンドのセッションでプロンプトを
実行できます。

```
/bg Analyze the logs in /var/log and summarize any errors from today
```

Hermes はすぐに受け付けを知らせ、入力欄をあなたに返します。

```
🔄 Background task #1 started: "Analyze the logs in /var/log and summarize..."
   Task ID: bg_143022_a1b2c3
```

### 仕組み {#how-it-works}

`/bg` のプロンプトはそれぞれ、デーモンスレッド上に**完全に独立したエージェントの
セッション**を起こします。

- **会話は切り離されています** — バックグラウンドのエージェントは、いまのセッションの
  履歴を何も知りません。受け取るのは、あなたが渡したプロンプトだけです。
- **設定は同じです** — バックグラウンドのエージェントは、いまのセッションのモデル、
  プロバイダ、ツールセット、推論の設定、代替モデルを引き継ぎます。
- **待たされません** — 前面のセッションは完全に対話できるままです。会話も、コマンドの
  実行も、さらに別のバックグラウンドタスクの開始もできます。
- **複数のタスク** — バックグラウンドタスクは同時にいくつも動かせます。それぞれに
  番号付きの ID が付きます。

### 結果 {#results}

バックグラウンドタスクが終わると、結果がターミナルにパネルとして現れます。

```
╭─ ⚕ Hermes (background #1) ──────────────────────────────────╮
│ Found 3 errors in syslog from today:                         │
│ 1. OOM killer invoked at 03:22 — killed process nginx        │
│ 2. Disk I/O error on /dev/sda1 at 07:15                      │
│ 3. Failed SSH login attempts from 192.168.1.50 at 14:30      │
╰──────────────────────────────────────────────────────────────╯
```

タスクが失敗した場合は、代わりにエラーの通知が出ます。設定で
`display.bell_on_complete` を有効にしていれば、タスクが終わったときにターミナルの
ベルが鳴ります。

### 使いどころ {#use-cases}

- **時間のかかる調べもの** — コードを書いている間に「/bg research the latest developments in quantum error correction」
- **ファイルの処理** — 会話を続けながら「/bg analyze all Python files in this repo and list any security issues」
- **並行した調査** — 複数のバックグラウンドタスクを走らせ、いくつもの角度から同時に探る

:::info
バックグラウンドのセッションは、メインの会話履歴には現れません。独立したセッションとして、それぞれのタスク ID（例: `bg_143022_a1b2c3`）を持ちます。
:::

## 静かなモード {#quiet-mode}

CLI は既定で静かなモードで動きます。このモードでは:
- ツールからの冗長なログを抑えます
- かわいい見た目のアニメーション表示を有効にします
- 出力をきれいで扱いやすい状態に保ちます

デバッグ出力を見たいときは:
```bash
hermes chat --verbose
```
