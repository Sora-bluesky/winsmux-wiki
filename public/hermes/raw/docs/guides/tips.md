---
title: "コツとベストプラクティス"
description: "Hermes Agent を最大限に活かすための実践的なアドバイス。プロンプトのコツ、CLI のショートカット、コンテキストファイル、メモリ、コスト最適化、セキュリティ"
upstream_path: guides/tips.md
upstream_blob: 693bcaaf4208e0b449382af3d3f6282758192871
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/tips
---

# コツとベストプラクティス {#tips-best-practices}

Hermes Agent をすぐに使いこなせるようになる、実践的なコツを集めました。節ごとに切り口が違うので、見出しを眺めて必要なところへ飛んでください。

:::tip どのモデルを選べばいいか迷ったら
`hermes setup --portal` を実行してください。Claude、GPT-5、Gemini を含む 300 以上のモデルが、ひとつの購読でまとめて使えます。[Nous Portal](/hermes/docs/integrations/nous-portal/) をご覧ください。
:::

---

## いい結果を引き出す {#getting-the-best-results}

### してほしいことを具体的に書く {#be-specific-about-what-you-want}

あいまいなプロンプトからは、あいまいな結果しか返ってきません。「コードを直して」ではなく、「`api/handlers.py` の 47 行目の TypeError を直してほしい。`process_request()` が `parse_body()` から `None` を受け取っている」と書きましょう。渡す情報が多いほど、やり取りの往復は減ります。

### 前提を先に渡す {#provide-context-up-front}

依頼の冒頭に、必要な情報をまとめて置いてください。ファイルのパス、エラーメッセージ、期待する動き。よく練った 1 通は、3 往復の確認より早く着きます。エラーのトレースバックはそのまま貼って構いません。エージェントが読み解きます。

### 毎回言うことはコンテキストファイルに書く {#use-context-files-for-recurring-instructions}

「インデントはタブで」「テストは pytest」「API は `/api/v2` にある」といった同じ指示を毎回打ち込んでいるなら、`AGENTS.md` にまとめてください。エージェントはセッションのたびに自動で読みます。一度書けば、あとは手間がかかりません。

### ツールはエージェントに使わせる {#let-the-agent-use-its-tools}

一手ずつ手を引く必要はありません。「`tests/test_foo.py` を開いて、42 行目を見て、それから……」ではなく、「落ちているテストを見つけて直して」と伝えましょう。エージェントはファイル検索、ターミナル、コード実行を持っています。自分で探して試させてください。

### 込み入った手順にはスキルを使う {#use-skills-for-complex-workflows}

やり方を長々と説明するプロンプトを書き始める前に、それ用のスキルがすでにないか確かめましょう。`/skills` と打てば使えるスキルを一覧でき、`/axolotl` や `/github-pr-workflow` のように直接呼び出すこともできます。

## CLI を使いこなすコツ {#cli-power-user-tips}

### 複数行の入力 {#multi-line-input}

**Alt+Enter**、**Ctrl+J**、**Shift+Enter** のいずれかで、送信せずに改行を入れられます。`Shift+Enter` が効くのは、端末がこれを独立したキー入力として送る場合だけです（Kitty / foot / WezTerm / Ghostty は標準で対応、iTerm2 / Alacritty / VS Code のターミナルは Kitty キーボードプロトコルを有効にすると対応します）。残りの 2 つはどの端末でも使えます。

### 貼り付けの自動判別 {#paste-detection}

CLI は複数行の貼り付けを自動で見分けます。コードブロックやエラーのトレースバックをそのまま貼っても、行ごとに別々のメッセージとして送られることはありません。まとめて 1 通として送られます。

### 割り込んで方向を変える {#interrupt-and-redirect}

**Ctrl+C** を 1 回押すと、応答の途中でエージェントを止められます。そのまま新しいメッセージを打てば、別の方向へ向かわせられます。2 秒以内に 2 回押すと強制終了します。エージェントが見当違いの道へ進み始めたときに、これが効きます。

### `-c` でセッションを再開する {#resume-sessions-with--c}

前のセッションで言い忘れたことがありますか。`hermes -c` を実行すると、会話の履歴をそのまま復元して、中断したところから再開できます。`hermes -r "my research project"` のようにタイトルを指定して再開することもできます。

### クリップボードの画像を貼る {#clipboard-image-paste}

**Ctrl+V** で、クリップボードの画像をそのままチャットに貼り付けられます。エージェントは視覚機能でスクリーンショット、図、エラーのポップアップ、UI のモックアップを読み取ります。いったんファイルに保存する必要はありません。

### スラッシュコマンドの補完 {#slash-command-autocomplete}

`/` と打って **Tab** を押すと、使えるコマンドが一覧で出ます。組み込みのコマンド（`/compress`、`/model`、`/title`）も、インストール済みのスキルも全部含まれます。覚えておく必要はありません。Tab の補完がやってくれます。

:::tip
`/verbose` を使うと、ツールの出力表示を **off → new → all → verbose** の順に切り替えられます。「all」はエージェントの動きを眺めるのに向いていて、単純な質疑応答なら「off」がいちばんすっきりします。
:::

## コンテキストファイル {#context-files}

### AGENTS.md: プロジェクトの頭脳 {#agentsmd-your-projects-brain}

プロジェクトのルートに `AGENTS.md` を作り、設計上の判断、コーディング規約、そのプロジェクト固有の指示を書いてください。これはセッションごとに自動で読み込まれるので、エージェントは常にプロジェクトの決まりごとを把握した状態になります。

```markdown
# Project Context
- This is a FastAPI backend with SQLAlchemy ORM
- Always use async/await for database operations
- Tests go in tests/ and use pytest-asyncio
- Never commit .env files
```

### SOUL.md: 人格を作り込む {#soulmd-customize-personality}

Hermes に安定した地の口調を持たせたいときは、`~/.hermes/SOUL.md`（Hermes のホームを自分で決めている場合は `$HERMES_HOME/SOUL.md`）を編集します。Hermes は出発点になる SOUL を自動で用意し、そのグローバルなファイルをインスタンス全体の人格の元として使います。

一通りの手順は [Use SOUL.md with Hermes](/hermes/docs/guides/use-soul-with-hermes/) をご覧ください。

```markdown
# Soul
You are a senior backend engineer. Be terse and direct.
Skip explanations unless asked. Prefer one-liners over verbose solutions.
Always consider error handling and edge cases.
```

長く保ちたい人格は `SOUL.md` に、プロジェクト固有の指示は `AGENTS.md` に置きます。

### .cursorrules との互換 {#cursorrules-compatibility}

すでに `.cursorrules` や `.cursor/rules/*.mdc` を持っていますか。Hermes はそれらも読みます。コーディング規約を書き写す必要はありません。作業ディレクトリから自動で読み込まれます。

### 読み込みの仕組み {#discovery}

Hermes はセッション開始時に、現在の作業ディレクトリ直下の `AGENTS.md` を読み込みます。サブディレクトリにある `AGENTS.md` は、ツール呼び出しのときに必要に応じて（`subdirectory_hints.py` を通じて）見つけられ、ツールの結果に差し込まれます。最初にまとめてシステムプロンプトへ読み込まれるわけではありません。

:::tip
コンテキストファイルは的を絞って短く保ってください。毎回のメッセージに差し込まれるので、1 文字ごとにトークン予算を使います。
:::

## メモリとスキル {#memory-skills}

### メモリとスキル、どちらに何を置くか {#memory-vs-skills-what-goes-where}

**メモリ**は事実を置く場所です。環境、好み、プロジェクトの置き場所、エージェントがあなたについて学んだこと。**スキル**は手順を置く場所です。複数段階の作業の流れ、ツール固有の指示、使い回せる手順書。「何か」はメモリに、「どうやるか」はスキルに入れましょう。

### スキルを作るタイミング {#when-to-create-skills}

5 手順以上かかる作業で、これからも繰り返しそうなものが見つかったら、エージェントにスキル化を頼んでください。「いまやったことを `deploy-staging` という名前のスキルとして保存して」と伝えるだけです。次からは `/deploy-staging` と打てば、エージェントが手順一式を読み込みます。

### メモリの容量を管理する {#managing-memory-capacity}

メモリにはあえて上限があります（MEMORY.md はおよそ 2,200 字、USER.md はおよそ 1,375 字）。いっぱいになると、エージェントが項目をまとめ直します。「メモリを整理して」「古い Python 3.9 の記述を差し替えて。いまは 3.12 だから」と伝えれば、その手助けができます。

### エージェントに覚えさせる {#let-the-agent-remember}

実りのあるセッションのあとで「次回のために覚えておいて」と言えば、エージェントが要点を保存します。「CI は GitHub Actions で `deploy.yml` のワークフローを使っている、とメモリに保存して」のように、具体的に指定することもできます。

:::warning
メモリは凍結されたスナップショットです。セッション中に加えた変更は、次のセッションが始まるまでシステムプロンプトには現れません。エージェントはすぐにディスクへ書き込みますが、プロンプトのキャッシュはセッションの途中では無効化されないためです。
:::

## 速度とコスト {#performance-cost}

### プロンプトのキャッシュを壊さない {#dont-break-the-prompt-cache}

たいていの LLM プロバイダは、会話の先頭部分（システムプロンプトと履歴）をキャッシュします。システムプロンプトを安定させておけば（同じコンテキストファイル、同じメモリ）、そのセッションの以降のメッセージは**キャッシュヒット**になり、料金がぐっと下がります。キャッシュはモデルとアカウントに紐づいているので、`/model` による明示的な切り替え、[プロバイダの自動フォールバック](/hermes/docs/user-guide/features/fallback-providers/)、[認証情報プールのローテーション](/hermes/docs/user-guide/features/credential-pools/) のいずれが起きても、次のターンで会話全体を入力料金の満額で読み直すことになります。ときどき切り替えるぶんには問題ありませんが、長いセッションで頻繁に切り替えると費用が膨らみます。

### 上限に当たる前に /compress を使う {#use-compress-before-hitting-limits}

長いセッションではトークンが積み上がります。応答が遅くなってきた、あるいは途中で切れるようになったと感じたら、`/compress` を実行してください。会話の履歴を要約し、要点を残したままトークン量を大きく削ります。現状の確認には `/usage` を使います。

### 並行作業は委任する {#delegate-for-parallel-work}

3 つのテーマを同時に調べたいときは、`delegate_task` で並行のサブタスクを使うようエージェントに頼んでください。サブエージェントはそれぞれ独立したコンテキストで動き、最後の要約だけが返ってきます。本体の会話が使うトークンを大幅に減らせます。

### まとめて処理するときは execute_code {#use-executecode-for-batch-operations}

ターミナルのコマンドを 1 つずつ実行するのではなく、全部まとめて片づけるスクリプトを書いてもらいましょう。「`.jpeg` ファイルを全部 `.jpg` にリネームする Python スクリプトを書いて実行して」のほうが、1 つずつ名前を変えるより安く、速く済みます。

### 用途に合ったモデルを選ぶ {#choose-the-right-model}

`/model` を使えば、セッションの途中でモデルを切り替えられます。込み入った推論や設計の判断にはフロンティアモデル（Claude Sonnet / Opus、GPT-4o）を、整形やリネーム、定型コードの生成といった単純な作業には速いモデルを使いましょう。ただし切り替えのたびにプロンプトのキャッシュがリセットされる（上記参照）ので、長いセッションでは行ったり来たりするより、別のモデルで新しいセッションを始めたほうが安くつくことがよくあります。

:::tip
ときどき `/usage` を実行して、トークンの消費量を確認しましょう。直近 30 日の使い方の傾向をもっと広く見たいときは `/insights` を使います。会話を始める前の時点で決まっている 1 メッセージあたりの*固定*コスト（システムプロンプト、スキルの索引、メモリ、ツールのスキーマ）を知りたいときは、[`hermes prompt-size`](/hermes/docs/reference/cli-commands/#hermes-prompt-size) を実行してください（オフラインでも動きます）。
:::

## メッセージ連携のコツ {#messaging-tips}

### ホームチャンネルを決める {#set-a-home-channel}

よく使う Telegram や Discord のチャットで `/sethome` を実行し、そこをホームチャンネルに指定します。cron ジョブの結果や、予約した作業の出力はここに届きます。指定しないと、エージェントは自分から送る先を持てません。

### /title でセッションを整理する {#use-title-to-organize-sessions}

`/title auth-refactor` や `/title research-llm-quantization` のようにセッションへ名前を付けましょう。名前の付いたセッションは `hermes sessions list` で見つけやすく、`hermes -r "auth-refactor"` で再開できます。名前のないセッションはたまる一方で、見分けがつかなくなります。

### チーム向けの DM ペアリング {#dm-pairing-for-team-access}

許可リスト用のユーザー ID を人づてに集める代わりに、DM ペアリングを有効にしましょう。同僚がボットに DM を送ると、その人に使い捨てのペアリングコードが渡されます。あなたは `hermes pairing approve telegram XKGH5N7P` で承認するだけ。手軽で安全です。

### ツールの進行状況の表示モード {#tool-progress-display-modes}

`/verbose` で、ツールの動きをどこまで表示するかを決められます。メッセージ連携のプラットフォームでは、たいてい控えめなほうが読みやすいので、新しいツール呼び出しだけが見える「new」がおすすめです。CLI なら「all」にすると、エージェントの動きが全部流れていく様子を眺められます。

:::tip
標準では、メッセージ連携のセッションが自動でリセットされることはありません。`/reset` を実行するか圧縮が働くまで、コンテキストは残り続けます。一定時間使わなかったら、あるいは毎日決まった時刻に自動でリセットしたい場合は、`~/.hermes/config.yaml` の `session_reset` の節で有効にしてください。
:::

## セキュリティ {#security}

### 信用できないコードは Docker の中で {#use-docker-for-untrusted-code}

素性のわからないリポジトリを扱うときや、中身を把握していないコードを動かすときは、ターミナルのバックエンドに Docker か Daytona を使ってください。`.env` に `TERMINAL_ENV=docker` を設定します。コンテナの中で破壊的なコマンドが動いても、ホスト側は傷つきません。

```bash
# In your .env:
TERMINAL_ENV=docker
TERMINAL_DOCKER_IMAGE=hermes-sandbox:latest
```

### Windows の文字コードの落とし穴を避ける {#avoid-windows-encoding-pitfalls}

Windows では、標準の文字コード（`cp125x` など）が一部の Unicode 文字を表現できず、テストやスクリプトでファイルを書き出すときに `UnicodeEncodeError` が起きることがあります。

- ファイルを開くときは UTF-8 を明示するのがおすすめです。

```python
with open("results.txt", "w", encoding="utf-8") as f:
    f.write("✓ All good\n")
```

- PowerShell では、コンソールとネイティブコマンドの出力を、そのセッションだけ UTF-8 に切り替えることもできます。

```powershell
$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
```

こうしておくと PowerShell と子プロセスが UTF-8 で揃い、Windows でだけ起きる失敗を避けやすくなります。

### 「always」を選ぶ前に確かめる {#review-before-choosing-always}

エージェントが危険なコマンド（`rm -rf`、`DROP TABLE` など）の承認を求めてきたとき、選択肢は **once**、**session**、**always**、**deny** の 4 つです。「always」はそのパターンを恒久的に許可リストへ入れるので、選ぶ前によく考えてください。慣れるまでは「session」から始めましょう。

### コマンド承認は最後の砦 {#command-approval-is-your-safety-net}

Hermes は実行前に、すべてのコマンドを危険なパターンの一覧と突き合わせます。再帰的な削除、SQL の DROP、curl の出力をシェルへ流し込む形などが含まれます。本番でこれを無効にしないでください。理由があって存在する仕組みです。

:::warning
コンテナ系のバックエンド（Docker、Singularity、Modal、Daytona）で動かしているときは、コンテナ自体が安全の境界になるため、危険なコマンドの検査は**省略されます**。コンテナのイメージをきちんと固めておいてください。
:::

### メッセージ連携のボットには許可リストを {#use-allowlists-for-messaging-bots}

ターミナルを使えるボットで `GATEWAY_ALLOW_ALL_USERS=true` を設定してはいけません。プラットフォームごとの許可リスト（`TELEGRAM_ALLOWED_USERS`、`DISCORD_ALLOWED_USERS`）か DM ペアリングを使い、誰がエージェントとやり取りできるかを必ず制御してください。

```bash
# Recommended: explicit allowlists per platform
TELEGRAM_ALLOWED_USERS=123456789,987654321
DISCORD_ALLOWED_USERS=123456789012345678

# Or use cross-platform allowlist
GATEWAY_ALLOWED_USERS=123456789,987654321
```

---

*このページに載せるべきコツをお持ちですか。issue か PR を開いてください。コミュニティからの寄稿を歓迎します。*
