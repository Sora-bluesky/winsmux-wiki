---
title: "メモリープロバイダープラグイン"
description: "Hermes Agent 向けのメモリープロバイダープラグインを作る方法"
upstream_path: developer-guide/memory-provider-plugin.md
upstream_blob: 86b1f60de534c944bd86e58a78a3cffa2e9da036
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/memory-provider-plugin
---

# メモリープロバイダープラグインを作る {#building-a-memory-provider-plugin}

メモリープロバイダープラグインを使うと、Hermes Agent は組み込みの MEMORY.md や USER.md の枠を超えて、セッションをまたいで残る知識を持てるようになります。このガイドでは、その作り方を説明します。

:::tip
メモリープロバイダーは、2 種類ある **プロバイダープラグイン** の片方です。もう片方は [コンテキストエンジンプラグイン](/hermes/docs/developer-guide/context-engine-plugin/) で、こちらは組み込みのコンテキスト圧縮を差し替えます。どちらも同じ形をしていて、選べるのは 1 つだけ、設定で切り替え、`hermes plugins` で管理します。
:::

## 設置の形 {#installation-layouts}

Hermes は次の 4 か所からメモリープロバイダーを見つけます。優先順位はこの並びのとおりです。

| 取得元 | 場所 | 補足 |
|---|---|---|
| 同梱 | `plugins/memory/<name>/` | Hermes に最初から入っています。新しいプロバイダーの追加は受け付けていません — [CONTRIBUTING](https://github.com/NousResearch/hermes-agent/blob/main/CONTRIBUTING.md) を参照してください。 |
| ユーザー | `$HERMES_HOME/plugins/<name>/` | 利用者が自分で置きます。プロファイルごとに分かれます。 |
| プロジェクト | `./.hermes/plugins/<name>/` | `HERMES_ENABLE_PROJECT_PLUGINS=1` を設定したときだけ有効になります。 |
| パッケージ | `hermes_agent.memory_providers` のエントリーポイント | `pip install` で入り、ファイルをコピーする必要はありません。 |

名前がぶつかったときは先に挙げた取得元が勝ちます。そのため、作業ツリーに
置かれたディレクトリが同梱のプロバイダーを覆い隠すことはありません。

:::note
これは、一般のプラグイン機構が「あとに来たものが勝つ」順であるのと逆です。
メモリープロバイダーは *名前* で有効化されるため（`memory.provider`）、覆い
隠しが起きると、単にツールを上書きするのではなく、エージェントの記憶の
行き先が黙って別のものにすり替わってしまうからです。
:::

見つける処理は *列挙するだけ* で、プロバイダーを読み込むことはありません。
`memory.provider` に名前が書かれるまで、何も動きません。

### ディレクトリ型のプロバイダー {#directory-provider}

ディレクトリ型のプロバイダーは、Hermes に同梱される場合は
`plugins/memory/<name>/`、利用者が入れる場合は `$HERMES_HOME/plugins/<name>/`、
プロジェクト専用の場合は `./.hermes/plugins/<name>/` に置きます。

```
plugins/memory/my-provider/
├── __init__.py      # MemoryProvider implementation + register() entry point
├── plugin.yaml      # Metadata (name, description, hooks)
└── README.md        # Setup instructions, config reference, tools
```

### パッケージ型のプロバイダー {#packaged-provider}

pip で入れるプロバイダーは、`hermes_agent.memory_providers` グループに
エントリーポイントを公開します。エントリーポイントの名前が、利用者が
`memory.provider` で選ぶプロバイダー名になり、その値はプロバイダーの
`register(ctx)` 関数を指します。

```toml title="pyproject.toml"
[project.entry-points."hermes_agent.memory_providers"]
my-provider = "my_provider:register"
```

エントリーポイントは **パッケージ**、またはその中の `register(ctx)` を指すように
して、実装・スキル・その他のリソースは通常の Python パッケージの構成のまま置いて
ください。`$HERMES_HOME/plugins/` の下にコピーする必要はありません。

パッケージのエントリーポイントでも、ディレクトリに置いた場合とまったく同じことが
できます。読み込みではなくディスクから直接読まれる 2 つのファイル、つまり
`config_schema.py`（ダッシュボードの設定パネル）と `cli.py`（`hermes <provider>`
のサブコマンド）も含みます。どちらもパッケージの `__init__.py` の隣で探されるので、
このどちらかを配布するなら、エントリーポイントは単一モジュールではなくパッケージを
指すようにしてください。

## MemoryProvider 抽象基底クラス {#the-memoryprovider-abc}

プラグインでは、`agent/memory_provider.py` にある `MemoryProvider` 抽象基底クラスを実装します。

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

| メソッド | 呼ばれるタイミング | 実装は必須か |
|--------|-----------|-----------------|
| `name`（プロパティ） | 常時 | **必須** |
| `is_available()` | エージェント初期化時、有効化の前 | **必須** — ネットワーク通信はしないこと |
| `initialize(session_id, **kwargs)` | エージェント起動時 | **必須** |
| `get_tool_schemas()` | 初期化後、ツールを差し込むとき | **必須** |
| `handle_tool_call(tool_name, args, **kwargs)` | エージェントがこのツールを使うとき | **必須**（ツールを持つ場合） |

### 設定 {#config}

| メソッド | 目的 | 実装は必須か |
|--------|---------|-----------------|
| `get_config_schema()` | `hermes memory setup` 用に設定項目を宣言する | **必須** |
| `save_config(values, hermes_home)` | 秘密でない設定を、自前の保存先に書き出す | **必須**（環境変数だけで済む場合を除く） |

### 任意のフック {#optional-hooks}

| メソッド | 呼ばれるタイミング | 使いどころ |
|--------|-----------|----------|
| `system_prompt_block()` | システムプロンプトの組み立て時 | プロバイダーの固定情報を渡す |
| `prefetch(query, *, session_id="")` | API 呼び出しのたび、その前 | 思い出した内容を返す |
| `queue_prefetch(query, *, session_id="")` | 各ターンの後 | 次のターンに備えて先に温めておく |
| `sync_turn(user, assistant, *, session_id="", messages=None)` | 1 ターンが終わるたび | 会話を保存する |
| `on_session_end(messages)` | 会話が終わったとき | 最後の抽出・書き出し |
| `on_pre_compress(messages)` | コンテキスト圧縮の前 | 捨てられる前に気づきを保存する |
| `on_memory_write(action, target, content)` | 組み込みメモリーへの書き込み時 | 自前のバックエンドにも同じ内容を残す |
| `shutdown()` | プロセス終了時 | 接続の後始末 |

### 大きすぎる prefetch の結果 {#oversized-prefetch-results}

外部プロバイダーの `prefetch()` の結果が、設定した退避のしきい値を超えると、
専用の退避ファイルに書き出され、設定に沿って先頭と末尾だけのプレビューに
置き換えられます。プレビューにはファイルのパスが入るので、本当に必要になった
ときにエージェントが全文を読めます。しきい値以下の結果はそのまま返されます。

この動きは共通の `hooks.output_spill` の設定（既定では `10,000` 文字）を使います。
[プラグイン — 大きすぎるコンテキストの退避](/hermes/docs/developer-guide/plugins/#oversized-context-spill) を参照してください。

## 圧縮前のチェックポイント（失敗したら止める） {#pre-compress-checkpoints-fail-closed}

`on_pre_compress()` は、既定では「できる範囲でやる」扱いです。プロバイダーが例外を
投げても、ホストは失敗を記録したうえで圧縮を続けます。気づきの抽出が目的なら
それでよいのですが、情報が失われる書き換えの *前に* 会話の記録を確実な保存先へ
残すことが仕事のプロバイダーには向きません。そうした場合のために、ホストは
希望者だけが使えるチェックポイントの取り決め（API v2）を用意しています。

```python
from agent.memory_provider import MemoryProvider

class MyArchivingProvider(MemoryProvider):
    # Opt in: every successful on_pre_compress() return means the durable
    # checkpoint is committed. Raise on any failure — do not return partial
    # success. Version 1 (the inherited default) is the implicit historical
    # contract: best-effort semantics, raw message list.
    pre_compress_checkpoint_api_version = 2

    def on_pre_compress(self, messages, *, require_checkpoint=False):
        # require_checkpoint mirrors the operator's checkpoint_required
        # setting: True means a raise here blocks the lossy rewrite.
        ids = self._archive(messages)   # must be durable before returning
        return f"checkpoint: {ids}"     # forwarded into the summary prompt
```

運用する側は、環境ごとにこの強制を有効にできます。

```yaml
compression:
  checkpoint_required: true   # default: false
```

この仕組みを有効にすると、API を宣言している有効なプロバイダーがチェックポイントを
完了しないかぎり、情報が失われる書き換えに入る前に圧縮が **止まります**。圧縮前の
会話記録はそのまま保たれ、圧縮の試みは `BLOCKED_MISSING_PREREQUISITE` で失敗し、
保存先が復旧すればやり直せます。無効のまま（既定）なら、これまでのプロバイダーの
動きは何も変わりません。

この仕組みは、Hermes の要約機能だけでなく、圧縮を行うすべての主体に効きます。
サーバー側のネイティブ圧縮（`compression.codex_responses_native`）は、仕組みが
有効な間は抑止されます。ターン後の小刻みな圧縮（`compression.micro_compact`）は
エージェント初期化時に強制的に無効化されます（古いやり取りを回転する要約に
吸収してしまい、その経路にはチェックポイントのフックがないためです）。
`codex_app_server` の API モードもエージェント初期化時に拒否されます。codex
エージェントは自分のスレッドを自分で圧縮し、圧縮前と言える正しい区切りが
存在しないため、必要なチェックポイントを保証できないからです。チェックポイントを
理解する Hermes の圧縮機能だけが、情報を失う書き換えを行える唯一の主体になります。

プロバイダーが受け取る内容は、宣言した API のバージョンによって変わります。
バージョン 1 のプロバイダー（暗黙の既定であり、これまでのすべてのプロバイダー）は
これまでどおりの取り決めのままで、生のメッセージ一覧をそのまま受け取ります。
バージョン 2 のチェックポイント対応プロバイダーは、代わりに整えられた直接の証拠を
受け取ります。つまり、ユーザーとアシスタントのテキスト行だけです。ツールの実行結果、
システムメッセージ、アシスタントメッセージの `tool_calls` の中身（本文の言葉は
残ります）、それ以前の圧縮要約は、ホスト側で取り除かれます。以前の要約は、
プロセスを再起動しても残る `_compressed_summary` という印で見分けられるので、
再開したセッションが要約の要約を保存先に送り込むことはありません。

**チェックポイントは、何度実行しても同じ結果になるように作ってください。** 圧縮が
止められたあと、次の試みでは同じ会話記録で `on_pre_compress()` がもう一度呼ばれます。
少し伸びただけの会話記録からは、ほとんど重なった証拠ができます。保存の書き込みは
内容（たとえば会話記録のダイジェスト）をキーにして上書き保存にしておき、やり直しや
重なりが積み上がらず、まとまるようにしてください。

取り決めのテスト: `tests/agent/test_pre_compress_checkpoint_contract.py`。

## 設定スキーマ {#config-schema}

`get_config_schema()` は、`hermes memory setup` が使う設定項目の一覧を返します。

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

`secret: True` と `env_var` が付いた項目は `.env` に書かれます。秘密でない項目は `save_config()` に渡されます。

:::tip 最小限のスキーマと全部入りのスキーマ
`get_config_schema()` に入れた項目は、`hermes memory setup` の途中ですべて質問されます。設定項目が多いプロバイダーは、スキーマを最小限にとどめてください。入れるのは、利用者が **必ず** 設定しなければならないもの（API キーや必須の認証情報）だけにします。任意の設定は、設定ファイルの一覧（たとえば `$HERMES_HOME/myprovider.json`）に書いておき、設定の途中で全部を聞かないようにします。こうすると、細かい設定にも対応しながら、初期設定はすばやく終わります。例としては Supermemory のプロバイダーを見てください。質問するのは API キーだけで、他の項目はすべて `supermemory.json` にあります。
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

環境変数だけで動くプロバイダーなら、既定の何もしない実装のままで構いません。

## プラグインのエントリーポイント {#plugin-entry-point}

```python
def register(ctx) -> None:
    """Called by the memory plugin discovery system."""
    ctx.register_memory_provider(MyMemoryProvider())
```

プロバイダーは、同じコールバックから読み取り専用のスキルを公開することもできます。
スキルはエントリーポイントの名前で修飾され、そのメモリープロバイダーが有効なとき
だけ読み込まれます。

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

`my-provider` のエントリーポイントが有効なとき、このスキルは `skill_view()` から
`my-provider:maintenance` として使えます。

## plugin.yaml {#pluginyaml}

```yaml
name: my-provider
version: 1.0.0
description: "Short description of what this provider does."
hooks:
  - on_session_end    # list hooks you implement
```

## スレッドの取り決め {#threading-contract}

**`sync_turn()` は処理をせき止めてはいけません。** バックエンドに待ち時間がある場合（API 呼び出しや LLM の処理など）は、デーモンスレッドで実行してください。スレッドは `agent.memory_provider.spawn_context_thread` で起動し、素の `threading.Thread` は決して使いません。プロファイルの分離（有効な `HERMES_HOME` や、ターンごとのシークレットの範囲）は `contextvars` に入っていますが、素のスレッドは空のコンテキストで始まります。そのため、複数のプロファイルを同時に扱う構成では、*既定の*プロファイルの保存先へ気づかないうちに書き込んでしまい、そこでは `get_secret()` が安全側に倒れて失敗します。

```python
from agent.memory_provider import spawn_context_thread

def sync_turn(self, user_content, assistant_content, *, session_id="", messages=None):
    def _sync():
        try:
            self._api.ingest(user_content, assistant_content, session_id=session_id, messages=messages)
        except Exception as e:
            logger.warning("Sync failed: %s", e)

    if self._sync_thread and self._sync_thread.is_alive():
        self._sync_thread.join(timeout=5.0)
    self._sync_thread = spawn_context_thread(_sync, name="myprovider-sync")
    self._sync_thread.start()
```

同じことは、先読み（prefetch）用や書き込み用のスレッドにも当てはまります。小さな JSON の設定ファイル（`$HERMES_HOME/<provider>.json`）は、`utils.read_json_or_empty` で読み、`utils.atomic_json_write` で書きます。`config.yaml` の中身はすべて `hermes_cli.config.save_config(..., merge_existing=True)` を通して書き込みます。

`messages` は任意で、ターンが終わった時点での OpenAI 形式の会話内容です。渡される
場合は、ユーザーとアシスタントのメッセージ、アシスタントのツール呼び出し、ツールの
実行結果メッセージが含まれます。生のターン内容を必要としないプロバイダーは、
`messages` の引数を省略できます。その場合、Hermes は従来の形のまま呼び出しを
続けます。

クラウド側のプロバイダーは、`messages` のどの部分が端末の外へ送られるのかを
書き残してください。ツール呼び出しやその実行結果には、ファイルのパス、コマンドの
出力、その他の作業内容が入っていることがあります。

## プロファイルの分離 {#profile-isolation}

保存先のパスは **必ず** `initialize()` に渡される `hermes_home` の値を使ってください。`~/.hermes` を直接書き込んではいけません。

```python
# CORRECT — profile-scoped
from hermes_constants import get_hermes_home
data_dir = get_hermes_home() / "my-provider"

# WRONG — shared across all profiles
data_dir = Path("~/.hermes/my-provider").expanduser()
```

## テスト {#testing}

通しの書き方は、`tests/agent/test_memory_provider.py` と、その周辺のメモリー関連テスト（`tests/agent/test_memory_session_switch.py`、`tests/agent/test_memory_user_id.py`、`tests/agent/test_memory_provider_init.py`）を参照してください。

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

メモリープロバイダープラグインは、自前の CLI サブコマンド群を登録できます（たとえば `hermes my-provider status` や `hermes my-provider config`）。決まった置き方をたどって見つける仕組みなので、本体のファイルに手を入れる必要はありません。

### 仕組み {#how-it-works}

1. プラグインのディレクトリに `cli.py` を置きます
2. argparse の構成を組み立てる `register_cli(subparser)` 関数を定義します
3. メモリープラグインの仕組みが、起動時に `discover_plugin_cli_commands()` でそれを見つけます
4. コマンドが `hermes <provider-name> <subcommand>` として現れます

**有効なプロバイダーだけに現れます:** CLI コマンドが現れるのは、設定の `memory.provider` として自分のプロバイダーが有効になっているときだけです。利用者がそのプロバイダーを設定していなければ、コマンドは `hermes --help` に出てきません。

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

13 個のサブコマンド、プロファイルをまたいだ管理（`--target-profile`）、設定の読み書きまでそろった完全な例として、`plugins/memory/honcho/cli.py` を参照してください。

### CLI を含むディレクトリ構成 {#directory-structure-with-cli}

```
plugins/memory/my-provider/
├── __init__.py      # MemoryProvider implementation + register()
├── plugin.yaml      # Metadata
├── cli.py           # register_cli(subparser) — CLI commands
└── README.md        # Setup instructions
```

## プロバイダーは 1 つだけ {#single-provider-rule}

同時に有効にできる外部のメモリープロバイダーは **1 つ** だけです。2 つめを登録しようとすると、MemoryManager が警告を出して拒否します。これは、ツールの定義が膨れ上がることや、保存先どうしがぶつかることを防ぐためです。
