---
title: "Github — gh CLI で GitHub を扱う: PR、issue、レビュー、リポジトリ、認証"
description: "gh CLI で GitHub を扱う: PR、issue、レビュー、リポジトリ、認証"
upstream_path: user-guide/skills/bundled/software-development/software-development-github.md
upstream_blob: 6a70dc807c44188fee69ea922728a822f71e53c9
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/software-development/software-development-github
---

# Github {#github}

gh CLI で GitHub を扱います。PR、issue、レビュー、リポジトリ、認証まで対応します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/software-development\github` |
| バージョン | `2.0.0` |
| 作者 | Ben Barclay (benbarclay), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `github`, `gh`, `git`, `pull-requests`, `issues`, `code-review`, `repos`, `auth`, `ci` |
| 関連 skill | [`codebase-inspection`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-codebase-inspection/), [`requesting-code-review`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-requesting-code-review/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# GitHub {#github}

`gh` CLI（必要な場面では REST も使います）で GitHub の作業を最初から最後まで進めます。認証、issue、PR のライフサイクル、issue から PR までの受け渡し、コードレビュー、リポジトリ管理までを扱います。この skill はかつて6つに分かれていた skill をまとめたもので、各作業の手順はそれぞれの参照ファイルに全文で入っています。作業を始める前に、必ず対応する参照ファイルを読んでください。以下の本文は行き先を案内するだけです。

## 案内 {#routing}

| やること | 先に読むもの |
|---|---|
| 認証が壊れた / 新しい端末 / トークンや SSH の設定 / gh へのログイン | `references/auth.md` |
| issue の作成、仕分け、ラベル付け、担当割り当て、クローズ | `references/issues.md` |
| ブランチを切る、コミットする、PR を開く、CI を見守る、マージする | `references/pr-workflow.md` |
| ISSUE を検証済みの PR まで運ぶ（受け渡しの一周） | `references/issue-to-pr.md` |
| 他の人の PR をレビューする。差分、行ごとのコメント、可否の判断 | `references/code-review.md` |
| リポジトリのクローン / 作成 / フォーク、リモート、リリース | `references/repo-management.md` |

補助のファイルもあります。`scripts/gh-env.sh` と `scripts/git-credential-token.py`（認証の補助）、`templates/`（PR 本文、バグ報告、機能要望）、`references/ci-troubleshooting.md`、`references/conventional-commits.md`、`references/github-api-cheatsheet.md`、`references/review-output-template.md` です。

## どの作業にも共通する原則 {#core-discipline-applies-to-every-workflow}

- セッションごとに一度、`gh auth status` で事前確認します。失敗したら、ほかの何よりも先に
  `references/auth.md` へ進みます。
- 生の REST より `gh` を優先します。`gh api` に降りるのは、標準のコマンドに無い
  エンドポイントを叩くときだけです（該当するものは早見表に載っています）。
- 自分で `gh pr checks` を確認せずに CI が通ったと報告しないでください。`state,mergedAt` を
  確かめずにマージ済みと言うのも避けます。
- 書き込む前に文脈を全部読みます。`gh issue view --comments` や
  `gh pr view --comments` を使います。判断はタイトルではなくスレッドの中にあります。
- 何かを作る前に重複を探します。
  `gh pr list --search` と `gh issue list --search` を使います。

## 確認 {#verification}

- その作業が終わったと言える条件は、作業ごとの参照ファイルに書いてあります。
- 全体に共通するのは、リモートの状態（CI、マージ、リリース、issue の状態）についての
  主張はすべて、記憶ではなくその場で `gh` から読み直した結果で裏づけることです。
