---
title: "セッション"
description: "セッションの保存、再開、検索、管理、プラットフォームごとのセッション追跡"
upstream_path: user-guide/sessions.md
upstream_blob: 67fa40e0939f7ce9505ad6ea008301a8359fc5bb
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/sessions
---

# セッション {#sessions}

Hermes Agent は、すべての会話を自動でセッションとして保存します。セッションがあるおかげで、会話の再開、セッションをまたいだ検索、会話履歴のまるごとの管理ができます。

## セッションの仕組み {#how-sessions-work}

CLI、Telegram、Discord、Slack、WhatsApp、Signal、Matrix、Teams、そのほかどのメッセージングのプラットフォームから始めた会話でも、すべてのメッセージ履歴を伴うセッションとして保存されます。セッションは次の場所で管理されます。

1. **SQLite データベース**（`~/.hermes/state.db`）— FTS5 の全文検索が使える構造化されたセッション情報と、メッセージ履歴のすべて

SQLite データベースには次が保存されます。
- セッション ID、発生元のプラットフォーム、ユーザー ID
- **セッションのタイトル**（重複しない、人が読める名前）
- モデル名と設定
- システムプロンプトのスナップショット
- メッセージ履歴のすべて（役割、内容、ツールの呼び出し、ツールの結果）
- トークン数（入力・出力）
- 時刻（started_at、ended_at）
- 親セッションの ID（圧縮によってセッションが分かれたときに使います）

### コンテキストに数えられるもの {#what-counts-toward-context}

Hermes
は会話を再開できるようにセッションの履歴を保存しますが、これまで扱ったすべてのバイトを毎回送り直しているわけではありません。1
回のやり取りでモデルが見るのは、選ばれたシステムプロンプト、いまの会話の窓、そしてそのやり取りのために
Hermes が明示的に差し込んだ内容だけです。

添付されたメディアは、そのやり取りの中だけで使う入力として扱われます。

- 画像は、次のモデル呼び出しにそのまま添えられることもあれば、いま使っているモデルが画像を直接扱えないときに、
  あらかじめ文章の説明へ置き換えられることもあります。
- 音声は、音声認識を設定していれば文字に起こされます。
- テキストの文書は、取り出した本文を含められます。それ以外の種類の文書は、たいてい保存した
  ローカルのパスと短い注記で表されます。
- 添付ファイルのパスや、取り出した・導き出した文章は記録に残ることがありますが、画像・音声・バイナリの
  生のバイト列が、この先のプロンプトへ繰り返しコピーされることはありません。

たとえば、ユーザーが画像を送って「これでミームを作って」と頼んだ場合、Hermes
はその画像を一度だけ画像認識で見て、画像処理のスクリプトを走らせるかもしれません。以降のやり取りが元の
JPEG
を自動で抱え続けることはありません。運ばれるのは会話に書き込まれたものだけ、つまりユーザーの依頼、短い画像の説明、ローカルのキャッシュのパス、最後の応答といったものです。

コンテキストがふくらむ原因は、たいていメディアのファイルそのものではありません。長い文章のほうです。貼り付けた文字起こし、ログの全文、大きなツールの出力、長い差分、繰り返しの状況報告、細かい証跡の書き出し。大きな成果物をそのままチャットへコピーするより、要約・ファイルのパス・要点の抜粋・ツールを使った参照を選んでください。

:::tip
セッションが長くなったら `/compress` を、話題を切り替えるなら `/new` を使ってください。`hermes sessions prune`
は、終わった古いセッションを保存領域から消したいときにだけ使います。`state.db`
が大きくなっただけなら、まず消さずに済む手を試してください。`hermes sessions optimize` は FTS5
の索引の断片をまとめ、セッションのデータには一切触れずにデータベースを VACUUM します。圧縮はいま使っているコンテキストを減らすもので、プライバシーのための削除ではありません。
`/new` に名前を渡すと（たとえば `/new payments-refactor`）、新しいセッションの最初のタイトルを先に決められます。あとから
`/resume <name>` や `/sessions` の一覧で見つけるときに役立ちます。
:::

### セッションの発生元 {#session-sources}

セッションには、それぞれ発生元のプラットフォームが記録されます。

| 発生元 | 説明 |
|--------|-------------|
| `cli` | 対話型の CLI（`hermes` または `hermes chat`） |
| `telegram` | Telegram |
| `discord` | Discord のサーバー / DM |
| `slack` | Slack のワークスペース |
| `whatsapp` | WhatsApp |
| `signal` | Signal |
| `matrix` | Matrix のルームと DM |
| `mattermost` | Mattermost のチャンネル |
| `email` | メール（IMAP / SMTP） |
| `sms` | Twilio 経由の SMS |
| `dingtalk` | DingTalk |
| `feishu` | Feishu / Lark |
| `wecom` | WeCom（企業微信） |
| `weixin` | Weixin（個人の WeChat） |
| `bluebubbles` | BlueBubbles の macOS サーバー経由の Apple iMessage |
| `qqbot` | 公式 API v2 経由の QQ ボット（Tencent QQ） |
| `homeassistant` | Home Assistant の会話 |
| `webhook` | 受信 Webhook |
| `api-server` | API サーバーへの要求 |
| `acp` | ACP のエディタ連携 |
| `cron` | cron による定時実行 |
| `batch` | 一括処理の実行 |

## CLI からセッションを再開する {#cli-session-resume}

`--continue` または `--resume` で、CLI から前の会話を再開できます。

### 直前のセッションを続ける {#continue-last-session}

```bash
# Resume the most recent CLI session
hermes --continue
hermes -c

# Or with the chat subcommand
hermes chat --continue
hermes chat -c
```

SQLite データベースからいちばん新しい `cli` のセッションを探し出し、その会話履歴をすべて読み込みます。

#### 端末ごとに続ける {#per-terminal-continue}

`-c` だけを付けた場合は、動いている端末を見分けます。CLI のセッションは実行された端末（tty デバイス、tmux のペイン、kitty のウィンドウ、wezterm のペイン、Zellij のペイン、Windows Terminal のセッションなど）をキーにした小さな目印のファイルを `~/.hermes/terminal-sessions/` の下に置きます。*同じ*端末でもう一度 `hermes -c` を実行すると、Hermes はその端末自身のセッションを再開します。並べた 2 つのペインが、どちらも全体でいちばん新しいセッションを掴むのではなく、それぞれ自分の会話を続けられるわけです。その端末の目印がない場合（初めて使うとき、セッションを消したとき、30 日より古い目印のとき）、`-c` はいちばん新しいセッションを再開する動きに戻ります。`-c "name"` と `--resume` は影響を受けません。止めたいときは `config.yaml` で `session.terminal_continue: false` にします。

### 名前で再開する {#resume-by-name}

セッションにタイトルを付けてあれば（下の[セッションに名前を付ける](#session-naming)を参照してください）、名前で再開できます。

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

セッション ID は CLI のセッションを抜けるときに表示され、`hermes sessions list` でも調べられます。

:::note
`latest` は `--resume` の予約語です。文字どおり「latest」というタイトルのセッションも、ID を指定すれば、あるいは `-c latest`（タイトルの一致）で開けます。
:::

### 特定のディレクトリで再開する {#resume-in-a-specific-directory}

`--in <dir>` を渡すと、開始や再開の前にそのディレクトリへ移動します。`--resume latest`（または `-c`）と組み合わせると、そのディレクトリのワークスペースでいちばん新しいセッションが選ばれます。先に `cd` する必要も、セッション ID を覚えておく必要もありません。

```bash
# Resume the latest session that belongs to ./my-project
hermes --resume latest --in ./my-project

# Works with the TUI too
hermes --tui --resume latest --in ./my-project
```

`--in` は、セッションをそのディレクトリに固定もします。再開したセッションに記録されていた作業ディレクトリは復元されません（`--no-restore-cwd` を渡したときと同じです）。

### 再開すると作業ディレクトリも戻ります {#resume-restores-the-working-directory}

CLI のセッションを再開すると、そのセッションに記録された作業ディレクトリ（git リポジトリの根っこ、またはプロジェクトのディレクトリ）へ `cd` し直します。会話が、もともと属していたワークスペースの中で続くようにするためです。いまの場所にとどまりたいときは `--no-restore-cwd` を渡してください。

```bash
hermes --resume 20250305_091523_a1b2c3 --no-restore-cwd
```

移動したことは `↪ restored workspace dir: …` の行で分かります。復元に失敗しても、再開そのものが壊れることはありません。

### ワークスペースでセッションを絞り込む {#filtering-sessions-by-workspace}

`hermes sessions list` は `--workspace <needle>` を受け取り、ワークスペースのキー（git リポジトリの根っこ、なければ作業ディレクトリ）が一致するセッションだけを表示します。パスの一部でも、ディレクトリ名そのものでも照合できます。

```bash
hermes sessions list --workspace my-project
hermes sessions list --workspace ~/code/hermes-agent
```

### 再開したときの振り返り {#conversation-recap-on-resume}

セッションを再開すると、入力を待つ前に、前の会話をまとめた小さなパネルが表示されます。

![Hermes のセッションを再開したときに出る「Previous Conversation」の振り返りパネルのイメージ。](https://hermes-agent.nousresearch.com/img/docs/session-recap.svg)
*再開のときは、直近のユーザーと応答のやり取りをまとめたパネルを見せてから、入力に戻ります。*

この振り返りは次のように動きます。

- **ユーザーのメッセージ**（金色の `●`）と**応答**（緑の `◆`）を表示します
- 長いメッセージは**短く切ります**（ユーザーは 300 文字、応答は 200 文字 / 3 行）
- ツールの呼び出しは**たたんで**件数とツール名にします（例: `[3 tool calls: terminal, web_search]`）
- システムのメッセージ、ツールの結果、内部の思考は**隠します**
- 直近 10 往復で**打ち切り**、「... N earlier messages ...」と示します
- いま進んでいる会話と見分けられるよう、**淡い表示**にします

振り返りをやめて、これまでの 1 行だけの表示に戻したいときは、`~/.hermes/config.yaml` にこう書きます。

```yaml
display:
  resume_display: minimal   # default: full
```

:::tip
セッション ID の形は `YYYYMMDD_HHMMSS_<hex>` です。CLI と TUI のセッションは 6 文字の 16 進数（例: `20250305_091523_a1b2c3`）、ゲートウェイのセッションは 8 文字（例: `20250305_091523_a1b2c3d4`）になります。ID（全体でも、重複しない先頭部分でも）でもタイトルでも再開でき、どちらも `-c` と `-r` で使えます。
:::

## プラットフォームをまたいで引き継ぐ {#cross-platform-handoff}

CLI のセッションで `/handoff <platform>` を使うと、いま進んでいる会話をメッセージングのプラットフォームのホームチャンネルへ移せます。エージェントは CLI で止めたところからそのまま続けます。セッション ID も同じ、発言者の分かる記録もツールの呼び出しも、すべて引き継がれます。

```bash
# Inside a CLI session
/handoff telegram
```

そのとき何が起きるかを見ていきます。

1. CLI は `<platform>` が有効で、ホームチャンネルが設定されていることを確かめます（移す先のチャットで一度 `/sethome` を実行して設定します）。
2. CLI はセッションを引き継ぎ待ちにして、**ゲートウェイを待ち受けます**。エージェントが応答の途中なら断られるので、いまの応答が終わるのを待ってください。
3. ゲートウェイの見張り役が引き継ぎを引き取り、移す先のアダプタへ新しいスレッドを求めます。
   - **Telegram** — 新しいフォーラムのトピックを開きます（そのチャットで Bot API 9.4 以降の Topics モードが有効なら DM のトピック、そうでなければフォーラム型スーパーグループのトピック）。
   - **Discord** — ホームのテキストチャンネルの下に、自動保管まで 1440 分のスレッドを作ります。
   - **Slack** — 起点のメッセージを投稿し、その `ts` をスレッドの錨にします。
   - **WhatsApp / Signal / Matrix / SMS** — スレッドの仕組みがないので、ホームチャンネルへ直接送ります。
4. ゲートウェイは移す先のキーを、いまの CLI のセッション ID に結び直し、確認と要約を求める人工的なユーザーの発言を作ります。その返事が新しいスレッドに届きます。
5. ゲートウェイが成功を知らせると、CLI は `/resume` の案内を出してきれいに終了します。

   ```
   ↻ Handoff complete. The session is now active on telegram.
     Resume it on this CLI later with: /resume my-session-title
   ```

6. ここから先、会話はそのプラットフォームで続きます。新しいスレッドで返事してください。そのチャンネルで許可されている人はみな同じセッションを共有し、あとから本物のユーザーがスレッドで発言しても自然に混ざります。スレッドのセッションは `user_id` を使わずにキーが決まるからです。

**CLI へ戻すには:** 机の前へ戻りたくなったら、`/resume <title>`（またはシェルから `hermes -r "<title>"`）を実行すれば、プラットフォームで止まったところから続けられます。

**うまくいかないとき:**
- ホームチャンネルが未設定 → CLI が `/sethome` の案内を出して断ります。
- ゲートウェイが動いていない（要求を誰も引き取らない）→ CLI は 60 秒で分かりやすいメッセージを出して打ち切り、CLI のセッションはそのまま残ります。
- 移すのに時間がかかる: ゲートウェイが引き取ると、実際のエージェントのやり取りとしてセッション全体をたどり直すので、長いセッションでは数分かかることがあります。CLI は「Still transferring...」と生存を知らせながら最大 15 分待ちます。遅いだけの移動を「ゲートウェイが動いていない」と誤って伝えることはありません。
- スレッドを作れない（権限がない、Topics モードが切）→ ホームチャンネルへ直接送る形に切り替えて、それでも完了します。スレッドとして分かれはしませんが、引き継ぎ自体は成り立ちます。
- `adapter.send` が失敗する（レート制限、一時的な API のエラー）→ 引き継ぎは理由付きで失敗の扱いになります。記録は消えるので、やり直せます。

**知っておきたい制限:** スレッドを作れないプラットフォームで、ホームチャンネルが複数人のグループになっている場合、人工的な発言は DM 形式のセッションとしてキーが決まります。自分あての DM をホームチャンネルにしている（よくある構成の）場合は問題ありませんが、本当に共有しているグループチャットには向きません。スレッドに対応しているのは Telegram / Discord / Slack、つまり圧倒的に多い構成なので、ほとんどの環境ではこの制限に当たりません。

## セッションに名前を付ける {#session-naming}

セッションに人が読めるタイトルを付けておくと、見つけるのも再開するのも楽になります。

### 自動で付くタイトル {#auto-generated-titles}

Hermes は最初のやり取りのあと、セッションごとに短い説明的なタイトル（3〜7 語）を自動で作ります。これは軽い補助モデルを使って裏側のスレッドで動くので、待ち時間は増えません。`hermes sessions list` や `hermes sessions browse` でセッションを眺めると、自動で付いたタイトルが見えます。

自動のタイトル付けはセッションにつき一度だけで、自分でタイトルを付けてあるときは飛ばされます。

### 自分でタイトルを付ける {#setting-a-title-manually}

チャットのセッション（CLI でもゲートウェイでも）の中で `/title` コマンドを使います。

```
/title my research project
```

タイトルはすぐに反映されます。まだデータベースにセッションが作られていない場合（最初のメッセージを送る前に `/title` を実行した場合など）は待ち行列に入り、セッションが始まった時点で反映されます。

既存のセッションはコマンドラインからも名前を変えられます。

```bash
hermes sessions rename 20250305_091523_a1b2c3d4 "refactoring auth module"
```

### タイトルの決まり {#title-rules}

- **重複しないこと** — 2 つのセッションが同じタイトルを持つことはできません
- **最大 100 文字** — 一覧の表示を読みやすく保つためです
- **無害化されます** — 制御文字、幅ゼロの文字、右から左へ書かせる指定は自動で取り除かれます
- **普通の Unicode なら問題ありません** — 絵文字も、漢字かなも、アクセント付きの文字も使えます

### 圧縮したときの自動の枝分かれ {#auto-lineage-on-compression}

セッションのコンテキストが圧縮されると（`/compress` を自分で実行しても、自動で走っても）、Hermes は続きのセッションを新しく作ります。元にタイトルが付いていれば、新しいセッションには番号付きのタイトルが自動で付きます。

```
"my project" → "my project #2" → "my project #3"
```

名前で再開する（`hermes -c "my project"`）と、その系列でいちばん新しいセッションが自動で選ばれます。

### メッセージングのプラットフォームでの /title {#title-in-messaging-platforms}

`/title` コマンドは、ゲートウェイのすべてのプラットフォーム（Telegram、Discord、Slack、WhatsApp）で使えます。

- `/title My Research` — セッションのタイトルを決めます
- `/title` — いまのタイトルを表示します

## セッションを管理するコマンド {#session-management-commands}

Hermes は `hermes sessions` として、セッション管理のコマンドをひととおり用意しています。

### セッションの一覧 {#list-sessions}

```bash
# List recent sessions (default: last 20)
hermes sessions list

# Filter by platform
hermes sessions list --source telegram

# Show more sessions
hermes sessions list --limit 50
```

タイトルの付いたセッションがあるときは、タイトル・冒頭・相対的な時刻が表示されます。

```
Title                  Preview                                  Last Active   ID
────────────────────────────────────────────────────────────────────────────────────────────────
refactoring auth       Help me refactor the auth module please   2h ago        20250305_091523_a
my project #3          Can you check the test failures?          yesterday     20250304_143022_e
—                      What's the weather in Las Vegas?          3d ago        20250303_101500_f
```

どのセッションにもタイトルがないときは、もっと簡単な形になります。

```
Preview                                            Last Active   Src    ID
──────────────────────────────────────────────────────────────────────────────────────
Help me refactor the auth module please             2h ago        cli    20250305_091523_a
What's the weather in Las Vegas?                    3d ago        tele   20250303_101500_f
```

### セッションを書き出す {#export-sessions}

`hermes sessions export` は書き出しの窓口を 1 つにまとめたもので、形式は `--format` で選びます。

| 形式 | 出力 | 使いどころ |
|--------|--------|------------|
| `jsonl`（既定） | セッション 1 つにつき JSON オブジェクト 1 件 | バックアップ、機械での往復 |
| `md` / `qmd` | セッション 1 つにつき Markdown / Quarto のファイル 1 つ + 目録 | 読める保管、メモ |
| `html` | それだけで完結する 1 枚のページ（複数セッションのときはサイドバー付き） | 共有、閲覧 |
| `trace` | Claude Code の JSONL | HF Agent Trace Viewer、`--upload` |

さらに `--only user-prompts` を付けると、プロンプトだけを取り出せます（jsonl か md）。

どの形式でも、選び方のつまみは共通です。1 つのセッションなら `--session-id`、まとめて扱うなら `prune` / `archive` と同じ絞り込みの一式が使えます。`--older-than` / `--newer-than` / `--before` / `--after`（`5h` / `2d` / `1w` のような長さ、数字だけの日数、ISO の時刻）、`--source`、`--title`、`--model`、`--provider`、`--cwd`、`--min/--max-messages`、`--min/--max-tokens`、`--min/--max-cost`、`--min/--max-tool-calls`、`--user`、`--chat-id`、`--chat-type`、`--branch`、`--end-reason` です。`--dry-run` は書き出さずに、当てはまるものだけを見せます。`--redact` はどの形式でも、書き出す内容から秘密（API キー、トークン、資格情報）を消します。人に渡すつもりのものには付けることを勧めます。なお、まとめての絞り込みは*終わった*セッションが対象です。絞り込みなしの `export` は、動いているものも含めて全部を吐き出します。

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

書き出されたファイルは 1 行につき 1 つの JSON オブジェクトで、セッションの情報とすべてのメッセージが入っています。

#### HTML {#html}

`--format html` は、外部に何も頼らない 1 枚完結の HTML ファイルを書き出します。装飾されたメッセージの吹き出し、たためるツールの出力、そして（複数セッションを書き出したときは）セッションを行き来するサイドバーが付きます。

```bash
# One session as a standalone HTML page
hermes sessions export --format html --session-id 20250305_091523_a1b2c3d4 transcript.html

# All Telegram sessions from the last week in one file, secrets redacted
hermes sessions export --format html --newer-than 1w --source telegram --redact archive.html
```

#### プロンプトだけ {#prompts-only}

`--only user-prompts` は、自分が書いたプロンプトだけを書き出します。応答もツールの出力もシステムの文脈も入りません。プロンプトの蓄えを作ったり、何を頼んだかを見返したりするのに向きます。

```bash
# One JSONL record per prompt (session id, index, timestamp, text)
hermes sessions export prompts.jsonl --session-id 20250305_091523_a1b2c3d4 --only user-prompts

# Markdown, straight to stdout
hermes sessions export - --session-id 20250305_091523_a1b2c3d4 --only user-prompts --format md
```

`--format jsonl`（既定）でも `md` でも使え、まとめて書き出すときは同じ絞り込みが効き、`--redact` とも組み合わせられます。

#### トレース（HF Agent Trace Viewer） {#traces-hf-agent-trace-viewer}

`--format trace` は Claude Code の JSONL を出します。Hugging Face Hub が [Agent Trace Viewer](https://huggingface.co/docs/hub/agent-traces) 用に自動で見分ける記録の形です。手元に書き出してもよいですし、`--upload` を付ければ自分の非公開の `hermes-traces` データセットへ送れます（`HF_TOKEN` を読みます）。

```bash
# Trace of the most recent session, to stdout
hermes sessions export --format trace

# One session to a local trace file
hermes sessions export --format trace --session-id 20250305_091523_a1b2c3d4 trace.jsonl

# Upload straight to your private HF traces dataset
hermes sessions export --format trace --session-id 20250305_091523_a1b2c3d4 --upload
```

トレースの書き出しは、既定で秘密が伏せられます（端末の外へ出ることが前提だからです）。自分の目で確かめたうえで `--no-redact` を付ければ、伏せずに出せます。`--upload` は `--public` を付けない限り非公開です。絞り込みを付けてまとめて書き出すと、セッションごとに `<id>.trace.jsonl` が 1 つずつできます。

#### Markdown / QMD {#markdown-qmd}

古いセッションを隠したり消したりする前に、読める形でファイルに残しておきたいときは `--format md` か `--format qmd` を使います。Markdown / QMD の書き出しは、セッションごとに 1 つのファイルをディレクトリ（既定は `~/.hermes/session-exports`）へ書きます。

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

Markdown / QMD の書き出しは、セッション 1 つにつき `.md` か `.qmd` のファイルを 1 つと、ファイルのパス・メッセージ数・系列の ID・SHA-256 を収めた `manifest.jsonl` を書きます。まとめての書き出しには絞り込みが最低 1 つ必要で、素のままのまとめ書き出しは断られます。`--delete-after-verified` はあえて `--session-id` のときだけに限られ、`--yes` も必要です。親のセッションを消すと、その委任先やサブエージェントのセッションも消えるため、このモードでは委任先を 1 つずつ別のファイルへ書き出して確かめてから、削除に進みます。書き出しの途中で委任先の顔ぶれが変わった場合、削除は断られます。`--redact` は書く前に、メッセージの内容とツールの出力から秘密（API キー、トークン、資格情報）を消します。人に渡すつもりの書き出しには付けることを勧めます。

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

そのタイトルを他のセッションがすでに使っている場合は、エラーが表示されます。

### セッションを留める {#pin-a-session}

留めておくと「残す」という印が続きます。留めたセッションは
`sessions.auto_archive` の古いものを片付ける掃除の対象から外れ、一覧に必ず出ます。これはデスクトップのサイドバーの
Pinned の欄が使うのと同じ印なので、どちらから留めても両方に反映されます。

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

### 古いセッションを片付ける {#prune-old-sessions}

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

時間の値（`--older-than`、`--newer-than`、`--before`、`--after`）は、長さ
（`5h`、`30m`、`2d`、`1w`）、数字だけの日数、ISO の時刻
（`2026-07-05`、`2026-07-05 14:30`）のいずれかを受け取ります。`--older-than` と `--before` は上限を、`--newer-than` と `--after` は下限を決めます。
`--older-than` と `--newer-than` の組は最後のメッセージの時刻を見ます（メッセージのないセッションではセッションの開始に戻ります）。`--before` と `--after` は明確にセッションの開始時刻を使います。どちらの組も、2 つ合わせれば範囲になります。

属性による絞り込みには次があります。`--source`（プラットフォーム、完全一致）、`--title` / `--model` /
`--branch`（大文字小文字を区別しない部分一致）、`--provider`（課金元のプロバイダ、完全一致）、`--end-reason`、`--user`、`--chat-id`、`--chat-type`（完全一致）、
`--cwd`（パスの先頭一致）、そして数の範囲として `--min/--max-messages`、
`--min/--max-tokens`（入力 + 出力）、`--min/--max-cost`（米ドル。実費があればそれを、なければ見積もりを使います）、`--min/--max-tool-calls` です。どれか 1 つでも絞り込みを使うと、暗黙の 90 日の既定が外れます。そのため `hermes sessions prune --source cron` や
`--model gpt-4o` はすべての古さのものに当たります。狭めたいときは時間の指定を足してください。90
日の区切りが残るのは、まったく素の `hermes sessions prune` だけです。`--yes` を付けずに実行すると、確認を求める前に、当てはまる件数といちばん古いもの・いちばん新しいものが表示されます。

保管済みのセッションは既定で飛ばされます。まとめて消したいときは `--include-archived` を渡してください。

:::info
片付けの対象になるのは**終わった**セッション（明示的に終えたか、自動でリセットされたもの）だけです。動いているセッションが消されることはありません。
:::

### セッションをまとめて保管する {#bulk-archive-sessions}

何も消さずに一覧から外したいときは、`hermes sessions archive` を使います。`prune`
と同じ絞り込みを取りますが、当てはまるセッションを消さずにそっと隠します（デスクトップやダッシュボードの画面から 1 つずつ保管するときと同じ印を立てるので、メッセージも検索もそのまま残ります）。

```bash
# Archive everything from the last 5 hours (e.g. 75 CI smoke-test sessions)
hermes sessions archive --newer-than 5h

# Archive by title substring, preview first
hermes sessions archive --title "dry run" --dry-run
hermes sessions archive --title "dry run" --yes
```

絞り込みは最低 1 つ必要です。素の `hermes sessions archive` は、履歴の全部を保管することを拒みます。保管したセッションは
`hermes sessions list` と `/resume` からは見えなくなりますが、データベースには残り、デスクトップやダッシュボードのセッション一覧から戻せます。

### セッションの統計 {#session-statistics}

```bash
hermes sessions stats
```

出力はこうなります。

```
Total sessions: 142
Total messages: 3847
  cli: 89 sessions
  telegram: 38 sessions
  discord: 15 sessions
Database size: 12.4 MB
```

トークンの使用量、費用の見積もり、ツールの内訳、活動の傾向といったもっと踏み込んだ分析には [`hermes insights`](/hermes/docs/reference/cli-commands/#hermes-insights) を使ってください。

### 迷子になったゲートウェイのセッションを直す {#repair-stranded-gateway-sessions}

再起動のあとにゲートウェイの会話が「時間を巻き戻す」ように見えたら（最近のやり取りがなかったかのように、何日も前の話題を再開してしまう）、いま進んでいる会話が、振り分けの手がかりを失ったセッションの行に取り残されているのかもしれません（v0.21
のセッション継続の作業で直された種類の壊れ方です。いまの版は構造上そうならないようにし、動いている最中に自分で直します）。

`hermes sessions repair-routing` は、メッセージを持っているのに振り分けの手がかりがないセッションの行を見つけ、それぞれを続きであるはずの会話へつなぎ直します。ただし、手がかりに曖昧さがないときだけです。

```bash
# Report only — shows each orphan, the proposed adoption, and the evidence
hermes sessions repair-routing

# Perform the adoptions (stop the gateway first — a running gateway holds
# the old routing in memory and would write it back over the repair)
hermes sessions repair-routing --apply

# Widen/narrow the contiguity window (default 900 seconds)
hermes sessions repair-routing --max-gap-seconds 300
```

手がかりの決まりは 2 つです。

- **系列** — 迷子の行の `parent_session_id` が、同じプラットフォームのキーを持つ行を指している
  （記録された事実なので、時間の幅は関係ありません）
- **つながり** — 同じプラットフォームでキーを持つ行のうち、ちょうど 1 つが、迷子の行が始まる前後の
  幅の中で静かになっている

曖昧なもの（前の行の候補が 2 つある、2 つの迷子が同じ行を主張している）は理由とともに報告され、手は付けられません。つなぎ先を間違えると、ある会話が別のチャットへ継ぎ足されてしまうからです。置き換えられた行は
`superseded_by_repair` として退役するので、再起動時の復旧でよみがえることはありません。

この修復はあえて**自動では**行いません。そのチャットにすでに 2 つ目の履歴ができている場合、どちらの流れの続きなのかを決めるのはあなたの判断です。取り残された会話は、どちらにしても `/resume`
とセッション検索から読めます。修復が変えるのは振り分けだけです。先にバックアップを取ってください
（`cp ~/.hermes/state.db ~/.hermes/state.db.bak`）。

## Claude Code と Codex CLI からセッションを取り込む {#importing-sessions-from-claude-code-and-codex-cli}

別のエージェントの CLI で会話を始めていたなら、それを Hermes
に取り込んで続きをここでできます。Hermes は Claude Code のセッションのログ
（`~/.claude/projects/`）と Codex CLI の記録（`~/.codex/sessions/`）を読みます。よそのファイルは読むだけで、書き換えることはありません。

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

`hermes sessions import` は
`Imported from Claude Code: <first user message>`（Codex CLI からなら Codex CLI）というタイトルの新しい
Hermes セッションを作り、その ID と、そのまま貼れる `hermes --resume <id>` のコマンドを表示します。
`--resume @claude` と `--resume @codex` は同じ選択画面を出し、取り込んだ会話へ直接連れていきます。

引き継がれるのは、順序を保ったユーザーと応答の会話です。ツールの動きは応答の中の短い `[ran tool: …]`
という注記にまとめられます。システムプロンプト、差し込まれた文脈、思考の記録、ツールの生の出力は残しません。取り込みは、1 バイトずつの再現ではなく、すっきりした記録です。

## セッション検索のツール {#session-search-tool}

エージェントには `session_search` というツールが最初から備わっており、SQLite の FTS5 エンジンを使って過去のすべての会話を全文検索し、見つけたセッションの中を前後へたどれます。LLM の呼び出しは一切なく、要約を作るのではなく、データベースにある実際のメッセージを見せます。

### 4 つの呼び方 {#four-calling-shapes}

このツールは、どの引数を渡したかで何をしたいのかを判断します。`mode` のようなパラメータはありません。

**1. 見つける — `query` を渡す:**

```python
session_search(query="auth refactor", limit=3)
```

FTS5 で検索し、当たったものをセッションの系列でまとめ、上位 N 件のセッションを返します。この呼び方は既定で、詳しさを場合に応じて変えます。いちばん順位の高い結果には前後の窓と会話の両端が付き、順位の低い結果は簡素なままです。すべての結果を厚くしたいときは `detail="full"` を渡します。

結果にはそれぞれ次が入っています。

- `session_id`、`title`、`when`、`source`
- `snippet` — FTS5 が一致部分を強調した抜粋
- `detail` — `full` か `compact`
- `bookend_start` / `bookend_end` — 厚い結果では、最初と最後のユーザー + 応答のメッセージ 3 件ずつ。簡素な結果では空
- `messages` — 厚い結果では FTS5 が当てた箇所の前後 5 件。簡素な結果では、印を付けた 1 件だけ
- `match_message_id`、`messages_before`、`messages_after`

いちばん上の結果は、目的 → 一致 → 決着の流れをその場で組み立ててくれます。別の簡素な結果のほうが望みがありそうなら、そのセッションとメッセージの ID を使って「たどる」呼び方に移ります。実際のセッションのデータベースでも、かかる時間はふつう数十ミリ秒です。

**2. たどる — `session_id` と `around_message_id` を渡す:**

```python
session_search(session_id="20260510_174648_805cc2", around_message_id=590803, window=10)
```

指定した位置を中心に、前後 `window` 件のメッセージを返します。FTS5 も両端も使わず、その一切れだけです。前後 5 件という既定の窓より広く見たいとき、見つける呼び方のあとに使います。

- **先へ**たどるには、`messages[-1].id` を `around_message_id` として渡します
- **前へ**たどるには、`messages[0].id` を `around_message_id` として渡します
- 境目のメッセージはどちらの窓にも現れ、位置の目印になります
- `messages_before` や `messages_after` が `window` より小さければ、セッションの端に来ています

かかる時間は、たどる呼び出し 1 回につきふつう 1〜2 ミリ秒です。

**3. 読む — 位置を指定せず `session_id` だけを渡す:**

```python
session_search(session_id="20260510_174648_805cc2")
```

セッション全体を返します。大きなセッションでは、頭と末尾に限った眺めになります。この呼び方は
`@session:<profile>/<id>` のリンクを解決するのにも使われます。

**4. 眺める — 引数なし:**

```python
session_search()
```

最近のセッションを時間順に返します（タイトル、冒頭、時刻）。ユーザーが話題を挙げずに「何をやってたっけ」と聞いたときに役立ちます。

### FTS5 のクエリの書き方 {#fts5-query-syntax}

キーワードでの検索は、FTS5 の標準的な書き方に対応しています。

- 単純なキーワード: `docker deployment`（FTS5 は既定で AND です）
- 語句: `"exact phrase"`
- 論理演算: `docker OR kubernetes`、`python NOT java`
- 前方一致: `deploy*`

### 追加のパラメータ {#optional-parameters}

- `sort` — FTS5 の順位付けの上に `newest` か `oldest` を重ねます。関連度だけで並べたいときは省きます（既定です。探りながら思い出すのに向きます）。「X はどこまでやったか」には `newest`、「X はどう始まったか」には `oldest` を使ってください。
- `detail` — `adaptive`（既定）は、見つける呼び方のいちばん上の結果だけを厚くします。`full` はすべての結果を厚くします。
- `role_filter` — 含める役割をカンマ区切りで指定します。見つける呼び方の既定は `user,assistant` です（ツールの出力はたいてい雑音になります）。ツールの出力も含めたいときは `user,assistant,tool` を（ツールの挙動を調べるとき）、ツールの出力だけを探したいときは `tool` を渡します。

### いつ使われるか {#when-its-used}

エージェントは、セッション検索を自分から使うように促されています。

> *「過去の会話にあるものをユーザーが持ち出したときや、関わりのある文脈が前にあったと思われるときは、同じことを言わせる前に session_search で思い出すこと。」*

きっかけになりやすいのは「前にもやった」「あのときの」「この前」「さっき言ったとおり」といった言い方や、いまの窓に入っていないプロジェクト・人・概念への言及です。

## プラットフォームごとのセッションの追跡 {#per-platform-session-tracking}

### ゲートウェイのセッション {#gateway-sessions}

メッセージングのプラットフォームでは、メッセージの発生元から決まる一意なセッションキーでセッションが管理されます。

| チャットの種類 | 既定のキーの形 | 動き |
|-----------|--------------------|----------|
| Telegram の DM | `agent:main:telegram:dm:<chat_id>` | DM のチャットごとに 1 セッション |
| Discord の DM | `agent:main:discord:dm:<chat_id>` | DM のチャットごとに 1 セッション |
| WhatsApp の DM | `agent:main:whatsapp:dm:<canonical_identifier>` | DM の相手ごとに 1 セッション（対応付けがあれば LID と電話番号の別名は 1 人にまとまります） |
| グループチャット | `agent:main:<platform>:group:<chat_id>:<user_id>` | プラットフォームがユーザー ID を出す場合、グループの中で人ごとに分かれます |
| グループのスレッド / トピック | `agent:main:<platform>:group:<chat_id>:<thread_id>` | スレッドの参加者全員で 1 つのセッションを共有します（既定）。`thread_sessions_per_user: true` にすると人ごとに分かれます。 |
| チャンネル | `agent:main:<platform>:channel:<chat_id>:<user_id>` | プラットフォームがユーザー ID を出す場合、チャンネルの中で人ごとに分かれます |

共有のチャットで参加者の識別子を取れないときは、その部屋で 1 つのセッションを共有する形に落ちます。

### グループのセッションを共有するか分けるか {#shared-vs-isolated-group-sessions}

Hermes は既定で `config.yaml` の `group_sessions_per_user: true` を使います。つまり次のようになります。

- Alice と Bob は、同じ Discord のチャンネルで会話の記録を共有せずに Hermes と話せます
- 誰かの長いツール中心の仕事が、他の人のコンテキストの窓を汚しません
- 割り込みの扱いも人ごとに分かれます。動いているエージェントのキーが、分かれたセッションのキーと一致するからです

代わりに「部屋にひとつの頭脳」を持たせたいときは、こう設定します。

```yaml
group_sessions_per_user: false
```

これで、グループやチャンネルは部屋につき 1 つの共有セッションに戻ります。会話の文脈は共有されますが、トークンの費用も、割り込みの状態も、コンテキストのふくらみも共有されます。

### セッションのリセットの方針 {#session-reset-policies}

**ゲートウェイのセッションは既定では自動でリセットされません**（`mode: none`）。`config.yaml` の
`session_reset` の節で、自動のリセットを選べます。

- **none** — 自動でリセットしません（既定。コンテキストは `/reset` と圧縮で管理します）
- **idle** — 何もない状態が N 分続いたらリセットします
- **daily** — 毎日決まった時刻にリセットします
- **both** — idle と daily の早いほうでリセットします

自動でリセットされる前に、エージェントには会話から大事な記憶やスキルを保存するための 1 手番が与えられます。

**裏で動いている処理がある**セッションは、方針にかかわらず自動でリセットされません。

### 落ちたときと再起動したときの続き {#continuity-after-crashes-and-restarts}

ゲートウェイのチャットは、あなたが自分で `/new`（または `/reset`）を実行するまで、伸びるたびに何度も圧縮されながら続く**1 つのセッション**として設計されています。これはゲートウェイが落ちても、再起動しても、更新しても保たれます。

- セッションの手がかり（振り分けのキー、チャット、発生元）は、セッションの行が作られるときに
  **不可分に**書かれます。どの作られ方（`/new`、最初のメッセージ、`/branch` で分かれた子）でも同じです。この書き込みに失敗しても、
  次のやり取りで振り分けが更新されるときに自動で直ります。
- 再起動のあと、ゲートウェイは各チャットを**実際の活動**がいちばん新しいセッションへ結び直します。古くて放置された行が、
  あなたが本当に交わしていた会話に勝つことはありません。
- 復旧は **`/new` の区切りを尊重します**。そのチャットのいちばん新しい出来事が意図的なリセットなら、
  その手前まで遡って古いセッションをよみがえらせるのではなく、まっさらから始めます。復旧したセッションは
  実際に空いていた時間も引き継ぐので、idle や daily のリセットを選んでいる場合も、復旧したセッションを
  すべて真新しいものとして扱うのではなく、正しく適用されます。

## 保存される場所 {#storage-locations}

| 何が | パス | 説明 |
|------|------|-------------|
| SQLite データベース | `~/.hermes/state.db` | すべてのセッション情報とメッセージ、FTS5 付き |
| ゲートウェイのメッセージ    | `~/.hermes/state.db`   | SQLite。すべてのセッションのメッセージの正本です |
| ゲートウェイの振り分けの索引 | `~/.hermes/state.db` の `gateway_routing` テーブル | セッションキーを、動いているセッション ID へ対応付けます（発生元の情報、期限の印） |
| 古い振り分けの写し | `~/.hermes/sessions/sessions.json` | 振り分けの索引の後方互換用の写し。`gateway.write_sessions_json: true`（既定）のときに書かれます |

SQLite データベースは、読み手が同時にいて書き手が 1 人という WAL モードを使っています。ゲートウェイが複数のプラットフォームを抱える作りによく合います。

:::warning `sessions.json` はセッションの一覧ではありません
ゲートウェイの振り分けの索引は、`state.db` の中の `gateway_routing`
テーブルにあります。`~/.hermes/sessions/sessions.json` はその**古い写し**で、後方互換のために残されています（`gateway.write_sessions_json: false` で止められます）。メッセージングのセッションキー
（`agent:main:<platform>:...`）を、動いているセッション ID へ対応付けるものです。
中にはゲートウェイ（メッセージング）の項目しか入らないので、メッセージングのプラットフォームを使っていれば、そればかりが見えます（たとえば `agent:main:whatsapp:dm:...`）。

これは**そういうもの**で、CLI のセッションが失われたという意味では**ありません**。
`hermes sessions list`、`/sessions`、ダッシュボードはどれも `state.db` を読み、そこには
**すべての**セッション（CLI、TUI、ゲートウェイ）が入っています。`~/.hermes/sessions/saved/*.json` にある
`/save` のスナップショットは、索引ではなく手軽な書き出しです。

CLI のセッションが本当に `hermes sessions list` に出てこないなら、原因は
`state.db` がそれを受け取れていないことです。`hermes sessions repair` を実行し、CLI の起動時に
`⚠ Session store unavailable` の警告が出ていないか見てください。出ていれば、その実行では SQLite への保存が失敗しています。
:::

:::note 古い JSONL の記録
state.db が正本になる前に作られたセッションは、`~/.hermes/sessions/` に
`*.jsonl` のファイルを残していることがあります。いまの Hermes は書きも読みもしません。対応するセッションが
state.db にあることを確かめたら、消して構いません。
:::

### データベースの構造 {#database-schema}

`state.db` の主なテーブルです。

- **sessions** — セッションの情報（id、source、user_id、model、title、時刻、トークン数）。タイトルには重複を許さない索引が付いています（NULL は許され、NULL でないものだけが重複してはいけません）。
- **messages** — メッセージ履歴のすべて（role、content、tool_calls、tool_name、token_count）
- **messages_fts** — メッセージの内容を全文検索するための FTS5 の仮想テーブル

## セッションの期限と片付け {#session-expiry-and-cleanup}

### 自動の片付け {#automatic-cleanup}

- ゲートウェイのセッションは、設定したリセットの方針に従って自動でリセットされます
- リセットの前に、エージェントは終わろうとしているセッションから記憶とスキルを保存します
- 自動の片付け（#54189 以降、**既定で有効**）: `sessions.auto_prune` が `true` のとき、`sessions.retention_days`（既定は 90）のあいだ動きのなかった終わったセッションが、CLI・ゲートウェイ・cron の起動時に片付けられます
- 実際に行が消えた片付けのあと、`state.db` はディスクを取り戻すために `VACUUM` されますが、それは**両方**の条件を満たしたときだけです。前回うまくいった `VACUUM` から少なくとも `sessions.min_vacuum_interval_days`（既定は 30）が経っていること、**かつ**ファイルのページの 25% 超が取り戻せる状態であること（`PRAGMA freelist_count / page_count`）。詰まったデータベースが、数 MB を取り戻すために全体の書き直しを払うことはありません（SQLite はただの DELETE ではファイルを縮めません）
- 片付けは `sessions.min_interval_hours`（既定は 24）につき多くても 1 回です。最後に走った時刻は `state.db` の中に記録されるので、同じ `HERMES_HOME` のすべての Hermes のプロセスで共有されます

片付けをしないと `state.db` は際限なく育ちます。ゲートウェイと cron を入れた環境では、数週間で数 GB になったという報告があります。終わったセッションをすべて永久に残したい（#54189 より前の動きにしたい）なら、`~/.hermes/config.yaml` で止めてください。

```yaml
sessions:
  auto_prune: false         # default is true — set false to keep all history
  retention_days: 90        # keep ended sessions active within this window
  vacuum_after_prune: true  # reclaim disk space after a pruning sweep
  min_vacuum_interval_days: 30 # don't rewrite the DB more often than this
  min_interval_hours: 24    # don't re-run the sweep more often than this
```

これらの項目をすでに明示的に設定してある環境は、その値をそのまま保ちます。新しい既定に切り替わるのは、設定していない項目だけです。

消えるのは**終わった**セッションだけです。動いているセッションは、どれだけ古くても自動で片付けられることはありません。終わったセッションは最後のメッセージからの経過で数えるので、始まりが保持の期間より前だというだけで、最近まで使っていた長い会話が消えることはありません。

**自動化から残る、開いたままのセッション。** cron
のジョブ、カンバンのワーカー、サブエージェント、一回きりの CLI
の実行といった作り手は、セッションを終わったと記さないまま死ぬことがあり、片付けが消すのは*終わった*行だけです。それが永久に積み上がらないよう、自動の片付けのたびに、状態を持つ発生元
（`cli`、`cron`、`kanban`、`acp`、`api_server`、
`subagent`、`tool`）から生まれた開いたままのセッションのうち、最後の動きが `retention_days`
より古いものを*閉じます*（`end_reason: startup_orphan_reap`）。閉じるのは何も壊さない操作で、そのセッションは再開できるままです。行は閉じた時点から数え直されるので、消えるのは保持の期間をもう一度またいだ*あとの*回です。メッセージングのプラットフォームのセッション（Telegram、Discord など）、TUI やデスクトップのセッション、留めてあるセッション、いま応答中や圧縮中のセッションは、この掃除で閉じられることはありません。

### 大きすぎる記録への歯止め {#oversized-transcript-guards}

暴走した記録が一度にメモリへ読み込まれないよう、2 つの上限があります（どちらも既定は動いているメッセージ `20000` 件。`0` にすると外れます）。

```yaml
sessions:
  max_resume_messages: 20000   # interactive resume (CLI / TUI / Desktop)
  max_export_messages: 20000   # one-shot in-memory export of a single session
```

`max_resume_messages` が抑えるのは**再開が実際に読み込む量**であって、会話の履歴の全部ではありません。

- ふつうの対話的な再開（CLI の `--resume`、TUI）は、圧縮の系列を丸ごと形にします。圧縮された区間の
  すべてと、いま生きている先端です。つまり系列全体で抑えられます。
- デスクトップの冷えた状態からの再開は、記録を REST 越しにページ単位で取り、メモリには生きている先端の
  区間しか持ちません。つまり先端だけで抑えられます。何度も圧縮された長寿の会話（数十の区間、小さな先端の
  後ろに何万もの保管された行）は、まさに圧縮が生み出すべきものであり、普通に開きます。画面下部のメッセージ数は、
  いまのプロンプトではなく、保存された系列を映しています。

再開が断られると、クライアントには件数と、どの範囲で測ったのか（`across its lineage` か
`in its tip segment`）を添えたエラーコード `4130` が返ります。そうしたセッションでも `hermes sessions export` は使えます。

### 手での片付け {#manual-cleanup}

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
データベースの育ち方はゆるやかで（数百のセッションで 10〜15 MB ほど）、セッションの履歴は `session_search` が過去の会話を思い出す力の源になるため、自動の片付けは無効の状態で配られています。ゲートウェイや cron を重く回していて、`state.db` が本当に速度に響いている場合は有効にしてください（実際にあった例では、およそ 1000 セッションで 384 MB になった state.db が、FTS5 への書き込みと `/resume` の一覧表示を遅くしていました）。自動の掃除を入れずに一度だけ片付けたいときは `hermes sessions prune` を使ってください。
:::
