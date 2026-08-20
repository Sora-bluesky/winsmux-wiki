---
title: "チュートリアル: GitHub の PR をレビューするエージェント"
description: "リポジトリを見張り、プルリクエストをレビューして、その結果を手を触れずに届けてくれる AI レビュアーを作ります"
upstream_path: guides/github-pr-review-agent.md
upstream_blob: f45684973bd45028efc2c8e2291998a024705b71
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/github-pr-review-agent
---

# チュートリアル: GitHub の PR をレビューするエージェントを作る {#tutorial-build-a-github-pr-review-agent}

**困っていること:** チームが PR を出す速さに、レビューが追いつきません。PR は誰かが見てくれるまで何日も置かれたままです。若手が書いたバグが、誰も確かめる時間を取れずにマージされていきます。午前中は差分の追いかけに消えて、作る時間がありません。

**その答え:** リポジトリを一日中見張り、新しい PR をバグ・セキュリティ・コードの質の観点でレビューして、要点をあなたに送るエージェントです。人の判断が本当に要る PR にだけ時間を使えばよくなります。

**作るもの:**

```
┌───────────────────────────────────────────────────────────────────┐
│                                                                   │
│   Cron Timer  ──▶  Hermes Agent  ──▶  GitHub API  ──▶  Review     │
│   (every 2h)       + gh CLI           (PR diffs)       delivery   │
│                    + skill                             (Telegram, │
│                    + memory                            Discord,   │
│                                                        local)     │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

この案内では、**cron ジョブ**で定期的に PR を見に行きます。サーバーも外から届く窓口も要りません。NAT やファイアウォールの内側でも動きます。

:::tip すぐに反応してほしい場合は
外から届く窓口を用意できるなら、[Webhook で GitHub の PR に自動でコメントする](/hermes/docs/guides/webhook-github-pr-review/) をご覧ください。PR が開かれたり更新されたりした瞬間に、GitHub が Hermes へ知らせてくれます。
:::

---

## 前提 {#prerequisites}

- **Hermes Agent がインストール済みであること** — [Installation guide](/hermes/docs/getting-started/installation/) をご覧ください
- cron ジョブのために**ゲートウェイが動いていること**:
  ```bash
  hermes gateway install   # Install as a service
  # or
  hermes gateway           # Run in foreground
  ```
- **GitHub CLI（`gh`）が入っていて、認証が済んでいること**:
  ```bash
  # Install
  brew install gh        # macOS
  sudo apt install gh    # Ubuntu/Debian

  # Authenticate
  gh auth login
  ```
- **メッセージ連携の設定**（必須ではありません） — [Telegram](/hermes/docs/user-guide/messaging/telegram/) か [Discord](/hermes/docs/user-guide/messaging/discord/)

:::tip メッセージ連携がなくても大丈夫
`deliver: "local"` を指定すると、レビューは `~/.hermes/cron/output/` に保存されます。通知を組み立てる前に試すのにちょうどいい方法です。
:::

---

## ステップ 1: 下ごしらえを確かめる {#step-1-verify-the-setup}

Hermes から GitHub に手が届くか確かめます。チャットを始めてください。

```bash
hermes
```

簡単なコマンドで試します。

```
Run: gh pr list --repo NousResearch/hermes-agent --state open --limit 3
```

開いている PR の一覧が出てくるはずです。これが動けば準備は整っています。

---

## ステップ 2: 手動でレビューさせてみる {#step-2-try-a-manual-review}

同じチャットのまま、実在するプルリクエストのレビューを頼んでみます。

```
Review this pull request. Read the diff, check for bugs, security issues,
and code quality. Be specific about line numbers and quote problematic code.

Run: gh pr diff 3888 --repo NousResearch/hermes-agent
```

Hermes はこう動きます。
1. `gh pr diff` を実行してコードの変更を取ってくる
2. 差分を最後まで読む
3. 具体的な指摘のついた、形の整ったレビューを書く

出来ばえに納得できたら、いよいよ自動にします。

---

## ステップ 3: レビュー用のスキルを作る {#step-3-create-a-review-skill}

スキルを用意すると、セッションをまたいでも cron の実行でも、Hermes は同じ物差しでレビューしてくれます。なければ、レビューの質はそのときどきでばらつきます。

```bash
mkdir -p ~/.hermes/skills/code-review
```

`~/.hermes/skills/code-review/SKILL.md` を作ります。

```markdown
---
name: code-review
description: Review pull requests for bugs, security issues, and code quality
---

# Code Review Guidelines

When reviewing a pull request:

## What to Check
1. **Bugs** — Logic errors, off-by-one, null/undefined handling
2. **Security** — Injection, auth bypass, secrets in code, SSRF
3. **Performance** — N+1 queries, unbounded loops, memory leaks
4. **Style** — Naming conventions, dead code, missing error handling
5. **Tests** — Are changes tested? Do tests cover edge cases?

## Output Format
For each finding:
- **File:Line** — exact location
- **Severity** — Critical / Warning / Suggestion
- **What's wrong** — one sentence
- **Fix** — how to fix it

## Rules
- Be specific. Quote the problematic code.
- Don't flag style nitpicks unless they affect readability.
- If the PR looks good, say so. Don't invent problems.
- End with: APPROVE / REQUEST_CHANGES / COMMENT
```

読み込まれたか確かめましょう。`hermes` を起動すると、立ち上がりのスキル一覧に `code-review` が出てくるはずです。

---

## ステップ 4: チームの決まりごとを覚えさせる {#step-4-teach-it-your-conventions}

レビュアーが本当に役に立つかどうかは、ここで決まります。セッションを始めて、チームの基準を Hermes に教えます。

```
Remember: In our backend repo, we use Python with FastAPI.
All endpoints must have type annotations and Pydantic models.
We don't allow raw SQL — only SQLAlchemy ORM.
Test files go in tests/ and must use pytest fixtures.
```

```
Remember: In our frontend repo, we use TypeScript with React.
No `any` types allowed. All components must have props interfaces.
We use React Query for data fetching, never useEffect for API calls.
```

覚えたことはずっと残ります。毎回言わなくても、レビュアーはチームの決まりごとを守らせてくれます。

---

## ステップ 5: 自動で走る cron ジョブを作る {#step-5-create-the-automated-cron-job}

ここまでを一本につなぎます。2 時間おきに走る cron ジョブを作ります。

```bash
hermes cron create "0 */2 * * *" \
  "Check for new open PRs and review them.

Repos to monitor:
- myorg/backend-api
- myorg/frontend-app

Steps:
1. Run: gh pr list --repo REPO --state open --limit 5 --json number,title,author,createdAt
2. For each PR created or updated in the last 4 hours:
   - Run: gh pr diff NUMBER --repo REPO
   - Review the diff using the code-review guidelines
3. Format output as:

## PR Reviews — today

### [repo] #[number]: [title]
**Author:** [name] | **Verdict:** APPROVE/REQUEST_CHANGES/COMMENT
[findings]

If no new PRs found, say: No new PRs to review." \
  --name "pr-review" \
  --deliver telegram \
  --skill code-review
```

予約できているか確かめます。

```bash
hermes cron list
```

### ほかにも使える予約の書き方 {#other-useful-schedules}

| 予約 | いつ走るか |
|----------|------|
| `0 */2 * * *` | 2 時間おき |
| `0 9,13,17 * * 1-5` | 平日のみ、1 日 3 回 |
| `0 9 * * 1` | 毎週月曜の朝にまとめて |
| `30m` | 30 分おき（PR の多いリポジトリ向け） |

---

## ステップ 6: 好きなときに走らせる {#step-6-run-it-on-demand}

予約の時刻を待ちたくないときは、自分で動かせます。

```bash
hermes cron run pr-review
```

チャットのセッションからでも動かせます。

```
/cron run pr-review
```

---

## もう一歩先へ {#going-further}

### レビューを GitHub に直接書き込む {#post-reviews-directly-to-github}

Telegram に送る代わりに、PR そのものにコメントさせることもできます。

cron のプロンプトに、これを足します。

```
After reviewing, post your review:
- For issues: gh pr review NUMBER --repo REPO --comment --body "YOUR_REVIEW"
- For critical issues: gh pr review NUMBER --repo REPO --request-changes --body "YOUR_REVIEW"
- For clean PRs: gh pr review NUMBER --repo REPO --approve --body "Looks good"
```

:::caution
`gh` のトークンに `repo` の権限があるか確かめてください。レビューは、`gh` が認証している本人の名前で投稿されます。
:::

### 週に一度の PR ダッシュボード {#weekly-pr-dashboard}

月曜の朝に、すべてのリポジトリの様子をまとめさせます。

```bash
hermes cron create "0 9 * * 1" \
  "Generate a weekly PR dashboard:
- myorg/backend-api
- myorg/frontend-app
- myorg/infra

For each repo show:
1. Open PR count and oldest PR age
2. PRs merged this week
3. Stale PRs (older than 5 days)
4. PRs with no reviewer assigned

Format as a clean summary." \
  --name "weekly-dashboard" \
  --deliver telegram
```

### 複数のリポジトリを見張る {#multi-repo-monitoring}

プロンプトにリポジトリを足していけば、そのまま広げられます。エージェントは順番に処理していくので、ほかに用意するものはありません。

---

## うまくいかないとき {#troubleshooting}

### 「gh: command not found」と出る {#gh-command-not-found}
ゲートウェイは必要最小限の環境で動いています。`gh` がシステムの PATH にあることを確かめて、ゲートウェイを再起動してください。

### レビューの中身がありきたりになる {#reviews-are-too-generic}
1. `code-review` のスキルを足す（ステップ 3）
2. チームの決まりごとを記憶として教える（ステップ 4）
3. あなたの技術の組み合わせについて知っていることが増えるほど、レビューは良くなります

### cron ジョブが走らない {#cron-job-doesnt-run}
```bash
hermes gateway status    # Is the gateway running?
hermes cron list         # Is the job enabled?
```

### 回数の上限 {#rate-limits}
GitHub は認証済みのユーザーに、1 時間あたり 5,000 回の API 呼び出しを許しています。PR 1 件のレビューで使うのは 3〜5 回ほどです（一覧、差分、必要ならコメント）。1 日に 100 件レビューしても、上限には十分な余裕があります。

---

## 次はどうする {#whats-next}

- **[Webhook で PR をレビューする](/hermes/docs/guides/webhook-github-pr-review/)** — PR が開かれた瞬間にレビューします（外から届く窓口が要ります）
- **[毎朝のブリーフィングボット](/hermes/docs/guides/daily-briefing-bot/)** — PR のレビューを、朝のニュースのまとめと一緒に届けます
- **[プラグインを作る](/hermes/docs/developer-guide/plugins/)** — レビューの仕組みを、配れるプラグインにまとめます
- **[プロファイル](/hermes/docs/user-guide/profiles/)** — レビュー専用のプロファイルを、独自の記憶と設定で動かします
- **[フォールバックのプロバイダー](/hermes/docs/user-guide/features/fallback-providers/)** — どれか 1 つが落ちていても、レビューが止まらないようにします
