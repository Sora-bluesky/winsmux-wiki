---
title: "セッション"
description: "セッションの保存・再開・検索・管理と、プラットフォームごとのセッション追跡について説明します。"
upstream_path: user-guide/sessions.md
upstream_blob: af18e5c5ba40d53e5dfb3e87e4fd592d99e1d822
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/sessions
---

# セッション {#sessions}

Hermes Agent は、すべての会話を自動的にセッションとして保存します。セッションがあることで、会話の再開、セッションをまたいだ検索、会話履歴の管理ができます。

## セッションのしくみ {#how-sessions-work}

CLI からの会話でも、Telegram、Discord、Slack、WhatsApp、Signal、Matrix、Teams、その他のメッセージングプラットフォームからの会話でも、すべてメッセージ履歴つきのセッションとして保存されます。セッションは次の場所で管理されます。

1. **SQLite データベース**（`~/.hermes/state.db`）— FTS5 全文検索に対応した構造化されたセッションのメタデータと、メッセージ履歴の全文

SQLite データベースには次のものが保存されます。

- セッション ID、送信元プラットフォーム、ユーザー ID
- **セッションのタイトル**（重複しない、人が読める名前）
- モデル名と設定
- システムプロンプトのスナップショット
- メッセージ履歴の全文（役割、本文、ツール呼び出し、ツールの実行結果）
- トークン数（入力／出力）
- タイムスタンプ（started_at、ended_at）
- 親セッション ID（圧縮によってセッションが分割されたときに使われます）

### 何がコンテキストに含まれるのか {#what-counts-toward-context}

Hermes は会話を再開できるようにセッション履歴を保存しますが、これまで扱った
すべてのデータを毎回送り直しているわけではありません。各ターンでモデルが見るのは、
選択中のシステムプロンプト、現在の会話ウィンドウ、そしてそのターンのために
Hermes が明示的に差し込んだ内容だけです。

添付されたメディアは、そのターンかぎりの入力として扱われます。

- 画像は、次のモデル呼び出しにそのまま添付されることもあれば、使用中のモデルが
  画像入力に対応していない場合はテキストの説明にあらかじめ変換されることもあります。
- 音声は、音声認識が設定されていればテキストに書き起こされます。
- テキスト文書は、抽出したテキストを含められます。それ以外の形式の文書は、
  たいていローカルに保存したパスと短いメモとして扱われます。
- 添付ファイルのパスや、抽出・生成されたテキストは会話の記録に残りますが、
  画像・音声・バイナリファイルそのもののデータが、以降のプロンプトへ繰り返し
  コピーされることはありません。

たとえば、ユーザーが画像を送って「これでミームを作って」と頼んだ場合、Hermes は
その画像を一度だけ画像認識で確認し、画像処理のスクリプトを実行するかもしれません。
それ以降のターンで、元の JPEG が自動的にコンテキストへ持ち越されることはありません。
持ち越されるのは、ユーザーの依頼文、画像の短い説明、ローカルのキャッシュパス、
アシスタントの最終的な返答など、会話に書き込まれた内容だけです。

コンテキストがふくらむいちばんの原因は、メディアファイルそのものではありません。
長いテキストです。貼りつけた会話記録、ログの全文、大きなツール出力、長い差分、
繰り返される状況報告、細かい証跡の羅列などが原因になります。大きな成果物を
そのままチャットへ貼るより、要約、ファイルパス、必要な箇所だけの抜粋、
ツールを使った参照を選んでください。

:::tip
セッションが長くなってきたら `/compress`、新しい話題を始めるなら `/new` を使い、
`hermes sessions prune` は終了済みの古いセッションをストレージから消したいときだけ
使ってください。`state.db` が大きくなっただけなら、まずデータを消さない方法から
試します。`hermes sessions optimize` は、セッションのデータには一切触れずに
FTS5 のインデックスの断片をまとめ、データベースを VACUUM します。圧縮はいま有効な
コンテキストを減らすものであって、プライバシー目的の削除ではありません。
`/new` には名前を渡せます（例: `/new payments-refactor`）。新しいセッションの
最初のタイトルをその場で決められるので、あとから `/resume <name>` や `/sessions` の
一覧で探すときに便利です。
:::

### セッションの送信元 {#session-sources}

各セッションには、送信元のプラットフォームを示すタグが付きます。

| 送信元 | 説明 |
|--------|-------------|
| `cli` | 対話型の CLI（`hermes` または `hermes chat`） |
| `telegram` | Telegram |
| `discord` | Discord のサーバー／DM |
| `slack` | Slack のワークスペース |
| `whatsapp` | WhatsApp |
| `signal` | Signal |
| `matrix` | Matrix のルームと DM |
| `mattermost` | Mattermost のチャンネル |
| `email` | メール（IMAP/SMTP） |
| `sms` | Twilio 経由の SMS |
| `dingtalk` | DingTalk |
| `feishu` | Feishu／Lark |
| `wecom` | WeCom（企業向け WeChat） |
| `weixin` | Weixin（個人向け WeChat） |
| `bluebubbles` | BlueBubbles の macOS サーバー経由の Apple iMessage |
| `qqbot` | 公式 API v2 経由の QQ Bot（Tencent QQ） |
| `homeassistant` | Home Assistant の会話 |
| `webhook` | 受信した webhook |
| `api-server` | API サーバーへのリクエスト |
| `acp` | ACP のエディタ連携 |
| `cron` | 定時実行の cron ジョブ |
| `batch` | 一括処理の実行 |

## CLI でのセッション再開 {#cli-session-resume}

CLI から前の会話を再開するには、`--continue` か `--resume` を使います。

### 直前のセッションを続ける {#continue-last-session}

```bash
# Resume the most recent CLI session
hermes --continue
hermes -c

# Or with the chat subcommand
hermes chat --continue
hermes chat -c
```

このコマンドは、SQLite データベースからいちばん新しい `cli` セッションを探し、その会話履歴をすべて読み込みます。

#### 端末ごとに続きから再開する {#per-terminal-continue}

オプションを付けない `-c` は、端末を見分けて動きます。CLI セッションは、実行中の端末（tty デバイス、tmux のペイン、kitty のウィンドウ、wezterm のペイン、Zellij のペイン、Windows Terminal のセッションなど）をキーにした小さな目印ファイルを `~/.hermes/terminal-sessions/` の下に置きます。*同じ*端末でもう一度 `hermes -c` を実行すると、Hermes はその端末自身のセッションを再開します。つまり、ペインを2つ並べていれば、両方がいちばん新しいセッションを取り合うのではなく、それぞれが自分の会話を続けられます。その端末の目印がない場合（初回、セッションを削除したあと、あるいは30日より古い目印が残っている場合）、`-c` はいちばん新しいセッションを再開する動きに戻ります。`-c "name"` と `--resume` はこの影響を受けません。無効にするには `config.yaml` で `session.terminal_continue: false` を指定します。

### 名前で再開する {#resume-by-name}

セッションにタイトルを付けてあれば（後述の[セッションの名前付け](#session-naming)を参照）、名前で再開できます。

```bash
# Resume a named session
hermes -c "my project"

# If there are lineage variants (my project, my project #2, my project #3),
# this automatically resumes the most recent one
hermes -c "my project"   # → resumes "my project #3"
```

### 特定のセッションを再開する {#resume-specific-session}

```bash
# Resume a specific session by ID
hermes --resume 20250305_091523_a1b2c3d4
hermes -r 20250305_091523_a1b2c3d4

# Resume by title
hermes --resume "refactoring auth"

# Resume the most recent session — same lookup as -c
hermes --resume latest

# Or with the chat subcommand
hermes chat --resume 20250305_091523_a1b2c3d4
```

セッション ID は CLI セッションを終了したときに表示されるほか、`hermes sessions list` でも確認できます。

:::note
`latest` は `--resume` の予約語です。タイトルがそのまま "latest" のセッションも、ID を指定するか `-c latest`（タイトル一致）を使えば開けます。
:::

### 特定のディレクトリで再開する {#resume-in-a-specific-directory}

`--in <dir>` を渡すと、起動・再開する前にそのディレクトリへ移動します。`--resume latest`（または `-c`）と組み合わせると、そのディレクトリのワークスペースに属するいちばん新しいセッションが選ばれるので、先に `cd` したり、セッション ID を覚えておいたりする必要がありません。

```bash
# Resume the latest session that belongs to ./my-project
hermes --resume latest --in ./my-project

# Works with the TUI too
hermes --tui --resume latest --in ./my-project
```

`--in` は、セッションをそのディレクトリに固定する働きもします。再開したセッションに記録されていた作業ディレクトリは復元されません（`--no-restore-cwd` を渡したときと同じ動きです）。

### 再開すると作業ディレクトリも戻ります {#resume-restores-the-working-directory}

CLI セッションを再開すると、そのセッションに記録されていた作業ディレクトリ（git リポジトリのルート、またはプロジェクトのディレクトリ）へ `cd` し直します。これで、会話はもともと属していた作業場所で続きから始まります。いまいる場所から動きたくない場合は、`--no-restore-cwd` を渡してください。

```bash
hermes --resume 20250305_091523_a1b2c3 --no-restore-cwd
```

切り替わったことは `↪ restored workspace dir: …` の行で確認できます。ディレクトリの復元に失敗しても、再開そのものが止まることはありません。

### ワークスペースでセッションを絞り込む {#filtering-sessions-by-workspace}

`hermes sessions list` には `--workspace <needle>` を渡せます。ワークスペースのキー（git リポジトリのルート、なければ現在のディレクトリ）が一致するセッションだけを表示します。パスの一部でも、ディレクトリ名そのものでも指定できます。

```bash
hermes sessions list --workspace my-project
hermes sessions list --workspace ~/code/hermes-agent
```

### 再開時の会話の振り返り {#conversation-recap-on-resume}

セッションを再開すると、入力プロンプトが出る前に、Hermes が前の会話の要点を枠で囲んだパネルにまとめて表示します。

![Stylized preview of the Previous Conversation recap panel shown when resuming a Hermes session.](https://hermes-agent.nousresearch.com/img/docs/session-recap.svg)
*再開したときは、直近のユーザーとアシスタントのやり取りをまとめたパネルが表示されてから、いつもの入力欄に戻ります。*

このパネルの内容は次のとおりです。

- **ユーザーのメッセージ**（金色の `●`）と**アシスタントの返答**（緑色の `◆`）を表示します
- 長いメッセージは**省略**します（ユーザーは300文字、アシスタントは200文字／3行まで）
- ツール呼び出しは、件数とツール名に**まとめます**（例: `[3 tool calls: terminal, web_search]`）
- システムメッセージ、ツールの実行結果、内部の思考は**表示しません**
- 直近10往復までを表示し、それより前は「... N earlier messages ...」と**示します**
- 進行中の会話と見分けられるよう、**淡い色**で表示します

この振り返りをやめて、これまでどおり1行だけの表示にしたい場合は、`~/.hermes/config.yaml` に次のように書きます。

```yaml
display:
  resume_display: minimal   # default: full
```

:::tip
セッション ID は `YYYYMMDD_HHMMSS_<hex>` の形式です。CLI／TUI のセッションは6文字の16進数（例: `20250305_091523_a1b2c3`）、ゲートウェイのセッションは8文字（例: `20250305_091523_a1b2c3d4`）になります。ID（全体でも、重複しない先頭部分でも）でもタイトルでも再開でき、どちらも `-c` と `-r` で使えます。
:::

## プラットフォームをまたいだ引き継ぎ {#cross-platform-handoff}

CLI セッションで `/handoff <platform>` を使うと、いま進行中の会話をメッセージングプラットフォームのホームチャンネルへ移せます。エージェントは、CLI で止まっていたところからそのまま続けます。セッション ID も、発言者ごとの会話記録も、ツール呼び出しもすべて引き継がれます。

```bash
# Inside a CLI session
/handoff telegram
```

このとき起きることは次のとおりです。

1. CLI が、`<platform>` が有効になっていて、ホームチャンネルが設定されているかを確認します（移動先のチャットで一度 `/sethome` を実行して設定します）。
2. CLI はセッションを保留中にして、**ゲートウェイの応答を待ちながら問い合わせ続けます**。エージェントが応答の途中なら引き継ぎは断られるので、いまの返答が終わるまで待ってください。
3. ゲートウェイの監視処理が引き継ぎを引き受け、移動先のアダプタに新しいスレッドを作らせます。
   - **Telegram** — 新しいフォーラムトピックを開きます（そのチャットで Bot API 9.4 以降のトピックモードが有効なら DM のトピック、そうでなければフォーラム型スーパーグループのトピック）。
   - **Discord** — ホームのテキストチャンネルの下に、自動アーカイブ1440分のスレッドを作ります。
   - **Slack** — 起点となるメッセージを投稿し、その `ts` をスレッドの目印にします。
   - **WhatsApp / Signal / Matrix / SMS** — スレッド機能がないため、ホームチャンネルへそのまま送ります。
4. ゲートウェイは、移動先のキーを既存の CLI セッション ID に結び直したうえで、確認と要約を求める疑似的なユーザー発言を作ります。その返答が新しいスレッドに届きます。
5. ゲートウェイから成功の通知が返ると、CLI は `/resume` の案内を表示してきれいに終了します。

   ```
   ↻ Handoff complete. The session is now active on telegram.
     Resume it on this CLI later with: /resume my-session-title
   ```

6. これ以降、会話はそのプラットフォーム側で進みます。新しいスレッドで返信してください。そのチャンネルで権限を持つ人は同じセッションを共有しますし、あとからそのスレッドで実際のユーザーが発言しても自然に合流できます。スレッドのセッションは `user_id` を使わずにキーを決めているためです。

**CLI に戻すには:** デスクトップに戻りたくなったら、`/resume <title>`（またはシェルから `hermes -r "<title>"`）を実行すれば、プラットフォーム側で止まっていたところから続けられます。

**うまくいかないときの原因:**
- ホームチャンネルが未設定 → CLI が引き継ぎを断り、`/sethome` を案内します。
- ゲートウェイが動いていない（依頼を引き受けるものが現れない） → CLI は60秒で時間切れになり、理由をはっきり表示します。CLI のセッションはそのまま残ります。
- 転送に時間がかかる場合: ゲートウェイが引き継ぎを引き受けると、実際のエージェントのターンとしてセッション全体を流し直すため、長いセッションでは数分かかることがあります。CLI は「Still transferring...」と定期的に知らせながら最大15分待ちます。時間がかかっているだけの転送を「ゲートウェイが動いていない」と誤って報告することはありません。
- スレッドの作成に失敗（権限不足、トピックモードが無効など） → ホームチャンネルへ直接送る形に切り替わり、引き継ぎ自体は完了します。スレッドで分けられないだけです。
- `adapter.send` が失敗（レート制限や一時的な API エラー） → 引き継ぎは理由つきで失敗として記録されます。記録は消えるので、やり直せます。

**知っておきたい制限:** スレッドを作れないプラットフォームで、複数人のグループをホームチャンネルにしている場合、疑似的な発言は DM と同じ形でキーが決まります。自分あて DM をホームチャンネルにしている一般的な構成では問題ありませんが、本当に複数人で使うグループチャットには向きません。スレッドに対応しているのは Telegram / Discord / Slack で、これが大多数なので、ほとんどの構成ではこの問題に当たりません。

## セッションの名前付け {#session-naming}

セッションに人が読めるタイトルを付けておくと、探して再開するのが簡単になります。

### 自動で付くタイトル {#auto-generated-titles}

Hermes は、最初のやり取りが終わったあとに、そのセッションを短く表す3〜7語のタイトルを自動で作ります。これは軽量な補助モデルを使ってバックグラウンドのスレッドで動くので、待ち時間は増えません。自動で付いたタイトルは、`hermes sessions list` や `hermes sessions browse` でセッションを見るときに確認できます。

自動タイトルは1つのセッションにつき一度だけ動き、すでに手でタイトルを付けてある場合は動きません。

### 手でタイトルを付ける {#setting-a-title-manually}

チャットセッション（CLI でもゲートウェイでも）の中で `/title` コマンドを使います。

```
/title my research project
```

タイトルはすぐに反映されます。まだセッションがデータベースに作られていない場合（最初のメッセージを送る前に `/title` を実行した場合など）は、いったん保留され、セッションが始まった時点で適用されます。

すでにあるセッションの名前は、コマンドラインからも変更できます。

```bash
hermes sessions rename 20250305_091523_a1b2c3d4 "refactoring auth module"
```

### タイトルの決まり {#title-rules}

- **重複しないこと** — 同じタイトルのセッションを2つ作ることはできません
- **最大100文字** — 一覧の表示を見やすく保つためです
- **自動で整えられます** — 制御文字、ゼロ幅文字、右横書き用の制御文字は取り除かれます
- **ふつうの Unicode はそのまま使えます** — 絵文字、日本語や中国語、アクセント付き文字はどれも問題ありません

### 圧縮したときの自動連番 {#auto-lineage-on-compression}

セッションのコンテキストが圧縮されると（`/compress` で手動でも、自動でも）、Hermes は続きとなる新しいセッションを作ります。元のセッションにタイトルが付いていた場合、新しいセッションには自動で連番付きのタイトルが付きます。

```
"my project" → "my project #2" → "my project #3"
```

名前で再開すると（`hermes -c "my project"`）、そのつながりの中でいちばん新しいセッションが自動的に選ばれます。

### メッセージングプラットフォームでの /title {#title-in-messaging-platforms}

`/title` コマンドは、ゲートウェイのすべてのプラットフォーム（Telegram、Discord、Slack、WhatsApp）で使えます。

- `/title My Research` — セッションのタイトルを設定します
- `/title` — いまのタイトルを表示します

## セッション管理のコマンド {#session-management-commands}

Hermes には、`hermes sessions` を通じてセッションを管理する一式のコマンドがあります。

### セッションの一覧 {#list-sessions}

```bash
# List recent sessions (default: last 20)
hermes sessions list

# Filter by platform
hermes sessions list --source telegram

# Show more sessions
hermes sessions list --limit 50
```

タイトルが付いているセッションがある場合は、タイトル、冒頭のプレビュー、経過時間つきで表示されます。

```
Title                  Preview                                  Last Active   ID
────────────────────────────────────────────────────────────────────────────────────────────────
refactoring auth       Help me refactor the auth module please   2h ago        20250305_091523_a
my project #3          Can you check the test failures?          yesterday     20250304_143022_e
—                      What's the weather in Las Vegas?          3d ago        20250303_101500_f
```

タイトルが1つも付いていない場合は、もっと簡単な形式で表示されます。

```
Preview                                            Last Active   Src    ID
──────────────────────────────────────────────────────────────────────────────────────
Help me refactor the auth module please             2h ago        cli    20250305_091523_a
What's the weather in Las Vegas?                    3d ago        tele   20250303_101500_f
```

### セッションの書き出し {#export-sessions}

`hermes sessions export` は、すべての書き出し形式をひとつにまとめた窓口で、形式は `--format` で選びます。

| 形式 | 出力されるもの | 向いている用途 |
|--------|--------|------------|
| `jsonl`（既定） | セッションごとに JSON オブジェクト1つ | バックアップ、機械での読み書き |
| `md` / `qmd` | セッションごとに Markdown／Quarto ファイル1つ + 一覧ファイル | 読みやすい保管、メモ |
| `html` | 単体で完結する1ページ（複数セッションならサイドバー付き） | 共有、閲覧 |
| `trace` | Claude Code の JSONL | HF Agent Trace Viewer、`--upload` |

さらに `--only user-prompts` を使うと、プロンプトだけを取り出せます（jsonl または md）。

どの形式でも絞り込み方は共通です。1つのセッションなら `--session-id`、まとめて指定するなら `prune`／`archive` と同じ絞り込みが使えます。`--older-than` / `--newer-than` / `--before` / `--after`（`5h`・`2d`・`1w` のような期間、数字だけの日数、ISO 形式のタイムスタンプ）、`--source`、`--title`、`--model`、`--provider`、`--cwd`、`--min/--max-messages`、`--min/--max-tokens`、`--min/--max-cost`、`--min/--max-tool-calls`、`--user`、`--chat-id`、`--chat-type`、`--branch`、`--end-reason` です。`--dry-run` は、ファイルを書かずに対象だけを確認します。`--redact` は、書き出す内容から機密情報（API キー、トークン、認証情報）を伏せます。どの形式でも使えるので、人に渡す予定があるものには付けることをおすすめします。なお、まとめて指定する絞り込みは*終了済み*のセッションが対象です。絞り込みなしの `export` は、進行中のものも含めてすべてを書き出します。

#### JSONL（既定） {#jsonl-default}

```bash
# Export all sessions to a JSONL file
hermes sessions export backup.jsonl

# Export sessions from a specific platform
hermes sessions export telegram-history.jsonl --source telegram

# Export a single session
hermes sessions export session.jsonl --session-id 20250305_091523_a1b2c3d4

# Redact API keys/tokens/credentials from the exported content
hermes sessions export backup.jsonl --redact
```

書き出されたファイルは1行に JSON オブジェクト1つの形式で、セッションのメタデータとメッセージがすべて入っています。

#### HTML {#html}

`--format html` は、外部への読み込みが一切ない、単体で完結する HTML ファイルを1つ書き出します。メッセージは吹き出しの形に整えられ、ツールの出力は折りたためます。複数のセッションをまとめて書き出した場合は、セッションを切り替えるサイドバーも付きます。

```bash
# One session as a standalone HTML page
hermes sessions export --format html --session-id 20250305_091523_a1b2c3d4 transcript.html

# All Telegram sessions from the last week in one file, secrets redacted
hermes sessions export --format html --newer-than 1w --source telegram --redact archive.html
```

#### プロンプトだけ {#prompts-only}

`--only user-prompts` は、自分が書いたプロンプトだけを書き出します。アシスタントの返答も、ツールの出力も、システム側の文脈も含みません。プロンプト集を作りたいときや、自分が何を尋ねたか見返したいときに便利です。

```bash
# One JSONL record per prompt (session id, index, timestamp, text)
hermes sessions export prompts.jsonl --session-id 20250305_091523_a1b2c3d4 --only user-prompts

# Markdown, straight to stdout
hermes sessions export - --session-id 20250305_091523_a1b2c3d4 --only user-prompts --format md
```

`--format jsonl`（既定）と `md` で使え、まとめて書き出すときの絞り込みも同じように効き、`--redact` とも組み合わせられます。

#### トレース（HF Agent Trace Viewer） {#traces-hf-agent-trace-viewer}

`--format trace` は Claude Code の JSONL を出力します。これは Hugging Face Hub が [Agent Trace Viewer](https://huggingface.co/docs/hub/agent-traces) 用に自動で認識してくれる会話記録の形式です。ローカルに書き出すこともできますし、`--upload` を付ければ自分の非公開 `hermes-traces` データセットへ送れます（`HF_TOKEN` を読みます）。

```bash
# Trace of the most recent session, to stdout
hermes sessions export --format trace

# One session to a local trace file
hermes sessions export --format trace --session-id 20250305_091523_a1b2c3d4 trace.jsonl

# Upload straight to your private HF traces dataset
hermes sessions export --format trace --session-id 20250305_091523_a1b2c3d4 --upload
```

トレースの書き出しは、既定で機密情報を伏せます（外に出すことを前提にした形式のためです）。自分で内容を確認したうえで伏せたくない場合は `--no-redact` を使います。`--upload` は、`--public` を付けないかぎり非公開です。絞り込みを使ってまとめて書き出すと、セッションごとに `<id>.trace.jsonl` が1つずつ作られます。

#### Markdown / QMD {#markdown-qmd}

古いセッションを隠したり削除したりする前に、読みやすい形でファイルに残しておきたいときは `--format md` か `--format qmd` を使います。Markdown／QMD での書き出しは、セッションごとに1ファイルをディレクトリ（既定では `~/.hermes/session-exports`）へ書き出します。

```bash
# Export one session to Markdown
hermes sessions export --format md --session-id 20250305_091523_a1b2c3d4

# Export a compression lineage as one logical document
hermes sessions export --format md --session-id 20250305_091523_a1b2c3d4 --lineage logical

# Preview ended sessions older than 90 days without writing files
hermes sessions export --format md --older-than 90 --dry-run

# Export ended Telegram sessions older than 2 weeks to QMD files
hermes sessions export --format qmd --older-than 2w --source telegram

# Export long Claude sessions, secrets redacted
hermes sessions export --format md --model sonnet --min-messages 50 --redact

# Only after verification, export and delete one explicitly named session
hermes sessions export --format md --session-id 20250305_091523_a1b2c3d4 --delete-after-verified --yes
```

Markdown／QMD での書き出しでは、セッションごとに `.md` または `.qmd` ファイルが1つ作られ、あわせて `manifest.jsonl` にファイルパス、メッセージ数、つながりのある ID、SHA-256 が記録されます。まとめて書き出すときは絞り込みを1つ以上指定する必要があり、条件なしのまとめ書き出しは断られます。`--delete-after-verified` は意図的に `--session-id` のときだけ使えるようにしてあり、`--yes` も必要です。親のセッションを削除すると、そこにぶら下がる委任先・サブエージェントのセッションも消えるため、このモードでは削除の前に各委任先を別ファイルへ書き出して内容を確認します。書き出しの途中で委任先の顔ぶれが変わった場合、削除は行われません。`--redact` は、書き出す前にメッセージの本文とツールの出力から機密情報（API キー、トークン、認証情報）を伏せます。人に渡す予定のある書き出しには付けることをおすすめします。

### セッションを削除する {#delete-a-session}

```bash
# Delete a specific session (with confirmation)
hermes sessions delete 20250305_091523_a1b2c3d4

# Delete without confirmation
hermes sessions delete 20250305_091523_a1b2c3d4 --yes
```

### セッションの名前を変える {#rename-a-session}

```bash
# Set or change a session's title
hermes sessions rename 20250305_091523_a1b2c3d4 "debugging auth flow"

# Multi-word titles don't need quotes in the CLI
hermes sessions rename 20250305_091523_a1b2c3d4 debugging auth flow
```

そのタイトルを別のセッションがすでに使っている場合は、エラーが表示されます。

### セッションをピン留めする {#pin-a-session}

ピン留めをすると「残しておく」という印が付きます。ピン留めしたセッションは
`sessions.auto_archive` による古いセッションの自動整理の対象から外れ、一覧にも必ず表示されます。
これはデスクトップ版のサイドバーにある「ピン留め」欄と同じ印なので、どちらから
ピン留めしても両方に反映されます。

```bash
# Pin one or more sessions (unique ID prefixes work)
hermes sessions pin 20250305_091523_a1b2c3d4
hermes sessions pin 20250305 20250306

# Remove the pin
hermes sessions unpin 20250305_091523_a1b2c3d4

# List pinned sessions
hermes sessions pinned

# Machine-readable output, e.g. for a nightly backup of your pin set
hermes sessions pinned --json > pinned-sessions.json
```

### 古いセッションを整理する {#prune-old-sessions}

```bash
# Delete ended sessions inactive for 90 days (default)
hermes sessions prune

# Custom age threshold — bare numbers are days
hermes sessions prune --older-than 30

# Durations work too: 5h, 30m, 2d, 1w
hermes sessions prune --older-than 12h

# Delete only a specific time window (e.g. a batch of test sessions
# created in the last 5 hours)
hermes sessions prune --newer-than 5h

# Explicit window with absolute timestamps
hermes sessions prune --after "2026-07-05 09:00" --before "2026-07-05 14:30"

# Only prune sessions from a specific platform (all ages — any filter
# disables the implicit 90-day default)
hermes sessions prune --source telegram
hermes sessions prune --source cron --older-than 60   # add a time flag to narrow

# More filters — all AND together
hermes sessions prune --newer-than 5h --title "smoke test"   # title substring
hermes sessions prune --older-than 30 --max-messages 3        # tiny sessions
hermes sessions prune --cwd ~/scratch --end-reason done       # by cwd / end reason
hermes sessions prune --model gpt-5 --older-than 1w           # by model (substring)
hermes sessions prune --provider openrouter --older-than 60   # by billing provider
hermes sessions prune --branch feature/old-experiment         # by git branch
hermes sessions prune --user 12345678 --chat-type group       # by messaging origin
hermes sessions prune --max-tokens 500 --older-than 7         # by token usage
hermes sessions prune --max-cost 0.01 --max-tool-calls 0      # cheap, tool-less runs

# Preview what would be deleted, without deleting anything
hermes sessions prune --newer-than 5h --dry-run

# Skip confirmation
hermes sessions prune --older-than 30 --yes
```

時間を指定する値（`--older-than`、`--newer-than`、`--before`、`--after`）には、
期間（`5h`、`30m`、`2d`、`1w`）、数字だけの日数、ISO 形式のタイムスタンプ
（`2026-07-05`、`2026-07-05 14:30`）が使えます。`--older-than`／`--before` は
上限を、`--newer-than`／`--after` は下限を決めます。`--older-than`／`--newer-than`
の組は最後のメッセージの時刻を見ます（メッセージがないセッションはセッション開始時刻で
判断します）。`--before`／`--after` は、はっきりセッションの開始時刻を見ます。
どちらの組でも、2つ合わせれば期間を区切れます。

属性で絞り込むには、`--source`（プラットフォーム、完全一致）、`--title` / `--model` /
`--branch`（大文字小文字を区別しない部分一致）、`--provider`（課金プロバイダ、
完全一致）、`--end-reason`、`--user`、`--chat-id`、`--chat-type`（完全一致）、
`--cwd`（パスの先頭一致）が使えます。数値の範囲指定には `--min/--max-messages`、
`--min/--max-tokens`（入力＋出力）、`--min/--max-cost`（USD、実額がなければ
見積額）、`--min/--max-tool-calls` があります。絞り込みを1つでも使うと、暗黙の
90日という既定は外れます。そのため `hermes sessions prune --source cron` や
`--model gpt-4o` はすべての期間が対象になります。範囲を狭めたいときは時間の
指定を足してください。90日という区切りが残るのは、何も付けない
`hermes sessions prune` だけです。`--yes` を付けない実行では必ず、対象の件数と、
そのうちいちばん古いセッションと新しいセッションが表示されてから確認を求められます。

アーカイブ済みのセッションは既定で対象外です。これも削除したい場合は
`--include-archived` を渡してください。

:::info
整理の対象になるのは**終了済み**のセッション（明示的に終了したもの、または自動でリセットされたもの）だけです。進行中のセッションが整理されることはありません。
:::

### セッションをまとめてアーカイブする {#bulk-archive-sessions}

何も削除せずに一覧から外したいだけなら、`hermes sessions archive` を使います。
`prune` と同じ絞り込みが使えますが、該当するセッションを削除せずに隠します
（デスクトップ版やダッシュボードの画面で1件ずつアーカイブするのと同じ印を付けるだけで、
メッセージも検索も残ります）。

```bash
# Archive everything from the last 5 hours (e.g. 75 CI smoke-test sessions)
hermes sessions archive --newer-than 5h

# Archive by title substring, preview first
hermes sessions archive --title "dry run" --dry-run
hermes sessions archive --title "dry run" --yes
```

絞り込みは1つ以上必要です。何も付けない `hermes sessions archive` は、
履歴をまるごとアーカイブしてしまわないように断られます。アーカイブしたセッションは
`hermes sessions list` と `/resume` から見えなくなりますが、データベースには残っており、
デスクトップ版やダッシュボードのセッション一覧から元に戻せます。

### セッションの統計 {#session-statistics}

```bash
hermes sessions stats
```

出力例:

```
Total sessions: 142
Total messages: 3847
  cli: 89 sessions
  telegram: 38 sessions
  discord: 15 sessions
Database size: 12.4 MB
```

トークンの使用量、費用の見積もり、ツールごとの内訳、活動の傾向といったもっと詳しい分析には、[`hermes insights`](/hermes/docs/reference/cli-commands/#hermes-insights) を使ってください。

### 迷子になったゲートウェイのセッションを直す {#repair-stranded-gateway-sessions}

再起動したあとに、ゲートウェイでの会話が「時間をさかのぼった」ように見えることが
あります。最近のやり取りがなかったかのように、何日も前の話題から再開してしまう
状態です。このとき、進行中の会話は、宛先の情報を失ったセッションの行に取り残されて
いるかもしれません（v0.21 のセッション継続性の改修で直された種類の不具合です。
いまのバージョンでは構造的に起きないようになっており、実行中に自動で修復されます）。

`hermes sessions repair-routing` は、メッセージを持っているのに宛先の情報がない
セッションの行を探し、それぞれを続きであるはずの会話につなぎ直します。ただし、
証拠がはっきりしている場合にかぎります。

```bash
# Report only — shows each orphan, the proposed adoption, and the evidence
hermes sessions repair-routing

# Perform the adoptions (stop the gateway first — a running gateway holds
# the old routing in memory and would write it back over the repair)
hermes sessions repair-routing --apply

# Widen/narrow the contiguity window (default 900 seconds)
hermes sessions repair-routing --max-gap-seconds 300
```

判断の根拠は次の2つです。

- **系譜** — 迷子になった行の `parent_session_id` が、同じプラットフォームの
  宛先情報を持つ行を指している場合（記録に残った事実なので、時間の条件はありません）
- **連続性** — 同じプラットフォームで宛先情報を持つ行が、迷子の行が始まる前後の
  一定時間内にちょうど1つだけ途絶えている場合

はっきりしないもの（候補が2つある、同じ相手を2つの行が主張しているなど）は、
理由を添えて報告するだけで手を付けません。つなぎ間違えると、ある会話が別のチャットへ
接ぎ木されてしまうからです。置き換えられた行は `superseded_by_repair` として
退けられるので、再起動時の復元でよみがえることはありません。

この修復は、あえて**自動では行いません**。そのチャットにすでに2つめの履歴が
できている場合、どちらの続きとするかを決めるのはあなたです。取り残された会話は
どちらにしても `/resume` とセッション検索から読めますし、修復が変えるのは
宛先の情報だけです。先にバックアップを取ってください
（`cp ~/.hermes/state.db ~/.hermes/state.db.bak`）。

## Claude Code と Codex CLI からセッションを取り込む {#importing-sessions-from-claude-code-and-codex-cli}

別のエージェント CLI で会話を始めていたなら、それを Hermes に取り込んで続きから
進められます。Hermes は Claude Code のセッションログ（`~/.claude/projects/`）と
Codex CLI のロールアウト（`~/.codex/sessions/`）を読みます。取り込み元のファイルは
読むだけで、書き換えることはありません。

```bash
# Interactive picker across both tools, newest first
hermes sessions import

# Limit to one tool, or point at a specific file
hermes sessions import --from claude
hermes sessions import --from codex ~/.codex/sessions/2026/08/15/rollout-....jsonl

# Import-and-resume in one step
hermes --resume @claude
hermes --resume @codex
```

`hermes sessions import` は、`Imported from Claude Code: <first user message>`
（Codex CLI の場合はそちらの名前）というタイトルで新しい Hermes のセッションを作り、
その ID と、そのまま貼り付けて使える `hermes --resume <id>` コマンドを表示します。
`--resume @claude` / `--resume @codex` は同じ選択画面を出し、取り込んだ会話へ
そのまま入ります。

取り込まれるのは、順番どおりのユーザーとアシスタントの会話です。ツールの動きは
アシスタントの発言の中に `[ran tool: …]` という短いメモとしてまとめられます。
システムプロンプト、差し込まれた文脈、思考の記録、ツールの生の出力は取り込まれません。
取り込みは、1バイトずつの再現ではなく、読みやすい会話記録を作るものです。

## セッション検索ツール {#session-search-tool}

エージェントには `session_search` というツールが組み込まれており、SQLite の FTS5 エンジンを使って過去のすべての会話を全文検索できます。さらに、見つけたセッションの中を前後にたどることもできます。このツールは LLM を一切呼ばず、要約を作るのではなくデータベースにある実際のメッセージを返します。

### 4つの呼び出し方 {#four-calling-shapes}

このツールは、どの引数を指定したかで何をしたいのかを判断します。`mode` のようなパラメータはありません。

**1. 探す — `query` を渡す:**

```python
session_search(query="auth refactor", limit=3)
```

FTS5 で検索し、セッションのつながりごとに重複を取り除いて、上位 N 件のセッションを返します。探すときの詳しさは既定で自動調整されます。いちばん順位の高い結果には前後の文脈と会話の冒頭・末尾が付き、それより下の結果は簡潔なままです。すべての結果を詳しく取りたい場合は `detail="full"` を渡します。

それぞれの結果には次のものが含まれます。

- `session_id`、`title`、`when`、`source`
- `snippet` — FTS5 が一致箇所を強調した抜粋
- `detail` — `full` または `compact`
- `bookend_start` / `bookend_end` — 詳しい結果では、最初と最後のユーザー＋アシスタントのメッセージ3件ずつ。簡潔な結果では空のリスト
- `messages` — 詳しい結果では FTS5 の一致箇所の前後±5件。簡潔な結果では印を付けた基準のメッセージのみ
- `match_message_id`、`messages_before`、`messages_after`

いちばん上の結果を見れば、目的 → 一致箇所 → 結末をすぐにたどれます。簡潔に表示された別の結果のほうが良さそうなら、そのセッション ID とメッセージ ID を使って、たどる呼び出し方に切り替えます。実際のセッションのデータベースで、かかる時間はおおむね数十ミリ秒です。

**2. たどる — `session_id` と `around_message_id` を渡す:**

```python
session_search(session_id="20260510_174648_805cc2", around_message_id=590803, window=10)
```

基準のメッセージを中心に、前後 `window` 件ずつを返します。FTS5 も冒頭・末尾も使わず、その範囲だけを返します。探す呼び出しのあと、既定の±5件より広く見たいときに使います。

- **前へ進む**には、`messages[-1].id` を `around_message_id` として渡します
- **後ろへ戻る**には、`messages[0].id` を `around_message_id` として渡します
- 境目のメッセージは両方の範囲に現れ、位置の目印になります
- `messages_before` や `messages_after` が `window` より少なければ、セッションの先頭か末尾に達しています

かかる時間の目安は、1回あたり1〜2ミリ秒です。

**3. 読む — 基準を付けずに `session_id` を渡す:**

```python
session_search(session_id="20260510_174648_805cc2")
```

セッション全体を返します。大きなセッションの場合は、先頭と末尾に絞った表示になります。この呼び出し方は、`@session:<profile>/<id>` というリンクをたどるときにも使われます。

**4. 眺める — 引数なし:**

```python
session_search()
```

最近のセッションを時系列で返します（タイトル、冒頭のプレビュー、日時）。話題を挙げずに「何をやっていたっけ」と聞かれたときに便利です。

### FTS5 の検索構文 {#fts5-query-syntax}

キーワード検索では、FTS5 の標準的な構文がそのまま使えます。

- 単純なキーワード: `docker deployment`（FTS5 は既定で AND 検索）
- フレーズ: `"exact phrase"`
- 論理演算: `docker OR kubernetes`、`python NOT java`
- 前方一致: `deploy*`

### 追加のパラメータ {#optional-parameters}

- `sort` — FTS5 の順位付けに加えて `newest` か `oldest` を指定します。省略すると関連度だけで並びます（既定。あてもなく思い出したいときに向いています）。「X はどこまでやったか」なら `newest`、「X はどう始まったか」なら `oldest` を使ってください。
- `detail` — `adaptive`（既定）は探す呼び出しの最上位の結果だけを詳しく取り、`full` はすべての結果を詳しく取ります。
- `role_filter` — 含める役割をカンマ区切りで指定します。探す呼び出しの既定は `user,assistant` です（ツールの出力はたいてい雑音になるためです）。ツールの出力も含めたいときは `user,assistant,tool`（ツールの挙動を調べるとき）、ツールの出力だけを検索したいときは `tool` を渡します。

### どんなときに使われるか {#when-its-used}

エージェントは、次のような指示によってセッション検索を自動的に使うよう促されています。

> *"When the user references something from a past conversation or you suspect relevant prior context exists, use session_search to recall it before asking them to repeat themselves."*

よくあるきっかけは、「前にもやった」「あのときの」「この前」「さっき言ったとおり」といった言い方や、いまの会話に出ていないプロジェクト・人・概念への言及です。

## プラットフォームごとのセッション追跡 {#per-platform-session-tracking}

### ゲートウェイのセッション {#gateway-sessions}

メッセージングプラットフォームでは、セッションはメッセージの送信元から決まるセッションキーで管理されます。

| チャットの種類 | 既定のキーの形 | 動き |
|-----------|--------------------|----------|
| Telegram の DM | `agent:main:telegram:dm:<chat_id>` | DM のチャットごとに1つのセッション |
| Discord の DM | `agent:main:discord:dm:<chat_id>` | DM のチャットごとに1つのセッション |
| WhatsApp の DM | `agent:main:whatsapp:dm:<canonical_identifier>` | DM の相手ごとに1つのセッション（対応関係がわかる場合、LID と電話番号の別名は1つの識別子にまとめられます） |
| グループチャット | `agent:main:<platform>:group:<chat_id>:<user_id>` | プラットフォームがユーザー ID を出す場合、グループの中でも参加者ごとに分かれます |
| グループのスレッド／トピック | `agent:main:<platform>:group:<chat_id>:<thread_id>` | スレッドの参加者全員で1つのセッションを共有します（既定）。`thread_sessions_per_user: true` にすると参加者ごとに分かれます。 |
| チャンネル | `agent:main:<platform>:channel:<chat_id>:<user_id>` | プラットフォームがユーザー ID を出す場合、チャンネルの中でも参加者ごとに分かれます |

複数人のチャットで参加者を識別できない場合、Hermes はその部屋で1つのセッションを共有する形に切り替えます。

### グループのセッションを共有するか分けるか {#shared-vs-isolated-group-sessions}

Hermes は既定で `config.yaml` の `group_sessions_per_user: true` を使います。これは次のことを意味します。

- Alice と Bob が同じ Discord チャンネルで Hermes と話しても、互いの会話記録は混ざりません
- 誰かがツールを多用する長い作業をしても、他の人のコンテキストを圧迫しません
- 実行中のエージェントのキーが分かれたセッションのキーと一致するため、中断の扱いも人ごとに分かれます

代わりに「部屋にひとつの頭脳」を持たせたい場合は、次のように設定します。

```yaml
group_sessions_per_user: false
```

これでグループやチャンネルは、部屋ごとに1つの共有セッションへ戻ります。会話の文脈を全員で共有できますが、トークンの費用、中断の状態、コンテキストの増え方も共有することになります。

### セッションのリセット方針 {#session-reset-policies}

**ゲートウェイのセッションは、既定では自動リセットされません**（`mode: none`）。自動リセットを使いたい場合は、`config.yaml` の `session_reset` の項目で設定します。

- **none** — 自動リセットしない（既定。コンテキストは `/reset` と圧縮で管理します）
- **idle** — 何も操作がないまま N 分たったらリセットする
- **daily** — 毎日決まった時刻にリセットする
- **both** — idle と daily のうち、先に来たほうでリセットする

セッションが自動リセットされる前に、エージェントには会話から大事な記憶やスキルを保存するためのターンが1回与えられます。

**バックグラウンドの処理が動いている**セッションは、方針にかかわらず自動リセットされません。

### 落ちたときや再起動したあとの継続性 {#continuity-after-crashes-and-restarts}

ゲートウェイでのチャットは、**ひとつながりのセッション**として設計されています。
大きくなるたびに何度も圧縮されながら、`/new`（または `/reset`）を明示的に実行するまで
続きます。これは、ゲートウェイが落ちたとき、再起動したとき、更新したときも変わりません。

- セッションの識別情報（宛先のキー、チャット、送信元）は、セッションの行を作るとき
  すべての経路（`/new`、最初のメッセージ、`/branch` による子セッション）で
  **不可分に**書き込まれます。もしこの書き込みに失敗しても、次のターンで宛先情報が
  更新される際に自動で修復されます。
- 再起動したあと、ゲートウェイは各チャットを、**実際のやり取りが**いちばん新しい
  セッションに結び直します。古くて使われていない行が、実際に続けていた会話に
  勝つことはありません。
- 復元は **`/new` の区切りを尊重します**。あるチャットで最後に起きたことが意図的な
  リセットだった場合、復元はその区切りをまたいで古いセッションをよみがえらせるのでは
  なく、新しく始めます。復元されたセッションは実際の放置時間も保つので、idle や daily の
  リセット方針を使っている場合も、復元したものを新品扱いせずに正しく適用されます。

## 保存場所 {#storage-locations}

| 対象 | パス | 説明 |
|------|------|-------------|
| SQLite データベース | `~/.hermes/state.db` | すべてのセッションのメタデータとメッセージ（FTS5 付き） |
| ゲートウェイのメッセージ    | `~/.hermes/state.db`   | SQLite。すべてのセッションのメッセージの正本です |
| ゲートウェイの宛先索引 | `~/.hermes/state.db` の `gateway_routing` テーブル | セッションキーと有効なセッション ID の対応（送信元のメタデータ、期限の情報） |
| 旧式の宛先ミラー | `~/.hermes/sessions/sessions.json` | 宛先索引の後方互換用のミラー。`gateway.write_sessions_json: true`（既定）のときに書き出されます |

SQLite データベースは、読み手が同時に複数、書き手は1つという WAL モードで動きます。これは、複数のプラットフォームを扱うゲートウェイの構造によく合っています。

:::warning `sessions.json` はセッション一覧ではありません
ゲートウェイの宛先索引は、`state.db` の中の `gateway_routing` テーブルにあります。
`~/.hermes/sessions/sessions.json` はその**旧式のミラー**で、後方互換のために
残されています（`gateway.write_sessions_json: false` で無効にできます）。
このファイルは、メッセージングのセッションキー（`agent:main:<platform>:...`）と
有効なセッション ID の対応を持っています。
中身はゲートウェイ／メッセージングの項目だけなので、メッセージングプラットフォームを
使っていれば、そのぶんしか見えません（例: `agent:main:whatsapp:dm:...`）。

これは**そういうもの**であって、CLI のセッションが失われたわけでは**ありません**。
`hermes sessions list`、`/sessions`、ダッシュボードはどれも `state.db` を読んでおり、
そこには CLI、TUI、ゲートウェイの**すべての**セッションが入っています。
`~/.hermes/sessions/saved/*.json` にある `/save` のスナップショットは、
索引ではなく便利のための書き出しです。

本当に CLI のセッションが `hermes sessions list` に出てこない場合は、`state.db` に
届いていないことが原因です。`hermes sessions repair` を実行し、CLI の起動時に
`⚠ Session store unavailable` の警告が出ていないか確認してください。この警告は、
その実行で SQLite への保存が失敗したことを意味します。
:::

:::note 旧式の JSONL 会話記録
state.db が正本になる前に作られたセッションでは、`~/.hermes/sessions/` に
`*.jsonl` ファイルが残っていることがあります。これらはもう Hermes が
書くことも読むこともありません。対応するセッションが state.db にあることを
確かめたうえで、削除してかまいません。
:::

### データベースの構造 {#database-schema}

`state.db` の主なテーブルは次のとおりです。

- **sessions** — セッションのメタデータ（id、source、user_id、model、title、タイムスタンプ、トークン数）。タイトルには重複を許さない索引が付いています（NULL は許され、NULL でないものだけが重複してはいけません）。
- **messages** — メッセージ履歴の全文（role、content、tool_calls、tool_name、token_count）
- **messages_fts** — メッセージ本文を全文検索するための FTS5 仮想テーブル

## セッションの期限と後片付け {#session-expiry-and-cleanup}

### 自動の後片付け {#automatic-cleanup}

- ゲートウェイのセッションは、設定したリセット方針に従って自動リセットされます
- リセットの前に、エージェントはそのセッションから記憶とスキルを保存します
- 自動整理は任意で有効にできます。`sessions.auto_prune` を `true` にすると、終了済みで `sessions.retention_days`（既定90日）のあいだ動きのないセッションが、CLI やゲートウェイの起動時に整理されます
- 実際に行が削除された整理のあとは、前回の `VACUUM` の成功から `sessions.min_vacuum_interval_days`（既定30日）以上たっていれば `state.db` を `VACUUM` してディスク領域を取り戻します（SQLite は、ふつうに DELETE しただけではファイルが小さくなりません）
- 整理は `sessions.min_interval_hours`（既定24時間）につき最大1回だけ動きます。前回の実行時刻は `state.db` 自身の中に記録されるので、同じ `HERMES_HOME` を使うすべての Hermes のプロセスで共有されます

既定では**無効**です。セッションの履歴は `session_search` で思い出すための貴重な材料であり、黙って消すとユーザーを驚かせてしまうからです。有効にするには `~/.hermes/config.yaml` に次のように書きます。

```yaml
sessions:
  auto_prune: true          # opt in — default is false
  retention_days: 90        # keep ended sessions active within this window
  vacuum_after_prune: true  # reclaim disk space after a pruning sweep
  min_vacuum_interval_days: 30 # don't rewrite the DB more often than this
  min_interval_hours: 24    # don't re-run the sweep more often than this
```

進行中のセッションは、どれだけ古くても自動整理されません。終了済みのセッションは
最後のメッセージからの経過時間で判断されるので、始まったのが保存期間より前でも、
最近まで使っていた長い会話が消されることはありません。

### 手動の後片付け {#manual-cleanup}

```bash
# Prune sessions older than 90 days
hermes sessions prune

# Delete a specific session
hermes sessions delete <session_id>

# Export before pruning (backup)
hermes sessions export backup.jsonl
hermes sessions prune --older-than 30 --yes
```

:::tip
データベースが大きくなるのはゆっくりで（目安は数百セッションで10〜15 MB）、セッションの履歴は過去の会話を `session_search` で思い出すための土台になるため、自動整理は無効の状態で配布されています。ゲートウェイや cron を酷使する使い方をしていて、`state.db` が実際に動作を重くしている場合には有効にしてください（報告されている例: 約1000セッションで384 MB になった state.db が、FTS5 への書き込みと `/resume` の一覧表示を遅くしていた）。自動の整理を有効にせず一度だけ片付けたいときは、`hermes sessions prune` を使ってください。
:::
