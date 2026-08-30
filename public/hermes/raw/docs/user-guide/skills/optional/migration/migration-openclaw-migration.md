---
title: "Openclaw Migration — OpenClaw の設定（記憶、skill）を Hermes に取り込む"
description: "OpenClaw の設定（記憶、skill）を Hermes に取り込む"
upstream_path: user-guide/skills/optional/migration/migration-openclaw-migration.md
upstream_blob: 43519fcac5f638bff7e8464037a003e825e35a28
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/migration/migration-openclaw-migration
---

# Openclaw Migration {#openclaw-migration}

OpenClaw の設定（記憶、skill）を Hermes に取り込みます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/migration/openclaw-migration` で入れます |
| パス | `optional-skills/migration\openclaw-migration` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent (Nous Research) |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Migration`, `OpenClaw`, `Hermes`, `Memory`, `Persona`, `Import` |
| 関連 skill | [`hermes-agent`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# OpenClaw から Hermes への移行 {#openclaw---hermes-migration}

OpenClaw の設定を、手作業をなるべく減らして Hermes Agent に移したいときに、この skill を使います。

## CLI コマンド {#cli-command}

対話なしで手早く移行するなら、組み込みの CLI コマンドを使います。

```bash
hermes claw migrate              # Full interactive migration
hermes claw migrate --dry-run    # Preview what would be migrated
hermes claw migrate --preset user-data   # Migrate without secrets
hermes claw migrate --overwrite  # Overwrite existing conflicts
hermes claw migrate --source /custom/path/.openclaw  # Custom source
```

この CLI コマンドは、以下で説明する移行スクリプトと同じものを実行します。試し実行で下見をしながら、項目ごとに衝突の扱いを決めていきたい場合は、この skill を（エージェント経由で）使ってください。

**最初の設定について:** `hermes setup` のウィザードは `~/.openclaw` を自動的に見つけ、設定を始める前に移行を提案します。

## この skill がすること {#what-this-skill-does}

`scripts/openclaw_to_hermes.py` を使って、次のことを行います。

- `SOUL.md` を Hermes のホームディレクトリに `SOUL.md` として取り込みます
- OpenClaw の `MEMORY.md` と `USER.md` を Hermes の記憶の項目に変換します
- OpenClaw のコマンド許可のパターンを Hermes の `command_allowlist` にまとめます
- `TELEGRAM_ALLOWED_USERS` のような、Hermes でも使えるメッセージ関連の設定を移し、OpenClaw のワークスペース設定を Hermes の作業ディレクトリの設定に対応づけます
- OpenClaw の skill を `~/.hermes/skills/openclaw-imports/` にコピーします
- 必要なら、OpenClaw のワークスペースの指示ファイルを、選んだ Hermes のワークスペースにコピーします
- `workspace/tts/` のような、そのまま使えるワークスペースの資産を `~/.hermes/tts/` に写します
- Hermes に置き場所が無い、秘密情報を含まない文書を保管します
- 移した項目、衝突した項目、飛ばした項目とその理由を並べた、構造化されたレポートを出します

## スクリプトの場所 {#path-resolution}

補助スクリプトは、この skill のディレクトリの次の場所にあります。

- `scripts/openclaw_to_hermes.py`

Skills Hub からこの skill を入れた場合、通常の場所は次のとおりです。

- `~/.hermes/skills/migration/openclaw-migration/scripts/openclaw_to_hermes.py`

`~/.hermes/skills/openclaw-migration/...` のような短いパスを推測で使わないでください。

補助スクリプトを実行する前に、次のようにします。

1. まず `~/.hermes/skills/migration/openclaw-migration/` の下にある、導入済みのパスを使います。
2. そこで失敗したら、導入された skill のディレクトリを見て、導入済みの `SKILL.md` からの相対でスクリプトの位置を割り出します。
3. `find` を使うのは、導入先が見当たらない場合や、skill が手作業で移動された場合の最後の手段にとどめます。
4. ターミナルのツールを呼ぶときに `workdir: "~"` を渡さないでください。利用者のホームディレクトリのような絶対パスを使うか、`workdir` を省いてください。

`--migrate-secrets` を付けると、Hermes でも使える秘密情報のうち、許可された少数のものも取り込みます。現時点では次のとおりです。

- `TELEGRAM_BOT_TOKEN`

## 基本の流れ {#default-workflow}

1. まず試し実行で中身を確かめます。
2. 移せるもの、移せないもの、保管に回るものを、分かりやすくまとめて示します。
3. `clarify` ツールが使えるなら、自由記述の返事を求めるのではなく、それを使って利用者に決めてもらいます。
4. 試し実行で、取り込む skill のディレクトリに衝突が見つかったら、実行の前に扱いを尋ねます。
5. 実行の前に、対応している 2 つの移行モードのどちらにするかを尋ねます。
6. ワークスペースの指示ファイルを持ってきたいと言われた場合にだけ、移し先のワークスペースのパスを尋ねます。
7. 選ばれたプリセットとフラグで移行を実行します。
8. 結果をまとめます。とくに次の点です。
   - 何が移ったか
   - 何が手作業の確認のために保管されたか
   - 何が飛ばされ、それはなぜか

## 利用者とのやり取りの決まり {#user-interaction-protocol}

Hermes の CLI は対話用に `clarify` ツールを備えていますが、次の制約があります。

- 一度に選べるのは 1 つ
- あらかじめ用意できる選択肢は最大 4 つ
- 自由記述の `Other` が自動で付きます

1 つの画面で複数を選ぶチェックボックスには **対応していません**。

`clarify` を呼ぶときは、毎回次のようにします。

- `question` は必ず中身のあるものにします
- `choices` は、実際に選ばせる場面でだけ付けます
- `choices` は 2〜4 個の、飾りのない文字列にとどめます
- `...` のような、仮置きや途中で切れた選択肢を出さないでください
- 余分な空白で選択肢を整えたり飾ったりしないでください
- `enter directory here` のような偽の入力欄、埋めさせるための空行、`_____` のような下線を質問に入れないでください
- パスのように自由に答えてもらう質問では、文だけを書きます。利用者は、パネルの下にある通常の CLI の入力欄に打ちます

`clarify` の呼び出しがエラーを返したら、エラーの文面を読み、内容を直して、正しい `question` と整った選択肢で 1 度だけやり直します。

`clarify` が使える状態で、試し実行から利用者に決めてもらうべき点が出てきたら、**次の行動は `clarify` の呼び出しでなければなりません**。
次のような通常の返事でターンを終えないでください。

- 「では選択肢を出します」
- 「どうしますか」
- 「選択肢は次のとおりです」

利用者の判断が必要なら、それ以上文章を書く前に `clarify` で集めます。
未解決の判断が複数残っている場合は、そのあいだに説明の文章を挟まないでください。`clarify` の回答を 1 つ受け取ったら、次の行動はたいてい、次に必要な `clarify` の呼び出しです。

試し実行が次のように報告したときは、`workspace-agents` を未解決の判断として扱います。

- `kind="workspace-agents"`
- `status="skipped"`
- 理由に `No workspace target was provided` が含まれる

その場合は、実行の前にワークスペースの指示ファイルについて必ず尋ねてください。黙って「飛ばす判断がされた」と扱ってはいけません。

先の制約があるため、判断の流れは次のように単純にします。

1. `SOUL.md` の衝突には、次のような選択肢で `clarify` を使います。
   - `keep existing`
   - `overwrite with backup`
   - `review first`
2. 試し実行で `kind="skill"` の項目が `status="conflict"` になっていたら、次のような選択肢で `clarify` を使います。
   - `keep existing skills`
   - `overwrite conflicting skills with backup`
   - `import conflicting skills under renamed folders`
3. ワークスペースの指示ファイルには、次のような選択肢で `clarify` を使います。
   - `skip workspace instructions`
   - `copy to a workspace path`
   - `decide later`
4. コピーすると選ばれた場合は、続けて自由記述の `clarify` で **絶対パス** を尋ねます。
5. `skip workspace instructions` か `decide later` が選ばれた場合は、`--workspace-target` を付けずに進めます。
5. 移行モードには、次の 3 つの選択肢で `clarify` を使います。
   - `user-data only`
   - `full compatible migration`
   - `cancel`
6. `user-data only` は、利用者のデータと、そのまま使える設定は移すが、許可された秘密情報は取り込ま **ない** という意味です。
7. `full compatible migration` は、同じデータに加えて、許可された秘密情報があればそれも移すという意味です。
8. `clarify` が使えない場合は、同じ質問を通常の文章で尋ねます。ただし答えは `user-data only`、`full compatible migration`、`cancel` のいずれかに限ります。

実行してよいかの判断:

- `No workspace target was provided` による `workspace-agents` の飛ばしが未解決のあいだは、実行しないでください。
- 解決の仕方は次の 3 つだけです。
  - 利用者が `skip workspace instructions` を明示的に選ぶ
  - 利用者が `decide later` を明示的に選ぶ
  - `copy to a workspace path` を選んだうえで、利用者がワークスペースのパスを示す
- 試し実行にワークスペースの指定が無いこと自体は、実行してよいという意味ではありません。
- 必要な `clarify` の判断が未解決のあいだは、実行しないでください。

`clarify` に渡す内容は、次の形をそのまま既定の型として使ってください。

- `{"question":"Your existing SOUL.md conflicts with the imported one. What should I do?","choices":["keep existing","overwrite with backup","review first"]}`
- `{"question":"One or more imported OpenClaw skills already exist in Hermes. How should I handle those skill conflicts?","choices":["keep existing skills","overwrite conflicting skills with backup","import conflicting skills under renamed folders"]}`
- `{"question":"Choose migration mode: migrate only user data, or run the full compatible migration including allowlisted secrets?","choices":["user-data only","full compatible migration","cancel"]}`
- `{"question":"Do you want to copy the OpenClaw workspace instructions file into a Hermes workspace?","choices":["skip workspace instructions","copy to a workspace path","decide later"]}`
- `{"question":"Please provide an absolute path where the workspace instructions should be copied."}`

## 判断とコマンドの対応 {#decision-to-command-mapping}

利用者の判断は、次のとおりに正確にフラグへ対応させます。

- `SOUL.md` に `keep existing` が選ばれたら、`--overwrite` を付け **ません**。
- `overwrite with backup` が選ばれたら、`--overwrite` を付けます。
- `review first` が選ばれたら、実行の前に止めて、対象のファイルを確認します。
- `keep existing skills` が選ばれたら、`--skill-conflict skip` を付けます。
- `overwrite conflicting skills with backup` が選ばれたら、`--skill-conflict overwrite` を付けます。
- `import conflicting skills under renamed folders` が選ばれたら、`--skill-conflict rename` を付けます。
- `user-data only` が選ばれたら、`--preset user-data` で実行し、`--migrate-secrets` は付け **ません**。
- `full compatible migration` が選ばれたら、`--preset full --migrate-secrets` で実行します。
- `--workspace-target` を付けるのは、利用者が絶対パスをはっきり示した場合だけです。
- `skip workspace instructions` か `decide later` が選ばれたら、`--workspace-target` を付けません。

実行の前に、これから走らせるコマンドの中身を平易な言葉で言い直し、利用者の選択と合っているか確かめます。

## 実行後の報告の決まり {#post-run-reporting-rules}

実行後は、スクリプトの JSON 出力を正しいものとして扱います。

1. 件数はすべて `report.summary` にもとづきます。
2. 「移行できたもの」に並べてよいのは、`status` がちょうど `migrated` の項目だけです。
3. その項目がレポートで `migrated` になっていない限り、衝突が解決したとは書かないでください。
4. `kind="soul"` の項目が `status="migrated"` でない限り、`SOUL.md` を上書きしたとは書かないでください。
5. `report.summary.conflict > 0` なら、成功したかのように匂わせず、衝突の節を設けます。
6. 件数と並べた項目が食い違う場合は、返事の前にレポートに合わせて一覧を直します。
7. レポートに `output_dir` のパスがあれば含めてください。利用者が `report.json`、`summary.md`、バックアップ、保管されたファイルを確認できます。
8. 記憶や利用者プロフィールがあふれた場合、レポートに保管先のパスがはっきり出ていない限り、保管されたとは書かないでください。`details.overflow_file` があれば、あふれた分の一覧がそこに書き出されたと伝えます。
9. skill が名前を変えたフォルダに取り込まれた場合は、最終的な置き場所を報告し、`details.renamed_from` にも触れます。
10. `report.skill_conflict_mode` があれば、取り込む skill の衝突の扱いはそれを正しいものとして使います。
11. 項目が `status="skipped"` なら、上書きした・バックアップした・移した・解決したとは書かないでください。
12. `kind="soul"` が `Target already matches source` を理由に `status="skipped"` なら、変更していないと書き、バックアップには触れないでください。
13. 名前を変えて取り込んだ skill の `details.backup` が空なら、既存の Hermes 側の skill の名前を変えた、あるいはバックアップしたかのように書かないでください。取り込んだほうを新しい場所に置いたとだけ書き、`details.renamed_from` はもとからあってそのまま残ったフォルダとして示します。

## 移行のプリセット {#migration-presets}

ふだんは、この 2 つのプリセットを使ってください。

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

`full` は `user-data` のすべてに加えて、次を含みます。

- `secret-settings`

補助スクリプトは分類ごとの `--include` / `--exclude` にも対応していますが、これは通常の流れではなく、上級者向けの逃げ道として扱ってください。

## コマンド {#commands}

すべてを洗い出す試し実行:

```bash
python ~/.hermes/skills/migration/openclaw-migration/scripts/openclaw_to_hermes.py
```

ターミナルのツールから呼ぶときは、次のように絶対パスで呼ぶ形をおすすめします。

```json
{"command":"python /home/USER/.hermes/skills/migration/openclaw-migration/scripts/openclaw_to_hermes.py","workdir":"/home/USER"}
```

user-data プリセットでの試し実行:

```bash
python ~/.hermes/skills/migration/openclaw-migration/scripts/openclaw_to_hermes.py --preset user-data
```

user-data の移行を実行する:

```bash
python ~/.hermes/skills/migration/openclaw-migration/scripts/openclaw_to_hermes.py --execute --preset user-data --skill-conflict skip
```

そのまま使えるもの一式を移行する:

```bash
python ~/.hermes/skills/migration/openclaw-migration/scripts/openclaw_to_hermes.py --execute --preset full --migrate-secrets --skill-conflict skip
```

ワークスペースの指示ファイルも含めて実行する:

```bash
python ~/.hermes/skills/migration/openclaw-migration/scripts/openclaw_to_hermes.py --execute --preset user-data --skill-conflict rename --workspace-target "/absolute/workspace/path"
```

`$PWD` やホームディレクトリを、そのままワークスペースの移し先にしないでください。まず具体的なパスを尋ねます。

## 大事な決まり {#important-rules}

1. 利用者からすぐ進めるよう言われた場合を除き、書き込みの前に試し実行をします。
2. 秘密情報は既定では移しません。トークン、認証データ、端末の資格情報、ゲートウェイの生の設定は、利用者が明示的に頼まない限り Hermes に入れないでください。
3. 中身のある Hermes 側のファイルを、黙って上書きしないでください。利用者がそれを望んだ場合だけです。上書きを有効にすると、補助スクリプトがバックアップを残します。
4. 飛ばした項目のレポートは必ず利用者に渡します。あれは移行の一部であって、おまけではありません。
5. `workspace.default/` より、主となる OpenClaw のワークスペース（`~/.openclaw/workspace/`）を優先します。主のファイルが見当たらないときにだけ、既定のワークスペースを使います。
6. 秘密情報を移すモードでも、Hermes 側にきちんとした置き場所があるものだけを移します。対応していない認証データは、飛ばしたものとして必ず報告します。
7. 試し実行で、大きな資産のコピー、`SOUL.md` の衝突、あふれた記憶の項目が見つかったら、実行の前にそれぞれ別に伝えます。
8. 利用者が迷っているなら `user-data only` を既定にします。
9. `workspace-agents` を含めるのは、利用者が移し先のワークスペースのパスをはっきり示した場合だけです。
10. 分類ごとの `--include` / `--exclude` は、通常の流れではなく上級者向けの抜け道として扱います。
11. `clarify` が使えるなら、試し実行のまとめを「どうしますか」といった漠然とした問いで終えないでください。形の決まった追加の問いを使います。
12. 選択肢で聞ける場面で、自由記述の `clarify` を使わないでください。まず選べる形にして、自由記述は絶対パスやファイルの確認依頼だけに使います。
13. 試し実行のあと、未解決の判断が残っているのにまとめだけで止まってはいけません。いちばん優先度の高い、先に進めない判断について、すぐ `clarify` を使います。
14. 追加で尋ねる順番:
    - `SOUL.md` の衝突
    - 取り込む skill の衝突
    - 移行モード
    - ワークスペースの指示ファイルの移し先
15. 同じメッセージの中で「あとで選択肢を出します」と言わないでください。実際に `clarify` を呼んで出します。
16. 移行モードの答えを受け取ったら、`workspace-agents` がまだ未解決かどうかを必ず確かめます。未解決なら、次の行動はワークスペースの指示ファイルについての `clarify` です。
17. `clarify` の答えを受け取ったあと、必要な判断がまだ残っているなら、今決まったことを語らずに、すぐ次の質問をします。

## 期待される結果 {#expected-result}

うまくいけば、利用者の手元は次の状態になります。

- Hermes の人格の状態が取り込まれている
- OpenClaw の知識が変換されて、Hermes の記憶ファイルに入っている
- OpenClaw の skill が `~/.hermes/skills/openclaw-imports/` の下で使える
- 衝突、抜け、対応していないデータが分かる移行レポートがある
