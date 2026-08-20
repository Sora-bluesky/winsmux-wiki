---
title: "Git ワークツリー"
description: "git のワークツリーと独立したチェックアウトを使って、同じリポジトリで複数の Hermes エージェントを安全に動かします"
upstream_path: user-guide/git-worktrees.md
upstream_blob: 98b65f3092ae82d4840b0fbc2cd4d40e4717955b
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
セッションを終了するとき、そのツリーは push されていないコミットがある場合にだけ残ります。この挙動は
`hermes -w` とまったく同じです。

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

ワークツリーによる分離を得るには、これがいちばん簡単な方法です。単発の問い合わせと組み合わせることもできます。

```bash
hermes -w -z "Fix issue #123"
```

エージェントを同時に動かしたい場合は、ターミナルを複数開いてそれぞれで `hermes -w` を実行してください。実行するたびに、専用のワークツリーとブランチが自動で用意されます。

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
