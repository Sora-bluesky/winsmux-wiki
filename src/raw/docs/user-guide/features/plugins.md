---
title: "プラグイン"
description: "プラグインのしくみを使って、独自のツール・フック・連携で Hermes を拡張します"
upstream_path: user-guide/features/plugins.md
upstream_blob: d487f2c5fa5dcd825efad12704de52470900f4d8
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins
---

# プラグイン {#plugins}

Hermes には、本体のコードに手を入れずに独自のツール・フック・連携を足すためのプラグインのしくみがあります。

自分用、チーム用、あるいは 1 つのプロジェクト用に独自のツールを作りたいなら、
たいていはこちらが正しい道です。開発者向けの
[ツールを追加する](/hermes/docs/developer-guide/adding-tools/) のページは、`tools/` と
`toolsets.py` に置かれる Hermes 本体の組み込みツール向けです。

**→ [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/)** — 動く例を最後まで通した手順書です。

## ざっと見る {#quick-overview}

`plugin.yaml` と Python のコードを入れたディレクトリを `~/.hermes/plugins/` に置きます。

```
~/.hermes/plugins/my-plugin/
├── plugin.yaml      # manifest
├── __init__.py      # register() — wires schemas to handlers
├── schemas.py       # tool schemas (what the LLM sees)
└── tools.py         # tool handlers (what runs when called)
```

Hermes を起動すると、作ったツールが組み込みのツールと並んで現れます。モデルはすぐに呼び出せます。

### 動く最小の例 {#minimal-working-example}

`hello_world` というツールを足し、フックですべてのツール呼び出しを記録するだけの、完結したプラグインです。

**`~/.hermes/plugins/hello-world/plugin.yaml`**

```yaml
name: hello-world
version: "1.0"
description: A minimal example plugin
```

**`~/.hermes/plugins/hello-world/__init__.py`**

```python
"""Minimal Hermes plugin — registers a tool and a hook."""

def register(ctx):
    # --- Tool: hello_world ---
    schema = {
        "name": "hello_world",
        "description": "Returns a friendly greeting for the given name.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name to greet",
                }
            },
            "required": ["name"],
        },
    }

    def handle_hello(params, **kwargs):
        del kwargs
        name = params.get("name", "World")
        return json.dumps({"success": True, "greeting": f"Hello, {name}!"})

    ctx.register_tool(
        name="hello_world",
        toolset="hello_world",
        schema=schema,
        handler=handle_hello,
    )

    # --- Hook: log every tool call ---
    def on_tool_call(tool_name, params, result):
        print(f"[hello-world] tool called: {tool_name}")

    ctx.register_hook("post_tool_call", on_tool_call)
```

この 2 つのファイルを `~/.hermes/plugins/hello-world/` に置いて Hermes を再起動すれば、モデルはすぐに `hello_world` を呼べます。フックのほうは、ツールが呼ばれるたびにログを 1 行出します。

モデルに見せるツールの説明は `schema["description"]` に書きます。任意で渡せる `ctx.register_tool(description=...)` の値は、`ToolEntry` の登録情報として別に持たれるものです。省略すればスキーマの説明が使われますが、Hermes がそれを、`description` のないスキーマへ書き戻すことはありません。文言はスキーマ側に一度だけ書くのがおすすめです。両方に書く場合は内容をそろえてください。モデルが見るのはスキーマ側の値です。

`./.hermes/plugins/` 以下のプロジェクト固有のプラグインは、既定では無効です。信用できるリポジトリでだけ、Hermes を起動する前に `HERMES_ENABLE_PROJECT_PLUGINS=true` を設定して有効にしてください。

## プラグインでできること {#what-plugins-can-do}

下に挙げる `ctx.*` の API は、プラグインの `register(ctx)` 関数の中で使えます。

| できること | 書き方 |
|-----------|-----|
| ツールを足す | `ctx.register_tool(name=..., toolset=..., schema=..., handler=...)` |
| フックを足す | `ctx.register_hook("post_tool_call", callback)` |
| スラッシュコマンドを足す | `ctx.register_command(name, handler, description)` — CLI とゲートウェイのセッションに `/name` を足します |
| コマンドからツールを呼ぶ | `ctx.dispatch_tool(name, args)` — 登録済みのツールを、親エージェントの文脈を自動でつないだ状態で呼びます |
| CLI のコマンドを足す | `ctx.register_cli_command(name, help, setup_fn, handler_fn)` — `hermes <plugin> <subcommand>` を足します |
| メッセージを差し込む | `ctx.inject_message(content, role="user", session_key=...)` - [メッセージを差し込む](#injecting-messages) を参照 |
| データファイルを同梱する | `Path(__file__).parent / "data" / "file.yaml"` |
| スキルを同梱する | `ctx.register_skill(name, path)` — `plugin:skill` という名前空間になり、`skill_view("plugin:skill")` で読み込みます |
| 環境変数を必須にする | plugin.yaml の `requires_env: [API_KEY]` — `hermes plugins install` のときに入力を求められます |
| pip で配布する | `[project.entry-points."hermes_agent.plugins"]` |
| ゲートウェイのプラットフォーム（Discord、Telegram、IRC など）を登録する | `ctx.register_platform(name, label, adapter_factory, check_fn, ...)` — [プラットフォームアダプターを追加する](/hermes/docs/developer-guide/adding-platform-adapters/) を参照 |
| 画像生成のバックエンドを登録する | `ctx.register_image_gen_provider(provider)` — [画像生成プロバイダーのプラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/) を参照 |
| 動画生成のバックエンドを登録する | `ctx.register_video_gen_provider(provider)` — [動画生成プロバイダーのプラグイン](/hermes/docs/developer-guide/video-gen-provider-plugin/) を参照 |
| コンテキスト圧縮のエンジンを登録する | `ctx.register_context_engine(engine)` — [コンテキストエンジンのプラグイン](/hermes/docs/developer-guide/context-engine-plugin/) を参照 |
| ターミナル実行のバックエンド（クラウドのサンドボックス）を登録する | `ctx.register_terminal_environment_provider(provider)` — [ターミナル環境のプラグイン](/hermes/docs/developer-guide/terminal-environment-plugin/) を参照 |
| 人が承認する画面の出し先を変える | `ctx.register_approval_transport(name, present_fn)` — [承認の出し先](#approval-transports) を参照 |
| 記憶のバックエンドを登録する | `plugins/memory/<name>/__init__.py` で `MemoryProvider` を継承します — [記憶プロバイダーのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/) を参照（別の検出のしくみを使います） |
| ホスト側の LLM 呼び出しを走らせる | `ctx.llm.complete(...)` / `ctx.llm.complete_structured(...)` — ユーザーが使っているモデルと認証情報を借りて 1 回だけ生成させます。JSON スキーマによる検証も付けられます。[プラグインからの LLM 利用](/hermes/docs/developer-guide/plugin-llm-access/) を参照 |
| MCP のツールを呼ぶ（権限が必要） | `ctx.call_mcp(server, tool, arguments, timeout=30)` — [プラグインから MCP サーバーを呼ぶ](#calling-mcp-servers-from-plugins) を参照 |
| 推論のバックエンド（LLM プロバイダー）を登録する | `plugins/model-providers/<name>/__init__.py` の `register_provider(ProviderProfile(...))` — [モデルプロバイダーのプラグイン](/hermes/docs/developer-guide/model-provider-plugin/) を参照（別の検出のしくみを使います） |

## プラグインの検出 {#plugin-discovery}

| 置き場所 | パス | 使いどころ |
|--------|------|----------|
| 同梱 | `<repo>/plugins/` | Hermes に最初から入っています — [同梱プラグイン](/hermes/docs/user-guide/features/built-in-plugins/) を参照 |
| ユーザー | `~/.hermes/plugins/` | 個人用のプラグイン |
| プロジェクト | `.hermes/plugins/` | プロジェクト固有のプラグイン（`HERMES_ENABLE_PROJECT_PLUGINS=true` が必要です） |
| pip | `hermes_agent.plugins` の entry_points | 配布されたパッケージ |
| Nix | `services.hermes-agent.extraPlugins` / `extraPythonPackages` | NixOS の宣言的なインストール — [Nix の設定](/hermes/docs/getting-started/nix-setup/#plugins) を参照 |

名前がぶつかった場合、あとの置き場所が先の置き場所を上書きします。つまり、同梱プラグインと同じ名前のユーザープラグインを置くと、そちらが使われます。

### プラグインの下位分類 {#plugin-sub-categories}

それぞれの置き場所の中で、Hermes は特別な検出のしくみに振り分けるための下位ディレクトリも見ています。

| 下位ディレクトリ | 何を置くか | 検出のしくみ |
|---|---|---|
| `plugins/`（直下） | 一般のプラグイン — ツール、フック、スラッシュコマンド、CLI コマンド、同梱スキル | `PluginManager`（種別: `standalone` または `backend`） |
| `plugins/platforms/<name>/` | ゲートウェイのチャネルアダプター（`ctx.register_platform()`） | `PluginManager`（種別: `platform`、1 階層深いところ） |
| `plugins/image_gen/<name>/` | 画像生成のバックエンド（`ctx.register_image_gen_provider()`） | `PluginManager`（種別: `backend`、1 階層深いところ） |
| `plugins/memory/<name>/` | 記憶プロバイダー（`MemoryProvider` を継承） | `plugins/memory/__init__.py` にある **専用の読み込み処理**（種別: `exclusive` — 同時に有効なのは 1 つだけ） |
| `plugins/context_engine/<name>/` | コンテキスト圧縮のエンジン（`ctx.register_context_engine()`） | `plugins/context_engine/__init__.py` にある **専用の読み込み処理**（同時に有効なのは 1 つだけ） |
| `plugins/model-providers/<name>/` | LLM プロバイダーの定義（`register_provider(ProviderProfile(...))`） | `providers/__init__.py` にある **専用の読み込み処理**（最初の `get_provider_profile()` の呼び出し時にまとめて走査します） |

`~/.hermes/plugins/model-providers/<name>/` と `~/.hermes/plugins/memory/<name>/` に置いたユーザープラグインは、同じ名前の同梱プラグインを上書きします。`register_provider()` と `register_memory_provider()` では、あとに登録したほうが勝ちます。ディレクトリを置くだけで、リポジトリに手を入れずに組み込みの実装を差し替えられます。

## プラグインは自分で有効にする（一部例外あり） {#plugins-are-opt-in-with-a-few-exceptions}

**一般のプラグインと、ユーザーが入れたバックエンドは既定では無効です。** 検出はされるので `hermes plugins` や `/plugins` には出てきますが、`~/.hermes/config.yaml` の `plugins.enabled` にそのプラグイン名を書くまで、フックもツールも読み込まれません。あなたがはっきり同意していない第三者のコードが動くのを、これで防いでいます。

```yaml
plugins:
  enabled:
    - my-tool-plugin
    - disk-cleanup
  disabled:       # optional deny-list — always wins if a name appears in both
    - noisy-plugin
```

状態を切り替える方法は 3 つあります。

```bash
hermes plugins                    # interactive toggle (space to check/uncheck)
hermes plugins enable <name>      # add to allow-list
hermes plugins disable <name>     # remove from allow-list + add to disabled
```

`hermes plugins install owner/repo` のあとには `Enable 'name' now? [y/N]` と聞かれます。既定は「いいえ」です。スクリプトから入れるときは `--enable` か `--no-enable` を付けて、この確認を飛ばせます。

同じ結果を再現できるようにするには、書き換えの効かないコミットを完全な形で指定します
（タグ、ブランチ、短縮した SHA は受け付けません）。

```bash
hermes plugins install owner/repo --ref 0123456789abcdef0123456789abcdef01234567
```

Hermes はそのコミットを切り離した状態でチェックアウトし、`HEAD` が指定した SHA と
完全に一致することを確かめたうえで、取得元・入れたリビジョン・固定の有無を今の
プロファイルに記録します。固定したプラグインを `hermes plugins update` が動かすことは
ありません。別のコミットに移したいときは
`hermes plugins install <source> --force --ref <new-commit>` で明示的に指定してください。
プロファイルに記録されるインストール情報には、設定値も環境変数の値も、
秘密の情報も、権限の付与状況も含まれません。

### 許可一覧が対象にしないもの {#what-the-allow-list-does-not-gate}

いくつかの種類のプラグインは `plugins.enabled` を通りません。これらは Hermes に元から備わっている部分で、既定で止めてしまうと基本的な機能が動かなくなるからです。

| プラグインの種類 | 代わりの有効化のしかた |
|---|---|
| **同梱のプラットフォームプラグイン**（`plugins/platforms/` 以下の IRC、Teams など） | 同梱のゲートウェイのチャネルをどれも使えるように自動で読み込まれます。実際のチャネルは `config.yaml` の `gateway.platforms.<name>.enabled` で有効にします。 |
| **同梱のバックエンド**（`plugins/image_gen/` 以下の画像生成プロバイダーなど） | 既定のバックエンドがそのまま動くように自動で読み込まれます。選択は `config.yaml` の `<category>.provider` で行います（たとえば `image_gen.provider: openai`）。 |
| **記憶プロバイダー**（`plugins/memory/`） | すべて検出されますが、有効になるのはちょうど 1 つで、`config.yaml` の `memory.provider` で選びます。 |
| **コンテキストエンジン**（`plugins/context_engine/`） | すべて検出されますが、有効になるのは 1 つで、`config.yaml` の `context.engine` で選びます。 |
| **モデルプロバイダー**（`plugins/model-providers/`） | `plugins/model-providers/` 以下の同梱プロバイダーは、最初の `get_provider_profile()` の呼び出し時にまとめて検出・登録されます。ユーザーは `--provider` か `config.yaml` で、そのつど 1 つを選びます。 |
| **pip で入れた `backend` プラグイン** | `plugins.enabled` で自分で有効にします（一般のプラグインと同じです）。 |
| **ユーザーが入れたプラットフォーム**（`~/.hermes/plugins/platforms/` 以下） | `plugins.enabled` で自分で有効にします。第三者製のゲートウェイアダプターには、はっきりした同意が必要です。 |

まとめると、**同梱の「そのまま動く」土台は自動で読み込まれ、第三者製の一般プラグインは自分で有効にする** ということです。`plugins.enabled` の許可一覧は、ユーザーが `~/.hermes/plugins/` に置いた任意のコードに対する関門です。

### 承認の出し先 {#approval-transports}

承認の出し先（approval transport）が変えるのは、Hermes がすでに出すツール承認の求めを
**人がどこで見て、どこで答えるか** です。あるコマンドに承認が要るかどうかを決めるものではなく、
権限の方針を扱う API でもありません。

```python
def present(request):
    # Deliver request.command and request.description to your UI, wait for
    # its authenticated human response, then return a request-bound decision.
    choice = send_to_my_ui_and_wait(request)  # once/session/always/deny
    return request.respond(choice)

def register(ctx):
    ctx.register_approval_transport("my-ui", present)
```

`present` は同期でも非同期でもかまいません。Hermes は上限のあるワーカーの上で実行し、
プラグイン側が守らなくても正式な `approvals.timeout` を適用します。渡される要求は
書き換えできず、伏せ字処理済みの表示テキスト、ホスト側の表示区分（`cli` か `gateway`）、
ホスト側のタイムアウト、選べる選択肢、そして中身の読めない要求 ID とダイジェストを持ちます。
戻り値には
`request.respond(choice)` の結果を返してください。要求に結び付いていない辞書や、古い、
あるいは書き換わった要求 ID・ダイジェストは拒否されます。ホストが提示していない範囲を
プラグインが返すこともできません（たとえば 1 回かぎりの要求に対する `always`）。

登録しただけでは何も起きません。プラグインを有効にすることと、その出し先を明示的に
選ぶことは、別々の同意の手順です。

```yaml
plugins:
  enabled: [my-approval-plugin]

security:
  approval:
    transport: my-ui
    transport_fallback: deny     # default
```

出し先での例外、タイムアウト、登録が見つからない状態、不正な選択、古い応答は、
いずれも既定では拒否になります。選んだ出し先が失敗したときに、あえて通常の
CLI / TUI / ゲートウェイ / ACP の画面に承認を出したい場合は
`transport_fallback: builtin` を設定してください。この指定がないかぎり、Hermes が
承認を別の画面に出すことはありません。

一律の遮断、sudo の標準入力の保護、ユーザーの拒否ルール、要求との結び付け、
許される範囲、保存、フック、そして最終的な許可の判断は、引き続き Hermes が持っています。
一律の遮断に当たるコマンドは、どの出し先のコールバックよりも前に止められます。
この仕組みには、**プラグイン側の承認方針も、自動許可のコールバックも、必須の
`pre_tool_call` 方針も** 意図的にありません。将来、承認方針を扱う機能が入るとすれば、
プラグインの権限同意のしくみに乗る可能性はありますが、出し先を選んだからといって
それが与えられるわけではありません。

### すでに使っている人向けの移行 {#migration-for-existing-users}

プラグインを自分で有効にする方式の Hermes（設定スキーマ v21 以降）に上げると、`~/.hermes/plugins/` にすでに入っていて `plugins.disabled` にも入っていなかったユーザープラグインは、**自動的に** `plugins.enabled` に引き継がれます。これまでの環境はそのまま動きます。同梱の単体プラグインは引き継がれません。すでに使っている人でも、明示的に有効にする必要があります。（同梱のプラットフォームやバックエンドのプラグインは、そもそも関門がなかったので引き継ぎも不要でした。）

## 使えるフック {#available-hooks}

プラグインは、`hermes_cli.plugins.VALID_HOOKS` が現在受け付ける 26 のライフサイクルイベントを登録できます。正確な発火のタイミング、戻り値の扱い、渡されるフィールド、プライバシー上の注意については、**[イベントフックの一覧](/hermes/docs/user-guide/features/hooks/#shipped-plugin-hook-catalog)** が正本です。

| 分類 | 同梱のフック |
|---|---|
| **指示・制御** | `pre_tool_call`、`pre_llm_call`、`pre_verify`、`pre_gateway_dispatch` |
| **変換** | `transform_tool_result`、`transform_terminal_output`、`transform_llm_output`、`pre_transcription` |
| **観測** | `post_tool_call`、`post_llm_call`、`pre_api_request`、`post_api_request`、`api_request_error`、`on_stream_start`、`on_stream_delta`、`on_stream_end`、`on_interim_message`、`on_session_start`、`on_session_end`、`on_session_finalize`、`on_session_reset`、`on_skill_lifecycle`、`subagent_start`、`subagent_stop`、`pre_approval_request`、`post_approval_response`、`pre_command`、`kanban_task_claimed`、`kanban_task_completed`、`kanban_task_blocked` |

この分類は今の挙動を説明したもので、これから先の命名規則を定めるものではありません。プラグインのミドルウェアは、引き続き別の登録先・別の面として扱われます。
## プラグインの種類 {#plugin-types}

Hermes のプラグインは 4 種類あります。

| 種類 | 何をするか | 選び方 | 置き場所 |
|------|-------------|-----------|----------|
| **一般のプラグイン** | ツール、フック、スラッシュコマンド、CLI コマンドを足す | 複数選択（有効・無効） | `~/.hermes/plugins/` |
| **記憶プロバイダー** | 組み込みの記憶を置き換える、または補う | 単一選択（有効なのは 1 つ） | `plugins/memory/` |
| **コンテキストエンジン** | 組み込みのコンテキスト圧縮を置き換える | 単一選択（有効なのは 1 つ） | `plugins/context_engine/` |
| **モデルプロバイダー** | 推論のバックエンド（OpenRouter、Anthropic など）を宣言する | 複数登録し、`--provider` や `config.yaml` で選ぶ | `plugins/model-providers/` |

記憶プロバイダーとコンテキストエンジンは **プロバイダー型のプラグイン** で、それぞれ同時に有効にできるのは 1 つだけです。モデルプロバイダーもプラグインですが、こちらは多数が同時に読み込まれ、ユーザーが `--provider` か `config.yaml` でそのつど 1 つを選びます。一般のプラグインは、どんな組み合わせでも有効にできます。

## 拡張できる面と、それぞれの参照先 {#pluggable-interfaces-where-to-go-for-each}

上の表はプラグインの 4 分類を示したものですが、「一般のプラグイン」の中でも `PluginContext` はいくつもの拡張点を用意しています。さらに Hermes は、Python のプラグイン以外の拡張（設定で決めるバックエンド、シェルにつなぐコマンド、外部サーバーなど）も受け付けます。作りたいものに合う文書は、この表から探してください。

| 足したいもの | 手段 | 手引き |
|---|---|---|
| LLM が呼べる **ツール** | Python プラグイン — `ctx.register_tool()` | [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) · [ツールを追加する](/hermes/docs/developer-guide/adding-tools/) |
| **ライフサイクルのフック**（LLM 呼び出しの前後、セッションの開始・終了、ツールの絞り込み） | Python プラグイン — `ctx.register_hook()` | [フックの一覧](/hermes/docs/user-guide/features/hooks/) · [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) |
| CLI やゲートウェイ向けの **スラッシュコマンド** | Python プラグイン — `ctx.register_command()` | [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) · [CLI を拡張する](/hermes/docs/developer-guide/extending-the-cli/) |
| `hermes <thing>` の **サブコマンド** | Python プラグイン — `ctx.register_cli_command()` | [CLI を拡張する](/hermes/docs/developer-guide/extending-the-cli/) |
| プラグインに同梱する **スキル** | Python プラグイン — `ctx.register_skill()` | [スキルを作る](/hermes/docs/developer-guide/creating-skills/) |
| **推論のバックエンド**（LLM プロバイダー: OpenAI 互換、Codex、Anthropic Messages、Bedrock） | プロバイダープラグイン — `plugins/model-providers/<name>/` の `register_provider(ProviderProfile(...))` | **[モデルプロバイダーのプラグイン](/hermes/docs/developer-guide/model-provider-plugin/)** · [プロバイダーを追加する](/hermes/docs/developer-guide/adding-providers/) |
| **ゲートウェイのチャネル**（Discord / Telegram / IRC / Teams など） | プラットフォームプラグイン — `plugins/platforms/<name>/` の `ctx.register_platform()` | [プラットフォームアダプターを追加する](/hermes/docs/developer-guide/adding-platform-adapters/) |
| **記憶のバックエンド**（Honcho、Mem0、Supermemory など） | 記憶プラグイン — `plugins/memory/<name>/` で `MemoryProvider` を継承 | [記憶プロバイダーのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/) |
| **コンテキスト圧縮のやり方** | コンテキストエンジンのプラグイン — `ctx.register_context_engine()` | [コンテキストエンジンのプラグイン](/hermes/docs/developer-guide/context-engine-plugin/) |
| **画像生成のバックエンド**（DALL·E、SDXL など） | バックエンドプラグイン — `ctx.register_image_gen_provider()` | [画像生成プロバイダーのプラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/) |
| **動画生成のバックエンド**（Veo、Kling、Pixverse、Grok-Imagine、Runway など） | バックエンドプラグイン — `ctx.register_video_gen_provider()` | [動画生成プロバイダーのプラグイン](/hermes/docs/developer-guide/video-gen-provider-plugin/) |
| **音声合成のバックエンド**（Piper、VoxCPM、Kokoro、xtts、音声を写し取るスクリプトなど、あらゆる CLI） | 設定で決める方法（おすすめ） — `config.yaml` の `tts.providers.<name>` に `type: command` で書きます。あるいは Python のバックエンドプラグイン — シェルのひな形では足りない Python SDK やストリーミング型のエンジンには `ctx.register_tts_provider()` を使います。 | [音声合成の設定](/hermes/docs/user-guide/features/tts/#custom-command-providers) · [Python プラグインの手引き](/hermes/docs/user-guide/features/tts/#python-plugin-providers) |
| **音声認識のバックエンド**（whisper.cpp、独自の whisper バイナリー、ローカルの音声認識 CLI など） | 設定で決める方法（おすすめ） — `config.yaml` の `stt.providers.<name>` に `type: command` で書くか、以前からある単一コマンドの逃げ道として `HERMES_LOCAL_STT_COMMAND` を設定します。あるいは Python のバックエンドプラグイン — Python SDK 型のエンジン（OpenRouter、SenseAudio、Gemini-STT など）には `ctx.register_transcription_provider()` を使います。 | [音声認識の設定](/hermes/docs/user-guide/features/tts/#stt-custom-command-providers) · [Python プラグインの手引き](/hermes/docs/user-guide/features/tts/#python-plugin-providers-stt) |
| **MCP 経由の外部ツール**（ファイルシステム、GitHub、Linear、Notion など、あらゆる MCP サーバー） | 設定で決める方法 — `config.yaml` に `mcp_servers.<name>` を `command:` か `url:` 付きで書きます。Hermes がそのサーバーのツールを自動で見つけ、組み込みのツールと並べて登録します。 | [MCP](/hermes/docs/user-guide/features/mcp/) |
| **スキルの取得元を増やす**（独自の GitHub リポジトリ、非公開のスキル索引） | CLI — `hermes skills tap add <repo>` | [Skills Hub](/hermes/docs/user-guide/features/skills/#skills-hub) · [独自の取得元を公開する](/hermes/docs/user-guide/features/skills/#publishing-a-custom-skill-tap) |
| **ゲートウェイのイベントフック**（`gateway:startup`、`session:start`、`agent:end`、`command:*` で発火） | `~/.hermes/hooks/<name>/` に `HOOK.yaml` と `handler.py` を置きます | [イベントフック](/hermes/docs/user-guide/features/hooks/#gateway-event-hooks) |
| **シェルフック**（イベントに応じてシェルコマンドを走らせる。通知、監査ログ、デスクトップの警告など） | 設定で決める方法 — `config.yaml` の `hooks:` に書きます | [シェルフック](/hermes/docs/user-guide/features/hooks/#shell-hooks) |

:::note
すべてが Python のプラグインというわけではありません。拡張の面によっては、**設定に書いたシェルコマンド**（音声合成、音声認識、シェルフック）をあえて使い、いま手元にある CLI をそのままプラグインにできるようにしています。MCP のように、エージェントがつなぎに行って自動でツールを登録する **外部サーバー** もありますし、ゲートウェイのフックのように、独自の記述形式を持つ **置くだけのディレクトリ** もあります。やりたいことに合う面を選んでください。上の表にある手引きには、それぞれ雛形・検出のされ方・例が載っています。
:::

## NixOS での宣言的なプラグイン {#nixos-declarative-plugins}

NixOS では、モジュールの設定項目からプラグインを宣言的に入れられます。`hermes plugins install` は不要です。詳しくは **[Nix の設定の手引き](/hermes/docs/getting-started/nix-setup/#plugins)** を参照してください。

```nix
services.hermes-agent = {
  # Directory plugin (source tree with plugin.yaml)
  extraPlugins = [ (pkgs.fetchFromGitHub { ... }) ];
  # Entry-point plugin (pip package)
  extraPythonPackages = [ (pkgs.python312Packages.buildPythonPackage { ... }) ];
  # Enable in config
  settings.plugins.enabled = [ "my-plugin" ];
};
```

宣言的に入れたプラグインは `nix-managed-` という接頭辞付きのシンボリックリンクになります。手で入れたプラグインと共存でき、Nix の設定から外すと自動で片付けられます。

## プラグインを管理する {#managing-plugins}

```bash
hermes plugins                               # unified interactive UI
hermes plugins list                          # table: enabled / disabled / not enabled
hermes plugins search <term>                 # search the community plugin index
hermes plugins install <name>                # install by index name (resolved to repo @ pinned ref)
hermes plugins install user/repo             # install from Git, then prompt Enable? [y/N]
hermes plugins install user/repo --enable    # install AND enable (no prompt)
hermes plugins install user/repo --no-enable # install but leave disabled (no prompt)
hermes plugins update my-plugin              # pull latest (local edits are autostashed and re-applied)
hermes plugins remove my-plugin              # uninstall
hermes plugins enable my-plugin              # add to allow-list
hermes plugins disable my-plugin             # remove from allow-list + add to disabled
hermes plugins capabilities [my-plugin]      # declared vs granted capabilities
```

### ワンクリックのインストールリンク（デスクトップ） {#one-click-install-links-desktop}

Hermes Desktop は `hermes://` の URL スキームを登録するので、Web サイト、README、
チャットのメッセージから、プラグインのインストールへ直接つなげられます。

```
hermes://plugin/install?repo=owner/repo            # main install link
hermes://plugin/install?repo=owner/repo&enable=1   # enable the agent plugin after install
hermes://plugin/install?repo=owner/repo&force=1    # replace an existing install
```

リンクをクリックすると Hermes が開き、**確認のダイアログ** が出ます。リポジトリの id、
「入れる前に」の注意書き、GitHub を見に行くリンクとクローン用のリンクが並びます。
そのうえでリポジトリを浅くクローンし、何が入っているか（**エージェントのプラグイン**
= バックエンドの Python、**デスクトップのプラグイン** = アプリの UI、あるいはその両方）
を判別します。使う部品をチェックボックスで選び、確定します。確定するまでは何も入りません。
ディープリンクが勝手にインストールすることはなく、エージェントのプラグインは
`hermes plugins install` と同じ [インストール時のセキュリティ検査](#install-time-security-scanning)
を通ります。

エージェント側とデスクトップ側を 1 つのリポジトリに持つ場合も、リンクは 1 本、
ダイアログも 1 つです。同じ画面はリンクなしでも **設定 → Plugins →
Install from Git** から開けます。以前の `hermes://plugin-agent/…` と
`hermes://plugin-desktop/…` の URL も、同じダイアログにつながります。開発ビルド
（`npm run dev`）ではスキームが `hermes-dev://` になります。

Web サイト側に SDK は要りません。ふつうのリンクで動きます。

```html
<a href="hermes://plugin/install?repo=owner/repo&enable=1">Install in Hermes</a>
```

MCP サーバーにも同じ形のリンクがあります。
[Hermes に追加するリンク](/hermes/docs/reference/mcp-config-reference/#add-to-hermes-link) を参照してください。

### プラグインの権限と同意 {#plugin-capabilities-and-consent}

プラグインは、使いたいホスト側の特権機能を `plugin.yaml` に
宣言できます。

```yaml
name: my-plugin
capabilities:
  - tools.override        # replace built-in tools
  - llm.model_override    # pick the model for host-owned LLM calls
```

権限が宣言されていると、`hermes plugins install`（および
`hermes plugins enable`）が、一覧とそれぞれの危険性を 1 行で示して、一度だけ確認します。
同意すると、その付与内容が同意のハッシュと日時とともに
`plugins.entries.<id>.granted_capabilities` に記録されます。断った場合、プラグインは
有効なまま、その権限だけが切れた状態になります。行儀のよいプラグインは
`ctx.has_capability()` で確かめ、無理のない範囲に機能を落とします。

**更新時の再同意:** プラグインの更新で、まだ許していない権限が宣言された場合、
`hermes plugins update` が増えたぶんを示してあらためて確認します。同意するまで新しい
権限は切れたままです。プラグインの更新が、黙って権限を広げることはありません。

**対話のないセッションでは安全側に倒します:** 端末を伴わない環境でのインストールや
更新は完了しますが、宣言された権限は *与えられません*。あとから
`hermes plugins enable <id>` を対話的に実行して与えてください。

状態はいつでも確認できます。

```bash
hermes plugins capabilities             # all plugins with declared/granted capabilities
hermes plugins capabilities my-plugin   # one plugin, declared vs granted
```

権限の id は、以前の機能ごとの設定項目と 1 対 1 で対応します。そちらも引き続き
動きますが、同意の流れを使う形に改まっており、**非推奨** です。

| 権限 | 以前のキー（`plugins.entries.<id>.…`） |
|---|---|
| `tools.override` | `allow_tool_override` |
| `llm.provider_override` | `llm.allow_provider_override` |
| `llm.model_override` | `llm.allow_model_override` |
| `llm.agent_id_override` | `llm.allow_agent_id_override` |
| `llm.profile_override` | `llm.allow_profile_override` |
| `llm.task_override` | `llm.allow_task_override` |
| `gateway.platform_actions` | `allow_platform_actions` |

権限が与えられているか、以前のキーが設定されているか、その *どちらか* が成り立てば
その関門は開きます。今の設定はそのままで動き続けます。

:::warning サンドボックスではありません
権限は **同意と記録のための層** であって、隔離ではありません。プラグインはふつうの
Python としてプロセス内で動くので、悪意あるプラグインはここにある関門をすべて無視できます。
権限を与えるとは、そのプラグインの作者を信用すると表明することです。コードを監査した
ことにはなりませんし、Hermes がそのコードを確認したわけでもありません。信用できる
出どころのプラグインだけを入れてください。
:::

### プラットフォームへの操作 {#platform-actions}

`ctx.platform_actions` は、動いているゲートウェイのアダプター登録を通じて、つながっている
チャットのプラットフォームに働きかけるための、最小限で権限に守られた操作の集まりです。
アダプターに直接手を入れる代わりに用意された、正規の手段です。**既定では切れています。**
呼び出しのたびに `gateway.platform_actions` の権限（以前のキーは
`plugins.entries.<id>.allow_platform_actions`）を確認し、与えられていなければ、
何もせず構造化されたエラーを返します。

v1 の操作は次の 2 つです（どちらも `async` で、素の辞書を返し、フックの実行に例外を
投げることはありません）。

```python
result = await ctx.platform_actions.add_reaction(
    platform="telegram", chat_id="-100123", message_id="456", emoji="👍",
)
result = await ctx.platform_actions.set_thread_title(
    platform="discord", chat_id="123", thread_id="456", title="New title",
)
if not result["ok"]:
    print(result["error"], result.get("detail"))
```

成功すると `{"ok": True, "action": <verb>}` が返ります。失敗すると
`{"ok": False, "error": <code>, "detail": <str>}` で、エラーコードは次のとおり定まっています。
`capability_not_granted`、`invalid_argument`、`gateway_unavailable`、
`unknown_platform`、`adapter_not_registered`、`adapter_disconnected`、
`unsupported_platform_action`、`action_failed`。操作の前には、対象のアダプターが存在して
接続されているかを確かめます。切断されていたり見つからなかったりする場合は、例外ではなく
構造化されたエラーになります。

v1 で対応しているのは Telegram と Discord です。Telegram の `add_reaction` は
ボットのリアクションを *置き換えます*（Bot API は以前のボットのリアクションを重ねずに
差し替えます）。許可されたものも拒否されたものも含め、すべての操作は、プラグインの id、
操作名、プラットフォーム、結果とともにログに書かれます。

:::warning セキュリティ上の注意
プラットフォームへの操作は **ボットとして発信する力** です。権限を与えられたプラグインは、
フックのきっかけになったチャットにかぎらず、ゲートウェイのボットが届くどのチャットでも
リアクションを付けたりスレッド名を変えたりできます。`gateway.platform_actions` は信用できる
プラグインにだけ与え、どの操作を行うかを明記しているプラグインを選んでください。
プラットフォームの SDK の生のペイロードやハンドルに触ることは、あえてこの面に **含めて
いません**。#64176 の第 2 巡の設計修正のとおり、それには「安定性は保証しない」という
但し書き付きの専用の権限（`gateway.raw_events`）と別途の設計が必要で、まだ出ていません。
:::

### コミュニティのプラグインを探す {#discovering-community-plugins}

`hermes plugins search <term>` は **コミュニティのプラグイン索引** を検索します。これは
コミュニティ製プラグインを機械で読める形にまとめた静的な JSON のカタログです。名前・説明・
タグをまたいだあいまい検索です。

```bash
hermes plugins search telegram               # fuzzy search
hermes plugins search                        # browse the whole index
hermes plugins search --capability platform  # filter by declared capability
hermes plugins search media --json           # machine-readable output
hermes plugins search --refresh              # bypass the 24h local cache
```

目当てのプラグインが見つかったら、名前だけで入れられます。名前は索引を通じて
`owner/repo` と、索引で固定されたコミットに解決されます。

```bash
hermes plugins install hermes-media-studio
```

名前が複数の項目に当たった場合は候補が並び、何も入りません。`owner/repo` や Git の URL
を明示した場合は索引を参照せず、これまでどおりに動きます。`--ref <sha>` を明示すれば、
つねに索引側の固定より優先されます。

**索引の取得のしかた。** 索引は決まった URL に置かれています
（`https://raw.githubusercontent.com/NousResearch/hermes-plugin-index/main/index.json`。
`hermes config set plugins.index_url <url>` で変えられます）。取得した内容は
`~/.hermes/cache/plugin_index.json` に 24 時間キャッシュされます。取得先に届かないときは
古いキャッシュを使い、キャッシュもまったくない場合は Hermes に同梱された初期コピーを
使うので、完全にオフラインでも検索できます。

**索引の項目の形式。** 各項目は次のような JSON のオブジェクトです。

```json
{
  "name": "hermes-media-studio",
  "description": "Generative media workspace plugin.",
  "author": "NousResearch",
  "tags": ["media", "image-gen"],
  "repo": "NousResearch/hermes-media-studio",
  "ref": "<40-char commit SHA>",
  "subdir": null,
  "homepage": "https://github.com/NousResearch/hermes-media-studio",
  "capabilities": ["tools", "dashboard"],
  "api_version": 1,
  "added_at": "2026-08-12"
}
```

`repo` は GitHub の `owner/name` の識別子、`ref` は書き換えの効かないコミット SHA の固定で、
任意の `subdir` はモノレポに対応するためのものです。同梱の初期ファイル
（リポジトリ内の `hermes_cli/data/plugin_index.json`）が形式のお手本です。

**プラグインを載せてもらうには。** 索引はただの JSON ファイルとして管理されています。
[hermes-plugin-index](https://github.com/NousResearch/hermes-plugin-index)
のリポジトリに、自分の項目（名前、説明、作者、タグ、`owner/repo`、固定するコミット SHA）
を足すプルリクエストを送ってください。審査の対象は項目の *メタデータ* だけです。

:::warning 索引に載っている ≠ 監査済み
コミュニティの索引に載っているということは、その項目のメタデータが確認されたという
意味であって、**コードの監査ではありません**。インストールは通常どおり同意と確認の
流れを通ります（入れたプラグインは既定で無効、有効にするのは明示的な手順、ツールの
差し替え権限には別途の許可が必要です）。有効にする前に、そのプラグインのソースを
確かめてください。
:::

### プラグインパック {#plugin-packs}

**プラグインパック** は、複数のプラグインをまとめて固定する、宣言的で共有しやすい
YAML ファイル（`hermes-pack.yaml`）です。ゲームの MOD パックを配るのに似ています。
パックを入れると、ふつうの固定付きインストールが複数回に分かれて走るだけで、
実行時に新しいものが増えるわけではありません。

```yaml
name: voice-assistant-pack
description: STT + streaming TTS + approval relay
author: hyper
version: 1.0.0
plugins:
  - name: hermes-media-studio            # bare community-index name…
    ref: e8d59971d2b7901405b39dac7b03bdd616272d0d
  - repo: owner/approval-relay           # …or explicit owner/repo (or git URL)
    ref: 8f3c2d1a9b4e5f6071829304a5b6c7d8e9f00112
    subdir: plugins/relay                # optional monorepo path
config:                                  # optional, non-secret seeds only
  hermes-media-studio:
    default_model: flux-3
skills: []                               # declared list only (not auto-installed yet)
```

```bash
hermes plugins pack show ./hermes-pack.yaml     # dry-run review
hermes plugins pack install ./hermes-pack.yaml  # review → confirm → install
hermes plugins pack export > hermes-pack.yaml   # snapshot the current install
hermes plugins pack export --enabled-only       # only plugins.enabled
```

**供給経路の安全について。** どの項目の `ref` も、40 文字ちょうどのコミット SHA でなければ
なりません。タグやブランチ名は、どの項目かを示すエラーとともに拒否されます。これは
コミュニティ索引と同じ規則です。パックのインストールは
`hermes plugins install --ref <sha>` とまったく同じ固定付きの経路を通り、
`plugins/.install-metadata.json` に同じ出どころの情報を記録します。ですから同じパックを
2 回入れれば、まったく同じ結果になります。パックは
[マニフェスト v2 の項目](/hermes/docs/developer-guide/plugins/)（`manifest_version`、
`api_version`、`requires_plugins`）の上に成り立っており、各プラグインのマニフェスト自体は
通常のインストール経路で検証されます。

**同意をまとめて与えることはありません。** `pack install` は、必ず確認画面を出します
（すべてのプラグイン、取得元、固定したリビジョン、宣言された権限が並びます）。そのうえで、
パックの中身について **1 回だけ** 確認します。そのあとは、各プラグインが宣言した権限に
ついて、いつもどおりプラグインごとの同意の確認が入ります。`hermes plugins install` を
1 つずつ行うのとまったく同じです。`--yes` はありませんし、対話のないセッションでは
パックを入れられません。

**秘密の情報はパックに乗りません。** `config:` に書ける初期値は、秘密でない
`plugins.entries.<id>` のキーだけです。秘密らしい名前のキー
（`*token*`、`*key*`、`*password*` など）、権限の付与、非推奨の
`allow_*` の信頼設定は、インストール時に拒否され、書き出し時には取り除かれます。
秘密の情報が必要なプラグインは自分の `requires_env` に宣言し、いつもどおり
インストール時に入力を求めます。`plugins.entries.<id>` にすでにあるユーザーの値は、
つねにパックの初期値より優先されます。

**一部だけ失敗したとき。** 各プラグインは別々にインストールされます。失敗はプラグイン
ごとに報告され、残りは続行され、1 つでも失敗すればコマンドは 0 以外で終了します。

**書き出しの注意。** `pack export` に含まれるのは、Git の出どころが分かっているプラグイン
（`hermes plugins install` で入れたもの）だけです。手元にしかないプラグインは、
書き出される YAML の中に警告のコメントとして並び、インストールできる項目にはなりません。

`skills:` の一覧は、インストール時に読み取られて表示はされますが、まだ自動では
入りません。今のところは手で入れてください（`hermes skills`）。スキルハブの id を
パックのインストールにつなぐのは、続きの作業として記録されています。

### インストール時のセキュリティ検査 {#install-time-security-scanning}

`hermes plugins install` と `hermes plugins update` は、プラグインを有効にする前に、
そのファイル一式を静的に検査します（Claude Cowork のスキル・プラグインの
セキュリティ検査を参考にしています）。検査には
[Skills Hub の防護](/hermes/docs/user-guide/features/skills/) と同じ脅威パターンの
エンジンを使い回します。認証情報の持ち出し、リバースシェル、破壊的なコマンド、
居座りのしくみ、難読化された実行、そして文書ファイルに仕込まれたプロンプト
インジェクションが対象です。そのうえでプラグイン特有の除外もあり、プロバイダーの
プラグインが **自分の** API キーを環境変数から読むこと（`requires_env` として
文書化されているやり方）は問題として扱いません。

判定は 3 つで、Cowork の pass / warn / fail に対応します。

| 判定 | 挙動 |
|---|---|
| **safe** | そのまま入ります。追加の出力はありません |
| **caution** | 検出内容が表示され、`Install anyway? [y/N]` で確認します（`--force` でも進めます） |
| **dangerous** | 止まります。`--force` でも **通りません** |

`hermes plugins update` で更新後のファイル一式が dangerous と判定された場合、
内容を確認して自分で有効に戻すまで、そのプラグインは無効になります。

検査は既定で有効です。切るには `config.yaml` に次を書きます。

```yaml
plugins:
  scan_on_install: false
```

### 対話画面 {#interactive-ui}

引数なしで `hermes plugins` を実行すると、まとまった対話画面が開きます。

```
Plugins
  ↑↓ navigate  SPACE toggle  ENTER configure/confirm  ESC done

  General Plugins
 → [✓] my-tool-plugin — Custom search tool
   [ ] webhook-notifier — Event hooks
   [ ] disk-cleanup — Auto-cleanup of ephemeral files [bundled]

  Provider Plugins
     Memory Provider          ▸ honcho
     Context Engine           ▸ compressor
```

- **General Plugins の欄** — チェックボックスで、スペースキーで切り替えます。チェックあり = `plugins.enabled` に入っている、チェックなし = `plugins.disabled` に入っている（明示的に切っている）状態です。
- **Provider Plugins の欄** — 今の選択が表示されます。ENTER を押すと、有効にする 1 つを選ぶ画面に入ります。
- 同梱のプラグインも同じ一覧に、`[bundled]` の印付きで並びます。

プロバイダー型のプラグインの選択は `config.yaml` に保存されます。

```yaml
memory:
  provider: "honcho"      # empty string = built-in only

context:
  engine: "compressor"    # default built-in compressor
```

### 有効・無効・どちらでもない {#enabled-vs-disabled-vs-neither}

プラグインの状態は次の 3 つのどれかです。

| 状態 | 意味 | `plugins.enabled` にある? | `plugins.disabled` にある? |
|---|---|---|---|
| `enabled` | 次のセッションで読み込まれます | はい | いいえ |
| `disabled` | 明示的に切ってある。`enabled` にも書かれていても読み込まれません | （関係なし） | はい |
| `not enabled` | 見つかってはいるが、まだ選ばれていません | いいえ | いいえ |

入れたばかりのプラグインや同梱のプラグインは、既定で `not enabled` です。`hermes plugins list` はこの 3 つを区別して表示するので、意図して切ったものと、まだ有効にしていないだけのものを見分けられます。

動いているセッションでは、`/plugins` で今読み込まれているプラグインが分かります。

## メッセージを差し込む {#injecting-messages}

プラグインは `ctx.inject_message()` を使って、CLI の会話や、あらかじめ分かっているゲートウェイのセッションにメッセージを差し込めます。

```python
# Active CLI conversation
ctx.inject_message("New data arrived from the webhook", role="user")

# Existing gateway conversation
ctx.inject_message(
    "New data arrived from the webhook",
    role="user",
    session_key="agent:main:telegram:dm:123456789",
)
```

**シグネチャー:** `ctx.inject_message(content: str, role: str = "user", *, session_key: str | None = None) -> bool`

CLI では次のように動きます。

- エージェントが **待機中**（ユーザーの入力待ち）なら、そのメッセージが次の入力として並び、新しいターンが始まります。
- エージェントが **ターンの途中**（実行中）なら、そのメッセージは今の処理に割り込みます。ユーザーが新しいメッセージを打って Enter を押したのと同じです。
- `"user"` 以外の役割では、内容の先頭に `[role]` が付きます（たとえば `[system] ...`）。
- 無事に並べられた場合は `True` を返します。

ゲートウェイでは次のように動きます。

- `session_key` は必須で、すでにあるゲートウェイのセッションを指していなければなりません。これは CLI のセッション ID ではなく、経路を決めるための安定したキーです。
- Hermes は、そのセッションに保存されているプラットフォーム、チャット、スレッド、プロファイル、会話履歴をそのまま使います。この API から新しいチャットの宛先を渡すことはできません。
- 送る前に、保存されている経路がゲートウェイの現在の権限ルールに照らして問題ないかを、あらためて確認します。
- アダプターの時点や上流での許可の判断だけに頼っていた経路は、現在の中核の許可一覧・ペアリング・明示的な全許可の設定から確認し直せないかぎり、拒否されます。
- 差し込まれた文字列は、つねに会話の入力として扱われます。スラッシュコマンドを実行したり、ツールを承認したり、保留中の確認や問い返しに答えたりはできません。
- 送信の処理が終わるまで、経路と会話は固定されます。話題の復元で経路が変わったり、処理が始まる前にセッションが切り替わったりした場合、Hermes はその要求を捨てます。
- 要求は、プラットフォームのアダプターの通常のメッセージ経路に入ります。動いているセッションでは、別のターンを競わせるのではなく、既存の順番待ちの列に入ります。
- 動いているゲートウェイが、非同期での処理としてその要求を受け付けたときに `True` を返します。エージェントのターンやプラットフォームへの配信が完了したことまでは意味しません。
- `session_key` がない場合、権限が与えられていない場合、要求を受け付けられる生きたゲートウェイがない場合は `False` を返します。非同期で受け付けたあとに、知らないセッションキーや経路を作れないセッションキーだと分かった場合は、ゲートウェイのログに書き出されます。

これにより、遠隔操作の閲覧画面、メッセージの橋渡し、Webhook の受け口といったプラグインが、外部からの情報を会話に流し込めます。

ゲートウェイへの差し込みは、エージェントの応答を外部のメッセージングのプラットフォームへ送り出せます。既定ではどのプラグインに対しても無効です。`config.yaml` でプラグインごとに与えてください。

```yaml
plugins:
  entries:
    my-plugin:
      allow_gateway_injection: true
```

:::warning
ゲートウェイへの差し込みは、信用できるプラグインにだけ与えてください。Hermes はこのホスト API の権限を確認し、すでにあるセッションの経路に限定しますが、Python のプラグインはプロセス内で動くので、この設定はサンドボックスではありません。
:::

:::note
このプラグイン API は、外部のプロセス向けに公開の HTTP エンドポイントや CLI コマンドを出すものではありません。プラグイン側が、対象となるゲートウェイの `session_key` をあらかじめ知っている必要があります。たとえば自分の信用できる設定や、以前から保持しているセッションの状態から得ます。
:::

## プラグインから MCP サーバーを呼ぶ {#calling-mcp-servers-from-plugins}

`ctx.call_mcp()` を使うと、プラグインは、ユーザーが設定した MCP サーバーのツールを、どのフックやツールの処理からでも同期的に呼べます。呼び出しは Hermes が元から持っている MCP のクライアントを通ります（モデルが MCP のツールを呼ぶときと同じ接続、同じ信頼レベルの関門、同じ遮断器、同じ再接続の処理です。別のクライアントを並立させることはありません）。

```python
result = ctx.call_mcp(
    "knowledge_rag",            # server name from mcp.servers
    "query_knowledge",          # tool on that server
    {"query": "deploy runbook"},
    timeout=30,                 # seconds; clamped to 1–600
)
if result["ok"]:
    print(result["result"])
else:
    print("MCP error:", result["error"])
```

**シグネチャー:** `ctx.call_mcp(server: str, tool: str, arguments: dict | None = None, timeout: float = 30) -> dict`

戻り値の形は決まっています。`{"ok": True, "result": ...}`（サーバーが返す場合は `structuredContent` も付きます）か、`{"ok": False, "error": "..."}` です。結果がおよそ 64 KB を超えると切り詰められ、`"truncated": True` の印が付きます。

### セキュリティ: 既定は無効、サーバーごとの許可一覧 {#security-default-off-per-server-allowlist}

プラグインには **既定では MCP へのアクセスがありません**。運用する人が、`config.yaml` でサーバーごとに明示的に許可します。

```yaml
plugins:
  entries:
    my-plugin:
      mcp_allowlist: ["knowledge_rag", "github"]
```

- 一覧にないサーバーを呼ぶと `PermissionError` が上がり、設定すべき正確なキー名が示されます。
- 許可はサーバーごと・プラグインごとです。設定済みの全サーバーに対する包括的な権限にはなりませんし、`"*"` のワイルドカードも効きません。
- どの呼び出しにもタイムアウトが強制されるので（既定は 30 秒）、応答しない MCP サーバーが、呼び出し元のフックやツールの処理を止めてしまうことはありません。
- MCP サーバーが返す内容は信用できません。`result` は指示ではなくデータとして扱い、検証なしに特権的な判断（承認、コマンドの実行）へ流し込まないでください。

:::warning
`mcp_allowlist` を与えると、そのプラグインはモデルと同じだけ、その MCP サーバーに手が届きます。サーバーが公開している書き込み系のツールも含みます（そのサーバーの `trust` レベルの関門は効きます）。本当に必要なサーバーだけを許可してください。
:::

処理の受け口の約束事、スキーマの形式、フックの挙動、エラーの扱い、よくある間違いについては、**[詳しい手引き](/hermes/docs/developer-guide/plugins/)** を参照してください。
