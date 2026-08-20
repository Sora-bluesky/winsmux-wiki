---
title: "user-guide/messaging/ntfy"
description: ""
upstream_path: user-guide/messaging/ntfy.md
upstream_blob: c7895710fb0926cbe96430ba4344633dd76b1bb7
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/ntfy
---

# ntfy {#ntfy}

[ntfy](https://ntfy.sh/) は、HTTP を使った簡単な pub-sub 型の通知サービスです。`ntfy.sh` の無料の公開サーバーでも、自分で立てたサーバーでも動きます。HTTP リクエストを送れるクライアントであれば、スマートフォンでもブラウザーでもスクリプトでも腕時計でも使えます。

ntfy は Hermes への軽量なプッシュ経路として便利です。[ntfy のスマートフォンアプリ](https://ntfy.sh/docs/subscribe/phone/)でトピックを購読し、そのトピックにメッセージを送ってエージェントに話しかけると、返事がスマートフォンに届きます。

> `hermes gateway setup` を実行して **ntfy** を選ぶと、対話形式で設定を進められます。

## 事前に必要なもの {#prerequisites}

- トピック名（重複しない文字列なら何でも構いません。`hermes-myname-2026` のような形で十分です）
- [ntfy のスマートフォンアプリ](https://ntfy.sh/docs/subscribe/phone/)をインストールし、そのトピックを購読しておくこと
- 任意: 自分で立てた ntfy サーバー、または非公開トピック・予約トピックを使うための `ntfy.sh` のアカウントトークン

必要なものはこれだけです。SDK もデーモンも Node.js も要りません。アダプターは Hermes がもともと使っている `httpx` で動きます。

## Hermes を設定する {#configure-hermes}

### 設定ウィザードから {#via-setup-wizard}

```bash
hermes gateway setup
```

**ntfy** を選んで、表示される質問に答えていきます。

### 環境変数から {#via-environment-variables}

次の内容を `~/.hermes/.env` に追記します。

```
NTFY_TOPIC=hermes-myname-2026
NTFY_ALLOWED_USERS=hermes-myname-2026
NTFY_HOME_CHANNEL=hermes-myname-2026
```

| 変数 | 必須 | 説明 |
|---|---|---|
| `NTFY_TOPIC` | はい | 購読するトピック（受信するメッセージの経路） |
| `NTFY_SERVER_URL` | 任意 | サーバーの URL（既定: `https://ntfy.sh`）。プライバシーを重視するなら自分で立てた ntfy を指定します |
| `NTFY_TOKEN` | 任意 | ベアラートークン（例: `tk_xyz`）、または Basic 認証用の `user:pass` |
| `NTFY_PUBLISH_TOPIC` | 任意 | 返信の送信先を別のトピックにする場合に指定（既定は `NTFY_TOPIC`） |
| `NTFY_MARKDOWN` | 任意 | `true` にすると返信に `X-Markdown: true` ヘッダーを付けて送ります |
| `NTFY_ALLOWED_USERS` | 推奨 | 許可するトピック名をカンマ区切りで指定（ユーザー ID として扱われます。後述） |
| `NTFY_ALLOW_ALL_USERS` | 任意 | `true` にすると誰の投稿でも受け付けます。読み取りトークンで保護した非公開トピックでのみ安全です |
| `NTFY_HOME_CHANNEL` | 任意 | cron や通知の配信先となる既定のトピック |
| `NTFY_HOME_CHANNEL_NAME` | 任意 | ホームチャンネルに付ける人間向けの表示名 |

## 本人確認の考え方 — 運用を始める前に読んでください {#identity-model-read-this-before-deploying}

ntfy には、認証された利用者の識別情報という仕組みがありません。投稿されたメッセージの `title` フィールドは**送信者が自由に決められる**もので、中身は何とでも書けます。Hermes のアダプターは `title` を認可の判断に使いません。使ってしまうと、トピック名を知っている人が誰でも許可済みの利用者になりすませてしまうからです。

代わりに、**トピック名そのものが識別情報**になります。そのトピックに投稿されたメッセージは、すべて同じ論理的な利用者（そのトピック）からのものとして扱われます。そのため `NTFY_ALLOWED_USERS` には、たいていトピック名そのものを書きます。1 件だけの許可リストで、その経路全体を制御する形です。

つまり、**トピック名を知っている人は誰でもエージェントに話しかけられます**。これを本当の意味での信頼境界にするには、次のいずれかを行います。

- **ntfy を自分で立てて**、[アクセス制御](https://docs.ntfy.sh/config/#access-control)でトピックを保護します。読み書きのトークンを持つ、認可されたクライアントだけが投稿できるようになります。
- あるいは **ntfy.sh の非公開トピックを使い**（[予約トピック](https://docs.ntfy.sh/publish/#reserved-topics)にはアカウントが必要です）、`NTFY_TOKEN` で保護します。
- あるいは**推測されにくい長いトピック名**（`hermes-7d4f9c8b-2026` など）を選び、共有の秘密として扱います。いちばん手軽な方法ですが、ログやスクリーンショットからトピック名が漏れる点には注意が必要です。

いずれの場合も、トピック側でアクセス制御をしていないなら、機微なデータを ntfy に流さないでください。

## クイックスタート — スマートフォンからエージェントに話しかける {#quick-start-talk-to-your-agent-from-your-phone}

1. トピック名を決めます: `hermes-myname-2026`
2. スマートフォンで [ntfy アプリ](https://ntfy.sh/docs/subscribe/phone/)を入れ、**+** をタップして `hermes-myname-2026` を入力します
3. ホスト側で次を実行します:
   ```bash
   echo 'NTFY_TOPIC=hermes-myname-2026' >> ~/.hermes/.env
   echo 'NTFY_ALLOWED_USERS=hermes-myname-2026' >> ~/.hermes/.env
   hermes gateway restart
   ```
4. ntfy アプリからそのトピックにメッセージを送ります。エージェントの返事がプッシュ通知として届きます。

## cron ジョブと組み合わせて使う {#using-ntfy-with-cron-jobs}

`NTFY_HOME_CHANNEL` を設定しておくと、cron ジョブの結果を ntfy に届けられます。

```python
cronjob(
    action="create",
    schedule="every 1h",
    deliver="ntfy",          # uses NTFY_HOME_CHANNEL
    prompt="Check for alerts and summarise."
)
```

cron ジョブの `deliver:` フィールドで送り先のトピックを個別に指定することもできますし、シェルスクリプトからは [`hermes send` コマンド](/hermes/docs/guides/pipe-script-output/)で送れます。

```bash
hermes send ntfy:alerts-channel "Done!"
```

これは cron がゲートウェイとは別のプロセスで動いている場合でも機能します。プラグインが `standalone_sender_fn` を登録し、自前の HTTP 接続を開くためです。

## ntfy を自分で立てる {#self-hosting-ntfy}

すべてを自分で管理したい場合は、次のようにします。

```bash
# Docker
docker run -p 80:80 -it binwiederhier/ntfy serve

# Native
go install heckel.io/ntfy/v2@latest
ntfy serve
```

そのうえで、Hermes の向き先をそのサーバーにします。

```
NTFY_SERVER_URL=https://ntfy.mydomain.com
NTFY_TOPIC=hermes
NTFY_TOKEN=tk_abc123  # if you've set up access control
```

自分で立てると、トピックのアクセス制御、メッセージの保存期間の方針、添付ファイル、絵文字タグが使えるようになります。[ntfy のサーバー向けドキュメント](https://docs.ntfy.sh/install/)を参照してください。

## Markdown の書式 {#markdown-formatting}

ntfy のクライアントは、送信側が `X-Markdown: true` ヘッダーを付けたときに markdown を整形して表示します。Hermes から送る返信で有効にするには、次のように設定します。

```
NTFY_MARKDOWN=true
```

`config.yaml` に書く場合は次のとおりです。

```yaml
platforms:
  ntfy:
    extra:
      markdown: true
```

スマートフォンアプリが対応しているのは CommonMark の一部で、太字・斜体・箇条書き・リンク・コードブロックです。対応範囲の詳細は [ntfy の markdown ドキュメント](https://docs.ntfy.sh/publish/#markdown-formatting)を参照してください。

## 送信専用の構成（受信なしで通知だけ受け取る） {#outgoing-only-setup-notifications-without-inbound}

Hermes から ntfy へ通知を*送る*だけにして（cron のまとめやアラートなど）、こちらからのメッセージは一切受け付けたくない場合は、`NTFY_TOPIC` と `NTFY_PUBLISH_TOPIC` に同じ値を設定し、`NTFY_ALLOWED_USERS` は設定しないでおきます。許可リストが空だと、エージェントは受信したメッセージに応答しません。スマートフォンにはプッシュが届きますが、やり取りは一方通行になります。

## 制限 {#limits}

- **メッセージの長さ**: ntfy は本文を 4096 文字までに制限しています。これを超えると Hermes は警告を出して切り詰めます。
- **入力中の表示がない**: プロトコルにその仕組みがないため、`send_typing` は何もしません。
- **スレッドも添付もない**: ntfy は素のプッシュ通知です。長い返信も本文にそのまま入り、スレッドに分かれることはありません。
- **本人確認の仕組みがない**: 前述の識別情報の節を参照してください。

## 困ったときは {#troubleshooting}

**認証に失敗する / 401** — `NTFY_TOKEN` が間違っているか、そのトークンにこのトピックへの投稿・購読の権限がありません。401 を受け取るとアダプターは再接続の繰り返しを止め、ゲートウェイの実行状態には `fatal: ntfy_unauthorized` が表示されます。トークンを直してゲートウェイを再起動してください。

**トピックが見つからない / 404** — 設定したサーバーに `NTFY_TOPIC` が存在しません。ntfy.sh では最初の投稿でトピックが自動作成されるので、404 が返るということは、そのトピックが用意されていない自前サーバーを指していることになります。アダプターは `fatal: ntfy_topic_not_found` を出して再接続の繰り返しを止めます。

**接続はできているのにメッセージが届かない** — `NTFY_ALLOWED_USERS` にトピック名そのものが入っているか確認してください。ntfy の識別情報の仕組みでは、トピックが利用者そのものです。許可リストを空のままにすると、すべて拒否されます。

**60 秒ごとに再接続する** — ストリームのキープアライブは既定で 55 秒です。ntfy 側で一時的なネットワークの不調が起きることもあります。アダプターは再接続の間隔を段階的に広げ（2 → 5 → 10 → 30 → 60 秒）、ストリームが 60 秒以上続いたら 0 に戻します。
