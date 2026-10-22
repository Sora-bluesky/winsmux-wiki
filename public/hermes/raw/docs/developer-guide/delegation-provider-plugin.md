---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "委任プロバイダーのプラグイン"
description: ""
upstream_path: developer-guide/delegation-provider-plugin.md
upstream_blob: 80b8f40472c3f87cdb1f5734387313f04076ccdf
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/delegation-provider-plugin
---

# 委任プロバイダーのプラグイン {#delegation-provider-plugins}

委任プロバイダーは、**`delegate_task` の各タスクをどのような子の実行にするか**を決めます。つまり、サブエージェントが使うモデル、
プロバイダー、エンドポイント、推論の強さ（reasoning effort）や、どの Hermes プロファイルとして動くかを決めます。
また、`delegate_task` のスキーマにタスクごとのパラメーター（プロファイル名の列挙や、タイトル付きのモデルの選択肢の列挙など）を足して、
モデルがタスクごとに経路を選べるようにすることもできます。

サブエージェントのライフサイクル全体は Hermes 本体が持ち続けます。起動、隔離、leaf/orchestrator の役割、深さの
上限、同時実行数、バックグラウンドの完了単位、停止の一斉伝達、結果の組み立て、`output_schema` の
検証、進捗の表示です。プロバイダーが答えるのは「このタスクはどの経路を通るか」だけです。

有効なプロバイダーは `config.yaml` の `delegation.backend` で決まり、プロバイダー独自の設定は
`delegation.backends.<backend name>` の下に置きます。`default` の方針は現在の動きそのものです。どの子も
`delegation` セクション（`delegation.provider`、`delegation.model`、`delegation.base_url` など）に従い、
それらが空なら親の経路を引き継ぎます。この方針自体もプラグインで、同梱の
`plugins/delegation/default/`（`kind: backend`、常に読み込まれます）として、皆さんのプラグインと同じ
`ctx.register_delegation_provider()` という接続口から登録されています。もっとも小さい完全な例でもあります。
設定されたバックエンドがインストールされていない、または利用できないと報告した場合は、**安全側に倒して止まります**（fail closed）。
`delegate_task` はバックエンド名と直し方を示すツールエラーを返し、子は1つも起動せず、そのスキーマのパラメーターも
現れません。セッションごとにバックエンドを切り替えることもできます（後述の `agent.delegation_backends`）。

## ひな形 {#skeleton}

```python
# ~/.hermes/plugins/delegation-tiers/__init__.py
from agent.delegation_provider import DelegationProvider, DelegationRouteError

class Tiers(DelegationProvider):
    @property
    def name(self) -> str:
        return "tiers"                      # delegation.backend: tiers

    def task_parameters(self, config):
        tiers = self.settings(config).get("tiers") or []  # delegation.backends.tiers.tiers
        return {"tier": {
            "type": "string",
            "enum": [t["name"] for t in tiers],
            "description": "; ".join(f"{t['name']}: {t['description']}" for t in tiers),
        }}

    def description(self, config):
        return "Set `tier` per task to pick the model that fits it."

    def route_task(self, task, config):
        for t in self.settings(config).get("tiers") or []:
            if t["name"] == task.get("tier"):
                return {"provider": t["provider"], "model": t["model"], "label": t["name"]}
        if task.get("tier"):
            raise DelegationRouteError(f"Unknown tier {task['tier']!r}.")
        return dict(config)                 # no tier: the default route

def register(ctx):
    ctx.register_delegation_provider(Tiers())
```

```yaml
# plugin.yaml
name: delegation-tiers
version: 1.0.0
description: Pick a model tier per subagent.
```

```yaml
# config.yaml
delegation:
  backend: tiers
  backends:
    tiers:                                  # == the backend name
      tiers:
        - {name: quick, description: Lookups and summaries., provider: openrouter, model: google/gemini-3-flash-preview}
```

```bash
hermes plugins enable delegation-tiers
```

## インターフェース {#the-interface}

`DelegationProvider`（`agent/delegation_provider.py`）は、共通の `ProviderBase` を継承したクラスです。どの
メソッドも `config` を受け取ります。これは、有効なプロファイルの `config.yaml` にある `delegation` セクションです。`dict(config)`
が既定の経路で、`self.settings(config)` があなたのバックエンド専用のブロック、つまり
`delegation.backends.<name>` です（未設定なら空）。独自の設定はここに置き、本体の
`delegation` のキーと並べて置かないでください。

| メンバー | 必須 | 取り決め |
|---|---|---|
| `name` | はい | `delegation.backend` に書く値です。`default` は同梱の既定の方針のものです。 |
| `route_task(task, config)` | はい | 1つのタスクの経路を表す dict を返します。`task` には `goal`、`context`、`index` と、あなたのパラメーターにモデルが渡した値が入っています。断るときは `DelegationRouteError` を送出します。そのメッセージが、モデルが読むツールエラーになります。 |
| `task_parameters(config)` | いいえ | `{name: json_schema}` を返すと、`tasks.items.properties` に合わせて入ります。本体は `route_task` を実行する前に `enum` を検査し、本体が持つ名前（`goal`、`context`、`index`、`output_schema`、`images`、`group`、`role`、`toolsets`、`provider`、`model`、`base_url`、`api_key`、`api_mode`、`acp_command`、`acp_args`）は受け付けません。 |
| `description(config)` | いいえ | `delegate_task` の説明文の末尾に足される案内です。 |
| `is_available()` | いいえ | ネットワーク呼び出しはしないでください。`False` を返すと、あなたのバックエンドが選ばれている間、委任は安全側に倒して止まります。`delegate_task` はそのバックエンド名と直し方（`/delegation default`、または `hermes config set delegation.backend default`）を示すツールエラーを返し、勝手に `default` へ切り替えることはありません。 |
| `settings(config)` | 継承 | `delegation.backends.<name>` を mapping として返します（未設定なら空）。上書きしないでください。 |

### 経路 {#routes}

経路は、次のいずれかのキーを持つ dict です。

- `model`、`provider`、`base_url`、`api_key`、`api_mode`、`request_overrides`、`reasoning_effort`、
  `fallback_providers`: `delegation` セクションとまったく同じ形で、同じ資格情報の解決処理で解決されます。空の経路は親の経路を引き継ぎ、`dict(config)` は既定の経路です。
  `reasoning_effort` が既知の段階（`none`、`minimal`、`low`、`medium`、`high`、
  `xhigh` など）でない場合は、親の段階にフォールバックせず、ツールエラーでそのタスクを断ります。
  `delegation.reasoning_effort` の値そのものは、従来どおり「警告して引き継ぐ」決まりのままです。
- `service_tier`: `normal`、`fast`、`ultrafast` のいずれかです。本体は、解決された経路に対して `/fast` と同じ
  関門で検査します（`ultrafast` の場合は、サインインしている Codex アカウントのカタログでも検査します）。経路が提供していない段階なら
  そのタスクを断ります。そうでなければその子にだけ適用し、子を組み立てたあとにもう一度適用するので、
  カスタムプロバイダーの `extra_body` で別の段階に戻されることはありません。
- `profile`: Hermes プロファイルの名前です。子は**そのプロファイルとして**動きます。つまり、そのプロファイルの `config.yaml`、
  主モデルと資格情報（`model.default` の別名や名前付きのプロバイダーは、CLI の起動時とまったく同じように解決されます）、資格情報のプール、
  フォールバックの連鎖、推論の設定（`agent.reasoning_effort` と `agent.reasoning_overrides`）、スキル、`SOUL.md`、ターミナルのポリシーを使います。
  本体は、子の組み立て、資格情報の貸し出し、会話の各ターンのまわりで、そのプロファイルのスコープ（HERMES_HOME の上書き、
  秘密情報のスコープ、多重化の扱い、ターミナルのポリシー）を結び付けます。これは多重化されたゲートウェイが振り分けたターンに
  かけるのと同じ結び付けなので、対象のプロファイルに無い秘密情報が、起動した側のプロファイルの環境から読まれることはありません。
  子の会話記録は起動した側のプロファイルのセッションデータベースに残り（親の仕事だからです）、ツールセットも親のものを使います。
  プロファイルの経路では、ほかの経路のキーは無視されます。
- `label`: 経路を見分けるための短い文字列です（選択肢のタイトルやプロファイル名など）。

知らないキーは捨てられます。プロファイルの経路では、`service_tier` と `reasoning_effort` も無視されます。

プロファイルでない経路のうち、自分の `fallback_providers` を持たないものには `delegation.fallback_providers` が使われます。ある経路で
フォールバックを無効にするには `"fallback_providers": []` を返してください。プロファイルの経路は、そのプロファイルの連鎖を使い続けます。

### 断るのはタスク単位 {#refusals-are-per-task}

`route_task` からの `DelegationRouteError`、あなたのバックエンドが宣言していないパラメーター、パラメーターの
`enum` に無い値、知らない
`reasoning_effort`、経路が提供していない段階、経路が解決できない資格情報は、いずれも**そのタスクだけ**を断ります。そのタスクの子は組み立てられず、結果の項目は
`{"status": "error", "error": "<your message>", "route": {"backend": "<name>", "refused": true}}` になり、
ほかのタスクは実行されます。バックグラウンドの呼び出しでは、断った項目が投入時のペイロードの `refused` の下に並びます。
呼び出し全体がツールエラーになるのは、すべてのタスクが断られたときだけです。

### 結果の `route` {#result-route}

既定以外のバックエンドが振り分けたタスクの結果の項目には、どれも `route` が付きます。中身はバックエンド、ラベル
（設定されている場合）、そして子が実際に何で動いたかで、これは結果を組み立てるときに子から読み取ります。

```json
"route": {"backend": "model_map", "label": "deep", "provider": "openai-codex", "model": "gpt-6-astra",
          "reasoning_effort": "high", "service_tier": "fast"}
```

プロバイダーの既定が使われた場合、`reasoning_effort` は `null` です。フォールバックのプロバイダーが代わりに動いた場合は `fallback_activated: true` が加わります。`default` のバックエンドの子では、結果の項目は変わりません。

## 選択画面の表示情報とセッションの切り替え {#picker-metadata-and-session-switching}

`display_name` と `summary`（利用者向けの1行。モデルには決して見せません）は、`/delegation` のような選択画面で
あなたのバックエンドの表示に使われます。プラグインからは `ctx.delegation_backends` を使います（メソッドは同じで、`list_backends()` は
ただの dict を返します）。これはホスト側をリモートで呼ぶ窓口なので、`plugins.isolation: host` のもとでは、プラグインのホストではなく
Hermes のプロセスに作用します。本体のコードは `agent.delegation_backends` を直接呼びます。

| 呼び出し | 動き |
|---|---|
| `list_backends() -> list[BackendInfo]` | 先頭に `default`、続いて登録されたすべてのバックエンドを返します。それぞれ `name`、`label`、`description`、`available`、`reason`（利用できないときの直し方）を持ちます。 |
| `get_session_backend(session_key) -> str \| None` | そのセッションの切り替え先です。`config.yaml` に従っているときは `None` です。 |
| `set_session_backend(session_key, name \| None)` | 1つのセッションだけを切り替えます（`None` で解除）。動かせないバックエンドを指定すると、理由を添えて `ValueError` を送出します。 |
| `set_global_backend(name, *, session_key="")` | 有効なプロファイルの `config.yaml` に `delegation.backend` を書き込み、そのセッションの切り替えを外します。パッケージマネージャーで管理されたインストールでは `PermissionError` を送出します。 |

モデルの経路を編集するプラグインのコマンドは、対話型のモデル選択画面を自分の見出しで使い回せます。
`hermes_cli.auth_model_picker.prompt_model_selection(model_ids, current_model="", title="Select the model for this route:")`
は選ばれたモデルの id を返し、取り消されたときは `None` を返します。

`session_key` は、プラグインのコマンドのハンドラーが受け取る `session_key` です。セッションを切り替えると、
そのセッションの次の `delegate_task` の呼び出しから振り分けが変わります。一方で `delegate_task` のスキーマ（あなたのパラメーター）は
`config.yaml` に従います。キャッシュされたプロンプトの一部で、会話の途中で作り直されることがないからです。そのため
切り替えのあとも、モデルが前のバックエンドのパラメーターを送ってくることがあります。本体は、そのパラメーターを捨てて
新しいバックエンドの既定の経路でタスクを実行するのではなく、セッションのバックエンドが宣言していないパラメーターを持つタスクを
1つずつ断ります（ほかの断りと同じく、タスク単位で安全側に倒して止まります）。

```text
Task 0: this session's delegation backend is 'profile_routes', which does not take 'option' (declared by
'model_map'), so this task was not started. Run `/delegation profile_routes --global` then `/new` for a
session whose delegate_task choices match 'profile_routes', or `/delegation model_map` to switch this
session back to the saved backend.
```

`/new` は保存されたバックエンド（`delegation.backend`）で始まるので、直し方は、まずセッションで選んだものを保存するか、
保存されているものを名指しする形になります。セッションが `config.yaml` に従っている場合（会話の途中で設定が変わった場合）は、直し方は `/new` だけです。
インストールされているどのバックエンドも宣言していないパラメーターも同じように断られ、その場合は先頭に「Resend it without ...」と付きます。

## プロンプトのキャッシュ {#prompt-caching}

`delegate_task` の定義は、あなたのパラメーターと説明文も含めて、セッションのツール一覧を組み立てるときに
一度だけ作られます。`task_parameters` と `description` は、同じ `config` に対して決定的でなければなりません。同じ設定なら、同じバイト列です。
時刻やネットワーク、会話の途中で変わるものからは決して作らないでください。

## プロセスの隔離 {#process-isolation}

引数と戻り値はすべてただの JSON なので、プロバイダーは
`plugins.isolation: host` のもとでもそのまま動きます。Hermes は `DelegationProvider` を継承した代理のオブジェクトを持ち、すべての呼び出しは
プラグインのホストのプロセスで実行されます。

## テスト {#testing}

一時的な `HERMES_HOME` を用意し、その
`config.yaml` で `plugins.enabled`、`delegation.backend`、`delegation.backends.<name>` を設定したうえで、本物の検出経路からプラグインを読み込みます。そのうえで動きを検査します。
`tools.registry.registry.get_definitions({"delegate_task"})` から得た `delegate_task` の定義にあなたのパラメーターが含まれていること、
そして `tools.delegate_tool.delegate_task(...)` が各子に、あなたの選んだ経路を渡していることです。
Hermes のリポジトリにある `tests/tools/test_delegation_backends.py` が完全な例です。
