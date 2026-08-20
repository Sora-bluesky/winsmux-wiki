---
title: "developer-guide/adding-platform-adapters"
description: ""
upstream_path: developer-guide/adding-platform-adapters.md
upstream_blob: 870c6608dd03488244fd2ce1a44fbc8b70165dfc
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/adding-platform-adapters
---

# プラットフォームアダプターを追加する {#adding-a-platform-adapter}

このガイドでは、Hermes のゲートウェイに新しいメッセージングのプラットフォームを足す方法を扱います。プラットフォームアダプターは、Hermes を外部のメッセージングサービス（Telegram、Discord、WeCom など）につなぎ、利用者がそのサービス越しにエージェントとやり取りできるようにするものです。

:::tip
プラットフォームを足すやり方は2つあります。
- **プラグイン**（コミュニティ / 第三者にはこちらを勧めます）: プラグインのディレクトリを `~/.hermes/plugins/` に置くだけで、中核のコードには一切手を入れません。下の [プラグインの道筋](#plugin-path-recommended) を見てください。
- **組み込み**: コード、設定、ドキュメントにまたがる20以上のファイルを書き換えます。下の [組み込みの確認項目](#step-by-step-checklist-built-in-path) を使ってください。
:::

## アーキテクチャの概観 {#architecture-overview}

```
User ↔ Messaging Platform ↔ Platform Adapter ↔ Gateway Runner ↔ AIAgent
```

どのアダプターも `gateway/platforms/base.py` の `BasePlatformAdapter` を継承し、次を実装します。

- **`connect()`** — 接続を確立します（WebSocket、ロングポーリング、HTTP サーバーなど）*（抽象メソッド）*
- **`disconnect()`** — きれいに終了します *（抽象メソッド）*
- **`send()`** — チャットへテキストのメッセージを送ります *（抽象メソッド）*
- **`send_typing()`** — 入力中の表示を出します（任意の上書き）
- **`get_chat_info()`** — チャットのメタデータを返します（任意の上書き）

受信したメッセージはアダプターが受け取り、`self.handle_message(event)` を通じて渡します。基底クラスがそれをゲートウェイのランナーへ振り分けます。

## プラグインの道筋（推奨） {#plugin-path-recommended}

プラグインの仕組みを使えば、Hermes の中核のコードを書き換えずにプラットフォームアダプターを足せます。プラグインは、2つのファイルを含むディレクトリです。

```
~/.hermes/plugins/my-platform/
  plugin.yaml      # Plugin metadata
  adapter.py       # Adapter class + register() entry point
```

### plugin.yaml {#pluginyaml}

プラグインのメタデータです。`requires_env` と `optional_env` のブロックは、`hermes config` の UI 項目を自動で埋めます（下の [環境変数を出す](#surfacing-env-vars-in-hermes-config) を参照）。

```yaml
name: my-platform
label: My Platform
kind: platform
version: 1.0.0
description: My custom messaging platform adapter
author: Your Name
requires_env:
  - MY_PLATFORM_TOKEN          # bare string works
  - name: MY_PLATFORM_CHANNEL  # or rich dict for better UX
    description: "Channel to join"
    prompt: "Channel"
    password: false
optional_env:
  - name: MY_PLATFORM_HOME_CHANNEL
    description: "Default channel for cron delivery"
    password: false
```

#### 送信側のクライアントツール: `provides_tools` {#outbound-client-tools-providestools}

`kind: platform` のプラグインは**遅延読み込み**です。アダプターのモジュール（とその SDK の
import）が読み込まれるのは、ゲートウェイ、cron、`send_message` のいずれかの経路が
プラットフォームレジストリにそのプラットフォームを最初に問い合わせたときだけです。プラグインが、
どのセッションからでもエージェントが呼べる送信側の*クライアントツール*（同梱の `a2a`
プラグインの `a2a_call` / `a2a_discover` など）も出すなら、それらは専用の `tools.py` に
`register_tools(ctx)` 関数として置き、マニフェストで宣言してください。

```yaml
provides_tools:
  - my_platform_call
  - my_platform_list
```

`provides_tools` を宣言すると、Hermes はプラグインの探索時に `tools.py` だけを import し、
クライアントツールをすべてのプロセス — CLI と TUI を含みます — に登録します。その間も
アダプターは遅延読み込みのままです。パッケージの `__init__.py` は import を軽く保ち、
アダプターは `register()` の中から引き込んでください。そうすれば eager

遅延読み込み。

利用者は他のツールセットと同じ要領で、プラットフォームごとに有効にします。たとえば
`hermes tools enable my_platform --platform cli` のようにするか、`config.yaml` の
`platform_toolsets` の下にそのツールセットのキーを並べます。プラグインの
プラットフォーム名も `--platform` の対象として有効なので、そのプラットフォームで受けた
セッションに、そこ自身の送信側ツールを与えることもできます。

### adapter.py {#adapterpy}

```python

from gateway.platforms.base import (
    BasePlatformAdapter, SendResult, MessageEvent, MessageType,
)
from gateway.config import Platform, PlatformConfig

class MyPlatformAdapter(BasePlatformAdapter):
    def __init__(self, config: PlatformConfig):
        super().__init__(config, Platform("my_platform"))
        extra = config.extra or {}
        self.token = os.getenv("MY_PLATFORM_TOKEN") or extra.get("token", "")

    async def connect(self, *, is_reconnect: bool = False) -> bool:
        # Connect to the platform API, start listeners
        self._mark_connected()
        return True

    async def disconnect(self) -> None:
        self._mark_disconnected()

    async def send(self, chat_id, content, reply_to=None, metadata=None):
        # Send message via platform API
        return SendResult(success=True, message_id="...")

    async def get_chat_info(self, chat_id):
        return {"name": chat_id, "type": "dm"}

def check_requirements() -> bool:
    return bool(os.getenv("MY_PLATFORM_TOKEN"))

def validate_config(config) -> bool:
    extra = getattr(config, "extra", {}) or {}
    return bool(os.getenv("MY_PLATFORM_TOKEN") or extra.get("token"))

def _env_enablement() -> dict | None:
    token = os.getenv("MY_PLATFORM_TOKEN", "").strip()
    channel = os.getenv("MY_PLATFORM_CHANNEL", "").strip()
    if not (token and channel):
        return None
    seed = {"token": token, "channel": channel}
    home = os.getenv("MY_PLATFORM_HOME_CHANNEL")
    if home:
        seed["home_channel"] = {"chat_id": home, "name": "Home"}
    return seed

def register(ctx):
    """Plugin entry point — called by the Hermes plugin system."""
    ctx.register_platform(
        name="my_platform",
        label="My Platform",
        adapter_factory=lambda cfg: MyPlatformAdapter(cfg),
        # PASSIVE probe — "are deps/config present right now?".  Called from
        # status displays and config loading, so it must NEVER pip-install.
        check_fn=check_requirements,
        # ACTIVE installer (optional) — only for platforms with a
        # lazy-installable SDK.  create_adapter() calls it when check_fn
        # returns False, right before the gateway connects the platform.
        # Typically wraps tools.lazy_deps.ensure_and_bind(...).  Omit it
        # and a False check_fn is a hard block.
        # ensure_deps_fn=ensure_requirements,
        validate_config=validate_config,
        required_env=["MY_PLATFORM_TOKEN"],
        install_hint="pip install my-platform-sdk",
        # Env-driven auto-configuration — seeds PlatformConfig.extra from
        # env vars before adapter construction. See "Env-Driven Auto-
        # Configuration" section below.
        env_enablement_fn=_env_enablement,
        # Cron home-channel delivery support. Lets deliver=my_platform cron
        # jobs route without editing cron/scheduler.py. See "Cron Delivery"
        # section below.
        cron_deliver_env_var="MY_PLATFORM_HOME_CHANNEL",
        # Per-platform user authorization env vars
        allowed_users_env="MY_PLATFORM_ALLOWED_USERS",
        allow_all_env="MY_PLATFORM_ALLOW_ALL_USERS",
        # Message length limit for smart chunking (0 = no limit)
        max_message_length=4000,
        # LLM guidance injected into system prompt
        platform_hint=(
            "You are chatting via My Platform. "
            "It supports markdown formatting."
        ),
        # Display
        emoji="💬",
    )

    # Optional: register platform-specific tools
    ctx.register_tool(
        name="my_platform_search",
        toolset="my_platform",
        schema={...},
        handler=my_search_handler,
    )
```

### 設定 {#configuration}

利用者は `config.yaml` でプラットフォームを設定します。

```yaml
gateway:
  platforms:
    my_platform:
      enabled: true
      extra:
        token: "..."
        channel: "#general"
```

環境変数でも構いません（アダプターが `__init__` で読みます）。

### プラグインの仕組みが自動でやってくれること {#what-the-plugin-system-handles-automatically}

`ctx.register_platform()` を呼ぶと、次の連携部分が自動で面倒を見られます。中核のコードに変更は要りません。

| 連携する部分 | どう動くか |
|---|---|
| ゲートウェイのアダプター生成 | 組み込みの if/elif の連なりより先にレジストリが参照されます |
| 設定の読み取り | `Platform._missing_()` がどんなプラットフォーム名も受け付けます |
| 接続済みプラットフォームの検証 | レジストリの `validate_config()` が呼ばれます |
| 利用者の認可 | `allowed_users_env` / `allow_all_env` が参照されます |
| 環境変数だけでの自動有効化 | `env_enablement_fn` が `PlatformConfig.extra` と `home_channel` を埋めます |
| YAML 設定の橋渡し | `apply_yaml_config_fn` が `config.yaml` のキーを環境変数や extras に翻訳します |
| cron での配信 | `cron_deliver_env_var` によって `deliver=<name>` が使えます |
| `hermes config` の UI 項目 | `plugin.yaml` の `requires_env` / `optional_env` が自動で埋めます |
| 送信エンジン（`tools/send_message_tool.py`） | 稼働中のゲートウェイのアダプター経由で送ります |
| Webhook でのプラットフォームをまたぐ配信 | 既知のプラットフォームかどうかレジストリが参照されます |
| `/update` コマンドの利用可否 | `allow_update_command` のフラグ |
| チャンネルの一覧 | 列挙にプラグインのプラットフォームも含まれます |
| システムプロンプトへの補足 | `platform_hint` が LLM のコンテキストに差し込まれます |
| メッセージの分割 | 賢く分けるための `max_message_length` |
| 個人情報の伏せ字化 | `pii_safe` のフラグ |
| `hermes status` | プラグインのプラットフォームを `(plugin)` の印付きで表示します |
| `hermes gateway setup` | セットアップのメニューにプラグインのプラットフォームが並びます |
| `hermes tools` / `hermes skills` | プラットフォームごとの設定にプラグインのプラットフォームが入ります |
| トークンのロック（複数プロフィール） | `connect()` の中で `acquire_scoped_lock()` を使ってください |
| 設定だけ残ったときの警告 | プラグインが見つからないとき、事情のわかるログが出ます |

## 単体で動く送信経路の拡張 {#standalone-send-path-extensions}

単体で動くプラットフォームも、`ctx.register_platform()` が作る同じ `PlatformEntry` に送信の
振る舞いを宣言しておけば、`hermes send --to ...` の直接送信や cron の
`deliver=platform:...` といった、ホスト側が主導する送信に参加できます。
`send_message` は意図的にエージェントが呼べるモデルのツールにはしていません。プラグインは、
エージェントが自分から送信を始められるような等価のモデル側の窓口を登録してはいけません。

```python
async def _send_request(args, chat_id, platform_name, pconfig):
    # `args` contains the host-driven send request fields.
    message_id = await client.send(
        address=chat_id,
        body=args["message"],
        subject=args.get("subject"),
    )
    return {"success": True, "platform": platform_name,
            "chat_id": chat_id, "message_id": message_id}

def _parse_address(raw):
    normalized = raw.strip().lower()
    if normalized.startswith("@") and "@" in normalized[1:]:
        return normalized, None  # (chat_id, optional thread_id)
    return None                 # continue to channel-directory resolution

def _validate_address(address):
    # True accepts; False rejects; a string rejects with that diagnostic.
    return True if address.endswith("@example.com") else "unsupported domain"

def register(ctx):
    ctx.register_platform(
        name="fmsg",
        label="Fixture Message",
        adapter_factory=lambda cfg: FmsgAdapter(cfg),
        check_fn=check_requirements,
        parse_target_ref_fn=_parse_address,
        validate_target_ref_fn=_validate_address,
        # May be a regular function or async def. Hermes awaits any awaitable
        # result, including callable objects and functools.partial wrappers.
        send_message_handler=_send_request,
        # Prefer this lower-level hook when cron must send from a process
        # without the live gateway.
        standalone_sender_fn=_standalone_send,
    )
```

宛先の解決は、3つの送信の窓口すべてで共通です。まずパーサーの出力が正規化され、チャンネル
一覧に載っている ID は信頼されます。プラグインのパーサーは、そのプラットフォーム独自の宛先表記を
明示的に受け入れる必要があります。解決できなかった文字列が、中身を見ないまま素通しされることは
ありません。知らないプラットフォームや検証に失敗した宛先は、黙って配信を試みる代わりに、事情の
わかる情報を返します。プラグインの強制再読み込みやプロフィールの切り替えでは、そのプラグインが
持っていた登録が解除されるので、パーサーやハンドラーが次のプロフィールへ漏れ出すことはありません。

## 環境変数からの自動設定 {#env-driven-auto-configuration}

たいていの利用者は、`config.yaml` を編集するのではなく `~/.hermes/.env` に環境変数を置いてプラットフォームを用意します。`env_enablement_fn` のフックを使うと、アダプターが組み立てられる**前**にプラグインがその環境変数を拾えるので、`hermes gateway status`、`get_connected_platforms()`、cron での配信が、プラットフォームの SDK を読み込まずに正しい状態を見られます。

```python
def _env_enablement() -> dict | None:
    """Seed PlatformConfig.extra from env vars.

    Called by the platform registry during load_gateway_config().
    Return None when the platform isn't minimally configured — the
    caller then skips auto-enabling. Return a dict to seed extras.

    The special 'home_channel' key is extracted and becomes a proper
    HomeChannel dataclass on the PlatformConfig; every other key is
    merged into PlatformConfig.extra.
    """
    token = os.getenv("MY_PLATFORM_TOKEN", "").strip()
    channel = os.getenv("MY_PLATFORM_CHANNEL", "").strip()
    if not (token and channel):
        return None
    seed = {"token": token, "channel": channel}
    home = os.getenv("MY_PLATFORM_HOME_CHANNEL")
    if home:
        seed["home_channel"] = {
            "chat_id": home,
            "name": os.getenv("MY_PLATFORM_HOME_CHANNEL_NAME", "Home"),
        }
    return seed

def register(ctx):
    ctx.register_platform(
        name="my_platform",
        label="My Platform",
        adapter_factory=lambda cfg: MyPlatformAdapter(cfg),
        check_fn=check_requirements,
        validate_config=validate_config,
        env_enablement_fn=_env_enablement,
        # ... other fields
    )
```

## YAML から環境変数への橋渡し {#yamlenv-config-bridge}

環境変数よりも `config.yaml` のキー（`my_platform.require_mention`、`my_platform.allowed_channels` など）で設定したい利用者もいます。`apply_yaml_config_fn` のフックを使うと、中核の `gateway/config.py` にそのプラットフォームの YAML の構造を覚えさせる代わりに、プラグイン自身がこの翻訳を担えます。

```python

def _apply_yaml_config(yaml_cfg: dict, platform_cfg: dict) -> dict | None:
    """Translate config.yaml `my_platform:` keys into env vars / extras.

    yaml_cfg     — the full top-level parsed config.yaml dict
    platform_cfg — the platform's own sub-dict (yaml_cfg.get("my_platform", {}))

    May mutate os.environ directly (use `not os.getenv(...)` guards to
    preserve env > YAML precedence) and/or return a dict to merge into
    PlatformConfig.extra. Return None or {} for no extras.
    """
    if "require_mention" in platform_cfg and not os.getenv("MY_PLATFORM_REQUIRE_MENTION"):
        os.environ["MY_PLATFORM_REQUIRE_MENTION"] = str(platform_cfg["require_mention"]).lower()
    allowed = platform_cfg.get("allowed_channels")
    if allowed is not None and not os.getenv("MY_PLATFORM_ALLOWED_CHANNELS"):
        if isinstance(allowed, list):
            allowed = ",".join(str(v) for v in allowed)
        os.environ["MY_PLATFORM_ALLOWED_CHANNELS"] = str(allowed)
    return None  # nothing extra to merge into PlatformConfig.extra

def register(ctx):
    ctx.register_platform(
        name="my_platform",
        ...,
        apply_yaml_config_fn=_apply_yaml_config,
    )
```

このフックは `load_gateway_config()` の中で、共通キーをまとめて処理するループ（`unauthorized_dm_behavior`、`notice_delivery`、`reply_prefix`、`require_mention` といったよくあるキーを扱います）のあと、`_apply_env_overrides()` の前に呼ばれます。ですからプラグインが橋渡しすべきなのは、**そのプラットフォーム固有の**キーだけです。

フックが投げた例外は握りつぶされ、デバッグ用のログに記録されます。行儀の悪いプラグインが、ゲートウェイの設定読み込みを止めてしまうことはありません。

## cron での配信 {#cron-delivery}

`deliver=my_platform` の cron ジョブを、設定済みのホームチャンネルへ届けたいときは、既定のチャット / ルーム / チャンネルの ID を持つ環境変数の名前を `cron_deliver_env_var` に設定します。

```python
ctx.register_platform(
    name="my_platform",
    ...
    cron_deliver_env_var="MY_PLATFORM_HOME_CHANNEL",
)
```

スケジューラは、`deliver=my_platform` のジョブでホームの宛先を決めるときにこの環境変数を読み、あわせて `_KNOWN_DELIVERY_PLATFORMS` のような確認でも、そのプラットフォームを妥当な cron の宛先として扱います。`env_enablement_fn` が `home_channel` の辞書を埋めているなら（上を参照）そちらが優先され、`cron_deliver_env_var` は環境変数からの設定より前に走る cron ジョブのためのフォールバックになります。

### 別プロセスからの cron 配信 {#out-of-process-cron-delivery}

`cron_deliver_env_var` は、そのプラットフォームを `deliver=` の宛先として認識させます。cron ジョブがゲートウェイとは別のプロセスで走るとき（つまり `hermes cron run` を `hermes gateway` と別に動かすとき）に実際の送信まで成功させるには、`standalone_sender_fn` を登録してください。

```python
async def _standalone_send(
    pconfig,
    chat_id,
    message,
    *,
    thread_id=None,
    media_files=None,
    force_document=False,
):
    """Open an ephemeral connection / acquire a fresh token, send, and close."""
    # ... open connection, send message, return result ...
    return {"success": True, "message_id": "..."}
    # or {"error": "..."}

ctx.register_platform(
    name="my_platform",
    ...
    cron_deliver_env_var="MY_PLATFORM_HOME_CHANNEL",
    standalone_sender_fn=_standalone_send,
)
```

このフックが要る理由はこうです。組み込みのプラットフォーム（Telegram、Discord、Slack など）は `tools/send_message_tool.py` に REST の直接呼び出しを備えているので、ゲートウェイを同じプロセスに抱えなくても cron から配信できます。一方プラグインのプラットフォームは、これまで `_gateway_runner_ref()` に頼っていました。これはゲートウェイのプロセスの外では `None` を返すため、`standalone_sender_fn` がないと cron 側の送信は `No live adapter for platform '<name>'` で失敗します。

この関数は、稼働中のアダプターが受け取るのと同じ `pconfig` と `chat_id` に加えて、任意のキーワード引数 `thread_id`、`media_files`、`force_document` を受け取ります。`{"success": True, "message_id": ...}` を返せば配信成功として扱われ、`{"error": "..."}` を返すとそのメッセージが cron の `delivery_errors` に現れます。関数の中で投げられた例外は振り分け側が捕まえ、`Plugin standalone send failed: <reason>` として報告されます。実装の見本は `plugins/platforms/{irc,teams,google_chat}/adapter.py` にあります。

## 環境変数を `hermes config` に出す {#surfacing-env-vars-in-hermes-config}

`hermes_cli/config.py` は import の時点で `plugins/platforms/*/plugin.yaml` を走査し、`requires_env` と（任意の）`optional_env` のブロックから `OPTIONAL_ENV_VARS` を自動で埋めます。辞書の詳しい書き方を使えば、説明文、入力の促し、パスワード扱いのフラグ、URL をきちんと渡せます。CLI のセットアップ画面がそれを勝手に拾ってくれます。

```yaml
# plugins/platforms/my_platform/plugin.yaml
name: my_platform-platform
label: My Platform
kind: platform
version: 1.0.0
description: >
  My Platform gateway adapter for Hermes Agent.
author: Your Name
requires_env:
  - name: MY_PLATFORM_TOKEN
    description: "Bot API token from the My Platform console"
    prompt: "My Platform bot token"
    url: "https://my-platform.example.com/bots"
    password: true
  - name: MY_PLATFORM_CHANNEL
    description: "Channel to join (e.g. #hermes)"
    prompt: "Channel"
    password: false
optional_env:
  - name: MY_PLATFORM_HOME_CHANNEL
    description: "Default channel for cron delivery (defaults to MY_PLATFORM_CHANNEL)"
    prompt: "Home channel (or empty)"
    password: false
  - name: MY_PLATFORM_ALLOWED_USERS
    description: "Comma-separated user IDs allowed to talk to the bot"
    prompt: "Allowed users (comma-separated)"
    password: false
```

**使える辞書のキー:** `name`（必須）、`description`、`prompt`、`url`、`password`（真偽値。省略すると `*_TOKEN` / `*_SECRET` / `*_KEY` / `*_PASSWORD` / `*_JSON` の語尾から自動で判定します）、`category`（既定は `"messaging"`）。

素の文字列で書く形（`- MY_PLATFORM_TOKEN`）も引き続き使えます。その場合はプラグインの `label` から一般的な説明文が自動で作られます。同じ変数がすでに `OPTIONAL_ENV_VARS` に直接書かれているなら、そちらが勝ちます（従来の動きを保つため）。plugin.yaml の形はフォールバックとして働きます。

## LLM が遅いときのプラットフォーム別の見せ方 {#platform-specific-slow-llm-ux}

プラットフォームによっては、LLM の応答が遅いときの見せ方を変えざるを得ない制約があります。

- **LINE** は、受信したイベントからおよそ60秒で期限切れになる、1回しか使えない*返信トークン*を発行します。そのトークンを使った返信は無料ですが、従量課金の Push API に切り替えると無料ではありません。期限までに LLM が終わらなければ、「有料の Push の枠を使う」か「期限切れの前に返信トークンでもっと気の利いたことをする」かの選択になります。
- **WhatsApp** は24時間でセッションを非アクティブと見なし、それ以降はテンプレートのメッセージしか受け付けません。
- **SMS** には入力中の表示や途中経過という概念がないので、長い応答はボットが落ちているようにしか見えません。

これらは、基底の `BasePlatformAdapter` には先読みできない現実の制約です。プラグインの窓口は、キーワード引数を増やさずに、基底の入力中ループの上へプラットフォーム固有の見せ方を重ねられる余地を、意図的に残しています。

### 型: `_keep_typing` を継承して途中の見せ方を重ねる {#pattern-subclass-keeptyping-to-layer-mid-flight-ux}

`BasePlatformAdapter._keep_typing` は入力中の表示を保つ心拍です。LLM が生成している間はバックグラウンドのタスクとして走り、応答が届いた時点で取り消されます。あるしきい値でプラットフォーム固有の振る舞いを重ねたいとき（たとえば45秒で「まだ考えています」の吹き出しを送るとき）は、アダプターで `_keep_typing` を上書きし、`super()._keep_typing()` と並べて自前のタスクを走らせ、`finally` で片付けます。

```python
class LineAdapter(BasePlatformAdapter):
    async def _keep_typing(self, chat_id: str, *args, **kwargs) -> None:
        if self.slow_response_threshold <= 0:
            await super()._keep_typing(chat_id, *args, **kwargs)
            return

        async def _fire_at_threshold() -> None:
            try:
                await asyncio.sleep(self.slow_response_threshold)
            except asyncio.CancelledError:
                raise
            # Platform-specific work here — for LINE, send a Template
            # Buttons "Get answer" bubble using the cached reply token
            # so the user can fetch the cached response later via a
            # fresh (free) reply token from the postback callback.
            await self._send_slow_response_button(chat_id)

        side_task = asyncio.create_task(_fire_at_threshold())
        try:
            await super()._keep_typing(chat_id, *args, **kwargs)
        finally:
            if not side_task.done():
                side_task.cancel()
                try:
                    await side_task
                except (asyncio.CancelledError, Exception):
                    pass
```

要点です。

- **必ず `await super()._keep_typing(...)` を呼ぶこと。** 入力中の心拍はそれ自体に価値があります。置き換えるのではなく、上に重ねてください。
- **付け足したタスクは `finally` で片付けること。** LLM が終わったとき（あるいは `/stop` で走行が取り消されたとき）、ゲートウェイは入力中のタスクを取り消します。付け足したタスクもその取り消しを受け取らないと、居残って、応答をすでに届けたあとに動いてしまいます。
- **`interrupt_session_activity` と組にして**、利用者が `/stop` を出したときに宙に浮いた表示を片付けます。LINE なら、ポストバックのキャッシュの項目を `PENDING` から `ERROR` へ移すことで、残っている「Get answer」のボタンが堂々巡りせず「走行は中断されました」と伝えるようになります。

### 型: `send` を継承して、すぐ送らずキャッシュに回す {#pattern-subclass-send-to-route-through-a-cache-instead-of-sending-immediately}

応答が遅いときの見せ方として、あとから取り出せるように応答をキャッシュするなら（LINE のポストバックの流れです）、上書きした `send` は3つの状況を見分ける必要があります。

1. **そのチャットでポストバックが保留中** → request_id のもとに応答をキャッシュし、目に見えるものは送りません。
2. **システムからの受領の合図**（`⚡ Interrupting`、`⏳ Queued`、`⏩ Steered`） → キャッシュを迂回して目に見える形で送り、自分の入力にゲートウェイが応えたことを利用者に伝えます。
3. **ふつうの応答** → いつもどおり返信トークンか Push で送ります。

```python
async def send(self, chat_id: str, content: str, **kw) -> SendResult:
    if _is_system_bypass(content):
        return await self._send_text_chunks(chat_id, content, force_push=False)
    pending_rid = self._pending_buttons.get(chat_id)
    if pending_rid:
        self._cache.set_ready(pending_rid, content)
        return SendResult(success=True, message_id=pending_rid)
    return await self._send_text_chunks(chat_id, content, force_push=False)
```

`_SYSTEM_BYPASS_PREFIXES` は、ゲートウェイ自身が受領を知らせるときの接頭辞（`⚡`、`⏳`、`⏩`、`💾`）です。キャッシュ側の状態がどうであれ、これらは必ず目に見える形で通してください。

### この型が向いている場面 {#when-this-pattern-is-appropriate}

入力中ループを上書きするやり方が向くのは、次の両方が当てはまるときです。

- そのプラットフォームの送信 API に、厳しい時間の制約がある（1回きりの返信トークン、期限のあるセッションなど）。かつ
- 途中で*目に見える吹き出し*を出すことが、そのプラットフォームで受け入れられる。

もっと単純な、`slow_response_threshold = 0` で常に Push を使う経路が向くのは、次のいずれかのときです。

- そのプラットフォームに、無料と有料の意味のある区別がない。あるいは
- 途中で対話的な吹き出しを出すより、「読み込み中… 読み込み中… 完了」と黙って待って一気に返すほうを利用者たちが好む。

LINE はどちらにも対応できます。しきい値は無料でポストバックを取りに行くために既定で45秒、`LINE_SLOW_RESPONSE_THRESHOLD=0` にすると「常に Push へフォールバック」に戻ります。

### 参考実装 {#reference-implementation}

LINE のポストバックの実装は `plugins/platforms/line/adapter.py` にひととおりあります。`RequestCache` の状態遷移（`PENDING → READY → DELIVERED` に、`/stop` 用の `ERROR` を加えたもの）、しきい値で Template Buttons の吹き出しを出す `_keep_typing` の上書き、キャッシュに回す `send` の上書き、宙に浮いた PENDING を片付ける `interrupt_session_activity` の上書きが揃っています。

### 参考実装（プラグインの道筋） {#reference-implementations-plugin-path}

動く完全な例としては、リポジトリの `plugins/platforms/irc/` を見てください。外部の依存が一切ない、本格的な非同期の IRC アダプターです。`plugins/platforms/teams/` は Bot Framework / Adaptive Cards を、`plugins/platforms/google_chat/` は OAuth を使う REST API を、`plugins/platforms/line/` は Webhook 駆動の Messaging API と、LLM が遅いときのプラットフォーム固有の見せ方を扱っています。

---

## 手順ごとの確認項目（組み込みの道筋） {#step-by-step-checklist-built-in-path}

:::note
この確認項目は、Hermes の中核のコードベースに直接プラットフォームを足すためのものです。ふつうは公式に対応するプラットフォームのために、中核の開発者が行います。コミュニティや第三者のプラットフォームは、上の [プラグインの道筋](#plugin-path-recommended) を使ってください。
:::

### 1. Platform の列挙 {#1-platform-enum}

`gateway/config.py` の `Platform` の列挙にプラットフォームを足します。

```python
class Platform(Enum):
    # ... existing platforms ...
    NEWPLAT = "newplat"
```

### 2. アダプターのファイル {#2-adapter-file}

`plugins/platforms/newplat/adapter.py` を作ります。

```python
from gateway.config import Platform, PlatformConfig
from gateway.platforms.base import (
    BasePlatformAdapter, MessageEvent, MessageType, SendResult,
)

def check_newplat_requirements() -> bool:
    """Return True if dependencies are available."""
    return SOME_SDK_AVAILABLE

class NewPlatAdapter(BasePlatformAdapter):
    def __init__(self, config: PlatformConfig):
        super().__init__(config, Platform.NEWPLAT)
        # Read config from config.extra dict
        extra = config.extra or {}
        self._api_key = extra.get("api_key") or os.getenv("NEWPLAT_API_KEY", "")

    async def connect(self, *, is_reconnect: bool = False) -> bool:
        # Set up connection, start polling/webhook
        self._mark_connected()
        return True

    async def disconnect(self) -> None:
        self._running = False
        self._mark_disconnected()

    async def send(self, chat_id, content, reply_to=None, metadata=None):
        # Send message via platform API
        return SendResult(success=True, message_id="...")

    async def get_chat_info(self, chat_id):
        return {"name": chat_id, "type": "dm"}
```

受信したメッセージについては、`MessageEvent` を組み立てて `self.handle_message(event)` を呼びます。

```python
source = self.build_source(
    chat_id=chat_id,
    chat_name=name,
    chat_type="dm",  # or "group"
    user_id=user_id,
    user_name=user_name,
)
event = MessageEvent(
    text=content,
    message_type=MessageType.TEXT,
    source=source,
    message_id=msg_id,
)
await self.handle_message(event)
```

### 3. ゲートウェイの設定（`gateway/config.py`） {#3-gateway-config-gatewayconfigpy}

触る場所は3つです。

1. **`get_connected_platforms()`** — そのプラットフォームに必要な資格情報の確認を足します
2. **`load_gateway_config()`** — トークンの環境変数の対応を足します: `Platform.NEWPLAT: "NEWPLAT_TOKEN"`
3. **`_apply_env_overrides()`** — `NEWPLAT_*` の環境変数をすべて設定に対応づけます

### 4. ゲートウェイのランナー（`gateway/run.py`） {#4-gateway-runner-gatewayrunpy}

触る場所は6つです。

1. **`_create_adapter()`** — `elif platform == Platform.NEWPLAT:` の分岐を足します
2. **`_is_user_authorized()` の allowed_users の対応** — `Platform.NEWPLAT: "NEWPLAT_ALLOWED_USERS"`
3. **`_is_user_authorized()` の allow_all の対応** — `Platform.NEWPLAT: "NEWPLAT_ALLOW_ALL_USERS"`
4. **起動時の環境変数の確認 `_any_allowlist` のタプル** — `"NEWPLAT_ALLOWED_USERS"` を足します
5. **起動時の環境変数の確認 `_allow_all` のタプル** — `"NEWPLAT_ALLOW_ALL_USERS"` を足します
6. **`_UPDATE_ALLOWED_PLATFORMS` の frozenset** — `Platform.NEWPLAT` を足します

### 5. プラットフォームをまたぐ配信 {#5-cross-platform-delivery}

1. **`gateway/platforms/webhook.py`** — 配信の種類のタプルに `"newplat"` を足します
2. **`cron/scheduler.py`** — `_KNOWN_DELIVERY_PLATFORMS` の frozenset と `_deliver_result()` のプラットフォームの対応に足します

### 6. CLI との連携 {#6-cli-integration}

1. **`hermes_cli/config.py`** — `NEWPLAT_*` の変数をすべて `_EXTRA_ENV_KEYS` に足します
2. **`hermes_cli/gateway.py`** — key、label、emoji、token_var、setup_instructions、vars を持つ項目を `_PLATFORMS` の一覧に足します
3. **`hermes_cli/platforms.py`** — label と default_toolset を持つ `PlatformInfo` の項目を足します（`skills_config` と `tools_config` の TUI が使います）
4. **`hermes_cli/setup.py`** — `_setup_newplat()` 関数を足し（`gateway.py` に任せても構いません）、メッセージングのプラットフォームの一覧にタプルを足します
5. **`hermes_cli/status.py`** — プラットフォームの検出の項目を足します: `"NewPlat": ("NEWPLAT_TOKEN", "NEWPLAT_HOME_CHANNEL")`
6. **`hermes_cli/dump.py`** — プラットフォーム検出の辞書に `"newplat": "NEWPLAT_TOKEN"` を足します

### 7. ツール {#7-tools}

1. **`tools/send_message_tool.py`** — プラットフォームの対応に `"newplat": Platform.NEWPLAT` を足します
2. **`tools/cronjob_tools.py`** — 配信先を説明する文字列に `newplat` を足します

### 8. ツールセット {#8-toolsets}

1. **`toolsets.py`** — `_HERMES_CORE_TOOLS` を持つ `"hermes-newplat"` のツールセットの定義を足します
2. **`toolsets.py`** — `"hermes-gateway"` の includes の一覧に `"hermes-newplat"` を足します

### 9. 任意: プラットフォームへの補足 {#9-optional-platform-hints}

**`agent/prompt_builder.py`** — そのプラットフォームに表示上の制約（markdown が使えない、メッセージ長の上限があるなど）があるなら、`PLATFORM_HINTS` の辞書に項目を足します。これでプラットフォーム固有の案内がシステムプロンプトに差し込まれます。

```python
PLATFORM_HINTS = {
    # ...
    "newplat": (
        "You are chatting via NewPlat. It supports markdown formatting "
        "but has a 4000-character message limit."
    ),
}
```

すべてのプラットフォームに補足が要るわけではありません。エージェントの振る舞いを変えるべきときだけ足してください。

### 10. テスト {#10-tests}

`tests/gateway/test_newplat.py` を作り、次を覆います。

- 設定からのアダプターの生成
- メッセージイベントの組み立て
- send メソッド（外部の API はモックにします）
- そのプラットフォーム固有の機能（暗号化、振り分けなど）

### 11. ドキュメント {#11-documentation}

| ファイル | 足すもの |
|------|-------------|
| `website/docs/user-guide/messaging/newplat.md` | プラットフォームのセットアップのページ一式 |
| `website/docs/user-guide/messaging/index.md` | プラットフォームの比較表、アーキテクチャの図、ツールセットの表、セキュリティの節、次の一歩へのリンク |
| `website/docs/reference/environment-variables.md` | NEWPLAT_* の環境変数すべて |
| `website/docs/reference/toolsets-reference.md` | hermes-newplat のツールセット |
| `website/docs/integrations/index.md` | プラットフォームへのリンク |
| `website/sidebars.ts` | ドキュメントのページへのサイドバーの項目 |
| `website/docs/developer-guide/architecture.md` | アダプターの数と一覧 |
| `website/docs/developer-guide/gateway-internals.md` | アダプターのファイルの一覧 |

## 抜けの監査 {#parity-audit}

新しいプラットフォームの PR を完了とする前に、すでにあるプラットフォームと突き合わせて抜けがないか監査します。

```bash
# Find every .py file mentioning the reference platform
search_files "bluebubbles" output_mode="files_only" file_glob="*.py"

# Find every .py file mentioning the new platform
search_files "newplat" output_mode="files_only" file_glob="*.py"

# Any file in the first set but not the second is a potential gap
```

`.md` と `.ts` のファイルでも同じことを繰り返します。見つかった差はひとつずつ確かめてください。プラットフォームを並べているところ（更新が要る）なのか、そのプラットフォーム固有の記述（飛ばしてよい）なのか、という判断です。

## よくある型 {#common-patterns}

### ロングポーリングのアダプター {#long-poll-adapters}

アダプターがロングポーリングを使うなら（Telegram や Weixin のように）、ポーリングのループをタスクにします。

```python
async def connect(self):
    self._poll_task = asyncio.create_task(self._poll_loop())
    self._mark_connected()

async def _poll_loop(self):
    while self._running:
        messages = await self._fetch_updates()
        for msg in messages:
            await self.handle_message(self._build_event(msg))
```

### コールバック / Webhook のアダプター {#callbackwebhook-adapters}

プラットフォーム側がこちらのエンドポイントへメッセージを押し込んでくるなら（WeCom のコールバックのように）、HTTP サーバーを走らせます。

```python
async def connect(self):
    self._app = web.Application()
    self._app.router.add_post("/callback", self._handle_callback)
    # ... start aiohttp server
    self._mark_connected()

async def _handle_callback(self, request):
    event = self._build_event(await request.text())
    await self._message_queue.put(event)
    return web.Response(text="success")  # Acknowledge immediately
```

応答の期限が厳しいプラットフォーム（たとえば WeCom の5秒の上限）では、必ずその場ですぐ受領だけ返し、エージェントの返事はあとから API 経由で自分から届けてください。エージェントのセッションは3〜30分走ります。コールバックの応答の枠内で返事まで済ませるのは現実的ではありません。

### トークンのロック {#token-locks}

アダプターが固有の資格情報で接続を張り続けるなら、2つのプロフィールが同じ資格情報を使わないよう、範囲を限ったロックを足します。

```python
from gateway.status import acquire_scoped_lock, release_scoped_lock

async def connect(self, *, is_reconnect: bool = False):
    acquired, _existing = acquire_scoped_lock("newplat", self._token)
    if not acquired:
        logger.error("Token already in use by another profile")
        return False
    # ... connect

async def disconnect(self):
    release_scoped_lock("newplat", self._token)
```

## 参考実装 {#reference-implementations}

| アダプター | 型 | 難しさ | 参考になる点 |
|---------|---------|------------|-------------------|
| `bluebubbles.py` | REST + Webhook | 中 | 素直な REST API との連携 |
| `weixin.py` | ロングポーリング + CDN | 高 | メディアの扱い、暗号化 |
| `plugins/platforms/wecom/callback_adapter.py` | コールバック / Webhook | 中 | HTTP サーバー、AES の暗号化、複数アプリ |
| `plugins/platforms/irc/adapter.py` | ロングポーリング + IRC のプロトコル | 高 | 範囲を限ったトークンのロックを備えた、機能の揃ったプラグインのアダプター |
