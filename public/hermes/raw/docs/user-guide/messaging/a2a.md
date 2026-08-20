---
title: "user-guide/messaging/a2a"
description: ""
upstream_path: user-guide/messaging/a2a.md
upstream_blob: 92d98d19d94086a0d772e07bf6ac2def31a4012d
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/a2a
---

# A2A（エージェント間連携） {#a2a-agent-to-agent}

[A2A](https://a2a-protocol.org) は、独立した AI エージェント同士がやり取りするためのオープンな Agent2Agent プロトコル（v1.0、Linux Foundation が運営）です。Hermes の A2A プラグインは **双方向** に働きます。自分のエージェントがほかの A2A エージェントをツールとして呼べますし、ほかのエージェントが HTTP 経由で自分の Hermes にタスクを送ることもできます。

A2A に対応した相手なら何とでもつながります。別の Hermes、LangChain、CrewAI、Google ADK のエージェント、公式の `a2a-sdk` で作られたものなど、どれでも構いません。

## A2A を使う場面 {#when-to-use-a2a}

- **端末をまたいだ Hermes 同士** — 手元のエージェントからサーバー上の Hermes へ仕事を渡す、あるいはその逆。それぞれが自分の記憶、ツール、認証情報を持ったまま連携できます。
- **専門のエージェントに任せる** — Agent Card に `web_search`/`research`/`coding` といったスキルを掲げている相手を、会話の途中で見つけて呼び出せます。
- **呼び出される側になる** — 自分の Hermes を公開して、ほかのフレームワークのエージェントからタスクを送れるようにします。

**同じ端末の中** で複数のエージェントを動かしたい場合は、[委任](/hermes/docs/user-guide/features/delegation/)（プロセス内のサブエージェント）や [かんばんボード](/hermes/docs/user-guide/features/kanban/)（複数プロファイルで使う永続的な作業キュー）のほうが向いています。A2A は、プロセス・端末・フレームワークの境界を越えるためのものです。

## 有効にする {#enable}

```bash
hermes gateway setup      # pick A2A
```

あるいは `~/.hermes/config.yaml` に書きます。

```yaml
gateway:
  platforms:
    a2a:
      enabled: true
      extra:
        port: 9900
```

呼び出す側のツールは `a2a` ツールセットとして同梱されていますが、**既定では無効** です。プラットフォームごとに有効にします。

```bash
hermes tools enable a2a --platform cli        # CLI/TUI sessions
hermes tools enable a2a --platform telegram   # or any messaging platform
hermes tools enable a2a --platform a2a        # let inbound A2A tasks call peers (agent chaining)
```

これらのツールは、受信側のプラットフォームを有効にしていなくても、CLI、TUI、ゲートウェイ、定期実行のどのプロセスでも使えます。

## 呼び出す側: ほかのエージェントを使う {#outbound-calling-other-agents}

`a2a` ツールセットを有効にすると、エージェントは次のツールを使えるようになります。

| ツール | 何をするか |
|---|---|
| `a2a_discover(url)` | 相手の Agent Card を取得して要約する |
| `a2a_call(agent, message, context_id?)` | タスクを送って返事を受け取る。`context_id` を使えば複数回のやり取りもできる |
| `a2a_list()` | 設定済みの相手、保存された会話、指標を表示する |
| `a2a_history(context_id)` | 保存された A2A の会話を呼び戻す |
| `a2a_orchestrate(capability, message, mode?)` | ある能力を掲げているすべての相手にタスクを投げる（`all` / `first` / `best`） |

知っている相手を `config.yaml` に書いておきます。

```yaml
a2a_agents:
  researcher:
    url: "http://research-box.local:9900"
    auth: { type: bearer, token: "..." }
    timeout: 120
    capabilities: [web_search, research]
```

あとは *「researcher のエージェントに、今日の arXiv の投稿をまとめてもらって」* のように頼むだけです。URL を直接指定することもできます。`a2a_call` は A2A のエンドポイントであれば何でも受け付けます。

## 受ける側: 呼び出せる存在になる {#inbound-being-callable}

プラットフォームを有効にすると、Hermes は次を提供します。

- **Agent Card** を `GET /.well-known/agent-card.json` で（v1.0 の正式なパス。従来の `agent.json` も応答します）。ここでエージェントの名前、スキル（有効なツールセットから導かれます）、認証の要件を掲げます。
- **JSON-RPC 2.0** を `POST /` で。v1.0 の正式なメソッド（`SendMessage`、`SendStreamingMessage`、`GetTask`、`ListTasks`、`CancelTask`、`SubscribeToTask`、プッシュ通知設定の作成・取得・更新・削除）に加えて、1.0 より前のパス形式の別名（`message/send` など）も使えます。
- **SSE のストリーミング** を `SendStreamingMessage` で。仕様どおりに JSON-RPC で包んだフレームを返します。
- **プッシュ通知**（Webhook）を、時間のかかるタスク向けに。HMAC-SHA256 で署名されます。

受け取ったタスクは **稼働中のゲートウェイのセッション** へ差し込まれます。ほかのチャンネルを担当しているのと同じエージェント、同じ記憶、同じツールが処理し、最終的な返事がタスクの結果として呼び出し元へ返ります。会話は A2A の `contextId` で紐づくので、相手は何度かやり取りを続けられます。

相互運用性は、公式の Python 版 `a2a-sdk` に対して検証されています（カードの解決、`SendMessage`、ストリーミング）。

## セキュリティの考え方 {#security-model}

既定で安全側に倒し、緩めるときは必ず明示的に設定します。

- **トークンがなければ localhost だけ。** サーバーは `127.0.0.1` を待ち受けます。外部へ公開するには、ベアラートークン **と** 明示的な `A2A_HOST` の両方が必要です。
- **相手ごとのトークン** — `A2A_PEER_TOKENS="alice:tok1,bob:tok2"` のように相手ごとに認証情報を分けられます。認証された名前がレート制限、信頼度、監査の基準になります。
- **プロンプトインジェクションの遮断** — 受け取ったテキストは選別され、信頼できない相手からの入力として扱われます。外部の相手が運用者向けのスラッシュコマンドを実行することはできません。
- **送信時の伏せ字化** — 返信からは、認証情報らしい文字列（API キー、JWT、トークン）が取り除かれます。
- **監査ログ** — やり取りはすべて `~/.hermes/a2a_audit.jsonl` に追記されます。
- **ループ防止** — コンテキストごとにターン数の上限があり、2 つのエージェントが延々と応酬するのを止めます。

## 設定の早見表 {#configuration-reference}

| 環境変数 | 既定値 | 意味 |
|---|---|---|
| `A2A_PEER_TOKENS` | _(未設定)_ | 相手ごとの認証情報 `name:token,…`（こちらを推奨） |
| `A2A_BEARER_TOKEN` | _(未設定)_ | 共有のトークン。相手の識別は呼び出し元 IP に頼ることになります |
| `A2A_HOST` | `127.0.0.1` | 待ち受けるホスト。トークンを設定したときだけ広げられます |
| `A2A_PORT` | `9900` | 受信用のポート |
| `A2A_AGENT_NAME` | ホスト名から生成 | Agent Card に載せる名前 |
| `A2A_PUBLIC_URL` | _(未設定)_ | カードに掲げる、実際につながる URL（リバースプロキシや k8s 向け） |
| `A2A_TRUSTED_PEERS` | _(未設定)_ | 認証済みの識別名の許可リスト |
| `A2A_ALLOW_ALL_USERS` | `false` | 認証さえ通れば誰でも許可します（開発時のみ） |
| `A2A_RATE_LIMIT` | `60` | 識別名ごとの 1 分あたりのリクエスト数 |
| `A2A_MAX_PINGPONG_TURNS` | `5` | コンテキストごとのループ防止のターン上限（最大 20） |
| `A2A_REPLY_TIMEOUT` | `300` | エージェントの返事を待つ秒数 |
| `A2A_PUSH_SECRET` | ベアラートークン | プッシュ通知の署名に使う HMAC の秘密鍵 |
| `A2A_ADVERTISED_TOOLSETS` | 登録済みのすべて | Agent Card に載せるスキルを絞ります |

リバースプロキシや Kubernetes の Service の後ろで動かす場合は、相手が実際に折り返せる URL を Agent Card が掲げるように `A2A_PUBLIC_URL` を設定します（あるいは `X-Forwarded-Host`/`X-Forwarded-Proto` に任せます）。

## 手早く動作を確かめる {#quick-test}

```bash
# From another machine / agent:
curl http://your-host:9900/.well-known/agent-card.json

curl -X POST http://your-host:9900/ \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{"jsonrpc":"2.0","id":1,"method":"SendMessage",
       "params":{"message":{"messageId":"m1","role":"ROLE_USER",
                 "parts":[{"text":"What tools do you have?"}]}}}'
```

## 困ったときは {#troubleshooting}

- **相手がカードの URL にたどり着けない** — カードが待ち受け用のアドレスを掲げていたのが原因です。外からつながる URL を `A2A_PUBLIC_URL` に設定してください。
- **`401 Unauthorized`** — トークンが一致していません。サーバー側の `A2A_PEER_TOKENS`/`A2A_BEARER_TOKEN` と、相手の `auth:` の設定を確認してください。
- **localhost 以外を待ち受けてくれない** — そういう作りです。先にベアラートークンを設定してから `A2A_HOST=0.0.0.0` にしてください。
- **長い処理で返事がタイムアウトする** — `A2A_REPLY_TIMEOUT` を延ばすか、呼び出し元にプッシュ通知の設定を登録してもらい `GetTask` で確認してもらってください。
