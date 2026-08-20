---
title: "Github Issue To Pr — GitHub の issue を、CI の状態を正直に伝えながら検証済みの PR まで運ぶ"
description: "GitHub の issue を、CI の状態を正直に伝えながら検証済みの PR まで運ぶ"
upstream_path: user-guide/skills/bundled/github/github-github-issue-to-pr.md
upstream_blob: 3d821e45b198222c106767118c32245c1d8bde7d
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/github/github-github-issue-to-pr
---

# Github Issue To Pr {#github-issue-to-pr}

GitHub の issue を、CI の状態を正直に伝えながら検証済みの PR まで運びます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/github/github-issue-to-pr` |
| バージョン | `0.1.0` |
| 作者 | Ben Barclay (benbarclay), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `GitHub`, `Issues`, `Coding`, `Pull-Requests`, `CI` |
| 関連 skill | [`github-issues`](/hermes/docs/user-guide/skills/bundled/github/github-github-issues/), [`github-pr-workflow`](/hermes/docs/user-guide/skills/bundled/github/github-github-pr-workflow/), [`systematic-debugging`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-systematic-debugging/), [`test-driven-development`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-test-driven-development/), [`requesting-code-review`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-requesting-code-review/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# GitHub の issue から Pull Request へ {#github-issue-to-pull-request}

GitHub の issue を、テストと検証を済ませた PR に変えます。この skill が受け持つのは最初から最後までの規律です。前提の確認、重複の洗い出し、同じ種類の不具合をまとめて直すこと、そして CI の状態を正直に報告すること。個々の手順そのものは、GitHub 系や開発系の兄弟 skill が受け持ちます。

## こんなときに使います {#when-to-use}

- 「issue #123 を直して PR を出して。」
- 「この GitHub の機能要望を実装して。」
- 「このバグを、CI が通るところまで持っていって。」

向かない場面: すでにある PR のレビューや、変更を伴わないコードの質問への回答。

## 手順 {#procedure}

### 1. issue の現在の姿を読む — 本文とスレッド全体 {#1-read-the-live-issue-body-and-full-thread}

`terminal` で `gh issue view <N> --comments` を実行します。本文は登録された時点のスナップショットにすぎません。いまの状況を持っているのは新しいコメントのほうです。すでにマージされた部分的な修正、新しい原因の分析、メンテナの決定、あるいは自分に向けられた質問が、やるべきことを変えることがあります。あわせて `read_file` でリポジトリの決まりごと（`AGENTS.md`、貢献の手引き）も読みます。いま求められている振る舞い、やらないこと、スレッドで未回答の質問が分かったら完了です。

### 2. すでに動いている作業や重複を洗い出す {#2-sweep-for-existing-and-duplicate-work}

何かを書き始める前に、`gh pr list --search "#<N>" --state all` を実行し、加えて症状の言い換えを2通り以上試します（`gh pr list --search "<subsystem> <symptom>" --state open`）。注目される issue には独立した修正がいくつも集まります。重複を作れば、その作業も功績も無駄になります。最近のコミットがすでに直していないかも確認します: `git log --oneline -20 -- <relevant files>`。この issue に触れている開いた PR と最近のコミットをすべて把握したら、あるいは1つもないと分かったら完了です。

### 3. 前提をいまのコードと突き合わせる — 設計の意図とも突き合わせる {#3-validate-the-premise-against-current-code-and-against-design-intent}

いまの既定ブランチ上で、失敗するテストか再現用のデータを使って、バグを再現するか足りない振る舞いを示します。報告された経路をたどるには `search_files` と `read_file` を使います。次に2つめの問いを確かめます。その「バグ」は、実はわざとそう設計されているのではないか。issue が変えたがっているコードに `git log -p -S "<symbol>"` をかけ、元のコミットの意図を読みます。リンクがないことや制限があること自体が機能である場合は珍しくありません。古びた記述や筋の通らない記述は、そのまま実装せずに疑ってください。いまのコードで原因や機能の欠落を示せて、なおかつ意図された設計とぶつからないと分かったら完了です。

### 4. 受け入れ条件とリスクを決める {#4-define-acceptance-and-risk}

受け入れ条件、インターフェース、移行や状態の変化、互換性、セキュリティとプライバシー、展開、切り戻しを書き出します。条件は1つずつ、テストか明示的な確認方法に結び付けます。レビューする側にとって範囲がはっきり区切られたら完了です。

### 5. 必要十分な最小の変更を実装する — 同じ種類はまとめて直す {#5-implement-the-smallest-complete-change-and-fix-the-class}

隔離したブランチか worktree で作業します。バグの性質に応じて `systematic-debugging` や `test-driven-development` を読み込みます。まず再発防止のテストを足し、それから実装します。修正の形が見えたら、`search_files` で同じ形のバグが兄弟の呼び出し箇所にないか探し、この PR の中でまとめて直します。分かっている兄弟を壊れたまま残す中途半端な修正は、何もしないより悪い結果になります。変更した行はすべて issue に結び付いていなければなりません。ついでの整理はしないでください。対象のテストが通り、元の失敗が再現しなくなり、兄弟の箇所も直したか明確に対象外だと判断できたら完了です。

### 6. 再発防止のテストが効いていることを示す（わざと壊して試す） {#6-prove-the-regression-test-bites-sabotage-run}

テスト対象のその関数だけを一時的に元の振る舞いに戻し、新しいテストを実行して、必ず失敗することを確かめます。その後、修正を戻して通ることを確かめます。修正の有無にかかわらず通るテストは、何も証明していません。修正前のコードで確かに失敗することを示せたら完了です。

### 7. リポジトリの品質チェックを走らせ、すぐ PR を出す {#7-run-repository-quality-gates-then-open-the-pr-immediately}

整形、lint、型チェック、そしてリポジトリで正式とされているテストの入口を、影響範囲に対して実行します。差分には `requesting-code-review` を使います。そのうえで、すぐに push して PR を出します。CI を動かすのは PR であり、いちばん時間がかかるのは CI の待ち時間です。できあがった作業を手元に寝かせないでください。PR まわりの手順は `github-pr-workflow` を読み込みます。ブランチ名とコミットは慣習に沿った形にし、本文では issue にリンクしたうえで、問題・とった手立て・テスト・リスク・対象外を書きます。出した PR は読み返し、head の SHA、ベースブランチ、タイトル、ファイルを確かめます。意図したとおりの差分で PR が存在し、CI が動き出したら完了です。

### 8. CI を正直に見届け、最後まで閉じる {#8-shepherd-ci-honestly-and-close-the-loop}

`gh pr checks` と `gh run view --log-failed` で、いま動いているチェックと失敗ログを確かめます。自分の差分が持ち込んだ失敗と、もともとあった失敗や環境側の失敗を区別します。判断がつかないときは既定ブランチで再現してみます。再実行は、本当に環境側の気まぐれだと分かった場合に1回だけにします。「通った」「マージされた」「リリースされた」は、その状態をいま確かに示す証拠がない限り口にしないでください。PR が取り込まれたら、issue に PR のリンクと一行の説明をコメントします。報告した人が、どう解決したのかをたどれるようにするためです。CI の状態、残っている障害、issue のスレッドが、どれも実際のとおりになったら完了です。

## つまずきやすいところ {#pitfalls}

- issue のコメントを読まず、重複 PR を探さず、いまのコードを見ないまま書き始めてしまう。
- 元のコミットを見れば意図した設計だと分かる振る舞いを「修正」してしまう。
- 1か所の症状だけを直し、同じバグを持つ兄弟の箇所を放置してしまう。
- 修正がなくても通ってしまう再発防止のテストを出してしまう。
- テストを走らせないまま、あるいは無関係な整形の変更を混ぜたまま PR を出してしまう。
- PR ができただけで issue が解決したと言ってしまう。

## 確認 {#verification}

- [ ] issue のスレッドを全部読み、いちばん新しいコメントの状況を計画に反映しましたか。
- [ ] 重複 PR の洗い出しを、issue 番号と2通りの言い換えで実行しましたか。
- [ ] 前提をいまのコードで再現し、設計の意図を git の履歴で確かめましたか。
- [ ] 修正がないと再発防止のテストが失敗することを示しましたか。
- [ ] 兄弟の呼び出し箇所を直したか、明確に対象外だと判断しましたか。
- [ ] 変更した行がすべて issue に結び付いていますか。
- [ ] CI の状態を、いま確かめた証拠だけで報告しましたか。issue に PR のリンクをコメントしましたか。
