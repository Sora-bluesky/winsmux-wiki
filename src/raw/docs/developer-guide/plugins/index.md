---
title: "Hermes のプラグインを作る"
description: "ツール・フック・データファイル・スキルまで揃った Hermes プラグインを、順を追って作る手引き"
upstream_path: developer-guide/plugins/index.md
upstream_blob: e18239fd6d2fa083d590d7e100515e63e925acb8
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/plugins
---

# Hermes のプラグインを作る {#build-a-hermes-plugin}

このページでは、Hermes のプラグインをゼロから丸ごと作っていきます。読み終わるころには、複数のツール、ライフサイクルのフック、同梱のデータファイル、付属のスキルまで揃った、動くプラグインができています。プラグインの仕組みが持つ機能をひととおり使い切る形です。

:::info どの手引きを読めばいいか迷ったら
Hermes には差し替えられる仕組みがいくつもあります。Python の `register_*` を使うもの、設定で済むもの、決まった場所にファイルを置くだけのものと、種類はさまざまです。まずはこの対応表を見てください。

| 足したいもの | 読むページ |
|---|---|
| 独自のツール、フック、スラッシュコマンド、スキル、CLI のサブコマンド | **このページ** (プラグイン全般) |
| **デスクトップアプリ** の拡張 (ペイン、ページ、ステータスバー、パレット、テーマ) | [デスクトップ用プラグイン SDK](/hermes/docs/developer-guide/desktop-plugin-sdk/) |
| **Web ダッシュボード** の拡張 (タブ、外枠の差し込み口、テーマ) | [ダッシュボードを拡張する](/hermes/docs/user-guide/features/extending-the-dashboard/) |
| **LLM や推論の接続先** (新しいプロバイダー) | [モデルプロバイダープラグイン](/hermes/docs/developer-guide/model-provider-plugin/) |
| **ゲートウェイのつなぎ先** (Discord / Telegram / IRC / Teams など) | [サービスのアダプターを追加する](/hermes/docs/developer-guide/adding-platform-adapters/) |
| **メモリーの保存先** (Honcho / Mem0 / Supermemory など) | [メモリープロバイダープラグイン](/hermes/docs/developer-guide/memory-provider-plugin/) |
| **コンテキスト圧縮のエンジン** | [コンテキストエンジンプラグイン](/hermes/docs/developer-guide/context-engine-plugin/) |
| **画像生成の接続先** | [画像生成プロバイダープラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/) |
| **動画生成の接続先** | [動画生成プロバイダープラグイン](/hermes/docs/developer-guide/video-gen-provider-plugin/) |
| **Web 検索・本文取得の接続先** | [Web 検索プロバイダープラグイン](/hermes/docs/developer-guide/web-search-provider-plugin/) |
| **クラウドのブラウザー** (Browserbase 風の CDP セッション提供元) | [ブラウザープロバイダープラグイン](/hermes/docs/developer-guide/browser-provider-plugin/) |
| **秘密情報の管理先** (vault / パスワード管理 / OS の資格情報ストア) | [シークレットソースプラグイン](/hermes/docs/developer-guide/secret-source-plugin/) |
| **ダッシュボードの OIDC / 認証プロバイダー** | [Web ダッシュボード — 独自プロバイダー](/hermes/docs/user-guide/features/web-dashboard/#custom-providers) — `ctx.register_dashboard_auth_provider()` |
| **読み上げ (TTS) の接続先** (Piper、VoxCPM、Kokoro、声のクローンなど、どんな CLI でも) | [TTS の独自コマンドプロバイダー](/hermes/docs/user-guide/features/tts/#custom-command-providers) — 設定だけで済み、Python は要りません |
| **文字起こし (STT) の接続先** (独自の whisper や ASR の CLI) | [音声メッセージの文字起こし](/hermes/docs/user-guide/features/tts/#voice-message-transcription-stt) — `HERMES_LOCAL_STT_COMMAND` に、引数へ分解できる形のひな型を入れます |
| **MCP による外部ツール** (ファイルシステム、GitHub、Linear など、どの MCP サーバーでも) | [MCP](/hermes/docs/user-guide/features/mcp/) — `config.yaml` に `mcp_servers.<name>` を書きます |
| **ゲートウェイのイベントフック** (起動時、セッションの節目、コマンドで動く) | [イベントフック](/hermes/docs/user-guide/features/hooks/#gateway-event-hooks) — `~/.hermes/hooks/<name>/` に `HOOK.yaml` と `handler.py` を置きます |
| **シェルフック** (イベントに合わせてシェルのコマンドを走らせる) | [シェルフック](/hermes/docs/user-guide/features/hooks/#shell-hooks) — `config.yaml` の `hooks:` に書きます |
| **スキルの取得元を足す** (自前の GitHub リポジトリ、非公開のスキル一覧) | [スキル](/hermes/docs/user-guide/features/skills/) — `hermes skills tap add <repo>` · [tap を公開する](/hermes/docs/user-guide/features/skills/#publishing-a-custom-skill-tap) |
| 本体に組み込む **中核の** 推論プロバイダー (プラグインではないもの) | [プロバイダーを追加する](/hermes/docs/developer-guide/adding-providers/) |

設定で済むもの (TTS、STT、MCP、シェルフック) や、ファイルを置くだけのもの (ゲートウェイのフック) まで含めて全部を一覧にしたものは、[差し替えできる仕組みの一覧](/hermes/docs/user-guide/features/plugins/#pluggable-interfaces--where-to-go-for-each) にあります。
:::

:::caution 他社製品と組み合わせるプラグインは単独で配ります。本体のツリーには入れません
**他の人の製品やプロジェクト** とつなぐプラグイン — 監視や計測の基盤、ベンダーの SaaS との連携、分析ダッシュボード、有料サービスとの結び付けなど — は、`NousResearch/hermes-agent` に取り込まず、**独立したプラグインのリポジトリ** として作って配ります。利用者は `~/.hermes/plugins/` に入れるか、pip のエントリーポイント経由で入れます。このページに書いてあることは、独立したリポジトリでもそのまま通用します。これは結合と保守についての判断であって (本体の動きが速く、そちらの接続先はこちらの持ち物ではありません)、品質の線引きではありません。とても良いプラグインが、それでも自分のリポジトリに属する、ということはあります。できたら Nous Research の Discord の `#plugins-skills-and-skins` チャンネルで宣伝してください。方針は [CONTRIBUTING.md](https://github.com/NousResearch/hermes-agent/blob/main/CONTRIBUTING.md) にあります。
:::

## Portable Agent Plugins v1 のパッケージ {#portable-agent-plugins-v1-packages}

Hermes は、Agent Plugins v1.0.0 の形式に沿ったディレクトリ
パッケージも入れて読み込めます。これは、Hermes がすでに持っている
持ち運べる部品のための互換の橋渡しです。もともとの `plugin.yaml` と
`register(ctx)` によるプラグインを置き換えるものではありません。

```text
my-portable-plugin/
├── plugin.json
├── skills/
│   └── summarize/
│       ├── SKILL.md
│       └── references/
└── mcp.json
```

持ち運べるパッケージは、ふだんと同じ手順で入れて有効にします。

```bash
hermes plugins install owner/repository --no-enable
hermes plugins list
hermes plugins enable <plugin-name>
```

持ち運べるパッケージは、入れただけでは無効のままで、自分で有効に
するまで動きません。有効にしたパッケージは、`skills/*/SKILL.md` の
ディレクトリと、直下の `mcp.json` に書かれた stdio の MCP サーバーを
すぐに使えるようにします。スキルは読み取り専用で、名前空間が付き、
`skills_list` と `skill_view` から読み込まれます。MCP のコマンドは、
実行ファイル 1 つと引数のリストに分けて渡され、シェルは通しません。
完全な形のスキル名は `skills_list` で調べられます。持ち運べるスキルの
名前空間は `agent-plugin-<slug>-<hash>` という決まった形で、見つけた
プラグインのキーから作られるので、名前を整えたあとでもぶつかりません。

Hermes は `plugin.json`、Agent Skills のフロントマター、部品の置き場所、
`mcp.json`、解決したパス、シンボリックリンクが外へ出ていないかを、
手元で確かめます。読み込みのときに JSON スキーマを取りに行くことは
ありません。壊れたスキルや MCP の項目は、その場だけで飛ばされ、
隣の正しい部品は読み込めるなら読み込まれます。
`PLUGIN_ROOT` は解決後のパッケージの根を指します。`PLUGIN_DATA` は
Hermes が管理する、プロファイルごとの書き込み可能なディレクトリを指します。
持ち運べる MCP の `env` に書いた値は、パッケージの中身として見えるデータで、
秘密情報の保管場所ではありません。`mcp.json` に資格情報を書かないでください。

いま対応している持ち運べる形式の範囲は、stdio と Streamable HTTP の MCP です。
持ち運べる `streamable-http` の項目は、Hermes がもともと持っている
リモート MCP のクライアント (URL を書く `mcp_servers` の設定を動かしている
のと同じ仕組み) を通り、そのうえで v1 の決まりが守られます。URL は
ユーザー情報も断片も付かない絶対の http(s) であること、素の HTTP は
`localhost` やループバックのホストにだけ許されること、設定したヘッダーは
別のオリジンへのリダイレクトをまたいで送られないこと、です。古い `sse` の
項目は報告されたうえで飛ばされます。Agent Plugins v1 は、信頼、権限、出所、
サンドボックスについて何も決めていません。パッケージを有効にすることは、
その指示と手元の実行ファイルに、他の Hermes プラグインと同じだけの
全面的な信頼を与えることです。

[整形された仕様](https://agent-plugins.org/specification) はいまのところ
v1.0.0 を Working Draft としていますが、
[版ごとの仕様リポジトリ](https://github.com/agentplugins/agent-plugins-spec/blob/main/spec/1.0.0.md)
では Published となっています。Hermes は、どちらの揺れ動く表示でもなく、
v1.0.0 の正式なスキーマ識別子と規範となる本文を基準に動きます。これは
はっきり決めた対応範囲であって、Agent Plugins に完全に沿っているという
主張ではありません。

## もともとのプラグインの互換の約束 {#native-plugin-compatibility-contract}

`plugin.yaml` と `register(ctx)` によるもともとのプラグインは、ひとつの
グローバルなプラグイン API 番号ではなく、振る舞いによって守られます。
Hermes は `PLUGIN_API_VERSION` を公開しませんし、マニフェスト全体での
`api:` の一致を求めることも、関係のない値に API の版を付けることも
しません。文書に書かれた振る舞いを使っているプラグインは、ふつうに
Hermes を更新したあとも動き続けるはずです。

互換の決まりは次のとおりです。

- **足す方向に育てる。** 文書に載っている `PluginContext` のメソッドは、
  消したり名前を変えたりしません。新しい引数は省略でき、既定値を持ち、
  キーワード専用にすべきです。返り値の既存の項目を消したり、黙って型を
  変えたりしません。
- **フックの受け渡しはキーワードで行う。** フックのデータを増やすときは
  キーワードの項目として足し、既存の項目の意味や位置を変えることは
  しません。Hermes はコールバックの引数の並びを見ます。昔からの
  コールバックには、それが書いてある項目だけが渡り、`**kwargs` を持つ
  コールバックにはいまの全部が渡ります。新しいプラグインは `**kwargs` を
  受け取るようにしておくと、引数の並びを変えなくても新しいデータを
  受け取れます。
- **マニフェストは追加に開かれている。** 知らない `plugin.yaml` の項目は
  無視されます。ですから古い Hermes でも、新しい版で入った情報が書かれた
  マニフェストのプラグインを読み込めます。プラグインのコード自体が、
  対応している振る舞いを使っているかぎりは、という条件付きです。
- **プロバイダーの作法は既定値で育てる。** 新しいプロバイダーのメソッドには
  既定の実装があります。コールバックへ渡す新しい情報は省略でき、引数の
  並びを見て受け取れると分かったときにだけ渡されます。抽象メソッドを
  足したり、条件なしで引数を渡すようにしたりするには、ある日いっせいに
  切り替えるのではなく、移行のための期間が要ります。
- **境界をまたぐ約束には版を付ける。** ある機能が、通信の中身や保存の形を
  決めているなら (たとえば観測用の受け渡しや、シークレットソースの状態)、
  その機能ごとにスキーマの版を持てます。そのスキーマの中では、項目は
  足す方向に保ってください。保存されたプラグインの状態と設定は読めるまま
  でなければならず、そうでなければ移行の処理を用意します。古い形式で
  書かれた再開可能なセッションも、変わらず再生できる必要があります。
  関係のないコールバックや文脈の値に、版を表す文字を足さないでください。

### 廃止のときの決まり {#deprecation-policy}

文書に載っているもともとのプラグインの振る舞いを廃止できるのは、次の
すべてを満たすときだけです。

1. 代わりになるものと移行の手順を、プラグインの手引きとリリースノートに
   書くこと。
2. プロセスごとに 1 回までの警告を出し、そこで代わりになるものと、
   いちばん早い削除の版を名指しすること。
3. そのあと少なくとも 2 回のマイナーリリースのあいだ、古い振る舞いを
   使えるようにしておくこと。
4. その期間ずっと、古い経路と新しい経路の両方について、振る舞いに基づく
   互換のテストを持つこと。

期間が終わって取り除くときは、保存されたデータや再開できるセッションに
必要な移行も一緒に用意します。実際のところ、取り除くよりも、別名や
橋渡しを足すほうが好まれます。

Hermes はこの約束を、隔離した `HERMES_HOME` から見つけてくる、固定した
外部プラグインの見本で強制しています。それらのテストは `PluginManager` を
通してプラグインを読み込んで呼び出し、内部の記号の一覧やソースの見た目では
なく、実際の登録とコールバックの結果を確かめます。

### 2026 年 9 月のモジュール分割: 古い import パスは 2026-09-14 で終わり {#sep-2026-module-decomposition-old-import-paths-end-2026-09-14}

Hermes の内部は 2026 年 9 月に `<stem>_<topic>` という兄弟モジュールへ分割されました (PR #102117)。**Internal

は **2026-09-14** まで古いモジュールから解決され、そのあと互換の層は取り除かれます。

- **自分のプラグインを確かめる:** `hermes plugins compat /path/to/your/plugin` を実行すると、古いパスを使っている
  `file:line` と、新しいパスがすべて並びます。残っているあいだは終了コード 1 になります。全部の対応はリポジトリの `COMPAT_MANIFEST.md` にあります。
- **利用者に見えるもの:** CLI の見出しの下、`hermes doctor`、`hermes update` のあとに知らせが出ます。デスクトップでは
  プラグイン名を挙げたダイアログが 1 回だけ出ます。古いパスを通るたびに、プロセスごとに 1 回
  `HermesPluginCompatWarning` も出ます。
- **2026-09-14 から:** 古いパスを import しているプラグインは **読み込まれません** (理由は
  `hermes plugins list` に出ます)。層が実際に取り除かれるまでは `plugins.allow_deprecated_imports: true` で無理に
  読み込ませられますが、取り除かれたあとは古いパスは `ImportError` になります。

## これから作るもの {#what-youre-building}

ツールを 2 つ持つ **電卓** のプラグインです。
- `calculate` — 数式を計算します (`2**16`、`sqrt(144)`、`pi * 5**2`)
- `unit_convert` — 単位を変換します (`100 F → 37.78 C`、`5 km → 3.11 mi`)

これに加えて、ツールの呼び出しを毎回記録するフックと、付属のスキルファイルも作ります。

## 手順 1: プラグインのディレクトリを作る {#step-1-create-the-plugin-directory}

ディレクトリを作って、手順 2 へ進みます。

```bash
mkdir -p ~/.hermes/plugins/calculator
cd ~/.hermes/plugins/calculator
```

### Plugin Doctor で確かめる {#validate-with-plugin-doctor}

`hermes plugins doctor [path-or-id]` は、Hermes 自身が使っているのと同じ
ディレクトリの探索、マニフェストの読み取り、名前空間を分けた import、
`register(ctx)`、フックの登録簿、ツールの登録簿を、そのまま走らせます。
おかしなフック名、`**kwargs` を受け取らないコールバック、登録の失敗、
宣言したツールやフックと実際に登録されたものとのずれを教えてくれます。
`--ci` を付けると、問題があったときに 0 以外で終わります。

```bash
hermes plugins doctor . --ci
```

Doctor は一時的な `HERMES_HOME` を使い、確認が終わったらプラグインの登録
状態を元に戻し、登録の最中にうっかり通信してしまうのを捕まえるために
Python の直接のソケット接続を止めます。ただしこれはサンドボックスでは
ありません。プラグインのコードは同じプロセスの中で、いまの利用者の権限で
動き、子プロセスも作れます。import してもよいと思えるコードにだけ Doctor を
かけてください。

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

これで Hermes に「自分は calculator という名前のプラグインで、ツールとフックを出します」と伝わります。`provides_tools` と `provides_hooks` は、そのプラグインが登録するものを並べた一覧です。

足せる項目には次のようなものもあります。
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

組み込みのツールを差し替える、`ctx.llm` の呼び出しに使うモデルを選ぶ、といった
強い権限が要るなら、`capabilities:` に書いてください。
入れるとき・有効にするときに、利用者はその一覧を見て一度だけ許可します。あとの
版で新しい項目が増えたら、更新のときに増えた分だけもう一度たずねます。
宣言していない、あるいは許可されていない機能は単に使えない (安全側に倒れる) ので、
**使う前に確かめて、無ければ無いなりに動くようにしてください**。

```python
def register(ctx):
    if ctx.has_capability("tools.override"):
        ctx.register_tool(..., override=True)
    else:
        ctx.register_tool(...)   # register under a non-conflicting name
```

決まっている ID は `tools.override`、`llm.provider_override`、
`llm.model_override`、`llm.agent_id_override`、`llm.profile_override`、
`llm.task_override` です (正式な一覧は `hermes_cli/plugin_capabilities.py` に
あります)。知らない ID は無視されます。機能ごとの古い設定キー
(`plugins.entries.<id>.allow_tool_override` など) もいまは効きますが、
これは廃止の予定です。宣言のほうを使ってください。利用者が、あとから
たどれる 1 枚の許可画面を見られるようになります。この仕組みは許可と記録の
ためのもので、**サンドボックスではありません**。守っているのは、こちら側の
API の入口だけです。

**pip で配るプラグイン** は、入れたあとに `plugin.yaml` のディレクトリを
持ちません。そこで、配布物の情報のほうに、対になる
`hermes_agent.plugin_capabilities` というエントリーポイントの群で書きます。
それぞれの宣言は `<plugin-id>.<capability-id>` という名前で、`hermes_agent.plugins`
のエントリーポイントと同じものを指します。

```toml
[project.entry-points."hermes_agent.plugins"]
calculator = "my_pkg:register"

[project.entry-points."hermes_agent.plugin_capabilities"]
"calculator.tools.override" = "my_pkg:register"
```

Hermes は、コードを import せずに入っている配布物の情報からこれを読むので、
pip で入れた場合も `hermes plugins capabilities` と許可の流れが正しく動きます。

### マニフェスト v2 早見表 {#manifest-v2-reference}

`plugin.yaml` は、項目を足した **v2 のスキーマ** にも対応しています (#64165)。どの
項目も省略できます。`manifest_version` の無いマニフェストは v1 のマニフェストで、
これからもずっとそのまま使えます。知らない項目で読み込みが止まることはありません。
警告を出して無視されます (先の版との互換のため)。この Hermes が知っているより新しい
`manifest_version` でも、警告付きで読み込まれます。

| 項目 | 型 | 意味 |
|---|---|---|
| `manifest_version` | int | マニフェストの **ファイル形式** の版。無ければ `1`。いまの上限は `2`。`api_version` とは別物です。 |
| `api_version` | int | そのプラグインが狙っている **プラグイン API の世代** (ctx の顔ぶれやフックの引数の並び)。`manifest_version` とはわざと別の軸にしてあります。`api_version: 1` のプラグインが v2 のマニフェストを使ってもかまいません。 |
| `requires_plugins` | list | プラグイン同士の依存。`- id: other-plugin` に、必要なら `version_range: ">=1.0,<2"` を添えます。**助言にすぎません**。足りない依存があれば分かりやすい警告が出ますが、プラグインは読み込まれます。実行時に `ctx.has_plugin("other-plugin")` で確かめてください。読み込みの **順番** はこの関係に従います。A が B を必要とするなら、B の `register()` が先に走ります (トポロジカル順、同点なら名前順。循環していたら警告を出して名前順に戻ります)。 |
| `python_dependencies` | list of str | pip で必要になるものの宣言 (たとえば `"requests>=2.0,<3"`)。**書く場所があるだけ** です。Hermes は書式を確かめ、`hermes plugins install` や `hermes plugins doctor` が足りないものを `pip install` の案内付きで知らせますが、**勝手に入れることはありません**。上限の版も添えてください。 |
| `config_schema` | mapping | `plugins.entries.<id>.settings` の下に置くキーを、JSON スキーマ風に書いたもの。`api_url: {type: str, default: "", description: "...", required: false}` のように書きます。読み込みのときに確かめられ、合わなければキー名と期待する型を挙げた実用的な警告が出ます。読み込みの失敗にはなりません。型は `str`、`int`、`float`、`bool`、`list`、`dict` (と JSON スキーマ側の別名) です。 |
| `license` | str | SPDX 形式のライセンス ID (たとえば `MIT`)。 |
| `homepage` | str | プロジェクトの URL。 |
| `tags` | list of str | 見つけやすくするための自由なタグ (たとえば `[gateway, telegram]`)。 |

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

:::note pip の依存の切り分けは先送りです
`python_dependencies` は、わざと「書いて知らせるだけ」にしてあります。
Hermes が共有している仮想環境に好きなパッケージを入れると、衝突のもとにも
供給網の弱点にもなります。ですから、入れる側の切り分けをどう設計するか
(本体のロックに対する制約ファイルでの導入か、プラグインごとに同梱する
ディレクトリか、衝突を見つけて断るか) は、はっきり先送りの宿題としてあります。
[#64165](https://github.com/NousResearch/hermes-agent/issues/64165) の
2 巡目のレビューと
[#15220](https://github.com/NousResearch/hermes-agent/issues/15220) を見てください。
プラグインパック (#64166) はこの v2 の項目の上に作られます。
:::

## 手順 3: ツールのスキーマを書く {#step-3-write-the-tool-schemas}

`schemas.py` を作ります。これは、いつツールを呼ぶかを LLM が決めるために読むものです。

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

**スキーマが効いてくる理由:** LLM は `description` を読んで、そのツールをいつ使うかを決めます。何をするもので、どんなときに使うのかを、はっきり書いてください。`parameters` は、LLM が渡す引数を決めます。

## 手順 4: ツールの処理を書く {#step-4-write-the-tool-handlers}

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
1. **引数の並び:** `def my_handler(args: dict, **kwargs) -> str`
2. **返り値:** かならず JSON の文字列にします。成功でも失敗でも同じです。
3. **例外を投げない:** 例外はすべて受け止め、代わりにエラーの JSON を返します。
4. **`**kwargs` を受け取る:** Hermes が将来、別の情報を渡すかもしれません。

## 手順 5: 登録を書く {#step-5-write-the-registration}

`__init__.py` を作ります。スキーマと処理をつなぐところです。

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

**`register()` が何をしているか:**
- 起動時にちょうど 1 回だけ呼ばれます
- `ctx.register_tool()` でツールが登録簿に入り、モデルからすぐ見えるようになります
- `ctx.register_hook()` はライフサイクルのイベントを受け取る登録です
- `ctx.register_cli_command()` は CLI のサブコマンドを登録します (たとえば `hermes my-plugin <subcommand>`)
- `ctx.register_command()` は、会話の中で使うスラッシュコマンドを登録します (CLI やゲートウェイのチャットで打つ `/myplugin <args>` など)。下の [スラッシュコマンドを登録する](#register-slash-commands) を参照してください
- `ctx.dispatch_tool(name, arguments)` — 他のツール (組み込みでも、別のプラグインのものでも) を、親エージェントの文脈 (承認、資格情報、task_id) をそのまま引き継いだ形で呼びます。スラッシュコマンドの処理から `terminal` や `read_file` などを、モデルが直接呼んだのと同じように動かしたいときに便利です。
- `ctx.get_config()` と `ctx.set_config()` は、このプラグインの設定の場所だけを読み書きします。`ctx.state` は、いま使っているプロファイルの下に、プラグイン自身の実行時のデータを置きます。
- この関数が落ちても、そのプラグインが無効になるだけで、Hermes は問題なく動き続けます

**`dispatch_tool` の例 — ツールを走らせるスラッシュコマンド:**

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

こうして呼ばれたツールも、承認・伏せ字・予算の処理をふつうに通ります。抜け道ではなく、本物のツール呼び出しです。

### 設定と実行時の状態を持つ {#store-settings-and-runtime-state}

利用者から見える振る舞いには、プラグインを起点にした設定キーを使ってください。Hermes は
それを `plugins.entries.<plugin-id>.settings` の下で解決し、全体の設定、他のプラグイン、
上の階層へ抜けるようなパスは断ります。

```python
def register(ctx):
    endpoint = ctx.get_config("endpoint", default="https://example.invalid")
    retries = ctx.get_config("retry.attempts", default=3)

    ctx.set_config("endpoint", endpoint)
    ctx.set_config("retry.attempts", retries)
```

読み進めた位置、キャッシュ、重複を避けるための記録といった、プラグイン自身のデータは
`config.yaml` に書かず、`ctx.state` を使ってください。

```python
def register(ctx):
    cursor = ctx.state.get("cursor", default={"page": 0})
    ctx.state.set("cursor", {"page": cursor["page"] + 1})
```

状態はプロファイルごとに分かれ、まるごと置き換えられ、同時に書き込んでも壊れず、
プラグインあたり 10 MiB までです。持ち運べるパッケージは、これと同じディレクトリを
`PLUGIN_DATA` として使います。もともとの形式のプラグインには、ぶつかりにくく
Windows でも安全な名前空間が割り当てられます。壊れた状態が残っていたら、報告したうえで
そのまま残されます。

設定と状態は持ち主が違います。設定は `config.yaml` にある、利用者から見える振る舞いです。
状態は `<HERMES_HOME>/plugin-data/` の下にある、プラグイン自身の実行時のデータです。
どちらの API からも、他のプラグインの領域は見えません。

## 手順 6: 動かしてみる {#step-6-test-it}

Hermes を起動します。

```bash
hermes
```

見出しのツール一覧に `calculator: calculate, unit_convert` が出るはずです。

こんなふうに話しかけてみてください。
```
What's 2 to the power of 16?
Convert 100 fahrenheit to celsius
What's the square root of 2 times pi?
How many gigabytes is 1.5 terabytes?
```

プラグインの状態を見ます。
```
/plugins
```

出力はこうなります。
```
Plugins (1):
  ✓ calculator v1.0.0 (2 tools, 1 hooks)
```

### プラグインが見つからないときに調べる {#debugging-plugin-discovery}

プラグインが出てこない、あるいは出てくるのに読み込まれないときは、`HERMES_PLUGINS_DEBUG=1` を付けると、探索の様子が細かく標準エラーへ出ます。

```bash
HERMES_PLUGINS_DEBUG=1 hermes plugins list
```

プラグインの取得元ごとに (同梱、利用者、プロジェクト、エントリーポイント) 次が見られます。

- どのディレクトリを見て、そこからマニフェストが何件見つかったか
- マニフェストごとに、決まったキー、名前、種類、取得元、ディスク上のパス
- 飛ばした理由。`disabled via config`、`not enabled in config`、`exclusive plugin`、`no plugin.yaml, depth cap reached`
- 読み込み時。import しているプラグインと、`register(ctx)` が何を登録したか (ツール、フック、スラッシュコマンド、CLI コマンド) の 1 行のまとめ
- 読み取りに失敗したとき。例外の完全な traceback (YAML の解析エラーなど)
- `register()` が失敗したとき。`__init__.py` のどの行で起きたかを指す完全な traceback

同じ内容は、環境変数を付けたときに `~/.hermes/logs/agent.log` へも必ず書かれます。WARNING の高さでは失敗だけ、DEBUG の高さでは全部です。環境変数を付けて実行できない場面 (ゲートウェイの中など) では、ログファイルのほうを見てください。

```bash
hermes logs --level WARNING | grep -i plugin
```

プラグインが出てこない、よくある理由は次のとおりです。

- **設定で有効にしていない** — プラグインは自分で有効にする方式です。`hermes plugins enable <name>` を実行してください (名前は `plugins list` の出力にあるもので、入れ子の置き方をしていると `<category>/<plugin>` の形になります)。
- **置き場所が違う:** もともとの形式のパッケージは `~/.hermes/plugins/<plugin-name>/plugin.yaml` (平ら) か、分類を 1 段はさむ形です。持ち運べるパッケージは、同じ場所に直下の `plugin.json` を置きます。それより深いものは見られません。
- **`__init__.py` が無い:** もともとの形式のパッケージには、`plugin.yaml` と、`register(ctx)` を持つ `__init__.py` の両方が要ります。持ち運べるパッケージは Python を import しないので、`__init__.py` は要りません。
- **`kind` が違う** — ゲートウェイのアダプターには、マニフェストに `kind: platform` が要ります。メモリープロバイダーは `kind: exclusive` として自動で見分けられ、`plugins.enabled` ではなく `memory.provider` の設定で扱われます。

## できあがったプラグインの構成 {#your-plugins-final-structure}

```
~/.hermes/plugins/calculator/
├── plugin.yaml      # "I'm calculator, I provide tools and hooks"
├── __init__.py      # Wiring: schemas → handlers, register hooks
├── schemas.py       # What the LLM reads (descriptions + parameter specs)
└── tools.py         # What runs (calculate, unit_convert functions)
```

4 つのファイルで、役割がはっきり分かれています。
- **マニフェスト** は、そのプラグインが何者かを宣言します
- **スキーマ** は、LLM に向けてツールを説明します
- **処理** は、実際の中身を書きます
- **登録** は、それらをつなぎます

## プラグインには他に何ができるか {#what-else-can-plugins-do}

### データファイルを同梱する {#ship-data-files}

プラグインのディレクトリに好きなファイルを置き、import のときに読めます。

```python
# In tools.py or __init__.py
from pathlib import Path

_PLUGIN_DIR = Path(__file__).parent
_DATA_FILE = _PLUGIN_DIR / "data" / "languages.yaml"

with open(_DATA_FILE) as f:
    _DATA = yaml.safe_load(f)
```

これは *同梱する* ファイルの話です。*書き込む* 状態は別で、次の節を見てください。

### 消えない状態を持つ {#store-durable-state}

実行時の状態をプラグインのディレクトリに書かないでください。そこは
入れた場所そのもので、`hermes plugins update` や `remove` は git で引き直したり
消したりします。利用者のデータもそこで死んでしまいます。正しい置き場は、
プラグインごとのデータの根です。更新にも削除にも耐え、いま使っている
プロファイルに付いていきます。

```python
from plugins.plugin_storage import plugin_data_dir, plugin_db

# <hermes home>/plugin-data/<name>/ — created on first use
state_file = plugin_data_dir("my-plugin") / "state.json"

# Or a SQLite database at <data dir>/data.db (WAL mode, thread-friendly)
conn = plugin_db("my-plugin")
conn.execute("CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY)")
```

プラグインごとに 1 つのディレクトリという決まりのおかげで、どのプラグインの
データも、予想どおりの一か所で確かめられます。秘密情報はここには置きません。
資格情報の読み取りは、他と同じく `.env` やシークレットの仕組みを通します。

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

**押さえておきたい性質:**
- プラグインのスキルは **読み取り専用** です。`~/.hermes/skills/` には入らず、`skill_manage` からも編集できません。
- プラグインのスキルは、システムプロンプトの `<available_skills>` の索引には **載りません**。必要なときに名指しで読み込む形です。
- 名前空間を付けない呼び方はそのままです。名前空間があるので、組み込みのスキルとぶつかりません。
- エージェントがプラグインのスキルを読み込むと、同じプラグインにある兄弟のスキルを並べた案内が先頭に付きます。

:::tip 昔のやり方
`shutil.copy2` でスキルを `~/.hermes/skills/` へ複製する昔のやり方もまだ動きますが、組み込みのスキルと名前がぶつかる恐れがあります。新しいプラグインでは `ctx.register_skill()` を使ってください。
:::

### 環境変数で使える・使えないを決める {#gate-on-environment-variables}

プラグインに API キーが要る場合は、こう書きます。

```yaml
# plugin.yaml — simple format (backwards-compatible)
requires_env:
  - WEATHER_API_KEY
```

`WEATHER_API_KEY` が設定されていなければ、そのプラグインは分かりやすい知らせとともに無効になります。落ちることも、エージェント側でエラーになることもありません。「Plugin weather disabled (missing: WEATHER_API_KEY)」と出るだけです。

`hermes plugins install` を実行すると、足りない `requires_env` の変数は **その場でたずねられます**。入力した値は `.env` へ自動で保存されます。

入れるときの体験をよくしたいなら、説明と取得先の URL を書ける、詳しいほうの形式を使ってください。

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
| `description` | いいえ | 入れるときの問いかけで利用者に見せる説明 |
| `url` | いいえ | その資格情報をどこで手に入れるか |
| `secret` | いいえ | `true` なら、パスワード欄のように入力が隠れます |

2 つの形式は同じ一覧の中で混ぜられます。すでに設定されている変数は、黙って飛ばされます。

### Python の任意の依存を、使うときに入れる {#lazy-install-optional-python-dependencies}

全員が入れているとはかぎらない SDK (ベンダーの SDK、重い機械学習のライブラリ、特定の OS 向けのパッケージ) を包むプラグインでは、モジュールの先頭で `import` しないでください。ツールの処理の中で `tools.lazy_deps.ensure(...)` を使います。Hermes が最初に使われたときにパッケージを入れます。ただし利用者の `security.allow_lazy_installs` の設定に従います。

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

`tools/lazy_deps.py` の安全についての考え方から、決まりが 2 つあります。

| 決まり | 理由 |
|---|---|
| 自分の機能のキーが、本体に入っている `LAZY_DEPS` の許可リストに載っていること | 悪意のある設定に乗せられて、Hermes が好きなパッケージを入れてしまうのを防ぎます。対象になるのは Hermes 自身が同梱している指定だけです |
| 指定は PyPI の名前だけ | `--index-url`、`git+https://`、file: のパスは使えません。版は許可リストの項目の中で PEP 440 の書き方で固定します (`"my-sdk>=1.2,<2"`) |

pip で配る他社製のプラグインでは、任意の依存を自分の `pyproject.toml` の `[project.optional-dependencies]` に書き、利用者に `pip install your-plugin[backend]` と伝えてください。その道は `lazy_deps` を通りません。使うときに入れるやり方がいちばん効くのは、**同梱の** プラグインで、必須の依存にすると Hermes の基本の大きさが膨らんでしまう場合です。

全体で `security.allow_lazy_installs: false` になっていると、`ensure()` はすぐに `FeatureUnavailable` を投げ、どうすればよいかの案内を添えます。プラグイン側はそれを受け止めて、無ければ無いなりに動いてください (ツールの処理を止めるのではなく、エラーの結果を返します)。

### スレッドから見ても安全な、遅らせた 1 個だけの生成 {#thread-safe-lazy-singletons}

プラグインでは、作るのに手間のかかるもの (SDK のクライアント、HTTP のセッション、接続の束) を、最初に使うときにモジュール変数へしまい込むことがよくあります。

```python
_client = None

def get_client():
    global _client
    if _client is not None:
        return _client
    _client = ExpensiveClient(...)   # ← TOCTOU race
    return _client
```

これは危ない書き方です。Hermes は 1 つのプロセスで複数のスレッドを動かすので (委任したツールの呼び出し、裏で動く処理、自己改善のための分岐)、`_client` が入る前に 2 つのスレッドが `get_client()` に着き、**どちらも** `is not None` を素通りし、**どちらも** 重い生成を走らせ、あとの書き込みが先の書き込みを上書きします。負けたほうが開いた資源 (接続、ファイルの口、裏のスレッド) は行き場を失います。

ロックを自分で書かないでください。`plugins/plugin_utils.py` の助けを使います。

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

どちらも、同時に来た最初の呼び出しを二重確認のロックで順番に並べ、生成を多くても 1 回にします。生成が失敗した場合は何も残らず、次の呼び出しでやり直します。honcho のメモリープラグイン (`plugins/memory/honcho/client.py`) が、そのお手本です。

> 目安として、`global _something` と書いて `is None` を確かめて生成する、という形になったら、いつでもこちらに手を伸ばしてください。

### 条件によってツールを出す・出さない {#conditional-tool-availability}

任意のライブラリに頼るツールでは、こう書きます。

```python
ctx.register_tool(
    name="my_tool",
    schema={...},
    handler=my_handler,
    check_fn=lambda: _has_optional_lib(),  # False = tool hidden from model
)
```

### 組み込みのツールを差し替える {#overriding-a-built-in-tool}

組み込みのツールを自分の実装に置き換えるとき (たとえば既定のブラウザーの
ツールを、画面ありの Chrome を CDP でつなぐものに替える、`web_search` を
社内の検索に替える、など) は、`override=True` を渡します。

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

`override=True` が無い場合、別のツールセットにある既存のツールを覆い隠すような
登録は断られます。うっかりした上書きを防ぐためです。**組み込みの** ツールを
差し替えるには、そのうえで運用する側が `config.yaml` の
`plugins.entries.<plugin_id>.allow_tool_override: true` で許可する必要があります。
その許可が無いと、`register_tool(override=True)` は
`PluginToolOverrideError` を投げます。差し替えは記録に残るので、
`~/.hermes/logs/agent.log` であとから確かめられます。プラグインは組み込みの
ツールより後に読み込まれるので、順番は正しく、こちらの処理が組み込みの
ものを置き換えます。

**同梱でないプラグインにも、運用する側の許可が要ります。** Hermes 本体に
付いてこないプラグイン (利用者、プロジェクト、pip のいずれの取得元でも) が、
既存の組み込みツールに対して `override=True` を使うには、`config.yaml` で
プラグインごとに許可します。

```yaml
plugins:
  entries:
    my-plugin:                    # the plugin's registry key from `hermes plugins list`
      allow_tool_override: true
```

許可が無ければ `ctx.register_tool(..., override=True)` は
`PluginToolOverrideError` を投げます。`register()` の例外は読み込み側が
受け止めるので、そのプラグインは無効になり、Hermes は動き続けます。この
関門があるのは、有効になったプラグインが `shell_exec` や `write_file` のような
強い組み込みツールを黙って置き換えると、モデルがそこへ流すものを丸ごと
横取りできてしまうからです。同梱のプラグインはこの対象外で、そこでの
差し替えは開発側の判断です。設定が読めない場合、この関門は閉じる側に倒れます。

このキーをふだん手で書くことはありません。`hermes plugins enable <name>` は、
同梱でないプラグインを有効にするときに、その権限を与えるかどうかをたずねます
(既定は「与えない」です)。`--allow-tool-override` と
`--no-allow-tool-override` を付ければ、自動化した導入でも問いかけを飛ばせます。
この許可は `deregister()` にも効きます。許可が無ければ、プラグインは自分の
持ち物でないツールを取り除けません (それができると、差し替えの確認を
すり抜ける道になってしまいます)。

### フックをいくつも登録する {#register-multiple-hooks}

```python
def register(ctx):
    ctx.register_hook("pre_tool_call", before_any_tool)
    ctx.register_hook("post_tool_call", after_any_tool)
    ctx.register_hook("pre_llm_call", inject_memory)
    ctx.register_hook("on_session_start", on_new_session)
    ctx.register_hook("on_session_end", on_session_end)
```

### フックの一覧 {#hook-reference}

それぞれのフックは **[イベントフックの早見表](/hermes/docs/user-guide/features/hooks/#plugin-hooks)** で全部説明しています。コールバックの引数の並び、引数の表、いつ発火するか、例まであります。ここではまとめだけ載せます。

| フック | 発火するとき | コールバックの引数 | 返り値 |
|------|-----------|-------------------|---------|
| [`pre_tool_call`](/hermes/docs/user-guide/features/hooks/#pre_tool_call) | どれかのツールが動く前 | `tool_name: str, args: dict, task_id: str` | 指示を返せます。`{"action": "block", "message": ...}` で呼び出しを止め、`{"action": "approve", "message": ...}` で人の承認へ回します |
| [`post_tool_call`](/hermes/docs/user-guide/features/hooks/#post_tool_call) | どれかのツールが返ったあと | `tool_name: str, args: dict, result: str, task_id: str, duration_ms: int` | 見られません |
| [`pre_llm_call`](/hermes/docs/user-guide/features/hooks/#pre_llm_call) | ターンごとに 1 回、ツール呼び出しの繰り返しに入る前 | `session_id: str, user_message: str, conversation_history: list, is_first_turn: bool, model: str, platform: str` | [文脈の差し込み](#pre_llm_call-context-injection) |
| [`post_llm_call`](/hermes/docs/user-guide/features/hooks/#post_llm_call) | ターンごとに 1 回、ツール呼び出しの繰り返しが終わったあと (成功したターンだけ) | `session_id: str, user_message: str, assistant_response: str, conversation_history: list, model: str, platform: str` | 見られません |
| `pre_api_request` | プロバイダーへの生の API 要求ごとに、その前 (モデルがツールを呼ぶターンでは 1 ターンに何度も) | `session_id: str, model: str, provider: str, base_url: str, api_mode: str, api_call_count: int, message_count: int, tool_count: int, approx_input_tokens: int, max_tokens: int, request: dict` | 見られません |
| `post_api_request` | プロバイダーへの生の API 要求が返るたび | `pre_api_request` の項目に加えて `api_duration: float, finish_reason: str, response_model: str \| None, usage: dict, response: dict, assistant_content_chars: int, assistant_tool_call_count: int` | 見られません |
| `api_request_error` | プロバイダーへの API 呼び出しが例外を投げたとき | 突き合わせ用の項目に加えて `status_code: int \| None, retry_count: int \| None, max_retries: int \| None, retryable: bool \| None, reason: str \| None, error: dict, request: dict` | 見られません |
| [`on_session_start`](/hermes/docs/user-guide/features/hooks/#on_session_start) | 新しいセッションができたとき (最初のターンだけ) | `session_id: str, model: str, platform: str` | 見られません |
| [`on_session_end`](/hermes/docs/user-guide/features/hooks/#on_session_end) | `run_conversation` の呼び出しが終わるたび、および CLI の終了時 | `session_id: str, completed: bool, interrupted: bool, model: str, platform: str` | 見られません |
| [`on_session_finalize`](/hermes/docs/user-guide/features/hooks/#on_session_finalize) | CLI やゲートウェイが動いているセッションを畳むとき | `session_id: str \| None, platform: str` | 見られません |
| [`on_session_reset`](/hermes/docs/user-guide/features/hooks/#on_session_reset) | ゲートウェイが新しいセッションキーに入れ替えたとき (`/new`、`/reset`) | `session_id: str, platform: str` | 見られません |
| [`gateway_platform_event`](/hermes/docs/user-guide/features/hooks/#gateway_platform_event) | 認可されたサービス固有のイベントが、ゲートウェイの境界で整えられたとき (いまのところ Telegram のリアクション) | `platform: str, event_type: str, payload: dict` | 見られません |
| `kanban_task_claimed` | かんばんの仕事が引き受けられたとき (振り分け側のプロセス、作業側が立ち上がる前) | `task_id: str, board: str \| None, assignee: str \| None, run_id: int \| None, profile_name: str` | 見られません |
| `kanban_task_completed` | かんばんの仕事が終わったとき (作業側のプロセス) | `task_id, board, assignee, run_id, profile_name, summary: str \| None` | 見られません |
| `kanban_task_blocked` | かんばんの仕事が詰まったとき (作業側のプロセス) | `task_id, board, assignee, run_id, profile_name, reason: str \| None` | 見られません |

ほとんどのフックは、見るだけで投げっぱなしの観測役で、返り値は見られません。例外は 2 つあり、`pre_llm_call` は会話へ文脈を差し込めて、`pre_tool_call` は止める・承認へ回すという指示を返せます。

コールバックはどれも、先の版との互換のために `**kwargs` を受け取るようにしてください。フックのコールバックが落ちても、記録されて飛ばされるだけです。他のフックとエージェントはふつうに動き続けます。

かんばんのライフサイクルのフックは、盤のデータベースの変更が確定した **あと** に発火します。ですからコールバックからは、いつでも確定した状態が見え、SQLite の書き込みロックを握ってしまうこともありません。かんばんの作業側は `hermes -p <profile> chat -q` という別のプロセスとして動くので、`kanban_task_claimed` は **振り分け側** のプロセスで、`kanban_task_completed` と `kanban_task_blocked` は **作業側** のプロセスで発火します。全部の移り変わりをまとめて見たいなら振り分け側で、仕事ごとにセッションの文脈が要るなら作業側でつないでください。

**API 要求のフック** は、プロバイダーへの生の要求を見る観測役で、ターンごとの `pre_llm_call` と `post_llm_call` のひとつ下の層にあります。ツールを呼ぶターンでは 1 ターンに何度も API 要求が出ますが、このフックはその 1 回ごとに発火します。用途は観測系のプラグイン (追跡、費用の集計、応答時間の盤) です。`request` と `response` の引数は、プロバイダーとやり取りした中身を安全に整えて大きさも抑えた JSON の見え方です (機微なキーは伏せ字にし、長い文字列は切り、SDK のオブジェクトは形をそろえてあります)。`usage` はトークンのまとめを入れたただの辞書です。どの受け渡しにも、突き合わせのための `turn_id`、`api_request_id`、`task_id`、`session_id`、`api_call_count` が入っているので、プラグインは要求とツール呼び出しとターンをつなげられます。`api_request_error` は、プロバイダーの呼び出しが例外を投げたときに発火し、`status_code`、`retry_count` と `max_retries`、`retryable`、`reason`、そして `type` と `message` を持つ `error` の辞書を足します。

### `pre_llm_call` による文脈の差し込み {#prellmcall-context-injection}

返り値が意味を持つのは、このフックだけです。`pre_llm_call` のコールバックが `"context"` というキーを持つ辞書 (またはただの文字列) を返すと、Hermes はその文章を **いまのターンのユーザーメッセージ** に差し込みます。メモリーのプラグイン、RAG との連携、ガードレール、そのほかモデルに情報を足したいプラグインは、この仕組みを使います。

#### 返り値の形 {#return-format}

```python
# Dict with context key
return {"context": "Recalled memories:\n- User prefers dark mode\n- Last project: hermes-agent"}

# Plain string (equivalent to the dict form above)
return "Recalled memories:\n- User prefers dark mode"

# Return None or don't return → no injection (observer-only)
return None
```

None でも空でもなく、`"context"` のキーを持つ返り値 (または空でないただの文字列) は集められ、そのターンのユーザーメッセージの後ろに足されます。

#### 大きすぎる文脈のあふれ先 {#oversized-context-spill}

フックごとの文脈は、既定で `10,000` 文字までです。それを超えた分は `$HERMES_HOME/hook_outputs/<session_id>/<uuid>.txt` へ書き出され、先頭と末尾の抜粋と、保存先のパスに置き換わります。モデルは、本当に必要なら `read_file` や `terminal` で全文を読めます。こうしておけば、暴走したプラグインがそれ以降のターンのプロンプトを膨らませて、プロンプトキャッシュの先頭部分を壊してしまうことがありません。`config.yaml` で調整できます。

```yaml
hooks:
  output_spill:
    enabled: true          # default: true
    max_chars: 10000       # default; set higher to opt out of spilling
    preview_head: 500      # chars shown at the top of the preview
    preview_tail: 500      # chars shown at the bottom of the preview
    # directory: null      # default: $HERMES_HOME/hook_outputs
```

#### 差し込みはどう働くか {#how-injection-works}

差し込まれた文脈は、システムプロンプトではなく **ユーザーメッセージ** の後ろに付きます。これは意図した設計です。

- **プロンプトキャッシュを守るため** — システムプロンプトがターンをまたいで同じままになります。Anthropic と OpenRouter はシステムプロンプトの先頭部分をキャッシュするので、そこを動かさなければ、何度も往復する会話で入力トークンを 75% 以上節約できます。プラグインがシステムプロンプトを書き換えたら、毎ターンがキャッシュ外れになってしまいます。
- **その場かぎり** — 差し込みが起きるのは API を呼ぶ瞬間だけです。会話の履歴にある元のユーザーメッセージは書き換わらず、セッションのデータベースにも何も残りません。
- **システムプロンプトは Hermes の領分** — そこにはモデルごとの案内、ツールの使い方の決まり、人格の指示、キャッシュされたスキルの中身が入っています。プラグインが足すのは、こちらの入力に添える文脈であって、エージェントの根っこの指示を書き換えることではありません。

#### 例: メモリーを思い出すプラグイン {#example-memory-recall-plugin}

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

#### 例: 見るだけのフック (差し込みなし) {#example-observer-only-hook-no-injection}

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

複数のプラグインが `pre_llm_call` から文脈を返した場合、それらは空行で区切ってつながれ、まとめてユーザーメッセージの後ろに付きます。順番はプラグインが見つかった順 (プラグインのディレクトリ名のアルファベット順) です。

### ミドルウェア: 起きることそのものを変える {#middleware-change-what-happens}

フックはエージェントの流れを見るものです (上に書いたいくつかの舵取りは別として)。**ミドルウェアは起きることそのものを変えます**。要求のミドルウェアは、下流の誰かが見る前に実際の中身を書き換えます。実行のミドルウェアは、呼び出し自体を包みます。登録は同じ `register(ctx)` から行います。

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

正式な種類の一覧は `hermes_cli/middleware.py` の `VALID_MIDDLEWARE` です。

| 種類 | 受け取るもの | 返し方の約束 |
|------|----------|-----------------|
| `tool_request` | `tool_name`、`args`、`original_args`、文脈のキーワード引数 | `{"args": {...}}` を返すと、フック・ガードレール・承認・実行が見る前に、実際のツールの引数を置き換えます。`None` を返すと、そのままにします。 |
| `llm_request` | `request`、`original_request`、文脈のキーワード引数 | `{"request": {...}}` を返すと、Hermes が送る前に、実際にプロバイダーへ渡す引数を置き換えます。 |
| `tool_execution` | 中身に加えて `next_call` | ツールの実行を包みます。`next_call(payload)` をちょうど 1 回呼んで下流をつなぎ (呼ばずに打ち切ることもできます)、その結果を返します。 |
| `llm_execution` | 中身に加えて `next_call` | 同じ形で、プロバイダーの呼び出しを包みます。 |

**実際に効いてくる決まり:**

- 要求のミドルウェアはつながります。それぞれのコールバックは、前のコールバックが書き換えたあとの中身を見ますが、`original_args` と `original_request` にはミドルウェアを通る前の写しが必ず入っています。中身はコールバックのあいだで複製されるので、自由に書き換えてかまいません。
- 返す辞書には `source`、`reason`、`name` の文字列を入れられます。それらはミドルウェアの記録に残り、下流の観測用フックが `middleware_trace` という引数で受け取ります。
- 実行のミドルウェアの `next_call` は **1 回かぎり** です。2 回呼ぶと例外になります。プロバイダーやツールを二度走らせてしまうからです。
- 例外を投げたミドルウェアのコールバックは記録されて飛ばされ、鎖は続きます。`next_call` のあとに下流で起きた失敗は、そのまま伝わります。ミドルウェアが土台の経路を壊すことはありません。
- ミドルウェアの受け渡しには、観測用の項目と並んで `middleware_schema_version` (`hermes.middleware.v1`) が入っています。
- 知らない種類は失敗ではなく警告付きで登録されるので、新しい Hermes に合わせて書いたプラグインでも、古い Hermes で読み込めます。

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

登録すると、`hermes my-plugin status` や `hermes my-plugin config` などが使えるようになります。

**メモリープロバイダーのプラグイン** は、代わりに決まりごとに沿ったやり方を使います。プラグインの `cli.py` に `register_cli(subparser)` という関数を置くだけです。メモリープラグインの探索の仕組みがそれを自動で見つけるので、`ctx.register_cli_command()` を呼ぶ必要はありません。詳しくは [メモリープロバイダープラグインの手引き](/hermes/docs/developer-guide/memory-provider-plugin/#adding-cli-commands) を見てください。

**いま使っているプロバイダーだけ表に出る仕組み:** メモリープラグインの CLI コマンドは、そのプロバイダーが設定の `memory.provider` になっているときだけ現れます。利用者がそのプロバイダーを使っていなければ、ヘルプの表示が散らかることもありません。

### スラッシュコマンドを登録する {#register-slash-commands}

プラグインは、会話の途中で打つスラッシュコマンド (`/lcm status` や `/ping` のようなもの) を登録できます。これは CLI でもゲートウェイ (Telegram、Discord など) でも動きます。

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

登録すると、どのセッションでも `/mystatus` と打てるようになります。このコマンドは入力候補、`/help` の出力、Telegram のボットのメニューにも出ます。

**引数の並び:** `ctx.register_command(name: str, handler: Callable, description: str = "", args_hint: str = "")`

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `name` | `str` | 先頭のスラッシュを除いたコマンド名 (たとえば `"lcm"`、`"mystatus"`) |
| `handler` | `Callable[[str], str \| None]` | 引数の文字列をそのまま受け取って呼ばれます。`async` でもかまいません。 |
| `description` | `str` | `/help`、入力候補、Telegram のボットのメニューに出ます |

**`register_cli_command()` との違い:**

| | `register_command()` | `register_cli_command()` |
|---|---|---|
| 呼び方 | セッションの中で `/name` | 端末で `hermes name` |
| 使える場所 | CLI のセッション、Telegram、Discord など | 端末だけ |
| 処理が受け取るもの | 生の引数の文字列 | argparse の `Namespace` |
| 向いている用途 | 状態の確認、診断、すぐ済む操作 | 込み入ったサブコマンドの木、設定の案内役 |

**名前のぶつかりを防ぐ仕組み:** 組み込みのコマンド (`help`、`model`、`new` など) とぶつかる名前を登録しようとすると、記録に警告を残して、黙って断られます。組み込みのコマンドがいつでも優先されます。

**非同期の処理:** ゲートウェイの振り分けは、非同期の処理を見分けて待ってくれるので、同期でも非同期でもどちらの関数でも書けます。

```python
async def _handle_check(raw_args: str) -> str:
    result = await some_async_operation()
    return f"Check result: {result}"

def register(ctx):
    ctx.register_command("check", handler=_handle_check, description="Run async check")
```

### スラッシュコマンドからツールを呼ぶ {#dispatch-tools-from-slash-commands}

スラッシュコマンドの処理からツールを動かしたいとき (`delegate_task` でサブエージェントを立てる、`file_edit` を呼ぶなど) は、内部の作りに手を伸ばさず `ctx.dispatch_tool()` を使ってください。親エージェントの文脈 (作業場所の手がかり、待ち表示、モデルの引き継ぎ) は自動でつながります。

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

**引数の並び:** `ctx.dispatch_tool(name: str, args: dict, *, parent_agent=None) -> str`

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `name` | `str` | ツールの登録簿にあるとおりのツール名 (たとえば `"delegate_task"`、`"file_edit"`) |
| `args` | `dict` | ツールの引数。モデルが送るのと同じ形です |
| `parent_agent` | `Agent \| None` | 任意の上書き。省くと、いまの CLI のエージェントから決まります (ゲートウェイでは、無ければ無いなりに動きます) |

**実行時の振る舞い:**

- **CLI のとき:** `parent_agent` はいまの CLI のエージェントから決まるので、作業場所の手がかり、待ち表示、モデルの選択がそのまま引き継がれます。
- **ゲートウェイのとき:** CLI のエージェントがないので、ツールは控えめに動きます。作業場所は設定した端末の作業ディレクトリから読み、待ち表示は出ません。
- **明示的な上書き:** 呼び出し側が `parent_agent=` を渡した場合は、それが尊重され、上書きされません。

これが、プラグインのコマンドからツールを呼ぶための、公開された安定した入口です。プラグインは `ctx._cli_ref.agent` のような内部の状態に手を伸ばすべきではありません。

### フックの中から動く (プロファイルとツール) {#act-from-inside-a-hook-profile-tools}

`ctx._cli_ref` に中身が入るのは、**対話的な CLI** のセッションだけです。ゲートウェイ、対話しない `hermes chat -q` の実行、そして **かんばんから立ち上がる作業側のセッション** では `None` になります。ですから `_cli_ref` に手を伸ばすプラグインの処理は、まさにそういう場面で黙って何もしなくなります。フックが実際に必要とするものは、どのセッションでも使える安定した 2 つの API でまかなえます。

- **`ctx.profile_name`** — いま使っているプロファイルの名前 (たとえば `"default"`、かんばんの作業側なら担当者のプロファイル)。`HERMES_HOME` から決まるので、`_cli_ref` に頼らずどこでも使えます。
- **`ctx.dispatch_tool(name, args)`** — 登録されたどのツールでも呼べます (組み込みでもプラグインのものでも)。`kanban_*` のツール、`delegate_task`、`terminal`、`read_file` なども含みます。フックがどのプロセスで発火しても、コールバックから使えます。

この 2 つがあれば、かんばんのライフサイクルのフックが移り変わりを見て、内部の作りに触らずに盤へ書き込めます。

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

`hermes <subcommand>` をまるごと動かしたいとき (たとえば `hermes kanban show`) は、`ctx.dispatch_tool("terminal", {"command": "hermes kanban show ..."})` のように `terminal` のツールでシェルへ出してください。画面のない作業側のセッションには、プロセスの中でスラッシュコマンドへ橋渡しする道はありません。フックから Hermes を動かす正しいやり方はツールです。

### Slack の Block Kit のボタンを受け取る {#handle-slack-block-kit-button-clicks}

Block Kit のメッセージに操作できる部品 (ボタン、メニュー、日付選択など) を載せて投稿するプラグインは、押されたときの処理を Slack のアダプターへ直接登録できます。`slack_bolt.AsyncApp` に手を入れる必要はありません。

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

**引数の並び:** `ctx.register_slack_action_handler(action_id, callback) -> None`

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `action_id` | `str \| re.Pattern \| dict` | `slack_bolt.App.action()` が受け取れるものなら何でも。そのままの `action_id`、複数の ID に当たる正規表現、`{"action_id": "...", "block_id": "..."}` のような条件の辞書 |
| `callback` | 非同期の呼び出し可能なもの | slack_bolt の作法どおり `(ack, body, action)` を受け取ります |

**実行時の振る舞い:**

- 処理はプラグインの読み込み時に控えられ、Slack がつながったときにアダプターの `slack_bolt.AsyncApp` へ組み込まれます。
- それぞれのコールバックは守りを固めて包まれます。処理が例外を投げたら、ゲートウェイがエラーを記録し、Slack が再送を続けないよう、できるかぎり ack を返します。
- slack_bolt のふつうの決まりが当てはまります。3 秒以内に `await ack()` を返し、それから長い作業をします。
- 複数のワークスペースで動かしている場合、処理はつながっているどのワークスペースの操作でも発火します。範囲を絞りたいときは `body["team"]["id"]` を使ってください。

これが、プラグインが Slack の対話に加わるための、公開されたやり方です。古いプラグインは `SlackAdapter.connect` に手を入れているかもしれませんが、こちらの API を選んでください。Block Kit の操作だけでなく slack_bolt のすべて (イベント、ショートカット、コマンド) を扱いたい場合は、下にある汎用の `register_platform_handler("slack", ...)` を使います。

### サービス固有の処理を登録する (どのサービスでも) {#register-native-platform-handlers-any-platform}

本体のアダプターが流していないサービス固有のイベント — 別の種類の更新、そのサービスのボタンの応答、リアクションやメンバーの出来事、Webhook の経路など — を受け取りたいプラグインは、そのサービスのアダプターが接続時に呼び出す生成関数を登録できます。これは **どの** ゲートウェイのサービスでも使えます。

```python
def register(ctx):
    def _wire(native, adapter):
        # native: the platform's client/app object (see table below)
        # adapter: the platform adapter instance (treat as read-only)
        # Import platform SDKs HERE so register() works without them.
        ...

    ctx.register_platform_handler("discord", _wire)
```

**引数の並び:** `ctx.register_platform_handler(platform, factory) -> None`

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `platform` | `str` | ゲートウェイのサービス名。小文字で書きます (`"telegram"`、`"discord"`、`"slack"`、`"matrix"` など) |
| `factory` | 呼び出し可能なもの | 接続時に `(native, adapter)` を受け取ります |

**`native` がサービスごとに何になるか:**

| サービス | `native` のオブジェクト | よく使う入口 |
|----------|-----------------|---------------|
| `telegram` | PTB の `Application` | `add_handler` — どの種類の更新でも、条件を絞ったコールバックでも |
| `discord` | `discord.ext.commands.Bot` | `add_listener` — リアクション、メンバーの出来事、スレッド、通話 |
| `slack` | `slack_bolt.AsyncApp` | `app.event()` / `app.action()` / `app.command()` |
| `matrix` | Matrix のクライアント | イベントのコールバック |
| `teams` | Teams の `App` | `on_message` / `on_card_action` のデコレーター |
| `dingtalk` | `DingTalkStreamClient` | 他のストリームの話題に対する `register_callback_handler` |
| `feishu` | lark_oapi のクライアント | API の呼び出しとイベントの振り分け |
| `line`、`api_server`、`msgraph_webhook` | aiohttp の `web.Application` | `router.add_get/post` — 独自の経路 (ルーターが固まる前につながれます) |
| その他すべて (whatsapp、signal、irc、email、sms、ntfy、wecom、weixin、bluebubbles、yuanbao など) | `None` | 接続時の入口。`adapter` の側から手を入れます |

**実行時の振る舞い:**

- 生成関数はプラグインの読み込み時に控えられ、そのサービスがつながったときに呼ばれます。振り分けの順番が効くサービス (Telegram、Slack、Teams、aiohttp のルーター) では、本体の処理が登録される **前** に走るので、条件を絞ったプラグインの処理が先に当たり、それ以外は本体へ落ちていきます。
- **最初に当たったものが勝つ仕組みに足す処理は、かならず条件を絞ってください。** Telegram なら `CallbackQueryHandler(..., pattern=r"^myplugin:")` のようにします。絞っていない処理は、本体のボタンの流れ (コマンド実行の承認、モデルの選択、確認の問いかけ) を飲み込んでしまいます。
- 生成関数はそれぞれ切り離されています。例外を投げても記録されるだけで、そのサービスはつながります。
- サービスの SDK は、モジュールの先頭ではなく生成関数の中で import してください。SDK が入っていなくても `register()` は動く必要があります。
- 1 つのプラグインが、いくつものサービスに生成関数を登録できます。それぞれ、自分のサービスがつながったときにだけ発火します。

**Telegram の別名:** `ctx.register_telegram_handler(factory)` は、`ctx.register_platform_handler("telegram", factory)` と同じ意味の、昔からの書き方です。

例 — Telegram で、条件を絞ったインラインボタン。

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

例 — Discord で、リアクションのイベント。

```python
def register(ctx):
    def _wire(bot, adapter):
        async def on_raw_reaction_add(payload):
            ...  # e.g. reaction-based voting / moderation

        bot.add_listener(on_raw_reaction_add, "on_raw_reaction_add")

    ctx.register_platform_handler("discord", _wire)
```

:::tip
このページで扱っているのは **一般のプラグイン** (ツール、フック、スラッシュコマンド、CLI コマンド) です。以下の節では、専用のプラグインの種類ごとに書き方の骨格だけを示します。項目の一覧と例は、それぞれの手引きにあります。
:::

## 専用のプラグインの種類 {#specialized-plugin-types}

Hermes には、一般のプラグインとは別に、専用の種類が 5 つあります。どれも `plugins/<category>/<name>/` (同梱) か `~/.hermes/plugins/<category>/<name>/` (利用者) のディレクトリとして置きます。約束ごとは分類によって違うので、必要なものを選んで、その手引きを読んでください。

### モデルプロバイダープラグイン — LLM の接続先を足す {#model-provider-plugins-add-an-llm-backend}

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

`get_provider_profile()` か `list_providers()` が最初に呼ばれたときに見つけられます。`auth.py`、`config.py`、`doctor.py`、`models.py`、`runtime_provider.py`、そして chat_completions の通信部分が自動でつながります。利用者のプラグインは、同じ名前の同梱プラグインより優先されます。

**詳しい手引き:** [モデルプロバイダープラグイン](/hermes/docs/developer-guide/model-provider-plugin/) — 項目の一覧、上書きできるフック (`prepare_messages`、`build_extra_body`、`build_api_kwargs_extras`、`fetch_models`)、api_mode の選び方、認証の種類、テスト。

### サービスのプラグイン — ゲートウェイのつなぎ先を足す {#platform-plugins-add-a-gateway-channel}

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

**詳しい手引き:** [サービスのアダプターを追加する](/hermes/docs/developer-guide/adding-platform-adapters/) — `BasePlatformAdapter` の約束ごと、メッセージの振り分け、認証の関門、セットアップの案内役との組み合わせ。標準ライブラリだけで動く見本として `plugins/platforms/irc/` を見てください。

### メモリープロバイダープラグイン — セッションをまたぐ知識の保存先を足す {#memory-provider-plugins-add-a-cross-session-knowledge-backend}

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

メモリープロバイダーは 1 つだけ選ぶ方式です。同時に動くのは 1 つで、`config.yaml` の `memory.provider` で決めます。

**詳しい手引き:** [メモリープロバイダープラグイン](/hermes/docs/developer-guide/memory-provider-plugin/) — `MemoryProvider` の抽象基底クラス、スレッドについての約束、プロファイルの切り分け、`cli.py` による CLI コマンドの登録。

### コンテキストエンジンプラグイン — 圧縮の仕組みを差し替える {#context-engine-plugins-replace-the-context-compressor}

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

コンテキストエンジンも 1 つだけ選ぶ方式で、`config.yaml` の `context.engine` で決めます。

**詳しい手引き:** [コンテキストエンジンプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)。

### 画像生成の接続先 {#image-generation-backends}

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

**詳しい手引き:** [画像生成プロバイダープラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/) — `ImageGenProvider` の抽象基底クラス、`list_models()` と `get_setup_schema()` の情報、`success_response()` と `error_response()` の助け、base64 で返すか URL で返すか、利用者による上書き、pip での配布。

**参考になる実装:** `plugins/image_gen/openai/` (OpenAI SDK 経由の DALL-E / GPT-Image)、`plugins/image_gen/openai-codex/`、`plugins/image_gen/xai/` (Grok の画像生成)。

## Python でない拡張のやり方 {#non-python-extension-surfaces}

Hermes は、Python のプラグインではない拡張も受け付けます。それらは [差し替えできる仕組みの一覧](/hermes/docs/user-guide/features/plugins/#pluggable-interfaces--where-to-go-for-each) に載っています。以下の節では、それぞれの書き方を手短に示します。

### MCP サーバー — 外部のツールを登録する {#mcp-servers-register-external-tools}

Model Context Protocol (MCP) のサーバーは、Python のプラグインなしで、自分のツールを Hermes に登録します。`~/.hermes/config.yaml` に書いてください。

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

Hermes は起動時にそれぞれのサーバーへつなぎ、ツールの一覧を取り、組み込みのツールと並べて登録します。LLM から見れば、他のツールとまったく同じです。**詳しい手引き:** [MCP](/hermes/docs/user-guide/features/mcp/)。

### ゲートウェイのイベントフック — 節目で動かす {#gateway-event-hooks-fire-on-lifecycle-events}

`~/.hermes/hooks/<name>/` に、定義ファイルと処理を置きます。

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

イベントには `gateway:startup`、`session:start`、`session:end`、`session:reset`、`agent:start`、`agent:step`、`agent:end` と、まとめて受ける `command:*` があります。フックの中のエラーは受け止められて記録され、本筋の処理を止めることはありません。

**詳しい手引き:** [ゲートウェイのイベントフック](/hermes/docs/user-guide/features/hooks/#gateway-event-hooks)。

### シェルフック — ツールの呼び出しでシェルのコマンドを走らせる {#shell-hooks-run-a-shell-command-on-tool-calls}

ツールが動いたときにスクリプトを走らせたいだけなら (通知、記録、デスクトップの知らせ、自動整形など)、`config.yaml` のシェルフックを使ってください。Python は要りません。

```yaml
hooks:
  - event: post_tool_call
    command: "notify-send 'Tool ran: {tool_name}'"
    when:
      tools: [terminal, patch, write_file]
```

Python のプラグインのフックと同じイベント (`pre_tool_call`、`post_tool_call`、`pre_llm_call`、`post_llm_call`、`on_session_start`、`on_session_end`、`pre_gateway_dispatch`) に対応していて、`pre_tool_call` で止める判断をするための構造化された JSON の出力も扱えます。

**詳しい手引き:** [シェルフック](/hermes/docs/user-guide/features/hooks/#shell-hooks)。

### スキルの取得元 — 自前のスキルの置き場を足す {#skill-sources-add-a-custom-skill-registry}

スキルを集めた GitHub のリポジトリを持っている場合や、組み込みの取得元のほかに有志の一覧から引きたい場合は、**tap** として足します。

```bash
hermes skills tap add myorg/skills-repo
hermes skills search my-workflow --source myorg/skills-repo
hermes skills install myorg/skills-repo/my-workflow
```

自分の tap を公開するのは、`skills/<skill-name>/SKILL.md` というディレクトリを置いた GitHub のリポジトリを作るだけです。サーバーも、どこかへの登録も要りません。

**詳しい手引き:** [スキルハブ](/hermes/docs/user-guide/features/skills/#skills-hub) · [自前の tap を公開する](/hermes/docs/user-guide/features/skills/#publishing-a-custom-skill-tap) (リポジトリの置き方、最小の例、既定以外のパス、信頼の段階)。

### コマンドのひな型で TTS / STT をつなぐ {#tts-stt-via-command-templates}

音声や文章を読み書きする CLI なら何でも、`config.yaml` からつなげます。Python のコードは要りません。

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

STT では、`HERMES_LOCAL_STT_COMMAND` に、引数へ分解できる形のひな型を入れます。これはシェルを暗黙に通さずに動きます。信頼している手元のコマンドがシェルの書き方を必要とするなら、`sh -c`、`cmd /c`、PowerShell で明示的に包んでください。使える差し込み記号は、TTS が `{input_path}`、`{output_path}`、`{format}`、`{voice}`、`{model}`、`{speed}`、STT が `{input_path}`、`{output_dir}`、`{language}`、`{model}` です。パスをやり取りする CLI なら、それだけでもうプラグインです。

**詳しい手引き:** [TTS の独自コマンドプロバイダー](/hermes/docs/user-guide/features/tts/#custom-command-providers) · [STT](/hermes/docs/user-guide/features/tts/#voice-message-transcription-stt)。

## pip で配る {#distribute-via-pip}

プラグインを広く配りたいときは、Python のパッケージにエントリーポイントを足します。

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

:::warning Nix はもう明示的な対応先ではありません
Nix / NixOS は、明示的に対応している導入経路ではなくなりました (できる範囲での対応です)。[Nix のセットアップ](/hermes/docs/getting-started/nix-setup/) を見てください。この節は、すでに NixOS で運用している人のために残しています。
:::

エントリーポイントを書いた `pyproject.toml` を用意すれば、NixOS の利用者は設定に書くだけでプラグインを入れられます。

**エントリーポイント型のプラグイン** (配布にはこちらがおすすめです):
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

**ディレクトリ型のプラグイン** (`pyproject.toml` は要りません):
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

オーバーレイの使い方や衝突の確認まで含めた説明は、[Nix のセットアップの手引き](/hermes/docs/getting-started/nix-setup/#plugins) にあります。

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
