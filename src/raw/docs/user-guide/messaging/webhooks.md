---
title: "Webhook"
description: "GitHub や GitLab などのサービスからイベントを受け取り、Hermes のエージェント実行を起こす"
upstream_path: user-guide/messaging/webhooks.md
upstream_blob: 71c5774a9e4156f414b31b9a315e875098fdc025
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/webhooks
---

# Webhook {#webhooks}

外部サービス（GitHub、GitLab、JIRA、Stripe など）からイベントを受け取り、Hermes のエージェント実行を自動で起こします。webhook アダプターは HTTP サーバーを動かして POST リクエストを受け取り、HMAC 署名を検証し、ペイロードをエージェントへのプロンプトに変換して、応答を送信元または別の設定済みプラットフォームへ返します。

エージェントはイベントを処理したあと、PR にコメントを書き込む、Telegram や Discord にメッセージを送る、結果をログに残す、といった形で応答できます。

## 動画チュートリアル {#video-tutorial}

[YouTube: https://www.youtube.com/embed/WNYe5mD4fY8](https://www.youtube.com/embed/WNYe5mD4fY8)

---

## 早わかり手順 {#quick-start}

1. `hermes gateway setup` または環境変数で有効にします
2. `config.yaml` にルートを書く**か**、`hermes webhook subscribe` で動的に作ります
3. 送信元サービスの向き先を `http://your-server:8644/webhooks/<route-name>` にします

---

## 準備 {#setup}

webhook アダプターを有効にする方法は 2 つあります。

### セットアップウィザードから {#via-setup-wizard}

```bash
hermes gateway setup
```

案内に従って webhook を有効にし、ポートと全体の HMAC シークレットを設定します。

### 環境変数から {#via-environment-variables}

`~/.hermes/.env` に次を追記します。

```bash
WEBHOOK_ENABLED=true
WEBHOOK_PORT=8644        # default
WEBHOOK_SECRET=your-global-secret
```

### サーバーの動作確認 {#verify-the-server}

ゲートウェイが起動したら、次のコマンドで応答を確かめます。

```bash
curl http://localhost:8644/health
```

期待される応答は次のとおりです。

```json
{"status": "ok", "platform": "webhook"}
```

---

## ルートの設定 {#configuring-routes}

ルートは、webhook の送信元ごとの扱い方を決めるものです。それぞれのルートは `config.yaml` の `platforms.webhook.extra.routes` の下に名前付きの項目として書きます。アダプターの設定（`port`、`host`、`secret`、`routes`）は `platforms.webhook:` の直下に書くこともできます。どちらの書き方でもアダプターに届き、同じキーが両方にあれば `extra:` の下に入れた値が優先されます。

### ルートの項目 {#route-properties}

| 項目 | 必須 | 説明 |
|----------|----------|-------------|
| `events` | いいえ | 受け付けるイベント種別のリスト（例: `["pull_request"]`）。空にすると、すべてのイベントを受け付けます。イベント種別は `X-GitHub-Event`、`X-GitLab-Event`、またはペイロード内の `event_type` から読み取ります。 |
| `secret` | **はい** | 署名検証に使う HMAC シークレット。ルートに書かなければ全体の `secret` が使われます。`"INSECURE_NO_AUTH"` にすると検証を飛ばしますが、これはテスト専用です。 |
| `profile` | いいえ | `gateway.multiplex_profiles` を有効にしているとき、このルートを実行できるプロファイル。省略すると既定プロファイル専用のルートになります。プロファイル名（たとえば `coder`）を指定すると、そのルートとシークレットが `/p/coder/webhooks/<route>` に結び付きます。動的な登録では `hermes webhook subscribe <name> --route-profile coder` で設定します。 |
| `prompt` | いいえ | ペイロードにドット記法でアクセスできるテンプレート文字列（例: `{pull_request.title}`）。省略すると、JSON ペイロード全体がプロンプトに書き出されます。ペイロードの中身は信頼できません。[認証済みは信頼済みではありません](#authenticated-does-not-mean-trusted)を参照してください。 |
| `filters` | いいえ | 宣言的なペイロードのふるい分け。認証・本文・イベントによる絞り込みのあと、エージェント実行や直接配信の前に評価されます。条件に合わない場合は HTTP 200 で `{"status":"ignored","reason":"filter"}` を返します。 |
| `script` | いいえ | `~/.hermes/scripts/` に置いた、ふるい分けや変換のためのスクリプト。webhook のペイロードは JSON として標準入力に渡されます。標準出力が JSON オブジェクトならテンプレート展開前にペイロードを差し替え、テキストなら `script_output` として使えるようになります。標準出力が空、`[SILENT]`、または終了コードが 0 以外のときは、その webhook を無視します。 |
| `skills` | いいえ | エージェント実行時に読み込む skill 名のリスト。 |
| `toolsets` | いいえ | ツールセットのキーのリスト（例: `["terminal", "file", "web"]`）。このルートで起きた実行に限り、プラットフォーム側の webhook 用ツールセットを**置き換え**ます。設定ファイルを手で編集したときだけ効き、`hermes webhook subscribe` では指定できません。つまりエージェントが作った購読が自分で強い権限を得ることはできません。名前は `platform_toolsets` の項目と同じ方法で検証されます（知らない名前やプラットフォーム側で制限された名前は捨てられます）。[ルートごとのツールセット](#per-route-toolsets)を参照してください。 |
| `deliver` | いいえ | 応答の送り先: `github_comment`、`telegram`、`discord`、`slack`、`signal`、`sms`、`whatsapp`、`matrix`、`mattermost`、`homeassistant`、`email`、`dingtalk`、`feishu`、`wecom`、`weixin`、`bluebubbles`、`qqbot`、または `log`（既定）。 |
| `deliver_extra` | いいえ | 配信の追加設定。キーは `deliver` の種類によって変わります（例: `repo`、`pr_number`、`chat_id`）。値には `prompt` と同じ `{dot.notation}` のテンプレートが使えます。 |
| `deliver_only` | いいえ | `true` にすると、エージェントを一切通しません。展開後の `prompt` テンプレートが、そのまま配信されるメッセージになります。LLM の費用はゼロで、1 秒未満で届きます。使いどころは[直接配信モード](#direct-delivery-mode)を参照してください。`deliver` に実際の送り先（`log` 以外）が必要です。 |

### 全体の例 {#full-example}

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      port: 8644
      secret: "global-fallback-secret"
      routes:
        github-pr:
          events: ["pull_request"]
          secret: "github-webhook-secret"
          prompt: |
            Review this pull request:
            Repository: {repository.full_name}
            PR #{number}: {pull_request.title}
            Author: {pull_request.user.login}
            URL: {pull_request.html_url}
            Diff URL: {pull_request.diff_url}
            Action: {action}
          skills: ["github-code-review"]
          deliver: "github_comment"
          deliver_extra:
            repo: "{repository.full_name}"
            pr_number: "{number}"
        deploy-notify:
          events: ["push"]
          secret: "deploy-secret"
          prompt: "New push to {repository.full_name} branch {ref}: {head_commit.message}"
          filters:
            - field: "ref"
              equals: "refs/heads/main"
          deliver: "telegram"
```

### ペイロードのふるい分け {#payload-filters}

送信元が広い範囲のイベントを送ってくるが、その一部だけでエージェントを動かしたい、あるいは `deliver_only` の配信を起こしたい、という場合に `filters` を使います。ふるい分けは、署名の検証・本文の解析・`events` による絞り込みのあと、プロンプトの展開・重複除去・エージェントへの引き渡し・直接配信より前に走ります。

```yaml
platforms:
  webhook:
    extra:
      routes:
        todoist:
          events: ["item:updated"]
          secret: "todoist-secret"
          filters:
            - field: "payload.labels"
              contains: "hermes"
            - any:
                - field: "payload.priority"
                  equals: 4
                - field: "payload.project_id"
                  in_file: "~/.hermes/data/todoist/watchlist.json"
          prompt: "Todoist task changed: {payload.content}"
```

使える演算子は次のとおりです。

- `exists: true|false`
- `missing: true`
- `equals` / `not_equals`
- 文字列・リスト・辞書のキーに対する `contains`
- その場に書いたリストに対する `in`
- JSON 配列、JSON オブジェクト（キーを見ます）、改行区切りのテキストファイルに対する `in_file`
- `regex`
- `all`、`any`、`not` のグループ

フィールドの指定にはドット記法を使います。`payload.foo` は、最上位に `payload` オブジェクトがあればそこから、平坦なペイロードなら webhook 本文の直下から読みます。`event` / `event_type` は解決済みのイベント種別と照合し、`headers.<Name>` はリクエストヘッダーを読みます。

### スクリプトによるふるい分けと変換 {#script-filters-and-transforms}

宣言的なふるい分けでは足りないときに `script` を使います。スクリプトは、動作中のプロファイルの `~/.hermes/scripts/` 配下に置く必要があります。相対パスはそこを基準に解決され、そのディレクトリの外へ出るパス指定は遮断されます。`.sh` と `.bash` は bash で、それ以外の拡張子は現在の Python インタープリターで実行されます。

ルートのペイロードは JSON として標準入力に送られます。

```python
# ~/.hermes/scripts/todoist-hermes-label.py

payload = json.load(sys.stdin)
labels = payload.get("payload", {}).get("labels", [])
if "hermes" not in labels:
    print("[SILENT]")
    raise SystemExit(0)

payload["body"] = payload["payload"]["content"]
print(json.dumps(payload))
```

スクリプトの結果は次のように扱われます。

- 標準出力が JSON オブジェクトなら、`prompt` と `deliver_extra` が使うペイロードを差し替えます。
- 標準出力が JSON ではないテキストなら、`script_output` としてペイロードに足されます。
- 標準出力が空、ちょうど `[SILENT]`、`{"__hermes_ignore__": true}`、タイムアウト、スクリプトが見つからない、終了コードが 0 以外のいずれかなら、HTTP 200 で `{"status":"ignored","reason":"script"}` を返します。

### プロンプトのテンプレート {#prompt-templates}

プロンプトでは、webhook ペイロードの入れ子になった値にドット記法でアクセスします。

- `{pull_request.title}` は `payload["pull_request"]["title"]` になります
- `{repository.full_name}` は `payload["repository"]["full_name"]` になります
- `{__raw__}` — **ペイロード全体**を字下げ付きの JSON として書き出す特別な記号です（4000 文字で切られます）。監視のアラートや、エージェントに全体の状況が要る汎用の webhook で役に立ちます。
- 見つからないキーは `{key}` という文字列のまま残ります（エラーにはなりません）
- 入れ子の辞書やリストは JSON にしたうえで 2000 文字で切られます

`{__raw__}` は通常のテンプレート変数と混ぜて使えます。

```yaml
prompt: "PR #{pull_request.number} by {pull_request.user.login}: {__raw__}"
```

ルートに `prompt` テンプレートを設定していない場合は、ペイロード全体が字下げ付きの JSON として書き出されます（4000 文字で切られます）。

同じドット記法のテンプレートは `deliver_extra` の値でも使えます。

### フォーラムのトピックへ配信する {#forum-topic-delivery}

webhook の応答を Telegram へ配信するとき、`deliver_extra` に `message_thread_id`（または `thread_id`）を入れると、特定のフォーラムトピックへ送れます。

```yaml
webhooks:
  routes:
    alerts:
      events: ["alert"]
      prompt: "Alert: {__raw__}"
      deliver: "telegram"
      deliver_extra:
        chat_id: "-1001234567890"
        message_thread_id: "42"
```

`deliver_extra` に `chat_id` を書かない場合は、送り先プラットフォームに設定したホームチャンネルへ届きます。

---

## GitHub の PR レビュー（手順を追って） {#github-pr-review}

ここでは、プルリクエストごとに自動でコードレビューを走らせる設定を作ります。

### 1. GitHub 側で webhook を作る {#1-create-the-webhook-in-github}

1. 対象のリポジトリで **Settings** → **Webhooks** → **Add webhook** と進みます
2. **Payload URL** に `http://your-server:8644/webhooks/github-pr` を入れます
3. **Content type** を `application/json` にします
4. **Secret** をルートの設定と同じ値にします（例: `github-webhook-secret`）
5. **Which events?** で **Let me select individual events** を選び、**Pull requests** にチェックを入れます
6. **Add webhook** を押します

### 2. ルートの設定を足す {#2-add-the-route-config}

上の例のとおり、`~/.hermes/config.yaml` に `github-pr` ルートを足します。

### 3. `gh` CLI の認証を済ませておく {#3-ensure-gh-cli-is-authenticated}

`github_comment` の配信は、コメントの投稿に GitHub CLI を使います。

```bash
gh auth login
```

### 4. 試す {#4-test-it}

そのリポジトリでプルリクエストを開きます。webhook が飛び、Hermes がイベントを処理して、PR にレビューコメントを書き込みます。

---

## GitLab の webhook 設定 {#gitlab-webhook-setup}

GitLab の webhook もほぼ同じですが、認証のしくみが違います。GitLab はシークレットを `X-Gitlab-Token` ヘッダーにそのまま入れて送ります（HMAC ではなく、文字列の完全一致で照合します）。

### 1. GitLab 側で webhook を作る {#1-create-the-webhook-in-gitlab}

1. 対象のプロジェクトで **Settings** → **Webhooks** と進みます
2. **URL** に `http://your-server:8644/webhooks/gitlab-mr` を入れます
3. **Secret token** を入力します
4. **Merge request events**（必要なら他のイベントも）を選びます
5. **Add webhook** を押します

### 2. ルートの設定を足す {#2-add-the-route-config}

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      routes:
        gitlab-mr:
          events: ["merge_request"]
          secret: "your-gitlab-secret-token"
          prompt: |
            Review this merge request:
            Project: {project.path_with_namespace}
            MR !{object_attributes.iid}: {object_attributes.title}
            Author: {object_attributes.last_commit.author.name}
            URL: {object_attributes.url}
            Action: {object_attributes.action}
          deliver: "log"
```

---

## 配信先の選び方 {#delivery-options}

`deliver` は、webhook のイベントを処理したあと、エージェントの応答をどこへ送るかを決めます。

| 配信の種類 | 説明 |
|-------------|-------------|
| `log` | 応答をゲートウェイのログに書き出します。これが既定で、動作を試すときに便利です。 |
| `github_comment` | `gh` CLI を使って、応答を PR や issue のコメントとして投稿します。`deliver_extra.repo` と `deliver_extra.pr_number` が必要です。ゲートウェイを動かしているホストに `gh` CLI が入っていて、認証済み（`gh auth login`）である必要があります。 |
| `telegram` | 応答を Telegram へ送ります。ホームチャンネルを使うか、`deliver_extra` に `chat_id` を書きます。 |
| `discord` | 応答を Discord へ送ります。ホームチャンネルを使うか、`deliver_extra` に `chat_id` を書きます。 |
| `slack` | 応答を Slack へ送ります。ホームチャンネルを使うか、`deliver_extra` に `chat_id` を書きます。 |
| `signal` | 応答を Signal へ送ります。ホームチャンネルを使うか、`deliver_extra` に `chat_id` を書きます。 |
| `sms` | 応答を Twilio 経由の SMS へ送ります。ホームチャンネルを使うか、`deliver_extra` に `chat_id` を書きます。 |
| `whatsapp` | 応答を WhatsApp へ送ります。ホームチャンネルを使うか、`deliver_extra` に `chat_id` を書きます。 |
| `matrix` | 応答を Matrix へ送ります。ホームチャンネルを使うか、`deliver_extra` に `chat_id` を書きます。 |
| `mattermost` | 応答を Mattermost へ送ります。ホームチャンネルを使うか、`deliver_extra` に `chat_id` を書きます。 |
| `homeassistant` | 応答を Home Assistant へ送ります。ホームチャンネルを使うか、`deliver_extra` に `chat_id` を書きます。 |
| `email` | 応答をメールで送ります。ホームチャンネルを使うか、`deliver_extra` に `chat_id` を書きます。 |
| `dingtalk` | 応答を DingTalk へ送ります。ホームチャンネルを使うか、`deliver_extra` に `chat_id` を書きます。 |
| `feishu` | 応答を Feishu / Lark へ送ります。ホームチャンネルを使うか、`deliver_extra` に `chat_id` を書きます。 |
| `wecom` | 応答を WeCom へ送ります。ホームチャンネルを使うか、`deliver_extra` に `chat_id` を書きます。 |
| `weixin` | 応答を Weixin（WeChat）へ送ります。ホームチャンネルを使うか、`deliver_extra` に `chat_id` を書きます。 |
| `bluebubbles` | 応答を BlueBubbles（iMessage）へ送ります。ホームチャンネルを使うか、`deliver_extra` に `chat_id` を書きます。 |

別のプラットフォームへ送る場合は、送り先のプラットフォームもゲートウェイで有効になっていて、接続済みである必要があります。`deliver_extra` に `chat_id` がなければ、そのプラットフォームに設定したホームチャンネルへ応答が届きます。

---

## 直接配信モード {#direct-delivery-mode}

既定では、webhook への POST があるたびにエージェントが動きます。ペイロードがプロンプトになり、エージェントがそれを処理し、その応答が配信されます。つまりイベントごとに LLM のトークンを使います。

考えたり判断したりする必要がなく、**そのまま通知を届けたいだけ**なら、ルートに `deliver_only: true` を付けます。展開後の `prompt` テンプレートがそのままメッセージ本文になり、アダプターが設定済みの送り先へ直接届けます。

### 直接配信が向く場面 {#when-to-use-direct-delivery}

- **外部サービスからの通知** — Supabase / Firebase の webhook がデータベースの変更で飛ぶ → Telegram の利用者へすぐ知らせる
- **監視のアラート** — Datadog / Grafana のアラート webhook → Discord のチャンネルへ流す
- **エージェント同士の合図** — エージェント A が、長い処理が終わったことをエージェント B の利用者へ知らせる
- **バックグラウンド処理の完了** — cron の処理が終わる → 結果を Slack へ投稿する

利点は次のとおりです。

- **LLM のトークンを使わない** — エージェントは一度も呼ばれません
- **1 秒未満で届く** — アダプターを 1 回呼ぶだけで、推論のループがありません
- **安全面はエージェント経由と同じ** — HMAC 認証、流量制限、重複除去、本文サイズの上限はすべて同じように効きます
- **同期で結果が返る** — 配信が成功すると POST に `200 OK` が返り、送り先が受け付けなければ `502` が返るので、送信側で賢く再送できます

### 例: Supabase から Telegram へ通知する {#example-telegram-push-from-supabase}

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      port: 8644
      secret: "global-secret"
      routes:
        antenna-matches:
          secret: "antenna-webhook-secret"
          deliver: "telegram"
          deliver_only: true
          prompt: "🎉 New match: {match.user_name} matched with you!"
          deliver_extra:
            chat_id: "{match.telegram_chat_id}"
```

Supabase の edge function が HMAC-SHA256 でペイロードに署名し、`https://your-server:8644/webhooks/antenna-matches` へ POST します。webhook アダプターは署名を検証し、ペイロードからテンプレートを展開し、Telegram へ届けて `200 OK` を返します。

### 例: CLI から動的に購読する {#example-dynamic-subscription-via-cli}

```bash
hermes webhook subscribe antenna-matches \
  --deliver telegram \
  --deliver-chat-id "123456789" \
  --deliver-only \
  --prompt "🎉 New match: {match.user_name} matched with you!" \
  --description "Antenna match notifications"
```

### 応答コード {#response-codes}

| ステータス | 意味 |
|--------|---------|
| `200 OK` | 配信できました。本文: `{"status": "delivered", "route": "...", "target": "...", "delivery_id": "..."}` |
| `200 OK`（status=duplicate） | 重複除去の保持時間（1 時間）のうちに、同じ `X-GitHub-Delivery` の ID が届きました。再配信はしません。 |
| `401 Unauthorized` | HMAC 署名が不正、または付いていません。 |
| `400 Bad Request` | JSON の本文が壊れています。 |
| `404 Not Found` | 知らないルート名です。 |
| `413 Payload Too Large` | 本文が `max_body_bytes` を超えました。 |
| `429 Too Many Requests` | ルートの流量制限を超えました。 |
| `502 Bad Gateway` | 送り先のアダプターがメッセージを拒否したか、エラーになりました。詳細はサーバー側のログに残り、応答本文はアダプターの内部が漏れないよう一律で `Delivery failed` になります。 |

### 設定でつまずきやすいところ {#configuration-gotchas}

- `deliver_only: true` には、`deliver` に実際の送り先が必要です。`deliver: log`（または `deliver` の省略）は起動時に弾かれます。設定の誤ったルートが見つかると、アダプターは起動しません。
- 直接配信モードでは `skills` は無視されます（エージェントが動かないので、skill を渡す先がありません）。
- テンプレートの展開は、`{__raw__}` を含めてエージェント経由のときと同じ `{dot.notation}` の書き方です。
- 重複除去は同じ `X-GitHub-Delivery` / `X-Request-ID` ヘッダーを見ます。同じ ID での再送は `status=duplicate` を返し、再配信はしません。

---

## 動的な購読（CLI） {#dynamic-subscriptions}

`config.yaml` に固定で書くルートのほかに、`hermes webhook` コマンドで購読をその場で作れます。エージェント自身がイベント起点の仕掛けを用意するときに特に便利です。

### 購読を作る {#create-a-subscription}

```bash
hermes webhook subscribe github-issues \
  --events "issues" \
  --prompt "New issue #{issue.number}: {issue.title}\nBy: {issue.user.login}\n\n{issue.body}" \
  --deliver telegram \
  --deliver-chat-id "-100123456789" \
  --description "Triage new GitHub issues"
```

実行すると webhook の URL と、自動生成された HMAC シークレットが返ります。送信元サービスがその URL へ POST するように設定してください。

### 購読の一覧を見る {#list-subscriptions}

```bash
hermes webhook list
```

### 購読を消す {#remove-a-subscription}

```bash
hermes webhook remove github-issues
```

### 購読を試す {#test-a-subscription}

```bash
hermes webhook test github-issues
hermes webhook test github-issues --payload '{"issue": {"number": 42, "title": "Test"}}'
```

### 動的な購読のしくみ {#how-dynamic-subscriptions-work}

- 購読は `~/.hermes/webhook_subscriptions.json` に保存されます
- webhook アダプターはリクエストを受けるたびにこのファイルを読み直します（更新時刻を見るので、負荷はごくわずかです）
- 同じ名前があるときは、`config.yaml` の固定ルートが必ず優先されます
- 動的な購読は、固定ルートと同じ書式・同じ機能を使えます（イベント、プロンプトのテンプレート、skill、配信先）
- ゲートウェイの再起動は不要です。購読した瞬間から有効になります

### エージェントに購読を作らせる {#agent-driven-subscriptions}

`webhook-subscriptions` skill の案内があれば、エージェントはターミナルのツールから購読を作れます。「GitHub の issue 用に webhook を設定して」と頼めば、適切な `hermes webhook subscribe` コマンドを実行します。

---

## ルートごとのツールセット {#per-route-toolsets}

webhook から始まるエージェント実行は、既定でわざと狭いツールセット（`web_search`、`web_extract`、`vision_analyze`、`clarify`）になります。webhook のペイロードには第三者が書いた信用できない内容が混ざりうるからです。公開 PR のタイトルや issue のコメントが、プロンプトへの注入を通じてターミナルに手を伸ばせてはいけません。

localhost の監視デーモンがシステムのアラートを送ってくる、社内の CI から送る、といった**信用できる**ルートに限っては、他の webhook ルートを広げずに、そのルートだけ広いツールセットを与えられます。

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      routes:
        oom-emergency:
          secret: "monitor-secret"
          prompt: "Memory emergency: {detail}. Diagnose with ps/free/py-spy and report."
          toolsets: ["terminal", "file", "code_execution", "web"]
          deliver: "telegram"
```

動的な購読でこれを使うには、`~/.hermes/webhook_subscriptions.json` を直接編集して `toolsets` のキーを足します。

```json
{
  "oom-emergency": {
    "secret": "...",
    "prompt": "...",
    "toolsets": ["terminal", "file", "web"],
    "deliver": "telegram"
  }
}
```

挙動と安全面の性質は次のとおりです。

- ルートに書いたリストは、そのルートの実行についてプラットフォーム側の webhook 用ツールセットの解決を**置き換え**ます（併合ではありません）。
- 名前は `platform_toolsets` の設定と同じ経路で検証され、知らない名前やプラットフォーム側で制限されたツールセットは捨てられます。
- `hermes webhook subscribe` には、ツールセットを指定するフラグをあえて用意していません。強い権限を与えるのは設定ファイルを手で編集したときだけなので、エージェントが実行中に自分で購読を作っても `terminal` を自分に与えることはできません。
- 広いツールセットを与えるのは、送信者を完全に自分で握っていて、本物の HMAC シークレットを設定したルートだけにしてください。正しい署名付きのペイロードをそのルートへ POST できる相手は、実質的にそれらのツールを持つエージェントを動かせます。

---

## 安全のしくみ {#security}

webhook アダプターは、いくつもの層で守りを固めています。

### HMAC 署名の検証 {#hmac-signature-validation}

アダプターは、送信元ごとに適した方法で受信した webhook の署名を検証します。

- **GitHub**: `X-Hub-Signature-256` ヘッダー — `sha256=` を先頭に付けた HMAC-SHA256 の 16 進ダイジェスト
- **GitLab**: `X-Gitlab-Token` ヘッダー — シークレット文字列そのものの照合
- **Standard Webhooks**: `webhook-id`、`webhook-timestamp`、`webhook-signature` の各ヘッダー — 署名の対象は `{id}.{timestamp}.{raw_body}` で、署名は `v1,<base64-hmac-sha256>` の形です
- **汎用（V2・推奨）**: `X-Webhook-Signature-V2` と `X-Webhook-Timestamp` のヘッダー — `<timestamp>.<body>` の HMAC-SHA256 の 16 進ダイジェスト。タイムスタンプ（Unix 秒）はサーバー時計の ±300 秒以内である必要があり、これによって盗まれたリクエストの再送を防ぎます。
- **汎用（V1・旧式）**: `X-Webhook-Signature` ヘッダー — 本文だけの HMAC-SHA256 の 16 進ダイジェスト。後方互換のために今も受け付けますが、再送への守りがありません（盗まれたリクエストがいつまでも通ります）。ゲートウェイはルートごとに 1 回、非推奨の警告をログに出します。送信側を V2 へ切り替えてください。

シークレットを設定しているのに、認識できる署名ヘッダーが 1 つもない場合、そのリクエストは拒否されます。

### シークレットは必須 {#secret-is-required}

どのルートにもシークレットが要ります。ルートに直接書くか、全体の `secret` を受け継ぐかのどちらかです。シークレットのないルートがあると、アダプターは起動時にエラーで止まります。開発やテストのときに限り、シークレットを `"INSECURE_NO_AUTH"` にして検証を完全に飛ばせます。

複数プロファイルの振り分けを有効にしている場合、ルートの `profile` 項目は
そのシークレットを 1 つの実行先に結び付けます。`profile` のないルートは
既定プロファイル専用です。ルートの署名が正しくても、`/p/<profile>/` の
接頭辞がルートの結び付きと合わなければ、そのリクエストは拒否されます。

`INSECURE_NO_AUTH` は、ゲートウェイがループバック（`127.0.0.1`、`localhost`、`::1`）で待ち受けているときだけ受け付けられます。`0.0.0.0` や LAN の IP のようにループバック以外で待ち受けている状態で組み合わせると、アダプターは起動しません。認証なしの入口をうっかり外向けに開いてしまうのを防ぐためです。

### 流量制限 {#rate-limiting}

ルートごとに、既定で **1 分あたり 30 リクエスト**に制限されます（固定の時間枠で数えます）。全体の設定を変えるには次のようにします。

```yaml
platforms:
  webhook:
    extra:
      rate_limit: 60  # requests per minute
```

上限を超えたリクエストには `429 Too Many Requests` が返ります。

### 重複の除去 {#idempotency}

配信 ID（`X-GitHub-Delivery`、`svix-id`、`webhook-id`、`X-Request-ID`、またはタイムスタンプで代用）は **1 時間**保持されます。重複した配信（webhook の再送など）は黙って読み飛ばして `200` を返すので、エージェントが二重に動くことはありません。

### 本文サイズの上限 {#body-size-limits}

**1 MB** を超えるペイロードは、本文を読む前に拒否されます。変えるには次のようにします。

```yaml
platforms:
  webhook:
    extra:
      max_body_bytes: 2097152  # 2 MB
```

### 認証済みは信頼済みではありません {#authenticated-does-not-mean-trusted}

:::warning
**HMAC の検証が確かめるのは_送信者_であって、_中身_ではありません。** 署名が正しいことは、そのルートのシークレットを持つ相手（たとえば GitHub）から届いたという証明にすぎません。ペイロードの中の_業務データ_を誰が書いたかについては何も言っていません。PR のタイトル、コミットメッセージ、issue の説明など、上流から来る文章は誰でも書けるものなので、信用できないものとして扱う必要があります。

これは、エージェントが読むものすべてに当てはまる考え方と同じです。Web ページ、ファイル、ツールの出力は、どれも信用できない入力です。Hermes は禁止語リストで信用できない文章を安全にすることはしませんし、確実にはできません。言い回し、符号化、翻訳によって簡単にすり抜けられるからです。**信頼の境界は入力の経路ではなく、エージェントができることの範囲にあります。** 守りはそこに置いてください。

- **実行環境を隔離する。** インターネットに公開するなら、Docker か SSH のターミナルバックエンド（あるいは仮想マシン）でゲートウェイを動かし、乗っ取られたやり取りがホストに手を出せないようにします。
- **ツールの範囲を絞る。** 読んで要約するだけのルートなら、webhook で始まるセッションでは `terminal`、`file`、外部へ働きかけるツールを無効にします。できることが少ないほど、注入された指示が届く範囲も狭くなります。
- **承認を有効にしたままにする。** 壊すおそれのある操作や外部へ働きかける操作については承認を残しておけば、注入された指示が人の目を通らずに実行されることはありません。
- **テンプレートを狭く書く。** `{__raw__}` や、ペイロード全体を書き出す空のテンプレートより、`{pull_request.title}` のように名前を指定した `prompt` を選びます。そうすれば、意図した値だけがプロンプトに入ります。
:::

---

## 困ったとき {#troubleshooting}

### webhook が届かない {#webhook-not-arriving}

- ポートが公開されていて、webhook の送信元から届く状態か確かめます
- ファイアウォールの設定を見ます。`8644`（または設定したポート）が開いている必要があります
- URL のパスが `http://your-server:8644/webhooks/<route-name>` と一致しているか確かめます
- `/health` の入口を叩いて、サーバーが動いていることを確かめます

### 署名の検証に失敗する {#signature-validation-failing}

- ルートの設定にあるシークレットが、webhook の送信元に設定したシークレットと完全に一致しているか確かめます
- GitHub の場合は HMAC を使うので、`X-Hub-Signature-256` を見ます
- GitLab の場合はトークン文字列の照合なので、`X-Gitlab-Token` を見ます
- ゲートウェイのログに `Invalid signature` の警告が出ていないか確かめます

### イベントが無視される {#event-being-ignored}

- そのイベント種別が、ルートの `events` に入っているか確かめます
- GitHub のイベントは `pull_request`、`push`、`issues` のような値です（`X-GitHub-Event` ヘッダーの値）
- GitLab のイベントは `merge_request`、`push` のような値です（`X-GitLab-Event` ヘッダーの値）
- `events` が空、または設定されていなければ、すべてのイベントを受け付けます

### エージェントが応答しない {#agent-not-responding}

- ゲートウェイを前面で動かしてログを見ます: `hermes gateway run`
- プロンプトのテンプレートが正しく展開されているか確かめます
- 送り先が設定済みで、接続できているか確かめます

### 応答が二重に届く {#duplicate-responses}

- 重複除去のしくみで防げるはずです。webhook の送信元が配信 ID のヘッダー（`X-GitHub-Delivery`、`svix-id`、`webhook-id`、`X-Request-ID`）を送っているか確かめます
- 配信 ID は 1 時間保持されます

### `gh` CLI のエラー（GitHub コメントの配信） {#gh-cli-errors-github-comment-delivery}

- ゲートウェイを動かしているホストで `gh auth login` を実行します
- 認証した GitHub の利用者が、そのリポジトリへの書き込み権限を持っているか確かめます
- `gh` が入っていて、PATH に通っているか確かめます

---

## 環境変数 {#environment-variables}

| 変数 | 説明 | 既定値 |
|----------|-------------|---------|
| `WEBHOOK_ENABLED` | webhook のプラットフォームアダプターを有効にします | `false` |
| `WEBHOOK_PORT` | webhook を受け取る HTTP サーバーのポート | `8644` |
| `WEBHOOK_SECRET` | 全体で使う HMAC シークレット（ルートに指定がないときの受け皿） | _(なし)_ |
