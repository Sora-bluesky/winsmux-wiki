---
title: "プラグイン"
description: "プラグインの仕組みで、独自のツール・フック・連携を Hermes に足す"
upstream_path: user-guide/features/plugins.md
upstream_blob: e0785ccaaac0877a5bb5b7ab9d9ec3bb9a8acc7c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins
---

# プラグイン {#plugins}

Hermes には、中核のコードに手を入れずに独自のツール・フック・連携を足すための、プラグインの仕組みがあります。

自分用、チーム用、あるいは 1 つのプロジェクト用に独自のツールを作りたいなら、
たいていはこれが正しい道です。開発者ガイドの
[ツールを足す](/hermes/docs/developer-guide/adding-tools/)のページは、`tools/` と `toolsets.py` にある
Hermes の中核の内蔵ツール向けです。

**→ [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/)** — 動く完成例を添えた手順つきの案内です。

## 概要 {#quick-overview}

`plugin.yaml` と Python のコードが入ったディレクトリを `~/.hermes/plugins/` へ置きます。

```
~/.hermes/plugins/my-plugin/
├── plugin.yaml      # manifest
├── __init__.py      # register() — wires schemas to handlers
├── schemas.py       # tool schemas (what the LLM sees)
└── tools.py         # tool handlers (what runs when called)
```

Hermes を起動すると、作ったツールが内蔵のツールと並んで現れます。モデルはすぐに呼び出せます。

### 動く最小の例 {#minimal-working-example}

次は、`hello_world` というツールを足し、フックでツール呼び出しをすべて記録する、完成したプラグインです。

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

この 2 つのファイルを `~/.hermes/plugins/hello-world/` に置いて Hermes を再起動すれば、モデルはすぐに `hello_world` を呼べます。フックは、ツールが呼ばれるたびに 1 行の記録を出します。

モデルから見えるツールの説明は `schema["description"]` に書きます。任意で渡せる `ctx.register_tool(description=...)` の値は、それとは別の `ToolEntry` の登録情報です。省略するとスキーマの説明が既定として使われますが、`description` の無いスキーマへ Hermes が書き戻すことはありません。文言はスキーマの側に一度だけ書くのがおすすめです。両方に書く場合は、内容をそろえておいてください。モデルが見るのはスキーマ側の値です。

`./.hermes/plugins/` に置いたプロジェクト内のプラグインは、既定では無効です。信頼できるリポジトリでだけ、Hermes を起動する前に `HERMES_ENABLE_PROJECT_PLUGINS=true` を設定して有効にしてください。

## プラグインにできること {#what-plugins-can-do}

以下の `ctx.*` の API は、すべてプラグインの `register(ctx)` 関数の中で使えます。

| できること | 書き方 |
|-----------|-----|
| ツールを足す | `ctx.register_tool(name=..., toolset=..., schema=..., handler=...)` |
| フックを足す | `ctx.register_hook("post_tool_call", callback)` |
| スラッシュコマンドを足す | `ctx.register_command(name, handler, description)` — CLI とゲートウェイのセッションに `/name` を足します |
| コマンドからツールを呼ぶ | `ctx.dispatch_tool(name, args)` — 登録済みのツールを、親エージェントの文脈を自動でつないだ状態で呼びます |
| CLI のコマンドを足す | `ctx.register_cli_command(name, help, setup_fn, handler_fn)` — `hermes <plugin> <subcommand>` を足します |
| メッセージを差し込む | `ctx.inject_message(content, role="user", session_key=...)` - [メッセージを差し込む](#injecting-messages)を参照してください |
| データファイルを同梱する | `Path(__file__).parent / "data" / "file.yaml"` |
| スキルを同梱する | `ctx.register_skill(name, path)` — `plugin:skill` の名前空間になり、`skill_view("plugin:skill")` で読み込みます |
| 環境変数で門をつくる | plugin.yaml の `requires_env: [API_KEY]` — `hermes plugins install` の途中で尋ねられます |
| pip で配る | `[project.entry-points."hermes_agent.plugins"]` |
| ゲートウェイの基盤を登録する（Discord、Telegram、IRC など） | `ctx.register_platform(name, label, adapter_factory, check_fn, ...)` — [基盤アダプターを足す](/hermes/docs/developer-guide/adding-platform-adapters/)を参照してください |
| 画像生成のバックエンドを登録する | `ctx.register_image_gen_provider(provider)` — [画像生成プロバイダーのプラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/)を参照してください |
| 動画生成のバックエンドを登録する | `ctx.register_video_gen_provider(provider)` — [動画生成プロバイダーのプラグイン](/hermes/docs/developer-guide/video-gen-provider-plugin/)を参照してください |
| 文脈の圧縮エンジンを登録する | `ctx.register_context_engine(engine)` — [文脈エンジンのプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)を参照してください |
| ターミナル実行のバックエンド（クラウドのサンドボックス）を登録する | `ctx.register_terminal_environment_provider(provider)` — [ターミナル環境のプラグイン](/hermes/docs/developer-guide/terminal-environment-plugin/)を参照してください |
| 人への承認の問いかけを振り分ける | `ctx.register_approval_transport(name, present_fn)` — [承認の伝え方](#approval-transports)を参照してください |
| 記憶のバックエンドを登録する | `plugins/memory/<name>/__init__.py` で `MemoryProvider` を継承します — [記憶プロバイダーのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/)を参照してください（別の探索の仕組みを使います） |
| ホストが持つ LLM の呼び出しを行う | `ctx.llm.complete(...)` / `ctx.llm.complete_structured(...)` — 利用者がいま使っているモデルと認証を借りて 1 回だけ生成します。JSON スキーマの検証も任意で使えます。[プラグインからの LLM 利用](/hermes/docs/developer-guide/plugin-llm-access/)を参照してください |
| MCP のツールを呼ぶ（権限で門をつくる） | `ctx.call_mcp(server, tool, arguments, timeout=30)` — [プラグインから MCP サーバーを呼ぶ](#calling-mcp-servers-from-plugins)を参照してください |
| 推論のバックエンド（LLM プロバイダー）を登録する | `plugins/model-providers/<name>/__init__.py` で `register_provider(ProviderProfile(...))` を呼びます — [モデルプロバイダーのプラグイン](/hermes/docs/developer-guide/model-provider-plugin/)を参照してください（別の探索の仕組みを使います） |

## プラグインの探索 {#plugin-discovery}

| 出どころ | パス | 使いどころ |
|--------|------|----------|
| 同梱 | `<repo>/plugins/` | Hermes に付いてきます — [同梱プラグイン](/hermes/docs/user-guide/features/built-in-plugins/)を参照してください |
| 利用者 | `~/.hermes/plugins/` | 個人用のプラグイン |
| プロジェクト | `.hermes/plugins/` | プロジェクト固有のプラグイン（`HERMES_ENABLE_PROJECT_PLUGINS=true` が必要です） |
| pip | `hermes_agent.plugins` の entry_points | 配布されるパッケージ |
| Nix | `services.hermes-agent.extraPlugins` / `extraPythonPackages` | NixOS での宣言的な導入 — [Nix の設定](/hermes/docs/getting-started/nix-setup/#plugins)を参照してください |

名前がぶつかった場合、あとの出どころが先のものを上書きします。つまり、同梱プラグインと同じ名前の利用者のプラグインは、同梱のほうを置き換えます。

### プラグインの下位分類 {#plugin-sub-categories}

それぞれの出どころの中で、Hermes は下位分類のディレクトリも見分けて、専用の探索の仕組みへプラグインを回します。

| 下位ディレクトリ | 何が入るか | 探索の仕組み |
|---|---|---|
| `plugins/`（直下） | 一般のプラグイン — ツール、フック、スラッシュコマンド、CLI コマンド、同梱スキル | `PluginManager`（種類は `standalone` か `backend`） |
| `plugins/platforms/<name>/` | ゲートウェイのチャンネルのアダプター（`ctx.register_platform()`） | `PluginManager`（種類は `platform`。1 階層深くなります） |
| `plugins/image_gen/<name>/` | 画像生成のバックエンド（`ctx.register_image_gen_provider()`） | `PluginManager`（種類は `backend`。1 階層深くなります） |
| `plugins/memory/<name>/` | 記憶プロバイダー（`MemoryProvider` を継承） | `plugins/memory/__init__.py` にある**専用の読み込み処理**（種類は `exclusive` — 一度に 1 つだけ動きます） |
| `plugins/context_engine/<name>/` | 文脈の圧縮エンジン（`ctx.register_context_engine()`） | `plugins/context_engine/__init__.py` にある**専用の読み込み処理**（一度に 1 つだけ動きます） |
| `plugins/model-providers/<name>/` | LLM プロバイダーの定義（`register_provider(ProviderProfile(...))`） | `providers/__init__.py` にある**専用の読み込み処理**（最初の `get_provider_profile()` の呼び出し時に走査します） |

`~/.hermes/plugins/model-providers/<name>/` に置いた利用者のプラグインは、同じ名前の同梱のモデルプロバイダーを上書きします（`register_provider()` では後に書いたほうが勝ちます）。そのため、リポジトリを一切いじらずに内蔵のプロバイダー定義を差し替えられます。記憶プロバイダーは逆向きです。`~/.hermes/plugins/memory/<name>/` の場合、名前がぶつかると**同梱**のほうが勝ちます（同梱、利用者、プロジェクト、entry point の順で、最初に見つかったものが勝ちます）。ですから利用者の記憶プロバイダーには、固有の名前が必要です。

## プラグインは自分で有効にするもの（いくつか例外あり） {#plugins-are-opt-in-with-a-few-exceptions}

**一般のプラグインと、利用者が導入したバックエンドは、既定では無効です。** 探索では見つかるので `hermes plugins` や `/plugins` には並びますが、`~/.hermes/config.yaml` の `plugins.enabled` に名前を足すまで、フックもツールも読み込まれません。第三者のコードが、明示的な同意なしに動くのを防ぐためです。

```yaml
plugins:
  enabled:
    - my-tool-plugin
    - disk-cleanup
  disabled:       # optional deny-list — always wins if a name appears in both
    - noisy-plugin
  # Optional: wall-clock cap (seconds) for timeout-bounded in-process Python
  # plugin hook callbacks (hot-path observers + pre_tool_call). Default 30;
  # set 0 to disable; values above 600 are clamped. Timed-out pre_tool_call
  # callbacks fail closed (block the tool). Caller-thread hooks such as
  # subagent_stop are never moved onto a timeout worker.
  # Shell hooks keep their own per-entry timeout under the top-level hooks: key.
  hook_callback_timeout: 30
```

状態を切り替える方法は 3 つあります。

```bash
hermes plugins                    # interactive toggle (space to check/uncheck)
hermes plugins enable <name>      # add to allow-list
hermes plugins disable <name>     # remove from allow-list + add to disabled
```

`hermes plugins install owner/repo` のあとには `Enable 'name' now? [y/N]` と尋ねられます。既定は「いいえ」です。スクリプトから導入する場合は `--enable` か `--no-enable` で、この確認を飛ばせます。

同じ結果を再現できる導入にしたいなら、変わらない完全なコミットを固定してください（タグ、ブランチ、省略した SHA は受け付けません）。

```bash
hermes plugins install owner/repo --ref 0123456789abcdef0123456789abcdef01234567
```

Hermes はそのコミットを切り離した状態でチェックアウトし、`HEAD` が要求した SHA とぴったり一致することを確かめ、正規の出どころ、導入したリビジョン、固定の有無を、いまのプロファイルに記録します。`hermes plugins update` は固定されたプラグインを動かすことを拒みます。新しいコミットへ移すときは
`hermes plugins install <source> --force --ref <new-commit>` で明示的に指定してください。プロファイル内に置かれる導入の記録には、設定の値も、環境の値も、秘密情報も、権限の付与も含まれません。

同じ固定は Hermes Desktop でもできます。**Skills → Plugins → Install from
Git** に *Pin to commit* という欄があり、40 文字の完全な SHA を入れられます。プラグインの一覧では、
固定して導入したものすべてに `pinned @ <sha8>` の印が付くので、チームの全員が同じコミットで
動かしているかを確かめられます。`hermes plugins list` でも、Source の列に固定が表示されます
（`git pinned@<sha8>`）。固定は非公開のリポジトリでも使えます。資格情報は、下で説明する保存済みのものが同じように使われます。

### 非公開のリポジトリから導入する {#installing-from-a-private-repository}

`hermes plugins install` は対話なしでクローンします（ユーザー名やパスワードを尋ねることはありません）。
そのため非公開のリポジトリには、Hermes が自分で見つけられる資格情報が要ります。`https://` の
出どころでは、次の順に試します。

1. `.env` にある `GITHUB_TOKEN` または `GH_TOKEN`（GitHub のホストのみ）。
2. `gh` CLI のログイン（`gh auth login`）。GitHub のホストのみ。
3. そのホストに対する git の資格情報ヘルパー（`git credential fill`）。資格情報がすでに保存されていれば、
   GitLab、Bitbucket、自前で立てたサーバーでも使えます。

資格情報は、その導入や更新のときだけ使う HTTP ヘッダーとして 1 回だけ送られます。
プラグインの `.git/config` にも導入の記録にも書き込まれません。
SSH の出どころ（`git@host:owner/repo.git`）は、これまでどおり ssh-agent で認証します。
同じ探し方は `hermes plugins update`、カタログからの git 経由の MCP の導入、
git の URL から取り寄せるプロファイルの配布物にも使われます。

### 許可リストが門にしないもの {#what-the-allow-list-does-not-gate}

いくつかの種類のプラグインは `plugins.enabled` を通りません。Hermes の内蔵の機能面の一部であり、既定で止めてしまうと基本的な動作が壊れるためです。

| プラグインの種類 | 代わりにどう有効になるか |
|---|---|
| **同梱の基盤プラグイン**（`plugins/platforms/` にある IRC、Teams など） | 出荷されるゲートウェイのチャンネルがすべて使えるよう、自動で読み込まれます。チャンネル自体は `config.yaml` の `gateway.platforms.<name>.enabled` で有効になります。 |
| **同梱のバックエンド**（`plugins/image_gen/` の画像生成プロバイダーなど） | 既定のバックエンドが何もせず動くよう、自動で読み込まれます。選択は `config.yaml` の `<category>.provider` で行います（例: `image_gen.provider: openai`）。 |
| **記憶プロバイダー**（`plugins/memory/`） | すべて見つかりますが、動くのはちょうど 1 つです。`config.yaml` の `memory.provider` で選びます。 |
| **文脈エンジン**（`plugins/context_engine/`） | すべて見つかりますが、動くのは 1 つです。`config.yaml` の `context.engine` で選びます。 |
| **モデルプロバイダー**（`plugins/model-providers/`） | `plugins/model-providers/` にある同梱のプロバイダーはすべて、最初の `get_provider_profile()` の呼び出し時に見つかって登録されます。利用者は `--provider` か `config.yaml` で、そのつど 1 つを選びます。 |
| **pip で導入した `backend` のプラグイン** | `plugins.enabled` で自分で有効にします（一般のプラグインと同じです）。 |
| **利用者が導入した基盤**（`~/.hermes/plugins/platforms/` にあるもの） | `plugins.enabled` で自分で有効にします。第三者のゲートウェイのアダプターには、明示的な同意が要ります。 |

まとめると、**同梱の「常に動く」基盤は自動で読み込まれ、第三者の一般プラグインは自分で有効にするもの**です。`plugins.enabled` の許可リストは、利用者が `~/.hermes/plugins/` へ置いた任意のコードに対する門です。

### 承認の伝え方 {#approval-transports}

承認の伝え方（approval transport）は、Hermes がすでに出しているツール承認の要求を、
**人がどこで見て、どこで答えるか**を変えるものです。あるコマンドに承認が要るかどうかを
決めるものではありませんし、権限の方針を扱う API でもありません。

```python
def present(request):
    # Deliver request.command and request.description to your UI, wait for
    # its authenticated human response, then return a request-bound decision.
    choice = send_to_my_ui_and_wait(request)  # once/session/always/deny
    return request.respond(choice)

def register(ctx):
    ctx.register_approval_transport("my-ui", present)
```

`present` は同期でも非同期でもかまいません。Hermes はこれを上限つきのワーカーで動かし、
プラグインが守らなくても正式な `approvals.timeout` を強制します。要求は変更できず、伏せ字処理を
施した表示用の文言、ホスト側の提示の種類（`cli` か `gateway`）、ホストの待ち時間、選べる選択肢、
そして中身の分からない要求の ID とダイジェストを持ちます。
返すのは
`request.respond(choice)` の結果です。要求に結び付いていない辞書や、古い・変わってしまった
ID とダイジェストは拒否されます。ホストが差し出していない範囲をプラグインが返すこともできません
（たとえば 1 回限りの要求に対する `always` です）。

登録しただけでは何も起きません。プラグインを有効にすることと、その伝え方を明示的に選ぶことは、
別々の同意の手順です。

```yaml
plugins:
  enabled: [my-approval-plugin]

security:
  approval:
    transport: my-ui
    transport_fallback: deny     # default
```

伝え方の側で例外が出た場合、時間切れ、登録が見当たらない場合、選択肢が不正な場合、応答が古い場合は、
既定で拒否になります。選んだ伝え方が失敗したときに、通常の CLI / TUI / ゲートウェイ / ACP の画面へ
あえて問いかけを出したい場合は、`transport_fallback: builtin` を設定してください。この明示的な
同意が無い限り、Hermes が別の画面に問いかけを出すことはありません。

強制的な遮断、sudo の標準入力の保護、利用者の拒否ルール、要求の結び付け、許される範囲、保存、
フック、そして最終的な権限判断は、引き続き Hermes が担います。強制的に遮断されるコマンドは、
どの伝え方のコールバックよりも前に止められます。この面には、**プラグイン側の承認の方針も、
自動許可のコールバックも、必須の `pre_tool_call` の方針も、意図的にありません**。将来、承認の方針を
扱う権限が加わるとすれば、プラグインの権限同意の仕組みを使うことになるでしょうが、伝え方を
選んだからといって、それが与えられるわけではありません。

### 以前からの利用者向けの移行 {#migration-for-existing-users}

自分で有効にする方式のプラグインを備えた版（設定スキーマ v21 以降）へ上げると、`~/.hermes/plugins/` にすでに導入されていて `plugins.disabled` に入っていなかった利用者のプラグインは、**自動で** `plugins.enabled` へ引き継がれます。いまの環境はそのまま動きます。同梱の単体プラグインは引き継がれません。以前からの利用者でも、明示的に有効にする必要があります。（同梱の基盤やバックエンドのプラグインは、そもそも門の対象ではなかったので、引き継ぎも不要でした。）

## 使えるフック {#available-hooks}

プラグインは、いま `hermes_cli.plugins.VALID_HOOKS` が受け付ける 27 個のライフサイクルの出来事を登録できます。正確な発火の時機、戻り値の扱い、送られる値の項目、プライバシー上の注意については、**[イベントフックの一覧](/hermes/docs/user-guide/features/hooks/#shipped-plugin-hook-catalog)**が正本です。

| 説明のための分類 | 出荷されているフック |
|---|---|
| **指示・制御** | `pre_tool_call`、`pre_llm_call`、`pre_verify`、`pre_gateway_dispatch` |
| **変換** | `transform_tool_result`、`transform_terminal_output`、`transform_llm_output`、`pre_transcription` |
| **観測** | `post_tool_call`、`post_llm_call`、`pre_api_request`、`post_api_request`、`api_request_error`、`on_stream_start`、`on_stream_delta`、`on_stream_end`、`on_interim_message`、`on_session_start`、`on_session_end`、`on_session_finalize`、`on_session_reset`、`agent_loop_stopped`、`on_skill_lifecycle`、`subagent_start`、`subagent_stop`、`pre_approval_request`、`post_approval_response`、`pre_command`、`kanban_task_claimed`、`kanban_task_completed`、`kanban_task_blocked` |

この分類は今の挙動を説明するもので、将来の命名の決まりを定めるものではありません。プラグインのミドルウェアは、これとは別の登録の仕組みです。
## プラグインの種類 {#plugin-types}

Hermes のプラグインは 4 種類です。

| 種類 | 何をするか | 選び方 | 置き場所 |
|------|-------------|-----------|----------|
| **一般のプラグイン** | ツール、フック、スラッシュコマンド、CLI コマンドを足します | 複数選択（有効・無効） | `~/.hermes/plugins/` |
| **記憶プロバイダー** | 内蔵の記憶を置き換える、または補います | 単一選択（1 つだけ動きます） | `plugins/memory/` |
| **文脈エンジン** | 内蔵の文脈の圧縮処理を置き換えます | 単一選択（1 つだけ動きます） | `plugins/context_engine/` |
| **モデルプロバイダー** | 推論のバックエンドを宣言します（OpenRouter、Anthropic など） | 複数登録して、`--provider` や `config.yaml` で選びます | `plugins/model-providers/` |

記憶プロバイダーと文脈エンジンは**プロバイダー型のプラグイン**で、それぞれ一度に 1 つしか動きません。モデルプロバイダーもプラグインですが、いくつも同時に読み込まれます。利用者は `--provider` か `config.yaml` で、そのつど 1 つを選びます。一般のプラグインは、どんな組み合わせでも有効にできます。

## 差し込める面 — それぞれどこを見るか {#pluggable-interfaces-where-to-go-for-each}

上の表はプラグインの 4 分類を示していますが、「一般のプラグイン」の中でも `PluginContext` はいくつかの異なる拡張点を出しています。さらに Hermes は、Python のプラグインの仕組みの外にも拡張を受け付けます（設定で動かすバックエンド、シェルのフックを使うコマンド、外部のサーバーなど）。作りたいものに合った文書を、この表から探してください。

| 足したいもの | やり方 | 書き方の案内 |
|---|---|---|
| LLM が呼べる**ツール** | Python のプラグイン — `ctx.register_tool()` | [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) · [ツールを足す](/hermes/docs/developer-guide/adding-tools/) |
| **ライフサイクルのフック**（LLM の前後、セッションの開始と終了、ツールの絞り込み） | Python のプラグイン — `ctx.register_hook()` | [フックの早見表](/hermes/docs/user-guide/features/hooks/) · [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) |
| CLI やゲートウェイ向けの**スラッシュコマンド** | Python のプラグイン — `ctx.register_command()` | [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) · [CLI を拡張する](/hermes/docs/developer-guide/extending-the-cli/) |
| `hermes <thing>` の**サブコマンド** | Python のプラグイン — `ctx.register_cli_command()` | [CLI を拡張する](/hermes/docs/developer-guide/extending-the-cli/) |
| プラグインが同梱する**スキル** | Python のプラグイン — `ctx.register_skill()` | [スキルを作る](/hermes/docs/developer-guide/creating-skills/) |
| **推論のバックエンド**（LLM プロバイダー: OpenAI 互換、Codex、Anthropic-Messages、Bedrock） | プロバイダーのプラグイン — `plugins/model-providers/<name>/` で `register_provider(ProviderProfile(...))` | **[モデルプロバイダーのプラグイン](/hermes/docs/developer-guide/model-provider-plugin/)** · [プロバイダーを足す](/hermes/docs/developer-guide/adding-providers/) |
| **ゲートウェイのチャンネル**（Discord / Telegram / IRC / Teams など） | 基盤のプラグイン — `plugins/platforms/<name>/` で `ctx.register_platform()` | [基盤アダプターを足す](/hermes/docs/developer-guide/adding-platform-adapters/) |
| **記憶のバックエンド**（Honcho、Mem0、Supermemory など） | 記憶のプラグイン — `plugins/memory/<name>/` で `MemoryProvider` を継承 | [記憶プロバイダーのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/) |
| **文脈の圧縮のやり方** | 文脈エンジンのプラグイン — `ctx.register_context_engine()` | [文脈エンジンのプラグイン](/hermes/docs/developer-guide/context-engine-plugin/) |
| **画像生成のバックエンド**（DALL·E、SDXL など） | バックエンドのプラグイン — `ctx.register_image_gen_provider()` | [画像生成プロバイダーのプラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/) |
| **動画生成のバックエンド**（Veo、Kling、Pixverse、Grok-Imagine、Runway など） | バックエンドのプラグイン — `ctx.register_video_gen_provider()` | [動画生成プロバイダーのプラグイン](/hermes/docs/developer-guide/video-gen-provider-plugin/) |
| **音声読み上げのバックエンド**（Piper、VoxCPM、Kokoro、xtts、声の複製スクリプトなど、あらゆる CLI） | 設定で動かす方法（おすすめ） — `config.yaml` の `tts.providers.<name>` に `type: command` で宣言します。あるいは Python のバックエンドプラグイン — シェルのひな型では足りない Python SDK やストリーミングのエンジンには `ctx.register_tts_provider()` を使います。 | [音声読み上げの設定](/hermes/docs/user-guide/features/tts/#custom-command-providers) · [Python のプラグインの案内](/hermes/docs/user-guide/features/tts/#python-plugin-providers) |
| **音声認識のバックエンド**（whisper.cpp、独自の whisper のバイナリ、手元の ASR の CLI など、あらゆる CLI） | 設定で動かす方法（おすすめ） — `config.yaml` の `stt.providers.<name>` に `type: command` で宣言するか、以前からある単一コマンドの逃げ道として `HERMES_LOCAL_STT_COMMAND` を設定します。あるいは Python のバックエンドプラグイン — Python SDK のエンジン（OpenRouter、SenseAudio、Gemini-STT など）には `ctx.register_transcription_provider()` を使います。 | [音声認識の設定](/hermes/docs/user-guide/features/tts/#stt-custom-command-providers) · [Python のプラグインの案内](/hermes/docs/user-guide/features/tts/#python-plugin-providers-stt) |
| **MCP 経由の外部ツール**（ファイルシステム、GitHub、Linear、Notion など、あらゆる MCP サーバー） | 設定で動かす方法 — `config.yaml` の `mcp_servers.<name>` に `command:` か `url:` を宣言します。Hermes がそのサーバーのツールを自動で見つけ、内蔵のツールと並べて登録します。 | [MCP](/hermes/docs/user-guide/features/mcp/) |
| **スキルの追加の入手先**（独自の GitHub リポジトリ、非公開のスキルの索引） | CLI — `hermes skills tap add <repo>` | [スキルハブ](/hermes/docs/user-guide/features/skills/#skills-hub) · [独自の入手先を公開する](/hermes/docs/user-guide/features/skills/#publishing-a-custom-skill-tap) |
| **ゲートウェイのイベントフック**（`gateway:startup`、`session:start`、`agent:end`、`command:*` で発火します） | `HOOK.yaml` と `handler.py` を `~/.hermes/hooks/<name>/` へ置きます | [イベントフック](/hermes/docs/user-guide/features/hooks/#gateway-event-hooks) |
| **シェルのフック**（出来事に応じてシェルのコマンドを実行 — 通知、監査の記録、デスクトップの警告） | 設定で動かす方法 — `config.yaml` の `hooks:` の下に宣言します | [シェルのフック](/hermes/docs/user-guide/features/hooks/#shell-hooks) |

:::note
すべてが Python のプラグインというわけではありません。拡張の面のいくつかは、あえて**設定で動かすシェルのコマンド**（音声読み上げ、音声認識、シェルのフック）を使っています。すでに手元にある CLI が、Python を書かずにそのままプラグインになるためです。ほかに、エージェントがつないでツールを自動登録する**外部のサーバー**（MCP）もありますし、独自のマニフェスト形式を持つ**置くだけのディレクトリ**（ゲートウェイのフック）もあります。用途に合った連携のしかたに応じて、適した面を選んでください。上の表にある書き方の案内は、それぞれ差し込む場所、探索のされ方、実例を扱っています。
:::

## NixOS での宣言的なプラグイン {#nixos-declarative-plugins}

NixOS では、モジュールの設定項目からプラグインを宣言的に導入できます。`hermes plugins install` は要りません。詳しくは **[Nix の設定の案内](/hermes/docs/getting-started/nix-setup/#plugins)**を参照してください。

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

宣言的に入れたプラグインは `nix-managed-` の接頭辞付きでシンボリックリンクされます。手で導入したプラグインと共存でき、Nix の設定から外すと自動で片付けられます。

## プラグインを管理する {#managing-plugins}

```bash
hermes plugins                               # unified interactive UI
hermes plugins list                          # table: enabled / disabled / not enabled
hermes plugins search <term>                 # search the Hermes plugin catalog
hermes plugins install <name>                # install a catalog entry (repo @ reviewed pinned SHA)
hermes plugins install user/repo             # install from Git, then prompt Enable? [y/N]
hermes plugins install user/repo --enable    # install AND enable (no prompt)
hermes plugins install user/repo --no-enable # install but leave disabled (no prompt)
hermes plugins update my-plugin              # pull latest (local edits are autostashed and re-applied)
hermes plugins remove my-plugin              # uninstall
hermes plugins enable my-plugin              # add to allow-list
hermes plugins disable my-plugin             # remove from allow-list + add to disabled
hermes plugins capabilities [my-plugin]      # declared vs granted capabilities
```

### ワンクリック導入のリンク（デスクトップ） {#one-click-install-links-desktop}

Hermes Desktop は `hermes://` の URL 形式を登録するので、Web サイトや README、
やり取りの中のメッセージから、プラグインの導入へ直接つなげられます。

```
hermes://plugin/install?repo=owner/repo            # main install link
hermes://plugin/install?repo=owner/repo&enable=1   # enable the agent plugin after install
hermes://plugin/install?repo=owner/repo&force=1    # replace an existing install
```

クリックすると Hermes が開き、**確認のダイアログ**が出ます。リポジトリの id、
「導入する前に」の注記、GitHub を見るためのリンクとクローンのリンクが並びます。そのあと
リポジトリを浅くクローンして、何が入っているのかを調べます（**エージェントのプラグイン**（バックエンドの
Python）、**デスクトップのプラグイン**（アプリの画面）、あるいはその両方です）。どの部品を入れるかを
チェックボックスで選び、確定します。確定するまで何も導入されません。
ディープリンクが勝手に導入することはありませんし、エージェントのプラグインの導入は
`hermes plugins install` と同じ[導入時のセキュリティ検査](#install-time-security-scanning)を
通ります。

エージェント側とデスクトップ側の両方が 1 つのリポジトリに入っている場合も、リンク 1 つ、ダイアログ 1 つで
済みます。同じダイアログは、リンクを使わずに **Capabilities →
Plugins → Install from Git** からも開けます。以前からの `hermes://plugin-agent/…` と
`hermes://plugin-desktop/…` の URL も、同じダイアログへつながります。開発版
（`npm run dev`）では形式が `hermes-dev://` になります。

Web サイト側に SDK は要りません。ふつうのリンクで動きます。

```html
<a href="hermes://plugin/install?repo=owner/repo&enable=1">Install in Hermes</a>
```

MCP サーバーにも同じ形のリンクがあります。
[Hermes に追加するリンク](/hermes/docs/reference/mcp-config-reference/#add-to-hermes-link)を参照してください。

### プラグインの権限と同意 {#plugin-capabilities-and-consent}

プラグインは、使いたいホスト側の特権的な面を
`plugin.yaml` で宣言できます。

```yaml
name: my-plugin
capabilities:
  - tools.override        # replace built-in tools
  - llm.model_override    # pick the model for host-owned LLM calls
```

プラグインが権限を宣言していると、`hermes plugins install`（および
`hermes plugins enable`）が、1 行のリスク説明を添えた一覧を表示して、一度だけ尋ねます。
同意すると、その付与が同意のハッシュと時刻とともに
`plugins.entries.<id>.granted_capabilities` に記録されます。断った場合、プラグインは
その権限が無効なまま有効になります。行儀のよいプラグインは `ctx.has_capability()` で
確かめ、無ければ穏やかに機能を落とします。

**更新時の再同意:** プラグインの更新が、まだ許可していない権限を宣言している場合、
`hermes plugins update` がその追加分を示して、あらためて尋ねます。新しい権限は同意するまで
無効のままです。プラグインの更新が、黙って権限を広げることはありません。

**対話のないセッションは安全側に倒れます:** 端末（TTY）が無い状態で導入や更新を行うと、
導入自体は終わりますが、宣言された権限は付与され*ません*。あとから付与するには、
対話のある状態で `hermes plugins enable <id>` を実行してください。

いつでも状態を確かめられます。

```bash
hermes plugins capabilities             # all plugins with declared/granted capabilities
hermes plugins capabilities my-plugin   # one plugin, declared vs granted
```

権限の id は、以前からある機能ごとの設定の門と 1 対 1 で対応します。そちらも動き続けますが、
同意の流れを使うことを推めており、**非推奨**です。

| 権限 | 以前のキー（`plugins.entries.<id>.…`） |
|---|---|
| `tools.override` | `allow_tool_override` |
| `llm.provider_override` | `llm.allow_provider_override` |
| `llm.model_override` | `llm.allow_model_override` |
| `llm.agent_id_override` | `llm.allow_agent_id_override` |
| `llm.profile_override` | `llm.allow_profile_override` |
| `llm.task_override` | `llm.allow_task_override` |
| `gateway.platform_actions` | `allow_platform_actions` |

権限が付与されているか、以前のキーが設定されているか、*どちらか*が満たされていれば門は開きます。
いまの設定はそのまま動き続けます。

:::warning サンドボックスではありません
権限は**同意と監査の層**であって、隔離ではありません。プラグインはふつうの Python として
同じプロセス内で動きます。悪意のあるプラグインは、ここにある門をすべて無視できます。
権限を与えることは、プラグインの作者を信頼するという表明です。コードの監査ではありませんし、
Hermes がそのプラグインのコードを見たわけでもありません。信頼できる出どころのプラグインだけを
導入してください。
:::

### 基盤への働きかけ {#platform-actions}

`ctx.platform_actions` は、動いているゲートウェイのアダプターの登録簿を通して、つながっている
やり取りの基盤へ働きかけるための、最小限で権限に守られた動詞の組をプラグインに与えます。
アダプターに直接手を加える代わりに用意された、正式な手段です。**既定では無効です。**
呼び出しのたびに `gateway.platform_actions` の権限（以前のキーは
`plugins.entries.<id>.allow_platform_actions`）を確かめ直し、許可の無い呼び出しは、
何も行わずに構造化されたエラーを返します。

v1 の動詞（どちらも `async` で、どちらもただの辞書を返し、どちらもフックの実行へ例外を
投げることはありません）は次のとおりです。

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
`{"ok": False, "error": <code>, "detail": <str>}` が返り、エラーのコードは安定しています。
`capability_not_granted`、`invalid_argument`、`gateway_unavailable`、
`unknown_platform`、`adapter_not_registered`、`adapter_disconnected`、
`unsupported_platform_action`、`action_failed` です。働きかける前に、対象の
アダプターが存在し、つながっていることを確かめます。切れているアダプターや無いアダプターは、
例外ではなく構造化されたエラーに落ちます。

v1 で対応している基盤は Telegram と Discord です。Telegram の `add_reaction` は、ボットの
リアクションを*設定*します（Bot API は、前のボットのリアクションを積み増すのではなく置き換えます）。
許可されたものも拒否されたものも、すべての働きかけが、プラグインの id、動詞、基盤、結果とともに
記録されます。

:::warning セキュリティ上の注意
基盤への働きかけは、**ボットとしてやり取りする力**です。権限を与えたプラグインは、フックの
きっかけになったやり取りだけでなく、ゲートウェイのボットが届くどのやり取りに対しても、
リアクションを付けたりスレッド名を変えたりできます。`gateway.platform_actions` は信頼できる
プラグインにだけ与え、どの働きかけを行うのかを明記しているプラグインを選んでください。
基盤の SDK の生の値や取っ手へ触れることは、あえてこの面に**含めていません**。#64176 の第 2 巡の
設計修正のとおり、それには「安定性の保証なし」の印を付けた専用の権限（`gateway.raw_events`）と
別の設計が必要で、まだ出荷されていません。
:::

### プラグインを見つける — Hermes のプラグインカタログ {#discovering-plugins-the-hermes-plugin-catalog}

`hermes plugins search <term>` は、**Hermes のプラグインカタログ**を検索します。これは
hermes-agent のリポジトリで保守されている、SHA を固定した厳選カタログです
（`plugin-catalog/`）。一致の判定は、エントリの名前、説明、宣言されたツールに及びます。

```bash
hermes plugins search telegram    # search the catalog
hermes plugins browse             # browse every entry
hermes plugins info <name>        # full details for one entry
```

見つかったら、名前だけを指定して導入します。その名前は、エントリのリポジトリの
**固定されたコミットの SHA** に解決されます。カタログ由来であることも記録されるので、カタログ側が
動いたときに `hermes plugins update` が固定し直せます。

```bash
hermes plugins install <catalog-name>
```

`owner/repo` や Git の URL を明示した指定は、カタログにはまったく触れず、独自の（未審査の）出どころ
として印が付きます。`--ref <40-char commit SHA>` を明示すれば、独自の導入も固定できます。

信頼のしくみ、登録時の CI、応募の流れの全体は[プラグインカタログ](/hermes/docs/user-guide/features/plugin-catalog/)を
参照してください。

:::warning カタログに載っている ≠ 監査済み
カタログにエントリがあるということは、登録時にそのエントリの情報と宣言された権限が
確認されたという意味です。**コードの監査ではありません。** 導入は今までどおり通常の同意の流れを
通ります（プラグインは無効の状態で入り、有効にするのは明示的な手順で、ツールの上書きの権利には
別途の付与が要ります）。有効にする前に、プラグインのソースを読んでください。
:::

### プラグインのまとめ {#plugin-packs}

**プラグインのまとめ（plugin pack）**は、いくつかのプラグインを固定して書き出した、宣言的で
共有できる YAML ファイル（`hermes-pack.yaml`）です。ゲームの modpack を共有するようなものです。
まとめを導入すると、ふつうの固定された導入へ展開されます。実行時に新しいものが増えることはありません。

```yaml
name: voice-assistant-pack
description: STT + streaming TTS + approval relay
author: hyper
version: 1.0.0
plugins:
  - name: hermes-telegram-business       # bare plugin-catalog name…
    ref: e905f3bc5eeaa5a9dab9bc5155601b3ebec75757
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

**供給の安全について。** どのエントリの `ref` も、40 文字ちょうどのコミット SHA でなければ
なりません。タグやブランチ名は、どのエントリのものかを示すエラーとともに拒否されます。
プラグインカタログと同じ決まりです。まとめの導入は `hermes plugins install --ref <sha>` と
まったく同じ固定された経路を通り、同じ出どころの記録を `plugins/.install-metadata.json` に残すので、
同じまとめを 2 回導入すれば同じ結果になります。まとめは
[マニフェスト v2 の項目](/hermes/docs/developer-guide/plugins/)（`manifest_version`、
`api_version`、`requires_plugins`）の上に成り立ちます。各プラグイン自身のマニフェストは、
今までどおり通常の導入の経路で検証されます。

**同意をまとめて与えることはありません。** `pack install` は必ず確認の画面を出し
（すべてのプラグイン、出どころ、固定した ref、そして宣言している権限）、まとめの中身について
**1 回だけ**確認を求めます。そのあとは、各プラグインが宣言した権限が、プラグインごとの標準の
権限同意の問いかけを通ります。`hermes plugins install` を 1 つ実行したときとまったく同じです。
`--yes` はありませんし、対話のないセッションではまとめを導入できません。

**秘密情報がまとめに乗ることはありません。** `config:` に書ける初期値は、秘密でない
`plugins.entries.<id>` のキーだけです。秘密らしい名前のキー
（`*token*`、`*key*`、`*password*` など）、権限の付与、非推奨の
`allow_*` の信頼の門は、導入時に拒否され、書き出し時に取り除かれます。
秘密情報が必要なプラグインは、自分の `requires_env` で宣言します。それは今までどおり
導入時に尋ねられます。`plugins.entries.<id>` にすでにある利用者の値は、常にまとめの
初期値より優先されます。

**一部が失敗したとき。** 各プラグインは独立して導入されます。失敗はプラグインごとに
報告され、残りは進み、1 つでも失敗すればコマンドは 0 以外で終了します。

**書き出しの注意。** `pack export` に含まれるのは、Git 由来がはっきりしているプラグイン
（`hermes plugins install` で導入したもの）だけです。手元にしか無いプラグインは、
書き出される YAML の中に警告のコメントとして並び、導入できるエントリにはなりません。

`skills:` の一覧は導入時に読み取られて表示されますが、まだ自動では導入されません。
当面は手で導入してください（`hermes skills`）。スキルハブの id をまとめの導入につなぐのは、
今後の課題として記録されています。

### 導入時のセキュリティ検査 {#install-time-security-scanning}

`hermes plugins install` と `hermes plugins update` は、プラグインを有効にする前に、その
ツリー全体に対して静的なセキュリティ検査を実行します（Claude Cowork のスキルとプラグインの
セキュリティ検査に着想を得ています）。検査は [スキルハブの守り](/hermes/docs/user-guide/features/skills/)と
同じ脅威パターンの仕組みを使い回します。認証情報の持ち出し、逆向きのシェル、破壊的なコマンド、
居座りの仕掛け、難読化された実行、そして文書ファイルに仕込まれたプロンプトの注入が対象です。
プラグインならではの除外もあります。プロバイダーのプラグインが**自分の** API キーを
環境から読むこと（文書化された `requires_env` の書き方）は、印が付きません。

判定は 3 つで、Cowork の pass / warn / fail に対応します。

| 判定 | どうなるか |
|---|---|
| **safe** | ふつうに導入されます。追加の出力はありません |
| **caution** | 見つかった点が表示され、`Install anyway? [y/N]` で確認します（`--force` を渡しても進めます） |
| **dangerous** | 止まります。`--force` でも**通せません** |

`hermes plugins update` で、更新後のツリーが dangerous と判定された場合、そのプラグインは
無効にされます。見つかった点を確認して、自分で有効にし直してください。
dangerous で止めたときは、その原因になった重大な指摘を名前で示します（例:
`1 critical of 42 findings (destructive_root_rm)`）。そのため、止める理由になった 1 行が合計件数の陰に隠れることはありません。

プラグインの最上位にあるテスト用のツリー（プラグインのルート直下の `tests/`、`test/`、`testing/`、`spec/`、`specs/`、
`fixtures/`）も検査されます。プラグインの `__init__.py` はそこから import できるので、実行時に動くコードだからです。
ただし、そこで見つかった重大な指摘は **caution** 止まりになります。これらのフィクスチャは、プラグインが悪意のある文字列をはじくことを確かめるために、あえてそうした文字列を持っているからです。
そのため導入を頭から止めるのではなく、確認を求め、`--force` で通せます。同じ指摘がほかのファイル（`setup.sh`、`src/spec/…`）にあれば、これまでどおり **dangerous** です。

検査は既定で有効です。`config.yaml` で無効にできます。

```yaml
plugins:
  scan_on_install: false
```

### 対話画面 {#interactive-ui}

引数を付けずに `hermes plugins` を実行すると、まとまった対話画面が開きます。

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

- **General Plugins の欄** — チェックボックスで、SPACE で切り替えます。チェックが入っていれば `plugins.enabled`、外れていれば `plugins.disabled`（明示的に無効）です。
- **Provider Plugins の欄** — いまの選択を表示します。ENTER を押すとラジオボタンの選択へ入り、動かすプロバイダーを 1 つ選べます。
- 同梱のプラグインも同じ一覧に、`[bundled]` の印を付けて並びます。

プロバイダー型のプラグインの選択は `config.yaml` に保存されます。

```yaml
memory:
  provider: "honcho"      # empty string = built-in only

context:
  engine: "compressor"    # default built-in compressor
```

### 有効・無効・どちらでもない {#enabled-vs-disabled-vs-neither}

プラグインは、次の 3 つの状態のどれかにあります。

| 状態 | 意味 | `plugins.enabled` にある？ | `plugins.disabled` にある？ |
|---|---|---|---|
| `enabled` | 次のセッションで読み込まれます | はい | いいえ |
| `disabled` | 明示的に無効。`enabled` にもあっても読み込まれません | （関係ありません） | はい |
| `not enabled` | 見つかってはいるが、まだ選ばれていません | いいえ | いいえ |

導入したばかりのプラグインや同梱のプラグインの既定は `not enabled` です。`hermes plugins list` はこの 3 つを区別して表示するので、明示的に止めたものと、有効にされるのを待っているだけのものを見分けられます。

動いているセッションの中では、`/plugins` がいま読み込まれているプラグインを表示します。

## メッセージを差し込む {#injecting-messages}

プラグインは `ctx.inject_message()` を使って、CLI の会話や、既に分かっているゲートウェイのセッションへメッセージを差し込めます。

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

CLI モードでは次のようになります。

- エージェントが**待機中**（利用者の入力待ち）なら、そのメッセージは次の入力として並び、新しいターンが始まります。
- エージェントが**ターンの最中**（実際に動いている）なら、そのメッセージは今の処理に割り込みます。利用者が新しいメッセージを打って Enter を押したのと同じです。
- `"user"` 以外の役割では、内容の先頭に `[role]` が付きます（例: `[system] ...`）。
- 無事に並べられた場合は `True` を返します。

ゲートウェイのモードでは次のようになります。

- `session_key` は必須で、既にあるゲートウェイのセッションを指す必要があります。これは振り分けのための安定したキーで、CLI のセッション ID ではありません。
- Hermes は、そのセッションに保存された基盤、やり取りの場、スレッド、プロファイル、会話の履歴を使い回します。プラグインがこの API から新しいやり取りの経路を渡すことはできません。
- Hermes は送る前に、保存された経路をゲートウェイの現在の権限の決まりに照らし直します。
- アダプターの時点や上流での権限の判断だけに頼っていた経路は、いまの中核の許可リスト、対の設定、あるいは明示的な全許可の設定から Hermes が検証し直せない限り、拒否されます。
- 差し込まれる文は、常に会話としての入力です。スラッシュコマンドを呼ぶことも、ツールを承認することも、保留中の確認や確認質問に答えることもできません。
- 送信が済むまで、経路と会話は固定されます。話題の復元で経路が変わったり、処理が始まる前にセッションが入れ替わったりした場合、Hermes はその要求を捨てます。
- 要求は基盤のアダプターの通常のメッセージの経路へ入ります。動いているセッションでは、競合するターンを始めるのではなく、既存の「取り込み中」の待ち行列を使います。
- 動いているゲートウェイが、非同期の送信としてその要求を受け付けたときに `True` を返します。エージェントのターンや基盤への配送が終わったことを示すものではありません。
- `session_key` が無い場合、権限が与えられていない場合、あるいは要求を受け付けられる動いているゲートウェイが無い場合は `False` を返します。非同期に受け付けたあとで、知らないセッションキーや届けられないセッションキーだと分かった場合は、ゲートウェイの記録に書かれます。

これによって、遠隔からの表示、メッセージの橋渡し、Webhook の受け口といったプラグインが、外部の情報源から会話へメッセージを流し込めるようになります。

ゲートウェイへの差し込みは、エージェントの応答を外部のやり取りの基盤へ送りうるものです。どのプラグインでも既定では無効です。`config.yaml` でプラグインごとに与えてください。

```yaml
plugins:
  entries:
    my-plugin:
      allow_gateway_injection: true
```

:::warning
ゲートウェイへの差し込みは、信頼できるプラグインにだけ与えてください。Hermes はこのホスト API の権限を確かめ、既にあるセッションの経路に限定しますが、Python のプラグインは同じプロセス内で動きますし、この設定はサンドボックスではありません。
:::

:::note
このプラグインの API は、外部のプロセス向けに公開の HTTP のエンドポイントも CLI のコマンドも出しません。プラグインの側が、たとえば自分の信頼できる設定や、以前から保持しているセッションの状態から、対象のゲートウェイの `session_key` をあらかじめ知っている必要があります。
:::

## プラグインから MCP サーバーを呼ぶ {#calling-mcp-servers-from-plugins}

`ctx.call_mcp()` を使うと、プラグインは利用者が設定した MCP サーバーのツールを、どのフックやツールの処理からでも同期的に呼べます。呼び出しは Hermes が元から持つ MCP のクライアントを通ります（モデルが呼ぶ MCP のツールと同じ接続、同じ信頼段階の門、同じ遮断器、同じ再接続の処理です。別立てのクライアントではありません）。

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

返るのは決まった形の包みです。`{"ok": True, "result": ...}`（サーバーが返す場合は `structuredContent` も付きます）か、`{"ok": False, "error": "..."}` です。約 64 KB を超える結果は切り詰められ、`"truncated": True` の印が付きます。

### セキュリティ: 既定では無効、サーバーごとの許可リスト {#security-default-off-per-server-allowlist}

プラグインには**既定で MCP へのアクセスがありません**。運用する人が、`config.yaml` でサーバーごとに明示的に許可する必要があります。

```yaml
plugins:
  entries:
    my-plugin:
      mcp_allowlist: ["knowledge_rag", "github"]
```

- 一覧に無いサーバーを呼ぶと、設定すべきキーを名指しした `PermissionError` が出ます。
- 許可はサーバーごと、プラグインごとです。設定されたすべてのサーバーに及ぶ包括的な権限にはなりませんし、`"*"` のワイルドカードも効きません。
- どの呼び出しにも待ち時間の上限が強制されます（既定は 30 秒）。そのため、固まった MCP サーバーが、呼び出し元のフックやツールの処理を止めてしまうことはありません。
- MCP サーバーが返す内容は信頼できません。`result` は命令ではなくデータとして扱い、検証せずに特権的な判断（承認やコマンドの実行）へ渡さないでください。

:::warning
`mcp_allowlist` を与えるということは、その MCP サーバーに対して、モデルと同じアクセスをプラグインに与えるということです。サーバーが出している書き込み可能なツールも含みます（サーバーの `trust` の段階による門は効きます）。プラグインが本当に必要とするサーバーだけを許可してください。
:::

処理の契約、スキーマの形式、フックの挙動、エラーの扱い、よくある間違いについては、**[詳しい案内](/hermes/docs/developer-guide/plugins/)**を参照してください。
