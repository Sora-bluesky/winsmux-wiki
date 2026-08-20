---
title: "Webhook"
description: "GitHub や GitLab などのサービスからイベントを受け取り、Hermes のエージェントを走らせる"
upstream_path: user-guide/messaging/webhooks.md
upstream_blob: dd1148b0fac12bfd9ec26b1f37d56431f4c9a1f2
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/webhooks
---

# Webhook {#webhooks}

外部のサービス（GitHub、GitLab、JIRA、Stripe など）からイベントを受け取り、Hermes のエージェントを自動で走らせます。webhook アダプターは HTTP サーバーを動かし、POST リクエストを受け付け、HMAC の署名を検証し、受け取ったデータをエージェントへのプロンプトに組み直したうえで、返答を送信元か、別に設定したプラットフォームへ返します。

エージェントはそのイベントを処理し、プルリクエストへのコメント投稿、Telegram や Discord へのメッセージ送信、あるいは結果の記録という形で応じます。

## 動画での解説 {#video-tutorial}

[YouTube: https://www.youtube.com/embed/WNYe5mD4fY8](https://www.youtube.com/embed/WNYe5mD4fY8)

---

## すぐに動かす {#quick-start}

1. `hermes gateway setup` を実行するか、環境変数で有効にします
2. `config.yaml` にルートを定義します。**あるいは** `hermes webhook subscribe` でその場で作ります
3. 使いたいサービスの送信先を `http://your-server:8644/webhooks/<route-name>` に向けます

---

## 設定 {#setup}

webhook アダプターを有効にする方法は 2 つあります。

### 設定ウィザードから {#via-setup-wizard}

```bash
hermes gateway setup
```

画面の案内に従って、webhook を有効にし、ポートと全体共通の HMAC シークレットを決めます。

### 環境変数から {#via-environment-variables}

`~/.hermes/.env` に次を書き足します。

```bash
WEBHOOK_ENABLED=true
WEBHOOK_PORT=8644        # default
WEBHOOK_SECRET=your-global-secret
```

### サーバーの動作を確かめる {#verify-the-server}

ゲートウェイが動いている状態で、次を実行します。

```bash
curl http://localhost:8644/health
```

こう返ってくれば成功です。

```json
{"status": "ok", "platform": "webhook"}
```

---

## ルートを設定する {#configuring-routes}

ルートは、webhook の送信元ごとにどう扱うかを決めるものです。ひとつひとつのルートは、`config.yaml` の `platforms.webhook.extra.routes` の下に名前付きの項目として書きます。

### ルートの項目 {#route-properties}

| 項目 | 必須 | 説明 |
|----------|----------|-------------|
| `events` | いいえ | 受け付けるイベント種別の一覧（例: `["pull_request"]`）。空にするとすべてのイベントを受け付けます。イベント種別は `X-GitHub-Event`、`X-GitLab-Event`、または受信データ内の `event_type` から読み取ります。 |
| `secret` | **はい** | 署名を検証するための HMAC シークレット。ルートに書かない場合は全体共通の `secret` が使われます。`"INSECURE_NO_AUTH"` にすると検証を飛ばしますが、動作確認のときだけにしてください。 |
| `profile` | いいえ | `gateway.multiplex_profiles` を有効にしているとき、このルートを実行してよいプロファイル。既定のプロファイル専用にするなら書かずに置き、プロファイル名（たとえば `coder`）を指定すると、ルートとそのシークレットが `/p/coder/webhooks/<route>` に結び付きます。 |
| `prompt` | いいえ | 受信データにドット区切りで触れるテンプレート文字列（例: `{pull_request.title}`）。省略すると、受信した JSON がまるごとプロンプトに流し込まれます。受信データの各項目は信用できないものとして扱ってください。[認証されていても信用できるとは限らない](#authenticated-does-not-mean-trusted) を参照してください。 |
| `filters` | いいえ | 宣言的に書ける受信データの絞り込み。認証・本文・イベント種別による絞り込みのあと、エージェントの実行や直接送信の前に評価されます。条件に合わないものは HTTP 200 とともに `{"status":"ignored","reason":"filter"}` を返します。 |
| `script` | いいえ | `~/.hermes/scripts/` に置いた、絞り込みや変換のためのスクリプト。受信データは JSON として標準入力に渡されます。標準出力が JSON オブジェクトならテンプレート処理の前に受信データが差し替えられ、ただのテキストなら `script_output` として使えるようになります。標準出力が空、`[SILENT]`、または終了コードが 0 以外のときは、その webhook は無視されます。 |
| `skills` | いいえ | エージェントの実行時に読み込むスキル名の一覧。 |
| `toolsets` | いいえ | ツールセットのキーの一覧（例: `["terminal", "file", "web"]`）。このルートから始まった実行に限って、プラットフォーム全体の webhook 用ツールセットを**置き換えます**。設定ファイルを手で編集したときだけ効き、`hermes webhook subscribe` では指定できません。つまり、エージェントが自分で作った登録に強い権限を与えることはできません。名前の検証は `platform_toolsets` の項目と同じで、知らない名前やそのプラットフォームで禁じられている名前は取り除かれます。[ルートごとのツールセット](#per-route-toolsets) を参照してください。 |
| `deliver` | いいえ | 返答の送り先。`github_comment`、`telegram`、`discord`、`slack`、`signal`、`sms`、`whatsapp`、`matrix`、`mattermost`、`homeassistant`、`email`、`dingtalk`、`feishu`、`wecom`、`weixin`、`bluebubbles`、`qqbot`、または `log`（既定）。 |
| `deliver_extra` | いいえ | 送信に関する追加の設定。指定できるキーは `deliver` の種類によって変わります（`repo`、`pr_number`、`chat_id` など）。値には `prompt` と同じ `{dot.notation}` のテンプレートが使えます。 |
| `deliver_only` | いいえ | `true` にすると、エージェントをまったく通しません。組み立てられた `prompt` が、そのまま送られるメッセージになります。LLM の費用はゼロで、1 秒かからずに届きます。使いどころは [直接送信モード](#direct-delivery-mode) を参照してください。`deliver` に実際の送り先（`log` 以外）が必要です。 |

### 全体を書いた例 {#full-example}

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

### 受信データの絞り込み {#payload-filters}

送信元が幅広いイベントを送ってくるものの、その一部だけでエージェントを動かしたい、あるいは `deliver_only` で送信したい、というときに `filters` を使います。絞り込みは、署名の検証、本文の解析、`events` による判定のあと、プロンプトの組み立て、重複の判定、エージェントへの受け渡し、直接送信のいずれよりも前に走ります。

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
- その場に書いた一覧に対する `in`
- JSON の配列、JSON のオブジェクト（キーが使われます）、改行区切りのテキストファイルに対する `in_file`
- `regex`
- `all`、`any`、`not` によるまとまり

項目の指定にはドット区切りを使います。`payload.foo` は、最上位に `payload` オブジェクトがあればそこから、平坦な受信データならルートから読み取ります。`event` と `event_type` は判定されたイベント種別に対応し、`headers.<Name>` はリクエストのヘッダーを読みます。

### スクリプトによる絞り込みと変換 {#script-filters-and-transforms}

宣言的な絞り込みでは足りないときに `script` を使います。スクリプトは、いま使っているプロファイルの `~/.hermes/scripts/` の下に置く必要があります。相対パスはそこを基準に解決され、そのディレクトリの外に出るような指定は遮られます。`.sh` と `.bash` は bash で、それ以外の拡張子は現在の Python で実行されます。

ルートの受信データは、JSON として標準入力に渡されます。

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

- 標準出力が JSON オブジェクトなら、`prompt` と `deliver_extra` が使う受信データを置き換えます。
- JSON でないテキストが標準出力に出た場合は、`script_output` として受信データに加えられます。
- 標準出力が空、ちょうど `[SILENT]`、`{"__hermes_ignore__": true}`、時間切れ、スクリプトが見つからない、終了コードが 0 以外、のいずれかなら、HTTP 200 とともに `{"status":"ignored","reason":"script"}` を返します。

### プロンプトのテンプレート {#prompt-templates}

プロンプトでは、受信データの入れ子になった項目にドット区切りで触れます。

- `{pull_request.title}` は `payload["pull_request"]["title"]` になります
- `{repository.full_name}` は `payload["repository"]["full_name"]` になります
- `{__raw__}` — **受信データ全体**を字下げ付きの JSON として書き出す特別な書き方です（4000 文字で打ち切られます）。監視の通知や、汎用の webhook で、エージェントに全体を渡したいときに便利です。
- 見つからないキーは、`{key}` という文字列のまま残ります（エラーにはなりません）
- 入れ子の辞書とリストは JSON に変換され、2000 文字で打ち切られます

`{__raw__}` と、ふつうのテンプレート変数を混ぜて書けます。

```yaml
prompt: "PR #{pull_request.number} by {pull_request.user.login}: {__raw__}"
```

ルートに `prompt` のテンプレートを書かなかった場合は、受信データ全体が字下げ付きの JSON として書き出されます（4000 文字で打ち切られます）。

同じドット区切りのテンプレートは、`deliver_extra` の値でも使えます。

### フォーラムのトピックへ送る {#forum-topic-delivery}

webhook の返答を Telegram へ送るとき、`deliver_extra` に `message_thread_id`（または `thread_id`）を入れると、特定のフォーラムトピックを宛先にできます。

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

`deliver_extra` に `chat_id` がない場合は、送り先のプラットフォームに設定されたホームチャンネルへ届きます。

---

## GitHub のプルリクエストをレビューする（手順を追って） {#github-pr-review}

ここでは、プルリクエストが来るたびに自動でコードレビューする設定を作ります。

### 1. GitHub 側で webhook を作る {#1-create-the-webhook-in-github}

1. 対象のリポジトリで **Settings** → **Webhooks** → **Add webhook** と進みます
2. **Payload URL** に `http://your-server:8644/webhooks/github-pr` を入れます
3. **Content type** を `application/json` にします
4. **Secret** を、ルートの設定と同じ値（たとえば `github-webhook-secret`）にします
5. **Which events?** で **Let me select individual events** を選び、**Pull requests** にチェックを入れます
6. **Add webhook** を押します

### 2. ルートの設定を書く {#2-add-the-route-config}

上の例のとおりに、`github-pr` のルートを `~/.hermes/config.yaml` に書き足します。

### 3. `gh` コマンドでログインしておく {#3-ensure-gh-cli-is-authenticated}

`github_comment` での送信は、コメントの投稿に GitHub の CLI を使います。

```bash
gh auth login
```

### 4. 動かしてみる {#4-test-it}

そのリポジトリでプルリクエストを開いてみてください。webhook が飛び、Hermes がイベントを処理し、プルリクエストにレビューのコメントが付きます。

---

## GitLab の webhook を設定する {#gitlab-webhook-setup}

GitLab の webhook もほぼ同じですが、認証のやり方が違います。GitLab はシークレットを `X-Gitlab-Token` ヘッダーにそのまま入れて送り、HMAC ではなく文字列の完全一致で照合します。

### 1. GitLab 側で webhook を作る {#1-create-the-webhook-in-gitlab}

1. 対象のプロジェクトで **Settings** → **Webhooks** と進みます
2. **URL** に `http://your-server:8644/webhooks/gitlab-mr` を入れます
3. **Secret token** を入力します
4. **Merge request events**（ほかに必要なイベントがあればそれも）を選びます
5. **Add webhook** を押します

### 2. ルートの設定を書く {#2-add-the-route-config}

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

## 送り先の選び方 {#delivery-options}

`deliver` の項目は、webhook のイベントを処理したあと、エージェントの返答をどこへ送るかを決めます。

| 送り先の種類 | 説明 |
|-------------|-------------|
| `log` | ゲートウェイのログに返答を書き出します。これが既定で、動作確認に向いています。 |
| `github_comment` | `gh` コマンドを使って、プルリクエストや issue のコメントとして返答を投稿します。`deliver_extra.repo` と `deliver_extra.pr_number` が必要です。ゲートウェイを動かしている端末に `gh` が入っていて、ログイン済みである必要があります（`gh auth login`）。 |
| `telegram` | 返答を Telegram へ送ります。ホームチャンネルが使われますが、`deliver_extra` に `chat_id` を書けばそちらへ届きます。 |
| `discord` | 返答を Discord へ送ります。ホームチャンネルが使われますが、`deliver_extra` に `chat_id` を書けばそちらへ届きます。 |
| `slack` | 返答を Slack へ送ります。ホームチャンネルが使われますが、`deliver_extra` に `chat_id` を書けばそちらへ届きます。 |
| `signal` | 返答を Signal へ送ります。ホームチャンネルが使われますが、`deliver_extra` に `chat_id` を書けばそちらへ届きます。 |
| `sms` | Twilio を通して返答を SMS で送ります。ホームチャンネルが使われますが、`deliver_extra` に `chat_id` を書けばそちらへ届きます。 |
| `whatsapp` | 返答を WhatsApp へ送ります。ホームチャンネルが使われますが、`deliver_extra` に `chat_id` を書けばそちらへ届きます。 |
| `matrix` | 返答を Matrix へ送ります。ホームチャンネルが使われますが、`deliver_extra` に `chat_id` を書けばそちらへ届きます。 |
| `mattermost` | 返答を Mattermost へ送ります。ホームチャンネルが使われますが、`deliver_extra` に `chat_id` を書けばそちらへ届きます。 |
| `homeassistant` | 返答を Home Assistant へ送ります。ホームチャンネルが使われますが、`deliver_extra` に `chat_id` を書けばそちらへ届きます。 |
| `email` | 返答をメールで送ります。ホームチャンネルが使われますが、`deliver_extra` に `chat_id` を書けばそちらへ届きます。 |
| `dingtalk` | 返答を DingTalk へ送ります。ホームチャンネルが使われますが、`deliver_extra` に `chat_id` を書けばそちらへ届きます。 |
| `feishu` | 返答を Feishu/Lark へ送ります。ホームチャンネルが使われますが、`deliver_extra` に `chat_id` を書けばそちらへ届きます。 |
| `wecom` | 返答を WeCom へ送ります。ホームチャンネルが使われますが、`deliver_extra` に `chat_id` を書けばそちらへ届きます。 |
| `weixin` | 返答を Weixin（WeChat）へ送ります。ホームチャンネルが使われますが、`deliver_extra` に `chat_id` を書けばそちらへ届きます。 |
| `bluebubbles` | 返答を BlueBubbles（iMessage）へ送ります。ホームチャンネルが使われますが、`deliver_extra` に `chat_id` を書けばそちらへ届きます。 |

別のプラットフォームへ送る場合は、その送り先もゲートウェイで有効になっていて、つながっている必要があります。`deliver_extra` に `chat_id` を書かなければ、そのプラットフォームに設定されたホームチャンネルへ届きます。

---

## 直接送信モード {#direct-delivery-mode}

既定では、webhook への POST が来るたびにエージェントが走ります。受信データがプロンプトになり、エージェントがそれを処理し、その返答が送られます。つまりイベントごとに LLM の費用がかかります。

**ただ通知を流したいだけ**、推論も対話の繰り返しも要らずメッセージを届けたいだけ、という場合は、そのルートに `deliver_only: true` を書いてください。組み立てられた `prompt` がそのままメッセージの本文になり、アダプターが指定された送り先へ直接届けます。

### 直接送信が向く場面 {#when-to-use-direct-delivery}

- **外部サービスからの通知** — Supabase や Firebase の webhook がデータベースの変更で飛ぶ → その場で Telegram の利用者に知らせる
- **監視の通知** — Datadog や Grafana の通知 webhook → Discord のチャンネルへ流す
- **エージェント同士の連絡** — エージェント A が、長く走っていた処理の完了をエージェント B の利用者に伝える
- **バックグラウンド処理の完了** — 定期実行が終わったら結果を Slack に投稿する

利点は次のとおりです。

- **LLM の消費はゼロ** — エージェントはまったく呼ばれません
- **1 秒かからず届く** — アダプターの呼び出し 1 回だけで、推論の繰り返しがありません
- **安全性はエージェント経由と同じ** — HMAC の認証、回数の制限、重複の防止、本文サイズの上限はすべてそのまま働きます
- **その場で結果が返る** — 送信が成功すれば POST は `200 OK` を、送り先に断られれば `502` を返すので、呼び出し元のサービスが適切に再送を判断できます

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

Supabase のエッジ関数が HMAC-SHA256 で署名し、`https://your-server:8644/webhooks/antenna-matches` に POST します。webhook アダプターは署名を検証し、受信データからテンプレートを組み立て、Telegram へ送り、`200 OK` を返します。

### 例: CLI からその場で登録する {#example-dynamic-subscription-via-cli}

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
| `200 OK` | 送信できました。本文: `{"status": "delivered", "route": "...", "target": "...", "delivery_id": "..."}` |
| `200 OK`（status=duplicate） | 重複を判定する期間（1 時間）のうちに、同じ `X-GitHub-Delivery` の ID が届きました。再送はしません。 |
| `401 Unauthorized` | HMAC の署名が不正か、付いていません。 |
| `400 Bad Request` | 本文の JSON が壊れています。 |
| `404 Not Found` | ルート名が見つかりません。 |
| `413 Payload Too Large` | 本文が `max_body_bytes` を超えました。 |
| `429 Too Many Requests` | そのルートの回数制限を超えました。 |
| `502 Bad Gateway` | 送り先のアダプターがメッセージを断ったか、エラーを出しました。詳しい内容はサーバー側のログに記録され、返る本文はアダプターの内部が漏れないよう `Delivery failed` とだけ書かれています。 |

### 設定で気をつけること {#configuration-gotchas}

- `deliver_only: true` を使うには、`deliver` が実際の送り先である必要があります。`deliver: log`（や `deliver` を書かないこと）は起動時に弾かれ、設定を誤ったルートが見つかるとアダプターは起動を拒みます。
- 直接送信モードでは `skills` の項目は無視されます（エージェントが走らないので、スキルを渡す先がありません）。
- テンプレートの組み立ては、エージェント経由のときと同じ `{dot.notation}` の書き方で、`{__raw__}` も使えます。
- 重複の判定には同じ `X-GitHub-Delivery` / `X-Request-ID` のヘッダーを使います。同じ ID で再送されたものは `status=duplicate` を返し、再度は送りません。

---

## その場での登録（CLI） {#dynamic-subscriptions}

`config.yaml` に固定で書くルートのほかに、`hermes webhook` コマンドでその場で webhook の登録を作れます。エージェント自身が、イベントで動く仕掛けを用意したいときにとくに役立ちます。

### 登録する {#create-a-subscription}

```bash
hermes webhook subscribe github-issues \
  --events "issues" \
  --prompt "New issue #{issue.number}: {issue.title}\nBy: {issue.user.login}\n\n{issue.body}" \
  --deliver telegram \
  --deliver-chat-id "-100123456789" \
  --description "Triage new GitHub issues"
```

実行すると webhook の URL と、自動生成された HMAC シークレットが返ります。使いたいサービスから、その URL へ POST するよう設定してください。

### 登録を一覧する {#list-subscriptions}

```bash
hermes webhook list
```

### 登録を消す {#remove-a-subscription}

```bash
hermes webhook remove github-issues
```

### 登録を試す {#test-a-subscription}

```bash
hermes webhook test github-issues
hermes webhook test github-issues --payload '{"issue": {"number": 42, "title": "Test"}}'
```

### その場で作った登録の仕組み {#how-dynamic-subscriptions-work}

- 登録の内容は `~/.hermes/webhook_subscriptions.json` に保存されます
- webhook アダプターは、リクエストが来るたびにこのファイルを読み直します（更新時刻を見ているので、負荷はごくわずかです）
- 同じ名前があった場合、`config.yaml` に固定で書いたルートが常に優先されます
- その場で作った登録も、固定のルートとまったく同じ書き方と機能（イベント、プロンプトのテンプレート、スキル、送信）を使えます
- ゲートウェイの再起動は要りません。登録した瞬間から動きます

### エージェントに登録させる {#agent-driven-subscriptions}

`webhook-subscriptions` のスキルに導かれる形で、エージェントがターミナルのツールを使って登録を作ることもできます。「GitHub の issue 用に webhook を用意して」と頼めば、エージェントが適切な `hermes webhook subscribe` のコマンドを実行します。

---

## ルートごとのツールセット {#per-route-toolsets}

webhook から始まるエージェントの実行では、既定で意図的に狭いツールセット（`web_search`、`web_extract`、`vision_analyze`、`clarify`）だけを使います。webhook の受信データには外部の信用できない文章が混ざりうるからです。誰でも書ける公開プルリクエストのタイトルや issue のコメントが、指示を紛れ込ませてターミナルに手を伸ばせるようであってはいけません。

**信用できる**ルート、たとえば手元で動く監視デーモンからのシステム通知や、社内の CI からのものについては、ほかの webhook のルートを広げることなく、そのルートだけに広いツールセットを与えられます。

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

その場で作った登録に `toolsets` を足す場合は、`~/.hermes/webhook_subscriptions.json` を直接編集します。

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

動き方と、安全のうえでの性質は次のとおりです。

- ルートに書いた一覧は、そのルートから始まる実行について、プラットフォーム全体の webhook 用ツールセットの解決を**置き換えます**（足し合わせにはなりません）。
- 名前は `platform_toolsets` の設定と同じ経路で検証され、知らない名前や、そのプラットフォームで禁じられているツールセットは取り除かれます。
- `hermes webhook subscribe` は、意図的にツールセットの指定を**受け付けません**。強い権限を与えるのは設定ファイルを手で編集する作業なので、エージェントが実行中に自分で登録を作っても、`terminal` を自分に与えることはできません。
- 強いツールセットを与えるのは、送信元を自分で完全に管理していて、本物の HMAC シークレットを設定したルートだけにしてください。そのルートに正しく署名した POST を送れる人は、実質そのツールを持つエージェントを動かせることになります。

---

## 安全性 {#security}

webhook アダプターには、安全のための仕組みがいくつも重ねてあります。

### HMAC の署名検証 {#hmac-signature-validation}

アダプターは、送信元ごとに適した方法で、届いた webhook の署名を検証します。

- **GitHub**: `X-Hub-Signature-256` ヘッダー — `sha256=` を頭に付けた HMAC-SHA256 の 16 進ダイジェスト
- **GitLab**: `X-Gitlab-Token` ヘッダー — シークレット文字列そのものの一致
- **汎用（V2・推奨）**: `X-Webhook-Signature-V2` と `X-Webhook-Timestamp` のヘッダー — `<timestamp>.<body>` に対する HMAC-SHA256 の 16 進ダイジェスト。タイムスタンプ（Unix 秒）はサーバーの時計から ±300 秒以内である必要があり、これによって盗まれたリクエストがあとから送り直されるのを防ぎます。
- **汎用（V1・旧方式）**: `X-Webhook-Signature` ヘッダー — 本文だけに対する、そのままの HMAC-SHA256 の 16 進ダイジェスト。互換性のためにまだ受け付けますが、送り直しへの備えがありません（盗まれたリクエストはいつまでも通ります）。ゲートウェイはルートごとに一度だけ、廃止予定の警告を記録します。送信元は V2 に切り替えてください。

シークレットを設定しているのに、認識できる署名のヘッダーが付いていない場合、そのリクエストは拒否されます。

### シークレットは必須です {#secret-is-required}

どのルートにもシークレットが要ります。ルートに直接書くか、全体共通の `secret` から引き継ぐかのどちらかです。シークレットのないルートがあると、アダプターは起動時にエラーで止まります。開発や動作確認のときに限り、シークレットを `"INSECURE_NO_AUTH"` にして検証をすべて飛ばせます。

複数プロファイルへの振り分けを有効にしている場合、ルートの
`profile` の項目は、そのシークレットを実行先ひとつに結び付けます。`profile`
を書かないルートは既定のプロファイル専用です。ルートの署名として正しいものを
持っていても、`/p/<profile>/` の接頭辞がルートの結び付きと合わないリクエストは
拒否されます。

`INSECURE_NO_AUTH` は、ゲートウェイがループバックのホスト（`127.0.0.1`、`localhost`、`::1`）に紐付いているときだけ受け付けられます。`0.0.0.0` や LAN の IP のように、ループバック以外に紐付いた状態で使うと、アダプターは起動を拒みます。認証のない入り口をうっかり外向きに開けてしまうのを防ぐためです。

### 回数の制限 {#rate-limiting}

ルートごとに、既定で **1 分あたり 30 リクエスト**に制限されます（決まった時間枠での数え方です）。全体の値はこう設定します。

```yaml
platforms:
  webhook:
    extra:
      rate_limit: 60  # requests per minute
```

制限を超えたリクエストには `429 Too Many Requests` が返ります。

### 重複の防止 {#idempotency}

配信の ID（`X-GitHub-Delivery`、`X-Request-ID`、それらがなければタイムスタンプ）は **1 時間**保持されます。同じものが重ねて届いた場合（webhook の再送など）は、静かに読み飛ばして `200` を返し、エージェントが二重に走るのを防ぎます。

### 本文サイズの上限 {#body-size-limits}

**1 MB** を超える受信データは、本文を読む前に拒否されます。上限はこう設定します。

```yaml
platforms:
  webhook:
    extra:
      max_body_bytes: 2097152  # 2 MB
```

### 認証されていても信用できるとは限らない {#authenticated-does-not-mean-trusted}

:::warning
**HMAC の検証で確かめられるのは_送り主_であって、_中身_ではありません。** 署名が正しいことは、そのルートのシークレットを持つ相手（たとえば GitHub）から届いた、という証明にしかなりません。受信データの中の_業務上の項目_を誰が書いたかについては、何も言っていないのです。プルリクエストのタイトル、コミットメッセージ、issue の説明文をはじめ、上流から流れてくる文章は不特定の第三者が書いたものであり、信用できないものとして扱わなければなりません。

これは、エージェントが読むものすべてに当てはまる考え方と同じです。ウェブページも、ファイルも、ツールの出力も、みな信用できない入力です。Hermes は信用できない文章を禁止語の一覧で無害化しませんし、確実にやることもできません。言い回し、文字の表し方、翻訳によって、そんな仕掛けは簡単にすり抜けられるからです。**信用の境界は、入力の通り道ではなく、エージェントにできることの範囲にあります。** 固めるべきはそちらです。

- **実行環境を隔離する。** インターネットに面して動かすなら、Docker か SSH のターミナルバックエンド（あるいは仮想マシン）でゲートウェイを動かし、乗っ取られた一手が母艦に届かないようにします。
- **ツールの範囲を絞る。** そのルートが読んで要約するだけでよいなら、webhook から始まるセッションでは `terminal`、`file`、外部に働きかけるツールを無効にします。できることが少ないほど、受信データに仕込まれた指示が及ぶ範囲は狭くなります。
- **承認を求める設定を残す。** 壊れうる操作や外部に働きかける操作については承認を挟み、仕込まれた指示が誰も見ていない間に実行されないようにします。
- **テンプレートは狭く書く。** 受信データを丸ごと流し込む `{__raw__}` や空のテンプレートより、項目名を書いた具体的な `prompt`（`{pull_request.title}` など）を選び、意図した項目だけがプロンプトに届くようにします。
:::

---

## 困ったときは {#troubleshooting}

### webhook が届かない {#webhook-not-arriving}

- ポートが開いていて、送信元から届くかどうかを確かめます
- ファイアウォールの設定を見ます。`8644`（または設定したポート）が開いている必要があります
- URL の経路が合っているかを確かめます。`http://your-server:8644/webhooks/<route-name>` です
- `/health` の入り口を叩いて、サーバーが動いているかを確かめます

### 署名の検証に失敗する {#signature-validation-failing}

- ルートの設定にあるシークレットが、送信元に設定したシークレットと完全に一致しているかを確かめます
- GitHub は HMAC 方式です。`X-Hub-Signature-256` を確かめてください
- GitLab はトークンそのものの一致です。`X-Gitlab-Token` を確かめてください
- ゲートウェイのログに `Invalid signature` の警告が出ていないかを見ます

### イベントが無視される {#event-being-ignored}

- そのイベント種別が、ルートの `events` の一覧に入っているかを確かめます
- GitHub のイベントは `pull_request`、`push`、`issues` といった値です（`X-GitHub-Event` ヘッダーの値です）
- GitLab のイベントは `merge_request`、`push` といった値です（`X-GitLab-Event` ヘッダーの値です）
- `events` が空か書かれていない場合は、すべてのイベントを受け付けます

### エージェントが応じない {#agent-not-responding}

- ゲートウェイを前面で動かしてログを見ます: `hermes gateway run`
- プロンプトのテンプレートが意図どおりに組み立てられているかを確かめます
- 送り先が設定されていて、つながっているかを確かめます

### 同じ返答が何度も届く {#duplicate-responses}

- 重複を防ぐ仕組みが働くはずです。送信元が配信の ID のヘッダー（`X-GitHub-Delivery` か `X-Request-ID`）を送っているかを確かめてください
- 配信の ID は 1 時間保持されます

### `gh` コマンドのエラー（GitHub へのコメント送信） {#gh-cli-errors-github-comment-delivery}

- ゲートウェイを動かしている端末で `gh auth login` を実行します
- ログインしている GitHub の利用者が、そのリポジトリへの書き込み権限を持っているかを確かめます
- `gh` が入っていて、PATH から呼べるかを確かめます

---

## 環境変数 {#environment-variables}

| 変数 | 説明 | 既定値 |
|----------|-------------|---------|
| `WEBHOOK_ENABLED` | webhook のプラットフォームアダプターを有効にする | `false` |
| `WEBHOOK_PORT` | webhook を受け取る HTTP サーバーのポート | `8644` |
| `WEBHOOK_SECRET` | 全体共通の HMAC シークレット（ルートに書かれていないときに使われます） | _(なし)_ |
