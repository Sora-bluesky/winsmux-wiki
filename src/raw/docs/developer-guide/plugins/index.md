---
title: "Hermes プラグインを作る"
description: "ツール・フック・データファイル・スキルを備えた Hermes プラグインを、手順を追って作り上げるガイド"
upstream_path: developer-guide/plugins/index.md
upstream_blob: 88dbbc325f8b1eaf6af47c94fc0e917ba9cb8fe3
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/plugins
---

# Hermes プラグインを作る {#build-a-hermes-plugin}

このガイドでは、Hermes のプラグインをゼロから完成させるまでを一通りたどります。読み終えるころには、複数のツール、ライフサイクルフック、同梱するデータファイル、そして束ねたスキルまでを備えた、実際に動くプラグインができあがります。プラグインの仕組みが対応しているものが、ひととおり出てきます。

:::info どのガイドを読めばよいか迷ったら
Hermes には拡張できる口がいくつもあり、Python の `register_*` API を使うもの、設定ファイルで動くもの、決まった場所にファイルを置くだけのものがあります。まずはこの対応表を見てください。

| 追加したいもの | 読むページ |
|---|---|
| 独自のツール、フック、スラッシュコマンド、スキル、CLI のサブコマンド | **このガイド**（プラグインの一般的な拡張口） |
| **デスクトップアプリ**（ネイティブ）の拡張（ペイン、ページ、ステータスバー、パレット、テーマ） | [Desktop Plugin SDK](/hermes/docs/developer-guide/desktop-plugin-sdk/) |
| **Web ダッシュボード**の拡張（タブ、シェルのスロット、テーマ） | [ダッシュボードを拡張する](/hermes/docs/user-guide/features/extending-the-dashboard/) |
| **LLM / 推論のバックエンド**（新しいプロバイダ） | [モデルプロバイダプラグイン](/hermes/docs/developer-guide/model-provider-plugin/) |
| **ゲートウェイのチャンネル**（Discord / Telegram / IRC / Teams など） | [プラットフォームアダプタを追加する](/hermes/docs/developer-guide/adding-platform-adapters/) |
| **メモリのバックエンド**（Honcho / Mem0 / Supermemory など） | [メモリプロバイダプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/) |
| **コンテキスト圧縮のエンジン** | [コンテキストエンジンプラグイン](/hermes/docs/developer-guide/context-engine-plugin/) |
| **画像生成のバックエンド** | [画像生成プロバイダプラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/) |
| **動画生成のバックエンド** | [動画生成プロバイダプラグイン](/hermes/docs/developer-guide/video-gen-provider-plugin/) |
| **Web 検索・本文抽出のバックエンド** | [Web 検索プロバイダプラグイン](/hermes/docs/developer-guide/web-search-provider-plugin/) |
| **クラウドブラウザのバックエンド**（Browserbase 型の CDP セッションプロバイダ） | [ブラウザプロバイダプラグイン](/hermes/docs/developer-guide/browser-provider-plugin/) |
| **シークレット管理のバックエンド**（vault / パスワードマネージャ / OS のキーストア） | [シークレットソースプラグイン](/hermes/docs/developer-guide/secret-source-plugin/) |
| **ダッシュボードの OIDC / 認証プロバイダ** | [Web ダッシュボード — 独自プロバイダ](/hermes/docs/user-guide/features/web-dashboard/#custom-providers) — `ctx.register_dashboard_auth_provider()` |
| **TTS のバックエンド**（Piper、VoxCPM、Kokoro、音声クローンなど任意の CLI） | [TTS のカスタムコマンドプロバイダ](/hermes/docs/user-guide/features/tts/#custom-command-providers) — 設定だけで済み、Python は不要です |
| **STT のバックエンド**（独自の whisper / ASR の CLI） | [音声メッセージの文字起こし](/hermes/docs/user-guide/features/tts/#voice-message-transcription-stt) — `HERMES_LOCAL_STT_COMMAND` に argv 分割されたテンプレートを設定します |
| **MCP 経由の外部ツール**（ファイルシステム、GitHub、Linear など任意の MCP サーバ） | [MCP](/hermes/docs/user-guide/features/mcp/) — `config.yaml` に `mcp_servers.<name>` を書きます |
| **ゲートウェイのイベントフック**（起動時、セッションのイベント、コマンドで発火） | [イベントフック](/hermes/docs/user-guide/features/hooks/#gateway-event-hooks) — `HOOK.yaml` と `handler.py` を `~/.hermes/hooks/<name>/` に置きます |
| **シェルフック**（イベント発生時にシェルコマンドを実行） | [シェルフック](/hermes/docs/user-guide/features/hooks/#shell-hooks) — `config.yaml` の `hooks:` の下に書きます |
| **スキルの入手先を増やす**（独自の GitHub リポジトリ、非公開のスキル索引） | [スキル](/hermes/docs/user-guide/features/skills/) — `hermes skills tap add <repo>` · [tap を公開する](/hermes/docs/user-guide/features/skills/#publishing-a-custom-skill-tap) |
| 本体に組み込む**コア**の推論プロバイダ（プラグインではないもの） | [プロバイダを追加する](/hermes/docs/developer-guide/adding-providers/) |

設定で動くもの（TTS、STT、MCP、シェルフック）や、ディレクトリに置くだけのもの（ゲートウェイのフック）も含めて、拡張口をまとめて見たいときは[拡張できるインターフェースの一覧表](/hermes/docs/user-guide/features/plugins/#pluggable-interfaces--where-to-go-for-each)をご覧ください。
:::

:::caution 他社製品と連携するプラグインは単独で配布します。コアのツリーには入れません
**他の誰かの製品やプロジェクト**とつなぐプラグイン、たとえば可観測性やメトリクスのバックエンド、ベンダーの SaaS コネクタ、分析ダッシュボード、有料サービスとの連携などは、**単独のプラグインリポジトリ**として作って配布します。`NousResearch/hermes-agent` にはマージしません。利用者は `~/.hermes/plugins/` に入れるか、pip のエントリポイント経由で導入します。このガイドの内容は、単独のリポジトリからでもまったく同じように使えます。これは結合と保守についての判断であって（コアの変更は速く、こちらはあなたのバックエンドを持っていません）、品質のふるいではありません。素晴らしいプラグインであっても、置き場所は自分のリポジトリです。Nous Research の Discord の `#plugins-skills-and-skins` チャンネルで宣伝してください。方針は [CONTRIBUTING.md](https://github.com/NousResearch/hermes-agent/blob/main/CONTRIBUTING.md) に書いてあります。
:::

## 可搬な Agent Plugins v1 パッケージ {#portable-agent-plugins-v1-packages}

Hermes は、Agent Plugins v1.0.0 形式に沿ったディレクトリパッケージも導入して
読み込めます。これは Hermes がすでに持っている可搬な部品のための互換アダプタ
です。ネイティブの `plugin.yaml` と `register(ctx)` によるプラグインを置き換える
ものではありません。

```text
my-portable-plugin/
├── plugin.json
├── skills/
│   └── summarize/
│       ├── SKILL.md
│       └── references/
└── mcp.json
```

可搬なパッケージも、いつもの手順で導入して有効にします。

```bash
hermes plugins install owner/repository --no-enable
hermes plugins list
hermes plugins enable <plugin-name>
```

可搬なパッケージは、明示的に有効にしないかぎり導入後も無効のままです。有効に
したパッケージは、`skills/*/SKILL.md` のディレクトリと、ルートの `mcp.json` に
書かれた stdio の MCP サーバをすぐに提供できます。スキルは読み取り専用で名前
空間に入り、`skills_list` と `skill_view` から読み込まれます。MCP のコマンドは
実行ファイル 1 つと引数リストという形で渡され、シェルを通ることはありません。
完全修飾のスキル名は `skills_list` で調べてください。可搬なスキルの名前空間は
`agent-plugin-<slug>-<hash>` という決まった形で、見つかったプラグインのキーから
作られるので、名前を整形した結果が衝突することはありません。

Hermes は `plugin.json`、Agent Skills の frontmatter、部品を置く決まった場所、
`mcp.json`、解決後のパス、シンボリックリンクが範囲内に収まっているかを、すべて
ローカルで検証します。パッケージの読み込み中に JSON スキーマを取りにいくことは
ありません。壊れたスキルや MCP のエントリは、隣の正常な部品が読み込める場合に
はその境界で飛ばされます。`PLUGIN_ROOT` は解決後のパッケージのルートを指します。
`PLUGIN_DATA` は Hermes が管理する、プロファイル単位の書き込み可能なディレクトリ
を指します。
可搬な MCP の `env` に書いた値はパッケージの中身として見えるデータであって、
秘密を保管する仕組みではありません。`mcp.json` に資格情報を置かないでください。

いま対応している可搬な部分集合は、stdio と Streamable HTTP の MCP エントリです。
可搬な `streamable-http` のエントリは、Hermes が元から持つネイティブのリモート
MCP クライアント（URL 指定の `mcp_servers` 設定を動かしているのと同じ仕組み）を
通り、v1 の境界の決まりが適用されます。URL は絶対 URL の http(s) で、ユーザー
情報やフラグメントを含んではならず、平文の HTTP は `localhost` やループバックの
ホストにかぎって受け付けられ、設定したヘッダがオリジンをまたぐリダイレクトの先へ
転送されることはありません。古い `sse` のエントリは報告のうえ飛ばされます。
Agent Plugins v1 は、信頼、権限、来歴、サンドボックスのいずれも定義していません。
パッケージを有効にすると、その指示とローカルの実行ファイルには、ほかの導入済み
Hermes プラグインと同じく全面的に信頼した扱いが与えられます。

[HTML 版の仕様書](https://agent-plugins.org/specification)はいま v1.0.0 を
Working Draft と表示していますが、
[版ごとの仕様リポジトリ](https://github.com/agentplugins/agent-plugins-spec/blob/main/spec/1.0.0.md)
では Published と記録されています。Hermes はどちらの可変なラベルでもなく、
v1.0.0 の正式なスキーマ識別子と規範となる本文を基準に動きます。これは対応範囲を
明示した部分集合であって、Agent Plugins に完全準拠しているという主張ではありません。

## ネイティブプラグインの互換性についての約束 {#native-plugin-compatibility-contract}

ネイティブの `plugin.yaml` と `register(ctx)` によるプラグインは、ひとつの
グローバルなプラグイン API 番号ではなく、振る舞いによって守られます。Hermes は
`PLUGIN_API_VERSION` を公開しませんし、マニフェスト全体での `api:` の一致も
求めませんし、関係のない値に API のバージョンを付けることもしません。文書化
された振る舞いを使っているプラグインは、Hermes を普通に更新したあとも動き続ける
はずです。

互換性の決まりは次のとおりです。

- **足す方向にだけ変える。** 文書化された `PluginContext` のメソッドは削除も改名も
  されません。新しい引数は省略可能で既定値を持ち、キーワード専用にすべきです。
  既存の戻り値のフィールドが削除されたり、黙って型を変えられたりすることは
  ありません。
- **フックのペイロードはキーワード引数です。** 新しいフックのデータはキーワードの
  フィールドとして足され、既存フィールドの意味や位置が変わることはありません。
  Hermes はコールバックのシグネチャを調べます。古いコールバックは自分が宣言した
  フィールドだけを受け取り、`**kwargs` を持つコールバックはその時点の完全な
  ペイロードを受け取ります。新しいプラグインは `**kwargs` を受け取るように書いて
  おくと、シグネチャを変えずに追加のデータを取り込めます。
- **マニフェストは追加を受け入れます。** 知らない `plugin.yaml` のフィールドは
  無視されます。そのため、新しい版で導入されたメタデータを含むマニフェストでも、
  プラグインのコード自体が対応済みの振る舞いを使っているかぎり、古い Hermes で
  読み込めます。
- **プロバイダのインターフェースは既定実装で育ちます。** 新しいプロバイダの
  メソッドには既定の実装があります。新しいコールバックのコンテキストは省略可能で、
  プロバイダが受け取れるとシグネチャの検査で分かったときにだけ渡されます。抽象
  メソッドを足したり、条件なしで引数を渡すようにしたりする場合は、ある日いきなり
  シグネチャを変えるのではなく移行期間を設けます。
- **境界を越える約束には版を付けます。** ある機能が通信用のペイロードや保存形式を
  定めるとき（たとえばオブザーバのペイロードやシークレットソースの状態）は、その
  機能が自分のスキーマ版を持つことがあります。そのローカルなスキーマの中では
  フィールドを足す方向で保ってください。保存済みのプラグインの状態と設定は読める
  ままにするか、明示的な移行処理を用意します。古い形式で書かれた再開可能な
  セッションは、その後も再生できなければなりません。関係のないコールバックや
  コンテキストの値に版の文字列を足さないでください。

### 廃止の方針 {#deprecation-policy}

文書化されたネイティブプラグインの振る舞いを廃止できるのは、次のすべてを満たす
ときだけです。

1. 代わりとなる手段と移行手順が、プラグインのガイドとリリースノートに載っている
   こと。
2. 代替と、削除される最も早いリリースを名指しした警告が、プロセスにつき最大 1 回
   出ること。
3. 古い振る舞いが、少なくともその後 2 回のマイナーリリースまで使えること。
4. その期間を通じて、古い経路と代替の両方に、振る舞いに基づく互換性の検証がある
   こと。

期間が終わって削除するときは、保存済みのデータや再開可能なセッションに必要な
移行処理も一緒に入れます。実際のところ、削除よりも別名やアダプタを足すやり方の
ほうが好まれます。

Hermes はこの約束を、隔離した `HERMES_HOME` から見つけてくる外部プラグインの
固定サンプルで守っています。これらのテストは `PluginManager` を通してプラグインを
読み込んで呼び出し、内部のシンボル一覧やソースコードの見た目ではなく、実際の
登録結果とコールバックの結果を確かめます。

### 2026 年 9 月のモジュール分割: 古い import パスは 2026-09-14 で終わります {#sep-2026-module-decomposition-old-import-paths-end-2026-09-14}

Hermes の内部は 2026 年 9 月に `<stem>_<topic>` という兄弟モジュールへ分割されました（PR #102117）。**内部の

は **2026-09-14** までは以前のモジュールから解決され続け、その後、互換層は取り除かれます。

- **自分のプラグインを調べる:** `hermes plugins compat /path/to/your/plugin` を実行すると、古いパスを使っている
  `file:line` と新しいパスがすべて並び、残りがある間は終了コード 1 になります。リポジトリの `COMPAT_MANIFEST.md` が対応表の全量です。
- **利用者に見えるもの:** CLI のバナーの下、`hermes doctor`、`hermes update` の後に告知が出ます。デスクトップでは
  プラグイン名を挙げたダイアログが 1 回だけ出ます。古いパスで解決されるたびに、プロセスにつき 1 回
  `HermesPluginCompatWarning` も出ます。
- **2026-09-14 から:** 古いパスを import したままのプラグインは**読み込まれません**（理由は `hermes plugins list` に
  出ます）。互換層が実際に取り除かれるまでは `plugins.allow_deprecated_imports: true` で強制的に読み込めますが、
  取り除かれた時点で古いパスは `ImportError` になります。

## これから作るもの {#what-youre-building}

ツールを 2 つ持つ**電卓**のプラグインです。
- `calculate` — 数式を計算します（`2**16`、`sqrt(144)`、`pi * 5**2`）
- `unit_convert` — 単位を変換します（`100 F → 37.78 C`、`5 km → 3.11 mi`）

これに加えて、すべてのツール呼び出しを記録するフックと、同梱するスキルファイルを作ります。

## ステップ 1: プラグインのディレクトリを作る {#step-1-create-the-plugin-directory}

ディレクトリを作って、ステップ 2 へ進みます。

```bash
mkdir -p ~/.hermes/plugins/calculator
cd ~/.hermes/plugins/calculator
```

### Plugin Doctor で検証する {#validate-with-plugin-doctor}

`hermes plugins doctor [path-or-id]` は、Hermes 自身が使っているのと同じディレクトリ
探索、マニフェストの解析、名前空間付きの import、`register(ctx)`、フックの登録簿、
ツールの登録簿をそのまま実行します。不正なフック名、`**kwargs` を受け取らない
コールバック、登録の失敗、宣言したツール／フックと実際に登録されたものとのずれを
報告します。エラーがあったときに終了コードを非ゼロにするには `--ci` を付けます。

```bash
hermes plugins doctor . --ci
```

Doctor は一時的な `HERMES_HOME` を使い、検査のあとにプラグインの登録状態を元へ戻し、
登録の実行中にうっかりネットワークへ出ていないかを捕まえるために Python の直接の
ソケット接続を塞ぎます。これはサンドボックスではありません。プラグインのコードは
いまのユーザーの権限で同じプロセス内で動き、子プロセスを起動できます。import しても
かまわないと信じられるコードにだけ Doctor を使ってください。

## ステップ 2: マニフェストを書く {#step-2-write-the-manifest}

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

これで Hermes に「自分は calculator という名前のプラグインで、ツールとフックを提供します」と伝わります。`provides_tools` と `provides_hooks` は、このプラグインが登録するものを並べたリストです。

追加できる省略可能なフィールドもあります。
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

組み込みツールの差し替えや、`ctx.llm` の呼び出しで使うモデルの指定など、ホスト側の
特権的な機能が必要な場合は、`capabilities:` に宣言します。導入時または有効化時に
利用者はその一覧を見て一度だけ同意します。あとの版で capability が増えたときは、
更新の流れの中で増えた分だけをあらためて尋ねます。宣言していない capability や同意
されていない capability は単にオフになるので（安全側に倒れます）、**使う前に確かめて、
無ければ穏やかに機能を落としてください**。

```python
def register(ctx):
    if ctx.has_capability("tools.override"):
        ctx.register_tool(..., override=True)
    else:
        ctx.register_tool(...)   # register under a non-conflicting name
```

知られている capability の id は `tools.override`、`llm.provider_override`、
`llm.model_override`、`llm.agent_id_override`、`llm.profile_override`、
`llm.task_override` です（正式な登録簿は `hermes_cli/plugin_capabilities.py` に
あります）。知らない id は無視されます。capability ごとの古い設定キー
（`plugins.entries.<id>.allow_tool_override` など）もまだ動きますが、こちらは
廃止予定です。capability として宣言すれば、利用者は監査できる同意画面を一度
見るだけで済みます。capability は同意と監査のためのものであって、**サンドボックス
ではありません**。ホストの API の口を開け閉めするだけです。

**pip で配布するプラグイン**は、導入後に `plugin.yaml` のディレクトリが存在しません。
そこで代わりに、対になるエントリポイントのグループ
`hermes_agent.plugin_capabilities` を使って、配布物のメタデータに capability を
宣言します。宣言はそれぞれ `<plugin-id>.<capability-id>` という名前で、
`hermes_agent.plugins` のエントリポイントと同じオブジェクトを指します。

```toml
[project.entry-points."hermes_agent.plugins"]
calculator = "my_pkg:register"

[project.entry-points."hermes_agent.plugin_capabilities"]
"calculator.tools.override" = "my_pkg:register"
```

Hermes はこれを、コードを import せずに導入済みのメタデータから読み取ります。
そのため pip での導入でも `hermes plugins capabilities` と同意の流れが正確に保たれます。

### マニフェスト v2 の一覧 {#manifest-v2-reference}

`plugin.yaml` は、追加のみの **v2 スキーマ**にも対応しています（#64165）。すべての
フィールドは省略可能です。`manifest_version` がないマニフェストは v1 のマニフェストで、
今後もずっと完全に使えます。知らないフィールドで読み込みが壊れることはありません。
警告付きで無視されます（前方互換性）。この Hermes が知っているより新しい
`manifest_version` でも、警告付きで読み込まれます。

| フィールド | 型 | 意味 |
|---|---|---|
| `manifest_version` | int | マニフェストの**ファイル形式**の版。無ければ `1`。いまの最大は `2`。`api_version` とは無関係です。 |
| `api_version` | int | プラグインが対象とする実行時の**プラグイン API の世代**（ctx の面やフックのシグネチャ）。`manifest_version` とは意図的に別の軸で、`api_version: 1` のプラグインが v2 のマニフェストを使ってもかまいません。 |
| `requires_plugins` | list | プラグイン間の依存関係。`- id: other-plugin` に、任意で `version_range: ">=1.0,<2"` を添えます。**助言的**で、依存先が見つからないときは分かりやすい警告が出るだけで、プラグイン自体は読み込まれます。実行時には `ctx.has_plugin("other-plugin")` で確かめてください。読み込みの**順序**はこの依存の辺に従います。A が B を必要とするなら B の `register()` が A より先に走ります（トポロジカルソート、同順のときはアルファベット順。循環があるときは警告してアルファベット順に戻ります）。 |
| `python_dependencies` | list of str | PEP 508 の要件（例: `"requests>=2.0,<3"`）。`hermes plugins install` / `enable` のときに Hermes の venv へ導入され、**`hermes update` のたびに入れ直されます**（[Python の依存関係](#python-dependencies) を参照）。`plugin.yaml` の隣に `pyproject.toml` を置いて `[project].dependencies` に書くのが、同じ意味で、より勧められる書き方です。 |
| `python_runtime` | str | `external` — プラグインが自分でインタプリタと venv を持つ形（サイドカー）です。Hermes は何も導入せず、`pyproject.toml` があってもそのままにします。 |
| `config_schema` | mapping | `plugins.entries.<id>.settings` の下のキーを、JSON スキーマ風に説明したもの。`api_url: {type: str, default: "", description: "...", required: false}` のように書きます。読み込み時に検証され、食い違いはキー名と期待する型を挙げた実行可能な警告として記録されます。読み込みの失敗にはなりません。型は `str`、`int`、`float`、`bool`、`list`、`dict`（および JSON スキーマの別名）です。 |
| `license` | str | SPDX 形式のライセンス id（例: `MIT`）。 |
| `homepage` | str | プロジェクトの URL。 |
| `tags` | list of str | 自由に付ける発見用のタグ（例: `[gateway, telegram]`）。 |

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
  - "somepkg>=1.0,<2"     # installed on install/enable, re-applied after hermes update
config_schema:
  api_url: {type: str, default: "", description: "Service endpoint"}
```

### Python の依存関係 {#python-dependencies}

ディレクトリ形式のプラグインは、自分で PyPI のパッケージを持ち込めます。書く場所は、マニフェスト
（上に出てきた `python_dependencies`）か、できれば `plugin.yaml` の隣に置く `pyproject.toml` です。

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

両方があるときは `pyproject.toml` が勝ちます。Hermes がそれをどう扱うかは次のとおりです。

- **導入と有効化** — 宣言されたパッケージは `uv pip install`（駄目なら pip）で Hermes の venv へ入ります。
  そのとき **Hermes 自身が固定している依存関係から作った constraints ファイル**の下で動くので、
  プラグインが中核のパッケージ（httpx、pydantic など）を Hermes が検証した版から動かすことはできません。
  環境マーカー（`; sys_platform == "win32"`）も守られます。
- **衝突したら拒否。黙って落とすことはしません** — プラグインのツリーを所定の場所へ移す前に、
  その依存関係を、すでに有効なプラグインすべての依存関係と一緒に予行演習として解決します。
  解決できない候補は*導入されず*、エラーが衝突の中身を名指しします。すでに入っているプラグインには手を触れません。
- **`hermes update` は入れ直します** — 更新時の `uv sync` は Hermes のロックから venv を作り直し、それ以外を削ります。
  そのあと Hermes はすべてのプロファイルの有効なプラグインをたどり、宣言された依存関係を入れ直します。
  全体としてもう解決できなくなっていたら（中核の固定が動いたときなど）、記憶以外のプラグインを、
  解決できるようになるまで 1 つずつ外します。外したプラグインはそのつど名前を挙げて**はっきりしたメッセージとともに無効化**し、
  記憶のプロバイダは何よりも優先して残します。記憶なしで起動した Hermes は、データが消えたように見えるからです。
- **`hermes plugins update`** は、新しい版が宣言している内容で導入をやり直します。
- **`--no-deps`** を `hermes plugins install` に付けると、そのプラグイン 1 つだけこの仕組みを飛ばせます
  （衝突の検査もなく、何も導入されません）。パッケージを自分で面倒みたいときに使ってください。
- **`python_runtime: external` で外れる** — 重い実行環境（torch、ネイティブの拡張など）を自分のサイドカーの venv に持ち、
  別プロセスとやり取りするプラグインは、これを `plugin.yaml` に書きます。Hermes は何も導入せず、
  そのプラグインは共有の解決に加わりません。
- **読み込むものが無ければエラー** — `hermes plugins validate`（とカタログの CI）は、隣に `__init__.py` も
  `desktop/plugin.js` も `plugin.json` も無い `plugin.yaml` を落とします。コードが `src/` の下にあって
  エントリポイント経由で読まれる pip 形式のパッケージには、そのパッケージに依存する `pyproject.toml` を持った、
  薄いディレクトリ形式の包みが要ります。
- `security.allow_lazy_installs: false` にすると、この仕組みはすべて止まります。プラグインは入りますが依存関係は入らず、
  読み込みのときにローダーが警告します。

`HERMES_HOME/plugins/` は `hermes update` でも Desktop の更新でも残ります。更新が作り直すのは venv と
チェックアウトだけで、ホームディレクトリには手を触れません。

## ステップ 3: ツールのスキーマを書く {#step-3-write-the-tool-schemas}

`schemas.py` を作ります。LLM はこれを読んで、あなたのツールをいつ呼ぶかを決めます。

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

**スキーマが大事な理由:** LLM は `description` を読んで、そのツールを使うかどうかを決めます。何をするツールで、どんなときに使うのかを具体的に書いてください。`parameters` は、LLM が渡してくる引数を定めます。

## ステップ 4: ツールの処理を書く {#step-4-write-the-tool-handlers}

`tools.py` を作ります。LLM がツールを呼んだときに実際に動くコードです。

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
1. **シグネチャ:** `def my_handler(args: dict, **kwargs) -> str`
2. **戻り値:** 必ず JSON の文字列にします。成功でもエラーでも同じです。
3. **例外を投げない:** すべての例外を捕まえ、代わりにエラーの JSON を返します。
4. **`**kwargs` を受け取る:** Hermes は将来、追加のコンテキストを渡すかもしれません。

## ステップ 5: 登録処理を書く {#step-5-write-the-registration}

`__init__.py` を作ります。ここでスキーマと処理を結び付けます。

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
- 起動時にちょうど 1 回だけ呼ばれます
- `ctx.register_tool()` はツールを登録簿に入れます。モデルからはすぐに見えるようになります
- `ctx.register_hook()` はライフサイクルのイベントを購読します
- `ctx.register_cli_command()` は CLI のサブコマンドを登録します（例: `hermes my-plugin <subcommand>`）
- `ctx.register_command()` はセッション内のスラッシュコマンドを登録します（例: CLI やゲートウェイのチャットの中で `/myplugin <args>`）。後述の[スラッシュコマンドを登録する](#register-slash-commands)をご覧ください
- `ctx.dispatch_tool(name, arguments)` — ほかの任意のツール（組み込みでも別のプラグインのものでも）を、親エージェントのコンテキスト（承認、資格情報、task_id）を自動でつないだ状態で呼び出します。`terminal` や `read_file` などを、モデルが直接呼んだのと同じように動かしたいスラッシュコマンドの処理で役に立ちます。
- `ctx.get_config()` と `ctx.set_config()` が触れるのは、このプラグインの設定の名前空間だけです。`ctx.state` は、いま使っているプロファイルの下に、プラグインが持つ実行時のデータを保存します。
- この関数が落ちた場合、そのプラグインは無効になりますが、Hermes 自体は問題なく動き続けます

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

こうして呼び出したツールも、いつもの承認・伏せ字・予算の流れを通ります。それらを迂回する近道ではなく、本物のツール呼び出しです。

### 設定と実行時の状態を保存する {#store-settings-and-runtime-state}

利用者から見える振る舞いには、プラグインを基準にした設定キーを使ってください。
Hermes はそれを `plugins.entries.<plugin-id>.settings` の下で解決し、全体の設定、
別のプラグイン、上位へたどるようなパスは拒否します。

```python
def register(ctx):
    endpoint = ctx.get_config("endpoint", default="https://example.invalid")
    retries = ctx.get_config("retry.attempts", default=3)

    ctx.set_config("endpoint", endpoint)
    ctx.set_config("retry.attempts", retries)
```

実行時の帳簿づけを `config.yaml` に置くのではなく、プラグインが持つカーソル、
キャッシュ、重複除去のデータには `ctx.state` を使ってください。

```python
def register(ctx):
    cursor = ctx.state.get("cursor", default={"page": 0})
    ctx.state.set("cursor", {"page": cursor["page"] + 1})
```

状態はプロファイル単位で、まるごと置き換える形で書かれ、同時に書き込みが起きても
安全で、プラグインあたり 10 MiB までです。可搬なパッケージは、`PLUGIN_DATA` として
これと同じディレクトリを共有します。ネイティブのプラグインには、衝突しにくく
Windows でも安全な名前空間が渡されます。壊れた状態が残っていた場合は、報告した
うえでそのまま保存されます。

設定と状態は持ち主が違います。設定は `config.yaml` にある利用者から見える振る舞いで、
状態は `<HERMES_HOME>/plugin-data/` の下にある、プラグインが持つ実行時のデータです。
どちらの API も、別のプラグインの名前空間には触れません。

## ステップ 6: 動かしてみる {#step-6-test-it}

Hermes を起動します。

```bash
hermes
```

起動時のバナーのツール一覧に `calculator: calculate, unit_convert` が出るはずです。

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

プラグインが出てこない、あるいは出てくるのに読み込まれていないときは、`HERMES_PLUGINS_DEBUG=1` を設定すると、探索の詳しいログが標準エラー出力に出ます。

```bash
HERMES_PLUGINS_DEBUG=1 hermes plugins list
```

プラグインの供給元（同梱、ユーザー、プロジェクト、エントリポイント）ごとに、次のことが分かります。

- どのディレクトリを走査し、それぞれからマニフェストがいくつ見つかったか
- マニフェストごとの、解決後のキー、名前、種類、供給元、ディスク上のパス
- 飛ばした理由: `disabled via config`、`not enabled in config`、`exclusive plugin`、`no plugin.yaml, depth cap reached`
- 読み込み時: import しているプラグインと、`register(ctx)` が何を登録したか（ツール、フック、スラッシュコマンド、CLI コマンド）の 1 行の要約
- 解析に失敗したとき: その例外の完全なトレースバック（YAML のスキャナのエラーなど）
- `register()` が失敗したとき: 例外を投げた `__init__.py` の行を指す完全なトレースバック

同じログは、環境変数を設定したときには必ず `~/.hermes/logs/agent.log` にも書かれます。WARNING レベルなら失敗だけ、DEBUG レベルならすべてです。ゲートウェイの中からなど、環境変数を付けて実行できない場合は、代わりにログファイルを追ってください。

```bash
hermes logs --level WARNING | grep -i plugin
```

プラグインが出てこないときによくある原因は次のとおりです。

- **設定で有効になっていない** — プラグインは自分で有効にする方式です。`hermes plugins enable <name>` を実行してください（名前は `plugins list` の出力にあるもので、入れ子の構成では `<category>/<plugin>` の形になることがあります）。
- **ディレクトリの構成が違う:** ネイティブのパッケージは `~/.hermes/plugins/<plugin-name>/plugin.yaml`（平ら）か、カテゴリを 1 段はさんだ形にします。可搬なパッケージは、同じ場所にルートの `plugin.json` を置きます。それより深いものは無視されます。
- **`__init__.py` がない:** ネイティブのパッケージには、`plugin.yaml` と、`register(ctx)` 関数を持つ `__init__.py` の両方が必要です。可搬なパッケージは Python を import しないので、`__init__.py` は要りません。
- **`kind` が違う** — ゲートウェイのアダプタは、マニフェストに `kind: platform` が必要です。メモリのプロバイダは `kind: exclusive` として自動で判別され、`plugins.enabled` ではなく `memory.provider` の設定を通ります。

## できあがったプラグインの構成 {#your-plugins-final-structure}

```
~/.hermes/plugins/calculator/
├── plugin.yaml      # "I'm calculator, I provide tools and hooks"
├── __init__.py      # Wiring: schemas → handlers, register hooks
├── schemas.py       # What the LLM reads (descriptions + parameter specs)
└── tools.py         # What runs (calculate, unit_convert functions)
```

4 つのファイルで、役割がはっきり分かれています。
- **マニフェスト**は、そのプラグインが何であるかを宣言します
- **スキーマ**は、LLM に向けてツールを説明します
- **処理**は、実際の中身を実装します
- **登録**は、それらをつなぎます

## プラグインにはほかに何ができるのか {#what-else-can-plugins-do}

### データファイルを同梱する {#ship-data-files}

プラグインのディレクトリに好きなファイルを置き、import のときに読み込めます。

```python
# In tools.py or __init__.py
from pathlib import Path

_PLUGIN_DIR = Path(__file__).parent
_DATA_FILE = _PLUGIN_DIR / "data" / "languages.yaml"

with open(_DATA_FILE) as f:
    _DATA = yaml.safe_load(f)
```

これは*同梱する*ファイルの話です。*書き込む*状態は別の扱いになります。次の節を
ご覧ください。

### 消えない状態を保存する {#store-durable-state}

実行時の状態をプラグインのディレクトリに書かないでください。そこは導入先の
ツリーで、`hermes plugins update` や `remove` が git pull したり削除したりします。
利用者のデータもそこで消えます。正式な置き場は、プラグインごとのデータの
ルートです。ここは更新にも削除にも耐え、いま使っているプロファイルに追従します。

```python
from plugins.plugin_storage import plugin_data_dir, plugin_db

# <hermes home>/plugin-data/<name>/ — created on first use
state_file = plugin_data_dir("my-plugin") / "state.json"

# Or a SQLite database at <data dir>/data.db (WAL mode, thread-friendly)
conn = plugin_db("my-plugin")
conn.execute("CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY)")
```

プラグインごとにディレクトリが 1 つあるので、どのプラグインのデータも決まった
場所で確かめられます。秘密の情報はここに置くものではありません。資格情報の
読み出しは、ほかと同じく標準の `.env` やシークレットのスコープを通します。

### スキルを束ねる {#bundle-skills}

プラグインは、エージェントが `skill_view("plugin:skill")` で読み込むスキルファイルを同梱できます。`__init__.py` で登録します。

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
- プラグインのスキルは**読み取り専用**です。`~/.hermes/skills/` には入らず、`skill_manage` でも編集できません。
- プラグインのスキルは、システムプロンプトの `<available_skills>` の索引には**載りません**。明示的に読み込むものです。
- 名前空間があるので、素の名前のスキルには影響がなく、組み込みのスキルと名前がぶつかりません。
- エージェントがプラグインのスキルを読み込むと、同じプラグインにある兄弟スキルを並べた、まとまりを示す案内が先頭に付きます。

:::tip 古いやり方
以前の `shutil.copy2` を使うやり方（スキルを `~/.hermes/skills/` へコピーする）もまだ動きますが、組み込みのスキルと名前がぶつかる危険があります。新しく作るプラグインでは `ctx.register_skill()` を使ってください。
:::

### 環境変数を条件にする {#gate-on-environment-variables}

プラグインに API キーが要る場合は、次のように書きます。

```yaml
# plugin.yaml — simple format (backwards-compatible)
requires_env:
  - WEATHER_API_KEY
```

`WEATHER_API_KEY` が設定されていなければ、そのプラグインは分かりやすい説明とともに無効になります。落ちることも、エージェントにエラーが出ることもありません。「Plugin weather disabled (missing: WEATHER_API_KEY)」と出るだけです。

利用者が `hermes plugins install` を実行すると、`requires_env` のうち足りない変数は**その場で入力を求められます**。入力した値は自動で `.env` に保存されます。

導入の体験をよくするには、説明と取得先の URL を添えた詳しい書き方を使ってください。

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
| `description` | いいえ | 導入時の入力画面で利用者に見せる説明 |
| `url` | いいえ | 資格情報の取得先 |
| `secret` | いいえ | `true` なら入力を伏せます（パスワード欄と同じ） |

同じリストの中で両方の書き方を混ぜられます。すでに設定されている変数は、黙って飛ばされます。

### Python の任意の依存関係を、使うときに導入する {#lazy-install-optional-python-dependencies}

全員が導入しているとはかぎらない SDK（ベンダーの SDK、重い機械学習のライブラリ、特定の環境向けのパッケージ）を包むプラグインでは、モジュールの先頭で `import` しないでください。ツールの処理の中で `tools.lazy_deps.ensure(...)` を使うと、利用者の `security.allow_lazy_installs` の設定を条件に、Hermes が最初に使うときそのパッケージを導入します。

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

`tools/lazy_deps.py` のセキュリティの考え方から出てくる決まりが 2 つあります。

| 決まり | 理由 |
|---|---|
| 機能のキーは、リポジトリ内の `LAZY_DEPS` の許可リストに載っていなければなりません | 悪意ある設定が Hermes に任意のパッケージを導入させるのを防ぎます。対象になるのは Hermes 自身が同梱している指定だけです |
| 指定できるのは PyPI の名前だけです | `--index-url`、`git+https://`、file: のパスは使えません。版は許可リストの項目の中で PEP 440 の書き方（`"my-sdk>=1.2,<2"`）で固定します |

pip で配布する第三者のプラグインでは、任意の依存関係を自分の `pyproject.toml` の `[project.optional-dependencies]` に書き、利用者に `pip install your-plugin[backend]` を案内してください。この経路は `lazy_deps` を通りません。使うときに導入するやり方がいちばん役に立つのは、**同梱される**プラグインの場合です。そこで必須の依存関係を持たせると、Hermes 本体の導入がどんどん重くなってしまいます。

全体で `security.allow_lazy_installs: false` が設定されている場合、`ensure()` はすぐに `FeatureUnavailable` を投げ、どうすればよいかを示します。プラグイン側でこれを捕まえ、穏やかに機能を落としてください（ツールのループを落とさず、エラーの結果を返します）。

### スレッドで安全な遅延シングルトン {#thread-safe-lazy-singletons}

プラグインは、SDK のクライアント、HTTP のセッション、コネクションプールといった作るのに手間のかかるオブジェクトを、最初に使うときにモジュール変数へ入れて使い回すことがよくあります。

```python
_client = None

def get_client():
    global _client
    if _client is not None:
        return _client
    _client = ExpensiveClient(...)   # ← TOCTOU race
    return _client
```

これは危険な書き方です。Hermes は 1 つのプロセスで複数のスレッドを動かすので（委譲されたツール呼び出し、背景の処理、自己改善のフォーク）、`_client` が設定される前に 2 つのスレッドが `get_client()` に入り、**どちらも** `is not None` の検査を通り、**どちらも**重い生成を実行し、後の書き込みが先のものを上書きします。負けたほうが開いた資源（接続、ファイルハンドル、背景スレッド）は、そのまま漏れます。

ロックを自分で書かないでください。`plugins/plugin_utils.py` の補助を使います。

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

どちらも、同時に来た最初の呼び出しを二重チェックのロックで直列化し、生成処理を多くても 1 回しか動かしません。生成処理が例外を投げたときは何も残らず、次の呼び出しでやり直します。honcho のメモリプラグイン（`plugins/memory/honcho/client.py`）が手本になる使い方です。

> 目安: `global _something` と書いて `is None` の検査と生成が続くと感じたら、いつでもこちらを使ってください。

### ツールを条件付きで出す {#conditional-tool-availability}

任意のライブラリに依存するツールの場合は、次のようにします。

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
画面ありの Chrome の CDP バックエンドに替える、`web_search` を社内の索引に
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

`override=True` がないと、別のツールセットにある既存のツールを覆い隠すような
登録は登録簿に拒否されます。うっかりの上書きを防ぐためです。**組み込みの**
ツールを差し替える場合はさらに、運用する人が `config.yaml` で
`plugins.entries.<plugin_id>.allow_tool_override: true` を設定して受け入れる
必要があります。この関門がないと `register_tool(override=True)` は
`PluginToolOverrideError` を投げます。差し替えは記録されるので、
`~/.hermes/logs/agent.log` であとから確認できます。プラグインは組み込みの
ツールより後に読み込まれるので、登録の順番は正しく、自分の処理が組み込みの
ものを置き換えます。

**同梱ではないプラグインには、運用する人の許可も要ります。** Hermes のコアに
同梱されていないプラグイン（ユーザー、プロジェクト、pip のいずれの供給元でも）
では、既存の組み込みツールに対する `override=True` に、`config.yaml` での
プラグインごとの受け入れがさらに必要です。

```yaml
plugins:
  entries:
    my-plugin:                    # the plugin's registry key from `hermes plugins list`
      allow_tool_override: true
```

この許可がないと `ctx.register_tool(..., override=True)` は
`PluginToolOverrideError` を投げます。`register()` の例外は読み込み側が捕まえる
ので、そのプラグインは無効になり、Hermes は動き続けます。この関門があるのは、
有効になったプラグインが `shell_exec` や `write_file` のような特権的な組み込み
ツールを黙って置き換えると、モデルがそこへ流すものをすべて横取りできてしまう
からです。同梱のプラグインは対象外で、そこでの差し替えは開発側の判断です。
設定が読み込めない場合、この関門は安全側に倒れます。

このキーを手で書き換えることは、普通はありません。同梱ではないプラグインを
有効にするとき、`hermes plugins enable <name>` がこの capability を与えるか
どうかを尋ねます（既定は「いいえ」です）。スクリプトで導入するときは
`--allow-tool-override` / `--no-allow-tool-override` のフラグで質問を飛ばせます。
同じ許可は `deregister()` の関門でもあります。これがないと、プラグインは自分の
ものではないツールを取り除けません（それができると、差し替えの検査を迂回する
道になってしまいます）。

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

それぞれのフックは **[イベントフックの一覧](/hermes/docs/user-guide/features/hooks/#plugin-hooks)** に全部書いてあります。コールバックのシグネチャ、引数の表、いつ発火するのか、そして例まで載っています。ここでは要約を示します。

| フック | 発火するとき | コールバックのシグネチャ | 戻り値 |
|------|-----------|-------------------|---------|
| [`pre_tool_call`](/hermes/docs/user-guide/features/hooks/#pre_tool_call) | どのツールでも実行される前 | `tool_name: str, args: dict, task_id: str` | 任意の指示を返せます。`{"action": "block", "message": ...}` で呼び出しを止め、`{"action": "approve", "message": ...}` で人の承認を求める関門へ回します |
| [`post_tool_call`](/hermes/docs/user-guide/features/hooks/#post_tool_call) | どのツールでも結果を返した後 | `tool_name: str, args: dict, result: str, task_id: str, duration_ms: int` | 無視されます |
| [`pre_llm_call`](/hermes/docs/user-guide/features/hooks/#pre_llm_call) | 1 ターンにつき 1 回、ツール呼び出しのループの前 | `session_id: str, user_message: str, conversation_history: list, is_first_turn: bool, model: str, platform: str` | [コンテキストの差し込み](#pre_llm_call-context-injection) |
| [`post_llm_call`](/hermes/docs/user-guide/features/hooks/#post_llm_call) | 1 ターンにつき 1 回、ツール呼び出しのループの後（成功したターンのみ） | `session_id: str, user_message: str, assistant_response: str, conversation_history: list, model: str, platform: str` | 無視されます |
| `pre_api_request` | プロバイダへの生の API リクエストごと、その前（モデルがツールを呼ぶと 1 ターンで何回も発生します） | `session_id: str, model: str, provider: str, base_url: str, api_mode: str, api_call_count: int, message_count: int, tool_count: int, approx_input_tokens: int, max_tokens: int, request: dict` | 無視されます |
| `post_api_request` | プロバイダへの生の API リクエストが返るたび | `pre_api_request` のフィールドに加えて `api_duration: float, finish_reason: str, response_model: str \| None, usage: dict, response: dict, assistant_content_chars: int, assistant_tool_call_count: int` | 無視されます |
| `api_request_error` | プロバイダの API 呼び出しが例外を投げたとき | 突き合わせ用のフィールドに加えて `status_code: int \| None, retry_count: int \| None, max_retries: int \| None, retryable: bool \| None, reason: str \| None, error: dict, request: dict` | 無視されます |
| [`on_session_start`](/hermes/docs/user-guide/features/hooks/#on_session_start) | 新しいセッションが作られたとき（最初のターンのみ） | `session_id: str, model: str, platform: str` | 無視されます |
| [`on_session_end`](/hermes/docs/user-guide/features/hooks/#on_session_end) | `run_conversation` の呼び出しが終わるたび、および CLI の終了時 | `session_id: str, completed: bool, interrupted: bool, model: str, platform: str` | 無視されます |
| [`on_session_finalize`](/hermes/docs/user-guide/features/hooks/#on_session_finalize) | CLI やゲートウェイが動いているセッションを片づけるとき | `session_id: str \| None, platform: str` | 無視されます |
| [`on_session_reset`](/hermes/docs/user-guide/features/hooks/#on_session_reset) | ゲートウェイが新しいセッションキーに入れ替えたとき（`/new`、`/reset`） | `session_id: str, platform: str` | 無視されます |
| [`gateway_platform_event`](/hermes/docs/user-guide/features/hooks/#gateway_platform_event) | 許可されたプラットフォーム固有のイベントが、ゲートウェイの境界で正規化されたとき（いまは Telegram のリアクション） | `platform: str, event_type: str, payload: dict` | 無視されます |
| `kanban_task_claimed` | かんばんのタスクが引き受けられたとき（振り分け側のプロセスで、作業プロセスが起動する前） | `task_id: str, board: str \| None, assignee: str \| None, run_id: int \| None, profile_name: str` | 無視されます |
| `kanban_task_completed` | かんばんのタスクが終わったとき（作業プロセス） | `task_id, board, assignee, run_id, profile_name, summary: str \| None` | 無視されます |
| `kanban_task_blocked` | かんばんのタスクが詰まったとき（作業プロセス） | `task_id, board, assignee, run_id, profile_name, reason: str \| None` | 無視されます |

ほとんどのフックは、呼びっぱなしで見ているだけの観察者で、戻り値は無視されます。例外は、会話にコンテキストを差し込める `pre_llm_call` と、止める・承認を求めるという指示を返せる `pre_tool_call` です。

将来の変更に備えて、コールバックはすべて `**kwargs` を受け取るようにしてください。フックのコールバックが落ちた場合は、記録されたうえで飛ばされます。ほかのフックとエージェントは、そのまま動き続けます。

かんばんのライフサイクルのフックは、盤のデータベースの変更が確定した**後**に発火します。そのためコールバックが見るのは常に確定した状態で、SQLite の書き込みロックを握ってしまうこともありません。かんばんの作業プロセスは `hermes -p <profile> chat -q` という別のサブプロセスとして動くので、`kanban_task_claimed` は**振り分け側**のプロセスで、`kanban_task_completed` と `kanban_task_blocked` は**作業**プロセスで発火します。すべての遷移をまとめて見たいなら振り分け側に、タスクごとのセッション内の文脈がほしいなら作業側にフックしてください。

**API リクエストのフック**は、プロバイダへの生のリクエストを見る観察者で、ターンごとの `pre_llm_call` / `post_llm_call` の 1 段下にあります。ツールを呼ぶ 1 つのターンは API リクエストを何回も出しますが、これらのフックはその 1 回ごとに発火します。可観測性のプラグイン（トレース、費用の集計、遅延のダッシュボード）のためのものです。`request` と `response` のキーワード引数は、プロバイダのペイロードを整えてサイズを抑えた JSON の写しです（機微なキーは伏せ字にし、長い文字列は切り詰め、SDK のオブジェクトは正規化されます）。`usage` はトークン数をまとめた素の辞書です。どのペイロードにも `turn_id`、`api_request_id`、`task_id`、`session_id`、`api_call_count` という突き合わせ用のフィールドが載るので、プラグイン側でリクエストとツール呼び出しとターンをつなげられます。`api_request_error` はプロバイダの呼び出しが例外を投げたときに発火し、`status_code`、`retry_count` / `max_retries`、`retryable`、`reason`、そして `type` と `message` を持つ `error` の辞書が加わります。

### `pre_llm_call` によるコンテキストの差し込み {#prellmcall-context-injection}

戻り値に意味があるのは、このフックだけです。`pre_llm_call` のコールバックが `"context"` キーを持つ辞書（または素の文字列）を返すと、Hermes はそのテキストを**そのターンのユーザーメッセージ**に差し込みます。メモリのプラグイン、RAG との連携、ガードレール、その他モデルに追加の文脈を渡したいプラグインは、この仕組みを使います。

#### 返す形 {#return-format}

```python
# Dict with context key
return {"context": "Recalled memories:\n- User prefers dark mode\n- Last project: hermes-agent"}

# Plain string (equivalent to the dict form above)
return "Recalled memories:\n- User prefers dark mode"

# Return None or don't return → no injection (observer-only)
return None
```

None でも空でもない戻り値で `"context"` キーを持つもの（または空でない素の文字列）は、集められて、そのターンのユーザーメッセージの末尾に足されます。

#### 大きすぎるコンテキストの退避 {#oversized-context-spill}

フック 1 つあたりのコンテキストは、既定で `10,000` 文字までです。それを超えた分は `$HERMES_HOME/hook_outputs/<session_id>/<uuid>.txt` に書き出され、先頭と末尾の抜粋に保存先のパスを添えたものに置き換わります。本当に必要なら、モデルは `read_file` や `terminal` で全文を読めます。こうしておくと、暴走したプラグインが以降すべてのターンのプロンプトを膨らませ、プロンプトキャッシュの前置きを壊すことを防げます。調整は `config.yaml` で行います。

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

差し込まれたコンテキストは、システムプロンプトではなく**ユーザーメッセージ**に足されます。これは意図した設計です。

- **プロンプトキャッシュを守るため** — システムプロンプトはターンをまたいで同じままです。Anthropic と OpenRouter はシステムプロンプトの前置きをキャッシュするので、そこを動かさなければ、何度もやり取りする会話で入力トークンを 75% 以上節約できます。プラグインがシステムプロンプトを書き換えると、毎ターンがキャッシュ外れになります。
- **その場かぎり** — 差し込みは API を呼ぶときにだけ起こります。会話履歴にある元のユーザーメッセージが書き換わることはなく、セッションのデータベースにも何も残りません。
- **システムプロンプトは Hermes の領分** — そこにはモデルごとの案内、ツールの使い方の決まり、人格の指示、キャッシュ済みのスキルの内容が入っています。プラグインが加えるのは、利用者の入力に添える文脈であって、エージェントの中心となる指示を書き換えることではありません。

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

#### 例: 見ているだけのフック（差し込みなし） {#example-observer-only-hook-no-injection}

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

複数のプラグインが `pre_llm_call` からコンテキストを返した場合、それらは空行をはさんでつながれ、まとめてユーザーメッセージに足されます。順番はプラグインが見つかった順（プラグインのディレクトリ名のアルファベット順）です。

### ミドルウェア: 起きることを変える {#middleware-change-what-happens}

フックはエージェントのループを観察します（上で説明したいくつかの操作の形を除きます）。**ミドルウェアは起きることそのものを変えます**。リクエストのミドルウェアは、後続の誰かが見る前に実際のペイロードを書き換え、実行のミドルウェアは呼び出しそのものを包みます。登録は同じ `register(ctx)` の入口から行います。

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

正式な種類の一覧は、`hermes_cli/middleware.py` の `VALID_MIDDLEWARE` です。

| 種類 | 受け取るもの | 戻り値の約束 |
|------|----------|-----------------|
| `tool_request` | `tool_name`、`args`、`original_args`、文脈のキーワード引数 | `{"args": {...}}` を返すと、フック・ガードレール・承認・実行が見る前に、実際のツールの引数を置き換えます。`None` を返すと呼び出しはそのままです。 |
| `llm_request` | `request`、`original_request`、文脈のキーワード引数 | `{"request": {...}}` を返すと、Hermes が送る前に、実際にプロバイダへ渡すキーワード引数を置き換えます。 |
| `tool_execution` | ペイロードと `next_call` | ツールの実行を包みます。`next_call(payload)` をちょうど 1 回呼んで後続の連なりを実行し（呼ばずに打ち切ることもできます）、その結果を返します。 |
| `llm_execution` | ペイロードと `next_call` | 同じ形で、プロバイダの呼び出しを包みます。 |

**実際に効いてくる決まり:**

- リクエストのミドルウェアは数珠つなぎになります。各コールバックは、前のコールバックが書き換えた後のペイロードを見ます。一方 `original_args` / `original_request` には、ミドルウェアを通る前の写しが常に入っています。ペイロードはコールバックの間で複製されるので、自由に書き換えてかまいません。
- 返す辞書には `source`、`reason`、`name` の文字列を入れられます。これらはミドルウェアの記録に載り、後続の観察者のフックが `middleware_trace` のキーワード引数として受け取ります。
- 実行のミドルウェアの `next_call` は**1 回かぎり**です。2 回呼ぶと例外になります。プロバイダやツールをもう一度動かすことになるからです。
- 例外を投げたミドルウェアのコールバックは、記録されたうえで飛ばされ、連なりは続きます。`next_call` の後に後続で起きた失敗は、そのまま伝わります。ミドルウェアが土台の実行経路を壊すことはありません。
- ミドルウェアのペイロードには、観察者向けの計測フィールドと並んで `middleware_schema_version`（`hermes.middleware.v1`）が載ります。
- 知らない種類は、失敗ではなく警告とともに登録されます。そのため新しい Hermes 向けに書かれたプラグインでも、古い Hermes で読み込めます。

### CLI のコマンドを登録する {#register-cli-commands}

プラグインは、自分の `hermes <plugin>` というサブコマンドの木を足せます。

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

登録が済むと、利用者は `hermes my-plugin status` や `hermes my-plugin config` などを実行できます。

**メモリのプロバイダプラグイン**では、代わりに決まりごとに沿ったやり方を使います。プラグインの `cli.py` に `register_cli(subparser)` という関数を足すと、メモリプラグインの探索の仕組みが自動で見つけます。`ctx.register_cli_command()` を呼ぶ必要はありません。詳しくは[メモリプロバイダプラグインのガイド](/hermes/docs/developer-guide/memory-provider-plugin/#adding-cli-commands)をご覧ください。

**使っているプロバイダだけに出す:** メモリプラグインの CLI コマンドは、そのプロバイダが設定の `memory.provider` として選ばれているときにだけ現れます。利用者があなたのプロバイダを設定していなければ、ヘルプの出力を散らかすことはありません。

### スラッシュコマンドを登録する {#register-slash-commands}

プラグインは、セッションの中で使うスラッシュコマンドを登録できます。会話の途中で利用者が打ち込むコマンド（`/lcm status` や `/ping` のようなもの）です。CLI でもゲートウェイ（Telegram、Discord など）でも動きます。

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

登録が済むと、利用者はどのセッションでも `/mystatus` と打てます。このコマンドは入力補完、`/help` の出力、Telegram のボットのメニューにも出ます。

**シグネチャ:** `ctx.register_command(name: str, handler: Callable, description: str = "", args_hint: str = "")`

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `name` | `str` | 先頭のスラッシュを除いたコマンド名（例: `"lcm"`、`"mystatus"`） |
| `handler` | `Callable[[str], str \| None]` | 引数の文字列をそのまま受け取って呼ばれます。`async` でもかまいません。 |
| `description` | `str` | `/help`、入力補完、Telegram のボットのメニューに出ます |

**`register_cli_command()` との違い:**

| | `register_command()` | `register_cli_command()` |
|---|---|---|
| 呼び方 | セッションの中で `/name` | 端末で `hermes name` |
| 使える場所 | CLI のセッション、Telegram、Discord など | 端末のみ |
| 処理が受け取るもの | 引数の生の文字列 | argparse の `Namespace` |
| 向いている用途 | 診断、状態表示、手早い操作 | 込み入ったサブコマンドの木、初期設定の案内 |

**名前のぶつかりを防ぐ:** プラグインが組み込みのコマンド（`help`、`model`、`new` など）とぶつかる名前を登録しようとすると、その登録は警告を記録したうえで黙って拒否されます。組み込みのコマンドが常に優先されます。

**非同期の処理:** ゲートウェイの振り分けは、非同期の処理を自動で見分けて待ちます。同期でも非同期でも書けます。

```python
async def _handle_check(raw_args: str) -> str:
    result = await some_async_operation()
    return f"Check result: {result}"

def register(ctx):
    ctx.register_command("check", handler=_handle_check, description="Run async check")
```

### スラッシュコマンドからツールを呼び出す {#dispatch-tools-from-slash-commands}

ツールを組み合わせて動かすスラッシュコマンドの処理（`delegate_task` で下位のエージェントを起こす、`file_edit` を呼ぶなど）では、フレームワークの内部に手を伸ばさず `ctx.dispatch_tool()` を使ってください。親エージェントの文脈（作業場所の手がかり、待機表示、モデルの引き継ぎ）は自動でつながります。

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

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `name` | `str` | ツールの登録簿に登録されている名前（例: `"delegate_task"`、`"file_edit"`） |
| `args` | `dict` | ツールの引数。モデルが送るのと同じ形です |
| `parent_agent` | `Agent \| None` | 任意の指定です。省略すると、いまの CLI のエージェントから解決されます（ゲートウェイのときは穏やかに機能を落とします） |

**実行時の振る舞い:**

- **CLI のとき:** `parent_agent` は動いている CLI のエージェントから解決されるので、作業場所の手がかり、待機表示、モデルの選択が期待どおり引き継がれます。
- **ゲートウェイのとき:** CLI のエージェントがないので、ツールは穏やかに機能を落とします。作業場所は設定された端末の作業ディレクトリから読み、待機表示は出ません。
- **明示した場合:** 呼び出し側が `parent_agent=` を明示したときは、それが尊重され、上書きされません。

これが、プラグインのコマンドからツールを呼び出すための、公開された安定したインターフェースです。プラグインは `ctx._cli_ref.agent` のような私的な状態に手を伸ばすべきではありません。

### フックの中から動く（プロファイルとツール） {#act-from-inside-a-hook-profile-tools}

`ctx._cli_ref` に中身が入るのは、**対話的な CLI** のセッションだけです。ゲートウェイ、対話でない `hermes chat -q` の実行、そして**かんばんが起こした作業セッション**では `None` になります。つまり `_cli_ref` に手を伸ばすプラグインの処理は、まさにそういう場面で黙って何もしません。フックが実際に必要とするものは、セッションの種類に依存しない安定した 2 つの API でまかなえます。

- **`ctx.profile_name`** — いま使っているプロファイル名（`"default"` や、かんばんの作業プロセスでは担当のプロファイル）。`HERMES_HOME` から導かれるので、`_cli_ref` に頼らずどこでも使えます。
- **`ctx.dispatch_tool(name, args)`** — 登録されている任意のツール（組み込みでもプラグインのものでも）を呼び出します。`kanban_*` のツール、`delegate_task`、`terminal`、`read_file` なども含みます。フックがどのプロセスで発火しても、コールバックから使えます。

この 2 つを合わせると、かんばんのライフサイクルのフックが遷移を見て、フレームワークの内部に触れずに盤へ働きかけられます。

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

`hermes <subcommand>` をまるごと実行したいとき（`hermes kanban show` など）は、`ctx.dispatch_tool("terminal", {"command": "hermes kanban show ..."})` のように `terminal` ツールでシェルへ出してください。画面を持たない作業セッション向けの、プロセス内でスラッシュコマンドをつなぐ仕組みはありません。フックから Hermes を動かす手段として用意されているのはツールです。

### Slack の Block Kit のボタンの押下を処理する {#handle-slack-block-kit-button-clicks}

操作できる部品（ボタン、オーバーフローメニュー、日付選択など）を含む Block Kit のメッセージを投稿するプラグインは、押されたときの処理を Slack のアダプタへ直接登録できます。`slack_bolt.AsyncApp` に手を入れる必要はありません。

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

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `action_id` | `str \| re.Pattern \| dict` | `slack_bolt.App.action()` が受け取れるものすべて。そのままの `action_id`、複数の id に当たるコンパイル済みの正規表現、`{"action_id": "...", "block_id": "..."}` のような条件の辞書 |
| `callback` | 非同期の呼び出し可能オブジェクト | slack_bolt の作法どおり `(ack, body, action)` を受け取ります |

**実行時の振る舞い:**

- 処理はプラグインの読み込み時に待ち行列へ入り、Slack のプラットフォームがつながったときにアダプタの `slack_bolt.AsyncApp` へ結び付けられます。
- 各コールバックは守りを固めて包まれます。処理が例外を投げた場合、ゲートウェイはエラーを記録し、Slack が再送をやめるように可能なかぎり ack を返します。
- slack_bolt のいつもの決まりが当てはまります。3 秒以内に `await ack()` してから、時間のかかる処理をしてください。
- 複数のワークスペースで動かしている場合、処理はつながっているどのワークスペースからの押下でも発火します。範囲を分けたいときは `body["team"]["id"]` を使ってください。

これが、プラグインが Slack の対話機能に加わるための公開された方法です。古いプラグインは `SlackAdapter.connect` に手を入れているかもしれませんが、こちらの API を使ってください。Block Kit の操作だけでなく slack_bolt の全体（イベント、ショートカット、コマンド）を扱いたいときは、後述の汎用の `register_platform_handler("slack", ...)` を使います。

### プラットフォーム固有の処理を登録する（すべてのプラットフォーム） {#register-native-platform-handlers-any-platform}

コアのアダプタが振り分けないプラットフォームのイベント（追加の更新の種類、固有のボタンのコールバック、リアクションやメンバーのイベント、Webhook の経路）を受け取りたいプラグインは、そのプラットフォームのアダプタが接続時に呼び出す処理の生成関数を登録できます。これは**すべての**ゲートウェイのプラットフォームで使えます。

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

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `platform` | `str` | ゲートウェイのプラットフォーム名。小文字で書きます（`"telegram"`、`"discord"`、`"slack"`、`"matrix"` など） |
| `factory` | 呼び出し可能オブジェクト | 接続時に `(native, adapter)` を受け取ります |

**プラットフォームごとの `native` の中身:**

| プラットフォーム | `native` のオブジェクト | よく使うつなぎ方 |
|----------|-----------------|---------------|
| `telegram` | PTB の `Application` | `add_handler` — あらゆる更新の種類、パターンで範囲を絞ったコールバック |
| `discord` | `discord.ext.commands.Bot` | `add_listener` — リアクション、メンバーのイベント、スレッド、ボイス |
| `slack` | `slack_bolt.AsyncApp` | `app.event()` / `app.action()` / `app.command()` |
| `matrix` | Matrix のクライアント | イベントのコールバック |
| `teams` | Teams の `App` | `on_message` / `on_card_action` のデコレータ |
| `dingtalk` | `DingTalkStreamClient` | ほかのストリームの話題に対する `register_callback_handler` |
| `feishu` | lark_oapi のクライアント | API の呼び出しとイベントの振り分け |
| `line`、`api_server`、`msgraph_webhook` | aiohttp の `web.Application` | `router.add_get/post` — 独自の経路（ルータが固まる前に結び付けられます） |
| それ以外すべて（whatsapp、signal、irc、email、sms、ntfy、wecom、weixin、bluebubbles、yuanbao など） | `None` | 接続時のつなぎ口です。`adapter` のハンドルを通して操作します |

**実行時の振る舞い:**

- 生成関数はプラグインの読み込み時に待ち行列へ入り、そのプラットフォームがつながったときに呼ばれます。振り分けの順番が効いてくるプラットフォーム（Telegram、Slack、Teams、aiohttp のルータ）では、コアの処理が登録される**前**に走るので、範囲を絞ったプラグインの処理が優先され、それ以外は下へ流れます。
- **先に一致したものが勝つ振り分け表に処理を足すときは、必ず範囲を絞ってください。** Telegram なら `CallbackQueryHandler(..., pattern=r"^myplugin:")` のようにします。範囲を絞らない処理は、コアのボタンの流れ（実行の承認、モデルの選択、確認の問い合わせ）を飲み込んでしまいます。
- 生成関数はそれぞれ切り離されています。例外を投げてもエラーが記録されるだけで、プラットフォームの接続は続きます。
- プラットフォームの SDK は、モジュールの先頭ではなく生成関数の中で import してください。SDK が入っていなくても `register()` は動く必要があります。
- 1 つのプラグインが複数のプラットフォームの生成関数を登録できます。それぞれ、自分のプラットフォームがつながったときにだけ発火します。

**Telegram の別名:** `ctx.register_telegram_handler(factory)` は、`ctx.register_platform_handler("telegram", factory)` の後方互換のための別名です。

例 — Telegram の、パターンで範囲を絞ったインラインボタン:

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

例 — Discord の、リアクションのイベント:

```python
def register(ctx):
    def _wire(bot, adapter):
        async def on_raw_reaction_add(payload):
            ...  # e.g. reaction-based voting / moderation

        bot.add_listener(on_raw_reaction_add, "on_raw_reaction_add")

    ctx.register_platform_handler("discord", _wire)
```

:::tip
このガイドが扱うのは**一般的なプラグイン**（ツール、フック、スラッシュコマンド、CLI コマンド）です。以下の節では、専用のプラグインの種類ごとに書き方の骨子を示します。項目の詳細や例は、それぞれの完全なガイドへのリンクをたどってください。
:::

## 専用のプラグインの種類 {#specialized-plugin-types}

Hermes には、一般的な拡張口のほかに 5 つの専用のプラグインの種類があります。それぞれ `plugins/<category>/<name>/`（同梱）または `~/.hermes/plugins/<category>/<name>/`（ユーザー）の下のディレクトリとして置きます。取り決めはカテゴリごとに違うので、必要なものを選んでから、その完全なガイドを読んでください。

### モデルプロバイダプラグイン — LLM のバックエンドを足す {#model-provider-plugins-add-an-llm-backend}

プロファイルを `plugins/model-providers/<name>/` に置きます。

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

`get_provider_profile()` か `list_providers()` が最初に呼ばれたときに見つけられます。`auth.py`、`config.py`、`doctor.py`、`models.py`、`runtime_provider.py`、そして chat_completions の通信部分が自動でつながります。ユーザーのプラグインは、同じ名前の同梱のものを上書きします。

**完全なガイド:** [モデルプロバイダプラグイン](/hermes/docs/developer-guide/model-provider-plugin/) — 項目の説明、差し替えられるフック（`prepare_messages`、`build_extra_body`、`build_api_kwargs_extras`、`fetch_models`）、api_mode の選び方、認証の種類、テストの仕方。

### プラットフォームプラグイン — ゲートウェイのチャンネルを足す {#platform-plugins-add-a-gateway-channel}

アダプタを `plugins/platforms/<name>/` に置きます。

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

**完全なガイド:** [プラットフォームアダプタを追加する](/hermes/docs/developer-guide/adding-platform-adapters/) — `BasePlatformAdapter` の取り決めの全体、メッセージの振り分け、認証による制限、初期設定の案内との連携。標準ライブラリだけで動く実例は `plugins/platforms/irc/` を見てください。

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

メモリのプロバイダは 1 つだけ選ぶ方式で、同時に動くのは 1 つです。`config.yaml` の `memory.provider` で選びます。

プロバイダが一般的なプラグインとしても読み込まれる場合、そのライフサイクルのフックは一般の探索が受け持ちます。メモリの読み込み側がフックを用意するのは、同じプラグインの供給元が一般の探索で無事に読み込まれるまでの、代わりとしてだけです。プロバイダが繰り返し読み込まれると、その代わりのフックのまとまりが置き換わりますが、まとまりの中の別々のコールバックは残ります。これは供給元の違うプラグインのフックを重複除去するものではなく、プロバイダの有効・無効を変えるものでもありません。

**完全なガイド:** [メモリプロバイダプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/) — `MemoryProvider` の抽象基底クラス全体、スレッドについての取り決め、プロファイルの分離、`cli.py` による CLI コマンドの登録。

### コンテキストエンジンプラグイン — コンテキストの圧縮器を差し替える {#context-engine-plugins-replace-the-context-compressor}

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

コンテキストエンジンも 1 つだけ選ぶ方式で、`config.yaml` の `context.engine` で選びます。

**完全なガイド:** [コンテキストエンジンプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)。

### 画像生成のバックエンド {#image-generation-backends}

プロバイダを `plugins/image_gen/<name>/` に置きます。

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

**完全なガイド:** [画像生成プロバイダプラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/) — `ImageGenProvider` の抽象基底クラス全体、`list_models()` と `get_setup_schema()` のメタデータ、`success_response()` と `error_response()` の補助、base64 と URL のどちらで返すか、利用者による差し替え、pip での配布。

**参考になる実例:** `plugins/image_gen/openai/`（OpenAI SDK 経由の DALL-E / GPT-Image）、`plugins/image_gen/openai-codex/`、`plugins/image_gen/xai/`（Grok の画像生成）。

## Python ではない拡張口 {#non-python-extension-surfaces}

Hermes は、Python のプラグインではない拡張も受け付けます。[拡張できるインターフェースの一覧表](/hermes/docs/user-guide/features/plugins/#pluggable-interfaces--where-to-go-for-each)に載っているものです。以下の節では、それぞれの書き方を手短に示します。

### MCP サーバ — 外部のツールを登録する {#mcp-servers-register-external-tools}

Model Context Protocol（MCP）のサーバは、Python のプラグインなしで自分のツールを Hermes に登録します。`~/.hermes/config.yaml` に書きます。

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

Hermes は起動時にそれぞれのサーバへつなぎ、ツールの一覧を取り、組み込みのものと並べて登録します。LLM から見れば、ほかのツールとまったく同じです。**完全なガイド:** [MCP](/hermes/docs/user-guide/features/mcp/)。

### ゲートウェイのイベントフック — ライフサイクルのイベントで発火する {#gateway-event-hooks-fire-on-lifecycle-events}

マニフェストと処理を `~/.hermes/hooks/<name>/` に置きます。

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

イベントには `gateway:startup`、`session:start`、`session:end`、`session:reset`、`agent:start`、`agent:step`、`agent:end`、そしてワイルドカードの `command:*` があります。フックの中のエラーは捕まえて記録されるだけで、本流の処理を止めることはありません。

**完全なガイド:** [ゲートウェイのイベントフック](/hermes/docs/user-guide/features/hooks/#gateway-event-hooks)。

### シェルフック — ツールの呼び出しでシェルコマンドを動かす {#shell-hooks-run-a-shell-command-on-tool-calls}

ツールが動いたときにスクリプトを走らせたいだけなら（通知、監査の記録、デスクトップの警告、自動整形など）、`config.yaml` のシェルフックを使ってください。Python は要りません。

```yaml
hooks:
  - event: post_tool_call
    command: "notify-send 'Tool ran: {tool_name}'"
    when:
      tools: [terminal, patch, write_file]
```

Python のプラグインのフックと同じイベント（`pre_tool_call`、`post_tool_call`、`pre_llm_call`、`post_llm_call`、`on_session_start`、`on_session_end`、`pre_gateway_dispatch`）に対応し、さらに `pre_tool_call` で止める判断を返すための構造化された JSON の出力にも対応しています。

**完全なガイド:** [シェルフック](/hermes/docs/user-guide/features/hooks/#shell-hooks)。

### スキルの供給元 — 独自のスキルの登録簿を足す {#skill-sources-add-a-custom-skill-registry}

スキルを集めた GitHub のリポジトリを持っている場合（あるいは組み込みの供給元以外のコミュニティの索引から取りたい場合）は、**tap** として足します。

```bash
hermes skills tap add myorg/skills-repo
hermes skills search my-workflow --source myorg/skills-repo
hermes skills install myorg/skills-repo/my-workflow
```

自分の tap を公開するのに必要なのは、`skills/<skill-name>/SKILL.md` というディレクトリを持つ GitHub のリポジトリだけです。サーバも登録簿への申し込みも要りません。

**完全なガイド:** [Skills Hub](/hermes/docs/user-guide/features/skills/#skills-hub) · [独自の tap を公開する](/hermes/docs/user-guide/features/skills/#publishing-a-custom-skill-tap)（リポジトリの構成、最小の例、既定以外のパス、信頼の段階）。

### コマンドのテンプレートによる TTS / STT {#tts-stt-via-command-templates}

音声やテキストを読み書きする CLI なら何でも、`config.yaml` からつなげます。Python のコードは要りません。

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

STT では、`HERMES_LOCAL_STT_COMMAND` に argv 分割されたテンプレートを指定します。暗黙のシェル解釈なしで実行されるので、信頼できるローカルのコマンドがシェルの記法を必要とするなら、`sh -c`、`cmd /c`、PowerShell で明示的に包んでください。使える置き換え文字は、TTS が `{input_path}`、`{output_path}`、`{format}`、`{voice}`、`{model}`、`{speed}`、STT が `{input_path}`、`{output_dir}`、`{language}`、`{model}` です。パスをやり取りする CLI なら、そのまま拡張になります。

**完全なガイド:** [TTS のカスタムコマンドプロバイダ](/hermes/docs/user-guide/features/tts/#custom-command-providers) · [STT](/hermes/docs/user-guide/features/tts/#voice-message-transcription-stt)。

## pip で配布する {#distribute-via-pip}

プラグインを広く共有するには、自分の Python パッケージにエントリポイントを足します。

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

:::warning Nix は明示的な対応から外れました
Nix / NixOS は、明示的に対応する導入方法ではなくなりました（できるかぎりの対応にとどまります）。[Nix の設定](/hermes/docs/getting-started/nix-setup/)をご覧ください。この節は、すでに NixOS で運用している方のために残してあります。
:::

エントリポイントを持つ `pyproject.toml` を用意すれば、NixOS の利用者は設定を書くだけであなたのプラグインを導入できます。

**エントリポイント方式のプラグイン**（配布にはこちらがおすすめです）:
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

**ディレクトリ方式のプラグイン**（`pyproject.toml` は不要です）:
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

オーバーレイの使い方や衝突の検査を含む完全な説明は、[Nix の設定ガイド](/hermes/docs/getting-started/nix-setup/#plugins)をご覧ください。

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

**処理のシグネチャに `**kwargs` がない:**
```python
# Wrong — will break if Hermes passes extra context
def handler(args):
    ...

# Right
def handler(args, **kwargs):
    ...
```

**処理が例外を投げてしまう:**
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

**スキーマの説明があいまい:**
```python
# Bad — model doesn't know when to use it
"description": "Does stuff"

# Good — model knows exactly when and how
"description": "Evaluate a mathematical expression. Use for arithmetic, trig, logarithms. Supports: +, -, *, /, **, sqrt, sin, cos, log, pi, e."
```
