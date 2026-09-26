---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "Multiplexing Gateway の内部構造"
description: "1 つの gateway ですべてのプロファイルを受け持つモードの設計: スコープの組み立て、シークレットのスコープ、受信のルーティング、永続化"
upstream_path: developer-guide/multiplexing-gateway.md
upstream_blob: a2967827dac258ff2423f3fe2b8cbeca214b8f81
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/multiplexing-gateway
---

# Multiplexing Gateway {#multiplexing-gateway}

1 つの gateway プロセスで、そのインストールにあるすべてのプロファイルを受け持てます。
このモードは既定で有効で（`gateway.multiplex_profiles`、既定は `true`）、
フラグを切った瞬間に、変わったものはすべて元に戻ります。フラグが*未設定*のときは、起動時に
`hermes_cli/gateway_multiplex_mode.py::resolve_multiplex_mode` が値を決めます。この関数は
`hermes gateway migrate` の事前チェックを走らせ、別のプロファイルがまだ自分の gateway を
動かしている場合、妨げになるものがある場合、またはそのホストを移行できない場合は、
gateway を単独のまま保ちます（「モードのフラグ」を参照）。この文書は
`agent/secret_scope.py` から参照されている設計の根拠（"Workstream A"）です。
プロファイルごとに何を分離するのか、それを分離する仕組み、そしてあえて
プロセス全体で共有したままにしているものを説明します。

## 概要 {#overview}

多重化しない場合、1 つの gateway プロセスが受け持つのはちょうど 1 つのプロファイル
（その `.env`、セッション、skill、プラットフォームアダプター）で、複数のプロファイルを
持つインストールではプロファイルごとに 1 プロセスを動かします。多重化はこれを
1 プロセスにまとめます。既定のプロファイルと、受け持つ名前つきプロファイルのそれぞれが
専用のアダプター、シークレット、セッション、cron の刻みを持ちながら、イベントループ、
HTTP リスナー、プロセスロック、状態の表示面は 1 つずつを共有します。

以下のすべてを形づくる設計上の制約は、**プロファイル A のターンがプロファイル B の状態を
決して目にしてはならない**ことです。シークレット、ホーム、セッション、アダプターのレーンは
プロファイルごとに分離します。まだ分離できないものは安全側に倒して失敗させるか、
この文書の最後に既知の制限として記載しています。

## モードのフラグ {#the-mode-flag}

- 設定: `gateway.multiplex_profiles`（トップレベルに書いても受け付けます）。
  `gateway/config.py` で、環境変数 > 設定 > 未設定 の優先順位で読み取ります。`GatewayConfig`
  は未設定のフラグを `None` のまま持ちます（読む側は真偽で判定するので、無効として読まれます）。
  そのあと `load_gateway_config_for_runner` が `resolve_multiplex_mode` を呼び、起動時の判定を
  書き込みます。静かな状態の複数プロファイルの既定インストールなら `True`、それ以外は理由を
  ログに残して `False` です。明示された値はそのまま通ります。`GatewayRunner(config=...)` に
  直接渡した設定は判定されません。
- ほかのプロセスは、まず動いている gateway の `served_profiles` の記録を読み、次に明示された
  フラグを読みます（`gateway_multiplex_mode.default_gateway_multiplexes`
  / `explicit_multiplex_flag`）。既定値と合成した値は読みません。これに従うのは `named_profile_served_
  by_running_multiplexer`、登録時の警告、管理画面のリスナーの保護、
  cron 発火時のポート解決、コンテナの起動、そして移行計画
  （`_read_multiplex_flag`。未設定の既定値は「まだ多重化していない」と読まれ、統合が進みます）です。
- 環境変数での上書き: `GATEWAY_MULTIPLEX_PROFILES` が受け付けるのは、真偽をはっきり表す
  値だけです。空や認識できない値は「上書きなし」として扱うので、中身が空のデプロイ用
  シークレットが設定での有効化を覆い隠すことはありません。
- 起動時に `GatewayRunner.__init__` が
  `agent.secret_scope.set_multiplex_active(...)` を 1 回呼びます。`_MULTIPLEX_ACTIVE` は
  contextvar ではなく、ただのモジュールのグローバル変数です。表しているのはデプロイの
  モードで、タスクごとの値ではないからです。役目はただ 1 つ、`get_secret()` の安全側に
  倒す動作を有効にすることです。
- ダッシュボードや Desktop のバックエンド（`hermes serve`）にはそうしたフラグがないので、
  `hermes_cli/web_server.py::start_server` が起動の最後の手順として
  `tui_gateway.launch_profile_policy.activate_multi_profile_hosting_eagerly()` を呼びます。
  最初の `?profile=<other>` のリクエストを待たず、その端末に提供できるプロファイルのホームが
  2 つ以上あれば、ホスト側がこの防御を有効にします。有効化は一方通行で、それまでにバックエンドが
  済ませていたこと（アイドル時の後片付けによる会話記録の書き出し、ホストしているルーム、cron）が
  あとからスコープし直されることはありませんでした。最後に回しているのは、有効化の時点で
  `os.environ` が起動時のプロファイルの資格情報として固定されるからです。組み立て直す元の `.env` が
  ない起動時のキー（systemd の `Environment=`、`op run`、Compose）にとっては、このスナップショットが
  唯一の出どころになります。固定のあとで注入したり入れ替えたりしたキーは、そのプロセスが終わるまで
  見えません。本当にプロファイルが 1 つだけのホストでは有効化されません。
  `gateway.multiplex_profiles: false` は廃止済みで、ここでは意図して参照しません（従うと、
  2 つ目のプロファイルを起動時のプロファイルの資格情報で提供してしまうためです）。`profiles/`
  ディレクトリが読めない場合は安全側に倒して有効化し、WARNING をログに出します。
- 防御が有効なときは、**起動時のプロファイルもテナントの 1 つ**になります。ルーティング先の
  プロファイルがない処理は、周りの `os.environ` のままスコープなしで動くのではなく、
  `launch_profile_scope_if_multiplexed()` を組み込みます。このスコープの中の優先順位に注意してください。
  起動時のホームの **`.env` が固定された環境変数より優先される**ため、起動時のテナントにとって有効化は
  厳しくなる一方というわけではありません。`os.environ` と `<launch home>/.env` の**両方**に設定された
  キーは、スコープなしで読むと有効化の前は周りの値が、有効化のあとは `.env` の値が返ります。
  環境変数にしかないキーには影響しません。
- ルーティング先のプロファイル名が解決できなくなった処理（実行中に削除や改名がされた場合）は、
  **何も**組み込みません。その資格情報の読み取りは、起動時のプロファイルのものへ戻るのではなく
  `UnscopedSecretError` を送出します。「これは誰のものか」に答えがない状態は安全側に倒して止める条件で、
  借りてくることは決してありません。

## スコープの組み立て {#scope-composition}

受信したイベントはすべて、プロファイルの持つコードが動く前に、同じ 2 つの
コンテキストローカルなスコープを組み立てます。

```
platform event
   │
   ▼
profile_routes match ──► served-set check ──► SessionSource.profile stamped
   │                                           (gateway/profile_routing.py)
   ▼
_profile_runtime_scope(profile_home)           (gateway/run.py)
   ├── set_hermes_home_override(home)          config / state.db / skills /
   │                                           memory / sessions resolve here
   └── set_secret_scope(profile .env + secret sources)
   │                                           provider keys, platform tokens
   ▼
agent turn (worker thread via copy_context())
   │
   ▼
scope unwound in finally
```

`_profile_runtime_scope` は、プロファイルの持つコードが実行されるあらゆる継ぎ目を包みます。
2 つ目以降のアダプターの起動、接続と再接続、主プラットフォームのイベントハンドラー、
受信時の前処理、`/model` とセッション情報の解決、バックグラウンドタスク、そして
エージェントのターンそのものです。設定の再読み込みは既定のプロファイルのスコープで
実行するので、gateway 全体の設定（`#64674`）はいつも同じように解決されます。

どちらのスコープも `contextvars` なので、`copy_context()` を通じて executor の
ワーカースレッドに伝わり、決まった順に巻き戻されます。`os.environ` には一切、何も
書き込みません。

## Workstream A: コンテキストローカルなシークレットのスコープ {#workstream-a-context-local-secret-scope}

`agent/secret_scope.py` があるのは、すぐ思いつく実装、つまりすべてのプロファイルの
`.env` を `os.environ` にまとめて入れるやり方だと、プロファイル A のキーがプロファイル
B のターンに漏れ、`env=dict(os.environ)` で起動されるあらゆるサブプロセスにも漏れるからです。

- `build_profile_secret_scope(home)` は、プロファイルの `.env` と、設定された
  シークレットソースをまとめます。グローバルなものは除きます。
- `set_secret_scope(mapping)` は、それを現在のタスクに組み込みます。
- `get_secret(name)` は、グローバルの許可リスト → 有効なスコープ → フォールバック の順に
  解決します。要になるのはフォールバックです。
  - 多重化が**オフ**: `os.environ` を読むので、単一プロファイルの gateway も、
    gateway 以外のあらゆる呼び出し元も、これまでとまったく同じに動きます。
  - 多重化が**オン**でスコープが組み込まれていない: プロセスの環境変数を黙って読むのではなく、
    **`UnscopedSecretError` を送出します**。移行されていない呼び出し箇所は、別の
    プロファイルの値を漏らす代わりに、まさにその行ではっきり失敗します。
- 小さな許可リスト（`HERMES_HOME`、`HERMES_PROFILE`、プロキシの設定、
  `API_SERVER_*` のリスナー設定。ただし `API_SERVER_KEY` はあえて含めません）は
  グローバルのままにします。これらはプロファイルではなくプロセスを表すものだからです。
- クラウド SDK の*既定の認証情報チェーン*は、仕組みの上でどうしても環境まかせになります
  （`google.auth.default()`、`DefaultAzureCredential`、キーを渡さない `boto3.Session()`）。
  これらがたどる先はプロセスの環境変数、CLI のキャッシュ、インスタンスメタデータのいずれも、
  起動したときの文脈が持つ身元です。多重化の下では、自前の完全な認証情報を持たないまま
  提供されるプロファイルは、Vertex と Entra ID と Bedrock のアダプタが**拒否**します。
  その身元を自分の `base_url` に対して発行してしまわないためです。単独で実行する場合は
  これまでどおりチェーンを使います。

多重化の下ではターンごとの `.env` の再読み込みは何もしないので、差し替えた認証情報は、
次のターンでプロファイルのスコープを通じて反映されます。`os.environ` を経由することは
ありません。これは gateway の再読み込み補助関数だけでなく、読み込み処理の境界でも
成り立ちます。`hermes_cli.env_loader.load_hermes_dotenv` は、多重化が有効で、*かつ*
プロファイルのホームの上書きが組み込まれているときは、プロセス全体への読み込みを飛ばします
（import 時や cron からの呼び出しがターンの途中でここに当たります）。それでも、プロファイルの
外部シークレットソースの値は、そのプロファイル専用のスナップショットに取り込みます
（`#77562`）。スコープなしの起動時の読み込みは変わりません。

ルーティングされたターンが触れうる、ほかの `os.environ` の継ぎ目にも、スコープを正とする
同じ規則が当てはまります。プロファイルの `config.yaml` にある `${VAR}` / `${env:VAR}`
の参照は、スコープが組み込まれていれば `get_secret` を通して解決されます
（`#84079`）。スコープの下で行う `.env` への書き込み（`save_env_value`、たとえば
`/pair` の許可のミラー）は、プロセスの環境変数ではなく、組み込まれたスコープの対応表を
更新します（`#88441`）。

## HERMES_HOME の上書き {#the-hermeshome-override}

`hermes_constants.py` は、コンテキストローカルな上書きを持っていて、
`get_hermes_home()` は `HERMES_HOME` 環境変数より先にそれを見ます。これを通してパスを
解決するものはすべて（設定、`state.db`、skill、メモリ、SOUL、セッション、kanban、
ゴール、プラグインの検出、MCP の起動）、自動的に有効なプロファイルに従います。
`get_process_hermes_home()` は、上書きに従ってはならない、ごく一部のマシン単位の資源の
ためにあります。`hermes_home_key()` は、ホームごとのレジストリに安定したスコープキーを
与えます。上書きがあるはずの場面でプロファイルに属するコードが上書きなしに動くと、
1 回だけ警告（`#18594`）が出ます。

## 受信のルーティング {#inbound-routing}

`gateway.profile_routes` は `(platform, user_id, guild_id, chat_id, thread_id)` を
プロファイルに対応づけます。一致はすべての条件を満たす必要があり、より具体的なものが
優先され、スレッドについては親をたどってチャットの一致を見ます。ルーティングは多重化が
有効なときだけ動き、一致したルートの行き先が受け持つプロファイルの外にあれば拒否します
（イベントは誤配されるのではなく破棄されます）。スキーマと一致の規則の全体は
[共有 bot のチャットをプロファイルへ振り分ける](/hermes/docs/user-guide/multi-profile-gateways/#routing-shared-bot-chats-to-profiles-profile_routes) にあります。

## 選んだプロファイルだけを受け持つ {#serving-selected-profiles}

`hermes_cli/profiles.py` の `profiles_to_serve(multiplex, profile_allowlist)` は、
多重化した gateway がどのプロファイルを受け持つかを決める唯一の関所です。既定のプロファイルと、
有効なプロファイルのディレクトリすべてが対象で、必要なら許可リストで絞り込みます。許可リストの
形が壊れていれば、安全側に倒して既定のプロファイルだけにします。受け持つプロファイルの集合は、
アダプターの起動、cron の刻み（`#69377`）、`/p/<profile>/` への HTTP の受け入れ、
ルートの対象かどうか、実行時の状態の表示面を左右します。外されたプロファイルもインストール
されたままで、自分専用の gateway を単独で動かすことはできます。

## プロファイルごとの永続化 {#per-profile-persistence}

`SessionStore` は、生成時にデータベースのハンドルを結びつけません（`#88532`）。
セッション DB のハンドルは、呼び出しのたびに、有効な HERMES_HOME の上書きを通して解決します。
解決された `profiles/<name>/state.db` ごとにハンドルを 1 つキャッシュするので、ストアの
オブジェクト自体が共有されていても、セッションは持ち主のプロファイルのストアに記録されます。
ペアリングのストアは、受け持つプロファイルごとに作ります。

## bot ごとのセッションのレーン {#per-bot-session-lanes}

セッションキーはプロファイルごとに名前空間が分かれています（既定のプロファイルは `agent:main`、
名前つきプロファイルは `agent:<name>`）。受信したイベントはどれも、凍結された
`RoutingIdentity`（`gateway/session_identity.py`）を 1 つだけ持ちます。これはランナーの
受け口のハンドラーで `resolve_identity()` が解決し、通信経路には現れない属性として
ソースに留め置かれます。中身は `transport_profile`（そのイベントを受け取った bot。
認証情報、許可リスト、`authorization_home`）、`runtime_profile`（実際に実行する、
ルーティング先のプロファイル。`runtime_home`、キーの `namespace`、`store_path`）、
そして受け取ったアダプターへの弱参照 `transport` です。`"default"` は文字として明示します。
`None` が既定を意味することはありません。多重化の下で、受け持っていないプロファイルへの
ルートは `IdentityUnresolved` を送出し、イベントは破棄されます。

アダプターは `_owner_profile` も持っています（受信イベントより前、アダプターの設定時に
組み込まれます）。受信の経路はどれも、まず最初に本人情報を正規化します。
`BasePlatformAdapter._canonicalize` が `handle_message`、テキスト／写真／アルバムの
まとめ処理、使用中のときの経路、アダプター由来のセッションキーのすべてで動きます。
ランナーのプロファイルごとのハンドラーと既定のハンドラー、認証確認のコールバック、
共通の `_handle_message` の関所も同じことをします。こうして、受け取った bot が判明する前に
レーンのキーが決まることはなくなります。テキストやメディアのまとめ処理、アクティブな
セッションの追跡、使用中のセッションを守る仕組み、`/stop` `/new` `/reset`、確認の返信は
どれもレーンごとにキーを分けているので、同じチャットにいる 2 つの bot がセッションの
レーンを共有することはなく、一方の bot への操作コマンドがもう一方の実行に届くこともありません。
受け持っていないプロファイルへのルートは、最初に当たった継ぎ目で WARNING を 1 回出して
破棄され、`agent:main` にキーが振られることはありません。ソースを複製するときは
`dataclasses.replace` ではなく `session_identity.replace_source` を使ってください。
そうしないと、複製は通信経路と本人情報を失います。

## 受け取りと返し: どの bot がイベントを扱うか {#intake-vs-delivery-which-bot-acts-on-an-event}

多重化した gateway が混同しがちな 2 つの問いに、ランナーの 2 つの継ぎ目が答えます
（`gateway/authz_mixin.py`）。

- `_intake_adapter_for(source)` — そのイベントを**受け取った** bot です。よりどころにするのは
  生きている出どころだけで、`build_source` が留め置いた通信経路への参照、リレー経由で
  届いたイベントならプロセス単位のリレーのアダプター、あるいは再接続のあとで本人情報の
  `transport_profile` に登録されているアダプターです。受け取りの方針（Slack の無視する
  チャンネル、リレーの肩代わり、待ち行列にある生イベントの再配送）を左右し、生きている
  出どころのないソースには `None` を返します。推測した bot で、復元された行を受け入れ直して
  よいものは 1 つもありません。
- `_delivery_adapter_for(source)` — **答える** bot です。送信、編集、入力中の表示、進捗、
  選択肢、保留中メッセージの枠を受け持ちます。受け取った bot が分かっていれば常にそれ、
  分からなければ `(platform, runtime_profile)` を単独で持つアダプターです。2 つ目以降の
  プロファイル自身のアダプター、共有 bot の衛星なら主プロファイルのアダプターがこれに当たり、
  2 つ目以降のプロファイルの bot が切断されているときは `None` です（既定の bot を
  借りることはありません）。

| 構成 | 実行時（`runtime_profile`、キーの名前空間、ホーム） | 受け取り | 返し |
| --- | --- | --- | --- |
| 認証情報ごとの bot、ルートなし | その bot 自身のプロファイル | 持ち主のアダプター | 持ち主のアダプター |
| 共有の認証情報 → `profile_routes` で衛星へ | ルーティング先のプロファイル | 受け取った（共有の）アダプター | 受け取ったアダプター。再起動のあとも衛星は主プロファイル経由で流れ続けます |
| 共有 bot → 自分の bot を持つプロファイル | ルーティング先のプロファイル | 受け取ったアダプター | 受け取ったアダプター。会話は利用者が書き込んだ bot に留まります |
| 2 つ目以降のプロファイルが持つ bot → `default`（`bot_profile: <secondary>`） | `default`（`agent:main`、既定のホーム） | 受け取った（2 つ目以降の）アダプター | 受け取ったアダプター |
| 復元された、または合成されたソースで生きている出どころがない | 保存された `source.profile` | **なし**（安全側に倒します） | `(platform, runtime)` を単独で持つアダプター。なければ `None` |

多重化していないときはプラットフォームごとにアダプターが 1 つなので、どちらの継ぎ目も
それを返します。`tests/gateway/test_multiplex_transport_matrix.py` がすべての行を確かめます。

### 復元、リレー、コールバック、スレッド間の移動 {#restore-relay-callbacks-and-thread-hops}

ルーティングの記録はキーの隣に `transport_profile` を保存します（`state.db` の
`sessions.transport_profile` 列も同じです）。そのため再起動のあとに蘇ったレーンも、
どの bot が受け取ったのかを覚えています。`_restored_source(entry)` は生きているアダプターの
ない `RoutingIdentity` を留め置き直し、`_delivery_adapter_for` はその bot のアダプターを
通して返すか、安全側に倒して失敗します。既定の bot 経由でルーティングされた衛星は
既定の bot から答え続け、2 つ目以降のプロファイルが持つレーンが既定の bot の認証情報に
落ちることはありません。この列ができる前に書かれた記録は `null` を持ち、共有 bot 向けの
経験則をそのまま使います。リレー越しでは、送信するフレームごとの `metadata.profile`
（と `follow_up` のキーの名前空間）が、次の `passthrough_forward` でどのプロファイルを
刻むかをコネクターに伝えるので、ルーティングされたスラッシュコマンドのあとにボタンを
押しても同じプロファイルに留まります。遅延して届くコールバック（`/model` の選択肢）は
コマンドを受けた時点でルーティング先のホームを捕まえ、gateway の executor をまたぐときは
ContextVar のスコープを複製します。

## 管理面 {#control-plane}

デスクトップのプラグインが gateway に届く経路は ws JSON-RPC の入口だけなので、
プロファイルの一覧と設定は `tui_gateway/methods_profiles.py` にあります。
`profiles.list`、`profiles.create`、`profiles.describe`、`profiles.configure`、
`profiles.set_asset`、`profiles.get_asset` です。読み書きは、対象のプロファイルの
HERMES_HOME の上書きの下で実行します。資源の書き込みはアトミックで、種類とサイズに上限があります。

## 失敗のしかた {#failure-modes}

- 起動時に致命的になるもの: 多重化の設定エラーと、2 つ目以降のプロファイルがポートを
  使うプラットフォームを有効にしている場合（`MultiplexConfigError`、
  `SecondaryPortBindingConfigError`）です。共有される HTTP リスナーは 1 つで、
  既定のプロファイルが持っています。
- 飛ばすが致命的にはしないもの: 2 つ目以降のアダプターのうち 1 つだけ設定が誤っていれば、
  多重化した gateway ごと落とすのではなく、警告を出してそのアダプターを飛ばします。
- 安全側に倒して失敗させるもの: 多重化の下でスコープなしに `get_secret()` を呼ぶと
  例外を送出します。受け持っていないプロファイル宛てにルーティングされたイベントは破棄します。
  スコープのない `/p/` へのリクエストは、未定義のスコープではなく既定のプロファイルの
  スコープに入ります（`#61276`）。
- フォールバックするもの: 外部の `cron.provider` は多重化に対応していないので、
  警告を出して組み込みの刻み処理にフォールバックします。

## 既知の制限 {#known-limitations}

まだプロファイルごとに分けられていない、プロセス全体の状態です。

| 対象 | 執筆時点の状態 |
| --- | --- |
| MCP の検出とツールの登録 | プロセス全体で共有です。最初にエージェントを組み立てたプロファイルが検出の枠を取ります。プロファイルごとの完全な MCP レジストリは `#67605` で追跡しています。 |
| ターミナル／サンドボックスの環境変数（`TERMINAL_*`） | 許可リストによりグローバルです。ツールはプロセスの環境変数から読みます。 |
| 組み込みツールのレジストリ | 組み込みツールはプロセス全体で共有です。プラグインが登録したツールは `hermes_home_key()` を使ってプロファイルごとに重ねます。 |
| プロバイダー／機能のレジストリ | 同じく混在型で重ねる方式です（ブラウザー、画像生成、TTS、文字起こし、動画生成、Web 検索、シークレットソース）。 |
| HTTP リスナー、リレーの受信口、プロセスロック | プロセスに 1 つで、既定または有効なプロファイルが持ちます。プロファイルごとの `runtime_status.json` は引き続き書き出します。 |

## 対象外 {#non-goals}

多重化が分離するのは*プロファイル*で、*エンドユーザー*の認証や認可はしません。
プロファイルは設定であって人ではありません。gateway は、イベントがどのプロファイルに
属するかを、通信経路とルーティング表を信頼して決めます。リクエスト単位の本人確認や、
プロファイルの層より上でのユーザーごとの認可は、この文書の範囲外です。

## 関連 {#related}

- [複数プロファイルの gateway](/hermes/docs/user-guide/multi-profile-gateways/) — 利用者向けのガイドです。`profile_routes`
  と、プロファイルごとに gateway を 1 つずつ単独で動かす別案も説明しています。
- `agent/secret_scope.py`、`hermes_constants.py`、`gateway/profile_routing.py`、
  `gateway/run.py`（`_profile_runtime_scope`）、`hermes_cli/profiles.py`
  （`profiles_to_serve`）、`gateway/session.py`、`tui_gateway/methods_profiles.py`。
