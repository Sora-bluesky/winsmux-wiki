---
title: "自動化の型紙"
description: "そのまま使える自動化の型紙です。予定した実行、GitHub のできごとをきっかけにした実行、API の Webhook、複数のスキルを組み合わせた流れをそろえています。"
upstream_path: guides/automation-blueprints.md
upstream_blob: 7bf861e8e22258438e08d3b5513bf647ae48f853
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/automation-blueprints
---

# 自動化の型紙 {#automation-blueprints}

よくある自動化の形を、そのまま貼り付けて使える型紙にまとめました。時間をきっかけにするものには Hermes に組み込みの [cron スケジューラ](/hermes/docs/user-guide/features/cron/) を、できごとをきっかけにするものには [Webhook の仕組み](/hermes/docs/user-guide/messaging/webhooks/) を使います。

どの型紙も**どのモデルでも**動きます。特定のプロバイダに縛られていません。

cron の書き方ではなく入力欄で値を決めたい場合は、[自動化の型紙カタログ](/hermes/docs/reference/automation-blueprints-catalog/) を見てください。

:::tip 3 つのきっかけ
| きっかけ | やり方 | 使うもの |
|---------|-----|------|
| **予定** | 決まった間隔で動きます（毎時、毎晩、毎週） | `cronjob` ツールか `/cron` スラッシュコマンド |
| **GitHub のできごと** | PR が開かれた、push された、issue が立った、CI の結果が出たときに動きます | Webhook の仕組み（`hermes webhook subscribe`） |
| **API の呼び出し** | 外部のサービスが自分のエンドポイントに JSON を POST します | Webhook の仕組み（config.yaml のルートか `hermes webhook subscribe`） |

3 つとも、Telegram、Discord、Slack、SMS、メール、GitHub のコメント、ローカルのファイルへ届けられます。
:::

---

## 開発の流れ {#development-workflow}

### 毎晩のバックログ仕分け {#nightly-backlog-triage}

新しい issue にラベルを付け、優先度を決め、要約します。まとめをチームのチャンネルに届けます。

**きっかけ:** 予定（毎晩）

```bash
hermes cron create "0 2 * * *" \
  "You are a project manager triaging the NousResearch/hermes-agent GitHub repo.

1. Run: gh issue list --repo NousResearch/hermes-agent --state open --json number,title,labels,author,createdAt --limit 30
2. Identify issues opened in the last 24 hours
3. For each new issue:
   - Suggest a priority label (P0-critical, P1-high, P2-medium, P3-low)
   - Suggest a category label (bug, feature, docs, security)
   - Write a one-line triage note
4. Summarize: total open issues, new today, breakdown by priority

Format as a clean digest. If no new issues, respond with [SILENT]." \
  --name "Nightly backlog triage" \
  --deliver telegram
```

### PR のコードレビューを自動で {#automatic-pr-code-review}

プルリクエストが開かれるたびに自動でレビューします。レビューのコメントを PR に直接投稿します。

**きっかけ:** GitHub の Webhook

**やり方 A — その場で購読を作る（CLI）:**

```bash
hermes webhook subscribe github-pr-review \
  --events "pull_request" \
  --prompt "Review this pull request:
Repository: {repository.full_name}
PR #{pull_request.number}: {pull_request.title}
Author: {pull_request.user.login}
Action: {action}
Diff URL: {pull_request.diff_url}

Fetch the diff with: curl -sL {pull_request.diff_url}

Review for:
- Security issues (injection, auth bypass, secrets in code)
- Performance concerns (N+1 queries, unbounded loops, memory leaks)
- Code quality (naming, duplication, error handling)
- Missing tests for new behavior

Post a concise review. If the PR is a trivial docs/typo change, say so briefly." \
  --skills github-code-review \
  --deliver github_comment
```

**やり方 B — 設定に固定で書く（config.yaml）:**

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      port: 8644
      secret: "your-global-secret"
      routes:
        github-pr-review:
          events: ["pull_request"]
          secret: "github-webhook-secret"
          prompt: |
            Review PR #{pull_request.number}: {pull_request.title}
            Repository: {repository.full_name}
            Author: {pull_request.user.login}
            Diff URL: {pull_request.diff_url}
            Review for security, performance, and code quality.
          skills: ["github-code-review"]
          deliver: "github_comment"
          deliver_extra:
            repo: "{repository.full_name}"
            pr_number: "{pull_request.number}"
```

そのうえで GitHub 側では、**Settings → Webhooks → Add webhook** と進み、Payload URL に `http://your-server:8644/webhooks/github-pr-review`、Content type に `application/json`、Secret に `github-webhook-secret` を入れ、イベントは **Pull requests** を選びます。

### ドキュメントの取り残しを見つける {#docs-drift-detection}

取り込まれた PR を毎週さらって、説明の更新が要りそうな API の変更を探します。

**きっかけ:** 予定（毎週）

```bash
hermes cron create "0 9 * * 1" \
  "Scan the NousResearch/hermes-agent repo for documentation drift.

1. Run: gh pr list --repo NousResearch/hermes-agent --state merged --json number,title,files,mergedAt --limit 30
2. Filter to PRs merged in the last 7 days
3. For each merged PR, check if it modified:
   - Tool schemas (tools/*.py) — may need docs/reference/tools-reference.md update
   - CLI commands (hermes_cli/commands.py, hermes_cli/main.py) — may need docs/reference/cli-commands.md update
   - Config options (hermes_cli/config.py) — may need docs/user-guide/configuration.md update
   - Environment variables — may need docs/reference/environment-variables.md update
4. Cross-reference: for each code change, check if the corresponding docs page was also updated in the same PR

Report any gaps where code changed but docs didn't. If everything is in sync, respond with [SILENT]." \
  --name "Docs drift detection" \
  --deliver telegram
```

### 依存パッケージの脆弱性チェック {#dependency-security-audit}

プロジェクトが使っているパッケージに知られた脆弱性がないかを毎日調べます。

**きっかけ:** 予定（毎日）

```bash
hermes cron create "0 6 * * *" \
  "Run a dependency security audit on the hermes-agent project.

1. cd ~/.hermes/hermes-agent && source .venv/bin/activate
2. Run: pip audit --format json 2>/dev/null || pip audit 2>&1
3. Run: npm audit --json 2>/dev/null (in website/ directory if it exists)
4. Check for any CVEs with CVSS score >= 7.0

If vulnerabilities found:
- List each one with package name, version, CVE ID, severity
- Check if an upgrade is available
- Note if it's a direct dependency or transitive

If no vulnerabilities, respond with [SILENT]." \
  --name "Dependency audit" \
  --deliver telegram
```

---

## 運用と監視 {#devops-monitoring}

### デプロイの確認 {#deploy-verification}

デプロイのたびに動作確認を走らせます。デプロイが終わったときに、CI/CD の仕組みから Webhook へ POST してもらいます。

**きっかけ:** API の呼び出し（Webhook）

```bash
hermes webhook subscribe deploy-verify \
  --events "deployment" \
  --prompt "A deployment just completed:
Service: {service}
Environment: {environment}
Version: {version}
Deployed by: {deployer}

Run these verification steps:
1. Check if the service is responding: curl -s -o /dev/null -w '%{http_code}' {health_url}
2. Search recent logs for errors: check the deployment payload for any error indicators
3. Verify the version matches: curl -s {health_url}/version

Report: deployment status (healthy/degraded/failed), response time, any errors found.
If healthy, keep it brief. If degraded or failed, provide detailed diagnostics." \
  --deliver telegram
```

CI/CD の仕組みからは次のように呼び出します。

```bash
curl -X POST http://your-server:8644/webhooks/deploy-verify \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$(echo -n '{"service":"api","environment":"prod","version":"2.1.0","deployer":"ci","health_url":"https://api.example.com/health"}' | openssl dgst -sha256 -hmac 'your-secret' | cut -d' ' -f2)" \
  -d '{"service":"api","environment":"prod","version":"2.1.0","deployer":"ci","health_url":"https://api.example.com/health"}'
```

### 警告の仕分け {#alert-triage}

監視から上がってきた警告を最近の変更と突き合わせて、返す内容の下書きを作ります。Datadog、PagerDuty、Grafana など、JSON を POST できる監視の仕組みなら何でも使えます。

**きっかけ:** API の呼び出し（Webhook）

```bash
hermes webhook subscribe alert-triage \
  --prompt "Monitoring alert received:
Alert: {alert.name}
Severity: {alert.severity}
Service: {alert.service}
Message: {alert.message}
Timestamp: {alert.timestamp}

Investigate:
1. Search the web for known issues with this error pattern
2. Check if this correlates with any recent deployments or config changes
3. Draft a triage summary with:
   - Likely root cause
   - Suggested first response steps
   - Escalation recommendation (P1-P4)

Be concise. This goes to the on-call channel." \
  --deliver slack
```

### 死活監視 {#uptime-monitor}

30 分ごとにエンドポイントを確認します。止まっているときだけ知らせます。

**きっかけ:** 予定（30 分ごと）

```python title="~/.hermes/scripts/check-uptime.py"

ENDPOINTS = [
    {"name": "API", "url": "https://api.example.com/health"},
    {"name": "Web", "url": "https://www.example.com"},
    {"name": "Docs", "url": "https://docs.example.com"},
]

results = []
for ep in ENDPOINTS:
    try:
        start = time.time()
        req = urllib.request.Request(ep["url"], headers={"User-Agent": "Hermes-Monitor/1.0"})
        resp = urllib.request.urlopen(req, timeout=10)
        elapsed = round((time.time() - start) * 1000)
        results.append({"name": ep["name"], "status": resp.getcode(), "ms": elapsed})
    except Exception as e:
        results.append({"name": ep["name"], "status": "DOWN", "error": str(e)})

down = [r for r in results if r.get("status") == "DOWN" or (isinstance(r.get("status"), int) and r["status"] >= 500)]
if down:
    print("OUTAGE DETECTED")
    for r in down:
        print(f"  {r['name']}: {r.get('error', f'HTTP {r[\"status\"]}')} ")
    print(f"\nAll results: {json.dumps(results, indent=2)}")
else:
    print("NO_ISSUES")
```

```bash
hermes cron create "every 30m" \
  "If the script reports OUTAGE DETECTED, summarize which services are down and suggest likely causes. If NO_ISSUES, respond with [SILENT]." \
  --script ~/.hermes/scripts/check-uptime.py \
  --name "Uptime monitor" \
  --deliver telegram
```

---

## 調査と情報収集 {#research-intelligence}

### 競合リポジトリの偵察 {#competitive-repository-scout}

競合のリポジトリを見て、気になる PR や機能、設計の判断を追いかけます。

**きっかけ:** 予定（毎日）

```bash
hermes cron create "0 8 * * *" \
  "Scout these AI agent repositories for notable activity in the last 24 hours:

Repos to check:
- anthropics/claude-code
- openai/codex
- All-Hands-AI/OpenHands
- Aider-AI/aider

For each repo:
1. gh pr list --repo <repo> --state all --json number,title,author,createdAt,mergedAt --limit 15
2. gh issue list --repo <repo> --state open --json number,title,labels,createdAt --limit 10

Focus on:
- New features being developed
- Architectural changes
- Integration patterns we could learn from
- Security fixes that might affect us too

Skip routine dependency bumps and CI fixes. If nothing notable, respond with [SILENT].
If there are findings, organize by repo with brief analysis of each item." \
  --skill competitive-pr-scout \
  --name "Competitor scout" \
  --deliver telegram
```

### AI ニュースのまとめ {#ai-news-digest}

AI / ML まわりの動きを週に一度まとめます。

**きっかけ:** 予定（毎週）

```bash
hermes cron create "0 9 * * 1" \
  "Generate a weekly AI news digest covering the past 7 days:

1. Search the web for major AI announcements, model releases, and research breakthroughs
2. Search for trending ML repositories on GitHub
3. Check arXiv for highly-cited papers on language models and agents

Structure:
## Headlines (3-5 major stories)
## Notable Papers (2-3 papers with one-sentence summaries)
## Open Source (interesting new repos or major releases)
## Industry Moves (funding, acquisitions, launches)

Keep each item to 1-2 sentences. Include links. Total under 600 words." \
  --name "Weekly AI digest" \
  --deliver telegram
```

### 論文のまとめをノートに残す {#paper-digest-with-notes}

毎日 arXiv を見て、要約をノートアプリに保存します。

**きっかけ:** 予定（毎日）

```bash
hermes cron create "0 8 * * *" \
  "Search arXiv for the 3 most interesting papers on 'language model reasoning' OR 'tool-use agents' from the past day. For each paper, create an Obsidian note with the title, authors, abstract summary, key contribution, and potential relevance to Hermes Agent development." \
  --skill arxiv --skill obsidian \
  --name "Paper digest" \
  --deliver local
```

---

## GitHub のできごとで動かす {#github-event-automations}

### issue に自動でラベルを付ける {#issue-auto-labeling}

新しい issue に自動でラベルを付け、返事を書きます。

**きっかけ:** GitHub の Webhook

```bash
hermes webhook subscribe github-issues \
  --events "issues" \
  --prompt "New GitHub issue received:
Repository: {repository.full_name}
Issue #{issue.number}: {issue.title}
Author: {issue.user.login}
Action: {action}
Body: {issue.body}
Labels: {issue.labels}

If this is a new issue (action=opened):
1. Read the issue title and body carefully
2. Suggest appropriate labels (bug, feature, docs, security, question)
3. If it's a bug report, check if you can identify the affected component from the description
4. Post a helpful initial response acknowledging the issue

If this is a label or assignment change, respond with [SILENT]." \
  --deliver github_comment
```

### CI の失敗を読み解く {#ci-failure-analysis}

CI が失敗した原因を調べ、PR に診断結果を投稿します。

**きっかけ:** GitHub の Webhook

```yaml
# config.yaml route
platforms:
  webhook:
    enabled: true
    extra:
      routes:
        ci-failure:
          events: ["check_run"]
          secret: "ci-secret"
          prompt: |
            CI check failed:
            Repository: {repository.full_name}
            Check: {check_run.name}
            Status: {check_run.conclusion}
            PR: #{check_run.pull_requests.0.number}
            Details URL: {check_run.details_url}

            If conclusion is "failure":
            1. Fetch the log from the details URL if accessible
            2. Identify the likely cause of failure
            3. Suggest a fix
            If conclusion is "success", respond with [SILENT].
          deliver: "github_comment"
          deliver_extra:
            repo: "{repository.full_name}"
            pr_number: "{check_run.pull_requests.0.number}"
```

### リポジトリをまたいで変更を移す {#auto-port-changes-across-repos}

片方のリポジトリで PR が取り込まれたら、同じ内容の変更をもう片方へ自動で移します。

**きっかけ:** GitHub の Webhook

```bash
hermes webhook subscribe auto-port \
  --events "pull_request" \
  --prompt "PR merged in the source repository:
Repository: {repository.full_name}
PR #{pull_request.number}: {pull_request.title}
Author: {pull_request.user.login}
Action: {action}
Merge commit: {pull_request.merge_commit_sha}

If action is 'closed' and pull_request.merged is true:
1. Fetch the diff: curl -sL {pull_request.diff_url}
2. Analyze what changed
3. Determine if this change needs to be ported to the Go SDK equivalent
4. If yes, create a branch, apply the equivalent changes, and open a PR on the target repo
5. Reference the original PR in the new PR description

If action is not 'closed' or not merged, respond with [SILENT]." \
  --skills github-pr-workflow \
  --deliver log
```

---

## 事業まわりの仕事 {#business-operations}

### Stripe の入金を見張る {#stripe-payment-monitoring}

支払いのできごとを追いかけ、失敗したものをまとめて受け取ります。

**きっかけ:** API の呼び出し（Webhook）

```bash
hermes webhook subscribe stripe-payments \
  --events "payment_intent.succeeded,payment_intent.payment_failed,charge.dispute.created" \
  --prompt "Stripe event received:
Event type: {type}
Amount: {data.object.amount} cents ({data.object.currency})
Customer: {data.object.customer}
Status: {data.object.status}

For payment_intent.payment_failed:
- Identify the failure reason from {data.object.last_payment_error}
- Suggest whether this is a transient issue (retry) or permanent (contact customer)

For charge.dispute.created:
- Flag as urgent
- Summarize the dispute details

For payment_intent.succeeded:
- Brief confirmation only

Keep responses concise for the ops channel." \
  --deliver slack
```

### 毎日の売上まとめ {#daily-revenue-summary}

大事な数字を毎朝そろえます。

**きっかけ:** 予定（毎日）

```bash
hermes cron create "0 8 * * *" \
  "Generate a morning business metrics summary.

Search the web for:
1. Current Bitcoin and Ethereum prices
2. S&P 500 status (pre-market or previous close)
3. Any major tech/AI industry news from the last 12 hours

Format as a brief morning briefing, 3-4 bullet points max.
Deliver as a clean, scannable message." \
  --name "Morning briefing" \
  --deliver telegram
```

---

## 複数のスキルを組み合わせる {#multi-skill-workflows}

### 安全点検のひとそろい {#security-audit-pipeline}

いくつかのスキルを組み合わせて、週に一度の広い安全点検を行います。

**きっかけ:** 予定（毎週）

```bash
hermes cron create "0 3 * * 0" \
  "Run a comprehensive security audit of the hermes-agent codebase.

1. Check for dependency vulnerabilities (pip audit, npm audit)
2. Search the codebase for common security anti-patterns:
   - Hardcoded secrets or API keys
   - SQL injection vectors (string formatting in queries)
   - Path traversal risks (user input in file paths without validation)
   - Unsafe deserialization (pickle.loads, yaml.load without SafeLoader)
3. Review recent commits (last 7 days) for security-relevant changes
4. Check if any new environment variables were added without being documented

Write a security report with findings categorized by severity (Critical, High, Medium, Low).
If nothing found, report a clean bill of health." \
  --skill codebase-security-audit \
  --name "Weekly security audit" \
  --deliver telegram
```

### 記事づくりのひとそろい {#content-pipeline}

決まった間隔で、調べて、下書きして、書き出すところまでを進めます。

**きっかけ:** 予定（毎週）

```bash
hermes cron create "0 10 * * 3" \
  "Research and draft a technical blog post outline about a trending topic in AI agents.

1. Search the web for the most discussed AI agent topics this week
2. Pick the most interesting one that's relevant to open-source AI agents
3. Create an outline with:
   - Hook/intro angle
   - 3-4 key sections
   - Technical depth appropriate for developers
   - Conclusion with actionable takeaway
4. Save the outline to ~/drafts/blog-$(date +%Y%m%d).md

Keep the outline to ~300 words. This is a starting point, not a finished post." \
  --name "Blog outline" \
  --deliver local
```

---

## 早見表 {#quick-reference}

### 予定の書き方 {#cron-schedule-syntax}

| 書き方 | 意味 |
|-----------|---------|
| `every 30m` | 30 分ごと |
| `every 2h` | 2 時間ごと |
| `0 2 * * *` | 毎日 午前 2:00 |
| `0 9 * * 1` | 毎週月曜 午前 9:00 |
| `0 9 * * 1-5` | 平日 午前 9:00 |
| `0 3 * * 0` | 毎週日曜 午前 3:00 |
| `0 */6 * * *` | 6 時間ごと |

### 配信先 {#delivery-targets}

| 宛先 | オプション | 補足 |
|--------|------|-------|
| 同じチャット | `--deliver origin` | 既定です。ジョブを作った場所に届きます |
| ローカルのファイル | `--deliver local` | 出力を保存するだけで、通知はしません |
| Telegram | `--deliver telegram` | ホームのチャンネル。宛先を指定するなら `telegram:CHAT_ID` |
| Discord | `--deliver discord` | ホームのチャンネル。または `discord:CHANNEL_ID` |
| Slack | `--deliver slack` | ホームのチャンネル |
| SMS | `--deliver sms:+15551234567` | 電話番号あてに直接 |
| 特定のスレッド | `--deliver telegram:-100123:456` | Telegram のフォーラムのトピック |

### Webhook で使える差し込み文字 {#webhook-template-variables}

| 差し込み文字 | 説明 |
|----------|-------------|
| `{pull_request.title}` | PR のタイトル |
| `{issue.number}` | issue の番号 |
| `{repository.full_name}` | `owner/repo` |
| `{action}` | できごとの種類（opened、closed など） |
| `{__raw__}` | JSON の中身すべて（4000 文字で切られます） |
| `{sender.login}` | できごとを起こした GitHub のユーザー |

### [SILENT] という書き方 {#the-silent-pattern}

定期実行の返答に `[SILENT]` が含まれていると、配信は止まります。何もなかった回の通知でうるさくならないように使ってください。

```
If nothing noteworthy happened, respond with [SILENT].
```

こうしておくと、エージェントが伝えることを持っているときだけ通知が来ます。
