---
title: "セッション"
description: "セッションの保存、再開、検索、管理、そしてプラットフォームごとのセッションの追い方"
upstream_path: user-guide/sessions.md
upstream_blob: bd9768d5ec7c61266c19f507b48a9f348d77f8e6
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/sessions
---

# セッション {#sessions}

Hermes Agent は、すべての会話を自動でセッションとして保存します。セッションがあるおかげで、会話の再開、セッションをまたいだ検索、会話履歴の管理ができます。

## セッションのしくみ {#how-sessions-work}

CLI、Telegram、Discord、Slack、WhatsApp、Signal、Matrix、Teams、その他どのメッセージングプラットフォームからの会話でも、すべてメッセージ履歴を丸ごと持つセッションとして保存されます。セッションは次の場所で管理されます。

1. **SQLite データベース**（`~/.hermes/state.db`）— 構造化されたセッションの情報と FTS5 の全文検索、それにメッセージ履歴の全体

SQLite データベースには次のものが入っています。

- セッション ID、送信元プラットフォーム、ユーザー ID
- **セッションのタイトル**（重複しない、人が読める名前）
- モデル名と設定
- システムプロンプトのその時点の内容
- メッセージ履歴の全体（役割、本文、ツール呼び出し、ツールの結果）
- トークン数（入力・出力）
- 時刻（started_at、ended_at）
- 親セッションの ID（圧縮によってセッションが分かれたとき用）

### 文脈に数えられるもの {#what-counts-toward-context}

Hermes は会話を再開できるようセッション履歴を保存しますが、これまで扱った
すべてのバイトを毎回送り直すわけではありません。各ターンでモデルが見るのは、
選ばれたシステムプロンプト、いまの会話の窓、そしてそのターンのために
Hermes が明示的に差し込んだ内容だけです。

添付されたメディアは、そのターン限りの入力として扱われます。

- 画像は、次のモデル呼び出しにそのまま添付されることもあれば、使っている
  モデルが画像入力に対応していない場合はあらかじめ文章での説明に変換されます。
- 音声は、音声認識を設定していれば文字起こしされます。
- テキスト文書は抽出した文章を含められます。それ以外の種類の文書はたいてい、
  保存したローカルのパスと短いメモで表されます。
- 添付ファイルのパスや、抽出・変換されたテキストは会話の記録に残りますが、
  画像・音声・バイナリファイルそのもののバイト列が、その後のプロンプトへ
  繰り返し複製されることはありません。

たとえば画像を送って「これでミームを作って」と頼んだ場合、Hermes はその画像を
一度だけ画像認識で確かめ、画像処理のスクリプトを走らせるかもしれません。
以降のターンが、もとの JPEG を自動的に文脈へ持ち込むことはありません。
残るのは会話に書き込まれたもの、つまり依頼の文面、短い画像の説明、
ローカルのキャッシュのパス、最後のアシスタントの応答だけです。

文脈が膨らむいちばんの原因は、メディアファイルそのものではありません。
文字数の多いテキストです。貼り付けた会話記録、ログの全文、大きなツール出力、
長い差分、繰り返される状況報告、細かい証拠の書き出し。大きな成果物を
チャットへ丸ごと写すより、要約・ファイルのパス・必要な部分の抜粋・
ツールを使った参照を選んでください。

:::tip
セッションが長くなったら `/compress`、新しい流れにしたいときは `/new` を使い、
`hermes sessions prune` は、終了したセッションを保存領域から本当に消したいときだけ
使ってください。`state.db` が大きくなっただけなら、まず消さずに済む方法から
試します。`hermes sessions optimize` は、セッションのデータには一切触れずに
FTS5 のインデックスの断片をまとめ、データベースを VACUUM します。圧縮は動いている文脈を小さくするもので、privacy のための削除ではありません。
`/new` に名前を渡す（例: `/new payments-refactor`）と、新しいセッションの
最初のタイトルをその場で決められます。あとから `/resume <name>` や
`/sessions` の一覧で探すときに便利です。
:::

### セッションの送信元 {#session-sources}

セッションには、それぞれ送信元のプラットフォームの印が付きます。

| 送信元 | 説明 |
|--------|-------------|
| `cli` | 対話形式の CLI（`hermes` または `hermes chat`） |
| `telegram` | Telegram |
| `discord` | Discord のサーバーや DM |
| `slack` | Slack のワークスペース |
| `whatsapp` | WhatsApp |
| `signal` | Signal |
| `matrix` | Matrix のルームと DM |
| `mattermost` | Mattermost のチャンネル |
| `email` | メール（IMAP / SMTP） |
| `sms` | Twilio 経由の SMS |
| `dingtalk` | DingTalk |
| `feishu` | Feishu / Lark |
| `wecom` | WeCom（WeChat Work） |
| `weixin` | Weixin（個人向け WeChat） |
| `bluebubbles` | macOS の BlueBubbles サーバー経由の Apple iMessage |
| `qqbot` | 公式 API v2 経由の QQ Bot（Tencent QQ） |
| `homeassistant` | Home Assistant の会話 |
| `webhook` | 受信した webhook |
| `api-server` | API サーバーへのリクエスト |
| `acp` | ACP のエディター連携 |
| `cron` | 定期実行の cron |
| `batch` | まとめて処理する実行 |

## CLI でのセッション再開 {#cli-session-resume}

CLI では `--continue` か `--resume` で前の会話を再開します。

### 直前のセッションを続ける {#continue-last-session}

```bash
# Resume the most recent CLI session
hermes --continue
hermes -c

# Or with the chat subcommand
hermes chat --continue
hermes chat -c
```

これは SQLite データベースからいちばん新しい `cli` セッションを探し、その会話履歴を丸ごと読み込みます。

#### 端末ごとに続ける {#per-terminal-continue}

引数なしの `-c` は、どの端末で動いているかを見ます。CLI のセッションは、実行中の端末（tty デバイス、tmux のペイン、kitty のウィンドウ、wezterm のペイン、Zellij のペイン、Windows Terminal のセッションなど）をキーにした小さな目印ファイルを `~/.hermes/terminal-sessions/` に置きます。*同じ*端末でもう一度 `hermes -c` を実行すると、Hermes はその端末自身のセッションを再開します。つまり 2 つのペインを並べていても、両方が全体でいちばん新しいセッションを取り合うのではなく、それぞれ自分の会話を続けられます。その端末の目印がない場合（初回、セッションを消したあと、30 日より古い目印）は、`-c` はいちばん新しいセッションを使う動きに戻ります。`-c "name"` と `--resume` はこの影響を受けません。`config.yaml` の `session.terminal_continue: false` で無効にできます。

### 名前で再開する {#resume-by-name}

セッションにタイトルを付けていれば（後述の[セッションの名前付け](#session-naming)を参照）、名前で再開できます。

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

セッション ID は CLI セッションを抜けるときに表示され、`hermes sessions list` でも確かめられます。

:::note
`latest` は `--resume` の予約語です。タイトルがまさに「latest」のセッションも、ID を指定するか `-c latest`（タイトルとの照合）で開けます。
:::

### 特定のディレクトリで再開する {#resume-in-a-specific-directory}

`--in <dir>` を渡すと、開始または再開の前にそのディレクトリへ移動します。`--resume latest`（または `-c`）と組み合わせると、そのディレクトリの作業場所に属するいちばん新しいセッションが選ばれます。先に `cd` する必要も、セッション ID を覚えておく必要もありません。

```bash
# Resume the latest session that belongs to ./my-project
hermes --resume latest --in ./my-project

# Works with the TUI too
hermes --tui --resume latest --in ./my-project
```

`--in` は、そのセッションをそのディレクトリに固定もします。再開したセッションに記録されていた作業ディレクトリは復元されません（`--no-restore-cwd` を渡したときと同じです）。

### 再開すると作業ディレクトリも戻ります {#resume-restores-the-working-directory}

CLI セッションを再開すると、そのセッションに記録された作業ディレクトリ（git リポジトリのルートやプロジェクトのディレクトリ）へ `cd` も行われるので、会話は元の作業場所から続きます。いまの場所にとどまりたいときは `--no-restore-cwd` を渡します。

```bash
hermes --resume 20250305_091523_a1b2c3 --no-restore-cwd
```

移動したことは `↪ restored workspace dir: …` の行で分かります。復元に失敗しても、再開そのものが壊れることはありません。

### 作業場所でセッションを絞り込む {#filtering-sessions-by-workspace}

`hermes sessions list` は `--workspace <needle>` を受け取り、作業場所のキー（git リポジトリのルート、なければカレントディレクトリ）が一致するセッションだけを表示します。照合はパスの部分一致か、ディレクトリ名そのものの一致です。

```bash
hermes sessions list --workspace my-project
hermes sessions list --workspace ~/code/hermes-agent
```

### 再開したときの会話の振り返り {#conversation-recap-on-resume}

セッションを再開すると、入力を求める前に、Hermes が直前までの会話の要点を整った枠の中にまとめて表示します。

![Hermes のセッションを再開したときに出る「Previous Conversation」の振り返り枠を図案化したもの。](https://hermes-agent.nousresearch.com/img/docs/session-recap.svg)
*再開したときは、直近のユーザーとアシスタントのやり取りをまとめた枠を出してから、入力できる状態に戻します。*

この振り返りは次のように表示されます。

- **ユーザーのメッセージ**（金色の `●`）と**アシスタントの応答**（緑の `◆`）を出します
- 長いメッセージは**切り詰め**ます（ユーザーは 300 文字、アシスタントは 200 文字 / 3 行）
- ツール呼び出しは、件数とツール名に**まとめ**ます（例: `[3 tool calls: terminal, web_search]`）
- システムメッセージ、ツールの結果、内部の思考は**隠し**ます
- 直近 10 往復を**上限**とし、それより前は「... N earlier messages ...」と示します
- いま進行中の会話と見分けが付くよう、**淡い表示**にします

この振り返りをやめて、1 行だけの簡素な表示に戻すには `~/.hermes/config.yaml` に次を書きます。

```yaml
display:
  resume_display: minimal   # default: full
```

:::tip
セッション ID は `YYYYMMDD_HHMMSS_<hex>` の形です。CLI と TUI のセッションは 6 桁の 16 進数（例: `20250305_091523_a1b2c3`）、ゲートウェイのセッションは 8 桁（例: `20250305_091523_a1b2c3d4`）が末尾に付きます。ID（全体でも、他と重ならない先頭部分でも）でもタイトルでも再開でき、どちらも `-c` と `-r` で使えます。
:::

## プラットフォームをまたいだ引き継ぎ {#cross-platform-handoff}

CLI のセッションで `/handoff <platform>` を使うと、進行中の会話をメッセージングプラットフォームのホームチャンネルへ移せます。エージェントは CLI で止まったところからそのまま続けます。セッション ID も同じ、役割付きの会話記録もツール呼び出しもすべて引き継がれます。

```bash
# Inside a CLI session
/handoff telegram
```

このとき起きることは次のとおりです。

1. CLI が、`<platform>` が有効でホームチャンネルが設定済みかを確かめます（設定は移動先のチャットで一度 `/sethome` を実行します）。
2. CLI はセッションを引き継ぎ待ちにして、**ゲートウェイの応答を待ちます**。エージェントがターンの途中なら断られるので、いまの応答が終わるのを待ってください。
3. ゲートウェイの監視役が引き継ぎを引き受け、移動先のアダプターに新しいスレッドを作らせます。
   - **Telegram** — 新しいフォーラムのトピックを開きます（そのチャットで Bot API 9.4 以降の Topics モードが有効なら DM のトピック、そうでなければフォーラム型スーパーグループのトピック）。
   - **Discord** — ホームのテキストチャンネルの下に、1440 分で自動アーカイブされるスレッドを作ります。
   - **Slack** — 起点となるメッセージを投稿し、その `ts` をスレッドの軸にします。
   - **WhatsApp / Signal / Matrix / SMS** — スレッドのしくみがないので、ホームチャンネルへ直接送ります。
4. ゲートウェイは移動先のキーを、いまの CLI のセッション ID に結び直し、エージェントに確認と要約を求める合成のユーザーターンを作ります。その返答が新しいスレッドに届きます。
5. ゲートウェイが成功を知らせると、CLI は `/resume` の使い方を示して静かに終了します。

   ```
   ↻ Handoff complete. The session is now active on telegram.
     Resume it on this CLI later with: /resume my-session-title
   ```

6. これ以降、会話はそのプラットフォーム側にあります。新しいスレッドで返信してください。そのチャンネルで許可された人は同じセッションを共有し、あとから実際のユーザーがスレッドへ書き込んでも自然に合流できます。スレッドのセッションは `user_id` を含めずにキーを作るからです。

**CLI へ戻す:** デスクトップへ戻りたくなったら、`/resume <title>`（シェルからなら `hermes -r "<title>"`）を実行すれば、プラットフォーム側で止まったところから続けられます。

**うまくいかない場合:**

- ホームチャンネルが未設定 → CLI が `/sethome` を促して断ります。
- ゲートウェイが動いていない（誰も要求を引き受けない） → CLI が 60 秒で分かりやすいメッセージとともに待つのをやめ、CLI のセッションはそのまま残ります。
- 移送に時間がかかる場合: ゲートウェイが引き継ぎを引き受けたあと、実際のエージェントのターンとしてセッション全体を流し直すため、長いセッションでは数分かかることがあります。CLI は「Still transferring...」の合図を出しながら最大 15 分待ちます。時間のかかる移送を「ゲートウェイが動いていない」と誤って報告することはありません。
- スレッドの作成に失敗する（権限不足、Topics モードが無効） → ホームチャンネルへ直接送る形になり、引き継ぎ自体は完了します。スレッドで分けられないだけです。
- `adapter.send` が失敗する（流量制限、一時的な API のエラー） → 引き継ぎは理由付きで失敗として記録されます。行は消えるので、もう一度試せます。

**知っておきたい制限:** スレッドに対応していないプラットフォームで、ホームチャンネルが複数人のグループになっている場合、合成のターンは DM 形式のセッションとしてキーが作られます。自分だけの DM をホームチャンネルにする一般的な使い方では問題ありませんが、本当に共有しているグループチャットには向きません。スレッドが使えるのは Telegram / Discord / Slack で、これがほとんどの場合に当たるため、この制限に触れることはまずありません。

## セッションの名前付け {#session-naming}

セッションに人が読めるタイトルを付けておくと、探すのも再開するのも楽になります。

### 自動で付くタイトル {#auto-generated-titles}

Hermes は最初のやり取りのあと、セッションごとに短い説明的なタイトル（3〜7 語）を自動で作ります。これは軽い補助モデルを使ってバックグラウンドで動くので、待ち時間は増えません。`hermes sessions list` や `hermes sessions browse` でセッションを眺めると、自動で付いたタイトルが見えます。

自動のタイトル付けはセッションごとに一度だけ動き、自分でタイトルを付けていた場合は飛ばされます。

### 自分でタイトルを付ける {#setting-a-title-manually}

チャットのセッション（CLI でもゲートウェイでも）の中で `/title` コマンドを使います。

```
/title my research project
```

タイトルはその場で反映されます。まだデータベースにセッションが作られていない場合（最初のメッセージを送る前に `/title` を実行した場合など）は、順番待ちにしてセッションの開始時に反映します。

既存のセッションはコマンドラインからも名前を変えられます。

```bash
hermes sessions rename 20250305_091523_a1b2c3d4 "refactoring auth module"
```

### タイトルの決まり {#title-rules}

- **重複しない** — 同じタイトルのセッションを 2 つ作ることはできません
- **最大 100 文字** — 一覧の表示を読みやすく保つためです
- **無害化される** — 制御文字、幅ゼロの文字、書字方向の上書きは自動で取り除かれます
- **普通の Unicode は問題なし** — 絵文字、日本語や中国語の文字、アクセント付き文字はどれも使えます

### 圧縮したときの自動の枝分かれ {#auto-lineage-on-compression}

セッションの文脈が圧縮されると（`/compress` で手動、または自動）、Hermes は続きのセッションを新しく作ります。もとのセッションにタイトルがあれば、新しいセッションには番号付きのタイトルが自動で付きます。

```
"my project" → "my project #2" → "my project #3"
```

名前で再開すると（`hermes -c "my project"`）、その系列でいちばん新しいセッションが自動で選ばれます。

### メッセージングプラットフォームでの /title {#title-in-messaging-platforms}

`/title` コマンドは、ゲートウェイのすべてのプラットフォーム（Telegram、Discord、Slack、WhatsApp）で使えます。

- `/title My Research` — セッションのタイトルを設定します
- `/title` — いまのタイトルを表示します

## セッション管理のコマンド {#session-management-commands}

Hermes には `hermes sessions` として、セッションを管理するコマンドがひととおりそろっています。

### セッションの一覧 {#list-sessions}

```bash
# List recent sessions (default: last 20)
hermes sessions list

# Filter by platform
hermes sessions list --source telegram

# Show more sessions
hermes sessions list --limit 50
```

セッションにタイトルが付いていると、タイトル・冒頭の抜粋・相対的な時刻が表示されます。

```
Title                  Preview                                  Last Active   ID
────────────────────────────────────────────────────────────────────────────────────────────────
refactoring auth       Help me refactor the auth module please   2h ago        20250305_091523_a
my project #3          Can you check the test failures?          yesterday     20250304_143022_e
—                      What's the weather in Las Vegas?          3d ago        20250303_101500_f
```

どのセッションにもタイトルがない場合は、簡素な形になります。

```
Preview                                            Last Active   Src    ID
──────────────────────────────────────────────────────────────────────────────────────
Help me refactor the auth module please             2h ago        cli    20250305_091523_a
What's the weather in Las Vegas?                    3d ago        tele   20250303_101500_f
```

### セッションの書き出し {#export-sessions}

`hermes sessions export` は、書き出しのすべての形式をまとめて扱う入口で、`--format` で選びます。

| 形式 | 出力 | 向いている用途 |
|--------|--------|------------|
| `jsonl`（既定） | セッションごとに JSON オブジェクト 1 つ | バックアップ、機械での読み書き |
| `md` / `qmd` | セッションごとに Markdown / Quarto のファイル 1 つ + 目録 | 読める形での保管、メモ |
| `html` | 単体で完結する 1 ページ（複数セッションなら横に一覧が付きます） | 共有、閲覧 |
| `trace` | Claude Code の JSONL | HF Agent Trace Viewer、`--upload` |

さらに `--only user-prompts` を付けると、プロンプトだけを見る形にできます（jsonl か md）。

どの形式でも選び方の指定は共通です。1 つのセッションなら `--session-id`、まとめて扱うなら `prune` / `archive` と同じ絞り込み一式が使えます。`--older-than` / `--newer-than` / `--before` / `--after`（`5h`・`2d`・`1w` のような期間、数字だけなら日数、または ISO 形式の時刻）、`--source`、`--title`、`--model`、`--provider`、`--cwd`、`--min/--max-messages`、`--min/--max-tokens`、`--min/--max-cost`、`--min/--max-tool-calls`、`--user`、`--chat-id`、`--chat-type`、`--branch`、`--end-reason` です。`--dry-run` は書き出さずに対象だけを確かめます。`--redact` は、どの形式でも書き出す内容から秘密の値（API キー、トークン、認証情報）を伏せます。誰かに渡す予定のものには必ず付けてください。なお、まとめて扱う絞り込みが対象にするのは*終了した*セッションです。絞り込みなしの `export` は、動いているものも含めてすべてを書き出します。

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

書き出したファイルは 1 行が 1 つの JSON オブジェクトで、セッションの情報一式とすべてのメッセージが入っています。

#### HTML {#html}

`--format html` は、外部に依存しない単体で完結した HTML ファイルを 1 つ書き出します。メッセージは吹き出し風に整えられ、ツールの出力は折りたたまれ、複数セッションを書き出したときは切り替え用の一覧が横に付きます。

```bash
# One session as a standalone HTML page
hermes sessions export --format html --session-id 20250305_091523_a1b2c3d4 transcript.html

# All Telegram sessions from the last week in one file, secrets redacted
hermes sessions export --format html --newer-than 1w --source telegram --redact archive.html
```

#### プロンプトだけ {#prompts-only}

`--only user-prompts` は、自分が書いたプロンプトだけを書き出します。アシスタントの返答、ツールの出力、システム側の文脈は含みません。プロンプトを貯めておきたいときや、何を頼んだかを見直すときに便利です。

```bash
# One JSONL record per prompt (session id, index, timestamp, text)
hermes sessions export prompts.jsonl --session-id 20250305_091523_a1b2c3d4 --only user-prompts

# Markdown, straight to stdout
hermes sessions export - --session-id 20250305_091523_a1b2c3d4 --only user-prompts --format md
```

`--format jsonl`（既定）と `md` で使え、まとめて書き出すときの絞り込みも同じように効き、`--redact` とも組み合わせられます。

#### トレース（HF Agent Trace Viewer） {#traces-hf-agent-trace-viewer}

`--format trace` は Claude Code の JSONL を出します。これは Hugging Face Hub が [Agent Trace Viewer](https://huggingface.co/docs/hub/agent-traces) 用に自動で見分ける形式です。手元に書き出すこともできますし、`--upload` を付ければ自分の非公開の `hermes-traces` データセットへ送れます（`HF_TOKEN` を読みます）。

```bash
# Trace of the most recent session, to stdout
hermes sessions export --format trace

# One session to a local trace file
hermes sessions export --format trace --session-id 20250305_091523_a1b2c3d4 trace.jsonl

# Upload straight to your private HF traces dataset
hermes sessions export --format trace --session-id 20250305_091523_a1b2c3d4 --upload
```

トレースの書き出しは、既定で秘密の値を伏せます（端末の外へ出ていく前提のものだからです）。自分で中身を確かめたうえで `--no-redact` を付ければ、伏せずに出せます。`--upload` は `--public` を付けない限り非公開です。絞り込みを付けてまとめて書き出すと、セッションごとに `<id>.trace.jsonl` が作られます。

#### Markdown / QMD {#markdown-qmd}

古いセッションを隠したり消したりする前に、読める形でファイルに残しておきたいときは `--format md` か `--format qmd` を使います。Markdown / QMD の書き出しは、セッションごとに 1 ファイルをディレクトリ（既定は `~/.hermes/session-exports`）へ書きます。

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

Markdown / QMD の書き出しは、書き出したセッションごとに `.md` または `.qmd` を 1 ファイル作り、加えてファイルのパス・メッセージ数・系列の ID・SHA-256 を記した `manifest.jsonl` を作ります。まとめて書き出すには絞り込みが少なくとも 1 つ必要で、条件なしのまとめ書き出しは断られます。`--delete-after-verified` は意図的に `--session-id` のときだけに限られ、`--yes` も必要です。親セッションを消すと、その委任先や下位エージェントのセッションも消えるため、このモードでは委任先を 1 つずつ別ファイルに書き出して確かめてから削除に進みます。書き出しの途中で委任先の顔ぶれが変わった場合、削除は行われません。`--redact` は、書き出す前にメッセージ本文とツールの出力から秘密の値（API キー、トークン、認証情報）を伏せます。誰かに渡す予定の書き出しには必ず付けてください。

### セッションを消す {#delete-a-session}

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

そのタイトルを別のセッションが使っている場合は、エラーが表示されます。

### セッションを固定する {#pin-a-session}

固定すると「残す」という印が付きます。固定したセッションは
`sessions.auto_archive` による自動整理の対象外になり、常に一覧に出ます。
これは Desktop の横一覧の Pinned で使われるのと同じ印なので、どちらで
固定しても両方に反映されます。

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

時間の指定（`--older-than`、`--newer-than`、`--before`、`--after`）には、
期間（`5h`、`30m`、`2d`、`1w`）、日数だけの数字、または ISO 形式の時刻
（`2026-07-05`、`2026-07-05 14:30`）を渡せます。`--older-than` と `--before` が
上限、`--newer-than` と `--after` が下限を決めます。
`--older-than` / `--newer-than` の組は最後のメッセージの時刻を見ます
（メッセージのないセッションではセッションの開始時刻を使います）。
`--before` / `--after` は必ずセッションの開始時刻を見ます。どちらの組も、
2 つ合わせれば期間として使えます。

属性での絞り込みは次のとおりです。`--source`（プラットフォーム、完全一致）、
`--title` / `--model` / `--branch`（大文字小文字を区別しない部分一致）、
`--provider`（課金の提供元、完全一致）、`--end-reason`、`--user`、`--chat-id`、
`--chat-type`（完全一致）、`--cwd`（パスの先頭一致）、それに数値の範囲として
`--min/--max-messages`、`--min/--max-tokens`（入力 + 出力）、
`--min/--max-cost`（米ドル。実績値があればそれ、なければ見積り）、
`--min/--max-tool-calls`。何か 1 つでも絞り込みを使うと、暗黙の 90 日の既定は
効かなくなるので、`hermes sessions prune --source cron` や `--model gpt-4o` は
すべての期間が対象になります。狭めたいときは時間の指定を足してください。
90 日の区切りが残るのは、何も付けない `hermes sessions prune` だけです。
`--yes` を付けない実行では、確認を求める前に、一致した件数といちばん古い
セッション・いちばん新しいセッションが表示されます。

アーカイブ済みのセッションは既定で対象外です。まとめて消したいときは
`--include-archived` を渡します。

:::info
整理で消えるのは**終了した**セッションだけです（明示的に終了したか、自動でリセットされたもの）。動いているセッションが消えることはありません。
:::

### セッションをまとめてアーカイブする {#bulk-archive-sessions}

消さずに一覧から外したいだけなら、`hermes sessions archive` が使えます。
`prune` と同じ絞り込みを受け取り、一致したセッションをそっと隠します
（Desktop やダッシュボードの画面から 1 件ずつアーカイブするのと同じ印を
付けるだけで、メッセージも検索も残ります）。

```bash
# Archive everything from the last 5 hours (e.g. 75 CI smoke-test sessions)
hermes sessions archive --newer-than 5h

# Archive by title substring, preview first
hermes sessions archive --title "dry run" --dry-run
hermes sessions archive --title "dry run" --yes
```

絞り込みは少なくとも 1 つ必要です。条件なしの `hermes sessions archive` は、
履歴の全体をアーカイブすることを断ります。アーカイブしたセッションは
`hermes sessions list` と `/resume` から見えなくなりますが、データベースには
残っていて、Desktop やダッシュボードのセッション一覧から戻せます。

### セッションの統計 {#session-statistics}

```bash
hermes sessions stats
```

出力は次のようになります。

```
Total sessions: 142
Total messages: 3847
  cli: 89 sessions
  telegram: 38 sessions
  discord: 15 sessions
Database size: 12.4 MB
```

トークンの使用量、費用の見積り、ツールごとの内訳、使い方の傾向といったもっと踏み込んだ分析には [`hermes insights`](/hermes/docs/reference/cli-commands/#hermes-insights) を使います。

### 迷子になったゲートウェイのセッションを直す {#repair-stranded-gateway-sessions}

再起動のあとにゲートウェイの会話が「時間をさかのぼる」ように見えたら
——最近のやり取りがなかったかのように何日も前の話題を続けたら——
その会話は、行き先の情報を失ったセッションの行に取り残されているかもしれません
（v0.21 のセッション継続性の改修で直された種類の問題です。いまの版は
そもそも起きない作りになっていて、動作中に自分で直します）。

`hermes sessions repair-routing` は、メッセージを持つのに行き先の情報がない
セッションの行を見つけ、それぞれを続きであるはずの会話へつなぎ直します。
ただし、根拠に迷いがないときだけです。

```bash
# Report only — shows each orphan, the proposed adoption, and the evidence
hermes sessions repair-routing

# Perform the adoptions (stop the gateway first — a running gateway holds
# the old routing in memory and would write it back over the repair)
hermes sessions repair-routing --apply

# Widen/narrow the contiguity window (default 900 seconds)
hermes sessions repair-routing --max-gap-seconds 300
```

根拠として認めるのは次の 2 つです。

- **系列** — 迷子の行の `parent_session_id` が、同じプラットフォームの
  行き先付きの行を指している（記録された事実なので、時間の窓は関係ありません）
- **前後の連続性** — 同じプラットフォームで行き先付きの行がちょうど 1 つだけ、
  迷子の行が始まった時刻の窓の中で静かになっている

あいまいなもの（候補となる先行の行が 2 つある、2 つの迷子が同じ先行の行を
指している）は理由付きで報告するだけで、手は付けません。つなぎ先を間違えると、
ある会話を別のチャットへ継ぎ足してしまうからです。置き換えられた行は
`superseded_by_repair` として退役するので、再起動時の復旧でよみがえることは
ありません。

この修復はあえて**自動ではありません**。そのチャットにすでに 2 本目の履歴が
できている場合、どちらの流れの続きにするかを決めるのはあなたです。取り残された
会話はどちらにしても `/resume` とセッション検索から読めます。修復が変えるのは
行き先だけです。先にバックアップを取ってください
（`cp ~/.hermes/state.db ~/.hermes/state.db.bak`）。

## Claude Code や Codex CLI からセッションを取り込む {#importing-sessions-from-claude-code-and-codex-cli}

別のエージェント CLI で始めた会話も、Hermes に取り込んでここで続けられます。
Hermes は Claude Code のセッションログ（`~/.claude/projects/`）と Codex CLI の
rollout（`~/.codex/sessions/`）を読みます。外部のファイルは読むだけで、
書き換えることはありません。

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

`hermes sessions import` は `Imported from Claude Code: <first user message>`
（Codex CLI ならそちらの名前）というタイトルで新しい Hermes のセッションを作り、
その ID と、そのまま貼り付けられる `hermes --resume <id>` を表示します。
`--resume @claude` / `--resume @codex` は同じ選択画面を出し、取り込んだ会話へ
そのまま入ります。

**Hermes Desktop** にも同じ取り込み機能があり、横一覧の **Import session**
（コマンドパレットからも）で使えます。一覧に出るのは、アプリを動かしている
パソコンではなく、つながっているバックエンドが動いている端末にあるログです。
読むだけのプレビューが出て、**Continue in Hermes** で会話が選んだプロファイルへ
写されます。一覧を眺めてもセッションの保存領域には何も書かれず、取り込んでも
元のファイルには触れません。同じログを 2 回取り込もうとすると、新しく作らずに
すでにある写しを開きます。

引き継がれるのは、順番どおりのユーザーとアシスタントの会話です。ツールの動きは、
アシスタントのターンの中に `[ran tool: …]` という短いメモとしてまとめられます。
システムプロンプト、差し込まれた文脈、思考の記録、ツールの生の出力は残りません。
取り込みは読みやすい会話記録であって、1 バイトも違わない再現ではありません。

## セッション検索のツール {#session-search-tool}

エージェントには `session_search` というツールが最初から備わっていて、SQLite の FTS5 を使って過去のすべての会話を全文検索します。見つけたセッションの中を前後にたどることもできます。LLM は一切呼ばず、要約を作るのではなく、データベースにある実際のメッセージをそのまま見せます。

### 4 つの呼び出し方 {#four-calling-shapes}

このツールは、どの引数を渡したかで何をしたいのかを判断します。`mode` のような指定はありません。

**1. 探す — `query` を渡す:**

```python
session_search(query="auth refactor", limit=3)
```

FTS5 で検索し、セッションの系列ごとに重複を除いて、上位 N 件のセッションを返します。探すときの詳しさは既定で相手に合わせて変わります。いちばん順位の高い結果はその前後の文脈と会話の始まり・終わりまで含み、それより下の結果は簡素なままです。すべての結果を詳しく出したいときは `detail="full"` を渡します。

それぞれの結果には次のものが入っています。

- `session_id`、`title`、`when`、`source`
- `snippet` — FTS5 が一致箇所を強調した抜粋
- `detail` — `full` または `compact`
- `bookend_start` / `bookend_end` — 詳しい結果では最初と最後の 3 往復。簡素な結果では空のリスト
- `messages` — 詳しい結果では FTS5 の一致箇所の前後 5 件。簡素な結果では印の付いた 1 件だけ
- `match_message_id`、`messages_before`、`messages_after`

いちばん上の結果を見れば、目的 → 一致箇所 → 決着の流れがすぐ分かります。簡素な結果のほうが有望に見えたら、そのセッションとメッセージの ID を使って、前後にたどる呼び方に移ります。実際のセッションのデータベースでは、たいてい数十ミリ秒で返ります。

**2. たどる — `session_id` と `around_message_id` を渡す:**

```python
session_search(session_id="20260510_174648_805cc2", around_message_id=590803, window=10)
```

指定したメッセージを中心に、前後 `window` 件を返します。FTS5 も会話の始まり・終わりもなく、その範囲だけです。既定の前後 5 件より広く見たいときに、探したあとで使います。

- **先へ**進むには、`messages[-1].id` を `around_message_id` として渡します
- **前へ**戻るには、`messages[0].id` を `around_message_id` として渡します
- 境目のメッセージは両方の範囲に現れ、位置の目印になります
- `messages_before` または `messages_after` が `window` より小さければ、セッションの先頭か末尾に来ています

1 回あたりの所要時間は、たいてい 1〜2 ミリ秒です。

**3. 読む — 中心を指定せず `session_id` だけ渡す:**

```python
session_search(session_id="20260510_174648_805cc2")
```

セッション全体を返します。大きなセッションでは、先頭と末尾を切り出した形になります。この呼び方は `@session:<profile>/<id>` のリンクを開くときにも使われます。

**4. 眺める — 引数なし:**

```python
session_search()
```

最近のセッションを時系列で返します（タイトル、冒頭の抜粋、時刻）。話題を挙げずに「何をやっていたっけ」と聞かれたときに便利です。

### FTS5 の検索の書き方 {#fts5-query-syntax}

キーワードでの検索は、FTS5 の標準的な書き方に対応しています。

- 単純なキーワード: `docker deployment`（FTS5 は既定で AND です）
- 語句: `"exact phrase"`
- 論理演算: `docker OR kubernetes`、`python NOT java`
- 前方一致: `deploy*`

### 任意の引数 {#optional-parameters}

- `sort` — FTS5 の関連度に重ねて `newest` か `oldest` を指定します。省くと関連度だけの順になります（既定。あちこち探るときはこれが向きます）。「あの件はどこで止まっていたか」には `newest`、「あれはどう始まったか」には `oldest` を使います。
- `detail` — `adaptive`（既定）は探した結果の上位 1 件だけを詳しく出し、`full` はすべての結果を詳しく出します。
- `role_filter` — 含める役割をカンマ区切りで指定します。探すときは既定で `user,assistant` です（ツールの出力はたいてい雑音になります）。ツールの出力も含めたい（ツールの挙動を調べる）ときは `user,assistant,tool`、ツールの出力だけを検索したいときは `tool` を渡します。

### いつ使われるか {#when-its-used}

エージェントは、セッション検索を自分から使うよう促されています。

> *「利用者が過去の会話に触れたときや、関係のある以前のやり取りがありそうだと思ったときは、聞き直す前に session_search で思い出すこと。」*

よくあるきっかけは「前にもやった」「あのときの」「この前」「さっき言ったけど」、あるいはいまの会話の窓に出てこないプロジェクト・人・概念への言及です。

## プラットフォームごとのセッションの追い方 {#per-platform-session-tracking}

### ゲートウェイのセッション {#gateway-sessions}

メッセージングプラットフォームでは、メッセージの送信元から決まった規則で作ったセッションキーでセッションを見分けます。

| チャットの種類 | 既定のキーの形 | 挙動 |
|-----------|--------------------|----------|
| Telegram の DM | `agent:main:telegram:dm:<chat_id>` | DM のチャットごとに 1 セッション |
| Discord の DM | `agent:main:discord:dm:<chat_id>` | DM のチャットごとに 1 セッション |
| WhatsApp の DM | `agent:main:whatsapp:dm:<canonical_identifier>` | DM の相手ごとに 1 セッション（対応関係が分かるとき、LID と電話番号の別名は 1 つの身元にまとまります） |
| グループチャット | `agent:main:<platform>:group:<chat_id>:<user_id>` | プラットフォームがユーザー ID を出す場合、グループの中で人ごとに分かれます |
| グループのスレッド / トピック | `agent:main:<platform>:group:<chat_id>:<thread_id>` | そのスレッドの参加者全員で 1 つのセッションを共有します（既定）。`thread_sessions_per_user: true` にすると人ごとに分かれます。 |
| チャンネル | `agent:main:<platform>:channel:<chat_id>:<user_id>` | プラットフォームがユーザー ID を出す場合、チャンネルの中で人ごとに分かれます |

共有のチャットで参加者を見分ける手がかりが取れないときは、その部屋で 1 つのセッションを共有する形になります。

### グループのセッションを共有するか分けるか {#shared-vs-isolated-group-sessions}

既定では、`config.yaml` の `group_sessions_per_user: true` が使われます。つまり次のようになります。

- 同じ Discord のチャンネルで、アリスとボブがそれぞれ Hermes と話しても、会話の記録は混ざりません
- ある人のツールを多用する長い作業が、別の人の文脈の窓を汚しません
- 中断の扱いも人ごとに分かれます。動作中のエージェントのキーが、分けられたセッションのキーと一致するからです

代わりに「部屋ごとに 1 つの頭」にしたい場合は、次のように設定します。

```yaml
group_sessions_per_user: false
```

こうするとグループやチャンネルは部屋ごとに 1 つのセッションに戻ります。会話の文脈は全員で共有できますが、トークンの費用、中断の状態、文脈の膨らみ方も共有することになります。

### セッションの続き方 {#session-continuity}

ゲートウェイの会話は、しばらく使わなかったからといって、また日付が変わったからといって
リセットされることはありません。新しい会話にしたいときは `/new` か `/reset` をはっきり使って
ください。文脈の圧縮はこれまでどおり自動です。古い `session_reset` の設定、リセットの決まりの
上書き、リセットの時間を決める環境変数は、いずれも無視されます。資源を取り戻すために、
キャッシュしてあるエージェントが解放されることはありますが、それで永続的な会話が
置き換わるわけではありません。再起動からの復旧における「新しさ」の条件が制限するのは
自動で続けるかどうかであって、メッセージを送ったときに読み込まれる履歴ではありません。

### 落ちたときや再起動したあとの続き方 {#continuity-after-crashes-and-restarts}

ゲートウェイのチャットは、明示的に `/new`（または `/reset`）を実行するまで
**1 本の続いたセッション**として扱われ、大きくなるたびに圧縮されていきます。
これはゲートウェイが落ちても、再起動しても、更新しても変わりません。

- セッションの身元（行き先のキー、チャット、送信元）は、セッションの行を作るとき、
  どの作り方（`/new`、最初のメッセージ、`/branch` の子）でも**まとめて一度に**
  書かれます。その書き込みが失敗しても、次のターンの行き先の更新で自動的に直ります。
- 再起動のあと、ゲートウェイは各チャットを、**実際に動きのあった**時刻が
  いちばん新しいセッションに結び直します。古くて放置された行が、実際に
  していた会話に勝つことはありません。
- 復旧は **`/new` の区切りを尊重します**。そのチャットのいちばん新しい出来事が
  意図的なリセットなら、そのリセットの向こうへ手を伸ばして古いセッションを
  よみがえらせるのではなく、まっさらな状態から始めます。復旧したセッションは
  実際の放置時間も保つので、idle や daily のリセットを有効にしていれば、
  すべてを新品扱いせずに正しく効きます。

## 保存場所 {#storage-locations}

| 対象 | パス | 説明 |
|------|------|-------------|
| SQLite データベース | `~/.hermes/state.db` | セッションの情報とメッセージの全体、FTS5 付き |
| ゲートウェイのメッセージ    | `~/.hermes/state.db`   | SQLite。すべてのセッションのメッセージの正本 |
| ゲートウェイの行き先の索引 | `~/.hermes/state.db` の `gateway_routing` テーブル | セッションキーと、動いているセッション ID の対応（送信元の情報、期限の印） |
| 旧式の行き先の写し | `~/.hermes/sessions/sessions.json` | 行き先の索引の後方互換用の写し。`gateway.write_sessions_json: true`（既定）のときに書かれます |

SQLite データベースは、読み手が同時に何人いても書き手は 1 つ、という WAL モードで動きます。複数のプラットフォームを束ねるゲートウェイの作りによく合っています。

:::warning `sessions.json` はセッションの一覧ではありません
ゲートウェイの行き先の索引は `state.db` の中の `gateway_routing` テーブルにあります。
`~/.hermes/sessions/sessions.json` はその**旧式の写し**で、後方互換のために
残されています（`gateway.write_sessions_json: false` で止められます）。
中身は、メッセージング側のセッションキー（`agent:main:<platform>:...`）と
動いているセッション ID の対応です。
入っているのはゲートウェイ・メッセージングの項目だけなので、メッセージング
プラットフォームを使っていれば、そこにあるのはそれだけです（例:
`agent:main:whatsapp:dm:...`）。

これは**そういうもの**で、CLI のセッションが失われたわけでは**ありません**。
`hermes sessions list`、`/sessions`、ダッシュボードはどれも `state.db` を読み、
そこには**すべての**セッション（CLI、TUI、ゲートウェイ）が入っています。
`~/.hermes/sessions/saved/*.json` にある `/save` の控えは、索引ではなく
手軽な書き出しです。

本当に CLI のセッションが `hermes sessions list` に出てこない場合、原因は
`state.db` に届いていないことです。`hermes sessions repair` を実行し、CLI の
起動時に `⚠ Session store unavailable` の警告が出ていないか見てください。
その警告は、その実行では SQLite への保存が失敗したという意味です。
:::

:::note 旧式の JSONL の会話記録
state.db が正本になる前に作られたセッションでは、`~/.hermes/sessions/` に
`*.jsonl` のファイルが残っていることがあります。いまの Hermes は
これを書きも読みもしません。対応するセッションが state.db にあることを
確かめたうえで消して問題ありません。
:::

### データベースの構造 {#database-schema}

`state.db` の主なテーブルは次のとおりです。

- **sessions** — セッションの情報（id、source、user_id、model、title、時刻、トークン数）。タイトルには重複を許さない索引が付いています（NULL は許され、NULL でないものだけが重複できません）。
- **messages** — メッセージ履歴の全体（role、content、tool_calls、tool_name、token_count）
- **messages_fts** — メッセージ本文を全文検索するための FTS5 の仮想テーブル

## セッションの期限と後片付け {#session-expiry-and-cleanup}

### 自動の後片付け {#automatic-cleanup}

- ゲートウェイの会話は、しばらく使わなくても残ります。区切りたいときは `/new` か `/reset` を使ってください
- リセットの前に、エージェントは期限を迎えるセッションから記憶と skill を保存します
- 自動の整理（#54189 以降は**既定で有効**）: `sessions.auto_prune` が `true` のとき、終了したセッションのうち `sessions.retention_days`（既定 90）の間なにも起きていないものが、CLI・ゲートウェイ・cron の起動時に整理されます
- 実際に行が消えた整理のあと、`state.db` は次の**両方**の条件を満たしたときだけ `VACUUM` してディスクを取り戻します。前回の `VACUUM` の成功から `sessions.min_vacuum_interval_days`（既定 30）以上たっていること、**かつ**ファイルのページの 25% 以上が取り戻せる状態であること（`PRAGMA freelist_count / page_count`）。中身の詰まったデータベースが、数 MB のために全体を書き直す代価を払うことはありません（SQLite は普通の DELETE ではファイルを縮めません）
- 整理は `sessions.min_interval_hours`（既定 24）につき最大 1 回だけ走ります。最後に実行した時刻は `state.db` 自身に記録されるので、同じ `HERMES_HOME` を使うすべての Hermes のプロセスで共有されます

整理をしないと `state.db` は際限なく大きくなります。ゲートウェイと cron を組み合わせた環境で、数週間のうちに数 GB になったという報告があります。終了したセッションをすべて永久に残しておきたい場合（#54189 より前の動き）は、`~/.hermes/config.yaml` で止められます。

```yaml
sessions:
  auto_prune: false         # default is true — set false to keep all history
  retention_days: 90        # keep ended sessions active within this window
  vacuum_after_prune: true  # reclaim disk space after a pruning sweep
  min_vacuum_interval_days: 30 # don't rewrite the DB more often than this
  min_interval_hours: 24    # don't re-run the sweep more often than this
```

これらのキーをすでに自分で設定してある環境では、その値がそのまま保たれます。
設定していないキーだけが新しい既定値になります。

消えるのは**終了した**セッションだけです。動いているセッションは、どれだけ古くても
自動で整理されることはありません。終了したセッションは最後のメッセージからの
経過で数えるので、始まったのが保持期間より前でも、最近使った長い会話が
それだけの理由で消えることはありません。

**自動処理が残す開きっぱなしのセッション。** cron の処理、かんばんのワーカー、
下位エージェント、1 回きりの CLI 実行といったものは、セッションを終了と
記録しないまま止まることがあります。整理が消すのは*終了した*行だけなので、
そのままでは溜まり続けます。そこで自動の整理は毎回、状態を持つ送信元
（`cli`、`cron`、`kanban`、`acp`、`api_server`、`subagent`、`tool`）の
開きっぱなしのセッションのうち、最後の動きが `retention_days` より古いものを
*閉じ*ます（`end_reason: startup_orphan_reap`）。閉じるだけなら何も失われず、
セッションは再開できます。行は閉じた時点から数え直されるので、実際に消えるのは
さらに保持期間をまるごと過ぎたあと、*次の*整理のときです。メッセージング
プラットフォームのセッション（Telegram、Discord など）、TUI やデスクトップの
セッション、固定したセッション、ターンや圧縮が進行中のセッションは、
この整理で閉じられることはありません。

### 大きすぎる会話記録への備え {#oversized-transcript-guards}

暴走した会話記録が一度にメモリへ読み込まれないよう、2 つの上限があります
（どちらも既定は動いているメッセージ `20000` 件。`0` にすると無効になります）。

```yaml
sessions:
  max_resume_messages: 20000   # interactive resume (CLI / TUI / Desktop)
  max_export_messages: 20000   # one-shot in-memory export of a single session
```

`max_resume_messages` が制限するのは**再開のときに実際に読み込む量**であって、
会話の履歴全体ではありません。

- 普通の対話での再開（CLI の `--resume`、TUI）は、圧縮の系列全体
  ——圧縮された区間のすべてと、いま動いている先端——を組み立てるので、
  系列全体で見た量が上限になります。
- Desktop の起動時の再開は REST 経由で会話記録を少しずつ読み、メモリに
  持つのはいま動いている先端の区間だけなので、その先端だけが上限になります。
  何度も圧縮されてきた長い会話（区間が何十もあり、小さな先端の後ろに何万もの
  保管された行がある状態）は、まさに圧縮が生み出そうとしている姿であり、
  普通に開けます。画面の下に出るメッセージ数は、いまのプロンプトではなく
  保存された系列全体を表しています。

再開が断られると、クライアントにはエラーコード `4130` と、件数、そして
どの範囲で数えたか（`across its lineage` か `in its tip segment`）が返ります。
そうしたセッションでも `hermes sessions export` は使えます。

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
データベースが大きくなる速さは緩やかで（目安として、数百のセッションで 10〜15 MB）、セッションの履歴は `session_search` で過去の会話を思い出すもとになるので、自動の整理は無効の状態で配られています。ゲートウェイや cron を重く使っていて、`state.db` が性能に実際に響いているなら有効にしてください（実際に起きた例: セッション約 1000 件で 384 MB の state.db が、FTS5 への書き込みと `/resume` の一覧表示を遅くしました）。自動の整理を有効にせず一度だけ片付けたいときは、`hermes sessions prune` を使います。
:::
