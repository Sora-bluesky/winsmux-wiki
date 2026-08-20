---
title: "Hermes のプラグインを作る"
description: "ツール・フック・同梱データファイル・スキルを備えた、ひととおり動く Hermes プラグインを段階を追って作る手引き"
upstream_path: developer-guide/plugins/index.md
upstream_blob: 8688d181a3c2b23f489ca4fe0d6672fa828a4f63
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/plugins
---

# Hermes のプラグインを作る {#build-a-hermes-plugin}

この手引きでは、ひととおり動く Hermes プラグインをゼロから作っていきます。読み終えるころには、複数のツール、ライフサイクルのフック、同梱したデータファイル、束ねたスキルを備えたプラグインができあがります。プラグインの仕組みが支えているものを、ひととおり触ることになります。

:::info どの手引きを読めばよいか迷ったら
Hermes には差し替えられる仕組みがいくつもあります。Python の `register_*` API を使うもの、設定で動かすもの、ディレクトリに置くだけのものと様々です。まずはこの対応表から見てください。

| 追加したいもの | 読む先 |
|---|---|
| 独自のツール、フック、スラッシュコマンド、スキル、CLI のサブコマンド | **この手引き**（一般的なプラグインの入口） |
| **デスクトップアプリ**の拡張（ペイン、ページ、ステータスバー、パレット、テーマ） | [デスクトップ用プラグイン SDK](/hermes/docs/developer-guide/desktop-plugin-sdk/) |
| **ウェブのダッシュボード**の拡張（タブ、シェルの差し込み口、テーマ） | [ダッシュボードを拡張する](/hermes/docs/user-guide/features/extending-the-dashboard/) |
| **LLM / 推論のバックエンド**（新しいプロバイダー） | [モデルプロバイダーのプラグイン](/hermes/docs/developer-guide/model-provider-plugin/) |
| **ゲートウェイのチャンネル**（Discord / Telegram / IRC / Teams など） | [プラットフォームのアダプターを足す](/hermes/docs/developer-guide/adding-platform-adapters/) |
| **メモリのバックエンド**（Honcho / Mem0 / Supermemory など） | [メモリプロバイダーのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/) |
| **コンテキストを圧縮する仕組み** | [コンテキストエンジンのプラグイン](/hermes/docs/developer-guide/context-engine-plugin/) |
| **画像生成のバックエンド** | [画像生成プロバイダーのプラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/) |
| **動画生成のバックエンド** | [動画生成プロバイダーのプラグイン](/hermes/docs/developer-guide/video-gen-provider-plugin/) |
| **ウェブ検索・本文抽出のバックエンド** | [ウェブ検索プロバイダーのプラグイン](/hermes/docs/developer-guide/web-search-provider-plugin/) |
| **クラウドのブラウザーのバックエンド**（Browserbase 型の CDP セッション提供） | [ブラウザープロバイダーのプラグイン](/hermes/docs/developer-guide/browser-provider-plugin/) |
| **secret 管理のバックエンド**（vault / パスワード管理 / OS のキーストア） | [secret ソースのプラグイン](/hermes/docs/developer-guide/secret-source-plugin/) |
| **ダッシュボードの OIDC / 認証プロバイダー** | [ウェブダッシュボード — 独自プロバイダー](/hermes/docs/user-guide/features/web-dashboard/#custom-providers) — `ctx.register_dashboard_auth_provider()` |
| **TTS のバックエンド**（Piper、VoxCPM、Kokoro、声の複製など、CLI なら何でも） | [TTS の独自コマンドプロバイダー](/hermes/docs/user-guide/features/tts/#custom-command-providers) — 設定で動くので Python は不要 |
| **STT のバックエンド**（独自の whisper / ASR の CLI） | [音声メッセージの文字起こし](/hermes/docs/user-guide/features/tts/#voice-message-transcription-stt) — `HERMES_LOCAL_STT_COMMAND` に argv 形式の雛形を設定します |
| **MCP による外部ツール**（ファイルシステム、GitHub、Linear、任意の MCP サーバー） | [MCP](/hermes/docs/user-guide/features/mcp/) — `config.yaml` に `mcp_servers.<name>` を書きます |
| **ゲートウェイのイベントフック**（起動時、セッションのできごと、コマンドで発火） | [イベントフック](/hermes/docs/user-guide/features/hooks/#gateway-event-hooks) — `~/.hermes/hooks/<name>/` に `HOOK.yaml` と `handler.py` を置きます |
| **シェルフック**（できごとに応じてシェルコマンドを走らせる） | [シェルフック](/hermes/docs/user-guide/features/hooks/#shell-hooks) — `config.yaml` の `hooks:` の下に書きます |
| **スキルの取得元を足す**（独自の GitHub リポジトリ、非公開のスキル索引） | [スキル](/hermes/docs/user-guide/features/skills/) — `hermes skills tap add <repo>` · [tap を公開する](/hermes/docs/user-guide/features/skills/#publishing-a-custom-skill-tap) |
| 中核に組み込まれた**コア**の推論プロバイダー（プラグインではないもの） | [プロバイダーを足す](/hermes/docs/developer-guide/adding-providers/) |

設定で動くもの（TTS、STT、MCP、シェルフック）やディレクトリに置くだけのもの（ゲートウェイのフック）まで含めて、拡張できる面をひとまとめに見たいときは [差し替えられる仕組みの表](/hermes/docs/user-guide/features/plugins/#pluggable-interfaces--where-to-go-for-each) を参照してください。
:::

:::caution 他社製品と連携するプラグインは単独で配布します。中核のツリーには入れません
**他者の製品やプロジェクト**とつなぐプラグイン——監視・計測のバックエンド、ベンダーの SaaS 連携、分析ダッシュボード、有料サービスとの結びつけ——は、**単独のプラグインリポジトリ**として作って配布します。`NousResearch/hermes-agent` には取り込みません。利用者は `~/.hermes/plugins/` に入れるか、pip のエントリーポイント経由で導入します。この手引きの内容は、単独のリポジトリでもそのまま同じように使えます。これは結合度と保守の判断であって（中核は速く動きますし、こちらは相手のバックエンドを持っていません）、品質の線引きではありません。優れたプラグインが独立したリポジトリに属していて、まったく差し支えないのです。作ったものは Nous Research の Discord の `#plugins-skills-and-skins` チャンネルで宣伝してください。方針は [CONTRIBUTING.md](https://github.com/NousResearch/hermes-agent/blob/main/CONTRIBUTING.md) を参照してください。
:::

## Portable Agent Plugins v1 のパッケージ {#portable-agent-plugins-v1-packages}

Hermes は、Agent Plugins v1.0.0 の形式に沿ったディレクトリパッケージも導入して読み込めます。
これは、Hermes がすでに持っている持ち運び可能な部品のための互換アダプターです。
`plugin.yaml` と `register(ctx)` からなるネイティブのプラグインを置き換えるものではありません。

```text
my-portable-plugin/
├── plugin.json
├── skills/
│   └── summarize/
│       ├── SKILL.md
│       └── references/
└── mcp.json
```

持ち運び可能なパッケージも、通常の手順で導入して有効にします。

```bash
hermes plugins install owner/repository --no-enable
hermes plugins list
hermes plugins enable <plugin-name>
```

持ち運び可能なパッケージは、導入しただけでは無効のままで、自分で明示的に有効にする必要が
あります。有効にしたパッケージは、すぐに使える `skills/*/SKILL.md` のディレクトリと、
ルートの `mcp.json` に書かれた stdio 型の MCP サーバーを提供できます。スキルは読み取り専用で、
名前空間が付き、`skills_list` と `skill_view` を通じて読み込まれます。MCP のコマンドは、
1つの実行ファイルと引数の一覧として渡され、シェルを経由することはありません。
完全な名前を調べるには `skills_list` を使ってください。持ち運び可能なスキルの名前空間は
`agent-plugin-<slug>-<hash>` という決まった形をしていて、見つかったプラグインのキーから
導かれるため、名前を整形した結果がぶつかることはありません。

Hermes は `plugin.json`、Agent Skills のフロントマター、部品の置き場所、`mcp.json`、
解決されたパス、シンボリックリンクが収まっているかを、すべてローカルで検証します。
パッケージを読み込むときに JSON スキーマを取りにいくことはしません。不正なスキルや MCP の
項目は、その境界だけで見送られ、問題のない同居の部品は読み込まれます。
`PLUGIN_ROOT` は解決されたパッケージのルートを指します。`PLUGIN_DATA` は Hermes が管理する、
プロファイル単位の書き込み可能なディレクトリを指します。
持ち運び可能な MCP の `env` に書いた値はパッケージの中身として見えるデータであり、
secret の保管場所ではありません。資格情報を `mcp.json` に置かないでください。

いま対応している持ち運び可能な範囲は、stdio と Streamable HTTP の MCP 項目です。
持ち運び可能な `streamable-http` の項目は、Hermes が元から持つリモート MCP クライアント
（URL 指定の `mcp_servers` 設定を動かしているのと同じ仕組み）へ回され、v1 の境界の決まりが
適用されます。URL は絶対形式の http(s) で、ユーザー情報やフラグメントを含まないこと、
素の HTTP は `localhost` やループバックのホストにだけ許されること、設定したヘッダーは
オリジンをまたぐリダイレクトの先へ転送されないこと、です。古い `sse` の項目は報告されたうえで
見送られます。Agent Plugins v1 は、信頼・権限・出どころ・サンドボックスを定めていません。
パッケージを有効にすると、その指示とローカルの実行ファイルには、他の導入済み Hermes プラグインと
同じ「全面的に信頼する」姿勢が与えられます。

[整形された仕様](https://agent-plugins.org/specification) では、いま v1.0.0 は Working Draft と
記されています。一方で
[版ごとの仕様リポジトリ](https://github.com/agentplugins/agent-plugins-spec/blob/main/spec/1.0.0.md)
では Published となっています。Hermes が振る舞いの拠りどころにするのは、v1.0.0 の正式なスキーマの
識別子と規範となる本文であって、どちらの可変な状態ラベルでもありません。これは明示的に対応する
一部分であって、Agent Plugins に全面的に準拠しているという主張ではありません。

## ネイティブプラグインの互換の約束 {#native-plugin-compatibility-contract}

`plugin.yaml` と `register(ctx)` からなるネイティブのプラグインは、ひとつの全体的な API 番号では
なく、振る舞いによって守られます。Hermes は `PLUGIN_API_VERSION` を公開しませんし、
マニフェスト全体での `api:` の一致を求めることも、無関係な値に API の版を付けることもしません。
文書化された振る舞いを使っているプラグインは、通常どおり Hermes を更新したあとも動き続けるはずです。

互換のための決まりは次のとおりです。

- **足す方向で育てます。** 文書化された `PluginContext` のメソッドは削除も改名もされません。
  新しい引数は省略可能で既定値を持ち、キーワード専用にすべきです。既存の戻り値の項目が
  削除されたり、黙って型を変えられたりすることはありません。
- **フックのペイロードはキーワードで渡されます。** フックの新しいデータはキーワードの項目として
  足され、既存の項目の意味や位置が変えられることはありません。
  Hermes はコールバックの引数の形を調べます。古いコールバックは自分が宣言した項目だけを受け取り、
  `**kwargs` を持つコールバックはその時点の完全なペイロードを受け取ります。
  新しいプラグインは `**kwargs` を受け取るようにしておくと、引数の形を変えずに足されたデータを
  取り込めます。
- **マニフェストは追加に対して開かれています。** 知らない `plugin.yaml` の項目は無視されます。
  そのため、新しい版で導入されたメタデータを含むマニフェストであっても、古い Hermes で読み込めます。
  プラグインのコード自体が、対応している振る舞いを使っている限りは、という前提つきです。
- **プロバイダーの取り決めは既定の実装で育ちます。** 新しいプロバイダーのメソッドには既定の実装が
  あります。コールバックへ渡す新しい文脈は省略可能で、引数の形を調べてプロバイダーが受け取れると
  分かったときにだけ渡されます。抽象メソッドを足したり、無条件に渡す引数を増やしたりするには、
  ある日を境に形を変えるのではなく、移行のための期間が必要です。
- **境界をまたぐ取り決めには版を付けます。** ある機能が通信のペイロードや保存する形式を定めるなら
  （たとえば観測用のペイロードや secret ソースの状態など）、その機能自身がスキーマの版を持てます。
  そのローカルなスキーマの中では、項目を足す方向を保ってください。保存されたプラグインの状態と
  設定は読めるままにするか、明示的な移行を用意します。古い形式で書かれた、再開されるセッションも
  引き続き再生できなければなりません。無関係なコールバックや文脈の値に、版を表す文字列を
  足さないでください。

### 廃止の方針 {#deprecation-policy}

文書化されたネイティブプラグインの振る舞いを廃止できるのは、次のすべてを満たすときだけです。

1. 代わりとなるものと移行の手順が、プラグインの手引きとリリースノートに書かれていること。
2. 1つのプロセスにつき最大1回、代わりとなるものと削除される最も早い版を挙げた警告が出ること。
3. 古い振る舞いが、少なくともその後2回のマイナー版まで使えること。
4. その期間を通じて、古い経路と新しい経路の両方について、振る舞いに基づく互換の検査があること。

期間が終わって削除するときには、保存されたデータや再開できるセッションのために必要な移行も
含めなければなりません。実際のところは、削除するよりも、別名やアダプターを足すほうが好まれます。

Hermes はこの約束を、独立した `HERMES_HOME` から見つけてくる、固定された外部プラグインの
検査用データによって守っています。それらのテストは `PluginManager` を通じてプラグインを読み込み、
呼び出します。内部の記号の一覧やソースコードの見た目ではなく、実際の登録とコールバックの結果を
確かめます。

## 何を作るのか {#what-youre-building}

**電卓**プラグインで、ツールは2つです。
- `calculate` — 数式を評価します（`2**16`、`sqrt(144)`、`pi * 5**2`）
- `unit_convert` — 単位を変換します（`100 F → 37.78 C`、`5 km → 3.11 mi`）

さらに、すべてのツール呼び出しを記録するフックと、同梱するスキルファイルも作ります。

## 手順1: プラグインのディレクトリを作る {#step-1-create-the-plugin-directory}

ディレクトリを作って、手順2へ進みます。

```bash
mkdir -p ~/.hermes/plugins/calculator
cd ~/.hermes/plugins/calculator
```

### Plugin Doctor で検証する {#validate-with-plugin-doctor}

`hermes plugins doctor [path-or-id]` は、Hermes 自身が使っているのと同じディレクトリの探索、
マニフェストの解析、名前空間つきの読み込み、`register(ctx)`、フックの登録簿、ツールの
登録簿を走らせます。不正なフック名、`**kwargs` を受け取らないコールバック、登録の失敗、
宣言したツールやフックと実際に登録されたものとのずれを報告します。エラーがあったときに
0 以外で終了させたい場合は `--ci` を付けます。

```bash
hermes plugins doctor . --ci
```

Doctor は一時的な `HERMES_HOME` を使い、検査のあとプラグインの登録状態を元に戻し、登録の最中に
うっかりネットワークへ出ないよう Python の直接のソケット接続を遮ります。ただしこれはサンドボックス
ではありません。プラグインのコードは現在の利用者の権限で同じプロセス内で実行され、子プロセスを
起動することもできます。読み込んでも構わないと信じられるコードにだけ Doctor を使ってください。

## 手順2: マニフェストを書く {#step-2-write-the-manifest}

`plugin.yaml` を作ります。

```yaml
name: calculator
version: 1.0.0
description: Math calculator — evaluate expressions and convert units
provides_tools:
  - calculate
  - unit_convert
provides_hooks:
  - post_tool_call
```

これで Hermes に「自分は calculator というプラグインで、ツールとフックを提供します」と伝わります。`provides_tools` と `provides_hooks` の項目は、そのプラグインが登録するものの一覧です。

足せる省略可能な項目もあります。
```yaml
author: Your Name
requires_env:          # gate loading on env vars; prompted during install
  - SOME_API_KEY       # simple format — plugin disabled if missing
  - name: OTHER_KEY    # rich format — shows description/url during install
    description: "Key for the Other service"
    url: "https://other.com/keys"
    secret: true
capabilities:          # privileged host surfaces you request (consent flow)
  - tools.override     # replace built-in tools (needs user consent)
  - llm.model_override # choose the model for host-owned LLM calls
```

### できることを宣言する {#declaring-capabilities}

組み込みのツールを置き換える、`ctx.llm` の呼び出しで使うモデルを選ぶなど、特権的な面が必要な
プラグインは、`capabilities:` にそれを書きます。
導入や有効化のときに利用者がその一覧を見て、一度だけ同意します。あとの版で追加された分が
あれば、更新のときに追加分だけあらためて尋ねられます。
宣言していないもの、同意されていないものは、単に無効になります（安全側に倒れます）。ですから
**使う前に確かめて、無ければ穏やかに機能を落としてください**。

```python
def register(ctx):
    if ctx.has_capability("tools.override"):
        ctx.register_tool(..., override=True)
    else:
        ctx.register_tool(...)   # register under a non-conflicting name
```

知られている capability の id は `tools.override`、`llm.provider_override`、
`llm.model_override`、`llm.agent_id_override`、`llm.profile_override`、
`llm.task_override` です（正式な一覧は `hermes_cli/plugin_capabilities.py` に
あります）。知らない id は無視されます。以前の、機能ごとの設定キー
（`plugins.entries.<id>.allow_tool_override` など）もまだ動きますが、
廃止予定です。capability を宣言すれば、利用者は1つの、後から追える同意の画面を
見るだけで済みます。capability は同意と記録のためのもので、**サンドボックスでは
ありません**。ホスト側の API の面を制御するだけです。

**pip で配布されるプラグイン**には、導入後に `plugin.yaml` のディレクトリがありません。
そのため、対になる `hermes_agent.plugin_capabilities` というエントリーポイントの
グループを使って、配布物のメタデータのほうに capability を宣言します。宣言はそれぞれ
`<plugin-id>.<capability-id>` という名前で、`hermes_agent.plugins` のエントリーポイントと
同じ対象を指します。

```toml
[project.entry-points."hermes_agent.plugins"]
calculator = "my_pkg:register"

[project.entry-points."hermes_agent.plugin_capabilities"]
"calculator.tools.override" = "my_pkg:register"
```

Hermes は、コードを読み込むことなく導入済みのメタデータからこれらを読み取ります。おかげで
pip 導入の場合でも `hermes plugins capabilities` と同意の流れが正確に保たれます。

### マニフェスト v2 の早見表 {#manifest-v2-reference}

`plugin.yaml` は、追加のみの **v2 スキーマ**にも対応しています（#64165）。どの項目も
省略可能です。`manifest_version` の無いマニフェストは v1 のマニフェストで、これからもずっと
そのまま使えます。知らない項目が読み込みを壊すことはありません。警告とともに無視されますし
（前向きの互換性）、この Hermes が知っているより新しい `manifest_version` でも、警告つきで
読み込まれます。

| 項目 | 型 | 意味 |
|---|---|---|
| `manifest_version` | int | マニフェストの**ファイル形式**の版。無ければ `1`。いまの最大は `2`。`api_version` とは別ものです。 |
| `api_version` | int | そのプラグインが想定している、実行時の**プラグイン API の世代**（ctx の面やフックの引数の形）。`manifest_version` とはあえて別の軸にしてあり、`api_version: 1` のプラグインが v2 のマニフェストを使ってもかまいません。 |
| `requires_plugins` | list | プラグイン同士の依存関係: `- id: other-plugin` に、省略可能な `version_range: ">=1.0,<2"` を添えます。**助言にとどまります**。依存先が無ければ分かりやすい警告が出ますが、プラグインは読み込まれます。実行時に `ctx.has_plugin("other-plugin")` で確かめてください。読み込みの**順番**はこの関係を尊重します。A が B を必要とするなら、B の `register()` が A より先に走ります（トポロジカルな並べ替え、同順なら名前順。循環していれば警告して名前順に戻ります）。 |
| `python_dependencies` | list of str | 宣言された pip の要件（たとえば `"requests>=2.0,<3"`）。**宣言する場所にすぎません**。Hermes はこれを検証し、`hermes plugins install` と `hermes plugins doctor` が足りないものを `pip install` の案内とともに示しますが、**自動で導入することは決してありません**。上限を固定しておいてください。 |
| `config_schema` | mapping | `plugins.entries.<id>.settings` の下のキーを、JSON スキーマ風に説明したもの: `api_url: {type: str, default: "", description: "...", required: false}`。読み込み時に検証され、食い違いはキー名と期待される型を挙げた実用的な警告として記録されます。読み込みの失敗にはなりません。型は `str`、`int`、`float`、`bool`、`list`、`dict`（および JSON スキーマの別名）です。 |
| `license` | str | SPDX 形式のライセンス id（たとえば `MIT`）。 |
| `homepage` | str | プロジェクトの URL。 |
| `tags` | list of str | 見つけてもらうための自由なタグ（たとえば `[gateway, telegram]`）。 |

```yaml
# plugin.yaml — manifest v2 example
name: my-plugin
version: 1.2.0
manifest_version: 2
api_version: 1
license: MIT
homepage: https://github.com/owner/my-plugin
tags: [gateway, demo]
requires_plugins:
  - id: other-plugin
    version_range: ">=1.0,<2"
python_dependencies:
  - "somepkg>=1.0,<2"     # surfaced, never auto-installed
config_schema:
  api_url: {type: str, default: "", description: "Service endpoint"}
```

:::note pip の依存を隔離する話は先送りされています
`python_dependencies` は、あえて宣言して見せるだけのものです。
任意のパッケージを Hermes の共有 venv へ入れることは、衝突と供給網の危うさを招きます。
そのため導入部分の隔離の設計（ホストのロックに対する制約ファイルでの導入か、プラグインごとに
抱え込むディレクトリか、衝突を検知して拒むか）は、明示的に後回しにした課題です。
[#64165](https://github.com/NousResearch/hermes-agent/issues/64165) の2巡目のレビューと
[#15220](https://github.com/NousResearch/hermes-agent/issues/15220) を参照してください。プラグインの
まとめ売り（#64166）は、この v2 の項目の上に作られます。
:::

## 手順3: ツールのスキーマを書く {#step-3-write-the-tool-schemas}

`schemas.py` を作ります。LLM は、いつそのツールを呼ぶかを決めるためにここを読みます。

```python
"""Tool schemas — what the LLM sees."""

CALCULATE = {
    "name": "calculate",
    "description": (
        "Evaluate a mathematical expression and return the result. "
        "Supports arithmetic (+, -, *, /, **), functions (sqrt, sin, cos, "
        "log, abs, round, floor, ceil), and constants (pi, e). "
        "Use this for any math the user asks about."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "expression": {
                "type": "string",
                "description": "Math expression to evaluate (e.g., '2**10', 'sqrt(144)')",
            },
        },
        "required": ["expression"],
    },
}

UNIT_CONVERT = {
    "name": "unit_convert",
    "description": (
        "Convert a value between units. Supports length (m, km, mi, ft, in), "
        "weight (kg, lb, oz, g), temperature (C, F, K), data (B, KB, MB, GB, TB), "
        "and time (s, min, hr, day)."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "value": {
                "type": "number",
                "description": "The numeric value to convert",
            },
            "from_unit": {
                "type": "string",
                "description": "Source unit (e.g., 'km', 'lb', 'F', 'GB')",
            },
            "to_unit": {
                "type": "string",
                "description": "Target unit (e.g., 'mi', 'kg', 'C', 'MB')",
            },
        },
        "required": ["value", "from_unit", "to_unit"],
    },
}
```

**スキーマが大事な理由:** LLM は `description` の項目を見て、そのツールを使うかどうかを決めます。何をするもので、どういうときに使うのかを具体的に書いてください。`parameters` は、LLM が渡す引数を定めます。

## 手順4: ツールの処理を書く {#step-4-write-the-tool-handlers}

`tools.py` を作ります。LLM がツールを呼んだときに実際に走るコードです。

```python
"""Tool handlers — the code that runs when the LLM calls each tool."""

# Safe globals for expression evaluation — no file/network access
_SAFE_MATH = {
    "abs": abs, "round": round, "min": min, "max": max,
    "pow": pow, "sqrt": math.sqrt, "sin": math.sin, "cos": math.cos,
    "tan": math.tan, "log": math.log, "log2": math.log2, "log10": math.log10,
    "floor": math.floor, "ceil": math.ceil,
    "pi": math.pi, "e": math.e,
    "factorial": math.factorial,
}

def calculate(args: dict, **kwargs) -> str:
    """Evaluate a math expression safely.

    Rules for handlers:
    1. Receive args (dict) — the parameters the LLM passed
    2. Do the work
    3. Return a JSON string — ALWAYS, even on error
    4. Accept **kwargs for forward compatibility
    """
    expression = args.get("expression", "").strip()
    if not expression:
        return json.dumps({"error": "No expression provided"})

    try:
        result = eval(expression, {"__builtins__": {}}, _SAFE_MATH)
        return json.dumps({"expression": expression, "result": result})
    except ZeroDivisionError:
        return json.dumps({"expression": expression, "error": "Division by zero"})
    except Exception as e:
        return json.dumps({"expression": expression, "error": f"Invalid: {e}"})

# Conversion tables — values are in base units
_LENGTH = {"m": 1, "km": 1000, "mi": 1609.34, "ft": 0.3048, "in": 0.0254, "cm": 0.01}
_WEIGHT = {"kg": 1, "g": 0.001, "lb": 0.453592, "oz": 0.0283495}
_DATA = {"B": 1, "KB": 1024, "MB": 1024**2, "GB": 1024**3, "TB": 1024**4}
_TIME = {"s": 1, "ms": 0.001, "min": 60, "hr": 3600, "day": 86400}

def _convert_temp(value, from_u, to_u):
    # Normalize to Celsius
    c = {"F": (value - 32) * 5/9, "K": value - 273.15}.get(from_u, value)
    # Convert to target
    return {"F": c * 9/5 + 32, "K": c + 273.15}.get(to_u, c)

def unit_convert(args: dict, **kwargs) -> str:
    """Convert between units."""
    value = args.get("value")
    from_unit = args.get("from_unit", "").strip()
    to_unit = args.get("to_unit", "").strip()

    if value is None or not from_unit or not to_unit:
        return json.dumps({"error": "Need value, from_unit, and to_unit"})

    try:
        # Temperature
        if from_unit.upper() in {"C","F","K"} and to_unit.upper() in {"C","F","K"}:
            result = _convert_temp(float(value), from_unit.upper(), to_unit.upper())
            return json.dumps({"input": f"{value} {from_unit}", "result": round(result, 4),
                             "output": f"{round(result, 4)} {to_unit}"})

        # Ratio-based conversions
        for table in (_LENGTH, _WEIGHT, _DATA, _TIME):
            lc = {k.lower(): v for k, v in table.items()}
            if from_unit.lower() in lc and to_unit.lower() in lc:
                result = float(value) * lc[from_unit.lower()] / lc[to_unit.lower()]
                return json.dumps({"input": f"{value} {from_unit}",
                                 "result": round(result, 6),
                                 "output": f"{round(result, 6)} {to_unit}"})

        return json.dumps({"error": f"Cannot convert {from_unit} → {to_unit}"})
    except Exception as e:
        return json.dumps({"error": f"Conversion failed: {e}"})
```

**処理を書くときの要点:**
1. **引数の形:** `def my_handler(args: dict, **kwargs) -> str`
2. **戻り値:** 必ず JSON の文字列です。成功でもエラーでも同じです。
3. **例外を投げない:** すべての例外を捕まえて、エラーの JSON を返します。
4. **`**kwargs` を受け取る:** Hermes が将来、追加の文脈を渡すかもしれません。

## 手順5: 登録の処理を書く {#step-5-write-the-registration}

`__init__.py` を作ります。ここでスキーマと処理を結びつけます。

```python
"""Calculator plugin — registration."""

from . import schemas, tools

logger = logging.getLogger(__name__)

# Track tool usage via hooks
_call_log = []

def _on_post_tool_call(tool_name, args, result, task_id, **kwargs):
    """Hook: runs after every tool call (not just ours)."""
    _call_log.append({"tool": tool_name, "session": task_id})
    if len(_call_log) > 100:
        _call_log.pop(0)
    logger.debug("Tool called: %s (session %s)", tool_name, task_id)

def register(ctx):
    """Wire schemas to handlers and register hooks."""
    ctx.register_tool(name="calculate",    toolset="calculator",
                      schema=schemas.CALCULATE,    handler=tools.calculate)
    ctx.register_tool(name="unit_convert", toolset="calculator",
                      schema=schemas.UNIT_CONVERT, handler=tools.unit_convert)

    # This hook fires for ALL tool calls, not just ours
    ctx.register_hook("post_tool_call", _on_post_tool_call)
```

**`register()` がしていること:**
- 起動時にちょうど一度だけ呼ばれます
- `ctx.register_tool()` でツールを登録簿に入れます。モデルはすぐにそれを見られます
- `ctx.register_hook()` でライフサイクルのできごとを購読します
- `ctx.register_cli_command()` で CLI のサブコマンドを登録します（たとえば `hermes my-plugin <subcommand>`）
- `ctx.register_command()` でセッション中のスラッシュコマンドを登録します（CLI やゲートウェイのチャットの中で使う `/myplugin <args>` など）。後述の [スラッシュコマンドを登録する](#register-slash-commands) を参照してください
- `ctx.dispatch_tool(name, arguments)` — ほかのツール（組み込みでも、別のプラグインのものでも）を、親エージェントの文脈（承認、資格情報、task_id）を自動で引き継いだ状態で呼び出します。スラッシュコマンドの処理から `terminal` や `read_file` などを、モデルが直接呼んだかのように動かしたいときに便利です。
- `ctx.get_config()` と `ctx.set_config()` は、そのプラグイン自身の設定の名前空間だけに触れます。`ctx.state` は、動いているプロファイルの下にプラグイン自身の実行時のデータを保存します。
- この関数が落ちると、そのプラグインは無効になりますが、Hermes はそのまま動き続けます

**`dispatch_tool` の例——ツールを走らせるスラッシュコマンド:**

```python
def handle_scan(ctx, raw_args: str):
    """Implement /scan by invoking the terminal tool through the registry."""
    result = ctx.dispatch_tool("terminal", {"command": f"find . -name '{raw_args}'"})
    return result  # returned to the caller's chat UI

def register(ctx):
    # Handlers receive a single raw_args string; close over ctx via a lambda.
    ctx.register_command(
        "scan",
        lambda raw: handle_scan(ctx, raw),
        description="Find files matching a glob",
    )
```

こうして呼ばれたツールは、通常どおり承認・伏せ字・予算の仕組みを通ります。それらを迂回する近道ではなく、本物のツール呼び出しです。

### 設定と実行時の状態を保存する {#store-settings-and-runtime-state}

利用者から見える振る舞いには、プラグインを起点とした設定のキーを使ってください。Hermes は
それを `plugins.entries.<plugin-id>.settings` の下で解決し、全体の設定・他プラグイン・
上位への移動を狙うパスは拒みます。

```python
def register(ctx):
    endpoint = ctx.get_config("endpoint", default="https://example.invalid")
    retries = ctx.get_config("retry.attempts", default=3)

    ctx.set_config("endpoint", endpoint)
    ctx.set_config("retry.attempts", retries)
```

プラグイン自身が持つ読み進めの位置、キャッシュ、重複除去のデータは、`config.yaml` に実行時の
記録を置くのではなく `ctx.state` を使ってください。

```python
def register(ctx):
    cursor = ctx.state.get("cursor", default={"page": 0})
    ctx.state.set("cursor", {"page": cursor["page"] + 1})
```

状態はプロファイル単位で、まるごと入れ替えられ、同時に書き込んでも安全で、プラグインごとに
10 MiB までです。持ち運び可能なパッケージは、自分の `PLUGIN_DATA` として同じディレクトリを
共有します。ネイティブのプラグインには、ぶつかりにくく Windows でも安全な名前空間が与えられます。
壊れた既存の状態は、報告されたうえでそのまま残されます。

設定と状態では持ち主が違います。設定は `config.yaml` にある利用者から見える振る舞いで、
状態は `<HERMES_HOME>/plugin-data/` の下にあるプラグイン自身の実行時のデータです。
どちらの API も、他のプラグインの名前空間には触れられません。

## 手順6: 動かしてみる {#step-6-test-it}

Hermes を起動します。

```bash
hermes
```

起動時のツール一覧に `calculator: calculate, unit_convert` が出るはずです。

こんなふうに話しかけてみてください。
```
What's 2 to the power of 16?
Convert 100 fahrenheit to celsius
What's the square root of 2 times pi?
How many gigabytes is 1.5 terabytes?
```

プラグインの状態を確認します。
```
/plugins
```

出力はこうなります。
```
Plugins (1):
  ✓ calculator v1.0.0 (2 tools, 1 hooks)
```

### プラグインが見つからないときに調べる {#debugging-plugin-discovery}

プラグインが出てこない、あるいは出てくるのに読み込まれない場合は、`HERMES_PLUGINS_DEBUG=1` を設定すると、探索の詳しいログが標準エラー出力に出ます。

```bash
HERMES_PLUGINS_DEBUG=1 hermes plugins list
```

プラグインの取得元ごと（同梱、利用者、プロジェクト、エントリーポイント）に、次のことが分かります。

- どのディレクトリを走査し、それぞれからマニフェストがいくつ見つかったか
- マニフェストごとの、解決されたキー、名前、種類、取得元、ディスク上のパス
- 見送った理由: `disabled via config`、`not enabled in config`、`exclusive plugin`、`no plugin.yaml, depth cap reached`
- 読み込み時: 読み込んでいるプラグインと、`register(ctx)` が何を登録したか（ツール、フック、スラッシュコマンド、CLI コマンド）の1行のまとめ
- 解析に失敗したとき: その例外の完全なトレースバック（YAML の走査エラーなど）
- `register()` が失敗したとき: 例外を投げた `__init__.py` の行を指す、完全なトレースバック

同じログは常に `~/.hermes/logs/agent.log` へ書かれます。WARNING では失敗だけ、環境変数を設定していれば DEBUG ですべてが残ります。環境変数を付けて実行できない場合（ゲートウェイの中からなど）は、ログファイルを追いかけてください。

```bash
hermes logs --level WARNING | grep -i plugin
```

プラグインが出てこないときによくある理由は次のとおりです。

- **設定で有効になっていない** — プラグインは自分で有効にする方式です。`hermes plugins enable <name>` を実行してください（名前は `plugins list` の出力にあるもので、階層のある配置では `<category>/<plugin>` の形になることもあります）。
- **ディレクトリの配置が違う:** ネイティブのパッケージは `~/.hermes/plugins/<plugin-name>/plugin.yaml`（平ら）か、分類を1段はさむ形を使います。持ち運び可能なパッケージは、同じ場所のルートに `plugin.json` を置きます。それより深いものは無視されます。
- **`__init__.py` が無い:** ネイティブのパッケージには `plugin.yaml` と、`register(ctx)` 関数を持つ `__init__.py` の両方が必要です。持ち運び可能なパッケージは Python を読み込まないので、`__init__.py` は要りません。
- **`kind` が違う** — ゲートウェイのアダプターは、マニフェストに `kind: platform` が必要です。メモリのプロバイダーは `kind: exclusive` として自動で判別され、`plugins.enabled` ではなく `memory.provider` の設定を通じて選ばれます。

## できあがったプラグインの構成 {#your-plugins-final-structure}

```
~/.hermes/plugins/calculator/
├── plugin.yaml      # "I'm calculator, I provide tools and hooks"
├── __init__.py      # Wiring: schemas → handlers, register hooks
├── schemas.py       # What the LLM reads (descriptions + parameter specs)
└── tools.py         # What runs (calculate, unit_convert functions)
```

4つのファイルで、役割がはっきり分かれています。
- **マニフェスト**は、そのプラグインが何であるかを宣言します
- **スキーマ**は、LLM に向けてツールを説明します
- **処理**は、実際の中身を実装します
- **登録**は、それらをつなぎ合わせます

## プラグインには他に何ができるのか {#what-else-can-plugins-do}

### データファイルを同梱する {#ship-data-files}

好きなファイルをプラグインのディレクトリに置いて、読み込み時に読み出せます。

```python
# In tools.py or __init__.py
from pathlib import Path

_PLUGIN_DIR = Path(__file__).parent
_DATA_FILE = _PLUGIN_DIR / "data" / "languages.yaml"

with open(_DATA_FILE) as f:
    _DATA = yaml.safe_load(f)
```

これは*同梱する*ファイルの話です。*書き込む*状態は別で、次の節を読んでください。

### 消えない状態を保存する {#store-durable-state}

実行時の状態をプラグインのディレクトリに書き込んではいけません。そこは導入先の
ツリーで、`hermes plugins update` や `remove` が git pull したり削除したりするため、
利用者のデータもろとも消えます。正しい置き場所はプラグインごとのデータの根で、更新にも
削除にも耐え、動いているプロファイルに追随します。

```python
from plugins.plugin_storage import plugin_data_dir, plugin_db

# <hermes home>/plugin-data/<name>/ — created on first use
state_file = plugin_data_dir("my-plugin") / "state.json"

# Or a SQLite database at <data dir>/data.db (WAL mode, thread-friendly)
conn = plugin_db("my-plugin")
conn.execute("CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY)")
```

プラグインごとに1つのディレクトリなので、どのプラグインのデータも、予想のつく1箇所で
のぞけます。secret はここに置くものではありません。資格情報の読み出しは、ほかと同じく
標準の `.env` や secret の仕組みを通します。

### スキルを束ねる {#bundle-skills}

プラグインは、エージェントが `skill_view("plugin:skill")` で読み込めるスキルファイルを同梱できます。`__init__.py` で登録してください。

```
~/.hermes/plugins/my-plugin/
├── __init__.py
├── plugin.yaml
└── skills/
    ├── my-workflow/
    │   └── SKILL.md
    └── my-checklist/
        └── SKILL.md
```

```python
from pathlib import Path

def register(ctx):
    skills_dir = Path(__file__).parent / "skills"
    for child in sorted(skills_dir.iterdir()):
        skill_md = child / "SKILL.md"
        if child.is_dir() and skill_md.exists():
            ctx.register_skill(child.name, skill_md)
```

これでエージェントは、名前空間の付いた名前でスキルを読み込めます。

```python
skill_view("my-plugin:my-workflow")   # → plugin's version
skill_view("my-workflow")              # → built-in version (unchanged)
```

**押さえておきたい性質:**
- プラグインのスキルは**読み取り専用**です。`~/.hermes/skills/` には入らず、`skill_manage` で編集することもできません。
- プラグインのスキルは、システムプロンプトの `<available_skills>` の索引には**載りません**。明示的に読み込むものです。
- 名前だけのスキルには影響しません。名前空間があるので、組み込みのスキルとぶつかりません。
- エージェントがプラグインのスキルを読み込むと、同じプラグインにある兄弟スキルを挙げた案内が先頭に付きます。

:::tip 以前のやり方
古い `shutil.copy2` のやり方（スキルを `~/.hermes/skills/` へコピーする方法）もまだ動きますが、組み込みのスキルと名前がぶつかる恐れがあります。新しいプラグインでは `ctx.register_skill()` を使ってください。
:::

### 環境変数を条件にする {#gate-on-environment-variables}

プラグインに API キーが必要な場合は、こうします。

```yaml
# plugin.yaml — simple format (backwards-compatible)
requires_env:
  - WEATHER_API_KEY
```

`WEATHER_API_KEY` が設定されていなければ、そのプラグインは分かりやすいメッセージとともに無効になります。落ちることもエージェント側でエラーになることもなく、ただ「Plugin weather disabled (missing: WEATHER_API_KEY)」と出るだけです。

利用者が `hermes plugins install` を実行すると、足りない `requires_env` の変数を**その場で尋ねられます**。入力した値は自動的に `.env` へ保存されます。

導入の体験をもっと良くしたいなら、説明と申し込み先の URL を添えた詳しい形式を使ってください。

```yaml
# plugin.yaml — rich format
requires_env:
  - name: WEATHER_API_KEY
    description: "API key for OpenWeather"
    url: "https://openweathermap.org/api"
    secret: true
```

| 項目 | 必須 | 説明 |
|-------|----------|-------------|
| `name` | はい | 環境変数の名前 |
| `description` | いいえ | 導入時の入力画面で利用者に示されます |
| `url` | いいえ | その資格情報の入手先 |
| `secret` | いいえ | `true` なら入力が伏せられます（パスワード欄のように） |

どちらの形式も同じ一覧に混ぜて書けます。すでに設定されている変数は、黙って飛ばされます。

### 任意の Python 依存を必要になってから入れる {#lazy-install-optional-python-dependencies}

全員が入れているとは限らない SDK（ベンダーの SDK、重い機械学習のライブラリ、特定の環境向けのパッケージ）をくるむプラグインでは、モジュールの先頭で `import` しないでください。ツールの処理の中で `tools.lazy_deps.ensure(...)` を使えば、最初に使うときに Hermes がそのパッケージを導入します。これは利用者の `security.allow_lazy_installs` の設定によって制御されます。

```python
# tools.py
from tools.lazy_deps import ensure, FeatureUnavailable

def my_tool_handler(args, **kwargs):
    try:
        ensure("my-plugin.my-backend")   # key must be in LAZY_DEPS
    except FeatureUnavailable as exc:
        return {"error": str(exc)}

    import my_backend_sdk   # safe now
    ...
```

`tools/lazy_deps.py` のセキュリティの考え方から、決まりが2つあります。

| 決まり | 理由 |
|---|---|
| 機能のキーは、ツリー内の `LAZY_DEPS` の許可一覧に載っていなければなりません | 悪意ある設定によって Hermes に任意のパッケージを入れさせられないようにするためです。対象になるのは、Hermes 自身が持っている指定だけです |
| 指定は PyPI の名前だけです | `--index-url`、`git+https://`、file: のパスは使えません。版は許可一覧の項目の中で PEP 440 の書き方で固定してください（`"my-sdk>=1.2,<2"`） |

pip で配布する他者製のプラグインでは、任意の依存を自分の `pyproject.toml` の `[project.optional-dependencies]` の extras として宣言し、利用者に `pip install your-plugin[backend]` と案内してください。そちらの経路は `lazy_deps` を通りません。必要になってから入れるやり方がいちばん役に立つのは**同梱の**プラグインで、導入のたびに固い依存を持ち込むと Hermes の土台が膨らんでしまう場合です。

全体で `security.allow_lazy_installs: false` が設定されていると、`ensure()` はすぐに `FeatureUnavailable` を投げ、対処のヒントを添えます。プラグイン側はそれを捕まえて穏やかに機能を落としてください（ツールのループを落とすのではなく、エラーの結果を返します）。

### スレッドに安全な、遅延生成のシングルトン {#thread-safe-lazy-singletons}

プラグインはよく、値の張る対象——SDK のクライアント、HTTP のセッション、コネクションプール——を、最初に使うときに作ってモジュール変数に取っておきます。

```python
_client = None

def get_client():
    global _client
    if _client is not None:
        return _client
    _client = ExpensiveClient(...)   # ← TOCTOU race
    return _client
```

これは落とし穴です。Hermes は1つのプロセスで複数のスレッドを動かします（委任されたツールの呼び出し、裏で動く処理、自己改善のフォーク）。そのため `_client` が入る前に2つのスレッドが `get_client()` に来て、**どちらも** `is not None` の検査を通り抜け、**どちらも**値の張る生成を走らせ、後から書いたほうが先のものを上書きしてしまうことがあります。負けたほうが開いた資源（接続、ファイルハンドル、裏のスレッド）は取り残されます。

ロックを自作しないでください。`plugins/plugin_utils.py` の補助を使います。

```python
from plugins.plugin_utils import lazy_singleton, SingletonSlot

# Zero-arg accessor → decorate it:
@lazy_singleton
def get_client():
    return ExpensiveClient(load_config())   # runs exactly once

client = get_client()    # safe across threads
get_client.reset()       # drop the instance (tests / teardown)

# Accessor that takes a build argument → use a slot:
_slot: SingletonSlot = SingletonSlot()

def get_client(config=None):
    return _slot.get(lambda: ExpensiveClient(resolve(config)))

def reset_client():
    _slot.reset()
```

どちらも、二重に確かめるロックによって同時の初回呼び出しを直列にし、生成の処理を高々1回しか走らせません。生成が例外を投げたときは何も残らず、次の呼び出しでやり直します。honcho のメモリプラグイン（`plugins/memory/honcho/client.py`）が、お手本となる利用例です。

> 目安: `global _something` と書いて `is None` の検査と生成が続くようなら、いつでもこちらに手を伸ばしてください。

### 条件によってツールを出し分ける {#conditional-tool-availability}

任意のライブラリに依存するツールでは、こうします。

```python
ctx.register_tool(
    name="my_tool",
    schema={...},
    handler=my_handler,
    check_fn=lambda: _has_optional_lib(),  # False = tool hidden from model
)
```

### 組み込みのツールを置き換える {#overriding-a-built-in-tool}

組み込みのツールを自前の実装に差し替えたいとき（既定のブラウザーのツールを画面ありの
Chrome の CDP バックエンドに替える、`web_search` を社内の独自索引に替える、など）は、
`override=True` を渡します。

```python
def register(ctx):
    ctx.register_tool(
        name="browser_navigate",             # same name as the built-in
        toolset="plugin_my_browser",         # your own toolset namespace
        schema={...},
        handler=my_custom_navigate,
        override=True,                       # explicit opt-in
    )
```

`override=True` が無い場合、別のツールセットにある既存のツールを覆い隠すような登録は
登録簿に拒まれます。うっかり上書きしてしまうのを防ぐためです。**組み込みの**ツールを
置き換えるには、さらに運用者が `config.yaml` の
`plugins.entries.<plugin_id>.allow_tool_override: true` で許可する必要があります。
その許可が無ければ、`register_tool(override=True)` は
`PluginToolOverrideError` を投げます。置き換えは記録されるので、
`~/.hermes/logs/agent.log` から後で追えます。プラグインは組み込みのツールより
あとに読み込まれるので、登録の順番は正しく、自前の処理が組み込みのものに
取って代わります。

**同梱でないプラグインには、運用者の許可も必要です。** Hermes の中核に同梱されていない
プラグイン（利用者、プロジェクト、pip のいずれの取得元でも）では、既存の組み込みツールに
対する `override=True` に、`config.yaml` でのプラグインごとの許可がさらに必要です。

```yaml
plugins:
  entries:
    my-plugin:                    # the plugin's registry key from `hermes plugins list`
      allow_tool_override: true
```

許可が無ければ `ctx.register_tool(..., override=True)` は
`PluginToolOverrideError` を投げます。`register()` の例外は読み込み側が捕まえるので、
そのプラグインは無効になり、Hermes は動き続けます。この関門があるのは、有効になった
プラグインが `shell_exec` や `write_file` のような特権的な組み込みを黙って置き換えると、
モデルがそこへ流すものすべてを横取りできてしまうからです。同梱のプラグインは例外で、
そこでの置き換えは保守側の判断です。設定を読み込めない場合、この関門は閉じる側に倒れます。

このキーを手で書き換えることは普通ありません。`hermes plugins enable <name>` は、
同梱でないプラグインを有効にするときにこの権限を与えるか尋ねます（既定は「いいえ」）。
`--allow-tool-override` と `--no-allow-tool-override` の指定を使えば、
スクリプトからの導入で確認を飛ばせます。同じ許可は `deregister()` にも効きます。
許可が無ければ、プラグインは自分のものでないツールを取り除けません（それができると
置き換えの検査を回り込めてしまうからです）。

### 複数のフックを登録する {#register-multiple-hooks}

```python
def register(ctx):
    ctx.register_hook("pre_tool_call", before_any_tool)
    ctx.register_hook("post_tool_call", after_any_tool)
    ctx.register_hook("pre_llm_call", inject_memory)
    ctx.register_hook("on_session_start", on_new_session)
    ctx.register_hook("on_session_end", on_session_end)
```

### フックの早見表 {#hook-reference}

各フックの詳しい説明は **[イベントフックの一覧](/hermes/docs/user-guide/features/hooks/#plugin-hooks)** にあります。コールバックの引数の形、引数の表、いつ発火するか、例まで載っています。ここではその要約を示します。

| フック | 発火するとき | コールバックの引数 | 戻り値 |
|------|-----------|-------------------|---------|
| [`pre_tool_call`](/hermes/docs/user-guide/features/hooks/#pre_tool_call) | どのツールでも、実行される前 | `tool_name: str, args: dict, task_id: str` | 省略可能な指示: `{"action": "block", "message": ...}` はその呼び出しを止めます。`{"action": "approve", "message": ...}` は人の承認を求める段階へ引き上げます |
| [`post_tool_call`](/hermes/docs/user-guide/features/hooks/#post_tool_call) | どのツールでも、返ってきた後 | `tool_name: str, args: dict, result: str, task_id: str, duration_ms: int` | 無視されます |
| [`pre_llm_call`](/hermes/docs/user-guide/features/hooks/#pre_llm_call) | 1往復につき1回、ツール呼び出しのループの前 | `session_id: str, user_message: str, conversation_history: list, is_first_turn: bool, model: str, platform: str` | [文脈の差し込み](#pre_llm_call-context-injection) |
| [`post_llm_call`](/hermes/docs/user-guide/features/hooks/#post_llm_call) | 1往復につき1回、ツール呼び出しのループの後（成功した往復のみ） | `session_id: str, user_message: str, assistant_response: str, conversation_history: list, model: str, platform: str` | 無視されます |
| `pre_api_request` | プロバイダーへの生の API 要求ごと、その前（モデルがツールを呼ぶと1往復に何度も） | `session_id: str, model: str, provider: str, base_url: str, api_mode: str, api_call_count: int, message_count: int, tool_count: int, approx_input_tokens: int, max_tokens: int, request: dict` | 無視されます |
| `post_api_request` | プロバイダーへの生の API 要求が返ったあとごと | `pre_api_request` の項目に加えて `api_duration: float, finish_reason: str, response_model: str \| None, usage: dict, response: dict, assistant_content_chars: int, assistant_tool_call_count: int` | 無視されます |
| `api_request_error` | プロバイダーへの API 呼び出しが例外を投げたとき | 対応づけのための項目に加えて `status_code: int \| None, retry_count: int \| None, max_retries: int \| None, retryable: bool \| None, reason: str \| None, error: dict, request: dict` | 無視されます |
| [`on_session_start`](/hermes/docs/user-guide/features/hooks/#on_session_start) | 新しいセッションが作られたとき（最初の往復のみ） | `session_id: str, model: str, platform: str` | 無視されます |
| [`on_session_end`](/hermes/docs/user-guide/features/hooks/#on_session_end) | `run_conversation` の呼び出しの終わりごと、および CLI の終了時 | `session_id: str, completed: bool, interrupted: bool, model: str, platform: str` | 無視されます |
| [`on_session_finalize`](/hermes/docs/user-guide/features/hooks/#on_session_finalize) | CLI やゲートウェイが動いているセッションを片付けるとき | `session_id: str \| None, platform: str` | 無視されます |
| [`on_session_reset`](/hermes/docs/user-guide/features/hooks/#on_session_reset) | ゲートウェイが新しいセッションキーに切り替えたとき（`/new`、`/reset`） | `session_id: str, platform: str` | 無視されます |
| [`gateway_platform_event`](/hermes/docs/user-guide/features/hooks/#gateway_platform_event) | 許可されたプラットフォーム固有のできごとが、ゲートウェイの境界で整えられたとき（いまのところ Telegram のリアクション） | `platform: str, event_type: str, payload: dict` | 無視されます |
| `kanban_task_claimed` | かんばんのタスクが引き受けられたとき（振り分けのプロセス、作業側が起動する前） | `task_id: str, board: str \| None, assignee: str \| None, run_id: int \| None, profile_name: str` | 無視されます |
| `kanban_task_completed` | かんばんのタスクが完了したとき（作業側のプロセス） | `task_id, board, assignee, run_id, profile_name, summary: str \| None` | 無視されます |
| `kanban_task_blocked` | かんばんのタスクが行き詰まったとき（作業側のプロセス） | `task_id, board, assignee, run_id, profile_name, reason: str \| None` | 無視されます |

ほとんどのフックは、投げっぱなしの観測役で、戻り値は無視されます。例外は2つで、会話に文脈を差し込める `pre_llm_call` と、止める・承認へ回すという指示を返せる `pre_tool_call` です。

どのコールバックも、これから足されるものに備えて `**kwargs` を受け取るようにしてください。フックのコールバックが落ちても、それは記録されて飛ばされるだけです。ほかのフックもエージェントも、いつもどおり動き続けます。

かんばんのライフサイクルのフックは、盤のデータベースの変更が確定した**あと**に発火します。ですからコールバックは必ず確定した状態を見ますし、SQLite の書き込みロックを握ってしまうこともありません。かんばんの作業側は `hermes -p <profile> chat -q` という別のサブプロセスとして動くため、`kanban_task_claimed` は**振り分け**のプロセスで、`kanban_task_completed` と `kanban_task_blocked` は**作業側**のプロセスで発火します。すべての移り変わりを一箇所で見たいなら振り分け側に、タスクごとのセッション内の文脈が欲しいなら作業側にフックを付けてください。

**API 要求のフック**は、生のプロバイダー要求を見るための観測役で、1往復ごとの `pre_llm_call` と `post_llm_call` の組より1段下にあります。ツールを呼ぶ往復では API の要求が何度か走り、これらのフックはその一つひとつを挟むように発火します。存在する理由は、観測のためのプラグイン（追跡、費用の集計、遅延の可視化）です。`request` と `response` のキーワード引数は、プロバイダーのペイロードを整えて大きさを抑えた JSON の写しで（機微なキーは伏せられ、長い文字列は切り詰められ、SDK の対象はふつうの形に直されます）、`usage` はトークン数をまとめた素の辞書です。どのペイロードにも `turn_id`、`api_request_id`、`task_id`、`session_id`、`api_call_count` という対応づけのための項目が入るので、プラグインは要求とツール呼び出しと往復を結び合わせられます。`api_request_error` はプロバイダーの呼び出しが例外を投げたときに発火し、`status_code`、`retry_count` と `max_retries`、`retryable`、`reason`、そして `type` と `message` を持つ `error` の辞書が加わります。

### `pre_llm_call` による文脈の差し込み {#prellmcall-context-injection}

戻り値に意味があるのは、このフックだけです。`pre_llm_call` のコールバックが `"context"` というキーを持つ辞書（または素の文字列）を返すと、Hermes はその文章を**その往復の利用者のメッセージ**に差し込みます。メモリのプラグイン、RAG との連携、ガードレール、そのほかモデルに追加の文脈を渡したいプラグインは、この仕組みを使います。

#### 戻り値の形 {#return-format}

```python
# Dict with context key
return {"context": "Recalled memories:\n- User prefers dark mode\n- Last project: hermes-agent"}

# Plain string (equivalent to the dict form above)
return "Recalled memories:\n- User prefers dark mode"

# Return None or don't return → no injection (observer-only)
return None
```

None でも空でもなく、`"context"` のキーを持つ戻り値（または空でない素の文字列）は集められ、その往復の利用者のメッセージに一緒に付け足されます。

#### 大きすぎる文脈の逃がし {#oversized-context-spill}

1つのフックあたりの文脈は、既定で `10,000` 文字までです。それを超えた分は `$HERMES_HOME/hook_outputs/<session_id>/<uuid>.txt` に書き出され、先頭と末尾の抜粋と保存先のパスに置き換えられます。モデルは、どうしても必要なら `read_file` や `terminal` で全体を読めます。これによって、暴走したプラグインがその後の往復のプロンプトを膨らませ、プロンプトキャッシュの接頭辞を壊してしまうのを防げます。`config.yaml` で調整できます。

```yaml
hooks:
  output_spill:
    enabled: true          # default: true
    max_chars: 10000       # default; set higher to opt out of spilling
    preview_head: 500      # chars shown at the top of the preview
    preview_tail: 500      # chars shown at the bottom of the preview
    # directory: null      # default: $HERMES_HOME/hook_outputs
```

#### 差し込みのしくみ {#how-injection-works}

差し込まれる文脈は、システムプロンプトではなく**利用者のメッセージ**に付け足されます。これは意図した設計です。

- **プロンプトキャッシュを守るため** — システムプロンプトは往復をまたいで同一のままです。Anthropic と OpenRouter はシステムプロンプトの接頭辞をキャッシュするので、そこを動かさないことで、何往復もする会話の入力トークンを75%以上節約できます。プラグインがシステムプロンプトを書き換えていたら、毎回キャッシュを外すことになります。
- **その場限りであること** — 差し込みは API を呼ぶ瞬間にだけ起こります。会話の履歴にある元の利用者のメッセージは書き換えられませんし、セッションのデータベースにも何も残りません。
- **システムプロンプトは Hermes の領分であること** — そこにはモデルごとの案内、ツールの使い方の決まり、人格の指示、キャッシュされたスキルの内容が入っています。プラグインが差し出すのは利用者の入力に添える文脈であって、エージェントの中核の指示を書き換えることではありません。

#### 例: メモリを思い出すプラグイン {#example-memory-recall-plugin}

```python
"""Memory plugin — recalls relevant context from a vector store."""

MEMORY_API = "https://your-memory-api.example.com"

def recall_context(session_id, user_message, is_first_turn, **kwargs):
    """Called before each LLM turn. Returns recalled memories."""
    try:
        resp = httpx.post(f"{MEMORY_API}/recall", json={
            "session_id": session_id,
            "query": user_message,
        }, timeout=3)
        memories = resp.json().get("results", [])
        if not memories:
            return None  # nothing to inject

        text = "Recalled context from previous sessions:\n"
        text += "\n".join(f"- {m['text']}" for m in memories)
        return {"context": text}
    except Exception:
        return None  # fail silently, don't break the agent

def register(ctx):
    ctx.register_hook("pre_llm_call", recall_context)
```

#### 例: ガードレールのプラグイン {#example-guardrails-plugin}

```python
"""Guardrails plugin — enforces content policies."""

POLICY = """You MUST follow these content policies for this session:
- Never generate code that accesses the filesystem outside the working directory
- Always warn before executing destructive operations
- Refuse requests involving personal data extraction"""

def inject_guardrails(**kwargs):
    """Injects policy text into every turn."""
    return {"context": POLICY}

def register(ctx):
    ctx.register_hook("pre_llm_call", inject_guardrails)
```

#### 例: 観測だけのフック（差し込みなし） {#example-observer-only-hook-no-injection}

```python
"""Analytics plugin — tracks turn metadata without injecting context."""

logger = logging.getLogger(__name__)

def log_turn(session_id, user_message, model, is_first_turn, **kwargs):
    """Fires before each LLM call. Returns None — no context injected."""
    logger.info("Turn: session=%s model=%s first=%s msg_len=%d",
                session_id, model, is_first_turn, len(user_message or ""))
    # No return → no injection

def register(ctx):
    ctx.register_hook("pre_llm_call", log_turn)
```

#### 複数のプラグインが文脈を返したとき {#multiple-plugins-returning-context}

複数のプラグインが `pre_llm_call` から文脈を返した場合、それらは空行をはさんでつなげられ、まとめて利用者のメッセージに付け足されます。順番はプラグインが見つかった順（プラグインのディレクトリ名の順）に従います。

### ミドルウェア: 起きることそのものを変える {#middleware-change-what-happens}

フックはエージェントのループを観測します（上に挙げた、いくつかの決まった舵取りの形を除いて）。**ミドルウェアは起きることそのものを変えます**。要求のミドルウェアは、下流の誰かが見る前に実際のペイロードを書き換え、実行のミドルウェアは呼び出し自体を包み込みます。登録は同じ `register(ctx)` から行います。

```python
def cap_find_output(tool_name, args, **kwargs):
    """Rewrite terminal find commands to cap their output."""
    command = args.get("command", "")
    if tool_name == "terminal" and command.startswith("find "):
        return {
            "args": {**args, "command": command + " | head -100"},
            "source": "my-plugin",
            "reason": "cap find output",
        }
    return None  # leave the call unchanged

def register(ctx):
    ctx.register_middleware("tool_request", cap_find_output)
```

正式な種類の一覧は `hermes_cli/middleware.py` の `VALID_MIDDLEWARE` にあります。

| 種類 | 受け取るもの | 戻り値の約束 |
|------|----------|-----------------|
| `tool_request` | `tool_name`、`args`、`original_args`、文脈のキーワード引数 | `{"args": {...}}` を返すと、フック・ガードレール・承認・実行が見る前の実際のツールの引数を差し替えます。`None` を返せばその呼び出しはそのままです。 |
| `llm_request` | `request`、`original_request`、文脈のキーワード引数 | `{"request": {...}}` を返すと、Hermes が送る前の実際のプロバイダー向け引数を差し替えます。 |
| `tool_execution` | ペイロードに加えて `next_call` | ツールの実行を包みます。`next_call(payload)` をちょうど1回呼んで下流の連なりを走らせ（呼ばずに打ち切ることもできます）、その結果を返します。 |
| `llm_execution` | ペイロードに加えて `next_call` | 同じ形で、プロバイダーの呼び出しを包みます。 |

**実際に効いてくる決まりごと:**

- 要求のミドルウェアは数珠つなぎになります。各コールバックは、前のコールバックが書き換えたあとのペイロードを見ますが、`original_args` と `original_request` には常にミドルウェアを通る前の写しが入っています。ペイロードはコールバックのあいだで複製されるので、遠慮なく書き換えてかまいません。
- 返す辞書には `source`、`reason`、`name` の文字列を入れられます。それらはミドルウェアの経過に残り、下流の観測フックは `middleware_trace` というキーワード引数として受け取ります。
- 実行のミドルウェアの `next_call` は**1回きり**です。2回呼ぶと例外になります。プロバイダーやツールをもう一度走らせてしまうからです。
- 例外を投げたミドルウェアのコールバックは、記録されて飛ばされ、連なりは続きます。`next_call` のあとに下流で起きた失敗は、そのまま伝わります。ミドルウェアが土台の実行経路を壊すことはありません。
- ミドルウェアのペイロードには、観測用の項目とならんで `middleware_schema_version`（`hermes.middleware.v1`）が入ります。
- 知らない種類は、失敗ではなく警告つきで登録されます。新しい Hermes に向けて書かれたプラグインでも、古い Hermes で読み込めるようにするためです。

### CLI のコマンドを登録する {#register-cli-commands}

プラグインは、自分の `hermes <plugin>` というサブコマンドの枝を足せます。

```python
def _my_command(args):
    """Handler for hermes my-plugin <subcommand>."""
    sub = getattr(args, "my_command", None)
    if sub == "status":
        print("All good!")
    elif sub == "config":
        print("Current config: ...")
    else:
        print("Usage: hermes my-plugin <status|config>")

def _setup_argparse(subparser):
    """Build the argparse tree for hermes my-plugin."""
    subs = subparser.add_subparsers(dest="my_command")
    subs.add_parser("status", help="Show plugin status")
    subs.add_parser("config", help="Show plugin config")
    subparser.set_defaults(func=_my_command)

def register(ctx):
    ctx.register_tool(...)
    ctx.register_cli_command(
        name="my-plugin",
        help="Manage my plugin",
        setup_fn=_setup_argparse,
        handler_fn=_my_command,
    )
```

登録すると、利用者は `hermes my-plugin status` や `hermes my-plugin config` などを実行できます。

**メモリプロバイダーのプラグイン**は、代わりに決めごとに沿ったやり方を使います。プラグインの `cli.py` に `register_cli(subparser)` という関数を足すだけです。メモリのプラグインを探す仕組みが自動で見つけるので、`ctx.register_cli_command()` を呼ぶ必要はありません。詳しくは [メモリプロバイダーのプラグインの手引き](/hermes/docs/developer-guide/memory-provider-plugin/#adding-cli-commands) を参照してください。

**動いているプロバイダーだけに出す:** メモリのプラグインの CLI コマンドは、そのプロバイダーが設定の `memory.provider` として選ばれているときにだけ現れます。利用者がそのプロバイダーを設定していなければ、ヘルプの表示がコマンドで散らかることはありません。

### スラッシュコマンドを登録する {#register-slash-commands}

プラグインは、セッション中のスラッシュコマンド——会話の最中に利用者が打ち込むコマンド（`/lcm status` や `/ping` のようなもの）——を登録できます。これは CLI でもゲートウェイ（Telegram、Discord など）でも動きます。

```python
def _handle_status(raw_args: str) -> str:
    """Handler for /mystatus — called with everything after the command name."""
    if raw_args.strip() == "help":
        return "Usage: /mystatus [help|check]"
    return "Plugin status: all systems nominal"

def register(ctx):
    ctx.register_command(
        "mystatus",
        handler=_handle_status,
        description="Show plugin status",
    )
```

登録すると、利用者はどのセッションでも `/mystatus` と打てます。このコマンドは入力補完、`/help` の出力、Telegram のボットのメニューに現れます。

**引数の形:** `ctx.register_command(name: str, handler: Callable, description: str = "", args_hint: str = "")`

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `name` | `str` | 先頭のスラッシュを除いたコマンド名（たとえば `"lcm"`、`"mystatus"`） |
| `handler` | `Callable[[str], str \| None]` | 引数の文字列をそのまま受け取って呼ばれます。`async` でもかまいません。 |
| `description` | `str` | `/help`、入力補完、Telegram のボットのメニューに表示されます |

**`register_cli_command()` との違い:**

| | `register_command()` | `register_cli_command()` |
|---|---|---|
| 呼び出し方 | セッション中に `/name` | 端末で `hermes name` |
| 使える場所 | CLI のセッション、Telegram、Discord など | 端末だけ |
| 処理が受け取るもの | 引数の文字列そのまま | argparse の `Namespace` |
| 向いている用途 | 状態の確認、診断、ちょっとした操作 | 込み入ったサブコマンドの枝、設定の案内役 |

**名前の衝突を防ぐしくみ:** 組み込みのコマンド（`help`、`model`、`new` など）とぶつかる名前を登録しようとすると、その登録は黙って退けられ、警告が記録されます。組み込みのコマンドが常に優先されます。

**非同期の処理:** ゲートウェイの振り分けは非同期の処理を自動で見分けて待つので、同期・非同期どちらの関数でもかまいません。

```python
async def _handle_check(raw_args: str) -> str:
    result = await some_async_operation()
    return f"Check result: {result}"

def register(ctx):
    ctx.register_command("check", handler=_handle_check, description="Run async check")
```

### スラッシュコマンドからツールを呼び出す {#dispatch-tools-from-slash-commands}

ツールを組み合わせたいスラッシュコマンドの処理（`delegate_task` で下請けのエージェントを立てる、`file_edit` を呼ぶ、など）では、内部の仕組みに手を伸ばすのではなく `ctx.dispatch_tool()` を使ってください。親エージェントの文脈（作業場所の手がかり、進行表示、モデルの引き継ぎ）が自動でつながります。

```python
def register(ctx):
    def _handle_deliver(raw_args: str):
        result = ctx.dispatch_tool(
            "delegate_task",
            {
                "goal": raw_args,
                "toolsets": ["terminal", "file", "web"],
            },
        )
        return result

    ctx.register_command(
        "deliver",
        handler=_handle_deliver,
        description="Delegate a goal to a subagent",
    )
```

**引数の形:** `ctx.dispatch_tool(name: str, args: dict, *, parent_agent=None) -> str`

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `name` | `str` | ツールの登録簿に登録されている名前（たとえば `"delegate_task"`、`"file_edit"`） |
| `args` | `dict` | ツールの引数。モデルが送るのと同じ形です |
| `parent_agent` | `Agent \| None` | 省略可能な上書き。省くと、いま動いている CLI のエージェントから解決されます（ゲートウェイでは穏やかに機能を落とします） |

**実行時の振る舞い:**

- **CLI のとき:** `parent_agent` は動いている CLI のエージェントから解決されるので、作業場所の手がかり、進行表示、モデルの選択が期待どおり引き継がれます。
- **ゲートウェイのとき:** CLI のエージェントが無いため、ツールは穏やかに機能を落とします。作業場所は設定された端末の作業ディレクトリから読まれ、進行表示は出ません。
- **明示的な上書き:** 呼び出し側が `parent_agent=` を明示した場合は、それが尊重され、上書きされることはありません。

これが、プラグインのコマンドからツールを呼ぶための、公開された安定した入口です。プラグインが `ctx._cli_ref.agent` のような内部の状態に手を伸ばすべきではありません。

### フックの中から動く（プロファイルとツール） {#act-from-inside-a-hook-profile-tools}

`ctx._cli_ref` に値が入るのは、**対話的な CLI** のセッションのときだけです。ゲートウェイ、対話でない `hermes chat -q` の実行、そして**かんばんが起動した作業側のセッション**では `None` になります。つまり `_cli_ref` を通そうとするプラグインの処理は、まさにそうした場面で黙って何もしません。フックが実際に必要とすることは、次の2つの安定した、セッションの種類に依らない API で足ります。

- **`ctx.profile_name`** — 動いているプロファイルの名前（たとえば `"default"`、かんばんの作業側なら担当のプロファイル）。`HERMES_HOME` から導かれるので、`_cli_ref` に頼らずどこでも使えます。
- **`ctx.dispatch_tool(name, args)`** — 登録されているどのツールでも呼び出せます（組み込みでもプラグインのものでも）。`kanban_*` のツール、`delegate_task`、`terminal`、`read_file` なども含まれます。フックがどのプロセスで発火したかによらず、フックのコールバックから使えます。

この2つを合わせると、かんばんのライフサイクルのフックが移り変わりを見て、内部の仕組みに触れずに盤へ働きかけられます。

```python
def register(ctx):
    def on_blocked(*, task_id, reason=None, **kw):
        # Runs in the worker process; ctx._cli_ref is None here.
        ctx.dispatch_tool("kanban_comment", {
            "task_id": task_id,
            "comment": f"[{ctx.profile_name}] auto-noted block: {reason}",
        })
    ctx.register_hook("kanban_task_blocked", on_blocked)
```

`hermes <subcommand>` をまるごと走らせたい場合（たとえば `hermes kanban show`）は、`ctx.dispatch_tool("terminal", {"command": "hermes kanban show ..."})` のように `terminal` ツール経由でシェルに出してください。画面を持たない作業側のセッションには、プロセス内でスラッシュコマンドへ橋渡しする仕組みはありませんし、フックから Hermes を動かす正しいやり方はツールです。

### Slack の Block Kit のボタンを扱う {#handle-slack-block-kit-button-clicks}

対話的な部品（ボタン、あふれ分のメニュー、日付選択など）を持つ Block Kit のメッセージを投稿するプラグインは、そのクリックの処理を Slack のアダプターへ直接登録できます。`slack_bolt.AsyncApp` に手を入れる必要はありません。

```python
def register(ctx):
    async def _on_approve(ack, body, action):
        # ack within 3 seconds — slack_bolt requirement.
        await ack()
        # body["channel"]["id"], body["user"]["id"], body["message"]["ts"]
        # action["action_id"], action["value"]
        sweep_id = (action.get("value") or "").split("|", 1)[-1]
        # ...do the deterministic work, then post a follow-up.

    ctx.register_slack_action_handler("inbox_sweep_approve", _on_approve)
```

**引数の形:** `ctx.register_slack_action_handler(action_id, callback) -> None`

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `action_id` | `str \| re.Pattern \| dict` | `slack_bolt.App.action()` が受け取れるものなら何でも。そのままの `action_id`、複数の id に合う正規表現、`{"action_id": "...", "block_id": "..."}` のような条件の辞書です |
| `callback` | async callable | slack_bolt の作法どおり `(ack, body, action)` を受け取ります |

**実行時の振る舞い:**

- 処理はプラグインの読み込み時に待ち行列へ入り、Slack のプラットフォームがつながったときにアダプターの `slack_bolt.AsyncApp` へ組み込まれます。
- どのコールバックも守りを固めて包まれています。処理が例外を投げた場合、ゲートウェイはそのエラーを記録し、Slack が再送をやめるようできるだけクリックへの応答を返します。
- slack_bolt の通常の決まりが当てはまります。3秒以内に `await ack()` を返し、それから時間のかかる作業をします。
- 複数のワークスペースで動かしている場合、この処理はつながっているどのワークスペースのクリックにも発火します。範囲を分けたいなら `body["team"]["id"]` を使ってください。

これが、プラグインが Slack の対話に加わるための公開されたやり方です。古いプラグインは `SlackAdapter.connect` に手を入れているかもしれませんが、こちらの API を選んでください。

:::tip
この手引きが扱うのは**一般的なプラグイン**（ツール、フック、スラッシュコマンド、CLI コマンド）です。以下の節では、専用のプラグインの種類ごとに書き方の骨組みを示します。項目の詳しい説明と例は、それぞれの手引きへのリンクをたどってください。
:::

## 専用のプラグインの種類 {#specialized-plugin-types}

Hermes には、一般的なプラグインのほかに5種類の専用プラグインがあります。それぞれ `plugins/<category>/<name>/`（同梱）または `~/.hermes/plugins/<category>/<name>/`（利用者）のディレクトリとして配ります。取り決めは分類ごとに違うので、必要なものを選んでから、その手引きを読んでください。

### モデルプロバイダーのプラグイン——LLM のバックエンドを足す {#model-provider-plugins-add-an-llm-backend}

`plugins/model-providers/<name>/` にプロファイルを置きます。

```python
# plugins/model-providers/acme/__init__.py
from providers import register_provider
from providers.base import ProviderProfile

register_provider(ProviderProfile(
    name="acme",
    aliases=("acme-inference",),
    display_name="Acme Inference",
    env_vars=("ACME_API_KEY", "ACME_BASE_URL"),
    base_url="https://api.acme.example.com/v1",
    auth_type="api_key",
    default_aux_model="acme-small-fast",
    fallback_models=("acme-large-v3", "acme-medium-v3"),
))
```

```yaml
# plugins/model-providers/acme/plugin.yaml
name: acme-provider
kind: model-provider
version: 1.0.0
description: Acme Inference — OpenAI-compatible direct API
```

`get_provider_profile()` や `list_providers()` が最初に呼ばれたときに、必要になってから見つけられます。`auth.py`、`config.py`、`doctor.py`、`models.py`、`runtime_provider.py`、そして chat_completions の通信部分が自動でつながります。利用者のプラグインは、同名の同梱プラグインより優先されます。

**詳しい手引き:** [モデルプロバイダーのプラグイン](/hermes/docs/developer-guide/model-provider-plugin/) — 項目の一覧、差し替えられるフック（`prepare_messages`、`build_extra_body`、`build_api_kwargs_extras`、`fetch_models`）、api_mode の選び方、認証の種類、動作確認。

### プラットフォームのプラグイン——ゲートウェイのチャンネルを足す {#platform-plugins-add-a-gateway-channel}

`plugins/platforms/<name>/` にアダプターを置きます。

```python
# plugins/platforms/myplatform/adapter.py
from gateway.platforms.base import BasePlatformAdapter

class MyPlatformAdapter(BasePlatformAdapter):
    async def connect(self): ...
    async def send(self, chat_id, text): ...
    async def disconnect(self): ...

def check_requirements():
    import os
    return bool(os.environ.get("MYPLATFORM_TOKEN"))

def _env_enablement():
    import os
    tok = os.getenv("MYPLATFORM_TOKEN", "").strip()
    if not tok:
        return None
    return {"token": tok}

def register(ctx):
    ctx.register_platform(
        name="myplatform",
        label="MyPlatform",
        adapter_factory=lambda cfg: MyPlatformAdapter(cfg),
        check_fn=check_requirements,
        required_env=["MYPLATFORM_TOKEN"],
        # Auto-populate PlatformConfig.extra from env so env-only setups
        # show up in `hermes gateway status` without SDK instantiation.
        env_enablement_fn=_env_enablement,
        # Opt in to cron delivery: `deliver=myplatform` routes to this var.
        cron_deliver_env_var="MYPLATFORM_HOME_CHANNEL",
        emoji="💬",
        platform_hint="You are chatting via MyPlatform. Keep responses concise.",
    )
```

```yaml
# plugins/platforms/myplatform/plugin.yaml
name: myplatform-platform
label: MyPlatform
kind: platform
version: 1.0.0
description: MyPlatform gateway adapter
requires_env:
  - name: MYPLATFORM_TOKEN
    description: "Bot token from the MyPlatform console"
    password: true
optional_env:
  - name: MYPLATFORM_HOME_CHANNEL
    description: "Default channel for cron delivery"
    password: false
```

**詳しい手引き:** [プラットフォームのアダプターを足す](/hermes/docs/developer-guide/adding-platform-adapters/) — `BasePlatformAdapter` の取り決めの全体、メッセージの振り分け、認証による制御、設定の案内役との連携。標準ライブラリだけで動く実例として `plugins/platforms/irc/` を見てください。

### メモリプロバイダーのプラグイン——セッションをまたぐ知識のバックエンドを足す {#memory-provider-plugins-add-a-cross-session-knowledge-backend}

`plugins/memory/<name>/` に `MemoryProvider` の実装を置きます。

```python
# plugins/memory/my-memory/__init__.py
from agent.memory_provider import MemoryProvider

class MyMemoryProvider(MemoryProvider):
    @property
    def name(self) -> str:
        return "my-memory"

    def is_available(self) -> bool:
        import os
        return bool(os.environ.get("MY_MEMORY_API_KEY"))

    def initialize(self, session_id: str, **kwargs) -> None:
        self._session_id = session_id

    def sync_turn(self, user_content, assistant_content, *,
                  session_id="", messages=None) -> None:
        ...

    def prefetch(self, query, *, session_id="") -> str:
        ...

    def get_tool_schemas(self) -> list[dict]:
        return []   # required @abstractmethod — see full guide

def register(ctx):
    ctx.register_memory_provider(MyMemoryProvider())
```

メモリのプロバイダーは1つだけ選ぶ方式で、同時に動くのは1つです。`config.yaml` の `memory.provider` で選びます。

**詳しい手引き:** [メモリプロバイダーのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/) — `MemoryProvider` の抽象基底クラスの全体、スレッドについての取り決め、プロファイルの分離、`cli.py` による CLI コマンドの登録。

### コンテキストエンジンのプラグイン——圧縮の仕組みを差し替える {#context-engine-plugins-replace-the-context-compressor}

```python
# plugins/context_engine/my-engine/__init__.py
from agent.context_engine import ContextEngine

class MyContextEngine(ContextEngine):
    @property
    def name(self) -> str:
        return "my-engine"

    def update_from_response(self, usage) -> None: ...
    def should_compress(self, prompt_tokens: int = None) -> bool: ...
    def compress(self, messages, current_tokens=None, focus_topic=None,
                 force=False, memory_context="") -> list: ...

def register(ctx):
    ctx.register_context_engine(MyContextEngine())
```

コンテキストエンジンも1つだけ選ぶ方式で、`config.yaml` の `context.engine` で選びます。

**詳しい手引き:** [コンテキストエンジンのプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)。

### 画像生成のバックエンド {#image-generation-backends}

`plugins/image_gen/<name>/` にプロバイダーを置きます。

```python
# plugins/image_gen/my-imggen/__init__.py
from agent.image_gen_provider import ImageGenProvider

class MyImageGenProvider(ImageGenProvider):
    @property
    def name(self) -> str:
        return "my-imggen"

    def is_available(self) -> bool: ...
    def generate(self, prompt: str, aspect_ratio="landscape", **kwargs) -> dict:
        # returns success_response(...) / error_response(...)
        ...

def register(ctx):
    ctx.register_image_gen_provider(MyImageGenProvider())
```

```yaml
# plugins/image_gen/my-imggen/plugin.yaml
name: my-imggen
kind: backend
version: 1.0.0
description: Custom image generation backend
```

**詳しい手引き:** [画像生成プロバイダーのプラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/) — `ImageGenProvider` の抽象基底クラスの全体、`list_models()` と `get_setup_schema()` のメタデータ、`success_response()` と `error_response()` の補助、base64 と URL の出力、利用者による差し替え、pip での配布。

**参考になる実装例:** `plugins/image_gen/openai/`（OpenAI SDK 経由の DALL-E / GPT-Image）、`plugins/image_gen/openai-codex/`、`plugins/image_gen/xai/`（Grok の画像生成）。

## Python 以外の拡張の面 {#non-python-extension-surfaces}

Hermes は、そもそも Python のプラグインではない拡張も受け付けます。それらは [差し替えられる仕組みの表](/hermes/docs/user-guide/features/plugins/#pluggable-interfaces--where-to-go-for-each) に載っていますが、以下の節でそれぞれの書き方を手短に示します。

### MCP サーバー——外部のツールを登録する {#mcp-servers-register-external-tools}

Model Context Protocol（MCP）のサーバーは、Python のプラグインを書かずに自分のツールを Hermes へ登録します。`~/.hermes/config.yaml` に書きます。

```yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"]
    timeout: 120

  linear:
    url: "https://mcp.linear.app/sse"
    auth:
      type: "oauth"
```

Hermes は起動時に各サーバーへつなぎ、そのツールの一覧を取り、組み込みのツールと並べて登録します。LLM から見れば、ほかのツールとまったく同じです。**詳しい手引き:** [MCP](/hermes/docs/user-guide/features/mcp/)。

### ゲートウェイのイベントフック——ライフサイクルのできごとで発火する {#gateway-event-hooks-fire-on-lifecycle-events}

`~/.hermes/hooks/<name>/` にマニフェストと処理を置きます。

```yaml
# ~/.hermes/hooks/long-task-alert/HOOK.yaml
name: long-task-alert
description: Send a push notification when a long task finishes
events:
  - agent:end
```

```python
# ~/.hermes/hooks/long-task-alert/handler.py
async def handle(event_type: str, context: dict) -> None:
    if context.get("duration_seconds", 0) > 120:
        # send notification …
        pass
```

できごとには `gateway:startup`、`session:start`、`session:end`、`session:reset`、`agent:start`、`agent:step`、`agent:end`、そしてまとめて受ける `command:*` があります。フックの中のエラーは捕まえて記録されるだけで、本筋の処理を止めることはありません。

**詳しい手引き:** [ゲートウェイのイベントフック](/hermes/docs/user-guide/features/hooks/#gateway-event-hooks)。

### シェルフック——ツールの呼び出しでシェルコマンドを走らせる {#shell-hooks-run-a-shell-command-on-tool-calls}

ツールが動いたときにスクリプトを走らせたいだけなら（通知、監査のログ、デスクトップの警告、自動整形）、`config.yaml` のシェルフックを使ってください。Python は要りません。

```yaml
hooks:
  - event: post_tool_call
    command: "notify-send 'Tool ran: {tool_name}'"
    when:
      tools: [terminal, patch, write_file]
```

Python のプラグインのフックと同じできごと（`pre_tool_call`、`post_tool_call`、`pre_llm_call`、`post_llm_call`、`on_session_start`、`on_session_end`、`pre_gateway_dispatch`）に対応し、さらに `pre_tool_call` で止める判断を返すための構造化された JSON の出力にも対応します。

**詳しい手引き:** [シェルフック](/hermes/docs/user-guide/features/hooks/#shell-hooks)。

### スキルの取得元——独自のスキルの登録簿を足す {#skill-sources-add-a-custom-skill-registry}

スキルを集めた GitHub リポジトリを持っている場合（あるいは組み込みの取得元の外にある共有の索引から取りたい場合）は、**tap** として追加します。

```bash
hermes skills tap add myorg/skills-repo
hermes skills search my-workflow --source myorg/skills-repo
hermes skills install myorg/skills-repo/my-workflow
```

自分の tap を公開するのは、`skills/<skill-name>/SKILL.md` というディレクトリを置いた GitHub リポジトリを作るだけです。サーバーも登録簿への申し込みも要りません。

**詳しい手引き:** [Skills Hub](/hermes/docs/user-guide/features/skills/#skills-hub) · [独自の tap を公開する](/hermes/docs/user-guide/features/skills/#publishing-a-custom-skill-tap)（リポジトリの構成、最小限の例、既定でない置き場所、信頼の水準）。

### コマンドの雛形による TTS と STT {#tts-stt-via-command-templates}

音声や文章を読み書きする CLI なら、`config.yaml` を通じて何でもつなげられます。Python のコードは要りません。

```yaml
tts:
  provider: voxcpm
  providers:
    voxcpm:
      type: command
      command: "voxcpm --ref ~/voice.wav --text-file {input_path} --out {output_path}"
      output_format: mp3
      voice_compatible: true
```

STT では、`HERMES_LOCAL_STT_COMMAND` に argv 形式の雛形を指定します。これは暗黙のシェル解釈なしで実行されるので、信頼できるローカルのコマンドがシェルの書き方を必要とするなら、`sh -c`、`cmd /c`、PowerShell で自分で包んでください。使える差し込み文字は、TTS が `{input_path}`、`{output_path}`、`{format}`、`{voice}`、`{model}`、`{speed}`、STT が `{input_path}`、`{output_dir}`、`{language}`、`{model}` です。パスを扱う CLI であれば、それだけで自動的にプラグインになります。

**詳しい手引き:** [TTS の独自コマンドプロバイダー](/hermes/docs/user-guide/features/tts/#custom-command-providers) · [STT](/hermes/docs/user-guide/features/tts/#voice-message-transcription-stt)。

## pip で配布する {#distribute-via-pip}

プラグインを広く共有するには、自分の Python パッケージにエントリーポイントを足します。

```toml
# pyproject.toml
[project.entry-points."hermes_agent.plugins"]
my-plugin = "my_plugin_package"
```

```bash
pip install hermes-plugin-calculator
# Plugin auto-discovered on next hermes startup
```

## NixOS 向けに配布する {#distribute-for-nixos}

:::warning Nix はもう明示的な対応の対象ではありません
Nix と NixOS は、明示的に対応する導入経路ではなくなりました（できる範囲での対応のみです）。[Nix の設定](/hermes/docs/getting-started/nix-setup/) を参照してください。この節は、すでに NixOS で動かしている方のために残しています。
:::

エントリーポイントを持つ `pyproject.toml` を用意しておけば、NixOS の利用者は宣言的にプラグインを導入できます。

**エントリーポイント型のプラグイン**（配布にはこちらがおすすめです）:
```nix
# User's configuration.nix
services.hermes-agent.extraPythonPackages = [
  (pkgs.python312Packages.buildPythonPackage {
    pname = "my-plugin";
    version = "1.0.0";
    src = pkgs.fetchFromGitHub {
      owner = "you";
      repo = "hermes-my-plugin";
      rev = "v1.0.0";
      hash = "sha256-...";  # nix-prefetch-url --unpack
    };
    format = "pyproject";
    build-system = [ pkgs.python312Packages.setuptools ];
  })
];
```

**ディレクトリ型のプラグイン**（`pyproject.toml` は要りません）:
```nix
services.hermes-agent.extraPlugins = [
  (pkgs.fetchFromGitHub {
    owner = "you";
    repo = "hermes-my-plugin";
    rev = "v1.0.0";
    hash = "sha256-...";
  })
];
```

オーバーレイの使い方や衝突の検査まで含めた説明は、[Nix の設定の手引き](/hermes/docs/getting-started/nix-setup/#plugins) を参照してください。

## よくある間違い {#common-mistakes}

**処理が JSON の文字列を返していない:**
```python
# Wrong — returns a dict
def handler(args, **kwargs):
    return {"result": 42}

# Right — returns a JSON string
def handler(args, **kwargs):
    return json.dumps({"result": 42})
```

**処理の引数に `**kwargs` が無い:**
```python
# Wrong — will break if Hermes passes extra context
def handler(args):
    ...

# Right
def handler(args, **kwargs):
    ...
```

**処理が例外を投げている:**
```python
# Wrong — exception propagates, tool call fails
def handler(args, **kwargs):
    result = 1 / int(args["value"])  # ZeroDivisionError!
    return json.dumps({"result": result})

# Right — catch and return error JSON
def handler(args, **kwargs):
    try:
        result = 1 / int(args.get("value", 0))
        return json.dumps({"result": result})
    except Exception as e:
        return json.dumps({"error": str(e)})
```

**スキーマの説明が漠然としている:**
```python
# Bad — model doesn't know when to use it
"description": "Does stuff"

# Good — model knows exactly when and how
"description": "Evaluate a mathematical expression. Use for arithmetic, trig, logarithms. Supports: +, -, *, /, **, sqrt, sin, cos, log, pi, e."
```
