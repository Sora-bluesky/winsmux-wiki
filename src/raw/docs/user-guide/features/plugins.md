---
title: "プラグイン"
description: "プラグインの仕組みで、独自のツール・フック・連携を Hermes に足す"
upstream_path: user-guide/features/plugins.md
upstream_blob: 902b6f35b95bffd855c09ad1695676fc58ed8f8f
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins
---

# プラグイン {#plugins}

Hermes には、本体のコードに手を入れずに独自のツール・フック・連携を足すためのプラグインの仕組みがあります。

自分用、チーム用、あるいは1つのプロジェクト用に独自のツールを作りたいなら、
たいていはこちらが正しい道です。開発者向けガイドの
[ツールを足す](/hermes/docs/developer-guide/adding-tools/)のページは、`tools/` と `toolsets.py` に置かれる
Hermes 本体の組み込みツール向けです。

**→ [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/)** — 動く例をひととおり載せた手順つきのガイドです。

## ざっと見る {#quick-overview}

`plugin.yaml` と Python のコードを入れたディレクトリを `~/.hermes/plugins/` に置くだけです。

```
~/.hermes/plugins/my-plugin/
├── plugin.yaml      # manifest
├── __init__.py      # register() — wires schemas to handlers
├── schemas.py       # tool schemas (what the LLM sees)
└── tools.py         # tool handlers (what runs when called)
```

Hermes を起動すると、自分のツールが組み込みのツールと並んで現れます。モデルはすぐに呼び出せます。

### 動く最小の例 {#minimal-working-example}

`hello_world` というツールを足し、フックでツールの呼び出しをすべて記録する、完成したプラグインです。

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

この2つのファイルを `~/.hermes/plugins/hello-world/` に置いて Hermes を再起動すれば、モデルはすぐに `hello_world` を呼べます。フックのほうは、ツールが呼ばれるたびにログを1行出します。

モデルに見せるツールの説明は `schema["description"]` に書きます。任意で渡せる `ctx.register_tool(description=...)` の値は、それとは別の `ToolEntry` の登録情報です。省略するとスキーマの説明が既定値になりますが、Hermes がその値を、`description` の無いスキーマへ書き戻すことはありません。文言はスキーマ側に1回だけ書くのがおすすめです。両方に値を置くなら、内容を合わせておいてください。モデルが見るのはスキーマ側の値です。

`./.hermes/plugins/` 以下にあるプロジェクト固有のプラグインは、既定で無効です。信頼できるリポジトリでだけ、Hermes を起動する前に `HERMES_ENABLE_PROJECT_PLUGINS=true` を設定して有効にしてください。

## プラグインにできること {#what-plugins-can-do}

下の `ctx.*` の API は、どれもプラグインの `register(ctx)` 関数の中で使えます。

| できること | 方法 |
|-----------|-----|
| ツールを足す | `ctx.register_tool(name=..., toolset=..., schema=..., handler=...)` |
| フックを足す | `ctx.register_hook("post_tool_call", callback)` |
| スラッシュコマンドを足す | `ctx.register_command(name, handler, description)` — CLI とゲートウェイのセッションに `/name` を足します |
| コマンドからツールを呼ぶ | `ctx.dispatch_tool(name, args)` — 親エージェントの文脈を自動でつないだ状態で、登録済みのツールを呼びます |
| CLI のコマンドを足す | `ctx.register_cli_command(name, help, setup_fn, handler_fn)` — `hermes <plugin> <subcommand>` を足します |
| メッセージを差し込む | `ctx.inject_message(content, role="user", session_key=...)` - [メッセージを差し込む](#injecting-messages)を参照 |
| データファイルを同梱する | `Path(__file__).parent / "data" / "file.yaml"` |
| スキルを同梱する | `ctx.register_skill(name, path)` — `plugin:skill` という名前空間になり、`skill_view("plugin:skill")` で読み込みます |
| 環境変数を条件にする | plugin.yaml の `requires_env: [API_KEY]` — `hermes plugins install` の途中で入力を求められます |
| pip で配布する | `[project.entry-points."hermes_agent.plugins"]` |
| ゲートウェイのプラットフォームを登録する（Discord、Telegram、IRC など） | `ctx.register_platform(name, label, adapter_factory, check_fn, ...)` — [プラットフォームのアダプターを足す](/hermes/docs/developer-guide/adding-platform-adapters/)を参照 |
| 画像生成のバックエンドを登録する | `ctx.register_image_gen_provider(provider)` — [画像生成プロバイダーのプラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/)を参照 |
| 動画生成のバックエンドを登録する | `ctx.register_video_gen_provider(provider)` — [動画生成プロバイダーのプラグイン](/hermes/docs/developer-guide/video-gen-provider-plugin/)を参照 |
| 文脈を圧縮するエンジンを登録する | `ctx.register_context_engine(engine)` — [コンテキストエンジンのプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)を参照 |
| ターミナルの実行環境（クラウドのサンドボックス）を登録する | `ctx.register_terminal_environment_provider(provider)` — [ターミナル環境のプラグイン](/hermes/docs/developer-guide/terminal-environment-plugin/)を参照 |
| 人の承認を求める画面の出し先を決める | `ctx.register_approval_transport(name, present_fn)` — [承認の伝え方](#approval-transports)を参照 |
| メモリのバックエンドを登録する | `plugins/memory/<name>/__init__.py` で `MemoryProvider` を継承 — [メモリプロバイダーのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/)を参照（別の探索の仕組みを使います） |
| ホストが持つ LLM 呼び出しを走らせる | `ctx.llm.complete(...)` / `ctx.llm.complete_structured(...)` — 利用者が使っているモデルと認証をそのまま借りて1回だけ生成し、必要なら JSON スキーマで検証します。[プラグインからの LLM 利用](/hermes/docs/developer-guide/plugin-llm-access/)を参照 |
| MCP のツールを呼ぶ（権限つき） | `ctx.call_mcp(server, tool, arguments, timeout=30)` — [プラグインから MCP サーバーを呼ぶ](#calling-mcp-servers-from-plugins)を参照 |
| 推論のバックエンド（LLM プロバイダー）を登録する | `plugins/model-providers/<name>/__init__.py` で `register_provider(ProviderProfile(...))` — [モデルプロバイダーのプラグイン](/hermes/docs/developer-guide/model-provider-plugin/)を参照（別の探索の仕組みを使います） |

## プラグインの見つけ方 {#plugin-discovery}

| 入手元 | パス | 使いどころ |
|--------|------|----------|
| 同梱 | `<repo>/plugins/` | Hermes に同梱 — [組み込みプラグイン](/hermes/docs/user-guide/features/built-in-plugins/)を参照 |
| 利用者 | `~/.hermes/plugins/` | 自分用のプラグイン |
| プロジェクト | `.hermes/plugins/` | プロジェクト固有のプラグイン（`HERMES_ENABLE_PROJECT_PLUGINS=true` が必要） |
| pip | `hermes_agent.plugins` の entry_points | 配布されるパッケージ |
| Nix | `services.hermes-agent.extraPlugins` / `extraPythonPackages` | NixOS の宣言的なインストール — [Nix の設定](/hermes/docs/getting-started/nix-setup/#plugins)を参照 |

名前がぶつかったときは、あとの入手元が前のものを上書きします。つまり、同梱のプラグインと同じ名前の自分用プラグインを置くと、そちらが使われます。

### プラグインの下位区分 {#plugin-sub-categories}

それぞれの入手元の中で、Hermes は下位区分のディレクトリも認識し、そこに置かれたプラグインを専用の探索の仕組みへ振り分けます。

| 下位ディレクトリ | 置くもの | 探索の仕組み |
|---|---|---|
| `plugins/`（直下） | 一般のプラグイン — ツール、フック、スラッシュコマンド、CLI のコマンド、同梱のスキル | `PluginManager`（種別: `standalone` か `backend`） |
| `plugins/platforms/<name>/` | ゲートウェイのチャンネルのアダプター（`ctx.register_platform()`） | `PluginManager`（種別: `platform`、1階層深い） |
| `plugins/image_gen/<name>/` | 画像生成のバックエンド（`ctx.register_image_gen_provider()`） | `PluginManager`（種別: `backend`、1階層深い） |
| `plugins/memory/<name>/` | メモリのプロバイダー（`MemoryProvider` を継承） | `plugins/memory/__init__.py` にある**専用の読み込み**（種別: `exclusive` — 同時に有効なのは1つ） |
| `plugins/context_engine/<name>/` | 文脈を圧縮するエンジン（`ctx.register_context_engine()`） | `plugins/context_engine/__init__.py` にある**専用の読み込み**（同時に有効なのは1つ） |
| `plugins/model-providers/<name>/` | LLM プロバイダーの定義（`register_provider(ProviderProfile(...))`） | `providers/__init__.py` にある**専用の読み込み**（最初の `get_provider_profile()` の呼び出しで初めて走査されます） |

`~/.hermes/plugins/model-providers/<name>/` に置いた利用者側のプラグインは、同じ名前の同梱のモデルプロバイダーを上書きします（`register_provider()` では最後に書いたものが勝ちます）。そのためリポジトリを編集せずに組み込みのプロバイダー定義を差し替えられます。メモリのプロバイダーは逆向きです。`~/.hermes/plugins/memory/<name>/` については、名前がぶつかると**同梱側**が勝ちます（同梱、利用者、プロジェクト、entry points の順で、最初に見つかったものが勝ちます）。ですから利用者側のメモリプロバイダーには固有の名前が要ります。

## プラグインは明示的に有効にするもの（いくつか例外あり） {#plugins-are-opt-in-with-a-few-exceptions}

**一般のプラグインと、利用者が入れたバックエンドは既定で無効です。** 探索では見つかるので `hermes plugins` や `/plugins` には出てきますが、`~/.hermes/config.yaml` の `plugins.enabled` に名前を足すまで、フックやツールを持つものは何も読み込まれません。これで、第三者のコードが自分の同意なしに動くことはなくなります。

:::note `plugins.enabled` が効くのはプラグインだけです
`~/.hermes/hooks/<name>/` 以下の[ゲートウェイのイベントフック](/hermes/docs/user-guide/features/hooks/#gateway-event-hooks)はプラグインではなく、`plugins.enabled` や `plugins.disabled` の対象では**ありません**。あのディレクトリは、置いたこと自体が信頼の表明です。正しい `HOOK.yaml` と `handler.py` を持つサブディレクトリは、起動時にゲートウェイが読み込みます。ファイルをそこに置くことが、有効にする操作そのものです。[ゲートウェイのフックの信頼の考え方](/hermes/docs/user-guide/features/hooks/#gateway-hook-trust)を参照してください。
:::

```yaml
plugins:
  enabled:
    - my-tool-plugin
    - disk-cleanup
  disabled:       # optional deny-list — always wins if a name appears in both
    - noisy-plugin
  # Optional: deadline (seconds) for each Git clone, fetch or checkout
  # during plugin installation, including automatic memory-provider migration.
  # Default 300; values above 3600 are clamped. A subdirectory install
  # (owner/repo/path/to/plugin) downloads only that folder's files.
  clone_timeout_seconds: 300
  # Optional: wall-clock cap (seconds) for timeout-bounded in-process Python
  # plugin hook callbacks (hot-path observers + pre_tool_call). Default 30;
  # set 0 to disable; values above 600 are clamped. Timed-out pre_tool_call
  # callbacks fail closed (block the tool). Caller-thread hooks such as
  # subagent_stop are never moved onto a timeout worker.
  # Shell hooks keep their own per-entry timeout under the top-level hooks: key.
  hook_callback_timeout: 30
  # Optional: deadline (seconds) for one plugin's import + register() at load.
  # A plugin that overruns it is skipped with the reason "load timed out after
  # Ns" (reported like any other load failure: the startup warning and the
  # in-session `/plugins` listing) and the remaining plugins keep loading; the
  # stuck thread is abandoned. Default 10; set 0 to disable; values above 600
  # are clamped.
  load_timeout_seconds: 10
```

状態を切り替える方法は3つあります。

```bash
hermes plugins                    # interactive toggle (space to check/uncheck)
hermes plugins enable <name>      # add to allow-list
hermes plugins disable <name>     # remove from allow-list + add to disabled
```

`hermes plugins install owner/repo` のあとに `Enable 'name' now? [y/N]` と聞かれます。既定は「いいえ」です。スクリプトから入れるときは `--enable` か `--no-enable` でこの確認を飛ばせます。

同じ結果を再現できるようにするには、変わらないコミットをそのまま固定してください（タグ、ブランチ、
短縮した SHA は受け付けられません）。

```bash
hermes plugins install owner/repo --ref 0123456789abcdef0123456789abcdef01234567
```

Hermes はそのコミットを detached でチェックアウトし、`HEAD` が指定された SHA と
完全に一致することを確かめ、正式な入手元・入れたリビジョン・固定の状態を現在の
プロファイルに記録します。`hermes plugins update` は固定されたプラグインを動かすことを拒みます。
新しいコミットにするときは
`hermes plugins install <source> --force --ref <new-commit>` で明示してください。
プロファイルに置かれるインストールの情報には、設定値・環境の値・秘密の情報・
権限の付与はいっさい含まれません。

エージェントのプラグインの同じ固定は Hermes Desktop でも使えます。**Capabilities →
Plugins → Install from Git** に *Pin to commit* の欄があり、40文字の SHA をそのまま入れられます。
**Installed** では、固定して入れたエージェントのプラグインに `pinned @ <sha8>` のバッジが付きます。
単独のデスクトップのプラグインが固定されて入ることまでは保証しません。`hermes plugins list` は Source の列に
固定を表示します（`git pinned@<sha8>`）。固定は、下で説明する保存された資格情報を通して、
非公開のリポジトリでも使えます。

### 非公開のリポジトリから入れる {#installing-from-a-private-repository}

`hermes plugins install` は対話せずにクローンします（利用者名やパスワードを尋ねることは
ありません）。ですから非公開のリポジトリには、Hermes が自力で見つけられる資格情報が要ります。
クローン、`--ref` を付けた取得、`hermes plugins update` の pull は、どれもまず匿名で試されます。
公開リポジトリが資格情報を目にすることはないので、古くなったトークンや失効したトークンが
公開リポジトリのインストールを壊すことはありません。相手側が匿名のアクセスを断ったときにだけ、
Hermes は資格情報を探します。`https://` の入手元では、次の順に試します。

1. `.env` の `GITHUB_TOKEN` か `GH_TOKEN`（GitHub のホストのみ）。
2. `gh` CLI のログイン（`gh auth login`）。こちらも GitHub のホストのみ。
3. そのホスト向けの git の資格情報ヘルパー（`git credential fill`）。資格情報がすでに
   保存されていれば、GitLab、Bitbucket、自前で立てたサーバーでも使えます。

資格情報は、そのインストールや更新のときだけの HTTP ヘッダーとして送られます。
プラグインの `.git/config` やインストールの情報に書き込まれることはありません。
SSH の入手元（`git@host:owner/repo.git`）は、従来どおり ssh-agent を通して認証します。
同じ探し方は、`hermes plugins update`、git からのカタログ経由の MCP のインストール、
git の URL から取得するプロファイルの配布にも当てはまります。

`hermes doctor` は、設定された `GITHUB_TOKEN`/`GH_TOKEN` を `api.github.com` へ送って確かめ
（**API Connectivity** の項目です）、GitHub に断られたときは、その変数名と、期限切れのトークンを
持っている `.env` ファイルを名指しします。取り除くか差し替えるかの判断ができます。

### 許可リストが対象にしないもの {#what-the-allow-list-does-not-gate}

いくつかの種類のプラグインは `plugins.enabled` を通りません。Hermes に組み込まれた土台の一部で、既定で止めてしまうと基本的な機能が動かなくなるからです。

| プラグインの種類 | 代わりに有効になる方法 |
|---|---|
| **同梱のプラットフォームのプラグイン**（`plugins/platforms/` 以下の IRC、Teams など） | 同梱のゲートウェイのチャンネルをすべて使えるよう、自動で読み込まれます。実際のチャンネルは `config.yaml` の `gateway.platforms.<name>.enabled` で有効にします。 |
| **同梱のバックエンド**（`plugins/image_gen/` 以下の画像生成プロバイダーなど） | 既定のバックエンドがそのまま動くよう、自動で読み込まれます。選択は `config.yaml` の `<category>.provider` で行います（例: `image_gen.provider: openai`）。 |
| **メモリのプロバイダー**（`plugins/memory/`） | すべて見つけられますが、有効になるのはちょうど1つで、`config.yaml` の `memory.provider` で選びます。 |
| **コンテキストエンジン**（`plugins/context_engine/`） | すべて見つけられますが、有効になるのは1つで、`config.yaml` の `context.engine` で選びます。 |
| **モデルのプロバイダー**（`plugins/model-providers/`） | `plugins/model-providers/` 以下の同梱のプロバイダーは、最初の `get_provider_profile()` の呼び出しで見つかって登録されます。利用者は `--provider` か `config.yaml` で、そのつど1つ選びます。 |
| **pip で入れた `backend` のプラグイン** | `plugins.enabled` で明示的に有効にします（一般のプラグインと同じ）。 |
| **利用者が入れたプラットフォーム**（`~/.hermes/plugins/platforms/` 以下） | `plugins.enabled` で明示的に有効にします。第三者のゲートウェイのアダプターには、はっきりした同意が要ります。 |

まとめると、**「そのまま動く」同梱の土台は自動で読み込まれ、第三者の一般のプラグインは自分で有効にする**、ということです。`plugins.enabled` の許可リストは、利用者が `~/.hermes/plugins/` に置いた任意のコードのための関門です。

### 承認の伝え方 {#approval-transports}

承認の伝え方（approval transport）は、Hermes が出すツールの承認要求を、**人がどこで見て、どこで答えるか**を
変えるものです。あるコマンドに承認が要るかどうかを決めるものではありませんし、
権限の方針を書くための API でもありません。

```python
def present(request):
    # Deliver request.command and request.description to your UI, wait for
    # its authenticated human response, then return a request-bound decision.
    choice = send_to_my_ui_and_wait(request)  # once/session/always/deny
    return request.respond(choice)

def register(ctx):
    ctx.register_approval_transport("my-ui", present)
```

`present` は同期でも非同期でもかまいません。Hermes はこれを上限つきのワーカーで実行し、
プラグインがやらなくても正式な `approvals.timeout` を守ります。
要求は変更できず、伏せ字処理済みの表示用の文言、ホスト側の提示の種類（`cli` か `gateway`）、
ホストのタイムアウト、選べる選択肢、そして中身の分からない要求の ID とダイジェストを持ちます。
戻り値は
`request.respond(choice)` の結果にしてください。要求に結び付いていない辞書や、古くなった・変わった
要求の ID やダイジェストは拒まれます。ホストが提示していない範囲をプラグインが返すことはできません
（たとえば1回かぎりの要求に対する `always`）。

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

伝え方の側で例外が出たとき、タイムアウトしたとき、登録が見つからないとき、選択肢が不正なとき、
応答が古いときは、既定で拒否になります。選んだ伝え方が失敗したときに、あえて通常の
CLI / TUI / ゲートウェイ / ACP の画面に承認を出したいなら、
`transport_fallback: builtin` にしてください。この明示的な設定が無いかぎり、Hermes が
承認を別の画面に出すことはありません。

強制的な遮断、sudo の標準入力の保護、利用者の拒否ルール、要求の結び付け、許される範囲、
保存、フック、最終的な許可の判断は、引き続き Hermes が持ちます。
強制的に遮断されるコマンドは、伝え方のコールバックが呼ばれる前に止められます。この仕組みには
**プラグイン側の承認方針も、自動許可のコールバックも、必須の `pre_tool_call` の方針も**、意図的に
置かれていません。将来、承認方針を扱えるようにする場合はプラグインの権限同意の考え方を使うかも
しれませんが、伝え方を選んだことがそれを与えるわけではありません。

### 以前から使っている人向けの移行 {#migration-for-existing-users}

プラグインを明示的に有効にする方式の Hermes（設定スキーマ v21 以降）へ上げると、`~/.hermes/plugins/` にすでに入っていて `plugins.disabled` に入っていなかった利用者のプラグインは、**自動的に** `plugins.enabled` へ引き継がれます。いまの設定はそのまま動きます。同梱の単体プラグインは引き継がれません。以前から使っている人でも、明示的に有効にする必要があります。（同梱のプラットフォームやバックエンドのプラグインは、そもそも関門の対象ではなかったので、引き継ぎも要りません。）

## 使えるフック {#available-hooks}

プラグインは、いま `hermes_cli.plugins.VALID_HOOKS` が受け付ける27個の生涯イベントを登録できます。正確なタイミング、戻り値の扱い、渡される項目、プライバシー上の注意については、**[イベントフックの一覧](/hermes/docs/user-guide/features/hooks/#shipped-plugin-hook-catalog)**が正本です。

| 説明のための分類 | 同梱のフック |
|---|---|
| **指示・制御** | `pre_tool_call`, `pre_llm_call`, `pre_verify`, `pre_gateway_dispatch` |
| **変換** | `transform_tool_result`, `transform_terminal_output`, `transform_llm_output`, `pre_transcription` |
| **観測** | `post_tool_call`, `post_llm_call`, `pre_api_request`, `post_api_request`, `api_request_error`, `pre_auxiliary_call`, `post_auxiliary_call`, `on_stream_start`, `on_stream_delta`, `on_stream_end`, `on_interim_message`, `on_session_start`, `on_session_end`, `on_session_finalize`, `on_session_reset`, `agent_loop_stopped`, `on_skill_lifecycle`, `subagent_start`, `subagent_stop`, `pre_approval_request`, `post_approval_response`, `pre_command`, `kanban_task_claimed`, `kanban_task_completed`, `kanban_task_blocked` |

この分類はいまの動きを説明するもので、これからの命名の規則を定めるものではありません。プラグインのミドルウェアは、引き続き別の登録先・別の面として扱われます。
## プラグインの種類 {#plugin-types}

Hermes のプラグインは4種類です。

| 種類 | 何をするか | 選び方 | 置き場所 |
|------|-------------|-----------|----------|
| **一般のプラグイン** | ツール、フック、スラッシュコマンド、CLI のコマンドを足す | 複数選択（有効・無効） | `~/.hermes/plugins/` |
| **メモリのプロバイダー** | 組み込みのメモリを置き換える、または補う | 単一選択（有効なのは1つ） | `plugins/memory/` |
| **コンテキストエンジン** | 組み込みの文脈の圧縮を置き換える | 単一選択（有効なのは1つ） | `plugins/context_engine/` |
| **モデルのプロバイダー** | 推論のバックエンドを定義する（OpenRouter、Anthropic など） | 複数登録し、`--provider` / `config.yaml` で選ぶ | `plugins/model-providers/` |

メモリのプロバイダーとコンテキストエンジンは**プロバイダー型のプラグイン**で、それぞれ同時に有効にできるのは1つだけです。モデルのプロバイダーもプラグインですが、多数が同時に読み込まれ、利用者が `--provider` か `config.yaml` でそのつど1つ選びます。一般のプラグインは、どんな組み合わせでも有効にできます。

## 差し替えられる仕組み — それぞれの行き先 {#pluggable-interfaces-where-to-go-for-each}

上の表はプラグインの4分類を示していますが、「一般のプラグイン」の中でも `PluginContext` はいくつも別々の拡張の口を出していますし、Hermes は Python のプラグインの仕組みの外にある拡張（設定で動くバックエンド、シェルのフックで動くコマンド、外部のサーバーなど）も受け入れます。作りたいものに合ったドキュメントは、この表から探してください。

| 足したいもの | 方法 | 書き方のガイド |
|---|---|---|
| LLM が呼べる**ツール** | Python のプラグイン — `ctx.register_tool()` | [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) · [ツールを足す](/hermes/docs/developer-guide/adding-tools/) |
| **生涯イベントのフック**（LLM の前後、セッションの開始・終了、ツールの絞り込み） | Python のプラグイン — `ctx.register_hook()` | [フックの一覧](/hermes/docs/user-guide/features/hooks/) · [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) |
| CLI / ゲートウェイ向けの**スラッシュコマンド** | Python のプラグイン — `ctx.register_command()` | [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) · [CLI を広げる](/hermes/docs/developer-guide/extending-the-cli/) |
| `hermes <thing>` の**サブコマンド** | Python のプラグイン — `ctx.register_cli_command()` | [CLI を広げる](/hermes/docs/developer-guide/extending-the-cli/) |
| プラグインが同梱する**スキル** | Python のプラグイン — `ctx.register_skill()` | [スキルを作る](/hermes/docs/developer-guide/creating-skills/) |
| **推論のバックエンド**（LLM のプロバイダー: OpenAI 互換、Codex、Anthropic-Messages、Bedrock） | プロバイダーのプラグイン — `plugins/model-providers/<name>/` で `register_provider(ProviderProfile(...))` | **[モデルプロバイダーのプラグイン](/hermes/docs/developer-guide/model-provider-plugin/)** · [プロバイダーを足す](/hermes/docs/developer-guide/adding-providers/) |
| **ゲートウェイのチャンネル**（Discord / Telegram / IRC / Teams など） | プラットフォームのプラグイン — `plugins/platforms/<name>/` で `ctx.register_platform()` | [プラットフォームのアダプターを足す](/hermes/docs/developer-guide/adding-platform-adapters/) |
| **メモリのバックエンド**（Honcho、Mem0、Supermemory など） | メモリのプラグイン — `plugins/memory/<name>/` で `MemoryProvider` を継承 | [メモリプロバイダーのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/) |
| **文脈の圧縮のやり方** | コンテキストエンジンのプラグイン — `ctx.register_context_engine()` | [コンテキストエンジンのプラグイン](/hermes/docs/developer-guide/context-engine-plugin/) |
| **画像生成のバックエンド**（DALL·E、SDXL など） | バックエンドのプラグイン — `ctx.register_image_gen_provider()` | [画像生成プロバイダーのプラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/) |
| **動画生成のバックエンド**（Veo、Kling、Pixverse、Grok-Imagine、Runway など） | バックエンドのプラグイン — `ctx.register_video_gen_provider()` | [動画生成プロバイダーのプラグイン](/hermes/docs/developer-guide/video-gen-provider-plugin/) |
| **音声合成のバックエンド**（Piper、VoxCPM、Kokoro、xtts、声の複製のスクリプトなど、どんな CLI でも） | 設定で書く方法（おすすめ） — `config.yaml` の `tts.providers.<name>` に `type: command` で宣言します。または Python のバックエンドのプラグイン — シェルのひな形では足りない Python SDK やストリーミングのエンジンには `ctx.register_tts_provider()` を使います。 | [音声合成の設定](/hermes/docs/user-guide/features/tts/#custom-command-providers) · [Python のプラグインのガイド](/hermes/docs/user-guide/features/tts/#python-plugin-providers) |
| **音声認識のバックエンド**（whisper.cpp、独自の whisper のバイナリ、手元の音声認識の CLI など） | 設定で書く方法（おすすめ） — `config.yaml` の `stt.providers.<name>` に `type: command` で宣言するか、従来からある単一コマンドの抜け道として `HERMES_LOCAL_STT_COMMAND` を設定します。または Python のバックエンドのプラグイン — Python SDK のエンジン（OpenRouter、SenseAudio、Gemini-STT など）には `ctx.register_transcription_provider()` を使います。 | [音声認識の設定](/hermes/docs/user-guide/features/tts/#stt-custom-command-providers) · [Python のプラグインのガイド](/hermes/docs/user-guide/features/tts/#python-plugin-providers-stt) |
| **MCP 経由の外部のツール**（ファイルシステム、GitHub、Linear、Notion など、どの MCP サーバーでも） | 設定で書く方法 — `config.yaml` に `command:` か `url:` を添えて `mcp_servers.<name>` を宣言します。Hermes がそのサーバーのツールを自動で見つけ、組み込みのツールと並べて登録します。 | [MCP](/hermes/docs/user-guide/features/mcp/) |
| **スキルの入手元を足す**（独自の GitHub リポジトリ、非公開のスキルの索引） | CLI — `hermes skills tap add <repo>` | [スキルのハブ](/hermes/docs/user-guide/features/skills/#skills-hub) · [独自の tap を公開する](/hermes/docs/user-guide/features/skills/#publishing-a-custom-skill-tap) |
| **ゲートウェイのイベントフック**（`gateway:startup`、`session:start`、`agent:end`、`command:*` で発火） | `HOOK.yaml` と `handler.py` を `~/.hermes/hooks/<name>/` に置く | [イベントフック](/hermes/docs/user-guide/features/hooks/#gateway-event-hooks) |
| **シェルのフック**（イベントでシェルのコマンドを走らせる — 通知、監査のログ、デスクトップの警告） | 設定で書く方法 — `config.yaml` の `hooks:` の下に宣言します | [シェルのフック](/hermes/docs/user-guide/features/hooks/#shell-hooks) |

:::note
すべてが Python のプラグインというわけではありません。拡張の口のいくつかは、意図的に**設定で書くシェルのコマンド**（音声合成、音声認識、シェルのフック）になっていて、手元にすでにある CLI が、Python を書かずにそのままプラグインになります。別のいくつかは、エージェントが接続してツールを自動登録する**外部のサーバー**（MCP）です。そして**置くだけのディレクトリ**（ゲートウェイのフック）は、独自のマニフェストの形式を持ちます。自分の使い方に合った作り方の面を選んでください。上の表の各ガイドには、置き換え文字列、見つけ方、例がそれぞれ載っています。
:::

## NixOS で宣言的に入れる {#nixos-declarative-plugins}

NixOS では、モジュールの選択肢からプラグインを宣言的に入れられます。`hermes plugins install` は要りません。詳しくは **[Nix の設定ガイド](/hermes/docs/getting-started/nix-setup/#plugins)** を参照してください。

```nix
services.hermes-agent = {
  # Directory plugin (source tree with plugin.yaml)
  extraPlugins = [ (pkgs.fetchFromGitHub { ... }) ];
  # Entry-point plugin (pip package)
  extraPythonPackages = [ (config.services.hermes-agent.package.python.pkgs.buildPythonPackage { ... }) ];
  # Enable in config
  settings.plugins.enabled = [ "my-plugin" ];
};
```

宣言的に入れたプラグインは `nix-managed-` を付けたシンボリックリンクになります。手で入れたプラグインと共存でき、Nix の設定から外すと自動で片付けられます。

## プラグインを管理する {#managing-plugins}

```bash
hermes plugins                               # unified interactive UI
hermes plugins list                          # table: enabled / disabled / not enabled (bundled backends,
                                             # platforms and the live memory.provider count as enabled)
hermes plugins search <term>                 # search the Hermes plugin catalog
hermes plugins install <name>                # install a catalog entry (repo @ reviewed pinned SHA)
hermes plugins install user/repo             # install from Git, then prompt Enable? [y/N]
hermes plugins install user/repo --enable    # request enable; dependency consent still applies
hermes plugins install user/repo --no-enable # install but leave disabled (no prompt)
hermes plugins update my-plugin              # pull latest (local edits are autostashed and re-applied)
hermes plugins remove my-plugin              # uninstall; also drops it from plugins.enabled/disabled/entries
                                             # and resets memory.provider when it was the live provider
hermes plugins enable my-plugin              # add to allow-list
hermes plugins disable my-plugin             # remove from allow-list + add to disabled (bundled platforms:
                                             # either spelling works, e.g. photon-platform or platforms/photon)
hermes plugins capabilities [my-plugin]      # declared vs granted capabilities
hermes plugins check-updates                 # read-only: is any installed plugin outdated?
hermes plugins adopt my-plugin               # track a self-cloned plugin dir (read its git origin)
hermes plugins trust-update-url my-plugin    # confirm a changed update_url after review
```

### 更新の確認と入手元の記録 {#update-checks-and-provenance}

Hermes は、Git から入れたときの入手元とリビジョンを `.install-metadata.json` に記録します。
固定せずに追跡しているインストールは、保存された入手元のリモートの HEAD か、一致する保存済みの
`update_url` のフィードと比べられます。固定したインストールは固定されたままです。自分でクローンしたディレクトリは、
`hermes plugins adopt NAME` を実行してはじめて追跡されるインストールになります。
手でコピーしたディレクトリや、入手元の記録とずれたディレクトリには、診断のための案内が出ます。
pip のエントリーポイントのプラグインは、それを持つ配布パッケージで入手できるバージョンを報告できます。
ただし、その確認によって Git で管理されるインストールに変わるわけではありません。

`hermes plugins check-updates` はプラグインのファイルに手を加えません。ゲートウェイの定期的な確認は、
`plugins.auto_update_check_hours` の時期が来たときに走ります。既定は 24 時間で、
`0` にすると止まります。その結果は `hermes pm status` と
デスクトップの同期状況の画面で見られます。別の間隔を設定すれば、1 日 1 回という固い上限があるわけではありません。

既定では、更新するには `hermes plugins update NAME` を実行する必要があります。
`plugins.auto_apply: true` を設定すると、追跡している Git のプラグインは人の手を介さずに更新されるようになります。
どちらの経路でも、更新時のセキュリティスキャンが走ります。自動適用は、固定したもの・
手で入れたもの・記録とずれたもの・pip の配布パッケージの行は扱いません。

マニフェストで `update_url` が変わったり新しく加わったりすると、Hermes はその新しいアドレスを、
`hermes plugins trust-update-url NAME` で承認するまで受け付けません。これはフィードの入手元を確かめるもので、
すでに信頼しているプラグインのコードを閉じ込めるサンドボックスではありません。

### 依存関係の準備と保持 {#dependency-preparation-and-preservation}

Python の依存関係のインストールには、同意と受け入れの手順が別にあります。
`plugins install --enable` でもこの手順は飛ばせません。依存関係のインストールを断った場合や、
対話できない状況で入れた場合は、プラグインは入っても無効のままになることがあります。
Node のサイドカーの依存関係には別の確認があり、プラグインの中に閉じて置かれます。

PM は、新しい環境と設定を反映する前に、中核と有効なプラグインの組み合わせで Python の依存関係を準備します。
解決に失敗したときは、前の選択がそのまま残ります。
新しく選んだ環境が、動いているプロセスでまだ有効になっていないときは、Hermes を再起動してください。

有効なプラグインの組み合わせは、既定のホーム**と、`profiles/` の下のすべてのプロファイル**を合わせたもので、
それぞれの `config.yaml`（`plugins.enabled`、`plugins.disabled`、
`memory.provider`）から読み取ります。PM は、読めないホームについて推測はしません。
`config.yaml` が正しい YAML でない、マッピングでない、あるいはリストでない
`plugins.enabled`/`plugins.disabled` や文字列でない `memory.provider` を持つ場合は、
**すべて**のホームで依存関係の準備が失敗します（`could not parse plugin selection:
<path>`）。そのプロファイルのプラグインを、黙って次の環境から落とすことはしません。
問題のファイルを直すか取り除いてください。空の `config.yaml` はかまいません。

Hermes アプリのふつうの更新では、ユーザーのプラグインのディレクトリは、ラッパーのファイルや
外部のサイドカーへのリンクも含めてそのまま残ります。プラグインをはっきり更新したり削除したりすると、
それらのファイルが変わることがあります。[パッケージ管理](/hermes/docs/reference/package-management/)
と[プラグイン作成のガイド](/hermes/docs/developer-guide/plugins/#lazy-install-optional-python-dependencies)も見てください。

### デスクトップの Installed と Browse {#installed-and-browse-in-desktop}

**Capabilities → Plugins** を開きます。**Installed** は、アプリのデスクトップのプラグインの
登録簿と、選んでいるプロファイルのエージェントのプラグインの実際の状態を読み、必要に応じて両方を
1 つの行にまとめます。入っているとみなしたカタログの項目の一覧ではありません。**Browse** はアプリ本来の
カタログ画面で、Web サイトを埋め込んだものではありません。Skills と同じ **Installed / Browse** のタブを使い、
上に検索欄、1 つの行にタブの切り替えと操作が並びます。

デスクトップと公開の[プラグインカタログ](https://hermes-agent.nousresearch.com/plugins)は、同じ CDN の
スナップショット [`/docs/api/plugins.json`](https://hermes-agent.nousresearch.com/docs/api/plugins.json) を使います。
公開の別名は、デスクトップが取得する URL
`https://nousresearch.github.io/hermes-agent/docs/api/plugins.json` と同じデータを返します。これは docs の
ビルドが `plugin-catalog/*.yaml` とキャッシュしたスターの数から作ります。
同じ公開で、インストーラーが使う削除済みの項目の一覧も届きます。
一覧を見るだけでは、GitHub にその場で問い合わせたり、入手元のリポジトリを取得したりはしません。
インストーラーがコードを取ってくるのは、別に行うインストールの流れの中だけです。

### ワンクリックのインストールのリンク（デスクトップ） {#one-click-install-links-desktop}

Hermes Desktop は `hermes://` の URL スキームを登録します。ですから Web サイト、README、
チャットのメッセージから、プラグインのインストールへ直接リンクできます。

```
hermes://plugin/install?catalog=NAME               # catalog entry, installs the reviewed pin
hermes://plugin/install?repo=owner/repo            # any git repo
hermes://plugin/install?repo=owner/repo&enable=1   # enable the agent plugin after install
hermes://plugin/install?repo=owner/repo&force=1    # replace an existing install
```

`catalog=<name>` の形は、[プラグインカタログ](/hermes/docs/user-guide/features/plugin-catalog/)の各カードにある
**Open in Hermes Desktop** ボタンが使うものです。デスクトップはその名前を公開中のカタログ
（**Capabilities → Plugins → Browse** が表示するのと同じ情報源）で解決し、アプリの中で選んだときと
同じ**審査済みのカタログの項目**のダイアログを開きます。エージェント側はカタログで固定された
コミットで入り、ブランチの先端が使われることはありません。このリンクはリポジトリの URL を
持たず、カタログに無い名前はエラーの通知が出るだけで何も起きません。git のパスとして
読み替えられることは決してないので、見慣れた名前の裏に未審査のリポジトリを忍ばせる、
ということができません。

カタログのリンクと、Skills Hub の `hermes://skill/install?identifier=...` の経路には、更新したデスクトップのビルドを使ってください。
アプリが入っていないか古すぎる場合は、カードにあるコピーできる `hermes plugins install <catalog-name>` のコマンドを使えば、
カタログによる名前の解決がそのまま効きます。

`repo=` のリンクをクリックすると Hermes が開き、**確認のダイアログ**が出ます。リポジトリの識別子、
「入れる前に」の注意、GitHub を見るリンクとクローンのリンクが並び、そのあとリポジトリを浅く
クローンして、何が入っているか（**エージェントのプラグイン** — バックエンドの Python、
**デスクトップのプラグイン** — アプリの画面、あるいはその両方）を判別します。チェックボックスで
入れるものを選んで確定します。確定するまで何も入りません。ディープリンクが勝手に入れることは
ありませんし、エージェントのプラグインのインストールは `hermes plugins install` と同じ
[インストール時のセキュリティ走査](#install-time-security-scanning)を通ります。

エージェント側とデスクトップ側の両方を1つのリポジトリに持つものも、リンク1つ、ダイアログ1つで
済みます。同じ画面は、リンクを使わずに **Capabilities →
Plugins → Install from Git** からも開けます。古い形式の `hermes://plugin-agent/…` と
`hermes://plugin-desktop/…` の URL も、同じダイアログへ流れます。開発用のビルド
（`npm run dev`）では、スキームは `hermes-dev://` です。

Web サイト側に SDK は要りません。ふつうのアンカーで動きます。

```html
<a href="hermes://plugin/install?repo=owner/repo&enable=1">Install in Hermes</a>
```

MCP のサーバーにも同じ形のリンクがあります。
[Hermes に追加するリンク](/hermes/docs/reference/mcp-config-reference/#add-to-hermes-link)を参照してください。

### プラグインの権限と同意 {#plugin-capabilities-and-consent}

プラグインは、使いたいホスト側の特権的な面を `plugin.yaml` に宣言できます。

```yaml
name: my-plugin
capabilities:
  - tools.override        # replace built-in tools
  - llm.model_override    # pick the model for host-owned LLM calls
```

プラグインが権限を宣言していると、`hermes plugins install`（と
`hermes plugins enable`）が、それぞれの危険性を1行で添えた一覧を表示し、1回だけ確認します。
同意すると、その付与が同意のハッシュと時刻とともに
`plugins.entries.<id>.granted_capabilities` に記録されます。断った場合も、プラグインは
有効なまま、その権限だけがオフになります。行儀のよいプラグインは
`ctx.has_capability()` で確かめ、無くても動くように振る舞いを落とします。

**更新時の再同意:** プラグインの更新で、まだ許していない権限が宣言された場合、
`hermes plugins update` はその差分を示して改めて確認します。新しい権限は同意するまでオフの
ままです。プラグインの更新が黙って手を広げることはありません。カタログの固定の更新は、
もう一歩踏み込みます。新しい固定で、入っている版には無かったツール・フック・Python の依存・
ホスト側の権限・デスクトップの画面が増えている場合、CLI は差分を示し、何かが動く前に `y/N` を
尋ねますし、デスクトップやダッシュボードの **Update** ボタンも同じ確認を開きます。断った場合
（または対話できないセッションの場合）、プラグインは古い固定のままになります。

**対話できないセッションは安全側に倒れます:** 端末が無い状態でのインストールや更新は、
インストール自体は終わりますが、宣言された権限は付与され*ません*。あとから
`hermes plugins enable <id>` を対話的に実行して与えてください。

状態はいつでも確認できます。

```bash
hermes plugins capabilities             # all plugins with declared/granted capabilities
hermes plugins capabilities my-plugin   # one plugin, declared vs granted
```

権限の id は、機能ごとの古い設定の関門と1対1で対応します。古いほうもまだ動きますが、
同意の流れを使うほうを推奨し、**非推奨**になっています。

| 権限 | 古いキー（`plugins.entries.<id>.…`） |
|---|---|
| `tools.override` | `allow_tool_override` |
| `llm.provider_override` | `llm.allow_provider_override` |
| `llm.model_override` | `llm.allow_model_override` |
| `llm.agent_id_override` | `llm.allow_agent_id_override` |
| `llm.profile_override` | `llm.allow_profile_override` |
| `llm.task_override` | `llm.allow_task_override` |
| `gateway.platform_actions` | `allow_platform_actions` |

権限が与えられているか、*あるいは*古いキーが設定されていれば、その関門は開きます。
いまの設定はそのままで動き続けます。

:::warning サンドボックスではありません
権限は**同意と監査のための層**であって、隔離ではありません。プラグインはふつうの
Python として同じプロセスの中で動きます。悪意のあるプラグインは、ここにある関門を
すべて無視できます。権限を与えることは、そのプラグインの作者を信頼するという表明であって、
コードの監査ではありませんし、Hermes がそのプラグインのコードを見たわけでもありません。
信頼できる入手元のプラグインだけを入れてください。
:::

### プラットフォームへの操作 {#platform-actions}

`ctx.platform_actions` は、つながっているチャットのプラットフォームに対して、動いている
ゲートウェイのアダプターの登録先を通して働きかけるための、権限つきの最小限の動詞をプラグインに
与えます。アダプターに勝手なパッチを当てる代わりの、認められたやり方です。**既定ではオフ**で、
呼ばれるたびに `gateway.platform_actions` の権限（古いキーは
`plugins.entries.<id>.allow_platform_actions`）を確かめ直します。権限が無い呼び出しは、何もせずに
構造化されたエラーを返します。

v1 の動詞は次の2つです（どちらも `async`、どちらもただの dict を返し、どちらもフックの
配送へ例外を投げることはありません）。

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

成功は `{"ok": True, "action": <verb>}` です。失敗は
`{"ok": False, "error": <code>, "detail": <str>}` で、エラーコードは安定しています。
`capability_not_granted`、`invalid_argument`、`gateway_unavailable`、
`unknown_platform`、`adapter_not_registered`、`adapter_disconnected`、
`unsupported_platform_action`、`action_failed` です。操作の前には、対象のアダプターが
存在してつながっていることを確かめます。切れている、あるいは見つからないアダプターは、
例外ではなく構造化されたエラーになります。

v1 で対応しているプラットフォームは Telegram と Discord です。Telegram の `add_reaction` は
ボットのリアクションを*置き換え*ます（Bot API は前のリアクションに積み増さず差し替えます）。
許された操作も拒まれた操作も、プラグインの id、動詞、プラットフォーム、結果とともにログに残ります。

:::warning セキュリティ上の注意
プラットフォームへの操作は、**ボットとして発言できる力**です。権限を与えられたプラグインは、
フックのきっかけになったチャットだけでなく、ゲートウェイのボットが届くどのチャットでも、
リアクションを付けたりスレッド名を変えたりできます。`gateway.platform_actions` は信頼できる
プラグインにだけ与え、どの操作を行うかをきちんと書いているプラグインを選んでください。
プラットフォームの SDK の生のデータやハンドルへのアクセスは、意図的にこの面に**含めて
いません**。#64176 の2巡目の設計の修正どおり、それには「安定性は保証しない」と明示した
専用の権限（`gateway.raw_events`）と別の設計が要り、まだ出ていません。
:::

### プラグインを見つける — Hermes のプラグインカタログ {#discovering-plugins-the-hermes-plugin-catalog}

`hermes plugins search <term>` は、**Hermes のプラグインカタログ** — hermes-agent リポジトリで
保守されている、SHA で固定された審査済みのカタログ（`plugin-catalog/`）を検索します。
照合の対象は、項目の名前、説明、宣言されたツールです。

```bash
hermes plugins search telegram    # search the catalog
hermes plugins browse             # browse every entry
hermes plugins info <name>        # full details for one entry
```

目当てのプラグインが見つかったら、名前だけで入れられます。名前は、その項目のリポジトリの
**固定されたコミットの SHA** に解決され、カタログ由来であることが記録されるので、カタログが
動いたときに `hermes plugins update` が固定を付け替えられます。

```bash
hermes plugins install <catalog-name>
```

`owner/repo` や Git の URL をそのまま指定した場合はカタログを一切通らず、独自の（審査されていない）
入手元として印が付きます。`--ref <40-char commit SHA>` を明示すれば、独自のインストールも
固定できます。

信頼の考え方の全体、受け入れの CI、応募の流れについては、[プラグインカタログ](/hermes/docs/user-guide/features/plugin-catalog/)を
参照してください。

:::warning カタログに載っていることと、監査されていることは別です
カタログの項目があるということは、受け入れの時点でその項目の情報と宣言された権限が
確認された、ということです。**コードの監査ではありません**。インストールは変わらず
通常の同意の流れを通ります（プラグインは無効な状態で入り、有効にするのは別の手順で、
ツールを置き換える権利にはさらに別の同意が要ります）。有効にする前に、プラグインの
ソースを確認してください。
:::

### プラグインのまとめ {#plugin-packs}

**プラグインのまとめ（plugin pack）** は、いくつものプラグインを固定して並べた、共有できる
宣言的な YAML ファイル（`hermes-pack.yaml`）です。modpack を配るのに似ています。まとめを入れると、
ふつうの固定つきのインストールが順に走るだけで、実行時に新しいものが増えるわけではありません。

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

**供給経路の守り方。** どの項目の `ref` も、40文字ちょうどのコミットの SHA でなければ
なりません。タグやブランチの名前は、どの項目かを名指しするエラーで拒まれます。プラグインの
カタログと同じ規則です。まとめのインストールは `hermes plugins install --ref <sha>` と
まったく同じ固定つきの経路を通り、`plugins/.install-metadata.json` に同じ出どころを記録するので、
同じまとめを2回入れれば同じ結果になります。まとめは
[マニフェスト v2 の項目](/hermes/docs/developer-guide/plugins/)（`manifest_version`、
`api_version`、`requires_plugins`）の上に作られていて、各プラグイン自身のマニフェストは
通常のインストールの経路でこれまでどおり検証されます。

**同意がまとめて与えられることはありません。** `pack install` は必ず確認の画面を出し
（すべてのプラグイン、入手元、固定された ref、そして宣言されている権限）、そのあと
まとめの内容について確認を**1回**求めます。その先は、各プラグインが宣言した権限が、
プラグインごとの標準の権限同意の確認を通ります。`hermes plugins install` を1つずつ
実行したときと同じです。`--yes` はありませんし、対話できないセッションではまとめを
入れられません。

**秘密の情報はまとめに乗りません。** `config:` の初期値は、秘密でない
`plugins.entries.<id>` のキーに限られます。秘密らしい名前のキー
（`*token*`、`*key*`、`*password*` など）、権限の付与、非推奨の
`allow_*` の信頼の関門は、インストール時に拒まれ、書き出し時には取り除かれます。
秘密の情報が必要なプラグインは、自分の `requires_env` に宣言します。こちらは
これまでどおりインストールの途中で入力を求められます。`plugins.entries.<id>` に
すでにある利用者の値は、まとめの初期値より必ず優先されます。

**一部が失敗したとき。** プラグインはそれぞれ独立して入ります。失敗はプラグインごとに
報告され、残りは続行し、1つでも失敗すればコマンドはゼロ以外で終わります。

**書き出しの注意。** `pack export` に入るのは、Git 由来がはっきりしているプラグイン
（`hermes plugins install` で入れたもの）だけです。手元にしかないプラグインは、
出力される YAML の中に警告のコメントとして並び、入れられる項目としては書かれません。

`skills:` の並びは、インストール時に読み取って表示されますが、まだ自動では入りません。
いまのところ手で入れてください（`hermes skills`）。スキルのハブの id をまとめのインストールへ
つなぐのは、継ぎ目として記録済みの今後の課題です。

### インストール時のセキュリティ走査 {#install-time-security-scanning}

`hermes plugins install` と `hermes plugins update` は、プラグインが有効になる前に、その
ツリー全体を静的に走査します（Claude Cowork のスキルとプラグインのセキュリティ走査に着想を
得たものです）。走査には[スキルのハブの防護](/hermes/docs/user-guide/features/skills/)と同じ
脅威パターンのエンジンを使います。資格情報の保管場所の持ち出し、逆向きのシェル、
破壊的なコマンド、居座りの仕掛け、難読化された実行、そしてドキュメントのファイルに
仕込まれたプロンプトの注入です。プラグインを踏まえた除外もあります。プロバイダーの
プラグインが**自分の** API キーを環境から読むこと（`requires_env` として説明されている
やり方）は、指摘されません。

判定は3つで、Cowork の pass/warn/fail に対応します。

| 判定 | 動き |
|---|---|
| **safe** | ふつうに入ります。追加の表示はありません |
| **caution** | 指摘が表示され、`Install anyway? [y/N]` に答えます（または `--force` を付けます） |
| **dangerous** | 止まります。`--force` でも**通りません** |

`hermes plugins update` で、更新後のツリーが dangerous と判定された場合は、指摘を確認して
有効にし直すまで、そのプラグインは無効になります。dangerous で止めるときは、その原因に
なった重大な指摘を名指しします（たとえば
`1 critical of 42 findings (destructive_root_rm)`）。1行の決定的な指摘が、
総数の陰に隠れないようにするためです。

インストール時にホスト上で実行され得ない文字列は、プラグインの振る舞いではなく**文脈**として
採点されます。そのため指摘の重さを下げることはあっても、消すことはありません。
どの指摘も、ファイルと行を添えて報告に残ります。

- **ドキュメントの文章**（`README.md`、`AGENTS.md`、`docs/**/*.md`、`.txt`、
  `.rst`、`.html`）は、それだけで **dangerous** になることはありません。そこに引用された
  コマンドや資格情報のパス（アンインストールの手順、`~/.ssh` を名指しした拒否の一覧）は
  1段下がりますし、README がそのプラグイン**自身の**インストール先を消すこと
  （`rm -rf "$HOME/.hermes/plugins/<name>"`）は注記どまりです。エージェントに向いた形は
  重さが下がりません。プロンプトの注入、Markdown による持ち出し、エージェントの設定の書き換え、
  `curl … | sh` の1行、`authorized_keys` への追記、漏れたプロバイダーのキーがそうですし、
  同梱の `skills/` ツリーの下にあるものや `after-install.md` の中身も同じです。
  エージェントはそれを指示として読むからです。
- **テストのツリーと固定データ**（プラグインの直下の `tests/`、`test/`、`testing/`、`spec/`、
  `specs/`、`fixtures/`。どの深さでも `__tests__/` と `__fixtures__/`。
  `*.test.*`、`*.spec.*`、`test_*.py`、`*_test.*`）も走査の対象です。プラグインの
  `__init__.py` がそこから読み込むこともあるからです。ただし、引用されているだけの
  危ない文字列（`verdict_for("rm -rf /")`、偽の `sk-…` キーを含む伏せ字処理の検証データ）は
  注記どまりで、読み込み時に実行されてしまうテストのコード
  （`os.system('rm -rf /')`）は **caution** が上限です。同じ指摘でも、他のファイル
  （`setup.sh`、`src/spec/…`）にあれば **dangerous** のままです。
- **行まるごとのコメントと `CHANGELOG.md`** は、守りについて説明しているものなので、
  文章と同じ採点になります。
- **メディアの見出しに復号される Base64**（データ URI や JSON の飾りの中の
  PNG/JPEG/GIF/WOFF/PDF など）は参考情報です。`base64 -d` を文字列のフィルター
  （`grep`、`jq`）へ渡すのは注記どまりで、シェルやインタプリタへ渡すなら重さはそのままです。
  `sudo` や `env|` が正規表現リテラルの選択肢の1つとして現れる場合
  （`/approval|sudo|secret/` のような伏せ字処理のパターン）は注記どまりですが、
  コマンドの文字列の中（`subprocess.run("sudo …")`）ならそうはなりません。

同じように、実行時に使われる `.py` ファイルの `if __name__ == "__main__":` の自己テストの
ブロックにある、ありがちな見本のトークン（`hardcoded_secret`）は **caution** が上限です。
読み込み側はプラグインを import するだけで、そのブロックを実行しないからです。一方、
同じブロックの中の他の指摘（破壊的なコマンド、`sk-…` のようなプロバイダーらしいキー）や、
その分岐より上にある同じトークンは、重さがそのまま残ります。

走査は既定で有効です。`config.yaml` で止められます。

```yaml
plugins:
  scan_on_install: false
```

### 対話の画面 {#interactive-ui}

引数なしで `hermes plugins` を実行すると、まとまった対話の画面が開きます。

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

- **一般のプラグインの欄** — チェックボックスで、スペースキーで切り替えます。いま有効なプラグインの行は、チェックが入った状態で開きます。`plugins.enabled` に載っているもの、同梱のプラットフォーム・バックエンド・モデルプロバイダー（一覧に載せなくてもオン）、あるいはカテゴリで選ばれているプロバイダーがそれにあたります。終了時に書き込まれるのは、切り替えた行だけです。チェックを外すとプラグインが `plugins.disabled` に加わり（はっきりオフ）、チェックを入れると `plugins.enabled` に加わって、古い無効化の指定が消えます。選択画面を開いて閉じただけなら、何も変わりません。
- **プロバイダー型のプラグインの欄** — いまの選択を表示します。ENTER を押すとラジオボタンの選択画面に入り、有効にするプロバイダーを1つ選びます。
- 同梱のプラグインも同じ一覧に並び、`[bundled]` の印が付きます。

プロバイダー型のプラグインの選択は `config.yaml` に保存されます。

```yaml
memory:
  provider: "honcho"      # empty string = built-in only

context:
  engine: "compressor"    # default built-in compressor
```

### 有効・無効・どちらでもない {#enabled-vs-disabled-vs-neither}

プラグインは3つの状態のどれかにあります。

| 状態 | 意味 | `plugins.enabled` にある？ | `plugins.disabled` にある？ |
|---|---|---|---|
| `enabled` | 次のセッションで読み込まれる | はい | いいえ |
| `disabled` | はっきりオフ — `enabled` にも書いてあっても読み込まれない | （関係なし） | はい |
| `not enabled` | 見つかってはいるが、有効にされていない | いいえ | いいえ |

入れたばかりのプラグインや同梱のプラグインの既定は `not enabled` です。`hermes plugins list` はこの3つを区別して表示するので、はっきりオフにしたものと、有効にされるのを待っているだけのものを見分けられます。

動いているセッションでは、`/plugins` がいま読み込まれているプラグインを表示します。

## メッセージを差し込む {#injecting-messages}

プラグインは `ctx.inject_message()` を使って、CLI の会話や、分かっているゲートウェイのセッションへメッセージを差し込めます。

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

**書き方:** `ctx.inject_message(content: str, role: str = "user", *, session_key: str | None = None) -> bool`

CLI のとき:

- エージェントが**待ち状態**（入力待ち）なら、そのメッセージは次の入力として並び、新しいターンを始めます。
- エージェントが**ターンの途中**（動いている最中）なら、そのメッセージは進行中の処理に割り込みます。利用者が新しいメッセージを打って Enter を押したときと同じです。
- `"user"` 以外の役割では、内容の頭に `[role]` が付きます（例: `[system] ...`）。
- 並べられたら `True` を返します。

ゲートウェイのとき:

- `session_key` が必須で、既存のゲートウェイのセッションを指していなければなりません。これは CLI のセッション ID ではなく、経路を決める安定したキーです。
- Hermes は、そのセッションに保存されたプラットフォーム、チャット、スレッド、プロファイル、会話の履歴をそのまま使います。この API を通して新しいチャットの経路を渡すことはできません。
- 配送の前に、Hermes は保存された経路を、ゲートウェイのいまの権限の規則に照らして確かめ直します。
- アダプターの時点や上流の判断だけに頼っていた経路は、いまの本体の許可リスト、対の設定、明示的な全許可の設定から再確認できないかぎり拒まれます。
- 差し込まれた文章は、必ず会話としての入力です。スラッシュコマンドを呼んだり、ツールを承認したり、保留中の確認や聞き返しに答えたりはできません。
- 配送が終わるまで、経路と会話は固定されます。処理が始まる前に、話題の復元で経路が変わったり、セッションが入れ替わったりした場合、Hermes はその要求を捨てます。
- 要求は、プラットフォームのアダプターの通常のメッセージの経路に入ります。動いているセッションでは、競合するターンを始めるのではなく、既存の「取り込み中」の待ち行列を使います。
- 動いているゲートウェイが、非同期の配送のためにその要求を受け取ったとき `True` を返します。これは、エージェントのターンやプラットフォームへの配送が終わったことを示すものではありません。
- `session_key` が無いとき、権限が与えられていないとき、要求を受け取れる動いているホストが無いときは `False` を返します。非同期に受け取ったあとで、セッションのキーが不明だったり経路が作れなかったりすることが分かった場合は、ゲートウェイのログに書かれます。

Ink TUI（`hermes --tui`）と、デスクトップ / ダッシュボードのチャットは、3 つ目のホストです。これらは従来の CLI への参照を設定せず、メッセージのゲートウェイの差し込み口にも登録しません。この 2 つのホストを分けておくことで、動いているゲートウェイが TUI を上書きしたり、その逆が起きたりしないようにしています。渡すのは、一時的な UI のセッション ID ではなく、そのセッションの長く保たれる `session_key`（`ses_…` の id）です。Hermes は、そのセッションのプロンプトの待ち行列に文章を積みます。取り込み中のセッションは次のターンのためにメッセージを取っておき、手が空いているセッションはすぐにターンを始めます。動いている TUI のセッションではないキーは、メッセージのゲートウェイが動いていればそちらに任され、別のチャットへ回されることはありません。

これにより、遠隔の表示、メッセージの橋渡し、Webhook の受け口といったプラグインが、外部から会話へメッセージを流し込めるようになります。

ゲートウェイへの差し込みは、エージェントの応答を外部のメッセージのプラットフォームへ送ることができます。どのプラグインについても既定では無効です。`config.yaml` でプラグインごとに与えてください。

```yaml
plugins:
  entries:
    my-plugin:
      allow_gateway_injection: true
```

:::warning
ゲートウェイへの差し込みは、信頼できるプラグインにだけ与えてください。Hermes はこのホスト API の権限を確かめ、既存のセッションの経路に限定しますが、Python のプラグインは同じプロセスの中で動きますし、この設定はサンドボックスではありません。
:::

:::note
このプラグインの API は、外部のプロセス向けの公開 HTTP のエンドポイントや CLI のコマンドを出しているわけではありません。プラグインは、たとえば自分の信頼できる設定や、以前から保持しているセッションの状態から、対象のゲートウェイの `session_key` をあらかじめ知っている必要があります。
:::

## プラグインから MCP サーバーを呼ぶ {#calling-mcp-servers-from-plugins}

`ctx.call_mcp()` を使うと、プラグインが、利用者の設定した MCP サーバーのツールを同期的に、どのフックやツールのハンドラーからでも呼べます。呼び出しは Hermes が元から持っている MCP のクライアントを通ります（モデルが呼ぶ MCP のツールと同じ接続、同じ信頼の段階の関門、同じ遮断器、同じ再接続の仕組みで、別のクライアントが並び立つことはありません）。

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

**書き方:** `ctx.call_mcp(server: str, tool: str, arguments: dict | None = None, timeout: float = 30) -> dict`

戻り値の形は決まっています。`{"ok": True, "result": ...}`（サーバーが返す場合は `structuredContent` も付きます）か、`{"ok": False, "error": "..."}` です。おおよそ 64 KB を超える結果は切り詰められ、`"truncated": True` の印が付きます。

### セキュリティ: 既定はオフ、サーバーごとの許可リスト {#security-default-off-per-server-allowlist}

プラグインには**既定で MCP へのアクセスがありません**。運用する人が `config.yaml` でサーバーごとに明示的に与えます。

```yaml
plugins:
  entries:
    my-plugin:
      mcp_allowlist: ["knowledge_rag", "github"]
```

- 一覧に無いサーバーを呼ぶと、設定すべきキーを名指しした `PermissionError` が出ます。
- 付与はサーバーごと・プラグインごとです。設定されたすべてのサーバーに対する包括的な権限にはなりませんし、`"*"` のワイルドカードも効きません。
- どの呼び出しにもタイムアウト（既定は30秒）が強制されるので、応答の止まった MCP のサーバーが、呼び出し元のフックやツールの流れを止めてしまうことはありません。
- MCP のサーバーが返すのは、信頼できない内容です。`result` は指示ではなくデータとして扱ってください。検証せずに、特権的な判断（承認、コマンドの実行）へ流し込まないでください。

:::warning
`mcp_allowlist` を与えると、そのプラグインはその MCP サーバーに対してモデルと同じアクセスを持ちます。サーバーが出している書き込みのできるツールも含みます（サーバーの `trust` の段階の関門には従います）。そのプラグインに本当に必要なサーバーだけを与えてください。
:::

ハンドラーの約束ごと、スキーマの形式、フックの動き、エラーの扱い、よくある間違いについては、**[詳しいガイド](/hermes/docs/developer-guide/plugins/)**を参照してください。
