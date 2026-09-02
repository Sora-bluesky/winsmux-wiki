---
title: "ゲートウェイの内部構造"
description: "メッセージングのゲートウェイが起動し、利用者を認可し、セッションを振り分け、メッセージを届けるまで"
upstream_path: developer-guide/gateway-internals.md
upstream_blob: a96c3d930d3885bb530d6cb8ef7430e713c60996
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/gateway-internals
---

# ゲートウェイの内部構造 {#gateway-internals}

メッセージングのゲートウェイは、Hermes を20を超える外部のメッセージング基盤へ、ひとつの共通した仕組みでつなぐ常駐プロセスです。

## 主なファイル {#key-files}

| ファイル | 役割 |
|------|---------|
| `gateway/run.py` | `GatewayRunner` — 主となるループ、スラッシュコマンド、メッセージの振り分け（大きなファイルです。現在の行数は git で確認してください） |
| `gateway/session.py` | `SessionStore` — 会話の保存と、セッションキーの組み立て |
| `gateway/delivery.py` | 送信先の基盤やチャンネルへのメッセージの配信 |
| `gateway/pairing.py` | 利用者を認可するための DM ペアリングの流れ |
| `gateway/channel_directory.py` | cron の配信のために、チャット ID を人が読める名前に対応づける |
| `gateway/hooks.py` | フックの発見、読み込み、ライフサイクルの出来事の振り分け |
| `gateway/mirror.py` | `send_message` のための、セッションをまたいだメッセージの写し |
| `gateway/status.py` | プロファイル単位のゲートウェイのためのトークンのロック管理 |
| `gateway/builtin_hooks/` | 常に登録されるフックの置き場（同梱のものはありません） |
| `gateway/platform_registry.py` | アダプタの登録簿、生成の仕組み、同梱の基盤プラグインを必要になってから読み込む仕掛け |
| `plugins/platforms/<name>/` | 同梱のメッセージング用アダプタ（ほとんどの基盤は `adapter.py` と `plugin.yaml`） |
| `gateway/platforms/` | 共通の `base.py` と、従来からの直接のアダプタ（Signal、API サーバー、webhook など） |

## 全体の構成 {#architecture-overview}

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

どの基盤からメッセージが届いたときも、次のように進みます。

1. **基盤ごとのアダプタ**が生の出来事を受け取り、`MessageEvent` の形に整えます
2. **共通のアダプタ**が、動いているセッションの見張りを確かめます。
   - そのセッションでエージェントが動いていれば → メッセージを待ち行列に入れ、割り込みの合図を立てる
   - `/approve`、`/deny`、`/stop` なら → 見張りを通り抜けてその場で処理する
3. **GatewayRunner._handle_message()** が出来事を受け取ります。
   - `_session_key_for_source()` でセッションキーを決める（形式は `agent:main:{platform}:{chat_type}:{chat_id}`）
   - 認可を確かめる（後述の「認可」を参照）
   - スラッシュコマンドかどうかを見て、そうならコマンドの処理へ回す
   - エージェントがすでに動いていないかを見て、`/stop` や `/status` といったコマンドを横取りする
   - どれでもなければ → `AIAgent` を作って会話を進める
4. **応答**が、その基盤のアダプタを通って返されます

### セッションキーの形式 {#session-key-format}

セッションキーには、振り分けに必要な情報がひととおり入っています。

```
agent:main:{platform}:{chat_type}:{chat_id}
```

たとえば `agent:main:telegram:private:123456789` のようになります。

スレッドを持つ基盤（Telegram のフォーラムのトピック、Discord のスレッド、Slack のスレッド）では、chat_id の部分にスレッドの ID が含まれることがあります。**セッションキーを手で組み立ててはいけません**。必ず `gateway/session.py` の `build_session_key()` を使ってください。

### 2段構えのメッセージの見張り {#two-level-message-guard}

エージェントが動いているあいだ、届いたメッセージは2つの見張りを順に通ります。

1. **1段目 — 共通のアダプタ**（`gateway/platforms/base.py`）: `_active_sessions` を確かめます。そのセッションが動いていれば、メッセージを `_pending_messages` に入れて割り込みの合図を立てます。ここで、ゲートウェイの本体へ届く*前*に捕まえます。

2. **2段目 — ゲートウェイの本体**（`gateway/run.py`）: `_running_agents` を確かめます。特定のコマンド（`/stop`、`/new`、`/queue`、`/status`、`/approve`、`/deny`）を横取りして、それぞれの処理へ回します。それ以外はすべて `running_agent.interrupt()` を起こします。

エージェントが塞がっているあいだにも本体へ届かなければならないコマンド（`/approve` など）は、`await self._message_handler(event)` によって**その場で**処理されます。競合を避けるため、背後の処理の仕組みを通しません。

## 認可 {#authorization}

ゲートウェイは何段階かの確認を、次の順に行います。

1. **基盤ごとの全員許可の指定**（たとえば `TELEGRAM_ALLOW_ALL_USERS`）— 設定されていれば、その基盤の利用者は全員が認可されます
2. **基盤ごとの許可リスト**（たとえば `TELEGRAM_ALLOWED_USERS`）— 利用者 ID をカンマ区切りで並べます
3. **DM ペアリング** — 認可済みの利用者が、合言葉を使って新しい利用者を通せます
4. **全体の全員許可**（`GATEWAY_ALLOW_ALL_USERS`）— 設定されていれば、すべての基盤の利用者が認可されます
5. **既定は拒否** — 認可されていない利用者は弾かれます

### DM ペアリングの流れ {#dm-pairing-flow}

```text
Admin: /pair
Gateway: "Pairing code: ABC123. Share with the user."
New user: ABC123
Gateway: "Paired! You're now authorized."
```

ペアリングの状態は `gateway/pairing.py` に保存され、再起動しても残ります。

## スラッシュコマンドの振り分け {#slash-command-dispatch}

ゲートウェイのスラッシュコマンドは、すべて同じ道筋で解決されます。

1. `hermes_cli/commands.py` の `resolve_command()` が、入力を正式な名前に直します（別名や、途中まで打った場合にも対応します）
2. その正式な名前が `GATEWAY_KNOWN_COMMANDS` にあるかを確かめます
3. `_handle_message()` の中の処理が、正式な名前に応じて振り分けます
4. 一部のコマンドは設定によって使えるかどうかが決まります（`CommandDef` の `gateway_config_gate`）

### エージェントが動いているときの見張り {#running-agent-guard}

エージェントが処理をしているあいだに実行してはいけないコマンドは、早い段階で弾かれます。

```python
if _quick_key in self._running_agents:
    if canonical == "model":
        return "⏳ Agent is running — wait for it to finish or /stop first."
```

見張りを通り抜けるコマンド（`/stop`、`/new`、`/approve`、`/deny`、`/queue`、`/status`）には、専用の扱いがあります。

## 設定の読み込み元 {#config-sources}

ゲートウェイは、いくつかの場所から設定を読みます。

| 読み込み元 | そこから得るもの |
|--------|-----------------|
| `~/.hermes/.env` | API キー、bot のトークン、各基盤の認証情報 |
| `~/.hermes/config.yaml` | モデルの設定、ツールの設定、表示の好み |
| 環境変数 | 上のどれでも上書きできます |

CLI が `load_cli_config()` で組み込みの既定値を使うのに対して、ゲートウェイは YAML の読み込みで `config.yaml` を直接読みます。そのため、CLI の既定値の辞書にはあるが利用者の設定ファイルには書かれていないキーは、CLI とゲートウェイでふるまいが違うことがあります。

## 基盤ごとのアダプタ {#platform-adapters}

ほとんどのメッセージング基盤は、`plugins/platforms/<name>/adapter.py` の下にプラグインのアダプタとして同梱されています。従来からのアダプタのいくつかは、今も `gateway/platforms/` に直接置かれています。どれも `gateway/platforms/base.py` の `BasePlatformAdapter` を継承しています。

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

**必要になってから読み込む:** 同梱の `kind: platform` のプラグインは、`gateway/platform_registry.py` に軽い `register_deferred` の読み込み口を登録します（`hermes_cli/plugins.py` を通します）。そのため各基盤の SDK は、ゲートウェイが起動するとき、配信するとき、設定や状態の確認を行うときにだけ読み込まれ、ただの `hermes chat` では読み込まれません。名前を引いたときは、そのアダプタ1つだけが読み込まれます。すべての基盤が必要な処理のときだけ、残りの読み込みがまとめて走ります。

試験的な、コネクタを介する基盤は、専用の基盤モジュールではなく `gateway/relay/` の汎用の中継アダプタを使います。`GATEWAY_RELAY_URL` か `gateway.relay_url` が設定されていると、ゲートウェイは `relay` という基盤を登録し、外向きの WebSocket でコネクタにつなぎ、同じ接続の上で `descriptor`、`inbound`、`interrupt_inbound` のフレームを受け取ります。コネクタは `CapabilityDescriptor` で自分にできることを知らせます。Hermes は通常の外向きの返信、トークンを使わない `follow_up` の操作、割り込みのフレームを、この中継を通して返せます。ソースに裏づけられた通信の取り決めは [`docs/relay-connector-contract.md`](https://github.com/NousResearch/hermes-agent/blob/main/docs/relay-connector-contract.md) にあります。

アダプタは共通のインターフェースを実装します。
- `connect()` / `disconnect()` — 接続と切断の管理
- `send()` — 外向きのメッセージの送信
- 受け取った出来事は `MessageEvent` の形に整えられ、`handle_message()` を通して渡されます

### トークンのロック {#token-locks}

固有の認証情報でつなぐアダプタは、`connect()` の中で `acquire_scoped_lock()` を、`disconnect()` の中で `release_scoped_lock()` を呼びます。これで、2つのプロファイルが同じ bot のトークンを同時に使ってしまうのを防ぎます。

ロックがぶつかると `{scope}_lock` が `retryable=True` 付きで出るので、**動作中**の再接続なら、先に持っていた側が抜けたところで回復できます。ただし**起動時**に他所が生きたまま持っている場合は、設定の食い違いです。`gateway/restart.py::is_global_startup_conflict()` が `*_lock` と `lock_conflict` の系統のコードを見分け、起動時の振り分けはその基盤を再試行の列に入れず `fatal` として止めます。他に何もつながっていなければ、ゲートウェイは `78`（`EX_CONFIG`、`gateway_state=startup_failed`）で終了し、監視役が再起動を繰り返さないようにします。本当に一時的な失敗をした相手が他にいる場合は、ゲートウェイは生き続け、その相手だけが再試行します。

## 配信の道筋 {#delivery-path}

外向きの配信（`gateway/delivery.py`）が受け持つのは次のとおりです。

- **そのまま返信** — 送信元のチャットへ応答を返す
- **ホームチャンネルへの配信** — cron ジョブの出力や、背後で動いた結果を、決めておいたホームチャンネルへ回す
- **宛先を指定した配信** — 送信の仕組みに `telegram:-1001234567890` のように指定するもの。シェルスクリプト向けには [`hermes send` の CLI](/hermes/docs/guides/pipe-script-output/) から、cron からは `deliver:` の宛先から使えます
- **基盤をまたいだ配信** — 元のメッセージとは別の基盤へ届ける

cron ジョブの配信は、ゲートウェイのセッションの履歴には写されません。cron 自身のセッションの中だけに残ります。これは、メッセージの役割が交互に並ぶという決まりを崩さないための、意図した設計です。

## フック {#hooks}

ゲートウェイのフックは、ライフサイクルの出来事に反応する Python のモジュールです。

### ゲートウェイのフックの出来事 {#gateway-hook-events}

| 出来事 | 起きるとき |
|-------|-----------|
| `gateway:startup` | ゲートウェイのプロセスが起動したとき |
| `session:start` | 新しい会話のセッションが始まったとき |
| `session:end` | セッションが終わるか、時間切れになったとき |
| `session:reset` | 利用者が `/new` でセッションをやり直したとき |
| `agent:start` | エージェントがメッセージの処理を始めたとき |
| `agent:step` | エージェントがツールを呼ぶ1周を終えたとき |
| `agent:end` | エージェントが処理を終えて応答を返したとき |
| `command:*` | スラッシュコマンドが実行されたとき |

フックは `gateway/builtin_hooks/`（拡張のための置き場です。配布物では今のところ空で、`_register_builtin_hooks()` は何もしない土台だけです）と `~/.hermes/hooks/`（利用者が入れたもの）から見つけられます。フックはそれぞれ、`HOOK.yaml` という定義と `handler.py` を持つディレクトリです。

## メモリのプロバイダとの連携 {#memory-provider-integration}

メモリのプロバイダのプラグイン（たとえば Honcho）が有効なときは、次のように動きます。

1. ゲートウェイが、セッション ID を添えてメッセージごとに `AIAgent` を作ります
2. `MemoryManager` が、そのセッションの情報を渡してプロバイダを初期化します
3. プロバイダのツール（たとえば `honcho_profile`、`viking_search`）は次の道筋で呼ばれます

```text
AIAgent._invoke_tool()
  → self._memory_manager.handle_tool_call(name, args)
    → provider.handle_tool_call(name, args)
```

4. セッションが終わったりやり直されたりすると、後始末と最後の書き出しのために `on_session_end()` が動きます

### メモリの書き出しの流れ {#memory-flush-lifecycle}

セッションがやり直され、再開され、あるいは時間切れになったときは次のように進みます。
1. 組み込みのメモリがディスクへ書き出されます
2. メモリのプロバイダの `on_session_end()` フックが動きます
3. 一時的な `AIAgent` が、メモリのためだけの1ターンを走らせます
4. そのあとコンテキストは捨てられるか、保管されます

## 背後で動く手入れ {#background-maintenance}

ゲートウェイは、メッセージの処理と並行して定期的な手入れを行います。

- **cron の刻み** — ジョブの予定を確かめ、時間の来たものを動かす
- **セッションの期限切れ** — 放置されたセッションを、時間切れのあとに片づける
- **メモリの書き出し** — セッションが切れる前に、先回りしてメモリを書き出す
- **キャッシュの更新** — モデルの一覧とプロバイダの状態を取り直す

## プロセスの管理 {#process-management}

ゲートウェイは常駐のプロセスとして動き、次の方法で管理します。

- `hermes gateway start` / `hermes gateway stop` — 手で操作する
- `systemctl`（Linux）や `launchctl`（macOS）— サービスとして管理する
- `~/.hermes/gateway.pid` の PID ファイル — プロファイル単位でプロセスを把握する

**プロファイル単位か全体か**: `start_gateway()` はプロファイル単位の PID ファイルを使います。`hermes gateway stop` は、いま使っているプロファイルのゲートウェイだけを止めます。`hermes gateway stop --all` は全体を対象に `ps aux` で走査し、すべてのゲートウェイのプロセスを止めます（更新のときに使います）。

## 関連する文書 {#related-docs}

- [セッションの保存](/hermes/docs/developer-guide/session-storage/)
- [cron の内部構造](/hermes/docs/developer-guide/cron-internals/)
- [ACP の内部構造](/hermes/docs/developer-guide/acp-internals/)
- [エージェントループの内部構造](/hermes/docs/developer-guide/agent-loop/)
- [メッセージングのゲートウェイ（利用者向け）](/hermes/docs/user-guide/messaging/)
