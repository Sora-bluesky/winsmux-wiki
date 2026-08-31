---
title: "記憶プロバイダプラグイン"
description: "Hermes Agent 向けの記憶プロバイダプラグインを作る方法"
upstream_path: developer-guide/memory-provider-plugin.md
upstream_blob: d73327da69f296bb8b2be42f2b2d982a67ab1cc8
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/memory-provider-plugin
---

# 記憶プロバイダプラグインを作る {#building-a-memory-provider-plugin}

記憶プロバイダのプラグインを使うと、Hermes Agent は組み込みの MEMORY.md や USER.md を超えて、セッションをまたいで残る知識を持てるようになります。このページでは、その作り方を説明します。

:::tip
記憶プロバイダは、2 種類ある **プロバイダプラグイン** の 1 つです。もう 1 つは[コンテキストエンジンプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)で、こちらは組み込みのコンテキスト圧縮を置き換えます。どちらも同じ形をしています。1 つだけ選択でき、設定で切り替え、`hermes plugins` で管理します。
:::

## 設置場所の種類 {#installation-layouts}

Hermes は記憶プロバイダを 4 つの場所から見つけます。優先順位は次のとおりです。

| 場所 | パス | 補足 |
|---|---|---|
| 同梱 | `plugins/memory/<name>/` | Hermes に同梱されています。新しいプロバイダの追加は受け付けていません — [CONTRIBUTING](https://github.com/NousResearch/hermes-agent/blob/main/CONTRIBUTING.md) を参照してください。 |
| 利用者 | `$HERMES_HOME/plugins/<name>/` | 利用者がプロファイルごとに置きます。 |
| プロジェクト | `./.hermes/plugins/<name>/` | `HERMES_ENABLE_PROJECT_PLUGINS=1` で明示的に有効にします。 |
| パッケージ | `hermes_agent.memory_providers` エントリポイント | `pip install` するだけで、コピーする作業はありません。 |

名前が衝突した場合は先に挙げた場所が勝つので、作業ツリーに置いたディレクトリが
同梱のプロバイダを覆い隠すことはありません。

:::note
これは一般のプラグイン機構における「あとが勝つ」順序とは逆です。記憶プロバイダは
*名前* で有効化されるため（`memory.provider`）、覆い隠しが起きると、単にツールを
上書きするのではなく、エージェントの記憶の行き先が黙って差し替わってしまうからです。
:::

見つける処理は *列挙するだけ* で、プロバイダを import することはありません。
`memory.provider` が名指ししない限り、何も動きません。

### ディレクトリ型のプロバイダ {#directory-provider}

ディレクトリ型のプロバイダは、Hermes に同梱される場合は `plugins/memory/<name>/`、
利用者が入れる場合は `$HERMES_HOME/plugins/<name>/`、プロジェクト内に置く場合は
`./.hermes/plugins/<name>/` に置かれます。

```
plugins/memory/my-provider/
├── __init__.py      # MemoryProvider implementation + register() entry point
├── plugin.yaml      # Metadata (name, description, hooks)
└── README.md        # Setup instructions, config reference, tools
```

### パッケージ型のプロバイダ {#packaged-provider}

pip で入れるプロバイダは、`hermes_agent.memory_providers` グループに
エントリポイントを公開します。エントリポイントの名前が、利用者が
`memory.provider` に指定するプロバイダ名になり、その値はプロバイダの
`register(ctx)` 関数を指します。

```toml title="pyproject.toml"
[project.entry-points."hermes_agent.memory_providers"]
my-provider = "my_provider:register"
```

エントリポイントは **パッケージ** か、その中の `register(ctx)` に向けてください。
実装・スキル・その他のリソースは、通常の Python パッケージの構成のまま置けます。
`$HERMES_HOME/plugins/` の下にコピーする必要はありません。

パッケージのエントリポイントでも、ディレクトリ型の設置と同じことがすべてできます。
import ではなくディスクから読まれる 2 つのファイル — `config_schema.py`
（ダッシュボードの設定パネル）と `cli.py`（`hermes <provider>` のサブコマンド）
— も同様です。どちらもパッケージの `__init__.py` の隣で探されるので、これらを
含めるなら、単一モジュールではなくパッケージをエントリポイントに指定してください。

## MemoryProvider の抽象基底クラス {#the-memoryprovider-abc}

プラグインは `agent/memory_provider.py` にある抽象基底クラス `MemoryProvider` を実装します。

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

| メソッド | 呼ばれる場面 | 実装は必須か |
|--------|-----------|-----------------|
| `name`（プロパティ） | 常時 | **必須** |
| `is_available()` | エージェント初期化時、有効化の前 | **必須** — ネットワーク通信は禁止 |
| `initialize(session_id, **kwargs)` | エージェント起動時 | **必須** |
| `get_tool_schemas()` | 初期化後、ツールを差し込むとき | **必須** |
| `handle_tool_call(tool_name, args, **kwargs)` | エージェントがあなたのツールを使うとき | **必須**（ツールを持つ場合） |

### 設定 {#config}

| メソッド | 目的 | 実装は必須か |
|--------|---------|-----------------|
| `get_config_schema()` | `hermes memory setup` 用に設定項目を宣言する | **必須** |
| `save_config(values, hermes_home)` | 秘密でない設定を、自前の場所に書き出す | **必須**（環境変数だけで完結する場合を除く） |

### 任意のフック {#optional-hooks}

| メソッド | 呼ばれる場面 | 使いどころ |
|--------|-----------|----------|
| `system_prompt_block()` | システムプロンプトの組み立て時 | プロバイダの固定的な情報 |
| `prefetch(query, *, session_id="")` | API 呼び出しのたびに、その前 | 思い出した文脈を返す |
| `queue_prefetch(query, *, session_id="")` | 各ターンの終わり | 次のターンに備えて温めておく |
| `sync_turn(user, assistant, *, session_id="", messages=None)` | 各ターンが終わったあと | 会話を保存する |
| `on_session_end(messages)` | 会話の終了時 | 最後の抽出と書き出し |
| `on_pre_compress(messages)` | コンテキスト圧縮の前 | 捨てられる前に気づきを保存する |
| `on_memory_write(action, target, content)` | 組み込みの記憶への書き込み時 | 自分のバックエンドにも写す |
| `shutdown()` | プロセス終了時 | 接続の後片付け |

## 圧縮前のチェックポイント（失敗したら止める） {#pre-compress-checkpoints-fail-closed}

`on_pre_compress()` は既定では「できる範囲でやる」動作です。プロバイダが例外を投げても、
ホストは失敗を記録したうえで圧縮を続けます。気づきの抽出であればこれが妥当な既定値ですが、
情報が失われる書き換えの *前* に会話の記録を永続的な保存先へ退避することが役目のプロバイダには、
まったく適していません。そうした用途のために、ホストは任意で使えるチェックポイントの取り決め
（API v2）を用意しています。

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

運用者は、環境ごとにこの強制を有効にできます。

```yaml
compression:
  checkpoint_required: true   # default: false
```

この関門を有効にすると、API に対応していると宣言した有効なプロバイダが
チェックポイントを終えていない限り、情報が失われる書き換えの前に圧縮が
**必ず止まります**。圧縮前の会話記録はそのまま残り、圧縮の試みは
`BLOCKED_MISSING_PREREQUISITE` で失敗し、保存先が復旧すれば再試行できます。
関門を切っている場合（既定）、既存のプロバイダの動作は何も変わりません。

この関門は、Hermes の要約器だけでなく、圧縮を行うあらゆる主体に効きます。
サーバー側のネイティブ圧縮（`compression.codex_responses_native`）は関門が
有効な間は抑止され、ターン後の細かい圧縮（`compression.micro_compact`）は
エージェント初期化時に強制的に無効化されます（これは古いやり取りを
巻き取り式の要約に吸収する処理で、その経路にはチェックポイントのフックが
ないためです）。`codex_app_server` の API モードもエージェント初期化時に
拒否されます。codex エージェントは自分のスレッドを自分で圧縮しており、
圧縮前の境界を正しく取れないため、必要なチェックポイントを保証できないからです。
チェックポイントを理解する Hermes の圧縮器だけが、情報を失う書き換えを行えます。

プロバイダが受け取る内容は、宣言した API のバージョンによって変わります。
バージョン 1 のプロバイダ（暗黙の既定であり、既存のプロバイダはすべてこれ）は
従来どおりの取り決めで、生のメッセージ一覧をそのまま受け取ります。
バージョン 2 のチェックポイント対応プロバイダは、代わりに整えられた直接の証拠を
受け取ります。ユーザーとアシスタントのテキスト行だけで、ツールの結果・システム
メッセージ・アシスタントメッセージの `tool_calls` の中身（本文の文章は残ります）・
過去の圧縮要約は、ホスト側で取り除かれます。過去の要約は、プロセスの再起動を
またいで残る `_compressed_summary` というメッセージの目印で見分けるので、
再開したセッションで二次的な要約が保存先へ逆流することはありません。

**チェックポイントは何度実行しても同じ結果になるように作ってください。** 失敗して
止まったあと、次の圧縮の試みは同じ会話記録で `on_pre_compress()` をもう一度呼びます。
少し伸びただけの会話記録からは、ほとんど重なった証拠が出てきます。保存先への
書き込みは内容（たとえば会話記録のダイジェスト）を鍵にして upsert してください。
そうすれば、再試行や重複が重複した保存を積み上げず、まとめられます。

取り決めの検証テスト: `tests/agent/test_pre_compress_checkpoint_contract.py`

## 設定スキーマ {#config-schema}

`get_config_schema()` は、`hermes memory setup` が使う設定項目の記述を一覧で返します。

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

:::tip 最小限のスキーマと全部入りのスキーマ
`get_config_schema()` に書いた項目は、`hermes memory setup` の途中で全部尋ねられます。選択肢の多いプロバイダは、スキーマを小さく保つべきです。利用者が **必ず** 設定しなければならない項目（API キーや必須の認証情報）だけを入れてください。任意の設定は、セットアップ中に全部尋ねるのではなく、設定ファイルの説明（たとえば `$HERMES_HOME/myprovider.json`）に書いておきます。こうするとセットアップは速いまま、細かい設定にも対応できます。例としては Supermemory のプロバイダを見てください。尋ねるのは API キーだけで、ほかの選択肢はすべて `supermemory.json` にあります。
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

環境変数だけで完結するプロバイダは、既定の何もしない実装のままで構いません。

## プラグインのエントリポイント {#plugin-entry-point}

```python
def register(ctx) -> None:
    """Called by the memory plugin discovery system."""
    ctx.register_memory_provider(MyMemoryProvider())
```

プロバイダは、同じコールバックから読み取り専用のスキルを公開することもできます。
スキルはエントリポイントの名前で修飾され、その記憶プロバイダが有効なときにだけ
読み込まれます。

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

`my-provider` のエントリポイントが有効なとき、このスキルは `skill_view()` から
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

**`sync_turn()` は処理を待たせてはいけません。** バックエンドに待ち時間がある場合（API 呼び出しや LLM の処理など）は、デーモンスレッドで作業を回してください。

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

`messages` は任意で、そのターンが終わった時点での OpenAI 形式の会話の文脈です。
渡される場合は、ユーザーとアシスタントのメッセージ、アシスタントのツール呼び出し、
ツールの結果メッセージが含まれます。生のターンの文脈が要らないプロバイダは
`messages` の引数を省けます。Hermes は従来どおりの形で呼び出し続けます。

クラウド型のプロバイダは、`messages` のどの部分が端末の外へ送られるかを説明しておいてください。
ツールの呼び出しや結果には、ファイルのパス、コマンドの出力、その他の作業環境のデータが含まれることがあります。

## プロファイルの分離 {#profile-isolation}

保存先のパスは **必ず** `initialize()` の `hermes_home` 引数から組み立ててください。`~/.hermes` を直接書いてはいけません。

```python
# CORRECT — profile-scoped
from hermes_constants import get_hermes_home
data_dir = get_hermes_home() / "my-provider"

# WRONG — shared across all profiles
data_dir = Path("~/.hermes/my-provider").expanduser()
```

## テスト {#testing}

端から端まで通した書き方は、`tests/agent/test_memory_provider.py` と、その周辺の記憶まわりのテスト（`tests/agent/test_memory_session_switch.py`、`tests/agent/test_memory_user_id.py`、`tests/run_agent/test_memory_provider_init.py`）を参照してください。

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

## CLI のコマンドを足す {#adding-cli-commands}

記憶プロバイダのプラグインは、自前の CLI サブコマンド群を登録できます（たとえば `hermes my-provider status`、`hermes my-provider config`）。これは決められた置き方で見つける仕組みなので、本体側のファイルに手を入れる必要はありません。

### 仕組み {#how-it-works}

1. プラグインのディレクトリに `cli.py` を置きます
2. argparse の構成を組み立てる `register_cli(subparser)` 関数を定義します
3. 記憶プラグインの仕組みが、起動時に `discover_plugin_cli_commands()` で見つけます
4. コマンドが `hermes <provider-name> <subcommand>` として現れます

**有効なプロバイダだけに絞られます:** 作った CLI コマンドは、そのプロバイダが設定上の `memory.provider` として有効なときにだけ現れます。利用者がそのプロバイダを設定していなければ、`hermes --help` にも出てきません。

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

### 参考になる実装 {#reference-implementation}

13 個のサブコマンド、プロファイルをまたぐ管理（`--target-profile`）、設定の読み書きまでそろった実例は、`plugins/memory/honcho/cli.py` を参照してください。

### CLI を含めたディレクトリ構成 {#directory-structure-with-cli}

```
plugins/memory/my-provider/
├── __init__.py      # MemoryProvider implementation + register()
├── plugin.yaml      # Metadata
├── cli.py           # register_cli(subparser) — CLI commands
└── README.md        # Setup instructions
```

## プロバイダは 1 つだけという決まり {#single-provider-rule}

外部の記憶プロバイダは、同時に **1 つ** しか有効にできません。2 つめを登録しようとすると、MemoryManager が警告を出して受け付けません。これはツールのスキーマが膨らむことと、バックエンド同士がぶつかることを防ぐためです。
