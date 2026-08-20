---
title: "プラグイン"
description: "プラグインの仕組みを使って、独自のツール・フック・連携機能で Hermes を拡張する"
upstream_path: user-guide/features/plugins.md
upstream_blob: 14c162f12370deb71967ceab9f488b0dce4d24d9
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins
---

# プラグイン {#plugins}

Hermes には、本体のコードを書き換えずに独自のツール・フック・連携機能を追加するためのプラグインの仕組みがあります。

自分用、チーム用、あるいは特定のプロジェクト用にツールを作りたいのであれば、
たいていはこの道が正解です。開発者向けガイドの
[ツールを追加する](/hermes/docs/developer-guide/adding-tools/) のページは、`tools/` と
`toolsets.py` に置かれる Hermes 本体の組み込みツールについて説明したものです。

**→ [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/)** — 動く実例つきの手順ガイドです。

## ざっと全体像 {#quick-overview}

`plugin.yaml` と Python のコードを入れたディレクトリを `~/.hermes/plugins/` に置きます。

```
~/.hermes/plugins/my-plugin/
├── plugin.yaml      # manifest
├── __init__.py      # register() — wires schemas to handlers
├── schemas.py       # tool schemas (what the LLM sees)
└── tools.py         # tool handlers (what runs when called)
```

Hermes を起動すると、作ったツールが組み込みツールと並んで現れます。モデルはその場ですぐ呼び出せます。

### 動かせる最小の例 {#minimal-working-example}

`hello_world` というツールを追加し、フックですべてのツール呼び出しを記録する、完全なプラグインの例です。

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

この 2 つのファイルを `~/.hermes/plugins/hello-world/` に置いて Hermes を起動し直すと、モデルはすぐに `hello_world` を呼べるようになります。フックのほうは、ツールが呼ばれるたびにログを 1 行出します。

モデルに見せるツールの説明文は `schema["description"]` に書きます。省略できる `ctx.register_tool(description=...)` の値はこれとは別で、`ToolEntry` のレジストリ用メタデータです。省略するとスキーマ側の説明文が既定値として使われますが、`description` を持たないスキーマに Hermes が書き戻すことはありません。説明文はスキーマ側に一度だけ書くのがおすすめです。両方に書く場合は内容を揃えてください。モデルが見るのはスキーマ側の値です。

`./.hermes/plugins/` に置くプロジェクト単位のプラグインは、既定では無効です。信頼できるリポジトリでだけ、Hermes を起動する前に `HERMES_ENABLE_PROJECT_PLUGINS=true` を設定して有効にしてください。

## プラグインでできること {#what-plugins-can-do}

以下の `ctx.*` の API は、どれもプラグインの `register(ctx)` 関数の中で使えます。

| できること | 書き方 |
|-----------|-----|
| ツールを追加する | `ctx.register_tool(name=..., toolset=..., schema=..., handler=...)` |
| フックを追加する | `ctx.register_hook("post_tool_call", callback)` |
| スラッシュコマンドを追加する | `ctx.register_command(name, handler, description)` — CLI とゲートウェイのセッションに `/name` が追加されます |
| コマンドからツールを呼び出す | `ctx.dispatch_tool(name, args)` — 登録済みのツールを、親エージェントの文脈を自動でつないだ状態で実行します |
| CLI コマンドを追加する | `ctx.register_cli_command(name, help, setup_fn, handler_fn)` — `hermes <plugin> <subcommand>` が追加されます |
| メッセージを差し込む | `ctx.inject_message(content, role="user", session_key=...)` - [メッセージを差し込む](#injecting-messages) を参照 |
| データファイルを同梱する | `Path(__file__).parent / "data" / "file.yaml"` |
| スキルを同梱する | `ctx.register_skill(name, path)` — `plugin:skill` という名前空間になり、`skill_view("plugin:skill")` で読み込まれます |
| 環境変数の有無で制限する | plugin.yaml に `requires_env: [API_KEY]` と書くと、`hermes plugins install` のときに入力を求められます |
| pip で配布する | `[project.entry-points."hermes_agent.plugins"]` |
| ゲートウェイのプラットフォーム（Discord、Telegram、IRC など）を登録する | `ctx.register_platform(name, label, adapter_factory, check_fn, ...)` — [プラットフォームアダプターを追加する](/hermes/docs/developer-guide/adding-platform-adapters/) を参照 |
| 画像生成のバックエンドを登録する | `ctx.register_image_gen_provider(provider)` — [画像生成プロバイダープラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/) を参照 |
| 動画生成のバックエンドを登録する | `ctx.register_video_gen_provider(provider)` — [動画生成プロバイダープラグイン](/hermes/docs/developer-guide/video-gen-provider-plugin/) を参照 |
| 文脈を圧縮するエンジンを登録する | `ctx.register_context_engine(engine)` — [コンテキストエンジンプラグイン](/hermes/docs/developer-guide/context-engine-plugin/) を参照 |
| 人による承認の確認画面の出し先を変える | `ctx.register_approval_transport(name, present_fn)` — [承認の受け渡し口](#approval-transports) を参照 |
| 記憶のバックエンドを登録する | `plugins/memory/<name>/__init__.py` で `MemoryProvider` を継承します — [メモリープロバイダープラグイン](/hermes/docs/developer-guide/memory-provider-plugin/) を参照（別の検出の仕組みを使います） |
| ホスト側の LLM 呼び出しを実行する | `ctx.llm.complete(...)` / `ctx.llm.complete_structured(...)` — 利用者が今使っているモデルと認証情報を借りて、1 回きりの補完を実行します。JSON スキーマによる検証もつけられます。[プラグインからの LLM 利用](/hermes/docs/developer-guide/plugin-llm-access/) を参照 |
| MCP のツールを呼ぶ（権限が必要） | `ctx.call_mcp(server, tool, arguments, timeout=30)` — [プラグインから MCP サーバーを呼ぶ](#calling-mcp-servers-from-plugins) を参照 |
| 推論のバックエンド（LLM プロバイダー）を登録する | `plugins/model-providers/<name>/__init__.py` で `register_provider(ProviderProfile(...))` を呼びます — [モデルプロバイダープラグイン](/hermes/docs/developer-guide/model-provider-plugin/) を参照（別の検出の仕組みを使います） |

## プラグインはどこから見つかるか {#plugin-discovery}

| 置き場所 | パス | 使いどころ |
|--------|------|----------|
| 同梱 | `<repo>/plugins/` | Hermes に最初から入っています — [同梱プラグイン](/hermes/docs/user-guide/features/built-in-plugins/) を参照 |
| ユーザー | `~/.hermes/plugins/` | 自分用のプラグイン |
| プロジェクト | `.hermes/plugins/` | プロジェクト専用のプラグイン（`HERMES_ENABLE_PROJECT_PLUGINS=true` が必要） |
| pip | `hermes_agent.plugins` の entry_points | パッケージとして配布されたもの |
| Nix | `services.hermes-agent.extraPlugins` / `extraPythonPackages` | NixOS で宣言的に入れる方法 — [Nix のセットアップ](/hermes/docs/getting-started/nix-setup/#plugins) を参照 |

名前がぶつかったときは、後ろの置き場所が前のものを上書きします。つまり、同梱プラグインと同じ名前のユーザープラグインを置くと、そちらが使われます。

### プラグインの下位分類 {#plugin-sub-categories}

それぞれの置き場所の中で、Hermes は下位分類のディレクトリも認識します。ここに置かれたプラグインは、専用の検出の仕組みへ振り分けられます。

| 下位ディレクトリ | 入るもの | 検出の仕組み |
|---|---|---|
| `plugins/`（直下） | 一般のプラグイン — ツール、フック、スラッシュコマンド、CLI コマンド、同梱スキル | `PluginManager`（種別は `standalone` または `backend`） |
| `plugins/platforms/<name>/` | ゲートウェイのチャンネルアダプター（`ctx.register_platform()`） | `PluginManager`（種別は `platform`、階層が 1 つ深くなります） |
| `plugins/image_gen/<name>/` | 画像生成のバックエンド（`ctx.register_image_gen_provider()`） | `PluginManager`（種別は `backend`、階層が 1 つ深くなります） |
| `plugins/memory/<name>/` | 記憶のプロバイダー（`MemoryProvider` を継承） | `plugins/memory/__init__.py` にある**専用のローダー**（種別は `exclusive` — 同時に有効なのは 1 つだけです） |
| `plugins/context_engine/<name>/` | 文脈を圧縮するエンジン（`ctx.register_context_engine()`） | `plugins/context_engine/__init__.py` にある**専用のローダー**（同時に有効なのは 1 つだけです） |
| `plugins/model-providers/<name>/` | LLM プロバイダーのプロフィール（`register_provider(ProviderProfile(...))`） | `providers/__init__.py` にある**専用のローダー**（最初に `get_provider_profile()` が呼ばれたときに読み込まれます） |

`~/.hermes/plugins/model-providers/<name>/` と `~/.hermes/plugins/memory/<name>/` に置いたユーザープラグインは、同じ名前の同梱プラグインを上書きします。`register_provider()` / `register_memory_provider()` では最後に登録したものが残ります。ディレクトリを置くだけで、リポジトリを一切いじらずに組み込みのものを差し替えられます。

## プラグインは自分で有効にする（ただし例外もあります） {#plugins-are-opt-in-with-a-few-exceptions}

**一般のプラグインと、利用者が自分で入れたバックエンドは、既定では無効です。**検出まではされるので `hermes plugins` や `/plugins` の一覧には出てきますが、`~/.hermes/config.yaml` の `plugins.enabled` に名前を書き足すまで、フックもツールも読み込まれません。第三者のコードが自分の同意なしに動き出すのを防ぐためです。

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

`hermes plugins install owner/repo` を実行すると、最後に `Enable 'name' now? [y/N]` と聞かれます。既定は「いいえ」です。スクリプトから入れるときは `--enable` か `--no-enable` を付けると、この確認を飛ばせます。

同じ状態を何度でも再現したい場合は、書き換わることのないコミットを完全な形で指定してください（タグ、ブランチ名、短縮された SHA は受け付けません）。

```bash
hermes plugins install owner/repo --ref 0123456789abcdef0123456789abcdef01234567
```

Hermes はそのコミットを detached の状態でチェックアウトし、`HEAD` が指定した SHA と完全に一致することを確かめたうえで、取得元・入れたリビジョン・固定しているかどうかを今のプロフィールに記録します。`hermes plugins update` は、固定されたプラグインを動かすことを拒みます。別のコミットに移りたいときは
`hermes plugins install <source> --force --ref <new-commit>` で明示的に指定してください。プロフィールごとに保存されるこのインストール情報には、設定値も環境変数の値も、秘密情報も権限の付与状況も含まれません。

### 許可リストの対象にならないもの {#what-the-allow-list-does-not-gate}

いくつかの種類のプラグインは `plugins.enabled` を通りません。Hermes に最初から備わっている土台の一部であり、既定で止めてしまうと基本的な機能が動かなくなるからです。

| プラグインの種類 | 代わりの有効化の方法 |
|---|---|
| **同梱のプラットフォームプラグイン**（`plugins/platforms/` 以下の IRC、Teams など） | 出荷されているゲートウェイのチャンネルがすべて使えるよう、自動で読み込まれます。チャンネルそのものは `config.yaml` の `gateway.platforms.<name>.enabled` で有効にします。 |
| **同梱のバックエンド**（`plugins/image_gen/` 以下の画像生成プロバイダーなど） | 既定のバックエンドがそのまま動くよう、自動で読み込まれます。どれを使うかは `config.yaml` の `<category>.provider` で選びます（例: `image_gen.provider: openai`）。 |
| **記憶のプロバイダー**（`plugins/memory/`） | すべて検出されますが、有効なのは 1 つだけです。`config.yaml` の `memory.provider` で選びます。 |
| **コンテキストエンジン**（`plugins/context_engine/`） | すべて検出されますが、有効なのは 1 つだけです。`config.yaml` の `context.engine` で選びます。 |
| **モデルプロバイダー**（`plugins/model-providers/`） | `plugins/model-providers/` 以下の同梱プロバイダーは、最初に `get_provider_profile()` が呼ばれた時点でまとめて検出・登録されます。利用者は `--provider` か `config.yaml` で、そのつど 1 つを選びます。 |
| **pip で入れた `backend` プラグイン** | 一般のプラグインと同じく `plugins.enabled` で有効にします。 |
| **利用者が入れたプラットフォーム**（`~/.hermes/plugins/platforms/` 以下） | `plugins.enabled` で有効にします。第三者が作ったゲートウェイのアダプターには、はっきりした同意が要ります。 |

まとめると、**同梱の「そのまま動く」土台は自動で読み込まれ、第三者の一般プラグインは自分で有効にする**という形です。`plugins.enabled` の許可リストは、利用者が `~/.hermes/plugins/` に置いた任意のコードのための関門です。

### 承認の受け渡し口 {#approval-transports}

承認の受け渡し口（approval transport）は、Hermes がすでに出しているツール承認の確認を、**人がどこで見て、どこで答えるか**を変えるものです。あるコマンドに承認が要るかどうかを決めるものではなく、権限を決めるための API でもありません。

```python
def present(request):
    # Deliver request.command and request.description to your UI, wait for
    # its authenticated human response, then return a request-bound decision.
    choice = send_to_my_ui_and_wait(request)  # once/session/always/deny
    return request.respond(choice)

def register(ctx):
    ctx.register_approval_transport("my-ui", present)
```

`present` は同期でも非同期でもかまいません。Hermes はこれを上限つきのワーカーで実行し、プラグイン側が守らなくても既定の `approvals.timeout` を適用します。渡される request は書き換えできず、伏せ字処理済みの表示テキスト、ホスト側の表示区分（`cli` か `gateway`）、ホスト側のタイムアウト、選べる選択肢、そして中身の見えないリクエスト ID とダイジェストを持っています。
返す値は
`request.respond(choice)` の結果にしてください。request に結びついていない辞書や、古い、あるいは書き換えられたリクエスト ID・ダイジェストは拒否されます。ホストが提示していない範囲をプラグイン側が返すこともできません（たとえば、1 回限りの確認に対して `always` を返すことはできません）。

登録しただけでは何も起こりません。プラグインを有効にすることと、その受け渡し口を選ぶことは、別々の同意の手順です。

```yaml
plugins:
  enabled: [my-approval-plugin]

security:
  approval:
    transport: my-ui
    transport_fallback: deny     # default
```

受け渡し口で例外が起きたとき、時間切れになったとき、登録が見つからないとき、選択肢が不正なとき、応答が古いときは、既定ですべて拒否になります。選んだ受け渡し口が使えなかったときに、あえて通常の CLI / TUI / ゲートウェイ / ACP の画面に確認を出したい場合は `transport_fallback: builtin` を設定してください。この設定をはっきり入れない限り、Hermes が別の画面に確認を出すことはありません。

絶対に通さないコマンドの遮断、sudo の標準入力の保護、利用者が書いた拒否ルール、リクエストの結びつけ、許可する範囲、保存、フック、そして最終的な許可判断は、いずれも Hermes 側が持ったままです。絶対に通さないコマンドは、受け渡し口のコールバックが呼ばれる前に遮断されます。この仕組みには、プラグインによる承認ポリシーも、自動で許可するコールバックも、`pre_tool_call` の必須ポリシーも、**意図的に用意されていません**。将来、承認ポリシーを扱う権限が用意されるとすれば、プラグインの権限同意の仕組みに乗ることになりますが、受け渡し口を選んだからといってその権限が付くわけではありません。

### すでに使っている場合の移行 {#migration-for-existing-users}

プラグインを自分で有効にする方式（設定スキーマ v21 以降）の Hermes に上げると、`~/.hermes/plugins/` にすでに入っていて `plugins.disabled` に載っていなかったユーザープラグインは、**自動的に** `plugins.enabled` へ引き継がれます。今の環境はそのまま動き続けます。同梱の単体プラグインは引き継がれません。すでに使っている人でも、明示的に有効にする必要があります。（同梱のプラットフォーム / バックエンドのプラグインは、もともと関門の対象ではなかったので引き継ぎも不要です。）

## 使えるフック {#available-hooks}

プラグインは、`hermes_cli.plugins.VALID_HOOKS` が現在受け付けている 26 個のライフサイクルイベントを登録できます。正確な発火のタイミング、戻り値の扱い、渡されるデータの項目、プライバシー上の注意については、**[イベントフックの一覧](/hermes/docs/user-guide/features/hooks/#shipped-plugin-hook-catalog)** が正本です。

| 性質による分類 | 用意されているフック |
|---|---|
| **指示・制御** | `pre_tool_call`, `pre_llm_call`, `pre_verify`, `pre_gateway_dispatch` |
| **変換** | `transform_tool_result`, `transform_terminal_output`, `transform_llm_output`, `pre_transcription` |
| **観測** | `post_tool_call`, `post_llm_call`, `pre_api_request`, `post_api_request`, `api_request_error`, `on_stream_start`, `on_stream_delta`, `on_stream_end`, `on_interim_message`, `on_session_start`, `on_session_end`, `on_session_finalize`, `on_session_reset`, `on_skill_lifecycle`, `subagent_start`, `subagent_stop`, `pre_approval_request`, `post_approval_response`, `pre_command`, `kanban_task_claimed`, `kanban_task_completed`, `kanban_task_blocked` |

この分類は今の挙動を説明したものであり、今後の命名規則を定めるものではありません。プラグインのミドルウェアは、これとは別のレジストリ・別の仕組みのままです。
## プラグインの種類 {#plugin-types}

Hermes のプラグインは 4 種類あります。

| 種類 | 役割 | 選び方 | 置き場所 |
|------|-------------|-----------|----------|
| **一般のプラグイン** | ツール、フック、スラッシュコマンド、CLI コマンドを追加する | 複数選択（有効 / 無効） | `~/.hermes/plugins/` |
| **記憶のプロバイダー** | 組み込みの記憶を差し替える、または補強する | 単一選択（有効なのは 1 つ） | `plugins/memory/` |
| **コンテキストエンジン** | 組み込みの文脈圧縮を差し替える | 単一選択（有効なのは 1 つ） | `plugins/context_engine/` |
| **モデルプロバイダー** | 推論のバックエンド（OpenRouter、Anthropic など）を宣言する | 複数登録し、`--provider` / `config.yaml` で選ぶ | `plugins/model-providers/` |

記憶のプロバイダーとコンテキストエンジンは**プロバイダー型のプラグイン**で、それぞれ同時に 1 つしか有効にできません。モデルプロバイダーもプラグインですが、こちらは同時にいくつも読み込まれ、利用者が `--provider` か `config.yaml` でそのつど 1 つを選びます。一般のプラグインは、好きな組み合わせで有効にできます。

## 拡張の入口ごとの行き先 {#pluggable-interfaces-where-to-go-for-each}

上の表はプラグインの 4 分類を示したものですが、「一般のプラグイン」の中でも `PluginContext` はいくつもの異なる拡張の入口を提供しています。さらに Hermes は、Python のプラグインの仕組みの外側にある拡張（設定で切り替えるバックエンド、シェルにつないだコマンド、外部サーバーなど）も受け付けます。作りたいものに合った説明ページを、この表から探してください。

| 追加したいもの | 方法 | 作り方のガイド |
|---|---|---|
| LLM が呼べる**ツール** | Python プラグイン — `ctx.register_tool()` | [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) · [ツールを追加する](/hermes/docs/developer-guide/adding-tools/) |
| **ライフサイクルのフック**（LLM 呼び出しの前後、セッションの開始 / 終了、ツールの絞り込み） | Python プラグイン — `ctx.register_hook()` | [フックの早見表](/hermes/docs/user-guide/features/hooks/) · [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) |
| CLI / ゲートウェイ向けの**スラッシュコマンド** | Python プラグイン — `ctx.register_command()` | [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) · [CLI を拡張する](/hermes/docs/developer-guide/extending-the-cli/) |
| `hermes <thing>` の**サブコマンド** | Python プラグイン — `ctx.register_cli_command()` | [CLI を拡張する](/hermes/docs/developer-guide/extending-the-cli/) |
| プラグインが同梱する**スキル** | Python プラグイン — `ctx.register_skill()` | [スキルを作る](/hermes/docs/developer-guide/creating-skills/) |
| **推論のバックエンド**（LLM プロバイダー: OpenAI 互換、Codex、Anthropic-Messages、Bedrock） | プロバイダープラグイン — `plugins/model-providers/<name>/` で `register_provider(ProviderProfile(...))` | **[モデルプロバイダープラグイン](/hermes/docs/developer-guide/model-provider-plugin/)** · [プロバイダーを追加する](/hermes/docs/developer-guide/adding-providers/) |
| **ゲートウェイのチャンネル**（Discord / Telegram / IRC / Teams など） | プラットフォームプラグイン — `plugins/platforms/<name>/` で `ctx.register_platform()` | [プラットフォームアダプターを追加する](/hermes/docs/developer-guide/adding-platform-adapters/) |
| **記憶のバックエンド**（Honcho、Mem0、Supermemory など） | メモリープラグイン — `plugins/memory/<name>/` で `MemoryProvider` を継承 | [メモリープロバイダープラグイン](/hermes/docs/developer-guide/memory-provider-plugin/) |
| **文脈を圧縮する方式** | コンテキストエンジンのプラグイン — `ctx.register_context_engine()` | [コンテキストエンジンプラグイン](/hermes/docs/developer-guide/context-engine-plugin/) |
| **画像生成のバックエンド**（DALL·E、SDXL など） | バックエンドプラグイン — `ctx.register_image_gen_provider()` | [画像生成プロバイダープラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/) |
| **動画生成のバックエンド**（Veo、Kling、Pixverse、Grok-Imagine、Runway など） | バックエンドプラグイン — `ctx.register_video_gen_provider()` | [動画生成プロバイダープラグイン](/hermes/docs/developer-guide/video-gen-provider-plugin/) |
| **読み上げ（TTS）のバックエンド**（Piper、VoxCPM、Kokoro、xtts、声を写すスクリプトなど、コマンドなら何でも） | 設定で書くのがおすすめ — `config.yaml` の `tts.providers.<name>` に `type: command` で宣言します。または Python のバックエンドプラグイン — シェルのひな形では足りない Python SDK / ストリーミング方式のエンジン向けに `ctx.register_tts_provider()` を使います。 | [TTS のセットアップ](/hermes/docs/user-guide/features/tts/#custom-command-providers) · [Python プラグインのガイド](/hermes/docs/user-guide/features/tts/#python-plugin-providers) |
| **書き起こし（STT）のバックエンド**（whisper.cpp、自作の whisper バイナリ、手元の音声認識コマンドなど） | 設定で書くのがおすすめ — `config.yaml` の `stt.providers.<name>` に `type: command` で宣言するか、昔ながらの単一コマンド用の抜け道として `HERMES_LOCAL_STT_COMMAND` を設定します。または Python のバックエンドプラグイン — Python SDK 方式のエンジン（OpenRouter、SenseAudio、Gemini-STT など）向けに `ctx.register_transcription_provider()` を使います。 | [STT のセットアップ](/hermes/docs/user-guide/features/tts/#stt-custom-command-providers) · [Python プラグインのガイド](/hermes/docs/user-guide/features/tts/#python-plugin-providers-stt) |
| **MCP 経由の外部ツール**（ファイルシステム、GitHub、Linear、Notion など、あらゆる MCP サーバー） | 設定で書きます — `config.yaml` に `mcp_servers.<name>` を `command:` か `url:` 付きで宣言します。Hermes がそのサーバーのツールを自動で見つけ、組み込みツールと並べて登録します。 | [MCP](/hermes/docs/user-guide/features/mcp/) |
| **スキルの取得元を増やす**（独自の GitHub リポジトリ、社内のスキル索引） | CLI — `hermes skills tap add <repo>` | [スキルハブ](/hermes/docs/user-guide/features/skills/#skills-hub) · [独自の tap を公開する](/hermes/docs/user-guide/features/skills/#publishing-a-custom-skill-tap) |
| **ゲートウェイのイベントフック**（`gateway:startup`、`session:start`、`agent:end`、`command:*` で発火） | `~/.hermes/hooks/<name>/` に `HOOK.yaml` と `handler.py` を置きます | [イベントフック](/hermes/docs/user-guide/features/hooks/#gateway-event-hooks) |
| **シェルフック**（イベントに合わせてシェルコマンドを実行 — 通知、監査ログ、デスクトップ通知など） | 設定で書きます — `config.yaml` の `hooks:` の下に宣言します | [シェルフック](/hermes/docs/user-guide/features/hooks/#shell-hooks) |

:::note
すべてが Python のプラグインというわけではありません。拡張の入口のいくつかは、あえて**設定に書いたシェルコマンド**（TTS、STT、シェルフック）を使う形になっていて、手元にあるコマンドを Python を書かずにそのままプラグインにできます。別の入口は**外部サーバー**（MCP）で、エージェントがそこにつないでツールを自動登録します。さらに、独自のマニフェスト形式を持つ**置くだけのディレクトリ**（ゲートウェイのフック）もあります。自分のやりたいことに合った連携の形を選んでください。上の表にある作り方のガイドは、それぞれ書き換える箇所、どう見つかるか、実例を扱っています。
:::

## NixOS で宣言的にプラグインを入れる {#nixos-declarative-plugins}

NixOS では、モジュールのオプションを使って宣言的にプラグインを入れられます。`hermes plugins install` は不要です。詳しくは **[Nix のセットアップガイド](/hermes/docs/getting-started/nix-setup/#plugins)** を参照してください。

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

宣言的に入れたプラグインは `nix-managed-` という接頭辞つきのシンボリックリンクになります。手で入れたプラグインと共存でき、Nix の設定から外すと自動的に片付けられます。

## プラグインの管理 {#managing-plugins}

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

### ワンクリックで入れるリンク（デスクトップ） {#one-click-install-links-desktop}

Hermes デスクトップ版は `hermes://` という URL の形式を登録します。そのため、ウェブサイトや README、チャットのメッセージから、プラグインのインストールへ直接つなげられます。

```
hermes://plugin/install?repo=owner/repo            # main install link
hermes://plugin/install?repo=owner/repo&enable=1   # enable the agent plugin after install
hermes://plugin/install?repo=owner/repo&force=1    # replace an existing install
```

リンクを押すと Hermes が開き、**確認のダイアログ**が出ます。リポジトリの識別子、「入れる前に」の注意書き、GitHub を見るリンクとクローン用リンクが並びます。そのうえでリポジトリを浅くクローンし、何が入っているか（バックエンドの Python である**エージェントプラグイン**か、アプリの画面である**デスクトッププラグイン**か、その両方か）を判定します。入れる部品をチェックボックスで選んで確定します。確定するまで何もインストールされません。ディープリンクが勝手にインストールを始めることはなく、エージェントプラグインのインストールは `hermes plugins install` と同じ [インストール時のセキュリティ検査](#install-time-security-scanning) を通ります。

エージェント側とデスクトップ側が 1 つのリポジトリに同居している場合も、リンクは 1 本、ダイアログも 1 つです。同じ画面は、リンクを使わなくても **Settings → Plugins → Install from Git** から開けます。古い形式の `hermes://plugin-agent/…` と `hermes://plugin-desktop/…` の URL も、同じダイアログに流れます。開発ビルド（`npm run dev`）では形式が `hermes-dev://` になります。

ウェブサイト側に SDK は要りません。普通のリンクで動きます。

```html
<a href="hermes://plugin/install?repo=owner/repo&enable=1">Install in Hermes</a>
```

MCP サーバーにも同じ形のリンクがあります。
[Hermes に追加するリンク](/hermes/docs/reference/mcp-config-reference/#add-to-hermes-link) を参照してください。

### プラグインの権限と同意 {#plugin-capabilities-and-consent}

プラグインは、使いたいホスト側の特権的な機能を `plugin.yaml` で宣言できます。

```yaml
name: my-plugin
capabilities:
  - tools.override        # replace built-in tools
  - llm.model_override    # pick the model for host-owned LLM calls
```

プラグインが権限を宣言していると、`hermes plugins install`（および `hermes plugins enable`）が、それぞれの危険性を 1 行で添えた一覧を表示し、一度だけ確認を求めます。同意すると、その内容が同意のハッシュと日時とともに `plugins.entries.<id>.granted_capabilities` に記録されます。断った場合はプラグイン自体は有効なまま、その権限だけが切れた状態になります。行儀のよいプラグインは `ctx.has_capability()` で確かめ、権限がなければ機能を落として動き続けます。

**更新時の再同意:** プラグインを更新した結果、まだ許可していない権限が宣言されていた場合、`hermes plugins update` が増えた分を示してもう一度確認します。新しい権限は同意するまで切れたままです。プラグインの更新が、こっそり権限を広げることはできません。

**対話できない場面では拒否側に倒れます:** 端末につながっていない状態でインストールや更新をすると、インストール自体は完了しますが、宣言された権限は付与*されません*。あとから `hermes plugins enable <id>` を対話的に実行して許可してください。

状態はいつでも確認できます。

```bash
hermes plugins capabilities             # all plugins with declared/granted capabilities
hermes plugins capabilities my-plugin   # one plugin, declared vs granted
```

権限の id は、以前からある機能ごとの設定項目と 1 対 1 で対応しています。古い項目も動き続けますが、同意の流れを使う形に移ったため**非推奨**です。

| 権限 | 以前の設定項目（`plugins.entries.<id>.…`） |
|---|---|
| `tools.override` | `allow_tool_override` |
| `llm.provider_override` | `llm.allow_provider_override` |
| `llm.model_override` | `llm.allow_model_override` |
| `llm.agent_id_override` | `llm.allow_agent_id_override` |
| `llm.profile_override` | `llm.allow_profile_override` |
| `llm.task_override` | `llm.allow_task_override` |
| `gateway.platform_actions` | `allow_platform_actions` |

権限が付与されているか、古い設定項目が入っているかの*どちらか*が満たされていれば通ります。今までの設定はそのまま使えます。

:::warning サンドボックスではありません
権限は**同意と記録のための層**であって、隔離の仕組みではありません。プラグインは同じプロセス内でごく普通の Python として動くので、悪意のあるプラグインはここに書かれた関門をすべて無視できます。権限を許可するということは、そのプラグインの作者を信頼すると表明することです。コードを監査したことにはなりませんし、Hermes がそのプラグインのコードを確認したわけでもありません。信頼できる出どころのプラグインだけを入れてください。
:::

### プラットフォームへの操作 {#platform-actions}

`ctx.platform_actions` は、稼働中のゲートウェイのアダプター一覧を通じて、つながっているチャットのプラットフォームに働きかけるための、権限で守られた最小限の操作をプラグインに提供します。アダプターを勝手に書き換える代わりの、正規の方法です。**既定では切れています。**呼び出しのたびに `gateway.platform_actions` の権限（以前の設定項目は `plugins.entries.<id>.allow_platform_actions`）が確認され、許可されていなければ、何もせずに構造化されたエラーを返します。

v1 の操作は次の 2 つです（どちらも `async` で、素の辞書を返し、フックの処理へ例外を投げることはありません）。

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

成功すると `{"ok": True, "action": <verb>}` が返ります。失敗すると `{"ok": False, "error": <code>, "detail": <str>}` が返り、エラーコードは次の決まったものになります。
`capability_not_granted`, `invalid_argument`, `gateway_unavailable`,
`unknown_platform`, `adapter_not_registered`, `adapter_disconnected`,
`unsupported_platform_action`, `action_failed`。操作の前には、対象のアダプターが存在してつながっていることが確かめられます。切れている、あるいは見つからないアダプターは、例外ではなく構造化されたエラーになります。

v1 で対応しているのは Telegram と Discord です。Telegram の `add_reaction` は、ボットのリアクションを*置き換え*ます（Bot API の仕様上、以前のボットのリアクションに積み増すのではなく差し替わります）。許可されたものも拒否されたものも、すべての操作がプラグインの id、操作名、プラットフォーム、結果とともにログに記録されます。

:::warning セキュリティ上の注意
プラットフォームへの操作は、**ボットとしてメッセージを扱える力**です。許可されたプラグインは、フックのきっかけになったチャットに限らず、ゲートウェイのボットが届くあらゆるチャットでリアクションを付けたり、スレッド名を変えたりできます。`gateway.platform_actions` は信頼できるプラグインにだけ許可し、どんな操作をするかを明記しているプラグインを選んでください。プラットフォームの SDK のデータやハンドルに直接触る手段は、**あえて**この仕組みに含めていません。#64176 の 2 巡目の設計修正のとおり、それには「安定性を保証しない」という但し書きつきの専用の権限（`gateway.raw_events`）と別の設計が必要で、まだ出荷されていません。
:::

### コミュニティのプラグインを探す {#discovering-community-plugins}

`hermes plugins search <term>` は、**コミュニティのプラグイン索引**を検索します。これは、コミュニティのプラグインを機械で読める形にまとめた静的な JSON のカタログです。名前・説明・タグをまたいだあいまい検索になります。

```bash
hermes plugins search telegram               # fuzzy search
hermes plugins search                        # browse the whole index
hermes plugins search --capability platform  # filter by declared capability
hermes plugins search media --json           # machine-readable output
hermes plugins search --refresh              # bypass the 24h local cache
```

目当てのプラグインが見つかったら、名前だけでインストールできます。名前は索引を通じて `owner/repo` と、索引に固定されたコミットへ解決されます。

```bash
hermes plugins install hermes-media-studio
```

名前が複数の項目に一致した場合は、候補が並べて表示され、何もインストールされません。`owner/repo` や Git の URL をはっきり指定した場合は索引を一切見ず、これまでどおりに動きます。`--ref <sha>` を明示すると、索引側の固定より常に優先されます。

**索引の取得のしかた。**索引は決まった URL
（`https://raw.githubusercontent.com/NousResearch/hermes-plugin-index/main/index.json`。`hermes config set plugins.index_url <url>` で変更できます）に置かれています。取得した内容は `~/.hermes/cache/plugin_index.json` に 24 時間キャッシュされます。取得先に届かないときは古いキャッシュが使われ、キャッシュもまだ無いときは Hermes に同梱された初期コピーが使われます。つまり、ネットにつながっていなくても検索は動きます。

**索引の項目の形式。**それぞれの項目は次のような JSON のオブジェクトです。

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

`repo` は GitHub の `owner/name` という識別子、`ref` は書き換わることのないコミット SHA の固定で、`subdir` は省略可能でモノレポに対応するためのものです。同梱されている初期ファイル（リポジトリ内の `hermes_cli/data/plugin_index.json`）が、形式の見本になります。

**プラグインを登録するには。**索引はただの JSON ファイルとして管理されています。
[hermes-plugin-index](https://github.com/NousResearch/hermes-plugin-index)
のリポジトリに、自分の項目（名前、説明、作者、タグ、`owner/repo`、固定するコミット SHA）を追加するプルリクエストを送ってください。審査の対象はその項目の*メタデータ*だけです。

:::warning 索引に載っていること ≠ 監査済み
コミュニティの索引に載っているというのは、その項目のメタデータが確認されたという意味であって、**コードの監査ではありません**。インストールするときは、通常どおりの同意と確認の流れを通ります（プラグインは無効の状態で入り、有効にするのは別の手順で、ツールを差し替える権限にはさらに別の許可が要ります）。有効にする前に、そのプラグインのソースを読んでください。
:::

### プラグインパック {#plugin-packs}

**プラグインパック**は、複数のプラグインをまとめて固定する、宣言的で共有できる YAML ファイル（`hermes-pack.yaml`）です。ゲームの MOD パックを共有する感覚に近いものです。パックのインストールは、普通の固定インストールへ展開されるだけで、実行時に新しい何かが増えるわけではありません。

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

**供給経路の安全性について。**各項目の `ref` は、40 文字ちょうどのコミット SHA でなければなりません。タグやブランチ名は、どの項目が悪いかを示すエラーとともに拒否されます。コミュニティ索引と同じ決まりです。パックのインストールは `hermes plugins install --ref <sha>` とまったく同じ固定インストールの経路を通り、同じ出どころの情報を `plugins/.install-metadata.json` に記録します。同じパックを 2 回入れれば、まったく同じ結果になります。パックは [マニフェスト v2 の項目](/hermes/docs/developer-guide/plugins/)（`manifest_version`、`api_version`、`requires_plugins`）の上に成り立っており、各プラグイン自身のマニフェストは通常のインストール経路で検証されます。

**同意をまとめて与えることはできません。**`pack install` は、必ず確認の画面を出します（すべてのプラグイン、取得元、固定されたコミット、宣言されている権限が並びます）。そのうえで、パックの中身についての確認を**一度**求めます。その後は、各プラグインが宣言した権限が、通常どおりプラグインごとの同意の確認を通ります。`hermes plugins install` を 1 つずつ実行するのとまったく同じです。`--yes` は用意されておらず、対話できない場面ではパックを入れられません。

**秘密情報はパックに乗りません。**`config:` の初期値は、秘密でない `plugins.entries.<id>` のキーに限られます。秘密らしい名前のキー（`*token*`、`*key*`、`*password*` など）、権限の付与、非推奨の `allow_*` の信頼設定は、インストール時に拒否され、書き出し時には取り除かれます。秘密情報が必要なプラグインは、自分の `requires_env` で宣言し、いつもどおりインストール時に入力を求めます。`plugins.entries.<id>` にすでにある利用者の値は、常にパックの初期値より優先されます。

**一部が失敗したとき。**プラグインはそれぞれ独立してインストールされます。失敗はプラグインごとに報告され、残りはそのまま続行し、1 つでも失敗していればコマンドは 0 以外で終了します。

**書き出しの注意点。**`pack export` に含まれるのは、Git の出どころがわかっているプラグイン（`hermes plugins install` で入れたもの）だけです。手元にしかないプラグインは、インストール可能な項目としてではなく、出力される YAML に注意書きのコメントとして並びます。

`skills:` の一覧は、インストール時に読み取られて表示されますが、まだ自動では入りません。当面は手で入れてください（`hermes skills`）。スキルハブの id をパックのインストールにつなぐ作業は、続きの課題として記録されています。

### インストール時のセキュリティ検査 {#install-time-security-scanning}

`hermes plugins install` と `hermes plugins update` は、プラグインを有効にする前に、そのファイル一式に対して静的なセキュリティ検査を必ず実行します（Claude Cowork のスキル・プラグインのセキュリティ検査に着想を得ています）。検査器は [スキルハブの防御](/hermes/docs/user-guide/features/skills/) と同じ脅威パターンの仕組みを使います。認証情報の持ち出し、リバースシェル、破壊的なコマンド、居座りの仕掛け、難読化された実行、そして説明用ファイルに仕込まれたプロンプトインジェクションが対象で、プラグインならではの除外も入っています。プロバイダー系のプラグインが**自分の**API キーを環境変数から読むこと（`requires_env` として文書化されている使い方）は、警告されません。

判定は 3 段階で、Cowork の pass / warn / fail に対応します。

| 判定 | 動き |
|---|---|
| **safe** | 通常どおりインストールされ、追加の表示はありません |
| **caution** | 見つかった内容が表示され、`Install anyway? [y/N]` に答えます（`--force` でも進めます） |
| **dangerous** | 遮断されます。`--force` でも**通せません** |

`hermes plugins update` で更新後のファイル一式が dangerous と判定された場合、内容を確認して自分で有効に戻すまで、そのプラグインは無効になります。

検査は既定で有効です。`config.yaml` で止められます。

```yaml
plugins:
  scan_on_install: false
```

### 対話画面 {#interactive-ui}

引数なしで `hermes plugins` を実行すると、複数の要素をまとめた対話画面が開きます。

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

- **General Plugins の区画** — チェックボックスです。スペースキーで切り替えます。チェックが入っていれば `plugins.enabled`、外れていれば `plugins.disabled`（はっきり切った状態）に入ります。
- **Provider Plugins の区画** — 今どれが選ばれているかが表示されます。ENTER を押すとラジオボタンの選択画面に入り、有効にするプロバイダーを 1 つ選びます。
- 同梱プラグインも同じ一覧に、`[bundled]` の印つきで並びます。

プロバイダー型プラグインの選択は `config.yaml` に保存されます。

```yaml
memory:
  provider: "honcho"      # empty string = built-in only

context:
  engine: "compressor"    # default built-in compressor
```

### 有効 / 無効 / どちらでもない {#enabled-vs-disabled-vs-neither}

プラグインは次の 3 つの状態のどれかにあります。

| 状態 | 意味 | `plugins.enabled` に入っている？ | `plugins.disabled` に入っている？ |
|---|---|---|---|
| `enabled` | 次のセッションで読み込まれます | はい | いいえ |
| `disabled` | はっきり切った状態 — `enabled` にも入っていても読み込まれません | （関係ありません） | はい |
| `not enabled` | 見つかってはいるが、まだ選んでいない状態 | いいえ | いいえ |

インストールしたばかりのプラグインや同梱プラグインは、既定で `not enabled` です。`hermes plugins list` はこの 3 つの状態を区別して表示するので、自分ではっきり切ったものと、有効にされるのを待っているだけのものを見分けられます。

セッションの実行中は、`/plugins` で今読み込まれているプラグインを確認できます。

## メッセージを差し込む {#injecting-messages}

プラグインは `ctx.inject_message()` を使って、CLI の会話や、すでにわかっているゲートウェイのセッションにメッセージを差し込めます。

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

**シグネチャ:** `ctx.inject_message(content: str, role: str = "user", *, session_key: str | None = None) -> bool`

CLI では次のように動きます。

- エージェントが**待機中**（利用者の入力待ち）なら、そのメッセージは次の入力として並べられ、新しいやり取りが始まります。
- エージェントが**処理中**（実際に動いている最中）なら、そのメッセージは今の処理に割り込みます。利用者が新しいメッセージを打って Enter を押したのと同じ扱いです。
- `"user"` 以外の役割の場合、内容の先頭に `[role]` が付きます（例: `[system] ...`）。
- 正しく並べられた場合は `True` を返します。

ゲートウェイでは次のように動きます。

- `session_key` は必須で、すでに存在するゲートウェイのセッションを指していなければなりません。これは経路を決めるための変わらないキーであって、CLI のセッション ID ではありません。
- Hermes は、そのセッションに保存されているプラットフォーム、チャット、スレッド、プロフィール、会話の履歴を再利用します。この API から新しいチャットの経路を指定することはできません。
- Hermes は、保存されている経路を、今のゲートウェイの認可ルールに照らして送る前に確認し直します。
- アダプターの時点や上流での認可判断だけに頼っていた経路は、今の中核の許可リスト、ペアリング、あるいは明示的な全許可設定から Hermes が検証し直せない限り、拒否されます。
- 差し込まれた文章は、常に会話としての入力です。スラッシュコマンドを実行することも、ツールを承認することも、保留中の確認や問い返しに答えることもできません。
- 送信の処理が終わるまで、経路と会話は固定されます。処理が始まる前に話題の復元で経路が変わったり、セッションが切り替わったりした場合、Hermes はその要求を捨てます。
- 要求は、プラットフォームのアダプターの通常のメッセージ経路に入ります。動いている最中のセッションでは、競合するやり取りを新しく始めるのではなく、既存の待ち行列に入ります。
- 稼働中のゲートウェイが非同期の処理として要求を受け付けたときに `True` を返します。これは、エージェントのやり取りやプラットフォームへの配信が完了したことを示すものではありません。
- `session_key` が無いとき、権限が付与されていないとき、要求を受け付けられる稼働中のゲートウェイが無いときは `False` を返します。非同期に受け付けたあとで、そのセッションキーが未知だったり経路をたどれなかったりした場合は、ゲートウェイのログに書かれます。

この仕組みによって、遠隔操作のビューアー、メッセージの橋渡し、Webhook の受け口といったプラグインが、外部のできごとを会話へ流し込めるようになります。

ゲートウェイへの差し込みは、エージェントの応答を外部のメッセージングのプラットフォームへ送り出せます。そのため、どのプラグインについても既定で無効です。`config.yaml` でプラグインごとに許可してください。

```yaml
plugins:
  entries:
    my-plugin:
      allow_gateway_injection: true
```

:::warning
ゲートウェイへの差し込みは、信頼できるプラグインにだけ許可してください。Hermes はこのホスト API の権限を確認し、すでにあるセッションの経路に限定しますが、Python のプラグインは同じプロセス内で動くので、この設定は隔離の仕組みではありません。
:::

:::note
このプラグイン API は、外部のプロセス向けに公開の HTTP エンドポイントや CLI コマンドを提供するものではありません。プラグインの側が、送り先のゲートウェイの `session_key` をあらかじめ知っている必要があります。たとえば、自分の信頼できる設定に書いておくか、以前のセッションの状態を保持しておく形になります。
:::

## プラグインから MCP サーバーを呼ぶ {#calling-mcp-servers-from-plugins}

`ctx.call_mcp()` を使うと、プラグインから、利用者が設定している MCP サーバーのツールを、フックやツールのハンドラーの中から同期的に呼び出せます。呼び出しは Hermes がもともと持っている MCP クライアントを通ります（モデルが MCP のツールを呼ぶときとまったく同じ接続、信頼度による関門、遮断器、再接続の仕組みで、別のクライアントが立つことはありません）。

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

**シグネチャ:** `ctx.call_mcp(server: str, tool: str, arguments: dict | None = None, timeout: float = 30) -> dict`

戻り値は決まった形の入れ物です。`{"ok": True, "result": ...}`（サーバーが返していれば `structuredContent` も付きます）か、`{"ok": False, "error": "..."}` になります。およそ 64 KB を超える結果は切り詰められ、`"truncated": True` の印が付きます。

### セキュリティ: 既定は無効で、サーバーごとの許可リスト {#security-default-off-per-server-allowlist}

プラグインには、**既定では MCP へのアクセス権がありません**。運用者が `config.yaml` でサーバーを 1 つずつ許可する必要があります。

```yaml
plugins:
  entries:
    my-plugin:
      mcp_allowlist: ["knowledge_rag", "github"]
```

- 一覧に無いサーバーを呼ぶと `PermissionError` が発生し、設定すべき項目名がそのまま示されます。
- 許可はサーバーごと・プラグインごとです。設定済みのすべてのサーバーへ漠然と権限が及ぶことはありませんし、`"*"` のようなワイルドカードも効きません。
- すべての呼び出しにタイムアウト（既定 30 秒）が強制されるので、応答しなくなった MCP サーバーが、呼び出し元のフックやツールの処理を止めてしまうことはありません。
- MCP サーバーが返す内容は信頼できないものとして扱ってください。`result` は指示ではなくデータとして扱い、検証せずに特権的な判断（承認やコマンドの実行）へ流し込まないでください。

:::warning
`mcp_allowlist` を許可すると、そのプラグインは、その MCP サーバーに対してモデルと同じアクセス権を持ちます。サーバーが公開している書き込み系のツールも含まれます（サーバーの `trust` 段階による関門は効きます）。そのプラグインに本当に必要なサーバーだけを許可してください。
:::

ハンドラーの取り決め、スキーマの形式、フックの挙動、エラーの扱い、よくある間違いについては、**[詳しいガイド](/hermes/docs/developer-guide/plugins/)** を参照してください。
