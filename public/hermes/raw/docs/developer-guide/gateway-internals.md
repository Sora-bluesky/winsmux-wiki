---
title: "ゲートウェイの内部"
description: "メッセージングのゲートウェイが起動し、利用者を認可し、セッションを振り分け、メッセージを届けるまで"
upstream_path: developer-guide/gateway-internals.md
upstream_blob: 2b7b5b378c482f14331b0c93c5be554047c020ac
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/gateway-internals
---

# ゲートウェイの内部 {#gateway-internals}

メッセージングのゲートウェイは、Hermes を 20 以上の外部メッセージングサービスへ、ひとつの共通の作りでつなぐ常駐プロセスです。

## 主なファイル {#key-files}

| ファイル | 役割 |
|------|---------|
| `gateway/run.py` | `GatewayRunner` の入口。`gateway/run_*.py` の兄弟ミックスイン (起動、アダプター、受信、ターン、実行中、ゴール、通知、終了など) と `gateway/slash_commands_*.py` のハンドラーを組み合わせます |
| `gateway/session.py` | `SessionStore`。会話の保存とセッションキーの組み立て |
| `gateway/delivery.py` | 相手先のサービスやチャンネルへメッセージを送り出す処理 |
| `gateway/pairing.py` | 利用者を認可するための DM ペアリングの流れ |
| `gateway/channel_directory.py` | cron の配信に向けて、チャット ID を読める名前に対応づけます |
| `gateway/hooks.py` | フックの発見・読み込みと、ライフサイクルイベントの振り分け |
| `gateway/mirror.py` | `send_message` のための、セッションをまたいだメッセージの写し |
| `gateway/status.py` | プロファイル単位のゲートウェイのためのトークンロック管理 |
| `gateway/builtin_hooks/` | 常に登録されるフックの置き場 (同梱されているものはありません) |
| `gateway/platform_registry.py` | アダプターの登録簿、生成処理、同梱サービスプラグインの遅延ローダー |
| `plugins/platforms/<name>/` | 同梱のメッセージングアダプター (多くのサービスは `adapter.py` と `plugin.yaml` の組) |
| `gateway/platforms/` | 共通の `base.py` と、昔からの直接アダプター (Signal、API サーバー、Webhook など) |

## 全体の眺め {#architecture-overview}

```text
┌─────────────────────────────────────────────────┐
│                  GatewayRunner                  │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Telegram │  │ Discord  │  │  Slack   │       │
│  │ Adapter  │  │ Adapter  │  │ Adapter  │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │
│       └─────────────┼─────────────┘             │
│                     ▼                           │
│              _handle_message()                  │
│                     │                           │
│         ┌───────────┼───────────┐               │
│         ▼           ▼           ▼               │
│  Slash command   AIAgent    Queue/BG            │
│    dispatch      creation   sessions            │
│                     │                           │
│                     ▼                           │
│                 SessionStore                    │
│              (SQLite persistence)               │
└───────┴─────────────┴─────────────┴─────────────┘
```

## メッセージの流れ {#message-flow}

どのサービスからメッセージが届いた場合も、次の順に進みます。

1. **サービスのアダプター** が生のイベントを受け取り、`MessageEvent` の形に整えます
2. **共通のアダプター** が、そのセッションが実行中かどうかを見張ります。
   - そのセッションでエージェントが動いていれば、メッセージを待ち行列に入れ、割り込みを知らせます
   - `/approve`、`/deny`、`/stop` は見張りを素通りします (その場で処理されます)
3. **GatewayRunner._handle_message()** がイベントを受け取ります。
   - `_session_key_for_source()` でセッションキーを決めます (形式は `agent:main:{platform}:{chat_type}:{chat_id}`)
   - 認可を確かめます (下の「認可」を参照)
   - スラッシュコマンドなら、コマンドのハンドラーへ渡します
   - すでにエージェントが動いていれば、`/stop` や `/status` などのコマンドを横取りします
   - どれでもなければ、`AIAgent` を作って会話を進めます
4. **返事** は、来たときと同じサービスのアダプターを通って送り返されます

### セッションキーの形式 {#session-key-format}

セッションキーには、振り分けに必要な情報がすべて入っています。

```
agent:main:{platform}:{chat_type}:{chat_id}
```

たとえば `agent:main:telegram:private:123456789` のようになります。

スレッドを持つサービス (Telegram のフォーラムトピック、Discord のスレッド、Slack のスレッド) では、chat_id の部分にスレッド ID が入ることがあります。**セッションキーを手で組み立てないでください**。かならず `gateway/session.py` の `build_session_key()` を使います。

### 二段構えのメッセージ見張り {#two-level-message-guard}

エージェントが動いている最中に届いたメッセージは、2 つの見張りを順に通ります。

1. **一段目 — 共通のアダプター** (`gateway/platforms/base.py`): `_active_sessions` を見ます。そのセッションが動いていれば、メッセージを `_pending_messages` に入れ、割り込みを知らせます。ここで、ゲートウェイ本体に届く *前* に捕まえます。

2. **二段目 — ゲートウェイ本体** (`gateway/run_inbound.py`): `_running_agents` を見ます。特定のコマンド (`/stop`、`/new`、`/queue`、`/status`、`/approve`、`/deny`) を横取りして、それぞれの処理へ回します。それ以外はすべて `running_agent.interrupt()` を呼びます。

エージェントが手を止めているあいだにも本体まで届く必要があるコマンド (`/approve` など) は、`await self._message_handler(event)` で **その場で** 処理されます。競合を避けるため、背後のタスクの仕組みを通しません。

## 認可 {#authorization}

ゲートウェイの認可は何層かに分かれていて、次の順に判定されます。

1. **サービスごとの全員許可フラグ** (たとえば `TELEGRAM_ALLOW_ALL_USERS`)。設定されていれば、そのサービスの利用者は全員が認可されます
2. **サービスごとの許可リスト** (たとえば `TELEGRAM_ALLOWED_USERS`)。利用者 ID をカンマ区切りで並べます
3. **DM ペアリング**。認可済みの利用者が、ペアリングコードで新しい利用者を追加できます
4. **全体の全員許可** (`GATEWAY_ALLOW_ALL_USERS`)。設定されていれば、すべてのサービスの利用者が認可されます
5. **既定は拒否**。認可されていない利用者は弾かれます

### DM ペアリングの流れ {#dm-pairing-flow}

```text
Admin: /pair
Gateway: "Pairing code: ABC123. Share with the user."
New user: ABC123
Gateway: "Paired! You're now authorized."
```

ペアリングの状態は `gateway/pairing.py` が保存し、再起動しても残ります。

## スラッシュコマンドの振り分け {#slash-command-dispatch}

ゲートウェイのスラッシュコマンドは、すべて同じ流れで解決されます。

1. `hermes_cli/commands.py` の `resolve_command()` が、入力を正式な名前に直します (別名や前方一致にも対応します)
2. その正式な名前が `GATEWAY_KNOWN_COMMANDS` にあるかを確かめます
3. `_handle_message()` (`gateway/run_inbound.py`) が名前からハンドラーを引きます。`gateway/slash_commands_*.py` のミックスインにある `_handle_<name>_command` を、`gateway/run_busy.py` の `_IDLE_COMMANDS` と `_PLAIN_COMMANDS` をもとにした `_command_handler_table` から探します。`if canonical == ...` を並べた分岐はありません
4. 一部のコマンドは設定によって使える・使えないが決まります (`CommandDef` の `gateway_config_gate`)

### 実行中の見張り {#running-agent-guard}

エージェントが処理している最中に動かしてはいけないコマンドは、早い段階で断ります。

`_quick_key in self._running_agents` のあいだ、`gateway/run_busy.py` の `_dispatch_busy_slash_command()` が、認識できたコマンドを `CommandDef.busy_policy` と `busy_handler` に従って振り分けます。実行中用の変種 (`_busy_<key>_command`) があればそれを、無ければ `busy_policy` が許すときに通常のハンドラーを使い、どちらでもなければ断りの返事を出します (「⏳ Agent is running — `/model` can't run mid-turn…」)。

素通りするコマンド (`/stop`、`/new`、`/approve`、`/deny`、`/queue`、`/status`) には実行中用のハンドラーがあり、その場で処理されます。

## 設定の読み込み元 {#config-sources}

ゲートウェイは、いくつかの場所から設定を読みます。

| 読み込み元 | 何が入っているか |
|--------|-----------------|
| `~/.hermes/.env` | API キー、ボットのトークン、各サービスの資格情報 |
| `~/.hermes/config.yaml` | モデルの設定、ツールの設定、表示の設定 |
| 環境変数 | 上のどれでも上書きできます |

CLI は `load_cli_config()` を使い、既定値をコードに持っています。いっぽうゲートウェイは `config.yaml` を YAML ローダーで直接読みます。そのため、CLI の既定値の辞書にはあるのに設定ファイルには書かれていないキーは、CLI とゲートウェイで振る舞いが変わることがあります。

## サービスのアダプター {#platform-adapters}

ほとんどのメッセージングサービスは、`plugins/platforms/<name>/adapter.py` というプラグインの形で入っています。昔からのアダプターがいくつか `gateway/platforms/` に直接残っています。どれも `gateway/platforms/base.py` の `BasePlatformAdapter` を継承しています。

```text
plugins/platforms/                  # plugin-packaged adapters (one dir each)
├── telegram/adapter.py     # Telegram Bot API (long polling or webhook)
├── discord/adapter.py      # Discord bot via discord.py
├── slack/adapter.py        # Slack Socket Mode
├── whatsapp/adapter.py     # WhatsApp Business Cloud API
├── matrix/adapter.py       # Matrix via mautrix (optional E2EE)
├── mattermost/adapter.py   # Mattermost WebSocket API
├── email/adapter.py        # Email via IMAP/SMTP
├── sms/adapter.py          # SMS via Twilio
├── dingtalk/adapter.py     # DingTalk WebSocket
├── feishu/adapter.py       # Feishu/Lark WebSocket or webhook
├── wecom/adapter.py        # WeCom (WeChat Work) callback
├── line/adapter.py         # LINE Messaging API
├── teams/adapter.py        # Microsoft Teams
├── irc/adapter.py          # IRC (canonical scoped-lock example)
├── homeassistant/adapter.py # Home Assistant conversation integration
└── …                       # google_chat, ntfy, photon, raft, simplex, …

gateway/platforms/                  # core base + legacy direct adapters
├── base.py              # BasePlatformAdapter — shared logic for all platforms
├── signal.py            # Signal via signal-cli REST API
├── weixin.py            # Weixin (personal WeChat) via iLink Bot API
├── bluebubbles.py       # Apple iMessage via BlueBubbles macOS server
├── qqbot/               # QQ Bot (Tencent QQ) via Official API v2 (sub-package)
├── yuanbao.py           # Yuanbao (Tencent) DM/group adapter
├── msgraph_webhook.py   # Microsoft Graph change-notification webhook (Teams, Outlook, etc.)
├── webhook.py           # Inbound/outbound webhook adapter
└── api_server.py        # REST API server adapter
```

**遅れて読み込む仕組み:** 同梱の `kind: platform` プラグインは、`gateway/platform_registry.py` に軽い `register_deferred` のローダーを登録します (`hermes_cli/plugins.py` 経由)。おかげで各サービスの SDK は、ゲートウェイが起動したとき、メッセージを送るとき、セットアップや状態確認を走らせたときにだけ読み込まれます。ふつうに `hermes chat` を使うぶんには読み込まれません。名前を引いたときは、そのアダプターだけを読み込みます。全部を並べる必要がある場面でだけ、残りのローダーもまとめて動きます。

試験的なコネクター経由のサービスは、専用のモジュールではなく `gateway/relay/` の汎用リレーアダプターを使います。`GATEWAY_RELAY_URL` か `gateway.relay_url` が設定されていると、ゲートウェイは `relay` というサービスを登録し、外向きの WebSocket でコネクターにつなぎ、その同じ接続で `descriptor`、`inbound`、`interrupt_inbound` のフレームを受け取ります。コネクター側は `CapabilityDescriptor` を名乗ります。Hermes からは、ふつうの返信、トークンの要らない `follow_up` 操作、割り込みのフレームを、リレー越しに送り返せます。実装に即した通信の取り決めは [`docs/relay-connector-contract.md`](https://github.com/NousResearch/hermes-agent/blob/main/docs/relay-connector-contract.md) にあります。

アダプターは共通の作法を実装します。
- `connect()` と `disconnect()` — つなぐ・切るの管理
- `send()` — メッセージを送り出す
- 受け取ったイベントは `MessageEvent` に整えられ、`handle_message()` へ渡されます

### トークンロック {#token-locks}

固有の資格情報でつなぐアダプターは、`connect()` で `acquire_scoped_lock()` を、`disconnect()` で `release_scoped_lock()` を呼びます。こうすると、2 つのプロファイルが同じボットのトークンを同時に使ってしまうことがなくなります。

ロックがぶつかったときは `{scope}_lock` として、`retryable=True` を付けて知らせます。**動いている最中** の再接続なら、相手が抜けたあとに復帰できるからです。ただし **起動時** に他のプロセスがロックを握っているなら、それは設定のぶつかりです。`gateway/restart.py::is_global_startup_conflict()` が `*_lock` と `lock_conflict` の系統のコードを見分け、起動側はそのサービスを再試行の列に入れず `fatal` として止めます。他に何もつながっていなければ、ゲートウェイは `78` (`EX_CONFIG`、`gateway_state=startup_failed`) で終了し、見守り役が再起動を繰り返さないようにします。本当に一時的な失敗をした相手と同居している場合は、ゲートウェイ自体は生き続け、その相手だけがやり直します。

## 送り出しの経路 {#delivery-path}

送り出し (`gateway/delivery.py`) が扱うのは次のとおりです。

- **そのまま返信** — 来たチャットへ返事を送ります
- **ホームチャンネルへの配信** — cron のジョブの出力や、背後で動いた結果を、決めておいたホームチャンネルへ流します
- **宛先を指定した配信** — `telegram:-1001234567890` のように送信側が宛先を指定します。シェルスクリプト向けには [`hermes send` コマンド](/hermes/docs/guides/pipe-script-output/) から、cron からは `deliver:` の宛先から使えます
- **サービスをまたいだ配信** — 届いたのとは違うサービスへ送ります

cron のジョブの配信は、ゲートウェイのセッション履歴には写されません。cron 自身のセッションにだけ残ります。これは、発言の順番が崩れるのを避けるための、意図した設計です。

## フック {#hooks}

ゲートウェイのフックは、ライフサイクルのイベントに反応する Python のモジュールです。

### ゲートウェイのフックイベント {#gateway-hook-events}

| イベント | 発火するとき |
|-------|-----------|
| `gateway:startup` | ゲートウェイのプロセスが起動したとき |
| `session:start` | 新しい会話のセッションが始まったとき |
| `session:end` | セッションが終わった、または時間切れになったとき |
| `session:reset` | `/new` でセッションを作り直したとき |
| `agent:start` | エージェントがメッセージの処理を始めたとき |
| `agent:step` | エージェントがツール呼び出しを 1 周終えたとき |
| `agent:end` | エージェントが終わって返事を返したとき |
| `command:*` | いずれかのスラッシュコマンドが実行されたとき |

フックは `gateway/builtin_hooks/` (置き場としては用意されていますが、配布物ではいまのところ空で、`_register_builtin_hooks()` は何もしない雛形です) と `~/.hermes/hooks/` (自分で入れたもの) から見つけられます。フックはそれぞれ、`HOOK.yaml` という定義ファイルと `handler.py` を置いたディレクトリです。

## メモリープロバイダーとの連携 {#memory-provider-integration}

メモリープロバイダーのプラグイン (Honcho など) を有効にすると、次のように動きます。

1. ゲートウェイは、メッセージごとにセッション ID を持たせた `AIAgent` を作ります
2. `MemoryManager` が、セッションの情報を渡してプロバイダーを初期化します
3. プロバイダーのツール (`honcho_profile`、`viking_search` など) は次の順で呼ばれます

```text
AIAgent._invoke_tool()
  → self._memory_manager.handle_tool_call(name, args)
    → provider.handle_tool_call(name, args)
```

4. セッションが終わる・作り直されるときに `on_session_end()` が呼ばれ、後片づけと最後の書き出しをします

### メモリー書き出しの流れ {#memory-flush-lifecycle}

セッションを作り直したとき、再開したとき、時間切れになったときは、次のように進みます。
1. 組み込みのメモリーがディスクへ書き出されます
2. メモリープロバイダーの `on_session_end()` フックが動きます
3. 一時的な `AIAgent` が、メモリーだけの会話を 1 ターン走らせます
4. そのあとコンテキストは捨てられるか、保管されます

## 裏で動く手入れ {#background-maintenance}

ゲートウェイは、メッセージの処理と並行して、決まった手入れを繰り返しています。

- **cron の刻み** — ジョブの予定を確かめ、時間の来たものを動かします
- **セッションの時間切れ** — 放っておかれたセッションを、時間が過ぎたら片づけます
- **メモリーの書き出し** — セッションが時間切れになる前に、先回りして書き出します
- **キャッシュの更新** — モデルの一覧とプロバイダーの状態を取り直します

## プロセスの扱い {#process-management}

ゲートウェイは常駐プロセスで、次の手段で管理します。

- `hermes gateway start` と `hermes gateway stop` — 手で動かす
- `systemctl` (Linux) や `launchctl` (macOS) — サービスとして管理する
- `~/.hermes/gateway.pid` の PID ファイル — プロファイル単位でプロセスを追う

**プロファイル単位か、全体か**: `start_gateway()` はプロファイル単位の PID ファイルを使います。`hermes gateway stop` は、いまのプロファイルのゲートウェイだけを止めます。`hermes gateway stop --all` は `ps aux` で全体を走査し、ゲートウェイのプロセスをすべて止めます (更新のときに使われます)。

## 関連ページ {#related-docs}

- [セッションの保存](/hermes/docs/developer-guide/session-storage/)
- [cron の内部](/hermes/docs/developer-guide/cron-internals/)
- [ACP の内部](/hermes/docs/developer-guide/acp-internals/)
- [エージェントループの内部](/hermes/docs/developer-guide/agent-loop/)
- [メッセージングゲートウェイ (利用の手引き)](/hermes/docs/user-guide/messaging/)
