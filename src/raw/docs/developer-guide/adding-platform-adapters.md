---
title: "developer-guide/adding-platform-adapters"
description: ""
upstream_path: developer-guide/adding-platform-adapters.md
upstream_blob: 6415baa6b1f4d9758580e4ad3646e35b1c100b23
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/adding-platform-adapters
---

# プラットフォームアダプターを追加する {#adding-a-platform-adapter}

このページでは、Hermes のゲートウェイに新しいメッセージングのプラットフォームを足す方法を説明します。プラットフォームアダプターは、Hermes を外部のメッセージングサービス（Telegram、Discord、WeCom など）につなぐもので、これがあると利用者はそのサービスからエージェントとやり取りできるようになります。

:::tip
プラットフォームを足す方法は 2 つあります。
- **プラグイン**（第三者・利用者が作る場合はこちらがおすすめ）: プラグインのディレクトリを `~/.hermes/plugins/` に置くだけで、本体のコードに一切手を入れずに済みます。下の[プラグインの経路](#plugin-path-recommended)を見てください。
- **組み込み**: コード・設定・ドキュメントにまたがる 20 以上のファイルを直します。下の[組み込みのチェックリスト](#step-by-step-checklist-built-in-path)を使ってください。
:::

## 構造の全体像 {#architecture-overview}

```
User ↔ Messaging Platform ↔ Platform Adapter ↔ Gateway Runner ↔ AIAgent
```

どのアダプターも `gateway/platforms/base.py` の `BasePlatformAdapter` を継承し、次を実装します。

- **`connect()`** — 接続を確立する（WebSocket、長めのポーリング、HTTP サーバーなど）*（実装必須）*
- **`disconnect()`** — きれいに終了する *（実装必須）*
- **`send()`** — チャットにテキストのメッセージを送る *（実装必須）*
- **`send_typing()`** — 入力中の表示を出す（任意で上書き）
- **`get_chat_info()`** — チャットの付帯情報を返す（任意で上書き）

受け取ったメッセージはアダプターが受け止め、`self.handle_message(event)` に渡します。基底クラスがそれをゲートウェイの実行役へ流します。

## プラグインの経路（おすすめ） {#plugin-path-recommended}

プラグインの仕組みを使えば、Hermes 本体のコードに手を入れずにプラットフォームアダプターを足せます。プラグインは、次の 2 つのファイルを入れたディレクトリです。

```
~/.hermes/plugins/my-platform/
  plugin.yaml      # Plugin metadata
  adapter.py       # Adapter class + register() entry point
```

### plugin.yaml {#pluginyaml}

プラグインの付帯情報です。`requires_env` と `optional_env` のまとまりは、`hermes config` の画面の項目を自動で埋めます（下の[環境変数を hermes config に出す](#surfacing-env-vars-in-hermes-config)を見てください）。

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

#### 外へ送るクライアント用のツール: `provides_tools` {#outbound-client-tools-providestools}

`kind: platform` のプラグインは**あとまわしで読み込まれます**。アダプターのモジュール（とその SDK の
import）が読み込まれるのは、ゲートウェイ・cron・`send_message` のどれかが、そのプラットフォームを
プラットフォームの登録簿に初めて問い合わせたときです。どのセッションからでもエージェントが呼べる、
外へ送る*クライアント用のツール*も一緒に配るなら（同梱の `a2a` プラグインの `a2a_call` /
`a2a_discover` など）、それらは専用の `tools.py` に `register_tools(ctx)` 関数とともに置き、
目録で宣言してください。

```yaml
provides_tools:
  - my_platform_call
  - my_platform_list
```

`provides_tools` を宣言しておくと、Hermes はプラグインを見つける段階で `tools.py` だけを読み込み、
クライアント用のツールをすべてのプロセス（CLI と TUI を含みます）に登録します。アダプターのほうは
あとまわしのままです。パッケージの `__init__.py` は軽いままにして、アダプターは `register()` の
中から引き込むようにしてください。そうすれば、先に読み込まれるほうが

あとまわしになります。

利用者は、ほかのツールセットと同じようにプラットフォームごとに有効化します。たとえば
`hermes tools enable my_platform --platform cli` と打つか、`config.yaml` の
`platform_toolsets` の下にツールセットのキーを並べます。プラグインのプラットフォーム名も
`--platform` の対象として使えるので、そのプラットフォームから入ってきたセッションに、
外へ送るツールを持たせられます。

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

環境変数で設定することもできます（アダプターが `__init__` で読みます）。

### プラグインの仕組みが自動でやってくれること {#what-the-plugin-system-handles-automatically}

`ctx.register_platform()` を呼ぶと、次のつなぎ込みは自分でやらなくても済みます。本体のコードに手を入れる必要はありません。

| つなぎ込みの箇所 | どう動くか |
|---|---|
| ゲートウェイでのアダプターの生成 | 組み込みの `_BUILTIN_ADAPTERS` の表より先に登録簿を見る |
| 設定の読み取り | `Platform._missing_()` がどんなプラットフォーム名でも受け付ける |
| つながっているプラットフォームの検査 | 登録簿の `validate_config()` が呼ばれる |
| 利用者の認可 | `allowed_users_env` と `allow_all_env` が調べられる |
| 環境変数だけでの自動有効化 | `env_enablement_fn` が `PlatformConfig.extra` と `home_channel` を用意する |
| YAML 設定の橋渡し | `apply_yaml_config_fn` が `config.yaml` のキーを環境変数や extras に置き換える |
| cron での配信 | `cron_deliver_env_var` によって `deliver=<name>` が使えるようになる |
| `hermes config` の画面の項目 | `plugin.yaml` の `requires_env` と `optional_env` が自動で反映される |
| 送信の実体（`tools/send_message_tool.py`） | 動いているゲートウェイのアダプターを通して送る |
| Webhook でのプラットフォームをまたぐ配信 | 知っているプラットフォームかどうかを登録簿で確かめる |
| `/update` コマンドの可否 | `allow_update_command` のフラグ |
| チャンネルの一覧 | プラグインのプラットフォームも数え上げに含まれる |
| システムプロンプトへの助言 | `platform_hint` が LLM の文脈に差し込まれる |
| メッセージの分割 | 賢く分けるための `max_message_length` |
| 個人情報の伏せ字 | `pii_safe` のフラグ |
| `hermes status` | プラグインのプラットフォームを `(plugin)` の印付きで表示する |
| `hermes gateway setup` | セットアップのメニューにプラグインのプラットフォームが出る |
| `hermes tools` と `hermes skills` | プラットフォームごとの設定にプラグインのものも並ぶ |
| トークンの取り合いの防止（複数プロファイル） | `connect()` の中で `acquire_scoped_lock()` を使う |
| 設定だけが残っているときの注意 | プラグインが見つからないとき、内容のわかるログを出す |

## 単独で送るときの拡張 {#standalone-send-path-extensions}

単独のプラットフォームでも、`ctx.register_platform()` が作る同じ `PlatformEntry` に送信の振る舞いを
宣言しておけば、`hermes send --to ...` の直接送信や cron の `deliver=platform:...` といった、
本体側から始まる送信に参加できます。
`send_message` は、エージェントがモデルから呼べるツールにはあえてしていません。プラグインの側で、
エージェントが自分から外へメッセージを送り始められるような同等の口を登録してはいけません。

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

送り先の解決は、外へ送る 3 つの経路で共通です。読み取り役が返した値がまず整えられ、チャンネル一覧に
ある ID はそのまま信用されます。プラグインの読み取り役は、そのプラットフォーム本来の書き方を自分で
受け付ける必要があります。解決できなかった文字列が、そのまま素通しされることはありません。知らない
プラットフォームや、検査役が弾いた場合は、黙って送ろうとせずに理由を返します。プラグインの強制読み込みや
プロファイルの切り替えでは、そのプラグインが持っていた登録が外されるので、読み取り役や処理役が次の
プロファイルへ漏れることはありません。

## 環境変数による自動設定 {#env-driven-auto-configuration}

たいていの利用者は、`config.yaml` を書き換えるのではなく、`~/.hermes/.env` に環境変数を置いてプラットフォームを用意します。`env_enablement_fn` のフックを使うと、アダプターが作られる**前に**プラグインがその環境変数を拾えるので、`hermes gateway status`、`get_connected_platforms()`、cron での配信が、プラットフォームの SDK を立ち上げずに正しい状態を見られます。

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

環境変数よりも `config.yaml` のキー（`my_platform.require_mention`、`my_platform.allowed_channels` など）で設定したい利用者もいます。`apply_yaml_config_fn` のフックを使えば、この置き換えをプラグイン側で受け持てます。本体の `gateway/config.py` に、そのプラットフォームの YAML の形を覚えさせずに済みます。

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

このフックは `load_gateway_config()` の途中、共通のキーをまとめて処理する繰り返し（`unauthorized_dm_behavior`、`notice_delivery`、`reply_prefix`、`require_mention` などのよくあるキーを扱います）のあと、`_apply_env_overrides()` の前に呼ばれます。そのため、プラグイン側で橋渡しするのは**そのプラットフォーム独自の**キーだけで済みます。

このフックの中で起きた例外は握りつぶされ、デバッグの水準でログに残ります。行儀の悪いプラグインがあっても、ゲートウェイの設定の読み込みが止まることはありません。

## cron での配信 {#cron-delivery}

`deliver=my_platform` の cron の仕事を、設定済みのホームチャンネルへ届けたいときは、既定のチャット・部屋・チャンネルの ID を持つ環境変数の名前を `cron_deliver_env_var` に指定します。

```python
ctx.register_platform(
    name="my_platform",
    ...
    cron_deliver_env_var="MY_PLATFORM_HOME_CHANNEL",
)
```

スケジューラーは、`deliver=my_platform` の仕事のホームの送り先を決めるときにこの環境変数を読みます。また、`_KNOWN_DELIVERY_PLATFORMS` の類いの検査でも、そのプラットフォームを cron の正しい送り先として扱います。`env_enablement_fn` が `home_channel` の dict を用意している場合（上を見てください）は、そちらが優先されます。`cron_deliver_env_var` は、環境変数からの用意より前に走る cron の仕事のための予備です。

### ゲートウェイの外での cron 配信 {#out-of-process-cron-delivery}

`cron_deliver_env_var` を指定すると、そのプラットフォームは `deliver=` の送り先として認識されます。さらに、cron の仕事がゲートウェイとは別のプロセスで走るとき（`hermes gateway` とは別に `hermes cron run` を動かす場合）にも実際に送信を成功させたいなら、`standalone_sender_fn` を登録します。

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

このフックが要る理由を説明します。組み込みのプラットフォーム（Telegram、Discord、Slack など）は `tools/send_message_tool.py` に REST を直接叩く補助を持っているので、ゲートウェイを同じプロセスで抱えなくても cron から配信できます。一方、プラグインのプラットフォームはこれまで `_gateway_runner_ref()` に頼っていて、これはゲートウェイのプロセスの外では `None` を返します。そのため `standalone_sender_fn` がないと、cron 側の送信は `No live adapter for platform '<name>'` で失敗します。

この関数には、動いているアダプターが受け取るのと同じ `pconfig` と `chat_id` に加えて、任意のキーワード引数 `thread_id`、`media_files`、`force_document` が渡ります。`{"success": True, "message_id": ...}` を返せば配信できたものとして扱われ、`{"error": "..."}` を返すとその文言が cron の `delivery_errors` に出ます。関数の中で起きた例外は振り分け役が受け止め、`Plugin standalone send failed: <reason>` として報告されます。参考になる実装は `plugins/platforms/{irc,teams,google_chat}/adapter.py` にあります。

## 環境変数を `hermes config` に出す {#surfacing-env-vars-in-hermes-config}

`hermes_cli/config.py` は読み込み時に `plugins/platforms/*/plugin.yaml` を走査し、`requires_env` と（任意の）`optional_env` のまとまりから `OPTIONAL_ENV_VARS` を自動で埋めます。dict の形で細かく書いておけば、説明・入力の見出し・パスワード扱いの指定・URL をそのまま渡せます。CLI のセットアップ画面がそれを拾ってくれます。

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

**使える dict のキー:** `name`（必須）、`description`、`prompt`、`url`、`password`（真偽値。省くと `*_TOKEN` / `*_SECRET` / `*_KEY` / `*_PASSWORD` / `*_JSON` の語尾から自動で判断されます）、`category`（既定は `"messaging"`）。

文字列だけを並べる書き方（`- MY_PLATFORM_TOKEN`）も使えます。その場合、説明はプラグインの `label` から自動で作られます。同じ変数が `OPTIONAL_ENV_VARS` に直接書かれていれば、そちらが優先されます（従来の動きのままです）。plugin.yaml の書き方は、その予備として働きます。

## プラットフォームごとの、応答が遅いときの見せ方 {#platform-specific-slow-llm-ux}

プラットフォームによっては、LLM の応答が遅いときの見せ方を変えざるを得ない制約があります。

- **LINE** は、受け取ったイベントからおよそ 60 秒で切れる、1 回きりの*返信用トークン*を発行します。そのトークンで返すのは無料ですが、従量課金の Push API に切り替えると費用がかかります。期限までに LLM が答え終わらないなら、「有料の Push の枠を使う」か「切れる前に返信用トークンでもっとうまいことをする」かの選択になります。
- **WhatsApp** は 24 時間でセッションを閉じ、それ以降は定型のメッセージしか受け付けません。
- **SMS** には入力中の表示も途中経過もありません。長い応答は、ただボットが落ちているように見えます。

これらは実際の制約で、基底の `BasePlatformAdapter` には先読みできません。プラグインの口は、引数を増やすことなく、アダプターが基底の入力中の表示の上にそのプラットフォームらしい見せ方を重ねられるよう、あえて余地を残してあります。

### 型: `_keep_typing` を上書きして、待っている間の見せ方を重ねる {#pattern-subclass-keeptyping-to-layer-mid-flight-ux}

`BasePlatformAdapter._keep_typing` は、入力中の表示を保つ心拍です。LLM が生成している間、裏のタスクとして走り、応答が届いた時点で打ち切られます。ある時間を過ぎたところで独自の振る舞いを重ねたいとき（たとえば 45 秒で「まだ考えています」の吹き出しを出したいとき）は、アダプターで `_keep_typing` を上書きし、`super()._keep_typing()` と並べて自分のタスクを走らせ、`finally` で片付けます。

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

要点は次のとおりです。

- **必ず `await super()._keep_typing(...)` を呼ぶ。** 入力中の表示それ自体に価値があります。置き換えるのではなく、上に重ねてください。
- **`finally` で自分のタスクを片付ける。** LLM が答え終わると（あるいは `/stop` で打ち切られると）、ゲートウェイは入力中の表示のタスクを止めます。自分のタスクもその打ち切りを受け取らなければ、居残って、応答が届いたあとに動き出しかねません。
- **`interrupt_session_activity` と組み合わせる。** 利用者が `/stop` を打ったとき、宙に浮いた表示の状態を片付けるためです。LINE の場合は、あとから応答を取り出す控えの項目を `PENDING` から `ERROR` に移して、残った「Get answer」のボタンが堂々巡りせずに「実行は中断されました」と返すようにします。

### 型: `send` を上書きして、すぐ送らずに控えに回す {#pattern-subclass-send-to-route-through-a-cache-instead-of-sending-immediately}

応答が遅いときの見せ方として、答えをいったん控えに置いてあとから取り出す形（LINE のポストバックの流れ）にするなら、上書きした `send` は 3 つの場合を見分ける必要があります。

1. **そのチャットでポストバックの待ちがある** → 応答を request_id のもとに控えておき、画面には何も出さない。
2. **取り込み中の返事**（`⚡ Interrupting`、`⏳ Queued`、`⏩ Steered`） → 控えを通さず、そのまま送って見せる。利用者が自分の入力に対するゲートウェイの反応を確かめられるようにするためです。
3. **ふつうの応答** → これまでどおり、返信用トークンか Push で送る。

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

`_SYSTEM_BYPASS_PREFIXES` は、ゲートウェイ自身が取り込み中を知らせるときに付ける印です（`⚡`、`⏳`、`⏩`、`💾`）。控えの状態がどうであれ、これらは必ずそのまま見せてください。

### この型が向いている場面 {#when-this-pattern-is-appropriate}

入力中の表示を上書きするやり方が向いているのは、次の両方に当てはまるときです。

- そのプラットフォームの送信の API に、動かしがたい時間の制約がある（1 回きりの返信用トークン、期限のあるセッションなど）
- なおかつ、待っている間に*目に見える吹き出し*を出すことが、そのプラットフォームで受け入れられる

もっと単純な `slow_response_threshold = 0`（常に Push）の経路が向いているのは、次のどちらかのときです。

- そのプラットフォームに、無料と有料の意味のある区別がない
- あるいは、利用者たちが途中の吹き出しよりも「読み込み中…読み込み中…完了」の、黙って待って答えが来る形を好む

LINE はどちらにも対応しています。無料のポストバックで取り出す既定の目安は 45 秒で、`LINE_SLOW_RESPONSE_THRESHOLD=0` にすると「常に Push に切り替える」動きに戻ります。

### 参考になる実装 {#reference-implementation}

LINE のポストバックの実装は `plugins/platforms/line/adapter.py` に全部あります。`RequestCache` の状態遷移（`PENDING → READY → DELIVERED`。`/stop` のときの `ERROR` も含みます）、目安の時間で Template Buttons の吹き出しを出す `_keep_typing` の上書き、控えを経由させる `send` の上書き、宙に浮いた PENDING の項目を片付ける `interrupt_session_activity` の上書きが揃っています。

### 参考になる実装（プラグインの経路） {#reference-implementations-plugin-path}

まるごと動く例としては、リポジトリの `plugins/platforms/irc/` を見てください。外部の依存が一切ない、非同期の IRC アダプター一式です。`plugins/platforms/teams/` は Bot Framework と Adaptive Cards、`plugins/platforms/google_chat/` は OAuth を使う REST の API、`plugins/platforms/line/` は Webhook で動く Messaging API と、そのプラットフォームらしい応答が遅いときの見せ方を扱っています。

---

## 手順のチェックリスト（組み込みの経路） {#step-by-step-checklist-built-in-path}

:::note
このチェックリストは、Hermes 本体のコードに直接プラットフォームを足す場合のものです。ふつうは、正式に対応するプラットフォームを本体の開発者が足すときに使います。第三者や利用者が作るプラットフォームは、上の[プラグインの経路](#plugin-path-recommended)を使ってください。
:::

### 1. Platform の列挙 {#1-platform-enum}

`gateway/config.py` の `Platform` の列挙に、そのプラットフォームを足します。

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

受け取ったメッセージについては、`MessageEvent` を組み立てて `self.handle_message(event)` を呼びます。

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

手を入れる箇所は 3 つです。

1. **`get_connected_platforms()`** — そのプラットフォームに必要な資格情報の検査を足す
2. **`load_gateway_config()`** — トークンの環境変数の対応を足す: `Platform.NEWPLAT: "NEWPLAT_TOKEN"`
3. **`_apply_env_overrides()`** — `NEWPLAT_*` の環境変数をすべて設定に対応づける

### 4. ゲートウェイの実行役（`gateway/run.py` と隣の `gateway/run_*.py`） {#4-gateway-runner-gatewayrunpy-gatewayrunpy-siblings}

手を入れる箇所は 6 つです。

1. **`_BUILTIN_ADAPTERS` の表**（`gateway/run.py`） — `Platform.NEWPLAT: (module, class, check_fn, error_msg)` の項目を足します。`_instantiate_adapter()`（`gateway/run_adapters.py`）は、プラグインの登録簿を見てからこの表を見ます。伸ばしていく `elif` の連なりはありません。`_create_adapter()` の包み役が、作れたアダプターをそれぞれのゲートウェイの実行役に結び付けます。
2. **`_is_user_authorized()` の allowed_users の対応** — `Platform.NEWPLAT: "NEWPLAT_ALLOWED_USERS"`
3. **`_is_user_authorized()` の allow_all の対応** — `Platform.NEWPLAT: "NEWPLAT_ALLOW_ALL_USERS"`
4. **起動時のアクセス方針の検査**（`gateway/run_startup.py`） — `_ALLOWLIST_ENV_PLATFORMS` に `"NEWPLAT"` を足します（これで `NEWPLAT_ALLOWED_USERS` と `NEWPLAT_ALLOW_ALL_USERS` の両方が導かれます）
5. **起動時の `_BUILTIN_ALLOW_ALL_VARS`**（`gateway/run_startup.py`） — 同じ `_ALLOWLIST_ENV_PLATFORMS` の組から導かれます。足すものはありません
6. **`_UPDATE_ALLOWED_PLATFORMS` の frozenset** — `Platform.NEWPLAT` を足します

### 5. プラットフォームをまたぐ配信 {#5-cross-platform-delivery}

1. **`gateway/platforms/webhook.py`** — 配信の種類の組に `"newplat"` を足す
2. **`cron/scheduler_delivery.py`** — `_KNOWN_DELIVERY_PLATFORMS` の frozenset と `_deliver_result()` の対応表に足す

### 6. CLI とのつなぎ込み {#6-cli-integration}

1. **`hermes_cli/config.py`** — `NEWPLAT_*` の変数をすべて `_EXTRA_ENV_KEYS` に足す
2. **`hermes_cli/gateway.py`** — key、label、emoji、token_var、setup_instructions、vars を持つ項目を `_PLATFORMS` の一覧に足す
3. **`hermes_cli/platforms.py`** — label と default_toolset を持つ `PlatformInfo` の項目を足す（`skills_config` と `tools_config` の画面が使います）
4. **`hermes_cli/setup.py`** — `_setup_newplat()` の関数を足し（`gateway.py` に任せてもかまいません）、メッセージングのプラットフォームの一覧に組を足す
5. **`hermes_cli/status.py`** — プラットフォームの検出の項目を足す: `"NewPlat": ("NEWPLAT_TOKEN", "NEWPLAT_HOME_CHANNEL")`
6. **`hermes_cli/dump.py`** — プラットフォームの検出の dict に `"newplat": "NEWPLAT_TOKEN"` を足す

### 7. ツール {#7-tools}

1. **`tools/send_message_tool.py`** — プラットフォームの対応表に `"newplat": Platform.NEWPLAT` を足す
2. **`tools/cronjob_tools.py`** — 配信先の説明文に `newplat` を足す

### 8. ツールセット {#8-toolsets}

1. **`toolsets.py`** — `_HERMES_CORE_TOOLS` を含む `"hermes-newplat"` のツールセットの定義を足す
2. **`toolsets.py`** — `"hermes-gateway"` の includes の一覧に `"hermes-newplat"` を足す

### 9. 任意: プラットフォームへの助言 {#9-optional-platform-hints}

**`agent/prompt_builder.py`** — そのプラットフォームに表示の制約がある（マークダウンが使えない、メッセージの長さに上限があるなど）なら、`PLATFORM_HINTS` の dict に項目を足します。これで、そのプラットフォーム向けの案内がシステムプロンプトに差し込まれます。

```python
PLATFORM_HINTS = {
    # ...
    "newplat": (
        "You are chatting via NewPlat. It supports markdown formatting "
        "but has a 4000-character message limit."
    ),
}
```

助言がすべてのプラットフォームに要るわけではありません。エージェントの振る舞いを変えるべきときにだけ足してください。

### 10. テスト {#10-tests}

`tests/gateway/test_newplat.py` を作り、次を確かめます。

- 設定からアダプターを作れること
- メッセージのイベントを組み立てられること
- 送信のメソッド（外部の API は模擬に置き換えます）
- そのプラットフォーム独自の機能（暗号化、振り分けなど）

### 11. ドキュメント {#11-documentation}

| ファイル | 足すもの |
|------|-------------|
| `website/docs/user-guide/messaging/newplat.md` | そのプラットフォームの設定手順のページ一式 |
| `website/docs/user-guide/messaging/index.md` | プラットフォームの比較表、構成図、ツールセットの表、安全に関する節、次に読むページへのリンク |
| `website/docs/reference/environment-variables.md` | NEWPLAT_* の環境変数すべて |
| `website/docs/reference/toolsets-reference.md` | hermes-newplat のツールセット |
| `website/docs/integrations/index.md` | プラットフォームへのリンク |
| `website/sidebars.ts` | そのページへの目次の項目 |
| `website/docs/developer-guide/architecture.md` | アダプターの数と並び |
| `website/docs/developer-guide/gateway-internals.md` | アダプターのファイルの並び |

## 抜け漏れの点検 {#parity-audit}

新しいプラットフォームの PR を仕上げる前に、すでにあるプラットフォームと突き合わせて抜けを探します。

```bash
# Find every .py file mentioning the reference platform
search_files "bluebubbles" output_mode="files_only" file_glob="*.py"

# Find every .py file mentioning the new platform
search_files "newplat" output_mode="files_only" file_glob="*.py"

# Any file in the first set but not the second is a potential gap
```

`.md` と `.ts` のファイルでも同じことをします。見つかった差はひとつずつ確かめてください。プラットフォームを数え上げている箇所（直す必要があります）なのか、そのプラットフォーム固有の記述（そのままでかまいません）なのか、という見分けです。

## よくある型 {#common-patterns}

### 長めのポーリングを使うアダプター {#long-poll-adapters}

Telegram や Weixin のように長めのポーリングを使うなら、ポーリングの繰り返しをタスクにします。

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

WeCom のコールバックのように、プラットフォーム側からこちらのエンドポイントへメッセージが送られてくるなら、HTTP サーバーを動かします。

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

応答の期限が厳しいプラットフォーム（たとえば WeCom の 5 秒）では、必ずその場で受領だけを返し、エージェントの返事はあとから API を使ってこちらから届けます。エージェントのセッションは 3〜30 分かかるので、コールバックの応答の枠の中でそのまま返すのは無理があります。

### トークンの取り合いを防ぐ錠 {#token-locks}

そのアダプターが、ひとつしかない資格情報で接続を張り続けるなら、2 つのプロファイルが同じ資格情報を使ってしまわないよう、範囲を区切った錠を足します。

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

## 参考になる実装 {#reference-implementations}

| アダプター | 型 | 込み入り具合 | 参考になるところ |
|---------|---------|------------|-------------------|
| `bluebubbles.py` | REST + Webhook | 中 | 単純な REST API との連携 |
| `weixin.py` | 長めのポーリング + CDN | 高 | メディアの扱い、暗号化 |
| `plugins/platforms/wecom/callback_adapter.py` | コールバック / Webhook | 中 | HTTP サーバー、AES の暗号、複数アプリ |
| `plugins/platforms/irc/adapter.py` | 長めのポーリング + IRC の規約 | 高 | 範囲を区切ったトークンの錠を持つ、機能の揃ったプラグインのアダプター |
