---
title: "メモリプロバイダプラグイン"
description: "Hermes Agent 向けのメモリプロバイダプラグインを作る方法"
upstream_path: developer-guide/memory-provider-plugin.md
upstream_blob: 40dc5ba3ef0a73e476d0098e0c1c02167a9c6c2a
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/memory-provider-plugin
---

# メモリプロバイダプラグインを作る {#building-a-memory-provider-plugin}

メモリプロバイダプラグインは、組み込みの MEMORY.md や USER.md を越えて、セッションをまたいで残る知識を Hermes Agent に持たせます。このページでは、その作り方を説明します。

:::tip
メモリプロバイダは、2 種類ある**プロバイダプラグイン**のうちの 1 つです。もう 1 つは [コンテキストエンジンプラグイン](/hermes/docs/developer-guide/context-engine-plugin/) で、組み込みのコンテキスト圧縮器を置き換えます。どちらも同じ形をしています。単一選択で、設定ファイルから決まり、`hermes plugins` で管理します。
:::

## インストールの置き場所 {#installation-layouts}

Hermes は次の 4 つの場所からメモリプロバイダを見つけます。優先順位はこの順です。

| 場所 | パス | 補足 |
|---|---|---|
| 同梱 | `plugins/memory/<name>/` | Hermes に同梱されています。新しいプロバイダの追加は受け付けていません。[CONTRIBUTING](https://github.com/NousResearch/hermes-agent/blob/main/CONTRIBUTING.md) を参照してください。 |
| ユーザー | `$HERMES_HOME/plugins/<name>/` | 利用者がプロファイルごとに置いたものです。 |
| プロジェクト | `./.hermes/plugins/<name>/` | `HERMES_ENABLE_PROJECT_PLUGINS=1` を指定したときだけ有効になります。 |
| パッケージ | `hermes_agent.memory_providers` のエントリポイント | `pip install` するだけで、コピーする作業はありません。 |

名前がぶつかったときは上にある場所が勝ちます。そのため、作業ツリーに置いたディレクトリが同梱のプロバイダを覆い隠すことはありません。

:::note
これは一般のプラグインの仕組みとは逆で、あちらは後から見つかったものが勝ちます。メモリプロバイダは*名前*で有効化される（`memory.provider`）ので、覆い隠されると、ツールが上書きされるだけでは済まず、エージェントの記憶そのものが黙ってすり替わってしまうからです。
:::

見つける処理は*一覧に載せる*だけで、プロバイダを読み込むことはありません。`memory.provider` が名前を指すまで、何も動きません。

### ディレクトリ型のプロバイダ {#directory-provider}

ディレクトリ型のプロバイダは、Hermes に同梱される場合は `plugins/memory/<name>/` に、利用者が入れる場合は `$HERMES_HOME/plugins/<name>/` に、プロジェクト内だけで使う場合は `./.hermes/plugins/<name>/` に置きます。

```
plugins/memory/my-provider/
├── __init__.py      # MemoryProvider implementation + register() entry point
├── plugin.yaml      # Metadata (name, description, hooks)
└── README.md        # Setup instructions, config reference, tools
```

### パッケージ型のプロバイダ {#packaged-provider}

pip でインストールするプロバイダは、`hermes_agent.memory_providers` グループにエントリポイントを公開します。エントリポイントの名前が、利用者が `memory.provider` で選ぶプロバイダ名になります。その値はプロバイダの `register(ctx)` 関数を指します。

```toml title="pyproject.toml"
[project.entry-points."hermes_agent.memory_providers"]
my-provider = "my_provider:register"
```

エントリポイントは**パッケージ**か、その中の `register(ctx)` を指すようにして、実装・スキル・その他のリソースは通常の Python パッケージの構成のまま置いてください。`$HERMES_HOME/plugins/` の下にコピーする必要はありません。

パッケージのエントリポイントでも、ディレクトリ型と同じものがすべて使えます。Hermes が読み込みではなくディスクから直接読む 2 つのファイル、`config_schema.py`（ダッシュボードの設定パネル）と `cli.py`（`hermes <provider>` のサブコマンド）も含みます。どちらもパッケージの `__init__.py` の隣から探されるので、この 2 つのどちらかを同梱するなら、エントリポイントは単一のモジュールではなくパッケージを指してください。

## MemoryProvider の抽象基底クラス {#the-memoryprovider-abc}

プラグインは `agent/memory_provider.py` にある `MemoryProvider` 抽象基底クラスを実装します。

```python
from agent.memory_provider import MemoryProvider

class MyMemoryProvider(MemoryProvider):
    @property
    def name(self) -> str:
        return "my-provider"

    def is_available(self) -> bool:
        """Check if this provider can activate. NO network calls."""
        return bool(os.environ.get("MY_API_KEY"))

    def initialize(self, session_id: str, **kwargs) -> None:
        """Called once at agent startup.

        kwargs always includes:
          hermes_home (str): Active HERMES_HOME path. Use for storage.
        """
        self._api_key = os.environ.get("MY_API_KEY", "")
        self._session_id = session_id

    # ... implement remaining methods
```

## 実装が必要なメソッド {#required-methods}

### 基本のライフサイクル {#core-lifecycle}

| メソッド | 呼ばれるとき | 実装は必須か |
|--------|-----------|-----------------|
| `name`（プロパティ） | 常に | **必須** |
| `is_available()` | エージェントの初期化時、有効化の前 | **必須** — ネットワークにアクセスしないこと |
| `initialize(session_id, **kwargs)` | エージェントの起動時 | **必須** |
| `get_tool_schemas()` | 初期化後、ツールを差し込むとき | **必須** |
| `handle_tool_call(tool_name, args, **kwargs)` | エージェントがこのツールを使ったとき | **必須**（ツールを持つ場合） |

### 設定 {#config}

| メソッド | 役割 | 実装は必須か |
|--------|---------|-----------------|
| `get_config_schema()` | `hermes memory setup` で尋ねる設定項目を宣言する | **必須** |
| `save_config(values, hermes_home)` | 秘密でない設定を、そのプロバイダの置き場所に書き出す | **必須**（環境変数だけで済む場合を除く） |

### 任意のフック {#optional-hooks}

| メソッド | 呼ばれるとき | 使いどころ |
|--------|-----------|----------|
| `system_prompt_block()` | システムプロンプトの組み立て時 | プロバイダの固定的な説明を載せる |
| `prefetch(query, *, session_id="")` | API を呼ぶたび、その前 | 思い出した内容を返す |
| `queue_prefetch(query, *, session_id="")` | 各ターンの終わり | 次のターンに備えて温めておく |
| `sync_turn(user, assistant, *, session_id="", messages=None)` | 1 ターンが終わるたび | 会話を保存する |
| `on_session_end(messages)` | 会話が終わったとき | 最後の抽出と書き出し |
| `on_pre_compress(messages)` | コンテキスト圧縮の前 | 捨てられる前に要点を残す |
| `on_memory_write(action, target, content)` | 組み込みメモリへの書き込み時 | 自前のバックエンドにも写す |
| `shutdown()` | プロセスの終了時 | 接続の後始末 |

## 設定スキーマ {#config-schema}

`get_config_schema()` は、`hermes memory setup` が使う項目の一覧を返します。

```python
def get_config_schema(self):
    return [
        {
            "key": "api_key",
            "description": "My Provider API key",
            "secret": True,           # → written to .env
            "required": True,
            "env_var": "MY_API_KEY",   # explicit env var name
            "url": "https://my-provider.com/keys",  # where to get it
        },
        {
            "key": "region",
            "description": "Server region",
            "default": "us-east",
            "choices": ["us-east", "eu-west", "ap-south"],
        },
        {
            "key": "project",
            "description": "Project identifier",
            "default": "hermes",
        },
    ]
```

`secret: True` と `env_var` を持つ項目は `.env` に書かれます。秘密でない項目は `save_config()` に渡されます。

:::tip 最小のスキーマと全部入りのスキーマ
`get_config_schema()` に書いた項目は、`hermes memory setup` の途中ですべて尋ねられます。設定項目が多いプロバイダは、スキーマを最小限に保ってください。利用者が**どうしても**設定しないと動かないもの（API キー、必須の資格情報）だけを載せます。それ以外の任意の設定は、途中で全部尋ねるのではなく、設定ファイルの説明（たとえば `$HERMES_HOME/myprovider.json`）に書いておきましょう。こうすると初期設定は速いままで、細かい調整も効きます。例としては Supermemory のプロバイダを見てください。尋ねるのは API キーだけで、他の設定はすべて `supermemory.json` にあります。
:::

## 設定の保存 {#save-config}

```python
def save_config(self, values: dict, hermes_home: str) -> None:
    """Write non-secret config to your native location."""
    import json
    from pathlib import Path
    config_path = Path(hermes_home) / "my-provider.json"
    config_path.write_text(json.dumps(values, indent=2))
```

環境変数だけで済むプロバイダは、既定の何もしない実装のままで構いません。

## プラグインのエントリポイント {#plugin-entry-point}

```python
def register(ctx) -> None:
    """Called by the memory plugin discovery system."""
    ctx.register_memory_provider(MyMemoryProvider())
```

プロバイダは、同じコールバックから読み取り専用のスキルを公開することもできます。スキルはエントリポイントの名前で修飾され、そのメモリプロバイダが有効なときにだけ読み込まれます。

```python
from pathlib import Path

SKILLS_DIR = Path(__file__).parent / "skills"

def register(ctx) -> None:
    ctx.register_memory_provider(MyMemoryProvider())
    ctx.register_skill(
        "maintenance",
        SKILLS_DIR / "maintenance" / "SKILL.md",
        "Maintain the provider's memory store",
    )
```

`my-provider` のエントリポイントが有効なとき、このスキルは `skill_view()` から `my-provider:maintenance` として使えます。

## plugin.yaml {#pluginyaml}

```yaml
name: my-provider
version: 1.0.0
description: "Short description of what this provider does."
hooks:
  - on_session_end    # list hooks you implement
```

## スレッドの決まりごと {#threading-contract}

**`sync_turn()` は処理を待たせてはいけません。** バックエンドに時間がかかる場合（API 呼び出しや LLM の処理など）は、デーモンスレッドで動かしてください。

```python
def sync_turn(self, user_content, assistant_content, *, session_id="", messages=None):
    def _sync():
        try:
            self._api.ingest(user_content, assistant_content, session_id=session_id, messages=messages)
        except Exception as e:
            logger.warning("Sync failed: %s", e)

    if self._sync_thread and self._sync_thread.is_alive():
        self._sync_thread.join(timeout=5.0)
    self._sync_thread = threading.Thread(target=_sync, daemon=True)
    self._sync_thread.start()
```

`messages` は任意で、そのターンが終わった時点の OpenAI 形式の会話内容です。渡されるときは、ユーザーとアシスタントのメッセージ、アシスタントのツール呼び出し、ツールの結果メッセージが含まれます。生のターン内容が要らないプロバイダは `messages` 引数を省いて構いません。その場合 Hermes は従来どおりの引数で呼び出し続けます。

クラウド型のプロバイダは、`messages` のどの部分が端末の外へ送られるのかを明記してください。ツール呼び出しやツールの結果には、ファイルのパス、コマンドの出力、その他の作業内容が入っていることがあります。

## プロファイルの分離 {#profile-isolation}

保存先のパスは**必ず** `initialize()` に渡される `hermes_home` を使ってください。`~/.hermes` を直接書かないでください。

```python
# CORRECT — profile-scoped
from hermes_constants import get_hermes_home
data_dir = get_hermes_home() / "my-provider"

# WRONG — shared across all profiles
data_dir = Path("~/.hermes/my-provider").expanduser()
```

## テスト {#testing}

端から端までの書き方は、`tests/agent/test_memory_provider.py` と、その周辺のメモリ関連テスト（`tests/agent/test_memory_session_switch.py`、`tests/agent/test_memory_user_id.py`、`tests/run_agent/test_memory_provider_init.py`）を参照してください。

```python
from agent.memory_manager import MemoryManager

mgr = MemoryManager()
mgr.add_provider(my_provider)
mgr.initialize_all(session_id="test-1", platform="cli")

# Test tool routing
result = mgr.handle_tool_call("my_tool", {"action": "add", "content": "test"})

# Test lifecycle
mgr.sync_all("user msg", "assistant msg")
mgr.on_session_end([])
mgr.shutdown_all()
```

## CLI コマンドを足す {#adding-cli-commands}

メモリプロバイダプラグインは、自分用の CLI サブコマンド群（`hermes my-provider status`、`hermes my-provider config` など）を登録できます。これは決まった置き場所を見に行く仕組みなので、中核のファイルに手を入れる必要はありません。

### 仕組み {#how-it-works}

1. プラグインのディレクトリに `cli.py` を置きます
2. argparse の木を組み立てる `register_cli(subparser)` 関数を定義します
3. メモリプラグインの仕組みが起動時に `discover_plugin_cli_commands()` でそれを見つけます
4. コマンドが `hermes <provider-name> <subcommand>` として使えるようになります

**有効なプロバイダだけに出ます。** 登録した CLI コマンドは、設定の `memory.provider` が自分のプロバイダになっているときにだけ現れます。利用者がそのプロバイダを設定していなければ、`hermes --help` にも出てきません。

### 例 {#example}

```python
# plugins/memory/my-provider/cli.py

def my_command(args):
    """Handler dispatched by argparse."""
    sub = getattr(args, "my_command", None)
    if sub == "status":
        print("Provider is active and connected.")
    elif sub == "config":
        print("Showing config...")
    else:
        print("Usage: hermes my-provider <status|config>")

def register_cli(subparser) -> None:
    """Build the hermes my-provider argparse tree.

    Called by discover_plugin_cli_commands() at argparse setup time.
    """
    subs = subparser.add_subparsers(dest="my_command")
    subs.add_parser("status", help="Show provider status")
    subs.add_parser("config", help="Show provider config")
    subparser.set_defaults(func=my_command)
```

### お手本となる実装 {#reference-implementation}

`plugins/memory/honcho/cli.py` に、13 個のサブコマンド、プロファイルをまたぐ管理（`--target-profile`）、設定の読み書きまで揃った例があります。

### CLI を含むディレクトリ構成 {#directory-structure-with-cli}

```
plugins/memory/my-provider/
├── __init__.py      # MemoryProvider implementation + register()
├── plugin.yaml      # Metadata
├── cli.py           # register_cli(subparser) — CLI commands
└── README.md        # Setup instructions
```

## プロバイダは 1 つだけ {#single-provider-rule}

外部のメモリプロバイダは、同時に**1 つ**しか動かせません。2 つめを登録しようとすると、MemoryManager が警告を出して拒否します。ツールのスキーマが膨れ上がることや、バックエンド同士がぶつかることを防ぐためです。
