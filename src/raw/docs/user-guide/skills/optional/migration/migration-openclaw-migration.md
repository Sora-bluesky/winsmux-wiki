---
title: "Openclaw Migration — OpenClaw の設定（記憶や skill）を Hermes に取り込む"
description: "OpenClaw の設定（記憶や skill）を Hermes に取り込む"
upstream_path: user-guide/skills/optional/migration/migration-openclaw-migration.md
upstream_blob: f2e9fba4e7c640bfde428b6cfcc8fc4cddfb3312
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/migration/migration-openclaw-migration
---

# Openclaw Migration {#openclaw-migration}

OpenClaw の設定（記憶や skill）を Hermes に取り込みます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/migration/openclaw-migration` で導入します |
| パス | `optional-skills/migration/openclaw-migration` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent (Nous Research) |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Migration`, `OpenClaw`, `Hermes`, `Memory`, `Persona`, `Import` |
| 関連 skill | [`hermes-agent`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# OpenClaw -> Hermes Migration {#openclaw---hermes-migration}

OpenClaw の設定を、手作業での後片付けを最小限にして Hermes Agent へ移したいときに、この skill を使います。

## CLI コマンド {#cli-command}

対話なしで手早く移したいときは、組み込みの CLI コマンドを使います。

```bash
hermes claw migrate              # Full interactive migration
hermes claw migrate --dry-run    # Preview what would be migrated
hermes claw migrate --preset user-data   # Migrate without secrets
hermes claw migrate --overwrite  # Overwrite existing conflicts
hermes claw migrate --source /custom/path/.openclaw  # Custom source
```

この CLI コマンドは、以下で説明する移行スクリプトと同じものを走らせます。試し実行で中身を確認しながら、ぶつかった項目を一つずつ決めていきたいときは、（エージェント経由で）この skill を使ってください。

**初回の設定について:** `hermes setup` のウィザードは `~/.openclaw` を自動で見つけ、設定を始める前に移行するかどうかを尋ねます。

## この skill がすること {#what-this-skill-does}

`scripts/openclaw_to_hermes.py` を使って、次のことを行います。

- `SOUL.md` を Hermes のホームディレクトリへ `SOUL.md` として取り込みます
- OpenClaw の `MEMORY.md` と `USER.md` を Hermes の記憶の項目に変換します
- OpenClaw のコマンド承認パターンを Hermes の `command_allowlist` に統合します
- `TELEGRAM_ALLOWED_USERS` のような Hermes でも使えるメッセージ設定を移し、OpenClaw のワークスペース設定を Hermes の作業ディレクトリの設定へ対応づけます
- OpenClaw の skill を `~/.hermes/skills/openclaw-imports/` へコピーします
- 必要であれば、OpenClaw のワークスペース指示ファイルを、選んだ Hermes のワークスペースへコピーします
- `workspace/tts/` のように移せるワークスペースの資産を `~/.hermes/tts/` へ写します
- Hermes 側に直接の置き場がない、秘密情報ではない文書を保管します
- 移せたもの、ぶつかったもの、飛ばしたものとその理由を並べた、構造のあるレポートを出します

## スクリプトの場所 {#path-resolution}

補助スクリプトは、この skill のディレクトリの次の場所にあります。

- `scripts/openclaw_to_hermes.py`

Skills Hub からこの skill を入れた場合、通常は次の場所になります。

- `~/.hermes/skills/migration/openclaw-migration/scripts/openclaw_to_hermes.py`

`~/.hermes/skills/openclaw-migration/...` のような短いパスを当て推量で使わないでください。

補助スクリプトを走らせる前に、次の順で確かめます。

1. まず `~/.hermes/skills/migration/openclaw-migration/` の下にある、導入時のパスを使います。
2. そのパスで失敗したら、導入された skill のディレクトリを見て、導入された `SKILL.md` からの相対でスクリプトの場所を割り出します。
3. `find` を使うのは、導入先が見当たらないときや、skill が手作業で移されていたときの最後の手段だけにします。
4. terminal ツールを呼ぶときは `workdir: "~"` を渡さないでください。ユーザーのホームディレクトリのような絶対パスを使うか、`workdir` そのものを省きます。

`--migrate-secrets` を付けると、Hermes でも使える秘密情報を、許可された小さな範囲だけ取り込みます。現時点では次のものです。

- `TELEGRAM_BOT_TOKEN`

## 基本の進め方 {#default-workflow}

1. まず試し実行で中身を確認します。
2. 移せるもの、移せないもの、保管されるものを、簡潔にまとめて示します。
3. `clarify` ツールが使えるなら、自由な文章で答えてもらう代わりに、それを使って判断を仰ぎます。
4. 試し実行で、取り込む skill のディレクトリがぶつかると分かったら、実行前にどう扱うか尋ねます。
5. 実行の前に、対応している 2 つの移行モードのどちらにするかをユーザーに選んでもらいます。
6. 移行先のワークスペースのパスは、ワークスペース指示ファイルを持ってきたい場合だけ尋ねます。
7. 選ばれたプリセットとフラグで移行を実行します。
8. 結果をまとめます。とくに次の点を伝えます。
   - 何が移せたか
   - 手作業で確認するために何が保管されたか
   - 何が、なぜ飛ばされたか

## ユーザーとのやりとりの決まり {#user-interaction-protocol}

Hermes CLI は対話用に `clarify` ツールを備えていますが、次の制限があります。

- 一度に選べるのは 1 つだけ
- あらかじめ用意できる選択肢は最大 4 つ
- 自由入力の `Other` が自動で付く

1 回のやりとりで複数を選ぶチェックボックスには対応して**いません**。

`clarify` を呼ぶときは、毎回次を守ります。

- `question` は必ず中身のあるものにする
- `choices` は、本当に選ばせる場面でだけ付ける
- `choices` は 2〜4 個の素直な文字列にとどめる
- `...` のような、仮置きや途中で切れた選択肢を出さない
- 選択肢を余分な空白で埋めたり飾ったりしない
- `enter directory here` のような偽の入力欄、空行、`_____` のような下線を質問に入れない
- パスを自由に答えてもらう質問は、素の一文だけを書く。ユーザーはパネルの下にある通常の CLI の入力欄に打ち込みます

`clarify` の呼び出しがエラーを返したら、エラーの文面を読み、中身を直して、正しい `question` と整った選択肢で一度だけやり直します。

`clarify` が使える状態で、試し実行によってユーザーの判断が必要だと分かったときは、**次の行動を必ず `clarify` の呼び出しにします**。次のような通常のメッセージでターンを終えないでください。

- "Let me present the choices"
- "What would you like to do?"
- "Here are the options"

ユーザーの判断が必要なら、文章を続ける前に `clarify` で答えを集めます。
未解決の判断が複数残っているときは、その間に説明のメッセージを挟まないでください。`clarify` の答えを受け取ったら、次の行動はたいてい次に必要な `clarify` の呼び出しになります。

試し実行が次を報告したときは、`workspace-agents` を未解決の判断として扱います。

- `kind="workspace-agents"`
- `status="skipped"`
- 理由に `No workspace target was provided` を含む

その場合は、実行の前にワークスペース指示について必ず尋ねます。黙って「飛ばすと決まった」ことにしないでください。

この制限があるので、判断の流れは次のように簡素にします。

1. `SOUL.md` がぶつかったときは、次のような選択肢で `clarify` を使います。
   - `keep existing`
   - `overwrite with backup`
   - `review first`
2. 試し実行で `kind="skill"` の項目が `status="conflict"` として 1 つ以上出たときは、次のような選択肢で `clarify` を使います。
   - `keep existing skills`
   - `overwrite conflicting skills with backup`
   - `import conflicting skills under renamed folders`
3. ワークスペース指示については、次のような選択肢で `clarify` を使います。
   - `skip workspace instructions`
   - `copy to a workspace path`
   - `decide later`
4. ワークスペース指示をコピーすると選ばれたら、続けて自由入力の `clarify` で **絶対パス** を尋ねます。
5. `skip workspace instructions` か `decide later` が選ばれたら、`--workspace-target` を付けずに進めます。
5. 移行モードについては、次の 3 つの選択肢で `clarify` を使います。
   - `user-data only`
   - `full compatible migration`
   - `cancel`
6. `user-data only` は、ユーザーのデータと移せる設定は移すが、許可された秘密情報は取り込ま**ない**という意味です。
7. `full compatible migration` は、同じ範囲のユーザーのデータに加えて、許可された秘密情報があればそれも移すという意味です。
8. `clarify` が使えないときは、同じ質問を普通の文章で尋ねますが、答えは `user-data only`、`full compatible migration`、`cancel` のいずれかに限ります。

実行してよいかの境目:

- `No workspace target was provided` による `workspace-agents` の skip が未解決のあいだは、実行しないでください。
- 解決したと言えるのは、次の場合だけです。
  - ユーザーがはっきりと `skip workspace instructions` を選んだ
  - ユーザーがはっきりと `decide later` を選んだ
  - `copy to a workspace path` を選んだうえで、ユーザーがワークスペースのパスを示した
- 試し実行にワークスペースの移行先が出てこないこと自体は、実行してよいという意味にはなりません。
- 必要な `clarify` の判断が 1 つでも残っているあいだは、実行しないでください。

`clarify` に渡す中身は、次の形をそのまま基本形として使います。

- `{"question":"Your existing SOUL.md conflicts with the imported one. What should I do?","choices":["keep existing","overwrite with backup","review first"]}`
- `{"question":"One or more imported OpenClaw skills already exist in Hermes. How should I handle those skill conflicts?","choices":["keep existing skills","overwrite conflicting skills with backup","import conflicting skills under renamed folders"]}`
- `{"question":"Choose migration mode: migrate only user data, or run the full compatible migration including allowlisted secrets?","choices":["user-data only","full compatible migration","cancel"]}`
- `{"question":"Do you want to copy the OpenClaw workspace instructions file into a Hermes workspace?","choices":["skip workspace instructions","copy to a workspace path","decide later"]}`
- `{"question":"Please provide an absolute path where the workspace instructions should be copied."}`

## 判断とコマンドの対応 {#decision-to-command-mapping}

ユーザーの判断は、次のとおり正確にフラグへ対応させます。

- `SOUL.md` について `keep existing` が選ばれたら、`--overwrite` を付け**ません**。
- `overwrite with backup` が選ばれたら、`--overwrite` を付けます。
- `review first` が選ばれたら、実行の前で止めて、該当するファイルを確認します。
- `keep existing skills` が選ばれたら、`--skill-conflict skip` を付けます。
- `overwrite conflicting skills with backup` が選ばれたら、`--skill-conflict overwrite` を付けます。
- `import conflicting skills under renamed folders` が選ばれたら、`--skill-conflict rename` を付けます。
- `user-data only` が選ばれたら、`--preset user-data` で実行し、`--migrate-secrets` は付け**ません**。
- `full compatible migration` が選ばれたら、`--preset full --migrate-secrets` で実行します。
- `--workspace-target` は、ユーザーがはっきりと絶対パスを示したときだけ付けます。
- `skip workspace instructions` か `decide later` が選ばれたら、`--workspace-target` は付けません。

実行の前に、これから走らせるコマンドの中身を平たい言葉で言い直し、ユーザーの選択と食い違っていないか確かめます。

## 実行後の報告の決まり {#post-run-reporting-rules}

実行が終わったら、スクリプトが出した JSON を正しい記録として扱います。

1. 件数はすべて `report.summary` に合わせます。
2. 「移せたもの」として並べてよいのは、`status` がちょうど `migrated` の項目だけです。
3. その項目がレポートで `migrated` になっていない限り、ぶつかりが解消したとは言わないでください。
4. `kind="soul"` の項目が `status="migrated"` になっていない限り、`SOUL.md` を上書きしたとは言わないでください。
5. `report.summary.conflict > 0` のときは、うまくいったかのように黙って流さず、ぶつかった項目の節を必ず設けます。
6. 件数と並べた項目が食い違うときは、答える前に並びのほうをレポートに合わせて直します。
7. レポートに `output_dir` のパスがあれば、それも書き添えます。ユーザーが `report.json`、`summary.md`、バックアップ、保管されたファイルを見に行けるようにするためです。
8. 記憶やユーザープロフィールがあふれた場合、レポートに保管先のパスがはっきり出ていない限り、「保管しました」と言わないでください。`details.overflow_file` があるときは、あふれた分の一覧をそこへ書き出したと伝えます。
9. skill が名前を変えたフォルダーとして取り込まれたときは、最終的な置き場を報告し、`details.renamed_from` にも触れます。
10. `report.skill_conflict_mode` があるときは、取り込む skill のぶつかりをどう扱ったかについて、それを正しい記録として使います。
11. `status="skipped"` の項目を、上書きした・バックアップした・移せた・解消したと説明しないでください。
12. `kind="soul"` が `status="skipped"` で、理由が `Target already matches source` のときは、そのままにしたと伝え、バックアップには触れないでください。
13. 名前を変えて取り込んだ skill の `details.backup` が空のときは、もとからあった Hermes の skill の名前を変えたり控えを取ったりしたかのように書かないでください。取り込んだほうを新しい置き場に入れたとだけ伝え、`details.renamed_from` は、そのまま残っている既存のフォルダーとして示します。

## 移行のプリセット {#migration-presets}

普段は次の 2 つのプリセットを使ってください。

- `user-data`
- `full`

`user-data` に含まれるもの:

- `soul`
- `workspace-agents`
- `memory`
- `user-profile`
- `messaging-settings`
- `command-allowlist`
- `skills`
- `tts-assets`
- `archive`

`full` には、`user-data` のすべてに加えて次が含まれます。

- `secret-settings`

補助スクリプトは分類ごとの `--include` / `--exclude` にも対応していますが、これは普段の使い方ではなく、込み入った場合の逃げ道として扱ってください。

## コマンド {#commands}

すべてを対象にした試し実行:

```bash
python3 ~/.hermes/skills/migration/openclaw-migration/scripts/openclaw_to_hermes.py
```

terminal ツールから呼ぶときは、次のように絶対パスで書く形をおすすめします。

```json
{"command":"python3 /home/USER/.hermes/skills/migration/openclaw-migration/scripts/openclaw_to_hermes.py","workdir":"/home/USER"}
```

user-data プリセットでの試し実行:

```bash
python3 ~/.hermes/skills/migration/openclaw-migration/scripts/openclaw_to_hermes.py --preset user-data
```

user-data の移行を実行する:

```bash
python3 ~/.hermes/skills/migration/openclaw-migration/scripts/openclaw_to_hermes.py --execute --preset user-data --skill-conflict skip
```

移せるものをすべて含めた移行を実行する:

```bash
python3 ~/.hermes/skills/migration/openclaw-migration/scripts/openclaw_to_hermes.py --execute --preset full --migrate-secrets --skill-conflict skip
```

ワークスペース指示も含めて実行する:

```bash
python3 ~/.hermes/skills/migration/openclaw-migration/scripts/openclaw_to_hermes.py --execute --preset user-data --skill-conflict rename --workspace-target "/absolute/workspace/path"
```

ワークスペースの移行先に `$PWD` やホームディレクトリを既定で使わないでください。まず、はっきりしたワークスペースのパスを尋ねます。

## 大事な決まり {#important-rules}

1. ユーザーがすぐ進めてほしいとはっきり言わない限り、書き込む前に試し実行をします。
2. 秘密情報は既定では移しません。トークン、認証情報のかたまり、端末の資格情報、素のゲートウェイ設定は、ユーザーがはっきり求めない限り Hermes に入れないでください。
3. ユーザーがはっきり望まない限り、中身のある Hermes 側のファイルを黙って上書きしないでください。上書きを有効にした場合、補助スクリプトはバックアップを残します。
4. 飛ばした項目のレポートは必ずユーザーに渡します。あれは移行の一部であって、おまけではありません。
5. `workspace.default/` よりも、主となる OpenClaw のワークスペース（`~/.openclaw/workspace/`）を優先します。既定のワークスペースは、主となるファイルが見当たらないときの控えとしてだけ使います。
6. 秘密情報を移すモードでも、Hermes 側に問題のない置き場があるものだけを移します。対応していない認証情報のかたまりは、飛ばしたものとして必ず報告してください。
7. 試し実行で、大きな資産のコピー、ぶつかっている `SOUL.md`、あふれた記憶の項目が出てきたときは、実行の前にそれらを別立てで伝えます。
8. ユーザーが迷っているときは `user-data only` を既定にします。
9. `workspace-agents` を含めるのは、ユーザーが移行先のワークスペースのパスをはっきり示したときだけです。
10. 分類ごとの `--include` / `--exclude` は、普段の流れではなく、込み入った場合の逃げ道として扱います。
11. `clarify` が使えるなら、試し実行のまとめを漠然とした「What would you like to do?」で終えないでください。代わりに、形の決まった問いかけを使います。
12. 本当に選ばせる問いで済む場面で、自由入力の `clarify` を使わないでください。まず選択肢のある形を優先し、自由入力は絶対パスやファイルの確認を求めるときだけにします。
13. 試し実行のあと、未解決の判断が残っているのに、まとめただけで止まらないでください。いちばん先に決めるべき、進行を妨げている判断について、すぐ `clarify` を使います。
14. 続けて尋ねる順番:
    - `SOUL.md` のぶつかり
    - 取り込む skill のぶつかり
    - 移行モード
    - ワークスペース指示の移行先
15. 同じメッセージの中で「あとで選択肢を出します」と約束しないでください。実際に `clarify` を呼んで示します。
16. 移行モードの答えを得たら、`workspace-agents` がまだ未解決かどうかをはっきり確かめます。未解決なら、次の行動はワークスペース指示についての `clarify` の呼び出しです。
17. `clarify` の答えを得たあと、必要な判断がまだ残っているなら、いま決まったことを言い直さず、すぐ次の質問に進みます。

## 終わったときの状態 {#expected-result}

うまくいくと、ユーザーの手元は次のようになります。

- Hermes の人格の状態が取り込まれている
- Hermes の記憶ファイルに、OpenClaw から変換された知識が入っている
- OpenClaw の skill が `~/.hermes/skills/openclaw-imports/` から使える
- ぶつかり、移せなかったもの、対応していないデータを示す移行レポートがある
