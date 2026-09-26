---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "Hermes プラグインを作る"
description: "ツール、フック、データファイル、スキルを備えた完全な Hermes プラグインをステップごとに構築するガイド"
upstream_path: developer-guide/plugins/index.md
upstream_blob: 2833d5e32dc4becc50fedb0892b6ad7e7853b4b5
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/plugins
---

# Hermes プラグインを作る {#build-a-hermes-plugin}

このガイドでは、Hermes プラグインを一から作り上げる手順を通して解説します。最後まで進めると、複数のツール、ライフサイクルフック、同梱データファイル、バンドルされたスキルを備えた、実際に動くプラグインが手元に残ります — プラグインシステムが対応するすべての要素が含まれています。

:::info どのガイドが必要かわからない場合
Hermes にはいくつも異なるプラグイン可能なインターフェースがあります — 一部は Python の `register_*` API を使い、他は設定駆動やドロップイン形式のディレクトリです。まずはこの対応表を確認してください。

| 追加したいもの… | 読むべきガイド |
|---|---|
| カスタムツール、フック、スラッシュコマンド、スキル、CLI サブコマンド | **このガイド**（一般的なプラグイン領域） |
| **ネイティブデスクトップアプリ**の拡張（ペイン、ページ、ステータスバー、パレット、テーマ） | [Desktop Plugin SDK](/hermes/docs/developer-guide/desktop-plugin-sdk/) |
| **Web ダッシュボード**の拡張（タブ、シェルスロット、テーマ） | [Extending the Dashboard](/hermes/docs/user-guide/features/extending-the-dashboard/) |
| **LLM / 推論バックエンド**（新しいプロバイダー） | [Model Provider Plugins](/hermes/docs/developer-guide/model-provider-plugin/) |
| **ゲートウェイチャネル**（Discord/Telegram/IRC/Teams など） | [Adding Platform Adapters](/hermes/docs/developer-guide/adding-platform-adapters/) |
| **メモリバックエンド**（Honcho/Mem0/Supermemory など） | [Memory Provider Plugins](/hermes/docs/developer-guide/memory-provider-plugin/) |
| **コンテキスト圧縮エンジン** | [Context Engine Plugins](/hermes/docs/developer-guide/context-engine-plugin/) |
| **画像生成バックエンド** | [Image Generation Provider Plugins](/hermes/docs/developer-guide/image-gen-provider-plugin/) |
| **動画生成バックエンド** | [Video Generation Provider Plugins](/hermes/docs/developer-guide/video-gen-provider-plugin/) |
| **Web 検索 / 抽出バックエンド** | [Web Search Provider Plugins](/hermes/docs/developer-guide/web-search-provider-plugin/) |
| **クラウドブラウザバックエンド**（Browserbase 型の CDP セッションプロバイダー） | [Browser Provider Plugins](/hermes/docs/developer-guide/browser-provider-plugin/) |
| **シークレットマネージャーバックエンド**（vault / パスワードマネージャー / OS キーストア） | [Secret Source Plugins](/hermes/docs/developer-guide/secret-source-plugin/) |
| **ダッシュボードの OIDC / 認証プロバイダー** | [Web Dashboard — custom providers](/hermes/docs/user-guide/features/web-dashboard/#custom-providers) — `ctx.register_dashboard_auth_provider()` |
| **TTS バックエンド**（任意の CLI — Piper、VoxCPM、Kokoro、音声クローンなど） | [TTS custom command providers](/hermes/docs/user-guide/features/tts/#custom-command-providers) — 設定駆動で Python は不要 |
| **STT バックエンド**（カスタム whisper / ASR CLI） | [Voice Message Transcription](/hermes/docs/user-guide/features/tts/#voice-message-transcription-stt) — `HERMES_LOCAL_STT_COMMAND` に argv トークン化されたテンプレートを設定する |
| **MCP 経由の外部ツール**（filesystem、GitHub、Linear、任意の MCP サーバー） | [MCP](/hermes/docs/user-guide/features/mcp/) — `config.yaml` に `mcp_servers.<name>` を宣言する |
| **ゲートウェイイベントフック**（起動時・セッションイベント・コマンドで発火） | [Event Hooks](/hermes/docs/user-guide/features/hooks/#gateway-event-hooks) — `HOOK.yaml` と `handler.py` を `~/.hermes/hooks/<name>/` に置く |
| **シェルフック**（イベントでシェルコマンドを実行） | [Shell Hooks](/hermes/docs/user-guide/features/hooks/#shell-hooks) — `config.yaml` の `hooks:` 以下で宣言する |
| **追加のスキルソース**（カスタム GitHub リポジトリ、プライベートスキルインデックス） | [Skills](/hermes/docs/user-guide/features/skills/) — `hermes skills tap add <repo>` ・ [Publishing a tap](/hermes/docs/user-guide/features/skills/#publishing-a-custom-skill-tap) |
| プラグインではないファーストクラスの **core** 推論プロバイダー | [Adding Providers](/hermes/docs/developer-guide/adding-providers/) |

設定駆動型（TTS、STT、MCP、シェルフック）とドロップインディレクトリ型（ゲートウェイフック）の両方を含む、すべての拡張ポイントを一覧できる完全な [Pluggable interfaces table](/hermes/docs/user-guide/features/plugins/#pluggable-interfaces--where-to-go-for-each) も参照してください。
:::

:::caution サードパーティ製品向けプラグインは単体で配布する — core ツリーには入れない
**他者のプロダクトやプロジェクト**と連携するプラグイン — 可観測性 / メトリクスバックエンド、ベンダー SaaS コネクタ、分析ダッシュボード、有料サービス連携など — は `NousResearch/hermes-agent` にマージされず、**単体のプラグインリポジトリ**として構築・配布されます。ユーザーはこれらを `~/.hermes/plugins/` にインストールするか、pip のエントリーポイント経由で導入します。このガイドの内容はすべて、単体リポジトリからでも同じように機能します。これは結合と保守に関する判断であって（core は速く動き、あなたのバックエンドを私たちは所有していません）、品質の基準ではありません — 優れたプラグインであっても、それ自身のリポジトリに属するべきことがあります。Nous Research の Discord の `#plugins-skills-and-skins` チャンネルで宣伝してください。方針の詳細は [CONTRIBUTING.md](https://github.com/NousResearch/hermes-agent/blob/main/CONTRIBUTING.md) を参照してください。
:::

## ポータブル Agent Plugins v1 パッケージ {#portable-agent-plugins-v1-packages}

Hermes は、Agent Plugins v1.0.0 形式を対象としたディレクトリパッケージのインストールと読み込みにも対応しています。これは Hermes が既に持っているポータブルなコンポーネント向けの互換アダプタであり、ネイティブな `plugin.yaml` と `register(ctx)` によるプラグインを置き換えるものではありません。

```text
my-portable-plugin/
├── plugin.json
├── skills/
│   └── summarize/
│       ├── SKILL.md
│       └── references/
└── mcp.json
```

通常のワークフローでポータブルパッケージをインストールし、有効化します。

```bash
hermes plugins install owner/repository --no-enable
hermes plugins list
hermes plugins enable <plugin-name>
```

ポータブルパッケージはインストール後、明示的に有効化しない限り無効のままです。有効化されたパッケージは、`skills/*/SKILL.md` ディレクトリと、ルートの `mcp.json` による stdio MCP サーバーを即座に提供できます。スキルは読み取り専用で名前空間化され、`skills_list` と `skill_view` を通じて読み込まれます。MCP コマンドは、シェルを経由せず、単一の実行可能トークンと別個の引数リストとして渡されます。完全修飾されたスキル名を確認するには `skills_list` を使ってください。ポータブルスキルの名前空間は `agent-plugin-<slug>-<hash>` という決定的な形式を持ち、検出されたプラグインキーから導出されるため、サニタイズ後の名前が衝突することはありません。ポータブルパッケージの MCP サーバーは、`mcp.json` で付けられた名前をそのまま使います。ユーザー自身の `mcp_servers` ブロックと同じ規則です。これにより、モデルから見える `mcp__<server>__<tool>` という名前でも、プロバイダーの64文字の上限の中にツールの動詞が収まります。サーバー名の重複は読み込み時の衝突として扱われます。`config.yaml` のサーバーはパッケージより優先され、先に読み込まれたパッケージが後のものより優先されます。負けた側は、両方の名前を挙げた警告とともにスキップされます。

Hermes は `plugin.json`、Agent Skills のフロントマター、固定されたコンポーネントの配置、`mcp.json`、解決済みパス、シンボリックリンクの内包関係をローカルで検証します。パッケージの読み込み中に JSON スキーマを取得することはありません。不正なスキルや MCP エントリは、有効な兄弟コンポーネントがまだ読み込める場合、その境界だけでスキップされます。`PLUGIN_ROOT` は解決済みのパッケージルートを指します。`PLUGIN_DATA` は Hermes が管理する、プロファイルスコープの書き込み可能なディレクトリを指します。
ポータブル MCP の `env` に宣言された値は可視のパッケージデータであり、シークレット保管の仕組みではありません。`mcp.json` に認証情報を置かないでください。

現在サポートされているポータブルのサブセットは、stdio と Streamable HTTP の MCP エントリです。ポータブルな `streamable-http` エントリは、Hermes の既存のネイティブなリモート MCP クライアント（URL ベースの `mcp_servers` 設定を支えるのと同じランタイム）を通じてルーティングされ、v1 の境界規則が適用されます: URL はユーザー情報やフラグメントを含まない絶対 http(s) でなければならず、プレーンな HTTP は `localhost` / ループバックホストに対してのみ許可され、設定されたヘッダーはクロスオリジンのリダイレクトを越えて転送されることはありません。旧来の `sse` エントリは報告されてスキップされます。Agent Plugins v1 は、trust、permissions、provenance、sandbox のいずれも定義していません。パッケージを有効化すると、その instructions とローカル実行ファイルには、他のインストール済み Hermes プラグインと同じフルトラストの扱いが与えられます。

[rendered specification](https://agent-plugins.org/specification) は現在 v1.0.0 を Working Draft としていますが、[versioned specification repository](https://github.com/agentplugins/agent-plugins-spec/blob/main/spec/1.0.0.md) では Published として記録されています。Hermes は、どちらの可変なステータスラベルでもなく、正規の v1.0.0 スキーマ識別子と規範テキストに動作を紐づけています。これは Agent Plugins への完全準拠を主張するものではなく、明示的にサポートされるサブセットです。

## ネイティブプラグインの互換性契約 {#native-plugin-compatibility-contract}

ネイティブな `plugin.yaml` と `register(ctx)` によるプラグインは、単一のグローバルなプラグイン API 番号ではなく、振る舞いによって保護されています。Hermes は `PLUGIN_API_VERSION` を公開せず、マニフェスト全体で `api:` の一致を要求することもなく、無関係な値に API バージョンを付与することもありません。文書化された振る舞いを使うプラグインは、通常の Hermes アップグレードの後も動作し続けるはずです。

互換性の規則は次のとおりです。

- **加算的に進化する。** 文書化された `PluginContext` のメソッドは削除・リネームされません。新しいパラメータは省略可能で、デフォルト値を持ち、キーワード専用であるべきです。既存の戻り値フィールドは削除・暗黙の型変更をされません。
- **フックのペイロードはキーワードペイロードである。** 新しいフックデータは、既存フィールドの意味や位置を変えることなく、キーワードフィールドとして追加されます。Hermes はコールバックのシグネチャを検査します: 従来のコールバックは自身が宣言したフィールドだけを受け取り、`**kwargs` を持つコールバックは現在のペイロード全体を受け取ります。新しいプラグインは `**kwargs` を受け入れるべきです。そうすれば、シグネチャを変えずに追加データを取り込めます。
- **マニフェストは追加に対して開いている。** `plugin.yaml` の未知のフィールドは無視されます。したがって古い Hermes のリリースでも、プラグインのコード自体がサポート済みのランタイム動作を使っていれば、新しいリリースで導入されたメタデータを含むマニフェストのプラグインを読み込めます。
- **プロバイダーインターフェースはデフォルト値によって成長する。** 新しいプロバイダーのメソッドにはデフォルト実装があります。新しいコールバックコンテキストは省略可能で、シグネチャ検査によってプロバイダーがそれを受け取れると分かった場合にのみ転送されます。抽象メソッドや無条件で転送される引数を追加するには、フラグデー的な一括切り替えではなく移行期間が必要です。
- **境界を越える契約にはバージョンを付ける。** ワイヤーペイロードや永続化形式を定義する機能（observer のペイロードや secret-source の状態など）は、独自のスキーマバージョンを持てます。そのローカルなスキーマ内ではフィールドを加算的に保ってください。永続化されたプラグインの状態や設定は読み取り可能なままにするか、明示的な移行を提供してください。古い形式で書かれた再開セッションは、依然としてリプレイできなければなりません。無関係なコールバックやコンテキストの値にバージョンリテラルを追加しないでください。

### 廃止方針 {#deprecation-policy}

文書化されたネイティブプラグインの振る舞いを廃止できるのは、次のすべてを満たす場合だけです。

1. プラグインガイドとリリースノートに、置き換え先と移行手順が示されていること。
2. プロセスごとに最大 1 回だけ警告が発せられ、置き換え先と最短の削除リリースが名指しされること。
3. 古い振る舞いが、少なくとも後続の 2 回のマイナーリリースの間サポートされること。
4. その期間中、旧経路と新経路の両方に対して振る舞いベースの互換性カバレッジがあること。

期間終了後の削除には、永続化データや再開可能なセッションに必要な移行がすべて含まれていなければなりません。実務上は、削除よりも加算的なエイリアスやアダプタが好まれます。

Hermes は、隔離された `HERMES_HOME` から検出される固定済みの外部プラグインフィクスチャで、この契約を強制します。これらのテストは `PluginManager` を通じてプラグインを読み込み・呼び出し、内部のシンボル一覧やソースコードの形ではなく、実際の登録とコールバックの結果を検証します。

### 2026年9月のモジュール分割: 旧インポートパスは2026-09-14に終了 {#sep-2026-module-decomposition-old-import-paths-end-2026-09-14}

Hermes の内部は、2026年9月（PR #102117）に `<stem>_<topic>` という兄弟モジュールへ分割されました。**Internal

は **2026-09-14** まで旧モジュールから解決され、その後互換レイヤーが削除されます。

- **プラグインを確認する:** `hermes plugins compat /path/to/your/plugin` は、旧パスと新パスを示す `file:line` をすべて列挙し、1 件でも残っていれば終了コード 1 を返します。リポジトリの `COMPAT_MANIFEST.md` が完全な対応表です。
- **ユーザーに見えるもの:** CLI バナー下の通知、`hermes doctor` と `hermes update` の後の通知、そしてプラグイン名を示す 1 回だけの Desktop ダイアログです。旧パスを経由した解決 1 回ごとに、プロセスごとに 1 回だけ `HermesPluginCompatWarning` も発せられます。
- **2026-09-14 以降:** 旧パスを import し続けているプラグインは**読み込まれなくなります**（理由は `hermes plugins list` に表示されます）。ユーザーは、レイヤーが実際に削除されるまで `plugins.allow_deprecated_imports: true` で強制読み込みできますが、削除後は旧パスが `ImportError` を発生させます。

## 作るもの {#what-youre-building}

2つのツールを持つ **calculator** プラグインです。
- `calculate` — 数式を評価する（`2**16`、`sqrt(144)`、`pi * 5**2`）
- `unit_convert` — 単位を変換する（`100 F → 37.78 C`、`5 km → 3.11 mi`）

さらに、すべてのツール呼び出しを記録するフックと、バンドルされたスキルファイルも作ります。

## ステップ1: プラグインディレクトリを作る {#step-1-create-the-plugin-directory}

ディレクトリを作成し、ステップ2に進みます。

```bash
mkdir -p ~/.hermes/plugins/calculator
cd ~/.hermes/plugins/calculator
```

### Plugin Doctor で検証する {#validate-with-plugin-doctor}

`hermes plugins doctor [path-or-id]` は、Hermes 自身が使っているのと同じディレクトリ検出、マニフェストパーサー、名前空間付き import、`register(ctx)`、フックレジストリ、ツールレジストリを実行します。不正なフック名、`**kwargs` を受け取らないコールバック、登録の失敗、宣言済みとの登録済みツール/フックのずれを報告します。エラー時に終了コードを非ゼロにするには `--ci` を渡します。

```bash
hermes plugins doctor . --ci
```

Doctor は一時的な `HERMES_HOME` を使い、チェック後にプラグインの登録状態を復元し、登録実行中の Python ソケット接続を直接ブロックして偶発的なネットワークアクセスを検出します。これはサンドボックスではありません — プラグインのコードは現在のユーザーの権限でプロセス内で実行され、サブプロセスを起動することもできるため、import してよいと信頼できるコードにだけ Doctor を実行してください。

## ステップ2: マニフェストを書く {#step-2-write-the-manifest}

`plugin.yaml` を作成します。

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

これは Hermes に次のことを伝えます。「私は calculator という名前のプラグインで、ツールとフックを提供します」。`provides_tools` と `provides_hooks` は、プラグインが登録するものの一覧です。

追加できる任意のフィールドの例です。
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

### capabilities を宣言する {#declaring-capabilities}

プラグインが権限を要する host のサーフェス — 組み込みツールの上書き、`ctx.llm` 呼び出しに使うモデルの選択など — を必要とする場合は、`capabilities:` に宣言します。インストール/有効化のタイミングでユーザーにその一覧が示され、一度だけ同意します。後のバージョンで capability が追加された場合、更新フローはその追加分についてだけ再度確認します。宣言されていない、または同意されていない capability は単純にオフになります（フェイルクローズ）。そのため、**使う前に確認し、なければ穏やかに縮退動作してください**。

```python
def register(ctx):
    if ctx.has_capability("tools.override"):
        ctx.register_tool(..., override=True)
    else:
        ctx.register_tool(...)   # register under a non-conflicting name
```

既知の capability id は `tools.override`、`llm.provider_override`、`llm.model_override`、`llm.agent_id_override`、`llm.profile_override`、`llm.task_override` です（正本のレジストリは `hermes_cli/plugin_capabilities.py`）。未知の id は無視されます。旧来の capability ごとの設定キー（`plugins.entries.<id>.allow_tool_override` など）も依然として動作しますが非推奨です — ユーザーが単一の、監査可能な同意画面を得られるように、代わりに capability を宣言してください。capability は同意と監査であり、**サンドボックスではありません**。それらは host の API サーフェスをゲートするだけです。

**pip で配布されるプラグイン**には、インストール後の `plugin.yaml` ディレクトリがありません。そのため、代わりに配布メタデータで capability を宣言します。companion となる `hermes_agent.plugin_capabilities` エントリーポイントグループを使います。各宣言は `<plugin-id>.<capability-id>` という名前で、`hermes_agent.plugins` エントリーポイントと同じオブジェクトを指します。

```toml
[project.entry-points."hermes_agent.plugins"]
calculator = "my_pkg:register"

[project.entry-points."hermes_agent.plugin_capabilities"]
"calculator.tools.override" = "my_pkg:register"
```

Hermes はこれらをインストール済みメタデータから読み取り、あなたのコードを import しません。そのため、`hermes plugins capabilities` と同意フローは、pip インストールでも正確な状態を保ちます。

### マニフェスト v2 一覧 {#manifest-v2-reference}

`plugin.yaml` は加算的な **v2 スキーマ**（#64165）にも対応しています。すべてのフィールドは省略可能です。`manifest_version` を持たないマニフェストは v1 マニフェストであり、今後も永続的に完全サポートされます。未知のフィールドは読み込みを壊しません — 警告付きで無視されます（前方互換性）。また、このバージョンの Hermes が理解できない新しい `manifest_version` でも、警告付きで読み込まれます。

| フィールド | 型 | 意味 |
|---|---|---|
| `manifest_version` | int | マニフェストの**ファイル形式**バージョン。省略時は `1`。現在の最大値: `2`。`api_version` とは独立。 |
| `api_version` | int | プラグインが対象とするランタイムの**プラグイン API 世代**（ctx サーフェス / フックのシグネチャ）。`manifest_version` とは意図的に別軸で、`api_version: 1` のプラグインが v2 マニフェストを使うこともできる。 |
| `requires_plugins` | list | プラグイン間の依存関係: `version_range: ">=1.0,<2"` を任意で指定した `- id: other-plugin`。**あくまで助言**: 依存先がなくても明確な警告が出るだけでプラグインは読み込まれる — 実行時に `ctx.has_plugin("other-plugin")` で確認する。読み込みの**順序**はこの依存関係を尊重する: A が B を要求する場合、B の `register()` は A より先に実行される（トポロジカルソート、アルファベット順のタイブレーク。循環は警告しアルファベット順にフォールバックする）。 |
| `python_dependencies` | list of str | 宣言した Python の要件（例: `"requests>=2.0,<3"`）。インストール時には同意を求める。有効化すると、既存の core・追加パッケージ・有効なプラグインの和集合とあわせて、候補を PM に受け入れる。準備が成功すると、環境と設定がトランザクションとして反映される。失敗したときは、以前の選択と有効なプラグインの集合がそのまま残る。同意しなかった場合、インストールしたプラグインは無効のままになる。上限を固定すること。 |
| `python_runtime` | str | `external` — プラグインが自身のインタプリタ/venv を管理する（サイドカーパターン）。Hermes は何もインストールせず、既存の `pyproject.toml` にも触れない。 |
| `config_schema` | mapping | `plugins.entries.<id>.settings` 以下のキーを記述する JSON-schema 風の説明: `api_url: {type: str, default: "", description: "...", required: false}`。読み込み時に検証され、不一致はキー名と期待する型を示す実用的な警告としてログに出る — 読み込みエラーにはならない。型は `str`、`int`、`float`、`bool`、`list`、`dict`（と JSON-schema の別名）、`secret`。Desktop の Plugins タブの設定フォームも駆動する — [Desktop の設定フォーム](#settings-form-in-the-desktop) を参照。 |
| `license` | str | SPDX 形式のライセンス id（例: `MIT`）。 |
| `homepage` | str | プロジェクトの URL。 |
| `tags` | list of str | 自由形式の発見用タグ（例: `[gateway, telegram]`）。 |

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
  - "somepkg>=1.0,<2"     # consent before PM admission
config_schema:
  api_url: {type: str, default: "", description: "Service endpoint"}
```

:::note 依存関係の共同受け入れ
プラグインをインストールすると、Python の依存関係について同意を求められます。プラグインを有効にすると、
その要件が core の依存関係・追加パッケージ・有効なプラグインとあわせて PM で準備されます。
パックの有効化も同じ受け入れのトランザクションを使います。有効なプラグインを入れ直すときは、
反映する前に、ステージングした宣言に対して同意を求めます。
拒否した場合は、インストール済みのプラグインと選択中の環境がそのまま残ります。

インストーラーと PM の受け入れは、対応していない `manifest_version` の値や、
満たされていない `requires_hermes` の制約を、反映する前に拒否します。
:::

### Python の依存関係 {#python-dependencies}

ディレクトリ型プラグインは、自身の PyPI パッケージを持ち込めます。マニフェスト内（前述の `python_dependencies`）で宣言するか、より好ましい方法として、`plugin.yaml` の横に置く `pyproject.toml` で宣言します。

```toml
[project]
name = "my-plugin"
version = "1.0.0"
requires-python = ">=3.11"
dependencies = [
    "somepkg>=1.0,<2",
    "other[extra]>=3.11",
]
```

両方が存在する場合は `pyproject.toml` が優先されます。Hermes がこれらに対して行うことは次のとおりです。

- **インストール / 有効化** — PM は、core・選択した追加パッケージ・有効なプラグインの和集合を、
  依存関係のホームを共有するすべてのプロファイルにわたって解決します。独自の `HERMES_HOME` のルートも含みます。
  新しいプラグインは無効の状態でダウンロードされ、有効にする前に Python の依存関係への同意が必要です。
  `pyproject.toml` は、`python_dependencies` や旧来の `pip_dependencies` より優先されます。
- **不可分な反映** — PM は、有効化や、有効なプラグインの差し替えを反映する前に、新しい環境の世代を
  準備します。解決・ダウンロード・ビルドのどれかに失敗しても、以前の環境とプラグインの選択は
  そのまま残ります。既存のプラグインが犠牲になることはありません。
- **更新しても和集合は保たれる** — `hermes update` は、新しい世代を準備するときに有効なプラグインも
  含めます。更新後に pip で入れ直す処理はありません。`hermes plugins update` は、有効なプラグインの
  差し替えを準備してから、そのコードと依存関係の世代をまとめて入れ替えます。
- **要件の衛生管理** — 形式の崩れた PEP 508 の要件は拒否されます。環境マーカーはそのまま残り、
  対象のインタプリタが評価します。`hermes-agent` 自身への依存は、チェックアウトが Hermes を提供するので
  省かれます。URL を直接指定した要件は管理対象外です。それらには、プラグイン自身が持つ外部の
  ランタイムを使ってください。
- **`--no-deps`** を付けると、依存関係への同意なしで新しいプラグインをダウンロードし、`--enable` を
  付けていても無効のままにします。有効なプラグインを差し替えるときに、PM の受け入れを回避することはできません。
- **`python_runtime: external`** は、sidecar の依存関係を共有の和集合から外します。
  Hermes はその Python ランタイムをインストールせず、その宣言も変更しません。
- **読み込むものが何もないのはエラー** — `hermes plugins validate` は、`__init__.py`、
  `desktop/plugin.js`、`plugin.json` のいずれも横にない `plugin.yaml` を拒否します。pip レイアウトの
  パッケージには、ディレクトリ型プラグインのラッパーが必要です。
- `security.allow_lazy_installs: false` は、必要になった時点での取得を止めます。依存関係への明示的な
  同意と明示的な有効化があれば、PM の準備は許可されます。検出だけでインストールが起きることはありません。

`HERMES_HOME/plugins/` は `hermes update` と Desktop の更新を生き延びます — アップデータが再構築するのは venv とチェックアウトだけで、home ディレクトリには決して触れません。

### 依存関係のセキュリティ方針 {#dependency-security-policy}

Hermes は**自分自身の**依存関係を隔離しています。チェックアウトの `[tool.uv] exclude-newer = "14 days"` によって、Hermes 自身が依存するパッケージの新しいリリースは、公開から2週間は `hermes update` にも組み込みの遅延インストールにも取り込まれません。乗っ取られたアップロードがあっても、利用者に届く前に上流で見つかるようにするためです。**この隔離は、プラグインの依存関係には効きません。**Hermes がプラグインを自分の環境へ解決するとき、この期限がかかるのは Hermes 自身がロックしているパッケージだけで、それ以外にはかかりません。そのため、プラグインは昨日公開されたリリースを下限に指定して、今日インストールさせることができます。それで何が入ってくるかに責任を持つのは、Hermes ではなくプラグインの作者です。（Hermes 自身が依存するパッケージの新しい版を必要とするプラグインは、そのパッケージについては期間が明けるまで待つことになります。）

自分で方針を決めて、それを守ってください。強くおすすめするのは次のとおりです。

- **すべての依存関係に上限を付ける** — 安定版のパッケージなら `>=floor,<next_major`、1.0 未満のものなら `>=0.29,<0.32` のように書きます。`>=X.Y` だけでは、今後のリリースを確認しないまま全部受け入れることになります。
- **下限は、API の互換性がある最も古い版にする**。その週に出たばかりの版にはしません。出たばかりの wheel を下限にすると、公開されたその日からインストールする全員がその版を強いられます。`>=old,!=broken,<next` と書けば、広い範囲を保ったまま、問題のあるリリースだけを避けられます。
- **新しいリリースの隔離期間を自分でも設ける** — 下限を新しいリリースに上げるまで14日ほど待ち、自分の CI では `uv --exclude-newer "14 days"`（または `UV_EXCLUDE_NEWER`）で解決します。こうすると、テストしたロックと利用者が受け取るロックが同じになります。
- **ロックを固定し、更新は確認してから入れる。**依存関係の更新はコードの変更として扱ってください。上流の差分を読んでから、固定し直します。

プラグインカタログの審査では、固定された SHA 時点の依存関係の一覧（`plugin.yaml` または `pyproject.toml`）を読み、上限のない下限指定や上限の付け忘れを指摘します。下限が単に新しいというだけでは、掲載は保留されません。

## ステップ3: ツールスキーマを書く {#step-3-write-the-tool-schemas}

`schemas.py` を作成します — これは LLM が、いつあなたのツールを呼び出すかを判断するために読むものです。

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

**スキーマが重要な理由:** `description` フィールドは、LLM がいつそのツールを使うかを判断する手がかりです。何をするツールで、いつ使うべきかを具体的に書いてください。`parameters` は LLM が渡す引数を定義します。

## ステップ4: ツールハンドラーを書く {#step-4-write-the-tool-handlers}

`tools.py` を作成します — これは LLM がツールを呼び出したときに実際に実行されるコードです。

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

**ハンドラーの重要な規則:**
1. **シグネチャ:** `def my_handler(args: dict, **kwargs) -> str`
2. **戻り値:** 常に JSON 文字列。成功も失敗も同じです。
3. **決して raise しない:** すべての例外を捕捉し、代わりにエラー JSON を返します。
4. **`**kwargs` を受け入れる:** Hermes はコンテキストのキーワード（`task_id`、`session_id`、`user_task`、
   `parent_agent`、...）を注入し、あなたのシグネチャが名前を挙げているものだけを転送するので、`def handler(args)` でも
   動作します。`**kwargs` は、加算的に増えていく完全なコンテキストに参加するための方法です。

## ステップ5: 登録を書く {#step-5-write-the-registration}

`__init__.py` を作成します — これがスキーマとハンドラーを結びつけます。

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

**`register()` が行うこと:**
- 起動時に必ず1回だけ呼ばれます
- `ctx.register_tool()` はあなたのツールをレジストリに置きます — モデルはすぐにそれを認識します
- `ctx.register_hook()` はライフサイクルイベントを購読します
- `ctx.register_cli_command()` は CLI サブコマンド（例: `hermes my-plugin <subcommand>`）を登録します
- `ctx.register_command()` はセッション内のスラッシュコマンド（例: CLI / ゲートウェイのチャット内で `/myplugin <args>`）を登録します — 下の [スラッシュコマンドを登録する](#register-slash-commands) を参照してください
- `ctx.dispatch_tool(name, arguments)` — 承認、認証情報、task_id といった親エージェントのコンテキストを自動的に配線した状態で、他の任意のツール（組み込みでも別プラグインのものでも）を呼び出します。モデルが直接呼んだかのように `terminal`、`read_file`、その他のツールを呼び出す必要があるスラッシュコマンドハンドラーから使うと便利です。
- `ctx.get_config()` / `ctx.set_config()` はこのプラグインの設定名前空間だけにアクセスします。`ctx.state` は、アクティブなプロファイル下でプラグインが所有するランタイムデータを保存します。
- この関数がクラッシュした場合、そのプラグインは無効化されますが Hermes は問題なく続行します

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

ディスパッチされたツールは、通常の承認・redaction・budget のパイプラインを通ります — それらを回避する近道ではなく、実際のツール呼び出しです。

### 設定とランタイム状態を保存する {#store-settings-and-runtime-state}

ユーザーに見える振る舞いには、プラグイン相対の設定キーを使ってください。Hermes はそれらを
`plugins.entries.<plugin-id>.settings` の下で解決し、グローバル、他プラグイン、トラバーサルの各種パスは拒否します。

```python
def register(ctx):
    endpoint = ctx.get_config("endpoint", default="https://example.invalid")
    retries = ctx.get_config("retry.attempts", default=3)

    ctx.set_config("endpoint", endpoint)
    ctx.set_config("retry.attempts", retries)
```

`config.yaml` にランタイムの記録を置くのではなく、プラグインが所有するカーソル、キャッシュ、重複排除データには
`ctx.state` を使ってください。

```python
def register(ctx):
    cursor = ctx.state.get("cursor", default={"page": 0})
    ctx.state.set("cursor", {"page": cursor["page"] + 1})
```

state はプロファイルスコープで、アトミックに置き換えられ、複数の書き手に対して安全で、プラグインごとに 10 MiB に制限されます。ポータブルパッケージは、`PLUGIN_DATA` として同じディレクトリを共有します。ネイティブプラグインは、衝突耐性のある Windows 安全な名前空間を受け取ります。既存の state が壊れている場合は、それが報告され、保持されます。

設定と state は所有者が異なります: 設定は `config.yaml` にあるユーザーに見える振る舞いであり、state は `<HERMES_HOME>/plugin-data/` にあるプラグイン所有のランタイムデータです。どちらの API も、他プラグインの名前空間を公開しません。

### Desktop の設定フォーム {#settings-form-in-the-desktop}

マニフェストの `config_schema` に宣言した各キーは、Desktop アプリの **Capabilities → Plugins** タブ（プラグインの行にある歯車アイコン）でフィールドとして表示されます。Desktop 側のコードは不要です — バックエンドの `plugins.manage list` がスキーマと各キーの現在値を返し、保存すると `ctx.set_config()` と同じ書き込み経路を通るため、`plugins.entries.<id>.settings.<key>` があなたのプラグインが読み返す値になります。フォームは `type` によって表駆動されます。

| マニフェストの `type` | フィールド | 追加のキー |
|---|---|---|
| `str`（既定） | テキスト入力 | `choices: [a, b]`（または `enum:`）を指定するとドロップダウンになる |
| `int`、`float` | 数値入力 | |
| `bool` | スイッチ | |
| `list`、`dict` | JSON エディタ | |
| `secret` | マスクされた入力 | `env: MY_PLUGIN_TOKEN` — 値が格納される `.env` 変数名（既定は `<PLUGIN_ID>_<KEY>` の大文字スネークケース） |

すべてのエントリは `label`（キーの代わりに表示される名前）、`description`（フィールド下のヘルプテキスト）、`default`、`required` も受け付けます。

```yaml
config_schema:
  api_url: {type: str, default: "https://api.example.com", label: "API URL", description: "Service endpoint"}
  retries: {type: int, default: 3}
  mode: {type: str, choices: [fast, careful], default: fast}
  api_key: {type: secret, env: MY_PLUGIN_API_KEY, description: "Personal access token"}
```

**シークレットは `config.yaml` に一切触れません。** `secret` フィールドは `.env` の変数名と、値が設定済みかどうかだけを保持します。Desktop はプロバイダーの API キーと同じ認証情報の経路（`PUT /api/env`）で値を保存し、あなたのプラグインは `requires_env` のエントリとまったく同じように `os.environ.get("MY_PLUGIN_API_KEY")` で読み取ります。`plugins.manage settings` アクションは、シークレットキーの変更や、型または `choices` がスキーマと矛盾する値を拒否します。

## ステップ6: テストする {#step-6-test-it}

Hermes を起動します。

```bash
hermes
```

バナーのツール一覧に `calculator: calculate, unit_convert` が表示されるはずです。

次のプロンプトを試してください。
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

出力:
```
Plugins (1):
  ✓ calculator v1.0.0 (2 tools, 1 hooks)
```

### プラグインの検出をデバッグする {#debugging-plugin-discovery}

プラグインが表示されない、または表示されても読み込まれない場合は、`HERMES_PLUGINS_DEBUG=1` を設定すると、詳細な検出ログが stderr に出力されます。

```bash
HERMES_PLUGINS_DEBUG=1 hermes plugins list
```

すべてのプラグインソース（bundled、user、project、entry-points）について、次が表示されます。

- スキャンされたディレクトリと、それぞれが生み出したマニフェストの数
- マニフェストごとに: 解決済みのキー、名前、種類、ソース、ディスク上のパス
- スキップされた理由: `disabled via config`、`not enabled in config`、`exclusive plugin`、`no plugin.yaml, depth cap reached`
- 読み込み時: import されているプラグインと、`register(ctx)` が登録したもの（ツール、フック、スラッシュコマンド、CLI コマンド）の1行サマリー
- 解析失敗時: 例外の完全なトレースバック（YAML スキャナーのエラーなど）
- `register()` の失敗時: `__init__.py` のどの行が raise したかを示す完全なトレースバック

同じログは、環境変数が設定されている場合、常に `~/.hermes/logs/agent.log` に WARNING レベル（失敗のみ）と DEBUG レベル（すべて）で書き込まれます。そのため、環境変数を付けて実行できない場合（例えばゲートウェイの内部から）は、代わりにログファイルを tail してください。

```bash
hermes logs --level WARNING | grep -i plugin
```

プラグインが表示されないよくある理由:

- **config で有効化されていない** — プラグインはオプトインです。`hermes plugins enable <name>`（この name は `plugins list` の出力に出てくるもので、ネストされたレイアウトでは `<category>/<plugin>` の形になり得ます）を実行してください。
- **ディレクトリのレイアウトが間違っている:** ネイティブパッケージは `~/.hermes/plugins/<plugin-name>/plugin.yaml`（フラット）か、1段のカテゴリ階層を使います。ポータブルパッケージは同じ場所でルートの `plugin.json` を使います。それより深い階層は無視されます。
- **`__init__.py` がない:** ネイティブパッケージには `plugin.yaml` と、`register(ctx)` 関数を持つ `__init__.py` の両方が必要です。ポータブルパッケージは Python を import せず、`__init__.py` も不要です。
- **`kind` が間違っている** — ゲートウェイアダプタはマニフェストに `kind: platform` が必要です。メモリプロバイダーは `kind: exclusive` として自動検出され、`plugins.enabled` の代わりに `memory.provider` 設定を通じてルーティングされます。

## プラグインの最終的な構造 {#your-plugins-final-structure}

```
~/.hermes/plugins/calculator/
├── plugin.yaml      # "I'm calculator, I provide tools and hooks"
├── __init__.py      # Wiring: schemas → handlers, register hooks
├── schemas.py       # What the LLM reads (descriptions + parameter specs)
└── tools.py         # What runs (calculate, unit_convert functions)
```

4つのファイル、明確な分離です。
- **マニフェスト** はプラグインが何であるかを宣言します
- **スキーマ** は LLM 向けにツールを説明します
- **ハンドラー** は実際のロジックを実装します
- **登録** はすべてを結びつけます

## プラグインで他に何ができるか？ {#what-else-can-plugins-do}

### データファイルを同梱する {#ship-data-files}

任意のファイルをプラグインディレクトリに置き、import 時にそれを読みます。

```python
# In tools.py or __init__.py
from pathlib import Path
from ruamel.yaml import YAML

_PLUGIN_DIR = Path(__file__).parent
_DATA_FILE = _PLUGIN_DIR / "data" / "languages.yaml"

with open(_DATA_FILE) as f:
    _DATA = YAML(typ="safe").load(f)
```

それは*同梱する*ファイル向けです。*書き込む* state はまた別で、次の節を参照してください。

### 永続的な state を保存する {#store-durable-state}

ランタイムの state をプラグインディレクトリに書き込んではいけません。それはインストールツリーであり、`hermes plugins update` / `remove` は git-pull するか削除します — ユーザーのデータはそれと一緒に失われます。正しい保存先は、両方を生き延び、アクティブなプロファイルに追従する、プラグインごとのデータルートです。

```python
from plugins.plugin_storage import plugin_data_dir, plugin_db

# <hermes home>/plugin-data/<name>/ — created on first use
state_file = plugin_data_dir("my-plugin") / "state.json"

# Or a SQLite database at <data dir>/data.db (WAL mode, thread-friendly)
conn = plugin_db("my-plugin")
conn.execute("CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY)")
```

プラグインごとに1つのディレクトリを使うことで、どのプラグインのデータも1つの予測可能な場所で調べられます。シークレットはここには属しません — 認証情報の読み取りは、他のどこでも同じように、標準の `.env` / secret-scope の経路を通ります。

### スキルを同梱する {#bundle-skills}

プラグインは、エージェントが `skill_view("plugin:skill")` で読み込むスキルファイルを同梱できます。`__init__.py` でそれらを登録します。

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

エージェントは、これで名前空間付きの名前であなたのスキルを読み込めます。

```python
skill_view("my-plugin:my-workflow")   # → plugin's version
skill_view("my-workflow")              # → built-in version (unchanged)
```

**重要な性質:**
- プラグインのスキルは**読み取り専用**です — `~/.hermes/skills/` には入らず、`skill_manage` で編集できません。
- プラグインのスキルはシステムプロンプトの `<available_skills>` インデックスに**掲載されません** — それらはオプトインで明示的に読み込むものです。
- 裸のスキル名は影響を受けません — 名前空間が、組み込みスキルとの衝突を防ぎます。
- エージェントがプラグインのスキルを読み込むと、同じプラグインの兄弟スキルを列挙する bundle context のバナーが先頭に付きます。

:::tip 旧来のパターン
古い `shutil.copy2` パターン（スキルを `~/.hermes/skills/` へコピーする）は今でも動作しますが、組み込みスキルとの名前衝突のリスクを生みます。新しいプラグインには `ctx.register_skill()` を使ってください。
:::

### 環境変数でゲートする {#gate-on-environment-variables}

プラグインに API キーが必要な場合:

```yaml
# plugin.yaml — simple format (backwards-compatible)
requires_env:
  - WEATHER_API_KEY
```

`WEATHER_API_KEY` が設定されていない場合、プラグインは明確なメッセージ付きで無効化されます。クラッシュもエージェント側のエラーも起きません — ただ「Plugin weather disabled (missing: WEATHER_API_KEY)」と表示されるだけです。

ユーザーが `hermes plugins install` を実行すると、不足している `requires_env` の変数について**対話的に**入力を求められます。値は自動的に `.env` に保存されます。

より良いインストール体験のために、説明とサインアップ URL を持つ rich format を使います。

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
| `name` | はい | 環境変数名 |
| `description` | いいえ | インストールプロンプトでユーザーに表示される |
| `url` | いいえ | 認証情報をどこで取得できるか |
| `secret` | いいえ | `true` の場合、入力はパスワード欄のように隠される |

両方の形式を同じリストに混在させることができます。すでに設定済みの変数は黙ってスキップされます。

### 任意の Python 依存関係を遅延インストールする {#lazy-install-optional-python-dependencies}

Hermes のプロジェクトの追加パッケージに含まれる SDK なら、それが必要になる処理の場所で
`pm.ensure_import` を使います。使えるかどうかを読み取りだけで確かめるには `pm.available` を使います。
頻繁に呼ばれる `check_fn` の中で依存関係をインストールしないでください。

次の例では、既存の追加パッケージ `bedrock` を要求しています。

```python
from pm import InstallError, ensure_import

def my_tool_handler(args, **kwargs):
    try:
        ensure_import("bedrock")
    except InstallError as exc:
        return {"error": str(exc)}

    import boto3
    # Use the SDK here.
```

引数は `pyproject.toml` の追加パッケージの名前です。任意のパッケージ指定や、プラグイン名で
修飾したキーではありません。以前の `LAZY_DEPS` の登録簿と
`FeatureUnavailable` 例外は、もうありません。

新しい環境が選ばれた場合、このヘルパーは再起動が必要だと知らせることがあります。
そのときは、動いているプロセスの中で2つ目の環境から import しようとせず、そのエラーを返してください。
すでに使える依存関係は、`security.allow_lazy_installs` が false でも
インストールの必要はありません。

ディレクトリ型プラグイン自身の Python の依存関係は、その `pyproject.toml` の `[project]` の下に
`dependencies` として宣言します。自分で書いたプロジェクトファイルがない場合、PM は `plugin.yaml` または
`plugin.yml` にある、旧来の `pip_dependencies` と `python_dependencies` のリストを合わせて使います。
PM が以前に生成したプロジェクトファイルが、これらのリストより優先されることはありません。
同意、ワークスペースへの参加、最新かどうかの確認は、同じ宣言を使います。
PM は、プラグインを有効にする前に、その依存関係を core の要件とあわせて準備します。
生成されるワークスペースが、プラグインのディレクトリや同梱のロックファイルを書き換えることはありません。
依存関係が競合すると受け入れは拒否され、以前の選択がそのまま残ります。
PM がほかのプラグインを自動で無効にすることはありません。

pip で手動インストールした依存関係は、PM の永続的な宣言にはなりません。
あとで環境が入れ替わったときに、残るとは限りません。Python のランタイムが PM の外にある
ラッパー型のプラグインは、
[メモリプロバイダーの存続の約束](/hermes/docs/developer-guide/memory-provider-plugin/#hermes_home-survival-contract-what-wrappers-can-rely-on)を頼りにできます。
ランタイムの配置と遅延インストールの方針は、[パッケージ管理](/hermes/docs/reference/package-management/)を
参照してください。

### スレッドセーフな遅延シングルトン {#thread-safe-lazy-singletons}

プラグインは、SDK クライアント、HTTP セッション、コネクションプールといった高価なオブジェクトを、初回使用時に構築するモジュールレベルの変数にキャッシュすることがよくあります。

```python
_client = None

def get_client():
    global _client
    if _client is not None:
        return _client
    _client = ExpensiveClient(...)   # ← TOCTOU race
    return _client
```

これは危険な罠です。Hermes は1つのプロセス内で複数のスレッドを実行します（委任されたツール呼び出し、バックグラウンドワーカー、self-improvement のフォーク）。そのため、2つのスレッドが `_client` が設定される前に `get_client()` に到達し、**両方**が `is not None` チェックを通過し、**両方**が高価な構築を実行し、後から書き込んだ方が先の書き込みを上書きします — 敗者側が開いたリソース（コネクション、ファイルハンドル、バックグラウンドスレッド）はリークします。

自分でロックを組まないでください。`plugins/plugin_utils.py` のヘルパーを使います。

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

どちらも、二重チェックロックで最初の同時呼び出しを直列化し、ファクトリを最大1回だけ実行します。ファクトリが raise した場合、何もキャッシュされず、次の呼び出しで再試行されます。honcho メモリプラグイン（`plugins/memory/honcho/client.py`）が参照実装です。

> 目安: `global _something` を書いて `is None` チェックとその構築を続けるくらいなら、代わりにこれらのどちらかを使ってください。

### 条件付きツール可用性 {#conditional-tool-availability}

任意のライブラリに依存するツールの場合:

```python
ctx.register_tool(
    name="my_tool",
    schema={...},
    handler=my_handler,
    check_fn=lambda: _has_optional_lib(),  # False = tool hidden from model
)
```

### 組み込みツールを上書きする {#overriding-a-built-in-tool}

組み込みツールを自分の実装で置き換えるには（例えば既定のブラウザツールをヘッド付き Chrome の CDP バックエンドに切り替える、
`web_search` を独自の企業内インデックスに置き換えるなど）、`override=True` を渡します。

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

`override=True` がなければ、レジストリは別の toolset に属する既存ツールを覆い隠すような登録を拒否します — これが偶発的な上書きを防ぎます。**組み込み**ツールを上書きするには、さらに、オペレーターが `config.yaml` の
`plugins.entries.<plugin_id>.allow_tool_override: true` で opt-in する必要があります。
そのゲートがなければ、`register_tool(override=True)` は `PluginToolOverrideError` を raise します。上書きはログに記録されるため、
`~/.hermes/logs/agent.log` で監査できます。プラグインは組み込みツールより後に読み込まれるため、登録の順序は
正しく機能します。あなたのハンドラーが組み込みのものを置き換えます。

**core と一緒に出荷されていないプラグインには、追加のオペレーター許可も必要です。** Hermes core と一緒に出荷されていない
プラグイン（user、project、pip ソース）が既存の組み込みツールに対して `override=True` を使う場合、さらに
`config.yaml` でプラグインごとの opt-in が必要です。

```yaml
plugins:
  entries:
    my-plugin:                    # the plugin's registry key from `hermes plugins list`
      allow_tool_override: true
```

この許可がなければ、`ctx.register_tool(..., override=True)` は `PluginToolOverrideError` を raise します。
`register()` の例外はローダーによって捕捉されるため、そのプラグインは無効化され、Hermes はそのまま続行します。このゲートが
存在するのは、有効化されたプラグインが `shell_exec` や `write_file` のような権限の強い組み込みツールを無音で
置き換えてしまうと、モデルがそこを経由するものすべてを傍受できてしまうからです。同梱プラグインはこの対象外です — そこでの上書きは
メンテナーの判断です。config を読み込めない場合、このゲートはフェイルクローズします。

この鍵を手で編集することは通常ありません。`hermes plugins enable <name>` は、プラグインのマニフェストが
`capabilities:` の下でそれを宣言している場合にだけ、その capability を許可するかどうかを尋ねます（同意画面、既定は「しない」）。
capability を何も宣言していないプラグインは、許可を求めるプロンプトなしに有効化されます。`--allow-tool-override` /
`--no-allow-tool-override` フラグは、どちらの場合でも、スクリプト化されたインストールのため、あるいはまだマニフェストの
ブロックを採用していないプラグインを事前承認するために、その許可を明示的に設定・取り消しします。
同じ許可は `deregister()` もゲートします。それがなければ、プラグインは自分が所有していないツールを削除できません
（さもなければ上書きチェックを回避する方法になってしまいます）。

### 複数のフックを登録する {#register-multiple-hooks}

```python
def register(ctx):
    ctx.register_hook("pre_tool_call", before_any_tool)
    ctx.register_hook("post_tool_call", after_any_tool)
    ctx.register_hook("pre_llm_call", inject_memory)
    ctx.register_hook("on_session_start", on_new_session)
    ctx.register_hook("on_session_end", on_session_end)
```

### フック一覧 {#hook-reference}

各フックは **[Event Hooks reference](/hermes/docs/user-guide/features/hooks/#plugin-hooks)** に、コールバックのシグネチャ、パラメータの表、正確な発火タイミング、例まで含めて完全に文書化されています。ここではその要約を示します。

| フック | 発火するタイミング | コールバックのシグネチャ | 戻り値 |
|------|-----------|-------------------|---------|
| [`pre_tool_call`](/hermes/docs/user-guide/features/hooks/#pre_tool_call) | 任意のツールが実行される前 | `tool_name: str, args: dict, task_id: str` | 任意の指示: `{"action": "block", "message": ...}` はその呼び出しを拒否する。`{"action": "approve", "message": ...}` は人間の承認ゲートへエスカレーションする |
| [`post_tool_call`](/hermes/docs/user-guide/features/hooks/#post_tool_call) | 任意のツールが戻った後 | `tool_name: str, args: dict, result: str, task_id: str, duration_ms: int` | 無視される |
| [`pre_llm_call`](/hermes/docs/user-guide/features/hooks/#pre_llm_call) | 各ターンにつき1回、ツール呼び出しループの前 | `session_id: str, user_message: str, conversation_history: list, is_first_turn: bool, model: str, platform: str` | [コンテキストの注入](#pre_llm_call-context-injection) |
| [`post_llm_call`](/hermes/docs/user-guide/features/hooks/#post_llm_call) | 各ターンにつき1回、ツール呼び出しループの後（成功したターンのみ） | `session_id: str, user_message: str, assistant_response: str, conversation_history: list, model: str, platform: str` | 無視される |
| `pre_api_request` | プロバイダーへの生の各 API リクエストの前（モデルがツールを呼ぶ場合、1ターンに複数回） | `session_id: str, model: str, provider: str, base_url: str, api_mode: str, api_call_count: int, message_count: int, tool_count: int, approx_input_tokens: int, max_tokens: int, request: dict` | 無視される |
| `post_api_request` | プロバイダーへの各 API リクエストが返った後 | `pre_api_request` のフィールドに加えて `api_duration: float, finish_reason: str, response_model: str \| None, usage: dict, response: dict, assistant_content_chars: int, assistant_tool_call_count: int` | 無視される |
| `api_request_error` | プロバイダーの API 呼び出しが raise したとき | 相関フィールドに加えて `status_code: int \| None, retry_count: int \| None, max_retries: int \| None, retryable: bool \| None, reason: str \| None, error: dict, request: dict` | 無視される |
| `pre_auxiliary_call` | 補助的な LLM 呼び出し（タイトル付け、圧縮、MoA、vision、承認など）のプロバイダー試行ごと、その前。`pre_api_request` ではない | `aux_task: str` に加えて `pre_api_request` のフィールド（`session_id`/`task_id`/`turn_id` は親ターンのものか空、`api_request_id: str`, `retry_count: int`, `streaming: bool`, `request: dict`） | 無視される |
| `post_auxiliary_call` | その試行が戻るか raise した後 | `pre_auxiliary_call` のフィールドに加えて `api_duration: float, finish_reason, response_model, usage: dict \| None, response: dict \| None, error: str \| None, error_type: str \| None` | 無視される |
| [`on_session_start`](/hermes/docs/user-guide/features/hooks/#on_session_start) | 新しいセッションが作成された（最初のターンのみ） | `session_id: str, model: str, platform: str` | 無視される |
| [`on_session_end`](/hermes/docs/user-guide/features/hooks/#on_session_end) | すべての `run_conversation` 呼び出しの終わり + CLI の終了 | `session_id: str, completed: bool, interrupted: bool, model: str, platform: str` | 無視される |
| [`on_session_finalize`](/hermes/docs/user-guide/features/hooks/#on_session_finalize) | CLI / ゲートウェイがアクティブなセッションを分解する | `session_id: str \| None, platform: str` | 無視される |
| [`on_session_reset`](/hermes/docs/user-guide/features/hooks/#on_session_reset) | ゲートウェイが新しいセッションキーに入れ替える（`/new`、`/reset`） | `session_id: str, platform: str` | 無視される |
| [`gateway_platform_event`](/hermes/docs/user-guide/features/hooks/#gateway_platform_event) | 認可済みのプラットフォーム固有イベントが、ゲートウェイの境界で正規化される（現時点では Telegram のリアクション） | `platform: str, event_type: str, payload: dict` | 無視される |
| `kanban_task_claimed` | kanban タスクがクレームされる（ディスパッチャプロセス、ワーカーが起動する前） | `task_id: str, board: str \| None, assignee: str \| None, run_id: int \| None, profile_name: str` | 無視される |
| `kanban_task_completed` | kanban タスクが完了する（ワーカープロセス） | `task_id, board, assignee, run_id, profile_name, summary: str \| None` | 無視される |
| `kanban_task_blocked` | kanban タスクがブロックされる（ワーカープロセス） | `task_id, board, assignee, run_id, profile_name, reason: str \| None` | 無視される |

ほとんどのフックは fire-and-forget な observer で、戻り値は無視されます。例外は、会話にコンテキストを注入できる `pre_llm_call` と、block / approve の指示を返せる `pre_tool_call` です。

すべてのコールバックは、前方互換性のために `**kwargs` を受け入れるべきです。フックのコールバックがクラッシュした場合、それはログに記録されてスキップされます。他のフックとエージェントは通常どおり続行します。

kanban のライフサイクルフックは、board の DB 変更がコミットされた**後**に発火するため、コールバックは常に永続化された状態を見ることになり、SQLite の書き込みロックを保持することは決してありません。kanban のワーカーは別個の `hermes -p <profile> chat -q` サブプロセスとして動作するため、`kanban_task_claimed` は**ディスパッチャ**プロセスで発火し、`kanban_task_completed` / `kanban_task_blocked` は**ワーカー**プロセスで発火します — すべての遷移を中央で観測するにはディスパッチャでフックし、タスクごとのセッション内コンテキストが必要ならワーカーでフックしてください。

**API リクエストフック**は、生のプロバイダーリクエストに対する observer で、ターンごとの `pre_llm_call` / `post_llm_call` ペアより一段下の階層です。ツールを呼ぶ1つのターンは複数の API リクエストを発生させ、これらのフックはそのそれぞれの前後で発火します。これらは（トレーシング、コスト計算、レイテンシダッシュボードなどの）可観測性プラグインのために存在します。`request` と `response` の kwargs は、サニタイズ済みでサイズ上限のある、プロバイダーのペイロードの JSON ビュー（機密キーは redact され、長い文字列は truncate され、SDK のオブジェクトは正規化される）で、`usage` はプレーンなトークンサマリーの dict です。すべてのペイロードは相関フィールド `turn_id`、`api_request_id`、`task_id`、`session_id`、`api_call_count` を持つため、プラグインはリクエスト、ツール呼び出し、ターンをつなぎ合わせられます。`api_request_error` はプロバイダーの呼び出しが raise したときに発火し、`status_code`、`retry_count` / `max_retries`、`retryable`、`reason`、そして `type` と `message` を持つ `error` dict を追加します。

### `pre_llm_call` のコンテキスト注入 {#prellmcall-context-injection}

これは戻り値が意味を持つ唯一のフックです。`pre_llm_call` のコールバックが `"context"` キーを持つ dict（または単純な文字列）を返すと、Hermes はそのテキストを**現在のターンのユーザーメッセージ**に注入します。これは、メモリプラグイン、RAG インテグレーション、ガードレール、そしてモデルに追加のコンテキストを提供する必要のあるあらゆるプラグインのための仕組みです。

#### 戻り値の形式 {#return-format}

```python
# Dict with context key
return {"context": "Recalled memories:\n- User prefers dark mode\n- Last project: hermes-agent"}

# Plain string (equivalent to the dict form above)
return "Recalled memories:\n- User prefers dark mode"

# Return None or don't return → no injection (observer-only)
return None
```

`"context"` キーを持つ非 None・非空の戻り値（あるいは非空の単純な文字列）は、すべて集約され、現在のターンのユーザーメッセージに追記されます。

#### 大きすぎるコンテキストの溢れ {#oversized-context-spill}

フックごとのコンテキストは、既定で `10,000` 文字に制限されています。それを超える分は `$HERMES_HOME/hook_outputs/<session_id>/<uuid>.txt` に書き込まれ、先頭/末尾のプレビューと保存先パスに置き換えられます。モデルは本当に全文が必要なら `read_file` や `terminal` で読めます。これにより、暴走したプラグインが以降すべてのターンのプロンプトを肥大化させ、prompt cache のプレフィックスを壊してしまうのを防ぎます。`config.yaml` で調整できます。

```yaml
hooks:
  output_spill:
    enabled: true          # default: true
    max_chars: 10000       # default; set higher to opt out of spilling
    preview_head: 500      # chars shown at the top of the preview
    preview_tail: 500      # chars shown at the bottom of the preview
    # directory: null      # default: $HERMES_HOME/hook_outputs
```

#### 注入の仕組み {#how-injection-works}

注入されたコンテキストは、システムプロンプトではなく**ユーザーメッセージ**に追記されます。これは意図的な設計判断です。

- **prompt cache の保持** — システムプロンプトはターンをまたいで同一のままです。Anthropic と OpenRouter はシステムプロンプトのプレフィックスをキャッシュするため、それを安定させることで、複数ターンの会話における入力トークンを 75% 以上節約できます。プラグインがシステムプロンプトを書き換えていたら、ターンごとにキャッシュミスになってしまいます。
- **一時的** — この注入は API 呼び出し時にだけ発生します。会話履歴内の元のユーザーメッセージは決して変更されず、セッションデータベースには何も永続化されません。
- **システムプロンプトは Hermes の領分** — そこには、モデル固有のガイダンス、ツールの強制規則、パーソナリティの指示、キャッシュされたスキルの内容が含まれます。プラグインは、エージェントの中核的な instructions を書き換えるのではなく、ユーザーの入力と並んでコンテキストを提供します。

#### 例: メモリ回想プラグイン {#example-memory-recall-plugin}

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

#### 例: ガードレールプラグイン {#example-guardrails-plugin}

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

#### 例: observer 専用フック（注入なし） {#example-observer-only-hook-no-injection}

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

#### 複数のプラグインがコンテキストを返す場合 {#multiple-plugins-returning-context}

複数のプラグインが `pre_llm_call` からコンテキストを返す場合、それらの出力は二重の改行で結合され、まとめてユーザーメッセージに追記されます。順序はプラグインの検出順（プラグインディレクトリ名のアルファベット順）に従います。

### ミドルウェア: 何が起こるかを変える {#middleware-change-what-happens}

フックは（上で説明した数少ない steering 用の形を除けば）エージェントループを観測するだけです。**ミドルウェアは何が起こるかを変えます**: リクエストミドルウェアは、下流の何かがそれを見る前に、有効なペイロードを書き換えます。実行ミドルウェアは実際の呼び出しをラップします。同じ `register(ctx)` のエントリーポイントから登録します。

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

種類の正本の一覧は、`hermes_cli/middleware.py` の `VALID_MIDDLEWARE` です。

| 種類 | 受け取るもの | 戻り値の契約 |
|------|----------|-----------------|
| `tool_request` | `tool_name`、`args`、`original_args`、コンテキストの kwargs | フック、ガードレール、承認、実行がそれを見る前に、有効なツール引数を置き換えるには `{"args": {...}}` を返す。呼び出しをそのままにするには `None` を返す。 |
| `llm_request` | `request`、`original_request`、コンテキストの kwargs | Hermes がそれを送る前に、有効なプロバイダー向け kwargs を置き換えるには `{"request": {...}}` を返す。 |
| `tool_execution` | ペイロードと `next_call` | ツールの実行をラップする。下流のチェーンを実行するには `next_call(payload)` をちょうど1回呼ぶ（呼ばなければ短絡できる）。結果を返す。 |
| `llm_execution` | ペイロードと `next_call` | 同じ形で、プロバイダー呼び出しをラップする。 |

**実務上重要な規則:**

- リクエストミドルウェアのチェーン: 各コールバックは、それより前のコールバックによって書き換えられたペイロードを見ます。一方、`original_args` / `original_request` は常にミドルウェア適用前のコピーを保持します。ペイロードはコールバック間でコピーされるため、自由に変更できます。
- 返す dict には `source`、`reason`、`name` の文字列を含められます。それらはミドルウェアのトレースに残り、下流の observer フックは `middleware_trace` の kwarg としてそれを受け取ります。
- 実行ミドルウェアの `next_call` は**1回限り**です。2回呼ぶと raise します。プロバイダーやツールを再実行してしまうからです。
- raise したミドルウェアのコールバックはログに記録されてスキップされ、チェーンは続行します。`next_call` の後で raise した下流の失敗は、そのまま伝播します。ミドルウェアが基盤のランタイム経路を壊すことは決してありません。
- ミドルウェアのペイロードは、observer のテレメトリフィールドと並んで `middleware_schema_version`（`hermes.middleware.v1`）を持ちます。
- 未知の種類は失敗せず警告付きで登録されます。そのため、新しい Hermes 向けに書かれたプラグインでも、古い Hermes でそのまま読み込まれます。

### CLI コマンドを登録する {#register-cli-commands}

プラグインは、独自の `hermes <plugin>` サブコマンドツリーを追加できます。

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

登録すると、ユーザーは `hermes my-plugin status`、`hermes my-plugin config` などを実行できるようになります。

**メモリプロバイダープラグイン**は、代わりに規約ベースのアプローチを使います。プラグインの `cli.py` ファイルに `register_cli(subparser)` 関数を追加してください。メモリプラグインの検出システムがそれを自動的に見つけます — `ctx.register_cli_command()` の呼び出しは不要です。詳細は [Memory Provider Plugin guide](/hermes/docs/developer-guide/memory-provider-plugin/#adding-cli-commands) を参照してください。

**アクティブなプロバイダーによるゲート:** メモリプラグインの CLI コマンドは、そのプロバイダーが `memory.provider` としてアクティブな場合にのみ表示されます。ユーザーがまだあなたのプロバイダーを設定していない場合、あなたの CLI コマンドがヘルプ出力を煩雑にすることはありません。

### スラッシュコマンドを登録する {#register-slash-commands}

プラグインは、ユーザーが会話中に入力するセッション内スラッシュコマンド（`/lcm status` や `/ping` のようなもの）を登録できます。これは CLI とゲートウェイ（Telegram、Discord など）の両方で機能します。

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

登録すると、ユーザーはどのセッションでも `/mystatus` と入力できます。このコマンドは自動補完、`/help` の出力、Telegram のボットメニューに表示されます。

**シグネチャ:** `ctx.register_command(name: str, handler: Callable, description: str = "", args_hint: str = "")`

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `name` | `str` | 先頭のスラッシュを除いたコマンド名（例: `"lcm"`、`"mystatus"`） |
| `handler` | `Callable[[str], str \| None]` | 生の引数文字列で呼ばれる。`async` でもよい。 |
| `description` | `str` | `/help`、自動補完、Telegram のボットメニューに表示される |

**`register_cli_command()` との主な違い:**

| | `register_command()` | `register_cli_command()` |
|---|---|---|
| 呼び出し方 | セッション内で `/name` | ターミナルで `hermes name` |
| 動作する場所 | CLI セッション、Telegram、Discord など | ターミナルのみ |
| ハンドラーが受け取るもの | 生の引数文字列 | argparse の `Namespace` |
| 用途 | 診断、状態確認、簡単な操作 | 複雑なサブコマンドツリー、セットアップウィザード |

**衝突の保護:** プラグインが組み込みコマンド（`help`、`model`、`new` など）と衝突する名前を登録しようとすると、登録は警告ログとともに黙って拒否されます。組み込みコマンドは常に優先されます。

**非同期ハンドラー:** ゲートウェイのディスパッチは非同期ハンドラーを自動的に検出して await します。そのため、同期・非同期どちらの関数も使えます。

```python
async def _handle_check(raw_args: str) -> str:
    result = await some_async_operation()
    return f"Check result: {result}"

def register(ctx):
    ctx.register_command("check", handler=_handle_check, description="Run async check")
```

### スラッシュコマンドからツールをディスパッチする {#dispatch-tools-from-slash-commands}

ツールを組織立てて呼び出す必要があるスラッシュコマンドハンドラー（`delegate_task` でサブエージェントを起動する、`file_edit` を呼ぶなど）は、フレームワークの内部に手を伸ばすのではなく `ctx.dispatch_tool()` を使うべきです。親エージェントのコンテキスト（ワークスペースのヒント、スピナー、モデルの継承）は自動的に配線されます。

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

**シグネチャ:** `ctx.dispatch_tool(name: str, args: dict, *, parent_agent=None) -> str`

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `name` | `str` | ツールレジストリに登録されているツール名（例: `"delegate_task"`、`"file_edit"`） |
| `args` | `dict` | モデルが送るのと同じ形のツール引数 |
| `parent_agent` | `Agent \| None` | 任意の上書き。省略した場合、現在の CLI エージェントから解決される（またはゲートウェイモードでは穏やかに縮退動作する） |

**ランタイムの振る舞い:**

- **CLI モード:** `parent_agent` はアクティブな CLI エージェントから解決されるため、ワークスペースのヒント、スピナー、モデルの選択は期待どおりに継承されます。
- **ゲートウェイモード:** CLI エージェントが存在しないため、ツールは穏やかに縮退動作します — ワークスペースは設定済みのターミナル作業ディレクトリから読まれ、スピナーは表示されません。
- **明示的な上書き:** 呼び出し側が明示的に `parent_agent=` を渡した場合、それが尊重され上書きされません。

これは、プラグインコマンドからツールをディスパッチするための、公開された安定インターフェースです。プラグインは `ctx._cli_ref.agent` のような private な状態に手を伸ばすべきではありません。

### フックの内側から動く（プロファイル + ツール） {#act-from-inside-a-hook-profile-tools}

`ctx._cli_ref` は**対話的な CLI** セッションでのみ設定されます。ゲートウェイ、非対話的な `hermes chat -q` の実行、そして**kanban が起動したワーカーセッション**では `None` です — そのため、`_cli_ref` を経由するプラグインのロジックは、まさにそれらの文脈で無音に何もしなくなります。フックが実際に必要とするものは、2つの安定した、セッションに依存しない API でカバーされます。

- **`ctx.profile_name`** — アクティブなプロファイル名（例: `"default"`、あるいは kanban ワーカーでの assignee のプロファイル）。`HERMES_HOME` から導出されるため、`_cli_ref` への依存なしにどこでも動作します。
- **`ctx.dispatch_tool(name, args)`** — 登録済みの任意のツール（組み込みでもプラグインでも）を呼び出します。`kanban_*` ツール、`delegate_task`、`terminal`、`read_file` なども含みます。どのプロセスでフックが発火していても、フックのコールバックから機能します。

これらを組み合わせると、kanban のライフサイクルフックは、フレームワークの内部に触れずに、遷移を観測して board に対して動くことができます。

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

完全な `hermes <subcommand>`（例: `hermes kanban show`）を実行するには、`ctx.dispatch_tool("terminal", {"command": "hermes kanban show ..."})` のように `terminal` ツールでシェルアウトしてください — ヘッドレスなワーカーセッションにはプロセス内のスラッシュコマンドブリッジが存在せず、フックから Hermes を動かすためのサポートされた方法はツールです。

### Slack の Block Kit ボタンクリックを処理する {#handle-slack-block-kit-button-clicks}

インタラクティブな要素（ボタン、オーバーフローメニュー、日付ピッカーなど）を持つ Block Kit のメッセージを投稿するプラグインは、`slack_bolt.AsyncApp` をモンキーパッチすることなく、クリックハンドラーを Slack アダプタに直接登録できます。

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

**シグネチャ:** `ctx.register_slack_action_handler(action_id, callback) -> None`

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `action_id` | `str \| re.Pattern \| dict` | `slack_bolt.App.action()` が受け付けるもの全て: リテラルの `action_id`、複数の id にマッチするコンパイル済み正規表現、または `{"action_id": "...", "block_id": "..."}` のような制約 dict |
| `callback` | 非同期の callable | slack_bolt の規約に従い `(ack, body, action)` を受け取る |

**ランタイムの振る舞い:**

- ハンドラーはプラグイン読み込み時にキューに入り、Slack プラットフォームが接続したタイミングでアダプタの `slack_bolt.AsyncApp` に配線されます。
- 各コールバックは防御的にラップされます。あなたのハンドラーが raise した場合、ゲートウェイはエラーをログに記録し、Slack が再試行しないようベストエフォートで ack します。
- 標準の slack_bolt の規則が適用されます — 3秒以内に `await ack()` してから、時間のかかる処理を行ってください。
- マルチワークスペースのデプロイでは、接続されたどのワークスペースからのクリックでもハンドラーは発火します。挙動をスコープする必要があれば `body["team"]["id"]` を使ってください。

これは、プラグインが Slack のインタラクティビティに参加するための公開された方法です。古いプラグインは `SlackAdapter.connect` をパッチすることがありますが、代わりにこの API を使ってください。slack_bolt の全面（events、shortcuts、commands — Block Kit のアクションだけではない）を使うには、下の汎用の `register_platform_handler("slack", ...)` を使います。

### ネイティブプラットフォームハンドラーを登録する（任意のプラットフォーム） {#register-native-platform-handlers-any-platform}

core アダプタがルーティングしないプラットフォームイベント — 追加の update タイプ、ネイティブなボタンのコールバック、リアクション / メンバーイベント、webhook のルートなど — を受け取る必要のあるプラグインは、そのプラットフォームのアダプタが接続時に呼び出すハンドラーファクトリを登録できます。これは**すべての**ゲートウェイプラットフォームで機能します。

```python
def register(ctx):
    def _wire(native, adapter):
        # native: the platform's client/app object (see table below)
        # adapter: the platform adapter instance (treat as read-only)
        # Import platform SDKs HERE so register() works without them.
        ...

    ctx.register_platform_handler("discord", _wire)
```

**シグネチャ:** `ctx.register_platform_handler(platform, factory) -> None`

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `platform` | `str` | ゲートウェイプラットフォーム名、小文字（`"telegram"`、`"discord"`、`"slack"`、`"matrix"` など） |
| `factory` | callable | 接続時に `(native, adapter)` を受け取る |

**プラットフォームごとの `native` の実体:**

| プラットフォーム | `native` オブジェクト | 典型的なフック先 |
|----------|-----------------|---------------|
| `telegram` | PTB の `Application` | `add_handler` — 任意の update タイプ、パターンでスコープされたコールバック |
| `discord` | `discord.ext.commands.Bot` | `add_listener` — リアクション、メンバーイベント、スレッド、ボイス |
| `slack` | `slack_bolt.AsyncApp` | `app.event()` / `app.action()` / `app.command()` |
| `matrix` | Matrix クライアント | イベントコールバック |
| `teams` | Teams の `App` | `on_message` / `on_card_action` デコレータ |
| `dingtalk` | `DingTalkStreamClient` | 他のストリームトピック向けの `register_callback_handler` |
| `feishu` | lark_oapi クライアント | API 呼び出し、イベントルーティング |
| `line`、`api_server`、`msgraph_webhook` | aiohttp の `web.Application` | `router.add_get/post` — カスタムルート（ルーターが固まる前に配線される） |
| その他すべて（whatsapp、signal、irc、email、sms、ntfy、wecom、weixin、bluebubbles、yuanbao など） | `None` | 接続時のフック。`adapter` ハンドルを通じて動作する |

**ランタイムの振る舞い:**

- ファクトリはプラグイン読み込み時にキューへ入り、そのプラットフォームが接続したときに呼ばれます — ディスパッチの順序が重要なプラットフォーム（Telegram、Slack、Teams、aiohttp のルーター）では、core のハンドラーより**前**に実行されるため、スコープされたプラグインのハンドラーが優先され、他のすべてはそのまま素通しされます。
- **追加するハンドラーは必ず first-match のディスパッチテーブルにスコープしてください。** Telegram では `CallbackQueryHandler(..., pattern=r"^myplugin:")` のように使ってください — スコープされていないハンドラーは、core のボタンフロー（実行の承認、モデルピッカー、clarify プロンプト）を飲み込んでしまいます。
- 各ファクトリは分離されています。raise した場合、エラーはログに記録され、プラットフォームはそのまま接続を続けます。
- プラットフォームの SDK は、モジュールレベルではなくファクトリの本体内で import してください — SDK が入っていなくても `register()` が動作する必要があります。
- 1つのプラグインが複数のプラットフォーム向けにファクトリを登録できます。それぞれ、対応するプラットフォームが接続したときにだけ発火します。

**Telegram の別名:** `ctx.register_telegram_handler(factory)` は `ctx.register_platform_handler("telegram", factory)` の後方互換のための別名です。

例 — Telegram、パターンでスコープされたインラインボタン:

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

例 — Discord、リアクションイベント:

```python
def register(ctx):
    def _wire(bot, adapter):
        async def on_raw_reaction_add(payload):
            ...  # e.g. reaction-based voting / moderation

        bot.add_listener(on_raw_reaction_add, "on_raw_reaction_add")

    ctx.register_platform_handler("discord", _wire)
```

### 実行中のプラグイン読み込み：すぐ有効になるものと次のセッションからのもの {#mid-run-plugin-loading-what-activates-now-vs-next-session}

プラグインは、ゲートウェイ（または TUI/Desktop のサーバー）がすでに動いている最中にも読み込まれることがあります。`hermes plugins
install`/`enable`、Desktop やダッシュボードからのインストール、カタログの再ピン留め、ツールがきっかけの強制的な
再検出がそれにあたります。これらの経路はどれも**実際の強制再スキャン**（`discover_plugins(force=True)`）を行い、
その中から `PluginManager.on_plugin_loaded(callback)` が、**新しく**読み込まれたプラグインごとに1つの要約を渡して呼ばれます
（`hermes_cli/plugins_activation.py`）。

```python
{"name": "late-mcp", "key": "late-mcp",
 "activated_now": {"gateway_commands": ["late"], "callbacks": ["telegram"]},
 "deferred": {"tools": ["late_tool"], "prompt": ["late.section"], "mcp_servers": ["worker"]}}
```

- **すぐ有効になるもの** — ゲートウェイのスラッシュコマンド、ゲートウェイの変換フックとその他のフック、プラットフォームの
  コールバックです。ゲートウェイのランナーは起動時に購読し、動いているすべてのアダプターの冪等な
  `rewire_plugin_handlers()` を呼びます。そのため、後から読み込まれたプラグインが登録した `register_platform_handler` のファクトリ（や Slack のアクションハンドラー）も、
  再起動なしで配線されます。再配線は、ネイティブのクライアントごとに `(plugin, factory
  qualname)` で重複を除きます。Telegram では、後から来たハンドラーがコアの受け皿である `filters.COMMAND` /
  `CallbackQueryHandler` より前へ引き上げられます（PTB はグループごとに最初に一致したものへ振り分けるため）。接続時に登録された場合とまったく同じ位置に並びます。
- **次のセッションからのもの** — `tools` と `prompt` の節は**次のセッション**から効きます（実行中のセッションの
  プロンプトとツールスキーマはキャッシュを保つため固定です。`/skills install` と同じ規則です）。`mcp_servers`（プラグインの
  `mcp.json` のサーバー。mcp.json での名前のまま）は、`mcp.reload` か次のセッションで接続されます。
- 配線を外す仕組みはありません。実行中にプラグインを無効にしても、すでに配線されたハンドラーはゲートウェイを
  再起動するまで残り、各画面もそのように表示します。

インストールの各入口は、まさにこの内訳を報告します。`hermes plugins install/enable` は、動いている
ゲートウェイに合図を送ったあと（コントロールソケットの `reload-plugins` 動詞）にこれを表示し、`plugins.manage install/toggle/update` は `activation` と
`gateway_reloaded` を返します（`restart_required` が true になるのは、どのゲートウェイも応答しなかったときだけです）。

:::tip
このガイドは**一般的なプラグイン**（ツール、フック、スラッシュコマンド、CLI コマンド）を扱っています。以下の節では、専門化されたプラグインの種類ごとに執筆のパターンを概観します。それぞれのリンク先に、フィールド一覧と例を含む完全なガイドがあります。
:::

## 専門化されたプラグインの種類 {#specialized-plugin-types}

Hermes には、一般的なプラグインの範囲を超えた、5つの専門化されたプラグインの種類があります。それぞれ `plugins/<category>/<name>/`（同梱）または `~/.hermes/plugins/<category>/<name>/`（ユーザー）の下にディレクトリとして出荷されます。契約はカテゴリごとに異なります — 必要なものを選び、その完全なガイドを読んでください。

### モデルプロバイダープラグイン — LLM バックエンドを追加する {#model-provider-plugins-add-an-llm-backend}

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

`get_provider_profile()` や `list_providers()` を何かが最初に呼んだ時点で遅延検出されます — `auth.py`、`config.py`、`doctor.py`、`models.py`、`runtime_provider.py`、そして chat_completions のトランスポートが自動的にそれへ配線されます。ユーザープラグインは、同名の同梱プラグインを上書きします。

**完全なガイド:** [Model Provider Plugins](/hermes/docs/developer-guide/model-provider-plugin/) — フィールド一覧、上書き可能なフック（`prepare_messages`、`build_extra_body`、`build_api_kwargs_extras`、`fetch_models`）、api_mode の選択、認証タイプ、テスト方法。

### プラットフォームプラグイン — ゲートウェイチャネルを追加する {#platform-plugins-add-a-gateway-channel}

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

**完全なガイド:** [Adding Platform Adapters](/hermes/docs/developer-guide/adding-platform-adapters/) — `BasePlatformAdapter` の完全な契約、メッセージのルーティング、認証のゲート、セットアップウィザードとの統合。実際に動く stdlib のみの例は `plugins/platforms/irc/` を見てください。

### メモリプロバイダープラグイン — セッションをまたぐ知識バックエンドを追加する {#memory-provider-plugins-add-a-cross-session-knowledge-backend}

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

メモリプロバイダーは単一選択です — `config.yaml` の `memory.provider` で選ばれた、一度に1つだけが有効になります。

プロバイダーが一般的なプラグインとしても読み込まれる場合、そのライフサイクルフックは一般的な検出の側が所有します。メモリローダーは、その同じプラグインのソースが一般的な検出を通じて正常に読み込まれるまでの、フォールバックとしてのみフックを供給します。プロバイダーが繰り返し読み込まれると、フォールバックのフックグループは置き換えられますが、そのグループ内の異なるコールバックは保持されます。これは、異なるプラグインのソース由来のフックを重複排除するものではなく、プロバイダーの有効化を変えるものでもありません。

**完全なガイド:** [Memory Provider Plugins](/hermes/docs/developer-guide/memory-provider-plugin/) — `MemoryProvider` ABC の全体、スレッドの契約、プロファイルの分離、`cli.py` による CLI コマンドの登録。

### コンテキストエンジンプラグイン — コンテキスト圧縮器を置き換える {#context-engine-plugins-replace-the-context-compressor}

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

コンテキストエンジンは単一選択です — `config.yaml` の `context.engine` で選ばれます。

**完全なガイド:** [Context Engine Plugins](/hermes/docs/developer-guide/context-engine-plugin/)。

### 画像生成バックエンド {#image-generation-backends}

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

**完全なガイド:** [Image Generation Provider Plugins](/hermes/docs/developer-guide/image-gen-provider-plugin/) — `ImageGenProvider` ABC の全体、`list_models()` / `get_setup_schema()` のメタデータ、`success_response()`/`error_response()` ヘルパー、base64 と URL 出力、ユーザーによる上書き、pip での配布。

**参照例:** `plugins/image_gen/openai/`（OpenAI SDK 経由の DALL-E / GPT-Image）、`plugins/image_gen/openai-codex/`、`plugins/image_gen/xai/`（Grok の画像生成）。

## Python でない拡張ポイント {#non-python-extension-surfaces}

Hermes は、Python プラグインではない拡張も受け入れます。これらは [Pluggable interfaces table](/hermes/docs/user-guide/features/plugins/#pluggable-interfaces--where-to-go-for-each) に示されています。以下の節では、それぞれの執筆スタイルを簡単に概観します。

### MCP サーバー — 外部ツールを登録する {#mcp-servers-register-external-tools}

Model Context Protocol（MCP）サーバーは、Python のプラグインを一切必要とせずに、自身のツールを Hermes に登録します。`~/.hermes/config.yaml` で宣言します。

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

Hermes は起動時に各サーバーへ接続し、そのツールを列挙し、組み込みのツールと並べて登録します。LLM からは、他のどのツールとも同じように見えます。**完全なガイド:** [MCP](/hermes/docs/user-guide/features/mcp/)。

### ゲートウェイイベントフック — ライフサイクルイベントで発火する {#gateway-event-hooks-fire-on-lifecycle-events}

マニフェストとハンドラーを `~/.hermes/hooks/<name>/` に置きます。プラグインとは異なり `plugins.enabled` の手順はありません — ゲートウェイは起動時にすべての有効なフックディレクトリを import するため、ファイルを置くこと**自体**がオプトインになります（[trust model](/hermes/docs/user-guide/features/hooks/#gateway-hook-trust)）。

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

イベントには `gateway:startup`、`session:start`、`session:end`、`session:reset`、`agent:start`、`agent:step`、`agent:end`、そしてワイルドカードの `command:*` があります。フック内のエラーは捕捉されてログに記録されます — メインのパイプラインを止めることは決してありません。

**完全なガイド:** [Gateway Event Hooks](/hermes/docs/user-guide/features/hooks/#gateway-event-hooks)。

### シェルフック — ツール呼び出し時にシェルコマンドを実行する {#shell-hooks-run-a-shell-command-on-tool-calls}

ツールが発火したときにスクリプトを実行するだけでよい場合（通知、監査ログ、デスクトップアラート、自動フォーマッタなど）は、`config.yaml` のシェルフックを使ってください — Python は不要です。

```yaml
hooks:
  - event: post_tool_call
    command: "notify-send 'Tool ran: {tool_name}'"
    when:
      tools: [terminal, patch, write_file]
```

Python プラグインのフックと同じイベント（`pre_tool_call`、`post_tool_call`、`pre_llm_call`、`post_llm_call`、`on_session_start`、`on_session_end`、`pre_gateway_dispatch`）に加えて、`pre_tool_call` の block 判定のための構造化された JSON 出力もサポートします。

**完全なガイド:** [Shell Hooks](/hermes/docs/user-guide/features/hooks/#shell-hooks)。

### スキルソース — カスタムスキルレジストリを追加する {#skill-sources-add-a-custom-skill-registry}

スキルの GitHub リポジトリを保持している場合（あるいは組み込みのソースを超えてコミュニティのインデックスから取得したい場合）は、**tap** として追加します。

```bash
hermes skills tap add myorg/skills-repo
hermes skills search my-workflow --source myorg/skills-repo
hermes skills install myorg/skills-repo/my-workflow
```

自分の tap を公開するのは、`skills/<skill-name>/SKILL.md` ディレクトリを持つ GitHub リポジトリだけで済みます — サーバーやレジストリへの登録は不要です。

**完全なガイド:** [Skills Hub](/hermes/docs/user-guide/features/skills/#skills-hub) ・ [Publishing a custom tap](/hermes/docs/user-guide/features/skills/#publishing-a-custom-skill-tap)（リポジトリのレイアウト、最小の例、既定でないパス、trust level）。

### コマンドテンプレート経由の TTS / STT {#tts-stt-via-command-templates}

音声やテキストを読み書きする任意の CLI は、`config.yaml` を通じてプラグインできます — Python コードは不要です。

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

STT の場合は、`HERMES_LOCAL_STT_COMMAND` に argv トークン化されたテンプレートを指定します。これは暗黙のシェル解釈なしに実行されるため、信頼できるローカルコマンドがシェル構文を必要とする場合は `sh -c`、`cmd /c`、あるいは PowerShell を明示的に使ってラップしてください。対応するプレースホルダーは `{input_path}`、`{output_path}`、`{format}`、`{voice}`、`{model}`、`{speed}`（TTS）、`{input_path}`、`{output_dir}`、`{language}`、`{model}`（STT）です。パスを扱う CLI であれば、自動的にプラグインとして扱えます。

**完全なガイド:** [TTS custom command providers](/hermes/docs/user-guide/features/tts/#custom-command-providers) ・ [STT](/hermes/docs/user-guide/features/tts/#voice-message-transcription-stt)。

## pip で配布する {#distribute-via-pip}

公開して配布するには、Python パッケージにエントリーポイントを追加します。

```toml
# pyproject.toml
[project.entry-points."hermes_agent.plugins"]
my-plugin = "my_plugin_package"
```

インストールの所有者が用意した環境（たとえば Nix の derivation）に配布物が入っている場合、
エントリーポイントによる検出は引き続き使えます。
これは検出の仕組みであって、PM が選んだ世代へパッケージを差し込んでよいという許可ではありません。
管理されたインストールでは、`pyproject.toml` か、マニフェストの Python の要件を持つディレクトリ型
プラグインとして配布し、PM がトランザクションとして受け入れられるように `hermes plugins install` / `enable` を
使ってください。新しい環境が選ばれたら Hermes を再起動します。
`hermes pm install` が受け付けるのは管理対象のツール名で、任意の PyPI パッケージではありません。

## NixOS 向けに配布する {#distribute-for-nixos}

:::warning Nix は明示的なサポート対象外になりました
Nix/NixOS はもはや明示的にサポートされているインストール経路ではありません（ベストエフォートのみ） — [Nix Setup](/hermes/docs/getting-started/nix-setup/) を参照してください。この節は、すでに NixOS 上にデプロイしているユーザーのために残されています。
:::

NixOS ユーザーは、エントリーポイントを持つ `pyproject.toml` を提供すれば、あなたのプラグインを宣言的にインストールできます。

**エントリーポイント型プラグイン**（配布に推奨）:
```nix
# User's configuration.nix
services.hermes-agent.extraPythonPackages = [
  (config.services.hermes-agent.package.python.pkgs.buildPythonPackage {
    pname = "my-plugin";
    version = "1.0.0";
    src = pkgs.fetchFromGitHub {
      owner = "you";
      repo = "hermes-my-plugin";
      rev = "v1.0.0";
      hash = "sha256-...";  # nix-prefetch-url --unpack
    };
    format = "pyproject";
    build-system = [ config.services.hermes-agent.package.python.pkgs.setuptools ];
  })
];
```

**ディレクトリ型プラグイン**（`pyproject.toml` は不要）:
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

overlay の使い方や衝突チェックを含む完全な文書は [Nix Setup guide](/hermes/docs/getting-started/nix-setup/#plugins) を参照してください。

## よくある間違い {#common-mistakes}

**ハンドラーが JSON 文字列を返していない:**
```python
# Wrong — returns a dict
def handler(args, **kwargs):
    return {"result": 42}

# Right — returns a JSON string
def handler(args, **kwargs):
    return json.dumps({"result": 42})
```

**ハンドラーのシグネチャに `**kwargs` がない:**
```python
# Works — the dispatcher only forwards the context keywords a signature names
def handler(args):
    ...

# Better — receives every injected context field (task_id, session_id, parent_agent, ...)
def handler(args, **kwargs):
    ...
```

**ハンドラーが例外を raise する:**
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

**スキーマの description が曖昧すぎる:**
```python
# Bad — model doesn't know when to use it
"description": "Does stuff"

# Good — model knows exactly when and how
"description": "Evaluate a mathematical expression. Use for arithmetic, trig, logarithms. Supports: +, -, *, /, **, sqrt, sin, cos, log, pi, e."
```
