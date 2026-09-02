---
title: "プラットフォームアダプタを追加する"
description: ""
upstream_path: developer-guide/adding-platform-adapters.md
upstream_blob: 9572c684a56fbee3985ee32c35d4584835197516
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/adding-platform-adapters
---

# プラットフォームアダプタを追加する {#adding-a-platform-adapter}

このページでは、Hermes のゲートウェイに新しいメッセージングのプラットフォームを足す方法を説明します。プラットフォームアダプタは Hermes を外部のメッセージングサービス（Telegram、Discord、WeCom など）につなぐもので、これがあると利用者はそのサービスからエージェントとやり取りできます。

:::tip
プラットフォームを足す方法は2つあります。
- **プラグイン**（第三者や利用者コミュニティにはこちらがおすすめ）: `~/.hermes/plugins/` にプラグインのディレクトリを置くだけです。コア側の書き換えはいりません。下の [プラグインで足す](#plugin-path-recommended) を見てください。
- **組み込み**: コード、設定、ドキュメントにまたがる20以上のファイルに手を入れます。下の [組み込みで足すときの手順表](#step-by-step-checklist-built-in-path) を使ってください。
:::

## 全体の構造 {#architecture-overview}

```
User ↔ Messaging Platform ↔ Platform Adapter ↔ Gateway Runner ↔ AIAgent
```

どのアダプタも `gateway/platforms/base.py` の `BasePlatformAdapter` を継承し、次のものを実装します。

- **`connect()`** — 接続を確立します（WebSocket、ロングポーリング、HTTP サーバーなど）*（必須）*
- **`disconnect()`** — きれいに切断します *（必須）*
- **`send()`** — チャットへテキストのメッセージを送ります *（必須）*
- **`send_typing()`** — 入力中の表示を出します（任意で差し替え）
- **`get_chat_info()`** — チャットの情報を返します（任意で差し替え）

受け取ったメッセージはアダプタが受け止め、`self.handle_message(event)` に渡します。そこから先は基底クラスがゲートウェイのランナーへ流してくれます。

## プラグインで足す（おすすめ） {#plugin-path-recommended}

プラグインの仕組みを使えば、Hermes のコードに一切触れずにプラットフォームアダプタを足せます。プラグインは、ファイル2つが入ったディレクトリです。

```
~/.hermes/plugins/my-platform/
  plugin.yaml      # Plugin metadata
  adapter.py       # Adapter class + register() entry point
```

### plugin.yaml {#pluginyaml}

プラグインの情報を書きます。`requires_env` と `optional_env` の欄は `hermes config` の入力項目を自動で埋めてくれます（下の [環境変数を設定画面に出す](#surfacing-env-vars-in-hermes-config) を見てください）。

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

`kind: platform` のプラグインは**あとまわしで読み込まれます**。アダプタのモジュール（とその
SDK の読み込み）は、ゲートウェイや cron、`send_message` の経路が
プラットフォームの登録簿にそのプラットフォームを尋ねた時点で初めて読み込まれます。
どのセッションからでもエージェントが呼べる送信側の*クライアントツール*も一緒に配りたい場合は
（同梱の `a2a` プラグインの `a2a_call` や `a2a_discover` などがそれにあたります）、
それらを専用の `tools.py` に置いて `register_tools(ctx)` 関数を用意し、マニフェストに宣言します。

```yaml
provides_tools:
  - my_platform_call
  - my_platform_list
```

`provides_tools` を宣言しておくと、Hermes はプラグインを探す段階で `tools.py` だけを
読み込み、クライアントツールをすべてのプロセス（CLI と TUI を含む）に登録します。
アダプタのほうはあとまわしのままです。パッケージの `__init__.py` は読み込みを軽く保ち、
アダプタは `register()` の中から引き込んでください。そうすれば先読みされる側も

あとまわしのままです。

ツール群を有効にする手順はほかと同じで、プラットフォームごとに指定します。たとえば
`hermes tools enable my_platform --platform cli` を実行するか、`config.yaml` の
`platform_toolsets` の下にツール群のキーを並べます。プラグインのプラットフォーム名も
`--platform` の指定先として使えるので、そのプラットフォームから始まったセッションに
送信用のツールを持たせることもできます。

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

環境変数でもかまいません（アダプタが `__init__` の中で読みます）。

### プラグインの仕組みが自動でやってくれること {#what-the-plugin-system-handles-automatically}

`ctx.register_platform()` を呼ぶと、次のつなぎ込みは自動で済みます。コア側の書き換えはいりません。

| つなぎ込む場所 | 仕組み |
|---|---|
| ゲートウェイでのアダプタの生成 | 組み込みの if / elif の並びより先に登録簿を見ます |
| 設定の読み取り | `Platform._missing_()` がどんなプラットフォーム名でも受け付けます |
| つながっているプラットフォームの検証 | 登録簿の `validate_config()` が呼ばれます |
| 利用者の認可 | `allowed_users_env` と `allow_all_env` を見ます |
| 環境変数だけでの自動有効化 | `env_enablement_fn` が `PlatformConfig.extra` と `home_channel` を埋めます |
| YAML の設定との橋渡し | `apply_yaml_config_fn` が `config.yaml` のキーを環境変数や extras へ移します |
| cron からの配信 | `cron_deliver_env_var` があれば `deliver=<name>` が使えます |
| `hermes config` の入力項目 | `plugin.yaml` の `requires_env` と `optional_env` から自動で埋まります |
| 送信の仕組み（`tools/send_message_tool.py`） | 動いているゲートウェイのアダプタ経由で送ります |
| Webhook からのプラットフォームをまたぐ配信 | 既知のプラットフォームとして登録簿が参照されます |
| `/update` コマンドの許可 | `allow_update_command` のフラグ |
| チャンネルの一覧 | プラグインのプラットフォームも列挙に含まれます |
| システムプロンプトへの補足 | `platform_hint` が LLM の文脈に差し込まれます |
| メッセージの分割 | `max_message_length` を見て賢く分けます |
| 個人情報の伏せ字 | `pii_safe` のフラグ |
| `hermes status` | プラグインのプラットフォームを `(plugin)` の印付きで表示します |
| `hermes gateway setup` | 設定のメニューにプラグインのプラットフォームが並びます |
| `hermes tools` と `hermes skills` | プラットフォームごとの設定にプラグインのものが出ます |
| トークンのロック（プロファイルが複数のとき） | 自分の `connect()` の中で `acquire_scoped_lock()` を使ってください |
| 取り残された設定への警告 | プラグインが見つからないときに分かりやすいログを出します |

## 単独で動く送信の口を足す {#standalone-send-path-extensions}

単独で動くプラットフォームでも、`ctx.register_platform()` が作る同じ `PlatformEntry` に
送信の振る舞いを宣言しておけば、`hermes send --to ...` の直接送信や cron の
`deliver=platform:...` といった、ホスト側から始まる送信に参加できます。
`send_message` は意図的にエージェントが呼べるモデル用のツールにはしていません。
エージェントが自分から送信を始められるような同等の口をプラグインが登録してはいけません。

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

宛先の解決は、送信の3つの口すべてで共通です。まず解析の結果がそろえられ、チャンネル一覧に
ある ID はそのまま信頼されます。プラグイン側の解析は、そのプラットフォーム独自の書き方を
自分ではっきり受け入れる必要があります。解決できなかった文字列が中身を見ないまま素通りする
ことはありません。知らないプラットフォームや検証に落ちた場合は、黙って送ろうとするのではなく
理由を返します。プラグインを読み込み直したときやプロファイルを切り替えたときは、そのプラグインが
持っていた登録が外れるので、解析や処理の関数が次のプロファイルへ漏れることもありません。

## 環境変数からの自動設定 {#env-driven-auto-configuration}

多くの利用者は、`config.yaml` を書き換えるのではなく `~/.hermes/.env` に環境変数を置いてプラットフォームを設定します。`env_enablement_fn` というフックを使うと、アダプタが作られる**前**にプラグインがその環境変数を拾えます。おかげで `hermes gateway status`、`get_connected_platforms()`、cron からの配信は、プラットフォームの SDK を読み込まなくても正しい状態を見られます。

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

環境変数よりも `config.yaml` のキー（`my_platform.require_mention`、`my_platform.allowed_channels` など）で設定したい利用者もいます。`apply_yaml_config_fn` というフックを使うと、この読み替えをプラグイン側で受け持てます。コアの `gateway/config.py` に自分のプラットフォームの YAML の形を教え込まずに済みます。

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

このフックが呼ばれるのは `load_gateway_config()` の途中で、共通のキーをまとめて処理する部分（`unauthorized_dm_behavior`、`notice_delivery`、`reply_prefix`、`require_mention` などを扱います）の後、`_apply_env_overrides()` の前です。つまりプラグインが橋渡しするのは**そのプラットフォーム固有**のキーだけで済みます。

このフックが投げた例外は握りつぶされ、デバッグの記録に残るだけです。行儀の悪いプラグインがあっても、ゲートウェイの設定の読み込みが止まることはありません。

## cron からの配信 {#cron-delivery}

`deliver=my_platform` と書いた cron ジョブを、設定してあるホームチャンネルへ届けたい場合は、既定のチャット・ルーム・チャンネルの ID が入っている環境変数の名前を `cron_deliver_env_var` に指定します。

```python
ctx.register_platform(
    name="my_platform",
    ...
    cron_deliver_env_var="MY_PLATFORM_HOME_CHANNEL",
)
```

スケジューラは `deliver=my_platform` のジョブでホームの宛先を決めるときにこの環境変数を読み、`_KNOWN_DELIVERY_PLATFORMS` に類する確認でも、そのプラットフォームを正しい宛先として扱います。`env_enablement_fn` が `home_channel` の辞書を用意している場合（前述）はそちらが優先されます。`cron_deliver_env_var` は、環境変数からの設定が入る前に走る cron ジョブのための受け皿です。

### ゲートウェイとは別のプロセスからの cron 配信 {#out-of-process-cron-delivery}

`cron_deliver_env_var` を指定すると、そのプラットフォームは `deliver=` の宛先として認識されます。さらに、cron のジョブがゲートウェイとは別のプロセスで動く場合（`hermes gateway` とは別に `hermes cron run` を回す場合）にも実際の送信を成功させるには、`standalone_sender_fn` を登録します。

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

このフックが要る理由は次のとおりです。組み込みのプラットフォーム（Telegram、Discord、Slack など）は `tools/send_message_tool.py` に REST を直接叩く補助を持っているので、ゲートウェイを同じプロセスに抱えていなくても cron から配信できます。プラグインのプラットフォームはこれまで `_gateway_runner_ref()` に頼っていて、これはゲートウェイのプロセスの外では `None` を返します。そのため `standalone_sender_fn` がないと、cron 側の送信は `No live adapter for platform '<name>'` で失敗します。

この関数には、動いているアダプタが受け取るのと同じ `pconfig` と `chat_id` に加えて、任意のキーワード引数として `thread_id`、`media_files`、`force_document` が渡されます。`{"success": True, "message_id": ...}` を返せば配信できたものとして扱われ、`{"error": "..."}` を返すとその文言が cron の `delivery_errors` に現れます。関数の中で投げた例外は呼び出し側が受け止め、`Plugin standalone send failed: <reason>` として報告します。実装の見本は `plugins/platforms/{irc,teams,google_chat}/adapter.py` にあります。

## `hermes config` に環境変数を出す {#surfacing-env-vars-in-hermes-config}

`hermes_cli/config.py` は読み込みの時点で `plugins/platforms/*/plugin.yaml` を走査し、`requires_env` と（あれば）`optional_env` の欄から `OPTIONAL_ENV_VARS` を自動で埋めます。辞書の形で書けば、説明文、入力を促す文言、伏せ字にするかどうか、URL まで渡せます。CLI の設定画面はそれをそのまま使ってくれます。

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

**辞書で使えるキー:** `name`（必須）、`description`、`prompt`、`url`、`password`（真偽値。省くと `*_TOKEN` / `*_SECRET` / `*_KEY` / `*_PASSWORD` / `*_JSON` という末尾から自動で判定します）、`category`（既定は `"messaging"`）。

文字列だけを書く形（`- MY_PLATFORM_TOKEN`）も使えます。その場合はプラグインの `label` から一般的な説明が自動で作られます。同じ変数が `OPTIONAL_ENV_VARS` に直接書かれている場合はそちらが勝ち（従来との互換のため）、plugin.yaml の内容は受け皿になります。

## LLM が遅いときの、プラットフォームごとの見せ方 {#platform-specific-slow-llm-ux}

プラットフォームによっては、LLM の応答が遅いときの見せ方を変えなければならない制約があります。

- **LINE** はメッセージを受け取ってからおよそ60秒で切れる、1回だけ使える*返信用トークン*を発行します。このトークンでの返信は無料ですが、代わりに従量課金の Push API を使うと有料です。締め切りまでに LLM が終わらなければ、「有料の Push の枠を使う」か「切れる前に返信用トークンをもっとうまく使う」かの選択になります。
- **WhatsApp** は24時間で会話を非活性にし、それ以降はテンプレートのメッセージしか受け付けません。
- **SMS** には入力中の表示も、途中経過の更新もありません。応答が長いと、ボットが落ちているようにしか見えません。

これらは実在する制約で、基底の `BasePlatformAdapter` の側からは見通せません。プラグインの口は、引数を増やすことなく、基本の入力中表示のループの上にプラットフォームごとの見せ方を重ねられるよう、あえて余地を残してあります。

### 手法: `_keep_typing` を継承して途中の見せ方を重ねる {#pattern-subclass-keeptyping-to-layer-mid-flight-ux}

`BasePlatformAdapter._keep_typing` は入力中の表示を出し続ける心拍のような処理で、LLM が生成しているあいだ背景の処理として動き、応答を届けた時点で打ち切られます。ある時間を超えたときにプラットフォーム固有の動きを足したい場合（たとえば45秒で「まだ考えています」の吹き出しを出す場合）は、自分のアダプタで `_keep_typing` を差し替え、`super()._keep_typing()` と並べて自前の処理を走らせ、`finally` で片付けます。

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

大事なところは次の3つです。

- **必ず `await super()._keep_typing(...)` を呼んでください。** 入力中の表示はそれ自体が役に立ちます。置き換えるのではなく、その上に重ねます。
- **自前の処理は `finally` で片付けてください。** LLM が終わったとき（あるいは `/stop` で打ち切られたとき）、ゲートウェイは入力中の表示の処理を止めます。自前の処理もその打ち切りを受け取らないと居残ってしまい、応答をすでに届けた後で動いてしまうことがあります。
- **`interrupt_session_activity` と組み合わせてください。** 利用者が `/stop` を打ったときに、取り残された表示の状態を片付けるためです。LINE の場合は、キャッシュの項目を `PENDING` から `ERROR` に移し、残っている「Get answer」のボタンが堂々巡りにならず「実行は中断されました」と返すようにします。

### 手法: `send` を継承して、すぐ送らずキャッシュを通す {#pattern-subclass-send-to-route-through-a-cache-instead-of-sending-immediately}

遅い応答の見せ方として、応答をいったん貯めておいて後から取り出させる場合（LINE のポストバックの流れ）、差し替えた `send` は次の3つを見分ける必要があります。

1. **そのチャットで待機中のポストバックがある** → 応答を request_id のもとに貯め、目に見えるものは何も送りません。
2. **仕組み側の受付の合図**（`⚡ Interrupting`、`⏳ Queued`、`⏩ Steered`）→ キャッシュを通さずそのまま送り、自分の入力にゲートウェイが反応したことが利用者に見えるようにします。
3. **通常の応答** → いつもどおり返信用トークンか Push で送ります。

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

`_SYSTEM_BYPASS_PREFIXES` は、ゲートウェイ自身が受付の合図に使う接頭辞です（`⚡`、`⏳`、`⏩`、`💾`）。貯めておく仕組みの状態がどうであれ、これらは必ず目に見える形で通してください。

### この手法が向いている場面 {#when-this-pattern-is-appropriate}

入力中の表示を差し替えるやり方が向いているのは、次の両方が当てはまるときです。

- そのプラットフォームの送信の口に、動かせない時間の制限がある（1回だけ使える返信用トークン、期限切れのある会話など）。かつ
- 途中で*目に見える吹き出し*が出ても、そのプラットフォームの作法として受け入れられる。

もっと単純な `slow_response_threshold = 0`（つねに Push）でよいのは、次のどちらかのときです。

- そのプラットフォームに、無料と有料の意味のある区別がない。あるいは
- 途中で吹き出しを挟むより、黙って待って一度に返すほうを利用者が好む。

LINE はどちらにも対応しています。無料でポストバックから取り出す前提で既定は45秒、`LINE_SLOW_RESPONSE_THRESHOLD=0` にすると「つねに Push で返す」に戻ります。

### 実装の見本 {#reference-implementation}

LINE のポストバックの実装の全体は `plugins/platforms/line/adapter.py` にあります。`RequestCache` という状態遷移（`PENDING → READY → DELIVERED` と、`/stop` 用の `ERROR`）、時間を超えたときにテンプレートのボタンの吹き出しを出す `_keep_typing` の差し替え、キャッシュを通す `send` の差し替え、取り残された PENDING の項目を片付ける `interrupt_session_activity` の差し替えが入っています。

### 実装の見本（プラグインで足す場合） {#reference-implementations-plugin-path}

丸ごと動く例としては、リポジトリの `plugins/platforms/irc/` を見てください。外部の依存が一切ない、非同期の IRC アダプタ一式です。`plugins/platforms/teams/` は Bot Framework と Adaptive Cards、`plugins/platforms/google_chat/` は OAuth を使う REST API、`plugins/platforms/line/` は Webhook で受ける Messaging API と、LLM が遅いときの独自の見せ方を扱っています。

---

## 手順表（組み込みで足す場合） {#step-by-step-checklist-built-in-path}

:::note
この手順表は、Hermes のコア側に直接プラットフォームを足す場合のものです。公式に対応するプラットフォームを、コアの開発者が足すときに使います。第三者や利用者コミュニティのプラットフォームは、上の [プラグインで足す](#plugin-path-recommended) を使ってください。
:::

### 1. Platform の列挙 {#1-platform-enum}

`gateway/config.py` の `Platform` の列挙に自分のプラットフォームを足します。

```python
class Platform(Enum):
    # ... existing platforms ...
    NEWPLAT = "newplat"
```

### 2. アダプタのファイル {#2-adapter-file}

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

手を入れるのは3か所です。

1. **`get_connected_platforms()`** — 自分のプラットフォームに必要な資格情報の確認を足します
2. **`load_gateway_config()`** — トークンの環境変数の対応を足します: `Platform.NEWPLAT: "NEWPLAT_TOKEN"`
3. **`_apply_env_overrides()`** — `NEWPLAT_*` の環境変数をすべて設定へ対応づけます

### 4. ゲートウェイのランナー（`gateway/run.py`） {#4-gateway-runner-gatewayrunpy}

手を入れるのは6か所です。

1. **`_instantiate_adapter()`** — `elif platform == Platform.NEWPLAT:` の分岐を足します。うまく作れたアダプタは `_create_adapter()` の側でゲートウェイのランナーに結び付けられます。
2. **`_is_user_authorized()` の allowed_users の対応表** — `Platform.NEWPLAT: "NEWPLAT_ALLOWED_USERS"`
3. **`_is_user_authorized()` の allow_all の対応表** — `Platform.NEWPLAT: "NEWPLAT_ALLOW_ALL_USERS"`
4. **起動時の環境変数の確認の `_any_allowlist`** — `"NEWPLAT_ALLOWED_USERS"` を足します
5. **起動時の環境変数の確認の `_allow_all`** — `"NEWPLAT_ALLOW_ALL_USERS"` を足します
6. **`_UPDATE_ALLOWED_PLATFORMS`** — `Platform.NEWPLAT` を足します

### 5. プラットフォームをまたぐ配信 {#5-cross-platform-delivery}

1. **`gateway/platforms/webhook.py`** — 配信の種類の並びに `"newplat"` を足します
2. **`cron/scheduler.py`** — `_KNOWN_DELIVERY_PLATFORMS` と `_deliver_result()` の対応表に足します

### 6. CLI とのつなぎ込み {#6-cli-integration}

1. **`hermes_cli/config.py`** — `NEWPLAT_*` の変数をすべて `_EXTRA_ENV_KEYS` に足します
2. **`hermes_cli/gateway.py`** — `_PLATFORMS` の一覧に、key、label、emoji、token_var、setup_instructions、vars を書いた項目を足します
3. **`hermes_cli/platforms.py`** — label と default_toolset を書いた `PlatformInfo` の項目を足します（`skills_config` と `tools_config` の画面が使います）
4. **`hermes_cli/setup.py`** — `_setup_newplat()` 関数を足し（中身は `gateway.py` に任せてもかまいません）、メッセージングのプラットフォームの一覧にも足します
5. **`hermes_cli/status.py`** — 検出のための項目を足します: `"NewPlat": ("NEWPLAT_TOKEN", "NEWPLAT_HOME_CHANNEL")`
6. **`hermes_cli/dump.py`** — 検出用の辞書に `"newplat": "NEWPLAT_TOKEN"` を足します

### 7. ツール {#7-tools}

1. **`tools/send_message_tool.py`** — プラットフォームの対応表に `"newplat": Platform.NEWPLAT` を足します
2. **`tools/cronjob_tools.py`** — 配信先の説明文に `newplat` を足します

### 8. ツール群 {#8-toolsets}

1. **`toolsets.py`** — `_HERMES_CORE_TOOLS` を使って `"hermes-newplat"` のツール群を定義します
2. **`toolsets.py`** — `"hermes-gateway"` の includes に `"hermes-newplat"` を足します

### 9. 任意: プラットフォームごとの補足 {#9-optional-platform-hints}

**`agent/prompt_builder.py`** — 表示のうえで固有の制限がある場合（マークダウンが使えない、メッセージの長さに上限があるなど）は、`PLATFORM_HINTS` の辞書に項目を足します。これによりシステムプロンプトへプラットフォームごとの補足が差し込まれます。

```python
PLATFORM_HINTS = {
    # ...
    "newplat": (
        "You are chatting via NewPlat. It supports markdown formatting "
        "but has a 4000-character message limit."
    ),
}
```

すべてのプラットフォームに補足が要るわけではありません。エージェントの振る舞いを変えるべきときにだけ足してください。

### 10. テスト {#10-tests}

`tests/gateway/test_newplat.py` を作り、次を確かめます。

- 設定からアダプタを組み立てられること
- メッセージのイベントを組み立てられること
- 送信のメソッド（外部の API はモックにします）
- そのプラットフォーム固有の機能（暗号化、振り分けなど）

### 11. ドキュメント {#11-documentation}

| ファイル | 足すもの |
|------|-------------|
| `website/docs/user-guide/messaging/newplat.md` | そのプラットフォームの設定方法のページ一式 |
| `website/docs/user-guide/messaging/index.md` | プラットフォームの比較表、構成図、ツール群の表、安全性の節、次に読むページへのリンク |
| `website/docs/reference/environment-variables.md` | NEWPLAT_* の環境変数すべて |
| `website/docs/reference/toolsets-reference.md` | hermes-newplat のツール群 |
| `website/docs/integrations/index.md` | プラットフォームへのリンク |
| `website/sidebars.ts` | ドキュメントのページへのサイドバーの項目 |
| `website/docs/developer-guide/architecture.md` | アダプタの数と一覧 |
| `website/docs/developer-guide/gateway-internals.md` | アダプタのファイルの一覧 |

## 抜けの点検 {#parity-audit}

新しいプラットフォームの PR を仕上げる前に、すでにあるプラットフォームと見比べて抜けがないかを点検します。

```bash
# Find every .py file mentioning the reference platform
search_files "bluebubbles" output_mode="files_only" file_glob="*.py"

# Find every .py file mentioning the new platform
search_files "newplat" output_mode="files_only" file_glob="*.py"

# Any file in the first set but not the second is a potential gap
```

`.md` と `.ts` のファイルについても同じことをします。差が出たファイルは1つずつ確かめてください。プラットフォームを列挙している場所（足す必要があります）なのか、そのプラットフォーム固有の記述（足さなくてよい）なのか、という見分けです。

## よくある形 {#common-patterns}

### ロングポーリングのアダプタ {#long-poll-adapters}

Telegram や Weixin のようにロングポーリングを使う場合は、ポーリングのループを走らせます。

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

### コールバックや Webhook のアダプタ {#callbackwebhook-adapters}

WeCom のコールバックのように、プラットフォーム側からこちらのエンドポイントへ送ってくる場合は、HTTP のサーバーを動かします。

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

応答までの猶予が短いプラットフォーム（たとえば WeCom の5秒）では、必ずその場で受領だけを返し、エージェントの返事は後から API で送ってください。エージェントの処理は3〜30分かかります。コールバックの応答の中で返すのは現実的ではありません。

### トークンのロック {#token-locks}

アダプタが1つしかない資格情報でつなぎっぱなしにする場合は、2つのプロファイルが同じ資格情報を使わないようロックを取ります。

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

## 実装の見本 {#reference-implementations}

| アダプタ | 形 | 手間 | 参考になる点 |
|---------|---------|------------|-------------------|
| `bluebubbles.py` | REST と Webhook | 中 | 単純な REST API とのつなぎ込み |
| `weixin.py` | ロングポーリングと CDN | 高 | 添付の扱い、暗号化 |
| `plugins/platforms/wecom/callback_adapter.py` | コールバックと Webhook | 中 | HTTP サーバー、AES の暗号処理、複数アプリ |
| `plugins/platforms/irc/adapter.py` | ロングポーリングと IRC の手順 | 高 | 機能のそろったプラグインのアダプタと、範囲を区切ったトークンのロック |
