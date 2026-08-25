---
title: "メモリプロバイダプラグイン"
description: "Hermes Agent 向けのメモリプロバイダプラグインの作り方"
upstream_path: developer-guide/memory-provider-plugin.md
upstream_blob: 26a54b7fcb866273ec297936bb9cb71b7ff55650
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/memory-provider-plugin
---

# メモリプロバイダプラグインを作る {#building-a-memory-provider-plugin}

メモリプロバイダプラグインを入れると、Hermes Agent は組み込みの MEMORY.md や USER.md を超えて、セッションをまたいで残る知識を持てるようになります。このページでは、その作り方を説明します。

:::tip
メモリプロバイダは、2 種類ある**プロバイダプラグイン**のうちの 1 つです。もう 1 つは [コンテキストエンジンプラグイン](/hermes/docs/developer-guide/context-engine-plugin/) で、こちらは組み込みのコンテキスト圧縮を置き換えます。どちらも同じ形をしています。1 つだけ選ぶ方式で、設定ファイルから指定し、`hermes plugins` で管理します。
:::

## 置き場所の種類 {#installation-layouts}

Hermes は 4 か所からメモリプロバイダを見つけます。優先順位は上から順です。

| 置き場所 | 場所 | 補足 |
|---|---|---|
| 同梱 | `plugins/memory/<name>/` | Hermes に最初から入っています。新規の追加は受け付けていません。[CONTRIBUTING](https://github.com/NousResearch/hermes-agent/blob/main/CONTRIBUTING.md) を参照してください。 |
| 利用者 | `$HERMES_HOME/plugins/<name>/` | 利用者が自分で置きます。プロファイルごとに分かれます。 |
| プロジェクト | `./.hermes/plugins/<name>/` | `HERMES_ENABLE_PROJECT_PLUGINS=1` を設定したときだけ有効です。 |
| パッケージ | `hermes_agent.memory_providers` エントリポイント | `pip install` で入り、コピーする作業はいりません。 |

名前がぶつかったときは上の段が勝ちます。そのため、作業ツリーに置いたディレクトリが同梱のプロバイダを覆い隠すことはありません。

:::note
これは一般のプラグイン機構の「あとから読んだものが勝つ」順序とは逆です。メモリプロバイダは*名前*で有効になります（`memory.provider`）。もし覆い隠せてしまうと、単にツールが上書きされるだけでなく、エージェントの記憶そのものが気づかないうちに別の場所へ向いてしまいます。
:::

見つける処理は*列挙するだけ*で、プロバイダを読み込むことはありません。`memory.provider` が名前を指定するまでは、何も動きません。

### ディレクトリ形式のプロバイダ {#directory-provider}

ディレクトリ形式のプロバイダは、Hermes に同梱される場合は `plugins/memory/<name>/`、利用者が入れる場合は `$HERMES_HOME/plugins/<name>/`、プロジェクト内に置く場合は `./.hermes/plugins/<name>/` に置きます。

```
plugins/memory/my-provider/
├── __init__.py      # MemoryProvider implementation + register() entry point
├── plugin.yaml      # Metadata (name, description, hooks)
└── README.md        # Setup instructions, config reference, tools
```

### パッケージ形式のプロバイダ {#packaged-provider}

pip で入れるプロバイダは、`hermes_agent.memory_providers` グループにエントリポイントを公開します。エントリポイントの名前が、利用者が `memory.provider` で選ぶプロバイダ名になります。その値はプロバイダの `register(ctx)` 関数を指します。

```toml title="pyproject.toml"
[project.entry-points."hermes_agent.memory_providers"]
my-provider = "my_provider:register"
```

エントリポイントは**パッケージ**そのもの、またはその中の `register(ctx)` を指すようにして、実装・スキル・その他の資材は普通の Python パッケージの構成のまま置いてください。`$HERMES_HOME/plugins/` の下にコピーする必要はありません。

パッケージのエントリポイントでも、ディレクトリ形式で得られるものはすべて手に入ります。Hermes が読み込みではなくディスクから直接読む 2 つのファイル、`config_schema.py`（ダッシュボードの設定パネル）と `cli.py`（`hermes <provider>` のサブコマンド）も含みます。どちらもパッケージの `__init__.py` の隣から探されるので、この 2 つのどちらかを配るなら、エントリポイントは単一のモジュールではなくパッケージを指してください。

## MemoryProvider 抽象基底クラス {#the-memoryprovider-abc}

プラグインは、`agent/memory_provider.py` にある抽象基底クラス `MemoryProvider` を実装します。

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

## 必須のメソッド {#required-methods}

### 中核となるライフサイクル {#core-lifecycle}

| メソッド | 呼ばれるとき | 実装は必須か |
|--------|-----------|-----------------|
| `name`（プロパティ） | 常時 | **必須** |
| `is_available()` | エージェント初期化時、有効化の前 | **必須** — ネットワーク通信は禁止 |
| `initialize(session_id, **kwargs)` | エージェント起動時 | **必須** |
| `get_tool_schemas()` | 初期化後、ツールを組み込むとき | **必須** |
| `handle_tool_call(tool_name, args, **kwargs)` | エージェントがツールを使うとき | **必須**（ツールがある場合） |

### 設定 {#config}

| メソッド | 役割 | 実装は必須か |
|--------|---------|-----------------|
| `get_config_schema()` | `hermes memory setup` 用に設定項目を宣言する | **必須** |
| `save_config(values, hermes_home)` | 秘密でない設定を自前の場所へ書き出す | **必須**（環境変数だけで済む場合を除く） |

### 任意のフック {#optional-hooks}

| メソッド | 呼ばれるとき | 使いどころ |
|--------|-----------|----------|
| `system_prompt_block()` | システムプロンプトの組み立て時 | 固定のプロバイダ情報 |
| `prefetch(query, *, session_id="")` | API 呼び出しのたび、その前 | 思い出した内容を返す |
| `queue_prefetch(query, *, session_id="")` | 各ターンの後 | 次のターンに備えて温めておく |
| `sync_turn(user, assistant, *, session_id="", messages=None)` | 1 ターンが終わるたび | 会話を保存する |
| `on_session_end(messages)` | 会話の終了時 | 最後の抽出・書き出し |
| `on_pre_compress(messages)` | コンテキスト圧縮の直前 | 捨てられる前に気づきを保存する |
| `on_memory_write(action, target, content)` | 組み込みメモリへの書き込み時 | 自分のバックエンドにも反映する |
| `shutdown()` | プロセス終了時 | 接続の後始末 |

## 圧縮前チェックポイント（失敗したら止める） {#pre-compress-checkpoints-fail-closed}

`on_pre_compress()` は、既定では「できる範囲でやる」扱いです。プロバイダが例外を投げても、本体は失敗を記録したうえで圧縮を続けます。気づきを抜き出すだけの用途にはこれが正しい既定ですが、欠落の出る書き換えの*前に*会話の記録を確実な保管先へ残すのが仕事のプロバイダには向きません。そうした用途のために、本体は任意で使えるチェックポイントの取り決め（API v2）を用意しています。

```python
from agent.memory_provider import MemoryProvider

class MyArchivingProvider(MemoryProvider):
    # Opt in: every successful on_pre_compress() return means the durable
    # checkpoint is committed. Raise on any failure — do not return partial
    # success. Version 1 (the inherited default) is the implicit historical
    # contract: best-effort semantics, raw message list.
    pre_compress_checkpoint_api_version = 2

    def on_pre_compress(self, messages):
        ids = self._archive(messages)   # must be durable before returning
        return f"checkpoint: {ids}"     # forwarded into the summary prompt
```

運用側は、環境ごとにこの強制を有効にできます。

```yaml
compression:
  checkpoint_required: true   # default: false
```

この関門を有効にすると、API に対応していて動いているプロバイダがチェックポイントを完了させない限り、欠落の出る書き換えに入る前に圧縮が**失敗して止まります**。圧縮前の会話はそのまま保たれ、圧縮の試みは `BLOCKED_MISSING_PREREQUISITE` で終わり、保管先が復旧すればやり直せます。関門を切っている既定の状態では、既存のプロバイダの動きは何も変わりません。

この関門は Hermes の要約処理だけでなく、圧縮を行うすべての仕組みに効きます。サーバー側で行う圧縮（`compression.codex_responses_native`）は関門が有効な間は抑止されます。ターン後の細かい圧縮（`compression.micro_compact`）はエージェントの初期化時に強制的に切られます（古いやり取りを転がる要約に吸収してしまい、その経路にはチェックポイントのフックがないためです）。`codex_app_server` の API モードもエージェントの初期化時に拒否されます。codex エージェントは自分のスレッドを自分で圧縮してしまい、圧縮前という正直な境目を作れないので、必要なチェックポイントを保証できないからです。チェックポイントを理解できる Hermes の圧縮処理だけが、欠落を伴う書き換えを行える唯一の存在になります。

プロバイダが受け取る中身は、宣言した API のバージョンで変わります。バージョン 1 のプロバイダ（暗黙の既定であり、既存のプロバイダはすべてこれです）は従来どおり、生のメッセージ一覧をそのまま受け取ります。バージョン 2 のチェックポイント対応プロバイダは、代わりに整えられた直接の証拠を受け取ります。中身は user と assistant のテキスト行だけで、ツールの実行結果、システムメッセージ、assistant メッセージの `tool_calls` の中身（本文は残ります）、それ以前の圧縮要約は本体側で取り除かれます。以前の要約は、プロセスを再起動しても残る `_compressed_summary` という目印で判別されるため、再開したセッションが二次的な要約を保管先へ戻してしまうことはありません。

**チェックポイントは何度実行しても同じ結果になるように作ってください。** 失敗で止まったあと、次の圧縮の試みは同じ会話を渡して `on_pre_compress()` をもう一度呼びます。少ししか伸びていない会話からは、ほとんど同じ証拠ができあがります。保管先への書き込みは中身（たとえば会話のダイジェスト）をキーにして上書き保存する形にし、やり直しや重なりが重複した記録として積み上がらないようにしてください。

取り決めのテスト: `tests/agent/test_pre_compress_checkpoint_contract.py`。

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

`secret: True` と `env_var` が付いた項目は `.env` に入ります。秘密でない項目は `save_config()` へ渡されます。

:::tip 最小限のスキーマと全部入りのスキーマ
`get_config_schema()` に書いた項目は、`hermes memory setup` の実行中にすべて質問されます。設定できることが多いプロバイダほど、スキーマは絞ってください。入れるのは利用者が**必ず**設定しなければならない項目（API キーや必須の認証情報）だけにします。任意の設定は全部を質問するのではなく、設定ファイルの説明（たとえば `$HERMES_HOME/myprovider.json`）にまとめておきましょう。こうすると初期設定はさっと終わり、それでいて細かい調整もできます。例としては Supermemory のプロバイダを見てください。質問されるのは API キーだけで、ほかの設定はすべて `supermemory.json` に置かれています。
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

環境変数だけで動くプロバイダなら、既定の何もしない実装のままで構いません。

## プラグインのエントリポイント {#plugin-entry-point}

```python
def register(ctx) -> None:
    """Called by the memory plugin discovery system."""
    ctx.register_memory_provider(MyMemoryProvider())
```

プロバイダは、同じコールバックから読み取り専用のスキルを公開することもできます。スキルはエントリポイント名で修飾され、そのメモリプロバイダが有効なときだけ読み込まれます。

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

`my-provider` のエントリポイントが有効になっていれば、このスキルは `skill_view()` から `my-provider:maintenance` として使えます。

## plugin.yaml {#pluginyaml}

```yaml
name: my-provider
version: 1.0.0
description: "Short description of what this provider does."
hooks:
  - on_session_end    # list hooks you implement
```

## スレッドについての約束 {#threading-contract}

**`sync_turn()` は待たせてはいけません。** バックエンドに時間がかかる処理（API 呼び出しや LLM の処理）があるなら、デーモンスレッドで走らせてください。

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

`messages` は任意で、そのターンが終わった時点の OpenAI 形式の会話です。渡される場合は、user と assistant のメッセージ、assistant によるツール呼び出し、ツールの実行結果メッセージが入っています。生のターン内容が要らないプロバイダは `messages` を受け取らなくても構いません。Hermes は従来どおりの引数のまま呼び続けます。

クラウド型のプロバイダは、`messages` のどの部分が端末の外へ出るのかを説明してください。ツール呼び出しとその結果には、ファイルのパス、コマンドの出力、その他の作業内容が含まれることがあります。

## プロファイルの分離 {#profile-isolation}

保存先のパスは**必ず** `initialize()` に渡される `hermes_home` を使ってください。`~/.hermes` を直接書いてはいけません。

```python
# CORRECT — profile-scoped
from hermes_constants import get_hermes_home
data_dir = get_hermes_home() / "my-provider"

# WRONG — shared across all profiles
data_dir = Path("~/.hermes/my-provider").expanduser()
```

## テスト {#testing}

通しで動かす書き方は、`tests/agent/test_memory_provider.py` と、その周辺のメモリ関連テスト（`tests/agent/test_memory_session_switch.py`、`tests/agent/test_memory_user_id.py`、`tests/run_agent/test_memory_provider_init.py`）を参考にしてください。

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

メモリプロバイダプラグインは、自前の CLI サブコマンド（たとえば `hermes my-provider status` や `hermes my-provider config`）を登録できます。これは決められた置き方で見つける仕組みなので、本体のファイルに手を入れる必要はありません。

### 仕組み {#how-it-works}

1. プラグインのディレクトリに `cli.py` を置きます
2. argparse の構造を組み立てる `register_cli(subparser)` 関数を定義します
3. メモリプラグインの機構が起動時に `discover_plugin_cli_commands()` で見つけます
4. コマンドは `hermes <provider-name> <subcommand>` として現れます

**有効なプロバイダだけが対象です。** CLI のコマンドは、設定の `memory.provider` が自分のプロバイダになっているときだけ現れます。利用者がそのプロバイダを設定していなければ、`hermes --help` にも出てきません。

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

### 手本になる実装 {#reference-implementation}

`plugins/memory/honcho/cli.py` には、13 個のサブコマンド、プロファイルをまたぐ管理（`--target-profile`）、設定の読み書きまで揃った完全な例があります。

### CLI を含めたディレクトリ構成 {#directory-structure-with-cli}

```
plugins/memory/my-provider/
├── __init__.py      # MemoryProvider implementation + register()
├── plugin.yaml      # Metadata
├── cli.py           # register_cli(subparser) — CLI commands
└── README.md        # Setup instructions
```

## プロバイダは 1 つだけ {#single-provider-rule}

外部のメモリプロバイダは、同時に**1 つ**しか動かせません。利用者が 2 つ目を登録しようとすると、MemoryManager は警告を出して受け付けません。これはツールのスキーマが膨れ上がることと、バックエンド同士がぶつかることを防ぐためです。
