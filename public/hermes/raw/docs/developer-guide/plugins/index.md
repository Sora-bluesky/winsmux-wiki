---
title: "Hermes のプラグインを作る"
description: "ツール・フック・同梱するデータファイル・スキルを備えた、ひととおり動く Hermes プラグインを一歩ずつ作る手引き"
upstream_path: developer-guide/plugins/index.md
upstream_blob: 0a27acadef75d72d582e94dd9a7532d47c817516
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/plugins
---

# Hermes のプラグインを作る {#build-a-hermes-plugin}

この手引きでは、Hermes のプラグインをゼロからひととおり作っていきます。読み終わるころには、複数のツール・ライフサイクルのフック・同梱したデータファイル・同梱スキルを備えた、実際に動くプラグインができています。プラグインの仕組みが対応しているものは、これで全部です。

:::info どの手引きを読めばいいか迷ったら
Hermes には差し込み口がいくつもあります。Python の `register_*` API を使うものもあれば、設定ファイルで指示するものや、ディレクトリを置くだけのものもあります。まずはこの対応表を見てください。

| 追加したいもの | 読むページ |
|---|---|
| 独自のツール・フック・スラッシュコマンド・スキル・CLI のサブコマンド | **このページ**（プラグインの一般的な差し込み口） |
| **デスクトップアプリ本体** の拡張（ペイン・ページ・ステータスバー・パレット・テーマ） | [Desktop Plugin SDK](/hermes/docs/developer-guide/desktop-plugin-sdk/) |
| **Web ダッシュボード** の拡張（タブ・シェルのスロット・テーマ） | [ダッシュボードを拡張する](/hermes/docs/user-guide/features/extending-the-dashboard/) |
| **LLM / 推論のバックエンド**（新しいプロバイダ） | [モデルプロバイダプラグイン](/hermes/docs/developer-guide/model-provider-plugin/) |
| **ゲートウェイのチャンネル**（Discord / Telegram / IRC / Teams など） | [プラットフォームアダプタを追加する](/hermes/docs/developer-guide/adding-platform-adapters/) |
| **メモリのバックエンド**（Honcho / Mem0 / Supermemory など） | [メモリプロバイダプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/) |
| **コンテキスト圧縮のエンジン** | [コンテキストエンジンプラグイン](/hermes/docs/developer-guide/context-engine-plugin/) |
| **画像生成のバックエンド** | [画像生成プロバイダプラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/) |
| **動画生成のバックエンド** | [動画生成プロバイダプラグイン](/hermes/docs/developer-guide/video-gen-provider-plugin/) |
| **Web 検索・本文抽出のバックエンド** | [Web 検索プロバイダプラグイン](/hermes/docs/developer-guide/web-search-provider-plugin/) |
| **クラウドブラウザのバックエンド**（Browserbase 型の CDP セッションプロバイダ） | [ブラウザプロバイダプラグイン](/hermes/docs/developer-guide/browser-provider-plugin/) |
| **シークレット管理のバックエンド**（Vault / パスワード管理ツール / OS のキーストア） | [シークレットソースプラグイン](/hermes/docs/developer-guide/secret-source-plugin/) |
| **ダッシュボードの OIDC / 認証プロバイダ** | [Web ダッシュボード — 独自のプロバイダ](/hermes/docs/user-guide/features/web-dashboard/#custom-providers) — `ctx.register_dashboard_auth_provider()` |
| **音声合成（TTS）のバックエンド**（Piper・VoxCPM・Kokoro・声の複製など、どんな CLI でも） | [TTS の独自コマンドプロバイダ](/hermes/docs/user-guide/features/tts/#custom-command-providers) — 設定ファイルだけで済み、Python は要りません |
| **音声認識（STT）のバックエンド**（独自の whisper / ASR の CLI） | [音声メッセージの文字起こし](/hermes/docs/user-guide/features/tts/#voice-message-transcription-stt) — `HERMES_LOCAL_STT_COMMAND` に、argv に分解済みのテンプレートを設定します |
| **MCP 経由の外部ツール**（ファイルシステム・GitHub・Linear など、あらゆる MCP サーバー） | [MCP](/hermes/docs/user-guide/features/mcp/) — `config.yaml` に `mcp_servers.<name>` を書きます |
| **ゲートウェイのイベントフック**（起動時・セッションのイベント・コマンドで発火） | [イベントフック](/hermes/docs/user-guide/features/hooks/#gateway-event-hooks) — `HOOK.yaml` と `handler.py` を `~/.hermes/hooks/<name>/` に置きます |
| **シェルフック**（イベントに合わせてシェルコマンドを実行） | [シェルフック](/hermes/docs/user-guide/features/hooks/#shell-hooks) — `config.yaml` の `hooks:` の下に書きます |
| **スキルの追加ソース**（独自の GitHub リポジトリ、非公開のスキル索引） | [スキル](/hermes/docs/user-guide/features/skills/) — `hermes skills tap add <repo>` · [タップを公開する](/hermes/docs/user-guide/features/skills/#publishing-a-custom-skill-tap) |
| **本体側** の正式な推論プロバイダ（プラグインではないもの） | [プロバイダを追加する](/hermes/docs/developer-guide/adding-providers/) |

設定ファイル型（TTS・STT・MCP・シェルフック）やディレクトリ設置型（ゲートウェイのフック）も含め、拡張できる場所をまとめて見たいときは [差し込み口の一覧表](/hermes/docs/user-guide/features/plugins/#pluggable-interfaces--where-to-go-for-each) を見てください。
:::

:::caution 他社製品向けのプラグインは単独で配ります — 本体のツリーには入れません
**他社の製品やプロジェクト** とつなぐプラグイン、つまり監視・メトリクスのバックエンド、ベンダーの SaaS コネクタ、分析ダッシュボード、有料サービスとの連携などは、`NousResearch/hermes-agent` に取り込まず、**独立したプラグインのリポジトリ** として作って配ります。利用者は `~/.hermes/plugins/` に入れるか、pip のエントリポイント経由で導入します。この手引きの内容は、独立したリポジトリからでもそのまま同じように動きます。これは結合度と保守の都合による判断であって（本体の変更は速く、こちらは相手側のバックエンドを持っていません）、品質の線引きではありません。とても良いプラグインでも、置き場所は自分のリポジトリになります。宣伝は Nous Research の Discord の `#plugins-skills-and-skins` チャンネルでどうぞ。方針は [CONTRIBUTING.md](https://github.com/NousResearch/hermes-agent/blob/main/CONTRIBUTING.md) にあります。
:::

## Portable Agent Plugins v1 のパッケージ {#portable-agent-plugins-v1-packages}

Hermes は、Agent Plugins v1.0.0 の形式に沿ったディレクトリ形式のパッケージも、
インストールして読み込めます。これは Hermes がすでに持っている持ち運び可能な
部品に合わせた互換アダプタです。ネイティブの `plugin.yaml` +
`register(ctx)` 型のプラグインを置き換えるものではありません。

```text
my-portable-plugin/
├── plugin.json
├── skills/
│   └── summarize/
│       ├── SKILL.md
│       └── references/
└── mcp.json
```

持ち運び形式のパッケージは、通常の手順でインストールして有効にします。

```bash
hermes plugins install owner/repository --no-enable
hermes plugins list
hermes plugins enable <plugin-name>
```

持ち運び形式のパッケージは、インストールしただけでは無効のままで、自分で有効に
するまで動きません。有効にしたパッケージは、`skills/*/SKILL.md` のディレクトリと、
ルートの `mcp.json` に書かれた stdio の MCP サーバーを、そのまま提供できます。
スキルは読み取り専用で、名前空間が付き、`skills_list` と `skill_view` から
読み込みます。MCP のコマンドは、実行ファイル 1 つと引数のリストに分けて渡され、
シェルを経由することはありません。完全な形のスキル名は `skills_list` で確かめて
ください。持ち運び形式のスキルの名前空間は `agent-plugin-<slug>-<hash>` という
決まった形で、見つかったプラグインのキーから作るため、名前を整えた結果が
ぶつかることはありません。

Hermes は `plugin.json`、Agent Skills のフロントマター、部品の決まった置き場所、
`mcp.json`、解決後のパス、シンボリックリンクの収まりを、すべて手元で検証します。
パッケージの読み込み中に JSON スキーマを取りに行くことはありません。壊れたスキルや
MCP の項目は、その項目の境目で読み飛ばし、問題のない他の部品は読み込みを続けます。
`PLUGIN_ROOT` は解決後のパッケージのルートを指します。`PLUGIN_DATA` は、Hermes が
管理するプロファイル単位の書き込み可能なディレクトリを指します。
持ち運び形式の MCP の `env` に書いた値は、パッケージから見えている形のデータで
あって、シークレットの保管場所ではありません。`mcp.json` に認証情報を置かないで
ください。

いまの持ち運び形式のサブセットは、stdio と Streamable HTTP の MCP の項目に対応して
います。持ち運び形式の `streamable-http` の項目は、Hermes が元から持っている
ネイティブのリモート MCP クライアント（URL 指定の `mcp_servers` 設定を動かしている
のと同じ仕組み）に流し、v1 の境目の規則を守らせます。URL は絶対の http(s) で、
ユーザー情報もフラグメントも含まないこと。素の HTTP は `localhost` とループバックの
ホストにだけ認めること。設定したヘッダーは、オリジンをまたぐリダイレクトの先へは
決して転送しないこと。古い `sse` の項目は、報告したうえで読み飛ばします。Agent
Plugins v1 は、信頼・権限・出所・サンドボックスを定めていません。パッケージを有効に
すると、その指示文と手元の実行ファイルには、他のインストール済み Hermes プラグインと
同じ「全面的に信頼する」扱いが与えられます。

[整形された仕様書](https://agent-plugins.org/specification) は、いま v1.0.0 を
Working Draft と表示していますが、
[バージョン付きの仕様リポジトリ](https://github.com/agentplugins/agent-plugins-spec/blob/main/spec/1.0.0.md)
では Published と記録されています。Hermes は、どちらの変わりうるステータス表示でも
なく、v1.0.0 の正式なスキーマ識別子と規範的な本文に合わせて動きます。これは対応
範囲を明示したサブセットであって、Agent Plugins に完全準拠しているという主張では
ありません。

## ネイティブプラグインの互換性の約束 {#native-plugin-compatibility-contract}

ネイティブの `plugin.yaml` + `register(ctx)` 型のプラグインは、全体で 1 つの
プラグイン API 番号ではなく、振る舞いによって守られます。Hermes は
`PLUGIN_API_VERSION` を公開せず、マニフェスト全体での `api:` の一致も求めず、
関係のない値に API のバージョンを付けることもしません。ドキュメントに載っている
振る舞いを使っているプラグインは、Hermes を普通に更新したあとも動き続けるはずです。

互換性の規則は次のとおりです。

- **足す方向にだけ変えます。** ドキュメントに載っている `PluginContext` のメソッドは、
  削除も改名もされません。新しい引数は省略でき、既定値を持ち、キーワード専用に
  するべきです。既存の戻り値のフィールドは、削除も黙った型変更もされません。
- **フックの受け渡しはキーワード引数で行います。** フックの新しいデータはキーワードの
  フィールドとして足され、既存のフィールドの意味や位置を変えることはありません。
  Hermes はコールバックの引数の形を見ます。昔ながらのコールバックは自分が宣言した
  フィールドだけを受け取り、`**kwargs` を持つコールバックはいまのペイロード全体を
  受け取ります。新しいプラグインは `**kwargs` を受け取るようにしておくと、引数の形を
  変えずに追加のデータを受け取れます。
- **マニフェストは追加に開かれています。** 知らない `plugin.yaml` のフィールドは無視
  されます。そのため、新しい版で入ったメタデータを含むマニフェストでも、古い Hermes が
  そのプラグインを読み込めます。プラグインのコード自体が、対応済みの実行時の振る舞い
  だけを使っている場合の話です。
- **プロバイダのインターフェースは既定の実装で広げます。** 新しいプロバイダのメソッドには
  既定の実装が付きます。新しいコールバックの文脈は省略でき、引数の形を見て受け取れると
  分かったときだけ渡されます。抽象メソッドを足したり、無条件に引数を渡すようにしたり
  する場合は、その日を境に形が変わるのではなく、移行の期間を置きます。
- **境目をまたぐ約束にはバージョンを付けます。** ある機能が、通信のペイロードや保存の
  形式を定めているとき（たとえば観測用のペイロードやシークレットソースの状態）、その
  機能ごとのスキーマのバージョンを持てます。そのローカルなスキーマの中では、フィールドを
  足す方向を保ってください。保存されたプラグインの状態と設定は読めるままにするか、移行の
  処理を必ず用意します。古い形式で書かれた再開できるセッションも、そのまま再生できな
  ければなりません。関係のないコールバックや文脈の値に、バージョンの文字列を足さないで
  ください。

### 非推奨にするときの方針 {#deprecation-policy}

ドキュメントに載っているネイティブプラグインの振る舞いを非推奨にできるのは、次の
すべてを満たしたときだけです。

1. プラグインの手引きとリリースノートに、代わりの手段と移行の手順を書くこと。
2. 1 つのプロセスにつき多くても 1 回、代わりの手段と削除される最も早い版を挙げた
   警告を出すこと。
3. その後少なくとも 2 回のマイナーリリースまで、古い振る舞いを残すこと。
4. その期間ずっと、昔の経路と代わりの手段の両方について、振る舞いを見る互換性の
   確認を持っていること。

期間が終わって削除するときは、保存済みのデータや再開できるセッションに必要な移行の
処理も一緒に入れなければなりません。実際のところ、削除よりも、別名やアダプタを足す
ほうが好まれます。

Hermes はこの約束を、隔離した `HERMES_HOME` から見つけてくる、固定した外部プラグインの
検査用データで守らせています。その検査は `PluginManager` を通してプラグインを読み込み、
呼び出します。内部のシンボルの一覧やソースコードの見た目ではなく、実際の登録の結果と
コールバックの結果を確かめます。

## これから作るもの {#what-youre-building}

2 つのツールを持つ **電卓** のプラグインです。
- `calculate` — 数式を評価します（`2**16`、`sqrt(144)`、`pi * 5**2`）
- `unit_convert` — 単位を変換します（`100 F → 37.78 C`、`5 km → 3.11 mi`）

これに加えて、すべてのツール呼び出しを記録するフックと、同梱するスキルファイルも作ります。

## 手順 1: プラグインのディレクトリを作る {#step-1-create-the-plugin-directory}

ディレクトリを作って、手順 2 に進みます。

```bash
mkdir -p ~/.hermes/plugins/calculator
cd ~/.hermes/plugins/calculator
```

### Plugin Doctor で確かめる {#validate-with-plugin-doctor}

`hermes plugins doctor [path-or-id]` は、Hermes 自身が使っているのと同じディレクトリの
探索、マニフェストの解析、名前空間付きの import、`register(ctx)`、フックの登録簿、ツールの
登録簿を、そのまま実行します。無効なフック名、`**kwargs` を受け取らないコールバック、
登録の失敗、宣言したツール・フックと実際に登録されたものとのずれを報告します。エラーが
あったときに終了コードを 0 以外にしたいときは `--ci` を付けてください。

```bash
hermes plugins doctor . --ci
```

Doctor は一時的な `HERMES_HOME` を使い、確認が終わるとプラグインの登録の状態を元に戻します。
また、登録の実行中にうっかりネットワークへ出ていないかを捕まえるため、Python から直接
ソケットにつなぐことを止めます。これはサンドボックスではありません。プラグインのコードは
いまのユーザーの権限のまま同じプロセスで動き、子プロセスも起こせます。Doctor にかけるのは、
import しても大丈夫だと信頼できるコードだけにしてください。

## 手順 2: マニフェストを書く {#step-2-write-the-manifest}

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

これで Hermes に「自分は calculator という名前のプラグインで、ツールとフックを提供します」と伝わります。`provides_tools` と `provides_hooks` のフィールドは、そのプラグインが登録するものを並べた一覧です。

必要なら、次のフィールドも足せます。
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

### ケーパビリティを宣言する {#declaring-capabilities}

組み込みツールの差し替えや、`ctx.llm` の呼び出しに使うモデルの指定など、権限の要る
ホスト側の機能が必要なら、`capabilities:` に書いてください。インストールや有効化の
ときに、利用者はその一覧を見て一度だけ同意します。あとの版で機能が増えたときは、
更新の流れの中で、増えた分についてだけあらためて確認されます。宣言していないもの、
同意されていないものは、単に無効です（安全な側に倒れます）。ですから
**使う前に確かめて、なければ穏やかに機能を落としてください**。

```python
def register(ctx):
    if ctx.has_capability("tools.override"):
        ctx.register_tool(..., override=True)
    else:
        ctx.register_tool(...)   # register under a non-conflicting name
```

知られているケーパビリティの ID は `tools.override`、`llm.provider_override`、
`llm.model_override`、`llm.agent_id_override`、`llm.profile_override`、
`llm.task_override` です（正式な一覧は `hermes_cli/plugin_capabilities.py` にあります）。
知らない ID は無視されます。ケーパビリティごとの古い設定キー
（`plugins.entries.<id>.allow_tool_override` など）もまだ動きますが、非推奨です。
利用者が 1 枚の、あとから確かめられる同意画面を見られるように、ケーパビリティのほうで
宣言してください。ケーパビリティは同意と記録のための仕組みであって、
**サンドボックスではありません**。ホスト側の API の入り口を絞るだけで、それ以上のことは
しません。

**pip で配るプラグイン** は、インストールしたあとに `plugin.yaml` のディレクトリが
残らないため、代わりに配布物のメタデータで宣言します。対になる
`hermes_agent.plugin_capabilities` というエントリポイントのグループを使ってください。
宣言はそれぞれ `<plugin-id>.<capability-id>` という名前にし、`hermes_agent.plugins` の
エントリポイントと同じオブジェクトを指すようにします。

```toml
[project.entry-points."hermes_agent.plugins"]
calculator = "my_pkg:register"

[project.entry-points."hermes_agent.plugin_capabilities"]
"calculator.tools.override" = "my_pkg:register"
```

Hermes はこれらを、コードを import せずにインストール済みのメタデータから読みます。
そのため pip で入れた場合でも、`hermes plugins capabilities` と同意の流れが正しいままに
なります。

### マニフェスト v2 早見表 {#manifest-v2-reference}

`plugin.yaml` は、追加の方向に伸びる **v2 スキーマ** にも対応しています（#64165）。
どのフィールドも省略できます。`manifest_version` のないマニフェストは v1 のマニフェストで、
今後もずっとそのまま使えます。知らないフィールドで読み込みが壊れることはありません。
警告と一緒に無視されます（前方互換）。この Hermes が知っているより新しい
`manifest_version` でも、警告付きで読み込まれます。

| フィールド | 型 | 意味 |
|---|---|---|
| `manifest_version` | int | マニフェストの **ファイル形式** のバージョン。無い場合は `1` です。いまの最大値は `2`。`api_version` とは別物です。 |
| `api_version` | int | そのプラグインが狙う実行時の **プラグイン API の世代**（ctx の面ぶれ、フックの引数の形）。`manifest_version` とはわざと別の軸にしてあり、`api_version: 1` のプラグインでも v2 のマニフェストを使えます。 |
| `requires_plugins` | list | プラグイン同士の依存関係。`- id: other-plugin` の形で、任意で `version_range: ">=1.0,<2"` を付けられます。**あくまで参考の情報** です。依存先が無いときは分かりやすい警告が出ますが、プラグイン自体は読み込まれます。実行時に `ctx.has_plugin("other-plugin")` で確かめてください。読み込みの **順番** はこの依存の線を守ります。A が B を必要とするとき、B の `register()` が A より先に走ります（トポロジカルソート、同順ならアルファベット順。循環しているときは警告を出してアルファベット順に戻します）。 |
| `python_dependencies` | list of str | pip の要件を宣言します（例: `"requests>=2.0,<3"`）。**宣言して知らせるだけの継ぎ目** です。Hermes は内容を検証し、`hermes plugins install` と `hermes plugins doctor` が足りないものを `pip install` の案内付きで知らせますが、Hermes が **勝手に入れることはありません**。上限のバージョンは必ず固定してください。 |
| `config_schema` | mapping | `plugins.entries.<id>.settings` の下に置くキーを、JSON スキーマ風に説明します。`api_url: {type: str, default: "", description: "...", required: false}` のように書きます。読み込み時に検証され、食い違いはキー名と期待する型を挙げた、手を打ちやすい警告になります。読み込みの失敗にはなりません。型は `str`、`int`、`float`、`bool`、`list`、`dict`（および JSON スキーマの別名）です。 |
| `license` | str | SPDX 形式のライセンス ID（例: `MIT`）。 |
| `homepage` | str | プロジェクトの URL。 |
| `tags` | list of str | 見つけてもらうための自由なタグ（例: `[gateway, telegram]`）。 |

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

:::note pip の依存関係の隔離は先送りです
`python_dependencies` は、わざと「宣言して知らせるだけ」にしてあります。任意の
パッケージを Hermes 共用の venv に入れると、衝突とサプライチェーンの入り口になります。
そのため、インストールの継ぎ目をどう隔離するか（ホストのロックに対する制約ファイル方式か、
プラグインごとに同梱するディレクトリ方式か、衝突を見つけて拒否する方式か）の設計は、
はっきり先送りの宿題にしてあります。
[#64165](https://github.com/NousResearch/hermes-agent/issues/64165) の 2 巡目のレビューと
[#15220](https://github.com/NousResearch/hermes-agent/issues/15220) を見てください。
プラグインパック（#64166）は、この v2 のフィールドの上に載ります。
:::

## 手順 3: ツールのスキーマを書く {#step-3-write-the-tool-schemas}

`schemas.py` を作ります。LLM は、これを読んでツールを呼ぶかどうかを決めます。

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

**スキーマが効いてくる理由:** LLM は `description` のフィールドを見て、そのツールを使うかどうかを決めます。何をするツールで、どんなときに使うのかを具体的に書いてください。`parameters` は LLM が渡す引数を決めます。

## 手順 4: ツールのハンドラを書く {#step-4-write-the-tool-handlers}

`tools.py` を作ります。LLM がツールを呼んだときに、実際に動くコードです。

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

**ハンドラの大事な決まり:**
1. **引数の形:** `def my_handler(args: dict, **kwargs) -> str`
2. **戻り値:** 必ず JSON の文字列にします。成功でもエラーでも同じです。
3. **例外を投げない:** すべての例外を受け止めて、代わりにエラーの JSON を返します。
4. **`**kwargs` を受け取る:** Hermes が将来、追加の情報を渡すかもしれません。

## 手順 5: 登録を書く {#step-5-write-the-registration}

`__init__.py` を作ります。スキーマとハンドラをつなぐファイルです。

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

**`register()` がすること:**
- 起動時にちょうど 1 回だけ呼ばれます
- `ctx.register_tool()` でツールが登録簿に入り、モデルからすぐ見えるようになります
- `ctx.register_hook()` でライフサイクルのイベントを購読します
- `ctx.register_cli_command()` で CLI のサブコマンドを登録します（例: `hermes my-plugin <subcommand>`）
- `ctx.register_command()` でセッション内のスラッシュコマンドを登録します（例: CLI やゲートウェイのチャットで `/myplugin <args>`）。下の [スラッシュコマンドを登録する](#register-slash-commands) を見てください
- `ctx.dispatch_tool(name, arguments)` — 他のツール（組み込みでも別のプラグインのものでも）を、親エージェントの文脈（承認、認証情報、task_id）を自動でつないだ状態で呼びます。スラッシュコマンドのハンドラから `terminal` や `read_file` などのツールを、モデルが直接呼んだのと同じように動かしたいときに便利です。
- `ctx.get_config()` / `ctx.set_config()` は、このプラグインの設定の名前空間だけを見ます。`ctx.state` は、有効なプロファイルの下にプラグイン自身の実行時のデータを保存します。
- この関数が落ちた場合、そのプラグインは無効になりますが、Hermes は問題なく動き続けます

**`dispatch_tool` の例 — ツールを実行するスラッシュコマンド:**

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

こうして呼び出したツールも、通常の承認・伏せ字・予算の流れをきちんと通ります。仕組みを迂回する近道ではなく、本物のツール呼び出しです。

### 設定と実行時の状態を保存する {#store-settings-and-runtime-state}

利用者から見える振る舞いには、プラグインからの相対の設定キーを使ってください。Hermes は
これを `plugins.entries.<plugin-id>.settings` の下で解決し、全体設定・他のプラグイン・
上の階層をたどるパスは拒否します。

```python
def register(ctx):
    endpoint = ctx.get_config("endpoint", default="https://example.invalid")
    retries = ctx.get_config("retry.attempts", default=3)

    ctx.set_config("endpoint", endpoint)
    ctx.set_config("retry.attempts", retries)
```

プラグイン自身のカーソル・キャッシュ・重複判定のデータには `ctx.state` を使い、実行時の
記録を `config.yaml` に置かないでください。

```python
def register(ctx):
    cursor = ctx.state.get("cursor", default={"page": 0})
    ctx.state.set("cursor", {"page": cursor["page"] + 1})
```

状態はプロファイル単位で、まるごと入れ替える形で書かれ、同時に書き込んでも壊れず、
プラグイン 1 つあたり 10 MiB までです。持ち運び形式のパッケージは、この同じディレクトリを
`PLUGIN_DATA` として共有します。ネイティブのプラグインには、ぶつかりにくく Windows でも
安全な名前空間が割り当てられます。すでにある状態が壊れていた場合は、報告したうえで
そのまま残します。

設定と状態は持ち主が違います。設定は `config.yaml` にある利用者から見える振る舞いで、
状態は `<HERMES_HOME>/plugin-data/` の下にあるプラグイン自身の実行時のデータです。
どちらの API も、他のプラグインの名前空間には触れません。

## 手順 6: 動かしてみる {#step-6-test-it}

Hermes を起動します。

```bash
hermes
```

起動時のバナーのツールの一覧に `calculator: calculate, unit_convert` が出るはずです。

次のように話しかけてみてください。
```
What's 2 to the power of 16?
Convert 100 fahrenheit to celsius
What's the square root of 2 times pi?
How many gigabytes is 1.5 terabytes?
```

プラグインの状態を確かめます。
```
/plugins
```

出力:
```
Plugins (1):
  ✓ calculator v1.0.0 (2 tools, 1 hooks)
```

### プラグインが見つからないときの調べ方 {#debugging-plugin-discovery}

プラグインが一覧に出てこない、あるいは出るのに読み込まれていないときは、`HERMES_PLUGINS_DEBUG=1` を付けると、探索の詳しいログが標準エラー出力に出ます。

```bash
HERMES_PLUGINS_DEBUG=1 hermes plugins list
```

プラグインの取得元（同梱・ユーザー・プロジェクト・エントリポイント）ごとに、次のことが分かります。

- どのディレクトリを調べ、それぞれからマニフェストが何件見つかったか
- マニフェストごとの、解決後のキー・名前・種類・取得元・ディスク上のパス
- 読み飛ばした理由: `disabled via config`、`not enabled in config`、`exclusive plugin`、`no plugin.yaml, depth cap reached`
- 読み込み時: import されたプラグインと、`register(ctx)` が何を登録したか（ツール・フック・スラッシュコマンド・CLI コマンド）の 1 行まとめ
- 解析に失敗したとき: その例外の完全なトレースバック（YAML のスキャナのエラーなど）
- `register()` が失敗したとき: `__init__.py` の中で例外を投げた行を指す完全なトレースバック

同じログは常に `~/.hermes/logs/agent.log` にも書かれます。WARNING レベル（失敗だけ）と、環境変数を設定したときの DEBUG レベル（すべて）です。ゲートウェイの中からなど、環境変数を付けて実行できないときは、代わりにログファイルを追いかけてください。

```bash
hermes logs --level WARNING | grep -i plugin
```

プラグインが出てこないときの、よくある原因は次のとおりです。

- **設定で有効になっていない** — プラグインは自分で有効にする方式です。`hermes plugins enable <name>` を実行してください（名前は `plugins list` の出力にあるもので、入れ子の配置では `<category>/<plugin>` の形になることがあります）。
- **ディレクトリの配置が違う:** ネイティブのパッケージは `~/.hermes/plugins/<plugin-name>/plugin.yaml`（平置き）か、カテゴリを 1 段だけ挟んだ形です。持ち運び形式のパッケージは、同じ場所にルートの `plugin.json` を置きます。それより深いところは無視されます。
- **`__init__.py` が無い:** ネイティブのパッケージには `plugin.yaml` と、`register(ctx)` 関数を持つ `__init__.py` の両方が要ります。持ち運び形式のパッケージは Python を import しないので、`__init__.py` は要りません。
- **`kind` が違う** — ゲートウェイのアダプタは、マニフェストに `kind: platform` が要ります。メモリプロバイダは `kind: exclusive` として自動で見分けられ、`plugins.enabled` ではなく `memory.provider` の設定から選ばれます。

## できあがったプラグインの構成 {#your-plugins-final-structure}

```
~/.hermes/plugins/calculator/
├── plugin.yaml      # "I'm calculator, I provide tools and hooks"
├── __init__.py      # Wiring: schemas → handlers, register hooks
├── schemas.py       # What the LLM reads (descriptions + parameter specs)
└── tools.py         # What runs (calculate, unit_convert functions)
```

ファイルは 4 つ、役割ははっきり分かれています。
- **マニフェスト** は、そのプラグインが何かを宣言します
- **スキーマ** は、LLM に向けてツールを説明します
- **ハンドラ** は、実際の処理を実装します
- **登録** は、それらをつなぎます

## プラグインには他に何ができる? {#what-else-can-plugins-do}

### データファイルを同梱する {#ship-data-files}

好きなファイルをプラグインのディレクトリに置いて、import のときに読み込めます。

```python
# In tools.py or __init__.py
from pathlib import Path

_PLUGIN_DIR = Path(__file__).parent
_DATA_FILE = _PLUGIN_DIR / "data" / "languages.yaml"

with open(_DATA_FILE) as f:
    _DATA = yaml.safe_load(f)
```

これは *同梱する* ファイルの話です。自分で *書き込む* 状態は別で、次の節を
見てください。

### 消えない状態を保存する {#store-durable-state}

実行時の状態をプラグインのディレクトリに書かないでください。そこはインストール先の
ツリーで、`hermes plugins update` や `remove` が git pull したり削除したりします。
利用者のデータも一緒に消えます。正式な置き場所は、更新にも削除にも耐え、有効な
プロファイルに従う、プラグインごとのデータ用のルートです。

```python
from plugins.plugin_storage import plugin_data_dir, plugin_db

# <hermes home>/plugin-data/<name>/ — created on first use
state_file = plugin_data_dir("my-plugin") / "state.json"

# Or a SQLite database at <data dir>/data.db (WAL mode, thread-friendly)
conn = plugin_db("my-plugin")
conn.execute("CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY)")
```

プラグインごとに 1 つのディレクトリなので、どのプラグインのデータも決まった場所で
確かめられます。シークレットはここに置くものではありません。認証情報の読み出しは、
他の場所と同じく `.env` とシークレットスコープの経路を通します。

### スキルを同梱する {#bundle-skills}

プラグインは、エージェントが `skill_view("plugin:skill")` で読み込むスキルファイルを同梱できます。`__init__.py` で登録してください。

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

**大事な性質:**
- プラグインのスキルは **読み取り専用** です。`~/.hermes/skills/` には入らず、`skill_manage` で編集することもできません。
- プラグインのスキルは、システムプロンプトの `<available_skills>` の索引に **載りません**。明示的に読み込んだときだけ使われます。
- 素のスキル名には影響がありません。名前空間があるので、組み込みのスキルとぶつかりません。
- エージェントがプラグインのスキルを読み込むと、同じプラグインの他のスキルを並べた同梱物の案内が先頭に付きます。

:::tip 昔のやり方
昔ながらの `shutil.copy2` のやり方（スキルを `~/.hermes/skills/` にコピーする方法）もまだ動きますが、組み込みのスキルと名前がぶつかる危険があります。新しく作るプラグインでは `ctx.register_skill()` を使ってください。
:::

### 環境変数で読み込みを絞る {#gate-on-environment-variables}

プラグインに API キーが要るときは、こう書きます。

```yaml
# plugin.yaml — simple format (backwards-compatible)
requires_env:
  - WEATHER_API_KEY
```

`WEATHER_API_KEY` が設定されていない場合、そのプラグインは分かりやすいメッセージとともに無効になります。落ちることもエージェント側のエラーになることもなく、「Plugin weather disabled (missing: WEATHER_API_KEY)」と出るだけです。

利用者が `hermes plugins install` を実行すると、足りない `requires_env` の変数について **対話形式で入力を求められます**。入力した値は `.env` に自動で保存されます。

インストールをもっと親切にしたいときは、説明と登録用の URL を書ける詳しい形式を使ってください。

```yaml
# plugin.yaml — rich format
requires_env:
  - name: WEATHER_API_KEY
    description: "API key for OpenWeather"
    url: "https://openweathermap.org/api"
    secret: true
```

| フィールド | 必須 | 説明 |
|-------|----------|-------------|
| `name` | はい | 環境変数の名前 |
| `description` | いいえ | インストール時の入力画面で利用者に見せる説明 |
| `url` | いいえ | 認証情報の入手先 |
| `secret` | いいえ | `true` にすると、入力が伏せ字になります（パスワードの欄と同じ） |

1 つの一覧の中で、両方の形式を混ぜても構いません。すでに設定済みの変数は、黙って飛ばされます。

### 任意の Python 依存を必要になってから入れる {#lazy-install-optional-python-dependencies}

全員が入れているとは限らない SDK（ベンダーの SDK、重い機械学習ライブラリ、環境ごとのパッケージ）を包むプラグインでは、モジュールの先頭で `import` しないでください。ツールのハンドラの中で `tools.lazy_deps.ensure(...)` を使えば、最初に使われたときに Hermes がそのパッケージを入れます。利用者の `security.allow_lazy_installs` の設定で許可されている場合に限ります。

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

`tools/lazy_deps.py` のセキュリティ設計から来る決まりが 2 つあります。

| 決まり | 理由 |
|---|---|
| 機能のキーは、リポジトリ内の `LAZY_DEPS` の許可リストに載っていること | 悪意ある設定が Hermes に任意のパッケージを入れさせるのを防ぎます。Hermes 自身が同梱している指定だけが対象です |
| 指定できるのは PyPI の名前だけ | `--index-url`、`git+https://`、file: のパスは使えません。バージョンは許可リストの項目の中で PEP 440 の形（`"my-sdk>=1.2,<2"`）に固定します |

pip で配る第三者のプラグインでは、任意の依存を自分の `pyproject.toml` の `[project.optional-dependencies]` の extras として宣言し、利用者に `pip install your-plugin[backend]` を案内してください。この経路は `lazy_deps` を通りません。あとから入れる仕組みが一番効くのは **同梱** のプラグインで、全員のインストールに固い依存を付けると Hermes 本体が太ってしまう場合です。

全体の設定で `security.allow_lazy_installs: false` になっている場合、`ensure()` はすぐに `FeatureUnavailable` を投げ、対処のヒントを添えます。プラグイン側でこれを受け止めて、穏やかに機能を落としてください（ツールのループを壊さず、エラーの結果を返します）。

### スレッドセーフな遅延シングルトン {#thread-safe-lazy-singletons}

プラグインでは、作るのに手間のかかるもの（SDK のクライアント、HTTP のセッション、コネクションプール）を、モジュールの変数に入れて最初の呼び出しで作る書き方をよくします。

```python
_client = None

def get_client():
    global _client
    if _client is not None:
        return _client
    _client = ExpensiveClient(...)   # ← TOCTOU race
    return _client
```

これは自分の足を撃つ書き方です。Hermes は 1 つのプロセスで複数のスレッドを動かします（委任したツール呼び出し、背後で動くワーカー、自己改善のフォーク）。そのため、`_client` に値が入る前に 2 つのスレッドが `get_client()` に来て、**どちらも** `is not None` の判定を通り抜け、**どちらも** 重い生成を実行し、あとから書いたほうが先の値を上書きします。負けたほうが開いた資源（接続、ファイルハンドル、背後のスレッド）は漏れたままです。

ロックを自分で書かないでください。`plugins/plugin_utils.py` の補助関数を使います。

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

どちらも二重チェックのロックで同時の初回呼び出しを直列にし、生成処理は多くても 1 回しか走りません。生成処理が例外を投げた場合は何もキャッシュされず、次の呼び出しでやり直します。honcho のメモリプラグイン（`plugins/memory/honcho/client.py`）が参考になる使い方です。

> 目安: `global _something` と書いて、そのあとに `is None` の判定と生成が続くようなら、代わりにこのどちらかを使ってください。

### ツールを条件付きで見せる {#conditional-tool-availability}

任意のライブラリに依存するツールでは、こう書きます。

```python
ctx.register_tool(
    name="my_tool",
    schema={...},
    handler=my_handler,
    check_fn=lambda: _has_optional_lib(),  # False = tool hidden from model
)
```

### 組み込みツールを差し替える {#overriding-a-built-in-tool}

組み込みのツールを自分の実装に置き換えるとき（たとえば既定のブラウザツールを
画面ありの Chrome の CDP バックエンドに替える、`web_search` を社内の独自の索引に
替えるなど）は、`override=True` を渡します。

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

`override=True` を付けないと、別のツールセットにある既存のツールを隠すような登録は、
登録簿が拒否します。うっかり上書きするのを防ぐためです。**組み込みの** ツールを
差し替える場合はさらに、運用する人が `config.yaml` で
`plugins.entries.<plugin_id>.allow_tool_override: true` を設定して許可する必要が
あります。この関門を通らないと、`register_tool(override=True)` は
`PluginToolOverrideError` を投げます。差し替えは記録されるので、
`~/.hermes/logs/agent.log` であとから確かめられます。プラグインは組み込みツールの
あとに読み込まれるので、登録の順番は正しくなります。自分のハンドラが組み込みの
ものを置き換えます。

**同梱されていないプラグインには、運用する人の許可も要ります。** Hermes 本体に
同梱されていないプラグイン（ユーザー・プロジェクト・pip のどの取得元でも）が、
既存の組み込みツールに対して `override=True` を使う場合は、さらに `config.yaml` で
プラグインごとの許可が必要です。

```yaml
plugins:
  entries:
    my-plugin:                    # the plugin's registry key from `hermes plugins list`
      allow_tool_override: true
```

許可がないと `ctx.register_tool(..., override=True)` は
`PluginToolOverrideError` を投げます。`register()` の例外はローダーが受け止めるので、
そのプラグインは無効になり、Hermes はそのまま動き続けます。この関門があるのは、
有効になったプラグインが `shell_exec` や `write_file` のような強い権限を持つ組み込み
ツールを黙って置き換えると、モデルがそこへ流すものすべてを横取りできてしまうから
です。同梱のプラグインは対象外で、そこでの差し替えは開発側の判断です。設定が読めない
場合、この関門は閉じる側に倒れます。

このキーを手で書き換えることは、普通はありません。`hermes plugins enable <name>` は、
同梱でないプラグインを有効にするときに、この機能を許可するかどうかを尋ねます（既定は
「いいえ」です）。スクリプトからインストールするときは、`--allow-tool-override` と
`--no-allow-tool-override` のフラグで確認を飛ばせます。同じ許可は `deregister()` の
関門にもなっています。許可がないと、プラグインは自分のものではないツールを取り除け
ません（そうでないと、差し替えの確認を回り込む抜け道になってしまいます）。

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

フックはそれぞれ **[イベントフックの早見表](/hermes/docs/user-guide/features/hooks/#plugin-hooks)** に詳しく書いてあります。コールバックの引数の形、パラメータの表、いつ発火するか、そして例です。ここではまとめだけ載せます。

| フック | 発火するとき | コールバックの引数 | 戻り値 |
|------|-----------|-------------------|---------|
| [`pre_tool_call`](/hermes/docs/user-guide/features/hooks/#pre_tool_call) | どのツールでも実行される前 | `tool_name: str, args: dict, task_id: str` | 任意の指示を返せます。`{"action": "block", "message": ...}` で呼び出しを止め、`{"action": "approve", "message": ...}` で人の承認を求める関門に上げます |
| [`post_tool_call`](/hermes/docs/user-guide/features/hooks/#post_tool_call) | どのツールでも返ってきたあと | `tool_name: str, args: dict, result: str, task_id: str, duration_ms: int` | 無視されます |
| [`pre_llm_call`](/hermes/docs/user-guide/features/hooks/#pre_llm_call) | 1 ターンに 1 回、ツール呼び出しのループの前 | `session_id: str, user_message: str, conversation_history: list, is_first_turn: bool, model: str, platform: str` | [コンテキストの差し込み](#pre_llm_call-context-injection) |
| [`post_llm_call`](/hermes/docs/user-guide/features/hooks/#post_llm_call) | 1 ターンに 1 回、ツール呼び出しのループのあと（成功したターンだけ） | `session_id: str, user_message: str, assistant_response: str, conversation_history: list, model: str, platform: str` | 無視されます |
| `pre_api_request` | プロバイダへの生の API リクエストごとに、その前（モデルがツールを呼ぶターンでは 1 ターンに複数回） | `session_id: str, model: str, provider: str, base_url: str, api_mode: str, api_call_count: int, message_count: int, tool_count: int, approx_input_tokens: int, max_tokens: int, request: dict` | 無視されます |
| `post_api_request` | プロバイダへの生の API リクエストが返ってきたあとごと | `pre_api_request` のフィールドに加えて `api_duration: float, finish_reason: str, response_model: str \| None, usage: dict, response: dict, assistant_content_chars: int, assistant_tool_call_count: int` | 無視されます |
| `api_request_error` | プロバイダの API 呼び出しが例外を投げたとき | 相関用のフィールドに加えて `status_code: int \| None, retry_count: int \| None, max_retries: int \| None, retryable: bool \| None, reason: str \| None, error: dict, request: dict` | 無視されます |
| [`on_session_start`](/hermes/docs/user-guide/features/hooks/#on_session_start) | 新しいセッションが作られたとき（最初のターンだけ） | `session_id: str, model: str, platform: str` | 無視されます |
| [`on_session_end`](/hermes/docs/user-guide/features/hooks/#on_session_end) | `run_conversation` の呼び出しが終わるたび、および CLI の終了時 | `session_id: str, completed: bool, interrupted: bool, model: str, platform: str` | 無視されます |
| [`on_session_finalize`](/hermes/docs/user-guide/features/hooks/#on_session_finalize) | CLI やゲートウェイが動いているセッションを片付けるとき | `session_id: str \| None, platform: str` | 無視されます |
| [`on_session_reset`](/hermes/docs/user-guide/features/hooks/#on_session_reset) | ゲートウェイが新しいセッションキーに入れ替えたとき（`/new`、`/reset`） | `session_id: str, platform: str` | 無視されます |
| [`gateway_platform_event`](/hermes/docs/user-guide/features/hooks/#gateway_platform_event) | 許可されたプラットフォーム固有のイベントが、ゲートウェイの境目で正規化されたとき（いまのところ Telegram のリアクション） | `platform: str, event_type: str, payload: dict` | 無視されます |
| `kanban_task_claimed` | かんばんのタスクが引き受けられたとき（振り分け側のプロセス、ワーカーが起きる前） | `task_id: str, board: str \| None, assignee: str \| None, run_id: int \| None, profile_name: str` | 無視されます |
| `kanban_task_completed` | かんばんのタスクが完了したとき（ワーカーのプロセス） | `task_id, board, assignee, run_id, profile_name, summary: str \| None` | 無視されます |
| `kanban_task_blocked` | かんばんのタスクが詰まったとき（ワーカーのプロセス） | `task_id, board, assignee, run_id, profile_name, reason: str \| None` | 無視されます |

ほとんどのフックは投げっぱなしの観測役で、戻り値は無視されます。例外は 2 つ。会話にコンテキストを差し込める `pre_llm_call` と、停止・承認の指示を返せる `pre_tool_call` です。

コールバックはどれも、前方互換のために `**kwargs` を受け取るようにしてください。フックのコールバックが落ちても、記録されて読み飛ばされるだけです。他のフックとエージェントは、そのまま動き続けます。

かんばんのライフサイクルのフックは、ボードの DB の変更が確定した **あと** に発火します。そのため、コールバックが見るのは必ず確定した状態で、SQLite の書き込みロックを握ることもありません。かんばんのワーカーは `hermes -p <profile> chat -q` という別のサブプロセスとして動くので、`kanban_task_claimed` は **振り分け側** のプロセスで、`kanban_task_completed` と `kanban_task_blocked` は **ワーカー側** のプロセスで発火します。すべての移り変わりをまとめて見たいなら振り分け側で、タスクごとにセッション内の文脈がほしいならワーカー側でフックしてください。

**API リクエストのフック** は、プロバイダへの生のリクエストを観測するもので、ターン単位の `pre_llm_call` / `post_llm_call` の 1 段下にあります。ツールを呼ぶターンでは API リクエストが何回か発生し、そのたびにこれらのフックが発火します。用途は観測系のプラグイン（トレース、費用の計算、遅延のダッシュボード）です。`request` と `response` のキーワード引数は、プロバイダのペイロードを整えて大きさに上限をかけた JSON の写しです（秘密のキーは伏せ、長い文字列は切り詰め、SDK のオブジェクトは正規化されます）。`usage` はトークンのまとめを入れた素の辞書です。どのペイロードにも `turn_id`、`api_request_id`、`task_id`、`session_id`、`api_call_count` という相関用のフィールドが付くので、リクエストとツール呼び出しとターンをつなぎ合わせられます。`api_request_error` はプロバイダの呼び出しが例外を投げたときに発火し、`status_code`、`retry_count` / `max_retries`、`retryable`、`reason`、そして `type` と `message` を持つ `error` の辞書が加わります。

### `pre_llm_call` によるコンテキストの差し込み {#prellmcall-context-injection}

戻り値に意味があるのは、このフックだけです。`pre_llm_call` のコールバックが `"context"` というキーを持つ辞書（または素の文字列）を返すと、Hermes はそのテキストを **いまのターンのユーザーメッセージ** に差し込みます。メモリ系のプラグイン、RAG との連携、ガードレール、そしてモデルに追加の情報を渡したいプラグインは、すべてこの仕組みを使います。

#### 戻り値の形 {#return-format}

```python
# Dict with context key
return {"context": "Recalled memories:\n- User prefers dark mode\n- Last project: hermes-agent"}

# Plain string (equivalent to the dict form above)
return "Recalled memories:\n- User prefers dark mode"

# Return None or don't return → no injection (observer-only)
return None
```

`"context"` というキーを持つ、None でも空でもない戻り値（または空でない素の文字列）は集められ、いまのターンのユーザーメッセージの末尾に足されます。

#### 大きすぎるコンテキストの退避 {#oversized-context-spill}

フック 1 つあたりのコンテキストは、既定で `10,000` 文字までです。上限を超えた分は `$HERMES_HOME/hook_outputs/<session_id>/<uuid>.txt` に書き出され、先頭と末尾の抜粋と保存先のパスに置き換えられます。本当に必要なら、モデルは `read_file` や `terminal` で全文を読めます。こうしておくと、暴走したプラグインがあとに続くターンのプロンプトを膨らませ、プロンプトキャッシュの前半を壊してしまうのを防げます。調整は `config.yaml` で行います。

```yaml
hooks:
  output_spill:
    enabled: true          # default: true
    max_chars: 10000       # default; set higher to opt out of spilling
    preview_head: 500      # chars shown at the top of the preview
    preview_tail: 500      # chars shown at the bottom of the preview
    # directory: null      # default: $HERMES_HOME/hook_outputs
```

#### 差し込みの仕組み {#how-injection-works}

差し込まれるコンテキストは、システムプロンプトではなく **ユーザーメッセージ** の末尾に足されます。これは意図した設計です。

- **プロンプトキャッシュを守るため** — システムプロンプトはターンをまたいで同じままです。Anthropic と OpenRouter はシステムプロンプトの前半をキャッシュするので、そこを動かさなければ、複数ターンの会話で入力トークンを 75% 以上節約できます。プラグインがシステムプロンプトを書き換えていたら、毎ターンがキャッシュミスになってしまいます。
- **その場限りであること** — 差し込みは API を呼ぶときだけ起こります。会話の履歴に残る元のユーザーメッセージが書き換わることはなく、セッションのデータベースにも何も保存されません。
- **システムプロンプトは Hermes の領分** — そこにはモデルごとの案内、ツールの使い方の強制、人格の指示、キャッシュ済みのスキルの中身が入っています。プラグインは、エージェントの中核の指示を書き換えるのではなく、利用者の入力に並べる形でコンテキストを足します。

#### 例: メモリ呼び出しのプラグイン {#example-memory-recall-plugin}

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

#### 複数のプラグインがコンテキストを返したとき {#multiple-plugins-returning-context}

複数のプラグインが `pre_llm_call` からコンテキストを返した場合、それぞれの出力は空行 1 つでつながれ、まとめてユーザーメッセージの末尾に足されます。順番はプラグインが見つかった順（プラグインのディレクトリ名のアルファベット順）です。

### ミドルウェア: 起きることそのものを変える {#middleware-change-what-happens}

フックはエージェントのループを観測します（上に挙げた、いくつかの決まった舵取りの形は別として）。**ミドルウェアは起きることそのものを変えます**。リクエストのミドルウェアは、下流が見る前に実際のペイロードを書き換え、実行のミドルウェアは呼び出しそのものを包みます。登録は同じ `register(ctx)` から行います。

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

種類の正式な一覧は、`hermes_cli/middleware.py` の `VALID_MIDDLEWARE` にあります。

| 種類 | 受け取るもの | 戻り値の約束 |
|------|----------|-----------------|
| `tool_request` | `tool_name`、`args`、`original_args`、文脈のキーワード引数 | `{"args": {...}}` を返すと、フック・ガードレール・承認・実行が見る前の、実際のツールの引数を差し替えます。`None` を返すと、その呼び出しはそのままです。 |
| `llm_request` | `request`、`original_request`、文脈のキーワード引数 | `{"request": {...}}` を返すと、Hermes が送る前のプロバイダ向けのキーワード引数を差し替えます。 |
| `tool_execution` | ペイロードと `next_call` | ツールの実行を包みます。`next_call(payload)` をちょうど 1 回呼んで下流の連なりを実行し（呼ばずに打ち切ることもできます）、その結果を返します。 |
| `llm_execution` | ペイロードと `next_call` | 同じ形で、プロバイダの呼び出しを包みます。 |

**実際に効いてくる決まり:**

- リクエストのミドルウェアは連なります。それぞれのコールバックは、先のコールバックが書き換えたあとのペイロードを見ます。一方で `original_args` / `original_request` は、常にミドルウェアを通る前の写しを持っています。ペイロードはコールバックの間でコピーされるので、自由に書き換えて構いません。
- 返す辞書には `source`、`reason`、`name` の文字列を入れられます。これらはミドルウェアの記録に残り、下流の観測用のフックが `middleware_trace` のキーワード引数として受け取ります。
- 実行のミドルウェアの `next_call` は **1 回きり** です。2 回呼ぶと例外になります。プロバイダやツールを二度動かしてしまうからです。
- 例外を投げたミドルウェアのコールバックは、記録されて読み飛ばされ、連なりは続きます。`next_call` のあとに下流で起きた失敗は、そのまま伝わります。ミドルウェアが土台の実行の経路を壊すことはありません。
- ミドルウェアのペイロードには、観測用のテレメトリのフィールドと並んで `middleware_schema_version`（`hermes.middleware.v1`）が入ります。
- 知らない種類は、失敗させずに警告付きで登録されます。新しい Hermes に合わせて書いたプラグインでも、古い Hermes で読み込めます。

### CLI のコマンドを登録する {#register-cli-commands}

プラグインは、自前の `hermes <plugin>` というサブコマンドの木を足せます。

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

**メモリプロバイダのプラグイン** は、代わりに約束事に沿った書き方をします。プラグインの `cli.py` に `register_cli(subparser)` という関数を足してください。メモリプラグインの探索の仕組みが自動で見つけるので、`ctx.register_cli_command()` を呼ぶ必要はありません。詳しくは [メモリプロバイダプラグインの手引き](/hermes/docs/developer-guide/memory-provider-plugin/#adding-cli-commands) を見てください。

**使用中のプロバイダだけに絞る:** メモリプラグインの CLI コマンドは、そのプロバイダが設定の `memory.provider` として使われているときだけ現れます。利用者がそのプロバイダを設定していなければ、CLI のコマンドがヘルプの出力を散らかすことはありません。

### スラッシュコマンドを登録する {#register-slash-commands}

プラグインは、セッション内のスラッシュコマンドを登録できます。会話の途中で利用者が打つコマンド（`/lcm status` や `/ping` など）のことです。CLI でもゲートウェイ（Telegram、Discord など）でも動きます。

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

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `name` | `str` | 先頭のスラッシュを除いたコマンド名（例: `"lcm"`、`"mystatus"`） |
| `handler` | `Callable[[str], str \| None]` | 引数の生の文字列を受け取って呼ばれます。`async` でも構いません。 |
| `description` | `str` | `/help`、入力補完、Telegram のボットのメニューに表示されます |

**`register_cli_command()` との大きな違い:**

| | `register_command()` | `register_cli_command()` |
|---|---|---|
| 呼び出し方 | セッション内で `/name` | 端末で `hermes name` |
| 動く場所 | CLI のセッション、Telegram、Discord など | 端末だけ |
| ハンドラが受け取るもの | 引数の生の文字列 | argparse の `Namespace` |
| 向いている用途 | 診断、状態の表示、ちょっとした操作 | 複雑なサブコマンドの木、設定の案内 |

**衝突からの保護:** 組み込みのコマンド（`help`、`model`、`new` など）とぶつかる名前を登録しようとすると、その登録は警告をログに出しつつ黙って拒否されます。組み込みのコマンドが常に優先されます。

**非同期のハンドラ:** ゲートウェイの振り分けは非同期のハンドラを自動で見分けて await するので、同期の関数でも非同期の関数でも構いません。

```python
async def _handle_check(raw_args: str) -> str:
    result = await some_async_operation()
    return f"Check result: {result}"

def register(ctx):
    ctx.register_command("check", handler=_handle_check, description="Run async check")
```

### スラッシュコマンドからツールを呼ぶ {#dispatch-tools-from-slash-commands}

ツールを組み合わせて動かしたいスラッシュコマンドのハンドラ（`delegate_task` でサブエージェントを起こす、`file_edit` を呼ぶなど）は、フレームワークの内側に手を伸ばさず `ctx.dispatch_tool()` を使ってください。親エージェントの文脈（作業場所のヒント、進行の表示、モデルの引き継ぎ）は自動でつながります。

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

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `name` | `str` | ツールの登録簿に登録されている名前（例: `"delegate_task"`、`"file_edit"`） |
| `args` | `dict` | ツールの引数。モデルが送るのと同じ形です |
| `parent_agent` | `Agent \| None` | 任意の上書き。省略すると、いまの CLI のエージェントから解決します（ゲートウェイでは穏やかに機能を落とします） |

**実行時の振る舞い:**

- **CLI のとき:** `parent_agent` は動いている CLI のエージェントから解決されるので、作業場所のヒント、進行の表示、モデルの選択が思ったとおりに引き継がれます。
- **ゲートウェイのとき:** CLI のエージェントがないため、ツールは穏やかに振る舞いを落とします。作業場所は設定された端末の作業ディレクトリから読み、進行の表示は出ません。
- **明示的な上書き:** 呼び出し側が `parent_agent=` を明示した場合は、その値が尊重され、上書きされません。

これが、プラグインのコマンドからツールを呼ぶための、公開された安定したインターフェースです。プラグインは `ctx._cli_ref.agent` のような内部の状態に手を伸ばすべきではありません。

### フックの中から動く（プロファイルとツール） {#act-from-inside-a-hook-profile-tools}

`ctx._cli_ref` に値が入るのは、**対話型の CLI** のセッションだけです。ゲートウェイ、対話ではない `hermes chat -q` の実行、そして **かんばんが起こしたワーカーのセッション** では `None` になります。つまり `_cli_ref` を通そうとするプラグインの処理は、まさにそういう場面で黙って何もしません。フックが実際に必要とすることは、次の 2 つの安定した、セッションに依存しない API でまかなえます。

- **`ctx.profile_name`** — 有効なプロファイルの名前（`"default"` や、かんばんのワーカーでは担当者のプロファイル）。`HERMES_HOME` から導かれるので、`_cli_ref` に頼らずどこでも使えます。
- **`ctx.dispatch_tool(name, args)`** — 登録済みのどのツール（組み込みでもプラグインのものでも）も呼べます。`kanban_*` のツール、`delegate_task`、`terminal`、`read_file` などです。そのフックがどのプロセスで発火しても、コールバックの中から使えます。

この 2 つを合わせれば、かんばんのライフサイクルのフックが移り変わりを観測し、フレームワークの内側に触れずにボードを操作できます。

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

`hermes <subcommand>` をまるごと実行したいとき（`hermes kanban show` など）は、`ctx.dispatch_tool("terminal", {"command": "hermes kanban show ..."})` のように `terminal` ツールでシェルに出してください。ヘッドレスのワーカーのセッション向けに、プロセスの中でスラッシュコマンドをつなぐ橋はありません。フックから Hermes を動かす正式なやり方はツールです。

### Slack の Block Kit のボタン操作を受け取る {#handle-slack-block-kit-button-clicks}

対話的な要素（ボタン、オーバーフローのメニュー、日付の選択など）を含む Block Kit のメッセージを投稿するプラグインは、その操作のハンドラを Slack のアダプタに直接登録できます。`slack_bolt.AsyncApp` に猿パッチを当てる必要はありません。

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

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `action_id` | `str \| re.Pattern \| dict` | `slack_bolt.App.action()` が受け付けるものなら何でも。文字列そのままの `action_id`、複数の ID に一致するコンパイル済みの正規表現、`{"action_id": "...", "block_id": "..."}` のような制約の辞書です |
| `callback` | async の呼び出し可能オブジェクト | slack_bolt の約束どおり `(ack, body, action)` を受け取ります |

**実行時の振る舞い:**

- ハンドラはプラグインの読み込み時に順番待ちに入り、Slack のプラットフォームがつながったときにアダプタの `slack_bolt.AsyncApp` へ組み込まれます。
- 各コールバックは守りを固めて包まれます。ハンドラが例外を投げた場合、ゲートウェイはエラーを記録し、Slack が再送を止めるよう可能な限り ack を返します。
- slack_bolt の通常の決まりが当てはまります。3 秒以内に `await ack()` を呼び、それから長い処理をしてください。
- 複数のワークスペースで動かしている場合、ハンドラはつながっているどのワークスペースの操作でも発火します。範囲を絞りたいときは `body["team"]["id"]` を使ってください。

これが、プラグインが Slack の対話機能に参加するための公式なやり方です。古いプラグインは `SlackAdapter.connect` にパッチを当てているかもしれませんが、こちらの API を使ってください。Block Kit の操作だけでなく slack_bolt の機能全体（イベント、ショートカット、コマンド）を使いたいときは、下にある汎用の `register_platform_handler("slack", ...)` を使います。

### プラットフォーム固有のハンドラを登録する（どのプラットフォームでも） {#register-native-platform-handlers-any-platform}

本体のアダプタが振り分けないプラットフォームのイベント（追加の更新の種類、プラットフォーム固有のボタンのコールバック、リアクションやメンバーのイベント、Webhook の経路）を受け取りたいプラグインは、そのプラットフォームのアダプタが接続時に呼ぶハンドラの生成関数を登録できます。これは **すべての** ゲートウェイのプラットフォームで使えます。

```python
def register(ctx):
    def _wire(native, adapter):
        # native: the platform's client/app object (see table below)
        # adapter: the platform adapter instance (treat as read-only)
        # Import platform SDKs HERE so register() works without them.
        ...

    ctx.register_platform_handler("discord", _wire)
```

**引数の形:** `ctx.register_platform_handler(platform, factory) -> None`

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `platform` | `str` | ゲートウェイのプラットフォーム名、小文字（`"telegram"`、`"discord"`、`"slack"`、`"matrix"` など） |
| `factory` | 呼び出し可能オブジェクト | 接続時に `(native, adapter)` を受け取ります |

**プラットフォームごとの `native` の中身:**

| プラットフォーム | `native` のオブジェクト | よく使う入り口 |
|----------|-----------------|---------------|
| `telegram` | PTB の `Application` | `add_handler` — どの更新の種類でも、パターンで絞ったコールバック |
| `discord` | `discord.ext.commands.Bot` | `add_listener` — リアクション、メンバーのイベント、スレッド、ボイス |
| `slack` | `slack_bolt.AsyncApp` | `app.event()` / `app.action()` / `app.command()` |
| `matrix` | Matrix のクライアント | イベントのコールバック |
| `teams` | Teams の `App` | `on_message` / `on_card_action` のデコレータ |
| `dingtalk` | `DingTalkStreamClient` | 他のストリームの話題に対する `register_callback_handler` |
| `feishu` | lark_oapi のクライアント | API の呼び出し、イベントの振り分け |
| `line`、`api_server`、`msgraph_webhook` | aiohttp の `web.Application` | `router.add_get/post` — 独自の経路（ルーターが固まる前につながれます） |
| それ以外すべて（whatsapp、signal、irc、email、sms、ntfy、wecom、weixin、bluebubbles、yuanbao など） | `None` | 接続時の入り口。`adapter` のハンドル越しに作業します |

**実行時の振る舞い:**

- 生成関数はプラグインの読み込み時に順番待ちに入り、そのプラットフォームがつながったときに呼ばれます。振り分けの順番が効くプラットフォーム（Telegram、Slack、Teams、aiohttp のルーター）では、本体のハンドラが登録される **前** に走るので、範囲を絞ったプラグインのハンドラが先に効き、それ以外は下へ流れます。
- **最初に一致したものが勝つ振り分けの表に足すハンドラは、必ず範囲を絞ってください。** Telegram なら `CallbackQueryHandler(..., pattern=r"^myplugin:")` のようにします。範囲を絞らないハンドラは、本体のボタンの流れ（実行の承認、モデルの選択、確認の問いかけ）を飲み込んでしまいます。
- 生成関数はそれぞれ隔離されています。例外を投げても、記録されるだけでプラットフォームはつながります。
- プラットフォームの SDK は、モジュールの先頭ではなく生成関数の中で import してください。`register()` は SDK が入っていなくても動かなければなりません。
- 1 つのプラグインが複数のプラットフォーム向けに生成関数を登録できます。それぞれ、自分のプラットフォームがつながったときだけ発火します。

**Telegram の別名:** `ctx.register_telegram_handler(factory)` は、`ctx.register_platform_handler("telegram", factory)` の後方互換の別名です。

例 — Telegram で、パターンを絞ったインラインのボタン:

```python
def register(ctx):
    def _wire(application, adapter):
        from telegram.ext import CallbackQueryHandler

        async def _on_button(update, context):
            query = update.callback_query
            await query.answer()
            # ...handle "myplugin:*" callbacks

        application.add_handler(
            CallbackQueryHandler(_on_button, pattern=r"^myplugin:")
        )

    ctx.register_platform_handler("telegram", _wire)
```

例 — Discord で、リアクションのイベント:

```python
def register(ctx):
    def _wire(bot, adapter):
        async def on_raw_reaction_add(payload):
            ...  # e.g. reaction-based voting / moderation

        bot.add_listener(on_raw_reaction_add, "on_raw_reaction_add")

    ctx.register_platform_handler("discord", _wire)
```

:::tip
このページが扱うのは **一般的なプラグイン**（ツール、フック、スラッシュコマンド、CLI コマンド）です。以下の節では、専用のプラグインの種類ごとに書き方をざっと示します。フィールドの一覧と例は、それぞれの詳しい手引きへのリンクから見てください。
:::

## 専用のプラグインの種類 {#specialized-plugin-types}

Hermes には、一般的な差し込み口のほかに 5 つの専用のプラグインの種類があります。どれも `plugins/<category>/<name>/`（同梱）または `~/.hermes/plugins/<category>/<name>/`（ユーザー）の下にディレクトリとして置きます。約束事は種類ごとに違うので、必要なものを選んで、その詳しい手引きを読んでください。

### モデルプロバイダプラグイン — LLM のバックエンドを足す {#model-provider-plugins-add-an-llm-backend}

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

`get_provider_profile()` か `list_providers()` が最初に呼ばれたときに、遅らせて見つけられます。`auth.py`、`config.py`、`doctor.py`、`models.py`、`runtime_provider.py`、そして chat_completions の通信部分が自動でつながります。ユーザーのプラグインは、同じ名前の同梱プラグインを上書きします。

**詳しい手引き:** [モデルプロバイダプラグイン](/hermes/docs/developer-guide/model-provider-plugin/) — フィールドの一覧、差し替えられるフック（`prepare_messages`、`build_extra_body`、`build_api_kwargs_extras`、`fetch_models`）、api_mode の選び方、認証の種類、テストの方法。

### プラットフォームプラグイン — ゲートウェイのチャンネルを足す {#platform-plugins-add-a-gateway-channel}

`plugins/platforms/<name>/` にアダプタを置きます。

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

**詳しい手引き:** [プラットフォームアダプタを追加する](/hermes/docs/developer-guide/adding-platform-adapters/) — `BasePlatformAdapter` の約束の全体、メッセージの振り分け、認証による制限、設定の案内との組み合わせ。標準ライブラリだけで動く実例は `plugins/platforms/irc/` を見てください。

### メモリプロバイダプラグイン — セッションをまたぐ知識のバックエンドを足す {#memory-provider-plugins-add-a-cross-session-knowledge-backend}

`MemoryProvider` の実装を `plugins/memory/<name>/` に置きます。

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

メモリプロバイダは 1 つだけ選ぶ方式です。同時に有効になるのは 1 つで、`config.yaml` の `memory.provider` で選びます。

**詳しい手引き:** [メモリプロバイダプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/) — `MemoryProvider` の抽象基底クラスの全体、スレッドまわりの約束、プロファイルの分離、`cli.py` による CLI コマンドの登録。

### コンテキストエンジンプラグイン — コンテキストの圧縮部分を差し替える {#context-engine-plugins-replace-the-context-compressor}

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

コンテキストエンジンは 1 つだけ選ぶ方式で、`config.yaml` の `context.engine` で選びます。

**詳しい手引き:** [コンテキストエンジンプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)。

### 画像生成のバックエンド {#image-generation-backends}

`plugins/image_gen/<name>/` にプロバイダを置きます。

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

**詳しい手引き:** [画像生成プロバイダプラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/) — `ImageGenProvider` の抽象基底クラスの全体、`list_models()` / `get_setup_schema()` のメタデータ、`success_response()`/`error_response()` の補助関数、base64 と URL の出力の違い、利用者による上書き、pip での配布。

**参考になる実例:** `plugins/image_gen/openai/`（OpenAI SDK 経由の DALL-E / GPT-Image）、`plugins/image_gen/openai-codex/`、`plugins/image_gen/xai/`（Grok の画像生成）。

## Python を使わない拡張の口 {#non-python-extension-surfaces}

Hermes は、Python のプラグインではない拡張も受け付けます。それらは [差し込み口の一覧表](/hermes/docs/user-guide/features/plugins/#pluggable-interfaces--where-to-go-for-each) に載っています。以下の節では、それぞれの書き方を手短に示します。

### MCP サーバー — 外部のツールを登録する {#mcp-servers-register-external-tools}

Model Context Protocol（MCP）のサーバーは、Python のプラグインなしで自分のツールを Hermes に登録します。`~/.hermes/config.yaml` に書いてください。

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

Hermes は起動時にそれぞれのサーバーへつなぎ、ツールの一覧を取得して、組み込みのツールと並べて登録します。LLM から見れば、他のツールとまったく同じです。**詳しい手引き:** [MCP](/hermes/docs/user-guide/features/mcp/)。

### ゲートウェイのイベントフック — ライフサイクルのイベントで発火する {#gateway-event-hooks-fire-on-lifecycle-events}

マニフェストとハンドラを `~/.hermes/hooks/<name>/` に置きます。

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

イベントには `gateway:startup`、`session:start`、`session:end`、`session:reset`、`agent:start`、`agent:step`、`agent:end`、そしてワイルドカードの `command:*` があります。フックの中のエラーは受け止められて記録され、本流の処理を止めることはありません。

**詳しい手引き:** [ゲートウェイのイベントフック](/hermes/docs/user-guide/features/hooks/#gateway-event-hooks)。

### シェルフック — ツール呼び出しに合わせてシェルコマンドを実行する {#shell-hooks-run-a-shell-command-on-tool-calls}

ツールが動いたときにスクリプトを走らせたいだけなら（通知、監査のログ、デスクトップの警告、自動の整形など）、`config.yaml` のシェルフックを使ってください。Python は要りません。

```yaml
hooks:
  - event: post_tool_call
    command: "notify-send 'Tool ran: {tool_name}'"
    when:
      tools: [terminal, patch, write_file]
```

Python のプラグインのフックと同じイベント（`pre_tool_call`、`post_tool_call`、`pre_llm_call`、`post_llm_call`、`on_session_start`、`on_session_end`、`pre_gateway_dispatch`）に対応しており、さらに `pre_tool_call` で停止を判断するための構造化された JSON の出力も使えます。

**詳しい手引き:** [シェルフック](/hermes/docs/user-guide/features/hooks/#shell-hooks)。

### スキルの取得元 — 独自のスキル登録簿を足す {#skill-sources-add-a-custom-skill-registry}

スキルを集めた GitHub のリポジトリを持っている場合や、組み込みの取得元以外のコミュニティの索引から取りたい場合は、**タップ** として足してください。

```bash
hermes skills tap add myorg/skills-repo
hermes skills search my-workflow --source myorg/skills-repo
hermes skills install myorg/skills-repo/my-workflow
```

自分のタップを公開するのは、`skills/<skill-name>/SKILL.md` というディレクトリを置いた GitHub のリポジトリを作るだけです。サーバーも登録簿への申し込みも要りません。

**詳しい手引き:** [スキルハブ](/hermes/docs/user-guide/features/skills/#skills-hub) · [独自のタップを公開する](/hermes/docs/user-guide/features/skills/#publishing-a-custom-skill-tap)（リポジトリの構成、最小の例、既定以外のパス、信頼の水準）。

### コマンドのテンプレートで TTS / STT をつなぐ {#tts-stt-via-command-templates}

音声やテキストを読み書きする CLI なら、どれでも `config.yaml` からつなげます。Python のコードは要りません。

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

STT では、`HERMES_LOCAL_STT_COMMAND` に argv へ分解済みのテンプレートを指定します。これはシェルの解釈を挟まずに実行されます。信頼している手元のコマンドがシェルの構文を必要とするなら、`sh -c`、`cmd /c`、PowerShell で明示的に包んでください。使える差し込み文字列は、TTS が `{input_path}`、`{output_path}`、`{format}`、`{voice}`、`{model}`、`{speed}`、STT が `{input_path}`、`{output_dir}`、`{language}`、`{model}` です。パスを受け渡しする CLI なら、それだけで自動的にプラグインになります。

**詳しい手引き:** [TTS の独自コマンドプロバイダ](/hermes/docs/user-guide/features/tts/#custom-command-providers) · [STT](/hermes/docs/user-guide/features/tts/#voice-message-transcription-stt)。

## pip で配る {#distribute-via-pip}

プラグインを広く配りたいときは、Python のパッケージにエントリポイントを足します。

```toml
# pyproject.toml
[project.entry-points."hermes_agent.plugins"]
my-plugin = "my_plugin_package"
```

```bash
pip install hermes-plugin-calculator
# Plugin auto-discovered on next hermes startup
```

## NixOS 向けに配る {#distribute-for-nixos}

:::warning Nix は明示的な対応の対象ではなくなりました
Nix / NixOS は、明示的に対応するインストールの経路ではなくなりました（できる範囲での対応です）。[Nix のセットアップ](/hermes/docs/getting-started/nix-setup/) を見てください。この節は、すでに NixOS で運用している方のために残してあります。
:::

エントリポイントを書いた `pyproject.toml` を用意しておけば、NixOS の利用者は宣言的にプラグインを入れられます。

**エントリポイント型のプラグイン**（配布におすすめ）:
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

**ディレクトリ型のプラグイン**（`pyproject.toml` は不要）:
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

オーバーレイの使い方や衝突の確認も含めた完全な説明は、[Nix のセットアップの手引き](/hermes/docs/getting-started/nix-setup/#plugins) を見てください。

## よくある間違い {#common-mistakes}

**ハンドラが JSON の文字列を返していない:**
```python
# Wrong — returns a dict
def handler(args, **kwargs):
    return {"result": 42}

# Right — returns a JSON string
def handler(args, **kwargs):
    return json.dumps({"result": 42})
```

**ハンドラの引数に `**kwargs` がない:**
```python
# Wrong — will break if Hermes passes extra context
def handler(args):
    ...

# Right
def handler(args, **kwargs):
    ...
```

**ハンドラが例外を投げる:**
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



