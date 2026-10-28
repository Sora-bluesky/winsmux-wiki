---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "Git ワークツリー"
description: "git のワークツリーと独立したチェックアウトを使って、同じリポジトリで複数の Hermes エージェントを安全に動かします"
upstream_path: user-guide/git-worktrees.md
upstream_blob: 96361e4920130c0f5360a0a560c4e1d29126cfdd
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/git-worktrees
---

# Git ワークツリー {#git-worktrees}

Hermes Agent は、大規模で長く使われているリポジトリで動かすことがよくあります。次のようにしたいときを考えてみてください。

- 同じプロジェクトで **複数のエージェントを同時に動かす**
- 試験的なリファクタリングを main ブランチから切り離しておく

こうした場面では、git の **ワークツリー** が最も安全な方法です。リポジトリ全体を複製することなく、エージェントごとに専用のチェックアウトを渡せます。

このページでは、ワークツリーと Hermes を組み合わせて、セッションごとにきれいに分離された作業ディレクトリを用意する方法を説明します。

## Hermes でワークツリーを使う理由 {#why-use-worktrees-with-hermes}

Hermes は **カレントディレクトリ** をプロジェクトのルートとして扱います。

- CLI の場合: `hermes` または `hermes chat` を実行したディレクトリ
- メッセージング用のゲートウェイの場合: `~/.hermes/config.yaml` の `terminal.cwd` で指定したディレクトリ

**同じチェックアウト** で複数のエージェントを動かすと、変更どうしがぶつかることがあります。

- 一方のエージェントが、もう一方の使っているファイルを消したり書き換えたりする可能性があります。
- どの変更がどの試行によるものなのかが把握しづらくなります。

ワークツリーを使うと、エージェントごとに次のものが手に入ります。

- **専用のブランチと作業ディレクトリ**
- `/rollback` 用の **専用のチェックポイント履歴**

あわせて [チェックポイントと /rollback](/hermes/docs/user-guide/checkpoints-and-rollback/) もご覧ください。

## まずは試す: ワークツリーを作る {#quick-start-creating-a-worktree}

### セッションの中から: `/worktree new` {#from-inside-a-session-worktree-new}

いちばん手早い方法です（Copilot CLI の `/worktree new` を参考にしています）。対話モードの
CLI セッションで、次のように実行します。

```
/worktree new my-experiment
```

Hermes はリポジトリの中に `.worktrees/my-experiment/` を作り（ブランチ名は
`hermes/my-experiment` で、`worktree_sync: false` にしていない限り、取得し直した直後のリモートの先端を基点にします）、
そのセッションのターミナルツールとファイルツールの向き先をそこへ切り替えます。再起動は不要です。
名前を省略すると `hermes-<id>` という形のランダムな名前のツリーになります。`/worktree` だけを実行すると現在のツリーが表示され、`/worktree list` はすべてのツリーを一覧します。
セッションを終了するとき、きれいな状態で push 済みのツリーは削除されます。コミットしていない変更や
push していないコミットがあるツリーでは、`hermes -w` と同じく、残す・退避する・削除するのどれにするかを尋ねられます。

### git で手動で作る {#manually-with-git}

`.git/` のあるメインのリポジトリから、機能開発用ブランチのワークツリーを新しく作ります。

```bash
# From the main repo root
cd /path/to/your/repo

# Create a new branch and worktree in ../repo-feature
git worktree add ../repo-feature feature/hermes-experiment
```

これで次のものができます。

- 新しいディレクトリ: `../repo-feature`
- 新しいブランチ: `feature/hermes-experiment`（このディレクトリにチェックアウトされます）

あとは新しいワークツリーへ `cd` して、そこで Hermes を起動します。

```bash
cd ../repo-feature

# Start Hermes in the worktree
hermes
```

このとき Hermes は次のように動きます。

- `../repo-feature` をプロジェクトのルートとして認識します。
- コンテキストファイル、コードの編集、各種ツールで、このディレクトリを使います。
- `/rollback` について、このワークツリーだけに閉じた **別のチェックポイント履歴** を使います。

## 複数のエージェントを同時に動かす {#running-multiple-agents-in-parallel}

ワークツリーは複数作れて、それぞれに専用のブランチを持たせられます。

```bash
cd /path/to/your/repo

git worktree add ../repo-experiment-a feature/hermes-a
git worktree add ../repo-experiment-b feature/hermes-b
```

別々のターミナルで実行します。

```bash
# Terminal 1
cd ../repo-experiment-a
hermes

# Terminal 2
cd ../repo-experiment-b
hermes
```

それぞれの Hermes プロセスは次のようになります。

- 自分のブランチ（`feature/hermes-a` と `feature/hermes-b`）だけで作業します。
- ワークツリーのパスから導かれる、別々のシャドウリポジトリのハッシュの下にチェックポイントを書き込みます。
- 互いに影響を与えることなく `/rollback` を使えます。

とくに次のような場面で役立ちます。

- まとめてリファクタリングを走らせるとき。
- 同じ課題に対して別のやり方を試すとき。
- 同じ上流リポジトリに対して、CLI のセッションとゲートウェイのセッションを組み合わせて使うとき。

## ワークツリーを安全に片づける {#cleaning-up-worktrees-safely}

試行が終わったら、次の手順で片づけます。

1. 作業を残すか捨てるかを決めます。
2. 残す場合は、次のようにします。
   - いつもどおり、そのブランチを main ブランチへマージします。
3. ワークツリーを削除します。

```bash
cd /path/to/your/repo

# Remove the worktree directory and its reference
git worktree remove ../repo-feature
```

補足です。

- コミットしていない変更が残っていると、`git worktree remove` は強制しない限り削除を拒否します。
- ワークツリーを削除しても、ブランチが自動的に消えるわけでは **ありません**。ブランチは通常の `git branch` コマンドで削除するか、そのまま残せます。
- `~/.hermes/checkpoints/` にある Hermes のチェックポイントのデータは、ワークツリーを削除しても自動では整理されませんが、たいていはごく小さなサイズです。

## うまく使うために {#best-practices}

- **Hermes での試行 1 つにつき、ワークツリー 1 つ**
  - まとまった変更ごとに、専用のブランチとワークツリーを用意します。
  - こうすると差分の焦点が定まり、プルリクエストも小さくレビューしやすくなります。
- **ブランチ名は試行の内容に合わせる**
  - たとえば `feature/hermes-checkpoints-docs`、`feature/hermes-refactor-tests` のようにします。
- **こまめにコミットする**
  - 節目となる区切りは git のコミットで残します。
  - その間にツールが加えた編集に対する安全網としては、[チェックポイントと /rollback](/hermes/docs/user-guide/checkpoints-and-rollback/) を使います。
- **ワークツリーを使うときは、素のリポジトリのルートから Hermes を動かさない**
  - ワークツリーのディレクトリで動かすようにすると、エージェントごとの担当範囲がはっきりします。

## `hermes -w` を使う（ワークツリーを自動で用意するモード） {#using-hermes--w-automatic-worktree-mode}

Hermes には、専用のブランチを持つ **使い捨ての git ワークツリーを自動で作る** `-w` フラグが組み込まれています。ワークツリーを自分で用意する必要はありません。リポジトリへ `cd` して、次を実行するだけです。

```bash
cd /path/to/your/repo
hermes -w
```

このとき Hermes は次のように動きます。

- リポジトリ内の `.worktrees/` の下に、一時的なワークツリーを作ります。
- 分離されたブランチ（たとえば `hermes/hermes-<hash>`）をチェックアウトします。
- そのワークツリーの中で、CLI セッションを最後まで動かします。

Hermes はこのワークツリーをチェックアウトするとき、リポジトリ自身の git の設定を動かしません。フック、`core.fsmonitor`、clean/smudge フィルターはこのチェックアウトでは無効になります。Hermes が kanban のタスクやサブエージェント用に作るワークツリーと同じ扱いです。Git LFS でファイルを保存しているリポジトリでは、ワークツリーにはポインタのファイルが置かれます。セッションでその中身が必要なら、ワークツリーの中で `git lfs pull` を実行してください。

ワークツリーによる分離を得るには、これがいちばん簡単な方法です。単発の問い合わせと組み合わせることもできます。

```bash
hermes -w -z "Fix issue #123"
```

エージェントを同時に動かしたい場合は、ターミナルを複数開いてそれぞれで `hermes -w` を実行してください。実行するたびに、専用のワークツリーとブランチが自動で用意されます。

### 作業が残ったままセッションを終えるとき {#leaving-a-session-with-unfinished-work}

対話型の `hermes -w` セッション（従来の CLI でも `--tui` でも）を終了するとき、その
ワークツリーにコミットしていない変更や push していないコミットがあると、Hermes は次のように尋ねます。

- **ワークツリーを残す**（既定。Enter や Esc を押したときもこれになります）— 何も変わりません。
- **退避してから削除する** — 作業中の状態をまるごと退避し（下記参照）、セッションの終了処理が
  終わる前にツリーを削除します。そのため、大きなツリーでも途中で打ち切られることはありません。
  Hermes は元に戻すための `hermes worktree restore` コマンドを表示します。退避に失敗した場合、
  ツリーは残されます。
- **削除して変更を捨てる** — 自分で明示的に選んだときだけ実行されます。

単発の実行（`-q`、`-z`）、cron のジョブ、ゲートウェイのセッション、ターミナルのない状態での終了では
質問しません。ツリーは残され、あとで古いワークツリーの掃除処理が片づけます。コミットが push 済みで
きれいな状態のツリーは、質問せずに削除されます。

## 古いワークツリーの掃除と復元 {#stale-worktree-sweep-and-restore}

Hermes がワークツリーを作ったリポジトリ（`hermes -w`、`/worktree new`、サブエージェントの
ワークツリー分離、デスクトップアプリの git ペイン）は、使用中のプロファイルの
`<HERMES_HOME>/worktree_repos.json` に記録されます。`hermes -w` の起動時と、cron のタイマーから
6時間ごとに、Hermes はそれぞれのリポジトリの `.worktrees/` を掃除します。

| ツリー | 判断 |
|---|---|
| 区分ごとの期間（`hermes-*`/`subagent-*` は24時間、名前付きのツリーは72時間）を超えて使われておらず、きれいな状態で、取り込み済みまたは push 済み | 削除 |
| 区分ごとの期間を超えて使われておらず、コミットしていない変更や push していないコミットがある | **退避してから削除** |
| 動作中の hermes のロックを持つもの、または作業ディレクトリ（Linux では開いているファイルも）が中にある動作中のプロセスがあるもの | 触らない |
| ファイル、`HEAD`、reflog の動きが区分ごとの期間より新しい（削除されたファイルは、そのフォルダを通じて数えます） | 触らない |
| カンバンのタスク用ツリー（`t_<hex>`） | 触らない（カンバンの GC が管理します） |
| サブモジュールがあるもの: インデックス内の gitlink、またはツリーの `modules/` の下に残っているサブモジュールのリポジトリ（`git submodule deinit` の後でも） | 残す（`keep-submodule-work`: 退避にはサブモジュールの参照先しか記録されないため）。きれいで取り込み済みのツリーが削除されるのは、サブモジュールが一度も初期化されていない場合だけです |
| 中のどこかに埋め込まれたリポジトリがあるもの（gitignore されているかどうかを問わず。例: `build/tool/.git`） | 残す（`keep-unarchivable`） |
| 作業ツリーごとの参照（`refs/worktree/*`、`refs/bisect/*`、`refs/rewritten/*`）からしかたどれないコミットがあるもの | 残す（`keep-worktree-refs`: これらの参照はツリーと一緒に消えるため） |
| `worktrees.archive_max_file_mb` より大きい追跡外のファイルがあるもの | 残す（`keep-large-untracked`） |

**無視対象のファイル。** 無視対象のファイル（`.env` のコピー、キャッシュ、ビルドやテストの出力）は
退避されず、ツリーと一緒に削除されます。唯一の例外は、無視対象のフォルダの中にある入れ子の
git リポジトリで、これがあるとツリーは残されます。

同じ確認は、きれいで取り込み済みのツリーにも行われます。また、変更の有無の確認では、
`status.showUntrackedFiles=no` で隠れてしまうファイルや、skip-worktree / assume-unchanged が
付いていてもインデックスと中身が異なるファイルも数えます。

退避は `refs/hermes/archive/<tree>` に保存されるコミットで、ツリーの `HEAD`、ステージ済みの変更、
ステージしていない変更、追跡外のファイルを含みます（`node_modules/` や `.venv/` のように
`.gitignore` で除外しているファイルは含まれません）。退避は一時的なインデックスを使って作るので、
ツリーそのものが書き換えられることはありません。退避を作れなかった場合、ツリーは残されます。
退避を作っている最中にツリーに入られたり、ステージ済みの変更が動いたり（`git add`、
`git apply --cached`）した場合も、退避は保存されたうえでツリーは残されます。ファイルの中身は
バイト単位でそのまま保存・復元されます。`.gitattributes`、`info/attributes`、`core.attributesFile`
の改行やフィルターの規則は適用されません。`worktrees.archive_max_file_mb` より大きい追跡外の
ファイルは退避から外され、退避の中に一覧として記録されたうえで、ツリーは残されます。終了時の
**Archive** の選択肢とサブエージェントの結果にも、そのことが表示されます。リモートに存在する
ブランチ（開いている PR）は残されます。そうでなければ、退避がそのコミットを保持し、ローカルの
ブランチは削除されます。

```bash
hermes worktree list                 # trees plus archives (name, age, branch, reason)
hermes worktree prune --dry-run      # every archive/remove/skip decision and why; changes nothing
hermes worktree restore lane-x       # recreate .worktrees/lane-x with its branch, staged and untracked files
hermes worktree restore lane-x --path ../lane-x-review
```

復元すると、ブランチが無くなっているか、まだ退避した時点の `HEAD` を指している場合は、
ブランチも元に戻ります。そうでない場合、ツリーはそのコミットで detached の状態で戻ります。
`worktrees.archive_retention_days` より古い退避は、掃除処理が削除します。

```yaml
worktrees:
  archive_dirty: true          # false = never remove dirty/unpushed trees (the old behaviour)
  archive_max_file_mb: 50      # untracked files above this are not archived; their tree is kept
  archive_retention_days: 30   # 0 keeps archives forever
  max_total_gb: 0              # optional budget for idle trees; oldest are archived + removed first
  install_state_retention_days: 14  # dependency state of a missing checkout outside .worktrees/ and
                               # the data root, unused this long, is reclaimed; 0 keeps it forever.
                               # Read from the root profile's config: its profiles share installs/
```

ツリーの数に上限はありません。何百ものサブエージェントを並列で動かしても、それぞれが作業している
あいだは自分のツリーを持ち続けます。`max_total_gb` が追い出すのは、区分ごとの期間を超えて
使われていないツリーだけです。

サブエージェントのワークツリー（`delegation.worktree_isolation: true`）も、子の作業が終わったときに
同じ規則に従います。きれいなツリーは削除され、コミットや編集のあるツリーは退避してから削除されます。
ブランチは、親が取り込めるように残されます。

## まとめると {#putting-it-all-together}

- **git のワークツリー** で、Hermes のセッションごとにきれいなチェックアウトを渡します。
- **ブランチ** で、試行の大きな流れを記録します。
- **チェックポイントと `/rollback`** で、ワークツリーの中での失敗から復帰します。

この組み合わせによって、次のことが得られます。

- 別々のエージェントや試行が互いを踏み荒らさない、という強い保証。
- 素早く回せる反復と、まずい編集からの容易な復帰。
- 整理された、レビューしやすいプルリクエスト。

## 複数のワークツリーにまたがって UI を開発する {#developing-the-ui-surfaces-across-worktrees}

TypeScript で書かれた画面（`ui-tui/`、`apps/desktop/`）には、それぞれ `node_modules` が必要です。ワークツリーごとに `npm ci` をやり直すと、これがブランチの数だけ増えていきます。複数のワークツリーから TUI やデスクトップアプリに手を入れるなら、[TUI & Desktop from Worktrees](/hermes/docs/developer-guide/worktree-ui-dev/) を参照してください。シンボリックリンクで 1 つのインストールを共有する `htui` / `hgui` というヘルパーを紹介しています。
