---
title: "Webhook で GitHub の PR に自動でコメントする"
description: "Hermes を GitHub につないで、PR の差分を取り、コードの変更をレビューし、コメントを書き込むところまでを自動にします。きっかけは webhook で、こちらから頼む必要はありません"
upstream_path: guides/webhook-github-pr-review.md
upstream_blob: 3f7ec74d2b66a10e8e43e54eca86eb5fbdee9458
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/webhook-github-pr-review
---

# Webhook で GitHub の PR に自動でコメントする {#automated-github-pr-comments-with-webhooks}

この案内では、Hermes Agent を GitHub につないで、プルリクエストの差分を取り、コードの変更を読み解き、コメントを書き込むところまでを自動にします。きっかけは webhook のイベントで、こちらから頼む必要はありません。

PR が開かれたり更新されたりすると、GitHub はあなたの Hermes に webhook の POST を送ります。Hermes は、`gh` の CLI で差分を取ってくるよう指示したプロンプトでエージェントを動かし、その返事が PR のスレッドに書き込まれます。

:::tip 外から届く窓口なしで、もっと簡単に始めたい場合は
公開の URL がない、あるいはとにかく手早く始めたいなら、[GitHub の PR をレビューするエージェントを作る](/hermes/docs/guides/github-pr-review-agent/) をご覧ください。cron ジョブで定期的に PR を見に行く方式なので、NAT やファイアウォールの内側でも動きます。
:::

:::info 詳しい説明
webhook の仕組み全体（設定できる項目、配信の種類、動的な購読、セキュリティの考え方）は [Webhooks](/hermes/docs/user-guide/messaging/webhooks/) をご覧ください。
:::

:::warning プロンプトインジェクションの危険
webhook のペイロードには、攻撃者が自由に書ける内容が入っています。PR のタイトル、コミットのメッセージ、説明文に、悪意のある指示が仕込まれていることがあります。webhook の窓口をインターネットに向けて開くなら、ゲートウェイは隔離された環境（Docker、SSH バックエンド）で動かしてください。下の [セキュリティについて](#security-notes) をご覧ください。
:::

---

## 前提 {#prerequisites}

- Hermes Agent がインストールされ、動いていること（`hermes gateway`）
- ゲートウェイを動かすホストに [`gh` CLI](https://cli.github.com/) が入っていて、認証が済んでいること（`gh auth login`）
- あなたの Hermes に外から届く URL があること（手元で動かしている場合は [ngrok で手元を試す](#local-testing-with-ngrok) をご覧ください）
- 対象の GitHub リポジトリの管理権限（webhook を扱うのに必要です）

---

## ステップ 1 — webhook の受け口を有効にする {#step-1-enable-the-webhook-platform}

`~/.hermes/config.yaml` に、次を足します。

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      port: 8644          # default; change if another service occupies this port
      rate_limit: 30      # max requests per minute per route (not a global cap)

      routes:
        github-pr-review:
          secret: "your-webhook-secret-here"   # must match the GitHub webhook secret exactly
          events:
            - pull_request

          # The agent is instructed to fetch the actual diff before reviewing.
          # {number} and {repository.full_name} are resolved from the GitHub payload.
          prompt: |
            A pull request event was received (action: {action}).

            PR #{number}: {pull_request.title}
            Author: {pull_request.user.login}
            Branch: {pull_request.head.ref} → {pull_request.base.ref}
            Description: {pull_request.body}
            URL: {pull_request.html_url}

            If the action is "closed" or "labeled", stop here and do not post a comment.

            Otherwise:
            1. Run: gh pr diff {number} --repo {repository.full_name}
            2. Review the code changes for correctness, security issues, and clarity.
            3. Write a concise, actionable review comment and post it.

          deliver: github_comment
          deliver_extra:
            repo: "{repository.full_name}"
            pr_number: "{number}"
```

**主な項目:**

| 項目 | 説明 |
|---|---|
| `secret`（ルートごと） | このルートの HMAC の秘密の値。省くと全体の `extra.secret` が使われます。 |
| `events` | 受け付ける `X-GitHub-Event` ヘッダーの値の一覧。空にするとすべて受け付けます。 |
| `prompt` | ひな形。`{field}` と `{nested.field}` が GitHub のペイロードから埋まります。 |
| `deliver` | `github_comment` は `gh pr comment` で投稿します。`log` はゲートウェイのログに書くだけです。 |
| `deliver_extra.repo` | ペイロードから `org/repo` のような値に解決されます。 |
| `deliver_extra.pr_number` | ペイロードから PR の番号に解決されます。 |

:::note ペイロードにコードは入っていません
GitHub の webhook のペイロードには PR のメタ情報（タイトル、説明、ブランチ名、URL）が入っていますが、**差分は入っていません**。上のプロンプトは、実際の変更を取ってくるために `gh pr diff` を実行するようエージェントに指示しています。既定の `hermes-webhook` の道具立ては、あえて絞ってあります（Web の検索と抽出、画像の読み取り、clarify — **ターミナルはなし**）。webhook のペイロードには信用できない内容が入りうるからです。このルートで `gh` を動かせるようにするには、ルートの設定にツールの許可を足します。`toolsets: ["terminal", "web"]` です。[ルートごとの道具立て](/hermes/docs/user-guide/messaging/webhooks/#per-route-toolsets) をご覧ください。
:::

---

## ステップ 2 — ゲートウェイを起動する {#step-2-start-the-gateway}

```bash
hermes gateway
```

こう表示されるはずです。

```
[webhook] Listening on 0.0.0.0:8644 — routes: github-pr-review
```

動いているか確かめます。

```bash
curl http://localhost:8644/health
# {"status": "ok", "platform": "webhook"}
```

---

## ステップ 3 — GitHub に webhook を登録する {#step-3-register-the-webhook-on-github}

1. 対象のリポジトリで **Settings** → **Webhooks** → **Add webhook** と進みます
2. 次を入力します:
   - **Payload URL:** `https://your-public-url.example.com/webhooks/github-pr-review`
   - **Content type:** `application/json`
   - **Secret:** ルートの設定の `secret` に入れたのと同じ値
   - **Which events?** → Select individual events → **Pull requests** にチェック
3. **Add webhook** を押します

GitHub は接続の確認のため、すぐに `ping` のイベントを送ってきます。これは安全に無視されます（`ping` は `events` の一覧に入っていません）。返るのは `{"status": "ignored", "event": "ping"}` です。記録されるのは DEBUG のレベルだけなので、既定のログのレベルでは画面に出てきません。

---

## ステップ 4 — 試しに PR を開く {#step-4-open-a-test-pr}

ブランチを作り、変更を push して、PR を開いてください。30〜90 秒ほど（PR の大きさとモデルによります）で、Hermes がレビューのコメントを書き込むはずです。

エージェントの進み具合をその場で追うには、こうします。

```bash
tail -f "${HERMES_HOME:-$HOME/.hermes}/logs/gateway.log"
```

---

## ngrok で手元を試す {#local-testing-with-ngrok}

Hermes を手元のノート PC で動かしているなら、[ngrok](https://ngrok.com/) で外から届くようにします。

```bash
ngrok http 8644
```

表示された `https://...ngrok-free.app` の URL を、GitHub の Payload URL に入れてください。ngrok の無料枠では、再起動するたびに URL が変わります。そのつど GitHub の webhook を更新することになります。有料の ngrok なら固定のドメインが使えます。

固定の内容を送るルートなら、`curl` だけで動作を試せます。GitHub のアカウントも本物の PR も要りません。

:::tip 手元で試すときは `deliver: log` に
試している間は、設定の `deliver: github_comment` を `deliver: log` に変えておきましょう。そうしないと、テストのペイロードに入っている架空の `org/repo#99` にコメントを書き込もうとして失敗します。プロンプトの出来に納得できたら `deliver: github_comment` に戻してください。
:::

```bash
SECRET="your-webhook-secret-here"
BODY='{"action":"opened","number":99,"pull_request":{"title":"Test PR","body":"Adds a feature.","user":{"login":"testuser"},"head":{"ref":"feat/x"},"base":{"ref":"main"},"html_url":"https://github.com/org/repo/pull/99"},"repository":{"full_name":"org/repo"}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print "sha256="$2}')

curl -s -X POST http://localhost:8644/webhooks/github-pr-review \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -H "X-Hub-Signature-256: $SIG" \
  -d "$BODY"
# Expected: {"status":"accepted","route":"github-pr-review","event":"pull_request","delivery_id":"..."}
```

そのうえで、エージェントが動く様子を眺めます。
```bash
tail -f "${HERMES_HOME:-$HOME/.hermes}/logs/gateway.log"
```

:::note
`hermes webhook test <name>` が効くのは、`hermes webhook subscribe` で作った**動的な購読**だけです。`config.yaml` に書いたルートは読みません。
:::

---

## 特定のアクションだけに絞る {#filtering-to-specific-actions}

GitHub は `pull_request` のイベントを、さまざまなアクションで送ってきます。`opened`、`synchronize`、`reopened`、`closed`、`labeled` などです。`events` の一覧は `X-GitHub-Event` ヘッダーの値で絞り込み、ルートごとの `filters` は `action` などペイロードの項目で絞り込めます。

ステップ 1 のプロンプトは、`closed` と `labeled` のときは早々に切り上げるようエージェントに指示することで、この点に対処しています。

:::warning エージェントは動いてトークンを使います
「そこで止まる」という指示があっても、中身のあるレビューが行われないだけで、`pull_request` のイベントであればアクションにかかわらずエージェントは最後まで動きます。エージェントが目を覚ます前に絞り込むほうがよいです。

```yaml
filters:
  - field: "action"
    in: ["opened", "synchronize", "reopened"]
```

流量の多いリポジトリでは、GitHub Actions のワークフローから条件つきで webhook の URL を呼ぶ形で、さらに手前で絞ることもできます。
:::

> Jinja2 のような条件つきのひな形の書き方はありません。使えるのは `{field}` と `{nested.field}` の置き換えだけです。それ以外は、そのままエージェントに渡ります。

---

## スキルでレビューの調子をそろえる {#using-a-skill-for-consistent-review-style}

[Hermes のスキル](/hermes/docs/user-guide/features/skills/) を読み込ませると、エージェントのレビューの人柄が一定になります。`config.yaml` の `platforms.webhook.extra.routes` の中にあるルートへ、`skills` を足してください。

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      routes:
        github-pr-review:
          secret: "your-webhook-secret-here"
          events: [pull_request]
          prompt: |
            A pull request event was received (action: {action}).
            PR #{number}: {pull_request.title} by {pull_request.user.login}
            URL: {pull_request.html_url}

            If the action is "closed" or "labeled", stop here and do not post a comment.

            Otherwise:
            1. Run: gh pr diff {number} --repo {repository.full_name}
            2. Review the diff using your review guidelines.
            3. Write a concise, actionable review comment and post it.
          skills:
            - review
          deliver: github_comment
          deliver_extra:
            repo: "{repository.full_name}"
            pr_number: "{number}"
```

> **補足:** 読み込まれるのは、一覧のうち最初に見つかったスキル 1 つだけです。Hermes は複数のスキルを重ねません。以降のものは無視されます。

---

## Slack や Discord に返事を送る {#sending-responses-to-slack-or-discord-instead}

ルートの中の `deliver` と `deliver_extra` を、送りたい先に合わせて書き換えます。

```yaml
# Inside platforms.webhook.extra.routes.<route-name>:

# Slack
deliver: slack
deliver_extra:
  chat_id: "C0123456789"   # Slack channel ID (omit to use the configured home channel)

# Discord
deliver: discord
deliver_extra:
  chat_id: "987654321012345678"  # Discord channel ID (omit to use home channel)
```

送り先のプラットフォームも、ゲートウェイで有効になっていて接続されている必要があります。`chat_id` を省くと、そのプラットフォームで設定したホームチャンネルに送られます。

`deliver` に指定できる値: `log` · `github_comment` · `telegram` · `discord` · `slack` · `signal` · `sms`

---

## GitLab でも使えます {#gitlab-support}

同じアダプターが GitLab でも動きます。GitLab は認証に `X-Gitlab-Token` を使い（HMAC ではなく、ただの文字列の一致です）、Hermes はどちらも自動で扱います。

イベントの絞り込みでは、GitLab は `X-GitLab-Event` に `Merge Request Hook`、`Push Hook`、`Pipeline Hook` のような値を入れてきます。`events` にはヘッダーの値をそのまま書いてください。

```yaml
events:
  - Merge Request Hook
```

GitLab のペイロードの項目名は GitHub とは違います。たとえば MR のタイトルは `{object_attributes.title}`、MR の番号は `{object_attributes.iid}` です。ペイロードの構造をいちばん手軽に知るには、webhook の設定にある GitLab の **Test** ボタンと **Recent Deliveries** のログを合わせて使います。あるいは、ルートの設定から `prompt` を省く手もあります。そうすると Hermes は、整形した JSON としてペイロード全体をそのままエージェントに渡すので、エージェントの返事（`deliver: log` にしておけばゲートウェイのログで読めます）がその構造を説明してくれます。

---

## セキュリティについて {#security-notes}

- 本番では **`INSECURE_NO_AUTH` を絶対に使わないでください**。署名の検証が丸ごと無効になります。手元での開発のためだけのものです。
- **webhook の秘密の値は定期的に入れ替えて**、GitHub 側（webhook の設定）と `config.yaml` の両方を更新してください。
- **回数の制限**は、既定でルートごとに毎分 30 回です（`extra.rate_limit` で変えられます）。超えると `429` が返ります。
- **同じ配信が重複したとき**（webhook の再送）は、1 時間だけ覚えておく仕組みで重複を落とします。目印にするのは、あれば `X-GitHub-Delivery`、次に `X-Request-ID`、それもなければミリ秒のタイムスタンプです。配信の ID のヘッダーがどちらも付いていない場合、再送は重複として落とされ**ません**。
- **プロンプトインジェクション:** PR のタイトル、説明、コミットのメッセージは、攻撃者が自由に書けます。悪意のある PR がエージェントの動きを操ろうとしてくることがあります。インターネットに向けて開くなら、ゲートウェイは隔離された環境（Docker、仮想マシン）で動かしてください。

---

## うまくいかないとき {#troubleshooting}

| 症状 | 確かめること |
|---|---|
| `401 Invalid signature` | config.yaml の秘密の値が、GitHub の webhook の秘密の値と一致していません |
| `404 Unknown route` | URL の中のルート名が、`routes:` のキーと一致していません |
| `429 Rate limit exceeded` | ルートごとの毎分 30 回を超えました。GitHub の画面からテストのイベントを再送したときによく起きます。1 分待つか、`extra.rate_limit` を上げてください |
| コメントが書き込まれない | `gh` が入っていない、PATH に無い、または認証が済んでいません（`gh auth login`） |
| エージェントは動くのにコメントが出ない | ゲートウェイのログを見てください。エージェントの出力が空、あるいは「SKIP」だけでも、配信自体は試みられます |
| ポートがすでに使われている | config.yaml の `extra.port` を変えてください |
| エージェントが PR の説明しか読んでいない | プロンプトに `gh pr diff` の指示が入っていません。差分は webhook のペイロードには入っていません |
| ping のイベントが見当たらない | 無視されたイベントは DEBUG のログのレベルでだけ `{"status":"ignored","event":"ping"}` を返します。GitHub 側の配信のログ（リポジトリ → Settings → Webhooks → 対象の webhook → Recent Deliveries）を確かめてください |

**GitHub の Recent Deliveries のタブ**（リポジトリ → Settings → Webhooks → 対象の webhook）には、配信ごとの実際のリクエストのヘッダー、ペイロード、HTTP のステータス、返された本文が並びます。サーバーのログに触らずに原因を突き止める、いちばん早い道です。

---

## 設定の一覧 {#full-config-reference}

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      port: 8644               # listen port (default: 8644)
      secret: ""               # optional global fallback secret
      rate_limit: 30           # requests per minute per route
      max_body_bytes: 1048576  # payload size limit in bytes (default: 1 MB)

      routes:
        <route-name>:
          secret: "required-per-route"
          events: []            # [] = accept all; otherwise list X-GitHub-Event values
          prompt: ""            # {field} / {nested.field} resolved from payload
          skills: []            # first matching skill is loaded (only one)
          deliver: "log"        # log | github_comment | telegram | discord | slack | signal | sms
          deliver_extra: {}     # repo + pr_number for github_comment; chat_id for others
```

---

## 次はどうする {#whats-next}

- **[cron で PR をレビューする](/hermes/docs/guides/github-pr-review-agent/)** — 定期的に PR を見に行く方式。外から届く窓口は要りません
- **[Webhook の一覧](/hermes/docs/user-guide/messaging/webhooks/)** — webhook の受け口の設定を、ひととおり載せています
- **[プラグインを作る](/hermes/docs/developer-guide/plugins/)** — レビューの仕組みを、配れるプラグインにまとめます
- **[プロファイル](/hermes/docs/user-guide/profiles/)** — レビュー専用のプロファイルを、独自の記憶と設定で動かします
