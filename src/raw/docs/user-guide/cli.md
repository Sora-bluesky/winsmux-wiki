---
title: "CLI 画面"
description: "Hermes Agent のターミナル画面を使いこなす — コマンド、キー操作、人格設定など"
upstream_path: user-guide/cli.md
upstream_blob: 36a6cedf3f8baeff2a2daf7be5b7ef4c20604f68
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

### worktree の掃除 {#worktree-cleanup}

`hermes -w` で始めたセッションは、使い捨ての worktree を `<repo>/.worktrees/` の下に作ります。
起動時には控えめな掃除処理が自動で走りますが（消すのは、変更がなく完全にマージ済みで、一定の日数が経った作業ツリーだけです）、
残すよう指定したツリーやマージ済みのローカルブランチは、よく使う端末ほど溜まっていきます。次のコマンドで
明示的に片づけてください。

```bash
hermes worktree list              # audit: age, size, verdict, reason per tree
hermes worktree prune             # remove safe trees + delete merged branches
hermes worktree prune --dry-run   # show the plan without changing anything
hermes worktree prune --trees-only     # leave local branches alone
hermes worktree prune --branches-only  # leave worktrees alone
```

セッションの中からは `/worktree prune [--dry-run]` で同じことができます（実行中のセッション自身が使っている
ツリーには決して触れません）。

安全面の保証は、どのモードでも、どれだけ古いツリーでも共通です。

- コミットしていない **追跡対象** の変更は、決して削除されません。
- **プッシュされていない固有のコミット** も削除されません。上流で rebase や squash によりマージされた
  コミットは、`git cherry` のパッチ等価判定で検出され、マージ済みとして扱われます。これによって、
  「PR はマージされたのにツリーが永久に残る」という最も多い溜まり方をようやく回収できます。
- **稼働中の hermes セッションが使っている** ツリーには手を出しません。
- **追跡対象がない一時ファイルだけ** のツリー（PR 本文の下書きやメモなど）は、削除の前に
  `~/.hermes/archive/worktree-prune/` へ退避されます。捨てられることはありません。
- ブランチの削除は名前ではなく中身で判断します。コミットがすべて上流にあるローカルブランチは削除して
  安全です。固有の作業が残っているブランチ、チェックアウト中のブランチ、`main`/`master`/`develop` は
  常に残ります。

`.worktrees/` がツリー 10 個または 5 GB を超えると、起動時にこれらのコマンドを案内する1行の
お知らせが出ます。

### プラグインの管理 {#plugin-management}

`hermes plugins` 系のコマンドは、Hermes ネイティブのプラグインと、持ち運びできる Agent
Plugins v1 のパッケージを、同じ「自分で有効にする」流れで管理します。

```bash
hermes plugins install owner/repository --no-enable
hermes plugins list
hermes plugins enable <plugin-name>
hermes plugins disable <plugin-name>
hermes plugins update <plugin-name>
hermes plugins remove <plugin-name>
```

持ち運び形式のパッケージは、明示的に有効にするまで無効のままです。Hermes が現在読み込むのは、
持ち運び形式の Agent Skills と stdio 形式の MCP エントリです。対応している範囲と信頼の境界の詳細は
[プラグイン開発ガイド](/hermes/docs/developer-guide/plugins/#portable-agent-plugins-v1-packages)
を参照してください。

## 画面の構成 {#interface-layout}

![Stylized preview of the Hermes CLI layout showing the banner, conversation area, and fixed input prompt.](https://hermes-agent.nousresearch.com/docs/img/docs/cli-layout.svg)
*Hermes CLI のバナー、会話の流れ、固定された入力欄を、崩れやすいアスキーアートではなく安定した図として描いたものです。*

ウェルカムバナーには、モデル、ターミナルのバックエンド、作業ディレクトリ、使えるツール、入っているスキルがひと目で分かるように並びます。

### ステータスバー {#status-bar}

入力欄の上には、常に表示されて刻々と更新されるステータスバーがあります。

```
 ⚕ claude-sonnet-4-20250514 │ 12.4K/200K │ [██████░░░░] 6% │ $0.06 │ 15m
```

| 項目 | 説明 |
|---------|-------------|
| モデル名 | 現在のモデル（26 文字を超えると省略されます） |
| トークン数 | 使用中のコンテキストトークン数 / コンテキストの上限 |
| コンテキストバー | 使用量を色分けして示すインジケーター |
| コスト | セッションの推定費用（不明なモデルや無料のモデルでは `n/a`） |
| 🗜️ N | **コンテキスト圧縮の回数** — いま動いているセッションが自動圧縮された回数です。最初の圧縮が起きた時点から表示されます。 |
| ▶ N | **実行中のバックグラウンドタスク** — 現在のセッションでまだ動いている `/bg` のプロンプト数です。1つ以上動いている間だけ表示されます。 |
| 経過時間 | セッションの経過時間 |
| セッション名 | セッションに名前が付くと、右端に金色のバッジとして固定表示されます。長い名前は、モデルとコンテキストという重要な項目を押しのける前に省略されます。 |
| ⚠ YOLO | **YOLO モードの警告** — `HERMES_YOLO_MODE` が有効なとき（起動時の `hermes --yolo`、または途中で `/yolo` を切り替えた場合）に表示されます。バナー行の警告と同じものを出すことで、自動承認モードにいることを忘れずに済みます。 |

バーは端末の幅に合わせて変わります。76 桁以上ならフル表示、52〜75 桁なら簡略表示、52 桁未満なら最小表示（モデルと経過時間、YOLO が有効ならそのバッジ）です。

**コンテキストの色分け:**

| 色 | しきい値 | 意味 |
|-------|-----------|---------|
| 緑 | 50% 未満 | まだ余裕がある |
| 黄 | 50〜80% | 埋まってきた |
| 橙 | 80〜95% | 上限が近い |
| 赤 | 95% 以上 | あふれる寸前 — `/compress` を検討 |

入力と出力それぞれのトークンなど、項目別の費用も含めた内訳は `/usage` で確認できます。

`openai-codex` プロバイダーでは、`/usage` が ChatGPT アカウントに貯まっている利用上限のリセット権も表示します（「You have N resets banked - use /usage reset to activate」）。`/usage reset` を実行すると貯まったリセット権を1つ使い、5時間ごとの上限と週次の上限が完全に回復します。上限に達していないうちは、Hermes はリセットを拒否します（リセット権は上限をまるごと戻すものなので、早く使うと損になります）。それでも実行したい場合は `/usage reset --force` を渡してください。

### 再開時の表示 {#session-resume-display}

前のセッションを再開すると（`hermes -c` または `hermes --resume <id>`）、バナーと入力欄のあいだに「Previous Conversation」というパネルが現れ、会話履歴の要約がコンパクトに表示されます。詳細と設定は [セッション — 再開時の会話の振り返り](/hermes/docs/user-guide/sessions/#conversation-recap-on-resume) を参照してください。

## キー操作 {#keybindings}

| キー | 動作 |
|-----|--------|
| `Enter` | メッセージを送る |
| `Alt+Enter`、`Ctrl+J`、`Shift+Enter` | 改行を入れる（複数行入力）。`Shift+Enter` は、`Enter` と区別して送れるターミナルが必要です（後述）。Windows Terminal では `Alt+Enter` がターミナル側に取られる（全画面切り替え）ため、`Ctrl+Enter` か `Ctrl+J` を使ってください。 |
| `Alt+V` | ターミナルが対応していれば、クリップボードの画像を貼り付ける |
| `Ctrl+V` | テキストを貼り付け、可能ならクリップボードの画像も添付する |
| `Ctrl+B` | 音声モードが有効なとき、録音を開始・停止する（`voice.record_key`、既定は `ctrl+b`） |
| `Ctrl+G` | いま書いている内容を `$EDITOR`（vim / nvim / nano / VS Code など）で開く。保存して終了すると、編集後のテキストが次のプロンプトとして送られます。長く段落の多いプロンプトに向いています。 |
| `Ctrl+X Ctrl+E` | 外部エディタを開く Emacs 風の別割り当て（`Ctrl+G` と同じ動作）。 |
| `Ctrl+S` | **下書きを退避する。** いま書いている下書きをいったん預けて入力欄を空にし、先に別のことを送れるようにします。空の入力欄でもう一度 `Ctrl+S` を押すと下書きが戻ります（カーソルは末尾、添付した画像も復元されます）。繰り返し押すと上書きではなく積み重なるので、前の下書きが黙って消えることはありません。2つ以上預けている状態で `Ctrl+S` を押すと一覧パネルが開きます（`↑`/`↓` で移動、`Enter` で復元、`D` で破棄、`Esc` または `Ctrl+S` で閉じる）。預けている数はステータスバーの `📌 N` バッジで分かります。複数行の下書きは空行も含めてそのまま往復します。退避先はそのセッションのメモリ上だけで、ディスクには何も書かれません。下書きには秘密情報が入りがちだからです。 |
| `Ctrl+C` | エージェントを中断する（2秒以内に2回押すと強制終了） |
| `Ctrl+D` | 終了する |
| `Ctrl+Z` | Hermes をバックグラウンドに退避する（Unix のみ）。シェルで `fg` を実行すると戻ります。 |
| `Tab` | 入力候補（薄く表示される予測）を確定する、またはスラッシュコマンドを補完する |
| `!<command>` | **シェルモード** — モデルの1ターンを消費せずに、自分でシェルコマンドを実行します（例: `!git status`、`!pytest -x`）。後述します。 |

**複数行の貼り付けプレビュー。** 複数行のかたまりを貼り付けると、CLI は全文をそのまま流さず、1行に畳んだプレビュー（`[pasted: 47 lines, 1,842 chars — press Enter to send]`）を表示します。実際に送られるのは全文のままで、これは表示上の工夫です。

### `!` シェルモード {#shell-mode}

行頭に `!` を付けると、その行はエージェントには送られず、シェルコマンドとして実行されます。

```
> !git status
> !ls -la
> !pytest -x tests/cli
```

- **費用はゼロ。** モデルは一切呼ばれません。API 呼び出しもトークン消費も待ち時間もありません。
- **会話には残らない。** コマンドも出力も履歴に加わらないので、コンテキストはきれいなまま、プロンプトキャッシュも壊れません。
- **エージェントの `terminal` ツールと同じ場所で動く。** セッションの作業ディレクトリを使うので、`!pwd` の結果はエージェントから見えるものと一致します。
- **承認の仕組みはそのまま。** 危険なコマンド（`rm -rf`、`~/.hermes/config.yaml` への書き込みなど）は、エージェントの `terminal` ツールと同じ承認プロンプトを通ります。`!` は費用と待ち時間の近道であって、安全機構の抜け道ではありません。
- **失敗したら分かる。** 終了コードが 0 でないときは、出力のあとに `! exited <code>` と表示されます。
- `!` だけを打つと、使い方が1行で表示されます。

シェルモードは CLI 専用です。ゲートウェイのプラットフォーム（Discord、Telegram、Slack）や cron 実行では無視されます。そちらの利用者は、すでに自分のシェルを持っているからです。

**最終応答の Markdown 除去。** CLI は、エージェントの *最終的な* 返答から、冗長になりがちなコードフェンスや `**bold**` / `*italic*` の装飾を取り除き、ターミナルで読みやすい文章として表示します。コードブロックと箇条書きはそのまま残ります。ゲートウェイのプラットフォームやツールの実行結果には影響しません。そちらは各自の描画のために Markdown を保持します。

## スラッシュコマンド {#slash-commands}

`/` と打つと入力補完が出てきます。Hermes には、CLI のスラッシュコマンド、スキル由来の動的なコマンド、自分で定義したクイックコマンドが数多くあります。

よく使うものは次のとおりです。

| コマンド | 説明 |
|---------|-------------|
| `/help` | コマンドのヘルプを表示する |
| `/model` | 現在のモデルを表示・変更する |
| `/tools` | いま使えるツールを一覧する |
| `/skills browse` | スキルハブと公式のオプションスキルを見て回る |
| `/bg <prompt>` | プロンプトを別のバックグラウンドセッションで実行する |
| `/btw <question>` | いまの会話を止めずに、その内容について脇道の質問をする |
| `/skin` | 現在の CLI スキンを表示・切り替えする |
| `/voice on` | CLI の音声モードを有効にする（録音は `Ctrl+B`） |
| `/voice tts` | Hermes の返答の読み上げを切り替える |
| `/reasoning high` | 推論に割く労力を上げる |
| `/title My Session` | 現在のセッションに名前を付ける |
| `/status` | セッション情報（モデル / プロファイル / トークン / 経過時間）に続けて、手元で作る **セッションの振り返り** を表示します（直近のやり取り数、よく使ったツール、触れたファイル、最後のユーザー発言とアシスタントの返答）。すべてローカル処理で、LLM は呼びません。 |
| `/context [all]` | コンテキスト使用量を目で見る内訳 — ブロックのグリッド表示と、項目別のトークン表（システムプロンプト / ツール / スキル / メモリ / 会話 / 空き）。`/context all` はスキルごと・ツールセットごとの内訳も加えます。 |
| `/sessions` | 従来の CLI の中で、対話的なセッション選択画面を開きます（TUI と同じものです）。文字を打って絞り込み、矢印キーで移動、Enter で再開します。 |

CLI とメッセージングの組み込みコマンド全一覧は [スラッシュコマンド一覧](/hermes/docs/reference/slash-commands/) を参照してください。

セットアップ、プロバイダー、無音判定の調整、メッセージングや Discord での音声利用については [音声モード](/hermes/docs/user-guide/features/voice-mode/) を参照してください。

:::tip
コマンドは大文字と小文字を区別しません。`/HELP` は `/help` と同じように動きます。入れたスキルも自動的にスラッシュコマンドになります。
:::

## クイックコマンド {#quick-commands}

LLM を呼ばずに、シェルコマンドをその場で実行する独自コマンドを定義できます。CLI でも、メッセージングのプラットフォーム（Telegram、Discord など）でも使えます。

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

あとは、どのチャットでも `/status`、`/gpu`、`/restart` と打つだけです。ほかの例は [設定ガイド](/hermes/docs/user-guide/configuration/#quick-commands) にあります。

## 起動時にスキルを読み込む {#preloading-skills-at-launch}

そのセッションで使いたいスキルが決まっているなら、起動時に渡してしまえます。

```bash
hermes -s hermes-agent-dev,github-auth
hermes chat -s github-pr-workflow -s github-auth
```

Hermes は、最初のやり取りが始まる前に、指定されたスキルをセッションのプロンプトに読み込みます。このフラグは対話モードでも単発クエリモードでも使えます。

## スキルのスラッシュコマンド {#skill-slash-commands}

`~/.hermes/skills/` に入っているスキルは、すべて自動的にスラッシュコマンドとして登録されます。スキル名がそのままコマンド名になります。

```
/gif-search funny cats
/axolotl help me fine-tune Llama 3 on my dataset
/github-pr-workflow create a PR for the auth refactor

# Just the skill name loads it and lets the agent ask what you need:
/excalidraw
```

## 人格設定 {#personalities}

あらかじめ用意された人格を指定して、エージェントの口調を変えられます。

```
/personality pirate
/personality kawaii
/personality concise
```

組み込みの人格には次のものがあります。`helpful`、`concise`、`technical`、`creative`、`teacher`、`kawaii`、`catgirl`、`pirate`、`shakespeare`、`surfer`、`noir`、`uwu`、`philosopher`、`hype`。

既定の状態（上書きなし）に戻すには `/personality none` を使います。`default` と `neutral` も同じ働きをします。

`~/.hermes/config.yaml` で独自の人格を定義することもできます。

```yaml
personalities:
  helpful: "You are a helpful, friendly AI assistant."
  kawaii: "You are a kawaii assistant! Use cute expressions..."
  pirate: "Arrr! Ye be talkin' to Captain Hermes..."
  # Add your own!
```

## 複数行の入力 {#multi-line-input}

複数行のメッセージを書く方法は2つあります。

1. **`Alt+Enter`、`Ctrl+J`、`Shift+Enter`** — 改行を挿入します
2. **バックスラッシュで継続** — 行末を `\` で終えると次の行に続きます:

```
❯ Write a function that:\
  1. Takes a list of numbers\
  2. Returns the sum
```

`Ctrl+J` とバックスラッシュによる継続は既定で有効で、Claude Code / Codex / OpenCode の複数行ショートカットに合わせてあります。iTerm2 などの対応ターミナルでは、`Shift+Enter` が独立した改行キーとして届くよう、Hermes が拡張キー通知も要求します。素の `Enter` で LF を送るターミナルを使っていて、従来どおり `Ctrl+J` を送信キーとして使いたい場合は、次の設定で無効にできます。

```yaml
# ~/.hermes/config.yaml
display:
  cli_multiline_shortcuts: false
```

:::info
複数行のテキストの貼り付けにも対応しています。上のいずれかの改行キーを使うか、そのまま貼り付けてください。
:::

### Shift+Enter の対応状況 {#shiftenter-compatibility}

多くのターミナルは、既定では `Enter` と `Shift+Enter` に同じバイト列を送るため、アプリケーション側では区別できません。Hermes が `Shift+Enter` を認識できるのは、ターミナルが [Kitty キーボードプロトコル](https://sw.kovidgoyal.net/kitty/keyboard-protocol/) または xterm の `modifyOtherKeys` モードで別のシーケンスを送る場合だけです。

| ターミナル | 状況 |
|---|---|
| Kitty、foot、WezTerm、Ghostty | 既定で `Shift+Enter` を区別できます |
| iTerm2（最近の版）、Alacritty、VS Code のターミナル、Warp | 設定で Kitty プロトコルを有効にすれば使えます |
| Windows Terminal Preview 1.25 以降 | 設定で Kitty プロトコルを有効にすれば使えます |
| macOS の Terminal.app、通常版の Windows Terminal（安定版） | 非対応 — `Shift+Enter` は `Enter` と区別できません |

区別できないターミナルでも、`Alt+Enter` と `Ctrl+J` は既定で使えます。**とくに Windows Terminal では、`Alt+Enter` がターミナル側に取られてしまい（全画面の切り替え）Hermes まで届きません。改行には `Ctrl+Enter`（`Ctrl+J` として届きます）か `Ctrl+J` を直接使ってください。**

## 作業中のエージェントに指示を出し直す {#redirecting-the-agent-mid-turn}

エージェントが動いている最中でも、新しいターンを始めずに訂正を送れます。

- **新しいメッセージを打って Enter** — その訂正で、進行中のターンの向きを変えます
- **`Ctrl+C`** — いまの処理を中断します（2秒以内に2回押すと強制終了）
- すでに終わったツールの作業や、表示済みの思考はコンテキストに残ります
- 実行中のツールは、安全に区切れるところまで進んでから訂正が適用されます

### 作業中の入力の扱い {#busy-input-mode}

`display.busy_input_mode` の設定は、エージェントが作業しているあいだに Enter を押したときの挙動を決めます。

| モード | 挙動 |
|------|----------|
| `"interrupt"`（既定） | メッセージが進行中のターンの向きを変えます。表示済みの思考と完了した作業は残したまま、モデルの生成をやり直します。実行中のツールは先に終わらせます |
| `"queue"` | メッセージは黙って待ち行列に入り、エージェントが終わったあと次のターンとして送られます |
| `"steer"` | メッセージが `/steer` 経由でいまの実行に差し込まれ、次のツール呼び出しのあとにエージェントへ届きます。中断も新しいターンも起こりません |

```yaml
# ~/.hermes/config.yaml
display:
  busy_input_mode: "steer"   # or "queue" or "interrupt" (default)
```

`"queue"` は、あとに続く別のターンを用意します。`"steer"` は常に次のツール結果の区切りを待ちます。既定の `"interrupt"` は、モデルが生成しているあいだなら早く反応しつつ、実行中のツールを打ち切らずに済みます。ターンとその手前の作業ごと取り消したいときは `/stop` を使ってください。知らない値を指定した場合は `"interrupt"` に戻ります。

`"steer"` には自動の逃げ道が2つあります。エージェントがまだ動き出していない場合と、画像が添付されている場合は、`"queue"` の挙動に切り替わり、内容が失われません。

CLI の中から切り替えることもできます。

```text
/busy queue
/busy steer
/busy interrupt
/busy status
```

:::tip 初回のヒント
Hermes が作業している最中に初めて Enter を押すと、`/busy` の設定について1行の案内が表示されます。表示はインストールごとに1回きりで、表示済みであることは `config.yaml` の `onboarding.seen.busy_input_prompt` に記録されます。このキーを消すと、また表示されます。
:::

### バックグラウンドへの退避 {#suspending-to-background}

Unix 系のシステムでは、**`Ctrl+Z`** を押すと Hermes をバックグラウンドへ退避できます。ほかのターミナルのプロセスと同じです。シェルには次のように表示されます。

```
Hermes Agent has been suspended. Run `fg` to bring Hermes Agent back.
```

シェルで `fg` と打てば、中断したところからそのまま再開します。Windows では使えません。

## ツールの進行表示 {#tool-progress-display}

CLI は、エージェントが作業しているあいだ、動きのあるフィードバックを表示します。

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

表示モードは `/verbose` で順に切り替わります: `off → new → all → verbose`。このコマンドはメッセージングのプラットフォーム向けにも有効にできます。[設定](/hermes/docs/user-guide/configuration/#display-settings) を参照してください。

### ツールのプレビュー長 {#tool-preview-length}

`display.tool_preview_length` の設定は、ツール呼び出しのプレビュー行（ファイルパスやターミナルのコマンドなど）に表示する最大文字数を決めます。既定は `0` で、上限なしを意味します。パスもコマンドも省略されずに表示されます。

```yaml
# ~/.hermes/config.yaml
display:
  tool_preview_length: 80   # Truncate tool previews to 80 chars (0 = no limit)
```

幅の狭いターミナルを使うときや、ツールの引数にとても長いファイルパスが入るときに役立ちます。

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

再開の選択肢は次のとおりです。

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

再開すると、会話の履歴が SQLite から丸ごと復元されます。エージェントは、これまでのメッセージ、ツール呼び出し、応答をすべて見られる状態になります。席を外していなかったのと同じです。

チャットの中で `/title My Session Name` と打つと、現在のセッションに名前を付けられます。コマンドラインからなら `hermes sessions rename <id> <title>` です。過去のセッションを見て回るには `hermes sessions list` を使います。

### セッションの保存先 {#session-storage}

CLI のセッションは、Hermes の SQLite 状態データベース `~/.hermes/state.db` に保存されます。このデータベースが持っているのは次のものです。

- セッションのメタデータ（ID、名前、時刻、トークンのカウンタ）
- メッセージの履歴
- 圧縮や再開をまたいだ系譜
- `session_search` が使う全文検索の索引

メッセージング用のアダプターの中には、データベースとは別にプラットフォームごとの記録ファイルを持つものもありますが、CLI 自身は SQLite のセッションストアから再開します。

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

圧縮が働くと、途中のやり取りが要約されます。最初の3ターンと最後の20ターンは常にそのまま残ります。

## バックグラウンドのセッション {#background-sessions}

CLI で別の作業を続けながら、プロンプトを別のバックグラウンドセッションで走らせられます。

```
/bg Analyze the logs in /var/log and summarize any errors from today
```

Hermes はすぐに受け付けを知らせ、入力欄を返してくれます。

```
🔄 Background task #1 started: "Analyze the logs in /var/log and summarize..."
   Task ID: bg_143022_a1b2c3
```

### 仕組み {#how-it-works}

`/bg` のプロンプトはそれぞれ、デーモンスレッド上に **完全に独立したエージェントのセッション** を立ち上げます。

- **会話は独立** — バックグラウンドのエージェントは、いまのセッションの履歴を一切知りません。受け取るのは渡したプロンプトだけです。
- **設定は同じ** — バックグラウンドのエージェントは、いまのセッションのモデル、プロバイダー、ツールセット、推論の設定、フォールバックのモデルを引き継ぎます。
- **待たされない** — 手元のセッションは完全に操作できるままです。チャットもコマンド実行も、さらに別のバックグラウンドタスクの開始もできます。
- **複数同時に** — バックグラウンドタスクは同時にいくつも動かせます。それぞれに番号付きの ID が付きます。

### 結果 {#results}

バックグラウンドのタスクが終わると、結果がターミナルにパネルとして現れます。

```
╭─ ⚕ Hermes (background #1) ──────────────────────────────────╮
│ Found 3 errors in syslog from today:                         │
│ 1. OOM killer invoked at 03:22 — killed process nginx        │
│ 2. Disk I/O error on /dev/sda1 at 07:15                      │
│ 3. Failed SSH login attempts from 192.168.1.50 at 14:30      │
╰──────────────────────────────────────────────────────────────╯
```

タスクが失敗した場合は、代わりにエラーの通知が出ます。設定で `display.bell_on_complete` を有効にしていれば、タスクが終わったときにターミナルのベルが鳴ります。

### 使いどころ {#use-cases}

- **時間のかかる調べもの** — コードを書きながら「/bg research the latest developments in quantum error correction」
- **ファイルの処理** — 会話を続けながら「/bg analyze all Python files in this repo and list any security issues」
- **並行した切り分け** — 複数のバックグラウンドタスクを立てて、別々の角度から同時に探る

:::info
バックグラウンドのセッションは、メインの会話履歴には現れません。独自のタスク ID（例: `bg_143022_a1b2c3`）を持つ、独立したセッションです。
:::

## 静かなモード {#quiet-mode}

CLI は既定で静かなモードで動きます。このモードでは次のようになります。
- ツールからの詳細なログを抑えます
- kawaii 風の動きのあるフィードバックを表示します
- 出力をすっきりと読みやすく保ちます

デバッグ出力が必要なときは次を実行します。
```bash
hermes chat --verbose
```
